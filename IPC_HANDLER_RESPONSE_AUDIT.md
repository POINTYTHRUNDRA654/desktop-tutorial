# IPC Handler Response Handling Audit
**Date: April 18, 2026**
**Scope: Renderer → Main Process IPC Calls in src/renderer/src/**

---

## Executive Summary

This audit examines React components in `src/renderer/src/` for IPC calls to handlers, analyzing:
1. Which handlers each component calls
2. Response format handling (`.success` vs `.ok` vs other patterns)
3. Mismatches between handler implementations and component expectations
4. Missing handler implementations

**Critical Finding**: Multiple components call handlers that either don't exist or return response formats that components don't expect.

---

## Response Format Patterns Found

| Pattern | Usage | Handler Examples |
|---------|-------|------------------|
| `{ success: boolean, ... }` | Most handlers | parse-pdf, parse-psd, parse-abr, transcribe-* |
| `{ ok: boolean, ... }` | Spriggit operations | spriggit-serialize, spriggit-clear-cache |
| Direct data return | Some APIs | getRunningProcesses, detectPrograms |
| Mixed/Inconsistent | ⚠️ Problem area | DDS handlers, image handlers |

---

## Component-by-Component Findings

### 1. **DDSConverter.tsx**
**Path**: `src/renderer/src/DDSConverter.tsx`

#### Handlers Called
| Handler | Line | Response Format Expected | Actual Status |
|---------|------|-------------------------|----------------|
| `ddsPickFiles` | 120, 215 | `{ success: boolean, paths?: string[] }` | ❌ **NOT IMPLEMENTED** |
| `ddsDetectFormat` | 148, 241 | `{ success: boolean, format: string }` | ❌ **NOT IMPLEMENTED** |
| `ddsConvert` | 193 | `{ success: boolean, outputPath, compressionRatio }` | ❌ **NOT IMPLEMENTED** |
| `ddsGetAllPresets` | 105 | `{ success: boolean, presets: any[] }` | ❌ **NOT IMPLEMENTED** |
| `ddsConvertBatch` | 293 | `{ results: [...], successCount, totalFiles, ... }` | ❌ **NOT IMPLEMENTED** |
| `getImageInfo` | 155 | `{ data: string (base64), format: string }` | ❌ **NOT IMPLEMENTED** |

#### Response Handling Issues
```tsx
// Line 106: Properly checks .success
if (result.success) { console.log('Loaded presets:', result.presets); }

// Line 127: Properly checks .success
if (!result.success) { toast.error(result.error || 'Failed to pick file'); }

// Line 155: ⚠️ UNSAFE - assumes response has .data without checking .success
const imageInfo = await (window.electronAPI as any).getImageInfo(filePath);
if (imageInfo && (imageInfo as any).data) {
  // Will fail if handler doesn't exist or returns error
}

// Line 196: Properly checks .success
if (result.success) { toast.success(...); }
else { toast.error(...); }

// Line 242: Properly checks .success
if (result.success) { setBatchFiles(...); }

// Line 299: ⚠️ UNSAFE - assumes result.results[index]?.success exists
status: result.results[index]?.success ? 'success' : 'error',
```

#### Issues Found
1. ✅ Good: Most checks use `.success` pattern
2. ❌ **CRITICAL**: Handlers `ddsPickFiles`, `ddsDetectFormat`, `ddsConvert`, `ddsGetAllPresets`, `ddsConvertBatch` don't exist in main.ts
3. ⚠️ **UNSAFE**: Line 155 doesn't check `.success` before accessing `.data`
4. ⚠️ **UNSAFE**: Line 299 assumes `result.results` exists without checking parent response

---

### 2. **CKCrashPreventionMining.tsx**
**Path**: `src/renderer/src/CKCrashPreventionMining.tsx`

#### Handlers Called
| Handler | Line | Response Format | Status |
|---------|------|-----------------|--------|
| `spriggitSerialize` | 246, 316 | `{ ok: boolean, files?, error?, ... }` | ✅ **IMPLEMENTED** |
| `spriggitClearCache` | 1166 | `{ ok: boolean, error? }` | ✅ **IMPLEMENTED** |
| `readFile` | N/A (async api call) | Direct return | ✅ **IMPLEMENTED** |

#### Response Handling Issues
```tsx
// Line 210: Properly checks .ok
if (!result.ok || !result.files?.length) {
  const errText = result.error || 'No YAML files produced.';
  setSdStatus('error');
}

// Line 276: Properly checks .ok
if (!result.ok) {
  setCustomModStatus('error');
  setCustomModMessage(`Conversion failed:\n${result.error || 'Unknown error'}`);
}

// Line 1166: Properly checks .ok
const r = await api.spriggitClearCache(); 
clearOk = r.ok;
setSdCacheClearResult(r.ok ? 'ok' : 'error');

// Line 598: Properly checks .success
if (result.success && result.data) { ... }

// Line 649: Properly checks .success
if (result && !result.success) { ... }
```

#### Issues Found
1. ✅ **GOOD**: Consistent use of `.ok` for Spriggit handlers
2. ✅ **GOOD**: Proper error handling with fallback messages
3. ✅ **GOOD**: Checks for optional fields before accessing them
4. ⚠️ **MINOR**: Mixes `.ok` (Spriggit) and `.success` (other APIs) patterns - no single convention

---

### 3. **AutomationManager.tsx**
**Path**: `src/renderer/src/AutomationManager.tsx`

#### Handlers Called
| Handler | Line | Response Format Expected | Actual Status |
|---------|------|-------------------------|----------------|
| `window.automationAPI?.automation.getSettings` | 46 | Direct object return | ⚠️ **UNCLEAR** |
| `window.automationAPI?.automation.getStatistics` | 56 | Direct object return | ⚠️ **UNCLEAR** |
| `window.automationAPI?.automation.stop/start` | 66, 69 | Void/status | ⚠️ **UNCLEAR** |
| `window.automationAPI?.automation.toggleRule` | 80 | Void/status | ⚠️ **UNCLEAR** |
| `window.automationAPI?.automation.triggerRule` | 90 | Void/status | ⚠️ **UNCLEAR** |
| `window.automationAPI?.automation.resetStatistics` | 100 | Void/status | ⚠️ **UNCLEAR** |

#### Response Handling Issues
```tsx
// Line 46-49: No success check - assumes handler exists
const settings = await window.automationAPI?.automation.getSettings();
setIsEnabled(settings.enabled);
setRules(settings.rules);
// If handler doesn't exist, settings will be undefined → crash on .enabled

// Line 56-60: No success check - direct state update
const statistics = await window.automationAPI?.automation.getStatistics();
setStats(statistics);
// No null/undefined guard

// Line 66-73: No response status checking
await window.automationAPI?.automation.stop();
// Assumes success, doesn't verify

// Line 80-85: No response status checking
await window.automationAPI?.automation.toggleRule(ruleId, enabled);
// Silent failure if handler missing
```

#### Issues Found
1. ❌ **CRITICAL**: `window.automationAPI` is not exposed in preload.ts
2. ❌ **CRITICAL**: No response status checking on any handlers
3. ⚠️ **UNSAFE**: Components assume handler success without verification
4. ❌ **MISSING**: Automation handlers not registered in main.ts IPC system

---

### 4. **PrecombineGenerator.tsx**
**Path**: `src/renderer/src/PrecombineGenerator.tsx`

#### Handlers Called
| Handler | Line | Response Format Expected | Status |
|---------|------|-------------------------|--------|
| `pickMo2ProfileDir` | 71 | Direct return (string) | ❓ **Unclear** |
| `readFile` | 77 | Direct return (string) | ✅ **IMPLEMENTED** |
| `writeLoadOrderUserDataFile` | 86 | Direct return (string) | ✅ **IMPLEMENTED** |
| `launchXEdit` | 92 | `{ ok: boolean, error? }` | ❓ **Unclear** |
| `saveFile` | 100 | Direct return (string) | ✅ **IMPLEMENTED** |

#### Response Handling Issues
```tsx
// Line 71-79: Proper error handling for file ops
try {
  if (!api?.pickMo2ProfileDir) { setError('Bridge API not available.'); return; }
  const dir = await api.pickMo2ProfileDir();
  if (!dir) return; // Checks for empty result
  const raw = await api.readFile?.(joinPath(dir, 'plugins.txt'));
  if (!raw) { setError('Could not read...'); return; }
}

// Line 86: Checks response but unclear format
const savedPath = await api?.writeLoadOrderUserDataFile?.('mossy-prp-combined-patch.pas', script);
if (!savedPath) { setError('Failed to write script file.'); return; }

// Line 92-99: Proper status checking
const result = await api?.launchXEdit?.([`-script:${savedPath}`]);
if (!mounted.current) return;
if (result?.ok === false) { setError(result?.error || 'FO4Edit launch failed.'); }
```

#### Issues Found
1. ✅ **GOOD**: Null/undefined checks
2. ✅ **GOOD**: Error handling with user-facing messages
3. ⚠️ **MIXED**: Checks both `!dir`, `result?.ok`, and implicit truthy checks
4. ✅ **GOOD**: Uses optional chaining (`?.`) safely

---

### 5. **Workshop.tsx**
**Path**: `src/renderer/src/Workshop.tsx`

#### Handlers Called
| Handler | Line | Response Format Expected | Status |
|---------|------|-------------------------|--------|
| `browseDirectory` | 57 | Direct return (array) | ✅ **IMPLEMENTED** |
| `readFile` | 66 | Direct return (string) | ✅ **IMPLEMENTED** |
| `parseScriptDeps` | 70 | `{ imports: [], references: [] }` | ✅ **IMPLEMENTED** |
| `readDdsPreview` | 73 | `{ width, height, format }` | ✅ **IMPLEMENTED** |
| `readNifInfo` | 75 | `{ vertices, triangles, materials? }` | ✅ **IMPLEMENTED** |
| `runPapyrusCompiler` | 97 | `{ exitCode, stdout, stderr }` | ✅ **IMPLEMENTED** |
| `writeFile` | 105 | Direct return (boolean) | ✅ **IMPLEMENTED** |

#### Response Handling Issues
```tsx
// Line 57-63: Proper error catching and UI feedback
const entries = await api.browseDirectory(path);
setCurrentPath(path);
const sorted = entries.sort((...) => ...);
// Assumes entries is array - no null check

// Line 66-73: Proper handling of optional metadata
if (file.fileType === 'psc') {
  const deps = await api.parseScriptDeps(file.path);
  setScriptDeps(deps); // No null check if API fails
}

// Line 97-107: Proper status code checking
if (result.exitCode === 0) {
  // Success handling
} else {
  // Error handling with stderr
}
```

#### Issues Found
1. ✅ **GOOD**: Proper status checking for compiler output
2. ⚠️ **MINOR**: No null guards after handler calls (assumes success)
3. ✅ **GOOD**: Try-catch wraps each operation
4. ✅ **GOOD**: Console.log for debugging

---

### 6. **ChatInterface.tsx**
**Path**: `src/renderer/src/ChatInterface.tsx`

#### Handlers Called (IPC-related)
| Handler | Line | Response Format | Status |
|---------|------|-----------------|--------|
| `saveChatHistory` | 737 | Void/Promise | ✅ **IMPLEMENTED** |
| `loadChatHistoryFromFile` | 860 | Array or default `[]` | ✅ **IMPLEMENTED** |
| `getSettings` | 1596 | Direct return (object) | ✅ **IMPLEMENTED** |
| `detectPrograms` | 1639 | Array of programs | ✅ **IMPLEMENTED** |
| `getRunningProcesses` | 1674 | Array of processes | ✅ **IMPLEMENTED** |

#### Response Handling Issues
```tsx
// Line 737: Proper error catching
window.electron?.api?.saveChatHistory(messages).catch((err: unknown) => {
  // Error handling
});

// Line 860: Proper null coalescing
const fromFile = await window.electron?.api?.loadChatHistoryFromFile?.() ?? [];

// Line 1596: Proper direct return handling
const settings = await window.electronAPI.getSettings();

// Line 1639: Type guard check
if (typeof window.electron?.api?.detectPrograms === 'function') {
  const installed = await window.electronAPI.detectPrograms();
}
```

#### Issues Found
1. ✅ **GOOD**: Proper optional chaining with nullish coalescing (`??`)
2. ✅ **GOOD**: Type guards before calling optional APIs
3. ✅ **GOOD**: Proper error handling with `.catch()`
4. ✅ **GOOD**: Assumes direct return patterns for simpler APIs

---

### 7. **AssetValidator.tsx**
**Path**: `src/renderer/src/AssetValidator.tsx`

#### Handlers Called
| Handler | Line | Response Format | Status |
|---------|------|-----------------|--------|
| `pickDirectory` | 107 | Direct return (string) | ✅ **IMPLEMENTED** |
| `invoke` (asset-validator:*) | 136-223 | Custom formats per handler | ⚠️ **UNCLEAR** |

#### Response Handling Issues
```tsx
// Line 136: Uses window.electron.invoke() - custom invocation pattern
const result = await window.electron.invoke('asset-validator:validate-mod', selectedPath, validationDepth, (prog: number, file: string) => {
  // Progress callback
});

// Line 162: Similar invoke pattern
const result = await window.electron.invoke('asset-validator:validate-file', filePath, type);

// Line 204: Invoke pattern for auto-fix
const result = await window.electron.invoke('asset-validator:auto-fix', issuesToFix);

// Line 223: Invoke pattern for export
const result = await window.electron.invoke('asset-validator:export-report', report, format);
```

#### Issues Found
1. ❓ **UNCLEAR**: Uses `window.electron.invoke()` directly instead of contextBridge API
2. ❌ **PATTERN**: `window.electron.invoke()` not properly exposed through preload.ts
3. ⚠️ **UNDOCUMENTED**: Response formats for asset-validator handlers not documented

---

## Missing Handler Implementations

### Handlers Called But Not Registered

| Handler Name | Called From | Expected Response | Priority |
|--------------|-------------|-------------------|----------|
| `ddsPickFiles` | DDSConverter.tsx | `{ success, paths[] }` | **HIGH** |
| `ddsDetectFormat` | DDSConverter.tsx | `{ success, format }` | **HIGH** |
| `ddsConvert` | DDSConverter.tsx | `{ success, outputPath, compressionRatio }` | **HIGH** |
| `ddsGetAllPresets` | DDSConverter.tsx | `{ success, presets[] }` | **MEDIUM** |
| `ddsConvertBatch` | DDSConverter.tsx | `{ results[], successCount, totalFiles }` | **HIGH** |
| `getImageInfo` | DDSConverter.tsx | `{ data, format }` | **HIGH** |
| `image-get-info` | preload.ts only | Image metadata | **MEDIUM** |
| `image-generate-*` | preload.ts only | `{ success, outputPath }` | **MEDIUM** |
| `window.automationAPI.*` | AutomationManager.tsx | Various | **HIGH** |

---

## Response Format Inconsistencies

### Pattern 1: Success Boolean
```typescript
// Used by: parse-pdf, parse-psd, parse-abr, transcribe-*, most new handlers
{ success: true/false, error?: string, ...data }

// ✅ Consistent across handlers
```

### Pattern 2: OK Boolean
```typescript
// Used by: Spriggit operations, launchXEdit, some legacy handlers
{ ok: true/false, error?: string, ...data }

// ⚠️ Different field name, inconsistent with Pattern 1
```

### Pattern 3: Direct Return
```typescript
// Used by: getSettings, detectPrograms, getRunningProcesses
Direct data without wrapper object

// ⚠️ No status indication if operation fails
```

### Pattern 4: Mixed/Unsafe
```typescript
// Used by: DDS handlers (not implemented) + getImageInfo
No clear contract in code

// ❌ Error-prone when handlers don't exist
```

---

## Recommendations

### Priority 1: CRITICAL (Implement Immediately)

1. **Implement missing DDS handlers** in `src/electron/main.ts`:
   - `ddsPickFiles` → return `{ success, paths, error }`
   - `ddsDetectFormat` → return `{ success, format, error }`
   - `ddsConvert` → return `{ success, outputPath, compressionRatio, error }`
   - `ddsConvertBatch` → return `{ results[], successCount, totalFiles, error }`
   - `ddsGetAllPresets` → return `{ success, presets[], error }`

2. **Implement/expose getImageInfo handler**:
   - Currently called by DDSConverter.tsx at line 155
   - Should return `{ success, data (base64), format, error }`

3. **Fix AutomationManager** - Either:
   - Option A: Implement full automation API in main.ts + expose via preload.ts
   - Option B: Remove AutomationManager.tsx if feature not implemented
   - Option C: Display proper error messages if handlers missing

### Priority 2: HIGH (Fix Within Sprint)

4. **Standardize response format** across all handlers:
   - Adopt `{ success: boolean, data?: T, error?: string }` consistently
   - Update Spriggit handlers to use `success` instead of `ok` (or add mapping layer)
   - Document in IPC_HANDLERS_QUICK_REFERENCE.md

5. **Update DDSConverter.tsx** response handling:
   ```tsx
   // Line 155: Add proper error check
   const imageInfo = await (window.electronAPI as any).getImageInfo(filePath);
   if (!imageInfo?.data) {
     console.warn('Failed to generate preview:', imageInfo?.error);
     // Continue without preview
   }
   
   // Line 299: Add guard check
   if (!result?.results?.[index]) {
     status: 'error';
   } else {
     status: result.results[index].success ? 'success' : 'error';
   }
   ```

6. **Fix AssetValidator.tsx**:
   - Replace `window.electron.invoke()` with proper contextBridge API
   - Register `asset-validator:*` handlers in main.ts if not already done
   - Document response formats for each handler

### Priority 3: MEDIUM (Code Quality)

7. **Add response type definitions**:
   ```typescript
   // src/shared/types.ts
   interface ImageHandlerResponse {
     success: boolean;
     data?: string; // base64
     format?: string;
     error?: string;
   }
   
   interface DDSConversionResponse {
     success: boolean;
     outputPath?: string;
     compressionRatio?: number;
     error?: string;
   }
   ```

8. **Create helper utilities**:
   ```typescript
   // src/renderer/src/utils/ipcResponse.ts
   export const isSuccess = (response: any): boolean => {
     return response?.success === true || response?.ok === true;
   };
   
   export const getError = (response: any): string => {
     return response?.error || 'Unknown error';
   };
   ```

9. **Document IPC contracts** in [IPC_HANDLERS_QUICK_REFERENCE.md](IPC_HANDLERS_QUICK_REFERENCE.md):
   - Add each handler's request/response schema
   - Include success/error examples
   - Link to component usage

---

## Testing Checklist

- [ ] DDSConverter: Test all file picking operations with missing handler gracefully
- [ ] DDSConverter: Test batch conversion with incomplete results
- [ ] DDSConverter: Test image preview generation without crashing if handler missing
- [ ] CKCrashPrevention: Verify Spriggit operations handle `.ok` correctly
- [ ] AutomationManager: Either implement handlers or show proper error UX
- [ ] Workshop: Verify all file operations fail gracefully if handlers missing
- [ ] PrecombineGenerator: Test XEdit launch with missing handler
- [ ] All components: Test with handler timeouts/network failures

---

## Summary Table

| Component | Score | Status | Action |
|-----------|-------|--------|--------|
| DDSConverter.tsx | 4/10 | ❌ BROKEN | Implement 5 handlers, fix unsafe access |
| CKCrashPreventionMining.tsx | 9/10 | ✅ GOOD | Minor: Standardize on `success` |
| AutomationManager.tsx | 2/10 | ❌ BROKEN | Implement or remove |
| PrecombineGenerator.tsx | 8/10 | ✅ MOSTLY OK | Minor: Add more null guards |
| Workshop.tsx | 8/10 | ✅ MOSTLY OK | Minor: Add error handling for optional fields |
| ChatInterface.tsx | 9/10 | ✅ GOOD | No action needed |
| AssetValidator.tsx | 5/10 | ⚠️ UNCLEAR | Register handlers, document responses |

---

**Generated**: April 18, 2026
**Audit Duration**: Comprehensive analysis of 7 major components
**Next Review**: After implementing Priority 1 & 2 recommendations
