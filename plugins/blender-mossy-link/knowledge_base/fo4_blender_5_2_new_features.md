# Blender 5.2 LTS — What's New (and what it means for FO4 modding)

Blender 5.2 LTS released July 14, 2026 (5.2.1 patch on August 25, 2026), with 2 years
of LTS support until July 2028. This document summarizes what actually changed and,
more importantly, what matters for the FO4 creature-rig / asset pipeline this add-on
supports.

## Addon compatibility verdict (read this first)

**5.2 shipped no major Python API changes** — anything that ran correctly on 5.1
keeps running on 5.2 without modification. This add-on (`blender_manifest.toml`
already declares `blender_version_min = "5.0.0"` with no upper bound) needed no
code changes for 5.2. Confirmed by source audit: no `bgl` usage anywhere in the
add-on (the deprecated OpenGL module removed in earlier 5.x releases — a common
addon-breaker), no legacy `bone.layers` usage (replaced by bone collections back
in 4.0 — this add-on already uses the modern `action.layers[]` API and bmesh
`loops.layers.uv` correctly), and no reliance on the classic particle system for
anything that would be affected by the curves-based hair changes (the two files
that touch particle systems — glow effects and interior weather — use it for
VFX-style effects, not hair, and are unaffected).

The general risk pattern industry-wide for the 5.x series (per addon-compatibility
write-ups) is addons that reached into `bgl` internals or wrote directly to bone
layers — neither applies here. **Bottom line: install and go, no addon rebuild
required for 5.2 itself.** (Still worth a smoke-test pass through the tutorial
workflows after upgrading, per the add-on's own standing verification practice —
things can regress silently even without an API break.)

## Rigging tools (the ones that matter most for this add-on's workflows)

### Duplicate and Rename (Armature menu)
The single biggest quality-of-life fix for anyone building creature rigs by hand.
Old workflow: duplicate a bone chain, get `Bone.001`, `Bone.002`, `Bone.003`, then
rename every single one manually. New workflow: select the chain, **Armature menu
→ Duplicate and Rename**, and a Find/Replace-style dialog lets you rename the
whole duplicated chain in one pass.

Two concrete uses that intersect directly with `fo4_custom_creature_rig_pipeline.md`
Step 1 ("Build the armature") and the `creature_rig` tutorial's "Build a starting
armature" step:
- **Mirroring limb chains.** Build one "front leg" or one tentacle chain, duplicate
  it, and rename in one shot to "rear leg" or `Tendril_L` → `Tendril_R` instead of
  hand-editing each bone name after the fact.
- **MCH (mechanism) bone chains.** Duplicate a full deform chain and rename it to
  an `MCH_` prefix in one operation instead of renaming bone-by-bone.

Limitation to flag in any tutorial content: there's no partial-prefix shortcut yet
— you type the full replacement name, not just a prefix to prepend.

### World-aligned bones from Shift+A
Adding a new bone (`Shift+A`) now exposes an **Align to Axis** option in the
operator redo panel (bottom-left), which drops the new bone lined up with the
world axes immediately. Previously this required adding the bone then manually
rotating it to square it up — a small but constant friction point when adding a
fresh root/mechanism bone mid-rig (exactly the kind of ad-hoc bone add that comes
up when hand-fixing a custom creature skeleton, e.g. the carnivorous-plant rig
work this add-on has been used for).

### Auto IK improvements
Auto IK (pulling a bone chain like IK without adding an actual IK constraint) now
works starting from a **disconnected parent** and can reach down through the
spine — previously it wouldn't propagate past a disconnected root/parent bone.
Scroll the mouse wheel while dragging to change how many bones up the chain it
grabs. Relevant for quickly posing a custom creature rig to sanity-check
deformation (the add-on's own recommended pose-and-compare-vertex-positions
verification step from `fo4_custom_creature_rig_pipeline.md`) without having to
wire up temporary IK constraints first.

## Everything else in 5.2 (broader context, lower priority for this project)

- **Physics:** new experimental Geometry Nodes-based physics system (XPBD solver)
  for hair and cloth, with custom effectors for gravity/collision. Still
  experimental, no self-collision for cloth yet. Not directly relevant to static
  FO4 flora/creature meshes, but worth knowing about if a future project wants
  cloth-sim-driven tendril/foliage motion previewed in Blender before hand-keying
  the FO4-side wind/flutter animation.
- **Modeling:** new Mesh Bevel node (procedural alternative to the Boolean
  modifier for rounding edges), classic LoopTools operations (Circle, Space,
  Flatten) folded into core tools, sculpt mode gained a "project" brush
  (shrinkwrap-like projection onto a surface).
- **Geometry Nodes:** Empty objects can now host Geometry Nodes modifiers, new
  Sample Sound Frequencies node + Sound socket for audio-reactive procedural
  animation, Get/Set Geometry Bundle nodes, structured Lists.
- **Rendering (Cycles):** new texture-cache system that loads only the tiles/
  resolutions actually needed, cutting VRAM/RAM use (small perf tradeoff, extra
  disk space). Principled BSDF gained a Thin Wall mode for correctly rendering
  paper/leaf/glass-thin materials.
- **Animation (general):** in-between operators now work in Object Mode, Dope
  Sheet can select keys by type, new looped-playback modes (endless/bounce).
- **Grease Pencil:** Fill tool redesigned, updated brush library.
- **Video Sequence Editor:** full Compositor support, GPU-accelerated sequencer
  effects.
- **Asset pipeline:** remote/online asset libraries (studios can host a shared
  library artists browse without leaving Blender); USD import/export gained
  glTF point-cloud support and better color-space conversion.

## Sources
- https://www.blender.org/releases/5-2/
- https://www.blender.org/press/blender-5-2-lts-release/
- https://www.cgchannel.com/2026/07/blender-5-2-lts-is-here-discover-its-5-key-features/
- https://80.lv/articles/blender-5-2-lts-has-been-released
- https://gamefromscratch.com/blender-5-2-lts-released/
- https://www.phoronix.com/news/Blender-5.2-Beta
- https://www.strayspark.studio/blog/blender-5-2-lts-game-developers-addon-compatibility
- https://docs.blender.org/manual/en/latest/animation/armatures/bones/editing/duplicate_rename.html
- Rigging-tips newsletter excerpt supplied directly by Billy (Duplicate and Rename walkthrough, Align to Axis, Auto IK disconnected-parent behavior)
