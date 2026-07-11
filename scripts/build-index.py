#!/usr/bin/env python3
"""
Build a Scout substrate index from a sources/ folder.

Scans <dossier-root>/sources/<workspace>/**/*.md and generates:
  - index/workspaces.json (one entry per subfolder of sources/)
  - index/master-index.json (one entry per markdown file, with the fields
    the Scout reader expects: path with sources/ prefix, workspace_primary,
    title_detected, platform, filename, file_type, date_detected,
    total_lines, total_words, status)

Preserves existing entries when re-run. Rewrites entries whose fields don't
match the current reader schema (so an index built by an older build-index
gets upgraded automatically instead of leaving broken data).

Usage:
    python3 build-index.py                            # runs against current directory
    python3 build-index.py --dossier-root ~/my-data   # runs against a specific root

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_COLORS = [
    "#4A90D9", "#50C878", "#9B59B6", "#E8735A", "#45B5AA",
    "#F4D03F", "#C9A227", "#B6753A", "#7B5FCE", "#3AA1B8",
]


def safe_id(name):
    """Convert a folder or file name to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", name).strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug or "unknown"


def file_id_from_path(rel_from_sources):
    """Generate a stable file_id from the path (relative to sources/)."""
    stem = str(rel_from_sources).replace("/", "-").rsplit(".", 1)[0]
    return safe_id(stem)


def title_from_filename(name):
    return name.replace("-", " ").replace("_", " ").title()


def title_from_markdown(md_file):
    """Return the first H1 in the file, or None if not found in the top 30 lines."""
    try:
        with open(md_file, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                if i > 30:
                    break
                stripped = line.strip()
                if stripped.startswith("# ") and not stripped.startswith("## "):
                    return stripped[2:].strip()
    except OSError:
        pass
    return None


DATE_PATTERNS = [
    re.compile(r"(\d{4}-\d{2}-\d{2})"),
    re.compile(r"(\d{4}-\d{2})"),
]


def detect_date(filename, md_file=None):
    """Detect a YYYY-MM-DD or YYYY-MM date from filename, fall back to file mtime."""
    for pattern in DATE_PATTERNS:
        m = pattern.search(filename)
        if m:
            return m.group(1)
    if md_file:
        try:
            ts = md_file.stat().st_mtime
            return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
        except OSError:
            pass
    return None


def count_lines_words(md_file):
    """Count total lines and total words in a markdown file."""
    try:
        with open(md_file, encoding="utf-8", errors="replace") as f:
            text = f.read()
    except OSError:
        return 0, 0
    lines = text.count("\n") + (0 if text.endswith("\n") else 1)
    words = len(text.split())
    return lines, words


def load_or_default(path, default):
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"[warn] Could not read {path}: {e}. Starting fresh.")
    return default


def migrate_legacy_entry(entry):
    """Upgrade an entry from an older build-index format to the current schema.

    Returns True if any changes were made."""
    changed = False
    # workspace → workspace_primary
    if "workspace" in entry and "workspace_primary" not in entry:
        entry["workspace_primary"] = entry.pop("workspace")
        changed = True
    elif "workspace" in entry:
        entry.pop("workspace", None)
        changed = True
    # title → title_detected
    if "title" in entry and "title_detected" not in entry:
        entry["title_detected"] = entry.pop("title")
        changed = True
    elif "title" in entry:
        entry.pop("title", None)
        changed = True
    # path missing sources/ prefix
    p = entry.get("path", "")
    if p and not p.startswith("sources/") and not p.startswith("sources\\"):
        entry["path"] = f"sources/{p}"
        changed = True
    return changed


def build_index(dossier_root):
    # Guard against an unset $DOSSIER_ROOT that expanded to an empty string
    # in the caller's shell. Without this, Path("").resolve() gives the cwd,
    # which is almost never what the user meant.
    if not dossier_root or str(dossier_root).strip() in ("", "."):
        if not dossier_root or str(dossier_root).strip() == "":
            print(f"[error] --dossier-root is empty. This usually means $DOSSIER_ROOT is unset")
            print(f"        in your shell. Set it first with:")
            print(f"          export DOSSIER_ROOT=/absolute/path/to/your/data")
            print(f"        then rerun this command.")
            return 1

    root = Path(dossier_root).expanduser().resolve()
    sources_dir = root / "sources"
    index_dir = root / "index"

    if not sources_dir.exists():
        print(f"[error] {sources_dir} does not exist. Create it and add source files first.")
        return 1

    index_dir.mkdir(exist_ok=True)

    workspaces_file = index_dir / "workspaces.json"
    master_index_file = index_dir / "master-index.json"

    workspaces_data = load_or_default(workspaces_file, {"workspaces": []})
    master_index_data = load_or_default(
        master_index_file,
        {"files": [], "last_updated": "", "total_files": 0},
    )

    # Migrate legacy entries first (workspace → workspace_primary, path prefix, etc.)
    migrated = 0
    for entry in master_index_data["files"]:
        if migrate_legacy_entry(entry):
            migrated += 1

    existing_workspace_ids = {ws["id"] for ws in workspaces_data["workspaces"]}
    # Dedupe by file_id so re-runs rewrite entries in place instead of duplicating
    existing_files_by_id = {
        f["file_id"]: f for f in master_index_data["files"] if f.get("file_id")
    }

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    added_files = 0
    updated_files = 0
    added_workspaces = 0

    for workspace_dir in sorted(sources_dir.iterdir()):
        if not workspace_dir.is_dir():
            continue

        ws_id = safe_id(workspace_dir.name)
        platform_display = workspace_dir.name.replace("-", " ").replace("_", " ").title()

        if ws_id not in existing_workspace_ids:
            color = DEFAULT_COLORS[len(workspaces_data["workspaces"]) % len(DEFAULT_COLORS)]
            workspaces_data["workspaces"].append({
                "id": ws_id,
                "name": platform_display,
                "description": f"Sources from {workspace_dir.name}/",
                "color": color,
                "created_at": now,
                "concept_count": 0,
                "source_count": 0,
            })
            existing_workspace_ids.add(ws_id)
            added_workspaces += 1

        workspace_file_count = 0
        for md_file in sorted(workspace_dir.rglob("*.md")):
            rel_from_sources = md_file.relative_to(sources_dir)   # for file_id
            rel_from_root = md_file.relative_to(root)              # for `path` (includes sources/)
            workspace_file_count += 1

            fid = file_id_from_path(rel_from_sources)

            title_h1 = title_from_markdown(md_file)
            title_detected = title_h1 or title_from_filename(md_file.stem)
            date_detected = detect_date(md_file.name, md_file)
            total_lines, total_words = count_lines_words(md_file)

            entry = {
                "file_id": fid,
                "path": str(rel_from_root),
                "platform": platform_display,
                "filename": md_file.name,
                "file_type": md_file.suffix.lstrip("."),
                "date_detected": date_detected,
                "title_detected": title_detected,
                "total_lines": total_lines,
                "total_words": total_words,
                "workspace_primary": ws_id,
                "status": "indexed",
            }

            if fid in existing_files_by_id:
                old_entry = existing_files_by_id[fid]
                # Update in place, preserving any extra keys the reader may have added
                if any(old_entry.get(k) != v for k, v in entry.items()):
                    for k, v in entry.items():
                        old_entry[k] = v
                    updated_files += 1
            else:
                master_index_data["files"].append(entry)
                existing_files_by_id[fid] = entry
                added_files += 1

        for ws in workspaces_data["workspaces"]:
            if ws["id"] == ws_id:
                ws["source_count"] = workspace_file_count
                break

    master_index_data["last_updated"] = now
    master_index_data["total_files"] = len(master_index_data["files"])

    with open(workspaces_file, "w", encoding="utf-8") as f:
        json.dump(workspaces_data, f, indent=2)
    with open(master_index_file, "w", encoding="utf-8") as f:
        json.dump(master_index_data, f, indent=2)

    # -- Self-check: verify every registered path resolves to a real file --
    verified = 0
    missing = []
    for entry in master_index_data["files"]:
        p = entry.get("path", "")
        if not p:
            missing.append("(no path)")
            continue
        full = root / p
        if full.is_file():
            verified += 1
        else:
            missing.append(p)

    print(f"[built] {workspaces_file.relative_to(root)}")
    print(f"        {added_workspaces} new workspace(s), {len(workspaces_data['workspaces'])} total")
    print(f"[built] {master_index_file.relative_to(root)}")
    print(f"        {added_files} new, {updated_files} updated"
          + (f", {migrated} migrated from older format" if migrated else "")
          + f", {master_index_data['total_files']} total")

    total = len(master_index_data["files"])
    print(f"\n[check] {verified} of {total} source files verified readable from {root}")
    if missing:
        print(f"[warn]  {len(missing)} entries point at files that do not exist:")
        for p in missing[:5]:
            print(f"        - {p}")
        if len(missing) > 5:
            print(f"        ... and {len(missing) - 5} more")

    print(f"\nRestart Scout (Ctrl+C then npm run dev) to see your data.")
    return 0 if not missing else 2


def main():
    parser = argparse.ArgumentParser(
        description="Build/update Scout substrate index from a sources/ folder."
    )
    parser.add_argument(
        "--dossier-root",
        default=".",
        help="Path to dossier root containing sources/ (default: current directory)",
    )
    args = parser.parse_args()
    return build_index(args.dossier_root) or 0


if __name__ == "__main__":
    raise SystemExit(main())
