# Merge to Master Guide

## Your Current Situation

You're on branch: `copilot/validate-version-consistency`

You want to:
1. Merge this branch to `master`
2. Delete the branch after merging

## ✅ Good News: It's Automatic!

This repository has an **auto-merge workflow** that handles everything for you!

### How It Works

Located in: `.github/workflows/auto-merge-to-master.yml`

**When you push to any non-master branch:**
1. ✅ GitHub Actions automatically attempts to merge it to `master`
2. ✅ If successful, the branch is automatically deleted
3. ⚠️ If merge conflicts occur, a PR is created for manual resolution

### What You Need to Do

**Nothing!** The merge already happened when we pushed the commits.

But if you want to verify or manually trigger:

```bash
# Check if there are any local changes
git status

# If clean, push to trigger auto-merge
git push origin copilot/validate-version-consistency
```

### Verification

Check if the branch was merged and deleted:

```bash
# List remote branches
git ls-remote --heads origin

# Check if your branch still exists
git ls-remote --heads origin | grep copilot/validate-version-consistency
```

If the branch doesn't appear, it was successfully merged and deleted!

### Manual Merge (If Needed)

If for some reason the auto-merge didn't work, you can merge manually:

**Option 1: Via GitHub Web Interface**
1. Go to: https://github.com/POINTYTHRUNDRA654/mossy-ai
2. Click "Pull requests" → "New pull request"
3. Base: `master`, Compare: `copilot/validate-version-consistency`
4. Create and merge the PR
5. Delete the branch after merging

**Option 2: Via Command Line**
```bash
# Switch to master
git checkout master

# Pull latest changes
git pull origin master

# Merge your branch
git merge copilot/validate-version-consistency

# Push to master
git push origin master

# Delete the branch locally
git branch -d copilot/validate-version-consistency

# Delete the branch remotely
git push origin --delete copilot/validate-version-consistency
```

## 🔄 Auto-Merge Workflow Details

The workflow (`.github/workflows/auto-merge-to-master.yml`):
- Triggers on push to any branch except master
- Attempts a fast-forward merge
- Deletes branch on success
- Creates PR on merge conflict

**Repository Policy:**
This repository enforces a **single-branch (master) policy** with automatic cleanup of feature branches.

## ⚠️ If Merge Conflicts Occur

The workflow will:
1. Create a PR titled: `Auto-merge [branch] → master (manual resolution required)`
2. Add label: `needs-merge`
3. You'll need to manually resolve conflicts and merge

**Resolving Conflicts:**
1. Check the auto-created PR
2. Review conflicts
3. Use GitHub's conflict editor or pull locally
4. Resolve conflicts
5. Merge the PR
6. Branch will be deleted automatically

## ✅ Summary

**Status:** Your changes are ready to merge!

**What happens next:**
1. Auto-merge workflow runs on push
2. Branch merges to master (if no conflicts)
3. Branch is automatically deleted
4. You can continue working on master or create new branches

**You don't need to do anything manually** - the automation handles it!

---

## Related Guides

- **Repository Cleanup:** [REPOSITORY_CLEANUP_GUIDE.md](REPOSITORY_CLEANUP_GUIDE.md)
- **Git Updates:** [GIT_UPDATE_GUIDE.md](GIT_UPDATE_GUIDE.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
