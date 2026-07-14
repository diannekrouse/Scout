#!/usr/bin/env python3
"""
Curated-catalog CSV to Scout substrate converter.

Turns a hand-curated research catalog (a spreadsheet where each row is one
idea/paper/prototype with a summary, verbatim excerpt, source link, tags,
contributors, and status) into a Scout workspace:

  - one markdown source file per row  -> sources/<workspace>/<slug>.md
  - one concept entry per row         -> index/concepts-<workspace>.json

The excerpt becomes readable source material (so Scout's source window and
line-level provenance work), and the original thread permalink is preserved
on both the source file and the concept as the external provenance pointer.

Get the CSV from Google Sheets:
    File > Download > Comma Separated Values (.csv)  (downloads the active tab)

Expected columns (extra columns are preserved as passthrough fields;
missing columns are simply skipped):

    Tiers (Filter), title_or_label, Topic, item_type,
    MVP or Future Feature / Idea, Summary, Status, Ben_input,
    Contributors, Source_links, mattermost_exerpt, Follow_up,
    tags, Date Surfaced

Usage:
    python3 catalog-to-md.py catalog.csv --dossier-root "$DOSSIER_ROOT" \\
        --workspace researcher-catalog

Then run the standard pipeline:
    python3 build-index.py --dossier-root "$DOSSIER_ROOT"
    python3 segment.py     --dossier-root "$DOSSIER_ROOT"

Re-running is safe: the converter fully regenerates its own workspace's
source files and concepts file from the CSV each time (the CSV is the
source of truth). It never touches other workspaces' files.

No external dependencies (Python standard library only).
"""

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


GENERATED_BY = "scout scripts/catalog-to-md.py"

COL = {
    "tier": "Tiers (Filter)",
    "title": "title_or_label",
    "topic": "Topic",
    "item_type": "item_type",
    "mvp_or_future": "MVP or Future Feature / Idea",
    "summary": "Summary",
    "status": "Status",
    "ben_input": "Ben_input",
    "contributors": "Contributors",
    "source_links": "Source_links",
    "excerpt": "mattermost_exerpt",
    "follow_up": "Follow_up",
    "tags": "tags",
    "date_surfaced": "Date Surfaced",
}


def safe_slug(name):
    slug = re.sub(r"[^\w\s-]", "", name or "").strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug[:60] or "untitled"


def parse_tags(raw):
    """Tags may be separated by newlines, commas, or semicolons."""
    if not raw:
        return []
    parts = re.split(r"[\n,;]+", raw)
    return [p.strip() for p in parts if p.strip()]


def clean(value):
    return (value or "").strip()


def build_markdown(row):
    """One catalog row -> one markdown source document."""
    title = clean(row.get(COL["title"])) or "Untitled entry"
    lines = [f"# {title}", ""]

    meta_pairs = [
        ("Tier", clean(row.get(COL["tier"]))),
        ("Topic", clean(row.get(COL["topic"]))),
        ("Item type", clean(row.get(COL["item_type"]))),
        ("Status", clean(row.get(COL["status"]))),
        ("Contributors", clean(row.get(COL["contributors"]))),
        ("Date surfaced", clean(row.get(COL["date_surfaced"]))),
        ("Source", clean(row.get(COL["source_links"]))),
    ]
    for label, value in meta_pairs:
        if value:
            lines.append(f"**{label}:** {value}")
    lines.append("")
    lines.append("---")
    lines.append("")

    sections = [
        ("Summary", clean(row.get(COL["summary"]))),
        ("MVP or future direction", clean(row.get(COL["mvp_or_future"]))),
        ("Excerpt (verbatim from source thread)", None),  # handled below
        ("Ben's input", clean(row.get(COL["ben_input"]))),
        ("Follow-up", clean(row.get(COL["follow_up"]))),
    ]
    excerpt = clean(row.get(COL["excerpt"]))

    for heading, body in sections:
        if heading.startswith("Excerpt"):
            if excerpt:
                lines.append(f"## {heading}")
                lines.append("")
                for para in excerpt.split("\n"):
                    lines.append(f"> {para}" if para.strip() else ">")
                lines.append("")
            continue
        if body:
            lines.append(f"## {heading}")
            lines.append("")
            lines.append(body)
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def convert(csv_path, dossier_root, workspace):
    csv_path = Path(csv_path).expanduser().resolve()
    root = Path(dossier_root).expanduser().resolve()

    sources_dir = root / "sources" / workspace
    index_dir = root / "index"
    sources_dir.mkdir(parents=True, exist_ok=True)
    index_dir.mkdir(parents=True, exist_ok=True)

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if clean(r.get(COL["title"]))]

    if not rows:
        print(f"[error] No rows with a '{COL['title']}' value found in {csv_path}")
        return 1

    concepts = []
    seen_slugs = {}
    written = 0

    for row in rows:
        title = clean(row.get(COL["title"]))
        slug = safe_slug(title)
        # Disambiguate duplicate titles
        if slug in seen_slugs:
            seen_slugs[slug] += 1
            slug = f"{slug}-{seen_slugs[slug]}"
        else:
            seen_slugs[slug] = 1

        md_path = sources_dir / f"{slug}.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(build_markdown(row))
        written += 1

        # file_id as build-index.py derives it: path relative to sources/, slashes->dashes
        file_id = f"{workspace}-{slug}"
        segment_id = f"{file_id}-s001"

        concept = {
            "concept_id": slug,
            "name": title,
            "category": clean(row.get(COL["tier"])) or None,
            "primary_workspace": workspace,
            "workspace_secondary": [],
            "summary": clean(row.get(COL["summary"])) or None,
            "source_segments": [segment_id],
            "related_concepts": [],
            "tags": parse_tags(row.get(COL["tags"])),
            "lifecycle": "active",
            # Passthrough provenance and curation fields (reader-safe extras)
            "source_url": clean(row.get(COL["source_links"])) or None,
            "topic": clean(row.get(COL["topic"])) or None,
            "item_type": clean(row.get(COL["item_type"])) or None,
            "status": clean(row.get(COL["status"])) or None,
            "contributors": clean(row.get(COL["contributors"])) or None,
            "date_surfaced": clean(row.get(COL["date_surfaced"])) or None,
        }
        concepts.append(concept)

    concepts_path = index_dir / f"concepts-{workspace}.json"
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_by": GENERATED_BY,
        "source_csv": csv_path.name,
        "concepts": concepts,
    }
    with open(concepts_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"[wrote] {sources_dir}")
    print(f"        {written} source file(s) from {len(rows)} catalog row(s)")
    print(f"[wrote] {concepts_path.relative_to(root)}")
    print(f"        {len(concepts)} concept(s)")
    print()
    print(f"Next steps:")
    print(f"  python3 scripts/build-index.py --dossier-root \"{root}\"")
    print(f"  python3 scripts/segment.py     --dossier-root \"{root}\"")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Convert a curated catalog CSV into a Scout workspace (sources + concepts)."
    )
    parser.add_argument("csv_path", help="Path to the catalog CSV (Google Sheets: File > Download > CSV)")
    parser.add_argument(
        "--dossier-root",
        required=True,
        help="Path to the dossier root",
    )
    parser.add_argument(
        "--workspace",
        default="researcher-catalog",
        help="Workspace ID for the catalog (default: researcher-catalog)",
    )
    args = parser.parse_args()

    if not str(args.dossier_root or "").strip():
        print("[error] --dossier-root is empty. Set $DOSSIER_ROOT in your shell first:")
        print("          export DOSSIER_ROOT=/absolute/path/to/your/data")
        return 1

    return convert(args.csv_path, args.dossier_root, safe_slug(args.workspace)) or 0


if __name__ == "__main__":
    raise SystemExit(main())
