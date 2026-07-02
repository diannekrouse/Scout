#!/usr/bin/env python3
"""
Build a minimal Scout substrate index from a sources/ folder.

Scans <dossier-root>/sources/<workspace>/**/*.md and generates:
  - index/workspaces.json (one entry per subfolder of sources/)
  - index/master-index.json (one entry per markdown file)

Preserves existing entries when re-run. Adds new ones; does not remove or
overwrite. Safe to run repeatedly after adding new sources.

Usage:
    python build-index.py                        # runs against current directory
    python build-index.py --dossier-root ~/my-data   # runs against a specific root

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


def file_id_from_path(rel_path):
    """Generate a stable file_id from the relative path."""
    stem = str(rel_path).replace("/", "-").rsplit(".", 1)[0]
    return safe_id(stem)


def title_from_filename(name):
    """Convert 'omegaclaw-2026-06.md' to 'Omegaclaw 2026 06'."""
    return name.replace("-", " ").replace("_", " ").title()


def load_or_default(path, default):
    """Load a JSON file if it exists; otherwise return the default."""
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"[warn] Could not read {path}: {e}. Starting fresh.")
    return default


def build_index(dossier_root):
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

    existing_workspace_ids = {ws["id"] for ws in workspaces_data["workspaces"]}
    existing_file_paths = {f.get("path") for f in master_index_data["files"]}

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    added_workspaces = 0
    added_files = 0

    for workspace_dir in sorted(sources_dir.iterdir()):
        if not workspace_dir.is_dir():
            continue

        ws_id = safe_id(workspace_dir.name)

        if ws_id not in existing_workspace_ids:
            color = DEFAULT_COLORS[len(workspaces_data["workspaces"]) % len(DEFAULT_COLORS)]
            workspaces_data["workspaces"].append({
                "id": ws_id,
                "name": workspace_dir.name.replace("-", " ").title(),
                "description": f"Sources from {workspace_dir.name}/",
                "color": color,
                "created_at": now,
                "concept_count": 0,
                "source_count": 0,
            })
            existing_workspace_ids.add(ws_id)
            added_workspaces += 1

        # Recursively scan for markdown files inside this workspace
        workspace_file_count = 0
        for md_file in sorted(workspace_dir.rglob("*.md")):
            rel_path = md_file.relative_to(sources_dir)
            rel_path_str = str(rel_path)
            workspace_file_count += 1

            if rel_path_str in existing_file_paths:
                continue

            try:
                size = md_file.stat().st_size
            except OSError:
                size = 0

            master_index_data["files"].append({
                "file_id": file_id_from_path(rel_path),
                "workspace": ws_id,
                "path": rel_path_str,
                "title": title_from_filename(md_file.stem),
                "size_bytes": size,
                "indexed_at": now,
            })
            existing_file_paths.add(rel_path_str)
            added_files += 1

        # Update the workspace's source_count to reflect current file count
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

    print(f"[built] {workspaces_file.relative_to(root)}")
    print(f"        {added_workspaces} new workspace(s), {len(workspaces_data['workspaces'])} total")
    print(f"[built] {master_index_file.relative_to(root)}")
    print(f"        {added_files} new file(s), {master_index_data['total_files']} total")
    print(f"\nRestart Scout (Ctrl+C then npm run dev) to see your data.")
    return 0


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
