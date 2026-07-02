#!/usr/bin/env python3
"""
Telegram to Markdown converter for Scout.

Reads a Telegram Desktop export (JSON) and writes markdown files organized
by channel and month into an output directory Scout can index.

Get the JSON from Telegram Desktop:
    Settings > Advanced > Export Telegram Data > select chats > JSON format

Usage:
    python telegram-to-md.py path/to/result.json --output-dir sources/telegram/

Output structure:
    sources/telegram/
    ├── channel-name-1/
    │   ├── 2026-05.md
    │   └── 2026-06.md
    └── channel-name-2/
        └── 2026-07.md

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path


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


def convert(json_path, output_dir):
    """Convert a Telegram JSON export to markdown files in output_dir."""
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

    total_chats = 0
    total_messages = 0

    for chat in chats:
        chat_name = chat.get("name") or chat.get("title") or "unknown-chat"
        folder = safe_folder_name(chat_name)
        chat_dir = output_dir / folder
        chat_dir.mkdir(parents=True, exist_ok=True)

        by_month = defaultdict(list)
        for msg in chat.get("messages", []):
            date_str = msg.get("date", "")
            try:
                dt = datetime.fromisoformat(date_str)
                month_key = dt.strftime("%Y-%m")
            except (ValueError, TypeError):
                month_key = "unknown-date"

            formatted = format_message(msg)
            if formatted:
                by_month[month_key].append(formatted)

        for month_key, formatted_msgs in sorted(by_month.items()):
            out_file = chat_dir / f"{month_key}.md"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(f"# {chat_name}\n\n")
                f.write(f"**Month:** {month_key}\n")
                f.write(f"**Messages:** {len(formatted_msgs)}\n")
                f.write(f"**Source:** Telegram Desktop export\n\n")
                f.write("---\n\n")
                f.write("\n---\n\n".join(formatted_msgs))
            total_messages += len(formatted_msgs)

        if by_month:
            total_chats += 1
            msg_count = sum(len(v) for v in by_month.values())
            print(f"[wrote] {chat_dir} ({msg_count} messages)")

    print(f"\nDone. {total_chats} chat(s), {total_messages} message(s) total.")


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
    args = parser.parse_args()
    convert(args.json_path, args.output_dir)


if __name__ == "__main__":
    main()
