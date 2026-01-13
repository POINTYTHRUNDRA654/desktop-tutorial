# NifSkope Diva Version 11 - Complete Guide for Fallout 4 Modding

## What is NifSkope?

**NifSkope** is a specialized 3D model viewer and editor for NetImmerse/Gamebryo NIF files, which are used extensively in Bethesda games including Fallout 4.

### What is NifSkope Diva Version 11?

**NifSkope Diva Version 11** (also called "NifSkope 2.0 Dev 11")
- **Current Standard:** Most widely used version by Fallout 4 modders in 2026
- **Developer:** Community-maintained (original by NifTools team)
- **Version:** 2.0 Development 11 (Diva branch)
- **Release:** ~2022-2023, still actively maintained
- **Platform:** Windows (primary), experimental Linux builds

**Why "Diva"?**
- Internal codename for the 2.0 development branch
- Represents complete rewrite of NifSkope with Qt5 framework
- Major improvements over legacy 1.1.3 version

**Download Links:**
- **Official GitHub:** https://github.com/hexabits/nifskope/releases
- **Nexus Mods:** https://www.nexusmods.com/fallout4/mods/50378

---

## Why NifSkope Diva 11 is Essential for Fallout 4

### Key Features for F4 Modding:

✅ **Fallout 4 NIF Support** - Full support for F4's NIF version (20.2.0.7)  
✅ **BSTriShape Support** - Handles F4's optimized mesh format  
✅ **Material Editing** - Edit BGSM/BGEM material references  
✅ **Collision Editing** - View and modify bhkCollisionObject  
✅ **Texture Path Management** - Fix and update texture references  
✅ **Skinning Support** - Edit bone weights and rigging  
✅ **Animation Preview** - View idle animations and skeletal rigs  
✅ **Batch Operations** - Process multiple NIFs with scripts  
✅ **Modern UI** - Dark theme, dockable panels, customizable  

### Advantages Over Older Versions:

**NifSkope 1.1.3 (Legacy):**
- ❌ No Fallout 4 BSTriShape support
- ❌ Crashes on F4 NIFs
- ❌ Outdated UI
- ❌ No material editor

**NifSkope Diva 11 (Current):**
- ✅ Full Fallout 4 support
- ✅ Stable with F4 NIFs
- ✅ Modern Qt5 interface
- ✅ Material editing built-in
- ✅ Regular updates

---

## Installation and Setup

### System Requirements

**Minimum:**
- Windows 7 or later (Windows 10/11 recommended)
- 2 GB RAM
- 500 MB disk space
- DirectX 11 compatible GPU

**Recommended:**
- Windows 10/11 64-bit
- 4 GB+ RAM
- 1 GB disk space
- NVIDIA GTX 1060 / AMD RX 580 or better (for complex meshes)

### Installation Steps

**Step 1: Download NifSkope Diva 11**
```
1. Go to GitHub: https://github.com/hexabits/nifskope/releases
2. Find latest "2.0 Dev" release (e.g., 2.0-dev-11)
3. Download Windows build:
   - nifskope-2.0-dev11-x64.zip (64-bit, recommended)
   OR
   - nifskope-2.0-dev11-x86.zip (32-bit)
```

**Step 2: Extract**
```
1. Extract ZIP to a permanent location
   Recommended: C:\Modding\Tools\NifSkope\
   
2. File structure:
   NifSkope\
   ├── NifSkope.exe
   ├── Qt5*.dll (multiple Qt libraries)
   ├── platforms\
   ├── styles\
   ├── shaders\
   └── README.txt
```

**Step 3: First Launch Configuration**
```
1. Run NifSkope.exe (no installation needed - portable)
2. First launch prompts: "Configure for Fallout 4?"
   - Click: YES
3. NifSkope auto-detects:
   - Fallout 4 installation path
   - Game version (20.2.0.7)
   - Material paths
```

**Step 4: Set File Associations (Optional)**
```
1. In NifSkope: Settings → File Associations
2. Check: Associate .nif files with NifSkope
3. Click: Apply
4. Now: Double-click .nif files to open in NifSkope
```

**Step 5: Configure Preferences**
```
Render → Settings:
✓ Enable textures: On
✓ Draw meshes: On
✓ Draw skeleton: On (for rigged meshes)
✓ Draw collision: On
✓ Lighting: On
✓ Anti-aliasing: 4x MSAA (or higher if your GPU supports)

View → Settings:
✓ Background color: Dark gray (#2B2B2B)
✓ Highlight color: Orange
✓ Grid: On (for alignment)

General → Preferences:
✓ Startup tip: Off
✓ Auto-sanitize on open: On (fixes minor issues automatically)
✓ Max undo levels: 50
```

**Step 6: Set Texture Search Paths**
```
1. Render → Settings → Resources
2. Add Fallout 4 texture folders:
   C:\Games\Fallout4\Data\Textures\
3. NifSkope will search here for textures
4. Textures now display correctly in 3D view
```

---

## NifSkope Diva 11 Interface Overview

### Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Menu Bar: File, Edit, View, Render, Spells, Help           │
├──────────────────┬──────────────────────┬───────────────────┤
│                  │                      │                   │
│  Block List      │   3D Render Window   │  Block Details    │
│  (Tree View)     │   (OpenGL Viewport)  │  (Properties)     │
│                  │                      │                   │
│  - NiNode        │   [3D Preview]       │  Name: BSTriShape │
│    - BSTriShape  │   Rotate/Pan/Zoom    │  Flags: 0x000E    │
│    - NiTriShape  │   Texture Display    │  Vertices: 1024   │
│    - bhkCollision│   Skeleton View      │  Triangles: 2048  │
│                  │                      │                   │
├──────────────────┴──────────────────────┴───────────────────┤
│ Status Bar: File info, NIF version, Block count            │
└─────────────────────────────────────────────────────────────┘
```

### Key Interface Elements

**1. Block List (Left Panel)**
- Tree view of all NIF blocks
- Hierarchical structure (parent-child relationships)
- Right-click for block operations

**2. 3D Render Window (Center)**
- Interactive 3D preview
- Mouse controls:
  - **Left Click + Drag:** Rotate view
  - **Right Click + Drag:** Pan view
  - **Mouse Wheel:** Zoom in/out
  - **Middle Click:** Reset camera
- Shows textures, lighting, skeleton

**3. Block Details (Right Panel)**
- Properties of selected block
- Editable fields (click to modify)
- Arrays and sub-properties expandable

**4. Toolbar (Top)**
- Quick access buttons:
  - Load/Save
  - Undo/Redo
  - Sanitize & Optimize
  - Collision viewer
  - Skeleton viewer

---

## Essential NifSkope Operations for Fallout 4

### 1. Opening and Inspecting NIF Files

**Open a NIF:**
```
Method 1: File → Open → Browse to .nif
Method 2: Drag and drop .nif onto NifSkope window
Method 3: Double-click .nif (if file association set)
```

**Quick Inspection Checklist:**
```
1. Check NIF version (status bar):
   - Fallout 4: 20.2.0.7
   - If wrong version: Spells → Blocks → Convert NIF Version

2. Check block structure (Block List):
   - Root: NiNode or BSFadeNode
   - Geometry: BSTriShape (F4 standard)
   - Collision: bhkCollisionObject (if present)

3. Check textures (3D view):
   - If textures don't display: Render → Settings → Resources
   - Add texture search paths

4. Check triangle count (select BSTriShape):
   - Block Details → Num Triangles
   - Optimal: <5000 for props, <10000 for characters

5. Check material reference:
   - BSTriShape → Block Details → BSShaderProperty → Name
   - Should point to .bgsm or .bgem file
```

### 2. Editing Texture Paths

**Problem: Textures Missing or Wrong Path**

**Solution: Fix Texture Paths**
```
1. Expand BSTriShape in Block List
2. Find: BSLightingShaderProperty
3. Expand: BSShaderTextureSet
4. See texture slots:
   - Textures[0]: Diffuse (_d.dds)
   - Textures[1]: Normal (_n.dds)
   - Textures[2]: Glow (_g.dds)
   - Textures[7]: Specular (_s.dds)

5. Right-click texture path → Edit
6. Enter new path: Textures\Weapons\MyMod\MyWeapon_d.dds
7. Repeat for other texture slots
8. Save NIF
```

**Batch Fix (Multiple Textures):**
```
Spells → Texture → Edit Texture Paths
- Old Path: Textures\OldFolder\
- New Path: Textures\NewFolder\
- Replace in all blocks: ✓
- Apply
```

### 3. Assigning Materials (BGSM/BGEM)

**Fallout 4 Material System:**
- Materials stored in separate .bgsm or .bgem files
- NIF references material by path
- Material contains texture paths, shader settings

**Assign Material to Mesh:**
```
1. Select BSTriShape in Block List
2. Right-click BSTriShape → Block → Insert
3. Select: BSLightingShaderProperty
4. New block appears as child
5. Select BSLightingShaderProperty
6. Block Details → Name field
7. Enter material path:
   Materials\Weapons\MyWeapon.bgsm
8. In 3D view, mesh now uses material's textures
9. Save NIF
```

**Create New Material (in Creation Kit):**
```
1. Open Creation Kit Material Editor
2. File → New Material
3. Set texture paths (diffuse, normal, specular, etc.)
4. Save as: MyWeapon.bgsm
5. Reference this in NifSkope as above
```

### 4. Adjusting Mesh Properties

**Scale Mesh:**
```
1. Select BSTriShape
2. Block Details → Transform
3. Expand: Translation, Rotation, Scale
4. Edit Scale values:
   - Scale: 1.5 (150% size)
   - Apply uniformly (X, Y, Z same value)
5. Save NIF
```

**Move Mesh Position:**
```
1. Select BSTriShape
2. Block Details → Transform → Translation
3. Edit X, Y, Z coordinates
4. Preview in 3D view
5. Save NIF
```

**Rotate Mesh:**
```
1. Select BSTriShape
2. Block Details → Transform → Rotation
3. Edit rotation matrix (advanced)
   OR
4. Use: Spells → Transform → Edit Rotation
   - Enter angles in degrees (easier)
```

### 5. Optimizing Meshes

**Optimize for Fallout 4:**
```
Spells → Optimize → Optimize for Fallout 4

This performs:
✓ Converts to BSTriShape (if needed)
✓ Removes unused blocks
✓ Optimizes triangle strips
✓ Updates flags for F4
✓ Removes duplicate vertices
✓ Reorders triangles for cache coherence

Result: Smaller file size, better performance
```

**Batch Optimize Multiple NIFs:**
```
Spells → Batch → Process Folder
- Select folder with .nif files
- Operation: Optimize for Fallout 4
- Include subfolders: ✓
- Backup originals: ✓
- Run
```

### 6. Adding Collision

**Types of Collision in F4:**
- **bhkBoxShape:** Simple box (fast)
- **bhkCapsuleShape:** Capsule (characters)
- **bhkSphereShape:** Sphere (projectiles)
- **bhkConvexVerticesShape:** Convex hull (complex static objects)
- **bhkMoppBvTreeShape:** Concave mesh (detailed collision, slower)

**Add Simple Box Collision:**
```
1. Select root NiNode
2. Spells → Collision → Create Collision
3. Dialog:
   - Type: Box
   - Auto-size from mesh: ✓
4. Apply
5. New bhkCollisionObject appears in Block List
6. Collision visible in 3D view (wireframe)
7. Save NIF
```

**Add Mesh-Based Collision (Complex):**
```
1. Select root NiNode
2. Spells → Collision → Pack Strips
3. Spells → Collision → Create Mopp
4. Collision generated from mesh geometry
5. Warning: Increases file size and physics load
6. Use only for important static objects
```

**View/Hide Collision:**
```
View → Show/Hide → Collision Geometry (toggle)
```

### 7. Working with Skinned Meshes (Rigged)

**View Skeleton:**
```
1. Open rigged mesh (character, creature)
2. View → Show/Hide → Skeleton
3. Bones visible as lines in 3D view
4. Select bone in Block List to highlight
```

**Edit Bone Weights:**
```
1. Select BSTriShape
2. Block Details → Skin Instance
3. Expand: Bone Weights
4. Shows vertex weight per bone (0.0 to 1.0)
5. Edit manually (advanced) or use external tools (Blender + NIF plugin)
```

**Assign Mesh to Skeleton:**
```
1. Mesh must have skin instance
2. Spells → Mesh → Skin Partition
3. Ensure bones are linked:
   - BSTriShape → NiSkinInstance → Bones
   - Bones array should list NiNode bone names
4. Verify in 3D view (animate to test)
```

### 8. Copying Blocks Between NIFs

**Scenario: Copy collision from one NIF to another**

**Steps:**
```
1. Open source NIF (has collision)
2. Right-click bhkCollisionObject → Block → Copy Branch
3. File → Open (target NIF)
4. Right-click root NiNode → Block → Paste Branch
5. Collision now in target NIF
6. Save target NIF
```

**Use Case: Template Workflow**
```
- Create master template NIF with perfect structure
- Copy blocks to all new meshes
- Ensures consistency (materials, collision, properties)
```

### 9. Sanitizing NIFs

**Sanitize = Auto-Fix Common Issues**

```
Spells → Sanitize → Sanitize NIF

Fixes:
✓ Invalid block references
✓ Out-of-range indices
✓ Duplicate blocks
✓ Unused blocks
✓ Incorrect string table
✓ Bad parent/child links

Always sanitize before releasing mod!
```

**Auto-Sanitize on Load:**
```
General → Preferences → Auto-sanitize on open: ✓
Every NIF auto-fixed when opened (safe)
```

### 10. Exporting Modified NIFs

**Save Changes:**
```
File → Save (Ctrl+S)
Overwrites original NIF
```

**Save As (New File):**
```
File → Save As
Enter new filename: MyWeapon_Fixed.nif
Preserves original
```

**Export to OBJ (for external editing):**
```
File → Export → Wavefront OBJ
- Select mesh blocks to export
- Save as .obj
- Open in Blender/3DS Max
- Re-import via Blender NIF Plugin
```

---

## Advanced NifSkope Techniques

### 1. Custom Shader Flags

**BSLightingShaderProperty Flags:**
```
Common F4 Shader Flags (binary):

SLSF1_Specular (1): Enable specular lighting
SLSF1_Skinned (2): Mesh is rigged to skeleton
SLSF1_Model_Space_Normals (4096): Use model-space normals
SLSF1_Own_Emit (8388608): Use glow map

SLSF2_Vertex_Colors (32): Use vertex colors
SLSF2_Weapon_Blood (256): Enable blood shader
SLSF2_Rim_Lighting (8192): Enable rim light effect
```

**Edit Flags:**
```
1. Select BSLightingShaderProperty
2. Block Details → Shader Flags 1 (SLSF1)
3. Shows as hex value (e.g., 0x84000107)
4. Click value → Edit
5. Check desired flags (opens flag editor)
6. Apply
```

### 2. LOD Generation

**Create LOD Levels:**
```
LOD = Level of Detail (lower poly for distance)

1. Open high-poly mesh
2. Spells → Mesh → Generate LOD
3. Settings:
   - LOD Levels: 3
   - Reduction: 50%, 75%, 90%
4. Generates:
   - MyMesh_LOD1.nif (50% triangles)
   - MyMesh_LOD2.nif (25% triangles)
   - MyMesh_LOD3.nif (10% triangles)
5. Lower triangle counts improve distant performance
```

**Manual LOD Configuration:**
```
1. Create separate NIF for each LOD
2. In Creation Kit:
   - Object → LOD Settings
   - Assign LOD1.nif, LOD2.nif, LOD3.nif
   - Set distance thresholds
```

### 3. Vertex Color Painting

**Add Vertex Colors:**
```
1. Select BSTriShape
2. Block Details → Vertex Colors
3. If "None": Spells → Mesh → Add Vertex Colors
4. Now each vertex has RGBA color (0-255)
5. Edit manually or import from Blender
```

**Use Cases:**
- Ambient occlusion baking
- Weathering variation (rust, dirt)
- Team colors (multiplayer, settlements)
- Emissive glow intensity

### 4. UV Mapping Adjustments

**View UV Layout:**
```
1. Select BSTriShape
2. Block Details → UV Sets
3. Shows UV coordinates (U, V per vertex)
4. Range: 0.0 to 1.0 (texture space)
```

**Fix UV Seams:**
```
Complex UV editing best done in Blender:
1. Export mesh: File → Export → OBJ
2. Open in Blender
3. Edit UV map
4. Re-export via Blender NIF Plugin
5. Open in NifSkope, verify
```

### 5. Animation Import/Export

**View Animations:**
```
1. Open NIF with embedded animation
2. Animation → Play
3. Skeleton animates in 3D view
4. Slider controls timeline
```

**Extract Animation:**
```
Animation → Export KF
Exports to .kf file (Keyframe animation)
Used for idle animations, gestures
```

**Apply Animation:**
```
1. Open static mesh
2. Animation → Import KF
3. Select .kf file
4. Mesh now animated
5. Save as animated NIF
```

---

## NifSkope Spells Reference

**"Spells" = Automated Operations**

### Block Operations
- **Insert Block:** Add new block to NIF
- **Remove Block:** Delete selected block
- **Copy Branch:** Copy block + children
- **Paste Branch:** Insert copied branch
- **Duplicate Block:** Clone selected block

### Mesh Operations
- **Flip Faces:** Invert triangle winding
- **Update Tangent Space:** Recalculate tangents/binormals
- **Remove Unused Vertices:** Clean up unused verts
- **Triangulate:** Convert quads to tris
- **Skin Partition:** Create bone partitions for skinned mesh

### Texture Operations
- **Choose Texture:** Browse and assign texture
- **Export Textures:** Extract embedded textures
- **Edit Texture Paths:** Batch rename texture paths
- **Embed Textures:** Embed external textures in NIF (rare)

### Collision Operations
- **Create Collision:** Generate collision body
- **Pack Strips:** Prepare for mopp collision
- **Create Mopp:** Generate collision tree
- **Update MOPP:** Recalculate collision
- **Remove Collision:** Delete all collision blocks

### Transform Operations
- **Edit Rotation:** Set rotation in degrees
- **Edit Scale:** Set scale factor
- **Apply Transform:** Bake transforms to vertices
- **Reset Transform:** Return to identity matrix

### Optimization
- **Optimize for Fallout 4:** Full F4 optimization
- **Remove Unused Blocks:** Delete unreferenced blocks
- **Update Header:** Fix header info
- **Reorder Blocks:** Optimize block order
- **Combine Shapes:** Merge multiple shapes

### Sanitize
- **Sanitize NIF:** Auto-fix common issues
- **Reorder Blocks:** Organize block list
- **Update Header String Table:** Fix string refs
- **Fix Invalid References:** Correct block links

### Batch Operations
- **Process Folder:** Apply spell to multiple NIFs
- **Rename Blocks:** Batch rename
- **Replace Textures:** Batch texture swap

---

## Common Errors and Solutions

### Error 1: "Failed to Load NIF"

**Symptom:** NifSkope crashes or shows error dialog

**Causes:**
- Corrupted NIF file
- Unsupported NIF version
- Missing required blocks

**Solutions:**
```
1. Check NIF version (open in text editor, first line)
   - Should start with: "Gamebryo File Format"
   - Version: 20.2.0.7 (Fallout 4)
2. Try older NifSkope version (1.1.3 might open it)
3. Re-export from source (Blender, 3DS Max)
4. Use hex editor to check file integrity
5. Restore from backup
```

### Error 2: "Textures Not Displaying"

**Symptom:** Mesh is gray/white, no textures

**Causes:**
- Texture paths incorrect
- Textures not in search paths
- DDS format unsupported

**Solutions:**
```
1. Render → Settings → Resources
   - Add: C:\Games\Fallout4\Data\Textures\
2. Check texture paths in BSShaderTextureSet
   - Must be relative: Textures\Folder\file_d.dds
   - Not absolute: C:\Textures\file_d.dds
3. Verify textures exist on disk
4. Convert textures to BC1/BC3/BC5 DDS (see GIMP guide)
5. Enable textures: Render → Draw Textures (✓)
```

### Error 3: "Mesh Invisible in Game"

**Symptom:** Mesh loads in NifSkope but not in game

**Causes:**
- Wrong NIF version
- Missing BSTriShape
- Incorrect shader property
- Material path broken

**Solutions:**
```
1. Verify NIF version: 20.2.0.7 for Fallout 4
   - Spells → Blocks → Convert NIF Version
2. Convert to BSTriShape:
   - Spells → Optimize → Optimize for Fallout 4
3. Check material path:
   - BSLightingShaderProperty → Name
   - Should end with .bgsm or .bgem
4. Sanitize: Spells → Sanitize → Sanitize NIF
5. Test with vanilla material first (verify NIF works)
```

### Error 4: "Collision Not Working"

**Symptom:** Objects fall through mesh in-game

**Causes:**
- No collision blocks
- Collision layer wrong
- Collision not assigned to cell

**Solutions:**
```
1. Verify collision exists:
   - Block List: bhkCollisionObject present?
2. Check collision layer:
   - bhkRigidBody → Layer
   - Should be: 1 (Static) for props
3. Verify collision shape:
   - bhkCollisionObject → Body → Shape
   - Must reference valid shape block
4. Regenerate: Spells → Collision → Create Collision
5. In Creation Kit: Mark as "Has Collision" in object properties
```

### Error 5: "Yellow Mesh in NifSkope"

**Symptom:** Mesh renders with yellow tint

**Causes:**
- Missing texture (NifSkope warning color)
- Invalid texture path
- Material not found

**Solutions:**
```
1. Not an error if textures are actually missing
2. Yellow = "This texture doesn't exist"
3. Fix texture paths (see Error 2)
4. Assign material with valid textures
5. Or: Ignore if intentional (template mesh)
```

---

## NifSkope vs Other Tools

### NifSkope vs Blender

| Task | NifSkope | Blender + NIF Plugin |
|------|----------|----------------------|
| **View NIF** | ✅ Instant | ⚠️ Import required |
| **Edit Textures** | ✅ Direct | ⚠️ Via nodes |
| **Edit Geometry** | ❌ Limited | ✅ Full modeling |
| **Edit UVs** | ❌ No | ✅ Full UV editor |
| **Add Collision** | ✅ Easy | ⚠️ Manual setup |
| **Batch Process** | ✅ Built-in | ⚠️ Scripting needed |
| **Rigging** | ⚠️ View only | ✅ Full rigging |
| **Materials** | ✅ Direct BGSM | ⚠️ Export to BGSM |
| **Learning Curve** | ✅ Easy | ❌ Steep |

**Use NifSkope for:**
- Quick inspection
- Texture path fixes
- Collision addition
- Material assignment
- Batch operations
- Final optimization

**Use Blender for:**
- Modeling from scratch
- UV mapping
- Rigging characters
- Animation creation
- High-poly to low-poly
- Texture baking

### NifSkope vs 3DS Max + NIF Plugin

| Feature | NifSkope | 3DS Max |
|---------|----------|---------|
| **Cost** | Free | $1,700+/year |
| **NIF Support** | Native | Plugin required |
| **Modeling** | No | Professional |
| **Animation** | View only | Full suite |
| **Scripting** | Limited | MAXScript |
| **Industry Standard** | No | Yes (AAA) |

**Use 3DS Max if:**
- Professional game dev environment
- Complex animation pipelines
- Need MAXScript automation
- Budget available

**Use NifSkope if:**
- Hobbyist/indie modder
- Quick edits and fixes
- Batch processing
- Free tool preference

---

## Best Practices for NifSkope Workflow

### 1. Always Work on Copies

```
Never edit original NIFs directly:
1. Backup: MyMesh_ORIGINAL.nif
2. Working: MyMesh.nif (edit this)
3. If broken: Restore from backup
```

### 2. Sanitize Before Release

```
Final mod release checklist:
1. Open each NIF in NifSkope
2. Spells → Sanitize → Sanitize NIF
3. Spells → Optimize → Optimize for Fallout 4
4. Save
5. Test in-game
6. Package for release
```

### 3. Use Consistent Naming

```
Texture paths:
✓ Textures\Weapons\MyMod\MyWeapon_d.dds
✗ textures/weapons/mymod/myweapon_d.DDS (case matters!)

Material paths:
✓ Materials\Weapons\MyMod\MyWeapon.bgsm
✗ Materials\Weapons\MyMod\myweapon.BGSM
```

### 4. Test Incrementally

```
Don't wait until mod is complete:
1. Create basic mesh in Blender
2. Export to NIF
3. Open in NifSkope, add material
4. Test in Creation Kit
5. If works, continue development
6. If broken, debug early (easier to fix)
```

### 5. Document Changes

```
Keep a changelog:
MyMod_Changes.txt:
- MyWeapon.nif: Fixed texture paths, added collision
- MyArmor.nif: Optimized poly count, updated materials
- MyProp.nif: Converted to BSTriShape, sanitized

Helps when revisiting mod months later
```

---

## Integration with Fallout 4 Workflow

### NifSkope in the Mod Pipeline

```
1. [Blender] Create 3D model
   ↓
2. [Blender] Export to NIF (Blender NIF Plugin)
   ↓
3. [NifSkope] Open NIF, verify structure ✓
   ↓
4. [NifSkope] Assign material (.bgsm)
   ↓
5. [NifSkope] Add collision
   ↓
6. [NifSkope] Optimize for Fallout 4
   ↓
7. [NifSkope] Sanitize NIF
   ↓
8. [NifSkope] Save final NIF
   ↓
9. [Creation Kit] Import as object
   ↓
10. [Creation Kit] Configure properties
   ↓
11. [Test in game] Verify mesh, textures, collision
   ↓
12. [If issues] → Back to NifSkope, fix, repeat
```

### Quick Fix Workflow

**Scenario: Mesh exports from Blender but textures wrong**

```
1. Open NIF in NifSkope
2. Check BSShaderTextureSet
3. Fix texture paths:
   - Old: C:\Users\Me\Documents\Textures\weapon_d.dds
   - New: Textures\Weapons\MyMod\weapon_d.dds
4. Save NIF
5. Test in game
6. Done! (30 seconds vs re-exporting from Blender)
```

---

## NifSkope Hotkeys (Diva 11)

### File Operations
| Action | Hotkey |
|--------|--------|
| **Open** | Ctrl+O |
| **Save** | Ctrl+S |
| **Reload** | Ctrl+R |
| **Close** | Ctrl+W |

### View Controls
| Action | Hotkey |
|--------|--------|
| **Reset Camera** | Home |
| **Frame Selection** | F |
| **Toggle Textures** | Ctrl+T |
| **Toggle Collision** | Ctrl+K |
| **Toggle Skeleton** | Ctrl+H |
| **Fullscreen 3D View** | F11 |

### Block Operations
| Action | Hotkey |
|--------|--------|
| **Copy Block** | Ctrl+C |
| **Paste Block** | Ctrl+V |
| **Delete Block** | Delete |
| **Duplicate Block** | Ctrl+D |

### Edit Operations
| Action | Hotkey |
|--------|--------|
| **Undo** | Ctrl+Z |
| **Redo** | Ctrl+Y |
| **Find** | Ctrl+F |

### 3D Navigation
| Action | Mouse |
|--------|-------|
| **Rotate** | Left Click + Drag |
| **Pan** | Right Click + Drag |
| **Zoom** | Mouse Wheel |
| **Reset View** | Middle Click |

---

## Troubleshooting NifSkope Diva 11

### Issue: NifSkope Crashes on Startup

**Solutions:**
```
1. Delete settings:
   %APPDATA%\NifSkope\NifSkope.ini
2. Run as administrator
3. Disable GPU acceleration:
   Render → Settings → Use OpenGL: Off
4. Update graphics drivers
5. Re-download from GitHub (file may be corrupted)
```

### Issue: Slow Performance with Complex Meshes

**Solutions:**
```
1. Disable textures: Render → Draw Textures (✗)
2. Disable lighting: Render → Lighting (✗)
3. Reduce anti-aliasing: Render → Settings → MSAA: 2x
4. Close other applications (free RAM)
5. Work on simplified version, apply changes to full mesh later
```

### Issue: Can't See Mesh (Black Screen)

**Solutions:**
```
1. Reset camera: Press Home key
2. Frame selection: Select BSTriShape, press F
3. Check mesh has vertices:
   - BSTriShape → Num Vertices (should be >0)
4. Enable mesh rendering: Render → Draw Meshes (✓)
5. Check scale (might be too small/large)
```

---

## Resources and Further Learning

### Official Resources
- **NifSkope GitHub:** https://github.com/hexabits/nifskope
- **NifTools Documentation:** https://github.com/niftools/nifskope/wiki
- **NifSkope Nexus:** https://www.nexusmods.com/fallout4/mods/50378

### Community Resources
- **Nexus Forums:** Fallout 4 > Mod Talk > Meshes & Models
- **Reddit:** r/FalloutMods (NifSkope questions welcome)
- **YouTube:** Search "NifSkope Fallout 4 tutorial"

### Complementary Tools
- **Blender NIF Plugin:** Export NIFs from Blender
- **Outfit Studio:** Body/armor mesh fitting
- **Material Editor (CK):** Create BGSM/BGEM files
- **SSE NIF Optimizer:** Batch NIF processing (also works for F4)

### Learning Path
1. **Week 1:** Open vanilla NIFs, explore structure
2. **Week 2:** Edit texture paths, assign materials
3. **Week 3:** Add collision, optimize meshes
4. **Week 4:** Create workflow with Blender → NifSkope → CK
5. **Month 2+:** Advanced techniques (spells, batch processing)

---

## Summary

### Key Takeaways:

✅ **NifSkope Diva 11 is the standard** for Fallout 4 modding in 2026  
✅ **Essential for texture/material fixes** - Faster than re-exporting  
✅ **Collision is easy** - Built-in collision generation  
✅ **Optimization is critical** - Always optimize for F4 before release  
✅ **Sanitize before shipping** - Auto-fixes common issues  
✅ **Works with Blender** - Perfect companion tool  
✅ **Free and portable** - No installation, just extract and run  

### When to Use NifSkope:

**Quick Fixes (NifSkope):**
- Texture path corrections
- Material assignment
- Collision addition
- NIF optimization
- Batch processing
- Final sanitization

**Complex Modeling (Blender):**
- Creating meshes from scratch
- UV mapping
- Rigging/skinning
- Animation
- High-detail sculpting

**Best Workflow:**
```
Model in Blender → Export NIF → Fix in NifSkope → Test in CK → Release
```

---

*Last Updated: January 2026*  
*NifSkope Version: 2.0 Development 11 (Diva)*  
*Fallout 4 NIF Version: 20.2.0.7*  
*Supported Platforms: Windows 7/10/11, Experimental Linux*
