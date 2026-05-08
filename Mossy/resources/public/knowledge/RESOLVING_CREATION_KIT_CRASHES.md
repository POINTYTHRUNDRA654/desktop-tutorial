# Resolving Creation Kit Crashes when generating Precombines

Total views
1.2k

The most common failure while the Creation Kit is building Precombines is **Access violation 0xc000005** (or similar), normally due to a corrupt/incompatible mesh on a precombineable reference (REFR with base type STAT or SCOL). Below is a guide to finding and resolving these.

If Creation Kit does not start at all then your problem is not in a mod but your PC setup. See the stickied post on setting up your PC environment — particularly when using the Steam version of CK — as you MUST set up `steam_appid.txt` correctly AND (if using MO2) set up `FO4Edit.exe` and `GeneratePrevisbines.bat` as "Executables" with the correct AppID override.

---

## 1) Find the Cell that contains the problem references

You need the log from the Creation Kit for this. It will normally be something like `CK.log` (located in the same directory as `CreationKit.exe`). If you cannot find it then you probably did not specify a log in `CreationKitPlatformExtended.ini` as recommended — do so and repeat.

- Look for the last `DEFAULT: Generating for ...` line.
  - Interior cells will show the EditorID for that cell.
  - Exterior cells will show the Cell ID.

---

## 2) Check for problem meshes in the mods that touch this cell

1. Open xEdit/FO4Edit with JUST your Patch Mod selected, and go to this Cell.
2. In the right-hand pane, note the mods that touch this cell (ignore Base Game, DLCs, UFO4P and PRP/PPF). These are the first suspects.
3. While in xEdit, highlight/select ONLY these suspect mods (CTRL+click to select), right-click and **Apply script...**, choose `FO4FindNewPCStatics.pas`, OK.
4. The script scans those plugins for new meshes that will crash the CK and lists them with a `!` in front of their names.
5. If it finds some, click **Exclude bad** and it will update your Patch to exclude them.
6. Re-run the Precombine phase and check if the crash is resolved.

If nothing is found (or it still crashes at the same cell) then it could be a mesh replacer mod (these don't add Cell overrides).

---

## 3) Finding problems due to object replacement (mesh replacer) mods

The problem could be a mod that replaces objects themselves (e.g., "HD models").

- If you don't use mods with loose files (i.e. all mods have `<modname> - Main.ba2` archives):
  1. Load xEdit with ONLY your patch mod.
  2. Select ALL other mods (except your Patch Mod), right-click → **Apply Script...** → choose `FO4FindNewPCStatics.pas`, OK. This may take a long time.
  3. Again, look for meshes marked with `!`, exclude them, and retry the precombine phase.

- If your setup includes mods with loose files (or you’re unsure):
  1. Load your entire load order into xEdit.
  2. Run the above script against everything (except your patch mod). This will take a long time.
  3. If nothing is found, the issue may be a texture replacer.

---

## 4) Finding problems due to texture replacer mods

Corrupt textures can crash the CK too. These mods usually purport to "use less VRAM" or are "HD" replacements for common objects. It’s difficult to narrow down which mod is at fault for a particular cell crash unless you know the cell contains objects affected by a texture replacer — treat ALL texture replacers as suspect.

- Texture replacer mods will contain `<modname> - Textures.ba2` archives, or loose `.dds` files.
- If you only use texture replacers without loose files, focus on ones listed as a **Master** of your Patch Mod (in xEdit, click "File Header" to see "Masters").
- If you have mods with loose textures, all of those are suspect.

To isolate whether a texture replacer is at fault:

1. Temporarily disable ALL suspicious texture replacers (identified above).
2. Recreate your Patch and retry generating Precombines.
3. If it no longer crashes, selectively re-enable each texture mod until it crashes again to isolate the culprit.

Note: If a mod ONLY contains texture replacements, you do not need it enabled when generating a Previsbine Patch. Your new Previsbines will display whatever textures are available when the game is running.

---

## Generating Precombines for a single cell (for faster testing)

This can be useful during fault finding, as running a complete Precombine build to test fixes is time-consuming.

1. Load your complete load order in xEdit.
2. Find the target cell (search by FormID for exterior, or EditorID for interior).
3. Right-click the cell → **Apply script...** → choose `FO4Check_Previsbines.pas`.
4. In options, select "Build new Precomb/Previs if it Improves FPS or fixes Cell conflicts" (or whatever option you originally used), AND select "Only what you highlighted in xEdit", then OK.
5. This creates `xPrevisPatch.esp` you can use to test building just that one failing cell via `GeneratePrevisbines.bat`.

---

## How to manually exclude a reference from being precombined

Both `FO4Check_Previsbines.pas` and `FO4FindNewPCStatics.pas` exclude bad references automatically, but if you want to deliberately stop a REFR from being precombined (because it crashes the CK or you want to select it in-game), you can:

- Exclude a specific REFR by setting its `XLRT - Location Ref Type` to `NoObjectCombinationRefType`, or
- Exclude its base object (NAME - Base) by setting `FTYP - Force Loc Ref Type` to `NoObjectCombinationRefType`.

Note: Excluding the base object stops ALL references using that base object from being precombined — useful if the base uses a bad mesh.

---

Created: PJM Jun 2025

---

## References

- See [PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md](PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md) for tooling and patch workflows.
- See [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md) for fundamentals and broader CK issues.
- See [GENERATING_PREVISBINES_FOR_EXISTING_MOD.md](GENERATING_PREVISBINES_FOR_EXISTING_MOD.md) for end-to-end generation within an existing mod.

---

## Acknowledgements

- PJM: Crash diagnostics methods and automation scripts.
- xEdit/FO4Edit team: Discovery scripting and data inspection support.
- CKPE maintainers: CK logging and stability improvements.
- PRP contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Community reporters: Cell-specific crash reports that helped refine steps.
