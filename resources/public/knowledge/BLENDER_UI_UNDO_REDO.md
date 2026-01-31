# Blender Undo & Redo

## Overview

Blender's undo and redo system provides comprehensive action history management, allowing you to roll back accidental changes, redo discarded actions, adjust operator parameters after execution, and repeat actions efficiently. The system maintains a complete timeline of recent actions, giving you fine-grained control over your workflow without losing work to mistakes.

**Key Features:**
- **Undo** - Roll back the last action
- **Redo** - Restore an undone action
- **Adjust Last Operation** - Modify operator parameters after execution
- **Undo History** - Browse and jump to any previous action
- **Repeat Last** - Duplicate the last action
- **Repeat History** - Choose from recent repeated actions

## Undo

**Shortcut:** `Ctrl-Z`

**Location:** Edit ‣ Undo (Topbar menu)

**Available in:** All modes and editors

Undo reverses the most recent action, taking your scene back to the state before that action was performed.

### Basic Undo Operation

**Press Ctrl-Z** to undo the last action:
- Last action is reversed
- Scene reverts to pre-action state
- Can be pressed repeatedly to undo multiple actions in sequence
- Each press undoes one additional action going backward in time

### Undo Examples

**Example 1: Delete Object**
1. Delete a cube (Del or X)
2. Press Ctrl-Z
3. Cube reappears in scene

**Example 2: Multiple Undos**
1. Move object (G, move, Return) - Current state: Moved
2. Press Ctrl-Z - Reverts to: Before move
3. Press Ctrl-Z again - Reverts to: Before previous action
4. Press Ctrl-Z again - Reverts to: Before that action
5. Continue pressing to undo entire action sequence

### Undo Behavior

**Action by Action:**
- Each undo step represents one operator execution
- Complex operations may count as single undo step
- Modifier properties count as separate step from modifier creation

**Continuous Actions:**
- Some tools (like painting or sculpting) may batch operations
- Multiple strokes might count as one undo if committed together
- Release LMB or confirm operation to create undo checkpoint

**Undo Limits:**
- Undo memory is configurable in Preferences
- Default keeps ~32 undo steps
- Can be increased for larger memory capacity
- Older undo steps are discarded when limit is reached

## Redo

**Shortcut:** `Shift-Ctrl-Z`

**Location:** Edit ‣ Redo (Topbar menu)

**Available in:** All modes and editors

Redo restores an action that was undone, moving forward in the undo timeline.

### Basic Redo Operation

**Press Shift-Ctrl-Z** to redo the last undone action:
- Most recently undone action is restored
- Scene advances to post-action state
- Can be pressed repeatedly to redo multiple undone actions
- Each press redoes one additional action going forward in time

### Redo Examples

**Example 1: Undo and Redo**
1. Move cube (G, move, Return) - Current state: Moved
2. Press Ctrl-Z - Reverts: Undo move
3. Press Shift-Ctrl-Z - Restores: Move is reapplied

**Example 2: Undo Multiple, Redo Multiple**
1. Add cube, move, scale - Current state: Scaled
2. Ctrl-Z → Undo scale
3. Ctrl-Z → Undo move
4. Shift-Ctrl-Z → Redo move
5. Shift-Ctrl-Z → Redo scale

### Important Redo Behavior

**Redo Truncation:**
- Once you perform a NEW action after undoing, the redo history is lost
- Example:
  1. Add cube, move cube, delete cube (current: deleted)
  2. Undo (current: before delete, cube visible)
  3. Add sphere (NEW ACTION)
  4. Redo is no longer available (move and delete are lost)

**Can Only Redo Recent Undos:**
- Redo only works on actions you explicitly undid
- Cannot redo actions from the middle of history
- Use Undo History to jump to specific actions instead

## Adjust Last Operation

**Shortcut:** `F9`

**Location:** Edit ‣ Adjust Last Operation (Topbar menu)

**Available in:** Most editors that support operator modification

Adjust Last Operation allows you to modify the parameters of the last-executed operator without undoing it. This provides a non-destructive way to fine-tune results immediately after execution.

### Accessing Adjust Last Operation

**Method 1: Automatic Panel (Default)**
- Many operators automatically show a panel in the bottom-left corner
- Panel appears immediately after operator execution
- Labeled "Adjust Last Operation" or operator name
- Shows all adjustable parameters

**Method 2: F9 Popup**
- Press `F9` to open Adjust Last Operation as a floating popup
- Appears at cursor position
- Shows same parameters as automatic panel
- Useful if automatic panel is not visible or hidden

**Method 3: Sidebar Panel**
- Open Sidebar with `N`
- Last Operation panel appears in sidebar (usually bottom-left)
- Remains accessible until another operator is executed
- Good for extensive parameter adjustment

### Adjust Last Operation Interface

**Panel Contents:**
- Operator name in title bar
- All adjustable parameters as input fields
- Sliders for numerical values
- Dropdowns for preset options
- Checkboxes for toggles
- Reset button to restore default values

**Parameter Organization:**
- Parameters grouped by category
- Most important parameters at top
- Less common options lower down
- Scroll if more parameters exist than visible space

### Live Preview

**Real-Time Updates:**
- Changes apply immediately to viewport
- No need to confirm changes
- Preview updates as you type or drag
- Visual feedback shows current state

**Example: Bevel Adjustment**
1. Select edge and press Ctrl-B (Bevel)
2. Bevel created with default parameters
3. Adjust Last Operation panel shows:
   - Weight slider
   - Segments spinner
   - Profile slider
   - Material Index dropdown
4. Drag Weight slider
5. Viewport updates in real-time
6. Type exact value in Segments field
7. Preview updates instantly

### Adjust Last Operation Examples

**Example 1: Rotation in Object Mode**

1. Select object
2. Press R (Rotate)
3. Move mouse
4. Press Return to confirm
5. Adjust Last Operation shows Angle field with rotation value
6. Type "45" to set exactly 45 degrees
7. Press Return to apply

**Example 2: Scale in Edit Mode**

1. Enter Edit Mode (Tab)
2. Select face (Alt-Click face)
3. Press S (Scale)
4. Move mouse and confirm
5. Adjust Last Operation shows Scale value
6. Type "2" to scale to 200%
7. Type "0.5" to scale to 50%
8. See live preview update

**Example 3: Creating Polygons**

1. Add Circle (Shift-A → Mesh → Circle)
2. Adjust Last Operation shows Vertices field (default: 32)
3. Change Vertices to "3"
4. Result: Equilateral triangle (useful tip)
5. Change Vertices to "5"
6. Result: Perfect pentagon
7. Change Vertices to "6"
8. Result: Regular hexagon

### Toggling Adjust Last Operation Panel

**Show/Hide Panel:**
- View ‣ Adjust Last Operation toggles panel visibility
- Useful if panel is taking up space
- Panel can be manually hidden by clicking collapse button
- Reopens with next operator execution

### Parameter Reset

**Reset to Defaults:**
- Click "Reset" button in panel
- All parameters return to operator defaults
- Useful if you've adjusted values but want to start over
- Alternative: Undo (Ctrl-Z) and re-execute operator

## Undo History

**Shortcut:** No direct shortcut (access via menu)

**Location:** Edit ‣ Undo History (Topbar menu)

**Available in:** All modes

Undo History displays a menu of recent actions, allowing you to jump to any point in the action history without stepping through undo/redo sequentially.

### Opening Undo History

Press **Edit ‣ Undo History** to open the history menu:
- Menu appears showing list of recent actions
- Most recent actions appear at top
- Oldest actions appear at bottom
- Small dot indicator shows current position

### Reading Undo History

**Menu Layout:**
```
• Extrude Vertices (current position - marked with dot)
  Scale
  Rotate
  Move
  Delete Vertices
  Select All
```

**Current Position Indicator:**
- Small dot (•) marks the current undo state
- Shows where you are in the history timeline
- Moving forward adds actions after current position
- Moving backward removes actions from after current position

### Selecting from Undo History

**Jump to Specific Action:**
1. Click on any action in the Undo History menu
2. Scene immediately jumps to that state
3. All actions after selected action are undone
4. All actions before selected action remain applied

**Example Workflow:**
1. You're at action 5: "Scale" (with dot indicator)
2. Click "Move" (action 3) in Undo History
3. Scene reverts to state after "Move"
4. "Scale", "Rotate", and "Extrude" are undone
5. New dot indicator appears at "Move"

### Undo History Truncation

**Important:** Redo History is Lost When Making New Changes

Once you undo to a previous state and make a NEW action:
- All redo history after that point is lost
- Menu is truncated at the new action point
- Example:
  1. You're at "Scale" in history
  2. Undo back to "Move"
  3. Now you delete an object (new action)
  4. "Rotate" and "Scale" are no longer available for redo
  5. New action "Delete" appears in history

### Navigating Undo History

**Keyboard Navigation:**
- Up/Down arrows move through history
- Return selects highlighted action
- Esc closes menu without changing

**Mouse Navigation:**
- Click directly on action to select
- Scroll to view more history
- Click-drag to select multiple (not typical)

### History Size Limit

**Default History Depth:**
- Blender keeps approximately 32 undo steps by default
- Older actions are removed when limit is reached
- Limit is configurable in Preferences

**Increasing History Depth:**
1. Open Preferences (Edit ‣ Preferences or Ctrl-Comma)
2. Go to System tab
3. Find "Undo Steps" slider
4. Increase value for more history depth
5. More history uses more memory

## Repeat Last

**Shortcut:** `Shift-R`

**Location:** Edit ‣ Repeat Last (Topbar menu)

**Available in:** All modes

Repeat Last duplicates the most recently executed action with the same parameters, useful for applying the same operation multiple times.

### Basic Repeat Last Operation

**Press Shift-R** to repeat the last action:
- Immediately executes the last operator
- Uses the same parameters as last time
- No dialog or confirmation needed
- Result applied directly to scene

### Repeat Last Examples

**Example 1: Duplicating Multiple Objects**

1. Select cube
2. Press Shift-D (Duplicate)
3. Move mouse to new location
4. Press Return to confirm
5. Cube is duplicated and moved
6. Press Shift-R
7. Duplicate is repeated: another cube added at same offset
8. Press Shift-R again
9. Another duplicate created
10. Continue pressing Shift-R to create array of cubes

**Example 2: Multiple Transform Operations**

1. Select object
2. Press G (Grab/Move)
3. Move along X-axis by 2 units
4. Return to confirm
5. Press Shift-R
6. Object moves again by same amount (same direction, same distance)
7. Press Shift-R
8. Object moves again
9. Result: Objects spaced evenly along X-axis

**Example 3: Repeated Modeling Operations**

1. Select edge
2. Press Ctrl-B (Bevel)
3. Adjust weight to 0.2
4. Return to confirm
5. Bevel applied to first edge
6. Select different edge
7. Press Shift-R
8. Same bevel (0.2 weight) applied to new edge
9. Select another edge
10. Press Shift-R
11. Repeat continues on new selection

### Repeat Last with Operator Parameters

**Parameters Remembered:**
- All parameters from last operator execution
- Numerical values
- Mode selections
- Checkboxes and toggles
- Axis constraints
- All modifiers applied

**Does NOT Change:**
- Selection (repeats on current selection)
- Position (relative offset, not absolute position)
- Target object (applies to currently active object)

### Useful Workflows with Repeat Last

**Workflow 1: Array Creation**
1. Add object
2. Duplicate and move (Shift-D, move, Return)
3. Repeat with Shift-R multiple times
4. Creates evenly-spaced array

**Workflow 2: Uniform Beveling**
1. Bevel first edge with specific weight (Ctrl-B, adjust, Return)
2. Select next edge
3. Press Shift-R to apply same bevel
4. Repeat for all edges needing same bevel weight

**Workflow 3: Batch Operator Application**
1. Apply one modifier with specific settings
2. Select next object
3. Press Shift-R to apply same modifier
4. Useful for batch processing similar objects

## Repeat History

**Shortcut:** No direct shortcut (access via menu)

**Location:** Edit ‣ Repeat History (Topbar menu)

**Available in:** All modes

Repeat History displays a menu of recent repeated actions, allowing you to choose which previously-repeated action to apply again.

### Opening Repeat History

Press **Edit ‣ Repeat History** to open the history menu:
- Menu appears showing list of recently-repeated actions
- Most recent repeats appear at top
- Oldest repeats appear at bottom
- Similar layout to Undo History

### Reading Repeat History

**Menu Layout:**
```
• Duplicate & Move (most recent repeat)
  Bevel
  Scale
  Duplicate
  Duplicate & Move (earlier occurrence)
```

**How It Works:**
- Tracks actions you've executed using Shift-R
- Lists the operators that were repeated
- Does NOT include single one-time actions
- Only shows actions executed via Repeat Last or Repeat History

### Selecting from Repeat History

**Apply Specific Repeat:**
1. Click on action in Repeat History menu
2. Operator executes with its previous parameters
3. Applied to current selection/active object
4. Result appears in scene immediately

**Example Workflow:**
1. Earlier: Beveled edges with weight 0.2, then pressed Shift-R multiple times
2. Earlier: Duplicated and moved object, pressed Shift-R twice
3. Earlier: Scaled object 1.5x, pressed Shift-R once
4. Now: Open Repeat History
5. Menu shows these three recent repeats
6. Click "Bevel" to apply previous bevel operation again
7. Or click "Duplicate & Move" to apply duplicate operation again

### Difference Between Repeat Last and Repeat History

**Repeat Last (Shift-R):**
- Repeats only the most recent action
- Fastest access
- No menu, instant execution

**Repeat History:**
- Accesses menu of previous repeats
- Can select from earlier repeated actions
- Useful if you've done other operations since repeat
- Slower but more flexible

### Repeat History Practical Use

**Use When:**
- You want to apply earlier repeated operation
- Several operations have happened since last repeat
- You need to choose from multiple previous repeats
- Creating complex patterns with different operations

**Example:**
1. Bevel 5 edges (Ctrl-B, adjust, Shift-R repeatedly)
2. Add modifier (different operation)
3. Scale object (different operation)
4. Now want to bevel more edges
5. Open Repeat History
6. "Bevel" appears in menu from earlier repeats
7. Click to apply same bevel again

## Memory and Limits

### Undo History Persistence

**Important Limitation:**
- Complete undo history is lost when closing Blender
- History is NOT saved in blend files
- Restarting Blender clears all previous undo steps

**Implications:**
- Save file before closing to preserve work
- Undo history serves in-session workflow only
- Cannot recover undone actions after closing Blender

### Undo Memory Usage

**Configurable Settings:**
1. Open Preferences (Edit ‣ Preferences or Ctrl-Comma)
2. Go to System tab
3. Find Memory section

**Key Settings:**
- **Undo Steps**: Number of undo levels to keep (default: ~32)
  - Increase for more history
  - Decrease to save memory
  - Higher values use more RAM
  - Limit affects both undo and redo

- **Undo Memory Limit**: Maximum MB for undo data
  - Each undo step consumes memory
  - Limit prevents excessive memory use
  - Older steps deleted when limit reached
  - Adjust based on available system RAM

### Optimizing Undo Settings

**For Large Files:**
- Decrease undo steps to save memory
- Set lower memory limit
- Trade-off: Less undo history available

**For Intensive Work:**
- Increase undo steps if you have RAM
- Increase memory limit for complex scenes
- Trade-off: Higher memory consumption

**Batch Operations:**
- Some operations batch together
- Painting/sculpting may create single undo per stroke
- Mesh modeling creates separate undo per operator

## Related Documentation

- [Blender UI Tool System](BLENDER_UI_TOOL_SYSTEM.md) - Tool vs operator distinction
- [Blender UI Operators](BLENDER_UI_OPERATORS.md) - Operator execution and adjustment
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Accessing undo/redo from menus
- [Blender Preferences](BLENDER_PREFERENCES.md) - Memory and undo limit configuration
- [Blender Regions](BLENDER_REGIONS.md) - Last Operation panel location
- [Blender Keymap](BLENDER_KEYMAP.md) - Undo/redo shortcut customization
