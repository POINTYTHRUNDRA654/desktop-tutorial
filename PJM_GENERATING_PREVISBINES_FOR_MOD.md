# Generating Previsbines for Inclusion in an Existing Mod

**Source:** PJM's Precombine - Previs Patching Scripts, Nexus #69978  
**Author:** PJMail  
**Total views:** 4.2k  
**Updated:** Feb 2025

---

## Overview

It is generally better to create a **separate Previsbine Patch** for your mod rather than embedding Previsbines inside it. A separate patch allows you to:
- Create multiple versions for different environments (users with PRP vs. without)
- Keep the patch smaller (fewer cells = fewer conflicts)

However, if you want to include Previs in your actual mod, there are two methods — **Merge Seed** (recommended) and **Build with Original Mod** (not recommended).

> **Important:** Because you cannot rename "Clean" Precombine files after creation, you must use your actual mod name in the CK build process.  
> **Exception:** If building for Xbox, you must use "Filtered" Previsbines — and Filtered Previsbines can be placed in any mod (simpler to merge).

---

## Method 1 — Merge Seed (Recommended)

### Step 1: Clean Your Original Mod

If your mod already has Previsbines, remove them first:

1. Remove all Precombine/Previs files (`Data\vis\` and `Data\Meshes\Precombined\`) from the mod's `<modname> - Main.ba2` archive.
2. Revert all CELL records in your mod (only VISI, PCMB, XPRI, XCRI fields) to the current Fallout4/DLC values (ignore PRP).  
   The included script `FO4RemovePrecombines.pas` does this — load **only** your mod in xEdit, then run this script against it.
3. Run xEdit QuickAutoClean (`-qac`) on the mod to remove any ITMs now created.

### Step 2: Build New Previsbines from the Cleaned Mod

1. **Rename** the mod (and all its archives) — e.g. `<modname>_prepatch`. Do not use spaces or hyphens (`-`) in the name.
2. Load **only** this renamed mod into xEdit (plus PRP if you want to build against it — your mod must be placed **lower/after** PRP in that case).
3. Select the renamed mod → right-click → **Apply Script** → choose `FO4Check_Previsbines.pas`.
4. Select **"Create Seed to Rebuild Previs in selected Plugin(s) to improve FPS"** (or a later option) → click **OK**.
5. Review the log, resolve any **Issue** messages, and rerun until satisfied.
6. Run `GeneratePrevisibines.bat`, use your **original** `<modname>` as the patch name, and confirm using `xPrevisPatch.esp`.
7. Wait — it could take hours. Fix any crashes and re-run until Precombines and Previs are successfully created.
8. Load the resulting Patch (`<modname>`) only in xEdit (it will also load `<modname>_prepatch` and other masters automatically).
9. *(Optional)* Select the patch → right-click → Apply Script → `FO4CheckPrevisbineAssets.pas` to verify the build succeeded.
10. *(Optional)* Select the patch → right-click → Apply Script → `FO4CleanPrevisPatchMasters.pas` to remove unnecessary masters.
11. Save and exit.

### Step 3: Merge the Previsbine Changes Back Into Your Original Mod

#### Via Script (Recommended)
1. Load the resulting Patch (`<modname>`) only in xEdit (it will also load the renamed original mod and masters).
2. Ctrl-click to select both the patch (`<modname>`) **and** the original renamed mod (`<modname>_prepatch`) → right-click → **Apply Script** → choose `FO4MergePrevisPatchIntoMaster.pas`.
3. Once complete, save and exit.

#### Manually
1. In the original (renamed) mod, right-click its name → **Add Masters** → tick all masters from the patch mod.
2. Select the original mod → **Sort Masters** → confirm the master list matches the patch's. Exit xEdit saving.
3. Load only your patch mod in xEdit.
4. Right-click the top-level Cell field of the patch → **Deep copy as override (with overwriting) into** your renamed original mod.
5. Do the same for the Worldspace field of the patch (if present). Save and exit.

> **Note:** When merging Previsbine Cell info manually you may get validation errors about "records disabling previsbines". Fix these by loading just your mod in xEdit, finding the override of each reported record, and running `Copy_version_control_info_from_another_plugin_Redux.pas` against that override to revert the VCI1 timestamp to match the previous override.
>
> **Why this happens:** Bethesda compares the VCI1 of LAND/REFR overrides to the PCMB for that Cell. Blank or later VCI1 values must be set to be ≤ the PCMB. Without this fix, your mod's overrides (if last in someone's load order) will disable Precombines/Previs for those cells. Even Bethesda's own DLCs have this issue (e.g. Cells 000083B1, 0000DF75, 0000DF34, 0000DF33 — all broken by LAND overrides in the DLCs).

### Step 4: Merge Previsbine Files Into Archive

1. Using BSArch, Archive2, or BSArchPro — extract all files from the patch `<modname> - Main.ba2` back to your game's `Data\` directory.
2. Rename any directory under `Data\vis\` and `Data\Meshes\Precombined\` that matches the renamed mod (`<modname>_prepatch.esp`) to `<modname>.esp`.
3. Merge the `vis\` and `Meshes\Precombined\` directories back into the renamed mod's archive (`<modname>_prepatch - Main.ba2`). Create the archive if the mod didn't have one.
4. Rename/delete the Patch mod's .esp and archives. Rename your original mod's files back to their correct name (`<modname>*.*`).
5. *(Optional)* Validate by loading only the mod in xEdit and running `FO4Check_Previsbines.pas` against it with "Process selected Plugins only".
6. **Done!**

**Final mod files:**
- `<Modname>.esp` — with updated CELL data
- `<modname> - Main.ba2` — containing new Vis and Precombine files
- `<modname> - textures.ba2` — if the mod had one
- `<modname>.cdx`
- `<modname> - Geometry.csg`

#### Using BSArchPro for Step 3
1. Open the renamed mod's archive (`<modname>_prepatch - Main.ba2`) in BSArchPro.exe.
2. Drag the `vis\` and `Meshes\Precombined\` directories into its Files screen.
3. Click **Pack**, select **Fallout 4**, and save the archive somewhere outside your Data folder.
4. Copy that archive back over the original (`<modname> - Main.ba2`) in the Data directory.

---

## Method 1b — Merge Seed Using Filtered Previsbines (For Xbox)

Filtered Previsbines do not need the mod to be renamed:

1. Clean the mod as described in Method 1, Step 1.
2. Do **not** rename the mod. Build a normal patch (call it e.g. `OriginalModnamePrevis.esp`).
3. **Make sure** you use the `xbox` or `Filtered` parameter when running `GeneratePrevisibines.bat`.
4. Merge Previsbine Cell changes back into the original mod using `FO4MergePrevisPatchIntoMaster.pas`.
5. Extract Previsbine files from the patch's archive into the original mod's `- Main.ba2` (or rename the patch's archive if the original didn't have one).
6. *(Optional)* Validate using `FO4Check_Previsbines.pas`.
7. **Done!**

---

## Method 2 — Building With Your Original Mod (Not Recommended)

This method has many manual preparation steps and pitfalls. Use Method 1 whenever possible.

### 2.1 — Preparing Your Mod for Precombines

#### 1. Clear XCRI and XPRI on cells getting new Precombines
All Cells in your mod that have at least one REFR or LAND record (excluding the exterior Persistent Cell) must have their XCRI and XPRI fields cleared. Deleting VISI and PCMB is optional (they will be replaced), but **do not delete** fields on Cells that won't get new Precombines/Previs.

*Why:* If the CK doesn't create Precombines, it won't update these fields — leaving old/incorrect Precombine details.

#### 2. Remove all Precombine meshes and Physics files for those cells
Remove from your mod's archive. Don't leave loose files in `Data\Meshes\Precombined\` either.

*Why:* It becomes impossible to distinguish new from obsolete files, needlessly inflating archive size.

#### 3. Clear XPRI on all Cluster member cells getting new Previs
For every Exterior Cluster with at least one cell getting new Precombines: clear XPRI on **all** member cells. If a Cluster member is not in your mod and doesn't have a blank XPRI, create an ITM of it to clear XPRI.

*Why:* The CK won't clear XPRI if it generates no XPRI data, leaving old data. Any XPRI reference not in the Cluster Previs becomes invisible in-game.

#### 4. Remove old Previs files for Clusters getting new Previs
Remove the Previs file (`CellID.uvd`) for every Exterior Cluster (or Interior Cell) getting new Precombines. Don't leave loose files in `Data\vis\` either.

*Why:* Better to be missing a Previs file (which just disables Previs) than to have a wrong one (which causes occlusion issues).

#### 5. Add ITMs for Exterior Cells getting new Previs (even if blank)
These can be removed via QuickAutoClean after the build completes.

*Why:* The CK creates ITMs of these Cells anyway, but often gets the Masters wrong if the Cell's master list differs from your mod's — causing broken IDs, especially in XPRI.

#### 6. Add Material Swap references for affected statics
Any reference (of base type STAT) in a cell getting new Precombines, where the Material Swap is on the **Base Object** (MODS) but **not** on the Reference (XMSP), must have an ITM created with that Material Swap added to it.

*Why:* The CK ignores Base Object Material Swaps when building Precombines — those references revert to the default mesh texture. This commonly manifests as buildings appearing the wrong colour.

#### 7. Exclude references with Alpha Blending (XALP)
Any reference with XALP (e.g. weathered pictures on walls) must be excluded from Precombines: create an ITM and add a Location Ref Type of `NoPrecombineRefType`.

*Why:* The CK ignores Alpha Blend and will precombine these objects at full Alpha. They will look pristine or blank in-game.

#### 8. Ensure all required Masters are in the mod's Masters List
If building PRP-compatible Previsbines, make sure `PRP.esp` is a Master.

*Why:* The CK only loads plugins in your mod's Masters List. Missing masters means the CK uses the wrong meshes for Precombines.

> There is currently no single script that does all of the above automatically.

### 2.2 — Building Previsbines from the Prepared Mod

Once prepared, feed the mod into any Previsbine builder command script. Note that `GeneratePrevisibines.bat` does **not** support this path (it exits with "Mod has existing Archive").

### 2.3 — Manual CK Command-Line Build Process

1. Clean the mod as described above.
2. Generate Precombines: `<creationkit> -GeneratePrecombined:<your mod name>.esp Clean All`
3. Merge `CombinedObjects.esp` into your mod using `FO4MergeCombinedObjectsAndCheck.pas` in xEdit (load only `CombinedObjects.esp`, right-click your mod → Run Script).
4. Move Precombine meshes from `Data\Meshes\Precombined\*` into your mod's `<modname> - Main.ba2`. Delete the loose files.
5. Compress the PSG file: `<creationkit> -CompressPSG:<your mod name>.esp`
6. Build the CDX file: `<creationkit> -BuildCDX:<your mod name>.esp`
7. Generate Previs: `<creationkit> -GeneratePreVisData:<your mod name>.esp Clean All`
8. Merge `Previs.esp` into your mod using `FO4MergePreVisandCleanRefr.pas` in xEdit (load only `Previs.esp`, right-click your mod → Run Script).
9. Move all Previs files from `Data\vis\*` into your mod's `<modname> - Main.ba2`. Delete the loose files.
10. Delete from your Data directory: `Previs.esp`, `CombinedObjects.esp`, `<modname> - Geometry.psg`.
11. Package up `<modname>.esp`, `<modname>.cdx`, `<modname> - Geometry.csg`, `<modname> - Main.ba2`, and `<modname> - Textures.ba2` and install normally.

> **Script Notes:**
> - The old `03_MergeCombinedObjects.pas` has edge-case problems — use `FO4MergeCombinedObjectsAndCheck.pas` instead.
> - The old `05_MergePreVis.pas` also has issues — use `FO4MergePreVisandCleanRefr.pas` instead.
> - After building Precombines/Previs, remove any helper ITM records (Material Swap, exclusion overrides). Records with EditorID starting `"PleaseRemove"` will be cleaned automatically by PJM's scripts.

---

## How to Remove Existing Previsbines from a Mod

1. Load only the mod to be cleaned in xEdit (masters load automatically).
2. Revert all CELL records (only VISI, PCMB, XPRI, XCRI fields) to current Fallout4/DLC values. Run `FO4RemovePrecombines.pas` — right-click your mod → Run Script.
3. Save and exit.
4. Run `FO4Edit -qac` (QuickAutoClean) to remove any ITM Cells (Cells without REFRs etc.).
5. Delete all `Meshes\Precombined\*` and `vis\*` files from the mod's `<modname> - Main.ba2` archive.

---

*Credit: All procedures, scripts, and documentation by PJMail — PJM's Precombine - Previs Patching Scripts, Nexus #69978. Updated Feb 2025.*
