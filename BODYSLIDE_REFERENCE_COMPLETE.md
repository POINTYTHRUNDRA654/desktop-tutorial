# BodySlide Complete Reference Material Added

## Overview

Integrated comprehensive official BodySlide reference documentation from GitHub Wiki, including keyboard shortcuts, brushes, tools, weight management, and advanced workflows.

**Date**: January 24, 2026  
**Source**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## New Content Summary

### 1. Keyboard Shortcuts Reference
**Complete shortcut lists for BodySlide and Outfit Studio**

#### BodySlide Shortcuts
- **Building**: CTRL/ALT modifiers for build options
- **Rendering**: W/T/L for wireframe/textures/lighting

#### Outfit Studio Shortcuts
- **Projects**: CTRL+N/O/S for new/load/save
- **Files**: CTRL+E for export
- **Shapes**: Del, F2, G for delete/rename/visibility
- **Sliders**: Tab for properties, CTRL+Wheel for next/previous
- **Brushing**: 0-8 for brush selection, S+Wheel for size
- **Masking**: CTRL+A clear, CTRL+I invert, CTRL+Z/Y undo/redo
- **Editing**: X mirror, C connected, B collision, F transform, Q vertex
- **Rendering**: W/T/L/G for wireframe/textures/lighting/visibility
- **View**: Shift+1/2/3/4/5 for camera angles

---

### 2. Brushes Reference
**Complete brush tool documentation with modifiers**

#### Brush Tools (0-8)
1. **Select Tool (0)**: Click to select shapes
2. **Mask Brush (1)**: Protect areas (ALT to erase)
3. **Inflate Brush (2)**: Push toward camera (ALT to deflate)
4. **Deflate Brush (3)**: Push away from camera
5. **Move Brush (4)**: 2D directional movement
6. **Smooth Brush (5)**: Even out vertices
7. **Weight Brush (6)**: Edit bone weights (blue=weak, red=strong)
8. **Color Brush (7)**: Edit vertex colors
9. **Alpha Brush (8)**: Edit vertex transparency

#### Brush Settings
- **Size**: Circle diameter
- **Strength**: Effect intensity
- **Focus**: Falloff (higher = stronger outer effect)
- **Spacing**: Distance between actions

#### Brush Options
- **X-Mirror (X)**: Mirror across X-axis
- **Edit Connected Only (C)**: Only connected vertices
- **Global Brush Collision (B)**: Affect all vs. last selected

---

### 3. Tools Reference
**Transform and vertex editing tools**

#### Transform Tool (F)
- **Arrows**: Move
- **Circles**: Rotate
- **Cubes**: Scale

#### Vertex Selection (Q)
- Drag to select
- CTRL+Drag to deselect

#### Mesh Editing
- **Collapse Vertex**: Delete vertex (≤3 connections)
- **Flip Edge**: Reverse edge orientation
- **Split Edge**: Add vertex at midpoint

---

### 4. Weight Management
**Detailed bone weight copying and normalization**

#### Weight Copy Options
**How It Works**:
- Each source vertex spreads weights to targets
- Based on search radius
- Limited by max vertex targets
- Averaged across all sources

**Settings**:
- **Search Radius**: Distance influence
- **Max Vertex Targets**: Targets per source

**Result**:
- Maximum 4 bones per vertex
- Weights normalized to sum to 1.0

#### Weight Normalization
**Rules**:
- Bone weights must sum to 1.0 per vertex
- Maximum 4 bones per vertex

**Live Normalization**:
- Normalizes as you paint
- Increasing weight on one bone decreases others
- Prefers adding to bones with existing weight

**Normalized/Locked Bones**:
- Flag bones to control during normalization
- **Mode 1**: No flags = all bones modifiable
- **Mode 2**: Only flagged bones modified

**Special Cases**:
- Unnormalized weights after "Copy Weights"
- Single modifiable bone with zero weight

---

### 5. Updating Projects for New Sliders
**Keep projects current with body mod updates**

#### When to Update
- Reference body adds new sliders
- Body mod major update
- New customization options available

#### Update Process
1. Load existing project
2. Load updated reference
3. Restore extra sliders (use exact same names)
4. Restore slider properties (zap, hidden, defaults)
5. Select new sliders only
6. Conform all
7. Save updated project

**Key Benefit**: Preserves existing slider data, no re-fixing clipping

---

### 6. Packing Projects for Sharing
**Automate project packaging for release**

#### Pack Projects Dialog
**Access**: File → Pack Projects...

**Features**:
- Select multiple projects
- Merge into single .osp file
- Pack to folder or ZIP archive
- Optional group XML merging

**Output Structure**:
```
PackagedProject/
├── SliderSets/PackagedProject.osp
├── ShapeData/PackagedProject/*.osd, *.nif
└── SliderGroups/Groups.xml
```

---

### 7. Making Conversion References (External Tools)
**Advanced method using Blender/3ds Max**

#### When to Use
- Normal Outfit Studio method insufficient
- Need precise mesh wrapping
- Complex body shape differences

#### Process Overview
1. Export both bodies to OBJ
2. Import to 3D software
3. Apply Shrinkwrap modifier
4. Wrap base body around target
5. Export wrapped mesh
6. Create slider from difference
7. Save as conversion reference

**Key Technique**: Shrinkwrap in Blender for accurate morphing

---

### 8. Saving Projects (Detailed)
**Complete save dialog field reference**

#### Essential Fields
- **Display Name**: Name in BodySlide outfit list
- **Output File Name**: Built file name (no extension)
- **Output Data Path**: Location in game data folder
- **Weight Output**: Low/High (Skyrim) vs Single (FO4)
- **Slider Set File**: .osp filename (can contain multiple projects)
- **Shape Data Folder**: Subfolder in ShapeData
- **Shape Data File**: Mesh filename
- **Copy Reference**: Include reference shape in output

#### Tips
- **To Project** button: Auto-fill all fields from display name
- Output paths don't include file extensions
- Skyrim: Don't add _0/_1 suffix (auto-added)
- Multiple projects can share same .osp file

---

### 9. Clearing All Transforms
**Fix meshes appearing wrong in-game**

#### Transform Types
1. Node transforms (NiNode)
2. Static shape transforms (NiTriShape, BSTriShape)
3. Global-to-skin transforms (NiSkinData)
4. Bone transforms (per bone)

#### When Needed
**Symptoms**:
- Mesh aligned in Outfit Studio but wrong in-game
- Invisible when close (out-of-bounds issue)

#### Clearing Process
1. Align in Outfit Studio first
2. Clear global-to-skin: Shape Properties → Coordinates → Set to 0,0,0 and 1.0
3. Check "Recalculate geometry" to prevent movement
4. Use Edit → Reset Transforms (affects all shapes)

---

## Files Modified

### BODYSLIDE_COMPLETE_GUIDE.md
**Added Sections** (800+ lines):
- Updating Projects for New Sliders
- Packing Projects for Sharing
- Making Conversion References (External Tools)
- Keyboard Shortcuts Reference
- Saving Projects (Detailed)
- Weight Copy Options (Detailed)
- Weight Normalization
- Brushes Reference
- Tools Reference
- Clearing All Transforms

**Enhanced**:
- Version history (v1.3)
- Comprehensive reference material

---

### BodyslideGuide.tsx
**New Sections**:
1. ⌨️ Keyboard Shortcuts
   - BodySlide shortcuts (building, rendering)
   - Outfit Studio shortcuts (projects, shapes, brushing, editing)
2. 🖌️ Brushes & Tools
   - 8 brush tools with modifiers
   - Transform and vertex tools
   - Mesh editing tools
   - Brush options (X-Mirror, Edit Connected, Global Collision)

**Features**:
- Grid layouts for easy scanning
- Color-coded shortcuts (green/dark green)
- Modifier key highlights
- Quick reference format

---

### BODYSLIDE_QUICK_START.md
**Added Section**: "Keyboard Shortcuts Cheat Sheet"

**Content**:
- BodySlide essentials (CTRL/ALT + Build, W/T/L)
- Outfit Studio most-used (brushes, masks, tools)
- One-line format for quick lookup

---

## Key Keyboard Shortcuts

### Most Used in BodySlide
| Shortcut | Action |
|----------|--------|
| **CTRL + Click Build** | Build to working directory |
| **ALT + Click Build** | Delete target files |
| **W** | Wireframe mode |

### Most Used in Outfit Studio
| Shortcut | Action |
|----------|--------|
| **0-8** | Select brush |
| **S + Mouse Wheel** | Adjust brush size |
| **CTRL + Z / Y** | Undo / Redo |
| **CTRL + A** | Clear mask |
| **CTRL + I** | Invert mask |
| **X** | Toggle X-Mirror |
| **F** | Transform Tool |
| **Q** | Vertex Selection |
| **Tab** | Slider properties (edit mode) |

---

## Brush Tools Quick Reference

| # | Tool | Purpose | Modifier |
|---|------|---------|----------|
| 1 | Mask | Protect areas | ALT = erase |
| 2 | Inflate | Push toward camera | ALT = deflate |
| 3 | Deflate | Push away | - |
| 4 | Move | 2D directional | - |
| 5 | Smooth | Even vertices | - |
| 6 | Weight | Edit bone weights | ALT = weaken, SHIFT = smooth |
| 7 | Color | Vertex colors | - |
| 8 | Alpha | Vertex transparency | - |

---

## Weight Normalization Rules

**Hard Limits**:
- Bone weights per vertex must sum to **1.0**
- Maximum **4 bones** per vertex

**Live Normalization**:
- Enable "Normalize Weights" checkbox
- Normalizes while painting
- Increasing one bone decreases others
- Prefers adding to bones with existing weight

**Bone Locking**:
- Flag "modify during normalization" to control
- Unflagged bones = locked
- Flagged bones = modifiable

---

## Project Packing Workflow

1. **File → Pack Projects...**
2. Select projects to merge
3. Choose output format (folder or ZIP)
4. Optional: Add group XML
5. Pack Folder or Pack Archive
6. Result: Complete package with folder structure

**Share This**:
- SliderSets/*.osp
- ShapeData/ProjectName/*.osd, *.nif
- SliderGroups/*.xml (if using groups)

---

## Transform Clearing Workflow

### When Meshes Look Wrong In-Game

1. **Verify alignment** in Outfit Studio with clean reference
2. **Clear global-to-skin**:
   - Shape Properties → Coordinates tab
   - Origin/Rotation: 0, 0, 0
   - Scale: 1.0
   - Check "Recalculate geometry"
3. **Reset transforms**: Edit → Reset Transforms

### Why It Works
- Clears accumulated transform errors
- Updates bone transforms
- Recalculates coordinates to match game expectations

---

## Common Brush Modifiers

| Modifier | Effect |
|----------|--------|
| **ALT (Inflate)** | Deflate instead |
| **ALT (Mask)** | Erase mask |
| **SHIFT (Weight)** | Smooth weights |
| **CTRL (any brush)** | Paint mask |
| **CTRL + ALT** | Erase mask |
| **S + Wheel** | Resize brush |

---

## Implementation Status

✅ **Complete Guide**: 9 new reference sections (800+ lines)  
✅ **React Component**: Keyboard shortcuts + brushes sections  
✅ **Quick Start**: Shortcuts cheat sheet  
✅ **Version History**: v1.3 recorded  
✅ **TypeScript**: No compilation errors  

---

## Documentation Quality

**Coverage**:
- ✅ Basic usage (presets, building)
- ✅ Installation (Vortex, MO2, manual)
- ✅ Workflows (conversion, projects, weights, zaps)
- ✅ Keyboard shortcuts (comprehensive)
- ✅ Brushes (all 8 tools)
- ✅ Tools (transform, vertex, mesh editing)
- ✅ Weight management (copying, normalization)
- ✅ Project management (updating, packing, saving)
- ✅ Troubleshooting (transforms, clipping)

**Completeness**: Professional-grade reference documentation

---

## User Benefits

**For All Users**:
- Quick keyboard shortcut lookup
- Brush tool reference at fingertips
- No more searching wiki for shortcuts

**For Outfit Studio Users**:
- Complete brush guide with modifiers
- Transform tool controls
- Mesh editing capabilities

**For Modders**:
- Weight normalization rules
- Project updating workflow
- Packing for release
- External tools integration

**For Advanced Users**:
- Transform clearing for fixes
- Blender integration workflow
- Weight copy fine-tuning
- Professional project management

---

## Learning Path

### Beginner (BodySlide Only)
1. Read Quick Start
2. Learn W/T/L shortcuts for preview
3. Learn CTRL + Build shortcuts

### Intermediate (Basic Outfit Studio)
1. Learn brush shortcuts (0-8)
2. Learn mask shortcuts (CTRL+A, CTRL+I)
3. Learn undo/redo (CTRL+Z/Y)
4. Practice with inflate brush (2)

### Advanced (Full Outfit Studio)
1. Master all brush modifiers
2. Learn weight brush (6) with ALT/SHIFT
3. Use transform tool (F)
4. Practice vertex selection (Q)
5. Learn mesh editing tools

### Expert (Project Creation)
1. Study weight normalization
2. Practice project updating
3. Master packing for release
4. Integrate external tools workflow
5. Clear transforms when needed

---

## Related Documentation

- **BODYSLIDE_COMPLETE_GUIDE.md**: Full reference (1700+ lines)
- **BODYSLIDE_QUICK_START.md**: 5-minute setup (150+ lines)
- **BodyslideGuide.tsx**: Interactive in-app guide
- **BODYSLIDE_WORKFLOWS_ADDED.md**: Workflow documentation
- **Official Wiki**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## Version Info

**Documentation Version**: 1.3  
**Last Updated**: January 24, 2026  
**Status**: Complete  
**TypeScript Errors**: None  
**New Lines Added**: 800+ to complete guide

---

**Reference Material Complete** ✅
