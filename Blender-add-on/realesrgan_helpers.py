"""
Real-ESRGAN integration helper
Provides AI-powered texture upscaling functionality for Fallout 4 modding
"""

import bpy
import os
import subprocess
import shutil
from pathlib import Path

class RealESRGANHelpers:
    """Helper functions for Real-ESRGAN integration"""
    
    @staticmethod
    def is_realesrgan_available():
        """Check if Real-ESRGAN is available"""
        # Check if realesrgan-ncnn-vulkan (the executable) is in PATH
        if shutil.which('realesrgan-ncnn-vulkan'):
            return True
        
        # Check if inference_realesrgan.py is accessible
        # This would require Python with Real-ESRGAN installed
        try:
            import importlib.util
            spec = importlib.util.find_spec('basicsr')
            return spec is not None
        except:
            return False
    
    @staticmethod
    def get_realesrgan_path():
        """Get the path to Real-ESRGAN executable or script"""
        # Check for compiled version first (faster)
        vulkan_path = shutil.which('realesrgan-ncnn-vulkan')
        if vulkan_path:
            return vulkan_path, 'vulkan'
        
        # Check for Python version
        try:
            import importlib.util
            spec = importlib.util.find_spec('basicsr')
            if spec:
                # Assume inference_realesrgan.py is available
                return 'python', 'python'
        except:
            pass
        
        return None, None
    
    @staticmethod
    def check_realesrgan_installation():
        """
        Check Real-ESRGAN installation and return status message
        Returns: (bool success, str message)
        """
        path, method = RealESRGANHelpers.get_realesrgan_path()
        
        if path:
            if method == 'vulkan':
                return True, f"Real-ESRGAN (Vulkan) found at: {path}"
            else:
                return True, "Real-ESRGAN (Python) is available"
        else:
            install_msg = (
                "Real-ESRGAN not found. To install:\n\n"
                "Method 1 - Python version (Recommended):\n"
                "1. Clone: gh repo clone xinntao/Real-ESRGAN\n"
                "2. cd Real-ESRGAN\n"
                "3. pip install basicsr facexlib gfpgan\n"
                "4. pip install -r requirements.txt\n"
                "5. Download models: python download_models.py\n\n"
                "Method 2 - Vulkan version (Faster, no Python deps):\n"
                "1. Download from: github.com/xinntao/Real-ESRGAN/releases\n"
                "2. Extract and add to PATH\n\n"
                "See NVIDIA_RESOURCES.md for details"
            )
            return False, install_msg
    
    @staticmethod
    def upscale_texture_vulkan(input_path, output_path=None, scale=4, model='realesr-animevideov3'):
        """
        Upscale texture using Real-ESRGAN Vulkan version
        
        Args:
            input_path: Path to input texture
            output_path: Path for output (optional)
            scale: Upscale factor (2 or 4)
            model: Model to use
        
        Returns: (bool success, str message)
        """
        vulkan_path = shutil.which('realesrgan-ncnn-vulkan')
        if not vulkan_path:
            return False, "Real-ESRGAN Vulkan executable not found"
        
        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"
        
        # Determine output path
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_upscaled{ext}"
        
        try:
            # Build command
            cmd = [
                vulkan_path,
                '-i', input_path,
                '-o', output_path,
                '-s', str(scale),
                '-n', model
            ]
            
            # Run upscaling
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode == 0 and os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                size_mb = file_size / (1024 * 1024)
                return True, f"Texture upscaled {scale}x successfully: {output_path} ({size_mb:.1f} MB)"
            else:
                error_msg = result.stderr if result.stderr else result.stdout
                return False, f"Upscaling failed: {error_msg}"
        
        except subprocess.TimeoutExpired:
            return False, "Texture upscaling timed out (5 minutes)"
        except Exception as e:
            return False, f"Failed to upscale texture: {str(e)}"
    
    @staticmethod
    def upscale_texture_python(input_path, output_path=None, scale=4, model='RealESRGAN_x4plus'):
        """
        Upscale texture using Real-ESRGAN Python version
        
        Args:
            input_path: Path to input texture
            output_path: Path for output (optional)
            scale: Upscale factor (2 or 4)
            model: Model name
        
        Returns: (bool success, str message)
        """
        try:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer
            import numpy as np
            import cv2
        except ImportError:
            return False, "Real-ESRGAN Python dependencies not installed (basicsr, realesrgan)"
        
        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"
        
        # Determine output path
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_upscaled{ext}"
        
        try:
            # Load image
            img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
            if img is None:
                return False, f"Failed to load image: {input_path}"
            
            # Initialize model
            # Note: This is a simplified version - actual implementation needs model weights
            # Users need to download models using download_models.py
            
            # For now, return a message about manual upscaling
            return False, (
                "Python-based upscaling requires manual execution:\n"
                "1. Navigate to Real-ESRGAN directory\n"
                "2. Run: python inference_realesrgan.py -n RealESRGAN_x4plus -i input.png -o output\n"
                "3. Import upscaled texture back to Blender\n\n"
                "Use Vulkan version for automatic upscaling from Blender."
            )
        
        except Exception as e:
            return False, f"Failed to upscale texture: {str(e)}"
    
    @staticmethod
    def upscale_texture(input_path, output_path=None, scale=4, method='auto'):
        """
        Upscale texture using best available method
        
        Args:
            input_path: Path to input texture
            output_path: Path for output (optional)
            scale: Upscale factor (2 or 4)
            method: 'auto', 'vulkan', or 'python'
        
        Returns: (bool success, str message)
        """
        path, detected_method = RealESRGANHelpers.get_realesrgan_path()
        
        if not path:
            return False, "Real-ESRGAN not installed"
        
        # Determine which method to use
        if method == 'auto':
            method = detected_method
        
        if method == 'vulkan':
            return RealESRGANHelpers.upscale_texture_vulkan(
                input_path, output_path, scale
            )
        elif method == 'python':
            return RealESRGANHelpers.upscale_texture_python(
                input_path, output_path, scale
            )
        else:
            return False, f"Unknown upscaling method: {method}"
    
    @staticmethod
    def batch_upscale_textures(texture_list, output_dir, scale=4):
        """
        Upscale multiple textures
        
        Args:
            texture_list: List of input texture paths
            output_dir: Directory for output files
            scale: Upscale factor
        
        Returns: (int success_count, list results)
        """
        os.makedirs(output_dir, exist_ok=True)
        
        success_count = 0
        results = []
        
        for input_path in texture_list:
            filename = os.path.basename(input_path)
            base_name, ext = os.path.splitext(filename)
            output_path = os.path.join(output_dir, f"{base_name}_upscaled{ext}")
            
            success, message = RealESRGANHelpers.upscale_texture(
                input_path,
                output_path,
                scale
            )
            
            results.append({
                'input': input_path,
                'output': output_path if success else None,
                'success': success,
                'message': message
            })
            
            if success:
                success_count += 1
        
        return success_count, results
    
    @staticmethod
    def upscale_object_textures(obj, output_dir, scale=4):
        """
        Upscale all textures used by an object
        
        Args:
            obj: Blender object
            output_dir: Directory to save upscaled textures
            scale: Upscale factor (2 or 4)
        
        Returns: (bool success, str message, list upscaled_files)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", []
        
        if not obj.data.materials:
            return False, "Object has no materials", []
        
        if not RealESRGANHelpers.is_realesrgan_available():
            return False, "Real-ESRGAN not installed", []
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Collect textures from material
        texture_list = []
        
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    img = node.image
                    if img.filepath:
                        img_path = bpy.path.abspath(img.filepath)
                        if os.path.exists(img_path):
                            texture_list.append(img_path)
        
        if not texture_list:
            return False, "No textures found in object materials", []
        
        # Upscale textures
        success_count, results = RealESRGANHelpers.batch_upscale_textures(
            texture_list,
            output_dir,
            scale
        )
        
        # Collect upscaled file paths
        upscaled_files = []
        for result in results:
            if result['success'] and result['output']:
                upscaled_files.append(result['output'])
        
        if success_count > 0:
            message = f"Upscaled {success_count}/{len(texture_list)} textures ({scale}x)"
            return True, message, upscaled_files
        else:
            return False, "Failed to upscale any textures", []
    
    @staticmethod
    def get_recommended_scale(image_width, image_height):
        """
        Get recommended upscale factor based on current resolution
        
        Returns: int scale factor (2 or 4)
        """
        # For very small textures, use 4x
        if image_width <= 512 or image_height <= 512:
            return 4
        # For medium textures, use 2x
        elif image_width <= 1024 or image_height <= 1024:
            return 2
        # For large textures, don't upscale
        else:
            return 1
    
    @staticmethod
    def estimate_output_size(input_path, scale):
        """
        Estimate output file size after upscaling
        
        Returns: tuple (width, height, estimated_size_mb)
        """
        try:
            import cv2
            img = cv2.imread(input_path)
            if img is not None:
                h, w = img.shape[:2]
                new_w = w * scale
                new_h = h * scale
                # Rough estimate: assume PNG compression
                estimated_size = (new_w * new_h * 3) / (1024 * 1024) * 0.3
                return new_w, new_h, estimated_size
        except:
            pass
        
        return None, None, None

def register():
    """Register Real-ESRGAN helper functions"""
    pass

def unregister():
    """Unregister Real-ESRGAN helper functions"""
    pass
