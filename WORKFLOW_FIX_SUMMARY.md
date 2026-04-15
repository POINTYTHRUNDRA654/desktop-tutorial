# GitHub Actions Workflow Fix - Build and Deploy

## Problem
The "Build and Deploy Desktop App" workflow was failing with error:
```
HttpError: 422 Unprocessable Entity
"Cannot upload assets to an immutable release."
```

### Root Cause
- Release `v5.4.28` already existed and was **published** (not a draft)
- GitHub releases become **immutable** once published
- The workflow only deleted **draft** releases, skipping published ones
- `electron-builder --publish always` tried to upload to an immutable release → failure

## Solution Implemented

### 1. ✅ Delete ANY Existing Release (Not Just Drafts)
**Before:**
```yaml
if ($release.isDraft) {
  Write-Host "Deleting draft release: $($release.tagName)"
  gh release delete $release.tagName --yes
}
```

**After:**
```yaml
# No isDraft check - deletes ALL matching releases
try {
  gh release delete $release.tagName --yes --cleanup-tag
  $deletedCount++
  Write-Host "  ✓ Successfully deleted release: $($release.tagName)" -ForegroundColor Green
} catch {
  Write-Host "  ✗ Failed to delete release: $($release.tagName)" -ForegroundColor Red
  throw
}
```

### 2. ✅ Added Confirmation Logging
- Warning message before deletion starts
- Success/failure status for each deletion
- Final summary of actions taken
- Color-coded output (Yellow warnings, Green success, Red errors)

### 3. ✅ Version Validation & Overwrite Warning
Added prominent warning:
```powershell
Write-Host "⚠️  WARNING: Any existing release with version v$version will be deleted and replaced." -ForegroundColor Yellow
```

### 4. ✅ Upgraded to Node.js 24
**Before:**
```yaml
- name: Setup Node.js 20.x
  uses: actions/setup-node@v4
  with:
    node-version: 20.x
```

**After:**
```yaml
- name: Setup Node.js 24.x
  uses: actions/setup-node@v4
  with:
    node-version: 24.x
```

This fixes the deprecation warning:
> Node.js 20 actions are deprecated. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026.

### 5. ✅ Improved Error Handling
- Changed `continue-on-error: true` → `continue-on-error: false`
- Added try-catch blocks for deletion operations
- Throws error if deletion fails (prevents corrupted state)
- Added `--cleanup-tag` flag to also remove Git tags

## Benefits

### For Users
✅ **Can rebuild same version multiple times** without manual cleanup
✅ **Clear warnings** about overwrites prevent accidents
✅ **Detailed logs** show exactly what's happening
✅ **Automatic cleanup** of old releases and tags

### For CI/CD
✅ **Workflow won't fail** on immutable release errors
✅ **No manual intervention** required for rebuilds
✅ **Future-proof** with Node.js 24 support
✅ **Better error reporting** for troubleshooting

## Testing

To test the fix:
1. Push a commit to `master` branch
2. Workflow will automatically run
3. Check the "Delete existing releases" step logs
4. Verify successful release upload

Or manually trigger:
```bash
gh workflow run "Build and Deploy Desktop App" --ref master
```

## Files Modified
- `.github/workflows/build-and-deploy-desktop.yml`
  - Lines 35-39: Node.js version upgrade
  - Lines 68-101: Enhanced release deletion logic

## Answering the User's Question
> "This version will allow us to keep updating, right?"

**Yes!** The fix allows you to:
- ✅ Rebuild the same version number multiple times
- ✅ Update and re-release without version bumps
- ✅ Automatically clean up old releases before creating new ones
- ✅ No manual GitHub release management needed

The workflow will now delete ANY existing release matching the version (draft or published) before creating a new one, so you can iterate on the same version during development.

## Best Practices Going Forward

### For Production Releases
- Bump the version in `package.json` for each release
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases appropriately (v5.4.29, v5.5.0, etc.)

### For Development/Testing
- Use this workflow as-is - it will clean up old builds
- Add `-dev`, `-beta`, or `-rc` suffixes if needed
- Consider using pre-release flag for development builds

## Related Issues
- Fixes: "Cannot upload assets to an immutable release" error
- Fixes: Node.js 20 deprecation warnings
- Improves: Release management automation
- Improves: Build reproducibility
