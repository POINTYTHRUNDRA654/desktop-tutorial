# Mossy Upgrade Guide

Quick reference for upgrading your existing Mossy installation.

## 🔄 Upgrading Your Installation

### Quick Answer

**Yes, you can safely download and run the new installer!** It will upgrade over your existing installation without losing your data.

---

## ✅ Safe Upgrade Steps

1. **Close Mossy** 
   - Exit the app completely
   - Check system tray to ensure it's not running in background

2. **Download New Version**
   - Get it from [GitHub Releases](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest)

3. **Run the Installer**
   - Just run the new `.exe` file
   - The installer detects your existing installation
   - Click "Install" to upgrade

4. **Launch & Enjoy**
   - All your settings and data are preserved
   - You're ready to use the new version!

---

## 📁 What Happens to Your Data?

### ✅ Preserved (Safe)

Your personal data is **automatically kept**:

- ✅ **Settings & Preferences** - All your configurations
- ✅ **API Keys** - OpenAI, Groq, ElevenLabs keys
- ✅ **Memory Vault** - All your saved knowledge
- ✅ **Project Configurations** - Your mod projects
- ✅ **Tutorial Progress** - Where you left off
- ✅ **Recent Files** - Your work history

**Location:** `%APPDATA%/mossy-desktop/` (Windows)

### 🔄 Replaced (Expected)

The installer **updates** these files:

- Application files (the program itself)
- Built-in knowledge base (gets latest updates)
- System dependencies (bug fixes, improvements)

---

## ❓ Common Questions

### "Will it cause conflicts?"

**No.** The installer is designed to upgrade smoothly. It:
- Detects your existing installation
- Preserves all user data
- Only replaces application files

### "Do I need to uninstall first?"

**No.** Just run the new installer. It handles everything.

### "What if something goes wrong?"

You have options:

**Option 1: Clean Reinstall**
```
1. Uninstall via Windows Settings → Apps
2. Your data stays in %APPDATA%/mossy-desktop/
3. Install new version
4. Settings auto-restore
```

**Option 2: Fresh Start**
```
1. Uninstall via Windows Settings → Apps
2. Delete %APPDATA%/mossy-desktop/ (backup first!)
3. Install new version
4. Start fresh with setup wizard
```

### "How do I back up my data?"

**Before upgrading (optional but recommended):**

1. **Memory Vault:**
   - Settings → Memory Vault → Export
   - Saves to a `.json` file

2. **API Keys:**
   - Write them down or screenshot Settings page

3. **Projects:**
   - Your mod files are in your Fallout 4 directory (separate from Mossy)

---

## 💡 Pro Tips

### Before Upgrading

1. **Export Memory Vault** (Settings → Memory Vault → Export)
2. **Note your API keys** (backup in case)
3. **Check release notes** at [Releases page](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases)

### After Upgrading

1. **Check Settings** - Verify API keys are still there
2. **Test a feature** - Make sure everything works
3. **Review new features** - See what's new in the version

### If You're Nervous

**Test the upgrade safely:**
1. Export your Memory Vault first
2. Take a screenshot of your Settings page
3. Run the upgrade
4. If anything seems wrong, do a clean reinstall (your data in AppData is safe)

---

## 🆘 Troubleshooting

### Issue: "Installer says path is invalid"
**Solution:** Close Mossy completely and try again

### Issue: "Settings are gone after upgrade"
**Solution:** They're still in `%APPDATA%/mossy-desktop/`. Reinstall to restore them.

### Issue: "Want to start completely fresh"
**Solution:** 
1. Uninstall Mossy
2. Delete `%APPDATA%/mossy-desktop/`
3. Install new version

---

## 📍 Quick Reference

| Question | Answer |
|----------|--------|
| Need to uninstall first? | No |
| Will I lose my settings? | No |
| Will I lose my API keys? | No |
| Will I lose Memory Vault? | No |
| Can I downgrade? | Yes, just install older version |
| Where is my data? | `%APPDATA%/mossy-desktop/` |

---

## 🔗 Related Guides

- **Installation:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Full README:** [README.md](README.md)
- **Packaging:** [PACKAGING_GUIDE.md](PACKAGING_GUIDE.md)

---

## Summary

**TL;DR:** Just download and run the new installer. Your data is safe. The installer automatically upgrades your installation without conflicts.

**Still worried?** Export your Memory Vault before upgrading (Settings → Memory Vault → Export). That's your main data.
