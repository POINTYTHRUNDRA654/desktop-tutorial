# Blender UI: 3D Viewport

## Overview

The **3D Viewport** is the primary editor for interacting with Blender's 3D scene. It's the central hub for modeling, posing, animating, sculpting, texture painting, and nearly all creative work in Blender. The viewport provides spatial visualization, object selection, transformation tools, and real-time feedback for all modifications. Understanding how to navigate, select, and manipulate objects in the 3D Viewport is fundamental to working efficiently in Blender.

### Key Characteristics of the 3D Viewport

- **Primary Interaction Hub**: Center of most Blender workflows
- **Real-Time Feedback**: Immediate visual response to changes
- **Multi-Purpose**: Supports all editing modes (Object, Edit, Sculpt, Paint, etc.)
- **Flexible Viewing**: Numerous navigation and view options
- **Customizable Display**: Various shading modes and overlays
- **Context-Sensitive**: Tools and options change with mode
- **Multi-View Capable**: Can display multiple simultaneous viewports
- **Precision-Focused**: Snapping, grids, and alignment tools available

---

## Viewport Interface

The 3D Viewport consists of several distinct regions, each with specific functions.

### Header Region

The **header** (top bar) contains mode selection, menus, and viewport controls.

#### Mode Selector

**Purpose**: Switch between different editing modes.

**Access**: Dropdown at top-left of header or Ctrl-Tab

**Available Modes**:
- **Object Mode**: Position, rotate, scale objects; default mode
- **Edit Mode**: Modify geometry (vertices, edges, faces)
- **Sculpt Mode**: Organic shape sculpting with brushes
- **Vertex Paint Mode**: Paint vertex colors directly
- **Weight Paint Mode**: Define bone influence weights
- **Texture Paint Mode**: Paint textures on 3D model
- **Particle Edit Mode**: Edit particle systems (hair, etc.)
- **Pose Mode** (armatures): Create character poses
- **Draw Mode** (Grease Pencil): Create 2D strokes in 3D space
- **Sculpt Mode** (Grease Pencil): Deform Grease Pencil strokes

**Mode Switching Shortcuts**:
- Tab: Toggle between Object Mode and Edit Mode
- Ctrl-Tab: Pie menu for quick mode selection
- Direct hotkeys: Varies by mode

**Important**: Not all modes available for all object types (Edit Mode requires editable geometry, Pose Mode requires armature, etc.)

#### Menu Bar

**View Menu**:
- Navigation options (Orbit, Pan, Zoom)
- Alignment and camera controls
- Viewport display options
- Frame selected/all shortcuts

**Select Menu** (varies by mode):
- Object selection tools
- Selection filters
- Group selection operations

**Add Menu** (Shift-A):
- Object creation in Object Mode
- Geometry additions in Edit Mode
- Mode-specific additions available

**Object Menu** (Object Mode):
- Duplication, deletion operations
- Joining, grouping tools
- Transform operations
- Object relationship tools

**Other Menus** (mode-dependent):
- Edit Mode: Edge, Face, Vertex specific menus
- Sculpt Mode: Sculpting tool options
- Paint Modes: Brush and painting options
- Pose Mode: Pose and rig manipulation

#### Transform Controls

**Transform Orientation**:
- **Hotkey**: Comma (,)
- **Options**:
  - Global: World coordinate system (default)
  - Local: Object's local axes
  - Normal: Face normal direction (Edit Mode)
  - Gimbal: Euler rotation representation
  - View: Screen-aligned directions
  - Cursor: 3D cursor orientation
- **Usage**: Changes how transform gizmo rotates
- **Persistent**: Stays selected until changed

**Pivot Point**:
- **Hotkey**: Period (.)
- **Options**:
  - 3D Cursor: Use 3D cursor location (default)
  - Median Point: Center of selected items
  - Active Element: Active object/vertex
  - Individual Origins: Each object's own origin
  - Bounding Box Center: Center of selection bounds
- **Impact**: Determines rotation/scaling center point
- **Context-Sensitive**: Different options in different modes

**Snapping**:
- **Hotkey**: Shift-Tab (toggle on/off)
- **Ctrl**: Hold to toggle snapping temporarily
- **Types**:
  - Vertex snapping: Snap to mesh vertices
  - Edge snapping: Snap to mesh edges
  - Face snapping: Snap to face centers
  - Volume snapping: Snap to object volumes
- **Usage**: Precise alignment of objects and geometry
- **Incremental**: Can snap in steps or continuously

**Proportional Editing**:
- **Hotkey**: O (toggle)
- **Purpose**: Deform nearby geometry when moving selection
- **Falloff Types**: Smooth, Sharp, Linear, Constant, Root, Sphere, Invert Square
- **Radius Control**: Scroll wheel to adjust influence radius
- **Edit Mode Only**: Primarily for geometry manipulation
- **Soft Selection**: Creates smooth deformations

#### Display & Shading

**Object Type Visibility**:
- Toggle visibility of object types (meshes, lights, cameras, etc.)
- Useful for hiding clutter or focusing on specific types
- Affects what's visible in viewport only (not rendering)

**Viewport Gizmos**:
- Control visibility of transform gizmo and navigation aids
- Hide for cleaner viewport when not needed
- Hotkey to toggle main gizmo

**Viewport Overlays**:
- Display/hide UI overlays and guide information
- Options include:
  - Grid floor
  - World axes
  - Text info overlay
  - Cursor visibility
  - Statistics display
- Useful for reference or documentation purposes

**X-Ray Toggle**:
- **Hotkey**: Alt-Z
- **Purpose**: Make entire scene semi-transparent
- **Use**: Select objects hidden behind others
- **Different in Pose Mode**: Shows armature over geometry instead

**Viewport Shading**:
- **Purpose**: Change how scene is displayed visually
- **Options**:
  - Solid: Standard shaded view
  - Material Preview: Shows materials with lighting
  - Rendered: Full render preview (slow but accurate)
- **Affects**: Visual feedback only, not rendering
- **Real-Time**: Changes instantly for quick feedback

### Toolbar Region

The **toolbar** (left side) contains mode-specific tools.

**Tool Selection**:
- Click tools to activate
- Hotkeys for quick access (varies by mode)
- Hover for tooltips showing shortcuts

**Tool Properties**:
- Right panel shows active tool options
- Brush size, strength, falloff, etc.
- Changes based on selected tool

**Tool Categories**:
- **Object Mode**: Move, Rotate, Scale, Transform tools
- **Edit Mode**: Select, Extrude, Bevel, Loop Cut, Knife, etc.
- **Sculpt Mode**: Draw, Grab, Smooth, Crease, Flatten, etc.
- **Paint Modes**: Draw, Clone, Smear, Soften brushes
- **Pose Mode**: Grab, IK Solver, rotation tools

### Sidebar Region

The **sidebar** (right side, toggle with N) contains multiple tabs of information.

**Item Tab**:
- Object properties and transforms
- Transform values (X, Y, Z position/rotation/scale)
- Object name and type
- Direct numeric input for precise transforms

**Tool Tab**:
- Active tool options and settings
- Brush properties (size, strength, falloff)
- Tool-specific parameters
- Changes based on selected tool

**View Tab**:
- Camera properties
- Viewport clipping ranges
- Depth of field settings
- View-specific overlays

### Asset Shelf Region

**Purpose**: Quick access to mode-specific assets.

**Content Varies by Mode**:
- Pose Mode: Saved pose assets
- Sculpt Mode: Brush presets
- Other modes: Relevant quick assets

**Customizable**: Assets can be organized into catalogs

### Footer/Status Bar

**Information Display**:
- Current operation feedback
- Vertex/edge/face count in selection
- Transform values during operations
- Keyboard shortcut hints
- Performance statistics if enabled

---

## Viewport Elements and Layout

The startup scene shows key viewport concepts.

### Startup Scene Components

**Default Scene Contents**:
1. **Cube**: Default mesh object (gray, orange outline = selected)
2. **Camera**: Pyramid shape with triangle, defines render view
3. **Light**: Concentric circles, illuminates the scene
4. **3D Cursor**: Red-white circle with crosshair
5. **Grid Floor**: Gray lines forming floor at Z=0
6. **World Axes**: Red (X), Green (Y) lines at origin

### Object Origin

**Definition**: The precise location point of an object.

**Visibility**:
- Orange dot at object center when selected
- Indicates exact position regardless of geometry
- Different from object's visual center

**Importance**:
- Reference point for transforms
- Rotation pivot point (unless changed)
- Parenting anchor point
- Essential for precision work

### 3D Cursor

**Purpose**: Temporary positioning tool and pivot point.

**Characteristics**:
- Red and white circular target
- Visible crosshair in center
- Custom location independent of objects
- Each viewport has independent cursor location

**Usage**:
- Set placement location for new objects (added at cursor)
- Transform pivot point (if selected as pivot)
- Reference point for alignment operations
- Location memory for returning to specific spot

**Placement**:
- Shift+Click: Move cursor to clicked location
- Shift+C: Center cursor at world origin
- Properties editor: Set exact location

### Grid Floor

**Purpose**: Visual reference for ground level and scale.

**Characteristics**:
- Gray grid lines forming floor at Z=0
- Red X-axis line
- Green Y-axis line
- Recedes into distance

**Customization**:
- Toggle visibility in Viewport Overlays
- Adjust scale in viewport settings
- Change colors in theme settings
- Can be hidden for cleaner view

---

## Object Modes

Blender supports multiple editing modes optimized for different tasks. Each mode changes the interface, tools, and what can be edited.

### Object Mode

**Purpose**: Position, rotate, scale, and manage whole objects.

**Capabilities**:
- Select and deselect objects
- Transform objects (move, rotate, scale)
- Parent/join objects
- Duplicate objects
- Delete objects
- Apply modifiers
- Set properties

**Interface Changes**:
- Header shows Object menu
- Toolbar shows move/rotate/scale tools
- Properties show object settings
- Simpler UI than Edit Mode

**Default**: Object Mode is Blender's starting point

**Selection Display**:
- Selected objects: Orange outline
- Unselected objects: White or gray outline
- Active object: Lighter orange outline

### Edit Mode

**Purpose**: Modify object geometry (vertices, edges, faces).

**Access**: Tab key or Mode selector

**Capabilities**:
- Select/deselect geometry elements
- Move, rotate, scale vertices/edges/faces
- Add/remove geometry (extrude, bevel, delete)
- Create new edges and faces
- Merge vertices
- Modify normals
- Unwrap UVs

**Mesh Types Supported**:
- Meshes: Vertices, edges, faces
- Curves: Control points
- Surfaces: Control points
- Lattices: Control points
- Grease Pencil: Strokes and points

**Selection Modes**:
- Vertex mode (1): Select individual vertices
- Edge mode (2): Select edges
- Face mode (3): Select faces
- Toggle with 1, 2, 3 keys

**Geometry Display**:
- All geometry visible (vertices as dots, edges as lines)
- Selected elements highlighted in orange
- Unselected elements shown in black

**Important**: Cannot see rendered materials in Edit Mode; solid display only

### Sculpt Mode

**Purpose**: Organic shape sculpting with brush-based tools.

**Access**: Mode selector or T then S for quick access

**Capabilities**:
- Brush-based geometry deformation
- Multiple brush types (Draw, Grab, Smooth, etc.)
- Dynamic topology for detail addition
- Remesh options
- Symmetry options

**Mesh Requirements**:
- Requires mesh object
- Works best with subdivided geometry
- Geometry can be sculpted without modifiers
- Creates deformation in real-time

**Brush Properties**:
- Size: Brush radius
- Strength: Brush influence
- Falloff: Influence curve
- Direction: Push/pull operations

### Vertex Paint Mode

**Purpose**: Paint vertex colors directly on mesh.

**Use Cases**:
- Color variation on objects
- Material masking (colors as masks)
- Vertex color animation
- Game asset vertex coloring

**Requirements**:
- Mesh object with vertex colors
- Can paint multiple color layers

**Display**: Painted colors visible on geometry

### Weight Paint Mode

**Purpose**: Assign bone influence weights for rigging.

**Use Cases**:
- Bone deformation control
- Character rigging
- Flexible mesh weighting

**Visualization**:
- Color represents weight (blue = no weight, red = full weight)
- Shows bone influence directly

**Workflow**:
- Select bone in Properties
- Paint weight on mesh
- Adjust influence per vertex

### Texture Paint Mode

**Purpose**: Paint textures directly on 3D model.

**Features**:
- Paint on texture while viewing on model
- Multiple brush types
- Texture projection
- Clone painting

**Requirements**:
- Material with texture
- UV coordinates on mesh
- Active image texture

### Particle Edit Mode

**Purpose**: Edit particle systems (primarily hair).

**Use Cases**:
- Hair styling
- Particle placement
- Hair grooming

**Requirements**:
- Particle system on mesh

### Pose Mode

**Purpose**: Create and adjust character poses using armature.

**Access**: Tab in Pose Mode (from Object Mode with armature selected)

**Capabilities**:
- Rotate bones into poses
- Create keyframes for animation
- Set bone constraints
- Apply IK solvers

**Requirements**:
- Armature (skeleton) object
- Bones with proper setup

**Different from Edit Mode**: Edit Mode modifies bone structure; Pose Mode creates poses

### Grease Pencil Modes

**Draw Mode**: Create 2D strokes in 3D space
**Sculpt Mode**: Deform existing strokes
**Edit Mode**: Modify stroke points and properties
**Vertex Paint Mode**: Paint vertex colors on strokes

---

## Viewport Navigation

Efficient viewport navigation is essential for productive 3D work. Blender offers multiple navigation methods.

### Standard Navigation

#### Orbit

**Purpose**: Rotate view around central point.

**Primary Method**:
- **Hotkey**: Middle Mouse Button (MMB)
- **Action**: Click and drag to rotate
- **Cancel**: RMB
- **Snap to Axis**: Hold Alt while orbiting (aligns view to axis)

**Numpad Shortcuts**:
- Numpad 2 / 8: Rotate up/down
- Numpad 4 / 6: Rotate left/right
- Numpad 9: Rotate 180° around Z-axis

**Alt-Click Behavior**:
- Alt-MMB: Set orbit center point
- Allows pivoting around specific location instead of global center
- Useful for focusing on off-center geometry

**Orbit Preferences**:
- Constant: Orbit speed independent of mouse movement
- Relative: Orbit speed tied to mouse velocity
- Turntable: Different rotation behavior (alternate orbit style)
- Auto-Perspective: Switches to perspective when orbiting

#### Pan

**Purpose**: Move view left/right/up/down without rotating.

**Methods**:
- **Hotkey**: Shift-MMB (click and drag)
- **Numpad**: Ctrl-Numpad 2/4/6/8 for fixed pan steps
- **Wheel**: Shift-Wheel Up/Down for vertical pan, Shift-Wheel Left/Right for horizontal

**Use Cases**:
- Reposition view without changing angle
- Center off-screen geometry
- Move focus without losing orientation

#### Zoom

**Purpose**: Move closer to or further from scene.

**Methods**:
- **Scroll Wheel**: Wheel Up/Down (default)
- **Hotkey**: Ctrl-MMB (click and drag)
- **Numpad**: NumpadPlus/NumpadMinus for fixed steps
- **Zoom Region**: Shift-B (rectangular zoom into region)

**Zoom Region Tool**:
1. Press Shift-B
2. Drag to define rectangle
3. View zooms to fit rectangle
4. Useful for detail work in large scenes

**Limitations**: Zoom only approaches point of interest; doesn't move past it

#### Dolly View

**Purpose**: Move the view toward/away from point of interest, maintaining perspective.

**Access**: Shift-Ctrl-MMB (drag up/down)

**Difference from Zoom**:
- Zoom: Closer look without moving
- Dolly: Actually moves viewpoint forward/backward
- Dolly allows getting arbitrarily close to geometry

**Effect on Projection**:
- Switches orthographic view to perspective automatically
- Preserves perspective feeling of movement

### Advanced Navigation

#### Roll

**Purpose**: Rotate view around viewing direction (tilt left/right).

**Hotkey**: Shift-Numpad 4 (left) / Shift-Numpad 6 (right)

**Use Cases**:
- Correcting tilted view
- Finding optimal working angle
- Aligning view with geometry

**Reset Roll**:
1. Press Numpad 3 to align to X-axis
2. Orbit to perspective view
3. Roll is reset

#### Fly Navigation

**Purpose**: First-person navigation like video games.

**Access**: View > Navigation > Fly Navigation or Shift-Backtick

**Usage**:
1. Move mouse outside center rectangle
2. View rotates toward mouse
3. Use W/A/S/D to move forward/back/left/right
4. Use E/Q for up/down
5. Click LMB or Spacebar to confirm and exit

**Controls**:
- **W/Up**: Accelerate forward
- **S/Down**: Accelerate backward
- **A/Left**: Accelerate left
- **D/Right**: Accelerate right
- **E**: Accelerate upward
- **Q**: Accelerate downward
- **Alt**: Slow down until stop
- **Ctrl**: Disable rotation (fly past while keeping object centered)
- **Wheel Up/Down**: Increase/decrease acceleration
- **X**: Toggle X-axis correction (pitch to horizon)
- **Z**: Toggle Z-axis correction (roll to upright)

**Use Cases**:
- Navigating large scenes
- Walkthrough animations
- Recording camera movement (with auto-key)

#### Walk Navigation

**Purpose**: First-person walking like pedestrian navigation.

**Access**: View > Navigation > Walk Navigation

**Controls**:
- **W/Up**: Move forward
- **S/Down**: Move backward
- **A/Left**: Strafe left
- **D/Right**: Strafe right
- **E**: Move up (gravity disabled)
- **Q**: Move down (gravity disabled)
- **R**: Move up local
- **F**: Move down local
- **Spacebar**: Jump or teleport to crosshair location
- **Tab**: Toggle gravity
- **V**: Jump (if gravity enabled)
- **Shift**: Speed up
- **Alt**: Slow down
- **Scroll Up/Down**: Increase/decrease speed

**Gravity**:
- When enabled: Affects vertical movement
- Jump height adjustable with Period/Comma
- Realistic walking behavior

### View Framing

#### Frame All

**Purpose**: View entire scene at once.

**Hotkey**: Home

**Effect**: Zooms and centers view to show all objects

**Use**: When lost or zoomed too far in

#### Frame Selected

**Purpose**: View selected object(s) at comfortable size.

**Hotkey**: Numpad Period (.)

**Effect**: Frames selected geometry at good viewing distance

**Use**: Focus on specific object after zooming around

#### Frame Last Stroke

**Purpose**: Return to last brush stroke location (paint modes).

**Hotkey**: Numpad Period (.) in paint modes

**Effect**: Centers view on last painting stroke

### View Alignment

#### Perspective / Orthographic Toggle

**Purpose**: Switch between perspective (realistic) and orthographic (technical) views.

**Hotkey**: Numpad 5

**Perspective**:
- Distant objects smaller (realistic)
- Better for artistic work and animation
- Depth perception obvious
- Default in most workflows

**Orthographic**:
- All objects same size regardless of distance
- Better for precision modeling
- Technical appearance
- Good for plan/elevation views

#### Align to Axis

**Access**: View > Align View or shortcut keys

**Numpad Alignment**:
- Numpad 7: Top view (looking down)
- Numpad 1: Front view
- Numpad 3: Right side view
- Numpad Ctrl+7: Bottom view
- Numpad Ctrl+1: Back view
- Numpad Ctrl+3: Left side view
- Numpad 0: Camera view
- Numpad NumpadPeriod: Cycle through cameras

**Flipped Views**:
- Pressing same numpad key again flips view to opposite side

#### Local View

**Purpose**: Isolate selected object(s); hide everything else.

**Hotkey**: Numpad Slash (/) or regular Slash (/)

**Effect**:
- Only selected objects visible
- Better performance in large scenes
- Focused editing of specific object

**Exit Local View**:
- Numpad Slash again returns to global view

**Remove from Local View**:
- **Hotkey**: Alt-NumpadSlash or Alt-Slash
- Select object and press shortcut
- Object removed from isolated view
- Useful when local view contains unwanted objects

#### Camera View

**Purpose**: View through active camera (renders from this view).

**Access**: Numpad 0 or View menu

**Characteristics**:
- Shows camera frustum (pyramid shape)
- Displays safe areas and guides
- Shows depth of field if enabled
- What you see is what renders

**Navigation in Camera View**:
- Standard navigation works
- Can reposition camera by moving view
- Lock camera to view option available

**Setting Active Camera**:
- Select camera object in Object Mode
- Press Numpad 0 to view through it
- Can have multiple cameras, switch between them

#### Local View (Contextual)

**Per-Viewport Independence**:
- Each viewport has independent local view state
- Can have one viewport showing all objects, another showing selected

---

## Selection and Transformation

The core of 3D work involves selecting and transforming objects and geometry.

### Object Selection (Object Mode)

#### Basic Selection

**Click Selection**:
- **LMB**: Click object to select
- **Shift-LMB**: Add to selection
- **Shift-LMB on selected**: Deselect from selection
- **Alt-LMB**: Toggle selection of object and cycle through overlapping objects

**Select All**:
- **A**: Select all objects
- **Alt-A**: Deselect all
- **Ctrl-A**: No standard binding (varies by configuration)

**Box Select**:
- **B**: Activate box select
- Drag to define rectangular selection area
- Objects touching box are selected
- **Shift-B**: Subtract from selection while box selecting

**Circle Select**:
- **C**: Activate circle select
- Move circle to objects to select
- Scroll wheel changes circle size
- **LMB**: Select, **Shift-LMB**: Deselect

**Lasso Select**:
- **Shift-Click-Drag**: Free-form selection loop
- Objects inside loop are selected
- Good for irregular shapes

#### Selection Filters

**Visibility**:
- By type (meshes, lights, cameras, etc.)
- Hide objects to prevent accidental selection
- Object Type Visibility icon in header

**Outliner Filtering**:
- Use Outliner for precise object selection
- Search for object by name
- See object hierarchy

#### Multi-Object Operations

**Select Multiple for Simultaneous Edit**:
- Select multiple objects
- Tab to enter Edit Mode with all selected
- All selected objects enter Edit Mode simultaneously
- Useful for editing related objects

**Switching Objects Without Changing Mode**:
- Alt-Q: Switch to other object in same mode
- Dot in Outliner: Click to switch objects in current mode
- Keeps active mode even after switching

### Geometry Selection (Edit Mode)

#### Selection Modes

**Vertex Mode**:
- **Hotkey**: 1
- Select individual vertices
- Move/rotate/scale vertices
- Modify geometry point by point

**Edge Mode**:
- **Hotkey**: 2
- Select edges
- Manipulate edge topology
- Edge-based modeling operations

**Face Mode**:
- **Hotkey**: 3
- Select faces
- Useful for face-level operations
- Hollow faces, set materials per face

**Multi-Select Mode**:
- Can switch between modes on-the-fly
- Selections remain across mode changes
- Useful for complex operations

#### Selection Tools in Edit Mode

**Box Select**: B (same as Object Mode)

**Circle Select**: C (same as Object Mode)

**Lasso Select**: Shift-Click and drag

**Select Linked**:
- **Hotkey**: L
- Select all connected geometry
- Useful for selecting continuous surface

**Select Similar**:
- **Hotkey**: Shift-G
- Select geometry similar to selection
- By normal, length, face count, etc.

**Select All**:
- **A**: Select all / Deselect all

#### Selection Modifiers

**Alt-Clicking Edge**:
- Selects entire loop of edges
- Useful for edge loops and subdivisions

**Alt-Clicking Face**:
- Selects all connected faces

**Linked Vertices**:
- Select continuous mesh regions

### Object Transformation

#### Transform Tools

**Move (G)**:
- Press G to enter grab/move mode
- Move mouse to reposition
- Click to confirm, Esc to cancel
- **Axis-Limited**: X, Y, Z for specific axis
- **Plane-Limited**: Shift-X for all but X axis

**Rotate (R)**:
- Press R to enter rotate mode
- Mouse movement determines rotation angle
- **R-R**: Rotate continuously
- **Axis-Limited**: X, Y, Z for specific axis
- **Constrain Angle**: Type number for exact degrees

**Scale (S)**:
- Press S to enter scale mode
- Mouse movement determines scale factor
- **Uniform Scale**: Default (all axes equally)
- **Axis-Limited**: X, Y, Z for specific axis
- **Scale Along Axis**: S-X (scale along specific axis)

#### Numeric Input During Transforms

**Precise Value Entry**:
- During transform, type number
- Value is applied to transform
- Example: G (move mode) → X (X-axis only) → 5 → Enter (move 5 units along X)

**Incremental Input**:
- Type + or - before number for relative change
- Example: S (scale) → 1.5 (scale to 1.5x)

#### Transform Orientation Impact

**Global Orientation**:
- Transforms along world axes

**Local Orientation**:
- Transforms along object's own axes
- Rotations oriented to object direction

**Normal Orientation** (Edit Mode):
- Transforms perpendicular to selected face
- Useful for directional modeling

**Gimbal Orientation**:
- Euler rotation representation
- Shows rotation directly

### Proportional Editing

**Purpose**: Deform nearby geometry when moving selection.

**Activation**: O (toggle on/off)

**Workflow**:
1. Enable proportional editing (O)
2. Select geometry to move
3. Transform as normal (G/R/S)
4. Scroll wheel adjusts influence radius
5. Nearby geometry deforms smoothly

**Falloff Types**:
- Smooth: Smooth falloff curve
- Sharp: Abrupt transition
- Linear: Linear falloff
- Constant: No falloff
- Root: Square root falloff
- Sphere: Spherical falloff
- Invert Square: Inverse relationship

**Use Cases**:
- Organic shape modification
- Smooth deformations
- Muscle bulging when moving limbs

---

## Viewport Display

The viewport offers multiple display modes and options for visualizing your scene.

### Viewport Shading Modes

#### Solid Shading

**Purpose**: Default shaded view showing basic material appearance.

**Characteristics**:
- Shows object colors and basic shading
- Fastest viewport mode
- Good for modeling
- No lighting in scene affects appearance

#### Material Preview

**Purpose**: Show materials with default scene lighting.

**Characteristics**:
- Shows material colors and properties
- Includes basic lighting
- Faster than rendered mode
- Good preview of materials
- HDRIs and world lighting affect appearance

**Options**:
- Ambient occlusion toggle
- Shadow display
- World lighting strength

#### Rendered

**Purpose**: Full real-time render preview.

**Characteristics**:
- Shows final render appearance
- Includes all lighting, shadows, effects
- Slower performance
- Most accurate preview
- Useful for animation preview

**Performance**:
- GPU rendering if available
- Can be slow with complex scenes
- Good for final checking before rendering

### Viewport Overlays

Display and hide helpful reference information.

**Grid Floor**: Ground plane reference grid

**Axes**: World coordinate axes at origin

**Text Info**: Statistics and view information

**Camera**: Show camera frustum and safe areas

**Cursor**: 3D cursor visibility

**Light Rays**: Light source visualization

**Shadows**: Shadow preview (Material Preview/Rendered)

**Depth of Field**: Camera DOF preview

**Wireframe Overlay**: Show geometry wireframe over shading

**Object Type Visibility**: Filter what types display

### Viewport Gizmos

**Transform Gizmo**:
- Red (X-axis), Green (Y-axis), Blue (Z-axis) arrows
- Click arrow to constrain transform to that axis
- Move center circle to move freely
- Click arc to rotate

**Gizmo Options**:
- Enable/disable visibility
- Position: Pivot point location
- Orientation: Based on transform orientation
- Different shapes for different modes

**Navigation Gizmo** (top-right corner):
- Shows current view orientation
- Click axes to align view to axis
- Useful for orientation reference

---

## Practical Workflows

### Workflow 1: Object Modeling Setup

Typical viewport configuration for mesh modeling.

**Setup**:
```
3D Viewport (center focus)
├─ Solid or Material Preview shading
├─ Grid and axes visible
├─ Transform gizmo enabled
└─ Properties sidebar visible
```

**Common Actions**:
1. Add object (Shift-A)
2. Tab to Edit Mode
3. Model geometry using tools
4. Tab back to Object Mode
5. Apply modifiers, set materials

### Workflow 2: Animation Review

Typical viewport setup for animation preview.

**Setup**:
```
3D Viewport (large, center)
├─ Material Preview or Rendered shading
├─ Grid hidden (less visual clutter)
├─ Camera view active (Numpad 0)
├─ Timeline visible (bottom)
└─ Properties sidebar for animation curves
```

**Common Actions**:
1. Playback animation
2. Frame-by-frame review (comma/period)
3. Adjust camera view as needed
4. Check material/lighting appearance

### Workflow 3: Sculpting Session

Typical viewport for sculpting workflow.

**Setup**:
```
3D Viewport (large, maximized)
├─ Material Preview shading
├─ Grid and overlays minimal
├─ Brush properties visible (right panel)
├─ Symmetry enabled if needed
└─ High viewport smoothness
```

**Common Actions**:
1. Select sculpting brush
2. Adjust brush size and strength
3. Sculpt geometry
4. Use smooth brush for cleanup
5. Remesh for topology adjustment

### Workflow 4: Material and Texture Iteration

Viewport setup for material work.

**Setup**:
```
Top: 3D Viewport (Rendered)
├─ Shows final material appearance
├─ Camera view for framing
└─ Lighting visible

Bottom: Shader Editor
├─ Material node editing
└─ Live material updates reflected in viewport
```

**Common Actions**:
1. Create/modify material nodes
2. Immediate feedback in rendered viewport
3. Adjust material properties
4. Evaluate appearance in different lighting

---

## Best Practices

### Efficient Navigation

**Know Your Shortcuts**:
- Tab: Object/Edit mode toggle
- Numpad 7/1/3: Top/Front/Side views
- Numpad 5: Perspective toggle
- Numpad 0: Camera view
- Home: Frame all
- NumpadPeriod: Frame selected

**Reduce Mouse Movement**:
- Keep frequently used shortcuts memorized
- Arrange workspace to minimize reaching
- Use middle mouse button navigation

**Zoom Strategically**:
- Zoom to see detail when needed
- Zoom out to see whole object regularly
- Use Frame Selected for quick refocus

### Viewport Performance

**Large Scene Optimization**:
- Use Local View to focus on specific objects
- Hide unnecessary object types
- Reduce viewport subdivision in objects
- Use lower shading mode if performance poor

**GPU Utilization**:
- Rendered mode uses GPU when available
- Configure GPU in Preferences
- Can significantly speed up viewport

### Selection Best Practices

**Avoid Accidental Selection**:
- Use Outliner for precise selection in complex scenes
- Filter by object type to reduce clutter
- Use circles and box select carefully

**Multi-Select Considerations**:
- Only select objects that need editing
- Deselect regularly to stay focused
- Use Alt-Q to switch objects in same mode

### Transform Accuracy

**Use Numeric Input**:
- Type values during transform for precision
- Better than mouse approximation
- Can enter specific positions/rotations/scales

**Pivot Point Selection**:
- Choose pivot carefully based on task
- 3D Cursor for precise placement
- Median Point for balanced transforms

**Transform Orientation**:
- Local for object-aligned transforms
- Global for world-aligned
- Normal for face-perpendicular operations

---

## Advanced Techniques

### Technique 1: Camera Positioning via Viewport

Precisely position camera through viewport.

**Procedure**:
1. Switch to Camera View (Numpad 0)
2. Enable "Lock Camera to View" in camera properties
3. Navigate viewport (orbit, pan, zoom)
4. Camera follows viewport changes
5. Disable lock when positioning complete

**Result**: Intuitive camera positioning through navigation

### Technique 2: Multi-Viewport Workflow

Use multiple viewports simultaneously.

**Setup**:
1. Subdivide viewport with Tab (hover over area border, drag)
2. Different viewport types (one 3D, one UV, one shader)
3. Changes in one propagate to others
4. Highly efficient for complex tasks

### Technique 3: Walk-Through Animation

Record camera movement as animation.

**Procedure**:
1. Switch to Camera View
2. Enable Auto-Keying
3. Start animation playback
4. Use Fly Navigation to move camera
5. Movement records as camera keyframes
6. Stop playback to finalize

**Result**: Natural camera animation recorded in real-time

### Technique 4: Local View for Focused Work

Isolate object and eliminate viewport clutter.

**Procedure**:
1. Select object(s) to focus on
2. Press Numpad Slash
3. Only selected objects visible
4. Work without distraction
5. Press Numpad Slash again to return

**Result**: Focused editing with better performance

---

## Related Documentation

Learn more about viewport-related topics:

- **[Editors Overview](BLENDER_UI_EDITORS.md)**: All editor types and workspace setup
- **[Viewport Shading Guide](BLENDER_UI_VIEWPORT_SHADING.md)**: Detailed shading mode reference (planned)
- **[Selection and Transform](BLENDER_UI_SELECTION_TRANSFORM.md)**: Advanced selection techniques (planned)
- **[Object Modes](BLENDER_UI_OBJECT_MODES.md)**: Detailed mode reference (planned)
- **[Navigation Techniques](BLENDER_UI_NAVIGATION.md)**: Advanced viewport navigation (planned)
- **[3D Cursor Usage](BLENDER_UI_3D_CURSOR.md)**: Cursor placement and operations (planned)
- **[Camera Setup](BLENDER_UI_CAMERA.md)**: Camera configuration and rendering (planned)
- **[Viewport Optimization](BLENDER_UI_VIEWPORT_PERFORMANCE.md)**: Performance tuning (planned)

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Beginner to Intermediate  
**Typical Use**: Primary 3D modeling and animation workspace
