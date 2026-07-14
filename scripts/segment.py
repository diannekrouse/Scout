#!/usr/bin/env python3
"""
Scout segmenter.

Reads master-index.json and produces segments.json with topic-coherent chunks
of every indexed source file. Enables segment cards in Scout, source-window
line-highlighting, and search over segment titles and summaries.

Usage:
    python3 segment.py --dossier-root $DOSSIER_ROOT
    python3 segment.py --dossier-root $DOSSIER_ROOT --target-words 800
    python3 segment.py --dossier-root $DOSSIER_ROOT --min-words 150

Split heuristics (applied in order per file):
  1. USER markers (## USER / ## You / ### <timestamp> - You / ### <timestamp> - User)
     -> one segment per user turn plus its assistant reply, merged forward if too small
  2. Message headers (### <timestamp> - <Sender>)
     -> grouped into ~target-words chunks
  3. Fallback: word-based chunks at line boundaries

Output segments match the reader's SegmentSchema:
  segment_id, source_file, file_id, start_line, end_line, word_count,
  title, summary, workspace_primary, workspace_secondary, tags, lifecycle

Regenerates all segments on every run (fast for realistic dossier sizes).

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


# -------- Configuration defaults ----------------------------------------------

DEFAULT_TARGET_WORDS = 800
DEFAULT_MIN_WORDS = 120
MAX_TITLE_CHARS = 80
MAX_SUMMARY_CHARS = 220
MAX_TAGS_PER_SEGMENT = 6

# Common English stopwords for tag extraction. Deliberately short and generic.
STOPWORDS = frozenset("""
a about after all also and any are as at be because been before being both
but by can could did do does doing done down each even ever every for from
get got had has have having he her here him himself his how i if in into is
it its just like make many may me might more most much my no not now of off
on once one only or other our out over own same she should so some such than
that the their them then there these they this those through to too under
until up upon us use used using very was way we were what when where which
while who whom why will with within without would you your yes okay ok maybe
also could would should thing things good great really need want know think
say said get make made take took give gave still see saw feel felt come came
first last new next high low way ways time times day days year years right
left back around another together another lot lots even often still already
sure well while though etc via
""".split())


# -------- Helpers -------------------------------------------------------------


def word_count(text):
    return len(re.findall(r"\S+", text or ""))


def load_master_index(dossier_root):
    path = dossier_root / "index" / "master-index.json"
    if not path.exists():
        return {"files": []}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("files", [])
    return data


def read_source(dossier_root, rel_path):
    """Return list of lines for a source file, or None on error."""
    if not rel_path:
        return None
    full = dossier_root / rel_path
    try:
        with open(full, encoding="utf-8", errors="replace") as f:
            return f.readlines()
    except OSError:
        return None


# -------- Split detection ----------------------------------------------------


USER_MARKER_PATTERNS = [
    re.compile(r"^##\s+USER\s*$", re.IGNORECASE),
    re.compile(r"^##\s+You\s*$"),
    re.compile(r"^###\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+You\s*$"),
    re.compile(r"^###\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+User\s*$"),
    re.compile(r"^###\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+[A-Z][a-zA-Z]+\s+.*"),  # ### timestamp - <any sender>
]


def find_user_markers(lines):
    """Return line indices of user turn markers, 0-indexed."""
    markers = []
    for i, line in enumerate(lines):
        stripped = line.rstrip("\n")
        for pattern in USER_MARKER_PATTERNS:
            if pattern.match(stripped):
                markers.append(i)
                break
    return markers


def find_message_markers(lines):
    """Return line indices of message headers (### timestamp - Sender)."""
    marker_re = re.compile(r"^###\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+.+$")
    return [i for i, line in enumerate(lines) if marker_re.match(line.rstrip("\n"))]


# -------- Segment content extraction -----------------------------------------


def extract_title(segment_text, fallback):
    """Pull a short human-readable title from the segment content."""
    # Try H1/H2/H3 headers (skipping USER/ASSISTANT/You/Assistant labels + timestamp headers)
    for match in re.finditer(r"^#{1,3}\s+(.+?)\s*$", segment_text, re.MULTILINE):
        candidate = match.group(1).strip()
        if candidate.lower() in {"user", "assistant", "you", "claude", "chatgpt", "codex"}:
            continue
        # Skip pure-timestamp headers from our converters ("2026-06-05 10:00:00 - You")
        if re.match(r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+", candidate):
            continue
        candidate = re.sub(r"\s+", " ", candidate)
        return candidate[:MAX_TITLE_CHARS]

    # Try the first user message body, skipping headers, metadata lines, and separators
    lines = segment_text.split("\n")
    for line in lines:
        text = line.strip()
        if not text:
            continue
        if text.startswith("#"):
            continue
        # Skip our converter's metadata lines like **Month:** 2026-06, **Source:** ...
        if text.startswith("**") and text.count("**") >= 2 and ":" in text:
            continue
        # Skip separator lines
        if re.match(r"^[-=*_]+$", text):
            continue
        # Skip pure code-block fences
        if text.startswith("```"):
            continue
        # Skip callback commands like /start alone
        if text in ("/start", "/help", "/reset"):
            continue
        words = text.split()
        title = " ".join(words[:12])
        if len(title) >= 5:
            return title[:MAX_TITLE_CHARS]

    return fallback[:MAX_TITLE_CHARS]


def extract_summary(segment_text, tags):
    """Return a brief summary of the segment."""
    wc = word_count(segment_text)
    tag_phrase = ", ".join(tags[:3]) if tags else "mixed topics"

    # Try to find a real prose sentence in the segment body
    stripped = re.sub(r"^#{1,3}\s+.+?$\n?", "", segment_text, flags=re.MULTILINE)  # drop headers
    stripped = re.sub(r"^\s*\n", "", stripped)  # drop leading blank lines
    sentences = re.split(r"(?<=[.!?])\s+", stripped)
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 20 or sentence.startswith("#"):
            continue
        preview = re.sub(r"\s+", " ", sentence)[:MAX_SUMMARY_CHARS]
        return f"{preview.rstrip('.').rstrip()}. (~{wc:,} words, topics: {tag_phrase})"

    return f"Segment covering {tag_phrase} (~{wc:,} words)."


def extract_tags(segment_text, max_tags=MAX_TAGS_PER_SEGMENT):
    """Return the top-N most common significant words in the segment."""
    tokens = re.findall(r"[a-zA-Z][a-zA-Z\-]{3,}", segment_text.lower())
    filtered = (t for t in tokens if t not in STOPWORDS and len(t) >= 4)
    counts = Counter(filtered)
    if not counts:
        return []
    # Filter out anything that appears only once (weak signal for long text; keep for short)
    total_words = sum(counts.values())
    threshold = 2 if total_words > 200 else 1
    ranked = [word for word, n in counts.most_common(max_tags * 3) if n >= threshold]
    return ranked[:max_tags]


# -------- Segment construction -----------------------------------------------


def make_segment(file_entry, seg_num, start_line, end_line, text, dossier_root):
    file_id = file_entry.get("file_id", "unknown")
    workspace_primary = file_entry.get("workspace_primary")
    source_file = file_entry.get("path") or ""

    fallback_title = file_entry.get("title_detected") or file_entry.get("filename") or file_id
    tags = extract_tags(text)
    title = extract_title(text, fallback_title)
    summary = extract_summary(text, tags)

    return {
        "segment_id": f"{file_id}-s{seg_num:03d}",
        "source_file": source_file,
        "file_id": file_id,
        "start_line": start_line,
        "end_line": end_line,
        "word_count": word_count(text),
        "title": title,
        "summary": summary,
        "workspace_primary": workspace_primary,
        "workspace_secondary": [],
        "tags": tags,
        "lifecycle": "active",
    }


def segment_lines(lines, target_words, min_words):
    """Return list of (start_line_0idx, end_line_0idx, text) tuples.

    Strategy:
      1. If USER markers present (>=2): each marker starts a segment; small
         adjacent segments (< min_words) merge forward. USER markers are
         intentionally treated as strong boundaries: each user turn is its
         own segment.
      2. Else if timestamped message headers present (>=2): group messages
         into ~target-words chunks (Telegram/Claude/Codex converter outputs).
      3. Else: fixed word-count chunks at line boundaries.
    """
    if not lines:
        return []

    total_words = sum(word_count(line) for line in lines)

    # Very small file: one segment covers everything
    if total_words < min_words * 2:
        return [(0, len(lines), "".join(lines))]

    user_markers = find_user_markers(lines)
    if user_markers and len(user_markers) >= 2:
        return _segment_per_marker(lines, user_markers, min_words)

    msg_markers = find_message_markers(lines)
    if msg_markers and len(msg_markers) >= 2:
        return _segment_by_message_chunks(lines, msg_markers, target_words, min_words)

    return _segment_by_word_chunks(lines, target_words)


def _segment_per_marker(lines, marker_indices, min_words):
    """One segment per marker; adjacent tiny segments merge forward."""
    # If content precedes the first marker, keep it as its own segment when it's substantial
    raw = []
    if marker_indices[0] > 0:
        pre_text = "".join(lines[:marker_indices[0]])
        if word_count(pre_text) >= min_words:
            raw.append((0, marker_indices[0], pre_text))

    bounded = marker_indices + [len(lines)]
    for i in range(len(bounded) - 1):
        start = bounded[i]
        end = bounded[i + 1]
        text = "".join(lines[start:end])
        raw.append((start, end, text))

    # Merge tiny segments forward (or backward for the last one)
    merged = []
    i = 0
    while i < len(raw):
        start, end, text = raw[i]
        while word_count(text) < min_words and (i + 1) < len(raw):
            next_start, next_end, next_text = raw[i + 1]
            end = next_end
            text = text + next_text
            i += 1
        if word_count(text) < min_words and merged:
            prev_start, prev_end, prev_text = merged.pop()
            start = prev_start
            text = prev_text + text
        merged.append((start, end, text))
        i += 1
    return merged


def _segment_by_message_chunks(lines, marker_indices, target_words, min_words):
    """Group timestamped message headers into ~target_words chunks."""
    bounded = marker_indices + [len(lines)]
    raw = []
    if bounded[0] > 0:
        pre_text = "".join(lines[:bounded[0]])
        if word_count(pre_text) >= min_words:
            raw.append((0, bounded[0], pre_text))

    i = 0
    while i < len(bounded) - 1:
        start = bounded[i]
        end = bounded[i + 1]
        acc_words = word_count("".join(lines[start:end]))
        while acc_words < target_words and (i + 2) < len(bounded):
            i += 1
            end = bounded[i + 1]
            acc_words = word_count("".join(lines[start:end]))
        raw.append((start, end, "".join(lines[start:end])))
        i += 1

    # Merge tiny trailing segment backward
    if raw and word_count(raw[-1][2]) < min_words and len(raw) >= 2:
        prev_start, _, prev_text = raw[-2]
        last_start, last_end, last_text = raw[-1]
        raw = raw[:-2] + [(prev_start, last_end, prev_text + last_text)]
    return raw


def _segment_by_word_chunks(lines, target_words):
    """Fixed word-count chunks at line boundaries."""
    results = []
    buf_start = 0
    buf_words = 0
    for i, line in enumerate(lines):
        buf_words += word_count(line)
        if buf_words >= target_words:
            end_i = i + 1
            results.append((buf_start, end_i, "".join(lines[buf_start:end_i])))
            buf_start = end_i
            buf_words = 0
    if buf_start < len(lines):
        results.append((buf_start, len(lines), "".join(lines[buf_start:len(lines)])))
    return results


# -------- Main ----------------------------------------------------------------


def build_segments(dossier_root, target_words, min_words):
    dossier_root = Path(dossier_root).expanduser().resolve()

    if not (dossier_root / "index" / "master-index.json").exists():
        print(f"[error] {dossier_root / 'index' / 'master-index.json'} does not exist.")
        print(f"        Run build-index.py first to register your source files.")
        return 1

    master = load_master_index(dossier_root)
    files = master.get("files", [])

    all_segments = []
    files_processed = 0
    files_skipped = 0
    workspace_counts = Counter()

    for entry in files:
        rel_path = entry.get("path")
        lines = read_source(dossier_root, rel_path)
        if lines is None:
            files_skipped += 1
            continue

        chunks = segment_lines(lines, target_words, min_words)
        for seg_num, (start_i, end_i, text) in enumerate(chunks, start=1):
            segment = make_segment(entry, seg_num, start_i + 1, end_i, text, dossier_root)
            all_segments.append(segment)
            if segment.get("workspace_primary"):
                workspace_counts[segment["workspace_primary"]] += 1
        files_processed += 1

    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_files_processed": files_processed,
        "total_segments": len(all_segments),
        "workspace_counts": dict(workspace_counts),
        "segments": all_segments,
    }

    out_path = dossier_root / "index" / "segments.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"[built] {out_path.relative_to(dossier_root)}")
    print(f"        {files_processed} files processed, {files_skipped} skipped (missing or unreadable)")
    print(f"        {len(all_segments)} segments total")
    if workspace_counts:
        top_ws = ", ".join(f"{w}: {c}" for w, c in workspace_counts.most_common(6))
        print(f"        Top workspaces: {top_ws}")

    print(f"\nRestart Scout (Ctrl+C then npm run dev) or reload the browser to see segments.")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Build segments.json for Scout from master-index.json + source files.",
    )
    parser.add_argument(
        "--dossier-root",
        default=".",
        help="Path to dossier root containing index/ and sources/ (default: current directory)",
    )
    parser.add_argument(
        "--target-words",
        type=int,
        default=DEFAULT_TARGET_WORDS,
        help=f"Target words per segment (default: {DEFAULT_TARGET_WORDS})",
    )
    parser.add_argument(
        "--min-words",
        type=int,
        default=DEFAULT_MIN_WORDS,
        help=f"Minimum words per segment before merging (default: {DEFAULT_MIN_WORDS})",
    )
    args = parser.parse_args()

    if not args.dossier_root or str(args.dossier_root).strip() in ("", ".") and str(args.dossier_root).strip() == "":
        print("[error] --dossier-root is empty. Set $DOSSIER_ROOT in your shell first:")
        print("          export DOSSIER_ROOT=/absolute/path/to/your/data")
        return 1

    return build_segments(args.dossier_root, args.target_words, args.min_words) or 0


if __name__ == "__main__":
    raise SystemExit(main())
