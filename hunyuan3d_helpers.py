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
import importlib.util
import os
import sys
import tempfile
from pathlib import Path

# Check if Hunyuan3D-2 is available
HUNYUAN3D_AVAILABLE = False
HUNYUAN3D_ERROR = None

# NOTE: TORCH_AVAILABLE is intentionally NOT evaluated at module-import time.
# The user's PyTorch custom path is added to sys.path only during register(),
# which runs after this module is first imported.  Evaluating it here would
# always return False and the flag would never update.  Instead we use the
# lazy helper _torch_available() which calls find_spec at invocation time.


def _torch_available() -> bool:
    """Return True if torch is findable on the current sys.path.

    Uses importlib.util.find_spec (a fast filesystem check) rather than
    actually importing torch so that (a) we don't pay the multi-second
    load cost at every availability probe and (b) the check automatically
    reflects paths added to sys.path after this module was imported (e.g.
    the PyTorch Custom Path restored during add-on register()).
    """
    return importlib.util.find_spec("torch") is not None


# We don't actually import Hunyuan3D here to keep the add-on lightweight
# It will be imported dynamically when needed


def _dll_init_error_message(exc_str: str = "") -> str:
    """Return a user-friendly message when WinError 1114 (DLL init failure) occurs.

    This error typically means a CUDA-version mismatch between the installed
    PyTorch and the system GPU driver, or a missing Visual C++ Redistributable.

    Args:
        exc_str: String representation of the original OSError.  When provided,
                 the actual failing DLL path is extracted and shown in the message.
    """
    import re as _re
    dll_path = ""
    if exc_str:
        m = _re.search(r"'([^']+\.(?:dll|pyd))'", exc_str, _re.IGNORECASE)
        if m:
            dll_path = m.group(1)
    dll_line = (
        f"A file such as {dll_path} could not be loaded.\n"
        if dll_path
        else "A torch DLL (e.g. torch\\lib\\c10.dll) could not be loaded.\n"
    )
    return (
        "PyTorch DLL initialisation failed (WinError 1114).\n"
        "This usually means a CUDA/driver version mismatch.\n"
        + dll_line + "\n"
        "Suggested fixes:\n"
        "1. Reinstall PyTorch matching your CUDA toolkit version:\n"
        "   https://pytorch.org/get-started/locally/\n"
        "2. Install the latest Visual C++ Redistributable from Microsoft:\n"
        "   https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
        "3. Update your GPU driver to one compatible with your CUDA version.\n"
        "4. If no GPU is present, install the CPU-only PyTorch build."
    )


def _build_hunyuan3d_candidates():
    """Return an ordered list of candidate paths to search for Hunyuan3D-2.

    The tools-root location (set by the addon installer or the user's
    ``tools_root`` preference) is checked first so that the auto-installed
    copy on D:\\blender_tools takes priority over any stray clone in the
    user's home directory that might be missing infer.py.
    """
    import tool_installers as _tli

    candidates = []

    # 1. User-configured tools_root preference (highest priority)
    try:
        for addon_id in (
            "bl_ext.user_default.blender_game_tools",
            __name__.split(".")[0],
        ):
            entry = bpy.context.preferences.addons.get(addon_id)
            if entry:
                tr = getattr(entry.preferences, "tools_root", "")
                if tr:
                    candidates.append(os.path.join(tr, "Hunyuan3D-2"))
                break
    except Exception:
        pass

    # 2. tool_installers default root (D:\blender_tools\Hunyuan3D-2)
    try:
        candidates.append(str(_tli.get_tools_root() / "Hunyuan3D-2"))
    except Exception:
        pass

    # 3. Common user-home and system locations (legacy / manual installs)
    candidates += [
        os.path.expanduser("~/Hunyuan3D-2"),
        os.path.expanduser("~/Projects/Hunyuan3D-2"),
        "/opt/Hunyuan3D-2",
        os.path.join(os.path.dirname(__file__), "..", "Hunyuan3D-2"),
    ]

    return candidates


def _is_valid_hunyuan_install(path: str) -> bool:
    """Return True if *path* is a Hunyuan3D-2 directory that contains infer.py."""
    return os.path.isdir(path) and os.path.exists(os.path.join(path, "infer.py"))


def check_hunyuan3d_availability():
    """
    Check if Hunyuan3D-2 is installed and available.
    
    Returns:
        tuple: (available: bool, message: str)
    """
    if not _torch_available():
        return False, "PyTorch not installed. Install with: pip install torch torchvision"

    # Probe torch to catch DLL init failures (WinError 1114 — CUDA/driver mismatch).
    # find_spec only verifies the files exist; it does not load the DLLs.
    # Skip the probe when torch is already in sys.modules — it has been successfully
    # loaded (e.g. by the Settings panel background probe) and its DLLs are confirmed
    # working, so attempting a second import cannot give new information.
    if sys.modules.get("torch") is None:
        try:
            importlib.import_module("torch")
        except OSError as _e:
            if getattr(_e, 'winerror', None) == 1114 or "WinError 1114" in str(_e):
                return False, _dll_init_error_message(str(_e))
            return False, f"PyTorch failed to load: {_e}"
        except ImportError as _e:
            return False, f"PyTorch not available: {_e}"

    candidates = _build_hunyuan3d_candidates()

    # First pass: find a directory that actually contains infer.py
    for path in candidates:
        if _is_valid_hunyuan_install(path):
            return True, f"Hunyuan3D-2 available at: {path}"

    # Second pass: report any directory found but missing infer.py
    for path in candidates:
        if os.path.isdir(path):
            return False, f"Hunyuan3D-2 found at {path} but infer.py not found"

    return False, (
        "Hunyuan3D-2 not found. Clone it with:\n"
        "gh repo clone Tencent-Hunyuan/Hunyuan3D-2\n"
        "Or: git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git"
    )


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
        import glob as _glob

        # Locate the Hunyuan3D-2 installation directory
        hunyuan_path = next(
            (p for p in _build_hunyuan3d_candidates() if _is_valid_hunyuan_install(p)),
            None,
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
            matches = _glob.glob(os.path.join(output_path, ext))
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
        import glob as _glob

        possible_paths = _build_hunyuan3d_candidates()
        hunyuan_path = next(
            (p for p in possible_paths if _is_valid_hunyuan_install(p)),
            None,
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
            matches = _glob.glob(os.path.join(output_path, ext))
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


def clear_availability_cache():
    """Reset any cached availability state so the next check runs fresh.

    Called by the install operator after a successful install to ensure
    the panel reflects the newly-installed state immediately.
    """
    # hunyuan3d_helpers does not keep its own TTL cache — check_hunyuan3d_availability()
    # re-runs on every call.  The module-level globals below are only written by
    # register() so we reset them here to match the "not yet checked" state.
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR
    HUNYUAN3D_AVAILABLE = False
    HUNYUAN3D_ERROR = None


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
