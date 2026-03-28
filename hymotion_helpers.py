"""
HY-Motion-1.0 integration for generating character animations and motion sequences.
This module provides optional motion generation using Tencent's HY-Motion-1.0 model.

Note: This is an OPTIONAL feature. The add-on works perfectly without it.
Installing HY-Motion-1.0 requires git-lfs and significant disk space.

Installation:
1. Install git-lfs: https://git-lfs.github.com/
2. Clone repository: git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git
3. Pull LFS files: git lfs pull
4. Install requirements: pip install -r requirements.txt
"""

import bpy
import importlib.util
import os
import platform
import sys
import subprocess
from pathlib import Path

# Check if HY-Motion-1.0 is available
HYMOTION_AVAILABLE = False
HYMOTION_ERROR = None

# NOTE: TORCH_AVAILABLE is intentionally NOT evaluated at module-import time.
# The PyTorch custom path is added to sys.path only during register(), which
# runs after this module is first imported.  Use _torch_available() instead.


def _torch_available() -> bool:
    """Return True if torch is findable on the current sys.path.

    Uses importlib.util.find_spec (a fast filesystem check) rather than
    actually importing torch, so the result reflects any paths added to
    sys.path after module import (e.g. PyTorch Custom Path from prefs).
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


def _find_git_lfs_env():
    """
    Return an environment dict suitable for running git-lfs commands.

    On Windows, git-lfs may be installed to a non-standard drive (e.g. D:).
    If ``git lfs version`` fails via the current PATH, this function tries a
    set of common D-drive locations and, when one is found *and verified to
    work*, returns a copy of ``os.environ`` with that directory prepended to
    PATH.  If nothing extra is needed (or we are not on Windows), the current
    environment is returned unchanged.

    Returns:
        dict: Environment mapping to pass to subprocess.
    """
    env = os.environ.copy()

    if platform.system() != "Windows":
        return env

    # Common D-drive locations when Git for Windows is installed there
    candidate_dirs = [
        r"D:\Program Files\Git\cmd",
        r"D:\Program Files\Git LFS",
        r"D:\Programs\Git\cmd",
        r"D:\Programs\Git LFS",
    ]

    for candidate in candidate_dirs:
        exe = os.path.join(candidate, "git-lfs.exe")
        if not os.path.isfile(exe):
            continue
        # Verify the executable actually works before using it
        test_env = os.environ.copy()
        test_env["PATH"] = candidate + os.pathsep + test_env.get("PATH", "")
        try:
            result = subprocess.run(
                ["git", "lfs", "version"],
                capture_output=True,
                text=True,
                timeout=5,
                env=test_env,
            )
            if result.returncode == 0:
                return test_env
        except Exception:
            pass  # this candidate is broken; try the next one

    return env


def check_git_lfs():
    """
    Check if git-lfs is installed and available.

    On Windows the function also searches common D-drive installation paths
    (e.g. 'D:\\Program Files\\Git\\cmd') so that a non-default drive
    installation is detected correctly.

    Returns:
        tuple: (available: bool, message: str)
    """
    env = _find_git_lfs_env()
    try:
        result = subprocess.run(
            ['git', 'lfs', 'version'],
            capture_output=True,
            text=True,
            timeout=5,
            env=env,
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return True, f"git-lfs available: {version}"
        else:
            return False, "git-lfs not working properly"
    except FileNotFoundError:
        return False, "git-lfs not installed"
    except subprocess.TimeoutExpired:
        return False, "git-lfs command timed out"
    except Exception as e:
        return False, f"Error checking git-lfs: {str(e)}"


def check_hymotion_availability():
    """
    Check if HY-Motion-1.0 is installed and available.
    
    Returns:
        tuple: (available: bool, message: str)
    """
    if not _torch_available():
        return False, "PyTorch not installed. Install with: pip install torch torchvision"

    # Probe torch to catch DLL init failures (WinError 1114 — CUDA/driver mismatch).
    try:
        importlib.import_module("torch")
    except OSError as _e:
        if getattr(_e, 'winerror', None) == 1114 or "WinError 1114" in str(_e):
            return False, _dll_init_error_message()
        return False, f"PyTorch failed to load: {_e}"
    except ImportError as _e:
        return False, f"PyTorch not available: {_e}"
    
    # Check if git-lfs is available
    lfs_available, lfs_message = check_git_lfs()
    if not lfs_available:
        return False, f"git-lfs required but not available: {lfs_message}"
    
    # Check if HY-Motion-1.0 repository is cloned
    possible_paths = [
        os.path.expanduser("~/HY-Motion-1.0"),
        os.path.expanduser("~/Projects/HY-Motion-1.0"),
        "/opt/HY-Motion-1.0",
        os.path.join(os.path.dirname(__file__), "..", "HY-Motion-1.0"),
    ]
    
    hymotion_path = None
    for path in possible_paths:
        if os.path.exists(path) and os.path.isdir(path):
            hymotion_path = path
            break
    
    if hymotion_path is None:
        return False, (
            "HY-Motion-1.0 not found. Install it with:\n"
            "git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git\n"
            "cd HY-Motion-1.0\n"
            "git lfs pull\n"
            "pip install -r requirements.txt"
        )
    
    # Check if requirements.txt exists
    requirements_file = os.path.join(hymotion_path, "requirements.txt")
    if not os.path.exists(requirements_file):
        return False, f"HY-Motion-1.0 found at {hymotion_path} but requirements.txt missing"
    
    return True, f"HY-Motion-1.0 available at: {hymotion_path}"


def generate_motion_from_text(prompt, duration=5.0, fps=30):
    """
    Generate motion/animation from a text prompt using HY-Motion-1.0.

    Args:
        prompt (str): Text description of the motion (e.g., "character walking forward")
        duration (float): Duration of the animation in seconds
        fps (int): Frames per second for the animation

    Returns:
        tuple: (success: bool, result/error_message)
    """
    available, message = check_hymotion_availability()
    if not available:
        return False, f"HY-Motion-1.0 not available: {message}"

    try:
        import glob as _glob
        import tempfile

        possible_paths = [
            os.path.expanduser("~/HY-Motion-1.0"),
            os.path.expanduser("~/Projects/HY-Motion-1.0"),
            "/opt/HY-Motion-1.0",
            os.path.join(os.path.dirname(__file__), "..", "HY-Motion-1.0"),
        ]
        hymotion_path = next(
            (p for p in possible_paths if os.path.isdir(p)), None
        )

        output_dir = tempfile.mkdtemp(prefix="hymotion_")

        # Prefer a dedicated inference entry-point if one exists; fall back to
        # common naming conventions used across forks of the repo.
        for script_name in ("infer.py", "inference.py", "run_inference.py", "demo.py"):
            script_path = os.path.join(hymotion_path, script_name)
            if os.path.exists(script_path):
                break
        else:
            return False, "HY-Motion-1.0 inference script not found (tried infer.py / inference.py)."

        cmd = [
            sys.executable, script_name,
            "--prompt", prompt,
            "--output_dir", output_dir,
            "--duration", str(duration),
            "--fps", str(fps),
        ]
        result = subprocess.run(
            cmd, cwd=hymotion_path,
            capture_output=True, text=True, timeout=600
        )
        if result.returncode != 0:
            return False, f"HY-Motion-1.0 inference failed:\n{result.stderr}"

        # Look for BVH or FBX output to auto-import
        for ext in ("*.bvh", "*.fbx", "*.npy"):
            matches = _glob.glob(os.path.join(output_dir, ext))
            if matches:
                motion_path = matches[0]
                ok, msg = import_motion_file(motion_path)
                if ok:
                    return True, f"Motion generated and imported: {motion_path}"
                return False, f"Motion generated at {motion_path} but import failed: {msg}"

        return True, f"Motion generation finished. Output in: {output_dir}"

    except subprocess.TimeoutExpired:
        return False, "HY-Motion-1.0 inference timed out (10 min)."
    except Exception as e:
        return False, f"Error generating motion: {str(e)}"


def apply_motion_to_armature(armature, motion_data):
    """
    Apply generated motion data to a Blender armature.

    motion_data is expected to be a dict with the structure produced by
    HY-Motion-1.0 (or any compatible loader):

        {
            'fps': <int>,
            'bones': {
                '<bone_name>': [
                    {'frame': <int>, 'location': [x, y, z],
                     'rotation_euler': [rx, ry, rz],      # values in DEGREES
                     'rotation_quaternion': [w, x, y, z]},  # optional alternative
                    ...
                ],
                ...
            }
        }

    Note: ``rotation_euler`` values must be provided in degrees; they are
    converted to radians internally before being written as Blender keyframes.

    Args:
        armature: Blender armature object
        motion_data: dict — motion data as described above

    Returns:
        tuple: (success: bool, message)
    """
    if armature is None or armature.type != 'ARMATURE':
        return False, "No valid armature object provided"

    if not isinstance(motion_data, dict) or 'bones' not in motion_data:
        return False, "Invalid motion_data: expected dict with 'bones' key"

    try:
        import math

        scene = bpy.context.scene
        motion_fps = motion_data.get('fps', 30)
        scene.render.fps = motion_fps

        # Create a new action for this motion
        action = bpy.data.actions.new(name="HyMotion_Action")
        armature.animation_data_create()
        armature.animation_data.action = action

        bones_data = motion_data['bones']
        for bone_name, keyframes in bones_data.items():
            pose_bone = armature.pose.bones.get(bone_name)
            if pose_bone is None:
                continue  # skip bones not present in this rig

            for kf in keyframes:
                frame = kf.get('frame', 0)
                scene.frame_set(frame)

                loc = kf.get('location')
                if loc and len(loc) == 3:
                    pose_bone.location = loc
                    pose_bone.keyframe_insert(data_path='location', frame=frame)

                rot = kf.get('rotation_euler')
                if rot and len(rot) == 3:
                    pose_bone.rotation_mode = 'XYZ'
                    pose_bone.rotation_euler = [math.radians(a) for a in rot]
                    pose_bone.keyframe_insert(
                        data_path='rotation_euler', frame=frame
                    )

                rot_q = kf.get('rotation_quaternion')
                if rot_q and len(rot_q) == 4:
                    pose_bone.rotation_mode = 'QUATERNION'
                    pose_bone.rotation_quaternion = rot_q
                    pose_bone.keyframe_insert(
                        data_path='rotation_quaternion', frame=frame
                    )

        # Reset to frame 1
        scene.frame_set(1)

        bone_count = len(bones_data)
        return True, f"Motion applied: {bone_count} bones, action '{action.name}'"

    except Exception as e:
        return False, f"Error applying motion: {str(e)}"


def import_motion_file(filepath, armature=None):
    """
    Import a motion file generated by HY-Motion-1.0.
    
    Args:
        filepath (str): Path to motion file
        armature: Optional armature to apply motion to
        
    Returns:
        tuple: (success: bool, message)
    """
    if not os.path.exists(filepath):
        return False, f"Motion file not found: {filepath}"
    
    try:
        # Determine file format and import
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext in ['.bvh', '.fbx']:
            # These can be imported directly to Blender
            if ext == '.bvh':
                bpy.ops.import_anim.bvh(filepath=filepath)
                return True, "BVH motion imported successfully"
            elif ext == '.fbx':
                bpy.ops.import_scene.fbx(filepath=filepath)
                return True, "FBX animation imported successfully"
        else:
            return False, f"Unsupported motion format: {ext}\nSupported: .bvh, .fbx"
            
    except Exception as e:
        return False, f"Error importing motion: {str(e)}"


class HyMotionHelpers:
    """Helper class for HY-Motion-1.0 operations"""
    
    @staticmethod
    def is_available():
        """Check if HY-Motion-1.0 is available"""
        available, _ = check_hymotion_availability()
        return available
    
    @staticmethod
    def get_status_message():
        """Get the current status message for HY-Motion-1.0"""
        available, message = check_hymotion_availability()
        if available:
            return f"✓ {message}"
        else:
            return f"✗ {message}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for HY-Motion-1.0"""
        return """
To install HY-Motion-1.0:

1. Install git-lfs (Large File Storage):
   
   Windows:
     Download from: https://git-lfs.github.com/
     Or: choco install git-lfs
   
   macOS:
     brew install git-lfs
   
   Linux (Ubuntu/Debian):
     sudo apt-get install git-lfs
   
   After install, run:
     git lfs install

2. Clone the HY-Motion-1.0 repository:
   git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git
   cd HY-Motion-1.0

3. Pull large model files with git-lfs:
   git lfs pull

4. Install Python dependencies:
   pip install -r requirements.txt

5. Download any additional model weights if required
   (check their README for instructions)

6. Restart Blender

Note: HY-Motion-1.0 requires:
- git-lfs for downloading model weights
- Several GB of disk space for models
- GPU with CUDA support recommended
- PyTorch with appropriate version

The add-on will automatically detect when it's installed.

For more information, see:
https://github.com/Tencent-Hunyuan/HY-Motion-1.0
"""


def register():
    """Register HY-Motion helper functions"""
    global HYMOTION_AVAILABLE, HYMOTION_ERROR
    
    # Check availability on registration
    HYMOTION_AVAILABLE, HYMOTION_ERROR = check_hymotion_availability()
    
    if HYMOTION_AVAILABLE:
        print("✓ HY-Motion-1.0 is available")
    else:
        print(f"ℹ HY-Motion-1.0 not available: {HYMOTION_ERROR}")
        print("  (This is optional - the add-on works without it)")


def unregister():
    """Unregister HY-Motion helper functions"""
    pass
