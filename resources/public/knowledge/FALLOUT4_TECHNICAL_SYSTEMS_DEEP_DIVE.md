# Fallout 4 Technical Systems: Deep Dive

## How Everything Actually Works Under the Hood

This guide explains **how Fallout 4's internal systems actually work** at a technical level. Not just what they do, but HOW they do it - file formats, engine behavior, data structures, pipelines, and limitations.

---

## Table of Contents

1. [Precombines & Previs System](#precombines--previs-system)
2. [NIF Mesh Format](#nif-mesh-format)
3. [Material System (BGSM/BGEM)](#material-system-bgsmgbgem)
4. [Animation System (HKX)](#animation-system-hkx)
5. [Texture Format & Compression](#texture-format--compression)
6. [BA2 Archive System](#ba2-archive-system)
7. [Physics & Havok](#physics--havok)
8. [Papyrus Virtual Machine](#papyrus-virtual-machine)
9. [Plugin Record Structure](#plugin-record-structure)
10. [Cell Loading & Streaming](#cell-loading--streaming)
11. [LOD System](#lod-system)
12. [NavMesh Pathfinding](#navmesh-pathfinding)
13. [Sound System](#sound-system)
14. [Rendering Pipeline](#rendering-pipeline)

---

## Precombines & Previs System

### What Are Precombines?

**Precombines** are Bethesda's solution to the "too many static objects" performance problem.

**The Problem**:
- Exterior cells in Fallout 4 can have **thousands of static objects** (buildings, rocks, fences, trash)
- Each object is a separate **draw call** to the GPU
- 1000 objects = 1000 draw calls per frame = unplayable FPS

**The Solution**:
- The Creation Kit **combines multiple static objects** into **single optimized meshes**
- 1000 objects become 10-20 combined meshes
- 1000 draw calls → 20 draw calls = massive performance boost

### How Precombines Work

**Step 1: Mark Objects as "Can Be Combined"**
- Static objects (STAT records) have a flag: `Precombined Mesh`
- Only flagged objects can be precombined
- Power armor, doors, activators, NPCs are **never precombined** (they move/interact)

**Step 2: Creation Kit Generates Precombine Data**
```
1. CK scans all exterior cells
2. Groups nearby static objects by cell
3. Merges geometry into single .NIF meshes
4. Stores meshes in: Data/Meshes/Precombine/
5. Creates PCMB (Precombined Mesh) records in plugin
```

**Step 3: Game Loads Precombined Meshes**
```
- Engine checks cell for PCMB records
- If found, loads combined mesh instead of individuals
- Renders 1 combined mesh with 1 draw call
- Original objects are hidden
```

**File Structure**:
```
Data/
  Meshes/
    Precombine/
      00000D74_OC.NIF        # Combined mesh for cell 00000D74
      00000D74_OC_Far.NIF    # LOD version
      00000D74_References.txt # Debug list of objects
```

### Previsibines (Previs) - Occlusion Culling

**What is Previs?**
- **Visibility data** that tells the engine what cells are visible from any given location
- "Occlusion culling" = don't render what the player can't see

**How Previs Works**:

**Step 1: CK Generates Visibility Data**
```
1. CK traces sightlines from every exterior cell
2. Determines which cells are visible from each position
3. Creates a visibility matrix (Cell A can see Cells B, C, D)
4. Stores in PGRE (Previs Group) records
```

**Step 2: Game Uses Previs for Culling**
```
- Player is in Cell A
- Engine checks PGRE for Cell A
- Loads only visible cells (B, C, D)
- Doesn't load invisible cells (E, F, G)
- Saves memory & CPU time
```

**File Structure**:
```
Data/
  Meshes/
    PreVis/
      00000D74.NIF           # Previs geometry
      00000D74_OC.NIF        # Combined previs + precombine
```

### When Precombines/Previs Break

**Breaking Precombines**:
- **Edit any static object** in a precombined cell
- **Add/delete/move** static objects
- **Change landscape** (LAND records)
- **Result**: Precombine is invalidated, game falls back to individual objects → FPS drops

**Breaking Previs**:
- **Add large objects** that block sightlines
- **Change cell layout** significantly
- **Result**: Engine loads too many cells → memory issues, stuttering, flickering

**Symptoms**:
- FPS drops in specific areas (10-30 FPS instead of 60+)
- Map/Pip-Boy flickering
- Missing objects (precombine loaded but original objects deleted)
- Crashes when entering certain cells

### Fixing Broken Precombines/Previs

**Option 1: Install PRP (Previsibines Repair Pack)**
```
- PRP regenerates vanilla precombines/previs for all DLCs
- Covers broken data from mods
- Install late in load order
- v81+ required for AE/1.11.x (includes CC content)
```

**Option 2: Regenerate in Creation Kit**
```
1. Load all plugins in CK
2. File → Data → Select plugin
3. World → World LODs → Generate LOD
4. Rebuild Precombines & Previs:
   - Modify Cell → All Exterior Cells
   - Right-click → Precombine → Generate Precombine/PreVis Data
5. Wait 1-4 hours (seriously)
6. Save plugin
```

**Option 3: Disable Precombines (NOT RECOMMENDED)**
```ini
# Fallout4Custom.ini
[Display]
bUseCombinedObjects=0
bUsePreCreatedSCOL=0
# Result: Terrible performance, but fixes broken precombines
```

---

## NIF Mesh Format

### What is a NIF File?

**NIF** = NetImmerse File (from Gamebryo engine heritage)
- **Binary 3D model format** used by Bethesda games
- Contains: vertices, triangles, materials, skeleton, collision, animations

### NIF Structure

```
NIF File
├── NiHeader (version, endianness, metadata)
├── NiNode (scene root)
│   ├── NiTriShape (visible mesh geometry)
│   │   ├── BSLightingShaderProperty (material)
│   │   │   └── BSShaderTextureSet (texture paths)
│   │   └── NiTriShapeData (vertices, normals, UVs, triangles)
│   ├── BSEffectShaderProperty (effects like glow)
│   ├── bhkCollisionObject (physics collision)
│   │   └── bhkRigidBody (collision shape)
│   └── NiSkinInstance (skeleton bones for animations)
```

### NIF Blocks (Key Components)

**NiNode** - Scene hierarchy node
```
- Name: "Root"
- Children: [Mesh1, Mesh2, Bones]
- Transform: Position, Rotation, Scale
```

**NiTriShape** - Visible mesh
```
- Name: "Body"
- Shader: BSLightingShaderProperty
- Data: NiTriShapeData (actual geometry)
- Skin: NiSkinInstance (bone weights)
```

**NiTriShapeData** - Geometry data
```
- Vertices: [(x, y, z), ...]
- Normals: [(nx, ny, nz), ...] (for lighting)
- UVs: [(u, v), ...] (texture coordinates)
- Triangles: [(v1, v2, v3), ...] (face indices)
- Colors: [(r, g, b, a), ...] (vertex colors, optional)
```

**BSLightingShaderProperty** - Material settings
```
- Shader Type: Default, Environment Map, Glow, etc.
- Texture Set: Diffuse, Normal, Specular paths
- Flags: Two-Sided, Z-Buffer, Alpha Blend, etc.
- Colors: Emissive, Specular colors
```

**BSShaderTextureSet** - Texture file paths
```
- Diffuse: Textures\MyMod\Armor\Body_d.dds
- Normal: Textures\MyMod\Armor\Body_n.dds
- Specular: Textures\MyMod\Armor\Body_s.dds
- Glow: Textures\MyMod\Armor\Body_g.dds (optional)
- Height: Textures\MyMod\Armor\Body_h.dds (parallax, optional)
- Environment: Textures\MyMod\Armor\Body_e.dds (reflections, optional)
```

### NIF Limits (Fallout 4 Engine)

| Limit | Value | Consequence if Exceeded |
|-------|-------|-------------------------|
| Vertices per mesh | 65,535 | Mesh won't load (NIF uses 16-bit indices) |
| Triangles per mesh | 65,534 | Mesh won't load |
| Bones per skeleton | 80 | Animation breaks, CTD |
| UV coordinates | 0.0 - 1.0 (can wrap) | Texture stretching/tiling |
| File path length | 259 characters | Asset won't load |

**Workarounds**:
- **Split large meshes** into multiple NiTriShapes under one NiNode
- **Reduce polygon count** using decimation (Blender: Decimate modifier)
- **Optimize skeleton** — merge unnecessary bones

### NIF Collision System

**Collision Types**:

1. **bhkCollisionObject** - Main collision container
2. **bhkRigidBody** - Physics properties (mass, friction, restitution)
3. **Collision Shapes**:
   - **bhkBoxShape** - Simple box (fastest)
   - **bhkCapsuleShape** - Pill shape (characters)
   - **bhkConvexVerticesShape** - Convex hull (furniture)
   - **bhkCompressedMeshShape** - Complex mesh (buildings, terrain)

**Collision Layers** (what collides with what):
```
- Static: Buildings, rocks (doesn't move)
- Clutter: Small objects (can be pushed)
- Weapon: Melee weapons (hits enemies)
- Biped: Characters, creatures
- Trees: Vegetation (different friction)
- Debris: Fragments from destruction
```

**How Collision Works**:
```
1. Game loads NIF
2. Finds bhkCollisionObject
3. Extracts collision shape
4. Registers with Havok physics engine
5. Engine tests sphere/ray against shape
6. Returns collision point & normal
```

### NIF Best Practices

1. **Keep triangle count low** - Under 10K tris for most objects
2. **Use 1024x1024 or 2048x2048 textures** - Power of 2 required
3. **Correct normals** - Smooth shading for organic, flat for hard edges
4. **Set collision layer** - Match object type (static/clutter/weapon)
5. **Export from Blender** - Use NIF plugin with FO4 preset
6. **Test in NifSkope** - Verify blocks before importing to game

---

## Material System (BGSM/BGEM)

### What Are BGSM/BGEM Files?

**BGSM** = Bethesda Game Studio Material
**BGEM** = Bethesda Game Effect Material

- **JSON-like text files** that define material properties
- Stored in `Data/Materials/`
- **Replace** the material settings previously embedded in NIFs (Skyrim and earlier)

### BGSM Structure (PBR Materials)

```json
{
  "Version": 1,
  "ShaderModelName": "Materials\\Shaders\\Lighting\\BaseMaterial.bgsm",
  "DiffuseTexture": "Textures\\Actors\\Character\\BaseHumanFemale\\BaseFemaleSkin_d.dds",
  "NormalTexture": "Textures\\Actors\\Character\\BaseHumanFemale\\BaseFemaleSkin_n.dds",
  "SpecularTexture": "Textures\\Actors\\Character\\BaseHumanFemale\\BaseFemaleSkin_s.dds",
  "SpecularPower": 33.0,
  "SpecularColorScale": 1.0,
  "SpecularColor": [1.0, 1.0, 1.0],
  "EmittanceColor": [0.0, 0.0, 0.0],
  "EmittanceEnabled": false,
  "Alpha": 1.0,
  "AlphaBlendMode": 0,
  "AlphaTestRef": 128,
  "Flags": 2147483649,
  "RimLighting": false,
  "RimPower": 2.0
}
```

### BGSM Properties Explained

**Texture Slots**:
- `DiffuseTexture` - Base color/albedo (`_d.dds`)
- `NormalTexture` - Bump map (`_n.dds`)
- `SpecularTexture` - Shininess map (`_s.dds`)
- `GlowTexture` - Emissive glow (`_g.dds`)
- `HeightTexture` - Parallax height (`_h.dds`)
- `EnvironmentTexture` - Cubemap reflections (`_e.dds`)

**Specular Properties** (how shiny the surface is):
- `SpecularPower`: 0-100 (higher = tighter highlights)
  - 10 = matte rubber
  - 33 = skin, leather
  - 80 = polished metal
- `SpecularColorScale`: 0-1 (intensity of reflections)
- `SpecularColor`: RGB (tint of highlights)

**Alpha Properties** (transparency):
- `AlphaBlendMode`:
  - `0` = None (opaque)
  - `1` = Standard (glass, water)
  - `2` = Additive (fire, glow)
  - `3` = Multiplicative (shadows)
- `AlphaTestRef`: 0-255 (cutoff for alpha masking, 128 = 50% threshold)

**Flags** (binary flags for features):
```
Bit 0 (1): ZBuffer Write
Bit 1 (2): ZBuffer Test
Bit 2 (4): Screen Space Reflections
Bit 3 (8): Wetnessmap_Skin
Bit 4 (16): Specular Enabled
Bit 5 (32): Own Emit
Bit 6 (64): Cast Shadows
Bit 7 (128): Receive Shadows
Bit 8 (256): Two Sided
...and more
```

**Common Flag Values**:
- `2147483649` (0x80000001) = Standard opaque material
- `2147483713` (0x80000041) = Two-sided opaque
- `2147483650` (0x80000002) = Alpha blended

### BGEM Structure (Effect Materials)

**Used for**:
- Glowing effects (neon signs, energy weapons)
- Additive blending (fire, magic)
- Multiplicative blending (shadows, decals)

```json
{
  "Version": 1,
  "ShaderModelName": "Materials\\Shaders\\Effects\\EffectMaterial.bgem",
  "BaseTexture": "Textures\\Effects\\Fire01.dds",
  "GrayscaleToPaletteScale": 1.0,
  "BaseColor": [1.0, 1.0, 1.0],
  "BaseColorScale": 1.0,
  "FalloffEnabled": true,
  "FalloffStartAngle": 0.5,
  "FalloffStopAngle": 1.0,
  "BlendMode": 1,
  "EffectLightingEnabled": false
}
```

### How the Engine Uses Materials

**Loading Process**:
```
1. NIF references Material file path
2. Engine loads BGSM/BGEM JSON
3. Parses texture paths
4. Loads textures from BA2 or loose files
5. Compiles shader with material properties
6. Uploads to GPU
7. Binds textures to shader
8. Renders mesh with material
```

**PBR (Physically Based Rendering) Pipeline**:
```
For each pixel:
  1. Sample Diffuse texture → Base Color
  2. Sample Normal texture → Surface Normal
  3. Sample Specular texture → Roughness/Metalness
  4. Calculate lighting (sun, point lights, ambient)
  5. Apply specular reflections (Fresnel, Cook-Torrance)
  6. Add emissive glow (if enabled)
  7. Apply fog/atmospheric effects
  8. Output final pixel color
```

---

## Animation System (HKX)

### What is HKX?

**HKX** = Havok eXtensible format
- **Proprietary binary format** for animations and physics
- Used by: Fallout 4, Skyrim, Dark Souls, Zelda, etc.
- Contains: skeleton bones, keyframes, constraints, IK chains

### HKX Structure

```
HKX File
├── hkaSkeleton (bone hierarchy)
│   ├── Bone Names: ["Root", "Spine1", "Spine2", ...]
│   ├── Parent Indices: [-1, 0, 1, ...] (-1 = root)
│   └── Reference Pose: [Transform1, Transform2, ...]
├── hkaAnimationBinding (links animation to skeleton)
│   └── Bone Mappings: [0→0, 1→1, 2→2, ...]
└── hkaAnimation (keyframe data)
    ├── Duration: 2.5 seconds
    ├── Bone Transforms: [Frame0, Frame1, Frame2, ...]
    └── Blend Hints: Loop, OneShot, Additive
```

### How Animations Work

**Skeleton Setup**:
```
1. Character has NIF with NiSkinInstance
2. NiSkinInstance references skeleton bones
3. Each bone has:
   - Name (must match HKX bone names)
   - Parent bone
   - Bind pose transform
4. Vertices have bone weights (0.0-1.0 per bone)
```

**Animation Playback**:
```
1. Game loads HKX animation
2. Checks hkaAnimationBinding for bone mapping
3. For each frame:
   a. Interpolate between keyframes
   b. Apply transforms to bones
   c. Multiply by bone weights
   d. Transform vertices
   e. Send to GPU
```

**Blending Multiple Animations**:
```
Walk animation (50% weight)
 + Run animation (30% weight)
 + Aim animation (20% weight)
 = Final blended pose
```

### Animation Constraints

**Fallout 4 Animation Limits**:

| Constraint | Value | Reason |
|------------|-------|--------|
| Max bones | 80 | Engine hardcoded limit |
| FPS (gameplay) | 30 FPS | HKX export setting |
| FPS (studio/cutscene) | 60 FPS | High-quality variant |
| Root bone | Must be at origin (0,0,0) | Animation system requirement |
| Bone scale | 1.0 (no scaling) | Engine doesn't support animated scale |
| File size | <5 MB per HKX | Performance/streaming |

**Why 30 FPS for animations?**
- **Smaller file size** (half the keyframes vs 60 FPS)
- **Faster loading** from BA2 archives
- **Good enough** for most gameplay (looks smooth when blended)
- **60 FPS** used only for cinematic close-ups (talking heads, cutscenes)

### Animation Types

**1. Idle Animations** (`_idle.hkx`)
- Character standing, breathing, fidgeting
- Loops seamlessly
- Used in dialogue, menus

**2. Locomotion** (`_walk.hkx`, `_run.hkx`)
- Forward/backward/strafe movement
- Blend tree based on speed & direction
- Root motion (moves character in world)

**3. Actions** (`_attack.hkx`, `_reload.hkx`)
- One-shot animations
- Triggered by player input
- Returns to idle when done

**4. Blended** (`_aim.hkx`, `_turn.hkx`)
- Additive or partial blends
- Layered on top of locomotion
- Example: Aiming rifle while walking

**5. Ragdoll** (`_ragdoll.hkx`)
- Death animations
- Havok physics takes over
- Bones become physics objects

### Creating Animations for FO4

**Export from Blender**:
```
1. Create armature matching FO4 skeleton
2. Animate using keyframes
3. Bake animation to 30 FPS
4. Export using Havok Content Tools:
   - Skeleton: skeleton.nif → skeleton.hkx
   - Animation: anim.fbx → anim.hkx
5. Place in Data/Meshes/Actors/.../Animations/
```

**Havok Content Tools Pipeline**:
```
FBX (Blender export)
  ↓
Havok Filter Manager
  ↓ (Configure: Remove Scale, 30 FPS)
HKX (Fallout 4 format)
```

**Common Animation Issues**:
- **T-pose in game** → Bone names don't match skeleton
- **Jittering** → Keyframes not aligned to 30 FPS grid
- **Floating** → Root bone not at origin
- **Stretching** → Bone scale animated (not supported)

---

## Texture Format & Compression

### DDS Format (DirectDraw Surface)

**DDS** = Microsoft's texture format for DirectX
- **GPU-native** format (uploaded directly to VRAM)
- **Block compression** (DXT1/3/5, BC1-7)
- **Mipmaps** embedded (1024→512→256→128...→1x1)

### DDS Compression Formats

| Format | Bits/Pixel | Alpha | Use Case | Quality |
|--------|-----------|-------|----------|---------|
| **DXT1 / BC1** | 4 bpp | 1-bit (on/off) | Opaque textures, simple alpha | Lowest quality, smallest file |
| **DXT3 / BC2** | 8 bpp | 4-bit explicit | Sharp alpha edges | Medium quality |
| **DXT5 / BC3** | 8 bpp | 8-bit interpolated | Smooth alpha gradients | Best for most textures |
| **BC5** | 8 bpp | No | Normal maps (2-channel) | Best for normals |
| **BC7** | 8 bpp | Yes | High-quality diffuse | Best quality, slow to compress |
| **Uncompressed** | 32 bpp | 8-bit | UI elements, no compression | Largest file size |

### Texture Naming Convention

Fallout 4 uses **suffix system**:

| Suffix | Purpose | Format | Notes |
|--------|---------|--------|-------|
| `_d.dds` | Diffuse/Albedo | DXT1/5 or BC7 | Base color |
| `_n.dds` | Normal map | BC5 or DXT5 | Bump/detail |
| `_s.dds` | Specular/Roughness | DXT1/5 | Shininess |
| `_g.dds` | Glow/Emissive | DXT1/5 | Self-illumination |
| `_h.dds` | Height/Parallax | BC5 or Grayscale | Depth illusion |
| `_e.dds` | Environment/Cubemap | DXT1/5 | Reflections |
| `_m.dds` | Mask/Alpha | DXT5 | Transparency mask |

### How DDS Compression Works

**Block Compression (DXT/BC)**:
```
1. Image is divided into 4x4 pixel blocks
2. Each block stores:
   - 2 colors (16-bit RGB565)
   - 16 indices (2-bit each, pointing to interpolated colors)
3. GPU decompresses blocks on the fly
4. 4:1 or 6:1 compression ratio
```

**Example: DXT5 Block**
```
Block (4x4 pixels = 16 pixels):
  Color0: RGB 255,0,0 (red)
  Color1: RGB 0,0,255 (blue)
  Indices: [0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3]
  Alpha0: 255
  Alpha1: 0
  Alpha Indices: [0,7,7,7,...]
Result: Gradient from red to blue with varying transparency
```

### Normal Map Special Encoding

**DirectX vs OpenGL**:
- **DirectX** (Fallout 4): Green channel is **inverted** (Y down)
- **OpenGL** (Blender default): Green channel is **normal** (Y up)
- **MUST FLIP GREEN CHANNEL** when exporting from Blender

**BC5 Format for Normals**:
```
- Only stores RG channels (XY of normal)
- Blue (Z) is reconstructed: Z = sqrt(1 - X² - Y²)
- Saves space, maintains quality
```

**Creating Normal Maps**:
```
1. Blender: Bake high-poly details to low-poly normal map
2. GIMP: Export as DDS, choose BC5 (or DXT5nm)
3. CRITICAL: Invert green channel for DirectX
4. Enable mipmaps (auto-generated)
5. Save with _n.dds suffix
```

### Mipmaps (Level of Detail)

**What Are Mipmaps?**
- **Pre-calculated smaller versions** of a texture
- `1024x1024 → 512x512 → 256x256 → ... → 1x1`
- **13 levels** for 4096x4096 texture

**Why Mipmaps?**
- **Prevent texture aliasing** (shimmering when distant)
- **Faster rendering** (smaller textures = less VRAM bandwidth)
- **Auto-selected by GPU** based on distance

**Mipmap Chain Example**:
```
Level 0: 1024x1024 (close-up)
Level 1:  512x512  (medium distance)
Level 2:  256x256  (far)
Level 3:  128x128  (very far)
...
Level 10:   1x1    (tiny dot)
```

### Texture Streaming

**How Fallout 4 Loads Textures**:
```
1. Engine determines distance to object
2. Selects appropriate mipmap level
3. Checks if texture is in VRAM
4. If not, streams from BA2 archive
5. Uploads to VRAM
6. Binds to shader
7. Renders object
```

**Texture Budget**:
- **2GB VRAM** = Low settings, 1K textures
- **4GB VRAM** = Medium settings, 2K textures
- **8GB+ VRAM** = High/Ultra settings, 4K textures

### Best Practices

1. **Power of 2 dimensions** — 512, 1024, 2048, 4096 (required by GPU)
2. **Square textures preferred** — 1024x1024 better than 1024x2048
3. **DXT5/BC7 for diffuse** — DXT1 if no alpha needed
4. **BC5 for normal maps** — Best quality-to-size ratio
5. **Always generate mipmaps** — Engine requires them
6. **Flip green channel** for normals when exporting from Blender/GIMP
7. **Test in-game** — Compression artifacts may not show in editor

---

## BA2 Archive System

### What is BA2?

**BA2** = Bethesda Archive v2 (Fallout 4)
- **Container format** for game assets (textures, meshes, sounds)
- **Replaces BSA** (Bethesda Software Archive from Skyrim/FO3)
- **Three types**: General, Textures, Textures (DX10)

### BA2 Structure

```
BA2 File
├── Header
│   ├── Magic: "BTDX" (DX10 textures) or "GNRL" (general)
│   ├── Version: 1
│   ├── File Count: 5432
│   └── Name Table Offset
├── File Entries
│   ├── Entry 1: Hash, Offset, Size, Flags
│   ├── Entry 2: Hash, Offset, Size, Flags
│   └── ...
├── Name Table
│   ├── "Meshes\\Actors\\Character\\..."
│   └── "Textures\\Landscape\\..."
└── File Data (compressed)
```

### BA2 Types

**1. General Archive** (`_Main.ba2`)
- Contains: NIF meshes, materials, scripts, loose files
- Compression: Zlib or LZ4
- Example: `Fallout4 - Meshes.ba2`

**2. Textures Archive** (`_Textures.ba2`)
- Contains: DDS textures (standard formats)
- Compression: Zlib or LZ4
- Example: `Fallout4 - Textures1.ba2`

**3. DX10 Textures Archive** (v7/v8)
- Contains: BC7-compressed textures
- Introduced in **Next-Gen Update (1.10.980)**
- Better compression for high-res textures
- Example: `Fallout4 - Textures9.ba2`

### How the Engine Loads from BA2

**Load Priority**:
```
1. Loose files (Data/ folder)
2. BA2 archives (in Fallout4Custom.ini order)
3. Fallout4.esm embedded assets
```

**Hash Lookup**:
```
1. Engine needs "Meshes/Armor/Leather/Torso.nif"
2. Computes CRC32 hash of path
3. Binary search in BA2 file table
4. Finds offset: 0x12AB4500
5. Seeks to offset, reads compressed data
6. Decompresses (Zlib/LZ4)
7. Returns file data to engine
```

### BA2 Versions

| Version | Game | Texture Format | Compression |
|---------|------|----------------|-------------|
| v1 | Fallout 4 (1.0-1.10.163) | DXT1/3/5, BC5 | Zlib, LZ4 |
| v7 | FO4 Next-Gen (1.10.980+) | + BC7, BC6H | Zlib, LZ4, Oodle |
| v8 | FO4 AE (1.11.x) | + BC7, BC6H | Zlib, LZ4, Oodle |

**Important**: v7/v8 archives **won't load** on pre-NG game versions!

### Creating BA2 Archives

**Using Archive2.exe (Official Tool)**:
```bash
Archive2.exe "MyMod" -c=Fallout4 -p="Data\\" -fo4 -textures
# Creates MyMod - Textures.ba2 from Data/ folder
```

**Flags**:
- `-c=Fallout4` — Fallout 4 mode
- `-fo4` — Use FO4-specific settings
- `-textures` — Texture archive (vs general)
- `-share` — Xbox file sharing format

**Best Practices**:
```
1. Separate Textures and General archives
2. Use LZ4 compression (faster than Zlib)
3. Don't compress already-compressed files (DDS, NIF)
4. Test archive with BA2 Extract to verify integrity
```

### Loose Files vs BA2

**Loose Files** (Data/ folder):
- ✅ Faster iteration (no repack needed)
- ✅ Override BA2 archives
- ❌ Slower loading (OS file system overhead)
- ❌ Mod Organizer 2 handles them poorly at scale

**BA2 Archives**:
- ✅ Faster loading (single file, hash lookup)
- ✅ Better mod management
- ✅ Smaller download size (compressed)
- ❌ Slower iteration (must repack after changes)

**Recommendation**: Loose files for development, BA2 for release.

---

## Physics & Havok

### What is Havok?

**Havok Physics** = Industry-standard physics engine
- Licensed by Bethesda for all games since Oblivion
- Handles: collision, ragdoll, constraints, debris

### How Physics Works in FO4

**Initialization**:
```
1. Game loads NIF with bhkCollisionObject
2. Extracts collision shape (box, capsule, mesh)
3. Creates Havok hkpRigidBody
4. Registers with Havok world
5. Sets physics properties (mass, friction, restitution)
```

**Per-Frame Physics Update**:
```
1. Havok steps simulation (60 Hz, decoupled from FPS)
2. Applies gravity (-9.81 m/s²)
3. Detects collisions (broad phase → narrow phase)
4. Resolves penetrations (separating axis theorem)
5. Applies forces (explosions, hits, springs)
6. Updates rigid body transforms
7. Sends transforms to render thread
8. Render displays updated positions
```

### Collision Layers

```cpp
enum CollisionLayer {
  Unidentified = 0,
  Static = 1,        // Buildings, terrain
  AnimStatic = 2,    // Animated doors
  Transparent = 3,   // Glass
  Clutter = 4,       // Movable small objects
  Weapon = 5,        // Melee weapons
  Projectile = 6,    // Bullets, grenades
  Spell = 7,         // Unused in FO4
  Biped = 8,         // NPCs, player
  Trees = 9,         // Vegetation
  Props = 10,        // Furniture
  Water = 11,        // Water volumes
  Trigger = 12,      // Invisible triggers
  Terrain = 13,      // Landscape
  Trap = 14,         // Mines, traps
  NonCollidable = 15,// No collision
  CloudTrap = 16,    // Gas clouds
  Ground = 17,       // Walkable ground
  Portal = 18,       // Loading zones
  DebrisSmall = 19,  // Small debris
  DebrisLarge = 20,  // Large debris
  AcousticSpace = 21,// Sound reverb zones
  ActorZone = 22,    // NPC spawn zones
  ProjectileZone = 23,// Bullet impact zones
  GasTrap = 24,      // Gas/radiation
  ShellCasing = 25,  // Bullet shells
  TransparentSmall = 26,
  InvisibleWall = 27,// Invisible barriers
  TransparentSmallAnim = 28,
  DeadBip = 29,      // Dead bodies
  CharController = 30,// Character capsule
  AvoidBox = 31,     // AI avoidance
  CollisionBox = 32, // Custom collision
  CameraSphere = 33, // Camera collision
  DoorDetection = 34,// Automatic doors
  ConeProjectile = 35,// Shotgun spread
  Camera = 36,       // Camera
  ItemPicker = 37,   // Item pickup
  LoSPicker = 38,    // Line of sight
  PathPicker = 39,   // Pathfinding
  CustomPicker1 = 40,
  CustomPicker2 = 41,
  SpellExplosion = 42,// Explosions
  DroppingPick = 43, // Dropped items
};
```

### Material Types & Friction

```cpp
Material: Wood
  Friction: 0.6
  Restitution: 0.1 (low bounce)

Material: Metal
  Friction: 0.3
  Restitution: 0.4 (medium bounce)

Material: Ice
  Friction: 0.1 (slippery)
  Restitution: 0.1
```

### Ragdoll System

**When character dies**:
```
1. Game triggers death animation
2. Switches from animation to ragdoll
3. Each bone becomes Havok rigid body
4. Joints become constraints (hinges, ball-socket)
5. Physics takes over
6. Body falls, limbs flail realistically
7. Settles on ground
```

**Dismemberment**:
```
- Specific bones have "severable" flag
- High-damage kill → break constraint
- Limb becomes separate rigid body
- Blood particle effects spawn
- Gore mesh replaces clean joint
```

---

## Papyrus Virtual Machine

### What is Papyrus?

**Papyrus** = Bethesda's scripting language
- **High-level, statically typed** (like Java/C#)
- **Compiled to bytecode** (.psc → .pex)
- **Runs in virtual machine** (sandboxed, safe)

### Papyrus Compilation

```
Source Code (.psc)
  ↓
Papyrus Compiler (PapyrusCompiler.exe)
  ↓
Bytecode (.pex)
  ↓
Loaded by Game
  ↓
Interpreted by VM
```

### How the VM Works

**VM Architecture**:
```
Stack Machine
├── Instruction Pointer (IP)
├── Stack (push/pop operations)
├── Local Variables
├── Object Instances (persisted in save)
└── Native Functions (engine calls)
```

**Example Execution**:
```papyrus
Int result = 10 + 20 * 2
```

**Bytecode**:
```assembly
PUSH 20          ; Stack: [20]
PUSH 2           ; Stack: [20, 2]
IMUL             ; Stack: [40]
PUSH 10          ; Stack: [40, 10]
IADD             ; Stack: [50]
STORE_VAR result ; result = 50, Stack: []
```

### Papyrus Performance

**Speed**:
- **Interpreted**, not compiled to native code
- ~10-100x slower than C++
- **Not suitable for** per-frame logic (use F4SE C++ instead)

**Optimization Tips**:
1. **Cache property lookups** — Don't call `GetOwner()` every frame
2. **Avoid heavy loops** — Use events instead
3. **Minimize `RegisterForUpdate()`** — Expensive to run every frame
4. **Batch operations** — Process arrays in chunks, not one-by-one

### Save Game Persistence

**How Scripts Persist**:
```
1. Script has Properties (variables marked with "Property" keyword)
2. Properties are saved to .ess (save file)
3. On load, VM restores property values
4. Functions are NOT saved (only data)
```

**Save File Bloat**:
- Too many active scripts → large save files (>50MB)
- **Stack dumps** if script bugs out
- Clean saves by removing broken mods

---

## Plugin Record Structure

### ESP/ESM/ESL Format

**Binary structure**:
```
Plugin File
├── TES4 Header
│   ├── Version, Author, Description
│   └── Master Files (dependencies)
├── Group: GMST (Game Settings)
├── Group: KYWD (Keywords)
├── Group: WEAP (Weapons)
│   ├── Record: 0x00012345
│   │   ├── EDID: "MyWeapon"
│   │   ├── FULL: "Custom Rifle"
│   │   ├── DNAM: [Stats...]
│   │   └── MODL: "Meshes/..."
│   └── ...
├── Group: ARMO (Armor)
└── ...
```

### How Records Load

```
1. Engine opens ESP/ESM file
2. Reads TES4 header
3. Checks master files (dependencies)
4. Loads masters first (recursively)
5. Parses groups by type (WEAP, ARMO, NPC_)
6. Resolves FormID references
7. Builds record index (hash table)
8. Ready for game to query
```

This is just the first half - continuing with the rest of the technical systems...

---

## Cell Loading & Streaming

### How Cells Work

**Cell Types**:
- **Interior Cell**: Indoors (Diamond City Market, Vault 111)
- **Exterior Cell**: Outdoors (32x32 unit grid)

**Cell Loading Process**:
```
1. Player approaches cell boundary
2. Engine checks:
   - Is cell in precombine/previs data?
   - What cells are visible from current position?
3. Loads cell data:
   - References (REFR, ACHR)
   - Landscape (LAND)
   - Navmesh (NAVM)
   - Scripts attached to refs
4. Streams assets:
   - NIF meshes
   - DDS textures
   - HKX animations
5. Cell is "active"
6. Unloads cells player moved away from
```

**Grid Loading**:
```
Player at (0,0)
Loads: (-1,-1), (0,-1), (1,-1)
       (-1, 0), (0, 0), (1, 0)
       (-1, 1), (0, 1), (1, 1)
= 3x3 grid = 9 cells active
```

### Persistent vs Temporary References

**Persistent** (always loaded):
- Quest targets
- Unique NPCs
- Player-placed objects

**Temporary** (unload when cell unloads):
- Generic raiders
- Loot containers
- Scenery objects

---

## LOD System

### Level of Detail (LOD)

**Distance-based mesh swapping**:
```
0-512 units:   Full mesh (10K tris)
512-2048:      LOD 1 (2K tris)
2048-8192:     LOD 2 (500 tris)
8192+:         LOD 3 (100 tris, billboard)
```

**Tree LOD**:
- Special system for vegetation
- Billboard sprites for distant trees
- Pre-generated by CK

**Object LOD**:
- Buildings, rocks, large structures
- Generated by CK LOD tool
- Stored in `Meshes/LOD/`

---

## NavMesh Pathfinding

### What is NavMesh?

**Navigation Mesh** = Walkable surface for AI
- **Triangulated mesh** covering ground
- **Edge connections** define where NPCs can walk
- **Cover points** for combat AI

### NavMesh Structure

```
NavMesh
├── Triangles (walkable polygons)
│   ├── Tri 1: [V1, V2, V3]
│   ├── Tri 2: [V2, V4, V5]
│   └── ...
├── Edges (connections between tris)
│   ├── Edge 1: Tri1 → Tri2 (walkable)
│   ├── Edge 2: Tri2 → Tri3 (jump down)
│   └── ...
├── Cover Points (for combat)
│   └── Point 1: Position, Direction, Type
└── Preferred Paths (for specific NPCs)
```

### How Pathfinding Works

**A* Algorithm**:
```
1. NPC wants to go from A to B
2. Finds closest navmesh triangle to A
3. Finds closest navmesh triangle to B
4. Runs A* search:
   - Start at A triangle
   - Expand to neighboring triangles
   - Calculate cost (distance + heuristic)
   - Pick lowest cost path
   - Repeat until B reached
5. Smooths path (removes zigzags)
6. NPC follows path waypoints
```

### NavMesh Issues

**Deleted NavMesh** (most common crash):
```
Symptom: CTD when NPC tries to pathfind
Cause: Mod deleted NAVM records instead of disabling
Fix: xEdit → Change FormID or Undelete script
```

**Broken Edges**:
```
Symptom: NPCs get stuck, can't leave room
Cause: Door connects to navmesh with no edge
Fix: CK → Finalize navmesh for cell
```

---

## Sound System

### XWM Audio Format

**XWM** = Xaudio Wavebank Music
- **Compressed audio** (Xbox ADPCM or XMA2)
- Used for: music, dialogue, effects

**How Sound Plays**:
```
1. Quest/script triggers sound
2. Engine looks up FormID in sound database
3. Loads XWM from BA2
4. Decompresses to PCM
5. Submits to XAudio2 API
6. Plays through speakers
```

### Lip-Sync (FUZ Files)

**FUZ** = Fallout Zip (dialogue package)
```
FUZ File
├── WAV (voice audio)
└── LIP (facial animation keyframes)
```

**How Lip-Sync Works**:
```
1. NPC speaks dialogue line
2. Loads FUZ from BA2
3. Extracts WAV → plays audio
4. Extracts LIP → animates jaw/lips/brows
5. Syncs both together
```

---

## Rendering Pipeline

### Deferred Rendering

**FO4 uses deferred shading**:
```
Pass 1: G-Buffer (Geometry)
  - Render all geometry
  - Output to textures:
    - RT0: Albedo (RGB), Roughness (A)
    - RT1: Normal (XYZ), Metalness (W)
    - RT2: Depth, Stencil
    - RT3: Velocity (motion blur)

Pass 2: Lighting
  - For each light:
    - Read G-Buffer
    - Calculate lighting
    - Accumulate in light buffer

Pass 3: Post-Process
  - Screen-space reflections
  - Ambient occlusion (SSAO)
  - Bloom, tone mapping
  - Motion blur
  - TAA (temporal anti-aliasing)
```

### Draw Calls & Batching

**Why Draw Calls Matter**:
```
1 mesh = 1 draw call = ~0.01ms GPU
1000 meshes = 1000 draw calls = 10ms = 100 FPS max
```

**Optimization: Instancing**:
```
100 identical trees = 1 instanced draw call
Result: 0.01ms instead of 1ms
```

---

**This guide covers the internal workings of ALL major Fallout 4 systems. Mossy now has deep technical knowledge of how every piece of the engine actually functions.**

**See Also**:
- `FALLOUT4_VANILLA_RECORDS_REFERENCE.md` - FormID tables
- `FALLOUT4_MODDING_PATTERNS.md` - Practical workflows
- `FALLOUT4_GAME_SYSTEMS_MECHANICS.md` - High-level systems

---

**Last Updated**: April 2026 (v1.11.x, all technical systems documented)
