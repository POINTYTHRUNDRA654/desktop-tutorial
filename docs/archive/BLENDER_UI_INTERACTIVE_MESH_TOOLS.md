# Blender UI: Interactive Mesh Tools & Viewport Features

## Overview

Blender provides a suite of interactive mesh creation tools that allow you to add primitive objects directly into your scene with real-time visual feedback. Unlike the traditional **Add > Mesh** menu approach (which creates objects with predefined dimensions), these interactive tools let you define the size, position, and orientation of objects by dragging in the viewport.

This documentation covers:
- **Interactive Mesh Addition Tools**: Cube, Cone, Cylinder, UV Sphere, Icosphere
- **Tool Settings and Parameters**: Common configuration options
- **Sidebar Panels**: Item, Tool, View, Collections, Annotations, Animation
- **Viewport Render**: Quick preview rendering from the viewport

These tools are essential for:
- Rapid prototyping and blocking out scenes
- Precise object placement using snapping
- Creating parametric primitives with visual feedback
- Iterative modeling workflows
- Quick preview rendering without full render setup

**Quick Access:**
- Location: **Toolbar ‣ Add [Object Type]**
- Mode: **Object Mode** and **Edit Mode**
- Workflow: Drag to define base → Move to define height → Click to confirm

---

## Interactive Mesh Creation Workflow

### Universal Interaction Pattern

All interactive mesh tools follow the same three-step workflow:

**Step 1: Define Base (First Click + Drag)**
- Click and hold **LMB** at the starting point
- Drag mouse to define the base size/shape
- Base is drawn in real-time as you drag
- Release **LMB** when base size is correct

**Step 2: Define Height (Move Mouse)**
- After releasing **LMB**, move mouse up or down
- Height adjusts in real-time
- Object follows mouse movement
- No clicking required during this phase

**Step 3: Confirm (Second Click)**
- Click **LMB** to confirm the final shape
- Object is created with defined dimensions
- Tool remains active for creating additional objects
- Press **Esc** to exit tool

### Interactive Modifier Keys

While using any interactive mesh tool, you can hold modifier keys to temporarily change settings:

**Ctrl (Control Key)**
- **Function**: Toggles snapping on/off
- **Behavior**: When held, object snaps to geometry or grid
- **Use Case**: Precise alignment to existing geometry
- **Release**: Returns to free positioning

**Alt (Alternative Key)**
- **Function**: Toggles Base/Height Origin setting
- **Behavior**: Switches between Edge and Center origin modes
- **Use Case**: Quick adjustment of pivot placement
- **Release**: Returns to configured origin mode

**Shift (Shift Key)**
- **Function**: Toggles Aspect setting
- **Behavior**: Switches between Free and Fixed aspect ratio
- **Use Case**: Force square/circular bases or proportional dimensions
- **Release**: Returns to configured aspect mode

**Practical Example:**
1. Select Add Cube tool
2. Click and drag to create base (holding Shift forces square)
3. Release **LMB** (holding Ctrl snaps to grid)
4. Move mouse up (holding Alt changes origin to center)
5. Click **LMB** to confirm

---

## Add Cube Tool

### Reference
- **Mode**: Object Mode and Edit Mode
- **Location**: Toolbar ‣ Add Cube
- **Purpose**: Interactively create cubic mesh objects

### Description

The Add Cube tool creates a six-faced rectangular prism (cube or box) with real-time dimensional control. This is one of the most fundamental modeling tools, used for architectural modeling, mechanical parts, blocking out scenes, and as a base for more complex shapes.

### Usage Workflow

1. **Activate Tool**
   - Click "Add Cube" in the Toolbar
   - Cursor changes to indicate tool is active

2. **Define Base**
   - Click and drag **LMB** to define the rectangular base
   - Diagonal from first click to current position defines base
   - Can create square or rectangular bases depending on drag

3. **Define Height**
   - Release **LMB** when base size is correct
   - Move mouse vertically to set cube height
   - Height extends from the base plane

4. **Confirm Creation**
   - Click **LMB** to finalize the cube
   - Cube is added to the scene with defined dimensions
   - Tool remains active for creating additional cubes

### Tool Settings

For detailed tool settings, see **Common Tool Settings** section below, which applies to Cube and all other interactive mesh tools.

---

## Add Cone Tool

### Reference
- **Mode**: Object Mode and Edit Mode
- **Location**: Toolbar ‣ Add Cone
- **Purpose**: Interactively create conical mesh objects

### Description

The Add Cone tool creates a circular-based cone with a pointed apex. Cones are useful for creating spikes, roofs, wizard hats, traffic cones, arrows, and as components in more complex models. The tool provides control over base radius, height, and vertex count.

### Usage Workflow

1. **Activate Tool**
   - Click "Add Cone" in the Toolbar
   - Tool becomes active in viewport

2. **Define Circular Base**
   - Click and drag **LMB** to define base radius
   - Drag from center point to edge of desired circle
   - Circular base updates in real-time
   - Holding **Shift** forces circular aspect

3. **Define Height**
   - Release **LMB** when base size is correct
   - Move mouse up/down to set cone height
   - Apex moves with mouse, showing final cone shape

4. **Confirm Cone**
   - Click **LMB** to finalize
   - Cone is created with specified dimensions
   - Tool remains active for additional cones

### Cone-Specific Settings

#### **Vertices**
**Purpose**: Controls the number of vertices forming the circular base.

**Range**: 3 to 10,000,000 (practical range: 8-64)

**Behavior**:
- Low values (3-6): Pyramid shapes with flat sides
- Medium values (8-32): Smooth circular appearance
- High values (64+): Very smooth circles, higher geometry density

**Common Values**:
- 3 vertices: Triangle-based pyramid
- 4 vertices: Square pyramid
- 6 vertices: Hexagonal pyramid
- 12 vertices: Dodecagonal cone (smooth appearance)
- 32 vertices: Very smooth cone (standard quality)

**Performance Note**: Higher vertex counts create more geometry and slower performance. Use the minimum needed for desired smoothness.

#### **Base Fill Type**
**Purpose**: Determines how the circular base is filled with faces.

**Options**:

1. **Triangle Fan**
   - **Structure**: All triangular faces share one central vertex
   - **Appearance**: Faces radiate from center like fan blades
   - **Vertex Count**: Vertices + 1 central vertex
   - **Use Case**: Most common, good topology for deformation
   - **Visual**: Center vertex with edges to all perimeter vertices

2. **N-gon**
   - **Structure**: Single face with N vertices (where N = vertex count)
   - **Appearance**: One large polygon filling entire base
   - **Vertex Count**: Same as perimeter vertices
   - **Use Case**: Flat surfaces that won't be deformed
   - **Visual**: Clean, single-face base (requires triangulation for rendering)

3. **Nothing**
   - **Structure**: No base fill at all
   - **Appearance**: Hollow cone (open bottom)
   - **Vertex Count**: Only perimeter vertices
   - **Use Case**: Hollow objects, lampshades, funnels
   - **Visual**: Ring of vertices with no connecting faces

**Recommendation**: Triangle Fan for most modeling work; N-gon for flat architectural elements; Nothing for hollow objects.

### Practical Cone Applications

**Traffic Cone:**
- 8-12 vertices for polygonal appearance
- Triangle Fan base fill
- Set orange material
- Scale non-uniformly (wider base, narrower top)

**Wizard Hat:**
- 16-24 vertices for smooth circular brim
- Triangle Fan fill
- Elongated height with narrow apex
- Add texture with stars/moons

**Arrow/Pointer:**
- 8 vertices for geometric appearance
- Nothing fill (hollow)
- Combine with cylinder for arrow shaft

**Roof/Turret:**
- 16-32 vertices depending on building detail
- Triangle Fan fill
- Match vertex count to underlying building walls

---

## Add Cylinder Tool

### Reference
- **Mode**: Object Mode and Edit Mode
- **Location**: Toolbar ‣ Add Cylinder
- **Purpose**: Interactively create cylindrical mesh objects

### Description

The Add Cylinder tool creates a circular-based column with parallel top and bottom faces. Cylinders are essential for creating pipes, columns, cans, barrels, wheels, mechanical parts, and countless other cylindrical objects. The tool provides control over radius, height, vertex count, and cap filling.

### Usage Workflow

1. **Activate Tool**
   - Click "Add Cylinder" in Toolbar
   - Viewport indicates tool is active

2. **Define Base Circle**
   - Click and drag **LMB** to set base radius
   - Circular base draws in real-time
   - Drag from center to perimeter

3. **Define Height**
   - Release **LMB** when radius is correct
   - Move mouse vertically to set cylinder height
   - Top and bottom caps visible during adjustment

4. **Confirm Cylinder**
   - Click **LMB** to finalize
   - Cylinder is created at defined size
   - Tool ready for additional cylinders

### Cylinder-Specific Settings

#### **Vertices**
**Purpose**: Controls the number of vertices in each circular cap (top and bottom).

**Range**: 3 to 10,000,000 (practical range: 8-64)

**Behavior**:
- Low values (3-8): Polygonal appearance with visible edges
- Medium values (12-32): Smooth circular appearance
- High values (64+): Extremely smooth (usually unnecessary)

**Total Geometry**: Cylinder has double the vertices (top and bottom caps) plus connecting edges.

**Common Values**:
- 6 vertices: Hexagonal cylinder (screw heads, nuts)
- 8 vertices: Octagonal cylinder (gaming aesthetics)
- 12 vertices: Dodecagonal cylinder (visible but smooth)
- 16 vertices: Clean circular appearance (wheel hubs)
- 32 vertices: Very smooth cylinder (organic pipes)

**Performance Consideration**: Each increase in vertices doubles the side face count. 32 vertices = 32 quad faces on the side.

#### **Cap Fill Type**
**Purpose**: Determines how the top and bottom circular caps are filled.

**Options**:

1. **Triangle Fan**
   - **Structure**: Each cap filled with triangular faces radiating from center
   - **Topology**: Central vertex with edges to all perimeter vertices
   - **Face Count**: Equal to vertex count per cap
   - **Use Case**: Standard topology for most cylinders
   - **Deformation**: Good for bending and twisting
   - **Visual**: Clean star-pattern topology

2. **N-gon**
   - **Structure**: Each cap is a single N-sided polygon
   - **Topology**: One face with N vertices
   - **Face Count**: 1 face per cap
   - **Use Case**: Flat caps that won't be modified
   - **Deformation**: Poor for complex deformation
   - **Visual**: Simple single-face caps (requires triangulation)

3. **Nothing**
   - **Structure**: No caps at all (open ends)
   - **Topology**: Only side faces and perimeter edges
   - **Face Count**: 0 cap faces
   - **Use Case**: Pipes, tubes, hollow cylinders, sleeves
   - **Deformation**: Best for tube-like objects
   - **Visual**: Hollow cylinder with visible interior

**Recommendation**: Triangle Fan for solid objects; N-gon for flat surfaces; Nothing for pipes and hollow objects.

### Practical Cylinder Applications

**Pipe/Tube:**
- 12-16 vertices for smooth appearance
- Nothing cap fill (hollow ends)
- Array modifier for pipe sections
- Solidify modifier for wall thickness

**Can/Barrel:**
- 24-32 vertices for smooth circular body
- Triangle Fan caps (solid top/bottom)
- Subdivision Surface modifier for smoothness
- Add edge loops for dents/deformation

**Column/Pillar:**
- 16-24 vertices depending on architectural style
- Triangle Fan or N-gon caps
- Add loop cuts for capital and base details
- Scale top/bottom independently for taper

**Wheel:**
- 32 vertices for smooth rim
- Triangle Fan for hub details
- Mirror modifier for tire tread
- Array modifier for wheel patterns

**Bolt/Screw:**
- 6 vertices for hexagonal head
- Triangle Fan cap on head
- Nothing fill on threaded shaft
- Use螺旋修改器 for threading

---

## Add UV Sphere Tool

### Reference
- **Mode**: Object Mode and Edit Mode
- **Location**: Toolbar ‣ Add UV Sphere
- **Purpose**: Interactively create spherical mesh objects with UV-friendly topology

### Description

The Add UV Sphere tool creates a sphere using a latitude/longitude topology similar to Earth's coordinate system. This topology is called "UV Sphere" because it maps perfectly to rectangular UV textures (like world maps wrap around globes). UV Spheres are essential for planets, balls, heads, eyes, and any object requiring clean UV unwrapping.

**Key Characteristic**: Polar topology with vertical segments (meridians) and horizontal segments (rings/parallels).

### Usage Workflow

1. **Activate Tool**
   - Click "Add UV Sphere" in Toolbar
   - Tool activates in viewport

2. **Define Base Diameter**
   - Click and drag **LMB** to set base circle size
   - This defines the sphere's equatorial diameter
   - Drag from center to edge of desired sphere

3. **Define Height (Vertical Diameter)**
   - Release **LMB** when base is correct
   - Move mouse up to set sphere height
   - Usually matches base for perfect sphere
   - Can create ellipsoid by varying height

4. **Confirm Sphere**
   - Click **LMB** to finalize
   - UV Sphere created at specified size
   - Tool remains active

### UV Sphere-Specific Settings

#### **Segments**
**Purpose**: Controls the number of vertical divisions running pole-to-pole (like Earth's meridians/longitude lines).

**Range**: 3 to 10,000,000 (practical range: 8-64)

**Behavior**:
- Each segment is a vertical "slice" of the sphere
- Segments meet at the poles
- More segments = smoother circular cross-section
- Segments run from north pole to south pole

**Visual Analogy**: Like slicing an orange vertically. Each slice is one segment.

**Common Values**:
- 8 segments: Very low-poly (gaming/retro aesthetic)
- 16 segments: Moderate detail (background objects)
- 24 segments: Good detail (medium-distance objects)
- 32 segments: High detail (close-up objects, characters)
- 48-64 segments: Very high detail (hero assets, extreme close-ups)

**UV Mapping**: More segments = more UV coordinate precision horizontally.

#### **Rings**
**Purpose**: Controls the number of horizontal divisions encircling the sphere (like Earth's parallels/latitude lines).

**Range**: 3 to 10,000,000 (practical range: 8-64)

**Behavior**:
- Each ring is a horizontal "band" around the sphere
- Rings are parallel to the equator
- More rings = smoother vertical curvature
- Top and bottom rings converge at poles

**Visual Analogy**: Like stacking horizontal slices. Each layer is one ring.

**Important Note**: Rings are **face loops**, not edge loops. This means the edge loop count is one less than the ring count.

**Common Values**:
- 8 rings: Very low-poly
- 12 rings: Moderate detail
- 16 rings: Good detail (standard quality)
- 24 rings: High detail
- 32 rings: Very high detail

**UV Mapping**: More rings = more UV coordinate precision vertically.

#### **Relationship Between Segments and Rings**

**Total Vertex Count Formula**: 
```
Vertices = (Segments × (Rings - 1)) + 2
```
(The "+2" accounts for the poles)

**Total Face Count Formula**:
```
Faces = Segments × (Rings - 1)
```

**Examples**:
- 32 segments, 16 rings = 482 vertices, 480 faces
- 24 segments, 12 rings = 266 vertices, 264 faces
- 8 segments, 8 rings = 58 vertices, 56 faces

**Performance**: Face count grows quadratically. Doubling both segments and rings quadruples face count.

### UV Sphere Topology Characteristics

**Advantages**:
1. **Perfect UV Unwrapping**: Rectangular UV layout matches standard image textures
2. **Predictable Topology**: Easy to understand and modify
3. **Texture Mapping**: World maps, planet textures, character head UVs work perfectly
4. **Edit Mode Selection**: Easy to select horizontal rings or vertical segments

**Disadvantages**:
1. **Polar Pinching**: Vertices converge at poles, creating triangles (bad for some operations)
2. **Uneven Quad Distribution**: Quads at equator larger than quads near poles
3. **Deformation Issues**: Pinched poles can create artifacts when deforming
4. **Subdivision**: Doesn't subdivide as cleanly as icospheres

**Use UV Sphere For**:
- Planets with texture maps
- Character heads (with subdivisions)
- Spherical objects needing UV textures
- Objects with equatorial details
- Any sphere requiring rectangular UV layout

**Avoid UV Sphere For**:
- Pure geometric subdivision
- Objects needing uniform face distribution
- Heavy subdivision surface work
- Situations where polar pinching causes problems

### Practical UV Sphere Applications

**Planet Earth:**
- 32 segments, 16 rings (good detail)
- Apply world map texture with UV coordinates
- Add atmosphere with transparent shell
- Rotate on axis for animation

**Basketball:**
- 24 segments, 12 rings
- UV unwrap equatorial lines for seams
- Orange color with black line texture
- Bump map for texture detail

**Character Head:**
- 32 segments, 24 rings (high detail for face)
- UV unwrap for facial texture painting
- Subdivision Surface modifier for smoothness
- Poles at top and bottom (top of head, neck)

**Eye:**
- 16 segments, 8 rings (low detail, small object)
- Iris texture on front hemisphere
- Sclera (white) on main sphere
- Pupil as separate geometry

---

## Add Icosphere Tool

### Reference
- **Mode**: Object Mode and Edit Mode
- **Location**: Toolbar ‣ Add Icosphere
- **Purpose**: Interactively create spherical mesh objects with uniform topology

### Description

The Add Icosphere tool creates a sphere using an icosahedron (20-faced polyhedron) as the base, which is then subdivided to create a smooth sphere. Unlike UV Spheres (which have polar pinching), Icospheres have nearly uniform face distribution across the entire surface, making them ideal for geometric operations requiring consistent topology.

**Key Characteristic**: Triangular faces with uniform distribution (no poles, no pinching).

### Usage Workflow

1. **Activate Tool**
   - Click "Add Icosphere" in Toolbar
   - Tool becomes active

2. **Define Base Size**
   - Click and drag **LMB** to set base diameter
   - Defines the icosphere's equatorial size
   - Icosphere shown in real-time

3. **Define Height**
   - Release **LMB** when base size is correct
   - Move mouse up to set vertical dimension
   - Usually matches base for perfect sphere

4. **Confirm Icosphere**
   - Click **LMB** to finalize
   - Icosphere created at specified size
   - Tool remains active

### Icosphere-Specific Settings

#### **Subdivisions**
**Purpose**: Controls how many times the base icosahedron is subdivided to create smoothness.

**Base Shape (Subdivision 1)**: 
- An icosahedron: 20 equilateral triangular faces
- 12 vertices
- 30 edges
- Geometric appearance (clearly visible faces)

**Subdivision Behavior**:
Each subdivision level splits every triangular face into four smaller triangles:

**Level 1 (Base Icosahedron)**:
- Vertices: 12
- Faces: 20
- Geometric, clearly triangular appearance

**Level 2 (First Subdivision)**:
- Vertices: 42
- Faces: 80 (20 × 4)
- Slightly smoother, still visible facets

**Level 3**:
- Vertices: 162
- Faces: 320 (80 × 4)
- Reasonably smooth appearance

**Level 4**:
- Vertices: 642
- Faces: 1,280
- Very smooth, hard to see individual faces

**Level 5**:
- Vertices: 2,562
- Faces: 5,120
- Extremely smooth sphere

**Level 6**:
- Vertices: 10,242
- Faces: 20,480
- Ultra-high detail

**Level 7+**: Exponential growth continues...

**Growth Formula**: Each level quadruples the face count:
```
Faces = 20 × 4^(subdivision_level - 1)
Vertices ≈ Faces / 2 + 2
```

### Critical Performance Warning

**Danger**: Icosphere subdivision grows **exponentially**. High subdivision levels create enormous geometry.

**Example (Level 10)**:
- **5,242,880 triangular faces**
- **2,621,442 vertices**
- This will **crash Blender** on most systems
- Viewport becomes unresponsive
- File size becomes massive
- Editing becomes impossible

**Safe Subdivision Levels**:
- Levels 1-4: Safe for all systems
- Level 5: Safe for modern hardware
- Level 6: Use with caution
- Level 7+: Extreme caution, specialized use only
- Level 10+: **Will crash** on consumer hardware

**Best Practice**: Start with low subdivision (2-3), add Subdivision Surface modifier instead for smoothness that can be adjusted non-destructively.

### Icosphere Topology Characteristics

**Advantages**:
1. **Uniform Face Distribution**: All faces approximately equal size
2. **No Polar Pinching**: No convergence points (all vertices have similar connectivity)
3. **Consistent Subdivision**: Subdivides cleanly and uniformly
4. **Geometric Precision**: Perfect for mathematical/procedural work
5. **Deformation**: Better deformation than UV Sphere (no poles to distort)

**Disadvantages**:
1. **Triangular Faces**: All triangles (no quads), less ideal for subdivision modeling
2. **UV Unwrapping**: Much harder to UV unwrap than UV Sphere (no natural seams)
3. **Texture Mapping**: Rectangular textures don't map well
4. **Topology Navigation**: No clear "equator" or "poles" for selection
5. **Performance**: Very easy to accidentally create too much geometry

**Use Icosphere For**:
- Geometric/mathematical modeling
- Procedural generation
- Objects requiring uniform topology
- Base shapes for sculpting
- Physics simulations requiring even distribution
- Scientific visualizations

**Avoid Icosphere For**:
- Objects needing UV texture mapping
- Situations requiring quad topology
- When polar/equatorial features are important
- When face count must be kept very low

### Practical Icosphere Applications

**Crystal/Gem:**
- Subdivision 1-2 (low poly, geometric facets)
- No smoothing (keep faceted look)
- Reflective material
- Low subdivision maintains geometric appearance

**Water Drop/Blob:**
- Subdivision 3-4 (smooth organic shape)
- Subdivision Surface modifier for extra smoothness
- Transparent glass material
- Higher subdivision for close-ups

**Atom/Particle Visualization:**
- Subdivision 2-3
- Uniform topology ideal for scientific visualization
- Instance many spheres for molecular structures
- Even distribution important for precision

**Explosion Simulation:**
- Subdivision 2 as base mesh
- Displace modifier for surface detail
- Uniform faces important for explosion dynamics
- Low subdivision for performance

**Base for Sculpting:**
- Subdivision 3-4 as starting point
- Multiresolution modifier for sculpting
- Uniform topology prevents sculpting artifacts
- Increase resolution progressively in Sculpt Mode

### UV Sphere vs. Icosphere Comparison

| Aspect | UV Sphere | Icosphere |
|--------|-----------|-----------|
| **Topology** | Quads (mostly) | Triangles |
| **Face Distribution** | Uneven (poles pinched) | Uniform |
| **UV Mapping** | Excellent (rectangular) | Difficult |
| **Subdivision** | Creates artifacts at poles | Clean, uniform |
| **Performance** | Predictable | Explosive growth |
| **Texture Mapping** | Perfect for world maps | Poor for standard textures |
| **Deformation** | Poles cause issues | Smooth, even |
| **Selection** | Easy (rings/segments) | Complex (no clear patterns) |
| **Use Case** | Textured objects, planets | Geometric, procedural work |

**Decision Guide**:
- Need UV mapping? → **UV Sphere**
- Need uniform topology? → **Icosphere**
- Need quad topology? → **UV Sphere**
- Need clean subdivision? → **Icosphere**
- Low poly count critical? → **UV Sphere**
- Mathematical precision? → **Icosphere**

---

## Common Tool Settings

All interactive mesh tools (Cube, Cone, Cylinder, UV Sphere, Icosphere) share the following common settings:

### Depth Settings

#### **Purpose**
Controls the initial placement depth when creating the object – where in 3D space the base of the object is positioned relative to the viewport.

#### **Options**

**Surface**
- **Behavior**: Places object base on the surface under the mouse cursor
- **Fallback**: If no surface exists, behaves like Cursor Plane
- **Use Case**: Adding objects onto existing geometry (placing objects on floors, tables, etc.)
- **Raycasting**: Sends ray from camera through mouse cursor to find surface
- **Advantage**: Automatic placement at correct depth

**Cursor Plane**
- **Behavior**: Places object base on a plane passing through the 3D Cursor
- **Plane Orientation**: Aligned according to **Orientation** and **Plane Axis** settings
- **Use Case**: Precise placement relative to 3D Cursor position
- **Workflow**: Position 3D Cursor first, then create object on that plane
- **Advantage**: Repeatable, precise placement at specific depth

**Cursor View**
- **Behavior**: Places object base on a plane through the 3D Cursor aligned to current view
- **Plane Orientation**: Always perpendicular to viewport camera direction
- **Use Case**: Creating objects facing the viewport (billboards, signs, UI elements)
- **Workflow**: Position cursor, rotate view, create object facing you
- **Advantage**: Objects always face the current view direction

**Practical Examples**:
- **Surface**: Place lamp on table surface
- **Cursor Plane**: Create multiple objects at same depth along custom axis
- **Cursor View**: Create billboard sprites always facing camera

### Orientation Settings

#### **Purpose**
Defines the coordinate system used to orient the new object.

#### **Options**

**Surface**
- **Behavior**: Object uses the surface normal orientation
- **Alignment**: Object aligns perpendicular to the surface it's placed on
- **Fallback**: If no surface, uses Default orientation
- **Use Case**: Objects that should be perpendicular to surfaces (plants on terrain, lights on walls)
- **Example**: Place tree on hillside – tree automatically aligns perpendicular to slope

**Default**
- **Behavior**: Uses the default Transform Orientation from viewport settings
- **Common Default**: Global (world space) orientation
- **Alternative**: Could be Local, Normal, Gimbal, or View depending on viewport setting
- **Use Case**: Standard object creation aligned to scene axes
- **Example**: Create object aligned to world X/Y/Z axes

**Relationship to Plane Axis**: The Orientation provides three axes (X, Y, Z), and Plane Axis selects which one is "up" for the object.

### Snap To Settings

#### **Purpose**
Determines what type of geometry the object snaps to when **Ctrl** is held during creation.

#### **Options**

**Geometry**
- **Behavior**: Snaps to all geometry types
- **Targets**: Vertices, edges, and faces
- **Precision**: Highest precision snapping
- **Use Case**: Aligning precisely to existing mesh elements
- **Example**: Place new column exactly on corner vertex of floor mesh

**Default**
- **Behavior**: Uses global snapping settings from the header
- **Configuration**: Respects current snap target (vertex, edge, face, volume, etc.)
- **Flexibility**: Change global snapping without changing tool settings
- **Use Case**: When you've already configured snapping for the scene
- **Example**: Scene set to snap to grid – tool respects that setting

**Related**: See [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) for complete snapping system documentation.

### Plane Axis Settings

#### **Purpose**
Selects which axis from the **Orientation** is "up" (perpendicular) for the object being created.

#### **Options**
- **X**: X-axis is "up" – base perpendicular to X-axis
- **Y**: Y-axis is "up" – base perpendicular to Y-axis
- **Z**: Z-axis is "up" (default) – base perpendicular to Z-axis

#### **Behavior**
The base of the object is drawn in the plane perpendicular to the selected axis.

**Example**:
- Orientation = Global
- Plane Axis = Z (default)
- Result: Base lies in XY plane, height extends along Z

#### **Auto Axis**
- **When Enabled**: Ignores Plane Axis setting
- **Behavior**: Automatically chooses axis closest to viewport viewing direction
- **Exception**: When hovering over surface, uses surface normal instead
- **Use Case**: Dynamic adjustment based on view angle
- **Advantage**: Don't need to manually switch axis when changing views

**Practical Example**:
- Front view (looking along Y): Auto chooses Y as "up"
- Side view (looking along X): Auto chooses X as "up"
- Top view (looking along Z): Auto chooses Z as "up"

### Base Settings

#### **Origin (Base Origin)**

**Purpose**: Defines the starting point when dragging to create the base.

**Options**:

**Edge**
- **Behavior**: Base defined from one corner to the diagonally opposite corner
- **Drag Pattern**: First click = one corner, drag to opposite corner
- **Visual**: Diagonal expansion from starting point
- **Use Case**: When you want the starting point to be a corner
- **Example**: Creating box from bottom-left to top-right corner

**Center**
- **Behavior**: Base defined from centerpoint outward to a corner/edge
- **Drag Pattern**: First click = center, drag to define radius/extent
- **Visual**: Expands symmetrically from center
- **Use Case**: When you know where the center should be
- **Example**: Creating centered object on a specific point

**Modifier Key**: Hold **Alt** while dragging to temporarily toggle between Edge and Center.

#### **Aspect (Base Aspect)**

**Purpose**: Controls whether base dimensions can be independent or must be proportional.

**Options**:

**Free**
- **Behavior**: Width and depth can be chosen independently
- **Visual**: Can create rectangles, ovals (depending on object type)
- **Use Case**: Non-square bases (rectangular rooms, oval tables)
- **Example**: Create 5×3 unit rectangular base for a building

**Fixed**
- **Behavior**: Width and depth forced to be equal (maintains aspect ratio)
- **Visual**: Always creates squares or circles (depending on object type)
- **Use Case**: Perfect squares/circles needed
- **Example**: Create circular base for column (prevents elliptical distortion)

**Modifier Key**: Hold **Shift** while dragging to temporarily toggle between Free and Fixed.

**Practical Applications**:
- **Free**: Rectangular buildings, oval platforms, stretched shapes
- **Fixed**: Circular towers, square rooms, perfect geometric shapes

### Height Settings

#### **Origin (Height Origin)**

**Purpose**: Defines where the height extends from after base is created.

**Options**:

**Edge**
- **Behavior**: Base becomes the bottom, height extends upward
- **Result**: Base is at starting depth, top extends away
- **Use Case**: Standard object creation (build upward from base)
- **Visual**: Base stationary, top moves with mouse
- **Example**: Build tower upward from ground level

**Center**
- **Behavior**: Base becomes the center, height extends to top
- **Result**: Object grows symmetrically up and down from base
- **Use Case**: Creating objects centered on a plane
- **Visual**: Base plane at center, object extends both directions
- **Example**: Create sphere centered on specific elevation

**Modifier Key**: Hold **Alt** during height definition to toggle between Edge and Center.

#### **Aspect (Height Aspect)**

**Purpose**: Controls whether height can be independent or must match base dimensions.

**Options**:

**Free**
- **Behavior**: Height can be any value independent of base dimensions
- **Result**: Can create tall, short, or squashed objects
- **Use Case**: Most modeling situations (buildings, varied shapes)
- **Example**: Create tall cylinder (small base, large height)

**Fixed**
- **Behavior**: Height forced to equal the largest side of the base
- **Result**: Creates cubes (from square bases) or proportional objects
- **Use Case**: Creating perfect cubes or proportional shapes
- **Example**: Create perfect cube (3×3×3 units)

**Modifier Key**: Hold **Shift** during height definition to toggle between Free and Fixed.

**Practical Applications**:
- **Free**: Varied architecture, stretched shapes, most modeling
- **Fixed**: Perfect cubes, proportional spheres, geometric solids

---

## Sidebar Panels

The Sidebar (accessed with **N** key) provides contextual information and controls for the 3D Viewport. The sidebar contains multiple tabs with different panel groups.

### Item Panel

**Purpose**: Shows transform properties and settings for the active object.

**Contents**:
- **Transform**: Location, Rotation, Scale values
- **Delta Transform**: Offset values for procedural animation
- **Transform Locks**: Prevent accidental transformation on specific axes
- **Collections**: Which collections the object belongs to
- **Parent**: Object parenting information

**Common Use**:
- Numeric input for precise transforms
- Check exact object position
- Lock axes to prevent accidental changes
- View object hierarchy information

### Tool Panel

**Purpose**: Shows settings for the currently active tool and workspace.

**Contents**:
- **Active Tool Settings**: Options specific to current tool
- **Tool Options**: Modifier keys, constraints, snapping
- **Workspace Settings**: Custom workspace-specific configurations

**Dynamic Behavior**:
- Contents change based on active tool
- Mesh tools show topology options
- Transform tools show axis constraints
- Annotation tools show brush settings

**Common Use**:
- Adjust tool parameters while working
- Configure tool behavior
- Access advanced tool options

### View Panel

The View panel provides controls for viewport camera, clipping, and view-specific settings.

#### **Focal Length**
- **Purpose**: Controls the 3D Viewport's virtual camera focal length
- **Range**: 1mm to 5000mm (typical: 35-85mm)
- **Effect**: 
  - Low values (15-35mm): Wide-angle view, more perspective distortion
  - Medium values (50mm): Neutral perspective (similar to human eye)
  - High values (85-200mm): Telephoto view, compressed perspective
- **Use Case**: Match viewport to real camera for previsualization

#### **Clip Start / Clip End**

**Purpose**: Define the near and far clipping planes for viewport rendering.

**Behavior**:
- **Clip Start**: Minimum distance from camera for visible geometry
- **Clip End**: Maximum distance from camera for visible geometry
- Geometry closer than Start: invisible
- Geometry farther than End: invisible

**Default Values**:
- Start: 0.1 units
- End: 1000 units

**Orthographic Note**: In Orthographic view, the viewport uses **negative End** instead of Start for near clipping.

**Performance Trade-Off**:
- **Large Range (small Start, large End)**: 
  - See both near and far objects
  - Reduced depth precision
  - Z-fighting and depth artifacts
  - Graphics card struggles with wide range

- **Small Range (larger Start, smaller End)**:
  - Better depth precision
  - No Z-fighting artifacts
  - May clip desired geometry
  - Better graphics performance

**Common Issues with Large Range**:
- **Z-Fighting**: Overlapping faces flicker
- **Depth Buffer Glitches**: Far objects appear in front of near objects
- **Precision Loss**: Fine details disappear
- **Dependent Operations**: Tools using depth buffer become unreliable

**Best Practice**:
- Set range as small as possible for your scene
- Increase Start if experiencing Z-fighting
- Decrease End if working on close-up details
- Adjust based on scene scale

**Troubleshooting**: See Blender manual section "Troubleshooting Depth Buffer Glitches" for solutions to depth-related artifacts.

#### **Local Camera**

**Purpose**: Allows individual 3D Viewports to have their own active camera.

**Default Behavior**: All viewports share the scene's global active camera.

**Local Camera Enabled**:
- This specific viewport can use a different camera
- Selector shows available cameras in scene
- Other viewports still use global camera
- Useful for multi-camera setups

**Use Cases**:
- Compare multiple camera angles simultaneously
- Animate one camera while viewing from another
- Director's multi-camera workflow
- Quad-view with different camera in each

#### **Passepartout**

**Purpose**: Dims the area outside the camera frame when in camera view.

**Behavior**:
- Only visible when viewing through a camera (Numpad 0)
- Dark overlay on regions outside camera frame
- Camera view area remains full brightness
- Helps focus attention on what will be rendered

**Alpha/Opacity Control**: Available in camera properties to adjust darkness.

**Use Cases**:
- Framing shots and compositions
- Ensuring important elements within camera bounds
- Previewing final render area
- Cinematic composition work

#### **Render Region**

**Purpose**: Restrict viewport rendering to a specific rectangular region.

**Activation**:
- Enable checkbox to activate
- **Ctrl+B** to draw region in viewport (automatically enables checkbox)
- Drag rectangle to define region

**Behavior**:
- Only selected region is rendered
- Faster preview renders
- Useful for testing specific areas

**Important Distinction**:
- **Viewport Render**: Render Region checkbox in View panel
- **Camera View**: Must use Properties ‣ Output Properties ‣ Format ‣ Render Region instead
- Camera view setting affects final render output

**Use Cases**:
- Test material in specific region
- Quick preview of problem area
- Faster iteration on local changes
- Reducing render time during testing

### View Lock Settings

#### **Lock to Object**

**Purpose**: Makes a specific object the center of interest for viewport navigation.

**Behavior**:
- Viewport orbits around selected object
- Zoom centers on object
- Pan relative to object
- Object becomes pivot for all navigation

**Setup**:
1. Enable "Lock to Object"
2. Select object from dropdown
3. Viewport navigation now centers on that object

**Use Cases**:
- Focus on specific character while animating
- Keep building centered while modeling
- Maintain focus on important element

**Not Available**: When viewing through active camera.

#### **Lock – To 3D Cursor**

**Purpose**: Makes the 3D Cursor the center of viewport navigation.

**Behavior**:
- All navigation orbits/zooms relative to cursor
- Cursor becomes viewport pivot
- Useful for precision navigation

**Requirement**: "Lock to Object" must be disabled.

**Use Cases**:
- Navigate around specific point in space
- Work relative to marked location
- Precision viewport control

#### **Lock – Camera to View**

**Purpose**: When viewing through camera, navigation moves the camera instead of just the view.

**Behavior (Enabled)**:
- Looking through camera (Numpad 0)
- Viewport navigation (orbit, pan, zoom) transforms the camera
- Camera "glued" to view
- Camera frame outlined with red dashed line
- Adjust camera position interactively

**Behavior (Disabled)**:
- Camera remains stationary
- View can move independently from camera
- Standard behavior

**Use Cases**:
- Position camera interactively
- Frame shots by navigating
- Animate camera movement by hand

**Camera Parent Lock**: If camera is parented to another object, enable "Camera Parent Lock" in camera properties. This makes navigation transform the root parent instead of the camera itself (useful for camera rigs).

#### **Lock – Rotation**

**Purpose**: Prevents changes to viewport orientation and perspective.

**Behavior**:
- Rotation/orbit disabled
- Perspective changes disabled
- Pan and zoom still work
- View direction locked

**Use Cases**:
- Maintain specific view angle
- Prevent accidental rotation
- Work in consistent orientation
- Lock orthographic views (top, front, side)

### 3D Cursor Panel

#### **Location**
- **Purpose**: X, Y, Z coordinates of 3D Cursor in scene
- **Units**: Scene units (usually Blender Units)
- **Input**: Numeric values for precise positioning
- **Use Case**: Place cursor at exact coordinates

#### **Rotation**
- **Purpose**: Rotation values for 3D Cursor orientation
- **Axes**: X, Y, Z rotation angles
- **Use Case**: Orient cursor for surface snapping or instancing

#### **Rotation Mode**

**Purpose**: Defines the mathematical representation of rotation.

**Options**:

**Euler**
- **Representation**: Three separate X, Y, Z angles
- **Advantage**: Intuitive, easy to understand
- **Disadvantage**: Can experience Gimbal Lock
- **Display**: Shows discrete XYZ axes
- **Use Case**: Simple rotations, intuitive control

**Axis Angle**
- **Representation**: One axis vector (X, Y, Z) plus angle (W)
- **Behavior**: Rotation around specified axis by angle amount
- **Advantage**: No Gimbal Lock
- **Disadvantage**: Less intuitive
- **Use Case**: Specific axis rotations

**Quaternion**
- **Representation**: Four-dimensional rotation (X, Y, Z, W)
- **Advantage**: No Gimbal Lock, smooth interpolation
- **Disadvantage**: Not intuitive to edit manually
- **Use Case**: Animation, programmatic control

**Additional Information**: See Blender manual appendix for detailed rotation mathematics.

### Collections Panel

**Purpose**: Manage collection visibility and organization for the viewport.

**Contents**:
- List of all collections in scene
- Circle icon indicates collection contains objects
- Eye icon controls visibility

#### **Local Collections**

**Purpose**: Set collection visibility per viewport instead of globally.

**Default**: Collections visible/hidden globally for all viewports.

**Local Enabled**: Each viewport can have independent visibility settings.

**Use Cases**:
- Show different collections in different viewports
- Compare scene with/without specific elements
- Work on foreground in one view, background in another

#### **Hide in Viewport (Eye Icon)**

**Purpose**: Show or hide entire collections.

**Behavior**:
- Click eye icon to toggle visibility
- Hidden collections don't render in viewport
- Affects all objects in collection

**Isolate Feature**:
- Click collection name (not icon) to isolate
- Shows selected collection + ancestors + descendants
- Hides all other collections
- Quick way to focus on specific collection

### Annotations Panel

**Purpose**: Manage viewport annotations (hand-drawn notes and markers).

**Features**:
- Create annotation layers
- Change annotation colors
- Control annotation visibility
- Delete annotations

**See Also**: [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md) for complete annotation documentation.

### Animation Panel

The Animation panel contains tools for advanced animation workflows.

#### **Global Transform Copy/Paste**

**Purpose**: Copy and paste object/bone transforms across frames with world-space accuracy.

**Location**: 3D Viewport ‣ Sidebar ‣ Animation ‣ Global Transform

**Features**:
- Copy global (world space) transforms
- Paste to any object or bone
- Mirror transforms relative to other objects
- Paste relative to chosen objects
- Bake transforms across keyframe ranges
- Fix objects to camera (bake to camera)

##### **Basic Copy/Paste**

**Copy**:
- Inspects active Object (Object Mode) or Bone (Pose Mode)
- Captures current global transform as matrix
- Stores on clipboard

**Paste**:
- Takes clipboard transform
- Applies to active Object or Bone
- Adjusts location, rotation, scale properties
- Result matches copied world-space transform

**Mirrored**:
- Paste with mirroring relative to chosen object/bone
- Useful for symmetrical copying (left foot to right foot)
- Mirror axes configured in redo panel

##### **Keyframe Operations**

**Paste to Selected Keys**:
- Paste transform to current frame
- Use auto-keying to update selected keyframes
- Respects active keying set
- Updates multiple frames at once

**Paste and Bake**:
- Similar to "Paste to Selected Keys"
- Works on every frame between first and last selected keys
- Creates keys on all intermediate frames
- Useful for baking complex animations

##### **Mirror Settings**

**Object Mirror**:
- Mirror relative to chosen object
- Object acts as mirror plane
- Simple world-space mirroring

**Armature Bone Mirror**:
- Choose armature as mirror object
- Select bone from that armature
- Always uses named bone on specific armature
- Useful for character rigging

**Bone Mirror (Active Armature)**:
- No mirror object selected
- Choose bone name only
- Uses bone on active armature
- Useful for mirroring within same character

**Use Case**: Copy left arm pose to right arm by mirroring against chest bone.

##### **Relative Copy/Paste**

**Purpose**: Copy/paste transforms relative to a chosen object rather than world space.

**Copy Relative**:
- Determine world-space transform
- Adjust to become relative to chosen object's world transform
- Store relative transform

**Paste Relative**:
- Retrieve relative transform
- Apply relative to current chosen object's transform
- Result in world space

**Camera-Relative Default**:
- If no object chosen, uses active scene camera
- Camera determined independently for copy and paste
- Can use different cameras for copy vs paste
- Useful for maintaining visual position across camera switches

**Use Cases**:
- Keep object visually stationary when switching cameras
- Maintain position relative to moving object
- Copy poses relative to character root bone

##### **Fix to Camera (Bake to Camera)**

**Purpose**: Ensure selected objects/bones remain static relative to camera on unkeyed frames.

**Workflow**:
1. Set up animation with existing keyframes
2. Use **constant interpolation** on keyframes (required)
3. Select Location/Rotation/Scale channels to fix
4. Set frame range (scene range or preview range)
5. Click "Fix to Camera"

**Behavior**:
- Generates new keys of type 'Generated'
- Keys make object static relative to camera
- Only affects unkeyed frames
- Original manual keys preserved

**Requirements**:
- Constant interpolation (not cubic, linear, etc.)
- OR bake animation to remove interpolation
- Stepped F-Curve modifier does NOT work

**Undo/Remove**:
- Click trash bin button
- Removes all 'Generated' keys
- Original animation restored
- Works on scene range or preview range

**Frame Range**:
- Operates on scene frame range by default
- Uses preview range if active
- Keys outside range ignored

**Warning**: Tool assumes all 'Generated' keys are from this tool. Will overwrite or remove any 'Generated' keys regardless of origin.

**Use Cases**:
- Stop-motion animation (object static between keyframes)
- Match-move work (object tracks to camera)
- Prevent unwanted interpolation on unkeyed frames

##### **Limitations**

**Transform Matrix Limitations**:
- Copying captures location, rotation, scale
- Skewed transforms lose skew component
- Only basic transforms preserved

**Constraint Interactions**:
- If Object/Bone has constraints, visual result may differ
- Constraints apply on top of pasted transform
- Example: Rotation constraint always adds rotation after paste
- May not achieve exact visual result

**See Also**: [Pose Library](link) for managing and sharing entire poses.

---

## Viewport Render

### Overview

Viewport Render creates quick preview renders directly from the current viewport viewpoint, rather than from the active camera (as with standard renders). This feature enables rapid iteration and preview without full render setup.

**Key Advantages**:
- Fast preview rendering
- Render from any viewport angle
- No camera setup required
- Interactive rendering for quick feedback
- Animation previews (playblasts)

**Supported Engines**:
- ✅ Workbench (Solid Mode)
- ✅ EEVEE (Material Preview and Rendered modes)
- ❌ Cycles (not supported)

**Visual Comparison**:
1. **Workbench Render (Solid Mode)**: Fast, stylized, good for blocking
2. **EEVEE Render (Material Preview)**: Materials visible, good lighting preview
3. **Full Cycles Render**: Photorealistic, final quality (not viewport render)

### Settings

#### **Render Engine Settings**

Viewport Render uses viewport shading mode to determine render engine:

**Solid Mode**:
- Uses **Workbench** render engine settings
- Controlled by: Properties ‣ Scene ‣ Workbench settings
- Fast, stylized rendering

**Material Preview Mode**:
- Uses **EEVEE** render engine settings
- Controlled by: Properties ‣ Scene ‣ EEVEE settings
- Material and lighting preview

**Rendered Mode**:
- Uses **EEVEE** (if selected as scene render engine)
- Full EEVEE rendering capabilities

#### **Output Settings**

Viewport Render respects certain output settings:

**Used Settings**:
- **Resolution**: Width and height
- **Aspect Ratio**: Output aspect
- **Output Path**: Where files are saved
- **File Format**: PNG, JPEG, MP4, etc.

**Ignored Settings**:
- Samples (uses viewport samples instead)
- Some advanced render settings
- Compositing (see Compositor setting below)

### Rendering Operations

#### **Rendering from Current View**

**Important**: Viewport Render captures the current active viewport view:

**Not in Camera View**:
- Creates virtual camera matching current perspective
- Render uses your current viewpoint
- Great for checking angles before setting up real camera

**In Camera View (Numpad 0)**:
- Renders from active camera
- Same as normal render but faster
- Shows camera frame guides

**Aborting Render**: Press **Esc** to cancel in-progress render.

#### **Render a Still Image**

**Menu**: 3D Viewport ‣ View ‣ Viewport Render Image

**Workflow**:
1. Position viewport to desired view angle
2. (Optional) Enter camera view with Numpad 0
3. Execute Viewport Render Image
4. Render appears in Image Editor
5. Image follows output settings (resolution, file format)

**Use Cases**:
- Quick concept renders
- Testing lighting setup
- Checking composition before full render
- Screenshot-quality images for presentation

#### **Render an Animation (Playblast)**

**Menu**: 3D Viewport ‣ View ‣ Viewport Render Animation

**Workflow**:
1. Position viewport to desired angle
2. Set animation frame range (Timeline or Output Properties)
3. Execute Viewport Render Animation
4. Each frame rendered from current view
5. Animation written to output path

**Output**:
- Image sequence or video file
- Format determined by output settings
- Framerate matches scene framerate

**Use Cases**:
- Animation previews for client review
- Quick motion tests
- Animatics and pre-visualization
- Checking animation timing

**Performance**: Much faster than full render, enables quick iteration.

#### **Render Keyframes Only**

**Menu**: 3D Viewport ‣ View ‣ Viewport Render Animation (Keyframes)

**Workflow**:
1. Position viewport
2. Select objects with keyframes
3. Execute Render on Keyframes
4. Only keyframed frames are rendered
5. Non-keyframed frames repeat last rendered frame

**Behavior Example** (6-frame animation, keys on frames 3 and 5):

| Frame | Action |
|-------|--------|
| 1 | Always rendered |
| 2 | Repeats frame 1 (no key) |
| 3 | Rendered (has key) |
| 4 | Repeats frame 3 (no key) |
| 5 | Rendered (has key) |
| 6 | Repeats frame 5 (no key) |

**Use Cases**:
- Test keyframe positions
- Pose-to-pose animation preview
- Stepped animation workflow
- Faster preview (skips in-betweens)

**Output**: All frames written, but non-keyframe frames duplicate previous keyframe.

### Additional Features

#### **Disabling Overlays**

**Purpose**: Remove viewport clutter from render (rigs, empties, gizmos, etc.).

**Method**: 
- Click **Show Overlays** button in viewport header to disable
- Toggle before rendering
- Result: Clean render without UI elements

**What's Removed**:
- Object outlines
- Armature bones
- Empty objects
- Relationship lines
- Grid and axes
- Gizmos and widgets

**Use Case**: Professional-looking previews without technical elements.

#### **Render Regions**

**Purpose**: Render only a specific rectangular area of the viewport.

**Setup**:
1. Press **Ctrl+B** in viewport
2. Drag rectangle over region to render
3. Confirm selection
4. Render Region automatically enabled

**Use Cases**:
- Test small area quickly
- Focus on specific detail
- Reduce render time for iteration

**Combined with Viewport Render**: Region applies to viewport renders (both stills and animations).

### Compositor Preview

**Setting**: Properties ‣ Scene ‣ View Layer ‣ Compositor

**Options**:

**Disabled**:
- Never show compositing output in viewport
- Raw render only
- Fastest viewport render

**Camera**:
- Show compositing only in Camera View
- Best for previewing final result
- Matches final render composition

**Always**:
- Always show compositing in all views
- Slowest (compositing overhead)
- See composited result from any angle

**Use Case**: Preview color grading, filters, and compositing before final render.

### Render Pass Visualization

**Purpose**: View specific render passes instead of combined result.

**Location**: Viewport Shading popover (Material Preview or Rendered mode)

**Available Passes** (EEVEE):
- Combined (default)
- Diffuse Color
- Diffuse Direct
- Diffuse Indirect
- Specular Color
- Specular Direct
- Specular Indirect
- Ambient Occlusion
- Shadow
- Normal
- Environment

**Use Cases**:
- Analyze lighting contribution
- Debug material issues
- Check normal maps
- Verify shadow quality
- Inspect individual components

**Cycles Note**: Render passes available in Cycles full renders, not viewport render.

---

## Best Practices and Workflows

### Interactive Tool Workflows

**Rapid Prototyping**:
1. Use Cursor Plane depth for consistent placement
2. Enable Auto Axis for view-adaptive orientation
3. Use Shift for fixed aspect (perfect circles/squares)
4. Use Ctrl for snapping to existing geometry
5. Create multiple primitives quickly

**Precision Modeling**:
1. Position 3D Cursor at exact location first
2. Use Cursor Plane depth
3. Set Orientation to desired axis system
4. Enable snapping (Ctrl during creation)
5. Use numeric input in sidebar for exact dimensions

**Surface-Aligned Creation**:
1. Set Depth to Surface
2. Set Orientation to Surface
3. Objects automatically align perpendicular to surfaces
4. Ideal for vegetation, decorations, architectural details

**Viewport Render Workflows**:
1. Disable overlays before rendering
2. Use Render Region for quick area tests
3. Render keyframes only for fast pose checks
4. Use playblast for animation previews

### Performance Optimization

**Mesh Creation**:
- Start with low subdivision (UV Sphere, Icosphere)
- Use Subdivision Surface modifier instead of high base geometry
- Keep vertex counts reasonable (under 10k for viewport work)
- Use LOD (Level of Detail) for distant objects

**Viewport Render**:
- Disable unnecessary overlays
- Reduce viewport samples for faster preview
- Use lower resolution for animation tests
- Enable Render Region for partial renders
- Use Workbench for fastest previews

### Common Mistakes

**Icosphere Subdivision**:
- ❌ Creating Level 8+ icospheres (crashes Blender)
- ✅ Use Level 3-4 + Subdivision Surface modifier

**Clipping Range**:
- ❌ Clip Start too low (0.001) + Clip End too high (100000)
- ✅ Set range as small as possible for scene scale

**Base Creation**:
- ❌ Struggling with Edge origin for centered objects
- ✅ Hold Alt to temporarily switch to Center origin

**Viewport Render**:
- ❌ Expecting Cycles-quality from viewport render
- ✅ Use for previews, full render for finals

---

## Related Documentation

For comprehensive coverage of related viewport and modeling topics:

- [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md) - Core viewport interface and navigation
- [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md) - Advanced viewport controls
- [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) - Snapping system details
- [BLENDER_UI_PROPORTIONAL_EDITING.md](BLENDER_UI_PROPORTIONAL_EDITING.md) - Proportional editing and transform
- [BLENDER_UI_TOOL_SYSTEM.md](BLENDER_UI_TOOL_SYSTEM.md) - Tool system and toolbar
- [BLENDER_UI_OPERATORS.md](BLENDER_UI_OPERATORS.md) - Operator system
- [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md) - Annotation system details
