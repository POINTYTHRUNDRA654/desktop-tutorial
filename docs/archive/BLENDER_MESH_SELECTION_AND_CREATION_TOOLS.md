# Blender Mesh Selection and Creation Tools Guide

## Loop Cut Tool

### Overview

**Access:**
- Toolbar → Loop Cut
- Hotkey: **Ctrl+R**
- Menu: Mesh → Edge Loops → Loop Cut

**Purpose:**
Splits a loop of faces by inserting new edge loops intersecting the chosen edge. Modal tool with two-step workflow.

**Key Advantage:**
Creates uniform edge loops quickly, essential for adding topology to existing geometry.

### Tool Workflow

#### Step 1: Pre-Visualizing the Cut

**Process:**
1. Activate Loop Cut tool (Ctrl+R)
2. Move cursor over desired edge
3. Watch for magenta colored line preview
4. Line shows where cut will be placed

**Preview Behavior:**
- Magenta line follows cursor movement
- Shows path of new edge loop
- Stops at poles (triangles, n-gons)
- Indicates loop termination points

**Key Point:**
Loop stops at poles where existing face loop terminates.

#### Step 2: Perform the Cut

**Process:**
1. Once desired location found
2. Click **LMB** to create edge loop
3. Tool confirms cut
4. New edge loop appears in mesh

### Visual Example Workflow

**Before Cut:**
Original mesh with existing edge loops.

**Preview:**
Magenta line shows prospective new edge loop location as you move cursor.

**Placement:**
Interactive placement of new loop between adjacent existing loops.

**After Cut:**
New edge loop inserted, ready for further editing.

### Tool Settings

#### Number of Cuts

**Purpose:**
Increases or decreases number of cuts to create.

**Behavior:**
- Multiple cuts uniformly distributed in original face loop
- Cannot control individual cut positions
- Useful for adding multiple topology divisions at once

**Use Cases:**
- Add 2+ divisions quickly
- Subdivide face loops uniformly
- Prepare for tapering or deformation

**Range:**
1 to many (limited by practical mesh resolution).

#### Correct UVs

**Purpose:**
Corrects UV coordinates if they exist, avoiding image distortions.

**Effect:**
- UV layout adjusted with geometry changes
- Prevents texture stretching
- Maintains UV integrity
- Should be enabled for textured models

**When to Enable:**
- Always, if model has textures
- Essential before rendering textured objects
- Prevents unexpected shading artifacts

### Loop Cut Options

**After Modal Tool Runs:**
Loop Cut and Slide Options appear in Adjust Last Operation panel.

**Available Adjustments:**
- Slide position along loop
- Fine-tune cut location
- Adjust multiple cuts spacing

### Best Practices

**Loop Cut Workflow:**
1. Identify where topology is needed
2. Select appropriate edge by hovering
3. Use Ctrl+R to activate
4. Watch preview carefully
5. Click when position is correct
6. Use options panel for fine adjustment

**Common Uses:**
- Add edge loops around character joints
- Create topology for deformation
- Add detail to hard-surface models
- Subdivide faces for complexity
- Prepare for beveling

---

## Poly Build Tool

### Overview

**Access:**
- Toolbar → Poly Build
- Menu: Not directly in menu (toolbar only)

**Purpose:**
Combines several mesh editing tools into one streamlined workflow. Especially useful for retopology.

**Key Advantage:**
Work quickly without switching between multiple tools.

### Tool Settings

#### Create Quads

**Purpose:**
When creating new triangle sharing edge with existing one, automatically dissolves edge to create quad.

**Effect:**
- Simplifies topology
- Removes unnecessary triangles
- Improves deformation
- Cleaner final mesh

**Enable For:**
- Character retopology
- Organic modeling
- Animation-ready meshes

**Disable For:**
- Game assets (triangles acceptable)
- Quick mesh creation
- Placeholder geometry

### Controls and Usage

#### Adding Geometry (Ctrl+LMB)

**Function:**
Creates new vertex at mouse cursor, then creates triangle using new vertex and nearest existing edge.

**Special Case:**
If existing edge already has two neighboring faces, instead creates new edge using new vertex and nearest existing vertex.

**Visual Feedback:**
- Blue preview when holding Ctrl
- Shows prospective geometry
- Helps plan topology

**Workflow:**
1. Ctrl+LMB over edge to extend
2. Preview appears in blue
3. Release to create geometry
4. Topology grows from existing edges

#### Deleting Geometry (Shift+LMB)

**Function:**
Dissolves vertex or deletes face under mouse cursor.

**Visual Feedback:**
- Red highlight when holding Shift
- Shows target element for deletion
- Prevents accidental deletions

**Target Elements:**
- Individual faces
- Vertices
- Edges

**Workflow:**
1. Shift+LMB over geometry to delete
2. Red highlight shows target
3. Release to delete
4. Topology adjusted accordingly

#### Moving Vertices (LMB)

**Function:**
Drag vertex to new position.

**Standard Transform:**
- Click and drag vertex
- Releases at new position
- Updates connected geometry

**Useful For:**
- Fine-tuning vertex positions
- Aligning to reference geometry
- Creating precise shapes

#### Extruding Edges (LMB)

**Function:**
Extrude edge into quad by dragging.

**Process:**
1. Click on edge to extrude
2. Drag in desired direction
3. Creates quad connecting old and new edge
4. Release to confirm

**Result:**
- New quad-face created
- Edge extended outward
- Topology grows smoothly

### Helpful Options

#### Snapping

**Enable Snapping:**
- Hotkey: Shift+S in 3D View
- Or Properties panel toggle
- Ensures precision alignment

**Benefits:**
- Vertices snap to exact positions
- Aligns to reference geometry
- Prevents floating vertices

#### Auto Merge

**Enable Auto Merge:**
- Tool settings panel
- Automatically merges nearby vertices
- Set appropriate threshold

**Benefits:**
- Combines overlapping vertices
- Cleans up topology
- Prevents duplicates

**Tip:**
Enable both Snapping and Auto Merge while tweaking vertices for optimal results.

### Retopology Workflow with Poly Build

**Basic Process:**
1. Load reference high-poly model
2. Create low-poly base
3. Use Poly Build to grow topology
4. Add vertices systematically
5. Create quads progressively
6. Use snapping for alignment
7. Merge with auto-merge option
8. Refine and finalize

---

## Spin Tool

### Overview

**Access:**
- Toolbar → Spin
- Menu: Mesh → Extrude → Spin

**Purpose:**
Extrudes (or duplicates if manifold) selected elements, rotating around specific point and axis.

**Common Name:**
Often called "lathe" tool or "sweep" tool in other software.

**Best Use:**
Creating objects that would be produced on a lathe (glasses, vases, bowls, etc.).

### How Spin Works

**Process:**
1. Select profile geometry to rotate
2. Position 3D cursor at rotation center
3. Select Spin tool
4. Configure steps and angle
5. Tool rotates geometry around cursor
6. Creates circular extrusion

**Key Components:**
- **Selected Elements**: Geometry to rotate
- **3D Cursor**: Center of rotation
- **Pivot Axis**: Direction of rotation
- **Steps**: Number of copies
- **Angle**: Degrees to sweep

### Rotation Parameters

#### Spin Axis

**Purpose:**
Specifies pivot axis for rotation.

**Options:**
- X-axis
- Y-axis
- Z-axis
- Custom vector

**Default:**
View axis (perpendicular to viewport).

**Setting Axis:**
- Manually specify in tool options
- Or let default view axis determine

#### 3D Cursor Position

**Importance:**
Determines center of rotation (pivot point).

**Setting Cursor Position:**
1. Edit Mode
2. Select vertex or element
3. Mesh → Snap → Cursor to Selection
4. Cursor moves to selection center
5. Use for precise rotation center

**Example Workflow:**
For wine glass, place cursor along centerline of profile.

#### View Determines Axis

**Rule:**
Your viewport view determines rotation axis.

**Examples:**
- Top view (Numpad7): Rotates around Z-axis
- Front view (Numpad1): Rotates around Y-axis
- Side view (Numpad3): Rotates around X-axis

**Change View to Change Axis:**
Switch viewport angle to spin around different axis.

### Tool Settings

#### Steps

**Purpose:**
Specifies how many copies extruded along the "sweep."

**Effect:**
- More steps = smoother result
- Fewer steps = polygonal appearance
- Affects geometry density

**Range:**
Typically 8-360+ depending on smoothness desired.

**Example:**
- 12 steps for 30° segments
- 36 steps for 10° segments
- 360 steps for 1° per step

#### Use Duplicates

**Purpose:**
When enabled, keeps original selected elements as separated islands in mesh.

**Effect:**
- Original geometry unlinked to spin result
- Creates duplicate at starting position
- Useful for open profiles

**When to Enable:**
- Open profiles (half-circle, arc)
- Need to keep original separate
- Preventing automatic merging

**When to Disable:**
- Closed profiles (full circle)
- Want seamless connection
- Single unified mesh desired

#### Angle

**Purpose:**
Specifies angle "swept" by tool in degrees.

**Range:**
0° to 360° (or more for multiple rotations).

**Examples:**
- 180° = half rotation
- 360° = full rotation
- 720° = two full rotations

**Use Cases:**
- 360° for complete lathe object
- 180° for half vase or vessel
- Partial angles for specific shapes

#### Auto Merge

**Purpose:**
Automatically merges first and last duplicates if they overlap.

**Requirement:**
Must make full revolution resulting in overlapping geometry.

**Effect:**
- Closes seamless rotations
- Merges start/end vertices
- Creates unified manifold mesh

**Enable For:**
- 360° full rotations
- Closed-form objects
- Vases, bowls, glasses

#### Flip Normals

**Purpose:**
Reverses normal direction for resulting geometry.

**Use Cases:**
- Fix inverted normals from spin
- Correct face orientation
- Prepare for rendering

**When Needed:**
- After spin, geometry appears dark
- Normals pointing inward
- Shading needs correction

#### Center X, Y, Z

**Purpose:**
Specifies center of spin.

**Default:**
Uses cursor position.

**Manual Override:**
Enter specific coordinates for precise control.

**Advanced:**
- Set to specific world coordinates
- Or relative to object origin
- For objects requiring exact centering

#### Axis X, Y, Z

**Purpose:**
Specify spin axis as vector.

**Default:**
View axis (viewport direction).

**Custom Vector:**
- Set as (1, 0, 0) for X-axis
- (0, 1, 0) for Y-axis
- (0, 0, 1) for Z-axis
- Or combinations for custom angles

### Spin Tool Workflow Example: Wine Glass

#### Step 1: Create Profile

Create mesh representing glass profile.
- Thicken outline for hollow object
- Draw side profile as edges/faces

#### Step 2: Position in Top View

1. Switch to top view (Numpad7)
2. View shows axis for rotation
3. Profile appears as outline

#### Step 3: Center the Cursor

1. Enter Edit Mode
2. Select vertex on centerline
3. Mesh → Snap → Cursor to Selection
4. Cursor positioned at center

#### Step 4: Select and Spin

1. Select all vertices (A)
2. Choose Spin tool
3. Use gizmo to adjust angle
4. Confirm with LMB or Enter

#### Step 5: Handle Duplicate Vertices

**Problem:**
Spin operation leaves duplicate vertices along profile.

**Solution:**
1. Box select overlapping vertices (B)
2. Merge by Distance (Right-click → Merge)
3. Verify vertex count matches original

**Verification:**
- Original profile vertex count noted
- After merge, should match count
- If not, manually merge remaining vertices

**Manual Merge for Two Vertices:**
1. Select both vertices (Shift+LMB)
2. Press S (Scale)
3. Hold Ctrl while scaling to 0
4. LMB to complete
5. Alt+M → By Distance

#### Step 6: Recalculate Normals

1. Select all vertices (A)
2. Alt+N to open normals menu
3. Select "Recalculate Normals Outside"
4. Normals point correctly

**Why Important:**
Ensures proper shading and rendering.

### Spin Example Results

**Full 360° Rotation:**
Creates complete vessel (glass, vase, bowl).

**120° Rotation:**
Creates partial shape (for asymmetrical designs).

**Result with Duplicates:**
Original profile preserved, spin geometry added.

**Result of Merge:**
Clean seamless geometry without overlapping vertices.

### Best Practices

**Planning Spin Operations:**
1. Draw profile carefully
2. Position cursor accurately
3. Test with small angle first
4. Increase steps for smoothness
5. Verify normals after spinning

**Common Issues:**
- Cursor not at center → off-center spin
- Wrong view angle → spins wrong axis
- Too few steps → faceted result
- Duplicate vertices unmerged → mesh errors

---

## Selecting Mesh Elements

### Selection Fundamentals

**Importance:**
Proper selection is foundation of all mesh editing.

**Selection Affects:**
- Which operations apply
- Tool effectiveness
- Transformation scope
- Final result quality

### Selection Modes

#### Vertex Mode (1 key)

**Appearance:**
Vertices shown as points in viewport.

**Color Coding:**
- **Orange**: Selected vertices
- **Black**: Unselected vertices
- **White**: Active/last selected vertex

**Use For:**
- Precise vertex manipulation
- Fine-tuning positions
- Individual vertex editing
- Complex selections

#### Edge Mode (2 key)

**Appearance:**
Vertices not shown; edges displayed.

**Color Coding:**
- **Orange**: Selected edges
- **Black**: Unselected edges
- **White**: Active/last selected edge

**Use For:**
- Edge loop selection
- Seam marking
- Edge-based operations
- Topology work

#### Face Mode (3 key)

**Appearance:**
Faces displayed with selection point in middle.

**Color Coding:**
- **Orange**: Selected faces and selection point
- **Black**: Unselected faces
- **White**: Active face (highlighted)

**Use For:**
- Face-based selection
- Material assignment
- Face operations (inset, extrude, etc.)
- Surface-level edits

### Multiple Selection Modes

**Enabling Multiple Modes:**
Hold **Shift+LMB** when clicking selection mode buttons.

**Benefits:**
- Quick switching between modes
- No mode button clicks needed
- Faster workflow
- Select vertices, edges, or faces simultaneously

**Example:**
Enable Vertex + Edge mode to select both vertices and edges at same time.

### Selection Mode Switching

#### Ascending Selection (Simple → Complex)

**Direction:**
Vertices → Edges → Faces

**Behavior:**
Selected parts remain selected if they form complete element in new mode.

**Example:**
All 4 edges of face selected in Edge mode → Switch to Face mode → Face stays selected.

**Unselected Parts:**
Parts not forming complete set in new mode become unselected.

#### Descending Selection (Complex → Simple)

**Direction:**
Faces → Edges → Vertices

**Behavior:**
All elements defining "high-level" element selected.

**Example:**
Face selected in Face mode → Switch to Edge mode → All 4 edges of face become selected.

**Result:**
Complete definition of higher element included.

### Expand/Contract Selection

**Using Ctrl When Switching Modes:**

**Expand (Ascending with Ctrl):**
Hold Ctrl when switching to higher mode.

**Effect:**
- All elements touching current selection added
- Selection not needing complete set still added
- Expands selection boundary

**Contract (Descending with Ctrl):**
Hold Ctrl when switching to lower mode.

**Effect:**
- Selection contracts
- Only touching elements added
- Adjusts selection scope

**Use Case:**
Grow or shrink selection by one level without losing selection.

### X-Ray Selection

**Purpose:**
Affects how selection works with occluded geometry.

**X-Ray Enabled:**
- Selection not occluded by object geometry
- Select through solid surfaces
- Select hidden elements

**X-Ray Disabled:**
- Selection stops at first visible surface
- Cannot select through solid geometry
- Selects front-facing elements only

**Visual Difference:**
Enabled shows through-mesh visibility; disabled shows surface-only.

### Basic Select Menu Operations

#### All (A)

**Function:**
Selects all geometry.

**Toggle:**
Running twice deselects all.

#### None (Alt+A)

**Function:**
Deselects all geometry.

**Equivalent:**
Pressing A twice if everything selected.

#### Invert (Ctrl+I)

**Function:**
Selects all unselected geometry, deselects selected.

**Use Case:**
Quickly switch selection to opposite set.

#### Box Select (B)

**Function:**
Interactive box selection.

**Workflow:**
1. Press B
2. Click-drag to define rectangle
3. Geometry inside selected
4. Press Esc to cancel

#### Circle Select (C)

**Function:**
Interactive circular selection.

**Workflow:**
1. Press C
2. Move circle over geometry
3. Scroll to adjust radius
4. LMB to select elements within circle
5. Right-click or Esc to exit

#### Lasso Select

**Function:**
Interactive free-form selection.

**Hotkey:**
Shift+Alt+LMB and drag.

**Workflow:**
1. Hold Shift+Alt and click-drag
2. Draw freehand selection path
3. Release to select enclosed geometry

### Advanced Selection Tools

#### Select Mirror (Shift+Ctrl+M)

**Purpose:**
Select mesh items at mirrored location across chosen axis.

**Use Cases:**
- Symmetric editing
- Mirror selection
- Opposite side selection

**Configuration:**
Choose axis for mirroring (X, Y, or Z).

#### Select Random

**Purpose:**
Selects random group of vertices, edges, or faces.

**Parameter:**
Percentage value for selection density.

**Range:**
0% (none) to 100% (all).

**Use Cases:**
- Random vertex displacement
- Scattered deformation
- Variety in modeling

#### Checker Deselect

**Purpose:**
Deselects alternate elements relative to active item.

**Pattern:**
Creates checkerboard-like deselection.

**Use Cases:**
- Alternating topology patterns
- Regular deselection
- Creating striped selections

#### More/Less

**More (Ctrl+Numpad+):**
Expands selection to adjacent elements of same type.

**Less (Ctrl+Numpad-):**
Contracts selection from adjacent elements.

**Iterative:**
Can repeat to grow/shrink selection progressively.

#### Next/Previous Active

**Next Active (Shift+Ctrl+Numpad+):**
Uses selection history to select next vertex, edge, or face based on surrounding topology.

**Previous Active (Shift+Ctrl+Numpad-):**
Removes last selected element.

**Use Case:**
Navigate selection history without visual guidance.

#### Select Similar (Shift+G)

**Purpose:**
Select elements similar to current selection.

**Criteria Options:**
- Smoothness
- Material
- Face Count
- Face Area
- Perimeter
- Normal direction
- Coplanar faces

**Use Case:**
Select all faces with same properties.

#### Select All by Trait

**Purpose:**
Select geometry by querying characteristics.

**Available Traits:**
- Non Manifold
- Loose Geometry
- Interior Faces
- Faces by Sides
- Poles by Count
- Ungrouped Vertices

### Edge and Face Loop Selection

#### Edge Loops

**Function:**
Select connected edges.

**Access:**
Alt+Click on edge in Edge mode.

**Result:**
Entire loop selected from click point.

#### Face Loops

**Function:**
Select connected faces.

**Access:**
Alt+Click on face edge in Face mode.

**Result:**
Face loop follows edge pattern.

#### Edge Rings

**Function:**
Select connected edge ring.

**Access:**
Ctrl+Alt+Click on edge.

**Result:**
Perpendicular edge loop selected.

#### Sharp Edges

**Purpose:**
Select all edges between faces forming angle greater than threshold.

**Parameter:**
Angle value for edge sharpness.

**Higher Angle:**
Selects sharper edges.

**Use Cases:**
- Select hard edges in hard-surface models
- Identify creases
- Topology analysis

### Linked Selection Tools

#### Select Linked

**Function:**
Selects all components connected to current selection.

**Hotkey:**
Ctrl+L.

**Use Case:**
Select entire connected mesh region.

#### Shortest Path

**Function:**
Path between two selected elements.

**Workflow:**
1. Select first element
2. Shift+Click second element
3. Shortest path highlighted and selected

**Use Case:**
Select specific edge path between points.

#### Linked Flat Faces

**Function:**
Select connected faces based on angle threshold between them.

**Parameter:**
Angle value determines "flatness."

**Use Case:**
Select coplanar faces sharing edges.

### Known Issues and Limitations

#### Dense Meshes

**Issue:**
With X-Ray disabled, dense meshes may not have all elements selected.

**Cause:**
Overlapping vertices may prevent selection of some elements.

**Workaround:**
1. Zoom in closer
2. Or enable X-Ray
3. Use stricter selection criteria

#### N-Gons in Face Select Mode

**Issue:**
N-gon faces display selection dot in middle, which can be confusing.

**Problem Example:**
U-shaped n-gon's center dot appears inside another face within the "U."

**Result:**
Difficult to identify which dot belongs to which face.

**Workaround:**
- Use wireframe mode for clarity
- Use X-Ray to see through geometry
- Hover to preview selection
- Use vertex or edge select mode instead

---

## Quick Reference

### Selection Hotkeys

| Action | Hotkey |
|--------|--------|
| Vertex Mode | 1 |
| Edge Mode | 2 |
| Face Mode | 3 |
| Multiple Modes | Shift+1/2/3 |
| Select All | A |
| Select None | Alt+A |
| Invert Selection | Ctrl+I |
| Box Select | B |
| Circle Select | C |
| Lasso Select | Shift+Alt+Click+Drag |
| Select Mirror | Shift+Ctrl+M |
| Select Similar | Shift+G |
| Select Linked | Ctrl+L |
| More | Ctrl+Numpad+ |
| Less | Ctrl+Numpad- |
| Edge Loop | Alt+Click |
| Face Loop | Alt+Click (Face mode) |
| Edge Ring | Ctrl+Alt+Click |

### Mesh Creation Hotkeys

| Action | Hotkey |
|--------|--------|
| Loop Cut | Ctrl+R |
| Spin | Menu: Mesh → Extrude → Spin |
| Extrude | E |
| Inset | I |
| Bevel | Ctrl+B |

### Tool Access

| Tool | Access |
|------|--------|
| Loop Cut | Ctrl+R or Toolbar |
| Poly Build | Toolbar (Poly Build icon) |
| Spin | Menu or Toolbar |
| Selection Tools | Various hotkeys or Select menu |

---

## Best Practices

### Selection Workflow

1. **Start with appropriate mode** for task
2. **Use preview and highlighting** before confirming
3. **Hold modifiers** (Shift, Ctrl) for mode combinations
4. **Verify selection** visually before operations
5. **Deselect and restart** if selection is wrong

### Loop Cut Workflow

1. Identify topology placement
2. Activate tool (Ctrl+R)
3. Hover over edge to preview
4. Click when position correct
5. Use options panel for fine-tuning
6. Enable "Correct UVs" for textured models

### Spin Tool Workflow

1. Create profile geometry
2. Switch to appropriate view
3. Position 3D cursor at center
4. Select all profile geometry
5. Activate Spin tool
6. Set angle and steps
7. Confirm operation
8. Merge duplicate vertices
9. Recalculate normals

### Poly Build Workflow

1. Enable snapping and auto-merge
2. Add geometry with Ctrl+LMB
3. Move vertices with LMB
4. Delete with Shift+LMB
5. Extrude edges as quads
6. Create quads enabled for clean topology
7. Preview before confirming

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Loop Cut not appearing | Check that you're hovering over an edge, not empty space |
| Wrong selection mode | Check header buttons or press 1/2/3 for correct mode |
| Can't select through geometry | Enable X-Ray (Alt+Z or viewport option) |
| Spin creates offset rotation | Verify 3D cursor position is at intended center |
| Duplicate vertices after spin | Use Merge by Distance to clean up |
| Spin axis wrong direction | Change viewport angle to rotate around different axis |
| Selection disappears | May have switched modes; check selection mode buttons |
| N-gon selection confusing | Switch to wireframe mode or use X-Ray |
| Poly Build not creating quads | Enable "Create Quads" in tool settings |
| Normals inverted after spin | Select all, Alt+N, Recalculate Normals Outside |

---

## Summary

Essential mesh creation and selection tools in Blender:

- **Loop Cut**: Add topology with Ctrl+R
- **Poly Build**: Fast retopology workflow
- **Spin**: Create lathe-style rotated geometry
- **Selection Modes**: Vertex (1), Edge (2), Face (3)
- **Selection Tools**: Box, Circle, Lasso, Mirror, Similar
- **Advanced Selection**: Loops, Linked, Sharp Edges
- **Selection Modifiers**: Expand, Contract, More, Less

Master these tools for professional-quality mesh creation and editing workflows.
