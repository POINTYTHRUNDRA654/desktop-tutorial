# Editing Nodes

## Overview

Editing nodes is the core workflow in Blender's node editors. Once nodes are selected and positioned, you'll spend most of your time modifying them - transforming their position and size, connecting sockets to build data flows, duplicating and replacing nodes, and toggling visibility of node properties and sockets.

This comprehensive guide covers all node editing operations, from basic transformations to advanced linking and disconnection techniques, enabling efficient and flexible node tree construction and modification.

## Transform Operations

### Move (G)

**Menu**: Node ‣ Move  
**Shortcut**: G

Move selected nodes to new positions:

**Basic Workflow**:
```
1. Click and drag any empty part of node
2. Node follows cursor
3. LMB to confirm or ESC to cancel

OR

1. G key → Activate move mode
2. Move mouse to new position
3. LMB to confirm or Return to confirm
4. ESC to cancel
```

**Movement Constraints**:
- Move freely in X and Y axes
- Snapping respects grid when enabled (see Arranging Nodes)
- Multiple selected nodes move together as group
- Offset relationships maintained between selected nodes

**Intelligent Node Insertion on Links**:

When dragging a node over an existing connection, intelligent insertion activates:

```
Before (two connected nodes):
Node A ——— Connection ——— Node B

During (dragging new node over connection):
Node A ——— [cursor with node] ——— Node B
           (link is highlighted)

After (releasing mouse):
Node A ——— New Node ——— Node B
(New node automatically inserted with connections adjusted)
```

**How Insertion Works**:
- Detects when node is dragged onto active link
- Automatically connects node to the link path
- Uses first socket matching the link data type
- Triggers Auto-Offset to arrange nodes cleanly
- Maintains original data flow without manual reconnection

**Disabling Automatic Insertion**:
- Press **Alt** while dragging to disable smart insertion
- Node lands on top of link without connecting
- Useful when you want to position without auto-connecting
- Can manually connect afterward

**Auto-Offset During Insertion**:
- When node is inserted, surrounding nodes offset automatically
- Direction toggles with **T** key during drag
- See Arranging Nodes for offset margin customization

**Frame Attachment Toggle**:

While dragging nodes, press **F** to toggle frame attachment:

```
Situation 1: Nodes inside a Frame
- Press F while dragging
- Nodes detach from frame
- Can be moved outside frame

Situation 2: Nodes outside frames
- Press F while dragging over a frame
- Nodes attach to that frame (if one exists under cursor)
- Nodes move with frame thereafter

Useful For:
- Organizing nodes into logical groups
- Moving entire sections together
- Creating hierarchical node organization
```

### Resize (S)

**Shortcut**: S

Resize node dimensions:

**Scaling Behavior**:
- Only works when **multiple nodes are selected**
- Resizes all selected nodes relative to their center
- Only affects node **positions**, not their visual appearance
- Changes scale relative to center point

**Workflow**:
```
1. Select multiple nodes (Shift-LMB)
2. S key → Enter scale mode
3. Move mouse to scale:
   - Moving away from center: Nodes spread apart
   - Moving toward center: Nodes cluster together
4. LMB or Return to confirm
```

**Practical Use Cases**:
- Compress tightly connected nodes
- Expand nodes for better visibility
- Scale positioning of entire groups relative to center

### Rotate (R)

**Shortcut**: R

Rotate selected nodes:

**Rotation Behavior**:
- Only works when **multiple nodes are selected**
- Rotates positions of nodes around their collective center
- Does **not** rotate individual node appearance
- Affects spatial arrangement only

**Workflow**:
```
1. Select multiple nodes (Shift-LMB or B key)
2. R key → Enter rotate mode
3. Move mouse to rotate arrangement:
   - Determines rotation angle
4. Type number for exact angle (e.g., "45") then Return
5. LMB or Return to confirm
```

**Practical Use Cases**:
- Rearrange cluster of related nodes
- Change flow direction from vertical to diagonal
- Reorganize node layout after major restructuring

### Manual Node Width Adjustment

**Method**: Click and drag left or right border of node

Manually adjust individual node width:

**How It Works**:
- Locate left or right edge of node border
- Click and drag edge left (narrower) or right (wider)
- Node width adjusts to accommodate content
- Useful for compact display or better visibility

**Workflow**:
```
1. Hover near left or right edge of node
2. Cursor changes to resize cursor (left-right arrows)
3. Click and drag:
   - Right: Widen node to show more content
   - Left: Narrow node to compact display
4. Release to confirm new width
5. Can double-click edge to auto-fit width to content
```

**Use Cases**:
- Compact math nodes when properties not needed
- Expand Vector/Transform nodes to see all fields
- Optimize visibility of node lists or arrays

## Connecting Sockets

### Basic Link Creation

**Method**: LMB-click and drag from socket to socket

Create connections between node sockets:

**Workflow**:
```
1. LMB click on output socket (right side of node)
2. Drag line (link) across editor
3. Line visually shows data path (called a "link")
4. Drag to input socket of another node (left side)
5. Release LMB over target socket to connect
6. Link established - data now flows along this path
```

**Multiple Links from Output**:
- Output sockets can have **multiple links** coming out
- Each output can feed into many node inputs
- Useful for broadcasting data to multiple nodes

**Multiple Links to Input**:
- Typically, only **one link** connects to an input socket
- Exception: Multi-socket inputs (pill-shaped sockets)
- Multi-sockets allow multiple simultaneous inputs
- Data is typically combined or processed differently

**Visual Feedback**:
- Dragging shows line preview
- Valid target sockets highlight when hovered
- Link color matches socket data type
- Invalid connections (type mismatch) show red

### Link Swapping with Alt

**Method**: Alt + drag link while moving

Swap multiple links of similar type:

**How It Works**:
```
Situation: Want to swap which data feeds which input

Before:
Color Input → Color Ramp Input
Texture → Color Ramp Color

Want to swap the inputs:

During:
1. Alt + drag on Color Input link
2. Drag to Texture position (swapping target)
3. Link repoints to different socket
```

**Works With**:
- Moving existing links
- Adding new links to pre-existing sockets (replaces while swapping)
- Data type matching (only swaps same-type connections)

**Practical Example**:
```
Have a Mix Color node with two color inputs
- Input A connected to Texture 1
- Input B connected to Texture 2

Want to quickly swap which texture feeds which input:
1. Alt + click and drag one connection
2. Drag to swap positions
3. Textures now feed opposite inputs
4. Useful for quick adjustments without disconnecting/reconnecting
```

### Link Repositioning with Ctrl

**Method**: Ctrl + drag from output socket

Reposition outgoing links without creating new connection:

**How It Works**:
```
Original Setup:
Node Output ——→ Input 1
Node Output ——→ Input 2

Want to change which inputs these connect to:

1. Ctrl + drag from Node Output socket
2. Click on currently connected link
3. Drag it to different input socket
4. Link repoints to new location

Works with:
- Single outgoing links (move to different input)
- Multiple outgoing links (reorganize which connects where)
```

**Practical Use**:
- Reroute existing connections without deleting
- Swap which nodes feed which inputs
- Maintain connection integrity while reorganizing

### Auto-Insert on Links

**Method**: Move node over link and release

Automatically insert nodes into connections:

**How It Works**:
```
Requirement: Node must have matching input/output sockets

Before:
Node A ——— Link ——— Node B

Process:
1. Create or position new node with inputs and outputs
2. Hover node over the A-to-B link
3. Link highlights to show insertion will occur
4. Release to insert node
5. New connection: Node A → New Node → Node B
```

**Automatic Features**:
- First matching socket type is used
- Auto-Offset activates to arrange nodes
- Data flow maintained without manual reconnection

### Make Links (J)

**Shortcut**: J

Create automatic connections between selected nodes:

**Workflow**:
```
1. Select multiple nodes with open sockets (Shift-LMB)
2. J key → Make Links operator
3. Blender automatically connects:
   - Output sockets to matching input sockets
   - Based on data type compatibility
4. If compatible connections exist, they're created
5. Press J again if more connections possible
```

**How It Works**:
- Scans all selected nodes for open sockets
- Matches data types (Color to Color, Value to Value, etc.)
- Creates direct connections between compatible sockets
- Skip incompatible sockets

**Use Cases**:
- Quickly connect nodes without manual dragging
- Create multiple connections efficiently
- Auto-organize output chains

**Example**:
```
Setup: Image Texture, Mix Color, Color Ramp selected
1. Select all three nodes
2. J key → Make Links
3. Blender connects:
   - Image Color output → Mix Color inputs
   - Mix result → Color Ramp input
4. Fully connected chain created automatically
```

### Make and Replace Links (Shift-J)

**Shortcut**: Shift-J

Create automatic connections, replacing existing links if needed:

**Difference from Make Links**:
- Make Links (J): Only adds new connections
- Make and Replace Links (Shift-J): Adds new and replaces old

**Workflow**:
```
1. Select multiple nodes
2. Shift-J → Make and Replace Links
3. Blender:
   - Connects matching sockets
   - Replaces existing connections if better match found
4. Useful for reorganizing connections
```

**When to Use**:
- Reorganizing partially connected nodes
- Replacing suboptimal connections
- Rapid prototyping of node configurations

## Disconnecting and Muting Links

### Disconnect Interactively

**Method**: Drag link away from socket

Manually disconnect individual links:

**Workflow**:
```
1. Click on link (the line itself, not endpoints)
2. Drag link away from its input socket
3. Drag until line is unconnected
4. Release to finalize disconnection
5. Link is removed, data no longer flows
```

**Result**:
- Target node loses input data
- Input fields become visible again (if data came from link)
- Can modify default values in disconnected input

### Mute Links (Ctrl-Alt-RMB)

**Menu**: Node ‣ Mute Links  
**Shortcut**: Ctrl-Alt-RMB

Temporarily disable links by drawing across them:

**How It Works**:
```
1. Ctrl-Alt-RMB (hold combination)
2. Draw a line across one or more links to toggle muting
3. Muted links:
   - Appear red as visual indicator
   - No longer transmit data
   - Act as though disconnected (but remain connected)
4. Draw again to unmute
```

**Muted Link Behavior**:
- Sends no data through connection
- Input becomes exposed (shows default/editable value)
- Node continues to process but ignores muted inputs
- Reconnection preserved (doesn't break link structure)

**Advantages Over Disconnect**:
- Faster toggle on/off without reconnecting
- Preserves connection structure (faster to restore)
- Visual indicator (red line) shows muted status
- Compare quickly with/without specific data inputs

**Reroute Node Interaction**:
- Muting input-side links on reroute node
- Automatically mutes output-side links too
- Prevents orphaned reroute nodes

**Practical Workflow**:
```
Testing shader variations:
1. Build complex shader network
2. Want to test with/without specific input
3. Ctrl-Alt-RMB: Draw across input link to mute
4. See result without input
5. Draw again to unmute and compare
6. No reconnection needed - faster iteration
```

### Cut Links (Ctrl-RMB)

**Menu**: Node ‣ Cut Links  
**Shortcut**: Ctrl-RMB

Permanently delete links by drawing across them:

**How It Works**:
```
1. Ctrl-RMB (hold combination)
2. Draw a line across one or more links to cut them
3. Cut links are permanently deleted
4. No visual remains (unlike muted links)
5. Nodes disconnected completely
```

**Difference from Mute Links**:
- Mute: Links stay connected but inactive (red visual)
- Cut: Links permanently removed (reconnect manually if needed)

**Use Cases**:
- Delete unwanted connections
- Rapidly disconnect multiple links
- Clean up when reorganizing node tree

**Practical Workflow**:
```
Reorganizing node tree:
1. Identify links to remove
2. Ctrl-RMB: Draw across multiple links to cut
3. All cut links deleted in one stroke
4. Faster than clicking individual disconnect buttons
5. Can undo (Ctrl-Z) if mistake
```

### Detach Links (Alt-LMB drag)

**Method**: Alt + LMB drag on node

Cut all links attached to selected nodes while moving:

**How It Works**:
```
1. Alt + LMB click and drag a node
2. All input and output links disconnect
3. Node moves to new location as normal
4. All links severed simultaneously
5. Node is now isolated but preserved
```

**Result**:
- Selected nodes move independently
- All connections removed
- Nodes retain their properties and structure
- Can reconnect manually afterward

**Practical Use**:
- Move node without preserving connections
- Extract node for repositioning elsewhere
- Clean break from existing network

**Example**:
```
Want to move a node out of its current position and use it elsewhere:
1. Alt + LMB drag the node
2. All connections cut
3. Node moves to new location unconnected
4. Reconnect in new location as needed
5. Faster than selecting links individually
```

## Copy, Paste, and Duplicate

### Copy (Ctrl-C)

**Shortcut**: Ctrl-C

Copy selected nodes to clipboard:

**What Gets Copied**:
- Selected nodes themselves
- All properties and settings
- Connections **between selected nodes** (internal connections)
- Not: Connections to unselected nodes

**Workflow**:
```
1. Select nodes to copy (Shift-LMB or B key)
2. Ctrl-C → Copy to clipboard
3. Switch editors or trees (optional)
4. Ctrl-V → Paste (see Paste section)
```

**Internal Connection Preservation**:
```
Example: Copy 3 connected nodes
Node A → Node B → Node C (all selected)

Copied connections preserved:
- A to B connection comes along
- B to C connection comes along
- But NOT connections FROM A (from outside) or TO C (outside)
```

### Paste (Ctrl-V)

**Shortcut**: Ctrl-V

Paste copied nodes:

**Placement**:
- Nodes paste at **exact original position**
- Stacked on top of source nodes if same location
- Invisible if pasted directly on original

**Important Warning**:
```
Pasted nodes appear IN THE SAME LOCATION as copied nodes.
If you paste and see nothing new, the nodes are likely hidden
underneath the originals in the exact same spot.

Always move pasted nodes immediately:
1. Ctrl-V → Paste nodes
2. G key → Move immediately to reveal pasted nodes
3. See stacked nodes and confirm paste worked
4. Position as desired
```

**Cross-Tree Pasting**:
- Can paste into different node editors
- Can paste into different node trees
- Structure preserved across trees
- Connections maintained within pasted group

### Duplicate (Shift-D)

**Shortcut**: Shift-D

Create copies of selected nodes and move them:

**Workflow**:
```
1. Select node(s) to duplicate
2. Shift-D → Duplicate mode activated
3. Move mouse to new location
4. LMB or Return to confirm placement
5. Duplicated nodes created at new position
```

**What Gets Duplicated**:
- Node copy with all properties
- Internal connections preserved (like copy/paste)
- NOT external connections (to unselected nodes)

**Key Difference from Copy/Paste**:
- Duplicate immediately moves to new location
- No separate paste step
- Faster for single duplication workflow

**Hidden Duplicates Warning**:
```
Duplicate places new node directly on original.
You might not see it if you confirm without moving!

Safe workflow:
1. Shift-D → Duplicate
2. Move mouse immediately (confirm nodes moved)
3. Release when satisfied with position
4. LMB/Return to finalize
5. Never duplicate without moving first
```

### Duplicate Linked (Alt-D)

**Shortcut**: Alt-D

Duplicate nodes but not their node trees (for group nodes):

**Special Behavior**:
- Creates copy of node
- Does NOT duplicate interior of node groups
- Multiple nodes reference same group tree
- Changes to shared group affect all instances

**Use Case**:
- Reuse node group in multiple places
- Single group source, multiple references
- Efficient memory usage for complex groups
- Coordinated updates (modify group once, affects all)

**Example**:
```
Create complex node group (RGB Color Correction)
- Build once as group
- Duplicate Linked 5 times for 5 different color corrections
- All 5 instances reference same internal tree
- Edit group once = all 5 instances update automatically
```

## Deleting and Replacing Nodes

### Delete (X or Delete Key)

**Shortcut**: X, Delete

Remove selected nodes:

**Workflow**:
```
1. Select node(s) to remove
2. X key or Delete key
3. Node removed completely
4. All links to/from node severed
5. Undo (Ctrl-Z) if removed by mistake
```

**Result**:
- Nodes gone
- Connections deleted
- Downstream nodes now have missing inputs (show default values)

### Delete with Reconnect (Ctrl-X)

**Shortcut**: Ctrl-X

Remove nodes and automatically reconnect their inputs to outputs:

**How It Works**:
```
Before:
Input Node ——→ Removed Node ——→ Output Node

After Ctrl-X:
Input Node ——————————→ Output Node
(Direct connection, bypassing removed node)
```

**Automatic Reconnection Logic**:
- Connects former input nodes to former output nodes
- Attempts to match socket types
- Preserves data flow where possible
- Unmated sockets remain unconnected

**Practical Use**:
- Replace processing node quickly
- Test without specific operation
- Streamline node chain efficiently

**Example**:
```
Shader chain: Texture → Brightness/Contrast → Mix Shader
Don't want Brightness/Contrast anymore:
1. Select Brightness/Contrast node
2. Ctrl-X → Delete with Reconnect
3. Result: Texture → Mix Shader (direct)
4. Texture data now directly feeds Mix (skipping Brightness)
```

### Swap (Shift-S)

**Shortcut**: Shift-S

Replace selected node with different node type:

**Workflow**:
```
1. Select node to replace
2. Shift-S → Swap operator
3. Menu appears showing available node types
4. Click desired node type
5. New node replaces old node
6. All connections attempt to reconnect automatically
```

**Automatic Reconnection**:
- Existing links attempt to reconnect
- Matching by socket **name and type**
- Compatible connections preserved
- Unmatched connections left unconnected

**Practical Use**:
- Quick node type replacement
- Keeps network structure intact
- Preserve positioning and connections

**Example**:
```
Have Math node (Add mode) but want Subtract:
1. Select Math node
2. Shift-S → Swap
3. Select different Math node (or other operation node)
4. Replaces node in place
5. All connections reattach automatically
6. Faster than delete/create new node
```

## Show/Hide Operations

### Mute Node (M)

**Shortcut**: M

Disable node contribution to data flow:

**What Muting Does**:
- Node is disabled (grayed out)
- All output links appear **red**
- Data passes through unmodified
- Links still exist but have no effect
- All input properties become visible/editable

**Visual Indicator**:
- Red links show muted status
- Node may appear dimmed
- Clear indication of inactive node

**Difference from Delete**:
- Mute: Node remains in tree but inactive
- Delete: Node removed completely
- Mute: Reconnect instantly (just unmute)
- Delete: Must recreate or undo to restore

**Practical Workflow**:
```
Testing shader variations:
1. Build complete shader
2. M key on specific node to mute it
3. See result without that operation
4. Node remains in place
5. M again to unmute and compare
6. No manual reconnection needed
```

### Node Preview (Shift-H)

**Shortcut**: Shift-H

Show/hide preview of node output:

**What It Shows**:
- Display of data AFTER node's operation
- Small preview image/color swatch
- Shows processing result visually
- Helps debug and verify node behavior

**Location**:
- Appears on node (material ball icon area)
- Can toggle on/off per node

**Alternative Method**:
- Click material ball icon in node header

**Compositor Only**:
- This operator only available in Compositor
- Shows intermediate processing results
- Essential for debugging complex compositing trees

**Use Case**:
```
Compositor with multiple blur/color nodes:
1. Enable preview on Color Correction node
2. See color-corrected result
3. Enable preview on Blur node
4. See blurred version
5. Compare previews to verify processing
6. Without preview: can't see intermediate steps
```

### Node Options

**Menu**: Node ‣ Show/Hide ‣ Node Options

Show/hide all node properties:

**What It Hides**:
- Input fields and sliders
- Drop-down menus
- All editable node properties
- Only header and sockets remain visible

**Use Cases**:
- Compact display of many nodes
- Focus on connections, not properties
- Clean view of node tree structure
- Restore space in crowded layouts

**Workflow**:
```
1. Node options visible (default state)
2. Menu → Node → Show/Hide → Node Options
3. Node collapses to minimal view
4. Only header and sockets visible
5. Repeat to show options again
```

### Unconnected Sockets (Ctrl-H)

**Shortcut**: Ctrl-H

Hide/show sockets with no connections:

**What It Does**:
- Collapses sockets that aren't connected
- Keeps connected sockets visible
- Reduces visual clutter
- Shows only active data paths

**Practical Use**:
```
Complex node with 15 inputs, only 3 connected:
1. Ctrl-H → Hide unconnected sockets
2. Only 3 connected sockets visible
3. Much cleaner appearance
4. Still can connect hidden sockets if needed
5. Ctrl-H again to show all sockets
```

### Collapse (H)

**Shortcut**: H

Collapse/expand node to header only:

**Collapsed State**:
- Only node header visible
- Title bar and sockets remain
- All properties hidden
- Minimal footprint in editor

**Expanded State**:
- Full node with all options
- Properties visible and editable

**Alternative Method**:
- Click triangle icon on left side of node header

**Workflow**:
```
1. Node expanded (normal state)
2. H key → Collapse
3. Only header visible
4. H key again → Expand
5. Can toggle freely while editing
```

**Use Case**:
```
Large node tree with many simple value inputs:
1. Create all nodes
2. H key → Collapse non-critical nodes
3. Keep important nodes expanded
4. Much more compact view
5. Still editable (just not visible until expanded)
```

### Collapse and Hide Unused Sockets (H)

**Shortcut**: H (when sockets already hidden)

Applies both collapse and hide unconnected sockets:

**Combined Effect**:
- Collapses node to header only
- Hides unconnected sockets simultaneously
- Most compact node representation
- Header, sockets, and title only

**Result**:
```
Node before: [Header | Input 1-15 | Output 1-5 | Properties]
After: [Header | Connected Socket 1 | Connected Socket 2]
Minimal display, essential information only
```

## Compositor-Specific Operations

### Read View Layers (Ctrl-R)

**Menu**: Node ‣ Read View Layers  
**Shortcut**: Ctrl-R

Read render layers from cache:

**What It Does**:
- Loads render layer data from saved cache
- Allows processing without keeping all data in RAM
- Recovers data from failed/interrupted renders
- Requires "Cache Result" enabled on render layer node

**Compositor-Only Feature**:

**Use Case**:
```
Large render with 2GB output:
1. Render completes and caches result
2. Create compositor node tree
3. Don't need render in RAM anymore
4. Ctrl-R → Read View Layers
5. Load from cache file instead of memory
6. Process without RAM overhead
```

**Benefits**:
- Save RAM during post-processing
- Work with results of failed renders
- Separate rendering from compositing stages

### Connect to Output (Shift-Alt-LMB)

**Shortcut**: Shift-Alt-LMB

Connect selected node output to final output:

**What It Does**:
- Direct connection to Material Output (Shader)
- Connects to World Output (Shader World)
- Connects to Group Output (Geometry Nodes)
- Connects to Compositor Output (Compositor)
- Connects to Output (Texture Nodes)

**Behavior by Context**:

**Shader Editor**:
```
Shift-Alt-LMB on node:
- Auto-connects to Material Output node
- Data immediately visible in viewport/render
- Useful for quick testing
```

**Geometry Nodes**:
```
Shift-Alt-LMB on node:
- Connects to Group Output
- Result shows in geometry output
```

**Compositor**:
```
Shift-Alt-LMB on node:
- Connects to Compositor Output
- Composite node shows in final result
```

**Grouped Context**:
- If inside a node group, connects to Group Output
- Not to world output (respects scope)

**Workflow**:
```
Building shader:
1. Create Color Ramp node
2. Want to see result immediately
3. Shift-Alt-LMB on Color Ramp output
4. Auto-connects to Material Output
5. Result displays in viewport
6. No manual linking required
```

**Advantages**:
- Fastest way to see node output
- No need to locate output node
- Automatically finds correct destination
- Saves time in iterative testing

## Practical Editing Workflows

### Rapid Node Replacement

**Scenario**: Want to try different Math operations.

```
1. Select Math node
2. Shift-S → Swap
3. Choose different operation type
4. Connections automatically reattempt
5. See result instantly
6. Faster than delete/create/reconnect
```

### Testing With Mute

**Scenario**: Verify specific processing step.

```
1. Complex shader with many steps
2. M on specific node to mute it
3. See result without that step
4. Compare viewport/render
5. M again to unmute and toggle
6. No reconnection needed
7. Fast iteration on contributions
```

### Efficient Duplication

**Scenario**: Create multiple variations of same processing.

```
1. Build processing chain (5 nodes)
2. Shift-D → Duplicate all 5
3. Move to new location
4. Modify properties in duplicate
5. Original remains unchanged
6. Compare variations side by side
```

### Quick Output Preview

**Scenario**: See result of specific node.

```
1. Deep in node tree, want to see intermediate step
2. Shift-Alt-LMB on target node output
3. Auto-connects to final output
4. See exactly what that node produces
5. Shift-Alt-LMB on different node to switch
6. Much faster than manual linking
```

## Related Documentation

- [BLENDER_UI_SELECTING_NODES.md](BLENDER_UI_SELECTING_NODES.md) - Node selection methods
- [BLENDER_UI_ARRANGING_NODES.md](BLENDER_UI_ARRANGING_NODES.md) - Node positioning and snapping
- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node anatomy and structure
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface
- [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md) - Socket types and data flow
