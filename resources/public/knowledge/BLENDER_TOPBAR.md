# Blender Topbar

The Topbar is located at the very top of the Blender window and contains the main menu system, workspace tabs, and scene/layer selection.

## Menus

### Blender Menu

The Blender Menu provides information about Blender and application-level options.

**Splash Screen**
- Open the Splash Screen to access new file templates and recent files.

**About Blender**
- Opens a menu displaying the following information:
  - **Version** - The Blender version number
  - **Date** - Date when Blender was compiled
  - **Hash** - The Git Hash of the build (useful for support personnel when diagnosing problems)
  - **Branch** - Optional branch name
  - **Windowing Environment** - On Linux, shows either Wayland or X11 depending on the windowing environment
  - **Donate** - Open Blender's Development Fund website
  - **What's New** - Open the latest release notes
  - **Credits** - Open the credits webpage
  - **License** - Open the license webpage
  - **Blender Store** - Open the Blender Store website
  - **Blender Website** - Open main Blender website

**Install Application Template**
- Install a new application template for specialized workflows.

### File Menu

The File Menu manages blend-files and provides save/load operations.

**New** (Ctrl-N)
- Clears the current scene and loads the selected application template.

**Open** (Ctrl-O)
- Open a blend-file from your system.

**Open Recent** (Shift-Ctrl-O)
- Displays a list of the most recently opened blend-files.
- Hovering over items shows a preview and information about each file.
- Select any filename to open that blend-file.

**Clear Recent Files List**
- Removes items from the recent files list.

**Revert**
- Reopens the current file to its last saved version, discarding all unsaved changes.

**Recover**
- Options to recover a blend-file from accidental closing or a Blender crash:
  - **Last Session** - Recover from auto-save of the last session
  - **Auto Save** - Recover from auto-save files

**Save** (Ctrl-S)
- Save the current blend-file to its current location with its current name.

**Save As…** (Shift-Ctrl-S)
- Opens the File Browser to specify the file name and location for saving.

**Save Copy…**
- Saves a copy of the current file without changing the current working file.

**Save Incremental** (Ctrl-Alt-S)
- Save the current Blender file with a numerically incremented name that does not overwrite any existing files.
- Useful for creating versions: scene.blend → scene001.blend → scene002.blend, etc.

**Link…**
- Links data from an external blend-file (library) to the current one.
- The editing of linked data is only possible in the external library.
- See Linked Libraries for more details.

**Append…**
- Appends data from an external blend-file to the current one.
- The new data is copied from the external file and completely unlinked from it.

**Data Previews**
- Tools for managing data-block previews (thumbnails used in menus and editors).

#### Import

Blender can import information stored in a variety of file formats created by other graphics programs. See Import/Export documentation for details on supported formats.

#### Export

You can export some or all of your work to formats that can be processed by other graphics programs. See Import/Export documentation for supported formats.

**Export All Collections**
- Invokes all configured exporters for all collections in one operation.

#### External Data

External data, like texture images and other resources, can be stored inside the blend-file (packed) or as separate files (unpacked). Blender keeps track of all unpacked resources via relative or absolute paths.

**Automatically Pack Resources**
- Pack all currently used external files into the blend-file and automatically pack any files that are added later.
- Unchecking this option will only stop automatic packing for new files; it won't unpack existing ones.

**Pack Resources**
- Pack all used external files into the blend-file.
- After running this and saving, external files will no longer be used—any changes to them won't be reflected, and you're free to move or delete them.

**Unpack Resources**
- Export previously packed files back to external ones.
- You can choose whether to reuse existing external files or overwrite them.

**Pack Linked Libraries**
- Pack data-blocks that are linked from an external blend-file into the current one.

**Unpack Linked Libraries**
- Export previously packed data-blocks back to external blend-files.
- Existing blend-files are overwritten.

**Make Paths Relative**
- Make all paths to external files relative to the current blend-file.
- Useful for portability when sharing files.

**Make Paths Absolute**
- Make all paths to external files absolute (full path from the system's root).

**Report Missing Files**
- Useful to check if there are links to unpacked files that no longer exist.
- A warning message will appear in the Info editor's header if missing files are found.

**Find Missing Files**
- Helps fix broken links in a blend-file.
- A File Browser opens; select a directory and a recursive search is performed.
- Every missing file found will be recovered as an absolute path.
- After recovery, select Make Paths Relative if you prefer relative paths.

#### Clean Up

**Purge Unused Data**
- Opens a dialog to remove unused data-blocks from the current blend-file or Linked Data.
- This operation cannot be undone, so use carefully.
- See the Outliner for more information.

**Manage Unused Data**
- Opens the Outliner in Unused Data mode.
- Lists data-blocks that are unused and/or will be lost when the file is reloaded.
- Includes data-blocks with only a fake user.
- Add/remove the Fake User by clicking the cross/tick icon.

#### Defaults

This menu manages the startup file used for new files.

**Save Startup File**
- Saves the current blend-file as the startup file (the default scene for new projects).

**Load Factory Settings**
- Restores the default startup file and preferences to their factory state.

**Load Factory Blender Settings** (when Application Templates in use)
- Loads the default settings to the original Blender settings without template changes.

**Load Factory (Application Template Name) Settings** (when Application Templates in use)
- Loads the default settings to the original application template.

**Quit** (Ctrl-Q)
- Closes Blender.
- The current scene is saved to a file called "quit.blend" in Blender's temporary directory (found in the File Paths tab of Preferences).

### Edit Menu

The Edit Menu provides undo/redo and general editing operations.

**Undo, Redo, Undo History**
- See the Undo & Redo section for full details.

**Adjust Last Operation, Repeat Last, Repeat History**
- See the Undo & Redo section for full details.

**Menu Search**
- Find a menu based on its name.
- Type to search for menu items.

**Operator Search**
- Execute an operator based on its name.
- Available with Developer Extras enabled.

**Rename Active Item**
- Rename the active object or node.
- See Rename tool for more information.

**Batch Rename**
- Rename multiple data types at once.
- See Batch Rename tool for more information.

**Lock Object Modes**
- Prevents selecting objects that are in a different mode than the current one.
- This option can prevent accidental mode changes, such as when trying to select a bone in Pose Mode but instead clicking background scenery.
- You may want to disable this when weighting rigged objects or sculpting/painting where you intentionally switch between objects in different modes.

**Preferences** (Ctrl-Comma)
- Open the Preferences window to configure Blender settings.

### Render Menu

The Render Menu provides rendering and preview operations.

**Render Image** (F12)
- Render the active scene at the current frame.
- Displays the result in the Image Editor.

**Render Animation** (Ctrl-F12)
- Render the animation of the active scene.
- See Rendering Animations for details.

**Render Sequencer Image** (Alt-F12)
- If a Sequencer Scene exists that differs from the active scene, render that scene instead.

**Render Sequencer Animation** (Ctrl-Alt-F12)
- Render the animation of the Sequencer Scene.
- Automatically sets the Show Sequencer Scene toggle in the Image Editor Render Result after rendering.

**Render Audio**
- Mix the scene's audio to a sound file.
- See Rendering Audio for details.

**View Render** (F11)
- Show the Render window displaying full-screen render output.
- Press again to switch back to the main Blender window.

**View Animation** (Ctrl-F11)
- Playback rendered animation in a separate player.
- See Animation Player for details and preferences for selecting a different player.

**Lock Interface**
- Lock interface during rendering in favor of giving more memory to the renderer.

### Window Menu

The Window Menu manages windows and workspaces.

**New Window**
- Create a new window by copying the current window (same workspace and scene).

**New Main Window**
- Create a new window with its own workspace and scene selection.

**Toggle Window Fullscreen**
- Toggle the current window between fullscreen and windowed mode.

**Next Workspace**
- Switch to the next workspace in the workspace tabs.

**Previous Workspace**
- Switch to the previous workspace in the workspace tabs.

**Show Status Bar**
- Toggle whether the Status Bar at the bottom of the window should be displayed.

**Save Screenshot**
- Capture a picture of the current Blender window.
- A File Browser opens to choose where the screenshot is saved.

**Save Screenshot (Editor)**
- Capture a picture of the selected Editor.
- Select the Editor by clicking LMB within its area after running the operator.
- A File Browser opens to choose where the screenshot is saved.

### Help Menu

The Help Menu provides access to documentation and support resources. See the Help System documentation for full details.

## Workspaces

This set of tabs is used to switch between Workspaces, which are essentially predefined window layouts optimized for different tasks.

Common workspaces include:

- **Layout** - General modeling and scene setup
- **Modeling** - Focused on mesh modeling tools
- **Sculpting** - Sculpt mode with optimized panels
- **UV Editing** - UV unwrapping and layout
- **Texture Paint** - Texture painting in 3D
- **Shading** - Shader Editor and 3D viewport
- **Animation** - Timeline and dope sheet for animation
- **Rendering** - Compositor and render settings
- **Compositing** - Post-processing with nodes
- **Geometry Nodes** - Procedural modeling with node groups
- **Scripting** - Python scripting interface

You can create custom workspaces by saving your current layout via Workspace menu options.

## Scenes & Layers

These data-block menus are used to select the current Scene and View Layer.

**Scene Selector**
- Choose which scene to work on.
- Multiple scenes can exist in a single blend-file, each with its own objects, animation, and settings.
- Switching scenes changes the entire viewport and all active editors.

**View Layer Selector**
- Choose which view layer to work on within the current scene.
- View layers are subsets of objects within a scene, useful for organizing complexity.
- Different view layers can be rendered separately and composited together.
- Useful for keeping background, foreground, and effects on separate layers.

## Tips

1. **Learn keyboard shortcuts** - Most menu items show their keyboard shortcut; memorize the common ones (Ctrl-S, Ctrl-Z, F12) to speed up workflow.
2. **Use Recent Files** - Keep frequently used files in the recent list for quick access.
3. **External Data Management** - For collaborative projects, always use relative paths and keep textures packed or in the same directory structure.
4. **Startup File** - Customize your startup file once with your preferred settings, units, and layout to speed up new projects.
5. **Lock Object Modes when needed** - Enable this when working with rigged models to prevent accidental mode switches.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Splash Screen](/BLENDER_SPLASH_SCREEN.md) - Startup options and templates
- [Preferences](/BLENDER_PREFERENCES.md) - Full preferences configuration
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and resources
