#!/usr/bin/env python3
"""
ChatGPT JSON to Markdown converter for Scout.

Reads a ChatGPT data export (conversations.json) and converts to markdown,
one file per conversation. ChatGPT stores each conversation as a tree of
messages (parent/children pointers); this script walks the primary branch
to produce a linear transcript.

Modes
-----
Direct import (default):
    python3 chatgpt-to-md.py conversations.json --output-dir $DOSSIER_ROOT/sources/chatgpt/

Update-aware: the converter keeps a small state file at
    <output-dir>/.import-state.json
tracking each conversation's last known message count and update timestamp.
On re-run, conversations that haven't changed are SKIPPED (fast, no writes),
conversations with new messages are UPDATED (regenerated in place), and new
conversations are added. Nothing is deleted.

Hard-exclude filters (fail-safes for private content):
    --exclude-title-contains "Sarah,Mom,therapy"
        Skip conversations whose title contains any of these terms
        (case-insensitive, comma-separated).
    --exclude-keyword-any "prescription,medical,SSN"
        Skip conversations whose message body contains any of these terms
        (case-insensitive, comma-separated).

Report CSV (matches the chatgpt-export-review spreadsheet structure):
    --keywords "qi7,voyager,lucen,mirrortees,agaboo"
        Count case-insensitive occurrences of each keyword per conversation.
    --report import-report.csv
        Write a CSV with title, match_status (NEW/UPDATED/SAME/EXCLUDED),
        existing filename, dates, word/message counts, total keyword hits,
        primary topics summary, and one hits:<keyword> column per keyword.

Get the export from ChatGPT:
    Settings > Data controls > Export data
    (You'll receive a download link via email. Unzip it. Older exports have a
    single conversations.json; newer exports are SHARDED into
    conversations-000.json, conversations-001.json, ... In either case you can
    simply pass the unzipped export FOLDER as the input path and every shard
    is loaded and merged automatically.)

Review-first workflow (scan, mark, import):
    1. --scan --report review.csv   scans WITHOUT importing; writes a review
       CSV with an empty `import` column first and the conversation `id` last.
    2. Open the CSV in Numbers/Excel, put Y in the `import` column for every
       conversation you want, save as CSV.
    3. --manifest review.csv        imports ONLY rows marked Y (yes/true/1/keep
       also accepted). Rows marked N or left blank are skipped. Conversations
       not present in the manifest are skipped and counted as UNREVIEWED.
       Hard-exclude filters still veto even Y rows, as a fail-safe.

Example
-------
    python3 chatgpt-to-md.py \\
        ~/Downloads/chatgpt-export/conversations.json \\
        --output-dir $DOSSIER_ROOT/sources/chatgpt/ \\
        --keywords "qi7,voyager,lucen,mirrortees,agaboo" \\
        --exclude-title-contains "Sarah,therapy" \\
        --report ~/Desktop/chatgpt-import-report.csv

Output structure:
    sources/chatgpt/
    ├── .import-state.json
    ├── 2024-11-15-brainstorming-a-launch-plan.md
    ├── 2025-03-30-mirrortees-market-and-dropshipping.md
    └── 2026-01-05-focus-on-income-engine.md

No external dependencies (Python standard library only).
"""

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


STATE_FILENAME = ".import-state.json"

YES_VALUES = {"y", "yes", "true", "1", "keep"}


def load_conversations(input_path):
    """Load a ChatGPT export: single conversations.json, one shard file, or a
    directory containing conversations*.json shards (merged in order)."""
    p = Path(input_path).expanduser().resolve()
    if p.is_dir():
        shards = sorted(p.glob("conversations*.json"))
        if not shards:
            print(f"[error] No conversations*.json found in {p}")
            return None
        data = []
        for s in shards:
            with open(s, encoding="utf-8") as f:
                part = json.load(f)
            if isinstance(part, list):
                data.extend(part)
            else:
                print(f"[warn] {s.name} is not a list; skipped")
        print(f"[load] {len(shards)} shard(s), {len(data)} conversations")
        return data
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else None


def load_manifest(manifest_path):
    """Read a review CSV; return {conversation_id: keep_bool}."""
    decisions = {}
    with open(Path(manifest_path).expanduser().resolve(), encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            cid = (row.get("id") or "").strip()
            if not cid:
                continue
            decisions[cid] = (row.get("import") or "").strip().lower() in YES_VALUES
    return decisions


# ------------------------- Utilities ----------------------------------------


def safe_slug(name):
    """Convert a conversation title to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", name or "").strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug[:60] or "untitled"


def format_timestamp(unix_ts):
    """Convert a Unix timestamp to a human-readable string (UTC)."""
    if not unix_ts:
        return "unknown-time"
    try:
        dt = datetime.fromtimestamp(float(unix_ts), tz=timezone.utc)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError, OSError):
        return "unknown-time"


def date_from_timestamp(unix_ts):
    if not unix_ts:
        return "unknown-date"
    try:
        dt = datetime.fromtimestamp(float(unix_ts), tz=timezone.utc)
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError, OSError):
        return "unknown-date"


# ------------------------- ChatGPT tree walking -----------------------------


def walk_conversation(mapping):
    """Walk the ChatGPT message tree along the primary branch."""
    if not mapping:
        return []

    root_id = None
    for node_id, node in mapping.items():
        if node.get("parent") is None:
            root_id = node_id
            break

    if not root_id:
        return [node for node in mapping.values() if node.get("message")]

    result = []
    current_id = root_id
    visited = set()
    while current_id and current_id not in visited:
        visited.add(current_id)
        node = mapping.get(current_id, {})
        if node.get("message"):
            result.append(node)
        children = node.get("children", [])
        current_id = children[0] if children else None

    return result


def extract_text(message):
    """Extract readable text from a ChatGPT message."""
    if not message:
        return ""
    content = message.get("content", {})
    if not isinstance(content, dict):
        return ""

    content_type = content.get("content_type", "")
    if content_type in ("text", ""):
        parts = content.get("parts", [])
        return "\n\n".join(str(p) for p in parts if p)

    if content_type == "multimodal_text":
        parts = content.get("parts", [])
        text_parts = []
        for p in parts:
            if isinstance(p, str):
                text_parts.append(p)
            elif isinstance(p, dict):
                if "text" in p:
                    text_parts.append(p["text"])
                elif p.get("content_type") == "image_asset_pointer":
                    text_parts.append("[Image]")
                elif p.get("content_type") == "audio_transcription":
                    text_parts.append(f"[Audio: {p.get('text', '')}]")
        return "\n\n".join(text for text in text_parts if text)

    if content_type in ("code", "execution_output"):
        return f"```\n{content.get('text', '')}\n```"

    if content_type == "tether_quote":
        return f"> {content.get('text', '')}"

    return ""


def format_node(node):
    msg = node.get("message")
    if not msg:
        return None

    author = msg.get("author", {}) or {}
    role = author.get("role", "unknown")

    text = extract_text(msg)
    if not text.strip():
        return None
    if role == "system":
        return None

    timestamp = format_timestamp(msg.get("create_time"))
    if role == "user":
        sender = "You"
    elif role == "assistant":
        sender = "ChatGPT"
    elif role == "tool":
        sender = f"Tool ({author.get('name', 'unknown')})"
    else:
        sender = role.title()

    return f"### {timestamp} - {sender}\n\n{text}\n"


def get_full_text(mapping):
    """Return all message texts concatenated (for keyword scanning)."""
    nodes = walk_conversation(mapping)
    parts = []
    for node in nodes:
        msg = node.get("message")
        if not msg:
            continue
        text = extract_text(msg)
        if text:
            parts.append(text)
    return "\n".join(parts)


# ------------------------- Filtering & counting -----------------------------


def check_exclusions(conv, exclude_title_terms, exclude_keyword_terms, cached_full_text=None):
    """Return (excluded: bool, reason: str)."""
    title_lower = (conv.get("title") or "").lower()

    for term in exclude_title_terms:
        term_lower = term.lower().strip()
        if term_lower and term_lower in title_lower:
            return True, f"title contains '{term.strip()}'"

    if exclude_keyword_terms:
        if cached_full_text is None:
            cached_full_text = get_full_text(conv.get("mapping", {}))
        text_lower = cached_full_text.lower()
        for term in exclude_keyword_terms:
            term_lower = term.lower().strip()
            if term_lower and term_lower in text_lower:
                return True, f"body contains '{term.strip()}'"

    return False, ""


def count_keywords(full_text, keywords):
    """Return dict of {keyword: case-insensitive count in full_text}."""
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


def compare_to_state(conv_id, message_count, update_time, state):
    """Return ('NEW' | 'UPDATED' | 'SAME', existing_filename_or_None)."""
    prev = state["conversations"].get(conv_id)
    if not prev:
        return "NEW", None
    if (
        prev.get("message_count") == message_count
        and prev.get("update_time") == update_time
    ):
        return "SAME", prev.get("filename")
    return "UPDATED", prev.get("filename")


# ------------------------- Report CSV ---------------------------------------


def write_report(report_rows, keywords, report_path):
    """Write import report CSV matching the chatgpt-export-review structure."""
    report_path = Path(report_path).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    core_columns = [
        "import",
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
    all_columns = core_columns + keyword_columns + ["id"]

    with open(report_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_columns, extrasaction="ignore")
        writer.writeheader()
        for row in report_rows:
            writer.writerow(row)


# ------------------------- Main conversion ----------------------------------


def convert(json_path, output_dir, keywords=None, exclude_title=None,
            exclude_keyword=None, report_path=None, scan=False, manifest_path=None):
    keywords = keywords or []
    exclude_title = exclude_title or []
    exclude_keyword = exclude_keyword or []

    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    data = load_conversations(json_path)
    if data is None:
        print(f"[error] Expected a list of conversations at {json_path}")
        return 1

    manifest = load_manifest(manifest_path) if manifest_path else None

    state = load_state(output_dir)

    written_new = 0
    written_updated = 0
    unchanged = 0
    excluded = 0
    empty = 0
    manifest_skipped = 0
    unreviewed = 0

    report_rows = []

    for conv in data:
        conv_id = conv.get("id") or conv.get("conversation_id") or ""
        title = conv.get("title") or "untitled"
        create_time = conv.get("create_time", 0)
        update_time = conv.get("update_time", 0)
        create_date = date_from_timestamp(create_time)
        update_date = date_from_timestamp(update_time)

        mapping = conv.get("mapping", {})
        full_text = get_full_text(mapping)
        nodes = walk_conversation(mapping)
        formatted = [format_node(n) for n in nodes]
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
        elif manifest is not None and conv_id not in manifest:
            match_status = "UNREVIEWED"
            existing_filename = (state["conversations"].get(conv_id, {}) or {}).get("filename", "")
            unreviewed += 1
        elif manifest is not None and not manifest[conv_id]:
            match_status = "SKIPPED"
            existing_filename = (state["conversations"].get(conv_id, {}) or {}).get("filename", "")
            manifest_skipped += 1
        else:
            match_status, existing_filename = compare_to_state(
                conv_id, message_count, update_time, state
            )

        row = {
            "import": "",
            "title": title,
            "match_status": match_status,
            "existing_filename": existing_filename or "",
            "date_created": create_date,
            "date_updated": update_date,
            "word_count": word_count,
            "messages": message_count,
            "total_core_hits": total_core_hits,
            "primary_topics": primary_topics,
            "excluded_reason": exclude_reason,
        }
        for kw in keywords:
            row[f"hits:{kw.strip()}"] = keyword_hits.get(kw, 0)
        row["id"] = conv_id
        report_rows.append(row)

        if scan:
            continue

        if match_status in ("EXCLUDED", "SAME", "SKIPPED", "UNREVIEWED"):
            if match_status == "SAME":
                unchanged += 1
            continue

        filename = f"{create_date}-{safe_slug(title)}.md"
        out_path = output_dir / filename

        header = (
            f"# {title}\n\n"
            f"**Date:** {create_date}\n"
            f"**Messages:** {message_count}\n"
            f"**Source:** ChatGPT data export\n\n"
            f"---\n\n"
        )
        content = header + "\n---\n\n".join(formatted)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)

        state["conversations"][conv_id] = {
            "filename": filename,
            "message_count": message_count,
            "update_time": update_time,
            "title": title,
        }

        if match_status == "NEW":
            written_new += 1
        elif match_status == "UPDATED":
            written_updated += 1

    if not scan:
        save_state(state, output_dir)

    if report_path:
        write_report(report_rows, keywords, report_path)

    if scan:
        print(f"[scan] no files written, no state changed")
    else:
        print(f"[wrote] {output_dir}")
    summary_parts = [
        f"{written_new} new",
        f"{written_updated} updated",
        f"{unchanged} unchanged",
        f"{excluded} excluded",
    ]
    if manifest is not None:
        summary_parts.append(f"{manifest_skipped} skipped by manifest")
        summary_parts.append(f"{unreviewed} unreviewed (not in manifest)")
    if empty:
        summary_parts.append(f"{empty} empty/skipped")
    print(f"        {', '.join(summary_parts)}")
    print(f"        {len(state['conversations'])} conversations tracked in {STATE_FILENAME}")
    if report_path:
        print(f"[report] {Path(report_path).expanduser().resolve()}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Convert ChatGPT conversations.json export to Markdown for Scout."
    )
    parser.add_argument("json_path", help="Path to conversations.json OR the unzipped export folder (sharded exports)")
    parser.add_argument(
        "--output-dir",
        default="sources/chatgpt/",
        help="Output directory (default: sources/chatgpt/)",
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
    parser.add_argument(
        "--scan",
        action="store_true",
        help="Scan only: write the report CSV, import nothing, change no state. Requires --report.",
    )
    parser.add_argument(
        "--manifest",
        help="Path to a review CSV (from --scan) with the import column marked; only Y rows import",
    )
    args = parser.parse_args()

    if args.scan and not args.report:
        parser.error("--scan requires --report (the review CSV is the whole point of a scan)")
    if args.scan and args.manifest:
        parser.error("--scan and --manifest are mutually exclusive")

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
        scan=args.scan,
        manifest_path=args.manifest,
    ) or 0


if __name__ == "__main__":
    raise SystemExit(main())
