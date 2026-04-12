# How to Reset and Redo the Onboarding Wizard

## Problem
You need to redo the initial install/onboarding, but Mossy keeps skipping straight to the main app without letting you complete it.

## Why This Happens
Mossy stores onboarding progress and scan data in your browser's localStorage. When you rebuild or reinstall the app, this data persists and causes Mossy to think you've already completed onboarding, even if you haven't finished all the steps.

## Solution: Reset from Settings

### Step-by-Step Instructions

1. **Open Mossy** (even if it skipped onboarding)

2. **Go to Settings**
   - Click the **⚙️ gear icon** in the sidebar
   - Or navigate to the Settings page

3. **Find the "Tutorial & Onboarding" section**
   - Scroll down to see the reset options

4. **Choose your reset option:**

   #### Option A: Full Reset (Recommended)
   - ✅ **Check** "Clear all scan data and start fresh"
   - This will:
     - Clear onboarding completion flags
     - Clear detected programs list
     - Clear system scan results
     - Clear tool preferences
     - Force a fresh system scan
   - **Best for:** Fixing stuck/incomplete onboarding

   #### Option B: Soft Reset
   - ⬜ **Uncheck** "Clear all scan data and start fresh"
   - This will:
     - Clear onboarding completion flags
     - Keep your detected programs
     - Keep scan results
     - Keep tool preferences
   - **Best for:** Just replaying the tutorial with existing data

5. **Click "Replay Tutorial"**

6. **Confirm the reset**
   - Click "Yes, Reset Tutorial"
   - Or click "Cancel" if you changed your mind

7. **Wait for reload**
   - App will show "Tutorial reset complete! Reloading app..."
   - Mossy will automatically reload (takes ~3 seconds)

8. **Complete onboarding**
   - You'll see the full onboarding wizard from the beginning
   - Go through all steps: edition selection, welcome, version, scan, downloads, etc.
   - This time you can complete it fully!

## What Gets Reset

### Always Reset (Both Options)
- ✅ First-run onboarding completion flag
- ✅ Tutorial completion status
- ✅ Voice setup wizard status
- ✅ Boot animation flag

### Reset with "Clear Scan Data" Checked
- ✅ System scan results
- ✅ Detected programs and tool paths
- ✅ Tool preferences and selections
- ✅ Integrated tools list

### Always Preserved (Both Options)
- ✅ All settings and API keys
- ✅ Knowledge Vault and custom data
- ✅ Project data and mod configurations
- ✅ User-created content

## Alternative: Manual Reset via Browser Console

If you can't access Settings, you can reset manually:

1. **Open Developer Tools**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)

2. **Go to Console tab**

3. **Paste this code and press Enter:**

   ```javascript
   // Full reset (clears everything)
   localStorage.removeItem('mossy_has_booted');
   localStorage.removeItem('mossy_onboarding_complete');
   localStorage.removeItem('mossy_onboarding_completed');
   localStorage.removeItem('mossy_tutorial_completed');
   localStorage.removeItem('mossy_tutorial_autostart');
   localStorage.removeItem('mossy_voice_setup_complete');
   localStorage.removeItem('mossy_all_detected_apps');
   localStorage.removeItem('mossy_scan_summary');
   localStorage.removeItem('mossy_scan_summary_prev');
   localStorage.removeItem('mossy_tool_preferences');
   localStorage.removeItem('mossy_integrated_tools');
   localStorage.removeItem('mossy_apps');
   localStorage.removeItem('mossy_last_scan');
   localStorage.setItem('mossy_force_onboarding', 'true');
   console.log('Onboarding reset complete! Reload the app.');
   ```

4. **Reload the app**
   - Press `Ctrl+R` or `F5`
   - Or type: `location.reload()` in console

## Troubleshooting

### Problem: Onboarding Still Skips After Reset

**Possible causes:**

1. **Browser cache issue**
   - Solution: Hard reload with `Ctrl+Shift+R` or `Cmd+Shift+R`

2. **Multiple localStorage items still present**
   - Solution: Check console with `Object.keys(localStorage).filter(k => k.startsWith('mossy_'))`
   - Manually clear any remaining `mossy_*` items

3. **App didn't properly reload**
   - Solution: Close and reopen the app completely

### Problem: Scan Fails During Redo

**Possible causes:**

1. **Windows permissions**
   - Solution: Run as administrator (just once to complete scan)

2. **Missing Electron API**
   - Solution: Check console for error messages
   - See `ONBOARDING_FIX_SUMMARY.md` for debugging

3. **Antivirus blocking WMI queries**
   - Solution: Temporarily disable antivirus or add Mossy to exclusions

### Problem: Can't Find Settings Button

If you're stuck at a blank screen or onboarding auto-completed:

1. Use the **manual reset method** (see above)
2. Or navigate directly to settings: Type `/#/settings` after the app URL in address bar
3. Or delete the app data folder and reinstall (nuclear option)

## Technical Details

### localStorage Keys Used by Onboarding

| Key | Purpose | Reset? |
|-----|---------|--------|
| `mossy_onboarding_complete` | Main completion flag | ✅ Always |
| `mossy_onboarding_completed` | Alternate completion flag | ✅ Always |
| `mossy_has_booted` | First boot flag | ✅ Always |
| `mossy_tutorial_completed` | Tutorial status | ✅ Always |
| `mossy_voice_setup_complete` | Voice wizard status | ✅ Always |
| `mossy_force_onboarding` | Bypass auto-skip flag | ➕ Set by reset |
| `mossy_all_detected_apps` | Scan results | ⚠️ Optional |
| `mossy_scan_summary` | Scan metadata | ⚠️ Optional |
| `mossy_tool_preferences` | User selections | ⚠️ Optional |
| `mossy_integrated_tools` | Approved tools | ⚠️ Optional |
| `mossy_apps` | App permissions | ⚠️ Optional |
| `mossy_last_scan` | Last scan timestamp | ⚠️ Optional |

### Auto-Skip Logic

FirstRunOnboarding checks these conditions in order:

1. **Is `mossy_onboarding_complete` set?**
   - ✅ Yes → Skip to main app
   - ❌ No → Continue checking

2. **Is `mossy_force_onboarding` set?**
   - ✅ Yes → Run full onboarding (user explicitly reset)
   - ❌ No → Continue checking

3. **Does scan data exist?**
   - ✅ Yes → Auto-complete and skip
   - ❌ No → Run full onboarding

This is why setting `mossy_force_onboarding` is important - it tells the app you want to redo onboarding even if data exists.

## Need More Help?

1. Check `ONBOARDING_FIX_SUMMARY.md` for technical debugging
2. Check browser console for error messages (F12)
3. Look for `[FirstRunOnboarding]` logs in console
4. Report the specific error message if you're still stuck

## Version History

- **v5.4.27** - Added reset onboarding feature with scan data option
- **Previous** - Onboarding could get stuck with leftover data
