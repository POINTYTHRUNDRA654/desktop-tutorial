"""
RigNet and libigl integration for automatic rigging in Blender

RigNet: Neural Rigging for Articulated Characters
- Primary: https://github.com/govindjoshi12/rignet-gj (Joint Prediction Reimplementation)
- Original: https://github.com/zhan-xu/RigNet

libigl: Simple C++ geometry processing library
- Main Repository: https://github.com/libigl/libigl
- Python Bindings: https://github.com/libigl/libigl-python-bindings
- Includes Bounded Biharmonic Weights (BBW) for skinning
- BBW Reference Implementations:
  - azer89/BBW: https://github.com/azer89/BBW (C++ Visual Studio, libigl-based)
  - PhillipZeratul/BbwPlugin: https://github.com/PhillipZeratul/BbwPlugin (Unity/iOS port)
  - shanmukhabharat/BBW: https://github.com/shanmukhabharat/BBW (Academic/educational)
- Mesh repair, optimization, and UV unwrapping

MediaPipe: Google's framework for ML pipelines
- Repository: https://github.com/ntu-rris/google-mediapipe
- Pose estimation, hand tracking, face detection
- Real-time performance on CPU
- Can provide reference poses for rigging and animation
"""

import bpy
import os
import subprocess
import sys
from pathlib import Path

class RigNetHelpers:
    """Helper functions for RigNet automatic rigging integration"""
    
    @staticmethod
    def check_rignet_available():
        """Check if RigNet is installed and available"""
        try:
            # Try to import RigNet modules
            # This would need RigNet installed in Blender's Python environment
            import torch
            
            # Check for common RigNet installation paths
            # First check for rignet-gj (joint prediction reimplementation)
            # Then check for original RigNet or other variants
            possible_paths = [
                os.path.expanduser("~/rignet-gj"),
                os.path.expanduser("~/Projects/rignet-gj"),
                os.path.expanduser("~/RigNet"),
                os.path.expanduser("~/Projects/RigNet"),
                os.path.join(os.path.dirname(__file__), "rignet-gj"),
                os.path.join(os.path.dirname(__file__), "RigNet"),
                "C:/rignet-gj" if sys.platform == "win32" else "/opt/rignet-gj",
                "C:/RigNet" if sys.platform == "win32" else "/opt/RigNet"
            ]
            
            rignet_path = None
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    rignet_path = path
                    break
            
            if rignet_path:
                # Check for different RigNet variants
                # rignet-gj has utilities/ folder
                # original RigNet has checkpoints/ folder
                utils_path = os.path.join(rignet_path, "utilities")
                checkpoints_path = os.path.join(rignet_path, "checkpoints")
                
                if os.path.exists(utils_path) or os.path.exists(checkpoints_path):
                    return True, rignet_path
                else:
                    return False, "RigNet found but required files not present"
            else:
                return False, "RigNet repository not found in common locations"
                
        except ImportError as e:
            return False, f"PyTorch not installed: {str(e)}"
        except Exception as e:
            return False, f"Error checking RigNet: {str(e)}"
    
    @staticmethod
    def check_libigl_available():
        """Check if libigl Python bindings are installed and available"""
        try:
            # Try to import libigl Python bindings
            import igl
            
            # Check for libigl-python-bindings repository
            possible_paths = [
                os.path.expanduser("~/libigl-python-bindings"),
                os.path.expanduser("~/Projects/libigl-python-bindings"),
                os.path.expanduser("~/libigl"),
                os.path.expanduser("~/Projects/libigl"),
                os.path.join(os.path.dirname(__file__), "libigl-python-bindings"),
                os.path.join(os.path.dirname(__file__), "libigl"),
                "C:/libigl-python-bindings" if sys.platform == "win32" else "/opt/libigl-python-bindings",
                "C:/libigl" if sys.platform == "win32" else "/opt/libigl"
            ]
            
            libigl_path = None
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    libigl_path = path
                    break
            
            # If Python bindings are available, that's sufficient
            if libigl_path:
                return True, f"libigl Python bindings available at {libigl_path}"
            else:
                return True, "libigl Python bindings available (installed via pip)"
                
        except ImportError:
            # Check if repository exists even without Python bindings installed
            possible_paths = [
                os.path.expanduser("~/libigl-python-bindings"),
                os.path.expanduser("~/Projects/libigl-python-bindings"),
                os.path.expanduser("~/libigl"),
                os.path.expanduser("~/Projects/libigl"),
                "C:/libigl-python-bindings" if sys.platform == "win32" else "/opt/libigl-python-bindings",
                "C:/libigl" if sys.platform == "win32" else "/opt/libigl"
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    return False, f"libigl repository found at {path} but Python bindings not built/installed"
            
            return False, "libigl not found. Install with: pip install libigl OR gh repo clone libigl/libigl-python-bindings"
        except Exception as e:
            return False, f"Error checking libigl: {str(e)}"
    
    @staticmethod
    def check_mediapipe_available():
        """Check if MediaPipe is installed and available"""
        try:
            # Try to import mediapipe
            import mediapipe as mp
            
            # Check for ntu-rris/google-mediapipe repository (optional, for demos)
            possible_paths = [
                os.path.expanduser("~/google-mediapipe"),
                os.path.expanduser("~/Projects/google-mediapipe"),
                os.path.join(os.path.dirname(__file__), "google-mediapipe"),
                "C:/google-mediapipe" if sys.platform == "win32" else "/opt/google-mediapipe"
            ]
            
            repo_path = None
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    repo_path = path
                    break
            
            if repo_path:
                return True, f"MediaPipe available with demo repo at {repo_path}"
            else:
                return True, "MediaPipe available (installed via pip)"
                
        except ImportError:
            # Check if demo repository exists even without mediapipe installed
            possible_paths = [
                os.path.expanduser("~/google-mediapipe"),
                os.path.expanduser("~/Projects/google-mediapipe"),
                "C:/google-mediapipe" if sys.platform == "win32" else "/opt/google-mediapipe"
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    return False, f"MediaPipe demo repo found at {path} but mediapipe not installed"
            
            return False, "MediaPipe not found. Install with: pip install mediapipe"
        except Exception as e:
            return False, f"Error checking MediaPipe: {str(e)}"
    
    @staticmethod
    def get_installation_instructions():
        """Return installation instructions for RigNet and libigl"""
        instructions = """
# Auto-Rigging Installation Instructions

This add-on supports multiple auto-rigging solutions:
1. RigNet - AI-powered joint prediction and rigging
2. libigl - Geometry processing library with BBW skinning

================================================================================

## OPTION 1: RigNet (AI-Powered Rigging)

### RECOMMENDED: Joint Prediction Reimplementation (rignet-gj)

#### Prerequisites:
1. PyTorch with CUDA support
2. rignet-gj repository (WIP implementation with detailed notebooks)

#### Step 1: Install PyTorch (in Blender's Python)
# Windows:
cd "C:\\Program Files\\Blender Foundation\\Blender X.X\\X.X\\python\\bin"
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Linux/macOS:
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install torch torchvision

#### Step 2: Clone rignet-gj repository
# Using GitHub CLI (recommended):
gh repo clone govindjoshi12/rignet-gj

# Or using git:
git clone https://github.com/govindjoshi12/rignet-gj.git

# Recommended location: ~/rignet-gj or ~/Projects/rignet-gj

#### Step 3: Install dependencies
cd rignet-gj
pip install numpy scipy matplotlib tensorboard trimesh open3d jupyter

# Install PyTorch Geometric
pip install torch-geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster

#### Step 4: Get dataset (optional, for training)
# Contact the RigNet authors or gvj84@tamu.edu for ModelResource_RigNetv1_preprocessed.zip
# If only using pre-trained models, this step is optional

#### Step 5: Restart Blender

================================================================================

## OPTION 2: Original RigNet (Full Pipeline)

#### Step 1-2: Same as above (PyTorch installation)

#### Step 3: Clone original RigNet
# Using GitHub CLI:
gh repo clone zhan-xu/RigNet

# Or using git:
git clone https://github.com/zhan-xu/RigNet.git

#### Step 4: Install RigNet dependencies
cd RigNet
pip install numpy scipy matplotlib tensorboard open3d==0.9.0 opencv-python "rtree>=0.8,<0.9" trimesh
pip install torch-geometric==1.7.2
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-1.12.0+cu113.html

#### Step 5: Download pre-trained models
# Download from: https://drive.google.com/file/d/1gM2Lerk7a2R0g9DwlK3IvCfp8c2aFVXs/view?usp=sharing
# Extract checkpoints folder to RigNet/checkpoints/

#### Step 6: Restart Blender

================================================================================

## OPTION 3: libigl (Geometry Processing & BBW Skinning)

libigl is a C++ geometry processing library with Python bindings.
It provides Bounded Biharmonic Weights (BBW) for automatic skinning.

### METHOD 1: Install Python bindings via pip (EASIEST)
pip install libigl

### METHOD 2: Clone and build Python bindings repository (RECOMMENDED)
# Using GitHub CLI:
gh repo clone libigl/libigl-python-bindings

# Or using git:
git clone --recursive https://github.com/libigl/libigl-python-bindings.git

# Build and install (requires CMake and C++ compiler):
cd libigl-python-bindings
pip install .

# Or for development:
pip install -e .

### METHOD 3: Clone main repository (for C++ development)
# Using GitHub CLI:
gh repo clone libigl/libigl

# Or using git:
git clone https://github.com/libigl/libigl.git

# Then build Python bindings manually:
cd libigl/python
pip install -e .

### METHOD 4: BBW Reference Implementations (for developers/learning)

**Option A: azer89/BBW (C++ Visual Studio)**
# Using GitHub CLI:
gh repo clone azer89/BBW

# Or using git:
git clone https://github.com/azer89/BBW.git

**Note:** Visual Studio C++ project demonstrating BBW shape deformation.
- Uses libigl (early 2014 version)
- Requires: Tetgen, MOSEK 7.1, Eigen 3.2
- Windows-focused Visual Studio project
- Reference implementation for understanding BBW algorithm

**Option B: PhillipZeratul/BbwPlugin (Unity/iOS)**
# Using GitHub CLI:
gh repo clone PhillipZeratul/BbwPlugin

# Or using git:
git clone https://github.com/PhillipZeratul/BbwPlugin.git

**Note:** Unity Anima2D BBW bone weight calculation port for iOS.
- C++ implementation that works on iOS
- Originally from Unity Anima2D plugin
- 2D skeleton animation weight calculation
- Cross-platform (including mobile)
- Practical implementation for game engines

**Option C: shanmukhabharat/BBW (Academic/Learning)**
# Using GitHub CLI:
gh repo clone shanmukhabharat/BBW

# Or using git:
git clone https://github.com/shanmukhabharat/BBW.git

**Note:** Academic implementation of linear blend skinning with BBW.
- Educational/homework project
- Demonstrates BBW fundamentals
- Linear blend skinning implementation
- Good for understanding core concepts
- Simpler than production implementations

**All three are excellent learning resources** but not directly usable in Blender.
For Blender integration, use METHOD 1 or METHOD 2 (Python bindings).

### Features:
- Bounded Biharmonic Weights (BBW) for skinning
- Mesh repair and optimization  
- UV unwrapping and parameterization
- Geodesic distance computation
- Mesh decimation and remeshing
- Fast and efficient C++ implementation with Python interface

### Restart Blender after installation

================================================================================

## OPTION 4: MediaPipe (Pose Estimation & Tracking)

MediaPipe is Google's framework for building ML pipelines including pose estimation,
hand tracking, face detection, and more. It's very useful for:
- Reference pose generation for rigging
- Motion capture from images/video
- Hand and face tracking for animation
- Real-time performance on CPU

### METHOD 1: Install MediaPipe via pip (EASIEST)
```bash
pip install mediapipe
```

### METHOD 2: Clone demo repository with examples (RECOMMENDED)
```bash
# Using GitHub CLI:
gh repo clone ntu-rris/google-mediapipe

# Or using git:
git clone https://github.com/ntu-rris/google-mediapipe.git

# Install dependencies:
cd google-mediapipe
conda env create -f environment.yaml
# OR
pip install mediapipe opencv-python numpy
```

### Features:
- **Pose Estimation**: 33 3D landmarks for whole body
- **Hand Tracking**: 21 3D landmarks per hand, supports multiple hands
- **Face Mesh**: 468/478 3D face landmarks
- **Holistic**: Face + Hands + Body (543 total landmarks)
- **Real-time**: Runs at 10-30 FPS on CPU
- **3D World Coordinates**: True 3D positions, not just 2D

### Use Cases in Blender:
1. **Reference Poses**: Extract poses from images/video for manual rigging
2. **Motion Capture**: Convert video to animation data
3. **Retargeting**: Map MediaPipe skeleton to Blender armature
4. **Hand Animation**: Detailed finger tracking for character animation
5. **Facial Animation**: Face mesh for facial expressions

### Integration with Other Tools:
- **+ RigNet**: Use MediaPipe pose as reference for skeleton prediction
- **+ MotionDiffuse**: Use MediaPipe data to guide motion generation
- **+ libigl**: Use MediaPipe skeleton for BBW skinning input

### Demo Capabilities (from ntu-rris repo):
- Single image pose estimation
- Real-time video tracking
- Gesture recognition
- Hand ROM measurement
- 3D skeleton visualization
- Face masking and segmentation

### Restart Blender after installation

================================================================================

## OPTION 5: Use Existing Blender Add-ons (Easiest)

For immediate use without manual integration:
- **brignet**: https://github.com/pKrime/brignet (Recommended for RigNet)
- **Rignet_blender_addon**: https://github.com/L-Medici/Rignet_blender_addon

================================================================================

## Comparison:

**RigNet (AI):**
- Pros: Full automatic rigging, predicts skeleton
- Cons: Requires GPU, complex setup, 1K-5K vertex limit
- Best for: Humanoid/animal characters

**libigl (BBW):**
- Pros: Fast, reliable skinning weights, no vertex limit
- Cons: Requires pre-defined skeleton
- Best for: Adding skinning to existing armatures

**Recommendation:** Use RigNet for full auto-rigging, libigl for skinning

================================================================================

For more details:
- rignet-gj: https://github.com/govindjoshi12/rignet-gj (Joint prediction focus, WIP)
- Original RigNet: https://github.com/zhan-xu/RigNet (Complete pipeline)
- libigl Python bindings: https://github.com/libigl/libigl-python-bindings (Recommended)
- libigl main: https://github.com/libigl/libigl (C++ library)
- libigl docs: https://libigl.github.io/ (Geometry processing documentation)
- azer89/BBW: https://github.com/azer89/BBW (C++ BBW reference implementation)
- PhillipZeratul/BbwPlugin: https://github.com/PhillipZeratul/BbwPlugin (Unity/iOS BBW)
- shanmukhabharat/BBW: https://github.com/shanmukhabharat/BBW (Academic BBW implementation)
- MediaPipe: https://google.github.io/mediapipe/ (Official documentation)
- ntu-rris MediaPipe: https://github.com/ntu-rris/google-mediapipe (Pose estimation demos)
- BlendArMocap: https://github.com/cgtinker/BlendArMocap (Blender mocap add-on)
- BlendArMocap docs: https://cgtinker.github.io/BlendArMocap/ (Documentation)
- RigNet Paper: https://doi.org/10.1145/3386569.3392379
"""
        return instructions
    
    @staticmethod
    def auto_rig_mesh(mesh_obj, simplify_mesh=True, target_vertices=2000):
        """
        Automatically rig a mesh using RigNet.

        Steps:
          1. Optionally simplify the mesh to RigNet's recommended vertex range.
          2. Export the (simplified) mesh to a temporary OBJ file.
          3. Run RigNet inference via subprocess.
          4. Parse the generated *_rig.txt output and build an Armature.
          5. Apply automatic skinning weights.

        Args:
            mesh_obj: Blender mesh object to rig
            simplify_mesh: Whether to simplify mesh before rigging (recommended)
            target_vertices: Target vertex count for simplification (1000-5000)

        Returns:
            tuple: (success, message, armature_obj)
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh", None

        available, rignet_path = RigNetHelpers.check_rignet_available()
        if not available:
            return False, f"RigNet not available: {rignet_path}", None

        try:
            import tempfile

            # --- 1. Optionally simplify ---
            work_mesh = mesh_obj
            if simplify_mesh:
                ok, msg, work_mesh = RigNetHelpers.prepare_mesh_for_rignet(
                    mesh_obj, target_vertex_count=target_vertices
                )
                if not ok:
                    return False, f"Mesh preparation failed: {msg}", None

            # --- 2. Export to OBJ ---
            tmp_dir = tempfile.mkdtemp(prefix="rignet_")
            obj_path = os.path.join(tmp_dir, f"{mesh_obj.name}.obj")
            ok, msg, obj_path = RigNetHelpers.export_for_rignet(work_mesh, obj_path)
            if not ok:
                return False, f"OBJ export failed: {msg}", None

            # --- 3. Run RigNet inference ---
            # Identify the entry-point script (varies between forks)
            for script_name in ("predict.py", "infer.py", "run_rignet.py", "inference.py"):
                if os.path.exists(os.path.join(rignet_path, script_name)):
                    break
            else:
                return False, "RigNet inference script not found (tried predict.py / infer.py).", None

            cmd = [
                sys.executable, script_name,
                "--input", obj_path,
                "--output", tmp_dir,
            ]
            result = subprocess.run(
                cmd, cwd=rignet_path,
                capture_output=True, text=True, timeout=600
            )
            if result.returncode != 0:
                return False, f"RigNet inference failed:\n{result.stderr}", None

            # --- 4. Find and parse the rig file ---
            rig_candidates = [
                f for f in os.listdir(tmp_dir) if f.endswith("_rig.txt")
            ]
            if not rig_candidates:
                return False, f"RigNet finished but no *_rig.txt file found in {tmp_dir}", None

            rig_file = os.path.join(tmp_dir, rig_candidates[0])
            ok, msg, armature_obj = RigNetHelpers.import_rignet_result(rig_file, mesh_obj)
            if not ok:
                return False, f"Rig import failed: {msg}", None

            # --- 5. Auto-skin ---
            bpy.ops.object.select_all(action='DESELECT')
            mesh_obj.select_set(True)
            armature_obj.select_set(True)
            bpy.context.view_layer.objects.active = armature_obj
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')

            return True, f"Auto-rigged successfully. Armature: '{armature_obj.name}'", armature_obj

        except subprocess.TimeoutExpired:
            return False, "RigNet inference timed out (10 min).", None
        except Exception as e:
            return False, f"Error during auto-rigging: {str(e)}", None
    
    @staticmethod
    def prepare_mesh_for_rignet(mesh_obj, target_vertex_count=3000):
        """
        Prepare a mesh for RigNet processing
        RigNet works best with meshes between 1K-5K vertices
        
        Args:
            mesh_obj: Blender mesh object
            target_vertex_count: Target vertex count (1000-5000)
        
        Returns:
            tuple: (success, message, simplified_mesh)
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh", None
        
        # Get current vertex count
        current_vertices = len(mesh_obj.data.vertices)
        
        # Duplicate mesh for processing
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        bpy.ops.object.duplicate()
        simplified_mesh = bpy.context.active_object
        simplified_mesh.name = f"{mesh_obj.name}_rignet_ready"
        
        try:
            # Apply scale
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            
            # Determine if we need to subdivide or decimate
            if current_vertices < 1000:
                # Subdivide if too few vertices
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                
                # Calculate subdivision levels needed
                target_subdivisions = 1
                estimated_vertices = current_vertices * 4
                while estimated_vertices < target_vertex_count:
                    target_subdivisions += 1
                    estimated_vertices *= 4
                
                for _ in range(min(target_subdivisions, 2)):
                    bpy.ops.mesh.subdivide()
                
                bpy.ops.object.mode_set(mode='OBJECT')
                
            elif current_vertices > 5000:
                # Decimate if too many vertices
                decimate_mod = simplified_mesh.modifiers.new(name="Decimate", type='DECIMATE')
                decimate_mod.ratio = target_vertex_count / current_vertices
                decimate_mod.decimate_type = 'COLLAPSE'
                
                # Apply modifier
                bpy.ops.object.modifier_apply(modifier=decimate_mod.name)
            
            final_vertices = len(simplified_mesh.data.vertices)
            return True, f"Mesh prepared: {final_vertices} vertices (optimal: 1K-5K)", simplified_mesh
            
        except Exception as e:
            # Clean up on error
            bpy.data.objects.remove(simplified_mesh, do_unlink=True)
            return False, f"Error preparing mesh: {str(e)}", None
    
    @staticmethod
    def export_for_rignet(mesh_obj, output_path=None):
        """
        Export mesh in format suitable for RigNet processing
        
        Args:
            mesh_obj: Blender mesh object
            output_path: Path to save OBJ file (optional)
        
        Returns:
            tuple: (success, message, file_path)
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh", None
        
        try:
            # Generate output path if not provided
            if output_path is None:
                import tempfile
                temp_dir = tempfile.gettempdir()
                output_path = os.path.join(temp_dir, f"{mesh_obj.name}_rignet.obj")
            
            # Select only this mesh
            bpy.ops.object.select_all(action='DESELECT')
            mesh_obj.select_set(True)
            bpy.context.view_layer.objects.active = mesh_obj
            
            # Export as OBJ
            bpy.ops.wm.obj_export(
                filepath=output_path,
                export_selected_objects=True,
                apply_modifiers=True,
                export_materials=False,
                export_normals=True,
                export_uv=True,
                export_triangulated_mesh=False
            )
            
            return True, f"Exported to {output_path}", output_path
            
        except Exception as e:
            return False, f"Error exporting mesh: {str(e)}", None
    
    @staticmethod
    def import_rignet_result(rig_file_path, mesh_obj):
        """
        Parse a RigNet *_rig.txt output file and create a matching Blender Armature.

        The RigNet rig-file format is::

            joints
            <joint_name> <x> <y> <z>
            ...
            hier
            <parent_name> <child_name>
            ...
            skin
            <vertex_idx> <joint_name1> <weight1> [<joint_name2> <weight2> ...]
            ...

        Args:
            rig_file_path: Path to the RigNet output *_rig.txt file
            mesh_obj: Target mesh object (used for positioning the armature)

        Returns:
            tuple: (success, message, armature_obj)
        """
        if not os.path.exists(rig_file_path):
            return False, f"Rig file not found: {rig_file_path}", None

        try:
            # ---- Parse the rig file ----
            joints = {}       # name -> (x, y, z)
            hierarchy = []    # [(parent, child), ...]
            skin = {}         # vertex_idx -> [(joint_name, weight), ...]

            section = None
            with open(rig_file_path, 'r') as fh:
                for raw_line in fh:
                    line = raw_line.strip()
                    if not line:
                        continue
                    if line == 'joints':
                        section = 'joints'
                        continue
                    if line == 'hier':
                        section = 'hier'
                        continue
                    if line == 'skin':
                        section = 'skin'
                        continue

                    parts = line.split()
                    if section == 'joints':
                        # <name> <x> <y> <z>
                        name = parts[0]
                        x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                        joints[name] = (x, y, z)
                    elif section == 'hier':
                        # <parent> <child>
                        hierarchy.append((parts[0], parts[1]))
                    elif section == 'skin':
                        # <vertex_idx> <joint> <weight> [<joint> <weight> ...]
                        vidx = int(parts[0])
                        weights = []
                        for i in range(1, len(parts), 2):
                            weights.append((parts[i], float(parts[i + 1])))
                        skin[vidx] = weights

            if not joints:
                return False, "No joints found in rig file", None

            # ---- Build the Armature ----
            arm_data = bpy.data.armatures.new(name=f"{mesh_obj.name}_Rig")
            arm_obj = bpy.data.objects.new(name=f"{mesh_obj.name}_Rig", object_data=arm_data)
            bpy.context.collection.objects.link(arm_obj)
            # Position armature at mesh origin
            arm_obj.location = mesh_obj.location

            bpy.context.view_layer.objects.active = arm_obj
            bpy.ops.object.mode_set(mode='EDIT')

            edit_bones = {}
            # Create all bones first
            for jname, (x, y, z) in joints.items():
                bone = arm_data.edit_bones.new(name=jname)
                bone.head = (x, y, z)
                # Default tail: slightly above the head (will be corrected by hierarchy)
                bone.tail = (x, y + 0.05, z)
                edit_bones[jname] = bone

            # Wire up parent–child relationships and adjust tails
            children_map = {c: p for p, c in hierarchy}
            for child_name, parent_name in children_map.items():
                if child_name in edit_bones and parent_name in edit_bones:
                    edit_bones[child_name].parent = edit_bones[parent_name]
                    # Point parent tail toward this child
                    edit_bones[parent_name].tail = edit_bones[child_name].head

            bpy.ops.object.mode_set(mode='OBJECT')

            # ---- Apply skinning weights ----
            if skin and mesh_obj.type == 'MESH':
                # Create vertex groups for each joint
                for jname in joints:
                    if jname not in mesh_obj.vertex_groups:
                        mesh_obj.vertex_groups.new(name=jname)

                for vidx, weights in skin.items():
                    for jname, weight in weights:
                        vg = mesh_obj.vertex_groups.get(jname)
                        if vg:
                            vg.add([vidx], weight, 'REPLACE')

                # Parent mesh to armature (preserve existing weights)
                bpy.ops.object.select_all(action='DESELECT')
                mesh_obj.select_set(True)
                arm_obj.select_set(True)
                bpy.context.view_layer.objects.active = arm_obj
                bpy.ops.object.parent_set(type='ARMATURE')

            return True, f"Armature '{arm_obj.name}' created with {len(joints)} bones.", arm_obj

        except Exception as e:
            return False, f"Error importing RigNet result: {str(e)}", None
    
    @staticmethod
    def compute_bbw_skinning(mesh_obj, armature_obj):
        """
        Compute skinning weights using libigl's Bounded Biharmonic Weights (BBW).

        BBW produces smooth, volume-preserving skinning weights by solving a
        biharmonic PDE with boundary conditions at each bone handle.

        Requires:
          - libigl Python bindings: ``pip install libigl``
          - numpy

        Args:
            mesh_obj: Blender mesh object
            armature_obj: Blender armature object

        Returns:
            tuple: (success, message)
        """
        available, msg = RigNetHelpers.check_libigl_available()
        if not available:
            return False, f"libigl not available: {msg}"

        if mesh_obj.type != 'MESH':
            return False, "mesh_obj must be a MESH object"
        if armature_obj.type != 'ARMATURE':
            return False, "armature_obj must be an ARMATURE object"

        try:
            import igl
            import numpy as np

            mesh = mesh_obj.data
            # --- Extract vertices and triangulated faces ---
            verts = np.array([v.co[:] for v in mesh.vertices], dtype=np.float64)

            # Triangulate faces (quads and n-gons → triangles)
            tris = []
            for poly in mesh.polygons:
                vlist = list(poly.vertices)
                for i in range(1, len(vlist) - 1):
                    tris.append([vlist[0], vlist[i], vlist[i + 1]])
            faces = np.array(tris, dtype=np.int32)

            if faces.shape[0] == 0:
                return False, "Mesh has no triangulatable faces"

            # --- Collect bone handle points (head & tail of each bone) ---
            handles = []
            bone_names = []
            for bone in armature_obj.pose.bones:
                h = bone.head  # PoseBone.head is in armature local space
                t = bone.tail
                # Transform from armature local → world → mesh local
                arm_mat = armature_obj.matrix_world
                mesh_mat_inv = mesh_obj.matrix_world.inverted()
                transform = mesh_mat_inv @ arm_mat

                h_local = transform @ h.to_4d()
                t_local = transform @ t.to_4d()
                handles.append(h_local[:3])
                handles.append(t_local[:3])
                bone_names.append(bone.name + "_head")
                bone_names.append(bone.name + "_tail")

            if not handles:
                return False, "Armature has no bones"

            handle_pts = np.array(handles, dtype=np.float64)

            # --- Compute BBW ---
            # igl.bbw expects: V (n×3), F (m×3), b (k,) boundary vertex indices, bc (k×p) boundary conditions
            # We snap each handle to the nearest mesh vertex to form boundary conditions.
            from scipy.spatial import cKDTree
            tree = cKDTree(verts)
            _, boundary_indices = tree.query(handle_pts)
            boundary_indices = np.unique(boundary_indices)

            num_handles = len(boundary_indices)
            bc = np.eye(num_handles, dtype=np.float64)

            weights, success_flag = igl.bbw(verts, faces, boundary_indices, bc)

            if success_flag != 0:
                return False, f"igl.bbw solver returned non-zero flag: {success_flag}"

            # --- Apply computed weights to vertex groups ---
            # igl.bbw returns weights for *all* vertices (rows = vertices, cols = handles).
            # Use REPLACE mode so each vertex gets exactly its BBW weight.
            for vi in range(len(verts)):
                for j in range(weights.shape[1]):
                    bone_idx = j // 2
                    if bone_idx >= len(armature_obj.pose.bones):
                        continue
                    bone_name = armature_obj.pose.bones[bone_idx].name
                    vg = mesh_obj.vertex_groups.get(bone_name)
                    if vg is None:
                        vg = mesh_obj.vertex_groups.new(name=bone_name)
                    w = float(weights[vi, j])
                    if w > 1e-6:
                        vg.add([vi], w, 'REPLACE')

            return True, f"BBW skinning applied: {weights.shape[1]} bone handles, {len(verts)} vertices"

        except ImportError as e:
            return False, f"Required package not installed: {e}. Install with: pip install libigl scipy"
        except Exception as e:
            return False, f"Error computing BBW skinning: {str(e)}"

def register():
    """Register RigNet helper functions"""
    pass

def unregister():
    """Unregister RigNet helper functions"""
    pass
