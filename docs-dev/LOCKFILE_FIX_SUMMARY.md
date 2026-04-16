# Package Lockfile Sync Fix

## Problem
CI workflow "Visual guide parity & tutorial checks" (job 71499927085) was failing at the "Install dependencies" step with:
```
npm ci can only install packages when your package.json and package-lock.json are in sync
Missing: encoding@0.1.13 from lock file
```

### Root Causes
1. **Missing dependency**: `encoding@0.1.13` was required by the dependency graph but missing from `package-lock.json`
2. **Version mismatch**: 
   - `package.json` had version `5.4.28`
   - `package-lock.json` had version `5.4.27`

## Solution Applied

### What Was Done
Regenerated `package-lock.json` using Node.js 24.14.1 (matching CI environment):

```bash
# Node version (matches CI)
node -v  # v24.14.1

# Regenerate lockfile
npm install

# Verify encoding is present
grep "node_modules/encoding" package-lock.json
# ✓ Found
```

### Changes in package-lock.json
1. ✅ Version bumped from `5.4.27` → `5.4.28` (lines 3 and 9)
2. ✅ Added `encoding@0.1.13` dependency entry:
   ```json
   "node_modules/encoding": {
     "version": "0.1.13",
     "resolved": "https://registry.npmjs.org/encoding/-/encoding-0.1.13.tgz",
     "integrity": "sha512-ETBauow1T35Y/WZMkio9jiM0Z5xjHHmJ4XmjZOq1l/dXz3lr2sRn87nJy20RupqSh1F2m3HHPSp8ShIPQJrJ3A==",
     "license": "MIT",
     "optional": true,
     "dependencies": {
       "iconv-lite": "^0.6.2"
     }
   }
   ```
3. ✅ Various peer dependency flags adjusted (e.g., `@ai-sdk/*` packages)

## Verification

### Local Test
Verified `npm ci` now succeeds:
```bash
rm -rf node_modules
npm ci --prefer-offline --no-audit --no-fund
# ✓ added 1194 packages in 20s
```

### CI Impact
The workflow step that was failing:
```yaml
- name: Install dependencies
  run: npm ci --prefer-offline --no-audit --no-fund
```

Will now pass because:
- ✅ All required dependencies are in the lockfile
- ✅ Version numbers are aligned
- ✅ Lockfile accurately reflects dependency graph

## Why This Fix Is Correct

### npm ci vs npm install
- `npm ci` is the **correct** choice for CI environments because:
  - Requires exact lockfile match (reproducible builds)
  - Fails fast if lockfile is out of sync
  - Faster and more reliable than `npm install`

- The fix updates the **lockfile** (source of truth), not the CI workflow
- This maintains deterministic, reproducible dependency installations

### Version Alignment
The lockfile now correctly reflects the current release version `5.4.28`, preventing confusion and ensuring consistency across:
- `package.json` version field
- `package-lock.json` top-level version
- `package-lock.json` packages[""] version

## Answer to User Question
> "This version will allow us to keep updating, right?"

**Yes!** The previous fixes to the workflow (deleting existing releases) combined with this lockfile fix mean:
- ✅ You can rebuild the same version multiple times
- ✅ CI will install dependencies correctly
- ✅ Releases will be properly cleaned up before new uploads
- ✅ No manual intervention required

## Related Changes
This fix is part of PR #215 which also includes:
- Workflow enhancement to delete any existing release (not just drafts)
- Node.js 24 upgrade across all workflows
- Improved release deletion logging and validation

## Files Modified
- `package-lock.json`: Updated with missing dependencies and correct version

## Testing Checklist
- [x] Local `npm ci` succeeds without errors
- [x] `encoding@0.1.13` present in lockfile
- [x] Versions aligned: both files show `5.4.28`
- [x] Changes committed and pushed to PR branch
- [ ] CI workflow "Visual guide parity & tutorial checks" passes (will verify after push)

## Prevention
To avoid this issue in the future:
1. Always run `npm install` after updating dependencies
2. Commit `package-lock.json` changes with dependency updates
3. Use the same Node.js major version locally as in CI (currently 24.x)
4. Let `npm ci` in workflows enforce lockfile sync (don't bypass it)
