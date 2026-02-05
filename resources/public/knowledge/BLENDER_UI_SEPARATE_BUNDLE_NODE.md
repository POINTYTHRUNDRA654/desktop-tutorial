# Blender UI: Separate Bundle Node

## Overview

The **Separate Bundle Node** is a fundamental geometry node that extracts individual values from a Bundle and outputs them as separate sockets. Each output corresponds to an element in the bundle, identified by its socket name and type. This node serves as the perfect counterpart to the Combine Bundle node, enabling you to decompose grouped data back into its individual components for targeted processing and manipulation.

Bundle nodes in Blender represent a structured approach to data organization and communication within node graphs. The Separate Bundle node is essential for workflows that require breaking down complex data structures into discrete, manageable elements that can be processed independently or passed to specialized downstream nodes.

### Key Characteristics

- **Dynamic Output Signature**: The Separate Bundle node automatically generates output sockets matching the bundle's internal structure
- **Data Preservation**: Maintains the original data types and naming from the source bundle
- **Workflow Flexibility**: Allows selective routing of bundle components to different processing paths
- **Signature Locking**: Protects bundle item lists when publishing node groups
- **Socket Synchronization**: Automatically updates socket configuration to match connected bundles
- **Zero Data Loss**: No data is discarded during the separation process; all bundle items are extracted and accessible

### Common Use Cases

The Separate Bundle node is invaluable in numerous production scenarios:

- **Material Processing**: Extract individual material properties (base color, metallic, roughness, normal) from a material bundle for targeted adjustments
- **Transform Decomposition**: Separate transform bundles into location, rotation, and scale components for independent manipulation
- **Geometry Workflow**: Break down geometry bundles to process vertices, edges, and faces with different operations
- **Conditional Logic**: Extract specific bundle elements to drive conditional nodes and branching logic
- **Data Remapping**: Reorganize bundle components into new structures with different groupings
- **Mixed-Type Processing**: Handle bundles containing diverse data types (floats, vectors, geometry, objects) and route each appropriately
- **Debugging Complex Nodes**: Inspect intermediate bundle structures to verify data flow and identify processing issues
- **Multi-Output Distribution**: Fan out single bundle inputs to multiple downstream nodes that expect individual socket connections

---

## Node Structure

### Visual Layout

```
[Bundle Input]
      |
      v
┌─────────────────┐
│  Separate Bundle│
│    Node         │
│                 │
│  ┌───────────┐  │
│  │Sync Socket│  │
│  └───────────┘  │
│                 │
│  ┌────────────┐ │
│  │Define Sig  │ │
│  └────────────┘ │
│                 │
│ Bundle Items    │
│ ┌─────────────┐ │
│ │Color (RGB)  │ │
│ │Metallic (F) │ │
│ │Roughness(F) │ │
│ │Normal (Vec) │ │
│ └─────────────┘ │
│                 │
│ Add Item [+]    │
│ Remove Item [-] │
│                 │
└─────────────────┘
      |  |  |  |
      v  v  v  v
   [R][M][Ro][N]
   (Outputs)
```

### Node Designation

- **Type**: Geometry Node
- **Category**: Node > Utilities > Bundle
- **Socket Connection**: Single Bundle Input → Multiple Typed Outputs
- **Data Flow**: Decomposes → Distributes
- **Typical Position**: Downstream from Combine Bundle or data-aggregating nodes

---

## Inputs

### Bundle Input Socket

The single input socket accepts a bundle of any complexity.

#### Characteristics

- **Name**: "Bundle"
- **Type**: Bundle (accepts any bundle structure)
- **Required**: Yes (node will show empty output sockets if unconnected)
- **Multi-Link**: No (only one bundle connection per node)
- **Data Preservation**: All bundled data is extracted without loss

#### Connection Behavior

When a bundle is connected to the Separate Bundle node input:

1. The node immediately inspects the bundle's internal structure
2. Output sockets are automatically generated matching each bundle item
3. Socket names and types correspond exactly to the source bundle items
4. If the source bundle is modified (items added/removed/renamed), the node updates automatically
5. Disconnecting the bundle input collapses all output sockets (if no manual overrides exist)

#### Bundle Inspection Process

The node performs intelligent inspection of the incoming bundle:

- **Type Recognition**: Identifies each item's data type (Float, Integer, Vector, Color, String, Geometry, Object, Boolean, Material, Bundle)
- **Name Extraction**: Reads socket names to use as output labels
- **Default Tracking**: Preserves default values from the original bundle definition
- **Validation**: Ensures bundle structure compatibility with node's current configuration

#### Handling Incompatible Bundles

If an incoming bundle has a different structure than the node's current configuration:

- **Auto-Sync Enabled** (Default): Node updates automatically to match the new bundle
- **Define Signature Locked**: Node maintains its structure and warns about mismatches
- **Partial Matching**: If some items match, only matching items update; others remain as configured

---

## Properties

All properties are accessible in the **Node tab** of the Sidebar when the Separate Bundle node is selected.

### Sync Sockets Button

A critical control for maintaining bundle compatibility.

#### Purpose

The "Sync Sockets" button synchronizes the Separate Bundle node's socket configuration with the connected input bundle, ensuring the node always reflects the current bundle structure.

#### When to Use

Use "Sync Sockets" in these situations:

1. **After Connecting a Bundle**: When first connecting a bundle input, sync ensures correct socket generation
2. **After Upstream Changes**: If the source bundle structure changes (items renamed, added, removed, retyped), click sync to update
3. **Fixing Mismatches**: If output sockets don't match the bundle contents, sync corrects the discrepancy
4. **Batch Editing Bundles**: When working with complex node groups where multiple bundles are modified simultaneously
5. **Resolving Conflicts**: If Define Signature is locked but you need to accept new bundle structure, sync forces an update
6. **Updating Published Groups**: After updating node group internals, sync refreshes the external interface

#### Behavior Details

When "Sync Sockets" is activated:

1. All custom socket configurations are analyzed
2. Connected bundle structure is inspected
3. New sockets are created for unmatched bundle items
4. Orphaned sockets (items in node but not in bundle) are optionally removed
5. Existing connections are preserved if socket types match
6. Socket order is reorganized to match bundle order
7. Default values are updated to match bundle definitions

#### Sync with Define Signature Enabled

If "Define Signature" is locked, sync behavior changes:

- **Protective Mode**: Sync won't delete existing sockets to prevent breaking published node groups
- **Warning Display**: Mismatches are flagged but not auto-corrected
- **Override Option**: A "Force Sync" option appears to override signature protection when absolutely necessary
- **Partial Updates**: Types and defaults update, but socket additions/removals are blocked

### Define Signature

Locks the socket configuration to create stable published node groups.

#### Purpose

"Define Signature" prevents accidental modifications to the socket list when the Separate Bundle node is part of a published node group or when you need a fixed interface.

#### When to Enable

Enable "Define Signature" in these scenarios:

1. **Publishing Node Groups**: When creating reusable node groups for distribution or team collaboration
2. **Complex Setups**: In intricate node networks where socket changes would break downstream connections
3. **Locked Workflows**: When the bundle structure is final and shouldn't be modified
4. **Studio Standards**: Enforcing consistent socket naming and typing across multiple similar nodes
5. **Version Control**: Preventing unintentional changes when node groups are version-controlled
6. **Interface Stability**: When external users or other nodes depend on a specific socket configuration

#### Behavior When Locked

With "Define Signature" enabled:

- **Add Item Button**: Becomes disabled; cannot add new sockets
- **Remove Item Controls**: Become disabled; cannot remove sockets
- **Item Renaming**: Cannot rename existing items
- **Type Changes**: Cannot modify item data types
- **Sync Behavior**: Restricted to updating defaults only; structural changes are blocked
- **Visual Indicator**: Node shows a lock icon indicating protected configuration

#### Disabling Locked Signature

When you need to modify a locked signature:

1. Uncheck "Define Signature" in the Node properties panel
2. The node immediately becomes editable
3. All Add/Remove/Rename/Type controls become enabled
4. Re-check "Define Signature" when done to re-lock the configuration

#### Best Practices for Signature Locking

- Lock signature AFTER finalizing the bundle structure
- Document the expected bundle structure in node group descriptions
- Use consistent naming conventions that users will understand
- Provide default bundles demonstrating expected structure
- Consider using Tutorial or Reference node groups to show usage patterns

### Bundle Items

The Bundle Items list displays all elements currently extracted from the bundle.

#### List Display

The Bundle Items panel shows:

- **Item Count**: Total number of items in the current bundle configuration
- **Item Names**: Display name of each socket (editable via double-click)
- **Data Types**: Icon and label indicating each item's type
- **Selected Item**: Highlighted row shows currently selected item for property editing
- **Scroll Behavior**: Scrollable list if items exceed visible area
- **Compact View**: Summary shows "N items" if the list is collapsed

#### Item Structure

Each item in the Bundle Items list represents:

- **Socket Name**: The identifier for this bundle element
- **Data Type**: The value type (Float, Vector, Color, Geometry, etc.)
- **Default Value**: Used when socket is unconnected
- **Internal Index**: Position in the bundle hierarchy

#### Viewing Item Details

To view or modify a specific item:

1. **Single-Click**: Selects the item; its properties appear below in the Type section
2. **Double-Click**: Enters edit mode for the item name
3. **Hover**: Shows tooltip with full item name if truncated
4. **Keyboard Selection**: Use Up/Down arrows to navigate items

#### Item Ordering

Items appear in the list in the same order as they appear in the source bundle:

- **Preservation Order**: Order is maintained from the Combine Bundle or source
- **Output Socket Order**: Output sockets are created in list order from top to bottom
- **Reordering**: Some workflows require manual reordering; use drag-and-drop on compatible systems

### Add Item

Creates a new socket in the bundle, generating a corresponding output socket.

#### How to Add Items

**Method 1: Add Item Button**
1. Locate the "Add Item" button below the Bundle Items list
2. Click the [+] button
3. A new item appears in the Bundle Items list with default name "Item"
4. A new output socket is created on the node

**Method 2: Node Group Editor**
1. Double-click the Separate Bundle node to enter edit mode (if it's a node group)
2. Right-click in the node graph
3. Select "Add Socket" from the context menu
4. Configure the new socket's properties

**Method 3: Keyboard Shortcut**
- Some configurations support Shift+Click on the Add Item button for rapid-fire additions
- Ctrl+N while item list is focused adds a new item with focus on the name field

#### Properties of New Items

When a new item is added:

- **Default Name**: "Item" (numbered "Item.001", "Item.002" etc. if duplicates exist)
- **Default Type**: Float (can be changed immediately)
- **Default Value**: 0.0 for Float, (0,0,0) for Vector, etc.
- **Connected**: Initially unconnected; data flows from the bundle (or uses default)
- **Visible**: Appears as output socket on the node immediately

#### Adding Items with Specific Types

For most efficient workflow:

1. Add the item via Add Item button
2. Immediately change the Type property (see Type section below)
3. Configure the default value if needed
4. Connect outputs or leave unconnected as needed

#### Constraints on Adding Items

- Cannot add items if "Define Signature" is locked
- Bundle must be connected or items are orphaned
- Each item requires a unique name (system auto-numbers duplicates)
- Cannot exceed maximum items (typically limited by performance; 1000+ items supported)

### Remove Item

Deletes the selected item from the bundle configuration.

#### How to Remove Items

**Method 1: Remove Item Button**
1. Select the item to remove in the Bundle Items list (single-click highlights it)
2. Click the "Remove Item" [-] button
3. The selected item is deleted
4. Corresponding output socket is removed from the node
5. Any downstream connections to that socket are broken

**Method 2: Right-Click Context Menu**
1. Right-click on an item in the Bundle Items list
2. Select "Remove" from the context menu
3. Item is deleted with confirmation (if enabled)

**Method 3: Keyboard Shortcut**
- Select an item and press Delete key
- Some configurations support Shift+Delete for permanent removal without confirmation

#### Confirmation Behavior

Depending on configuration:

- **With Confirmation**: A dialog appears asking "Delete item [Name]?" with Cancel/Confirm options
- **Without Confirmation**: Item is immediately deleted
- **Undo Support**: Deletion is undoable via Ctrl+Z; press Redo (Ctrl+Shift+Z) to restore

#### Consequences of Removal

When an item is removed:

1. **Output Socket Disappears**: The corresponding output socket is immediately deleted
2. **Connections Broken**: Any nodes connected to that output socket receive broken connection warnings
3. **Data Lost**: Data that was being output through that socket is no longer available
4. **Cleanup Required**: You must reconnect dependent nodes or remove their connections
5. **Bundle Updated**: The extracted bundle structure is reduced by one item

#### Workflow Implications

Before removing an item, consider:

- Are other nodes depending on this output socket?
- Can I disconnect or reroute those dependencies first?
- Is this removal temporary (undo-able) or permanent?
- Should I disable the node instead of removing the item?

#### Protecting Against Accidental Removal

- Enable "Define Signature" to lock item list and prevent removal
- Disable "Remove Item" button through node group publishing
- Use node group instances instead of direct edits

### Type Property

Specifies the data type for the selected item.

#### Available Data Types

The Separate Bundle node supports the following data types for items:

**Numeric Types**
- **Float**: Single-precision decimal number (-3.4e38 to 3.4e38)
  - Default Value: 0.0
  - Typical Use: Scales, factors, weights, alphas, intensities
  - Example: Roughness (0.0-1.0), Metallic (0.0-1.0)

- **Integer**: Whole number (-2,147,483,648 to 2,147,483,647)
  - Default Value: 0
  - Typical Use: Counts, indices, identifiers, enumeration values
  - Example: Material index, face count, frame number

**Vector Types**
- **Vector**: 3D direction or offset (X, Y, Z components)
  - Default Value: (0.0, 0.0, 0.0)
  - Typical Use: Normals, directions, offsets, motion vectors
  - Example: Surface normal (0.0-1.0 normalized), displacement offset

- **Color (RGBA)**: Color with alpha channel (R, G, B, A in 0.0-1.0 range)
  - Default Value: (0.5, 0.5, 0.5, 1.0) (mid-gray, fully opaque)
  - Typical Use: Colors, textures, material properties with transparency
  - Example: Base color, emission, specular color with alpha

**Complex Types**
- **Geometry**: Geometry data including vertices, edges, faces, attributes
  - Default Value: Empty geometry (no vertices)
  - Typical Use: Mesh data, point clouds, curves, volumes
  - Example: Separated mesh components for selective processing

- **Object**: Reference to a scene object
  - Default Value: None (empty object reference)
  - Typical Use: Material assignments, instance references, camera/light targets
  - Example: Target object for deformation or constraint

- **Material**: Material data including all shader nodes
  - Default Value: None (empty material)
  - Typical Use: Material bundles with property extraction
  - Example: Material with baked properties

- **Boolean**: True/False logical value
  - Default Value: False
  - Typical Use: Flags, conditions, enable/disable states
  - Example: Whether to apply effect, visibility toggle

- **String**: Text data
  - Default Value: "" (empty string)
  - Typical Use: Names, identifiers, text attributes
  - Example: Object name, material name, custom attributes

- **Bundle**: Nested bundle structure (recursive bundling)
  - Default Value: Empty bundle
  - Typical Use: Hierarchical data organization, grouped sub-properties
  - Example: Transform bundle containing location, rotation, scale sub-bundles

#### Changing Item Type

To change a selected item's type:

1. **Select the Item**: Single-click on the item in Bundle Items list
2. **Locate Type Property**: The "Type" dropdown appears in the properties section below
3. **Click the Dropdown**: Reveals available data types
4. **Select New Type**: Choose the target data type
5. **Default Value Updates**: The default value control updates to match the new type
6. **Output Socket Updates**: The corresponding output socket is modified to the new type

#### Type Change Consequences

When changing an item's type:

- **Existing Connections**: Connections to the old type are broken if incompatible
- **Default Value Reset**: Changes to the type's default value
- **Downstream Updates**: Nodes receiving this output must accommodate the type change
- **Undo Available**: Type changes are undoable via Ctrl+Z

#### Default Values by Type

Each data type has associated controls for specifying default values:

**Float Type**
```
Type: Float
Default Value: [0.500] (slider or text input)
Range: Unbounded (can accept any float value)
Min/Max: Optional limits for UI slider
```

**Integer Type**
```
Type: Integer
Default Value: [0] (integer input)
Range: Unbounded (can accept any integer)
Min/Max: Optional limits for UI slider
```

**Vector Type**
```
Type: Vector
Default X: [0.000]
Default Y: [0.000]
Default Z: [0.000]
(3D vector with individual component controls)
```

**Color Type**
```
Type: Color
Default RGBA: [■] (color picker)
R: [0.500]  G: [0.500]  B: [0.500]  A: [1.000]
Color Space: Linear / sRGB (affects interpretation)
```

**Geometry Type**
```
Type: Geometry
Default: (none - automatically empty)
(No default value control; always starts with empty geometry)
```

**Object Type**
```
Type: Object
Default: [None ▼] (object selector dropdown)
(No object assigned by default; must be explicitly linked)
```

**Material Type**
```
Type: Material
Default: [None ▼] (material selector dropdown)
(No material assigned by default; must be explicitly linked)
```

**Boolean Type**
```
Type: Boolean
Default: [ ] (unchecked/False)
or [✓] (checked/True)
```

**String Type**
```
Type: String
Default: [""] (text input field)
(Empty string by default; enter any text)
```

**Bundle Type**
```
Type: Bundle
Default: (none - automatically empty bundle)
(No default value control; always starts with empty bundle)
```

#### Default Value Usage

Default values serve as fallback data when:

1. **Socket is Unconnected**: If the bundle item has no incoming data, the default is used
2. **Node is Disabled**: When the Separate Bundle node is toggled off, defaults may be substituted
3. **Bundle is Incomplete**: If the source bundle doesn't contain this item, default is applied
4. **Error Recovery**: If data flow is disrupted, defaults provide graceful degradation

#### Type System Features

The Blender type system provides these capabilities:

- **Type Safety**: Prevents incompatible data from flowing to connected nodes
- **Automatic Conversion**: Some types have implicit conversions (e.g., Float to Vector)
- **Type Checking**: Real-time validation of data type compatibility
- **Type Display**: Icons and labels clearly identify each socket's type
- **Type Documentation**: Hover tooltips explain each type's capabilities

---

## Outputs

The Separate Bundle node generates a dynamic set of output sockets based on the items in the bundle.

### Output Socket Generation

Output sockets are created automatically according to these rules:

1. **One Socket Per Item**: Each item in the Bundle Items list generates exactly one output socket
2. **Matching Names**: Socket names match the item names exactly (case-sensitive)
3. **Matching Types**: Socket data types correspond to the item type properties
4. **Top-to-Bottom Order**: Output sockets appear in the same order as items in the list
5. **Left-to-Right Layout**: Multiple sockets spread across the node's right edge

### Socket Characteristics

Each output socket exhibits these properties:

**Name**
- Displays the item's name
- Editable by double-clicking the item in Bundle Items list
- Maximum length: 64 characters (typical; may vary)
- Must be unique within the bundle
- Spaces and special characters allowed

**Type Icon**
- Visual indicator of the socket's data type
- Small icon next to the socket name
- Color-coded: Float (yellow/orange), Vector (blue), Color (white), Geometry (green), etc.
- Tooltip shows full type name on hover

**Data Flow**
- Data flows from the input bundle INTO the node
- Data flows FROM the output sockets OUT to connected nodes
- Each output carries the corresponding bundle item's value
- No internal buffering; output always reflects current input state

**Connection Behavior**
- Outputs can connect to matching input sockets on other nodes
- Multiple outputs can connect to the same input (parallel connections)
- One output can connect to multiple inputs simultaneously (broadcasting)
- Connections can be in any order and quantity

### Output Socket Data

Each output socket provides the following data:

1. **Item Value**: The actual value from the bundle item (extracted and passed through)
2. **Default Value**: Used if the bundle doesn't contain this item or is unconnected
3. **Data Type**: Matches the item's configured type
4. **Attributes**: For geometry output, includes all geometric data and custom attributes
5. **Integrity**: Data is not modified during extraction; passed as-is to outputs

### Practical Output Example

Consider a Material Bundle with the following structure:

```
Input Bundle: Material Bundle
├── Base Color (Color RGBA)
├── Metallic (Float)
├── Roughness (Float)
├── Normal (Vector)
└── Emission (Color RGBA)

Separate Bundle Node Output Sockets:
├── Base Color → [RGBA color data]
├── Metallic → [Single float 0.0-1.0]
├── Roughness → [Single float 0.0-1.0]
├── Normal → [Vector data]
└── Emission → [RGBA color data]
```

Each output socket can now connect independently to:
- Color Ramp nodes for color adjustment
- Math nodes for metallic/roughness calculation
- Bump or Normal Map nodes for normal processing
- Emission nodes for light generation

---

## Practical Workflows

### Workflow 1: Material Bundle Extraction and Processing

Extract material properties from a combined material bundle for targeted enhancement.

**Scenario**: You have created a comprehensive material bundle containing base color, metallic, roughness, and normal map data. You want to selectively enhance certain properties while leaving others unchanged.

**Node Setup**:
```
[Combine Bundle] (Input Material Data)
    ↓
[Material Bundle]
    ↓
[Separate Bundle] (Extract Components)
    ├→ Base Color → [Color Ramp] (Adjust saturation)
    ├→ Metallic → [Math] (Multiply by factor)
    ├→ Roughness → [Math] (Add texture variation)
    └→ Normal → [Vector Math] (Rotate normal)
    
All outputs → [Combine Bundle] (Repackage)
    ↓
[Material Output]
```

**Step-by-Step Process**:

1. **Create Material Bundle**: Use Combine Bundle node to group base color, metallic, roughness, and normal properties
2. **Add Separate Bundle Node**: Place after the bundle in the node graph
3. **Connect Bundle Input**: Drag the material bundle output to the Separate Bundle input
4. **Automatic Socket Generation**: Output sockets are created for each material property
5. **Process Each Component**:
   - Base Color → Connect to Color Ramp for saturation adjustment
   - Metallic → Connect to Math (Multiply) node for intensity scaling
   - Roughness → Connect to Texture or Noise Texture for variation
   - Normal → Connect to Vector Math for orientation control
6. **Recombine Results**: Use another Combine Bundle to reassemble the processed components
7. **Connect to Shader**: Output the final bundle to the next stage of the material

**Advantages**:
- Complete isolation of material properties
- Independent adjustment of each component
- Reusable material enhancement workflow
- Easy to toggle specific enhancements on/off
- Clear visual layout showing data flow

---

### Workflow 2: Transform Bundle Decomposition

Separate location, rotation, and scale from a transform bundle for selective application.

**Scenario**: A transform bundle contains location, rotation, and scale information. You need to apply location and rotation to a geometry but scale only on the X-axis.

**Node Setup**:
```
[Instance on Points]
    └→ Instance Rotation (Bundle)
        ↓
[Separate Bundle]
    ├→ Location → [Instance on Points] (Location)
    ├→ Rotation → [Instance on Points] (Rotation)
    └→ Scale → [Separate Vector]
        └→ Scale X → [Math] (Use only X component)
```

**Detailed Steps**:

1. **Identify Transform Bundle Source**: Instance on Points outputs a transform bundle
2. **Add Separate Bundle Node**: Place downstream from Instance on Points
3. **Connect Transform Bundle**: Link Instance Rotation to Separate Bundle input
4. **Extract Components**: Automatic sockets created for Location, Rotation, Scale
5. **Application**:
   - Location → Connect to another Instance on Points for positional instancing
   - Rotation → Connect to rotation input for orientation
   - Scale → Separate the vector and extract X component only for selective scaling
6. **Combine Partial Transform**: If needed, recombine location and rotation without scale for specific geometry

**Benefits**:
- Selective application of transform components
- Mixed transform types in single workflow
- Ability to invert or multiply specific transforms
- Clear data flow showing which components are used where

---

### Workflow 3: Conditional Property Extraction

Extract specific properties from a bundle based on conditions.

**Scenario**: A bundle contains material, geometry, and settings data. You want to apply material only if a condition is true, otherwise use a default material.

**Node Setup**:
```
[Combine Bundle]
    └→ Bundle (Material, Geometry, Settings)
        ↓
[Separate Bundle]
    ├→ Material → [Switch] (Condition-based selection)
    │   ├→ True: Input Material
    │   └→ False: Default Material
    ├→ Geometry → [Processing nodes]
    └→ Settings → [Value controls]
```

**Implementation**:

1. **Create Data Bundle**: Combine Bundle with material, geometry, and settings
2. **Place Separate Bundle**: Downstream in the processing chain
3. **Connect Source Bundle**: Material bundle output to Separate Bundle input
4. **Extract Components**: Creates sockets for Material, Geometry, Settings
5. **Apply Conditions**:
   - Material output → Switch node with condition input
   - If condition true: Use extracted material
   - If condition false: Use fallback material
6. **Process Other Components**: Geometry and settings flow through normal channels
7. **Conditional Material Application**: Only extracted material applied when condition met

**Use Cases**:
- Material type selection based on geometry properties
- Conditional geometry processing
- Environment-dependent material switching
- Performance-optimized conditional workflows

---

### Workflow 4: Data Inspection and Debugging

Use Separate Bundle to extract and inspect intermediate data in complex workflows.

**Scenario**: A complex node group produces a bundle result. You want to verify that each component has expected values before passing to final output.

**Node Setup**:
```
[Complex Processing]
    └→ Output Bundle
        ↓
[Separate Bundle]
    ├→ Property 1 → [Viewer] (Inspect visually)
    ├→ Property 2 → [Viewer] (Inspect visually)
    ├→ Property 3 → [Viewer] (Inspect visually)
    └→ Property 4 → [Output]
```

**Debugging Process**:

1. **Identify Problem Point**: Complex node group with unexpected results
2. **Add Separate Bundle**: At intermediate point where bundle is suspect
3. **Extract All Components**: Creates sockets for each bundle item
4. **Attach Viewers**: Connect each output to separate Viewer node (in Shader Editor)
5. **Inspect Values**: Check each component for expected data:
   - Are values in expected range?
   - Do types match expectations?
   - Are there null/empty values when shouldn't be?
6. **Isolate Issues**: If a component is wrong, trace back to its source
7. **Fix and Validate**: Correct the source node and verify the bundle is corrected
8. **Clean Up**: Remove Viewer nodes once debugging is complete

**Benefits**:
- Transparent data flow verification
- Component-level inspection
- Early error detection
- Non-destructive debugging (viewers don't affect output)

---

### Workflow 5: Multi-Path Processing

Fan out single bundle input to multiple specialized processing paths.

**Scenario**: A single bundle contains diverse data types that require different processing approaches. Geometry goes to mesh processing, colors go to color adjustment, and metadata goes to conditional logic.

**Node Setup**:
```
[Combined Data Bundle]
    ↓
[Separate Bundle]
    ├→ Geometry ────→ [Mesh Deformation Pipeline]
    │                ├→ Subdivision
    │                ├→ Smooth
    │                └→ Bevel
    │
    ├→ Base Color ──→ [Color Processing Pipeline]
    │                ├→ Color Ramp
    │                ├→ Brightness/Contrast
    │                └→ Hue Shift
    │
    └→ Metadata ────→ [Conditional Logic Pipeline]
                     ├→ Switch nodes
                     └→ Math operations
```

**Workflow Architecture**:

1. **Single Input Point**: One bundle containing all data
2. **Separation Stage**: Separate Bundle extracts components into separate data channels
3. **Parallel Processing**: Each channel flows through independent processing pipeline:
   - **Geometry Path**: Deformation and mesh operations
   - **Color Path**: Color adjustments and effects
   - **Metadata Path**: Conditional logic and control flow
4. **Recombination**: Processed components recombined into output bundle
5. **Final Output**: Complete bundle with all enhancements applied

**Advantages**:
- Clear separation of concerns
- Independent scaling of each processing path
- Easy to enable/disable specific paths
- Reusable pipeline modules
- Testable individual components

---

### Workflow 6: Bundle Comparison and Merging

Extract bundles from multiple sources and selectively merge their components.

**Scenario**: Two different data sources produce bundles with overlapping but distinct properties. You want to extract components from both and selectively merge them based on priority or conditions.

**Node Setup**:
```
[Source A] ──→ [Separate Bundle A]
                  ├→ Property 1
                  ├→ Property 2
                  └→ Property 3
                      ↓ [Compare/Select]
                          ↓
[Source B] ──→ [Separate Bundle B]
                  ├→ Property 1
                  ├→ Property 2
                  └→ Property 3
                      ↓
                  [Combine Bundle]
                      ↓
                  [Output]
```

**Implementation**:

1. **Extract from Source A**: Separate Bundle creates outputs for Source A components
2. **Extract from Source B**: Another Separate Bundle creates outputs for Source B components
3. **Compare Components**: Math or comparison nodes evaluate property importance
4. **Select Components**: Switch nodes choose which source's component to use:
   - If Source A Property 1 > Source B Property 1: Use Source A
   - Otherwise: Use Source B
5. **Combine Selected**: Combine Bundle reassembles selected components into unified bundle
6. **Output Result**: Final bundle contains best components from both sources

**Use Cases**:
- Fallback material selection
- Priority-based property inheritance
- Merge conflicting data sources
- Quality-based component selection

---

## Best Practices

### Bundle Organization

**Maintain Consistent Structure**
- Use identical bundle structures across similar node groups
- Document expected bundle format in node group description
- Create reference node groups showing bundle format
- Use consistent naming conventions (e.g., always "Color" not "BaseColor" or "Tint")

**Hierarchical Bundling**
- Use Bundle-type items to create hierarchical structures
- Prevents flat bundles that become unwieldy with many items
- Example: Transform Bundle containing Location, Rotation, Scale sub-bundles
- Easier to manage 5 top-level items than 15 flat items

**Default Values**
- Set meaningful defaults for each item
- Defaults should represent "safe" or "neutral" states
- Document why specific defaults were chosen
- Test workflows with defaults to ensure robustness

### Workflow Design

**Separation Point Placement**
- Place Separate Bundle close to where individual components are needed
- Avoid separating early if components will be recombined immediately
- Use Reroute nodes to organize output socket layout
- Consider performance: separating large geometry bundles is expensive

**Socket Naming**
- Use descriptive names that clearly indicate data content
- Include type hints in names when helpful: "BaseColor_RGB", "Roughness_Float"
- Keep names short enough to fit in UI (under 32 characters ideal)
- Avoid special characters that might cause parsing issues

**Connection Clarity**
- Use Reroute nodes to organize complex output routing
- Group related outputs together visually
- Use node comments to explain separation and routing logic
- Color-code output sockets when possible (custom node group features)

### Performance Optimization

**Bundle Complexity**
- Limit bundles to essential items (avoid "bundle bloat")
- Move temporary items out of bundles when no longer needed
- Consider performance impact of large geometry bundles
- Profile workflows with many Separate Bundle nodes

**Caching Strategies**
- Use Separate Bundle to extract components that feed multiple nodes
- Cache frequently-accessed components to avoid redundant extraction
- Consider using Geometry Attributes instead of bundles for large datasets
- Monitor node graph performance with Blender's Profiler

**Conditional Processing**
- Use Switch nodes to skip Separate Bundle when bundle is unneeded
- Disable Separate Bundle node when its outputs aren't used
- Consider using Node Groups to wrap Separate Bundle with conditional logic
- Profile conditional workflows to ensure efficient branching

### Maintenance

**Documenting Bundles**
- Add node group annotations describing each item in the bundle
- Document the expected source of bundled data
- Explain why bundling improves workflow over flat inputs
- Include troubleshooting guide for common issues

**Version Control**
- Track bundle structure changes alongside code
- Document changes to bundle items (added/removed/renamed)
- Maintain backward compatibility when possible
- Consider versioning node groups with bundle structure changes

**Team Collaboration**
- Establish studio standards for bundle naming and structure
- Create template node groups for common bundle types
- Document standardized bundles in studio wiki
- Review bundle usage in code reviews

---

## Troubleshooting

### Problem: Output Sockets Don't Match Bundle Contents

**Symptoms**
- Separate Bundle node has wrong number of output sockets
- Socket names don't match bundle items
- Socket types don't correspond to bundle structure
- "Socket mismatch" warnings in node editor

**Root Causes**
- Connected bundle structure doesn't match node's current configuration
- Define Signature locked, preventing automatic updates
- Upstream bundle was modified (items added/removed/renamed)
- Node was copied from different workflow with incompatible bundle

**Solutions**

1. **Use Sync Sockets**:
   - Click the "Sync Sockets" button in Node properties
   - Node inspects connected bundle and updates output sockets automatically
   - Existing connections are preserved if types are compatible

2. **Disconnect and Reconnect**:
   - Disconnect the bundle input temporarily
   - Disconnect problematic outputs
   - Reconnect the bundle input
   - Manually delete and recreate output connections

3. **Unlock Signature**:
   - If "Define Signature" is locked, uncheck it
   - Click "Sync Sockets" to allow update
   - Re-lock signature once corrected

4. **Verify Bundle Source**:
   - Inspect the node producing the bundle
   - Confirm it matches expected structure
   - Fix the source bundle if necessary
   - Sync Separate Bundle node after source is corrected

### Problem: "Unlinked Socket" Warning on Outputs

**Symptoms**
- Yellow or orange warning triangles on output sockets
- Warnings appear even though outputs are connected
- Sockets show as "unlinked" in error log
- Nodes receiving these outputs report connection errors

**Root Causes**
- Socket types are incompatible with receiving nodes
- Receiving node was updated and no longer accepts this type
- Socket is physically disconnected despite appearing connected
- Bundle item type doesn't match output socket type

**Solutions**

1. **Check Socket Types**:
   - Verify output socket type matches receiving node's input type
   - Use View > Toggle Data Compatibility Visualization
   - Wrong-type connections display as mismatched colors

2. **Verify Connections**:
   - Follow each connection visually
   - Check that connection lines don't have break points or gaps
   - Re-draw broken connections: disconnect and reconnect

3. **Update Receiving Nodes**:
   - If receiving node was modified, check its input requirements
   - Ensure receiving node can accept the data type
   - Update workflow if data type changed and can't be used

4. **Fix Type Mismatches**:
   - In Separate Bundle, select problematic item
   - Check the "Type" property for the item
   - Confirm type matches what receiving node expects
   - Change type if necessary (relinks affected connections)

### Problem: Bundle Input Not Updating

**Symptoms**
- Changes to source bundle don't reflect in Separate Bundle outputs
- Old bundle structure persists in Separate Bundle despite source change
- Output sockets show outdated item names/types
- Upstream changes have no effect on downstream outputs

**Root Causes**
- Data flow hasn't been re-evaluated since upstream change
- Auto-update disabled in node editor settings
- Separate Bundle node is not visible in current view (viewport updates only visible nodes)
- Caching issue in Blender's dependency system

**Solutions**

1. **Force Node Evaluation**:
   - Press Space to play the timeline (triggers re-evaluation)
   - Press Space again to stop
   - Or click a node property to trigger refresh

2. **Disable and Re-enable Node**:
   - Toggle the node visibility (Eye icon) off and on
   - Forces re-evaluation of node and downstream nodes

3. **Check Auto-Update Settings**:
   - Geometry Nodes Editor > Header menu
   - Ensure "Auto-Execute" or similar is enabled
   - Enable real-time viewport updates if disabled

4. **Sync Sockets Explicitly**:
   - Click "Sync Sockets" button to force re-inspection of bundle
   - Manually update any mismatched items
   - Recalculate node graph

### Problem: Data Loss or Unexpected Values

**Symptoms**
- Extracted components have wrong values
- Expected data appears as zeros or default values
- Bundle items are empty or null
- Downstream nodes receive unexpected results

**Root Causes**
- Source bundle doesn't contain expected item (missing item)
- Default values are being used instead of actual data
- Type conversion is producing unexpected results
- Source bundle generation failed upstream

**Solutions**

1. **Verify Source Bundle**:
   - Inspect the node generating the bundle
   - Confirm all expected items are being bundled
   - Check that item values are correct before bundling
   - Trace data flow backward to source

2. **Check Default Values**:
   - In Separate Bundle, select items with wrong values
   - Check the "Type" property's default value
   - If output shows default instead of bundle data, bundle item is missing
   - Fix the source bundle to include missing items

3. **Validate Type Conversions**:
   - Verify that item types match expected data types
   - Some types may auto-convert (e.g., Vector to Color)
   - Unexpected conversions can produce nonsense values
   - Correct item type in Separate Bundle properties

4. **Debug with Viewers**:
   - Attach Viewer nodes to all outputs
   - Inspect each component's values
   - Identify which specific items are wrong
   - Trace problem item back to source

### Problem: Node Performance Issues

**Symptoms**
- Node graph becomes slow with Separate Bundle nodes
- Viewport updates lag or freeze
- Playback becomes jerky or unresponsive
- Editor reports "long frame time" or similar warnings

**Root Causes**
- Separating very large geometry bundles is computationally expensive
- Extracting many items from complex bundles requires processing
- Output connections feeding many downstream nodes create evaluation chains
- Node graph evaluates Separate Bundle unnecessarily

**Solutions**

1. **Simplify Bundle Contents**
   - Remove unnecessary items from bundle
   - Use Separate Bundle only for items actually used
   - Move infrequently-used items out of bundle
   - Consider using Geometry Attributes instead of bundles for large datasets

2. **Limit Separation Points**
   - Separate bundle only where components are actually needed
   - Avoid separating and immediately recombining
   - Use Reroute nodes to branch single bundle references
   - Minimize number of Separate Bundle nodes in graph

3. **Cache Extracted Components**
   - Extract components once and reuse multiple times
   - Use Reroute to branch from single extraction
   - Avoid redundant extraction of same component
   - Profile workflow to identify redundant extractions

4. **Profile and Optimize**
   - Enable Profiler in Editor > Preferences > Debugging
   - Identify which nodes are slow
   - Consider alternative approaches (attributes, geometry instances)
   - Optimize upstream bundle generation if possible

### Problem: Bundle Signature Conflicts

**Symptoms**
- "Define Signature" lock prevents needed updates
- Can't add/remove items even though bundle structure changed
- Receiving nodes show compatibility warnings
- Cannot modify node group socket interface

**Root Causes**
- Signature was locked when upstream bundle changed
- Node group interface needs updating but lock prevents it
- Multiple bundle sources with incompatible structures
- Node group published with signature that's no longer valid

**Solutions**

1. **Temporary Unlock**
   - Uncheck "Define Signature"
   - Click "Sync Sockets" to accept new bundle structure
   - Manually update items as needed
   - Re-lock "Define Signature" when done

2. **Update Node Group Interface**
   - If node group is published, edit the node group itself
   - Access via double-clicking node or Edit Group in header
   - Update internal Separate Bundle sockets
   - Update node group input/output sockets to match
   - Exit group and use updated version

3. **Verify Upstream Compatibility**
   - Check node producing bundle (often Combine Bundle)
   - Confirm its structure matches node group's expectations
   - If changed, update expected structure or upstream node
   - Re-sync and re-lock signature

4. **Document Signature Requirements**
   - Add annotations explaining expected bundle structure
   - Include diagram of expected bundle items
   - Document when signature should be updated
   - Create reference node group showing bundle format

### Problem: Can't Connect Outputs to Receiving Nodes

**Symptoms**
- Connection lines appear temporarily then disappear
- Cannot create stable connections to certain nodes
- Receiving node input won't accept the output
- Error messages about type incompatibility

**Root Causes**
- Output socket type doesn't match receiving input type
- Receiving input already has connected output (single connection limit)
- Types are incompatible (e.g., Geometry to Float)
- Receiving node doesn't support this input (hidden or disabled)

**Solutions**

1. **Verify Type Compatibility**
   - Check output socket type (hover to see tooltip)
   - Check receiving input socket type
   - Types must match or be implicitly convertible
   - Use Reroute with type conversion if needed

2. **Check Input Capacity**
   - Some inputs accept single connection only
   - Others accept multiple connections
   - If input is full, disconnect old connection first
   - Or use alternative input if node has multiple

3. **Use Type Conversion Nodes**
   - If types don't match, use intermediate conversion node
   - Math nodes can convert between Float and Vector
   - Separate Vector can break Vector into components
   - Combine Vector can build Vector from components

4. **Enable Hidden Inputs**
   - Some inputs are hidden by default
   - Right-click node > Show/Hide Inputs
   - May reveal compatible inputs you didn't know existed
   - Check node documentation for available inputs

---

## Advanced Techniques

### Technique 1: Hierarchical Bundle Extraction

Create nested bundle structures with multi-level extraction.

**Concept**: Use Bundle-type items to create hierarchical data structures that can be partially extracted.

**Example: Hierarchical Material Bundle**

```
Root Bundle:
├── Material Bundle
│   ├── Base Properties
│   │   ├── Color
│   │   └── Roughness
│   └── Advanced Properties
│       ├── Metallic
│       └── Subsurface
└── Rendering Settings
    ├── Shadow Mode
    └── Ray Count
```

**Extraction Process**:

1. First Separate Bundle extracts top-level items:
   - Material Bundle (Bundle type)
   - Rendering Settings (Bundle type)

2. Second Separate Bundle on Material Bundle extracts:
   - Base Properties (Bundle type)
   - Advanced Properties (Bundle type)

3. Third Separate Bundle on Base Properties extracts:
   - Color (Color type)
   - Roughness (Float type)

**Advantages**:
- Organize complex data hierarchically
- Extract only needed sub-bundles without extracting all items
- Reusable bundle structure across multiple projects
- Clearer semantic organization of related properties

---

### Technique 2: Conditional Bundle Extraction

Extract from bundles based on dynamic conditions.

**Concept**: Use Switch nodes to conditionally extract bundle components based on runtime logic.

**Example: Environment-Based Material Selection**

```
[Get Input Node: Environment]
    ↓
[Switch Node: Environment Type]
    ├→ Case "Indoor" ──→ [Indoor Material Bundle]
    │                      ↓
    │                   [Separate Bundle]
    │                      └→ [Outputs]
    │
    └→ Case "Outdoor" → [Outdoor Material Bundle]
                           ↓
                        [Separate Bundle]
                           └→ [Outputs]
    
[Combine Results]
```

**Implementation**:

1. Input Switch node evaluates condition
2. Each branch produces appropriate bundle
3. Each bundle fed to dedicated Separate Bundle
4. Extracted components passed to Combine Bundle
5. Final output contains conditionally-extracted data

**Benefits**:
- Runtime adaptation of bundle structure
- Environment-responsive material selection
- Modular conditional processing
- Easy to test different extraction paths

---

### Technique 3: Dynamic Bundle Analysis

Extract bundle items in sequence and analyze them with loops.

**Concept**: Use Repeat Zone or similar looping constructs to process bundle items dynamically.

**Example: Iterative Item Processing**

```
[Separate Bundle]
    ├→ Item 1 ─┐
    ├→ Item 2 ─┼→ [Repeat Zone: Index]
    ├→ Item 3 ─│   └→ Process Item N
    └→ Item N ─┘      └→ [Output]
```

**Process Flow**:

1. Separate Bundle creates outputs for all items
2. Switch node inside loop selects Item N based on index
3. Loop processes Item N with specific logic
4. Loop increment selects next item
5. Results accumulated and output

**Enables**:
- Iterative processing of bundle items
- Dynamic item selection by index
- Per-item conditional logic
- Statistical analysis of bundle contents

---

### Technique 4: Bundle Versioning and Migration

Support multiple bundle structure versions in same workflow.

**Concept**: Create Separate Bundle nodes for different bundle versions, selecting version dynamically.

**Example: V1 vs V2 Bundle Migration**

```
[Incoming Bundle]
    ↓
[Check Bundle Format]
    ├→ Is V1 Format?
    │   └→ [Separate Bundle V1]
    │       └→ [Convert V1→V2]
    │
    └→ Is V2 Format?
        └→ [Separate Bundle V2]
        
[Combine Bundle V2]
    ↓
[Unified Processing]
```

**Version Management**:

1. Detect incoming bundle version
2. Apply appropriate Separate Bundle for that version
3. Convert old format to new format if needed
4. Process with unified V2 workflow
5. Support both old and new externally

**Benefits**:
- Backward compatible with old bundle formats
- Smooth migration to new bundle structure
- Multiple versions coexist in system
- Gradual deprecation of old formats

---

### Technique 5: Bundle Inspection and Validation

Create diagnostic workflows to verify bundle integrity.

**Concept**: Extract bundle items and validate their values and types.

**Example: Material Bundle Validation**

```
[Material Bundle Input]
    ↓
[Separate Bundle]
    ├→ Color ────────→ [Color > Value] → [Math: > 0.0?]
    ├→ Metallic ─────→ [Math: 0.0-1.0 range?]
    ├→ Roughness ────→ [Math: 0.0-1.0 range?]
    └→ Normal ───────→ [Vector: Normalized?]
    
[Combine validation results]
    ↓
[Boolean Output: Valid/Invalid]
```

**Validation Steps**:

1. Extract each bundle component
2. Check component value ranges
3. Verify component types (geometry attributes, etc.)
4. Combine validation results
5. Output success/failure flag
6. Option: Return corrected bundle or error code

**Applications**:
- Pre-flight checks before using bundle
- Data integrity verification
- Error detection and reporting
- Graceful fallback to defaults when validation fails

---

## Related Documentation

Learn more about related Blender topics:

- **[Combine Bundle Node](BLENDER_UI_COMBINE_BUNDLE_NODE.md)**: Detailed reference for combining data into bundles; essential counterpart to Separate Bundle
- **[Node Bundles Overview](BLENDER_UI_NODE_BUNDLES.md)**: Comprehensive guide to bundle concepts, syncing, and practical workflows
- **[Common Nodes](BLENDER_UI_COMMON_NODES.md)**: Overview of Output, Reroute, and other essential utility nodes
- **[Common Utilities Nodes](BLENDER_UI_COMMON_UTILITIES_NODES.md)**: Detailed reference for Bundle and Closure node types
- **[Editing Nodes](BLENDER_UI_EDITING_NODES.md)**: Techniques for transforming, connecting, and managing nodes
- **[Arranging Nodes](BLENDER_UI_ARRANGING_NODES.md)**: Best practices for visual organization of node graphs
- **[Selecting Nodes](BLENDER_UI_SELECTING_NODES.md)**: Methods for selecting and managing node groups
- **[Nodes](BLENDER_UI_NODES.md)**: Fundamental node concepts and node system overview
- **[Node Editors](BLENDER_UI_NODE_EDITORS.md)**: Interface elements specific to different node editor types
- **[Operators](BLENDER_UI_OPERATORS.md)**: Blender operations and their keyboard shortcuts
- **[Undo/Redo](BLENDER_UI_UNDO_REDO.md)**: History management and undo system

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Intermediate to Advanced  
**Typical Use**: Geometry nodes processing, material bundling, data decomposition
