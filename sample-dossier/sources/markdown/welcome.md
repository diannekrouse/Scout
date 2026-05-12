# Welcome to Scout

You're looking at Scout. A persistent memory layer for years
of LLM chats, documents, PDFs, and notes. Indexed, searchable,
traceable to the exact line they came from.

This is the welcome workspace, a starter so Scout has something
to show on first run. Treat it as your tutorial.

Click anywhere. Open the source window. Pin something to your
Library Card. Compile a bundle. The video walkthrough covers
every move; this doc is the version you can read at your own
pace.

When you're ready, point Scout at your own substrate and the
welcome content falls away.

## What you're looking at

Scout reads a folder structure on disk. The folder has two
pieces:

- `index/` holds JSON files that describe your workspaces,
  sources, segments, and concepts
- `sources/` holds the raw markdown, text, and PDF files that
  the index points back to

You are seeing this welcome doc as the only source in the only
workspace. When you populate Scout with your own data, you will
see your workspaces, your sources, your concepts.

Every segment carries a line range pointing back here. Click
any segment card and Scout opens the exact lines in the source
window below. That is line-level provenance. Never lose
context again.

## How to add your own data

Three ways to make Scout yours.

### Point Scout at an existing substrate

If you already have a folder structured the way Scout expects
(see the README for the substrate format), tell Scout where
it lives:

```bash
cp .env.example .env
# edit .env and set DOSSIER_ROOT=/absolute/path/to/your/data
```

Restart `npm run dev` and Scout reads from there instead.

### Build a substrate from your raw data

If you have ChatGPT exports, Claude exports, Google Docs, PDFs,
or notes, an ingester turns them into the substrate format.
The ingester is a separate concern from this reader. The reader
is read-only by design.

### Use this workspace as a template

Copy `sample-dossier/` to a new directory. Replace the files in
`index/` and `sources/` with your own content following the
same shape. Point Scout at the new directory.

## When you are ready to remove this welcome

1. Set `DOSSIER_ROOT` in `.env` to your real substrate
2. Restart `npm run dev`
3. Optionally delete `sample-dossier/` from the repo

Scout will read your data and the welcome content disappears.

Welcome aboard.
