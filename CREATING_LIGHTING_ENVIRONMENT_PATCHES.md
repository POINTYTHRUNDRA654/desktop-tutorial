# Creating Lighting and Environment Patches

Total views: 3.0k

## The Issue

Lighting, Fog, Ambient Music, Weather, and Location are all contained in CELL records. Mods that modify these can (and will) cause Previs issues in your load order.

The safest way to handle such Mods is by placing them BEFORE (above) Previs mods (such as PRP). However, this disables their intended changes.

My `FO4CheckPrevisbines.esp` xEdit script can solve this. Place ALL your mods that modify Lighting, Fog, etc. before PRP, then run my script either against `PRP.esp`, or your entire load order. Choose the "Fix Cell Config (Region/MHDT/Lighting/Weather/Fog etc) Conflicts ONLY", change the Patch name to something suitable, and click "OK".

The resulting Patch should be placed towards the end of your load order (after any of your Previs Mods). It will bring forward all changes to lighting, weather, etc. that were overridden by later Mods — while keeping all the Precombine information intact.

I have successfully used this to create patches like those found in the PRP updates download for Clarity, etc.

## What it does

It looks for the last change (override) of the particular CELL fields that does not revert the field back to Base Game settings (and is not blank). This is merged with the winning CELL override (containing the current Previs data) into the Patch.

Example load order:

- Base Game, other mods, etc
- Lighting Mod (changes lighting data in cell A)
- PRP (adds Previs to Cell A, but resets lighting data back to Base Game values)
- Previs Patches (new Previs for Cell A, but also resets lighting data to Base Game)

The patch will contain the new Previs data, but the Lighting data from the Lighting Mod. If multiple mods make conflicting, new changes, you may need to modify the patch to use the desired values.

## Cell Values Checked

The following CELL fields are checked and brought forward:

- MHDT — Max Height Data (for flying vehicles)
- XCLR — Regions (cumulative list of all regions in every override)
- EDID — EditorID
- XCLL — Lighting
- XLCN — Location
- XCMO — Music Type
- XEZN — Encounter Zone
- XCAS — Acoustic Space
- XCIM — Image Space
- XGDR — God Rays
- XCCM — Sky/Weather
- XCWT — Water
- XWCU — Water Velocity
- XCLW — Water Height
- XILW — Exterior LOD
- LTMP — Lighting Template
- Cell Flags — No LOD Water, Show Sky, Use Sky Lighting, Distance LOD only, Has Water

The following WRLD fields are also checked/forwarded:

- MHDT — Max Height Data (for flying vehicles)
- MNAM — Map Data
- ICON — Map image
- XEZN — Encounter Zone
- CNAM — Climate
- LTMP — Lighting Template
- XLCN — Location
- NAM2 — Water
- NAM3 — LOD Water Type
- ZNAM — Music

## Bringing forward changes from a mod that cannot be ordered to win

Sometimes you cannot resolve conflicts by ordering mods. Suppose you need:

- Base Game, other mods, etc
- Lighting Mod 1
- Lighting Mod 2
- PRP

…but you want Lighting Mod 1's changes. Create a specific patch that brings its changes forward:

- Run the script `FO4CopyCellchangesToPatch.pas` against "Lighting Mod 1". It will create a patch that does not break precombines, to be placed at the end of your load order, containing Lighting Mod 1's changes.

Note: You need the latest version of `FO4Check_Previsbines.pas` (V4.7).

---

## References

- See [PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md](PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md) for setup, tooling, and broader patch workflows.
- See [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md) for background, Previs/Precombine fundamentals, and CK crash guidance.

---

## Acknowledgements

- PJM: Guidance and scripts enabling safe CELL/WRLD forwarding.
- xEdit/FO4Edit team: Inspection and scripting backbone.
- CKPE maintainers: Critical CK reliability improvements.
- PRP contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Mod authors (e.g., ELFX, clarity-related mods): Source of configuration changes this guide preserves.
