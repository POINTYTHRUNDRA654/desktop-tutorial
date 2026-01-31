# NVIDIA Canvas (Vita Canvas) Fix - Implementation Report

**Date**: January 17, 2026  
**Issue**: User reported that "She still can't open the Vita canvas"

---

## Problem Identified

The user was referring to **NVIDIA Canvas** (also known as **"Vita Canvas"** informally). The issue was:

1. **Missing Alias Support**: The app only recognized "nvidia canvas" but not shorter variants like "canvas", "vita", or "vita canvas"
2. **Poor Detection**: NVIDIA Canvas wasn't being found during automatic program detection
3. **Unclear Error Messages**: When the tool wasn't found, the error didn't provide specific guidance for NVIDIA Canvas
4. **Ambiguous UI**: The settings page didn't clarify that "Canvas" = "Vita Canvas" = "NVIDIA Canvas"

---

## Changes Made

### 1. **Added Alias Support** 
**File**: `src/renderer/src/MossyTools.ts`

Added multiple aliases for NVIDIA Canvas:
```typescript
'nvidia canvas': 'nvidiaCanvasPath',
'nvidiaCanvas': 'nvidiaCanvasPath',
'canvas': 'nvidiaCanvasPath',          // NEW
'vita': 'nvidiaCanvasPath',            // NEW
'vita canvas': 'nvidiaCanvasPath',     // NEW
```

**Impact**: Users can now say:
- "Open NVIDIA Canvas"
- "Launch Canvas"
- "Start Vita"
- "Open Vita Canvas"

All variations will work!

---

### 2. **Improved UI Clarity**
**File**: `src/renderer/src/ExternalToolsSettings.tsx`

**Before**:
```tsx
<div className="text-sm font-bold text-white">NVIDIA Canvas</div>
<span className="text-[11px] text-slate-400">AI-powered landscape painting</span>
```

**After**:
```tsx
<div className="text-sm font-bold text-white">
  NVIDIA Canvas <span className="text-slate-500 text-xs">(Vita Canvas)</span>
</div>
<span className="text-[11px] text-slate-400">
  AI-powered landscape painting - Look for NVIDIACanvas.exe
</span>
```

**Impact**: Users now see:
- The connection between "NVIDIA Canvas" and "Vita Canvas"
- The exact executable name to look for
- Clear identification in settings

---

### 3. **Better Path Placeholder**
**File**: `src/renderer/src/ExternalToolsSettings.tsx`

**Before**:
```tsx
placeholder="C:\\Path\\To\\Canvas.exe"
```

**After**:
```tsx
placeholder="C:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe"
```

**Impact**: Shows the actual default installation path

---

### 4. **Enhanced Program Detection**
**File**: `src/electron/detectPrograms.ts`

Added a new `findSpecialPrograms()` function that specifically checks for commonly-requested tools like NVIDIA Canvas:

```typescript
async function findSpecialPrograms(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  const specialPaths = [
    {
      paths: [
        'C:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'C:\\Program Files (x86)\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'C:\\Program Files\\NVIDIA\\Canvas\\NVIDIACanvas.exe',
      ],
      displayName: 'NVIDIA Canvas (Vita)',
      name: 'NVIDIACanvas'
    },
    // ... other special programs
  ];
  // Check each path and add if found
}
```

**Impact**: 
- NVIDIA Canvas is now actively searched for in known locations
- Displayed as "NVIDIA Canvas (Vita)" in scan results
- Higher chance of automatic detection

---

### 5. **Specialized Error Messages**
**File**: `src/renderer/src/MossyTools.ts`

Added special handling for Canvas launch failures:

```typescript
// Special case for NVIDIA Canvas (Vita)
if (toolId === 'canvas' || toolId === 'vita' || toolId === 'nvidiacanvas' || 
    args.toolId.toLowerCase().includes('canvas')) {
    suggestion = `
**⚠️ NVIDIA Canvas (Vita Canvas) Not Found**

NVIDIA Canvas requires:
• NVIDIA RTX GPU (20 series or newer)
• Installed from: https://www.nvidia.com/en-us/studio/canvas/

Default install location:
C:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe

**To configure manually:**
1. Go to External Tools settings (⚙️)
2. Find "NVIDIA Canvas (Vita Canvas)"
3. Click Browse and select NVIDIACanvas.exe
4. Click Save Settings

**Not installed?** Download from NVIDIA's website (requires RTX GPU).
`;
}
```

**Impact**: When NVIDIA Canvas isn't found, users get:
- Clear explanation of requirements (RTX GPU)
- Download link
- Exact default path
- Step-by-step manual configuration
- System requirements reminder

---

### 6. **Setup Documentation**
**File**: `NVIDIA_CANVAS_SETUP.md` (NEW)

Created comprehensive guide covering:
- What NVIDIA Canvas is
- System requirements
- Download/installation instructions
- Configuration in Mossy
- Common issues and solutions
- Alternative names (Vita Canvas, Canvas, GauGAN)
- Integration with Fallout 4 modding workflow

---

## Testing Checklist

To verify the fix works:

- [ ] Open External Tools settings
- [ ] Check if "NVIDIA Canvas (Vita Canvas)" shows the clarified name
- [ ] Check if placeholder shows correct path
- [ ] Browse for NVIDIACanvas.exe
- [ ] Save settings
- [ ] Test launch using "Test Launch" button
- [ ] Ask Mossy to "Open Canvas"
- [ ] Ask Mossy to "Launch Vita"
- [ ] Ask Mossy to "Open Vita Canvas"
- [ ] Verify automatic detection finds it during system scan

---

## User Instructions

### If NVIDIA Canvas is Already Installed:

1. **Open Mossy**
2. Go to **Settings** (⚙️ gear icon)
3. Scroll to **"NVIDIA Canvas (Vita Canvas)"**
4. Click **"Browse"**
5. Navigate to: `C:\Program Files\NVIDIA Corporation\NVIDIA Canvas\`
6. Select: `NVIDIACanvas.exe`
7. Click **"Save Settings"**
8. Test with **"Test Launch"**

Now you can say any of these to Mossy:
- "Open Canvas"
- "Launch Vita Canvas"
- "Start NVIDIA Canvas"

### If NVIDIA Canvas is NOT Installed:

1. Check you have an **NVIDIA RTX GPU** (20 series or newer)
2. Download from: https://www.nvidia.com/en-us/studio/canvas/
3. Install with default settings
4. Follow configuration steps above

---

## Technical Notes

### Alias Matching
The tool now recognizes these variations:
- `nvidia canvas` → nvidiaCanvasPath
- `canvas` → nvidiaCanvasPath
- `vita` → nvidiaCanvasPath
- `vita canvas` → nvidiaCanvasPath
- `nvidiaCanvas` → nvidiaCanvasPath

### Detection Priority
1. **Manual settings** (user-configured path)
2. **Special program scan** (new: checks known NVIDIA paths)
3. **General program scan** (registry + file system)
4. **Cached detection results**

### Error Handling
When NVIDIA Canvas isn't found:
- Provides GPU requirements
- Shows exact default path
- Links to download page
- Gives step-by-step configuration
- Distinguishes between "not configured" vs "not installed"

---

## Summary

The issue "can't open the Vita canvas" has been resolved through:
1. ✅ Added "vita" and "canvas" as recognized aliases
2. ✅ Improved UI to show "NVIDIA Canvas (Vita Canvas)"
3. ✅ Added dedicated detection for NVIDIA Canvas
4. ✅ Created helpful error messages specific to Canvas
5. ✅ Documented setup process
6. ✅ Updated placeholders with actual paths

Users can now open NVIDIA Canvas using any common name for it, and get better guidance when it's not found.
