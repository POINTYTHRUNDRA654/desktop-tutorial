# API Reference

This document provides detailed information about the scripting API for the Fallout 4 Tutorial Add-on.

## Table of Contents
- [Mesh Helpers](#mesh-helpers)
- [Texture Helpers](#texture-helpers)
- [Animation Helpers](#animation-helpers)
- [Export Helpers](#export-helpers)
- [Notification System](#notification-system)
- [Tutorial System](#tutorial-system)

---

## Mesh Helpers

Module: `mesh_helpers.MeshHelpers`

### create_base_mesh(mesh_type='CUBE')
Creates a base mesh optimized for Fallout 4.

**Parameters:**
- `mesh_type` (str): Type of mesh to create. Default: 'CUBE'

**Returns:**
- `obj` (bpy.types.Object): The created mesh object

**Example:**
```python
from mesh_helpers import MeshHelpers

obj = MeshHelpers.create_base_mesh()
print(f"Created: {obj.name}")
```

### optimize_mesh(obj)
Optimizes a mesh for Fallout 4 compatibility.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object to optimize

**Returns:**
- `success` (bool): True if optimization succeeded
- `message` (str): Status message

**Features:**
- Applies transformations
- Removes duplicate vertices
- Recalculates normals
- Triangulates faces (FO4 requirement)

**Example:**
```python
success, message = MeshHelpers.optimize_mesh(obj)
if success:
    print(message)
```

### validate_mesh(obj)
Validates a mesh for Fallout 4 compatibility.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object to validate

**Returns:**
- `success` (bool): True if validation passed
- `issues` (list): List of issue descriptions

**Checks:**
- Vertex and polygon count
- UV map presence
- Loose vertices
- Applied scale
- Polygon count limit (65,535)

**Example:**
```python
success, issues = MeshHelpers.validate_mesh(obj)
if not success:
    for issue in issues:
        print(f"Issue: {issue}")
```

### add_collision_mesh(obj)
Creates a collision mesh for an object.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object

**Returns:**
- `collision_obj` (bpy.types.Object): The collision mesh object or None

**Example:**
```python
collision = MeshHelpers.add_collision_mesh(obj)
if collision:
    print(f"Collision mesh created: {collision.name}")
```

---

## Texture Helpers

Module: `texture_helpers.TextureHelpers`

### setup_fo4_material(obj)
Sets up a Fallout 4 compatible material with proper node structure.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object

**Returns:**
- `mat` (bpy.types.Material): The created material or None

**Features:**
- Creates Principled BSDF shader
- Sets up texture nodes for diffuse, normal, and specular
- Configures proper node connections

**Example:**
```python
from texture_helpers import TextureHelpers

mat = TextureHelpers.setup_fo4_material(obj)
print(f"Material created: {mat.name}")
```

### install_texture(obj, texture_path, texture_type='DIFFUSE')
Installs a texture into the object's material.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object
- `texture_path` (str): Path to the texture file
- `texture_type` (str): Type of texture ('DIFFUSE', 'NORMAL', 'SPECULAR')

**Returns:**
- `success` (bool): True if installation succeeded
- `message` (str): Status message

**Example:**
```python
success, msg = TextureHelpers.install_texture(
    obj, 
    "/path/to/diffuse.png", 
    'DIFFUSE'
)
print(msg)
```

### validate_textures(obj)
Validates textures for Fallout 4 compatibility.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object

**Returns:**
- `success` (bool): True if validation passed
- `issues` (list): List of issue descriptions

**Checks:**
- Material node setup
- Texture loading
- Image dimensions (power of 2 recommended)
- Color space settings

**Example:**
```python
success, issues = TextureHelpers.validate_textures(obj)
if success:
    print("Textures valid!")
```

---

## Animation Helpers

Module: `animation_helpers.AnimationHelpers`

### setup_fo4_armature()
Creates a basic Fallout 4 compatible armature.

**Returns:**
- `armature_obj` (bpy.types.Object): The created armature object

**Features:**
- Creates basic humanoid skeleton
- Sets up proper bone hierarchy
- Names bones appropriately

**Example:**
```python
from animation_helpers import AnimationHelpers

armature = AnimationHelpers.setup_fo4_armature()
print(f"Armature created: {armature.name}")
```

### auto_weight_paint(mesh_obj, armature_obj)
Automatically weight paints a mesh to an armature.

**Parameters:**
- `mesh_obj` (bpy.types.Object): The mesh object
- `armature_obj` (bpy.types.Object): The armature object

**Returns:**
- `success` (bool): True if operation succeeded
- `message` (str): Status message

**Example:**
```python
success, msg = AnimationHelpers.auto_weight_paint(mesh, armature)
print(msg)
```

### validate_animation(armature_obj)
Validates an armature and animation for Fallout 4.

**Parameters:**
- `armature_obj` (bpy.types.Object): The armature object

**Returns:**
- `success` (bool): True if validation passed
- `issues` (list): List of issue descriptions

**Checks:**
- Bone count (max 256 for FO4)
- Root bone presence
- Bone naming conventions
- Animation data

**Example:**
```python
success, issues = AnimationHelpers.validate_animation(armature)
if not success:
    for issue in issues:
        print(f"Issue: {issue}")
```

### create_idle_animation(armature_obj, duration=60)
Creates a simple idle animation.

**Parameters:**
- `armature_obj` (bpy.types.Object): The armature object
- `duration` (int): Animation duration in frames. Default: 60

**Returns:**
- `success` (bool): True if operation succeeded
- `message` (str): Status message

**Example:**
```python
success, msg = AnimationHelpers.create_idle_animation(armature, 120)
print(msg)
```

---

## Export Helpers

Module: `export_helpers.ExportHelpers`

### validate_before_export(obj)
Validates an object before export.

**Parameters:**
- `obj` (bpy.types.Object): The object to validate

**Returns:**
- `success` (bool): True if validation passed
- `issues` (list): List of issue descriptions

**Features:**
- Validates meshes
- Validates textures
- Validates armatures

**Example:**
```python
from export_helpers import ExportHelpers

success, issues = ExportHelpers.validate_before_export(obj)
if success:
    print("Ready to export!")
```

### export_mesh_to_nif(obj, filepath)
Exports a mesh to NIF format (via FBX).

**Parameters:**
- `obj` (bpy.types.Object): The mesh object to export
- `filepath` (str): Destination file path

**Returns:**
- `success` (bool): True if export succeeded
- `message` (str): Status message

**Note:** Currently exports to FBX format which can be converted to NIF using external tools.

**Example:**
```python
success, msg = ExportHelpers.export_mesh_to_nif(
    obj, 
    "/path/to/output.nif"
)
print(msg)
```

### export_complete_mod(scene, output_dir)
Exports a complete mod with all assets.

**Parameters:**
- `scene` (bpy.types.Scene): The scene to export
- `output_dir` (str): Output directory path

**Returns:**
- `success` (bool): True if export succeeded
- `results` (dict): Dictionary containing export results
  - `meshes`: List of exported mesh names
  - `textures`: List of texture names
  - `animations`: List of animation names
  - `errors`: List of errors encountered

**Example:**
```python
import bpy

success, results = ExportHelpers.export_complete_mod(
    bpy.context.scene,
    "/path/to/mod_folder"
)
print(f"Exported {len(results['meshes'])} meshes")
```

### create_mod_structure(mod_name, output_dir)
Creates a basic Fallout 4 mod directory structure.

**Parameters:**
- `mod_name` (str): Name of the mod
- `output_dir` (str): Base output directory

**Returns:**
- `success` (bool): True if operation succeeded
- `message` (str): Status message

**Creates:**
- `/meshes/` directory
- `/textures/` directory
- `/materials/` directory
- `/animations/` directory
- README.txt file

**Example:**
```python
success, msg = ExportHelpers.create_mod_structure(
    "MyAwesomeMod",
    "/path/to/output"
)
print(msg)
```

---

## Notification System

Module: `notification_system.FO4_NotificationSystem`

### notify(message, notification_type='INFO')
Displays a notification to the user.

**Parameters:**
- `message` (str): The notification message
- `notification_type` (str): Type of notification ('INFO', 'WARNING', 'ERROR')

**Example:**
```python
from notification_system import FO4_NotificationSystem

FO4_NotificationSystem.notify(
    "Mesh created successfully!", 
    'INFO'
)
```

### check_common_errors(context)
Checks for common errors in the scene.

**Parameters:**
- `context` (bpy.types.Context): The Blender context

**Returns:**
- `errors` (list): List of error messages
- `warnings` (list): List of warning messages

**Example:**
```python
import bpy

errors, warnings = FO4_NotificationSystem.check_common_errors(
    bpy.context
)
```

### validate_for_fallout4(obj)
Validates an object for Fallout 4 compatibility.

**Parameters:**
- `obj` (bpy.types.Object): The object to validate

**Returns:**
- `issues` (list): List of compatibility issues

**Example:**
```python
issues = FO4_NotificationSystem.validate_for_fallout4(obj)
if issues:
    for issue in issues:
        print(issue)
```

---

## Tutorial System

Module: `tutorial_system`

### get_current_tutorial(context)
Gets the currently active tutorial.

**Parameters:**
- `context` (bpy.types.Context): The Blender context

**Returns:**
- `tutorial` (Tutorial): The current tutorial object or None

**Example:**
```python
import bpy
from tutorial_system import get_current_tutorial

tutorial = get_current_tutorial(bpy.context)
if tutorial:
    step = tutorial.get_current_step()
    print(f"Current step: {step.title}")
```

### Tutorial Class

**Attributes:**
- `name` (str): Tutorial name
- `description` (str): Tutorial description
- `steps` (list): List of TutorialStep objects
- `current_step` (int): Current step index

**Methods:**

#### get_current_step()
Returns the current tutorial step.

**Returns:**
- `step` (TutorialStep): The current step or None

#### next_step()
Advances to the next step.

**Returns:**
- `success` (bool): True if advanced

#### previous_step()
Goes back to the previous step.

**Returns:**
- `success` (bool): True if went back

---

## Complete Workflow Example

Here's a complete example that uses multiple modules:

```python
import bpy
from mesh_helpers import MeshHelpers
from texture_helpers import TextureHelpers
from animation_helpers import AnimationHelpers
from export_helpers import ExportHelpers
from notification_system import FO4_NotificationSystem

# Step 1: Create and optimize mesh
obj = MeshHelpers.create_base_mesh()
success, msg = MeshHelpers.optimize_mesh(obj)
FO4_NotificationSystem.notify(msg, 'INFO')

# Step 2: Setup material
mat = TextureHelpers.setup_fo4_material(obj)
FO4_NotificationSystem.notify(f"Material created: {mat.name}", 'INFO')

# Step 3: Validate mesh
success, issues = MeshHelpers.validate_mesh(obj)
if not success:
    for issue in issues:
        FO4_NotificationSystem.notify(issue, 'WARNING')

# Step 4: Validate before export
success, issues = ExportHelpers.validate_before_export(obj)
if success:
    # Step 5: Export
    success, msg = ExportHelpers.export_mesh_to_nif(
        obj,
        "/tmp/my_mesh.nif"
    )
    FO4_NotificationSystem.notify(msg, 'INFO')
```

---

## Image to Mesh Module

### Operators

#### `bpy.ops.fo4.image_to_mesh()`
Convert an image to a 3D mesh using height map technique.

**Parameters:**
- `filepath` (string): Path to the image file
- `mesh_width` (float): Physical width of the mesh (default: 2.0)
- `mesh_height` (float): Physical height of the mesh (default: 2.0)
- `displacement_strength` (float): Z-axis displacement strength (default: 0.5)
- `subdivisions` (int): Number of subdivisions, 0=auto (default: 0)

**Supported Formats:** PNG, JPG, JPEG, BMP, TIFF, TIF, TGA

**Example:**
```python
import bpy

# Create mesh from height map
bpy.ops.fo4.image_to_mesh(
    filepath="/path/to/heightmap.png",
    mesh_width=10.0,
    mesh_height=10.0,
    displacement_strength=2.0,
    subdivisions=128
)

# Get the created object
obj = bpy.context.active_object
```

#### `bpy.ops.fo4.apply_displacement_map()`
Apply a displacement/height map to an existing mesh.

**Parameters:**
- `filepath` (string): Path to the displacement map image
- `strength` (float): Displacement strength (default: 0.5)

**Example:**
```python
import bpy

# Select your mesh
obj = bpy.data.objects['MyMesh']
bpy.context.view_layer.objects.active = obj

# Apply displacement
bpy.ops.fo4.apply_displacement_map(
    filepath="/path/to/displacement.png",
    strength=1.0
)
```

### Helper Functions

#### `image_to_mesh_helpers.load_image_as_heightmap(filepath)`
Load an image file and convert it to height map data.

**Returns:** `(success, data/error_message, width, height)`

**Example:**
```python
from image_to_mesh_helpers import load_image_as_heightmap

success, data, width, height = load_image_as_heightmap("/path/to/image.png")
if success:
    print(f"Loaded {width}x{height} height map")
else:
    print(f"Error: {data}")
```

#### `image_to_mesh_helpers.create_mesh_from_heightmap(name, heightmap_data, width, height, ...)`
Create a mesh from height map data.

**Parameters:**
- `name` (string): Name for the mesh object
- `heightmap_data` (numpy.ndarray): 2D array with height values (0-1)
- `width` (int): Width in pixels
- `height` (int): Height in pixels
- `mesh_width` (float): Physical mesh width (default: 2.0)
- `mesh_height` (float): Physical mesh height (default: 2.0)
- `displacement_strength` (float): Z displacement strength (default: 1.0)
- `subdivisions` (int): Subdivisions, None=auto (default: None)

**Returns:** `(success, object/error_message)`

**Example:**
```python
from image_to_mesh_helpers import load_image_as_heightmap, create_mesh_from_heightmap

# Load height map
success, data, width, height = load_image_as_heightmap("/path/to/heightmap.png")

if success:
    # Create mesh
    success, obj = create_mesh_from_heightmap(
        "TerrainMesh",
        data,
        width,
        height,
        mesh_width=10.0,
        mesh_height=10.0,
        displacement_strength=2.0,
        subdivisions=128
    )
    
    if success:
        print(f"Created mesh: {obj.name}")
```

#### `image_to_mesh_helpers.apply_displacement_to_mesh(obj, filepath, strength)`
Apply displacement map to existing mesh.

**Parameters:**
- `obj` (bpy.types.Object): The mesh object
- `filepath` (string): Path to displacement map
- `strength` (float): Displacement strength

**Returns:** `(success, message)`

**Example:**
```python
from image_to_mesh_helpers import apply_displacement_to_mesh

obj = bpy.context.active_object
success, message = apply_displacement_to_mesh(
    obj,
    "/path/to/displacement.png",
    0.5
)
print(message)
```

#### `ImageToMeshHelpers.validate_image_file(filepath)`
Validate if file is a supported image format.

**Returns:** `bool`

#### `ImageToMeshHelpers.get_recommended_subdivisions(width, height)`
Get recommended subdivision count based on image dimensions.

**Returns:** `int`

### Complete Image to Mesh Example

```python
import bpy
from image_to_mesh_helpers import (
    load_image_as_heightmap,
    create_mesh_from_heightmap,
    ImageToMeshHelpers
)

# Path to your height map
image_path = "/path/to/terrain_heightmap.png"

# Validate image format
if not ImageToMeshHelpers.validate_image_file(image_path):
    print("Unsupported image format!")
else:
    # Load height map
    success, data, width, height = load_image_as_heightmap(image_path)
    
    if success:
        # Get recommended subdivisions
        subdivs = ImageToMeshHelpers.get_recommended_subdivisions(width, height)
        print(f"Using {subdivs} subdivisions for {width}x{height} image")
        
        # Create mesh
        success, obj = create_mesh_from_heightmap(
            "Terrain",
            data,
            width,
            height,
            mesh_width=20.0,
            mesh_height=20.0,
            displacement_strength=3.0,
            subdivisions=subdivs
        )
        
        if success:
            print(f"Created terrain mesh: {obj.name}")
            
            # Optimize for FO4
            bpy.ops.fo4.optimize_mesh()
            
            # Validate
            bpy.ops.fo4.validate_mesh()
    else:
        print(f"Error loading image: {data}")
```

### Prerequisites

The image to mesh functionality requires:
- **PIL/Pillow**: `python -m pip install Pillow`
- **NumPy**: `python -m pip install numpy`

Install these in Blender's Python environment. See README for detailed instructions.

---

## Error Handling

All functions that can fail return a tuple of `(success, message/issues)`. Always check the success status:

```python
success, result = SomeHelper.some_function(obj)
if success:
    print(f"Success: {result}")
else:
    print(f"Failed: {result}")
```

## Type Hints

For better IDE support, all functions accept and return standard Blender types:
- `bpy.types.Object` - Blender objects
- `bpy.types.Mesh` - Mesh data
- `bpy.types.Material` - Materials
- `bpy.types.Scene` - Scenes
- `bpy.types.Context` - Current context

## Best Practices

1. **Always validate before export**
2. **Check return values for success/failure**
3. **Use notifications to inform users**
4. **Save work before running scripts**
5. **Test with simple objects first**
