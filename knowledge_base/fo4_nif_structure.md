# Fallout 4 – NIF File Structure Reference

This document describes the NIF node hierarchy used by Fallout 4 and what
Blender exporters (PyNifly / Niftools) expect for each mesh type.

---

## Root Node Types

| Mesh Type         | Root Node         | BSXFlags  | Notes                          |
|-------------------|-------------------|-----------|--------------------------------|
| Static prop       | BSFadeNode        | 2 (Havok) | Most world objects             |
| Skinned (NPC/armor)| NiNode           | —         | Always has BSSkin::Instance    |
| LOD mesh          | BSFadeNode        | 2         | Same as static, reduced poly   |
| Vegetation        | BSFadeNode        | 2         | Needs Alpha Clip material      |
| Animated prop     | NiNode            | 1 (Animated) | Has NiKeyframeController    |
| Furniture         | NiNode            | 1         | Needs CK furniture markers     |
| Architecture      | BSFadeNode        | 2         | Collision required             |
| Weapon            | NiNode            | —         | Attached via bone, not skin    |

---

## Geometry Node Types

- **BSTriShape** — Standard static geometry. Used for static props, LOD, vegetation.
- **BSSubIndexTriShape** — Skinned geometry. Required for all character/armor meshes.

Both store geometry as vertex buffers (positions, normals, UVs, colours, skin weights).

---

## Essential Child Nodes

### BSLightingShaderProperty
Every visible mesh needs exactly one per shape. Key fields set by Blender export:
- `Shader Type`: must be `Default` (0) for most FO4 meshes.
- `Shader Flags 1` bit 21 (`Skinned`): must be set for BSSubIndexTriShape.
- `Shader Flags 2` bit 5 (`Double Sided`): required for vegetation/foliage.
- `Alpha Threshold`: set to 128 for alpha-clip vegetation.

### BSShaderTextureSet

Nine texture slots (0-indexed):

- Slot 0: Diffuse (`_d.dds`) — albedo / color
- Slot 1: Normal map (`_n.dds`) — tangent-space normals, specular packed in alpha
- Slot 2: Smooth Spec / Env mask (`_s.dds`) — specular / environment reflection mask
- Slot 3: Greyscale / Palette (`_g.dds`) — emittance, glow mask, or palette key
- Slot 4: Glow / Emissive — emissive mask (optional; often same `_g.dds`)
- Slot 5: Inner Layer Diffuse — used for multi-layer / layered materials
- Slot 6: Wrinkle detail map
- Slot 7: Displacement / Height map
- Slot 8: (variant smooth spec; unused in most vanilla meshes)

All texture paths must be relative to the `Data/` folder and use backslash
separators: `textures\actors\character\basemale\basemalebody_d.dds`.

### bhkCollisionObject (Havok Physics)
Required when BSXFlags bit 1 is set. Children:
- `bhkRigidBodyT` — PASSIVE (static) or DYNAMIC (movable).
- `bhkMoppBvTreeShape` → `bhkPackedNiTriStripsShape` — for complex shapes.
- `bhkConvexVerticesShape` — for simple (≤ 256 vertex) convex shapes.

---

## LOD Distance Settings

LOD objects should be named with `_LOD1`, `_LOD2`, etc. suffixes.
FO4 LOD distances (approximate, in game units):
- LOD0 (full detail): 0 – 2048
- LOD1: 2048 – 4096
- LOD2: 4096 – 8192
- LOD3: 8192+ (or `_far.nif` for distant LOD)

---

## Common Export Pitfalls

1. **Applying transforms before export is mandatory.** Un-applied scale or rotation
   causes wrong collision size, broken normals, and physics misfires.

2. **Single UV map required.** FO4 BSTriShape supports up to 2 UV sets;
   if the mesh has no UV map the NIF exporter will fail silently.

3. **No N-gons.** BSTriShape geometry stores only triangles. Any quad or N-gon
   must be triangulated before export.

4. **Bone names are case-sensitive.** FO4 skeleton bone names must match exactly
   (e.g. `Spine1` ≠ `spine1`). Mismatched names cause invisible mesh in-game.

5. **Vertex count per BSTriShape ≤ 65,535.** Larger meshes must be split.
