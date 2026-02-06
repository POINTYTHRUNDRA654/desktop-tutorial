# Blender Industry Compatible Keymap

This page shows common keys used in the Industry Compatible keymap, designed for users migrating from other 3D applications like Maya, 3ds Max, Cinema 4D, or Lightwave.

## Overview

The Industry Compatible keymap matches shortcuts commonly used in professional 3D software, reducing the learning curve for experienced 3D artists transitioning to Blender. The main differences from the Blender default keymap include:

- **Right Mouse Button (RMB)** for viewport navigation instead of Middle Mouse Button (MMB)
- **Alt modifiers** for navigation shortcuts
- **Familiar transform shortcuts** (W, E, R for Move, Rotate, Scale)
- **Tab for Menu Search** instead of F3

## General Shortcuts

### Selection and Modes

**1 - 3**
- Switch Selection mode
- **1** - Vertex selection mode
- **2** - Edge selection mode
- **3** - Face selection mode

**4**
- Object Mode
- Quick shortcut to switch directly to Object Mode

**5**
- Modes Pie Menu
- Shows a radial pie menu for quick mode switching

### UI and Menus

**RMB**
- Context menu
- Right-click on objects or properties to open contextual options

**Tab**
- Menu Search
- Search for operators and menu items by name
- Opens the search interface (Note: Different from default Blender's F3)

**Shift-Tab**
- Quick access (favorites)
- Opens a pie menu with your favorite tools and commands

**Return**
- Rename
- Rename the active object or data-block
- Equivalent to F2 in default Blender keymap

**Ctrl-Return**
- Render
- Start rendering the current frame
- Equivalent to F12 in default Blender keymap

### Interface Panels

**Ctrl-[**
- Toggle Toolbar
- Show or hide the left toolbar with tool icons
- Alternative to T in default Blender keymap

**Ctrl-]**
- Toggle Sidebar
- Show or hide the right sidebar with properties and options
- Alternative to N in default Blender keymap

## Common Editing Keys

**Backspace**
- Delete the selected item with a confirmation dialog
- Safer deletion that requires confirmation

**Delete**
- Delete the selected item without a confirmation dialog
- Faster deletion when you're certain

**Ctrl-D**
- Duplicate
- Create a copy of the selected object or element

**P**
- Set Parent
- Assign a parent object to the selected objects (parenting)

**B**
- Proportional Editing (a.k.a. Soft Selection)
- Toggle proportional editing mode for soft transformation
- Affects nearby geometry when transforming

## Viewport Navigation

The Industry Compatible keymap uses Alt + mouse buttons for viewport navigation, matching Maya and similar software.

**Alt-LMB** (Alt + Left Mouse Button)
- Orbit View
- Click and drag to rotate the view around the center

**Alt-MMB** (Alt + Middle Mouse Button)
- Pan View
- Click and drag to move the view left/right/up/down

**Alt-RMB** (Alt + Right Mouse Button)
- Zoom View
- Click and drag to zoom in/out of the view

### Viewpoint Shortcuts

**F1 - F4**
- Front/Side/Top/Camera Viewpoints
- Quick switching to standard orthographic views
- **F1** - Front view
- **F2** - Side view
- **F3** - Top view
- **F4** - Camera view

**F**
- Frame Selected
- Zoom and center the view on the selected object(s)

**Shift-F**
- Center View to Mouse
- Pan the view to center on the current mouse cursor position

**A**
- Frame All
- Zoom and center the view to show all objects in the scene

## Selection

**LMB**
- Select
- Click to select objects or components under the cursor

**Ctrl-A**
- Select All
- Select all objects or components in the current editor

**Shift-Ctrl-A**
- Deselect All
- Deselect everything (select none)

**Ctrl-I**
- Select Inverse
- Invert the selection (select what was unselected and vice versa)

**Up**
- Select More
- Expand the selection to include neighboring components

**Down**
- Select Less
- Shrink the selection by removing boundary components

**Double LMB**
- Select Loop
- Double-click on an edge to select the entire edge loop

**Double Alt-LMB**
- Select Ring
- Double Alt+click on an edge to select the perpendicular edge ring

**Ctrl-L**
- Select Linked
- Select all objects or components connected to the selection

## Tools

### Transform Tools

**W**
- Move
- Activate the Move tool for translation

**E**
- Rotate
- Activate the Rotate tool for rotation transformations

**R**
- Scale
- Activate the Scale tool for scaling transformations

**Note**: These tools can be combined with Ctrl and Shift during the operation for snapping and precision (similar to default Blender).

### Selection and Drawing Tools

**Q**
- Selection Tools
- Opens a menu or pie to access different selection tools (box, circle, lasso, etc.)

**D**
- Annotate Tool
- Activate the annotation tool for drawing on the screen

**C**
- Cursor Tool
- Activate the 3D cursor tool to reposition the cursor

## Edit Mode Tools

**Ctrl-E**
- Extrude
- Extrude selected geometry (edges or faces) to create new geometry

**Ctrl-B**
- Bevel
- Bevel the selected edges to create beveled edges

**I**
- Inset
- Inset the selected faces to create panel-like geometry

**K**
- Knife
- Activate the knife tool to cut edges and create new topology

**Alt-C**
- Loop Cut
- Create loop cuts on geometry for adding edge loops
- Equivalent to Ctrl-R in default Blender keymap

## Animation

**Spacebar**
- Play/Pause
- Start or pause animation playback

**S**
- Set Location + Rotation + Scale Keyframe
- Insert keyframes for all transform properties simultaneously

**Shift-S**
- Insert Keyframe Menu
- Opens a menu to selectively choose which properties to keyframe

### Individual Keyframe Shortcuts

**Shift-W**
- Set Location Key
- Insert keyframe for Location (position) only

**Shift-E**
- Set Rotation Key
- Insert keyframe for Rotation only

**Shift-R**
- Set Scale Key
- Insert keyframe for Scale only

## Platform Specific Keys

### macOS

On macOS, the Cmd key can be used instead of Ctrl for most shortcuts.

**General Rule**: The Cmd key can be used instead of Ctrl on macOS for almost all shortcuts, with a few exceptions that conflict with the operating system.

**macOS-Specific Equivalents**

- **Cmd-D** - Duplicate (instead of Ctrl-D)
- **Cmd-A** - Select All (instead of Ctrl-A)
- **Cmd-Return** - Render (instead of Ctrl-Return)
- **Cmd-[** - Toggle Toolbar (instead of Ctrl-[)
- **Cmd-]** - Toggle Sidebar (instead of Ctrl-])
- **Cmd-E** - Extrude (instead of Ctrl-E)
- **Cmd-B** - Bevel (instead of Ctrl-B)
- **Cmd-L** - Select Linked (instead of Ctrl-L)

**Exceptions**: Some Cmd key combinations are reserved by macOS and cannot be reassigned in Blender (like Cmd-Tab for application switching).

## Comparison with Default Blender Keymap

### Key Differences

| Task | Default Blender | Industry Compatible |
|------|---|---|
| **Orbit View** | MMB | Alt-LMB |
| **Pan View** | Shift-MMB | Alt-MMB |
| **Zoom View** | Ctrl-MMB | Alt-RMB |
| **Menu Search** | F3 | Tab |
| **Quick Access** | Q | Shift-Tab |
| **Move Tool** | G | W |
| **Rotate Tool** | R | E |
| **Scale Tool** | S | R |
| **Rename** | F2 | Return |
| **Render** | F12 | Ctrl-Return |
| **Toolbar** | T | Ctrl-[ |
| **Sidebar** | N | Ctrl-] |

### When to Use Industry Compatible Keymap

- You're migrating from Maya, 3ds Max, Cinema 4D, or Lightwave
- Your team uses multiple 3D applications
- You prefer RMB-based viewport navigation
- You want familiar transform shortcuts (W, E, R)
- Transitioning from other software to Blender

## Tips for Using Industry Compatible Keymap

1. **Leverage your prior experience** - Many shortcuts will feel familiar from other 3D software
2. **Use Alt + mouse for viewport** - Alt+LMB/MMB/RMB replaces the default MMB/Shift-MMB/Ctrl-MMB
3. **Remember W, E, R for transforms** - Move (W), Rotate (E), Scale (R) is consistent with industry standard
4. **Tab opens search** - Unlike default Blender where Tab toggles Edit Mode, Industry Compatible uses Tab for Menu Search
5. **RMB for context menus** - Right-click is your friend for accessing contextual options
6. **Customize as needed** - Even with Industry Compatible, you can customize shortcuts in Preferences → Keymap

## Switching Keymaps

To switch between keymaps:

1. Open **Edit → Preferences** (or Blender → Preferences on macOS)
2. Click the **Input** tab
3. Select **Industry Compatible** from the Keymap dropdown at the top
4. Your shortcuts will immediately update to the new keymap

## Related Documentation

- [Keymap](/BLENDER_KEYMAP.md) - Keymap conventions, customization, and built-in keymaps
- [Default Keymap](/BLENDER_KEYMAP_DEFAULT.md) - Quick reference for default Blender shortcuts
- [Preferences](/BLENDER_PREFERENCES.md) - How to configure keymaps and preferences
- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Interface overview
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
