# PJM's Previs Patching Scripts — Help and FAQ

**Source:** PJM's Precombine - Previs Patching Scripts, Nexus #69978  
**Author:** PJMail  
**Last updated for:** V4.9 kit (Feb 2026)

---

## First — Make Sure You Have the Latest Files

The **V4.9 kit** contains the latest releases of all scripts as of Feb 2026. Always install any later updates found under **"Updated Files"** on the Nexus page. Everything else found on the Internet or Nexus is incomplete or outdated.

---

## Your PC Setup REQUIRED to Successfully Build Previsbines

> **DO NOT use a mod manager (especially MO2) to install any of the following files/programs.**

### Creation Kit
- Must be installed and running properly.
- Create `steam_appid.txt` (containing just `1946160`) in the same directory as `creationkit.exe`.
- If you use MO2, also register `creationkit.exe` as an **Executable** with AppID `1946160`.
- Skipping this causes errors: error 53, a Steam popup asking to confirm parameters, or error `V:0000065432`.

### Supported CK / CKPE Combinations
| FO4 Version | CK Version | CKPE Version | Notes |
|---|---|---|---|
| FO4 OG | CK OG (downgraded) | CKPE 0.3 | `bOwnArchiveLoader=false`, `bBSPointerHandleExtremly=true`, all archives converted to V1 (CMT), replace Fallout4 - Shaders.ba2 and Fallout4 - Interface.ba2 with FO4 OG versions |
| FO4 OG | CK OG | CKPE V0.6 latest 2026 | Unverified |
| FO4 OG | CK NG | CKPE 0.6 latest | May work but game won't run (CK NG has newer steam_api64.dll) |
| FO4 AE | CK AE | CKPE V0.6 latest 2026 | Fully supported |

Edit `CreationKitPlatformExtended.ini`/`.toml` to include the above settings and `sOutputFile=CKPE.log` (or `CK.log`).

If you have more than 5 cores/threads, try setting `iMaxUmbraBakeThreads=n` (where n = #cores - 1) in `CreationKit.ini` under `[General]`.

### xEdit / FO4Edit
- Must be **V4.1.5f or later**.
- If using MO2, register `xEdit64.exe` (or `FO4Edit64.exe`) as an Executable and run it once to cache all your plugins.

### PJMScripts
- Download the archive from **Nexus #69978** — **manually**, not via a mod manager.
- Extract so all `*.pas` files land in the **Edit Scripts** subdirectory inside your FO4Edit folder.
- Place `GeneratePrevisibines.bat` in the same directory as `xEdit.exe`.
- Download the latest updates from the **"Updated Files"** tab and overwrite the older copies.

### GeneratePrevisibines.bat
- If using MO2, add `GeneratePrevisbines.bat` as an **Executable** with AppID `1946160`.
- If it cannot find FO4 (or reports an old directory), run `Fallout4Launcher.exe` once and exit — this updates the registry.
- If it still can't find `FO4Edit.exe`, run FO4Edit at least once, or place the bat in the same directory as `xEdit.exe`.
- **Make sure Steam is running** before starting `GeneratePrevisibines.bat`.

---

## If You Use PRP — Important Load Order Rules

- **NEVER** use patches built for a different PRP version. No patch is better than a patch for the wrong version.
- **NEVER** place a mod containing precombines after (below) PRP unless it was built for your specific PRP version or is a total game replacer.
- Place **all other mods before PRP** (and its patches). If a mod says "put me last", it still goes before PRP.
- The **only exception**: total replacer mods that update a huge number of cells and include new previsbines (>1 GB unpacked). Place those after PRP and patch the result.
- Find compatible PRP patches for all mods that add/modify objects in the world and place them after PRP.
- Mods that enable scrapping everything in a settlement without providing new compatible precombines may stop working — look for a better version or build new precombines for it using the **"Build new Precomb/Previs if it Improves FPS"** option.
- Run `FO4Check_previsbines` → **"Create SeedPatch to fix all reported issues"** and check the last "Info" line. If `(yy for new Precomb)` is above 50, you have not followed this guide or have mods unsuitable for PRP.

### Recommended Load Order for Minimum Patch Size
1. All normal mods (add content but don't support PRP, or have precombines for the wrong PRP version)
2. PRP and its compatibility patches
3. Mods built for PRP, or PRP-compatible previsbine patches for mods from group 1
4. Your personally built "previsbine conflict resolution" patch (built with PJM's scripts)
5. Patches restoring Cell changes (Lighting, Fog, Weather) removed by PRP/Previs patches (can be combined with step 4)

**Rule #1:** Mods that add previs always go lower (after) mods that don't, unless the previs mod is a patch specifically designed for your load order.

### Pre-built PRP Patches Available on NexusMods
- Cannibal Toast's PRP Patch Compendium
- Miscellaneous Performance Optimization - PRP
- Emirals Previs Patches for PRP

---

## Using GeneratePrevisibines.bat to Build Precombines/Previs

1. Read the Deep Dive and Seed Building articles on the PJM mod page first.
2. Read the CKPE section below.
3. Create your "seed" mod via `FO4Check_Previsbines.pas`.
4. Make sure `Data/vis` and `Data/meshes/Precombined` directories are empty.
5. Launch `GeneratePrevisibines.bat` via CMD, shortcut, or MO2.
6. When prompted for a Patch name, type your desired name. If no mod with that name exists it will look for `xPrevisPatch.esp` and offer to rename it.
   - **DO NOT** use `xPrevisPatch` as your patch name.
   - **DO NOT** put spaces in the name (the CK fails to create CDX/CSG files with spaces).
7. **Do not touch your computer until the process finishes** — the script sends keystrokes and will hang if focus is stolen.
8. On completion you will have **4 files** in your Data directory. Package them (7-zip) and install, or register as a new MO2 package.
9. Clean up: delete the 4 files plus `Previs.esp`, `CombinedObjects.esp`, and `xPrevisPatch.esp`.

### If a Phase Fails — How to Restart from a Failed Step
1. Re-run `GeneratePrevisibines.bat` (with the same arguments as before, e.g. `-BSarch` if used).
2. Specify the **same patch name**.
3. When prompted `"Plugin already exists, Use It? [Y], Exit [N], Continue from failed step [C]"` — press **C**.
4. At `"Restart at step (1 - 8 or 0 to exit):"` press the number of the step that failed.
5. If prompted to clean a non-empty directory, press **Y**.
6. The step re-runs; if it completes the script continues automatically.
7. A successful run lists the created files and asks `"Remove working files [Y]?"` — press **Y**.

### If the Bat Fails Before Asking for a Patch Name
Your environment is not set up correctly. Re-read the "PC Setup Required" section above.

- **Unable to find Fallout4.exe** — run `Fallout4Launcher.exe` once and exit.
- **Failure to find FO4Edit.exe** — run FO4Edit at least once, or place the bat in the FO4Edit directory.
- **Failure to find CreationKit.exe** — CK must be in the same directory as `Fallout4.exe`.

### If the Bat Hangs on an xEdit Step
- You (or another program) stole focus from xEdit — click the waiting prompt to continue.
- `WARNING - Unable to locate automated scripts in FO4Edit scripts directory` — you did not copy all files to the correct location.
- xEdit completes but does not close — manually close the window; red errors mean you closed it too early.

---

## Running in an MO2 Environment

- Both `xEdit64.exe` and `GeneratePrevisbines.bat` **must be run via MO2**.
- Register both as **Executables** with AppID `1946160` (tick "Overwrite Steam AppID").
- **Create an empty mod** in MO2 to receive files created by the scripts. Place it at the bottom of your load order and activate it.
- For each registered executable, tick **"Create Files in Mod instead of Overwrite"** and set it to this empty mod.
- If you skip this, `GeneratePrevisbines.bat` **will fail** — it cannot find the files it needs, including `xPrevisPatch.esp`.
- Even with this set up, some phases may fail due to MO2 file-moving delays — just re-run that phase.
- Zip the resulting previsbine patch files to an archive in a non-game directory, delete them from the data folder, and install the archive normally in MO2.

---

## Errors in FO4Check_Previsbines.pas to Resolve

"Warning" and "Error" messages are expected — they're the problems the seed is designed to fix. What **cannot** be ignored:

- **FATAL** messages — you'll get `"Generation FAILED: <nn> Errors."` and the seed will be useless. Resolve these before continuing.
- **Issue** messages — examine each one. The following must NOT be ignored:
  - `Issue: CELL xxxxxxxx (of Mod1.esp) Found loose Previsbine file <filename>`
  - `Issue: CELL xxxxxxxx (of Mod1.esp) Cant find any Mod Archive that provided uvd file for Cluster yyyyyyyy`
  - `Issue: CELL xxxxxxxx (of Mod1.esp) Cant find any Mod Archive that provided uvd file for this Cell`

These mean some Precombine/Previs files cannot be attributed to any mod — conflict detection is impossible. The remaining Issues are due to faulty mods; report them to the mod's author.

### Why You Cannot Have Loose Precombine/Previs Files
Loose files cannot be overridden by a patch. They have no association with any mod, so conflict detection is impossible. PJM's scripts will **never** support loose previsbine files. If you hit the BA2 limit, make other things loose — never precombines/previs.

---

## Seed Exceeds the 254 Masters Limit

This is a game/CK limitation with no current bypass. It happens most often with many mods affecting large areas (static/clutter/flora/rock replacers).

**Options:**
1. Regenerate the seed, but **untick** `"Rebuild Visibility on effected Adjacent Clusters"` (Advanced option) — may produce fewer masters.
2. If you don't need all clutter affected, also untick `"Rebuild... if mesh changed..."`.
3. Check which mod is causing a surprise master: search for `"Info: Added Master <mod> to seed for <FormID>"` and inspect the FormID in xEdit.
4. Merge clutter replacers into fewer combined mods.
5. If none of the above helps, break up the patch manually:
   - Select a contained group of mods (e.g. "all Nukaworld mods").
   - Build a "fix all" seed against just that group (with full load order ticked in xEdit).
   - Build and install the patch, optionally run `FO4CleanPrevisPatchMasters.pas` to remove unnecessary masters.
   - Repeat until a full-load-order seed succeeds.

---

## FO4Check_Previsbines Script Options Reference

| Option | Best Used For |
|---|---|
| **0) Show Cell/Previs conflicts ONLY** | Validate a previs patch or identify mods needing special attention |
| **1) Fix all Cell Previs/config conflicts** | Fix all problems in your entire load order (your final fix-all patch) |
| **4) Fix only Cell Config Conflicts (Lighting/Weather/Fog/MHDT)** | Patch for lighting/weather/environment conflicts only, without breaking precombines |
| **2) Build new Precomb/Previs if it Improves FPS or fixes conflicts** | Previs patch for a single mod above PRP; can be distributed to Nexus |
| **3) Build new Precomb/Previs always (replace existing)** | For mods with no existing previs, wrong PRP version previs, or new worldspaces |

Options 2 and 3 are for **mod-specific patches only** — do not run against your entire load order.

### Scope Selection
- **Only what you highlighted in xEdit** — process only selected mods/cells/worldspaces.
- **Everything (All Plugins)** — process everything loaded. Don't use for mod-specific patches.
- **ALL User Plugins (Ignore PRP, UFO4P, Game)** — automatically selects only user mods.

### Unattended / Shortcut Operation
Create a shortcut with Target: `<dir>FO4Edit.exe -Script:FO4Check_Previsbines.pas <option>`

| Flag | Action |
|---|---|
| `-Fix` | Generate a seed to "Fix all Issues" (same as option 1) |
| `-Opt` | Generate a seed to "Improve Performance" (same as option 2) |
| `-Opt:nn` | As above, set minimum new precombineable references to `nn` instead of 5 |
| `-Full` | Generate a seed to "Rebuild all Previsbines" (same as option 3) |
| `-Reg` | Generate a patch to fix Weather/Lighting/Fog/MHDT only (same as option 4) |
| `-Seed:"name.esp"` | Use a different seed name than `xPrevisPatch.esp` |
| `-Esm` | Create seed/patch as ESM-flagged |
| `-Log:"path\log"` | Log output to file |
| `-Mod:"Name.esp"` | Run against this specific mod |
| `-Mod` | Run against all user mods (not base game/DLCs/PRP/UFO4P) |
| `-New` | Only check cells mastered in selected mods (newly added, not overrides) |

Use `-P:modlist.txt` (before `-Script`) to specify which mods to load into FO4Edit.

---

## GeneratePrevisibines.bat Error Messages

| Error | Cause & Fix |
|---|---|
| `WARNING - Unable to locate automated scripts` | Scripts not copied to the correct Edit Scripts directory |
| `ERROR - Windows Reg.exe cannot be found` | Windows registry tool missing — Windows is broken |
| `ERROR - Fallout4 cannot be found` | Run `Fallout4Launcher.exe` once and exit |
| `ERROR - CreationKit.exe cannot be found` | CK not installed in the same directory as `Fallout4.exe` |
| `ERROR - FO4Edit.exe cannot be found` | Run FO4Edit at least once, or run the bat from the FO4Edit directory |
| `ERROR - CK Fixes not installed` | CKPE not found in Fallout4 directory |
| `ERROR - Archive2.exe cannot be found` | CK not properly installed (Archive2 is part of the CK) |
| `ERROR - Previs directory not empty` | A mod has loose `.uvd` files in `Data/vis` — pack them into BA2 first |
| `ERROR - This Plugin already has an Archive` | Choose a different patch name |
| `ERROR - Seed file xPrevisPatch.esp does not exist` | Patch name doesn't exist and no seed found |
| `ERROR - Copy of seed to plugin failed` | Windows permissions issue or MO2 file lock — retry |
| `ERROR - Precombine directory not empty` | A mod has loose `.nif` files in `Data/meshes/Precombined` |
| `ERROR - GeneratePrecombined failed to create psg file` | CK operation failed — check `CK.log` |
| `ERROR - GeneratePrecombined failed to create any Precombines` | CK operation failed — see CK crash guide |
| `ERROR - GeneratePrecombined ran out of Reference Handles` | Exceeded 2 million handles limit — set `iMaxUmbraBakeThreads` in CKPE .ini |
| `ERROR - No Visibility (uvd) files generated` | CK operation failed — see CK crash guide |
| `WARNING - GeneratePreVisData failed to build a Cluster uvd` | A cluster failed to build — see CK crash guide |
| `ERROR - Archive2 failed with error` | Archive failure (too many files) — may need to use BSArchPro manually |
| `ERROR - FO4Edit script 'script' failed` | xEdit script bug — report to PJMail on Nexus #69978 |

---

## CK Log Errors You Can Safely Ignore

The following CK log messages will not cause issues when generating Precombines/Previs:

- `MASTERFILE: Potentially Invalid Z value (-nnnnn.nn) on reference` — mod has reference below -40000
- `MASTERFILE: Reference <formid> has a custom material swap. Please change to a standard material swap.` — mod forgot to rename the material swap
- `MASTERFILE: Ref (<formid>) to base object <editorid> in cell ... should be persistent but is not.` — mod bug
- `MASTERFILE: !!!!!! Cell <editorid> does not own combined data but current combined extra differs from ESM data` — CK reporting new precombines defined in a user mod (ignore)
- `MASTERFILE: *** Cell <editorid> combined data is owned by file <mod> due to ref <editorid>` — CK reporting a precombined reference override (ignore)
- `DEFAULT: (Faction Reaction Error) Faction ...` — mod faction relationship bug
- `DEFAULT: Failed to collect ref <editorid>` — CK reporting why a reference won't be precombined (ignore)
- `FORMS: Unable to find master location on worldspace` — mod worldspace setup bug
- `FORMS: Form of type NAVI in file was not freed` — CK always reports this before closing after saving (ignore)
- `FORMS: Forms were leaked during ClearData` — CK always reports this before closing (ignore)
- `MODELS: BASE <Mesh File> marked for flutter animation, but has no vertex colors` — mesh setup bug
- `MODELS: Bound for object exceeds 32000 unit limits` — mesh/collision bug
- `ASSERTION: ERROR: duplicate model ID found while generating visibility` — unknown, does not cause issues
- `ASSERTION: Sky::UpdateWeather failed to determine an active weather` — unknown, does not cause issues
- `ASSERTION: Not attached to scenegraph` — unknown, does not cause issues
- `PATHFINDING: NavMesh in cell ... should be refinalized, there are navmesh bounds missing` — mod navmesh not finalized (mod bug)
- `EDITOR: Editor ID is not unique` — CK will temporarily make it unique, no issue
- `ANIMATION: There was a problem loading the project data` — mod animation bug

---

## Types of Mods That Can Cause Previs Issues

- Mods that add/modify/delete/move visible world objects
- Mods that change landscape (flatten hills, etc.)
- Mods that make unscrappable settlement objects scrappable
- Mods that add new NPCs to a location
- Mods that add/fix navmesh (NPC pathing)
- Mods that change Lighting, Fog, or Ambient Sound in an area
- Mods that add new Settlements, Player homes, or Random Encounters
- Mods that replace meshes (models) of static objects in the world

---

## Adding Precombines/Previs to an Existing Mod

See PJM's dedicated article on Nexus #69978, but basic steps:

1. Remove existing previsbines using `FO4RevertPrecombines.pas`
2. Rename the mod temporarily (and its `<modname> - Main.ba2`) and load **only** it into xEdit (or with PRP.esp if building for PRP)
3. Build a Previs Patch for the mod using option 2 ("Improves FPS") — name it the original mod's name
4. Merge the Previs Patch back into the renamed mod using `FO4MergePrevisPatchIntoMaster.pas`
5. Merge previs files from the patch back into the mod's main archive; delete the patch .esp and its archive
6. Rename the mod and `<mod> - Main.ba2` back to the original name

---

## Why Build a Seed Mod Instead of Running the CK Directly on Your Mod?

- The CK creates precombines for **every cell** in the mod with a reference (even when unnecessary), creating more previs to conflict.
- The CK does not correctly create precombines for references with different textures (material swaps) or Alpha masking.
- The CK can copy cells incorrectly (missing masters), causing broken references.

For these reasons, always build a separate previs patch from a seed rather than running the CK directly on your mod.

---

*Credit: All scripts, documentation, and FAQ by PJMail — PJM's Precombine - Previs Patching Scripts, Nexus #69978. Updated for V4.9, Feb 2026.*
