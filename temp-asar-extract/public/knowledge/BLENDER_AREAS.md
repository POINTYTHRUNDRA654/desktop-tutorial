# Blender Areas

The Blender window is divided into a number of rectangles called Areas. Areas reserve screen space for Editors, such as the 3D Viewport or the Outliner. Each editor offers a specific piece of functionality.

## Overview

Areas are grouped into Workspaces, which are geared towards particular tasks (modeling, animating, and so on). Understanding how to manage areas is essential for customizing your workspace layout and maximizing productivity.

### Important Note: Context Matters

While some keyboard shortcuts in Blender are global (such as Ctrl-S for saving), many depend on which editor the mouse cursor is hovering over.

**Example**: Say you just selected two objects in the Outliner and want to join them. If you pressed the shortcut for this (Ctrl-J) while the cursor is still in the Outliner, nothing would happen as the shortcut isn't valid there. You first need to move your cursor to the 3D Viewport before the shortcut will work.

**Tip**: Always ensure your mouse cursor is in the correct editor (area) before using context-dependent shortcuts.

### Area Boundaries

Area boundaries are indicated by rounded corners where areas meet. These corners are the points you'll use for manipulating areas (resizing, splitting, joining, etc.).

## Resizing Areas

You can resize areas by dragging their borders with the left mouse button.

### How to Resize

1. Move your mouse cursor over the border between two areas
2. The cursor will change to a **double-headed arrow** when positioned correctly
3. Click and drag to resize the areas
4. Hold **Ctrl** while dragging to snap the size of areas to convenient sizes (useful for precise layouts)

**Example**: To make the 3D Viewport larger and the Outliner smaller, position your cursor on the border between them, and drag toward the Outliner.

## Docking

Docking describes several ways a user can interactively manipulate the size and location of areas, including splitting an area into new areas and joining areas together.

### Starting a Docking Operation

To start the interactive docking process:

1. Place the mouse cursor in an **area corner** (where two borders meet)
2. The cursor will change to a **cross (+)**
3. Press and hold **LMB** (left mouse button) to begin the operation

If you press **Esc** or **RMB** before releasing the mouse, the operation will be canceled.

### Joining Areas

Joining combines two areas into one, removing the border between them.

**How to Join**

1. Position your cursor at an area corner (cursor becomes a cross)
2. Drag the corner into the space of a second area
3. The areas that will be joined are displayed brighter to show the preview
4. Release the mouse button to complete the join

**Result**: The two areas merge into a single, larger area. The second area's editor is typically replaced or hidden.

### Splitting Areas

Splitting an area creates a new area by dividing an existing one.

**How to Split Vertically**

1. Position your cursor at an area corner
2. Drag **left or right** to split the area vertically
3. The split line shows where the division will occur
4. Release to create the two new areas side-by-side

**How to Split Horizontally**

1. Position your cursor at an area corner
2. Drag **up or down** to split the area horizontally
3. The split line shows where the division will occur
4. Release to create the two new areas stacked vertically

**Advanced**: You can split and join areas at once by dragging a split operation into a separate area. This combines both operations in a single gesture.

### Replacing an Area

Dragging an area into the **middle** of a second area will replace the second area with the first area. This is useful for swapping editor types without resizing.

## Area Options

Right-click on the border between areas to open the **Area Options** context menu.

### Vertical/Horizontal Split

Shows an indicator line that lets you select the area and position where to split. Press **Tab** to switch between vertical and horizontal split modes.

### Join Up/Down/Left/Right

Shows the join direction overlay, helping you visualize which areas will be joined.

### Swap Areas

Swaps this area with the adjacent one, exchanging their positions and contents.

**Use Case**: Quickly switch the positions of two editors without manually resizing.

## Swapping Contents

You can swap the contents (editors) of two areas without changing their position:

1. Press **Ctrl-LMB** on one of the corners of the initial area
2. Drag towards the target area
3. Release the mouse there

**Important**: The two areas do not need to be side-by-side, but they must be inside the same window.

## Maximize Area

**Reference**
- **Menu**: View → Area → Toggle Maximize Area
- **Shortcut**: Ctrl-Spacebar

Maximize Area expands the editor area so it fills the whole window while keeping the Topbar and Status Bar visible. This is useful for focusing on a single editor (e.g., 3D Viewport, Shader Editor) without changing your workspace layout.

### What Hides During Maximize

In the 3D Viewport, maximizing the area temporarily hides:

- Navigation Gizmos
- Text Info overlay
- Statistics overlay

### Returning to Normal

To return to normal size:
- Press **Ctrl-Spacebar** again, or
- Click the **Back to Previous** button in the Topbar

**Use Case**: Quickly focus on your 3D model without secondary UI elements cluttering the view.

## Restore Area

**Reference**
- **Menu**: View → Area → Restore Area
- **Shortcut**: Ctrl-Spacebar

Returns the maximized area back to its original size and restores the previous screen layout.

This is the standard way to exit Maximize Area mode and return to your multi-panel workspace.

## Focus Mode

**Reference**
- **Menu**: View → Area → Focus Mode
- **Shortcut**: Ctrl-Alt-Spacebar

Focus Mode expands the editor area so it fills the **entire window**, hiding:

- The Topbar
- The Status Bar
- Secondary regions (such as toolbars, sidebars, headers, etc.) of the editor itself

This mode gives the **maximum possible screen space** for the active editor, useful for immersive work on a single task.

### Returning from Focus Mode

To return to normal size:
- Press **Ctrl-Alt-Spacebar** again, or
- Click the **icon** in the top-right corner of the editor (visible only when hovering over the area)

**Use Case**: When you need complete focus on a single editor with no distractions, such as detailed shader editing or video sequence organization.

**Difference from Maximize Area**: Maximize Area keeps the Topbar and Status Bar visible; Focus Mode hides everything except the editor itself.

## Duplicate Area into New Window

**Reference**
- **Menu**: View → Area → Duplicate Area into New Window
- **Shortcut**: Hold Shift-LMB on an area corner and drag outward slightly

Creates a new floating window containing a duplicate of the current editor area. The new window is fully functional and part of the same Blender instance.

### Advantages

- **Multiple Monitors**: Especially useful when working with multiple monitors, allowing you to spread editors across screens
- **Same Instance**: All windows share the same Blender scene and settings
- **Independent Editing**: Edit different aspects of your project in separate windows simultaneously

### Quick Method

You can also create a new window quickly by:
1. Holding **Shift-LMB** on an area corner
2. Dragging outward slightly
3. Releasing to create the window

**Use Case**: On a multi-monitor setup, display your 3D Viewport on one monitor and your Shader Editor on another, allowing simultaneous editing of geometry and materials without switching areas.

## Practical Workflow Tips

1. **Learn the Corners** - Area manipulation happens at corners; position your cursor precisely at the corner where two borders meet for reliable interactions.

2. **Use Maximize Wisely** - Maximize Area (Ctrl-Spacebar) is great for quick focus, but remember it's temporary; your layout is restored when you exit.

3. **Focus Mode for Immersion** - Use Focus Mode (Ctrl-Alt-Spacebar) when you need complete concentration without any UI distractions.

4. **Snap Sizes with Ctrl** - When resizing, hold Ctrl to snap areas to convenient sizes for alignment and visual consistency.

5. **Multi-Monitor Setup** - Use Duplicate Area into New Window to spread different editors across multiple monitors for maximum efficiency.

6. **Save Your Layout** - Once you have a layout you like, save it by duplicating the workspace and customizing it further.

7. **Right-Click for Options** - Always check the right-click context menu on area borders for additional manipulation options you might have forgotten.

8. **Context-Sensitive Shortcuts** - Remember that many shortcuts depend on which area your cursor is in; if a shortcut doesn't work, check that you're in the right editor.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Workspaces](/BLENDER_WORKSPACES.md) - Predefined area layouts for different tasks
- [Topbar](/BLENDER_TOPBAR.md) - Menu access and workspace switching
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
