# Blender UI: Object Parenting, Properties, and Collections

## Introduction

Object relationships form the backbone of scene organization in Blender. Through parenting, you can create hierarchical transformations where parent objects control child objects. Collections provide logical grouping for scene management. Properties and visibility settings control how objects behave and interact with the render pipeline.

This documentation covers the complete system for managing object relationships, organization, and properties.

---

## Asset Operations

Asset operations allow you to designate objects as reusable assets within the Asset Browser system.

### Mark as Asset

**Purpose**:
Designates the selected object as an asset, making it available in the Asset Browser for reuse across projects.

**Workflow**:
1. Select object in Object Mode
2. Object ‣ Asset ‣ Mark as Asset
3. Object now appears in Asset Browser
4. Can be dragged into other .blend files

**Asset Benefits**:
- Reusable across projects
- Organized in Asset Browser
- Can have preview images auto-generated
- Searchable and filterable
- Quick access to common elements

**See Also**: Creating an Asset documentation for detailed asset workflow.

### Clear Asset

**Purpose**:
Removes the asset designation from the selected object, removing it from Asset Browser.

**Workflow**:
1. Select asset object
2. Object ‣ Asset ‣ Clear Asset
3. Object no longer appears in Asset Browser
4. Still available as regular scene object

### Clear Asset (Set Fake User)

**Purpose**:
Removes asset designation while setting a fake user on the object data block, ensuring the object isn't deleted when unused.

**Workflow**:
1. Select asset object
2. Object ‣ Asset ‣ Clear Asset (Set Fake User)
3. Object removed from Asset Browser
4. Object data preserved even if unlinked

**See Also**: Removing Assets documentation for complete asset cleanup procedures.

---

## Parenting Objects

Parenting creates hierarchical relationships where parent objects control child objects' transformations. Children inherit their parent's location, rotation, and scale while maintaining independent transforms relative to the parent.

### Purpose

**Why Parenting?**:
- **Complex Objects**: Separate modeling parts that move together (watch parts, character limbs)
- **Organizational Control**: Parent empty controls multiple children with single transform
- **Animation**: Animate parent; children follow automatically
- **Rigging**: Bone parenting for character animation
- **Constraints**: Parent objects serve as constraint targets
- **Hierarchical Transforms**: Build chains of control (grandparent → parent → child)

### Parenting Hierarchy Rules

**Single Parent Rule**:
Each object has **at most one parent**. If you parent an object that already has a parent, the previous parent relationship is removed.

**Direction of Influence**:
- **Parent → Child**: Parent transformations affect all children
- **Child → Parent**: Child transformations do NOT affect parent
- **Siblings**: Objects with same parent are siblings
- **Inheritance**: Children only inherit from direct parent, not grandparent (unless parent is transformed)

**Terminology**:
- **Parent**: Direct parent object
- **Parents** (plural): Hierarchy of ancestors (parent, grandparent, great-grandparent, etc.)

### Make Parent (Ctrl+P)

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Parent
- **Shortcut**: Ctrl+P

**Basic Workflow**:

1. **Select child objects first** (single or multiple)
2. **Shift+click to add parent object last** (becomes active)
3. **Press Ctrl+P** to open Set Parent To menu
4. **Select parenting type** from popup menu
5. **Confirm** to establish relationship

**Result**:
Selected objects become children of the active object. Parent transformations affect all children.

### Set Parent To Menu

The Set Parent To popup is **context-sensitive**—available options change based on selection.

**Available Parenting Types**:
- Object (basic hierarchical)
- Armature Deform (skeleton-based)
- Bone (specific armature bone)
- Curve Deform (deformation along curve)
- Follow Path (movement along curve)
- Path Constraint (constraint-based)
- Lattice Deform (lattice-based deformation)
- Vertex (single vertex)
- Vertex (Triangle) (three vertices)

**Selection Requirements**:
Depending on parenting type, different selections are needed:
- **Object**: Any objects
- **Bone**: Parent must be armature, parent object selected in Pose Mode
- **Vertex**: Parent must have vertices/points, vertices selected in Edit Mode

---

## Keep Transform

**Behavior**:
Automatically computes and preserves the object's **current world transform** (absolute location, rotation, scale) when parenting.

**Mechanism**:
1. Current world transform is recorded
2. New parent is set
3. Parent Inverse matrix is calculated
4. Child appears in same visual location after parenting

**Why Keep Transform**:
Without Keep Transform, parenting can cause the child to "jump" to the parent's location because it's now inheriting the parent's transforms. Keep Transform prevents this jump.

**Use Cases**:
- Changing parents while preserving visual position
- Moving objects between hierarchies
- Organizing scene without disrupting positions

---

## Parent Inverse Matrix

**What is Parent Inverse?**:
A hidden transformation matrix that sits between parent and child transforms, offsetting the child relative to parent.

**Purpose**:
Allows child to maintain its current world position even though it's now inheriting parent's transforms.

**When It's Set**:
Automatically calculated when parenting with Ctrl+P (depending on parenting type choice).

**Reading the Matrix**:
The Parent Inverse is decomposed into:
- Location offset
- Rotation offset
- Scale offset

These represent how much the child is offset from the parent's origin.

**Clearing Parent Inverse**:
See Clear Parent Inverse section below.

**Important Note**:
When setting parent via Object Properties panel (instead of Ctrl+P), Parent Inverse is **always reset**, which can cause unexpected jumps. Use Ctrl+P to avoid this.

---

## Parenting Types

### Object Parent

**Most General Parenting**:
Makes the active object the parent of all selected objects. Works with any object type.

**Behavior**:
- Child inherits parent's Location, Rotation, Scale
- Child moves/rotates/scales with parent
- Parent type can be changed; previous parent is cleared

**Operators** (differ in Parent Inverse and local transform calculation):

#### Object (Default)

**Effect**:
- Clears preexisting parent relationship
- Resets Parent Inverse matrix
- Child moves to its own location/rotation/scale without parent's influence
- Child now positioned relative to parent's origin

**Use When**:
- Creating fresh parent relationship
- Parent has transformations you don't want to inherit
- Setting up new hierarchies

#### Object (Keep Transform)

**Effect**:
- Keeps any previous parent transformations applied to child
- Parent Inverse matrix calculated to preserve visual position
- Child stays at same world location after parenting
- Useful when changing parents

**Use When**:
- Changing child from one parent to another
- Reorganizing hierarchy while preserving child's position
- Maintaining previous scale/rotation from old parent

**Example**:
```
Scenario: Monkey parented to EmptyA (scaled), now reparent to EmptyB
- Without Keep Transform: Monkey size resets to original (EmptyB hasn't scaled it)
- With Keep Transform: Monkey keeps scaled size from EmptyA (visual size preserved)
```

---

### Bone Parent

**Armature Bone Parenting**:
Makes a specific bone in an armature the parent of other objects.

**Behavior**:
- Only the specific bone controls the child
- Child only transforms when that bone (or parent bones) are transformed
- Enables bone-driven object control
- Essential for rigged character animation

**Setup Workflow**:
1. Select all child objects (the objects to be parented to bone)
2. **Shift+click** to add armature object to selection
3. **Tab** into Pose Mode with armature still selected
4. **Select specific bone** by LMB clicking it
5. **Ctrl+P** and select "Bone" from menu
6. **Confirm** to establish parenting

**Result**:
Child objects now follow the selected bone's transformations in Pose Mode.

**Example**:
Armature with 4 bones:
- Child parented to Bone 2
- Transforming Bone 1 or Bone 2 affects child
- Transforming Bone 3 or Bone 4 does NOT affect child
- Only direct ancestors in bone chain have influence

### Bone Relative Parenting

**Difference from Standard Bone Parenting**:
**Standard Bone Parenting** vs **Bone Relative Parenting**:

| Aspect | Standard Bone | Bone Relative |
|--------|---------------|---------------|
| **Edit Mode Move** | Child snaps to new pose position | Child does NOT move |
| **Pose Mode Return** | Child at new bone pose location | Child stays at original position |
| **Use Case** | Rigid attachments | Flexible, follow-up animations |

**Behavior Example**:
Standard Bone Parenting:
1. Child parented to bone at (0, 0, 0)
2. Bone moved in Edit Mode to (0, 5, 0)
3. Switch to Pose Mode
4. Child appears at (0, 5, 0) — moved to new pose position

Bone Relative Parenting:
1. Child parented to bone at (0, 0, 0)
2. Bone moved in Edit Mode to (0, 5, 0)
3. Switch to Pose Mode
4. Child still at (0, 0, 0) — doesn't move to new pose position

**Use Cases**:
- **Standard**: Objects glued to bones (armor, clothing)
- **Relative**: Objects following bones loosely (attachments that maintain distance)

**Per-Bone Setting**:
The Ctrl+P menu choice automatically sets or clears the "Relative Parenting" option for the selected bone, affecting all children of that bone at once.

---

### Vertex Parent

**Mesh Vertex Parenting**:
Uses one or more vertices of a mesh or curve as the parent of other objects.

**Types**:
1. **Single Vertex**: Child follows one vertex position
2. **Three Vertices**: Child follows averaged center of three vertices

**Supported Parent Types**:
- Mesh
- Curve
- Surface
- Lattice

#### Vertex Parent from Edit Mode

**Workflow**:
1. Select child object(s) in Object Mode
2. Shift+click to select parent object
3. **Tab** into Edit Mode with parent selected
4. **Select either**:
   - One vertex (single point)
   - Three vertices (area definition)
5. **Ctrl+P** and select "Vertex" or "Vertex (Triangle)"
6. **Confirm**

**Result**:
- Single vertex: Relationship line drawn from vertex to child
- Three vertices: Relationship line from averaged center to child
- Child follows vertex/vertices as parent mesh deforms

**Behavior**:
As parent mesh is deformed in Edit Mode, child objects move along with the selected vertices.

#### Vertex Parent from Object Mode

**Workflow**:
1. Select child object(s) in Object Mode
2. Shift+click to select parent object
3. **Ctrl+P** and select "Vertex" or "Vertex (Triangle)"
4. **Confirm** (no Edit Mode needed)

**Automatic Selection**:
Nearest vertices are automatically used from the parent object.

**Advantage**:
Rapid setup for multiple vertex parents—all children parented to nearest vertices simultaneously.

#### Vertex Parent Use Cases

**Example: Particles Follow Deforming Mesh**:
1. Icosphere with children cubes
2. Vertices selected as parents
3. Icosphere reshaped in Edit Mode
4. Each cube follows its vertex parent
5. Cubes follow deformation naturally

**Alternative to Hooks**:
Vertex parenting is essentially "reversed" hook behavior—instead of vertices being pulled by objects, objects are pulled by vertices.

---

## Make Parent without Inverse

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Parent ‣ Make Parent without Inverse

**Effect**:
1. Parent is set
2. Parent Inverse matrix is **reset** (empty/identity)
3. Object's local location is reset
4. **Result**: Child moves to parent's location, keeps rotation and scale

**Outcome**:
Child appears at parent's origin with parent's rotation/scale, but child transforms are now relative to parent.

---

## Keep Transform (Parent Option)

**Purpose**:
When setting a parent, compute the child's current world transform and calculate Parent Inverse so visual position/rotation/scale are preserved.

**Mechanism**:
1. Record child's current world location, rotation, scale
2. Set parent
3. Calculate Parent Inverse to maintain world transform
4. Child appears unchanged visually

**Result**:
Child keeps exact same position, rotation, and size in world space after parenting, despite now inheriting parent's transforms.

---

## Clear Parent

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Parent
- **Shortcut**: Alt+P

### Clear Parent

**Effect**:
Removes parent-child relationship completely.

**Behavior**:
- **If parent is selected**: Nothing happens
- **If child/children are selected**: Children are freed from parent
- **Positioning**: Children return to original location, rotation, size (or world positions they had after parent transformations)

**Result**:
Child objects become independent with their own transforms.

### Clear and Keep Transformation

**Effect**:
Removes parent relationship AND preserves all location, rotation, scale values the child received from the parent.

**Behavior**:
1. Frees child from parent
2. Keeps the transformations the child had from parent
3. Child retains its current world position, rotation, scale

**Use Case**:
When you want to finalize parent-driven transformations before unlinking.

**Limitation - Non-Uniform Scale**:
If parent has non-uniform scale and rotation, child may have shear distortion. When parent is cleared, shear cannot be represented by location, scale, rotation alone, so child position may shift unexpectedly.

---

## Clear Parent Inverse

**Effect**:
Clears the **Parent Inverse matrix** without removing the parent relationship.

**Mechanism**:
1. Parent-child relationship remains intact
2. Parent Inverse reset to identity (no offset)
3. Child's Location, Rotation, Scale now interpreted directly in parent's coordinate space

**Result**:
Child transform properties are now directly relative to parent's origin.

**Use Case**:
When you want child to follow parent's origin exactly, without offset.

---

## Editing Modifiers

Modifiers are non-destructive deformations, effects, and generators applied to objects.

### Add Modifier

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Modifiers ‣ Add Modifier

**Effect**:
Opens a menu with all available modifier types, selecting one adds it to the modifier stack.

**Modifier Stack**:
Modifiers are applied in order from top to bottom of the stack.

**Workflow**:
1. Select object in Object Mode
2. Object ‣ Modifiers ‣ Add Modifier
3. Choose modifier type from popup menu
4. Modifier is added to bottom of stack
5. Adjust parameters in modifier panel

### Copy Modifiers to Selected Objects

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Modifiers ‣ Copy Modifiers to Selected Objects

**Effect**:
Copies **all modifiers** from active object to other selected objects.

**Workflow**:
1. Select target objects + active object (with modifiers)
2. Object ‣ Modifiers ‣ Copy Modifiers to Selected Objects
3. All target objects now have same modifiers as active object
4. Modifier settings are copied, but targets may be different

**Use Case**:
Apply same deformation stack to multiple objects quickly.

### Clear Object Modifiers

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Modifiers ‣ Clear Object Modifiers

**Effect**:
Removes **all modifiers** from selected objects.

**Workflow**:
1. Select object(s) with modifiers
2. Object ‣ Modifiers ‣ Clear Object Modifiers
3. All modifiers deleted
4. Object returns to unmodified state

---

## Constraints

Constraints limit or drive transformations through relationships to other objects, bones, or properties.

### Add Constraint (with Targets)

**Reference**:
- **Mode**: Object Mode and Pose Mode
- **Menu**: Object ‣ Constraint ‣ Add Constraint (with Targets)

**Effect**:
Opens constraint type menu and adds constraint to active object.

**With Other Objects Selected**:
If another object is selected besides active one, that object becomes the constraint target (if the constraint type supports targets).

**Armature Bones**:
When using a bone from non-active armature as target:
- Tool looks inside non-active armature
- Uses active bone of that armature
- Only works if armature is in Pose Mode

**Workflow**:
1. Select target object (optional)
2. Select constrained object (active)
3. Object ‣ Constraint ‣ Add Constraint (with Targets)
4. Choose constraint type
5. Target is automatically set if selected

### Copy Constraints to Selected Objects

**Reference**:
- **Mode**: Object Mode and Pose Mode
- **Menu**: Object ‣ Constraint ‣ Copy Constraints to Selected Objects

**Effect**:
Copies all constraints from active object to selected objects.

**Workflow**:
1. Select target objects + active object (with constraints)
2. Object ‣ Constraint ‣ Copy Constraints to Selected Objects
3. All constraints copied to target objects
4. Targets may need adjustment per object

### Clear Object Constraints

**Reference**:
- **Mode**: Object Mode and Pose Mode
- **Menu**: Object ‣ Constraint ‣ Clear Object Constraints

**Effect**:
Removes all constraints from selected objects.

**Workflow**:
1. Select object(s)
2. Object ‣ Constraint ‣ Clear Object Constraints
3. All constraints deleted

### Track Constraints

**Purpose**:
Add tracking constraints that make objects look at or follow targets.

**Available Track Types**:
- **Damped Track Constraint**: Smooth rotation toward target
- **Track To Constraint**: Direct rotation toward target with up vector
- **Lock Track Constraint**: Lock specific axis while tracking target

**Workflow**:
1. Select child object(s) (will be constrained)
2. Shift+click to select target object (optional, can set later)
3. Object ‣ Track (choose type)
4. Constraint added with target object as target

**Clear Track**:
- **Removes** Damped Track, Track To, Lock Track constraints

**Clear Track with Keep Transformation**:
- Removes track constraints
- **Keeps** the final transform they caused

---

## Relations: Make Single User

Converts shared data blocks (linked duplicates) into independent single-user copies.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Relations ‣ Make Single User

**Purpose**:
When objects share data (linked duplicates), changes to one affect all. Make Single User breaks this link, creating independent copies.

**Use Cases**:
- Unlink material to edit independently
- Separate mesh data after Duplicate Linked (Alt+D)
- Make animation unique to one object
- Customize previously linked objects

### Operations

#### All / Selected Objects

**All**: Make single-user copies for all objects in scene
**Selected Objects**: Make single-user copies only for selected objects

#### Data-Block Types

Choose which types of data to make single-user:

**Object**:
Make the object itself single-user (separate from other instances).

**Object Data**:
Make the object data (mesh, curve, etc.) unique to this object.

**Materials**:
Make materials local to each object (each has own material copy).

**Object Animation**:
Make object property animations (keyframes) unique to each object.

**Object Data Animation**:
Make object data animations (mesh animations) unique to each object.

---

## Link/Transfer Data

Operations for sharing data between objects or transferring data from one object to another.

### Reference

- **Mode**: Object Mode
- **Menu**: Object ‣ Link/Transfer Data
- **Shortcut**: Ctrl+L

### Link Data

**Purpose**:
Link (share) data blocks between objects so changes to one appear in all.

**Workflow**:
1. Select target object(s)
2. Shift+click to select source object (active)
3. **Ctrl+L** to open Link Data menu
4. Choose what to link

**Operations**:

#### Link Objects to Scene
Add selected objects to a specified scene (objects can exist in multiple scenes).

#### Link Object Data
Replace target objects' data with source object's data (meshes become identical and linked).

#### Link Materials
Target objects inherit source object's materials (changes to material affect all).

#### Link Animation Data
Target objects inherit source object's actions and animation tracks.

#### Link Collections
Move target objects into same collections as source object.

#### Link Instance Collection
Target objects' instance collections become source object's instance collection.

#### Link Fonts to Text
Target text objects use source text object's font.

#### Copy Modifiers
Target objects inherit source object's modifiers.

#### Copy Grease Pencil Effects
Target Grease Pencil objects inherit source object's visual effects.

#### Copy UV Maps
Target meshes get source object's active UV map (requires matching geometry).

#### Transfer Mesh Data
See Transfer Mesh Data section below.

#### Link Receivers to Emitter
Add target objects to light's Light Linking collection (control light visibility).

#### Link Blockers to Emitter
Add target objects to light's Shadow Linking collection (control shadow casting).

---

## Transfer Mesh Data

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Link/Transfer Data ‣ Transfer Mesh Data

**Purpose**:
Copy specific data types (UV maps, vertex groups, colors, normals) from source mesh to destination meshes.

**Mechanism**:
For each destination element (vertex/edge/face), find matching source element(s), then interpolate values.

### Data Types

**Available Data**:
- Vertex Groups
- Vertex Colors
- UV Maps
- Normals (custom)
- Color Attributes
- And more

**Create Data**:
Automatically create missing data layers on destination meshes if needed.

### Mapping Methods

How to find matching source elements for destination elements:

#### Topology
Match elements by index (requires same mesh structure, best for deformed copies).

#### One-To-One Mappings
Select single source element for each destination:
- Nearest Vertex
- Nearest Edge
- Nearest Face
- And variations

#### Interpolated Mappings
Blend values from multiple source elements:
- Nearest Edge Interpolated
- Nearest Face Interpolated
- Projected Face Interpolated

### Mapping Options

**Auto Transform**:
Automatically calculate transformation if meshes don't overlap in world space.

**Object Transform**:
Account for world space transformations of source and destination objects.

**Only Neighbor Geometry**:
Only consider source elements close to destination element.

**Max Distance**:
Maximum allowed distance for matching.

**Ray Radius**:
Starting radius for ray casting (larger = better performance, less accuracy).

**Islands Precision**:
Prevent UV island bleed (higher = more accurate but slower).

### Mix Modes

How to combine new data with original:

**Replace**:
Use interpolated value.

**Above/Below Threshold**:
Replace if value meets threshold condition.

**Mix**:
Blend source and destination values.

**Add/Subtract/Multiply**:
Arithmetic operations on values.

---

## Transfer Mesh Data Layout

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Link/Transfer Data ‣ Transfer Mesh Data Layout

**Purpose**:
Transfer the structure/layout of data layers from source to destination meshes.

**Exact Match**:
Optionally delete destination layers to match source exactly.

**Layer Matching**:
Match by name or by order.

---

## Shading Operations

Shading controls determine how faces render (smooth vs. flat appearance).

### Shade Smooth

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Shade Smooth

**Effect**:
- Sets object to smooth shading
- Normals are interpolated across surfaces
- Gives appearance of smooth surfaces
- Removes Smooth By Angle modifiers

**Visual Result**:
Faceted appearance becomes smooth (shading calculation changes, geometry unchanged).

**Keep Sharp Edges**:
Option to preserve sharp edges marked as such (doesn't clear sharp edge data).

### Shade Auto Smooth

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Shade Auto Smooth

**Effect**:
Adds Smooth By Angle modifier (pinned to last position).

**Behavior**:
Automatically smooth edges based on angle between adjacent faces.

**Parameters**:
- **Auto Smooth**: Toggle on/off (disabling removes modifier)
- **Angle**: Maximum angle for smooth edges (default 30°)

**Use Case**:
Automatic sharpness based on geometry angles (curves stay smooth, edges stay sharp).

### Shade Flat

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Shade Flat

**Effect**:
- Sets object to flat shading
- Uses face normals for shading (no interpolation)
- Faceted appearance
- Removes Smooth By Angle modifiers

**Keep Sharp Edges**:
Option to preserve sharp edge data.

---

## Rigid Body

Physics simulation objects.

### Calculate Mass

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Rigid Body ‣ Calculate Mass

**Effect**:
Automatically calculate rigid body mass based on volume and material density.

**Parameters**:

**Material Preset**:
List of real-world materials with preset densities:
- Density values in kg/m³
- Select material to apply its density
- Custom option for manual density input

**Density** (Custom Preset):
Input custom density value in kg/m³ when Custom Material Preset selected.

**Workflow**:
1. Select rigid body object
2. Object ‣ Rigid Body ‣ Calculate Mass
3. Choose material or enter density
4. Mass calculated and applied automatically

---

## Convert

Convert objects between types (Mesh ↔ Curve, etc.).

### Convert to Curve

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Convert ‣ Curve

**Source Types**:
- Mesh (only loose edges, not faces)
- Text (converts to curve outlines)

**Result**:
**Poly Curve** by default. Convert to Bézier using Set Spline Type for smooth segments.

### Convert to Mesh

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Convert ‣ Mesh

**Source Types**:
- Curve
- Metaball
- Surface
- Text
- Grease Pencil

**Behavior**:
Uses actual defined resolution for conversion. Preserves faces and volumes from closed/extruded curves.

**Result**:
Static mesh object (no longer parametric).

### Convert to Grease Pencil

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Convert ‣ Grease Pencil

**Source Types**:
- Curve
- Mesh
- Text

**Effect**:
Generates strokes following original shape. Creates basic materials. Combines multiple objects into single Grease Pencil object.

**Options**:
- **Keep Original**: Duplicate before conversion
- **Thickness**: Stroke thickness
- **Stroke Offset**: Separate strokes from fills
- **Export Faces**: Convert mesh faces to filled strokes

### Trace Image to Grease Pencil

Converts image to Grease Pencil strokes (see Image Tracing documentation).

### Convert to Mesh Plane

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Convert ‣ Convert to Mesh Plane

**Effect**:
Converts image empty to textured mesh plane with auto aspect ratio.

---

## Show/Hide

Visibility control for objects in viewport and render.

### Reference

- **Mode**: All Modes
- **Menu**: Object ‣ Show/Hide

### Show Hidden Objects

**Shortcut**: Alt+H

**Effect**:
Reveal all hidden objects in scene.

### Hide Selected

**Shortcut**: H

**Effect**:
Hide selected objects from viewport (not rendered, not selectable).

**Use Case**:
Temporarily hide objects to reduce clutter or see objects behind them.

### Hide Unselected

**Shortcut**: Shift+H

**Effect**:
Hide all unselected objects, showing only selected objects.

**Use Case**:
Isolate specific objects for focused work.

---

## Clean Up

Data cleanup operations.

### Clean Vertex Group Weights

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Clean Up ‣ Clean Vertex Group Weights

**Effect**:
Remove vertex group assignments with weights below a threshold.

**Parameters**:
- **Limit**: Minimum weight to keep (e.g., 0.2 keeps weights ≥0.2, removes <0.2)
- **Keep Single**: Ensure each vertex has at least one weight group
- **Subset**: Restrict to specific vertex groups

**Use Case**:
Clean up rigging by removing negligible weight assignments.

### Limit Total Vertex Groups

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Clean Up ‣ Limit Total Vertex Groups

**Effect**:
Reduce number of vertex groups per vertex to a maximum limit.

**Behavior**:
Removes lowest weights first until limit is reached.

**Parameters**:
- **Limit**: Maximum groups per vertex
- **Subset**: Restrict to specific groups

**Use Case**:
Optimize deformation for game engines (many engines have vertex group limits).

### Remove Unused Material Slots

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Clean Up ‣ Remove Unused Material Slots

**Effect**:
Delete empty material slots not assigned to any faces.

---

## Delete

Remove objects from scene.

### Delete

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Delete
- **Shortcut**: X or Delete

**Effect**:
Remove selected objects from current scene only.

**Behavior**:
Objects deleted locally; may still exist in other scenes if multi-scene linked.

### Delete Globally

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Delete Globally
- **Shortcut**: Shift+X or Shift+Delete

**Effect**:
Remove selected objects from **all scenes** and all other usages (e.g., shading nodes).

**Behavior**:
Complete deletion; object no longer exists anywhere in file.

---

## Object Properties

Properties panels control object appearance, transform, relationships, and behavior.

### Transform Properties

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Transform
- **Panel**: 3D Viewport ‣ Sidebar ‣ Transform

**Location**:
Object's origin location in local coordinates (X, Y, Z).

**Rotation**:
Object's local orientation relative to global axes and its own origin.

**Rotation Mode**:
Method for calculating rotations:
- **Euler**: Discrete XYZ axes (can gimbal lock)
- **Axis Angle**: Axis + angle representation
- **Quaternion**: Mathematical rotation representation

**Scale**:
Relative scale along local axes (1.0 = original size, 2.0 = double, 0.5 = half).

**Dimensions**:
Bounding box size (aligned with local axes). Read-only or editable depending on object type.

### Transform Properties Locking

**Lock Icons**:
Click padlock icon next to properties to lock/unlock:
- **Locked** (closed padlock): Cannot change interactively (can still edit field numerically)
- **Unlocked** (open padlock): Can change normally

**Locked Behavior**:
- Gizmo-based transforms respect locks
- Numeric field editing ignores locks
- Python API ignores locks

**Use Cases**:
- Prevent accidental transform changes
- Lock specific axis while animating
- Rigid constraints for specific properties

---

## Delta Transforms

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Transform ‣ Delta Transforms

**Purpose**:
Apply transformations on top of regular transforms.

**Usage**:
Primary transforms set base position, rotation, scale. Delta transforms add offsets.

**Example Workflow**:
1. Animate object location (primary transforms)
2. Apply Location to Deltas
3. Animate new location (layered on top)
4. Result: Two animation layers combined

**Use Cases**:
- Layer animations
- Preserve original transforms while adding offsets
- Bake constraint effects into deltas

---

## Parent Inverse Transform

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Transform ‣ Parent Inverse
- **Context**: Only visible when object is parented

**Purpose**:
Define how child's local space is offset relative to parent.

**Display**:
Decomposed into Location, Rotation, Scale offsets (read-only for inspection).

**Rotation Mode**:
Display rotation component as Euler, Axis Angle, or Quaternion (matches main transform panel).

**Clear Parent Inverse Transform**:
Reset Parent Inverse to identity (no offset). Child transforms then directly relative to parent's origin.

---

## Relations Properties

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Relations

**Parent**:
The object this object is parented to (read-only display or dropdown to change).

**Parent Type**:
Type of parenting relationship (Object, Bone, Vertex, etc.).

**Use Final Indices Vertex/3 Vertices**:
Use evaluated indices instead of original mesh indices.

**Camera Parent Lock**:
When camera locked to view, root parent transforms instead. Useful for camera rig animation.

**Parent Vertex/Vertices**:
Indices of vertices for vertex parenting.

**Tracking Axis**:
Forward direction for instancing at vertices.

**Up Axis**:
Upward direction for instancing at vertices.

**Pass Index**:
Index for Object Index render pass (ID masking).

---

## Collections

Collections organize objects into groups for scene management, visibility control, and rendering.

### Collections Purpose

**Organization**:
Group related objects (furniture collection within bedroom collection).

**Visibility Management**:
Show/hide entire collections at once.

**Rendering Control**:
Include/exclude collections from renders.

**Data Structure**:
Objects not directly in scenes; instead stored in database, referenced into scenes via collections.

### Collections Hierarchy

**Nesting**:
Collections can contain other collections (like folders with subfolders).

**Structure Example**:
```
Scene Collection (root)
├── Environment
│   ├── Buildings
│   ├── Vegetation
│   └── Props
├── Characters
│   ├── Player
│   └── NPCs
└── Lighting
    ├── Key Light
    ├── Fill Light
    └── Rim Light
```

### Color Tagging

**Purpose**:
Assign colors to collections for visual organization in Outliner and menus.

**Access**:
Outliner ‣ Set Color Tag (right-click collection).

**Display**:
Color appears as part of collection icon throughout interface.

---

## Collections Tab

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Collection Properties

### Visibility Options

**Selectable**:
Toggle whether objects in collection can be selected in viewport.

**Use Case**: Protect reference images from accidental selection.

**Show In Renders**:
Enable/disable collection visibility in render output.

### View Layer Settings

Each collection can be configured per view layer to control render appearance.

**Include**:
Include/exclude collection from active view layer (affects render and viewport for that layer).

**Holdout**:
Mark all objects in collection as holdouts (transparent regions in renders, masking background).

**Indirect Only** (Cycles only):
Objects don't appear directly, but contribute through lighting/shadows/reflections.

### Instancing Settings

**Instance Offset X, Y, Z**:
Spatial offset for instanced collection from original object's origin.

### Exporters

Configure collection-specific exporters for batch export workflows (glTF, USD, FBX, etc.).

---

## Collections Menu

**Reference**:
- **Mode**: Object Mode
- **Menu**: Object ‣ Collection

**Move to Collection** (M):
Move selected objects to different collection (removes from previous).

**Link to Collection** (Shift+M):
Add selected objects to additional collection (keeps in other collections).

**Create New Collection** (Ctrl+G):
Create new collection and add selected objects to it.

**Remove from Collection** (Ctrl+Alt+G):
Remove selected objects from a collection (choose which if in multiple).

**Remove from All Collections** (Shift+Ctrl+Alt+G):
Remove selected objects from all collections.

**Add Selected to Active Objects Collection** (Shift+Ctrl+G):
Add selected objects to collections that active object belongs to.

**Remove Selected from Active Collection** (Shift+Alt+G):
Remove selected objects from collections that active object belongs to.

**Hide Other Collections** (Ctrl+H):
Hide all collections except selected ones.

---

## Collections Panel

**Reference**:
- **Mode**: Object Mode
- **Panel**: Object tab ‣ Collections

**Display**:
Lists all collections this object belongs to.

**Add to Collection**:
Assign object to a collection (new or existing).

**Remove from Collection**:
Unassign object from specific collection.

**Collection Specials** (dropdown):
- Unlink Collection
- Select Objects in Collection
- Set Offset from Cursor

**Instancing Offset X, Y, Z**:
Spatial offset for collection instancing.

---

## Instancing: Vertices

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Instancing ‣ Vertices

**Purpose**:
Replicate all child objects at each vertex of parent mesh.

**Mechanism**:
For each vertex of parent mesh, create instance of all children at that vertex position.

### Align to Vertex Normal

**Option**: Toggle on/off

**Effect**:
When enabled, instances rotate according to vertex normals of parent mesh.

**Tracking Axis**:
Direction instances point (forward axis, set on child object).

### Usage Patterns

#### Instancing as Arranging Tool

**Workflow**:
1. Create base object (tree, column, etc.)
2. Create pattern mesh with vertices at desired positions
3. Parent base object to pattern mesh
4. Enable Instancing Vertices
5. Base object replicates at each vertex

**Result**:
Greek temple columns, forest arrangement, classroom desks, etc.

#### Instancing as Modeling Tool

**Workflow**:
1. Create primitive object (tentacle, spike, etc.)
2. Create base mesh (icosphere, sea urchin, etc.)
3. Parent primitive to base mesh
4. Enable Instancing Vertices
5. Enable Align to Vertex Normal
6. Adjust Tracking Axis on primitive for correct orientation

**Result**:
Sea urchin spikes, club thorns, flower petals, etc.

### Rearrangement

**Editing Base Object**:
Changes to base object (scale, rotation, deformation) affect all instances.

**Editing Pattern Mesh**:
- **Object Mode**: Changes affect instance placement and scale
- **Edit Mode**: Changes only affect distance, not scale

**Adding Vertices**:
Adding vertices to pattern mesh creates more instances automatically.

---

## Instancing: Faces

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Instancing ‣ Faces

**Purpose**:
Replicate child objects at each face of parent mesh.

### Scale Option

**Scale**:
Scale instances according to corresponding face size.

**Effect**:
Larger faces get larger instances, smaller faces get smaller instances.

**Inherit Scale**:
Scale the instance objects themselves.

### Make Instance Face Tool

Converts linked objects into face-instanced setup:
1. Selects linked objects (sharing mesh data)
2. Creates parent with faces at object locations
3. Sets up Instancing Faces to replicate objects

**Reverse Operation**:
Make Instances Real converts face instances back to multiple linked objects.

### Limitations

**Positioning**:
Instance position relative to face depends on child's origin relative to parent origin.

**Asymmetrical Geometry**:
Asymmetrical objects may need face vertex ordering adjustment for correct orientation.

**Workaround**:
1. Create single face square
2. Enable Instancing Faces to see instance
3. Rotate face if orientation incorrect
4. Duplicate face and reposition
5. Merge by Distance to remove duplicate vertices

---

## Instancing: Collection

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Instancing ‣ Collection

**Purpose**:
Create instances of entire collections with object transformations controlling placement and animation.

### Basic Workflow

**Create Collection**:
Create new collection in Outliner.

**Link Objects**:
Add objects to collection.

**Create Instance**:
Add ‣ Collection Instance

**Result**:
Empty object appears representing collection instance. Duplicate empty to create more instances with same collection linked.

### Collection Benefits

Collections can contain:
- Animations (actions)
- Physics simulations
- Nested collections
- Complex assemblies

All behavior is preserved in instances.

### Dynamic Linking

Link collections from external .blend files:
1. File ‣ Link
2. Select .blend file
3. Choose collection
4. Create Collection Instance to place it in scene
5. Instances reference external collection (changes to source update instances)

### Making Instances Real

**Workflow**:
1. Select Collection Instance
2. Object ‣ Apply ‣ Make Instances Real
3. Collection objects converted to real objects
4. Instancing removed

**Data Preservation**:
If collection was linked from external file:
- Object Data remains linked (mesh, materials, etc.)
- Object transforms become independent
- Parent-child relationships don't carry over

---

## Visibility Panel

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Visibility

**Selectable**:
Toggle whether object can be selected in viewport.

**Show In Viewports**:
Display object in 3D Viewport.

**Show In Renders**:
Include object in final render output (still visible in rendered viewport shading).

**Mask / Holdout**:
Render as holdout/matte (transparent region with zero alpha for compositing).

---

## Viewport Display Panel

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Viewport Display

### Show Options

**Name**:
Display object name in viewport.

**Axes**:
Show object's local coordinate axes (helpful for orientation verification).

**Wireframe**:
Overlay wireframe on top of solid display.

**All Edges**:
Show all edges (overrides wireframe threshold).

**Texture Space**:
Display the texture space bounding box.

**Shadow**:
Allow object to cast shadows in viewport.

**In Front**:
Render in front of other objects (unsupported for instances, limited in Material Preview/Rendered modes).

### Display As

**Display Mode**:
Show object with less detail for performance:
- Textured (full detail)
- Solid (no textures)
- Wireframe
- Bounds (bounding box only)

**Use Case**: High-poly objects slowing viewport—switch to Bounds for performance.

### Color

Object's display color in Wireframe and Solid viewport shading modes (when (Wire) Color is set to Object).

### Bounds

Display bounding shape (Box, Sphere, Cylinder, Cone, Capsule) approximating object size.

---

## Line Art Panel

**Reference**:
- **Mode**: Object Mode
- **Panel**: Properties ‣ Object Properties ‣ Line Art

**Usage**:
Control how object participates in Line Art rendering.

**Options**:
- **Inherit**: Use parent collection's Line Art settings
- **Include**: Force include in Line Art
- **Intersection Only**: Only generate intersection lines
- **Occlusion Only**: Only occlude other lines
- **Exclude**: Don't include in Line Art
- **No Intersection**: Don't generate intersection lines
- **Force Intersection**: Generate intersections regardless of other settings

**Override Crease**:
Use custom crease value for this object (instead of global).

**Intersection Priority**:
Priority for intersection line inclusion (higher priority wins).

---

## Tools Overview

### Toolbar Tools

**Tweak**:
Select or move objects.

**Select Box** (B):
Select objects within rectangular region.

**Select Circle** (C):
Select objects within circular region.

**Select Lasso** (Ctrl+Alt+LMB):
Select objects within freehand lasso.

**Cursor** (Shift+S):
Position 3D Cursor.

**Move** (G):
Translate objects.

**Rotate** (R):
Rotate objects.

**Scale** (S):
Scale objects.

**Scale Cage**:
Scale via bounding box cage.

**Transform**:
Combined move/rotate/scale tool.

**Annotate**:
Draw freehand annotations.

**Measure**:
Measure distances.

**Add Primitives**:
Interactively add cube, cone, cylinder, sphere, icosphere.

### Scale Cage

**Purpose**:
Scale objects using a visual cage (bounding box) with intuitive handles.

**Interaction**:
- **Face point**: Scale along one axis
- **Edge point**: Scale along two axes
- **Vertex point**: Scale along three axes
- Scale from opposite side of cage

**Advantages**:
- Visual feedback
- Intuitive axis selection
- Non-uniform scaling

---

## Best Practices and Workflows

### Parenting Workflows

**Character Rigging**:
1. Create armature (skeleton)
2. Parent mesh to armature using Armature Deform
3. Weight paint to define bone influence
4. Animate bones in Pose Mode

**Mechanical Assembly**:
1. Model parts separately
2. Parent parts to parent empty
3. Rotate parent empty for coordinated movement
4. Animate parent empty for assembly motion

**Camera Rig**:
1. Create empty (camera control)
2. Parent camera to empty
3. Parent empty to target empty
4. Animate control empty

**Hierarchical Animation**:
1. Parent all related objects to control empty
2. Animate parent for primary motion (character walk)
3. Animate children for secondary motion (limb swing)
4. Result: Coordinated animation

### Collection Organization

**Project Structure**:
```
Scene Collection
├── Environment
│   ├── Exterior
│   │   ├── Terrain
│   │   ├── Buildings
│   │   └── Sky
│   └── Interior
│       ├── Lighting
│       └── Props
├── Characters
│   ├── Main Character
│   ├── NPCs
│   └── Enemies
└── Rendering
    ├── Lights
    ├── Cameras
    └── Render Settings
```

**Benefits**:
- Quick visibility toggling
- Easy batch operations
- Clear structure for team workflows

### Asset Workflow

**Creating Reusable Assets**:
1. Model complete object (tree, furniture, etc.)
2. Organize with collections if complex
3. Mark as Asset (Object ‣ Asset ‣ Mark as Asset)
4. Save asset library location
5. Drag into new projects from Asset Browser

**Asset Libraries**:
Organize by category (vegetation, furniture, props, characters, etc.).

### Instancing Patterns

**Forest Scattering**:
1. Model one tree
2. Create base mesh (plane with scattered vertices)
3. Parent tree to base mesh
4. Enable Instancing Vertices
5. Reshape base mesh to arrange trees naturally

**Crowd Variation**:
1. Model character
2. Create particle system emitting at vertices of floor
3. Set particle type to Collection Instance
4. Result: Crowd distribution

**Modular Architecture**:
1. Model building module
2. Create base grid mesh
3. Parent module to grid
4. Enable Instancing Faces
5. Subdivide grid faces for more modules

---

## Related Documentation

- **Transform**: [BLENDER_UI_TRANSFORM.md](BLENDER_UI_TRANSFORM.md) - Move, rotate, scale operations
- **Pivot Points and Snapping**: [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) - Transformation centers
- **3D Viewport**: [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md) - Main workspace
- **Viewport Controls**: [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md) - Navigation and display
- **Interactive Mesh Tools**: [BLENDER_UI_INTERACTIVE_MESH_TOOLS.md](BLENDER_UI_INTERACTIVE_MESH_TOOLS.md) - Adding primitives
- **Selecting**: [BLENDER_UI_SELECTING.md](BLENDER_UI_SELECTING.md) - Object selection methods
- **Outliner**: [BLENDER_UI_OUTLINER.md](BLENDER_UI_OUTLINER.md) - Hierarchical organization view
