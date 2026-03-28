"""
ZoeDepth integration for monocular depth estimation from images.
This module provides optional depth estimation using Intel ISL's ZoeDepth model.

Note: This is an OPTIONAL feature. The add-on works perfectly without it.
Installing ZoeDepth requires PyTorch and the ZoeDepth repository.

Installation:
1. Clone the repository: gh repo clone isl-org/ZoeDepth
2. Install PyTorch: pip install torch torchvision
3. Install dependencies: pip install -r requirements.txt
4. The add-on will automatically detect if it's available

ZoeDepth provides:
- Monocular depth estimation from regular RGB images
- High-quality depth maps for image-to-mesh conversion
- Better results than simple height map extraction
"""

import bpy
import importlib.util
import os
import sys
import tempfile
import time
from pathlib import Path

# Check if ZoeDepth is available
ZOEDEPTH_AVAILABLE = False
ZOEDEPTH_ERROR = None

# Cache for check_zoedepth_availability() — avoids repeated filesystem hits on every UI redraw
_availability_cache = None
_availability_cache_time = 0.0
_CACHE_TTL = 5.0  # seconds

# NOTE: TORCH_AVAILABLE is intentionally NOT evaluated at module-import time.
# The PyTorch custom path is added to sys.path only during register(), which
# runs after this module is first imported.  Use _torch_available() instead.

# We don't actually import ZoeDepth here to keep the add-on lightweight
# It will be imported dynamically when needed


def _torch_available() -> bool:
    """Return True if torch is findable on the current sys.path.

    Uses importlib.util.find_spec (a fast filesystem check, no actual import)
    so the result correctly reflects any paths added to sys.path after module
    import (e.g. the PyTorch Custom Path restored during add-on register()).
    """
    return importlib.util.find_spec("torch") is not None


def _dll_init_error_message() -> str:
    """Return a user-friendly message when WinError 1114 (DLL init failure) occurs.

    This error typically means a CUDA-version mismatch between the installed
    PyTorch and the system GPU driver, or a missing Visual C++ Redistributable.
    """
    return (
        "PyTorch DLL initialisation failed (WinError 1114).\n"
        "This usually means a CUDA/driver version mismatch.\n"
        "A file such as D:\\blender_torch\\torch\\lib\\c10.dll could not be loaded.\n\n"
        "Suggested fixes:\n"
        "1. Reinstall PyTorch matching your CUDA toolkit version:\n"
        "   https://pytorch.org/get-started/locally/\n"
        "2. Install the latest Visual C++ Redistributable from Microsoft:\n"
        "   https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
        "3. Update your GPU driver to one compatible with your CUDA version.\n"
        "4. If no GPU is present, install the CPU-only PyTorch build."
    )


def clear_availability_cache():
    """
    Force-expire the availability cache after successful installation.

    Call this after a successful install so the next UI redraw reflects
    the new state without waiting for the 5-second TTL to expire.
    """
    global _availability_cache, _availability_cache_time
    _availability_cache = None
    _availability_cache_time = 0.0


def check_zoedepth_availability():
    """
    Check if ZoeDepth is installed and available.

    Results are cached for _CACHE_TTL seconds so that repeated calls from
    Blender's UI draw() loop do not hammer the filesystem on every redraw.

    Returns:
        tuple: (available: bool, message: str)
    """
    global _availability_cache, _availability_cache_time
    now = time.monotonic()
    if _availability_cache is not None and (now - _availability_cache_time) < _CACHE_TTL:
        return _availability_cache

    result = _check_zoedepth_availability_uncached()
    _availability_cache = result
    _availability_cache_time = now
    return result


def _check_zoedepth_availability_uncached():
    """Perform the actual (uncached) ZoeDepth availability check."""
    if not _torch_available():
        return False, (
            "PyTorch not installed. Install with: pip install torch torchvision\n"
            "Windows users: if PyTorch is installed but fails to load, enable long paths "
            "(regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem → "
            "LongPathsEnabled=1) or reinstall PyTorch to a shorter path."
        )

    # Probe torch to catch DLL init failures (WinError 1114 — CUDA/driver mismatch).
    try:
        importlib.import_module("torch")
    except OSError as _e:
        if getattr(_e, 'winerror', None) == 1114 or "WinError 1114" in str(_e):
            return False, _dll_init_error_message()
        return False, f"PyTorch failed to load: {_e}"
    except ImportError as _e:
        return False, f"PyTorch not available: {_e}"

    # Check if ZoeDepth repository is cloned
    # Common locations to check
    possible_paths = [
        os.path.expanduser("~/ZoeDepth"),
        os.path.expanduser("~/Projects/ZoeDepth"),
        "/opt/ZoeDepth",
        os.path.join(os.path.dirname(__file__), "tools", "ZoeDepth"),  # addon_folder/tools/ZoeDepth
    ]

    # Also check the tool_installers managed directory
    try:
        from . import tool_installers
        for candidate in tool_installers.candidate_tool_paths("ZoeDepth"):
            candidate_str = str(candidate)
            if Path(candidate_str) not in [Path(p) for p in possible_paths]:
                possible_paths.insert(0, candidate_str)  # Check these first
    except Exception:
        pass
    
    zoedepth_path = None
    for path in possible_paths:
        if os.path.exists(path) and os.path.isdir(path):
            zoedepth_path = path
            break
    
    if zoedepth_path is None:
        return False, (
            "ZoeDepth not found. Clone it with:\n"
            "gh repo clone isl-org/ZoeDepth\n"
            "Or: git clone https://github.com/isl-org/ZoeDepth.git"
        )
    
    # Check if the main module exists
    if not os.path.exists(os.path.join(zoedepth_path, "zoedepth")):
        return False, f"ZoeDepth found at {zoedepth_path} but zoedepth module not found"
    
    return True, f"ZoeDepth available at: {zoedepth_path}"


def estimate_depth_from_image(image_path, output_path=None, model_type="ZoeD_N"):
    """
    Estimate depth from an RGB image using ZoeDepth.
    
    Args:
        image_path (str): Path to input RGB image
        output_path (str): Path to save the depth map (optional)
        model_type (str): ZoeDepth model variant ("ZoeD_N", "ZoeD_K", "ZoeD_NK")
            - ZoeD_N: NYU-trained model (indoor scenes)
            - ZoeD_K: KITTI-trained model (outdoor/driving)
            - ZoeD_NK: Combined model (general purpose)
        
    Returns:
        tuple: (success: bool, depth_array/error_message, width, height)
    """
    available, message = check_zoedepth_availability()
    if not available:
        return False, f"ZoeDepth not available: {message}", 0, 0
    
    try:
        import numpy as np
        from PIL import Image as _PIL_Image

        # Locate the ZoeDepth installation directory
        possible_paths = [
            os.path.expanduser("~/ZoeDepth"),
            os.path.expanduser("~/Projects/ZoeDepth"),
            "/opt/ZoeDepth",
            os.path.join(os.path.dirname(__file__), "..", "ZoeDepth"),
        ]
        zoedepth_path = None
        for p in possible_paths:
            if os.path.exists(p) and os.path.isdir(p):
                zoedepth_path = p
                break

        if zoedepth_path is None:
            return False, "ZoeDepth directory not found.", 0, 0

        # Make ZoeDepth importable
        if zoedepth_path not in sys.path:
            sys.path.insert(0, zoedepth_path)

        import torch
        from zoedepth.models.builder import build_model
        from zoedepth.utils.config import get_config

        # Build the requested model variant
        conf = get_config(model_type, "infer")
        model = build_model(conf)
        model.eval()

        # Load and pre-process the input image
        image = _PIL_Image.open(image_path).convert("RGB")

        # Run inference — ZoeDepth's infer_pil returns a float32 numpy depth map
        with torch.no_grad():
            depth = model.infer_pil(image)  # shape (H, W), metric depth in metres

        h, w = depth.shape

        # Optionally persist the depth map as a 16-bit PNG
        if output_path:
            d_min, d_max = float(depth.min()), float(depth.max())
            if d_max > d_min:
                depth_norm = (depth - d_min) / (d_max - d_min)
            else:
                depth_norm = depth
            depth_uint16 = (depth_norm * 65535).astype(np.uint16)
            _PIL_Image.fromarray(depth_uint16).save(output_path)

        return True, depth, w, h

    except Exception as e:
        return False, f"Error estimating depth: {str(e)}", 0, 0


def create_mesh_from_depth_map(name, depth_map, width, height, 
                               mesh_width=2.0, mesh_height=2.0,
                               depth_scale=1.0, subdivisions=None):
    """
    Create a 3D mesh from a depth map.
    
    Args:
        name (str): Name for the new mesh object
        depth_map: 2D numpy array with depth values
        width (int): Width of the depth map in pixels
        height (int): Height of the depth map in pixels
        mesh_width (float): Physical width of the resulting mesh
        mesh_height (float): Physical height of the resulting mesh
        depth_scale (float): Scale factor for depth values
        subdivisions (int): Number of subdivisions (if None, uses image dimensions)
        
    Returns:
        tuple: (success: bool, object/error_message)
    """
    try:
        import numpy as np
        from .image_to_mesh_helpers import create_mesh_from_heightmap
        
        # Normalize depth map to 0-1 range
        depth_normalized = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min())
        
        # Use existing heightmap function
        return create_mesh_from_heightmap(
            name, depth_normalized, width, height,
            mesh_width, mesh_height, depth_scale, subdivisions
        )
        
    except Exception as e:
        return False, f"Error creating mesh from depth map: {str(e)}"


def get_installation_info():
    """
    Get detailed installation information for ZoeDepth.
    
    Returns:
        str: Installation instructions
    """
    info = """
ZoeDepth - Monocular Depth Estimation
======================================

ZoeDepth is a state-of-the-art depth estimation model from Intel ISL.
It can estimate depth from regular RGB images without requiring stereo or depth sensors.

INSTALLATION STEPS:
-------------------

1. Install PyTorch (if not already installed):
   
   Windows:
   cd "C:\\Program Files\\Blender Foundation\\Blender X.X\\X.X\\python\\bin"
   python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   
   macOS/Linux:
   cd /path/to/blender/X.X/python/bin
   ./python3.xx -m pip install torch torchvision

2. Clone ZoeDepth repository:
   
   Using GitHub CLI (recommended):
   gh repo clone isl-org/ZoeDepth
   
   Or using git:
   git clone https://github.com/isl-org/ZoeDepth.git

3. Install ZoeDepth dependencies:
   
   cd ZoeDepth
   pip install -r requirements.txt

4. Download model weights (automatic on first use)

5. Restart Blender

USAGE:
------

Once installed, you'll see a "Depth Estimation (ZoeDepth)" section:
- Select an RGB image
- Choose model type:
  * ZoeD_N: Best for indoor scenes (NYU-trained)
  * ZoeD_K: Best for outdoor/driving (KITTI-trained)
  * ZoeD_NK: General purpose (combined)
- Generate depth map
- Convert to 3D mesh

BENEFITS:
---------
- Estimate depth from any RGB image
- No need for stereo cameras or depth sensors
- Higher quality than simple height map extraction
- Multiple models for different scenarios

REPOSITORY:
-----------
https://github.com/isl-org/ZoeDepth

PAPER:
------
"ZoeDepth: Zero-shot Transfer by Combining Relative and Metric Depth"
Intel ISL, 2023
"""
    return info


def get_status_message():
    """
    Get the current status of ZoeDepth integration.
    
    Returns:
        str: Status message with color code
    """
    available, message = check_zoedepth_availability()
    
    if available:
        return f"✓ {message}"
    else:
        return f"✗ {message}"


def register():
    """Register ZoeDepth helper functions"""
    global ZOEDEPTH_AVAILABLE, ZOEDEPTH_ERROR
    
    # Check availability on registration
    ZOEDEPTH_AVAILABLE, ZOEDEPTH_ERROR = check_zoedepth_availability()
    
    if ZOEDEPTH_AVAILABLE:
        print("✓ ZoeDepth is available")
    else:
        print(f"ℹ ZoeDepth not available: {ZOEDEPTH_ERROR}")
        print("  (This is optional - the add-on works without it)")


def unregister():
    """Unregister ZoeDepth helper functions"""
    pass
