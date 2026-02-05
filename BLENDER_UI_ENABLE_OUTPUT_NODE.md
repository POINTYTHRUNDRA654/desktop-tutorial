# Enable Output Node

## Overview

The Enable Output node provides conditional control over node group outputs. This specialized utility node toggles whether a group's output socket is visible and active, allowing dynamic output management based on input conditions or boolean logic.

This node is essential for building flexible, conditional node groups where outputs are selectively enabled or disabled based on input values or processing requirements.

**Primary Use**:
- Conditionally enable/disable group outputs
- Hide unused outputs dynamically
- Control output visibility from input conditions
- Create flexible node groups with optional outputs

**Editor Context**:
- Available in Geometry Nodes
- Used for Group Output management
- Primarily for advanced node group workflows

## Node Structure

The Enable Output node consists of three main sections:

```
┌─────────────────────────┐
│  Enable Output Node     │
│                         │
│ [Inputs]                │
│ ├─ Enable (Boolean)     │
│ └─ Value (Any Type)     │
│                         │
│ [Properties]            │
│ └─ Data Type            │
│                         │
│ [Outputs]               │
│ └─ Value (Any Type)     │
└─────────────────────────┘
```

## Inputs

### Enable Input

**Type**: Boolean  
**Default**: True

Controls whether the connected output socket is visible and active:

**Enable = True**:
- Output socket is visible on group
- Data passes through normally
- Value input data flows to output
- Group output is available to downstream nodes

**Enable = False**:
- Output socket is hidden from group
- No data passes through
- Output becomes unavailable
- Downstream connections cannot access this output

**Data Flow**:
```
Enable (Boolean)
    ├─ True → Value passes through → Output visible
    └─ False → Output disabled → Output hidden
```

**Practical Use**:
```
Scenario: Group with optional outputs

Input Value (something to decide with)
        ↓
    Condition
        ↓
Enable Input (True/False based on condition)
        ↓
Enable Output Node
        ↓
Output: Visible if True, Hidden if False
```

### Value Input

**Type**: Any (configurable via Data Type property)  
**Default**: Depends on Data Type

The data to pass through to the output when the node is enabled:

**Supported Data Types**:
- **Float** - Numerical values
- **Integer** - Whole numbers
- **Vector** - 3D coordinates or directions
- **Color** - RGBA color values
- **Geometry** - Geometric data and attributes
- **Material** - Material references
- **Texture** - Texture references
- **Boolean** - True/False values
- **String** - Text data

**Value Behavior**:
- When Enable is True: Value passes directly to output
- When Enable is False: Value is ignored, output is disabled
- Any connected input becomes the Value input
- Unnamed sockets default to "Value"

**Workflow**:
```
1. Connect data to Value input (any type)
2. Set Enable to True/False
3. If True: Data flows to output
4. If False: Output disabled, data doesn't transmit
5. Group output socket reflects enabled/disabled state
```

## Properties

### Data Type

**Option**: Dropdown menu selecting the data type  
**Default**: Float

Specifies what type of data the Value input and output handle:

**Selecting Data Type**:
```
Click node property → Select from dropdown:
- Float (single numerical value)
- Integer (whole number)
- Vector (3D direction/position)
- Color (RGBA)
- Geometry (full geometry data)
- Material (material reference)
- Texture (texture reference)
- Boolean (true/false)
- String (text)
- Object (object reference)
- Image (image reference)
- Collection (collection reference)
```

**Automatic Socket Creation**:
- Changing Data Type automatically updates input socket type
- Output socket type matches Data Type
- Connected inputs update to match new type
- Incompatible connections show error

**Practical Examples**:

**Data Type: Float**:
```
Use for: Numerical value outputs
Example: Scalar roughness value, distance threshold
Value Input: Single floating-point number
Output: Same float value (if enabled)
```

**Data Type: Vector**:
```
Use for: Position, direction, scale data
Example: Offset vector, rotation axis
Value Input: 3-component vector (X, Y, Z)
Output: Same vector (if enabled)
```

**Data Type: Geometry**:
```
Use for: Full geometry data with attributes
Example: Processed geometry with attributes
Value Input: Complete geometry structure
Output: Geometry with all attributes (if enabled)
```

**Data Type: Color**:
```
Use for: Color values with alpha
Example: Color output based on conditions
Value Input: RGBA color
Output: Same color (if enabled)
```

**Changing Types Mid-Workflow**:
```
1. Initial setup: Data Type = Float (single value)
2. Later: Need to output Vector instead
3. Click Data Type property
4. Change to Vector
5. Node updates: input/output now expect vectors
6. Any connected float inputs show incompatibility warning
```

## Outputs

### Value Output

**Type**: Matches Data Type property  
**Connection**: To Group Output or downstream nodes

Outputs the Value input data when enabled:

**Output Behavior**:

**When Enable = True**:
- Output socket is **visible** on the node group
- Data from Value input flows through unchanged
- Output socket appears on group's final outputs
- Downstream nodes can connect to this output

**When Enable = False**:
- Output socket is **hidden** on the node group
- No data transmits through this path
- Output becomes unavailable to downstream
- Missing connection shown as error downstream if required

**Visual Indicators**:
- Enabled output: Normal appearance, visible socket
- Disabled output: Socket hidden or grayed out
- Connection status: Shows whether data flows

**Data Flow Example**:

```
Scenario: Multiple optional outputs from group

Setup:
├─ Enable Output Node 1: Controls color output
├─ Enable Output Node 2: Controls scale output
├─ Enable Output Node 3: Controls geometry output

User chooses inputs to enable via Group Input:

Input Flags (from Group Input):
├─ Output Color (Boolean)
├─ Output Scale (Boolean)
└─ Output Geometry (Boolean)

Each Enable Output node reads flag:
- Enable Output 1: Reads "Output Color" flag
- Enable Output 2: Reads "Output Scale" flag
- Enable Output 3: Reads "Output Geometry" flag

Result:
- Group output shows only enabled sockets
- Only enabled data flows out
- Disabled outputs completely hidden
```

## Practical Workflows

### Conditional Color Output

**Scenario**: Group outputs color only if certain conditions are met.

```
Setup:
1. Color Ramp creates color (blue to red gradient)
2. Add Enable Output node
   - Data Type: Color
   - Value input: Connect color ramp output
3. Add Group Input (Boolean) for "Output Color"
4. Connect Group Input to Enable input
5. Add Group Output, connect Enable Output's Value

Behavior:
- If "Output Color" TRUE: Group outputs the color
- If "Output Color" FALSE: Color output hidden from group

Usage:
- External nodes see color output only when enabled
- Cannot connect to hidden output
- Clean interface showing only relevant outputs
```

### Conditional Geometry Pass-Through

**Scenario**: Group has optional geometry processing output.

```
Setup:
1. Geometry Input receives data
2. Create processing branch:
   - Duplicate geometry
   - Apply transformations
   - Create attributes
3. Add Enable Output node
   - Data Type: Geometry
   - Value input: Connect processed geometry
4. Add Boolean Group Input "Output Processed Geometry"
5. Connect to Enable input

Behavior:
- If enabled: Processed geometry available as group output
- If disabled: Processing branch hidden, output unavailable
- Allows users to optionally access processed version
```

### Variable Output Count Based on Complexity

**Scenario**: Advanced group outputs different data based on complexity setting.

```
Setup:
1. Group Input "Complexity" (Float: 1.0-3.0)
2. Multiple processing branches:
   - Basic output (always available)
   - Intermediate output (if Complexity > 1.5)
   - Advanced output (if Complexity > 2.5)
3. Three Enable Output nodes:
   - Enable Output 1: Enable = True (always on)
   - Enable Output 2: Enable = (Complexity > 1.5)
   - Enable Output 3: Enable = (Complexity > 2.5)
4. Each connects to Group Output

Result:
- Simple mode: Only basic output visible
- Intermediate mode: Basic + Intermediate
- Advanced mode: All three outputs visible
- Users see only relevant data for their complexity level
```

### Selective Data Type Outputs

**Scenario**: Group processes data in multiple formats.

```
Setup:
1. Input geometry
2. Process geometry (create attributes)
3. Three Enable Output nodes (different Data Types):
   - Enable Output 1: Data Type = Geometry (full data)
   - Enable Output 2: Data Type = Float (derived value)
   - Enable Output 3: Data Type = Color (attribute as color)
4. Each connects same processed geometry/attributes
   - Node 1 passes geometry
   - Node 2 extracts float attribute
   - Node 3 extracts color attribute
5. Add Group Inputs to control which outputs active

Result:
- Geometry output: Full data if enabled
- Float output: Derived value if enabled
- Color output: Attribute visualization if enabled
- Downstream nodes choose which format to use
```

### Debugging: Hidden vs. Visible Outputs

**Scenario**: Complex group with many potential outputs, user enables only needed ones.

```
Setup:
1. Group has 10 possible outputs:
   - Geometry (main)
   - Position (debug)
   - Normal (debug)
   - Tangent (debug)
   - Attribute 1 (debug)
   - Attribute 2 (debug)
   - etc.
2. Wrap each in Enable Output node
3. Add Boolean Group Inputs for each:
   - "Show Position"
   - "Show Normal"
   - "Show Tangent"
   - etc.
4. Connect each Boolean to respective Enable Output

Workflow:
- Default: Only main geometry visible
- Need position debug? Enable "Show Position"
- Output socket appears immediately
- Multiple debug outputs can be toggled
- Clean interface, shows only what user needs
```

## Advanced Techniques

### Nested Conditional Outputs

**Scenario**: Outputs that depend on multiple conditions.

```
Setup:
1. Create complex condition logic:
   - Boolean A (user input)
   - Boolean B (user input)
   - Math node: AND logic (A and B)
2. Connect AND result to Enable Output
3. Only outputs data if both A AND B are true

Variations:
- OR logic: Output if either condition true
- NOT logic: Output if condition is false
- XOR logic: Output if conditions differ
- Complex combinations: Nested boolean operations
```

### Cascading Outputs

**Scenario**: Outputs that enable sequentially based on processing.

```
Setup:
1. Primary output: Always enabled
2. Secondary output: Enable = (Primary succeeded)
3. Tertiary output: Enable = (Secondary succeeded)

Example - Quality levels:
1. Fast result (always)
2. Better result (if fast succeeded)
3. Best result (if better succeeded)

Users get progressive quality options
```

### Performance-Based Output Control

**Scenario**: Different outputs based on performance budget.

```
Setup:
1. Group Input "Max Attributes" (Integer: 1-5)
2. Process multiple attributes
3. Enable Output nodes for each attribute:
   - Attribute 1: Enable = always
   - Attribute 2: Enable = (Max Attributes >= 2)
   - Attribute 3: Enable = (Max Attributes >= 3)
   - Attribute 4: Enable = (Max Attributes >= 4)
   - Attribute 5: Enable = (Max Attributes >= 5)

Result:
- Limited resources: Only essential attributes computed
- More resources: Additional attributes available
- User controls performance/quality tradeoff
```

## Common Use Cases

### Node Group Library Creation

Create reusable groups with flexible outputs:

```
Group: "Advanced Processing"

Inputs:
- Geometry (required)
- Processing Mode (required)
- Output Complexity (1-3, optional)

Outputs (conditional):
- Base Geometry (always)
- Processed Geometry (if Mode allows)
- Attributes (if Complexity >= 2)
- Debug Info (if Complexity >= 3)

Users can:
- Use basic functionality without complexity
- Enable advanced outputs when needed
- Keep interface clean by hiding unused outputs
- Reuse same group for simple and advanced tasks
```

### Artistic Control in Procedural Design

Enable/disable artistic variations:

```
Group: "Material Generator"

Outputs (controlled via Group Input booleans):
- Base Texture (always)
- Roughness Variation (optional)
- Color Noise (optional)
- Weathering (optional)
- Corrosion Detail (optional)

Artists choose which effects to enable:
- Simple: Just base texture
- Detailed: Base + roughness + color noise
- Complex: All five outputs
- Custom combinations available
```

## Troubleshooting

### Output Socket Not Appearing

**Problem**: Expected output socket doesn't show on group.

**Solutions**:
1. Check Enable input is True (not False)
2. Verify Data Type matches what you're connecting
3. Check if Group Output node is receiving input
4. Ensure Enable Output Value input has data
5. Try toggling Enable on/off to refresh

### Data Type Mismatch

**Problem**: Error when connecting incompatible data to Value.

**Solutions**:
1. Change Data Type property to match incoming data
2. Use conversion node between source and Value input
3. Check what type Group Input is providing

### Hidden Output Not Reappearing

**Problem**: Disabled output socket won't show after enabling.

**Solutions**:
1. Double-check Enable input (may be getting False from logic)
2. Try refreshing: Select node, press Escape to deselect, reselect
3. Check Group Output node is still present
4. Verify no errors in Enable input logic

## Best Practices

### Naming and Organization

```
1. Label Enable Output nodes clearly in frame
   - "Output: Optional Geometry"
   - "Output: Debug Attributes"
   - "Output: Quality Level"

2. Group related Enable Outputs in same frame
   - Separate frame per output category
   - Clear visual organization

3. Use consistent naming for Group Inputs
   - "Output Geometry" paired with Enable Output for geometry
   - "Output Attributes" paired with Enable Output for attributes
```

### Documentation

When creating groups with Enable Output:

```
Document in Node Group:
1. Which outputs are conditional
2. What enables/disables them
3. Data types for each output
4. When to enable which outputs
5. Performance implications of enabling
```

### Optimization

```
1. Enable only necessary outputs
2. Disabled outputs consume no computation
3. Use for reducing overhead in production
4. Clean unused enabled outputs when finalizing
```

## Related Documentation

- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node basics and node group concepts
- [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md) - Creating and modifying node groups
- [BLENDER_UI_COMMON_NODES.md](BLENDER_UI_COMMON_NODES.md) - Other utility nodes
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface
- [BLENDER_UI_SELECTING_NODES.md](BLENDER_UI_SELECTING_NODES.md) - Selecting nodes in groups
