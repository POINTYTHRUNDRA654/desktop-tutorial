# Fallout 4 Materials – Complete Reference

## Overview

Fallout 4 uses **Material files** (`.bgsm` for opaque, `.bgem` for emissive /
special) instead of embedding texture paths directly in NIF files.  The NIF
BSLightingShaderProperty or BSEffectShaderProperty record references the
material file path, and the material file contains all texture paths and shader
flags.

This add-on's **Material Browser** creates correctly structured Blender
materials (Principled BSDF + standard named texture nodes) that are instantly
applicable to any mesh and export correctly via the Niftools NIF exporter.

---

## Material Types

### BSLightingShaderProperty (`.bgsm`) — most objects

Used for virtually all solid / opaque objects in the game.  Shader flags
control special effects:

| Shader Type | FO4 Keyword | Use case |
|---|---|---|
| Default | `SLSF1_*` | Standard PBR surface |
| Skin | `SLSF1_Skin_Tint` | NPC body/face skin |
| Hair | `SLSF1_Hair_Soft_Lighting` | NPC hair mesh |
| Parallax | `SLSF2_Assume_Shadowmask` | Deep surface depth illusion |
| Environment Map | `SLSF1_Environment_Mapping` | Shiny/reflective surfaces |
| Glow Map | `SLSF1_Own_Emit` | Objects that emit light via a mask |
| Multilayer Parallax | `SLSF2_Multi_Layer_Parallax` | Two-layer depth (e.g. eyes) |

### BSEffectShaderProperty (`.bgem`) — special/emissive

Used for holographic displays, neon signs, glowing runes, particle trails.

---

## Texture Slots

Every Fallout 4 material uses the following texture slots in order:

| Slot | Suffix | Color Space | Purpose |
|------|--------|-------------|---------|
| 0    | `_d`   | sRGB        | Diffuse / base colour (+ alpha for transparency) |
| 1    | `_n`   | Non-Color   | Normal map (DirectX convention: G-channel flipped vs OpenGL) |
| 2    | `_s`   | Non-Color   | Specular / smoothness (R = spec intensity, G = roughness) |
| 3    | `_g`   | Non-Color   | Glow / emissive mask |
| 4    | `_e`   | sRGB        | Environment / cube map (for reflection mapping) |
| 5    | `_h`   | Non-Color   | Height / parallax (R channel = height) |
| 6    | `_d` × | Non-Color   | Backlight / subsurface map |

> **Important**: FO4 normal maps use **DirectX convention** (Y-axis / Green
> channel is flipped compared to OpenGL).  If a normal map looks "inverted"
> in-game, flip the Green channel in your image editor before converting to DDS.

---

## Material File Format (BGSM / BGEM)

Both formats are plain JSON (renamed `.bgsm` / `.bgem`).  Example BGSM:

```json
{
  "sVersion": 2,
  "bShaderFlags1": 2151677952,
  "bShaderFlags2": 32,
  "fAlpha": 1.0,
  "eTextureClampMode": 3,
  "sTextures": [
    "textures/my_mod/prop_d.dds",
    "textures/my_mod/prop_n.dds",
    "textures/my_mod/prop_s.dds",
    "",
    "",
    "",
    "",
    "textures/shared/cubemaps/mipblur_defaultoutside1.dds"
  ],
  "fSmoothness": 0.5,
  "bEnvmapScale": 1.0
}
```

The add-on's **Export ImageSpace JSON** operator generates a stub BGSM when the
`fo4_material_preset` custom property is set on an object.

---

## Blender Node Setup

The Material Browser creates the following node graph (identical to what
Niftools expects):

```
[Diffuse TexImage] ──Color──────────────────────────▶ [Principled BSDF] Base Color
                     └─Alpha──────────────────────▶ Alpha (CLIP/BLEND mode)
[Normal  TexImage] ──Color──▶ [Normal Map] ──Normal──▶ [Principled BSDF] Normal
[Specular TexImage] ─Color──────────────────────────▶ [Principled BSDF] Specular IOR
[Glow    TexImage] ──Color──────────────────────────▶ [Principled BSDF] Emission Color
                                                       [Principled BSDF] ──▶ [Output]
```

**Node naming is critical**: The Niftools exporter identifies texture slots
by the `label` property of image texture nodes:

| Node label | Niftools slot | NIF texture index |
|---|---|---|
| `Diffuse`  | `TEX_SLOTS.DIFFUSE`  | 0 |
| `Normal`   | `TEX_SLOTS.NORMAL`   | 1 |
| `Specular` | `TEX_SLOTS.SPECULAR` | 2 |
| `Glow`     | `TEX_SLOTS.GLOW`     | 3 |

---

## Material Browser Presets

| Preset ID | Label | Roughness | Metallic | Alpha | Shader |
|---|---|---|---|---|---|
| `RUSTY_METAL` | Rusted Metal | 0.85 | 0.50 | OPAQUE | default |
| `CLEAN_METAL` | Clean Metal | 0.35 | 1.00 | OPAQUE | default |
| `GALVANIZED_METAL` | Galvanized Metal | 0.55 | 0.80 | OPAQUE | default |
| `VAULT_METAL` | Vault-Tec Metal | 0.50 | 0.60 | OPAQUE | default |
| `CRACKED_CONCRETE` | Cracked Concrete | 0.90 | 0.00 | OPAQUE | default |
| `SMOOTH_CONCRETE` | Smooth Concrete | 0.80 | 0.00 | OPAQUE | default |
| `STONE` | Stone / Brick | 0.95 | 0.00 | OPAQUE | default |
| `ASPHALT` | Asphalt / Tarmac | 0.95 | 0.00 | OPAQUE | default |
| `WOOD_PLANK` | Wood Plank | 0.85 | 0.00 | OPAQUE | default |
| `WOOD_PANEL` | Wood Panel | 0.70 | 0.00 | OPAQUE | default |
| `GLASS_CLEAR` | Glass (Clear) | 0.05 | 0.00 | BLEND | default |
| `GLASS_BROKEN` | Glass (Broken) | 0.40 | 0.00 | CLIP | default |
| `HARD_PLASTIC` | Hard Plastic | 0.55 | 0.00 | OPAQUE | default |
| `RUBBER` | Rubber / Tyre | 0.95 | 0.00 | OPAQUE | default |
| `FABRIC_CLOTH` | Cloth Fabric | 1.00 | 0.00 | CLIP | default |
| `LEATHER` | Leather | 0.75 | 0.00 | OPAQUE | default |
| `HUMAN_SKIN` | Human Skin | 0.65 | 0.00 | OPAQUE | skin |
| `GHOUL_SKIN` | Ghoul Skin | 0.90 | 0.00 | OPAQUE | skin |
| `NEON_LIGHT` | Neon Light | 0.50 | 0.00 | OPAQUE | glowmap |
| `TERMINAL_SCREEN` | Terminal Screen | 0.10 | 0.00 | OPAQUE | glowmap |
| `HOLOTAPE` | Holotape / Holographic | 0.00 | 0.00 | BLEND | glowmap |
| `POWER_ARMOR_PAINT` | Power Armor Paint | 0.45 | 0.70 | OPAQUE | default |
| `PIPBOY_PAINT` | Pip-Boy Green Paint | 0.60 | 0.40 | OPAQUE | default |

---

## Tips

- **Roughness in FO4 specular maps**: The Green channel of the `_s` texture
  controls smoothness (inverted roughness): 0 = fully rough, 255 = mirror.
  The Principled BSDF Roughness input is the inverse: 0 = mirror, 1 = rough.

- **Metallic surfaces**: FO4 does not have a dedicated metallic map.  Metal is
  achieved by setting the specular intensity (Red channel of `_s`) high and
  tinting the diffuse with a metallic colour.  The Principled BSDF's Metallic
  input is a Blender-only approximation.

- **Two-sided geometry**: Fabric, glass, and foliage need `use_backface_culling
  = False` on the material AND the `Two_Sided` flag in the NIF shader.  The
  Material Browser presets set backface culling automatically.

- **DDS format by surface type**:
  | Surface | Diffuse | Normal | Specular |
  |---|---|---|---|
  | Opaque solid | BC1 (DXT1) | BC5 (ATI2N) | BC1 (DXT1) |
  | Alpha-tested | BC3 (DXT5) | BC5 | BC1 |
  | Emissive glow | BC3 (DXT5) | BC5 | BC1 |
  | Skin | BC3 (DXT5) | BC5 | BC1 |
