# Selecting Nodes

## Overview

Selecting nodes is fundamental to working efficiently in Blender's node editors. Nodes are selected to perform operations like moving, duplicating, connecting, or grouping them together. The selection system provides both basic selection methods and advanced selection tools for navigating complex node trees.

The **active node** (the last selected node) is highlighted with a lighter outline and serves multiple important roles:
- Reference for grouping and linking operations
- Determines which properties display in the Sidebar and Properties Editor
- Used as the "source" for certain connection operations
- Acts as the anchor point for relative positioning

Understanding both basic selection and advanced selection techniques is essential for productive node editing workflows.

## Basic Node Selection

### LMB Selection

The primary selection method uses **LMB (Left Mouse Button)** click directly on a node:

- **Single Click**: Selects that node exclusively, deselecting all others
- **Result**: The clicked node becomes both selected and active
- **Visual Feedback**: Selected nodes display a lighter outline
- **Active Node**: Always highlighted distinctly from other selected nodes

### Shift-LMB Multi-Selection

Extend the current selection by holding **Shift** while clicking nodes:

- **Shift-LMB Click**: Adds the clicked node to the selection
- **If Already Selected**: Shift-LMB toggles the node off (deselects it)
- **Active Node**: Changes to the last clicked node while maintaining previous selections
- **Use Case**: Select multiple nodes for batch operations (move, copy, group)

**Example Workflow**:
1. LMB click node A (select A, deselect others)
2. Shift-LMB click node B (now both A and B selected, B is active)
3. Shift-LMB click node C (now A, B, C selected, C is active)
4. Shift-LMB click node A again (now only B and C selected, A toggled off)

### Active Node Concept

The **active node** is the most recently selected node and provides context for many operations:

**Visual Identification**:
- Lighter outline than other selected nodes
- Brighter highlight color
- Displayed in editor header as reference

**Operations Using Active Node**:
- **Grouping (Ctrl-G)**: Groups the active node with all other selected nodes
- **Linking**: New connections reference the active node's sockets
- **Properties Display**: Sidebar shows the active node's properties
- **Node Type Cycling**: Shift-] and Shift-[ navigate through same-type nodes from the active selection

**Selection Without Active Change**:
Some operations allow multi-select without changing the active node (see advanced selection tools).

## Selection Operations

### All
**Menu**: Select ‣ All  
**Shortcut**: A

Selects every node in the current node tree:

- **Function**: Toggles selection of all nodes
- **If All Selected**: Pressing A again deselects all (equivalent to None)
- **Active Node**: When selecting all, the last node in the tree order becomes active
- **Use Case**: Quickly select entire node tree for mass operations (duplicate, delete, group)

**Practical Workflow**:
```
1. A key → Select all nodes
2. G key → Move entire network
3. Mouse movement → Reposition
4. LMB → Confirm repositioning
```

### None
**Menu**: Select ‣ None  
**Shortcut**: Alt-A

Deselects all nodes:

- **Function**: Clears all selections without affecting node data
- **Active Node**: No active node after deselection
- **Use Case**: Start fresh selection without moving view or modifying network

**Keyboard Workflow**:
- Alt-A: Deselect all
- Alt-A, then LMB: Deselect all and immediately select one node

### Invert
**Menu**: Select ‣ Invert  
**Shortcut**: Ctrl-I

Inverts the selection state of all nodes:

- **Function**: Selected nodes become unselected, unselected nodes become selected
- **Active Node**: Maintains the previously active node (if it's in the new selection)
- **Useful For**: Selecting everything except a few nodes
- **Example**: Select 2 nodes, Ctrl-I inverts to select 10+ others instead

**Practical Example**:
```
1. Select 1-2 nodes you DON'T want
2. Ctrl-I → Invert selection (now have everything else)
3. Delete or move the unwanted deselected nodes
```

## Rectangular and Freeform Selection Tools

### Box Select
**Menu**: Select ‣ Box Select  
**Shortcut**: B

Select nodes within a rectangular region:

- **Activation**: Press B key (or menu select)
- **Interaction**: Click and drag to create a selection rectangle
- **Selection Mode**: Any node touching the rectangle is selected
- **Result**: All nodes within or touching the box are added to selection
- **Hold Ctrl**: Instead of adding to selection, subtracts from selection

**Workflow**:
```
1. B key → Enter box select mode
2. Click top-left corner of desired area
3. Drag to bottom-right corner
4. Release to confirm selection
5. ESC or RMB to cancel
```

**Tips**:
- Overlap detection is generous (slight touch = selected)
- Works with rotated/zoomed view
- Useful for selecting spatially grouped nodes

### Circle Select
**Menu**: Select ‣ Circle Select  
**Shortcut**: C

Select nodes with a circular brush:

- **Activation**: Press C key
- **Brush Control**: Mouse position determines circle center and radius
- **Continuous Mode**: Stays active until ESC or RMB pressed
- **Additive**: Adds selected nodes to current selection
- **Hold Ctrl**: Subtracts from selection instead

**Workflow**:
```
1. C key → Enter circle select mode
2. Position cursor over target area
3. Adjust brush radius by moving mouse
4. Click/drag to sweep and select nodes
5. Repeat steps 2-4 for additional areas
6. ESC or RMB → Exit circle select
```

**Advantages**:
- Precise for selecting clustered nodes
- Better than box select for non-rectangular node groupings
- Can continuously refine selection without re-entering tool

### Lasso Select
**Menu**: Select ‣ Lasso Select

Draw a freeform shape to select nodes:

- **Activation**: Use menu (Select ‣ Lasso Select)
- **Interaction**: Click and drag to draw arbitrary shape
- **Selection**: All nodes inside the drawn lasso region are selected
- **Result**: More control than box select for irregularly shaped groups

**Workflow**:
```
1. Select → Lasso Select (menu)
2. Click starting point
3. Drag and draw freeform outline around target nodes
4. Return to starting point to close the lasso
5. Release to confirm selection
```

**Best For**:
- Selecting scattered nodes with irregular shapes
- More precise than circle select for complex groupings
- Avoiding unintended node selection in crowded areas

## Connection-Based Selection

### Linked From
**Menu**: Select ‣ Linked From  
**Shortcut**: L

Expand selection to include all nodes connected to the **inputs** of the currently selected nodes:

- **Direction**: Selects nodes that feed data INTO selected nodes
- **Upstream Selection**: Traces connections backward (toward node sources)
- **Function**: Adds to existing selection (doesn't deselect current nodes)
- **Multiple Calls**: Pressing L again adds nodes further upstream
- **Useful For**: Understanding data flow, selecting entire input chains

**Visual Example**:
```
Node A → Node B → Node C → Node D
           ↓
         Node E

With Node C selected:
- L once: Adds Nodes A and B (connected to C's inputs)
- L again: Adds any nodes feeding A and B
- L again: Continues tracing upstream
```

**Workflow**:
```
1. LMB select Node C (target node)
2. L key → Select all nodes feeding into C
3. L key again → Extend to nodes feeding those
4. Continue until desired upstream chain selected
5. G key → Move entire chain together
```

### Linked To
**Menu**: Select ‣ Linked To  
**Shortcut**: Shift-L

Expand selection to include all nodes connected to the **outputs** of the currently selected nodes:

- **Direction**: Selects nodes that receive data FROM selected nodes
- **Downstream Selection**: Traces connections forward (toward outputs)
- **Function**: Adds to existing selection (doesn't deselect current nodes)
- **Multiple Calls**: Pressing Shift-L again adds nodes further downstream
- **Useful For**: Understanding node dependents, selecting output chains

**Visual Example**:
```
Node A → Node B → Node C → Node D → Node E
           ↓
         Node F

With Node B selected:
- Shift-L once: Adds Nodes C, D, E (and F if connected)
- Shift-L again: Adds any nodes receiving output from downstream
```

**Combined Selection Workflow**:
```
1. LMB select Node B (source)
2. L key → Select nodes feeding into B
3. Shift-L key → Also select nodes fed from B
4. Now have complete processing chain selected
5. Move or modify entire chain
```

### Linked From + Linked To Chain

You can chain these operations to select entire processing pipelines:

```
1. Select one central node
2. L → Get everything feeding into it
3. Shift-L → Get everything it feeds to
4. Result: Complete data flow chain around central node
```

This is extremely useful in complex node trees where you need to isolate and modify entire processing paths.

## Grouped Selection

### Select Grouped
**Menu**: Select ‣ Select Grouped  
**Shortcut**: Shift-G

Select nodes that share properties with the currently **active** node:

The grouping criteria are:

**Type**: Select all nodes of the same type
- Example: Active node is "Math" → selects all Math nodes
- Useful for: Finding all instances of a specific node operation
- Best for: Modifying all similar operations at once

**Color**: Select nodes with the same custom editor color
- Example: Active node is colored red → selects all red nodes
- Refers to: User-assigned display colors in the editor (not processed color data)
- Useful for: Selecting nodes you've manually organized by color
- Workflow: Color-code node sections, then Shift-G to select one section

**Prefix/Suffix**: Select nodes with matching name patterns
- **Prefix Mode**: Match beginning of node name (e.g., "Mix" matches "Mix Color", "Mix RGB")
- **Suffix Mode**: Match ending of node name (e.g., "Color" matches "Mix Color", "Bright Color")
- Useful for: Selecting nodes by naming convention
- Workflow: Name nodes with prefixes ("out_", "temp_"), then select by pattern

**Workflow Examples**:

*Example 1 - Select All Math Nodes*:
```
1. LMB click any Math node (becomes active)
2. Shift-G → Select Grouped opens
3. Choose "Type"
4. All Math nodes in tree selected
5. Can now change their operations simultaneously
```

*Example 2 - Color-Coded Organization*:
```
1. Created node sections: Input (blue), Processing (green), Output (red)
2. LMB click one green node
3. Shift-G → Type → Color
4. All green processing nodes selected
5. G key → Move entire processing section
```

*Example 3 - Named Convention Selection*:
```
1. Nodes named: "out_Color", "out_Alpha", "out_Normal" (output section)
2. Nodes named: "temp_Mix", "temp_Math" (temporary operations)
3. LMB click "out_Color" (becomes active)
4. Shift-G → Prefix/Suffix
5. Select "Suffix: out" → All output nodes selected
```

## Type-Based Navigation

### Activate Same Type Previous/Next
**Menu**: Select ‣ Activate Same Type Previous/Next  
**Shortcut**: Shift-] (Next) / Shift-[ (Previous)

Cycle through nodes of the same type as the active node:

- **Function**: Jumps to the next or previous node of the same type
- **Direction**: Based on node tree order (not visual position)
- **Active Node Change**: The target node becomes the new active node
- **View Centering**: Editor automatically pans to center the new active node
- **Selection Preservation**: Other selected nodes remain selected
- **Useful For**: Quickly navigating through all instances of a specific node type

**Navigation Workflow**:
```
1. LMB click a Math node (becomes active)
2. Shift-] → Jump to next Math node
3. Shift-] → Jump to next Math node after that
4. Continue until desired Math node found
5. Shift-[ → Go back to previous Math node
6. Can also Shift-LMB select while cycling to build multi-type selection
```

**Practical Example**:
```
Scene with 15 Math nodes scattered throughout
1. LMB click any Math node
2. Shift-] repeatedly to preview each Math node
3. When finding the one to modify:
   - Make changes to its properties
   - Shift-] → Move to next
   - Continue without clicking new nodes
4. Fast navigation without needing to locate visually
```

**Best For**:
- Large node trees with many instances of same type
- Finding specific nodes without scrolling/zooming
- Comparing settings across multiple similar nodes

## Find Node - Search & Locate

### Find Node
**Menu**: Select ‣ Find Node  
**Shortcut**: Ctrl-F

Open a search interface to locate and select nodes:

- **Activation**: Press Ctrl-F
- **Display**: Pop-up search field appears at cursor location
- **Search Targets**: Searches by:
  - Node name
  - Socket labels (both input and output socket names)
  - String values (text data within nodes)
  - Data-block references (linked objects, images, materials, etc.)
- **Result**: Matching nodes highlighted and can be selected
- **Auto-Pan**: View automatically centers on found node
- **Search Filtering**: Type to filter results in real-time

**Search Criteria Examples**:

*Search by Node Name*:
- Query: "Math" → Finds all Math nodes
- Query: "Mix Color" → Finds Mix Color nodes
- Query: "out" → Finds nodes with "out" in their name (e.g., "out_Alpha", "output")

*Search by Socket Label*:
- Query: "Value" → Finds sockets labeled "Value" (e.g., on Math nodes, Value nodes)
- Query: "Alpha" → Finds Alpha input/output sockets
- Query: "Normal" → Finds nodes with Normal sockets (Normal Map, etc.)

*Search by Socket Values*:
- Query: "image" → Finds Image Texture nodes with specific images
- Query: "material" → Finds Material Output nodes referencing materials
- Query: Specific string values used in String nodes

**Workflow**:

```
1. Ctrl-F → Search pop-up appears
2. Type search term (e.g., "Bevel" for Bevel BSDF node)
3. Type to filter results in real-time
4. Up/Down arrows navigate matching nodes
5. Return/LMB → Select and center on matched node
6. ESC → Close search without changing selection
```

**Practical Search Examples**:

*Finding Image Texture with Specific Image*:
```
1. Ctrl-F
2. Type image filename (e.g., "diffuse_map")
3. Results show Image Texture nodes using that image
4. Return → Center on and select that node
```

*Locating All Sockets of Type*:
```
1. Ctrl-F
2. Type socket label (e.g., "Strength")
3. Results show all nodes with Strength inputs/outputs
4. Can navigate through each with arrow keys
```

*Finding Renamed Nodes*:
```
1. If you renamed nodes with prefixes (e.g., "BSDF_Glossy")
2. Ctrl-F → Type "BSDF_"
3. All custom-named BSDF nodes appear
4. Quick access to organized custom nodes
```

**Search Tips**:
- Partial matches work (typing "Mix" finds Mix Color, Mix Shader, Mix RGB)
- Case-insensitive searching
- Search remembers previous queries (helps with repeated searches)
- Great for large node trees with 100+ nodes
- Much faster than manual scrolling/zooming

## Selection Workflows in Practice

### Building Complex Multi-Node Selections

**Scenario**: You have a complex node tree and need to select a specific sub-group without clicking each individually.

**Method 1 - Box/Circle Select**:
```
1. B key → Box select mode
2. Drag to encompass the node group
3. LMB → Confirm and select all in area
4. Can repeat B for additional areas with Shift held
```

**Method 2 - Connection-Based**:
```
1. LMB click the target node (central to the group)
2. L key → Select all nodes feeding in
3. Shift-L key → Select all nodes being fed from
4. Shift-LMB any additional isolated nodes to add them
5. Now have entire processing chain selected
```

**Method 3 - Grouped Selection + Manual Refinement**:
```
1. LMB click a node in desired group
2. Shift-G → Color (if color-coded) or Type
3. Select the grouping criterion
4. Shift-LMB any extras to add or remove
5. Have selected entire category or type
```

### Fast Node Replacement in Pipelines

**Scenario**: Need to replace one node type with another throughout a specific pipeline section.

```
1. LMB click a node in the pipeline
2. L key → Select upstream (input sources)
3. Shift-L key → Select downstream (output targets)
4. Now have entire pipeline section selected
5. Delete selected → Remove entire section if unwanted
6. Add new node and connect to same input/output points
7. New node inherits the pipeline connections
```

### Organizing Selection for Group Creation

**Scenario**: Create a node group from multiple related nodes.

```
1. LMB click primary node
2. Shift-LMB add related nodes to selection
   OR Use L, Shift-L, or Shift-G to select related nodes
3. Ctrl-G → Create node group from all selected
4. Group now contains all selected nodes
5. Can collapse/expand as needed
```

### Navigating Large Trees Efficiently

**Scenario**: You have a 200+ node tree and need to make surgical edits.

```
Method 1 - Find Node Search:
1. Ctrl-F → Search for specific node name or socket
2. Returns → Navigate directly to target
3. Make edits to found node
4. Repeat for next target

Method 2 - Type Navigation:
1. LMB click any Bevel node to make it active
2. Shift-] to jump through each Bevel node
3. Preview and edit each as needed
4. No manual location searching required

Method 3 - Color Coded Sections:
1. Visually organized by section (input, processing, output)
2. Each section has custom color
3. Shift-G Color → Select entire section
4. Move or edit section as a unit
```

## Advanced Selection Tips

### Selection State Preservation

When making selections:
- **Deselect All First** (Alt-A) if you want a fresh selection
- **Incremental Building** (Shift-LMB) to add individual nodes
- **Toggle Off** (Shift-LMB on selected node) to remove from selection

### Finding Hidden Connections

Some nodes can be partially off-screen or obscured:

```
1. A key → Select all nodes (ensures nothing missed)
2. Use L/Shift-L to trace connections
3. Even if visually obscured, connections reveal node existence
4. Navigate to found nodes with view panning
```

### Selection in Collapsed Groups

When working with node groups:
- Ctrl-Tab → Enter group editing mode
- Normal selection applies inside the group
- Selected nodes inside group are independent of outer selection
- Exit group → Return to main tree selection state

### Managing Large Selection Sets

For trees with dozens of selected nodes:

```
1. Alt-A → Deselect all (start fresh)
2. Use specific selection tools (Find Node, Link From/To, Grouped)
3. Avoid selecting all (A key) unless truly necessary
4. Use Shift-G with Color to organize selection by category
```

## Related Documentation

- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node anatomy and basic node operations
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface and controls
- [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md) - Node component details and socket types
- [BLENDER_UI_SELECTING.md](BLENDER_UI_SELECTING.md) - General selection methods in other editors
