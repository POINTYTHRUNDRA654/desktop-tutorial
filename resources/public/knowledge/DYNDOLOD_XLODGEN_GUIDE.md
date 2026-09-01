# DynDOLOD & xLODGen LOD Generation Guide (Fallout 4, 2026)

Any flora overhaul, new worldspace, or landscape retexture mod that adds visible objects or changes terrain **must generate LOD** or distant objects will pop in abruptly, terrain will appear flat at distance, and performance will suffer. This guide covers the full xLODGen + DynDOLOD pipeline for Fallout 4.

---

## 1. What LOD Is and Why It Matters

LOD (Level of Detail) is the system that renders distant geometry, terrain, and objects at reduced polygon/texture cost. Fallout 4 uses four LOD tiers:

| Tier | Distance | Description |
|---|---|---|
| LOD4 | 0–50m | Near full-detail (used for transitions) |
| LOD8 | 50–150m | ~50% polygon reduction |
| LOD16 | 150–500m | ~10% polygons — terrain + billboard trees |
| LOD32 | 500m+ | Terrain silhouette only |

Without correct LOD data:
- Distant plants/trees simply don't exist → ugly sudden pop-in
- Terrain appears completely flat at distance (no normal maps)
- Performance degrades because full-detail meshes are used beyond their intended range

---

## 2. Tools Required

| Tool | Purpose | Download |
|---|---|---|
| **xLODGen** (terrain + object LOD) | Generates terrain LOD meshes, terrain normal maps, static object LOD | GitHub: Xenox2/xLODGen — use FO4 build |
| **DynDOLOD** (dynamic + tree LOD) | Generates tree LOD billboards, dynamic object LOD, rules-based swaps | DynDOLOD.us |
| **TexGen** (part of DynDOLOD suite) | Bakes tree/plant billboard textures into LOD atlases | Same download as DynDOLOD |
| **xEdit / FO4Edit 4.0.4+** | Required by DynDOLOD for record reading | Nexus #0 (official) |
| **Mod Organizer 2 or Vortex** | Required to run tools with correct mod list VFS | MO2 recommended |

---

## 3. xLODGen — Terrain LOD

xLODGen generates terrain heightmap meshes and normal map textures for LOD tiers.

### Setup

1. Download xLODGen, extract to a standalone folder (e.g. `C:\LODTools\xLODGen\`)
2. Add as an executable in MO2:
   - Executable: `xLODGen.exe`
   - Arguments: `-fo4 -lodlevel:4,8,16,32 -terrain -normalmap -o:"C:\LODOutput\xLODGen\"`
3. Run from MO2 (so it sees your mod list)

### Key Arguments

| Argument | Effect |
|---|---|
| `-fo4` | Fallout 4 game mode |
| `-lodlevel:4,8,16,32` | Generate all four LOD tiers |
| `-terrain` | Generate terrain heightmap LOD meshes |
| `-normalmap` | **Critical** — generates LOD terrain normal maps; without this, distant terrain is flat and textureless |
| `-grassonly` | Generates only grass LOD (run separately for grass-heavy mods) |
| `-o:"path"` | Output folder for generated files |

### Terrain LOD Settings (INI)

In `xLODGen.ini`:
```ini
[TerrainLOD]
fLandLODTargetSize=512    ; LOD texture resolution per chunk (256=fast, 1024=high quality)
fLandLODNormalMapStrength=1.0
bGenerateCompressedTextures=true  ; BC3 compression for LOD textures
```

### Installing Output

Copy the contents of the xLODGen output folder into your mod list as a new mod (e.g. "Overhaul LOD - xLODGen Output"). Load it after all landscape/terrain mods.

---

## 4. TexGen — Billboard Texture Atlas

TexGen bakes individual tree and plant textures into LOD billboard atlases. Run before DynDOLOD.

### Setup

1. Open MO2 → Executables → Add TexGen
   - Executable: `TexGenx64.exe`
   - Arguments: `FO4`
2. Run TexGen from MO2

### TexGen Settings

| Setting | Recommended Value | Notes |
|---|---|---|
| Output Resolution | 512 per billboard | 256=fast, 1024=high quality, diminishing returns past 512 |
| Compress Textures | BC3 | Always compress — uncompressed LOD atlases waste VRAM |
| Trees LOD Brightness | 1.0 | Adjust if trees appear washed out at distance |

### Output Installation

Install the TexGen output as a separate mod: "Overhaul LOD - TexGen Output". Load after xLODGen output, before DynDOLOD output.

---

## 5. DynDOLOD — Dynamic & Object LOD

DynDOLOD generates LOD for all visible objects, handles dynamic state (activated/destroyed object LOD swaps), and processes tree/plant billboards.

### Setup

1. Open MO2 → Executables → Add DynDOLOD
   - Executable: `DynDOLODx64.exe`
   - Arguments: `FO4`
2. Install DynDOLOD Scripts: place the `DynDOLOD\` folder from the DynDOLOD download into your mod list
3. Install DynDOLOD Resources SE/FO4: the additional meshes/textures the tool uses

### DynDOLOD Modes

| Mode | Use Case | Notes |
|---|---|---|
| **Low** | Performance testing | Minimal LOD — not for release builds |
| **Medium** | Balanced (recommended default) | Good quality/performance ratio |
| **High** | High-end systems | Higher res billboards, more object LOD |
| **Ultra Trees** | Maximum tree fidelity | 3D tree LOD instead of flat billboards — expensive |

### Key DynDOLOD Settings

| Setting | Value | Description |
|---|---|---|
| Tree LOD Billboard | Enabled | Always enable for flora mods |
| Ultra Trees | Optional | 3D tree LOD — use only on high-end systems |
| Object LOD | Medium | Covers all non-tree statics at distance |
| Dynamic LOD | Enabled | For workshop objects and dynamic state changes |
| Grass LOD | Enabled if using grass overhaul | Requires xLODGen -grassonly run first |
| Output path | `DynDOLOD_Output\` | Install as separate mod after running |

### DynDOLOD Rules for Custom Flora

For custom plants/trees added by your mod to appear in LOD:
1. Your NIF must have a `BSLODTriShape` node with the `_1.nif`, `_2.nif`, `_3.nif` LOD mesh variants (or a billboard texture)
2. Add a DynDOLOD rule in `DynDOLOD\Edit Scripts\DynDOLOD\Rules\` for your plant FormID range
3. Billboard mode: export a flat-facing quad with the plant silhouette texture (1024×1024 DDS BC3) named `<meshname>_lod.dds`

### NIF LOD Mesh Requirements

```
MyPlant_0.nif    ← Full detail (0–50m)
MyPlant_1.nif    ← LOD8 (50–150m) — 50% poly, simplified collision removed
MyPlant_2.nif    ← LOD16 (150–500m) — single quad billboard or 10% poly
MyPlant_3.nif    ← LOD32 (500m+) — single flat quad
```

All LOD meshes must use the LOD shader flag in BSLightingShaderProperty: `SLSF2_LOD_OBJECTS`.

### Installing DynDOLOD Output

Install "Overhaul LOD - DynDOLOD Output" as the **last mod** in your load order. It must come after:
1. xLODGen terrain output
2. TexGen output
3. All other mods (DynDOLOD bakes references from your entire load order)

---

## 6. Load Order for LOD Mods

```
[All landscape/flora content mods]
Overhaul LOD - xLODGen Output         ← terrain heightmaps + normals
Overhaul LOD - TexGen Output           ← billboard texture atlases
Overhaul LOD - DynDOLOD Output         ← all object + tree LOD (LAST)
```

**Regenerate LOD whenever you:**
- Add or remove any mod that places static objects outdoors
- Change any landscape/terrain texture
- Add new plant/tree meshes
- Change the position of existing outdoor objects

---

## 7. Grass LOD Workflow

Grass is handled separately from object LOD:

1. Run xLODGen with `-grassonly` flag after all grass mods are installed
2. In `Fallout4.ini` set `[Grass] bAllowCreateGrass=1`
3. Install xLODGen grass output as a separate mod

Grass LOD prevents the visible line of grass appearing/disappearing at the grass draw distance.

---

## 8. Performance Budget Guidelines

| LOD type | Safe limit | Notes |
|---|---|---|
| Unique object LOD meshes | < 2,000 per worldspace quadrant | Beyond this, LOD generation slows drastically |
| Billboard texture atlas size | 4096×4096 max | One atlas per tree type; DynDOLOD auto-packs |
| Terrain LOD texture resolution | 512 per chunk | 1024 only for showcase areas near player |
| DynDOLOD active dynamic swaps | < 500 per cell | Each swap costs a Papyrus update check |

---

## 9. Quick-Reference Checklist

- [ ] Custom NIF meshes have LOD variants (`_0`, `_1`, `_2`, `_3`)
- [ ] LOD meshes use `SLSF2_LOD_OBJECTS` shader flag
- [ ] Billboard texture exported at 1024×1024 BC3
- [ ] xLODGen run with `-terrain -normalmap` — output installed as mod
- [ ] TexGen run — output installed after xLODGen output
- [ ] DynDOLOD run — output installed last
- [ ] Grass LOD generated with xLODGen `-grassonly` if using grass overhaul
- [ ] LOD regenerated after any landscape/object placement change

---

## 10. Common Errors

| Error | Cause | Fix |
|---|---|---|
| "LOD mesh not found" in DynDOLOD log | Missing `_1.nif` LOD variant | Create LOD mesh or add DynDOLOD billboard rule |
| Distant terrain appears completely flat | xLODGen run without `-normalmap` | Re-run xLODGen with `-normalmap` flag |
| Plants pop in at close range | DynDOLOD output installed in wrong order | Ensure DynDOLOD output is the last mod |
| LOD trees are black silhouettes | TexGen not run / wrong output path | Run TexGen, install output before DynDOLOD |
| DynDOLOD crashes on start | xEdit version mismatch | Update to FO4Edit 4.0.4+ |

*Last updated: May 2026. Applies to xLODGen build 97+ and DynDOLOD 3.00.x for Fallout 4.*
