# Tracking — a prototype interface for walking the concept graph

A single-file, clickable prototype of the **Tracking** interface: explore the
concept graph the way a scout tracks — one trail at a time, on the ground,
reading the prints. No dependencies, no build step needed to view; open
`tracking.html` in any browser.

## What it demonstrates

- **Edges are quotations.** Hover any connection (or table row) and you read
  the verbatim sentence where two ideas touched — never stored, always
  derived. Evidence anchors to a **segment_id + intra-segment line offsets**
  (`{segment, from_offset, to_offset}`), resolved to absolute lines at render
  time: segments are the protected provenance contract (they survive source
  updates via the pipeline's content-hash staleness system), while offsets
  keep quotations line-precise. A quote can never drift from its source.
- **The Track view.** One concept at center; neighbors fan out radially,
  sorted by *meaning*, not physics — angular sector = relation type
  (depends on ↑, evolved into →, contrasts with ←, …), distance = evidence
  weight, color + shape = workspace. Deterministic layout: same substrate,
  same scene.
- **The Ground.** A docked source window keeps the evidence lines highlighted
  and in view. Claim to receipt is one gesture, always.
- **The season scrubber.** Drag it and the neighborhood re-forms as of that
  date — edges exist only once their evidence exists. Recent crossings carry
  a faint gold "fresh spoor" glow.
- **The trail is the artifact.** Every walk lays a paw print (no claw ticks —
  leopard, not cheetah). *Compile trail* turns your walked path into a
  Markdown bundle, each step carrying its crossing quotation and line refs —
  the Memex trail, wired into Scout's bundle idea.
- Light/dark (day / night-tracking) themes, keyboard walking (Enter to walk,
  Backspace to retrace), a table twin of the Track view, URL-addressable
  state (`#c=<concept>&t=<date>&v=track|list`).

## Vocabulary

Two clustering axes, two names — they are different things:

- **Territories = workspaces** (the platform/thematic axis: scout-dev,
  voyager, claude-code). Encoded as node color + shape; named in the legend.
- **Groves = thematic concept clusters** (the Trailhead rail's groupings —
  clusters of trees on the savanna). In the real substrate these come from
  concept categories / community detection, not from workspaces.

## Forward: sender nodes (pending CC-2B)

Once Telegram sources carry participant blocks with pseudonymous stable
sender IDs, the graph gains a second node kind: **senders**. Tracking would
render them with their own glyph, and a walk could follow not just what an
idea touched but *who carried it between chats* — the axis that makes
dialogue dynamics (multi-bot groups, attractor work) visible. Nothing in the
current layout precludes it: senders are one more shape in the legend and one
more relation family (`voiced_by`, `carried_between`) in the sector grammar.

## Files

| File | Role |
|---|---|
| `tracking.html` | The built, self-contained prototype (open this) |
| `data.mjs` | Demo substrate: sources, segments, concepts, edges w/ evidence line ranges |
| `template.html` | Markup + savanna design tokens (light/dark) |
| `app.mjs` | Interaction logic |
| `build.mjs` | Inlines data + app into the template → `tracking.html` |
| `check.mjs` | Substrate integrity check — verifies every evidence range resolves |
| `smoke.mjs` | Browser smoke test (needs `npm i playwright-core` + a Chromium path) |

Rebuild after editing: `node check.mjs && node build.mjs`

## Notes

- **All data is synthetic demo content** (derived from the public README and
  the graph-architecture session notes) — no personal substrate involved.
- Workspace colors were validated for color-vision-deficiency separation and
  contrast on both themes; workspaces are also shape-coded (circle / diamond /
  hexagon) so color is never the only channel.
- The real integration path: a `/track/[id]` page reading `concepts.json` +
  `concept-graph.json` via `lib/dossier.ts`, reusing `SourceWindow` for the
  Ground and `compileLibraryCardAction` for trail compilation.
