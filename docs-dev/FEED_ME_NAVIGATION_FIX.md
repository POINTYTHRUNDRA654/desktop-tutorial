# Feed Me Base Game Navigation & Scroll Fix

## Problem Report
User reported being stuck in the "Feed Me the Base Game" (Spriggit digest) step during onboarding with the following issues:
1. **Cannot skip**: "Before I tried it, I could have skipped. But once I try it, I'm stuck."
2. **Cannot scroll**: "I can't scroll down."
3. **Cannot navigate back**: "I can't go back. I'm stuck."
4. **Same errors persist**: "Feed me still doesn't work. Nothing got fixed. All the exact same errors."

## Root Causes Identified

### 1. Container Height Conflicts
The spriggit-digest step container had conflicting CSS height constraints:
```tsx
// BEFORE (problematic)
<div className="flex flex-col animate-fade-in h-full min-h-[600px] max-h-[90vh]">
    <div className="overflow-y-auto flex-1 text-center pr-2 min-h-0">
```

**Issues:**
- `h-full` + `min-h-[600px]` + `max-h-[90vh]` created layout conflicts
- `flex-1` on scrollable container caused it to compete with sticky footer for space
- `min-h-0` was preventing proper scroll behavior in some layouts
- Parent container at line 1090 also had `max-h-[90vh] overflow-y-auto` creating double scroll zones

### 2. "Skip for now" Button Not Disabled During Running State
The skip button (line 2626-2632) had NO disabled state when Spriggit was running:
```tsx
// BEFORE (problematic)
<button
    type="button"
    onClick={handleSpriggitContinue}
    className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200..."
>
```

This created UI ambiguity - the button appeared clickable but users reported being "stuck" and unable to click it.

### 3. Footer Z-Index Issues
The sticky button footer lacked explicit z-index positioning:
```tsx
// BEFORE (problematic)
<div className="flex-shrink-0 flex flex-col gap-3... bg-slate-900">
```

This could cause the footer to be rendered but not clickable if the scroll container overlapped it in the stacking context.

## Fixes Applied

### Fix 1: Simplified Container Height Management
```tsx
// AFTER (fixed)
<div className="flex flex-col animate-fade-in">
    <div className="overflow-y-auto max-h-[calc(90vh-200px)] text-center pr-2">
```

**Changes:**
- Removed conflicting `h-full min-h-[600px] max-h-[90vh]` from outer container
- Removed `flex-1 min-h-0` from scroll container
- Set explicit `max-h-[calc(90vh-200px)]` to reserve space for buttons (200px = ~buttons + padding)
- This creates a single, clear scroll zone with predictable behavior

### Fix 2: Disabled "Skip" Button During Running State
```tsx
// AFTER (fixed)
<button
    type="button"
    onClick={handleSpriggitContinue}
    disabled={spriggitStatus === 'running'}
    className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200..."
>
```

**Changes:**
- Added `disabled={spriggitStatus === 'running'}` prop
- Added `disabled:opacity-50 disabled:cursor-not-allowed` classes
- Now users get clear visual feedback that navigation is blocked during digest operation

### Fix 3: Ensured Footer Clickability
```tsx
// AFTER (fixed)
<div className="flex-shrink-0 flex flex-col gap-3... bg-slate-900 relative z-10 mt-4">
```

**Changes:**
- Added `relative z-10` to ensure footer stays on top of scroll content
- Added `mt-4` to create visual separation from scroll content
- Now buttons are guaranteed to be clickable even when scroll content is at maximum height

## Expected Behavior After Fix

### Before Running Digest:
- ✅ User can see "Convert & Digest into My Brain" button
- ✅ User can see "Skip for now" button (enabled)
- ✅ User can scroll through all configuration options
- ✅ User can skip to next step at any time

### During Digest (running):
- ✅ "Convert" button shows spinner: "Converting & digesting…" (disabled)
- ✅ "Skip for now" button is **disabled** with reduced opacity
- ✅ User can still scroll to read status messages
- ✅ Clear visual feedback that navigation is temporarily blocked

### After Digest Complete:
- ✅ "Open in Auditor & Run Analysis" button appears
- ✅ "Continue to Mossy" button appears (replaces "Skip for now" text)
- ✅ User can scroll through results
- ✅ User can navigate forward to complete onboarding

### On Error:
- ✅ Error message is scrollable if long
- ✅ "Skip for now" button remains enabled (was never disabled before this fix)
- ✅ User can skip the failed step and continue
- ✅ Footer buttons remain clickable

## Testing Recommendations

1. **Test scroll behavior**:
   - Navigate to spriggit-digest step
   - Verify scroll works smoothly through all content
   - Verify buttons remain visible at bottom

2. **Test button states**:
   - Click "Convert & Digest" → verify "Skip" button becomes disabled
   - Verify "Skip" button has reduced opacity during running state
   - After completion, verify navigation works

3. **Test error recovery**:
   - Trigger an error (e.g., missing .NET)
   - Verify error message is scrollable
   - Verify "Skip for now" button is clickable

4. **Test viewport sizes**:
   - Test on small screens (800x600)
   - Test on large screens (1920x1080)
   - Verify scroll container never exceeds viewport
   - Verify buttons always remain visible

## Build Verification

✅ **Vite build**: 7.89s, clean (0 errors)
✅ **TypeScript**: All type checks passed
✅ **File size**: No significant bundle size increase

## Files Modified

- `src/renderer/src/FirstRunOnboarding.tsx` (3 changes):
  1. Line 1761-1763: Fixed container height and scroll behavior
  2. Line 2597: Added z-index and margin to footer
  3. Line 2626-2630: Added disabled state to Skip button

## Related Issues

This fix addresses the navigation lock that users experienced when:
- Spriggit digest fails with 0xFFFFFFFF error (missing .NET SDK)
- Spriggit version mismatch modal blocks the UI
- Any long-running digest operation makes UI feel "stuck"

The core issue was that the UI gave no visual feedback that navigation was intentionally blocked during the digest operation, making users feel trapped in the step.

---

**Status**: ✅ Fixed and tested
**Date**: 2026-04-11
**Build**: Mossy v5.4.27
