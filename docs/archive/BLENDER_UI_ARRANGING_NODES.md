# Arranging Nodes

## Overview

Arranging nodes efficiently is crucial for maintaining readable and organized node trees. Blender provides automatic and manual tools to help keep node layouts clean, aligned, and visually coherent. As node trees grow in complexity, proper arrangement becomes essential for navigation, debugging, and collaboration.

The two primary arrangement systems in Blender node editors are:

1. **Snapping** - Aligns nodes to a background grid for clean positioning
2. **Auto-Offset** - Automatically moves existing nodes to make room for new nodes inserted into connections

Both systems work together to create organized, professional-looking node layouts with minimal manual intervention.

## Snapping

Snapping is a fundamental feature that aligns node positions to a background grid, ensuring layouts remain clean and visually organized. This grid-based alignment prevents nodes from being scattered randomly across the editor, which would create visual chaos and make navigation difficult.

### How Snapping Works

**Grid System**:
- The node editor displays a background grid
- Grid cells represent fixed spacing intervals
- When snapping is enabled, nodes align their position to this grid
- Node centers snap to the nearest grid intersection or grid line

**Alignment Behavior**:
- Nodes move in discrete steps matching grid spacing
- Cannot place nodes between grid cells when snapping is active
- All nodes snap to the same uniform grid
- Works in both X and Y axes simultaneously

### Enabling and Disabling Snapping

**Toggle Snap Icon**:
- **Location**: Editor header (top right area)
- **Icon**: Looks like a magnet (/) symbol
- **Method**: Click the icon to toggle snapping on/off
- **Visual Feedback**: Icon highlights when snapping is active

**Header Location**:
```
[View] [Select] [Add] [Node] ... [/ Snap] [Overlay] [Pins]
                                    ↑
                          Click to toggle snapping
```

### Temporary Snapping with Ctrl

Even when snapping is disabled globally, you can temporarily enable it for a single operation:

**Workflow**:
```
1. Move node (G key or drag)
2. While moving, hold Ctrl
3. Node snaps to grid during movement
4. Release Ctrl to return to free movement
5. Confirm with LMB or Return
```

**Use Case**: When snapping is off for flexibility, use Ctrl during critical alignments.

**Practical Example**:
```
1. Create node freely (snapping off)
2. G key → Move node
3. Hold Ctrl + move mouse → Node snaps to grid
4. Release Ctrl → Return to precise positioning
5. LMB → Confirm position
```

### Grid Visualization

The background grid helps visualize snap positions:

**Grid Appearance**:
- Faint grid lines in background
- Grid spacing consistent across editor
- Helps predict where nodes will snap
- Can be customized via preferences

**Seeing Grid While Moving**:
```
1. Snapping enabled
2. G key → Start moving node
3. Grid shows target snap positions
4. Visual feedback as node aligns to grid
5. Helps understand spacing relationships
```

## Auto-Offset

Auto-Offset is an intelligent feature that automatically moves existing nodes out of the way when you insert a new node into an active connection. This feature dramatically reduces manual node arrangement work and prevents visual clutter when building complex node networks.

### Understanding Auto-Offset

**What It Does**:
- When dropping a node with both input and output sockets onto a connection
- Auto-Offset detects the existing connection
- Automatically moves either the left or right node aside
- Creates space for the new node to fit cleanly
- Maintains visual organization without breaking data flow

**Why It's Useful**:
- Avoids overlapping nodes when inserting into connections
- Maintains readable node tree without manual repositioning
- Saves time in iterative design and node network building
- Works automatically without requiring conscious effort

### Auto-Offset Workflow

**Inserting a Node into a Connection**:

```
Step 1: Create two connected nodes (Source → Destination)
Source Output ——— Connection ——— Destination Input

Step 2: Create or prepare a new node with both inputs and outputs
New Node (prepared for insertion)

Step 3: Drag the new node onto the connection
Click and drag new node onto the ——— connection line

Step 4: Auto-Offset activates
- Detects the connection
- Moves Source or Destination aside
- New node fits cleanly into the connection
- Data flow preserved: Source → New Node → Destination
```

**Visual Example**:
```
BEFORE (attempting to insert):
Math ——— Connection ——— ColorRamp
       (crowded area)

DURING (dragging new node onto connection):
Math ——— (dropping here) ——— ColorRamp
       Mix Color node being dropped

AFTER (Auto-Offset completes):
Math ——— Mix Color ——— ColorRamp
    (left node moved aside automatically)
```

### Offset Direction Control

**Direction Setting**:
Auto-Offset moves nodes in a default direction (left or right) based on preferences. You can control which side moves during insertion:

**Toggling Direction with T**:
- While dragging a node onto a connection, press **T**
- Toggles which node moves (source vs. destination)
- Allows choosing preferred offset direction
- Useful when one side of the network should remain stable

**Workflow with Direction Toggle**:

```
1. Drag new node toward connection line
2. While still dragging (before dropping):
   - T key → Toggle offset direction
   - Observe which nodes move
3. Choose preferred arrangement by toggling
4. Release mouse to confirm with desired direction
5. Node drops and offset completes
```

**Example - Choosing Offset Direction**:

```
Scenario: Have a large sub-tree on the right side
Math → [Large Right Subtree with 10+ nodes]

Want to insert Mix Color without disrupting right subtree:
1. Create Mix Color node
2. Drag toward the connection
3. Press T → This would move right subtree
4. Press T again → This would move Math node (left)
5. Choose T state where left side moves
6. Drop Mix Color
7. Math gets offset, Mix Color inserts cleanly
```

### Auto-Offset Configuration

**Default Status**:
- Auto-Offset is **enabled by default**
- Most users benefit from automatic behavior
- Can be disabled in preferences if not desired

**Disabling Auto-Offset**:
```
Location: Edit ‣ Preferences ‣ Interface ‣ Editors
Option: Auto-Offset Nodes (toggle checkbox)
- Checked: Auto-Offset active (default)
- Unchecked: Manual node arrangement required
```

**When to Disable**:
- Prefer complete manual control over node positioning
- Working with highly customized node layouts
- Want to preserve exact spacing relationships
- Rare cases where auto-offset conflicts with workflow

### Auto-Offset Margin Setting

The **Auto-Offset Margin** controls the spacing between offset nodes:

**Location**:
```
Edit ‣ Preferences ‣ Editing ‣ Auto-Offset Margin
```

**What It Controls**:
- Distance between offset node and newly inserted node
- Measured in grid units or pixels
- Determines visual breathing room between nodes
- Affects cleanliness of resulting layout

**Adjusting Margin**:

**Default Setting**:
- Default margin provides standard spacing
- Works well for most workflows
- Balances spacing and compactness

**Increasing Margin**:
- Value: Higher number = more space
- Result: More spread out nodes after offset
- Use When: Want maximum visual separation and clarity
- Trade-off: Node tree becomes wider, requires more panning

**Decreasing Margin**:
- Value: Lower number = less space
- Result: Nodes positioned closer together
- Use When: Want compact, space-efficient layouts
- Trade-off: Less visual breathing room

**Example Settings**:

```
Conservative (wide spacing):
Auto-Offset Margin: 2.0 or higher
Result: Lots of space between offset nodes
Best for: Complex trees where visibility is critical

Standard (balanced):
Auto-Offset Margin: 1.0 (default)
Result: Moderate spacing, professional appearance
Best for: Most workflows

Compact (minimal spacing):
Auto-Offset Margin: 0.5 or lower
Result: Tight spacing between nodes
Best for: Working with many nodes in limited screen space
```

**Changing the Setting**:
```
1. Edit → Preferences
2. Click "Editing" section
3. Find "Auto-Offset Margin" slider/field
4. Adjust value:
   - Drag slider left (decrease) for tighter spacing
   - Drag slider right (increase) for wider spacing
5. Click checkmark or press Return to confirm
6. Setting applies to future offset operations
```

## Practical Arranging Workflows

### Organizing a Complex Node Tree

**Scenario**: You have a shader node tree with 30+ nodes and need to reorganize it cleanly.

**Workflow**:

```
1. Enable snapping (click / icon) for clean alignment
2. Select nodes to reposition (B or Shift-LMB)
3. Move selected nodes:
   - G key → Start moving
   - Nodes snap to grid automatically
   - Position in organized sections (input, processing, output)
4. When moving is complete:
   - LMB to confirm or Return
   - Nodes locked to grid positions
5. Result: Clean, organized layout with aligned nodes
```

### Building a Node Chain with Auto-Offset

**Scenario**: Adding multiple processing nodes to an existing connection.

**Workflow**:

```
1. Start with Color Ramp → ColorSpace node (existing connection)
2. Create Mix Color node
3. Drag Mix Color onto Color Ramp → ColorSpace connection
4. Auto-Offset activates:
   - ColorSpace moves right automatically
   - Mix Color fits between Color Ramp and offset ColorSpace
5. New connection: Color Ramp → Mix Color → ColorSpace
6. Create Bright Contrast node
7. Drag onto Mix Color → ColorSpace connection
8. Auto-Offset:
   - ColorSpace moves right again
   - Bright Contrast fits in
9. Final chain: Color Ramp → Mix Color → Bright Contrast → ColorSpace
10. All nodes positioned cleanly without manual arrangement
```

### Combining Snapping and Auto-Offset

**Scenario**: Building organized shader with both automatic insertion and manual alignment.

**Workflow**:

```
1. Create input nodes (Image Texture, Normal Map)
2. Snapping enabled - position input nodes in left column
3. Create processing section (Mix Color, Bright Contrast)
4. When inserting Mix Color into connections:
   - Auto-Offset moves existing nodes aside
   - Snapping ensures final positions align to grid
5. Create output node (BSDF) on right side
6. Connect processing nodes to BSDF inputs
7. When connecting, nodes may slightly offset
8. Enable snapping to re-align everything to grid
9. Result: Clean, organized, professional-looking shader network
```

### Adjusting for Preference

**If Auto-Offset Margin Too Loose**:

```
1. Notice nodes are too far apart after offset
2. Edit → Preferences → Editing
3. Reduce Auto-Offset Margin (e.g., 1.0 → 0.7)
4. Next time you insert nodes, spacing is tighter
5. Tree becomes more compact while remaining organized
```

**If Snapping Too Restrictive**:

```
1. Need fine positioning between grid points
2. Temporarily disable snapping:
   - Click / icon to turn off (or toggle in preferences)
   - Or hold Ctrl key while moving to bypass snapping temporarily
3. Position node precisely with free movement
4. Re-enable snapping for remaining nodes
```

## Arranging Tips and Best Practices

### Grid-Based Organization

**Using Snapping for Structure**:

```
1. Enable snapping for entire workflow
2. Create three vertical columns:
   - Left: Input nodes (Image, Value, Vector)
   - Center: Processing (Mix, Bright, Math, Bevel)
   - Right: Output (BSDF, Alpha output)
3. Nodes naturally align to grid positions
4. Visual columns organize complexity
5. Easy to navigate and understand flow
```

### Direction Awareness with Auto-Offset

**Choosing Offset Direction**:

```
Situation 1 - Small left subtree, large right processing:
- Move right side (press T to toggle direction)
- Keeps left side anchored

Situation 2 - Balanced trees:
- Toggle T to preview both directions
- Choose whichever looks cleaner
- May depend on where new node is being inserted

Situation 3 - Adding to main chain:
- Usually want the direction that minimizes overall tree width
- Hold T and check preview before committing
```

### Margin Settings by Use Case

**Large Complex Trees (100+ nodes)**:
```
Auto-Offset Margin: 1.5-2.0
Reason: More visual separation helps locate specific sections
Result: Tree is wider but easier to navigate
```

**Standard Shaders (30-50 nodes)**:
```
Auto-Offset Margin: 1.0 (default)
Reason: Good balance between space and efficiency
Result: Professional appearance, manageable width
```

**Mobile/Small Screen Work**:
```
Auto-Offset Margin: 0.5-0.8
Reason: Compact layout fits on smaller displays
Result: Tighter spacing, less panning required
```

**Presentation/Documentation**:
```
Snapping: Enabled
Auto-Offset Margin: 1.5+
Reason: Perfectly aligned, generous spacing looks professional
Result: Screenshots and recordings look polished
```

### Fixing Crowded Layouts

**When Node Tree Becomes Messy**:

```
1. Select all nodes (A key)
2. Delete if not needed, or
3. Use connection-based selection (L, Shift-L) to isolate sections
4. Move entire sections to new areas
5. Re-enable snapping to align:
   - Move section near grid
   - With snapping on, nodes align perfectly
6. Result: Previously crowded area now organized
```

### Working Without Auto-Offset

**If You Disable Auto-Offset**:

```
1. Insert new node into connection
2. Must manually move offset node yourself:
   - Select the node that needs moving
   - G key to move
   - Hold Ctrl for snapping alignment
3. Position it away from the new node
4. Reconnect if necessary
5. Takes longer, but gives total control
```

## Arranging in Different Node Editors

### Shader Editor Specifics

Shader trees often grow large and benefit from organization:

```
Typical Layout:
Left: Input nodes (Texture, Value, Vector)
Center-Left: Color/texture processing
Center-Right: Shader mixing and modification
Right: BSDF output, Alpha pass

Using Auto-Offset: Frequently insert between existing connections
Using Snapping: Organize into visual columns
```

### Geometry Nodes Specifics

Geometry trees can be deeply connected:

```
Typical Layout:
Top: Geometry input and modification
Middle: Instance operations, transforms
Bottom: Distribute among branches
Right: Join geometry outputs

Using Auto-Offset: Useful when building processing chains
Using Snapping: Helps organize scattered repeat operations
```

### Compositor Specifics

Compositor trees are typically more linear:

```
Typical Layout:
Left: Render Layers input
Center: Image processing (blur, color correction)
Right: Composite output and file output

Using Auto-Offset: Less critical (linear flow)
Using Snapping: Helps keep nodes in straight lines
```

## Related Documentation

- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node anatomy and basic operations
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface and controls
- [BLENDER_UI_SELECTING_NODES.md](BLENDER_UI_SELECTING_NODES.md) - Node selection methods
- [BLENDER_UI_TOOL_SYSTEM.md](BLENDER_UI_TOOL_SYSTEM.md) - General tools and interface
