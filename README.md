# Scout

A persistent memory layer for years of LLM chats, documents, PDFs, and notes. Indexed, searchable, traceable to the exact line they came from.

Find anything you've ever written. Drill from a single line back to the moment it was written. Pin what matters to your Library Card, compile a Markdown bundle, and paste it straight into your next conversation with an AI so it has your full context: your sources, your conclusions, where each line came from.

Scout is a thin Next.js reader on a folder-based substrate. Workspaces, sources, concepts, and segments live in plain JSON files on disk; Scout reads them. The reader is read-only by design; ingesters and agents are separate concerns.

**Scout doesn't call any AI or LLM at runtime.** It reads static substrate files and renders them. No API keys, no external services, no per-query cost. Fully deterministic; runs offline once installed.

## Walkthrough

A short walkthrough covers the whole product: what Scout is, how it works, and the key moments.

[Watch on YouTube →](https://youtu.be/I3wXMXQvpig)

For the complete feature inventory, see [`FEATURES.md`](FEATURES.md).

## Run it

**Prerequisites:** [Node.js 18 or later](https://nodejs.org/) and `npm` (which ships with Node).

Open a terminal and run:

```bash
git clone https://github.com/diannekrouse/Scout.git
cd Scout
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

You'll land on Scout's home page with one workspace called **Welcome**. Click into it, open a segment, watch the source window appear. Pin something to your Library Card. Compile a Markdown bundle. Everything works on first run, no configuration needed.

If port 3000 is already in use, Next.js picks the next available port (usually 3001) and prints the URL in your terminal.

To stop the server, press `Ctrl+C` in the terminal. To run again later, just `npm run dev` from inside the `scout/` folder.

## Point Scout at your own data

```bash
cp .env.example .env
```

Edit `.env`:

```
DOSSIER_ROOT=/absolute/path/to/your/data
ALLOWED_WORKSPACES=research,team-notes
```

Restart `npm run dev` and Scout reads from there instead.

`ALLOWED_WORKSPACES` is optional. When set, only those workspace IDs are visible. Every read function in `lib/dossier.ts` enforces it, so segments, concepts, search results, and source pages from non-allowed workspaces never leak into the UI. Useful for demos, hand-offs, and screen-shares.

## Substrate format

A substrate root looks like this:

```
$DOSSIER_ROOT/
├── dossier-config.json         (optional) brand and theme overrides
├── index/
│   ├── workspaces.json         { workspaces: [...] }      id, name, color, description
│   ├── master-index.json       { files: [...] }           one entry per source file
│   ├── segments.json           { segments: [...] }        topic-level chunks of chats
│   ├── concepts.json           { concepts: [...] } or bare array
│   └── concept-graph.json      { edges: [...] } or bare array of relationships
└── sources/                    raw .md / .txt source files (read-only)
```

The reader is tolerant of variants:

- Both `{ key: [...] }` envelopes and bare arrays are accepted.
- All fields are optional except primary identifiers (`id`, `file_id`, `segment_id`, `concept_id`).
- Malformed entries are logged to the console and skipped, never crashed on.

The bundled `sample-dossier/` is the canonical reference. If your own substrate renders correctly here, you have a valid shape.

## Theme and branding

Drop a `dossier-config.json` at your substrate root to override the brand:

```json
{
  "brandName": "Scout",
  "tagline": "Your headline here.",
  "subtitle": "Your description here.",
  "wordmarkEyebrow": "Optional parent attribution",
  "pageEyebrow": "Scout",
  "theme": "savanna"
}
```

Scout ships with one built-in theme, `savanna` (warm gold and peach with a leopard motif). The theme registry pattern is in `themes/` so you can drop additional themes alongside it.

## Routes

| Route | What it shows |
|---|---|
| `/` | Workspace overview cards: name, color accent, concept / source / segment counts |
| `/workspaces/[id]` | One workspace: concepts, sources, and segments |
| `/chats` | Every indexed chat across all visible workspaces |
| `/chats/[id]` | One chat: stats, segments, optional source-window viewer |
| `/chats/[id]?from=N&to=M` | Same page with source highlighted at lines N–M |
| `/concepts` | Concept registry, grouped by workspace |
| `/concepts/[id]` | One concept: source segments, related concepts, cross-workspace refs |
| `/sources` | Source library, grouped by platform |
| `/segments` | Segment library with workspace and tag filters |
| `/search?q=…` | Universal search across every workspace, every chat, every document |
| `/bundles` | Compiled bundles ledger (Markdown and JSON exports) |
| `/archive?state=…` | Lifecycle browser: toggle between active, archived, forgotten |
| `/curate` | Bulk lifecycle operations |

## Tech

- Next.js 15 (App Router)
- React 19
- TypeScript strict mode
- Tailwind CSS 3
- Zod for tolerant schema validation
- Server-side reads from disk; no client-side data fetching for MVP

## Privacy

- The reader is read-only. It never writes to substrate files; lifecycle and curation changes go to a separate overlay file at the substrate root.
- Workspace identity is fully data-driven from `workspaces.json`. No workspace names are hard-coded.
- `ALLOWED_WORKSPACES` is enforced consistently across every read; non-allowed workspaces cannot leak through search results, concept detail pages, source viewers, or any other view.
- Path traversal is blocked: source-file reads must resolve inside `DOSSIER_ROOT`.

## Credits

Scout was designed and invented by Dianne Krouse, host of [Voyager: Awakening Intelligence](https://youtube.com/@VoyagerQi7).

## License

See `LICENSE`.
