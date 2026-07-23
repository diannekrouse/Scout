# Privacy guard — keeping private material out of a public repo

Scout is a **public** repository. Collaborators' unpublished documents, personal
chat content, and private substrate details must never be committed. This guard
is the mechanical check that enforces that ("pushing is publishing").

## What it does

`scripts/check_private.py` scans for two things:

1. **Email addresses** — a personal email almost never belongs in a public repo
   (an allowlist covers the commit-trailer address; dependency lockfiles and
   binary assets are skipped).
2. **Custom fingerprints** — Python regexes from a **git-ignored** local file,
   `.privacy-denylist`, at the repo root. Genuinely-sensitive names (a
   collaborator's unpublished project names, private schema types, etc.) live
   **only** in that local file — never in anything committed, so the sensitive
   strings themselves never enter the repo, not even in the guard's config.

## Setup (once per clone)

```sh
cp .privacy-denylist.example .privacy-denylist   # then edit in your fingerprints
git config core.hooksPath hooks                  # activate the pre-commit hook
```

After that, every `git commit` runs `check_private.py --staged` and **blocks the
commit** if a staged change adds a flagged string. To disable temporarily:
`git commit --no-verify` (use sparingly), or `git config --unset core.hooksPath`.

## Full audit (any time)

```sh
python3 scripts/check_private.py --tree
```

Scans every tracked text file. Exit 0 = clean. Findings print to your terminal
only — this script never writes matched content to disk.

## What is intentionally NOT flagged

Public design references we model after — `Goertzel`, `Hyperon`, `MeTTa`,
`cognitive synergy`, `glocal memory`, `waterhole`, `attractor`, `CC-2B` — are
legitimate and kept. The guard targets *private, unpublished* material, not the
public ideas the project builds on. Pre-existing project names already in the
repo's own history are likewise not in the default denylist; add them yourself
if you decide they should be scrubbed.

## Audit log

Append one row per full-tree audit. Record **metadata only** — never the matched
strings.

| Date (UTC)  | Scope | Patterns | Result | By |
|-------------|-------|----------|--------|----|
| 2026-07-23  | tree  | 11       | clean — 0 findings | graph session (Opus 4.8) |
