#!/usr/bin/env python3
"""
ChatGPT JSON to Markdown converter for Scout.

Reads a ChatGPT data export (conversations.json) and converts to markdown,
one file per conversation. ChatGPT stores each conversation as a tree of
messages (parent/children pointers); this script walks the primary branch
to produce a linear transcript.

Get the export from ChatGPT:
    Settings > Data controls > Export data
    You will receive a download link by email. Unzip and locate
    conversations.json (usually at the top level of the export).

Usage:
    python chatgpt-to-md.py path/to/conversations.json --output-dir sources/chatgpt/

Example:
    python chatgpt-to-md.py \\
        ~/Downloads/chatgpt-export/conversations.json \\
        --output-dir $DOSSIER_ROOT/sources/chatgpt/

Output structure:
    sources/chatgpt/YYYY-MM-DD-<title-slug>.md

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


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


def walk_conversation(mapping):
    """Walk the ChatGPT message tree along the primary branch to produce a linear list.

    ChatGPT stores conversations as a tree via parent/children pointers. This
    follows the first child at each step, which is the primary conversation branch
    (side-branches from message edits are skipped)."""
    if not mapping:
        return []

    # Find the root: the node with parent = None
    root_id = None
    for node_id, node in mapping.items():
        if node.get("parent") is None:
            root_id = node_id
            break

    if not root_id:
        # Fallback: any node without a valid parent, in insertion order
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

    if content_type == "code":
        return f"```\n{content.get('text', '')}\n```"

    if content_type == "execution_output":
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

    # System messages with empty content are noise; skip them
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


def convert(json_path, output_dir):
    json_path = Path(json_path).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # ChatGPT export is a top-level list of conversations
    if not isinstance(data, list):
        print(f"[error] Expected a list of conversations at {json_path}")
        return 1

    written = 0
    skipped = 0
    for conv in data:
        title = conv.get("title") or "untitled"
        create_time = conv.get("create_time", 0)
        create_date = "unknown-date"
        if create_time:
            try:
                dt = datetime.fromtimestamp(float(create_time), tz=timezone.utc)
                create_date = dt.strftime("%Y-%m-%d")
            except (ValueError, TypeError, OSError):
                pass

        mapping = conv.get("mapping", {})
        nodes = walk_conversation(mapping)
        formatted = [format_node(n) for n in nodes]
        formatted = [f for f in formatted if f]

        if not formatted:
            skipped += 1
            continue

        filename = f"{create_date}-{safe_slug(title)}.md"
        out_path = output_dir / filename

        header = (
            f"# {title}\n\n"
            f"**Date:** {create_date}\n"
            f"**Messages:** {len(formatted)}\n"
            f"**Source:** ChatGPT data export\n\n"
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
        description="Convert ChatGPT conversations.json export to Markdown for Scout."
    )
    parser.add_argument("json_path", help="Path to conversations.json from ChatGPT export")
    parser.add_argument(
        "--output-dir",
        default="sources/chatgpt/",
        help="Output directory (default: sources/chatgpt/)",
    )
    args = parser.parse_args()
    return convert(args.json_path, args.output_dir) or 0


if __name__ == "__main__":
    raise SystemExit(main())
