"""
Instant-NGP integration helper
Provides Neural Radiance Fields (NeRF) 3D reconstruction functionality for Fallout 4 modding
"""

import bpy
import os
import subprocess
import shutil
import sys
import time
from pathlib import Path

class InstantNGPHelpers:
    """Helper functions for Instant-NGP integration"""

    # Cache for is_instantngp_available() — avoids shutil.which + filesystem hits
    # on every Blender UI redraw.
    _cache = None
    _cache_time = 0.0
    _CACHE_TTL = 5.0  # seconds

    @staticmethod
    def _get_user_configured_path() -> str:
        """Return the user-configured Instant-NGP path string (may be empty).

        Reads from addon preferences first (the persisted canonical store),
        falling back to the per-scene property which mirrors the same value.
        """
        try:
            from . import preferences as _prefs_mod
            _prefs = _prefs_mod.get_preferences()
            if _prefs is not None:
                path = getattr(_prefs, "instantngp_path", "").strip()
                if path:
                    return path
        except Exception:
            pass
        try:
            scene = bpy.context.scene
            return getattr(scene, "fo4_instantngp_path", "").strip()
        except Exception:
            return ""

    @staticmethod
    def is_instantngp_available():
        """Check if Instant-NGP is available (result cached for 5 s)."""
        now = time.monotonic()
        if (InstantNGPHelpers._cache is not None and
                (now - InstantNGPHelpers._cache_time) < InstantNGPHelpers._CACHE_TTL):
            return InstantNGPHelpers._cache
        result = InstantNGPHelpers._is_instantngp_available_uncached()
        InstantNGPHelpers._cache = result
        InstantNGPHelpers._cache_time = now
        return result

    @staticmethod
    def clear_cache() -> None:
        """Force-expire the availability TTL cache.

        Call this after a successful install or after the user sets the manual
        path in preferences so the next UI redraw reflects the new state
        without waiting for the 5-second TTL to expire.
        """
        InstantNGPHelpers._cache = None
        InstantNGPHelpers._cache_time = 0.0

    @staticmethod
    def _is_instantngp_available_uncached():
        """Perform the actual (uncached) Instant-NGP availability check."""
        # Check if instant-ngp executable is in PATH
        if shutil.which('instant-ngp'):
            return True

        # Check the tool_installers managed directory first
        try:
            from . import tool_installers
            if tool_installers.find_instantngp_exe():
                return True
            # Source cloned but not yet built — still counts as "found" so the
            # UI can show the build instructions instead of "Not Installed".
            dest = tool_installers.get_instantngp_dir()
            if (dest / "CMakeLists.txt").exists():
                return True
            # Nearby tool roots (e.g., portable Blender installs)
            for candidate in tool_installers.candidate_tool_paths("instant-ngp"):
                if (candidate / "CMakeLists.txt").exists() or (candidate / "build").exists():
                    return True
        except Exception:
            pass

        # Check user-supplied path from preferences (addon prefs take priority,
        # fall back to the per-scene property which mirrors the same value).
        try:
            prefs_path = InstantNGPHelpers._get_user_configured_path()
            if prefs_path and os.path.isdir(prefs_path):
                exe_name = "instant-ngp.exe" if sys.platform == "win32" else "instant-ngp"
                if (
                    os.path.exists(os.path.join(prefs_path, "build"))
                    or os.path.exists(os.path.join(prefs_path, "CMakeLists.txt"))
                    or os.path.exists(os.path.join(prefs_path, "instant-ngp"))
                    or os.path.exists(os.path.join(prefs_path, exe_name))
                ):
                    return True
        except Exception:
            pass

        # Check for installation in common locations
        possible_paths = [
            os.path.expanduser('~/instant-ngp'),
            os.path.expanduser('~/Projects/instant-ngp'),
            '/opt/instant-ngp',
            'C:/Projects/instant-ngp',
        ]

        for path in possible_paths:
            if os.path.exists(os.path.join(path, 'instant-ngp')):
                return True
            if os.path.exists(os.path.join(path, 'build')):
                return True

        return False
    
    @staticmethod
    def find_instantngp_path():
        """Find the Instant-NGP installation / source directory.

        Search order:
          1. User-set preference path (``fo4_instantngp_path`` scene property).
          2. The ``tools/instant-ngp/`` directory managed by the add-on.
          3. The system PATH (``instant-ngp`` executable).
          4. Common manual install locations.
        """
        # 1. Preference path set by the user (addon prefs take priority over scene prop)
        try:
            prefs_path = InstantNGPHelpers._get_user_configured_path()
            if prefs_path and os.path.isdir(prefs_path):
                return prefs_path
        except Exception:
            pass

        # 2. Tool-installer managed directory
        try:
            from . import tool_installers
            dest = tool_installers.get_instantngp_dir()
            if (dest / "CMakeLists.txt").exists() or tool_installers.find_instantngp_exe(dest):
                return str(dest)
            for candidate in tool_installers.candidate_tool_paths("instant-ngp"):
                if (candidate / "CMakeLists.txt").exists() or (candidate / "build").exists():
                    return str(candidate)
        except Exception:
            pass

        # 3. Check PATH first
        exe_path = shutil.which('instant-ngp')
        if exe_path:
            return os.path.dirname(exe_path)

        # 4. Common manual install locations
        possible_paths = [
            os.path.expanduser('~/instant-ngp'),
            os.path.expanduser('~/Projects/instant-ngp'),
            os.path.expanduser('~/Documents/instant-ngp'),
            '/opt/instant-ngp',
            'C:/Projects/instant-ngp',
            'C:/Users/' + os.environ.get('USERNAME', '') + '/instant-ngp',
        ]

        for path in possible_paths:
            if os.path.exists(os.path.join(path, 'build')):
                return path
            if os.path.exists(os.path.join(path, 'scripts')):
                return path

        return None
    
    @staticmethod
    def check_instantngp_installation():
        """
        Check Instant-NGP installation and return status message.
        Returns: (bool success, str message)
        """
        instantngp_path = InstantNGPHelpers.find_instantngp_path()

        if instantngp_path:
            # Check whether the executable has been built yet
            try:
                from . import tool_installers
                exe = tool_installers.find_instantngp_exe(Path(instantngp_path))
            except Exception:
                exe = None

            if exe:
                msg = f"Instant-NGP ready at: {exe}\n"
            else:
                msg = (
                    f"Instant-NGP source found at: {instantngp_path}\n"
                    "Executable not yet built. To build (NVIDIA GPU + CUDA required):\n"
                    f"  cd \"{instantngp_path}\"\n"
                    "  cmake . -B build\n"
                    "  cmake --build build --config RelWithDebInfo -j\n\n"
                )

            # Check for CUDA
            try:
                import torch
                if torch.cuda.is_available():
                    msg += "CUDA: Available ✓\n"
                    if exe:
                        msg += "Ready for 3D reconstruction!"
                else:
                    msg += "CUDA: Not available\n"
                    msg += "⚠️ Instant-NGP requires an NVIDIA GPU with CUDA"
            except (ImportError, OSError):
                msg += "PyTorch: Not installed (optional — used to check CUDA availability)"

            return bool(exe), msg

        install_msg = (
            "Instant-NGP not found.\n\n"
            "Click 'Auto-Install Instant-NGP' in the panel to clone the\n"
            "source repository automatically (requires git on PATH).\n\n"
            "REQUIREMENTS TO BUILD:\n"
            "  • NVIDIA GPU with CUDA support (RTX recommended)\n"
            "  • CMake 3.21+\n"
            "  • CUDA 11.3+ or 12.x\n\n"
            "MANUAL INSTALL:\n"
            "  git clone --recursive https://github.com/NVlabs/instant-ngp.git\n"
            "  cd instant-ngp\n"
            "  cmake . -B build\n"
            "  cmake --build build --config RelWithDebInfo -j\n\n"
            "Then set the path under 'Instant-NGP Path' in the panel,\n"
            "or place the folder at ~/instant-ngp.\n\n"
            "See: https://github.com/NVlabs/instant-ngp"
        )
        return False, install_msg
    
    @staticmethod
    def reconstruct_from_images(images_dir, output_path, transforms_json=None):
        """
        Reconstruct 3D scene from images using Instant-NGP
        
        Args:
            images_dir: Directory containing input images
            output_path: Path for output mesh
            transforms_json: Path to camera transforms (optional, can be generated)
        
        Returns: (bool success, str message)
        """
        instantngp_path = InstantNGPHelpers.find_instantngp_path()
        
        if not instantngp_path:
            return False, "Instant-NGP not found"
        
        if not os.path.exists(images_dir):
            return False, f"Images directory not found: {images_dir}"
        
        # Check if transforms.json exists or needs to be generated
        if transforms_json is None:
            transforms_json = os.path.join(images_dir, 'transforms.json')
        
        if not os.path.exists(transforms_json):
            # Need to generate transforms from COLMAP or images2nerf.py
            msg = (
                "Camera transforms not found. You need to:\n\n"
                "METHOD 1 - Use images2nerf.py (Recommended):\n"
                f"1. cd {instantngp_path}\n"
                f"2. python scripts/colmap2nerf.py --images {images_dir} \\\n"
                f"     --out {os.path.dirname(transforms_json)}\n\n"
                "METHOD 2 - Use COLMAP directly:\n"
                "1. Install COLMAP: https://colmap.github.io/\n"
                "2. Run COLMAP reconstruction on images\n"
                "3. Convert COLMAP output to NeRF format\n\n"
                "Then run this operator again."
            )
            return False, msg
        
        # Instructions for running Instant-NGP
        msg = (
            "To reconstruct 3D scene with Instant-NGP:\n\n"
            f"1. Navigate to: {instantngp_path}\n"
            "2. Run Instant-NGP:\n"
            f"   ./build/instant-ngp {images_dir}\n\n"
            "3. In the GUI:\n"
            "   - Wait for training to converge\n"
            "   - Export mesh: File → Save Mesh\n"
            f"   - Save to: {output_path}\n\n"
            "4. Import mesh back to Blender:\n"
            "   - File → Import → Wavefront (.obj)\n"
            "   - Or use 'Import Instant-NGP Mesh' operator\n"
        )
        
        return False, msg
    
    @staticmethod
    def import_instantngp_mesh(obj_path):
        """
        Import a mesh reconstructed by Instant-NGP into Blender
        
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
                return True, f"Imported Instant-NGP mesh: {imported_obj.name}", imported_obj
            else:
                return False, "Failed to import mesh", None
        
        except Exception as e:
            return False, f"Import failed: {str(e)}", None
    
    @staticmethod
    def optimize_nerf_mesh_for_fo4(obj):
        """
        Optimize an Instant-NGP NeRF mesh for Fallout 4
        
        Args:
            obj: Blender object
        
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # NeRF meshes often have very high poly counts
        # Apply aggressive decimation
        from . import mesh_helpers
        
        # Check current poly count
        poly_count = len(obj.data.polygons)
        
        if poly_count > 65535:
            # Need to decimate
            decimate_ratio = 65535 / poly_count
            
            # Add decimate modifier
            mod = obj.modifiers.new(name="Decimate_FO4", type='DECIMATE')
            mod.ratio = decimate_ratio * 0.9  # Slightly under limit for safety
            
            # Apply modifier
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=mod.name)
        
        # Apply standard optimization
        success, message = mesh_helpers.MeshHelpers.optimize_mesh(obj)
        
        if not success:
            return False, message
        
        # Validate for FO4
        success, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        
        if success:
            return True, f"NeRF mesh optimized for Fallout 4 (poly count: {len(obj.data.polygons)})"
        else:
            return False, f"Optimization complete but validation found issues: {', '.join(issues)}"
    
    @staticmethod
    def prepare_images_for_nerf(images_dir, output_dir):
        """
        Prepare images for NeRF reconstruction
        
        Args:
            images_dir: Directory with input images
            output_dir: Directory for processed images
        
        Returns: (bool success, str message)
        """
        if not os.path.exists(images_dir):
            return False, f"Images directory not found: {images_dir}"
        
        os.makedirs(output_dir, exist_ok=True)
        
        msg = (
            "Image preparation tips for best NeRF results:\n\n"
            "1. IMAGE REQUIREMENTS:\n"
            "   - 50-200 images recommended\n"
            "   - Good overlap between views\n"
            "   - Cover object from all angles\n"
            "   - Consistent lighting\n\n"
            "2. CAMERA MOVEMENT:\n"
            "   - Orbit around object\n"
            "   - Maintain constant distance\n"
            "   - Avoid motion blur\n"
            "   - Sharp, in-focus images\n\n"
            "3. PROCESSING:\n"
            f"   - Place images in: {images_dir}\n"
            "   - Use COLMAP or instant-ngp scripts to compute camera poses\n"
            "   - Generate transforms.json\n\n"
            "4. RUN INSTANT-NGP:\n"
            "   - Launch with image directory\n"
            "   - Wait for training\n"
            "   - Export mesh when satisfied\n"
        )
        
        return False, msg
    
    @staticmethod
    def create_workflow_guide():
        """
        Create workflow guide for Instant-NGP usage
        
        Returns: str guide text
        """
        guide = """
INSTANT-NGP WORKFLOW FOR 3D RECONSTRUCTION
==========================================

1. CAPTURE IMAGES:
   - Take 50-200 photos of your object/scene
   - Move camera in smooth orbit
   - Maintain consistent distance
   - Ensure good lighting
   - Keep object in focus

2. PREPARE DATASET:
   - Place all images in a directory
   - Images should be JPG or PNG
   - Consistent resolution recommended

3. COMPUTE CAMERA POSES:
   Option A - Using Instant-NGP scripts (Easier):
   cd instant-ngp
   python scripts/colmap2nerf.py --images /path/to/images --out /path/to/output
   
   Option B - Using COLMAP directly:
   - Install COLMAP
   - Run automatic reconstruction
   - Convert to NeRF format

4. RUN INSTANT-NGP:
   cd instant-ngp
   ./build/instant-ngp /path/to/dataset
   
   In the GUI:
   - Training happens automatically
   - Watch loss decrease
   - Adjust visualization settings
   - Rotate view to check quality

5. EXPORT MESH:
   - File → Save Mesh
   - Choose output location
   - Saves as .obj with textures

6. IMPORT TO BLENDER:
   - Use 'Import Instant-NGP Mesh' operator
   - Or: File → Import → Wavefront (.obj)

7. OPTIMIZE FOR FALLOUT 4:
   - Use 'Optimize NeRF Mesh' operator
   - Reduces poly count to FO4 limits
   - Applies standard optimizations

8. FINALIZE:
   - Setup materials
   - Validate mesh
   - Export to FBX/NIF

TIPS FOR SUCCESS:
- More images = better quality (but slower training)
- RTX GPU highly recommended (uses Tensor Cores)
- Training takes 5-30 seconds typically
- NeRF meshes may need heavy decimation for FO4
- Consider baking textures for better performance

COMMON ISSUES:
- Blurry reconstruction: Images out of focus or motion blur
- Holes in mesh: Insufficient image coverage
- Wrong scale: Adjust in Blender after import
- Too many polygons: Use Decimate modifier

See: https://github.com/NVlabs/instant-ngp for full docs
See NVIDIA_RESOURCES.md for more details
"""
        return guide
    
    @staticmethod
    def get_recommended_settings():
        """
        Get recommended settings for NeRF reconstruction
        
        Returns: dict of settings
        """
        return {
            'num_images': 100,           # Good balance
            'image_resolution': 1920,     # 1080p recommended
            'training_steps': 35000,      # Default for good quality
            'mesh_resolution': 512,       # Marching cubes resolution
            'mesh_threshold': 2.5,        # Density threshold
            'aabb_scale': 16,             # Bounding box scale
        }
    
    @staticmethod
    def estimate_training_time(num_images, has_rtx=True):
        """
        Estimate training time for NeRF
        
        Args:
            num_images: Number of input images
            has_rtx: Whether NVIDIA RTX GPU is available
        
        Returns: str time estimate
        """
        if has_rtx:
            # With RTX GPU (Tensor Cores)
            seconds = num_images * 0.2  # Very fast
            return f"~{int(seconds)} seconds (with RTX GPU)"
        else:
            # Without RTX (much slower)
            minutes = num_images * 0.5 / 60
            return f"~{int(minutes)} minutes (without RTX, slower)"

def register():
    """Register Instant-NGP helper functions"""
    pass

def unregister():
    """Unregister Instant-NGP helper functions"""
    pass
