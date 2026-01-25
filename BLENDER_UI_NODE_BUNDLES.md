# Node Bundles

## Overview

A bundle is a specialized container that groups multiple values into a single socket, functioning like a struct or data structure in programming. Bundles dramatically simplify node trees by reducing clutter and enabling complex data to flow through single connections.

**Key Characteristics**:
- Container for multiple values (like a struct)
- Single socket represents entire bundle
- Can contain mixed data types (geometry, fields, values, objects, nested bundles)
- Reduces exposed inputs/outputs significantly
- Enables socket synchronization for type matching

**Visual Representation**:

```
Without Bundles (cluttered):
Input 1 → Node ←──┐
Input 2 → Node ←──┤
Input 3 → Node ←──┤
Input 4 → Node ←──┘
(4 separate wires, messy)

With Bundles (clean):
Bundle (Input 1, 2, 3, 4) → Node
(1 organized connection)
```

## Bundle Fundamentals

### What is a Bundle?

A bundle is a data container that:

**Structural Aspect**:
- Groups multiple related values
- Each value has a name and type
- Acts like a programming struct
- Values remain organized together

**Operational Aspect**:
- Passes through single socket connection
- Maintains internal structure
- Can be combined and separated
- Data types can be mixed

**Example Bundle Definition**:

```
Bundle: "Transform"
├─ Position (Vector)
├─ Rotation (Vector)
├─ Scale (Vector)
└─ Uniform Scale (Boolean)

Single socket transmission:
Transform Bundle → Downstream Node
(All 4 values flow together)
```

### Why Bundles Exist

**Problem Without Bundles**:

```
Complex node processing:
Input: 20 different values
Output: 15 different results

Without bundles:
- 20 input sockets
- 15 output sockets
- Node becomes massive
- Node tree becomes unreadable
- Difficult to understand structure
```

**Solution With Bundles**:

```
With bundles:
- Organize inputs into 3-4 bundles
- Organize outputs into 2-3 bundles
- Node remains reasonable size
- Clear conceptual organization
- Node tree readable and maintainable
```

### Supported Data Types

Bundles can contain any mix of data types:

**Geometry Types**:
- Geometry (full geometric data)
- Mesh data
- Point cloud data

**Numeric Types**:
- Float (single value)
- Integer (whole numbers)
- Boolean (true/false)

**Vector Types**:
- Vector (3D direction/position)
- 2D Vector
- Quaternion
- Matrix
- Rotation

**Color/Material Types**:
- Color (RGBA)
- Material
- Texture
- Image

**Reference Types**:
- Object (object reference)
- Collection (collection reference)

**Structural Types**:
- Nested Bundle (bundle within bundle)
- Any combination of above

**Mixed Example**:

```
Bundle: "Complete Asset Data"
├─ Geometry (Geometry)
├─ Material (Material)
├─ Position (Vector)
├─ Rotation (Quaternion)
├─ Scale (Float)
├─ Color Override (Color)
├─ Is Active (Boolean)
└─ Custom Attributes (Nested Bundle)
   ├─ Attribute 1 (Float)
   └─ Attribute 2 (Vector)

Single bundle contains 8+ different types
```

## Bundle Nodes

Three primary nodes manage bundles:

### Combine Bundle Node

Combines multiple separate sockets into a single bundle:

**Function**:
- Takes multiple inputs
- Groups them into organized bundle
- Outputs single bundle socket
- Reduces connection clutter

**Creating a Combine Bundle**:

```
1. Add ‣ Utilities ‣ Combine Bundle
2. Node appears with no inputs
3. Connect data to node
4. Input sockets appear dynamically
5. Output: Single bundle socket
```

**Adding Inputs Dynamically**:

```
Method 1 - Connect Data:
1. Drag connection to Combine Bundle
2. Input socket automatically created
3. Named based on source socket name
4. Type matches connected data

Method 2 - Add Socket Button:
1. Click "+" button on node (if visible)
2. New input socket created
3. Click to name and type
4. Manual control over structure
```

**Socket Organization**:
- Order: Top to bottom matches bundle structure
- Names: Identify each component
- Types: Mixed types supported
- Rename: Click name to edit

**Practical Example**:

```
Building Transform Bundle:

Inputs:
- Connect Position vector → Position socket created
- Connect Rotation vector → Rotation socket created
- Connect Scale vector → Scale socket created

Output: Single "Bundle" socket containing all three
```

**Workflow**:

```
Step 1: Create individual data
        Translate Node → Position
        Rotate Node → Rotation
        Scale Node → Scale

Step 2: Combine into bundle
        All three → Combine Bundle

Step 3: Use bundle
        Bundle → Downstream nodes
        (Single connection instead of 3)
```

### Separate Bundle Node

Extracts individual components from a bundle:

**Function**:
- Takes single bundle input
- Exposes all bundle components
- Creates output socket for each component
- Reverses Combine Bundle operation

**Creating a Separate Bundle**:

```
1. Add ‣ Utilities ‣ Separate Bundle
2. Connect bundle to input
3. Output sockets automatically created
4. One output per bundle component
5. Named and typed per original structure
```

**Output Sockets**:
- Automatically match bundle structure
- Names correspond to bundle components
- Types match component types
- Cannot be manually added (determined by input)

**Practical Example**:

```
Receiving Transform Bundle:

Input: Single bundle
       (Position, Rotation, Scale)

Output sockets created:
- Position (Vector)
- Rotation (Vector)
- Scale (Vector)

Use each output separately:
Position → Transform Node
Rotation → Constraint Node
Scale → Modifier Node
```

**Workflow**:

```
Step 1: Bundle arrives from upstream
        Bundle (Position, Rotation, Scale)

Step 2: Separate bundle
        Bundle → Separate Bundle

Step 3: Use individual components
        ├→ Position (Process 1)
        ├→ Rotation (Process 2)
        └→ Scale (Process 3)

Each component processed independently
```

### Join Bundle Node

Selectively replaces bundle components while preserving others:

**Function**:
- Takes bundle input
- Allows replacing specific components
- Preserves unchanged components
- Outputs modified bundle

**How It Works**:

```
Input Bundle: (Position, Rotation, Scale)
New Scale: 2.0

Join Bundle:
- Keep Position (unchanged)
- Keep Rotation (unchanged)
- Replace Scale (new value: 2.0)

Output: Modified bundle
(Position, Rotation, NEW_Scale)
```

**Socket Configuration**:
- All original bundle components visible as inputs
- Leave disconnected to keep original value
- Connect new value to replace component
- Output: New bundle with modifications

**Practical Example**:

```
Scenario: Have transform bundle, want to change only scale

Input Bundle: (Position: 0,0,0; Rotation: 0,0,0; Scale: 1,1,1)

Setup:
1. Add Join Bundle
2. Connect input bundle
3. Leave Position empty (keep original)
4. Leave Rotation empty (keep original)
5. Connect new Scale (2.0, 2.0, 2.0)

Output: Modified bundle
(Position: 0,0,0; Rotation: 0,0,0; Scale: 2.0, 2.0, 2.0)
```

**Advantages Over Separate/Modify/Combine**:

```
Method 1 - Three Nodes (old way):
Bundle → Separate → Modify → Combine → New Bundle
(Takes 3 nodes)

Method 2 - Join Bundle (efficient way):
Bundle → Join Bundle (plug in new value) → New Bundle
(Takes 1 node)
```

## Socket Syncing

Socket syncing automatically matches bundle signatures between connected nodes, ensuring compatibility without manual adjustment.

### What is Socket Syncing?

When two bundle nodes connect but have mismatched signatures (different component names/types), Blender can synchronize them:

**Mismatch Example**:

```
Combine Bundle Output:
- Position (Vector)
- Rotation (Vector)
- Scale (Vector)

Separate Bundle Input Expects:
- PosValue (Vector)
- RotValue (Vector)
- ScaleValue (Vector)

Names don't match:
- "Position" vs "PosValue"
- "Rotation" vs "RotValue"
- "Scale" vs "ScaleValue"

Sync fixes this mismatch
```

### Automatic Syncing

Syncing happens automatically on first connection:

**Trigger Conditions**:
- Connect bundle to node for first time
- Signatures detected as mismatched
- Blender automatically syncs if possible

**How It Works**:

```
Step 1: User connects bundle
        Combine Bundle → Separate Bundle

Step 2: Blender detects mismatch
        "These bundles have different signatures"

Step 3: Auto-sync occurs
        Separate Bundle sockets renamed/retyped
        Now match Combine Bundle exactly

Step 4: Connection works correctly
        Data flows without type errors
```

**What Gets Synchronized**:
- Socket names: Updated to match source
- Socket types: Changed to match source types
- Socket order: Rearranged if necessary
- Removed sockets: Added if needed
- Extra sockets: Kept if beneficial

### Manual Syncing

When automatic sync insufficient, manual sync available:

**Manual Sync Button**:
- Appears in node header when mismatch detected
- Label: "Sync Sockets" or similar button
- Click to manually synchronize
- User controls exact sync behavior

**When to Use Manual**:

```
Scenarios:
1. Automatic sync not possible
2. User wants specific sync behavior
3. Multiple sockets, some should match, others shouldn't
4. Custom organization needed
```

**Manual Sync Workflow**:

```
1. Connect bundle nodes (mismatch detected)
2. Sync button appears in header
3. Click Sync Sockets button
4. Dialog appears:
   - Show proposed changes
   - Option to customize
   - Accept or reject changes
5. Synchronization applied
6. Nodes now compatible
```

### Socket Signature Protection

Important: Existing sockets never updated automatically:

**Rule**: 
- New connections: Sockets sync automatically
- Existing connections: Protected from changes
- Reason: Avoid data loss from overwriting

**Example**:

```
Scenario: Two bundles connected, sockets synced
Later: User adds new socket to source bundle

What happens:
- New socket added automatically
- Existing synced sockets: NOT changed
- Prevents data loss from overwriting
- New socket available but not synced
```

**Why This Matters**:
```
Protection prevents accidental data loss:
1. Detailed socket configuration built
2. Source bundle changes
3. Without protection: All sockets would sync
4. With protection: Only new sockets added
5. Existing data preserved
```

## Practical Bundle Workflows

### Simplified Node Group Interfaces

**Scenario**: Complex geometry node group with many inputs.

```
Before (without bundles):
Group with 15 inputs:
- Geometry input
- Position offset X, Y, Z
- Rotation offset X, Y, Z
- Scale offset X, Y, Z
- Color override R, G, B
- Material reference
- Active flag
(15 cluttered input sockets)

After (with bundles):
Group with 4 bundle inputs:
- Geometry
- Transform (offset position, rotation, scale)
- Color (R, G, B)
- Material and flags

Much cleaner interface
Easy to understand structure
```

**Implementation**:

```
Group Input:
- Geometry
- Transform Bundle (3 vectors inside)
- Color Bundle (3 floats + material)

Group uses internally:
1. Separate Transform Bundle → Get individual offsets
2. Separate Color Bundle → Get color components
3. Apply transformations with separated values

Result: Clean external interface
Complex internal processing
```

### Physics Simulations

**Scenario**: Physics solver needs entities and constraints.

```
Physics System Bundles:

Entity Bundle:
├─ Mass (Float)
├─ Position (Vector)
├─ Velocity (Vector)
├─ Acceleration (Vector)
└─ Forces (Geometry)

Constraint Bundle:
├─ Type (Integer)
├─ Target (Object reference)
├─ Strength (Float)
└─ Parameters (Nested bundle)

Solver Node:
- Input: Entity bundle + Constraint bundle
- Single, organized data flow
- No massive input sprawl
```

### Declarative Data Systems

**Scenario**: Store complex data for later evaluation.

```
Scene Description Bundle:

Objects:
├─ Object 1 (Bundle)
│  ├─ Mesh (Geometry)
│  ├─ Material (Material)
│  ├─ Position (Vector)
│  └─ Properties (Bundle)
├─ Object 2 (Bundle)
│  └─ (same structure)
└─ Object 3 (Bundle)
   └─ (same structure)

Processing:
1. Build complete scene bundle
2. Pass through evaluation nodes
3. Each node processes parts it needs
4. Final output: Rendered scene
```

### Texture Set Organization

**Scenario**: PBR material with texture maps.

```
Texture Set Bundle:

PBR Maps:
├─ Base Color (Texture)
├─ Roughness (Texture)
├─ Metallic (Texture)
├─ Normal Map (Texture)
├─ Ambient Occlusion (Texture)
├─ Displacement (Texture)
└─ Emissive (Texture)

Workflow:
1. Load all textures
2. Combine into PBR bundle
3. Pass single bundle to shader
4. Shader separates and uses all maps
5. Clean data organization
```

## Advanced Bundle Techniques

### Nested Bundles

Bundles can contain other bundles:

```
Master Bundle:
├─ Transform Bundle
│  ├─ Position (Vector)
│  ├─ Rotation (Vector)
│  └─ Scale (Vector)
├─ Appearance Bundle
│  ├─ Color (Color)
│  ├─ Material (Material)
│  └─ Transparency (Float)
└─ Behavior Bundle
   ├─ Physics (Bundle)
   │  ├─ Mass (Float)
   │  ├─ Friction (Float)
   │  └─ Elasticity (Float)
   └─ Animation (Bundle)
      ├─ Speed (Float)
      └─ Loop (Boolean)

Single master bundle contains hierarchical data
```

**Nested Workflow**:

```
1. Combine inner bundles (Physics, Animation)
2. Combine mid-level bundles (Behavior)
3. Combine master bundle (all sections)
4. Single master bundle at root
5. Separate at different levels as needed
```

### Conditional Bundle Processing

Bundles with conditional components:

```
Adaptive Bundle:

Base Components:
├─ Geometry
├─ Position
└─ Color

Conditional Components:
├─ Normal Map (if detail > 1.0)
├─ Displacement (if detail > 2.0)
├─ Additional Data (if detail > 3.0)

Processing:
- Assemble bundle with condition-based components
- Downstream node only works with present components
- Flexible bundle structure
```

### Multi-Path Bundles

Bundles split into different processing paths:

```
Input Bundle: (Geometry, Material, Transform)
        ↓
Separate Bundle
        ├→ Geometry → Processing Path 1
        ├→ Material → Processing Path 2
        └→ Transform → Processing Path 3
        ↓
Path 1 Output → Combine → Output Bundle
Path 2 Output → Combine → Output Bundle
Path 3 Output → Combine → Output Bundle
```

## Best Practices

### Bundle Organization

```
1. Logical Grouping
   ✓ Group related data
   ✓ Position, Rotation, Scale together
   ✗ Position, Color, Count together

2. Consistent Naming
   ✓ Position, Rotation, Scale
   ✓ BaseColor, Roughness, Metallic
   ✗ P, R, S
   ✗ Col, Rgh, Met

3. Reasonable Size
   ✓ 3-7 components per bundle
   ✗ 20+ components in single bundle
   
4. Semantic Organization
   ✓ "Transform" bundles contain transforms
   ✓ "PBR" bundles contain material data
   ✗ Mixing unrelated data in one bundle
```

### Documentation

```
When using bundles in groups:
1. Name bundle descriptively
2. Document components
3. Explain data types
4. Clarify usage patterns
5. Show examples in comments
```

### Syncing Strategy

```
1. First Connection
   - Let automatic sync work
   - Check that sockets match expectations
   
2. Later Changes
   - Manual sync if adding new components
   - Verify existing data not overwritten
   
3. Complex Bundles
   - Test syncing before production use
   - Verify all components correctly matched
```

### Performance Considerations

```
1. Bundle Size
   - Single large bundle vs multiple small bundles
   - Large bundles more convenient but harder to debug
   
2. Nesting Depth
   - Shallow nesting (2-3 levels) easiest
   - Deep nesting (5+ levels) becomes complex
   
3. Reusability
   - Standard bundles for common data
   - Custom bundles for specific use cases
```

## Troubleshooting

### Socket Sync Issues

**Problem**: Sync button doesn't appear or doesn't work.

**Solutions**:
1. Verify nodes are both bundle nodes
2. Check data types are compatible
3. Try manual sync from menu
4. Disconnect and reconnect

**Problem**: After sync, sockets have wrong names.

**Solutions**:
1. Undo (Ctrl-Z) and try again
2. Manually rename sockets
3. Use different source bundle structure
4. Check socket source is correct

### Data Loss on Sync

**Problem**: Existing data disappeared after sync.

**Solutions**:
1. Undo (Ctrl-Z) immediately
2. Reconnect in different order
3. Use Join Bundle instead of Sync
4. Manually rename instead of sync

### Incompatible Bundles

**Problem**: Bundles won't connect due to type mismatch.

**Solutions**:
1. Check all socket types
2. Use conversion nodes if needed
3. Restructure bundle to match
4. Create intermediate conversion bundle

## Related Documentation

- [BLENDER_UI_COMMON_UTILITIES_NODES.md](BLENDER_UI_COMMON_UTILITIES_NODES.md) - Bundle node details
- [BLENDER_UI_COMMON_NODES.md](BLENDER_UI_COMMON_NODES.md) - Other common nodes
- [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md) - Socket types and data flow
- [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md) - Creating and modifying nodes
- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node fundamentals
