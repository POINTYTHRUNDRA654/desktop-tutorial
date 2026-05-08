# Blender UI Curve Widget

The Curve Widget is used to edit two types of curves with different properties and use cases:

1. **Profile Curves**: Simple two-dimensional shapes that describe a visual profile
2. **Mapping Curves**: Input-to-output mappings where each X value maps to exactly one Y value

The available options differ slightly depending on the curve type. Mapping curves have restrictions (no overhang) that profile curves don't have.

## Overview

The Curve Widget provides an intuitive interface for creating and adjusting curves. It's used in:
- Brush curves (painting, sculpting)
- Color mapping
- Tone mapping
- Falloff curves
- Custom mapping functions
- Shape/profile definition

## Control Points

Curves in Blender are defined using control points. The curve passes through or near these points, and their position determines the curve's shape.

### Adding Control Points

**LMB click** anywhere on the curve where there is not already a control point.

**How It Works**:
1. Position your cursor on the curve line at the location where you want to add a point
2. Click with LMB
3. A new control point is created at that location
4. The point is automatically selected
5. The curve is recalculated to pass through the new point

**Use Cases**:
- Creating inflection points where curve direction changes
- Adding fine control at specific X or Y values
- Building complex curve shapes

### Moving Control Points

**LMB drag** the point to move it.

**How It Works**:
1. Click and hold LMB on a control point
2. Drag the point to a new location
3. The curve updates in real-time
4. Release LMB to confirm

**Constraints** (depending on curve type):
- **Profile Curves**: Points can move freely
- **Mapping Curves**: Points cannot overhang (each X value must have exactly one Y value)

### Removing Control Points

**Method 1**: Select the point and click the **Delete/Remove** button (trash icon) at the bottom right.

**Method 2**: Select the point and press **X**.

**Behavior**:
- The selected point is deleted
- The curve is recalculated
- The first and last points cannot be deleted (they define the curve's start and end)

**Use Cases**:
- Simplifying an overly complex curve
- Removing accidental points
- Resetting the curve shape

## Navigation Controls

### Zoom In

**Icon**: Magnifying glass (+) button or zoom in icon

**Function**: Zoom in to show more details and provide more accurate control.

**How It Works**:
1. Click the Zoom In button
2. The view magnifies to show details
3. For finer control, click multiple times
4. The curve becomes easier to edit with precision

**Navigation While Zoomed**:
- **LMB click and drag** in an empty area to pan around the zoomed view
- Use Zoom Out to see the whole curve again

### Zoom Out

**Icon**: Magnifying glass (-) button or zoom out icon

**Function**: Zoom out to show fewer details and view the curve as a whole.

**Behavior**:
- Each click zooms out one level
- Cannot zoom out further than the clipping region (default 0-1 range)
- Shows the full curve context

## Reverse Path (Profile Curves Only)

**Icon**: Mirror/flip icon

**Function**: Mirror the curve around the diagonal.

**How It Works**:
1. Click the Reverse Path button
2. The curve is flipped diagonally
3. X and Y axes are swapped

**Effect on Curve**:
- Point at (0.2, 0.8) becomes (0.8, 0.2)
- Steep curves become flat and vice versa
- Useful for creating inverse or complementary profiles

**Use Cases**:
- Creating opposing curves
- Adjusting falloff direction
- Creating mirrored effects

## Clipping Options (Mapping Curves Only)

### Use Clipping

**Checkbox**: Enable or disable clipping constraints.

**Function**: Force curve points to stay between specified minimum and maximum values.

**When to Enable**:
- Preventing points from going out of bounds
- Ensuring output values stay within expected ranges
- Enforcing constraints for physical accuracy

### Min X/Y and Max X/Y

**Fields**: Set the minimum and maximum bounds for curve points.

**How It Works**:
- **Min X**: Leftmost X position (default 0.0)
- **Max X**: Rightmost X position (default 1.0)
- **Min Y**: Lowest Y position (default 0.0)
- **Max Y**: Highest Y position (default 1.0)

**Effect**:
- Points cannot move outside these bounds (when Use Clipping is enabled)
- Constrains the valid curve region
- Useful for keeping values in acceptable ranges

**Examples**:
- Min Y: 0, Max Y: 1 → Forces all Y values between 0 and 1
- Min X: -1, Max X: 1 → Allows X values from -1 to 1

## Specials Menu

**Icon**: Menu icon (three dots) or gear icon

### Reset View

**Function**: Zoom the view all the way out to show the entire curve and clipping region.

**Use When**:
- You've zoomed in and can't see the full curve
- You want a quick overview
- Navigating back to the default view

## Extend Options (Mapping Curves Only)

Controls how the curve is extended before the first point and after the last point.

### Extend Horizontal

**Icon**: Horizontal line icon

**Function**: Causes the curve to "go flat."

**Behavior**:
- Before the first point: The curve maintains the first point's Y value
- After the last point: The curve maintains the last point's Y value
- Creates a flat extension beyond the curve endpoints

**Example**:
- Curve starts at (0, 0.2)
- Extending horizontally means for all X < 0, Y = 0.2
- For all X beyond the last point, Y maintains that endpoint's value

**Use Cases**:
- Clamping output values
- Preventing extrapolation
- Creating step functions

### Extend Extrapolated

**Icon**: Diagonal/extending line icon

**Function**: Causes the curve to maintain its direction.

**Behavior**:
- Before the first point: The curve is extrapolated backward
- After the last point: The curve is extrapolated forward
- The curve continues in the direction it was heading

**Example**:
- If the curve is rising steeply at the start, it continues rising backward
- If the curve flattens at the end, it continues flattening forward
- Creates a smooth mathematical extension

**Use Cases**:
- Smooth mathematical curves
- Continuing trends beyond the defined range
- Creating natural-looking extensions

## Reset Curve

**Function**: Resets the curve to the default (removes all added points).

**Default States**:
- **Mapping Curves**: Straight diagonal line from (0,0) to (1,1) (linear)
- **Profile Curves**: Depends on the property

**Behavior**:
- All custom control points are deleted
- The curve returns to its original shape
- Cannot be undone after leaving the widget (use Ctrl-Z immediately if needed)

## Handle Types

The handle type of the selected control point determines the shape of curve segments around it. Different handles produce different curve characteristics.

### Auto Handle

**Icon**: Smooth curve icon

**Function**: Results in a smooth curve without the need to manually set up handles.

**Characteristics**:
- Blender automatically calculates handle positions
- Produces smooth curves passing through the control point
- No manual adjustment needed
- Available for all curve types

**Best For**:
- Quick, smooth curves
- When precise control isn't critical
- Most common use case

### Vector Handle

**Icon**: Corner/angle icon

**Function**: Results in straight lines and sharp corners.

**Characteristics**:
- Creates straight line segments between control points
- Produces sharp angles at control points
- No smooth curves
- Sharp, angular appearance

**Best For**:
- Sharp transitions
- Linear interpolation
- Piecewise linear curves

### Free Handle (Profile Curves Only)

**Icon**: Bézier handle icon (small circles at endpoints)

**Function**: Shows freely movable Bézier handles that are independent of each other.

**Characteristics**:
- Two handles per control point move independently
- Can create sharp corners at the control point
- Full control over curve shape
- Handles shown as visible control points

**Best For**:
- Complex shapes
- Precise control over curve behavior
- Creating cusps and corners where needed

### Aligned Free Handles (Profile Curves Only)

**Icon**: Aligned Bézier handle icon

**Function**: Shows freely movable Bézier handles that are locked together to always point in opposite directions.

**Characteristics**:
- Two handles per control point move together
- Always point in opposite directions
- Ensures curve is always smooth at the control point
- Balanced control

**Best For**:
- Smooth, professional curves
- Maintaining curvature across control points
- Most flexible smooth option

### Auto Clamped Handle (Mapping Curves Only)

**Icon**: Smooth curve icon (variant)

**Function**: Like Auto Handle, but also prevents overshoot.

**Characteristics**:
- Automatically calculates handles (like Auto Handle)
- Prevents the curve from overshooting beyond control point values
- Keeps curve monotonic
- Enforces physical constraints

**Best For**:
- Mapping curves where overshoot is undesirable
- Maintaining monotonic curves
- Physical constraints (e.g., falloff curves)

## Control Point Properties

### X, Y Coordinates

**Fields**: Show the coordinates of the selected control point.

**How to Use**:
1. Select a control point (click on it)
2. View its X and Y values in the fields
3. Type new values to move the point precisely
4. Press Return to confirm

**Range**: Depends on clipping bounds (default 0-1 for each axis)

**Precision**: Allows exact positioning without dragging

### Delete X Button

**Icon**: X or delete icon

**Function**: Remove the selected control point.

**Behavior**:
- Deletes the currently selected control point
- The first and last points cannot be deleted
- Curve is recalculated immediately

**Note**: Same as pressing X while the point is selected

## Copy/Paste

**Shortcut**: **Ctrl-C** to copy, **Ctrl-V** to paste

**Function**: The whole curve can be copied from one Curve Widget to another.

**How It Works**:
1. Hover over the source curve widget
2. Press **Ctrl-C** to copy the entire curve
3. Navigate to the destination curve widget
4. Press **Ctrl-V** to paste the curve
5. The destination curve is replaced with the copied curve

**Use Cases**:
- Duplicating curve setups
- Transferring curves between objects
- Applying the same mapping to multiple properties

## Presets (Brush Curve Widgets Only)

A number of preset curves that the curve can be set to. The exact shape depends on whether the default curve for the property has a positive or negative slope.

### Positive Slope Presets

**Linear**: Straight diagonal line (no change in value)

**Smooth**: Smooth, gradually increasing curve

**Round**: Rounded, bell-curve-like shape

**Root**: Square root-like curve (steep at start, flattens out)

**Sharp**: Inverse of Root (flat start, steep end)

**Constant**: Flat horizontal line

### Negative Slope Presets

**Linear**: Straight diagonal line (decreasing)

**Smooth**: Smooth, gradually decreasing curve

**Round**: Rounded, inverted bell-curve

**Root**: Square root-like curve (decreasing variant)

**Sharp**: Inverse of Root (decreasing variant)

**Constant**: Flat horizontal line

### Applying a Preset

1. Click on the desired preset shape in the Presets section
2. The curve is immediately replaced with that preset shape
3. You can then fine-tune the preset by adjusting control points

## Practical Workflows

### Creating a Custom Mapping Curve

1. **Start with linear default** (straight diagonal line)
2. **Add control points** where you want adjustments
   - Click on the curve to add points
3. **Move points** to shape the curve
   - Drag points to adjust input-output mapping
4. **Select handle type** for smooth or sharp transitions
5. **Fine-tune X, Y values** for precision
6. **Verify clipping** if constraints are needed

### Creating a Brush Falloff Curve

1. **Choose a preset** close to desired shape
2. **Refine with control points**
3. **Use Auto Clamped** handles for smooth results
4. **Ensure monotonic** (always increasing or decreasing)
5. **Test** the brush to verify falloff behavior

### Copying a Curve to Multiple Properties

1. **Create and refine** the source curve
2. **Hover over the source** curve widget
3. **Press Ctrl-C** to copy
4. **Go to destination** curve widget
5. **Press Ctrl-V** to paste
6. **Repeat** for additional properties

## Advanced Tips

### Smooth vs Sharp Curves

- **Auto/Auto Clamped**: Smooth, continuous curves with no manual handle work
- **Vector**: Sharp corners and straight segments
- **Free/Aligned**: Maximum control with visible handles

### Clipping vs No Clipping

- **With Clipping**: Values bounded to specified ranges (safer for constraints)
- **Without Clipping**: Full freedom, can overshoot (more flexible)

### Extend Options for Mapping Curves

- **Horizontal**: Safe, prevents extrapolation effects
- **Extrapolated**: Smooth mathematical extension (can be unpredictable)

### Keyboard Efficiency

- **X key**: Delete selected point (faster than button)
- **Ctrl-C/V**: Copy/paste entire curves (workflow efficiency)
- **Direct coordinate entry**: Type X,Y values for precision

## Related Documentation

- [Blender UI Color Ramp Widget](BLENDER_UI_COLOR_RAMP_WIDGET.md) - Similar gradient widget
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - X, Y coordinate input
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Control buttons and icons
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts
