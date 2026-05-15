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
- Start from the imported UE5 FBX at **1.0x** in Blender scene space as the baseline. Many assets will remain at that scale, while oversized hero assets may need to be tuned down toward roughly **0.7x** against a Fallout 4 reference mesh
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

## Student Lab Sheet: Processing and Converting High-Poly UE5 Textures in Photopea

**Course Module:** PBR Material Texture Downsampling and Conversion  
**Objective:** Convert high-fidelity UE5 textures into optimized `.dds` assets and Fallout 4-ready material inputs.

### Required Student Working Assets

- `UE5_Texture_BaseColor.png`
- `UE5_Texture_Normal.png`
- `UE5_Texture_ORD.png`

### Step 1: Scale Down Texture Resolution Assets (Estimated: 10 min)

1. Open the base color texture in **Photopea**
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
5. In **Photopea**, save the inverted result as a temporary working file such as `custom_asset_s.png`, then pass it to your DDS conversion tool for final export

### Step 3: Compress Assets into Direct3D Containers (Estimated: 10 min)

The Creation Engine cannot use `.png` at runtime, so convert textures to `.dds`.

- **Diffuse:** `BC7` or `BC1/DXT1` → `custom_asset_d.dds`
- **Normal:** `BC5` or `DXT5 (NM)` → `custom_asset_n.dds`
- **Specular / Gloss:** `BC7` or `DXT1` → `custom_asset_s.dds`

Move the final `.dds` files into:

`Data\Textures\ModName\`

---

## Fallout 4 Texture-State Module: Diffuse, Overlays, and Glowmaps

This module covers the three essential Fallout 4 texture states: diffuse maps, material overlays, and glowmaps.

### Step 1: Asset Creation and Channel Preparation

Prepare textures at strict power-of-two resolutions appropriate for the asset.

#### 1) Diffuse Maps (Base Color)

- Keep base color free of baked lighting and shadows
- If transparency is needed, add an **Alpha Channel**
- Paint visible areas white and hidden areas black in alpha

#### 2) Material Overlays (Decals / Blood / Dirt)

- Create only the overlay detail with transparent background
- Copy the overlay shape into the **Alpha Channel** as solid white
- This isolates the overlay when rendered over the base material

#### 3) Glowmaps (Emissive Textures)

- Start from the diffuse texture
- Black out everything except emissive regions
- Paint glow regions using their target emissive color
- Keep all non-emissive space pure black

### Step 2: Compression Matrix

| Texture Type | Naming Tag | Compression Format | Mipmaps | Technical Function |
| --- | --- | --- | --- | --- |
| Standard Diffuse | `_d.dds` | `BC7 x.0 8bpc Fine` | Auto | Preserves color gradients cleanly |
| Overlay / Alpha Diffuse | `_d.dds` | `BC7 x.0 8bpc Alpha` | Auto | Preserves clean transparency edges |
| Normal Map | `_n.dds` | `BC5 8bpc (Signed)` | Auto | High-fidelity surface normal vectors |
| Specular / Gloss | `_s.dds` | `BC7 x.0 8bpc Fine` | Auto | Carries reflectivity and gloss data |
| Glowmap / Emissive | `_g.dds` | `BC7 x.0 8bpc Fine` | Auto | Preserves emissive color data |

### Step 3: `.bgsm` Material Setup

You cannot assign raw `.dds` directly in CK; use a `.bgsm` material file.

#### Standard Textures + Glowmaps

- **Shader Type:** `Default`
- **Texture Paths:**
  - Diffuse: `Textures\ModName\Asset_d.dds`
  - Normal: `Textures\ModName\Asset_n.dds`
  - Smoothness / Spec: `Textures\ModName\Asset_s.dds`
  - Glow / Emissive: `Textures\ModName\Asset_g.dds`
- **Shader Flags:** enable `Glow` and `Receive Shadows`
- **Lighting Properties:** set **Emissive Multiplier** roughly between `1.5` and `5.0`

#### Alpha / Overlay Decal Textures

- **Shader Type:** `Decal` or `Default`
- **Shader Flags:** enable `Assume Shadowmask`, `Z-Buffer Test`, and `Alpha Blend`
- **Alpha Blending:**
  - Enable blending
  - Source Blend Mode: `Src Alpha`
  - Destination Blend Mode: `Inv Src Alpha`

### Step 4: Blender PyNifly Mesh Material Assignment

1. Select the mesh in Blender
2. Open **Material Properties**
3. Create a material slot
4. Name it with the exact game-relative `.bgsm` path:

```text
Materials\ModName\AssetMaterial.bgsm
```

PyNifly embeds this path into the exported mesh shader property block.

### Step 5: Creation Kit Deployment Verification

- Verify files exist under:
  - `Data\Meshes\ModName\`
  - `Data\Textures\ModName\`
  - `Data\Materials\ModName\`
- Open or create a `Static` / `MovableStatic` form in CK
- Point the model to the exported `.nif`
- Toggle preview lighting off in the CK preview window and confirm glow regions light correctly in darkness

---

## Fallout 4 PBR Conversion: Roughness, Metallic, and AO to `_s.dds`

Fallout 4 does not use separate PBR roughness, metallic, and AO textures directly. Instead, it expects a channel-packed `_s.dds` specular/gloss map.

### `_s.dds` Texture Blueprint Matrix

Using **Photopea**, create a new texture matching the diffuse size and pack channels as follows:

- **Red Channel:** Smoothness / Glossiness
  - Paste the source **Roughness** map
  - Invert it (`Ctrl + I`) to convert roughness into smoothness
- **Green Channel:** Reflected Color Intensity / Specular Mask
  - Paste the grayscale **Ambient Occlusion** map
- **Blue Channel:** Metalness Reflection Value
  - Paste the **Metallic** map
- **Alpha Channel:** Special Lighting / Subsurface Intensity
  - Leave solid white unless targeting assets that need specialized lighting control

### Exporting the Specular Map

- Save as `.dds` (for example `Asset_s.dds`)
- Texture Type: **Color + Alpha**
- Compression Format: **BC7 x.0 8bpc Fine**

---

## Python `.bgsm` Material File Path Validator Tool

Use this script to audit custom `.bgsm` files for bad absolute paths or missing relative texture references.

```python
import os

TARGET_DATA_DIR = os.environ.get("FO4_DATA_DIR", "C:/Fallout4/Data/")
MATERIALS_SUB_DIR = os.path.join(TARGET_DATA_DIR, "Materials/ModName/")

def validate_bgsm_paths(bgsm_filename):
    bgsm_path = os.path.join(MATERIALS_SUB_DIR, bgsm_filename)

    if not os.path.exists(bgsm_path):
        print(f"ERROR: File not found at target location: {bgsm_path}")
        return False

    print(f"Auditing Material Spec Configuration Profile: {bgsm_filename}")
    has_errors = False

    with open(bgsm_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

        if "C:" in content or "Users\\" in content or "Desktop\\" in content:
            print("  - PATH ERROR: Found absolute desktop drive paths.")
            has_errors = True

        try:
            if "Textures\\" not in content:
                print("  - STRUCTURE ERROR: Material lacks relative 'Textures\\' paths.")
                has_errors = True

            expected_maps = ["_d.dds", "_n.dds", "_s.dds"]
            for texture_tag in expected_maps:
                if texture_tag not in content:
                    print(f"  - WARNING: Material does not contain a standard '{texture_tag}' entry.")
        except Exception as e:
            print(f"  - INTERPRETATION FAILURE: {str(e)}")
            has_errors = True

    if not has_errors:
        print("  - PASS: Material relative path metrics conform to game engine layouts.")
        return True

    print("  - FAIL: Correct the file pathing errors above before launching the Creation Kit.")
    return False

if __name__ == "__main__":
    os.makedirs(MATERIALS_SUB_DIR, exist_ok=True)
    SAMPLE_TARGET_MATERIAL = "PlayerWeaponAsset.bgsm"
    validate_bgsm_paths(SAMPLE_TARGET_MATERIAL)
```

---

## Step-by-Step Tutorial: Complex Layered Textures in the `.bgsm` Material Editor

Layered materials let multiple materials blend on a single mesh using a grayscale blend mask.

### Step A: Texture Preparation Checklist

Prepare these files inside `Data\Textures\ModName\`:

- `Asset_Base_d.dds` and `Asset_Base_s.dds`
- `Asset_Top_d.dds` and `Asset_Top_s.dds`
- `Asset_BlendMask_d.dds`
- `Asset_n.dds`

### Step B: Material Setup Configuration Pipeline

1. Open the Fallout 4 Material Editor
2. Click `File -> New`
3. In **Material Properties**, set **Shader Type** to `Layered`
4. Set **Layer Count** to `2`

### Step C: Mapping Textures to the Material Structure

#### Layer 1 (Base Layer)

- Diffuse: `Textures\ModName\Asset_Base_d.dds`
- Normal: `Textures\ModName\Asset_n.dds`
- Smoothness / Spec: `Textures\ModName\Asset_Base_s.dds`

#### Layer 2 (Top Layer)

- Diffuse: `Textures\ModName\Asset_Top_d.dds`
- Smoothness / Spec: `Textures\ModName\Asset_Top_s.dds`

#### Blend Mask

- Blend Mask: `Textures\ModName\Asset_BlendMask_d.dds`

### Step D: Adjusting Material Interaction Properties

1. Open the **Material Layers** configuration tab
2. In **Layer 2 Properties**, set Blend Mode to `Alpha Blend` or `Specular Mask`
3. Enable **Invert Blend Mask** only if the mask needs reversing
4. Save into `Data\Materials\ModName\CustomLayeredAsset.bgsm`

---

## Materialize Master Workflow for Photoreal Fallout 4 PBR Conversion

Bounding Box Software’s Materialize works best when students build the material stack in dependency order: **Height first**, then **Normal**, **AO**, and **Smoothness**.

### Step 1: Base Setup and Seamless Tiling

Before generating maps:

1. Click the `O` button under **Diffuse Map**
2. Load a square, high-resolution source texture
3. Click **Tile Maps**
4. Set **Tiling X** and **Tiling Y** to the required scale
5. Set **Overlap X** and **Overlap Y** to `0.15` or `0.20`
6. Increase **Falloff** until seams are blended out
7. Click **Set Select Maps**

### Step 2: Height Map Definition (Foundation)

The Height map drives downstream realism.

1. Click **Create** under **Height Map**
2. Choose preset: **Mid Details**

#### Height Master Settings

- Frequency Weight (Low): `0.70`
- Frequency Weight (Mid): `0.50`
- Frequency Weight (High): `0.25`
- Gain: `0.15`
- Contrast: `1.20`

3. Click **Set as Height Map**

### Step 3: Normal Map Precision

1. Click **Create** under **Normal Map**
2. Set source to **From Weight Map / Displacement**
3. Select preset: **Crisp**

#### Normal Master Settings

- Pre-Contrast: `1.10`
- Shape Recognition: `0.40`
- Final Contrast: `1.30`

4. Click **Set as Normal Map**

### Step 4: Metallic and Smoothness Generation

#### 1) Metallic Map

1. Click **Create** under **Metallic Map**
2. Configure by material type:
   - Non-metals: Default Value `0.0`
   - Pure metals: Default Value `1.0`
   - Mixed materials: use color picking and raise contrast to `1.8`
3. Click **Set as Metallic Map**

#### 2) Smoothness Map

1. Click **Create** under **Smoothness Map**
2. Enable **Invert** when needed to convert source interpretation correctly

#### Smoothness Master Settings

- Final Contrast: `1.40`
- Blur / Smooth: `0.05`

3. Click **Set as Smoothness Map**

### Step 5: Ambient Occlusion Generation

1. Click **Create** under **Ambient Occlusion Map**

#### AO Master Settings

- Pixel Spread: `150`
- Depth: `2.50`
- Contrast: `1.35`

2. Click **Set as AO Map**

### Step 6: Visualize and Compile the Master Specular Map

1. Click **Show Full Material**
2. Hold `L` and move the mouse to inspect changing light angles

Materialize can export a Fallout 4-style packed specular map directly through **Property Map Setup**:

- **Red Channel:** Smoothness
- **Green Channel:** Ambient Occlusion
- **Blue Channel:** Metallic

Then click **Save Project** to output:

- Diffuse
- Normal
- FO4-style packed `_s` specular map

---

## Materialize Batch Cleanup and Engine Suffix Tagging Script

Save this as `FixMaterializeOutputs.bat` inside the texture export folder to rename Materialize outputs into FO4/PyNifly-friendly suffixes.

```cmd
@echo off
setlocal enabledelayedexpansion
title Materialize To Engine Suffix Converter
echo =======================================================
echo     MATERIALIZE RAW TEXTURE AUTOMATED TAGGING TOOL
echo =======================================================
echo.

set /a count=0
for %%f in (*diffuse*.png *diffuse*.jpg *diffuse*.bmp) do set /a count+=1

if %count%==0 (
    echo [ERROR] No standard Materialize export patterns located in this folder.
    echo Ensure you exported maps using standard naming templates.
    echo.
    pause
    exit /b
)

echo [PROCESSING] Restructuring texture profile nodes...
echo -------------------------------------------------------

for %%i in (*diffuse*.png *diffuse*.jpg *diffuse*.bmp) do (
    set "OUT=%%~ni"
    set "OUT=!OUT:diffuse=_d!"
    echo Tagging Diffuse Color Map: %%i -> !OUT!%%~xi
    ren "%%i" "!OUT!%%~xi" 2>nul
)

for %%i in (*normal*.png *normal*.jpg *normal*.bmp) do (
    set "OUT=%%~ni"
    set "OUT=!OUT:normal=_n!"
    echo Tagging Surface Vector Normal Map: %%i -> !OUT!%%~xi
    ren "%%i" "!OUT!%%~xi" 2>nul
)

for %%i in (*property*.png *property*.jpg *property*.bmp *smoothness*.png *smoothness*.jpg *smoothness*.bmp) do (
    set "OUT=%%~ni"
    set "OUT=!OUT:property=_s!"
    set "OUT=!OUT:smoothness=_s!"
    echo Tagging Channel-Packed Specular Map: %%i -> !OUT!%%~xi
    ren "%%i" "!OUT!%%~xi" 2>nul
)

echo -------------------------------------------------------
echo [CLEANUP] Discarding intermediate development map layers...

if exist *height*.png del /f /q *height*.png 2>nul
if exist *height*.jpg del /f /q *height*.jpg 2>nul
if exist *ao*.png del /f /q *ao*.png 2>nul
if exist *ao*.jpg del /f /q *ao*.jpg 2>nul
if exist *metallic*.png del /f /q *metallic*.png 2>nul
if exist *metallic*.jpg del /f /q *metallic*.jpg 2>nul

echo.
echo =======================================================
echo SUCCESS: Suffix processing and cache cleaning complete.
echo Your files are tagged and ready for Intel Texture Works.
echo =======================================================
echo.
pause
endlocal
```
