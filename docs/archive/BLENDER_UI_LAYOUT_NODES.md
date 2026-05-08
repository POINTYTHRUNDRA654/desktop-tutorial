# Blender UI: Layout Nodes and Node Organization

## Overview

**Layout Nodes** in Blender provide essential organizational and visual management tools for complex node graphs. Rather than processing data, layout nodes help organize, group, and clarify the structure of node trees—making them easier to understand, navigate, and maintain. These nodes are fundamental to working with complex procedural systems where visual clarity directly impacts workflow efficiency and code maintainability.

The main layout node types are:

- **Frame Node**: Groups related nodes visually without creating a reusable group
- **Reroute Node**: Organizes connections and branches logic without processing
- **Node Groups**: Encapsulates reusable logic for composition and parameterization

Together, these tools enable scalable node graph management, transforming chaotic node trees into well-organized, navigable systems.

### Key Characteristics of Layout Nodes

- **Non-Data Processing**: Don't modify or transform data; purely organizational
- **Visual Clarity**: Help users understand node tree structure at a glance
- **Hierarchical Organization**: Create nested structures and logical groupings
- **Reusability**: Groups enable code reuse and template creation
- **Navigation Aids**: Improve navigation in large, complex node trees
- **Maintainability**: Easier to modify and update organized systems
- **Documentation**: Groups and frames serve as documentation of intent
- **Performance Awareness**: Groups can improve node editor performance for large graphs

### When to Use Each Tool

**Frame Node**:
- Organizing logically related nodes without reusing
- Sectioning large node trees
- Providing visual documentation and comments
- Temporary groupings during development

**Reroute Node**:
- Organizing connection paths for clarity
- Reducing visual clutter from crossing connections
- Creating junction points for branching logic
- Improving readability of complex networks

**Node Group**:
- Creating reusable components (used multiple times)
- Building libraries of common operations
- Hiding complexity of multi-stage processes
- Parameterizing repeated patterns
- Composing larger systems from components

---

## Frame Node

The **Frame Node** is a visual organization tool that groups related nodes together without creating a reusable node group. Frames help manage large node trees by organizing sections logically, making complex setups easier to navigate and understand.

### Node Designation

- **Type**: Layout Node / Organization Node
- **Category**: Add > Layout > Frame
- **Function**: Visual grouping and organization
- **Data Processing**: None (passes through no data)
- **Visual Style**: Light colored background with label

### Frame Node Purpose

Frames serve several key purposes:

1. **Visual Organization**: Group related nodes to show logical relationships
2. **Workspace Clarity**: Reduce visual clutter in large node trees
3. **Section Documentation**: Label sections with descriptive names
4. **Temporary Grouping**: Organize nodes during development without committing to groups
5. **Color Coding**: Can assign color tags to help identify sections
6. **Text Documentation**: Can display comprehensive text from text blocks

### Frame Node Structure

```
┌─────────────────────────────────────────┐
│ Frame Label                             │
├─────────────────────────────────────────┤
│                                         │
│  [Node 1]      [Node 2]                 │
│       │            │                    │
│  [Node 3] ─────────┤                    │
│       │            │                    │
│       └─→ [Node 4] │                    │
│              │     │                    │
│              └─────┴─→ [Output]         │
│                                         │
└─────────────────────────────────────────┘
```

Frames contain other nodes and visually enclose them, but don't affect data flow or processing.

### Working with Frames

#### Creating Frames

**Method 1: Frame Around Selected Nodes**
1. Select nodes to frame: Click first node, then Shift+Click additional nodes
2. Press F (or Node > Join in new Frame)
3. A popup appears asking for label
4. Type descriptive label: "Color Processing", "Geometry Setup", etc.
5. Press Enter to create frame with label
6. Frame automatically sizes to fit selected nodes

**Method 2: Add Nodes to Existing Frame**
1. Create empty frame: Shift+A > Layout > Frame
2. Drag nodes into the frame visually
3. Or: Select node(s), then frame, press Ctrl+P
4. Nodes added to frame automatically

**Method 3: Create Empty Frame**
1. Shift+A > Layout > Frame
2. Manually drag to size desired area
3. Drag nodes in as needed
4. Edit label in properties

#### Adding Nodes to Frame

**Drag and Drop**:
1. Click and hold a node
2. Drag it into the frame area
3. Release to place inside frame
4. Node is now part of the frame

**Keyboard Shortcut**:
1. Select node(s) to add: Click, then Shift+Click
2. Click the frame to make it active
3. Press Ctrl+P ("Parent" to frame)
4. Nodes move into frame
5. Frame automatically resizes

**Parenting Concept**:
- Think of Ctrl+P as "Parenting" nodes to frame
- Frame becomes parent container
- Moving frame moves all child nodes
- Unparenting with Alt+P removes from frame

#### Removing Nodes from Frame

**Keyboard Shortcut**:
1. Select node(s) to remove
2. Press Alt+P (or Node > Remove from Frame)
3. Nodes removed from frame
4. Frame resizes to fit remaining contents

**Visual Method**:
1. Drag node out of frame boundary
2. Some configurations allow drag-out removal
3. Node is unparented from frame
4. Frame shrinks if Shrink is enabled

#### Moving and Resizing Frames

**Moving the Frame**:
1. Click frame background (not nodes inside)
2. Drag to new location
3. All contained nodes move together
4. Connections to external nodes preserved

**Resizing the Frame**:
1. **If Shrink is Disabled**: 
   - Click and drag corner or edge
   - Frame resizes to new dimensions
   - Nodes inside don't move
   - Can create empty space inside

2. **If Shrink is Enabled** (Default):
   - Frame automatically resizes as nodes inside are rearranged
   - Corner/edge not directly selectable
   - Hover near edge and cursor changes to resize indicator
   - Can disable Shrink to gain manual resize control

### Frame Node Properties

Properties panel for Frame nodes (when selected).

#### Label

**Purpose**: Display name for the frame section.

**Configuration**:
1. Select frame by clicking on label area
2. In properties, find "Label" field
3. Type descriptive name
4. Changes appear immediately in frame title

**Examples**:
- "Color Processing Pipeline"
- "Geometry Deformation"
- "Material Setup"
- "Debug Visualization"
- "Parallel Processing Paths"

#### Label Size

**Purpose**: Control font size of the frame label.

**Configuration**:
- Dropdown or slider in properties
- Values typically 12-24 (relative units)
- Larger sizes for main sections
- Smaller sizes for subsections

**Usage Example**:
```
Main Frame (Label Size: 20)
├─ Sub-section (Label Size: 16)
│  ├─ Details (Label Size: 14)
│  └─ Details
└─ Sub-section (Label Size: 16)
```

Hierarchical label sizing clarifies structure.

#### Shrink Property

**Purpose**: Control whether frame automatically sizes to fit contents.

**When Enabled** (Default):
- Frame automatically resizes when nodes added/removed
- Frame shrinks to minimal size around contents
- No empty space inside frame
- Manual resizing not directly available
- Cleaner appearance with no wasted space

**When Disabled**:
- Frame maintains fixed size
- Can have empty space inside
- Can manually resize corners/edges
- Useful for fixed layouts
- Allows custom spacing around nodes

**When to Disable Shrink**:
- Creating templates with fixed dimensions
- Planning future node additions
- Creating spacious, well-organized layouts
- Multi-level frame hierarchies where spacing matters

#### Text Data-Block

**Purpose**: Display comprehensive text documentation inside frame.

**Configuration**:
1. In properties, find "Text" field
2. Select existing text data-block from dropdown
3. Or create new via search field
4. Text data-block contents displayed in frame
5. Text is read-only from node editor (edit in Text Editor)

**Usage**:
- Detailed documentation of node group purpose
- Setup instructions or usage guidelines
- Comments explaining complex logic
- Configuration notes or parameter guides
- Historical notes or revision information

**Editing Text**:
1. Go to Text Editor workspace
2. Locate and open the text data-block
3. Edit contents in text editor
4. Changes appear immediately in frame
5. Save file if needed

### Frame Hierarchy

Frames can be nested to create hierarchical organization:

```
Main Frame
├─ Input Processing
│  ├─ [Nodes 1-3]
├─ Core Logic
│  ├─ [Nodes 4-7]
└─ Output Formatting
   ├─ [Nodes 8-10]
```

**Creating Hierarchy**:
1. Create parent frame for entire section
2. Create child frames for subsections
3. Parent frame contains child frames
4. Child frames contain detail nodes
5. Clear visual hierarchy emerges

**Navigation Benefit**:
- Zoom in/out shows different detail levels
- Top-level view shows overall structure
- Drill-down shows specific sections
- Clear understanding of organization

### Frame Color Coding

Frames can be color-tagged for quick identification:

**Setting Color Tag**:
1. Select frame
2. In properties or header, find Color Tag option
3. Choose color: Red, Yellow, Green, Blue, Purple, etc.
4. Frame header changes to match color
5. Makes visual scanning easier

**Color Convention Example**:
- Red: Input sections, work in progress
- Green: Completed, stable sections
- Blue: Processing logic
- Yellow: Output sections, final steps
- Purple: Debug and testing areas

---

## Reroute Node

The **Reroute Node** is a lightweight organizational tool that helps manage connection paths and reduce visual clutter in node graphs. It supports one input connection while allowing multiple output connections, functioning as an intelligent junction point.

### Node Designation

- **Type**: Layout Node / Organization Node
- **Category**: Add > Layout > Reroute
- **Function**: Connection organization, not data modification
- **Connections**: 1 input → many outputs
- **Visual Style**: Small diamond-shaped node

### Reroute Node Purpose

Reroutes serve several critical purposes:

1. **Path Organization**: Route connections along organized paths
2. **Clutter Reduction**: Reduce visual crossing of connection lines
3. **Junction Points**: Create branching points for data distribution
4. **Logic Clarity**: Make connection intent clear
5. **Performance**: Sometimes improves node editor rendering
6. **Readability**: Help follow complex data flow paths

### Reroute Node Structure

```
Input
  │
  v
[Reroute]
  │
  ├─→ Output 1
  ├─→ Output 2
  ├─→ Output 3
  └─→ Output 4
```

A single input flows to the reroute, which can then branch to multiple outputs without data modification.

### Creating Reroute Nodes

#### Method 1: Quick Insert on Connection

**Purpose**: Rapidly insert reroute into existing connection.

**Procedure**:
1. Locate existing connection (link between nodes)
2. Hold Shift key
3. Hold RMB (right mouse button) and drag along the connection
4. Reroute node appears and is inserted into the connection
5. Release to place

**Result**:
- Original connection replaced by: Source → Reroute → Destination
- Reroute inherits data type from connection
- Positioned along dragged path

#### Method 2: Manual Creation and Connection

**Procedure**:
1. Shift+A > Layout > Reroute
2. New reroute node appears in editor
3. Drag input socket to source node's output
4. Drag output socket(s) to destination nodes
5. Connections established

#### Method 3: Add to Node

**Procedure**:
1. Right-click on connection line
2. Select "Add Reroute Node" from context menu
3. Reroute inserted at click location
4. Ready for multiple output branches

### Working with Reroute Nodes

#### Input Configuration

**Input Socket**:
- Accepts single input connection
- Displays data type of connected output
- Can have default value when unconnected
- Type and behavior depend on connection

**Default Value**:
- Appears in properties when reroute unconnected
- Value used when no input connected
- Type depends on data flowing through
- Useful for testing disconnected paths

#### Multiple Outputs

**Branching Logic**:
- Single input connects to one source
- Multiple outputs from reroute
- All outputs carry same data (broadcasting)
- Outputs can go to different destinations

**Example**:
```
Source Geometry
      │
      v
  [Reroute]
      │
  ┌───┼───┬─────┐
  v   v   v     v
[Shader] [Viewport] [Export] [Debug]
```

Geometry from reroute branches to four destinations.

#### Selecting and Managing Reroutes

**Selection**:
1. Click the reroute node (diamond shape)
2. Selected reroute highlighted
3. Can then move or delete

**Moving**:
1. Click and drag reroute node
2. Connections maintain integrity
3. Useful for organizing path layout
4. Helps reduce visual clutter

**Deleting**:
1. Select reroute
2. Press X or Delete
3. Reroute removed, connections broken
4. Can use Undo to restore

### Reroute Organization Strategies

#### Linear Path Organization

Route connections in organized paths rather than crossing:

```
Before (Chaotic):         After (Organized):
Source                    Source
  ├→ A                      │
  ├→ B                      v
  ├→ C                    [Reroute 1]
  └→ D                      │
                    ┌───────┼───┬─────┐
                    v       v   v     v
                   [A]     [B] [C]   [D]
```

Reroute acts as organized junction point.

#### Hierarchical Layout

Create hierarchical connection paths:

```
Input
  │
  v
[Main Reroute]
  ├─→ [Sub-reroute 1] ──→ [Nodes 1-3]
  ├─→ [Sub-reroute 2] ──→ [Nodes 4-6]
  └─→ [Sub-reroute 3] ──→ [Nodes 7-9]
```

Multiple levels of reroutes create hierarchy.

#### Frame Integration

Use reroutes within frames:

```
┌────────────────────────┐
│ Processing Frame       │
│                        │
│ Source → [Reroute] ┐   │
│            ├─→ [A]  │   │
│            ├─→ [B]  │   │
│            └─→ [C]  │   │
│                        │
└────────────────────────┘
```

Reroutes organize connections within frames.

### Reroute Properties

Minimal properties panel (when selected).

#### Input Value

**Purpose**: Default value when reroute unconnected.

**Configuration**:
- Appears in properties panel when reroute selected
- Type matches data type
- Value used if input socket disconnected
- Useful for testing and fallbacks

**Examples**:
- Float type: 1.0 default
- Vector type: (0, 0, 0) default
- Geometry type: empty geometry default

---

## Node Groups

**Node Groups** encapsulate sets of nodes into reusable, composable units. They function like functions in programming: self-contained, parameterizable, and reusable in multiple contexts. Node groups are essential for managing complex procedural systems and building modular, maintainable workflows.

### Node Group Concepts

#### What Are Node Groups?

Node groups are:
- **Encapsulations**: Multiple nodes wrapped into single unit
- **Reusable**: Same group used in multiple trees
- **Composable**: Groups can contain other groups
- **Parametrizable**: Inputs allow customization
- **Self-Documenting**: Clear input/output interface documents purpose
- **Hierarchical**: Can be nested multiple levels deep

#### When to Create Node Groups

**Good candidates for grouping**:
- Repeated patterns (same nodes used multiple times)
- Well-defined sub-processes (clear input/output)
- Reusable components (use in multiple projects)
- Complex logic (hide implementation details)
- Library items (standard operations)

**Avoid grouping**:
- One-off nodes (not reused)
- Trivial operations (adds unnecessary complexity)
- Experimental/test nodes (keep loose until proven)
- Highly contextual nodes (too specific to be reusable)

#### Programming Analogy

```
Traditional Programming:
function wood_material(base_color, grain_detail) {
    // Wood generation logic
    return material;
}

Node Group Equivalent:
"Wood Material" Node Group:
  Inputs: base_color (Color), grain_detail (Float)
  Internals: [Noise Texture] → [Color Ramp] → [Shader Nodes]
  Outputs: material (Shader)
```

Same function/encapsulation concept.

### Node Group Architecture

#### Group Input Node

The **Group Input** node represents the entry point for data into the group.

**Characteristics**:
- Displays all input sockets defined for the group
- Located inside the group node tree
- Data flows FROM Group Input TO internal nodes
- One Group Input node per group (usually)
- Input sockets correspond to group's external inputs

**Usage**:
```
Group Input (Internal view)
├─ Input Socket 1
├─ Input Socket 2
└─ Input Socket 3
      │
      v (data flows to internal nodes)
  [Internal Processing]
```

**Configuration**:
- Input sockets defined in Group Sockets panel
- Sockets created/removed in that panel
- Group Input automatically shows all inputs
- Names match defined input sockets exactly

#### Group Output Node

The **Group Output** node represents the exit point for data from the group.

**Characteristics**:
- Displays all output sockets defined for the group
- Located inside the group node tree
- Data flows FROM internal nodes TO Group Output
- One Group Output node per group (usually)
- Output sockets correspond to group's external outputs

**Usage**:
```
  [Internal Processing]
      │
      v (data flows to output)
Group Output (Internal view)
├─ Output Socket 1
├─ Output Socket 2
└─ Output Socket 3
      │
      v (exits group)
```

**Configuration**:
- Output sockets defined in Group Sockets panel
- Sockets created/removed in that panel
- Only connected outputs appear on external group node
- Names match defined output sockets exactly

**Important Note**:
- Only sockets CONNECTED to Group Output appear on external group node
- Unconnected outputs hidden from external users
- This provides clean external interface

#### Group Node (Usage)

When placed in another tree, a node group appears as a single node.

**External Appearance**:
```
┌─────────────────────┐
│ Wood Material       │
├─────────────────────┤
│ Base Color: [████]  │
│ Grain Detail: [  ]  │
│                     │
│ Shader: [Connection]│
└─────────────────────┘
```

Inputs and outputs defined within group visible externally.

### Creating Node Groups

#### Method 1: Make Group from Selection

**Procedure**:
1. Select nodes to group: Click first, Shift+Click others
2. Node > Make Group (or Ctrl+G)
3. Selected nodes combined into new group
4. Group Input and Group Output created automatically
5. Group named "NodeGroup", "NodeGroup.001", etc.

**Automatic Behavior**:
- External connections analyzed
- Inputs created for all external connections to selected nodes
- Outputs created for all external connections from selected nodes
- Group Input connected to group input sockets
- Group Output connected to group output sockets

**Renaming Group**:
1. After creation, group properties visible
2. Change "Name" field in Group panel
3. New name appears in node title
4. Name used in data-block lists

#### Method 2: Group Single Node

**Special Behavior**:
When grouping a single node:
- Group PRESERVES original node's interface
- Input/output sockets match original node
- Panels, default values, properties preserved
- Group name matches original node name
- Useful for templating and standardization

**Example**:
```
Original: [Mix RGBA Node]
               │
               v (Ctrl+G)
            
Grouped:  [Mix RGBA (Group)]
          (preserves all properties)
```

#### Method 3: Move Nodes into Existing Group

**Insert Into Group**:
1. Procedure > Node > Insert Into Group
2. Or: Select nodes (ending with group), then Alt+Click Insert
3. Selected nodes moved into target group
4. Internal Group Input/Output updated
5. Moved nodes contained in sub-group

**Requirements**:
- Target group must have single Group Input and Output
- Selected nodes become sub-group within target
- Useful for nested group organization

### Editing Node Groups

#### Entering a Group

**Method 1: Tab Key**:
1. Select node group
2. Press Tab (or Node > Edit Group)
3. Enter group edit mode
4. View and edit internal nodes
5. Breadcrumbs show "Group Name" in top left

**Method 2: Double-Click**:
1. Double-click the group node
2. Enters group edit mode immediately
3. Same as Tab method

#### Exiting a Group

**Method 1: Tab Key**:
1. While editing group, press Tab
2. Returns to parent tree
3. Breadcrumbs show parent level

**Method 2: Go to Parent**:
1. Click "Go to Parent Node Tree" in header
2. Returns to parent level
3. Visible in breadcrumbs

#### Navigating Hierarchy

**Breadcrumb Navigation**:
- Top left shows current location: "NodeTree > Group A > Group B"
- Click any breadcrumb to jump to that level
- Shows full hierarchy path

**Multiple Groups Deep**:
```
Top-Level Tree
└─ Group A (Edit: breadcrumb shows "Tree > A")
   └─ Group B (Edit: breadcrumb shows "Tree > A > B")
      └─ Group C (Edit: breadcrumb shows "Tree > A > B > C")
```

Can nest groups many levels deep.

### Node Group Socket Management

#### Group Sockets Panel

The **Group Sockets** panel (Sidebar > Group > Group Sockets) manages group interface.

**Panel Contents**:
- **Interface Item List**: All inputs, outputs, and panels listed
- **Item Controls**: Add, remove, reorder items
- **Item Properties**: Configure each item's properties
- **Type Selection**: Choose between Input, Output, or Panel

#### Adding Sockets

**Method 1: Panel Add Button**:
1. In Group Sockets panel, click [+] button
2. Choose "Input", "Output", or "Panel"
3. New socket created with default name
4. Double-click name to rename
5. Configure type and properties

**Method 2: Drag from Node**:
1. Inside group edit view, locate source/destination node
2. Drag output socket to Group Output blank socket
   - Creates output socket automatically
3. Drag source to Group Input blank socket
   - Creates input socket automatically
4. Socket name and type configured automatically

**Method 3: Quick Creation**:
1. Group Input/Output nodes have blank sockets
2. Connect to those blanks directly
3. Sockets created and added to interface automatically
4. Appears in Group Sockets panel

#### Removing Sockets

**Procedure**:
1. In Group Sockets panel, select socket to remove
2. Click [-] button or press Delete
3. Socket removed from group interface
4. Internal connections to socket broken
5. External connections on group node removed

**Confirmation**: May prompt to confirm removal

#### Reordering Sockets

**Procedure**:
1. In Group Sockets panel, select socket
2. Click up/down arrows to move position
3. Or drag socket to new position in list
4. External group node updates with new order
5. Useful for organizing related inputs together

#### Socket Properties

Each socket in Group Sockets panel has configurable properties.

**Common Properties**:
- **Name**: Display name for socket
- **Type**: Data type (Float, Vector, Geometry, etc.)
- **Description**: Tooltip text for socket
- **Default Value**: When socket unconnected
- **Min/Max**: Range for UI controls

**Type-Specific Properties**:
- **Float**: Subtype (None, Percentage, Factor, Angle, Time, Distance, Temperature, Frequency)
- **Integer**: Subtype (None, Percentage, Factor)
- **Vector**: Dimensions (2D, 3D, 4D), Subtype (None, Translation, Direction, Velocity, Acceleration, Euler Angles, XYZ)
- **Color**: Color space (Linear, sRGB)
- **Geometry**: Attribute domain, default attribute name

**Advanced Properties**:
- **Hide Value**: Hide default value control
- **Hide in Modifier**: Hide from Geometry Nodes modifier UI
- **Subtype**: How data displayed/interpreted
- **Min/Max**: Clamps UI controls (not actual data)
- **Expanded Menu**: Display menu fully expanded
- **Optional Label**: Indicate label not necessary
- **Shape** (Geometry Nodes): Single, Field, or Grid

### Using Node Groups

#### Adding Groups to Node Tree

**Method 1: Add Menu**:
1. Shift+A > Group (or Add > Group)
2. List of available groups displays
3. Click group to add
4. Group node placed in tree
5. Ready for input connections

**Method 2: Search**:
1. Shift+A, type group name
2. Search filters available groups
3. Select from results
4. Group node created

**Method 3: Drag from Header**:
1. Some nodes editors allow drag-dropping groups
2. Drag group name from data-block menu
3. Drop into node editor
4. Group created at drop location

#### Importing Groups from Other Files

**Procedure**:
1. File > Link/Append
2. Navigate to .blend file containing group
3. Open file, navigate to NodeTree > Groups
4. Select group(s) to import
5. Click Import/Append
6. Groups available in current file

**Naming Convention Tip**:
- Prefix groups with context: "Geo_", "Mat_", "Comp_"
- Prevents confusion across file types
- "Geo_Wood" clearly indicates geometry group
- "Mat_Wood" indicates material group
- Makes organization clearer

### Node Group Properties

#### Group Panel

Controls group name, appearance, and general properties.

**Name**:
- Display name in title bar
- Used in add menus
- Unique identifier within file

**Description**:
- Tooltip displayed on hover
- Shown in add menus
- Document purpose and usage

**Color Tag**:
- Visual color coding for organization
- Header color matches tag
- Helps identify group type at glance

**Node Width**:
- Width of group node when placed
- Affects how inputs/outputs display
- Can set default width
- Can match parent group width

**Show Manage Panel** (Geometry Nodes):
- Enable display in Geometry Nodes modifier panel
- Shows panel for quick access
- Not visible if disabled

#### Usage Panel (Geometry Nodes Only)

Specifies how group is used in Geometry Nodes.

**Usage Types**:
- **Modifier**: Use with Geometry Nodes modifier
- **Tool**: Use as tool in Tool Properties

**Data-Block List Filtering**:
- Only groups matching current usage shown in lists
- Prevents showing tool groups in modifier menus
- Can enable both if group works in both contexts

**Note**: If both disabled, group inaccessible. To re-enable, add as node to another group, select it, Tab in, then re-enable usage.

### Group Sockets Panel Details

The Group Sockets panel provides comprehensive interface management.

#### Interface Item List

**Display**:
- Shows all inputs, outputs, and panels
- Each item listed with name, type icon, type label
- Items appear in order (top to bottom)
- Shows full hierarchy of panels and contained items

**Selection**:
- Click item to select it
- Selected item highlighted
- Selects corresponding socket on group node

**Reordering**:
- Drag items to new positions
- Up/Down arrows move selected item
- Order determines appearance on group node

#### Item Types

**Input Socket**:
- Data enters group here
- Receives values from external sources
- Names matched by Group Input inside group
- Can be required or optional

**Output Socket**:
- Data exits group here
- Returns results from internal processing
- Names matched by Group Output inside group
- Only connected outputs shown externally

**Panel**:
- Organizational grouping for sockets
- Contains input/output sockets
- Can be nested (panel within panel)
- Can have toggle to show/hide contents

**Panel Toggle**:
- Boolean socket that controls panel visibility
- Shows checkbox in panel header
- Toggle controls whether panel visible
- Only works within panel hierarchy

#### Adding Items

**Add Button**:
1. Click [+] button in panel header
2. Choose item type: Input, Output, Panel
3. New item created with default name
4. Double-click to rename
5. Configure in properties section

#### Item Properties

Properties depend on item type (input, output, panel).

**For Input/Output Sockets**:
- **Name**: Socket display name
- **Type**: Data type (dropdown)
- **Description**: Tooltip text
- **Default Value**: When unconnected
- **Min/Max**: UI range limits
- **Subtype**: Display interpretation
- **Shape** (Geometry Nodes): Single/Field/Grid
- **Optional**: Whether socket required
- **Hide Value**: Hide default value UI
- **Hide in Modifier**: Hide from modifier panel

**For Panels**:
- **Name**: Panel header text
- **Description**: Tooltip when hovering header
- **Closed by Default**: Whether collapsed initially
- **Panel Toggle**: Make toggle control available

#### Duplicate Item

**Purpose**: Quickly create similar socket.

**Procedure**:
1. Select socket in item list
2. Right-click or use Specials menu
3. Choose "Duplicate Item"
4. Copy created with "_001" suffix
5. Rename as needed

#### Make Panel Toggle

**Purpose**: Convert boolean input into panel toggle.

**Procedure**:
1. Select boolean input socket
2. Right-click > Make Panel Toggle
3. Socket becomes toggle for parent panel
4. Panel shows checkbox header
5. Unchecking hides panel contents

#### Unlink Panel Toggle

**Purpose**: Remove toggle from panel.

**Procedure**:
1. Select toggled panel
2. Right-click > Unlink Panel Toggle
3. Toggle socket separated
4. Becomes regular boolean input
5. Panel always visible

### Group Operations

#### Make Group (Grouping Selection)

**Command**: Node > Make Group, Shortcut: Ctrl+G

Creates group from selected nodes.

**Process**:
1. Select nodes to group
2. Press Ctrl+G
3. New group created with:
   - Internal: Selected nodes
   - Group Input: Matches external inputs to group
   - Group Output: Matches external outputs from group
   - Auto-wired connections

**Automatic Interface**:
- Analyzes external connections
- Creates inputs for connections TO group
- Creates outputs for connections FROM group
- Names inputs/outputs based on source/destination

#### Edit Group (Entering Group)

**Command**: Node > Edit Group, Shortcut: Tab, Ctrl+Tab

Enters group edit mode.

**Behavior**:
- Displays group internal nodes
- Shows Group Input and Group Output
- Breadcrumbs show location
- All editing tools available
- External tree not visible

**Exiting**:
- Press Tab again or Ctrl+Tab
- Or click Go to Parent in header
- Returns to parent tree

#### Ungroup (Removing Group)

**Command**: Node > Ungroup, Shortcut: Ctrl+Alt+G

Removes group and places nodes in parent tree.

**Process**:
1. Select group node
2. Press Ctrl+Alt+G
3. Group dissolves
4. All internal nodes placed in parent
5. All internal connections preserved
6. Connections to external nodes restored
7. No connections lost

**Caution**: Cannot be undone easily; use carefully

#### Separate (Remove from Group)

**Command**: Node > Separate, Shortcut: P

Removes selected nodes from group, places in parent.

**Procedure**:
1. Edit into group
2. Select node(s) to separate
3. Press P
4. Nodes moved to parent tree
5. Connections maintained
6. Group Input/Output updated if needed

**Use Case**: Extracting nodes from group for external use

#### Copy (Copy from Group)

**Command**: Node > Copy (in Edit Group mode)

Duplicates nodes into parent tree while keeping originals.

**Result**:
- Selected nodes copied to parent
- Originals remain in group
- Independent of group copies
- Useful for testing or modification

#### Move (Move from Group)

**Command**: Node > Move (in Edit Group mode)

Moves selected nodes from group to parent.

**Effect**:
- Nodes removed from group
- Nodes added to parent tree
- Useful for simplifying complex groups
- Opposite of Insert Into Group

#### Join Group Inputs

**Command**: Node > Join Group Inputs, Shortcut: Ctrl+J

Merges multiple Group Input nodes into one.

**Purpose**: Clean up redundant Group Input nodes.

**Process**:
1. Edit into group
2. Select multiple Group Input nodes
3. Press Ctrl+J
4. Nodes merged into consolidated input
5. Duplicate inputs unified
6. Links preserved

**Result**:
- Cleaner, more organized group
- Easier to understand interface
- Reduced visual clutter

---

## Practical Workflows

### Workflow 1: Organizing Complex Material System

Create well-organized material with frames and groups.

**Scenario**: Complex material setup with color processing, geometry effects, and shader networks.

**Organization**:
```
┌───────────────────────────────┐
│ Main Material Tree            │
├───────────────────────────────┤
│                               │
│ ┌─ Input Processing ────────┐ │
│ │ [Color Input]             │ │
│ │ [Roughness Texture]       │ │
│ │ [Normal Map]              │ │
│ └───────────────────────────┘ │
│              │                │
│              v                │
│ ┌─ Color Processing (Group) ─┐ │
│ │ [Color Correction]        │ │
│ │ [Saturation Control]      │ │
│ │ [Exposure Adjustment]     │ │
│ └───────────────────────────┘ │
│              │                │
│              v                │
│ ┌─ Roughness Processing ────┐ │
│ │ [Roughness Ramp]          │ │
│ │ [Detail Texture Blend]    │ │
│ └───────────────────────────┘ │
│              │                │
│              v                │
│ ┌─ Final Shaders ───────────┐ │
│ │ [Principled BSDF]         │ │
│ │ [Volume Shader]           │ │
│ │ [Material Output]         │ │
│ └───────────────────────────┘ │
│                               │
└───────────────────────────────┘
```

**Implementation**:

1. **Create Input Processing Frame**:
   - Group input nodes
   - Add Color Input, Roughness, Normal nodes
   - Label: "Input Processing"

2. **Create Color Processing Group**:
   - Move color-related nodes into group
   - Define inputs: Base Color, Saturation, Exposure
   - Define outputs: Processed Color
   - Reusable in other materials

3. **Create Roughness Processing Frame**:
   - Organize roughness nodes
   - Reroute nodes reduce visual clutter
   - Label: "Roughness Processing"

4. **Create Final Shaders Frame**:
   - Principled BSDF and Material Output
   - Input organization shows inputs
   - Label: "Final Shaders"

**Benefits**:
- Clear sectional organization
- Easy to find and modify sections
- Reusable color processing group
- Well-documented structure

---

### Workflow 2: Library of Reusable Groups

Build library of commonly used procedural operations.

**Groups to Create**:
1. **Geo_Random Scatter**: Points scattered randomly
2. **Geo_Spiral**: Generate spiral geometry
3. **Geo_Wood Grain**: Procedural wood texture
4. **Geo_Brick Pattern**: Procedural bricks
5. **Geo_Noise Field**: Various noise functions

**Organization**:
```
Node Group Library:
├─ Geo_Random_Scatter
│  Inputs: Geometry, Density, Seed
│  Outputs: Points, Instance Transforms
│
├─ Geo_Spiral
│  Inputs: Radius, Height, Turns
│  Outputs: Spiral Curve, Geometry
│
├─ Geo_Wood_Grain
│  Inputs: Scale, Grain Detail, Color
│  Outputs: Geometry, Material
│
└─ Geo_Brick_Pattern
   Inputs: Brick Size, Mortar Width, Material
   Outputs: Geometry, Pattern
```

**Usage**:
```
Main Tree:
[Geo_Random_Scatter] ──→ [Geo_Spiral] ──→ [Output]
     ↑                        ↑
    [Density Control]    [Turns Control]
```

**Benefits**:
- Reusable components
- Consistent implementations
- Easy to maintain
- Library can be shared
- Promotes best practices

---

### Workflow 3: Nested Group Hierarchy

Create complex system with nested groups.

**Structure**:
```
Main Group: "Advanced Procedural System"
├─ Sub-Group: "Geometry Generation"
│  ├─ Sub-Sub-Group: "Base Shape"
│  │  └─ [Primitive Nodes]
│  └─ Sub-Sub-Group: "Shape Deformation"
│     └─ [Deformation Nodes]
│
└─ Sub-Group: "Visualization"
   ├─ Sub-Sub-Group: "Material Assignment"
   │  └─ [Shader Nodes]
   └─ Sub-Sub-Group: "Output Formatting"
      └─ [Export Nodes]
```

**Advantages**:
- Manages deep complexity
- Clear organizational hierarchy
- Each level encapsulates specific responsibility
- Easy to navigate and understand
- Supports large systems

**Navigation**:
- Breadcrumbs show hierarchy
- Tab/Ctrl+Tab navigate levels
- Each level shows only necessary details
- Big picture understanding at each level

---

## Best Practices

### Frame Organization

**Naming Frames**:
- Use descriptive, specific names
- "Color Processing" better than "Frame1"
- Include number if parallel sections: "Path A", "Path B"
- Document purpose in frame text if complex

**Frame Sizing**:
- Use Shrink enabled for automatic sizing (typically)
- Keep related nodes close together
- Allow some spacing for readability
- Avoid extremely large frames

**Color Coding Frames**:
- Red: Input sections or work in progress
- Green: Stable, complete sections
- Blue: Core processing logic
- Yellow: Output or final sections
- Consistent color scheme across project

**Hierarchical Frames**:
- Use nested frames for large systems
- Parent frame for overall structure
- Child frames for subsections
- Clear visual hierarchy

### Reroute Node Strategies

**When to Use Reroutes**:
- When connections cross many times
- When path logic unclear
- When branching needs visual organization
- When reducing viewport clutter

**When to Avoid**:
- Simple linear connections (add unnecessary nodes)
- When frame better serves purpose
- Excessive rerouting (overcomplicates)

**Junction Point Pattern**:
```
Source
  │
  v
[Reroute] ──→ Destination 1
  │
  ├─→ Destination 2
  │
  └─→ Destination 3
```

Single reroute as branching point.

**Path Routing Pattern**:
```
Source → [R1] → [R2] → [R3] → Destination

Guides connection along organized path.
```

### Node Group Design

**Single Responsibility**:
- Group should do ONE main thing
- Example: "Wood Grain" not "Complete Wood Material"
- Easier to understand and reuse
- Simpler to test and debug

**Clear Interface**:
- Inputs should be self-documenting
- Use descriptive names: "Base Color" not "Color1"
- Add descriptions for complex inputs
- Keep input count minimal

**Sensible Defaults**:
- Provide meaningful default values
- Defaults should produce valid output
- Allow users to work without custom inputs
- Test with defaults to verify

**Documentation**:
- Add description to group
- Document input/output meanings
- Provide usage examples
- Note any constraints or assumptions

**Versioning**:
- Use consistent naming for versions: "Wood_v1", "Wood_v2"
- Or use description field to note changes
- Document breaking changes
- Maintain backward compatibility when possible

---

## Troubleshooting

### Problem: Frame Unresponsive

**Symptoms**
- Cannot select frame edge to resize
- Frame not moving with nodes
- Frame appears disconnected

**Root Causes**
- Shrink enabled preventing manual resize
- Frame not actually selected (node selected instead)
- Frame collapsed or very small

**Solutions**

1. **Disable Shrink if Manual Resize Needed**:
   - Select frame
   - In properties, uncheck "Shrink"
   - Edge now draggable

2. **Verify Frame Selection**:
   - Click on label area of frame
   - Should select frame, not internal nodes
   - Frame header highlighted when selected

3. **Locate Frame**:
   - If frame very small, zoom out to find it
   - Use search/select all to locate
   - May be hidden behind nodes

### Problem: Nodes Not Entering Frame

**Symptoms**
- Drag node into frame, but it stays outside
- Ctrl+P doesn't parent node to frame
- Node visually placed but not contained

**Root Causes**
- Node doesn't snap into frame due to Shrink
- Node position outside frame boundary
- Frame not properly created

**Solutions**

1. **Adjust Node Position**:
   - Drag node fully inside frame bounds
   - Position over frame background area
   - Should snap into frame

2. **Use Ctrl+P Method**:
   - Select node to add
   - Click frame to make it active
   - Press Ctrl+P to parent
   - More reliable than dragging

3. **Disable Shrink Temporarily**:
   - Select frame
   - Uncheck Shrink
   - Add nodes
   - Re-enable Shrink if desired

### Problem: Reroute Creates Connection Loop

**Symptoms**
- Circular data flow created
- Node graph shows circular dependencies
- Evaluation errors or invalid state

**Root Causes**
- Reroute connected to create cycle
- Data flows back to its source
- Accidental feedback loop

**Solutions**

1. **Identify Loop**:
   - Trace connections carefully
   - Look for data flowing back to source
   - Check reroute output destinations

2. **Remove Problematic Connection**:
   - Disconnect reroute output
   - Verify data flow is linear
   - Reconnect correctly if needed

3. **Use Undo if Uncertain**:
   - Press Ctrl+Z to undo
   - Rebuild connection carefully
   - Test after each connection

### Problem: Node Group Interface Shows Nothing

**Symptoms**
- Group node appears empty
- No visible inputs or outputs
- Appears broken or invalid

**Root Causes**
- No inputs/outputs defined
- Group Input/Output not connected
- Group Sockets panel empty

**Solutions**

1. **Define Inputs/Outputs**:
   - Enter group (Tab)
   - Create Group Input and Group Output nodes
   - Connect internal nodes to them
   - Exit group

2. **Add to Group Sockets Panel**:
   - In Group Sockets panel, add Input/Output items
   - Configure name, type, default
   - Internal nodes should auto-create connections

3. **Connect Group I/O**:
   - Verify Group Input and Group Output exist
   - Verify internal nodes connected to them
   - Only connected outputs appear on group

### Problem: Cannot Edit Group (Tab Not Working)

**Symptoms**
- Tab key does not enter group
- "Edit Group" menu item greyed out
- Cannot access internal nodes

**Root Causes**
- Node group not selected
- Group locked or protected
- Keyboard shortcut disabled

**Solutions**

1. **Select Group Node**:
   - Click on group node
   - Verify it's highlighted
   - Only selected group can be edited

2. **Use Menu**:
   - Node > Edit Group
   - Or right-click group > Edit Group
   - More reliable than keyboard shortcut

3. **Check Group Validity**:
   - Group might be corrupted
   - Try separating nodes with Alt+P
   - Regroup with Ctrl+G

### Problem: Group Changes Don't Appear in Instances

**Symptoms**
- Modified group internal nodes
- Other instances of group not updated
- Changes appear only in edited instance

**Root Causes**
- Editing different group instances
- Didn't exit group properly
- Node tree not saved

**Solutions**

1. **Verify Editing Correct Group**:
   - Check breadcrumbs for location
   - Should show group name
   - Verify it's the definition, not instance

2. **Exit and Check**:
   - Press Tab to exit group
   - Check if other instances updated
   - Undo and try again if not

3. **Save File**:
   - Unsaved changes might not propagate
   - File > Save or Ctrl+S
   - Changes become persistent

4. **Separate and Regroup**:
   - If confusion persists, ungroup (Ctrl+Alt+G)
   - Manually edit nodes
   - Regroup with Ctrl+G

---

## Advanced Techniques

### Technique 1: Smart Group with Fallback

Create group that works with or without inputs.

**Concept**: Group provides sensible behavior whether inputs connected or not.

**Example: Optional Color Correction**

```
Group: Smart Color Correction
├─ Inputs:
│  ├─ Base Color (connected or uses default)
│  └─ Use Correction (Boolean, determines path)
├─ Logic:
│  ├─ If Use Correction true: Apply correction
│  └─ If false: Pass through color
└─ Outputs: Corrected Color
```

**Benefits**:
- Flexible usage
- Works with or without input
- User controls whether correction applied
- Clean fallback behavior

---

### Technique 2: Templated Group Hierarchy

Create template structure for consistent group organization.

**Template Structure**:
```
Template: "Standard Processing"
├─ Settings Panel (collapsed by default)
│  ├─ Debug Mode (Boolean)
│  ├─ Quality Level (Enum)
│  └─ Seed Value (Integer)
├─ Main Processing Panel
│  ├─ Input Validation
│  ├─ Core Processing
│  └─ Output Formatting
```

**Advantages**:
- Consistent structure across groups
- Users know where to find settings
- Standard organization easier to maintain
- Template can be duplicated for new groups

---

### Technique 3: Group with Version Management

Support multiple versions of functionality.

**Concept**: Group with selection between implementations.

**Example: Multiple Noise Options**

```
Group: Noise Field
├─ Inputs:
│  ├─ Position (Vector)
│  ├─ Noise Type (Enum: Perlin, Voronoi, Simplex)
│  └─ Scale (Float)
├─ Logic:
│  └─ Switch based on Noise Type
│      ├─ Perlin: [Perlin Noise Nodes]
│      ├─ Voronoi: [Voronoi Nodes]
│      └─ Simplex: [Simplex Nodes]
└─ Outputs: Noise Field
```

**Benefits**:
- Single group, multiple implementations
- User selects which version to use
- Easy to update all versions together
- Single point of maintenance

---

## Related Documentation

Learn more about related Blender topics:

- **[Nodes Overview](BLENDER_UI_NODES.md)**: Fundamental node concepts and operations
- **[Node Editors](BLENDER_UI_NODE_EDITORS.md)**: Node editor interface and controls
- **[Editing Nodes](BLENDER_UI_EDITING_NODES.md)**: Techniques for node manipulation
- **[Arranging Nodes](BLENDER_UI_ARRANGING_NODES.md)**: Node organization strategies
- **[Selecting Nodes](BLENDER_UI_SELECTING_NODES.md)**: Node selection methods
- **[Common Nodes](BLENDER_UI_COMMON_NODES.md)**: Essential node types overview
- **[Enable Output Node](BLENDER_UI_ENABLE_OUTPUT_NODE.md)**: Conditional output control
- **[Node Bundles Overview](BLENDER_UI_NODE_BUNDLES.md)**: Data bundling concepts
- **[Combine Bundle Node](BLENDER_UI_COMBINE_BUNDLE_NODE.md)**: Bundle creation
- **[Separate Bundle Node](BLENDER_UI_SEPARATE_BUNDLE_NODE.md)**: Bundle decomposition
- **[Join Bundle Node](BLENDER_UI_JOIN_BUNDLE_NODE.md)**: Bundle merging
- **[Node Closures](BLENDER_UI_NODE_CLOSURES.md)**: Advanced functional nodes

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Beginner to Intermediate  
**Typical Use**: Node organization, group management, workflow clarity
