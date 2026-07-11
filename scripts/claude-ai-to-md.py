#!/usr/bin/env python3
"""
Claude.ai JSON to Markdown converter for Scout.

Reads a Claude.ai data export (conversations.json) and converts to markdown,
one file per conversation.

Modes
-----
Direct import (default):
    python3 claude-ai-to-md.py conversations.json --output-dir $DOSSIER_ROOT/sources/claude/

Update-aware: keeps a state file at <output-dir>/.import-state.json tracking
each conversation's last known message count and update timestamp. On re-run,
unchanged conversations are SKIPPED (fast), conversations with new messages
are UPDATED (regenerated in place), and new conversations are added.

Hard-exclude filters (fail-safes for private content):
    --exclude-title-contains "Sarah,Mom,therapy"
    --exclude-keyword-any "prescription,medical,SSN"

Report CSV (matches the chatgpt-export-review spreadsheet structure):
    --keywords "qi7,voyager,lucen,..."
    --report import-report.csv

Get the export from claude.ai:
    Account menu > Settings > Privacy > Export data
    You will receive a download link by email. Unzip and locate
    conversations.json (usually at the top level of the export).

Example
-------
    python3 claude-ai-to-md.py \\
        ~/Downloads/data-2026-07-11/conversations.json \\
        --output-dir $DOSSIER_ROOT/sources/claude/ \\
        --keywords "qi7,voyager,lucen,mirrortees,agaboo" \\
        --exclude-title-contains "Sarah,therapy" \\
        --report ~/Desktop/claude-import-report.csv

Output structure:
    sources/claude/
    ├── .import-state.json
    ├── 2026-03-14-planning-the-launch.md
    ├── 2026-04-22-project-scoping.md
    └── 2026-05-10-substrate-design.md

No external dependencies (Python standard library only).
"""

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


STATE_FILENAME = ".import-state.json"


# ------------------------- Utilities ----------------------------------------


def safe_slug(name):
    slug = re.sub(r"[^\w\s-]", "", name or "").strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug[:60] or "untitled"


def format_timestamp(ts_str):
    if not ts_str:
        return "unknown-time"
    try:
        dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, AttributeError):
        return str(ts_str)


def date_from_iso(ts_str):
    if not ts_str:
        return "unknown-date"
    try:
        dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except (ValueError, AttributeError):
        return "unknown-date"


# ------------------------- Message extraction -------------------------------


def extract_text(message):
    text = message.get("text", "")
    if text and isinstance(text, str):
        return text

    content = message.get("content", [])
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(item.get("text", ""))
                elif item.get("type") == "tool_use":
                    parts.append("\n**[Tool use]**\n")
                elif item.get("type") == "tool_result":
                    parts.append("\n**[Tool result]**\n")
            elif isinstance(item, str):
                parts.append(item)
        return "\n\n".join(p for p in parts if p)
    return ""


def format_message(msg):
    text = extract_text(msg)
    if not text.strip():
        return None

    timestamp = format_timestamp(msg.get("created_at", ""))
    sender_raw = (msg.get("sender") or "").lower()
    if sender_raw == "human":
        sender = "You"
    elif sender_raw == "assistant":
        sender = "Claude"
    else:
        sender = sender_raw.title() or "Unknown"

    return f"### {timestamp} - {sender}\n\n{text}\n"


def get_full_text(conv):
    """Return all message texts concatenated (for keyword scanning)."""
    messages = conv.get("chat_messages", [])
    parts = []
    for m in messages:
        text = extract_text(m)
        if text:
            parts.append(text)
    return "\n".join(parts)


# ------------------------- Filtering & counting -----------------------------


def check_exclusions(conv, exclude_title_terms, exclude_keyword_terms, cached_full_text=None):
    title_lower = (conv.get("name") or "").lower()

    for term in exclude_title_terms:
        term_lower = term.lower().strip()
        if term_lower and term_lower in title_lower:
            return True, f"title contains '{term.strip()}'"

    if exclude_keyword_terms:
        if cached_full_text is None:
            cached_full_text = get_full_text(conv)
        text_lower = cached_full_text.lower()
        for term in exclude_keyword_terms:
            term_lower = term.lower().strip()
            if term_lower and term_lower in text_lower:
                return True, f"body contains '{term.strip()}'"

    return False, ""


def count_keywords(full_text, keywords):
    if not keywords:
        return {}
    text_lower = full_text.lower()
    return {kw: text_lower.count(kw.lower().strip()) for kw in keywords if kw.strip()}


# ------------------------- State file ---------------------------------------


def load_state(output_dir):
    state_path = output_dir / STATE_FILENAME
    if not state_path.exists():
        return {"version": 1, "conversations": {}}
    try:
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        state.setdefault("version", 1)
        state.setdefault("conversations", {})
        return state
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "conversations": {}}


def save_state(state, output_dir):
    state_path = output_dir / STATE_FILENAME
    state["last_import"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def compare_to_state(conv_id, message_count, updated_at, state):
    prev = state["conversations"].get(conv_id)
    if not prev:
        return "NEW", None
    if (
        prev.get("message_count") == message_count
        and prev.get("updated_at") == updated_at
    ):
        return "SAME", prev.get("filename")
    return "UPDATED", prev.get("filename")


# ------------------------- Report CSV ---------------------------------------


def write_report(report_rows, keywords, report_path):
    report_path = Path(report_path).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    core_columns = [
        "title",
        "match_status",
        "existing_filename",
        "date_created",
        "date_updated",
        "word_count",
        "messages",
        "total_core_hits",
        "primary_topics",
        "excluded_reason",
    ]
    keyword_columns = [f"hits:{kw.strip()}" for kw in keywords if kw.strip()]
    all_columns = core_columns + keyword_columns

    with open(report_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_columns, extrasaction="ignore")
        writer.writeheader()
        for row in report_rows:
            writer.writerow(row)


# ------------------------- Main conversion ----------------------------------


def convert(json_path, output_dir, keywords=None, exclude_title=None,
            exclude_keyword=None, report_path=None):
    keywords = keywords or []
    exclude_title = exclude_title or []
    exclude_keyword = exclude_keyword or []

    json_path = Path(json_path).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"[error] Expected a list of conversations at {json_path}")
        return 1

    state = load_state(output_dir)

    written_new = 0
    written_updated = 0
    unchanged = 0
    excluded = 0
    empty = 0

    report_rows = []

    for conv in data:
        conv_id = conv.get("uuid") or conv.get("id") or ""
        title = conv.get("name") or conv_id or "untitled"
        created_at = conv.get("created_at", "")
        updated_at = conv.get("updated_at", created_at)
        created_date = date_from_iso(created_at)
        updated_date = date_from_iso(updated_at)

        full_text = get_full_text(conv)
        messages = conv.get("chat_messages", [])
        formatted = [format_message(m) for m in messages]
        formatted = [f for f in formatted if f]
        message_count = len(formatted)
        word_count = len(full_text.split())

        keyword_hits = count_keywords(full_text, keywords)
        total_core_hits = sum(keyword_hits.values())
        primary_topics = "; ".join(
            kw for kw, count in sorted(keyword_hits.items(), key=lambda x: -x[1])[:5]
            if count > 0
        )

        is_excluded, exclude_reason = check_exclusions(
            conv, exclude_title, exclude_keyword, cached_full_text=full_text
        )

        if is_excluded:
            match_status = "EXCLUDED"
            existing_filename = (state["conversations"].get(conv_id, {}) or {}).get("filename", "")
            excluded += 1
        elif not formatted:
            empty += 1
            continue
        else:
            match_status, existing_filename = compare_to_state(
                conv_id, message_count, updated_at, state
            )

        row = {
            "title": title,
            "match_status": match_status,
            "existing_filename": existing_filename or "",
            "date_created": created_date,
            "date_updated": updated_date,
            "word_count": word_count,
            "messages": message_count,
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

        filename = f"{created_date}-{safe_slug(title)}.md"
        out_path = output_dir / filename

        header = (
            f"# {title}\n\n"
            f"**Date:** {created_date}\n"
            f"**Messages:** {message_count}\n"
            f"**Source:** Claude.ai data export\n\n"
            f"---\n\n"
        )
        content = header + "\n---\n\n".join(formatted)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)

        state["conversations"][conv_id] = {
            "filename": filename,
            "message_count": message_count,
            "updated_at": updated_at,
            "title": title,
        }

        if match_status == "NEW":
            written_new += 1
        elif match_status == "UPDATED":
            written_updated += 1

    save_state(state, output_dir)

    if report_path:
        write_report(report_rows, keywords, report_path)

    print(f"[wrote] {output_dir}")
    summary_parts = [
        f"{written_new} new",
        f"{written_updated} updated",
        f"{unchanged} unchanged",
        f"{excluded} excluded",
    ]
    if empty:
        summary_parts.append(f"{empty} empty/skipped")
    print(f"        {', '.join(summary_parts)}")
    print(f"        {len(state['conversations'])} conversations tracked in {STATE_FILENAME}")
    if report_path:
        print(f"[report] {Path(report_path).expanduser().resolve()}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Convert claude.ai conversations.json export to Markdown for Scout."
    )
    parser.add_argument("json_path", help="Path to conversations.json from claude.ai export")
    parser.add_argument(
        "--output-dir",
        default="sources/claude/",
        help="Output directory (default: sources/claude/)",
    )
    parser.add_argument(
        "--keywords",
        help="Comma-separated keywords to count per conversation (for the report CSV)",
    )
    parser.add_argument(
        "--exclude-title-contains",
        help="Skip conversations whose title contains any of these terms (comma-separated, case-insensitive)",
    )
    parser.add_argument(
        "--exclude-keyword-any",
        help="Skip conversations whose message body contains any of these terms (comma-separated, case-insensitive)",
    )
    parser.add_argument(
        "--report",
        help="Write a report CSV to this path (match_status, hits per keyword, primary topics, etc.)",
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
