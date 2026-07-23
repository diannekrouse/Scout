#!/usr/bin/env python3
"""
Claude Code JSONL to Markdown converter for Scout.

Reads Claude Code's session JSONL files (from ~/.claude/projects/<project>/)
and converts to markdown, one file per session, organized by project.

Claude Code stores each session as a JSONL file at:
    ~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl

Where <encoded-project-path> is the project's working directory with slashes
replaced by dashes (e.g. -Users-diannekrouse-qi7-qi7-dossier for
/Users/diannekrouse/qi7/qi7-dossier).

Usage:
    python claude-code-to-md.py <project-dir> --output-dir sources/claude-code/

Example:
    python claude-code-to-md.py \\
        ~/.claude/projects/-Users-diannekrouse-qi7-qi7-dossier/ \\
        --output-dir $DOSSIER_ROOT/sources/claude-code/

Options:
    --include-thinking    Include Claude's thinking blocks in the output.
                          Default: skip them (they can be very long).

Output structure:
    sources/claude-code/<project-slug>/YYYY-MM-DD-<session-prefix>.md

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path


def safe_folder_name(name):
    """Convert a project directory name into a filesystem-safe folder."""
    slug = re.sub(r"[^\w-]", "-", name).strip("-").lower()
    slug = re.sub(r"-+", "-", slug)
    return slug or "unknown-project"


def format_timestamp(ts_str):
    """Parse an ISO timestamp and return a human-readable string."""
    if not ts_str:
        return "unknown-time"
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, AttributeError):
        return str(ts_str)


def truncate(text, limit):
    if not text:
        return ""
    text = str(text)
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def extract_content(content, include_thinking=False):
    """Extract readable text from a content field (string or list of blocks)."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""

    parts = []
    for block in content:
        if isinstance(block, str):
            parts.append(block)
            continue
        if not isinstance(block, dict):
            continue

        btype = block.get("type", "")
        if btype == "text":
            parts.append(block.get("text", ""))
        elif btype == "thinking":
            if include_thinking:
                thinking = block.get("thinking", "")
                if thinking:
                    parts.append(f"\n> *Thinking:*\n>\n> {truncate(thinking, 600)}\n")
        elif btype == "tool_use":
            tool_name = block.get("name", "unknown")
            tool_input = block.get("input", {})
            try:
                input_preview = truncate(json.dumps(tool_input, indent=2), 400)
            except (TypeError, ValueError):
                input_preview = truncate(str(tool_input), 400)
            parts.append(f"\n**[Tool: {tool_name}]**\n```json\n{input_preview}\n```\n")
        elif btype == "tool_result":
            result_content = block.get("content", "")
            if isinstance(result_content, list):
                result_content = extract_content(result_content, include_thinking=False)
            result_str = truncate(str(result_content), 600)
            parts.append(f"\n**[Tool result]**\n```\n{result_str}\n```\n")
        elif btype == "image":
            parts.append("[Image]")

    return "\n".join(p for p in parts if p).strip()


def format_message(record, include_thinking=False):
    """Format one JSONL record as a markdown block. Returns None if not a message."""
    msg_type = record.get("type", "")
    if msg_type not in ("user", "assistant"):
        return None

    msg = record.get("message", {})
    if not isinstance(msg, dict):
        return None

    role = msg.get("role", msg_type)
    content = msg.get("content", "")
    text = extract_content(content, include_thinking=include_thinking)

    if not text.strip():
        return None

    timestamp = format_timestamp(record.get("timestamp", ""))
    sender = "User" if role == "user" else "Claude"

    return f"### {timestamp} - {sender}\n\n{text}\n"


def convert_session(jsonl_path, include_thinking=False):
    """Convert one JSONL session file to markdown text plus session-date."""
    messages = []
    session_id = jsonl_path.stem
    project_name = jsonl_path.parent.name
    first_timestamp = None

    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if first_timestamp is None:
                ts = record.get("timestamp")
                if ts:
                    first_timestamp = ts

            formatted = format_message(record, include_thinking=include_thinking)
            if formatted:
                messages.append(formatted)

    if not messages:
        return None, None

    session_date = "unknown-date"
    if first_timestamp:
        try:
            dt = datetime.fromisoformat(first_timestamp.replace("Z", "+00:00"))
            session_date = dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    header = (
        f"# Claude Code session {session_id[:8]}\n\n"
        f"**Session ID:** {session_id}\n"
        f"**Project:** {project_name}\n"
        f"**Date:** {session_date}\n"
        f"**Messages:** {len(messages)}\n"
        f"**Source:** Claude Code JSONL\n\n"
        f"---\n\n"
    )
    content = header + "\n---\n\n".join(messages)
    return content, session_date


def convert(project_dir, output_dir, include_thinking=False, title=None):
    """Convert all JSONL files in a Claude Code project directory.

    When `title` is given AND the project holds a single session, the output
    file is named `YYYY-MM-DD-<title-slug>.md` and the human title is used as
    the document's H1 (so Scout's index shows the chat's real name, e.g.
    "Graph technologies for AI Coding", instead of a session UUID). With
    multiple sessions a single title can't name them all, so it is ignored
    for naming and the default date+id scheme is used.
    """
    project_dir = Path(project_dir).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()

    if not project_dir.exists() or not project_dir.is_dir():
        print(f"[error] {project_dir} is not a directory")
        return 1

    jsonl_files = sorted(project_dir.glob("*.jsonl"))
    if not jsonl_files:
        print(f"[error] No .jsonl files found in {project_dir}")
        return 1

    if title and len(jsonl_files) > 1:
        print(f"[note] --title ignored: {len(jsonl_files)} sessions here, "
              f"a single title can't name them all. Using date+id names.")
        title = None

    project_folder = safe_folder_name(project_dir.name)
    output_project_dir = output_dir / project_folder
    output_project_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    skipped = 0
    for jsonl_file in jsonl_files:
        content, session_date = convert_session(jsonl_file, include_thinking=include_thinking)
        if content is None:
            skipped += 1
            continue

        if title:
            out_name = f"{session_date}-{safe_folder_name(title)}.md"
            content = f"# {title}\n\n{content}"
        else:
            out_name = f"{session_date}-{jsonl_file.stem[:8]}.md"
        out_path = output_project_dir / out_name
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        written += 1

    print(f"[wrote] {output_project_dir}")
    print(f"        {written} session(s), {skipped} empty/skipped")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Convert Claude Code JSONL session files to Markdown for Scout."
    )
    parser.add_argument(
        "project_dir",
        help="Path to a Claude Code project directory (e.g. ~/.claude/projects/<name>/)",
    )
    parser.add_argument(
        "--output-dir",
        default="sources/claude-code/",
        help="Output directory (default: sources/claude-code/)",
    )
    parser.add_argument(
        "--include-thinking",
        action="store_true",
        help="Include Claude's thinking blocks in the output",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Human chat name for a single-session export (used as the "
             "filename slug and document H1, e.g. \"Graph technologies for AI Coding\")",
    )
    args = parser.parse_args()
    return convert(args.project_dir, args.output_dir,
                   include_thinking=args.include_thinking, title=args.title) or 0


if __name__ == "__main__":
    raise SystemExit(main())
