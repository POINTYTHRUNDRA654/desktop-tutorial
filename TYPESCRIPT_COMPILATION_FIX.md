# TypeScript Compilation Fix - cacheDriveRoot Error

## Problem
Build was failing during `build:electron` with TypeScript error:
```
Error: src/electron/main.ts(4385,62): error TS2304: Cannot find name 'cacheDriveRoot'.
```

## Root Cause
The variable `cacheDriveRoot` was defined inside a try block (line 3839) but was being referenced in a catch block (line 4385) where it was out of scope.

```typescript
// Inside try block at line 3839
const cacheDriveRoot = path.parse(spriggitDotnetCacheDir).root.replace(/[/\\]$/, '') || 'C:';

// Later in catch block at line 4385 - OUT OF SCOPE
error: `⚠️ DISK SPACE ERROR: Not enough space on ${cacheDriveRoot || 'drive'} to run Spriggit.\n\n`
```

## Solution
Replaced the `cacheDriveRoot` reference with the generic text "drive" in the catch block error message. This is appropriate because:

1. The variable is out of scope in the catch block
2. When an error occurs at this level, we're already in an exceptional state
3. The generic "drive" text is still user-friendly and clear
4. All other references to `cacheDriveRoot` remain valid within the try block scope

## Changes Made
**File**: `src/electron/main.ts` (line 4385)

**Before**:
```typescript
error: `⚠️ DISK SPACE ERROR: Not enough space on ${cacheDriveRoot || 'drive'} to run Spriggit.\n\n`
```

**After**:
```typescript
error: `⚠️ DISK SPACE ERROR: Not enough space on drive to run Spriggit.\n\n`
```

## Verification
- ✅ TypeScript compilation completes without TS2304 error
- ✅ All other `cacheDriveRoot` references remain valid (inside try block scope)
- ✅ Error messages remain user-friendly and actionable
- ✅ No functional behavior change

## Commit
- Ref: e373254
- Branch: copilot/fix-image-loading-issues
