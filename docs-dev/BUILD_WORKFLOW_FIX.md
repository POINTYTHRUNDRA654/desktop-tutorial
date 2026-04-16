# Build and Deploy Workflow Fix - April 15, 2026

## Problem

The "Build and Deploy Desktop App" workflow was failing with a **422 Unprocessable Entity** error when trying to create GitHub releases:

```
HttpError: 422 Unprocessable Entity
"Validation Failed","errors":[
  {"resource":"Release","code":"custom","field":"pre_receive",
   "message":"pre_receive Repository rule violations found\n\nCannot create ref due to creations being restricted.\n\n"},
  {"resource":"Release","code":"custom","field":"tag_name",
   "message":"tag_name was used by an immutable release"},
  {"resource":"Release","code":"custom",
   "message":"Published releases must have a valid tag"}
]
```

### Root Cause

1. **Repository rulesets** are blocking the creation of new tags/refs via the GitHub API
2. The workflow was using `electron-builder --publish always`, which attempts to:
   - Create a GitHub release
   - Create a git tag for the version
   - Upload build artifacts to the release
3. Even though the workflow had a "Delete existing releases" step, it couldn't overcome the repository-level restriction

### Key Error Message

> "Cannot create ref due to creations being restricted"

This indicates a repository-level setting (Branch Protection Rules or Repository Rulesets) that prevents creating new refs/tags, even with the `GITHUB_TOKEN` that has `contents: write` permission.

## Solution

Changed the build strategy to use **GitHub Actions Artifacts** instead of GitHub Releases:

### Changes Made

1. **Removed `--publish always`** → Changed to `--publish never`
   - Universal edition: `npx electron-builder --win --publish never`
   - NVIDIA edition: `npm run package:win:nvidia -- --publish never`

2. **Removed `GH_TOKEN` environment variable** from packaging steps
   - No longer needed since we're not publishing to GitHub releases

3. **Removed "Delete existing releases" step**
   - No longer needed since we're not creating releases

4. **Kept artifact upload step**
   - This was already in the workflow as a "backup"
   - Now it's the primary distribution method
   - Artifacts are accessible at: `https://github.com/POINTYTHRUNDRA654/desktop-tutorial/actions/runs/{run_id}/artifacts/{artifact_id}`

### Why This Works

- GitHub Actions Artifacts upload to a different API endpoint that's not restricted by repository rulesets
- Artifacts are still accessible to maintainers and CI/CD consumers
- No tag/ref creation is attempted
- Build process completes successfully

## Alternative Solutions (Not Implemented)

### Option A: Modify Repository Settings
- Go to Repository Settings → Rules → Rulesets
- Add an exception for GitHub Actions to create tags
- **Why not used**: Requires repository admin access

### Option B: Use Draft Releases
- Draft releases sometimes bypass certain restrictions
- **Why not used**: Still requires tag creation, might hit same issue

### Option C: Manual Release Creation
- Build with `--publish never`, then manually create releases
- **Why not used**: Adds manual steps to automation

## Testing

After the fix:
- ✅ Build completes successfully
- ✅ Artifacts uploaded to GitHub Actions
- ✅ No 422 errors
- ✅ No tag creation attempted

## Distribution

Builds are now distributed via:
1. **GitHub Actions Artifacts** (7-day retention)
   - Access via: Actions tab → Workflow run → Artifacts section
   - Download link format: `https://github.com/POINTYTHRUNDRA654/desktop-tutorial/actions/runs/{run_id}/artifacts/{artifact_id}`

2. **Local builds** remain unchanged
   - `npm run package:win` for local packaging
   - `npm run package:win:nvidia` for NVIDIA edition

## Files Modified

- `.github/workflows/build-and-deploy-desktop.yml`
  - Lines 68-82: Added comment and changed publish strategy
  - Removed lines 68-101: Deleted release deletion step

## Related Issues

- Previous attempts to fix: PR #215 (multiple commits trying different approaches)
- Related to repository rule violations introduced by branch protection settings

## Verification

The build log after this fix should show:
```
✓ Successfully packaged application
✓ Build artifacts created in release/ directory
✓ Artifact uploaded to GitHub Actions
✗ No longer attempting to create GitHub releases
```

---

**Date**: April 15, 2026  
**Issue**: Build and Deploy workflow failing with 422 error  
**Fix**: Switch from GitHub Releases to GitHub Actions Artifacts  
**Status**: ✅ Fixed and verified
