# Spriggit Smart App Control Crash Fix - Complete Solution

## Problem Statement

User reported persistent Spriggit crashes for **3 days** with exit code **0xFFFFFFFF (4294967295)** despite trying multiple fixes:
- ✗ Unblocking files (temporary, gets undone when cache is cleared)
- ✗ Clearing cache (re-extracts assemblies that get blocked again)
- ✓ Has correct Spriggit version (v0.40.0+Branch.main)
- ✓ Has .NET SDK installed
- ✓ Game version detected correctly (FO4 1.11.191.0)

**Root Cause:** Windows Smart App Control (SAC) on Windows 11 blocks the .NET assemblies that Spriggit extracts at runtime from the single-file executable, even when stored in a custom cache directory next to the exe.

## Why Previous Fixes Didn't Work

### 1. **Unblock Files** (Temporary)
- Removes the "Zone.Identifier" (downloaded-from-internet flag) from files
- Works UNTIL the user clicks "Clear Cache & Retry"
- Clearing cache deletes all assemblies and re-extracts NEW ones
- **NEW assemblies are NOT unblocked** → crash repeats

### 2. **Custom Cache Directory** (Not Enough)
- Mossy already sets `DOTNET_BUNDLE_EXTRACT_BASE_DIR` to `{SpriggitDir}/spriggit-dotnet-cache/`
- This improves trust vs. `%TEMP%`, but SAC still evaluates EACH extracted DLL individually
- Even though they're next to a trusted exe, they're **dynamically generated** at runtime
- SAC treats them as suspicious and blocks them

### 3. **The ONLY Permanent Fix**
**Add a Windows Defender Exclusion for the entire Spriggit folder**

This tells Windows Security to trust ALL files in that directory, permanently bypassing Smart App Control's checks.

## The Solution (3 Components)

### 1. Enhanced UI - Prominent Step-by-Step Guide

**Before (Hidden in small text):**
```
Run in PowerShell (Admin): Add-MpPreference -ExclusionPath "C:\..." [📋 Copy]
```

**After (Large, detailed help panel):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ ⚠️ Administrator Rights Required                        │
│                                                             │
│ Step-by-step instructions:                                 │
│ 1. Click Windows Start, type "PowerShell"                  │
│ 2. Right-click "Windows PowerShell"                        │
│ 3. Select "Run as administrator"                           │
│ 4. Paste and run this command:                             │
│                                                             │
│   Add-MpPreference -ExclusionPath "C:\Tools\Spriggit"      │
│   [📋 Copy - Big green button]                             │
│                                                             │
│ 5. After running: Close PowerShell, click "Clear Cache"    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Verification System

**New IPC Handler:** `SPRIGGIT_VERIFY_DEFENDER_EXCLUSION`

**Backend (main.ts):**
- Runs: `powershell Get-MpPreference | Select-Object -ExpandProperty ExclusionPath`
- Checks if the Spriggit folder appears in the exclusion list
- Case-insensitive, normalized path comparison

**Frontend (FirstRunOnboarding.tsx):**
- **"🔍 Verify Defender Exclusion"** button
- Shows immediate feedback:
  - ✅ **Verified:** "Confirmed! C:\Tools\Spriggit is excluded from Defender"
  - ⚠️ **Not Found:** "Not in exclusion list. Make sure you ran the command as Administrator"
  - ❌ **Error:** Shows error message

**After Successful Verification:**
```
✨ Great! Now:
1. Click "🗑️ Clear Cache & Retry" to wipe old blocked assemblies
2. Spriggit will re-extract fresh assemblies that won't be blocked
3. The digest should complete successfully!
```

### 3. Automatic Attempt + Manual Fallback

**First Try (Automatic):**
- "⭐ Add Defender Exclusion (Recommended)" button tries to add exclusion via `execSync`
- Works if Mossy is already running as Administrator OR user has sufficient rights
- Most consumer machines: **Access Denied** → triggers manual instructions

**Fallback (Manual):**
- Shows the large help panel with step-by-step PowerShell instructions
- User runs command in elevated PowerShell
- Clicks "Verify" to confirm it worked
- Then "Clear Cache & Retry" to finish

## Technical Implementation

### Files Changed

#### `src/electron/main.ts`
```typescript
// New handler: spriggit-verify-defender-exclusion
registerHandler(IPC_CHANNELS.SPRIGGIT_VERIFY_DEFENDER_EXCLUSION, async () => {
  const output = execSync(
    'powershell -NoProfile -NonInteractive -Command "Get-MpPreference | Select-Object -ExpandProperty ExclusionPath"',
    { timeout: 15_000, windowsHide: true, encoding: 'utf-8' }
  );
  const normalizedTarget = targetPath.replace(/\//g, '\\').toLowerCase();
  const exclusions = output.split('\n').map(line => line.trim().replace(/\//g, '\\').toLowerCase());
  const excluded = exclusions.includes(normalizedTarget);
  return { ok: true, excluded, targetPath };
});
```

#### `src/electron/types.ts`
```typescript
SPRIGGIT_VERIFY_DEFENDER_EXCLUSION: 'spriggit-verify-defender-exclusion',

spriggitVerifyDefenderExclusion: () => Promise<{
  ok: boolean;
  excluded?: boolean;
  targetPath?: string;
  error?: string;
}>;
```

#### `src/electron/preload.ts`
```typescript
spriggitVerifyDefenderExclusion: (): Promise<{ ok: boolean; excluded?: boolean; targetPath?: string; error?: string }> => {
  return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_VERIFY_DEFENDER_EXCLUSION);
}
```

#### `src/renderer/src/FirstRunOnboarding.tsx`
- New state: `verificationState`, `verificationMessage`
- Large help panel (75 lines of JSX)
- Verification button + feedback UI
- Success/failure messaging with next-step guidance

## Build Verification

✅ **Vite Build:** 7.80s (no errors)  
✅ **TypeScript:** Clean compilation (0 errors)  
✅ **Code Review:** 3 minor suggestions (addressed)  
✅ **CodeQL Security:** 0 alerts  

## User Instructions Summary

### For Users Experiencing This Issue:

1. **When Spriggit crashes with 0xFFFFFFFF:**
   - Click **"⭐ Add Defender Exclusion (Recommended)"**
   - If it succeeds → skip to step 5
   - If it says "Administrator rights required" → continue to step 2

2. **Open PowerShell as Administrator:**
   - Click Windows Start
   - Type "PowerShell"
   - Right-click "Windows PowerShell"
   - Select **"Run as administrator"**

3. **Run the command:**
   - Copy the green command from Mossy's help panel
   - Right-click in PowerShell to paste
   - Press Enter
   - If successful, you'll see no output (that's normal!)

4. **Verify it worked:**
   - Close PowerShell
   - In Mossy, click **"🔍 Verify Defender Exclusion"**
   - Should show: "✅ Confirmed! Your Spriggit folder is excluded"

5. **Finish the fix:**
   - Click **"🗑️ Clear Cache & Retry"**
   - Spriggit will re-extract assemblies cleanly
   - Digest should now complete successfully!

## Why This Is the ONLY Permanent Fix

| Fix                          | Duration  | Why It Fails                                          |
|------------------------------|-----------|-------------------------------------------------------|
| Unblock Files                | Temporary | Cleared when cache is wiped; new files NOT unblocked  |
| Set SAC to "Evaluation"      | Session   | May be locked/greyed out on Win 11; resets on reboot |
| Disable AV                   | Temporary | Security risk; re-enables itself                      |
| **Defender Exclusion**       | ✅ **Permanent** | ✅ **Survives cache clears, reboots, and AV scans** |

## Additional Notes

- **Security:** The exclusion is folder-specific, not system-wide
- **Scope:** Only affects the Spriggit directory (e.g., `C:\Tools\Spriggit`)
- **Reversible:** Can be removed via Windows Security settings
- **No External Dependencies:** Uses built-in PowerShell cmdlets
- **Cross-Version:** Works on all Windows 10/11 with Defender

## Related Issues

- Windows Smart App Control: [Microsoft Docs](https://support.microsoft.com/en-us/windows/windows-11-smart-app-control-13b8b6af-7ab8-4008-a9a6-09ea04c49cf6)
- .NET Single-File Deployment: [Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/)
- Spriggit Repository: [github.com/Mutagen-Modding/Spriggit](https://github.com/Mutagen-Modding/Spriggit)

## Conclusion

This fix provides a **permanent, user-friendly solution** to the Smart App Control crash that has been blocking users for days. The enhanced UI makes the manual PowerShell process easy to follow, and the verification system confirms the fix worked before wasting time on another retry.

**Expected Result After Fix:**
- ✅ Spriggit digest completes successfully
- ✅ Vanilla ESMs ingested into Knowledge Vault
- ✅ No more 0xFFFFFFFF crashes
- ✅ User can proceed with modding workflow

---
**Implementation Date:** April 11, 2026  
**Build Verified:** ✅ Clean  
**Validation Passed:** ✅ Code Review + CodeQL  
