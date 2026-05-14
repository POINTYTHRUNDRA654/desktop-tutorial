# PJM's Precombine - Previs Patching Scripts

**Source:** Nexus #69978 — https://www.nexusmods.com/fallout4/mods/69978  
**Author:** PJMail

For experienced patch mod creators who want to:
- Find/fix flickering (occlusion) issues in-game
- Merge Lighting/Weather/etc changes without breaking Previs (see article)
- Create PRP patches for Mods
- Add Precombines/Previs to their own Mod (see article)

The Deep Dive article contains the latest information on everything Precombines/Previs (still a WIP as of 2026), including common CreationKit failures. More details on CK crashes can be found in the Resolving Creation Kit Crashes article. The scripts in this mod are also the most up-to-date for this task. Everything else found on the Internet/Nexus is incomplete.

Version notes:
- **V4.9 PJMScripts bundle** contains the latest released scripts as of **18 Feb 2026**.
- `FO4_CheckPrevisbines.pas` and `GeneratePrevisibines.bat` found under **Updated Files** are newer than the base kit — use those versions.

---

## Mandatory Requirements

- FO4Edit.exe/xEdit (or FO4Edit64.exe) **V4.1.5f or later**.
- **FO4 CreationKit.** If using the Steam version, read the FAQ post for extra steps.
- **CKPE (Creation Kit Platform Extended)** version appropriate for your CK version.
  - **CKPE V0.6 b639 or later** is preferred when possible.
- The latest **PJMScripts V4.9** contents extracted into the directory your FO4Edit.exe/xEdit.exe is located.
- Any updates to the above scripts (found under the **Updated Files** tab).
- Willing to read the FAQ post and follow its instructions.

### Optional useful tools

- **Auto Cell Display Ring** — in-game cell/cluster border display.
- Console commands **TPC** and **TB** for testing whether Previs is enabled in a cell.
- **Worldspace browser with `PrevisCheck.pas`** — visualizes Precombine/Previs cell conflicts between mods on the worldspace map.

---

## Instructions

### 1) Install FO4Edit/xEdit

- Install FO4Edit/xEdit from Nexus or the latest xEdit Discord release.

### 2) Download & install the Creation Kit and CKPE

- Install the **Creation Kit** from Steam.
- Install **CKPE** into the same directory as `Fallout4.exe`.
- If you downgraded your game from NG/AE to OG, downgrade CK too.
- If you must use a CKPE version earlier than 0.6 on downgraded CK:
  - Convert BA2 archives to **V1** with Collective Modding Toolkit.
  - Replace `Fallout4 - Interface.ba2` and `Fallout4 - Shaders.ba2` with OG versions.
  - Set `bOwnArchiveLoader=false` and `bBSPointerHandleExtremly=true` in `CreationKitPlatformExtended.ini`.

### 3) Download & extract the latest PJMScripts archive

- Manually download the archive (**DO NOT** use a mod manager).
- Extract it into the directory containing FO4Edit/xEdit.
- All `*.pas` files go into the `Edit Scripts` subdirectory.
- Download **all updated files** and overwrite the extracted versions.

### 4) Read the stickied posts and articles for how-to information

- Check the stickied post **Your PC setup REQUIRED to successfully build Previsbines!**
- Read **Important things to know - READ THIS!**
- Read the **Help and FAQ** article.
- Read the **Previsbines Deep Dive** article if you want the full technical background.

### 5) Build Previs patches for your game

As per the information on the stickied FAQ post, examples of what you can do:
- Find all the Cells in your game that will have visual issues (flickering)
- Fix all flickering, conflicting Lighting changes, PRP compatibility, etc. for your full load order
- Create a specific Previsbine patch for a mod that doesn't have them (to improve its performance)
- Create a patch for PRP to fix missing Region-names, Lighting (ELFX), Fog, music etc. changes added by mods

---

## Quick guide: Build a patch to fix all issues

Spoiler:  Show

- Resolve all normal mod conflicts with patches to your load order before fixing precombines — they should be your last step.
- Make sure you have installed the latest xEdit (**V4.1.5f at least**) somewhere.
- Download all the scripts from this mod (the **PJMScripts** kit + any updates) and put them, and `GeneratePrevisibines.bat`, in xEdit's directories.
- Run the `Fallout4Launcher.exe` (once) in your Fallout 4 directory and immediately exit (don't start the game) — so it knows where `Fallout4.exe` is.
- Make sure you have CreationKit installed (from Steam) into this same directory.
- Make sure you have the latest **CKPE** installed for your CK version.
- If using downgraded FO4/CK, apply the archive/version fixes from the FAQ and keep `bBSPointerHandleExtremly=true`.
- If using **MO2** then register FO4edit/xEdit and `GeneratePrevisibines.bat` as "Executable programs" — specifying the AppID **1946160**.
- If **NOT** using MO2 then create the text file `steam_appid.txt` containing a single line with the text **1946160**.
- Make sure Steam has been started (running in the background) — otherwise `GeneratePrevisbines.bat` will be messed up by steam prompts.
- Start `FO4Edit64.exe` (or `xEdit64.exe`) so it loads your entire load order (via MO2 if using that) — confirm module selection.
- Right-click anywhere and **Apply script...**, select `FO4Check_Previsbines.pas`, press OK.
- Click the **"1) Fix all Cell Previs/config conflicts"** option and click OK. Wait a LONG time (1hr+) until it completes.
- If the last line is **"Generation Complete"** then exit FO4edit/xEdit (saving) and run `GeneratePrevisibines.bat` (via MO2 if using that).
- Give your Previs patch a name (like `FinalPrevisPatch`), press **Y** to use `xPrevisPatch.esp`, and wait a VERY LONG time (6hr+) until it completes.
- If it won't run (says your Precombine/Previs directories are **not Empty**) then your load order has Mods with **Loose** previs files — it **won't work**!
- If it says **"Build of Patch yourpatchname Complete."** then place the resulting Patch (4 files) at the **BOTTOM** of your load order. DONE!
- (optional) To remove unnecessary masters from your Patch: load **just your patch** in xEdit, Right-click on it → **Apply script...** → select `FO4CleanPrevisPatchMasters.pas`, press OK. **Never** run this more than once, and **never** use xEdit's "Clean Masters".
- If any operation did not complete as described then refer to Help and FAQ and Resolving Creation Kit Crashes articles.

---

## Major scripts in this mod

### FO4Check_Previsbines.pas

xEdit script with a tasks-based GUI, also offers finer control via the **Advanced** button.

- Can be used on its own to find all Previsbine issues introduced by mod conflicts without going in-game to look for visual issues, and (optionally) builds a **seed** patch to feed into `GeneratePrevisibines.bat`.
- Can also create a patch to add missing regions (e.g., from 'region names on saves') as well as Locations, EditorIDs, Weather and Lighting effects (e.g., from ELFX), and MHDT info deleted/overwritten by other mods (or PRP). Full details in the Guide.

### GeneratePrevisibines.bat

Windows CMD script to fully automate generation of Previsbines without manual intervention.

- Used with seed generated by FO4Check_Previsbines in a 2-step process to generate Previsbines (Precombines and Previs) for all your needs.
- Can be used on **any mod** to generate Previsbines for it (much simpler and smaller than manual CK GUI generation).

### FO4FindNewPCStatics.pas

xEdit script to locate/exclude problem Precombineable meshes that will crash the CK.

- Can be run against multiple mods (only updates last mod in xEdit).
- FO4Check_Previsbines will automatically exclude most bad meshes; run this only if you still get a crash building Precombines, then run against suspect mods (or everything — will be slow!).
- Use **"Exclude Bad?"** to exclude found offenders so they won't crash the CK.

### AutoCellDisplay (FO4 mod)

Shows you where you are when you find visual issues.

- Wear this craftable ring to see Cell borders in-game and their details (to find in FO4Edit).
- Blue walls: Cell borders; Purple walls: Cluster borders.
- Crouch (sneak) to display your current location.

### Worldspace browser with PrevisCheck.pas

xEdit script with extra options to visually see Precombines/Previs.

- Shows the extent a mod affects cells (and thus previsbines). Right-click on any cell to get details.
- Overlay multiple mods; use **Select colour** to change for each overlay.
- Indicators:
  - Dotted Cell outline — Cell override found in Mod.
  - Solid Cell outline — Cell override includes new/updated precombineable References (REFR).
  - Dotted slant — Cell has new Previs file supplied by that Mod (Previs affects 3x3 exterior cells).
  - Solid slant — Cell has new Precombine files supplied by that Mod.

---

## Other scripts included

- FO4CleanPrevisPatchMasters.pas: Smart "cleanmasters" script designed for Previsbine patch mods (ONLY!).
- FO4MergePrevisPatchIntoMaster.pas: Smart merge of Previsbine Patch back into original master mod.
- FO4RemovePrecombines.pas: Remove Previsbine information from the mod it is run against.
- FO4MergeCombinedObjectsAndCheck.pas: Improved version of the original MergeCombinedObjects script.
- FO4MergePreVisandCleanRefr.pas: Improved version of the original MergePreVis script.
- FO4CheckPrevisbineAssets.pas: Validate a Previsbine mod's archive for expected files.
- FO4CopyCellchangesToPatch.pas: Create patch to restore cell settings overridden in selected mod.
- Merge overrides into master with VCI1.pas, Copy_version_control_info_from_another_plugin_Redux.pas: Enhanced versions of default scripts.
- FO4SetTimeStampToToday.pas, FO4SetTimeStampToTodayIfNone.pas, FO4SetRefrTimestampToParentIfNone.pas: VCI1 manipulation scripts.
- FO4RevertRefrVCSToPrevOverIfBenign.pas: Fix xEdit/CK habit of setting bad VCS on REFR overrides so that it disables Precombines unnecessarily.
- FO4CheckRVIS.pas, FO4AddFixRVIS.pas, FO4SetRVISifMissing.pas: Validate/Add/Fix RVIS on exterior cells.
- FO4CopyMHDTtoWinningOverride.pas, FO4CreateMHDTPatchFromOverride.pas, FO4MergeMHDTfromWinningOverride.pas: Extract/Merge MHDT between plugins.
- count_loaded_refs_in_load_order_CK.pas: Count total references in loaded plugins (CK without fixes fails above 2M).

Obsolete:
- FO4RevertPrecombines.pas (old name/version of FO4RemovePrecombines.pas)

Other files/scripts found in this mod are used internally by the `GeneratePrevisibines.bat` script.

---

## References

- See [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md) for background, CK failures, and troubleshooting.
- See Help/FAQ and Resolving Creation Kit Crashes articles for additional guidance.

---

## Acknowledgements

- PJM: Author of the scripts and core guidance referenced throughout.
- xEdit/FO4Edit team: Tooling that makes analysis and patching possible.
- CKPE maintainers: Stability and logging improvements for reliable CK runs.
- PRP contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Bethesda Game Studios: Fallout 4 base and toolchain.
- Community testers and mod authors: For reporting edge cases and sharing fixes.
