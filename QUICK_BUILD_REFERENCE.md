# 🚀 QUICK REFERENCE: Building & Distributing Mossy

## Build for Testers (3 Commands)

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Build the app
npm run build

# 3. Create installer
npm run package:win
```

**Output:** `release/Mossy Setup 5.4.21.exe` ← Share this!

---

## Share with Testers

1. Upload `release/Mossy Setup 5.4.21.exe` to:
   - Google Drive / Dropbox / OneDrive
   - OR send via email if < 25MB

2. Send link to testers

3. Done! They install and run.

---

## Release an Update

### Quick Method

1. **Update version** in `package.json`:
   ```json
   "version": "5.4.22"
   ```

2. **Build:**
   ```bash
   npm run package:win
   ```

3. **Create GitHub Release:**
   - Go to: https://github.com/POINTYTHRUNDRA654/mossy-ai/releases
   - Click "Create a new release"
   - Tag: `v5.4.22`
   - Upload: `release/Mossy Setup 5.4.22.exe`
   - Click "Publish"

4. **Done!** All users will be notified automatically.

---

## Auto-Update Flow

```
User Opens Mossy
    ↓ (after 10 seconds)
Checks GitHub for Updates
    ↓ (if new version)
Shows Notification
    ↓ (user clicks "Download")
Downloads Update
    ↓ (when complete)
Shows "Restart & Install"
    ↓ (user restarts)
Update Installed!
```

---

## Key Features

✅ **User Approval Required** - Never auto-downloads
✅ **Progress Bar** - Shows download status  
✅ **Release Notes** - Displays changelog
✅ **Postpone Option** - User can click "Later"
✅ **Non-Blocking** - App stays usable during download
✅ **Restart Control** - User chooses when

---

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules dist dist-electron release
npm install
npm run build
npm run package:win
```

### Windows Blocks Installer
- Right-click installer → Properties → Unblock → OK
- Or click "More info" → "Run anyway"

### Update Not Working
- Verify GitHub release is **published** (not draft)
- Check version number is **higher** than current
- Test after 10 seconds of app launch

---

## Files to Share

**For Testers:**
- `release/Mossy Setup 5.4.21.exe` - The installer

**Documentation:**
- `BUILD_GUIDE.md` - Complete build guide
- `DISTRIBUTION_PACKAGE_SUMMARY.md` - Full summary
- This file - Quick reference

---

## Version Numbers

**Current:** 5.4.21

**Next Release:**
- 5.4.22 = Bugfix
- 5.5.0 = New features
- 6.0.0 = Major update

---

## Commands Reference

```bash
# Development
npm run dev              # Run in dev mode

# Building
npm run build            # Build app files
npm run build:vite       # Build frontend only
npm run build:electron   # Build electron only
npm run package          # Package for all platforms
npm run package:win      # Package for Windows only

# Testing
npm test                 # Run tests
npm run lint             # Check code quality
```

---

## What Testers Should Test

1. ✅ Installation works
2. ✅ App launches
3. ✅ Onboarding completes
4. ✅ Tutorial is helpful
5. ✅ Chat with Mossy works
6. ✅ Voice chat works (if they have mic)
7. ✅ File analysis works
8. ✅ Update notification appears (after you release v5.4.22)

---

## Support

**Documentation:**
- BUILD_GUIDE.md - Detailed build instructions
- INTERACTIVE_TUTORIAL_FLOW.md - Tutorial system
- DISTRIBUTION_PACKAGE_SUMMARY.md - Complete overview

**Help:**
- Check error messages
- Review BUILD_GUIDE.md troubleshooting
- Contact dev team

---

## ✅ You're Ready!

**To share with testers:**
```bash
npm run build && npm run package:win
# Share release/Mossy Setup 5.4.21.exe
```

**To release update:**
1. Change version in package.json
2. Build: `npm run package:win`
3. Create GitHub release with installer
4. Users auto-notified!

---

**Current Version:** 5.4.21  
**Status:** ✅ READY FOR DISTRIBUTION  
**Platform:** Windows  
**Update System:** Automatic via GitHub Releases
