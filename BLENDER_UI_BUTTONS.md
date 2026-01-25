# Blender UI Buttons

This document covers the various button types and controls used throughout Blender's interface for executing actions and toggling options.

## Operator Buttons

Operator buttons execute an Operator which in summary execute an action when clicked with LMB. Operator buttons may be an icon, text, or text with an icon.

Operator buttons are the primary means of triggering actions in Blender. They are contextual and perform different functions based on the editor they appear in or the mode you're in.

### Usage

- **Left-Click (LMB)**: Execute the operator/action
- **Multiple Operators**: Some buttons open a menu when clicked (indicated by a small arrow)
- **Right-Click (RMB)**: May show additional options or documentation on some buttons

### Common Operator Buttons

Operator buttons appear throughout the interface:
- **File Operations**: Save, Open, New, Render (File menu and topbar)
- **Editing Tools**: Extrude, Bevel, Loop Cut, Inset (3D Viewport toolbar)
- **Mode Switching**: Edit, Object, Sculpt, etc. (Header of 3D Viewport)
- **Property Changes**: Add material, add modifier, add constraint (Properties panel)
- **Timeline Controls**: Play, Reverse Play (Timeline header)
- **Rendering**: Render Image, Render Animation (Render menu or topbar)

### Customization

Operator buttons can be customized through:
- **Search**: F3 opens the operator search (all available operators)
- **Preferences**: Edit → Preferences → Keymap to assign custom shortcuts
- **Add-ons**: Custom operators can be added via add-ons

## Checkboxes & Toggle Buttons

These controls are used to activate or deactivate options. Use LMB to change their state.

- **Checkboxes**: Show a tick/checkmark when activated
- **Toggle Buttons**: Active status is indicated either by color on the icon background, or a change in icon graphics

Toggle buttons are commonly used for boolean (on/off) properties such as:
- Visibility toggles (eye icons for layers, objects, collections)
- Lock toggles (shield icons for preventing accidental edits)
- Display toggles (wireframe mode, solid mode, material preview, rendered view)
- Constraint/Modifier toggles (enable/disable individual items)
- Render toggles (influence on render, visibility in viewport, etc.)

### Quick Cycling with Ctrl-Wheel

Use **Ctrl-Wheel** to cycle through on/off states without clicking. This is particularly useful when:
- Toggling multiple settings in rapid succession
- Working with visibility/lock states
- Adjusting boolean properties while keeping focus on the viewport

### Batch Operations with Dragging

To change many values at once on or off:

1. Press down **LMB** on the first button you want to change
2. Drag your mouse cursor over multiple buttons
3. Release LMB to apply the change to all buttons in the path

This is useful for:
- Hiding/showing multiple objects or layers at once
- Locking/unlocking multiple properties
- Enabling/disabling multiple modifiers or constraints
- Toggling render visibility for multiple items

**Pro Tip**: You can drag horizontally, vertically, or diagonally—Blender detects all buttons you pass over.

## Direction Buttons

Direction buttons let you change a direction by rotating a sphere. This control is used for vector properties like:
- Light direction (for directional lights)
- Normal direction (for custom normals)
- Vector properties in custom data

### Interaction

**LMB (drag)**: Rotates the direction sphere to set the desired direction vector. The sphere provides visual feedback showing which direction is currently selected.

### Shortcuts

- **LMB (drag)**: Rotates the direction to follow your mouse movement
- **Ctrl (while dragging)**: Snaps to vertical & diagonal directions (0°, 45°, 90°, 135°, etc.)

### Workflow Tips

- **Relative Movement**: The direction changes relative to where you drag, not absolute screen position
- **Precision Snapping**: Hold Ctrl while dragging to snap to cardinal or diagonal directions for precise alignment
- **Visual Feedback**: The sphere visualizes the current direction, making it easy to see the vector at a glance

## Related Documentation

- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Text input and numeric controls
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Drop-down and context menus
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts and customization
- [Blender Regions](BLENDER_REGIONS.md) - UI region organization and management
