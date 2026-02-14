# Blender Keymap

A keymap is a configuration of keyboard and mouse shortcuts that control how Blender responds to input. Understanding Blender's keymap conventions and available keymaps helps you work more efficiently and customize shortcuts to match your workflow.

## Conventions Used in This Manual

This section explains how keyboard and mouse shortcuts are written and referred to in Blender documentation.

### Keyboard Shortcuts

Keyboard shortcuts are written to clearly indicate which keys are pressed and in what combination.

**Single Keys**

Written as uppercase letters or key names:

- **G** - The "G" key by itself (as though you were typing a lowercase "g")
- **X** - The "X" key
- **Esc** - The Escape key
- **Tab** - The Tab key
- **F1** through **F12** - Function keys

### Modifier Keys

Modifier keys are special keys that modify the action of other keys when pressed simultaneously:

- **Shift** - Shift modifier
- **Ctrl** - Control modifier
- **Alt** - Alt modifier (Option on macOS)
- **Cmd** - Command key (macOS only)

### Key Combinations

Multiple keys pressed simultaneously are written with hyphens:

- **Ctrl-W** - Hold Ctrl and press W
- **Shift-Alt-A** - Hold Shift and Alt, then press A
- **Ctrl-Shift-Z** - Hold Ctrl and Shift, then press Z

**Order Convention**: Modifiers are typically listed in order (Shift, Ctrl, Alt), then the main key.

### Number Keys

**Top Row Numbers**

- **0 to 9** - The number keys on the row above the letters
- **1** - Shortcut for layer 1
- **2** - Shortcut for layer 2
- Example: **Shift-1** means Shift + the "1" key on the top row

**Numeric Keypad**

- **Numpad0 to Numpad9** - The keys on the separate numeric keypad (not the top row)
- **NumpadPlus** - The plus (+) key on the numeric keypad
- **NumpadMinus** - The minus (-) key on the numeric keypad
- **NumpadPeriod** - The period (.) key on the numeric keypad
- **NumpadEnter** - The Enter key on the numeric keypad
- **NumpadSlash** - The forward slash (/) key on the numeric keypad
- **NumpadAsterisk** - The asterisk (*) key on the numeric keypad

### Arrow Keys

Arrow keys are referred to by direction:

- **Left** - Left arrow key
- **Right** - Right arrow key
- **Up** - Up arrow key
- **Down** - Down arrow key
- **Ctrl-Left** - Ctrl + Left arrow

### Other Key Names

Other keys are referred to by their printed names:

- **Space** - The spacebar
- **Enter** - The Enter/Return key
- **Backspace** - The Backspace key
- **Delete** - The Delete key
- **Home** - The Home key
- **End** - The End key
- **PageUp** - The Page Up key
- **PageDown** - The Page Down key

## Mouse Conventions

Mouse buttons and wheel actions are referred to consistently throughout Blender documentation.

### Mouse Buttons

**LMB**
- **Left Mouse Button** - The primary mouse button (usually the left button)
- Used for selection, confirmation, and most interactions
- Example: "Click LMB on the object to select it"

**RMB**
- **Right Mouse Button** - The secondary mouse button (usually the right button)
- Used for context menus and alternate actions
- Example: "RMB on the layer to rename it"

**MMB**
- **Middle Mouse Button** - The center button (or scroll wheel when pressed)
- Used for panning and rotating the view
- Example: "Drag with MMB to pan the viewport"

### Mouse Wheel Actions

**Wheel, WheelUp, WheelDown**
- **Wheel** - Rolling the mouse wheel (context-dependent direction)
- **WheelUp** - Scrolling the mouse wheel upward
- **WheelDown** - Scrolling the mouse wheel downward
- Used for zooming, scrolling, and cycling through options
- Example: "Scroll WheelUp to zoom in on the 3D viewport"

### Mouse + Keyboard Combinations

Mouse actions can be combined with modifier keys:

- **Ctrl-LMB** - Hold Ctrl and click the left mouse button
- **Shift-MMB** - Hold Shift and use the middle mouse button
- **Alt-Wheel** - Hold Alt and scroll the mouse wheel
- Example: "Ctrl-LMB drag to constrain selection to a box"

## Built-in Keymaps

Blender provides multiple default keymaps to suit different preferences and workflows. Users can also create custom keymaps based on these defaults.

### Blender Keymap

**Overview**
- The default keymap used throughout this manual and Blender documentation
- Optimized for Blender's unique workflow and interface
- Recommended for new users learning Blender

**Characteristics**
- Intuitive for Blender's non-linear approach to 3D creation
- Uses middle mouse button (MMB) extensively for viewport navigation
- G, R, S for transform operations (Grab/Move, Rotate, Scale)
- Efficient keyboard shortcuts for common operations

**Common Shortcuts (Blender Keymap)**

- **G** - Grab/Move object
- **R** - Rotate object
- **S** - Scale object
- **X, Y, Z** - Constrain to axis
- **Shift-A** - Add object/element
- **Tab** - Toggle Edit Mode
- **1/3/7** on Numpad - Switch view (Front/Side/Top)
- **Numpad0** - Camera view
- **F12** - Render image
- **Ctrl-Z** - Undo
- **Ctrl-Shift-Z** - Redo

### Industry Compatible Keymap

**Overview**
- A keymap that more closely matches the shortcuts of other 3D editing applications
- Designed for users coming from software like Maya, 3ds Max, Cinema 4D, or Lightwave
- Reduces the learning curve for professionals switching to Blender

**Characteristics**
- Uses right mouse button (RMB) for viewport navigation (rotate, pan, zoom)
- MMB for selection and confirmation
- Keyboard shortcuts similar to industry-standard applications
- Maintains Blender's core functionality with familiar keybindings

**Common Differences from Blender Keymap**

- **View Navigation** - RMB instead of MMB for rotating the view
- **Transform Constraints** - May use different modifier combinations
- **Selection** - Uses MMB or LMB depending on context
- **Menu Access** - Some menus may have different shortcuts

**When to Use**
- You're migrating from other 3D software
- Your team uses industry-standard software and expects familiar shortcuts
- You want to minimize keyboard learning for new Blender users with 3D experience

## Customizing Keymaps

You can create custom keyboard and mouse shortcuts in the Preferences to match your specific workflow.

### How to Customize Keymaps

1. **Open Preferences**
   - Windows/Linux: Edit → Preferences
   - macOS: Blender → Preferences
   - Shortcut: Ctrl-Comma (Cmd-Comma on macOS)

2. **Navigate to Keymap Tab**
   - Click on the "Keymap" tab in the left panel

3. **Search for Shortcuts**
   - Use the search box to find the operation you want to customize
   - Example: Search for "Move" to find transform shortcuts

4. **Modify Shortcuts**
   - Click on an existing shortcut binding
   - Press your desired keys
   - Confirm the new binding
   - Or clear the binding to remove it

5. **Save Preferences**
   - Changes are saved automatically
   - Custom keymaps are stored in your Blender user profile

### Creating a Custom Keymap

1. In the Keymap preferences, look for the keymap selector dropdown
2. Select an existing keymap to base your custom one on
3. Click "New" to create a custom keymap
4. Name your custom keymap (e.g., "My Custom Blender")
5. Edit shortcuts as desired

### Importing/Exporting Keymaps

**Export a Keymap**
- In Keymap preferences, find the "Save As" button
- Your custom keymap is saved as a Python file
- Share this file with teammates for consistent shortcuts

**Import a Keymap**
- Download or receive a custom keymap file
- In Keymap preferences, use "Load" to import the file
- The imported keymap appears in the keymap list

### Resetting Keymaps

**Reset Individual Shortcut**
- Find the shortcut in the Keymap preferences
- Click the X button next to it to clear
- The default shortcut is restored

**Reset Entire Keymap**
- In Keymap preferences, select the keymap to reset
- Click "Restore" to reset all shortcuts to defaults

## Troubleshooting Shortcuts

### A Shortcut Isn't Working

**Check Your Keymap**
- Open Preferences → Keymap
- Search for the operation name (not the shortcut)
- Verify the shortcut is bound in your active keymap

**Check Context**
- Many shortcuts are context-dependent (only work in specific editors)
- Ensure your mouse cursor is in the correct editor (e.g., 3D Viewport)
- Example: Scale (S) only works when the 3D Viewport is active

**Check for Conflicts**
- Search the keymap for other operations using the same shortcut
- One of them may be overriding the expected operation
- Reassign conflicting shortcuts

### System Shortcut Conflicts

Some shortcuts may be reserved by your operating system:

- **Alt-Tab** - Usually reserved for window switching
- **Alt-F4** - Usually reserved for closing applications
- **Ctrl-Alt-Delete** - Usually reserved for system functions
- **Cmd-Q** - macOS reserved for quitting applications

**Solution**: Use a different keymap or customize conflicting shortcuts to alternative keys.

## Tips for Efficient Shortcut Use

1. **Learn gradually** - Start with essential shortcuts (G, R, S, Ctrl-Z) and add more as needed
2. **Use the Status Bar** - It shows shortcuts for the tool under your cursor
3. **Alt-Click shows hotkeys** - In some editors, Alt-clicking shows available tool shortcuts (if enabled)
4. **Memorize your most-used shortcuts** - This provides the biggest productivity boost
5. **Keep a cheat sheet** - Print or save common shortcuts for quick reference
6. **Consistency across projects** - Use the same custom keymap for all projects
7. **Backup your keymaps** - Export custom keymaps regularly as backup

## Comparing Keymaps

### When to Use Blender Keymap

- Learning Blender from scratch
- Optimized for Blender's workflow
- Most documentation examples use Blender keymap
- Preferred for Blender-focused studios and courses

### When to Use Industry Compatible Keymap

- Migrating from Maya, 3ds Max, Cinema 4D, or similar
- Team uses multiple 3D applications
- RMB viewport navigation is your preference
- Transitioning from other software to Blender

### When to Use Custom Keymaps

- Specific workflows that benefit from custom shortcuts
- Accessibility needs (e.g., left-handed mouse setup)
- Team or studio standardization
- Personal preference optimization

## Related Documentation

- [Preferences](/BLENDER_PREFERENCES.md) - Full preferences configuration including keymap settings
- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Interface overview
- [Regions](/BLENDER_REGIONS.md) - Context-dependent regions where shortcuts apply
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help showing shortcuts for tools
