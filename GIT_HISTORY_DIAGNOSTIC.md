# Git History Diagnostic Guide

## What Happened to Your Repository?

Based on your description, you had working code last night, but today things look different. This guide will help you:
1. **Understand what changed** in your repository
2. **View the history** of your files
3. **Recover previous versions** if needed

---

## Current Repository Status

**Current Branch:** `copilot/debug-visual-c-issues`

**Recent Commits:**
- `53bd243` - Initial plan (Feb 11, 2026)
- `33d44ea` - Remove old release and build artifacts (Feb 9, 2026)

---

## Step 1: View All Branches

Your repository might have multiple branches. The code you were working on last night might be on a different branch.

```bash
# View all local branches
git branch

# View all branches (including remote)
git branch -a

# View branches with last commit info
git branch -v
```

**What to look for:** Check if there's a branch with your recent work (like `main`, `master`, `development`, etc.)

---

## Step 2: Check Git History

### View Recent Commits on Current Branch
```bash
# View last 20 commits with dates
git log --oneline --graph --decorate -20

# View detailed commit history
git log --all --graph --decorate --oneline -50

# View commits from the last week
git log --since="1 week ago" --all --oneline
```

### Search for Specific Content
If you remember working on something specific (like "Visual C"):

```bash
# Search commit messages for keywords
git log --all --grep="Visual" --oneline

# Search for content in all commits
git log -S "Visual C" --all --oneline

# Search for file changes
git log --all --name-status --oneline | grep -i "visual"
```

---

## Step 3: Compare Branches

If you find multiple branches, you can compare them:

```bash
# Compare current branch with main
git diff main..HEAD

# List files that differ between branches
git diff --name-only main..HEAD

# Show commits on current branch but not on main
git log main..HEAD --oneline
```

---

## Step 4: View File History

If you know which file was "gone" or changed:

```bash
# See all changes to a specific file
git log --follow --all -- path/to/file.txt

# View file content from a specific commit
git show <commit-hash>:path/to/file.txt

# View file content from yesterday
git show HEAD@{yesterday}:path/to/file.txt
```

---

## Step 5: Recover Previous Versions

### Option A: View a File from a Previous Commit
```bash
# View file from specific commit (doesn't change working directory)
git show <commit-hash>:path/to/file.txt

# Save file from previous commit to new location
git show <commit-hash>:path/to/file.txt > recovered_file.txt
```

### Option B: Checkout an Entire Commit
```bash
# View repository state at specific commit (detached HEAD)
git checkout <commit-hash>

# Return to current branch
git checkout copilot/debug-visual-c-issues
```

### Option C: Restore Specific Files
```bash
# Restore file from specific commit
git checkout <commit-hash> -- path/to/file.txt

# Restore file from previous commit
git checkout HEAD~1 -- path/to/file.txt
```

---

## Step 6: Check Remote Repository

Your local copy might be out of sync with GitHub:

```bash
# Fetch latest from remote (doesn't change local files)
git fetch origin

# View all remote branches
git branch -r

# Compare local with remote
git log HEAD..origin/main --oneline

# Pull latest changes from remote
git pull origin main
```

---

## Step 7: Find Lost Commits (RefLog)

Git keeps a history of all changes, even deleted commits:

```bash
# View reflog (all recent Git operations)
git reflog

# View detailed reflog
git reflog show --all --date=iso

# Checkout a commit from reflog
git checkout HEAD@{2}
```

---

## Common Scenarios & Solutions

### Scenario 1: "I Downloaded This Copy and It's Different"
**Cause:** You might have downloaded a different branch or an older version.

**Solution:**
1. Check which branch you're on: `git branch`
2. Switch to your working branch: `git checkout main` (or your branch name)
3. Pull latest changes: `git pull origin main`

### Scenario 2: "My Files Are Gone"
**Cause:** Files might have been deleted in a recent commit, or you're on a different branch.

**Solution:**
1. Check git log for deletion: `git log --all --full-history -- path/to/missing/file`
2. Restore file: `git checkout <commit-before-deletion> -- path/to/file`

### Scenario 3: "Everything Was Working Last Night"
**Cause:** Changes were committed or you switched branches.

**Solution:**
1. Check what changed since yesterday: `git log --since="yesterday" --oneline`
2. View yesterday's state: `git show HEAD@{yesterday}`
3. Reset to yesterday (careful!): `git reset --hard HEAD@{yesterday}`

### Scenario 4: "Visual C Files Are Missing"
Based on your repository, "Visual C" might refer to:
- The `VISUAL_GUIDE.md` file (which exists in your current repo)
- Visual Studio Code configuration files
- C/C++ related files

**Check for specific files:**
```bash
# Search for Visual-related files
find . -name "*visual*" -o -name "*Visual*"

# Search in git history
git log --all --name-status | grep -i visual
```

---

## What's in Your Current Repository?

Your current repository is **Mossy v5.4.21** - a Fallout 4 Modding Assistant desktop application.

### Key Files Present:
- `VISUAL_GUIDE.md` - Onboarding visual guide (24KB) ✅ EXISTS
- `README.md` - Main documentation
- `package.json` - Node.js project configuration
- Source code in `src/` directory

### Important Locations:
- Main code: `/src`
- Documentation: Various `.md` files in root
- Configuration: `.env.example`, `package.json`, `vite.config.mts`

---

## Emergency Recovery Commands

### Create a Backup First!
```bash
# Create a backup branch of current state
git branch backup-$(date +%Y%m%d-%H%M%S)
```

### Reset to Specific Commit (CAREFUL!)
```bash
# Soft reset (keeps changes in working directory)
git reset --soft <commit-hash>

# Hard reset (DESTROYS uncommitted changes!)
git reset --hard <commit-hash>
```

### Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

---

## Next Steps

1. **Identify your target:** What specific content or state are you looking for?
2. **Find the commit:** Use `git log` commands above to find when it existed
3. **Compare versions:** Use `git diff` to see what changed
4. **Recover if needed:** Use `git checkout` or `git show` to recover files

---

## Need More Help?

Run these diagnostic commands and share the output:

```bash
# Full diagnostic
git log --all --oneline --graph --decorate -30 > git_history.txt
git branch -a > git_branches.txt
git reflog --date=iso > git_reflog.txt
git status > git_status.txt

# Search for Visual-related content
git log --all --name-status | grep -i visual > visual_history.txt
```

Then review these files to understand what happened.

---

## Repository Information

- **Repository:** POINTYTHRUNDRA654/desktop-tutorial
- **Current Branch:** copilot/debug-visual-c-issues
- **Project Type:** Electron + React + TypeScript desktop application
- **Purpose:** Fallout 4 modding assistant (Mossy)

---

*Created: February 11, 2026*
*This diagnostic guide helps you investigate and recover from repository issues.*
