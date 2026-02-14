# CK Crash Prevention - Testing Guide

## Quick Test Checklist

### ✅ Setup Verification
- [ ] Build completed: `npm run build`
- [ ] No TypeScript errors
- [ ] App launches: `npm start` or `npm run dev`
- [ ] Navigate to "CK Safety" in sidebar
- [ ] All 3 tabs visible: Pre-Flight, Live Monitoring, Post-Crash Analysis

---

## Test Plan 1: Pre-Flight Checks Tab

### Test 1.1: File Selection
**Steps:**
1. Click "Pre-Flight Checks" tab
2. Click "Browse" button
3. Select any ESP/ESM file from your Data folder
4. OR manually paste file path into text field

**Expected Results:**
- File picker dialog opens
- Selected path appears in text field
- No errors displayed

### Test 1.2: Vanilla ESP Validation (Low Risk)
**Test File:** `Fallout4.esm` or `DLCRobot.esm`

**Steps:**
1. Select vanilla game master file
2. Click "Validate" button
3. Wait for results

**Expected Results:**
```
✅ Crash Risk: 0-10% (green)
✅ Memory Est: 100-500 MB
✅ Issues Found: 0
✅ Valid: true
✅ Recommendations: Minimal or none
```

### Test 1.3: Large Mod Validation (High Risk)
**Test File:** Any mod >100MB (e.g., Sim Settlements, Fusion City Rising)

**Steps:**
1. Select large mod ESP
2. Click "Validate"
3. Review results

**Expected Results:**
```
⚠️ Crash Risk: 50-80% (orange/red)
⚠️ Memory Est: >500 MB
⚠️ Issues Found: 2-5
⚠️ Issue Types: file_too_large, memory_risk, problematic_mod
⚠️ Recommendations: Detailed prevention steps
```

### Test 1.4: Prevention Plan Display
**After validation with issues:**

**Expected Display:**
- Risk Reduction percentage (60-80%)
- Estimated Time (35-45 minutes)
- Priority badge (high/critical)
- 5-step plan:
  1. Clean with xEdit (command shown)
  2. Create backup
  3. Disable precombines (if applicable)
  4. Memory optimization
  5. Verify masters

**Verify:**
- [ ] Each step has order number (1-5)
- [ ] Time estimate per step
- [ ] Priority indicator per step
- [ ] Command shown for xEdit step

### Test 1.5: Known Problematic Mod Detection
**Test Files (if available):**
- `Fusion City Rising.esp`
- `Sim Settlements.esp`
- `Boston FPS Fix.esp`
- `Tales from the Commonwealth.esp`

**Expected:**
- Issue type: `problematic_mod`
- Specific mod name identified
- Custom solution text for that mod

---

## Test Plan 2: Live Monitoring Tab

### Test 2.1: No CK Running
**Steps:**
1. Ensure Creation Kit is NOT running
2. Click "Live Monitoring" tab
3. Click "Start Monitoring"

**Expected Results:**
```
❌ Alert: "Creation Kit is not running. Please launch CK first."
❌ No metrics displayed
❌ Button remains "Start Monitoring"
```

### Test 2.2: CK Running - Start Monitoring
**Prerequisites:**
- Launch Creation Kit manually
- Wait for it to fully load

**Steps:**
1. Click "Live Monitoring" tab
2. Click "Start Monitoring"

**Expected Results:**
```
✅ Button changes to "Stop Monitoring" (red)
✅ Metrics appear within 1-2 seconds
✅ Four metric boxes displayed:
   - CPU Usage: X.X%
   - Memory: XXX MB
   - Handles: XXXX
   - Threads: XX
✅ Metrics update every 1 second
```

### Test 2.3: Metrics Accuracy
**While monitoring:**

**Verify:**
- [ ] CPU % changes as you interact with CK
- [ ] Memory increases when loading ESP files
- [ ] Handles/threads are reasonable numbers (>0)
- [ ] No negative values
- [ ] No NaN or undefined values

### Test 2.4: Stop Monitoring
**Steps:**
1. While monitoring is active
2. Click "Stop Monitoring" button

**Expected:**
- Button changes back to "Start Monitoring" (green)
- Metrics freeze at last values OR disappear
- No console errors

### Test 2.5: CK Crash During Monitoring
**Steps:**
1. Start monitoring
2. Force-close Creation Kit (Task Manager or crash it)
3. Observe Mossy behavior

**Expected:**
- Monitoring automatically stops OR shows error
- No infinite error loops
- Clean error message displayed

---

## Test Plan 3: Post-Crash Analysis Tab

### Test 3.1: File Picker Dialog
**Steps:**
1. Click "Post-Crash Analysis" tab
2. Click "Browse" button

**Expected:**
- File picker opens
- Filter shows: "Log Files (*.log, *.txt)"
- Can select any log file

### Test 3.2: Mock Crash Log (Memory Overflow)
**Create Test File:** `test-memory-crash.log`
```
[ERROR] Out of memory allocation failed
[CRITICAL] Heap corruption detected
System memory: 16384 MB
Available: 234 MB
Plugin: SimSettlements.esp
Time: 2026-02-13 14:32:01
```

**Steps:**
1. Save above content to `.log` file
2. Click "Browse" and select file (should auto-analyze)
3. OR paste path and click "Analyze"

**Expected Results:**
```
✅ Crash Type: memory_overflow
✅ Severity: critical (red)
✅ Root Cause: Contains "out of memory"
✅ Likely Plugin: SimSettlements.esp or extracted from log
✅ Recommendations: 3-5 specific steps
✅ Preventable: true
```

### Test 3.3: Mock Crash Log (Access Violation)
**Create Test File:** `test-access-violation.log`
```
[FATAL] Access violation at address 0x00007FF6A1B2C3D4
Read of address 0x0000000000000000
Context: Navmesh generation
Plugin: FusionCityRising.esp
```

**Expected Results:**
```
✅ Crash Type: access_violation OR navmesh_conflict
✅ Severity: high/critical
✅ Root Cause: "Access violation" or navmesh-specific
✅ Likely Plugin: FusionCityRising.esp
✅ Recommendations: Include navmesh rebuild steps
```

### Test 3.4: Real CK Crash Log
**If you have actual CK crash logs:**

**Location:** Usually in:
- `Documents\My Games\Fallout4\F4SE\Logs\`
- `CreationKit.exe` crash dumps
- Windows Event Viewer logs

**Steps:**
1. Select real crash log
2. Click "Analyze"

**Verify:**
- [ ] Crash type detected (not "unknown")
- [ ] Root cause makes sense
- [ ] Recommendations are actionable
- [ ] Plugin name extracted correctly

### Test 3.5: Unknown Crash Type
**Create Test File:** `test-unknown-crash.log`
```
Something went wrong but not specific
No memory or access violation keywords
Just generic error text
```

**Expected:**
```
✅ Crash Type: unknown
⚠️ Severity: variable
⚠️ Root Cause: "Unable to determine specific cause"
⚠️ Recommendations: Generic troubleshooting steps
✅ Preventable: false
```

---

## Test Plan 4: Integration Tests

### Test 4.1: Tab Switching
**Steps:**
1. Go to Pre-Flight tab, select ESP, validate
2. Switch to Live Monitoring tab
3. Switch to Post-Crash Analysis tab
4. Switch back to Pre-Flight tab

**Verify:**
- [ ] No state loss (validation results still visible)
- [ ] No console errors
- [ ] Smooth transitions
- [ ] No memory leaks (check DevTools Performance)

### Test 4.2: Multiple Validations
**Steps:**
1. Validate ESP file A
2. Without refreshing, validate ESP file B
3. Validate ESP file A again

**Verify:**
- [ ] Previous results cleared before new validation
- [ ] Correct results for each file
- [ ] No mixing of data between validations

### Test 4.3: Error Handling - Invalid File Path
**Steps:**
1. Type non-existent path: `C:\fake\path\test.esp`
2. Click "Validate"

**Expected:**
```
❌ Error alert: "File not found" or similar
❌ Validation status returns to idle
❌ No crash
```

### Test 4.4: Error Handling - Empty Fields
**Steps:**
1. Clear all text fields
2. Click "Validate" (Pre-Flight)
3. Click "Analyze" (Post-Crash)

**Expected:**
```
❌ Alert: "Please select a file first"
❌ Buttons disabled or alert shown
❌ No API calls made
```

### Test 4.5: Concurrent Operations
**Steps:**
1. Start Live Monitoring
2. While monitoring, go to Pre-Flight and validate ESP
3. While validation running, go to Post-Crash and analyze log

**Verify:**
- [ ] All operations complete successfully
- [ ] No race conditions
- [ ] No frozen UI

---

## Test Plan 5: Performance & Reliability

### Test 5.1: Large File Handling
**Test File:** ESP >250MB (should be rejected)

**Expected:**
```
❌ Issue: file_too_large
❌ Severity: critical
⚠️ Crash Risk: 90-100%
⚠️ Message: "File exceeds 250MB Creation Kit limit"
```

### Test 5.2: Memory Leak Check
**Steps:**
1. Open Chrome DevTools (Ctrl+Shift+I in Mossy)
2. Go to Performance/Memory tab
3. Start monitoring CK (if available)
4. Let run for 5 minutes
5. Stop monitoring
6. Take heap snapshot

**Verify:**
- [ ] No continuously growing memory
- [ ] Interval cleared on stop
- [ ] No detached DOM nodes

### Test 5.3: Rapid Tab Switching
**Steps:**
1. Rapidly switch tabs 20 times
2. Click validate/analyze/monitor buttons rapidly

**Verify:**
- [ ] No freezing
- [ ] No duplicate API calls
- [ ] Proper debouncing/throttling

---

## Test Plan 6: Regression Tests

### Test 6.1: Routing
**Direct URL access:**
```
file:///path/to/mossy#/ck-crash-prevention
```

**Expected:**
- Loads directly to CK Safety page
- No 404 or blank screen

### Test 6.2: Sidebar Navigation
**Steps:**
1. From dashboard, click "CK Safety" in sidebar
2. Navigate away to different page
3. Click "CK Safety" again

**Verify:**
- [ ] Navigation works consistently
- [ ] State persists appropriately
- [ ] No console warnings

### Test 6.3: Build Integrity
**Commands:**
```bash
npm run build
npm run lint
npm run test (if available)
```

**Expected:**
```
✅ Build: Success, no errors
✅ Lint: No warnings
✅ Bundle size: <20KB for CK component
✅ TypeScript: No type errors
```

---

## Test Plan 7: User Experience

### Test 7.1: Visual Consistency
**Verify:**
- [ ] Color scheme matches Mossy theme (dark mode)
- [ ] Icons render correctly (no broken images)
- [ ] Text is readable (contrast, size)
- [ ] Buttons have hover effects
- [ ] Severity badges have correct colors:
  - Critical: Red
  - High: Orange
  - Medium: Yellow
  - Low: Blue

### Test 7.2: Responsive Layout
**Steps:**
1. Resize Mossy window to minimum size
2. Resize to maximum size
3. Test with different DPI settings

**Verify:**
- [ ] No horizontal scrolling
- [ ] Text doesn't overflow
- [ ] Buttons remain accessible

### Test 7.3: Loading States
**During validation/analysis:**

**Verify:**
- [ ] Button shows "Validating..." or "Analyzing..."
- [ ] Button is disabled during operation
- [ ] No duplicate clicks possible
- [ ] Spinners or loading indicators shown

---

## Test Plan 8: Edge Cases

### Test 8.1: Very Long File Paths
**Test:** Path with 255+ characters

**Expected:**
- Handles gracefully (truncates or scrolls)
- No UI breaking

### Test 8.2: Special Characters in File Names
**Test:** `My Mod (v2.5) [Test].esp`

**Expected:**
- Validation works correctly
- Path displayed properly

### Test 8.3: Non-English Characters
**Test:** `Мой Мод.esp` (Cyrillic)

**Expected:**
- File picker handles it
- UTF-8 encoding preserved

### Test 8.4: Simultaneous CK Instances
**If user runs 2+ CK processes:**

**Expected:**
- Detects first instance OR shows multiple options
- Monitoring tracks correct process

---

## Bug Reporting Template

If you find issues during testing, report them using this format:

```markdown
## Bug: [Short Description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- Mossy Version: 
- OS: Windows 10/11
- Node Version: 
- Electron Version: 

**Screenshots/Logs:**
[Attach console errors, screenshots]

**Workaround (if any):**
[Temporary solution]
```

---

## Success Criteria

### All features working:
- ✅ ESP validation with accurate risk assessment
- ✅ Problematic mod detection (8 mods in database)
- ✅ Prevention plan generation with 5 steps
- ✅ Live CK monitoring with 4 metrics
- ✅ Crash log analysis with 6 crash types
- ✅ File picker dialogs working
- ✅ All 3 tabs functional
- ✅ No console errors
- ✅ TypeScript compilation clean
- ✅ Build size <20KB

### Ready for Production:
- [ ] All test plans passed
- [ ] No critical/high severity bugs
- [ ] Documentation complete
- [ ] Performance acceptable (<100ms UI response)
- [ ] Memory usage stable
- [ ] User feedback positive

---

## Next Steps After Testing

1. **Create GitHub Issue** for any bugs found
2. **Gather user feedback** from early testers
3. **Refine prevention recommendations** based on real data
4. **Add more problematic mods** to database
5. **Implement ML crash prediction** (future enhancement)
6. **Integration with xEdit** for auto-fixes (future)

---

**Last Updated:** 2026-02-13  
**Test Suite Version:** 1.0  
**Status:** Ready for Testing
