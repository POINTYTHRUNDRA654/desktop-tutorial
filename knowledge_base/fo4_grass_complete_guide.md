# Fallout 4 Grass – Complete Rules & Limitations

## What Is FO4 Grass?

FO4 grass objects use the **GRAS** record type in the Creation Kit (CK). They are
**not** static props (STAT) or trees (TREE). The engine spawns thousands of grass
instances automatically across LAND records based on density settings defined in
the GRAS record – you never place individual grass blades by hand in the CK.

The engine handles grass differently from every other mesh type:
- Wind animation is done **entirely by the shader and engine parameters**, NOT by
  Blender bones or shape keys.
- Density, scale, and placement are all controlled in the CK GRAS record, NOT in
  the NIF file itself.
- LOD for grass is a simple engine-side alpha fade-out, NOT a traditional LOD
  chain (LOD0/LOD1/LOD2/LOD3).

---

## What You CAN Do With FO4 Grass

- Create a low-poly mesh representing one grass clump, blade cluster, or small
  plant patch.
- Use a single **diffuse texture** (with alpha channel for transparency),
  **normal map**, and **specular map**.
- Use **vertex colors** to control per-vertex wind intensity — darker vertex
  colors = less wind movement, lighter = more sway. This is the only way to vary
  wind within a single mesh.
- Use **alpha clip** (cutout transparency) to achieve realistic silhouettes
  without the cost of alpha blending.
- Export to `meshes/landscape/grass/` (or a sub-folder) as a NIF file.
- Set the collision type to **GRASS** in the add-on (which correctly marks the
  mesh as no-collision thin foliage).
- Assign the **VEGETATION** mesh type so the NIF exporter applies BSFadeNode root,
  Two_Sided SF2 shader flag, and Alpha Clip material flags automatically.
- Set the **fo4_mesh_type** to `VEGETATION` for correct NIF flags.

---

## What You CANNOT Do With FO4 Grass (Hard Limits)

### No Bones / No Rigging
FO4 grass **cannot have an armature or skeleton**. The engine-side wind shader
handles all animation. If you add an armature modifier to a grass mesh:
- The NIF export will produce a skinned mesh the engine does not know how to
  animate as grass.
- The grass will appear static or broken in-game.
- **Do NOT use "Generate Wind Weights" on grass.** That feature is for trees and
  bushes that have a proper skeleton.

### No Physics / No Collision
Grass must have collision type **GRASS** (or **NONE**). It must **never** have a
UCX_ collision mesh. Adding Havok collision to grass:
- Wastes memory because the engine ignores it for GRAS records.
- Can cause CK import errors.

### No Multiple Materials
A grass NIF may only use **one material**. The engine does not support multi-
material grass meshes. Using more than one material slot on a grass object will:
- Cause the NIF export to split the mesh or fail.
- Produce broken in-game rendering.

### No Alpha Blend (Only Alpha Clip)
Grass **must** use **Alpha Clip / Cutout** transparency, NOT alpha blend.
Alpha blend is not supported for GRAS records. Using alpha blend will:
- Produce incorrect depth sorting (z-fighting between grass blades in-game).
- Cause performance degradation because the engine cannot batch-render alpha-
  blended grass.

### No Backface Culling
The grass shader flag **Two_Sided (SF2)** must be enabled. Without it:
- Grass blades will appear invisible from one side.
- The `VEGETATION` mesh type in the add-on sets this flag automatically.

### No Complex Geometry
Avoid any topology that introduces z-fighting or penetrating faces:
- No closed volumes (hollow spheres, boxes). Grass is always open card geometry.
- No internal faces — the two-sided flag renders both sides; internal faces
  create visual artifacts.

### No Shape Keys / Morph Targets
The FO4 NIF format does not support morph animations for grass. Any shape keys
on a grass mesh will be ignored or cause export errors.

### No Embedded Lights or Particles
FO4 grass NIFs cannot contain NiLight nodes or particle systems.

---

## Polygon & Vertex Budget (Critical for Performance)

The engine spawns thousands of grass instances simultaneously. Every polygon and
vertex in your grass mesh is multiplied by that count:

| Guideline         | Target         | Absolute Maximum |
|-------------------|----------------|------------------|
| Polygons per mesh | ≤ 100          | 500              |
| Vertices per mesh | ≤ 150          | 750              |
| Materials         | 1              | 1                |
| Texture maps      | Diffuse+Normal+Specular | 3 max |

Exceeding these targets will cause significant FPS drops in areas with dense
grass coverage. The FO4 polygon hard limit (65,535) does NOT apply to grass in
a practical sense — any grass mesh over ~500 polygons is a performance problem.

---

## Material & Texture Requirements

1. **Node-based material** — must use Blender nodes.
2. **Diffuse texture** — RGBA: RGB = color, A = alpha mask for blade shape.
3. **Normal map** — tangent-space normal map for surface detail.
4. **Specular map** — optional but recommended; controls shininess.
5. **Alpha Clip** — material blend mode must be Clip (not Blend, not Opaque).
6. **Two-Sided** — backface culling must be OFF (the VEGETATION type handles this).
7. **Texture resolution** — 256×256 or 512×512. 1024×1024 is the practical max.
   Grass textures are viewed at distance and at small scale; high-resolution
   textures waste VRAM with no visible benefit.

---

## UV Mapping

- A UV map is **required** (without it, textures cannot be applied).
- Use the smallest possible UV islands; the whole blade cluster typically fits
  on a single UV sheet with no wasted space.
- Overlapping UVs are acceptable for grass because there is only one material.

---

## Export Path & NIF Flags

| Property        | Required Value                              |
|-----------------|---------------------------------------------|
| Export path     | `meshes/landscape/grass/<yourfile>.nif`     |
| Mesh type       | `VEGETATION`                                |
| Collision type  | `GRASS` (no collision)                      |
| NIF root node   | BSFadeNode                                  |
| Shader flags    | Two_Sided (SF2) + Alpha_Test (AF2)          |
| Alpha threshold | 128/255 (adjust per texture)                |

The add-on's **Export Vegetation as NIF** operator sets all of these flags
automatically when the mesh type is `VEGETATION`.

---

## Creation Kit (CK) Requirements

After exporting the NIF:
1. Create a **new GRAS record** in the CK Object Window.
2. Point the GRAS model to your exported NIF.
3. Set density, min/max slope, min/max size variance, and wind.
4. **Wind speed and direction are set in the GRAS record**, not in the NIF.
5. To use your grass, paint it on a LAND record via the Landscape editor using
   a landscape texture that references your GRAS record.
6. You **cannot** place individual grass objects via the Cell/World editor —
   grass placement is always driven by LAND texture painting.

---

## Wind Animation (Engine-Side Only)

FO4 uses a shader-based wind system for grass:
- Wind parameters live in the **GRAS record** (wind speed, wind angle).
- Per-vertex wind intensity is encoded in **vertex colors** on the mesh
  (channel assignment: R or luminance, depending on the game shader version).
- **Do not add armature bones** to simulate wind — the engine will ignore them
  and the NIF will be malformed for GRAS use.

---

## LOD for Grass

FO4 does **not** use traditional LOD0/LOD1/LOD2/LOD3 chains for grass. Instead:
- The engine fades grass out with distance automatically.
- Fade distance is controlled by the GRAS record (`Grass Draw Distance`).
- Do **not** create a LOD chain for a grass NIF — it is unnecessary and ignored.

---

## Common Mistakes (Time Wasters)

| Mistake                                  | Symptom in-game                     |
|------------------------------------------|-------------------------------------|
| Adding armature / wind bones             | Static or broken grass              |
| Using alpha blend instead of alpha clip  | Z-fighting, transparent patches     |
| Too many polygons per grass mesh         | Severe FPS drops in grass areas     |
| Multiple material slots                  | Export failure or invisible mesh    |
| Adding a UCX_ collision mesh             | Wasted memory, possible CK errors   |
| Enabling backface culling on material    | One-sided invisible blades          |
| Exporting to wrong path                  | CK cannot find NIF                  |
| Using STAT mesh type instead of VEG      | Wrong NIF flags, no alpha clip      |
| Using shape keys for animation           | Export error or silent ignore       |
| High-res textures (2K+) on grass         | VRAM waste, no visual gain          |
| Building a LOD chain                     | Ignored by engine, wastes disk      |
