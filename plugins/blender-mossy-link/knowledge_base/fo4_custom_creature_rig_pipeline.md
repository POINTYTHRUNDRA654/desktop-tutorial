# Fallout 4 – Building a Brand-New Custom Creature (Rig, Weights, Animation, Export)

This document covers the real, verified workflow for taking a **static, unrigged
creature mesh that has no existing skeleton** (a scavenged/converted asset, a
new sculpt, etc.) all the way through rigging, weight painting, and authoring
attack animations in Blender. It is the missing "from zero" companion to
`fo4_animation_pipeline.md`, which assumes a `skeleton.hkx` already exists.
This one covers what to do when it doesn't.

Worked example used to develop and verify every step below: a carnivorous
plant creature (`gsfunguscarnivorousplant05.nif`) with disjoint,
non-manifold geometry — the hardest case for auto-rigging.

---

## Step 0 — Diagnose the mesh before doing anything

Don't assume. Check in the Blender Python console:
```python
obj = bpy.context.object
print(len(obj.data.vertices), obj.vertex_groups[:], obj.find_armature())
```
Zero vertex groups + no armature = starting from scratch. This is common for
meshes pulled out of other mods/games (see mod attribution note at the
bottom) — they're static set-dressing, not rigged actors.

## Step 1 — Build the armature

Use the add-on's `fo4.build_carnivorous_plant_rig` operator (or the
equivalent creature-rig builder for other body plans) as a starting
skeleton, then hand-edit bone names/counts to match the real mesh shape.
Key convention: **creature/flora skeletons do not need the `NPC `
prefix** that biped bones require (`fo4_bone_names.py`:
`CREATURE_NO_PREFIX = True`) — name bones whatever describes the anatomy
(`Stem`, `Jaw_Upper`, `Tendril_L`, etc.).

For tentacle/vine/whip-type limbs: a single rigid bone looks stiff and
robotic when animated. Subdivide it into a 2–3 segment chain **before**
weight painting:
```python
# In Edit Mode, with the bone selected:
bpy.ops.armature.subdivide(number_cuts=2)
```
This creates `Bone`, `Bone.001`, `Bone.002` as a connected chain and
produces far more convincing reach/whip motion.

**Do not use PyNifly's own "Create Bones" operator to build this
armature.** Per PyNifly's own documented limitations (as of V28.3.0),
"Create Bones" run against a non-human skeleton silently substitutes
vanilla human bone positions, and its "Rename Bones" only renames some,
not all, non-human bones — there's no error, it just produces a rig with
the wrong bone placements for your creature. Use this add-on's own
`fo4.build_*_rig` operators (or a correct reference skeleton, per
PyNifly's own advice) instead, as described above.

**Blender 5.2+ shortcuts for this step** (see
`fo4_blender_5_2_new_features.md` for full details):
- **Duplicate and Rename** (Armature menu) — build one limb/tentacle
  chain, duplicate it, and rename the whole duplicated chain in one
  Find/Replace pass instead of renaming `Bone.001`, `Bone.002`, etc. by
  hand. Ideal for mirroring left/right chains (`Tendril_L` →
  `Tendril_R`) or renaming a duplicated deform chain to an `MCH_`
  prefix. No partial-prefix shortcut yet — type the full replacement
  name.
- **Align to Axis** — the `Shift+A` Add Bone operator's redo panel now
  has an "Align to Axis" option that drops a new bone lined up with
  world axes immediately, skipping the manual-rotate step when adding
  an ad-hoc root/mechanism bone mid-rig.
- **Auto IK** now reaches through a disconnected parent and down the
  spine, useful for quickly posing the rig to sanity-check deformation
  (see Step 2's verification note) without wiring up temporary IK
  constraints.

## Step 2 — Weight the mesh (the part that actually breaks)

**Try heat weighting first, but expect it to fail on non-manifold meshes:**
```python
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
```
Symptom of failure: console warning "Bone Heat Weighting: failed to find
solution for one or more bones", and **every vertex group ends up with 0
weighted vertices on every bone**. This happens when the mesh has
disjoint/non-manifold shells (separate petal spikes, floating tendril
geometry, etc.) — heat weighting needs a continuous manifold surface to
solve the diffusion problem and silently produces nothing usable otherwise.

**Fix: switch to envelope weighting**, then manually tighten the envelope
radii (the defaults are wildly oversized for small creature bones and
cause one bone to swallow most of the mesh):
```python
bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')

for bone in armature.data.bones:
    length = (bone.tail_local - bone.head_local).length
    bone.envelope_distance = length * 0.5
    bone.head_radius = length * 0.22
    bone.tail_radius = length * 0.16
```
Scaling radii **proportional to each bone's own length** (not a fixed
value) is what makes this work across bones of very different sizes in
the same armature (a 60cm stem bone next to a 4cm jaw-tip bone).

**Even tuned envelopes leave gaps** — thin spike tips and small terminal
bones (jaw tips, etc.) can end up with 0 weighted vertices each. Close the
gap with a nearest-bone-on-segment fallback pass, forcing every remaining
unweighted vertex onto its geometrically closest bone at full weight:
```python
def closest_point_on_segment(p, a, b):
    ab = b - a
    t = (p - a).dot(ab) / max(ab.length_squared, 1e-9)
    t = max(0.0, min(1.0, t))
    return a + ab * t

# for each unweighted vertex: find the bone whose head-tail segment
# minimises (vertex_world_pos - closest_point_on_segment).length,
# then vertex_group[that_bone].add([vertex_index], 1.0, 'REPLACE')
```

**Always verify by measuring actual deformation, never by trusting the
operator's "success" message:**
```python
depsgraph = bpy.context.evaluated_depsgraph_get()
eval_obj = obj.evaluated_get(depsgraph)
mesh = eval_obj.to_mesh()
# compare rest-pose vs posed vertex positions/centroid — if they're
# identical, that bone/vertex group isn't actually deforming anything
eval_obj.to_mesh_clear()
```
Confirm **0 unweighted vertices** before moving on. On the plant mesh this
required all three passes above (heat → envelope → nearest-bone fallback)
to get from 9718 unweighted verts down to 0.

## Step 3 — Author animations

Use `bpy.data.actions.new(name)` + `arm_obj.animation_data_create()` +
`arm_obj.animation_data.action = new_action` to create each clip as its
own independently-named action (not an NLA strip) — this matches the
add-on's own convention and lets multiple clips (idle, attack, death)
live side by side without overwriting each other.

**Check bone-name assumptions in existing generator operators before
calling them.** For example `generate_action_attack_grab` /
`_whip` / `_coil` in `fo4_creature_animation.py` only recognise bones
literally named `branch_*` — if your rig uses different names (`Tendril_L`
etc.) these functions silently do nothing useful to your limbs, and worse,
they overwrite whatever the currently-active action is. Either rename
bones to match, or hand-author a new action using the same
keyframe-per-frame pattern targeting your real bone names.

Verify every animation the same way as weights: compare evaluated-mesh
vertex positions between two frames, don't just trust that keyframes were
inserted.

## Step 4 — Export FBX for conversion

Two exports are needed:
1. **Skeleton-only FBX**, bind pose (all pose bones reset to identity),
   `bake_anim=False`. This is what `ck-cmd importrig` converts into the
   NIF/HKX skeleton.
2. **One FBX per animation**, armature-only selection, `bake_anim=True`.

## Step 5 — Convert with ck-cmd — ⚠️ known-broken for brand-new creatures

This is the current honest gap. Two real bugs were found and one is fixed;
the other is an unresolved upstream crash.

**Bug 1 (fixed in this add-on):** `export_animations_hkx()` checked
`os.path.isfile(ckcmd_path)`, but `ckcmd_path` in preferences is
configured as a **folder** (e.g. `D:\blender_tools\ck-cmd`), not the exe.
That check was always `False`, so real HKX export silently never ran even
when ck-cmd was correctly installed — it always fell through to an
"FBX-only" branch. Fixed by resolving a directory path to
`<dir>/ck-cmd.exe` before the check.

**Bug 2 (not yet fixed, still uses the wrong command):**
`export_animations_hkx()` calls
`ck-cmd importanimation <fbx> --game fo4 --platform WIN64 --dest <dir>`.
None of `--game`/`--platform`/`--dest` exist in the real installed ck-cmd
CLI (confirmed via `ck-cmd help importanimation`), **and** `importanimation`
requires an already-existing `skeleton.hkx` — which a brand-new custom
creature never has. The correct command for a new creature is:
```
ck-cmd importrig <skeleton.fbx> -a <folder_of_animation_fbx_files> -e <output_dir>
```
`importrig` does both jobs in one call: converts the skeleton FBX to
NIF/HKX **and** batch-converts every animation FBX in the `-a` folder
against it.

**Unresolved: `importrig` itself crashes when `-a` is supplied**, on this
mesh's 21-bone custom skeleton. Reproduced consistently:
- `ck-cmd importrig <skel> -a <anims> -e <out>` → return code
  `3221226505` (`0xC0000409`, `STATUS_STACK_BUFFER_OVERRUN` — a native
  crash inside ck-cmd itself, not a usage error). Happens *after* it
  successfully finishes mapping every FBX node to a NiNode (visible in
  stderr), i.e. it crashes in the animation-processing stage specifically.
- Ruled out as the cause: a path containing `&` (copying everything to a
  path with no special characters reproduced the identical crash and
  return code).
- `ck-cmd importrig <skel> -e <out>` **without** `-a` returns `RC 0` but
  writes no output file and prints `Exception occurred: Illegal cast to
  string; type is actually empty` — so skeleton-only conversion isn't a
  working fallback either in this ck-cmd build.
- Also worth noting: `importrig` prints
  `Cannot find parent bone of Root (CarnivorousPlant)` for every custom
  skeleton — harmless-looking (conversion continues past it) but may be a
  clue about what this ck-cmd build expects for scene-root naming.

**Correction (checked, then ruled out):** `ck-cmd RetargetCreature` looked
like the obvious workaround, but its actual usage
(`ck-cmd help RetargetCreature`) is
`retargetcreature <source_havok_project_cache> <source_havok_project_folder> <target_name> -s <skyrim_le_folder>`
— it is a **Skyrim LE** havok-project tool bundled into this ck-cmd build,
not a Fallout 4 creature-skeleton retarget tool, and it requires a Skyrim
LE install folder. It does not apply here.

**Practical way forward for a real creature mod today, until the
`importrig -a` crash above is root-caused or ck-cmd is patched/rebuilt:**
rebuild the Blender rig on top of an **existing FO4 creature's real
skeleton** instead of a 100%-from-scratch one — import that creature's
skeleton FBX (exported from its already-existing `skeleton.hkx`) into
Blender, re-parent your mesh to its bones (renaming/remapping your custom
bones onto its hierarchy where needed), and animate on that skeleton. That
skeleton already has a working `skeleton.hkx`, so animations can go
through the already-correct `ck-cmd importanimation` path instead of the
crashing `importrig -a` path. This is more rework up front (bone-hierarchy
remapping) but is the direction to try next — it hasn't been attempted
yet for this creature.

---

## Scope note: beyond rig + animation

Getting a creature to actually attack/kill/be-harvested/respawn in-game
also needs, independent of the above: a Creation Kit actor/race record, a
behavior graph event hookup for the attack animations, and either
Papyrus scripting or a keyword/perk-based damage and loot hookup. None of
that exists in this add-on yet — it is Creation Kit work, not a Blender
export problem, and needs to be scoped and built separately.

---

## Licensing note

If the source mesh comes from someone else's published mod, treat any of
their non-free tutorial/paid content about it as **local-reference only**
— never bundle it into this add-on's shipped knowledge base. This
document intentionally contains no third-party mod content, only the
general Blender/ck-cmd technique, which is safe to ship.
