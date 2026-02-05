# Blender UI Decorators

Decorators are small buttons that appear to the right of other buttons and show the state of the property. Decorators may appear next to number fields, menus, and checkboxes to indicate the property can be animated or is controlled by a driver.

## Overview

Decorators provide visual feedback about the current state of a property without requiring you to open additional panels or menus. They appear as small icons to the right of properties and instantly communicate whether a property is:
- Keyframed (animated)
- Driven by an expression or driver
- Has keyframes on other frames

This makes it quick and easy to glance over properties and see their state at a glance.

## Keyframe Decorators

The most common decorator type shows the keyframe state of a property.

### Keyframe States

**Solid Rhombus (Diamond) Icon**: A solid, filled diamond icon indicates there is a keyframe on the current frame for this property. The property value at this frame is locked in the animation.

**Non-Solid (Hollow) Rhombus Icon**: A hollow diamond icon indicates that the property has a keyframe on another frame, but not on the current frame. This shows that the property is animated, but the current frame doesn't have a keyframe set.

**No Icon**: No decorator indicates the property has no keyframes and is not animated.

### Keyframe Operations

#### Add/Remove Keyframe

**LMB click on the solid rhombus icon**: Remove the keyframe from the current frame. The icon becomes hollow (if keyframes exist on other frames) or disappears entirely (if this was the only keyframe).

**LMB click on the hollow rhombus icon**: Create a new keyframe on the current frame with the current property value. The icon becomes solid, indicating a keyframe now exists on this frame.

**LMB click on empty decorator area**: Add a keyframe to the current frame if one doesn't exist. This is the same as clicking the hollow icon.

### Workflow Tips

- **Quick Keyframing**: Use the decorator to quickly add/remove keyframes without opening the Graph Editor or Timeline
- **Animation Status Check**: Glance at decorators to see which properties are animated in your scene
- **Property Overview**: Scan a properties panel to quickly identify which values are keyframed
- **Current Frame Indicator**: The decorator visually shows if the current frame has a keyframe, helping you understand your animation timeline

#### Keyframing Example Workflow

1. Set your desired frame in the Timeline
2. Adjust a property value (e.g., object location, material color)
3. **LMB click the decorator** to add a keyframe
4. Move to another frame
5. Adjust the property value again
6. Click the decorator to add another keyframe
7. Play animation to see the interpolated motion between keyframes

## Driver Decorators

If a property is being driven by another (via a Driver expression), the decorator shows a special **driver icon** (typically a chain or link symbol).

### Driver Indicators

**Chain/Link Icon**: Shows that this property is controlled by a driver expression. The property value is calculated based on the driver expression, not directly editable in the usual way.

When a property has a driver:
- The value displayed is read-only and calculated from the driver expression
- You cannot manually keyframe the property while a driver is active (you must remove or disable the driver first)
- The decorator indicates the property is under external control

### Driver Operations

**RMB click on driver decorator**: Opens context menu with driver options:
- Remove Driver
- Copy Driver
- Paste Driver
- Modify Driver Expression
- View in Graph Editor (sometimes)

### Driver Examples

- **Camera Depth of Field**: Driven by distance to an object
- **Constraint Influence**: Driven by an animated value
- **Material Properties**: Driven by scene time or object properties
- **Custom Animations**: Driven by frame-based expressions

## Decorator State Colors

Decorators can appear in different colors depending on the property state and Blender's color theme. These colors provide additional visual information:

- **Orange/Gold**: Often indicates an animated property or active keyframe
- **Green**: May indicate a driver is active
- **Gray/Default**: Indicates no keyframe or driver on this frame
- **White/Highlighted**: May indicate the property is selected or focused

The exact colors depend on your selected theme, but the consistent coloring helps you quickly scan properties for their states.

## Common Property Types with Decorators

Decorators can appear next to:
- **Number Fields**: Location, rotation, scale, custom properties with numeric values
- **Menus/Dropdowns**: Mode selection, blend mode, constraint type (when animatable)
- **Checkboxes/Toggles**: Visibility, render influence, constraint enabled state
- **Color Fields**: Material colors, light colors, any color property in animation context
- **Vector Properties**: Normals, directions, any vector value in animation context

## Practical Use Cases

### Animation Setup

1. Select an object in the 3D Viewport
2. Go to Object Properties panel
3. Look at the Location property decorators
4. Click the decorators to keyframe location at frame 1
5. Move to frame 120
6. Adjust location and keyframe again
7. Decorators show which frames have keyframes

### Driven Properties

1. Set up a driver on a property (e.g., material transparency driven by object distance)
2. The decorator shows a driver icon
3. At a glance, you know the property is controlled by a driver
4. Right-click the decorator to manage the driver

### Quick Property Scan

1. Open Properties panel with many properties (e.g., modifier stack, material settings)
2. Look at the decorators on the right
3. Instantly see which properties are keyframed vs. static
4. Decide which properties need animation adjustments

## Related Documentation

- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Properties that use decorators
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Other UI controls
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts for animation
- [Blender Animation System](BLENDER_KEYMAP_DEFAULT.md#animation) - Animation keyframing shortcuts
