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
- Scale the asset down by roughly **0.7x to 1.0x**, depending on the intended Fallout 4 target size
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

