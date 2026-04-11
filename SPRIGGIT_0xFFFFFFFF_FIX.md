# Spriggit 0xFFFFFFFF Crash - Improved Diagnostics

## What Changed

I've updated Mossy's Spriggit error handling to provide **much better, more actionable error messages** when Spriggit crashes with exit code `0xFFFFFFFF`.

## The Problem You Encountered

You correctly:
- ✅ Downloaded the PRE-RELEASE Spriggit (which should work out-of-the-box)
- ✅ Turned OFF Smart App Control
- ✅ Got the Fallout 4 files
- ✅ Got YAML output

BUT you were still seeing 0xFFFFFFFF crashes and confusing error messages that blamed Smart App Control or .NET SDK.

## The Real Root Causes (Prioritized)

The new error messages now check for issues in **priority order**:

### 1. **DISK SPACE / PERMISSIONS** (MOST COMMON) 🔴
- Spriggit extracts .NET assemblies to a cache folder next to the exe
- Needs ~500MB free space
- If the folder is read-only (like `Program Files`), extraction fails → 0xFFFFFFFF

**New Fix**: Mossy now tests if it can write to the Spriggit folder FIRST, before blaming .NET

### 2. **STALE CACHE** (when .NET IS installed)
- Old extracted assemblies can become corrupted
- **New Fix**: "Clear Cache & Retry" button is now emphasized as the #1 fix

### 3. **WRONG ZIP DOWNLOADED**
- `Spriggit.zip` (GUI app) won't work
- Need `SpriggitCLI.zip` instead
- For FO4 1.11.x, need the **PRE-RELEASE** build (not "Latest")

### 4. **ANTIVIRUS BLOCKING**
- Some AVs kill the process during extraction

### 5. **ARCHITECTURE MISMATCH**
- Using x86 build on x64 system

## What the New Error Messages Look Like

### If Disk Space/Permission Issue:
```
❌ Spriggit crashed immediately (exit code 0xFFFFFFFF).

🔴 MOST LIKELY CAUSE: Disk space or permission issue
   Cannot write to: D:\Tools\Spriggit

FIXES TO TRY (in order):
  1. Free up space on D: (need ~500MB)
  2. Move Spriggit to a different folder with more space
  3. Run Mossy as Administrator (if Spriggit is in Program Files)
  4. Click "Clear Cache & Retry" below
```

### If .NET IS Installed:
```
❌ Spriggit crashed immediately (exit code 0xFFFFFFFF).

✅ .NET SDK is installed — so that's NOT the problem.

MOST LIKELY FIXES (try in order):
  1. Click "Clear Cache & Retry" below — wipes stale .NET assemblies
  2. Check disk space on D: — extraction needs ~500MB free
  3. Wrong ZIP downloaded?
     ⚠️ Make sure you have SpriggitCLI.zip (NOT Spriggit.zip)
     ⚠️ For FO4 1.11.x, use the PRE-RELEASE build (not "Latest")
  4. Antivirus blocking?
  5. Architecture mismatch?
```

### If .NET NOT Installed:
```
❌ Spriggit crashed immediately (exit code 0xFFFFFFFF).

⚠️ .NET SDK not detected — but the PRE-RELEASE build should work anyway!

EASIEST FIX — Use the self-contained PRE-RELEASE build:
  1. Go to: https://github.com/Mutagen-Modding/Spriggit/releases
  2. Scroll past "Latest" to find the entry tagged "Pre-release"
  3. Download SpriggitCLI.zip (NOT Spriggit.zip)
  4. Extract to a clean folder with plenty of space
  5. Use that Spriggit.CLI.exe in Mossy

This build bundles .NET and works out-of-the-box (no SDK needed).

OR — Install .NET SDK if you prefer:
  Download: https://dotnet.microsoft.com/download/dotnet
  After installing, RESTART YOUR PC, then retry
```

## Technical Changes

### Files Modified
- **`src/electron/main.ts`** - Enhanced `SPRIGGIT_SERIALIZE` IPC handler
  - Added disk space/permission check (attempts to write a test file)
  - Prioritized error messages based on actual detected state
  - Removed misleading Smart App Control mentions when .NET is present
  - Disabled the strict pre-flight .NET requirement check (commented out)
    - Rationale: The self-contained build should work without .NET
    - The self-test (running `--version`) catches crashes more reliably
  - Better visual hierarchy with emojis (🔴, ✅, ⚠️) and numbered lists

### Error Flow (New)
```
1. Attempt to create cache directory
2. Run Spriggit.CLI.exe --version (self-test)
3. If exit code = 0xFFFFFFFF:
   a. Test disk write permissions
   b. Re-check .NET installation
   c. Return prioritized error message based on findings
```

## For Your Specific Case

Based on your screenshot showing:
- PRE-RELEASE installed ✅
- Smart App Control OFF ✅
- Still getting 0xFFFFFFFF

**Most likely fixes to try (in order)**:
1. Click **"Clear Cache & Retry"** in Mossy
2. Check if `D:\Tools\Spriggit\spriggit-dotnet-cache\` exists and is writable
3. Free up space on the D: drive if it's nearly full
4. Try moving Spriggit to a different folder (e.g., `C:\Spriggit\`)

## Why This Is Better

### Before:
- Long walls of text
- Assumed Smart App Control was the issue even when it was OFF
- Didn't prioritize the most common causes
- Didn't distinguish between self-contained vs SDK-dependent builds

### After:
- ✅ Checks disk space/permissions FIRST
- ✅ Clear visual priority (emojis, numbered lists)
- ✅ Only mentions Smart App Control when relevant
- ✅ Emphasizes "Clear Cache & Retry" when .NET is installed
- ✅ Explains that PRE-RELEASE should work without .NET
- ✅ Actionable, step-by-step fixes

## Build Status
✅ TypeScript compilation clean
✅ No new dependencies added
✅ Backward compatible (existing users see improved messages)

---

**Bottom line**: The error messages now match what users actually experience and provide fixes in priority order. No more wild goose chases blaming Smart App Control when it's actually a disk space issue!
