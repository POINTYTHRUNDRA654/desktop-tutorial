"""sync_state.py — Generate SYNC_STATE.md from git history.

Run this script from the repository root on EITHER side (GitHub CI or desktop)
to regenerate the SYNC_STATE.md file with up-to-date information.

    python sync_state.py

What it does
------------
1. Reads git log to find every commit that touched the repo.
2. Builds a per-file table showing the last commit, date, and author for
   every tracked file.
3. Categorises files into "owned by GitHub (Copilot)" vs "neutral" vs
   "desktop-originated" based on commit author.
4. Preserves any <!-- DESKTOP_NOTES --> block that the desktop user has
   written inside the existing SYNC_STATE.md so it is not overwritten.
5. Writes the result back to SYNC_STATE.md.

Desktop workflow
----------------
After pulling from GitHub, run::

    python sync_state.py

Then open SYNC_STATE.md in any text editor and fill in the
"Desktop Notes" section to record what you changed locally before pushing.
"""

from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "SYNC_STATE.md"

# Authors whose commits are considered "GitHub / Copilot side".
# Edit this list if you add other CI bots.
GITHUB_AUTHORS = {
    "copilot-swe-agent[bot]",
    "github-actions[bot]",
    "dependabot[bot]",
    "copilot",
}

# Files the desktop should treat as READ-ONLY unless a code change makes it
# strictly necessary to edit them.  Populated automatically from git history
# but shown explicitly here so the list is visible without running git.
GITHUB_OWNED_PATTERNS = [
    r"^\.github/",
    r"^makezip\.py$",
    r"^sync_state\.py$",
    r"^SYNC_STATE\.md$",
    r"^MERGE_GUIDE\.md$",
    r"^DEVELOPMENT_NOTES\.md$",
    r"^CHANGELOG\.md$",
]


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def _run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    return result.stdout.strip()


def _git_log_entries() -> list[dict]:
    """Return one dict per commit (sha, author, date_iso, subject, files)."""
    raw = _run([
        "git", "log", "--all",
        "--pretty=format:COMMIT|%H|%an|%ai|%s",
        "--name-only",
    ])
    commits: list[dict] = []
    current: dict | None = None
    for line in raw.splitlines():
        if line.startswith("COMMIT|"):
            if current is not None:
                commits.append(current)
            _, sha, author, date_iso, subject = line.split("|", 4)
            current = {
                "sha": sha[:10],
                "author": author,
                "date_iso": date_iso,
                "subject": subject,
                "files": [],
            }
        elif line.strip() and current is not None:
            current["files"].append(line.strip())
    if current is not None:
        commits.append(current)
    return commits


def _last_touch_per_file(commits: list[dict]) -> dict[str, dict]:
    """For every file, return the most-recent commit that touched it."""
    seen: dict[str, dict] = {}
    for commit in commits:  # commits are newest-first
        for f in commit["files"]:
            if f not in seen:
                seen[f] = commit
    return seen


def _current_sha() -> str:
    return _run(["git", "rev-parse", "--short", "HEAD"])


def _current_branch() -> str:
    return _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])


def _is_github_author(author: str) -> bool:
    a = author.lower()
    return any(g in a for g in GITHUB_AUTHORS)


def _is_github_owned(path: str) -> bool:
    return any(re.match(pat, path) for pat in GITHUB_OWNED_PATTERNS)


# ---------------------------------------------------------------------------
# Desktop-notes preservation
# ---------------------------------------------------------------------------

_DESKTOP_NOTES_START = "<!-- DESKTOP_NOTES_START -->"
_DESKTOP_NOTES_END   = "<!-- DESKTOP_NOTES_END -->"

_DEFAULT_DESKTOP_NOTES = """\
<!-- DESKTOP_NOTES_START -->
## 🖥️ Desktop Notes  ← Edit this section on your local machine

> Fill in what you changed locally **before** pushing to GitHub.
> This section is preserved every time `python sync_state.py` is re-run.

### Last desktop sync
- Date: *(fill in)*
- Desktop git SHA: *(run `git rev-parse --short HEAD` and paste here)*

### Files I changed on the desktop
| File | Why I changed it | OK to push? |
|------|-----------------|-------------|
| *(filename)* | *(reason)* | Yes / No |

### Notes / reminders
*(anything you want to remember about the desktop state)*

<!-- DESKTOP_NOTES_END -->"""


def _preserve_desktop_notes(existing_text: str) -> str:
    """Extract the DESKTOP_NOTES block from an existing SYNC_STATE.md."""
    start = existing_text.find(_DESKTOP_NOTES_START)
    end   = existing_text.find(_DESKTOP_NOTES_END)
    if start == -1 or end == -1:
        return _DEFAULT_DESKTOP_NOTES
    return existing_text[start : end + len(_DESKTOP_NOTES_END)]


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def _fmt_date(date_iso: str) -> str:
    """'2026-03-05 19:27:24 +0000' → '2026-03-05 19:27 UTC'"""
    try:
        dt = datetime.fromisoformat(date_iso)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    except (ValueError, OverflowError):
        return date_iso[:16]


def generate(output: Path = OUTPUT) -> None:
    commits = _git_log_entries()
    last_touch = _last_touch_per_file(commits)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sha = _current_sha()
    branch = _current_branch()

    # Preserve any existing desktop notes
    desktop_notes = _DEFAULT_DESKTOP_NOTES
    if output.exists():
        desktop_notes = _preserve_desktop_notes(output.read_text(encoding="utf-8"))

    # Split files into GitHub-owned vs neutral
    github_files: list[tuple[str, dict]] = []
    neutral_files: list[tuple[str, dict]] = []
    for path, commit in sorted(last_touch.items()):
        if _is_github_author(commit["author"]) or _is_github_owned(path):
            github_files.append((path, commit))
        else:
            neutral_files.append((path, commit))

    # Recent commit table (last 10)
    recent_rows = ""
    for c in commits[:10]:
        side = "🤖 GitHub" if _is_github_author(c["author"]) else "🖥️ Desktop"
        recent_rows += (
            f"| `{c['sha']}` | {_fmt_date(c['date_iso'])} | {c['author']} "
            f"| {side} | {c['subject'][:60]} |\n"
        )

    # GitHub-owned files table
    gh_rows = ""
    for path, c in github_files:
        gh_rows += f"| `{path}` | {_fmt_date(c['date_iso'])} | {c['sha']} |\n"

    lines = [
        "<!-- AUTO-GENERATED by sync_state.py — do NOT hand-edit above the Desktop Notes section -->",
        "",
        "# Sync State",
        "",
        "> **Purpose:** This file is the shared memory between GitHub and your desktop clone.",
        "> Both sides update it so neither accidentally overwrites the other's work.",
        "> Run `python sync_state.py` after every `git pull` to refresh it.",
        "",
        "---",
        "",
        "## 📍 Current GitHub State",
        "",
        f"| Key | Value |",
        f"|-----|-------|",
        f"| Branch | `{branch}` |",
        f"| HEAD commit | `{sha}` |",
        f"| Generated at | {now} |",
        f"| Total commits tracked | {len(commits)} |",
        f"| Total files tracked | {len(last_touch)} |",
        "",
        "---",
        "",
        "## 🕒 Recent Commits (last 10)",
        "",
        "| SHA | Date (UTC) | Author | Side | Summary |",
        "|-----|-----------|--------|------|---------|",
        recent_rows.rstrip(),
        "",
        "---",
        "",
        "## 🔒 GitHub-Owned Files — Do NOT overwrite from desktop",
        "",
        "These files were last changed by GitHub/Copilot CI.  **Do not replace them",
        "with older desktop copies.**  If you need to edit them, make the smallest",
        "possible change and document it in the Desktop Notes section below.",
        "",
        "| File | Last changed | Commit |",
        "|------|-------------|--------|",
        gh_rows.rstrip(),
        "",
        "---",
        "",
        "## 📋 Merge Rules",
        "",
        "When pulling GitHub changes onto your desktop, follow these rules:",
        "",
        "| Situation | Action |",
        "|-----------|--------|",
        "| GitHub changed a file, desktop did NOT | Accept GitHub's version (`git checkout origin/main -- <file>`) |",
        "| Desktop changed a file, GitHub did NOT | Keep your desktop version |",
        "| Both sides changed the same file | Merge carefully; GitHub's logic fixes take priority for `.py` files |",
        "| File is in the 🔒 table above | Use GitHub's version unless it physically breaks the add-on |",
        "| Large binaries (ffmpeg, whisper, etc.) | NEVER commit; they are in `.gitignore` |",
        "| `fallout4_tutorial_helper-*.zip` | Let `makezip.py` rebuild it; do not push old desktop zips |",
        "",
        "---",
        "",
        "## 🚀 Quick Commands",
        "",
        "```powershell",
        "# Refresh this file after a pull",
        "python sync_state.py",
        "",
        "# See what GitHub changed that you don't have yet",
        "git fetch origin",
        "git diff HEAD origin/main --name-only",
        "",
        "# Accept ALL of GitHub's version for a specific file",
        "git checkout origin/main -- path/to/file.py",
        "",
        "# Rebuild the lean add-on zip",
        "python makezip.py",
        "",
        "# Full safe-merge workflow",
        "git fetch origin",
        "python sync_state.py          # see what GitHub changed",
        "git merge -X theirs origin/main --no-edit",
        "python makezip.py",
        "git add .",
        'git commit -m "Desktop merge + rebuild zip"',
        "git push",
        "```",
        "",
        "---",
        "",
        desktop_notes,
        "",
        "---",
        "",
        f"*Last regenerated: {now} by `sync_state.py` on `{branch}` @ `{sha}`*",
    ]

    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Written {output.relative_to(ROOT)}")


if __name__ == "__main__":
    generate()
