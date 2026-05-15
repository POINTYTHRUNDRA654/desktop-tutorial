# Unity to Unreal Engine 5 Animated Asset Architecture Formula

This guide adapts Mossy’s animated-asset teaching pipeline from Fallout 4’s `.nif` / `.hkx` model to Unreal Engine 5’s Skeletal Mesh, Control Rig, IK Rig, and Animation Blueprint workflow.

---

## Core Workflow Formula (Unity → Blender → Unreal Engine 5)

Moving animated Unity assets into Unreal Engine 5 requires shifting from Fallout 4’s proprietary NetImmerse system to UE5’s modern skeletal mesh pipeline. Instead of compiling `.hkx` and `.nif` files, students should adapt Unity asset structures into UE5 Skeletal Meshes, Control Rigs, and Animation Blueprints.

### 1) Asset Extraction (Unity to Blender)

Unity and Unreal Engine 5 handle orientation and scaling differently.

- **Tool:** Use AssetRipper to export visual mesh data and source animation content into an **FBX (Binary)** bundle
- **Coordinate Systems:**
  - Unity: **Left-Handed, Y-Up**
  - Unreal Engine 5: **Right-Handed, Z-Up**

### 2) Blender Transform and Axis Alignment Defaults

Blender serves as the translation layer before import into UE5.

- **Import Step:** Import the Unity FBX
- **Scale Correction:** Unity uses `1 unit = 1 meter`; UE5 uses `1 unit = 1 centimeter`
  - Select the imported armature and mesh
  - Scale uniformly by `100x`
  - Apply transforms with `Ctrl + A -> Apply All Transforms`
- **Axis Correction:** Rotate the armature `90°` on the Z-axis so the asset faces positive X (UE5 forward), then apply transforms again

### 3) Rigging and Bone Renaming (Translation Layer)

UE5’s IK Rig and IK Retargeter can remap chains automatically, but renaming bones in Blender improves compatibility with common UE5 defaults such as Manny/Quinn.

| Unity Common Bone Name | Target Unreal Engine 5 Bone Name | Structural Function |
| --- | --- | --- |
| `Root` / `GameObject` | `root` | Absolute ground origin |
| `Hips` / `Pelvis` | `pelvis` | Main animation translation center |
| `Spine` | `spine_01` / `spine_02` | Lower torso chain |
| `LeftUpperArm` | `upperarm_l` | Left shoulder pivot |
| `RightLowerLeg` | `calf_r` | Right knee bend chain |

### 4) Blender to UE5 FBX Export Matrix

Configure Blender FBX export with a preset named `UE5_Animated_Asset_Default`.

| Export Property | Required Value | Technical Function |
| --- | --- | --- |
| Object Types | Armature, Mesh | Excludes cameras, empties, and lamps |
| Scale Options | Apply Scalings: FBX All | Bakes centimeter conversion into FBX metadata |
| Forward Vector | X Forward | Aligns with UE5 forward vector |
| Up Vector | Z Up | Fixes Y-to-Z axis translation |
| Armature Primary Bone | Y Axis | Standardizes local bone orientation |
| Bake Animation | Enabled | Preserves action keyframes |
| NLA Strips / All Actions | Disabled | Prevents clips from merging into one corrupted animation |

---

## Unreal Engine 5 Pipeline Tracks

Once exported from Blender as FBX, the asset splits into one of three tracks inside the UE5 Content Browser.

### Track 1: World Objects (Interactivity and Nanite)

- **Import Settings:** Import as a **Static Mesh** for simple transforms; enable animation import only if bones are required
- **Nanite:** Enable Nanite for high-poly world objects where appropriate
- **Blueprint Trigger Logic:** Create an `Actor Blueprint`, add the mesh component and a `Box Collision`, then wire overlap/interact logic through the Event Graph

### Track 2: Weapon Modules (Skeletal Attachment Points)

- **Import Settings:** Import as a **Skeletal Mesh**
- **Skeleton Reuse:** Reuse an existing weapon skeleton when replacing or extending an established weapon framework
- **Socket System:** Add sockets such as `MuzzleFlashSocket` or `HandSocket` to attachment bones
- **Blueprint Integration:** Use `AttachComponentToComponent` to snap the weapon to the character’s hand socket at runtime

### Track 3: Creatures and Characters (IK Retargeting)

- **Import Settings:** Import as a **Skeletal Mesh** and enable **Create Physics Asset**
- **IK Rig Setup:** Define retarget chains such as `Spine`, `LeftArm`, and `RightLeg`
- **IK Retargeter Workflow:** Use the UE5 Mannequin as source and the imported Unity creature as target, then export remapped animations

---

## Unreal Engine 5 Automated FBX Import Tool (Python Script)

This automation script uses UE5’s internal Python API to batch-import exported Blender FBX assets and sort them by filename tags.

```python
import os
import unreal

# Directory Path Configuration
INPUT_FBX_DIR = "C:/ModdingCourse/BlenderOutput/"
GAME_CONTENT_DIR = "/Game/Mods/UnityImports/"

def create_import_task(filename, fbx_filepath, target_destination):
    """Generates a structured import task with predefined pipeline settings."""
    task = unreal.AssetImportTask()
    task.set_editor_property("automated", True)
    task.set_editor_property("destination_path", target_destination)
    task.set_editor_property("filename", fbx_filepath)
    task.set_editor_property("replace_existing", True)
    task.set_editor_property("save", True)

    options = unreal.FbxImportUI()
    options.set_editor_property("import_materials", True)
    options.set_editor_property("import_textures", True)
    options.set_editor_property("create_physics_asset", True)

    if filename.startswith("SK_"):
        options.set_editor_property(
            "mesh_type_to_import",
            unreal.FBXImportType.FBXIT_SKELETAL_MESH,
        )
        options.set_editor_property("import_mesh", True)
        options.set_editor_property("import_animations", False)
    elif filename.startswith("ANIM_"):
        options.set_editor_property(
            "mesh_type_to_import",
            unreal.FBXImportType.FBXIT_ANIMATION,
        )
        options.set_editor_property("import_mesh", False)
        options.set_editor_property("import_animations", True)
        anim_options = options.get_editor_property("anim_sequence_import_data")
        anim_options.set_editor_property(
            "animation_length",
            unreal.FBXAnimationLengthImportType.FBXALIT_EXPORTED_TIME,
        )
    else:
        options.set_editor_property(
            "mesh_type_to_import",
            unreal.FBXImportType.FBXIT_STATIC_MESH,
        )
        options.set_editor_property("import_mesh", True)
        static_mesh_data = options.get_editor_property("static_mesh_import_data")
        static_mesh_data.set_editor_property("combine_meshes", True)
        static_mesh_data.set_editor_property("generate_lightmap_u_vs", False)

    task.set_editor_property("options", options)
    return task

def run_batch_import():
    if not os.path.exists(INPUT_FBX_DIR):
        print(f"Error: Target directory path {INPUT_FBX_DIR} does not exist.")
        return

    tasks = []
    for file in os.listdir(INPUT_FBX_DIR):
        if file.endswith(".fbx"):
            full_path = os.path.join(INPUT_FBX_DIR, file)
            task = create_import_task(file, full_path, GAME_CONTENT_DIR)
            tasks.append(task)

    if tasks:
        unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
        print(f"Successfully processed and imported {len(tasks)} assets into UE5.")

if __name__ == "__main__":
    run_batch_import()
```

---

## Interactive Object Animation Trigger Blueprint Template

This UE5 blueprint setup mirrors the old Papyrus interaction flow using an `Actor Blueprint` and Enhanced Input.

### Blueprint Visual Node Framework Layout

```text
[Event Component Begin Overlap (Trigger Box)]
                    |
                    v
   [Cast to EnhancedInputLocalPlayerSubsystem] --> Enable Custom Interaction Input Context
                    |
                    v
        [Bind Event to Input Action]
                    |
                    v
          [Flip Flop Logic Gate]
           +--> A: [Play Animation (Open)]  --> [Set Variable: bIsOpen = True]
           +--> B: [Play Animation (Close)] --> [Set Variable: bIsOpen = False]
```

### Blueprint Node Configuration Instructions

1. Create an `Actor Blueprint` named `BP_InteractiveWorldObject`
2. Add a `Skeletal Mesh Component` and `Box Collision Component`
3. Add an Enhanced Input Action mapped to the project interaction key (for example `IA_Interact`)
4. Route interaction through a `Flip Flop` node to manage open/close state
5. Feed the mesh reference into `Play Animation` nodes using imported `ANIM_Open` and `ANIM_Close` sequences

---

## Student Laboratory Exercise Sheet: Modern IK Retargeting Setup

**Course Module:** UE5 Skeletal Mapping Matrices  
**Objective:** Remap UE5 Mannequin (`SKM_Manny`) movement onto a custom imported Unity creature.

### Step 1: Instantiate the Target IK Rig Asset

1. In the Content Browser, create `Animation -> IK Rig -> IK Rig`
2. Select the imported custom skeleton
3. Name the new asset `IKR_CustomCreature`
4. Open it and set the hips/pelvis bone as the **Retarget Root**

### Step 2: Configure Skeletal Retarget Chains

Define matching chain groups:

- `Spine`: `spine_01` through `spine_03`
- `LeftArm`: `upperarm_l` to `hand_l`
- `RightArm`
- `LeftLeg`
- `RightLeg`

Save the IK Rig after all chains are defined.

### Step 3: Configure the IK Retargeter Profile Matrix

Create `Animation -> IK Rig -> IK Retargeter` and name it `IKRT_MannyToCreature`.

| Property Option Field | Target Structural Value Override | Technical Purpose |
| --- | --- | --- |
| Source IK Rig Asset | `IKR_Mannequin` | Uses UE5 stock skeleton as source |
| Target IK Rig Asset | `IKR_CustomCreature` | Routes motion to imported custom creature |

Then:

1. Open the **Chain Mapping** tab and confirm source/target chain matches
2. Choose a stock movement clip such as `MF_Run_Forward`
3. Click **Export Selected Animations** to generate retargeted sequences inside the project

---

## Student Diagnostic Matrix: Correcting Foot-Sliding and Axis Drift

When retargeting from Unity rigs into UE5, root tracking differences can cause sliding, drifting, snapping, or joint skew.

```text
[Character Slides / Floats at Runtime]
                 |
                 v
Open Retargeted Anim Sequence --> Check "Enable Root Motion"
                 |
      (Does Mesh Snap Back?)
                 +--> YES --> Check "Force Root Lock" to pin origin
                 +--> NO  --> Open target IK Rig / IK Retargeter and adjust offsets
```

| Diagnostic Error | Visual Symptom in Preview / World View | Root Cause in UE5 Configuration | Corrective Action Blueprint |
| --- | --- | --- | --- |
| Ice-Skating / Foot-Sliding | Feet slide or stutter along the floor during locomotion | Source animation contains root velocity but target sequence has root motion disabled | Open the AnimSequence and enable **Root Motion** |
| Asset Teleport Snap | Character completes loop then snaps back to start | Root translation accumulates instead of resetting per loop | Enable **Force Root Lock** in Root Motion settings |
| Floating or Crouching | Character floats above floor or crouches unnaturally | Retarget root translation height scaling is off between rigs | Open `IKRT_MannyToCreature` and adjust target scale/offset until feet sit correctly |
| Twisted Joints (Ortho Drift) | Limbs twist or snap outward during transitions | Chain rotation mapping is misaligned | In the IK Retargeter, lower the broken chain’s **Rotation Alpha** to reduce axis skew |

---

## Terminology Shift Translation Dictionary

Use this mapping to help students move from the Creation Kit mental model to Unreal Engine 5.

| Fallout 4 / Creation Kit Concept | Unreal Engine 5 Equivalent | Practical Operational Shift |
| --- | --- | --- |
| `.nif` (NetImmerse Mesh) | Skeletal Mesh / Static Mesh | UE5 separates rigged and non-rigged geometry into different asset types |
| `.hkx` (Havok Behavior File) | Animation Sequence / Blend Space | Motion clips are separate assets and blending is handled natively in animation systems |
| Animation Subgraph / State Graph | Animation Blueprint (AnimBP) | XML/state tables become a visual state machine graph |
| Material Descriptor (`.bgsm`) | Material Instance / Material Graph | Texture linkage becomes graph-based shader logic |
| Object Forms (`Furniture`, `Activator`) | Actor Blueprint (`BP_Actor`) | Visuals, collision, and logic are bundled into Blueprint actors |
| Papyrus Script (`.psc` / `.pex`) | Blueprint Event Graph | Text-based scripting becomes node-based event flow |

---

## Syllabus Structural Breakdown: 4-Week UE5 Asset Modding Module

### Week 1: Coordinate Systems, Scale, and FBX Pipelines

- **Lecture Topics:** Left-handed vs right-handed coordinates, scale translation, FBX orientation settings
- **Practical Lab Work:** Configure Blender export presets and bulk-import static models with the UE5 Python import script
- **Milestone Goal:** Import error-free Static Mesh assets into the project

### Week 2: Skeletal Mesh Optimization and Rig Alignment

- **Lecture Topics:** Bone naming conventions, modern rigging constraints, weight cleanup
- **Practical Lab Work:** Rename Unity armatures to Unreal naming conventions and optimize weight distribution
- **Milestone Goal:** Export a rigged Skeletal Mesh that passes physics asset generation checks

### Week 3: Modern IK Retargeting and Animation Graphs

- **Lecture Topics:** IK Rig structure, retarget roots, chain setup, root-motion diagnostics
- **Practical Lab Work:** Build IK Rig and IK Retargeter assets to remap standard locomotion onto the imported creature
- **Milestone Goal:** Produce clean idle, run, and jump animations without stretching or clipping

### Week 4: Blueprint Assembly, Interaction, and Pak Distribution

- **Lecture Topics:** Actor Blueprints, Enhanced Input, content cooking and packaging
- **Practical Lab Work:** Build an interactive Blueprint-driven world object and package the result with UE5 cooking tools into distributable `.pak` output
- **Milestone Goal:** Test a fully interactive mod component inside a standalone game save
