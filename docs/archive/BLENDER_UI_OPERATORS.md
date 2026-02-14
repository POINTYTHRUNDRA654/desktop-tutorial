# Blender Operators

## Overview

Operators are actions in Blender that execute immediately when activated, distinguishing them from tools which require interactive input. Operators form the backbone of Blender's action system, providing quick access to common modeling, animation, rendering, and utility tasks. They can be invoked from operator buttons, popup menus, menu searches, and custom scripts.

**Key Difference from Tools:**
- **Tools**: Require interactive input (dragging, clicking, manipulating gizmos)
- **Operators**: Execute immediately with default settings, optionally allowing adjustment after execution

**Common Operator Examples:**
- Add Object (Add → Mesh → Cube)
- Delete Object
- Apply Smooth Shading
- Subdivide Mesh
- Solidify Modifier
- Mirror Modifier
- Join Objects
- Mirror Geometry
- Invert Selection
- Bevel Edges

## Operator Activation

Operators can be activated from multiple interface locations:

### Operator Buttons

**Direct Execution:**
- Click operator buttons in menus or panels
- Action executes immediately with default settings
- Example: Add → Mesh → UV Sphere places a sphere at default location with default parameters

**Button Appearance:**
- Standard rectangular buttons in menus and panels
- Icon-based buttons in toolbars for common operators
- Text labels clearly identify operator function

### Popup Menus

**Context Menus:**
- Right-click on objects, geometry, or UI elements
- Context menu displays relevant operators for selection
- LMB click on operator to execute it

**Example Popup Operations:**
- Object Mode RMB → Delete
- Edit Mode Vertex RMB → Extrude
- Material RMB → Copy Material
- Modifier RMB → Copy Modifier

### Menu Search

**Shortcut:** `F3`

- Provides unified search for all operators across menus
- Type operator name to filter results quickly
- Navigate and activate via keyboard or mouse

**See Menu Search section below for detailed usage**

## Operator Properties

Most operators have adjustable properties that control their behavior and output. Properties can be set before execution via dialog boxes, or adjusted after execution via the Adjust Last Operation region.

### Pre-Execution Properties (Dialog Box)

**When Dialog Appears:**
- Some operators open a dialog box before execution
- Properties appear as input fields, dropdowns, checkboxes
- Adjust values before confirming the operation

**Common Pre-Execution Dialogs:**
- Bevel Properties (Weight, Segments, Profile, Material Index)
- Solidify Properties (Thickness, Offset, Mode)
- Array Properties (Count, Offset, Relative Offset)
- Mirror Properties (Axis, Merge Distance, Clipping)

**Confirming Operation:**
- Click "OK" button to execute with current settings
- Or press Return to confirm
- Or click X / press Esc to cancel without executing

### Adjust Last Operation (Redo Panel)

**Location:** Sidebar `N` → Last Operation panel (appears after operator execution)

**Contents:**
- All adjustable properties for the last-executed operator
- Live preview updates in viewport as you adjust values
- Properties organized by category

**Accessing Adjust Last Operation:**
- Execute any operator
- Press `F9` to bring up Last Operation panel if closed
- Or look in the Sidebar `N` panel (usually bottom left)
- Panel remains open until another operator is executed

**Property Adjustment:**
- Click on property values to edit them
- Drag sliders for numerical values
- Use dropdown menus for preset options
- Changes apply in real-time to scene

**Practical Workflow:**
1. Execute Bevel operator on selected edge
2. Adjust Weight, Segments, and Profile in Last Operation panel
3. Preview updates in 3D Viewport live
4. Fine-tune values until satisfied
5. Click outside panel or execute new operator to confirm

### Property Panel Access

**Method 1: Sidebar (N) Panel**
- Press `N` to toggle sidebar visibility
- Last Operation panel shows immediately after operator execution
- Remains visible for property adjustment

**Method 2: Properties Editor**
- Open Properties editor (usually right side)
- Active Tool tab shows properties if tool is active
- Operator-specific properties appear here after execution

**Method 3: Operator Search**
- Search for operator via F3 or Menu Search
- Some operators allow property preset selection before execution

## Modal Operators

Modal operators are interactive operators that require user input to complete. They exist conceptually between simple operators and tools, combining operator convenience with interactive control.

### Modal Operator Behavior

**Activation:**
- Modal operator is activated like a standard operator
- Operation enters "modal mode" waiting for user input
- Viewport enters interactive state (gizmos, handles, or overlay appear)

**User Interaction:**
- Move mouse to adjust operation parameters in real-time
- Press specified keys to change modes or toggle options
- Visual feedback shows current state

**Examples of Modal Operators:**
- Transform (Move/Rotate/Scale) - G/R/S keys
- Extrude - E key in Edit Mode
- Loop Cut - Ctrl-R
- Knife Project - K
- Bevel - Ctrl-B (edge mode)

### Modal Operator Controls

**Canceling Modal Operation**

Press one of these to cancel without applying changes:
- **Esc** = Escape key cancels operation
- **RMB** = Right Mouse Button cancels operation

**Effect:** Operation is discarded, scene reverts to pre-operation state

**Confirming Modal Operation**

Press one of these to confirm and apply the operation:
- **Return** = Enter key confirms operation
- **LMB** = Left Mouse Button confirms operation

**Effect:** Operation is completed, changes are applied to scene

### Modal Operator Example Workflow

**Example: Bevel Edges (Modal)**

1. Enter Edit Mode: Tab
2. Select edge or edges: Alt-Click edge
3. Activate Bevel: Ctrl-B
4. Modal mode activates:
   - Mouse movement controls bevel amount (weight)
   - Scroll wheel changes number of segments
   - Ctrl constrains to 0.1 increments
   - Type number to set precise value
5. Confirm with Return or LMB to apply
6. Or Esc/RMB to cancel without applying

## Slider Operators

Slider operators provide interactive percentage adjustment directly in the editor header. They allow quick, visual adjustment of a value ranging from 0% to 100%.

### Slider Operation

**Interface:**
- Small slider control appears in the header of relevant editor
- Visual bar shows current percentage
- Text field displays exact numerical value

**Adjusting Slider Value**

**Basic Dragging:**
- Click on slider and drag left or right
- Dragging left decreases percentage toward 0%
- Dragging right increases percentage toward 100%
- Visual feedback updates in real-time

**Precision Modes:**

**Coarser Control (10% Increments)**
- Hold **Ctrl** while dragging slider
- Snaps to 10% intervals (0%, 10%, 20%, 30%, etc.)
- Useful for quick approximate adjustments

**Precise Control (1% or Smaller)**
- Hold **Shift** while dragging slider
- Fine-grained adjustment with small increments
- Useful for subtle parameter tuning

**Overshoot Toggle**

**Toggle with E Key:**
- Press **E** while slider is active
- Allows values beyond 0-100% range
- Useful for exaggerated effects or mathematical operations
- Displays different visual indicator when enabled

**Direct Value Input:**
- Click on percentage text field
- Type exact value (supports decimals)
- Press Return to confirm
- Allows values outside 0-100% range if overshoot enabled

### Slider Operator Examples

**Blend Modes/Opacity:**
- Many blend operations use sliders for amount or opacity
- Drag 0-100% to control effect strength
- Ctrl for 10% steps, Shift for precision

**Crease Strength:**
- Sharpness of crease operator
- 0% = no crease, 100% = maximum crease
- Use Shift for precise creasing

**Timeline Scrubbing:**
- Some timeline operations use percentage sliders
- Jump to specific frame as percentage of timeline
- Shift for frame-by-frame precision

## Menu Search

**Shortcut:** `F3`

**Location:** Edit ‣ Menu Search (Topbar menu)

Menu Search provides a unified interface to search for and execute any operator available in Blender's menus. It displays both the operator name and the menu path where the operator is located.

### Opening Menu Search

**Primary Method:** Press `F3`
- Pop-up appears at cursor position
- Ready for text input immediately
- Search field is active by default

**Alternative Method:** Edit ‣ Menu Search
- Click from Topbar menu
- Same pop-up interface appears

**Keyboard Navigation:**
- Type to filter operators
- Down/Up arrows navigate results
- Return activates selected operator
- Esc closes popup without executing

### Using Menu Search

**Search Process:**

1. **Press F3** to open Menu Search popup
2. **Type operator name** (or partial name)
   - Example: "bevel" finds all bevel-related operators
   - Search is case-insensitive
   - Partial matches work (e.g., "sub" finds "Subdivide")
3. **View filtered results**
   - Operators listed with menu path shown
   - Most relevant matches appear at top
   - Example: "Add Cube" shows "Add > Mesh > Cube"
4. **Select operator**
   - Click operator with LMB to execute
   - Or navigate with Down/Up and press Return
5. **Execute**
   - Operator runs with default settings
   - If operator has properties, Adjust Last Operation panel opens

### Menu Search Tips

**Effective Searching:**

**Search by Operator Name:**
- "Extrude" finds all extrude variants
- "Mirror" finds all mirror operations
- "Smooth" finds all smoothing operators

**Search by Menu Location:**
- Some menu items can be searched by submenu name
- "Object" finds operators in Object menu
- "Mesh" finds operators in Mesh menu

**Partial Name Matching:**
- "Sub" matches Subdivide, Subset, Subscribe
- First few characters usually sufficient
- Blender prioritizes exact matches

**Common Quick Searches:**
- "Join" for Join Objects, Join Geometry
- "Delete" for Delete operator
- "Apply" for Apply modifiers, transforms
- "UV" for UV unwrapping and UV operations
- "Shade" for smooth/flat shading operators

### Menu Path Display

The popup shows operators alongside their menu locations:

**Example Results:**
```
Add Cube                 Add > Mesh > Cube
Join Objects             Object > Join Objects
Apply Smooth Shading     Object > Shade Smooth
Subdivide Mesh           Edge > Subdivide
Unwrap UV Map            UV > Unwrap
```

**Using Menu Path Information:**
- Learn menu organization while searching
- Find alternative access methods
- Build muscle memory for menu locations
- Discover operators you didn't know existed

### Spacebar Action Configuration

By default, `Spacebar` toggles animation playback. You can configure Spacebar to open Menu Search instead:

**To Change Spacebar Action:**
1. Open Preferences (Edit ‣ Preferences or Ctrl-Comma)
2. Go to Keymap tab
3. Search for "Spacebar Action"
4. Change from "Play" to "Menu Search"

**Using Spacebar for Menu Search:**
- Press Spacebar to open search popup
- Type operator name
- Execute operator immediately
- Integrates search into workflow without reaching F3

## Operator Search (Developer Feature)

**Prerequisite:** Developer Extras must be enabled

**Location:** Edit ‣ Operator Search (Topbar menu)

**Note:** This feature is only available when Developer Extras are activated in Preferences.

### Enabling Developer Extras

**Steps:**
1. Open Preferences (Edit ‣ Preferences or Ctrl-Comma)
2. Go to Interface tab
3. Enable "Developer Extras" checkbox
4. "Operator Search" menu item appears in Edit menu

### Operator Search Functionality

**Comprehensive Operator List:**
- Searches all operators within Blender
- Includes operators not exposed in standard menus
- Access to advanced/experimental operators
- Useful for Python scripting and testing

**Advanced Operators:**
Some operators are only accessible via Operator Search:
- Undocumented/experimental operators
- Python API testing operators
- Internal operators for advanced workflows
- Operator variants with different modes

### Python Developer Workflows

**Use Cases:**
- Test operator parameters before scripting
- Discover available Python operators
- Verify operator names and arguments
- Debug custom operator implementations

**Operator Property Testing:**
- Search operator in Operator Search
- Pre-fill properties if needed
- Verify operator behavior
- Test corner cases and edge conditions

### Operator Search vs Menu Search

**Menu Search (F3):**
- Standard user-facing operators
- Visible in Blender menus
- All documented operators
- Recommended for general use

**Operator Search (Edit menu, Developer Extras):**
- All available operators including advanced ones
- Used by Python developers
- Testing and development oriented
- Access to undocumented/experimental features

## Operator Execution Flow

### Standard Operator Flow

1. **Activation**
   - Operator button clicked
   - Menu item selected
   - Keyboard shortcut pressed
   - Menu Search result selected

2. **Pre-Execution Dialog (if applicable)**
   - Dialog box opens for operators requiring pre-set values
   - User adjusts properties
   - User confirms with OK / Return

3. **Execution**
   - Operator runs with specified properties
   - Scene updates with changes
   - Viewport re-renders

4. **Post-Execution (Adjust Last Operation)**
   - Last Operation panel appears (if operator allows adjustment)
   - User can fine-tune properties
   - Changes apply in real-time
   - Can execute another operator to lock in changes

### Modal Operator Flow

1. **Activation**
   - Modal operator initiated
   - Enters interactive mode
   - Waits for user input

2. **User Interaction**
   - Mouse movement / key input adjusts parameters
   - Real-time feedback in viewport
   - Status Bar shows current values

3. **Confirmation or Cancellation**
   - Return/LMB confirms and applies changes
   - Esc/RMB cancels without applying

## Common Operator Workflows

### Quick Modeling Workflow

1. Add object: Shift-A → Mesh → Cube
2. Scale: S, type value, Return
3. Bevel: Ctrl-B, adjust, Return
4. Subdivide: Right-click → Subdivide
5. Smooth shading: Object → Shade Smooth

### UV Unwrapping Workflow

1. Select geometry
2. Mark seams (Ctrl-E → Mark Seam)
3. Select all (A)
4. Unwrap (U → Unwrap)
5. Adjust in UV Editor

### Modifier Application Workflow

1. Add modifier (Modeling Properties → Add Modifier)
2. Adjust properties in Last Operation
3. Apply modifier (click Apply button)
4. Confirm in Last Operation panel

## Related Documentation

- [Blender UI Tool System](BLENDER_UI_TOOL_SYSTEM.md) - Difference between tools and operators
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Accessing operators from menus
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Operator button activation
- [Blender Keymap](BLENDER_KEYMAP.md) - Operator keyboard shortcuts
- [Blender Status Bar](BLENDER_STATUS_BAR.md) - Real-time operator feedback
- [Blender Preferences](BLENDER_PREFERENCES.md) - Spacebar Action configuration
- [Blender Regions](BLENDER_REGIONS.md) - Sidebar and Last Operation panel
