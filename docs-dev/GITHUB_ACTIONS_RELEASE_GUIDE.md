# GitHub Actions Release Workflow Guide

## Overview

This repository now has automated GitHub Actions workflows that build and release the Mossy Desktop application directly from GitHub's infrastructure. This bypasses any local network bottlenecks and provides a reliable, automated release process.

## Available Workflows

### 1. Build and Deploy Desktop App (`build-and-deploy-desktop.yml`)

**Triggers:**
- Automatic: Pushes to `master` branch
- Manual: Workflow dispatch from Actions tab

**Features:**
- Builds the application on GitHub's Windows runners
- Supports both Universal and NVIDIA editions
- Automatically publishes to GitHub Releases using electron-builder
- Includes artifact backup for 7 days
- Matrix build strategy for multiple editions

**Manual Trigger Options:**
- `edition`: Choose `universal`, `nvidia`, or `both`

### 2. Release Build and Upload (`release.yml`)

**Triggers:**
- Automatic: Git tags matching `v*.*.*` (e.g., `v5.4.27`)
- Manual: Workflow dispatch from Actions tab

**Features:**
- Creates a GitHub Release with proper changelog
- Builds specified edition(s)
- Uploads executables as release assets
- Supports draft and pre-release options
- Separate jobs for Universal and NVIDIA builds
- 30-day artifact retention for backup

**Manual Trigger Options:**
- `version`: Version number (e.g., 5.4.27)
- `edition`: Choose `universal`, `nvidia`, or `both`
- `draft`: Create as draft (default: true)
- `prerelease`: Mark as pre-release (default: false)

## How to Create a Release

### Option 1: Manual Workflow Dispatch (Recommended)

1. Go to GitHub repository → **Actions** tab
2. Select **"Release Build and Upload"** workflow
3. Click **"Run workflow"** button
4. Fill in the parameters:
   - **version**: Current version from `package.json` (e.g., `5.4.27`)
   - **edition**: Choose which edition(s) to build
   - **draft**: Keep checked to create a draft release first
   - **prerelease**: Check if this is a pre-release/beta
5. Click **"Run workflow"**
6. Wait 15-30 minutes for builds to complete
7. Go to **Releases** tab to find your new release
8. Edit the release notes if needed
9. Publish the release when ready

### Option 2: Git Tag (Automatic)

```bash
# Update version in package.json first
npm version 5.4.27 --no-git-tag-version

# Commit the version change
git add package.json
git commit -m "Release v5.4.27"

# Create and push tag
git tag v5.4.27
git push origin v5.4.27

# The workflow will automatically trigger
```

### Option 3: Push to Master (Continuous)

Simply push to the `master` branch, and the build workflow will automatically:
- Build the application
- Create/update a draft release
- Upload the assets

## Workflow Process

### Build and Deploy Workflow

```
┌─────────────────────┐
│ Push to master      │
│ or Manual trigger   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Checkout code       │
│ Setup Node.js 20.x  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ npm ci              │
│ Install deps        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ npm run build       │
│ Build app           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ npm run prepackage  │
│ Prep resources      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Delete old drafts   │
│ (if any)            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│ electron-builder --publish  │
│ Package & Upload to GitHub  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────┐
│ Upload artifacts    │
│ (7-day backup)      │
└─────────────────────┘
```

### Release Workflow

```
┌─────────────────────┐
│ Git tag or Manual   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Create Release      │
│ (draft by default)  │
└──────────┬──────────┘
           │
           ├───────────────┬───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Universal│    │  NVIDIA  │    │   Both   │
    │  Build   │    │  Build   │    │  Builds  │
    └─────┬────┘    └─────┬────┘    └─────┬────┘
          │               │               │
          ▼               ▼               ▼
    ┌──────────────────────────────────────┐
    │ Upload to Release as Assets          │
    └──────────────────────────────────────┘
```

## Understanding the Build Process

### What Gets Built

**Universal Edition:**
- `Mossy Setup {version}.exe` - NSIS installer (~400-600 MB)
- `Mossy {version}.exe` - Portable executable (optional)

**NVIDIA Edition:**
- `Mossy NVIDIA {version}.exe` - NSIS installer with CUDA support

### Build Time

- **Universal Edition**: ~15-20 minutes
- **NVIDIA Edition**: ~20-25 minutes
- **Both Editions**: ~25-35 minutes (parallel builds)

### Bandwidth Usage

All builds happen on GitHub's infrastructure, so:
- ✅ No local bandwidth used for building
- ✅ No local bandwidth used for uploading to GitHub
- ✅ Only downloads from GitHub Releases use your bandwidth
- ✅ Faster and more reliable than local builds

## Benefits of GitHub Actions Releases

### 1. **Bypasses Local Network Bottlenecks**
- Builds happen on GitHub's fast network
- Uploads are internal to GitHub's infrastructure
- No AT&T or ISP upload limitations

### 2. **Reproducible Builds**
- Same environment every time
- Clean Windows Server 2022 runner
- Consistent Node.js and npm versions

### 3. **Automated Process**
- No manual steps after triggering
- Automatic release creation
- Automatic asset uploads

### 4. **Backup Artifacts**
- Artifacts stored for 7-30 days
- Can re-download if release gets deleted
- Useful for debugging

### 5. **Matrix Builds**
- Build multiple editions in parallel
- Faster than sequential local builds
- Can build both editions simultaneously

## Troubleshooting

### Build Fails During `npm ci`

**Cause:** Network timeout or package registry issues

**Solution:** 
- The workflow has retry logic built-in
- Re-run the workflow from Actions tab
- Check npm registry status

### Build Fails During `electron-builder`

**Cause:** Usually missing dependencies or timeout

**Solution:**
- Check the `prepackage` step completed successfully
- Increase timeout in workflow (currently 30 minutes)
- Check error logs in Actions tab

### Release Asset Upload Fails

**Cause:** File name mismatch or permission issues

**Solution:**
- Check `release/` directory listing in logs
- Verify asset path matches actual filename
- Ensure `GITHUB_TOKEN` has write permissions

### Draft Release Not Visible

**Cause:** Draft releases are only visible to repo collaborators

**Solution:**
- Make sure you're logged in to GitHub
- Check "Releases" tab (not "Tags")
- Publish the draft to make it public

## Manual Build and Upload (Legacy Method)

If you need to build locally and upload manually:

```bash
# Build locally
npm run build
npm run prepackage
npm run package:win

# Upload to GitHub using gh CLI
gh release create v5.4.27 \
  --title "Mossy v5.4.27" \
  --notes "Release notes here" \
  --draft \
  release/*.exe
```

## Best Practices

1. **Always test with draft releases first**
   - Keep draft=true on first run
   - Test the installers
   - Publish when verified

2. **Use semantic versioning**
   - Format: `v{major}.{minor}.{patch}`
   - Example: `v5.4.27`

3. **Write clear release notes**
   - List new features
   - Document breaking changes
   - Include upgrade instructions

4. **Keep artifacts**
   - Don't delete workflow artifacts immediately
   - Useful for rollback if needed
   - Can verify checksums

5. **Monitor build times**
   - Universal: ~15-20 min is normal
   - NVIDIA: ~20-25 min is normal
   - Over 30 min may indicate issues

## Environment Variables

The workflows use these environment variables:

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `GH_TOKEN`: Alias for GITHUB_TOKEN (used by electron-builder)
- `ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES`: Allows flexible dependency resolution

## Permissions

The workflows require:
- `contents: write` - To create releases and upload assets

This is already configured in the workflow files.

## Next Steps

1. **Update version in package.json** to the desired release version
2. **Trigger the Release workflow** from GitHub Actions tab
3. **Monitor the build** in the Actions tab
4. **Test the draft release** installers
5. **Publish the release** when ready
6. **Share the release URL** with users

## Support

If you encounter issues with the GitHub Actions workflows:

1. Check the workflow run logs in the Actions tab
2. Look for error messages in the build output
3. Verify all required secrets are set
4. Ensure package.json version is correct
5. Try re-running the workflow

## Related Files

- `.github/workflows/build-and-deploy-desktop.yml` - Main build workflow
- `.github/workflows/release.yml` - Release creation workflow
- `package.json` - Build configuration and scripts
- `build/` - Electron-builder configuration files
