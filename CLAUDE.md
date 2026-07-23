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

## Verification bar for code

Nothing is "done" untested: pipeline scripts run against
a fixture dossier; reader changes get typecheck + lint + a real browser
pass where feasible. Say plainly what was and wasn't verified.
