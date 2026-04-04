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

### Blender ↔ BGSM mapping (in Niftools exporter)

- **Diffuse** image node → `DiffuseTexture`
- **Normal** image node → `NormalTexture`
- **Specular** image node → `SmoothSpecTexture`
- **Emission** / glow node → `GlowMapTexture` + `EmitEnabled = True`
- Principled BSDF `Roughness` → approx `Glossiness` (invert: 1 - roughness)
- Principled BSDF `Alpha` → `Alpha`
- Material `use_backface_culling = False` → `TwoSided = True`

---

## BGEM (Effect Material)

Used for: particle effects, decals, screen-space effects, water.

Key differences from BGSM:
- `BaseTexture` replaces `DiffuseTexture`
- `GrayscaleTexture` for colour remapping
- `EnvironmentMappingMaskTexture` for reflections
- `BloodEnabled`, `EffectLightingEnabled` toggles
- `FalloffStartAngle`, `FalloffStopAngle` for angular fade

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

The Creation Kit exports .bgsm automatically when you assign a material to
a NIF in the CK's Material Editor.  For manual creation:

- **BSMaterial Editor** (part of the CK) — GUI editor, recommended.
- **BSMaterialBatch** (nifskope community tool) — batch rename textures.
- **Python struct** — binary write the 148-byte BGSM header manually.

The add-on's Material Browser panel generates a Blender-side preview
material that matches the BGSM layout.  Export the NIF first, then open
the CK Material Editor to finalise the .bgsm and link it to the mesh.
