# Fallout 4 – Animation Export Pipeline

This document covers the complete Blender → FO4 animation workflow using
the two supported converters (ck-cmd and Havok2FBX) and the settings that
produce working HKX files for the game.

---

## Overview

```
Blender (.blend)
    │  bake animation + export FBX (30 FPS)
    ▼
FBX animation file
    │  ck-cmd  (primary)  OR  Havok2FBX  (fallback)
    ▼
HKX animation file
    │  pack into BSA or place as loose file
    ▼
Fallout 4 (in-game)
```

---

## Step 1 — Blender animation setup

### Frame rate
Set the scene frame rate to **30 FPS** (`Output Properties → Frame Rate → 30`).
FO4 uses 30 FPS internally; exporting at a different rate produces speed
artifacts.

### Armature requirements
- Root bone: **`COM`** (centre of mass) for biped rigs.
- Bone names must match the FO4 skeleton exactly (case-sensitive).
- All bone constraint effects must be **baked** before export
  (`Action → Bake Action`, check "Clear Constraints").
- Apply the armature modifier if present.

### Root motion
Animations that move the character (locomotion, power-attack) use **root
motion** baked onto the `COM` bone.  Do NOT leave root motion as position
keyframes on the character object — bake it onto the bone.

---

## Step 2 — Export FBX from Blender

Settings (Blender FBX exporter):
```
Scale: 1.0
Apply Unit: ON
Apply Transform: ON
Path Mode: Auto
Bake Animation: ON
  Key All Bones: OFF (only keys that differ from rest)
  Force Start/End Keying: ON
  Simplify: 0 (no simplification)
Include armature: Armature only (no mesh if exporting animation-only)
```

Alternatively use the add-on's "Export Animation (HKX)" panel which
pre-configures all these options and calls ck-cmd automatically.

---

## Step 3 — Convert FBX → HKX

### ck-cmd (recommended)

ck-cmd (by aerisarn) is the community-maintained FBX → HKX converter.
It requires a matching `skeleton.hkx` for the rig you are animating.

```bat
ck-cmd importanimation --game="Fallout4" ^
    --import "anim.fbx" ^
    --export "anim.hkx" ^
    --skeleton "skeleton.hkx"
```

Skeleton files are extracted from the game BSAs:
- Biped: `Meshes\Actors\Character\Animation\Animation_DS\skeleton.hkx`
- Creature skeletons: `Meshes\Actors\<creature>\Animation\skeleton.hkx`

### Havok2FBX (legacy fallback)

Havok2FBX requires the Havok SDK 2014-1-0 and Autodesk FBX SDK 2014.2.1
to compile from source.  No pre-built binaries are publicly available.
Use ck-cmd unless you have an existing Havok2FBX build.

---

## Step 4 — Place the HKX file

Animation HKX files go in the behaviour graph folder for the skeleton:

```
Data\Meshes\Actors\Character\Animations\<animName>.hkx
```

Register them in the `AnimationFileData` record in the CK (or use FNIS /
Nemesis for custom animations).

---

## Animation types and their paths

| Animation type        | Target path                                          |
|-----------------------|------------------------------------------------------|
| Idle (standing)       | `Actors\Character\Animations\`                       |
| Power attack          | `Actors\Character\Animations\`                       |
| Creature              | `Actors\<creature>\Animations\`                      |
| Object animation (NIF)| `Meshes\<path-to-nif>.hkx` (same folder as NIF)      |

---

## Common animation export errors

| Symptom                        | Cause                                  | Fix                              |
|--------------------------------|----------------------------------------|----------------------------------|
| T-pose / no motion in-game     | Root motion not baked to COM bone      | Bake action with root bone       |
| Animation plays too fast/slow  | Wrong FPS (24 vs 30)                   | Set scene to 30 FPS              |
| ck-cmd "skeleton mismatch"     | Wrong skeleton.hkx for this rig        | Use matching skeleton file       |
| Mesh pokes through skin        | Too many bone influences (> 4)         | Limit Total to 4 in weight paint |
| Floating / offset mesh         | Root bone missing or wrong name        | Add/rename root bone to COM      |
| ck-cmd "joint not found"       | Bone name mismatch vs skeleton.hkx     | Check bone names match skeleton  |
