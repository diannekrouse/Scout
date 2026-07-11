# Scout Ingest Guide

Scout reads any text-based source with line-level provenance. This guide covers the common ones and shows the pattern for adding new sources.

## Before your first command

If you have never used the terminal before, here is what you need to know:

**Opening Terminal on macOS:** Press `Cmd+Space`, type "Terminal", press Enter. Or Applications → Utilities → Terminal.

**Setting DOSSIER_ROOT** (the folder where all your ingested data lives). At the start of every terminal session:

```bash
export DOSSIER_ROOT=/Users/yourname/path/to/your/dossier
mkdir -p "$DOSSIER_ROOT/sources"
```

Replace `/Users/yourname/path/to/your/dossier` with your actual dossier folder. Then `$DOSSIER_ROOT` in any subsequent command expands to that path. Note: if you close the terminal window and open a new one, you need to run `export DOSSIER_ROOT=...` again. It does not persist by default.

**Pasting long file paths:** if you don't want to type a long path, drag the file from Finder into the terminal. macOS auto-pastes the full path.

**Multi-line commands:** commands in this guide sometimes have a `\` at the end of a line, meaning "the command continues on the next line." You can also paste them as one line if you prefer.

## The core idea

Scout is read-only by design. Ingestion is a separate concern: converters turn source formats (JSON exports, PDFs, transcripts) into markdown files under `$DOSSIER_ROOT/sources/`. Scout reads what's on disk. Add a source, restart the reader, it appears.

Before running any of the commands in this guide, set `DOSSIER_ROOT` as a shell variable in your terminal. Scout's `.env` file configures Scout itself; it does not export variables to your shell:

```bash
export DOSSIER_ROOT=/absolute/path/to/your/data
mkdir -p "$DOSSIER_ROOT/sources"
```

All example commands assume `python3` (macOS 12.3+ and modern Linux ship no plain `python` binary; the converter scripts use `#!/usr/bin/env python3`).

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

### Export chats (recommended: bulk export via Advanced settings)

The per-chat "three vertical dots → Export chat history" menu does not reliably surface the JSON format toggle on all Telegram Lite versions. Use the bulk **Settings → Advanced → Export Telegram Data** flow instead. It is more reliable and lets you pick exactly which chat categories to include.

1. **Settings → Advanced → Export Telegram Data**
2. Uncheck the top four sections (Account information, Contacts list, Story archive, Music on Profile) — Scout has no use for them
3. Under **Chat export settings**, check only the categories you want. For a Ben-style test:
   - Check **Bot chats** (this is the OpenClaw/OmegaClaw territory)
   - Uncheck Personal chats, Private groups, Private channels, Public groups, Public channels
4. Under **Media export settings**, uncheck everything if you only want text (recommended; Scout is text-first). Otherwise the size limit slider at 8 MB is fine.
5. Under **Other**, uncheck both (Active sessions, Miscellaneous data)
6. Under **Location and format**, choose **Machine-readable JSON**
7. Click **Export**

Telegram writes a `DataExport_YYYY-MM-DD/result.json` file to your chosen location (usually `~/Downloads/Telegram Lite/` on macOS).

**Per-chat fallback (if the bulk export flow is unavailable in your version):**

1. Open the specific conversation you want to export
2. Click the three vertical dots (⋮) in the top-right corner
3. Select **Export chat history**
4. In the setup window: **Format: JSON**, uncheck media unless needed, choose save location, click **Export**

If the JSON option is missing from the per-chat dialog, switch to the bulk flow above.

### Convert to markdown

```bash
python3 scripts/telegram-to-md.py /path/to/result.json --output-dir $DOSSIER_ROOT/sources/telegram/
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
python3 scripts/build-index.py --dossier-root $DOSSIER_ROOT
```

This scans `sources/*/` and generates or updates:

- `index/workspaces.json` (one workspace per top-level `sources/` subfolder)
- `index/master-index.json` (one entry per markdown file, with the fields the Scout reader expects: `path`, `workspace_primary`, `title_detected`, `platform`, `filename`, `file_type`, `date_detected`, `total_lines`, `total_words`, `status`)

The script is safe to re-run: existing entries with matching `file_id` are updated in place, new files are added. At the end it prints `N of N source files verified readable` as a self-check that the builder and reader agree on their paths.

Restart Scout (Ctrl+C then `npm run dev`) or just reload the browser to see the new workspace appear.

### Upgrading indices built by an older build-index

Earlier versions of `build-index.py` wrote `workspace` instead of `workspace_primary`, `title` instead of `title_detected`, and `path` values without the `sources/` prefix. If you built an index against Scout before this fix, just re-run `build-index.py` on your dossier — it detects legacy entries and rewrites them in place. You'll see a line like `1 migrated from older format` in the output. No need to delete anything.

If for any reason the migration produces unexpected results, you can start fresh: delete `index/master-index.json` and `index/workspaces.json`, then re-run `build-index.py`.

### Ongoing ingest (optional)

For continuous ingest instead of periodic manual exports, run a Telegram ingester service that uses the Telegram Bot API to pull new messages on a schedule and write them into `sources/telegram/` automatically. This service lives outside Scout (substrate stays read-only). Reach out if you want a reference implementation.

## ChatGPT

ChatGPT offers built-in data export as JSON. Scout ships a converter with update-aware imports and optional hard-exclude filters.

### Export from ChatGPT

1. In ChatGPT: **Settings → Data controls → Export data**
2. Confirm your email; ChatGPT emails you a download link within a few hours (sometimes up to 24)
3. Download and unzip; you're looking for `conversations.json` at the top level (usually in `~/Downloads/chatgpt-export/`)

### Convert to markdown

Basic use (imports every conversation):

```bash
python3 scripts/chatgpt-to-md.py ~/Downloads/chatgpt-export/conversations.json --output-dir "$DOSSIER_ROOT/sources/chatgpt/"
```

With optional flags for keyword counting, hard-exclude, and report CSV:

```bash
python3 scripts/chatgpt-to-md.py \
    ~/Downloads/chatgpt-export/conversations.json \
    --output-dir "$DOSSIER_ROOT/sources/chatgpt/" \
    --keywords "qi7,voyager,lucen,mirrortees,agaboo" \
    --exclude-title-contains "therapy,personal" \
    --exclude-keyword-any "prescription,medical" \
    --report ~/Desktop/chatgpt-import-report.csv
```

Flags:

- **`--keywords "..."`** — comma-separated keywords to count per conversation. Each keyword becomes a `hits:<keyword>` column in the report CSV. Used for tracking which chats mention your topics of interest.
- **`--exclude-title-contains "..."`** — comma-separated terms. Any conversation whose title contains any of these (case-insensitive) is skipped entirely. Good fail-safe for personal content.
- **`--exclude-keyword-any "..."`** — comma-separated terms. Any conversation whose message body contains any of these (case-insensitive) is skipped entirely. Stronger privacy fail-safe.
- **`--report FILE.csv`** — write a report CSV with match_status, hits per keyword, primary topics, dates, word/message counts. Opens in Numbers or Excel.

Output structure:

```
$DOSSIER_ROOT/sources/chatgpt/
├── .import-state.json   (tracks what was imported; do not edit)
├── 2024-11-15-brainstorming-a-launch-plan.md
├── 2025-03-30-mirrortees-market-and-dropshipping.md
└── 2026-01-05-focus-on-income-engine.md
```

One markdown file per conversation, named by date and title. Each file has a header with title, date, message count, and source, followed by every message with sender and timestamp preserved.

### Update-aware re-imports

The converter maintains a small state file at `<output-dir>/.import-state.json` tracking each conversation's last known message count and update timestamp. On subsequent runs (say, months later with a fresh export):

- Unchanged conversations are **SKIPPED** (fast, no writes)
- Conversations with new messages are **UPDATED** in place (same filename, new content)
- New conversations are added as **NEW**
- Excluded conversations are marked in the report but never written to disk

Summary printed at the end: `X new, Y updated, Z unchanged, N excluded`.

Note: ChatGPT stores conversations as a tree (side-branches happen when you edit a message and resubmit). The converter walks the primary branch to produce a linear transcript. Side-branches are skipped in v1; open an issue if you need them.

## Claude (claude.ai chats)

Anthropic offers data export from claude.ai as JSON. Scout ships a converter with the same update-aware imports, hard-exclude filters, and report CSV as ChatGPT.

### Export from claude.ai

1. Go to **claude.ai** in a browser and log in
2. Click your name/profile (bottom-left corner in most versions)
3. **Settings → Privacy → Export data**
4. Confirm your email; Anthropic emails you a download link (a few hours; sometimes up to 24)
5. Download and unzip (usually to `~/Downloads/data-YYYY-MM-DD/`); you're looking for `conversations.json` at the top level

### Convert to markdown

Basic use:

```bash
python3 scripts/claude-ai-to-md.py ~/Downloads/data-2026-07-11/conversations.json --output-dir "$DOSSIER_ROOT/sources/claude/"
```

Same flags as ChatGPT (`--keywords`, `--exclude-title-contains`, `--exclude-keyword-any`, `--report`):

```bash
python3 scripts/claude-ai-to-md.py \
    ~/Downloads/data-2026-07-11/conversations.json \
    --output-dir "$DOSSIER_ROOT/sources/claude/" \
    --keywords "qi7,voyager,lucen,mirrortees" \
    --exclude-title-contains "therapy,personal" \
    --report ~/Desktop/claude-import-report.csv
```

Output structure:

```
$DOSSIER_ROOT/sources/claude/
├── .import-state.json
├── 2026-03-14-planning-the-launch.md
├── 2026-04-22-project-scoping.md
└── 2026-05-10-substrate-design.md
```

Update-aware re-imports work exactly like ChatGPT: unchanged conversations skipped, changed conversations regenerated, new conversations added. Same `X new, Y updated, Z unchanged, N excluded` summary.

## Claude Code sessions (local)

Claude Code (the CLI tool) stores every session as a JSONL file on your local machine at:

```
~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl
```

Where the encoded project path is your project's working directory with slashes replaced by dashes. For example, `-Users-yourname-projects-my-app` is the folder for `/Users/yourname/projects/my-app`. Each JSONL file is one session.

### Convert to markdown

```bash
python3 scripts/claude-code-to-md.py \
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
python3 scripts/claude-code-to-md.py \
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
python3 scripts/codex-to-md.py ~/.codex/sessions/ --output-dir $DOSSIER_ROOT/sources/codex/

# Or one month:
python3 scripts/codex-to-md.py ~/.codex/sessions/2026/02/ --output-dir $DOSSIER_ROOT/sources/codex/

# Or a single rollout file:
python3 scripts/codex-to-md.py \
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
