# Blender Status Bar

The Status Bar is located at the bottom of the Blender window and displays contextual information such as keyboard shortcuts, messages, and statistical information about your current work and system.

## Overview

The Status Bar is divided into three main sections:
- **Left** - Keymap information
- **Middle** - Status messages and progress
- **Right** - Resource and scene information

### Toggling the Status Bar

The Status Bar can be hidden or shown by:
- **Window Menu** - Select Window → Show Status Bar to toggle it
- **Drag from top edge** - Drag from the top edge of the Status Bar downward to hide it

## Left Side: Keymap Information

The left side of the Status Bar displays mouse button shortcuts and the keymap of the active tool. This helps you learn keyboard shortcuts while working.

### Tool Hotkeys

In editors with a Toolbar, pressing and holding **Alt** (or **Option** on macOS) shows the hotkeys to change to a desired tool. This provides an interactive guide to available tools without cluttering the interface.

**Example**: In the 3D Viewport, press Alt to see a tooltip showing the keyboard shortcut for each tool.

### Customization

This Alt Click Tool Prompt functionality can be disabled in **Edit → Preferences → Keymap Preferences** if you prefer a cleaner interface without the visual hints.

## Middle Section: Status Messages

The middle of the Status Bar displays information about in-progress operations and messages.

### Running Task Progress

Shows the progress of the currently running task such as:
- **Rendering** - Image or animation render progress
- **Baking** - Texture or light bake progress
- **Simulations** - Physics simulation playback/calculation
- **File Operations** - Loading or saving large files

**Progress Bar**
- Visual indicator of task completion percentage
- Hovering the mouse pointer over the progress bar displays a time estimate
- The task can be aborted by clicking the **Cancel** button (X icon)

**Use Case**: While rendering an image, the progress bar shows percentage complete and estimated time remaining. You can cancel the render at any time by clicking the X button.

### Report Messages

Informational messages or warnings appear here, such as:
- "File saved successfully"
- "Warning: Object has no material"
- "Info: 5 objects selected"

**Behavior**
- Messages disappear automatically after a short time
- Click a message to show the full message details in the **Info Editor**
- Useful for understanding what operations just completed

**Example**: After saving a file, you see "Blender file saved" briefly in the Status Bar. Click it to open the Info Editor and see the exact save path and file size.

## Right Side: Resource Information

The right side of the Status Bar displays information about the Blender instance and active scene. The information shown can be customized by:
- **Right-clicking** on the Status Bar to access context menu options
- **Edit → Preferences** → Interface tab to configure which items display

### Scene Statistics

Shows information about the data in the active scene.

**Collection**
- The name of the active Collection (organizational group of objects).

**Active Object**
- The name of the currently selected/active object.

**Geometry**
- Information about the current scene depending on the mode and object type:
  - **Vertices** - Total vertex count (object/edit mode)
  - **Faces** - Total face count (object/edit mode)
  - **Triangles** - Total triangle count (useful for rendering)
  - **Bones** - Total bone count (armature/pose mode)
  - **Frames** - Frame count (grease pencil strokes)

**Objects**
- The number of selected objects and the total count of objects in the scene
- **Format**: "X selected / Y total" (e.g., "3 selected / 12 total")

### Scene Duration

Shows the total playback time and frame information.

**Display Format**
- Current frame number and total frame count
- Total time in hours:minutes:seconds format
- Timecode Style can be customized in Preferences → Interface

**Example**: "Frame 120 / 300 - 00:05:00" means you're on frame 120 of 300 frames, which equals 5 seconds at the default 24 fps.

### System Memory

Shows an estimate of Blender's RAM consumption.

**Interpretation**
- Displays approximate amount of RAM used by Blender
- On a single-instance single-machine scenario, this measurement helps you track memory usage against your hardware limit
- Useful for optimizing scenes when approaching memory limits

**Example**: "RAM: 2.4 GB / 16 GB available"

### Extensions Updates

Shows the number of extensions (add-ons) with available updates.

**Use Case**: Quickly see if you have outdated add-ons and consider updating them for bug fixes and new features.

### Blender Version

Shows the version number of Blender that is currently running.

**Format**
- Major version (e.g., "4.1")
- Optional patch number (e.g., "4.1.2")
- Optional build info for development versions

**Use Case**: Verify you're running the correct Blender version, especially when sharing files or following version-specific tutorials.

## Customizing the Status Bar

### Display Options

Right-click on any item in the Status Bar (right section) to toggle its visibility:

1. **Right-click** on the Status Bar (right side)
2. A menu appears with checkbox options for each information type
3. **Check/uncheck** items to show or hide them

### Preferences Configuration

You can also customize the Status Bar in Edit → Preferences → Interface:

- **Show Text Overflow** - Display full text for overflowing information
- **Status Bar Statistics** - Choose which scene statistics to display
- **Memory Units** - Display memory in MB, GB, or other units

## Practical Uses

1. **Monitoring Renders** - Keep an eye on render progress and estimated completion time
2. **Tracking Performance** - Monitor RAM usage while working on complex scenes
3. **Learning Shortcuts** - Alt-click shows available tool shortcuts for quick learning
4. **Scene Information** - Quickly verify object counts, vertex counts, and active object name
5. **Error Messages** - Immediately see important warnings or info messages about operations
6. **Version Verification** - Confirm you're running the correct Blender version at a glance

## Tips

1. **Don't hide the Status Bar** - It provides valuable real-time feedback; keeping it visible helps you work more efficiently.
2. **Customize for your workflow** - If you don't need scene statistics, hide them to reduce visual clutter.
3. **Check memory usage** - If scenes feel slow, check the RAM display to see if you're running out of memory.
4. **Learn from hotkey hints** - Use Alt-click hints to learn keyboard shortcuts without disrupting your workflow.
5. **Monitor background tasks** - Watch the progress bar for renders or bakes so you know when operations complete.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Topbar](/BLENDER_TOPBAR.md) - Main menu and workspace management
- [Preferences](/BLENDER_PREFERENCES.md) - Configure Status Bar display options
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
