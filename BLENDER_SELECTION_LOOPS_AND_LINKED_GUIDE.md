# Blender Selection: Loops and Linked Geometry Guide

## Overview

This guide covers advanced selection tools for isolating and selecting connected geometry in Blender. These tools are essential for mesh editing workflows, particularly when working with complex topology, overlapping geometry, or selecting entire face/edge sequences. The tools covered include **Select Linked**, **Shortest Path**, **Linked Flat Faces**, **Select Loops**, **Select Sharp Edges**, and **Side of Active**.

These selection methods enable precise topology control and streamline workflows that would otherwise require tedious manual selection.

---

## Select Linked

### Linked (Connected Geometry Selection)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Select Linked ‣ Linked
- **Shortcut**: `Ctrl-L`

**Purpose**
Selects all geometry connected to already selected elements. This is invaluable when a mesh has disconnected, overlapping parts where isolating geometry any other way would be tedious.

**Effect**
When you press `Ctrl-L`, the selection expands to include all geometry that forms a connected island. This works with vertices, edges, and faces depending on current selection mode.

**Use Case**
- Isolating connected parts of a mesh for separate operations
- Cleaning up models with floating geometry
- Selecting entire objects that were accidentally separated
- Working with fragmented assets where parts need individual treatment

**Parameters & Options**

| Option | Effect | Use Case |
|--------|--------|----------|
| **Delimit: None** | Selects all connected geometry without restrictions | General connectivity selection |
| **Delimit: Seams** | Constrains selection to not cross UV seams | Selecting UV islands for unwrapping |
| **Delimit: Sharp Edges** | Stops selection at edges marked as sharp | Isolating geometry along hard edges |
| **Delimit: Materials** | Stops selection at material boundaries | Selecting geometry with same material |
| **Delimit: Face Regions** | Respects face region divisions | Working with discrete mesh regions |

**Access Delimiters**
1. Press `Ctrl-L` to select linked geometry
2. Check the **Adjust Last Operation** panel (bottom-left)
3. Enable desired delimiters before confirming

**Workflow Example: Separating Overlapping Geometry**

1. **Select one element** of the disconnected part (vertex, edge, or face)
2. **Press `Ctrl-L`** to select all connected geometry
3. **Press `P`** to separate (P > Selection)
4. **Confirm separation** - now on separate object
5. **Repeat** for other disconnected parts

### Pick Linked (Direct Selection)

**Purpose**
Select connected geometry directly under the cursor without relying on existing selection.

**Shortcuts**
- **`L`** - Select linked geometry under cursor
- **`Shift-L`** - Deselect linked geometry under cursor

**Effect**
Uses geometry directly under the cursor instead of existing selection. This allows quick selection by pointing at an element rather than selecting first.

**Use Case**
- Quick selection of visible components
- Faster workflow when identifying which parts are connected
- Deselecting entire islands with `Shift-L`
- Working with complex overlapping geometry where visual identification is easier

**Workflow Example: Quick Island Selection**

1. **Position cursor** over desired geometry part
2. **Press `L`** to select the entire connected island
3. **Continue clicking** with `L` to select additional islands
4. **Use `Shift-L`** to deselect islands as needed

---

## Shortest Path

### Path Selection

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Select Linked ‣ Shortest Path
- **Shortcut**: `Ctrl-LMB` (Ctrl + Left Mouse Button)

**Purpose**
Selects all geometry along the shortest path from the active vertex, edge, or face to the one you click on. This creates selections that follow mesh topology between two points.

**Effect**
When you `Ctrl-LMB` on a target element, Blender traces the shortest path through connected geometry and selects all elements along that path. The path respects mesh connectivity and can be constrained by various criteria.

**Use Case**
- Selecting edge sequences for beveling or loop operations
- Creating selection bridges between distant parts
- Marking seams or sharp edges along specific paths
- Identifying topology paths visually

**Parameters & Options**

| Parameter | Effect | Range/Options |
|-----------|--------|---------------|
| **Edge Tag** | Determines action for selected edges | Select, Tag Seam, Tag Sharp, Tag Crease, Tag Bevel, Tag Freestyle Edge Mark |
| **Face Stepping** | Enables diagonal paths for vertices/faces | Toggle - supports edge rings with edges |
| **Topology Distance** | Uses edge count instead of edge length | Toggle - ignores physical distance |
| **Fill Region** | Shortcut: `Shift-Ctrl-LMB` | Selects all shortest paths from active to clicked area |

### Edge Tag Options

**Select**
- **Effect**: Just selects all edges in the path
- **Use**: General topology visualization and selection

**Tag Seam**
- **Effect**: Marks all edges in path as seams for UV unwrapping
- **Use**: Quickly establishing UV seam lines along mesh topology
- **Result**: Edges display in orange in Edit Mode

**Tag Sharp**
- **Effect**: Marks all edges as sharp for Edge Split Modifier
- **Use**: Creating hard edges along a path
- **Result**: These edges don't smooth when Smooth Shading applied

**Tag Crease**
- **Effect**: Marks edges as creases for Subdivision Surface Modifier with weight 1.0
- **Use**: Creating creases in subdivided meshes without additional geometry
- **Result**: Crease weight visible in Properties

**Tag Bevel**
- **Effect**: Gives bevel weight 1.0 to all edges in path
- **Use**: Pre-marking edges for Bevel Modifier application
- **Result**: Edges beveled when Bevel Modifier applied

**Tag Freestyle Edge Mark**
- **Effect**: Marks edges as Freestyle edges for NPR rendering
- **Use**: Creating stylized outlines and artistic renders
- **Result**: Edges render with Freestyle line settings

### Advanced Path Options

**Face Stepping**
- **Purpose**: Supports diagonal paths for vertices and faces
- **Effect**: Allows path selection to move diagonally across faces
- **Use Case**: Creating non-linear selection paths across topology

**Topology Distance**
- **Purpose**: Calculates path based on edge count, not physical distance
- **Effect**: Path follows connectivity regardless of edge length
- **Use Case**: Large meshes with varying edge sizes
- **Difference**: With disabled = physical shortest path; With enabled = topological shortest path

**Fill Region** (`Shift-Ctrl-LMB`)
- **Purpose**: Selects all shortest paths from active selection to clicked area
- **Effect**: Creates multiple paths simultaneously filling a region
- **Use Case**: Selecting entire mesh regions in complex topology

**Workflow Example: Creating UV Seams Along Path**

1. **Switch to Edge Select Mode** (press `2`)
2. **Set Active Edge** by clicking desired starting edge
3. **Ctrl-LMB** on ending edge to preview path
4. **In Adjust Last Operation**, set Edge Tag to "Tag Seam"
5. **Confirm** - all edges in path marked as seams
6. **Repeat** for additional seam paths
7. **Unwrap UVs** - seams will prevent island distortion

---

## Linked Flat Faces

### Coplanar Face Selection

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Select Linked ‣ Linked Flat Faces

**Purpose**
Selects all connected faces with a similar angle. Identifies and groups faces lying on the same or similar planes.

**Effect**
Starting from selected faces, this tool expands selection to include all adjacent faces that maintain a consistent angle relationship. Useful for isolating planar regions in curved or faceted geometry.

**Use Case**
- Selecting flat wall surfaces in architectural models
- Identifying all faces in a faceted sphere that share the same angle
- Isolating smooth versus sharp transitions in geometry
- Selecting surface continuity regions

**Parameters & Options**

| Parameter | Default | Effect | Use Case |
|-----------|---------|--------|----------|
| **Sharpness** | 0.01 radians (~0.57°) | Angle threshold for face similarity | Determines how "flat" faces must be to select together |

**Sharpness Explanation**
- **Low values** (0.01-0.1): Only faces on nearly identical planes selected
- **Mid values** (0.5-1.0): Allows slight angles, groups gentle curves
- **High values** (1.5+): Includes significantly angled faces, groups rough geometry

**Visual Behavior**

When at least one face is selected:

1. **Without Tool**: Only selected face visible
2. **With Tool (Low Sharpness)**: All faces on same plane selected (middle)
3. **With Tool (High Sharpness)**: Smoothed/beveled corners included

**Workflow Example: Selecting Smooth Surface Regions**

1. **Select one face** on smooth surface (click face in Face Select Mode)
2. **Open Select Menu** ‣ Select Linked ‣ Linked Flat Faces
3. **Increase Sharpness** in Adjust Last Operation until desired region selected
4. **Confirm selection** when correct area highlighted
5. **Apply operation** (smooth, assign material, etc.) to selection

**Workflow Example: Isolating Faceted Model Sections**

1. **Select face** on sphere with visible faceting
2. **Use Linked Flat Faces** with default Sharpness
3. **Each face group** represents one facet plane
4. **Select multiple** by Shift-clicking different facets
5. **Apply smooth/hard edge** settings per facet

---

## Select Loops

Loop selection tools enable selecting entire sequences of connected elements—edge loops, face loops, and edge rings. These are fundamental for controlling topology flow and performing efficient mesh edits.

### Select Edge Loops

**Reference**
- **Mode**: Edit Mode (Vertex or Edge select mode)
- **Menu**: Select ‣ Select Loops ‣ Edge Loops
- **Shortcut**: `Alt-LMB` (select) or `Shift-Alt-LMB` (add to selection)

**Purpose**
Selects a loop of edges connected in a line end-to-end. This traces continuous edge sequences across the mesh topology.

**Effect**
- **`Alt-LMB` on edge**: Selects complete loop
- **`Shift-Alt-LMB` on edge**: Adds loop to existing selection
- **In Vertex mode**: Click on edges (not vertices) with same shortcuts

**Behavior Notes**

| Behavior | Explanation | Example |
|----------|-------------|---------|
| **Loop Termination** | Loop ends when hitting vertex with 5+ edge connections (poles) | UV sphere's north/south poles stop loops |
| **Closed Loops** | Latitudinal loops on sphere form closed loops (no terminus) | Full circle around sphere's equator |
| **Open Loops** | Longitudinal loops on sphere open (hit poles, stop) | Half-circle from pole to pole |

**Pole Definition**
- **Regular vertex**: 4 edge connections
- **Pole vertex**: 5+ edge connections (from sphere primitive caps)
- **Boundary vertex**: 3 or fewer edge connections (at mesh edge)
- Loop selection respects these topological constraints

**Visual Examples**

```
Sphere with Edge Loops:
- Longitudinal: Runs north-south (open because hits poles)
- Latitudinal: Runs east-west (closed continuous loop)
- Different angles: 45° diagonal (open, hits poles)
```

### All Boundaries (Secondary Loop Selection)

**Purpose**
Selecting a boundary edge a second time selects all boundary edges on the mesh.

**Technique**
1. **Select one boundary edge** with `Alt-LMB`
2. **`Alt-LMB` on same edge again** to select all boundaries
3. Useful for meshes with **triangles and n-gons** where normal loop select fails

**Use Case**
- Hardening mesh borders
- Quickly selecting all open edges
- Preparing models for retopology or sealing

### Select Face Loops

**Reference**
- **Mode**: Edit Mode (Face or Vertex select modes)
- **Shortcut**: `Alt-LMB` (Face mode) or `Ctrl-Alt-LMB` (Vertex mode)

**Purpose**
Selects a loop of faces connected in a line end-to-end, along opposite edges. Creates selections that span across face sequences perpendicular to the loop direction.

**Effect in Face Select Mode**
- **`Alt-LMB` on edge**: Selects loop of faces perpendicular to that edge
- **`Shift-Alt-LMB` on edge**: Adds face loop to selection
- Loop extends in both directions along opposite face edges

**Effect in Vertex Select Mode**
- **`Ctrl-Alt-LMB` on edge**: Selects corresponding edge ring (implicitly selects face loop)
- Works because opposite edge selection implies full face selection
- Selecting opposite edges of quad face selects the entire face

**Visual Behavior**

```
Face Loop Selection:
- Click edge between 2 faces
- Selection extends perpendicular along faces
- Continues until hitting boundary or pole
- Forms visible loop perpendicular to clicked edge
```

**Workflow Example: Selecting Body Rings in Character Mesh**

1. **Switch to Face Select Mode** (press `3`)
2. **Alt-LMB on edge** running around character's waist
3. **Entire ring of faces** around middle selected
4. **Apply smooth/hard** shading or material assignment
5. **Shift-Alt-LMB** on another edge to add additional loops
6. **Perform operation** on all selected face loops simultaneously

### Select Edge Rings

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Select Loops ‣ Edge Rings
- **Shortcut**: `Ctrl-Alt-LMB` (Ctrl + Alt + Left Mouse)

**Purpose**
Selects a sequence of non-connected edges on opposite sides of face loops. These edges create a visual "ring" pattern across faces without being directly connected.

**Effect**
Unlike edge loops which connect end-to-end, edge rings skip across faces in a pattern, selecting opposite edges as they proceed around topology.

**Key Difference: Loop vs Ring**

| Feature | Edge Loop | Edge Ring |
|---------|-----------|-----------|
| **Connection** | End-to-end connected edges | Non-connected opposite edges |
| **Pattern** | Single continuous sequence | Alternating pattern across faces |
| **Selection** | `Alt-LMB` | `Ctrl-Alt-LMB` |
| **Topological Flow** | Follows one direction | Crosses faces perpendicularly |
| **Use** | Creating seams, extrusion lines | Creating strips, ring selections |

**Vertex Mode Behavior**
- **`Ctrl-Alt-LMB` on edge in Vertex mode**: Selects face loop implicitly
- Selecting opposite edges of face implies selecting entire face
- Result: Face loop selected via edge ring action

**Important: Face Mode Edge Ring Behavior**
- **Issue**: If edge ring selected in Face Select Mode, edges selected but not all faces
- **Reason**: Faces need all 4 edges selected for selection recognition
- **Solution**: Switch to Vertex Select Mode first (auto-floods selection), then switch to Face Select Mode

**Workflow Example: Selecting Edge Rings Across Cylinder**

1. **Select Edge Select Mode** (press `2`)
2. **`Ctrl-Alt-LMB`** on edge at cylinder's base
3. **Ring of opposite edges** selected vertically around cylinder
4. **Compare to `Alt-LMB`**: Loop selection would go around base (different direction)
5. **Apply bevel or extrude** along entire edge ring

---

## Select Loop Inner-Region

**Reference**
- **Mode**: Edit Mode (Edge select mode)
- **Menu**: Select ‣ Select Loops ‣ Select Loop Inner-Region

**Purpose**
Selects all faces that lie inside a closed loop of edges. Requires a closed edge loop perimeter.

**Effect**
Creates face selection from edge loop boundary. Works with Edge select mode but can be used in Vertex/Face modes with unexpected results.

**Behavior Notes**
- **Closed loops only**: Open loops treat all connected edges as "inside"
- **Multiple loops**: Handles multiple separate loops (selects each interior)
- **Holes within**: Correctly handles holes and complex topology

**Workflow Example: Selecting Face Island Within Loop**

1. **Select entire edge loop** with `Alt-LMB` (must be closed)
2. **Select ‣ Select Loops ‣ Select Loop Inner-Region**
3. **All faces inside loop** selected
4. **Perform operation**: Assign material, smooth, delete, etc.
5. Works with arbitrary closed loops, not just regular shapes

**Use Cases**
- Selecting face island inside circular edge loop
- Selecting interior region of polygon perimeter
- Handling holes within selections (holes correctly ignored)
- Creating complex face selections via edge topology

---

## Select Boundary Loop

**Reference**
- **Mode**: Edit Mode (Edge select mode)
- **Menu**: Select ‣ Select Loops ‣ Select Boundary Loop

**Purpose**
Opposite of Loop Inner-Region. Selects only edges at the border (contour) of currently selected regions. Forces into Edge Select Mode.

**Effect**
- **Input**: Face or edge selection
- **Output**: Only boundary edges selected
- **Behavior**: Switches to Edge select mode after operation
- **Works with**: Any select mode input (Face, Edge, Vertex)

**Functionality**
- Extracts selection outline/contour
- Creates edge selection from boundary
- Handles multiple disconnected regions
- Ignores interior edges completely

**Workflow Example: Selecting Model Silhouette**

1. **Select all faces** of object (press `A` in Face Select Mode)
2. **Select ‣ Select Loops ‣ Select Boundary Loop**
3. **Switches to Edge mode** automatically
4. **Only outer edges** of model selected
5. **Apply operation**: Mark as seams, create outline, etc.

**Workflow Example: Selecting Hole Edges**

1. **Select faces** including hole (all faces except hole interior)
2. **Select Boundary Loop**
3. **Both outer edge AND hole edges** selected
4. **Perfect for**: Seaming at boundaries, beveling edges

---

## Select Sharp Edges

### Hard Edge Selection

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Select Sharp Edges

**Purpose**
Selects edges whose faces intersect at an acute angle. Identifies hard, sharp edges in mesh geometry.

**Effect**
Analyzes angle between adjacent faces and selects edges that meet at sharp angles. Useful for finding existing hard edges or detecting areas with unexpected sharpness.

**Use Case**
- Finding hard edges in otherwise smooth meshes
- Detecting problematic geometry transitions
- Selecting edges for beveling
- Validating mesh edge sharpness

**Parameters & Options**

| Parameter | Default | Effect | Use Case |
|-----------|---------|--------|----------|
| **Sharpness** | 30° | Angle threshold for sharp edge detection | Determines how acute edges must be |

**Sharpness Values**

| Value | Behavior | Selection Result |
|-------|----------|------------------|
| **Low (10-20°)** | Very selective | Only extremely sharp edges |
| **Default (30°)** | Moderate | Hard transitions and creases |
| **High (60-90°)** | Inclusive | Most non-smooth transitions |

**Workflow Example: Finding Hard Edges in Smooth Model**

1. **Select All** (press `A`)
2. **Select ‣ Select Sharp Edges**
3. **Default Sharpness** finds most acute edges
4. **Adjust Sharpness** if needed in Adjust Last Operation
5. **Increase Sharpness** to include softer transitions
6. **Use selection** for visualization or operation application

**Workflow Example: Pre-Beveling Hard Edges**

1. **Select Sharp Edges** with appropriate Sharpness threshold
2. **Press `Ctrl-B`** to enter Bevel mode
3. **Move mouse** to set bevel amount
4. **Click** to confirm bevel
5. **Result**: All hard edges beveled simultaneously

**Advanced: Detecting Mesh Issues**
- Unexpected sharp edges indicate **topology problems**
- Use to find **split normals** or **hard-edge artifacts**
- Validate **smooth shading** regions

---

## Side of Active

### Directional Selection

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ Side of Active

**Purpose**
With an active vertex, selects all vertices in a specified direction. Similar to Loop Inner-Region but determined by direction from active vertex instead of closed loop.

**Effect**
Fills selection in specified direction from active vertex outward. Creates selections based on directional axes rather than topology.

**Use Case**
- Selecting one side of a model (left/right, top/bottom)
- Dividing mesh into directional sections
- Creating bilateral selections
- Selecting geometry aligned along axes

**Parameters & Options**

| Parameter | Effect | Options |
|-----------|--------|---------|
| **Axis Mode** | Determines selection behavior | Positive/Negative Axis, Aligned Axis |
| **Axis** | Direction of selection | X, Y, Z (World or Local) |
| **Threshold** | Influence amount outside perimeters | Range 0.0-1.0+ |

### Axis Mode Options

**Positive/Negative Axis**
- **Positive Axis**: Selects all vertices in positive direction along chosen axis
- **Negative Axis**: Selects all vertices in negative direction along chosen axis
- **Effect**: Creates hemispheric selection from active vertex
- **Use**: Left/right side selection, top/bottom splits

**Aligned Axis**
- **Purpose**: Only selects vertices in-line with active vertex
- **Effect**: Creates linear selection along axis through active vertex
- **Use**: Selecting vertical or horizontal columns of geometry
- **Difference**: Much more selective than Positive/Negative

### Additional Parameters

**Threshold**
- **Range**: 0.0 to unlimited
- **Effect**: Expands selection area perpendicular to primary axis
- **Low values**: Tight selection along axis
- **High values**: Wider selection bands
- **Use**: Fine-tuning selection boundaries

**Workflow Example: Selecting Left Side of Character**

1. **Switch to Vertex Select Mode** (press `1`)
2. **Click on center vertex** to make it active (center seam)
3. **Select ‣ Side of Active**
4. **Set Axis** to X
5. **Set Axis Sign** to Negative (assuming left is -X)
6. **Adjust Threshold** to include/exclude edges
7. **Confirm** - left half of character selected
8. **Apply symmetry operation** or material assignment

**Workflow Example: Selecting Aligned Vertical Geometry**

1. **Active vertex** in middle of model (center of mass preferred)
2. **Axis Mode**: Set to "Aligned Axis"
3. **Axis**: Choose Z (vertical)
4. **Effect**: Only vertices directly above/below active vertex selected
5. **Useful for**: Column-based geometry sections

**Advanced: Complex Selections**

By combining multiple operations:
1. **Side of Active** to select directional region
2. **Refine with other tools** (Sharp Edges, Similar, etc.)
3. **Create complex selections** from simple direction + properties

---

## Quick Reference: Keyboard Shortcuts

| Tool | Shortcut | Mode | Effect |
|------|----------|------|--------|
| **Select Linked** | `Ctrl-L` | Edit | Select connected geometry |
| **Pick Linked** | `L` | Edit | Select linked under cursor |
| **Pick Linked Deselect** | `Shift-L` | Edit | Deselect linked under cursor |
| **Shortest Path** | `Ctrl-LMB` | Edit | Select path between elements |
| **Fill Region** | `Shift-Ctrl-LMB` | Edit | Select multiple paths to area |
| **Edge Loop** | `Alt-LMB` | Edit (E/V mode) | Select edge loop |
| **Edge Loop Add** | `Shift-Alt-LMB` | Edit (E/V mode) | Add edge loop to selection |
| **Face Loop** | `Alt-LMB` | Edit (F mode) | Select face loop |
| **Face Loop Alt** | `Ctrl-Alt-LMB` | Edit (V mode) | Face loop via vertex mode |
| **Edge Ring** | `Ctrl-Alt-LMB` | Edit (E mode) | Select edge ring |
| **All Boundaries** | `Alt-LMB` (2x) | Edit | Select all boundary edges |
| **Select Sharp Edges** | Menu | Edit | Selects sharp edges |
| **Loop Inner-Region** | Menu | Edit (E mode) | Select faces inside loop |
| **Boundary Loop** | Menu | Edit (E mode) | Select boundary edges only |
| **Linked Flat Faces** | Menu | Edit | Select coplanar connected faces |
| **Side of Active** | Menu | Edit | Select directional region |

---

## Best Practices

### Loop Selection Workflow
- **Edge loops**: Use for extrude patterns and topology control
- **Face loops**: Ideal for material application and shading zones
- **Edge rings**: Perfect for strip selections and bevel applications
- **Preview before confirming**: Visual feedback essential for accuracy

### Linked Geometry Selection
- **Use delimiters** to constrain across seams/materials
- **Pick Linked** faster than selecting then using Linked
- **Check for hidden geometry** before selecting (may include invisible parts)
- **Separate disconnected parts** immediately to prevent accidental merging

### Path Selection Techniques
- **Set Edge Tag first** (in Adjust Last Operation) before confirming
- **Use Topology Distance** for consistent paths in varied edge lengths
- **Tag Seams strategically** along topology flow lines
- **Fill Region** powerful for complex mesh divisions

### Sharp Edge Detection
- **Run on whole mesh** first to understand edge topology
- **Lower Sharpness** to find only critical edges
- **Investigate unexpected sharp edges** (may indicate problems)
- **Use with Edge Split Modifier** for final shading control

### Directional Selection
- **Always set active vertex first** (click, don't Shift-click)
- **Use Aligned Axis** when geometric precision needed
- **Threshold critical** for edge geometry inclusion
- **Combine with constraints** (Shift-select) for multi-section splits

### Complex Selection Chains
1. **Start with rough selection** (Loop/Linked/Side)
2. **Refine with specific tools** (Similar, Sharp, Flat Faces)
3. **Invert selection** if needed (Ctrl-I) for inverse operation
4. **Apply operation** to final refined selection

---

## Troubleshooting

### Issue: Edge Loop Selection Unexpected
**Symptom**: Loop selection terminates early or doesn't form closed loop
**Cause**: Mesh has poles (5+ edge connections) or boundaries
**Solution**: 
- Check for pole vertices (sphere primitives have poles at caps)
- Use loop boundary selection for edge loops hitting poles
- Edge rings may work better for poles

### Issue: Face Loop Selection Not Working
**Symptom**: No faces selected with Alt-LMB on edge
**Cause**: May be in Edge select mode, not Face mode
**Solution**:
- Switch to Face Select Mode (press `3`)
- In Vertex mode, use `Ctrl-Alt-LMB` instead
- Ensure clicking on edge, not vertex

### Issue: Edge Ring Selection Doesn't Select Faces
**Symptom**: Selected edges but faces remain unselected in Face mode
**Cause**: Not all edges of faces are selected (faces need all 4 edges)
**Solution**:
1. Switch to Vertex Select Mode (auto-floods)
2. Switch back to Face Select Mode
3. All partial faces now select completely

### Issue: Linked Selection Includes Unwanted Geometry
**Symptom**: Selection includes floating/overlapping parts
**Cause**: Geometry is physically connected despite being overlapped
**Solution**:
- Use Delimit options (Seams, Sharp Edges, Materials)
- Merge separate parts before selection
- Pre-split into separate objects

### Issue: Loop Inner-Region Selects Everything
**Symptom**: Entire mesh selected instead of region
**Cause**: Edge loop is not closed
**Solution**:
- Ensure selected edge loop is completely closed
- Check for gap in loop selection
- Create closed loop manually if needed

### Issue: Sharp Edge Selection Missing Edges
**Symptom**: Expected hard edges not selected
**Cause**: Sharpness threshold set too low
**Solution**:
- Increase Sharpness value in Adjust Last Operation
- Preview with higher values (60-90°)
- Check edge properties (may not be hard edges)

### Issue: Side of Active Selects Wrong Direction
**Symptom**: Opposite side selected than expected
**Cause**: Active vertex axis direction assumption incorrect
**Solution**:
- Verify active vertex location and model orientation
- Try Negative instead of Positive axis
- Use Transform Orientations for reference

### Issue: Pick Linked (L Key) Selecting Entire Mesh
**Symptom**: L key selects far more than intended
**Cause**: Entire mesh is topologically connected
**Solution**:
- Separate parts before selection
- Use Select Linked with delimiters instead
- Check for hidden internal connections

---

## Advanced Workflows

### Workflow 1: Creating UV Seams Along Hard Edges

```
1. Select Sharp Edges (default threshold)
2. In Adjust Last Operation:
   - Adjust Sharpness if needed
3. Confirm selection (only hard edges selected)
4. Select ‣ Select Linked ‣ Shortest Path
5. Set Edge Tag to "Tag Seam"
6. Confirm - all edges marked as seams
7. UV ‣ Unwrap (will respect seams)
```

### Workflow 2: Selecting Character Body Sections

```
1. Switch to Face Select Mode
2. Alt-LMB on edge at waist (creates face loop)
3. Shift-Alt-LMB on edge at shoulders (adds loop)
4. Shift-Alt-LMB on edge at hips (adds loop)
5. Three horizontal sections now selected
6. Assign different materials or smooth groups
7. Result: Body naturally divided by face loops
```

### Workflow 3: Retopology Using Edge Loops

```
1. Loop Cut (Ctrl-R) to add edge lines
2. Alt-LMB to select edge loop across topology
3. Shift-Alt-LMB to extend with face loops
4. Build new topology following edge loops
5. Extrude and manipulate loop selections
6. Result: Clean topology following visible features
```

### Workflow 4: Model Side Splitting for Symmetry

```
1. Add vertex at center line (extrude, place at origin)
2. Set as active vertex
3. Select ‣ Side of Active
4. Set Axis to X, Axis Mode to Aligned Axis
5. Adjusts Threshold to include boundary
6. Select left side of model
7. Mirror modifier will use this for symmetry
```

### Workflow 5: Isolating Material Regions

```
1. Select one face with specific material
2. Select ‣ Select Linked ‣ Linked with Delimit: Materials
3. All faces with same material selected
4. Apply operation to material group
5. Repeat for other materials
6. Result: Efficient material-based editing
```

---

## Summary

Loop and linked selection tools form the foundation of efficient mesh editing in Blender. Key takeaways:

1. **Loop selections** (Edge, Face, Ring) control topology flow and extrusion patterns
2. **Linked selections** (Linked, Pick Linked) quickly isolate connected geometry
3. **Path selections** (Shortest Path) mark seams/creases along topology
4. **Special selections** (Sharp Edges, Flat Faces, Side of Active) address specific geometry properties
5. **Combining tools** creates powerful, complex selections for advanced workflows

Master these selection methods and you'll dramatically speed up mesh editing tasks, from retopology to UV unwrapping to material assignment. These tools are fundamental to professional Blender modeling.

---

## Related Documentation

For comprehensive modeling knowledge, refer to:
- [Blender Modeling Guide](BLENDER_MODELING_GUIDE.md)
- [Blender Meshes Guide](BLENDER_MESHES_GUIDE.md)
- [Blender Mesh Tools Guide](BLENDER_MESH_TOOLS_GUIDE.md)
- [Blender Mesh Selection and Creation Tools](BLENDER_MESH_SELECTION_AND_CREATION_TOOLS.md)
- [Blender Advanced Mesh Selection Tools](BLENDER_ADVANCED_MESH_SELECTION_TOOLS.md)
