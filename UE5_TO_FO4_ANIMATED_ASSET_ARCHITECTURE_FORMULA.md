# Unreal Engine 5 to Fallout 4 Animated Asset Architecture Formula

This guide covers the correct direction for moving modern Unreal Engine 5 assets into Blender and then into Fallout 4 through PyNifly, Elrich, and the Creation Kit.

---

## Core Workflow Formula (UE5 → Blender → Fallout 4)

PyNifly and the Creation Kit cannot read Unreal Engine 5 assets directly. The correct workflow is:

1. Export raw asset data from **Unreal Engine 5**
2. Correct transforms, scale, and rigging in **Blender**
3. Export meshes with **PyNifly**
4. Export animations back to **FBX** for **Elrich**
5. Deliver `.nif` and `.hkx` into **Fallout 4 / Creation Kit**

---

## 1) Extraction (Unreal Engine 5 to Blender)

UE5 assets must be converted into a raw format Blender can interpret without losing skeletal hierarchy or skin weights.

### The Process

- In the UE5 Content Browser, right-click the target **Skeletal Mesh** or **Animation Sequence**
- Choose `Asset Actions -> Export`
- Export as **FBX**

### Export Settings

- **Uncheck** `Level of Detail (LODs)` so only the highest-resolution base mesh is exported
- **Check** `Export Morph Targets` when facial animation or morph-driven deformation is needed

---

## 2) Blender Transform Correction (Critical Shift)

When a UE5 FBX is imported into Blender, it usually arrives oversized and oriented incorrectly for Fallout 4.

### Import Settings

- Import the UE5 FBX into Blender

### Scale Shift

- UE5 uses **centimeters**
- Fallout 4 uses a different scaled world/model space
- Unlike Unity extractions that often require large scene-scale correction, UE5 FBX exports usually arrive much closer to usable Blender scene scale because they are already authored in centimeter-based DCC workflows
- Start from the imported UE5 FBX at **1.0x** in Blender scene space, then tune the final object scale against a Fallout 4 reference inside an approximate **0.7x to 1.0x** range based on the target creature/object size
- Apply transforms with `Ctrl + A -> Apply All Transforms`

### Rotation Realignment

- UE5 faces down the **positive X-axis**
- Fallout 4 expects assets aligned to the **negative Y-axis**
- Rotate the armature **-90 degrees on the Z-axis**
- Apply transforms again with `Ctrl + A`

---

## 3) Rigging and Bone Renaming (UE5 to Fallout 4 Mapping)

UE5 default bone names must be remapped to Fallout 4-compatible naming or the exported result can fail in-game or crash in CK workflows.

| UE5 Source Bone Name | Target Fallout 4 Bone Name | Structural Role |
| --- | --- | --- |
| `root` | `Root` or remove if using `Bip01` | Base origin node |
| `pelvis` | `Bip01 Pelvis` or `COM` | Center of mass / movement anchor |
| `spine_01` / `spine_02` | `Bip01 Spine1` / `Bip01 Spine2` | Torso articulation |
| `upperarm_l` / `lowerarm_l` | `Bip01 L UpperArm` / `Bip01 L Forearm` | Left arm chain |
| `thigh_r` / `calf_r` | `Bip01 R Thigh` / `Bip01 R Calf` | Right leg chain |

---

## 4) Downsampling and Optimization Module

UE5 assets routinely exceed Creation Engine-era limits, so optimize before export.

### Vertex Count Guidance

- Keep mesh partitions roughly within **30,000 to 45,000 polygons**
- Use a **Decimate Modifier** where necessary

### Bone Influence Limit

- In Blender, use `Weights -> Limit Total`
- Set the limit to **4 bones per vertex**
- UE5 may tolerate more, but Fallout 4 can glitch or crash above 4 influences

---

## 5) Blender to PyNifly Export Profile

Once the asset is scaled, rotated, renamed, and optimized:

1. Go to `File -> Export -> NetImmerse (.nif)`
2. Set **Game Target** to `Fallout 4`
3. Enable:
   - `Export Vertex Weights`
   - `Generate Skin Partition`
4. Save the output `.nif` directly into the `Data/Meshes/` workspace

---

## 6) Animation Track Routing (FBX to Elrich)

If animation data was exported from UE5:

1. Bake animations onto the newly renamed Fallout 4 bone structure in Blender
2. Export the armature from Blender as **FBX (ASCII)** for the Havok compilation step
3. Drop the FBX into the `compile_anims.py` input directory
4. Let **Elrich** compile it into a Fallout 4-compatible `.hkx`

---

## Practical Checklist

- UE5 export uses **FBX**
- LODs are disabled unless intentionally needed
- Morph targets are exported only when required
- Blender transform scale is corrected and applied
- Armature is rotated to Fallout 4 heading expectations
- Bone names are mapped to FO4-compatible structure
- Vertex influences are capped at **4**
- PyNifly export targets **Fallout 4**
- Animation FBX is routed through **Elrich** for `.hkx` output

---

## Automated Bone Renaming Script (UE5 to Fallout 4 Matrix)

Run this inside Blender’s Scripting workspace with the imported UE5 armature selected.

```python
import bpy

def remap_ue5_to_fo4():
    obj = bpy.context.active_object
    if not obj or obj.type != "ARMATURE":
        print("Error: No armature selected. Select the UE5 armature as the active object.")
        return

    bpy.ops.object.mode_set(mode="EDIT")

    bone_rename_map = {
        "root": "Root",
        "pelvis": "Bip01 Pelvis",
        "spine_01": "Bip01 Spine1",
        "spine_02": "Bip01 Spine2",
        "spine_03": "Bip01 Spine3",
        "neck_01": "Bip01 Neck",
        "head": "Bip01 Head",
        "clavicle_l": "Bip01 L Clavicle",
        "upperarm_l": "Bip01 L UpperArm",
        "lowerarm_l": "Bip01 L Forearm",
        "hand_l": "Bip01 L Hand",
        "clavicle_r": "Bip01 R Clavicle",
        "upperarm_r": "Bip01 R UpperArm",
        "lowerarm_r": "Bip01 R Forearm",
        "hand_r": "Bip01 R Hand",
        "thigh_l": "Bip01 L Thigh",
        "calf_l": "Bip01 L Calf",
        "foot_l": "Bip01 L Foot",
        "thigh_r": "Bip01 R Thigh",
        "calf_r": "Bip01 R Calf",
        "foot_r": "Bip01 R Foot",
    }

    renamed_count = 0
    for edit_bone in obj.data.edit_bones:
        if edit_bone.name in bone_rename_map:
            old_name = edit_bone.name
            new_name = bone_rename_map[old_name]
            edit_bone.name = new_name
            renamed_count += 1
            print(f"Renamed Node Link: {old_name} -> {new_name}")

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"Success: Modified and translated {renamed_count} bone node references.")

if __name__ == "__main__":
    remap_ue5_to_fo4()
```

---

## Axis Flip Animation Correction Diagnostic Checklist

Because UE5 tracks forward on the X-axis while Fallout 4 expects forward motion on negative Y, uncorrected assets can walk sideways or backward after conversion.

### Verify Viewport Facing Alignment

- Switch Blender to **Front View** (`Numpad 1`)
- The model should face toward you
- If it faces left or right, it is still aligned to the UE5 X-forward heading

### Apply Corrective Rotation

1. Select the armature
2. Press `R -> Z -> -90`
3. Apply with `Ctrl + A -> All Transforms`

### Clear Root Animation Curve Inversions

- Open the **Graph Editor**
- Inspect root bone translation channels
- If forward motion still lives on `X Location` instead of the expected FO4-aligned axis, mirror or move the motion into the corrected channel set before export

### Run Elrich Graph Sanity Check

- Compile the exported **ASCII FBX** with `compile_anims.py`
- If the log reports `Orientation matrix mismatch on root transform`, re-import into Blender and verify transforms are fully applied (`Scale = 1.0`, `Rotation = 0.0`) before recompiling

---

## Student Lab Sheet: Processing and Converting High-Poly UE5 Textures

**Course Module:** PBR Material Texture Downsampling and Conversion  
**Objective:** Convert high-fidelity UE5 textures into optimized `.dds` assets and Fallout 4-ready material inputs.

### Required Student Working Assets

- `UE5_Texture_BaseColor.png`
- `UE5_Texture_Normal.png`
- `UE5_Texture_ORD.png`

### Step 1: Scale Down Texture Resolution Assets (Estimated: 10 min)

1. Open the base color texture in an editor such as Photoshop, GIMP, or Paint.NET
2. If the source is `4096 x 4096`, scale it down to `2048 x 2048`
3. Use a reduction-friendly filter such as **Bicubic Sharper**

### Step 2: Unpack and Reform Texture Channels (Estimated: 15 min)

UE5 commonly stores:

- **Occlusion** in Red
- **Roughness** in Green
- **Metallic** in Blue

For Fallout 4:

1. Open the `ORD` texture
2. Copy the **Green channel** (roughness)
3. Paste into a new grayscale image
4. Invert it (`Ctrl + I`) to convert roughness into a gloss/smoothness-style map
5. If your editor cannot export directly to `.dds`, save the inverted result as a temporary working file such as `custom_asset_s.png`; otherwise skip this intermediate file and export straight to the final DDS format

### Step 3: Compress Assets into Direct3D Containers (Estimated: 10 min)

The Creation Engine cannot use `.png` at runtime, so convert textures to `.dds`.

- **Diffuse:** `BC7` or `BC1/DXT1` → `custom_asset_d.dds`
- **Normal:** `BC5` or `DXT5 (NM)` → `custom_asset_n.dds`
- **Specular / Gloss:** `BC7` or `DXT1` → `custom_asset_s.dds`

Move the final `.dds` files into:

`Data\Textures\ModName\`
