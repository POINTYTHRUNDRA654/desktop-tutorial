"""
Image to Mesh helper functions for creating meshes from images.
Uses free resources: PIL/Pillow for image processing and NumPy for data manipulation.
"""

import bpy
import bmesh
from mathutils import Vector
import os

def load_image_as_heightmap(filepath):
    """
    Load an image file and convert it to a height map data array.
    
    Args:
        filepath: Path to the image file
        
    Returns:
        tuple: (success, data/error_message, width, height)
    """
    try:
        # Try importing PIL
        try:
            from PIL import Image
        except ImportError:
            return False, "PIL/Pillow not installed. Install with: pip install Pillow", 0, 0
        
        # Try importing numpy
        try:
            import numpy as np
        except ImportError:
            return False, "NumPy not installed. Install with: pip install numpy", 0, 0
        
        # Check if file exists
        if not os.path.exists(filepath):
            return False, f"File not found: {filepath}", 0, 0
        
        # Load image
        img = Image.open(filepath)
        
        # Convert to grayscale for height map
        img_gray = img.convert('L')
        
        # Get dimensions
        width, height = img_gray.size
        
        # Convert to numpy array and normalize to 0-1 range
        img_array = np.array(img_gray, dtype=np.float32) / 255.0
        
        return True, img_array, width, height
        
    except Exception as e:
        return False, f"Error loading image: {str(e)}", 0, 0


def create_mesh_from_heightmap(name, heightmap_data, width, height, 
                                mesh_width=2.0, mesh_height=2.0, 
                                displacement_strength=1.0,
                                subdivisions=None):
    """
    Create a mesh from height map data.
    
    Args:
        name: Name for the new mesh object
        heightmap_data: 2D numpy array with height values (0-1)
        width: Width of the height map in pixels
        height: Height of the height map in pixels
        mesh_width: Physical width of the resulting mesh
        mesh_height: Physical height of the resulting mesh
        displacement_strength: Strength of the displacement (Z-axis)
        subdivisions: Number of subdivisions (if None, uses image dimensions)
        
    Returns:
        tuple: (success, object/error_message)
    """
    try:
        import numpy as np
        
        # Determine subdivisions
        if subdivisions is None:
            # Limit subdivisions for performance
            max_subdivs = 256
            subdivs_x = min(width, max_subdivs)
            subdivs_y = min(height, max_subdivs)
        else:
            subdivs_x = subdivisions
            subdivs_y = subdivisions
        
        # Sample the height map data
        sample_x = np.linspace(0, width - 1, subdivs_x, dtype=int)
        sample_y = np.linspace(0, height - 1, subdivs_y, dtype=int)
        
        # Create mesh and object
        mesh = bpy.data.meshes.new(name=f"{name}_mesh")
        obj = bpy.data.objects.new(name, mesh)
        
        # Link to scene
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # Create bmesh
        bm = bmesh.new()
        
        # Create vertices
        verts = []
        for y_idx, y in enumerate(sample_y):
            for x_idx, x in enumerate(sample_x):
                # Calculate position
                x_pos = (x_idx / (subdivs_x - 1)) * mesh_width - (mesh_width / 2)
                y_pos = (y_idx / (subdivs_y - 1)) * mesh_height - (mesh_height / 2)
                
                # Get height value
                z_pos = heightmap_data[y, x] * displacement_strength
                
                # Create vertex
                vert = bm.verts.new((x_pos, y_pos, z_pos))
                verts.append(vert)
        
        bm.verts.ensure_lookup_table()
        
        # Create faces
        for y in range(subdivs_y - 1):
            for x in range(subdivs_x - 1):
                # Get vertex indices
                v1 = y * subdivs_x + x
                v2 = y * subdivs_x + (x + 1)
                v3 = (y + 1) * subdivs_x + (x + 1)
                v4 = (y + 1) * subdivs_x + x
                
                # Create face
                bm.faces.new([verts[v1], verts[v2], verts[v3], verts[v4]])
        
        # Update mesh
        bm.to_mesh(mesh)
        bm.free()
        
        # Create UV map
        mesh.uv_layers.new(name="UVMap")
        
        # Generate UV coordinates
        uv_layer = mesh.uv_layers[0]
        for face in mesh.polygons:
            for vert_idx, loop_idx in zip(face.vertices, face.loop_indices):
                # Calculate UV based on vertex position
                x = vert_idx % subdivs_x
                y = vert_idx // subdivs_x
                u = x / (subdivs_x - 1)
                v = y / (subdivs_y - 1)
                uv_layer.data[loop_idx].uv = (u, v)
        
        # Recalculate normals
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Apply scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        
        return True, obj
        
    except Exception as e:
        return False, f"Error creating mesh: {str(e)}"


def apply_displacement_to_mesh(obj, filepath, strength=0.5):
    """
    Apply a displacement map to an existing mesh object.
    
    Args:
        obj: The mesh object to apply displacement to
        filepath: Path to the displacement map image
        strength: Strength of the displacement
        
    Returns:
        tuple: (success, message)
    """
    try:
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Load image
        try:
            img = bpy.data.images.load(filepath)
        except Exception as e:
            return False, f"Failed to load image: {str(e)}"
        
        # Create or get material
        if not obj.data.materials:
            mat = bpy.data.materials.new(name=f"{obj.name}_Material")
            obj.data.materials.append(mat)
        else:
            mat = obj.data.materials[0]
        
        # Enable nodes
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        
        # Clear existing nodes
        nodes.clear()
        
        # Create nodes
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (400, 0)
        
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.location = (0, 0)
        
        # Create displacement nodes
        displacement = nodes.new('ShaderNodeDisplacement')
        displacement.location = (200, -300)
        displacement.inputs['Scale'].default_value = strength
        
        img_texture = nodes.new('ShaderNodeTexImage')
        img_texture.location = (-300, -300)
        img_texture.image = img
        img_texture.image.colorspace_settings.name = 'Non-Color'
        
        # Link nodes
        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
        links.new(img_texture.outputs['Color'], displacement.inputs['Height'])
        links.new(displacement.outputs['Displacement'], output.inputs['Displacement'])
        
        # Set material displacement method
        mat.cycles.displacement_method = 'DISPLACEMENT'
        
        return True, f"Displacement map applied to {obj.name}"
        
    except Exception as e:
        return False, f"Error applying displacement: {str(e)}"


class ImageToMeshHelpers:
    """Helper class for image to mesh operations"""
    
    @staticmethod
    def validate_image_file(filepath):
        """Validate if the file is a supported image format"""
        supported_formats = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.tga'}
        ext = os.path.splitext(filepath)[1].lower()
        return ext in supported_formats
    
    @staticmethod
    def get_recommended_subdivisions(width, height):
        """Get recommended subdivision count based on image size"""
        max_dim = max(width, height)
        
        if max_dim <= 128:
            return 64
        elif max_dim <= 512:
            return 128
        elif max_dim <= 1024:
            return 256
        else:
            return 256  # Cap at 256 for performance


def register():
    """Register image to mesh helper functions"""
    pass


def unregister():
    """Unregister image to mesh helper functions"""
    pass
