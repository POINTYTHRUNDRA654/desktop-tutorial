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
import os
import sys
import subprocess
from pathlib import Path

# Check if HY-Motion-1.0 is available
HYMOTION_AVAILABLE = False
HYMOTION_ERROR = None

try:
    # Check if PyTorch is available (required for motion model)
    import torch
    TORCH_AVAILABLE = True
except (ImportError, RuntimeError, OSError):
    TORCH_AVAILABLE = False
    HYMOTION_ERROR = "PyTorch not available (import failed)"


def check_git_lfs():
    """
    Check if git-lfs is installed and available.
    
    Returns:
        tuple: (available: bool, message: str)
    """
    try:
        result = subprocess.run(
            ['git', 'lfs', 'version'],
            capture_output=True,
            text=True,
            timeout=5
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
    if not TORCH_AVAILABLE:
        return False, "PyTorch not installed. Install with: pip install torch"
    
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
        # PLACEHOLDER IMPLEMENTATION
        # This is a stub that requires actual integration with HY-Motion-1.0's inference code.
        # To integrate:
        #   1. Import HY-Motion-1.0's inference modules
        #   2. Load the motion model weights
        #   3. Call their text-to-motion inference API
        #   4. Convert output to Blender animation keyframes
        # See: https://github.com/Tencent-Hunyuan/HY-Motion-1.0 for API documentation
        
        return False, (
            "Motion generation is a PLACEHOLDER - requires manual integration.\n"
            "This feature needs HY-Motion-1.0's inference code to be integrated.\n"
            f"Prompt: '{prompt}'\n"
            f"Duration: {duration}s @ {fps} FPS\n\n"
            "To use now:\n"
            "1. Open terminal in HY-Motion-1.0 directory\n"
            "2. Run their inference script with your prompt\n"
            "3. Export animation data\n"
            "4. Import to Blender manually\n\n"
            "See documentation for detailed instructions."
        )
        
    except Exception as e:
        return False, f"Error generating motion: {str(e)}"


def apply_motion_to_armature(armature, motion_data):
    """
    Apply generated motion data to a Blender armature.
    
    Args:
        armature: Blender armature object
        motion_data: Motion data from HY-Motion-1.0
        
    Returns:
        tuple: (success: bool, message)
    """
    if armature is None or armature.type != 'ARMATURE':
        return False, "No valid armature object provided"
    
    try:
        # PLACEHOLDER IMPLEMENTATION
        # Real implementation would:
        #   1. Parse motion data format
        #   2. Map bone names to armature bones
        #   3. Create animation action
        #   4. Set keyframes for each bone
        #   5. Set interpolation modes
        
        return False, (
            "Motion application is a PLACEHOLDER.\n"
            "Requires integration with HY-Motion-1.0 output format.\n"
            "Manual import of motion data needed."
        )
        
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
