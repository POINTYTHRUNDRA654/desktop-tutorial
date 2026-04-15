# Building Mossy Executable for Distribution

## Quick Start

To build a distributable executable for Mossy:

### Windows Build

```bash
npm run build
npm run package:win
```

The installer will be created in `release/` directory:
- `Mossy Setup 5.4.21.exe` - Windows installer (NSIS)

### Build Output

After running the build command, you'll find:
- **release/** - Contains the built installers
  - Windows: `Mossy Setup 5.4.21.exe`
  - Unpacked files in `win-unpacked/` (for testing)

## Prerequisites

Before building, ensure you have:

1. **Node.js** 20.x or higher
2. **npm** 9.x or higher
3. **All dependencies installed:**
   ```bash
   npm install
   ```

## Build Process Details

### Step 1: Build the Application

```bash
npm run build
```

This command:
1. Builds the Vite frontend (`npm run build:vite`)
2. Compiles TypeScript for Electron (`npm run build:electron`)
3. Output goes to:
   - `dist/` - Frontend build
   - `dist-electron/` - Electron main process

### Step 2: Package for Distribution

```bash
npm run package:win
```

This uses electron-builder to:
1. Bundle all files
2. Create NSIS installer
3. Sign (if configured)
4. Output to `release/` directory

## Configuration

### Version Number

Update version in `package.json`:

```json
{
  "version": "5.4.21"
}
```

This version appears in:
- Application title
- About dialog
- Auto-updater checks
- Installer filename

### Application Name

Configured in `package.json`:

```json
{
  "name": "mossy-desktop",
  "build": {
    "productName": "Mossy",
    "appId": "com.volttech.desktop"
  }
}
```

### Icon

Windows icon should be at: `build/icon.ico`

If missing, create an icon or electron-builder will use default.

## Distribution

### For Testers

Share the installer file:
- `release/Mossy Setup 5.4.21.exe` (Windows)

Testers can:
1. Download the installer
2. Run the installer
3. Choose installation directory
4. Launch Mossy

### Installation Process

The NSIS installer will:
1. Show welcome screen
2. Let user choose installation directory
3. Create desktop shortcut
4. Create start menu shortcut
5. Register uninstaller

### Silent Install (Optional)

For automated deployment:

```bash
"Mossy Setup 5.4.21.exe" /S
```

## Auto-Update System

### How It Works

Mossy includes an auto-update system that:

1. **Checks for updates** on startup (after 10 seconds)
2. **Notifies user** when update is available
3. **Requires approval** before downloading
4. **Downloads in background** with progress
5. **Installs on restart** when ready

### Update Flow

```
App Launch → Wait 10s → Check GitHub Releases
    ↓
Update Available → Show Dialog → User Approves
    ↓
Download Update → Progress Bar → Download Complete
    ↓
Show "Ready to Install" → User Restarts → Update Installed
```

### Manual Update Check

Users can manually check for updates:
- Settings → About → "Check for Updates"

### Configuring Updates

Update configuration in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "POINTYTHRUNDRA654",
      "repo": "desktop-tutorial",
      "releaseType": "release"
    }
  }
}
```

### Publishing Updates

To release an update:

1. **Update version** in `package.json`
2. **Build** the application
3. **Create GitHub Release:**
   ```bash
   gh release create v5.4.22 \
     --title "Mossy v5.4.22" \
     --notes "Release notes here" \
     ./release/*.exe
   ```
4. **Attach installer** to the release
5. **Publish release** on GitHub

Users with the app will be notified automatically!

### Update Files

electron-updater looks for:
- `latest.yml` (Windows) - Auto-generated during build
- Installer files attached to GitHub release

## Testing

### Test the Build

Before distributing:

```bash
# 1. Build
npm run package:win

# 2. Install from release/
cd release
# Run the installer

# 3. Test features:
# - App launches
# - All pages work
# - Settings save
# - Files can be selected
# - Updates can be checked
```

### Test Auto-Update

To test the auto-update system:

1. Build version 5.4.21
2. Install it
3. Create GitHub release 5.4.22
4. Launch 5.4.21
5. Wait 10 seconds
6. Should show update dialog

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Run `npm install` again
- Delete `node_modules` and reinstall

**Error: "Build failed"**
- Check Node.js version (need 20.x)
- Check disk space
- Try cleaning: `rm -rf dist dist-electron release`

### Installer Issues

**Installer won't run**
- Windows may block unsigned installers
- Right-click → Properties → Unblock

**Missing files after install**
- Check `build.files` in package.json
- Ensure all assets are included

### Auto-Update Issues

**Updates not detected**
- Check GitHub release is published
- Verify version number is higher
- Check internet connection

**Download fails**
- Check file size limits
- Verify GitHub release has installer attached

## CI/CD (Optional)

To automate builds on GitHub Actions:

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - run: npm run package:win
      - uses: actions/upload-artifact@v3
        with:
          name: installer
          path: release/*.exe
```

## Release Checklist

Before distributing to testers:

- [ ] Update version number in package.json
- [ ] Update CHANGELOG/release notes
- [ ] Run full build: `npm run package:win`
- [ ] Test installer on clean machine
- [ ] Test application launches
- [ ] Test key features work
- [ ] Create GitHub release
- [ ] Upload installer to release
- [ ] Share download link with testers
- [ ] Document known issues

## Support

For build issues:
1. Check this documentation
2. Review electron-builder docs
3. Check GitHub Issues
4. Contact development team

## Next Steps

After building:

1. **Share with testers** - Distribute the installer
2. **Gather feedback** - Track issues and requests
3. **Iterate** - Fix bugs and add features
4. **Release publicly** - When ready!

---

**Current Version:** 5.4.21
**Build Tool:** electron-builder 24.9.1
**Platform:** Windows (NSIS installer)
