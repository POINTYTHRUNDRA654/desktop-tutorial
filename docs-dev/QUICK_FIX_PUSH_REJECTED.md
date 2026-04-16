# Git Push Rejected - Quick Fix

## Your Error

```
! [rejected]        master -> master (fetch first)
error: failed to push some refs
```

## Quick Fix (30 seconds)

```powershell
# Run these commands in PowerShell:
cd D:\Projects\desktop-tutorial
git pull origin master
git push origin master
```

That's it! ✅

---

## What If I Get Conflicts?

If `git pull` shows conflicts:

1. **Open the conflicted files** in your editor
2. **Look for these markers:**
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Remote changes
   >>>>>>> origin/master
   ```
3. **Edit the file** - keep what you want, delete the markers
4. **Save the file**
5. **Run these commands:**
   ```powershell
   git add .
   git commit -m "Merge remote changes"
   git push origin master
   ```

---

## Why Did This Happen?

Someone (or something) pushed commits to the remote master branch that you don't have locally. Git requires you to pull those changes first before pushing your own.

Common causes:
- Merged a pull request on GitHub
- Pushed from another computer
- Automated bot/action made changes
- Teammate pushed changes

---

## Prevention

Always pull before you push:

```powershell
git pull origin master
git push origin master
```

Or better yet, work on feature branches instead of master:

```powershell
git checkout -b feature/my-feature
# Make changes
git commit -m "My changes"
git push origin feature/my-feature
# Create PR on GitHub
```

---

## Alternative: Rebase Instead of Merge

For a cleaner history:

```powershell
git pull --rebase origin master
git push origin master
```

---

## Still Having Issues?

Check the detailed guide: [HOW_TO_SYNC_MASTER_BRANCH.md](./HOW_TO_SYNC_MASTER_BRANCH.md)

Or check these:
- [TROUBLESHOOTING_GIT_PUSH.md](./TROUBLESHOOTING_GIT_PUSH.md) - VS Code/Visual Studio issues
- [RESOLUTION_SUMMARY.md](./RESOLUTION_SUMMARY.md) - Previous issue resolution

---

## Emergency: Discard Your Local Changes

⚠️ **WARNING:** This will DELETE your local commits!

Only use if you're SURE you want to throw away your work:

```powershell
git fetch origin
git reset --hard origin/master
```

---

## Verify It Worked

After fixing, run:

```powershell
git status
```

Should say: `Your branch is up to date with 'origin/master'`

Then you can push without errors:

```powershell
git push origin master
```

✅ Done!
