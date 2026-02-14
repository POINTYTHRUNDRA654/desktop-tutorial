# Blender Nodes

## Overview

Nodes are the fundamental building blocks of Blender's node-based editors, allowing you to create complex effects, materials, and procedural systems by connecting simple operations together. Node editors provide a visual, non-destructive way to build shaders, geometry procedures, compositing effects, and custom textures without writing code.

**Key Concept:**
- Nodes are operations (processing units)
- Sockets are connections between nodes
- Data flows from input sockets to output sockets
- Visual network creates final result

## Node Editor Types

Blender contains several specialized node editors for different purposes:

### Geometry Nodes

**Purpose:** Procedural modeling with non-destructive geometry manipulation

**Use Cases:**
- Creating complex 3D geometry procedurally
- Instancing and scattering objects
- Parametric modeling systems
- Modular asset creation

**Workflow:** Build geometry from basic shapes and operations, with full parameter control

### Shader Nodes

**Purpose:** Material and surface definition using physically-based rendering

**Use Cases:**
- Creating materials with multiple surface types
- Simulating physical surfaces (metal, plastic, skin, etc.)
- Procedural texture generation
- Complex material blending

**Workflow:** Connect texture nodes to shader nodes to output node for complete material definitions

### Composite Nodes

**Purpose:** Post-processing and editing of rendered images

**Use Cases:**
- Color correction and grading
- Depth of field and effects
- Rendering layer composition
- Final image finishing

**Workflow:** Connect render layer inputs through effect nodes to composite output

### Texture Nodes

**Purpose:** Custom texture generation without external image files

**Use Cases:**
- Procedural texture creation
- Texture variation and customization
- Seamless texture generation
- Complex texture blending

**Workflow:** Build textures from noise, gradients, and mathematical operations

## Node Editor Interface

### Header

**Location:** Top of node editor

**Contains:**
- Editor mode selection (if multiple modes available)
- View controls (zoom, pan, framing)
- Overlay toggles
- Search options
- Snapping and auto-offset controls
- Header info and statistics

### Overlays

**Purpose:** Toggle visual information overlays

**Common Overlays:**
- Node names and labels
- Socket names and data types
- Search highlights
- Connections paths
- Background patterns
- Debug information

**Toggle:** View ‣ Overlays (or header toggle)

### Toolbar

**Location:** Left side of editor

**Contains:**
- Node selection and arrangement tools
- Transform controls
- Search and navigation tools
- Snapping options

**Visibility:** Toggle with `T`

### Sidebar

**Location:** Right side of editor

**Contains:**
- Node properties
- Tool options
- Layer management (if applicable)
- Search and organization tools

**Visibility:** Toggle with `N`

### Navigation

#### Panning

**Pan the view:**
- **Middle Mouse Button (MMB)** drag to pan view
- Or **Spacebar** drag in some configurations
- Allows moving around large node networks

#### Zooming

**Zoom controls:**
- **Mouse Wheel** scroll to zoom in/out
- **Plus/Minus** keys on numpad
- `Home` key frames all nodes
- `.` key frames selected nodes (numpad period)

#### Framing Views

**Frame All Nodes:**
- Press `Home` key
- View zooms to show all nodes

**Frame Selected:**
- Press `.` (period) key on numpad
- Zoom to show only selected nodes

**Home/View All:**
- View ‣ Frame All (Edit menu)
- Keyboard shortcut varies by editor

## Adding Nodes

### Adding Nodes to Graph

**Search Method (Recommended):**
1. Press `Shift-A` to open Add menu
2. Type node name to search
3. Select from search results
4. Node is placed at cursor location

**Menu Method:**
1. Click Add menu in header (if available)
2. Browse node categories
3. Select node type
4. Node appears in editor

**Keyboard Shortcuts:**
- `Shift-A` = Open Add menu
- Type to search
- Number keys may select category
- Return to confirm selection

### Node Placement

**Cursor Location:**
- New nodes appear at mouse cursor position
- Move cursor before adding for desired placement
- Or use transform after creation

**Auto-Placement:**
- Some editors auto-place nodes
- Nodes space themselves to avoid overlap
- Configurable in editor preferences

## Node Parts

All nodes consist of several functional parts:

### Title Bar

**Location:** Top of node

**Contains:**
- Node name/type label
- Collapse/expand button (if applicable)
- Preview toggle (on some nodes)
- Close button (X) to delete

**Interaction:**
- Click and drag title to move node
- Click preview toggle to show/hide preview
- Click collapse button to hide/show sockets

### Sockets

**Input Sockets (Left Side):**
- Receive data from other nodes
- Click to connect from another node
- Data type shown by color
- Can have default values

**Output Sockets (Right Side):**
- Send data to other nodes
- Click to connect to another node
- Data type shown by color (usually yellow, green, red, or blue)

**Data Type Colors:**
- Yellow/Orange = Numeric values
- Green = Vector/Position data
- Red = Color/RGBA data
- Blue = Shader data
- Purple = Object/Collection data
- Brown = Geometry data

### Properties

**Parameter Controls:**
- Sliders for numeric values
- Text fields for text input
- Dropdown menus for options
- Color pickers for colors
- Vector fields for XYZ values

**Editing Values:**
- Click and drag sliders
- Click text fields to type
- Use dropdowns to select options
- Ctrl-click for precise input

### Collapse Button

**Purpose:** Hide/show node contents

**Uses:**
- Reduce visual clutter
- Show only title and sockets
- Save screen space in complex graphs

**Behavior:**
- Click collapse arrow on node title
- Contents fold/unfold
- Connections remain visible

## Selecting Nodes

### Basic Selection

**Single Node:**
- Click LMB on node to select
- Node highlights in orange/yellow
- All other nodes deselect

**Multiple Nodes:**
- Hold **Shift** and click additional nodes
- Each click adds/toggles selection
- Hold **Ctrl** to deselect

### Selection Methods

#### Select All

**Shortcut:** `A`

- Selects all nodes in editor
- Useful for group operations
- Press again to deselect all

#### Select None

**Shortcut:** `Alt-A` or `Alt` twice

- Deselects all selected nodes
- Clears selection

#### Invert Selection

**Shortcut:** `Ctrl-I`

- Selected nodes become deselected
- Unselected nodes become selected
- Toggle all selection states

#### Box Select

**Shortcut:** `B`

- Click and drag to create rectangle
- All nodes touching rectangle become selected
- Useful for selecting groups
- Shift to add, Ctrl to remove

#### Circle Select

**Shortcut:** `C`

- Drag circle around nodes
- All nodes inside circle selected
- Scroll to adjust circle radius
- Shift to add, Ctrl to remove

#### Lasso Select

**Shortcut:** `Ctrl-RMB` drag

- Draw freeform shape around nodes
- All nodes inside shape selected
- Shift to add, Ctrl to remove

#### Select Linked From

**Purpose:** Select all nodes feeding into selected node

**Shortcut:** `Shift-]` (right bracket)

**Behavior:**
- Selects all nodes connected to input
- Shows entire dependency chain
- Useful for tracing data sources

#### Select Linked To

**Purpose:** Select all nodes that depend on selected node

**Shortcut:** `Shift-[` (left bracket)

**Behavior:**
- Selects all nodes receiving output
- Shows where data flows to
- Useful for seeing data destinations

#### Select Grouped

**Purpose:** Select nodes of same type or category

**Methods:**
- Same type: Select node, press G
- By color: Select group of similar colors
- By category: Select all nodes in category

#### Activate Same Type Previous/Next

**Purpose:** Cycle through nodes of same type

**Shortcuts:**
- `[` (left bracket) = Previous of same type
- `]` (right bracket) = Next of same type

**Workflow:**
- Quick navigation between similar nodes
- Useful for reviewing parameter variations

### Find Node

**Shortcut:** `F` or `Ctrl-F`

**Purpose:** Search and locate nodes

**Workflow:**
1. Press F to open search
2. Type node name or property
3. Results highlight in graph
4. Navigate to found node

## Arranging Nodes

### Manual Movement

**Move Selected Nodes:**
- Click and drag node title
- Move to desired location
- Release to place

**Move Multiple:**
- Select multiple nodes (Shift-click)
- Click and drag any selected node
- All selected nodes move together

### Snapping

**Enable Snapping:**
- Toggle snap in header (magnet icon)
- Or press `Ctrl` while dragging

**Snap Targets:**
- Grid lines
- Other node edges
- Guides (if available)

**Snap Behavior:**
- Nodes jump to snap points
- Useful for alignment
- Can be toggled on/off per drag

### Auto-Offset

**Purpose:** Automatically space new nodes to avoid overlaps

**Enable:**
- Toggle in header or preferences
- Auto-offset happens when connecting nodes

**Behavior:**
- New nodes offset from parent node
- Prevents visual overlaps
- Creates cleaner layouts

### Noodle Layout

**Arrange for Clarity:**
1. Select all nodes: `A`
2. Use snapping to align horizontally/vertically
3. Use auto-offset for connected nodes
4. Position from left (inputs) to right (outputs)
5. Create logical data flow

## Editing Nodes

### Transform Operations

**Move Nodes:**
- Click and drag node
- Shift-drag for constrained movement

**Rotate Nodes:**
- Not typically available (nodes are fixed orientation)

**Scale Nodes:**
- Some nodes have size handles
- Click and drag corner to resize
- Changes visibility of properties

### Connecting Sockets

**Basic Connection:**
1. Click on output socket (right side)
2. Drag toward input socket
3. Release on target input socket
4. Connection line appears

**Visual Feedback:**
- White connection line shows valid connection
- Red line shows invalid connection
- Hover over sockets to highlight

**Multiple Inputs:**
- Drag from output to multiple inputs
- Multiple connections from same output
- Data fans out to multiple nodes

**Auto-Connection:**
- Some editors connect to nearest compatible socket
- Can be toggled in preferences

### Disconnecting Sockets

**Disconnect Single:**
- Click on connection line and drag away
- Or press X while hovering over connection
- Or Alt-click on socket

**Disconnect All From Socket:**
- Alt-click socket
- Removes all connections to that socket

**Disconnect By Dragging:**
- Click connection and drag away
- Release in empty space
- Connection breaks

### Copy/Paste Nodes

**Copy:**
- Select node(s): `Shift-click`
- Press `Shift-D` to duplicate OR `Ctrl-C` to copy

**Paste:**
- Press `Ctrl-V` to paste
- Pastes at cursor location
- Connections NOT copied by default

**Practical Use:**
- Copy node setup from one part of graph
- Paste and reconnect to new data
- Reduces repetition

### Duplicate Nodes

**Simple Duplicate:**
- Select node
- Press `Shift-D`
- Move mouse to new location
- Click to place
- Connections remain intact

**Duplicate Linked:**
- Select node
- Press `Alt-D`
- Creates duplicate that shares data
- Changes to one affect both
- Useful for shared parameters

### Delete Nodes

**Delete:**
- Select node(s)
- Press `X` or `Delete`
- Confirm deletion
- Node and connections removed

**Delete with Reconnect:**
- Select intermediate node
- Press `Ctrl-X`
- Deletes node but reconnects input to output
- Useful for removing intermediate steps

### Swap Nodes

**Swap Connections:**
- Select two connected nodes
- Press `S` then `W`
- Node connections swap places
- Useful for reversing data flow

### Show/Hide Nodes

**Hide Node:**
- Select node
- Press `H`
- Node appears as dot/line
- Connections still visible

**Show Hidden:**
- Press `Alt-H` to unhide all
- Or select area with hidden node

**Purpose:**
- Reduce visual clutter
- Focus on active nodes
- Keep complex graphs readable

## Common Nodes

### Output Nodes

**Material Output (Shader):**
- Final material definition
- Receives surface shader
- Only one per material typically
- Outputs to render

**Composite Output:**
- Final image output
- Receives composited image
- File output for rendering
- Display in viewport

**Geometry Output:**
- Final procedural geometry
- Modifier output target
- Instance output for object spawning

### Utility Nodes

**Math Nodes:**
- Add, Subtract, Multiply, Divide
- Sine, Cosine, Tangent
- Maximum, Minimum, Round
- Power, Logarithm

**Color Nodes:**
- Color Ramp for gradients
- Hue/Saturation/Value adjustments
- Mix Color blending
- Color Space conversions

**Vector Nodes:**
- Normalize, Dot Product, Cross Product
- Vector Rotate, Reflect
- Separate/Combine XYZ

### Layout Nodes

**Frame:**
- Organizational container
- Groups related nodes visually
- Useful for documentation
- Collapsible

**Reroute Nodes:**
- Pass-through connections
- Organize complex data paths
- Change connection routing
- Reduce visual clutter

**Text/Comment Nodes:**
- Annotations in graph
- Document complex setups
- Add notes for team members

## Node Groups

Node Groups allow you to organize collections of nodes into reusable, custom nodes.

### Group Basics

**What is a Group:**
- Collection of nodes treated as single node
- Encapsulates complex functionality
- Reusable across project
- Can be nested (groups within groups)

**Group Interface:**
- Input sockets on left (group inputs)
- Output sockets on right (group outputs)
- Parameters exposed from internal nodes

### Using Node Groups

**Insert Group:**
1. Click Add ‣ Group
2. Select existing group from list
3. Group node appears with inputs/outputs
4. Connect like any other node
5. Works as single operation

**Parameter Adjustment:**
- Adjust group node properties
- Controls exposed parameters
- Affects all internal calculations
- Non-destructive

### Creating Node Groups

**Make Group:**
1. Select nodes to group
2. Press `Ctrl-G` (or Edit ‣ Make Group)
3. Group created with selected nodes
4. Select which nodes are inputs/outputs
5. New group appears in Add menu

**Editing Group Internals:**
1. Double-click group node to enter
2. See internal node network
3. Edit/add/remove nodes
4. Changes affect all instances
5. Click parent group or press Tab to exit

**Adding Inputs/Outputs:**
1. Edit group (double-click to enter)
2. Add Group Input node
3. Connect to desired values
4. Add Group Output node
5. Connect from nodes to output
6. New inputs/outputs appear on group node

### Advanced Group Operations

**Insert Into Group:**
- Add node inside existing group
- Useful for expanding functionality
- Modify groups without recreating

**Ungroup:**
- Select group node
- Press `Alt-G` to ungroup
- Group node replaced with internal nodes
- Useful for flattening hierarchy

**Separate:**
- Create independent copy
- Remove link to original
- Useful for variant creation

**Join Group Inputs:**
- Combine multiple inputs into one
- Reduce parameter count
- Organize related inputs

## Node Workflow Best Practices

### Organization

**Logical Flow:**
- Position nodes left to right
- Show data progression visually
- Group related nodes physically
- Use frames for sections

**Naming:**
- Give groups meaningful names
- Add comments for complex sections
- Use consistent naming conventions
- Document for team understanding

### Readability

**Visual Clarity:**
- Use auto-offset for spacing
- Align nodes with snapping
- Hide/collapse unused sections
- Use reroute nodes to untangle paths

**Color Coding:**
- Color frames by function type
- Use consistent color scheme
- Helps visual scanning
- Aids understanding at glance

### Performance

**Optimize Networks:**
- Remove unused nodes
- Minimize unnecessary operations
- Use efficient node combinations
- Preview locally for feedback

**Node Efficiency:**
- Combine simple operations
- Use premade groups for complex tasks
- Avoid redundant calculations
- Profile heavy operations

## Related Documentation

- [Blender UI Tool System](BLENDER_UI_TOOL_SYSTEM.md) - Node editors as specialized editors
- [Blender UI Selecting](BLENDER_UI_SELECTING.md) - Selection in node graphs
- [Blender Shader Editor](BLENDER_SHADER_EDITOR.md) - Shader node specifics
- [Blender Geometry Nodes](BLENDER_GEOMETRY_NODES.md) - Procedural modeling details
- [Blender Compositor](BLENDER_COMPOSITOR.md) - Compositing node specifics
- [Blender Texture Nodes](BLENDER_TEXTURE_NODES.md) - Texture creation nodes
