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
- **Poly count ≤ 65 535** – Fallout 4 engine limit per mesh.
- **Materials** – FO4 expects BGSM/BGEM material files; textures must be DDS
  (BC1 for diffuse, BC3 for diffuse+alpha, BC5 for normal maps).

## Collision meshes

- Name: `UCX_{meshname}` (Fallout 4 / FBX standard).
- Parent to the source mesh.
- No materials, no vertex groups.
- Configure as Static Rigid Body (PASSIVE) + CONVEX_HULL shape so the Niftools
  exporter emits the correct `bhkCollisionObject` / `bhkRigidBody` NIF nodes.
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
