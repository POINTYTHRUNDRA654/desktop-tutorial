# Blender UI Eyedropper

The eyedropper (pipette icon) allows you to sample from anywhere in the Blender window. The eyedropper can be used to select different kinds of data.

## General Eyedropper Usage

### Activation

- **Click eyedropper icon**: Click on the pipette icon next to a compatible property to activate the eyedropper
- **E key**: Press **E** while hovering over a button to activate the eyedropper without clicking the icon

### Sampling

Once the eyedropper is active:
- **LMB click**: Sample a single value/color from the location you click
- **LMB drag**: Drag across the window to mix colors you drag over, which can help when sampling noisy imagery
- **Spacebar**: Reset and start mixing the colors again
- **Esc**: Cancel the eyedropper operation

## Color Sampling

The most common usage of the eyedropper. It is used to sample a pixel's color from anywhere within Blender.

### How It Works

1. Click the eyedropper icon next to a color property (or press **E** while hovering)
2. Move the cursor to any color in the Blender window (viewport, image editor, etc.)
3. **LMB click** to sample the color at that location
4. The sampled color is immediately applied to the color property

### Color Management Consideration

**Important**: The View Transform of the color management affects the color. In order to get consistent results, it should be set to **Standard**. If it's set to any other option, the eyedropper may return an inaccurate color.

To check/change View Transform:
1. Go to Scene Properties
2. Look for Color Management settings
3. Verify View Transform is set to "Standard"

### Sampling Noisy Imagery

When sampling from noisy or textured imagery:
- **LMB drag**: Drag across the area instead of clicking once. This will mix/average the colors you drag over.
- **Spacebar**: Reset the sampling and start mixing again if you want to try a different area

This technique helps to:
- Average out noise and get a cleaner color sample
- Sample from textured areas more accurately
- Reduce the impact of single-pixel variations

## Color Ramp Sampling

Dragging the cursor over the window samples a line which is converted into a color ramp. This is useful for:
- Quickly creating color ramps from image data
- Sampling color gradients from textures or images
- Creating color transitions based on visual elements

### How It Works

1. Click the eyedropper icon next to a color ramp property
2. **LMB drag** across the window in a line
3. The colors along that line are sampled and converted into a color ramp
4. The ramp is applied to the property

## Objects/Object-Data Sampling

This is used with object buttons (such as parent, constraints or modifiers) to select an object from the 3D Viewport or Outliner, rather than having to select it from a drop-down menu.

### How It Works

1. Click the eyedropper icon next to an object property (parent, constraint target, modifier object, etc.)
2. Move to the 3D Viewport or Outliner
3. **LMB click** on the desired object
4. The object is immediately assigned to the property

### Common Uses

- **Setting parents**: Quickly assign a parent object without opening a menu
- **Constraint targets**: Pick objects for object constraints
- **Modifier objects**: Select objects for modifiers that reference other objects
- **Collection references**: Assign collections to properties

### Selection Methods

- **3D Viewport**: Click directly on the object in the viewport
- **Outliner**: Click on the object name in the Outliner panel (often easier when objects overlap in viewport)

## Bones Sampling

This is used when a subtarget to an armature can be chosen. It is possible to choose a bone from the 3D Viewport or from the Outliner.

### Constraints

Only bones that belong to the armature that was chosen as a target can be picked.

### Prerequisites

In the 3D Viewport, bones can only be picked if the armature is in **Pose Mode** or in **Edit Mode**:
- **Pose Mode**: Tab in Object Mode (with armature selected)
- **Edit Mode**: Tab in Pose Mode, or Tab in Object Mode and enter Edit Mode

### How It Works

1. First, ensure a target armature is selected in the parent Armature field (for constraint/modifier)
2. Click the eyedropper icon next to the bone/subtarget property
3. Switch to the armature in Pose or Edit Mode if needed
4. **LMB click** on the bone you want to select
5. The bone is assigned as the subtarget

### Common Uses

- **Inverse Kinematics (IK)**: Targeting specific bones in an armature
- **Copy Location/Rotation Constraints**: Copying transforms from specific bones
- **Parenting to bones**: Assigning objects to specific bones for rigged characters

## Camera Depth Sampling

Number fields affecting distance can also use the eyedropper. This is particularly used to set the camera's depth of field so the depth chosen is in focus.

### How It Works

1. Click the eyedropper icon next to a distance/depth property in camera settings
2. Look through the camera view or 3D Viewport
3. **LMB click** on an object or location at the distance you want in focus
4. The depth value is sampled and applied to the property

### Common Uses

- **Depth of Field Focus Distance**: Clicking on an object to set the focus distance
- **Clipping distance**: Setting near/far clipping plane distances
- **Camera properties**: Any distance-based camera setting

### Depth of Field Workflow

1. Enable Depth of Field in camera properties
2. Use the eyedropper on the Focus Distance property
3. Click on the object you want in focus in the viewport
4. The camera automatically calculates the distance and sets it as focus distance

## Advanced Eyedropper Tips

### Mixing Colors from Multiple Areas

When sampling noisy textures or trying to get an average color:
1. Click eyedropper to activate
2. **LMB drag** across the area, moving over multiple colors
3. The eyedropper automatically mixes/averages all colors under the cursor
4. **Spacebar** resets the mixing if you want to start over on a different area
5. **LMB click** to finalize the sampled color

### Quick Activation with E Key

Instead of clicking the eyedropper icon, you can:
1. Hover the mouse over the property field
2. Press **E** to instantly activate the eyedropper
3. Sample immediately without extra clicks

This is faster for repeated sampling operations.

### Sampling Across Windows

The eyedropper can sample from:
- 3D Viewport
- Image Editor
- Shader Editor (node colors)
- Compositor
- Any Blender window content
- The rendered viewport

This makes it easy to match colors across different editors.

## Related Documentation

- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Button controls and operations
- [Blender UI Color Picker](BLENDER_UI_COLOR_PICKER.md) - Detailed color selection tool
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Text and number input fields
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts and customization
