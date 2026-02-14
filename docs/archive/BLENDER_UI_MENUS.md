# Blender UI Menus

Blender uses a variety of different menus for accessing options and Operators. This document covers the various menu types and how to interact with them.

## General Menu Interaction

Menus can be interacted with in the following ways:

### Mouse Selection

**LMB** on the desired item to select and activate it.

### Numerical Selection

You can use the number keys or numpad to input an item in the list to select. For example, **Numpad1** will select the first item and so on.

Number keys or numpad can also be used to activate menu items:
- **1** for the first menu item
- **2** for the second menu item
- etc.

For larger menus with more than 10 items:
- **Alt-1** activates the 11th item
- **Alt-2** activates the 12th item
- And so on, up to **Alt-0** for the 20th item

### Scrolling Large Menus

If a menu is too large to fit on the screen, a small scrolling triangle appears on the top or bottom. Scrolling is done by moving the mouse above or below this triangle.

**Alternative**: Use **Wheel** while hovering with the mouse to scroll.

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| **Arrow keys** | Navigate up/down through menu items |
| **Underlined character** | Press the underlined character on any menu item to activate it |
| **Return** | Activate the currently selected menu item |
| **Esc** | Close the menu without activating any menu item |
| **LMB outside menu** | Close the menu without activating |
| **Move cursor far away** | Close the menu without activating |

## Popup Menus

Popup menus list Operators which can be executed by selecting with **LMB** or using the generated shortcut indicated by the underlined character of the operator name.

### Features

- All menu entries show any relevant shortcut keys, which can be executed without opening the menu
- Icons and text labels provide quick visual identification
- Organized hierarchically by function

### Menu Search

All popup menus can be searched by pressing **Spacebar** and typing the name of the operator in the menu. If a popup menu has "Search" as one of the items, the menu can be searched without having to press **Spacebar** first.

All popup menus of an editor can be searched using the Menu Search feature (**F3** in most editors).

### Collapsing Menus

Sometimes it's helpful to gain some extra horizontal space in the header by collapsing menus. This can be accessed from the header context menu:

1. **RMB** on any of the header menus
2. **Uncheck** the "Show Menus" checkbox
3. Menus collapse into a single icon in the header
4. Click the icon to access the menu from the collapsed state

This is useful for:
- Working with smaller screen resolutions
- Maximizing viewport space
- Reducing visual clutter

## Select Menus

A Select Menu (or "selector") allows you to choose from a predefined list of options. It appears as a text label and/or icon with a down arrow on the right.

### Interaction

- **LMB click**: Opens the menu and choose an option. The selected option will then appear inside the button.
- **Ctrl-Wheel**: Cycle through options without opening the menu

Select menus are commonly used for:
- Mode selection (Object, Edit, Sculpt, etc.)
- Render engine selection
- Viewport shading modes
- Display options
- Data-block selection

### Expanded View

Some select menus use an expanded layout to show all available options at once. In this view:
- The active option is highlighted with a colored background
- Multiple options may be selectable by holding **Shift** and clicking with **LMB**
- All options remain visible without needing to open/close the menu

This layout is preferred when:
- The menu has many options (e.g., object types, modifiers)
- Visual comparison of options is important
- Quick scanning is necessary

## Popover Menus

Popover menus are similar to Select Menus, but can show more varied content such as:
- A title/header
- Multiple buttons
- Sliders and input fields
- Nested controls
- Complex layouts

Popover menus provide:
- More flexibility in content display
- Space for additional controls beyond simple selection
- Better visual organization of related options

Common examples:
- Transform Orientations popover
- Operator options popovers
- Settings panels

## Context Menus

Context menus are pop-ups that can be opened with **RMB**. In most editors, it's also possible to use the **Menu key**. The contents of the menu depend on the location of the mouse pointer.

### Editor Context Menus

When invoked in an editor, the menu contains a list of operators sensitive to the editor's mode. For example:
- In 3D Viewport: Selection, transform, mesh editing operators
- In Shader Editor: Node operations, connections
- In Timeline: Keyframe operations

### Property Context Menus

When invoked over buttons and properties, common options include:

#### Value Operations

| Option | Action |
|--------|--------|
| **Single** | Apply the change to a single value of a set (e.g. only the X coordinate of an object's Location) |
| **All** | Apply the change to all values in a set (e.g. all coordinates of an object's Location) |
| **Reset to Default Value(s)** (**Backspace**) | Replaces the current value by the default |

#### Copy Operations

| Option | Shortcut | Use Case |
|--------|----------|----------|
| **Copy Data Path** | **Shift-Ctrl-C** | Copies the Python property data path, relative to the data-block. Useful for Python scripting. |
| **Copy Full Data Path** | **Shift-Ctrl-Alt-C** | Copies the full Python property data path including any needed context information. |
| **Copy As New Driver** | - | Creates a new driver using this property as input, and copies it to the clipboard. Use Paste Driver to add the driver to a different property, or Paste Driver Variables to extend an existing driver with a new input variable. |
| **Copy To Selected** | - | Copies the property value to the selected object's corresponding property. A use case is if the Properties context is pinned. |

#### Shortcut Operations

| Option | Use Case |
|--------|----------|
| **Assign Shortcut** | Lets you define a keyboard or mouse shortcut for an operation. To define the shortcut you must first move the mouse cursor over the button that pops up. When "Press a key" appears you must press and/or click the desired shortcut. Press Esc to cancel. |
| **Change Shortcut** | Lets you redefine an existing shortcut. |
| **Remove Shortcut** | Unlinks the existing shortcut. |

#### File Operations

| Option | Use Case |
|--------|----------|
| **Open File Location** | Opens the containing folder using the operating system's file manager. |
| **Open Location Externally** | Opens the file location externally in your system's default file manager. |

#### Documentation

| Option | Shortcut | Use Case |
|--------|----------|----------|
| **Online Manual** | **F1** | Opens an online page of the Blender Manual in a web browser. |
| **Online Python Reference** | - | Context-sensitive access to the Python API Reference. |

#### Development Options

| Option | Use Case |
|--------|----------|
| **Edit Source** | For UI development – Creates a text data-block with the source code associated with the control, in case the control is based on a Python script. In the Text Editor it points at the code line where the element is defined. |
| **Edit Translation** | For UI development – Points at the translation code line. |

## Pie Menus

A pie menu is a menu whose items are spread radially around the mouse. Items are arranged in a circular pattern, making them quick to access.

### Pie Menu Layout

The pie menu displays:
- Items arranged radially around the cursor
- An open disc widget at the center showing the current direction
- Highlighted item indicating the current selection
- A plus icon (if sub-pies are available)

### Activation Methods

**Fast Method** (recommended):
1. Press down the key(s) that invoke the menu
2. Move the mouse slightly towards a selection
3. Release the key(s) to activate the selection instantly

**Alternative Method**:
1. Press down the key(s) that invoke the menu
2. Release the key(s) without moving the mouse to keep the menu open
3. Click the desired item with **LMB**

### Direction Selection

A pie menu will only have a valid direction for item selection if the mouse is touching or extending beyond the disc widget at the center of the menu. Move your cursor towards the desired item to highlight it.

### Pie Menu Shortcuts

| Shortcut | Action |
|----------|--------|
| **Underlined character** | Press the underlined letter on each menu item to activate it directly |
| **Number keys** | Use number keys to activate items (1 for first, 2 for second, etc.) |
| **Mouse movement** | Move towards the desired item to select it |

### Common Pie Menus

- **Mode Pie** (usually Shift-Tab or context-dependent): Quick access to Object/Edit/Sculpt/Pose modes
- **Transform Pie** (usually Shift-S or similar): Quick access to transform operations
- **Context Pies**: Various context-sensitive pie menus depending on the editor

### Pro Tip: Fast Operation

The fastest way to operate a Pie menu is:
1. Press the key
2. Move the mouse slightly toward the desired item
3. Release the key

The system intelligently highlights and activates the closest item, making pie menus extremely efficient for repetitive operations once you've memorized their layouts.

## Menu Search

**F3** or **Menu Search** (location varies by editor) opens a search dialog that allows you to:
- Search for all available operators
- Search across all menu items
- Execute operators without navigating menus
- Discover operators by name or partial name

This is particularly useful for:
- Finding operators whose menu location you don't remember
- Discovering related operators
- Keyboard-only operation of Blender

## Related Documentation

- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Button controls and operations
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts and customization
- [Blender Topbar](BLENDER_TOPBAR.md) - Main menu structure
- [Blender Help System](BLENDER_HELP_SYSTEM.md) - Getting help and documentation
- [Blender Preferences](BLENDER_PREFERENCES.md) - Menu and keymap customization
