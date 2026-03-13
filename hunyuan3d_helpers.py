"""
Hunyuan3D-2 AI model integration for generating 3D meshes from text and images.
This module provides optional AI-powered mesh generation using Tencent's Hunyuan3D-2 model.

Note: This is an OPTIONAL feature. The add-on works perfectly without it.
Installing Hunyuan3D-2 requires significant disk space and GPU resources.

Installation:
1. Clone the repository: gh repo clone Tencent-Hunyuan/Hunyuan3D-2
2. Follow their installation instructions
3. The add-on will automatically detect if it's available
"""

import bpy
import os
import sys
import tempfile
import time
from pathlib import Path

# Check if Hunyuan3D-2 is available
HUNYUAN3D_AVAILABLE = False
HUNYUAN3D_ERROR = None

try:
    # Try to import the necessary dependencies
    import torch
    TORCH_AVAILABLE = True
except FileNotFoundError as e:
    TORCH_AVAILABLE = False
    if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
        HUNYUAN3D_ERROR = "Windows path length error: PyTorch cannot load due to Windows MAX_PATH limitation. Enable long paths in Windows or reinstall PyTorch in a shorter path."
    else:
        HUNYUAN3D_ERROR = f"PyTorch file error: {str(e)}"
except Exception:
    TORCH_AVAILABLE = False
    HUNYUAN3D_ERROR = "PyTorch not available (import failed or DLL initialization error)"

# We don't actually import Hunyuan3D here to keep the add-on lightweight
# It will be imported dynamically when needed


# Single source of truth for Hunyuan3D-2 installation locations.
_HUNYUAN_PATHS = [
    os.path.expanduser("~/Hunyuan3D-2"),
    os.path.expanduser("~/Projects/Hunyuan3D-2"),
    "/opt/Hunyuan3D-2",
    os.path.join(os.path.dirname(__file__), "..", "Hunyuan3D-2"),
]

# Cache for check_hunyuan3d_availability() — avoids filesystem hits on every UI redraw.
_hunyuan_availability_cache = None
_hunyuan_availability_cache_time = 0.0
_CACHE_TTL = 5.0  # seconds


def check_hunyuan3d_availability():
    """
    Check if Hunyuan3D-2 is installed and available.

    Results are cached for _CACHE_TTL seconds so that repeated calls from
    Blender's UI draw() loop do not hammer the filesystem on every redraw.
    
    Returns:
        tuple: (available: bool, message: str)
    """
    global _hunyuan_availability_cache, _hunyuan_availability_cache_time
    now = time.monotonic()
    if (_hunyuan_availability_cache is not None and
            (now - _hunyuan_availability_cache_time) < _CACHE_TTL):
        return _hunyuan_availability_cache
    result = _check_hunyuan3d_availability_uncached()
    _hunyuan_availability_cache = result
    _hunyuan_availability_cache_time = now
    return result


def _check_hunyuan3d_availability_uncached():
    """Perform the actual (uncached) Hunyuan3D-2 availability check."""
    if not TORCH_AVAILABLE:
        return False, "PyTorch not installed. Install with: pip install torch torchvision"

    hunyuan_path = next(
        (p for p in _HUNYUAN_PATHS if os.path.exists(p) and os.path.isdir(p)),
        None,
    )

    if hunyuan_path is None:
        return False, (
            "Hunyuan3D-2 not found. Clone it with:\n"
            "gh repo clone Tencent-Hunyuan/Hunyuan3D-2\n"
            "Or: git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git"
        )

    # Check if the main module exists
    if not os.path.exists(os.path.join(hunyuan_path, "infer.py")):
        return False, f"Hunyuan3D-2 found at {hunyuan_path} but infer.py not found"

    return True, f"Hunyuan3D-2 available at: {hunyuan_path}"



def run_text_inference(prompt, output_path=None, resolution=256):
    """
    Run Hunyuan3D-2 text-to-3D inference in a subprocess.
    Safe to call from a background thread — makes no Blender API calls.

    Returns:
        tuple: (success, mesh_file_path or error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    import subprocess
    import glob

    hunyuan_path = next((p for p in _HUNYUAN_PATHS if os.path.isdir(p)), None)
    if output_path is None:
        output_path = tempfile.mkdtemp(prefix="hunyuan3d_text_")
    os.makedirs(output_path, exist_ok=True)

    try:
        cmd = [
            sys.executable, "infer.py",
            "--prompt", prompt,
            "--output_dir", output_path,
            "--resolution", str(resolution),
        ]
        result = subprocess.run(
            cmd, cwd=hunyuan_path,
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode != 0:
            return False, f"Hunyuan3D-2 inference failed:\n{result.stderr}"

        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = glob.glob(os.path.join(output_path, ext))
            if matches:
                return True, matches[0]

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (10 min). The model may be downloading weights on first run."
    except Exception as e:
        return False, f"Error during text inference: {str(e)}"


def run_image_inference(image_path, output_path=None, resolution=256):
    """
    Run Hunyuan3D-2 image-to-3D inference in a subprocess.
    Safe to call from a background thread — makes no Blender API calls.

    Returns:
        tuple: (success, mesh_file_path or error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    if not os.path.exists(image_path):
        return False, f"Image file not found: {image_path}"

    import subprocess
    import glob

    hunyuan_path = next((p for p in _HUNYUAN_PATHS if os.path.isdir(p)), None)
    if output_path is None:
        output_path = tempfile.mkdtemp(prefix="hunyuan3d_img_")
    os.makedirs(output_path, exist_ok=True)

    try:
        cmd = [
            sys.executable, "infer.py",
            "--image", image_path,
            "--output_dir", output_path,
            "--resolution", str(resolution),
        ]
        result = subprocess.run(
            cmd, cwd=hunyuan_path,
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode != 0:
            return False, f"Hunyuan3D-2 inference failed:\n{result.stderr}"

        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = glob.glob(os.path.join(output_path, ext))
            if matches:
                return True, matches[0]

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (10 min). The model may be downloading weights on first run."
    except Exception as e:
        return False, f"Error during image inference: {str(e)}"


def generate_mesh_from_text(prompt, output_path=None, resolution=256):
    """
    Generate a 3D mesh from a text prompt using Hunyuan3D-2.
    
    Args:
        prompt (str): Text description of the 3D model
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Resolution of the generated mesh
        
    Returns:
        tuple: (success: bool, object/error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    try:
        import subprocess
        import glob

        # Locate the Hunyuan3D-2 installation directory
        possible_paths = [
            os.path.expanduser("~/Hunyuan3D-2"),
            os.path.expanduser("~/Projects/Hunyuan3D-2"),
            "/opt/Hunyuan3D-2",
            os.path.join(os.path.dirname(__file__), "..", "Hunyuan3D-2"),
        ]
        hunyuan_path = next(
            (p for p in possible_paths if os.path.isdir(p)), None
        )

        # Choose / create an output directory
        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_text_")
        os.makedirs(output_path, exist_ok=True)

        # Run Hunyuan3D-2 text-to-3D inference
        cmd = [
            sys.executable, "infer.py",
            "--prompt", prompt,
            "--output_dir", output_path,
            "--resolution", str(resolution),
        ]
        result = subprocess.run(
            cmd, cwd=hunyuan_path,
            capture_output=True, text=True, timeout=600
        )
        if result.returncode != 0:
            return False, f"Hunyuan3D-2 inference failed:\n{result.stderr}"

        # Find the generated mesh (OBJ / GLB preferred)
        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = glob.glob(os.path.join(output_path, ext))
            if matches:
                mesh_path = matches[0]
                success, obj_or_msg = import_mesh_file(
                    mesh_path,
                    mesh_name=f"Hunyuan3D_{prompt[:20].replace(' ', '_')}",
                )
                return success, obj_or_msg

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (10 min). The model may be downloading weights on first run."
    except Exception as e:
        return False, f"Error generating mesh from text: {str(e)}"


def generate_mesh_from_image(image_path, output_path=None, resolution=256):
    """
    Generate a full 3D mesh from a 2D image using Hunyuan3D-2 AI model.
    This is different from height map conversion - it creates a complete 3D object.
    
    Args:
        image_path (str): Path to the input image
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Resolution of the generated mesh
        
    Returns:
        tuple: (success: bool, object/error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    if not os.path.exists(image_path):
        return False, f"Image file not found: {image_path}"

    try:
        import subprocess
        import glob

        possible_paths = [
            os.path.expanduser("~/Hunyuan3D-2"),
            os.path.expanduser("~/Projects/Hunyuan3D-2"),
            "/opt/Hunyuan3D-2",
            os.path.join(os.path.dirname(__file__), "..", "Hunyuan3D-2"),
        ]
        hunyuan_path = next(
            (p for p in possible_paths if os.path.isdir(p)), None
        )

        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_img_")
        os.makedirs(output_path, exist_ok=True)

        cmd = [
            sys.executable, "infer.py",
            "--image", image_path,
            "--output_dir", output_path,
            "--resolution", str(resolution),
        ]
        result = subprocess.run(
            cmd, cwd=hunyuan_path,
            capture_output=True, text=True, timeout=600
        )
        if result.returncode != 0:
            return False, f"Hunyuan3D-2 inference failed:\n{result.stderr}"

        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = glob.glob(os.path.join(output_path, ext))
            if matches:
                img_stem = os.path.splitext(os.path.basename(image_path))[0]
                success, obj_or_msg = import_mesh_file(
                    matches[0],
                    mesh_name=f"Hunyuan3D_{img_stem}",
                )
                return success, obj_or_msg

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (10 min). The model may be downloading weights on first run."
    except Exception as e:
        return False, f"Error generating mesh from image: {str(e)}"


def import_mesh_file(filepath, mesh_name="AI_Generated_Mesh"):
    """
    Import a mesh file (OBJ, GLB, etc.) into Blender.
    
    Args:
        filepath (str): Path to the mesh file
        mesh_name (str): Name for the imported object
        
    Returns:
        tuple: (success: bool, object/error_message)
    """
    if not os.path.exists(filepath):
        return False, f"Mesh file not found: {filepath}"
    
    try:
        # Determine file type and import accordingly
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext == '.obj':
            bpy.ops.import_scene.obj(filepath=filepath)
        elif ext in ['.glb', '.gltf']:
            bpy.ops.import_scene.gltf(filepath=filepath)
        elif ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=filepath)
        elif ext == '.stl':
            bpy.ops.import_mesh.stl(filepath=filepath)
        else:
            return False, f"Unsupported file format: {ext}"
        
        # Get the imported object
        obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
        if obj:
            obj.name = mesh_name
            return True, obj
        else:
            return False, "Import succeeded but no object was created"
            
    except Exception as e:
        return False, f"Error importing mesh: {str(e)}"


class Hunyuan3DHelpers:
    """Helper class for Hunyuan3D-2 AI operations"""
    
    @staticmethod
    def is_available():
        """Check if Hunyuan3D-2 is available"""
        available, _ = check_hunyuan3d_availability()
        return available
    
    @staticmethod
    def get_status_message():
        """Get the current status message for Hunyuan3D-2"""
        available, message = check_hunyuan3d_availability()
        if available:
            return f"✓ {message}"
        else:
            return f"✗ {message}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Hunyuan3D-2"""
        return """
To install Hunyuan3D-2:

1. Install PyTorch (if not already installed):
   pip install torch torchvision

2. Clone the Hunyuan3D-2 repository:
   gh repo clone Tencent-Hunyuan/Hunyuan3D-2
   OR
   git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git

3. Follow the installation instructions in their README:
   cd Hunyuan3D-2
   pip install -r requirements.txt

4. Download the model weights (follow their documentation)

5. Restart Blender

Note: Hunyuan3D-2 requires:
- Several GB of disk space for models
- GPU with CUDA support recommended
- Significant computational resources

The add-on will automatically detect when it's installed.
"""


def register():
    """Register Hunyuan3D helper functions"""
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR
    
    # Check availability on registration
    HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = check_hunyuan3d_availability()
    
    if HUNYUAN3D_AVAILABLE:
        print("✓ Hunyuan3D-2 is available")
    else:
        print(f"ℹ Hunyuan3D-2 not available: {HUNYUAN3D_ERROR}")
        print("  (This is optional - the add-on works without it)")


def unregister():
    """Unregister Hunyuan3D helper functions"""
    pass
