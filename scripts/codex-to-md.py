#!/usr/bin/env python3
"""
OpenAI Codex CLI JSONL to Markdown converter for Scout.

Reads Codex CLI's session rollout files and converts to markdown, one file
per session. Uses thread names from ~/.codex/session_index.jsonl (if present)
so output files are named by the human-readable thread title rather than a UUID.

Codex CLI stores each session as a JSONL file at:
    ~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl

Thread titles (used for filenames) live in:
    ~/.codex/session_index.jsonl

Usage:
    # Convert all sessions (recursive from top-level sessions folder):
    python codex-to-md.py ~/.codex/sessions/ --output-dir $DOSSIER_ROOT/sources/codex/

    # Convert one month:
    python codex-to-md.py ~/.codex/sessions/2026/02/ --output-dir $DOSSIER_ROOT/sources/codex/

    # Convert a single rollout file:
    python codex-to-md.py \\
        ~/.codex/sessions/2026/02/27/rollout-2026-02-27T11-22-10-<uuid>.jsonl \\
        --output-dir $DOSSIER_ROOT/sources/codex/

Options:
    --include-thinking    Include reasoning summaries in output (default: skip)
    --include-system      Include developer/system messages (default: skip)

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path


def safe_slug(name):
    """Convert a thread name or fallback string to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", name or "").strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug[:70] or "untitled"


def format_timestamp(ts_str):
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


def load_thread_names(codex_root):
    """Load ~/.codex/session_index.jsonl into a {session_id: thread_name} map."""
    if not codex_root:
        return {}
    idx_path = codex_root / "session_index.jsonl"
    if not idx_path.exists():
        return {}
    names = {}
    with open(idx_path, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                sid = rec.get("id")
                name = rec.get("thread_name")
                if sid and name:
                    names[sid] = name
            except json.JSONDecodeError:
                continue
    return names


def find_codex_root(path):
    """Walk up from a path to find the ~/.codex/ root (where session_index.jsonl lives)."""
    p = path.resolve()
    for candidate in [p] + list(p.parents):
        if candidate.name == ".codex" and (candidate / "session_index.jsonl").exists():
            return candidate
        if (candidate / "session_index.jsonl").exists() and candidate.name != "sessions":
            return candidate
    return None


def extract_message_text(content):
    """Extract text from a response_item message content array."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""

    parts = []
    for item in content:
        if isinstance(item, str):
            parts.append(item)
        elif isinstance(item, dict):
            itype = item.get("type", "")
            if itype in ("input_text", "output_text", "text"):
                parts.append(item.get("text", ""))
            elif itype == "input_image":
                parts.append("[Image]")

    return "\n\n".join(p for p in parts if p).strip()


def format_response_item(record, include_thinking=False, include_system=False):
    """Format a single response_item record as a markdown block or None."""
    if record.get("type") != "response_item":
        return None
    payload = record.get("payload") or {}
    if not isinstance(payload, dict):
        return None

    pt = payload.get("type", "")
    timestamp = format_timestamp(record.get("timestamp", ""))

    if pt == "message":
        role = payload.get("role", "unknown")
        if role == "developer" and not include_system:
            return None
        if role == "system" and not include_system:
            return None
        text = extract_message_text(payload.get("content", []))
        if not text:
            return None
        if role == "user":
            sender = "You"
        elif role == "assistant":
            sender = "Codex"
        elif role == "developer":
            sender = "System (developer)"
        else:
            sender = role.title()
        return f"### {timestamp} - {sender}\n\n{text}\n"

    if pt == "reasoning":
        if not include_thinking:
            return None
        summary = payload.get("summary", [])
        if isinstance(summary, list):
            texts = []
            for item in summary:
                if isinstance(item, dict) and item.get("type") == "summary_text":
                    texts.append(item.get("text", ""))
            summary_text = "\n".join(t for t in texts if t)
        else:
            summary_text = str(summary)
        if not summary_text.strip():
            return None
        return f"### {timestamp} - Codex (thinking)\n\n> *{truncate(summary_text, 800)}*\n"

    if pt in ("function_call", "custom_tool_call"):
        name = payload.get("name", "unknown")
        args = payload.get("arguments") or payload.get("input", "")
        if isinstance(args, str):
            args_str = truncate(args, 500)
        else:
            try:
                args_str = truncate(json.dumps(args, indent=2), 500)
            except (TypeError, ValueError):
                args_str = truncate(str(args), 500)
        return f"### {timestamp} - Codex\n\n**[Tool: {name}]**\n```\n{args_str}\n```\n"

    if pt in ("function_call_output", "custom_tool_call_output"):
        output = payload.get("output", "")
        if isinstance(output, str):
            output_str = truncate(output, 800)
        else:
            try:
                output_str = truncate(json.dumps(output, indent=2), 800)
            except (TypeError, ValueError):
                output_str = truncate(str(output), 800)
        return f"### {timestamp} - Tool result\n\n```\n{output_str}\n```\n"

    return None


def convert_session(jsonl_path, include_thinking=False, include_system=False):
    """Convert one rollout JSONL to markdown. Returns (content, session_id, session_date, cwd)."""
    messages = []
    session_id = None
    session_date = "unknown-date"
    cwd = None
    first_timestamp = None

    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if record.get("type") == "session_meta":
                p = record.get("payload") or {}
                session_id = p.get("id")
                cwd = p.get("cwd")
                ts = p.get("timestamp") or record.get("timestamp")
                if ts:
                    first_timestamp = ts
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        session_date = dt.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                continue

            if first_timestamp is None:
                ts = record.get("timestamp")
                if ts:
                    first_timestamp = ts
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        session_date = dt.strftime("%Y-%m-%d")
                    except ValueError:
                        pass

            formatted = format_response_item(
                record,
                include_thinking=include_thinking,
                include_system=include_system,
            )
            if formatted:
                messages.append(formatted)

    if not messages:
        return None, session_id, session_date, cwd

    return "\n---\n\n".join(messages), session_id, session_date, cwd


def convert(input_path, output_dir, include_thinking=False, include_system=False):
    input_path = Path(input_path).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    codex_root = find_codex_root(input_path)
    thread_names = load_thread_names(codex_root) if codex_root else {}

    if input_path.is_file():
        rollout_files = [input_path]
    elif input_path.is_dir():
        rollout_files = sorted(input_path.rglob("rollout-*.jsonl"))
    else:
        print(f"[error] {input_path} is not a file or directory")
        return 1

    if not rollout_files:
        print(f"[error] No rollout-*.jsonl files found under {input_path}")
        return 1

    written = 0
    skipped = 0
    for rollout in rollout_files:
        content, session_id, session_date, cwd = convert_session(
            rollout,
            include_thinking=include_thinking,
            include_system=include_system,
        )
        if content is None:
            skipped += 1
            continue

        thread_name = thread_names.get(session_id) if session_id else None
        display_title = thread_name or f"session-{(session_id or rollout.stem)[:12]}"
        title_slug = safe_slug(display_title)

        filename = f"{session_date}-{title_slug}.md"
        out_path = output_dir / filename

        # Avoid overwriting when two sessions have the same date + title slug
        if out_path.exists():
            suffix = (session_id or rollout.stem)[:8]
            filename = f"{session_date}-{title_slug}-{suffix}.md"
            out_path = output_dir / filename

        message_count = content.count("###")
        header_parts = [
            f"# {display_title}",
            "",
            f"**Date:** {session_date}",
            f"**Messages:** {message_count}",
        ]
        if session_id:
            header_parts.append(f"**Session ID:** {session_id}")
        if cwd:
            header_parts.append(f"**Working directory:** `{cwd}`")
        header_parts.extend(["**Source:** OpenAI Codex CLI rollout", "", "---", "", ""])
        header = "\n".join(header_parts)

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(header + content)
        written += 1

    print(f"[wrote] {output_dir}")
    print(f"        {written} session(s), {skipped} empty/skipped")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Convert OpenAI Codex CLI rollout JSONL files to Markdown for Scout."
    )
    parser.add_argument(
        "input_path",
        help="Path to a Codex sessions directory (recursive) or a single rollout .jsonl file",
    )
    parser.add_argument(
        "--output-dir",
        default="sources/codex/",
        help="Output directory (default: sources/codex/)",
    )
    parser.add_argument(
        "--include-thinking",
        action="store_true",
        help="Include reasoning/thinking summaries in the output",
    )
    parser.add_argument(
        "--include-system",
        action="store_true",
        help="Include developer/system messages in the output",
    )
    args = parser.parse_args()
    return convert(
        args.input_path,
        args.output_dir,
        include_thinking=args.include_thinking,
        include_system=args.include_system,
    ) or 0


if __name__ == "__main__":
    raise SystemExit(main())
