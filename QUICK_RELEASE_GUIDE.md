# Quick Release Guide

## TL;DR - Create a Release in 3 Steps

1. **Go to Actions tab** → Select "Release Build and Upload"
2. **Click "Run workflow"** → Enter version (e.g., `5.4.27`)
3. **Wait 20 minutes** → Release appears in Releases tab

---

## Detailed Steps

### 1. Prepare for Release

```bash
# Update version in package.json
# Current: 5.4.27
```

### 2. Trigger the Workflow

1. Navigate to: https://github.com/POINTYTHRUNDRA654/desktop-tutorial/actions
2. Click **"Release Build and Upload"**
3. Click **"Run workflow"** (green button on the right)
4. Fill in:
   - **version**: `5.4.27` (or current version)
   - **edition**: `both` (builds Universal + NVIDIA)
   - **draft**: ✅ Checked (creates draft first)
   - **prerelease**: ⬜ Unchecked
5. Click **"Run workflow"**

### 3. Monitor Progress

- Watch the workflow run in real-time
- Two parallel jobs will run:
  - ✅ Build Universal Edition (~15-20 min)
  - ✅ Build NVIDIA Edition (~20-25 min)

### 4. Verify the Release

1. Go to: https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases
2. Find the draft release (only visible to you)
3. Download and test both installers:
   - `Mossy-5.4.27-Setup.exe` (Universal)
   - `Mossy-NVIDIA-5.4.27-Setup.exe` (NVIDIA)
4. If everything works, click **"Publish release"**

---

## What Gets Built

| Edition | File | Size | Description |
|---------|------|------|-------------|
| Universal | `Mossy-5.4.27-Setup.exe` | ~500 MB | CPU-based PyTorch |
| NVIDIA | `Mossy-NVIDIA-5.4.27-Setup.exe` | ~600 MB | CUDA-accelerated |

---

## Advantages Over Local Build

✅ **No AT&T Upload Bottleneck** - Builds and uploads on GitHub's network
✅ **Faster** - GitHub servers have high-speed connections
✅ **Reliable** - Clean environment every time
✅ **Parallel Builds** - Both editions build simultaneously
✅ **Automated** - Set it and forget it
✅ **Backup** - Artifacts stored for 30 days

---

## Troubleshooting

### "Workflow run failed"
→ Click into the failed job and check the error logs
→ Most common: npm install timeout (just re-run)

### "Can't find the release"
→ Draft releases only visible when logged in
→ Check the "Releases" tab, not "Tags"

### "Wrong version uploaded"
→ Check package.json has correct version
→ The workflow reads version from package.json

---

## Alternative: Auto-Deploy on Push

If you push to `master`, the `build-and-deploy-desktop.yml` workflow will automatically:
1. Build the app
2. Create/update a draft release
3. Upload the executable

This happens automatically, no manual trigger needed.

---

## See Full Documentation

For complete details, see: [GITHUB_ACTIONS_RELEASE_GUIDE.md](./GITHUB_ACTIONS_RELEASE_GUIDE.md)
