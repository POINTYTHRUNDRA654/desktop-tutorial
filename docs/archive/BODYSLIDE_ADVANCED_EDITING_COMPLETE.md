# BodySlide Advanced Editing Documentation Added

## Overview

Integrated advanced Outfit Studio documentation covering shape properties, geometry merging, reference templates, and professional mesh editing techniques.

**Date**: January 24, 2026  
**Source**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## New Content Summary

### 1. Shape Properties (Complete Reference)

**Access**: Double-click shape or Shape → Properties

#### Four Property Tabs

**Shader Tab**:
- Name/Material (BGSM/BGEM paths for FO4)
- Shader type (Default, Environment Map, Face/Skin Tint)
- Specular properties (color, strength, power)
- Emissive properties (color, multiplier)
- Textures dialog (assign texture paths)
- Transparency threshold and alpha properties

**Geometry Tab**:
- **Full Precision**: 4-byte vertex format (FO4 only)
- **Sub Index**: BSTriShape ↔ BSSubIndexTriShape (VATS/dismemberment)
- **Skinned**: Toggle skinning flag, convert static ↔ skinned

**Extra Data Tab**:
- **NiStringExtraData**: Store text values
- **NiIntegerExtraData**: Store number values
- Used by game features and third-party tools

**Coordinates Tab**:
- Global-to-skin transform management
- Clear transforms: Set to 0,0,0 with recalculate checkbox
- FO4 exception: Don't clear (higher precision)

---

### 2. Merging Geometry

**Access**: Shape → Merge Geometry...

**Purpose**: Combine two shapes into one

#### Merge Requirements

Must Match:
- **Partitions**: Amount and slots
- **Segments**: Amount, sub-segments, info, file
- **Shaders**: Same type (or both none)
- **Base Texture**: Same diffuse texture path
- **Alpha Property**: Same flags and threshold
- **Vertex/Triangle Limits**: Result within limits

**Options**:
- Delete source shape (default)
- Keep source shape (experimental merging)

**Benefits**:
- Simplify projects
- Combine outfit parts
- Reduce shape count

---

### 3. Reference Templates

**Purpose**: Quick shortcuts to frequently used conversion references

**Location**: `RefTemplates.xml` or `RefTemplates/` folder

#### Template Definition

**XML Syntax**:
```xml
<RefTemplates>
    <Template sourcefile="SliderSets\CBBE.osp" 
              set="CBBE Body" 
              shape="CBBE">CBBE Body</Template>
</RefTemplates>
```

**Attributes**:
- **sourcefile**: Path to .osp file (relative to BodySlide folder)
- **set**: Project name in .osp file
- **shape**: Mesh name for reference
- **Element text**: Display name in template list

**Hidden Projects**: Store .osp outside SliderSets (e.g., ConversionSets) to hide from BodySlide while keeping in Outfit Studio

---

### 4. Mesh Editing Examples (8 Techniques)

Professional mesh editing workflows from intermediate to advanced level.

#### Example 1: Collapse Vertex with 4+ Connections

**Problem**: Can't collapse vertex with >3 connections

**Solution**:
1. Use Flip Edge to reduce connections to 3
2. Collapse vertex

**Key**: Collapse tool requires ≤3 connections

---

#### Example 2: Close One-Triangle Hole

**Workflow**:
1. Pick corner vertex to collapse (usually highest connection count)
2. Flip Edge 3 times to reduce to 3 connections
3. Collapse Vertex to close hole
4. Split Edge + Flip Edge to restore proper mesh

**Result**: Hole closed, mesh regularized

---

#### Example 3: Create One-Triangle Hole

**Workflow**:
1. Split Edge twice to create center vertex in triangle
2. Flip Edge + Collapse Vertex to remove extra vertex
3. Mask center vertex (small brush)
4. Invert Mask
5. Delete Vertices

**Key**: Must create center vertex before deletion

---

#### Example 4: Regularize Mesh (Fix Texture Distortion)

**Problem**: Irregular mesh causes texture warping

**Workflow**:
1. Collapse Vertex to remove unwanted vertices
2. Reduce to minimum vertices for regular mesh
3. Flip Edges to regularize triangulation
4. Move Tool to arrange vertices in grid
5. Fix UV coordinates in UV editor

**Principle**: Regular mesh = better texture mapping

---

#### Example 5: Cut Lattice Pattern

**Purpose**: Cut multiple holes for lattice texture

**Workflow**:
1. Split Edge to add vertices at hole corners
2. Flip Edges along hole boundaries
3. Adjust UV coordinates first (easier)
4. Adjust space coordinates with Move Tool
5. Add center vertex to each hole (split + flip + collapse)
6. Mask center vertices
7. Invert Mask + Delete Vertices

**Tip**: UV adjustment before space often simpler

---

#### Example 6: Refine Low-Polygon Region

**Problem**: Not enough vertices, rough with sliders

**Workflow**:
1. Split Edge on diagonals (doubles vertices)
2. Split horizontal/vertical edges (doubles again)
3. Flip Edges to shorten long edges
4. Check smoothness with all sliders
5. Adjust slider diffs if needed

**Note**: Split-edge generates reasonable coords but verify slider smoothness

---

#### Example 7: Restore Accidentally-Deleted Surface

**Workflow**:
1. Move boundary vertices to new positions
2. Flip Edges to reduce unwanted vertices to 3 connections
3. Collapse Vertex to remove unwanted
4. Split Edge to add missing internal vertices
5. Flip Edges for regular triangulation
6. Fix UV coordinates
7. Smooth and adjust slider diffs

**Result**: Surface roughly restored (better than total loss)

---

#### Example 8: Smooth by Edge-Flipping

**Problem**: Rough surface despite enough vertices (long thin triangles)

**Solution**:
1. Identify long edges creating indentations
2. Flip Edge to shorten triangle edges
3. Goal: Minimize edge length

**Principle**: Shorter edges = smoother curved surfaces

**Benefit**: Smooth without adding vertices

---

### 5. Video Tutorials Reference

Official community tutorial resources:

**Gopher** - In-depth installation and usage  
**Nightasy/Brain Poof** - Outfit Studio guidance  
**Elianora** - Turning armor into static meshes  
**Brigand231** - Updating body references  

**Find on**: YouTube (search creator name + "BodySlide")

---

## Files Modified

### BODYSLIDE_COMPLETE_GUIDE.md
**Added Sections** (500+ lines):
- Shape Properties (4 tabs detailed)
- Merging Geometry (requirements, options)
- Reference Templates (XML syntax)
- Mesh Editing Examples (8 techniques)
- Video Tutorials (official links)

**Enhanced**:
- Version history (v1.4)
- Professional mesh editing workflows

---

### BodyslideGuide.tsx
**New Section**: "🔬 Advanced Mesh Editing"

**Subsections**:
1. Shape Properties (4 tabs overview)
2. Merging Geometry (requirements)
3. Mesh Editing Techniques (6 common workflows)
4. Reference Templates (XML example)

**Features**:
- Collapsed expandable format
- Step-by-step numbered instructions
- XML syntax highlighting
- Fallout terminal theme

---

## Shape Properties Deep Dive

### Shader Tab Details

| Property | Purpose | Notes |
|----------|---------|-------|
| Name/Material | Shader name or .bgsm/.bgem path | FO4 uses material files |
| Type | Render method | Default, Environment Map, Face/Skin |
| Specular Color | Highlight color | RGB values |
| Specular Strength | Highlight intensity | 0.0 to max |
| Specular Power | Reflectivity | Higher = shinier |
| Emissive Color | Glow color | If enabled in flags |
| Emissive Multiplier | Glow strength | If enabled in flags |
| Textures | Texture slot paths | Opens dialog |
| Threshold | Alpha test value | Transparency cutoff |

**FO4 Material Note**: Values read from .bgsm/.bgem files, not shape properties. Shader type still matters.

**Limitation**: Incomplete—use NifSkope for full shader control

---

### Geometry Tab Details

**Full Precision (FO4 Only)**:
- 4-byte vertex format vs 2-byte
- Use only when absolutely needed
- Increases file size significantly

**Sub Index (FO4 Only)**:
- BSTriShape ↔ BSSubIndexTriShape
- Enables VATS targeting and dismemberment
- Requires segment painting/assignment

**Skinned Toggle**:
- Controls skinning flag
- Unchecking removes all bone data
- Re-checking resets bones (clears all)
- **Use**: Convert skinned → static mesh

---

### Extra Data Use Cases

**NiStringExtraData Examples**:
- Custom game flags
- Third-party plugin data
- Mod metadata

**NiIntegerExtraData Examples**:
- Numeric flags
- Index values
- Configuration integers

**Common Names**:
- PRNT (parent bone)
- ADDT (additional data)
- Custom mod-specific names

---

### Coordinates Tab Workflow

**When to Clear Transforms**:
- Mesh appears in wrong location in-game
- Mesh invisible when close ("out-of-bounds")
- After moving mesh in Outfit Studio

**Clearing Process**:
1. Verify alignment with clean reference
2. Origin: 0, 0, 0
3. Rotation: 0, 0, 0
4. Scale: 1.0
5. ✓ "Recalculate geometry's coordinates so it doesn't move"
6. OK

**FO4 Special Case**:
- Transform not stored in file
- Guessed from bone positions
- "Under-ground" meshes = higher precision
- **Don't clear** unless absolutely necessary

---

## Merge Geometry Checklist

Before attempting merge, verify:

- [ ] Target shape ≠ source shape
- [ ] Partition count matches
- [ ] Partition slots match
- [ ] Segment count matches
- [ ] Sub-segment info matches
- [ ] Segmentation file matches
- [ ] Vertex count within limits after merge
- [ ] Triangle count within limits after merge
- [ ] Both have shader OR both have none
- [ ] Shader type matches (if both have shader)
- [ ] Base/diffuse texture path matches
- [ ] Both have alpha OR both have none
- [ ] Alpha flags match (if both have alpha)
- [ ] Alpha threshold matches (if both have alpha)

**Mismatch Display**: Dialog shows specific mismatches

---

## Reference Template Examples

### Basic Template
```xml
<Template sourcefile="SliderSets\CBBE.osp" 
          set="CBBE Body" 
          shape="CBBE">
  CBBE Body
</Template>
```

### Custom Body Template
```xml
<Template sourcefile="SliderSets\FusionGirl.osp" 
          set="Fusion Girl Body" 
          shape="FusionGirlBody">
  Fusion Girl
</Template>
```

### Hidden Conversion Reference
```xml
<Template sourcefile="ConversionSets\VanillaToCBBE.osp" 
          set="Vanilla to CBBE" 
          shape="VanillaBody">
  Vanilla to CBBE Conversion
</Template>
```

**Location**: Outside SliderSets = hidden from BodySlide users

---

## Mesh Editing Principles

### Triangle Quality
- **Short edges** = smooth curves
- **Long edges** = indentations on curves
- **Regular triangulation** = better texture mapping
- **Irregular triangulation** = texture distortion

### Vertex Management
- **Too few vertices** = rough appearance with sliders
- **Too many vertices** = performance impact
- **Optimal count** = smooth at all slider values

### Edge Operations
- **Flip Edge**: Change triangle orientation
- **Split Edge**: Add vertex, increase detail
- **Collapse Vertex**: Remove vertex (≤3 connections)

### Workflow Pattern
1. Analyze problem
2. Plan vertex changes
3. Use flip/split/collapse systematically
4. Check UV coordinates
5. Verify slider smoothness
6. Adjust as needed

---

## Common Mesh Editing Scenarios

### Scenario: Clipping Through Body
**Diagnosis**: Not enough vertices in problem area  
**Solution**: Use Example 6 workflow (refine low-poly)

### Scenario: Texture Warping
**Diagnosis**: Irregular mesh triangulation  
**Solution**: Use Example 4 workflow (regularize mesh)

### Scenario: Rough Curves
**Diagnosis**: Long thin triangles  
**Solution**: Use Example 8 workflow (flip edges)

### Scenario: Accidental Deletion
**Diagnosis**: Missing surface portion  
**Solution**: Use Example 7 workflow (restore surface)

### Scenario: Need Cutouts
**Diagnosis**: Want to remove sections  
**Solution**: Use Example 3 or 5 workflow (create holes)

---

## Video Tutorial Topics

### Gopher's Guide
- Installation step-by-step
- Basic BodySlide usage
- Understanding presets
- Batch building
- Common troubleshooting

### Nightasy/Brain Poof
- Outfit Studio interface
- Brush techniques
- Slider creation
- Weight painting
- Project workflows

### Elianora
- Converting outfits to static
- Decorative mesh creation
- Placement techniques
- Performance optimization

### Brigand231
- Updating old projects
- New slider compatibility
- Reference updates
- Project migration

**Search Tips**: Use creator name + "BodySlide" or "Outfit Studio"

---

## Implementation Status

✅ **Complete Guide**: 5 new sections (500+ lines)  
✅ **React Component**: Advanced Mesh Editing section  
✅ **Version History**: v1.4 recorded  
✅ **TypeScript**: No compilation errors  
✅ **Documentation**: Professional-grade mesh editing guide  

---

## User Benefits

**For Outfit Studio Beginners**:
- Understand shape properties
- Learn when to use merge
- Know mesh editing basics

**For Intermediate Users**:
- Close holes in meshes
- Create custom cutouts
- Fix texture distortion
- Refine low-poly areas

**For Advanced Users**:
- Professional mesh editing workflows
- Regularize complex meshes
- Optimize topology
- Custom reference templates

**For Mod Authors**:
- Complete shape property reference
- Merge geometry for efficiency
- Create conversion references
- Professional mesh techniques

---

## Learning Path: Mesh Editing

### Level 1: Understanding
- Read shape properties reference
- Understand merge requirements
- Watch Gopher's tutorial

### Level 2: Basic Editing
- Practice Example 1 (collapse vertex)
- Practice Example 2 (close hole)
- Practice Example 3 (create hole)

### Level 3: Intermediate
- Practice Example 4 (regularize mesh)
- Practice Example 5 (lattice pattern)
- Watch Nightasy tutorials

### Level 4: Advanced
- Practice Example 6 (refine low-poly)
- Practice Example 7 (restore surface)
- Practice Example 8 (edge-flipping)

### Level 5: Professional
- Create custom reference templates
- Merge complex geometries
- Optimize mesh topology
- Create conversion references with external tools

---

## Related Documentation

- **BODYSLIDE_COMPLETE_GUIDE.md**: Full reference (2200+ lines)
- **BODYSLIDE_WORKFLOWS_ADDED.md**: Workflow documentation
- **BODYSLIDE_REFERENCE_COMPLETE.md**: Shortcuts and tools reference
- **BodyslideGuide.tsx**: Interactive in-app guide
- **Official Wiki**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## Version Info

**Documentation Version**: 1.4  
**Last Updated**: January 24, 2026  
**Status**: Complete  
**TypeScript Errors**: None  
**New Lines Added**: 500+ to complete guide  
**New Sections**: 5 major sections  

---

**Advanced Editing Documentation Complete** ✅

## Summary

The BodySlide documentation now includes:
- ✅ Basic usage and installation
- ✅ Workflows (conversion, projects, weights, zaps)
- ✅ Keyboard shortcuts (comprehensive)
- ✅ Brushes and tools (all 8 brushes)
- ✅ **Shape properties (4 tabs detailed)**
- ✅ **Merging geometry (requirements and workflow)**
- ✅ **Reference templates (XML syntax)**
- ✅ **Mesh editing examples (8 professional techniques)**
- ✅ **Video tutorials (official community resources)**

This is now a **professional-grade, comprehensive BodySlide and Outfit Studio reference** covering everything from basic installation to advanced mesh topology optimization.
