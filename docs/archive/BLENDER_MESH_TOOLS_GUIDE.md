# Blender Mesh Tools and Plane Guide

## Mesh Plane Operator

### Overview

The **Mesh Plane** operator automates the process of creating a plane, sizing it to match the aspect ratio of a selected image, and applying a material with the image as a texture. The plane, material, and texture are named based on the image filename.

**Access:**
- 3D Viewport → Add → Image → Mesh Plane
- **Shift+A** → Mesh → Plane (for standard plane)

### Supported Import Types

**Single Image:**
Creates one plane with the image applied as a texture.

**Multiple Images:**
Generates multiple planes, either stacked or spaced apart.

**Image Sequence/Movie Clip:**
Creates a single plane with the animated sequence applied automatically.

---

## Mesh Plane Properties

### Options

#### Relative Paths

**Purpose:**
Stores the image file path relative to the currently open .blend file.

**Benefits:**
- Portable projects (files work on different drives/computers)
- Easy project archiving
- Non-absolute paths safer for sharing

**See Also:**
Relative Paths documentation for detailed information.

#### Force Reload

**Purpose:**
Reloads the image file if it already exists as an image data-block.

**Use Cases:**
- Image file updated externally
- Refresh cached image
- Replace outdated texture

### Material Settings

A material is automatically created for the plane to display the imported image.

#### Shader Type

**Principled BSDF:**
- Standard PBR shader
- Imported image linked to Base Color input
- Supports all advanced lighting features
- Recommended for most uses

**Shadeless:**
- Does not respond to lighting
- Uses mix of Diffuse and Emission shaders
- Controlled by Light Path node
- Useful for UI elements, backplates

**Emission:**
- Similar to Principled
- Image texture linked to Emission input (not Base Color)
- Creates self-illuminating surfaces
- Good for light maps, screen displays

#### Emission Strength

**Purpose:**
Adjusts intensity of emitted light.

**Range:**
- 0 = No emission
- 1.0 = Standard emission
- 2.0+ = Intense glow

**Uses:**
- Screen/monitor materials
- Light fixtures
- Neon effects

### Render Method

Controls blending and feature compatibility.

#### Dithered (Deferred Rendering)

**Characteristics:**
- Allows grayscale hashed transparency
- Compatible with render passes
- Compatible with raytracing
- Renders in layers

**Transmission Behavior:**
- Each layer transmits light from previous layers only
- If no intersection with layers below, falls back to light probes
- More physically accurate

**Best For:**
- Complex transparency
- Raytraced scenes
- Professional rendering

#### Blended (Forward Rendering)

**Characteristics:**
- Allows colored transparency
- Incompatible with render passes
- Incompatible with raytracing
- Simpler computation

**Best For:**
- Real-time preview
- Simple transparent objects
- Quick feedback

### Transparency Options

#### Show Backface

**Purpose:**
Displays the backface of transparent areas.

**Uses:**
- Viewing inside transparent objects
- Debugging transparency
- Double-sided materials

#### Backface Culling

**Purpose:**
Hides the plane's backface.

**Effect:**
- Removes back surface from visibility
- Saves render computation
- Necessary for single-sided planes

### Material Overwriting

#### Overwrite Material

**Default Behavior:**
If imported image shares name with existing material, Blender appends number to differentiate.

**When Enabled:**
New material overwrites existing one.

**Use Cases:**
- Replace outdated material
- Consolidate duplicate materials
- Simplify material list

### Texture Properties

#### Interpolation

**Purpose:**
Defines how image is scaled when displayed on plane.

**Interpolation Types:**

| Type | Result | Use |
|------|--------|-----|
| **Linear** | Smooth scaling | Photos, natural images |
| **Closest** | Pixelated, sharp edges | Pixel art, UI elements |
| **Cubic** | High-quality interpolation | Professional rendering |
| **Smart** | Adaptive interpolation | Mixed content |

#### Extension

**Purpose:**
Determines how image extrapolated beyond original boundaries.

**Extension Modes:**

| Mode | Behavior | Use |
|------|----------|-----|
| **Clip** | Shows transparency beyond edges | Normal maps, overlays |
| **Extend** | Repeats edge pixels | Seamless backgrounds |
| **Repeat** | Tiles image across plane | Pattern surfaces |
| **Mirror** | Reflects image at edges | Symmetrical textures |

#### Alpha Channel

**Purpose:**
Enables transparency using image's alpha channel.

**Requirements:**
- Image must have alpha channel (PNG, TIFF, etc.)
- Alpha mode set to Straight or Premultiplied
- Compatible render method

**Uses:**
- Transparent overlays
- Cutout textures
- Complex shapes

#### Auto Refresh

**Purpose:**
Automatically updates images in viewport when frame changes.

**Use Cases:**
- Image sequences
- Movie clips
- Animated textures
- Real-time footage preview

---

## Transform Settings

Imported planes are positioned at the 3D Cursor's location.

### Size Mode

Determines how plane's size is set.

#### Absolute Size

**Method:**
Height defined explicitly, width adjusted for aspect ratio.

**Example:**
800 × 600 pixel image with height of 1 m = 1.33 m width

**Parameters:**

| Parameter | Effect |
|-----------|--------|
| **Height** | Sets explicit plane height |

**Use Case:**
When you know exact physical dimensions needed.

#### Scale to Camera Frame

**Purpose:**
Plane sized relative to active camera.

**Scale Methods:**

**Fit:**
- Scales plane inside camera frame
- Preserves aspect ratio
- Shows entire plane in camera view
- No cropping

**Fill:**
- Scales plane to fill entire frame
- Preserves aspect ratio
- Crops parts outside frame
- Covers full viewport

**Use Case:**
When plane should match camera view exactly.

#### Pixels per Inch (DPI)

**Method:**
Uses Definition value in pixels per inch.

**Example:**
600 DPI, 800 × 600 px image = ~0.0339 × 0.0254 m

**Parameters:**

| Parameter | Effect |
|-----------|--------|
| **Definition** | Pixels per inch setting |

**Use Case:**
Print media, precise physical dimensions.

#### Pixels per Blender Unit

**Method:**
Uses Definition to define pixels per Blender Unit.

**Example:**
600 pixels per BU, 800 × 600 px image = 1.33 × 1 BU

**Parameters:**

| Parameter | Effect |
|-----------|--------|
| **Definition** | Pixels per Blender Unit |

**Use Case:**
Game engines, pixel-perfect layouts.

### Alignment

#### Axis Alignment

**Available Directions:**
- Z- (Down)
- Y-
- X-
- Z+ (Up)
- Y+
- X+

**Effect:**
Rotates plane to align with selected axis.

**Common Uses:**
- Z+ for floor/ceiling
- X+ for walls
- Y+ for side panels

#### Face Camera

**Purpose:**
Directly faces the camera.

**Effect:**
- Plane always points toward camera
- Useful for overlays
- Billboard-style placement

#### Camera's Main Axis

**Purpose:**
Aligns plane to major axis facing camera view direction.

**Behavior:**
- Automatically determines best axis
- Follows camera orientation
- Dynamic alignment

### Camera Tracking

#### Track Camera / Face Camera

**Purpose:**
Adds Locked Track constraint ensuring plane always faces camera.

**Behavior:**
- Plane follows camera movements
- Always oriented toward camera
- Real-time tracking

**Uses:**
- UI overlays
- Billboard materials
- Dynamic positioning

### Multiple Plane Offsets

#### Offset Planes

**Purpose:**
Offsets multiple planes instead of stacking them.

**Effect:**
- Spaces planes apart
- Prevents overlap
- Organized arrangement

#### Offset Direction

**Purpose:**
Specifies axis along which planes spaced.

**Directions:**
- X axis
- Y axis
- Z axis

#### Distance

**Purpose:**
Defines spacing between planes.

**Uses:**
- Layer separation
- Organized stacking
- Visual clarity

---

## Mesh Edit Mode Tools

### Overview

Edit Mode provides comprehensive tools for mesh creation and manipulation.

**Access:**
Edit Mode (Tab in Object Mode)

### Toolbar Overview

The Edit Mode toolbar contains selection, transformation, and creation tools.

#### Selection Tools

**Select:**
Select or move geometry with standard click-drag.

**Select Box (B):**
Select geometry by dragging a rectangular box.

**Select Circle (C):**
Select geometry by dragging a circular brush.

**Select Lasso (Ctrl+Alt+Click+Drag):**
Select geometry by drawing freehand lasso.

#### Transformation Tools

**Move (G):**
Translation tool for moving geometry.

**Rotate (R):**
Rotation tool for rotating geometry.

**Scale (S):**
Scale tool for resizing geometry.

**Scale Cage:**
Change scale by controlling cage (proportional interface).

**Transform:**
Combined tool for translation, rotation, and scale.

#### Annotation Tools

**Annotate:**
Draw freehand annotations in viewport.

**Annotate Line:**
Draw straight line annotations.

**Annotate Polygon:**
Draw polygon-shaped annotations.

**Annotate Eraser:**
Erase previous annotations.

#### Measurement

**Measure:**
Measure distances in the scene.

#### Mesh Creation Tools

**Add Cube:**
Interactively add cube primitive.

**Add Cone:**
Interactively add cone primitive.

**Add Cylinder:**
Interactively add cylinder primitive.

**Add UV Sphere:**
Interactively add UV sphere primitive.

**Add Icosphere:**
Interactively add icosphere primitive.

#### Mesh Deformation Tools

**Extrude Region (E):**
Extrude selected region with connected edges.

**Extrude Manifold:**
Extrude with automatic dissolve of overlapping geometry.

**Extrude Along Normals:**
Extrude along local face normals.

**Extrude Individual:**
Extrude each element independently along its normal.

**Extrude to Cursor (Ctrl+RMB):**
Extrude toward mouse cursor position.

**Inset Faces (I):**
Create concentric faces inside selected faces.

**Bevel (Ctrl+B):**
Create bevel from selected elements.

**Loop Cut (Ctrl+R):**
Create edge loop(s) along mesh.

**Offset Edge Loop Cut:**
Add two edge loops on either side of selected loops.

**Knife (K):**
Create custom knife cuts in mesh.

**Bisect:**
Cut mesh in half along plane.

**Poly Build:**
Create geometry by adding vertices one by one.

**Spin:**
Create geometry by extruding and rotating.

#### Smoothing & Modification

**Smooth:**
Flatten angles of selected vertices.

**Randomize:**
Randomize positions of selected vertices.

**Edge Slide (Ctrl+E then S):**
Slide edge along face.

**Vertex Slide (Shift+V):**
Slide vertex along edge.

**Shrink/Fatten:**
Move vertices along their normals.

**Push/Pull:**
Move elements away from or toward pivot point.

**Shear:**
Shear selected elements.

**To Sphere:**
Move vertices outward in spherical shape around origin.

**Rip Region (V):**
Rip polygons and move result.

**Rip Edge (Alt+R):**
Extend vertices and move result.

---

## Tool Settings and Options

### Transform Options

#### Correct Face Attributes

**Purpose:**
Adjust geometry attributes (UVs, Color Attributes) while transforming.

**Effect:**
- UVs updated with mesh deformation
- Colors preserved through transformation
- Consistent material appearance

**Use Case:**
Maintaining texture integrity during manipulation.

#### Keep Connected

**Purpose:**
Merge attributes connected to same vertex when using Correct Face Attributes.

**Effect:**
- Connected UVs move together
- Prevents UV tearing
- Maintains continuity

**Recommended For:**
Organic modeling (keeping UVs connected).

**Not Recommended For:**
Architectural modeling (where UV seams are intentional).

### Mirror Options

**Purpose:**
Enable symmetric transformations along selected axis.

**Effect:**
- When element transformed, mirrored counterpart transforms correspondingly
- Maintains symmetry automatically
- Works in local space

#### Requirements for Mirror

**Precise Alignment:**
Mirrored vertices must be exactly aligned with counterparts for Mirror Axis to recognize them.

**If Not Aligned:**
- Enable Topology Mirror for topologically similar vertices
- Use Mirror Modifier for automatic handling

#### Topology Mirror

**Purpose:**
Determines mirrored vertices by analyzing relationships, not just positions.

**Advantage:**
- Works with non-symmetrical vertex positions
- Analyzes overall topology
- More flexible than position-based mirroring

**Requirement:**
At least one Mirror Axis enabled.

**Best Results:**
- Detailed geometry (detailed models)
- Asymmetrical but topologically mirrored meshes

**May Not Work Well:**
- Simple meshes (cubes, spheres)
- Very sparse topology

### Auto Merge

**Purpose:**
Automatically merge vertices when moved closer than Threshold.

**Effect:**
- As soon as vertex moves close enough, merge happens
- Only affects interactive operations
- Simplifies vertex management

**Threshold:**
Maximum distance between vertices before merging.

**Split Edges & Faces:**
Detects intersecting transformed edges, creating new vertices and sectioning geometry.

### UV Live Unwrap

**Purpose:**
Automatically recalculates UV unwrapping when edge seam property changed.

**Effect:**
- Real-time UV update
- Immediate seam visualization
- Different from UV Editor's Live Unwrap

**Use Case:**
Quick seam testing without manual unwrap.

---

## Extrude Region

### Overview

**Access:**
- Toolbar → Extrude Region
- Hotkey: **E**

**Purpose:**
Extrusion tools duplicate vertices while keeping new geometry connected with original vertices.

### How Extrusion Works

**Process:**
1. Vertices turned into edges
2. Edges form faces
3. New geometry connected to original
4. Creates new topology

**Basic Examples:**
- Rectangle → Parallelepiped (via face extrusion)
- Circle → Cylinder (via face extrusion)
- Single vertex → Edge
- Edge → Face

### Extrusion Direction

**Default Behavior:**
- Faces extruded along averaged normal
- Can be constrained to single axis
- Interactive axis selection

**Axis Locking:**
- Press X, Y, or Z after extrude starts
- Constrains extrusion to that axis
- Shift+Axis = Plane constraint

### Extrusion Algorithm Details

**Step 1: Edge Loop Detection**
Algorithm determines outer edge loop (which edges become faces).

**Default:**
Edges touching two or more selected faces = internal (not extruded).

**Step 2: Edge to Face Conversion**
Edge loop edges converted to faces.

**Step 3: Face Handling**
- **Closed Geometry:** Faces duplicated if edges belong to only one face
  - Creates parallelepipeds from rectangles
  - Cylinders from circles
  
- **Open Geometry:** Faces linked to new faces without duplication
  - Prevents internal faces
  - Maintains coherent geometry

**Step 4: Open Edge Loops**
Edges not belonging to selected faces duplicate with new connecting face.

**Step 5: Vertices**
Single selected vertices (not in edges) duplicate with new connecting edge.

### Special Extrude Cases

**Closed Volumes:**
- Example: Cube with all 6 faces selected
- Result: Duplication only (no linking to original)
- Volume duplicated freely

**Boundary Edges:**
- Edges forming "open" edge loops
- Original and duplicate with new connecting face
- Forms solid between old and new

### Extrude Region Example Workflow

**Creating a Cylinder from Circle:**
1. Add Circle primitive
2. Enter Edit Mode (Tab)
3. Select all faces (A)
4. Extrude (E) upward
5. Confirm with Enter or mouse button
6. Result: Cylinder with top and bottom caps

**Creating Tree Limbs:**
1. Create main branch
2. Select end vertices
3. Extrude outward
4. Scale down for taper
5. Repeat for secondary branches

---

## Extrude Manifold

### Overview

**Access:**
- Toolbar → Extrude Manifold
- Menu: Mesh → Extrude → Extrude Manifold

**Differences from Standard Extrude:**
- Enables "Dissolve Orthogonal Edges" by default
- Automatically splits and removes adjacent faces when extruding inward
- Prevents topology errors

### How Extrude Manifold Works

**Feature:**
Automatic edge dissolution during extrusion.

**Effect:**
- Inward extrusions clean automatically
- Removes redundant geometry
- Maintains manifold topology
- Prevents non-manifold geometry

### Example Workflow

**Creating an Inward Indentation:**
1. Select face to indent
2. Use Extrude Manifold
3. Extrude inward
4. Adjacent geometry automatically removed
5. Result: Clean indentation without extra faces

**Use Cases:**
- Button indentations
- Recessed panels
- Details requiring clean topology
- Mechanical features

---

## Extrude to Cursor

### Overview

**Access:**
Shortcut: **Ctrl+RMB**

**Purpose:**
Interactively places new vertices at mouse cursor position.

**Behavior:**
New vertices created at cursor, linked to existing geometry.

### Single Vertex Creation

**Adding First Vertex:**
1. With no vertices selected
2. **Ctrl+RMB** at desired location
3. New vertex placed at cursor depth (based on 3D Cursor Z position)

**Why Z-Depth Needed:**
Screen is 2D, mouse click only provides X, Y coordinates. Blender uses 3D Cursor depth for Z coordinate.

**Depth Reference:**
- Default: 3D Cursor position
- Can be changed by moving cursor
- Or constrained during operation

### Creating Connected Vertices

**Adding Multiple Vertices:**
1. Add first vertex with **Ctrl+RMB**
2. Select last vertex
3. **Ctrl+RMB** for next position
4. New vertex linked to previous with edge
5. Repeat to create vertex chain

**Result:**
Connected vertices forming edges and eventual faces.

### Creating Quad Faces

**From Connected Edge:**
1. Select two vertices connected by edge
2. **Ctrl+RMB** at new position
3. Planar quad created automatically
4. Blender follows mouse cursor
5. Uses viewport's planar view

**Automatic Source Rotation:**
- Last selected edge (source) automatically rotates
- Divides angles between newly created and last two edges
- Creates smooth angle progression
- Follows X, Y coordinate rules

**Disabling Auto-Rotation:**
- Use **Shift+Ctrl+RMB** instead
- Source edge does not rotate
- Manual angle control

**Wrap Prevention:**
- If angle exceeds negative threshold (quadrant rule)
- Faces wrap automatically
- Ensures non-overlapping geometry

### Creating Multiple Face Polygons

**From Three or More Vertices:**
1. Select 3+ vertices
2. **Ctrl+RMB** click to create
3. Planar faces created along selected vertices
4. Follows cursor direction
5. Similar to extrude operation

### Viewport Dependency

**Important Note:**
Extrusions with **Ctrl+RMB** are viewport-dependent.

**Effect:**
- Change viewport perspective (top, left, bottom, right)
- Extrusion direction changes to follow viewport
- Alignments follow planar view
- Adjust view to get desired extrusion direction

**Example:**
- Top view: Extrude perpendicular to XY plane (Z direction)
- Front view: Extrude perpendicular to XZ plane (Y direction)
- Side view: Extrude perpendicular to YZ plane (X direction)

---

## Quick Reference

### Essential Extrude Hotkeys

| Action | Hotkey |
|--------|--------|
| Extrude Region | E |
| Extrude to Cursor | Ctrl+RMB |
| Extrude to Cursor (No Rotation) | Shift+Ctrl+RMB |
| Inset | I |
| Bevel | Ctrl+B |
| Loop Cut | Ctrl+R |
| Knife | K |
| Merge | Alt+M |

### Tool Selection Hotkeys

| Action | Hotkey |
|--------|--------|
| Select Box | B |
| Select Circle | C |
| Select Lasso | Ctrl+Alt+Click+Drag |
| Move | G |
| Rotate | R |
| Scale | S |

### Transform Constraints

| Constraint | Hotkey |
|-----------|--------|
| Lock X-axis | X (during transform) |
| Lock Y-axis | Y (during transform) |
| Lock Z-axis | Z (during transform) |
| Lock to Plane | Shift+X/Y/Z |

---

## Best Practices

### Extrusion Workflow

**Planning Extrusions:**
1. Visualize desired shape
2. Plan extrusion sequence
3. Consider topology flow
4. Account for deformation needs

**Sequential Extrusions:**
1. Extrude main form
2. Extrude secondary features
3. Add detail extrusions
4. Refine with scaling/positioning

**Manifold Maintenance:**
- Use Extrude Manifold for inward extrusions
- Verify topology remains valid
- Check for non-manifold geometry regularly

### Mirror Editing

**Topology Mirror Tips:**
- Works best on detailed geometry
- Test on simple objects carefully
- Verify mirrored vertices after operations
- Use Mirror Modifier for problematic cases

**Auto Merge Settings:**
- Set threshold appropriate to scale
- Too high: Unwanted merges
- Too low: Missed merges
- Test with each object type

### Material and Texture Management

**Image Plane Best Practices:**
1. Use appropriate shader (Principled most common)
2. Match render method to needs (Dithered for complex)
3. Test with actual lighting setup
4. Preview backface before finalizing
5. Consider performance impact

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extrusion not showing | Check viewport shading and visibility |
| Mirror not working | Verify vertex alignment or enable Topology Mirror |
| Image plane too small/large | Adjust Size Mode and Definition settings |
| Auto merge not working | Check threshold setting and transformation distance |
| Faces not created with Ctrl+RMB | Ensure vertices properly selected and connected |
| Mirror axis ignored | Enable Mirror Axis and check vertex position alignment |
| Texture not displaying | Verify shader type and image import settings |
| Z-depth extrusion incorrect | Adjust 3D Cursor position for extrusion depth |

---

## Summary

The mesh tools in Blender provide comprehensive geometry creation and manipulation capabilities. Key points:

- **Extrude Region**: Most common tool for creating new geometry
- **Extrude Manifold**: Safe extrusion with automatic cleanup
- **Extrude to Cursor**: Interactive vertex-by-vertex creation
- **Mesh Plane**: Quick image import with automatic texturing
- **Mirror**: Powerful symmetry tool for efficient modeling
- **Tool Options**: Fine control over transformations and merging

Master these tools for efficient, high-quality mesh creation in Blender.
