# MOSSY RELEASE TESTING CHECKLIST v1.0

## ✅ CORE FUNCTIONALITY TESTS

### 1. **Diagnostic Tools** (NEW)
- [ ] Go to sidebar → Diagnostic Tools
- [ ] Click "Run All Checks"
  - [ ] Electron API Available: Should show status
  - [ ] detectPrograms() Function: Should show status
  - [ ] getSystemInfo() Function: Should show status
  - [ ] Desktop Bridge Active: Should show status
  - [ ] localStorage Available: Should show status
- [ ] Click "Test detectPrograms()" button
  - [ ] Should show "Testing detectPrograms()..."
  - [ ] Should display detected programs count
  - [ ] Should show first 10 programs with name, path, version
  - [ ] Copy button works
- [ ] Click "Export Full Diagnostic Report"
  - [ ] Should download .txt file
  - [ ] File should contain all check results

### 2. **Mossy System Scan** (CRITICAL)
- [ ] Open Chat (or Mossy.Space)
- [ ] Ask: "Run a deep scan"
- [ ] Mossy should:
  - [ ] Say "I need to run a scan" (or similar)
  - [ ] Begin the scan process
  - [ ] Report number of tools detected
  - [ ] Report number of Fallout 4 installations
  - [ ] **IMPORTANT**: Check browser console (F12) for [MOSSY SCAN] logs
    - [ ] Should see step-by-step progress
    - [ ] Should see "✓ Scan complete!"

### 3. **Error Reporting** (NEW)
- [ ] Go to Privacy Settings
- [ ] Scroll to "Data Management" section
- [ ] Verify "Export Mossy Error Logs" button exists
- [ ] If no errors exist: Alert should say "No error logs to export"
- [ ] Manually trigger an error (if scan fails):
  - [ ] Error should be logged automatically
  - [ ] Click "Export Mossy Error Logs"
  - [ ] Should download error-log file with timestamp, error message, stack trace

### 4. **PDF Reading** (EXISTING FEATURE)
- [ ] Upload a PDF file to Mossy.Space or Memory Vault
- [ ] Verify PDF is parsed and readable
- [ ] Ask Mossy questions about PDF content
- [ ] Should return accurate information

### 5. **Video Transcription** (EXISTING FEATURE)
- [ ] Upload a video file to Memory Vault
- [ ] Verify whisper transcription runs (offline or API)
- [ ] Should show transcription progress
- [ ] Final transcription should be readable and accurate
- [ ] Check for any 401 API errors (should use local whisper.cpp)

### 6. **Audio Studio** (Audio Processing)
- [ ] Go to Audio Studio (sidebar)
- [ ] Upload an audio file
- [ ] Run audio processing
- [ ] Verify output quality

### 7. **Image Studio** (Image Processing)
- [ ] Go to Image Studio (sidebar)
- [ ] Upload an image
- [ ] Apply filters/transformations
- [ ] Verify output

### 8. **System Monitor** (Live Monitoring)
- [ ] Go to System Monitor (sidebar)
- [ ] Should load without errors
- [ ] Should show system stats if available
- [ ] No console errors (F12)

### 9. **Desktop Bridge** (Blender Integration)
- [ ] Go to Desktop Bridge
- [ ] Should show bridge status
- [ ] If Blender Link installed: Should show connected status

### 10. **Memory Vault** (File Management)
- [ ] Go to Memory Vault
- [ ] Should display setup instructions
- [ ] Upload files work
- [ ] Files list and display correctly

### 11. **Mossy Personality & Context** (AI Quality)
- [ ] Ask Mossy about Fallout 4 modding
  - [ ] Should respond knowledgeably
  - [ ] Should reference detected Fallout 4 paths
- [ ] Ask Mossy about detected tools
  - [ ] Should know what tools are installed
  - [ ] Should know tool paths
- [ ] Chat history preservation
  - [ ] Previous messages stay in context
  - [ ] Mossy remembers conversation

### 12. **Settings & Privacy**
- [ ] Privacy Settings page loads
- [ ] Toggle options work and save
- [ ] Export Data button works
- [ ] Export Error Logs button exists
- [ ] API Key saving works (if testing transcription)

### 13. **Navigation**
- [ ] All sidebar items clickable
- [ ] All routes load without errors
- [ ] No broken navigation links
- [ ] Sidebar responsive

## 🔴 CRITICAL BLOCKERS (Must Fix Before Release)

- [ ] Build succeeds without warnings
- [ ] Dev server starts without errors
- [ ] No console errors on initial load (F12)
- [ ] Diagnostic Tools shows real API status
- [ ] Mossy scan completes successfully
- [ ] Error logging works
- [ ] No undefined/null crashes

## 🟡 WARNINGS (Should Address)

- [ ] Large chunk warnings (Normal, can optimize later)
- [ ] Missing optional features should degrade gracefully
- [ ] All error messages are user-friendly

## 📋 TESTING NOTES

**Test Date**: _______________
**Tester**: _______________
**Environment**: Windows / macOS / Linux

**Issues Found**:
1. _______________
2. _______________
3. _______________

**Performance**: Good / Acceptable / Slow

**Ready to Release**: YES / NO

---

## QUICK TEST SCRIPT

```
1. npm run build
2. npm run dev
3. Open http://localhost:5173
4. Test each section above
5. Check F12 console for errors
6. Run Mossy diagnostic scan
7. Export error logs if any
8. Screenshot successful tests
```

---

**RELEASE CRITERIA**: All critical blockers resolved, no console errors, Mossy scan working, error reporting functional.
