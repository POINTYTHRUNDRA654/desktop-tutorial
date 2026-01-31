# Blender UI Data-Block Menu

The Data-Block Menu allows you to select a Data-Block (such as a material, texture, or object) in order to link it to something else (such as an object, modifier, or constraint).

## Data-Block Menu Overview

Data-Block Menus are used throughout Blender to manage and assign data-blocks. They provide a unified interface for:
- Selecting existing data-blocks
- Creating new data-blocks
- Managing data-block users
- Previewing data-block contents

A typical Data-Block Menu includes several interactive elements arranged horizontally or vertically.

## Data-Block Menu Components

### Type Icon

Shows an icon indicating the data-block type (material, texture, object, image, etc.). The icon visually identifies what kind of data-block you're working with.

**Interactions**:
- **LMB click the icon**: Opens the popup menu to select from available data-blocks
- **LMB click the down arrow** (next to icon): Also opens the popup menu
- **LMB drag the icon**: Lets you apply the data-block to something else
  - For example, drag a material onto an object in the 3D Viewport to assign it
  - Dragging onto other Data ID fields is also possible

### List / Selection Menu

A dropdown list showing all data-blocks available in the current blend-file. The menu may show:
- **Icons**: Type indicators for each data-block
- **Names**: The data-block name
- **Preview images**: Large preview thumbnails (if the menu supports previews)
- **Search field**: To search and filter items by name

#### Hidden Data-Blocks

Data-blocks with names that begin with `.` (dot) are hidden from the list by default, unless:
- A string that also starts with `.` is entered into the search field
- The **Show Hidden Files/Data-Blocks** user preference is enabled (Edit → Preferences → File Paths)

### Name Field

Displays and allows editing of the name of the selected data-block.

**Interaction**:
- **LMB click and drag**: Select and rename the data-block
- Type a new name to change the data-block's identifier
- Press **Return** to confirm or **Esc** to cancel

### User Count

Displays the number of users (references) of the data. This appears only if there's more than one user.

**Example**: If three separate objects referenced the same material, the material's user count would show `3`. Changing the material would affect all three objects.

**Clicking the user count**: Creates a single-user copy of the data-block. The selected object receives its very own copy of the material, which can be modified independently of the original that's still used by the other two objects.

This is useful for:
- Creating unique copies of shared data-blocks
- Preventing accidental changes to shared materials/textures
- Managing data-block dependencies

### Fake User (Shield Icon)

If a data-block has no real users, it'll normally be cleaned up (deleted) when saving the blend-file. To prevent this, you can give it a **fake user** by clicking the shield icon.

**How It Works**:
- Data-blocks with a fake user have an **"F"** prefix in the drop-down list
- The fake user prevents the data-block from being deleted on save
- Useful for keeping template materials, textures, or other data-blocks for future use

**Related**: The **Outliner** can show an overview of all data-blocks without real users in the blend-file. Simply change its Display Mode to **Orphan Data**.

### New/Add (Files Icon)

Creates a new data-block (or duplicates the current one) and selects it.

**Behavior**:
- Creates a new, unique data-block with default or copied settings
- The new data-block becomes the selected/active one
- You can immediately start editing the new data-block

**Use Cases**:
- Creating a new material from scratch
- Duplicating an existing material to create a variant
- Adding new data-blocks to the scene

### Open File (Folder Icon)

Opens the File Browser, for importing an image, video, or other external file.

**Common Uses**:
- Importing image textures for materials
- Loading external files for shaders
- Linking external data-blocks from other blend-files

### Unpack File (Bin Icon)

Unpack the file packed into the current blend-file to an external one. This extracts embedded files (like images) from the .blend file to a separate external file.

**When to Use**:
- Separating packed resources from the blend-file
- Creating backups of textures and images
- Sharing blend-files with external texture files

### Unlink Data-Block (X Button)

Clears the link and removes the data-block assignment.

**Standard LMB click**: Clears the link but keeps the data-block in the file (if it has other users)

**Shift-LMB click**: Sets the users to zero, allowing the data-block to be fully deleted from the blend-file on the next save

## Data-Block Menu with Preview

Some data-block menus have large preview images in their drop-down instead of just icons and names. These previews make it easier to identify materials, textures, or objects visually.

**Preview Menu Features**:
- Large thumbnail images of materials, textures, or previews
- Easier visual identification compared to icon+text lists
- Often found in material selection, texture selection, and world/environment menus
- Useful when you have many similar-looking data-blocks

## Data ID Field

A Data ID field is similar to a Data Block Menu, but is simplified for **selection only** (without additional features like creating new data or managing users).

### Data ID Components

#### Type Icon

The icon on the left specifies the accepted data-block type. This determines what kinds of data-blocks can be selected.

#### Name Field (Search)

The text field functions as a search field by matching elements in the list.

**Interactions**:
- **Type to search**: Match elements by name
- **Tab**: Auto-complete names up to the level where a match is found
- **If more than one match exists**: Continue typing to narrow the list
- **Invalid name**: The value remains unchanged if you type a name that doesn't exist

This allows quick selection without opening a full dropdown menu.

#### List Selection

Lets you select the data-block directly from a dropdown list (if you prefer browsing to searching).

#### Eyedropper

In some Data IDs there is an **Eyedropper** available through the pipette icon on the right side. This allows you to sample/select data-blocks from the 3D Viewport or other editors. For more details, see [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md).

#### Clear Button

Click the **X** button on the right to clear the reference and remove the data-block assignment.

## ID Sub-Data

Related types of ID sub-data may become available to select, depending on the data-block type and its intended usage. These provide more detailed selection options.

### Vertex Group

If the selected Object in the Target field is a mesh or a lattice, an additional field may be displayed to select one of its vertex groups.

**Use Cases**:
- Selecting a vertex group for modifiers (e.g., Weight Paint for Armature modifier)
- Specifying which vertices are affected by constraints or deformers
- Targeting specific mesh subdivisions

### Bone

If the selected Object in the Target field is an armature, an additional field may be displayed to select one of its bones.

**Use Cases**:
- Specifying which bone controls an object (parenting to bones)
- Setting constraint targets to specific bones
- Creating IK chains with specific bone targets

### Head/Tail

Once a bone is selected, a numeric field may become available for specifying a point along the bone.

**Values**:
- **0.0**: Corresponds to the bone's head (starting point)
- **1.0**: Corresponds to the bone's tail (ending point)
- **0.0 - 1.0**: Any values between these result in linear interpolation
  - **0.5**: Matches the bone's center
  - **0.25**: One quarter along the bone
  - **0.75**: Three quarters along the bone

This allows precise control over which point along the bone's length is used as the constraint target or control point.

### Use B-Bone Shape

If the bone is a bendy bone (B-Bone), clicking on this button will make the point follow the curvature of the B-spline between head and tail, rather than simply going in a straight line.

**How It Works**:
- Without B-Bone Shape: Uses linear interpolation (straight line) between head and tail
- With B-Bone Shape: Follows the actual curvature of the bendy bone's deformation
- Useful for IK chains and constraints on non-rigid bones

**Common Uses**:
- Rigging flexible bones (tails, tentacles, hair)
- Creating constraints that follow the curvature of deformable bones
- Achieving more natural-looking character deformations

## Related Documentation

- [Blender UI Eyedropper](BLENDER_UI_EYEDROPPER.md) - Sampling data-blocks visually
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - General input field types
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Button controls
- [Blender Data System](BLENDER_ABOUT.md) - Information about data-blocks and the data system
