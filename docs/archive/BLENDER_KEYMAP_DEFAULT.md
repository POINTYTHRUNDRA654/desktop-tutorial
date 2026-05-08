# Blender Default Keymap

This page shows common keys used in Blender's default keymap, organized by category. This is a quick reference guide for frequently-used shortcuts.

## Selection Modes

Blender has two main selection modes:

- **Left-click select** (default) - Most common and matches other applications
- **Right-click select** - Alternative mode with specific advantages

See the **Select with Mouse Button** preference in Edit → Preferences → Input to switch between modes.

**Learn More**: See benefits of right-click select in the Preferences documentation.

## Properties: Hovering Over Fields

The following shortcuts work when hovering the mouse cursor over an editable field (numbers, colors, vectors).

### Copy and Paste

**Ctrl-C**
- Copy the single value of the field

**Ctrl-V**
- Paste the single value of the field

**Ctrl-Alt-C**
- Copy the entire vector or color value of the field

**Ctrl-Alt-V**
- Paste the entire vector or color value of the field

### Field Editing

**RMB**
- Open the context menu for additional field options

**Backspace**
- Reset the value to its default

**Minus**
- Invert the value's sign (multiply by -1.0)

**Ctrl-Wheel**
- Change the value in incremental steps
- For fields with a pop-up list of values, this cycles the value

**Return**
- Activates menus and toggles checkboxes
- Confirms the field value

**Alt** (while editing)
- Hold while editing values to apply the change to all selected items (objects, bones, sequence strips)
- Works with number fields and toggles

## Properties: Dragging Values

The following shortcuts work while moving/rotating/scaling an object in the 3D Viewport, dragging a value slider, and similar operations.

**Important**: These shortcuts should be pressed **after** starting the drag, not before.

**Ctrl**
- Snap to coarse increments, making it easier to precisely rotate an object by exactly 90°, scale by 2x, etc.

**Shift**
- Make the value change more slowly in response to mouse movement
- Gives you more precision for fine adjustments

**Shift-Ctrl**
- Snap to fine increments
- Combines the precision of Shift with the snapping of Ctrl

## General / Global Shortcuts

These shortcuts are available globally throughout Blender.

**File Operations**

**Ctrl-O**
- Open file

**Ctrl-S**
- Save file

**Ctrl-N**
- New file

**Ctrl-Q**
- Quit Blender

### Editing

**Ctrl-Z**
- Undo the last action

**Shift-Ctrl-Z**
- Redo the last undone action

### Help and Search

**F1**
- Help (context sensitive)
- Opens the manual page for the tool under your cursor

**F3**
- Menu Search
- Search for operators and menu items by name

**F2**
- Rename active item
- Quickly rename objects, materials, or other named data-blocks

**F4**
- File context menu
- Opens a context menu with file-related options

**F5 - F8**
- Reserved for user actions
- Available for custom shortcuts

**F9**
- Adjust Last Operation
- Opens the last operation panel to tweak parameters

**F10**
- Reserved for user actions
- Available for custom shortcuts

### Rendering

**F11**
- Show render window
- Display full-screen render output

**F12**
- Render the current frame
- Start rendering and display the result

### Navigation and Interface

**Q**
- Quick access (favorites)
- Opens a pie menu with your favorite tools and commands

**Ctrl-Spacebar**
- Toggle Maximize Area
- Expand the current editor to fill the window (keeping Topbar and Status Bar visible)

**Ctrl-PageUp / Ctrl-PageDown**
- Previous/Next Workspace
- Cycle through available workspaces

**Spacebar**
- User configurable
- Default actions: Play animation, Toggle Search, Toggle Tools
- See Spacebar Action preference

**Shift-Ctrl-Spacebar**
- Playback animation (reverse)
- Play animation backwards from the current frame

## Common Editing Keys

These keys are used for general editing operations across most editors.

**X**
- Delete the selected item with a confirmation dialog
- Useful to prevent accidental deletion

**Delete**
- Delete the selected item without a confirmation dialog
- Faster deletion when you're sure

## Common Editor Keys

These keys are shared across editors such as the 3D Viewport, UV Editor, and Graph Editor.

**A**
- Select all visible items in the current editor

**Alt-A** or **Double-tap A**
- Select none (deselect all)
- Deselect everything in the current editor

**Ctrl-I**
- Invert selection
- Select everything that was unselected and vice versa

**H**
- Hide selected items
- Temporarily hide the selected geometry or objects

**Shift-H**
- Hide unselected items
- Hide everything except what's selected

**Alt-H**
- Reveal hidden items
- Show all hidden geometry or objects

**T**
- Toggle Toolbar
- Show or hide the left toolbar with tool icons

**N**
- Toggle Sidebar
- Show or hide the right sidebar with properties and options

## 3D Viewport Keys

Keys specific to the 3D Viewport editor.

### Navigation

**MMB** (Middle Mouse Button)
- Orbit View
- Click and drag to rotate the view around the center

**Shift-MMB**
- Pan View
- Click and drag to move the view left/right/up/down

**Ctrl-MMB**
- Zoom View
- Click and drag to zoom in/out of the view
- Alternatively: Scroll Wheel, or Numpad Plus/Minus

**AccentGrave** (` key, usually top-left of keyboard)
- Show 3D Viewport navigation pie menu
- Quick access to view operations

**Ctrl-AccentGrave**
- Toggle gizmos
- Show or hide the 3D transform gizmos (move, rotate, scale handles)

**Shift-AccentGrave**
- Start Fly/Walk Navigation
- First-person camera movement through the scene

**See also**: 3D Viewport Navigation documentation for detailed camera controls

### Modes and Selection

**Tab**
- Toggle Edit Mode
- Switch between Object Mode and Edit Mode

**Ctrl-Tab**
- Toggle Pose Mode (for armatures)
- Shows a mode switching pie menu for other object types

**1 - 3** (in Edit Mode)
- Switch between editing modes:
  - **1** - Vertex selection mode
  - **2** - Edge selection mode
  - **3** - Face selection mode
- **Hold Shift** - Toggle one of these without disabling the others (multi-select mode)
- **Hold Ctrl** - Change how the selection is transformed when switching modes

**See also**: Mesh Selection Modes documentation for detailed information

## Animation Keys

Keys for keyframe insertion, drivers, and animation control.

**I**
- Insert a keyframe
- Adds a keyframe for the current property at the current frame

**Alt-I**
- Clear the keyframe
- Removes the keyframe for the current property at the current frame

**Shift-Alt-I**
- Clear all keyframes
- Removes all keyframes for the current property across all frames

**Ctrl-D**
- Assign a driver
- Create a driver expression to control this property with another property

**Ctrl-Alt-D**
- Clear the driver
- Removes the driver from the current property

**K**
- Add the property to the current keying set
- Includes this property when inserting keyframes with the keying set

**Alt-K**
- Remove the property from the current keying set
- Excludes this property from keying set insertions

## Python Scripting Keys

Keys for working with Python scripts and data paths.

**Ctrl-C** (hovering over operator button)
- Copy the Python command for this operator
- Copies the Python code to the clipboard
- Useful for recording operations in the Python Console or Text Editor

**Shift-Ctrl-C** (hovering over a field)
- Copy relative data path
- Copies the relative Python path to the current property
- Useful when writing drivers or scripts
- Also available from the right-click context menu

**Shift-Ctrl-Alt-C** (hovering over a field)
- Copy full data path
- Copies the complete Python path to the current property
- Includes the full object hierarchy

## Platform Specific Keys

### macOS

On macOS, several shortcuts use the Cmd key instead of Ctrl.

**General Rule**: The Cmd key can be used instead of Ctrl on macOS for almost all shortcuts, with a few exceptions that conflict with the operating system.

**macOS-Specific Shortcut**

**Cmd-Comma**
- Preferences
- Opens the Preferences window
- Equivalent to Ctrl-Comma on Windows/Linux

**Examples of Cmd-based shortcuts**
- **Cmd-O** - Open file (instead of Ctrl-O)
- **Cmd-S** - Save file (instead of Ctrl-S)
- **Cmd-Z** - Undo (instead of Ctrl-Z)
- **Cmd-Shift-Z** - Redo (instead of Ctrl-Shift-Z)
- **Cmd-N** - New file (instead of Ctrl-N)
- **Cmd-Q** - Quit (instead of Ctrl-Q)

**Exceptions**: Some Cmd key combinations are reserved by macOS and cannot be reassigned in Blender (like Cmd-Tab for application switching).

## Quick Reference Tips

1. **Hover over buttons to see shortcuts** - Most buttons show their shortcuts in tooltips
2. **Use the Status Bar** - The left side of the Status Bar displays shortcuts for the current tool
3. **Remember context matters** - Shortcuts may work differently in different editors or modes
4. **Customize often-used shortcuts** - If you find yourself using a shortcut frequently, memorize it
5. **Create custom shortcuts** - Use Preferences → Keymap to bind your own frequently-used operations
6. **Export keymaps** - Share your custom keymap with teammates for consistency

## Related Documentation

- [Keymap](/BLENDER_KEYMAP.md) - Keymap conventions, customization, and built-in keymaps
- [Preferences](/BLENDER_PREFERENCES.md) - Keymap configuration and preferences
- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Interface overview
- [3D Viewport Navigation](/docs/3d-viewport-navigation.md) - Detailed camera controls (when available)
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
