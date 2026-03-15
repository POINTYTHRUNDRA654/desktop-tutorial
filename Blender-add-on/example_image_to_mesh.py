"""
Example Script: Image to Mesh Conversion
This script demonstrates how to use the image-to-mesh functionality.

Prerequisites:
- Blender 3.0+
- PIL/Pillow installed in Blender's Python
- NumPy installed in Blender's Python

Installation of dependencies:
    Windows: cd "C:\\Program Files\\Blender Foundation\\Blender X.X\\X.X\\python\\bin" && python.exe -m pip install Pillow numpy
    macOS: cd /Applications/Blender.app/Contents/Resources/X.X/python/bin && ./python3.xx -m pip install Pillow numpy
    Linux: cd /path/to/blender/X.X/python/bin && ./python3.xx -m pip install Pillow numpy
"""

import bpy
import os

# ============================================================================
# Example 1: Create a mesh from a height map image using the operator
# ============================================================================

def example_1_operator_method():
    """Create mesh from height map using the operator"""
    print("\n" + "="*70)
    print("Example 1: Create Mesh from Height Map (Operator Method)")
    print("="*70)
    
    # You would replace this with your actual image path
    image_path = "/path/to/your/heightmap.png"
    
    # Check if file exists (in real usage)
    if not os.path.exists(image_path):
        print(f"⚠ Warning: Image file not found: {image_path}")
        print("Please update the path to a valid height map image.")
        return
    
    # Use the operator to create mesh from image
    bpy.ops.fo4.image_to_mesh(
        filepath=image_path,
        mesh_width=10.0,           # Physical width in Blender units
        mesh_height=10.0,          # Physical height in Blender units
        displacement_strength=2.0, # How much height affects Z-axis
        subdivisions=128           # Resolution (0 = auto)
    )
    
    # Get the created mesh
    obj = bpy.context.active_object
    print(f"✓ Created mesh: {obj.name}")
    print(f"  Vertices: {len(obj.data.vertices)}")
    print(f"  Polygons: {len(obj.data.polygons)}")


# ============================================================================
# Example 2: Apply displacement map to existing mesh
# ============================================================================

def example_2_displacement_map():
    """Apply a displacement map to an existing mesh"""
    print("\n" + "="*70)
    print("Example 2: Apply Displacement Map to Existing Mesh")
    print("="*70)
    
    # Create a base plane mesh first
    bpy.ops.mesh.primitive_grid_add(
        size=5.0,
        x_subdivisions=100,
        y_subdivisions=100,
        location=(0, 0, 0)
    )
    
    obj = bpy.context.active_object
    print(f"✓ Created base mesh: {obj.name}")
    
    # Apply displacement map
    image_path = "/path/to/your/displacement_map.png"
    
    if os.path.exists(image_path):
        bpy.ops.fo4.apply_displacement_map(
            filepath=image_path,
            strength=0.5
        )
        print(f"✓ Applied displacement map to {obj.name}")
    else:
        print(f"⚠ Warning: Displacement map not found: {image_path}")


# ============================================================================
# Example 3: Use the helper functions directly (advanced)
# ============================================================================

def example_3_helper_functions():
    """Use helper functions directly for more control"""
    print("\n" + "="*70)
    print("Example 3: Using Helper Functions Directly")
    print("="*70)
    
    from image_to_mesh_helpers import (
        load_image_as_heightmap,
        create_mesh_from_heightmap,
        ImageToMeshHelpers
    )
    
    image_path = "/path/to/your/heightmap.png"
    
    if not os.path.exists(image_path):
        print(f"⚠ Warning: Image not found: {image_path}")
        return
    
    # Step 1: Validate image format
    if not ImageToMeshHelpers.validate_image_file(image_path):
        print("✗ Invalid image format!")
        return
    
    print("✓ Image format is valid")
    
    # Step 2: Load height map
    success, data, width, height = load_image_as_heightmap(image_path)
    
    if not success:
        print(f"✗ Error loading image: {data}")
        return
    
    print(f"✓ Loaded height map: {width}x{height} pixels")
    
    # Step 3: Get recommended subdivisions
    subdivs = ImageToMeshHelpers.get_recommended_subdivisions(width, height)
    print(f"✓ Recommended subdivisions: {subdivs}")
    
    # Step 4: Create mesh
    success, obj = create_mesh_from_heightmap(
        "CustomTerrain",
        data,
        width,
        height,
        mesh_width=15.0,
        mesh_height=15.0,
        displacement_strength=3.0,
        subdivisions=subdivs
    )
    
    if success:
        print(f"✓ Created mesh: {obj.name}")
        print(f"  Vertices: {len(obj.data.vertices)}")
        print(f"  Polygons: {len(obj.data.polygons)}")
    else:
        print(f"✗ Failed to create mesh: {obj}")


# ============================================================================
# Example 4: Complete workflow - Height map to FO4 export
# ============================================================================

def example_4_complete_workflow():
    """Complete workflow from image to FO4-ready mesh"""
    print("\n" + "="*70)
    print("Example 4: Complete Workflow - Image to FO4 Export")
    print("="*70)
    
    image_path = "/path/to/your/heightmap.png"
    
    if not os.path.exists(image_path):
        print(f"⚠ Warning: Image not found: {image_path}")
        return
    
    # Step 1: Create mesh from height map
    print("\n1. Creating mesh from height map...")
    bpy.ops.fo4.image_to_mesh(
        filepath=image_path,
        mesh_width=5.0,
        mesh_height=5.0,
        displacement_strength=1.0,
        subdivisions=128
    )
    
    obj = bpy.context.active_object
    print(f"✓ Created: {obj.name}")
    
    # Step 2: Optimize for FO4
    print("\n2. Optimizing for Fallout 4...")
    bpy.ops.fo4.optimize_mesh()
    print("✓ Mesh optimized")
    
    # Step 3: Validate mesh
    print("\n3. Validating mesh...")
    bpy.ops.fo4.validate_mesh()
    
    # Step 4: Setup materials (optional)
    print("\n4. Setting up FO4 materials...")
    bpy.ops.fo4.setup_textures()
    print("✓ Materials created")
    
    # Step 5: Validate before export
    print("\n5. Validating for export...")
    bpy.ops.fo4.validate_export()
    
    # Step 6: Export
    print("\n6. Ready to export!")
    print("   Use: bpy.ops.fo4.export_mesh(filepath='/path/to/output.nif')")
    
    print("\n✓ Workflow complete!")


# ============================================================================
# Example 5: Creating terrain from real-world data
# ============================================================================

def example_5_terrain_tips():
    """Tips for creating realistic terrain"""
    print("\n" + "="*70)
    print("Example 5: Tips for Creating Realistic Terrain")
    print("="*70)
    
    tips = [
        "1. Use terrain.party to get real-world height maps",
        "2. Edit height maps in GIMP to adjust contrast",
        "3. Use higher displacement strength (2.0-5.0) for mountains",
        "4. Use lower displacement strength (0.5-1.0) for gentle hills",
        "5. Start with 128-256 subdivisions for good detail",
        "6. Apply Smooth modifier after creation for organic look",
        "7. Use Subdivision Surface modifier for extra smoothness",
        "8. Don't exceed 65,535 polygons for FO4 compatibility",
        "9. UV mapping is automatically created",
        "10. Validate mesh before export to catch issues",
    ]
    
    for tip in tips:
        print(f"  • {tip}")


# ============================================================================
# Run examples
# ============================================================================

def main():
    """Run example demonstrations"""
    print("\n" + "="*70)
    print("Image to Mesh Examples for Fallout 4 Add-on")
    print("="*70)
    
    # Uncomment the examples you want to run:
    
    # example_1_operator_method()
    # example_2_displacement_map()
    # example_3_helper_functions()
    # example_4_complete_workflow()
    example_5_terrain_tips()
    
    print("\n" + "="*70)
    print("Examples complete!")
    print("="*70)
    print("\nRemember to install PIL/Pillow and NumPy before using these features:")
    print("  pip install Pillow numpy")
    print("\nSee README.md for detailed installation instructions.")


if __name__ == "__main__":
    main()
