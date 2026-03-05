# Merging Your Desktop Clone with GitHub — Step-by-Step Guide

This guide explains exactly how to pull the latest GitHub version of the add-on
onto your desktop and resolve the "file too large" problem that prevents you from
pushing.

> 💡 **New: [`SYNC_STATE.md`](SYNC_STATE.md)** — run `python sync_state.py` after
> every `git pull` to see a table of every file GitHub last changed, who changed it,
> and the merge rules to follow.  Your personal desktop notes live there too.

---

## ⚡ GitHub Desktop shows "Push" and won't let you Pull — fix this first

This is the most common blocker.  GitHub Desktop shows a **"Push X commits"**
button (instead of Pull) when your local branch has commits that GitHub hasn't
seen yet.  This usually happens because `sync_state.py` or another local script
created a commit on your desktop that you haven't pushed yet.

### Quickest fix — 4 clicks in GitHub Desktop

1. Open **GitHub Desktop**.
2. In the top menu bar choose **Repository → Open in Command Prompt** (or
   PowerShell / Terminal).
3. Run **one** of these commands to discard the local-only commits and reset
   your branch to exactly what GitHub has:

   **If you are on `main`:**
   ```powershell
   git fetch origin
   git reset --hard origin/main
   ```

   **If you are on the `copilot/install-git-lfs` branch** (where the zip lives):
   ```powershell
   git fetch origin
   git reset --hard origin/copilot/install-git-lfs
   ```

4. Go back to **GitHub Desktop** — it now shows **"Pull origin"**. Click it.
   The latest `fallout4_tutorial_helper-v2.1.2.zip` will be downloaded.

> **Why `git reset --hard`?**  `sync_state.py` generates a new `SYNC_STATE.md`
> every time you run it and the guide tells you to commit it locally.  But the
> CI also regenerates it after every push to `main`, so the two versions
> diverge.  `reset --hard` discards only the local commits you haven't pushed,
> keeping all your actual source-code files.

### Get the zip right now — no git needed

If you just want the zip immediately without fixing git:

1. Go to: **https://github.com/POINTYTHRUNDRA654/Blender-add-on./tree/copilot/install-git-lfs**
2. Click `fallout4_tutorial_helper-v2.1.2.zip`
3. Click **Download raw file** (the download icon on the right).
4. Install directly in Blender.

---

## GitHub Desktop says "files too big" — fix this first

This happens when **Git LFS is installed on a non-default drive** (e.g. `D:`)
so GitHub Desktop cannot find the `git-lfs.exe` executable.

### One-time fix (run once, then restart GitHub Desktop)

1. Open **Command Prompt** or **PowerShell** in the repository folder.
2. Run the setup script — it will find git-lfs on `D:`, permanently add it to
   your user PATH, and initialise the LFS hooks:
   ```bat
   setup.bat
   ```
3. **Close and reopen GitHub Desktop** (it reads PATH at startup).
4. Click **Pull origin** in GitHub Desktop — it will now download LFS objects
   correctly and the "files too big" warning will be gone.

> **Why this is needed**: GitHub Desktop bundles its own Git but relies on the
> Windows user PATH to find `git-lfs.exe`.  If Git LFS was installed to
> `D:\Program Files\Git\cmd\` or `D:\Programs\Git LFS\` instead of the default
> `C:\Program Files\Git\cmd\`, GitHub Desktop cannot see it until that directory
> is on PATH.  `setup.bat` calls `setx PATH` to add it permanently (no admin
> rights required).

---

## Why the "file too large" error happened

The add-on zip (`fallout4_tutorial_helper-v2.1.2.zip`) previously bundled the
entire **act** tool repository — including its embedded `.git` pack files — plus
potentially large `ffmpeg/` and `whisper/` directories.  That grew the zip to
**26 MB** (or larger if you downloaded ffmpeg locally), which hit GitHub's 100 MB
per-file limit when you tried to push.

**This has been fixed**: `makezip.py` now only packages Python source files and
documentation.  The new zip is **~505 KB**.  The zip is now also tracked by
**Git LFS** (see `.gitattributes`) so even a larger zip will never block a push.

---

## Option A — Clean pull (recommended, fastest)

Use this if you want the GitHub version of every file and you only need to keep
your personal Blender project files (`.blend`, textures, exports).

### Windows (PowerShell or Git Bash)

```powershell
# 1. Open PowerShell or Git Bash and navigate to your clone
cd "C:\path\to\Blender-add-on."

# 2. Fetch the latest code from GitHub
git fetch origin

# 3. Remove the old large zip that GitHub rejects
git rm --cached fallout4_tutorial_helper-v2.1.2.zip 2>$null
del fallout4_tutorial_helper-v2.1.2.zip   # PowerShell
# rm fallout4_tutorial_helper-v2.1.2.zip  # Git Bash / macOS / Linux

# 4. Remove any locally-downloaded ffmpeg / whisper binaries from git tracking
#    (they live in ffmpeg\ and whisper\ at the repo root)
git rm --cached -r ffmpeg whisper tools\intellicode 2>$null

# 5. Reset your branch to match GitHub exactly
git reset --hard origin/main

# 6. That's it — you now have the latest code with a clean, small zip
```

### macOS / Linux

```bash
cd /path/to/Blender-add-on.
git fetch origin
git rm --cached fallout4_tutorial_helper-v2.1.2.zip 2>/dev/null || true
rm -f fallout4_tutorial_helper-v2.1.2.zip
git rm --cached -r ffmpeg whisper tools/intellicode 2>/dev/null || true
git reset --hard origin/main
```

---

## Option B — Keep your local Python changes, discard large files

Use this if you made changes to `.py` files that you want to keep, but you want
to throw away the old large zip and any downloaded binaries.

```powershell
# Windows PowerShell
cd "C:\path\to\Blender-add-on."

# 1. Fetch latest from GitHub
git fetch origin

# 2. Remove only the large/binary files — keep your source changes
git rm --cached fallout4_tutorial_helper-v2.1.2.zip 2>$null
del fallout4_tutorial_helper-v2.1.2.zip
git rm --cached -r ffmpeg whisper tools\intellicode 2>$null

# 3. Merge GitHub's main branch into your local branch
#    (-X theirs tells git to prefer GitHub's version when there is a conflict)
git merge -X theirs origin/main --no-edit

# 4. Rebuild the lean add-on zip from your current source
python makezip.py

# 5. Stage everything and push
git add .
git commit -m "Merge GitHub updates; rebuild lean zip"
git push
```

---

## Option C — Already tried to push and got "rejected — file too large"

GitHub rejected your push because a file over 100 MB was in your commit history.
You need to rewrite history to remove it.

```powershell
# Windows PowerShell / Git Bash
cd "C:\path\to\Blender-add-on."

# 1. Find the commit that first added the large zip
git log --all --oneline -- fallout4_tutorial_helper-v2.1.2.zip

# 2. Use git-filter-repo (install once: pip install git-filter-repo)
#    to remove the large file from every commit
git filter-repo --path fallout4_tutorial_helper-v2.1.2.zip --invert-paths --force

# 3. Re-add the remote (filter-repo removes it for safety)
git remote add origin https://github.com/POINTYTHRUNDRA654/Blender-add-on.

# 4. Fetch and reset to GitHub's latest
git fetch origin
git reset --hard origin/main

# 5. Rebuild the lean zip
python makezip.py
git add fallout4_tutorial_helper-v2.1.2.zip
git commit -m "Add lean add-on zip (source only, no binaries)"
git push --force-with-lease
```

> **Note:** `--force-with-lease` is safer than `--force` — it fails if someone
> else pushed to the branch since your last fetch.

---

## Keeping your desktop clean going forward

The `.gitignore` now prevents these problems automatically:

| Directory / pattern | Why excluded |
|---------------------|-------------|
| `/ffmpeg/`          | ffmpeg binaries can be 50–200 MB |
| `/whisper/`         | Whisper models can be several GB |
| `/tools/ffmpeg/`    | Same — runtime download |
| `/tools/whisper/`   | Same |
| `/tools/nvtt/`      | Binary tool |
| `/tools/texconv/`   | Binary tool |
| `/tools/intellicode/` | AI model data |
| `/act/`, `/tools/act/` | GitHub Actions local runner (contains embedded .git) |

When you run the **External Tools → Check/Install** buttons inside Blender, the
tools are downloaded to these ignored directories so they never pollute your
git history.

---

## Rebuilding the add-on zip after updates

After pulling new changes from GitHub, re-run:

```bash
python makezip.py
```

This creates a fresh `fallout4_tutorial_helper-v2.1.2.zip` that contains only
Python source files and documentation — well under 1 MB, safe to commit.

---

## Quick reference card (print or save)

```
STEP 1 — cd into your Blender-add-on. folder
STEP 2 — git fetch origin
STEP 3 — git rm --cached fallout4_tutorial_helper-v2.1.2.zip  (ignore errors)
STEP 4 — Delete the old .zip file from your folder
STEP 5 — git rm --cached -r ffmpeg whisper tools/intellicode   (ignore errors)
STEP 6 — git reset --hard origin/main
STEP 7 — python makezip.py
STEP 8 — git add .
STEP 9 — git commit -m "Clean merge from GitHub"
STEP 10 — git push
```
