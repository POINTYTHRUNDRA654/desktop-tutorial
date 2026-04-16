# Mossy Enhancement Implementation Roadmap

## Overview

This document outlines the implementation plan for the requested Mossy enhancements:
1. Educational content (Bethesda.net vs Nexus Mods) ✅ COMPLETE
2. Ten high-priority features
3. UI consolidation to reduce page count

---

## Implementation Status

### ✅ Phase 0: Educational Content (COMPLETE)
- [x] Created comprehensive Bethesda.net vs Nexus Mods comparison guide
- [x] File: `BETHESDA_VS_NEXUS_MODDING_GUIDE.md` (16KB)
- [x] Covers all major differences, use cases, and recommendations

### 🔄 Phase 1: INI Configuration Manager (IN PROGRESS)

**Priority:** ⭐⭐⭐⭐⭐ (CRITICAL)
**Impact:** Eliminates #1 cause of crashes
**Effort:** Medium (2 weeks)
**Status:** Planning

**Implementation Plan:**

```typescript
// New component: src/renderer/src/INIConfigurationManager.tsx
interface INISetting {
  file: 'Fallout4.ini' | 'Fallout4Prefs.ini' | 'Fallout4Custom.ini';
  section: string;  // e.g., [Display]
  key: string;      // e.g., iSize W
  value: string;
  currentValue?: string;
  recommendedValue?: string;
  reason?: string;
  required?: boolean;
  modRequirement?: string;
}

interface INIPreset {
  name: string;
  description: string;
  settings: INISetting[];
  targetHardware: 'low' | 'medium' | 'high' | 'ultra';
}
```

**Features:**
1. **File Parser**
   - Read all 3 INI files
   - Parse sections and key-value pairs
   - Detect encoding (UTF-8, UTF-16, ANSI)
   
2. **Recommendation Engine**
   - Detect hardware (GPU, CPU, RAM)
   - Query system capabilities
   - Generate settings based on specs
   - Mod-specific requirements from load order

3. **Validation System**
   - Check for invalid values
   - Detect conflicts between settings
   - Warn about performance issues
   - Verify mod requirements met

4. **UI Components**
   - Three-pane editor (one per INI file)
   - Current vs Recommended comparison
   - Color-coded warnings (red=critical, yellow=warning, green=optimal)
   - Search/filter settings
   - Preset selector (Low/Medium/High/Ultra/Custom)
   - Backup manager

5. **Actions**
   - Apply safe settings (one-click)
   - Apply preset
   - Restore backup
   - Export configuration
   - Reset to defaults

**Integration Points:**
- Desktop Bridge for file I/O
- Neural Link for mod detection
- Mining Engines for recommendations
- Add to `/tools/ini-manager` route

**Files to Create:**
- `src/renderer/src/INIConfigurationManager.tsx`
- `src/main/ini-parser.ts`
- `src/shared/types/ini-types.ts`
- `src/renderer/src/components/INIEditor.tsx`
- `src/renderer/src/utils/ini-validator.ts`

---

### 📋 Phase 2: Asset Duplicate Scanner

**Priority:** ⭐⭐⭐⭐
**Impact:** High (performance improvement)
**Effort:** Medium (2 weeks)
**Status:** Planned

**Implementation Plan:**

```typescript
// New component: src/renderer/src/AssetDuplicateScanner.tsx
interface DuplicateAsset {
  hash: string;
  files: Array<{
    path: string;
    mod: string;
    size: number;
    resolution?: string; // for textures
    format?: string;
  }>;
  type: 'texture' | 'mesh' | 'sound' | 'other';
  vramImpact?: number; // MB
}

interface ScanResult {
  duplicates: DuplicateAsset[];
  totalWastedSpace: number;
  totalVRAMWaste: number;
  recommendedActions: Array<{
    action: 'keep' | 'delete';
    file: string;
    reason: string;
  }>;
}
```

**Features:**
1. **Scanner**
   - SHA256 hash for exact duplicates
   - Perceptual hash for similar textures
   - Scan entire Data folder
   - Scan BA2 archives
   - Multi-threaded scanning

2. **Analysis**
   - Group duplicates by hash
   - Calculate size impact
   - Estimate VRAM usage (for DDS files)
   - Identify mod sources

3. **UI**
   - Progress bar during scan
   - Sortable duplicate list
   - Preview images (for textures)
   - File comparison view
   - Bulk selection

4. **Actions**
   - Auto-fix (keep best version)
   - Manual selection
   - Backup before delete
   - Whitelist files (don't scan)
   - Generate report

**Integration Points:**
- Use existing Asset Correlation Engine
- Extend The Vault's asset management
- Desktop Bridge for file operations
- Add to `/tools/asset-scanner` route

**Files to Create:**
- `src/renderer/src/AssetDuplicateScanner.tsx`
- `src/mining/duplicate-detector.ts`
- `src/main/asset-hasher.ts`
- `src/renderer/src/components/DuplicateCard.tsx`

---

### 📋 Phase 3: Game Log Monitor

**Priority:** ⭐⭐⭐⭐
**Impact:** High (debugging efficiency)
**Effort:** Medium (2 weeks)
**Status:** Planned

**Implementation Plan:**

```typescript
// New component: src/renderer/src/GameLogMonitor.tsx
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string; // Papyrus, Game, Mod
  message: string;
  modSource?: string;
  stackTrace?: string[];
}

interface CrashPrediction {
  confidence: number; // 0-100
  reason: string;
  timeToExpectedCrash: number; // seconds
  mitigationSteps: string[];
}
```

**Features:**
1. **File Watcher**
   - Monitor Fallout4.log
   - Monitor Papyrus.0.log
   - Monitor script logs
   - Tail files in real-time

2. **Parser**
   - Parse log formats
   - Extract timestamps
   - Identify error patterns
   - Link to mods when possible

3. **Prediction Engine**
   - Pattern matching for known issues
   - Memory allocation warnings
   - Script attach failures
   - Missing master detection

4. **UI**
   - Live log feed
   - Filterable by level/mod
   - Timeline view
   - Alert system
   - Crash report generator

5. **Actions**
   - Export crash report
   - Auto-pause on critical error
   - Suggest fixes
   - Link to wiki/fixes

**Integration Points:**
- Use chokidar for file watching
- Neural Link for game process detection
- AI Copilot for suggestion generation
- Add to `/tools/log-monitor` route

**Files to Create:**
- `src/renderer/src/GameLogMonitor.tsx`
- `src/main/log-watcher.ts`
- `src/shared/log-parser.ts`
- `src/mining/crash-predictor.ts`
- `src/renderer/src/components/LogViewer.tsx`

---

### 📋 Phase 4: xEdit Script Executor

**Priority:** ⭐⭐⭐⭐
**Impact:** High (automation)
**Effort:** Medium (2 weeks)
**Status:** Planned

**Implementation Plan:**

```typescript
// New component: src/renderer/src/XEditScriptExecutor.tsx
interface XEditScript {
  id: string;
  name: string;
  description: string;
  category: 'cleaning' | 'patching' | 'analysis' | 'custom';
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file';
    default?: any;
    required: boolean;
  }>;
  scriptPath: string;
}
```

**Features:**
1. **Script Library**
   - Built-in common scripts
   - User-uploaded scripts
   - Script validation
   - Parameter templates

2. **Executor**
   - Launch xEdit with arguments
   - Monitor progress
   - Parse output
   - Handle errors

3. **UI**
   - Script catalog
   - Parameter input form
   - Progress monitoring
   - Result viewer

4. **Common Scripts**
   - Quick Clean (ITM/UDR removal)
   - Master rename
   - Record duplication
   - Conflict resolution

**Integration Points:**
- Desktop Bridge for process execution
- Existing xEdit integration guides
- Add to `/tools/xedit-executor` route

**Files to Create:**
- `src/renderer/src/XEditScriptExecutor.tsx`
- `src/main/xedit-runner.ts`
- `src/shared/xedit-scripts/` (script templates)
- `src/renderer/src/components/ScriptCard.tsx`

---

### 📋 Phase 5-10: Additional Features (Planned)

**5. Mod Conflict Visualizer**
- React Flow graph visualization
- Node-based conflict display
- Resolution suggestions
- Route: `/tools/conflict-viz`

**6. Project Template System**
- Pre-built mod templates
- Folder structure generation
- Sample files
- Route: integrated into ProjectHub

**7. FormID Remapper**
- ESP parser
- FormID conflict detection
- Batch remapping
- Route: `/tools/formid-remapper`

**8. Mod Comparison Tool**
- Side-by-side ESP diff
- Texture comparison
- Script diff
- Route: `/tools/mod-compare`

**9. Precombine/PRP Generator**
- PJM script orchestration
- Worldspace selection
- Progress monitoring
- Route: `/tools/prp-generator`

**10. Voice Command Execution**
- Extend Web Speech API integration
- Intent parser
- Action executor
- Integrated into existing voice features

---

## UI Consolidation Plan

### Current State
- ~150+ total components
- ~43 main routes/pages
- Many guide variants (Quick Start, FO4-specific)

### Consolidation Strategy

#### 1. Guide Consolidation
**Before:** 
- HavokGuide, HavokQuickStartGuide, HavokFallout4Guide
- PaperScriptGuide, PaperScriptQuickStartGuide, PaperScriptFallout4Guide
- SimSettlementsGuide, SimSettlementsAddonGuide
- Multiple Blender guides

**After:**
- Create unified `GuideFramework.tsx`
- Route: `/guides/{category}/{guide}?variant=quick|fo4|full`
- Single component with tab-based navigation
- Reduces ~20 guide pages → 7-8 unified guides

**Implementation:**
```typescript
// src/renderer/src/GuideFramework.tsx
interface GuideProps {
  category: 'blender' | 'papyrus' | 'havok' | 'settlements' | 'bodyslide';
  guide: string;
  variant?: 'quick' | 'fo4' | 'full';
}
```

#### 2. Analysis Hub
**Before:**
- TheAuditor
- MiningDashboard
- Phase2MiningDashboard
- AdvancedAnalysisPanel
- SystemMonitor
- AnalyticsDashboard

**After:**
- Create `AnalysisHub.tsx`
- Route: `/analysis` with sub-routes
- Tabs: Audit | Mining | System | Analytics
- Reduces 6 pages → 1 hub with 4 tabs

#### 3. Wizard Consolidation
**Before:**
- Multiple separate wizard implementations
- InstallWizard, CrashTriageWizard, PRPPatchBuilderWizard, etc.

**After:**
- Enhanced `WizardFramework` (already partially exists)
- Config-driven wizards
- Route: `/wizards/{wizard-type}`
- Centralized in WizardsHub

#### 4. New Features Hub
**Before:** N/A (new features)

**After:**
- Create `ToolsHub.tsx` (or enhance existing /tools)
- Route: `/tools` with grid of tool cards
- Categories:
  - Configuration (INI Manager)
  - Analysis (Asset Scanner, Log Monitor)
  - Automation (xEdit Executor)
  - Visualization (Conflict Viz)
  - Utilities (Comparison, Remapper)

#### Estimated Page Reduction
- **Current:** ~43 main pages
- **After consolidation:** ~25-30 pages
- **Reduction:** ~30-40%

---

## Implementation Schedule

### Week 1: Foundation
- [x] Create Bethesda.net vs Nexus guide
- [ ] Design UI consolidation architecture
- [ ] Create GuideFramework component
- [ ] Begin INI Manager development

### Week 2: INI Manager
- [ ] Complete INI parser
- [ ] Implement recommendation engine
- [ ] Build UI
- [ ] Testing and polish

### Week 3: Asset Scanner
- [ ] Implement hashing system
- [ ] Build scanner engine
- [ ] Create UI
- [ ] Testing

### Week 4: Log Monitor
- [ ] Implement file watcher
- [ ] Build log parser
- [ ] Create prediction engine
- [ ] Build UI

### Week 5-6: Guide Consolidation
- [ ] Migrate all guides to new framework
- [ ] Update routes
- [ ] Test navigation

### Week 7-8: xEdit Executor
- [ ] Script library
- [ ] Executor implementation
- [ ] UI
- [ ] Testing

### Week 9-12: Additional Features
- [ ] Conflict Visualizer
- [ ] Project Templates
- [ ] FormID Remapper
- [ ] Mod Comparison

### Week 13-14: Polish
- [ ] Complete UI consolidation
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final testing

---

## Technical Architecture

### New Dependencies Required

```json
{
  "dependencies": {
    "chokidar": "^3.5.3",      // File watching for log monitor
    "react-flow-renderer": "^10.3.17", // Conflict visualization
    "diff": "^5.1.0",           // Mod comparison
    "sharp": "^0.32.0",         // Already exists, extend usage
    "phash": "^0.1.0"          // Perceptual hashing for images
  }
}
```

### Component Organization

```
src/renderer/src/
├── INIConfigurationManager.tsx
├── AssetDuplicateScanner.tsx
├── GameLogMonitor.tsx
├── XEditScriptExecutor.tsx
├── ModConflictVisualizer.tsx
├── FormIDRemapper.tsx
├── ModComparisonTool.tsx
├── PrecombineGenerator.tsx
├── GuideFramework.tsx
├── AnalysisHub.tsx
├── ToolsHub.tsx (enhanced)
└── components/
    ├── INIEditor.tsx
    ├── DuplicateCard.tsx
    ├── LogViewer.tsx
    ├── ScriptCard.tsx
    ├── ConflictGraph.tsx
    └── GuideVariantSelector.tsx
```

### Service Layer

```
src/main/
├── ini-parser.ts
├── asset-hasher.ts
├── log-watcher.ts
├── xedit-runner.ts
└── formid-mapper.ts

src/mining/
├── duplicate-detector.ts
├── crash-predictor.ts
└── conflict-analyzer.ts

src/shared/
├── types/
│   ├── ini-types.ts
│   ├── asset-types.ts
│   └── log-types.ts
└── xedit-scripts/
    ├── quick-clean.pas
    ├── rename-master.pas
    └── ... (more scripts)
```

---

## Testing Strategy

### Unit Tests
- INI parser
- Asset hasher
- Log parser
- Conflict detector

### Integration Tests
- File I/O operations
- Desktop Bridge communication
- xEdit execution

### E2E Tests
- INI Manager workflow
- Asset scanning
- Log monitoring

---

## Documentation Updates

### User Documentation
- [ ] INI Configuration Manager guide
- [ ] Asset Duplicate Scanner guide
- [ ] Game Log Monitor guide
- [ ] xEdit Script Executor guide
- [ ] UI consolidation announcement
- [ ] Updated navigation guide

### Developer Documentation
- [ ] New component architecture
- [ ] Service layer APIs
- [ ] Testing guidelines
- [ ] Contribution guide updates

---

## Success Metrics

### Performance Metrics
- INI Manager: Reduce crash reports by 70%
- Asset Scanner: Average VRAM savings of 8+ GB
- Log Monitor: Reduce debug time from hours to minutes

### User Metrics
- Feature adoption rate
- User satisfaction scores
- Support ticket reduction
- Time-to-resolution improvements

### Technical Metrics
- Page load time (should improve with consolidation)
- Build size impact
- Memory usage
- Startup time

---

## Risk Assessment

### High Risk
- **File I/O operations**: Ensure proper backups, validation
- **xEdit execution**: Handle errors gracefully, timeout protection
- **Performance**: Large file scanning could be slow

### Medium Risk
- **UI consolidation**: Breaking existing bookmarks/favorites
- **Route changes**: Need redirect system
- **Testing coverage**: Comprehensive testing required

### Low Risk
- **Educational content**: Low technical risk
- **Documentation**: Can iterate
- **Polish features**: Can defer if needed

---

## Rollout Plan

### Phase 1: Beta Release
- Internal testing
- Limited user group
- Gather feedback

### Phase 2: Staged Rollout
- Week 1: INI Manager + Guide consolidation
- Week 2: Asset Scanner + Log Monitor
- Week 3: Additional tools
- Week 4: Full release

### Phase 3: Monitoring
- Track metrics
- Fix bugs
- Iterate on feedback

---

## Conclusion

This roadmap provides a comprehensive plan for implementing all requested features while improving the overall Mossy architecture through UI consolidation. The phased approach ensures steady progress with regular deliverables and opportunities for feedback.

**Current Status:** 
- ✅ Educational content complete
- 🔄 INI Manager in progress
- 📋 Other features planned

**Next Steps:**
1. Complete INI Configuration Manager
2. Begin UI consolidation
3. Implement Asset Duplicate Scanner
4. Continue through feature list

---

*Last Updated: February 13, 2026*
*For Mossy v5.5.0+*
