# Fallout 4 – BGSM / BGEM Material Format Reference

Fallout 4 materials are stored in `.bgsm` (BGS Material) and `.bgem`
(BGS Effect Material) files under `Data/Materials/`.  Unlike previous
Bethesda games, materials are separate from NIF files.

---

## BGSM (Standard Material) — Most common format

Used for: armor, props, architecture, characters, vegetation.

### Key fields

| Field                  | Type    | Notes                                      |
|------------------------|---------|--------------------------------------------|
| `DiffuseTexture`       | string  | Path to `_d.dds` (relative to `Data/`)     |
| `NormalTexture`        | string  | Path to `_n.dds`                           |
| `SmoothSpecTexture`    | string  | Path to `_s.dds`                           |
| `GreyscaleTexture`     | string  | Path to `_g.dds` (used for glow/emittance) |
| `EnvMapTexture`        | string  | Cubemap for reflections (`_e.dds`)         |
| `GlowMapTexture`       | string  | Glow mask texture                          |
| `TileU` / `TileV`      | float   | UV tiling (1.0 = no tile)                  |
| `OffsetU` / `OffsetV`  | float   | UV offset (0.0 = no offset)                |
| `Specular Color`       | RGB     | Specular colour multiplier                 |
| `Specular Multiplier`  | float   | Scales specular intensity                  |
| `Glossiness`           | float   | 0–255; higher = sharper highlights         |
| `Alpha`                | float   | 0.0–1.0 overall opacity                    |
| `AlphaBlendMode`       | enum    | `None`, `Standard`, `Additive`, `Multiply` |
| `AlphaTestRef`         | uint8   | Clip threshold (128 = 50%)                 |
| `TwoSided`             | bool    | Render back faces (required for foliage)   |
| `Decal`                | bool    | Enable decal projection                    |
| `EmitEnabled`          | bool    | True when the mesh glows                   |
| `EmittanceColor`       | RGB     | Glow colour when `EmitEnabled` is True     |
| `EmittanceMult`        | float   | Glow intensity multiplier                  |

### Blender ↔ BGSM mapping (native add-on export via `bgsm_helpers`)

The add-on now writes `.bgsm` files natively — no external tools required.
Use **Texture Helpers → BGSM Material Files → Export Active Object .bgsm(s)**
in the N-panel to export, or **Import .bgsm → Material** to read an existing
`.bgsm` back into Blender.

| Blender source                              | BGSM field               |
|---------------------------------------------|--------------------------|
| Image node named **"Diffuse"**              | `DiffuseTexture`         |
| Image node named **"Normal"**               | `NormalTexture`          |
| Image node named **"Specular"**             | `SmoothSpecTexture`      |
| Image node named **"Glow"**                 | `GreyscaleTexture`       |
| Image node named **"EnvMap"**               | `EnvmapMaskTexture`      |
| Principled BSDF `Roughness`                 | `Smoothness` (inverted)  |
| Principled BSDF `Alpha`                     | `Alpha`                  |
| Principled BSDF `Emission Strength` > 0     | `EmitEnabled = True`     |
| Principled BSDF `Emission Color`            | `EmittanceColor`         |
| `material.use_backface_culling = False`     | `TwoSided = True`        |
| `material.blend_method == 'CLIP'`           | `AlphaTest = True`       |
| `material.alpha_threshold`                  | `AlphaTestRef` (×255)    |
| Material custom prop `fo4_material_preset`  | Shader flag hints        |

**Shader hint presets** (set via Material Browser or the `fo4_shader` custom
property on the material) automatically add the appropriate `ShaderFlags1`
bits: `skin` → `SF1_SKIN_TINT`, `hair` → `SF1_HAIR`,
`glowmap` → `SF1_EMIT_ENABLED`, `env` → `SF1_ENVIRONMENT_MAPPING`,
`eye` → `SF1_EYE_ENVIRONMENT_MAPPING`, `tree` → `SF1_TREE`.

After exporting the `.bgsm` file, link it to the NIF mesh in the
**Creation Kit Material Editor** or via NifSkope's
`BSLightingShaderProperty → Shader Flags` section.

---

## BGEM (Effect Material)

Used for: particle effects, decals, screen-space effects, water.

Key differences from BGSM:
- `BaseTexture` replaces `DiffuseTexture`
- `GrayscaleTexture` for colour remapping
- `EnvironmentMappingMaskTexture` for reflections
- `BloodEnabled`, `EffectLightingEnabled` toggles
- `FalloffStartAngle`, `FalloffStopAngle` for angular fade

> **Note:** The add-on writes BGEM files via `bgsm_helpers.write_bgem()` but
> does not import them into Blender (BGEM uses a particle-effect shader with
> no Principled BSDF equivalent).  Create BGEM files programmatically or
> use the Creation Kit Material Editor.

---

## File location conventions

```
Data/
  Materials/
    actors/
      character/
        basehumanmale.bgsm
    clutter/
      desk/
        desk01.bgsm
    architecture/
      buildings/
        buildingwall01.bgsm
```

Paths inside .bgsm files use lowercase and backslash separators.

---

## Creating .bgsm files

Three options, from easiest to most flexible:

1. **Add-on native export** (recommended) — use the BGSM Material Files
   section in the Texture Helpers N-panel.  No external tools required.
2. **BSMaterial Editor** (part of the CK) — GUI editor; good for fine-tuning
   flags the add-on doesn't expose.
3. **BSMaterialBatch** (nifskope community tool) — batch rename textures in
   existing `.bgsm` files.

After exporting from Blender, open the CK Material Editor to link the
`.bgsm` to the NIF mesh and set any additional flags not covered by the
Blender material settings.

