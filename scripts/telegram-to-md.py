#!/usr/bin/env python3
"""
Telegram to Markdown converter for Scout.

Reads a Telegram Desktop export (JSON) and writes markdown files organized
by chat and month into an output directory Scout can index.

Get the JSON from Telegram Desktop (or Telegram Lite on macOS):
    Settings > Advanced > Export Telegram Data > choose chat categories >
    format: Machine-readable JSON

Usage:
    python3 telegram-to-md.py path/to/result.json --output-dir $DOSSIER_ROOT/sources/telegram/

Update-aware: keeps a state file at <output-dir>/.import-state.json tracking
each chat's message count and latest message date. On re-run with a newer,
fuller export, unchanged chats are SKIPPED (fast), chats with new messages
are UPDATED (their month files regenerate in place), and new chats are added.
Nothing is deleted.

Hard-exclude filters (fail-safes for private content):
    --exclude-title-contains "personal,family"
        Skip chats whose NAME contains any of these terms (case-insensitive).
    --exclude-keyword-any "prescription,medical"
        Skip chats whose message text contains any of these terms.
    Excluded chats are reported but never written to disk.

Report CSV:
    --keywords "scout,provenance,hive"   count occurrences per chat
    --report import-report.csv           write per-chat report
        Columns: chat_name, match_status (NEW/UPDATED/SAME/EXCLUDED),
        months, messages, word_count, total_core_hits, primary_topics,
        excluded_reason, hits:<keyword>...

Output structure:
    sources/telegram/
    ├── .import-state.json
    ├── channel-name-1/
    │   ├── 2026-05.md
    │   └── 2026-06.md
    └── channel-name-2/
        └── 2026-07.md

No external dependencies (Python standard library only).
"""

import argparse
import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


STATE_FILENAME = ".import-state.json"


def safe_folder_name(name):
    """Convert a chat name to a filesystem-safe folder name."""
    slug = re.sub(r"[^\w\s-]", "", name).strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug or "unknown-chat"


def extract_text(text_field):
    """Handle Telegram's message.text field, which can be str or list of str/dict."""
    if isinstance(text_field, str):
        return text_field
    if isinstance(text_field, list):
        parts = []
        for entity in text_field:
            if isinstance(entity, str):
                parts.append(entity)
            elif isinstance(entity, dict):
                parts.append(entity.get("text", ""))
        return "".join(parts)
    return ""


def format_message(msg):
    """Format one message as a markdown block. Returns None if empty or unhandled."""
    if msg.get("type") not in ("message", "service"):
        return None

    date_str = msg.get("date", "")
    try:
        dt = datetime.fromisoformat(date_str)
        timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        timestamp = date_str or "unknown-time"

    from_name = msg.get("from") or msg.get("actor") or "Unknown"
    text = extract_text(msg.get("text", ""))

    # Media placeholders (kept as text so grep and search still find them)
    media_notes = []
    if msg.get("photo"):
        media_notes.append(f"[Photo: {msg['photo']}]")
    if msg.get("file"):
        media_notes.append(f"[File: {msg.get('file_name', msg['file'])}]")
    if msg.get("voice_message"):
        duration = msg.get("duration_seconds", "")
        media_notes.append(
            f"[Voice message: {duration}s]" if duration else "[Voice message]"
        )
    if msg.get("video_file"):
        media_notes.append(f"[Video: {msg.get('file_name', msg['video_file'])}]")
    if msg.get("sticker_emoji"):
        media_notes.append(f"[Sticker: {msg['sticker_emoji']}]")

    if media_notes:
        if text:
            text = text + "\n\n" + "\n".join(media_notes)
        else:
            text = "\n".join(media_notes)

    if not text.strip():
        return None

    reply_hint = ""
    if msg.get("reply_to_message_id"):
        reply_hint = f" (reply to msg {msg['reply_to_message_id']})"

    return f"### {timestamp} - {from_name}{reply_hint}\n\n{text.strip()}\n"


def chat_full_text(chat):
    """All extractable message text of a chat, for keyword scans."""
    parts = []
    for msg in chat.get("messages", []):
        text = extract_text(msg.get("text", ""))
        if text:
            parts.append(text)
    return "\n".join(parts)


def check_exclusions(chat_name, full_text, exclude_title_terms, exclude_keyword_terms):
    name_lower = (chat_name or "").lower()
    for term in exclude_title_terms:
        t = term.lower().strip()
        if t and t in name_lower:
            return True, f"name contains '{term.strip()}'"
    if exclude_keyword_terms:
        text_lower = full_text.lower()
        for term in exclude_keyword_terms:
            t = term.lower().strip()
            if t and t in text_lower:
                return True, f"body contains '{term.strip()}'"
    return False, ""


def count_keywords(full_text, keywords):
    if not keywords:
        return {}
    text_lower = full_text.lower()
    return {kw: text_lower.count(kw.lower().strip()) for kw in keywords if kw.strip()}


def load_state(output_dir):
    state_path = output_dir / STATE_FILENAME
    if not state_path.exists():
        return {"version": 1, "chats": {}}
    try:
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        state.setdefault("version", 1)
        state.setdefault("chats", {})
        return state
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "chats": {}}


def save_state(state, output_dir):
    state_path = output_dir / STATE_FILENAME
    state["last_import"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def compare_to_state(chat_key, message_count, last_date, state):
    prev = state["chats"].get(chat_key)
    if not prev:
        return "NEW"
    if prev.get("message_count") == message_count and prev.get("last_date") == last_date:
        return "SAME"
    return "UPDATED"


def write_report(report_rows, keywords, report_path):
    report_path = Path(report_path).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    core = [
        "chat_name", "match_status", "months", "messages", "word_count",
        "total_core_hits", "primary_topics", "excluded_reason",
    ]
    cols = core + [f"hits:{kw.strip()}" for kw in keywords if kw.strip()]
    with open(report_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for row in report_rows:
            w.writerow(row)


def convert(json_path, output_dir, keywords=None, exclude_title=None,
            exclude_keyword=None, report_path=None):
    """Convert a Telegram JSON export to markdown files in output_dir."""
    keywords = keywords or []
    exclude_title = exclude_title or []
    exclude_keyword = exclude_keyword or []

    # Guard against an unset $DOSSIER_ROOT that expanded to an empty string
    # in the caller's shell. When that happens, `$DOSSIER_ROOT/sources/telegram/`
    # becomes literally `/sources/telegram/`, which tries to write at the
    # filesystem root (fails with ENOENT or "Read-only file system" and looks
    # like an OS problem rather than an unset-variable problem).
    output_dir_str = str(output_dir)
    if output_dir_str.startswith("/sources/") or output_dir_str == "/sources":
        print(f"[error] --output-dir resolved to '{output_dir_str}', which points at the")
        print(f"        filesystem root. This usually means $DOSSIER_ROOT is unset in your")
        print(f"        shell. Set it first, then rerun:")
        print(f"          export DOSSIER_ROOT=/absolute/path/to/your/data")
        print(f"          mkdir -p \"$DOSSIER_ROOT/sources\"")
        return 1

    json_path = Path(json_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # Two known Telegram export shapes:
    #   Multi-chat: {"chats": {"list": [...]}}
    #   Single-chat: {"name": "...", "messages": [...]}
    if "chats" in data and isinstance(data["chats"], dict):
        chats = data["chats"].get("list", [])
    elif "messages" in data:
        chats = [data]
    else:
        raise ValueError(f"Unrecognized Telegram export shape at {json_path}")

    state = load_state(output_dir)

    written_new = 0
    written_updated = 0
    unchanged = 0
    excluded = 0
    total_messages = 0
    report_rows = []

    for chat in chats:
        chat_name = chat.get("name") or chat.get("title") or "unknown-chat"
        chat_id = chat.get("id")
        chat_key = str(chat_id) if chat_id is not None else safe_folder_name(chat_name)
        messages = chat.get("messages", [])
        message_count = len(messages)
        last_date = ""
        for msg in reversed(messages):
            if msg.get("date"):
                last_date = msg["date"]
                break

        full_text = chat_full_text(chat)
        word_count = len(full_text.split())
        keyword_hits = count_keywords(full_text, keywords)
        total_core_hits = sum(keyword_hits.values())
        primary_topics = "; ".join(
            kw for kw, count in sorted(keyword_hits.items(), key=lambda x: -x[1])[:5]
            if count > 0
        )

        is_excluded, exclude_reason = check_exclusions(
            chat_name, full_text, exclude_title, exclude_keyword
        )

        if is_excluded:
            match_status = "EXCLUDED"
            excluded += 1
        else:
            match_status = compare_to_state(chat_key, message_count, last_date, state)

        # Group formatted messages by month (needed for the report's months column
        # and for writing; skip the write for SAME/EXCLUDED)
        by_month = defaultdict(list)
        if match_status in ("NEW", "UPDATED"):
            for msg in messages:
                date_str = msg.get("date", "")
                try:
                    dt = datetime.fromisoformat(date_str)
                    month_key = dt.strftime("%Y-%m")
                except (ValueError, TypeError):
                    month_key = "unknown-date"
                formatted = format_message(msg)
                if formatted:
                    by_month[month_key].append(formatted)

        row = {
            "chat_name": chat_name,
            "match_status": match_status,
            "months": len(by_month),
            "messages": message_count,
            "word_count": word_count,
            "total_core_hits": total_core_hits,
            "primary_topics": primary_topics,
            "excluded_reason": exclude_reason,
        }
        for kw in keywords:
            row[f"hits:{kw.strip()}"] = keyword_hits.get(kw, 0)
        report_rows.append(row)

        if match_status in ("EXCLUDED", "SAME"):
            if match_status == "SAME":
                unchanged += 1
            continue

        folder = safe_folder_name(chat_name)
        chat_dir = output_dir / folder
        chat_dir.mkdir(parents=True, exist_ok=True)

        chat_msg_total = 0
        for month_key, formatted_msgs in sorted(by_month.items()):
            out_file = chat_dir / f"{month_key}.md"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(f"# {chat_name}\n\n")
                f.write(f"**Month:** {month_key}\n")
                f.write(f"**Messages:** {len(formatted_msgs)}\n")
                f.write(f"**Source:** Telegram Desktop export\n\n")
                f.write("---\n\n")
                f.write("\n---\n\n".join(formatted_msgs))
            chat_msg_total += len(formatted_msgs)

        if by_month:
            total_messages += chat_msg_total
            print(f"[wrote] {chat_dir} ({chat_msg_total} messages, {match_status})")

        state["chats"][chat_key] = {
            "name": chat_name,
            "folder": folder,
            "message_count": message_count,
            "last_date": last_date,
        }

        if match_status == "NEW":
            written_new += 1
        elif match_status == "UPDATED":
            written_updated += 1

    save_state(state, output_dir)

    if report_path:
        write_report(report_rows, keywords, report_path)

    summary = [
        f"{written_new} new",
        f"{written_updated} updated",
        f"{unchanged} unchanged",
        f"{excluded} excluded",
    ]
    print(f"\nDone. {', '.join(summary)}; {total_messages} message(s) written.")
    print(f"{len(state['chats'])} chat(s) tracked in {STATE_FILENAME}")
    if report_path:
        print(f"[report] {Path(report_path).expanduser().resolve()}")


def main():
    parser = argparse.ArgumentParser(
        description="Convert a Telegram JSON export to Markdown files for Scout."
    )
    parser.add_argument(
        "json_path", help="Path to Telegram JSON export (usually result.json)"
    )
    parser.add_argument(
        "--output-dir",
        default="sources/telegram/",
        help="Output directory (default: sources/telegram/)",
    )
    parser.add_argument(
        "--keywords",
        help="Comma-separated keywords to count per chat (for the report CSV)",
    )
    parser.add_argument(
        "--exclude-title-contains",
        help="Skip chats whose name contains any of these terms (comma-separated, case-insensitive)",
    )
    parser.add_argument(
        "--exclude-keyword-any",
        help="Skip chats whose message text contains any of these terms (comma-separated, case-insensitive)",
    )
    parser.add_argument(
        "--report",
        help="Write a per-chat report CSV to this path",
    )
    args = parser.parse_args()

    keywords = [k.strip() for k in (args.keywords or "").split(",") if k.strip()]
    exclude_title = [t.strip() for t in (args.exclude_title_contains or "").split(",") if t.strip()]
    exclude_keyword = [k.strip() for k in (args.exclude_keyword_any or "").split(",") if k.strip()]

    return convert(
        args.json_path,
        args.output_dir,
        keywords=keywords,
        exclude_title=exclude_title,
        exclude_keyword=exclude_keyword,
        report_path=args.report,
    ) or 0


if __name__ == "__main__":
    raise SystemExit(main())
