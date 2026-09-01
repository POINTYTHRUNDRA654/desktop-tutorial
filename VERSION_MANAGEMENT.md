# Version Management Guide

## Overview

This project uses **semantic versioning** (MAJOR.MINOR.PATCH) with `package.json` as the single source of truth for the application version. This ensures version consistency between the codebase, running application, and packaged builds.

## Version Format

**Current Version:** `5.4.24`

Format: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes, major feature releases
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, minor updates

## How Version is Managed

### Single Source of Truth: package.json

```json
{
  "name": "mossy-desktop",
  "version": "5.4.24",
  "description": "Mossy v5.4.24 - Production-ready Fallout 4 modding assistant..."
}
```

### Version Display in UI

The application displays the version in the Settings Hub:

- **Location**: Settings → Version Info (bottom of settings page)
- **Displays**: 
  - Package version (from package.json)
  - Running version (from Electron)
  - Consistency check (✅ or ⚠️)

### Version Validation

Before every build and package operation, the version is validated:

```bash
npm run validate-version
```

This checks:
1. ✅ Version format is valid (X.Y.Z)
2. ✅ Description includes current version
3. ✅ README mentions current version
4. ✅ Electron-builder configuration exists
5. ✅ Auto-updater configuration exists

## Updating the Version

### Step 1: Update package.json

```bash
# Edit package.json
"version": "5.4.25"  # New version
```

### Step 2: Update Description

```bash
# Edit package.json description
"description": "Mossy v5.4.25 - Production-ready..."
```

### Step 3: Update README (if major/minor change)

```bash
# Edit README.md
![Version](https://img.shields.io/badge/version-5.4.25-blue.svg)
```

### Step 4: Validate Version

```bash
npm run validate-version
```

This ensures all version references are consistent.

### Step 5: Build and Test

```bash
# Build the app (includes validation)
npm run build

# Or package for distribution
npm run package:win
```

### Step 6: Commit Changes

```bash
git add package.json README.md
git commit -m "Bump version to 5.4.25"
git tag v5.4.25
git push origin main --tags
```

## Automated Version Checks

### During Build

```bash
npm run build
# Automatically runs: npm run validate-version
```

### During Packaging

```bash
npm run package:win
# Automatically runs: npm run validate-version
```

### Manual Check

```bash
npm run validate-version
```

## Version Display in Application

### 1. Settings Hub

Navigate to **Settings** to see:
- Current version from package.json
- Running version from Electron
- Consistency indicator

### 2. Update Notifier

The app checks for updates and compares versions:
- Uses package.json version as current
- Compares with GitHub releases
- Notifies when newer version available

### 3. About/Help

Version information is also available in:
- Main window title (development mode)
- Electron menu → About
- Console logs on startup

## Version Consistency Issues

### If Version Mismatch is Detected

The Settings Hub will show a warning if:
- Package version ≠ Running version
- Usually happens after updating but before restarting

**Solution**: Restart the application

### If Build Validation Fails

```bash
npm run build
# ❌ VALIDATION FAILED - Errors found
```

**Common Issues:**
1. **Invalid version format**: Use X.Y.Z format
2. **Missing version in description**: Update package.json description
3. **Missing version in README**: Update README.md

**Solution**: Fix the issues and run `npm run validate-version` to verify

## Best Practices

### ✅ DO

- Update version in package.json first
- Update description to match version
- Run `npm run validate-version` before committing
- Use semantic versioning consistently
- Create git tags for releases
- Test version display after updates

### ❌ DON'T

- Hardcode version strings in code
- Skip version validation before building
- Use different versions in different files
- Forget to update README for major/minor releases
- Package without running validation

## Troubleshooting

### Version Not Showing in UI

1. Check browser console for errors
2. Verify `window.electron.api.getAppVersion` is available
3. Rebuild the app: `npm run build`
4. Clear cache and restart

### Version Mismatch After Update

1. Close the application completely
2. Restart the application
3. Check Settings → Version Info
4. If still mismatched, rebuild: `npm run build`

### Build Fails Validation

1. Run `npm run validate-version` to see specific issues
2. Fix reported problems
3. Verify fix: `npm run validate-version`
4. Rebuild: `npm run build`

## Scripts Reference

```bash
# Validate version consistency
npm run validate-version

# Build (includes validation)
npm run build

# Package for Windows (includes validation)
npm run package:win

# Run in development (no validation needed)
npm run dev
```

## Version History

Versions are tracked in:
- `package.json` - Current version
- Git tags - Release versions
- GitHub Releases - Published versions with notes
- CHANGELOG.md - Detailed version history (if exists)

## Related Files

- `package.json` - Version source of truth
- `scripts/validate-version.mjs` - Validation script
- `src/renderer/src/VersionInfo.tsx` - UI component
- `src/renderer/src/utils/versionUtils.ts` - Version utilities
- `src/electron/autoUpdater.ts` - Auto-updater service
- `README.md` - Version badge and documentation

## Support

If you encounter version-related issues:

1. Check this guide
2. Run `npm run validate-version`
3. Check Settings → Version Info in the app
4. Review console logs
5. File an issue with version details

---

**Remember**: The version in `package.json` is the single source of truth. All other version references should match or derive from it.
