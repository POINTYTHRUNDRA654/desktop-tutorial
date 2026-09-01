# Updating Your Local Repository with Fixes

**For developers/contributors who have the repository cloned in GitHub Desktop**

---

## 🚨 STILL CAN'T PULL? — Fix Submodule Error in 2 Steps

If GitHub Desktop shows this error every time you try to pull:

```
Fetching submodule NeMo-Agent-Toolkit
Could not access submodule 'external/lc-deepagents-quickstarts'
Could not access submodule 'external/nat-ui'
Fetching submodule vscode-pull-request-github
Errors during submodule fetch:
        NeMo-Agent-Toolkit
```

**Your local clone has stale submodule entries.** The remote repository is already clean —
you just need to clear out the old local references so GitHub Desktop stops trying to fetch them.

### ✅ Quickest fix — Fresh Clone (recommended for GitHub Desktop users)

1. In GitHub Desktop: **File → Remove Repository…** *(this does NOT delete your files)*
2. Delete the repository folder from your computer
3. In GitHub Desktop: **File → Clone Repository…** → choose `POINTYTHRUNDRA654/mossy-ai`
4. Done — the fresh clone has no stale submodule state

### ✅ Fix without re-cloning — Git Bash / Command Prompt

Open **Git Bash** (or PowerShell) inside your repository folder and run:

```bash
git submodule deinit --all -f
git pull origin master
```

That's it. After these two commands, GitHub Desktop will pull normally again.

---

## Submodule Pull Error — Background

**Why this happens:** The repository previously contained orphaned git submodule entries
(`NeMo-Agent-Toolkit`, `vscode-pull-request-github`) that are not part of this project.
Those entries have been removed from the remote repository, but local clones that existed
before the fix still have the references registered in their local git state. GitHub Desktop
automatically tries to fetch all registered submodules when pulling, which fails because
those external repositories have private or inaccessible nested submodules. The two-command
fix above clears that local state so GitHub Desktop no longer tries to fetch them.

---

## 🎯 Your Situation

You have the Mossy repository cloned on your computer (via GitHub Desktop or git), and:
- Your local copy has merge conflict errors
- We just fixed those issues on the `copilot/validate-version-consistency` branch
- You want to download/pull those fixes to your local repository

---

## ✅ How to Get the Fixes (GitHub Desktop)

### Option 1: Pull Latest Changes (Recommended)

**If you haven't made any local changes you want to keep:**

1. **Open GitHub Desktop**
2. **Make sure you're on the right branch**
   - Look at the top of GitHub Desktop
   - Current branch should show: `copilot/validate-version-consistency`
   - If not, click "Current Branch" and switch to it

3. **Pull the latest changes**
   - Click `Repository` → `Pull` (or press `Ctrl+Shift+P`)
   - OR click the "Fetch origin" button, then "Pull origin"

4. **Done!** Your local repository now has all the fixes

### Option 2: Discard Local Changes and Pull

**If you have local changes that conflict with the fixes:**

1. **Open GitHub Desktop**
2. **Check for uncommitted changes**
   - Look at the left sidebar under "Changes"
   - If you see modified files listed there

3. **Decide what to do with your changes:**

   **Option A: Discard them (get clean fixes)**
   - Right-click on changed files
   - Select "Discard Changes"
   - OR click `Branch` → `Discard All Changes`
   - Then pull: `Repository` → `Pull`

   **Option B: Stash them (save for later)**
   - Click `Branch` → `Stash All Changes`
   - Enter a description like "My local work before pulling fixes"
   - Then pull: `Repository` → `Pull`
   - Later: `Branch` → `Stash` → `Restore` to get your changes back

### Option 3: Fresh Clone (Nuclear Option)

**If nothing else works:**

1. **Backup any local work** (copy files somewhere safe)
2. **Delete your local repository folder**
3. **Re-clone from GitHub Desktop:**
   - File → Clone Repository
   - Choose `POINTYTHRUNDRA654/mossy-ai`
   - Select location
   - Clone!

---

## 🔍 Checking Which Branch You're On

In GitHub Desktop:
- Look at the top: "Current Branch: `branch-name`"
- The fixes are on: `copilot/validate-version-consistency`

To switch branches:
1. Click "Current Branch" dropdown
2. Select `copilot/validate-version-consistency`
3. Click "Switch Branch"

---

## 🚨 Common Issues & Solutions

### Issue: "You have uncommitted changes"

**What it means:** You've edited files locally but haven't committed them.

**Solution:**
```
Option 1: Discard them (if you don't need them)
- Right-click files → "Discard Changes"

Option 2: Commit them first
- Add a commit message
- Click "Commit to [branch-name]"
- Then pull

Option 3: Stash them
- Branch → Stash All Changes
- Pull the fixes
- Branch → Restore Stash (if you want them back)
```

### Issue: "Merge conflicts" after pulling

**What it means:** Your local changes conflict with the remote fixes.

**Solution:**
```
Option 1: Use theirs (take the remote fixes)
- Right-click conflicted files
- Select "Use Version from Remote"
- Commit the merge

Option 2: Resolve manually
- Click on conflicted files
- Edit to fix conflicts (between <<<< and >>>>)
- Remove conflict markers
- Commit the merge

Option 3: Start fresh
- Discard all changes
- Pull again
```

### Issue: "Already up to date" but you don't have the fixes

**What it means:** You're on the wrong branch.

**Solution:**
1. Check current branch (top of GitHub Desktop)
2. Switch to `copilot/validate-version-consistency`
3. Pull again

### Issue: "Can't pull because you have local commits"

**What it means:** You committed changes locally that aren't on remote.

**Solution:**
```
Option 1: Push your commits first
- Click "Push origin"
- Then pull

Option 2: Discard your commits
- Branch → Discard Changes
- Then pull

Option 3: Merge both
- Pull (will merge remote with local)
- Resolve any conflicts
- Push the merge
```

---

## 📋 Quick Command Reference

### Using GitHub Desktop

| Action | How To |
|--------|--------|
| Pull latest changes | `Repository` → `Pull` OR `Ctrl+Shift+P` |
| Discard all changes | `Branch` → `Discard All Changes` |
| Stash changes | `Branch` → `Stash All Changes` |
| Switch branches | Click "Current Branch" dropdown |
| Fetch updates | Click "Fetch origin" button |

### Using Command Line (if you prefer)

```bash
# Check which branch you're on
git branch

# Switch to the fixed branch
git checkout copilot/validate-version-consistency

# Pull the fixes
git pull origin copilot/validate-version-consistency

# If you have local changes you don't want:
git reset --hard origin/copilot/validate-version-consistency

# If you want to save local changes:
git stash
git pull
git stash pop  # (if you want them back)
```

---

## ✅ Verification

After pulling, verify you have the fixes:

1. **Check for merge conflict markers**
   ```bash
   # Search for conflict markers in your code
   grep -r "<<<<<<< Updated upstream" src/
   ```
   If this returns nothing, you're good!

2. **Try building**
   ```bash
   npm run build
   ```
   Should complete without TypeScript errors about missing types

3. **Check recent commits**
   - In GitHub Desktop, click "History" tab
   - You should see recent commits with messages like:
     - "Fix: Resolve all Git merge conflicts"
     - "Add missing TypeScript type definitions"
     - etc.

---

## 🎯 Summary: What You Need to Do

1. **Open GitHub Desktop**
2. **Switch to branch:** `copilot/validate-version-consistency`
3. **Pull latest changes:** `Repository` → `Pull`
4. **If you have local changes:** Discard or stash them first
5. **Verify:** Check that merge conflicts are gone

That's it! Your local repository will now have all the fixes we just made.

---

## 🆘 Still Having Issues?

**Can't figure it out?**

**Safest option:** Fresh clone
1. Backup any files you changed (copy to desktop)
2. Delete the repository folder completely
3. Clone fresh from GitHub Desktop
4. You'll get a clean copy with all fixes

**Need the command line approach?**
```bash
# Navigate to your repository
cd /path/to/mossy-ai

# Discard all local changes
git reset --hard

# Switch to the fixed branch
git checkout copilot/validate-version-consistency

# Pull the fixes
git pull origin copilot/validate-version-consistency
```

---

## 📚 Related Guides

- **App Upgrade (for end users):** [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md)
- **Getting Started:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## TL;DR

**You have the source code repository cloned. We fixed bugs. How to get fixes:**

1. Open GitHub Desktop
2. Make sure you're on `copilot/validate-version-consistency` branch
3. Click `Repository` → `Pull`
4. If it complains about local changes: Discard them
5. Done - you have the fixes!
