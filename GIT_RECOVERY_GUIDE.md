# Git Recovery Guide — Reconnecting GitHub Desktop

If GitHub Desktop says **"the repository no longer exists"**, **"Sorry, I can't find any repository matching…"**, or you can't push/pull, follow these steps.

---

## "Sorry, I can't find any repository matching…" / "Still can't locate it"

This is the most common error.  GitHub Desktop's **GitHub.com** search tab (and sometimes even
the URL tab) strips the trailing period from the repository name and then can't find it.

**Use the URL tab AND add `.git` to the end of the URL — this is the most reliable fix.**

Steps:

1. Open **GitHub Desktop** → **File → Clone repository…**
2. Click the **URL** tab (the third tab, on the right).
3. Paste this URL exactly into the **Repository URL or GitHub username and repository** box:
   ```
   https://github.com/POINTYTHRUNDRA654/Blender-add-on..git
   ```
   *(Note the two dots before `.git` — that is correct.  The `.git` suffix prevents GitHub
   Desktop from silently stripping the trailing period that is part of the repository name.)*
4. Set **Local path** to wherever you want the folder (e.g. `D:\Blender addon 2`).
5. Click **Clone**.

> **Why does the plain URL fail even after copy-paste?**  This repository's name ends with a
> period (`Blender-add-on.`).  Some versions of GitHub Desktop silently strip trailing periods
> from URLs before making the network request, so the search or clone request goes to
> `Blender-add-on` (no period) and GitHub returns "not found".  Adding `.git` to the end of the
> URL makes the period part of the middle of the URL rather than the end, so it is never
> stripped.  Both URLs point to the same repository.

---

## Should I Just Delete Everything and Re-clone?

**Yes — if you can't push at all, a fresh clone is the safest and quickest fix.**

Steps for a clean re-clone to your desktop:

1. **Back up any local changes** you have not yet committed (copy them somewhere safe).
2. **Delete the broken local folder** on your desktop.
3. Open **GitHub Desktop** → **File → Clone repository…**
4. Click the **URL** tab (**not** the GitHub.com tab — see the section above for why).
5. Paste the URL (with `.git` at the end — this prevents the trailing period from being stripped):
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
