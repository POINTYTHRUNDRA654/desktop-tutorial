# Blender UI Color Picker

The Color Picker is a pop-up control that allows you to define and adjust color values. It appears when editing any color property in Blender, such as materials, lights, brushes, or interface themes.

The color picker provides multiple color models and interaction modes to suit different workflows, and can display or edit colors in both linear and perceptual (display-referred) color spaces.

## Overview

The Color Picker is a comprehensive tool for selecting and fine-tuning colors. It provides:
- Multiple picker types for different workflows
- Support for multiple color models (RGB, HSV, HSL)
- Linear and perceptual color space options
- Numeric input fields for exact values
- Hexadecimal color input
- Eyedropper tool for sampling colors
- Alpha channel support

## Interface

### Color Field

The large color field lets you pick two color components at once, depending on the selected picker type. The third component (such as value or saturation) is controlled with a slider next to the color field.

The picker's appearance and behavior depend on the type chosen in the Preferences; see [Picker Types](#picker-types) below.

### Value/Lightness Slider

The vertical slider with a gradient background defines the brightness or lightness of the selected color.

**Interactions**:
- **Click and drag the handle**: Adjust the value/lightness smoothly
- **Wheel**: Scroll up/down for fine adjustments
- **Backspace**: Reset to the default value

## Color Spaces

The color picker can display values in different color spaces to suit your needs.

### Linear

**Displays color component values in the scene's linear working color space** used internally for rendering and compositing.

**When to Use**:
- Working with render-accurate colors
- Compositing and color grading
- Creating consistent textures
- Technical color work

**Characteristics**:
- Values represent physical light energy
- Less intuitive for user selection
- Matches how Blender stores colors internally
- More technical and precise

### Perceptual

**Displays color component values in the color picking space** (sRGB by default), which matches the visual appearance of the color widgets and is more intuitive for user selection.

**When to Use**:
- General material color selection
- User interface themes
- Visual color matching
- Intuitive color picking

**Characteristics**:
- Values represent perceived brightness
- Matches what you see on your display
- More intuitive and user-friendly
- Better for visual design work

## Color Models

Different color models offer different ways to think about and adjust colors.

### RGB (Red, Green, Blue)

Defines a color by directly mixing Red, Green, and Blue components.

**Components**:
- **Red (R)**: 0.0 (no red) to 1.0 (full red)
- **Green (G)**: 0.0 (no green) to 1.0 (full green)
- **Blue (B)**: 0.0 (no blue) to 1.0 (full blue)

**Use Cases**:
- Additive color mixing
- Technical color specification
- Color space conversions
- Light colors and emissive materials

**Examples**:
- Pure Red: (1.0, 0.0, 0.0)
- Pure Green: (0.0, 1.0, 0.0)
- Pure Blue: (0.0, 0.0, 1.0)
- White: (1.0, 1.0, 1.0)
- Black: (0.0, 0.0, 0.0)

### HSV (Hue, Saturation, Value)

Defines a color by adjusting Hue, Saturation, and Value. Useful for adjusting color tone and intensity independently.

**Components**:
- **Hue (H)**: Color wheel position (0-360° or 0.0-1.0), the type of color
- **Saturation (S)**: Intensity of the color (0.0 = grayscale, 1.0 = fully saturated)
- **Value (V)**: Brightness of the color (0.0 = black, 1.0 = full brightness)

**Use Cases**:
- Intuitive color selection
- Adjusting color tone independently
- Creating color variations
- UI color selection

**Workflow**:
1. Set Hue to the desired color (e.g., red, blue, green)
2. Adjust Saturation for intensity
3. Adjust Value for brightness

### HSL (Hue, Saturation, Lightness)

Similar to HSV but uses Lightness instead of Value for the brightness component.

**Components**:
- **Hue (H)**: Color wheel position (0-360° or 0.0-1.0)
- **Saturation (S)**: Color intensity (0.0 = grayscale, 1.0 = fully saturated)
- **Lightness (L)**: Perceived brightness (0.0 = black, 0.5 = full color, 1.0 = white)

**Differences from HSV**:
- HSL's Lightness is more perceptually uniform than HSV's Value
- At 50% Lightness, colors appear at their most natural saturation
- HSL may be more intuitive for some workflows

## Component Values

The numeric fields below the picker show the component values (RGB or HSV/HSL). **Blender expresses these in the range 0.0 to 1.0**.

**Numeric Input**:
- **Click and drag**: Adjust values smoothly
- **Type directly**: Enter exact values (e.g., `0.5`, `1.0`)
- **Press Return**: Confirm the value
- **Press Esc**: Cancel editing

**Converting from 8-bit (0-255) to Blender (0.0-1.0)**:
- Divide the 8-bit value by 255
- Example: 128 → 128/255 ≈ 0.502

### Alpha Channel

For color inputs that include an **Alpha Channel**, an additional slider and field are shown.

**Alpha Values**:
- **0.0**: Fully transparent
- **1.0**: Fully opaque
- **0.0 - 1.0**: Various levels of transparency

## Hex Color Input

Displays or accepts the color's hexadecimal (hex) representation.

### Hex Format

**Standard Hex**: `#RRGGBB` (e.g., `#FF5733`)
- Two hex digits per color channel (Red, Green, Blue)
- Range: 00 to FF for each channel

**Hex Shorthand**: Can use shorthand notation (e.g., `FC0` for `FFCC00`)
- Single hex digit per channel is doubled (F → FF, C → CC, 0 → 00)

### Hex Input

- **Click the hex field**: Enter a hex color code
- **Paste from clipboard**: Ctrl-V to paste a hex code
- **Tab/Return**: Apply the hex color
- **Esc**: Cancel

**Examples**:
- `#FFFFFF` or `FFF` = White
- `#000000` or `000` = Black
- `#FF0000` or `F00` = Pure Red
- `#00FF00` or `0F0` = Pure Green
- `#0000FF` or `00F` = Pure Blue
- `#FFFF00` or `FF0` = Yellow

### Note: Gamma Correction

Hex values are automatically **Gamma-corrected for the sRGB Color Space**. This means the hex value displayed represents the sRGB color, not the linear color space value. For more information, see Color Management section.

## Eyedropper

The **Eyedropper** tool (pipette icon) samples a color from anywhere inside the Blender window.

**How to Use**:
1. Click the Eyedropper icon in the color picker
2. Move the cursor to any color in Blender
3. **LMB click** to sample that color
4. The sampled color is immediately applied to the color field

**Important Notes**:
- Sampled colors are read in **linear color space**, so they do not account for display transformations such as view or exposure adjustments
- Sampling colors from overlays, reference images, or video preview regions may be inaccurate since those may be drawn after color management transforms

For more details, see [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl-LMB (drag)** | Snap hue to 30° intervals (useful for picking standard colors) |
| **Shift-LMB (drag)** | Fine-tune color movement for precise adjustments |
| **Wheel** | Adjust value or lightness (scroll up/down) |
| **Backspace** | Reset the current value to its default |

## Picker Types

The Color Picker Type determines how colors are visualized and selected. Different picker types offer alternative layouts for adjusting hue, saturation, and value components. The choice is a matter of personal preference and workflow.

**Set Default Picker Type**: Edit → Preferences → Interface → Color Picker Type

### Circle HSV

**Layout**: Circular hue wheel with saturation/value in the center

**Characteristics**:
- Intuitive hue selection around the circle
- Saturation increases toward the center
- Value controlled by the side slider
- Natural workflow for hue-first selection

**Best For**: Users who think in terms of "pick a hue, then adjust saturation and brightness"

### Circle HSL

**Layout**: Circular hue wheel with saturation/lightness in the center

**Characteristics**:
- Similar to Circle HSV but uses Lightness instead of Value
- Perceptually more uniform
- Center of circle shows desaturated colors
- Good for intuitive color selection

**Best For**: Users who prefer HSL's lightness model over HSV's value

### Square (SV + H)

**Layout**: Square saturation/value field with hue slider on the side

**Characteristics**:
- Large square for precise saturation and value selection
- Hue controlled by the vertical slider
- Good for detailed color adjustments
- Efficient use of space

**Best For**: Fine-tuning saturation and value with precise control

### Square (HS + V)

**Layout**: Square hue/saturation field with value slider on the side

**Characteristics**:
- Large square for hue and saturation selection
- Value controlled by the vertical slider
- Good for hue and saturation adjustments
- Efficient layout

**Best For**: Focusing on hue and saturation adjustments

### Square (HV + S)

**Layout**: Square hue/value field with saturation slider on the side

**Characteristics**:
- Large square for hue and value selection
- Saturation controlled by the vertical slider
- Useful for brightness-focused workflows
- Clean layout

**Best For**: Workflows focused on brightness and hue adjustments

## Color Management Notes

### Internal Color Space

Blender internally works in **linear color space**; conversions from sRGB or other spaces happen automatically.

**How It Works**:
1. When you input a color in sRGB (Perceptual mode), Blender converts it to linear
2. The linear value is stored and used for rendering
3. The color picker displays the sRGB representation for visual consistency
4. When rendered, the linear values are used for accurate lighting calculations

### Display Transform

The color picker displays the color **as it appears in the current view transform**, but the stored value remains **linear**.

**View Transform Options** (in Scene Properties):
- **Standard**: Default color display (recommended for most work)
- **Filmic**: Cinematic rendering simulation
- **Raw**: Direct linear values

For consistent results across renders and display devices, see Color Management in Preferences.

## Practical Workflows

### Quick Color Selection (Circle HSV)

1. Click the color picker icon next to a color property
2. Click around the hue circle to select the desired color type
3. Click in the center area to adjust saturation and value
4. Use the side slider for brightness fine-tuning

### Hex Color Input (Fast Method)

1. Click the color picker icon
2. Click the Hex field
3. Paste a hex color code (Ctrl-V) or type one
4. Press Return to apply

### Eyedropper Sampling

1. Click the color picker icon
2. Click the Eyedropper icon
3. Click on any color in Blender to sample it
4. The sampled color is instantly applied

### Fine Adjustments (Shift-LMB)

1. In the color field, hold Shift
2. Click and drag slowly for precise color adjustments
3. Release to confirm

## Related Documentation

- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Numeric color input fields
- [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md) - Color sampling tool
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Color field buttons
- [Blender Preferences](BLENDER_PREFERENCES.md) - Color picker type and display settings
