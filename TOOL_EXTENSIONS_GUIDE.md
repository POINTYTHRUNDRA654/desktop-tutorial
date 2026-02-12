# Tool Extensions User Guide

This guide shows how to use the MO2, xEdit, and Creation Kit extensions in Mossy.

---

## Quick Start

All three extensions are located in the sidebar under "Tool Extensions":
- 📦 MO2 Extension
- 🗄️ xEdit Extension  
- 🔧 CK Extension

Each extension **automatically activates** when Neural Link detects the tool running.

---

## 1. MO2 Extension

### What It Does
Integrates with Mod Organizer 2 to show your mod list, load order, and detect conflicts.

### How to Use

**Step 1: Start MO2**
```
Launch Mod Organizer 2 normally
```

**Step 2: Open Extension**
```
Mossy → Sidebar → MO2 Extension
```

**Step 3: View Your Mods**
- See all installed mods
- Green dot = enabled
- Gray dot = disabled
- ⚠️ icon = has conflicts

### Features

**Mod List:**
- Search by name
- Filter by enabled/disabled/all
- See priority order
- View categories and versions

**Load Order:**
- Complete plugin list
- ESM/ESP indicators
- Load index numbers

**Quick Actions:**
- Launch Game - Start Fallout 4 through MO2
- Configure - Open settings
- View Logs - Check recent activity
- Export List - Save mod list to file

**Statistics:**
- Active mods count
- Total plugins
- Detected conflicts

### Example Workflow

```
1. Start MO2
2. Open MO2 Extension in Mossy
3. Check statistics (23/45 mods active)
4. Search for "weapons" to find weapon mods
5. Filter to "Enabled Only"
6. Check load order
7. Click "Launch Game"
```

---

## 2. xEdit Extension

### What It Does
Provides quick access to common xEdit scripts for cleaning, analysis, and batch operations.

### How to Use

**Step 1: Start xEdit**
```
Launch FO4Edit, SSEEdit, or any xEdit variant
```

**Step 2: Open Extension**
```
Mossy → Sidebar → xEdit Extension
```

**Step 3: Run Scripts**
- Browse available scripts
- Click a script card to run it
- Watch real-time output

### Available Scripts

**Cleaning (Green):**
- Clean Masters - Remove dirty edits and ITMs
- Remove ITMs - Remove Identical To Master records
- Undelete References - Fix deleted references

**Batch Operations (Blue):**
- Batch Rename Records - Rename multiple records at once

**Analysis (Purple):**
- Export Cell Data - Export cell info to CSV
- Conflict Analysis - Find record conflicts

**Conversion (Cyan):**
- ESM to ESP - Convert master to plugin
- ESP to ESM - Convert plugin to master

### Features

**Script Execution:**
- One-click running
- Real-time terminal output
- Success/error status
- Estimated time display

**Quick Operations:**
- Quick Clean - Fast master cleaning
- Find Conflicts - Instant conflict check
- Custom Script - Load your own
- Script Editor - Edit existing scripts

**Search & Filter:**
- Search by script name
- Filter by category
- Category badges

### Example Workflow

```
1. Start FO4Edit
2. Load your mod plugin
3. Open xEdit Extension in Mossy
4. Click "Clean Masters" script
5. Watch output terminal
6. See "Success" message
7. Close FO4Edit and save
```

---

## 3. Creation Kit Extension

### What It Does
Adds auto-save, script compilation queue, and productivity tools to Creation Kit.

### How to Use

**Step 1: Start CK**
```
Launch CreationKit.exe
```

**Step 2: Open Extension**
```
Mossy → Sidebar → CK Extension
```

**Step 3: Enable Auto-Save**
- Toggle auto-save ON
- Choose interval (3, 5, 10, or 15 minutes)

### Features

**Auto-Save System:**
- Configurable intervals
- Last save timestamp
- Background operation
- Activity logging

**Script Compilation:**
- View recent Papyrus scripts
- One-click compile
- Batch compile all uncompiled
- Queue management
- Error reporting

**Activity Log:**
- Real-time event tracking
- Timestamps
- Success/error messages
- Last 10 entries shown

**Active Cell Tracking:**
- Shows current worldspace
- Cell name display

### Quick Actions

- **Save Now** - Force immediate save
- **View Logs** - Open log files
- **Script Editor** - Edit Papyrus scripts
- **Settings** - Configure extension

### Example Workflow

```
1. Start Creation Kit
2. Load your mod
3. Open CK Extension in Mossy
4. Enable auto-save (5 min interval)
5. Edit cells/scripts in CK
6. Extension auto-saves every 5 minutes
7. Compile scripts from extension
8. View compilation status
9. Check activity log
```

---

## Detection Status

All extensions show connection status in the top-right:

**🟢 Connected** (Green)
```
Tool is running and detected
Extension is active
```

**🔴 Not Connected** (Gray)
```
Tool is not running
Extension is waiting
Start the tool to activate
```

### What Neural Link Detects

**MO2:**
- ModOrganizer.exe
- mo2.exe
- Mod Organizer 2.exe

**xEdit:**
- FO4Edit.exe
- SSEEdit.exe
- TES5Edit.exe
- FNVEdit.exe
- FO3Edit.exe

**Creation Kit:**
- CreationKit.exe
- CK.exe

Detection updates every 5 seconds automatically.

---

## Tips & Best Practices

### MO2 Extension

✅ **Do:**
- Keep MO2 running while using extension
- Check conflicts before launching
- Export mod list for backup
- Use search to find specific mods

❌ **Don't:**
- Close MO2 while extension is open
- Modify load order externally
- Enable too many conflicting mods

### xEdit Extension

✅ **Do:**
- Backup plugins before cleaning
- Read script descriptions
- Watch output for errors
- Run conflict analysis before release

❌ **Don't:**
- Clean master files without backup
- Run scripts on vanilla files
- Interrupt running scripts
- Clean mods you don't own

### CK Extension

✅ **Do:**
- Enable auto-save immediately
- Choose 5-10 min intervals
- Compile scripts regularly
- Check activity log for errors

❌ **Don't:**
- Disable auto-save
- Ignore compilation errors
- Leave CK open indefinitely
- Skip error messages

---

## Troubleshooting

### Extension Not Activating

**Problem:** "Tool Not Detected" message

**Solutions:**
1. Make sure tool is actually running
2. Check Task Manager for process
3. Wait 5 seconds for auto-detection
4. Restart tool if needed

### MO2 Not Showing Mods

**Problem:** Mod list is empty

**Solutions:**
1. Verify MO2 is running
2. Check active profile
3. Reload MO2
4. Click "Refresh" button

### xEdit Scripts Not Running

**Problem:** Script execution fails

**Solutions:**
1. Ensure xEdit has plugin loaded
2. Check output for errors
3. Try different script
4. Restart xEdit

### CK Auto-Save Not Working

**Problem:** No auto-saves happening

**Solutions:**
1. Toggle auto-save OFF then ON
2. Check interval setting
3. Verify CK is running
4. Look for save confirmation in log

---

## Advanced Features

### MO2: Export Mod List

```
1. Open MO2 Extension
2. Click "Export List"
3. Choose save location
4. Share with other modders
```

### xEdit: Custom Scripts

```
1. Open xEdit Extension
2. Click "Custom Script"
3. Browse to your .pas file
4. Run script
```

### CK: Batch Compilation

```
1. Open CK Extension
2. See list of uncompiled scripts
3. Click "Compile All Uncompiled"
4. Wait for queue to finish
```

---

## Keyboard Shortcuts

Coming soon! Will add hotkeys for:
- Quick save (CK)
- Run last script (xEdit)
- Refresh data (MO2)

---

## FAQ

**Q: Do I need all three tools running?**
A: No, each extension works independently.

**Q: Can I use extensions without Neural Link?**
A: Yes, but auto-detection won't work. Features still available.

**Q: Are my files safe?**
A: Extensions don't modify files directly. Always backup first.

**Q: Can I add custom scripts to xEdit?**
A: Future feature! Currently has 8 built-in scripts.

**Q: Does auto-save replace CK's auto-save?**
A: No, it's additional protection. Keep CK's built-in save too.

**Q: What if my tool crashes?**
A: Extensions are read-only. They won't cause crashes.

---

## Need Help?

- Click "Help" button in any extension
- Visit /reference in Mossy
- Check Neural Link for tool status
- Review activity logs

---

## Summary

All three extensions:
- ✅ Auto-detect when tools run
- ✅ Provide useful features
- ✅ Safe and non-invasive
- ✅ Easy to use
- ✅ Professional UI

**Start using:** Just run your tool and open the extension!
