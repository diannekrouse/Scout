# Scout: Feature Manifest

*The persistent episodic and sensory memory layer from the Qwestor research stack. One node in SingularityNET's unified intelligence architecture.*

This document is a complete inventory of what's built into Scout. Use it as a reference, an onboarding tour, or as input to an agent that needs to understand the system's capabilities.

---

## At a glance

Scout is a memory layer for everything you've ever written. It indexes years of AI conversations (ChatGPT, Claude, Grok), documents, PDFs, and notes into a single searchable, traceable, browsable substrate. Every concept traces back to a segment; every segment traces back to its exact line in the source.

Two interfaces in one product:
- **For humans**: a beautifully designed reader with workspaces, segments, concepts, search, archive, and a library-card-to-bundle flow.
- **For agents**: a structured JSON bundle format (with optional Markdown variants for LLM context) that programmatic consumers ingest directly.

The library is for the human; the bundle is the agent's interface.

---

## 1. Browse & Read

### Overview page (`/`)
- Tagline + subtitle + byline brand intro
- Top-level stats grid (workspaces / concepts / sources / segments): every card is clickable
- Workspace cards grid, one per workspace, with concept/source/segment counts
- Brand byline at the bottom (italic positioning context)
- Provenance footer showing root path + scope

### Chats (`/chats`)
- Every indexed conversation, sorted by date
- Filter by lifecycle state (active by default; archived items move to `/archive`)
- ChatCard with platform-color tinted halo, platform sticker, segment count, word count, line count, lifecycle pill, pin-to-card button
- Workspace color dot per chat

### Chat detail (`/chats/[id]`)
- All segments for the chat, sorted by start line
- Stats: segment count, total words, personas, tags
- **Source window** (when `?from=X&to=Y`): scrollable view of the entire source file with focus range highlighted, parent doc title + platform badge, line numbers, auto-scroll-to-focus
- **Workspace assignment pills** at the bottom: clickable, link to each workspace
- Per-segment lifecycle toggle + library-card pin

### Concepts (`/concepts`)
- Every named idea, framework, entity, or thread extracted from sources
- ConceptCard with workspace-color tinted background + halo
- Source segment count, related concept count, lifecycle state, tags
- Pin-to-library-card button per concept

### Concept detail (`/concepts/[id]`)
- Concept name, summary, category, related concepts
- Source segments list (each segment with line range, links to chat detail)
- Workspace assignment pills

### Segments (`/segments`)
- All segments across the entire dossier, sorted by recency
- **Workspace filter pills** at the top with counts
- **Tag filter** via `?tag=` URL param: show only segments carrying that tag
- **Combined filter**: `?workspace=qwestor&tag=memory` works
- Active tag filter chip with × to clear
- SegmentCard with workspace gradient bg, halo, segment-id sticker, line range, word count, lifecycle pill, tags as clickable filter pills
- Pin-to-library-card per segment

### Sources (`/sources`)
- Every indexed file, grouped by platform (ChatGPT, Claude, Grok, PDF, GoogleDoc)
- Reuses ChatCard styling
- Active-only by default; archived items move to `/archive`

### Workspace pages (`/workspaces/[id]`)
- Custom workspace badge + accent color
- Per-workspace concept and source grids
- Stats stickers in workspace's own color family
- Back-link to overview

---

## 2. Search & Discover

### Universal search (`/search`)
- Searches across concepts, segments, sources simultaneously
- Match against: names, summaries, segment IDs, file IDs, tags, personas, file paths
- Results grouped by workspace, color-coded
- Each result shows kind (concept/segment/source) + ID + title + subtitle excerpt
- Click any result to jump to detail view

### Top bar search (everywhere)
- Always-visible search input on the right side of the TopBar
- Submits to `/search?q=...` via standard form (no JS required for core flow)
- Compact width so the rest of the layout breathes

### Tag-based filtering
- Click any `#tag` pill on a segment or concept card → jumps to `/segments?tag={tag}`
- Active tag filter is shown in a green chip at the top of the segments page
- Composable with workspace filter

---

## 3. Lifecycle Management

The single hide-things flow. Replaces the older curation/eye-toggle.

### Three states
- **Active**: visible everywhere (default)
- **Archived**: hidden from main views, surfaces only on `/archive`
- **Forgotten**: hidden everywhere except the explicit forgotten tab on `/archive`

### Per-item control
- Lifecycle pill on every concept, segment, and source card
- Click cycles through states; the pill flips its label on hover so it reads as a button, not a status indicator
- Separate **restore** shortcut button next to the cycle button when state is not active (one-click jump back)

### Archive page (`/archive`)
- Tabs for active / archived / forgotten with counts
- Full sections for Sources, Segments, Concepts in the chosen state
- Each card carries the lifecycle toggle so you can restore in place

### Sidebar archive count badge
- Small pill next to the Archive nav link showing total archived + forgotten items
- Persistent visibility across all pages: *"I have 7 things set aside"*
- Only renders when count > 0

### Implementation
- Stored in the curation overlay as `lifecycleOverrides: { segments, concepts, sources }`
- The substrate (`index/*.json`) is never modified
- Spec-aligned with the read-only-substrate constraint

---

## 4. Library Card & Bundle Ledger

### Library Card panel (right band)
- Click `+` (now a **pin** icon) on any concept / segment / source card to add it
- Pin tooltip on hover: *"Pin to library card"* / *"Pinned · click to unpin"*
- Light gold background on the pin so it doesn't compete with the green active lifecycle pill
- Items grouped in the right-band panel with workspace color dot, kind pill, title, remove `×`

### Compile bundle
Two-button compile from the panel:
- **Compile · MD** (gradient primary): writes a Markdown bundle with **inlined source content** as fenced code blocks. Designed to paste directly into any LLM chat for context.
- **JSON** (smaller secondary): writes a structured JSON bundle for programmatic agents.

After compile, redirects to `/bundles?last={filename}` so the user *sees* the new bundle, highlighted with a peach glow ring + "Just compiled" badge.

### Bundle Ledger (`/bundles`)
- Permanent record of every compiled bundle
- Each bundle card shows:
  - Type sticker (Card bundle / Full bundle)
  - Format pill (Markdown / JSON)
  - Audience hint (*for humans + LLMs* / *for agents*)
  - Counts grid (workspaces / concepts / sources / segments)
  - Filename + size + timestamp
  - **Copy-to-clipboard** for the full bundle body
  - **Preview eye** that expands inline (cream parchment pre block with truncation hint)
  - **Delete** trash with regex-validated path safety

### Filename naming
Workspace-aware, sortable, friendly: `qwestor_card_2026-05-09_14-04.md`. Multi-workspace bundles use `multi_card_*`. Unscoped bundles use `unscoped_card_*`. Collision-safe with `_2`, `_3` suffixes.

### Bundle stats footer
- Displayed in the Library Card panel
- Shows total bundle count + relative time of the last compile + link to ledger
- Reassures users that pinned items aren't lost after compile (they stay pinned so the user can compile both formats from the same stack)

### Markdown bundle structure
- YAML frontmatter (title, schema, format, created, dossier, counts, workspaces touched)
- Friendly intro paragraph
- Workspaces, Concepts, Sources, Segments sections
- Each segment includes its actual source content as a fenced code block (the killer feature for LLM context)
- Footer with creation timestamp

### JSON bundle structure
- `$schema: library-card-bundle-v1`
- `createdAt`, `sourceDossier`, `cardItems`, `counts`
- Full workspaces, concepts, sources, segments arrays (metadata only: segments don't include line content; agents can read source files via `path` if needed)

---

## 5. Tags

### Controlled vocabulary
Three conceptual axes (flat in the data, semantic in our heads):

| Axis | Purpose | Examples |
|---|---|---|
| **Kind** | What kind of artifact | `insight`, `question`, `decision`, `whimsy`, `transcript`, `spec`, `draft`, `landmark` |
| **Topic** | What it's about (workspace-specific) | `memory`, `architecture`, `agents`, `provenance`, `governance`, `cognitive-authority`, `branding`, `gtm`, `messaging`, `pre-launch`, `ux`, `cognition`, `metaphor`, `philosophy`, `everyday-objects`, `whimsy`, `research-stack`, `protocol`, `hyperon` |
| **Status** | Where it sits in lifecycle | `evergreen`, `unresolved`, `to-revisit` |

### Tag rendering
- `#tag` pills on segment + concept cards
- Clickable → jumps to `/segments?tag={tag}` filter
- Render-time deduplication so duplicate tags in the substrate never break React keys
- Tags also exist on source files (one platform-derived + one workspace-default)

### Tag seeding
- One-time `seed_tags.py` script reads each segment/concept/source title + summary
- Applies tags via simple keyword matching against the workspace-specific topic vocabularies
- Idempotent: won't overwrite existing tags

---

## 6. Workspaces

### Definition
Each workspace lives in `index/workspaces.json` with: id, name, color (hex), description, optional `glyph` name.

### Built-in workspaces (handoff)
- **Qwestor** (`#50C878`, magnifier glyph): SNET Pod 14 research platform
- **SingularityNET / Hyperon** (`#9B59B6`): Organizational + Hyperon work
- **Qwello** (`#FF8B6F`): Companion product, preserved for reference
- **Marginalia** (`#C8B5D9`): Quirky chats kept for posterity

### WorkspaceBadge
Each workspace gets a stable illustrated badge. 10 glyphs available:
- 6 ambient (deterministically picked by id-hash): `starBurst`, `moon`, `peaks`, `spiral`, `heart`, `constellation`
- 4 research-themed (opt-in via `glyph` field in workspaces.json): `magnifier`, `compass`, `book`, `atom`

### Cross-workspace memberships
- `workspace_primary` (single) + `workspace_secondary` (array) on every segment, concept, source
- Concepts can belong to multiple workspaces
- Workspace pages show all primary OR secondary items

### Allowed workspaces scope
- `ALLOWED_WORKSPACES` env var filters the visible scope (per-deployment)
- Sidebar shows scope status at the bottom

---

## 7. Themes & Branding

### Theme registry
Themes live in `themes/`. Scout ships with one built-in theme:
- `savanna.ts`: bandana green / leopard gold / sky blue / soft mauve / rosette black

Drop additional theme files into `themes/` and register them in `themes/index.ts` to add your own.

### How theme is selected
`dossier-config.json` carries a `theme` field. The layout reads it at root level and sets `<html data-theme="...">`. CSS rules scoped to `[data-theme="savanna"]` remap Tailwind accent classes (`text-mint`, `bg-peach`, etc.) to the theme's ink without rewriting any component.

### Per-dossier branding
`dossier-config.json` controls everything user-facing:
- `brandName`: wordmark (e.g. "Scout")
- `parentBrand`: small italic attribution (e.g. "from Qwestor")
- `tagline`: page title (e.g. "Your memory trove, line by line.")
- `subtitle`: main "what it is" sentence
- `byline`: quieter "where it fits" sentence (supports `\n` for line breaks)
- `greeting`: right-band welcome (e.g. "Welcome ✦")
- `theme`: visual theme key

### Hero illustration
PNG of a leopard cub in a tree with binoculars, a green bandana, and round glasses. Includes the "Welcome" greeting in the bottom-left in white with shadow.

### Page-header decor
- 5 decor variants: `constellation`, `chats`, `search`, `archive`, `concept`
- All decor is replaced with a small leopard-cub mascot via CSS gating
- Mascot only renders when the right-hand band is hidden (narrow viewports), so wide screens see only the band hero

### Brand mark
Leopard-print brim hat over round wire-frame glasses, with a hat-tip-on-hover animation.

### Savanna palette
| Tailwind class | Color |
|---|---|
| `text-peach` | `#3D8A44` bandana green |
| `text-mint` | `#A87E3F` leopard ochre |
| `text-sky` | `#3D87B8` sky blue |
| `text-lilac` | `#7A5C88` soft mauve |
| `text-gold` | `#A87E3F` leopard ochre |

---

## 8. Sidebar Navigation

### Nav links (Browse)
- Overview, Chats, Concepts, Segments, Sources, Archive
- Each with custom icon, tinted background tile, plain-language description
- Hover: row tints in the link's family color, slides 4px right, icon scales 110% and tilts -4°
- Tooltips with one-line descriptions appear to the right of each link in cream/mint styling

### Tools section
- Curate, Bundles
- Same hover treatment

### Workspaces section
- Each workspace renders with its WorkspaceBadge + name
- Hover tints with workspace's own color, badge scales + tilts

### Brand block (top)
- Wordmark + parent attribution (italic)
- Theme-aware brand mark (constellation / leopard hat)

### Scope footer
- Shows ROOT path + ALLOWED_WORKSPACES status

---

## 9. Right-hand Band

Persistent on `lg:` and up.

### Hero scene
- Leopard cub PNG hero illustration
- White greeting bottom-left with text-shadow for legibility

### Stats grid
- Concepts / Sources / Segments: clickable to their respective pages
- Color-coordinated with home page stats

### Workspaces row
- Click → jumps to `/#workspaces` on home page
- Shows total + scoped count

### Library Card panel
- Live bookmark accumulator
- Compile MD + JSON buttons
- Clear card button
- Bundle ledger footer (count + last compiled + link)

### Provenance footer
- Dossier root path
- Allowed workspaces status

---

## 10. Source Window

Inline view of any source file's lines.

- Full body scrollable (max 640px tall)
- Auto-scrolls to focus range about 1/4 from the top so context is visible above
- Line numbers stick to the left while horizontal-scrolling long lines
- Header shows: parent doc title + platform sticker + file_id + focus line range badge + total line count
- "scroll to read" hint
- Focus range highlighted with peach gradient + 3px peach left border

---

## 11. Page Header

Reusable across every page.

- Eyebrow (e.g. "Scout / Concepts")
- Large display title
- Subtitle (medium body text, max-width 3xl)
- Optional decor illustration (theme-aware)
- Optional back-link with breadcrumb-style icon
- Optional action buttons row

---

## 12. Provenance & Trust

The defining feature: every concept traces back to its sources, every segment traces to its exact line range.

### Visible everywhere
- Segment IDs shown on every segment card (e.g. `qwestor-demo-001-s007`)
- Line range pills (`L143–L189`)
- Word counts
- Source file paths shown in source detail
- Platform stickers on every chat/source card
- "Last updated" + "ingested at" timestamps

### Cross-references
- Concepts → source_segments[] → individual segments
- Concepts → related_concepts[] → other concepts
- Segments → file_id → source file
- Segments → workspace_primary + workspace_secondary[] → workspaces

### Bundles preserve provenance
- JSON bundles include all metadata
- Markdown bundles include line ranges in metadata + full content from each segment

---

## 13. Architecture (data + read-only substrate)

### Single source of truth
The dossier is a folder containing JSON files (the substrate) that are NEVER modified by the reader:

```
$DOSSIER_ROOT/
  dossier-config.json     ← brand + theme config
  index/
    master-index.json     ← every source file
    segments.json         ← every segment
    concepts.json         ← every concept (or split: concepts-{workspace}.json)
    workspaces.json       ← every workspace
  sources/
    chatgpt/workspace-{id}/...
    claude/workspace-{id}/...
    pdfs/workspace-{id}/...
  bundles/                ← compiled bundle outputs
  curation.json           ← user-modifiable overlay (writes here, never to substrate)
  library-card.json       ← pinned-items state
```

### Curation overlay (the minimal write surface)
The only files the reader writes to are:
- `curation.json`: per-item `hiddenSegmentIds`, `hiddenFileIds`, `hiddenConceptIds`, plus `lifecycleOverrides: { segments, concepts, sources }`
- `library-card.json`: pinned items
- `bundles/*`: exports

### Schema validation
Every index file is parsed through Zod schemas with `.passthrough()` so unknown future fields don't break the reader. Strict required fields enforced; nullable + optional fields documented.

---

## 14. Agent Interface

### JSON bundles
- Schema-versioned (`$schema: library-card-bundle-v1`)
- Structured workspaces / concepts / sources / segments
- Counts metadata + creation timestamp
- Source dossier reference for cross-deployment portability

### Markdown bundles
- Self-contained: paste straight into any LLM chat for context
- YAML frontmatter parseable by tools
- Inlined source content as fenced code blocks
- Workspace + concept + source + segment sections in human-readable order

---

## 15. Accessibility

- aria-label on every icon-only button
- aria-describedby for nav tooltips (replaces the slow native `title=""`)
- aria-expanded on all toggle buttons (lifecycle, preview)
- pointer-events: none on overlays so they never block clicks
- Semantic HTML throughout (h1, h2, h3, sections, lists)
- Keyboard-navigable forms (server actions, no JS required for core flows)

---

## 16. Technology

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4 with custom palette extensions
- **Validation**: Zod (with `.passthrough()` for forward compatibility)
- **Server actions**: native form-action style (progressive enhancement, no JS required for core flows)
- **Themes**: data-attribute + scoped CSS overrides (no Tailwind config swap needed)
- **Fonts**: Plus Jakarta Sans (display), Inter (body), Fraunces (literary serif), JetBrains Mono (code)

---

## 17. Where things live (file index)

| What | Where |
|---|---|
| Theme registry | `themes/{savanna,types,index}.ts` |
| Brand config | `$DOSSIER_ROOT/dossier-config.json` |
| Sidebar | `components/nav/Sidebar.tsx` |
| Hero scenes | `components/ui/HeroScene.tsx` |
| Right band | `components/ui/RightBand.tsx` |
| Card components | `components/ui/{Chat,Concept,Segment}Card.tsx` |
| Lifecycle | `components/ui/LifecycleButton.tsx` + `app/actions/lifecycle.ts` |
| Library card | `components/ui/CardButton.tsx` + `app/actions/library-card.ts` |
| Bundle ledger | `app/bundles/page.tsx` + `components/ui/BundleActions.tsx` |
| Tags | `components/ui/TagPill.tsx` |
| Source window | `components/ui/SourceWindow.tsx` |
| Schemas | `lib/schemas.ts` |
| Data layer | `lib/dossier.ts` |

---

*This manifest covers everything Scout does today. The system is designed to be inherited, extended, and customized: themes and brand config make per-dossier identity a one-file change; the substrate stays read-only so no future work can corrupt the source of truth.*

*Built for SingularityNET handoff, 2026-05.*
