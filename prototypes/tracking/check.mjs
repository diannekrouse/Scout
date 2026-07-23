// Integrity check for the demo substrate — the prototype's own
// evidence-verification pass. Fails loudly on any dangling reference or
// out-of-range evidence; prints every derived quotation for review.
import { DATA } from "./data.mjs";

let errors = 0;
const err = (m) => { errors++; console.error("  ✗ " + m); };

const conceptIds = new Set(DATA.concepts.map((c) => c.concept_id));
const segIds = new Set(DATA.segments.map((s) => s.segment_id));
const wsIds = new Set(DATA.workspaces.map((w) => w.id));

// Sources & segments
for (const [id, src] of Object.entries(DATA.sources)) {
  if (src.file_id !== id) err(`source key ${id} != file_id ${src.file_id}`);
  if (!wsIds.has(src.workspace)) err(`source ${id}: unknown workspace ${src.workspace}`);
  if (!src.lines.length) err(`source ${id}: empty`);
}
for (const s of DATA.segments) {
  const src = DATA.sources[s.file_id];
  if (!src) { err(`segment ${s.segment_id}: unknown file ${s.file_id}`); continue; }
  if (s.start_line < 1 || s.end_line > src.lines.length || s.start_line > s.end_line)
    err(`segment ${s.segment_id}: range ${s.start_line}-${s.end_line} outside 1-${src.lines.length}`);
}

// Concepts
for (const c of DATA.concepts) {
  if (!wsIds.has(c.workspace)) err(`concept ${c.concept_id}: unknown workspace`);
  for (const sg of c.source_segments)
    if (!segIds.has(sg)) err(`concept ${c.concept_id}: unknown segment ${sg}`);
}

// Groves cover every concept exactly once
const covered = new Map();
for (const t of DATA.groves)
  for (const cid of t.concepts) {
    if (!conceptIds.has(cid)) err(`grove ${t.id}: unknown concept ${cid}`);
    covered.set(cid, (covered.get(cid) || 0) + 1);
  }
for (const cid of conceptIds)
  if ((covered.get(cid) || 0) !== 1) err(`concept ${cid} covered ${covered.get(cid) || 0} times by groves`);

// Edges — endpoints exist; evidence is SEGMENT-ANCHORED (the provenance
// contract): segment exists, offsets lie inside the segment, resolved
// absolute lines lie inside the file, quote derivable.
const segMap = new Map(DATA.segments.map((s) => [s.segment_id, s]));
console.log("\n=== Derived edge quotations (review each for sense) ===\n");
for (const e of DATA.edges) {
  if (!conceptIds.has(e.from)) err(`edge: unknown from ${e.from}`);
  if (!conceptIds.has(e.to)) err(`edge: unknown to ${e.to}`);
  if (e.stale_demo) {
    if (!e.quote) err(`stale-demo edge ${e.from}->${e.to}: missing stored quote (the recovery key)`);
    if (!e.evidence.source_hash) err(`stale-demo edge ${e.from}->${e.to}: missing source_hash`);
    console.log(`[${e.type}] ${e.from} → ${e.to}`);
    console.log(`  STALE DEMO — anchor intentionally invalid; renders UNVERIFIED via recovery path\n`);
    continue;
  }
  const seg = segMap.get(e.evidence.segment);
  if (!seg) { err(`edge ${e.from}->${e.to}: unknown evidence segment ${e.evidence.segment}`); continue; }
  const src = DATA.sources[seg.file_id];
  const { from_offset, to_offset } = e.evidence;
  if (from_offset < 0 || from_offset > to_offset) {
    err(`edge ${e.from}->${e.to}: bad offsets ${from_offset}-${to_offset}`); continue;
  }
  const from = seg.start_line + from_offset, to = seg.start_line + to_offset;
  if (to > seg.end_line) {
    err(`edge ${e.from}->${e.to}: evidence L${from}-L${to} escapes segment ${seg.segment_id} (${seg.start_line}-${seg.end_line})`);
    continue;
  }
  if (to > src.lines.length) { err(`edge ${e.from}->${e.to}: resolved lines exceed file`); continue; }
  const quote = src.lines.slice(from - 1, to).join(" ").replace(/\s+/g, " ").trim();
  if (!quote) err(`edge ${e.from}->${e.to}: empty quote`);
  console.log(`[${e.type}] ${e.from} → ${e.to}`);
  console.log(`  ${seg.segment_id} → ${src.file_id} L${from}–L${to} (${e.date})`);
  console.log(`  “${quote}”\n`);
}

// Date sanity
for (const e of DATA.edges) {
  if (e.stale_demo) continue;
  const seg = segMap.get(e.evidence.segment);
  const srcDate = seg ? DATA.sources[seg.file_id]?.date : null;
  if (srcDate && e.date !== srcDate) err(`edge ${e.from}->${e.to}: date ${e.date} != source date ${srcDate}`);
}

console.log(errors ? `\n${errors} ERROR(S)` : "\nAll checks passed ✓");
console.log(`concepts=${DATA.concepts.length} edges=${DATA.edges.length} segments=${DATA.segments.length} sources=${Object.keys(DATA.sources).length}`);
process.exit(errors ? 1 : 0);
