# Jungle Navmesh and Precombines/Previs Optimization Guide

> **Note:** This is a Mossy-authored overview guide for dense-worldspace modding. For authoritative precombine/previs workflow details, file formats, and patching practice, refer to PJM's documentation: `PRECOMBINE_PREVIS_DEEP_DIVE.md`, `PJM_FO4CHECK_SCRIPT_GUIDE.md`, and `PJM_GENERATING_PREVISBINES_FOR_MOD.md` (all sourced from **PJMail**, Nexus #69978, aligned here to the **V4.9 / Feb 2026** guidance set).  
> **Additional credited references used in this guide:** GECK Wiki (ESM/header flagging practices), Sim Settlements community documentation (NMIM cleanup workflow), Steam Community hotkey references, tutorial/community references from **Felloutislife**, **Seddon4494**, and **Art Toots** for navmesh workflow conventions, plus material/texture workflow references from **InspirationTuts**, **r/blenderhelp**, **r/FalloutMods**, and Nexus forum discussions on Fallout 4 material packing.

To maintain high frame rates in a dense fungus jungle, mastering Navmesh and Precombines/Previs is non-negotiable. Fallout 4's Creation Engine relies heavily on these systems to prevent CPU and GPU bottlenecks.

---

## Part 1: Engine Architecture and Navmesh Safety (OG vs NG / AE)

Fallout 4's modern runtimes are stricter than older tutorial ecosystems imply. If you are teaching Glowing Sea-scale edits, the tutor should treat the following as baseline safety rules.

### NG / AE architecture notes

- **Native asset compatibility matters more now.** Older NIF/BGSM optimization tricks that were tolerated on older runtimes can destabilize modern executables.
- **Modern BA2 expectations:** Next-Gen/Anniversary teaching should assume modern DX10/DX11-era texture archive handling rather than legacy archive assumptions.
- **Physics expectations:** Next-Gen no longer depends on High FPS Physics Fix for basic >60 FPS stability the same way older setups did, but dense custom geometry still needs clean precombines/previs or the layout side of the engine will fall behind rendering.

### Core modern rules for large exterior navmesh projects

1. **Large exterior navmesh overhauls should be header-flagged as ESM.**  
   If you are rewriting navmesh across a massive continuous exterior area like the Glowing Sea, leave the `.esp` extension if that helps your CK workflow, but set the **ESM flag** in xEdit on the File Header.

2. **Delete `Navigation Mesh Info Map` (`NMIM`) after every CK navmesh session.**  
   The CK can generate a world-sized navmesh snapshot instead of saving only your localized edits. That creates compatibility-breaking wild edits and unnecessary plugin bloat. After saving navmesh work, open the mod in xEdit and delete the `Navigation Mesh Info Map` entry.

3. **Never delete vanilla navmesh.**  
   If you need to retire old triangles under mushroom canopies or terrain cover, move those triangles far below reachable space or neutralize their AI usefulness without removing the underlying vanilla record.

---

## Part 2: Navmesh (Navigation Mesh)

Navmesh tells non-player characters (NPCs) and companions where they can walk, jump, or find cover. Poorly optimized navmesh causes extreme CPU spikes and game crashes.

### Key Concepts

- **Triangle Budget:** Keep navmesh triangles large in open spaces and small only around obstacles.
- **Edge Connectivity:** Green lines mean triangles are connected; red lines mean broken paths where NPCs get stuck.
- **Navmesh Layers:** The engine uses specific layers for humanoids, large creatures, and water paths.

### Core hotkeys worth drilling into students

| Key / Shortcut | Function | Practical tutor context |
| --- | --- | --- |
| `Ctrl + E` | Toggle Navmesh Mode | Enter or exit the navmesh editor quickly |
| `B` | Toggle Cell Grid Borders | Critical for exterior work so seams line up cleanly across cells |
| `V` | Select Vertex Mode | Fine control over node placement and seam cleanup |
| `T` | Select Triangle Mode | Select full polygons to flag routes and behaviors |
| `Ctrl + Right Click` | Drop Vertex Node | Place a new node directly on terrain or collision |
| `A` | Form Triangle / Bridge | Build triangles from 3 vertices or bridge open edges |
| `Q` | Merge Vertices | Weld seams and repair broken border connections |
| `F` | Drop to Floor | Snap selected navmesh points onto collision/floor |

### Optimization Workflow

1. **Generate Automatically:** Use the Creation Kit's **Navmesh → Advanced → Generation** tool for a baseline.
2. **Manual Clean-up:** Simplify tiny, unnecessary triangles under large mushrooms or terrain, but do **not** delete vanilla navmesh records outright.
3. **Simplify Geometry:** Use fewer, larger triangles to span flat jungle floors.
4. **Vertex Welding:** Use **Q** to merge/weld vertices where needed so micro-gaps do not break NPC AI across seams.
5. **Cover Nodes:** Manually place cover nodes near giant fungal stalks so NPCs use them realistically.
6. **Preferred paths:** Flag the wide, readable jungle routes as **Preferred** so AI favors cleared paths instead of recalculating through clutter-heavy fungal geometry.
7. **Water handling:** If the jungle includes toxic pools, flooded basins, or creature-only water paths, explicitly assign the **Water** trait so humanoids avoid them correctly.

---

## Part 3: Precombines and Previs

This is the most critical step for an environmental mod. Without this, your jungle will drop to single-digit frame rates.

### Definitions

- **Precombines (`.nif` meshes + XCRI/PCMB cell fields):** Merges hundreds of individual 3D static meshes (trees, rocks, fungi) in a cell into one single mesh. This drastically reduces Draw Calls sent to the GPU.
- **Previs (`.uvd` files + VISI/XPRI cell fields):** A visibility system that determines exactly which geometry is hidden behind walls or terrain, preventing the engine from rendering what the player cannot see.

### Breaking the System

- Moving, scaling, or deleting any vanilla object breaks the precombine system for that cell.
- Disabling precombines (`bUseCombinedObjects=0` in INI files) ruins performance game-wide and **must never be used as a mod requirement**.

### Reconstruction Workflow

1. **Finalize Asset Placement:** Do not generate precombines until every mushroom, vine, and spore pod is permanently placed.
2. **Select Cells:** In the Creation Kit Cell View window, highlight all modified Glowing Sea cells.
3. **Generate Precombines:** In the CK go to **World → Precombine Geometry for Current Cell** (one cell at a time). See `PJM_FO4CHECK_SCRIPT_GUIDE.md` for the recommended automated approach using `GeneratePrevisibines.bat`.
4. **Generate Previs:** Go to **World → Generate Previs for Current Cells**.
5. **Pack Files:** Ensure the generated `.nif` (precombine meshes) under `Meshes/Precombined/` and `.uvd` (previs) files under `Vis/` are packed into your mod's main BA2 archive.

---

## Part 4: Naked Fungal Creatures Workflow

If you want fungal ambush predators or naked spore-mutants in the jungle, treat visuals, factions, and spawn logic as separate teaching tracks.

### Actor record and naked visuals

- Create a new Actor record such as `_FungalStalker`.
- Leave the **Inventory** tab empty if you want the creature to appear naturally "naked" rather than clothed by outfit records.
- On the **Traits** tab, use the **Skin** field to point at an Armor record that drives the creature's core fungal body mesh.

### Race, sound, and faction setup

- Pick a **Race** that matches the intended animation rig.
- Add the creature to factions that match your ecosystem logic, then define hostility against the player and any rival jungle factions you want to script into territorial fights.

### Spawn design: fixed vs dynamic

#### Method A: Fixed ambush markers

- Place an ambush marker in the jungle.
- Place your fungal actor nearby.
- Link the actor to the ambush marker using the proper linked-reference keyword.
- Use an ambush/sleeper style package so the creature hides until the player is close.

#### Method B: Dynamic leveled lists

- Create a `LeveledCharacter` such as `LL_FungalJungle_Easy`.
- Add multiple fungal creature variants at different levels.
- Replace native encounter markers or compatible spawn points with your custom leveled list so cells can repopulate cleanly.

---

## Part 5: Jungle-Specific Performance Hacks

### Mesh Optimization

- **LOD (Level of Detail):** Create low-polygon versions of giant mushrooms for distant viewing.
- **Collision Hulls:** Ensure your custom fungus models use simplified primitives (boxes/cylinders) for collision, not complex polygon-accurate hulls.

### Material and Lighting Optimization

- **Glow Maps:** Bioluminescent fungi should use emissive textures, not dynamic lights. Dynamic lights cast shadows and destroy FPS.
- **Alpha Blending:** Minimize overlapping transparent textures (like hanging moss or spore clouds), as they cause severe overdraw penalties.

### AI texture enhancement without upscaling

If Mossy is teaching an AI-driven texture enhancer, it should present the process as a **micro-detail refinement pass**, not as fake resolution growth.

1. **Frequency separation and luminance alignment:** Split the texture into low-frequency color/tone data and high-frequency surface detail, then flatten unwanted baked lighting so the albedo/base color stays neutral.
2. **Micro-contrast enhancement:** Sharpen existing pores, bark grain, scratches, and fungal fibers by adjusting local luminance relationships rather than enlarging the image canvas.
3. **Procedural material derivation:** Use the refined texture as a source for inferred roughness, AO, and normal detail generation so the material reads as richer without changing from 2K to 4K.

### Fallout 4 "TBR" material packing rules

For teaching purposes, treat Fallout 4's workflow as a **specialized packed specular/gloss pipeline** rather than a modern standalone roughness/AO pipeline.

- **Base Color + AO → `_d.dds`:** Bake ambient occlusion directly into the diffuse/base color using a multiply-style blend.
- **Roughness → invert to gloss:** Fallout 4 wants gloss-style behavior, so invert roughness before packing.
- **Gloss / inverted roughness → Green channel of `_s.dds`**
- **Specular / metallic intensity → Red channel of `_s.dds`**
- **Blue channel of `_s.dds` → pure black**

If the `_s.dds` blue channel contains garbage color data, wet fungal caps and slime surfaces can render with broken bright highlights or obviously incorrect color response.

### Normal map rules for strong 3D relief

- Export normal maps in **BC5 / DXN-style** form when possible for stable FO4-friendly tangent-space results.
- Build normal depth from **multiple scales**:
  - broad curvature for caps and terrain bulges
  - fine pore/fiber detail for fungal skin and bark
- Blend normals with a **normal-map-aware combine method**, not a flat opacity stack.
- If the lighting looks inverted in game, correct the **green channel / Y-axis** for FO4's DirectX-style normal interpretation.

### Specular tuning for fungus, slime, and wet surfaces

- **Matte organic pass:** Keep gloss values relatively dark for dry stalks, moss, and fibrous growth so light spreads softly.
- **Wet/slime pass:** Push gloss much brighter on wet caps, slime films, and droplets so glints stay tight and dynamic.
- **Environment reflections:** If you want convincing wet reflections, enable **Environment Mapping** in the BGSM and use an appropriate vanilla cubemap such as a Glowing Sea-style environment map.

The important teaching point is that shiny FO4 materials are created by the **combination** of packed `_s.dds` behavior and BGSM flags, not by the diffuse map alone.

---

## Part 6: Automated DDS Export + BGSM Matrix for NG/AE

When teaching Next-Gen/Anniversary workflows, emphasize that export automation should target modern DirectX-compatible compression and avoid legacy DDS handling paths that can produce unstable runtime behavior.

### Mandatory DDS compression profiles

- **Diffuse / Albedo (`_d.dds`)**: `BC7_UNORM` or `BC7_UNORM_SRGB`
- **Normal (`_n.dds`)**: `BC5_UNORM`
- **Specular / packed (`_s.dds`)**: `BC7_UNORM`

### Automation execution loop (DirectXTex / IntelTex style)

```bash
# 1) Diffuse (sRGB) with full mip chain
texconv.exe -f BC7_UNORM_SRGB -m 0 -y -o "Output/Path" "Input_diffuse.png"

# 2) Normal (BC5 tangent-space friendly)
texconv.exe -f BC5_UNORM -m 0 -y -o "Output/Path" "Input_normal.png"

# 3) Packed specular/gloss map (linear BC7)
texconv.exe -f BC7_UNORM -m 0 -y -o "Output/Path" "Input_specular.png"
```

### Numeric FO4 channel targets (teaching matrix)

| Material Type | Diffuse Alpha / Diffuse Treatment | Specular Red (Reflectivity) | Specular Green (Gloss) | Specular Blue (Safe) |
| --- | --- | --- | --- | --- |
| Wet Fungal Slime | Standard diffuse (full opacity) | 140,140,140 | 230,230,230 | 0,0,0 |
| Matte Moss / Fungi | Standard diffuse (full opacity) | 45,45,45 | 30,30,30 | 0,0,0 |
| Bioluminescent Flesh | Emissive-data mask strategy | 80,80,80 | 110,110,110 | 0,0,0 |
| Rusted Metal Scraps | Baked AO mixed over base color | 30,30,30 | 40,40,40 | 0,0,0 |
| Wet Glowing Mud | Dark ground-toned diffuse | 110,110,110 | 190,190,190 | 0,0,0 |

### BGSM generation matrix (blueprint for automation)

Use this parameter set as a teaching baseline for jungle-biome wet/fungal material behavior:

```json
{
  "Header": "BGSM",
  "Version": 2,
  "MaterialParameters": {
    "bTileTextureX": true,
    "bTileTextureY": true,
    "bEnvironmentMapping": true,
    "bSpecularEnabled": true,
    "fSpecularPower": 4.0,
    "fSpecularScale": 1.0,
    "fSubsurfaceLightingAlpha": 0.3,
    "fSubsurfaceLightingRollOff": 0.5
  },
  "TexturePaths": {
    "DiffuseTexture": "Textures\\\\YourMod\\\\Fungus_Jungle_d.dds",
    "NormalTexture": "Textures\\\\YourMod\\\\Fungus_Jungle_n.dds",
    "SmoothnessTexture": "Textures\\\\YourMod\\\\Fungus_Jungle_s.dds",
    "EnvironmentTexture": "Textures\\\\Shared\\\\Cubemaps\\\\CubeGlowingSea.dds"
  },
  "ShaderFlags": {
    "bGlowMap": true,
    "bEffectLighting": true,
    "bZBufferWrite": true
  }
}
```

### Binary compile teaching note

If you automate `.bgsm` generation in code, teach students to use a **known-good BGSM serializer or parser** and to write fields in strict engine order (header, version, scalar blocks, texture paths, flag blocks). Treat hand-rolled byte writers as advanced/debug tooling only, and always validate outputs in Material Editor and in-game.

---

## Part 7: Alpha-Test Foliage, BGSM Flag Math, and LOD Auto-Downsampling

### Automated alpha presets for fuzzy moss and spore cards

For dense jungle assets (fuzzy moss, hanging vines, spore cloud cards), teach students to prefer **alpha testing** over full alpha blending whenever possible.

- **Avoid** `bAlphaBlend=true` on high-density foliage cards because heavy overdraw and sort cost can become a frame-time bottleneck.
- **Prefer** `bAlphaTest=true` with a stable threshold for cutout-style foliage edges.
- Use `bTwoSided=true` for flat card geometry so both sides render.

```json
{
  "MaterialParameters": {
    "bAlphaTest": true,
    "uAlphaTestRef": 128,
    "bAlphaBlend": false,
    "bTwoSided": true
  }
}
```

Teaching interpretation:
- `uAlphaTestRef = 128` means darker alpha pixels are clipped and brighter pixels render fully, giving crisp edges for cards/leaves.

### BGSM flag/offset teaching matrix for glow + vertex color workflows

Use this section as an **automation curriculum profile** for BGSM flag composition and offset literacy:

| Hex Offset | Data Type | Parameter | Tutor purpose |
| --- | --- | --- | --- |
| `0x14` | `uint32` | `ShaderFlags1` | core material capability switches |
| `0x18` | `uint32` | `ShaderFlags2` | advanced lighting/reflection switches |
| `0x4C` | `float` | `fEmissiveMult` | emissive glow intensity |

Example bitmask composition lesson:

```python
# Shader Flags 1 (example profile)
Model_In_Sky_Reflections = 0x00000001
Fallback_Lighting        = 0x00000008
Specular_Enabled         = 0x00000200
Vertex_Colors_Enabled    = 0x00004000
ZBuffer_Write_Enabled    = 0x00008000

sf1_combined = Model_In_Sky_Reflections | Specular_Enabled | Vertex_Colors_Enabled | ZBuffer_Write_Enabled
# expected profile value: 0x0000C201

# Shader Flags 2 (example profile)
Glow_Map_Enabled         = 0x00000004
Assume_Shadowmask        = 0x00000010
Environment_Mapping      = 0x00000080

sf2_combined = Glow_Map_Enabled | Environment_Mapping | Assume_Shadowmask
# expected profile value: 0x00000094
```

> Keep this as a teaching/reference profile and validate final flag behavior in Material Editor plus in-game test cells before shipping.

### Automated LOD texture down-sampling pipeline

Teach students to generate lower-resolution LOD texture variants so distant assets do not keep loading full 2K/4K maps.

```python
import os
import subprocess

def generate_jungle_lod_textures(source_dir, output_dir, texconv_path):
    """
    Scan source textures, generate LOD variants, and apply performance-oriented compression.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(source_dir):
        if not filename.endswith(".png") and not filename.endswith(".tga"):
            continue

        input_file = os.path.join(source_dir, filename)

        if filename.endswith("_d.png") or filename.endswith("_d.tga"):
            cmd = f'"{texconv_path}" -w 512 -h 512 -f BC7_UNORM_SRGB -m 4 -y -o "{output_dir}" "{input_file}"'
        elif filename.endswith("_n.png") or filename.endswith("_n.tga"):
            cmd = f'"{texconv_path}" -w 256 -h 256 -f BC5_UNORM -m 3 -y -o "{output_dir}" "{input_file}"'
        elif filename.endswith("_s.png") or filename.endswith("_s.tga"):
            cmd = f'"{texconv_path}" -w 256 -h 256 -f BC7_UNORM -m 3 -y -o "{output_dir}" "{input_file}"'
        else:
            continue

        subprocess.run(cmd, shell=True, check=True)

# Example:
# generate_jungle_lod_textures("Data/Textures/RawJungle", "Data/Textures/LOD", "C:/Tools/texconv.exe")
```

Recommended teaching checks:
- verify naming convention consistency (`_d/_n/_s`) before running automation
- inspect generated mip chains
- validate distant visuals in-game to avoid shimmering or incorrect gloss at range

---

## Part 8: Archive2 Packaging, `.bwm` LOD World Meshes, and Streaming INI Profile

### Automated Archive2 batch scripting for NG/AE-safe BA2 layouts

For large biome projects, teach students to split archives into:
- **Main BA2** for meshes/materials/vis data
- **Textures BA2** for texture payloads

Example `Archive2_Pack_Script.txt` teaching profile:

```text
# Main Archive Directives (Uncompressed Data / General Assets)
-create="Data\FungusJungle - Main.ba2"
-compression=NONE
-format=GENERAL
-root="Data\"
-add="Meshes\Precombined\*"
-add="Vis\*"
-add="Materials\FungusJungle\*"

# Textures Archive Directives (DX10/DX11 Linear Compression)
-create="Data\FungusJungle - Textures.ba2"
-compression=DEFAULT
-format=XBOX_DXT
-root="Data\"
-add="Textures\FungusJungle\*"
```

Python execution hook example:

```python
import subprocess

def compile_mod_archives(archive2_exe_path, script_path):
    """
    Execute Archive2 with a scripted command list.
    """
    cmd = f'"{archive2_exe_path}" @ "{script_path}"'
    subprocess.run(cmd, shell=True, check=True)
```

### `.bwm` LOD mesh workflow architecture (teaching blueprint)

Use this simplified tutor flow for distant fungal structures:

```text
[High-Poly Custom Fungus]
          |
          v  (Blender: proportional decimate target 10-15%)
[Low-Poly Proxy Mesh]
          |
          v  (export proxy as OBJ/NIF per toolchain)
[Elric / CK LOD Compiler]
          |
          v
[Distant World Mesh Output (.bwm)]
```

Recommended teaching sequence:
1. Reduce high-poly source meshes to roughly **10%–15%** of original detail for distant rendering.
2. Export low-poly proxy meshes into a naming scheme aligned with LOD conventions.
3. Keep source and LOD paths explicit:
   - `Data\Meshes\FungusJungle\GiantMushroom01.nif`
   - `Data\Meshes\LOD\FungusJungle\GiantMushroom01_LOD_4.nif`
4. Compile through Elric/Creation Kit LOD tooling to produce final `.bwm` world-mesh outputs for unloaded-cell distance rendering.

### `FungusJungle.ini` streaming profile (mod-local deployment)

If the project includes a mod-specific runtime profile, place `FungusJungle.ini` alongside plugin files in `Data/`:

```ini
[Display]
; Smooth fade behavior for grass/small fungal cards
bEnableWetnessMaterials=1
fMeshLODFadePercentScale=1.5000
fMeshLODFadeMinStartRatio=0.1500

[LOD]
; Extended distance scaling for world objects/actors/items
fLODFadeOutMultObjects=15.0000
fLODFadeOutMultActors=15.0000
fLODFadeOutMultItems=10.0000

[TerrainManager]
; Streaming distance ranges for large custom terrain blocks
fBlockMaximumDistance=250000.0000
fBlockLevel2Distance=110000.0000
fBlockLevel1Distance=40000.0000
fTreeLoadDistance=75000.0000

[BackgroundLoad]
; Background streaming controls for cell transitions
bBackgroundCellLoads=1
bSelectivePurgeUnusedOnFastTravel=1
```

Teaching reminder:
- Validate these values on representative savegames and weather presets before treating them as final defaults.
