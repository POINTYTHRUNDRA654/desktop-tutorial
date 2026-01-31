# Common Nodes

## Overview

Common nodes are shared across different node tree types in Blender, providing essential utility, layout, and output functionality. These nodes appear in Shader Editor, Geometry Nodes, Compositor, and other node editors, forming the foundation of node tree organization and data management.

This guide covers the essential common nodes that enable efficient node tree creation and management across all node editors:

- **Output nodes** - Control and enable final tree output
- **Utility nodes** - Bundle data, combine/separate values, manage complex data flows
- **Closure nodes** - Evaluate closure data types
- **Layout nodes** - Organize visual layout and data flow clarity

Understanding these common nodes is essential for building organized, efficient node trees in any Blender node editor.

## Output Nodes

### Enable Output Node

The Enable Output node controls whether a node tree's output is active and contributes to the final result:

**Purpose**:
- Enable or disable entire node tree output
- Toggle between multiple output paths
- Control which output feeds final result
- Useful for conditional processing and variations

**How It Works**:

An output node typically represents the final result of the entire node tree:

```
All Processing
        ↓
    Output Node
        ↓
    Final Result (Material, Geometry, Composite, etc.)
```

**Enable/Disable**:
- Output nodes can be enabled or disabled
- Disabled outputs: Their contribution to final result is skipped
- Enabled outputs: Process normally and contribute to final result
- Visual indication: Disabled nodes appear grayed out

**Use Cases**:

**Shader Editor**:
```
Material Output node enables/disables shader contribution:
- Enabled: Material visible and rendered
- Disabled: Material doesn't affect render
- Useful for comparing material variations
```

**Geometry Nodes**:
```
Geometry Output node controls geometry processing:
- Enabled: Geometry modifications apply
- Disabled: Skip processing, original geometry passes through
- Can have multiple outputs with different enables
```

**Compositor**:
```
Composite Output node controls compositing output:
- Enabled: Composite visible in final image
- Disabled: Skip compositing, source unchanged
- File Output nodes control image sequences
```

**Practical Workflow**:

```
Building shader variations:
1. Create Base Material Output (enabled)
2. Create variant Material Output (disabled)
3. Switch variations by toggling enable:
   - Disable base, enable variant
   - See immediately different result
4. Compare without manual manipulation
5. Re-enable base to revert
```

**Multi-Output Setup**:

```
Scenario: Different materials for different scenarios

Setup:
- Material Output 1: Day material
- Material Output 2: Night material
- Material Output 3: Underwater variant

Workflow:
1. Build all three material outputs
2. Disable 2 and 3 (only 1 active)
3. Scene renders with Material 1
4. Disable 1, enable 2
5. Scene renders with Material 2
6. No node tree changes needed - just toggling
```

## Utility Nodes - Bundle Nodes

Bundle nodes manage complex data grouping and organization, particularly useful in Geometry Nodes where multiple data types flow together.

### Bundle Overview

Bundles group multiple data streams into single connections, reducing visual clutter and improving readability:

**Why Bundles Matter**:
- Geometry nodes often have 10+ data inputs/outputs per node
- Individual connections create visual chaos
- Bundles group related data (e.g., position, rotation, scale)
- Cleaner node tree appearance
- Easier to understand data flow

**Bundle Types**:
- **Input bundles** - Combine multiple data streams into single connection
- **Output bundles** - Split single bundle into individual streams
- **Through bundles** - Pass bundled data through without modification

### Combine Bundle Node

Combines multiple separate data streams into a single bundle:

**Purpose**:
- Take individual value inputs
- Group them into single bundle output
- Reduce connection clutter
- Organize related data together

**How It Works**:

```
Input: Multiple separate sockets
- Position (Vector)
- Rotation (Vector)
- Scale (Vector)
- Color (Color)

Combine Bundle:
- Takes all inputs
- Groups into single bundle output

Output: Single bundle connection
```

**Practical Use**:

```
Scenario: Multiple transform operations need to pass to another node

Before (messy):
Transform Node (outputs: Position, Rotation, Scale)
                    ↓ Position
                    ↓ Rotation
                    ↓ Scale
                    ↙ ↓ ↘
              [Need to feed to another node]
              Multiple individual connections

After (with bundle):
Transform Node → Combine Bundle → Downstream Node
                    Single clean connection
```

**When to Use**:
- Multiple related outputs feeding downstream
- Need to simplify visual complexity
- Managing large geometry nodes trees
- Organizing data for clarity

### Separate Bundle Node

Splits a bundled data stream back into individual sockets:

**Purpose**:
- Take single bundle input
- Extract individual data streams
- Use components separately
- Opposite of Combine Bundle

**How It Works**:

```
Input: Single bundle connection

Separate Bundle:
- Extracts individual components
- Exposes each data type

Output: Multiple separate sockets
- Position (Vector)
- Rotation (Vector)
- Scale (Vector)
- Color (Color)
```

**Practical Use**:

```
Scenario: Bundle arrives, need individual components

Input Bundle (single connection)
        ↓
Separate Bundle
        ↓ Position → One process
        ↓ Rotation → Different process
        ↓ Scale → Another process
        ↓ Color → Final process

Each component goes to appropriate downstream node
```

**Workflow**:

```
1. Receive bundled data from previous node
2. Add Separate Bundle node
3. Connect bundle input
4. Outputs automatically separate by type
5. Use individual outputs as needed
6. Clean, organized data flow
```

### Join Bundle Node

Passes bundled data through while optionally modifying components:

**Purpose**:
- Pass bundle through with selective modifications
- Combine bundle components with new values
- Create new bundles from mixed sources
- Hybrid of Combine and Separate

**How It Works**:

```
Input: Existing bundle + new individual values

Join Bundle:
- Takes bundle data
- Allows replacing specific components
- Recombines with modifications

Output: New bundle with updated components
```

**Example**:

```
Scenario: Have bundled transform, but want to modify only scale

Input Bundle: (Position, Rotation, Scale, Color)
New Scale Input: (1.5, 1.5, 1.5)

Join Bundle:
- Keeps Position (unchanged)
- Keeps Rotation (unchanged)
- Replaces Scale (new value 1.5)
- Keeps Color (unchanged)

Output Bundle: (Position, Rotation, NEW_Scale, Color)
```

**Practical Workflow**:

```
Building complex geometry pipeline:
1. Create transform bundle (all components)
2. Add Join Bundle node
3. Supply new scale value
4. Keep everything else from original bundle
5. Output modified bundle to downstream
6. Cleaner than separating, modifying individually, recombining
```

## Closure Nodes

Closure nodes handle closure data types, primarily used in Shader Editor for BSDF evaluation and combination.

### Closure Node

A closure represents a shader or material response in Blender:

**What is a Closure?**
- Abstract data type representing shader behavior
- Contains material properties (BSDF, emission, transparency)
- Cannot be mathematically manipulated like colors/values
- Must be combined with Mix Shader or similar nodes
- Evaluated to produce final material appearance

**Closure Examples**:
- **BSDF Shaders** - Diffuse, Glossy, Glass, etc.
- **Emission** - Light-emitting surfaces
- **Transparency** - Non-opaque materials
- **Volume** - Volumetric effects

**Closure Limitation**:
- Closures cannot be directly edited
- Cannot add/subtract closures mathematically
- Must use Mix Shader for blending
- Requires Evaluate Closure for processing

**Visual Indicator**:
- Closure sockets display as specialized shape
- Different color than regular data types
- Shows closure-specific connections only

### Evaluate Closure

Evaluates a closure to produce actual material/rendering result:

**Purpose**:
- Convert closure data to renderable output
- Process closure through specific parameters
- Control how closure is displayed/rendered
- Handle closure-specific calculations

**How It Works**:

```
Shader System Overview:
Shader Components → Mix/Combine → Closure → Evaluate → Final Material Output
(BSDF, Emission)   (blending)     (abstract)  (process)   (rendered result)

Evaluate Closure:
- Takes abstract closure definition
- Processes through rendering engine
- Produces final material appearance
- Considers all closure components
```

**Example Workflow**:

```
Building complex material:
1. Create Diffuse BSDF (closure)
2. Create Glossy BSDF (closure)
3. Mix Shader → Blend two closures
4. Result: Mixed closure (abstract)
5. Add Evaluate Closure node
6. Closure → Evaluate → Rendered material
7. Viewport shows actual material appearance
```

**When Needed**:
- Inside node groups processing closures
- Custom shader networks requiring evaluation
- Advanced material workflows
- Group output nodes expecting closure input

**Special Note**:
- Material Output automatically evaluates closures
- Explicit Evaluate Closure needed for intermediate processing
- Useful in node groups for complex shader construction

## Layout Nodes

Layout nodes organize visual structure without affecting data flow:

### Frame Node

Frames visually group related nodes together:

**Purpose**:
- Organize node tree visually
- Group related operations (e.g., "Color Correction", "Roughness Control")
- Improve readability of large node trees
- Color-code sections for quick identification
- No effect on actual data processing

**Visual Organization**:

```
Frame: Color Correction
┌─────────────────────────────┐
│  [Brightness] → [Contrast]  │
│  [Saturation] → [Mix Color] │
└─────────────────────────────┘

Frame: Roughness Control
┌──────────────────────┐
│ [Math] → [Clamp]     │
└──────────────────────┘

Clean, organized appearance
```

**Creating Frames**:
```
1. Select nodes to group
2. Node ‣ Make Frame (or shortcut if available)
3. Frame created encompassing selected nodes
4. Existing connections preserved
5. Visual grouping only
```

**Frame Properties**:
- **Label**: Descriptive name (Color Correction, Roughness, etc.)
- **Color**: Visual identification (red, green, blue, etc.)
- **Size**: Auto-fits to contained nodes or manually adjust
- **Opacity**: Background transparency

**Workflow**:

```
Large shader tree with 30+ nodes:
1. Identify logical sections
   - Input data (textures, values)
   - Color processing
   - Roughness adjustment
   - Final mixing
2. Create frame for each section
3. Color code sections
4. Label clearly
5. Result: Professional, organized appearance
6. Easy navigation and debugging
```

**Moving Frames**:
- Select frame (click border or label)
- G key to move
- Contained nodes move together
- Useful for reorganizing entire sections

**Editing Frames**:
- Double-click label to rename
- Right-click to change color
- Resize by dragging corner/edge
- Contained nodes stay within frame

**Best Practices**:
```
1. Use descriptive labels
   - "Color Correction" not "Group 1"
   - "Roughness Control" not "Section A"

2. Color code logically
   - Input frames: Green
   - Processing frames: Blue
   - Output frames: Red
   - Utilities: Yellow

3. Size appropriately
   - Padding around contained nodes
   - Leave room for expansion
   - Avoid cramped appearance

4. Organize hierarchically
   - Top: Inputs
   - Middle: Processing
   - Bottom: Outputs
```

### Reroute Node

A reroute node redirects connections, improving visual clarity without affecting data:

**Purpose**:
- Redirect connections for better layout
- Avoid crossing/tangled connection lines
- Improve visual flow clarity
- No performance impact (data passes through unchanged)
- Essential for large, complex node trees

**Visual Purpose**:

```
Before (tangled connections):
Node A ↘
        ↘ [Target Node]
        ↗
Node B ↗
(Messy crossing lines)

After (with reroutes):
Node A → [Reroute] ↘
                    [Target Node]
Node B → [Reroute] ↗
(Clean, organized flow)
```

**Creating Reroutes**:

**Method 1 - Drag over existing connection**:
```
1. With reroute node prepared
2. Drag reroute node over existing connection
3. Auto-insert reroute into connection path
4. Reroute becomes intermediate point
```

**Method 2 - Manual creation**:
```
1. Add ‣ Layout ‣ Reroute
2. Connect output of previous node
3. Connect reroute output to next node
4. Data flows through reroute (no change)
```

**Reroute Properties**:
- Single input socket (receives data)
- Single output socket (passes data unchanged)
- Can be moved independently
- Can be duplicated like any node

**Practical Uses**:

**Scenario 1 - Long distance connections**:
```
Input node on left ————————————→ Output on right
                  (very far)

Solution:
Input → [Reroute] → (easier path) → [Reroute] → Output
(Use multiple reroutes to create clean path)
```

**Scenario 2 - Organizing tangle**:
```
Multiple connections going to same node create visual mess.

Use reroutes to separate paths:
- Each source gets its own reroute
- Reroutes arranged vertically/horizontally
- Feed into target node cleanly
```

**Scenario 3 - Vertical flow organization**:
```
Want all connections flowing top to bottom for clarity:

Source Nodes
    ↓
[Reroute] (horizontal offset)
    ↓
Processing Nodes
    ↓
[Reroute] (horizontal offset)
    ↓
Output Node

Clean, readable flow from top to bottom
```

**Reroute Shortcuts**:

Creating reroute quickly:
```
1. While dragging connection
2. Press Shift to create intermediate reroute
3. Reroute auto-inserted into path
4. Faster than adding manually
```

**Muting Reroutes**:
- Reroutes can be muted with M key
- Muted reroutes disable connections
- Useful for testing without removing reroutes
- See Editing Nodes for muting details

**Duplicate Reroutes**:
- Shift-D to duplicate reroute
- Creates additional reroutes quickly
- Useful for parallel paths

## Practical Common Node Workflows

### Bundling Complex Data in Geometry Nodes

**Scenario**: Instancing operation produces multiple attribute outputs, need to pass to another node.

```
Step 1: Instance on Points produces
- Position
- Rotation
- Scale
- Custom attributes (color, index, etc.)

Step 2: Add Combine Bundle node
- Takes all outputs from Instance on Points
- Creates single bundle connection

Step 3: Downstream processing
- Feed bundle to Set Material node
- Or to another instancing operation
- Single clean connection vs. 8+ separate wires
```

### Organizing Large Shader Trees with Frames

**Scenario**: Complex material with 50+ nodes.

```
Step 1: Create frame groups
- Frame 1: Texture Input (3 nodes)
- Frame 2: Base Color Processing (8 nodes)
- Frame 3: Roughness/Metallic (6 nodes)
- Frame 4: Normals/Bump (5 nodes)
- Frame 5: Final Mixing (4 nodes)

Step 2: Color code frames
- Texture: Green
- Processing: Blue
- Normals: Yellow
- Mixing: Red

Step 3: Arrange frames
- Input frames top
- Processing middle
- Mixing bottom

Step 4: Result
- 50 nodes organized into logical sections
- Easy to find specific adjustments
- Professional appearance
- Easy to explain to collaborators
```

### Using Reroutes for Clean Data Flow

**Scenario**: Multiple inputs to Mix Shader create tangled connections.

```
Before:
Diffuse → ↘
          Mix Shader
Glossy  → ↗
Emission → (crossing paths, messy)

After:
Diffuse → [Reroute] ↘
Glossy  → [Reroute] → Mix Shader
Emission → [Reroute] ↗

Each input has reroute intermediate point
Visual flow much cleaner
No performance impact
```

### Conditional Output with Enable/Disable

**Scenario**: Testing material variations quickly.

```
Build Setup:
- Material 1 (enabled): Primary render material
- Material 2 (disabled): Alternative with different roughness
- Material 3 (disabled): Metallic variation

Testing:
1. Render with Material 1
2. Disable 1, enable 2
3. Render comparison
4. Disable 2, enable 3
5. See third variation
6. No node tree changes needed
7. Fast iteration on variations
```

## Common Node Organization Best Practices

### Naming Conventions

**Frames**:
- Use descriptive names
- Capitalize first letter
- Examples: "Color Input", "Roughness Control", "Normal Mapping"
- Avoid generic names like "Section 1" or "Group A"

**Reroutes**:
- Usually don't need names (automatic pass-through)
- Name if organizing complex parallel paths
- Example: "Roughness Path", "Color Distribution"

### Color Coding Strategy

**By Function**:
- Input frames: Green (data coming in)
- Processing frames: Blue (operations)
- Output frames: Red (final results)
- Utilities: Yellow (reroutes, bundles)

**By Data Type**:
- Color operations: Red frame
- Geometry operations: Blue frame
- Value operations: Yellow frame
- Vector operations: Green frame

### Frame Hierarchy

**Layout Pattern**:
```
Top Rows: Input frames
- Textures (green)
- Values (green)
- Environment (green)

Middle Rows: Processing frames
- Color processing (blue)
- Roughness/Metallic (blue)
- Normals/Bump (blue)

Bottom Rows: Combination frames
- Mixing (orange)
- Final output (red)

Clean top-to-bottom visual flow
```

## Related Documentation

- [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md) - Node basics and anatomy
- [BLENDER_UI_SELECTING_NODES.md](BLENDER_UI_SELECTING_NODES.md) - Node selection methods
- [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md) - Node creation, deletion, and modification
- [BLENDER_UI_ARRANGING_NODES.md](BLENDER_UI_ARRANGING_NODES.md) - Node layout and organization
- [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md) - Node editor interface
