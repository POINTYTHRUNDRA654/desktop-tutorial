# Release Process

## Overview

Due to repository rules that restrict tag creation, our release process uses a two-step workflow:

1. **Automated Build** - Builds the app and creates artifacts on every push to `master`
2. **Manual Release** - Downloads artifacts and creates a GitHub release without tags

## Build Workflow

**Workflow:** `.github/workflows/build-and-deploy-desktop.yml`

**Triggers:**
- Push to `master` branch
- Manual workflow dispatch

**What it does:**
- ✅ Builds Universal and NVIDIA editions
- ✅ Uploads artifacts (retention: 7 days)
- ✅ Lists build outputs for verification
- ❌ Does NOT create GitHub releases (removed due to permission issues)

**Artifacts created:**
- `mossy-universal-{version}` - Contains `Mossy {version}.exe`
- `mossy-nvidia-{version}` - Contains `Mossy NVIDIA {version}.exe`

## Creating a Release

### Step 1: Trigger Build

Push to `master` or manually run the build workflow:

```bash
git push origin master
```

Wait for the build to complete and note the **run ID** from the Actions tab.

### Step 2: Create Release

1. Go to **Actions** → **Manual Release Creation**
2. Click **Run workflow**
3. Fill in the inputs:
   - **version**: Version number (e.g., `5.4.28`)
   - **run_id**: The run ID from Step 1 (e.g., `24474785839`)
   - **edition**: Which edition to release (`universal`, `nvidia`, or `both`)
   - **draft**: Create as draft (recommended: `true`)
   - **prerelease**: Mark as pre-release (default: `false`)

4. Click **Run workflow**

The workflow will:
- Download the artifacts from the specified build
- Create a tagless GitHub release
- Attach the installer files

### Step 3: Publish Release

1. Go to **Releases** in your repository
2. Find the draft release
3. Review the release notes and attached files
4. Click **Publish release**

## Finding the Run ID

**Method 1: GitHub UI**
1. Go to **Actions** tab
2. Click on the successful "Build and Deploy Desktop App" run
3. The run ID is in the URL: `https://github.com/.../actions/runs/{run_id}`

**Method 2: GitHub CLI**
```bash
gh run list --workflow=build-and-deploy-desktop.yml --limit 5
```

**Method 3: API**
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/POINTYTHRUNDRA654/desktop-tutorial/actions/workflows/242997158/runs?per_page=5
```

## Troubleshooting

### Build Fails with "422 Unprocessable Entity"

This means the workflow tried to auto-publish. Ensure:
- `.github/workflows/build-and-deploy-desktop.yml` does NOT have `--publish always`
- `GH_TOKEN` environment variable is removed from packaging steps

### Artifacts Not Found

Artifacts expire after 7 days. If the build is older:
1. Re-run the build workflow
2. Use the new run ID for release creation

### Release Creation Fails

Check permissions:
- Workflow needs `contents: write` and `actions: read` permissions
- User triggering the workflow needs write access to the repository

## Alternative: Fix Repository Rules (Recommended Long-term)

To enable automatic releases, adjust repository rules:

1. Go to **Settings** → **Rules** → **Rulesets**
2. Find the ruleset blocking tag creation
3. Add an exception for GitHub Actions bot
4. Or disable "Restrict creations" for tags matching `v*`

Then restore auto-publish:
```yaml
- name: Package Universal Edition
  run: npx electron-builder --win --publish always
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Version Bump Checklist

Before creating a release:

- [ ] Update `version` in `package.json`
- [ ] Update version references in README.md
- [ ] Run `npm run validate-version` locally
- [ ] Commit and push to `master`
- [ ] Wait for build to complete
- [ ] Follow release creation steps above
