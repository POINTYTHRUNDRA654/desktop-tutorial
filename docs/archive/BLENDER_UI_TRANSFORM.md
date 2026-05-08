# Blender UI: Transform

## Introduction

Transformations are fundamental operations in Blender that allow you to modify the position, orientation, and size of objects and their components. Every object in a scene can be moved, rotated, and scaled, forming the foundation of 3D modeling, animation, and scene composition.

### What Are Transformations?

Transformations refer to operations that alter the spatial properties of selected objects or mesh elements:

- **Translation (Move)**: Changes the position of elements in 3D space
- **Rotation**: Changes the orientation around one or more axes
- **Scale**: Changes the size or proportions of elements

### Transform Scope

**Object Mode**: Transform entire objects as units
- Location, rotation, and scale apply to the object as a whole
- Some objects have limitations (e.g., scaling a camera doesn't affect render dimensions)
- Changes affect the object's origin point and transform properties

**Edit Mode**: Transform object components
- Move, rotate, or scale vertices, edges, and faces
- Geometry changes relative to the object's origin
- Origin point remains fixed unless explicitly moved

### Mode Switching

- **Tab**: Toggle between Object Mode and Edit Mode
- **Orange wireframe**: Indicates the object is selected and active
- **Yellow outline**: Indicates the active object (when multiple objects are selected)

### Transform Applications

**Basic Transformations**:
- Move (G): Translate position
- Rotate (R): Change orientation
- Scale (S): Modify size

**Advanced Transformations**:
- Mirror: Create symmetrical copies
- Align: Position multiple objects relative to each other
- Snap: Precisely position elements
- Duplicate: Create copies with various linking options
- Join: Merge multiple objects into one

### Transform Context

Transformations are affected by several contextual settings:

- **Transform Orientation**: Defines the axis system (Global, Local, Normal, etc.)
- **Pivot Point**: Determines the center of transformation
- **Snapping**: Controls precision and alignment to grid or geometry
- **Proportional Editing**: Extends influence to nearby geometry

---

## Transform Control

Transform control features provide precise manipulation capabilities beyond basic mouse movement, enabling numeric input, axis constraints, and fine adjustments.

### Control Methods Overview

**Interactive Controls**:
- **Mouse**: Free-form transformation following cursor position
- **Gizmos**: Visual handles for axis-specific transformations
- **Shortcuts**: Keyboard-driven workflow for speed and precision

**Precision Controls**:
- **Numeric Input**: Type exact values during transformation
- **Axis Locking**: Constrain to specific axes or planes
- **Snapping**: Align to grid increments or geometry
- **Fine Control**: Slow down transformation speed for detail work

---

## Numeric Input

Numeric input allows you to specify exact transformation values by typing numbers during a transform operation. This provides mathematical precision beyond what mouse movement can achieve.

### Basic Usage

1. **Initiate transform**: Press G (move), R (rotate), or S (scale)
2. **Type value**: Enter a number to specify magnitude
3. **Confirm**: Press Enter to apply, or Esc to cancel

**Examples**:
- `S 2 Enter`: Scale to 200% (double size)
- `R 45 Enter`: Rotate 45 degrees
- `G 5 Enter`: Move 5 units along default axis

### Value Display

The numbers you type appear in the 3D Viewport footer at the bottom of the screen, showing the current input and resulting transformation values.

### Default Behavior

**Move (G)**:
- By default, moves along the X axis
- Combine with axis keys (X, Y, Z) for other directions

**Rotate (R)**:
- Positive values: Clockwise rotation
- Negative values: Counter-clockwise rotation

**Scale (S)**:
- By default, scales equally on all three axes
- Values > 1: Enlarge
- Values < 1: Shrink
- Negative values: Flip

### Alternative Input Location

You can also enter numeric values in the **Properties region** (N key) after starting a transformation.

---

## Simple Mode

Simple Mode accepts straightforward numeric values with basic mathematical operations.

### Decimals

**Period (.)**:
- Enter decimal values
- Example: `2.5` for 2.5 units

### Negate

**Minus (-)**:
- Negate the entire entered value
- Example: Type `5`, then `-` becomes `-5`
- Reverses direction of transformation

### Inverse (Reciprocal)

**Slash (/)**:
- Calculate reciprocal (1/value) of current number
- Example: `2 /` becomes `0.5` (1/2)
- Example: `20 /` becomes `0.05` (1/20)
- Useful for proportional scaling

### Reset/Cancel

**Backspace**:
- **First press** (after deleting all characters): Reset to initial value
- **Second press**: Cancel numeric input entirely, return to mouse control

### Multi-Axis Input

**Tab / Ctrl+Tab**:
- Enter values for multiple axes sequentially
- Tab: Move to next axis
- Ctrl+Tab: Move to previous axis

**Example - Move 1 unit on all axes**:
```
G 1 Tab 1 Tab 1 Enter
```
This moves the object 1 unit along X, then 1 unit along Y, then 1 unit along Z.

### Non-Number Inputs

Numeric input can be combined with:
- **Axis Locking**: X, Y, Z keys
- **Tool-specific shortcuts**: Like Shift for plane locking
- **Snapping controls**: Ctrl for snap toggling

---

## Advanced Mode

Advanced Mode extends Simple Mode with mathematical expressions, units, and Python operations.

### Activation

**Enable Advanced Mode**:
- `=` or `Numpad *`: Switch to advanced mode

**Return to Simple Mode**:
- `Ctrl+=` or `Ctrl+Numpad *`: Switch back to simple mode

### Features

#### Units

Reference the scene's unit system:
- **cm**: Centimeters
- **"**: Inches
- **deg**: Degrees
- And more based on scene unit settings

**Example**:
```
G 50cm Enter    # Move 50 centimeters
R 90deg Enter   # Rotate 90 degrees
```

#### Mathematical Operations

Use Python mathematical operators:
- **+**: Addition
- **-**: Subtraction
- *****: Multiplication
- **/**: Division
- *****: Exponentiation

**Examples**:
```
S 2+0.5 Enter       # Scale by 2.5
G 10*2 Enter        # Move 20 units
R 360/8 Enter       # Rotate 45 degrees (360/8)
```

#### Mathematical Constants and Functions

Access Python's math module:
- **pi**: π constant (3.14159...)
- **sin, cos, tan**: Trigonometric functions
- **sqrt**: Square root
- **abs**: Absolute value
- And more from Python's `math` module

**Examples**:
```
R pi Enter          # Rotate π radians (180°)
S sqrt(2) Enter     # Scale by √2 (≈1.414)
```

### Control Key Shortcuts in Advanced Mode

In Advanced Mode, hold **Ctrl** to activate Simple Mode shortcuts:
- **Ctrl+-**: Negate value
- **Ctrl+/**: Calculate reciprocal
- Non-number inputs: Still work (axis locks, etc.)

### Advanced Mode Benefits

1. **Precise calculations**: Complex math without external calculator
2. **Unit conversion**: Work in preferred measurement system
3. **Formula-based transforms**: Parametric transformations
4. **Scientific accuracy**: Mathematical constants and functions

---

## Axis Locking

Axis locking constrains transformations to specific axes or planes, restricting movement to one or two dimensions. This provides precise directional control during transformations.

### Visual Feedback

**Locked Axis Display**:
- Brighter color: Locked/active axis
- Normal color: Unlocked axes
- Example: Z axis appears light blue when movement is constrained to Z

### Locking Methods

#### Hotkey Locking

Press axis key after starting transformation:

**Single Axis**:
- **X**: Lock to X axis
- **Y**: Lock to Y axis
- **Z**: Lock to Z axis

**Cycling Behavior**:
1. **First press**: Lock to axis in current Transform Orientation
2. **Second press**: Lock to axis in Global orientation (or Local if already Global)
3. **Third press**: Remove all constraints

**Example Workflow**:
```
G Z      # Move along Z axis (current orientation)
Z        # Move along Global Z axis
Z        # Remove constraint (free movement)
```

#### Mouse Pointer Locking (MMB)

**Interactive axis selection**:
1. Start transformation (G, R, or S)
2. Move mouse in desired direction
3. **Hold MMB**: Lock to the axis you're pointing toward
4. **Release MMB**: Confirm axis choice

**Visual Indicator**:
- Dotted white line: Pointer for axis selection
- Three colored axis lines: Available axes in 3D space
- Highlighted axis: Current selection when MMB is released

**Quick Lock**:
If you've already moved the mouse in a direction, pressing MMB will immediately lock to the closest axis without needing to point.

---

## Axis Locking Types

### Single Axis Locking

**Reference**:
- **Mode**: Object and Edit Modes (move, rotate, scale, extrude)
- **Shortcut**: X, Y, Z or MMB after moving the mouse

Restricts transformation to a single axis, preventing changes along the other two axes.

**Characteristics**:
- One-dimensional movement
- Movement along a line (translation) or around an axis (rotation)
- Perpendicular directions are locked

**Use Cases**:
- Moving objects vertically (Z axis only)
- Rotating around a specific axis
- Scaling in one direction only
- Precise alignment along axis lines

**Example**:
```
G X 5 Enter    # Move 5 units along X axis only
R Z 90 Enter   # Rotate 90° around Z axis only
S Y 2 Enter    # Scale 200% along Y axis only
```

### Plane Locking

**Reference**:
- **Mode**: Object and Edit Modes (move, scale)
- **Shortcut**: Shift+X, Shift+Y, Shift+Z or Shift+MMB after moving the mouse

Restricts transformation to a plane defined by two axes, preventing changes along the third perpendicular axis.

**Characteristics**:
- Two-dimensional movement
- Movement within a flat plane
- One perpendicular direction is locked
- **Does NOT affect rotation** (rotation is always around one axis)

**Use Cases**:
- Moving objects on a floor plane (XY plane)
- Scaling faces flat without height change
- Constraining movement to a wall or surface
- 2D-like manipulation in 3D space

**Plane Lock Controls**:
- **Shift+X**: Lock to YZ plane (no X movement)
- **Shift+Y**: Lock to XZ plane (no Y movement)
- **Shift+Z**: Lock to XY plane (no Z movement)

**Example**:
```
G Shift+Z      # Move in XY plane (no Z movement - stay on floor)
S Shift+X      # Scale in YZ plane (no X scaling)
```

### Rotation Note

For rotation, both axis locking and plane locking have the same effect because rotation is always constrained around a single axis. Trackball rotation (R R) cannot be locked.

---

## Axis Locking Modes

Axis locking behavior depends on the current **Transform Orientation** setting, allowing you to work in different coordinate systems.

### Transform Orientation

The Transform Orientation determines which axis system is used for locking:
- **Global**: World space axes (fixed)
- **Local**: Object's own axes (rotates with object)
- **Normal**: Perpendicular to selected geometry
- **View**: Screen-aligned axes
- **Cursor**: 3D Cursor's orientation
- And more...

**Location**: Transform Orientation selector in 3D Viewport header

### Locking Cycle Behavior

Pressing an axis key multiple times cycles through orientation modes:

1. **First press**: Lock to axis in **current Transform Orientation**
2. **Second press**: Lock to axis in **Global orientation** (or Local if already Global)
3. **Third press**: Remove all constraints

**Example with Normal Orientation Active**:
```
G Z        # Move along Normal's Z axis (perpendicular to surface)
Z          # Move along Global Z axis (world up/down)
Z          # Free movement (no constraints)
```

### Mode Display

The current axis locking mode is displayed in the **3D Viewport header** (left side) during transformation, showing:
- Active axis or plane
- Current orientation system
- Any constraints applied

### Axis Locking Mode Examples

#### Example 1: Global Orientation - Z Axis Lock
- Transform Orientation: Global
- Lock: Z axis (single press)
- Result: Move along world Z axis (vertical)

#### Example 2: Local Orientation - Z Axis Lock
- Transform Orientation: Local
- Lock: Z axis (single press)
- Result: Move along object's own Z axis (may be tilted if object is rotated)

#### Example 3: Vertex Selection - Global Z Lock
- Mode: Edit Mode with vertex selected
- Transform Orientation: Global
- Lock: Z axis
- Result: Vertex moves vertically in world space

#### Example 4: Vertex Selection - Normal Z Lock
- Mode: Edit Mode with vertex selected
- Transform Orientation: Normal
- Lock: Z axis (single press)
- Result: Vertex moves perpendicular to its surface

### Selection Impact

The direction of transformation takes into account the **current selection**:
- **Object Mode**: Object's own orientation
- **Edit Mode**: Selected elements' orientation
- **Multiple elements**: Average or median orientation

### Keyboard Input Compatibility

Using axis locking does NOT prevent numeric input:
```
G Z 5.5 Enter      # Move 5.5 units along Z axis
R X 45 Enter       # Rotate 45° around X axis
S Y 0.5 Enter      # Scale 50% along Y axis
```

You can freely combine axis locks with numeric values for precise, constrained transformations.

---

## Precision Control

Precision controls allow fine-tuned transformations through snapping and speed reduction, enabling exact positioning and careful adjustments.

### Reference

- **Mode**: Object and Edit Modes
- **Shortcut**: Ctrl (snapping), Shift (fine control)

### Control Keys

**Ctrl (Transform Snapping)**:
- Toggles snapping during transformation
- With Increment Snap: Discrete amounts (grid increments, angle steps)
- Snapping mode set in header or by Shift+Tab

**Shift (Fine Control)**:
- Reduces transformation speed to 1/10th
- Provides much finer control
- Mouse movement has less effect on transformation

**Ctrl+Shift (Combined)**:
- Both snapping AND fine control
- Snaps to increments while moving slowly
- Maximum precision for detailed work

### Value Display

The transformation magnitude appears in the **3D Viewport footer**. The display updates in real-time as you hold Ctrl or Shift.

### Releasing Modifiers

Releasing Ctrl or Shift during transformation reverts to normal mode:
- Speed returns to normal
- Snapping toggles off (or on, depending on setting)

### Increment Snap Note

The snapping behaviors described here apply specifically when **Increment Snap** is selected as the snapping mode. Other snapping modes (Vertex, Edge, Face, Volume) will snap to geometry instead.

---

## Precision Usage

### With Hotkeys

1. Press transformation key: G (move), R (rotate), or S (scale)
2. Hold modifier keys: Ctrl, Shift, or Ctrl+Shift
3. Move mouse to transform
4. Release modifier keys to adjust mode
5. Confirm with LMB or Enter

**Examples**:
```
G Ctrl           # Move with snapping
R Shift          # Rotate with fine control
S Ctrl+Shift     # Scale with snapping and fine control
```

### With Transform Gizmo

1. Select gizmo handle (axis arrow, rotation arc, or scale box)
2. Start dragging with mouse
3. While moving, hold Ctrl, Shift, or Ctrl+Shift
4. Precision or snapping activates
5. Release mouse to confirm

### Combined Precision Controls

Precision controls combine with:
- **Axis Locking**: Ctrl+Shift with X/Y/Z keys
- **Numeric Input**: Type values while holding Ctrl or Shift
- **Pivot Points**: Work with any pivot point selection
- **Proportional Editing**: Apply to influence area

**Example Workflow**:
```
G Z Ctrl+Shift 5 Enter
# Move 5 units along Z axis, with grid snapping and fine control
```

---

## Snapping with Increment Snap

When **Increment Snap** is active, Ctrl key enables discrete transformations based on grid increments, angle steps, or scale intervals.

### Move (Translation) Snapping

**Base Behavior**:
- Snap to 1 unit increments
- Units defined by grid spacing (1 Blender unit = 1 meter by default)
- Example: Move from 0.0 to 1.0, 1.0 to 2.0, etc.

**Zoom-Based Increments** (Aligned Views):
At base zoom level:
- **Snap interval**: 1 unit (between light gray grid lines)

Zoom in one level:
- **Snap interval**: 0.1 units (10 subdivisions)

Zoom in further:
- **Snap interval**: 0.01 units (100 subdivisions)

Continue zooming in:
- Snap interval continues to decrease: 0.001, 0.0001, etc.
- Smallest interval depends on zoom limit

Zoom out from base level:
- **Snap interval**: 10 units
- Zoom further out: 100 units, 1000 units, etc.

**Zoom Impact**:
Grid lines become visible at different scales as you zoom. Snapping aligns to the currently visible grid subdivision.

### Rotate Snapping

**Increment**: 5 degrees
- Rotation snaps to 0°, 5°, 10°, 15°, 20°, ..., 355°, 360°
- Applies to all rotation axes
- Full circle: 72 snap positions (360 / 5 = 72)

**Example**:
```
R Ctrl              # Rotate in 5° increments
R Z Ctrl 45 Enter   # Rotate 45° on Z axis (9 snaps: 5° × 9 = 45°)
```

### Scale Snapping

**Increment**: 0.1 units
- Scale snaps to 0.1, 0.2, 0.3, ..., 1.0, 1.1, 1.2, etc.
- Applies to all scale axes
- Example: 0.5 = 50%, 1.5 = 150%, 2.0 = 200%

**Example**:
```
S Ctrl              # Scale in 0.1 increments
S X Ctrl            # Scale along X in 0.1 increments
```

### Alternative Snapping Modes

When snapping mode is set to something other than **Increment** (such as Vertex, Edge, Face, or Volume), holding Ctrl will snap the selection to the **nearest element of that type** instead of increments.

**Snapping Modes**:
- **Vertex**: Snap to nearest vertex
- **Edge**: Snap to nearest edge
- **Face**: Snap to nearest face
- **Volume**: Snap to volume center

**See Also**: Full Snapping documentation for detailed information on geometry-based snapping.

---

## Fine Control (Precision)

**Shift key** enables fine control mode, slowing transformation speed to 1/10th normal rate for precise adjustments.

### Behavior

**Speed Reduction**:
- Normal mode: Large mouse movement = large transformation
- Fine control mode: Large mouse movement = small transformation
- Ratio: 10:1 (mouse moves 10 units, object moves 1 unit)

**Rotation Fine Control**:
- Rotation increments: 0.01 degrees
- Allows micro-adjustments of orientation
- Useful for subtle angle corrections

### Use Cases

**Fine Control Applications**:
1. **Micro-positioning**: Nudging objects by tiny amounts
2. **Subtle rotations**: Fine-tuning angles for perfect alignment
3. **Precise scaling**: Small size adjustments
4. **Detail work**: Working with small objects or tight spaces
5. **Animation keyframes**: Exact positioning for frame-by-frame animation

### Combined with Snapping

**Ctrl+Shift combination** provides:
- **Move**: 0.1 unit increments (fine + snap)
- **Rotate**: 1 degree increments (fine + snap)
- **Scale**: 0.01 unit increments (fine + snap)

This combines the discrete steps of snapping with the slow speed of fine control, offering maximum precision.

---

## Move (Translation)

Move operations change the location of objects or elements in 3D space without affecting rotation or scale.

### Reference

- **Mode**: Object Mode, Edit Mode, Pose Mode
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Move
- **Shortcut**: G (from "Grab")

### Basic Usage

1. **Select object or elements** to move
2. **Press G** to activate Move mode
3. **Move mouse** to translate selection
4. **Confirm** with LMB or Enter, or **cancel** with RMB or Esc

**During transformation**:
- Selection follows mouse pointer
- Movement relative to camera view
- Amount of change displayed in viewport header

### Display Values

The 3D Viewport header shows the translation amount along each axis:
- **X**: Horizontal change
- **Y**: Depth change
- **Z**: Vertical change

Format: `X: 1.234  Y: -0.567  Z: 2.890`

### Mode-Specific Behavior

**Object Mode**:
- Moves the entire object
- Changes object's origin location
- Updates Location properties in Properties panel

**Edit Mode**:
- Moves selected vertices, edges, or faces
- Object origin remains fixed
- Geometry moves relative to origin

**Pose Mode** (Armatures):
- Moves selected bones
- Changes bone positions for animation
- Can be keyframed

### Constrained Movement

Combine Move with axis locking for directional control:

**Single Axis**:
```
G X         # Move along X axis only
G Y         # Move along Y axis only
G Z         # Move along Z axis only
```

**Plane** (two axes, excluding third):
```
G Shift+X   # Move in YZ plane (no X movement)
G Shift+Y   # Move in XZ plane (no Y movement)
G Shift+Z   # Move in XY plane (no Z movement)
```

### Numeric Input

Specify exact distances:
```
G 5 Enter            # Move 5 units (default axis)
G X 3.5 Enter        # Move 3.5 units along X
G Z -2 Enter         # Move -2 units along Z (downward)
```

### Advanced Move Workflows

**Precision Movement**:
```
G Ctrl              # Snap to grid
G Shift             # Fine control (slow)
G Ctrl+Shift        # Snap + fine control
```

**Multi-Axis Input**:
```
G 1 Tab 2 Tab 3 Enter   # Move X:1, Y:2, Z:3
```

---

## Move Options

The Move operation includes several options accessible in the **Adjust Last Operation** panel (F9 or footer panel).

### Move X, Y, Z

**Individual axis values**:
- **Move X**: Distance along X axis
- **Move Y**: Distance along Y axis
- **Move Z**: Distance along Z axis

**Input Methods**:
- Numeric input fields
- Slider controls
- Typing values directly

**Negative Values**:
- Move in opposite direction
- Example: Move Z: -5.0 moves downward

### Orientation

Defines which coordinate system the X, Y, Z values refer to.

**Transform Orientations**:
- **Global**: World space axes (fixed in scene)
- **Local**: Object's own coordinate system
- **Normal**: Perpendicular to selected surface
- **Gimbal**: For rotation gimbal alignment
- **View**: Screen-aligned coordinates
- **Cursor**: Aligned to 3D Cursor's orientation

**Example**:
If Orientation is set to Local and you move +5 on X, the object moves 5 units along its own X axis, which may not be aligned with the world X axis.

**See Also**: Transform Orientations documentation for detailed information.

### Proportional Editing

**When enabled**: The move operation affects nearby geometry with graduated influence.

**Controls**:
- **Proportional Editing toggle**: On/Off
- **Falloff type**: Smooth, Sharp, Linear, Constant, etc.
- **Influence radius**: Size of affected area

**Use Cases**:
- Organic deformations
- Smooth terrain editing
- Creating hills or valleys in meshes
- Soft transformations

**See Also**: BLENDER_UI_PROPORTIONAL_EDITING.md for comprehensive coverage.

---

## Rotate

Rotation changes the orientation of objects or elements around one or more axes or the pivot point.

### Reference

- **Mode**: Object and Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Rotate
- **Shortcut**: R

### Rotation Terminology

- **Spin**: Rotation around vertical axis
- **Twist**: Rotation around longitudinal axis
- **Orbit**: Circular movement around a point
- **Pivot**: Rotation around center point
- **Revolve**: Complete circular rotation
- **Roll**: Banking rotation (aircraft term)

### Basic Usage

1. **Select object or elements** to rotate
2. **Press R** to activate Rotate mode
3. **Move mouse** to rotate around view-normal axis
4. **Confirm** with LMB or Enter, or **cancel** with RMB or Esc

**During transformation**:
- Selection rotates around pivot point
- Rotation follows mouse movement
- Angle displayed in viewport header

### Display Values

The 3D Viewport header shows the rotation angle:
- Format: `Rot: 45.00°` or `Rot: 0.7854 rad` (depending on unit settings)
- Positive values: Clockwise (in most views)
- Negative values: Counter-clockwise

### Axis-Constrained Rotation

Rotate around specific axes:

**Single Axis**:
```
R X         # Rotate around X axis
R Y         # Rotate around Y axis
R Z         # Rotate around Z axis
```

**Example**:
```
R Z 90 Enter    # Rotate 90° around Z axis (vertical)
```

### Numeric Input

Specify exact angles:
```
R 45 Enter          # Rotate 45° around view axis
R X 90 Enter        # Rotate 90° around X axis
R Y -30 Enter       # Rotate -30° around Y axis
```

**Angle Units**:
- Degrees (default): 0 to 360
- Radians: 0 to 2π (if scene units set to radians)

### Rotation Direction

**View-Dependent**:
Rotation direction depends on the view angle and which axis you're rotating around. The right-hand rule applies:
1. Point thumb along positive axis direction
2. Fingers curl in positive rotation direction

---

## Rotate Options

The Rotate operation includes several options accessible in the **Adjust Last Operation** panel.

### Angle

**Rotation amount**:
- Numeric input field
- Range: -∞ to +∞ (wraps at 360° / 2π)
- Units: Degrees or radians (scene setting)

**Input Methods**:
- Direct typing
- Slider control
- Incremental adjustment

### Axis

**Constraint axis selection**:
Restricts rotation to one or more axes:
- **X Axis**: Rotation around X
- **Y Axis**: Rotation around Y
- **Z Axis**: Rotation around Z
- **Multiple**: Can enable multiple axes (uncommon)

**Axis Orientation**:
Depends on current Transform Orientation setting (Global, Local, Normal, etc.).

### Orientation

Defines which coordinate system the rotation axes refer to.

**Transform Orientations**:
- **Global**: World space axes
- **Local**: Object's own axes
- **Normal**: Perpendicular to surface
- **Gimbal**: Matches rotation order for gimbal lock prevention
- **View**: Screen-aligned
- **Cursor**: 3D Cursor's orientation

**Impact**:
When set to Local, rotating around X axis means rotating around the object's local X axis, which may be tilted relative to world space.

### Proportional Editing

**When enabled**: Rotation affects nearby geometry with graduated influence.

**Characteristics**:
- Nearby elements rotate by decreasing amounts
- Falloff determines influence curve
- Radius controls affected area
- Creates smooth, organic rotations

**Use Cases**:
- Twisting cylindrical geometry
- Creating spiral effects
- Organic character deformations
- Smooth surface adjustments

**See Also**: BLENDER_UI_PROPORTIONAL_EDITING.md for detailed coverage.

---

## Trackball Rotation

Trackball rotation is a free-form rotation mode that allows rotation around the view center without axis constraints.

### Reference

- **Mode**: Object and Edit Modes
- **Shortcut**: R R (press R twice)

### Behavior

**Free Rotation**:
- No axis constraints
- Rotates in any direction based on mouse movement
- Simulates rotating a ball with your hand
- Horizontal mouse movement: Rotation around vertical view axis
- Vertical mouse movement: Rotation around horizontal view axis
- Diagonal movement: Combined rotation

**Trackball Metaphor**:
Imagine the selection is attached to a transparent ball. Moving the mouse rotates the ball freely in 3D space, with the selection following along.

### Characteristics

**Unconstrained**:
- Cannot be locked to axes
- Ignores X, Y, Z key presses
- Axis locking has no effect on trackball mode

**Viewport-Dependent**:
- Rotation is relative to current view
- Different views produce different rotation results
- Useful for quick, intuitive adjustments

### Use Cases

1. **Quick orientation changes**: Rapidly reorient objects
2. **Artistic rotation**: Intuitive, natural feel for artistic work
3. **View-based rotation**: When global/local axes aren't relevant
4. **Free exploration**: Try different angles without axis thinking

### Precision Note

Trackball rotation is less precise than axis-constrained rotation. For exact angles, use standard rotation (R) with axis locks and numeric input.

### Exiting Trackball Mode

- **Confirm**: LMB or Enter
- **Cancel**: RMB or Esc
- **Switch to constrained rotation**: Press R again to exit trackball and return to standard rotation

---

## Scale

Scaling changes the size or proportions of objects and elements, enlarging or shrinking them relative to the pivot point.

### Reference

- **Mode**: Object and Edit Modes
- **Menu**: Object/Mesh/Curve/Surface ‣ Transform ‣ Scale
- **Shortcut**: S

### Basic Usage

1. **Select object or elements** to scale
2. **Press S** to activate Scale mode
3. **Move mouse** away from pivot to enlarge, toward pivot to shrink
4. **Confirm** with LMB or Enter, or **cancel** with RMB or Esc

**During transformation**:
- Mouse distance from pivot determines scale factor
- Moving away from pivot: Enlarges (scale > 1.0)
- Moving toward pivot: Shrinks (scale < 1.0)
- Crossing past pivot: Negative scale (flips geometry)

### Scale Behavior

**Uniform Scaling** (default):
- All three axes scale equally
- Maintains proportions
- Example: S 2 = scale to 200% on X, Y, and Z

**Non-Uniform Scaling**:
- Lock to specific axis or plane
- Stretches or compresses in one/two directions
- Example: S Z 2 = scale 200% on Z only (height doubles)

### Display Values

The 3D Viewport header shows scale factors:
- Format: `Scale X: 1.500  Y: 1.500  Z: 1.500`
- Values > 1.0: Enlarging
- Values < 1.0: Shrinking
- Value = 0.0: Collapsed to flat (can cause issues)
- Negative values: Flipped geometry

### Scale Flipping

**Negative Scale**:
When mouse crosses past the pivot point to the opposite side:
- Scale becomes negative
- Geometry flips/mirrors
- Example: Scale -1.0 = 100% size but flipped

**Visual Example** (left to right):
1. Original object (Scale 1.0)
2. Scaled down (Scale 0.5)
3. Scaled up (Scale 2.0)
4. Scale flipped (Scale -1.0)

### Constrained Scaling

**Single Axis**:
```
S X         # Scale along X only
S Y         # Scale along Y only
S Z         # Scale along Z only
```

**Plane** (two axes):
```
S Shift+X   # Scale in YZ plane (no X scaling)
S Shift+Y   # Scale in XZ plane (no Y scaling)
S Shift+Z   # Scale in XY plane (no Z scaling)
```

### Numeric Input

Specify exact scale factors:
```
S 2 Enter           # Scale 200% (double size)
S 0.5 Enter         # Scale 50% (half size)
S X 3 Enter         # Scale 300% along X
S Z 0.1 Enter       # Scale 10% along Z
```

**Scale Factor Interpretation**:
- 1.0 = Original size (100%)
- 2.0 = Double size (200%)
- 0.5 = Half size (50%)
- 0.0 = Collapsed (avoid this)
- -1.0 = Original size but flipped

---

## Scale Options

The Scale operation includes several options accessible in the **Adjust Last Operation** panel.

### Scale X, Y, Z

**Individual axis scale factors**:
- **Scale X**: Scale factor along X axis
- **Scale Y**: Scale factor along Y axis
- **Scale Z**: Scale factor along Z axis

**Default Values**: 1.0 (no change)

**Input Methods**:
- Numeric input fields
- Slider controls
- Direct typing

**Independent Control**:
Set different scale values per axis for non-uniform scaling:
```
Scale X: 2.0    # Double width
Scale Y: 1.0    # Original depth
Scale Z: 0.5    # Half height
Result: Object is wider and shorter
```

### Orientation

Defines which coordinate system the X, Y, Z scale axes refer to.

**Transform Orientations**:
- **Global**: World space axes
- **Local**: Object's own coordinate system
- **Normal**: Perpendicular to surface (Edit Mode)
- **Gimbal**: Gimbal-aligned axes
- **View**: Screen-aligned axes
- **Cursor**: 3D Cursor's orientation

**Impact on Scaling**:
If Orientation is set to **Local**:
- Scaling X/Y/Z affects the object's own axes
- Object's local axes may be rotated relative to world
- Produces skewed results in world space if object is rotated

### Proportional Editing

**When enabled**: Scale affects nearby geometry with graduated influence.

**Behavior**:
- Selected elements scale fully
- Nearby elements scale by decreasing amounts based on distance
- Falloff type determines influence curve
- Radius defines affected area

**Use Cases**:
- Creating bumps or dents in surfaces
- Organic bulging effects
- Smooth transitions in terrain
- Character muscle deformations

**Proportional Scale Characteristics**:
- Maintains mesh connectivity
- Avoids sharp discontinuities
- Creates smooth, natural-looking deformations
- Respects falloff curve shape

**See Also**: BLENDER_UI_PROPORTIONAL_EDITING.md for comprehensive information.

---

## Move/Scale Texture Space

Texture Space transformations modify the bounding box used for texture mapping instead of the object or geometry itself.

### Reference

- **Mode**: Object Mode and Edit Mode
- **Menu**: Object ‣ Transform ‣ Move/Scale Texture Space

### What is Texture Space?

**Texture Space** (also called Generated Coordinates):
- Bounding box surrounding the object
- Used as default UV mapping when no UV coordinates exist
- Defined by minimum and maximum extents of geometry
- Determines how textures are applied

**Purpose**:
- Procedural texture mapping
- Generated texture coordinates
- Automatic UV mapping for non-UV-unwrapped objects

### Move Texture Space

**Effect**:
- Translates the texture space bounding box
- Geometry remains in place
- Textures slide across the surface
- Useful for repositioning procedural textures

**Use Cases**:
1. Adjust texture position without moving object
2. Center textures on geometry
3. Offset procedural patterns
4. Fine-tune automatic UV mapping

### Scale Texture Space

**Effect**:
- Scales the texture space bounding box
- Geometry remains in place
- Textures stretch or compress
- Changes texture repeat/density

**Use Cases**:
1. Make textures larger or smaller on surface
2. Tile textures more or less frequently
3. Adjust texture density
4. Match texture scale between objects

### Texture Space vs. Geometry Transform

**Key Difference**:
- **Normal Transform** (G, R, S): Moves/rotates/scales the object
- **Texture Space Transform**: Moves/scales texture coordinates only

**Visual Result**:
- Object stays in same location
- Texture appears to move or scale on the surface

### Accessing Texture Space Settings

**Properties Panel**:
Properties ‣ Object Properties ‣ Texture Space
- View and edit texture space manually
- Location and Size parameters
- Auto Texture Space toggle

---

## Align to Transform Orientation

This operation rotates selected objects to match the active Transform Orientation, aligning their local axes.

### Reference

- **Mode**: Object Mode and Edit Mode
- **Menu**: Object ‣ Transform ‣ Align to Transform Orientation

### Purpose

**Alignment Goal**:
Rotate objects so their local coordinate system matches the currently active Transform Orientation.

**Common Scenarios**:
1. Align object to world axes (Global orientation)
2. Align object to surface normal (Normal orientation)
3. Align object to view direction (View orientation)
4. Align object to 3D Cursor (Cursor orientation)

### Behavior

**Rotation Application**:
- Calculates rotation difference between object's local orientation and target orientation
- Applies rotation to object
- Visual appearance changes (object rotates in 3D space)
- Object's transform properties updated

**Multiple Objects**:
When multiple objects are selected:
- Each object is rotated independently
- All align to the same target orientation
- Objects may rotate by different amounts

### Transform Orientation Sources

**Available Orientations**:
- **Global**: Align to world X, Y, Z axes
- **Local**: No effect (already in local orientation)
- **Normal**: Align to average normal of selection (Edit Mode)
- **View**: Align to current viewport view direction
- **Cursor**: Align to 3D Cursor's rotation
- **Custom**: Align to user-defined orientation

### Use Cases

1. **Reset rotation to world**: Align to Global orientation
2. **Match surface angle**: Align to Normal in Edit Mode
3. **Face camera**: Align to View orientation
4. **Align to custom rig**: Align to custom orientation

### Adjust Last Operation

Options may appear in the Adjust Last Operation panel:
- Target orientation selection
- Axis mapping options (depending on implementation)

---

## Randomize Transform

Randomize Transform adds random offsets to location, rotation, and scale values of selected objects, useful for creating natural variation.

### Reference

- **Mode**: Object Mode and Edit Mode
- **Menu**: Object ‣ Transform ‣ Randomize Transform

### Purpose

**Variation Creation**:
- Add natural variation to duplicated objects
- Break up artificial repetition
- Create organic distributions
- Simulate natural randomness

**Use Cases**:
1. Forest/vegetation scattering (vary tree positions, rotations, sizes)
2. Rock/debris placement (randomize orientations and scales)
3. Crowd variation (different character positions and rotations)
4. Particle-like distributions without particle system
5. Architectural variation (randomize building details)

### Panel Options

#### Random Seed

**Seed Value**:
- Offset for random number generation
- Same seed = same results (reproducible)
- Different seed = different results
- Integer value

**Purpose**:
- Reproduce specific random distributions
- Try different variations quickly
- Create consistent results across sessions

**Workflow**:
1. Apply randomization
2. If result unsatisfactory, change seed
3. Apply again for new random result
4. Repeat until satisfied

#### Transform Delta

**Toggle**: On/Off

**When Enabled**:
- Randomizes Delta Transform values instead of regular transforms
- Delta transforms are offset values applied on top of base transforms
- Preserves original transform values

**When Disabled** (default):
- Randomizes regular transform properties (Location, Rotation, Scale)
- Original values are replaced

**Use Case**:
Use Delta randomization when you want to preserve keyframed or constraint-driven base transforms while adding variation.

#### Randomize Location

**Toggle**: On/Off

**Location Parameters** (when enabled):
- **X, Y, Z**: Maximum distance each axis can vary
- Independent control per axis
- Values define range: [-X to +X], [-Y to +Y], [-Z to +Z]

**Example**:
```
Location X: 5.0
Location Y: 5.0
Location Z: 0.0
Result: Objects scattered within 5 unit square on XY plane, no vertical variation
```

#### Randomize Rotation

**Toggle**: On/Off

**Rotation Parameters** (when enabled):
- **X, Y, Z**: Maximum angle each axis can vary
- Independent control per axis
- Values define range: [-X to +X], [-Y to +Y], [-Z to +Z]
- Units: Degrees or radians (scene setting)

**Example**:
```
Rotation X: 0°
Rotation Y: 0°
Rotation Z: 360°
Result: Objects randomly rotated around vertical axis only (spinning)
```

#### Randomize Scale

**Toggle**: On/Off

**Scale Parameters** (when enabled):
- **Scale X, Y, Z**: Maximum scale randomization per axis
- **Scale Even**: Toggle for uniform scaling

**Scale Even** (checkbox):
- **Enabled**: Same scale factor on all axes (uniform scaling)
  - One random value used for X, Y, and Z
  - Maintains proportions
  - Objects get larger or smaller but don't stretch
- **Disabled**: Independent scale per axis (non-uniform scaling)
  - Different random values for X, Y, and Z
  - Objects can stretch or compress
  - Creates more variation

**Scale Range**:
Values define maximum deviation from 1.0:
```
Scale: 0.5
Range: 0.5 to 1.5 (1.0 ± 0.5)
Result: 50% to 150% size
```

### Multi-Object Behavior

**Independent Seeds**:
Each selected object receives its own seed value (automatically derived from main seed), ensuring different results per object.

**Example**:
Select 10 cubes, apply randomization → each cube gets unique random transformation, not all the same.

---

## Align Objects

The Align Objects tool positions multiple selected objects relative to each other or to a reference point, lining them up along specified axes.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Transform ‣ Align Objects

### Purpose

**Alignment Goal**:
Distribute and align multiple objects so they line up precisely on one or more axes.

**Use Cases**:
1. Align objects in a row or grid
2. Stack objects vertically
3. Line up architectural elements
4. Create precise layouts
5. Organize scattered objects

### Options

#### High Quality

**Toggle**: On/Off

**When Enabled**:
- Uses more precise mathematical calculations
- Better determines object locations
- Recommended when objects have rotations

**Bounding Box Alignment**:
If any selected objects have rotation transforms (or delta rotations):
- **High Quality Off**: May produce imprecise results
- **High Quality On**: Bounding box calculated precisely for all three global axes

**Performance**:
High Quality mode takes slightly longer but produces better results for rotated objects.

#### Align Mode

**Defines which part of objects to align**:

**Centers**:
- Aligns the object origins
- Objects' center points line up
- Use case: Center alignment, evenly distribute

**Positive Sides**:
- Aligns the positive sides of bounding boxes
- On global axes: right (X+), back (Y+), top (Z+)
- Use case: Align tops, align right edges

**Negative Sides**:
- Aligns the negative sides of bounding boxes
- On global axes: left (X-), front (Y-), bottom (Z-)
- Use case: Align bottoms, align left edges

**Bounding Box Definition**:
The bounding box is the smallest box (aligned to global axes) that completely contains the object. It's defined by minimum and maximum extents on each axis.

#### Relative To

**Defines the reference point for alignment**:

**Active**:
- Aligns to the active object (last selected, yellow outline)
- All other objects move to match active object's position/bounds
- Active object remains stationary

**Selection**:
- Aligns to the median point of all selected objects
- Median = average position
- All objects move to line up at the collective center

**3D Cursor**:
- Aligns to the current 3D Cursor position
- Objects move to line up at cursor location
- Cursor position remains fixed

**Scene Origin**:
- Aligns to the global origin (0, 0, 0)
- Objects move to line up at world center
- Use case: Center objects in world space

#### Align X, Y, Z

**Axis Selection** (checkboxes):
- **Align X**: Align along the X axis (left-right)
- **Align Y**: Align along the Y axis (front-back)
- **Align Z**: Align along the Z axis (up-down)

**Multiple Axes**:
You can enable multiple axes simultaneously:
- **X + Y**: Align in horizontal plane
- **X + Z**: Align in vertical plane facing front
- **Y + Z**: Align in vertical plane facing side
- **X + Y + Z**: Align in all three dimensions (stack at same point)

### Workflow Examples

**Example 1: Stack Objects Vertically**
```
Settings:
- Align Mode: Positive Sides
- Relative To: Active
- Align Z: Enabled (X and Y disabled)
Result: All objects' top surfaces align with active object's top
```

**Example 2: Center Objects at World Origin**
```
Settings:
- Align Mode: Centers
- Relative To: Scene Origin
- Align X, Y, Z: All enabled
Result: All object origins move to (0, 0, 0)
```

**Example 3: Align Left Edges**
```
Settings:
- Align Mode: Negative Sides
- Relative To: Active
- Align X: Enabled (Y and Z disabled)
Result: All objects' left edges align with active object's left edge
```

---

## Mirror

Mirroring flips selected elements across a chosen axis, creating symmetrical copies or inversions of geometry. It's equivalent to scaling by -1 on the selected axis but offers a more intuitive and faster workflow.

### Overview

**Mirror Operation**:
- Flips selection across an axis or plane
- Preserves distances from the mirror plane
- Creates perfect symmetry
- Works in Object Mode, Edit Mode, and Pose Mode

**Mirroring vs. Scaling**:
- Mirror: Intuitive, single-step axis flip
- Scale -1: Same result, but less direct workflow

**Mirroring is Relative To**:
- **Transform Orientation**: Defines axis directions (Global, Local, Normal, etc.)
- **Pivot Point**: Defines the center of symmetry (Median Point, 3D Cursor, Active Element, etc.)

**Control Over Mirroring**:
1. Position the pivot point where you want the center of symmetry
2. Choose a Transform Orientation (Global, Local, Normal, etc.)
3. Select an axis (X, Y, or Z) to mirror across

### Non-Destructive Alternative

For non-destructive mirroring that creates a live, editable mirror effect:
- Use the **Mirror Modifier** (Mesh objects)
- Modifier-based approach maintains editability
- Changes to one side automatically mirror to the other

---

## Interactive Mirror

Interactive Mirror is the primary mirroring tool, allowing you to flip selections interactively with visual feedback.

### Reference

- **Mode**: Object and Edit Modes
- **Menu**: Object/Mesh/Curves ‣ Mirror ‣ Interactive Mirror
- **Shortcut**: Ctrl+M

### Usage

**Method 1: Keyboard (Fastest)**
1. Press **Ctrl+M** to activate Mirror mode
2. Press **X**, **Y**, or **Z** to select mirror axis
3. Press the **same key again** to toggle between current orientation and global
4. Press **Enter** to confirm, or **Esc** to cancel

**Method 2: Mouse (Interactive)**
1. Press **Ctrl+M** to activate Mirror mode
2. **Hold MMB** and drag mouse toward desired mirror direction
3. Visual indicators show three axes in 3D space
4. **Release MMB** on highlighted axis to confirm

**Quick Lock** (Method 2 variant):
- Move mouse in desired direction first
- Press **MMB** (without dragging) to lock to closest axis instantly

### Orientation Cycling

Pressing the same axis key twice cycles the orientation:

**First Press**: Mirror across axis in active Transform Orientation
**Second Press**: Mirror across axis in Global orientation (or Local if already Global)

**Example**:
```
Ctrl+M Z        # Mirror across Z in current orientation (e.g., Local)
Z               # Mirror across Global Z
Z               # Exit mirror mode
```

### Properties

**Orientation**:
The Transform Orientation used to align the X, Y, Z axes for mirroring.

**Available Orientations**:
- Global: World space
- Local: Object's own space
- Normal: Perpendicular to surface (Edit Mode)
- View: Screen-aligned
- Cursor: 3D Cursor's orientation
- Custom: User-defined orientation

**Constraint Axis**:
The axis (or axes) to mirror across.

**Options**:
- X: Mirror horizontally (left/right)
- Y: Mirror in depth (front/back)
- Z: Mirror vertically (up/down)

**Multiple Axes**:
You can enable multiple axes to mirror across multiple planes simultaneously, though this is uncommon.

**Visual Feedback**:
During Interactive Mirror, the viewport displays:
- Dotted white line pointer (when using MMB method)
- Three colored axis lines (red X, green Y, blue Z)
- Highlighted axis on mouse hover

---

## X/Y/Z Global Mirror

These operations perform non-interactive mirroring along global axes with a single menu selection—no additional input required.

### Reference

- **Mode**: Object and Edit Modes
- **Menu**: Object/Mesh/Curves ‣ Mirror ‣ X/Y/Z Global

### Operations

#### X Global

**Mirrors along the global X axis**:
- Left becomes right, right becomes left
- Horizontal flip in world space
- No Y or Z changes

**Use Cases**:
- Mirror objects across world centerline
- Create left/right symmetry
- Flip horizontal layouts

#### Y Global

**Mirrors along the global Y axis**:
- Front becomes back, back becomes front
- Depth flip in world space
- No X or Z changes

**Use Cases**:
- Mirror objects front-to-back
- Flip depth arrangements
- Reverse forward/backward orientation

#### Z Global

**Mirrors along the global Z axis**:
- Top becomes bottom, bottom becomes top
- Vertical flip in world space
- No X or Y changes

**Use Cases**:
- Flip objects upside down
- Create top/bottom symmetry
- Invert vertical arrangements

### Characteristics

**Non-Interactive**:
- Single menu selection
- Immediate execution
- No additional input required
- Cannot be adjusted during operation

**Global Orientation Always**:
- Always uses world space axes
- Ignores current Transform Orientation setting
- Consistent behavior regardless of object rotation

**Pivot Point**:
Mirroring occurs relative to the active pivot point:
- **Median Point**: Mirror around selection's median
- **3D Cursor**: Mirror around cursor position
- **Individual Origins**: Mirror each object around its own origin
- **Active Element**: Mirror around active object/element

---

## X/Y/Z Local Mirror

These operations perform non-interactive mirroring along the object's local axes.

### Reference

- **Mode**: Object and Edit Modes
- **Menu**: Object/Mesh/Curves ‣ Mirror ‣ X/Y/Z Local

### Operations

#### X Local

**Mirrors along the object's local X axis**:
- Flips across object's own X axis
- Direction depends on object's rotation
- May not align with world X axis

**Use Cases**:
- Mirror object along its own orientation
- Flip rotated objects correctly
- Maintain object-space symmetry

#### Y Local

**Mirrors along the object's local Y axis**:
- Flips across object's own Y axis
- Direction depends on object's rotation
- May not align with world Y axis

#### Z Local

**Mirrors along the object's local Z axis**:
- Flips across object's own Z axis
- Direction depends on object's rotation
- May not align with world Z axis

### Local vs. Global

**Global Mirror**:
- Uses world space axes
- Same direction for all objects
- Consistent across scene

**Local Mirror**:
- Uses object's own axes
- Different direction per object (if rotated)
- Respects object orientation

**When Local Matters**:
If an object is rotated, its local axes no longer align with global axes. Local mirroring flips the object "correctly" from its own perspective.

---

## Mirror Examples

### Example 1: Mirror Around Individual Origins

**Before Mirroring**:
- Mesh with vertices
- Pivot point set to **Individual Origins**
- Transform Orientation: **Local**

**Operation**:
```
Ctrl+M X Enter
```

**After Mirroring (X axis)**:
- Mesh flipped horizontally
- Each element mirrored around its own origin
- Left side becomes right side

### Example 2: Mirror Around 3D Cursor

**Before Mirroring**:
- Mesh with vertices
- Pivot point set to **3D Cursor**
- Transform Orientation: **Local**
- 3D Cursor positioned to the side of the mesh

**Operation**:
```
Ctrl+M X Enter
```

**After Mirroring (X axis)**:
- Mesh flipped horizontally around cursor position
- Entire mesh moved to opposite side of cursor
- Creates symmetry across cursor plane

**Visual Result**:
The mesh appears on the opposite side of the 3D Cursor from where it started.

### Key Observations

**Pivot Point Impact**:
- **Individual Origins**: Each object/element mirrors in place
- **3D Cursor**: All objects mirror as a group around cursor
- **Median Point**: Mirror around collective center
- **Active Element**: Mirror around selected active object

**Transform Orientation Impact**:
- **Local**: Mirroring respects object's own rotation
- **Global**: Mirroring uses world axes regardless of object rotation
- **Normal**: Mirroring perpendicular to surface (Edit Mode)

---

## Clear Transform

Clear operations reset transform values (Location, Rotation, Scale) to their default states, effectively removing transformations while leaving objects visually in place if applied correctly.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Clear ‣ Location / Scale / Rotation / Origin
- **Shortcut**: Alt+G (Location), Alt+S (Scale), Alt+R (Rotation)

### Purpose

**Reset Transforms**:
- Location: Set to (0, 0, 0)
- Rotation: Set to 0° on all axes
- Scale: Set to (1, 1, 1)

**Visual Effect**:
- **Location cleared**: Object jumps to world origin
- **Rotation cleared**: Object returns to upright orientation
- **Scale cleared**: Object returns to original size

---

## Clear Operations

### Clear Location

**Reference**:
- **Shortcut**: Alt+G
- **Menu**: Object ‣ Clear ‣ Location

**Effect**:
- Resets Location values to (0, 0, 0)
- Object moves to world origin
- X, Y, Z location properties = 0

**Use Cases**:
- Reset object position
- Move object to world center
- Remove accidental position changes
- Start fresh with positioning

### Clear Scale

**Reference**:
- **Shortcut**: Alt+S
- **Menu**: Object ‣ Clear ‣ Scale

**Effect**:
- Resets Scale values to (1, 1, 1)
- Object returns to 100% original size
- Removes all scaling transformations

**Use Cases**:
- Reset object size
- Remove accidental scaling
- Return to proportional dimensions
- Fix inverted/negative scale

### Clear Rotation

**Reference**:
- **Shortcut**: Alt+R
- **Menu**: Object ‣ Clear ‣ Rotation

**Effect**:
- Resets Rotation values to 0° on all axes
- Object returns to default upright orientation
- Removes all rotation transformations

**Rotation Modes**:
Clears rotation regardless of rotation mode (Euler, Axis-Angle, Quaternion).

**Use Cases**:
- Reset object orientation
- Remove accidental rotations
- Return to aligned state
- Fix gimbal lock issues

### Clear Origin

**Reference**:
- **Menu**: Object ‣ Clear ‣ Origin

**Effect**:
- Clears (resets) the offset of child objects' origins from their parent
- Child objects move to the parent's origin
- Parent-child relationship remains intact

**What It Affects**:
- Only affects objects with parents
- Changes child position relative to parent
- Parent location unchanged

**What It Doesn't Affect**:
- Parent-child relationship (still parented)
- Object data or geometry
- Other transform properties

**Verification**:
Use the **Outliner** to verify parent-child relationship is still active after clearing origin.

---

## Clear Options

### Clear Delta

**Option** (appears in Adjust Last Operation panel):
- **Clear Delta**: On/Off

**When Enabled**:
Clears delta transforms in addition to primary transforms.

**Delta Transforms**:
Delta values are offset transforms applied on top of regular transforms:
- Delta Location
- Delta Rotation
- Delta Scale

**Use Case**:
If you've used delta transforms (e.g., via Transforms to Deltas), enable this option to clear both primary and delta values, fully resetting the object.

---

## Apply Transform

Apply operations bake transformations into object data, resetting transform values to defaults while keeping the object's visual appearance unchanged.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply
- **Shortcut**: Ctrl+A

### Purpose

**Baking Transforms**:
- Transfer transform coordinates to object data
- Reset Location to (0, 0, 0), Rotation to 0°, Scale to (1, 1, 1)
- Visual appearance unchanged
- Geometry adjusted to compensate

**Why Apply?**:
Many features depend on transform values:
- Modifiers (e.g., Array, Mirror)
- Constraints
- Parenting
- Physics simulations
- Rigging and animation

**Example Problem**:
If an object is scaled to 2.0, modifiers may behave incorrectly because they see "double size" in the scale property. Applying scale bakes the size into the geometry and resets scale to 1.0, fixing the issue.

### When to Apply

**Recommended Timing**:
- Before adding modifiers
- Before rigging (especially armatures)
- Before animation
- Before parenting
- When exporting to other software

**When NOT to Apply**:
- During animation (keyframes will break)
- When you need to preserve keyframed transforms
- When transforms are constraint-driven

---

## Apply: Location, Rotation, Scale

These operations apply (bake) specific transform types into object data.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Location / Rotation / Scale / Rotation & Scale

### Location

**Apply Location**:
- Moves object origin to world origin (0, 0, 0)
- Geometry moves to keep visual appearance
- Location property reset to (0, 0, 0)

**Effect**:
Object stays in same visual position, but its "default location" is now considered (0, 0, 0).

### Rotation

**Apply Rotation**:
- Resets Rotation property to 0° on all axes
- Geometry rotates to keep visual appearance
- Object's "default rotation" is now upright

**Effect**:
Object stays in same visual orientation, but its rotation values are now (0, 0, 0).

### Scale

**Apply Scale**:
- Resets Scale property to (1, 1, 1)
- Geometry scales to keep visual appearance
- Object's "default scale" is now 100%

**Effect**:
Object stays at same visual size, but its scale values are now (1, 1, 1).

**Most Important Apply**:
Scale is the most commonly applied transform because many modifiers and features assume scale is 1.0.

### Rotation & Scale

**Apply Rotation & Scale**:
- Applies both rotation and scale simultaneously
- Single operation for efficiency
- Equivalent to applying rotation, then scale

**Use Case**:
Common workflow to reset both rotational and scaling transforms while preserving visual appearance.

---

## Apply: Advanced Options

### Apply Properties

**Option** (in Adjust Last Operation panel):
- **Apply Properties**: On/Off

**When Enabled**:
Modifies properties that depend on scale:
- Curve vertex radius
- Font size (Text objects)
- Bone envelope (Armatures)

**Example**:
If a curve has vertex radius of 1.0 and object scale is 2.0:
- **Apply Properties Off**: Radius remains 1.0, scale reset to 1.0 → curve appears thinner
- **Apply Properties On**: Radius becomes 2.0, scale reset to 1.0 → curve appearance unchanged

### Armature Objects Warning

**Limitation**:
Applying transforms to **armature objects** is supported, but:
- Does NOT affect pose locations
- Does NOT affect animation curves
- Does NOT affect constraints

**Recommendation**:
Apply transforms to armatures **before rigging and animation** to avoid issues.

### Shared Object Data

**Important**:
If an object shares Object Data with other objects (instanced data):
- Blender will prompt to make data **Single User** first
- This duplicates the data so it can be modified independently
- Other objects keep original data unchanged

**Workflow**:
1. Apply transform (Ctrl+A)
2. Blender prompts: "Make Single User?"
3. Confirm to duplicate data
4. Transform applied to new data copy

---

## Transforms to Deltas

Converts primary transforms (Location, Rotation, Scale) into Delta Transforms, allowing you to bake current transforms while keeping primary channels free.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Location / Rotation / Scale / All Transforms to Deltas

### Purpose

**Delta Transforms**:
Delta values are offset transforms applied **on top** of regular transforms:
- Delta Location (added to Location)
- Delta Rotation (added to Rotation)
- Delta Scale (multiplied with Scale)

**Use Case**:
Transfer current transform values to delta channels so primary transforms can be:
- Keyframed independently
- Constraint-driven
- Reset to default without losing visual position

### Operations

#### Location to Deltas

**Effect**:
- Current Location → Delta Location
- Location property reset to (0, 0, 0)
- Visual position unchanged

#### Rotation to Deltas

**Effect**:
- Current Rotation → Delta Rotation
- Rotation property reset to 0°
- Visual orientation unchanged

#### Scale to Deltas

**Effect**:
- Current Scale → Delta Scale
- Scale property reset to (1, 1, 1)
- Visual size unchanged

#### All Transforms to Deltas

**Effect**:
- Converts Location, Rotation, AND Scale to deltas
- Single operation for all three
- All primary transforms reset to defaults

### Delta Addition

**Existing Deltas**:
If delta transforms already exist, new values are **added** to existing delta values:
```
Existing Delta Location: (1, 0, 0)
Current Location: (2, 3, 4)
After Location to Deltas:
Delta Location: (3, 3, 4)   # 1+2, 0+3, 0+4
Location: (0, 0, 0)          # Reset
```

---

## Transforms to Deltas: Options

### Reset Values

**Option** (in Adjust Last Operation panel):
- **Reset Values**: On/Off

**When Enabled** (default):
- Primary transform values cleared after transfer
- Location → (0, 0, 0)
- Rotation → 0°
- Scale → (1, 1, 1)
- Visual appearance unchanged (deltas contain the values)

**When Disabled**:
- Primary transform values remain
- Delta values also contain the transforms
- Both primary and delta now contain the same transformation
- Visual result: transformation is doubled

**Recommendation**:
Keep Reset Values **enabled** (default) to avoid doubling transforms.

---

## Animated Transform to Deltas

Converts existing animation keyframes from primary transforms to Delta Transforms, moving animation data to delta channels.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Animated Transform to Deltas

### Purpose

**Animation Transfer**:
- Move keyframed animation from primary transforms to delta transforms
- Primary transforms left at current values (not animated)
- Animation data preserved but relocated to delta channels

**Use Case**:
When you want to:
- Preserve animation in deltas
- Use primary transforms for new animation or constraints
- Layer animations (deltas + primary)

### Behavior

**Keyframe Transfer**:
- All keyframes on Location, Rotation, Scale → transferred to Delta Location, Delta Rotation, Delta Scale
- Original keyframes removed from primary channels
- Visual animation result unchanged

**Current Values**:
Primary transform values remain at their current state (the state at current frame when operation is applied).

### Animation Layering

**After Transfer**:
You can now animate primary transforms independently:
- Delta animation plays (original animation)
- Primary animation added on top (new animation)
- Combined result: layered animation

**Example**:
```
Original: Object bounces up and down (animated Z location)
After Transfer: Bounce animation in Delta Location Z
Now: Animate primary Location X to move sideways
Result: Object bounces while moving sideways
```

---

## Apply: Visual Transform

Applies the visual result of constraints to the object's own transformation properties, "baking" constraint effects.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Visual Transform

### Purpose

**Constraint Baking**:
- Freeze the current result of constraints into transform properties
- Object retains location/rotation/scale even if constraints are disabled or deleted
- Useful for "finalizing" constraint-driven poses

**Use Cases**:
1. Bake constraint-driven poses into keyframes
2. Remove constraints while keeping visual result
3. Export objects with constraints to software that doesn't support them
4. Finalize rigging-driven poses

### Behavior

**What Happens**:
1. Blender calculates the object's current visual state (with all constraints active)
2. That visual state is written to the object's transform properties
3. Constraints remain active but their effect is now "baked in"

**After Application**:
- If you disable or delete constraints, object stays in the same position
- Transform properties now match the constrained result

### Example

**Before Visual Transform**:
```
Object:
  Location: (0, 0, 0)
  Constraint: Copy Location from Empty at (5, 3, 2)
  Visual result: Object at (5, 3, 2)
```

**After Visual Transform**:
```
Object:
  Location: (5, 3, 2)         # Visual result baked
  Constraint: Still active but now redundant
  Visual result: Object still at (5, 3, 2)
```

If you now delete the constraint, the object remains at (5, 3, 2).

---

## Apply: Visual Geometry as Mesh

Applies the visual state of all modifiers, shape keys, hooks, and other deformations to object data, converting everything to a static mesh.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Visual Geometry to Mesh

### Purpose

**Freeze Geometry**:
- Apply all modifiers, shape keys, hooks, etc.
- Convert result to static mesh
- Remove all procedural/parametric editing
- "Finalize" geometry for export or performance

**Also Converts Types**:
Non-mesh types (Curve, Surface, Text, etc.) are converted to mesh.

### What Gets Applied

**Modifiers**:
- All modifiers are applied (in stack order)
- Modifier stack cleared
- Geometry reflects final modified result

**Shape Keys**:
- Shape key influences baked into geometry
- Shape key system removed

**Hooks**:
- Hook deformations applied
- Hook modifiers removed

**Other Deformers**:
- Armature deformations (if any)
- Lattice deformations
- Curve deforms

### Result

**Static Mesh**:
- No modifiers
- No shape keys
- No hooks
- Pure mesh geometry
- Cannot be edited parametrically

**Use Cases**:
1. Export to other software (FBX, OBJ, etc.)
2. Improve performance (remove heavy modifiers)
3. Finalize models for game engines
4. Create "frozen" versions of procedural objects

### Detail

**See Also**: Convert to Mesh documentation for more details.

---

## Apply: Visual Geometry to Objects

Creates new objects from the evaluated geometry of the active object, including modifiers, constraints, and instancing effects.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Visual Geometry to Objects

### Purpose

**Extract Evaluated Geometry**:
- Create new objects representing the fully evaluated state
- Preserve instancing hierarchies
- Share data where possible (efficient)
- Original object remains unchanged

**Use Cases**:
1. Extract results from Geometry Nodes
2. Realize complex instancing setups
3. Export evaluated results while keeping original editable
4. Debug or inspect modifier output

### Behavior

**New Objects Created**:
- One or more objects created
- Each represents part of evaluated geometry
- Shared data preserved (instances remain instances)

**Original Object**:
- Remains in scene
- Not modified or deleted
- Relationships with other objects preserved

**Instancing Hierarchies**:
- Structure preserved
- New objects and collections created to match evaluated structure
- Hierarchy relationships maintained

---

## Visual Geometry to Objects vs. Make Instances Real

### Key Differences

**Shared Data**:
- **Visual Geometry to Objects**: Preserves shared data between instances
- **Make Instances Real**: Each instance becomes independent

**Original Object**:
- **Visual Geometry to Objects**: Original remains unchanged
- **Make Instances Real**: Original instancing removed

**Hierarchies**:
- **Visual Geometry to Objects**: Hierarchies preserved
- **Make Instances Real**: Hierarchies optional (depends on settings)

**Disruption**:
- **Visual Geometry to Objects**: No disruption to original
- **Make Instances Real**: Original object modified

### Current Limitation

**Instance Attributes**:
Custom per-instance data (instance attributes) are currently **not preserved** by this operator.

---

## Make Instances Real

Converts all instances generated by the selected objects into real, independent objects.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Make Instances Real

### Purpose

**Instance Realization**:
- Create independent object for each instance
- Remove instancing from original objects
- Each instance becomes editable individually

**Instancing Types Affected**:
- **Direct instancing**: Verts, Faces, Collection instances
- **Indirect instancing**: Particle systems, Geometry Nodes output

### Result

**New Objects**:
- One object per instance
- Each object independent
- Original instancing removed from source objects

### Performance Warning

**Large Instance Counts**:
If you have **tens of thousands of instances** (common with particle systems), this operation can:
- Create tens of thousands of objects
- Significantly slow down Blender
- Cause memory issues
- Make scene difficult to manage

**Blender's Object Limit**:
Blender does not perform well with extremely high object counts. Consider alternative approaches for massive instance counts.

---

## Make Instances Real: Options

### Parent

**When Enabled**:
- **Without Keep Hierarchy**: Parents all generated objects to the original instancer
- **With Keep Hierarchy**: Parents generated objects to their respective instancer or matching new copy

**Use Case**:
Maintain organizational structure in the Outliner with parent-child relationships.

### Keep Hierarchy

**When Enabled**:
- Preserves internal parent-child relationships
- Generated objects maintain hierarchy structure
- Nested instancing relationships preserved (where possible)

**Use Case**:
When instance structure has internal relationships you want to maintain.

### Recommended Settings

**To Get Hierarchy Close to Original**:
Enable **both Parent and Keep Hierarchy** options.

**Result**:
- Generated objects organized in hierarchy
- Relationships preserved
- Outliner structure reflects instance structure

---

## Make Instances Real: Recursive Instancing Note

**Complex Cases**:
Recursive instancing (instancers instancing other instancers) is supported **to some extent**:

**Simple Cases** (usually work):
- Empty instancing a collection
- Collection contains instances of other collections
- Straightforward nested relationships

**Complex Cases** (may fail):
- Deep nesting levels
- Circular references
- Complex cross-instancing

**Current Limitation**:
Fully reproducing complex instancing hierarchies is not always possible. Some relationships may be lost or simplified.

---

## Parent Inverse

Applies the object's Parent Inverse transform to the object data, baking parent offset into geometry.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Apply ‣ Parent Inverse

### What is Parent Inverse?

**Parent Inverse Matrix**:
- Hidden transformation matrix
- Stores offset between parent and child
- Allows child to maintain position when parented
- Prevents child from "jumping" to parent's origin when parented

**Purpose**:
When you parent an object, Blender calculates a Parent Inverse matrix so the child stays in its current visual position instead of jumping to match parent's transforms.

### Apply Parent Inverse

**Operation**:
- Bakes Parent Inverse transformation into object data (geometry)
- Parent Inverse reset to identity (no offset)
- Visual appearance unchanged
- Parent-child relationship unchanged

**Use Case**:
Rarely needed in typical workflows. May be used for:
- Export to software that doesn't support parent inverse
- Troubleshooting complex parent-child issues
- Finalizing transformations in specific pipelines

---

## Snap

Snap operations quickly position objects or the 3D cursor relative to each other, the grid, or specific points, enabling precise alignment without manual transformation.

### Reference

- **Mode**: Object, Edit, and Pose Mode
- **Menu**: Object/Object type ‣ Snap
- **Shortcut**: Shift+S

### Snap Menu Overview

The Snap menu provides quick positioning commands:
- Snap selection to various targets
- Snap cursor to various targets
- Affected by current Pivot Point setting

**Access**:
- **Shortcut**: Shift+S (opens pie menu or list menu depending on preferences)
- **Header Menu**: Object ‣ Snap or Mesh ‣ Snap

---

## Snap: Selection Operations

### Selection to Grid

**Effect**:
- Snaps selected objects to nearest grid point
- Each object moves to closest grid intersection
- Grid spacing defined by scene settings

**Use Cases**:
- Align objects to grid for architectural modeling
- Clean up positions to round numbers
- Organize scattered objects

### Selection to Cursor

**Effect**:
- Moves each selected object to the 3D Cursor location
- All objects stack at cursor position

**Optional**:
- **Rotate to match cursor**: Align object rotations with cursor orientation (if option available)

**Use Cases**:
- Position objects at specific point
- Stack objects at target location
- Centralize scattered objects

### Selection to Cursor (Offset)

**Effect**:
- Moves selection as a group to 3D Cursor
- Maintains relative distances between objects
- Selection centered around cursor

**Difference from "Selection to Cursor"**:
- **Selection to Cursor**: All objects stack at same point
- **Selection to Cursor (Offset)**: Objects stay spread out, group center at cursor

**Use Cases**:
- Move entire group to new location
- Reposition layout without disrupting arrangement
- Center group at cursor while preserving spacing

### Selection to Active

**Effect**:
- Moves selected objects to the active object's origin
- Active object = last selected (yellow outline)
- All other objects stack at active object's center

**Use Cases**:
- Align objects to a reference object
- Stack objects at key object's position
- Centralize group around important element

---

## Snap: Cursor Operations

### Cursor to Selected

**Effect**:
- Places 3D Cursor at center of selection
- Center calculation affected by **Pivot Point setting**

**Pivot Point Impact**:
- **Bounding Box Center**: Cursor to center of bounding box
- **Median Point**: Cursor to median (average) of selected elements
- **Individual Origins**: Cursor to median of origins
- **Active Element**: Cursor to active object/element origin

**Use Cases**:
- Position cursor for rotation/scaling center
- Mark center of selection
- Create reference point from selected objects

### Cursor to World Origin

**Effect**:
- Moves 3D Cursor to world origin (0, 0, 0)
- Absolute position in global coordinates

**Use Cases**:
- Reset cursor to default position
- Create objects at world center
- Align cursor to scene origin

### Cursor to Grid

**Effect**:
- Snaps 3D Cursor to nearest grid point
- Grid spacing defined by scene settings

**Use Cases**:
- Align cursor to grid for precise positioning
- Create objects on grid intersections
- Clean up cursor position to round number

### Cursor to Active

**Effect**:
- Moves 3D Cursor to the active object's origin
- Active object = last selected (yellow outline)

**Use Cases**:
- Position cursor at reference object
- Create new objects at active object's location
- Set rotation/scale center to active object

---

## Duplicate

Creates a visually identical copy of selected objects with shallow data linking—some data blocks are shared, others are copied.

### Reference

- **Mode**: Edit and Object Modes
- **Menu**: Object ‣ Duplicate Objects
- **Shortcut**: Shift+D

### Basic Usage

1. **Select objects** to duplicate
2. **Press Shift+D** to activate Duplicate mode
3. **Move mouse** to position duplicate (automatic move mode)
4. **Confirm** with LMB or Enter, or **cancel** with RMB or Esc

**Result**:
- New object created at same initial position as original
- Automatically enters Move mode for repositioning
- Duplicate shares some data with original, copies other data

### Shallow Link

**Data Sharing Behavior**:
- **Shared (linked)**: Materials, textures, F-Curves (animation), other data blocks
- **Copied (duplicated)**: Mesh data, object data block, transform properties

**Why "Shallow"?**:
Not all data blocks are shared—some are copied. This is a middle ground between fully independent copies and fully linked duplicates.

### Examples

**Example: Duplicate Cube**:
1. Select Cube
2. Press Shift+D, move to the right, confirm
3. Result: Two cubes (Cube and Cube.001)

**Observation**:
- **Mesh data**: Copied → Cube and Cube.001 have separate mesh data blocks
  - Edit one cube's mesh in Edit Mode → other cube unchanged
- **Transform properties**: Copied → Each cube has independent Location/Rotation/Scale
  - Move/rotate one cube → other cube unaffected
- **Materials**: Linked → Both cubes share same material
  - Change material on one cube → other cube changes too

### Data Block Sharing

**Default Sharing** (can be customized in Preferences ‣ Editing ‣ Duplicate Data):
- Materials: Linked
- Textures: Linked
- F-Curves (animation): Linked
- Mesh data: Copied
- Object data block: Copied

**Customization**:
In Preferences, you can choose which types of data blocks are linked vs. copied when duplicating.

---

## Duplicate Linked (Deep Link)

Creates a linked duplicate where all object data is shared with the original—only transform properties are independent.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Duplicate Linked
- **Shortcut**: Alt+D

### Basic Usage

1. **Select objects** to duplicate
2. **Press Alt+D** to activate Duplicate Linked mode
3. **Move mouse** to position duplicate
4. **Confirm** with LMB or Enter

**Result**:
- New object created
- All object data (mesh, materials, textures, etc.) linked to original
- Transform properties copied (independent)

### Deep Link

**Data Sharing**:
- **Shared (linked)**: Object Data (mesh, curve, etc.), materials, textures, modifiers, all data blocks
- **Copied (independent)**: Transform properties (Location, Rotation, Scale)

**Editing Behavior**:
- **Edit Mode**: Changes to one object's mesh affect all linked duplicates
- **Object Mode**: Transform changes (move, rotate, scale) affect only selected object

### Animation Linking

**Important**:
If the original object was animated, the duplicate links to the **same Action**:
- Both objects animated by same Action
- Both objects move/rotate/scale identically
- Transform properties are separate, but animation sets them to same values

**Making Animation Independent**:
If you want independent animation:
1. Select duplicate
2. Go to Action Editor or NLA Editor
3. Make Action single-user (click shield icon or number)
4. Now you can animate duplicate independently

---

## Duplicate Linked: Options

### Linked

**In Adjust Last Operation Panel**:
- **Linked checkbox**: Checked (unlike regular Duplicate)

**Purpose**:
Confirms operation was a linked duplicate, not regular duplicate.

### Make Single-User

**When to Make Single-User**:
If you want to edit the duplicate's data independently from the original:
1. Select duplicate
2. Click number in Object Data panel (Properties ‣ Object Data Properties)
3. Number becomes "1" (single-user)
4. Data is now copied, not linked

**Alternative**:
Use **Object ‣ Relations ‣ Make Single User** for more control.

**See Also**: Data-Block Menu and Make Single User documentation.

---

## Duplicate Linked: Examples

**Example: Linked Duplicate Cube**:
1. Select Cube
2. Press Alt+D, move to the right, confirm
3. Result: Two cubes (Cube and Cube.001)

**Observation**:
- **Mesh data**: Linked → Both cubes share mesh named "Cube"
  - Edit one cube's mesh in Edit Mode → other cube changes too
- **Transform properties**: Copied → Each cube has independent Location/Rotation/Scale
  - Rotate one cube in Object Mode → other cube unaffected
- **Materials**: Linked → Both cubes share same material
  - Change material → affects both cubes

**Use Case: Table Legs**:
Model one table leg → Alt+D to create 3 linked duplicates → position each leg at table corners → if you later edit the mesh of any leg, all four legs update identically.

**Use Case: Symmetrical Objects**:
- Drinking glasses in a set
- Wheels on a car
- Repeating architectural elements
- Any scenario with repetition or symmetry

---

## Linked Library Duplication

**Related Concept**:
Blender's **Linked Libraries** system allows you to reference objects or data blocks from other .blend files:
- Link data from external file
- Changes to source file update linked data
- Efficient for asset reuse across projects

**See Also**: Linked Libraries documentation.

---

## Transform Properties Linking

**Tip**:
If you want **transform properties** (Location, Rotation, Scale) to be "linked" between objects, use **Parenting**:
- Parent one object to another
- Child's transforms become relative to parent
- Moving parent moves child

**See Also**: Parenting documentation.

---

## Join

Join merges multiple selected objects into one, combining their geometry and data into the active object.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Join
- **Shortcut**: Ctrl+J

### Purpose

**Merge Objects**:
- Combine multiple objects into single object
- All geometry becomes part of one mesh
- Useful for organization and efficiency

**Requirements**:
- All selected objects must be the **same type** (all meshes, or all curves, etc.)
- One object must be active (last selected, yellow outline)

---

## Join: Behavior

### Target Object

**Active Object**:
- Last selected object (yellow outline)
- Receives all data from other selected objects
- Remains in scene after join
- Other objects deleted

**Result**:
Active object now contains all geometry from selected objects.

### Object Types

**Supported Types**:
- Mesh
- Curve (Bézier and NURBS)
- Surface (NURBS surfaces)
- Armature
- Text

**Mixed Types Not Allowed**:
Cannot join objects of different types (e.g., mesh + curve).

### Curve Subtypes

**Curves**:
When joining curves, each curve **keeps its subtype**:
- Bézier curves remain Bézier
- NURBS curves remain NURBS
- Result: Mixed subtype curve with multiple splines

---

## Join: Data Handling

### Data Merged

**Combined Data**:
- **Materials**: All materials from all objects merged into active object's material list
- **Vertex Groups**: All vertex groups preserved and merged
- **UV Layers**: All UV maps merged
- **Vertex Color Layers**: All color attributes merged

### Data Ignored

**Not Applied**:
- **Modifiers**: Not applied or transferred (ignored)
- **Constraints**: Not transferred (ignored)
- **Object Groups**: Group memberships not transferred
- **Parent Relationships**: Parent relationships removed (objects separated from parents)

**Warning**:
If objects have modifiers or constraints, those are lost during join. If you want modifier effects, apply modifiers first.

### Hierarchy

**Parent-Child Relationships**:
- Ignored during join
- Objects removed from their parents
- Child objects become part of joined object but parent link is lost

**Result**:
Joined object has no parent, regardless of original objects' parenting.

---

## Best Practices and Workflows

### Transform Control Best Practices

**Numeric Input Workflow**:
- Use numeric input for exact positioning
- Combine with axis locking for precise directional control
- Advanced mode for complex calculations

**Axis Locking Tips**:
- Lock to primary axis first, adjust as needed
- Use plane locking for floor/wall constraints
- Cycle through orientations for flexibility

**Precision Control**:
- Ctrl for grid snapping (architectural modeling)
- Shift for fine control (detail work, small objects)
- Ctrl+Shift combined for maximum precision

### Move Workflows

**Precise Positioning**:
```
G X 5 Enter         # Move exactly 5 units on X
G Shift+Z Ctrl      # Move on XY plane with grid snapping
G Z Shift           # Move vertically with fine control
```

**Object Organization**:
1. Select objects to reposition
2. Shift+S → Selection to Cursor (Offset) to group at cursor
3. G Z -5 to move group down 5 units
4. Result: Organized at new location with spacing preserved

### Rotation Workflows

**Exact Angles**:
```
R Z 90 Enter        # Rotate exactly 90° around Z
R Ctrl              # Rotate in 5° increments
R Z Shift           # Fine rotation around Z (0.01° steps)
```

**Align to Surface**:
1. Set Transform Orientation to Normal (Edit Mode, face selected)
2. R to rotate around surface normal
3. Numeric input for exact angle

### Scale Workflows

**Proportional Scaling**:
```
S 2 Enter           # Double size uniformly
S Shift             # Fine scale control
```

**Directional Scaling**:
```
S X 2 Enter         # Double width only
S Shift+Z 0.5 Enter # Flatten by half (scale XY to 50%)
```

### Mirror Workflows

**Symmetrical Modeling**:
1. Model one half of object
2. Set pivot to 3D Cursor (placed on centerline)
3. Ctrl+M X to mirror across X axis
4. Result: Symmetrical object

**Character Modeling**:
1. Model right side of character
2. Pivot: 3D Cursor at center of character
3. Ctrl+M X for left/right symmetry
4. Use Mirror Modifier for non-destructive workflow

### Clear and Apply Workflows

**Pre-Modifier Checklist**:
```
Before adding modifiers:
1. Alt+G Alt+R Alt+S (clear transforms) or
2. Ctrl+A → All Transforms (apply transforms)
3. Check scale is 1.0, rotation is 0°
Result: Modifiers work correctly
```

**Export Preparation**:
```
Before exporting:
1. Apply all modifiers (if needed)
2. Ctrl+A → Rotation & Scale
3. Check for negative scale
4. Export
Result: Clean export
```

### Duplicate Workflows

**Asset Scattering**:
1. Create base object (tree, rock, etc.)
2. Alt+D to create linked duplicates
3. Position duplicates around scene
4. Scale/rotate in Object Mode for variation
5. Edit one in Edit Mode → all update
6. When satisfied: Object ‣ Relations ‣ Make Single User to unlink

**Assembly Modeling**:
1. Model one component (screw, bolt, panel)
2. Alt+D for repeated components
3. Assemble into larger structure
4. Later, edit base component to update all instances

### Join Workflows

**Consolidate for Export**:
1. Model character as separate body parts
2. Add and apply modifiers to each part
3. Select all parts, make one active
4. Ctrl+J to join
5. Result: Single mesh for export

**Performance Optimization**:
Multiple small objects → Join → Single object with less overhead

---

## Advanced Techniques

### Parametric Movement with Advanced Mode

**Formula-Based Translation**:
```
G X =sqrt(2) Enter              # Move √2 units on X
G Y =10*sin(pi/4) Enter         # Move 10×sin(45°) on Y
G Z =5+3 Enter                  # Move 8 units on Z
```

**Use Cases**:
- Mathematical modeling
- Scientific visualization
- Precise architectural dimensions

### Multi-Axis Transformation Combos

**Complex Positioning**:
```
G 5 Tab 0 Tab 10 Enter          # Move X:5, Y:0, Z:10
R X 45 Enter R Z 90 Enter       # Rotate 45° on X, then 90° on Z
S X 2 Enter S Y 0.5 Enter       # Scale 200% wide, 50% deep
```

### Transform Orientation Cycling

**Fast Orientation Switching**:
```
G Z Z Z         # Move Z: Local → Global → (free) → ...
R X X           # Rotate X: Normal → Global → ...
```

**Workflow**:
Quickly test different orientation modes without opening menus.

### Proportional Editing with Transforms

**Organic Deformation**:
1. Enable Proportional Editing (O)
2. Select face in Edit Mode
3. G Z to move vertically
4. Scroll wheel to adjust influence radius
5. Nearby geometry smoothly follows

**See Also**: BLENDER_UI_PROPORTIONAL_EDITING.md for comprehensive workflows.

### Snapping Combinations

**Vertex-to-Vertex Alignment**:
1. Enable Vertex snapping (Shift+Tab)
2. G to move
3. Hold Ctrl while hovering over target vertex
4. Object snaps to vertex

**Grid + Fine Control**:
```
G Ctrl Shift        # Grid snapping + slow movement
```

### Pivot Point for Complex Rotations

**Rotate Around Cursor**:
1. Shift+S → Cursor to Selected (place cursor at center)
2. Pivot Point: 3D Cursor
3. R Z 45 Enter → rotates around cursor

**Rotate Around Active Element**:
1. Select multiple faces, last face = active
2. Pivot Point: Active Element
3. R → rotate around active face

### Texture Space for Procedural Textures

**Adjust Wood Grain Direction**:
1. Object with wood procedural texture
2. Object ‣ Transform ‣ Scale Texture Space
3. S X 2 to stretch wood grain horizontally
4. Object ‣ Transform ‣ Move Texture Space
5. G to reposition grain pattern

### Delta Transform Animation Workflow

**Layered Animation**:
1. Animate object location with keyframes (primary transforms)
2. Select object at any frame
3. Object ‣ Apply ‣ All Transforms to Deltas
4. Delta now contains animation
5. Animate primary Location for secondary motion
6. Result: Two layers of animation combined

### Make Instances Real for Particle Export

**Particle to Objects**:
1. Create particle system (1000 trees)
2. Realize for export: Object ‣ Apply ‣ Make Instances Real
3. Warning: Creates 1000 objects (performance hit)
4. Join some objects (Ctrl+J) to reduce count
5. Export

---

## Related Documentation

- **3D Viewport**: [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md) - Main 3D workspace
- **Viewport Controls**: [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md) - Navigation and display
- **Pivot Points and Snapping**: [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) - Transform centers and precision alignment
- **Proportional Editing**: [BLENDER_UI_PROPORTIONAL_EDITING.md](BLENDER_UI_PROPORTIONAL_EDITING.md) - Soft transformations with graduated influence
- **Tool System**: [BLENDER_UI_TOOL_SYSTEM.md](BLENDER_UI_TOOL_SYSTEM.md) - Transform gizmos and tool usage
- **Operators**: [BLENDER_UI_OPERATORS.md](BLENDER_UI_OPERATORS.md) - Adjust Last Operation panel
- **Selecting**: Selection methods for transform targets
- **Parenting**: Transform relationships between objects
