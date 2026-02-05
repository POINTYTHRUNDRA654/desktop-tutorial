# Blender Transform Operators Guide

## Scope
- Edit Mode transform tools: Move (G), Rotate (R), Scale (S)
- Slide variants (G G for Edge/Vertex Slide)
- To Sphere (Shift-Alt-S)
- Shear (Shift-Ctrl-Alt-S)
- Transform panel data (positions, space), vertex/edge data (bevel weight, crease)
- Gizmos and Adjust Last Operation panel for fine control

---

## Move, Rotate, Scale

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Transform ‣ Move / Rotate / Scale
- **Tool**: Toolbar gizmos
- **Shortcuts**: `G` (Move), `R` (Rotate), `S` (Scale)
- Applies standard transforms to selected vertices/edges/faces.
- Implicitly updates connected elements (e.g., moving an edge moves its vertices and attached faces).

**Slide Shortcut**

**Gizmo vs Shortcut**

- Use **Adjust Last Operation** to change orientation, constraints, and proportional falloff without redoing.
- Numeric input: type values after invoking transform; use `Tab` to hop fields when gizmo active.

---

## Transform Panel (Sidebar)
- **Panel**: Sidebar ‣ Transform


**Vertex Data**
**Edge Data**
- **Bevel Weight** (0.0–1.0): Bevel intensity per edge (also set via Edge Bevel Weight operator).
## To Sphere


**What it does**
**Usage**
1. Select mesh elements.

**Quality Notes**
**Typical Uses**
- Rounding corners or forming bulbs on meshes.


**Reference**
- **Mode**: Object & Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Shear
- **Shortcut**: `Shift-Ctrl-Alt-S`

**What it does**
- Slides elements parallel to the view’s horizontal axis; direction set by mouse and pivot.
- Elements above/below the horizontal axis move in opposite directions relative to the pivot plane.

**Options (Adjust Last Operation / Tool Settings)**
- **Offset**: Magnitude of shift from original location.
- **Axis**: Defines one axis of the shearing plane.
- **Axis Orthographic**: Defines the other axis (must differ from Axis).
- **Orientation**: Uses current transform orientation (Global, Local, etc.).
- **Proportional Editing**: Optional soft falloff.

**Pivot Sensitivity**
- Pivot determines the shear plane. Median Point vs 3D Cursor changes direction and magnitude distribution.

**Warnings**
- **Axis** and **Axis Orthographic** cannot match; otherwise the plane collapses and geometry can disappear.

**Usage Flow**
1. Set pivot (Median, 3D Cursor, etc.).
2. Run **Shear** (`Shift-Ctrl-Alt-S`).
3. Drag to shear; confirm.
4. Adjust Offset/axes/orientation in **Adjust Last Operation**.

**Tips**
- Distance from the shear plane scales the effect: farther = stronger shear.
- Use orthographic views for predictable results; align the view with the intended shear plane.

---

## Mirror (Interactive & Axis Presets)

**Reference**
- **Mode**: Object & Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Mirror ‣ Interactive Mirror
- **Shortcuts**: `Ctrl-M`, then axis (`X`, `Y`, `Z`); `X/Y/Z Global` and `X/Y/Z Local` menu entries for one-click mirrors

**What it does**
- Flips selected elements across chosen axes, equivalent to scaling by -1 on that axis, with orientation and pivot control.
- Interactive mirror uses current Transform Orientation and Pivot Point; one-click Global/Local mirrors use world or object axes directly.

**Usage Flow (Interactive)**
1. Set **Pivot Point** (e.g., 3D Cursor for custom center).
2. Set **Transform Orientation** (Global/Local/Normal, etc.).
3. Press `Ctrl-M`, then `X`, `Y`, or `Z`.
4. Press the same axis again to toggle between orientation and global.
5. Drag with MMB to mirror interactively if needed.

**One-Click Presets**
- **X/Y/Z Global**: Mirrors along world axes.
- **X/Y/Z Local**: Mirrors along object local axes.

**Tips**
- For non-destructive workflow, prefer **Mirror Modifier**.
- Place the 3D cursor where you want the mirror plane if using cursor pivot.
- Be mindful of normals and orientation—mirroring can flip them; recalc if shading looks wrong.

---

## Duplicate (Shift-D)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Duplicate
- **Shortcut**: `Shift-D`

**What it does**
- Copies selected elements with no connections to the original (unlike Extrude).
- Places the duplicate at the original location, selects the copy, and enters Move mode.

**Options (Toolbar/Adjust Last Operation)**
- **Vector Offset**: Set translation explicitly after duplication.
- **Proportional Editing**: Optional falloff while moving the duplicate.
- **Duplication Mode / Axis Constraints**: Constrain movement during placement.

**Notes**
- Duplicates keep vertex groups, material indices, sharp/seam flags, and other element properties.
- Great for reusing detail patches without altering topology continuity.

**Workflow**
1. Select elements.
2. `Shift-D` to duplicate; move immediately (axis constrain if needed).
3. Click/Enter to confirm; tweak offset in Adjust Last Operation if desired.

---

## Extrude (Alt-E Menu)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Extrude (context-sensitive)
- **Shortcut**: `Alt-E` (opens menu; per-element shortcuts also exist)

**Variants (contextual)**
- **Extrude Faces**
- **Extrude Faces Along Normals**
- **Extrude Individual Faces**
- **Extrude Manifold** (for manifold face selections)
- **Extrude Edges**
- **Extrude Vertices**
- **Extrude Repeat** (array-like repetition along view Z)

**General Behavior**
- Creates connected new geometry from the selection, keeping topology continuous.
- Most variants enter move/adjust mode immediately; constrain with axes or numeric input.

**Extrude Repeat**
- **Offset X/Y/Z**: Distance between instances (view Z-based).
- **Steps**: Number of repeats.
- **Scale Offset**: Multiplier to grow/shrink successive steps.

**Tips**
- Use Along Normals for even shell offsets; Individual Faces for panelizing surfaces.
- Manifold variant reduces self-intersections on clean manifold selections.
- Repeat is handy for quick stair/array-like runs without a modifier.

---

## Merge (M)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Merge; Context Menu ‣ Merge
- **Shortcut**: `M`

**Options**
- **At Center**: Merge to selection median (all modes).
- **At Cursor**: Merge to 3D cursor (all modes).
- **Collapse**: Merge each selected island to its own median (one vertex per island).
- **At First**: Merge to first selected (Vertex mode only; requires selection order).
- **At Last**: Merge to last/active (Vertex mode only; requires selection order).
- **UVs**: When enabled in Adjust Last Operation, preserves UVs to avoid distortion.

**Notes**
- Order-dependent options lose order if you switch selection modes in between.
- Merging removes participating edges/faces but preserves partially involved geometry when possible.

**Use Cases**
- Cleaning doubles or collapsing loops without deleting islands (Collapse).
- Snapping verts to cursor for symmetry repairs (At Cursor + 3D cursor on plane).
- Finalizing topology after snapping/aligning vertices.

---

## Split (Alt-M menu)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Split
- **Shortcut**: `Alt-M` (menu) / `Y` for Split Selection

**What it does**
- Disconnects selected elements from the surrounding mesh, duplicating border edges and leaving the copy in place.
- Resulting geometry is separated but coincident until you move it.

**Variants**
- **Selection** (`Y`): Splits current selection from neighbors; border edges are duplicated.
- **Faces by Edges**: Like Rip—duplicates selected interior/border edges, creating a hole bounded by the duplicated edges.
- **Faces & Edges by Vertices**: Also splits connecting vertices, effectively ripping all faces/edges from selected verts.

**Tips**
- After Split Selection, move (`G`) to reveal separation.
- Faces by Edges: select touching interior edges or border edges to punch a hole.
- Faces & Edges by Vertices: use when you need full detachment at vertices (multi-face rip).

---

## Separate (P)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Separate
- **Shortcut**: `P`

**What it does**
- Breaks selected geometry into a new object (or multiple objects) based on chosen mode.

**Modes**
- **Selection**: Only selected elements become a new object.
- **By Material**: Splits faces into objects per assigned material.
- **By Loose Parts**: Creates one object per disconnected island.

**Use Cases**
- Extracting parts for separate modifiers or export.
- Material-based splits for baking or organization.
- Quickly isolating loose parts into individual objects.

**Tips**
- Ideal precursor to using Mirror Modifier on halves: select half, Separate Selection.
- By Loose Parts is great after importing messy meshes to organize islands.

---

## Bisect

**Reference**
- **Mode**: Edit Mode
- **Tool**: Toolbar ‣ Knife ‣ Bisect
- **Menu**: Mesh ‣ Bisect

**What it does**
- Cuts the mesh with a custom plane defined by a drawn line; can optionally delete one side and/or fill the cut.

**Workflow**
1. LMB click-drag to draw the cut line (view-plane based).
2. In Adjust Last Operation set **Plane Point/Normal** for numeric precision.
3. Optional: **Fill** to cap the cut; **Clear Inner/Outer** to delete one side.
4. **Axis Threshold**: snap the cut to nearby geometry within a distance.

**Controls**
- **Move**: Spacebar (adjust line location while active)
- **Snap**: Ctrl (15° angle constraint)
- **Flip**: F (swap inner/outer when clearing)

**Notes**
- Uses view plane; align view for predictable plane orientation.
- Fill inherits materials/UV/Color Attributes from surrounding geometry.

---

## Knife Project

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Knife Project

**What it does**
- Projects selected (non-Edit-Mode) objects’ outlines along the view axis and cuts meshes in Edit Mode, selecting the projected geometry.

**Workflow**
1. Select the target mesh and enter **Edit Mode**.
2. In Outliner (Ctrl-LMB) select cutting objects (stay in Edit Mode).
3. Align the view for the projection axis (use ortho views for accuracy).
4. Run **Knife Project**; enable **Cut Through** to project through the back.

**Requirements**
- Cutting objects must be curves or non-manifold (flat) meshes/edges.
- Lock Object Modes if Blender jumps to Object Mode when selecting cutters.

**Tips**
- Use ortho views (Front/Right/Top) for clean projections.
- After projection, newly cut faces/edges are selected for immediate editing.

---

## Knife Topology Tool (K)

**Reference**
- **Mode**: Edit Mode
- **Tool**: Toolbar ‣ Knife
- **Menu**: Mesh ‣ Knife Topology Tool
- **Shortcut**: `K` (Shift-K starts Only Selected)

**What it does**
- Interactive cutting to create edges/verts across faces; can close loops and cut multiple objects with Multi-Object Editing.

**Core Controls**
- **Cut**: LMB click (or drag to draw)
- **Close Loop**: Double LMB
- **Confirm**: Space/Enter
- **Cancel**: Esc
- **Stop current path/start new**: RMB
- **Undo segment**: Ctrl-Z

**Snapping/Visibility**
- **Occlude Geometry**: Only cut visible faces; toggle **C** for Cut Through.
- **Only Selected**: Shift-K to cut only selected geometry.
- **X-Ray**: V to show hidden path.
- **Midpoint Snap**: Shift; **Ignore Snap**: Ctrl.
- **Axis constrain**: X/Y/Z (press twice for local).

**Angle Snapping/Measurements**
- **Angle Constraint**: A cycles off / screen snap / relative snap; **Snap Increment** sets angle step; **R** cycles reference edge when in Relative.
- **Measure display**: S cycles distances/angles/both.

**Notes**
- If duplicate verts appear, reduce clip start or adjust depth settings.
- Works with Multi-Object Editing; set view intentionally for plane reference.

---

## Convex Hull

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Convex Hull

**What it does**
- Generates the convex hull enclosing selected geometry (points/edges/faces); can reuse existing faces on the hull.
- Can serve as a bridge/patch between scattered points or shells.

**Options**
- **Delete Unused**: Remove selected elements not used in the hull (unless needed by unselected geometry).
- **Use Existing Faces**: Keep input faces that lie on the hull (allows n-gons or quads if Join Triangles is on).
- **Make Holes**: Remove hull faces that were also in the input (useful for bridging between mesh and hull).
- **Join Triangles**: Merge adjacent tris into quads (Triangle-to-Quad rules: Max Face Angle, Max Shape Angle, Compare UVs, etc.).
- **Max Face Angle / Max Shape Angle / Compare**: Same semantics as Triangles to Quads for quad joining.

**Use Cases**
- Wrapping scattered points into a watertight shell.
- Bridging loose edge clouds into a convex patch.
- Quickly generating bounding hulls for proxy collision.

---

## Symmetrize

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Symmetrize

**What it does**
- Cuts the mesh at the object pivot plane and mirrors one side across a chosen axis/direction, merging data (UVs, colors, weights).

**Options**
- **Direction**: Axis and side (e.g., +X to -X or -X to +X; similarly Y/Z).
- **Threshold**: Snap-to-plane tolerance for verts near the symmetry plane.

**Use Cases**
- Restoring symmetry after sculpting or asymmetric edits.
- Preparing clean halves before applying a Mirror modifier.

**Tips**
- Place object origin on the intended symmetry plane before running.
- Choose direction carefully; the source side overwrites the target side.

---

## Snap to Symmetry

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Snap to Symmetry

**What it does**
- Snaps vertices to their mirrored counterparts to fix near-symmetry mismatches.

**Options**
- **Direction**: Axis and side (+X→-X, -X→+X, etc.).
- **Threshold**: Search radius to find mirrored vertices.
- **Factor**: Blend mirrored locations (0.5 = average of both sides).
- **Center**: Snap centerline vertices to zero.

**Use Cases**
- Repairing meshes that are almost symmetric but exceed X-Mirror tolerance.
- Cleaning imported meshes with slight asymmetry before rigging or mirroring.

---

## Set Attribute

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Set Attribute

**What it does**
- Opens a pop-up showing the active attribute’s name and lets you assign a new value to that attribute for all selected elements.
- The **active attribute** is the one last highlighted in Properties ‣ Data (UV Map, Color Attribute, or generic Attribute).

**Notes**
- Attribute values can be inspected in the **Spreadsheet** editor.
- Works per element type: active vertex/edge/face selection determines which indices receive the new value.

---

## Sort Elements

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Sort Elements… (also in context menu; respects active select modes)

**What it does**
- Reorders indices of selected vertices/edges/faces based on the chosen method; useful for consistent ordering before modifiers or exports.

**Methods**
- **View Z Axis**: Farthest to nearest along view Z (use **Reverse** to invert).
- **View X Axis**: Left to right along view X (Reverse to invert).
- **Cursor Distance**: Near to far from the 3D cursor (Reverse available).
- **Material**: Faces only; sorts by material slot index, keeping per-material order intact (Reverse flips material group order only).
- **Selected**: Moves selected elements to the start (or end with Reverse) without changing their internal order. Affects unselected indices.
- **Randomize**: Shuffles selected indices with a **Seed** option for reproducible random order.
- **Reverse**: Simply reverses the selected elements’ order.

**Hint**
- To see indices, enable **Developer Extras** in Preferences ‣ Interface, then toggle **Viewport Overlay ‣ Developer ‣ Indices**.

---

## Delete Loose

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Delete Loose

**What it does**
- Deletes selected vertices, edges, and optionally faces that are not connected to anything.

**Notes**
- Useful after imports to clear orphaned elements before further cleanup.

---

## Decimate Geometry

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Decimate Geometry

**What it does**
- Reduces triangle count of the selection while minimizing shape changes.

**Options**
- **Ratio**: Target triangle count ratio (e.g., 0.4 keeps 40% of original tris).
- **Vertex Group**: Bias collapse choices using the active vertex group (higher weights are protected or prioritized depending on **Invert**).
- **Weight**: Multiplier applied to vertex weights for the bias.
- **Invert**: Invert vertex weights for collapse priority.
- **Symmetry**: Maintain symmetry across X/Y/Z.

**Notes**
- Similar to the Decimate Modifier (Collapse mode) but destructive and selection-based.

---

## Degenerate Dissolve

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Degenerate Dissolve

**What it does**
- Collapses selected edges shorter than a set length; removes resulting tiny faces.

**Option**
- **Merge Distance**: Edges shorter than this length are collapsed.

**Notes**
- Does not merge nearby unconnected verts; use **Merge by Distance** for that case.

---

## Limited Dissolve

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Limited Dissolve

**What it does**
- Simplifies selected geometry by dissolving edges/faces under an angle threshold to reduce detail while preserving shape.

**Options**
- **Max Angle**: Edges below this angle are dissolved.
- **Boundary Angle**: Preserve boundaries sharper than this angle.
- **Delimit**: Limit dissolves by Normal/Material/Seam/Sharp/UVs.

---

## Make Planar Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Make Planar Faces

**What it does**
- Iteratively flattens selected faces toward a plane.

**Options**
- **Factor**: Strength per iteration (may need multiple iterations to reach fully flat).
- **Iterations**: Number of repetitions.

---

## Split Non-Planar Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Split Non-Planar Faces

**What it does**
- Splits selected faces that bend beyond a set angle, creating flatter pieces.

**Option**
- **Max Angle**: Faces bent more than this are split.

**Notes**
- Use **Rotate Edge** afterward if new edges need different directions.

---

## Split Concave Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Split Concave Faces

**What it does**
- Splits selected concave faces into convex parts.

---

## Merge by Distance

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Merge by Distance

**What it does**
- Merges selected vertices that are within a specified distance; can also merge into unselected verts.

**Options**
- **Merge Distance**: Distance threshold for merging.
- **Unselected**: Allow merging selected verts into unselected ones.
- **Sharp Edges**: Mark edges as sharp if they have split custom normals.

**Notes**
- Non-destructive equivalent: **Weld Modifier**.

---

## Fill Holes

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Clean up ‣ Fill Holes

**What it does**
- Caps each selected hole with a face, up to a specified side count.

**Option**
- **Sides**: Maximum edges per hole (0 fills all holes regardless of size).

**Notes**
- For very large holes, **Grid Fill** can produce cleaner quads.

---

## Vertex Operators (Extrude to Cursor, Bevel Vertices)

### New Edge/Face from Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ New Edge/Face from Vertices
- **Shortcut**: `F`

**What it does**
- Context-sensitive fill: makes an edge when two verts are selected; otherwise creates faces from the selection.

**Behaviors (auto-chosen)**
- **Isolated Verts**: Connects selected verts into faces/edges.
- **Isolated Edges**: Fills between selected edges; many edges produce an n-gon.
- **Mixed Verts/Edges**: Uses existing edges plus verts to form faces.
- **Edge-Net**: Fills a connected edge net into faces.
- **Point Cloud**: Computes an n-gon from many loose verts.
- **Single Boundary Vert**: Auto-completes a tri along the boundary; can repeat to extend.

**Notes**
- For holes/complex regions, consider **Fill** or **Grid Fill**; for bridging loops, use **Bridge Edge Loops**.
- Re-using on an existing face area dissolves shared edges/verts into one face (same as Dissolve Faces).

### Extrude Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Extrude Vertices; Mesh ‣ Extrude ‣ Extrude Vertices
- **Shortcut**: `E`

**What it does**
- Extrudes selected vertices as isolated verts (no faces created), useful for drawing chains of points.

### Extrude to Cursor / Add

**Reference**
- **Mode**: Edit Mode
- **Shortcut**: `Ctrl-RMB`

**What it does**
- Adds or extrudes vertices at the mouse position in view space depth aligned to the 3D cursor; connects from the last selected vertex when present.

**Notes**
- Builds faces when two or more verts are selected, following viewport orientation.
- **Shift-Ctrl-RMB** prevents automatic edge rotation during sequential face creation.

### Bevel Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Bevel Vertices
- **Shortcut**: `Shift-Ctrl-B` (Bevel Vertices) / `Ctrl-B` (Bevel Edges)

**What it does**
- Rounds selected vertices (or edges when toggled) with adjustable width, segments, and profile.

**Key Options**
- **Width/Offset/Depth/Percent/Absolute**: Width modes for bevel size.
- **Segments**: Number of segments; mouse wheel or `S` to adjust.
- **Profile (Shape)**: 0–1 concave/convex curve control; Superellipse or Custom profile widget.
- **Material Index**: Assign material slot to new faces (-1 inherits).
- **Harden Normals**: Match surrounding face normals (needs custom normals).
- **Clamp Overlap**: Prevent self-intersection.
- **Loop Slide**: Slide along unbeveled edges for even widths.
- **Face Strength Mode**: Set face strength for Weighted Normal workflows.

### Slide Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Slide Vertices
- **Shortcut**: `Shift-V` (tool) or `G` twice

**What it does**
- Slides selected vertices along adjacent edges; the nearest selected vert to the cursor becomes the control vert.

**Options/Hotkeys**
- **Even (E)**: Uses absolute distance instead of percentage of edge length.
- **Flipped (F)**: Move the same distance from adjacent verts instead of from the original position.
- **Clamp (Alt or C)**: Toggle clamping within edge extents.

### Smooth Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Smooth Vertices (also in Context Menu)

**What it does**
- Averages vertex positions by face angles to smooth the mesh.

**Options**
- **Smoothing**: Strength factor.
- **Repeat**: Iteration count.
- **Axes**: Limit smoothing to chosen axes.

### Laplacian Smooth

**Reference**
- **Mode**: Edit Mode
- **Menu**: Context Menu ‣ Laplacian Smooth

**What it does**
- Uses a detail-preserving smoothing algorithm that better maintains overall shape versus basic Smooth.

**Notes**
- Also available as the **Laplacian Smooth Modifier** for non-destructive use.
- Distinct from smooth shading: this alters geometry, not just lighting.

### Blend from Shape

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Blend from Shape

**What it does**
- Blends the current mesh toward a chosen shape key’s vertex positions directly in Edit Mode.

**Options**
- **Shape**: Shape key to blend from.
- **Blend**: Factor/strength of the blend.
- **Add**: When on, adds the shape offset to current positions; when off, interpolates between current and target shape.

**Use Cases**
- Borrowing features from an existing shape key to refine the base mesh.
- Mixing shapes interactively without leaving Edit Mode.
- Reusing corrective shapes for partial fixes.

### Propagate to Shapes

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Propagate to Shapes

**What it does**
- Copies current positions of selected vertices into all other shape keys, keeping those verts consistent across shapes.

**Warnings**
- Overwrites affected vertices in every shape key—ensure this is intended.

**Use Cases**
- Structural corrections that must be shared (e.g., moving an eyelid loop across all expressions).
- Fixing small topology/position mistakes once instead of per shape key.

### Vertex Groups: Set Active Group

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Vertex Groups ‣ Set Active Group

**What it does**
- Sets the chosen vertex group as the active group. Many operators (e.g., weight-based tools) act on the active group.

**Notes**
- Use to quickly switch which group receives weight edits or operator effects.

### Hooks

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Hooks
- **Shortcut**: `Ctrl-H`

**What it does**
- Creates and manages Hook Modifiers targeting the current selection via empties, selected objects, or bones; also assigns/removes/selects/reset/recenter hook targets.

**Menu Options**
- **Hook to New Object**: Create an empty and hook selected verts to it (adds Hook modifier).
- **Hook to Selected Object**: Hook selected verts to the currently selected object.
- **Hook to Selected Object Bone**: Hook verts to the last selected bone of the selected armature.
- **Assign to Hook**: Assign selected verts to an existing hook; removes unselected verts from that hook.
- **Remove Hook**: Delete the chosen Hook modifier from the object.
- **Select Hook**: Select verts belonging to a chosen hook.
- **Reset Hook**: Run the Hook modifier’s Reset.
- **Recenter Hook**: Run the Hook modifier’s Recenter.

**Notes**
- Hook creation touches other objects/modifiers and cannot be undone in Edit Mode despite appearing in history.

### Make Vertex Parent

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Make Vertex Parent
- **Shortcut**: `Ctrl-P`

**What it does**
- Parents the active object to one selected vertex (position only) or three vertices (position + rotation from the triangle) of the edited mesh; child stays in Object Mode while the mesh is in Edit Mode.

**Usage**
1. Shift-select the object to become the child (active object).
2. Select the parent mesh, enter Edit Mode, select one or three verts.
3. Press `Ctrl-P` to set the vertex parent.

**Notes**
- One-child-per-invocation; re-run for another child.
- Three-vert parenting uses the triangle’s surface to drive orientation.

---

## Edge Operators

### Extrude Edges

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Extrude Edges; Mesh ‣ Extrude ‣ Extrude Edges
- **Shortcut**: `E`

**What it does**
- Extrudes selected edges as standalone edges (no faces) and enters move mode.

### Bevel Edges

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Bevel Edges
- **Shortcut**: `Ctrl-B`

**What it does**
- Creates chamfered/rounded edges; works on selected edges with two adjacent faces. In vertex-only mode, use Bevel Vertices (`Shift-Ctrl-B`).

**Usage**
- Drag to set width; mouse wheel or `S` to set **Segments**; `P` to adjust **Profile**; `Shift` for fine width steps.

**Options**
- **Affect (Vertices/Edges)**: Bevel just corners or the edges themselves.
- **Width Type**: Offset, Width, Percent, Absolute (controls how width is measured). Width meaning differs for vertex-only mode.
- **Width**: Bevel size (meaning per Width Type).
- **Segments (S)**: More segments = smoother bevel.
- **Profile (P)**: 0–1 concave/convex; 0.5 = circular; Superellipse or Custom profile widget for complex shapes.
- **Material Index**: Slot for new faces (-1 inherits neighbors).
- **Harden Normals (H)**: Match surrounding face normals (needs custom split normals).
- **Clamp Overlap (C)**: Prevent self-intersection.
- **Loop Slide**: Slide along unbeveled edges to keep even widths.
- **Mark Seams/Sharps (U/K)**: Preserve seam/sharp propagation through bevels.
- **Miter Outer / Inner**: Sharp / Patch (outer) / Arc patterns; **Spread** controls arc distance.
- **Intersection Type (N)**: Grid Fill (smooth grid) or Cutoff (simpler cuts) when many beveled edges meet.
- **Face Strength**: None / New / Affected / All for Weighted Normal workflows.
- **Profile Type (Z)**: Superellipse vs Custom profile widget; presets (Support Loops/Steps) depend on segment count.

### Bridge Edge Loops

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Bridge Edge Loops

**What it does**
- Connects two or more edge loops with faces; can merge, cap, twist, and interpolate between shapes.

**Key Options**
- **Connect Loops**: Open/Closed/Loop Pairs handling for multiple loops.
- **Merge** + **Merge Factor**: Merge loops instead of filling; factor controls where they meet.
- **Twist**: Match verts between loops; Reverse to fix crossing.
- **Number of Cuts**: Extra loops along the bridge.
- **Interpolation**: Linear / Blend Path / Blend Surface.
- **Smoothness**, **Profile Factor/Shape**: Controls taper/curve of intermediate edges.
- **Remove Inner Faces / Cap Holes**: Clean internal faces if needed.

### Screw (Operator)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Screw

**What it does**
- Extrudes selected geometry along a helix/lathe path around the 3D cursor/axis; needs one open profile in the selection.

**Usage**
- Ensure one open profile is selected (operator fails if none). Place 3D cursor at center, align view/axis, run Screw; adjust steps/turns in Adjust Last Operation.

**Options**
- **Steps** (per turn), **Turns**, **Center X/Y/Z** (cursor-based), **Axis X/Y/Z** (direction), **Angle** (if exposed), **Render Steps/Iterations**.

**Notes**
- Operator works in world space on selected geometry; differs from Screw modifier (object space, whole mesh, manual offset).

### Subdivide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Context Menu ‣ Subdivide / Edge ‣ Subdivide

**What it does**
- Adds resolution by splitting selected edges/faces; behavior varies with which edges of a face are selected (can create tris/quads/ngons per selection rules).

**Options**
- **Number of Cuts**: Cuts per edge.
- **Smoothness**: Offsets new verts to approximate curvature.
- **Create N-Gons**: Allow n-gons; off forces tris/quads.
- **Quad Corner Type**: Inner Vertices / Path / Straight Cut / Fan for adjacent quad edges.
- **Fractal** + **Fractal Seed**: Random displacement.
- **Along Normal**: Move fractal displacement along normals.
- **Random Seed**: Seed for fractal noise.

**Behavior notes**
- Selection patterns (1/2/3/4 edges of a face) change resulting splits; n-gons stay unless Create N-Gons is off.

### Subdivide Edge-Ring

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Subdivide Edge-Ring

**What it does**
- Subdivides an edge ring with interpolation controls similar to Bridge Edge Loops (cuts, profile, twist/smoothness depending on options panel).

### Un-Subdivide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Un-Subdivide

**What it does**
- Attempts to reverse prior subdivides by collapsing every other loop. Works best on regular quad flows; later edits can produce unexpected results.

**Option**
- **Iterations**: How many subdivision levels to remove.

### Rotate Edge

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Rotate Edge CW/CCW

**What it does**
- Spins a shared edge between two faces to the opposite diagonal, redirecting topology flow.

**Notes**
- Works on selected edges or the shared edge of selected face pairs.
- Requires two adjacent faces; otherwise Blender reports no rotatable edge.

### Edge Slide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Slide Edge
- **Shortcut**: `G` `G` in Edge select

**What it does**
- Slides one or more edges along adjacent topology (valid loops/chains only); supports Even/Flipped/Clamp, Mirror Editing, and Correct UVs.

**Offset Edge Slide**
- Adjust offset after sliding via Adjust Last Operation.

**Options/Hotkeys**
- **Even (E)**: Match shape of adjacent loop by distance; **Flipped (F)** swaps which side is matched.
- **Clamp (Alt or C)**: Constrain slide within edge extents.
- **Factor**: Slide amount (negative toward one face, positive toward the other).
- **Mirror Editing**: Propagate across local X symmetry when available.
- **Correct UVs**: Preserve UVs during the slide.

**Limitations**
- Selection must form a valid loop/chain; border or crossing selections fail.

### Offset Edge Slide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Offset Edge Slide
- **Shortcut**: `Shift-Ctrl-R`

**What it does**
- Inserts two edge loops offset to either side of the selected loop(s), then slides them.

**Options**
- **Cap Endpoint**: Extend loops with triangles at endpoints.
- **Factor**: Position of new loops relative to center/outside loops.
- **Even** (single loops): Match shape to an adjacent loop; **Flipped** swaps which side.
- **Clamp**: Keep within extents.
- **Correct UVs**: Preserve UVs while sliding.

### Loop Cut and Slide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Loop Cut and Slide
- **Shortcut**: `Ctrl-R`

**What it does**
- Cuts one or more parallel loops across a face loop, then interactively slides them.

**Usage**
1. Hover an edge perpendicular to the cut direction; preview appears.
2. Click to confirm the cut placement step; slide to position; click to finalize (RMB to center).

**Options**
- **Number of Cuts** (Wheel/PageUp/Down or numeric).
- **Smoothness** (Alt-Wheel or Adjust panel): Offsets along normals to maintain curvature.
- **Falloff**: Profile for smoothing.
- **Factor**: Loop position between sides.
- **Even (E)**: Even spacing vs proportional; **Flipped (F)** toggles target side.
- **Clamp (C / Alt)**: Allow/exclude sliding beyond boundaries.
- **Mirror Editing**: Propagate on symmetric meshes.
- **Correct UVs**: Avoid UV distortion when off-center.

### Loop Cut and Slide

**Reference**
- **Mode**: Edit Mode
- **Menu**: Edge ‣ Loop Cut and Slide
- **Shortcut**: `Ctrl-R`

**What it does**
- Adds one or multiple edge loops with interactive placement; immediately slides along the ring.

**Options**
- **Number of Cuts**, **Even**, **Flip**, **Clamp**, **Smooth**, **Correct UVs**.

### Edge Data

#### Edge Crease
- **Reference**: Edit Mode — Edge ‣ Edge Crease — `Shift-E`
- **What it does**: Sets crease amount for Subdivision Surface. Mouse/typing adjusts; multiple edges change the mean. Enter **-1** to clear.
- **Notes**: Values 0–1; higher = tighter hold. Needs Subdivision Surface (or similar) to have visible effect.

#### Edge Bevel Weight
- **Reference**: Edit Mode — Edge ‣ Edge Bevel Weight
- **What it does**: Sets `bevel_weight_edge` (0.0–1.0) for use by the Bevel modifier/operator when Limited Method is set to Weight.
- **Notes**: Interactive adjust via mouse/typing; multiple edges change the mean.

#### Mark/Clear Seam
- **Reference**: Edit Mode — Edge ‣ Mark Seam / Clear Seam
- **What it does**: Marks edges as UV seams to define unwrap islands.
- **Notes**: Visualization depends on overlay; use Clear Seam to remove.

#### Mark/Clear Sharp
- **Reference**: Edit Mode — Edge ‣ Mark Sharp / Clear Sharp
- **What it does**: Marks edges as sharp for shading; affects Auto Smooth, Weighted Normal, and some operators.
- **Notes**: Requires Auto Smooth or relevant modifier to see effect.

#### Set Sharpness by Angle
- **Reference**: Edit Mode — Edge ‣ Set Sharpness by Angle
- **What it does**: Marks edges sharp based on face-angle threshold.
- **Options**: **Angle** (max smooth angle), **Extend** (add marks without clearing existing sharps).

#### Mark/Clear Freestyle Edge
- **Reference**: Edit Mode — Edge ‣ Mark Freestyle Edge / Clear Freestyle Edge
- **What it does**: Flags edges for Freestyle line rendering.
- **Notes**: Requires Freestyle enabled in render settings.

## Face Operators

### Extrude Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Extrude Faces, Mesh ‣ Extrude ‣ Extrude Faces
- **Shortcut**: `E`

**What it does**
- Extrudes selected faces as a connected region, duplicating boundary loops and moving the region along the averaged normal (or constrained axis). Inner faces move but are not duplicated.

**Options**
- **Flip Normals**: Flip only the new faces’ normals.
- **Dissolve Orthogonal Edges**: Remove edges whose adjacent faces are coplanar after the extrusion.
- **Orientation**: Choose transform orientation for axis locking.
- **Proportional Editing**: Optional falloff affecting nearby geometry.

**Notes**
- Constrain during the operation (X/Y/Z) to lock the extrusion axis; defaults to averaged normal.

### Extrude Faces Along Normals

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Extrude Faces Along Normals (`Alt-E`)

**What it does**
- Extrudes faces individually along their own normals while keeping them connected along borders; offsets respect per-face normals instead of a single averaged normal.

**Options**
- **Offset**: Distance along each face normal.
- **Offset Even**: Even edge lengths for more uniform thickness.
- **Flip Normals**: Flip only the new faces.
- **Dissolve Orthogonal Edges**: Remove coplanar edges created by the extrusion.
- **Proportional Editing**: Optional falloff affecting nearby geometry.

**Notes**
- Great for thickening panels without manual axis locking; uneven normals yield uneven thickness—recalculate first.

### Extrude Individual Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Extrude Individual Faces (`Alt-E`)

**What it does**
- Extrudes each selected face separately, duplicating and offsetting them along their normals without bridging between faces.

**Notes**
- Internal edges remain (not deleted); original faces are replaced. Use for paneling; expect gaps between extruded faces unless you inset/bridge later.

### Inset Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Inset Faces
- **Shortcut**: `I`

**What it does**
- Offsets face borders inward/outward, creating a new perimeter and optionally adding depth for a small extrusion.

**Options**
- **Thickness**, **Depth (Ctrl)**; **Boundary** (inset open borders or not); **Offset Even/Relative**; **Edge Rail** (slide new verts along edges instead of normals); **Individual (I)**; **Outset (O)**; **Select Outer**; **Interpolate** (materials/UVs/colors/weights).

### Poke Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Poke Faces

**What it does**
- Inserts a center vertex per selected face and fans triangles to it.

**Options**
- **Offset** (distance from center), **Offset Relative**, **Use Regular** (more even triangulation), **Poke Center** (Weighted Median/Median/Bounds).

### Triangulate Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Triangulate Faces
- **Shortcut**: `Ctrl-T`

**What it does**
- Converts selected faces to triangles.

**Options**
- **Quad Method**: Shortest Diagonal or Beauty; **N-gon Method**: Fan or Beauty.

### Triangles to Quads

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Triangles to Quads
- **Shortcut**: `Alt-J`

**What it does**
- Reconstructs quads from triangles where angles and attributes allow.

**Options**
- **Max Angle** threshold; **Topology Influence** (favor edge joins matching surrounding quads); **Compare UVs/Color Attributes/Sharp/Materials/Face Maps/VCols** to prevent merges when attributes differ; **Deselect Joined**.

### Solidify Faces (Operator)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Solidify Faces

**What it does**
- Adds thickness to selected faces by extruding along normals and bridging rims; destructive counterpart to the modifier.

**Options**
- **Thickness**, **Offset**, **Clamp**.

**Notes**
- Positive Offset pushes inward relative to normals; negative pushes outward (opposite of the modifier sign convention).

### Wireframe (Operator)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Wireframe

**What it does**
- Turns faces into an inset wireframe, creating struts along original edges and optionally keeping the original faces.

**Options**
- **Thickness**, **Offset**, **Even**/**Offset Relative**, **Boundary**, **Replace Original**, **Crease**, **Material Offset**.

### Fill

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Fill
- **Shortcut**: `Alt-F`

**What it does**
- Fills selected edge loops/holes with faces (typically triangulated), choosing a best-fit fan/grid automatically.

**Options**
- **Beauty**: Reorders triangles for nicer distribution.

**Notes**
- Supports holes when boundaries are continuous.

### Grid Fill

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Grid Fill

**What it does**
- Fills two opposing edge loops with a quad grid.

**Options**
- **Span** (columns), **Offset** (pick corner/rotate layout), **Simple Blending** toggle.

**Usage**
- Works with two open loops, one closed loop, or a face region with a clear single boundary. Select the boundary, run Grid Fill, then adjust Span/Offset for even quads.

**Notes**
- Cancels if boundary conditions are not met (multiple exterior loops or mismatched counts). Active vertex and selection order affect grid orientation. Preserves UVs/custom data where possible.

### Beautify Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Beautify Faces

**What it does**
- Rotates edges in triangulated areas to improve triangle quality/angle distribution.

**Options**
- **Max Angle**: Limit edge rotations to near-coplanar areas.

### Intersect (Knife)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Intersect (Knife)

**What it does**
- Cuts intersecting geometry where faces overlap, adding edges along the intersection without deleting outside parts.

**Options**
- **Source**: Self Intersect or Selected/Unselected.
- **Separate Mode**: All (split), Cut (separate without splitting faces), Merge.
- **Solver**: Float (fast) or Exact (handles overlaps).
- **Self** toggle for overlaps; **Merge Threshold** for near misses.

**Notes**
- Use Exact + small Merge Threshold when Float misses intersections; large thresholds slow down and can over-merge.

### Intersect (Boolean)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Intersect (Boolean)

**What it does**
- Performs a boolean intersection between overlapping face regions inside the same mesh.

**Options**
- **Boolean Operation**: Intersect, Union, Difference (Swap flips Difference selection behavior).
- **Separate Mode**: All/Selected.
- **Solver**: Float (fast, limited overlap support) or Exact (robust, slower); **Merge Threshold** for near-miss welds (keep small for speed/clean results).
- **Self Intersection**: Handle self-overlaps (slower).

**Tips**
- Hide (`H`) geometry to exclude it; `Alt-H` to unhide after.
- Use Exact when Float misses overlaps; large thresholds slow solves and can over-merge.

### Weld Edges into Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Weld Edges into Faces

**What it does**
- Splits selected faces using pre-made loose/wire edges as cutters, welding the result into faces (Knife-like but uses existing edges).

### Shade Smooth & Flat

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Shade Smooth / Shade Flat

**What it does**
- Sets per-face shading to smooth or flat in Edit Mode. Pairs with Auto Smooth + sharp edges (or Edge Split) to control hard breaks.

### Face Data

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data (submenu)

**What it does**
- Collection of per-face attribute operations for colors, UVs, tessellation, and line rendering.

#### Rotate Colors

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Rotate Colors

**What it does**
- Rotates color attribute data clockwise or counterclockwise within each selected face's corners.

**Notes**
- Useful for adjusting vertex color winding before baking or export.

#### Reverse Colors

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Reverse Colors

**What it does**
- Flips the direction of color attribute data in each selected face (reverses winding).

#### Rotate UVs

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Rotate UVs

**What it does**
- Rotates UV coordinates within each face's corners clockwise or counterclockwise.

**Notes**
- Useful for aligning UV rotations before final unwrap or when fixing texture orientation issues.

#### Reverse UVs

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Reverse UVs

**What it does**
- Flips/reverses UV winding direction in each selected face.

#### Flip Quad Tessellation

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Flip Quad Tessellation

**What it does**
- Internally swaps the diagonal direction when quads are tessellated into triangles. Affects shading and normal flow on faceted renders.

**Notes**
- Useful when smooth shading or tessellation normal flow looks wrong; affects Ngons and triangulation.

#### Mark/Clear Freestyle Face

**Reference**
- **Mode**: Edit Mode
- **Menu**: Face ‣ Face Data ‣ Mark/Clear Freestyle Face

**What it does**
- Flags or unflags selected faces for Freestyle line rendering via face marks.

**Notes**
- Requires Freestyle enabled in render settings and view layer; use for stylized outlines and non-photorealistic rendering.

## UV Operators

### Unwrap

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Angle Based / Conformal / Minimum Stretch
- **Shortcut**: `U`

**What it does**
- Cuts selected faces along seams, flattens, and lays them out on the UV map. Overwrites existing UVs.

**Methods**
- **Angle Based (ABF)**: Good 2D accuracy for organic shapes.
- **Conformal (LSCM)**: Less accurate but faster; good for simpler objects.
- **Minimum Stretch (SLIM)**: Minimizes distortion; slower with iterations.

**Options**
- **Fill Holes**: Virtually fill holes before unwrap for better symmetry/overlap avoidance.
- **Use Subdivision Surface**: Use modifier-displaced vertex positions instead of original mesh.
- **Correct Aspect**: Match UV aspect to image texture ratio (requires Image Texture node selected in Shader Editor).
- **Iterations (Minimum Stretch)**: More iterations = less distortion.
- **No Flip**: Prevent face flips for less distortion.
- **Importance Weights**: Use vertex group to influence UV island sizes.
- **Margin Method**: Scaled, Add, or Fraction (pixels in texture).
- **Margin**: Empty space between UV islands.

### Smart UV Project

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Smart UV Project
- **Shortcut**: `U`

**What it does**
- Examines face angles, cuts along sharp edges, projects each group along its average normal. Good for mechanical objects and architecture.

**Options**
- **Angle Limit**: Max angle between adjacent normals before splitting (lower = more islands, less distortion).
- **Margin Method**: Scaled, Add, or Fraction.
- **Island Margin**: Empty space between islands.
- **Rotation Method**: Axis-aligned, Horizontal, or Vertical.
- **Area Weight**: Blend between average normal (0) and area-weighted normal (1) for projection.
- **Correct Aspect**: Match UV aspect to image texture.
- **Scale to Bounds**: Stretch UV map to fill texture.

### Lightmap Pack

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Lightmap Pack
- **Shortcut**: `U`

**What it does**
- Places each face separately on the UV map, prioritizing texture coverage for baking lightmaps in realtime renderers.

**Options**
- **Selection**: Selected Faces or All Faces.
- **Share Texture Space**: When using Multi-Object Editing, prevents overlap across meshes.
- **New UV Map**: Creates new UV map instead of overwriting.
- **Pack Quality**: Higher = less waste (slower computation).
- **Margin**: Empty space between faces.

### Follow Active Quads

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Follow Active Quads
- **Shortcut**: `U`

**What it does**
- Starts from active quad, recursively attaches neighboring selected quads to it via their pre-existing UV layout. Non-quads ignored.

**Notes**
- Active quad's UV shape is unchanged; ensure it matches the mesh shape first.
- Result may go out of bounds; use Pack Islands or manual scale to fix.

**Options**
- **Edge Length Mode**: Even (same length as source edge), Length (proportional to mesh edge), Length Average (proportional to ring average).

### Cube Projection

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Cube Projection
- **Shortcut**: `U`

**What it does**
- Projects selected faces onto the six sides of a virtual cube centered on the pivot, then places sides in UV map (overlapping). Use Pack Islands to separate.

**Options**
- **Cube Size**: Virtual cube size.
- **Correct Aspect**: Match UV aspect to image texture.
- **Clip to Bounds**: Move out-of-bounds UVs to nearest border.
- **Scale to Bounds**: Stretch UV map to fill texture.

### Cylinder Projection

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Cylinder Projection
- **Shortcut**: `U`

**What it does**
- Projects selected faces onto a virtual cylinder, then unrolls it.

**Options**
- **Direction/Align**: View on Equator/Poles or Align to Object (local Z).
- **Pole**: Pinch (heavy distortion, same U coord) or Fan (minimized distortion).
- **Preserve Seams**: Cut along seams before projecting.
- **Radius**: Half the cylinder height.
- **Correct Aspect**: Match UV aspect to image texture.
- **Clip to Bounds**: Move out-of-bounds UVs to nearest border.
- **Scale to Bounds**: Stretch UV map to fill texture.

### Sphere Projection

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Unwrap ‣ Sphere Projection
- **Shortcut**: `U`

**What it does**
- Projects selected faces onto a virtual sphere and flattens using equirectangular layout (latitude vertical, longitude evenly spaced). Useful for eyes, planets, and spherical shapes.

**Options**
- **Direction/Align**: View on Equator/Poles or Align to Object (local Z).
- **Pole**: Pinch (heavy distortion) or Fan (minimized distortion).
- **Preserve Seams**: Cut along seams before projecting.
- **Correct Aspect**: Match UV aspect to image texture.
- **Clip to Bounds**: Move out-of-bounds UVs to nearest border.
- **Scale to Bounds**: Stretch UV map to fill texture.

### Project from View

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Project from View
- **Shortcut**: `U`

**What it does**
- Projects selected faces onto the current viewport plane. Useful when texturing from real-world photos; expect stretching in areas receding from view.

**Options**
- **Orthographic**: Use orthographic instead of perspective projection.
- **Camera Bounds**: Map rendered camera borders to UV borders (only in camera view).
- **Correct Aspect**: Match UV aspect to image texture.
- **Clip to Bounds**: Move out-of-bounds UVs to nearest border.
- **Scale to Bounds**: Stretch UV map to fill texture.

### Project from View (Bounds)

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Project from View (Bounds)
- **Shortcut**: `U`

**What it does**
- Same as Project from View, but with Scale to Bounds enabled by default.

### Reset

**Reference**
- **Mode**: Edit Mode
- **Menu**: UV ‣ Reset
- **Shortcut**: `U`

**What it does**
- Resets UV layout of each selected face to fill the whole UV area (0–1 bounds).

### Connect Vertex Path

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Connect Vertex Path
- **Shortcut**: `J`

**What it does**
- Connects selected vertices in order, splitting faces along straight segments. With two verts, cuts straight across connected faces (Knife-like but straight).

**Notes**
- Running again connects endpoints; isolated verts get edges.

### Connect Vertex Pairs

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Connect Vertex Pairs

**What it does**
- Connects all selected vert pairs that share a face, ignoring selection order; splits faces with new edges.

### Rip Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Rip Vertices
- **Shortcut**: `V`

**What it does**
- Creates a hole by duplicating selected verts/edges, keeping them linked to neighboring unselected verts; splits faces along the rip.

**Limitations**
- Cannot rip faces directly; needs verts/edges between two faces (manifold). Does not work on unconnected pairs.

### Rip Vertices and Fill

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Rip Vertices and Fill
- **Shortcut**: `Alt-V`

**What it does**
- Same as Rip but fills the gap with new faces instead of leaving a hole.

### Rip Vertices and Extend

**Reference**
- **Mode**: Edit Mode
- **Menu**: Vertex ‣ Rip Vertices and Extend
- **Shortcut**: `Alt-D`

**What it does**
- Duplicate-drags selected verts along the closest edge toward the mouse, extending loops; similar to Extrude but produces n-gons.

**Notes**
- Handy for extending edge loops and adding detail quickly.

## Deleting & Dissolving

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete

**What it does**
- Removes selected vertices/edges/faces. Variants control whether surrounding geometry is also removed or kept.

**Delete Variants**
- **Vertices**: Remove verts and any connected edges/faces.
- **Edges**: Remove selected edges and their attached faces.
- **Faces**: Remove selected faces.
- **Only Edges & Faces**: Remove selected edges/faces but keep vertices.
- **Only Faces**: Remove faces but keep boundary edges.

**Dissolve Overview**
- Dissolve removes selected elements while collapsing surrounding geometry into n-gons (no holes). Works per selection mode.
- Context shortcut **Ctrl-X** dissolves based on current select mode.

---

## Dissolve Vertices

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete ‣ Dissolve Vertices

**What it does**
- Removes selected vertices, merging surrounding faces or edges into single elements.

**Options**
- **Face Split**: Limit dissolve to connected face corners to avoid giant n-gons.
- **Tear Boundaries**: Split off face corners instead of merging faces.

---

## Dissolve Edges

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete ‣ Dissolve Edges

**What it does**
- Removes selected edges shared by two faces, merging those faces.

**Options**
- **Face Split**: Restrict dissolve to face corners to reduce large n-gons.
- **Angle Threshold**: Preserve vertices if the edge angle exceeds this value.
- **Tear Boundaries**: Split off corners instead of merging faces.

---

## Dissolve Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete ‣ Dissolve Faces

**What it does**
- Merges selected face regions into single faces by dissolving shared edges.

**Note**
- Fast access: `F` (Dissolve Existing Faces).

---

## Limited Dissolve (Delete Menu)

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete ‣ Limited Dissolve

**What it does**
- Simplifies flat regions by dissolving verts/edges under an angle threshold (same behavior as Clean up ‣ Limited Dissolve).

**Options**
- **Max Angle**: Limit for dissolving.
- **All Boundaries**: Always dissolve boundary verts with two edge users.
- **Delimit**: Prevent joins across materials/seams/sharp/UVs.

---

## Collapse Edges & Faces

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Delete ‣ Collapse Edges & Faces
- **Shortcut**: X → Collapse Edges & Faces

**What it does**
- Collapses each isolated selected edge/face region into single vertices while preserving face data (UVs, colors).

**Use Cases**
- Quickly removing edge rings/loops while keeping UVs and colors intact.
- Reducing detail without leaving holes or large n-gons typical of plain delete/dissolve.

---

## Delete Edge Loops

**Reference**
- **Mode**: Edit Mode (Vertex or Edge select)
- **Menu**: Mesh ‣ Delete ‣ Edge Loops
- **Shortcut**: X/Delete → Edge Loops

**What it does**
- Removes a selected edge loop and merges surrounding faces into a single loop of faces, preserving the surface.

**Notes**
- Different from deleting edges: edge-loop delete keeps the surface closed; deleting edges would leave a hole.
- Works when the loop is between two other loops; otherwise may fail or remove faces differently.

---

## Bend

**Reference**
- **Mode**: Object & Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Bend
- **Shortcut**: `Shift-W`

**What it does**
- Rotates selected elements into an arc between the mouse cursor and the 3D cursor.
- Uses the **View Plane** only (ignores pivot point and transform orientation).

**Controls**
- **Bend Angle**: Rotation amount (can wrap multiple turns for spirals).
- **Radius**: Sharpness of the bend (mouse distance to 3D cursor).
- **Clamp**: When on, elements outside the arc extend tangentially; when off, elements continue around to form a circle.

**Usage Flow**
1. Position the **3D cursor** at the intended arc center/plane.
2. Start Bend (`Shift-W`), move the mouse to set angle and radius.
3. Toggle **Clamp** if you want full circular continuation vs tangential extension.
4. Confirm; Bend does **not** support Adjust Last Operation.

**Notes**
- Mouse-to-cursor distance = bend tightness; mouse angle around cursor = bend angle.
- Works best from orthographic views for predictability.
- Spiral shapes are possible by rotating beyond 360°.

---

## Push/Pull

**Reference**
- **Mode**: Object & Edit Modes
- **Menu**: Object/Mesh ‣ Transform ‣ Push/Pull
- **Tool**: Toolbar ‣ Shrink/Fatten ‣ Push/Pull

**What it does**
- Moves elements **radially** toward (Push) or away from (Pull) the pivot by a uniform distance.
- Similar to Scale from pivot, but preserves absolute offset distance rather than proportions.

**Usage Flow**
1. Set pivot (Median Point, 3D Cursor, etc.).
2. Invoke Push/Pull and drag, or type a distance.
3. Adjust distance in Adjust Last Operation if needed.

**Typical Uses**
- Closing/opening gaps uniformly around a cursor/center.
- Evenly inflating/deflating clusters of verts without altering proportions.
- Comparing with Scale: use Push/Pull when you need equal offsets, not ratios.

---

## Warp

**Reference**
- **Mode**: Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Warp

**What it does**
- Wraps selected elements around the **3D cursor** by a given angle.
- Always depends on **3D cursor location** and **current view**; pivot point is ignored.

**Usage Flow**
1. Place 3D cursor at the desired center of the arc.
2. Align view for the warp plane you want (view-dependent).
3. Invoke Warp and drag to set the angle (type exact degrees for precision).
4. Confirm; adjust angle in Adjust Last Operation if needed.

**Behavior Notes**
- Radius is defined by cursor distance to the selection; farther cursor = larger warp radius.
- Different views yield different results for the same angle.
- Text must be converted to mesh before warping.

**Examples**
- 90/180/360° wraps around the cursor; useful for wrapping panels, ribbons, or text around logos.

---

## Randomize

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Transform ‣ Randomize

**What it does**
- Displaces vertices along their normals with randomized magnitude/direction.

**Options**
- **Amount**: Base displacement distance.
- **Uniform**: Adds random offset to the amount (varies magnitude).
- **Normal**: Adds random offset to the direction around the normal (adds angular variation).
- **Random Seed**: Changes the random pattern.

**Use Cases**
- Adding organic noise to rocks, ground, cloth, or foliage meshes.
- Breaking uniform silhouettes before sculpting.

**Tips**
- Apply on sufficiently dense geometry for smooth noise.
- Use small Amount + Normal jitter for subtle surface breakup.

---

## Shrink/Fatten

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Transform ‣ Shrink/Fatten
- **Shortcut**: `Alt-S`

**What it does**
- Moves selected vertices inward/outward along their normals by a uniform distance.

**Options**
- **Amount**: Displacement distance (positive inflates, negative shrinks).
- **Even Thickness (S, Alt)**: Applies larger offset on sharp corners for more uniform thickness.

**Use Cases**
- Thickening/thinning shells or panels.
- Adjusting cloth or skin thickness uniformly.
- Alternative to Push/Pull when you need normal-based offsets.

**Tips**
- Toggle Even Thickness (`Alt` while dragging) to reduce pinch at corners.
- Works best on consistent normal directions; recalc normals first if needed.

---

## Skin Resize

**Reference**
- **Mode**: Edit Mode
- **Menu**: Mesh ‣ Transform ‣ Skin Resize
- **Shortcut**: `Ctrl-A`

**What it does**
- Sets per-vertex skin radii for the Skin Modifier.
- Supports non-uniform X/Y scaling via axis constraints (X/Y after invoking).

**Workflow**
1. Select vertices of a Skin-Modifier mesh.
2. Press `Ctrl-A`, drag or type to set radius.
3. Constrain to X or Y for elliptical profiles.
4. Preview mean radius as dashed circle in viewport.

**Notes**
- Radius also editable in Sidebar Transform panel.
- Use with Subdivision Surface for smooth limb/body shapes.

---

## Quick Reference

| Tool | Mode | Access | Notes |
|------|------|--------|-------|
| Move | Edit | `G` | Axis constrain: X/Y/Z; plane constrain: Shift+axis |
| Rotate | Edit | `R` | Double-tap `R` for trackball rotate (Object mode); standard axis constraints apply |
| Scale | Edit | `S` | Axis/plane constraints; numeric entry for ratios |
| Slide (Edge/Vertex) | Edit | `G` `G` | Follows topology; great for retopology and flow tweaks |
| Extrude (menu) | Edit | `Alt-E` | Contextual faces/edges/verts; manifold, individual, along normals |
| Extrude Repeat | Edit | Menu | Array-like repeats with offsets/steps/scale |
| Extrude Faces | Edit | `E` | Region extrude along averaged normal; axis constrain as needed |
| Extrude Faces Along Normals | Edit | `Alt-E` | Per-face normal offsets while keeping borders connected |
| Extrude Individual Faces | Edit | `Alt-E` | Extrudes each face separately (no bridging) |
| Inset Faces | Edit | `I` | Offset perimeters; depth/individual/outset/boundary options |
| Poke Faces | Edit | Face menu | Add center vertex and fan triangles; offset/regular options |
| Triangulate Faces | Edit | Face menu | Convert to tris; Beauty vs Shortest, Fan vs Beauty for n-gons |
| Triangles to Quads | Edit | `Alt-J` | Rebuild quads from tris; angle/attribute comparisons |
| Solidify Faces (op) | Edit | Face menu | Add thickness destructively; thickness/offset/clamp |
| Wireframe (op) | Edit | Face menu | Convert faces to inset struts; thickness/boundary/even/material |
| Fill | Edit | `Alt-F` | Fill holes/loops; auto fan/grid triangulation |
| Grid Fill | Edit | Face menu | Fill two loops with quad grid; spans/offset blending |
| Beautify Faces | Edit | Face menu | Rotate edges for more even triangles |
| Intersect (Knife) | Edit | Face menu | Cut intersection lines; separate/split/self options |
| Intersect (Boolean) | Edit | Face menu | Boolean intersection of overlapping faces; fast/exact solver |
| Weld Edges into Faces | Edit | Face menu | Weld boundary edges into faces; closes gaps |
| Shade Smooth | Edit | Face menu | Smooth shading for selection; combine with Auto Smooth/sharp edges |
| Shade Flat | Edit | Face menu | Flat shading for selection |
| Face Data (Rotate/Reverse Colors/UVs) | Edit | Face menu | Rotate/flip per-face UVs/colors; fix winding issues |
| Mark/Clear Freestyle Face | Edit | Face menu | Freestyle fill flag; requires Freestyle enabled |
| To Sphere | Object/Edit | `Shift-Alt-S` | Factor 0–1; more geo = smoother result |
| Shear | Object/Edit | `Shift-Ctrl-Alt-S` | Requires distinct Axis & Axis Ortho; pivot heavily affects result |
| Mirror | Object/Edit | `Ctrl-M` then X/Y/Z | Uses orientation + pivot; presets for Global/Local axes |
| Duplicate | Edit | `Shift-D` | Copies selection, enters Move; retains groups/materials/marks |
| Split Selection | Edit | `Y` | Disconnects selection; duplicates border edges |
| Bisect | Edit | `Mesh ‣ Bisect` / Toolbar | Cut by drawn plane; fill/clear sides |
| Knife Project | Edit | `Mesh ‣ Knife Project` | Project cutter outlines from view; Cut Through option |
| Knife Tool | Edit | `K` | Interactive cuts; Shift-K only-selected; A for angle snap |
| Convex Hull | Edit | Menu | Build convex hull; options to reuse faces/join tris |
| Symmetrize | Edit | Menu | Mirror one side to the other with threshold |
| Snap to Symmetry | Edit | Menu | Snap near-symmetric verts; blend factor and center snap |
| Set Attribute | Edit | Mesh ‣ Set Attribute | Apply a value to the active attribute for selected elements |
| Sort Elements | Edit | Mesh ‣ Sort Elements… | Reorder indices by view axis, cursor, material, selected-first, randomize, or reverse |
| Delete | Edit | `X` / Delete | Remove selected verts/edges/faces; variants for verts/edges/faces only |
| Dissolve | Edit | `Ctrl-X` | Context dissolve by selection mode; keeps surface by forming n-gons |
| Edit Normals: Flip/Recalc | Edit | Mesh ‣ Normals | Flip or recalc outside/inside |
| Edit Normals: Rotate/Point | Edit | Mesh ‣ Normals | Rotate normals (`R` then `N`); Point to Target (`Alt-L`) |
| Edit Normals: Merge/Split/Average | Edit | Mesh ‣ Normals | Control per-vert fan normals |
| Edit Normals: Copy/Paste/Smooth/Reset | Edit | Mesh ‣ Normals | Copy/paste/smooth/reset custom normals |
| Face Strength | Edit | Mesh ‣ Normals | Tag Weak/Medium/Strong for Weighted Normal |
| Collapse Edges & Faces | Edit | Mesh ‣ Delete | Collapse selected edge/face regions into verts preserving data |
| Delete Edge Loop | Edit | Mesh ‣ Delete | Remove an edge loop and merge surrounding faces |
| Extrude Vertices | Edit | `E` | Extrude isolated verts; no faces created |
| Extrude to Cursor | Edit | `Ctrl-RMB` | Add/extrude verts at cursor depth following view; can auto-make faces |
| New Edge/Face from Verts | Edit | `F` | Context fill: edge with 2 verts; faces/ngons from mixed verts/edges/nets |
| Connect Vertex Path | Edit | `J` | Connect verts in order; straight cuts across faces |
| Connect Vertex Pairs | Edit | Vertex menu | Connect all selected pairs sharing faces; order-independent |
| Rip Vertices | Edit | `V` | Rip selected verts/edges to create holes; duplicates along boundary |
| Rip Vertices + Fill | Edit | `Alt-V` | Rip while filling the gap with faces |
| Rip Vertices + Extend | Edit | `Alt-D` | Duplicate-drag along closest edge to extend loops (n-gons) |
| Slide Vertices | Edit | `Shift-V` / `G` `G` | Slide verts along connected edges; Even/Flipped/Clamp options |
| Smooth Vertices | Edit | Vertex menu | Smooth by averaging; control strength, repeats, and axes |
| Laplacian Smooth | Edit | Context Menu | Detail-preserving smooth; modifier available for non-destructive use |
| Blend from Shape | Edit | Vertex menu | Blend toward a chosen shape key; additive or interpolated |
| Propagate to Shapes | Edit | Vertex menu | Push current selected verts into all shape keys (overwrites) |
| Set Active Group | Edit | Vertex Groups menu | Set chosen vertex group active for subsequent operations |
| Hooks | Edit | `Ctrl-H` | Create/assign/remove/select/reset hook modifiers targeting selection |
| Make Vertex Parent | Edit | `Ctrl-P` | Parent active object to 1 or 3 verts of mesh (pos or pos+rot) |
| Extrude Edges | Edit | `E` | Extrude edges as edges (no faces) |
| Bevel Edges | Edit | `Ctrl-B` | Bevel selected edges; width/segments/profile/clamp |
| Bridge Edge Loops | Edit | Edge menu | Connect loops with faces; cuts/smoothness/twist/merge |
| Screw (op) | Edit | Mesh ‣ Screw | Lathe/helix around axis; steps/angle/offset |
| Subdivide | Edit | Context/Edge menu | Add cuts; smoothness/fractal options |
| Subdivide Edge-Ring | Edit | Edge menu | Subdivide across edge rings |
| Un-Subdivide | Edit | Edge menu | Reverse subdivision on quad flows |
| Rotate Edge | Edit | Edge menu | Flip shared edge diagonal (CW/CCW) |
| Edge Slide | Edit | `G` `G` (Edge) | Slide edges; Even/Flipped/Clamp; Correct UVs |
| Offset Edge Slide | Edit | `Shift-Ctrl-R` | Insert two loops offset from selection; Cap/Even/Flipped/Clamp/UV options |
| Loop Cut and Slide | Edit | `Ctrl-R` | Insert loop(s) then slide; Even/Flip/Clamp/Correct UVs |
| Edge Crease | Edit | `Shift-E` | Set crease weight for Subdivision Surface |
| Edge Bevel Weight | Edit | Edge menu | Set bevel weights for Bevel modifier/operator |
| Mark/Clear Seam | Edit | Edge menu | UV seams toggle |
| Mark/Clear Sharp | Edit | Edge menu | Sharp flags for shading/Weighted Normal |
| Set Sharpness by Angle | Edit | Edge menu | Auto-mark sharps above angle |
| Mark/Clear Freestyle Edge | Edit | Edge menu | Freestyle line flags |
| Bevel Vertices | Edit | `Shift-Ctrl-B` | Round corners in vertex-only mode; width/profile/segments options |
| Delete Loose | Edit | Mesh ‣ Clean up | Remove loose verts/edges/faces in selection |
| Decimate Geometry | Edit | Mesh ‣ Clean up | Collapse selection toward target ratio; vertex group bias + symmetry |
| Degenerate Dissolve | Edit | Mesh ‣ Clean up | Collapse edges shorter than merge distance |
| Limited Dissolve | Edit | Mesh ‣ Clean up | Dissolve edges/faces under angle thresholds; delimit by materials/seams |
| Make Planar Faces | Edit | Mesh ‣ Clean up | Iteratively flatten selected faces (factor + iterations) |
| Split Non-Planar Faces | Edit | Mesh ‣ Clean up | Split faces bent beyond Max Angle |
| Split Concave Faces | Edit | Mesh ‣ Clean up | Split concave faces into convex parts |
| Merge by Distance | Edit | Mesh ‣ Clean up | Merge verts within distance; can merge into unselected |
| Fill Holes | Edit | Mesh ‣ Clean up | Cap holes up to side limit; use Grid Fill for large spans |
| Bend | Object/Edit | `Shift-W` | View-plane based; clamp toggles circular continuation |
| Push/Pull | Object/Edit | Menu / Toolbar | Uniform radial offset toward/away from pivot |
| Warp | Edit | Menu | Cursor- and view-dependent wrap by angle |
| Randomize | Edit | Menu | Normal-based randomized displacement with seed |
| Shrink/Fatten | Edit | `Alt-S` | Normal-based inflate/deflate; Even Thickness for corners |
| Skin Resize | Edit | `Ctrl-A` | Set per-vertex skin radii; constrain X/Y for ellipses |
| Merge | Edit | `M` | Merge to center/cursor/first/last; collapse islands |
| Separate | Edit | `P` | Split to new object by selection/material/loose parts |
| Proportional Editing | Edit | `O` toggle | Works with move/rotate/scale/shear; adjust falloff/size with mouse wheel |

---

## Mesh Properties (Object Data)

**Reference**
- **Panel**: Properties Editor ‣ Data Tab (after selecting a mesh object)
- **Access**: Edit Mode & Object Mode

**Overview**
- Mesh Data-Block Menu at the top allows reassigning to different mesh data blocks.

### Vertex Groups

**What it does**
- Assigns weighted groups to mesh vertices for use with operators, modifiers (armatures, masks), and shape keys.

**Usage**
- Can be assigned in Weight Paint mode or Edit Mode via the panel.
- Weights range from 0 (no influence) to 1 (full influence).
- Each vertex can belong to multiple groups with different weights.

**Workflows**
- Armature/Skinning: organize mesh parts (arms, legs, torso) into groups for deformation.
- Modifiers: limit effects to specific vertex groups (Subdivision Surface, Solidify, etc.).
- Physics: control cloth/particles via weight masks.

**See Also**: Vertex Groups (detailed section below).

### Shape Keys

**What it does**
- Stores alternative mesh shapes (blend shapes/morph targets) for animation or blending.

**Usage**
- Basis shape is the default; other keys interpolate or add offsets to it.
- Edit in Edit Mode; blend/mix in Object Mode or via drivers.

**Typical Uses**
- Facial expressions, body deformations, clothing variation.
- Corrective shapes for rigging refinement.

### UV Maps

**What it does**
- Lists all UV coordinate maps on the mesh; used for texture placement and baking.

**Options**
- Active UV Map: determines which map is used for rendering/painting.
- Multiple UV Maps: support per-object texture layering and multiple bakes.

**See Also**: UV Operators section above.

### Color Attributes

**What it does**
- Stores per-vertex or per-face-corner color data; alternative to texturing.

**Domain**
- **Vertex**: One color per vertex.
- **Face Corner**: One color per face corner (sharp color boundaries on low-poly).

**Data Type**
- **Color**: RGBA with floating-point precision.
- **Byte Color**: RGBA with 8-bit precision.

**Options**
- Create new attributes via the **+** icon; configure name, domain, and default color.
- **Duplicate**: Copy active color attribute.
- **Convert**: Change domain or data type.

**Use Cases**
- Per-vertex color painting for stylized renders.
- Sharp corner colors in low-poly assets (Face Corner domain).

### Attributes

**What it does**
- Custom attributes panel listing non-builtin mesh data (separate from vertex groups, UVs, colors).

**Access**
- View and manage generic custom attributes; inspect in Spreadsheet editor.

### Texture Space

**What it does**
- Auto-generated UV coordinates for procedural textures if no manual UV map exists.

**Options**
- **Auto Texture Space**: Recalculate on mesh changes.
- **Adjust**: Manually move/scale the texture space for procedural control.

### Remesh

**What it does**
- Rebuilds mesh geometry with uniform topology, useful for organic sculpts or 3D printing.

**Modes**
- **Smooth**: Reconstructs with smoother surface (fewer details).
- **Sharp**: Preserves hard edges.
- **Blocks**: Voxel-based blocky topology.

**Voxel Size**: Controls resolution; smaller = more detail/higher density.

**Use Cases**
- After sculpting: clean up topology for rigging or export.
- Organic-to-game-asset conversion.
- 3D printing prep.

### Geometry Data

**What it does**
- Metadata attached to the mesh (custom normals, corner data, edge data, etc.).

**Typical Contents**
- Custom split normals.
- Edge/corner attributes.
- Bake data from modifiers.

---

## Vertex Groups

### Introduction

**What it does**
- Vertex groups tag and weight mesh vertices for skinning (armature deformation), modifiers, shape keys, particle systems, and physics simulations.

**Concepts**
- Each vertex can belong to multiple groups.
- Weights: 0–1 range; determines influence strength.
- Used for masking, deformation, and selective modifier application.

**Typical Uses**
- **Armature Skinning**: Group legs, arms, spine, head for bone influence.
- **Modifiers**: Apply Subdivision Surface or Bevel to specific groups only.
- **Particle Systems**: Emit from certain vertex groups.
- **Physics**: Control cloth/rigid body influence per region.
- **Shape Keys**: Blend or corrective shapes weighted per vertex.

### Vertex Groups Panel

**Location**: Properties Editor ‣ Data Tab ‣ Vertex Groups

**Layout**
- List of all vertex groups.
- **+**: Add new group.
- **-**: Delete active group (with confirmation).
- **▼**: Context menu (Lock, Invert, Subtract, etc.).

**Active Group**
- Highlighted; operators act on the active group.
- Double-click to rename.

### Assigning a Vertex Group

**In Weight Paint Mode**
1. Select the object, press `Tab` for Weight Paint.
2. Brush on the mesh; weight is painted in the active group.
3. Adjust **Weight** and **Strength** in the tool options.

**In Edit Mode**
1. Select vertices.
2. Select the group in the Vertex Groups panel.
3. Click **Assign**, **Remove**, or **Select** to manage membership.

**Via Operators**
- Some operators (e.g., `Ctrl-H` Hooks) can auto-assign selected verts to a new group.

### Vertex Weights

**Weight Range**: 0.0–1.0
- **0**: No influence (vertex not in group).
- **0.5**: Half influence.
- **1.0**: Full influence.

**Weight Table Editor**
- In the Data tab, expand a group to see/edit individual vertex weights.
- Click a weight value to edit directly or via the properties panel.

**Invert Weights**
- Right-click group → Invert: flips weights (1 ↔ 0).

### Vertex Group Categories

**Weight-Based Operations**
- Limit modifier effects to high-weight vertices.
- Armature: bone influence determined by vertex weight.
- Smooth: smooth only selected group verts while preserving non-group verts.

**Masking/Selection**
- Select vertices by group membership: **Select** button in panel.
- Deselect via **Deselect** (implied as opposite of Select).

**Lock Groups**
- Right-click group → **Lock**: prevent accidental edits.
- **Unlock**: re-enable editing.

---

## Geometry Data

**What it does**
- Internal mesh metadata including custom split normals, edge attributes, corner data, and bake information.

**Typical Contents**
- **Custom Normals**: Per-vertex normal overrides for fine shading control.
- **Edge Attributes**: Crease, bevel weight, seam, sharp flags (visible in edge data operations).
- **Corner Attributes**: Per-face-corner data (colors, UVs, etc.).
- **Bake Data**: Results from baked modifiers or Cycles baking.

**Access**
- Generally managed via Modifier Stack and Bake workflows.
- Some exporters (e.g., glTF, FBX) preserve custom normals and edge attributes.

---
- **Transform gizmo missing**: Enable gizmos in the 3D Viewport header; ensure correct mode.
- **Nothing moves**: Check if selection is hidden/locked or if you are in the wrong mode.
- **To Sphere looks blocky**: Add geometry (subdivide) before applying; raise Factor carefully.
- **Shear collapses geometry**: Axis and Axis Ortho might match; choose different axes.
- **Proportional Editing affects too much**: Reduce radius with mouse wheel or switch falloff type.
- **Unexpected orientation**: Verify transform orientation (Global/Local/Normal) and pivot.
- **Bend unpredictable**: Remember it always uses the view plane; reorient view and set cursor placement carefully.
- **Warp radius unexpected**: Cursor too close/far or view not aligned; reposition cursor and try from an orthographic view.
- **Push/Pull vs Scale confusion**: Push/Pull offsets by distance; Scale changes by ratio. Choose based on desired effect.
- **Randomize too strong**: Lower Amount and Normal jitter; ensure sufficient geometry density.
- **Shrink/Fatten artifacts**: Recalculate normals; enable Even Thickness to mitigate corner pinching.
- **Skin Resize uneven limbs**: Constrain X/Y and adjust per-joint radii; check dashed radius preview.
- **Mirror flips unexpectedly**: Check pivot placement and orientation; ensure correct Global vs Local axis choice.
- **Duplicate misplaced**: Constrain movement after `Shift-D` (axis keys) or set Vector Offset in Adjust Last Operation.
- **Extrude self-intersects**: Use Manifold/Along Normals; check normals and clean non-manifold geometry first.
- **Extrude Repeat drifting**: Verify view alignment; adjust Offset/Scale and Steps deliberately.
- **Extrude faces went the wrong way**: Constrain an axis or recalc normals; disable Flip Normals unless needed.
- **Along Normals/Individual uneven thickness**: Recalculate normals; use Region Extrude or Solidify for consistent thickness.
- **Individual extrudes colliding**: Reduce offset or inset first; switch to region extrude for connected panels.
- **Inset overlaps/tears**: Toggle Boundary/Offset Even; reduce Thickness/Depth; fix normals first.
- **Poke made stretched triangles**: Lower Offset or enable Use Regular; avoid extremely concave n-gons.
- **Triangulate produced skinny tris**: Switch Quad/N-gon method to Beauty; adjust topology before triangulating.
- **Triangles to Quads failed**: Lower Max Angle; enable/disable Compare UVs/Materials/Sharp as needed; ensure attributes match.
- **Solidify/Wireframe inverted or with gaps**: Check normals and Thickness sign; enable Boundary/Even; use Clamp to avoid overlaps.
- **Merge target wrong**: Re-run with correct option; ensure selection order is preserved for First/Last.
- **Split looks unchanged**: Move the split part (it’s coincident); ensure correct variant (Faces by Edges/Vertices) for holes vs full rips.
- **Separate made many objects**: Probably used By Loose Parts; use Selection or By Material when appropriate.
- **Bisect wrong side cleared**: Use Flip (F) to swap inner/outer; check view alignment before confirming.
- **Knife Project misaligned**: Realign view/orthographic and re-run; ensure cutters are non-manifold or curves; enable Cut Through if needed.
- **Knife Tool adds stray verts**: Lower clip start or adjust depth; use Occlude Geometry or Only Selected to limit cuts.
- **Convex Hull messy output**: Enable Delete Unused; use Make Holes when bridging; clean non-manifold input before hull.
- **Symmetrize overwrote wrong side**: Verify Direction; set origin/pivot on symmetry plane; adjust Threshold to avoid snapping too much.
- **Snap to Symmetry missed verts**: Increase Threshold; ensure correct direction; enable Center for axis verts.
- **Normals still incorrect**: Recalculate outside/inside; check for flipped faces; use Weighted Normal or Face Strength for shading.
- **Point to Target unexpected**: Verify target (cursor/pivot/origin/selection) and mode (Align/Spherize/Invert); try Reset during operation.
- **Copy/Paste normals not applied**: Ensure a single normal was copied; select target normals before pasting; reset if corrupted.
- **Set Attribute editing wrong data**: Confirm the intended attribute is active in the Data tab and that you are in the matching select mode (verts/edges/faces).
- **Sort Elements appears unchanged**: Enable index display via Developer Extras; verify correct element mode and that Reverse/Seed are set as intended.
- **Decimate removed key detail**: Use a protecting vertex group with higher weights; raise Ratio; check Invert toggle.
- **Degenerate Dissolve did nothing/too much**: Adjust Merge Distance; confirm the short edges are selected; use Merge by Distance for unconnected verts.
- **Limited Dissolve over-simplified**: Lower Max Angle or adjust Delimit options (Seam/Sharp/Material/UVs) to preserve boundaries.
- **Merge by Distance collapsed intended gaps**: Lower Merge Distance or disable Unselected; run on smaller selections.
- **Split Non-Planar/Concave not splitting**: Ensure faces are selected and lower Max Angle for non-planar splits.
- **Fill Holes skipped areas**: Increase Sides limit or select the hole boundary; try Grid Fill for large spans.
- **Delete left holes**: Use Dissolve or Edge Loop delete to preserve surface; Only Faces keeps boundary edges.
- **Dissolve made giant n-gons**: Enable Face Split; reduce Angle Threshold; Tear Boundaries when you need separated corners.
- **Collapse Edges & Faces broke UVs**: Ensure selection isolates the loop; prefer Collapse over Delete Vertices when UVs/colors must survive.
- **Edge Loop delete failed**: The loop may not be between two loops or selection not continuous; try dissolving or manual cleanup.
- **Extrude to Cursor depth off**: Align view and reposition 3D cursor; use ortho for predictable depth; Shift-Ctrl-RMB to avoid auto-rotation.
- **Fill/Grid Fill failed or twisted**: Ensure a single boundary (ideally two loops) is selected; adjust Span/Offset; switch to Fill Holes for complex gaps.
- **Bevel artifacts**: Increase Segments, enable Harden Normals, Clamp Overlap, and set Face Strength when using Weighted Normal.
- **New Edge/Face filled wrong area**: Clean selection; for holes use Fill/Grid Fill or Bridge Edge Loops; avoid mixed disconnected islands.
- **Connect Vertex Path missed verts**: Ensure selection order and contiguity; use Connect Vertex Pairs for order-independent splits.
- **Rip failed**: Selection must be between two faces; non-manifold or single-face selections won’t rip—try Duplicate + Separate or manual split.
- **Vertex Slide jumped edges**: The nearest selected vert to the cursor is the control; toggle Clamp; switch Even/Flipped for expected distances.
- **Smooth blurred details**: Lower Smoothing, reduce Repeat, or limit Axes; consider a vertex group + Smooth Modifier for finer control.
- **Laplacian Smooth too soft**: Use fewer iterations/strength; prefer the modifier for vertex-group-limited, non-destructive tuning.
- **Blend from Shape wrong result**: Confirm the correct shape key and Blend factor; toggle Add depending on whether you need interpolation or additive offsets.
- **Propagate to Shapes overwrote desired keys**: Undo and re-run on only the verts that must be consistent; consider duplicating shape keys before propagating.
- **Set Active Group not applying**: Ensure the intended group is active before running weight-dependent operators; confirm selection matches intended verts.
- **Hook undo unexpected**: Hook creation cannot be undone in Edit Mode; delete the Hook modifier if needed. Verify correct target object/bone before creating.
- **Vertex Parent not following**: Ensure you selected the child first (active), then parent mesh and vertices; for rotation follow, use three verts, not one.
- **Extrude Edges left gaps**: Use Edge variant when you really want faces off edges; switch to face extrude for shells.
- **Bevel edges artifacts/pinching**: Increase Segments, enable Clamp Overlap, adjust Profile; check normals and bevel weights.
- **Bridge Edge Loops failed/twisted**: Ensure loops have matching counts/direction; adjust Twist/Reverse; use Merge/Remove Inner Faces to clean caps.
- **Screw spiraled wrong axis**: Set correct axis/angle/offset; align object origin and apply transforms; check Steps/Iterations.
- **Subdivide distorted UVs**: Enable Correct UVs (if available) or subdivide before unwrapping; reduce Smoothness when shape warps.
- **Un-Subdivide did nothing**: Works best on regular quad grids; reduce iterations or clean topology first.
- **Rotate Edge flipped wrong way**: Use CW vs CCW; edge must have two adjacent faces.
- **Edge Slide jumped**: Toggle Clamp; pick correct edge selection; Even/Flipped change offset behavior; enable Correct UVs for textured meshes.
- **Loop Cut missing**: Needs a continuous quad strip; n-gons/holes block cuts. Simplify topology or use Knife.
- **Seam/Sharp flags ignored**: Auto Smooth/Weighted Normal/UV unwrap settings must be enabled; ensure edges are selected and marked.
- **Offset Edge Slide capped oddly**: Toggle Cap Endpoint; adjust Factor; ensure selection is a valid loop.
- **Loop Cut distorted UVs**: Enable Correct UVs or recut before unwrapping; adjust Smoothness modestly to avoid shrink.
- **Edge Crease had no effect**: Needs Subdivision Surface or crease-aware workflow; check value and that crease isn’t cleared (-1).
- **Bevel Weight not changing bevel**: Bevel modifier must be set to Weight method; ensure weights >0 and modifier above others that alter topology.
- **Set Sharpness by Angle over-marked**: Lower Angle or disable Extend; clear sharps first if you need a fresh pass.
- **Freestyle edges not rendering**: Enable Freestyle in render settings and in the view layer; ensure edges are marked and visible to the line set.
- **Intersect (Knife/Boolean) missed cuts**: Ensure overlapping geometry is selected; toggle Self; use Exact solver for tricky cases.
- **Weld Edges into Faces failed**: Selection must be a valid boundary; clean non-manifold edges and retry.
- **Shade Smooth still faceted**: Enable Auto Smooth or Weighted Normal; mark sharp edges/seams; recalc normals.
- **Face Data rotate/reverse wrong way**: Undo and rotate the other direction; keep UV and color winding consistent before baking/export.
- **Rotate/Reverse Colors showing wrong**: Undo and apply opposite direction; check vertex color alpha blending.
- **Flip Quad Tessellation changed shading unexpectedly**: Affects render normals; may need Normal Bake recalculate or modifier updates.
- **Freestyle Face marks not visible**: Enable Freestyle in render settings, view layer, and line sets; mark must be enabled and included in face mark filter.
- **Unwrap created stretched/overlapped islands**: Try different Method (Angle/Conformal/Min Stretch); use Fill Holes and Margin; increase Iterations for SLIM.
- **Smart UV Project cut too many seams**: Lower Angle Limit; use seams to protect important boundaries.
- **Lightmap Pack islands touching**: Increase Margin; use Pack Quality; enable Share Texture Space for multi-object baking.
- **Follow Active Quads distorted**: Ensure active quad's UV shape matches its mesh shape; may need pre-unwrap of that quad first.
- **Cube/Cylinder/Sphere Projection overlapping**: Use Pack Islands to separate islands; adjust Margin.
- **Project from View stretches too much**: Use orthographic view; reconsider camera angle; prefer unwrap methods for complex shapes.
- **UV Reset went to wrong scale**: Reset clears custom layout to default 0–1 grid; redo if wrong map was active.
- **Grid Fill cancelled**: Boundary had multiple exterior loops or mismatched counts; verify a single, valid boundary and reset active vertex to control orientation.
- **Triangulate produced bad poles**: Use Beauty, then Beautify Faces; consider re-flow before exporting.
- **Triangles to Quads left strays**: Raise Topology Influence/Max Angle; disable Compare options when safe; odd triangle counts will leave some behind.

---

## Best Practices
- Use numeric entry for precision transforms (type after invoking G/R/S).
- Set pivot and orientation intentionally before Shear or To Sphere.
- Double-tap G for topology-preserving slides instead of free moves on loops.
- After any transform, use **Adjust Last Operation** to refine without reselecting.
- Keep bevel weights/creases organized; they drive Bevel and Subdivision Surface behavior.
- Bend and Warp: place the 3D cursor deliberately and align your view before running the tool.
- Push/Pull: pick pivot carefully (Median vs 3D Cursor) to control the radial offset direction.
- Randomize: combine small Amount with Subdivide Smooth for natural noise; apply before sculpting.
- Shrink/Fatten: great for shell thickness—check normals first; use Even Thickness for hard corners.
- Skin Resize: block out limb proportions early; refine radii per joint for better deformation.
- Extrude Faces: pick the variant (Region vs Along Normals vs Individual) for the outcome you need; recalc normals before thickness moves.
- Inset then Individual Extrude for clean paneling; keep Thickness modest and use Offset Even to avoid distortions.
- Poke sparingly for support poles or stars; combine with Use Regular for even fans.
- Triangulate then Beautify for exports; run Triangles to Quads after auto-triangulate imports when you need quads back.
- Grid Fill when you need orderly quad patches; adjust Span/Offset until the flow aligns with adjacent loops.
- Solidify/Wireframe (ops): verify normals and start with small Thickness; enable Boundary/Even and Clamp to prevent overlaps.
- Intersect (Knife/Boolean): keep inputs manifold and clean; switch to Exact solver when Fast fails.
- Weld Edges into Faces: select clear boundary loops and clean non-manifold edges before welding.
- Shade Smooth with Auto Smooth plus marked sharps for control; Shade Flat for mechanical facets.
- Face Data rotates: use to fix winding of UVs/colors before baking; flip tessellation when quad triangulation matters for shading.
- UV Unwrap (Angle/Conformal/SLIM): choose method by shape (organic/simple/distortion-averse); use Fill Holes; adjust Margin for texture packing.
- Smart UV Project (mechanical): set Angle Limit by sharpness; pre-mark seams to protect important silhouettes.
- Lightmap Pack: for realtime baking; enable Share Texture Space when baking multiple objects; maximize Pack Quality and Margin.
- Follow Active Quads: pre-shape the active quad's UV before running; only attaches quads; out-of-bounds result needs manual scale/Pack Islands.
- Projections (Cube/Cylinder/Sphere): good for simple shapes; overlapping islands need Pack Islands; try different view/pivot alignments.
- Project from View: best with photos/orthographic views; expect stretching on receding geometry; use other unwraps for complex shapes.
- UV Reset: clears custom layout to 0–1 grid for the current map; verify correct map is active before resetting.
- Mirror: for non-destructive workflows, use the Mirror Modifier; set pivot/orientation deliberately when using the operator.
- Duplicate: constrain immediately after `Shift-D` for precise placement; reuse properties without reassigning groups/materials.
- Extrude: pick the variant that matches context (Along Normals for shells, Individual for panels, Manifold for clean solids); keep normals consistent.
- Extrude Repeat: align view/pivot intentionally; small scale offsets can create tapered arrays.
- Merge: for symmetry repairs, snap cursor to plane then use At Cursor; Collapse for loop cleanup without deleting islands.
- Split: after splitting, move the piece to inspect; choose Faces by Edges/Vertices when you need a hole vs a full rip.
- Separate: use Selection for controlled splits, By Material for organized exports, By Loose Parts for cleanup of imported meshes.
- Bisect: align view for the cut plane; use Fill and Clear Inner/Outer thoughtfully; numeric Plane Point/Normal for precision.
- Knife Project: set orthographic view for projection direction; lock object modes to keep selection; use Cut Through when needed.
- Knife Tool: plan the cut path, use snapping/axis constraints for cleanliness; enable Only Selected to avoid unwanted cuts.
- Convex Hull: clean non-manifold inputs first; Use Existing Faces for n-gons, Delete Unused to purge extras; Join Triangles to reduce tri clutter.
- Symmetrize: set origin on the symmetry plane; pick direction carefully; use Threshold to weld close verts.
- Snap to Symmetry: start with small Threshold and Factor=0.5 for gentle correction; enable Center to zero the axis seam.
- Normals: Flip isolated errors, Recalculate for bulk fixes, Set/Rotate/Point for artistic control, Face Strength + Weighted Normal for consistent shading.
- Set Attribute: double-check the active attribute before writing values; verify results in the Spreadsheet.
- Sort Elements: display indices when order matters; use Randomize with a saved seed for reproducible shuffles.
- Decimate Geometry: isolate areas with vertex groups before collapsing; keep symmetry on when preserving mirrored models.
- Degenerate/ Merge by Distance: start with tiny distances and increment slowly to avoid collapsing intended detail.
- Limited Dissolve: dissolve after marking seams/sharp edges to protect critical boundaries.
- Make Planar/Split Non-Planar/Split Concave: flatten or split before triangulating or exporting to reduce shading artifacts.
- Fill Holes: set a reasonable Sides limit; prefer Grid Fill for large holes that need clean quads.
- Delete vs Dissolve: Delete when you expect holes; Dissolve/Edge Loop delete to keep surfaces intact.
- Collapse Edges & Faces: Choose collapse over delete when you must retain UVs/colors; verify selection islands first.
- Extrude to Cursor: Use ortho views for consistent depth; Shift-Ctrl-RMB when you want to avoid auto-rotating the source edge.
- Bevel Vertices: Pick width mode deliberately, clamp overlap, harden normals, and use custom profiles for highlight shaping.
- New Edge/Face from Verts: Keep selections small/clean; for complex holes use Fill/Grid Fill; bridge loops instead of forcing a giant n-gon.
- Connect Vertex Path/Pairs: Use Path for ordered straight cuts; Pairs for orderless splitting across multiple faces.
- Rip tools: Ensure manifold, two-sided context; use Rip + Fill when you can’t leave a hole; Rip + Extend to grow loops quickly.
- Vertex Slide: Clamp when needed; Even for absolute offsets, Flipped for symmetric distance; keep selection minimal to control which vert slides.
- Smooth Vertices: Use small Smoothing with a few repeats; limit axes to protect volume; prefer Smooth Modifier with vertex groups for non-destructive control.
- Laplacian Smooth: Use when you need shape-preserving smoothing; keep values conservative and lean on the modifier to target vertex groups.
- Blend from Shape: Start with small Blend; use Add only when you need offsets on top of the current mesh; pick the exact shape key intentionally.
- Propagate to Shapes: Duplicate important shape keys before propagating; select only verts that truly must match across all shapes.
- Set Active Group: Switch active group deliberately before weight-based edits; keep group naming clear to avoid misapplication.
- Hooks: Pre-pick target object/bone; delete Hook modifiers to revert; use empties for easy transform control; keep hook assignments tidy.
- Make Vertex Parent: Select the child first, then parent mesh; use three verts for orientation, one vert for position-only; re-run per child object.
- Extrude Edges: Stay in edge mode when you want open extrusions; use face extrude for shells or solids.
- Bevel Edges: Match bevel weight/segments to the Bevel modifier; clamp overlap and set normals/face strength for clean shading.
- Bridge Edge Loops: Use loops with matching counts and consistent direction; set cuts/smoothness modestly to avoid twisting.
- Screw: Apply transforms and set axis before running; keep Steps/Iterations reasonable; check offset to avoid self-intersections.
- Subdivide/Edge-Ring: Add cuts before smoothing/UVs when possible; small smoothness to avoid shrink; use fractal for organic noise sparingly.
- Un-Subdivide: Use on clean quad grids to reverse earlier subdivides; limit iterations to preserve form.
- Rotate Edge: Flip to improve flow on quads; avoid on triangles unless intentional.
- Edge Slide: Slide loops to preserve flow instead of moving verts freely; Even for absolute offsets; enable Correct UVs on textured meshes.
- Loop Cut and Slide: Ensure continuous quad strips; set Number of Cuts deliberately; slide minimally to keep even spacing.
- Crease vs Bevel Weight: Use crease for Subdivision Surface tightness; bevel weight for Bevel modifier; avoid stacking both without intent.
- Seams/Sharps/Freestyle: Mark intentionally and keep consistent; revisit after major topology changes.
- Offset Edge Slide: Use when you need dual loops flanking a selection; Cap Endpoint for open ends; start clamped, then loosen if needed; Correct UVs for textured meshes.
- Loop Cut and Slide: Pick the right perpendicular edge for the cut; keep Smoothness low unless rounding forms; enable Even/Correct UVs for uniform spacing.
- Edge Crease: Use with Subdivision Surface; clear with -1; keep values modest to avoid pinching.
- Bevel Weight: Pair with Bevel modifier in Weight mode; set weights sparingly to avoid harsh transitions.
- Sharpness by Angle: Run after smoothing/cleanup; start with a conservative angle; use Extend only when preserving existing sharps.
- Freestyle Edges: Mark only key silhouettes; ensure Freestyle is enabled and line sets include edge marks.

---

## Related Docs
- Blender Modeling Guide
- Blender Meshes Guide
- Blender Mesh Tools Guide
- Blender Mesh Selection and Creation Tools
- Blender Advanced Mesh Selection Tools
- Blender Selection Loops and Linked Geometry
- Blender By Attribute and Mesh Operators Guide
