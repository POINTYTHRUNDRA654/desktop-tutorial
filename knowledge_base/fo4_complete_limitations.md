# Fallout 4 – Complete Limitations Reference

A single reference for every hard limit, requirement, and restriction in Fallout
4 modding that affects what you can build in Blender and export to the game.

---

## Hard Numeric Limits

| Resource                    | Limit    | Consequence if exceeded            |
|-----------------------------|----------|------------------------------------|
| Polygons per mesh object    | 65,535   | NIF export fails or mesh corrupts  |
| Bones per skeleton          | 256      | Engine rejects NIF / CTD           |
| Collision vertices (UCX_)   | 256      | Silent NIF corruption              |
| Material slots per mesh     | 1–2 (practical) | Multi-mat grass/veg fails; armor can use 2 |
| Vertex groups per object    | 256      | Weight-paint export truncated      |
| UV channels                 | 2 max    | Extra UV channels ignored          |
| Texture resolution          | 4096×4096 max | Higher res silently ignored or CTD |
| Bone influences per vertex  | 4        | Extra influences stripped silently |
| Objects in one NIF          | ~250 practical | CK becomes slow / unstable above this |
| NIF file size               | ~50 MB practical | CK load times; large meshes split by CK |

---

## Mesh Requirements (All Objects)

- **Triangles only** — FO4 NIFs require every face to be a triangle. Quads and
  N-gons must be converted before export (the NIF exporter may do this
  automatically, but unexpected triangulation can distort normals).
- **Scale applied** — Object scale must be (1, 1, 1) before export. Un-applied
  scale causes incorrect collision sizing, broken physics, and visual
  distortion in-game.
- **UV map required** — At least one UV map must be present. Without a UV map,
  textures cannot be applied and the NIF export may fail.
- **No spaces in object name** — Some NIF exporters reject names with spaces.
  Use underscores instead.
- **ASCII names only** — Object names and bone names must be ASCII characters.
  Non-ASCII names will cause NIF load failures in-game.
- **No loose vertices** — Vertices not connected to any edge inflate the vertex
  count and can cause export artifacts.
- **No non-manifold geometry on collision meshes** — Open or self-intersecting
  collision meshes produce broken Havok physics.
- **Geometry modifiers applied** — Subdivision Surface, Boolean, Mirror, Array,
  Solidify, Bevel, and similar modifiers must be applied or deleted before export.

---

## Material Requirements

- **Node-based materials required** — Niftools requires Blender node-based
  materials. Materials that do not use nodes will cause export failure.
- **Diffuse texture node named "Diffuse"** — The Niftools exporter looks for a
  node with label or name "Diffuse" to determine the base color texture slot.
- **Normal map node named "Normal"** — Expected by the exporter for the normal
  map slot.
- **Specular node named "Specular"** — Expected for the specular slot.
- **DDS format only** — FO4 only loads DDS textures. PNG/JPG/TGA files must be
  converted to DDS before use in-game (use NVTT or TexConv).
- **Power-of-two texture dimensions** — Textures should be 64, 128, 256, 512,
  1024, 2048, or 4096 pixels per side. Non-power-of-two dimensions are not
  supported by DDS MIP generation and may cause rendering errors.
- **Texture path under `textures/`** — All texture paths in the NIF must be
  relative to the `Data/` folder and must start with `textures/`.

---

## Collision Mesh Requirements

- **UCX_ prefix** — Collision meshes must be named `UCX_<parent_object_name>`.
- **256 vertex max** — See hard limits table above.
- **No materials on collision meshes** — Materials on collision meshes are
  ignored in-game and waste data.
- **Scale applied** — Same as all meshes; must be (1, 1, 1).
- **Convex hull for simple props** — Simple objects should use a convex hull
  collision shape. Complex shapes require multiple convex hulls.
- **GRASS / MUSHROOM / NONE collision types** — These mesh types have **no
  collision at all**. Do not create UCX_ meshes for them.

---

## Armature / Skeleton Requirements

- **Root bone required** — FO4 skeletons must have a root bone named
  `NPC Root [Root]` (or at minimum a bone named `Root`).
- **Bone count ≤ 256** — See hard limits table.
- **4 bone influences max per vertex** — Extra influences are stripped.
- **Vertex groups must match bone names exactly** — Unmatched vertex groups
  produce weight-paint export warnings and may cause broken skinning.
- **Frame rate: 30 fps** — FO4 animation uses 30 frames per second. Blender
  scenes should be set to 30 fps before exporting animations.
- **No root motion in animations** — FO4 uses Havok behavior graphs to manage
  root motion; root-motion animation tracks in the NIF are typically ignored.
- **NIF skeleton path must match exactly** — The skeleton NIF path referenced in
  the skin data must match the in-game skeleton path character for character.

---

## Grass-Specific Requirements

See `fo4_grass_complete_guide.md` for full details. Quick summary:

- No armature / no bones (wind is engine-side).
- No collision mesh.
- One material only.
- Alpha Clip transparency (not Alpha Blend).
- Two-Sided shader flag (set by VEGETATION mesh type).
- Very low polygon count (≤ 100–500 per mesh instance).
- Mesh type must be VEGETATION.
- Export path: `meshes/landscape/grass/`.
- No LOD chain — engine handles distance fade automatically.
- Wind parameters set in the CK GRAS record, not in the NIF.

---

## Static Prop Requirements

- Mesh type: **STATIC** or **LOD**.
- UCX_ collision mesh required for any solid prop that players can stand on or
  interact with physically.
- No armature — static props have no skinning.
- Export path: typically `meshes/` + mod-specific sub-folder.
- NIF root: BSFadeNode.

---

## Armor / Wearable Mesh Requirements

- Mesh type: **ARMOR**.
- Must be skinned to the standard FO4 body skeleton.
- Root bone: `NPC Root [Root]`.
- Vertex groups must match skeleton bone names.
- No UCX_ collision mesh (armor uses the character's physics capsule).
- One or two material slots maximum.
- Export path: `meshes/Armor/` + mod-specific sub-folder.

---

## Weapon Mesh Requirements

- Mesh type: **WEAPON**.
- No vertex skinning (weapons attach to a named bone, not via skinning).
- No UCX_ collision on the visual mesh (a separate collision shape is defined
  in CK).
- Weapon parts must be named according to the standard attach-point convention.
- Export path: `meshes/Weapons/` + weapon name.

---

## Architecture / Building Requirements

- Mesh type: **ARCHITECTURE**.
- BSXFlags: Has-Havok (bit 2) must be set — the exporter sets this automatically
  for ARCHITECTURE mesh type.
- UCX_ collision required.
- Modular pieces must share the same origin convention for seamless tiling.
- Export path: `meshes/Architecture/` + location sub-folder.

---

## LOD Mesh Requirements

- Mesh type: **LOD**.
- LOD chain: LOD0 (close, high-poly) → LOD1 → LOD2 → LOD3 (far, low-poly).
- Each LOD level should use the same UV layout as LOD0 so they share textures.
- LOD3 should be under 100 polygons.
- LOD meshes must share the same pivot/origin as the base mesh.
- The CK/LOD generator expects LOD NIF files at specific paths following the
  `meshes/landscape/` or object-specific path convention.

---

## NIF Export Path Conventions

| Object Type    | Path Convention                          |
|----------------|------------------------------------------|
| Grass          | `meshes/landscape/grass/<name>.nif`      |
| Static prop    | `meshes/<ModName>/`                      |
| Armor          | `meshes/Armor/<ArmorName>/`              |
| Weapon         | `meshes/Weapons/<WeaponName>/`           |
| Architecture   | `meshes/Architecture/<LocationName>/`    |
| Flora          | `meshes/plants/`                         |
| Tree           | `meshes/landscape/trees/`               |
| LOD            | `meshes/<type>/LOD/`                     |

---

## Creation Kit Constraints

- **GRAS records** — Grass is placed via LAND texture painting only; individual
  placement is not possible.
- **STAT records** — Static props are placed by hand in the cell editor.
- **Cell/Worldspace limits** — CK becomes unstable with very large numbers of
  references per cell (practical limit ~500–1000 references per cell).
- **Navmesh** — Any new floor/walkable surface requires a navmesh update or NPCs
  will not path through the area.
- **Lighting** — New architecture or large objects require baked lighting (pre-
  combined + pre-combined maps) to avoid brightness seams in-game.

---

## Performance Guidelines

| Asset Type      | Polygon Budget     | Notes                              |
|-----------------|--------------------|------------------------------------|
| Grass mesh      | ≤ 100 (aim)        | Spawned thousands of times         |
| Small prop      | ≤ 2,000            | Keys, bottles, small items         |
| Medium prop     | ≤ 5,000            | Furniture, machines                |
| Large prop      | ≤ 15,000           | Vehicles, large machinery          |
| Architecture    | ≤ 30,000 per piece | Broken into modules                |
| Armor           | ≤ 10,000           | Counts against character draw call |
| Weapon          | ≤ 8,000            | Held in hand; high screen presence |
| Tree (LOD0)     | ≤ 3,000            | Has LOD chain                      |

---

## Texture Size Guidelines

| Asset Type      | Diffuse     | Normal      | Specular    |
|-----------------|-------------|-------------|-------------|
| Grass           | 256–512     | 256–512     | 256         |
| Small prop      | 512–1024    | 512–1024    | 512         |
| Medium prop     | 1024        | 1024        | 512–1024    |
| Large prop      | 1024–2048   | 1024        | 1024        |
| Character body  | 2048        | 2048        | 1024–2048   |
| Architecture    | 2048        | 2048        | 1024        |

Always generate DDS with full MIP chain (mipmaps). Missing MIPs cause blurry
textures at distance and can produce rendering artifacts.
