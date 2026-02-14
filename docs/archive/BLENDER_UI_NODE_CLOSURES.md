# Blender UI: Node Closures

## Overview

**Node Closures** represent a fundamental concept in advanced Blender geometry node workflows: they enable passing custom procedural logic as inputs to node groups, allowing dynamic customization without modifying the underlying group structure. A closure acts like a function parameter for node groups, encapsulating reusable sections of nodes that can be executed in different contexts with different internal logic.

Closures are implemented through a dual-node system: the **Closure Zone** (which defines the reusable logic) and the **Evaluate Closure node** (which executes that logic). Together, they create a powerful abstraction mechanism for building modular, flexible, and reusable procedural systems.

Think of closures as "injected behavior"—rather than hard-coding specific processing logic into a node group, you expose a closure input that allows users to define their own processing behavior, which gets executed within the group's controlled environment.

### Key Characteristics

- **Function-Like Parameters**: Closures behave like function inputs, accepting procedural logic as data
- **Socket-Based Matching**: Inputs and outputs matched by name for seamless integration
- **Context Preservation**: Closures execute within the parent node tree's context (fields, attributes, geometry)
- **Signature Management**: Define and lock closure signatures to maintain consistency
- **Automatic Synchronization**: Socket signatures sync automatically when connections made
- **External Value Capture**: Closures can access and preserve values from their defining context
- **Optional Evaluation**: Pass-through mode enables closures to be optional for flexibility
- **Hierarchical Execution**: Closures can be nested, with evaluation occurring in local context
- **Modular Design**: Enable complex systems to be broken into customizable components

### Common Use Cases

Closures excel in numerous production scenarios:

- **Terrain Generation**: Custom tree placement, rock scattering, vegetation distribution rules
- **Procedural Instancing**: User-defined instance distribution and modification logic
- **Field Evaluation**: Custom field operations and transformations
- **Shading Systems**: Custom material evaluation and property processing
- **Parametric Design**: User-defined topology, layout, or structural logic
- **Data Processing Pipelines**: Custom filtering, mapping, or transformation functions
- **Reusable Frameworks**: Build high-level tools with customizable middle layers
- **Advanced Effects**: Complex effects with user-definable sub-operations
- **Conditional Processing**: Custom decision logic injected into procedural systems
- **Quality Presets**: Multiple closure implementations for different quality levels

---

## Closure System Architecture

### Conceptual Model

```
Main Node Tree
├─ Evaluate Closure Node
│  └─ Calls → Closure Zone (User-Defined)
│            ├─ Input: Custom Parameters
│            ├─ Internal Nodes: User Logic
│            └─ Output: Results
│  
└─ Uses Results
   for Further Processing
```

### Data Flow

```
Inputs to Evaluate Closure
        ↓
Pass to Closure by Name
        ↓
Execute Closure Internals
        ↓
Collect Output Values
        ↓
Return to Evaluate Closure
        ↓
Continue Downstream
```

### Two-Node System

**Closure Zone** (Creator)
- Defines the reusable logic
- Specifies input/output interface
- Contains internal node graph
- Can capture external values
- Acts like function definition

**Evaluate Closure** (Executor)
- Calls the closure
- Passes parameters by name
- Executes closure logic
- Returns results
- Acts like function call

---

## Closure Node (Zone)

The **Closure Zone** node defines a reusable section of nodes that encapsulates custom procedural logic. It acts as a container for a node graph that can be passed into other node trees and evaluated in different contexts.

### Node Designation

- **Type**: Geometry Node / Procedural Node
- **Category**: Node > Utilities > Closure
- **Visual**: Large zone box containing internal nodes
- **Interface**: Input zone + Internal workspace + Output zone
- **Scope**: Defines callable procedural logic

### Closure Zone Structure

```
┌─────────────────────────────────┐
│ Closure Zone                    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Input Zone                  │ │
│ │ (Parameters from outside)    │ │
│ └─────┬───────────────────────┘ │
│       │                         │
│ ┌─────v───────────────────────┐ │
│ │ Internal Nodes              │ │
│ │ (User-Defined Logic)        │ │
│ │                             │ │
│ │ [Custom Processing]         │ │
│ └─────┬───────────────────────┘ │
│       │                         │
│ ┌─────v───────────────────────┐ │
│ │ Output Zone                 │ │
│ │ (Results returned outside)  │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### Entering a Closure Zone

To edit the contents of a closure:

1. **Double-Click**: Double-click the Closure Zone node to enter edit mode
2. **Edit Header**: Shows "in Closure Zone" indicating edit mode
3. **Breadcrumb Navigation**: Shows path "Group > Closure Zone" for context
4. **Internal View**: Displays input zone, internal nodes, output zone
5. **Exit**: Press Tab or click breadcrumb to exit and return to parent context

### Closure Zone Inputs

The input zone of a closure defines the parameters that can be passed to the closure when evaluated.

#### Input Socket Creation

**Method 1: Drag and Connect**
1. Drag the blank input socket from the input zone
2. Connect to an internal node's input socket
3. Creates input parameter automatically

**Method 2: Manual Addition**
1. Select the input zone (click "Input" area)
2. In Node properties, click "Add Item"
3. Configure socket name, type, shape
4. Available for connection immediately

**Method 3: Rename and Type Configuration**
1. Double-click input socket name to rename
2. Change type in properties panel
3. Set default value for when unlinked
4. Update shape (Single/Field/Grid) as needed

#### Input Socket Properties

Each input socket has:

- **Name**: Identifier matched by Evaluate Closure node
- **Type**: Data type (Float, Vector, Color, Geometry, Object, Bundle, etc.)
- **Shape**: Data structure (Single, Field, Grid)
- **Default Value**: Used when input unlinked or closure not evaluated
- **Description**: Optional tooltip/documentation (in some Blender versions)

#### Working with Closure Inputs

Inside the closure zone:

1. **Access Input Values**: Connect input sockets to internal nodes
2. **Use Multiple Inputs**: Create complex parameter signatures
3. **Nested Closures**: Closures can contain other closures
4. **External Capture**: Input sockets can access external values
5. **Type Safety**: Input types enforce compatibility

### Closure Zone Outputs

The output zone of a closure defines what results are returned when the closure is evaluated.

#### Output Socket Creation

**Method 1: Drag and Connect**
1. Drag from internal node's output socket
2. Connect to the blank output socket
3. Creates output automatically

**Method 2: Manual Addition**
1. Select the output zone (click "Output" area)
2. In Node properties, click "Add Item"
3. Configure socket name, type, shape
4. Internal nodes connect their results to these

**Method 3: Name and Type Configuration**
1. Double-click output socket name to rename
2. Change type in properties panel
3. Set shape (Single/Field/Grid) as needed
4. Outputs are now ready to receive internal data

#### Output Socket Properties

Each output socket has:

- **Name**: Identifier matched by Evaluate Closure node
- **Type**: Data type (must match connected internal output)
- **Shape**: Data structure (Single, Field, Grid)
- **Source**: Which internal node output feeds this socket

#### Multiple Outputs

Closures can define multiple outputs:

```
Closure Zone Outputs:
├─ Result (Geometry) → From Processing Node
├─ Color (Color) → From Color Node
├─ Density (Float) → From Math Node
└─ Debug (String) → From Debug Node
```

All outputs evaluated simultaneously and returned together.

### Closure Zone Properties

Properties panel for Closure Zone configuration (when selected).

#### Sync Sockets

**Purpose**: Synchronize closure signature with connected Evaluate Closure nodes.

**When to Use**:
1. After renaming input/output sockets
2. After adding or removing sockets
3. When Evaluate Closure node shows mismatch warnings
4. Maintaining signature consistency

**Behavior**:
- Updates Evaluate Closure inputs/outputs to match closure signature
- Preserves existing connections if types compatible
- Generates warnings if types incompatible
- First sync is automatic on connection

#### Define Signature

**Purpose**: Lock the closure's socket signature to preserve consistency.

**When to Enable**:
1. Publishing closure for use by others
2. When closure is finalized and shouldn't change
3. To prevent accidental socket modifications
4. Creating node group templates

**When Locked**:
- Cannot add new input/output sockets
- Cannot rename existing sockets
- Cannot change socket types
- Cannot remove sockets
- Protects against breaking changes

**Unlocking**:
1. Uncheck "Define Signature"
2. Make necessary changes
3. Re-lock to protect signature

#### Input Items Management

In Closure Zone properties, Input Items section shows:

- **List of All Inputs**: Each input socket listed with name, type, shape
- **Add Item Button**: [+] to create new input socket
- **Remove Item Button**: [-] to delete selected input socket
- **Rename**: Double-click name to edit
- **Type Property**: Dropdown to change socket type
- **Shape Property**: Set how data is structured
- **Default Value**: When input unlinked

#### Output Items Management

In Closure Zone properties, Output Items section shows:

- **List of All Outputs**: Each output socket listed
- **Add Item Button**: [+] to create new output socket
- **Remove Item Button**: [-] to delete selected output socket
- **Rename**: Double-click name to edit
- **Type Property**: Dropdown to match internal output type
- **Shape Property**: Defines output data structure

### Closure Signature Concepts

A closure's signature is the contract it defines:

```
Closure Signature = Input Interface + Internal Logic + Output Interface

Example:
┌──────────────────┬──────────────────┬──────────────────┐
│   Input Items    │  Internal Logic  │   Output Items   │
├──────────────────┼──────────────────┼──────────────────┤
│ Position (Vec3)  │                  │ Result (Geom)    │
│ Density (Float)  │ [User Nodes]     │ Color (RGBA)     │
│ Seed (Int)       │                  │ Valid (Bool)     │
└──────────────────┴──────────────────┴──────────────────┘
```

Signatures enable:
- Reliable interface contracts
- Type-safe socket matching
- Consistent closure behavior
- Clear parameter expectations

---

## Evaluate Closure Node

The **Evaluate Closure Node** is the call site for closures. It executes a connected Closure Zone's internal logic, passing input values by name and collecting output results.

### Node Designation

- **Type**: Geometry Node / Procedural Node
- **Category**: Node > Utilities > Closure
- **Input**: Single closure socket + configurable parameter inputs
- **Output**: Results from closure's output zone
- **Function**: Executes closure logic in parent context

### Node Structure

```
[Closure Input]
[Param 1] ──┐
[Param 2] ──┤
[Param N] ──┼─→ [Evaluate Closure] ──→ [Result 1]
            │                          [Result 2]
            └─→ Executes Closure       [Result N]
                Zone Internals
```

### Evaluate Closure Inputs

#### Closure Socket

The primary input that receives a closure.

**Characteristics**:
- **Name**: "Closure"
- **Type**: Closure (accepts Closure Zone outputs)
- **Required**: Functionally optional (pass-through without closure)
- **Single Connection**: Only one closure per node
- **Evaluation Trigger**: Determines which logic to execute

**Connection Behavior**:
1. Connect Closure Zone output to this socket
2. Closure signature automatically inspected
3. Input/output interface updated to match
4. Sockets automatically synced if mismatch detected

#### Interface Inputs

Beyond the closure socket, configurable inputs represent the closure's parameters.

**Parameter Input Sockets**:
- **Names Match Closure Inputs**: By-name connection ensures correct mapping
- **Types Match Closure Input Types**: Enforced type compatibility
- **Default Values**: Used when unlinked or closure not connected
- **Data Flow**: Values passed into closure for evaluation
- **Shape Matching**: Single/Field/Grid shapes match closure expectations

**Creating Interface Inputs**:

Method 1: Automatic via Connection
- Connect Closure Zone
- Inputs automatically generated to match signature
- Sync occurs automatically

Method 2: Manual Configuration
- Click "Add Item" in Node properties
- Set name (must match closure input name)
- Set type to match closure input
- Set shape and default value

**Parameter Examples**:

```
Closure inputs: Seed (Int), Scale (Float), Custom (Geometry)
↓
Evaluate Closure Parameter Inputs:
├─ Seed (Int) - [0] default
├─ Scale (Float) - [1.0] default
└─ Custom (Geometry) - [Empty] default
```

### Evaluate Closure Properties

Properties panel for Evaluate Closure configuration.

#### Sync Sockets

**Purpose**: Synchronize interface to match connected closure's signature.

**When to Use**:
1. After connecting closure to Closure socket
2. When closure signature changes
3. When mismatches detected (warning icon)
4. Maintaining interface consistency

**Sync Behavior**:
- Updates parameter inputs to match closure signature
- Adds inputs for closure inputs
- Removes inputs for deleted closure inputs
- Preserves connections to unchanged inputs

#### Define Signature

**Purpose**: Define a fixed signature that closures must match.

**When to Enable**:
1. Creating template for multiple closures
2. Publishing node group with expected closure
3. Preventing unintended signature changes
4. Documenting closure requirements

**Effect**:
- Locks socket configuration
- Prevents accidental modifications
- Signals closure requirements to users

#### Input Items Management

In properties, Input Items section allows:

- **View All Inputs**: List of parameter input sockets
- **Add Item**: Create new parameter input socket
- **Remove Item**: Delete parameter input socket
- **Rename**: Double-click to edit socket name
- **Type Property**: Change socket data type
- **Shape Property**: Set data structure (Single/Field/Grid)
- **Default Value**: Configure fallback value

#### Output Items Management

In properties, Output Items section shows:

- **List All Outputs**: Each closure output listed
- **Add Item**: Create new output socket (manual mode)
- **Remove Item**: Delete output socket
- **Rename**: Double-click to edit output name
- **Type Property**: Configure output type
- **Shape Property**: Set output data structure

### Evaluate Closure Outputs

#### Output Behavior

**When Closure Connected**:
- Outputs automatically match closure zone's output sockets
- Each output corresponds to a closure output by name
- Types enforced to match closure definition
- Results reflect closure evaluation

**When No Closure Connected**:
- Outputs defined manually in properties
- Pass-through mode enabled
- Parameter inputs passed directly to outputs
- No closure evaluation occurs

#### Output Data Flow

```
Closure Evaluation → Collect Results → Output Sockets

Example:
Connected Closure outputs: Result (Geometry), Color (RGBA)
↓
Evaluate Closure Outputs:
├─ Result (Geometry) [from closure]
└─ Color (RGBA) [from closure]
```

#### Pass-Through Mode

When no closure connected:

- **Automatic Routing**: Named inputs route to named outputs
- **Optional Closure**: Closure becomes optional input
- **Fallback Behavior**: Works without closure connected
- **Flexibility**: Enables conditional closure usage

### Closure Evaluation Behavior

#### Execution Context

When Evaluate Closure node executes:

1. **Preparation**: Input values collected and mapped by name
2. **Inheritance**: Evaluation context includes:
   - Parent node tree's fields and attributes
   - Geometry data from upstream
   - Time and frame information
   - Any captured external values
3. **Execution**: Connected closure's internal nodes run
4. **Result Collection**: Output values gathered from closure outputs
5. **Return**: Results flow to downstream nodes

#### Context Preservation

Closures execute within parent node tree context:

- **Fields Access**: Can use fields from parent tree
- **Attributes**: Can read geometry attributes
- **Geometry Data**: Can access geometry structure
- **External Values**: Can capture and use external data
- **Time Information**: Can access current frame/time

#### Multiple Evaluations

Closures can be evaluated multiple times:

```
[Main Tree Context 1]
├─ Evaluate Closure A
│  └─ Closure 1 executes (Context A)
│
└─ Evaluate Closure B
   └─ Closure 1 executes (Context B)
   
Note: Same closure, different contexts = different results
```

---

## Socket Syncing System

### Signature Matching

Closures rely on socket name matching to connect inputs and outputs correctly.

#### How Matching Works

```
Closure Zone Inputs:        Evaluate Closure Inputs:
├─ Seed (Int)       ←match→ ├─ Seed (Int)
├─ Scale (Float)    ←match→ ├─ Scale (Float)
└─ Offset (Vec)     ←match→ └─ Offset (Vec)

Closure Zone Outputs:       Evaluate Closure Outputs:
├─ Mesh (Geometry)  ←match→ ├─ Mesh (Geometry)
├─ Info (String)    ←match→ └─ Info (String)
```

Names must match exactly (case-sensitive).

#### Mismatch Detection

When signatures don't align:

- **Visual Indicator**: Yellow warning icon in node header
- **Tooltip**: Lists mismatched sockets
- **Sync Button**: [Sync Sockets] appears to resolve
- **Connection Issues**: Mismatched sockets may not connect

**Example Mismatch**:
```
Closure has: Color, Roughness, Metallic
Evaluate has: Color, Roughness (missing Metallic)
→ Warning appears + Sync button available
```

### Automatic Synchronization

**First Connection**:
When a closure is first connected to Evaluate Closure:
1. Closure signature inspected
2. Evaluate Closure interface updated automatically
3. Input sockets created for closure inputs
4. Output sockets created for closure outputs
5. Names, types, shapes all matched

**Manual Synchronization**:
After initial connection, manual sync available:
1. Click "Sync Sockets" button in node header
2. Updates interface to match current closure signature
3. Adds new sockets for new closure items
4. Preserves existing connection if types match
5. Warns about incompatible type changes

### Sync Safety Features

#### Existing Sockets Protection

Automatic sync never modifies existing sockets:

- **Rename Protection**: Existing socket names preserved
- **Type Protection**: Won't change existing socket types
- **Connection Preservation**: Keeps working connections intact
- **Data Safety**: Prevents accidental data loss

#### Manual Override

When protection prevents needed changes:

1. Manually delete incompatible socket
2. Re-sync to recreate with new type
3. Or enable "Define Signature" and manually update
4. Provides explicit control when needed

### Socket Shape System

Sockets can have different shapes defining data structure:

#### Single Shape

```
Value → Processing → Output Value
(1:1 mapping, one output per input)
```

- **Characteristics**: One value in, one value out
- **Use Cases**: Scalar values, single objects, simple data
- **Example**: Float parameter, single geometry input

#### Field Shape

```
Field Values → Processing Per-Value → Field Output
(N:N mapping, processes each value in field)
```

- **Characteristics**: Processes multiple values simultaneously
- **Use Cases**: Per-vertex operations, distributed processing
- **Example**: Float field of vertex densities

#### Grid Shape

```
Grid Data → Processing Grid → Grid Output
(2D/3D structured data)
```

- **Characteristics**: Structured grid or volumetric data
- **Use Cases**: Voxel operations, spatial grids
- **Example**: Volume processing, 3D grid data

#### Shape Matching Requirements

Closure inputs and Evaluate Closure inputs must have:
- **Matching Type**: Float to Float, Geometry to Geometry, etc.
- **Compatible Shape**: Single/Field/Grid must match

Mismatched shapes prevent connections or cause evaluation issues.

### Syncing Workflow

#### Typical Sync Process

1. **Create Closure Zone**: Define inputs/outputs
2. **Connect to Evaluate Closure**: Closure socket connection
3. **Auto-Sync Occurs**: Interface updated automatically
4. **Verify Signature**: Confirm sockets match expectations
5. **Modify Closure**: Add/remove/rename sockets as needed
6. **Manual Sync**: Click [Sync Sockets] to update Evaluate node
7. **Resolve Issues**: Address any type/name mismatches

#### Troubleshooting Sync Issues

**Sync Button Not Appearing**:
- Signatures may already match
- Check if Define Signature is locked
- Verify closure is properly connected

**Sockets Not Syncing**:
- Define Signature may be locked
- Unlock to allow modifications
- Check closure actually changed
- Try manual re-sync

**Type Mismatches Persist**:
- Types must match exactly (Int ≠ Float)
- Use conversion nodes if types differ
- Consider renaming if appropriate
- Verify closure definition is correct

---

## Practical Workflows

### Workflow 1: Custom Scattering in Terrain Generator

Create a terrain generator with user-defined tree placement logic.

**Scenario**: Terrain generator has stable infrastructure (heightmap, water, rocks) but users should define custom tree placement rules.

**Node Setup**:
```
[Terrain Data]
    ↓
[Distribute Points on Terrain]
    ├─ Points generated
    ├─ Density map
    └─ Valid areas
        ↓
[Evaluate Closure] ←─── [Closure Zone]
    └─ Custom Placement Logic
        ├─ Input: Point Position
        ├─ Input: Density
        └─ Output: Tree Mesh
        ↓
[Join Geometry]
    ├─ Trees (from closure)
    ├─ Terrain
    └─ Water
        ↓
[Final Output]
```

**Step-by-Step**:

1. **Create Terrain Generator Group**:
   - Build base terrain (heightmap, geometry)
   - Generate point distribution
   - Create Evaluate Closure node for tree logic

2. **Configure Evaluate Closure**:
   - Input: Position (Vector) - point location
   - Input: Density (Float) - density at point
   - Output: Mesh (Geometry) - tree geometry
   - Output: Valid (Boolean) - whether to place tree

3. **Create Closure Zone for Trees**:
   - Input: Position, Density (match Evaluate inputs)
   - Internal Logic:
     - Test if position valid for tree
     - Use density to determine tree size
     - Generate or select tree geometry
   - Output: Mesh, Valid

4. **Connect Closure**:
   - Closure Zone output → Evaluate Closure's Closure socket
   - Sockets sync automatically
   - Interface matches closure definition

5. **Test and Iterate**:
   - Modify closure logic without changing generator
   - Users create their own closures for custom behavior
   - Generator remains stable while behavior customizable

**Advantages**:
- Generator code stays stable
- Users can customize without modifying group
- Clear input/output contract
- Reusable framework for multiple closures

---

### Workflow 2: Custom Field Evaluation

Use closures to apply custom operations to fields.

**Scenario**: Need to evaluate custom mathematical operations on density fields without hardcoding specific formulas.

**Node Setup**:
```
[Input Field]
    ↓
[Evaluate Closure] ←─── [Closure Zone]
    └─ Custom Field Operation
        ├─ Input: Field Values
        └─ Output: Modified Field
        ↓
[Use Modified Field]
└─ for instance distribution
```

**Implementation**:

1. **Create Closure Zone**:
   - Input: Value (Float Field shape)
   - Internal: Custom math operations
   - Output: Modified (Float Field shape)

2. **Implement Internal Logic**:
   - Use Math nodes for custom formulas
   - Map Fields appropriately
   - Clamp, remap, or transform field values

3. **Place Evaluate Closure**:
   - Receive input field
   - Execute closure evaluation
   - Get modified field back

4. **Use Results**:
   - Modified field drives instance distribution
   - Other nodes use output field
   - Complete customization chain

**Benefits**:
- Custom field operations without group modification
- Field operations isolated in closure
- Reusable for different field types
- Clear field processing contracts

---

### Workflow 3: Multi-Branch Conditional Logic

Use closures for conditional behavior in procedural systems.

**Scenario**: Process geometry differently based on runtime condition, each path using different closure.

**Node Setup**:
```
[Input Geometry]
    ├─ Condition: Processing Type
    ├─ Value A →┐
    │           ├→ [Switch] →─ [Evaluate Closure A] ←─ [Closure A]
    │           │               ↓
    ├─ Value B →┤           [Path A Result]
    │           │
    ├─ Value C →┘
    │
    └─ All Conditions
        ↓
[Evaluate Closure B] ←─ [Closure B]
    └─ Default Behavior
        ↓
[Combine Results]
    ↓
[Output]
```

**Workflow**:

1. **Define Multiple Closures**:
   - Closure A: Processing type A
   - Closure B: Processing type B
   - Closure C: Default processing

2. **Switch Logic**:
   - Input condition determines path
   - Different closure evaluated per path
   - Each closure customizable independently

3. **Combine Results**:
   - Results from different closures merged
   - Join or Mix geometry as appropriate
   - Output complete processed geometry

4. **User Customization**:
   - Users can replace closures with custom versions
   - Each path has independent behavior
   - Modular architecture

**Advantages**:
- Conditional processing with custom behavior
- Multiple closures for different cases
- Each path independently customizable
- Clear separation of concerns

---

### Workflow 4: Parametric Topology with Custom Rules

Use closures to apply custom topology rules to parametric systems.

**Scenario**: Parametric building generator where room layout follows custom rules defined per building.

**Node Setup**:
```
[Building Parameters]
├─ Footprint
├─ Height
└─ Floor Levels
        ↓
[Room Distribution]
        ↓
[Evaluate Closure] ←─ [Closure: Layout Rules]
├─ Input: Floor Number
├─ Input: Available Space
├─ Input: Constraints
└─ Output: Room Placement
        ↓
[Generate Rooms]
        ↓
[Apply Materials via Closure] ←─ [Closure: Material Rules]
        ↓
[Final Building]
```

**Implementation**:

1. **Create Layout Closure**:
   - Inputs: Floor number, available space, constraints
   - Logic: Custom room arrangement algorithm
   - Outputs: Room positions, sizes, types

2. **Create Material Closure**:
   - Inputs: Room type, floor level, exposure
   - Logic: Custom material selection rules
   - Outputs: Material, color, texture

3. **Main Generator**:
   - Evaluate both closures during generation
   - Passes parameters to closures
   - Uses returned geometry/material data

4. **User Customization**:
   - Building style changed by replacing closures
   - Same generator, different architectures
   - Non-destructive parametric design

**Benefits**:
- Parametric flexibility
- Custom rules per building style
- Non-destructive architecture
- Clear topology contracts

---

### Workflow 5: Reusable Procedural Framework

Build high-level tool with multiple customizable closures.

**Scenario**: Create advanced procedural system where multiple aspects are customizable by users.

**Node Setup**:
```
[Input Geometry]
    ├─ [Evaluate Closure: Generation] ←─ [Closure: Generate Base]
    │  └─ Output: Base Geometry
    │
    ├─ [Evaluate Closure: Deformation] ←─ [Closure: Deform Shape]
    │  └─ Input: Base Geometry
    │  └─ Output: Deformed Geometry
    │
    ├─ [Evaluate Closure: Detailing] ←─ [Closure: Add Details]
    │  └─ Input: Deformed Geometry
    │  └─ Output: Detailed Geometry
    │
    └─ [Evaluate Closure: Finalization] ←─ [Closure: Final Processing]
       └─ Input: Detailed Geometry
       └─ Output: Final Result
           ↓
       [Output]
```

**Framework Architecture**:

1. **Base Framework**:
   - Provides stable infrastructure
   - Defines evaluation pipeline
   - Multiple evaluation checkpoints
   - Consistent data flow

2. **Customization Points**:
   - Each Evaluate Closure exposes one aspect
   - Users can customize each aspect
   - Multiple closures for different specializations
   - Clear responsibility separation

3. **Composition**:
   - Results flow through pipeline
   - Each stage customizable independently
   - Modular plug-and-play behavior
   - Easy to understand and modify

4. **Extensibility**:
   - Add new evaluation stages easily
   - Each stage as new Evaluate Closure
   - Can enable/disable stages
   - Can nest stages within closures

**Advantages**:
- Highly reusable framework
- Multiple customization points
- Clear separation of concerns
- Extensible architecture
- High user flexibility

---

### Workflow 6: Closure with External Value Capture

Create closure that preserves and uses external context values.

**Scenario**: Closure that uses parameters from main node tree without explicit inputs.

**Node Setup**:
```
[Main Tree]
├─ Global Scale [2.5]
├─ Color Scheme [Blue]
└─ Density Profile [Dense]
        ↓
[Evaluate Closure] ←─ [Closure Zone]
                      ├─ Captures: Scale, Color, Density
                      ├─ Inputs: Position, Type
                      ├─ Internal: Uses captured values
                      └─ Outputs: Geometry, Color
```

**Implementation**:

1. **Define Global Parameters**:
   - Global Scale, Color, Density etc.
   - Available in main node tree

2. **Create Closure**:
   - Access global parameters within closure
   - Use in internal logic
   - Values captured and preserved
   - Don't require explicit inputs

3. **Closure Logic**:
   - Uses captured scale for sizing
   - Uses captured color for coloring
   - Uses captured density for distribution
   - Clean, minimal input interface

4. **Advantage**:
   - Cleaner input interface (fewer parameters)
   - Context-aware behavior
   - Values preserved from creation context
   - Less explicit parameter passing

**Benefits**:
- Fewer explicit inputs needed
- Context-aware closures
- Cleaner interfaces
- Values frozen at definition time

---

## Best Practices

### Closure Design

**Clear Input/Output Contracts**
- Document expected inputs clearly
- Specify output types and ranges
- Use descriptive names matching purpose
- Create reference examples

**Minimal Input Interfaces**
- Only expose necessary parameters
- Use captured values for context
- Group related inputs logically
- Document why each input exists

**Consistent Signatures**
- Use Define Signature to lock interface
- Maintain consistency across multiple closures
- Document signature requirements
- Create template closures

**Single Responsibility**
- Each closure should do one main thing
- Avoid mixing concerns
- Keep logic understandable
- Easier to test and debug

### Workspace Organization

**Naming Conventions**
- Closure names should describe behavior
- Input/output names should be descriptive
- Use consistent naming across similar closures
- Avoid cryptic abbreviations

**Internal Structure**
- Organize nodes logically within closure
- Use comments to explain complex logic
- Group related nodes together
- Use Reroute nodes for clarity

**Documentation**
- Add node annotations explaining purpose
- Document input/output meanings
- Explain any complex internal logic
- Create usage examples

### Integration Patterns

**Clear Separation**
- Keep main tree logic separate from closure logic
- Use closures for encapsulated functionality
- Main tree provides framework, closure provides behavior
- Clear responsibility distribution

**Error Handling**
- Consider invalid inputs
- Provide sensible defaults
- Graceful degradation on errors
- Return valid data even with bad inputs

**Testing Closures**
- Test with boundary input values
- Verify all outputs are generated
- Check behavior with missing inputs
- Validate type compatibility

### Performance Optimization

**Avoid Redundant Evaluation**
- Don't evaluate same closure multiple times unnecessarily
- Reuse closure results when possible
- Cache results if appropriate
- Profile evaluation performance

**Optimize Internal Logic**
- Keep closure internals lean
- Avoid expensive operations if possible
- Use efficient algorithms
- Profile to identify bottlenecks

**Control Evaluation Frequency**
- Only evaluate when necessary
- Consider muting closures for previews
- Disable expensive closures during editing
- Enable full evaluation for final render

---

## Troubleshooting

### Problem: Closure Signature Mismatch Warning

**Symptoms**
- Yellow warning icon in Evaluate Closure header
- Message about "Socket mismatch detected"
- Tooltip lists mismatched sockets
- Inputs/outputs not connecting properly

**Root Causes**
- Closure inputs added/removed without sync
- Evaluate Closure not updated when closure changed
- Manual socket edits created mismatch
- Signature was locked preventing sync

**Solutions**

1. **Click Sync Sockets Button**:
   - Click the sync button in node header
   - Interface updates to match closure signature
   - Mismatched sockets resolved automatically
   - Connections re-established if possible

2. **Unlock Define Signature**:
   - If signature locked, uncheck "Define Signature"
   - Click Sync Sockets
   - Interface updates
   - Re-lock signature

3. **Manual Correction**:
   - Identify mismatched sockets
   - Manually delete incompatible inputs
   - Re-sync to recreate with correct types
   - Verify socket names match exactly

4. **Verify Closure Inputs**:
   - Double-check Closure Zone has correct inputs
   - Verify names match Evaluate Closure expectations
   - Check types are compatible
   - Fix closure if incorrect there

### Problem: Closure Not Evaluating

**Symptoms**
- Closure output shows default/empty values
- Expected closure results not appearing
- Downstream nodes receive wrong data
- Node appears to ignore closure

**Root Causes**
- Closure socket not connected
- Evaluate Closure node muted or disabled
- Closure Zone not properly defined
- Data flow not reaching closure

**Solutions**

1. **Verify Closure Connection**:
   - Check Closure socket has connection
   - Verify connection is to Closure Zone output
   - Confirm connection line is solid (not broken)
   - Trace back to ensure closure exists

2. **Enable Node**:
   - Check if Evaluate Closure muted (eye icon)
   - Toggle visibility on to enable
   - Verify node isn't disabled in parent
   - Check if within disabled parent group

3. **Inspect Closure Zone**:
   - Double-click to enter closure
   - Verify output zone is defined
   - Check that internal nodes generate output
   - Confirm outputs connected to output zone

4. **Check Data Flow**:
   - Trace inputs to closure
   - Verify all inputs are connected
   - Check that data reaching inputs
   - Verify input data types match expectations

### Problem: Inputs Not Matching Closure Parameters

**Symptoms**
- Parameter inputs don't match closure inputs
- Some closure inputs missing in Evaluate Closure
- Extra inputs appearing that don't match closure
- Cannot connect parameters to closure logic

**Root Causes**
- Closure modified but Evaluate not synced
- Manual socket edits without signature lock
- Signature mismatch between nodes
- Wrong closure connected

**Solutions**

1. **Re-sync Sockets**:
   - Click [Sync Sockets] button
   - Interface automatically updated
   - Missing inputs added, extras removed
   - Names and types corrected

2. **Verify Closure is Correct**:
   - Confirm correct Closure Zone connected
   - Inspect closure's actual inputs
   - Double-click to verify definition
   - Ensure closure is finalized

3. **Manual Parameter Addition**:
   - If sync doesn't work, manually add inputs
   - Click "Add Item" in properties
   - Name input exactly as closure input
   - Set type to match closure input
   - Configure shape and default value

4. **Clear and Reconnect**:
   - Disconnect closure socket
   - Wait for interface to clear
   - Reconnect closure socket
   - Let auto-sync rebuild interface

### Problem: Muted Closure or Pass-Through Not Working

**Symptoms**
- When closure muted, expected pass-through not occurring
- Values disappear when closure disabled
- Expected pass-through routing not happening
- Outputs empty when closure muted

**Root Causes**
- Pass-through mode not properly configured
- Input/output names don't match for pass-through
- Manual outputs not defined for pass-through mode
- Closure not actually muted

**Solutions**

1. **Configure Pass-Through Outputs**:
   - In Evaluate Closure properties, Output Items
   - When no closure connected, define outputs manually
   - Create outputs matching input names
   - Same naming enables pass-through routing

2. **Verify Muting**:
   - Check eye icon (should be hidden when muted)
   - Verify node is actually disabled
   - Check parent context (may not support muting)
   - Toggle mute off and on

3. **Enable Named Pass-Through**:
   - Set up matching input/output names
   - Example: Input "Position" → Output "Position"
   - When muted, Position input passed to Position output
   - Multiple inputs/outputs can pass through

4. **Alternative: Use Switch Node**:
   - Place Switch node after Evaluate Closure
   - Switch between closure results and fallback
   - More explicit than pass-through mode
   - Better control over behavior

### Problem: Closure Won't Accept Connection

**Symptoms**
- Cannot connect Closure Zone output to Closure socket
- Connection line appears momentarily then breaks
- Closure socket appears blocked or incompatible
- Error about incompatible types

**Root Causes**
- Connected node is not a Closure Zone
- Closure Zone output not connected
- Type mismatch between closure and socket
- Socket expecting different closure type

**Solutions**

1. **Verify Closure Zone**:
   - Ensure connected node is actually Closure Zone
   - Not another node type
   - Check node category (should be Closure)
   - Inspect node designation

2. **Check Output Type**:
   - Closure Zone must have Closure type output
   - Outputs from internal nodes aren't closures
   - Must connect Zone's output, not internal nodes
   - Verify output socket type is Closure

3. **Verify Socket Type**:
   - Evaluate Closure Closure socket should accept Closure type
   - Some nodes may have different closure requirements
   - Check properties if socket appears blocked
   - Verify socket is configured correctly

4. **Create Proper Closure**:
   - If connection fails, create new Closure Zone
   - Define inputs and outputs properly
   - Verify internals are set up
   - Then connect to Evaluate Closure

### Problem: External Value Capture Not Working

**Symptoms**
- Values from outside closure not accessible inside
- Captured values appear as empty/default
- External parameters not frozen at closure definition
- Closure unable to access parent tree values

**Root Causes**
- External values not connected to closure inputs
- Captured values lost when context changes
- Values disconnected or modified
- Capture point not established properly

**Solutions**

1. **Verify Connections**:
   - Within closure, connect input sockets to parent nodes
   - External values must flow into closure inputs
   - Check that connections are solid (not broken)
   - Trace back to ensure values exist

2. **Use Input Sockets**:
   - Always connect external values to closure inputs
   - Don't try to access external nodes directly
   - Input sockets capture values at definition time
   - Values preserved in closure signature

3. **Establish Capture Points**:
   - For each external value to capture, create input socket
   - Connect external value to input
   - Values now "frozen" in closure definition
   - Can use in closure internals

4. **Test Capture**:
   - Verify captured values match source
   - Check that values update when source changes
   - Confirm values are used correctly in internals
   - Test across different contexts

### Problem: Performance Issues with Complex Closures

**Symptoms**
- Closure evaluation becomes slow
- Viewport updates lag when closure active
- Complex closure operations cause freezing
- Evaluation time increases with closure complexity

**Root Causes**
- Closure internals have expensive operations
- Too many nodes within closure
- Expensive geometry operations within closure
- Closure evaluated excessively

**Solutions**

1. **Simplify Internal Logic**:
   - Reduce nodes within closure
   - Remove unnecessary operations
   - Use efficient algorithms
   - Optimize expensive calculations

2. **Move Operations Out**:
   - If possible, move complex logic outside closure
   - Compute values before passing to closure
   - Use captured values instead of computing inside
   - Reduce what closure must compute

3. **Control Evaluation**:
   - Disable closure during editing
   - Mute Evaluate Closure for viewport work
   - Enable only for final render
   - Use LOD variations for viewport/render

4. **Profile Closure**:
   - Use Blender's profiler to identify bottlenecks
   - Determine which operations are expensive
   - Focus optimization on slowest operations
   - Measure improvements after each change

---

## Advanced Techniques

### Technique 1: Hierarchical Closure Nesting

Create closures that contain other closures for complex behaviors.

**Concept**: Closures can contain Evaluate Closure nodes, allowing nested closure evaluation.

**Example: Nested Effects**

```
Main Closure
├─ Evaluate Closure A (Sub-closure 1)
│  └─ Closure A internals
│
├─ Evaluate Closure B (Sub-closure 2)
│  └─ Closure B internals
│
└─ Combine Results
   (from both sub-closures)
```

**Implementation**:

1. **Create Sub-Closures**: Define smaller, focused closures
2. **Create Main Closure**: Contains Evaluate Closure nodes
3. **Evaluate Sub-Closures**: Within main closure
4. **Combine Results**: Use outputs from sub-closures
5. **Expose Main Closure**: To users

**Benefits**:
- Modular closure composition
- Easier to manage complex behaviors
- Reusable sub-closures
- Clear hierarchical structure

---

### Technique 2: Conditional Closure Selection

Dynamically select between different closures based on conditions.

**Concept**: Use Switch nodes to evaluate different closures based on input conditions.

**Example: Quality-Level Selection**

```
[Quality Level Input]
    ↓
[Switch]
├─ Low → [Evaluate Closure: Fast]
├─ Mid → [Evaluate Closure: Balanced]
└─ High → [Evaluate Closure: Quality]
    ↓
[Output]
```

**Implementation**:

1. **Create Multiple Closures**: Different quality/approach options
2. **Switch Logic**: Condition determines which closure to evaluate
3. **Evaluate Only Active**: Only connected closure evaluates
4. **Results Combined**: Different results based on selection
5. **User Flexibility**: Can switch quality without modifying main tree

**Benefits**:
- Flexible behavior selection
- Quality-level optimization
- Non-destructive quality switching
- Clean architecture

---

### Technique 3: Closure with Fallback Logic

Implement fallback behavior when closure fails or is unavailable.

**Concept**: Evaluate Closure pass-through enables fallback when closure disconnected.

**Example: Safe Closure with Fallback**

```
Input Data
    ├─ [Evaluate Closure] ← [Custom Closure]
    │  └─ If connected: Use custom logic
    │  └─ If not connected: Pass through
    │
    ├─ [Fallback Logic] (if closure not active)
    │
    └─ [Combine Results]
```

**Implementation**:

1. **Configure Pass-Through**: Set up matching input/output names
2. **Define Fallback Logic**: Secondary processing path
3. **Conditional Routing**: Use Switch to select closure or fallback
4. **Graceful Degradation**: Works with or without closure
5. **User Choice**: Can use custom closure or fallback

**Benefits**:
- Robust to missing closures
- Fallback behavior for safety
- Optional custom closures
- Error resilience

---

### Technique 4: Closure Parameter Validation

Create closures that validate input parameters and provide meaningful errors.

**Concept**: Internal closure logic validates inputs and provides status outputs.

**Example: Validated Processing**

```
Closure
├─ Inputs: Data, Parameters
├─ Validation Logic:
│  ├─ Check parameter ranges
│  ├─ Verify data validity
│  └─ Clamp/correct if needed
├─ Processing: Use validated data
└─ Outputs:
   ├─ Result (Geometry)
   ├─ Valid (Boolean)
   └─ DebugInfo (String)
```

**Benefits**:
- Input validation happens within closure
- Clear error reporting
- Safe parameter handling
- Informative debug output

---

## Related Documentation

Learn more about related Blender topics:

- **[Separate Bundle Node](BLENDER_UI_SEPARATE_BUNDLE_NODE.md)**: Extract data from bundles; often used with closures
- **[Combine Bundle Node](BLENDER_UI_COMBINE_BUNDLE_NODE.md)**: Create bundles; frequently used in closure inputs
- **[Join Bundle Node](BLENDER_UI_JOIN_BUNDLE_NODE.md)**: Merge bundles for closure parameters
- **[Common Nodes](BLENDER_UI_COMMON_NODES.md)**: Overview of utility nodes including closures
- **[Common Utilities Nodes](BLENDER_UI_COMMON_UTILITIES_NODES.md)**: Detailed closure node reference
- **[Editing Nodes](BLENDER_UI_EDITING_NODES.md)**: Techniques for working with nodes and zones
- **[Arranging Nodes](BLENDER_UI_ARRANGING_NODES.md)**: Best practices for visual organization
- **[Nodes](BLENDER_UI_NODES.md)**: Fundamental node concepts and operations
- **[Node Editors](BLENDER_UI_NODE_EDITORS.md)**: Interface for different node editor types
- **[Operators](BLENDER_UI_OPERATORS.md)**: Blender operations and shortcuts
- **[Undo/Redo](BLENDER_UI_UNDO_REDO.md)**: History management in node systems

---

**Version**: Blender 4.0+  
**Last Updated**: 2026  
**Difficulty Level**: Advanced  
**Typical Use**: Procedural systems, reusable tools, customizable node groups
