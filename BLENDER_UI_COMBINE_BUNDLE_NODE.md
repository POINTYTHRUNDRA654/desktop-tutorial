# Combine Bundle Node

## Overview

The Combine Bundle node creates a new Bundle from multiple input values, grouping them into a single organized container. Each input becomes an element of the bundle, identified and accessed by its socket name.

**Primary Purpose**:
- Combine multiple separate values into single bundle
- Create organized, structured data containers
- Reduce visual clutter in node trees
- Enable convenient data passing through workflows

**Key Characteristics**:
- Arbitrary number of input sockets
- Flexible data types (Geometry, Objects, Values, Fields, nested Bundles)
- Custom socket naming
- Default values for unlinked inputs
- Socket synchronization with connected nodes
- Signature locking for interface stability

**Visual Purpose**:

```
Without Combine Bundle (many connections):
Position → ┐
Rotation → ├→ Downstream Node
Scale    → ┘
(3 separate wires)

With Combine Bundle (single connection):
Position ─┐
Rotation ─┼→ Combine Bundle → Bundle → Downstream Node
Scale    ─┘
(1 organized connection)
```

## Node Structure

The Combine Bundle node has three main sections:

```
┌─────────────────────────────────┐
│  Combine Bundle Node            │
│                                 │
│ [Inputs]                        │
│ ├─ Position (Vector)            │
│ ├─ Rotation (Vector)            │
│ ├─ Scale (Vector)               │
│ └─ Custom Input (any type)      │
│                                 │
│ [Properties]                    │
│ ├─ Sync Sockets                 │
│ ├─ Define Signature             │
│ └─ Bundle Items (with controls) │
│                                 │
│ [Outputs]                       │
│ └─ Bundle                       │
└─────────────────────────────────┘
```

## Inputs

The Combine Bundle node accepts an arbitrary number of input sockets, each with flexible data typing.

### Input Socket Creation

**Initial State**:
- Node starts with no inputs (empty)
- Sockets created as needed

**Adding Input Sockets**:

**Method 1 - Via Properties**:
```
1. Open Node tab in Sidebar
2. Click "Add Item" button
3. Socket created with default name
4. Double-click name to rename
5. Click Type dropdown to change type
```

**Method 2 - Via Connection**:
```
1. Drag connection from upstream node
2. Hover over empty area of Combine Bundle
3. New input socket created
4. Data type inferred from source
5. Socket named based on source socket
```

**Method 3 - Via Context Menu**:
```
1. Right-click on Combine Bundle node
2. Select "Add Input" from menu
3. Socket created (if available)
```

### Input Socket Configuration

Each input socket is fully customizable:

**Socket Name**:
- Identifies the bundle element
- Must be unique within bundle
- Visible in separate/join bundle nodes
- Double-click to rename in properties

**Socket Type**:
- Determines data the input accepts
- Determines bundle element type
- Changeable in properties Type dropdown

**Supported Input Types**:

**Geometry Types**:
- **Geometry** - Full geometric data with attributes
- **Mesh** - Mesh-specific geometry
- **Curves** - Curve geometry
- **Point Cloud** - Point data
- **Custom Geometry** - Other geometric structures

**Object/Reference Types**:
- **Object** - Object reference (camera, light, mesh, etc.)
- **Collection** - Collection reference
- **Image** - Image reference
- **Material** - Material reference
- **Texture** - Texture reference
- **Modifier** - Modifier reference

**Numeric/Value Types**:
- **Float** - Single floating-point value
- **Integer** - Whole number
- **Boolean** - True/False value
- **Vector** - 3D position/direction (X, Y, Z)
- **2D Vector** - 2D position (X, Y)
- **Quaternion** - Rotation representation
- **Matrix** - 4x4 transformation matrix
- **Color** - RGBA color (R, G, B, A)
- **Rotation** - Euler rotation angles

**Field Types**:
- **Float Field** - Spatially varying float values
- **Vector Field** - Spatially varying vector values
- **Color Field** - Spatially varying color values
- **Integer Field** - Spatially varying integers

**Structural Types**:
- **Bundle** - Nested bundle (bundle within bundle)
- **Mixed** - When sockets have different types

### Default Values

When input sockets are unlinked, default values apply:

**Float Default**:
- Value: 0.0
- Customizable in Type property
- Shows number field when unlinked

**Vector Default**:
- Value: (0.0, 0.0, 0.0)
- Customizable per component
- Shows XYZ fields when unlinked

**Color Default**:
- Value: (1.0, 1.0, 1.0, 1.0) white
- Customizable with color picker
- Shows RGBA fields when unlinked

**Boolean Default**:
- Value: False
- Toggle checkbox when unlinked

**Object Default**:
- Value: None
- Data-block selector when unlinked
- Shows available objects

**Practical Example**:

```
Combine Bundle Setup:

Position (Vector):
- Linked: Receives from upstream node
- Unlinked: Uses default (0, 0, 0)

Rotation (Vector):
- Linked: Receives from upstream node
- Unlinked: Uses default (0, 0, 0)

Scale (Vector):
- Linked: Receives from upstream node
- Unlinked: Uses default (0, 0, 0)

Result:
- Connected sockets: Actual data
- Unlinked sockets: Default values
- Bundle contains both connected and default data
```

### Empty Input Behavior

When socket unlinked and no connection available:

**For Value Types**:
- Uses default value
- Visible in properties
- Editable when unlinked

**For Object Types**:
- Uses None/empty reference
- Shows selector in properties
- Can be assigned data-block

**For Geometry Types**:
- Empty geometry object
- Treated as valid bundle element
- Combines with other geometry

## Properties

The Node tab in the Sidebar provides full control over bundle structure.

### Sync Sockets

**Purpose**: Synchronize bundle structure with connected nodes

**What It Does**:
- Updates current node to match connected node signature
- Renames sockets to match source bundle
- Adjusts types to match source bundle
- Adds missing sockets
- Reorganizes socket order

**When to Use**:
```
Scenario 1: Bundled data arrives from upstream
1. Connect bundle to input
2. Bundled structure should match
3. Click Sync Sockets
4. Combine Bundle structure updated
5. All sockets now match upstream

Scenario 2: After renaming upstream sockets
1. Upstream sockets renamed
2. Combine Bundle structure no longer matches
3. Mismatch warning appears
4. Click Sync Sockets
5. Names updated to match
```

**Automatic Syncing**:
- Automatic on first connection (usually)
- Can be disabled in preferences
- Manual sync available if needed

**Manual Sync Workflow**:

```
1. Connect bundle to Combine Bundle input
2. Check if structure matches expectations
3. If mismatch detected, click Sync Sockets button
4. Dialog shows proposed changes:
   - Sockets to be renamed
   - Types to be changed
   - New sockets to be added
5. Review changes
6. Click Confirm to apply
7. Structure now synchronized
```

**Important Note**:
- Existing data preserved during sync
- Only structure updated, not values
- Safe operation for existing connections

### Define Signature

**Purpose**: Lock bundle structure to stabilize published interfaces

**What It Does**:
- Freezes current bundle structure
- Prevents adding/removing items
- Prevents type changes
- Maintains stable interface for node group users

**When to Use**:

```
Scenario 1: Publishing node group
1. Build node group with Combine Bundle
2. Test structure and ensure stable
3. Enable Define Signature
4. Lock the interface
5. Users cannot accidentally modify structure
6. Interface remains stable for all users

Scenario 2: Development vs. Production
- During development: Define Signature OFF
  (Can modify structure freely)
- When publishing: Define Signature ON
  (Locks structure for users)
```

**Enabling Define Signature**:

```
1. Open Node tab in Sidebar
2. Find "Define Signature" checkbox
3. Check box to enable
4. Structure locked
5. Add/Remove Item buttons become disabled
6. Type changes disabled
```

**Disabling Define Signature**:

```
1. Open Node tab
2. Uncheck "Define Signature" checkbox
3. Add/Remove Item buttons re-enabled
4. Can modify structure again
5. Careful: May break existing connections
```

**Benefits of Define Signature**:

```
1. Interface Stability
   - Users know structure won't change
   - Connections remain valid
   - No unexpected modifications

2. Error Prevention
   - Prevents accidental deletions
   - Prevents type mismatches
   - Maintains compatibility

3. Professional Publishing
   - Published node groups appear stable
   - Users confident in using
   - No surprise structure changes
```

### Bundle Items

**Display**: List of all elements in the bundle

**Structure**:
```
Bundle Items List:
┌─────────────────────────────────┐
│ □ Position (Vector)             │ ← Check = selected
│ □ Rotation (Vector)             │
│ □ Scale (Vector)                │
│ □ Custom Data (Float)           │
└─────────────────────────────────┘
```

**Item Information**:
- Checkbox: Select for Remove operation
- Name: Socket identifier
- Type: Data type in parentheses
- Renaming: Double-click to edit name

**Selecting Items**:
- Single-click: Select one item
- Shift-click: Select range
- Ctrl-click: Toggle selection
- Selected for: Deletion, moving, properties editing

**Reordering Items** (if supported):
- Select item
- Use up/down arrows (if available)
- Or drag to reorder in list
- Order matches top-to-bottom node layout

### Add Item

**Function**: Creates new input socket

**Adding Items**:

```
Method 1: Click Add Item Button
1. Click "+" button in Bundle Items section
2. New socket added at bottom of list
3. Default name: "Item" or numbered
4. Default type: Float
5. Ready for configuration

Method 2: Duplicate Existing
1. Select item in list
2. Right-click → Duplicate
3. Copy created with new name
4. Same type as original
```

**New Item Configuration**:

```
After adding item:
1. Socket appears at bottom of node
2. Name shown as "Item_001" (default)
3. Type shown as "Float" (default)
4. Ready for customization

To customize:
1. Double-click name to rename
2. Click Type dropdown to change type
3. Edit default value if applicable
```

**Typical Workflow**:

```
1. Start with empty Combine Bundle
2. Click Add Item → Position created
3. Rename: Position
4. Change Type: Vector
5. Click Add Item → Rotation created
6. Rename: Rotation
7. Change Type: Vector
8. Click Add Item → Scale created
9. Rename: Scale
10. Change Type: Vector
11. Bundle structure now ready
12. Connect upstream data
```

### Remove Item

**Function**: Deletes input socket and element

**Removing Items**:

```
Method 1: Select and Click Remove
1. Click to select item in list
2. Click "-" button (Remove Item)
3. Socket deleted
4. Element removed from bundle
5. Any connected data disconnected
```

**Method 2: Right-click Delete**:
```
1. Right-click item in list
2. Select "Delete" from menu
3. Item removed immediately
```

**Confirmation**:
- No confirmation dialog (can undo with Ctrl-Z)
- Immediate removal
- Connections disconnected

**Important Notes**:

```
1. Data Loss Warning
   - Removing item deletes bundle element
   - Connected data disconnected
   - Undo (Ctrl-Z) if accidental

2. When Define Signature Enabled
   - Remove button grayed out
   - Cannot delete items
   - Must disable Define Signature first
```

**Practical Example**:

```
Scenario: Remove unused bundle element

Bundle has:
- Position ✓ (used)
- Rotation ✓ (used)
- Scale ✗ (unused)
- Color ✓ (used)

To remove Scale:
1. Click Scale in Bundle Items list
2. Click "-" button
3. Scale socket removed
4. Bundle now smaller
5. Downstream nodes updated
```

### Type Property

**Function**: Sets data type for selected socket

**Selecting Type**:

```
1. Click socket name in Bundle Items list
2. Type dropdown appears below
3. Click dropdown to see all types
4. Select desired type
5. Socket updated immediately
```

**Type Options**:

```
Common Types:
- Float (single value)
- Integer (whole number)
- Boolean (true/false)
- Vector (3D direction)
- 2D Vector (2D position)
- Quaternion (rotation)
- Color (RGBA)
- Geometry (geometry data)
- Object (object reference)
- Material (material)
- Texture (texture)
- Image (image)
- Bundle (nested)
- String (text)
- Field types (Float Field, Vector Field, etc.)
```

**Default Value Control**:

When socket type is value-based, default value control appears:

```
Float Type:
- Shows number field
- Default value: 0.0
- Editable when unlinked

Vector Type:
- Shows XYZ fields
- Default: (0, 0, 0)
- Edit individual components

Color Type:
- Shows color picker
- Default: White (1, 1, 1, 1)
- Click to select color

Boolean Type:
- Shows checkbox
- Default: False
- Click to toggle
```

**Practical Example**:

```
Bundle: Transform

Position socket:
- Type: Vector
- Default: (0, 0, 0)

Rotation socket:
- Type: Vector
- Default: (0, 0, 0) (Euler angles)

Scale socket:
- Type: Vector
- Default: (1, 1, 1) (uniform scale)

When unlinked:
- Position uses (0, 0, 0)
- Rotation uses (0, 0, 0)
- Scale uses (1, 1, 1)

When connected:
- Uses actual upstream data
- Default values ignored
```

## Outputs

### Bundle Output

**Type**: Bundle (structured container)  
**Connection**: To Separate Bundle, Join Bundle, or other bundle consumers

The resulting bundle containing all defined inputs and their current values:

**Output Characteristics**:

**Bundle Structure**:
- Contains all configured inputs
- Socket names correspond to element names
- Types match configured types
- Order matches list order

**Data Contents**:

When Connected Inputs:
```
Position input connected → Bundle contains that position data
Rotation input connected → Bundle contains that rotation data
Scale input connected → Bundle contains that scale data
```

When Unlinked Inputs:
```
Position input unlinked → Bundle contains default position
Rotation input unlinked → Bundle contains default rotation
Scale input unlinked → Bundle contains default scale
```

**Bundle Usage**:

```
Output connects to:
1. Separate Bundle → Extract individual elements
2. Join Bundle → Modify specific elements
3. Group Input → Pass into node group
4. Downstream processing → Use as bundle data
5. Another Combine Bundle → Create nested bundle
```

**Practical Example**:

```
Combine Bundle creates Transform Bundle:

Input Socket | Connected Data | In Bundle
─────────────┼────────────────┼──────────
Position    | (1, 2, 3)      | (1, 2, 3)
Rotation    | (0, 45, 0)     | (0, 45, 0)
Scale       | default        | (1, 1, 1)

Output Bundle: {
  Position: (1, 2, 3),
  Rotation: (0, 45, 0),
  Scale: (1, 1, 1)
}

Downstream node receives single bundle
Can separate or process as whole
```

## Practical Workflows

### Building Transform Bundle

**Scenario**: Combine position, rotation, and scale into single bundle.

```
Step 1: Create Combine Bundle node
Step 2: Add three input items:
        - Position (Vector)
        - Rotation (Vector)
        - Scale (Vector)

Step 3: Connect upstream data:
        Translate node → Position input
        Rotate node → Rotation input
        Scale node → Scale input

Step 4: Output:
        Single Bundle containing all three
        One connection instead of three

Step 5: Use bundle:
        Instance on Points node receives bundle
        No need to connect three separate wires
```

**Visual Result**:

```
Before (without bundle):
Translate ─┐
Rotate   ─┼→ Instance on Points
Scale    ─┘
(3 connections)

After (with bundle):
Translate ─┐
Rotate   ─┼→ Combine Bundle → Instance on Points
Scale    ─┘
(1 organized bundle)
```

### Creating Material Bundle

**Scenario**: Group PBR texture maps into single bundle.

```
Step 1: Create Combine Bundle
Step 2: Add texture input items:
        - BaseColor (Texture)
        - Roughness (Texture)
        - Metallic (Texture)
        - Normal (Texture)
        - AO (Texture)
        - Displacement (Texture)

Step 3: Connect textures:
        Each Image Texture node → Corresponding input

Step 4: Output:
        Single PBR Material Bundle
        Contains all 6 texture maps

Step 5: Use in shader:
        Bundle → Separate Bundle → Distribute to material
        Clean organization
```

### Mixed Data Type Bundle

**Scenario**: Bundle containing various data types.

```
Bundle: Complete Asset Data

Items:
- Geometry (Geometry) → From modeled object
- Material (Material) → Assigned material
- Position (Vector) → Placement
- Scale (Float) → Uniform scale
- Active (Boolean) → Is active flag
- CustomID (Integer) → Unique identifier

Result:
Single bundle with 6 different data types
All passed as organized unit
Downstream nodes can separate as needed
```

### Nested Bundle

**Scenario**: Bundle containing other bundles.

```
Parent Bundle: Complete Character

Components:
- Transform Bundle:
  - Position
  - Rotation
  - Scale
- Appearance Bundle:
  - Material
  - Color
  - Texture Set

Workflow:
1. Create Transform Bundle (Combine Bundle)
2. Create Appearance Bundle (Combine Bundle)
3. Create Parent Bundle with Bundle type inputs
4. Result: Hierarchical nested bundle
```

## Best Practices

### Naming Conventions

```
1. Descriptive Names
   ✓ Position, Rotation, Scale
   ✓ BaseColor, Roughness, Metallic
   ✗ P, R, S
   ✗ Col, Rgh, Met

2. Consistent Patterns
   ✓ All named consistently
   ✓ Snake_case or camelCase
   ✗ Mixed naming styles

3. Semantic Organization
   ✓ Related items grouped together
   ✓ Order matches logical flow
   ✗ Random ordering
```

### Default Value Management

```
1. Set Meaningful Defaults
   ✓ Position: (0, 0, 0) - origin
   ✓ Rotation: (0, 0, 0) - no rotation
   ✓ Scale: (1, 1, 1) - uniform
   ✗ Random default values

2. Document Expectations
   - Note what defaults represent
   - Clarify what values should be
   - Help users understand structure

3. Consistent Defaults
   - Similar semantics = similar defaults
   - Position and offset both (0, 0, 0)
   - Scale and factor both 1.0
```

### Interface Design for Node Groups

```
1. Logical Organization
   - Related inputs grouped
   - Common inputs first
   - Advanced options last

2. Clear Naming
   - Names describe purpose
   - Abbreviations minimized
   - Type clear from name

3. Signature Locking
   - Lock when publishing
   - Protects user interface
   - Prevents accidental breaks

4. Documentation
   - Name what bundle contains
   - Explain data types
   - Show usage examples
```

## Troubleshooting

### Socket Not Appearing

**Problem**: Added item but no socket visible on node.

**Solutions**:
1. Check Node tab is not collapsed
2. Verify item is selected/visible in list
3. Try pressing F2 to refresh view
4. Check node width isn't too narrow (expand node)
5. Scroll in Bundle Items list if many items

### Type Mismatch After Sync

**Problem**: After Sync Sockets, types don't match expectations.

**Solutions**:
1. Verify source bundle has correct types
2. Undo (Ctrl-Z) and resync manually
3. Manually change types in properties
4. Check connected node isn't the issue

### Cannot Add/Remove Items

**Problem**: Add/Remove buttons grayed out.

**Solutions**:
1. Check if Define Signature enabled
2. Disable Define Signature to allow edits
3. Check node permissions (in group contexts)
4. Try again after reloading file

### Default Values Not Used

**Problem**: Expects default, but getting zeros or unexpected values.

**Solutions**:
1. Check socket is actually unlinked
2. Verify default value in properties
3. Reconnect to clear cached data
4. Check downstream node is reading defaults

## Advanced Techniques

### Dynamic Bundle Building

Building bundles based on conditions:

```
Conditional items:
- Always include: Position, Rotation
- Include if detail > 1.0: Normal Map
- Include if detail > 2.0: Displacement
- Include if advanced mode: Custom Attributes

Result:
Adaptive bundle that changes structure
based on user inputs
```

### Multi-Level Nesting

Complex hierarchical bundles:

```
Root Bundle
├─ Transform Sub-Bundle
│  ├─ Position
│  ├─ Rotation
│  └─ Scale
├─ Material Sub-Bundle
│  ├─ Color
│  ├─ Roughness
│  └─ Metallic
└─ Attributes Sub-Bundle
   ├─ Attribute 1
   └─ Attribute 2
```

## Related Documentation

- [BLENDER_UI_NODE_BUNDLES.md](BLENDER_UI_NODE_BUNDLES.md) - Bundle concepts and overview
- [BLENDER_UI_COMMON_UTILITIES_NODES.md](BLENDER_UI_COMMON_UTILITIES_NODES.md) - Bundle node family
- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node fundamentals
- [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md) - Node creation and modification
- [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md) - Socket types and data flow
