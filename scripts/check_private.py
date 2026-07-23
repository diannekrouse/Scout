#!/usr/bin/env python3
"""
Privacy guard for Scout — keeps private collaborator material out of the
public repo. This is the mechanical "check to make sure it never goes public."

Two modes:
    python3 scripts/check_private.py --staged   # scan staged changes (pre-commit)
    python3 scripts/check_private.py --tree     # scan all tracked files (full audit)

Rules:
  1. Email addresses — a personal email almost never belongs in a public repo
     (an allowlist covers the commit-trailer address).
  2. Regexes from an optional, git-IGNORED `.privacy-denylist` at the repo root
     (one regex per line; `#` comments). Genuinely-sensitive names live ONLY in
     that local file, never in a committed one. See `.privacy-denylist.example`.

Exit 0 = clean, 1 = findings. The pre-commit hook (hooks/pre-commit) runs
`--staged` and blocks the commit on any finding. Findings print to the terminal
only; nothing sensitive is ever written to disk by this script.

No external dependencies (Python standard library only).
"""

import re
import subprocess
import sys
from pathlib import Path

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Addresses that are expected in this repo (commit trailers, etc.).
EMAIL_ALLOW = {"noreply@anthropic.com"}
# Never scan these (they legitimately hold examples, or are dependency
# metadata full of third-party author emails that are not our concern).
SELF_SKIP = {"scripts/check_private.py", ".privacy-denylist.example",
             "docs/privacy-guard.md", "package-lock.json"}
BINARY_EXT = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf",
              ".woff", ".woff2", ".ttf", ".otf", ".zip", ".gz", ".wav",
              ".mp3", ".mp4", ".db"}


def repo_root() -> Path:
    return Path(subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], text=True).strip())


def load_denylist(root: Path):
    f = root / ".privacy-denylist"
    pats = []
    if f.exists():
        for ln in f.read_text(encoding="utf-8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#"):
                try:
                    pats.append(re.compile(ln))
                except re.error:
                    print(f"[warn] bad regex in .privacy-denylist: {ln}")
    return pats


def scan(text: str, denylist):
    hits = []
    for m in EMAIL.finditer(text):
        if m.group(0).lower() not in EMAIL_ALLOW:
            hits.append(("email", m.group(0)))
    for pat in denylist:
        m = pat.search(text)
        if m:
            hits.append(("denylist", m.group(0)))
    return hits


def should_skip(rel: str) -> bool:
    return rel in SELF_SKIP or Path(rel).suffix.lower() in BINARY_EXT


def staged_added(root: Path):
    out = subprocess.check_output(
        ["git", "diff", "--cached", "--unified=0", "--no-color"], text=True)
    cur = None
    for ln in out.splitlines():
        if ln.startswith("+++ b/"):
            cur = ln[6:]
        elif ln.startswith("+") and not ln.startswith("+++"):
            if not should_skip(cur or ""):
                yield cur or "?", ln[1:]


def tracked(root: Path):
    out = subprocess.check_output(["git", "ls-files"], text=True)
    for rel in out.splitlines():
        if should_skip(rel):
            continue
        try:
            raw = (root / rel).read_bytes()
        except OSError:
            continue
        if b"\x00" in raw[:8192]:  # binary — skip
            continue
        yield rel, raw.decode("utf-8", errors="ignore")


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "--staged"
    root = repo_root()
    denylist = load_denylist(root)
    findings = []
    if mode == "--tree":
        for rel, text in tracked(root):
            for kind, match in scan(text, denylist):
                findings.append((rel, kind, match))
    else:
        for rel, line in staged_added(root):
            for kind, match in scan(line, denylist):
                findings.append((rel, kind, match))

    if findings:
        print("PRIVACY GUARD: BLOCKED — private material detected:")
        for rel, kind, match in findings[:40]:
            print(f"  {rel}: [{kind}] {match}")
        if len(findings) > 40:
            print(f"  … and {len(findings) - 40} more")
        print("\nRemove the content before committing. If it is a false positive,")
        print("adjust .privacy-denylist or EMAIL_ALLOW. (No commit was made.)")
        return 1

    scope = "tree" if mode == "--tree" else "staged"
    print(f"PRIVACY GUARD: clean ({scope}; {len(denylist)} custom pattern(s) active).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
