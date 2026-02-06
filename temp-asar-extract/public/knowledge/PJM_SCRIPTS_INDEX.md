# PJM Scripts Index + Setup

This is a consolidated index of the PJM xEdit scripts and the automated builder, with quick install notes and cross-links to the workflow guides in this repo.

Note: The scripts currently reside in your SteamLibrary path (outside this workspace). Installation should be done into the `Edit Scripts` directory under your xEdit/FO4Edit installation.

---

## Quick Installation

- Copy all `*.pas` files from your PJM archive into `Edit Scripts` under your xEdit directory.
- Place `GeneratePrevisibines.bat` alongside your xEdit executable for best results.
- Ensure CKPE is installed and `steam_appid.txt` contains `1946160` where applicable (see deep dive).

Example (PowerShell, adjust paths):

```powershell
# Source: PJM archive directory
$src = 'D:\SteamLibrary\PJMScripts-69978-4-6-1741525513\Edit Scripts'
# Destination: your xEdit installation's Edit Scripts
$dst = 'C:\Tools\FO4Edit\Edit Scripts'
# Copy scripts (overwrite existing)
Copy-Item -Path "$src\*.pas" -Destination $dst -Force

# Copy automated builder next to xEdit
Copy-Item 'D:\SteamLibrary\PJMScripts-69978-4-6-1741525513\GeneratePrevisibines.bat' 'C:\Tools\FO4Edit' -Force
```

---

## Automated Builder

- `GeneratePrevisibines.bat`
  - Fully automated Previsbine build script.
  - Autodetects CK/xEdit paths; can be hardcoded if needed.
  - Validates environment (CKPE, logging, Archive2, etc.) and writes a comprehensive log.
  - Build modes:
    - `clean` (default): builds `.csg` + `.cdx` (PC standard)
    - `filtered`: large, no `.csg/.cdx` (Xbox/PlayStation compatible)
    - `xbox`: filtered + Xbox compression for BA2
  - Accepts `<modname.esp>` to run non-interactively against a specific seed/patch.

---

## Core Scripts (with roles)

- `FO4Check_PreVisbines.pas`: Detects previsbine conflicts; can build a seed patch for GeneratePrevisibines.
- `FO4MergeCombinedObjectsAndCheck.pas` / `Batch_FO4MergeCombinedObjectsandCheck.pas`: Merge CombinedObjects with sanity checks; batch version for CLI.
- `FO4MergePreVisandCleanRefr.pas` / `Batch_FO4MergePreVisandCleanRefr.pas`: Merge Previs, clean temporary REFRs (EDID starts `PleaseRemove`), ensures ‘No Previs’ flag logic; batch version.
- `FO4FindNewPCStatics.pas`: Find problematic precombineable meshes that crash CK; can exclude offenders.
- `FO4CheckPrevisbineAssets.pas`: Verify that a mod’s `- Main.ba2` contains only expected previsbine assets referenced by its ESP.
- `FO4CleanPrevisPatchMasters.pas`: Smart cleanmasters for previs patches; retains masters that supply precombine/previs assets.
- `FO4MergePrevisPatchIntoMaster.pas`: Merge a previs patch back into the original (cleaned) mod.
- `FO4RemovePrecombines.pas`: Remove previsbine info from a mod (VISI/PCMB/XPRI/XCRI), preparing for rebuild.
- `FO4CopyCellchangesToPatch.pas`: Bring forward Lighting/Fog/Weather/etc. from a target mod into a patch without breaking precombines.
- `FO4CountUnprecombinedRefs.pas`: Count unprecombined refs to decide performance value of building precombines.
- `Worldspace browser with PrevisCheck.pas`: Visualize cell/cluster overlays, conflicts, and asset presence.
- `FO4MergelatestCellsIntoOverride.pas`: Merge latest cell changes into an override (utility).
- `FO4CreateMHDTPatch.pas` / `FO4CreateMHDTPatchFromOverride.pas` / `FO4CopyMHDTtoWinningOverride.pas`: MHDT merge/extraction workflows.
- `Copy_version_control_info_from_another_plugin_Redux.pas` / `Merge overrides into master with VCI1.pas`: VCI1 fixes and safer merges.
- `FO4CheckRVIS.pas` / `FO4AddFixRVIS.pas` / `FO4SetRVISifMissing.pas`: Validate/fix/add RVIS for exterior cells.
- `count_loaded_refs_in_load_order_CK.pas`: Count references CK will attempt to load (useful vs 2,097,152 limit).
- `FO4RemoveITMMatswapREFR.pas`: Remove temporary material-swap overrides used during builds.
- `FO4SetTimeStampToToday.pas` / `FO4SetTimeStampToTodayIfNone.pas` / `FO4SetRefrTimestampToParentIfNone.pas`: VCI1 timestamp adjustments.
- `Exo-ESLifier.pas`: ESLify without breaking existing saves.

---

## Usage Workflows (see linked guides)

- Generating inside an existing mod: [GENERATING_PREVISBINES_FOR_EXISTING_MOD.md](GENERATING_PREVISBINES_FOR_EXISTING_MOD.md)
- Patching scripts overview and quick guide: [PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md](PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md)
- Lighting & environment patches (CELL config forwarding): [CREATING_LIGHTING_ENVIRONMENT_PATCHES.md](CREATING_LIGHTING_ENVIRONMENT_PATCHES.md)
- CK crash troubleshooting: [RESOLVING_CREATION_KIT_CRASHES.md](RESOLVING_CREATION_KIT_CRASHES.md)
- Deep dive fundamentals: [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md)

---

## Notes

- Run the builder and scripts via MO2 when applicable; ensure Steam is running to avoid prompts.
- For `clean` builds, avoid spaces/hyphens in plugin names (CK `.cdx/.csg` naming quirks).
- Disable ENB/DXGI wrappers during CK operations (the batch script temporarily renames them).
- Always archive precombines (`meshes/precombined`) and vis files (`vis`) to the patch’s `- Main.ba2` to keep CK handle counts manageable.

---

## Acknowledgements

- PJM: Script suite and builder workflow.
- xEdit/FO4Edit team: Extensible scripting platform.
- CKPE maintainers: Creation Kit reliability and logging.
- PRP contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Tool authors (BSArch/Archive2): Packaging tools adopted in workflows.
