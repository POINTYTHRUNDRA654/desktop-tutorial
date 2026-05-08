# Blender UI: Viewport Controls and Advanced Features

## Overview

Beyond basic viewport navigation and selection, Blender provides powerful controls for precise object manipulation and sophisticated viewing options. These advanced viewport features include camera view systems, transform controls (orientation and pivot points), snapping tools, proportional editing, view regions, and 3D cursor positioning. Mastering these controls enables efficient and precise 3D work across all editing tasks.

### Key Advanced Viewport Features

- **Camera View**: Visualize and compose through active camera
- **Transform Controls**: Multiple orientation and pivot point options
- **Snapping System**: Precise alignment and placement
- **Proportional Editing**: Smooth, organic deformations
- **View Regions**: Clipping and render region management
- **3D Cursor**: Flexible positioning and orientation tool
- **Contextual Views**: Multi-viewport simultaneous viewing
- **Camera Navigation**: Lock view to camera movement

---

## Camera View

The **Camera View** shows the 3D scene from the active camera's perspective. It provides exact visual composition preview of what will be rendered, including camera bounds, aspect ratio, and depth-of-field visualization.

### Accessing Camera View

#### Switching to Camera View

**Hotkey**: Numpad 0

**Menu**: View > Cameras > Active Camera or View > Viewpoint > Camera

**Effect**: Viewport switches to show scene through active camera

**Visual Indicators**:
- Dashed frame shows camera boundaries
- Safe area guides visible (if enabled)
- Depth-of-field effect shown (if enabled)
- Rendered view matches final output

### Viewing Through Active Camera

**Setting Active Camera**:
1. Select camera object in Object Mode
2. Press Ctrl-Numpad 0 (or View > Cameras > Set Active Object as Camera)
3. Viewport switches to camera view
4. Selected camera becomes render camera

**Multiple Cameras**:
- Scene can contain multiple camera objects
- Only active camera is used for rendering
- Switch active camera to change render viewpoint
- Can animate camera switching for jump cuts

**Selecting Camera in View**:
- Click dashed frame border to select camera
- Useful if camera isn't directly visible
- Requires camera object not to be hidden

### Camera Frame Display

**Dashed Frame**: Indicates camera boundaries and aspect ratio

**Safe Area Guides** (optional):
- Title safe area: 90% of frame
- Action safe area: 80% of frame
- Useful for broadcasts and productions
- Toggle in viewport overlays

**Depth of Field Preview** (if enabled):
- Out-of-focus areas visible in Material Preview/Rendered
- Shows focus distance effect
- Real-time feedback on camera DOF

### Frame Camera Bounds

**Hotkey**: Home (when in camera view)

**Menu**: View > Cameras > Frame Camera Bounds

**Effect**: 
- Centers camera frame in viewport
- Resizes viewport to fit camera bounds
- Useful for fitting camera view in split viewport

### Zoom Camera 1:1

**Menu**: View > Navigation > Zoom Camera 1:1

**Purpose**: Display camera frame at exact output resolution

**Use Cases**:
- Preview exact pixel size
- Check text and UI readability
- Verify detail level for rendering
- Ensure element sizes match intent

### Camera Navigation Methods

#### Align Active Camera to View

**Hotkey**: Ctrl-Alt-Numpad 0

**Menu**: View > Align View > Align Active Camera to View

**Effect**: 
- Camera moves and rotates to match current viewport view
- Useful for positioning camera through viewport navigation
- Then lock camera to view for continued positioning

#### Lock Camera to View

**Location**: Sidebar > View > Lock Camera to View

**Effect**: Camera becomes "glued" to viewport navigation

**Workflow**:
1. Switch to camera view (Numpad 0)
2. Enable "Lock Camera to View"
3. Navigate viewport (orbit, pan, zoom)
4. Camera follows viewport movement
5. Disable lock when positioning complete

**Advantages**:
- Intuitive camera positioning through standard navigation
- Real-time preview of framing
- Works like first-person camera control

### Camera Transform Operations

When camera is selected, standard transform tools apply.

#### Roll

**Purpose**: Rotate camera around viewing axis (tilt left/right).

**Hotkey**: R (rotate mode)

**Procedure**:
1. Select camera
2. Switch to camera view
3. Press R to enter rotate mode
4. Press Z to constrain to Z-axis (roll)
5. Move mouse to roll camera
6. Click to confirm

**Use**: Straighten horizon line or create artistic tilts

#### Vertical Pan (Pitch)

**Purpose**: Rotate camera up/down (look up/down).

**Hotkey**: R then X (twice: first for global, second for local)

**Procedure**:
1. Select camera
2. Press R to enter rotate mode
3. Press X twice to lock to local X-axis
4. Move mouse up/down
5. Click to confirm

#### Horizontal Pan (Yaw)

**Purpose**: Rotate camera left/right (look left/right).

**Hotkey**: R then Y (twice)

**Procedure**:
1. Select camera
2. Press R to enter rotate mode
3. Press Y twice to lock to local Y-axis
4. Move mouse left/right
5. Click to confirm

#### Dolly

**Purpose**: Move camera forward/backward in view direction.

**Hotkey**: G then Z (or G then MMB)

**Procedure**:
1. Select camera
2. Press G to enter move mode
3. Press Z to constrain to Z-axis (forward/back)
4. Move mouse forward/back
5. Click to confirm

**Use**: Adjust depth into scene without changing angle

#### Sideways Tracking

**Purpose**: Move camera left/right or up/down perpendicular to view.

**Hotkey**: G then X (or Y, or MMB drag)

**Procedure**:
1. Select camera
2. Press G to enter move mode
3. Press X or Y for specific direction
4. Move mouse
5. Click to confirm

**Use**: Recompose shot by panning across scene

### Animated Camera Switching

Create multiple cameras and switch between them in animation.

**Workflow**:
1. Create multiple camera objects
2. Position each camera for different shot
3. Set one as active (Ctrl-Numpad 0)
4. In animation, create keyframes changing active camera at specific frames
5. During animation, camera switches at designated times
6. Useful for jump cuts and multiple viewpoints

---

## View Regions

View regions allow limiting viewport display and editing to specific areas, useful for focused work on large/complex scenes.

### Clipping Region

**Purpose**: Limit viewport display to portion of 3D space; hide geometry outside clipping volume.

**Access**: View > View Regions > Clipping Region or Alt-B

**Usage**:
1. Press Alt-B to activate clipping tool
2. Crosshair cursor appears
3. Click and drag to define rectangular region
4. Clipping volume created; only contents visible
5. All tools (paint, sculpt, select, transform) work within clipping volume only
6. Press Alt-B again to disable clipping

**Clipping Volume Shape**:
- **Orthographic view**: Right-angled parallelepiped (infinite length)
- **Perspective view**: Rectangular pyramid (infinite height)

**Use Cases**:
- Working on specific area of large model
- Hiding surrounding geometry for clarity
- Improving viewport performance in complex scenes
- Focusing attention on detail area
- Preventing accidental selection of outer geometry

**Important**:
- Geometry outside clipping bounds is completely hidden
- Selection, snapping, and editing tools ignore clipped geometry
- Press Alt-B to restore full view

### Render Region

**Purpose**: Limit rendering and viewport rendering to 2D rectangular area.

**Access**: View > View Regions > Render Region (Mark: Ctrl-B, Clear: Ctrl-Alt-B)

**Usage**:
1. Press Ctrl-B to mark render region
2. Click and drag to define rectangular area
3. Only marked region renders
4. Press Ctrl-Alt-B to clear render region

**Two Contexts**:

**In Camera View**:
- Applies to viewport AND final render
- Useful for quick test renders of specific area
- Temporary: Disable in Output properties rather than clearing

**In Non-Camera View**:
- Applies to viewport only (Material Preview/Rendered shading)
- Final render unaffected
- Useful for testing small area in rendered viewport
- Temporary: Disable in Sidebar rather than clearing

**Render Engines**:
- **Cycles**: Respects render regions in viewport
- **EEVEE**: Render regions only affect final render, not viewport

**Use Cases**:
- Quick test render of specific area
- Speed up iteration on detail
- Check material in specific lighting
- Reduce render time during testing
- Avoid re-rendering entire frame during tweaks

### Contextual Views

#### Quad View

**Purpose**: Simultaneously view scene from four viewpoints.

**Access**: View > Area > Toggle Quad View or Ctrl-Alt-Q

**Layout**:
- Three orthographic views: Top (Numpad 7), Front (Numpad 1), Right (Numpad 3)
- One user perspective view (main editing view)
- All four views are part of single viewport
- Share same display options and shading mode

**Difference from Manual Splitting**:
- Not same as manually splitting viewport into four areas
- Quad view is special linked configuration
- Views maintain relationships automatically
- Designed for modeling workflow

**Quad View Options**:

**Lock Rotation**:
- Prevent view orientation changes
- Keeps orthographic views aligned to axes
- Maintains perspective relationship

**Sync Zoom/Pan** (requires Lock Rotation):
- Side views zoom/pan together
- Maintains consistency across views
- Useful for coordinated editing

**Clip Contents**:
- Clip objects based on visibility in other views
- Hide what's out of frame in other views
- Focuses workspace on visible geometry
- Useful for orthogonal reference

**Use Cases**:
- Precise modeling from multiple viewpoints
- Orthogonal reference while working in perspective
- Character modeling and rigging
- Technical modeling requiring multiple views
- Precision work needing side/front/top references

---

## 3D Cursor

The **3D Cursor** is a point in 3D space with both location and rotation. It serves multiple purposes: object placement point, transformation pivot point, reference location, and orientation source.

### 3D Cursor Characteristics

**Visual Appearance**:
- Red and white concentric circles
- Crosshair in center
- Visible orientation gizmo when active

**Properties**:
- Location: XYZ position in 3D space
- Rotation: Euler angles or Quaternion
- Independent per viewport (in local view)
- Global by default (shared across viewports)

### 3D Cursor Placement Methods

#### Direct Mouse Placement

**Hotkey**: Shift-RMB (any tool active) or use dedicated Cursor tool

**Method 1: Shortcut**:
1. Press Shift-RMB at desired location
2. Cursor moves to clicked point
3. Cursor aligns to view orientation

**Method 2: Dedicated Cursor Tool**:
1. Select Cursor tool from toolbar (or press C)
2. Click location in viewport with LMB
3. Cursor moves to click point
4. Tool settings allow orientation options

**Accuracy Tips**:
- Use two perpendicular orthogonal views
- Position in one view (e.g., top)
- Check depth in perpendicular view (e.g., front)
- Allows precise XYZ positioning

**Cursor Orientation Options** (in Cursor tool):
- **View**: Align to viewport orientation
- **Surface Normal**: Align to geometry surface normal (if available)
- **Transform Orientation**: Use current transform orientation

**Surface Projection**:
- By default: Projects cursor to geometry surface depth
- Disable "Cursor Surface Project" in Preferences for absolute placement
- Useful for placing cursor on object surface

#### Sidebar Input

**Location**: Sidebar > View > 3D Cursor

**Method**:
1. Open Sidebar (N key)
2. Go to View tab
3. Locate 3D Cursor panel
4. Enter XYZ values directly
5. Press Enter to confirm

**Advantages**:
- Precise numeric input
- Useful for exact placement
- Can set all three axes simultaneously

**Input Fields**:
- **Location X, Y, Z**: Position values
- **Rotation X, Y, Z**: Rotation angles (Euler)
- **Rotation Order**: XYZ, XZY, YXZ, YZX, ZXY, ZYX

#### Snap Menu

**Hotkey**: Shift-S (various options)

**Menu**: Object/Mesh > Snap > Cursor to ...

**Options**:
- **Cursor to World Origin**: Center cursor at scene origin (0, 0, 0)
- **Cursor to Selected**: Move cursor to center of selection
- **Cursor to Active**: Move cursor to active object's origin
- **Cursor to Median Point**: Move cursor to average location of selection

**Use Cases**:
- Quick placement at common reference points
- Aligning cursor to selection for pivot point usage
- Resetting cursor to origin

### 3D Cursor as Transform Pivot

**Pivot Point Selection**: Period (.) key

**As Pivot Point**:
1. Position 3D Cursor at desired rotation/scale center
2. Select Pivot Point: 3D Cursor
3. Select objects to transform
4. Transform (R, G, S) rotates/scales around cursor
5. Useful for rotating multiple objects around common point

**Typical Workflow**:
1. Shift-RMB to place cursor at rotation center
2. Change Pivot Point to "3D Cursor"
3. Select objects
4. R (rotate) rotates around cursor point
5. Very useful for machinery, wheels, orbital motion

### 3D Cursor Rotation

**Setting Rotation**:
- Sidebar panel shows rotation values
- Can enter Euler angles directly
- Or use transform tools on cursor itself

**Using Cursor Orientation**:
- Select Cursor as Transform Orientation
- Gizmo aligns to cursor rotation
- Useful for aligning transforms to cursor angle

---

## Transform Controls

Transform controls determine how objects and geometry move, rotate, and scale.

### Transform Orientation

**Purpose**: Determines which axes the transform gizmo aligns to.

**Access**: Header or Comma key to change

**Impact**: Affects rotation of gizmo and axis-constrained movement

#### Orientation Types

**Global**:
- Align to world coordinate system
- X (red), Y (green), Z (blue) axes
- Unchanging regardless of object rotation
- Default orientation
- Best for: World-aligned work, broad positioning

**Local**:
- Align to active object's local axes
- Follows object's rotation
- Gizmo rotates when object rotates
- Enables moving/scaling along object's own axes
- Best for: Object-centric operations, aligned to object direction

**Normal** (Edit Mode):
- Align to average normal of selected elements
- Z-axis points along surface normal
- Useful for face-perpendicular operations
- In Object Mode: Equivalent to Local
- Best for: Modeling, extruding perpendicular to surface

**Gimbal**:
- Visualize Euler rotation behavior
- Rotation axes don't stay perpendicular
- Shows gimbal lock phenomenon
- For Euler rotation modes only
- Best for: Understanding rotation problems, debugging gimbal lock

**View**:
- Align to current viewport orientation
- X: Left/Right, Y: Up/Down, Z: Into/Out of screen
- Changes as viewport is orbited
- Best for: Screen-relative operations, 2.5D adjustments

**Cursor**:
- Align to 3D cursor orientation
- Gizmo rotates with cursor
- Follow cursor rotation for custom orientations
- Best for: Using cursor as custom orientation reference

**Parent**:
- Align to parent object's orientation
- Only available for objects with parents
- Useful for hierarchical relationships
- Best for: Complex hierarchies, relative positioning

#### Cycling Between Orientations

**Quick Switch**: While transforming, press axis key twice
- Example: G (move) > X (global X) > X (local X)
- Cycles between orientations on same axis
- Useful for quick orientation change during transform

**Hotkey**: Comma to open orientation selector

#### Custom Orientations

**Creating Custom Orientation**:
1. Select object or mesh elements
2. Open Transform Orientation panel (header)
3. Click "+" to create orientation
4. Set name (derived from selection by default)
5. Options panel appears:
   - **Name**: Custom name for orientation
   - **Use View**: Align to view space
   - **Use After Creation**: Keep selected after creating
   - **Overwrite Previous**: Overwrite if name exists

**From Objects**: Uses object's local orientation

**From Mesh Elements**: Uses average normal of selected geometry

**Managing Orientations**:
- Select in dropdown to use
- Delete with × button to remove
- Rename by double-clicking name

**Use Cases**:
- Edge-aligned modeling: Create orientation from edge
- Face-aligned operations: Create from face
- Object-relative work: Create from reference object
- Complex modeling: Multiple custom orientations per project

### Transform Pivot Point

**Purpose**: Determines center point for rotation and scaling operations.

**Access**: Period key or header selector

**Impact**: Changes where gizmo appears and where transformations occur

#### Pivot Point Types

**Bounding Box Center**:
- Center of bounding box around selection
- Bounding box aligned to world axes (not rotated)
- In Object Mode: Center of origins bounding box (not geometry center)
- In Edit Mode: Center of selected geometry bounds
- Best for: Multiple objects, quick balanced transforms

**3D Cursor**:
- Uses 3D cursor location as pivot
- Position cursor precisely, then transform around it
- Very flexible: position cursor anywhere
- Best for: Precise rotation centers, complex arrangements

**Individual Origins**:
- Each object/element has own pivot point
- Useful when transforming multiple objects
- Each rotates/scales around its own origin
- Best for: Batch operations on similar objects

**Median Point**:
- Average position of selected elements
- Calculates mean location of all selected
- Differs from Bounding Box Center for scattered selections
- Best for: Balanced operations on selection cluster

**Active Element**:
- Uses active object's origin (Object Mode)
- Uses last selected element (Edit Mode)
- Other objects transform around active element
- Best for: Operations centered on specific element

#### Pivot Point Examples

**Single Object Rotation**:
- Bounding Box Center rotates around object center
- Individual Origins rotates around object origin
- 3D Cursor rotates around cursor location

**Multiple Object Rotation**:
- Bounding Box Center: Around center of all origins
- Median Point: Around average position (may differ)
- Individual Origins: Each around its own origin
- Active Element: Around active object's origin

---

## Snapping System

The **Snapping** system enables precise alignment by automatically aligning objects and geometry to nearby reference points.

### Enabling Snapping

**Hotkey**: Shift-Tab (toggle on/off)

**Hold Ctrl During Transform**: Temporarily toggle snapping

**Header**: Snapping icon and options

**Why Snap**:
- Precise vertex-to-vertex alignment
- Align to grid for structured layouts
- Snap to faces for surface placement
- Avoid manual fine-tuning

### Snap Target Types

**Vertex**: Snap to mesh vertices

**Edge**: Snap to mesh edges

**Face**: Snap to face centers

**Volume**: Snap to object volumes/centers

**Edge Perpendicular**: Snap perpendicular to edges

**Combination**:
- Enable multiple snap types simultaneously
- Snaps to whichever is closest
- Useful for flexible snapping

### Snap Source

**Where Snapping Occurs From**:
- **Active Element**: Snap from active vertex/edge/face
- **Median Point**: Snap from selection center
- **Closest Point**: Snap from closest point in selection
- **Center**: Snap from geometry center

**Selection Affects Snapping**: What part of selection is "source"

### Snap Target for Individual Elements

**Node Snapping**: For node editors (covered in node documentation)

**Snap to Face Projection**: Snap to face if projected into view

### Snapping in Different Modes

**Object Mode**:
- Snap object origin to targets
- Volume snapping uses object bounds
- Vertex snapping to other object vertices

**Edit Mode**:
- Snap selected vertices/edges/faces
- Can snap to other geometry in same object
- Can snap to other objects

**Proportion**: Independent from snap targets

### Self-Snapping

Objects can snap to their own geometry (same object):
- Move vertices snap to other vertices
- Extrusions snap to existing edges/vertices
- Useful for precise modeling

### Increment Snapping

**Alternative to Target Snapping**:
- Snap movement to fixed increments (0.1, 1.0 unit)
- Useful when no explicit targets available
- Grid-based layout
- Enable independently from target snapping

---

## Proportional Editing

**Proportional Editing** allows smooth, organic deformations by affecting nearby geometry when transforming selection.

### Enabling Proportional Editing

**Hotkey**: O (toggle on/off)

**Availability**: Edit Mode and Pose Mode

**When Enabled**: Moving selection also deforms nearby unselected geometry

### Proportional Editing Workflow

**Procedure**:
1. Enable proportional editing (O)
2. Select geometry to move
3. Start transform (G, R, or S)
4. Scroll wheel to adjust falloff radius
5. Larger radius = more geometry affected
6. Complete transform (LMB) or cancel (RMB/Esc)

**Radius Adjustment**:
- Scroll wheel increases/decreases radius
- Displayed as circle around cursor
- Adjust while transforming
- Larger radius = smoother, more gradual deformation

### Falloff Profiles

Different falloff shapes affect how influence decreases from center.

**Smooth**:
- Smooth curve falloff
- Most natural transitions
- Default and commonly used
- Good for organic shapes

**Sharp**:
- Abrupt transition at radius edge
- Influences nearby geometry fully, then cuts off
- Creates harder transitions
- Good for precise control

**Linear**:
- Linear falloff from center
- Constant influence decrease
- Less common
- Good for specific effects

**Constant**:
- No falloff; all geometry within radius equally affected
- Treats radius as hard boundary
- Uniform deformation
- Good for mechanical adjustments

**Root**:
- Square root falloff curve
- Gentler than linear
- Slower decrease in influence
- Good for subtle deformations

**Sphere**:
- Spherical distance falloff
- Radial falloff in all directions
- 3D awareness of radius
- Good for point-based deformations

**Invert Square**:
- Inverse square relationship
- Strong falloff near center, weak far
- Concentrated influence
- Good for focused deformations

### Proportional Editing Technique Examples

#### Organic Shape Deformation

**Muscle Bulging When Posing**:
1. Enable proportional editing
2. Select vertices to move
3. Nearby vertices bulge naturally
4. Creates organic muscle/fat deformation
5. No manual adjustment of neighboring geometry

#### Smooth Surface Modifications

**Smoothly Indent Surface**:
1. Select area to deform inward
2. Move inward with proportional editing
3. Nearby surface smoothly transitions
4. No sharp edges or discontinuities

#### Weighted Deformation

**Gradual Tapering**:
1. Select vertices at one end
2. Move with proportional editing
3. Nearby geometry gradually tapers
4. Creates smooth conical shape

### Proportional Editing in Pose Mode

**Bone Deformation**:
- Moving bone affects nearby bones
- Useful for creating organic articulation
- Parent bone influences child bones
- Creates smooth skeletal deformation

---

## Advanced Viewport Techniques

### Technique 1: Precise Camera Composition

Align camera through viewport navigation, then lock for precise final framing.

**Procedure**:
1. Switch to camera view (Numpad 0)
2. Enable "Lock Camera to View"
3. Use Fly Navigation for intuitive camera movement
4. Navigate until composition satisfied
5. Disable lock
6. Use rendered viewport to verify final appearance

**Result**: Camera positioned intuitively with real-time composition preview

### Technique 2: Focused Editing with Clipping

Isolate work area using clipping region for reduced viewport clutter.

**Procedure**:
1. Press Alt-B to activate clipping
2. Define rectangular region around work area
3. Unneeded geometry hidden
4. Work on detail without distraction
5. Press Alt-B again to restore full view

**Result**: Clean, focused viewport with improved performance

### Technique 3: Multi-View Reference Modeling

Use Quad View for simultaneous orthogonal reference while working.

**Procedure**:
1. Press Ctrl-Alt-Q to enable Quad View
2. Position in perspective view (main lower-right)
3. Reference views show from top/front/side
4. Precisely align geometry across views
5. Toggle Clip Contents to hide out-of-frame geometry

**Result**: Precise orthogonal modeling with continuous reference views

### Technique 4: Cursor-Centered Rotation

Use 3D cursor as custom rotation center for complex transforms.

**Procedure**:
1. Shift-RMB to place cursor at rotation center
2. Change Pivot Point to "3D Cursor"
3. Select objects to rotate
4. Press R to rotate
5. Objects rotate around cursor point

**Result**: Multiple objects rotate around custom center without manual arrangement

---

## Best Practices

### Camera Composition

**Effective Framing**:
- Position camera early in workflow
- Use camera view for composition decisions
- Lock camera to view for intuitive positioning
- Render preview regularly during work
- Verify safe areas and aspect ratio

### Transform Precision

**Coordinate System Selection**:
- Local for object-aligned operations
- Global for world-aligned positioning
- Normal for surface-perpendicular work
- Custom for complex hierarchies

**Pivot Point Selection**:
- Choose pivot based on rotation/scale center needed
- 3D Cursor for custom centers
- Active Element for hierarchy-based operations
- Median Point for balanced multi-object transforms

### Snapping Efficiency

**Snap Target Selection**:
- Enable only needed snap types
- Too many targets reduces precision
- Vertex snapping for exact alignment
- Volume snapping for quick rough positioning

**Self-Snapping**:
- Enable for modeling within objects
- Disable when snapping to external targets
- Reduces accidental unwanted snapping

### Proportional Editing Best Practices

**Falloff Selection**:
- Smooth for organic deformations
- Sharp for precise deformation boundaries
- Adapt falloff to desired transition shape

**Radius Control**:
- Start with large radius for overview
- Refine with smaller radius for details
- Adjust during transform for fine-tuning

---

## Related Documentation

Learn more about viewport features:

- **[3D Viewport Overview](BLENDER_UI_3D_VIEWPORT.md)**: Main viewport interface and navigation
- **[Editors Overview](BLENDER_UI_EDITORS.md)**: All editor types and workspace setup
- **[Object Modes](BLENDER_UI_OBJECT_MODES.md)**: Mode-specific editing (planned)
- **[Selection Techniques](BLENDER_UI_SELECTION_TECHNIQUES.md)**: Advanced selection methods (planned)
- **[Camera Settings](BLENDER_UI_CAMERA.md)**: Camera properties and rendering (planned)
- **[Modeling with Snapping](BLENDER_UI_MODELING_PRECISION.md)**: Snapping in modeling workflows (planned)

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Intermediate to Advanced  
**Typical Use**: Precise viewport control, advanced object manipulation, camera composition
