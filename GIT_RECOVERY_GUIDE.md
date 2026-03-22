# Git Recovery Guide — Reconnecting GitHub Desktop

If GitHub Desktop says **"the repository no longer exists"**, **"Sorry, I can't find any repository matching…"**, or you can't push/pull, follow these steps.

---

## "I have lots of changes but I can't push — and I can't pull either"

This is the most common situation.  It happens because:

- GitHub Actions automatically rebuilt the addon zips and committed them while you were working.
- Now **GitHub is ahead of you** (it has commits you don't have locally).
- GitHub Desktop refuses to push because your branch is behind.
- GitHub Desktop refuses to pull because you have uncommitted local changes.

**The fix — run `end_session.bat`.**  It now handles this automatically:

1. Commits your local changes.
2. Fetches the latest commits from GitHub.
3. Rebases your work on top (no data lost).
4. Pushes everything.

Just **double-click `end_session.bat`** in your repo folder.  You do not need to do anything else.

If you prefer to do it manually in Git Bash, run these three commands:

```bash
git add .
git commit -m "session: save work"
git pull --rebase origin main
git push origin main
```

> **What if I see "CONFLICT" messages?**
> Git found lines that you and the CI both changed.  Open each conflicting file,
> look for the `<<<<<<< HEAD` / `>>>>>>> origin/main` markers, pick which version
> to keep, save the file, then run `git rebase --continue`.  Run `end_session.bat`
> again after that.

---

## "My push is taking forever (estimated an hour)"

A push should complete in seconds for this repo.  If it is taking much longer,
one of these is the cause:

### Cause 1 — Large AI model files accidentally staged

Common culprits: `.pt`, `.pth`, `.ckpt`, `.safetensors`, `.onnx`, `.bin` files.
These can be **gigabytes** each.  Check what git is about to send:

```bash
git diff --cached --stat
```

If you see huge files listed, remove them from the commit:

```bash
git rm --cached path/to/huge/model.pt
git commit --amend --no-edit
```

These files are now excluded by `.gitignore` so they will not be staged again.

### Cause 2 — Zip files not going through Git LFS

The three addon zips (`fallout4_tutorial_helper-v*-blender*.zip`) are supposed to
be handled by **Git LFS** (they are stored as tiny pointer files instead of raw blobs).
If LFS is not installed on your machine, git tries to push the full 400 KB zip
through the normal channel — which triggers GitHub's 100 MB file-size scanner and
slows everything down.

Fix: install Git LFS once on your machine, then re-stage the zips:

```bash
git lfs install
git rm --cached fallout4_tutorial_helper-v*-blender*.zip
git add    fallout4_tutorial_helper-v*-blender*.zip
git commit -m "chore: re-track zips as LFS pointers"
git push origin main
```

### Cause 3 — The remote URL is wrong

Run `fix_git_remote.bat` to reset the remote URL to the correct value, then try
pushing again.

---

## "Sorry, I can't find any repository matching…" / "Still can't locate it"

> ⚠️ **IMPORTANT — Read this before trying anything else**
>
> The "Clone a repository" dialog has **three tabs** at the top:
> **GitHub.com** | **GitHub Enterprise** | **URL**
>
> **The GitHub.com tab will NEVER work for this repository.**
> Do NOT type the URL into the GitHub.com tab's search box — it always fails.
>
> You must click the word **URL** (the tab on the far right) to switch to the URL tab,
> and then paste the address into the URL tab's input box.

**Step-by-step — do exactly this:**

1. Open **GitHub Desktop**.
2. Click **File → Clone repository…**  (the "Clone a repository" dialog opens).
3. Look at the three tabs at the very top of the dialog:
   `GitHub.com` | `GitHub Enterprise` | `URL`
4. **Click the word `URL`** — the rightmost tab.  The dialog contents will change.
   *(If the dialog still shows a search box with "Filter your repositories", you are still
   on the GitHub.com tab — click `URL` again.)*
5. You should now see a single text field labelled
   **"Repository URL or GitHub username and repository"**.
6. Click inside that field and paste this URL:
   ```
   https://github.com/POINTYTHRUNDRA654/Blender-add-on..git
   ```
   *(There are two dots before `.git` — that is correct and intentional.)*
7. Set **Local path** to wherever you want the folder (e.g. `D:\Blender addon 2`).
8. Click **Clone**.

> **Why does this keep failing?**  This repository's name ends with a period (`Blender-add-on.`).
> The GitHub.com search tab cannot find it at all.  Even the URL tab sometimes strips the
> trailing period, which is why we add `.git` at the end — it moves the period away from
> the very end of the URL so it can never be stripped.  Both URLs point to the same
> repository; the `.git` form is just more reliable.

---

## Should I Just Delete Everything and Re-clone?

**Yes — if you can't push at all, a fresh clone is the safest and quickest fix.**

Steps for a clean re-clone to your desktop:

1. **Back up any local changes** you have not yet committed (copy them somewhere safe).
2. **Delete the broken local folder** on your desktop.
3. Open **GitHub Desktop** → **File → Clone repository…**
4. At the top of the dialog, click the **`URL`** tab (the rightmost tab — NOT the GitHub.com tab).
5. Paste into the URL field (with `.git` at the end — this prevents the trailing period from being stripped):
   ```
   https://github.com/POINTYTHRUNDRA654/Blender-add-on..git
   ```
6. Set the local path to wherever you want it (e.g. your Desktop).
7. Click **Clone**.

After cloning, re-apply any local edits you backed up in step 1.

---

## Why Does the Trailing Period Cause Problems?

This repository's name ends with a period (`Blender-add-on.`).
Windows and some Git clients handle trailing periods inconsistently, which can cause GitHub Desktop to lose its connection to the remote.

---

## Option A — Fix With the Included Script (Easiest)

1. Download **`fix_git_remote.bat`** from this repository (or find it in the folder on your desktop).
2. Copy it into the local repository folder on your desktop (the same folder that has `__init__.py` in it).
3. **Double-click** `fix_git_remote.bat`.
4. It will automatically reconnect the remote URL and open GitHub Desktop.

---

## Option B — Fix Manually in GitHub Desktop

1. Open **GitHub Desktop**.
2. Go to **File → Add local repository…**
3. Browse to the folder on your desktop that contains the add-on files.
4. Click **Add repository**.
   - If Desktop says it can't find it, click **"create a repository"** — but **don't** actually create one. Cancel, and try the next step.
5. Go to **Repository → Repository settings…**
6. In the **Remote** tab, set the **Primary remote URL** to:
   ```
   https://github.com/POINTYTHRUNDRA654/Blender-add-on..git
   ```
   *(The `.git` suffix prevents GitHub Desktop from stripping the trailing period.)*
7. Click **Save**.
8. Now click **Fetch origin**. Your local changes will NOT be overwritten — Git will let you merge or keep both.

---

## Option C — Fix With Git Bash / Command Prompt

Open **Git Bash** (or Command Prompt) inside your local repository folder and run:

```bash
git remote set-url origin https://github.com/POINTYTHRUNDRA654/Blender-add-on..git
git fetch origin
git status
```

Then to safely pull without losing your local work:

```bash
# Stash your local changes first
git stash

# Pull the latest from GitHub
git pull origin main

# Re-apply your local changes on top
git stash pop
```

If you get merge conflicts after `git stash pop`, Git will mark them in the files — open each file and decide which lines to keep, then commit.

---

## Will Pulling Overwrite My Fixed Files?

**No — not automatically.** Git will:

- Keep your local changes as-is unless they conflict with the remote.
- If both you and the remote changed the *same line* of the same file, Git will ask you to resolve the conflict.
- If you changed different files than the remote, everything merges cleanly.

Using `git stash` before pulling (shown in Option C) is the safest way to protect your work.

---

## After Reconnecting

Once GitHub Desktop shows your repository again:

1. Click **Fetch origin** to download the latest state from GitHub.
2. Review the **Changes** tab to see what differs.
3. If you have local commits waiting, click **Push origin** to send them up.
4. If GitHub is ahead of you, click **Pull origin** to bring those changes down.

---

## Need More Help?

Open an issue at:
https://github.com/POINTYTHRUNDRA654/Blender-add-on./issues
