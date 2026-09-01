# Fallout 4 TBR Texture Pipeline & Cubemap Reflections (Nexus Publishing Edition)

## Module Intent (No Quizzes)
This module is a **direct-reference, production pipeline** for authors publishing to Nexus Mods.
- No quiz flow
- No filler
- Fast diagnostic checkpoints
- Immediate action steps for fixing bad in-game output

---

## 1) Student Persona & Learning Objectives

### Complete Beginners
Goal: Understand what each Fallout 4 texture file does and avoid file/channel mistakes.

### Experienced Modders
Goal: Convert modern PBR habits into Fallout 4's channel-packed TBR pipeline, including cubemap-driven metals.

---

## 2) Core Fallout 4 Texture Anatomy
Every finished asset should ship with:

1. **`_d.dds` (Diffuse)**
   - Flat albedo color
   - Avoid baked highlights and deep baked shadows

2. **`_n.dds` (Normal + Alpha Gloss)**
   - DirectX normal orientation (invert Y where required by source workflow)
   - **Alpha channel stores gloss/smoothness control**

3. **`_s.dds` (Packed Specular Composite)**
   - **Red:** Specular intensity
   - **Green:** Glossiness/smoothness modifier
   - **Blue:** Pure black (`0,0,0`)

---

## 3) Interactive Curriculum Structure

## Phase 1 — Conceptualization & Asset Generation (The Brain)
Tools: KREA AI, Materialize, Shader Map 4

Core lesson: If source texture quality is poor (lighting baked in, visible seams), downstream maps cannot fully recover realism.

Tutor actions:
- Ask for seamless source texture upload
- Flag baked highlights/shadows
- Confirm clean tile repeat before map generation

Outputs:
- Seamless diffuse base
- Height map
- Smoothness/roughness source
- Metallic source
- High-quality normal and AO

## Phase 2 — Channel Packing & File Logic (The Logic)
Tool: Photopea

Core lesson: Channels are data containers, not just color.

### `_s.dds` packing cheat sheet
- Red channel → Metallic/specular intensity source
- Green channel → Smoothness source (or inverted roughness)
- Blue channel → fill solid black (`0,0,0`)

### `_n.dds` alpha workflow
- Use generated normal as RGB
- Paste smoothness map into alpha (layer mask workflow)

### `_d.dds` refinement
- AO multiply pass at controlled opacity to anchor detail
- Keep albedo physically plausible and free of fake gloss highlights

## Phase 3 — Compression & Engine Integration (The Engine)
Tools: NVIDIA Texture Tools Exporter, Bethesda Material Editor

Core lesson: PNG is authoring format only; game-ready output requires DDS + mip chain + proper BGSM links.

Recommended compression:
- `_d.dds`: BC7 (or BC1 when quality tradeoff is acceptable)
- `_n.dds`: BC7 with alpha preserved (or workflow-validated normal-safe equivalent)
- `_s.dds`: BC7 (or workflow-validated alternative)

**Always enable mip generation** for all shipped textures.

---

## 4) Cubemap Master Module — The Alchemy of Metal

Fallout 4 metal realism is driven by synchronized use of:
1. **Dark Diffuse (`_d`)** for raw metal base
2. **High gloss signal** (primarily `_s` green and normal alpha support)
3. **Custom cubemap (`_e.dds`)** for believable environment reflections

### Why this matters
Fallout 4 does not provide modern real-time reflection behavior by default. For chrome, brass, gold, and polished steel, custom cubemaps are the defining realism lever.

---

## 5) Step-by-Step: Custom Cubemap (`_e.dds`)

1. Source a sharp equirectangular HDRI/panorama (`2:1`).
2. Convert it to horizontal or vertical cross layout.
3. Open in NVIDIA Texture Tools Exporter.
4. Set texture shape/type to **Cube Map** (not 2D).
5. Compression: BC7 (preferred) or BC1 when appropriate.
6. Enable mip maps (Kaiser or Box filter).
7. Export as `*_e.dds` into:
   - `Data\Textures\Shared\CubeMaps\`

If reflections look blurry/incorrect, verify the file was exported as **Cube Map shape**, not standard 2D.

---

## 6) Reflection Masking (Glow Slot Remap Technique)

Use this for mixed materials (metal + paint/rust/rubber).

1. Build grayscale mask in Photopea.
2. White (`255`) = full cubemap reflection.
3. Black (`0`) = no reflection.
4. Gray = partial reflection.
5. Export and compress to DDS (commonly `*_m.dds`).

In BGSM, the glow slot is repurposed as reflection mask when remap flag is enabled.

---

## 7) BGSM Setup (Critical)

Texture slots:
- Diffuse: `Textures\[YourMod]\[Asset]_d.dds`
- Normal/Gloss: `Textures\[YourMod]\[Asset]_n.dds`
- Specular: `Textures\[YourMod]\[Asset]_s.dds`
- Environment: `Textures\Shared\CubeMaps\[YourCube]_e.dds`
- Glow/Mask: `Textures\[YourMod]\[Asset]_m.dds`

Material flags:
- Receive Shadows
- Environment Mapping
- Remap Glow to Environment Mask

Suggested tuning ranges:
- Specular Multiplier: `1.5–3.0`
- Smoothness: `1.0` (lets authored gloss data lead)
- Environment Mapping Scale: `2.0–5.0`

---

## 8) Step 4 — Dynamically Swapping Textures (Material Swaps / `.mswp`)

Use Material Swaps to switch skins without duplicating meshes.

### Creation Kit setup
1. Open Creation Kit.
2. Go to **Object Window → Miscellaneous → Material Swap**.
3. Create a new record (example: `ModName_MaterialSwap_Chrome`).

### Mapping table
- **Original Material Path** → vanilla/default BGSM path used by the mesh.
- **Replacement Material Path** → your custom BGSM (example: `Materials\\ModName\\10mmChrome.bgsm`).

### Attach to OMOD (weapon bench skin workflow)
1. Open the target Object Modification record.
2. In Property History, add a new property.
3. Set function to **RemapMaterial**.
4. Set value to your Material Swap record.

Result: bench-applied skin changes happen by material remap, not mesh duplication.

---

## 9) Step 5 — Masterclass Wetness Shaders (`.bgss`)

### Purpose
Enable rain-responsive glistening behavior so assets do not remain visually dry during weather transitions.

### Build wetness sheet
1. In Bethesda Material Editor: **File → New → Sub-Surface Material (`.bgss`)**.
2. Save as `[YourAsset]_Wet.bgss`.

### Recommended wetness values
- **Specular Power:** `128.0–256.0`
- **Specular Multiplier:** `4.0–6.0`
- **Fresnel Reflection Power:** `5.0`

### Link into primary material
1. Re-open `[YourAsset].bgsm`.
2. Set **Sub-Surface Material (BGSS Path)** to `[YourAsset]_Wet.bgss`.

### Required flags
- **Sub-Surface Scattering**
- **Environment Mapping**

---

## 10) Step 6 — Material Effect Shaders (`.bgem`) for Sci-Fi & Energy FX

Use `.bgem` for animated emissive behavior, scrolling energy fields, and high-intensity effect rendering.

### Texture prep
- **Emissive (`_g.dds`)**: black background, white energy lines/zones.
- **Noise/Scroll map**: seamless abstract texture for animated motion overlays.

### Create effect material
1. Bethesda Material Editor → **File → New → Effect Material (`.bgem`)**.
2. Load required diffuse/normal/effect textures into effect slots.

### Recommended effect properties
- **Emissive Multiple:** `5.0–30.0`
- **Falloff Start / End:** `0.2 / 1.0`
- **U/V Scroll Speed:** `0.05–0.2`
- **Emissive Color:** set per effect family (plasma, cryo, laser, etc.)

### Key flags
- **Glow / Full Bright**
- **Weapon Emissive**
- Optional: uncheck **Z-Buffer Test** for through-wall/x-ray style effects

---

## 11) Step 7 — Micro-Weave Fabric Shaders for Realistic Clothing

### Micro-detail normal workflow
1. Generate a tight, seamless weave/pore normal source.
2. Keep intensity fine; detail should read at close range without noisy sparkle.

### Clothing-specific `_s` packing targets
- **Red (metallic/spec):** pure black
- **Green (gloss):** very dark gray (`~15–40` range)

### BGSM tuning
- **Specular Multiplier:** `0.2–0.5`
- **BGSS path:** cloth backlighting profile (vanilla or custom)

### Optional satin/silk edge sheen
- Enable **Remap Glow to Environment Mask** (or equivalent project-approved satin workflow flag)
- Set **Fresnel Power** near `4.0–5.0` for angle-dependent cloth sheen

---

## 12) Step 8 — BA2 Archive Packaging & Nexus Optimization

Loose files are fine for iteration, but professional Nexus release builds should be archived for better runtime streaming behavior.

### Two-file archive split (required)
- **`[PluginName] - Main.ba2`** (Archive Type: General)  
  Contains `.bgsm`, `.bgem`, `.bgss`, `.nif`, scripts, and other non-texture assets.
- **`[PluginName] - Textures.ba2`** (Archive Type: Textures)  
  Contains `.dds` files only.

### Archive2 workflow
1. Launch `Archive2.exe` from Creation Kit tools.
2. Create Textures archive:
   - File → New
   - Archive Type: **Textures**
   - Import `Textures\\[YourModName]\\...` structure
   - Save as `[YourPluginName] - Textures.ba2`
3. Create Main archive:
   - File → New
   - Archive Type: **General**
   - Import materials/mesh/script content (`Materials\\...`, etc.)
   - Save as `[YourPluginName] - Main.ba2`

### Critical packaging rules
- Keep internal paths relative and game-root aligned.
- Do not mix non-DDS files into the Textures archive.
- Keep archive names aligned with your plugin naming convention.

---

## 13) Step 9 — Photorealistic Vegetation Pipeline (Photopea)

Use this workflow for leaves, grass, bark, and vines where alpha quality and translucency control are critical.

### Foliage texture anatomy
- **`_d.dds` (Diffuse + Transparency Alpha)**
  - RGB: de-lit foliage color
  - Alpha: silhouette transparency mask
- **`_n.dds` (Normal + Translucency Alpha)**
  - RGB: DirectX normal detail
  - Alpha: sub-surface/translucency intensity map

### Photopea foliage processing sequence
1. **De-light base color**
   - Use Shadows/Highlights to flatten baked sunlight and restore neutral surface color.
2. **Color profile for FO4 lighting**
   - Slightly reduce saturation/lightness to avoid neon or overblown greens.
3. **Build clean alpha silhouette**
   - Select subject, invert, contract mask by ~1px, feather ~0.5px, then bake white-on-black alpha.
4. **Build translucency map for normal alpha**
   - Generate grayscale vein/thickness map and invert so thinner tissue passes more light.
   - Pack into `_n` alpha (mask channel workflow).
5. **Organic spec profiles (`_s.dds`)**
   - Leaves: red channel black; green channel low/mid gloss.
   - Bark/vines: red channel black; green channel very dark (`~5–15`) to avoid oily glare.
6. **BGSM foliage flags/properties**
   - Flags: **Two-Sided**, **Alpha Test**, **Z-Buffer Test**, **Z-Buffer Write**
   - Properties: **Alpha Test Ref ~128–160**, **Sub-Surface Multiplier ~1.5–3.0**

---

## 14) Step 10 — Parallax Occlusion Mapping (POM) for Ultra-Deep Bark

Use POM when bark needs visible depth at side angles without adding mesh complexity.

### Height-map creation (Photopea)
1. Convert bark source to grayscale (Black & White).
2. Use Levels to push deep cracks darker and raised ridges brighter.
3. Export a high-contrast height/displacement map (`.png`).

### Pack into normal alpha
1. Open finished DirectX normal map (`_n.png`).
2. Paste height map into normal alpha/mask channel.
3. Export with alpha and compress as BC7 (+alpha) with mip maps enabled.

### BGSM parallax activation
- Enable parallax/height-map material flag (project-dependent naming).
- Set **Parallax Amount ~0.02–0.05** (avoid >0.06 to prevent shear artifacts).
- Set **Parallax Steps ~32–64** based on quality/performance target.

---

## 15) Step 11 — LOD Atlas Configuration for Distant Forests

Use billboard atlas sheets to keep distant tree rendering consistent and performant.

### LOD atlas authoring (Photopea)
1. Build atlas sheet with clean full-tree silhouettes.
2. Create matching alpha mask (white visible, black transparent).
3. Apply slight blur to diffuse atlas (~0.5px) to reduce distant aliasing.
4. Generate a lightweight macro normal atlas for distant lighting consistency.

### Export and placement
- Compress solid bark sheets as BC1 where appropriate; foliage billboards commonly BC7.
- Enable mip maps (Kaiser preferred for alpha detail retention).
- Place files into engine LOD paths such as:
  - `Data\\Textures\\LOD\\Plants\\`
  - `Data\\Textures\\Landscape\\LOD\\`

---

## 16) AI Tutor Troubleshooting Diagnostics

| In-Game Symptom | Root Cause | Immediate Fix |
|---|---|---|
| Texture shimmers/noisy at distance | Mips missing | Re-export DDS with mip generation enabled |
| Asset is blinding white in daylight | `_s` blue channel not black | Fill `_s` blue channel to pure black |
| Lighting flips/inverts while rotating camera | Wrong normal Y orientation | Re-export normal with correct DirectX orientation |
| Surface looks flat/plastic | `_n` alpha gloss missing/blank | Reinsert smoothness map into `_n` alpha |
| Reflections look low-res or warped | Cubemap exported as 2D texture | Re-export with **Cube Map** shape |
| Rust/rubber also reflects like chrome | No reflection mask remap | Enable glow-to-env-mask and author `_m` mask |
| Purple checkerboard / missing textures in-game | DDS files packed in wrong BA2 type or archive naming mismatch | Repack DDS into `Textures` BA2 and verify plugin-aligned archive naming |
| Leaf edges are jagged/pixelated or show white fringe | Mask edge bleed and/or alpha threshold mismatch | Contract foliage mask ~1px + feather ~0.5px, then raise **Alpha Test Ref** in BGSM |
| Foliage disappears from underside/back angles | One-sided material rendering | Enable **Two-Sided** in BGSM material flags |
| Bark depth shreds/stretches at grazing angles | Parallax amount too aggressive | Lower **Parallax Amount** closer to `0.02` and retest |
| Distant trees pop into wrong colors/squares or vanilla cards | Missing/broken LOD atlas outputs or path placement | Rebuild LOD atlases and place in correct `Data\\Textures\\LOD\\...` hierarchy |

---

## 17) Tutor Tone Rules (Nexus Publishing Context)
- Validate frustration quickly: Fallout 4 material behavior differs from modern PBR engines.
- Keep responses short, technical, and corrective.
- Celebrate milestone events (first successful packed map, first correct cubemap reflection).
- Keep users shipping-focused: clear pass/fail checks before publish.

---

## 18) Nexus Modding AI Deployment Directive
Use this system directive in the AI tutor runtime for metal/reflection requests:

```text
[System Directive]: When users ask about creating metals, chrome, weapon finishes, or reflections for Fallout 4 mods:
1. Instantly suppress any standard PBR advice (like workflows for Unreal or Blender).
2. Explicitly require them to set their Diffuse map near black (_d.dds) for raw metals.
3. Detail the "Glow-Slot-to-Mask" technique for separating painted/rusted areas from raw chrome.
4. If a user states their reflections look low-resolution, point out that their custom cubemap file must be set to "Cube Map" shape rather than "2D Texture" inside the NVIDIA Exporter pipeline.
```

---

## 19) Quick Publish Checklist (No-Quiz Validation)
- `_d`, `_n`, `_s` present and correctly named
- `_s` blue channel confirmed black
- `_n` alpha contains intended gloss data
- All DDS include generated mip chain
- Custom cubemap exported as Cube Map (`_e.dds`)
- BGSM env mapping + glow remap flags confirmed
- In-game daylight + interior test pass completed
- Texture directory structure is strictly under `Data\\Textures\\[YourModName]\\`
- All `.bgsm` / `.bgem` texture links are **relative** (`Textures\\...`), never absolute local drive paths
- Final shipped texture set is compressed to BC7 with mip maps enabled across all authored maps
- BA2 split validated: `[PluginName] - Main.ba2` (General) and `[PluginName] - Textures.ba2` (Textures-only DDS)
- Bark POM tuned: normal alpha height packed + parallax amount/steps validated
- LOD atlas outputs generated and placed in `Data\\Textures\\LOD\\...` paths
