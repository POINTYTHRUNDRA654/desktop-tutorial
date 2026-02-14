# Blender Selecting

## Overview

Selection is the fundamental operation in Blender, used across all editors and modes to identify which objects or elements you want to work with. Blender provides multiple selection tools optimized for different scenarios, from simple single-item selection to complex multi-element picking using geometric shapes.

**Default Selection Button:**
- **LMB (Left Mouse Button)** selects items by default
- Can be changed to **RMB (Right Mouse Button)** in Preferences
- Customize based on personal workflow preference

**Key Principle:**
- Click an item to select it
- All other items are deselected
- Hold **Shift** to add/remove items from selection
- Hold **Ctrl** to remove items from selection

## Basic Selection

### Single Item Selection

**Selecting One Item:**
1. Click on item with LMB (default)
2. Item becomes selected (highlighted in orange)
3. All other items become deselected

**Adding to Selection:**
1. Hold **Shift** and click another item
2. Item is added to existing selection
3. First item remains selected
4. Can continue Shift-clicking to add more items

**Removing from Selection:**
1. Hold **Ctrl** and click selected item
2. Item is removed from selection
3. Other selected items remain selected
4. Can continue Ctrl-clicking to deselect items

### Selection Button Preference

**Changing to RMB Selection:**
1. Open Preferences (Edit ‣ Preferences or Ctrl-Comma)
2. Go to Input tab
3. Find "Select with" option
4. Change from "Left" to "Right"
5. RMB now selects, LMB allows navigation

**When to Use RMB:**
- Some users prefer industry-standard RMB selection
- Frees up LMB for navigation/panning
- Personal preference and workflow optimization

## Toolbar Selection Tools

All Toolbar selection tools use the same basic interaction pattern for clicking and Shift/Ctrl modifiers. The difference lies in what happens when you drag.

### Common Toolbar Behavior

**Single Click (No Drag):**
- Selects clicked item
- Deselects all other items
- No drag = standard single selection

**Shift-Click:**
- Adds item to selection (if not selected)
- Removes item from selection (if already selected)
- Toggle behavior

**Ctrl-Click:**
- Removes item from selection
- Does nothing if item not selected
- Opposite of Shift-click

**Selection Cycling:**
- When multiple items overlap, click cycles through them
- Each click selects next item at location
- Useful for densely packed geometry

### Tweak

**Location:** Toolbar ‣ Tweak

**Shortcut:** `W` (cycles through selection tools)

**Purpose:** Move selected items by dragging

**Behavior:**
- Click-drag moves selected item(s)
- No selection shape is drawn
- Direct object manipulation

**Workflow:**
1. Select item with standard click
2. Activate Tweak tool
3. Click-drag to move item to new location
4. Release LMB to confirm position

**When to Use:**
- Quick repositioning without dedicated Move tool
- Rapid adjustments without entering full move mode
- Organic, immediate feedback movement

### Select Box

**Location:** Toolbar ‣ Select Box

**Shortcut:** `W` (cycles through selection tools)

**Purpose:** Select all items inside a rectangular area

**Drawing Rectangle:**
1. Click starting corner and drag
2. Rectangle preview shows as you drag
3. Release LMB to confirm selection
4. All items partially or completely inside rectangle are selected
5. All items outside rectangle are deselected

**Modifier Keys:**
- **Shift-drag**: Add items to selection (items outside box not deselected)
- **Ctrl-drag**: Remove items from selection
- **Spacebar-drag**: Move rectangle while dragging (reposition without finishing)

**Tool Settings:**
- Mode: Set, Extend, Subtract, Invert, Intersect
- Affect how selection interacts with existing selection

**Workflow Example:**
1. Activate Select Box tool
2. Click-drag to create rectangle around group of vertices
3. All vertices inside or touching rectangle become selected
4. Shift-drag to add more vertices
5. Ctrl-drag to deselect specific vertices

**Advantages:**
- Familiar from other software
- Fast for rectangular selections
- Intuitive visual feedback
- Precise rectangular area control

### Select Circle

**Location:** Toolbar ‣ Select Circle

**Shortcut:** `W` (cycles through selection tools)

**Purpose:** Select all items inside a circular area

**Using Select Circle:**
1. Activate tool
2. Move mouse to desired location (does not drag initially)
3. Drag anywhere to activate circle with configurable radius
4. As you drag, circle selects items it passes over
5. Items selected by circle remain selected
6. Items not touched by circle are deselected

**Modifier Keys:**
- **Shift-drag**: Add items to selection
- **Ctrl-drag**: Remove items from selection
- Both deselect unselected items

**Radius Adjustment:**
- Adjust in Tool Settings (header, Sidebar N, or Properties)
- Tool stays active until manually deselected
- Radius can be changed mid-selection

**Object Mode Special Behavior:**
- Only selects objects if circle passes over **origin point** (orange dot)
- Does NOT select based on object geometry
- Origin points invisible for unselected objects unless "Origins (All)" viewport overlay enabled
- Edit/Pose modes behave normally (select all touched geometry)

**Workflow Example:**
1. Activate Select Circle
2. Drag circle over vertices to select them
3. Adjust radius in Tool Settings
4. Shift-drag to add more areas to selection
5. Press Esc to deactivate tool when finished

**Advantages:**
- Fast smooth selections
- Good for complex curved shapes
- Adjustable radius for precision
- Fluid, organic selection feeling

### Select Lasso

**Location:** Toolbar ‣ Select Lasso

**Shortcut:** `W` (cycles through selection tools)

**Purpose:** Select items inside a freeform drawn shape

**Drawing Lasso:**
1. Activate tool
2. Click-drag to draw freeform outline around items
3. Draw closed or open path
4. Release LMB to complete selection
5. All items inside enclosed shape are selected
6. All items outside are deselected

**Modifier Keys:**
- **Shift-drag**: Add items to selection
- **Ctrl-drag**: Remove items from selection
- Both deselect unselected items

**Spacebar While Dragging:**
- Hold Spacebar to move lasso shape
- Useful if drawn path is in wrong location
- Reposition without canceling

**Object Mode Behavior:**
- Like Select Circle, only selects if lasso passes over origin point
- Edit/Pose modes select touched geometry normally

**Workflow Example:**
1. Activate Select Lasso tool
2. Draw freeform shape around objects to select
3. Carefully outline target area
4. Release to apply selection
5. Shift-drag to add more areas
6. Ctrl-drag to deselect areas

**Advantages:**
- Most precise for irregular shapes
- Follows natural hand movement
- Can select specific scattered items
- Good for organic selections

## Selection Modes

Each Toolbar selection tool supports multiple selection modes controlling how new selections interact with existing selections.

### Mode Options

**Set (Default)**
- Deselects all other items
- Only newly selected items remain selected
- Useful for starting fresh selections
- Default behavior

**Extend**
- Adds newly selected items to existing selection
- Previous selection is preserved
- Grows selection with each operation
- Useful for building complex selections

**Subtract**
- Removes newly selected items from selection
- Other items remain as-is
- Removes items from existing selection
- Useful for refining selections

**Invert (Shortcut: Ctrl-I)**
- Unselected items become selected
- Selected items become unselected
- Toggle all selection states
- Can be used with other modes

**Intersect**
- Only selects items that overlap with existing selection
- Non-overlapping items are deselected
- Creates intersection of old and new selection
- Useful for complex selection logic

### Accessing Selection Modes

**Tool Settings Access:**
1. Select selection tool from Toolbar
2. Open Tool Settings (header, Sidebar N, or Properties)
3. Find "Mode" dropdown
4. Choose Set, Extend, Subtract, Invert, or Intersect

**Keyboard Shortcuts:**
- Some modes have direct shortcuts
- Ctrl-I for Invert
- Other modes typically accessed via menu or tool settings

### Selection Mode Workflows

**Workflow 1: Building Complex Selection**
1. Select Box with Set mode to select group A
2. Switch to Extend mode
3. Select Circle with Extend to add group B
4. Shift-drag with Circle to add more items
5. Ctrl-drag with Circle to remove unwanted items
6. Result: Custom selection combining multiple methods

**Workflow 2: Refining Selection**
1. Select all with A key
2. Use Select Box with Subtract mode
3. Drag box around items to deselect
4. Removes unwanted items from selection
5. Result: Precise selection without clicking each item

**Workflow 3: Complex Intersections**
1. Select Box to select group A (Set mode)
2. Select Circle with Intersect mode
3. Only items in both selections remain selected
4. Result: Precise intersection of two selection areas

## Menu Selection Tools

Menu selection tools are variants of Toolbar tools with different default behaviors. They add to selection by default rather than replacing it.

### Box Select

**Location:** Select ‣ Box Select (menu)

**Shortcut:** `B`

**Purpose:** Select items in rectangular area with additive default

**Default Behavior (Opposite of Toolbar):**
- Items inside box are **added** to selection
- Items outside box are **NOT deselected**
- Different from Select Box (Toolbar variant)

**Removing from Selection:**
- Hold **Shift** while dragging to remove from selection
- Or drag with **MMB (Middle Mouse Button)** to remove

**Spacebar While Dragging:**
- Move box around with Spacebar
- Reposition rectangle without canceling

**Workflow:**
1. Press B to activate Box Select
2. Click-drag to create selection box
3. Items in box are added to selection
4. Continue dragging new boxes to add more items
5. Shift-drag to remove items
6. Press B or Esc to deactivate

**Advantages:**
- Additive by default (faster for building selections)
- Familiar from many applications
- Quick multi-area selections
- MMB quick-remove shortcut

### Circle Select

**Location:** Select ‣ Circle Select (menu)

**Shortcut:** `C`

**Purpose:** Select items in circular area with additive default

**Default Behavior:**
- Items inside circle are **added** to selection
- Items outside circle are **NOT deselected**
- Different from Select Circle (Toolbar variant)

**Removing from Selection:**
- Hold **Shift** while dragging to remove
- Or drag with **MMB** to remove

**Radius Adjustment:**
- Scroll **Wheel** to change circle radius
- Or press **NumpadPlus** to increase radius
- Or press **NumpadMinus** to decrease radius
- Radius adjusts while tool remains active

**Tool Persistence:**
- Circle Select stays active after first selection
- Release mouse button and drag again without pressing C
- Blocks other Blender operations while active
- Deactivate with **RMB**, **Return**, or **Esc**

**Workflow:**
1. Press C to activate Circle Select
2. Drag to create circle and select items
3. Release and drag again for another selection
4. Scroll wheel to adjust radius mid-selection
5. Shift-drag to remove items
6. Press Esc to deactivate when finished

**Advantages:**
- Stays active for multiple selections
- Quick radius adjustment with wheel
- Additive by default
- Fast for painting-style selections

### Lasso Select

**Location:** Select ‣ Lasso Select (menu)

**Shortcut:** `Ctrl-RMB` (or activate from Select menu)

**Purpose:** Select items in freeform shape with flexible modes

**Two Activation Methods:**

**Method 1: Menu Activation**
1. Click Select ‣ Lasso Select
2. Menu dialog appears asking for selection mode
3. Choose Set, Extend, or Subtract
4. Drag LMB to draw lasso
5. Release to apply with chosen mode

**Method 2: Direct Keyboard**
1. Press **Ctrl-RMB** to immediately start drawing
2. Default behavior: Add items to selection
3. Draw lasso shape and release
4. Items inside lasso are added

**Removing from Selection:**
- Press **Shift-Ctrl-RMB** and drag lasso
- Removes items inside lasso from selection

**Spacebar While Dragging:**
- Move lasso around with Spacebar
- Reposition freeform path

**Workflow:**
1. Press Ctrl-RMB to start Lasso Select
2. Draw freeform shape around items
3. Release to add items to selection
4. Shift-Ctrl-RMB to remove items
5. Continue for complex selections

**Advantages:**
- Most control over selection shape
- Works with existing selection by default
- Mode selection before drawing
- Natural, organic selection feeling

## Selection Across Different Editors

### Editor-Specific Variations

**Most Editors:**
- **Shift-LMB** adds single item to selection
- **Ctrl-RMB** performs Lasso Select
- Selection tools work as documented

**Outliner (exceptions):**
- **Ctrl-LMB** adds single item to selection (not Shift-LMB)
- Different modifier behavior for consistency with tree navigation

**Node Editors (Shader, Compositor) (exceptions):**
- **Ctrl-Alt-LMB** performs Lasso Select (not Ctrl-RMB)
- Different shortcut due to node editor controls

**Important Note:**
- Always check specific editor documentation
- Modifiers may vary between editors
- Learning the differences improves efficiency

## Selection Workflows and Best Practices

### Workflow 1: Quick Multiple Item Selection

1. Click first item with LMB (Select Box tool)
2. Shift-click additional items to add to selection
3. Ctrl-click to deselect unwanted items
4. Efficient for scattered items
5. Works with any selection tool

### Workflow 2: Area-Based Group Selection

1. Use Select Circle or Select Lasso
2. Draw around group of items
3. Shift-drag for additional areas
4. Ctrl-drag to remove from selection
5. Best for spatially organized items

### Workflow 3: Complex Selection Refinement

1. Select rough area with Select Box (Set mode)
2. Switch to Extend mode
3. Add specific items with Shift-click
4. Switch to Subtract mode
5. Remove unwanted items with Ctrl-click
6. Result: Precise custom selection

### Workflow 4: Inverted Selection

1. Select items to exclude (Set mode)
2. Press Ctrl-I to invert selection
3. All other items now selected
4. Useful when it's faster to select items to exclude
5. Quick way to select "everything except..."

### Best Practices

**Efficiency:**
- Use Shift-click for single items
- Use box/circle for groups
- Use lasso for irregular shapes
- Combine methods for complex selections

**Precision:**
- Zoom in for detailed selections
- Use wireframe view mode for clarity
- Orient view to see all target items
- Use outliner for precision object selection

**Organization:**
- Select by type when possible (Alt-click for all of type)
- Use layers/collections to organize selectable items
- Hide unrelated items to simplify selection
- Use eye icon in outliner to hide items

## Related Documentation

- [Blender UI Tool System](BLENDER_UI_TOOL_SYSTEM.md) - Selection tools as tools
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Select menu access
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Selection button behavior
- [Blender Preferences](BLENDER_PREFERENCES.md) - Selection button configuration
- [Blender 3D Viewport](BLENDER_3D_VIEWPORT.md) - Selection in viewport context
- [Blender Outliner](BLENDER_OUTLINER.md) - Selection in outliner
- [Blender Keymap](BLENDER_KEYMAP.md) - Selection shortcut customization
