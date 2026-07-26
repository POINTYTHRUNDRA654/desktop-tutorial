# Fallout 4 – Blender Asset Pipeline & Workflow Reference

Practical scene-setup, retopology, collision, and export guidance for taking
a Blender asset from sculpt to in-game FO4. Sourced and fact-checked via the
Mossy Bridge knowledge base.

---

## Blender scene setup for FO4

| Setting | Value |
|---|---|
| Units | Meters |
| Blender scene scale | 1.0 |
| Orientation | Z up, Y forward |
| FPS | 30 |
| Armature transform | Applied (scale 1.0, rotation 0,0,0) before export |

This is the *Blender scene's own* unit/scale setup a modeler should start
from — separate from whatever internal Havok-unit correction a specific
exporter/pipeline (like this add-on's own `_FO4_UNIT_SCALE`) applies on
top of it during import/export.

Required tools: Blender 4.1+, Havok Content Tools **2014** (64-bit — the
2010.2.0-r1 build profile some older guides reference is the *Skyrim*
build, not FO4's), PyNifly, an FBX importer/exporter for FO4, and
F4AK_HKXPackUI for animation packing.

---

## Retopology & poly budgets (practical targets, not hard engine limits)

| Asset type | Target tris |
|---|---|
| Creatures | 20,000 – 45,000 |
| Weapons | 8,000 – 25,000 (stay under 5,000 for a lean weapon) |
| Props | 500 – 5,000 |
| Architecture | 1,000 – 15,000 |
| Armor per-piece | under ~10,000 |

Keep quads through modeling; only triangulate at final export. Avoid long
thin triangles (shade poorly, cause skinning artifacts). Only add hard
edges where the material actually changes or the silhouette needs it.

**UVs:** single UV set for standard objects, no overlapping UVs unless
deliberately mirrored (e.g. symmetric armor halves), stay within 0–1 space.
Target texel density roughly 512–1024 px/meter for a typical world object.

---

## Collision — how it actually works in FO4

FO4 collision is **Havok-based and lives inside the NIF itself** as
`bhkCollisionObject → bhkRigidBody → a shape block` (`bhkBoxShape` for
simple primitives, `bhkConvexVerticesShape` for a convex hull,
`bhkMoppBvTreeShape` for complex/concave geometry). There is no
engine-level filename-prefix convention the way Unreal uses `UCX_` — FO4
itself never reads a mesh's *name* to decide it's collision.

A `UCX_`-prefixed object name you see in a Blender-side FO4 pipeline (this
add-on included) is a **tooling/authoring convention**, not something FO4
reads: it just tells the exporter *which Blender object to convert* into a
real `bhkCollisionObject` block during export. The prefix never survives
into anything the engine interprets — don't confuse "our Blender workflow
names collision objects `UCX_...`" with "FO4 has a UCX_ convention," which
it does not.

Rules: prefer simple convex shapes over complex ones (cheaper at runtime,
less prone to physics glitches); split a concave collision requirement into
multiple convex hulls rather than one complex concave shape; a collision
mesh authored separately should be triangulated, have no modifiers, and
doesn't need UVs before conversion to a Havok shape.

---

## Export block structure

`BSFadeNode` (root) → `BSTriShape` (mesh geometry — **not** the legacy
`NiTriShape`, which FO4's NIF version replaced) → `BSLightingShaderProperty`
(material) → `BSShaderTextureSet` (texture paths) → `bhkCollisionObject`
(if the object needs collision).

Two common pipelines: Blender → PyNifly directly to `.nif`, or
Blender → FBX → Outfit Studio → NIF (the common path specifically for
armor/outfit conforming work, since Outfit Studio's tools expect it).

**Skeleton requirements:**
- Creatures: exact vanilla bone names — extra bones require also patching
  the relevant behavior graph, they don't "just work."
- Weapons: root node literally named `WEAPON` (verified against real vanilla
  weapon NIFs via PyNifly -- not "WeaponRoot"), plus real per-part nodes like
  `WeaponBolt`/`WeaponMagazine`/`WeaponTrigger`, a `ProjectileNode` for the
  muzzle/projectile origin, and `WeaponOptics1`/`WeaponOptics2` if the
  weapon supports scope attachments. Weapons are never skinned
  (`has_skin_instance=0` on every real weapon shape checked) -- moving
  parts are separate rigid shapes animated via their own node transforms,
  not vertex-weighted to a shared skeleton.
- Armor: correct body-slot partitions **and** the correct numeric slot
  assignment, or the piece z-fights or silently fails to equip alongside
  other worn items.

**Rigging/weights:** never rename deform bones from the vanilla skeleton;
max 4 bone influences per vertex (engine limit); weights must normalize to
1.0; keep bone roll consistent with vanilla (usually Y down the bone); keep
the root bone at (0,0,0).

---

## Vegetation wind — the real SCOL/precombine bug

A tree/plant's procedural wind sway is driven by `BSLeafAnimNode` needing
to be the **top node** of its NIF. The Creation Kit's own SCOL
(static-collection)/precombine mesh-baking process does **not** preserve
`BSLeafAnimNode` as the top node when a wind-animated object gets folded
into a static collection — once it's no longer on top, the engine's TAA
tries to smooth what it reads as sudden, erratic branch movement, producing
a visible blur/flutter artifact in-game. This is a precombine/SCOL-tooling
bug specifically, not a general rendering issue or an animation-authoring
mistake. If a foliage asset flutters/blurs after being placed in a
precombined/SCOL-heavy area, check the *combined* mesh in NifSkope for
`BSLeafAnimNode`'s position in the block hierarchy before assuming the
texture or wind setup is wrong.

A dense forest/vegetation overhaul (new static plant objects scattered
across many vanilla cells) hits precombine at a different scale than a
settlement-scrapping mod — see `bUseCombinedObjects` in the
precombine/PreVis reference doc for the global escape hatch this class of
mod specifically needs.

---

## Animation export (HKX pipeline)

Export bone names must exactly match FO4's skeleton — no fuzzy matching.
Weight-paint cleanly; stray near-zero weights on unintended bones are a
common source of subtle mesh-warping bugs that only surface in certain
poses. Bake transforms, export FBX with **only deform bones** (no IK
control bones/constraints), and avoid scale keyframes entirely — the engine
does not handle animated scale reliably.

Convert FBX → HKX with **Havok Content Tools 2014.1.0-r1** (not the
2010.2.0-r1 Skyrim build profile some older guides reference), or
`hkxcmd`. Name outputs by behavior-graph role (`idle.hkx`, `walk.hkx`,
`attackA.hkx`, `death.hkx`, ...). A new animation still needs behavior-graph
wiring (new states/transitions/events) in the FO4 Behavior Editor before
the engine ever plays it — an HKX file sitting unused in the Data folder
does nothing on its own.

---

## Texture/mesh optimization budgets

| | Guidance |
|---|---|
| Diffuse | BC1 or BC7, power-of-2 dimensions, mipmaps required |
| Normal | BC5 (2-channel) |
| Specular | BC1, grayscale |
| Weapon/armor texture size | 2048×2048 (up to 4096 for a hero asset) |
| Environment texture size | 1024×1024 unless a hero asset |

FO4 has no lightmap/baked-lighting system — "bake lighting" is not a valid
optimization step here (only precombine's draw-call merging and previs's
visibility culling exist). Vertex-color-baked AO/cavity shading is a valid
art technique but is a different thing entirely.
