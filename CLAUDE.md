# Scout — working rules for AI sessions

Scout is a read-only reader over a plain-file substrate (sources + JSON
index) with line-level provenance. Current work: the concept graph and
Tracking. **Re-entry point: read `docs/graph-roadmap.md`, continue from
"Sensible next actions."** Prototype: `prototypes/tracking/`.

## Non-negotiables

1. **Determinism boundary.** No model calls at read time, ever. AI works at
   ingest (separate scripts); the reader only reads. Pipeline scripts are
   Python-stdlib-only, stamp `generated_by`, and refuse to overwrite files
   they didn't generate without `--force`.
2. **Receipts for claims — the anti-confabulation rule.** Never state the
   contents of a document, chat, or search result unless that text exists in
   a tool result from THIS session. Quotes must be copy-able from context.
   If something wasn't read, say "unread — inferred." Never report a tool
   action (read, run, push) that didn't visibly happen. This rule exists
   because a fluent false summary of an unread PDF was caught here on
   2026-07-23 — by a human asking "what was the source?"
3. **Private material stays out of this public repo.** Shared documents from
   collaborators, personal chat content, and compiled personal bundles never
   enter the git tree (scratchpad or the user's private DOSSIER_ROOT only).
   Pushing is publishing.
4. **Evidence anchors.** Edge evidence = `{segment, from_offset, to_offset,
   source_hash}` + stored verbatim quote as recovery key; displayed quotes
   are derived from lines at render time; hash mismatch → re-search →
   visible `unverified`, never silent. (Full contract in the roadmap.)

## The audit ritual

When the user says **"audit"** (or before any external handoff — messages
to collaborators, PRs, demos): list every factual claim made since the last
audit, tag each `[receipt: <tool result>]` or `[inferred — unverified]`,
and retract anything that can't be tagged. Treat plausibility as the enemy:
the more fluent an unreceipted claim, the more suspicious.

When you cannot find the receipt for a prior claim, do NOT confess
fabrication and do NOT double down — both are memory guessing at memory.
Retrieve the actual transcript/source and check. Your recollection of your
own past turns is unreliable in both directions: it invents what wasn't
there AND disowns what was (both happened here 2026-07-23 — a real read was
falsely "retracted," and two fabrications were asserted; only the on-disk
transcript settled it). Absence of a visible receipt is not evidence of
invention.

## Session memory — retrieve, don't recall

Your live context is a lossy working set that compresses older turns; the
full session transcript on disk is ground truth. If you cannot SEE a prior
turn in context, retrieve it from the consolidated chat in the dossier
(`sources/claude-code/…`) with provenance rather than trusting recall.
Consolidate sessions into the **private** dossier regularly (end of session,
or on a schedule) via `scripts/consolidate-chats.sh` — never into this public
repo. This is the working-set + long-term-store split: recent context lives
in the window; everything older is retrievable, with receipts.

## Verification bar for code

Nothing is "done" untested: pipeline scripts run against
a fixture dossier; reader changes get typecheck + lint + a real browser
pass where feasible. Say plainly what was and wasn't verified.
