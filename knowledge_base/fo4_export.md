# Fallout 4 NIF export – complete requirements

## NIF file format for Fallout 4

| Parameter        | Value                                                       |
|------------------|-------------------------------------------------------------|
| NIF version      | 20.2.0.7                                                    |
| User version     | 12                                                          |
| User version 2   | 131073                                                      |
| Geometry nodes   | **BSTriShape** (NOT NiTriShape – invisible in-game if wrong)|
| Shader property  | BSLightingShaderProperty                                    |
| Tangent space    | **Required** for normal maps to appear in-game             |
| Scale            | 1 Blender unit = 1 NIF unit (scale_correction = 1.0)       |

The game profile `FALLOUT_4` in Niftools v0.1.1 automatically selects version
20.2.0.7 / user version 12 / user_version_2 131073 and forces BSTriShape output.

## Niftools Blender addon

Latest release: **v0.1.1** (2023-11-03)
Compatible with: Blender 2.8 – 3.6 (NOT Blender 4.x)
Download: https://github.com/niftools/blender_niftools_addon/releases/download/v0.1.1/blender_niftools_addon-v0.1.1-2023-11-03-0305c8d5.zip

If you run Blender 4.x, install Blender 3.6 LTS alongside and perform the NIF
export there, or use the FBX fallback and convert externally with NifSkope /
Outfit Studio / Cathedral Assets Optimizer.

## Export operator settings (bpy.ops.export_scene.nif)

| Property           | Value        | Why                                                  |
|--------------------|--------------|------------------------------------------------------|
| game               | FALLOUT_4    | Selects correct NIF version + BSTriShape geometry    |
| export_type        | nif          | Export geometry, not a KF animation track            |
| use_tangent_space  | True         | Required for FO4 BSLightingShaderProperty normals    |
| scale_correction   | 1.0          | 1 Blender unit = 1 NIF unit; do not rescale          |
| apply_modifiers    | True         | Bakes temporary Triangulate modifier into export     |
| flatten_skin       | False        | Preserve bone weights on skinned actors              |

The add-on introspects which properties are available in the installed Niftools
build and only passes properties that exist, so it is safe across minor version
differences.

## Mesh requirements before NIF export

- **Apply all transforms** (Ctrl+A → All Transforms). Unapplied scale causes
  geometry to arrive at the wrong size in FO4; unapplied rotation corrupts normals.
- **Triangulate** – FO4 BSTriShape nodes store triangles only. The add-on
  automatically adds a temporary Triangulate modifier and removes it after export.
- **UV map required** – Niftools raises an error without UV coordinates. The
  add-on creates a smart-unwrapped UV map automatically if one is absent.
- **Auto Smooth enabled** – ensures tangent/bitangent vectors exported correctly.
- **No orphaned vertex groups** – weights without an armature corrupt geometry.
- **Poly count ≤ 65,535** – Fallout 4 engine limit per mesh.
- **Materials** – FO4 expects BGSM/BGEM material files; textures must be DDS
  (BC1 for diffuse, BC3 for diffuse+alpha, BC5 for normal maps).
- **Normal map colorspace must be 'Non-Color'** – using sRGB applies unwanted
  gamma correction and produces incorrect tangent-space normals in the NIF.

## Collision meshes

- Name: `UCX_{meshname}` (Fallout 4 / FBX standard).
- Parent to the source mesh.
- No materials, no vertex groups.
- Configure as Static Rigid Body (PASSIVE) + CONVEX_HULL shape so the Niftools
  exporter emits the correct `bhkCollisionObject` / `bhkRigidBody` NIF nodes.
- **Required `bhkRigidBody` physics values for FO4:**
  - `mass = 0.0` – fixed/keyframed static bodies must have zero mass.
    A non-zero mass causes Niftools to emit wrong motion-system flags.
  - `friction = 0.8` – matches vanilla FO4 static geometry.
  - `restitution = 0.1` – minimal bounce; matches FO4 static geometry.
- **Vertex limit: ≤ 256 vertices** – `bhkConvexVerticesShape` supports at most
  256 vertices. The add-on automatically decimates and rebuilds the convex hull
  if this limit is exceeded.
- **Outward face normals** – `bhkConvexVerticesShape` stores supporting half-
  planes derived from face normals. All face normals must point outward. The
  add-on uses `bmesh.ops.recalc_face_normals` to guarantee this.
- **Both visual mesh AND UCX_ collision must be in the same FBX** when using
  the FBX fallback pipeline. NIF-conversion tools (CK, Cathedral Assets
  Optimizer) pair objects by stripping the `UCX_` prefix. The add-on
  automatically adds the collision object to the FBX selection.
- Use the "Generate Collision" button in the add-on export panel.

## Mod directory structure

```
MyMod/
  meshes/        → .nif mesh files
  textures/      → .dds texture files  (BC1/BC3/BC5)
  materials/     → .bgsm / .bgem material files
  animations/    → .hkx animation files
```

## Fallout 4 NIF export – scale reference

FO4's physics/rendering coordinate system:
- 1 NIF unit ≈ 1.43 cm in-game (roughly)
- Typical human height: ~120 NIF units (≈ 1.71 m in Blender at scale 1.0)
- Use scale_correction=1.0 and work in Blender at real-world metre scale.

## Blender version compatibility matrix

| Blender version | NIF export                         | Notes                                      |
|-----------------|------------------------------------|--------------------------------------------|
| 2.80 – 2.89     | ⚠ Partial (Niftools older builds)  | Upgrade to 3.6 LTS for best results        |
| 3.0 – 3.5       | ✓ Direct NIF via Niftools v0.1.1   | Recommended range                          |
| **3.6 LTS**     | ✓ Direct NIF via Niftools v0.1.1   | **Best choice for NIF export**             |
| 4.0             | ⚡ FBX fallback only               | Niftools not compatible; use FBX + CAO     |
| 4.1+            | ⚡ FBX fallback only               | `use_auto_smooth` removed; handled auto    |
| 5.x+            | ⚡ FBX fallback only               | Experimental; report issues                |

**Recommended workflow for Blender 4.x / 5.x:**
1. Export FBX from this add-on (includes UCX_ collision automatically)
2. Open the FBX in Cathedral Assets Optimizer (CAO)
3. CAO converts it to a FO4-compatible NIF with correct collision

## Vertex and triangle limits per mesh

| Limit type            | Value  | Why                                               |
|-----------------------|--------|---------------------------------------------------|
| Triangles per BSTriShape | 65,535 | 16-bit triangle index buffer (uint16)          |
| Vertices per BSTriShape  | 65,535 | 16-bit vertex index buffer (uint16)            |

The add-on's **Validate Mesh** button checks BOTH limits.
The **Split at Poly Limit** button splits over-limit meshes automatically by loose parts and material slots.

> Note: `validate_mesh()` estimates the triangle count from raw polygon data
> (quads produce 2 tris, n-gons produce n-2 tris) so the warning fires before
> triangulation happens at export time.

## LOD naming convention

The **Generate LOD Chain** button creates:
- `{name}_LOD1.nif` – 75 % of original (subtle reduction)
- `{name}_LOD2.nif` – 50 % of original (medium reduction)
- `{name}_LOD3.nif` – 25 % of original (far distance)
- `{name}_LOD4.nif` – 10 % of original (very far / extreme)

The source object is treated as LOD0 (full detail, used when the player is close).
Export each LOD as a separate NIF and place them in the mod's `meshes/` directory.

## Alpha / transparency meshes

Meshes with alpha transparency need BSLightingShaderProperty flags set correctly:
- `Has_Vertex_Alpha = true` if vertex colours store alpha
- `Alpha_Blending = true` or `Alpha_Testing = true` depending on cutout vs blend
- The alpha threshold for cutout transparency is typically `128` (0x80)

The Niftools exporter reads the Blender material's Blend Mode settings.
Use `Alpha Clip` in the material for cutout (alpha test) and `Alpha Blend` for
smooth transparency.

## Texture naming conventions (FO4)

| Suffix  | Type       | DDS Format | Notes                             |
|---------|------------|------------|-----------------------------------|
| `_d`    | Diffuse    | BC1        | RGB colour (BC3 if alpha channel) |
| `_n`    | Normal map | BC5 / ATI2 | Two-channel tangent-space normals |
| `_s`    | Specular   | BC1        | RGB specular / smoothness         |
| `_g`    | Glow       | BC1        | Emissive / glow mask              |
| `_e`    | Environment| BC1        | Cube-map reflection mask          |

Use `TextureHelpers.detect_fo4_texture_type(filepath)` to auto-detect type.
Use `NVTTHelpers.get_fo4_dds_format(texture_type)` to get the correct BC format.
