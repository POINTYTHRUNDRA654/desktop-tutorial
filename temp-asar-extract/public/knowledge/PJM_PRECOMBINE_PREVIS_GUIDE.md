# PJM's Precombine-Previs Scripts and PRP Compatibility Guide

## Understanding Precombines and PreVis in Fallout 4

### What are Precombines and PreVis?

**Precombines (Precombined Meshes):**
- Combines multiple static objects into single optimized meshes
- Reduces draw calls significantly
- Improves performance in dense areas (cities, settlements)
- Stored in `Meshes\PreCombined\` directory

**PreVis (Pre-Visible Geometry):**
- Pre-calculated occlusion data
- Tells the engine what's visible from any given position
- Prevents rendering objects behind walls/terrain
- Stored in `Meshes\PreVis\` directory

**Why They Matter:**
- Boston/Downtown FPS is playable because of precombines
- Without them: 15-30 FPS in cities
- With them: 45-60+ FPS in cities
- Critical for performance on mid-range hardware

### The Problem: Mods Break Precombines

**What Breaks Precombines:**
1. Adding/removing objects in exterior cells
2. Moving objects in precombined cells
3. Changing landscape/terrain
4. Editing navmesh in precombined areas
5. Cell edits in worldspace (CommonWealth)

**Symptoms of Broken Precombines:**
- **Yellow meshes** in-game (debug visualization)
- Severe FPS drops in affected areas
- Objects popping in/out unexpectedly
- "Missing precombine" warnings in logs
- Flickering/Z-fighting meshes

---

## What is PRP (PreVis Repair Pack)?

**PRP (PreVis Repair Pack)** by TheRizzler1
- **Purpose:** Fixes broken precombines from popular mods
- **Coverage:** 100+ popular mods automatically compatible
- **How it works:** Regenerates precombines for commonly edited cells
- **Performance:** Restores FPS in Boston and high-traffic areas
- **Nexus Link:** https://www.nexusmods.com/fallout4/mods/46403

### PRP Features:
✅ **Pre-generated precombines** for 100+ mods  
✅ **Modular patches** (only load what you need)  
✅ **Community maintained** (frequent updates)  
✅ **Load order friendly** (loads after all mods)  
✅ **FPS restoration** (often +15-30 FPS in Boston)

### Popular Mods Covered by PRP:
- Sim Settlements 2
- Place Everywhere
- Scrap Everything variants
- Many settlement building mods
- Popular quest mods that edit worldspace
- Workshop framework mods

---

## What is PJM's Precombine-Previs Patching Scripts?

**PJM's Scripts** by PJMichaels
- **Purpose:** Generate your own precombine patches for ANY mod
- **Type:** xEdit scripts + batch files
- **Nexus Link:** https://www.nexusmods.com/fallout4/mods/73456
- **Use Case:** Create PRP-compatible patches for your custom mods

### Why Use PJM's Scripts:
✅ **DIY precombine generation** - Don't wait for PRP updates  
✅ **Custom mod support** - Patch your own worldspace edits  
✅ **PRP compatibility** - Patches follow PRP standards  
✅ **Automation** - Scripted process (less manual work)  
✅ **Quality control** - Matches Creation Kit output

### Components:
1. **xEdit Script** - Analyzes plugin for precombine needs
2. **Batch Files** - Automates Creation Kit precombine generation
3. **PowerShell Scripts** - File management and organization
4. **Documentation** - Step-by-step guides

---

## Installing PJM's Precombine-Previs Scripts

### Prerequisites

**Required Software:**
1. **Fallout 4** (obviously)
2. **Creation Kit** - Required for precombine generation
3. **xEdit (FO4Edit)** - v4.1.5+ recommended
4. **7-Zip or WinRAR** - For extracting archives

**Required Knowledge:**
- Basic xEdit usage (opening plugins, understanding records)
- File management (copy/paste, directory structure)
- Creation Kit basics (loading plugins, worldspace)

### Installation Steps

**Step 1: Download PJM's Scripts**
```
1. Go to Nexus: https://www.nexusmods.com/fallout4/mods/73456
2. Download main file: "PJM Precombine-Previs Scripts"
3. Extract to a working directory (NOT in Fallout 4 folder)
   Recommended: C:\Modding\PJM_Scripts\
```

**Step 2: Verify File Structure**
```
PJM_Scripts/
├── xEdit Scripts/
│   ├── PJM_GeneratePrecombineList.pas
│   └── PJM_AnalyzePrecombineData.pas
├── Batch Files/
│   ├── 1_PreparePlugin.bat
│   ├── 2_RunCK_Precombine.bat
│   └── 3_PackageResults.bat
├── PowerShell/
│   └── ManagePrecombines.ps1
└── README.txt
```

**Step 3: Configure Paths**
```
Edit batch files to point to your installations:

In 1_PreparePlugin.bat:
set FO4_PATH=C:\Games\Steam\steamapps\common\Fallout 4
set CK_PATH=C:\Games\Steam\steamapps\common\Fallout 4\Tools\CreationKit.exe
set XEDIT_PATH=C:\Modding\Tools\FO4Edit.exe

In 2_RunCK_Precombine.bat:
set CK_EXE=C:\Games\Steam\steamapps\common\Fallout 4\Tools\CreationKit.exe
```

**Step 4: Install xEdit Scripts**
```
1. Navigate to xEdit Scripts folder
2. Copy *.pas files
3. Paste into: [FO4Edit Directory]\Edit Scripts\
4. Restart xEdit if it was open
```

**Step 5: Verify Installation**
```
1. Open FO4Edit
2. Right-click in main window → Apply Script
3. Look for "PJM_GeneratePrecombineList" in script list
4. If present, installation successful ✓
```

---

## Using PJM's Scripts: Complete Walkthrough

### Scenario: Your Custom Settlement Mod Breaks Precombines

**Example Mod:** MySettlement.esp (adds buildings to Sanctuary Hills)

### Phase 1: Analyze Which Cells Need Precombines

**Step 1: Load Your Plugin in xEdit**
```
1. Launch FO4Edit
2. Select your plugin (MySettlement.esp)
3. Load only: Fallout4.esm, your plugin
4. Wait for loading to complete
```

**Step 2: Run PJM Analysis Script**
```
1. Right-click anywhere in xEdit
2. Apply Script → PJM_AnalyzePrecombineData
3. Script will scan your plugin for:
   - Modified exterior cells
   - Added/removed references
   - Cells that had vanilla precombines
4. Script outputs text file:
   PJM_Analysis_MySettlement.txt
```

**Step 3: Review Analysis Results**
```
Open PJM_Analysis_MySettlement.txt:

=== Cells Requiring Precombine Regeneration ===
Cell: SanctuaryHills01 (0000A0C6)
  - Added 12 new static references
  - Vanilla had precombines: YES
  - Action: Regenerate precombines

Cell: SanctuaryHills02 (0000A0C7)
  - Added 5 new static references
  - Vanilla had precombines: YES
  - Action: Regenerate precombines

Total Cells: 2
Estimated Generation Time: 15-30 minutes
```

**Understanding the Analysis:**
- **Added references:** Your new objects
- **Vanilla had precombines:** Confirms cell needs regeneration
- **Action:** What PJM recommends

### Phase 2: Generate Precombine List

**Step 1: Run List Generation Script**
```
1. In xEdit, right-click → Apply Script
2. Select: PJM_GeneratePrecombineList
3. Script prompts:
   - "Include all affected cells?" → YES
   - "Generate CK command file?" → YES
4. Script creates:
   - PrecombineList_MySettlement.txt (cell list)
   - CK_Commands_MySettlement.txt (automation file)
```

**Step 2: Review Generated Files**
```
PrecombineList_MySettlement.txt:
Commonwealth,SanctuaryHills01
Commonwealth,SanctuaryHills02

CK_Commands_MySettlement.txt:
GeneratePrecombinedMeshes "Commonwealth" "SanctuaryHills01"
GeneratePrecombinedMeshes "Commonwealth" "SanctuaryHills02"
```

### Phase 3: Prepare Plugin for CK

**Step 1: Create Working Directory**
```
C:\Modding\Precombine_Work\MySettlement\
├── Input\
│   └── MySettlement.esp (copy here)
├── Output\
└── Logs\
```

**Step 2: Run Preparation Batch**
```
1. Navigate to PJM_Scripts\Batch Files\
2. Edit 1_PreparePlugin.bat:
   set PLUGIN_NAME=MySettlement.esp
   set WORK_DIR=C:\Modding\Precombine_Work\MySettlement
3. Run: 1_PreparePlugin.bat
4. Script:
   - Backs up original plugin
   - Creates CK-ready version
   - Sets up output folders
```

**Output:**
```
[LOG] Backing up MySettlement.esp...
[LOG] Creating CK workspace...
[LOG] Copying plugin to CK Data directory...
[LOG] Preparation complete!
[LOG] Ready for Creation Kit precombine generation.
```

### Phase 4: Generate Precombines in Creation Kit

**⚠️ CRITICAL: Creation Kit Steps**

**Step 1: Configure Creation Kit**
```
1. Open Creation Kit
2. File → Data
3. UNCHECK ALL plugins except:
   ✓ Fallout4.esm
   ✓ All official DLCs (if your mod requires them)
   ✓ MySettlement.esp (set as Active File)
4. Click OK
```

**Step 2: Load Worldspace**
```
1. Wait for CK to fully load (can take 2-5 minutes)
2. World → World Space
3. Select: Commonwealth (or your worldspace)
4. Click OK
```

**Step 3: Load Cells**
```
1. Cell View window appears
2. World Space dropdown: Commonwealth
3. Filter: "SanctuaryHills" (to find your cells)
4. Select first cell: SanctuaryHills01
```

**Step 4: Generate Precombines (Manual Method)**
```
1. Cell View → Right-click cell → Select
2. Worldspace menu → Generate Precombined Meshes
3. Dialog appears:
   ⚠️ WARNING: This process is SLOW (5-15 min per cell)
   ☐ Include all loaded cells
   ☑ Generate for selected cell only
4. Click: Yes
5. CK processes (progress bar shows)
6. WAIT - Do NOT close CK during this!
```

**Step 5: Generate PreVis Data**
```
After precombines finish:
1. Same cell selected
2. Worldspace menu → Generate Max Height Data
3. Wait for completion (faster, ~1-2 min)
4. Worldspace menu → Generate PreVis Data
5. Wait for completion (~3-5 min per cell)
```

**Step 6: Repeat for All Cells**
```
For each cell in your list:
- Select cell
- Generate Precombined Meshes
- Generate Max Height Data
- Generate PreVis Data
- Wait for completion before next cell
```

**Step 7: Save Plugin**
```
1. After ALL cells processed
2. File → Save
3. Wait for save to complete
4. File → Exit
```

**Alternative: Automated Method (Advanced)**
```
Use 2_RunCK_Precombine.bat:
- Reads CK_Commands_MySettlement.txt
- Launches CK with automation
- Runs commands in sequence
- Saves and exits

⚠️ Requires CK Automation Framework (separate mod)
Not recommended for beginners
```

### Phase 5: Package and Integrate Results

**Step 1: Locate Generated Files**
```
After CK closes, files are in:

Fallout 4\Data\Meshes\PreCombined\Commonwealth\
├── SanctuaryHills01_xx_yy_Combined.nif
└── SanctuaryHills02_xx_yy_Combined.nif

Fallout 4\Data\Meshes\PreVis\Commonwealth\
├── SanctuaryHills01_xx_yy.nif
└── SanctuaryHills02_xx_yy.nif
```

**Step 2: Run Packaging Script**
```
1. Navigate to PJM_Scripts\Batch Files\
2. Run: 3_PackageResults.bat
3. Script:
   - Collects generated meshes
   - Organizes into mod structure
   - Creates plugin patch
   - Generates load order instructions
```

**Step 3: Verify Package Structure**
```
Output folder structure:
MySettlement_PrecombinePatch\
├── MySettlement - Precombines.esp
├── Meshes\
│   ├── PreCombined\
│   │   └── Commonwealth\
│   │       ├── SanctuaryHills01_*_Combined.nif
│   │       └── SanctuaryHills02_*_Combined.nif
│   └── PreVis\
│       └── Commonwealth\
│           ├── SanctuaryHills01_*.nif
│           └── SanctuaryHills02_*.nif
└── ReadMe.txt (generated instructions)
```

**Step 4: Install Your Patch**
```
Method A (Manual):
1. Copy entire MySettlement_PrecombinePatch folder
2. Paste into Fallout 4\Data\
3. Enable MySettlement - Precombines.esp in load order

Method B (Mod Manager):
1. Create new mod in MO2/Vortex
2. Name: "MySettlement - Precombine Patch"
3. Add files from MySettlement_PrecombinePatch
4. Enable mod
5. Enable ESP
```

**Step 5: Set Load Order**
```
Correct load order:
...
MySettlement.esp (your original mod)
PRP.esp (if using PreVis Repair Pack)
MySettlement - Precombines.esp (load AFTER PRP)
...
```

---

## PRP Compatibility: Making Your Mod Work with PRP

### Understanding PRP Integration

**PRP (PreVis Repair Pack) Workflow:**
1. PRP contains precombines for 100+ popular mods
2. PRP loads near end of load order
3. PRP's precombines override broken vanilla precombines
4. Your custom patch must load AFTER PRP

### Compatibility Checklist

**Step 1: Check if PRP Already Covers Your Mod**
```
1. Open PRP main page on Nexus
2. Check "Supported Mods" list
3. If your mod is listed:
   - ✅ Use PRP's existing patch
   - ❌ Don't generate your own (conflicts)
4. If NOT listed:
   - ✅ Generate your own patch
   - ✅ Design for PRP compatibility
```

**Step 2: Coordinate Cell Edits**
```
If your mod edits cells that PRP also patches:

Option A (Recommended): Forward PRP Changes
1. Load in xEdit:
   - Fallout4.esm
   - PRP.esp
   - MySettlement.esp
2. Find conflict records (precombine data)
3. Right-click PRP record → Copy as Override into MySettlement.esp
4. Your mod now includes PRP's precombines

Option B: Create Merge Patch
1. Generate precombines for your mod
2. Load both patches in xEdit
3. Create merged patch with both precombine sets
4. User loads merged patch instead of individual

Option C: Document Incompatibility
1. Add to mod description: "Not compatible with PRP"
2. Provide standalone precombine patch
3. User chooses: PRP OR your mod (not both)
```

**Step 3: Test with PRP Enabled**
```
1. Clean install Fallout 4
2. Install your mod
3. Install PRP
4. Set load order:
   ...
   MySettlement.esp
   PRP.esp
   MySettlement - Precombines.esp (if separate)
   ...
5. Launch game
6. Visit edited cells
7. Check for:
   - No yellow meshes
   - Smooth FPS (60+ expected)
   - No flickering/Z-fighting
   - Objects render correctly
```

### Creating PRP-Compatible Patches

**Follow PRP Standards:**

1. **Naming Convention:**
   ```
   Your mod: MySettlement.esp
   Your patch: MySettlement - Precombines.esp
   
   OR (if integrated):
   MySettlement.esp (contains precombines directly)
   ```

2. **File Structure:**
   ```
   MyMod\
   ├── MyMod.esp
   ├── Meshes\
   │   ├── PreCombined\
   │   │   └── [Worldspace]\
   │   │       └── [CellName]_*_Combined.nif
   │   └── PreVis\
   │       └── [Worldspace]\
   │           └── [CellName]_*.nif
   ```

3. **Load Order Instructions:**
   ```
   In your mod description:
   
   "Load Order:
   - Install this mod
   - If using PRP, load PRP BEFORE this mod's precombine patch
   - Load [MyMod - Precombines.esp] last"
   ```

4. **Documentation:**
   ```
   Create README.txt:
   - Which cells have regenerated precombines
   - PRP compatibility status
   - Load order requirements
   - Known conflicts
   ```

---

## Advanced Techniques

### Batch Processing Multiple Mods

**Scenario:** You have 5 mods that all need precombines

**Step 1: Create Master List**
```
Create file: BatchPrecombineList.txt

Mod1.esp|Commonwealth|Cell1,Cell2,Cell3
Mod2.esp|Commonwealth|Cell4,Cell5
Mod3.esp|FarHarbor|Cell6
...
```

**Step 2: Use PJM PowerShell Script**
```powershell
.\ManagePrecombines.ps1 -BatchFile "BatchPrecombineList.txt" -Parallel $true
```

**Script will:**
- Process each mod sequentially
- Generate precombines for all cells
- Package results automatically
- Create load order instructions

### Selective Precombine Generation

**Problem:** Only some cells need precombines, not all

**Solution: Manual Cell Selection**
```
1. Run PJM analysis script
2. Review output cell list
3. Edit PrecombineList_[Mod].txt
4. Remove cells that don't need regeneration
5. Only process modified cells (saves time)
```

**Example:**
```
Original list:
Commonwealth,SanctuaryHills01  (you added objects here)
Commonwealth,SanctuaryHills02  (no changes, vanilla precombines OK)
Commonwealth,SanctuaryHills03  (you added objects here)

Edited list (remove unchanged cells):
Commonwealth,SanctuaryHills01
Commonwealth,SanctuaryHills03
```

### Debugging Precombine Issues

**Problem: Yellow Meshes Persist After Generation**

**Troubleshooting Steps:**

1. **Verify File Presence**
   ```
   Check: Data\Meshes\PreCombined\[Worldspace]\[Cell]_*_Combined.nif
   If missing: Precombine generation failed, try again
   ```

2. **Check Plugin Records**
   ```
   Open in xEdit:
   - Expand: Cell → Persistent → [PCMB] PreCombine Data
   - Verify: Record exists and references correct mesh files
   - If missing: Re-save plugin in CK after generation
   ```

3. **Load Order**
   ```
   Ensure precombine patch loads AFTER all mods that edit cells
   Incorrect: Mod.esp → OtherMod.esp → Precombines.esp
   Correct: Mod.esp → Precombines.esp → OtherMod.esp
   ```

4. **Conflicting Mods**
   ```
   Check in xEdit for conflicts:
   - Right-click plugin → Apply Filter for Cleaning
   - Look for precombine record conflicts
   - Manually resolve with patch
   ```

5. **Regenerate from Scratch**
   ```
   Last resort:
   1. Delete ALL generated files
   2. Clean Fallout4.esm in xEdit (removes dirty edits)
   3. Re-run entire PJM process
   4. Test with minimal load order
   ```

---

## Performance Impact and Optimization

### Before/After Metrics

**Typical Performance Gains:**

**Scenario: Settlement Mod without Precombines**
- Boston area: 20-35 FPS
- Settlement: 25-40 FPS
- Heavy load: 15-25 FPS
- Yellow meshes everywhere

**Same Mod with Regenerated Precombines:**
- Boston area: 50-60 FPS
- Settlement: 55-60 FPS
- Heavy load: 45-55 FPS
- No yellow meshes

**Performance Improvement: +25-30 FPS average**

### Optimization Tips

**1. Prioritize High-Traffic Areas**
```
Generate precombines first for:
- Sanctuary Hills
- Red Rocket
- Diamond City approach
- Boston Common
- Goodneighbor exterior

Skip precombines for:
- Remote wilderness cells (low impact)
- Interior cells (don't have precombines)
- Custom worldspaces with few objects
```

**2. Use LOD Generation**
```
After precombines:
1. Run xLODGen for distant terrain
2. Improves performance beyond precombine range
3. Complements precombine optimization
```

**3. Monitor File Size**
```
Large precombine meshes = more VRAM:
- Aim for <50 MB per combined mesh
- If larger, consider:
  * Splitting cell into sub-cells
  * Removing redundant objects
  * Optimizing base meshes first
```

---

## Common Errors and Solutions

### Error 1: "CK Failed to Generate Precombines"

**Symptom:** CK crashes or completes with no files generated

**Causes:**
- Too many objects in cell (>2000 references)
- Corrupted cell data
- Missing master files
- CK memory limit exceeded

**Solutions:**
```
1. Split cell into smaller sections
2. Run CK with 4GB patch (GECK Extender compatible)
3. Verify all masters are loaded
4. Clean cell records in xEdit before generation
5. Generate one cell at a time (not batch)
```

### Error 2: "Precombines Generate But Game Crashes"

**Symptom:** Game crashes when entering cells with new precombines

**Causes:**
- Corrupt mesh files
- Missing PreVis data (only ran precombines, not previs)
- Load order conflict

**Solutions:**
```
1. Verify you ran BOTH:
   - Generate Precombined Meshes
   - Generate PreVis Data
2. Check meshes with NifSkope (open .nif, verify no errors)
3. Regenerate with "Generate Max Height Data" first
4. Test with just your mod + DLCs (minimal load order)
```

### Error 3: "PJM Script Not Appearing in xEdit"

**Symptom:** Can't find PJM scripts in Apply Script menu

**Causes:**
- Scripts not copied to correct folder
- xEdit version incompatible
- Script syntax error

**Solutions:**
```
1. Verify scripts are in: [xEdit]\Edit Scripts\
2. File names must end with .pas
3. Update xEdit to v4.1.5+
4. Check script file for corruption (re-download)
5. Restart xEdit after copying scripts
```

### Error 4: "Yellow Meshes Persist After Patching"

**Symptom:** Still see yellow debug meshes in-game

**Causes:**
- Patch not enabled
- Wrong load order
- Cache not cleared
- Conflict with other mods

**Solutions:**
```
1. Verify patch ESP is checked in load order
2. Load patch AFTER all worldspace mods
3. Delete Fallout4 INI cache:
   Documents\My Games\Fallout4\Fallout4Prefs.ini
   [Display] → bUseCombinedObjects=1 (verify this line)
4. Start new game or COC to test cell
5. Use console command: ClearScreenBlood (refresh precombines)
```

### Error 5: "PRP and My Patch Conflict"

**Symptom:** Both patches loaded, but FPS still bad

**Causes:**
- Overlapping precombine data
- Both patches modifying same cells
- Incorrect load order

**Solutions:**
```
1. Check which cells both patches touch (xEdit)
2. Options:
   A. Let PRP win (remove your cells from your patch)
   B. Let your patch win (load after PRP)
   C. Merge patches (advanced, use xEdit)
3. Correct load order:
   Mods → PRP.esp → YourMod-Precombines.esp
```

---

## Best Practices and Recommendations

### Development Workflow

**1. Test Early, Test Often**
```
Don't wait until mod is complete:
1. Build base mod structure
2. Add objects to cells
3. Generate precombines
4. Test FPS in-game
5. Continue development
6. Regenerate precombines before release
```

**2. Document Cell Changes**
```
Keep a log:
MyMod_CellChanges.txt:
- SanctuaryHills01: Added 15 statics (barriers, walls)
- SanctuaryHills02: Modified terrain height
- RedRocket01: Added 8 statics (defenses)

Helps when regenerating precombines later
```

**3. Provide Multiple Versions**
```
Release structure:
- MyMod.esp (main mod, no precombines)
- MyMod_Precombines.esp (optional, for users without PRP)
- MyMod_PRP_Patch.esp (optional, for users with PRP)

Let users choose based on their setup
```

### Publishing Your Mod

**Nexus Description Template:**
```markdown
## Performance Optimization

This mod includes regenerated precombines for optimal FPS.

### With PRP (PreVis Repair Pack):
- Install PRP first
- Install this mod
- Load order: PRP.esp → MyMod.esp → MyMod-Precombines.esp

### Without PRP:
- Install this mod
- Load order: MyMod.esp → MyMod-Precombines.esp

### Edited Cells:
- SanctuaryHills01, SanctuaryHills02 (precombines regenerated)
- RedRocket01 (precombines regenerated)

### Expected Performance:
- Before: 25-35 FPS in edited cells
- After: 55-60 FPS in edited cells
- Tested on GTX 1060, i5-9600K, 16GB RAM
```

---

## Quick Reference Guide

### PJM Workflow Summary

```
1. [xEdit] Run PJM_AnalyzePrecombineData → Get cell list
2. [xEdit] Run PJM_GeneratePrecombineList → Get CK commands
3. [Batch] Run 1_PreparePlugin.bat → Setup workspace
4. [CK] Load plugin, select cells
5. [CK] Generate Precombined Meshes (per cell)
6. [CK] Generate Max Height Data (per cell)
7. [CK] Generate PreVis Data (per cell)
8. [CK] Save plugin
9. [Batch] Run 3_PackageResults.bat → Organize files
10. [Test] Enable patch, test in-game
```

### Load Order Template

```
# Base Game
Fallout4.esm
DLCRobot.esm
DLCworkshop01.esm
DLCCoast.esm
DLCworkshop02.esm
DLCworkshop03.esm
DLCNukaWorld.esm
DLCUltraHighResolution.esm

# Framework Mods
F4SE Plugins
Unofficial Fallout 4 Patch.esp

# Content Mods (your mod here)
MySettlementMod.esp
OtherWorldspaceEdit.esp

# Precombine Patches
PRP.esp (PreVis Repair Pack)
MySettlementMod - Precombines.esp
OtherWorldspaceEdit - Precombines.esp
```

---

## Tools and Resources

### Required Tools
- **Creation Kit** - Official Bethesda tool (Steam > Fallout 4 > Tools)
- **xEdit (FO4Edit)** - https://www.nexusmods.com/fallout4/mods/2737
- **PJM Scripts** - https://www.nexusmods.com/fallout4/mods/73456

### Optional but Recommended
- **PRP (PreVis Repair Pack)** - https://www.nexusmods.com/fallout4/mods/46403
- **Buffout 4** - Crash logger that detects precombine issues
- **NifSkope** - Verify generated combined meshes
- **7-Zip** - Archive management

### Documentation
- **PRP Documentation** - https://docs.google.com/document/d/1lqLGYqVi7O7u8rCp4LMvLz7xM6_Zl9kM4qRKG_6fRGI
- **CK Wiki - Precombines** - https://www.creationkit.com/fallout4/index.php?title=Precombined_Meshes
- **PJM's Guide** - Included in mod download README

### Community Support
- **Nexus Forums** - Fallout 4 Mod Talk > Performance
- **Reddit** - r/FalloutMods (precombine questions welcome)
- **Discord** - Fallout 4 Modding Discord (link on Nexus)

---

## Summary

### Key Takeaways:

✅ **Precombines are CRITICAL for FPS** in Fallout 4  
✅ **PRP fixes precombines** for 100+ popular mods  
✅ **PJM's Scripts let you generate your own** patches  
✅ **Always regenerate precombines** if editing worldspace  
✅ **Test with PRP enabled** for compatibility  
✅ **Load precombine patches LAST** in load order  
✅ **Document which cells you've patched** for users  

### When to Use Each Tool:

**Use PRP:**
- Your mod is already covered by PRP
- You want easy compatibility
- You use multiple worldspace-editing mods

**Use PJM's Scripts:**
- Your mod is NOT covered by PRP
- You're creating a new worldspace mod
- You need custom precombine generation
- You want to contribute patches to PRP

**Use Both:**
- Generate your patch with PJM
- Test compatibility with PRP
- Provide both standalone and PRP-compatible versions
- Let users choose based on their setup

---

*Last Updated: January 2026*  
*PJM Scripts Version: 1.0+*  
*PRP Version: 1.0+*  
*Creation Kit: Latest (Steam)*  
*xEdit: v4.1.5+*
