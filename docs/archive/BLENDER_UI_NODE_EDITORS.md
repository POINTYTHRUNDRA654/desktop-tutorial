# Blender Node Editors

## Overview

Node editors are specialized Blender workspaces for building node-based systems without writing code. Each node editor (Shader, Geometry, Compositor, Texture) shares a common interface with specialized tools and options. This guide covers the universal node editor interface and workflows that apply across all node editor types.

**Shared Features Across All Node Editors:**
- Header with menus and controls
- Toolbar with selection and manipulation tools
- Sidebar for properties and settings
- Consistent navigation and keyboard shortcuts
- Annotation support for documentation

## Header

The header contains menus, buttons, and options specific to the node editor and currently active node tree type.

### View Menu

**Purpose:** Control viewport appearance and navigation

**Options:**
- Frame All (Home key) - Zoom to fit all nodes
- Frame Selected (NumpadPeriod) - Zoom to fit selected nodes
- Pan - Center view on specific location
- Zoom - Adjust zoom level
- Clear - Reset view to defaults
- Toggle Sidebars - Show/hide left and right panels
- Toggle Header - Show/hide header region

**Navigation Shortcuts:**
- `Home` = Frame all nodes
- `.` (numpad) = Frame selected nodes
- `MMB` drag = Pan view
- `Ctrl-MMB` or wheel = Zoom

### Select Menu

**Purpose:** Selection operations on nodes

**Options:**
- All (A) - Select all nodes
- None (Alt-A) - Deselect all
- Invert (Ctrl-I) - Toggle selection
- Box Select (B) - Rectangle selection
- Circle Select (C) - Circular selection
- Lasso Select (Ctrl-RMB) - Freeform selection
- Linked - Select connected nodes
- Grouped - Select same-type nodes
- Find Node (F) - Search and select
- By Type - Select all nodes of specific type
- By Color - Select nodes with same color

### Add Menu

**Purpose:** Add new nodes to the graph

**Access:**
- Shift-A keyboard shortcut
- Click Add menu in header
- Search-and-place workflow

**Node Categories:**
- Input nodes (data sources)
- Output nodes (final results)
- Shader/Color/Vector nodes (depends on editor)
- Utility nodes (math, logic, layout)
- Group nodes (custom node groups)
- Search (Shift-A for quick search)

**Search-Based Addition:**
1. Press Shift-A
2. Type node name
3. Select from filtered results
4. Node placed at cursor location

### Node Menu

**Purpose:** Operations on selected nodes

**Common Operations:**
- Duplicate (Shift-D) - Copy selected nodes
- Copy (Ctrl-C) - Copy to clipboard
- Paste (Ctrl-V) - Paste from clipboard
- Delete (X) - Remove selected nodes
- Delete with Reconnect (Ctrl-X) - Delete intermediate node, keep connections
- Make Group (Ctrl-G) - Create node group from selection
- Group - Node group operations
- Hide (H) - Hide selected nodes
- Unhide (Alt-H) - Unhide all hidden nodes
- Show/Hide Sockets - Toggle socket visibility
- Swap - Exchange node connections
- Mute (M) - Disable selected nodes
- Ungroup (Alt-G) - Remove grouping

### Pinned Editor

**Purpose:** Lock the node editor to a specific node tree regardless of selection changes

**Behavior:**
- When enabled (pin icon highlighted), editor shows selected node tree
- Changing active object/scene doesn't change displayed tree
- Useful for editing while working on multiple objects
- Toggle with pin icon in header

**Use Cases:**
- Edit material while modeling different objects
- Compare multiple node setups side-by-side
- Work on compositor while moving objects in viewport
- Focus on specific complex setup

**Workflow:**
1. Select object or tree to edit
2. Click pin icon to lock/pin editor
3. Can now change selection in viewport
4. Node editor remains on pinned tree
5. Click pin again to unpin

### Parent Node Tree Navigation

**Purpose:** Return from node group to parent tree/group

**Appearance:**
- Breadcrumb showing hierarchy path
- "Parent Node Tree" button in header
- Click to go up one level

**Hierarchy Navigation:**
1. Double-click node group to enter
2. Header shows parent breadcrumb
3. Click "Parent Node Tree" or breadcrumb to exit
4. Returns to previous level

**Example Hierarchy:**
- Material Node Tree (top level)
  - Custom Group 1
    - Sub-group (current level)
      - Click Parent to return to Custom Group 1
      - Click parent breadcrumb to return to Material

## Snapping

Snapping helps align nodes to grid or other reference points for cleaner layouts.

### Snapping Options

**Enable Snapping:**
- Click magnet icon in header
- Or press Ctrl while dragging

**Snap Types:**
- **Grid**: Snap to grid lines
- **Node Edge**: Snap to other node edges
- **Node X**: Snap to horizontal positions
- **Node Y**: Snap to vertical positions

**Snap Distance:**
- Configurable in snapping menu
- Controls how close snap point must be
- Affects snapping sensitivity

### Using Snapping

**Manual Snap:**
1. Drag node normally
2. Snap points highlight as you approach
3. Release to snap to point

**Forced Snap:**
1. Hold Ctrl while dragging
2. Node snaps to nearest grid/point
3. Creates perfectly aligned layouts

**Disable Temporarily:**
- Hold Shift while dragging to bypass snap
- Useful for free placement despite snapping enabled

## Overlays

Overlays display additional information on top of the node editor. Toggle each independently.

### Wire Colors

**Purpose:** Color code node links by data type

**Color Meaning:**
- Yellow/Orange = Numeric values (float, int)
- Green = Vector/Position data (XYZ)
- Red = Color/RGBA data
- Blue = Shader data (only in Shader Editor)
- Purple = Object/Collection data
- Brown = Geometry data (Geometry Nodes)
- Gray = Generic/Socket data

**Benefit:** Quickly identify data type mismatches at a glance

**Toggle:** View ‣ Overlays ‣ Wire Colors

### Reroute Auto Labels

**Purpose:** Automatically label Reroute nodes based on connected data

**Behavior:**
- Reroute nodes show label of source socket
- Updates automatically when connections change
- Reduces need for manual labeling
- Useful for complex routing

**Example:**
- Connect Normal socket to reroute
- Reroute automatically labeled "Normal"
- Improves readability of complex paths

**Toggle:** View ‣ Overlays ‣ Reroute Auto Labels

### Context Path

**Purpose:** Display breadcrumb trail showing current location in hierarchy

**Display:**
- Appears in upper left of editor
- Shows path from root to current level
- Clickable breadcrumbs for navigation

**Example Path:**
```
Material > Custom Group 1 > Sub-group (current)
```

**Navigation:**
- Click any breadcrumb to jump to that level
- Return to parent without "Parent Node Tree" button
- Visual confirmation of current depth

**Toggle:** View ‣ Overlays ‣ Context Path

### Annotations

**Purpose:** Display annotation drawings in the editor

**When Available:**
- Always available if annotations exist
- Toggle on/off with overlay option
- Useful for hiding annotation clutter temporarily

**Use Cases:**
- Show annotations in presentations
- Hide during actual editing for focus
- Document complex setups

**Toggle:** View ‣ Overlays ‣ Annotations

### Previews

**Purpose:** Display preview images from nodes that support them

**Node Support:**
- Texture nodes show texture preview
- Color nodes show color output
- Some geometry/composite nodes show results
- Not all nodes have previews available

**Individual Previews:**
- Each node can toggle its preview independently
- Click preview icon on node to enable/disable
- Overlay toggle controls overlay visibility

**Performance Note:**
- Previews can impact performance
- Disable for large, complex graphs
- Toggle on when fine-tuning details

**Toggle:** View ‣ Overlays ‣ Previews

### Timings (Geometry/Composite Nodes)

**Purpose:** Display execution time for each node

**Information Shown:**
- Last execution time in milliseconds
- Identifies performance bottlenecks
- Helps optimize slow operations

**Availability:**
- Geometry Nodes only
- Compositor only
- Not in Shader or Texture editors

**Use Cases:**
- Find slowest nodes in setup
- Optimize by replacing slow operations
- Profile complex procedures
- Verify performance improvements

**Toggle:** View ‣ Overlays ‣ Timings

## Toolbar

The toolbar provides selection and manipulation tools for node editors.

### Select Tool

**Shortcut:** No dedicated key (usually default)

**Purpose:** Select nodes or links and move them

**Behavior:**
- Click node to select
- Drag node to move
- Shift-click to multi-select
- Ctrl-click to deselect

**Uses:**
- General selection and manipulation
- Default tool when activating node editor

### Select Box

**Shortcut:** `B`

**Purpose:** Select multiple nodes with rectangular area

**Workflow:**
1. Activate Select Box from toolbar
2. Click and drag to create rectangle
3. All nodes/links touching rectangle become selected
4. Release to confirm

**Modifiers:**
- Shift-drag to add to selection
- Ctrl-drag to remove from selection

### Select Circle

**Shortcut:** `C`

**Purpose:** Select nodes within circular area

**Workflow:**
1. Activate Select Circle
2. Move to desired location
3. Drag to activate circle
4. Scroll or +/- to adjust radius
5. Select nodes passed over

**Adjustments:**
- Scroll wheel = Change radius
- NumpadPlus/Minus = Adjust radius
- Tool stays active for multiple selections

### Select Lasso

**Shortcut:** `Ctrl-RMB` drag or from toolbar

**Purpose:** Select nodes within freeform shape

**Workflow:**
1. Activate Select Lasso
2. Click and drag to draw shape
3. Release to select enclosed nodes
4. Shift to add, Ctrl to remove

**Advantages:**
- Most precise for irregular shapes
- Good for selective node picking
- Natural, organic selection

### Annotate Tool

**Shortcut:** `D`

**Purpose:** Draw freehand annotations in node editor

**Workflow:**
1. Activate Annotate tool
2. Click and drag to draw
3. Release to complete stroke
4. Continue drawing more strokes

**Uses:**
- Document complex setups
- Mark important sections
- Add notes to graphs

### Annotate Line

**Shortcut:** Via toolbar

**Purpose:** Draw straight line annotations with optional arrows

**Workflow:**
1. Activate Annotate Line
2. Click start point and drag to end
3. Adjust style in tool settings
4. Arrow styles available

**Decorations:**
- Arrow at start/end
- Circle endpoints
- Diamond shapes
- Slash marks

### Annotate Polygon

**Shortcut:** Via toolbar

**Purpose:** Draw multi-point polygon annotations

**Workflow:**
1. Activate tool
2. Click multiple points
3. Points connect with lines
4. Press Return to complete
5. Or Esc to cancel

### Annotate Eraser

**Shortcut:** Via toolbar

**Purpose:** Erase annotation strokes

**Workflow:**
1. Activate Annotate Eraser
2. Click and drag over strokes to erase
3. Adjust radius in tool settings
4. Can partially erase sections

### Link Cuts

**Purpose:** Delete connections between nodes by drawing across them

**Workflow:**
1. Activate Link Cuts tool
2. Draw line across link you want to delete
3. Link disappears
4. Node disconnects

**Advantages:**
- Fast deletion of multiple connections
- Draw once to cut several links
- Non-destructive (can undo)

### Mute Links

**Purpose:** Disable connections while keeping them visible

**Workflow:**
1. Activate Mute Links tool
2. Draw line across link to mute
3. Link shows as disabled
4. Data doesn't flow through muted link

**Benefits:**
- Keep setup intact but inactive
- Test alternative paths
- Easier than deleting/reconnecting

### Add Reroute

**Purpose:** Insert Reroute nodes on connections

**Workflow:**
1. Activate Add Reroute tool
2. Draw line across existing connection
3. Reroute node inserted at crossing point
4. Helps organize complex paths

**When Useful:**
- Untangle complex connection paths
- Create organized routing
- Label intermediate connections
- Improve graph readability

## Sidebar

The sidebar displays properties for selected nodes and editor-specific settings.

### Node Tab

**Shows:**
- **Name**: Unique identifier for this node in the tree
- **Label**: Custom display title (different from name)
- **Warning Propagation** (Geometry Nodes): Control warning display
- **Color**: Background color override
  - Checkbox to enable custom color
  - Color picker to choose
  - Preset saver button
  - Special menu for color operations

**Color Operations:**
- Copy Color (from active to selected)
- Paste Color
- Clear Custom Color

**Properties:**
- Node-specific settings depend on node type
- Examples: Mix node has blend modes, Math node has operations
- Custom Properties: User-defined data storage

### Tool Tab

**Shows:**
- Active tool information
- Tool-specific options
- Settings for currently selected toolbar tool
- Changes based on tool type

### View Tab

**Shows:**
- View-specific settings
- Background and display options
- Zoom and pan controls
- Annotation tools and layers

## Navigation

### Panning

**Middle Mouse Button (MMB):**
- Click and drag MMB to move view
- Pans in all directions
- Smooth continuous panning

**Spacebar (Optional):**
- Some configurations use Spacebar for panning
- Check keymap preferences for your setup

### Zooming

**Mouse Wheel:**
- Scroll up to zoom in
- Scroll down to zoom out
- Zooms toward cursor location

**Keyboard Shortcuts:**
- `Ctrl-MMB` drag = Zoom (drag right to zoom in)
- `NumpadPlus` = Zoom in
- `NumpadMinus` = Zoom out
- `=` (equals) = Zoom in (alternative)
- `-` (minus) = Zoom out (alternative)

### Frame Selected

**Shortcut:** `.` (numpad period)

**Purpose:** Zoom and pan to show only selected nodes

**Behavior:**
- If nodes selected: frames only those nodes
- If nothing selected: frames all nodes (same as Frame All)
- Useful for focusing on specific sections

**Workflow:**
1. Select nodes of interest
2. Press numpad period
3. View zooms and centers on selection
4. Continue editing focused area

### Frame All

**Shortcut:** `Home`

**Purpose:** Zoom and pan to show entire node graph

**Behavior:**
- Shows all nodes in view
- Adjusts zoom to fit
- Useful after getting lost in large graph

**Workflow:**
1. Press Home
2. All nodes visible
3. Return to full-graph view
4. Re-orient after detailed editing

## Adding Nodes

### Add Menu Method

**Access:** Add menu in header

**Process:**
1. Click Add menu
2. Browse node categories
3. Click node type
4. Node placed at cursor location

**Node Categories:**
- Input
- Output  
- Shader/Color/Vector (varies by editor)
- Utility
- Group

### Keyboard Search Method

**Shortcut:** `Shift-A`

**Process:**
1. Press Shift-A
2. Search field appears
3. Type node name (partial matches work)
4. Results list updates
5. Select from list or press Return
6. Node placed at cursor location

**Advantages:**
- Faster than menu browsing
- Works by node name or properties
- Quick for experienced users
- Reduces menu navigation

### Drag-from-Socket Method

**Purpose:** Add compatible nodes by dragging from existing socket

**Process:**
1. Click on output socket (right side)
2. Drag toward empty space (don't connect to node)
3. Release in empty area
4. Search menu appears with compatible nodes
5. Select node to add
6. Automatically connects to source socket

**Advantages:**
- Ensures compatibility
- Faster than find-then-connect workflow
- Visual connection guidance
- Reduces errors

**Example Workflow:**
1. Have Normal output socket
2. Drag from Normal output
3. Release in empty space
4. Menu shows normal-compatible nodes
5. Select "Normalize" or other node
6. Automatically connected

## Best Practices for Node Editors

### Workspace Organization

**Layout:**
- Position inputs on left side
- Position outputs on right side
- Flow data from left to right visually
- Group related nodes spatially

**Spacing:**
- Use auto-offset for proper spacing
- Enable snapping for alignment
- Use frame nodes to group sections
- Leave breathing room between sections

### Documentation

**Annotation:**
- Label complex sections
- Add notes for non-obvious logic
- Use colors to categorize
- Document assumptions

**Naming:**
- Give groups meaningful names
- Use custom node labels
- Comment on unusual decisions
- Help future edits

### Performance

**Optimization:**
- Monitor execution times (geometry/composite)
- Remove unused nodes/branches
- Simplify where possible
- Use efficient node combinations
- Consolidate operations

**Debugging:**
- Preview nodes to see intermediate results
- Mute sections to isolate problems
- Use wire colors to verify connections
- Check data types match

## Related Documentation

- [Blender UI Nodes](BLENDER_UI_NODES.md) - Node fundamentals and node groups
- [Blender Shader Editor](BLENDER_SHADER_EDITOR.md) - Material-specific nodes
- [Blender Geometry Nodes](BLENDER_GEOMETRY_NODES.md) - Procedural modeling nodes
- [Blender Compositor](BLENDER_COMPOSITOR.md) - Post-processing nodes
- [Blender Texture Nodes](BLENDER_TEXTURE_NODES.md) - Texture creation nodes
- [Blender Selecting](BLENDER_UI_SELECTING.md) - Selection in node editors
- [Blender Annotations](BLENDER_UI_ANNOTATIONS.md) - Annotation tool details
