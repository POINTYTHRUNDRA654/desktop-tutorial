# Blender Modeling Guide

## Introduction

The creation of a 3D scene needs at least three key components: **Models**, **materials**, and **lights**. Modeling is the art and science of creating a surface that either mimics the shape of a real-world object or expresses your imagination of abstract objects.

Blender provides comprehensive tools for creating and editing various types of 3D geometry, from simple meshes to complex surfaces and specialty objects. This guide covers all major modeling types and workflows.

---

## Modes

Depending on the type of object you are trying to model, there are different types of modeling modes. Switching between modes while modeling is common. Some tools may be available in more than one mode while others may be unique to a particular mode.

### Edit Mode

**Edit Mode** is the main mode where modeling takes place. It allows direct manipulation of object geometry.

**Edit Mode Supports:**
- Meshes
- Curves
- Surfaces
- Metaballs
- Text objects
- Lattices

**Key Principles:**
- You can only modify the mesh of objects you are editing
- To modify other objects, leave Edit Mode, select another object, and enter Edit Mode
- Multi-Object Editing allows editing multiple objects simultaneously
- Press **Tab** to toggle Edit Mode

**Edit Mode Basics:**
1. Select object in Object Mode
2. Press **Tab** to enter Edit Mode
3. Edit vertices, edges, or faces
4. Press **Tab** again to return to Object Mode

---

## Meshes

### Introduction

Meshes are the most common type of geometry in Blender. They are composed of vertices, edges, and faces that define the surface of an object.

**Mesh Structure:**
- **Vertices**: Points in 3D space
- **Edges**: Connections between vertices
- **Faces**: Polygons formed by connected edges

### Mesh Structure Details

**Topology:**
The arrangement of vertices, edges, and faces determines the topology of a mesh. Good topology is essential for smooth deformations, especially for character models.

**Topology Best Practices:**
- Quad topology (4-sided faces) for organic models
- Triangles acceptable for hard-surface models
- Avoid n-gons (faces with 5+ sides) for deformation
- Maintain consistent edge flow

**Normals:**
Face normals determine which direction a face is "facing." Proper normals are essential for:
- Correct lighting
- Proper rendering
- Boolean operations
- Normal maps

**Recalculate Normals:**
1. Enter Edit Mode
2. Select all (A)
3. Mesh → Normals → Recalculate Outside (Shift+N)

### Primitives

Primitives are basic shapes that serve as starting points for modeling.

**Available Primitives:**

| Primitive | Uses |
|-----------|------|
| **Cube** | Buildings, boxes, architecture |
| **UV Sphere** | Planets, balls, organic bases |
| **Icosphere** | Better geometry distribution than UV sphere |
| **Cylinder** | Pipes, columns, cups |
| **Cone** | Hats, traffic cones, trees |
| **Torus** | Donuts, rings, wheels |
| **Plane** | Floors, walls, terrain base |
| **Grid** | Subdivided planes for deformation |
| **Monkey** | Suzanne - Blender's mascot, testing |

**Adding Primitives:**
1. Object Mode or Edit Mode
2. **Shift+A** → Mesh → [Primitive Type]
3. Adjust parameters if needed
4. Confirm with **Enter**

**Primitive Properties (On Creation):**
- Size/Radius
- Segments/Vertices count
- Location
- Rotation

### Modeling Tools

#### Selection

**Selection Modes:**
- **Vertex Mode** (1 key): Select individual vertices
- **Edge Mode** (2 key): Select edges
- **Face Mode** (3 key): Select faces

**Selection Tools:**

| Method | Hotkey | Function |
|--------|--------|----------|
| **Box Select** | B | Select within rectangle |
| **Circle Select** | C | Paint selection with brush |
| **Lasso Select** | Ctrl+Alt+Click+Drag | Free-form selection |
| **Alt+Click** | Alt+Click on edge | Select entire edge loop |
| **Ctrl+Alt+Click** | Ctrl+Alt+Click on face | Select entire face loop |
| **All** | A | Select/deselect all |
| **Linked** | Ctrl+L | Select connected geometry |
| **By Type** | Shift+O | Select by similarity |
| **Invert** | Ctrl+I | Invert selection |

#### Basic Editing Tools

| Tool | Hotkey | Purpose |
|------|--------|---------|
| **Extrude** | E | Pull faces/edges/vertices outward |
| **Bevel** | Ctrl+B | Chamfer edges |
| **Inset** | I | Create inner faces |
| **Loop Cut** | Ctrl+R | Add edge loops for topology |
| **Knife** | K | Cut custom geometry |
| **Subdivide** | Right-click → Subdivide | Divide faces |
| **Scale** | S | Resize geometry |
| **Move** | G | Translate geometry |
| **Rotate** | R | Rotate geometry |
| **Mirror** | Ctrl+M | Mirror across axis |

#### Advanced Modeling Operations

**Boolean Operations:**
1. Select object to cut/modify
2. Add modifier: Modifier → Boolean
3. Choose Object and Operation:
   - **Union**: Combine shapes
   - **Difference**: Cut one shape from another
   - **Intersection**: Keep only overlapping area
4. Apply modifier when satisfied

**Proportional Editing:**
- Press **O** to toggle
- Scroll mouse wheel to adjust falloff
- Hold **Shift** for inverse falloff
- Useful for organic sculpting

**Merge:**
- Select vertices
- Alt+M → Merge
- Options: At First, At Last, At Center, Collapse, Merge by Distance

**Dissolve:**
- Remove geometry while maintaining shape
- Select edges/vertices
- Press X → Dissolve Vertices/Edges
- Useful for topology cleanup

### UV Mapping

UV mapping unwraps 3D geometry into 2D space for texture application.

**UV Workflow:**
1. Enter Edit Mode
2. Select all (A) or UV island
3. Press **U** → Choose unwrap method
4. Open UV Editor to view/adjust UVs
5. Pack UVs efficiently
6. Apply textures based on UV layout

**Unwrap Methods:**
- **Unwrap**: Smart unwrapping respecting seams
- **Smart UV Project**: Automatic projection
- **Lightmap Pack**: Efficient packing for baking
- **Aspect Ratio**: Maintain aspect of UVs

**Seams:**
- Mark where model should "cut" for unwrapping
- Press **Ctrl+E** in Edit Mode → Mark Seam
- View in Edit Mode with orange lines
- Essential for quality UV layout

### Mesh Analysis

Tools to analyze and repair mesh quality.

**Mesh Analysis Features:**

| Feature | Purpose |
|---------|---------|
| **Face Orientation** | Visualize normal direction (blue/red) |
| **Wireframe Shading** | View topology structure |
| **Non-Manifold** | Find broken topology |
| **Statistics** | Vertex/edge/face/tri counts |
| **Thickness** | Check if mesh has proper thickness |

**Cleanup Tools:**
1. **Merge by Distance**: Remove duplicate vertices
   - Select all (A)
   - Right-click → Merge by Distance
2. **Degenerate Dissolve**: Remove zero-area faces
   - Edit → Degenerate Dissolve
3. **Clean Geometry**: General mesh cleanup
   - Modifier → Clean Geometry

### Remeshing

Tools to restructure mesh geometry.

**Remesh Types:**

| Method | Best For | Result |
|--------|----------|--------|
| **Voxel** | Sculpts, organic shapes | Uniform grid structure |
| **Blocks** | Architectural, hard surface | Blocky geometry |
| **Smooth** | Smooth surfaces | Clean geometry |
| **Experimental** | Advanced remeshing | Highest quality |

**Using Remesh Modifier:**
1. Add Modifier → Remesh
2. Set voxel size (smaller = more detail)
3. Toggle visibility/apply as needed
4. Use for decimation or topology restructuring

---

## Curves

### Introduction

Curves are parametric surfaces defined by mathematical functions. They are ideal for smooth, flowing shapes like tubes, letters, and ornaments.

**Curve Advantages:**
- Smooth and infinitely scalable
- Easy to edit with minimal control points
- Perfect for text, logos, and smooth paths
- Can be converted to meshes
- Lower computational cost than detailed meshes

**Curve Types:**
- **Bezier Curves**: Smooth control point curves
- **B-Splines**: Smooth interpolating curves
- **NURBS**: Advanced smooth curves
- **Polylines**: Connected straight segments

### Curve Structure

**Control Points:**
- Define the curve shape
- Move to edit curve
- Display as orange dots in Edit Mode
- Connected by curve segments

**Handles:**
- Control point tangents (direction of curve)
- Two per control point (left and right)
- Adjust curve smoothness
- Types: Free, Aligned, Vector, Auto

**Segments:**
- Sections between control points
- Resolution determines smoothness
- Adjustable per curve

### Curve Primitives

**Available Curve Primitives:**

| Primitive | Use |
|-----------|-----|
| **Bezier** | Smooth custom curves |
| **Circle** | Perfect circles |
| **Nurbs Circle** | Alternative smooth circle |
| **Path** | Straight line segments |
| **Spiral** | Helical shapes |

**Adding Curves:**
1. **Shift+A** → Curve → [Curve Type]
2. Or use pencil tool in Edit Mode
3. Click to add control points

### Curve Editing Tools

| Tool | Hotkey | Purpose |
|------|--------|---------|
| **Extrude** | E | Extend curve |
| **Add Point** | Click in Edit Mode | Insert control point |
| **Toggle Cyclic** | Alt+C | Make curve closed loop |
| **Set Handle Type** | V | Change handle behavior |
| **Delete** | X | Remove points/segments |
| **Subdivide** | Right-click → Subdivide | Split segments |

### Curve Properties

| Property | Effect |
|----------|--------|
| **Resolution** | Higher = smoother curve (computational cost) |
| **Fill** | Enable/disable fill for closed curves |
| **Bevel Depth** | Add thickness to curves |
| **Bevel Resolution** | Quality of bevel |
| **Tilt** | Twist curve along length |
| **Radius** | Scale curve cross-section along length |

---

## Surfaces

### Introduction

Surfaces are parametric objects that fill 2D space to create smooth 3D geometry. They are ideal for creating complex organic forms and architectural elements.

**Surface Types:**
- **Bezier Surface**: Control point-based surfaces
- **NURBS Surface**: Advanced smooth surfaces

### Surface Structure

**Control Grid:**
- 2D grid of control points
- Each point influences nearby surface area
- Edit individually or as groups
- Visible as orange dots in Edit Mode

**Resolution:**
- U and V resolution for smoothness
- Higher resolution = smoother but slower
- Adjustable in properties

### Surface Primitives

**Available Surface Primitives:**

| Primitive | Use |
|-----------|-----|
| **Bezier Surface** | Smooth custom surfaces |
| **NURBS Surface** | Advanced smooth surfaces |
| **Grid** | Subdivided planar surface |

### Surface Editing

**Basic Editing:**
1. Enter Edit Mode (Tab)
2. Select control points
3. Move to adjust surface shape
4. Use same tools as curves (extrude, subdivide, etc.)

**Common Operations:**
- **Add Edge**: Insert U or V lines
- **Extrude**: Extend surface
- **Merge Surface**: Join surfaces together
- **Convert to Mesh**: Convert to mesh for further editing

---

## Metaballs

### Introduction

Metaballs (meta-elements) are "blobby" objects that merge together smoothly. They are ideal for organic shapes, liquid effects, and soft bodies.

**Metaball Characteristics:**
- Smooth implicit surfaces
- Blend together naturally
- Good for quick organic shapes
- Can be converted to meshes
- Lower resolution objects

### Metaball Primitives

**Available Metaball Types:**

| Type | Behavior |
|------|----------|
| **Ball** | Standard sphere-like metaball |
| **Capsule** | Elongated between two points |
| **Plane** | Flat surface |
| **Ellipsoid** | Stretched ball |
| **Cube** | Box-like shape |

### Metaball Editing

**Properties:**
- **Influence Radius**: Size of metaball's effect
- **Stiffness**: How sharp blending is
- **Hide**: Toggle visibility

**Editing Tools:**
1. Select metaball
2. Transform (move, scale, rotate)
3. Adjust influence radius
4. Other metaballs automatically merge

### Metaball Resolution

**Resolution Settings:**
- **Resolution**: Overall smoothness
- **Threshold**: Sensitivity of blending
- Higher values = smoother but slower render

---

## Text Objects

### Introduction

Text objects in Blender create 3D typography that can be modeled, animated, and rendered.

### Text Creation

**Creating Text:**
1. **Shift+A** → Text
2. Click in viewport to place
3. Type in Edit Mode
4. Press Tab to exit edit

**Editing Text:**
1. Tab to enter Edit Mode
2. Select all (A) or specific characters
3. Edit text or apply materials
4. Common shortcuts work (Ctrl+A to select all, Ctrl+X/C/V)

### Text Properties

| Property | Effect |
|----------|--------|
| **Font** | Select typeface |
| **Size** | Text size |
| **Extrude** | Add thickness (3D depth) |
| **Bevel Depth** | Rounded edges on text |
| **Bevel Resolution** | Quality of beveled edges |
| **Character Spacing** | Distance between letters |
| **Word Spacing** | Distance between words |
| **Line Spacing** | Distance between lines |
| **Alignment** | Left, center, right, justify |
| **Text Orientation** | Horizontal or vertical |

### Text Editing

**Text Object Workflow:**
1. Create text object
2. Tab to enter Edit Mode
3. Select/edit text
4. Adjust properties in data tab
5. Convert to mesh (Ctrl+Alt+C) for further modeling
6. Apply materials and textures

---

## Point Clouds

### Introduction

Point clouds are collections of points in 3D space. They are useful for:
- Particle systems
- Crowd simulations
- Point-based rendering
- Data visualization

### Point Cloud Tools

**Creating Point Clouds:**
1. **Shift+A** → Point Cloud → Point Cloud
2. Or import from external source
3. Use particle systems
4. Use geometry nodes for generation

**Point Cloud Properties:**
- Individual point size
- Point color
- Visibility
- Renderability

---

## Volumes

### Introduction

Volumes are 3D grids representing density fields. They are used for:
- Smoke/fire simulations
- Fog and mist effects
- Volumetric rendering
- Simulation data

### Volume Properties

| Property | Effect |
|----------|--------|
| **Grids** | List of volumetric data |
| **Density** | Opacity of volume |
| **Color** | Volume coloration |
| **Flame Height** | Fire simulation color |
| **Flame Strength** | Fire intensity |

**Volume Object Use:**
- Primarily generated by simulations
- Bake simulations to volumes for faster rendering
- Visualize and render fluid dynamics

---

## Empties

### Introduction

Empties are invisible objects used for:
- Control objects for parenting/constraints
- Placeholder objects
- Instancing bases
- Animation controls
- Organizational purposes

### Empty Primitives

**Available Empty Types:**

| Type | Use |
|------|-----|
| **Plain Axes** | Simple control object |
| **Cube** | Wireframe cube |
| **Circle** | Wireframe circle |
| **Sphere** | Wireframe sphere |
| **Cone** | Wireframe cone |
| **Image** | Display image in viewport |

**Adding Empties:**
1. **Shift+A** → Empty → [Type]
2. Place in scene
3. Use as control object or parent

### Empty Usage

**Common Workflows:**
- **Parenting Control**: Parent multiple objects to single empty
- **Animation Target**: Animate empty for coordinated motion
- **Collection Instancer**: Use as instancing base
- **Constraint Target**: Use as target for constraints
- **Camera/Light Control**: Control with empty parent

---

## Modifiers

### Introduction

Modifiers are non-destructive effects that change object geometry or appearance. They can be applied in any order and toggled on/off.

**Modifier Principles:**
- Non-destructive (original geometry preserved)
- Stackable (apply multiple modifiers)
- Real-time preview in viewport
- Can be baked for final render
- Order matters (modifier stack execution)

### Common Modifier Categories

**Deforming Modifiers:**
- Armature
- Lattice
- Curve
- Shrinkwrap
- Smooth
- Displace

**Generating Modifiers:**
- Array
- Mirror
- Bevel
- Extrude
- Solidify
- Boolean

**Physics Modifiers:**
- Cloth
- Collision
- Fluid
- Smoke
- Soft Body

**Simulation Modifiers:**
- Remesh
- Ocean
- Decimate

### Using Modifiers

**Adding Modifiers:**
1. Select object
2. Properties → Modifier Properties (wrench icon)
3. Click "Add Modifier"
4. Select modifier type
5. Adjust settings

**Modifier Operations:**
- **Eye Icon**: Toggle visibility in viewport
- **Camera Icon**: Exclude from render
- **Arrow**: Duplicate modifier
- **X**: Delete modifier
- **Apply**: Make permanent
- **Reorder**: Drag to change order

### Modifier Best Practices

- Apply modifiers when finalized
- Test render before applying
- Keep modifiable copies before applying
- Order modifiers for optimal effect
- Combine modifiers for complex effects

---

## Geometry Nodes

### Introduction

Geometry Nodes allow procedural modeling through node-based workflows. Create complex geometry, instances, and animations procedurally.

**Geometry Nodes Features:**
- Non-destructive procedural generation
- Real-time preview
- Reusable node groups
- Parameter exposure for control
- Integration with all object types

### Geometry Nodes Workflow

**Setting Up Geometry Nodes:**
1. Select object
2. Modifier Properties
3. Add Modifier → Geometry Nodes
4. Click "New" to create node setup
5. Add nodes to control geometry

**Common Node Categories:**
- **Input**: Receive object/scene data
- **Output**: Final result
- **Geometry**: Create/modify geometry
- **Instances**: Create instances
- **Curve**: Curve operations
- **Mesh**: Mesh operations
- **Attribute**: Work with data

### Node-Based Workflow

**Creating Procedural Effects:**
1. Start with input geometry
2. Add transformation nodes
3. Use instance nodes for duplication
4. Control with input parameters
5. Connect to output
6. Preview in viewport
7. Adjust node parameters in real-time

---

## Transform Tools

### Introduction

Transform tools modify object position, rotation, and scale in 3D space.

### Transform Types

**Standard Transforms:**

| Transform | Hotkey | Effect |
|-----------|--------|--------|
| **Move** | G | Reposition object |
| **Rotate** | R | Change orientation |
| **Scale** | S | Change size |
| **Shear** | Shift+Ctrl+Alt+S | Skew geometry |

**Axis Constraint:**
- **X**: Constrain to X-axis
- **Y**: Constrain to Y-axis
- **Z**: Constrain to Z-axis
- **Shift+X/Y/Z**: Constrain to plane

**Numeric Input:**
1. Press transform key (G/R/S)
2. Type number
3. Press Enter to confirm
4. Type axis letter to constrain

**Transform Pivot Points:**
- **3D Cursor**: Rotate/scale around cursor
- **Bounding Box Center**: Use object bounds center
- **Individual Origins**: Each object at own center
- **Active Element**: Use selected element position
- **Median Point**: Average of selected points

### Transform Modal Shortcuts

| Shortcut | Action |
|----------|--------|
| **X/Y/Z** | Lock to axis |
| **Shift+X/Y/Z** | Lock to plane |
| **Tab** | Toggle proportional editing |
| **O** | Toggle proportional editing magnitude |
| **M** | Open transform menu |
| **Ctrl** | Snap to grid/increment |
| **Shift** | Fine-tune movement |

---

## Modeling Workflow Summary

**Basic Modeling Process:**
1. **Plan**: Sketch concept, gather references
2. **Primitives**: Start with basic shapes
3. **Rough In**: Block out major forms
4. **Detail**: Add edge loops, refine shapes
5. **Polish**: Bevel, smooth, optimize
6. **Texture**: Apply materials and textures
7. **Render**: Final visualization

**Optimization Tips:**
- Use appropriate topology for deformation
- Keep polygon count reasonable
- Merge/delete unnecessary geometry
- Use modifiers for non-destructive editing
- Test frequently in rendered view
- Keep backup before major changes

**Common Model Types:**

**Organic Models (Characters, creatures):**
- Quad topology
- Good edge flow
- Clean topology for deformation
- Proportional editing for sculpting feel

**Hard Surface Models (Buildings, machines):**
- Can use tris, quads, n-gons
- Sharp edges and corners
- Boolean operations for construction
- Material variations for detail

**Architectural Models:**
- Modular design
- Instance arrays for repetition
- Clear separation of components
- Material-based detail

---

## Related Documentation

- **Sculpting**: High-poly organic modeling with brushes
- **Materials**: Surface appearance and texturing
- **Rendering**: Visualization and final output
- **Animation**: Moving and deforming objects
- **UV Mapping**: Texture coordinate assignment
- **Rigging**: Skeleton setup for deformation

---

## Quick Reference

### Essential Hotkeys

| Action | Hotkey |
|--------|--------|
| Toggle Edit Mode | Tab |
| Select All | A |
| Deselect All | Alt+A |
| Box Select | B |
| Circle Select | C |
| Extrude | E |
| Bevel | Ctrl+B |
| Inset | I |
| Loop Cut | Ctrl+R |
| Knife | K |
| Move | G |
| Rotate | R |
| Scale | S |
| Mirror | Ctrl+M |
| Proportional Edit | O |
| Apply Modifier | Ctrl+Shift+A |
| Mark Seam (UV) | Ctrl+E |
| Unwrap (UV) | U |

### Selection Modes
- **Vertex Mode**: 1
- **Edge Mode**: 2
- **Face Mode**: 3

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Shading appears wrong | Recalculate normals (Shift+N) |
| Modifier not visible | Check visibility toggle (eye icon) |
| Text not rendering | Check that text is not hidden in render settings |
| Curves won't smooth | Increase resolution or change handle types |
| Mesh appears dark | Check normal direction and face orientation |
| Performance issues | Decimate mesh, reduce modifier resolution |

---

## Conclusion

Blender's modeling toolkit is comprehensive and flexible. The combination of primitives, modifiers, geometry nodes, and manual editing tools allows creation of anything from simple objects to complex scenes. Master the fundamentals, practice regularly, and explore the advanced tools for professional-quality 3D models.

