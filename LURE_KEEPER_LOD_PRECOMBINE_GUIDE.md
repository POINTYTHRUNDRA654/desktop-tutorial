# Lure Keeper: Advanced LOD & Precombine Guide
## Complete PJM Scripting + PRP Compatibility

**Status:** In Progress - Tooth Pass & Low Gen Started  
**Last Updated:** January 13, 2026  
**Focus:** Low Generation (LOD) + Precombines for Lure Keeper Area

---

## Part 1: LOD (Level of Detail) - Advanced Implementation

### Understanding LOD Hierarchy in Fallout 4

**LOD Levels (Distance-Based):**
```
Level 0 (LOD0): 0-32 units (closest)     → Full geometry, all details
Level 1 (LOD1): 32-128 units             → Simplified mesh, 50-70% polygons
Level 2 (LOD2): 128-256 units            → Very simplified, 20-40% polygons
Level 3 (LOD3): 256-512 units            → Distant geometry, 5-10% polygons
Level 4 (LOD4): 512+ units (Distant LOD)→ Minimal silhouette only
```

**File Structure for LOD Models:**
```
Meshes/
├── Lure Keeper/
│   ├── LureKeeper_Main.nif                    (LOD0 - Full detail)
│   ├── LureKeeper_Main_LOD.nif                (LOD1-3 combined)
│   ├── [YNAM] LureKeeper_Main_Lod0.nif        (LOD0 - NiNode version)
│   ├── [YNAM] LureKeeper_Main_Lod1.nif        (LOD1)
│   ├── [YNAM] LureKeeper_Main_Lod2.nif        (LOD2)
│   ├── [YNAM] LureKeeper_Main_Lod3.nif        (LOD3)
│   ├── [YNAM] LureKeeper_Main_Lod4.nif        (LOD4)
│   └── Markers/
│       └── LureKeeper_LOD_Marker.nif          (Optional visual reference)
```

**[YNAM] Notation Explained:**
- Used internally by Creation Kit for LOD references
- Automatically generated when using CK's LOD generation
- Fallout 4 priority: Explicit LOD models > [YNAM] generated > None

### Lure Keeper Area: LOD Analysis

#### Geographic Scope
```
Cell Coordinates: [Identify your specific cell grid]
Total Area: [Calculate from cell dimensions]
Visible Range: ~512 units average (depends on terrain obstruction)
Key Landmarks:
  - [Building/Feature 1]
  - [Building/Feature 2]
  - [Terrain features]
```

#### Object Density Analysis
```
Total Objects in Area:
  - Static objects: [Count]
  - Dynamic objects: [Count]
  - Landscape: [Yes/No - if edited]
  - NavMesh: [Yes/No - if edited]

High-Density Zones (require LOD):
  - Zone A: [Description + polygon count]
  - Zone B: [Description + polygon count]
  - Zone C: [Description + polygon count]

Medium-Density Zones (standard LOD):
  - Zone D: [Description + polygon count]
  - Zone E: [Description + polygon count]
```

#### Triangle Count by LOD Level (Target Recommendations)

**Full Scene Triangle Budget:**
- LOD0 (close): 50,000-80,000 total triangles
- LOD1 (near): 15,000-25,000 total triangles  
- LOD2 (mid): 5,000-10,000 total triangles
- LOD3 (far): 1,000-2,000 total triangles
- LOD4 (distant): 200-500 triangles

**Per-Object Guidelines:**
```
Building/Large Structure:
  LOD0: 8,000-15,000 triangles
  LOD1: 2,000-4,000 triangles
  LOD2: 500-1,000 triangles
  LOD3: 100-200 triangles
  LOD4: 20-40 triangles

Medium Object (vehicle, machinery):
  LOD0: 3,000-6,000 triangles
  LOD1: 800-1,200 triangles
  LOD2: 200-400 triangles
  LOD3: 50-100 triangles
  LOD4: 10-20 triangles

Small Object (weapon, prop):
  LOD0: 500-1,500 triangles
  LOD1: 150-300 triangles
  LOD2: 50-100 triangles
  LOD3: 20-30 triangles
  (LOD4: Usually skipped)
```

---

## Part 2: Precombine System - Advanced Details

### What Are Precombines?

**Definition:**
Precombines are pre-combined static object meshes that replace individual objects in specific cells. Instead of rendering 50 separate tables, chairs, and shelves, Fallout 4 renders one optimized precombined mesh.

**Performance Impact:**
- **Draw Calls Reduced:** ~90% reduction in typical cells
- **FPS Gain:** +20-40 FPS in dense areas (Boston, settlements)
- **VRAM Savings:** ~30-50% reduction in busy zones

**How It Works:**
```
Individual Objects         Precombine Generation         Final Result
├─ Table (5,000 tri)      Create single mesh             ┌─ Combined.nif
├─ Chair (2,000 tri)  →   └─ Combine geometry        →  │  (7,500 tri)
└─ Shelf (2,500 tri)      └─ Merge materials             └─ 1 draw call
3 draw calls                                             vs 3 draw calls
```

### What Breaks Precombines?

**Critical Changes That Break Precombines:**
1. **Adding objects** to cells with existing precombines
2. **Deleting objects** from precombined cells
3. **Moving objects** in precombined cells (even 1 unit)
4. **Changing object properties** (scale, rotation, visibility)
5. **Landscape changes** in precombined cells
6. **NavMesh edits** in precombined cells

**Visual Symptom - Yellow Meshes:**
- Yellow/orange shader indicates broken/missing precombine data
- Performance drops immediately in affected areas
- Caused by Creation Kit not finding regenerated precombine data

### Lure Keeper Precombine Analysis

#### Cells Requiring Precombine Regeneration

**Primary Exterior Cells:**
```
Cell Name: [Identify your cells]
  Cell ID: [Hex code, e.g., 0x00A1F2E4]
  Object Count: [Total static refs]
  Current Status: [Precombined/Not Precombined]
  Modifications Made: [List changes]
  Regeneration Required: [Yes/No]

[Repeat for all cells]
```

#### Precombine Markers (Location Data)

**Understanding Precombine Cell Markers:**
```
File Location: Meshes\PreCombined\[PluginName]\
File Pattern: [CELLID]_0.nif, [CELLID]_1.nif, etc.

For Lure Keeper:
  Exterior Cell Format: [CELLID]_0.nif
  Interior Cell Format: [BuildingName]_0.nif
  
Marker Placement:
  - Generated at cell origin (0, 0, 0)
  - Invisible in-game (debug visual only)
  - References all combined meshes
```

#### Precombine Data Structure

**In Creation Kit Record Format:**
```
REFR (Reference) Record:
├─ EditorID: [Generated name]
├─ NAME (Base Object): Points to precombine mesh
├─ DATA (Position): 0, 0, 0 (cell origin)
├─ XMRK (Marker): Yes (precombine marker flag)
├─ XRIB (Unknown): Precombine data flag
├─ XESP (Enable State): Linked to cell enable state
└─ XTEL (Teleport): None (static reference)
```

---

## Part 3: PJM's Precombine-Previs Scripts - Advanced Workflow

### Prerequisites Verification

**Required Software (Specific Versions):**
```
✓ Fallout 4 (Latest update)
✓ Creation Kit (64-bit, v1.10.163+)
✓ xEdit/FO4Edit (v4.1.5+)
✓ PJM Precombine-Previs Scripts (Latest)
✓ PowerShell (v5.0+)
✓ 7-Zip or WinRAR
✓ 16GB+ RAM recommended for CK generation
```

**Fallout 4 Installation Path (Verify):**
```powershell
# PowerShell command to check if CK exists
Test-Path "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\CreationKit.exe"
# Should return: True
```

### Step-by-Step: Lure Keeper Precombine Generation

#### Phase 1: Preparation (Pre-Generation)

**Step 1A: Backup Your Plugin**
```
IMPORTANT: Create backup before any precombine work
├─ Copy: MyMod.esp → MyMod_BACKUP.esp
├─ Location: Same directory as working file
└─ Keep: Until precombine generation complete + verified
```

**Step 1B: Analyze Changes**
```
Open plugin in xEdit:
1. Load: MyMod.esp in FO4Edit
2. Navigate to: Worldspaces → [YourWorldspace] → [Cell]
3. Document:
   - Total REFR count: [Number]
   - Added objects: [List with RefIDs]
   - Deleted objects: [List with RefIDs]
   - Moved objects: [List with old/new coords]
   - Property changes: [Scale, rotation, visibility changes]
4. Save notes: LureKeeper_Changes.txt
```

**Step 1C: Extract PJM Scripts**
```
Download Location: https://www.nexusmods.com/fallout4/mods/73456

Extraction Path:
C:\Modding\PJM_Scripts\
├── xEdit_Scripts/
│   ├── PJM_GeneratePrecombineList.pas
│   ├── PJM_AnalyzePrecombineData.pas
│   └── PJM_DetectConflicts.pas
├── Batch_Files/
│   ├── 1_Prepare.bat
│   ├── 2_Generate.bat
│   └── 3_Package.bat
├── PowerShell/
│   └── PJM_Precombine.ps1
└── Config/
    └── paths.ini
```

**Step 1D: Configure Batch Files**
```
Edit: 1_Prepare.bat

SET GAME_PATH=C:\Program Files (x86)\Steam\steamapps\common\Fallout 4
SET CK_PATH=%GAME_PATH%\Tools\CreationKit.exe
SET XEDIT_PATH=C:\Modding\Tools\FO4Edit.exe
SET PLUGIN_NAME=MyMod.esp
SET PLUGIN_PATH=C:\Modding\Fallout4Mods\MyMod\
SET OUTPUT_PATH=C:\Modding\PJM_Work\LureKeeper\
```

#### Phase 2: Precombine Data Generation

**Step 2A: Run PJM Analysis Script**
```
In xEdit:
1. Load: Fallout4.esm + All masters + MyMod.esp
2. Apply Filter: [YourCell]
3. Run Script: PJM_AnalyzePrecombineData.pas

Script will output to xEdit log:
  ├─ Total refs: [Count]
  ├─ Precombined refs: [Count]
  ├─ Non-precombined refs: [Count]
  ├─ Static objects: [Count]
  ├─ Dynamic refs (ignored): [Count]
  └─ Report: PrecombineAnalysis_[CellID].txt

Review Output:
  - Check if cell currently has precombines
  - Note all non-precombined statics
  - Identify potential issues
```

**Step 2B: Run Preparation Batch**
```
Command Prompt (Run as Administrator):
C:\Modding\PJM_Scripts\1_Prepare.bat

This batch will:
  ✓ Copy plugin to working directory
  ✓ Create output folder structure
  ✓ Generate precombine reference list
  ✓ Output: Precombine_References.txt (FormIDs of all refs)

Verify Output:
  - Check: C:\Modding\PJM_Work\LureKeeper\Precombine_References.txt
  - Should list: All static RefIDs that will be precombined
  - Format: 0x[HEX] [Object EditorID] [Cell]
```

**Step 2C: Run Creation Kit Generation**
```
IMPORTANT: This step uses Creation Kit in headless mode
- Takes 5-30 minutes depending on complexity
- DO NOT interrupt process
- Monitor: Creation Kit process in Task Manager
- Check: Creation Kit log file regularly

Run Command:
C:\Modding\PJM_Scripts\2_Generate.bat

What Happens:
  1. CK launches in hidden mode
  2. Loads Fallout4.esm + masters + your plugin
  3. Runs internal precombine generation
  4. Generates PreCombined mesh files
  5. Updates plugin with precombine markers
  6. Saves output to: MyMod_Precombined.esp
  7. Logs progress to: CK_Generation.log

Monitor Progress:
  tail -f C:\Modding\PJM_Work\LureKeeper\CK_Generation.log

Wait for: "PRECOMBINE GENERATION COMPLETE"
```

**Step 2D: Validate Generation Output**
```
Check Created Files:
Meshes\PreCombined\MyMod\
├── [CELLID]_0.nif      ✓ Main precombine mesh
├── [CELLID]_1.nif      (if complex, multiple pieces)
├── [CELLID]_2.nif      (etc.)
└── manifest.txt        (list of combined meshes)

Validate Mesh Quality:
  Open in NifSkope:
  1. Load: [CELLID]_0.nif
  2. Check: BSTriShape blocks present
  3. Verify: Textures reference correct paths
  4. Confirm: Collision data present (bhkRigidBody)
  
Validate Mesh Size:
  - Total triangles: Check against LOD targets
  - File size: Typically 5-50 MB per cell (normal range)
  - If > 100 MB: May indicate generation error
```

#### Phase 3: Creation Kit Integration

**Step 3A: Load in Creation Kit**
```
CK Workflow:
1. Launch: Creation Kit.exe
2. File → Open: C:\Modding\PJM_Work\LureKeeper\MyMod_Precombined.esp
3. Wait: Full load (watch status bar)
4. Navigate: To your cell (Worldspace → World Map → Cell)
5. Look for: Precombine marker at cell origin (0, 0, 0)
```

**Step 3B: Generate PreVis**
```
CRITICAL: Do this AFTER precombine markers are placed

CK Menu Steps:
1. Worldspace → [YourWorldspace] → Edit
2. Menu → Worldspace → Generate PreVis Data
3. Select: Cells to regenerate (your precombined cells)
4. Wait: PreVis generation (5-15 minutes)
5. Verify: No errors in CK messages

What This Does:
  - Creates occlusion culling data
  - Tells engine what's visible from each position
  - Generates: Meshes\PreVis\[Plugin]\[CELLID].vis
  - Improves FPS by 20-30% in already-precombined areas

Monitor:
  - CK status bar shows progress
  - Watch: Creation Kit log (Installfolder\CreationKit.log)
```

**Step 3C: Verify In-Game**
```
Testing Procedure:
1. Copy: MyMod_Precombined.esp → Fallout 4\Data\
2. Update: plugins.txt with new plugin
3. Launch: Fallout 4 with validation enabled
   - If using Buffout 4: Automatically checks precombines
   - If using MO2: Enable warning system

In-Game Verification:
  - Teleport to cell: coc [CellName]
  - Look around: Do you see YELLOW meshes?
    ✗ Yellow = Precombine broken, regenerate
    ✓ Normal colors = Success
  - Check FPS: Should be 10-20 FPS higher than before
  - Watch: For popping/LOD transitions (normal)

Common Issues:
  Problem: Yellow precombined meshes
    Solution: Run generation again, check for object changes
  
  Problem: CTD on cell load
    Solution: Check CK log, validate with xEdit, rebuild
  
  Problem: No FPS improvement
    Solution: Confirm precombines actually exist (NifSkope check)
```

---

## Part 4: PRP (PreVis Repair Pack) Compatibility

### Understanding PRP Integration

**What PRP Does:**
```
PRP is a standalone mod that:
  ✓ Provides pre-generated precombines for 100+ popular mods
  ✓ Follows strict naming conventions
  ✓ Uses standardized folder structure
  ✓ Loads after all mods in load order
  ✓ Automatically applied precombines

When You Need PRP:
  - Your mod edits vanilla cells (Downtown Boston, etc.)
  - Your mod needs immediate precombine support
  - You want community-maintained precombines
  
When You DON'T Need PRP:
  - You're creating new custom areas (Lure Keeper)
  - You've already generated precombines with PJM
  - Performance is already optimized
```

### Making Your Precombines PRP-Compatible

#### File Structure Convention (PRP Standard)

**Required Folder Layout:**
```
Meshes/
└── PreCombined/
    └── [YourModName]/
        ├── [CellID]_0.nif
        ├── [CellID]_1.nif
        ├── [CellID]_2.nif
        └── manifest.txt

Examples:
  Meshes/PreCombined/MyMod/0x00A1F2E4_0.nif
  Meshes/PreCombined/MyMod/0x00A1F2E5_0.nif
  Meshes/PreCombined/MyMod/0x00A1F2E6_0.nif
```

**PRP Naming Convention:**
```
Format: [CELLID]_[PIECE].nif

[CELLID]:
  - 8-character hex FormID
  - Example: 0x00A1F2E4
  - Lowercase 'x', uppercase hex digits
  - From Creation Kit cell properties

[PIECE]:
  - Starting index: 0 (always start at 0)
  - Increment for complex cells: 0, 1, 2, etc.
  - Multiple pieces if precombine > 100 MB
  
Example Sequence:
  0x00A1F2E4_0.nif  (0-100 MB)
  0x00A1F2E4_1.nif  (100-200 MB, if needed)
  0x00A1F2E4_2.nif  (200-300 MB, if needed)
```

**Manifest File (manifest.txt):**
```
Name: Lure Keeper PreCombines
Version: 1.0
Author: [Your Name]
Description: Pre-generated precombines for Lure Keeper area

Cells Included:
  0x00A1F2E4  Lure Keeper Exterior
  0x00A1F2E5  Lure Keeper (Internal)
  0x00A1F2E6  Lure Keeper (Approach)

Generation Date: 2026-01-13
Generator: PJM Precombine-Previs Scripts v1.2.4
Compatibility: PRP-standard format
```

### PRP Load Order Position

**Correct Load Order Placement:**
```
Master Files (First)
  ├─ Fallout4.esm
  ├─ DLCRobot.esm
  └─ [All DLCs]

Framework Mods
  ├─ F4SE plugins
  └─ MCM mods

Content Mods
  ├─ MyMod.esp              (Your mod with edits)
  └─ ... other mods

Patch/Precombine Mods
  ├─ PRP.esp                (PreVis Repair Pack)
  ├─ MyMod_PreCombines.esp  (Your precombine patch)
  └─ ... other patches

Last (Always)
  └─ Bashed Patch.esp

Important Notes:
  - PRP should load AFTER your mod
  - Your precombines should load with your mod
  - Never load precombines before the mod they patch
```

### Testing PRP Compatibility

**Verification Checklist:**
```
□ Precombine files present in correct folder
□ File naming follows convention (0x[HEX]_[N].nif)
□ Manifest.txt exists and is readable
□ No naming conflicts with other mods
□ PRP mod enabled in load order
□ Your mod loads before PRP

Testing:
  1. Load: Fallout4.esm + DLCs + MyMod.esp + PRP.esp
  2. Run: Fallout 4 with Buffout 4 (for validation)
  3. Teleport: coc [YourCell]
  4. Check: No yellow meshes
  5. Verify: FPS is good
  6. Confirm: Precombines are active
     - Use console: help [ObjectName] 4
     - Check: If objects refer to precombined mesh
```

---

## Part 5: Advanced LOD Generation with PJM

### Tooth Pass (First LOD Pass)

**What is Tooth Pass?**
```
"Tooth Pass" = Initial LOD generation pass
  - Generates LOD0 versions (simplified LOD1-4 automatically)
  - Creates initial brush-stroke silhouettes
  - Basis for further refinement

Process:
  1. High-poly models (your original meshes)
  2. Creation Kit generates LOD automatically
  3. Output: Simplified silhouette models
  4. Result: "Tooth-like" jagged edges (reason for name)
```

**Creating LOD0 (Simplified Models):**

```
xEdit Script Method:
  1. Open: MyMod.esp in FO4Edit
  2. Run: Script to extract all statics in cell
  3. Export: FormIDs to file
  4. Use: Batch to generate LOD meshes

Manual Method (Per-Object):
  1. Open: Original mesh in 3DS Max/Blender
  2. Delete: Non-essential geometry (details, decals)
  3. Simplify: To 25-50% of original triangles
  4. Export: As [ObjectName]_lod.nif
  5. Place: In correct LOD folder structure
```

**LOD0 Generation Command (CK-Based):**
```
# PowerShell script to batch generate LOD
$objects = Get-Content "LureKeeper_Objects.txt"
foreach ($obj in $objects) {
    & $ckPath -language:english -template:$obj -generateLOD
}

This generates:
  ✓ [YNAM] LureKeeper_Main_Lod0.nif
  ✓ [YNAM] LureKeeper_Main_Lod1.nif
  ✓ [YNAM] LureKeeper_Main_Lod2.nif
  ✓ [YNAM] LureKeeper_Main_Lod3.nif
```

### Low Gen (Low Generation - Second Pass)

**What is Low Gen?**
```
"Low Gen" = Polished LOD generation
  - Refines Tooth Pass results
  - Improves silhouettes and performance
  - Reduces triangle count further
  - Manual hand-tuning of LOD models

Typical Reduction:
  Tooth Pass LOD2:    5,000 triangles
  Low Gen LOD2:       2,000 triangles (60% reduction)
  
  Tooth Pass LOD3:    1,000 triangles
  Low Gen LOD3:       300 triangles (70% reduction)
```

**Low Gen Optimization Steps:**

**Step 1: Analyze Tooth Pass Output**
```
In NifSkope:
  1. Open: [YNAM] LureKeeper_Main_Lod2.nif
  2. Check: Overall silhouette
  3. Identify: 
     - Unnecessary details (railings, small decor)
     - Double-sided faces that can be singles
     - Small protrusions that add little visually
  4. Document: Which geometry to remove
```

**Step 2: Manual Refinement**
```
In 3DS Max / Blender:
  1. Import: LOD mesh from CK
  2. Delete: Identified non-essential geometry
  3. Retopologize: If needed (complex shapes)
  4. Target: Reduce to 40-60% of Tooth Pass
  5. Optimize: Merge duplicate vertices
  6. Export: Refined LOD model
```

**Step 3: Recreate LOD Chain**
```
Manual LOD Creation:
  LOD0: Hand-create very simple version (10% of original)
  LOD1: Medium simplification (20% of original)
  LOD2: More detail (40% of original)
  LOD3: Fine detail (60% of original)
  LOD4: Silhouette only (2-5% of original)

File Output:
  [YNAM] LureKeeper_Main_Lod0.nif  (refined)
  [YNAM] LureKeeper_Main_Lod1.nif  (refined)
  [YNAM] LureKeeper_Main_Lod2.nif  (refined, Low Gen)
  [YNAM] LureKeeper_Main_Lod3.nif  (refined)
  [YNAM] LureKeeper_Main_Lod4.nif  (refined)
```

**Step 4: Update CK**
```
Creation Kit Update:
  1. File → Import Models
  2. Select: Refined LOD meshes
  3. CK automatically updates STAT records
  4. Save: Plugin with new LOD references
  5. Verify: In-game transitions smooth
```

---

## Part 6: Checklist - Completing Lure Keeper Area

### Phase Checklist

**✓ Completed:**
- [ ] Tooth Pass LOD generation initiated
- [ ] Low Gen LOD refinement started

**In Progress:**
- [ ] Complete Low Gen optimization
- [ ] Verify LOD transitions in-game
- [ ] Generate precombines with PJM
- [ ] Test precombine markers in CK

**Next Steps:**
- [ ] Generate PreVis data
- [ ] Validate in-game (no yellow meshes)
- [ ] Create PRP-compatible file structure
- [ ] Performance testing and FPS benchmarks
- [ ] Final documentation update

### Advanced Information - Completion Checklist

**LOD Data:**
- [ ] LOD0 model: [Triangle count] triangles
- [ ] LOD1 model: [Triangle count] triangles
- [ ] LOD2 model: [Triangle count] triangles
- [ ] LOD3 model: [Triangle count] triangles
- [ ] LOD4 model: [Triangle count] triangles
- [ ] Transition distances verified in-game
- [ ] No visual popping or LOD errors

**Precombine Data:**
- [ ] Cell ID: [0x HEX]
- [ ] Total objects in cell: [Count]
- [ ] Precombined objects: [Count]
- [ ] Precombine file size: [MB]
- [ ] Triangle count (combined): [Count]
- [ ] Markers placed at origin: Yes/No
- [ ] In-game yellow mesh check: Passed/Failed

**PRP Compatibility:**
- [ ] File structure: Meshes/PreCombined/[ModName]/
- [ ] File naming: [0xHEX]_0.nif format
- [ ] Manifest.txt present and complete
- [ ] Load order tested with PRP
- [ ] No conflicts with other precombine mods
- [ ] PRP loads after your mod: Verified

**Performance Metrics:**
- [ ] FPS before optimization: [Baseline] FPS
- [ ] FPS after LOD: [Improved] FPS (Gain: +X FPS)
- [ ] FPS after precombines: [Final] FPS (Gain: +X FPS)
- [ ] Memory usage: [MB VRAM before] → [MB VRAM after]
- [ ] Precombine marker visible in CK: Yes/No
- [ ] PreVis data generated: Yes/No

**Final Testing:**
- [ ] Cell loads without CTD
- [ ] No yellow precombined meshes
- [ ] No visual glitches or Z-fighting
- [ ] LOD transitions smooth (no popping)
- [ ] Performance stable (no sudden drops)
- [ ] Compatible with other mods in load order
- [ ] Documentation complete and saved

---

## Part 7: Troubleshooting Advanced Issues

### Problem: Yellow Precombined Meshes
```
Cause: Missing or incorrect precombine marker data

Solutions:
  1. Verify marker exists at (0,0,0) in cell
     - Open CK
     - Scroll to origin (should see marker)
     - Check XRIB flag is set
  
  2. Regenerate PreVis
     - Worldspace → Generate PreVis Data
     - Select affected cells
     - Wait for completion
  
  3. Rebuild entire precombine
     - Delete: Meshes/PreCombined/[ModName]/[CELLID]*.nif
     - Re-run: PJM generation process
     - Re-import in CK
```

### Problem: CTD on Cell Load
```
Possible Causes:
  1. Corrupt precombine mesh
  2. Missing texture reference
  3. Bad collision data
  4. Incompatible LOD model

Debugging:
  - Check: Papyrus log for texture errors
  - Open: Precombine mesh in NifSkope
  - Verify: All texture paths are valid
  - Check: Collision blocks (bhk*) are present
  - Solution: Rebuild precombine from scratch
```

### Problem: FPS Not Improved
```
Likely Causes:
  1. Precombines not actually active
  2. LOD models still too detailed
  3. Precombine file not loading

Verification:
  - xEdit: Check for precombine markers in cell
  - NifSkope: Confirm mesh file exists and valid
  - CK: Verify REFR records point to precombine
  
  If precombines ARE active:
    - Reduce LOD triangle counts further
    - Increase simplification in Low Gen pass
    - Consider disabling PreVis for other areas
```

---

## Part 8: Final Documentation Requirements

**Complete the following before marking as FINISHED:**

1. **Cell Identification**
   - [ ] Exact cell names and IDs documented
   - [ ] Cell grid coordinates recorded
   - [ ] Visible range calculated

2. **LOD Specifications**
   - [ ] Triangle counts per LOD level
   - [ ] File locations for all LOD models
   - [ ] Transition distances

3. **Precombine Specifications**
   - [ ] FormID ranges
   - [ ] Cell references
   - [ ] Object counts
   - [ ] File size specifications

4. **PJM Process Documentation**
   - [ ] Exact batch file configurations
   - [ ] Step-by-step generation walkthrough
   - [ ] Expected output files
   - [ ] Validation steps

5. **PRP Compatibility**
   - [ ] File structure confirmed
   - [ ] Naming conventions applied
   - [ ] Load order requirements
   - [ ] Testing verification

6. **Performance Metrics**
   - [ ] Before/after FPS measurements
   - [ ] VRAM usage before/after
   - [ ] Precombine effectiveness verified

---

## References

- **PJM Precombine-Previs Scripts:** https://www.nexusmods.com/fallout4/mods/73456
- **PreVis Repair Pack (PRP):** https://www.nexusmods.com/fallout4/mods/46403
- **Creation Kit Official Docs:** https://wiki.nexusmods.com/index.php/Creation_Kit_Level_Design_Guide
- **Fallout 4 NIF Format:** https://en.uesp.net/wiki/Tes5Mod:NIF_File_Format
