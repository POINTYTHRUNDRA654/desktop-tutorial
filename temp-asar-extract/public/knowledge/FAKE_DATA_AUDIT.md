# Fake Data Audit - Areas Using Simulated/Placeholder Data

## ✅ FIXED - Now Uses Real Data
- **Hardware Profile (SystemMonitor.tsx)** - Now uses Electron native APIs to detect real GPU, CPU, RAM, OS

## ⚠️ COSMETIC/UI ONLY - Safe to Keep (Not Misleading)
These are visual effects or demo content that don't claim to be real system data:

### TheNexus.tsx - Dashboard
- **CPU Load percentage** (lines 23, 66-68, 138, 172, 174)
  - Randomly animated between 10-100%
  - Status: **COSMETIC** - Just a visual effect for the dashboard
  - Impact: Low - doesn't affect functionality

### SystemMonitor.tsx - Performance Charts
- **Real-time CPU/GPU/Memory graphs** (lines 179-181)
  - Random values for live monitoring charts
  - Status: **COSMETIC** - Visual dashboard metrics
  - Impact: Low - charts are for visual effect

### MossyFaceAvatar.tsx
- **Blink timing** (line 32) - Uses Math.random for natural eye blinks
  - Status: **COSMETIC** - Natural animation timing
  - Impact: None

### TutorialOverlay.tsx
- **Installation progress** (line 68) - Simulated progress bar
  - Status: **COSMETIC** - UI feedback during tutorial
  - Impact: None

## 📝 ACCEPTABLE - Demo/Placeholder Content
These are clearly labeled or contextually obvious as examples:

### TheRegistry.tsx
- **Mock data fields** (lines 49-65)
  - Sample data structure for demonstration
  - Status: **DEMO CONTENT** - Users know it's example data
  - Impact: None - meant as template

### TheWorkshop.tsx
- **Code suggestions** (lines 172, 436-440)
  - Autocomplete suggestions for Papyrus coding
  - Status: **HELPFUL PLACEHOLDERS** - IDE feature
  - Impact: None - improves UX

### WorkflowOrchestrator.tsx
- **Placeholder image URLs** (line 121)
  - Temporary preview images
  - Status: **PLACEHOLDER** - Clearly marked
  - Impact: None

### TheNexus.tsx - Insights
- **Mock daily insights** (lines 56-64)
  - Sample notifications about F4SE updates, pending scripts
  - Status: **DEMO CONTENT** - Example notifications
  - Impact: Low - provides UI examples

## 🔧 NEEDS ATTENTION - Could Be Improved
These should be addressed to avoid confusion:

### SystemMonitor.tsx - Fallback Profile (lines 325-334)
```typescript
const fallbackProfile: SystemProfile = {
    os: 'Windows 11 (Simulated)',
    gpu: 'NVIDIA RTX 4090 (High-Perf)',  // ❌ Fake high-end spec
    ram: 32,                              // ❌ Fake value
    blenderVersion: '4.5.5',
    vram: 24,                             // ❌ Fake value
    isLegacy: false,
    isSimulated: true                     // ✅ At least marked as simulated
};
```
**Recommendation:** Change to generic/unknown values instead of impressive specs
- Change GPU to "Unknown GPU (Offline Detection)"
- Change RAM to "Unknown"
- Or remove fallback entirely since Electron API now works

## 📊 Summary

| Component | Issue | Severity | Action Needed |
|-----------|-------|----------|---------------|
| Hardware Profile | Fixed - now real | ✅ None | Already done |
| CPU Load (Nexus) | Cosmetic animation | 🟡 Low | Optional: label as "Activity" not "CPU Load" |
| Performance Charts | Cosmetic graphs | 🟡 Low | Optional: label as "Simulated" or remove |
| Fallback Profile | Uses fake high specs | 🟠 Medium | Change to "Unknown" or remove |
| Mock Insights | Demo content | 🟢 None | Acceptable as-is |

## Recommendations

1. **High Priority:** Update fallback profile to use generic "Unknown" values
2. **Medium Priority:** Label dashboard metrics as "Activity Simulation" not "CPU Load"
3. **Low Priority:** Add "(Demo)" labels to example content in Registry/Workshop
4. **Optional:** Remove performance charts if they can't show real data

## Notes
- Most "fake" data is cosmetic/UI animation and doesn't mislead users
- Critical system info (Hardware Profile) now uses real Electron detection
- Fallback scenarios should use "Unknown" instead of impressive fake specs
