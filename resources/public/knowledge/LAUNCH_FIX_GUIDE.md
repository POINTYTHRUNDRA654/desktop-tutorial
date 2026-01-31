# MO2 & Tool Launch Troubleshooting Guide

## Problem
Mossy cannot launch Mod Organizer 2 (MO2) or other programs when you ask.

## Root Cause
Mossy doesn't know where your tools are located. There are three ways Mossy finds tools:
1. **Manual Settings** ← Your configuration in External Tools UI
2. **System Scan Cache** ← Auto-detected tools stored in local cache
3. **AI Explicit Path** ← Direct path passed by AI command

Currently, none of these have your MO2 path.

---

## Solution: Configure Your Tools

### Step 1: Gather Your Tool Paths
Find where your tools are installed. For example:
- MO2: `G:\Modding\MO2\ModOrganizer.exe`  
- FO4Edit: `G:\Tools\FO4Edit\FO4Edit.exe`
- Blender: `C:\Program Files\Blender Foundation\Blender 4.0\blender.exe`

### Step 2: Enter Paths in Mossy

**Method A: Manual Configuration (Recommended)**
1. Open Mossy
2. Click **External Tools** button in the dashboard
3. For each tool you use, click **Browse** and select the `.exe` file
4. Click **Save Settings**
5. Close the panel

**Method B: Auto System Scan**
1. Open Mossy  
2. Click **Desktop Bridge** button
3. Click **System Scan** button
4. Wait for scan to complete (checks C:, D:, E:, F:, G:, etc.)
5. Mossy will remember found tools

---

## Test the Launch

Once configured via either method:

```
You: "Launch MO2"
Mossy: "I have successfully launched Mod Organizer 2..."
```

## Verification

After launch, you should see:
- ✅ **[EXECUTED]** tag in green = Process started successfully
- ❌ **[FAILED]** tag in red = Path invalid or access denied

---

## Debugging: Check Browser Console

If launch still fails:
1. Right-click Mossy → **Inspect** (or press F12)
2. Go to **Console** tab
3. Ask Mossy to launch a tool
4. Look for `[MossyTools]` messages showing:
   - What paths it found
   - Which priority was used
   - Any errors

### Common Log Messages

```
[MossyTools] Path Resolution Debug:
  - toolId: mo2
  - targetSettingKey: mo2Path
  - settingPath from settings: (empty or path)
  - args.path (explicit override): undefined
```

If `settingPath` is empty, you need to **manually configure** it in External Tools.

---

## Advanced: Manual Configuration File

Settings are stored at:
- **Windows**: `%APPDATA%\Electron\mossy-pip-boy-cache\settings.json`

If needed, you can manually edit this file with:
```json
{
  "mo2Path": "G:\\Modding\\MO2\\ModOrganizer.exe",
  "xeditPath": "G:\\Tools\\FO4Edit\\FO4Edit.exe",
  "blenderPath": "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe"
}
```

Then restart Mossy.

---

## Still Not Working?

1. **Verify the path exists**: Open File Explorer and paste your tool path
2. **Check file permissions**: Right-click `.exe` → Properties → Security
3. **Antivirus**: Temporarily disable to test
4. **Restart Mossy**: Close and reopen the application
5. **Check Console Logs**: F12 → Console for `[Main]` error messages

---

## Technical Details

Mossy uses three-tier resolution:
1. **Explicit AI Path** (if AI provides one)
2. **Manual Settings** (from External Tools UI)  ← Start here
3. **System Scan Cache** (auto-detected tools)

The system scan searches these locations:
- Program Files / Program Files (x86)
- AppData\Local / AppData\Roaming
- Root of all drives (C:, D:, E:, F:, G:, etc.)
- Common modding folders (Games, Modding, Tools, etc.)

---

## Still Stuck?

1. Share browser console output (F12 → Console)
2. Share your External Tools settings page screenshot
3. Confirm the path to MO2.exe exists on your drive
