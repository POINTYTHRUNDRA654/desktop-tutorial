"""
StyleGAN2 integration helper
Provides AI-powered texture generation functionality for Fallout 4 modding
"""

import bpy
import os
import subprocess
import shutil
from pathlib import Path

class StyleGAN2Helpers:
    """Helper functions for StyleGAN2 integration"""
    
    @staticmethod
    def is_stylegan2_available():
        """Check if StyleGAN2 is available"""
        try:
            import torch
            # Check for StyleGAN2 installation
            possible_paths = [
                os.path.expanduser('~/stylegan2'),
                os.path.expanduser('~/Projects/stylegan2'),
                os.path.expanduser('~/stylegan2-pytorch'),
                '/opt/stylegan2',
                'C:/Projects/stylegan2',
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    return True
            
            return False
        except ImportError:
            return False
    
    @staticmethod
    def find_stylegan2_path():
        """Find StyleGAN2 installation path"""
        possible_paths = [
            os.path.expanduser('~/stylegan2'),
            os.path.expanduser('~/Projects/stylegan2'),
            os.path.expanduser('~/stylegan2-pytorch'),
            os.path.expanduser('~/Documents/stylegan2'),
            '/opt/stylegan2',
            'C:/Projects/stylegan2',
            'C:/Users/' + os.environ.get('USERNAME', '') + '/stylegan2',
        ]
        
        for path in possible_paths:
            if os.path.exists(os.path.join(path, 'generate.py')):
                return path
        
        return None
    
    @staticmethod
    def check_stylegan2_installation():
        """
        Check StyleGAN2 installation and return status message
        Returns: (bool success, str message)
        """
        try:
            import torch
            has_torch = True
            cuda_available = torch.cuda.is_available()
        except ImportError:
            has_torch = False
            cuda_available = False
        
        stylegan2_path = StyleGAN2Helpers.find_stylegan2_path()
        
        if stylegan2_path and has_torch:
            msg = f"StyleGAN2 found at: {stylegan2_path}\n"
            if cuda_available:
                msg += "CUDA: Available ✓\n"
                msg += "Ready to generate textures!"
            else:
                msg += "CUDA: Not available (CPU mode - will be slow)\n"
                msg += "Consider using NVIDIA GPU for faster generation"
            return True, msg
        else:
            install_msg = (
                "StyleGAN2 not found. To install:\n\n"
                "Method 1 - Official NVIDIA Repository:\n"
                "1. Clone repository:\n"
                "   gh repo clone NVlabs/stylegan2\n"
                "   (or: git clone https://github.com/NVlabs/stylegan2.git)\n\n"
                "2. Install dependencies:\n"
                "   cd stylegan2\n"
                "   pip install torch torchvision\n"
                "   pip install ninja scipy pillow\n\n"
                "3. Download pre-trained models:\n"
                "   Visit: https://github.com/NVlabs/stylegan2\n"
                "   Download .pkl files for texture generation\n\n"
                "Method 2 - PyTorch Implementation:\n"
                "1. Clone: gh repo clone rosinality/stylegan2-pytorch\n"
                "2. Install: pip install torch torchvision pillow\n\n"
                "4. Place in standard location:\n"
                "   ~/stylegan2 or ~/Projects/stylegan2\n\n"
            )
            
            if not has_torch:
                install_msg += "⚠️ PyTorch not installed\n"
                install_msg += "Install: pip install torch torchvision\n\n"
            
            install_msg += "See NVIDIA_RESOURCES.md for details"
            return False, install_msg
    
    @staticmethod
    def generate_texture(output_path, model_path=None, seed=None, resolution=1024, num_images=1):
        """
        Generate texture using StyleGAN2
        
        Args:
            output_path: Directory to save generated textures
            model_path: Path to pre-trained model (.pkl or .pt)
            seed: Random seed for generation
            resolution: Output resolution (512, 1024, etc.)
            num_images: Number of textures to generate
        
        Returns: (bool success, str message, list texture_files)
        """
        stylegan2_path = StyleGAN2Helpers.find_stylegan2_path()
        
        if not stylegan2_path:
            return False, "StyleGAN2 not found", []
        
        try:
            import torch
        except ImportError:
            return False, "PyTorch not installed", []
        
        # Create output directory
        os.makedirs(output_path, exist_ok=True)
        
        # For now, return instruction message
        # Full implementation requires loading model and running inference
        msg = (
            "StyleGAN2 texture generation requires manual execution:\n\n"
            f"1. Navigate to: {stylegan2_path}\n"
            "2. Run generation script:\n"
            "   python generate.py --network=<model.pkl> \\\n"
            f"     --outdir={output_path} \\\n"
            f"     --seeds={seed if seed else '0-9'} \\\n"
            f"     --resolution={resolution}\n"
            "\n3. Import generated textures into Blender materials\n"
            "\nFor batch generation:\n"
            f"   python generate.py --network=<model.pkl> --outdir={output_path} \\\n"
            f"     --seeds=0-{num_images-1}\n"
        )
        
        return False, msg, []
    
    @staticmethod
    def import_texture_to_material(texture_path, obj, texture_type='DIFFUSE'):
        """
        Import a StyleGAN2 generated texture into Blender material
        
        Args:
            texture_path: Path to texture image
            obj: Blender object
            texture_type: Type of texture (DIFFUSE, NORMAL, SPECULAR)
        
        Returns: (bool success, str message)
        """
        if not os.path.exists(texture_path):
            return False, f"Texture not found: {texture_path}"
        
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Use existing texture installation
        from . import texture_helpers
        
        # Ensure object has material
        if not obj.data.materials:
            from . import texture_helpers
            texture_helpers.TextureHelpers.setup_fo4_material(obj)
        
        # Install texture
        success, message = texture_helpers.TextureHelpers.install_texture(
            obj, texture_path, texture_type
        )
        
        return success, message
    
    @staticmethod
    def batch_generate_textures(output_dir, num_textures=10, seed_start=0):
        """
        Generate multiple textures in batch
        
        Args:
            output_dir: Directory for output
            num_textures: Number of textures to generate
            seed_start: Starting seed value
        
        Returns: (bool success, str message)
        """
        stylegan2_path = StyleGAN2Helpers.find_stylegan2_path()
        
        if not stylegan2_path:
            return False, "StyleGAN2 not found"
        
        os.makedirs(output_dir, exist_ok=True)
        
        msg = (
            f"To generate {num_textures} textures:\n\n"
            f"1. cd {stylegan2_path}\n"
            f"2. python generate.py --network=<model.pkl> \\\n"
            f"     --outdir={output_dir} \\\n"
            f"     --seeds={seed_start}-{seed_start + num_textures - 1}\n"
            "\n3. Textures will be saved as seed0000.png, seed0001.png, etc.\n"
            "4. Import into Blender using 'Install Texture' operator"
        )
        
        return False, msg
    
    @staticmethod
    def list_available_models():
        """
        List available StyleGAN2 models
        
        Returns: list of model paths
        """
        stylegan2_path = StyleGAN2Helpers.find_stylegan2_path()
        
        if not stylegan2_path:
            return []
        
        # Check for models in common locations
        model_dirs = [
            os.path.join(stylegan2_path, 'models'),
            os.path.join(stylegan2_path, 'pretrained'),
            os.path.join(stylegan2_path, 'checkpoints'),
            stylegan2_path,
        ]
        
        models = []
        for model_dir in model_dirs:
            if os.path.exists(model_dir):
                for file in os.listdir(model_dir):
                    if file.endswith('.pkl') or file.endswith('.pt') or file.endswith('.pth'):
                        models.append(os.path.join(model_dir, file))
        
        return models
    
    @staticmethod
    def get_texture_categories():
        """
        Get common texture categories for StyleGAN2 models
        
        Returns: list of texture categories
        """
        return [
            'generic',          # General purpose textures
            'fabric',           # Cloth, leather materials
            'metal',            # Metallic surfaces
            'stone',            # Rock, concrete textures
            'wood',             # Wood grain textures
            'organic',          # Natural, organic patterns
            'terrain',          # Ground, dirt textures
            'architectural',    # Building materials
        ]
    
    @staticmethod
    def create_workflow_guide():
        """
        Create workflow guide for StyleGAN2 usage
        
        Returns: str guide text
        """
        guide = """
STYLEGAN2 WORKFLOW FOR TEXTURE GENERATION
=========================================

1. INSTALL STYLEGAN2:
   gh repo clone NVlabs/stylegan2
   cd stylegan2
   pip install torch torchvision ninja scipy pillow

2. DOWNLOAD PRE-TRAINED MODELS:
   Visit: https://github.com/NVlabs/stylegan2
   Download model for your texture type (e.g., FFHQ, LSUN, etc.)
   Or train your own model on custom texture dataset

3. GENERATE TEXTURES (Outside Blender):
   cd stylegan2
   python generate.py --network=<model.pkl> \\
     --outdir=./textures --seeds=0-9 --resolution=1024
   
   This creates 10 unique textures at 1024x1024

4. IMPORT TO BLENDER:
   - Select your mesh object
   - Use 'Setup FO4 Materials' to create material
   - Use 'Install Texture' to load generated texture
   - Choose appropriate texture type (Diffuse/Normal/Specular)

5. OPTIMIZE FOR FALLOUT 4:
   - Use 'Convert to DDS' for proper format
   - Validate texture dimensions (power of 2)
   - Ensure textures are 2048x2048 or smaller for performance

TIPS FOR BEST RESULTS:
- Use seed variation to generate multiple options
- Generated textures work best as diffuse maps
- For normal maps, use specialized training data
- Combine with Real-ESRGAN for upscaling
- Convert to DDS format for FO4 (use NVTT)

COMMON MODELS:
- FFHQ: Face textures (adapt for character skins)
- LSUN: Various scene categories
- Custom: Train on your own texture dataset

See NVIDIA_RESOURCES.md for detailed instructions
"""
        return guide
    
    @staticmethod
    def get_recommended_settings():
        """
        Get recommended settings for texture generation
        
        Returns: dict of settings
        """
        return {
            'resolution': 1024,      # Good balance of quality and size
            'num_images': 10,        # Generate multiple options
            'seed_start': 0,
            'format': 'png',         # PNG for Blender, convert to DDS for FO4
            'truncation': 0.7,       # Controls variation (0.5-1.0)
            'batch_size': 4,         # For GPU efficiency
        }
    
    @staticmethod
    def suggest_model_for_texture_type(texture_type):
        """
        Suggest appropriate model for texture type
        
        Args:
            texture_type: Type of texture needed
        
        Returns: str model suggestion
        """
        suggestions = {
            'DIFFUSE': 'Use LSUN or custom dataset trained on diffuse textures',
            'NORMAL': 'Normal maps require specialized training - consider manual creation',
            'SPECULAR': 'Generate as grayscale, use simple patterns',
            'fabric': 'Train on fabric texture dataset or use texture synthesis',
            'metal': 'Use LSUN metal/industrial categories',
            'terrain': 'Use landscape or terrain-specific models',
        }
        
        return suggestions.get(texture_type, 'Use general-purpose StyleGAN2 model')

def register():
    """Register StyleGAN2 helper functions"""
    pass

def unregister():
    """Unregister StyleGAN2 helper functions"""
    pass
