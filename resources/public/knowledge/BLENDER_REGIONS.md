# Blender Regions

Every Editor in Blender is divided into Regions. Regions can have smaller structuring elements like tabs and panels with buttons, controls and widgets placed within them. Understanding regions helps you customize your workspace and find the tools you need.

## Overview

Regions are subdivisions within an editor area that contain different types of information and controls. The most prominent region is the Main region, but most editors contain additional regions for headers, toolbars, sidebars, and panels.

## Main Region

At least one region is always visible. It is called the **Main region** and is the most prominent part of the editor.

Each editor has a specific purpose, so the main region and the availability of additional regions are different between editors. For example:

- **3D Viewport** - Main region displays the 3D scene
- **Timeline** - Main region displays the timeline/animation frames
- **Shader Editor** - Main region displays the node graph
- **UV Editor** - Main region displays UV coordinates

See specific documentation about each editor in the Editors chapter for detailed information about their main regions.

## Header

A header is a small horizontal strip, which sits either at the **top or bottom** of an area. All editors have a header acting as a container for menus and commonly used tools. Menus and buttons will change with the editor type, the selected object, and the current mode.

### Header Context Menu

Right-click on a header to reveal a context menu with options:

**Show Header**
- Toggles the visibility of the header.
- If a header is hidden, it can be made visible again by clicking or dragging the small arrow that appears at the top/bottom right of the editor.

**Show Tool Settings**
- Toggles the visibility of the Tool Settings (see below).

**Show Menus**
- Toggles whether the menus are collapsed or shown in full.

**Flip to Bottom/Top**
- Toggles whether the header or Tool Settings appear on the top or bottom of the editor.
- Useful for rearranging your layout.

**Vertical/Horizontal Split**
- Shows an indicator line that lets you select the area and position where to split.
- Press Tab to switch between vertical and horizontal split modes.

**Maximize Area / Focus Mode**
- See the Areas documentation for details on these functions.

**Duplicate Area into New Window**
- See the Areas documentation for details.

**Close Area**
- Closes the area and replaces it with the expansion of a neighboring area.

## Toolbar

The Toolbar (on the left side of the editor area) contains a set of interactive tools. The toolbar is context-sensitive and changes based on the active editor and mode.

**Toggle Visibility**: Press **T** to toggle the visibility of the Toolbar.

**Tool Selection**: Click any tool icon to activate that tool. Tools typically have:
- An icon representing the tool
- Optional hotkey (shown on hover)
- Tool options that appear in the Tool Settings region

## Tool Settings

A horizontal strip at the top or bottom of the editor (similar to the header) containing settings for the currently selected tool. 

**Behavior**
- Just like the header, it can be hidden and moved through its context menu (right-click).
- Tool settings change dynamically based on which tool is active.
- Allows fine-tuning tool behavior before or during use.

**Example**: When using the Box Select tool, the Tool Settings might show options for selection mode (replace, add, subtract, intersect).

## Adjust Last Operation

**Adjust Last Operation** is a region that allows tweaking an operator after running it. This is useful for refining parameters after performing an action.

**How to Use**

1. Perform an operation (e.g., add a cube, scale an object, rotate a bone)
2. The Adjust Last Operation panel automatically appears (often in the lower left)
3. Modify the parameters in the panel before confirming
4. The operation updates in real-time as you adjust values

**Example**: After adding a cube with Add → Mesh → Cube, the Adjust Last Operation panel appears with options to adjust:
- Size
- Depth
- Rotation
- etc.

**Duration**: The panel is only available immediately after the operation. Once you perform another action, it disappears.

## Sidebar

The Sidebar (on the right side of the editor area) contains Panels with settings of objects within the editor and the editor itself.

**Toggle Visibility**: Press **N** to toggle the visibility of the Sidebar.

**Common Sidebar Panels**

In the 3D Viewport, the sidebar typically contains:

- **Tool** - Current tool options and settings
- **Item** - Properties of the active object
- **Scene** - Global scene settings
- **Object** - Transform and object properties
- **Modifier** - Modifiers applied to the object
- **And many others** depending on the editor and context

**Panel Organization**: Panels within the sidebar are organized as tabs at the top of the sidebar, allowing easy switching between different property panels.

## Footer

Some editors show a bar (on top/bottom of the editor area) that displays information about the active tool or operator.

### Animation Editor Footer

In animation editors, the footer contains controls and options related to playback, keying, auto keyframing, and transport. These settings allow you to:

- **Control animation preview** - How animations are previewed and synchronized with audio
- **Manage keyframes** - Insert and manage keyframes through keying sets and auto keying
- **Navigate timeline** - Use playback and transport controls to navigate
- **Adjust frame ranges** - Adjust frame ranges and preview specific segments of the animation

**Related Documentation**: For a detailed description of all properties and controls commonly found in the footer, see the Playback Controls documentation.

## Arranging Regions

### Scrolling

A region can be scrolled vertically and/or horizontally by:

- **Middle Mouse Button (MMB)** - Drag with MMB to scroll
- **Mouse Wheel** - Use the wheel while the mouse hovers over the region (if the region has no zoom level)

### Scrollbar Widgets

Some regions, in particular animation timelines, have scrollbars with added control points to adjust the vertical or horizontal range of the region. These special scrollbars have added widgets at the ends.

**Zoom Control**

- **Drag the dots** at the ends of scrollbars to either increase or decrease the displayed range
- This stretches or compresses the range to show more or less detail within the available screen space
- **Ctrl-MMB** - Quickly adjust both horizontal and vertical range by dragging with Ctrl-MMB while hovering over the editor

### Changing Size and Hiding Regions

**Resizing**
- Resizing regions works by dragging their border, the same way as Areas
- Position your cursor on the border between regions until it becomes a double-headed arrow
- Drag to resize

**Hiding Regions**

To hide a region:

1. Resize it down to nothing (drag its border completely)
2. A small arrow icon appears where the hidden region was
3. Click the arrow to make the region reappear
4. Or drag the arrow outward to resize and show the region

**Example**: Hide the Sidebar by dragging its left border all the way to the right, leaving a small arrow. Click the arrow to toggle it back.

### Scaling

The scale of certain regions (such as the Toolbar) can be changed by:

- **Ctrl-MMB drag** - Drag inside the region with Ctrl-MMB to scale
- **Numpad Plus/Minus** - Use NumpadPlus and NumpadMinus while hovering the mouse cursor over the region
- **Reset Scale** - Press Home to reset the scale to the default

This is useful for making toolbar icons larger for better visibility or smaller to save space.

## Asset Shelf

The Asset Shelf displays reusable assets (materials, brushes, objects, poses, etc.) that can be quickly added to your scene. The Asset Shelf is available in various editors depending on the asset type.

### Searching Assets

To search for assets:

1. **Hover your mouse** over the Asset Shelf
2. **Press Ctrl-F** and type a search query
3. The shelf will filter to show only assets matching your search
4. Press Escape to clear the search

### Tabs

Catalogs can be shown as individual tabs. Each tab will only show its content and the content of its children, making it easy to filter down to a certain set of assets.

**Use Case**: If you have a large library of materials organized in catalogs (Metal, Plastic, Wood, etc.), each catalog appears as a tab for quick access to specific material types.

### Display Options

Several display options are available for customizing the Asset Shelf:

**Size**
- Adjust the size of items on the shelf using the size property slider
- Useful for fitting more items in less space or making items easier to click

**Names**
- Toggle the "Names" checkbox to show asset names in the shelf
- Alternatively, hover over an item to show its name in a tooltip

**Height**
- By default, the shelf has a height for one item row
- Drag the upper edge of the Asset Shelf to increase its size and allow for more rows

### Filter

**By Active Tool**
- Only show brushes applicable for the currently active tool in the asset shelf
- Helps reduce clutter by hiding tools that don't apply to your current workflow

**Note**: The value of this property is stored in the Preferences, which may have to be saved manually if Auto-Save Preferences is disabled.

## Practical Tips

1. **Use keyboard shortcuts** - T (Toolbar), N (Sidebar), and right-click menus to quickly toggle regions on/off as needed.

2. **Customize for your workflow** - Hide regions you don't use and maximize space for regions you do use.

3. **Learn the context menus** - Right-click headers and region borders to discover options for moving, flipping, and organizing regions.

4. **Adjust Last Operation is temporary** - Use it immediately after operations to refine parameters; it disappears after you perform another action.

5. **Asset Shelf speeds up workflow** - Use the Asset Shelf with search (Ctrl-F) to quickly add frequently-used assets without hunting through menus.

6. **Scrollbar widgets for precision** - In timeline and animation editors, use the scrollbar widgets to zoom and pan to specific frame ranges quickly.

7. **Scale toolbar icons** - Use Ctrl-MMB or Numpad +/- to scale the toolbar to your preference for better visibility without wasting space.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Areas](/BLENDER_AREAS.md) - Area manipulation and window layout
- [Workspaces](/BLENDER_WORKSPACES.md) - Predefined layouts optimized for different tasks
- [Topbar](/BLENDER_TOPBAR.md) - Main menu and workspace switching
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
