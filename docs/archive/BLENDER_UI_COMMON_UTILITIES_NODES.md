# Common Utilities Nodes

## Overview

Common Utilities Nodes are specialized utility nodes that handle data management, bundling, and closure evaluation across all node tree types in Blender. These nodes are essential for:

- **Bundle Nodes** - Combining and separating grouped data streams
- **Closure Nodes** - Managing abstract shader/material data types

These nodes enable efficient data organization in complex node trees and provide the foundation for advanced node workflows in Geometry Nodes, Shader Editor, and other node editors.

## Bundle Nodes

Bundle nodes manage complex data grouping, allowing multiple data streams to be combined into single connections and separated for individual processing. This dramatically reduces visual clutter in large node trees.

### Bundle Concept

A **bundle** is a logical grouping of related data streams:

**Why Bundles Exist**:
- Geometry nodes often have 10+ inputs/outputs per node
- Individual socket connections create visual chaos
- Bundles group related data (position, rotation, scale together)
- Single bundle connection cleaner than 3+ individual wires
- Reduces cognitive load when reading node trees

**Bundle Data Types**:
- Bundles can contain any combination of supported data types
- Position (Vector) + Rotation (Vector) + Scale (Vector) = Transform Bundle
- Red (Color) + Green (Color) + Blue (Color) + Alpha (Float) = Color Bundle
- Any custom grouping of related data

**Visual Appearance**:
```
Without Bundles (messy):
Node A → Output Position ⎤
       → Output Rotation ├→ All individual to Node B
       → Output Scale   ⎦
       (multiple wires crossing)

With Bundles (clean):
Node A → Bundle (Position, Rotation, Scale) → Node B
(single organized connection)
```

### Combine Bundle Node

Combines multiple separate data streams into a single bundle:

**Purpose**:
- Take individual socket outputs
- Group them into unified bundle
- Send bundle as single connection
- Reduce visual complexity

**How It Works**:

```
Inputs: Multiple separate sockets with data
        (each with its own data type)

Combine Bundle:
        ↓
Process: Groups inputs into logical bundle

Output: Single bundle connection
        (contains all input data organized)
```

**Input Sockets**:
- Automatically created when data is connected
- Accept any data type
- Number of inputs depends on what's connected
- Each input adds to the bundle

**Creating a Combine Bundle Node**:

```
1. Add ‣ Utilities ‣ Combine Bundle
2. Node appears with no inputs initially
3. Connect data to inputs as needed
4. Inputs automatically appear when data connects
5. Output socket appears as "Bundle"
```

**Practical Examples**:

**Transform Bundle**:
```
Inputs:
- Position (Vector): (1.0, 2.0, 3.0)
- Rotation (Vector): (0.0, 45.0, 0.0) in degrees
- Scale (Vector): (2.0, 2.0, 2.0)

Output: Single bundle containing all three
```

**Workflow**:
```
1. Create multiple outputs from Transform node:
   - Position output
   - Rotation output
   - Scale output
2. Add Combine Bundle node
3. Connect all three to bundle inputs
4. Single bundle output goes to downstream nodes
5. Much cleaner than three separate connections
```

**Color Data Bundle**:
```
Inputs:
- Base Color (Color): (1.0, 0.5, 0.2)
- Roughness Value (Float): 0.6
- Metallic Value (Float): 0.8
- Normal Map (Vector): Normal data

Output: Single bundle with mixed data types
```

**Advantages**:
- Reduces connection clutter significantly
- Makes node tree easier to read
- Data organization is logical and semantic
- Cleaner appearance in presentations/documentation
- Easier to follow data flow in complex trees

### Separate Bundle Node

Splits a bundled data stream back into individual components:

**Purpose**:
- Extract individual data from bundle
- Use components separately
- Reverse operation of Combine Bundle
- Access specific data from bundled input

**How It Works**:

```
Input: Bundle containing multiple data components
       (single organized connection)

Separate Bundle:
        ↓
Process: Extracts individual components

Outputs: Multiple individual sockets
         (each with separate data)
```

**Output Sockets**:
- Automatically created based on bundle contents
- Each output corresponds to one bundle component
- Data types match original components
- Sockets named descriptively (Position, Rotation, Scale, etc.)

**Creating a Separate Bundle Node**:

```
1. Add ‣ Utilities ‣ Separate Bundle
2. Node appears with no outputs initially
3. Connect bundle to input
4. Outputs automatically appear for each component
5. Each output socket becomes available
```

**Practical Workflow**:

```
Scenario: Receive transform bundle, need individual components

Step 1: Bundle arrives from upstream node
        Single bundle connection

Step 2: Add Separate Bundle node
        Connect bundle input

Step 3: Outputs appear automatically
        - Position socket created
        - Rotation socket created
        - Scale socket created

Step 4: Use individual outputs
        - Position → Feed to Transform node
        - Rotation → Feed to constraint node
        - Scale → Feed to modifier node

Each component goes to appropriate processing
```

**Data Preservation**:
- No data loss in separation
- All components exact copies
- Can separate and recombine without change
- Combine → Separate → Combine = same data

**Common Use Cases**:

**Case 1 - Selective Processing**:
```
Bundle: (Position, Rotation, Scale)
        ↓
Separate Bundle
        ├→ Position (use directly)
        ├→ Rotation (apply constraint)
        └→ Scale (invert values)
        ↓
Each processed separately
Then recombined if needed
```

**Case 2 - Branching Data**:
```
Bundle from one source
        ↓
Separate Bundle
        ├→ Position branch (one workflow)
        ├→ Rotation branch (different workflow)
        └→ Scale branch (third workflow)

Three parallel processing paths from single bundle
```

### Join Bundle Node

Combines a bundle with selective component modifications:

**Purpose**:
- Take existing bundle
- Replace specific components
- Preserve unchanged components
- Output modified bundle

**How It Works**:

```
Input Bundle: Contains Position, Rotation, Scale, Color
New Scale: 1.5 (replacement value)

Join Bundle:
- Keeps Position (unchanged)
- Keeps Rotation (unchanged)
- Replaces Scale (new value)
- Keeps Color (unchanged)

Output Bundle: Modified bundle with new Scale
```

**Hybrid Operation**:
- Part Separate (can modify components)
- Part Combine (recombines back to bundle)
- More efficient than Separate → Modify → Combine

**Creating a Join Bundle Node**:

```
1. Add ‣ Utilities ‣ Join Bundle
2. Connect bundle to input
3. Sockets appear for each bundle component
4. Modify specific components by connecting new values
5. Output: New bundle with selective changes
```

**Component Selection**:
- All bundle components visible as sockets
- Leave unconnected to keep original value
- Connect new value to replace component
- Flexibility in what to replace

**Practical Example**:

```
Scenario: Have transform bundle, want to change only scale

Input Bundle: (Position: 0,0,0; Rotation: 0,0,0; Scale: 1,1,1)

Setup:
1. Add Join Bundle
2. Connect input bundle
3. Leave Position socket empty (keep original)
4. Leave Rotation socket empty (keep original)
5. Connect new Scale (2.0, 2.0, 2.0) to Scale socket

Output: Bundle with new Scale, original Position/Rotation
Result: (Position: 0,0,0; Rotation: 0,0,0; Scale: 2,2,2)
```

**Workflow Efficiency**:

```
Method 1 - Separate, Modify, Recombine (3 nodes):
Bundle → Separate Bundle → Modify Scale ↓
                          → Combine Bundle → New Bundle

Method 2 - Join Bundle (1 node):
Bundle → Join Bundle (plug in new scale) → New Bundle
(More concise, easier to read)
```

**Practical Use Cases**:

**Case 1 - Conditional Modification**:
```
Base bundle: Standard transform
Condition: Apply only if distance > 5.0

Join Bundle:
- If condition true: Replace Scale with new value
- If condition false: Keep original Scale
(Single node handles conditional modification)
```

**Case 2 - Attribute Mixing**:
```
Bundle from source A: (Color: Red, Roughness: 0.5)
Bundle from source B: (Color: Blue, Roughness: 0.8)

Join Bundle:
- Take Color from source A
- Take Roughness from source B
- Output: (Color: Red, Roughness: 0.8)
(Mix attributes from different sources)
```

**Case 3 - Iterative Refinement**:
```
First iteration: Bundle with base values
Second iteration: Use Join Bundle to modify one component
                  Keep all others unchanged
Third iteration: Further refine with another Join Bundle
(Progressive modification preserving stable components)
```

## Closure Nodes

Closure nodes handle closure data types, which represent abstract shader/material responses. Closures are special data types that cannot be mathematically manipulated like colors or vectors.

### Understanding Closures

**What is a Closure?**

A closure is an abstract representation of how a surface responds to light:

```
Physical Concept:
- Light hits surface
- Surface absorbs some
- Surface reflects some
- Surface transmits some
- Closure = Formula for this behavior

Closure ≠ Color:
- Color: RGB values (can be added, multiplied, etc.)
- Closure: Abstract shader definition (cannot be mathematically manipulated)
```

**Closure Examples**:

**Diffuse BSDF Closure**:
- Represents matte, non-reflective surface
- Scatters light in all directions
- Cannot be directly edited like color
- Must use Mix Shader to blend with other closures

**Glossy BSDF Closure**:
- Represents reflective, shiny surface
- Reflects light in specific direction based on roughness
- Abstract definition, not editable values
- Combined with Mix Shader for materials

**Transparent BSDF Closure**:
- Represents non-opaque surface
- Controls light transmission
- Closure type, not material output
- Blended with other closures

**Emission Closure**:
- Represents light-emitting surface
- Self-illuminated material
- Not affected by external light
- Additive to other closures

**Why Closures Exist**:

Closures exist to abstract away shader complexity:

```
Without Closures (complex):
Color → Process → Process → Process → Render
(Need to track every transformation)

With Closures (simple):
BSDF Definition → Mix Shader → Closure → Render
(Abstract representation handles complexity)
```

**Closure Limitations**:
- Cannot add closures directly: Closure1 + Closure2 = ERROR
- Cannot multiply closures: Closure * 2.0 = ERROR
- Cannot invert closures
- Cannot perform math on closures
- Must use Mix Shader for blending

**Visual Identification**:
- Closure sockets have specialized appearance
- Different color than regular data types
- Closure-specific connections only
- Cannot connect closure to color socket

### Closure Node

A simple node that represents a closure type without modification:

**Purpose**:
- Store closure definition
- Reference closure type explicitly
- Create closure starting point
- Define base shader behavior

**Basic Closure Definition**:

```
Closure = Definition of how surface responds to light

Examples:
- Diffuse BSDF (generic dull surface)
- Glossy BSDF (reflective surface)
- Glass BSDF (transparent reflective)
- Emission (self-illuminated)
- Transparent (non-opaque)
```

**In Shader Workflow**:

```
Step 1: Create closure definitions
        Diffuse BSDF → Closure 1
        Glossy BSDF → Closure 2

Step 2: Mix closures
        Closure 1 + Closure 2 → Mix Shader

Step 3: Blend mixture
        Mix Shader → Mixed Closure

Step 4: Evaluate and output
        Mixed Closure → Material Output
```

**Node Properties**:
- Type: Specifies closure type (Diffuse, Glossy, Glass, etc.)
- Parameters: Input sockets for closure-specific values
- Output: Single closure socket

**Creating Closure Nodes**:

```
Shader Editor workflow:
1. Add ‣ Shader ‣ [Closure Type]
   (Examples: Diffuse BSDF, Glossy BSDF, Glass BSDF)
2. Node appears with input parameters
3. Adjust parameters as needed
4. Output closure to Mix Shader or Material Output
```

**Common Closure Types**:

**Diffuse BSDF**:
- Parameters: Color, Roughness, Normal
- Output: Diffuse closure (matte appearance)
- Use: Base matte materials

**Glossy BSDF**:
- Parameters: Color, Roughness, Normal
- Output: Glossy closure (shiny appearance)
- Use: Reflective materials

**Glass BSDF**:
- Parameters: Color, Roughness, IOR, Normal
- Output: Glass closure (transparent reflective)
- Use: Glass, transparent materials

**Emission**:
- Parameters: Color, Strength
- Output: Emission closure (self-illuminated)
- Use: Light-emitting surfaces

**Transparent BSDF**:
- Parameters: Color
- Output: Transparent closure (non-opaque)
- Use: Semi-transparent materials

### Evaluate Closure

Evaluates a closure to produce renderable output:

**Purpose**:
- Convert abstract closure to rendered result
- Process closure through rendering engine
- Handle closure-specific calculations
- Produce final material appearance

**When It's Needed**:

**Automatic (Usually)**:
```
Material Output node automatically evaluates closures
- You don't need explicit Evaluate Closure
- Connected closure evaluated automatically
- Renders correctly without extra node
```

**Explicit (Sometimes)**:
```
Situations requiring explicit Evaluate Closure:
1. Inside node groups processing closures
2. Custom shader networks needing evaluation
3. Advanced material workflows
4. Group output nodes expecting closure input
5. Intermediate closure processing
```

**How It Works**:

```
Rendering Pipeline:
Shader Components → Combine → Closure (Abstract) → Evaluate → Final Material
(BSDF, Emission)   (Mix)    (Math Definition)    (Engine)   (Rendered output)

Evaluate Closure:
- Takes closure definition
- Applies rendering engine
- Considers all closure properties
- Produces final material appearance
```

**Inputs**:
- **Closure**: Input closure to evaluate
- **Light Path**: (Optional) Rendering context information
- **Custom Normal**: (Optional) Override surface normal

**Outputs**:
- **BSDF/Color**: Evaluated result (depends on context)
- **Alpha**: Transparency information
- **Emit**: Emission contribution

**Example Workflow**:

```
Complex Material Building:

Step 1: Create shader components
        Diffuse BSDF → Closure 1
        Glossy BSDF → Closure 2
        Emission → Closure 3

Step 2: Mix closures
        Closure 1 ─┐
        Closure 2 ├→ Mix Shader → Mixed Closure
        Closure 3 ─┘

Step 3: Evaluate (if needed)
        Mixed Closure → Evaluate Closure → Evaluated Material

Step 4: Output
        Evaluated Material → Material Output → Render
```

**In Node Groups**:

```
Group creating complex closure:

Inputs: User-provided parameters
        ↓
Internal Processing: Build closure
        ↓
Evaluate Closure: Process closure
        ↓
Group Output: Evaluated material

Group consumers don't see complexity
Just get final material result
```

**When Explicit Evaluation Needed**:

```
Scenario 1: Custom Shader Group

Group Input: User values
        ↓
Build Closure: Math/blending
        ↓
Evaluate Closure: Process
        ↓
Group Output: Result

Explicit Evaluate Closure ensures proper processing
```

**Scenario 2: Closure Composition**:
```
Scenario: Complex closure combination

Layer 1: Diffuse
Layer 2: Detail Roughness
Layer 3: Emission
Layer 4: Transmission

Each layer: Own Evaluate Closure
Results combined: Final Evaluate Closure
Result: Complex material properly rendered
```

## Practical Bundle and Closure Workflows

### Using Bundles for Transform Data

**Scenario**: Managing transform information through multiple processing steps.

```
Step 1: Create transform data
        Translate Node → Position
        Rotate Node → Rotation
        Scale Node → Scale

Step 2: Combine into bundle
        All three → Combine Bundle → Transform Bundle

Step 3: Pass through pipeline
        Transform Bundle → Instance on Points
        (Single clean connection instead of 3)

Step 4: Extract for individual use
        Transform Bundle → Separate Bundle
        ├→ Position (modify)
        ├→ Rotation (constraint)
        └→ Scale (invert)

Result: Clean data flow through complex process
```

### Using Closures in Material Groups

**Scenario**: Building reusable material node group.

```
Group: Advanced Material Shader

Inputs:
- Base Color
- Roughness
- Metallic
- Emission Strength

Internal Processing:
1. Create Diffuse BSDF (base)
2. Create Glossy BSDF (reflection)
3. Create Emission (light)

Step 1: Diffuse → Closure 1
Step 2: Glossy → Closure 2
Step 3: Mix Closure 1 + Closure 2 → Mixed

Step 4: Add Emission
Step 5: Mix Mixed + Emission → Final Closure

Step 6: Evaluate Closure (explicit processing)

Output: Group Output receives evaluated closure

Result: Group users get complete material
No internal complexity visible
```

### Bundling Multiple Attribute Types

**Scenario**: Geometry has position, normal, color, custom attributes.

```
Bundle: Complete Geometry Attributes

Components:
- Position (Vector)
- Normal (Vector)
- Tangent (Vector)
- Color (Color)
- Custom Attribute 1 (Float)
- Custom Attribute 2 (Float)

Workflow:
1. Extract attributes individually
2. Combine into single bundle
3. Pass through processing as single connection
4. Downstream node separates as needed

Benefit: Single bundle avoids 6+ individual wires
```

## Troubleshooting

### Bundle Issues

**Problem**: Inputs/outputs not appearing on bundle nodes.

**Solutions**:
1. Connect data to node - sockets auto-create
2. Disconnect incompatible types - check data type
3. Ensure upstream nodes provide data
4. Verify node type (Combine vs. Separate)

**Problem**: Cannot find bundle in Add menu.

**Solutions**:
1. Check correct menu: Add ‣ Utilities ‣ Bundle
2. Verify Geometry Nodes is active editor
3. Bundle nodes appear in Geometry editor
4. May not be available in all node types

### Closure Issues

**Problem**: Cannot connect closure to color input.

**Solutions**:
1. Closures cannot connect to color sockets
2. Closures only connect to closure inputs
3. Use Material Output for closure input
4. Use Evaluate Closure for intermediate processing

**Problem**: Closure not rendering correctly.

**Solutions**:
1. Ensure Material Output has closure input
2. Check if Evaluate Closure needed (for groups)
3. Verify closure type matches expected data
4. Check light/render settings

## Best Practices

### Bundle Organization

```
1. Use descriptive socket names
   - "Position" not "P"
   - "Rotation" not "R"
   - "Custom Data" not "D"

2. Bundle related data only
   - Position, Rotation, Scale together ✓
   - Position, Color, Count together ✗

3. Keep bundles shallow
   - 3-5 components per bundle (not 20)
   - Multiple bundles better than one massive

4. Document bundle contents
   - Frame labels: "Transform Data Bundle"
   - Clarify what each bundle contains
```

### Closure Best Practices

```
1. Use Evaluate Closure only when needed
   - Material Output auto-evaluates
   - Explicit evaluation for groups/complex

2. Layer closures semantically
   - Layer 1: Base material
   - Layer 2: Surface detail
   - Layer 3: Emission/glow

3. Mix closures properly
   - Use Mix Shader (not color mixing)
   - Maintain closure type throughout
   - Avoid mathematical operations on closures

4. Group complex closures
   - Wrap in node groups
   - Expose important parameters
   - Hide internal complexity
```

## Related Documentation

- [BLENDER_UI_COMMON_NODES.md](BLENDER_UI_COMMON_NODES.md) - Overview of common nodes
- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node basics and structure
- [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md) - Socket types and data flow
- [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md) - Node creation and modification
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface
