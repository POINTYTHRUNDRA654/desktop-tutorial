# Blender UI: Transform Pivot Points and Snapping Advanced Reference

## Overview

This comprehensive reference covers advanced details of Blender's **Transform Pivot Points** and **Snapping System**. These two features work together to enable precise object placement and transformation. Understanding all pivot point types, snapping modes, and their interactions is essential for professional-level 3D modeling, animation, and scene composition.

### Transform Pivot Points and Snapping Relationship

- **Pivot Points**: Determine rotation/scale center point
- **Snapping**: Enable automatic alignment to reference geometry
- **Together**: Precise transforms with predictable behavior
- **Mode-Dependent**: Different options in Object Mode vs Edit Mode
- **Customizable**: Multiple configuration options for specific workflows

---

## Transform Pivot Points - Advanced Reference

The **Transform Pivot Point** determines where the center of rotation and scaling operations occurs. Different pivot point modes serve different workflows and achieve different results.

### 3D Cursor as Pivot Point

**Reference**: Header > Transform Pivot Point > 3D Cursor

**Hotkey**: Period (.)

**Purpose**: Use 3D cursor location as transformation center.

#### Workflow

**Positioning Pivot via Cursor**:
1. Place 3D cursor at desired rotation/scale center (Shift-RMB or sidebar)
2. Change Pivot Point to "3D Cursor" (Period key or header)
3. Select objects to transform
4. Perform transformation (R, G, S)
5. Transform occurs around cursor location

**Cursor Placement Methods**:
- **Shift-RMB**: Place cursor at clicked location
- **Sidebar > View > 3D Cursor**: Enter exact coordinates
- **Snap Menu (Shift-S)**: Snap cursor to selection, origin, etc.
- **View > Align**: Center cursor at world origin

#### Advantages

**Flexibility**:
- Can place pivot point anywhere in 3D space
- Not constrained to geometry or selection
- Can position pivot outside selection

**Precision**:
- Set exact pivot location via sidebar values
- Independent from selection geometry
- Enables custom rotation centers

**Multiple Uses**:
- Single cursor location for multiple operations
- Reuse cursor position for batch transforms
- Position cursor once, perform multiple transforms

#### Use Cases

**Rotating Around Custom Center**:
- Place cursor at rotation center
- Select objects to rotate
- R (rotate) → rotates all around cursor

**Machinery and Mechanical Assemblies**:
- Wheels: Place cursor at wheel axle, rotate wheel
- Gears: Place cursor at gear center, rotate
- Doors: Place cursor at hinge, rotate door open/closed

**Orbital Positioning**:
- Multiple objects orbiting single point
- Place cursor at orbit center
- Rotate all objects around cursor simultaneously

**Complex Arrangements**:
- Custom pivot for asymmetrical transforms
- Position cursor at exact arrangement point
- Transform selection around custom center

#### Example: Rotating Objects Around Shared Center

**Scenario**: Rotate three objects in circle around common center point.

**Steps**:
1. Shift-RMB at center point to place cursor
2. Select first object
3. Period to set Pivot Point to 3D Cursor
4. R to rotate object around cursor
5. Repeat for other objects
6. All rotate around shared cursor center

**Result**: Objects in circular arrangement all rotate together around center point.

#### Cursor Visualization

- Red and white circle marks cursor location
- Crosshair shows exact center point
- Orientation gizmo visible when cursor selected
- Easy to identify in viewport

---

### Individual Origins

**Reference**: Header > Transform Pivot Point > Individual Origins

**Hotkey**: Period (.)

**Purpose**: Transform each selected item around its own center point independently.

#### Behavior in Object Mode

Each object rotates/scales around its own origin point, not a shared center.

**Key Characteristics**:
- Each object has separate pivot point
- Origin can be anywhere (center, corner, outside geometry)
- Objects transform independently within selection
- Particularly powerful for batch operations

**Origin Point Properties**:
- Can be set to object's geometric center
- Can be positioned at corner or edge
- Can be completely outside geometry
- Doesn't need to be inside object

**Visual Example**:
```
Starting:     Rotation (Ind Origins):     Rotation (Median Point):
┌─────┐       ┌─────┐                    ┌─────┐
│  A  │       │  A  │                    │  A  │
└─────┘       └─────┘                    │  B  │
              ┌─────┐                    │  C  │
┌─────┐       │  B  │                    └─────┘
│  B  │       │  B  │
└─────┘       └─────┘
              ┌─────┐
┌─────┐       │  C  │
│  C  │       │  C  │
└─────┘       └─────┘

Each rotates around own origin    All rotate around shared center
```

#### Behavior in Edit Mode

Each selected element (vertex, edge, face) rotates/scales around its own center.

**Connected Geometry Stays Connected**:
- Adjacent elements treated as single entity
- Don't become disconnected or separated
- Maintains geometry integrity
- Useful for complex face operations

**Examples**:
- **Rotating faces**: Each face rotates around its own center, but shared edges keep faces connected
- **Scaling vertices**: Each vertex scales independently from its center
- **Rotating edges**: Edges rotate around their midpoints

#### Use Cases

**Batch Object Operations**:
- Rotate multiple objects same amount around their own centers
- No need to manually position each object's pivot
- Efficient for identical operations on multiple objects

**Uniform Scaling Multiple Objects**:
- Scale multiple objects uniformly
- Each scales around its own center
- Objects don't move relative to world
- Perfect for resizing batch of objects

**Face Operations**:
- Rotate faces of subdivided mesh independently
- Each face rotates around its center
- Adjacent faces remain connected
- Good for organic deformations

**Edge Beveling**:
- When manipulating beveled edges
- Each edge segment scales independently
- Creates smooth bevel transitions

#### Example: Scaling Multiple Objects

**Scenario**: Three objects at different positions, all need to be scaled by 2x.

**With Individual Origins**:
1. Select all three objects
2. Set Pivot Point: Individual Origins
3. Press S (scale)
4. Type 2 (scale by 2x)
5. Each object scales around its own origin
6. All remain at original positions

**Result**: Each object doubles in size around its own center; objects don't move relative to scene.

**With Median Point** (comparison):
- All three scale around their shared center
- Objects move closer together
- Different visual result

#### Advantages

**No Preparation Needed**:
- No need to position cursor or select specific pivot
- Works directly with object origins
- Efficient batch operations

**Predictable Behavior**:
- Always uses object's own origin
- Consistent across multiple selections
- No ambiguity in pivot location

**Multi-Object Efficiency**:
- Transform multiple objects identically
- Each transforms around itself
- Single operation handles all objects

---

### Median Point

**Reference**: Header > Transform Pivot Point > Median Point

**Hotkey**: Period (.)

**Purpose**: Use averaged position of selected items as pivot point.

#### Behavior in Object Mode

Median Point is the averaged location of all selected object origins.

**Calculation**:
- Takes all object origin positions
- Calculates average (mean) position
- Uses that as pivot point
- Ignores object size and geometry

**Key Characteristic**: Objects' geometry and size don't affect median; only origin positions matter.

**Visual Example**:
```
Three objects at different locations:

┌─────┐
│  A  │          [Average of origin positions]
│ O   │          becomes median point
└─────┘
                
        ┌─────┐
        │  B  │
        │ O   │
        └─────┘

┌─────┐
│  C  │
│ O   │
└─────┘
```

**Origin Independence**:
- Origins can be anywhere in/outside objects
- Geometry position doesn't matter
- Only origin coordinates used
- Median point may be in empty space

#### Behavior in Edit Mode

Median Point is the averaged position of all selected vertices.

**Calculation**:
- Takes all selected vertex positions
- Calculates average position
- Uses that as pivot point
- Geometry density affects result

**Vertex Distribution Matters**:
- More vertices in area pulls median toward that area
- Uneven vertex distribution shifts median
- Can be unexpected if vertex counts differ

**Example**:
```
Cube A: 8 vertices (unsubdivided)
Cube B: 27 vertices (subdivided 3x3x3)

Even though cubes same size, median shifts toward subdivided cube
because it has more vertices contributing to average.
```

#### Median vs Bounding Box Center

**Difference**:
- **Median Point**: Average of vertices/origins (data point average)
- **Bounding Box Center**: Center of invisible bounding box (spatial center)

**When They Differ**:
- Unevenly distributed vertices → different results
- Multiple objects with distant origins → different results
- Scattered selection → different results

**When They're Same**:
- Symmetrical geometry
- Uniform vertex distribution
- Single object

#### Use Cases

**Balanced Multi-Object Transform**:
- Rotate multiple objects around their shared center
- Creates balanced orbital arrangement
- Multiple objects around common point

**Selection Cluster Center**:
- Transform around center of selection cluster
- Good for grouped geometry operations
- Works with uneven distributions

**Array-Like Operations**:
- Batch transforms on similar distributed objects
- Each transform relative to cluster center
- Maintains spacing between objects

**Edit Mode Geometry**:
- Rotate selection around center of selected geometry
- Good for radial operations
- Works with any geometry arrangement

#### Example: Rotating Objects Around Shared Center

**Scenario**: Three objects in triangle formation, rotate around their shared center.

**Steps**:
1. Select all three objects
2. Set Pivot Point: Median Point
3. Press R (rotate)
4. Move mouse to rotate
5. All three rotate around their averaged position

**Result**: Objects maintain triangular formation while rotating around center point.

#### Median Point in Complex Selections

**Edit Mode Example**:
```
Dense vertex region (12 verts)     Sparse vertex region (4 verts)

Median shifts toward dense region because it has more vertices
```

**Solution**: If unexpected, use Bounding Box Center instead, or select more carefully.

---

### Active Element

**Reference**: Header > Transform Pivot Point > Active Element

**Hotkey**: Period (.)

**Purpose**: Use active element (most recently selected) as transformation pivot.

#### Behavior in Object Mode

Active object's origin becomes pivot point.

**Active Object Identification**:
- Most recently selected object
- Lighter outline than other selected objects
- Usually last object clicked while holding Shift
- Easy to identify visually

**Transformation Behavior**:
- Active object stays in place
- Other selected objects transform around active object's origin
- Active object's position unchanged
- Only other objects move

**Visual Example**:
```
Starting:            After Rotation (Pivot = Active):
┌─────┐             ┌─────┐
│  A  │ (Active)    │  A  │ (stays in place)
│ O   │             │ O   │
└─────┘             └─────┘
                    
┌─────┐  ┌─────┐    ┌─────┐
│  B  │  │  C  │    │  B  │  (orbits around A)
└─────┘  └─────┘    └─────┘
         Active is pivot,
         B and C orbit around it
```

#### Behavior in Edit Mode

Active element's center becomes pivot point.

**Active Element Types**:
- **Vertex**: Active vertex (white outline)
- **Edge**: Active edge's center point
- **Face**: Active face's center point

**With Active Vertex**:
- Other vertices rotate around active vertex
- Active vertex doesn't move (it's a point, no rotation concept)
- Selection orbits around active vertex

**With Active Edge**:
- Pivot at edge's center point
- Selection rotates around that midpoint
- Edge itself rotates

**With Active Face**:
- Pivot at face center
- Selection rotates around face center
- Face itself rotates

**Multiple Selected Elements**:
- If multiple elements selected, only active one stays in place
- Others transform around active element
- Good for symmetrical or hierarchical edits

#### Use Cases

**Hierarchical Object Transforms**:
- Parent object as "anchor"
- Select parent + children
- Make parent active
- Rotate/scale around parent (children orbit)

**Character Setup**:
- Character armature as active
- Select armature + equipment
- Equipment rotates around armature origin
- Good for rigging and setup

**Selection Hierarchy**:
- Multiple objects with one "primary"
- Make primary active
- Transform whole group relative to primary
- Useful for assemblies and arrangements

**Edit Mode Symmetrical Work**:
- Center element as pivot
- Select surrounding geometry
- Central element stays, others transform symmetrically
- Good for symmetric modeling

**Face Operations**:
- Active face as reference
- Select surrounding faces
- They transform relative to active face
- Good for directional edits

#### Example: Rotating Child Objects Around Parent

**Scenario**: Parent object with three child objects; rotate children around parent origin.

**Steps**:
1. Select parent object
2. Shift+Click children to add to selection
3. Parent stays as active (selected first)
4. Set Pivot Point: Active Element
5. Press R to rotate
6. Children orbit around parent origin

**Result**: Parent stays fixed; children rotate around parent's origin point.

#### Active Element in Hierarchy

**Parent-Child Relationships**:
- Parent's origin = pivot point
- Children transform around parent
- Parent remains stationary
- Useful for mechanical assemblies

---

## Snapping System - Advanced Reference

The **Snapping System** enables precise alignment by automatically aligning selections to nearby reference points and geometry.

### Snapping Fundamentals

**Activation**: Shift-Tab (toggle on/off) or hold Ctrl during transform

**Header Control**: Snap icon (magnet) shows on/off state

**Types of Snapping**:
- **Target-based**: Snap to specific geometry (vertices, edges, faces)
- **Grid-based**: Snap to imaginary or viewport grid
- **Increment-based**: Snap in fixed distance increments

### Snap Base

**Purpose**: Determines which point of the selection snaps to target.

**Access**: Header > Snapping > Snap Base or Shift-Ctrl-Tab

**Available Options**:

#### Active

**Behavior**: Snaps using origin/center of active element.

**In Object Mode**:
- Uses active object's origin point
- That single point snaps to target
- Other selected objects move with it

**In Edit Mode**:
- Uses active element's center
- Active vertex, edge, or face center snaps to target
- Other geometry follows

**Advantages**:
- Clear single reference point
- Predictable snapping behavior
- Good for hierarchical selections

**Use**: When you want to snap primary element and drag others with it.

#### Median

**Behavior**: Snaps using median point of selection.

**Calculation**: Average position of all selected elements.

**In Object Mode**:
- Average of all object origins
- That averaged point snaps to target
- All objects move together maintaining spacing

**In Edit Mode**:
- Average of all selected vertices
- That averaged point snaps to target
- Selection maintains internal relationships

**Advantages**:
- Balanced snapping for groups
- Maintains selection spacing
- Good for symmetrical selections

**Use**: When snapping group of objects together while maintaining spacing.

#### Center

**Behavior**: Snaps using current transformation pivot point (whatever pivot point is set).

**Connection to Pivot Point**:
- If pivot = 3D Cursor: Snaps from cursor location
- If pivot = Active Element: Snaps from active element
- If pivot = Median Point: Snaps from median

**Flexibility**:
- Allows manual pivot selection for snapping
- Useful with 3D Cursor for custom snap points
- Works with any pivot point mode

**Advantages**:
- Complete control over snap point
- Can use 3D Cursor for custom snap source
- Highly flexible for complex setups

**Use**: When you need custom snap points; place cursor, set center snap base.

#### Closest

**Behavior**: Snaps using vertex closest to target.

**Calculation**: Finds vertex nearest to snap target, snaps that vertex.

**In Object Mode**:
- Finds object origin closest to target
- Snaps that origin (affects whole object)
- Other origins also move but not necessarily to target

**In Edit Mode**:
- Finds vertex closest to target
- Snaps that vertex to target
- Other geometry follows based on deformation

**Advantages**:
- Intelligent snapping for irregular selections
- Closest part reaches target
- Good for organic or scattered selections

**Use**: Snapping irregular or scattered selection where closest point should reach target.

#### Visual Examples

```
Three objects, snapping to target vertex:

ACTIVE:                  MEDIAN:
Target ●                 Target ●
       │                        │
       └──→ A origin snaps      └──→ Average of all 3
           B, C follow              origins snaps


CLOSEST:                 CENTER (with 3D Cursor):
Target ●                 Target ●    Cursor ●
       │                        │         │
       └──→ B (closest origin)  └────→ From cursor point
           A, C follow
```

### Snap Target

**Purpose**: Determines what geometry the selection snaps to.

**Access**: Header > Snapping > Snap Target or Shift-Ctrl-Tab

**Multiple Targets Possible**: Enable multiple simultaneously with Shift+LMB.

#### Increment

**Target**: Imaginary grid at fixed intervals.

**Grid Definition**:
- Starts at selection's original location
- Has same resolution as viewport grid
- Allows "incremental" stepping

**Orthographic View Behavior**:
- Grid resolution depends on zoom level
- Zoomed in: finer grid increments
- Zoomed out: coarser grid increments

**Use Cases**:
- Moving in predictable steps
- Quick alignment without precise targets
- Grid-based layout
- When no geometry targets available

**Example**: Move object in 1-unit increments regardless of nearby geometry.

#### Grid

**Target**: Visible viewport grid.

**Grid Properties**:
- Displayed as gray lines in viewport
- Aligned to world X/Y/Z axes
- Spacing matches viewport grid settings
- Continuous across viewport

**Advantages**:
- Visual reference for snapping
- See exact grid in viewport
- Standard alignment grid
- Useful for structured layouts

**Adjustment**: Grid spacing set in Display properties.

**Use Cases**:
- Architectural models (grid-based)
- Game assets (grid-aligned)
- Structured scenes
- Level design

#### Vertex

**Target**: Vertices of existing geometry.

**Target Selection**:
- Snaps to vertex closest to mouse cursor
- Can snap to own object's vertices (self-snap)
- Can snap to other objects' vertices
- Precision: Exact vertex-to-vertex alignment

**Most Common Snap Type**: Usually enabled for general work.

**Advantages**:
- Precise vertex alignment
- Easy to align geometry exactly
- Works with any geometry type
- Fundamental snapping mode

**Use Cases**:
- Aligning vertices precisely
- Placing objects on existing vertices
- Modeling with exact alignment
- Rigging (bones to vertices)

#### Edge

**Target**: Mesh edges.

**Snapping Behavior**:
- Snaps to point on edge closest to cursor
- Not just edge endpoints (vertices)
- Any point along edge can be target

**Advantages**:
- Snap to anywhere on edge
- More flexible than vertex-only
- Good for edge-based alignment
- Fine placement control

**Use Cases**:
- Placing objects on edges
- Edge-based alignment
- Creating geometry aligned to existing edges

#### Face

**Target**: Surface of faces (mesh faces).

**Snapping Behavior**:
- Snaps to face surface
- Useful for placing on faces
- Projects to face surface

**Common Use**: Retopology (new topology on existing surface).

**How It Works**:
- Snaps selection to nearest face surface
- Good for surface-following operations
- Projects onto face normal direction

**Advantages**:
- Surface-aware snapping
- Good for topology work
- Follows curved surfaces

**Use Cases**:
- Retopology workflows
- Placing objects on curved surfaces
- Surface-aligned modeling

#### Volume

**Target**: Interior of objects (object volume/center).

**Snapping Behavior**:
- Snaps to depth inside object
- Centers at object interior
- Not surface-based

**Advantages**:
- Places at interior location
- Good for bones inside character mesh
- Useful for volume-aware placement

**Example Use**: Placing armature bone centered inside character's arm, not on surface.

#### Edge Center

**Target**: Center point of edges.

**Snapping Behavior**:
- Snaps to midpoint of edges
- Exact edge center point

**Advantages**:
- Edge midpoint alignment
- Good for edge-centric modeling

**Use Cases**:
- Placing at edge midpoints
- Edge-based symmetry operations

#### Edge Perpendicular

**Target**: Point on edge where snap line is perpendicular.

**Behavior**:
- Snaps to specific point on edge
- Ensures snapped line is perpendicular to edge
- White cross shows original snap point
- Snapped point on edge perpendicular to cross

**Advantages**:
- Precise perpendicular alignment
- Good for architectural/technical work
- Ensures right-angle relationships

**Use Cases**:
- Architectural modeling (right angles)
- Perpendicular placement
- Technical drawing-like precision

**Visual**:
```
Original position (white cross)
        │
Edge ───┼─── 
        │
    Snapped position
    (perpendicular to edge)
```

### Snap Target for Individual Elements

**Purpose**: Special snapping for elements within individual objects (mesh islands).

**Access**: Header > Snapping > Snap Target for Individual Elements

**Two Options**:

#### Face Project

**Behavior**: Snaps to face directly under cursor (projected).

**How It Works**:
- Projects selection to face under mouse
- Works similar to Shrinkwrap modifier
- Good for fitting surfaces to objects

**Use Cases**:
- Bending flat sheet to curved surface
- Fitting cloth to character
- Surface-following topology

**Advantage**: Treats surface as projection target.

#### Face Nearest

**Behavior**: Snaps each element to nearest face.

**Key Difference from Face**:
- Handles occluded geometry (hidden faces)
- Each element finds its own nearest face
- Not limited to face under cursor

**In Object Mode**:
- Each object snaps to nearest face
- Can access hidden faces

**In Edit Mode**:
- Each vertex snaps to nearest face
- Doesn't require face visibility

**Use Cases**:
- Snapping to interior faces
- Complex mesh snapping
- Snapping around obstructions

**Advantage**: Finds nearest face regardless of visibility.

### Target Selection Options

Additional snapping configuration options.

#### Include Active (Edit Mode)

**Behavior**: Snap to other mesh elements of active object.

**In Edit Mode**:
- Allows snapping to own object's geometry
- Useful for self-snapping
- Snaps within same object

**Ignored If**: Proportional Editing enabled.

**Use**: Aligning geometry within same object.

#### Include Edited (Edit Mode)

**Behavior**: Snap to other objects also in Edit Mode.

**Scenario**: Multiple objects in Edit Mode simultaneously.

**Effect**: Selection snaps to geometry in other Edit Mode objects.

**Use**: Editing multiple objects together with snapping between them.

#### Include Non-Edited (Edit Mode)

**Behavior**: Snap to objects not in Edit Mode.

**In Edit Mode**: Can snap to Object Mode objects.

**Use**: Editing one object while snapping to others in scene.

#### Exclude Non-Selectable

**Behavior**: Only snap to selectable objects.

**Effect**:
- Hidden objects excluded from snapping
- Locked objects excluded
- Only active/selectable objects available

**Use**: Prevent snapping to hidden/locked geometry.

#### Align Rotation to Target

**Behavior**: Rotate selection to match target normal.

**Effect**:
- Z-axis aligns to target surface normal
- Selection rotates to face target direction
- Useful for orientation-aware placement

**Example**: Placing object on angled surface with proper orientation.

**Use**: Rotation-aware placement on surfaces.

#### Backface Culling

**Behavior**: Exclude back-facing geometry from snapping.

**Effect**:
- Only front-facing faces snap
- Back faces ignored
- Prevents unintended snaps to rear geometry

**Use**: Cleaner snapping when overlapping geometry.

#### Snap to Same Target Face Nearest

**Behavior**: Snap only to closest target object.

**Effect**:
- If multiple snap targets nearby, uses closest one
- Maintains snapping to same object throughout operation
- Prevents jumping between targets

**Use**: Consistent snapping to single target during transform.

#### Face Nearest Steps (Edit Mode)

**Behavior**: Break transform into multiple snap steps.

**Effect**:
- Performs snap multiple times during single transform
- Each step snaps separately
- Results in stepped movement along surface

**Advantage**: Better results for complex face snapping.

**Use**: Following curved surfaces with stepped snaps.

#### Snap Peel Object Volume

**Behavior**: Treat disconnected mesh islands as single object.

**Scenario**: Object with multiple disconnected parts.

**Default**: Snaps to nearest island under cursor.

**With Snap Peel**: Treats entire object as connected.

**Use**: Unified snapping for objects with separated islands.

### Affect - Transform Type Snapping

**Purpose**: Specify which transforms are affected by snapping.

**Access**: Header > Snapping > Affect

**Available Options**:

#### Move (Default)

**Behavior**: Snapping applies to movement (G key).

**Always Enabled**: By default, movement snaps.

#### Rotate

**Behavior**: Snapping applies to rotation (R key).

**When Enabled**: Rotation snaps to angle increments.

**Rotation Increments**: Configured separately (see Rotation Increment below).

**Use**: When precision angle snapping needed during rotation.

#### Scale

**Behavior**: Snapping applies to scaling (S key).

**When Enabled**: Scale snaps to increment values.

**Use**: When uniform scaling steps needed.

**Typical**: Less commonly enabled than Move/Rotate.

### Rotation Increment

**Purpose**: Angular increment for rotation snapping.

**Access**: Header > Snapping > Affect > Rotation Increment

**Settings**:

#### Primary Rotation Increment

**Default Value**: Often 5 or 15 degrees (project-dependent).

**Effect**: Rotation snaps to this angle increment.

**Example**: With 15° increment, rotation snaps to 0°, 15°, 30°, 45°, etc.

**Adjustment**: Enter custom value for different increments.

#### Rotation Precision Increment

**Purpose**: Finer snapping increment (usually activated with Shift).

**Activated**: Hold Shift during rotation transform.

**Typical Value**: Often 1 degree (fine precision).

**Effect**: Holding Shift during rotation uses precision increment instead of primary.

**Workflow**:
1. Rotate with regular increment (fast, coarse)
2. Hold Shift during rotation for precision increment (fine tuning)
3. Can switch between modes mid-transform

#### Example

**Primary Increment**: 15 degrees
**Precision Increment**: 1 degree

**Rotation Workflow**:
1. Press R (rotate mode)
2. Move mouse → snaps in 15° increments
3. Hold Shift → snaps in 1° increments
4. Release Shift → back to 15° increments
5. Click to confirm

---

## Snapping Workflow Examples

### Example 1: Vertex-to-Vertex Alignment

**Scenario**: Align vertex of one object to vertex of another.

**Setup**:
1. Enable Snapping (Shift-Tab)
2. Set Snap Base: Active
3. Set Snap Target: Vertex
4. Select object with vertex to move
5. Ensure other object's vertex is accessible

**Steps**:
1. Press G (move)
2. Move toward target vertex
3. Selection snaps to target when close
4. Confirm snap (LMB)

**Result**: Vertex aligned exactly to target vertex.

### Example 2: Grid-Based Layout

**Scenario**: Position multiple objects on grid.

**Setup**:
1. Enable Snapping (Shift-Tab)
2. Set Snap Target: Grid
3. Adjust grid spacing in Display properties
4. Select objects to position

**Steps**:
1. Select object
2. Press G (move)
3. Move object; snaps to grid points
4. Confirm position
5. Repeat for other objects

**Result**: All objects perfectly aligned to grid.

### Example 3: Retopology Workflow

**Scenario**: Create new topology on existing surface.

**Setup**:
1. Enable Snapping
2. Set Snap Target: Face
3. Can use Face Project or Face Nearest
4. Select new geometry to position

**Steps**:
1. Create new vertices/edges
2. Move to surface; snaps to face
3. Follows surface naturally
4. Creates topology aligned to existing shape

**Result**: New topology perfectly follows existing surface.

### Example 4: Perpendicular Placement

**Scenario**: Place object perpendicular to edge.

**Setup**:
1. Enable Snapping
2. Set Snap Target: Edge Perpendicular
3. Select object to place

**Steps**:
1. Press G (move)
2. Move toward edge
3. Snaps perpendicular to edge
4. White cross shows original location
5. Confirm snap

**Result**: Object placed perpendicular to edge; useful for technical models.

### Example 5: Character Armature Bone Placement

**Scenario**: Place bones centered inside mesh.

**Setup**:
1. Enable Snapping
2. Set Snap Target: Volume
3. Snap Base: Closest
4. Select armature
5. In Edit Mode: Select bone to move

**Steps**:
1. Press G (move bone)
2. Move toward character mesh
3. Snaps inside mesh volume
4. Centers bone naturally
5. Confirm

**Result**: Bone centered inside mesh; natural rigging position.

---

## Advanced Snapping Techniques

### Technique 1: Lock Axis + Snapping

Combine axis locking with snapping for constrained alignment.

**Procedure**:
1. Enable snapping
2. Press G (move)
3. Press X/Y/Z (lock axis)
4. Move along axis; snaps only along that axis
5. Confirm snap

**Result**: Snapping occurs only along specified axis; other axes unchanged.

### Technique 2: Incremental Rotation Switching

Use primary and precision increments for fast then fine rotation.

**Procedure**:
1. Enable Snapping (Rotate enabled)
2. Press R (rotate)
3. Move mouse; rotates in large increments (fast)
4. Hold Shift; switches to fine increments
5. Release Shift; back to large increments
6. Confirm rotation

**Result**: Quickly reach approximate angle, then fine-tune with precision.

### Technique 3: Multi-Target Snapping

Enable multiple snap targets for flexible snapping.

**Procedure**:
1. Hold Shift+LMB on multiple snap target options
2. Both enabled simultaneously
3. Whichever is closest snaps during transform
4. Gives maximum flexibility

**Result**: Snapping to nearest of multiple targets; most flexible option.

### Technique 4: Cursor-Positioned Snap Base

Use 3D Cursor as custom snap source.

**Procedure**:
1. Place cursor at custom snap point (Shift-RMB)
2. Set Pivot Point: 3D Cursor
3. Set Snap Base: Center
4. Enable snapping
5. Transform selection

**Result**: Selection snaps from custom cursor position; highly flexible.

---

## Best Practices

### Pivot Point Selection

**For Single Object Transforms**:
- Use object's own origin (Individual Origins)
- Or active element for hierarchies

**For Multiple Objects**:
- Median Point for balanced transforms
- Active Element for hierarchical operations
- 3D Cursor for custom centers

**For Complex Arrangements**:
- Place 3D Cursor precisely
- Use as pivot point
- Enables exact custom centers

### Snapping Optimization

**Enable Only Needed Targets**:
- Too many snap types slow responsiveness
- Disable unused targets
- Common: Vertex + Edge only

**Use Include/Exclude Options**:
- Exclude non-selectable to avoid hidden geometry
- Include appropriate object types
- Keeps snapping focused

**Axis Locking with Snapping**:
- Combine for constrained alignment
- Prevents accidental off-axis movement
- Useful with grid snapping

### Transform Precision Workflow

**Fast Approximate Positioning**:
1. Use grid snapping
2. Move in large increments
3. Quickly reach approximate location

**Fine Precision Adjustment**:
1. Switch to vertex snapping
2. Smaller increments
3. Align precisely

**Two-Stage Workflow**: Fast approach + fine tuning.

---

## Related Documentation

Learn more about transformation and viewport control:

- **[3D Viewport Overview](BLENDER_UI_3D_VIEWPORT.md)**: Main viewport interface
- **[Viewport Controls](BLENDER_UI_VIEWPORT_CONTROLS.md)**: Camera, regions, cursor
- **[Selection Techniques](BLENDER_UI_SELECTION_TECHNIQUES.md)**: How to select objects (planned)
- **[Transform Operations](BLENDER_UI_TRANSFORM_OPERATIONS.md)**: Move, Rotate, Scale basics (planned)
- **[Modeling Workflows](BLENDER_UI_MODELING_WORKFLOWS.md)**: Practical modeling setups (planned)
- **[Rigging Setup](BLENDER_UI_RIGGING_SETUP.md)**: Character rigging with bones (planned)

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Intermediate to Advanced  
**Typical Use**: Precise transforms, complex scene arrangement, professional modeling
