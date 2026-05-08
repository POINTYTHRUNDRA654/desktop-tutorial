# Blender Workspaces

Workspaces are essentially predefined window layouts. Each Workspace consists of a set of Areas containing Editors and is geared towards a specific task such as modeling, animating, or scripting. You'll typically switch between multiple Workspaces while working on a project.

## Overview

Workspaces are located in the Topbar as a set of tabs. They allow you to quickly switch between different screen layouts optimized for different workflows, without manually rearranging editors every time.

## Controls

### Tabs

- **Click** on workspace tabs to switch between workspaces.
- **Double-click** a tab to rename the workspace.

### Add Workspace

Click the **+** icon to add a new workspace from a predefined template (e.g., Modeling, Sculpting, Compositing).

### Context Menu (RMB)

Right-click on a workspace tab to access additional options:

**Duplicate**
- Makes a copy of the selected workspace, including its screen layout and editors.
- Useful for creating custom variations of existing workspaces.

**Delete**
- Deletes the selected workspace.
- If it is the last workspace, it cannot be removed.

**Reorder to Front/Back**
- Moves the workspace tab to the first (front) or last (back) position in the tab list.
- Helps organize workspaces in your preferred order.

### Keyboard Shortcuts

**Previous Workspace** (Ctrl-PageUp)
- Activates the workspace immediately to the left of the current one.

**Next Workspace** (Ctrl-PageDown)
- Activates the workspace immediately to the right of the current one.

### Delete Other Workspaces

- Right-click on a workspace and select to remove all workspaces except the one that was right-clicked on.
- Use with caution as this cannot be easily undone.

## Default Workspaces

Blender's default startup shows the **Layout** workspace in the main area. This workspace contains the following editors:

- **3D Viewport** (top left) - Main 3D view
- **Outliner** (top right) - Scene hierarchy and object management
- **Properties** (bottom right) - Object and scene properties
- **Timeline** (bottom left) - Playback and frame management

### Layout

The general workspace to preview your scene and work on basic setup. Contains the four main editors mentioned above.

### Modeling

Optimized for modification of geometry by modeling tools. Features:
- Focus on modeling tools in the Tool panel
- 3D Viewport as primary editor
- Properties for material and object settings
- Outliner for object management

### Sculpting

Optimized for modification of meshes by sculpting tools. Includes:
- Sculpt Mode workspace with specialized brush panels
- Large 3D Viewport for detailed work
- Tool options for brush configuration
- Brush properties and stroke controls

### UV Editing

For mapping of image texture coordinates to 3D surfaces. Contains:
- UV Editor for unwrapping and layout
- 3D Viewport for reference
- Image editor for texture preview
- Outliner and properties panels

### Texture Paint

For coloring image textures in the 3D Viewport. Features:
- Texture Paint Mode enabled
- Paint tools in Tool panel
- Large 3D Viewport for painting
- Image editor for texture management

### Shading

For specifying material properties for rendering. Includes:
- Shader Editor for node-based material creation
- 3D Viewport in rendered preview mode
- Properties for material and shader settings
- Texture preview and management

### Animation

For making properties of objects dependent on time. Contains:
- Timeline for frame management
- Dope Sheet for keyframe editing
- Graph Editor for curve refinement
- 3D Viewport for preview
- Properties for object animation settings

### Rendering

For viewing and analyzing rendering results. Features:
- Image Editor showing render output
- Compositor for post-processing
- Properties for render settings
- Performance monitoring tools

### Compositing

For combining and post-processing of images and rendering information. Includes:
- Compositor Node Editor as primary workspace
- Viewer nodes for preview
- Image Editor for final output
- Properties for compositor settings

### Geometry Nodes

For procedural modeling using Geometry Nodes. Contains:
- Geometry Nodes Editor
- 3D Viewport for preview
- Modifier properties panel
- Node wrangler tools

### Scripting

For interacting with Blender's Python API and writing scripts. Features:
- Text Editor for script writing
- Python Console for interactive commands
- Info Editor for operation logging
- Properties for script debugging

## Additional Workspaces

Blender provides several additional specialized workspaces that can be added via the **Add Workspace** menu:

### 2D Animation

**2D Animation**
- General workspace to work with Grease Pencil 2D animation tools.
- Optimized for traditional 2D animation workflows.
- Contains paint tools, timeline, and animation controls.

**2D Full Canvas**
- Similar to "2D Animation" but contains a larger canvas.
- Useful for detailed 2D illustration work.

### VFX

**Masking**
- For creating 2D masks for compositing or video editing.
- Includes mask editor and compositor view.
- Useful for advanced compositing workflows.

**Motion Tracking**
- For calculating camera motion and stabilizing video footage.
- Contains tracking tools and match-move workflow.
- Useful for visual effects integration.

### Video Editing

**Video Editing**
- For sequencing together media into one video.
- Specializes in timeline and video sequencing.
- Includes media management and export options.

## Saving and Loading Workspaces

### Blend-File Storage

Workspaces are saved in the blend-file. When you open a file, the workspaces you created are preserved. To open a file with its saved workspaces:

1. Use File → Open
2. In the File Browser, enable **Load UI** (checkbox in the top right)
3. This tells Blender to use the file's screen layout and workspaces rather than the current ones

### Save as Defaults

A custom set of workspaces can be saved as a part of the Defaults. This means your custom workspaces will be included in new projects:

1. Arrange your workspaces as desired
2. Go to File → Defaults → Save Startup File
3. Your workspace setup is now the default for new files

## Workspace Settings

Workspace-specific settings can be configured in the Properties Editor's **Tool tab** under **Workspace**:

### Pin Scene

When enabled, the current workspace will remember the currently selected scene. Then, whenever you activate the workspace, it'll automatically switch back to that scene.

**Use Case**: Keep your rendering workspace always on your final render scene, and your animation workspace on your working animation scene.

### Mode

Automatically switch to this Mode when activating the workspace.

**Use Case**: Entering Sculpt workspace automatically switches to Sculpt Mode; entering Shading workspace keeps you in Object Mode.

### Sequencer Scene

The scene containing the edit that is used by the video sequence editor. See Sequencer Scene documentation for details.

### Sync Scene Time

Sync the active scene and time based on the current scene strip in the video sequence editor. See Sequencer Scene documentation for details.

### Filter Add-ons

Determines which add-ons are enabled in the active workspace.

- **Unchecked**: Uses global add-ons enabled in Preferences
- **Checked**: Allows enabling/disabling individual add-ons per workspace

**Use Case**: Enable heavy-duty modeling add-ons only in Modeling workspace to reduce overhead in lightweight workspaces.

## Workflow Tips

1. **Create Custom Workspaces** - Duplicate existing workspaces and customize the layout and editors for your specific workflow.
2. **Organize Tab Order** - Drag workspace tabs or use Reorder to Front/Back to keep frequently-used workspaces easily accessible.
3. **Use Pin Scene** - Prevent accidentally switching scenes when clicking workspace tabs by enabling Pin Scene.
4. **Add-on Filtering** - If certain add-ons slow down Blender, disable them in workspaces where they're not needed.
5. **Save Workspace Templates** - Save your custom workspace setup as the startup file so new projects start with your preferred layout.
6. **Keyboard Navigation** - Use Ctrl-PageUp/PageDown to quickly cycle through workspaces without reaching for the mouse.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Topbar](/BLENDER_TOPBAR.md) - Workspace tabs and menu access
- [Preferences](/BLENDER_PREFERENCES.md) - Configure workspace defaults and add-ons
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help resources
