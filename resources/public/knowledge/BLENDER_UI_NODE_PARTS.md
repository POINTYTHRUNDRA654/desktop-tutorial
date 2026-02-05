# Blender Node Parts

## Overview

All nodes in Blender share a common anatomical structure regardless of type (Shader, Geometry, Compositor, or Texture). Understanding node parts is essential for building effective node graphs. Each node consists of a title bar, sockets for data flow, preview capabilities, and editable properties.

**Node Structure:**
- Title bar with node name and controls
- Optional preview display
- Input sockets (left side)
- Output sockets (right side)
- Properties and settings panel

## Title Bar

The title bar appears at the top of every node and displays key information and controls.

### Title and Node Name

**Display:**
- Shows node name/type (e.g., "Mix Shader", "Math", "Noise Texture")
- Name can be overridden with custom label
- Display matches node icon in Add menu

**Label Override:**
- Edit label in Sidebar ‣ Node ‣ Label
- Custom label shows on node instead of node type
- Useful for documenting node purpose
- Label doesn't affect node functionality

**Use Cases:**
- "Base Color Texture" instead of "Image Texture"
- "Strength Multiplier" instead of "Math (Multiply)"
- Custom workflow documentation
- Complex graph clarity

### Collapse Toggle

**Location:** Left side of title bar

**Purpose:** Hide/show node contents to reduce visual clutter

**Activation:**
- Click collapse arrow on left of title
- Or press `H` with node selected
- Again to expand/show contents

**Appearance:**
- Collapsed node shows title only
- Connections remain visible
- Sockets hidden but still functional
- Shows as compact line/dot

**When to Collapse:**
- Reduce visual clutter in large graphs
- Hide completed sections
- Focus on main workflow
- Organize complex setups visually

**Data Preservation:**
- Collapsing doesn't affect node function
- Values stored even when hidden
- Can reconnect collapsed nodes normally

## Preview

Previews display a small image showing the node's output result, available on nodes that generate visual data.

### Preview Display

**Location:** Top right of node, above title

**Appearance:**
- Small thumbnail image
- Shows live result of node
- Updates as inputs change
- Visual feedback of node state

**Toggle Icons:**
- "/" icons in top right corner
- First icon toggles node preview
- Preview overlay toggle affects all previews
- Click to enable/disable for specific node

**Supported Nodes:**
- Texture nodes (Noise, Gradient, etc.)
- Color nodes
- Image/Texture input nodes
- Some geometry nodes
- Not all nodes support previews

### Preview Settings

**Global Preview Toggle:**
- View ‣ Overlays ‣ Previews
- Toggle all node previews on/off
- Useful for performance in large graphs
- Individual previews can still be toggled

**Performance Considerations:**
- Previews use GPU/CPU resources
- Many previews can slow viewport
- Disable for complex scenes
- Enable selectively for detailed work

**Use Cases:**
- Verify texture appearance while editing
- Check color output live
- Debug node results mid-graph
- Quick visual feedback

## Sockets

Sockets are the connection points for data flowing into and out of nodes. Each socket is color-coded by data type and can only accept compatible data.

### Socket Basics

**Input Sockets:**
- Located on left side of node
- Accept data from other nodes
- Can have default values when disconnected
- Edit with slider, field, or picker

**Output Sockets:**
- Located on right side of node
- Send processed data to other nodes
- Can't have default values (output only)
- Connected to downstream nodes

**Socket Appearance:**
- Color indicates data type
- Shape indicates data structure
- Circle indicates standard socket
- Special shapes for fields, bundles, grids

**Hiding Unused Sockets:**
- Select node and press `Ctrl-H`
- Hides disconnected sockets
- Reduces visual clutter
- Can be shown again with Ctrl-H

## Socket Data Types

Each socket color represents a specific data type. Understanding colors prevents connection errors.

### Built-in Data Types

#### Shader (Bright Green)

**Purpose:** Carries shader information for rendering

**Used in:**
- Shader Editor (Cycles/EEVEE)
- Final material definition
- Shader output sockets only

**Connection:**
- Only connects to shader inputs (Principled BSDF, etc.)
- Can't connect to color or other data types
- Represents complete material definition

#### Geometry (Sea Green)

**Purpose:** Carries 3D geometry data

**Used in:**
- Geometry Nodes
- Procedural modeling systems
- Complex geometry operations

**Data Includes:**
- Mesh topology
- Point/vertex positions
- Face/edge definitions
- Attributes and data attached to geometry

#### Menu (Dark Grey)

**Purpose:** Dropdown/selection inputs

**Behavior:**
- Shows as dropdown or radio button
- Limited selection options
- Examples: Blend mode selection, axis choice
- Custom interface for specific choices

#### Bundle (Dark Turquoise)

**Purpose:** Generic container for multiple data types

**Characteristics:**
- Can contain mixed data types
- Compact data transfer
- Groups related values
- Flexible data bundling

#### Closure (Light Brown)

**Purpose:** Encapsulates logic and procedures

**Used in:**
- Shader Nodes (Cycles)
- Geometry Nodes for procedural logic
- Reusable "callable" behaviors

**Function:**
- Stores groups of inputs and logic
- Enables procedural encapsulation
- Allows reusable node patterns

### Data Socket Types

#### Boolean (Light Pink)

**Purpose:** True/false values

**Uses:**
- Conditional switches
- On/off toggles
- Binary decisions

**Input Interface:**
- Checkbox (when input)
- True/False display (output)

#### Color (Yellow)

**Purpose:** Color information with RGB or RGBA

**Alpha Handling:**
- May or may not include alpha channel
- Depends on node tree type
- Shader: RGB typically
- Compositor: Often RGBA

**Default Input:**
- Color picker button
- Shows current color
- Click to open picker

#### Float (Light Gray)

**Purpose:** Decimal numbers

**Range:**
- Can be any floating-point value
- Positive or negative
- Examples: 0.5, -3.14, 100.0

**Input Interface:**
- Slider (if limited range)
- Number field
- Draggable number input

#### Integer (Lime Green)

**Purpose:** Whole numbers without decimals

**Uses:**
- Vertex counts
- Array counts
- Indices and offsets

**Input Interface:**
- Number spinner
- Integer-only field
- Discrete slider

#### String (Light Blue)

**Purpose:** Text values

**Uses:**
- Naming outputs
- Attribute names
- File paths (in some nodes)

**Input Interface:**
- Text input field
- Custom text entry

#### Vector (Dark Blue)

**Purpose:** Directional or positional data with X, Y, Z components

**Vector Variants:**

**2D Vector (XY only):**
- Two components
- Used for 2D coordinates
- Often for UV mapping

**3D Vector (XYZ):**
- Three components
- Standard 3D position/direction
- Normals, positions, offsets

**4D Vector (XYZW):**
- Four components
- Includes W (often for homogeneous coordinates)
- Used for quaternions and transformations

**Input Interface:**
- Separate fields for X, Y, Z
- Number spinners
- Draggable inputs

#### Rotation (Pink)

**Purpose:** Rotation/quaternion data

**Uses:**
- Object rotations
- Procedural rotations
- Smooth interpolation

**Representation:**
- Quaternion internally
- Euler display in some contexts

#### Matrix (Dark Pink)

**Purpose:** 4×4 matrix of float values

**Uses:**
- Transformation matrices
- Complex spatial transforms
- Rotation + Scale + Translation

### Data-Block Socket Types

#### Collection (White)

**Purpose:** Reference to collection data-block

**Uses:**
- Instance collections
- Reference scene collections
- Geometry instancing

#### Object (Orange)

**Purpose:** Reference to object data-block

**Uses:**
- Instance objects
- Use object properties
- Reference other scene objects

#### Material (Salmon)

**Purpose:** Reference to material data-block

**Uses:**
- Assign materials
- Reference existing materials
- Material lookup

#### Texture (Pink)

**Purpose:** Reference to texture data-block

**Uses:**
- Sample texture data
- Reference procedural textures

#### Image (Apricot)

**Purpose:** Reference to image file or data-block

**Uses:**
- Load images for texturing
- Image texture sampling
- File path references

## Socket Shapes

Socket shapes indicate data structure and how values are transported through connections.

### Auto (Default)

**Purpose:** Automatically selects structure type based on usage

**Behavior:**
- Blender determines optimal structure
- Adapts to incoming/outgoing connections
- Most flexible option
- Recommended for general use

**Advantages:**
- No manual configuration needed
- Works with most node connections
- Adapts to context automatically

### Dynamic (Circle)

**Appearance:** Standard circular socket

**Purpose:** Works with multiple data structures

**Flexibility:**
- Can accept different structure types
- Adapts to input data
- Compatible with varied connections
- Most versatile socket type

**Use Cases:**
- Generic utility nodes
- Flexible input sockets
- Conversion nodes

### Single (Square, but appears Circular)

**Appearance:** Slightly different shape indicator

**Purpose:** Expects single value only

**Behavior:**
- One value per connection
- No per-element variation
- Constant throughout operation
- Simplest data transfer

**Examples:**
- Scalar multipliers
- Uniform scaling
- Global settings

### Fields (Diamond)

**Appearance:** Diamond-shaped socket

**Purpose:** Per-element values (vary by point, edge, face, etc.)

**Concept:**
- "Value map" similar to grayscale image
- Different values at different locations
- One value per element in geometry
- Enables rich per-element variation

**Field Variants:**

**Diamond (Field Socket):**
- Can accept field input
- Can output field
- Can accept single value (broadcast to all elements)
- Most flexible field socket

**Diamond with Dot (Single Value):**
- Currently contains single value
- Can be a field but isn't
- Shows single value in inspection
- Helps track constant values vs fields
- Allows seeing actual value instead of field names

**Broadcasting:**
- Single value connected to field socket
- Implicitly broadcast to all elements
- All elements receive same value
- Useful for uniform operations

**See Also:**
- Geometry Nodes Fields Documentation (for detailed fields explanation)

### Grid (Four Squares)

**Appearance:** Grid pattern socket

**Purpose:** Represents sampled values across 2D or 3D space

**Data Representation:**
- Values sampled across surface/volume
- Similar to image pixels (2D) or voxels (3D)
- Continuous spatial distribution
- Not attached to individual geometry elements

**Use Cases:**
- Image pixel data
- Volumetric density
- Height maps
- Sampled spatial data

**Operations:**
- Complex spatial transformations
- Distributed value operations
- Continuous field operations

## Input Sockets

Input sockets on the left side of nodes receive data and define what the node needs to function.

### Default Values

**When Disconnected:**
- Disconnected inputs have default values
- Can be edited directly on node
- Visual editor appears (color, number, vector picker)
- Override without needing input connection

**Editing Default Values:**
- Click on default value display
- Edit using appropriate interface
- Slider, number field, or color picker
- Press Return to confirm

**Use Cases:**
- Mix node with default color input
- Math node with constant value
- Transform with default offset

### Multi-Input Sockets

**Appearance:** Ellipsis shape (three dots) instead of circle

**Purpose:** Accept multiple inputs at once

**Behavior:**
- Can connect multiple nodes
- Processes multiple inputs together
- Example: Mix node with multiple inputs
- Useful for accumulation operations

**Examples:**
- Mix node: blend multiple colors
- Add node: sum multiple values
- Combine: merge multiple inputs

## Output Sockets

Output sockets on the right side send processed data to downstream nodes.

### Output Properties

**No Default Values:**
- Outputs always have values
- No disconnected default state
- Value determined by node computation
- Can only be connected to downstream nodes

**Connection Source:**
- Can connect to multiple downstream nodes
- One output fans out to many inputs
- Data flows from output to input
- Multiple downstream consumers

**Output Types:**
- Determined by node type
- Color output from color node
- Value output from math node
- Geometry output from geometry node

## Socket Conversion

Sockets can only connect between compatible types, but some conversions are automatic.

### Implicit Conversion

**Automatic Conversion:**
- Happens without conversion node
- No data loss for compatible types
- Invisible to user
- Convenient but can cause issues if unaware

**Valid Implicit Conversions:**

**Color ↔ Vector:**
- Color channels map to vector components
- R→X, G→Y, B→Z
- Can connect both directions

**Color ↔ Float:**
- Color converts to grayscale
- Grayscale value broadcasts to RGB
- Useful for multiplying by single value

**Color/Float/Vector → Shader:**
- Implicitly converts to color
- Acts as Emission shader
- Creates emissive material

**Float ↔ Integer:**
- Integer becomes float (1 → 1.0)
- Float truncates to integer (1.7 → 1)
- Loses decimal precision

**Float ↔ Vector:**
- Float to vector: value used for X, Y, Z
- Vector to float: average of components
- Useful for scalar operations

**Float ↔ Boolean:**
- Values > 0 = true, else false
- True = 1.0, False = 0.0
- Enables conditional multiplication

**Rotation ↔ Matrix:**
- Convert between quaternion and matrix
- Preserves transformation data
- Different mathematical representations

### Unit Conversion Behavior

**Implicit Units:**
- Value node (no units) plugged into angle socket
- Defaults to radians regardless of scene units
- Unit mismatch can cause unexpected results
- Explicitly convert if needed (Math node: degrees/radians)

### Explicit Conversion

**When Needed:**
- Conversion not possible implicitly
- Need specific conversion node
- Want to preserve original data
- Control over conversion behavior

**Conversion Nodes:**
- Shader To RGB: Convert shader to color output
- RGB to BW: Convert color to grayscale/float
- Math Node: Degree/radian conversions
- Vector/float/color explicit nodes

**Workflow:**
1. Identify incompatible connection
2. Insert conversion node between
3. Connect through converter
4. Result properly converted

**Example:**
1. Shader output needs to feed into color node
2. Use "Shader To RGB" node
3. Connect shader output to converter input
4. Connect converter output to color node

## Properties and Settings

Many nodes have editable properties below outputs and above inputs that control node behavior.

### Property Types

**Sliders:**
- Numerical range inputs
- Draggable to adjust
- Min/max value constraints
- Show current value

**Number Fields:**
- Text input for precise values
- Type exact numbers
- Keyboard navigation
- Overrides slider input

**Dropdowns:**
- Limited selection options
- Examples: blend modes, operations
- Menu appears on click
- Preset choices

**Checkboxes:**
- Toggle boolean properties
- On/off switches
- Examples: use alpha, clamp output

**Color Pickers:**
- Color property inputs
- Click to open picker
- Quick color preview
- Integrated color selection

**Vector/Coordinate Fields:**
- Separate X, Y, Z inputs
- Position or direction data
- Coordinate editing
- Component-by-component control

### Editing Properties

**Slider Adjustment:**
- Click and drag slider
- Move left to decrease, right to increase
- Ctrl for precision
- Release to confirm

**Field Input:**
- Click number field
- Type value directly
- Use expressions (e.g., "0.5 * 2")
- Press Return to confirm

**Color Selection:**
- Click color button/swatch
- Color picker opens
- Select desired color
- Close picker to confirm

**Dropdown Selection:**
- Click dropdown arrow
- Menu appears
- Click option to select
- Closes on selection

## Related Documentation

- [Blender UI Nodes](BLENDER_UI_NODES.md) - Node fundamentals and groups
- [Blender UI Node Editors](BLENDER_UI_NODE_EDITORS.md) - Node editor interface
- [Blender Shader Editor](BLENDER_SHADER_EDITOR.md) - Shader node specifics
- [Blender Geometry Nodes](BLENDER_GEOMETRY_NODES.md) - Geometry node types and fields
- [Blender Compositor](BLENDER_COMPOSITOR.md) - Compositing node setup
- [Blender Texture Nodes](BLENDER_TEXTURE_NODES.md) - Texture node types
