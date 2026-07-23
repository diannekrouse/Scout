// Demo substrate for the Scout "Tracking" prototype.
// All content is synthetic demo material derived from Scout's public README
// and the graph-architecture session notes. No personal data.
//
// PROVENANCE RULE (same as Scout's): edge quotations are never stored —
// they are DERIVED at runtime from {file, from, to} line ranges, so a quote
// can never drift from its source.

const L = (s) => s.split("\n");

export const DATA = {
  meta: {
    title: "Scout — Tracking",
    generated_by: "tracking-prototype v0 (demo substrate)",
    time_min: "2026-05-01",
    time_max: "2026-07-31",
  },

  workspaces: [
    { id: "scout-dev", name: "Scout Dev", color: "ws1" },
    { id: "claude-code", name: "Claude Code", color: "ws2" },
    { id: "voyager", name: "Voyager", color: "ws3" },
  ],

  sources: {
    "scout-design-notes": {
      file_id: "scout-design-notes",
      title: "Scout design notes — substrate and provenance",
      workspace: "scout-dev",
      date: "2026-05-12",
      path: "sources/scout-dev/2026-05-12-design-notes.md",
      lines: L(`# Scout design notes — substrate and provenance

**Date:** 2026-05-12 · **Workspace:** scout-dev

## Why line-level provenance

Most memory tools give you a chatbot that remembers things, but you cannot
see where those memories come from or check whether they are right.
Scout works differently: every claim traces back to the exact line in the
exact file it came from, so trust is checkable instead of assumed.
Line-level provenance is the property everything else in Scout depends on.

## The substrate

Workspaces, sources, concepts, and segments live in plain JSON files on
disk; the reader only reads them. Nothing is invented, nothing is hidden.
The reader stays deterministic because no model runs at read time —
the same substrate always renders the same page, offline, forever.
A deterministic reader is what makes the memory auditable rather than
merely retrievable.

## Workspaces as territories

Each workspace is a territory with its own color: scout-dev, voyager,
claude-code. Concepts can cross territories, and those crossings are
often where the interesting connections live.

## The Library Card

Pin what matters to your Library Card, compile a Markdown bundle, and
paste it into your next AI conversation so it has your full context.
A compiled bundle inlines each segment's actual lines, so the context
you hand to a model carries its own receipts.
The bundle is the harvest; the archive is the field.`),
    },

    "voyager-field-notes": {
      file_id: "voyager-field-notes",
      title: "Voyager field notes — memory you can check",
      workspace: "voyager",
      date: "2026-06-15",
      path: "sources/voyager/2026-06-15-field-notes.md",
      lines: L(`# Voyager field notes — memory you can check

**Date:** 2026-06-15 · **Workspace:** voyager

## Episode sketch: trustworthy memory

A memory system earns trust when every remembered claim can be opened
and read in its original context, line by line.
Provenance is not a feature of memory; it is what makes memory
trustworthy at all — the receipt is the memory.

## The trail idea

In 1945 Vannevar Bush imagined the memex: associative trails through a
personal archive, saved, revisited, and handed to someone else.
Eighty years later every tool has links and none has trails.
A trail is memory with a narrative: the order you walked through your
own thinking is itself part of what you know.
The memex trail is the missing interface for personal knowledge.`),
    },

    "graph-session": {
      file_id: "graph-session",
      title: "Graph session — mapping Scout to graph architectures",
      workspace: "claude-code",
      date: "2026-07-18",
      path: "sources/claude-code/2026-07-18-graph-session.md",
      lines: L(`# Graph session — mapping Scout to graph architectures

**Date:** 2026-07-18 · **Workspace:** claude-code

## The finding

Scout's substrate already defines a knowledge graph: concepts as nodes
and typed edges in concept-graph.json — but nothing builds it yet.
The concept graph is structurally a GraphRAG index with the
extraction step missing.

## GraphRAG, mapped

GraphRAG splits the work: a model extracts entities and relations at
index time, and query time is pure graph traversal.
That split matches Scout exactly — AI at ingest, deterministic at read.
GraphRAG depends on line-level provenance to become checkable: an edge
that cites its lines can be verified by a machine, not just believed.

## Building the graph

Co-occurrence is the deterministic baseline: concepts that share
evidence segments are related, no model required.
Co-occurrence evolved into full GraphRAG extraction once
evidence-verification could kill hallucinated edges on arrival.
Entity resolution is the quiet boss fight: "Scout", "the reader", and
"scout-reader" must resolve to one node or the graph fragments.
Entity-resolution failures are the main influence behind the hairball
problem — duplicate nodes multiply edges until structure drowns.

## Bundles get graph-aware

A pinned concept should arrive with its neighborhood: bundle compilation
expands one hop along the concept graph and carries the evidence lines
for every crossing it includes.
The graph turns the Library Card from a list into a map.`),
    },

    "tracking-sketch": {
      file_id: "tracking-sketch",
      title: "Tracking — an interface for walking the graph",
      workspace: "claude-code",
      date: "2026-07-18",
      path: "sources/claude-code/2026-07-18-tracking-sketch.md",
      lines: L(`# Tracking — an interface for walking the graph

**Date:** 2026-07-18 · **Workspace:** claude-code

## Against the hairball

The default graph interface is a force-directed hairball: it demos
well and is used never, because a thousand floating nodes answer no
real question.
The hairball problem contrasts with tracking: you never survey the
whole territory at once, you follow one trail at a time.

## Edges are quotations

An edge should not be a line labeled related-to; it should be the
verbatim sentence where two ideas touched, with its date and source.
Edges-as-quotations only works because line-level provenance can
resolve every crossing to the exact lines that evidence it.
Hover a connection and you are reading your own words; the graph is
made of the text, not floating above it.

## Time is a scrubber

Drag the season line and the neighborhood re-forms as of that date;
edges exist only once their evidence exists.
The temporal scrubber turns "when did I change my mind" from a
question into a scene you can watch.

## The trail is the artifact

Tracking records every crossing as a trail of paw prints, and the
trail compiles straight into a bundle: exploration and harvest are
the same motion.
The tracking interface is an instance of the memex trail, eighty
years late and finally walkable.`),
    },
  },

  segments: [
    { segment_id: "sdn-s001", file_id: "scout-design-notes", start_line: 5,  end_line: 11, title: "Why line-level provenance" },
    { segment_id: "sdn-s002", file_id: "scout-design-notes", start_line: 13, end_line: 20, title: "The substrate" },
    { segment_id: "sdn-s003", file_id: "scout-design-notes", start_line: 22, end_line: 34, title: "Territories and the Library Card" },
    { segment_id: "voy-s001", file_id: "voyager-field-notes", start_line: 5,  end_line: 10, title: "Trustworthy memory" },
    { segment_id: "voy-s002", file_id: "voyager-field-notes", start_line: 12, end_line: 19, title: "The trail idea" },
    { segment_id: "gs-s001",  file_id: "graph-session", start_line: 5,  end_line: 10, title: "The finding" },
    { segment_id: "gs-s002",  file_id: "graph-session", start_line: 12, end_line: 18, title: "GraphRAG, mapped" },
    { segment_id: "gs-s003",  file_id: "graph-session", start_line: 20, end_line: 29, title: "Building the graph" },
    { segment_id: "gs-s004",  file_id: "graph-session", start_line: 31, end_line: 36, title: "Bundles get graph-aware" },
    { segment_id: "ts-s001",  file_id: "tracking-sketch", start_line: 5,  end_line: 11, title: "Against the hairball" },
    { segment_id: "ts-s002",  file_id: "tracking-sketch", start_line: 13, end_line: 20, title: "Edges are quotations" },
    { segment_id: "ts-s003",  file_id: "tracking-sketch", start_line: 22, end_line: 27, title: "Time is a scrubber" },
    { segment_id: "ts-s004",  file_id: "tracking-sketch", start_line: 29, end_line: 35, title: "The trail is the artifact" },
  ],

  concepts: [
    { concept_id: "line-level-provenance", name: "Line-level provenance", category: "architecture",
      workspace: "scout-dev", summary: "Every claim traces to the exact line in the exact file it came from. The property everything else depends on.",
      source_segments: ["sdn-s001"], },
    { concept_id: "deterministic-reader", name: "Deterministic reader", category: "architecture",
      workspace: "scout-dev", summary: "No model runs at read time: the same substrate always renders the same page, offline, forever.",
      source_segments: ["sdn-s002"], },
    { concept_id: "workspaces", name: "Workspaces as territories", category: "structure",
      workspace: "scout-dev", summary: "Each workspace is a colored territory; cross-territory connections are where the interesting edges live.",
      source_segments: ["sdn-s003"], },
    { concept_id: "library-card-bundles", name: "Library Card & bundles", category: "feature",
      workspace: "scout-dev", summary: "Pin what matters, compile a Markdown bundle with inlined lines, paste it into your next AI conversation.",
      source_segments: ["sdn-s003", "gs-s004"], },
    { concept_id: "trustworthy-memory", name: "Trustworthy memory", category: "idea",
      workspace: "voyager", summary: "Memory earns trust when every remembered claim can be opened and read in its original context.",
      source_segments: ["voy-s001"], },
    { concept_id: "memex-trails", name: "Memex trails", category: "idea",
      workspace: "voyager", summary: "Bush, 1945: associative trails through a personal archive — saved, revisited, handed to someone else.",
      source_segments: ["voy-s002"], },
    { concept_id: "concept-graph", name: "Concept graph", category: "architecture",
      workspace: "claude-code", summary: "concept-graph.json: typed edges between concepts. Defined in the substrate, waiting to be built.",
      source_segments: ["gs-s001"], },
    { concept_id: "graphrag", name: "GraphRAG", category: "method",
      workspace: "claude-code", summary: "Extract entities and relations at index time; answer at query time by pure graph traversal.",
      source_segments: ["gs-s002"], },
    { concept_id: "co-occurrence", name: "Co-occurrence edges", category: "method",
      workspace: "claude-code", summary: "The deterministic baseline: concepts that share evidence segments are related. No model required.",
      source_segments: ["gs-s003"], },
    { concept_id: "evidence-verification", name: "Evidence verification", category: "method",
      workspace: "claude-code", summary: "An edge survives only if its quoted evidence actually appears at the lines it cites.",
      source_segments: ["gs-s003"], },
    { concept_id: "entity-resolution", name: "Entity resolution", category: "method",
      workspace: "claude-code", summary: "The quiet boss fight: many surface names, one node — or the graph fragments.",
      source_segments: ["gs-s003"], },
    { concept_id: "hairball-problem", name: "The hairball problem", category: "risk",
      workspace: "claude-code", summary: "Force-directed everything-at-once: demos well, used never. A graph you look at instead of walk.",
      source_segments: ["ts-s001"], },
    { concept_id: "tracking-interface", name: "Tracking interface", category: "interface",
      workspace: "claude-code", summary: "Follow one trail at a time, on the ground, reading the prints. This prototype.",
      source_segments: ["ts-s001", "ts-s004"], },
    { concept_id: "edges-as-quotations", name: "Edges as quotations", category: "interface",
      workspace: "claude-code", summary: "An edge is the verbatim sentence where two ideas touched — with date, source, and lines.",
      source_segments: ["ts-s002"], },
    { concept_id: "temporal-scrubber", name: "Temporal scrubber", category: "interface",
      workspace: "claude-code", summary: "Drag the season line; the neighborhood re-forms as of that date. Change of mind becomes a scene.",
      source_segments: ["ts-s003"], },
  ],

  // Edge types and their radial sectors are defined in the app.
  //
  // PROVENANCE CONTRACT (per dossier-system note CC-2A-R): evidence anchors to
  // a SEGMENT ID, never a loose file+line pair — segments are the protected
  // provenance unit; absolute line ranges drift when sources update.
  // `from_offset`/`to_offset` are 0-based line offsets WITHIN the segment
  // (offset 0 = the segment's start_line), resolved to absolute lines at
  // render time. An edge's evidence must lie entirely inside its segment.
  edges: [
    { from: "graphrag", to: "line-level-provenance", type: "depends_on",
      evidence: { segment: "gs-s002", from_offset: 5, to_offset: 6 }, date: "2026-07-18" },
    { from: "trustworthy-memory", to: "line-level-provenance", type: "depends_on",
      evidence: { segment: "voy-s001", from_offset: 4, to_offset: 5 }, date: "2026-06-15" },
    { from: "deterministic-reader", to: "trustworthy-memory", type: "influences",
      evidence: { segment: "sdn-s002", from_offset: 6, to_offset: 7 }, date: "2026-05-12" },
    { from: "library-card-bundles", to: "line-level-provenance", type: "depends_on",
      evidence: { segment: "sdn-s003", from_offset: 10, to_offset: 11 }, date: "2026-05-12" },
    { from: "concept-graph", to: "graphrag", type: "instance_of",
      evidence: { segment: "gs-s001", from_offset: 4, to_offset: 5 }, date: "2026-07-18" },
    { from: "graphrag", to: "deterministic-reader", type: "co_occurs",
      evidence: { segment: "gs-s002", from_offset: 4, to_offset: 4 }, date: "2026-07-18" },
    { from: "co-occurrence", to: "graphrag", type: "evolved_into",
      evidence: { segment: "gs-s003", from_offset: 4, to_offset: 5 }, date: "2026-07-18" },
    { from: "evidence-verification", to: "graphrag", type: "influences",
      evidence: { segment: "gs-s003", from_offset: 4, to_offset: 5 }, date: "2026-07-18" },
    { from: "entity-resolution", to: "hairball-problem", type: "influences",
      evidence: { segment: "gs-s003", from_offset: 8, to_offset: 9 }, date: "2026-07-18" },
    { from: "hairball-problem", to: "tracking-interface", type: "contrasts_with",
      evidence: { segment: "ts-s001", from_offset: 5, to_offset: 6 }, date: "2026-07-18" },
    { from: "edges-as-quotations", to: "line-level-provenance", type: "depends_on",
      evidence: { segment: "ts-s002", from_offset: 4, to_offset: 5 }, date: "2026-07-18" },
    { from: "tracking-interface", to: "edges-as-quotations", type: "depends_on",
      evidence: { segment: "ts-s002", from_offset: 2, to_offset: 5 }, date: "2026-07-18" },
    { from: "temporal-scrubber", to: "tracking-interface", type: "co_occurs",
      evidence: { segment: "ts-s003", from_offset: 2, to_offset: 3 }, date: "2026-07-18" },
    { from: "tracking-interface", to: "memex-trails", type: "instance_of",
      evidence: { segment: "ts-s004", from_offset: 5, to_offset: 6 }, date: "2026-07-18" },
    { from: "tracking-interface", to: "library-card-bundles", type: "influences",
      evidence: { segment: "ts-s004", from_offset: 2, to_offset: 4 }, date: "2026-07-18" },
    { from: "library-card-bundles", to: "concept-graph", type: "depends_on",
      evidence: { segment: "gs-s004", from_offset: 2, to_offset: 4 }, date: "2026-07-18" },
    // STALE-ANCHOR DEMO: hash will never match and the stored quotation
    // exists in no current source, so this edge renders UNVERIFIED — the
    // failure mode made visible, never silent. (build.mjs skips stamping.)
    { from: "temporal-scrubber", to: "trustworthy-memory", type: "influences",
      evidence: { segment: "voy-s001", from_offset: 2, to_offset: 3, source_hash: "fnv1a:00000000" },
      quote: "The scrubber proves memory can be replayed without being rewritten.",
      date: "2026-06-15", stale_demo: true },
  ],

  // Vocabulary (per dossier-system note): "territories" = WORKSPACES
  // (platform/thematic axis). The rail's thematic concept clusters are
  // GROVES — clusters of trees on the savanna, a different axis entirely.
  groves: [
    { id: "provenance", name: "Provenance & trust",
      concepts: ["line-level-provenance", "deterministic-reader", "trustworthy-memory", "evidence-verification"] },
    { id: "building", name: "Building the graph",
      concepts: ["concept-graph", "graphrag", "co-occurrence", "entity-resolution", "hairball-problem", "workspaces"] },
    { id: "walking", name: "Walking & harvest",
      concepts: ["tracking-interface", "edges-as-quotations", "temporal-scrubber", "memex-trails", "library-card-bundles"] },
  ],
};
