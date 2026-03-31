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
# None = not yet checked; True = available; False = not available
HUNYUAN3D_AVAILABLE = None
HUNYUAN3D_ERROR = None

# NOTE: TORCH_AVAILABLE is intentionally NOT evaluated at module-import time.
# The user's PyTorch custom path is added to sys.path only during register(),
# which runs after this module is first imported.  Evaluating it here would
# always return False and the flag would never update.  Instead we use the
# lazy helper _torch_available() which calls find_spec at invocation time.


def _mossy_provides_torch() -> bool:
    """Return True when the Mossy bridge is online and provides PyTorch.

    When Mossy is connected, PyTorch runs inside the Mossy desktop app -
    a local Blender-side torch install is not required for AI inference.
    Safe to call from background threads; all bpy.context access is guarded.
    """
    try:
        import bpy as _bpy
        wm = _bpy.context.window_manager
        if getattr(wm, 'mossy_bridge_status', "").startswith("Mossy Bridge online"):
            return True
        try:
            from . import preferences as _prefs
            p = _prefs.get_preferences()
            if p is not None and getattr(p, 'use_mossy_as_ai', False):
                return True
        except Exception:
            pass
    except Exception:
        pass
    return False


def _torch_available() -> bool:
    """Return True if torch is available locally or via the Mossy bridge.

    Checks (1) a fast local find_spec so custom-path installs are detected,
    then (2) whether the Mossy bridge is online (Mossy hosts PyTorch, so no
    local install is needed).  Called at invocation time, never at import
    time, so it correctly reflects the runtime state.
    """
    if importlib.util.find_spec("torch") is not None:
        return True
    return _mossy_provides_torch()


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
        "4. If no GPU is present, install the CPU-only PyTorch build:\n"
        "   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
    )


def _build_hunyuan3d_candidates() -> list:
    """Return an ordered list of candidate paths to search for Hunyuan3D-2.

    The tools-root location (set by the addon installer or the user's
    ``tools_root`` preference) is checked first so that the auto-installed
    copy on D:\\blender_tools takes priority over any stray clone in the
    user's home directory that might be missing the hy3dgen package.
    """
    from . import tool_installers as _tli

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
    """Return True if *path* is a Hunyuan3D-2 directory with the hy3dgen package.

    The hy3dgen/ sub-directory is the canonical marker for a complete clone of
    Tencent-Hunyuan/Hunyuan3D-2.  The old infer.py no longer exists in the repo.
    """
    return os.path.isdir(path) and os.path.isdir(os.path.join(path, "hy3dgen"))


def check_hunyuan3d_availability():
    """Check if Hunyuan3D-2 is installed and available.

    As a side-effect, updates the module-level ``HUNYUAN3D_AVAILABLE`` and
    ``HUNYUAN3D_ERROR`` globals so that ``get_cached_availability()`` always
    reflects the most recent result without requiring a separate cache layer.

    Returns:
        tuple: (available: bool, message: str)
    """
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR

    if not _torch_available():
        result = False, "PyTorch not installed. Install with: pip install torch torchvision"
        HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
        return result

    # Probe torch to catch DLL init failures (WinError 1114 - CUDA/driver mismatch).
    # find_spec only verifies the files exist; it does not load the DLLs.
    # Skip the probe when: (a) torch is already loaded in this process, or
    # (b) torch runs inside Mossy - there are no local DLLs to verify.
    if sys.modules.get("torch") is None and not _mossy_provides_torch():
        try:
            importlib.import_module("torch")
        except OSError as _e:
            if getattr(_e, 'winerror', None) == 1114 or "WinError 1114" in str(_e):
                result = False, _dll_init_error_message(str(_e))
            else:
                result = False, f"PyTorch failed to load: {_e}"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result
        except ImportError as _e:
            result = False, f"PyTorch not available: {_e}"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result

    candidates = _build_hunyuan3d_candidates()

    # First pass: find a directory that actually contains the hy3dgen package
    for path in candidates:
        if _is_valid_hunyuan_install(path):
            result = True, f"Hunyuan3D-2 available at: {path}"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result

    # Second pass: report any directory found but missing the hy3dgen package
    for path in candidates:
        if os.path.isdir(path):
            result = False, f"Hunyuan3D-2 found at {path} but hy3dgen package not found"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result

    result = False, (
        "Hunyuan3D-2 not found. Clone it with:\n"
        "gh repo clone Tencent-Hunyuan/Hunyuan3D-2\n"
        "Or: git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git"
    )
    HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
    return result


def generate_mesh_from_text(prompt, output_path=None, resolution=256):
    """
    Generate a 3D mesh from a text prompt using Hunyuan3D-2.

    Hunyuan3D-2 uses a text-conditioned DiT pipeline.  The inference is run in
    a subprocess so that the hy3dgen package (which lives inside the cloned repo
    and requires torch) is imported in an isolated environment rather than
    polluting Blender's embedded Python.

    Args:
        prompt (str): Text description of the 3D model
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Unused – kept for API compatibility.

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
        if not hunyuan_path:
            return False, "Hunyuan3D-2 installation not found"

        # Choose / create an output directory
        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_text_")
        os.makedirs(output_path, exist_ok=True)

        # Build an inline inference script so we don't need infer.py to exist.
        # sys.path.insert(0, hunyuan_path) exposes the hy3dgen package to the
        # subprocess even though it is not installed as a pip package.
        # The script is written to a private temp dir (not the user-supplied
        # output_path) to avoid placing executable code in a world-writable
        # location.
        out_file = os.path.join(output_path, "output.glb")
        _script = (
            "import sys, os\n"
            f"sys.path.insert(0, {repr(hunyuan_path)})\n"
            "from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline\n"
            f"prompt = {repr(prompt)}\n"
            f"out_file = {repr(out_file)}\n"
            "pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(\n"
            "    'tencent/Hunyuan3D-2')\n"
            "mesh = pipeline(prompt=prompt)[0]\n"
            "mesh.export(out_file)\n"
            "print(f'Saved mesh to {out_file}')\n"
        )

        _script_dir = tempfile.mkdtemp(prefix="hy3d_script_")
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, dir=_script_dir
        ) as _f:
            _f.write(_script)
            _script_path = _f.name

        try:
            result = subprocess.run(
                [sys.executable, _script_path],
                capture_output=True, text=True, timeout=600,
            )
        finally:
            try:
                os.unlink(_script_path)
            except OSError:
                pass

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

    The inference is run in a subprocess so that the hy3dgen package (which
    lives inside the cloned repo and requires torch) is imported in an isolated
    environment rather than polluting Blender's embedded Python.

    Args:
        image_path (str): Path to the input image
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Unused – kept for API compatibility.

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

        hunyuan_path = next(
            (p for p in _build_hunyuan3d_candidates() if _is_valid_hunyuan_install(p)),
            None,
        )
        if not hunyuan_path:
            return False, "Hunyuan3D-2 installation not found"

        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_img_")
        os.makedirs(output_path, exist_ok=True)

        # Build an inline inference script so we don't need infer.py to exist.
        # sys.path.insert(0, hunyuan_path) exposes the hy3dgen package to the
        # subprocess even though it is not installed as a pip package.
        # The script is written to a private temp dir (not the user-supplied
        # output_path) to avoid placing executable code in a world-writable
        # location.
        out_file = os.path.join(output_path, "output.glb")
        _script = (
            "import sys, os\n"
            f"sys.path.insert(0, {repr(hunyuan_path)})\n"
            "from PIL import Image\n"
            "from hy3dgen.rembg import BackgroundRemover\n"
            "from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline\n"
            "from hy3dgen.texgen import Hunyuan3DPaintPipeline\n"
            f"image_path = {repr(image_path)}\n"
            f"out_file = {repr(out_file)}\n"
            "image = Image.open(image_path).convert('RGBA')\n"
            "if image.mode == 'RGB':\n"
            "    rembg = BackgroundRemover()\n"
            "    image = rembg(image)\n"
            "pipeline_shape = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(\n"
            "    'tencent/Hunyuan3D-2')\n"
            "pipeline_tex = Hunyuan3DPaintPipeline.from_pretrained(\n"
            "    'tencent/Hunyuan3D-2')\n"
            "mesh = pipeline_shape(image=image)[0]\n"
            "mesh = pipeline_tex(mesh, image=image)\n"
            "mesh.export(out_file)\n"
            "print(f'Saved mesh to {out_file}')\n"
        )

        _script_dir = tempfile.mkdtemp(prefix="hy3d_script_")
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, dir=_script_dir
        ) as _f:
            _f.write(_script)
            _script_path = _f.name

        try:
            result = subprocess.run(
                [sys.executable, _script_path],
                capture_output=True, text=True, timeout=600,
            )
        finally:
            try:
                os.unlink(_script_path)
            except OSError:
                pass

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


def get_cached_availability():
    """Return the most recently computed availability status without re-probing.

    Used by the UI draw() function to avoid heavy filesystem / DLL probes on
    every redraw.  Returns ``(None, "Not yet checked…")`` when no check has
    been run since startup or the last ``clear_availability_cache()`` call.
    Call the ``fo4.check_hunyuan3d_status`` operator to force a fresh probe.

    Returns:
        tuple: (available: bool | None, message: str)
    """
    if HUNYUAN3D_AVAILABLE is None:
        return None, "Not yet checked - click Check Status to refresh"
    return HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR or ""


def clear_availability_cache():
    """Reset any cached availability state so the next check runs fresh.

    Called by the install operator after a successful install to ensure
    the panel reflects the newly-installed state immediately.
    """
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR
    # Reset to None (not False) so the UI shows "Not checked" rather than
    # "Not installed", prompting the user to click Check Status after install.
    HUNYUAN3D_AVAILABLE = None
    HUNYUAN3D_ERROR = None


def register():
    """Register Hunyuan3D helper functions.

    Intentionally does NOT call check_hunyuan3d_availability() here because
    torch_custom_path has not yet been added to sys.path at module-register
    time (that happens later in register() via restore_extra_python_paths()).
    The deferred_startup() task runs 2 seconds after load and populates
    HUNYUAN3D_AVAILABLE / HUNYUAN3D_ERROR with an accurate result.
    """
    # Leave HUNYUAN3D_AVAILABLE = None so the UI shows "Not checked"
    # rather than a potentially-stale "Not installed" during the 2-second
    # window before deferred_startup() fires.
    print("ℹ Hunyuan3D-2 availability check deferred to startup (torch paths not yet ready)")
    print("  (This is optional - the add-on works without it)")


def unregister():
    """Unregister Hunyuan3D helper functions"""
    pass
