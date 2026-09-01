# Fallout 4 Merging Guide: Textures, Materials, Meshes & Mods

## Complete Guide to Safe Asset & Mod Merging

This guide explains **how to merge different types of assets and mods** in Fallout 4 without causing conflicts, load order issues, or game instability.

---

## Table of Contents

1. [Merging Textures (DDS)](#merging-textures-dds)
2. [Merging Materials (BGSM/BGEM)](#merging-materials-bgsmgbgem)
3. [Merging Meshes (NIF)](#merging-meshes-nif)
4. [Merging Plugins (ESP/ESM)](#merging-plugins-espesm)
5. [Load Order Conflict Resolution](#load-order-conflict-resolution)
6. [Texture Atlasing](#texture-atlasing)
7. [Material Batching](#material-batching)
8. [Mesh Combining Workflows](#mesh-combining-workflows)
9. [Mod Merge Best Practices](#mod-merge-best-practices)
10. [Common Merge Problems & Solutions](#common-merge-problems--solutions)

---

## Merging Textures (DDS)

### Why Merge Textures?

**Use Cases**:
- **Texture atlasing** - Combine multiple textures into one large texture
- **Performance** - Reduce texture bind operations
- **Compatibility** - Merge conflicting texture replacements
- **Custom variants** - Blend two armor retextures

### Method 1: Simple Texture Replacement Merge

**Scenario**: Two mods replace the same texture with different versions.

**Files**:
- `Mod A: Textures\Armor\Combat\Torso_d.dds` (4K, weathered look)
- `Mod B: Textures\Armor\Combat\Torso_d.dds` (2K, clean look)

**Solution: Manual Merge in GIMP/Photoshop**

**Step 1: Export both textures from BA2 or loose files**
```bash
# Using BSA Browser or BA2 Extract
Extract Mod A's Torso_d.dds → TorsoA_d.dds
Extract Mod B's Torso_d.dds → TorsoB_d.dds
```

**Step 2: Open in GIMP**
```
1. File → Open → TorsoA_d.dds (4K version as base)
2. File → Open as Layers → TorsoB_d.dds
3. Now you have both textures as layers
```

**Step 3: Blend textures**
```
Option A: Use layer mask
  - Add layer mask to TorsoB layer
  - Paint black/white to reveal/hide areas
  - Merge specific details from each texture

Option B: Blend modes
  - Set TorsoB layer to "Overlay" or "Multiply"
  - Adjust opacity (50% = 50/50 blend)
  - Flatten image

Option C: Manual paint
  - Select areas from TorsoB
  - Copy/paste onto TorsoA
  - Use Clone Stamp tool to blend seams
```

**Step 4: Export merged texture**
```
File → Export As → Torso_d.dds
Settings:
  - Compression: BC7 (best quality) or DXT5
  - Generate mipmaps: YES
  - Format: RGBA if alpha channel, RGB if opaque
```

**Step 5: Replace in mod**
```
Place merged Torso_d.dds in:
  Data\Textures\Armor\Combat\
  
Load order:
  Mod A (disabled)
  Mod B (disabled)
  MyMergedTextures (new mod with merged DDS)
```

### Method 2: Texture Atlasing (Combine Multiple Textures)

**Scenario**: Combine 4 separate item textures into one atlas.

**Why?**
- **Fewer texture switches** = better performance
- **Batch rendering** = fewer draw calls
- Used by vanilla FO4 for clutter items

**Original textures**:
```
BottleCap_d.dds     (512x512)
NukaCola_d.dds      (512x512)
Stimpak_d.dds       (512x512)
RadAway_d.dds       (512x512)
```

**Atlas creation**:

**Step 1: Create atlas canvas**
```
GIMP: Image → New Canvas → 2048x2048
(4 textures at 512x512 each = 1024x1024 minimum, use 2048x2048 for padding)
```

**Step 2: Layout textures in grid**
```
+------------------------+------------------------+
| BottleCap (0,0)        | NukaCola (1024,0)     |
| 512x512 → 1024x1024    | 512x512 → 1024x1024   |
+------------------------+------------------------+
| Stimpak (0,1024)       | RadAway (1024,1024)   |
| 512x512 → 1024x1024    | 512x512 → 1024x1024   |
+------------------------+------------------------+
```

**Step 3: Paste each texture**
```
1. Open BottleCap_d.dds
2. Select All → Copy
3. Switch to atlas canvas
4. Paste at position (0, 0)
5. Repeat for other 3 textures
```

**Step 4: Update UV coordinates in NIF**
```
Original UVs (0.0-1.0 covers entire texture):
  BottleCap: U=0.0-1.0, V=0.0-1.0

New UVs (0.0-0.5 covers top-left quadrant):
  BottleCap: U=0.0-0.5, V=0.0-0.5
  NukaCola:  U=0.5-1.0, V=0.0-0.5
  Stimpak:   U=0.0-0.5, V=0.5-1.0
  RadAway:   U=0.5-1.0, V=0.5-1.0
```

**Step 5: Export atlas**
```
Export as ItemsAtlas_d.dds
- 2048x2048
- BC7 or DXT5 compression
- Generate mipmaps
```

**Step 6: Update material references**
```
# In NifSkope or BGSM file:
Change:
  DiffuseTexture: "Textures\Items\BottleCap_d.dds"
To:
  DiffuseTexture: "Textures\Items\ItemsAtlas_d.dds"
```

### Texture Merge Automation

**Using Texture Packer (3rd party tool)**:
```bash
TexturePacker.exe --sheet ItemsAtlas_d.dds --format unity --data atlas.json BottleCap_d.dds NukaCola_d.dds Stimpak_d.dds RadAway_d.dds
# Generates atlas + JSON with UV coordinates
```

**Python script for batch UV remapping**:
```python
import pyffi.formats.nif as NifFormat

def remap_uvs(nif_path, uv_offset, uv_scale):
    """
    uv_offset: (x, y) offset in atlas
    uv_scale: (x, y) scale factor (0.5 for half-size)
    """
    nif = NifFormat.NifFile()
    nif.read(open(nif_path, 'rb'))
    
    for block in nif.get_global_iterator():
        if isinstance(block, NifFormat.NiTriShapeData):
            for uv in block.uv_sets[0]:
                uv.u = uv.u * uv_scale[0] + uv_offset[0]
                uv.v = uv.v * uv_scale[1] + uv_offset[1]
    
    nif.write(open(nif_path, 'wb'))

# Remap BottleCap to top-left quadrant
remap_uvs("BottleCap.nif", (0.0, 0.0), (0.5, 0.5))
```

---

## Merging Materials (BGSM/BGEM)

### Why Merge Materials?

**Scenarios**:
- Two mods modify the same material (one adds glow, one adds reflections)
- Combine material properties from multiple sources
- Create unified material library

### Material Structure Reminder

```json
{
  "DiffuseTexture": "Textures\\Armor\\Leather\\Body_d.dds",
  "NormalTexture": "Textures\\Armor\\Leather\\Body_n.dds",
  "SpecularTexture": "Textures\\Armor\\Leather\\Body_s.dds",
  "SpecularPower": 33.0,
  "SpecularColorScale": 1.0,
  "EmittanceEnabled": false,
  "Flags": 2147483649
}
```

### Method 1: Manual Material Merge

**Scenario**: Merge two conflicting BGSM files.

**Mod A's LeatherArmor.bgsm**:
```json
{
  "DiffuseTexture": "Textures\\Armor\\Leather\\BodyA_d.dds",
  "SpecularPower": 50.0,
  "EmittanceEnabled": false
}
```

**Mod B's LeatherArmor.bgsm**:
```json
{
  "DiffuseTexture": "Textures\\Armor\\Leather\\BodyB_d.dds",
  "SpecularPower": 33.0,
  "EmittanceEnabled": true,
  "EmittanceColor": [0.2, 0.2, 0.5]
}
```

**Merged LeatherArmor.bgsm**:
```json
{
  "DiffuseTexture": "Textures\\Armor\\Leather\\BodyMerged_d.dds",
  "SpecularPower": 40.0,  // Average or preferred value
  "EmittanceEnabled": true,  // Keep glow from Mod B
  "EmittanceColor": [0.2, 0.2, 0.5],
  // Use all other properties from preferred mod
}
```

**Steps**:
```
1. Open both BGSM files in text editor (Notepad++, VSCode)
2. Compare line by line
3. For conflicts:
   - Texture paths: Merge textures first (see above), use merged path
   - Numeric values: Average, or pick preferred
   - Booleans: Pick preferred
   - Flags: Combine with bitwise OR (advanced)
4. Save as new BGSM
5. Replace original material reference
```

### Method 2: Material Property Combination

**Combining features from multiple materials**:

**Material A**: High specular (shiny metal)
**Material B**: Emissive glow (neon)
**Goal**: Shiny metal with glow

**Merged**:
```json
{
  "DiffuseTexture": "...",
  "SpecularPower": 80.0,        // From A (shiny)
  "SpecularColorScale": 1.5,    // From A
  "EmittanceEnabled": true,     // From B (glow)
  "EmittanceColor": [0.0, 1.0, 0.0],  // From B (green glow)
  "Flags": 2147483649 | 32      // Combine flags (bitwise OR)
}
```

### Flag Merging (Advanced)

**Material flags are binary**:
```
Flag A: 2147483649 (0x80000001) = Bit 0 + Bit 31
Flag B: 2147483713 (0x80000041) = Bit 0 + Bit 6 + Bit 31
Merged: 2147483713 (includes all bits from both)
```

**Common flags**:
- Bit 0: ZBuffer Write
- Bit 6: Cast Shadows
- Bit 8: Two-Sided
- Bit 31: Enable feature

**Merging logic**:
```python
flag_a = 2147483649
flag_b = 2147483713
merged = flag_a | flag_b  # Bitwise OR
print(merged)  # 2147483713
```

---

## Merging Meshes (NIF)

### Why Merge Meshes?

**Benefits**:
- **Reduce draw calls** - 10 meshes → 1 mesh = 10x faster
- **Share materials** - One material for multiple objects
- **Precombine-compatible** - Merged static objects
- **Armor parts** - Combine chest/arms/legs into single piece

### Method 1: Simple Mesh Merge in Blender

**Scenario**: Merge 3 separate armor pieces into one.

**Step 1: Import all NIFs into Blender**
```
1. File → Import → NetImmerse/Gamebryo (.nif)
2. Select ChestArmor.nif → Import
3. File → Import → LeftArm.nif → Import
4. File → Import → RightArm.nif → Import
5. All 3 meshes now in scene
```

**Step 2: Verify all use same skeleton (if rigged)**
```
1. Select ChestArmor mesh
2. Check Armature modifier → Skeleton name
3. Select LeftArm mesh
4. Check Armature modifier → Same skeleton?
5. If different, reparent to same armature
```

**Step 3: Join meshes**
```
1. Select all 3 meshes (Shift+Click)
2. Object → Join (or press Ctrl+J)
3. Now one combined mesh object
```

**Step 4: Clean up materials**
```
Problem: Each mesh had its own material
Result: Combined mesh has 3 materials

Option A: Keep separate materials (if different textures)
  - No action needed
  
Option B: Merge materials (if same texture set)
  1. Material Properties → Delete extra materials
  2. Assign all faces to one material
  3. UV map all faces to same texture
```

**Step 5: Check vertex groups (bone weights)**
```
1. Enter Edit Mode (Tab)
2. Mesh → Weights → Normalize All
3. Verify no orphaned vertices (not weighted)
4. Check total bone count < 80 (FO4 limit)
```

**Step 6: Export merged NIF**
```
1. File → Export → NetImmerse/Gamebryo (.nif)
2. Settings:
   - Game: Fallout 4
   - Skeleton: FO4 Skeleton
   - Export collision: If needed
3. Export to MergedArmor.nif
```

### Method 2: NifSkope Mesh Merge (No Blender)

**Use NifSkope for simple static mesh merging**:

**Step 1: Open base NIF**
```
Open ChestArmor.nif in NifSkope
```

**Step 2: Copy mesh from other NIF**
```
1. Open RightArm.nif in separate NifSkope window
2. Find NiTriShape block (the actual mesh geometry)
3. Right-click → Block → Copy Branch
4. Switch to ChestArmor.nif window
5. Find root NiNode
6. Right-click → Block → Paste Branch
7. Now RightArm mesh is in ChestArmor.nif
```

**Step 3: Repeat for all meshes**
```
Copy LeftArm.nif → Paste into ChestArmor.nif
Copy Legs.nif → Paste into ChestArmor.nif
```

**Step 4: Adjust transforms (positions)**
```
If meshes are in wrong positions:
1. Find each NiTriShape's NiNode parent
2. Expand Translation property
3. Adjust X, Y, Z coordinates
4. Adjust Rotation quaternion if needed
```

**Step 5: Merge geometry data (optional)**
```
For static objects only (no skeleton):
1. Right-click root NiNode → Mesh → Combine Shapes
2. All NiTriShapes merge into one
3. Saves draw calls
```

**Step 6: Verify and save**
```
1. Render → Render Window (see preview)
2. Check for visual issues
3. File → Save As → MergedArmor.nif
```

### Method 3: Outfit Studio Mesh Merge (Body/Armor)

**Best for armor/clothing with body conforming**:

**Step 1: Load base body**
```
1. Open Outfit Studio
2. File → Load Project
3. Select FO4 BaseMaleBody or BaseFemaleBody
```

**Step 2: Import armor pieces**
```
1. File → Import → From NIF
2. Select ChestArmor.nif → Import
3. Repeat for arms, legs, etc.
```

**Step 3: Conform to body**
```
1. Select armor mesh
2. Slider → Set Reference
3. Slider → Conform All (matches body shape)
4. Preview deformation
```

**Step 4: Merge parts**
```
1. Shape → Merge Geometry
2. Select all armor parts
3. Click Merge → Creates single mesh
```

**Step 5: Weight painting (if skeleton rigged)**
```
1. Bones → From Template (load FO4 skeleton)
2. Bones → Copy Bone Weights (from body)
3. Manual paint touch-ups (Weights tab)
```

**Step 6: Export**
```
1. File → Export → To NIF
2. Save as MergedOutfit.nif
3. Test in game
```

### Mesh Merge Limits

| Limit | Value | Workaround |
|-------|-------|------------|
| Vertices per mesh | 65,535 | Split into multiple NiTriShapes |
| Bones per skeleton | 80 | Reduce/merge bones |
| Materials per NIF | Unlimited | But each material = separate draw call |
| File size | No hard limit | Keep under 10MB for performance |

---

## Merging Plugins (ESP/ESM)

### Why Merge Plugins?

**Benefits**:
- **Save load order slots** (255 ESP/ESM limit)
- **Reduce conflicts** (one merged plugin instead of many)
- **Simplify mod list** (easier to manage)
- **Performance** (fewer plugin loads)

**Risks**:
- **Update incompatibility** (can't update individual mods)
- **Script conflicts** (Papyrus scripts may clash)
- **Complex to maintain**

### Method 1: xEdit Merged Plugin (Manual)

**Scenario**: Merge 3 weapon mods into one plugin.

**Mods to merge**:
- ModA.esp (adds Rifle A)
- ModB.esp (adds Rifle B)
- ModC.esp (adds Rifle C)

**Step 1: Load all plugins in xEdit**
```
1. Launch xEdit
2. Check all 3 mods + masters (Fallout4.esm, DLCs)
3. Click OK
```

**Step 2: Create new plugin**
```
1. File → New File
2. Name: MergedWeapons.esp
3. Add masters (Fallout4.esm, any DLCs used)
```

**Step 3: Copy records from ModA**
```
1. Expand ModA.esp
2. Find Weapon record group
3. Right-click weapon record → Copy as override into...
4. Select MergedWeapons.esp
5. Repeat for all weapons in ModA
```

**Step 4: Repeat for ModB and ModC**
```
Copy all records from ModB → MergedWeapons.esp
Copy all records from ModC → MergedWeapons.esp
```

**Step 5: Handle conflicts**
```
If ModA and ModB both edit the same record:
1. View both in xEdit (side-by-side)
2. Manually merge differences
3. Drag values from preferred mod
4. Or create custom merged values
```

**Step 6: Copy assets (meshes/textures)**
```
Copy from each mod:
  ModA/Meshes/ → Data/Meshes/
  ModA/Textures/ → Data/Textures/
  ModB/Meshes/ → Data/Meshes/
  ... (merge all asset folders)
```

**Step 7: Clean and save**
```
1. Right-click MergedWeapons.esp → Remove "Identical to Master" records
2. Right-click → Remove "Identical to Previous Level" records
3. File → Save
```

**Step 8: Test in game**
```
Load order:
  Fallout4.esm
  DLCs...
  MergedWeapons.esp
  
Disable original mods:
  ModA.esp (disabled)
  ModB.esp (disabled)
  ModC.esp (disabled)
```

### Method 2: Merge Plugins Tool (Automated)

**Using zMerge (3rd party tool)**:

**Step 1: Setup**
```
1. Download zMerge from Nexus
2. Install with Mod Organizer 2
3. Launch zMerge
```

**Step 2: Create merge**
```
1. File → New Merge
2. Name: WeaponMerge
3. Method: Smart Merge
4. Filename: MergedWeapons.esp
```

**Step 3: Add plugins**
```
1. Drag ModA.esp, ModB.esp, ModC.esp into merge list
2. zMerge analyzes dependencies
3. Shows warnings for conflicts
```

**Step 4: Configure merge**
```
Settings:
  - Copy general assets: YES
  - Build merged archive: YES (creates BA2)
  - Handle navmesh: NO (don't merge navmesh!)
  - Renumber FormIDs: YES (prevents collisions)
```

**Step 5: Build merge**
```
1. Click "Build Merge"
2. zMerge:
   - Copies all records
   - Renumbers FormIDs
   - Copies assets to Data/
   - Creates BA2 archive
3. Output: MergedWeapons.esp + BA2
```

**Step 6: Test**
```
Enable MergedWeapons.esp
Disable original 3 mods
Launch game and verify
```

### Method 3: ESL-Flagging (Pseudo-Merge)

**Instead of merging, convert to ESL**:

**Benefits**:
- **Don't use load order slots** (all ESLs share FE slot)
- **Keep mods separate** (can update individually)
- **No merge conflicts**

**Limitations**:
- **4096 FormID limit per plugin**
- **No new cells/worldspaces**
- **No new dialogue**

**Steps**:
```
1. Open ModA.esp in xEdit
2. Right-click → Compact FormIDs for ESL
3. Right-click header → Add ESL flag
4. Save
5. Repeat for ModB and ModC
```

**Result**:
```
Load order:
  FE 000: ModA.esp (ESL)
  FE 001: ModB.esp (ESL)
  FE 002: ModC.esp (ESL)
All share FE slot, don't use load order slots!
```

---

## Load Order Conflict Resolution

### Understanding Conflicts

**Load order determines winners**:
```
00: Fallout4.esm
01: DLCRobot.esm
02: UFO4P.esp
03: ModA.esp   ← Edits "10mm Pistol" damage to 25
04: ModB.esp   ← Edits "10mm Pistol" damage to 30
```

**Result**: ModB wins (loads last), 10mm Pistol has 30 damage.

### Detecting Conflicts in xEdit

**Step 1: Load all plugins**
```
Launch xEdit → Select all → OK
```

**Step 2: Apply conflict filter**
```
1. Right-click any plugin
2. Apply Filter
3. Select "by Conflict Status"
4. Click Filter
```

**Color codes**:
- **Red**: Overrides (last mod wins)
- **Orange**: Conflicts (incompatible changes)
- **Yellow**: Harmless override
- **Green**: Identical to master

**Step 3: Review conflicts**
```
1. Expand red/orange entries
2. Compare columns (each column = one mod)
3. Identify what changed
```

### Conflict Resolution Strategies

**Strategy 1: Change load order**
```
Prefer ModA over ModB?
  → Load ModA after ModB
Result: ModA wins
```

**Strategy 2: Create compatibility patch**
```
1. Create new plugin: CompatPatch.esp
2. Add ModA.esp and ModB.esp as masters
3. Copy conflicting record to CompatPatch.esp
4. Manually merge changes:
   - Take damage from ModA
   - Take fire rate from ModB
   - Custom blended values
5. Load order:
     ModA.esp
     ModB.esp
     CompatPatch.esp  ← Wins, has blended changes
```

**Strategy 3: Forward (copy winning values)**
```
If you prefer ModB but need ModC to load last:
1. Copy ModB's values to ModC
2. ModC now has ModB's changes
3. Load order:
     ModB.esp
     ModC.esp  ← Has ModB's changes forwarded
```

### Leveled List Merging (Critical!)

**Problem**: Two mods inject items into same leveled list.

**WRONG: Override**
```
ModA adds Weapon1 to LeveledList_Raiders
ModB adds Weapon2 to LeveledList_Raiders
If ModB overrides, Weapon1 is LOST!
```

**CORRECT: Merge**
```
1. Open LeveledList_Raiders in xEdit
2. See ModA's version (has Weapon1)
3. See ModB's version (has Weapon2)
4. Create patch:
   - Copy as override to CompatPatch.esp
   - Manually add both Weapon1 AND Weapon2
5. Result: Both weapons in list
```

**Automated leveled list merge**:
```
1. Load all mods in xEdit
2. Right-click → Other → Create Merged Patch
3. xEdit automatically merges leveled lists
4. Save MergedPatch.esp
5. Load last in load order
```

---

## Texture Atlasing

### Advanced Texture Combination

**Use case**: Combine 16 clutter item textures into one 4096x4096 atlas.

**Benefits**:
- **Batch rendering** - All items use one texture
- **Fewer texture swaps** - Huge performance gain
- **Reduced VRAM** - One large texture vs many small

**Workflow**:

**Step 1: Collect all textures**
```
Item01_d.dds (256x256)
Item02_d.dds (256x256)
...
Item16_d.dds (256x256)
```

**Step 2: Layout grid**
```
4x4 grid on 4096x4096 canvas:
Each item gets 1024x1024 space
(Upscale 256 → 1024 for quality)
```

**Step 3: Generate UV map**
```json
{
  "Item01": {"uMin": 0.00, "vMin": 0.00, "uMax": 0.25, "vMax": 0.25},
  "Item02": {"uMin": 0.25, "vMin": 0.00, "uMax": 0.50, "vMax": 0.25},
  "Item03": {"uMin": 0.50, "vMin": 0.00, "uMax": 0.75, "vMax": 0.25},
  "Item04": {"uMin": 0.75, "vMin": 0.00, "uMax": 1.00, "vMax": 0.25},
  ...
}
```

**Step 4: Batch update NIFs**
```python
import json
import pyffi

uv_map = json.load(open("atlas_uvs.json"))

for item_name, uv_coords in uv_map.items():
    nif_path = f"Meshes/Items/{item_name}.nif"
    
    nif = pyffi.formats.nif.NifFormat.NifFile()
    nif.read(open(nif_path, 'rb'))
    
    # Update UVs
    for block in nif.get_global_iterator():
        if isinstance(block, pyffi.formats.nif.NiTriShapeData):
            for uv in block.uv_sets[0]:
                # Remap 0-1 range to atlas sub-region
                uv.u = uv.u * (uv_coords["uMax"] - uv_coords["uMin"]) + uv_coords["uMin"]
                uv.v = uv.v * (uv_coords["vMax"] - uv_coords["vMin"]) + uv_coords["vMin"]
    
    # Update texture path
    for block in nif.get_global_iterator():
        if isinstance(block, pyffi.formats.nif.BSLightingShaderProperty):
            block.texture_set.textures[0] = "Textures\\Items\\ItemsAtlas_d.dds"
    
    nif.write(open(nif_path, 'wb'))
```

---

## Material Batching

### Shared Material Optimization

**Problem**: 50 objects with 50 different materials = 50 draw calls.

**Solution**: Use 1 shared material = 1 draw call (if using texture atlas).

**Workflow**:

**Step 1: Create universal material**
```json
// UniversalClutter.bgsm
{
  "DiffuseTexture": "Textures\\Clutter\\ClutterAtlas_d.dds",
  "NormalTexture": "Textures\\Clutter\\ClutterAtlas_n.dds",
  "SpecularTexture": "Textures\\Clutter\\ClutterAtlas_s.dds",
  "SpecularPower": 33.0,
  "Flags": 2147483649
}
```

**Step 2: Batch update NIFs to reference shared material**
```python
for nif_file in nif_files:
    nif = load_nif(nif_file)
    for shader in nif.find_blocks(BSLightingShaderProperty):
        shader.texture_set = "Materials\\Clutter\\UniversalClutter.bgsm"
    save_nif(nif, nif_file)
```

**Result**: 50 objects → 1 material → 1 draw call (if atlased).

---

## Mesh Combining Workflows

### Static Object Combining (Precombines)

**Creation Kit method** (automatic):
```
1. Mark objects with "Precombined Mesh" flag
2. Generate Precombine/Previs Data
3. CK automatically merges meshes
```

**Manual method** (custom tool):
```python
def combine_static_meshes(nif_files):
    base_nif = load_nif(nif_files[0])
    
    for additional_nif in nif_files[1:]:
        nif = load_nif(additional_nif)
        
        # Extract mesh geometry
        for tri_shape in nif.find_blocks(NiTriShape):
            # Copy entire branch to base NIF
            base_nif.roots[0].add_child(tri_shape)
    
    # Optionally merge into single NiTriShape
    combined_geometry = merge_tri_shapes(base_nif)
    
    save_nif(base_nif, "CombinedStatics.nif")
```

---

## Mod Merge Best Practices

### ✅ DO

1. **Merge similar mods** (weapon packs, armor packs)
2. **Test thoroughly** after merging
3. **Keep backups** of original mods
4. **Document what you merged** (README)
5. **Use ESL when possible** instead of merging
6. **Merge leveled lists** properly (don't override)
7. **Check scripts** for conflicts (Papyrus)
8. **Renumber FormIDs** if merging plugins with overlapping IDs

### ❌ DON'T

1. **Don't merge** complex quest mods (scripts will break)
2. **Don't merge** mods with active development (hard to update)
3. **Don't merge** if you don't understand conflicts
4. **Don't merge** navmesh edits (causes CTDs)
5. **Don't merge** DLL plugins (F4SE incompatible)
6. **Don't merge** mods from different authors without permission
7. **Don't distribute merged mods** publicly without permission
8. **Don't merge** if load order slots aren't an issue

---

## Common Merge Problems & Solutions

### Problem 1: Merged Textures Look Blurry

**Cause**: Incorrect DDS compression or no mipmaps.

**Solution**:
```
1. Re-export with BC7 compression (highest quality)
2. Enable mipmap generation
3. Use power-of-2 dimensions (1024, 2048, 4096)
4. Don't downscale unnecessarily
```

### Problem 2: Merged Mesh Missing Parts

**Cause**: Forgot to copy all NiTriShapes, or bone mismatch.

**Solution**:
```
1. Check all NiTriShape blocks copied
2. Verify bone names match exactly
3. Check for hidden meshes (disabled flag)
4. View in NifSkope render window
```

### Problem 3: Merged Plugin Causes CTD

**Cause**: Deleted records, FormID conflicts, script errors.

**Solution**:
```
1. xEdit: Check for "Deleted Record" entries
2. xEdit: Apply filter for critical conflicts
3. Check Papyrus logs for script errors
4. Verify all masters are loaded
5. Test with only merged plugin enabled
```

### Problem 4: Merged Materials Don't Apply

**Cause**: Wrong texture paths, missing files.

**Solution**:
```
1. Verify all texture files copied to Data/
2. Check BGSM has correct relative paths
3. Test in NifSkope (should show textures)
4. Check for typos in paths (case-sensitive!)
```

### Problem 5: Performance Worse After Merge

**Cause**: Created too-large textures/meshes, or broke batching.

**Solution**:
```
1. Don't create textures >4096x4096
2. Don't exceed 65K vertices per mesh
3. Keep meshes split if using different materials
4. Use texture compression (don't leave uncompressed)
```

---

## Testing Checklist

Before releasing merged assets/mods:

- [ ] **Visual check** - Load in game, verify appearance
- [ ] **Performance test** - Check FPS before/after
- [ ] **Conflict check** - xEdit filter for conflicts
- [ ] **Load order test** - Try different positions
- [ ] **Save/load test** - Ensure saves work correctly
- [ ] **Script test** - Check Papyrus logs for errors
- [ ] **Compatibility test** - Load with popular mods (UFO4P, PRP, SS2)
- [ ] **Backup created** - Have originals for rollback

---

## See Also

- **FALLOUT4_TECHNICAL_SYSTEMS_DEEP_DIVE.md** - How systems work internally
- **FALLOUT4_MODDING_PATTERNS.md** - Modding workflows
- **XEDIT_COMPREHENSIVE_GUIDE.md** - xEdit conflict resolution

---

**Last Updated**: April 2026 (Complete merging guide for all asset types)
