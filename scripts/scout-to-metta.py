#!/usr/bin/env python3
"""
Scout → MeTTa/AtomSpace exporter (v0 draft schema).

Exports the Scout substrate — workspaces, sources, segments, concepts, and
the concept graph — as MeTTa S-expressions so an OpenCog Hyperon agent can
load Scout as a provenance-grounded AtomSpace. Every relation atom carries
its evidence anchor as metadata, so downstream reasoning can always cite
(and re-verify) the exact lines a claim came from.

This is Scout's read-only philosophy extended to agents: the exporter is an
ingester-style script (deterministic, offline, stdlib-only); the reader is
untouched; the .metta file is a derived artifact under <root>/exports/.

Schema v0 (subject to alignment with the consuming swarm's conventions):

    (: <concept_id> ScoutConcept)
    (concept-name <concept_id> "Human name")
    (concept-category <concept_id> <category>)
    (in-workspace <concept_id> <workspace_id>)
    (concept-summary <concept_id> "…")
    (evidenced-by <concept_id> <segment_id>)

    (: <segment_id> ScoutSegment)
    (segment-of <segment_id> <file_id>)
    (segment-lines <segment_id> <start_line> <end_line>)
    (segment-date <segment_id> "YYYY-MM-DD")
    (segment-title <segment_id> "…")

    (: <file_id> ScoutSource)
    (source-path <file_id> "sources/…")
    (source-date <file_id> "YYYY-MM-DD")
    (source-hash <file_id> "sha256:…")

    (<relation> <from_id> <to_id>)                     ; e.g. (co_occurs a b)
    (edge-weight (<relation> <from> <to>) <n>)
    (edge-date (<relation> <from> <to>) "YYYY-MM-DD")
    (evidence (<relation> <from> <to>)
              (segment-anchor <segment_id> <from_offset> <to_offset> "<source_hash>"))
    (edge-quote (<relation> <from> <to>) "verbatim recovery key")

Example queries once loaded into an AtomSpace:

    !(match &self (co_occurs $a $b) ($a $b))
    !(match &self (, (in-workspace $c voyager) (concept-name $c $n)) $n)
    !(match &self (evidence (co_occurs $a $b) $anchor) ($a $b $anchor))

Usage:
    python3 scripts/scout-to-metta.py --dossier-root "$DOSSIER_ROOT"
    python3 scripts/scout-to-metta.py --dossier-root "$DOSSIER_ROOT" --output out.metta

No external dependencies (Python standard library only).
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


GENERATED_BY = "scout scripts/scout-to-metta.py (schema v0)"


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def as_array(raw, key):
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict) and isinstance(raw.get(key), list):
        return raw[key]
    return []


def load_concepts(index_dir):
    merged = {}
    for path in sorted(index_dir.glob("concepts*.json")):
        for c in as_array(load_json(path), "concepts"):
            if c.get("concept_id"):
                merged[c["concept_id"]] = c
    return list(merged.values())


def sym(s):
    """Sanitize an id into a bare MeTTa symbol (slugs mostly pass through)."""
    s = str(s)
    out = re.sub(r"[^\w.\-]", "-", s)
    return out or "unknown"


def lit(s):
    """Quote a string literal, escaping backslashes and double quotes."""
    s = str(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return f'"{s}"'


def export(dossier_root, output):
    root = Path(dossier_root).expanduser().resolve()
    index_dir = root / "index"

    workspaces = as_array(load_json(index_dir / "workspaces.json"), "workspaces")
    files = as_array(load_json(index_dir / "master-index.json"), "files")
    seg_raw = load_json(index_dir / "segments.json")
    segments = as_array(seg_raw, "segments")
    concepts = load_concepts(index_dir)
    graph_raw = load_json(index_dir / "concept-graph.json")
    edges = as_array(graph_raw, "edges")

    if not concepts:
        print(f"[error] no concepts under {index_dir} — nothing to export.")
        return 1

    source_hashes = {}
    if isinstance(seg_raw, dict) and isinstance(seg_raw.get("source_hashes"), dict):
        source_hashes = seg_raw["source_hashes"]

    L = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    L.append(f"; Scout substrate export — provenance-grounded AtomSpace material")
    L.append(f"; generated {now} by {GENERATED_BY}")
    L.append(f"; dossier: {root}")
    L.append(f"; Every relation carries a (evidence …) anchor: segment + intra-segment")
    L.append(f"; offsets + source hash. A hash mismatch means the anchor is stale —")
    L.append(f"; re-verify against the substrate before trusting the claim.")
    L.append("")

    L.append("; ---- workspaces ----")
    for w in workspaces:
        if not w.get("id"):
            continue
        L.append(f"(: {sym(w['id'])} ScoutWorkspace)")
        if w.get("name"):
            L.append(f"(workspace-name {sym(w['id'])} {lit(w['name'])})")
    L.append("")

    L.append("; ---- sources ----")
    for f in files:
        fid = f.get("file_id")
        if not fid:
            continue
        L.append(f"(: {sym(fid)} ScoutSource)")
        if f.get("path"):
            L.append(f"(source-path {sym(fid)} {lit(f['path'])})")
        if f.get("date_detected"):
            L.append(f"(source-date {sym(fid)} {lit(f['date_detected'])})")
        if fid in source_hashes:
            L.append(f"(source-hash {sym(fid)} {lit(source_hashes[fid])})")
    L.append("")

    L.append("; ---- segments (the provenance units) ----")
    for s in segments:
        sid = s.get("segment_id")
        if not sid:
            continue
        L.append(f"(: {sym(sid)} ScoutSegment)")
        if s.get("file_id"):
            L.append(f"(segment-of {sym(sid)} {sym(s['file_id'])})")
        if isinstance(s.get("start_line"), int) and isinstance(s.get("end_line"), int):
            L.append(f"(segment-lines {sym(sid)} {s['start_line']} {s['end_line']})")
        if s.get("source_date"):
            L.append(f"(segment-date {sym(sid)} {lit(s['source_date'])})")
        if s.get("title"):
            L.append(f"(segment-title {sym(sid)} {lit(s['title'])})")
    L.append("")

    L.append("; ---- concepts ----")
    for c in concepts:
        cid = sym(c["concept_id"])
        L.append(f"(: {cid} ScoutConcept)")
        if c.get("name"):
            L.append(f"(concept-name {cid} {lit(c['name'])})")
        if c.get("category"):
            L.append(f"(concept-category {cid} {sym(c['category'])})")
        if c.get("primary_workspace"):
            L.append(f"(in-workspace {cid} {sym(c['primary_workspace'])})")
        if c.get("summary"):
            L.append(f"(concept-summary {cid} {lit(c['summary'])})")
        for sid in c.get("source_segments") or []:
            L.append(f"(evidenced-by {cid} {sym(sid)})")
    L.append("")

    L.append("; ---- concept graph (typed relations with anchored evidence) ----")
    n_ev = 0
    for e in edges:
        a, b = e.get("from"), e.get("to")
        rel = e.get("type") or e.get("relation") or "related_to"
        if not a or not b:
            continue
        head = f"({sym(rel)} {sym(a)} {sym(b)})"
        L.append(head)
        if isinstance(e.get("weight"), (int, float)):
            L.append(f"(edge-weight {head} {e['weight']})")
        if e.get("date"):
            L.append(f"(edge-date {head} {lit(e['date'])})")
        evs = e.get("evidence")
        if isinstance(evs, dict):
            evs = [evs]
        for ev in evs or []:
            if not isinstance(ev, dict) or not ev.get("segment"):
                continue
            anchor = (f"(segment-anchor {sym(ev['segment'])} "
                      f"{ev.get('from_offset', 0)} {ev.get('to_offset', 0)} "
                      f"{lit(ev.get('source_hash', ''))})")
            L.append(f"(evidence {head} {anchor})")
            n_ev += 1
        if e.get("quote"):
            L.append(f"(edge-quote {head} {lit(e['quote'])})")
    L.append("")

    out_path = Path(output) if output else root / "exports" / "scout.metta"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(L) + "\n", encoding="utf-8")

    print(f"[built] {out_path}")
    print(f"        {len(concepts)} concepts, {len(segments)} segments, "
          f"{len(edges)} relations, {n_ev} evidence anchors, "
          f"{len(workspaces)} workspaces, {len(files)} sources")
    print(f"\nLoad into Hyperon (illustrative):")
    print(f"    !(import! &self {out_path.name})")
    print(f"    !(match &self (co_occurs $a $b) ($a $b))")
    return 0


def main():
    p = argparse.ArgumentParser(description="Export the Scout substrate as MeTTa for Hyperon/AtomSpace.")
    p.add_argument("--dossier-root", default=".", help="Path to dossier root containing index/")
    p.add_argument("--output", default=None, help="Output path (default: <root>/exports/scout.metta)")
    args = p.parse_args()
    if not str(args.dossier_root or "").strip():
        print("[error] --dossier-root is empty. Set $DOSSIER_ROOT first.")
        return 1
    return export(args.dossier_root, args.output)


if __name__ == "__main__":
    raise SystemExit(main())
