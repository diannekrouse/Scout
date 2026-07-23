#!/usr/bin/env bash
# consolidate-chats.sh — fold Claude Code sessions into a PRIVATE dossier as
# provenance-carrying, searchable sources. Run regularly (cron, or a Claude Code
# Stop/SessionStart hook). Writes ONLY to your private DOSSIER_ROOT — never this
# public repo (chat transcripts hold personal + collaborator material).
#
# Usage:
#   scripts/consolidate-chats.sh <claude-projects-dir> <dossier-root>
# Example (local machine):
#   scripts/consolidate-chats.sh ~/.claude/projects/-Users-you-scout "$DOSSIER_ROOT"
set -euo pipefail
PROJECTS="${1:?usage: consolidate-chats.sh <claude-projects-dir> <dossier-root>}"
DOSSIER="${2:?usage: consolidate-chats.sh <claude-projects-dir> <dossier-root>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 "$HERE/claude-code-to-md.py" "$PROJECTS" --output-dir "$DOSSIER/sources/claude-code/"
python3 "$HERE/build-index.py" --dossier-root "$DOSSIER"
python3 "$HERE/segment.py"     --dossier-root "$DOSSIER"
echo
echo "Consolidated. Sessions are now searchable in the dossier with line-level"
echo "provenance. Retrieve any past turn by its source + lines instead of recalling it."
