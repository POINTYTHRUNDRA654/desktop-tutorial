# Unity to Fallout 4 Animated Asset Architecture Formula

This guide defines a reliable conversion pipeline for moving animated Unity assets into Fallout 4 while preserving rig integrity, vertex weights, and animation behavior compatibility.

---

## Core Workflow Formula (Unity → Blender → Fallout 4)

To move animated Unity assets into Fallout 4 via Blender and the Creation Kit (CK), reconcile Unity’s engine-level animation model with Fallout 4’s bone-weighted `.nif` and Havok `.hkx` behavior graph system.

### 1) Asset Extraction (Unity to Blender)

Unity stores animations separately from meshes or bakes them into `.fbx` files.

- **Tool:** AssetRipper or AssetStudio  
- **Mesh Export:** Export mesh + associated avatar/skeleton as **FBX (Binary)**  
- **Animation Export:** Export animation clips (`.anim`) converted to FBX animation tracks

### 2) Blender Setup and Import

Blender requires Fallout-aware plugin setup to avoid format loss.

- **Tools:** Blender 3.x/4.x + PyNifly  
- **Import:** Import the Unity FBX
- **Scale Correction:** Unity is meter-based while Fallout 4 uses a different unit scale. Scale armature and mesh by an appropriate factor (commonly in the `70x–100x` range based on target in-game size), then apply transforms (`Ctrl + A`)

### 3) Rigging and Bone Renaming (Translation Layer)

Fallout 4 requires strict skeleton naming and hierarchy consistency.

- **Actors/Creatures:** Rename Unity bones to match exact names of the target vanilla FO4 skeleton  
- **Static Animated Objects:** Use valid root naming (for example `Bip01`) or standard object physics node structures  
- **Weights:** Rebind/verify vertex groups so all deformation weights map to renamed bones

### 4) Animation Baking and PyNifly Export

Fallout 4 separates visual mesh data from runtime animation logic.

- **Bake:** In Blender Action Editor, bake actions with **Visual Keying** and **Clear Constraints**
- **Mesh Export (`.nif`):**
  - Select mesh + armature
  - Export via PyNifly (`NetImmerse`)
  - Target game: **Fallout 4**
  - Enable vertex weight export for rigged assets
- **Animation Track Export:** Export baked armature to FBX for Havok compilation flow (or use a dedicated Blender-to-Havok exporter if available)

### 5) Havok Processing (Missing Link)

The CK cannot consume raw Blender animation data directly.

- **Tooling:** Fallout 4 Animation Kit (F4AK) / Elrich
- **Process:** Compile exported animation FBX into FO4-compatible `.hkx`

### 6) Creation Kit Integration

Place outputs under `Data/Meshes/` and `Data/Animations/`, then wire forms:

- **World Objects:** Create `Furniture` or `MovableStatic`, point model to `.nif`, connect behavior/trigger route for animation
- **Characters/Creatures:** Create `Actor`/`Race`, assign visual `.nif`, map `.hkx` through animation keywords or custom subgraphs

---

## Architectural Formula: Animated World Objects, Weapons, and Creatures

Use three distinct processing tracks in Blender + PyNifly + CK.

---

## Track 1: Animated World Objects (Interactions and Loops)

World objects typically use embedded engine-driven controllers in `.nif` for loops, or behavior-driven interactions for activated states.

### 1) Blender Structure

- **Hierarchical Root:** Name base object node `Scene Root`
- **Collision Setup:** Parent low-poly collision mesh to root; assign custom property `BSNP_CollisionType` as `Static` or `AnimStatic`
- **Action Naming:**
  - Continuous loops: `Idle`
  - Interactions: `Play01` (activate) and `Play02` (deactivate)

### 2) PyNifly Export Matrix

- Set export profile: **Fallout 4 World Object**
- Enable **Export Animation Controller** to write transform tracks into `NiTransformInterpolator` blocks
- Enable **Embed Collision** when using PyNifly-generated convex collision

### 3) Creation Kit Integration

- **Continuous Loop:** Create `MovableStatic`, assign `.nif`; embedded loop tracks play automatically
- **User Triggered:** Create `Furniture` or `Activator`; use `DefaultActivateSelf.psc` or map animation groups so `Play01` fires on activation

---

## Track 2: Weapon Modules (First-Person Mesh and Transforms)

Weapon animation depends on transform fidelity relative to the first-person hand rig.

### 1) Blender Structure

- **Skeleton Alignment:** Import vanilla weapon skeleton (for example `Rig_Weapon.nif`) through PyNifly
- **Bone Matching:** Parent Unity weapon parts (trigger, magazine, bolt) to corresponding vanilla bones (`Trigger`, `Mag`, `Bolt`)
- **Keyframing:**
  - `Idle`: subtle movement on master weapon bone
  - `Reload`: animate `Mag` detachment and translation with proper timing

### 2) PyNifly Export Matrix

- Set export profile: **Fallout 4 Weapon**
- Enable **Export Vertex Weights** (skin partitioning required for moving components)
- Keep **Flatten Hierarchy** disabled to preserve OMOD transform relationships

### 3) Creation Kit Integration

- Create `Weapon` form and assign the master `.nif` as first-person model
- Map interactions with animation keywords (for example `AnimReloadWeapon`) so behavior graph states trigger the intended bone transforms

---

## Track 3: Creatures and Characters (Rigged Skin and Havok Graphs)

Creatures and characters require skin-partitioned meshes driven by external `.hkx` runtime files.

### 1) Blender Structure

- **Retargeting:** Retarget Unity armature to the target vanilla creature skeleton (`Skeleton.nif`) using a bone-renaming map
- **Skin Weights:** Normalize all vertex groups and enforce FO4 limit of max 4 bone influences per vertex
- **Bake Path:** Bake actions with keyframe cleanup for runtime efficiency

### 2) PyNifly Export Matrix

- Set export profile: **Fallout 4 Character/Creature**
- Enable **Export Vertex Weights**
- Set max influences to **4**
- Enable **Generate Skin Partition** to produce `BSDismembermentSkinInstance` blocks

### 3) Havok Processing Pipeline

- Export animation tracks from Blender as FBX
- Open **Elrich** (`Fallout 4/Tools/PC_Animation_Kit/`)
- Compile to runtime `.hkx` (example: `Creature_Idle.hkx`)

### 4) Creation Kit Integration

- Create a new `Race` and set skeleton path
- Create an `Actor` using that race
- In Animation Subgraph configuration, register custom `.hkx` tracks in graph descriptors and map to expected behavior states (such as alert/sneak state logic)

---

## Practical Validation Checklist

- Bone names match target FO4 skeleton exactly
- No vertex exceeds 4 bone influences for character/creature paths
- Transforms are applied before export
- `.nif` loads correctly in NifSkope/CK
- `.hkx` compiles and binds to expected graph states
- CK forms trigger the correct idle/activate/reload/creature states at runtime

