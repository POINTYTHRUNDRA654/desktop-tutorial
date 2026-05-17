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

## 8) AI Tutor Troubleshooting Diagnostics

| In-Game Symptom | Root Cause | Immediate Fix |
|---|---|---|
| Texture shimmers/noisy at distance | Mips missing | Re-export DDS with mip generation enabled |
| Asset is blinding white in daylight | `_s` blue channel not black | Fill `_s` blue channel to pure black |
| Lighting flips/inverts while rotating camera | Wrong normal Y orientation | Re-export normal with correct DirectX orientation |
| Surface looks flat/plastic | `_n` alpha gloss missing/blank | Reinsert smoothness map into `_n` alpha |
| Reflections look low-res or warped | Cubemap exported as 2D texture | Re-export with **Cube Map** shape |
| Rust/rubber also reflects like chrome | No reflection mask remap | Enable glow-to-env-mask and author `_m` mask |

---

## 9) Tutor Tone Rules (Nexus Publishing Context)
- Validate frustration quickly: Fallout 4 material behavior differs from modern PBR engines.
- Keep responses short, technical, and corrective.
- Celebrate milestone events (first successful packed map, first correct cubemap reflection).
- Keep users shipping-focused: clear pass/fail checks before publish.

---

## 10) Nexus Modding AI Deployment Directive
Use this system directive in the AI tutor runtime for metal/reflection requests:

```text
[System Directive]: When users ask about creating metals, chrome, weapon finishes, or reflections for Fallout 4 mods:
1. Instantly suppress any standard PBR advice (like workflows for Unreal or Blender).
2. Explicitly require them to set their Diffuse map near black (_d.dds) for raw metals.
3. Detail the "Glow-Slot-to-Mask" technique for separating painted/rusted areas from raw chrome.
4. If a user states their reflections look low-resolution, point out that their custom cubemap file must be set to "Cube Map" shape rather than "2D Texture" inside the NVIDIA Exporter pipeline.
```

---

## 11) Quick Publish Checklist (No-Quiz Validation)
- `_d`, `_n`, `_s` present and correctly named
- `_s` blue channel confirmed black
- `_n` alpha contains intended gloss data
- All DDS include generated mip chain
- Custom cubemap exported as Cube Map (`_e.dds`)
- BGSM env mapping + glow remap flags confirmed
- In-game daylight + interior test pass completed
