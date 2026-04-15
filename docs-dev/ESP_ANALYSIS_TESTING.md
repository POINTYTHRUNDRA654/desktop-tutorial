# ESP Analysis - Testing Guide

## What's Implemented

We've replaced the fake/mock ESP analysis in The Auditor with **real file validation**:

### Real ESP Analysis Features

1. **TES4 Header Validation**
   - Reads the first 4 bytes to check for "TES4" magic number
   - Verifies this is a valid Fallout 4 plugin file
   - Returns error if not a valid ESP/ESM

2. **File Size Analysis**
   - ERROR: Files over 250MB (Fallout 4 hard limit)
   - WARNING: Files over 200MB (approaching limit)
   - Provides actual file size in the issue details

3. **Record Count Estimation**
   - Reads the record count from ESP header (offset 20, 4 bytes)
   - Reports how many records are in the file
   - Helps understand file complexity

4. **File Path Resolution**
   - Changed from browser File API (no real paths) to Electron dialog
   - Now gets actual file system paths: `C:\Users\...\MyMod.esp`
   - Required for the Electron main process to read files

## How to Test

### 1. Launch the App
```bash
npm run dev
```

### 2. Navigate to The Auditor
Click "The Auditor" in the left sidebar

### 3. Upload ESP Files

**Option A: Use the File Upload Button**
- Click "Add Files" button
- Select any `.esp` or `.esm` files from your Fallout 4 Data directory
- Example path: `C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data\`

**Option B: Test Files to Try**
- `Fallout4.esm` - The main game master (will likely be very large)
- Any DLC `.esm` files
- Custom mod `.esp` files you have installed

### 4. Click "Run Scan"
The app will:
- Read each ESP file as binary
- Validate the TES4 header
- Check file sizes
- Extract record counts
- Display real issues found

### 5. Check Results

You should see:

**For Valid ESP Files:**
- ✅ "Valid ESP/ESM file" status
- File size displayed
- Record count displayed

**For Large Files (>200MB):**
- ⚠️ WARNING: "File approaching 250MB limit"
- Actual size shown

**For Oversized Files (>250MB):**
- ❌ ERROR: "File exceeds Fallout 4's 250MB plugin limit"
- Cannot be loaded by game engine

**For Invalid Files:**
- ❌ ERROR: "Invalid ESP/ESM file"
- "File does not have valid TES4 header"

### 6. Check Console Logs

Open DevTools (F12) and check the Console for:
```
Starting performAnalysis with files: [...]
Analyzing file: MyMod.esp Type: esp
Calling ESP analyzer for: C:\Users\...\MyMod.esp
ESP analysis result: {success: true, fileSize: 1234567, recordCount: 42, issues: [...]}
```

## What's NOT Implemented Yet

The real ESP analyzer does **basic validation only**. It does NOT yet detect:

- ❌ Deleted navmeshes
- ❌ ITM (Identical To Master) records
- ❌ Dirty edits
- ❌ Missing master dependencies
- ❌ Corrupted records
- ❌ Script errors

These would require:
1. Full ESP binary format parser (extremely complex)
2. Integration with xEdit command-line tools
3. Record-by-record analysis

## Implementation Details

### Files Modified

1. **main.ts** - Added `AUDITOR_ANALYZE_ESP` IPC handler
   - Reads ESP file as buffer
   - Validates TES4 magic bytes
   - Extracts file size and record count
   - Returns analysis result

2. **preload.ts** - Exposed `analyzeEsp` API
   - Bridges renderer → main process
   - Returns Promise with analysis result

3. **types.ts** - Added `AUDITOR_ANALYZE_ESP` channel constant

4. **TheAuditor.tsx** - Updated analysis flow
   - Changed `performAnalysis` from sync to async
   - Calls `bridge.analyzeEsp(filePath)` for ESP files
   - Processes real analysis results
   - Changed file upload to use Electron dialog for real paths

### Why This Approach?

**Pros:**
- ✅ Real file validation (not fake data)
- ✅ Secure (runs in main process, sandboxed)
- ✅ Fast (simple header reads)
- ✅ Foundation for deeper analysis later

**Cons:**
- ⚠️ Limited analysis depth
- ⚠️ Cannot detect complex issues yet
- ⚠️ Requires desktop app (not web compatible)

## Next Steps for Full ESP Analysis

To implement deep ESP analysis, you would need to:

1. **Parse Full ESP Format**
   - Implement TES4 record parser
   - Handle all record types (GRUP, REFR, NAVM, etc.)
   - Track record flags (deleted, ignored, etc.)

2. **Integrate with xEdit**
   - Call xEditQuickAutoClean via command line
   - Parse xEdit output logs
   - Report ITMs, deletions, etc.

3. **Build Record Database**
   - Load master files as reference
   - Compare override records
   - Detect dirty edits

This would be 1000+ lines of code and is beyond the scope of this initial implementation.

## Conclusion

The ESP analyzer now provides **real, production-ready validation** for:
- File format verification
- Size constraints
- Basic file properties

It's no longer showing fake/mock issues. Everything displayed is based on actual file analysis.
