# Scout Ingest Guide

Scout reads any text-based source with line-level provenance. This guide covers the common ones and shows the pattern for adding new sources.

## The core idea

Scout is read-only by design. Ingestion is a separate concern: converters turn source formats (JSON exports, PDFs, transcripts) into markdown files under `$DOSSIER_ROOT/sources/`. Scout reads what's on disk. Add a source, restart the reader, it appears.

Because ingestion is separate, adding a new source type is always the same shape:

1. Write a converter (script, tool, or manual) that outputs markdown into `sources/<source-name>/`
2. Optionally group by date, channel, or category for readability
3. Restart Scout (or reload the page) and the source is indexed

## Telegram

Telegram exports come as JSON from Telegram Desktop. Scout ships a converter.

### macOS: use Telegram Lite (important)

The standard Telegram app from the Mac App Store **blocks data exports** due to Apple sandbox restrictions. On macOS you must use **Telegram Lite**, the official desktop-focused client built for advanced data management.

Finding Telegram Lite is intentionally tricky (Apple's App Store search often hides it):

1. Open a **web browser** (Safari, Chrome, whatever) and Google **"Telegram Lite Mac App Store"**
2. Click the official **apps.apple.com** link from the search results (do not search the App Store directly, it will not surface Telegram Lite)
3. This jumps you straight to the correct download page
4. Install Telegram Lite and log in with your Telegram account
5. **24-hour security lock:** the first time you log in on Telegram Lite, Telegram enforces a mandatory 24-hour wait before any export is allowed. This is a safety feature to prevent unauthorized devices from copying chat logs instantly. Return the next day to export.

### Windows and Linux

The standard Telegram Desktop app supports export directly. No Lite version required.

### Export a chat

Two paths depending on scope:

**Single chat (recommended for most Scout ingestion):**

1. Open the specific conversation you want to export
2. Click the three vertical dots (⋮) in the top-right corner of the chat window
3. Select **Export chat history**
4. In the setup window:
   - **Format: JSON** (recommended for Scout; HTML works too but requires an extra parse step)
   - Uncheck **Videos, Voice Messages, Round Video Messages** if you only want text and light media (recommended; keeps file sizes reasonable and Scout is text-first anyway)
   - Choose a save location
5. Click **Export**
6. When it completes, click **Show My Data** to reveal the export folder in Finder

**All chats at once:**

1. **Settings → Advanced → Export Telegram Data**
2. Select which categories to include (Personal chats, Bot chats, Public groups, etc.)
3. Format: **JSON**
4. Click **Export**

Telegram writes either `result.json` (bulk export) or a `.json` file named after the chat (single export) to the save location.

### Convert to markdown

```bash
python scripts/telegram-to-md.py /path/to/result.json --output-dir $DOSSIER_ROOT/sources/telegram/
```

Output structure:

```
$DOSSIER_ROOT/sources/telegram/
├── omegaclaw-bot/
│   ├── 2026-05.md
│   └── 2026-06.md
├── openclaw-bot/
│   └── 2026-06.md
└── ben-goertzel-dm/
    └── 2026-06.md
```

Each markdown file contains one month of messages from one chat, with sender, timestamp, and text preserved for every message. Media (photos, files, voice messages) appear as placeholder references so grep and search still find them.

### Build the substrate index

After dropping markdown into `sources/`, run the index builder so Scout knows the files exist:

```bash
python scripts/build-index.py --dossier-root $DOSSIER_ROOT
```

This scans `sources/*/` and generates or updates:

- `index/workspaces.json` (one workspace per top-level `sources/` subfolder)
- `index/master-index.json` (one entry per markdown file)

The script is safe to re-run: existing entries are preserved, new files are added. Run it any time you drop new sources into the folder.

Restart Scout (Ctrl+C then `npm run dev`) or just reload the browser to see the new workspace appear.

### Ongoing ingest (optional)

For continuous ingest instead of periodic manual exports, run a Telegram ingester service that uses the Telegram Bot API to pull new messages on a schedule and write them into `sources/telegram/` automatically. This service lives outside Scout (substrate stays read-only). Reach out if you want a reference implementation.

## ChatGPT

ChatGPT offers built-in data export as JSON. Scout ships a converter.

### Export from ChatGPT

1. In ChatGPT: **Settings → Data controls → Export data**
2. You'll receive an email with a download link (usually within 24 hours)
3. Unzip the download; you're looking for `conversations.json` at the top level

### Convert to markdown

```bash
python scripts/chatgpt-to-md.py path/to/conversations.json --output-dir $DOSSIER_ROOT/sources/chatgpt/
```

Output structure:

```
$DOSSIER_ROOT/sources/chatgpt/
├── 2024-11-15-brainstorming-a-launch-plan.md
├── 2025-03-30-mirrortees-market-and-dropshipping.md
└── 2026-01-05-focus-on-income-engine.md
```

One markdown file per conversation, named by date and title. Each file has a header with title, date, message count, and source, followed by every message with sender and timestamp preserved.

Note: ChatGPT stores conversations as a tree (side-branches happen when you edit a message and resubmit). The converter walks the primary branch to produce a linear transcript. Side-branches are skipped in v1; open an issue if you need them.

## Claude (claude.ai chats)

Anthropic offers data export from claude.ai as JSON. Scout ships a converter.

### Export from claude.ai

1. In claude.ai: click your account menu (top-right) → **Settings** → **Privacy** → **Export data**
2. You'll receive a download link by email
3. Unzip the download; you're looking for `conversations.json` at the top level

### Convert to markdown

```bash
python scripts/claude-ai-to-md.py path/to/conversations.json --output-dir $DOSSIER_ROOT/sources/claude/
```

Output structure:

```
$DOSSIER_ROOT/sources/claude/
├── 2026-03-14-planning-the-launch.md
├── 2026-04-22-project-scoping.md
└── 2026-05-10-substrate-design.md
```

One markdown file per conversation, named by date and title.

## Claude Code sessions (local)

Claude Code (the CLI tool) stores every session as a JSONL file on your local machine at:

```
~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl
```

Where the encoded project path is your project's working directory with slashes replaced by dashes. For example, `-Users-yourname-projects-my-app` is the folder for `/Users/yourname/projects/my-app`. Each JSONL file is one session.

### Convert to markdown

```bash
python scripts/claude-code-to-md.py \
    ~/.claude/projects/<your-project-folder>/ \
    --output-dir $DOSSIER_ROOT/sources/claude-code/
```

Output structure:

```
$DOSSIER_ROOT/sources/claude-code/<project-slug>/
├── 2026-04-11-d09ab341.md
├── 2026-04-20-6211c4cf.md
└── 2026-06-07-0bf36705.md
```

One markdown file per session, named by the session's start date and its short UUID. Each file contains all user and assistant messages, with tool calls and tool results preserved as annotated blocks so search still finds them.

By default, Claude's thinking blocks are stripped (they can be very long and noisy). Add `--include-thinking` if you want them in the output:

```bash
python scripts/claude-code-to-md.py \
    ~/.claude/projects/<your-project-folder>/ \
    --output-dir $DOSSIER_ROOT/sources/claude-code/ \
    --include-thinking
```

You can run the converter for each Claude Code project separately (one output subfolder per project).

## OpenAI Codex CLI sessions (local)

OpenAI's Codex CLI stores every session as a JSONL rollout file at:

```
~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl
```

Thread titles (the human-readable session names shown in the Codex UI) live in `~/.codex/session_index.jsonl` and are merged in automatically when the converter runs, so output files are named by their real title rather than a UUID.

### Convert to markdown

```bash
# All Codex sessions (recursive from top-level sessions folder):
python scripts/codex-to-md.py ~/.codex/sessions/ --output-dir $DOSSIER_ROOT/sources/codex/

# Or one month:
python scripts/codex-to-md.py ~/.codex/sessions/2026/02/ --output-dir $DOSSIER_ROOT/sources/codex/

# Or a single rollout file:
python scripts/codex-to-md.py \
    ~/.codex/sessions/2026/02/27/rollout-2026-02-27T11-22-10-<uuid>.jsonl \
    --output-dir $DOSSIER_ROOT/sources/codex/
```

Output structure:

```
$DOSSIER_ROOT/sources/codex/
├── 2026-02-27-create-qwestor-hr-molt-prototype.md
├── 2026-03-09-mirrortees-launch-strategy.md
└── 2026-04-15-continuing-ingestion-pipeline.md
```

One markdown file per session, named by date and thread title. Each file has a header with title, date, message count, session ID, and the working directory the session ran in. Messages include user/assistant text plus tool calls and tool results (both `function_call` and `custom_tool_call` variants) preserved as annotated blocks so search still finds them.

By default, reasoning/thinking blocks and system/developer messages are stripped. Use `--include-thinking` and/or `--include-system` to keep them.

## Anthropic Cowork / Claude Team

Cowork and Claude for Work / Claude Team export formats are not yet supported in this converter. If you have access to a Cowork/Team workspace and can share an example export (or the format schema), [open an issue](https://github.com/diannekrouse/Scout/issues) and we'll add a converter. In the meantime, individual conversations from a team claude.ai account work with the `claude-ai-to-md.py` converter above.

## PDFs

Any PDF-to-markdown tool works. Recommended:

- **`pdftotext`** (from `poppler-utils`) — free, fast, plain text only
- **`marker`** — Python library, preserves structure well
- **`docling`** — modern IBM Research tool, excellent tables

Example with `pdftotext`:

```bash
pdftotext -layout my-paper.pdf sources/pdfs/my-paper.md
```

Then optionally clean up the output. Scout indexes the resulting markdown alongside everything else.

## Interview transcripts

Any format works, but for provenance quality:

1. Save the raw transcript verbatim in `sources/interviews/<speaker-name>/YYYY-MM-DD-topic.md`
2. Include a metadata header (date, speakers, topic, duration)
3. Include timecodes if available (like `[00:12:34]`) for line-level source reference

## Slack

Slack exports channels as JSON (workspace admin required). Structure per channel per day. Write a converter following the Telegram pattern.

## Discord

Discord doesn't offer official exports for personal messages, but community tools like `DiscordChatExporter` can produce JSON. Same pattern: convert to markdown, group by channel and month.

## Pattern for writing a new converter

If you're adding a new source, follow this shape:

```python
#!/usr/bin/env python3
"""
<source-name> → Markdown converter for Scout.

Usage: python <source-name>-to-md.py <input> --output-dir sources/<source-name>/
"""

import argparse
import json
from pathlib import Path

def format_message(msg):
    """One message → one markdown block with timestamp and sender."""
    # Return a string like:
    # ### 2026-07-02 14:30:00 — Alice
    #
    # Message text here.
    pass

def convert(input_path, output_dir):
    # 1. Parse the input
    # 2. Group by channel / conversation / month
    # 3. Write markdown files to output_dir/<group>/<date>.md
    # 4. Each file: header (title, date, message count) + messages
    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path")
    parser.add_argument("--output-dir", default="sources/<source-name>/")
    args = parser.parse_args()
    convert(args.input_path, args.output_dir)
```

Keep converters standalone (Python stdlib only, no third-party dependencies unless necessary). Small, readable, easy to fork for adjacent formats.

## After ingesting

Restart Scout (`Ctrl+C` then `npm run dev`) or just reload the browser page. New sources appear in the source library and in search results immediately, because Scout re-reads the substrate on every load.

For concept extraction and workspace assignment (turning raw sources into a concept-graph with related_concepts), see the segmentation and concept-build scripts in the personal Scout instance at `~/qi7/qi7-dossier/apps/dossier-reader/scripts/` for a working example. That layer is separate from ingest and can be added later.

## Substrate rule reminder

The substrate honors what the source has shown. Ingesters preserve what's there; they don't invent. Save the raw source verbatim first; transform second. If you ever need to trust the substrate for defensible research, the raw source is your evidence.

---

*Written for the OmegaHive Scout integration. See `../README.md` for the reader itself.*
