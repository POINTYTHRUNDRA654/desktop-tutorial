# Blender UI: Editors Overview

## Overview

**Editors** are the fundamental containers for viewing and modifying different aspects of Blender's data and workflow. Each editor type is specialized for specific tasks, from 3D modeling and animation to compositing and scripting. Editors are placed within **Areas**, which determine their size and position in the Blender window. The same editor type can be open in multiple areas simultaneously, allowing flexible workspace configurations.

Understanding the different editors and their purposes is essential for efficient Blender workflow, as each editor provides unique tools and interfaces optimized for specific production tasks.

### Key Characteristics of Editors

- **Specialized Functions**: Each editor type optimized for specific tasks
- **Area-Based**: Contained within Areas that can be resized and positioned
- **Customizable**: Same editor type can appear in multiple locations
- **Mode-Aware**: Some editors only available in specific modes
- **Context-Sensitive**: Display and options change based on selection
- **Hierarchical**: Some editors are sub-editors within others (e.g., UV Editor within Image Editor)
- **Workflow-Critical**: Choice of visible editors directly impacts efficiency
- **Configurable**: Can be opened, closed, and rearranged as needed

### Editor Type Selector

Every editor has a type selector button in its top-left corner (usually showing an icon). Clicking this button displays a dropdown menu of all available editor types that can be placed in that area. This allows quick switching between different editors without needing to access menus.

**Accessing Editor Type Selector**:
1. Click the icon in the top-left of any header
2. Menu lists all available editor types
3. Select editor type to replace current editor
4. New editor appears with all its tools and panels

---

## Editor Categories

Blender's editors are organized into functional categories based on their primary purpose.

### General Editors

**General Purpose Editors** handle core modeling, viewing, and interaction with 3D content.

#### 3D Viewport
- **Purpose**: Primary 3D scene viewing and manipulation
- **Primary Uses**: Modeling, posing, animation, sculpting, painting
- **Key Features**: 3D space navigation, object selection, transform tools
- **Availability**: All modes
- **Details**: See 3D Viewport documentation for comprehensive reference

#### Image Editor
- **Purpose**: Viewing and painting on 2D images and textures
- **Primary Uses**: Texture painting, image editing, viewport painting
- **Key Features**: Image display, painting brushes, layer support
- **Availability**: All modes
- **Related**: Texture Painting Mode

#### UV Editor
- **Purpose**: Editing UV coordinates for texture mapping
- **Primary Uses**: UV mapping, unwrapping, texture layout
- **Key Features**: UV visualization, packing, seaming tools
- **Availability**: Edit Mode (meshes)
- **Note**: Sub-editor typically shown alongside Image Editor

#### Compositor
- **Purpose**: Post-processing and compositing rendered images
- **Primary Uses**: Color correction, effects, rendering workflows
- **Key Features**: Node-based compositing, layer combinations, effects
- **Availability**: Shading workspace by default
- **Format**: Node-based interface similar to Shader Editor

#### Texture Nodes (Legacy)
- **Purpose**: Texture definition using node networks
- **Primary Uses**: Complex texture creation (legacy workflow)
- **Key Features**: Node network, texture composition
- **Availability**: Properties > Texture properties
- **Note**: Largely superseded by Shader Editor for modern workflows

#### Geometry Node Editor
- **Purpose**: Procedural geometry generation and manipulation
- **Primary Uses**: Procedural modeling, geometry manipulation, custom tools
- **Key Features**: Node networks, real-time deformation, groups
- **Availability**: All modes (geometry nodes modifier)
- **Significance**: Core tool for procedural workflows

#### Shader Editor
- **Purpose**: Material definition and shader networks
- **Primary Uses**: Material creation, shader composition, texturing
- **Key Features**: Shader nodes, material networks, preview
- **Availability**: Shading workspace or alongside viewport
- **Format**: Node-based material definition

#### Video Sequencer
- **Purpose**: Video editing and sequencing
- **Primary Uses**: Animation assembly, video editing, cutting
- **Key Features**: Timeline sequencing, effects, transitions
- **Availability**: Dedicated workspace or modal
- **Use Case**: Assembling rendered clips into final video

#### Movie Clip Editor
- **Purpose**: Motion tracking and clip analysis
- **Primary Uses**: Camera tracking, motion capture, stabilization
- **Key Features**: Tracking markers, solving, playback
- **Availability**: Motion Tracking workspace
- **Specialized**: For visual effects and motion capture

### Animation Editors

**Animation Editors** manage timing, keyframes, and motion across time.

#### Dope Sheet
- **Purpose**: Overall animation timeline view
- **Primary Uses**: Keyframe overview, timing adjustment, overall animation
- **Key Features**: Channel-based view, keyframe blocks, action organization
- **Availability**: Animation workspace
- **Concept**: Simplified timeline showing animation blocks

#### Timeline
- **Purpose**: Frame-by-frame animation control
- **Primary Uses**: Playback control, frame navigation, animation preview
- **Key Features**: Playback controls, frame indicators, timeline scrubbing
- **Availability**: Animation workspace (usually bottom)
- **Critical**: Essential for animation review and timing

#### Graph Editor
- **Purpose**: Detailed keyframe and curve editing
- **Primary Uses**: Fine-tuning motion, easing, interpolation
- **Key Features**: Bezier curve editing, fcurve visualization, handles
- **Availability**: Animation workspace or side panel
- **Precision**: Allows frame-perfect motion control

#### Drivers Editor
- **Purpose**: Expression-based animation and automation
- **Primary Uses**: Parametric animation, automatic updates, rigging
- **Key Features**: Driver setup, expression editing, variable control
- **Availability**: Graph Editor mode or dedicated panels
- **Advanced**: For complex animation relationships

#### Nonlinear Animation (NLA) Editor
- **Purpose**: Action sequencing and blending
- **Primary Uses**: Animation reuse, action blending, layered animation
- **Key Features**: Track-based timeline, action strips, transitions
- **Availability**: Animation workspace
- **Workflow**: For complex animation choreography

### Scripting Editors

**Scripting Editors** provide tools for Python code development and automation.

#### Text Editor
- **Purpose**: Python script writing and editing
- **Primary Uses**: Script development, automation, plugin creation
- **Key Features**: Code highlighting, syntax checking, execution
- **Availability**: Dedicated workspace or side panel
- **Integration**: Scripts can access Blender API directly

#### Python Console
- **Purpose**: Interactive Python command execution
- **Primary Uses**: Testing code snippets, debugging, exploration
- **Key Features**: Interactive prompt, history, autocomplete
- **Availability**: Scripting workspace
- **Value**: Quick testing without creating full scripts

#### Info Editor
- **Purpose**: Logging of operations and commands
- **Primary Uses**: Script recording, automation discovery, debugging
- **Key Features**: Operation log, command output, scripting reference
- **Availability**: Top of window in some workspaces
- **Utility**: Learn operations you can automate

### Data Editors

**Data Editors** manage assets, properties, and scene information.

#### Outliner
- **Purpose**: Hierarchical scene and data organization
- **Primary Uses**: Object selection, hierarchy viewing, data management
- **Key Features**: Tree view, selective hiding, data filtering
- **Availability**: Properties workspace usually
- **Central**: Critical for scene organization

#### Properties Editor
- **Purpose**: Detailed property editing and configuration
- **Primary Uses**: Object properties, material settings, render settings
- **Key Features**: Panel-based properties, material/shader settings
- **Availability**: Always visible in most workspaces
- **Context-Sensitive**: Shows different options based on selection

#### File Browser
- **Purpose**: File system navigation and file operations
- **Primary Uses**: Opening/saving files, asset management
- **Key Features**: File tree, preview panel, filters
- **Availability**: Modal dialog for file operations
- **Core**: Essential for project management

#### Asset Browser
- **Purpose**: Asset library viewing and management
- **Primary Uses**: Asset organization, reuse, cataloging
- **Key Features**: Asset libraries, preview, metadata
- **Availability**: Assets workspace
- **Modern**: Central to modern asset workflows

#### Spreadsheet
- **Purpose**: Data viewing in tabular format
- **Primary Uses**: Geometry data inspection, attribute viewing
- **Key Features**: Table display, attribute visualization, filtering
- **Availability**: Geometry editing workspace
- **Diagnostic**: Useful for debugging geometry data

#### Preferences
- **Purpose**: Application settings and configuration
- **Primary Uses**: Interface customization, add-on management, shortcuts
- **Key Features**: Theme, input, add-ons, workspaces
- **Availability**: Edit > Preferences menu
- **Customization**: Personalize entire Blender experience

---

## Editor Interface Standards

All editors share common interface elements and behaviors.

### Editor Header

**Location**: Top of each editor area

**Components**:
- **Editor Type Selector**: Left side, shows current editor type
- **Menus**: Mode/context-specific menus
- **Options**: Display and filter options
- **Controls**: Playback, render, and mode controls
- **Search**: Quick access to commands and settings

### Editor Regions

Each editor can have multiple regions:

#### Main Region
- Primary content display area
- Where most interaction occurs
- Scales with area size

#### Header Region
- Top bar with menus and controls
- Always visible
- Contains editor type selector

#### Sidebar Region (Optional)
- Right side panel
- Contains tool options and properties
- Can be toggled on/off
- Customizable panels and tabs

#### Tool Shelf Region (Optional)
- Left side panel (in some editors)
- Tool options and settings
- Common in viewport and painting editors

#### Footer/Status Bar
- Bottom information display
- Status messages and statistics
- Context-sensitive information

### Customizing Editors

**Opening New Editor**:
1. Click editor type selector
2. Choose editor from list
3. New editor opens in place of current

**Changing Editor Type**:
1. Click type selector
2. Select new editor type
3. Area switches to new editor

**Resizing Areas**:
1. Hover over area border
2. Cursor changes to resize indicator
3. Drag to resize
4. Adjust multiple areas simultaneously

**Creating New Areas**:
1. Right-click area border
2. Select "Split Area"
3. Drag to define split point
4. Creates two areas from one

**Saving Layouts**:
1. Arrange editors as desired
2. Top menu: "+" button next to workspace tabs
3. Save current layout as new workspace
4. Workspaces persist between sessions

---

## Editor Selection Workflow

Choosing which editors to display depends on current task.

### Modeling Workflow
```
Typical Setup:
┌─────────────────────────────────────────┐
│ 3D Viewport          │ Properties Panel  │
│                      ├──────────────────┤
│                      │ Outliner/Assets  │
├─────────────────────────────────────────┤
│ Shader Editor (if texturing)             │
└─────────────────────────────────────────┘
```

### Animation Workflow
```
Typical Setup:
┌─────────────────────────────────────────┐
│ 3D Viewport          │ Properties Panel  │
├─────────────────────────────────────────┤
│ Timeline                                 │
├─────────────────────────────────────────┤
│ Graph Editor / Dope Sheet                │
└─────────────────────────────────────────┘
```

### Shading Workflow
```
Typical Setup:
┌─────────────────────────────────────────┐
│ 3D Viewport (Preview) │ Shader Editor    │
├─────────────────────────────────────────┤
│ Image Editor / UV Editor                 │
└─────────────────────────────────────────┘
```

### Compositing Workflow
```
Typical Setup:
┌─────────────────────────────────────────┐
│ Compositor Node Editor                  │
├─────────────────────────────────────────┤
│ Image Editor (Composited Result)         │
└─────────────────────────────────────────┘
```

### Scripting Workflow
```
Typical Setup:
┌─────────────────────────────────────────┐
│ Text Editor          │ Python Console    │
├─────────────────────────────────────────┤
│ Info Editor                              │
│ (logs operations for reference)          │
└─────────────────────────────────────────┘
```

---

## Editor Availability by Mode

Not all editors are available in all modes. Certain editing modes restrict available editors to relevant ones.

### Object Mode
- All editors available
- 3D Viewport shows objects
- Full feature access

### Edit Mode
- 3D Viewport changes to show mesh/curve/etc detail
- UV Editor becomes available (meshes)
- Geometry Node Editor available
- Some shader options limited

### Sculpt Mode
- 3D Viewport optimized for sculpting
- Brush settings visible
- Simplified property display
- Focus on sculpting tools

### Pose Mode
- 3D Viewport shows armature
- Pose tool properties visible
- Animation-related editors available
- Bone properties prominent

### Paint Modes
- Image Editor becomes primary
- 3D Viewport shows painted result
- Brush properties visible
- Texture painting tools active

### Other Modes
- Each mode shows relevant editors
- Context-sensitive interface
- Tool-specific panels available

---

## Workspace Concepts

**Workspaces** are saved editor configurations optimized for specific tasks.

### Default Workspaces

**Layout**: General modeling workspace
- 3D Viewport, Properties, Outliner, Shader Editor

**Modeling**: Mesh editing focused
- 3D Viewport primary, modifier properties visible

**Sculpting**: Sculpt mode optimized
- 3D Viewport, brush settings, asset browser

**UV Editing**: UV unwrapping focused
- 3D Viewport, UV Editor, Image Editor combined

**Texture Paint**: Painting on 3D models
- 3D Viewport, Image Editor, brush properties

**Shading**: Material creation focused
- 3D Viewport (preview), Shader Editor, Material Properties

**Animation**: Keyframe animation optimized
- 3D Viewport, Timeline, Graph/Dope Sheet, Properties

**Rendering**: Render setup focused
- 3D Viewport (render preview), Properties, Compositor

**Compositing**: Post-processing workflow
- Compositor, Image Editor, Properties

**Scripting**: Python development
- Text Editor, Python Console, Info Editor

### Custom Workspaces

Create custom workspace for specific needs:

1. Arrange editors as desired
2. Click workspace tabs at top
3. Click "+" button to create new workspace
4. Name workspace
5. Configure and save
6. Workspace persists across sessions

---

## Best Practices

### Organizing Editors

**Task-Specific Arrangement**:
- Dedicate workspaces to specific tasks
- Keep related editors visible together
- Minimize switching between workspaces
- Use consistent naming for custom workspaces

**Multi-Monitor Setup**:
- Use full screen for high-resolution editors
- Secondary monitor for reference materials
- Arrange by priority of use
- Optimize for eye movement

**Keyboard Navigation**:
- Use Tab to switch between editors if in same area
- Customize shortcuts for workspace switching
- Quick access to frequently used editors
- Reduce mouse movement

### Efficiency Tips

**Minimize Editor Switching**:
- Arrange needed editors visible before starting task
- Close unused editors to reduce clutter
- Use subdivided areas to see multiple views
- Drag editors to reposition rather than creating new

**Use Overlays Strategically**:
- Hide information not needed for current task
- Use viewport overlays to show/hide guides
- Reduce visual clutter
- Focus on relevant data

**Take Advantage of Context**:
- Properties panel changes based on selection
- Outliner highlights active object
- Header shows context-sensitive tools
- Layout adapts to current mode

---

## Related Documentation

Learn more about specific editors:

- **[3D Viewport](BLENDER_UI_3D_VIEWPORT.md)**: Comprehensive 3D Viewport guide
- **[Nodes Overview](BLENDER_UI_NODES.md)**: Node-based editors concepts
- **[Shader Editor](BLENDER_UI_SHADER_EDITOR.md)**: Material creation (planned)
- **[Geometry Node Editor](BLENDER_UI_GEOMETRY_NODE_EDITOR.md)**: Procedural modeling (planned)
- **[UV Editor](BLENDER_UI_UV_EDITOR.md)**: Texture coordinate editing (planned)
- **[Properties Editor](BLENDER_UI_PROPERTIES_EDITOR.md)**: Object properties (planned)
- **[Outliner](BLENDER_UI_OUTLINER.md)**: Scene hierarchy (planned)
- **[Timeline](BLENDER_UI_TIMELINE.md)**: Animation timing (planned)
- **[Graph Editor](BLENDER_UI_GRAPH_EDITOR.md)**: Motion curves (planned)

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Beginner  
**Typical Use**: Editor navigation, workspace setup, interface organization
