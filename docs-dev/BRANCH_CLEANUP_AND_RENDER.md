# Branch Cleanup & Render Connection Guide

**Date:** February 13, 2026  
**Status:** Render redeploying, branch cleanup ready

---

## Branch Cleanup

### Current Branch Situation

**Active Branch:**
- `copilot/check-branch-merge-possibility` (this PR branch)

**What Happens:**
1. When this PR is merged to `master` on GitHub
2. GitHub will automatically delete the PR branch (if configured)
3. You can manually clean up local branches after merge

### Automatic Cleanup (GitHub)

GitHub typically deletes PR branches automatically after merge if:
- Repository settings have "Automatically delete head branches" enabled
- Go to: Settings → General → Pull Requests → ✅ Automatically delete head branches

### Manual Cleanup Script

After the PR is merged, run:

```bash
bash scripts/cleanup-branches.sh
```

This script will:
- List all branches
- Delete the old PR branch locally
- Delete the old PR branch from remote
- Show remaining branches

Or manually:

```bash
# Delete local branch
git branch -d copilot/check-branch-merge-possibility

# Delete remote branch
git push origin --delete copilot/check-branch-merge-possibility
```

---

## Render Connection Status

### Service Details

**Service ID:** `srv-d5sq6nblr7ts73e8ojvg`  
**URL:** `https://mossy.onrender.com`  
**Branch:** Connected to `master`  
**Status:** Redeploying (as of 2026-02-13)

### Deployment Process

When Render redeploys:
1. **Duration:** 2-5 minutes typically
2. **During deployment:** Service is unavailable
3. **After deployment:** Automatically comes online
4. **Auto-deploys:** On push to master branch

### Testing Connection

**After deployment completes**, test with:

```bash
curl https://mossy.onrender.com/health
```

**Expected response:**
```json
{
  "ok": true,
  "service": "mossy-backend",
  "time": "2026-02-13T..."
}
```

### Monitoring Deployment

**Render Dashboard:**
```
https://dashboard.render.com/web/srv-d5sq6nblr7ts73e8ojvg
```

**Check:**
1. Click "Logs" tab to see deployment progress
2. Look for: `[backend] listening on http://0.0.0.0:...`
3. Service status should show: 🟢 Live

### If Connection Fails

**Checklist:**

1. **Check deployment status:**
   - Go to Render dashboard
   - Verify deployment completed successfully
   - Check for any error messages in logs

2. **Verify environment variables:**
   - `MOSSY_API_TOKEN` set
   - `GROQ_API_KEY` set
   - `PORT` set (10000 or auto)

3. **Test manually:**
   ```bash
   # Wait 30 seconds, then try again
   curl -v https://mossy.onrender.com/health
   ```

4. **Check service status:**
   - Should be 🟢 Live (not 🔴 Failed or 🟡 Building)
   - If failed, check logs for errors

---

## Post-Merge Workflow

### After PR Merges to Master

1. **Wait for GitHub Actions** (if configured)
   - CI/CD pipeline runs
   - Tests execute
   - Build completes

2. **Render Auto-Deploys**
   - Detects push to master
   - Starts deployment
   - Takes 2-5 minutes
   - Service goes live

3. **Clean Up Branches**
   ```bash
   git checkout master
   git pull origin master
   bash scripts/cleanup-branches.sh
   ```

4. **Verify Deployment**
   ```bash
   curl https://mossy.onrender.com/health
   ```

5. **Test Full Connection**
   ```bash
   # Test chat endpoint (requires API key)
   curl -X POST https://mossy.onrender.com/v1/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"messages":[{"role":"user","content":"Hello"}]}'
   ```

---

## Current Status Summary

### ✅ Ready
- All work merged to PR branch
- Branch ready for merge to master
- Documentation complete
- Cleanup script created

### ⏳ In Progress
- Render deployment (redeploying)
- Waiting for deployment to complete

### 📝 Next Actions
1. Wait for Render deployment to complete (2-5 min)
2. Test connection: `curl https://mossy.onrender.com/health`
3. After PR merges: Run cleanup script
4. Verify everything works end-to-end

---

## Troubleshooting

### "Service not responding"

**During deployment:**
- Normal - wait for deployment to complete
- Check Render dashboard for progress

**After deployment:**
- Check if service is 🟢 Live in dashboard
- Verify environment variables are set
- Check logs for errors

### "Branch still exists after merge"

**GitHub didn't auto-delete:**
- Run: `bash scripts/cleanup-branches.sh`
- Or manually delete as shown above

**Branch in use:**
- Make sure you're on master: `git checkout master`
- Then delete: `git branch -d <branch-name>`

### "Can't delete remote branch"

**Authentication:**
- May need to configure git credentials
- Or delete via GitHub web interface:
  - Go to repository → Branches
  - Find branch → Click trash icon

---

## Verification Checklist

After everything is complete:

- [ ] PR merged to master
- [ ] GitHub Actions passed (if configured)
- [ ] Render deployment completed
- [ ] Health endpoint responding: `{"ok":true}`
- [ ] Old branches deleted (local)
- [ ] Old branches deleted (remote)
- [ ] Only master branch remains
- [ ] Local repo updated: `git pull origin master`

---

## Quick Reference

**Test Render:**
```bash
curl https://mossy.onrender.com/health
```

**Clean branches:**
```bash
bash scripts/cleanup-branches.sh
```

**Check branches:**
```bash
git branch -a
```

**Update local:**
```bash
git checkout master
git pull origin master
```

**Render Dashboard:**
```
https://dashboard.render.com/web/srv-d5sq6nblr7ts73e8ojvg
```

---

**Status:** Waiting for Render deployment to complete  
**ETA:** 2-5 minutes from start  
**Next:** Test connection when deployment finishes
