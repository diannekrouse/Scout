# Welcome to Scout

You're looking at Scout. A persistent memory and context layer for years
of conversations, documents, and notes across any platform. Indexed,
searchable, and traceable to the exact line they came from.

This is the welcome workspace, a starter so Scout has something to show
on first run. Treat it as your tutorial.

Click anywhere. Open the source window. Pin something to your Library
Card. Compile a bundle. The video walkthrough covers every move; this
doc is the version you can read at your own pace.

When you're ready, point Scout at your own substrate and the welcome
content falls away.

## What you're looking at

Scout reads a folder structure on disk. The folder has two pieces:

- `index/` holds JSON files that describe your workspaces, sources,
  segments, and concepts
- `sources/` holds the raw markdown, text, and PDF files that the index
  points back to

You are seeing this welcome doc as the only source in the only workspace.
When you populate Scout with your own data, you will see your workspaces,
your sources, your concepts.

Every segment carries a line range pointing back here. Click any segment
card and Scout opens the exact lines in the source window below. That is
line-level provenance. Never lose context again.

## Bringing in your own data

Scout is source-agnostic. Any text-based source can feed the substrate:
chat exports, PDFs, transcripts, notes. Two scripts do the work.

### Telegram to Scout in 5 steps

**macOS users:** Install **Telegram Lite** first. The Mac App Store version
of Telegram blocks data exports due to Apple sandbox restrictions. In a web
browser, Google *"Telegram Lite Mac App Store"* and click the Apple App
Store link from the search results (searching the App Store directly does
not surface Telegram Lite). The first time you log in, Telegram enforces a
mandatory 24-hour security lock before export is available.

1. **Export a chat.** In Telegram Lite (macOS) or Telegram Desktop
   (Windows / Linux): open a chat → three vertical dots (⋮) →
   **Export chat history** → format: **JSON** → **Export**.

2. **Convert to markdown.**

   ```bash
   python scripts/telegram-to-md.py /path/to/result.json --output-dir $DOSSIER_ROOT/sources/telegram/
   ```

3. **Build the substrate index.**

   ```bash
   python scripts/build-index.py --dossier-root $DOSSIER_ROOT
   ```

4. **Restart Scout** (Ctrl+C in the terminal, then `npm run dev`).

5. **See your data.** A new **Telegram** workspace appears on the home
   page with your chats indexed and searchable.

### Other sources

- **ChatGPT**: export via ChatGPT's Data Export, drop the markdown files
  into `$DOSSIER_ROOT/sources/chatgpt/`
- **Claude**: export via Anthropic's data export, drop into
  `$DOSSIER_ROOT/sources/claude/`
- **PDFs**: use any PDF-to-markdown tool (`pdftotext`, `marker`,
  `docling`), drop into `$DOSSIER_ROOT/sources/pdfs/`

After adding new files, always re-run
`python scripts/build-index.py --dossier-root $DOSSIER_ROOT` to update
the index.

See `docs/ingest-guide.md` in the repo for the full walkthrough of every
source type, including the pattern for writing new converters.

## When you are ready to remove this welcome

1. Set `DOSSIER_ROOT` in `.env` to your real substrate
2. Restart `npm run dev`
3. Optionally delete `sample-dossier/` from the repo

Scout will read your data and the welcome content disappears.

Welcome aboard.
