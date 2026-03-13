"""
Image to Mesh helper functions for creating meshes from images.
Uses free resources: PIL/Pillow for image processing and NumPy for data manipulation.
"""

import bpy
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
        # Try importing numpy
        try:
            import numpy as np
        except ImportError:
            return False, "NumPy not installed. Install with: pip install numpy", 0, 0

        # Check if file exists
        if not os.path.exists(filepath):
            return False, f"File not found: {filepath}", 0, 0

        ext = os.path.splitext(filepath)[1].lower()

        # EXR is not supported by PIL — use Blender's native image loader instead
        if ext == '.exr':
            try:
                img = bpy.data.images.load(filepath)
                width, height = img.size
                # Use len(img.pixels) so the buffer size is always exactly right,
                # regardless of internal channel ordering or image mode.
                pixels = np.empty(len(img.pixels), dtype=np.float32)
                img.pixels.foreach_get(pixels)
                pixels = pixels.reshape(height, width, 4)
                bpy.data.images.remove(img)
                # Convert to luminance (grayscale)
                img_array = (0.2126 * pixels[:, :, 0] +
                             0.7152 * pixels[:, :, 1] +
                             0.0722 * pixels[:, :, 2])
                # EXR can contain negative values; clamp before normalising
                img_array = np.maximum(img_array, 0.0)
                # Normalize to 0-1
                max_val = img_array.max()
                if max_val > 0:
                    img_array = img_array / max_val
                return True, img_array, width, height
            except Exception as e:
                return False, f"Error loading EXR image: {str(e)}", 0, 0

        # For all other formats use PIL
        try:
            from PIL import Image
        except ImportError:
            return False, "PIL/Pillow not installed. Install with: pip install Pillow", 0, 0

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

        # Sample the heightmap at the target resolution (numpy indexing, no loops)
        x_indices = np.linspace(0, width - 1, subdivs_x, dtype=int)
        y_indices = np.linspace(0, height - 1, subdivs_y, dtype=int)
        sampled = heightmap_data[np.ix_(y_indices, x_indices)]  # (subdivs_y, subdivs_x)

        # Build all vertex positions with numpy (no Python loops)
        x_coords = np.linspace(-mesh_width / 2, mesh_width / 2, subdivs_x, dtype=np.float32)
        y_coords = np.linspace(-mesh_height / 2, mesh_height / 2, subdivs_y, dtype=np.float32)
        xx, yy = np.meshgrid(x_coords, y_coords)       # each (subdivs_y, subdivs_x)
        zz = (sampled * displacement_strength).astype(np.float32)
        verts = np.stack([xx.ravel(), yy.ravel(), zz.ravel()], axis=1)  # (N, 3)

        # Build quad face indices with numpy (no Python loops)
        row = np.arange(subdivs_y - 1, dtype=np.int32)
        col = np.arange(subdivs_x - 1, dtype=np.int32)
        rr, cc = np.meshgrid(row, col, indexing='ij')   # (subdivs_y-1, subdivs_x-1)
        v0 = (rr * subdivs_x + cc).ravel()
        faces = np.stack([v0, v0 + 1, v0 + subdivs_x + 1, v0 + subdivs_x], axis=1)  # (F, 4)

        # Create mesh and object
        mesh = bpy.data.meshes.new(name=f"{name}_mesh")
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Build mesh via foreach_set — passes numpy buffers directly to C code,
        # avoiding the expensive .tolist() conversion required by from_pydata.
        n_verts = len(verts)
        n_faces = len(faces)
        n_loops = n_faces * 4

        mesh.vertices.add(n_verts)
        mesh.vertices.foreach_set("co", verts.ravel())

        mesh.loops.add(n_loops)
        mesh.loops.foreach_set("vertex_index", faces.ravel())

        mesh.polygons.add(n_faces)
        loop_starts = np.arange(n_faces, dtype=np.int32) * 4
        loop_totals = np.full(n_faces, 4, dtype=np.int32)
        mesh.polygons.foreach_set("loop_start", loop_starts)
        mesh.polygons.foreach_set("loop_total", loop_totals)

        mesh.update(calc_edges=True)

        # Create UV map and write all UVs in one batch (foreach_set avoids per-loop Python)
        mesh.uv_layers.new(name="UVMap")
        uv_layer = mesh.uv_layers[0]

        col_f = cc.ravel().astype(np.float32)
        row_f = rr.ravel().astype(np.float32)
        u0 = col_f / (subdivs_x - 1)
        v0_uv = row_f / (subdivs_y - 1)
        u1 = (col_f + 1) / (subdivs_x - 1)
        v1_uv = (row_f + 1) / (subdivs_y - 1)

        # Loops per face: [v0, v1, v2, v3] = bottom-left, bottom-right, top-right, top-left
        uvs = np.empty((len(faces) * 4, 2), dtype=np.float32)
        uvs[0::4] = np.stack([u0,  v0_uv], axis=1)
        uvs[1::4] = np.stack([u1,  v0_uv], axis=1)
        uvs[2::4] = np.stack([u1,  v1_uv], axis=1)
        uvs[3::4] = np.stack([u0,  v1_uv], axis=1)
        uv_layer.data.foreach_set("uv", uvs.ravel())

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
        
        # Load image (check_existing avoids duplicate data-blocks on repeated calls)
        try:
            img = bpy.data.images.load(filepath, check_existing=True)
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
        supported_formats = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.tga', '.exr'}
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
