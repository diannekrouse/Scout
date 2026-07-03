#!/usr/bin/env python3
"""
Claude.ai JSON to Markdown converter for Scout.

Reads a Claude.ai data export (conversations.json) and converts to markdown,
one file per conversation.

Get the export from claude.ai:
    Account menu (top-right) > Settings > Privacy > Export data
    You will receive a download link by email. Unzip and locate
    conversations.json (usually at the top level of the export).

Usage:
    python claude-ai-to-md.py path/to/conversations.json --output-dir sources/claude/

Example:
    python claude-ai-to-md.py \\
        ~/Downloads/data-2026-07-02/conversations.json \\
        --output-dir $DOSSIER_ROOT/sources/claude/

Output structure:
    sources/claude/YYYY-MM-DD-<title-slug>.md

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path


def safe_slug(name):
    """Convert a conversation title to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", name or "").strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug[:60] or "untitled"


def format_timestamp(ts_str):
    """Parse an ISO timestamp and return a human-readable string."""
    if not ts_str:
        return "unknown-time"
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, AttributeError):
        return str(ts_str)


def extract_text(message):
    """Extract text from a claude.ai chat_message (text field or content array)."""
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
                    parts.append(f"\n**[Tool use]**\n")
                elif item.get("type") == "tool_result":
                    parts.append(f"\n**[Tool result]**\n")
            elif isinstance(item, str):
                parts.append(item)
        return "\n\n".join(p for p in parts if p)
    return ""


def format_message(msg):
    text = extract_text(msg)
    if not text.strip():
        return None

    timestamp = format_timestamp(msg.get("created_at", ""))
    sender_raw = msg.get("sender", "").lower()
    if sender_raw == "human":
        sender = "You"
    elif sender_raw == "assistant":
        sender = "Claude"
    else:
        sender = sender_raw.title() or "Unknown"

    return f"### {timestamp} - {sender}\n\n{text}\n"


def convert(json_path, output_dir):
    json_path = Path(json_path).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # The claude.ai export is a top-level list of conversations
    if not isinstance(data, list):
        print(f"[error] Expected a list of conversations at {json_path}")
        return 1

    written = 0
    skipped = 0
    for conv in data:
        title = conv.get("name") or conv.get("uuid", "untitled")
        created = conv.get("created_at", "")
        created_date = "unknown-date"
        if created:
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                created_date = dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

        messages = conv.get("chat_messages", [])
        formatted = [format_message(m) for m in messages]
        formatted = [f for f in formatted if f]

        if not formatted:
            skipped += 1
            continue

        filename = f"{created_date}-{safe_slug(title)}.md"
        out_path = output_dir / filename

        header = (
            f"# {title}\n\n"
            f"**Date:** {created_date}\n"
            f"**Messages:** {len(formatted)}\n"
            f"**Source:** Claude.ai data export\n\n"
            f"---\n\n"
        )
        content = header + "\n---\n\n".join(formatted)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        written += 1

    print(f"[wrote] {output_dir}")
    print(f"        {written} conversation(s), {skipped} empty/skipped")
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
    args = parser.parse_args()
    return convert(args.json_path, args.output_dir) or 0


if __name__ == "__main__":
    raise SystemExit(main())
