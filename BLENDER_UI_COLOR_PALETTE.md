# Blender UI Color Palette

Color Palettes are a way of storing a brush's color so that it can be used at a later time. This is useful when working with several colors at once during painting, sculpting, or other brush-based workflows.

## Overview

Color Palettes enable you to:
- Save frequently used colors for quick access
- Organize colors for specific projects or art styles
- Switch between colors without opening the color picker
- Maintain consistent color sets across multiple projects
- Share color palettes with team members

Palettes are primarily used in:
- Painting (brush colors)
- Texture painting
- Sculpting
- Any brush-based workflow

## Interface Components

### Palette Selector

A Data-Block Menu to select an active palette.

**Features**:
- Browse available palettes in the current or linked blend-files
- Create new palettes
- Delete palettes
- Rename palettes
- Link to external palettes

**How to Use**:
1. Click the palette selector dropdown
2. Choose an existing palette or create a new one
3. The selected palette becomes active
4. Colors in the palette are now available in the color list below

## Palette Management Buttons

### New Palette Color

**Icon**: Plus (+) button on the left

**Function**: Adds the current brush's primary Color to the palette.

**How It Works**:
1. Set your brush's primary color (via Color Picker or Color Palette)
2. Click the "New Palette Color" button
3. The current color is added to the end of the palette
4. The new color is immediately available for reuse

**Use Cases**:
- Sampling a color from a texture or rendered image and saving it
- Creating a color set as you work
- Building a palette organically during a project
- Storing colors for future sessions

### Delete Palette Color

**Icon**: Minus (-) button

**Function**: Removes the currently selected color from the palette.

**Behavior**:
- The selected color in the list is deleted
- Other colors remain unchanged
- Cannot be undone after deselecting (use Ctrl-Z immediately if needed)

**Use Cases**:
- Removing colors you no longer need
- Cleaning up a crowded palette
- Removing duplicates or mistakes

### Move Palette Color

**Icons**: Up arrow (↑) and Down arrow (↓) buttons

**Function**: Moves the selected color up or down one position in the list.

**How It Works**:
- **Move Up (↑)**: Shifts the color earlier in the list
- **Move Down (↓)**: Shifts the color later in the list
- The order is purely organizational and doesn't affect function

**Use Cases**:
- Organizing colors by frequency of use
- Grouping related colors together
- Creating a custom ordering system
- Placing important colors at the top for quick access

## Sorting Options

### Sort By Button

**Icon**: Menu icon (sorting arrows or similar)

**Function**: Sort the colors in the palette by different criteria.

**Available Sort Methods**:

#### Hue

Sorts colors by their position on the color wheel (0° to 360°).

**Order**:
- Red → Orange → Yellow → Green → Cyan → Blue → Magenta → Red
- Creates a rainbow-like color spectrum
- Good for understanding color relationships

#### Saturation

Sorts colors by their color intensity.

**Order**:
- Grayscale colors first (lowest saturation)
- Increasingly vivid colors
- Fully saturated colors last
- Useful for organizing by color intensity

#### Value

Sorts colors by their brightness.

**Order**:
- Darkest colors first
- Progressively lighter colors
- Brightest colors last
- Good for understanding tonal values

#### Luminance

Sorts colors by their perceived brightness (perceptually uniform).

**Order**:
- Darkest colors first
- Progressively lighter colors
- Brightest colors last
- Similar to Value but accounts for human perception (green appears brighter than red at same value)

## Color List

Each color that belongs to the palette is presented in a list below the controls.

**Display**:
- Color swatches showing each color
- Color names (if assigned)
- One color is highlighted as selected
- Scrollable if palette contains many colors

### Selecting a Color from the Palette

**LMB click on a color in the list**: Change the brush's primary color to that color.

**Effect**:
- The color becomes the active brush color
- The swatch becomes highlighted
- Your current brush now uses that color

**Workflow**:
1. Have your brush tool active
2. Click a color in the palette
3. Start painting/brushing with that color
4. Switch to another palette color by clicking
5. Continue working

### Editing Palette Colors

**Ctrl-LMB click on a color**: Open the color picker to change that color.

**How It Works**:
1. Ctrl-LMB on any color in the palette
2. The Color Picker opens with that color's current value
3. Adjust the color as desired
4. Close the picker to apply the change
5. The color in the palette updates immediately

**Use Cases**:
- Fine-tuning palette colors
- Adjusting saturation or brightness of stored colors
- Matching colors to references
- Creating color variations

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **LMB (click color)** | Switch brush color to that palette color |
| **Ctrl-LMB (click color)** | Open Color Picker to edit that color |
| **Backspace** | Reset the color to its default value |

## Workflow Examples

### Creating a Custom Palette

1. **Switch to Painting Mode or Brush Tool**
   - Tab to enter Painting workspace or select a brush tool

2. **Create New Palette**
   - Open Palette selector
   - Click + or "New"
   - Enter a name (e.g., "Project_Skin_Tones")

3. **Sample and Store Colors**
   - Use Color Picker to select a color
   - Click "New Palette Color" to add it
   - Repeat for each color you want to save
   - The palette builds as you work

4. **Organize**
   - Click "Sort By" → Hue to organize by color
   - Use Move Up/Down to fine-tune order
   - Delete any unwanted colors

5. **Use During Work**
   - Click palette colors to quickly switch brush colors
   - Work without constantly adjusting the color picker

### Sampling Colors from an Image

1. **Have a reference image loaded** (in viewport or image editor)

2. **Select a base color**
   - Use eyedropper (E key) in Color Picker
   - Sample from the reference image
   - Click "New Palette Color" to save it

3. **Repeat for key colors**
   - Sample different tones and hues
   - Build a palette matching your reference

4. **Fine-tune if needed**
   - Ctrl-LMB any color to adjust it
   - Create variations by slight adjustments

### Sharing Palettes

1. **Export Palette**
   - Save your palette-containing blend-file
   - The palette is saved as a data-block

2. **Import into New File**
   - Open a new project
   - Use Palette selector "Link" or "Append" features
   - Access saved palettes from previous projects

## Palette File Organization

### Local Palettes

Stored in the current blend-file, accessible only when that file is open.

### Linked Palettes

Can be linked from other blend-files or external palette files (if supported by Blender version).

## Integration with Painting Tools

Palettes are primarily used with:
- **Texture Paint**: Brush color selection
- **Sculpting**: Color for material preview
- **Painting**: Brush primary color

The palette color becomes the active brush color, affecting all brush strokes until changed.

## Related Documentation

- [Blender UI Color Picker](BLENDER_UI_COLOR_PICKER.md) - Detailed color selection (Ctrl-LMB)
- [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md) - Color sampling
- [Blender UI Data-Block Menu](BLENDER_UI_DATA_BLOCK_MENU.md) - Palette selection
- [Blender UI List View](BLENDER_UI_LIST_VIEW.md) - Color list management
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Color value adjustments
