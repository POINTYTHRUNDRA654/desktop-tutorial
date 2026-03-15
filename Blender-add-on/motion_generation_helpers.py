"""
Motion Generation integration for Blender
Supports multiple motion generation systems:
- HY-Motion-1.0: Tencent's motion generation model
- MotionDiffuse: Text-driven human motion with diffusion model (original)
- MotionDiffuse-SMPLX: Extended MotionDiffuse with SMPL-X support (face & hands)
- ComfyUI-MotionDiff: ComfyUI implementation (MDM, MotionGPT, MotionDiffuse, etc.)
- ComfyUI-BlenderAI-node: Complete ComfyUI integration in Blender (AI materials, animation)

https://github.com/Tencent-Hunyuan/HY-Motion-1.0
https://github.com/MotrixLab/MotionDiffuse
https://github.com/ellemcfarlane/MotionDiffuse (SMPL-X extension)
https://github.com/Fannovel16/ComfyUI-MotionDiff
https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node
"""

import bpy
import os
import sys
from pathlib import Path

class MotionGenerationHelpers:
    """Helper functions for motion generation integration"""
    
    @staticmethod
    def check_hymotion_available():
        """Check if HY-Motion-1.0 is installed and available"""
        try:
            import torch
            
            # Check for HY-Motion-1.0 repository
            possible_paths = [
                os.path.expanduser("~/HY-Motion-1.0"),
                os.path.expanduser("~/Projects/HY-Motion-1.0"),
                os.path.join(os.path.dirname(__file__), "HY-Motion-1.0"),
                "C:/HY-Motion-1.0" if sys.platform == "win32" else "/opt/HY-Motion-1.0"
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    return True, f"HY-Motion-1.0 available at {path}"
            
            return False, "HY-Motion-1.0 repository not found"
                
        except ImportError:
            return False, "PyTorch not installed"
        except Exception as e:
            return False, f"Error checking HY-Motion: {str(e)}"
    
    @staticmethod
    def check_motiondiffuse_available():
        """Check if MotionDiffuse is installed and available"""
        try:
            import torch
            
            # Check for both original MotionDiffuse and SMPL-X extension
            possible_paths = [
                # Original MotionDiffuse
                (os.path.expanduser("~/MotionDiffuse"), "original"),
                (os.path.expanduser("~/Projects/MotionDiffuse"), "original"),
                (os.path.join(os.path.dirname(__file__), "MotionDiffuse"), "original"),
                ("C:/MotionDiffuse" if sys.platform == "win32" else "/opt/MotionDiffuse", "original"),
            ]
            
            # Check for SMPL-X extension (ellemcfarlane fork)
            # This might be in a different directory or the same one
            smplx_paths = [
                (os.path.expanduser("~/MotionDiffuse-SMPLX"), "smplx"),
                (os.path.expanduser("~/Projects/MotionDiffuse-SMPLX"), "smplx"),
                (os.path.expanduser("~/ellemcfarlane-MotionDiffuse"), "smplx"),
                (os.path.expanduser("~/Projects/ellemcfarlane-MotionDiffuse"), "smplx"),
            ]
            
            all_paths = possible_paths + smplx_paths
            
            found_versions = []
            for path, version_type in all_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    # Check for text2motion directory
                    text2motion_path = os.path.join(path, "text2motion")
                    if os.path.exists(text2motion_path):
                        found_versions.append((path, version_type))
            
            if found_versions:
                # Prefer SMPL-X version if available
                smplx_versions = [(p, v) for p, v in found_versions if v == "smplx"]
                if smplx_versions:
                    path, _ = smplx_versions[0]
                    return True, f"MotionDiffuse-SMPLX available at {path} (with face & hand support)"
                else:
                    path, _ = found_versions[0]
                    return True, f"MotionDiffuse available at {path}"
            
            return False, "MotionDiffuse repository not found"
                
        except ImportError:
            return False, "PyTorch not installed"
        except Exception as e:
            return False, f"Error checking MotionDiffuse: {str(e)}"
    
    @staticmethod
    def check_comfyui_motiondiff_available():
        """Check if ComfyUI-MotionDiff is installed and available"""
        try:
            import torch
            
            # Check for ComfyUI-MotionDiff repository
            possible_paths = [
                os.path.expanduser("~/ComfyUI-MotionDiff"),
                os.path.expanduser("~/Projects/ComfyUI-MotionDiff"),
                os.path.join(os.path.dirname(__file__), "ComfyUI-MotionDiff"),
                "C:/ComfyUI-MotionDiff" if sys.platform == "win32" else "/opt/ComfyUI-MotionDiff"
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    return True, f"ComfyUI-MotionDiff available at {path}"
            
            return False, "ComfyUI-MotionDiff repository not found"
                
        except ImportError:
            return False, "PyTorch not installed"
        except Exception as e:
            return False, f"Error checking ComfyUI-MotionDiff: {str(e)}"
    
    @staticmethod
    def check_comfyui_blenderai_available():
        """Check if ComfyUI-BlenderAI-node is installed and available"""
        try:
            # Check if the Blender add-on is installed
            # This would be in Blender's addons directory
            import bpy
            
            # Check if ComfyUI-BlenderAI-node add-on is enabled
            addon_name = "ComfyUI-BlenderAI-node"
            if addon_name in bpy.context.preferences.addons:
                return True, "ComfyUI-BlenderAI-node add-on is installed and enabled"
            
            # Check for repository in common locations
            possible_paths = [
                os.path.expanduser("~/ComfyUI-BlenderAI-node"),
                os.path.expanduser("~/Projects/ComfyUI-BlenderAI-node"),
                os.path.join(os.path.dirname(__file__), "ComfyUI-BlenderAI-node"),
                "C:/ComfyUI-BlenderAI-node" if sys.platform == "win32" else "/opt/ComfyUI-BlenderAI-node"
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    return False, f"ComfyUI-BlenderAI-node found at {path} but not installed as Blender add-on"
            
            return False, "ComfyUI-BlenderAI-node not found"
                
        except ImportError:
            return False, "Not running in Blender environment"
        except Exception as e:
            return False, f"Error checking ComfyUI-BlenderAI-node: {str(e)}"
    
    @staticmethod
    def get_installation_instructions():
        """Return installation instructions for motion generation systems"""
        instructions = """
# Motion Generation Installation Instructions

This add-on supports multiple motion generation systems:

================================================================================

## OPTION 1: HY-Motion-1.0 (Tencent)

### Prerequisites:
- git-lfs (Large File Storage)
- PyTorch
- Several GB of disk space

### Installation Steps:

1. **Install git-lfs**:
```bash
# Windows (with Chocolatey)
choco install git-lfs

# macOS
brew install git-lfs

# Linux (Ubuntu/Debian)
sudo apt-get install git-lfs

# Initialize git-lfs
git lfs install
```

2. **Clone HY-Motion-1.0**:
```bash
gh repo clone Tencent-Hunyuan/HY-Motion-1.0
# OR
git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git
cd HY-Motion-1.0
```

3. **Pull model weights**:
```bash
git lfs pull
```

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Restart Blender**

================================================================================

## OPTION 2: MotionDiffuse (Text-Driven Motion)

### Original MotionDiffuse (MotrixLab)

#### Prerequisites:
- PyTorch with CUDA support
- 8GB+ VRAM recommended

#### Installation Steps:

1. **Install PyTorch** (in Blender's Python):
```bash
# Windows
cd "C:\\Program Files\\Blender Foundation\\Blender X.X\\X.X\\python\\bin"
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Linux/macOS
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install torch torchvision
```

2. **Clone MotionDiffuse**:
```bash
gh repo clone MotrixLab/MotionDiffuse
# OR
git clone https://github.com/MotrixLab/MotionDiffuse.git
```

3. **Install dependencies**:
```bash
cd MotionDiffuse
pip install -r requirements.txt
```

4. **Download pre-trained models**:
Follow instructions in MotionDiffuse README to download model checkpoints

5. **Restart Blender**

#### Features:
- Text-to-motion generation
- High-quality human motion synthesis
- Diffusion model-based approach
- HumanML3D dataset (20 fps)

### MotionDiffuse-SMPLX Extension (RECOMMENDED for detailed motion)

This is an extended version with SMPL-X support for face and hand details.

#### Installation Steps:

1. **Install PyTorch** (same as above)

2. **Clone MotionDiffuse-SMPLX**:
```bash
gh repo clone ellemcfarlane/MotionDiffuse
# OR
git clone https://github.com/ellemcfarlane/MotionDiffuse.git
# Rename to avoid confusion
mv MotionDiffuse MotionDiffuse-SMPLX
```

3. **Install dependencies**:
```bash
cd MotionDiffuse-SMPLX
# Follow installation instructions in text2motion/dtu_README.md
pip install -r requirements.txt
```

4. **Download Motion-X dataset** (optional):
Follow instructions in the repository for dataset access

5. **Restart Blender**

#### Additional Features:
- ✨ SMPL-X pose support (face + hands)
- Facial expressions in generated motion
- Fully articulated hand movements
- Better for prompts involving emotion or detailed object interaction
- Based on Motion-X dataset

#### Comparison:
- **Original**: Standard body motion, HumanML3D dataset
- **SMPL-X Extension**: Body + face + hands, Motion-X dataset
- **Recommendation**: Use SMPL-X if you need facial expressions or hand details

================================================================================

## OPTION 4: ComfyUI-BlenderAI-node (Complete Blender Integration)

This is a complete Blender add-on that integrates ComfyUI directly into Blender.
It's the most comprehensive solution for AI-powered workflows in Blender.

### What It Does:
- Converts ComfyUI nodes into Blender nodes
- AI material creation and texture baking
- Camera input as real-time source
- AI animation interpolation (ToonCrafter)
- Style transfer and composition
- Import/replace AI-generated meshes
- ControlNet integration
- Pose characters using Blender bones

### Prerequisites:
- Blender 3.5, 3.6.X, or 4.0+
- ComfyUI installation
- EasyBakeNode add-on (for AI material baking)
- ControlNet models (for material generation)

### Installation Steps:

#### Option A: Install as Blender Add-on (Recommended)

1. **Clone repository**:
```bash
gh repo clone AIGODLIKE/ComfyUI-BlenderAI-node --recursive
# OR
git clone https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node.git --recursive
```

2. **Install in Blender**:
   - Download ZIP or use cloned folder
   - In Blender: Edit > Preferences > Add-ons > Install
   - Select the ComfyUI-BlenderAI-node folder or ZIP
   - Enable "ComfyUI BlenderAI node"

3. **Set ComfyUI path in preferences**:
   - Point to your ComfyUI installation directory
   - Set Python path if using virtual environment

4. **Install EasyBakeNode** (for AI materials):
```bash
gh repo clone AIGODLIKE/EasyBakeNode
```
   - Install as Blender add-on same way

5. **Download ControlNet models** (for AI materials):
   - Get from https://huggingface.co/lllyasviel/ControlNet-v1-1
   - Install comfyui_controlnet_aux: https://github.com/Fannovel16/comfyui_controlnet_aux

6. **Restart Blender**

#### Option B: Manual Installation

```bash
# Windows
cd %USERPROFILE%\AppData\Roaming\Blender Foundation\blender\%version%\scripts\addons
git clone https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node.git --recursive

# Linux
cd ~/.config/blender/**VERSION**/scripts/addons
git clone https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node.git --recursive
```

Then enable in Blender preferences (Node category).

### Features:
- **Node Editor**: ComfyUI nodes as Blender nodes
- **AI Materials**: Generate and bake AI materials
- **Camera Input**: Use Blender camera as input source
- **Animation**: AI animation interpolation and style transfer
- **Live Preview**: Real-time sampling preview
- **Mesh Import**: Import AI-generated 3D models
- **ControlNet**: Full ControlNet integration
- **Batch Processing**: Queue batch processing
- **Presets**: Workflow and node group presets

### Use Cases:
- AI-powered texture generation for game assets
- Real-time AI rendering with camera input
- Animation interpolation and inbetweening
- Style transfer for animations
- ControlNet-based material creation
- Pose-driven character generation

### Integration with Other Systems:
- **+ MotionDiffuse**: Use for motion generation, BlenderAI for materials
- **+ RigNet**: Auto-rig with RigNet, animate with BlenderAI
- **+ MediaPipe**: Track with MediaPipe, enhance with BlenderAI
- **Complete Workflow**: Rig → Animate → Generate Materials → Render

### Restart Blender after installation

================================================================================

## OPTION 5: ComfyUI-MotionDiff (Motion-Specific)

This is a ComfyUI node implementation that includes:
- MotionDiffuse
- MDM (Motion Diffusion Model)
- MotionGPT
- ReMoDiffuse
- 4DHuman (3D pose estimation)

### Prerequisites:
- PyTorch with CUDA support
- OpenGL libraries (Linux: libglfw3-dev, libgles2-mesa-dev, freeglut3-dev)

### Installation Steps:

1. **Install system dependencies** (Linux):
```bash
sudo apt-get install libglfw3-dev libgles2-mesa-dev freeglut3-dev
```

2. **Clone repository**:
```bash
gh repo clone Fannovel16/ComfyUI-MotionDiff
# OR
git clone https://github.com/Fannovel16/ComfyUI-MotionDiff.git
```

3. **Install Python dependencies**:
```bash
cd ComfyUI-MotionDiff
pip install -r requirements.txt
```

4. **Clone controlnet_aux** (required dependency):
```bash
git clone https://github.com/Fannovel16/comfyui_controlnet_aux/
cd comfyui_controlnet_aux
pip install -r requirements.txt
```

5. **Restart Blender**

### Features:
- Multiple motion models in one package
- SMPL mesh generation
- 3D pose estimation
- Export to 3D software (Blender, Unity, Unreal)
- Depth map and OpenPose output

================================================================================

## Comparison:

**HY-Motion-1.0:**
- Pros: Production-ready from Tencent
- Cons: Requires git-lfs, large download
- Best for: Stable motion generation

**MotionDiffuse:**
- Pros: Research-grade quality, diffusion-based
- Cons: May need fine-tuning
- Best for: High-quality human motion
- **SMPL-X variant**: Adds facial expressions and hand articulation

**ComfyUI-BlenderAI-node (Complete Integration):**
- Pros: Full Blender integration, most features, AI materials
- Cons: Complex setup, requires ComfyUI + dependencies
- Best for: Complete AI workflow in Blender

**ComfyUI-MotionDiff:**
- Pros: Multiple models, SMPL support, most features
- Cons: More complex setup
- Best for: Advanced users, multiple workflow needs

**Recommendation:** 
- Simple text-to-motion: MotionDiffuse
- Facial expressions: MotionDiffuse-SMPLX
- Multiple models: ComfyUI-MotionDiff
- **Complete AI workflow: ComfyUI-BlenderAI-node** ⭐ (most comprehensive)

================================================================================

For more details:
- HY-Motion-1.0: https://github.com/Tencent-Hunyuan/HY-Motion-1.0
- MotionDiffuse (Original): https://github.com/MotrixLab/MotionDiffuse
  - Paper: https://arxiv.org/abs/2208.15001
  - Demo: https://huggingface.co/spaces/mingyuan/MotionDiffuse
- MotionDiffuse-SMPLX: https://github.com/ellemcfarlane/MotionDiffuse
  - Extension with face and hand support
  - Based on Motion-X dataset
- ComfyUI-MotionDiff: https://github.com/Fannovel16/ComfyUI-MotionDiff
- ComfyUI-BlenderAI-node: https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node ⭐
  - Complete ComfyUI integration in Blender
  - AI materials, animation, rendering
"""
        return instructions
    
    @staticmethod
    def generate_motion_from_text(prompt, system="auto", duration=5.0, fps=30):
        """
        Generate motion from text using available motion generation system
        
        Args:
            prompt: Text description of motion
            system: "auto", "hymotion", "motiondiffuse", or "comfyui"
            duration: Duration in seconds
            fps: Frames per second
        
        Returns:
            tuple: (success, message, motion_data)
        """
        # Check which systems are available
        if system == "auto":
            # Try systems in order of preference
            md_avail, _ = MotionGenerationHelpers.check_motiondiffuse_available()
            if md_avail:
                system = "motiondiffuse"
            else:
                hy_avail, _ = MotionGenerationHelpers.check_hymotion_available()
                if hy_avail:
                    system = "hymotion"
                else:
                    cf_avail, _ = MotionGenerationHelpers.check_comfyui_motiondiff_available()
                    if cf_avail:
                        system = "comfyui"
                    else:
                        return False, "No motion generation system available. Install one using 'Show Installation Info'", None
        
        # This is a placeholder for actual integration
        return False, f"Motion generation integration in progress for {system}. Use external tools for now.", None

def register():
    """Register motion generation helper functions"""
    pass

def unregister():
    """Unregister motion generation helper functions"""
    pass
