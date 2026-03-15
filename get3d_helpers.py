"""
NVIDIA GET3D integration helper
Provides AI-powered 3D mesh generation functionality for Fallout 4 modding
"""

import bpy
import os
import subprocess
import shutil
from pathlib import Path

class GET3DHelpers:
    """Helper functions for NVIDIA GET3D integration"""
    
    @staticmethod
    def is_get3d_available():
        """Check if GET3D is available"""
        try:
            import torch
            # Check for GET3D installation
            import importlib.util
            spec = importlib.util.find_spec('torch')
            if spec is None:
                return False
            
            # Check if GET3D repo exists in common locations
            possible_paths = [
                os.path.expanduser('~/GET3D'),
                os.path.expanduser('~/Projects/GET3D'),
                '/opt/GET3D',
                'C:/Projects/GET3D',
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    return True
            
            return False
        except ImportError:
            return False
    
    @staticmethod
    def find_get3d_path():
        """Find GET3D installation path"""
        possible_paths = [
            os.path.expanduser('~/GET3D'),
            os.path.expanduser('~/Projects/GET3D'),
            os.path.expanduser('~/Documents/GET3D'),
            '/opt/GET3D',
            'C:/Projects/GET3D',
            'C:/Users/' + os.environ.get('USERNAME', '') + '/GET3D',
        ]
        
        for path in possible_paths:
            if os.path.exists(os.path.join(path, 'generate.py')):
                return path
        
        return None
    
    @staticmethod
    def check_get3d_installation():
        """
        Check GET3D installation and return status message
        Returns: (bool success, str message)
        """
        try:
            import torch
            has_torch = True
            cuda_available = torch.cuda.is_available()
        except ImportError:
            has_torch = False
            cuda_available = False
        
        get3d_path = GET3DHelpers.find_get3d_path()
        
        if get3d_path and has_torch:
            msg = f"GET3D found at: {get3d_path}\n"
            if cuda_available:
                msg += "CUDA: Available ✓\n"
                msg += "Ready to generate 3D meshes!"
            else:
                msg += "CUDA: Not available (CPU mode - will be slow)\n"
                msg += "Consider using NVIDIA GPU for faster generation"
            return True, msg
        else:
            install_msg = (
                "GET3D not found. To install:\n\n"
                "1. Clone repository:\n"
                "   gh repo clone NVIDIA/GET3D\n"
                "   (or: git clone https://github.com/NVIDIA/GET3D.git)\n\n"
                "2. Install dependencies:\n"
                "   cd GET3D\n"
                "   pip install torch torchvision\n"
                "   pip install -r requirements.txt\n\n"
                "3. Download pre-trained models:\n"
                "   Follow instructions in GET3D README\n"
                "   Download from NVIDIA or train your own\n\n"
                "4. Place in standard location:\n"
                "   ~/GET3D or ~/Projects/GET3D\n\n"
            )
            
            if not has_torch:
                install_msg += "⚠️ PyTorch not installed\n"
                install_msg += "Install: pip install torch torchvision\n\n"
            
            install_msg += "See NVIDIA_RESOURCES.md for details"
            return False, install_msg
    
    @staticmethod
    def generate_mesh_from_latent(output_path, model_path=None, seed=None, num_samples=1):
        """
        Generate 3D mesh using GET3D
        
        Args:
            output_path: Directory to save generated meshes
            model_path: Path to pre-trained model checkpoint
            seed: Random seed for generation
            num_samples: Number of meshes to generate
        
        Returns: (bool success, str message, list mesh_files)
        """
        get3d_path = GET3DHelpers.find_get3d_path()
        
        if not get3d_path:
            return False, "GET3D not found", []
        
        try:
            import torch
        except ImportError:
            return False, "PyTorch not installed", []
        
        # Create output directory
        os.makedirs(output_path, exist_ok=True)
        
        # For now, return instruction message
        # Full implementation requires loading model and running inference
        msg = (
            "GET3D mesh generation requires manual execution:\n\n"
            f"1. Navigate to: {get3d_path}\n"
            "2. Run inference script:\n"
            "   python generate.py --checkpoint=<model_path> \\\n"
            f"     --output_dir={output_path} \\\n"
            f"     --num_samples={num_samples}\n"
        )
        
        if seed:
            msg += f"     --seed={seed}\n"
        
        msg += "\n3. Import generated .obj files into Blender"
        
        return False, msg, []
    
    @staticmethod
    def import_get3d_mesh(obj_path):
        """
        Import a mesh generated by GET3D into Blender
        
        Args:
            obj_path: Path to .obj file
        
        Returns: (bool success, str message, object)
        """
        if not os.path.exists(obj_path):
            return False, f"File not found: {obj_path}", None
        
        try:
            # Import OBJ file
            bpy.ops.import_scene.obj(filepath=obj_path)
            
            # Get imported object
            imported_obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
            
            if imported_obj:
                return True, f"Imported mesh: {imported_obj.name}", imported_obj
            else:
                return False, "Failed to import mesh", None
        
        except Exception as e:
            return False, f"Import failed: {str(e)}", None
    
    @staticmethod
    def optimize_get3d_mesh_for_fo4(obj):
        """
        Optimize a GET3D generated mesh for Fallout 4
        
        Args:
            obj: Blender object
        
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Use existing mesh optimization
        from . import mesh_helpers
        
        # Apply mesh optimization
        success, message = mesh_helpers.MeshHelpers.optimize_mesh(obj)
        
        if not success:
            return False, message
        
        # Validate for FO4
        success, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        
        if success:
            return True, "Mesh optimized and validated for Fallout 4"
        else:
            return False, f"Optimization complete but validation found issues: {', '.join(issues)}"
    
    @staticmethod
    def get_recommended_settings():
        """
        Get recommended settings for GET3D generation
        
        Returns: dict of recommended settings
        """
        return {
            'num_samples': 1,
            'resolution': 256,  # Mesh resolution
            'texture_resolution': 1024,
            'seed': None,  # Random
            'optimize_for_fo4': True,
            'auto_decimate': True,
            'target_poly_count': 50000,
        }
    
    @staticmethod
    def list_available_models():
        """
        List available GET3D models
        
        Returns: list of model paths
        """
        get3d_path = GET3DHelpers.find_get3d_path()
        
        if not get3d_path:
            return []
        
        # Check for models in common locations
        model_dirs = [
            os.path.join(get3d_path, 'models'),
            os.path.join(get3d_path, 'checkpoints'),
            os.path.join(get3d_path, 'pretrained'),
        ]
        
        models = []
        for model_dir in model_dirs:
            if os.path.exists(model_dir):
                for file in os.listdir(model_dir):
                    if file.endswith('.pkl') or file.endswith('.pt') or file.endswith('.pth'):
                        models.append(os.path.join(model_dir, file))
        
        return models
    
    @staticmethod
    def create_simple_workflow_guide():
        """
        Create a simple workflow guide for GET3D usage
        
        Returns: str guide text
        """
        guide = """
GET3D WORKFLOW FOR FALLOUT 4 MODDING
====================================

1. GENERATE MESH (Outside Blender):
   - Navigate to GET3D directory
   - Run: python generate.py --checkpoint=<model> --output_dir=./output
   - Wait for generation to complete

2. IMPORT TO BLENDER:
   - In Blender, go to: File → Import → Wavefront (.obj)
   - Select generated .obj file
   - Or use 'Import GET3D Mesh' operator

3. OPTIMIZE FOR FALLOUT 4:
   - Select imported mesh
   - Use 'Optimize GET3D Mesh' operator
   - This applies FO4-specific optimizations
   - Checks poly count (max 65,535)
   - Triangulates mesh
   - Applies scale

4. ADD TEXTURES:
   - GET3D generates textures automatically
   - Use 'Setup FO4 Materials' to create proper material
   - Load GET3D textures into material nodes
   - Or use 'Install Texture' operator

5. VALIDATE & EXPORT:
   - Use 'Validate Mesh' to check FO4 compatibility
   - Use 'Export Mesh' to export to FBX
   - Convert to NIF using external tools

TIPS:
- Generated meshes may need decimation
- UV maps are included with GET3D output
- Textures are in PNG format (convert to DDS for FO4)
- See README.md for complete workflow
"""
        return guide

def register():
    """Register GET3D helper functions"""
    pass

def unregister():
    """Unregister GET3D helper functions"""
    pass
