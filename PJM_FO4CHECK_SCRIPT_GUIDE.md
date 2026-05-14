# FO4Check_Previsbines Script Guide

**Source:** PJM's Precombine - Previs Patching Scripts, Nexus #69978  
**Author:** PJMail  
**Total views:** 12.4k  
**Script version:** V4.8e (July 2025), V4.9 kit (Feb 2026)

---

## What This Script Does

`FO4Check_Previsbines.pas` finds Previsbine/Cell conflicts in your load order (or selected mods) and optionally builds a **seed** that you feed into `GeneratePrevisibines.bat` to create Previsbines correcting those issues. It can also build new Previsbines for a mod or create a PRP patch.

---

## Usage

1. Load **all** plugins you want the script to consider into FO4Edit.
2. Select the plugin(s) containing the CELL records you want to check/generate Previs for.
3. Right-click → **Apply Script** → choose `FO4Check_Previsbines.pas`.

> **Note 1:** The mod(s) you select only determine which CELLs are checked. The script always looks at all overrides of those cells. Always load **all** mods that influence those cells and their references — every override contributes, not just the winning one.

> **Note 2:** If the selected CELLs are Exterior cells, the script processes **all** cells in the Cluster(s) those cells belong to, since they share Previs.

> **Note 3:** If "Everything (All Plugins)" or "ALL User Plugins" is chosen, your plugin/cell selection is ignored and every mod/cell is checked. The first option scans by Worldspace/Interiors; the second scans by Plugin (faster for small load orders).

> **Note 4:** This script does a **deep scan** including all archives — it can take a long time for mods with many cells.

**Example with PRP:** Always load FO4Edit with PRP (and any PRP extras you use) plus the mods you want to check — but only **select** the mods you are interested in. If you want to check/fix your **entire** load order, load everything and choose "Everything (All Plugins)".

---

## What Is Checked

The script checks that:
- Cell precombined references were not updated (overridden) after the corresponding Precombine mesh (nif) was built.
- The Previs for a cluster (uvd) was created from one consistent set of member cell Precombines.
- Physical Previsbine files are in the archive of the mod they were generated for (owning mod).
- The CK was used to generate/update the PCMB/VISI fields.

Extra checking/fixing:
- All regions added by mods are included in the winning override.
- MHDT/EDID/Location/Weather/Lighting/Fog changes are not overwritten by the winning mod.
- Example: if you have ELFX placed before PRP, those changes are normally overwritten by PRP. This script detects this and adds Cell overrides (that don't break Precombines) to restore those changes after PRP.
- "Region Names on Saves" — all new regions from all mods are restored in cell overrides.

**Logic for winning CELL field value:**
- UFO4P/PPF values take precedence over Base Game/DLC (treated as fixes).
- Any User Mod override that matches the Base Game/Master Cell value is ignored (considered a regression).
- The last valid User override value is used.
- PRP value is ignored if a valid user value is found (would be a regression).
- Empty fields are never left blank on elements containing structures.
- Regions are only added, never removed.

---

## Seed Building

The script creates an ESP containing every CELL with a reported error, arranged so the CK will create new Precombines for those cells. It also includes other CELLs in the same Clusters for Previs building.

**Why a separate seed?**
The CK rebuilds Precombines for ANY cell it finds a REFR on — which may not need rebuilding. The Seed method gives full control. The seed follows the rule that it needs at least one REFR per Cell (to trigger Precombine rebuild) and at least one such Cell per Cluster (to trigger Previs).

The seed contains:
- The latest override for every cell, Cluster member, worldspace, and REFR it includes
- Masters for **every** mod it needs (so the CK only needs the Seed mod — its masters load automatically)
- Cell overrides to restore missing Regions/MHDT/EDID/Lighting/etc
- Explicit Matswap references (no extra xEdit scripts required)
- References with Alpha Blending flagged as No Precombine
- References that would crash the CK flagged as No Precombine

These helper references are marked with EDID `"PleaseRemove"` for cleanup after the CK build. They must NOT remain in the final Previsbine Patch.

---

## Interactive Task Menu Options

### Task 1 — Fix Cell Previs/config conflicts *(Create Final conflict resolution Patch)*
**Advanced options:** 0,3,4,5,6,8,9,16–28

Run against your entire load order to create a "Final" previs patch to fix all remaining issues after creating/downloading patches for individual plugins. Recommended for most users.

### Task 2 — Build new Precomb/Previs if it Improves FPS or fixes Cell conflicts
**Advanced options:** 0,1,3,4,6,9,16–19,21–28

Builds new Precombines for mods that: don't have them; have added new content without a performance improvement; or need a PRP patch. Load only the mod in question (and PRP if creating a PRP patch) — do NOT choose "Everything (All Plugins)".

### Task 3 — Build new Precomb/Previs (replace existing unless from Base Game/DLC/PRP)
**Advanced options:** 0–7,9,16–19,21–28

Completely rebuilds new Precombines for the selected mod. Use when existing Precombines are broken/outdated. Generally not needed if the mod is followed by PRP.

### Task 4 — Fix Cell only Config Conflicts *(Region/MHDT/Lighting/Weather/Fog etc)*
**Advanced options:** 0,13,16–22

Not a Precombine patch — creates a patch to merge in regions and fix issues caused by mods that override cell Lighting, MHDT, EDID, Locations, Fog, etc. Use to create a specific "ELFX" or "Ultra Interior Lighting" patch against PRP. Not required if you already generate a "Fix" patch (Task 1 includes this).

> If none of these tasks exactly fits your requirements, select the closest one and click **Advanced** to change individual options manually.

---

## Scope Selection (Radio Button)

| Option | Effect |
|---|---|
| **Only what you highlighted in xEdit** | Only look at Cells/Clusters touched by selected mods |
| **ALL User Plugins (Ignore PRP, UFO4P, Game)** | Ignores selection; processes all user plugins |
| **Everything (All Plugins)** | Ignores selection; checks all plugins loaded into FO4Edit |

---

## Display Options

| Option | Effect |
|---|---|
| **Show one Error/Warning per Cell** | Default; reports everything but tries to show one error/warning per cell |
| **Show only Issues (that cannot be fixed)** | Only issues requiring manual resolution |
| **Show only Errors/Issues** | No warnings or informational messages |
| **Verbose (Show all issues with every Cell)** | Reports every problem found per cell |

---

## Manual (Advanced) Options Reference

### Seed / Build Options
| # | Option | Description |
|---|---|---|
| 0 | Build Seed | Create `xPrevisPatch.esp` to fix found errors; use with `GeneratePrevisibines.bat` |
| 1 | Build Precombines for Cells with new added Content | Rebuild cells with new unprecombined references (improves FPS; increases patch size) |
| 2 | Build Precombines if removed/disabled by another Plugin | Rebuild cells deliberately set to "no previs" by another mod (e.g. scrap-everything mods) — use carefully |
| 3 | Rebuild Precombines containing Refs with changed Meshes | Rebuild when model overrides/replacements exist on Precombined references |
| 4 | Rebuild Precombines containing Refs it shouldn't | Rebuild when Deleted or moved references are in Precombines |
| 5 | Rebuild Visibility on partially updated Clusters | Force Visibility rebuild if a mod updates a Cluster's uvd but not all member cells |
| 6 | Rebuild Precombines with Mixed Precombine mesh sources | (Default On) Rebuild cells using nifs from multiple mods — always bad with PRP |
| 7 | Rebuild All Precombines (Unless from Base Game/DLCs/PRP) | Rebuild all cells with modified references — use for completely new Previs or wrong PRP version |
| 8 | Rebuild Visibility on effected Adjacent Clusters | Add extra cells to seed so adjacent cluster uvds generated by the CK are kept correctly |
| 9 | Rebuild Precombines if required to force Previs rebuild | Add "sacrificial" cells to trigger Previs rebuild for clusters that need it |
| 10 | Rebuild Precombines Always (even from Base Game/DLCs/PRP) | Used to build something the size of PRP — do NOT use unless creating a PRP replacement |

### Restrict Cells
| # | Option | Description |
|---|---|---|
| 11 | Only process New Worldspaces/Interiors added by Plugins | Ignore base game/DLC cells |
| 12 | Ignore plugin-added Worldspace/Interior Cells | Only check Bethesda base/DLC cells |
| 13 | Only PreCheck Cells (Ignore all Previsbine faults) | Check MHDT/EDID/Region/Lighting issues only |
| 14 | Only check for Disabled Previsbines | Fast scan for cells with Previs disabled |
| 15 | Only Check Precombines (Don't check Previs Clusters) | Skip occlusion/Previs issues |
| 16 | Ignore Unused/Junk Interior Cells | (Default On) Skip interior cells the player never enters |
| 17 | Ignore Fallout4.esm and DLCs Issues | (Recommended On) Untick to report/fix errors in non-CC Bethesda files |
| 18 | Treat UFO4P and PRP specially | (Recommended On) Untick to report/fix errors in UFO4P and PRP |

### Other Recommended Fixes
| # | Option | Description |
|---|---|---|
| 19 | Check (and exclude) Precombined Refs with Alpha channel | Flag alpha-channel refs (e.g. pictures) as "no precombine" in the seed |
| 20 | Check Cells/Worlds for regression of fields/settings | Precheck overridden EDID, Location, missing regions, etc |
| 21 | Fix Cells/Worlds with field/settings regression | Fix the above in any cell added to seed |
| 22 | Exclude STATs with Bad/High Precision Meshes | Check meshes for "High Precision" and exclude from Precombines |
| 23 | Recursively add Masters of Masters to Seed's Master List | Prevents broken XPRI entries due to game/CK bug |
| 24 | Check XPRI references that may cause Occlusion issues | Flag moved objects with XPRI data |
| 25 | Exclude Persistent Quest Aliases from Precombines | Scripts on Precombined References (via quest aliases) do not work properly |
| 26 | No broken/unusable XPRI refs Warnings | Suppress unfixable warnings about mod-added cell XPRI (game bug) |
| 27 | Don't add masters for unusable XPRI references | Reduce required masters by ignoring XPRI refs that won't work anyway |
| 28 | Exclude Exterior Persistent Precombined Refs with bad Meshes | Scan Persistent Cell of Worldspace for bad meshes |

### Misc Options
- **Log all messages to `<Patch>.log`** — write all output to a log file in your xEdit directory
- **Don't show Progress messages** — suppress progress output
- **Calculate Reference Handles required for Seed** — estimate handles needed; too many will crash the CK
- **Rebuild Threshold** — change the minimum number of unprecombined refs in a CELL before it is flagged for rebuild

---

## Batch (Non-Interactive) Mode

Run from the command line by creating a shortcut to `FO4Edit.exe` with `-Script:FO4Check_previsbines.pas` as a parameter.

### Build Mode Flags
| Flag | Task |
|---|---|
| *(no flag)* | Verify only |
| `-Fix` | Create seed to fix all Previs problems (Task 1) |
| `-Opt` | Create seed to rebuild Previs for selected plugin(s) to improve FPS + if disabled |
| `-Opt:nn` | As `-Opt` but set rebuild threshold to `nn` |
| `-FullMin` | Create seed to rebuild ALL Previs for a plugin (replace existing) |
| `-Full` | As `-FullMin` plus "Rebuild Visibility on Adjacent updated Clusters" |
| `-Reg` | Create patch to fix only wrong Regions/MHDT/LCN/EDID/etc (Task 4) |
| `-All` | Build seed with "Rebuild Everything including Base Game/DLCs" — **only for creating a PRP replacement** |

### Additional Flags
| Flag | Description |
|---|---|
| `-Mod:"modfilename"` | Only scan this mod's cells (quote the name if it includes spaces) |
| `-Mod` | Scan all mods except Base Game/DLCs/CC/PRP/UFO4P |
| `-Log:"logfilename"` | Save all messages to the specified file (quote path) |
| `-Seed:SeedFileName` | Specify seed mod name instead of `xPrevisPatch.esp` |
| `-Esm` | Flag the seed as ESM |
| `-New` | Advanced option "Only process New Worldspaces/Interiors added by Plugins" |
| `-P:modlistfile` | Restrict FO4Edit mod list to only those in this file and their masters |

**Example `-P` modlist** for building a PRP seed for Atomic World (`modlistfile` contains):
```
*Atomic World.esp
*PRP.esp
```
No need to include the main game or DLCs — they are masters of PRP and load automatically.

### Example Shortcuts
```
# Create a "previsbine Conflict Resolution" patch seed
<dir>FO4Edit.exe -Script:FO4Check_Previsbines.pas -Fix

# Verify your load order and log to file
<dir>FO4Edit.exe -Script:FO4Check_Previsbines.pas -Log:<dir>log.txt

# Create a seed to build new previs for all user mods
<dir>FO4Edit.exe -Script:FO4Check_Previsbines.pas -Full -Mod
```
Try it interactively first to understand the options before using shortcuts.

---

## CK Reference Limit Issues

If your seed contains too many large mods, you may hit the CK's 2,097,152 reference limit, causing thousands of "OUT OF HANDLE ARRAY ENTRIES" errors.

**Check in advance:** Load only your seed mod in FO4Edit and run `count_loaded_refs_in_load_order_CK.pas`, or enable the "Calculate Reference Handles required by Seed" advanced option when building the seed.

**If total exceeds 2,097,152:**
1. *(Recommended)* Set `bBSPointerHandleExtremly=true` in `CreationKitPlatformExtended.ini` (CKPE).
2. Create the patch in "slices":
   - Pick a mod with lots of new content and build a seed just for it.
   - If it doesn't exceed the limit, build Previsbines for it and install in your load order.
   - Try building a seed for your entire load order again — it may now fit (that mod's cells are already covered).
   - If still over the limit, repeat with another large-content mod.

---

## Load Order Rules to Minimise Previs Conflicts

1. Mods that add things to worldspaces (without Previsbines), or mods you plan to rebuild Previsbines for — place high (near Fallout4.esm)
2. All normal mods
3. PRP (and all its PRP_*.esp mods)
4. Mods supplying their own PRP-compatible Previsbines
5. "Special attention" generated Previs patches / PRP patches created by others
6. The "Final" previs patch(es)
7. Patch(es) to bring forward cell changes (Fog, Lighting, MHDT, Regions, EDID) from earlier mods

**Note 1:** Mods with non-PRP Previsbines (or Previsbines that don't support PRP) should go **before** PRP.esp — PRP will override their Previsbines. It's less conflict to build new Previsbines from PRP rather than patching existing ones (patching rebuilds more cells = more mod conflicts).

**Note 2:** Total conversion mods (like Desperados) always go **after** PRP — as long as they support PRP. If they don't, find a PRP patch created by someone else.

**Note 3:** Mods that deliberately disable Previs (some settlement scrap-all mods) or make cell changes (Fog, Lighting, MHDT) should still go high, but you also need to manually create a patch to merge in cell changes from the Previsbine patches for the cells they touch.

---

## Recommended Previsbine Build Process

PJMail's current recommended process:

1. Build Previsbine patches for individual mods needing special attention (as if they are the only mod in the game).
2. Install those patches, then create a final Previs patch for your entire load order.

**Mods needing special attention:**
- Mods adding a lot of new content with no rebuilt Previsbines → use **Task 2**
- Mods with Previsbines not supporting PRP → place before PRP, use **Task 2**
- Mods that deleted Previs to avoid rebuilding it → use **Task 2**
- Mods with bad Previsbines you want to replace completely → use **Task 3**

---

## Script Message Reference

### Info Messages (Check Phase)
| Message | Meaning |
|---|---|
| `Info: CELL xxxxxxxx (of Mod1) has no Previs yet supplies a uvd file, Rebuilding for Performance` | Cell is being rebuilt to increase FPS |
| `Info: CELL xxxxxxxx having Precombines Built as at least nn UnPrecombined References found` | New content detected; building Precombines |
| `Info: CELL xxxxxxxx having Precombines rebuilt as Ignore Existing selected` | Forced rebuild per option |

### Warning Messages
| Message | Meaning |
|---|---|
| `Warning: CELL xxxxxxxx (of Mod1) has disabled Precombines (Removed PCMB) of CELL yyyyyyyy (of Mod2)` | Mod1 disabled Previs in this cell; FPS will be lower. Advanced option 2 can fix. |
| `Warning: CELL xxxxxxxx may have Occlusion issues. It has different XPRI compared to Previs in (Mod2)` | Mod2 regenerated Previs without updating XPRI in this cell — issue with Mod2 |
| `Warning: CELL xxxxxxxx uses Precombine from Mod2 (more recent) and rest from Mod3` | Mixed Precombine mesh sources — looks problematic |
| `Warning: CELL xxxxxxxx has overridden <element> on CELL yyyyyyyy (of Mod2)` | Non-critical mod conflict; seed will contain a merged fix |

### Error Messages
| Message | Meaning |
|---|---|
| `Error: CELL xxxxxxxx uses Precombines from multiple mods` | Mixed mods built Precombines independently; winning XCRI is mismatched — will cause occlusion issues |
| `Error: CELL xxxxxxxx uses Precombines (from Mod2) not known to Cluster Previs in Mod3` | Previs doesn't match the Precombines it was built from — will cause flickering |
| `Error: CELL xxxxxxxx Cluster Previs is outdated due to later LAND override (of Mod2)` | Terrain changed after Previs was built — occlusion issues likely |
| `Error: CELL xxxxxxxx Precombines are outdated due to later update of REFR yyyyyyyy (of Mod2)` | Mod2 changed a precombined reference after Precombines were built — change won't be visible |
| `Error: CELL xxxxxxxx has Precombined Reference that was Deleted but still visible` | Mod moved/deleted a precombined reference without rebuilding — object still appears at original location |
| `Error: CELL xxxxxxxx is from ESL flagged mod yet has precombines — which won't work` | Game does not support Previsbines in ESL-flagged plugins — contact the mod author |
| `Error: CELL xxxxxxxx has blank XPRI which will make Invisible the reference REFR yyyyyyyy` | A blank XPRI override will cause that reference to become invisible |

### Issue Messages (Must Be Resolved)
| Message | Meaning |
|---|---|
| `Issue: CELL xxxxxxxx Found loose Previsbine file — It will hide problems from this script` | Loose Previs files present; must be packed into BA2 before building |
| `Issue: CELL xxxxxxxx Cant find any Mod Archive that provided uvd file for Cluster yyyyyyyy` | Previs files not in any mod archive; conflict detection unreliable — check this cell in-game after patching |
| `Issue: CELL xxxxxxxx No VISI date for uvd on CELL yyyyyyyy (of Mod2)` | Previs generation date was manually erased; report to PJMail |
| `Issue: CELL xxxxxxxx is from ESL flagged mod so cannot have precombines built` | New cells in an ESL plugin — game limitation; report to mod author |

### Seed Building Messages
| Message | Meaning |
|---|---|
| `Warning: Seed Masters Contain nn Reference Handles, which is too many for unpatched CK` | Set `bBSPointerHandleExtremly=true` in CKPE |
| `FATAL: Seed will cause CK to create patches with nn Masters, which is more than they can handle` | Over 254 masters — try unticking "Rebuild Visibility on effected Adjacent Clusters" and regenerate |
| `Error: Failed to add override <sig> xxxxxxxx` | Failure generating the seed — seed is probably broken; report to PJMail |

---

## Suggested Mod Grouping for Previsbine Generation

Group mods by area to minimise rebuild chore when a mod is updated. Example:

- **Envy's Nukaworld Reborn:** Only load those mods + PRP in FO4Edit. Highlight Envy's mods → Run Script → FO4Check_Previsbines → Task 2.
- **Atomic World (new worldspaces):** Load just AW mod. Select it → Run Script → Task 3 for new cells only. Build a patch. Then treat the remaining commonwealth content as a normal mod.
- **Tales of the Commonwealth (region names):** Load only 3DNPC_FO4.esp + Region Names on Save Files.esp. Highlight 3DNPC mods → Run Script → Task 4. Name the patch `3DNPC_Regions_patch.esp`.

---

*Credit: All script code, documentation, and this guide by PJMail — PJM's Precombine - Previs Patching Scripts, Nexus #69978. Updated V4.8e July 2025 / V4.9 Feb 2026.*
