# PRP Patch Creation Guide

## Complete Guide to Creating Precombines Repair Pack Patches

*Based on feeddanoob's Modern Precombines Patch Creation Tutorial*

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Key Concepts and Terminology](#key-concepts-and-terminology)
4. [Which Mods Need Patches](#which-mods-need-patches)
5. [Creation Kit Preparation](#creation-kit-preparation)
6. [ESP Patch Preparation](#esp-patch-preparation)
7. [Batch File Creation](#batch-file-creation)
8. [Precombine Generation](#precombine-generation)
9. [Previs Generation](#previs-generation)
10. [Testing and Cleanup](#testing-and-cleanup)
11. [Advanced Topics](#advanced-topics)
12. [Troubleshooting](#troubleshooting)
13. [Quick Reference](#quick-reference)

---

## Introduction

Creating PRP patches is a technical but achievable process. This guide covers the complete workflow for generating compatible precombine and previs data for mods that interact with PRP.

**Important Note:** This is an advanced topic. You should have:
- Basic xEdit knowledge
- Understanding of Fallout 4 modding
- Familiarity with command line interfaces
- Patience (generation can take 30+ minutes to hours)

### Guide Compatibility

- **Based on:** feeddanoob's Modern Precombines tutorial
- **Guide Version:** 1.6.3
- **CK Fixes:** 1.81 (1.7 and 1.8 have known issues)
- **Tested Tools:** Windows Command Prompt and PowerShell

---

## Prerequisites

### Software Requirements

**Creation Kit and Tools:**
- ✅ Fallout 4 Creation Kit (latest, from Steam or GOG)
- ✅ F4 Creation Kit Fixes version 1.81 (installed in CK folder)
- ✅ f4ck_loader 2 (launcher for CK fixes)
- ✅ Steamless (if CK downloaded from Steam - for DRM removal)

**Mod Tools:**
- ✅ xEdit x86 version (32-bit, avoids floating point errors in x64)
- ✅ Pra's FO4Edit Scripts (for asset collection)
- ✅ PRP and/or PPF.esm (current stable version)
- ✅ SeargeDP's xEdit scripts (optional, recommended)
- ✅ Archive2 (for packing meshes into BA2)

**System Requirements:**
- ✅ RAM: 16GB minimum (32-64GB recommended)
- ✅ Disk space: 20-30GB free (for generation files)
- ✅ Page file/swap: Set to 8-16GB (if RAM <32GB)
- ✅ SSD recommended (faster generation)

**Knowledge Requirements:**
- ✅ Command line interface (Windows Command Prompt or PowerShell)
- ✅ xEdit navigation and filtering
- ✅ Batch file creation (optional but recommended)
- ✅ Understanding of Fallout 4 record structure

### Important: MO2 vs Manual Installation

**⚠️ Critical:** Do NOT use Mod Organizer 2 with the clean method

**Why MO2 Doesn't Work:**
- USVFS (virtual file system) causes flickering in generated precombines
- feeddanoob discovered this during Xander's Aid patch creation
- Manual installation to Fallout 4/Data folder works correctly

**Solution:** Always place mods directly in `Fallout 4\Data\` folder for generation

**Vortex:** Not covered in this guide - use at your own risk

---

## Key Concepts and Terminology

### Critical Terminology Distinction

**CELL (All Caps):** Refers to both types of cells
- Interior cells (interior locations)
- Exterior worldspace cells (outdoor areas)
- In xEdit: Record type "CELL" or "WRLD"

**Cell (One Cap):** Refers to interior cells only
- Interior locations like Vaults, buildings, dungeons
- In xEdit: Left-hand tree view category
- Does NOT include worldspace/exterior

**Example:**
```
PRP patch needs to handle:
- CELL records (interior): Vaults, Dungeons, Buildings
- CELL records (worldspace): Outdoor areas, settlements
- Combined = CELL vs Cell terminology

When guide says "remove CELL records"
→ Means both interior and exterior cells
```

### Understanding Precombines

**Precombines:** Pre-combined meshes
- Multiple objects merged into single mesh
- Located: `Meshes/Precombined/`
- Each CELL record references precombined mesh data
- Reduce draw calls, improve performance

**Shared Geometry (PSG/CSG Files):**
- Combined geometry data from multiple precombines
- `.psg` = Precombined Shared Geometry (uncompressed)
- `.csg` = Compressed Shared Geometry (compressed)
- Can only have one per patch

**References:**
- Individual objects placed in cells
- PRP patches must include reference data
- Combined with precombine meshes

### Understanding Previs

**Previs:** Precombined visibility
- Occlusion/culling information for cells
- Tells game what's visible from where
- Improves performance by hiding non-visible objects
- Located: `VIS/` folder

**Generation Process:**
- Creation Kit analyzes cell geometry
- Determines visibility from all vantage points
- Generates UVD files (visibility data)
- Creates comprehensive occlusion database

---

## Which Mods Need Patches

### Determining Patch Requirements

**Type 1: Mods Touching Precombined References**

These DEFINITELY need patches:

```
How to identify:
1. Open xEdit with mod loaded
2. Select plugin
3. Press Ctrl+H (or Tools → Other → Precombine)
4. Filter shows "XCRI" (Combined References)
5. If results found → PATCH NEEDED

Examples:
- Settlement mods (move objects in cells)
- Location mods (add/remove objects)
- Quest mods modifying cell contents
```

**Type 2: Mods with Own Precombine Files**

May need patches:

```
How to identify:
1. Extract mod or open archive
2. Check for: Meshes/Precombined/ folder
3. Or check for: VIS/ folder

If found:
- These precombines might conflict with PRP
- Might need regeneration with PRP
- Might just work as-is (test first)

If generating own precombines:
- Apply "Apply Material Swap.pas" script
- Verify compatibility with PRP
```

**Type 3: Mods Replacing Meshes**

May need patches if affecting precombined objects:

```
How to identify:
1. Open xEdit with mod
2. Search for mesh files (.nif) in records
3. Check if replaced meshes are in precombined areas
4. Look for MODL (static model) changes

If precombine area meshes changed:
- Might need SCOL regeneration
- Might need full precombine regeneration
- Always test first

Exceptions:
- Texture replacements: Never need patches
- LOD models: Usually don't need patches (unconfirmed)
```

### Examples of Mods Needing Patches

**Always Need Patches:**
- Nuka World expansion mods
- Commonwealth Restoration Project
- Overgrowth (The Black Pearl)
- Settlement expansion mods
- Fusion City Rising
- Hookers of the Commonwealth
- Outcast and Remnants
- Xander's Aid
- Four Ville
- TFTC (mod name)
- Sim Settlements 2 (has PRP patch)

**May Need Patches:**
- Quest mods modifying cells
- Location mods with new worldspaces
- ENB/weather mods affecting visibility
- Any mod with custom precombines

**Don't Need Patches:**
- Pure gameplay mods (magic, perks, etc.)
- UI mods
- Animation mods
- Sound mods
- Pure texture replacements
- Pure mesh replacements in non-precombine areas

---

## Creation Kit Preparation

### Understanding the Problem

**Steam DRM Issue:**
- Bethesda migrated CK to Steam in 2023
- Steam version has DRM/stub protection
- Binary is encrypted/protected
- Hex edits from Manual don't work on Steam version
- Need to remove DRM first

### Step 1: Remove Steam DRM with Steamless

**What Steamless Does:**
- Removes Steam's DRM wrapper
- Extracts clean executable
- Allows hex edits to work

**Process:**

```
Step 1: Download Steamless
- Get from: GitHub (search "Steamless")
- Extract to any folder
- Run Steamless.exe

Step 2: Configure Steamless
- App Path: C:\Program Files (x86)\Steam\steamapps\common\Fallout 4 Creation Kit\CreationKit.exe
- Output directory: (same folder or custom)
- Click "Unpack"
- Wait for completion

Step 3: Replace Creation Kit
- Backup original: CreationKit.exe → CreationKit.exe.bak
- Copy unpacked exe: creationkit_unpacked.exe
- Rename to: CreationKit.exe
- Now hex edits will work

Step 4: Verify
- Open Creation Kit
- Should load without Steam interface
```

### Step 2: Install CK Fixes

**What CK Fixes Does:**
- Adds command-line arguments for generation
- Fixes CK bugs and crashes
- Enables batch generation
- Critical for patch generation

**Installation:**

```
Step 1: Download F4 Creation Kit Fixes
- Version: 1.81 (required, 1.7 and 1.8 have issues)
- From: GitHub or Nexus

Step 2: Extract to Creation Kit folder
- Location: C:\Program Files (x86)\Steam\steamapps\common\Fallout 4 Creation Kit\
- Extract all files to this folder
- Overwrites CreationKit.exe with patched version

Step 3: Verify Installation
- Check for: d3dcompiler_47.dll in CK folder
- Check for: f4ck_loader.exe in CK folder
- Both should be present after extraction
```

### Step 3: Apply Hex Edits from Manual

**If You Haven't Already:**

The Manual at [reference needed] describes hex edits required. These are version-specific offsets in the Creation Kit executable.

**Note:** If using f4ck_loader properly, hex edits may not be necessary. Test without first.

### Step 4: Verify CK Works

**Test Launch:**

```
Command Prompt Test:
cd "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4 Creation Kit"
f4ck_loader.exe

Expected: Creation Kit opens without Steam DRM interface
```

---

## ESP Patch Preparation

### Step 1: Create Base ESP File

**In xEdit:**

```
1. Open xEdit with these files ONLY:
   - Fallout4.esm
   - DLCRobot.esm
   - DLCCoast.esm
   - DLCNukaWorld.esm
   - Fallout4.esl (if Anniversary Edition)
   - UFO4P.esp (if using)
   - PRP.esp
   - [YourMod].esp (the mod being patched)

2. Load order: Masters first, then mod, then PRP
   (Load order doesn't affect deep copying)

3. Locate mod's CELL and WRLD records:
   - Expand [YourMod].esp
   - Find: CELL entries
   - Find: WRLD entries

4. Select all CELL records:
   - Ctrl+Click to multi-select
   - Or Shift+Click for range

5. Right-click → Copy as Override Into...
   - Create new file
   - Name: [YourMod]_PRP_Patch.esp
   - Select "Create new"

6. Repeat for WRLD records:
   - Select all WRLD entries
   - Copy as override into same patch file
```

**Result:** New patch file with all CELL and WRLD records from original mod

### Step 2: Apply Material Swap Script

**What This Does:**
- Fixes material/shader issues
- Ensures compatibility with modern rendering
- Must be done before further processing

**Process:**

```
1. Download: Apply Material Swap.pas
   - From: GitHub xEdit scripts
   - Place in: [xEdit]\Edit Scripts\

2. In xEdit:
   - Load patch file as master
   - Click on patch plugin in left tree
   - Scripting → Run Script
   - Select: Apply Material Swap.pas
   - Click OK

3. Wait for completion:
   - Can take several minutes
   - Messages appear in script output
   - Completion message confirms success

4. Verify results:
   - Check for error messages
   - Patch should still load in xEdit
   - No changes to CELL/WRLD structure visible
```

### Step 3: Add All Master Files

**Critical Step:** This prevents XPRI errors during generation

**Process:**

```
1. In xEdit with patch loaded:
   - Right-click patch file header
   - Select "Edit"
   - Click "Masters" button

2. Add masters in this order:
   - Fallout4.esm
   - DLCRobot.esm
   - DLCCoast.esm
   - DLCNukaWorld.esm
   - Fallout4.esl (if AE)
   - UFO4P.esp (if using)
   - PRP.esp
   - [YourMod].esp (original mod)
   - [Any dependencies of YourMod]

3. Order matters: Masters in dependency order
   - Don't reorder existing
   - Add new at end
   - Verify all present

4. Click OK to save
```

**Why This Matters:**
```
Without proper masters:
→ XPRI errors appear
→ Precombine generation fails
→ Have to start over

With proper masters:
→ CK can find all references
→ XPRI errors resolve
→ Generation proceeds
```

### Step 4: Remove Navmeshes

**Why Remove:**
- Navmeshes don't belong in patch
- CK might adjust unknown parameters
- Cleaner patch without them
- Previs generation handles navmesh separately

**Process:**

```
1. In xEdit:
   - Click on patch file (select it)
   - Ctrl+H (Tools → Other → Precombine)
   - Filter shows: All records matching "navmesh"

2. Select all navmesh entries:
   - Ctrl+A in filter results
   - All navmesh entries selected

3. Delete:
   - Right-click → Delete
   - Confirm deletion

4. Verify:
   - Filter should now show nothing
   - Close filter (Escape)
   - Patch still has CELL/WRLD records
   - But no navmesh entries
```

**Exception:** Mods creating worldspaces

```
If mod creates its own worldspace:
- Some records might contain ONLY navmeshes
- Keep these records (used for previs)
- Only remove standalone navmesh entries
- Example: Xander's Aid has worldspace records with navmeshes only
```

### Step 5: Create Intentional ITM (If Needed)

**What This Does:**
- Ensures CELL/WRLD records have subrecords
- Prevents CK errors during generation
- Creates placeholder if no content exists

**When Needed:**

```
Check each CELL/WRLD record:
1. Click on record
2. Look at subrecords on right side
3. If ZERO subrecords shown:
   - Record is "empty"
   - Needs intentional ITM

How to create ITM:
1. Right-click CELL/WRLD record
2. "Add"
3. Select: "Temporary References" (or similar)
4. Add one entry
5. Later, CK will populate this during generation
```

**Purpose:**
- PCMB (Precombined Timestamps) require content
- XCRI (Combined References) require content
- Empty records cause CK to skip cell
- Intentional ITM provides anchor for data

### Step 6: Update Version Control Info

**Two Methods Available:**

#### Method 1: Save in Creation Kit (Slower)

```
1. Open Creation Kit (f4ck_loader.exe)
2. File → Open
3. Select patch plugin
4. Wait for all references to load
5. File → Save
6. Close Creation Kit
7. Open patch in xEdit
8. Check for any errors
```

**Time:** 5-30 minutes depending on mod size

#### Method 2: xEdit Script (Faster - Recommended)

```
1. In xEdit:
   - Download script: Update Version Control Info.pas
   - Place in: [xEdit]\Edit Scripts\

2. Load patch file
3. Click on patch in left tree
4. Scripting → Run Script
5. Select: Update Version Control Info.pas
6. Click OK
7. Wait for completion

8. Verify in xEdit:
   - Look for script completion message
   - Check for errors (Ctrl+E)
   - Exclude "Form Version" errors (normal)
```

**Time:** 1-5 minutes

**Recommended:** Use xEdit script method - much faster

### Step 7: Error Check

**Before Proceeding:**

```
In xEdit with patch loaded:
1. Press Ctrl+E (Validity Check)
2. Look for errors
3. Ignore: Form Version errors (expected)
4. Ignore: XPRI errors if in parent mod (note from feeddanoob)

For each error found:
- Note which CELL/WRLD affected
- May need special handling during generation
- Or may need to exclude from generation

If many errors:
- Might indicate problem in Preparation step
- Review master files added
- Verify Material Swap applied correctly
- May need to restart preparation
```

### Step 8: Backup Patch File

**Before Precombine Generation:**

```
Important: Backup patch file now
1. Copy patch file to safe location
2. Name: [YourMod]_PRP_Patch_BACKUP.esp
3. Keep on safe drive or cloud storage

Why backup:
- Generation modifies patch in-place
- If generation fails, patch corrupted
- Backup allows restart without re-preparing
- Saves hours of work if CK crashes
```

---

## Batch File Creation

### Why Use Batch Files?

**Benefits:**
- Simplifies command-line arguments
- Easy to re-run if CK crashes
- Multiple patches manageable
- Consistent parameters
- Can queue multiple operations

**Optional But Recommended**

### Creating Batch Files

**Batch File 1: Precombine Generation**

```batch
@echo off
REM Precombine Generation Batch File
REM Replace [pluginname] with your patch filename (without .esp)

f4ck_loader.exe -GeneratePrecombined:[pluginname].esp clean all
pause
```

**Save as:** `GenPrecombine.bat`

**Usage:**
```
1. Place in Fallout 4 root folder (where .exe is)
2. Edit file, replace [pluginname] with actual name
3. Example: f4ck_loader.exe -GeneratePrecombined:YourMod_PRP_Patch.esp clean all
4. Save file
5. Double-click to run
6. Creation Kit opens and processes
7. Closes automatically when done
```

**Batch File 2: PSG Compression**

```batch
@echo off
REM PSG Compression Batch File
REM Compresses .psg to .csg

f4ck_loader.exe -CompressPSG:[pluginname].esp
pause
```

**Save as:** `CompressPSG.bat`

**Batch File 3: Build Cell Index**

```batch
@echo off
REM Cell Index Generation Batch File
REM Creates .CDX file needed for previs generation

f4ck_loader.exe -BuildCDX:[pluginname].esp
pause
```

**Save as:** `BuildCDX.bat`

**Batch File 4: Previs Generation**

```batch
@echo off
REM Previs Generation Batch File
REM Most time-intensive step

f4ck_loader.exe -GeneratePreVisData:[pluginname].esp clean all
pause
```

**Save as:** `GenPrevis.bat`

### Using PowerShell Instead

**If You Prefer PowerShell:**

```powershell
# Precombine Generation
.\f4ck_loader.exe -GeneratePrecombined:pluginname.esp clean all

# PSG Compression
.\f4ck_loader.exe -CompressPSG:pluginname.esp

# Build CDX
.\f4ck_loader.exe -BuildCDX:pluginname.esp

# Previs Generation
.\f4ck_loader.exe -GeneratePreVisData:pluginname.esp clean all
```

### Manual Alternative (No Batch Files)

**Command Prompt:**

```
cd "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4 Creation Kit"
f4ck_loader.exe -GeneratePrecombined:YourMod_PRP_Patch.esp clean all
```

---

## Precombine Generation

### Precombine Generation - Part A: Initial Generation

**Preparation:**

```
1. Place all required mods in Fallout 4\Data\:
   - PRP.esp
   - UFO4P.esp (if using)
   - [YourMod].esp (original mod being patched)
   - Patch plugin: [YourMod]_PRP_Patch.esp
   - All dependencies
   - All .ba2 files if using modded content

2. If mods use loose files:
   - Pack into BA2 first (recommended)
   - Loose files slow down generation
   - More than 8,192 loose precombines may fail

3. Delete any previous generation files:
   - Delete existing Meshes/Precombined/ folder
   - Delete existing .psg files
   - Delete existing CombinedObjects.esp
   - Clean slate for generation
```

**Running Generation:**

```
Using batch file:
1. Place GenPrecombine.bat in CK root folder
2. Edit to use correct plugin name
3. Double-click batch file
4. Creation Kit opens

Using command prompt:
cd "Fallout 4 root"
f4ck_loader.exe -GeneratePrecombined:YourMod_PRP_Patch.esp clean all

Using PowerShell:
.\f4ck_loader.exe -GeneratePrecombined:YourMod_PRP_Patch.esp clean all

Expected behavior:
- CK opens
- Shows progress (may be silent)
- Takes 5-30 minutes
- CK closes automatically when done

Expected output files:
- Meshes/Precombined/ (new folder with meshes)
- Meshes/Precombined/YourMod_PRP_Patch.ba2 (BA2 file if enabled)
- YourMod_PRP_Patch.psg (Shared geometry, uncompressed)
- CombinedObjects.esp (Data plugin to merge)
```

### Possible Errors During Precombine Generation

#### Error: Exception 0xc0000005 (CK Crash)

**What This Is:** Access violation error - CK crashed

**Causes:**
- Specific problematic meshes in mod
- Conflicting geometry
- Memory issues
- Bad precombine setup

**Known Problem Mods:**
- Fusion City Rising
- Hookers of the Commonwealth
- Outcast and Remnants

**Solution:**

```
Step 1: Identify problematic CELL
- Check CK crash logs
- Note which cell it crashes on
- Look for patterns (all outdoor? all interior?)

Step 2: Remove CELL from patch
- Open patch in xEdit
- Find problematic CELL record
- Delete it from patch
- Save patch

Step 3: Retry generation
- Run generation batch file again
- Should proceed past previous crash point
- May crash on new cell (repeat steps)

Step 4: Document for community
- Create pull request on GitHub
- List cells that cause crashes
- Include: Mod name, cell references
- Helps others avoid same issue

Workaround for mod:
- If too many cells crash: Don't patch this mod
- Use alternative mod
- Or request patch from community
```

#### Error: PSG File is 0 KB

**What This Means:** Generation completed but created empty shared geometry file

**Cause:** Likely typo in command

**Solution:**

```
1. Check batch file/command:
   - Verify plugin name spelled correctly
   - Verify file actually exists
   - Case-sensitive check

2. Check file location:
   - Plugin must be in Fallout 4\Data\
   - Not in subfolder
   - Not on different drive

3. Re-run generation:
   - Fix spelling/location
   - Re-run batch file
   - Should create proper PSG file
```

#### Error: CK Crashes With No Output Files

**What This Means:** Generation failed without creating any output

**Causes:**
- Plugin not in correct location
- Missing master files
- Corrupted plugin
- Severe mod conflict

**Solution:**

```
1. Verify patch file integrity:
   - Open in xEdit
   - Check for errors (Ctrl+E)
   - Fix any major issues
   - Save patch

2. Verify file location:
   - Double-check Data folder
   - List files: dir Data | findstr .esp
   - Should see patch file

3. Try manual command:
   - Use cmd.exe
   - Type command manually
   - See actual error message
   - Error message shows real problem

4. Increase logging:
   - Check Creation Kit logs
   - Usually in Documents\My Games\Fallout 4 Creation Kit\
   - CreationKitPlatform.log file
   - Review for actual error
```

### Precombine Generation - Part B: Merging CombinedObjects

**What This Does:**
- CK created CombinedObjects.esp
- Contains merged precombine geometry data
- Must be merged into patch file
- Two methods available

#### Method 1: Using SeargeDP's Merge Script (Faster - Recommended)

```
Setup:
1. Download: 03_MergeCombinedObjects.pas
2. Place in: [xEdit]\Edit Scripts\
3. Restart xEdit if open

Process:
1. Open xEdit with:
   - All masters
   - Patch plugin (with generated precombines)
   - CombinedObjects.esp

2. Click on patch plugin in left tree

3. Scripting → Run Script
   → Select: 03_MergeCombinedObjects.pas

4. Script output:
   - "Merging CombinedObjects into patch"
   - "Complete" message
   - Takes 5-15 minutes

5. Verify results:
   - Patch now has merged data
   - Check for errors (Ctrl+E)
   - Exclude expected errors
```

**Time:** 5-15 minutes

#### Method 2: Manual CK Merge (Slower)

```
Step 1: Set CombinedObjects as Active
1. Open Creation Kit
2. File → Open
3. Select: CombinedObjects.esp
4. Click OK
5. Wait for all references to load
6. May take 10-30 minutes

Step 2: Save Plugin
1. File → Save
2. Wait for completion
3. File → Exit

Step 3: Merge in xEdit
1. Open xEdit with all required plugins
2. Load CombinedObjects.esp
3. Click on CombinedObjects.esp
4. Scripting → Run Script
   → Merge overrides into master.pas
5. Select target: Patch plugin
6. Click OK
7. Wait for merge completion

Step 4: Cleanup
1. Save xEdit
2. Delete original CombinedObjects.esp
```

**Time:** 30-60 minutes total

### Precombine Generation - Part C: Compress and Package

**Step 1: Pack Meshes into BA2 Archive**

**Why Pack:**
- Loose files: Limit ~8,192 precombines
- Some systems: 32,000 precombines max
- Packing allows all meshes to be used
- Archives faster to load than loose files

**Using Archive2:**

```
Step 1: Download Archive2
- Get from: Nexus Mods
- Extract to any folder

Step 2: Configure Archive2
- Open Archive2.exe
- Create new archive
- Name: YourMod_PRP_Patch.ba2
- Data folder: Meshes
- Choose format: "General Assets" or "Textures & Meshes"
  (Use appropriate for your content)

Step 3: Set Compression
- Compression: NONE (important!)
- Leave other settings default

Step 4: Add Precombined Folder
1. Browse to: Meshes/Precombined/ (newly generated)
2. Drag entire folder into Archive2
3. Or use file browser in Archive2
4. Select all files
5. Click "Pack"

Step 5: Wait for Completion
- Archive2 may freeze while processing
- DON'T CLOSE - it's still working
- Wait until progress bar completes
- May take 30+ minutes if many files
- Creates: YourMod_PRP_Patch.ba2

Step 6: Verify Archive
- Check file size (should be 500MB+)
- Open in xEdit (Tools → Render Window)
- Verify meshes load correctly
```

**Alternative: Command Line Packing**

```
Archive2.exe -create YourMod_PRP_Patch.ba2 Meshes/Precombined/ -nocompress
```

**Step 2: Delete Loose Precombined Files**

```
After BA2 created successfully:
1. Navigate to: Meshes/Precombined/
2. Delete all loose .nif files
3. Keep only the BA2 archive
4. Reason: Limit loose file count
```

**Step 3: Compress Shared Geometry File**

**What This Does:**
- .psg file (precombined shared geometry) is large
- Compression reduces size 50%+
- .csg file (compressed) replaces .psg
- Needed for game to load efficiently

**Using Batch File:**

```
Place CompressPSG.bat in CK root folder
Edit to use correct plugin name
Double-click to run

f4ck_loader.exe -CompressPSG:YourMod_PRP_Patch.esp
```

**Using Command Prompt:**

```
cd "Fallout 4 root folder"
f4ck_loader.exe -CompressPSG:YourMod_PRP_Patch.esp

Expected output:
- Creates: YourMod_PRP_Patch.csg
- Compression completes quickly (5 seconds - 1 minute)
```

**Verify Compression:**

```
Check files:
1. Navigate to Fallout 4 root
2. Should see: YourMod_PRP_Patch.csg (new, smaller file)
3. Old YourMod_PRP_Patch.psg can be deleted
4. Keep CSG, delete PSG (optional, PSG will be regenerated)
```

---

## Previs Generation

### Previs Generation - Part A: Build Cell Index

**What This Does:**
- Creates .CDX file (cell index)
- Needed before previs generation
- Maps all cells for visibility calculation
- Quick operation (1-5 minutes)

**Using Batch File:**

```
Place BuildCDX.bat in CK root folder
Edit to use correct plugin name
Double-click to run

f4ck_loader.exe -BuildCDX:YourMod_PRP_Patch.esp
```

**Using Command Prompt:**

```
cd "Fallout 4 root folder"
f4ck_loader.exe -BuildCDX:YourMod_PRP_Patch.esp
```

**Expected Output:**
```
File created: YourMod_PRP_Patch.cdx
Location: Fallout 4 root folder
Completion: Quick (under 5 minutes)
```

**What CDX Contains:**
```
Cell Dependency Index:
- All CELL/WRLD records indexed
- Location data
- Size information
- Dependency mapping
- Used by previs generator
```

---

### Previs Generation - Part B: Generate Previs Data

**⚠️ CRITICAL:** This is the most resource-intensive step

**What It Does:**
- Analyzes 3D geometry in each cell
- Calculates visibility from all points
- Generates occlusion culling data
- Creates VIS files for game
- Takes 30 minutes to HOURS

**System Requirements:**

```
Memory:
- 16GB RAM: Possible but tight, may need page file
- 32GB RAM: Comfortable, will likely complete
- 64GB RAM: No issues, fastest generation

If <16GB RAM:
- Temporary move texture archives elsewhere:
  - Go to: Data/
  - Move BA2 files to external drive temporarily
  - Reduces memory load during previs
  - Move back after generation completes
  - Slower but allows generation to complete

Page File/Swap:
- Minimum 8GB set (even with 16GB RAM)
- If generation crashes mid-way: Increase to 16GB
- Very slow but allows retry without restarting
- Tutorial on setting page file: (search online)
```

**Preparation:**

```
Before running previs generation:

1. Verify precombine files packed:
   - Check: Meshes/Precombined/ is archive ONLY
   - No loose .nif files should remain
   - If loose files exist: Pack them first
   - (Loose file limit ~8,192 causes previs failures)

2. Verify CSG file exists:
   - Check: YourMod_PRP_Patch.csg present
   - If not: Run PSG compression first
   - Previs needs CSG, not PSG

3. Verify CDX file exists:
   - Check: YourMod_PRP_Patch.cdx present
   - If not: Run BuildCDX first

4. Verify all mods in Data folder:
   - Don't use MO2 for previs generation
   - Place all mods directly in Data/
   - Verify PRP.esp present
   - Verify patch plugin present

5. Close all other programs:
   - Maximize available RAM
   - Close web browsers
   - Close xEdit
   - Close mod managers
   - Close any RAM-heavy applications
```

**Running Previs Generation:**

```
Using Batch File:
1. Place GenPrevis.bat in CK root folder
2. Edit to use correct plugin name
3. Double-click batch file
4. Creation Kit opens

Using Command Prompt:
cd "Fallout 4 root folder"
f4ck_loader.exe -GeneratePreVisData:YourMod_PRP_Patch.esp clean all

Using PowerShell:
.\f4ck_loader.exe -GeneratePreVisData:YourMod_PRP_Patch.esp clean all

Expected behavior:
- CK opens
- May show progress or be silent
- Takes 30 minutes to 6+ hours depending on mod size
- CK closes automatically when done

Output files:
- VIS/ folder created (visibility data files)
- Vis file structure:
  - VIS/[CellID].uvd files (one per cell)
- PreVis.esp created (merge target)
- PreVis.csg created (compressed visibility data)
```

**Waiting During Generation:**

```
Do NOT:
- Close Creation Kit window
- Touch keyboard/mouse during process
- Restart computer
- Turn off power
- Let computer sleep
- These will interrupt generation

Do:
- Let process run uninterrupted
- Monitor system health (temp, RAM)
- Use external computer/phone
- Be patient - this takes a while
- Rejoice when it completes!
```

### Previs Generation - Part B Information: Memory and Timing

**Realistic Timing:**

```
Small mod (100 cells): 30 minutes
Medium mod (500 cells): 1-2 hours
Large mod (1000+ cells): 2-4 hours
Very large mod (5000+ cells): 4-8+ hours

Example mods:
- Nuka World addon: 30 mins
- Xander's Aid: 1-2 hours
- Fusion City Rising: 2-3 hours
- Commonwealth Restoration (full): 4-6 hours
```

**Memory Usage During Generation:**

```
CK process monitoring:
- Start: 1-2GB
- Mid-generation: 4-8GB (rising)
- Peak: 8-14GB (if 16GB system)
- If peak >RAM available: Uses page file (very slow)

16GB System:
- Comfortable until ~1000 cells
- May slow down on large mods
- Usually completes without crash

32GB System:
- Handles large mods easily
- Peak usage: 12-16GB
- Good margin for safety

64GB System:
- Peak usage: 20-30GB
- No issues with any mod
- Fastest generation times
```

**If Memory Issues Occur:**

```
Problem: CK crashes during previs generation
Error: "Out of Memory" or similar

Solution A: Add page file
1. Increase Windows page file to 16-32GB
2. Retry generation
3. Much slower but might work
4. Reduce other RAM usage first

Solution B: Move texture archives
1. Locate: Data/*.ba2 (texture files)
2. Move to external drive temporarily
3. Retry previs generation
4. This frees 5-10GB RAM
5. Move back after generation completes

Solution C: Exclude problematic cells
1. See troubleshooting section
2. Remove cells causing memory issues
3. Patch without those cells
4. Patch won't affect those areas
```

### Possible Errors During Previs Generation

#### Error: CK Crashes With Memory Error

**Cause:** Ran out of available RAM/page file

**Solutions:**

```
Solution 1: Add page file
1. Settings → System → Advanced System Settings
2. Performance → Settings
3. Advanced tab
4. Virtual Memory → Change
5. Set to 16GB (or max of 50% RAM)
6. Retry generation

Solution 2: Move texture archives (recommended)
1. Go to: Fallout 4\Data\
2. Move all .ba2 files to external drive
3. Leave only: Fallout4 - Textures.ba2 or similar
4. Keep mod essentials
5. Retry previs generation
6. Move back when done

Solution 3: Upgrade RAM
- Best long-term solution
- 32GB very affordable
- Solves most generation issues
```

#### Error: CK Crashes on Specific Cell

**Cause:** Problematic mesh in cell

**Known Problematic Mods/Cells:**

```
Fusion City Rising:
- Cells causing crashes: [documented in issues]
- Solution: Exclude from patch

Hookers of the Commonwealth:
- Cells causing crashes: [documented in issues]
- Solution: Exclude from patch

Outcast and Remnants:
- Cells causing crashes: [documented in issues]
- Solution: Exclude from patch
```

**Solution:**

```
Step 1: Identify crash point
1. Check CK logs: Documents\My Games\Fallout 4 Creation Kit\
2. CreationKitPlatform.log shows crash location
3. Note cell reference (e.g., "0001AB2C")
4. Find corresponding CELL record

Step 2: Remove problematic cell
1. Open patch in xEdit
2. Find CELL record by ID
3. Right-click → Delete
4. Save patch
5. Don't re-run precombine gen (already generated)
6. Retry previs generation

Step 3: Report for community
1. Create GitHub issue
2. Include: Mod name, cell ID, error
3. Helps others avoid same issue
4. Share solution if found

Step 4: Test
1. Generate previs without problematic cell
2. Load in game
3. Test that area (won't have precombines)
4. But no flickering/crashes
```

#### Error: Generated Precombine Meshes Not Packed

**Cause:** Loose mesh files weren't archived before previs

**Effect:** Previs generation fails, trying to process too many loose files

**Solution:**

```
1. Stop previs generation (if still running)
2. Pack Meshes/Precombined/ into BA2 (see Part C)
3. Delete loose .nif files
4. Delete existing VIS folder (if created)
5. Retry previs generation
```

#### Error: Missing Meshes During Previs

**Cause:** Asset paths broken or files missing

**Solution:**

```
1. Run Assets Manager script in xEdit
2. Script → Run Script → Assets Manager
3. Select option: "Check for missing assets"
4. Run on patch plugin
5. Reports missing files
6. Action: 
   a) Add missing files to mod
   b) Remove references to missing files
   c) Request missing files from mod author
7. Retry previs generation
```

### Previs Generation - Part C: Merge PreVis Data

**What This Does:**
- CK created PreVis.esp
- Contains merged previs/visibility data
- Must be merged into patch file
- Two methods available (similar to precombine)

#### Method 1: Using SeargeDP's Merge Script (Faster - Recommended)

```
Setup:
1. Download: 05_MergePrevis.pas
2. Place in: [xEdit]\Edit Scripts\
3. Restart xEdit if open

Process:
1. Open xEdit with all files loaded
2. Click on patch plugin
3. Scripting → Run Script
4. Select: 05_MergePrevis.pas
5. Wait for completion (5-30 minutes)
6. Patch now contains previs data
```

#### Method 2: Manual CK Merge (Slower)

```
Step 1: Load PreVis in CK
1. Open Creation Kit
2. File → Open
3. Select: PreVis.esp
4. Wait for load
5. File → Save
6. Close CK

Step 2: Merge in xEdit
1. Open xEdit with all plugins
2. Click on PreVis.esp
3. Scripting → Run Script
4. Select: Merge overrides into master.pas
5. Target: Patch plugin
6. Click OK
7. Wait for merge

Step 3: Cleanup
1. Can delete PreVis.esp
2. Patch now has previs data
```

### Previs Generation - Part D: Clean Up VIS Files

**What This Does:**
- Removes unnecessary VIS files
- Keeps only files actually used
- Reduces patch size
- Improves loading efficiency

**Why This Step:**

```
Problem: Previs generation creates extra UVD files
- CK marks every cell as center of 3x3 grid
- Generates UVD for entire grid around each cell
- Results in many unnecessary files
- Bloats patch size

Solution: Clean assets with Collect Assets script
- Identifies actually-used VIS files
- Archives only necessary files
- Reduces patch size
- Improves load times
```

**Process - Using Collect Assets Script:**

```
Step 1: Run script
1. In xEdit with patch loaded
2. Click on patch plugin
3. Scripting → Run Script
4. Select: Collect Assets.pas
5. Click OK

Step 2: Configure dialog
1. Dialog appears: "Collect Assets"
2. Format: Leave as default
3. Include Meshes: Check
4. Include Textures: Check (if applicable)
5. Include VIS: CHECK (important for previs)
6. Include Sounds: Check (if applicable)
7. Click OK

Step 3: Verification dialog
1. Second dialog: Shows what will be packed
2. Lists all files to include
3. Review to verify
4. If looks correct: Click OK
5. If wrong: Click Cancel and reconfigure

Step 4: Wait for completion
1. Script creates archive
2. Location: [xEdit folder]/asset-collector-output/
3. Archive name: Based on patch name
4. May take 5-30 minutes

Step 5: Move archive
1. Navigate to: asset-collector-output/
2. Find created archive
3. Move to: Fallout 4\Data\
4. Should now have .ba2 file in Data folder
5. Contains: Only necessary VIS files

Step 6: Save patch in xEdit
1. Don't close xEdit
2. File → Save
3. Patch saved with cleaned data
```

**Why Don't Delete Original VIS Folder:**

```
Original VIS folder location: Fallout 4\VIS\
This is for CK internal use
Game reads from packed BA2 archive in Data folder
Original VIS folder can be left or deleted (won't matter)
```

---

## Testing and Cleanup

### Step 1: Error Check in xEdit

**Before Testing in Game:**

```
1. Open patch in xEdit
2. Press Ctrl+E (Validity Check)
3. Look for errors
4. Types of errors to ignore:
   - "Form Version" errors (normal)
   - "XPRI errors" if in parent mod
5. Other errors: Investigate and fix
6. If major errors: Patch may not work
```

### Step 2: Clean Patch Plugin

**Remove Dirty Records:**

```
While patch is all ITM (Identical To Master):
- Programs like LOOT flag as "dirty"
- Best practice: Clean before release
- Two methods available:

Method 1: xEdit QAC (Simple)
1. In xEdit with patch loaded
2. File → Quick Auto Clean
3. Removes ITM records
4. Creates: [pluginname].backup
5. Clean plugin ready to use

Method 2: Manual Cleaning
1. Filter → Show only errors
2. For each ITM: Delete it
3. More control but slower
4. Only clean what you want
```

### Step 3: Test in Game

**Verification:**

```
Step 1: Install patch
1. Place patch file in Fallout 4\Data\
2. Place supporting files:
   - Meshes/Precombined/ (or .ba2)
   - VIS/ (or .ba2)
   - YourMod_PRP_Patch.csg
   - YourMod_PRP_Patch.cdx
3. Load mod in launcher

Step 2: Select test locations
1. Choose 3-5 key locations from mod
2. Areas with dense buildings
3. Outdoor settlement areas
4. Interior locations
5. Mix of terrain types

Step 3: Test for preculling issues
1. Load game
2. Go to each location
3. Look for:
   - Flickering objects
   - Missing objects that should be visible
   - Objects visible that should be hidden
   - Out-of-place shadows

Step 4: Check performance
1. Frame rate stable?
2. No stuttering?
3. Smooth transitions?
4. Consistent frame times?

Step 5: Play normally
1. Spend 1-2 hours in patched areas
2. Look for issues
3. Note any problems found
4. See troubleshooting section for fixes
```

**Common Issues Found:**

```
Issue 1: Flickering objects
- Likely: Load order problem
- Or: Precombine generation issue
- Solution: See troubleshooting

Issue 2: Missing objects
- Likely: Asset missing
- Or: Reference removal issue
- Solution: Rebuild specific cell

Issue 3: Performance degradation
- Unexpected if precombines generated correctly
- Possible: Previs miscalculation
- Solution: Re-generate previs

Issue 4: Crashes when entering cells
- Likely: Mesh issue in cell
- Solution: Exclude that cell from patch
```

### Step 4: Fix Preculling Issues (if found)

**Preculling Issue:** Objects visible that shouldn't be, or hidden that should be visible

**Diagnosis:**

```
Document exactly:
1. Which location has issue
2. Which objects affected
3. From which vantage point visible/not visible
4. Is it consistent?

If only in specific location:
- Might be generation issue in that cell
- Might be reference placement issue
- Might be precombine generation error
```

**Potential Fixes:**

```
Option 1: Exclude cell from patch
1. Remove CELL record from patch
2. Regenerate precombines (just that cell)
3. Retry testing

Option 2: Regenerate just that cell
1. Document cell ID
2. Remove other cells temporarily
3. Regenerate with only that cell
4. Test
5. If works: Replace in full patch

Option 3: Wait for guide update
- feeddanoob has TBD guide for fixing preculling
- Currently no workaround provided
- May require mesh-level fixes
- Can be released "as-is" with known issue
```

---

## Advanced Topics

### Creating Patches for Patches

**What This Means:**
- Patching a patch (e.g., PRP patch for a mod with its own patch)
- Example: MOD + MOD Patch + PRP Patch + PRP Patch for (MOD + MOD Patch)

**Status:** TBD (feeddanoob to provide in future guide)

**Complexity:** Very high

**Current Workaround:**
- Just load all patches in order
- May have conflicts (untested)
- Better to wait for feeddanoob's guide

---

## Troubleshooting

### "XPRI Errors Appear"

**Cause:** Incorrect or missing master files

**Solution:**

```
1. Check all masters are added:
   - Fallout4.esm
   - DLCRobot.esm
   - DLCCoast.esm
   - DLCNukaWorld.esm
   - Fallout4.esl (if AE)
   - UFO4P.esp
   - PRP.esp
   - Original mod
   - Any dependencies

2. Check order is correct

3. If still errors:
   - Delete all CELL/WRLD from patch
   - Restart preparation step
   - Deep copy again with correct masters
```

### "CK Keeps Crashing"

**Solutions:**

```
1. Verify hex edits applied correctly
2. Verify CK Fixes version 1.81 installed
3. Verify Steamless applied to CK
4. Try updating drivers (GPU, chipset)
5. Increase virtual memory/page file
6. Close background programs
7. Try on different computer if possible
```

### "Generation Creates Files But Plugin Broken"

**Cause:** Likely in preparation step

**Solution:**

```
1. Check patch file in xEdit:
   - Open for errors
   - Look for corruption signs
   - Compare to backup

2. Re-run preparation:
   - Delete patch file
   - Start from Step 1 of ESP Preparation
   - Deep copy CELL/WRLD again
   - Reapply Material Swap
   - Add masters carefully
   - Recreate from scratch
```

### "Patch Works But Performance Terrible"

**Cause:** Likely previs didn't generate correctly

**Solutions:**

```
1. Check previs files exist:
   - VIS folder present
   - UVD files numerous
   - .csg file created

2. Verify precombines packed:
   - Meshes should be in BA2
   - Not loose files

3. Check patch loading:
   - Load in xEdit
   - Verify no errors
   - Verify previs data present

4. Regenerate previs:
   - Delete VIS folder
   - Delete PreVis.esp
   - Delete .csg file
   - Start previs generation over
```

---

## Quick Reference

### File Naming Convention

```
Recommended naming:
[ModName]_PRP_Patch.esp

Examples:
- XandersAid_PRP_Patch.esp
- NukaWorldExpansion_PRP_Patch.esp
- CommonwealthRestoration_PRP_Patch.esp
```

### Folder Structure During Generation

```
Fallout 4\Data\
├── Fallout4.esm
├── DLC*.esm
├── UFO4P.esp
├── PRP.esp
├── [YourMod].esp
├── [YourMod]_PRP_Patch.esp
├── Meshes/
│   ├── Precombined/
│   │   └── [generated files]
│   └── [other meshes]
├── VIS/
│   └── [generated .uvd files]
└── [other folders]
```

### Command Reference

```
Precombine Generation:
f4ck_loader.exe -GeneratePrecombined:pluginname.esp clean all

PSG Compression:
f4ck_loader.exe -CompressPSG:pluginname.esp

Build CDX:
f4ck_loader.exe -BuildCDX:pluginname.esp

Previs Generation:
f4ck_loader.exe -GeneratePreVisData:pluginname.esp clean all
```

### Critical Checklist

Before starting:

```
☐ CK installed in Fallout 4 folder
☐ CK Fixes 1.81 installed in CK folder
☐ f4ck_loader.exe present in CK folder
☐ Steamless applied to CK (if Steam version)
☐ xEdit x86 version available
☐ Pra's FO4Edit Scripts installed
☐ PRP latest stable version downloaded
☐ SeargeDP's scripts downloaded (optional)
☐ Archive2 downloaded (for BA2 packing)
☐ 16GB+ RAM available
☐ 20+ GB free disk space
☐ Adequate page file (8GB minimum)
☐ All mods to patch placed in Data\
☐ Batch files prepared (optional but recommended)
```

### Step-by-Step Process Summary

```
1. Prepare CK (Steamless + Fixes)
2. Create patch ESP (deep copy CELL/WRLD)
3. Apply Material Swap script
4. Add all master files
5. Remove navmeshes
6. Update version control info
7. Check for errors
8. Backup patch file

9. Generate precombines (command line)
10. Merge CombinedObjects (script or CK)
11. Pack meshes into BA2
12. Compress PSG to CSG
13. Delete loose precombine files

14. Build CDX (command line)
15. Generate previs (command line) - LONG WAIT
16. Merge PreVis data (script or CK)
17. Clean VIS files (collect assets script)
18. Save patch in xEdit

19. Test in game
20. Fix any issues
21. Clean patch (QAC)
22. Package for distribution
```

---

## Glossary

**CK:** Creation Kit (Bethesda modding tool)

**CK Fixes:** Patches adding features to Creation Kit

**f4ck_loader:** Launcher for CK with Fixes applied

**PSG:** Precombined Shared Geometry (uncompressed)

**CSG:** Compressed Shared Geometry (compressed)

**CDX:** Cell Dependency Index

**UVD:** Visibility Data file (previs)

**CELL:** Record type for cells (interior or exterior)

**WRLD:** Record type for worldspaces

**ITM:** Identical To Master (clean records)

**BA2:** Bethesda Archive 2 (archive format)

**XCRI:** Combined References (in cell)

**PCMB:** Precombined Timestamps (in cell)

**XPRI:** Cross-reference record issue (error type)

**Preculling:** Visibility-related rendering issue

**Material Swap:** Process fixing shader/material compatibility

**Deep Copy:** Copying records with all child records

---

## Conclusion

Creating PRP patches is complex but achievable with proper preparation:

**Key Points:**
✅ Preparation step is critical - do it right first time
✅ Precombine generation is straightforward - can crash on bad mods
✅ Previs generation takes time and RAM - be patient
✅ Testing is essential - find issues before releasing
✅ Documentation helps community - report problems

**Success Factors:**
- Adequate system resources (especially RAM)
- Following steps exactly
- Patient troubleshooting
- Testing thoroughly
- Contributing findings back to community

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Based on:** feeddanoob's Modern Precombines Tutorial  
**Compatible with:** CK Fixes 1.81, PRP Branch 80+