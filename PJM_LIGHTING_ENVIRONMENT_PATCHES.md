# PJM's Guide — Creating Lighting and Environment Patches

**Source:** PJM's Precombine - Previs Patching Scripts, Nexus #69978  
**Author:** PJMail  
**Requires:** FO4Check_Previsbines.pas V4.9 or later

---

## The Issue

Lighting, Fog, Ambient Music, Weather, and Location are all contained in **CELL records**. Mods that modify these settings will (not just can) cause Previs issues in your load order.

The safest approach is placing such mods **before (above)** Previs mods like PRP — however, this causes PRP's previs data to overwrite their intended changes.

PJM's `FO4CheckPrevisbines.pas` xEdit script solves this. Place all your Lighting/Fog/etc mods before PRP, then run the script and choose **option 4 — "Fix only Cell Config Conflicts (Region/MHDT/Lighting/Weather/Fog etc)"**. The resulting patch is placed at the end of your load order (after all Previs mods) and carries forward all the lighting/weather/environment changes that were overridden by later mods — while keeping all Precombine information intact.

---

## How It Works

The script looks for the **last change (override)** of each particular CELL field that:
- Does not revert the field back to Base Game settings
- Is not blank

That value is merged with the winning CELL override (containing the current Previs data) into the patch.

### Example

With a load order like:

```
Base Game, other mods, etc.
Lighting Mod          (changes lighting data in Cell A)
PRP                   (adds Previs to Cell A, but resets lighting data back to Base Game values)
Previs Patches        (new Previs for Cell A, but also resets lighting data to Base Game)
```

The resulting patch will contain the **new Previs data** from the Previs Patches, but the **Lighting data** from the Lighting Mod.

> If multiple mods make conflicting new changes to the same cell, you may need to manually edit the patch to select the desired values.

---

## Creating a Full Load Order Lighting/Environment Patch

1. Make sure all Lighting/Weather/Fog mods are placed **before** PRP in your load order.
2. Open FO4Edit with your full load order loaded.
3. Right-click on any mod → **Apply Script** → choose `FO4Check_Previsbines.pas`.
4. Select **"4) Fix only Cell Config Conflicts (Region/MHDT/Lighting/Weather/Fog etc)"**.
5. Change the Patch name to something suitable (e.g. `LightingEnvPatch`).
6. Click **OK** and let it run.
7. Place the resulting patch **at the end of your load order**, after all Previs mods.

---

## Creating a Patch for a Single Mod (e.g. a PRP patch for Ultra Interior Lighting)

1. Make sure your load order is correct (e.g. `PRP.esp` placed **after** your Lighting mods).
2. Open FO4Edit. In the **Module Selection** screen, right-click → **Select None**, then tick only the mods the patch covers (e.g. `PRP.esp` and `UltraInteriorLighting.esp`).
3. Press OK and wait for them to load.
4. Right-click on the mod you are creating the patch **for** (e.g. `UltraInteriorLighting.esp`) → **Run Script** → choose `FO4Check_Previsbines.pas`.
5. Choose **"4) Fix only Cell Config Conflicts (Region/MHDT/Lighting/Weather/Fog etc)"** and **"Only what you highlighted in xEdit"**.
6. Change the Patch name, then click **OK**.
7. Place the resulting patch after `PRP.esp` in your load order.

This produces a distributable patch exactly like the PRP-compatibility patches found on Nexus.

---

## Bringing Forward Changes When Load Order Cannot Be Reordered

Sometimes you cannot reorder mods to resolve conflicts. For example, you must maintain:

```
Base Game, other mods, etc.
Lighting Mod 1        (changes you want)
Lighting Mod 2        (must be here)
PRP
```

But you want **Lighting Mod 1's** specific changes.

**Solution:** Run `FO4CopyCellchangesToPatch.pas` against **Lighting Mod 1**. This creates a patch containing only that mod's Cell changes (Lighting, Fog, Weather, etc.) in a way that does not break Precombines. Place this patch at the very end of your load order.

---

## CELL Fields Checked and Forwarded

The following **CELL** record fields are checked and brought forward by option 4:

| Field | Description |
|---|---|
| `MHDT` | Max Height Data (for flying vehicles) |
| `XCLR` | Regions (cumulative list of all regions in every override) |
| `EDID` | EditorID |
| `XCLL` | Lighting |
| `XLCN` | Location |
| `XCMO` | Music Type |
| `XEZN` | Encounter Zone |
| `XCAS` | Acoustic Space |
| `XCIM` | Image Space |
| `XGDR` | God Rays |
| `XCCM` | Sky / Weather |
| `XCWT` | Water |
| `XWCU` | Water Velocity |
| `XCLW` | Water Height |
| `XILW` | Exterior LOD |
| `LTMP` | Lighting Template |

**Cell Flags also checked:**
No LOD Water, Show Sky, Use Sky Lighting, Distance LOD only, Has Water, Sunlight Shadows, Can Travel From Here, Player Followers Can't Travel Here, Public Area, Hand Changed, Can't Wait, Off Limits.

### WRLD Fields Also Checked and Forwarded

| Field | Description |
|---|---|
| `MHDT` | Max Height Data (for flying vehicles) |
| `XWEM` | Water Environment Map |
| `ICON` | Map image |
| `XEZN` | Encounter Zone |
| `CNAM` | Climate |
| `LTMP` | Lighting Template |
| `XLCN` | Location |
| `NAM2` | Water |
| `NAM3` | LOD Water Type |
| `ZNAM` | Music |

---

## Notes

- This technique has been used to successfully create patches like those in the PRP updates download for **Clarity** and similar mods.
- Option 4 is also included automatically when you run option 1 ("Fix all Cell Previs/config conflicts") — you do not need a separate run if you already built a full fix-all patch.
- Requires **FO4Check_Previsbines.pas V4.9** or later.

---

*Credit: PJM's "Creating Lighting and Environment Patches" article by PJMail — PJM's Precombine - Previs Patching Scripts, Nexus #69978.*
