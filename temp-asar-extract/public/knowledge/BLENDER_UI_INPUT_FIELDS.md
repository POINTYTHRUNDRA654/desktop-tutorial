# Blender UI Input Fields

This document covers the various input field types used throughout Blender's interface for entering and editing data.

## Text & Search Fields

Text fields show a rounded rectangular border, and optionally an icon and/or text inside the border. Text fields store text strings, and provide the means to edit text by standard text editing shortcuts.

### Text Editing Shortcuts

| Shortcut | Action |
|----------|--------|
| **Home** | Go to the start of the line |
| **End** | Go to the end of the line |
| **Left, Right** | Move the cursor a single character |
| **Ctrl-Left, Ctrl-Right** | Move the cursor an entire word |
| **Backspace, Delete** | Delete characters |
| **Ctrl-Backspace, Ctrl-Delete** | Delete words |
| **Shift** | Select while holding the key and moving the cursor |
| **Ctrl-A** | Select all text |
| **Ctrl-C** | Copy the selected text |
| **Ctrl-X** | Cut the selected text |
| **Ctrl-V** | Paste text at the cursor position |

### Search Fields

Search fields are specialized text fields used for filtering content in lists, menus, and panels. They typically include:
- A text input area
- Optional magnifying glass icon
- Optional clear button (X)
- Real-time filtering as you type

For text fields with an icon and pop-ups, see [Data ID](#data-block-menu).

## Number Fields

Number fields store values and units. There are two primary types:

### Standard Number Fields

The first type of number field shows triangles pointing left (<) and right (>) on the sides of the field when the mouse pointer is over the field. These allow for increment/decrement operations.

### Slider Fields

Sliders, a second type of number field, have a colored bar in the background to display values over a range, e.g. percentage values. The colored bar provides visual feedback of the current value within the allowed range.

### Editing Values

The value can be edited in several ways:

#### Incremental Steps

To change the value in unit steps, click **LMB** on the small triangles (not available for sliders). You can also use **Ctrl-Wheel** while hovering over the field to edit the value.

This is useful for:
- Making small adjustments without typing
- Quickly cycling through values
- Fine-tuning without dragging

#### Dragging

To change the value with the mouse, hold down **LMB** and drag to the left (decrease) or right (increase).

**Modifiers while dragging**:
- **Ctrl**: Snap to discrete steps while dragging
- **Shift**: Precision input (slower, more fine-grained adjustments)
- **Ctrl-Shift**: Combine both for maximum precision with snapping

#### Keyboard Input

Press **LMB** or **Return** to enter a value by typing it with the keyboard.

When entering values by keyboard, number fields work like text fields:
- **Return** or **LMB outside the field**: Apply the change
- **Esc** or **RMB**: Cancel the edit
- **Tab**: Jump to the next field
- **Shift-Tab**: Jump to the previous field
- **Minus** (while hovering): Negate the value

### Multi-Value Editing

You can edit multiple number fields at once by pressing down **LMB** on the first field, then dragging vertically over the fields you want to edit. Finally you can either:
- Drag left or right to adjust the value with the mouse
- Release LMB and type in a value to apply to all selected fields

This is particularly useful for:
- Setting multiple transform values at once (e.g., scale X, Y, Z)
- Adjusting multiple properties in sequence
- Batch editing object or modifier properties

### Value Limits

Most numerical values are restricted by two limit ranges:

- **Soft Limits**: The typical expected range for a value. Changing values by dragging with the mouse is restricted to this range.
- **Hard Limits**: The absolute maximum range allowed. Input via keyboard will allow use of wider value ranges, but never wider than the hard limit.

This prevents accidental out-of-range values while still allowing advanced users to input extreme values when needed via keyboard.

### Expressions

You can enter mathematical expressions into any number field. For example:
- `3*2` instead of `6`
- `10/5+4` instead of `6`
- Constants like `pi` (3.142)
- Functions like `sqrt(2)` (square root of 2)

**Available Math Functions** (via Python Math module):
- Basic: `+`, `-`, `*`, `/`, `//`, `%`, `**`
- Functions: `sqrt()`, `sin()`, `cos()`, `tan()`, `log()`, `log10()`, `exp()`, `pow()`, `fabs()`
- Constants: `pi`, `e`

#### Expressions as Drivers

You may want your expression to be re-evaluated after it is entered. Blender supports this using Drivers (a feature of the animation system).

Expressions beginning with `#` have a special use. Instead of evaluating the value and discarding the expression, a driver is added to the property with the expression entered.

**Examples**:
- `#frame` - Quick way to map a value to the current frame
- `#fmod(frame, 24) / 24` - More complex driver expressions
- `#frame * 0.5` - Frame divided by 2 for slow-motion effects

This is simply a convenient shortcut to add drivers which can also be added via the RMB menu. See [Animation & Drivers](BLENDER_KEYMAP.md) for more details.

### Units

As well as expressions, you can specify numbers and units. If no unit is given, then a default unit is applied. The unit system can be changed in scene settings.

You can use either the unit abbreviation or the full name after the value.

#### Length Units Examples

Valid usage of length units include:
- `1cm` - One centimeter
- `1m 3mm` - One meter and three millimeters
- `1m, 3mm` - Alternative formatting (comma separated)
- `2ft` - Two feet
- `3ft/0.5km` - Three feet divided by half a kilometer
- `2.2mm + 5' / 3" - 2yards` - Mixed units (millimeters, feet, inches, yards)

#### Unit Guidelines

- **Decimal separator**: Optional
- **Mixing units**: You can mix units (metric and imperial) even though you can only show one at a time in the interface
- **Plurals**: Recognized, so both `meter` and `meters` can be used
- **Supported units**:
  - **Metric**: mm, cm, m, km
  - **Imperial**: ' (feet), " (inches), yard, mile
  - **Others**: Blender supports angle units (°, rad) and time units (frame)

## Color Fields

Color fields store color values. Clicking on them with **LMB** opens the Color Picker.

### Color Field Display

Color fields with an alpha channel are divided in half:
- **Left side**: Shows the color without alpha channel
- **Right side**: Shows the color with alpha channel over a checker pattern (indicating transparency)

### Color Field Operations

**Interactions**:
- **LMB click**: Opens the Color Picker for detailed color selection
- **Drag and drop**: Colors can be copied to other color fields by dragging the color swatch and dropping it on another color field

### Color Value Preview

Hovering over a color property displays a large swatch preview of the color and the color's values in multiple formats:
- **Hexadecimal**: #RRGGBB or #RRGGBBAA (e.g., #FF5733)
- **RGBA**: Red, Green, Blue, Alpha (0-1 or 0-255 depending on context)
- **HSVA**: Hue, Saturation, Value, Alpha (HSV color space)

This preview is useful for:
- Checking exact color values
- Copying hex codes for use in other software
- Understanding color values in different representations
- Verifying transparency/alpha values

## Related Documentation

- [Blender UI Menus](BLENDER_UI_MENUS.md) - Drop-down and context menus
- [Blender UI Color Picker](BLENDER_UI_COLOR_PICKER.md) - Detailed color selection tool
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Button controls and operations
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts and customization
- [Blender Preferences](BLENDER_PREFERENCES.md) - Unit system and display settings
