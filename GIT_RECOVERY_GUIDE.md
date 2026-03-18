# Git Recovery Guide — Reconnecting GitHub Desktop

If GitHub Desktop says **"the repository no longer exists"** or you can't push/pull, follow these steps.

---

## Why This Happens

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
   https://github.com/POINTYTHRUNDRA654/Blender-add-on.
   ```
   *(Make sure the period at the end is included.)*
7. Click **Save**.
8. Now click **Fetch origin**. Your local changes will NOT be overwritten — Git will let you merge or keep both.

---

## Option C — Fix With Git Bash / Command Prompt

Open **Git Bash** (or Command Prompt) inside your local repository folder and run:

```bash
git remote set-url origin https://github.com/POINTYTHRUNDRA654/Blender-add-on.
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
