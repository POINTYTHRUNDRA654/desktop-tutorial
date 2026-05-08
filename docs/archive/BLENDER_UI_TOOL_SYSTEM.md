# Blender Tool System

## Overview

Tools are the primary way to interact with your work in Blender. The Tool System provides a unified interface for accessing and managing all available tools across different modes and workspaces. Only one active tool can exist per Workspace and mode, and the selection is automatically remembered when switching between modes.

Most tools are controlled using the Left Mouse Button (LMB), though some have additional modifier keys displayed in the Status Bar. All controls can be customized in the Keymap Preferences for personalized workflows.

## Toolbar

The Toolbar contains buttons for all available tools and is typically located on the left side of the viewport or editor. It provides the primary interface for tool access.

### Accessing the Toolbar

**Shortcut:** `T`

- Toggling the Toolbar: Press `T` to show/hide the Toolbar
- Visibility: The Toolbar is visible by default in most workspaces
- Location: Positioned on the left edge of the 3D Viewport or relevant editor

### Tool Groups

Tool buttons with a small triangle in the bottom right corner are **tool groups** containing multiple related tools.

**Expanding Tool Groups:**
- **Hold LMB**: Press and hold on the tool button to see the group contents
- **Drag LMB**: Drag the mouse while holding LMB to instantly expand the group and select a tool
- **Quick Selection**: Move your mouse to the desired tool and release LMB to select it

**Examples of Tool Groups:**
- Selection tools (Box Select, Circle Select, Lasso Select)
- Transform tools (Move, Rotate, Scale, Transform)
- Mesh modeling tools (Extrude, Bevel, Loop Cut)
- Sculpting brushes (Draw, Draw Sharp, Grab, Crease)

### Toolbar Display Modes

The Toolbar adapts its display based on available space:

**Single Column (Narrow)**
- Icons only
- Most compact display
- Default for narrow toolbars
- Hover to see tool names and tips

**Double Column (Medium Width)**
- Two columns of icons
- Achieved by resizing the Toolbar horizontally
- Icons remain clear and selectable
- Slightly wider than single column

**Icon + Text (Wide)**
- Icons with text labels next to each tool
- Full expansion reveals tool names
- Achieved by expanding the Toolbar further horizontally
- Best for learning tool names quickly

### Toolbar Tooltips

Hovering over toolbar buttons provides contextual information:

**Short Hover (1-2 seconds)**
- Shows the tool's name only
- Useful for quick identification
- Appears in a small popup

**Long Hover (2-3 seconds)**
- Shows full tooltip with name and description
- May include keyboard shortcut information
- Provides additional usage tips
- Stays visible while hovering

## Pop-Up Toolbar

**Shortcut:** `Shift-Spacebar`

The Pop-Up Toolbar brings a small toolbar directly to your cursor for quick tool access without reaching the screen edges.

### Accessing Pop-Up Toolbar

Press `Shift-Spacebar` to open the pop-up toolbar at your current mouse cursor position. The toolbar floats near the cursor and remains visible while you make a selection.

### Display Layout

**Layout:**
- Organized as a vertical or horizontal strip depending on space
- Tool icons arranged in a grid
- Keyboard shortcuts displayed on the right side of each tool

**Shortcuts Displayed:**
- Each tool shows its keyboard shortcut (e.g., "B" for Box Select)
- Shortcuts are visible for quick learning
- Pressing the key while the pop-up is open selects that tool

### Alternative Spacebar Configuration

By default, `Spacebar` is mapped to play/pause animation. You can remap it in Keymap Preferences:

**To Map Pop-Up Toolbar to Spacebar:**
1. Open Preferences (Edit → Preferences or Ctrl-Comma)
2. Go to Keymap tab
3. Search for "Spacebar Action"
4. Enable "Pop-up Toolbar" option

**Using Spacebar as a Modifier Key:**
- Once enabled, `Spacebar` acts as a modifier key (similar to Ctrl or Shift)
- Examples of modifier key combinations:
  - `Spacebar T` = Transform tool
  - `Spacebar D` = Annotate tool
  - `Spacebar M` = Measure tool
  - `Spacebar B` = Box Select tool

**Advantages:**
- Faster access without moving hand to reach Pop-Up Toolbar location
- Keeps workflow at cursor position
- Spacebar modifier enables quick tool switching without mouse movement
- Compatible with other hotkey workflows

## Quick Favorites Menu

**Shortcut:** `Q`

The Quick Favorites menu is a customizable popup containing your favorite tools and menu items, accessible anywhere in Blender.

### Accessing Quick Favorites

Press `Q` to open the Quick Favorites menu at your cursor. The menu appears as a pie or list popup depending on preferences.

### Adding to Quick Favorites

**Via Context Menu:**
1. Locate any tool button or menu item
2. Right-click on it to open the context menu
3. Select "Add to Quick Favorites"
4. The item immediately appears in the Quick Favorites menu

**Any Selectable Item:**
- Tools from Toolbar
- Operators from Menus
- Properties and commands
- Custom menu items

### Managing Quick Favorites

**Remove from Quick Favorites:**
1. Open Quick Favorites (`Q`)
2. Right-click on the item you want to remove
3. Select "Remove from Quick Favorites"

**Organization:**
- Items appear in the order they were added
- Can be reordered by removing and re-adding in desired order
- No limit to the number of items (though UI space affects display)

### Workflow Benefits

- **Instant Access**: Press `Q` for your most-used tools
- **Reduced Menu Diving**: Avoid navigating through submenus
- **Personalization**: Create a custom toolbar reflecting your workflow
- **Speed**: Faster than searching through full Toolbar

**Common Quick Favorites Setups:**
- **Modeler**: Loop Cut, Bevel, Extrude, Inset, Knife Project
- **Animator**: Keyframe Insert, Set Keyframe, Delete Keyframe, Dope Sheet
- **Sculptor**: Draw, Draw Sharp, Grab, Crease, Smooth
- **Rigger**: Snap to Bone, Assign Weight, Weight Paint, Pose Mode

## Changing Tools

### Alt Click Tool Prompt

**Prerequisite:** Enable "Alt Click Tool Prompt" in Keymap Preferences

**Process:**
1. Tap `Alt` (without pressing any other key)
2. The Status Bar displays a tool prompt with available tool shortcuts
3. Press the corresponding key to select that tool (e.g., press `B` for Box Select)
4. Tap `Alt` again to cancel the prompt without changing tools

**Advantages:**
- Discover tool shortcuts without memorizing them
- Quick tool switching with visual reference
- Status Bar displays only relevant tools for current context

### Direct Keyboard Shortcuts

Most tools have dedicated keyboard shortcuts:

**Selection Tools:**
- `B` = Box Select
- `C` = Circle Select
- `L` = Lasso Select

**Transform Tools:**
- `G` = Grab/Move
- `R` = Rotate
- `S` = Scale

**Modeling Tools:**
- `E` = Extrude
- `K` = Knife Project
- `Ctrl-R` = Loop Cut

**Annotation Tools:**
- `D` = Annotate (Draw)
- `M` = Measure

**Note:** Shortcuts are mode-dependent (Edit Mode, Object Mode, Sculpt Mode, etc.)

### Tool Groups and Cycling

If a tool is part of a group (indicated by the small triangle), you have two options:

**Access the Group:**
- Hold down the shortcut key to see the group menu
- Or access via toolbar directly
- Or access via Pop-Up Toolbar

**Cycling Through Tools:**
Some tool groups support cycling when enabled in the Keymap editor:
- Successive presses of the shortcut cycle through tools in the group
- Example: Default Selection Tools use `W` to cycle through Box, Circle, and Lasso Select
- Configured per tool group in Keymap Preferences

## Fallback Tool

The fallback tool is the default tool selected when entering a mode or workspace. It appears at the top of the Toolbar and serves as the "home" tool for your workflow.

### Changing the Fallback Tool

**Method 1: Toolbar Hold**
1. Hold LMB on a toolbar button
2. A pie menu appears showing available fallback options
3. Select the desired tool from the pie menu

**Method 2: Keyboard Shortcut**
- Press `Alt-W` to open the fallback tool pie menu
- Navigate with arrow keys or mouse
- Select your preferred tool

### Fallback Tool Behavior

**When Fallback is Active:**
- Default tool is selected when switching modes
- Tool selection is preserved within a mode
- Switching modes and back restores the tool you were using

**Example Workflow:**
1. You're in Edit Mode with Extrude tool selected
2. Switch to Object Mode (fallback is Move tool)
3. Switch back to Edit Mode
4. Extrude tool is still selected (tool memory preserved)
5. Return to Object Mode
6. Move tool reappears (mode-specific fallback)

### Customizing Fallback Tools per Mode

Different modes can have different fallback tools:

**Object Mode**: Move tool (default)
**Edit Mode**: Select Box tool (default)
**Sculpt Mode**: Draw brush (default)
**Paint Mode**: Draw brush (default)
**Pose Mode**: Grab (default)

Change the fallback for any mode by pressing `Alt-W` and selecting your preferred tool.

## Tool Properties and Settings

Each tool has customizable settings available from multiple locations:

### Tool Settings in Sidebar

**Location:** Sidebar `N` panel → Tool tab

**Contents:**
- Active Tool panel displays current tool's options
- Settings appear in organized sections
- Changes apply immediately to the active tool

**Access:**
- Press `N` to toggle sidebar visibility
- Click the tool icon in the sidebar tabs
- All active tool settings appear here

### Tool Properties Editor

**Location:** Properties editor panel

**Contents:**
- Active Tool tab shows all available tool options
- Grouped by category (Stroke, Mesh, Simulation, etc.)
- Context-sensitive (shows only relevant options)

**Access:**
- Open Properties panel (usually right side)
- Click the tool icon to switch to Active Tool tab
- Scroll through available options

### Tool Settings Region

**Location:** Below the area header (3D Viewport header)

**Contents:**
- Quick-access tool options
- Most frequently used settings
- Compact display in header area

**Visibility:**
- Always visible while using a tool
- Collapses when switching tools
- Can be pinned for persistent display

## Tool Memory and Mode Switching

Blender remembers your tool selection within each mode, allowing for seamless workflow:

**Example Workflow:**
1. Edit Mode: Select Extrude tool
2. Switch to Object Mode
3. Use Move tool
4. Switch back to Edit Mode
5. Extrude tool is still selected

**Per-Mode Memory:**
- Each mode maintains its own tool selection
- Switching modes restores the previously selected tool
- Tool memory persists until explicitly changed
- Closing Blender saves tool selections for next session

## Tool Control and Modifiers

### Primary Control Method

**Left Mouse Button (LMB):**
- Standard tool control for all operations
- Press and drag to activate most tools
- Click location determines tool starting point
- Release to confirm operation

### Modifier Keys

Most tools support modifier keys to alter behavior:

**Common Modifier Keys:**
- `Ctrl` = Precision mode (snap to grid, constrain movement)
- `Shift` = Add to selection (or mode-dependent modifier)
- `Alt` = Subtract from selection (or alternative mode)
- `Shift-Ctrl` = Intersect selection (context-dependent)

**Checking Available Modifiers:**
- Status Bar displays all active modifiers for current tool
- Hover over modifiers in Status Bar for explanation
- Consult individual tool documentation for specific behaviors

**Customization:**
- All modifier keys can be reassigned in Keymap Preferences
- Create personal workflows matching your preferences
- Context-sensitive modifiers vary by tool and mode

## Tool Gizmos

Some tools define gizmos (visual manipulators) to help control them directly on screen.

### Tools Using Gizmos

**Shear Tool:**
- Visual shear handles appear on selected object
- Click and drag the handle to apply shearing
- Axis gizmo shows orientation

**Spin Tool:**
- Rotation center point visible on screen
- Radial handles indicate spin radius and angle
- Drag handle to set rotation parameters

**Transform Tool:**
- Move, Rotate, Scale handles available simultaneously
- Color-coded axes (Red=X, Green=Y, Blue=Z)
- Grab and drag any handle for transform

### Gizmo Interaction

**Activating Gizmos:**
- Tool is selected from Toolbar or via shortcut
- Gizmo automatically appears when tool is active
- Hover over gizmo elements to highlight them

**Using Gizmos:**
- Click and drag on gizmo handles
- Visual feedback shows current operation
- Release to confirm change
- Gizmos respond to modifier keys (Ctrl for precision)

**Gizmo Customization:**
- Gizmo visibility can be toggled in viewport header
- Gizmo color and size adjustable in Preferences
- Some tools allow gizmo options in tool settings

## Related Documentation

- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Settings entry
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Toolbar button interaction
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Context menus and selection
- [Blender UI Data Block Menu](BLENDER_UI_DATA_BLOCK_MENU.md) - Tool data management
- [Blender Keymap Preferences](BLENDER_KEYMAP_PREFERENCES.md) - Customize tool shortcuts
- [Blender Status Bar](BLENDER_STATUS_BAR.md) - Modifier key feedback
