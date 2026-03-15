"""
Shap-E Integration for Fallout 4 Add-on
Text-to-3D and Image-to-3D generation using OpenAI's Shap-E
"""

import bpy
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty

class ShapEHelpers:
    """Helper functions for Shap-E integration"""
    
    @staticmethod
    def is_shap_e_installed():
        """Check if Shap-E is installed"""
        try:
            import torch
            import shap_e
            return True, "Shap-E is installed"
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Shap-E"""
        return """
To install Shap-E:

1. Clone the repository:
   git clone https://huggingface.co/openai/shap-e
   cd shap-e

2. Install dependencies:
   pip install -e .
   pip install torch torchvision
   pip install trimesh

3. Download model weights (automatic on first use)

4. Restart Blender

For more info: https://github.com/openai/shap-e
"""
    
    @staticmethod
    def generate_from_text(prompt, guidance_scale=15.0, num_inference_steps=64):
        """
        Generate 3D mesh from text prompt using Shap-E
        
        Args:
            prompt: Text description of object to generate
            guidance_scale: How closely to follow the prompt (higher = more faithful)
            num_inference_steps: Number of generation steps (higher = better quality)
        
        Returns:
            Tuple of (success, mesh_data or error_message)
        """
        try:
            import torch
            from shap_e.diffusion.sample import sample_latents
            from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
            from shap_e.models.download import load_model, load_config
            from shap_e.util.notebooks import decode_latent_mesh
            
            print(f"Generating 3D mesh from text: '{prompt}'")
            
            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")
            
            # Load models
            print("Loading Shap-E models...")
            xm = load_model('transmitter', device=device)
            model = load_model('text300M', device=device)
            diffusion = diffusion_from_config(load_config('diffusion'))
            
            # Generate latents
            print(f"Generating with guidance_scale={guidance_scale}, steps={num_inference_steps}")
            batch_size = 1
            latents = sample_latents(
                batch_size=batch_size,
                model=model,
                diffusion=diffusion,
                guidance_scale=guidance_scale,
                model_kwargs=dict(texts=[prompt] * batch_size),
                progress=True,
                clip_denoised=True,
                use_fp16=True,
                use_karras=True,
                karras_steps=num_inference_steps,
                sigma_min=1e-3,
                sigma_max=160,
                s_churn=0,
            )
            
            # Decode to mesh
            print("Decoding latent to mesh...")
            mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
            
            # Convert to format Blender can use
            vertices = mesh.verts
            faces = mesh.faces
            
            print(f"Generated mesh: {len(vertices)} vertices, {len(faces)} faces")
            
            return True, {
                'vertices': vertices,
                'faces': faces,
                'prompt': prompt
            }
            
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def generate_from_image(image_path, guidance_scale=3.0, num_inference_steps=64):
        """
        Generate 3D mesh from image using Shap-E
        
        Args:
            image_path: Path to input image
            guidance_scale: How closely to follow the image
            num_inference_steps: Number of generation steps
        
        Returns:
            Tuple of (success, mesh_data or error_message)
        """
        try:
            import torch
            from PIL import Image
            from shap_e.diffusion.sample import sample_latents
            from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
            from shap_e.models.download import load_model, load_config
            from shap_e.util.notebooks import decode_latent_mesh
            
            print(f"Generating 3D mesh from image: '{image_path}'")
            
            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")
            
            # Load image
            image = Image.open(image_path)
            
            # Load models
            print("Loading Shap-E models...")
            xm = load_model('transmitter', device=device)
            model = load_model('image300M', device=device)
            diffusion = diffusion_from_config(load_config('diffusion'))
            
            # Generate latents
            print(f"Generating with guidance_scale={guidance_scale}, steps={num_inference_steps}")
            batch_size = 1
            latents = sample_latents(
                batch_size=batch_size,
                model=model,
                diffusion=diffusion,
                guidance_scale=guidance_scale,
                model_kwargs=dict(images=[image] * batch_size),
                progress=True,
                clip_denoised=True,
                use_fp16=True,
                use_karras=True,
                karras_steps=num_inference_steps,
                sigma_min=1e-3,
                sigma_max=160,
                s_churn=0,
            )
            
            # Decode to mesh
            print("Decoding latent to mesh...")
            mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
            
            # Convert to format Blender can use
            vertices = mesh.verts
            faces = mesh.faces
            
            print(f"Generated mesh: {len(vertices)} vertices, {len(faces)} faces")
            
            return True, {
                'vertices': vertices,
                'faces': faces,
                'image_path': image_path
            }
            
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def create_mesh_from_data(mesh_data, name="ShapE_Generated"):
        """
        Create Blender mesh from Shap-E generated data
        
        Args:
            mesh_data: Dictionary with 'vertices' and 'faces'
            name: Name for the mesh object
        
        Returns:
            Created mesh object or None
        """
        try:
            import numpy as np
            
            vertices = mesh_data['vertices']
            faces = mesh_data['faces']
            
            # Convert to numpy if needed
            if not isinstance(vertices, np.ndarray):
                vertices = np.array(vertices)
            if not isinstance(faces, np.ndarray):
                faces = np.array(faces)
            
            # Create mesh
            mesh = bpy.data.meshes.new(name)
            obj = bpy.data.objects.new(name, mesh)
            
            # Link to scene
            bpy.context.collection.objects.link(obj)
            
            # Create mesh from data
            mesh.from_pydata(vertices.tolist(), [], faces.tolist())
            mesh.update()
            
            # Apply scale for Fallout 4
            obj.scale = (0.1, 0.1, 0.1)  # Shap-E meshes are often large
            
            # Select the new object
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            
            print(f"Created mesh: {name}")
            return obj
            
        except Exception as e:
            print(f"Failed to create mesh: {str(e)}")
            return None


def register():
    """Register Shap-E properties"""
    
    # Add Shap-E properties to scene
    bpy.types.Scene.fo4_shap_e_prompt = StringProperty(
        name="Text Prompt",
        description="Describe the 3D object you want to generate",
        default="a wooden chair"
    )
    
    bpy.types.Scene.fo4_shap_e_image_path = StringProperty(
        name="Image Path",
        description="Path to image for image-to-3D generation",
        default="",
        subtype='FILE_PATH'
    )
    
    bpy.types.Scene.fo4_shap_e_guidance_scale = FloatProperty(
        name="Guidance Scale",
        description="How closely to follow the prompt/image (higher = more faithful)",
        default=15.0,
        min=1.0,
        max=30.0
    )
    
    bpy.types.Scene.fo4_shap_e_inference_steps = IntProperty(
        name="Inference Steps",
        description="Number of generation steps (higher = better quality, slower)",
        default=64,
        min=16,
        max=256
    )
    
    bpy.types.Scene.fo4_shap_e_use_gpu = BoolProperty(
        name="Use GPU",
        description="Use GPU acceleration if available",
        default=True
    )


def unregister():
    """Unregister Shap-E properties"""
    
    if hasattr(bpy.types.Scene, 'fo4_shap_e_prompt'):
        del bpy.types.Scene.fo4_shap_e_prompt
    if hasattr(bpy.types.Scene, 'fo4_shap_e_image_path'):
        del bpy.types.Scene.fo4_shap_e_image_path
    if hasattr(bpy.types.Scene, 'fo4_shap_e_guidance_scale'):
        del bpy.types.Scene.fo4_shap_e_guidance_scale
    if hasattr(bpy.types.Scene, 'fo4_shap_e_inference_steps'):
        del bpy.types.Scene.fo4_shap_e_inference_steps
    if hasattr(bpy.types.Scene, 'fo4_shap_e_use_gpu'):
        del bpy.types.Scene.fo4_shap_e_use_gpu
