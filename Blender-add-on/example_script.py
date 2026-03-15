"""
Example script showing how to use the Fallout 4 Tutorial Add-on programmatically

This script demonstrates the scripting interface for automating mod creation tasks.
Run this in Blender's scripting workspace.
"""

import bpy

# The add-on provides operators that you can call
# This is the recommended way to use the add-on programmatically

def create_simple_weapon():
    """Example: Create a simple weapon mesh using operators"""
    
    print("Creating weapon mesh...")
    
    # Use the add-on's operator to create base mesh
    bpy.ops.fo4.create_base_mesh()
    obj = bpy.context.active_object
    obj.name = "SimpleWeapon"
    
    # Enter edit mode and modify (simplified example)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=1)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Optimize for FO4 using operator
    bpy.ops.fo4.optimize_mesh()
    print("Mesh optimized")
    
    # Validate mesh using operator
    bpy.ops.fo4.validate_mesh()
    print("Mesh validated - check Blender console for results")
    
    return obj

def setup_textures_for_object(obj, texture_dir):
    """Example: Setup textures for an object using operators"""
    
    import os
    
    print(f"Setting up textures for {obj.name}...")
    
    # Select the object
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Create FO4 material using operator
    bpy.ops.fo4.setup_textures()
    print("Material created")
    
    # Install textures (if files exist) using operators
    diffuse_path = os.path.join(texture_dir, "diffuse.png")
    normal_path = os.path.join(texture_dir, "normal.png")
    
    if os.path.exists(diffuse_path):
        # Note: Texture installation via operator requires file browser
        # For scripting, you would access the helper functions directly
        print(f"Diffuse texture available at: {diffuse_path}")
    
    if os.path.exists(normal_path):
        print(f"Normal texture available at: {normal_path}")
    
    # Validate textures using operator
    bpy.ops.fo4.validate_textures()
    print("Texture validation completed - check console for results")

def create_simple_armature():
    """Example: Create and validate an armature using operators"""
    
    print("Creating armature...")
    
    # Create FO4 armature using operator
    bpy.ops.fo4.setup_armature()
    armature_obj = bpy.context.active_object
    print(f"Armature created: {armature_obj.name}")
    
    # Validate armature using operator
    bpy.ops.fo4.validate_animation()
    print("Armature validation completed - check console for results")
    
    return armature_obj

def export_mod_assets(output_dir):
    """Example: Export using the add-on's export operator"""
    
    print(f"Exporting mod to {output_dir}...")
    
    # Note: Export operators typically require file browser interaction
    # For batch operations, you would call export functions directly
    # Here we show the operator approach
    
    # Validate before export
    bpy.ops.fo4.validate_export()
    
    print("Export validation completed - check console")
    print("Use the Export panel in the UI to complete export")
    print(f"Target directory: {output_dir}")

def complete_workflow_example():
    """Complete example workflow using operators"""
    
    print("=" * 60)
    print("Fallout 4 Mod Creation - Complete Workflow Example")
    print("=" * 60)
    
    # Clear existing scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Step 1: Create mesh
    print("\n1. Creating mesh...")
    weapon = create_simple_weapon()
    
    # Step 2: Setup materials
    print("\n2. Setting up materials...")
    bpy.ops.fo4.setup_textures()
    print("Material setup complete")
    
    # Step 3: Validate before export
    print("\n3. Validating for export...")
    bpy.ops.fo4.validate_export()
    print("Validation complete - check console for details")
    
    # Step 4: Export information
    print("\n4. Ready to export!")
    print("Use the Export panel in the UI to complete the export process")
    
    print("\n" + "=" * 60)
    print("Workflow example completed!")
    print("Check the Blender console for validation results")
    print("=" * 60)

# Run the complete workflow example
if __name__ == "__main__":
    complete_workflow_example()
