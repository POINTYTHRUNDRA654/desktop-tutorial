# FirstRunOnboarding Scan & Install Fix

## Problem Statement
User reported: "Now. I can't even do the initial install. And go through the scan."

## Investigation Summary

### What Was Found
1. **All IPC handlers are properly registered** in `src/electron/main.ts`:
   - `detect-programs` (line 1914)
   - `get-system-info` (line 3028)
   - `check-dotnet` (line 3408)
   - `vault-pick-tool-path` (line 4771)

2. **Poor error handling** in the scan process:
   - When the scan failed, it silently jumped to the 'complete' step
   - No visible error message to the user
   - No retry mechanism
   - No way to skip and continue manually

3. **Potential race conditions**:
   - No checks for null/undefined arrays before iterating
   - Missing detailed logging for debugging

## Changes Made

### 1. Enhanced Error Handling (`FirstRunOnboarding.tsx`)

#### Added State Variables
```typescript
const [scanError, setScanError] = useState<string | null>(null);
const [scanRetryCount, setScanRetryCount] = useState(0);
```

#### Improved `startScan()` Function
- Added detailed console logging at each step
- Enhanced error messages that explain what went wrong
- Better API availability checks with logging
- Clear error state on retry
- No longer skips to 'complete' on error - stays on scanning step

**Before:**
```typescript
catch (error) {
    console.error('[Onboarding] Scan failed:', error);
    setStep('complete'); // Bad: silently skip
}
```

**After:**
```typescript
catch (error) {
    console.error('[FirstRunOnboarding] Scan failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    setScanError(errorMessage);
    // Stay on scanning step to show error UI
}
```

#### Enhanced Logging
Now logs:
- API availability check results
- Each step of the scan process (system info, detect programs, .NET check)
- Detailed error information including stack traces
- Retry attempt count

### 2. Improved User Interface

#### Error Display
When scan fails, users now see:
- ❌ Red "Scan Failed" header
- Detailed error message in a readable box
- Two action buttons:
  - **"Retry Scan"** with attempt counter (e.g., "Attempt 2")
  - **"Skip Scan & Continue"** to proceed without scanning

#### Defensive Coding
- Added null check before using `allApps` array in downloads step:
  ```typescript
  const alreadyInstalled = allApps && allApps.length > 0 && allApps.some(...)
  ```
- Prevents crashes if scan returns no data

### 3. Better Debugging

All console logs now prefixed with `[FirstRunOnboarding]` for easy filtering.

Example log output:
```
[FirstRunOnboarding] Electron API check: {
  hasApi: true,
  hasGetSystemInfo: true,
  hasDetectPrograms: true,
  hasCheckDotnet: true
}
[FirstRunOnboarding] Calling getSystemInfo...
[FirstRunOnboarding] System info received: {...}
[FirstRunOnboarding] Calling detectPrograms...
[FirstRunOnboarding] Detected programs: 47
[FirstRunOnboarding] Checking .NET Runtime...
[FirstRunOnboarding] .NET check result: {ok: true, version: "8.0.2"}
```

## Testing Instructions

### 1. Test Normal Flow
1. Start the app fresh (clear localStorage if needed)
2. Go through the onboarding wizard
3. Verify the scan completes successfully
4. Check browser console for `[FirstRunOnboarding]` logs

### 2. Test Error Handling (Simulated Failure)
To test error handling, temporarily modify `startScan()` to throw an error:
```typescript
const startScan = async () => {
    setStep('scanning');
    setScanProgress(10);
    setScanError(null);
    
    // TEST: Simulate failure
    throw new Error('Test error: Simulating scan failure');
    
    // ... rest of code
}
```

Expected behavior:
- Error UI appears with "Scan Failed" message
- "Retry Scan" button is visible
- "Skip Scan & Continue" button is visible
- Clicking Retry re-runs the scan
- Clicking Skip proceeds to downloads step

### 3. Test Real Failure Scenarios

#### Scenario A: Electron API Not Available
This could happen if the preload script fails to load.
- Expected: Clear error message about missing API
- User can skip and continue

#### Scenario B: Permission Denied
If Windows blocks registry access or WMI queries.
- Expected: Error shows Windows security message
- User can retry after fixing permissions or skip

#### Scenario C: Partial Scan Success
System info works but program detection fails.
- Expected: Error shows which step failed
- Partial data is preserved
- User can retry or skip

### 4. Verify Downloads Step
1. Complete the scan (or skip it)
2. Check that the downloads page loads
3. Verify tools can be manually located with "I have it" button
4. Confirm that missing `allApps` data doesn't crash the page

## Potential Root Causes (If Issue Persists)

If users still report problems, investigate:

### 1. Electron Bridge Not Initialized
**Symptom:** `window.electron.api` is undefined

**Check:**
```javascript
console.log('Has electron:', !!window.electron);
console.log('Has api:', !!window.electron?.api);
console.log('Has detectPrograms:', !!window.electron?.api?.detectPrograms);
```

**Fix:** Ensure preload script is properly loaded in `main.ts`

### 2. IPC Channel Mismatch
**Symptom:** Handler registered but never receives calls

**Check:** Verify channel names match exactly:
- `types.ts`: `DETECT_PROGRAMS: 'detect-programs'`
- `preload.ts`: Uses `IPC_CHANNELS.DETECT_PROGRAMS`
- `main.ts`: `registerHandler(IPC_CHANNELS.DETECT_PROGRAMS, ...)`

### 3. Windows Security Restrictions
**Symptom:** WMI queries or registry access blocked

**Solutions:**
- Run as administrator (not recommended for normal use)
- Add app to Windows Defender exclusions
- Check Event Viewer for security audit logs

### 4. Slow System / Timeout
**Symptom:** Scan appears stuck at certain percentage

**Fix:** Increase timeout or add progress indicators for each sub-step

## Build Verification

✅ **Build Status: SUCCESSFUL**
```
npm run build
✓ Vite built in 8.92s
✓ TypeScript compiled with 0 errors
```

## Files Modified

- `src/renderer/src/FirstRunOnboarding.tsx` (95 lines changed)
  - Added error state and retry mechanism
  - Enhanced logging throughout scan process
  - Improved error UI with retry/skip options
  - Defensive null checks in downloads step

## Commit

```
git commit: b2a1937
Message: Add robust error handling and retry mechanism to FirstRunOnboarding scan
```

## Next Steps

1. **Test the fix** with the real app
2. **Monitor console logs** for any new errors
3. **Check Windows Event Viewer** if program detection fails
4. **Report specific error messages** if issues persist

If scan still fails after this fix, the error message will now be visible and provide clues about the root cause.
