# Graph roadmap — populating and walking Scout's concept graph

Handoff brief. This document carries the full state of the graph-architecture
work so any session (or human) can pick it up without the originating
conversation. Written 2026-07-21 on branch `claude/graph-tech-ai-coding-f9v6bq`.

## Where things stand

**The finding.** Scout's substrate already defines a knowledge graph —
`concepts.json` (nodes) and `concept-graph.json` (typed edges) — and the
reader fully supports it: `ConceptEdgeSchema` (`lib/schemas.ts`),
`listConceptEdges()` (`lib/dossier.ts`), and the concept page already unions
`related_concepts` with graph neighbors. **But nothing in the pipeline
generates these files.** `build-index.py` → workspaces + master index;
`segment.py` → segments; the chain stops there. The graph is
designed-but-unpopulated.

**The architectural fit.** GraphRAG's core split — model-assisted extraction
at *index* time, pure deterministic traversal at *read* time — is the same
split Scout's README already commits to ("no AI at runtime; ingesters and
agents are separate concerns"). Graph construction belongs with the
ingesters. The reader never changes its nature.

**Scout's edge (literally).** Because segments carry `start_line`/`end_line`,
Scout can do what mainstream GraphRAG cannot: give every *edge* line-level
provenance. **Evidence contract (confirmed with the dossier-system session,
CC-2A-R corrected):** the staleness system **detects and regenerates — it
never remaps**. `segments.json` records a content hash per source
(`source_hashes`); on source change the source is flagged stale and
`segment.py` *regenerates* its segments. Segment IDs (`<file_id>-sNNN`) are
deterministic but positional. What IS stable: conversion is deterministic
(same export → byte-identical markdown → identical segmentation), and for
Telegram appends only the tail segment(s) of an extended month file can
shift. Therefore the anchor tuple is:

`evidence: {segment, from_offset, to_offset, source_hash}` **plus the
verbatim quotation stored on the edge as its recovery key** (both stamped at
edge-creation time — copy the hash from `segments.json.source_hashes`).

Render-time algorithm: hash matches → resolve offsets
(`abs = segment.start_line + offset`; evidence must lie inside its segment)
and *derive* the displayed quote from the lines — display can never drift
while the anchor is valid. Hash mismatch → re-search the stored quotation
verbatim across the current segment set; found → **remap** the anchor;
not found → mark the edge **unverified** and render it visibly flagged.
Fast path = anchor; recovery path = quotation; failure mode = visible,
never silent — staleness becomes evidence-verification working as designed.
Curated substrates (the personal dossier) never auto-regenerate and use
append-style merges, so their anchors are *more* stable — same tuple, relying
on curation discipline rather than the hash cycle. `ConceptEdgeSchema` is
`.passthrough()`, so none of this needs a schema change. Requested from the
dossier session (their note 5, awaiting their checkpoint): `segment.py`
stamping each segment with its file's `source_hash`, making anchor creation
a field copy — **yes, wanted.**

**Built so far (this branch).**

- `prototypes/tracking/` — a clickable, self-contained prototype of the
  **Tracking** interface (open `tracking.html` in any browser). Demonstrates:
  edges-as-quotations (hover a connection → the verbatim sentence with
  `file · Lx–Ly · date`, with the source pane holding those lines), a radial
  *meaning-sorted* neighborhood (sector = relation type, distance = evidence
  weight, color+shape = workspace), a season scrubber (the graph as of a
  date), and paw-print trails that compile into Markdown bundles. Runs on a
  synthetic demo substrate; its README documents the rebuild and check steps.

## The phases

### Phase 1 — `scripts/build-graph.py` (deterministic, stdlib only) — **BUILT ✓**
Implemented and verified against a generated fixture dossier (expected edge
set produced exactly; pipeline `source_hashes` preferred; orphans reported).
Co-occurrence baseline: concepts sharing `source_segments` (or a source file)
get `co_occurs` edges with `evidence_segments` and a weight; prune edges with
fewer than 2 evidence segments. Follow `segment.py` conventions: stdlib only,
`generated_by` stamp, refuse to overwrite a file it didn't generate without
`--force`, idempotent re-runs. Output: `index/concept-graph.json`
(`{edges: [...]}` envelope).

### Phase 2 — graph-aware bundles (reader-side, deterministic) — **BUILT ✓**
`expandConcepts()` in `lib/dossier.ts`; opt-in "Include related · 1 hop"
checkbox in the Library Card panel (offered only when a graph exists and a
concept is pinned); bundles gain Related-concepts + Connections sections
with evidence refs, JSON bundles a structured `expansion` block.
Browser-verified end-to-end against the fixture dossier; non-expanded
bundles remain byte-identical to v1.
Add an `expandConcepts(seedIds, hops)` BFS to `lib/dossier.ts` (reuse
`listConceptEdges()`, which already enforces `ALLOWED_WORKSPACES`
transitively). In `compileLibraryCardAction`
(`app/actions/library-card.ts`), after the direct picks and before workspace
aggregation: optionally expand pinned concepts by 1 hop (opt-in checkbox),
pull the neighbors' `source_segments` into the bundle, and render a
**Connections** section listing each traversed edge with its evidence lines.
Default 1 hop; show a size preview; mark expanded content as such.

### Phase 3 — `scripts/extract-concepts.py` (model-assisted ingester)
The real GraphRAG indexing step, run offline against `segments.json`:
extract concepts + typed relations (closed vocabulary: `depends_on`,
`influences`, `contrasts_with`, `instance_of`, `co_occurs`, `evolved_into`)
with a verbatim `evidence_quote` per relation. **Verification gate:** an edge
survives only if its quote actually appears within its cited segment's lines
— hallucinated edges die before touching the substrate. Write to
`concepts-extracted.json` (the reader's `concepts*.json` glob-merge in
`listConcepts()` keeps hand-curated files authoritative). Extract
incrementally (hash segment bodies; skip unchanged). Batch-friendly.
Known hard part: **entity resolution** — persist merge decisions in a
mapping file so re-runs are stable.

### Phase 4 — communities and time
- Label propagation over the edge list at index time → `communities.json`
  ("territories" / themes; the global-sensemaking layer).
- Temporal layer: concepts inherit date ranges from their evidence
  (`source_date` is already written by `segment.py` for exactly this);
  `evolved_into` chains give "how my thinking changed," answerable with
  line-level receipts.

### Phase 5 — Tracking for real
A `/track/[id]` page porting the prototype onto the live substrate:
`lib/dossier.ts` for data, the existing `SourceWindow` as the Ground, the
existing deep-link convention (`/chats/[id]?from=N&to=M`) for click-through,
and trail-compile flowing through the Library Card / bundle machinery
(trails persist as an overlay file at the dossier root, like
`library-card.json`).

## Substrate contracts (per the dossier-system session)

Build against these; invent nothing the substrate hasn't shown:

- `index/concepts*.json` — merged concept registry (glob-merge, last-writer-wins)
- `index/concept-graph.json` — typed edges, `{edges: [...]}` envelope
- `index/segments.json` — segments, each carrying `source_date` (the time
  axis); also records `source_hashes` (content hash per source — the
  staleness signal anchors copy at creation time)
- `index/workspaces.json` — workspace registry
- `readSourceBody()` (`lib/dossier.ts`) — source text for the Ground
- `source_url` on catalog concepts — the external-provenance pattern
- Dossier-side design scrolls (not in this repo): the knowledge-graph-explorer
  and import/review-UI roadmaps under `workspaces/omegahive/scout-integration/`
  in the private substrate — consult via the dossier-system session or a
  compiled bundle.

**Vocabulary:** *territories* = **workspaces** (platform/thematic axis, node
color + shape). The rail's thematic concept clusters are **groves** — a
different axis (categories / communities). Multi-workspace chats need both
distinct.

## Forward: sender nodes (pending CC-2B)

When Telegram sources gain participant blocks with pseudonymous stable sender
IDs, senders become a second first-class node kind. Tracking renders them
with their own glyph; relations like `voiced_by` / `carried_between` join the
sector grammar; a walk can follow *who carried an idea between chats*, not
just what it touched — the axis that makes dialogue dynamics visible
(multi-bot groups, attractor work). Design consequence today: keep node kind
extensible in Phase 1/3 outputs (concepts now, senders later) and keep the
pseudonymous IDs as the only identity that ever enters the substrate.

## Operational notes

- **Code travels via git; data never does.** The real dossier lives at the
  user's `DOSSIER_ROOT`, outside this repo. Pipeline scripts get developed
  anywhere, but extraction runs against real data happen on the machine that
  holds it. Nothing personal is committed here (runtime overlays are already
  gitignored, including the `sample-dossier/` fallback's).
- **Determinism boundary is sacred.** Models may write substrate JSON
  offline; the reader only ever reads. Same substrate → same page.
- Prototype design notes (validated palettes, sector grammar, node
  shape-coding) live in `prototypes/tracking/README.md`.

## Sensible next actions

1. ~~Implement Phase 1 + 2~~ **done** — run them against a real dossier
   (`build-graph.py` then pin + compile with "Include related") and eyeball
   the graph on the concept pages.
2. Phase 3 (extract-concepts.py) behind it, gated by the verification pass.
3. Port Tracking (Phase 5) once real edges exist to walk.
4. Goertzel corpus demo ("the Goertzel Grove"): curated PDFs → pdftotext →
   `goertzel` workspace → segment → Phases 1+3 → Tracking + scout-to-metta
   export. Ben's own concepts, walkable, every edge his own words, loadable
   into a Hyperon AtomSpace with receipts.

## Appendix — research levers (vetted imports; sources quarantined)

Triage of external research notes (July 2026). Rule applied, and to be kept:
**import mathematical tools, quarantine cosmology.** Scout's identity is
checkable claims; speculative physics never enters the substrate as
assertions. Everything below is a deterministic, index-time capability.

Verified source: arXiv:2607.20157 (Cao–Lu–Zhao) — percolated
vertex-transitive graphs keep perfect matchings and near-optimal packings of
edge-disjoint 2-factors when average retained degree exceeds ~C·log n.
**Caveat that must travel with any use:** the theorems require
vertex-transitivity (perfect symmetry). Scout's concept graph is not
vertex-transitive, so the *questions and diagnostics* transplant; the
theorem constants do not.

1. **Percolation health diagnostics.** The verified-edge fraction after
   staleness events makes the concept graph literally a percolated graph.
   Report its survival state after re-segmentation sweeps: giant-component
   coverage, islands broken off, concepts below k verified crossings.
2. **Patrols (cycle covers).** 2-factors = closed trails visiting every
   concept. Auto-generate closed walking routes over a grove; edge-disjoint
   decompositions give independent patrols that never reuse a crossing.
   Extends the trail/harvest loop with plain cycle-decomposition theory.
3. **Ollivier–Ricci curvature.** Negative-curvature edges are bridges
   between communities; surface them as first-class "bridge crossings."
   (The honest version of the notes' "discrete curvature" lever.)
4. **Heat-kernel expansion (Phase-2 upgrade).** Heat-kernel / personalized-
   PageRank diffusion from pinned seeds as a graded relatedness score for
   bundle expansion, replacing blunt 1-hop when the graph is dense enough.
5. **Goertzel bridges** (pairs with the hive/swarm direction):
   - `scout-to-metta.py` — **BUILT ✓ AND RUNTIME-VERIFIED ✓** — exports
     concepts/edges/anchors as Atomese/MeTTa; every relation carries its
     `(evidence …)` segment-anchor. Verified against the real Hyperon
     runtime (`pip install hyperon`): the fixture export loaded into a
     MeTTa space and answered `!(match &self (co_occurs $a $b) ($a $b))`,
     workspace-filtered name queries, and evidence-anchor lookups. Scout is
     a working memory substrate with receipts for Hyperon agents today.
     Schema alignment with the consuming swarm still pending.
   - ECAN-style attention overlay (`attention.json`, overlay-only):
     importance spreading along verified edges from actively-walked
     concepts, with decay; drives Trailhead ordering. Substrate untouched.
   - Attractor analysis — now with a concrete algorithm: **the Chaos
     Language Algorithm (CLA)**, from Goertzel's implementation-oriented
     spec (chunks = repeated sequential blocks / "and-then" structure;
     meta-symbols = categories of contextually substitutable tokens /
     "one-of-these" structure; joint induction under a two-part MDL
     objective; the spec's appendix is written directly for coding agents).
     Scout-native Phase 1: **concept assignment IS the partition** — the
     spec allows a "problem-specific symbolic dynamics partition," and
     labeling each message/segment by its concepts symbolizes the dialogue
     trajectory with receipts intact. Then: chunk rules = a group's
     habitual conversational moves; meta-symbols = emergent categories
     (data-driven groves; a dynamics-based cousin of entity resolution);
     the induced grammar per chat/agent/epoch = its attractor signature;
     grammar drift across time windows = bifurcation tracking. Vocabulary:
     these are **waterholes** (basins the conversation returns to drink
     from) — third organizing axis after territories (workspaces) and
     groves (thematic clusters). Optional second track per Goertzel's
     Scout suggestion: message-embedding trajectories at ingest time
     (allowed — AI at ingest, deterministic at read), partitioned into
     cells as an alternative Phase 1. Also implementable and cheap:
     complex eigenvalues of the concept-transition matrix as oscillatory
     dialogue modes (the Ruelle–Pollicott-flavored "rhythm detector").
     Honesty rule, per Goertzel himself: finite dialogues give "strange
     transients rather than literal strange attractors" — we detect
     habitual patterns of cognitive change and never claim proven chaos.
     Segment-stream version buildable now; sender-resolved version
     unlocks with CC-2B.

Discarded (by decision, 2026-07-21): the surrounding speculative framework
(THTW tilts, pctonions, Planckflakes, ZPE foam, hexasphere cosmology, and
the unverified isomorphism chains). Generative reading, not substrate
material — revisit only if independently established.
