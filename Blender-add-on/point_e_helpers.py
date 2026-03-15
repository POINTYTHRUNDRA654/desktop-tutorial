"""
Point-E Integration for Fallout 4 Add-on
Text-to-3D and Image-to-3D generation using OpenAI's Point-E
Generates 3D point clouds that can be converted to meshes
"""

import bpy
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty

class PointEHelpers:
    """Helper functions for Point-E integration"""
    
    @staticmethod
    def is_point_e_installed():
        """Check if Point-E is installed"""
        try:
            import torch
            import point_e
            return True, "Point-E is installed"
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Point-E"""
        return """
To install Point-E:

1. Clone the repository:
   gh repo clone openai/point-e
   cd point-e

2. Install dependencies:
   pip install -e .
   pip install torch torchvision
   pip install pillow numpy

3. Download model weights (automatic on first use)

4. Restart Blender

For more info: https://github.com/openai/point-e
"""
    
    @staticmethod
    def generate_from_text(prompt, num_samples=1, grid_size=128):
        """
        Generate 3D point cloud from text prompt using Point-E
        
        Args:
            prompt: Text description of object to generate
            num_samples: Number of point clouds to generate
            grid_size: Resolution of point cloud (32, 64, 128, 256)
        
        Returns:
            Tuple of (success, point_cloud_data or error_message)
        """
        try:
            import torch
            from PIL import Image
            from point_e.diffusion.configs import DIFFUSION_CONFIGS, diffusion_from_config
            from point_e.diffusion.sampler import PointCloudSampler
            from point_e.models.download import load_checkpoint
            from point_e.models.configs import MODEL_CONFIGS, model_from_config
            
            print(f"Generating 3D point cloud from text: '{prompt}'")
            
            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")
            
            # Load models
            print("Loading Point-E base model...")
            base_name = 'base40M-textvec'
            base_model = model_from_config(MODEL_CONFIGS[base_name], device)
            base_model.eval()
            base_diffusion = diffusion_from_config(DIFFUSION_CONFIGS[base_name])
            
            print("Loading Point-E upsample model...")
            upsampler_model = model_from_config(MODEL_CONFIGS['upsample'], device)
            upsampler_model.eval()
            upsampler_diffusion = diffusion_from_config(DIFFUSION_CONFIGS['upsample'])
            
            # Load checkpoints
            print("Loading model checkpoints...")
            base_model.load_state_dict(load_checkpoint(base_name, device))
            upsampler_model.load_state_dict(load_checkpoint('upsample', device))
            
            # Create samplers
            sampler = PointCloudSampler(
                device=device,
                models=[base_model, upsampler_model],
                diffusions=[base_diffusion, upsampler_diffusion],
                num_points=[1024, 4096],
                aux_channels=['R', 'G', 'B'],
                guidance_scale=[3.0, 0.0],
                model_kwargs_key_filter=('texts', ''),
            )
            
            # Generate
            print(f"Generating point cloud...")
            samples = None
            for x in sampler.sample_batch_progressive(
                batch_size=num_samples,
                model_kwargs=dict(texts=[prompt] * num_samples),
            ):
                samples = x
            
            # Extract point cloud
            pc = samples[0]  # First sample
            
            # Get coordinates and colors
            coords = pc.coords  # [N, 3] coordinates
            colors = pc.channels  # [N, 3] RGB colors if available
            
            print(f"Generated point cloud: {len(coords)} points")
            
            return True, {
                'coords': coords.cpu().numpy(),
                'colors': colors.cpu().numpy() if colors is not None else None,
                'prompt': prompt,
                'num_points': len(coords)
            }
            
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def generate_from_image(image_path, num_samples=1):
        """
        Generate 3D point cloud from image using Point-E
        
        Args:
            image_path: Path to input image
            num_samples: Number of point clouds to generate
        
        Returns:
            Tuple of (success, point_cloud_data or error_message)
        """
        try:
            import torch
            from PIL import Image
            from point_e.diffusion.configs import DIFFUSION_CONFIGS, diffusion_from_config
            from point_e.diffusion.sampler import PointCloudSampler
            from point_e.models.download import load_checkpoint
            from point_e.models.configs import MODEL_CONFIGS, model_from_config
            
            print(f"Generating 3D point cloud from image: '{image_path}'")
            
            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")
            
            # Load image
            image = Image.open(image_path)
            
            # Load models
            print("Loading Point-E base model...")
            base_name = 'base40M'  # Image model
            base_model = model_from_config(MODEL_CONFIGS[base_name], device)
            base_model.eval()
            base_diffusion = diffusion_from_config(DIFFUSION_CONFIGS[base_name])
            
            print("Loading Point-E upsample model...")
            upsampler_model = model_from_config(MODEL_CONFIGS['upsample'], device)
            upsampler_model.eval()
            upsampler_diffusion = diffusion_from_config(DIFFUSION_CONFIGS['upsample'])
            
            # Load checkpoints
            print("Loading model checkpoints...")
            base_model.load_state_dict(load_checkpoint(base_name, device))
            upsampler_model.load_state_dict(load_checkpoint('upsample', device))
            
            # Create samplers
            sampler = PointCloudSampler(
                device=device,
                models=[base_model, upsampler_model],
                diffusions=[base_diffusion, upsampler_diffusion],
                num_points=[1024, 4096],
                aux_channels=['R', 'G', 'B'],
                guidance_scale=[3.0, 0.0],
            )
            
            # Generate
            print(f"Generating point cloud...")
            samples = None
            for x in sampler.sample_batch_progressive(
                batch_size=num_samples,
                model_kwargs=dict(images=[image] * num_samples),
            ):
                samples = x
            
            # Extract point cloud
            pc = samples[0]
            
            # Get coordinates and colors
            coords = pc.coords
            colors = pc.channels
            
            print(f"Generated point cloud: {len(coords)} points")
            
            return True, {
                'coords': coords.cpu().numpy(),
                'colors': colors.cpu().numpy() if colors is not None else None,
                'image_path': image_path,
                'num_points': len(coords)
            }
            
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def point_cloud_to_mesh(point_cloud_data, method='ball_pivoting', name="PointE_Generated"):
        """
        Convert point cloud to mesh using various reconstruction methods
        
        Args:
            point_cloud_data: Dictionary with 'coords' and optionally 'colors'
            method: Reconstruction method ('ball_pivoting', 'poisson', 'alpha_shape')
            name: Name for the mesh object
        
        Returns:
            Created mesh object or None
        """
        try:
            import numpy as np
            
            coords = point_cloud_data['coords']
            colors = point_cloud_data.get('colors')
            
            if method == 'ball_pivoting':
                # Use ball pivoting algorithm for surface reconstruction
                return PointEHelpers._ball_pivoting_reconstruction(coords, colors, name)
            elif method == 'poisson':
                # Use Poisson surface reconstruction
                return PointEHelpers._poisson_reconstruction(coords, colors, name)
            elif method == 'alpha_shape':
                # Use alpha shape reconstruction
                return PointEHelpers._alpha_shape_reconstruction(coords, colors, name)
            else:
                # Fallback: Create point cloud as mesh vertices
                return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
            
        except Exception as e:
            print(f"Failed to create mesh from point cloud: {str(e)}")
            return None
    
    @staticmethod
    def _create_point_cloud_mesh(coords, colors, name):
        """Create a simple point cloud visualization in Blender"""
        try:
            # Create mesh with vertices only (no faces)
            mesh = bpy.data.meshes.new(name)
            obj = bpy.data.objects.new(name, mesh)
            
            # Link to scene
            bpy.context.collection.objects.link(obj)
            
            # Add vertices
            mesh.from_pydata(coords.tolist(), [], [])
            mesh.update()
            
            # Apply scale for FO4
            obj.scale = (0.1, 0.1, 0.1)
            
            # Add vertex colors if available
            if colors is not None:
                color_layer = mesh.vertex_colors.new()
                for i, color in enumerate(colors):
                    # Point-E colors are typically in [0, 1] range
                    color_layer.data[i].color = [color[0], color[1], color[2], 1.0]
            
            # Select the new object
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            
            print(f"Created point cloud: {name} with {len(coords)} points")
            return obj
            
        except Exception as e:
            print(f"Failed to create point cloud mesh: {str(e)}")
            return None
    
    @staticmethod
    def _ball_pivoting_reconstruction(coords, colors, name):
        """Ball pivoting algorithm for surface reconstruction"""
        # This would require Open3D or similar library
        # For now, fall back to simple point cloud
        print("Ball pivoting requires Open3D - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
    
    @staticmethod
    def _poisson_reconstruction(coords, colors, name):
        """Poisson surface reconstruction"""
        # This would require Open3D or similar library
        print("Poisson reconstruction requires Open3D - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
    
    @staticmethod
    def _alpha_shape_reconstruction(coords, colors, name):
        """Alpha shape reconstruction"""
        # This would require specialized libraries
        print("Alpha shape requires additional libraries - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)


def register():
    """Register Point-E properties"""
    
    # Add Point-E properties to scene
    bpy.types.Scene.fo4_point_e_prompt = StringProperty(
        name="Text Prompt",
        description="Describe the 3D object you want to generate",
        default="a wooden chair"
    )
    
    bpy.types.Scene.fo4_point_e_image_path = StringProperty(
        name="Image Path",
        description="Path to image for image-to-3D generation",
        default="",
        subtype='FILE_PATH'
    )
    
    bpy.types.Scene.fo4_point_e_num_samples = IntProperty(
        name="Number of Samples",
        description="Number of point clouds to generate",
        default=1,
        min=1,
        max=4
    )
    
    bpy.types.Scene.fo4_point_e_grid_size = EnumProperty(
        name="Grid Size",
        description="Resolution of point cloud",
        items=[
            ('32', "32 (Fast)", "Low resolution, fast generation"),
            ('64', "64 (Balanced)", "Medium resolution"),
            ('128', "128 (High)", "High resolution (recommended)"),
            ('256', "256 (Ultra)", "Very high resolution, slow"),
        ],
        default='128'
    )
    
    bpy.types.Scene.fo4_point_e_reconstruction_method = EnumProperty(
        name="Reconstruction Method",
        description="Method to convert point cloud to mesh",
        items=[
            ('point_cloud', "Point Cloud", "Display as point cloud"),
            ('ball_pivoting', "Ball Pivoting", "Surface reconstruction (requires Open3D)"),
            ('poisson', "Poisson", "Smooth surface (requires Open3D)"),
            ('alpha_shape', "Alpha Shape", "Alpha shape reconstruction"),
        ],
        default='point_cloud'
    )
    
    bpy.types.Scene.fo4_point_e_use_gpu = BoolProperty(
        name="Use GPU",
        description="Use GPU acceleration if available",
        default=True
    )


def unregister():
    """Unregister Point-E properties"""
    
    if hasattr(bpy.types.Scene, 'fo4_point_e_prompt'):
        del bpy.types.Scene.fo4_point_e_prompt
    if hasattr(bpy.types.Scene, 'fo4_point_e_image_path'):
        del bpy.types.Scene.fo4_point_e_image_path
    if hasattr(bpy.types.Scene, 'fo4_point_e_num_samples'):
        del bpy.types.Scene.fo4_point_e_num_samples
    if hasattr(bpy.types.Scene, 'fo4_point_e_grid_size'):
        del bpy.types.Scene.fo4_point_e_grid_size
    if hasattr(bpy.types.Scene, 'fo4_point_e_reconstruction_method'):
        del bpy.types.Scene.fo4_point_e_reconstruction_method
    if hasattr(bpy.types.Scene, 'fo4_point_e_use_gpu'):
        del bpy.types.Scene.fo4_point_e_use_gpu
