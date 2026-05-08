# Spriggit Windows Smart App Control (SAC) 0xFFFFFFFF Crash Loop - FIXED

## Problem You Were Experiencing

Based on your screenshots, you were stuck in this loop:

1. **Spriggit crashes** with exit code `0xFFFFFFFF` (4294967295)
2. **UI tells you**: "Unblock 12 files in Spriggit folder"
3. **You unblock** the files ✅
4. **UI says**: "now click Clear Cache & Retry to finish"
5. **You clear cache** → Spriggit **deletes** those unblocked files
6. **Spriggit re-extracts** fresh .NET assemblies → **NOT unblocked**
7. **SAC blocks them** → crash with 0xFFFFFFFF again
8. **Repeat forever** 😞

## Root Cause

**Windows 11 Smart App Control** (SAC) blocks unsigned DLLs extracted at runtime. When you:
- Unblock files → they work temporarily
- Clear cache → **deletes** the unblocked files
- Spriggit runs → extracts **NEW** files (never unblocked)
- SAC blocks the new files → crash

The old UI **incorrectly** suggested Unblock → Clear Cache would fix it. This was the **wrong order**.

## The Fix

### What Changed in the UI

1. **Windows Defender Exclusion is now the PRIMARY fix**
   - Appears **immediately** when 0xFFFFFFFF is detected on FO4 1.11.x
   - Styled with **yellow border** and labeled **"⭐ Add Defender Exclusion (Recommended)"**
   - Shows up **before** the Unblock Files button

2. **Updated Unblock Files success message** (for FO4 1.11.x):
   ```
   ✅ Unblocked 12 file(s) in ...Tools/Spriggit
   ⚠️ Unblock is temporary! Clearing cache will delete these files and extract 
   NEW ones that will NOT be unblocked. Add a Windows Defender exclusion below 
   instead for a permanent fix, then click Clear Cache.
   ```

3. **Removed duplicate Defender exclusion button**
   - Old UI buried it in late-stage failure messages
   - Now shows **only once** at the top as the primary solution

4. **Updated error messages** to reference the primary button:
   - "Use the '⭐ Add Defender Exclusion' button at the top"

### Correct Workflow Now

**Option A: Let Mossy add the exclusion (easiest)**
1. Click **"⭐ Add Defender Exclusion (Recommended)"**
2. If Mossy has admin rights → done ✅
3. If not → Mossy shows PowerShell command with **📋 Copy** button
4. Run the command in **PowerShell (Admin)**
5. Click **"🗑️ Clear Cache & Retry"**
6. Spriggit works ✅

**Option B: Manual exclusion (if you prefer)**
1. Open **Windows Security** → **Virus & threat protection** → **Exclusions**
2. Add exclusion for your Spriggit folder (e.g. `D:\Tools\Spriggit`)
3. Click **"🗑️ Clear Cache & Retry"** in Mossy
4. Spriggit works ✅

## Why This is the Permanent Fix

**Windows Defender exclusion** tells SAC:
- "Trust everything in this folder, even unsigned DLLs"
- Works **forever**, even when Spriggit extracts new assemblies
- No need to manually unblock files every time

**Unblock-File** only:
- Removes the "downloaded from internet" flag from **existing** files
- Gets **undone** when you clear the cache (cache delete → new extraction)
- Temporary workaround, not a permanent solution

## What Mossy Does Behind the Scenes

When you click **"Add Defender Exclusion"**, Mossy runs:
```powershell
Add-MpPreference -ExclusionPath "D:\Tools\Spriggit"
```

This requires **Administrator rights**. If Mossy doesn't have them, it shows you the exact command to copy/paste into an elevated PowerShell window.

## Technical Details (for nerds)

- **Exit code 0xFFFFFFFF** = process crashed before .NET CLR loaded
- **DOTNET_BUNDLE_EXTRACT_BASE_DIR** = Mossy redirects .NET single-file extraction to `{SpriggitDir}/spriggit-dotnet-cache/` (improves SAC trust vs %TEMP%)
- **Auto-unblock-retry logic** = After cache clear, Mossy auto-runs Unblock-File on freshly extracted assemblies and retries once (helps with "Evaluation" mode, but not "On" mode)

## Bottom Line

**Before this fix**: Endless unblock→cache→crash loop
**After this fix**: One-click Defender exclusion → permanent solution

---

## Need Help?

If you're still seeing 0xFFFFFFFF after adding the exclusion:

1. **Re-check .NET SDK** (not just Runtime) is installed:
   - Download: https://dotnet.microsoft.com/download/dotnet
   - Restart PC after installing

2. **Verify you downloaded the correct Spriggit build**:
   - For FO4 1.11.x (AE/Creations Menu) → **PRE-RELEASE (dev)** build
   - On GitHub releases page, scroll past "Latest" and grab the entry tagged "Pre-release"
   - Download **SpriggitCLI.zip** (NOT Spriggit.zip — the GUI app won't work)

3. **Check disk space**:
   - Cache extraction needs several hundred MB free on the drive where Spriggit is installed

4. **Manually test Spriggit** from Command Prompt:
   ```cmd
   Spriggit.CLI.exe serialize --InputPath "path\to\plugin.esp" --OutputPath "C:\Temp\out" --GameRelease Fallout4
   ```
   - Look for the actual error (not just exit code)

---

**Last Updated**: April 11, 2026
**Mossy Version**: Referenced in commit 2f28d6c
