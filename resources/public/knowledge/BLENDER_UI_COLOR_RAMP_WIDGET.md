# Blender UI Color Ramp Widget

Color Ramps specify a color gradient based on color stops. Each stop has a position and a color. The gradient is then calculated as the interpolation between these stops using the chosen interpolation method.

## Overview

The Color Ramp Widget is a powerful tool for creating smooth color transitions and gradients. It's used in:
- Material shaders (ColorRamp node)
- Texture mapping
- Attribute mapping
- Compositor nodes
- Custom shader networks

## Interface Components

The Color Ramp Widget displays a horizontal gradient bar with color stops (handles) that you can manipulate.

### Main Gradient Display

The large horizontal gradient bar shows the result of the color ramp based on current stops and interpolation settings.

**Interaction**:
- **LMB click on a stop**: Select it (becomes highlighted with a dashed line)
- **LMB drag a stop**: Move it left or right to change its position
- **Ctrl-LMB click on the bar**: Add a new color stop at that position
- **LMB click on empty space**: Deselect the current stop

## Controls

### Add Color Stop

**Icon**: Plus (+) button on the left

**Function**: Adds a new stop between the selected stop and the one before it.

**How It Works**:
1. Select a color stop (click on it)
2. Click the Add button
3. A new stop is created halfway between the selected stop and the previous one
4. The new stop inherits color from interpolation at that position

**Shortcut**: **Ctrl-LMB** click on the color bar to add a stop at that position directly

### Delete Color Stop

**Icon**: Minus (-) button

**Function**: Deletes the selected color stop.

**Behavior**:
- The gradient is updated immediately
- If you delete the only stop, an error may occur
- Most color ramps require at least two stops

### Tools Menu

**Icon**: Menu icon (three dots or similar)

**Function**: Contains more advanced operators for the color ramp.

#### Flip Color Ramp

Flips the gradient, mirroring the positions of the stops.

**Effect**:
- Stop at position 0 moves to position 1
- Stop at position 0.5 stays at 0.5
- Stop at position 1 moves to position 0
- Colors are preserved at their new positions

**Use Cases**:
- Reversing a gradient direction
- Mirroring shader effects
- Creating complementary gradients

#### Distribute Stops from Left

Distribute the stops so that every step has the same space to the right.

**Behavior**:
- Stops are evenly spaced from left to right
- Useful for uniform transitions
- Especially effective with Constant interpolation

**Example**:
- With 5 stops: positions become 0.0, 0.25, 0.5, 0.75, 1.0

#### Distribute Stops Evenly

Distribute the stops so that all neighbors have the same space between them.

**Behavior**:
- All gaps between adjacent stops are equal
- First and last stops stay at their positions (0 and 1)
- Interior stops are evenly spaced

**Use Cases**:
- Creating uniform color transitions
- Ensuring balanced gradients
- Professional color grading setups

#### Eyedropper (E Key)

An Eyedropper tool to sample a color or gradient from the interface to be used in the color ramp.

**How to Use**:
1. Click the Eyedropper icon or press **E**
2. Move the cursor over an image or color in Blender
3. **LMB click** to sample the color
4. The sampled color is applied to the selected stop

**Note**: The eyedropper works with rendered previews, texture editors, and viewport displays.

For more details, see [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md).

#### Reset Color Ramp

Resets the color ramp to its default state.

**Default State**:
- Two stops: black on the left (0.0), white on the right (1.0)
- Linear RGB interpolation
- RGB color mode

**Use Cases**:
- Starting over after complex edits
- Reverting accidental changes
- Creating a fresh ramp

## Color Mode

Selection of the Color Model used for interpolation.

### RGB

Blends color by mixing each color channel (Red, Green, Blue) independently and combining.

**Characteristics**:
- Direct channel mixing
- Can desaturate colors in the middle of the gradient
- Good for technical/precise control
- Standard color blending

**Example**: Gradient from pure red to pure blue will pass through purple tones, with decreasing saturation in the middle.

**Interpolation Methods Available**:
- B-Spline
- Cardinal
- Linear
- Ease
- Constant

### HSV

Blends colors by first converting to HSV (Hue, Saturation, Value), mixing in that space, then converting back to RGB.

**Advantages**:
- Maintains saturation between different hues
- Creates richer, more vibrant gradients
- RGB would de-saturate, but HSV preserves color intensity
- Better for artistic color transitions

**Interpolation Methods Available**:
- Clockwise
- Counter-Clockwise
- Near
- Far

### HSL

Similar to HSV but uses HSL (Hue, Saturation, Lightness) color space for interpolation.

**Differences from HSV**:
- Uses Lightness instead of Value
- Perceptually more uniform
- May produce slightly different color transitions
- Good for perceptually-based color work

**Interpolation Methods Available**:
- Clockwise
- Counter-Clockwise
- Near
- Far

## Color Interpolation

The interpolation method determines how colors blend between stops.

### RGB Interpolation Methods

#### B-Spline

Uses a B-spline curve for smooth interpolation.

**Characteristics**:
- Smooth, continuous curves
- Color may overshoot beyond stop values
- Professional, polished results
- Good for gradual transitions

#### Cardinal

Uses a cardinal (Catmull-Rom) spline for interpolation.

**Characteristics**:
- Smooth curves passing through control points
- More controlled than B-spline
- Natural-looking transitions
- Balances smoothness and precision

#### Linear

Uses a linear interpolation for straight-line transitions between stops.

**Characteristics**:
- Predictable, direct blending
- Straight lines between color values
- Good for precise control
- Most common choice

#### Ease

Uses an ease (smooth acceleration) interpolation.

**Characteristics**:
- Smooth acceleration and deceleration
- Values ease into the next stop
- Professional animation-like feel
- Good for gradual transitions

#### Constant

Uses a constant (step) interpolation for abrupt color changes.

**Characteristics**:
- No blending between stops
- Color changes instantly at stop positions
- Creates bands of solid color
- Useful for discrete color schemes

**Note**: Often used with **Distribute Stops from Left** for even bands.

### HSV/HSL Interpolation Methods

When using HSV or HSL color mode, different interpolation methods control how hues blend:

#### Clockwise

Clockwise interpolation around the HSV/HSL color wheel.

**Behavior**:
- Always rotates hue clockwise (0° → 360°)
- Shortest path may be clockwise
- Useful for specific hue rotations

#### Counter-Clockwise

Counterclockwise around the HSV/HSL color wheel.

**Behavior**:
- Always rotates hue counterclockwise (360° → 0°)
- Always takes the long way around if needed
- Useful for opposite hue transitions

#### Near

Nearest route around the wheel.

**Behavior**:
- Automatically chooses the shorter path between hues
- If two hues are 350° apart, goes 10° the short way
- Most natural for most color transitions
- Recommended default

#### Far

Furthest route around the wheel.

**Behavior**:
- Automatically chooses the longer path between hues
- Ensures full rotation around the color wheel
- Creates more diverse color transitions
- Useful for special effects

## Active Color Stop

**Display**: Shows an index number and highlights the selected stop with a dashed line

**Function**: Indicates which color stop is currently selected.

**Offers an alternative way of selecting a stop** in case it's so close to other stops that it's hard to select it directly by clicking.

**How to Use**:
1. Look at the "Active Color Stop" field
2. Type a number to jump to that stop (0 for first, increasing by 1)
3. Or click the up/down arrows to cycle through stops

## Position

**Slider and numeric field** that controls the position of the selected color stop in the range.

**Range**: 0.0 (left/start) to 1.0 (right/end)

**Interactions**:
- **Slider**: Drag left/right to adjust position smoothly
- **Numeric field**: Type exact position (e.g., 0.5 for middle)
- **Ctrl-Wheel**: Fine adjustments
- **Tab**: Jump between fields

**Use Cases**:
- Setting precise stop positions
- Creating symmetrical gradients
- Exact color placement

## Color

A color field where you can specify the color and alpha of the selected stop.

**Clicking the field opens the Color Picker** for detailed color selection.

**Features**:
- Color swatch for visual feedback
- Alpha channel support (transparency)
- Click to open Color Picker
- Drag and drop colors to other stops

**Quick Adjustments**:
- Eyedropper (E key) to sample colors
- Direct color input via hex or RGB values
- Alpha slider for transparency control

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **LMB (drag)** | Move color stop left or right |
| **Ctrl-LMB (click)** | Add a new color stop at that position |
| **E** | Activate eyedropper to sample color |
| **Delete/Backspace** | Delete selected stop (with confirmation) |

## Practical Workflows

### Creating a Simple Gradient

1. Start with default (black to white)
2. Select the left stop (black)
3. Click the Color field
4. Choose a color (e.g., blue)
5. Select the right stop (white)
6. Choose another color (e.g., red)
7. Adjust interpolation method if needed
8. Optionally add stops in between

### Creating Discrete Bands

1. Select the color ramp
2. Change interpolation to **Constant**
3. Add multiple stops at desired positions
4. Use **Distribute Stops from Left** for even bands
5. Adjust each stop's color independently

### Sample and Paste Gradients

1. Use Eyedropper to sample from an image or rendered preview
2. Sample multiple points to build a gradient
3. Add stops manually at key positions
4. Fine-tune with color picker

### Symmetric Gradient

1. Create stops at 0.0, 0.5, and 1.0
2. Set left stop color (e.g., blue)
3. Set middle stop to white or neutral
4. Set right stop to the same color as left
5. Adjust interpolation for smooth transitions

## Advanced Tips

### B-Spline vs Linear

- **B-Spline**: Smoother, more artistic, may exceed color range
- **Linear**: Predictable, precise, stays within defined colors

### HSV for Hue Transitions

When transitioning between very different hues (e.g., red to cyan), HSV/HSL modes create more vibrant gradients than RGB.

### Constant Mode for Discrete Effects

Use Constant interpolation with multiple stops to create bands or stepped color transitions (useful for stylized rendering or data visualization).

## Related Documentation

- [Blender UI Color Picker](BLENDER_UI_COLOR_PICKER.md) - Detailed color selection
- [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md) - Color sampling tool
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Position and color input fields
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Add/Delete/Tools buttons
