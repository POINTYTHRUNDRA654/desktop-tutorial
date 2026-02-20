# Fallout 4 Mod Creation Add-on for Blender

**A comprehensive, user-friendly, and highly automated Blender add-on for creating Fallout 4 mods with desktop tutorial integration.**

**✅ Compatible with Blender 2.80 through 4.5.5+** (All modern versions!)

## 🆕 What's New - Enhanced Features!

This add-on has been significantly enhanced to be more:
- **Comprehensive**: Complete workflows for weapons, armor, and props
- **Advanced**: 70+ operators including AI/ML integrations
- **User-Friendly**: Smart presets, batch processing, and automation tools
- **Automated**: One-click preparation, auto-fixing, and smart material setup

### Key New Features:
- ✅ **Batch Processing**: Process multiple meshes at once
- ✅ **Smart Presets**: Quick-start templates for weapons, armor, and props
- ✅ **One-Click Automation**: Quick prepare for export, auto-fix issues
- ✅ **Collision Mesh Generation**: Automatic collision mesh creation
- ✅ **Smart Material Setup**: Auto-detect and load textures
- ✅ **Enhanced Tutorials**: 7 comprehensive tutorials including complete workflows
- ✅ **Desktop Tutorial Integration**: Seamless communication with tutorial app

See [NEW_FEATURES.md](NEW_FEATURES.md) for detailed information about all enhancements!

---

## Features Overview

### Desktop Tutorial Integration

- **Connection Management**: Connect and disconnect from your desktop tutorial app
- **Tutorial Controls**: Navigate through tutorial steps directly from Blender
- **Step Tracking**: Mark tutorial steps as complete and track progress
- **Event System**: Send events from Blender to the tutorial application
- **Configurable Settings**: Set custom host and port for your tutorial app
- **UI Panel**: Easy-to-use sidebar panel in Blender's 3D viewport

## Installation

> **Note:** The repository directory name (`Blender-add-on.`) is not a valid Python
> identifier, so you **must** install via a properly packaged zip — not by pointing
> Blender at the raw `__init__.py` file from a GitHub download.

### Recommended: prebuilt zip

1. Download **`fallout4_tutorial_helper-v2.1.2.zip`** from the repository (or the
   GitHub Releases page).
2. In Blender go to `Edit > Preferences > Add-ons` and click `Install...`.
3. Select the downloaded zip and click `Install Add-on`.
4. Enable the add-on by checking the checkbox next to **"Fallout 4 Tutorial Helper"**.
5. For Fallout 4 NIF export, install the Blender Niftools add-on (see
   [NIFTOOLS_SETUP.md](NIFTOOLS_SETUP.md) and [TOOLS_SETUP.md](TOOLS_SETUP.md) for
   automated and manual steps).

### Alternative: build the zip yourself

Clone or download this repository, then from the repository root run:
```
python makezip.py
```
This creates `fallout4_tutorial_helper-v<version>.zip` with the add-on files inside a
`fallout4_tutorial_helper/` folder (a valid Python package name). Install that zip as
described above.

## Configuration

1. After installing, click on the add-on name to expand preferences
2. Configure the following settings:
   - **Server Host**: The hostname/IP of your desktop tutorial app (default: localhost)
   - **Server Port**: The port number your tutorial app listens on (default: 8080)
   - **Auto Connect**: Enable to automatically connect on Blender startup

## Usage

### Accessing the Panel

1. In the 3D Viewport, press `N` to show the sidebar
2. Click on the `Tutorial` tab
3. The "Desktop Tutorial" panel will appear

### Connecting to Tutorial App

1. Make sure your desktop tutorial application is running
2. Click the `Connect to Tutorial App` button
3. The connection status will update to show "✓ Connected"

### Tutorial Controls

Once connected, you can:

- **Next Tutorial Step**: Request the next step in the tutorial sequence
- **Mark Step Complete**: Mark the current step as complete
- **Current Step Info**: View the current step number and description

### Disconnecting

- Click the `Disconnect from Tutorial App` button when you're done

## Integration with Desktop Tutorial App

This add-on expects to communicate with a desktop tutorial application via a simple protocol. The tutorial app should:

1. Listen on a configurable host and port (default: localhost:8080)
2. Accept JSON-formatted messages for events
3. Provide tutorial step information
4. Track completion status

### Example Event Format

```json
{
  "type": "action_completed",
  "data": "user_action_description",
  "timestamp": 1
}
```

## Development

### File Structure

```
Blender-add-on/
├── __init__.py          # Main add-on file
└── README.md            # This file
```

### Key Components

- **TutorialAddonPreferences**: Add-on preferences panel
- **TUTORIAL_OT_connect**: Operator to connect to tutorial app
- **TUTORIAL_OT_disconnect**: Operator to disconnect
- **TUTORIAL_OT_send_event**: Send custom events to tutorial app
- **TUTORIAL_OT_request_next_step**: Request next tutorial step
- **TUTORIAL_OT_mark_complete**: Mark current step as complete
- **TUTORIAL_PT_main_panel**: Main UI panel in 3D viewport

## Requirements

- Blender 2.80 or higher
- Python 3.x (included with Blender)
- Desktop tutorial application running on accessible host/port

## Troubleshooting

### Add-on won't enable
- Make sure you're using Blender 2.80 or higher
- Check the Blender console for error messages

### Cannot connect to tutorial app
- Verify the tutorial app is running
- Check the host and port settings in add-on preferences
- Ensure no firewall is blocking the connection

### Panel not visible
- Press `N` in the 3D Viewport to show the sidebar
- Look for the "Tutorial" tab

## License

[Add your license information here]

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## Support

For issues or questions, please open an issue on the GitHub repository.
# Blender Fallout 4 Tutorial Add-on

A comprehensive Blender add-on that provides a desktop tutorial system and helper tools for creating Fallout 4 mods. This add-on guides you through every step of the mod creation process, from mesh creation to final export.

**⚠️ Important:** This add-on is designed for **Fallout 4 modding with Havok physics**. It is **not compatible with NVIDIA PhysX**. See [COMPATIBILITY.md](COMPATIBILITY.md) for details.

## Features

### 🎓 Tutorial System
- Interactive step-by-step tutorials for:
  - Basic mesh creation
  - Texture setup
  - Animation workflow
- Real-time guidance and tips
- Progress tracking

### 🔔 Error Notification System
- Real-time error detection
- Automatic validation checks
- Clear, actionable warnings
- Helps you avoid common mistakes

### 🎨 Mesh Creation Helpers
- Create FO4-optimized base meshes
- Automatic mesh optimization
- Poly count validation
- UV mapping checks
- Collision mesh generation (basic geometry for Havok physics)

### 🖼️ Image to Mesh Conversion
- Convert images to 3D meshes using height maps
- **NEW**: AI-powered depth estimation with ZoeDepth (optional)
- Support for common image formats (PNG, JPG, BMP, TIFF, TGA)
- Adjustable displacement strength and mesh resolution
- Apply displacement maps to existing meshes
- Uses free resources: PIL/Pillow and NumPy

### 🤖 AI-Powered Generation (Optional)
- **NEW**: Generate 3D meshes from text descriptions using AI
- **NEW**: Create full 3D models from 2D images (not just height maps)
- Powered by Tencent's Hunyuan3D-2 model
- Completely optional - add-on works perfectly without it
- Requires: GPU, PyTorch, and Hunyuan3D-2 installation
- See installation guide for setup instructions

### 🎬 Motion Generation (Optional)
- **NEW**: Generate character animations from text descriptions
- **NEW**: Create motion sequences using AI
- **NEW**: Complete ComfyUI integration in Blender
- Multiple motion generation systems supported:
  - **HY-Motion-1.0**: Tencent's production-ready motion model
  - **MotionDiffuse**: Text-driven diffusion-based motion (original & SMPL-X)
  - **ComfyUI-MotionDiff**: Multiple models (MDM, MotionGPT, ReMoDiffuse, 4DHuman)
  - **ComfyUI-BlenderAI-node**: Complete ComfyUI in Blender (AI materials, animation, rendering)
- SMPL-X support for facial expressions and hand articulation
- Import and apply motion data to Blender armatures
- AI material generation and texture baking
- Camera input for real-time AI rendering
- Requires: PyTorch and chosen motion generation system
- Completely optional feature

### 🌐 Web Interface (Optional)
- **NEW**: Browser-based UI for AI generation powered by Gradio
- Easy-to-use interface (no command-line knowledge needed)
- Start/stop web server from Blender
- Access from any device on your network
- Text-to-3D and Image-to-3D generation via web browser
- Completely optional - install with `pip install gradio`

### 🎨 Texture Installation
- FO4-compatible material setup
- Easy texture loading (diffuse, normal, specular)
- Texture validation
- Power-of-2 dimension checking

### 🎭 Animation Tools
- FO4-compatible armature generation
- Automatic weight painting
- Animation validation
- Bone count checking

### 🤖 Auto-Rigging with RigNet & libigl (Optional)
- **NEW**: AI-powered automatic rigging for characters
- **RigNet**: Automatically predicts skeleton structure and skinning weights
- **libigl**: Bounded Biharmonic Weights (BBW) for automatic skinning
- **MediaPipe**: Real-time pose estimation and tracking (33 body landmarks)
- **BlendArMocap**: Complete Blender add-on for MediaPipe motion capture
- Based on SIGGRAPH 2020 research paper (RigNet)
- Supports meshes with 1K-5K vertices (RigNet)
- Two RigNet implementations available:
  - rignet-gj: Joint prediction reimplementation (educational/WIP)
  - Original RigNet: Complete rigging pipeline
- libigl provides fast, reliable weight computation for existing skeletons
- MediaPipe enables motion capture from images/video
- BlendArMocap integrates MediaPipe mocap into Blender workflow
- Alternative: Use existing Blender add-ons (brignet, Rignet_blender_addon, BlendArMocap)
- Requires: 
  - RigNet: PyTorch, PyTorch Geometric, and RigNet repository
  - libigl: Python bindings (pip install libigl)
  - MediaPipe: pip install mediapipe
  - BlendArMocap: Blender add-on (discontinued but functional)
- Completely optional feature

### 📦 Export Functionality
- Export to FBX (convertible to NIF)
- Complete mod package export
- Pre-export validation
- Automatic mod directory structure creation

## Prerequisites for Image to Mesh Feature

To use the Image to Mesh functionality, you need to install the following free Python packages in Blender's Python environment:

1. **PIL/Pillow** - For image processing
2. **NumPy** - For numerical operations

### Installing Dependencies

**On Windows:**
```bash
# Open command prompt as administrator
cd "C:\Program Files\Blender Foundation\Blender X.X\X.X\python\bin"
python.exe -m pip install Pillow numpy
```

**On macOS:**
```bash
# Open terminal
cd /Applications/Blender.app/Contents/Resources/X.X/python/bin
./python3.xx -m pip install Pillow numpy
```

**On Linux:**
```bash
# Open terminal
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install Pillow numpy
```

Note: Replace `X.X` with your Blender version number (e.g., 3.6).

## Optional: AI Generation with Hunyuan3D-2

The add-on supports AI-powered 3D generation using Tencent's Hunyuan3D-2 model. This is **completely optional** - the add-on works perfectly without it.

### What is Hunyuan3D-2?

Hunyuan3D-2 is a powerful AI model that can:
- Generate 3D meshes from text descriptions
- Convert 2D images into full 3D models (not just height maps)
- Create textured, game-ready assets

### Prerequisites for AI Features

**Hardware Requirements:**
- NVIDIA GPU with CUDA support (8GB+ VRAM recommended)
- 20GB+ free disk space (for models and dependencies)
- 16GB+ RAM recommended

**Software Requirements:**
- PyTorch with CUDA support
- Hunyuan3D-2 repository and model weights

### Installation Steps

1. **Install PyTorch** (in Blender's Python environment):
```bash
# Windows
cd "C:\Program Files\Blender Foundation\Blender X.X\X.X\python\bin"
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# macOS/Linux
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install torch torchvision
```

2. **Clone Hunyuan3D-2 repository**:
```bash
# Using GitHub CLI (recommended)
gh repo clone Tencent-Hunyuan/Hunyuan3D-2

# Or using git
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
```

3. **Install Hunyuan3D-2 dependencies**:
```bash
cd Hunyuan3D-2
pip install -r requirements.txt
```

4. **Download model weights**:
Follow the instructions in the Hunyuan3D-2 README to download the model weights.

5. **Restart Blender**

The add-on will automatically detect if Hunyuan3D-2 is installed and enable the AI features.

### Using AI Features

Once installed, you'll see an "AI Generation (Optional)" panel in the Fallout 4 sidebar:

- **Text to 3D**: Enter a description and generate a 3D model
- **Image to 3D**: Upload an image and get a full 3D model (not just height map)
- **Status Indicator**: Shows if Hunyuan3D-2 is available

### Note on AI Features

- AI generation is **experimental** and may require manual integration
- Model inference can be slow on CPU (GPU recommended)
- Generated meshes may need optimization for Fallout 4
- This is a beta feature - traditional methods work more reliably

## Optional: Gradio Web Interface

For an easy-to-use browser interface for AI generation, install Gradio:

```bash
# In Blender's Python environment
pip install gradio
```

Then in Blender:
1. Go to "AI Generation (Optional)" panel
2. Click "Start Web UI"
3. Open your browser to http://localhost:7860
4. Use the web interface for AI generation

**Benefits:**
- No command-line knowledge required
- User-friendly interface
- Works on any device with a browser
- Can create a shareable public link (optional)

## Optional: ZoeDepth for Depth Estimation

For AI-powered depth estimation from RGB images, install ZoeDepth:

### What is ZoeDepth?

ZoeDepth is a state-of-the-art monocular depth estimation model from Intel ISL that can:
- Estimate depth from any RGB image without requiring stereo cameras
- Generate high-quality depth maps for image-to-mesh conversion
- Provide better results than simple height map extraction
- Work on indoor scenes, outdoor scenes, or general purpose

### Prerequisites

**Hardware Requirements:**
- GPU recommended for faster inference (CPU supported)
- 4GB+ free disk space
- 8GB+ RAM recommended

**Software Requirements:**
- PyTorch
- ZoeDepth repository

### Installation Steps

1. **Install PyTorch** (in Blender's Python environment):
```bash
# Windows
cd "C:\Program Files\Blender Foundation\Blender X.X\X.X\python\bin"
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# macOS/Linux
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install torch torchvision
```

2. **Clone ZoeDepth repository**:
```bash
# Using GitHub CLI (recommended)
gh repo clone isl-org/ZoeDepth

# Or using git
git clone https://github.com/isl-org/ZoeDepth.git
```

3. **Install ZoeDepth dependencies**:
```bash
cd ZoeDepth
pip install -r requirements.txt
```

4. **Restart Blender**

The add-on will automatically detect if ZoeDepth is installed and enable depth estimation features.

### Using ZoeDepth

Once installed, you'll see a "Depth Estimation (ZoeDepth)" section in the Image to Mesh panel:

- **Estimate Depth**: Select an RGB image and generate a depth map
- **Model Selection**: Choose between three model variants:
  - **ZoeD_N**: Best for indoor scenes (NYU-trained)
  - **ZoeD_K**: Best for outdoor/driving scenes (KITTI-trained)
  - **ZoeD_NK**: General purpose (combined model)
- **Create Mesh**: Convert depth map to 3D mesh with adjustable scale

### Benefits over Height Maps

- Works with any RGB image (not just grayscale height maps)
- Understands 3D scene structure
- Better depth accuracy for realistic scenes
- No manual height map creation needed

### Note on Depth Estimation

- Depth estimation is **optional** - height map method still works
- First inference may take time to download model weights
- GPU recommended for real-time performance
- Generated depth maps can be saved for reuse

## Optional: Stable Diffusion 3.5 Large for Image Generation

For state-of-the-art AI image generation, use Stable Diffusion 3.5 Large:

### What is Stable Diffusion 3.5 Large?

Stable Diffusion 3.5 Large is Stability AI's latest and most advanced text-to-image model:
- State-of-the-art image quality and prompt adherence
- Superior text rendering and composition
- Better understanding of complex prompts
- Ideal for generating reference images for 3D modeling
- Can be used via the diffusers library

### Prerequisites

**Hardware Requirements:**
- NVIDIA GPU with 16GB+ VRAM (24GB+ recommended)
- 30GB+ free disk space (for model weights)
- 16GB+ system RAM

**Software Requirements:**
- PyTorch with CUDA support
- Hugging Face diffusers library
- transformers, accelerate, safetensors

### Installation Steps

**Option 1: Use via Diffusers (Recommended)**

1. **Install dependencies** (in Blender's Python environment):
```bash
# Windows
cd "C:\Program Files\Blender Foundation\Blender X.X\X.X\python\bin"
python.exe -m pip install diffusers[torch] transformers accelerate safetensors

# macOS/Linux
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install diffusers[torch] transformers accelerate safetensors
```

2. **Use in Python** (model downloads automatically on first use):
```python
from diffusers import StableDiffusion3Pipeline
import torch

pipe = StableDiffusion3Pipeline.from_pretrained(
    "stabilityai/stable-diffusion-3.5-large",
    torch_dtype=torch.float16
).to("cuda")

image = pipe("a detailed sci-fi weapon, metallic texture").images[0]
image.save("output.png")
```

**Option 2: Clone Model Repository**

For offline use or manual model management:

```bash
# Using git with git-lfs (Large File Storage)
git lfs install
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-large

# Or using Hugging Face CLI
huggingface-cli download stabilityai/stable-diffusion-3.5-large
```

3. **Restart Blender**

### Using SD3.5 Large

**Workflow for 3D Asset Creation:**

1. **Generate Reference Image**:
   - Use SD3.5 Large to create high-quality concept art
   - Generate texture references
   - Create multiple variations for the best result

2. **Convert to 3D**:
   - Use the generated image with TripoSR or other image-to-3D tools
   - Or use as reference for manual modeling

3. **Texture Application**:
   - Use generated images directly as textures
   - Generate texture maps (diffuse, normal, roughness)
   - Create seamless texture variations

### Benefits over Earlier Versions

- **Better Quality**: Superior detail and realism
- **Text Rendering**: Can accurately render text in images
- **Prompt Understanding**: Better comprehension of complex descriptions
- **Composition**: More coherent and well-composed images
- **Consistency**: More consistent results across generations

### Integration with Other Tools

- **TripoSR**: Generate reference images → Convert to 3D meshes
- **ZoeDepth**: Generate images → Estimate depth → Create meshes
- **ControlNet**: Guide generation with pose, depth, or edge maps
- **Inpainting**: Fill in missing texture areas

### Note on Usage

- SD3.5 Large requires significant VRAM (16GB minimum)
- First run will download ~12GB of model weights
- For lower VRAM, use SD 1.5 (4GB) or SDXL (8GB) instead
- GPU strongly recommended - CPU inference is extremely slow
- Model downloads automatically via diffusers library

## Optional: HY-Motion-1.0 for Motion Generation

For AI-powered animation and motion generation, install HY-Motion-1.0:

### Prerequisites
- git-lfs (Large File Storage)
- PyTorch
- Several GB of disk space

### Installation Steps

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
git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git
cd HY-Motion-1.0/
```

3. **Pull model weights with git-lfs**:
```bash
git lfs pull
```

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Restart Blender**

The add-on will automatically detect HY-Motion-1.0 and enable motion features.

**Features:**
- Generate animations from text descriptions
- Import motion files (.bvh, .fbx)
- Apply motion to Blender armatures
- Create character animations with AI

## Optional: RigNet for Auto-Rigging

For AI-powered automatic rigging of characters, install RigNet:

### What is RigNet?

RigNet is a deep learning system that automatically creates character rigs from 3D meshes:
- Predicts skeleton joint positions
- Determines bone connectivity and hierarchy
- Calculates skinning weights automatically
- Based on SIGGRAPH 2020 paper by Xu et al.

### Prerequisites
- PyTorch with CUDA support
- PyTorch Geometric
- 8GB+ VRAM recommended
- Works best with meshes of 1K-5K vertices

### Installation Steps

**OPTION 1: rignet-gj (Recommended for learning)**

1. **Install PyTorch** (in Blender's Python environment):
```bash
# Windows
cd "C:\Program Files\Blender Foundation\Blender X.X\X.X\python\bin"
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# macOS/Linux
cd /path/to/blender/X.X/python/bin
./python3.xx -m pip install torch torchvision
```

2. **Clone rignet-gj repository**:
```bash
# Using GitHub CLI (recommended)
gh repo clone govindjoshi12/rignet-gj

# Or using git
git clone https://github.com/govindjoshi12/rignet-gj.git
```

3. **Install dependencies**:
```bash
cd rignet-gj
pip install numpy scipy matplotlib tensorboard trimesh open3d jupyter
pip install torch-geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster
```

4. **Restart Blender**

The add-on will automatically detect rignet-gj and enable auto-rigging features.

**OPTION 2: Original RigNet (Complete pipeline)**

1. **Install PyTorch** (same as above)

2. **Clone original RigNet**:
```bash
gh repo clone zhan-xu/RigNet
# OR
git clone https://github.com/zhan-xu/RigNet.git
```

3. **Install RigNet dependencies**:
```bash
cd RigNet
pip install numpy scipy matplotlib tensorboard open3d==0.9.0 opencv-python "rtree>=0.8,<0.9" trimesh
pip install torch-geometric==1.7.2
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-1.12.0+cu113.html
```

4. **Download pre-trained models**:
- Download from: https://drive.google.com/file/d/1gM2Lerk7a2R0g9DwlK3IvCfp8c2aFVXs/view?usp=sharing
- Extract checkpoints folder to RigNet/checkpoints/

5. **Restart Blender**

**OPTION 3: Existing Blender Add-ons (Easiest)**

For immediate use without manual integration:
- **brignet**: https://github.com/pKrime/brignet (Recommended)
- **Rignet_blender_addon**: https://github.com/L-Medici/Rignet_blender_addon

These are complete Blender add-ons that integrate RigNet functionality directly.

**Additional: libigl for BBW Skinning**

libigl provides Bounded Biharmonic Weights for automatic skinning weight computation:

1. **Install Python bindings** (easiest):
```bash
# In Blender's Python environment
pip install libigl
```

2. **Clone Python bindings repository** (recommended for development):
```bash
# Using GitHub CLI
gh repo clone libigl/libigl-python-bindings

# Or using git
git clone --recursive https://github.com/libigl/libigl-python-bindings.git
cd libigl-python-bindings
pip install .
```

3. **Clone main repository** (for C++ development):
```bash
gh repo clone libigl/libigl
# OR
git clone https://github.com/libigl/libigl.git
```

4. **Restart Blender**

**Features:**
- Bounded Biharmonic Weights (BBW) for automatic skinning
- Works with any existing armature/skeleton
- Fast C++ implementation with Python interface
- No vertex count limitations
- Additional: mesh repair, UV unwrapping, geodesic distances

**When to use:**
- **RigNet**: Full automatic rigging (skeleton + skinning)
- **libigl**: Automatic skinning for existing skeletons
- **MediaPipe**: Motion capture from images/video, reference poses
- **BlendArMocap**: Complete motion capture workflow in Blender
- **Combination**: RigNet for skeleton prediction + libigl for weight refinement + MediaPipe for animation

**Additional: MediaPipe for Pose Estimation**

MediaPipe provides real-time pose estimation and tracking:

1. **Install MediaPipe** (easiest):
```bash
# In Blender's Python environment
pip install mediapipe opencv-python
```

2. **Clone demo repository** (optional, for examples):
```bash
gh repo clone ntu-rris/google-mediapipe
# OR
git clone https://github.com/ntu-rris/google-mediapipe.git
```

3. **Restart Blender**

**Features:**
- 33 3D body landmarks, 21 hand landmarks, 468 face landmarks
- Real-time performance on CPU (10-30 FPS)
- Works with images or video input
- Reference poses for rigging
- Motion capture data for animation

**Recommended: BlendArMocap Add-on**

For a complete motion capture workflow in Blender, use BlendArMocap:

1. **Download BlendArMocap**:
```bash
gh repo clone cgtinker/BlendArMocap
# OR
git clone https://github.com/cgtinker/BlendArMocap.git
```

2. **Install as Blender add-on**:
   - Download ZIP or clone repository
   - In Blender: Edit > Preferences > Add-ons > Install
   - Select the BlendArMocap folder or ZIP
   - Enable "BlendArMocap"

3. **Install dependencies** (via add-on preferences):
   - BlendArMocap will prompt to install mediapipe and dependencies
   - Follow on-screen instructions

4. **Restart Blender**

**BlendArMocap Features:**
- MediaPipe detection within Blender (pose, hand, face, holistic)
- Automatic transfer to Rigify rigs
- Import Freemocap session data
- Calculate rotations from detection data
- Generate transfer configurations

**Note:** BlendArMocap is discontinued but still functional for Blender 3.x
Documentation: https://cgtinker.github.io/BlendArMocap/

## Installation

1. Download the add-on files
2. In Blender, go to `Edit > Preferences > Add-ons`
3. Click `Install...` and select the add-on ZIP file or folder
4. Enable the "Fallout 4 Tutorial Helper" add-on

## Usage

### Accessing the Add-on

After installation, find the add-on in the 3D Viewport sidebar:
1. Press `N` to open the sidebar
2. Click on the "Fallout 4" tab

### Quick Start Guide

#### 1. Start a Tutorial
- Click "Start Tutorial" in the main panel
- Choose a tutorial type (Basic Mesh, Textures, or Animation)
- Follow the step-by-step instructions

#### 2. Create a Basic Mesh
```
1. Click "Create Base Mesh" to start with a FO4-optimized cube
2. Edit the mesh to your needs
3. Click "Optimize for FO4" to ensure compatibility
4. Click "Validate Mesh" to check for issues
```

#### 3. Setup Materials and Textures
```
1. Select your mesh
2. Click "Setup FO4 Materials" to create a material with proper nodes
3. Click "Install Texture" to load your texture files
4. Click "Validate Textures" to check compatibility
```

#### 4. Create Mesh from Image (New!)
```
1. Click "Image to Mesh (Height Map)" in the Image to Mesh panel
2. Select a grayscale image (bright areas = high, dark areas = low)
3. Adjust mesh width, height, and displacement strength
4. The mesh will be created automatically with proper UV mapping
```
OR
```
1. Select an existing mesh
2. Click "Apply Displacement Map"
3. Choose your height map image
4. Adjust displacement strength
```

#### 5. Generate with AI (Optional - Requires Hunyuan3D-2)
```
1. Install Hunyuan3D-2 (see AI Generation section below)
2. Expand "AI Generation (Optional)" panel
3. For text-to-3D:
   - Click "Generate from Text"
   - Enter description (e.g., "medieval sword")
   - Click OK to generate
4. For image-to-3D:
   - Click "Generate from Image (AI)"
   - Select your image
   - Full 3D model will be created (not just height map)
```

#### 6. Create Animations (Optional)
```
1. Click "Setup FO4 Armature" to create a skeleton
2. Parent your mesh to the armature
3. Create your animation
4. Click "Validate Animation" to check for issues
```

#### 6b. Auto-Rig with RigNet & libigl (Optional)
```
OPTION A: Full Auto-Rigging with RigNet
1. Install RigNet (see Auto-Rigging section above)
2. Select your character mesh
3. Expand "Auto-Rigging (RigNet)" panel
4. Click "1. Prepare Mesh" to optimize mesh for rigging
   - Simplifies to 1K-5K vertices (optimal for RigNet)
5. Click "2. Auto-Rig" to automatically create skeleton
   - RigNet will predict joints and skinning weights
   - Works best with humanoid/animal characters

OPTION B: Auto-Skinning with libigl (for existing skeletons)
1. Install libigl: pip install libigl
2. Create or select your armature/skeleton
3. Select your character mesh
4. Parent mesh to armature (or select both)
5. Expand "Auto-Rigging (RigNet)" panel
6. Under "libigl (BBW Skinning)" section
7. Click "Compute BBW Weights"
   - libigl will automatically compute skinning weights
   - Uses Bounded Biharmonic Weights algorithm
   - Works with any mesh/armature combination

OPTION C: Export for External Processing
1. Click "Export for External RigNet"
2. Process with brignet or RigNet CLI
3. Import resulting rig
```

**Comparison:**
- **RigNet**: Predicts skeleton + skinning (1K-5K vertices, AI-powered)
- **libigl**: Computes skinning for existing skeleton (any size, algorithmic)
- **Manual**: Full control (use animation_helpers for basic armature)

**Note:** RigNet integration is in beta. For production use, consider:
- brignet Blender add-on (https://github.com/pKrime/brignet)
- Rignet_blender_addon (https://github.com/L-Medici/Rignet_blender_addon)

#### 7. Export Your Mod
```
1. Select your object(s)
2. Click "Validate Before Export" to check everything
3. Click "Export Mesh (.nif)" for single objects
   OR
   Click "Export Complete Mod" for all assets
```

## Validation Checks

The add-on automatically checks for common issues:

### Mesh Validation
- ✓ Vertex and polygon count
- ✓ UV mapping presence
- ✓ Loose vertices
- ✓ Applied scale (must be 1,1,1)
- ✓ Maximum poly count (65535 for FO4)

### Texture Validation
- ✓ Material node setup
- ✓ Texture file loading
- ✓ Power-of-2 dimensions (recommended)
- ✓ Proper colorspace (Non-Color for normals/specular)

### Animation Validation
- ✓ Bone count (max 256 for FO4)
- ✓ Root bone presence
- ✓ Bone naming conventions
- ✓ Animation length

## Notification System

The add-on provides real-time notifications:
- **INFO** (Blue): Successful operations
- **WARNING** (Yellow): Potential issues that should be addressed
- **ERROR** (Red): Critical problems that must be fixed

Recent notifications appear in the main panel and in Blender's interface.

## Scripting Interface

You can also use the add-on's functionality through Python scripts in Blender's scripting workspace.

## Fallout 4 Mod Creation Workflow

1. **Planning** - Decide what type of mod you want to create
2. **Mesh Creation** - Use "Mesh Helpers" to create and optimize
3. **Texturing** - Use "Texture Helpers" to setup materials
4. **Animation** - Use "Animation Helpers" if needed
5. **Export** - Use "Export to FO4" to package your mod
6. **Testing** - Test in Creation Kit or game

## Best Free Resources for Image to Mesh

### For Creating/Editing Height Maps

**Image Editors:**
- **GIMP** (gimp.org) - Professional image editor for creating and editing height maps
- **Blender** - Use Blender's own texture painting to create height maps

**Height Map Generators:**
- **terrain.party** - Generate real-world terrain height maps from any location
- **tangrams.github.io/heightmapper** - Create height maps from map data
- **NASA Earth Observatory** - Download real terrain data

**Texture Libraries with Height Maps:**
- **polyhaven.com** - High-quality PBR textures including height maps
- **cgbookcase.com** - Free PBR textures with displacement maps
- **3dtextures.me** - Free seamless textures

### Tips for Best Results

1. **Use square images** (512x512, 1024x1024, 2048x2048) for best results
2. **Higher contrast** = more dramatic terrain
3. **Grayscale images** work best (bright = high, dark = low)
4. **Start with lower resolution** to test, then increase for final mesh
5. **See TUTORIALS.md** for detailed guide on using these resources

## Physics System Compatibility

### Important: Fallout 4 Uses Havok Physics, Not PhysX

**This add-on is designed for Fallout 4 modding, which uses Havok physics.**

- **Fallout 4 uses Havok:** All Bethesda Creation Engine games (Skyrim, Fallout 4, Starfield) use Havok physics
- **PhysX is not compatible:** NVIDIA PhysX (including NVIDIA-Omniverse/PhysX) is a different physics engine used in other games
- **This add-on does NOT require PhysX:** Everything works with Fallout 4's native Havok system

### What This Add-on Provides

**Collision Mesh Generation:**
- Creates simplified geometry for collision boundaries
- Exports to FBX/NIF format compatible with Fallout 4
- Basic collision shapes for static objects

**What This Add-on Does NOT Provide:**
- Full Havok physics simulation (requires Havok Content Tools)
- Ragdoll physics setup (requires Creation Kit)
- Dynamic physics properties (requires NifSkope + Creation Kit)
- PhysX support (not used in Fallout 4)

### For Advanced Physics in Fallout 4

If you need advanced physics features, use these tools **in addition to** this add-on:
1. **Havok Content Tools** - For creating physics simulations (available from Bethesda)
2. **NifSkope** - For editing collision properties in .nif files
3. **Creation Kit** - For setting up physics properties in-game
4. **This add-on** - For creating meshes and basic collision geometry

**Bottom line:** This add-on works perfectly for Fallout 4 modding. PhysX is not needed or compatible with Fallout 4.

## Troubleshooting

### Common Issues

**"No mesh object selected"**
- Solution: Click on your mesh object in the 3D viewport to select it

**"Poly count too high"**
- Solution: Use the Decimate modifier or manually reduce polygon count
- FO4 limit: 65,535 polygons per mesh

**"Object scale is not applied"**
- Solution: Press Ctrl+A and select "Scale" to apply the scale

**"No UV map found"**
- Solution: Enter Edit mode (Tab), press U, and select "Unwrap"

### Image to Mesh Issues

**"PIL/Pillow not installed" or "NumPy not installed"**
- Solution: Install dependencies in Blender's Python (see Prerequisites section above)

**"Mesh looks flat or has no detail"**
- Solution: Increase "Displacement Strength" parameter
- Ensure your image has good contrast (not all one color)

**"Mesh has too many polygons"**
- Solution: Use smaller "Subdivisions" value or let it auto-calculate (set to 0)
- Use a smaller resolution image

**"Unsupported image format"**
- Solution: Convert your image to PNG, JPG, BMP, TIFF, or TGA format

### AI Generation Issues

**"Hunyuan3D-2 not available"**
- Solution: Install Hunyuan3D-2 following the instructions in the "Optional: AI Generation" section
- Check that PyTorch is installed in Blender's Python environment
- Verify the Hunyuan3D-2 repository is cloned in a standard location

**"PyTorch not installed"**
- Solution: Install PyTorch in Blender's Python environment:
  ```bash
  python -m pip install torch torchvision
  ```

**"Hunyuan3D-2 not found"**
- Solution: Clone the repository:
  ```bash
  gh repo clone Tencent-Hunyuan/Hunyuan3D-2
  ```
- Place it in your home directory or Projects folder
- Restart Blender after installation

**AI features grayed out**
- This is normal if Hunyuan3D-2 is not installed
- AI features are optional - other features work without it
- Click "Installation Info" for setup instructions

**"Text-to-3D generation not yet implemented"**
- The AI integration is in beta/placeholder state
- Manual integration with Hunyuan3D-2 inference code required
- See their documentation for direct usage
- Traditional mesh creation methods work reliably

### Motion Generation Issues

**"HY-Motion-1.0 not available"**
- Solution: Install HY-Motion-1.0 following the instructions above
- Check that git-lfs is installed: `git lfs version`
- Verify PyTorch is installed in Blender's Python
- Check the repository is cloned and lfs files pulled

**"git-lfs not installed"**
- Solution: Install git-lfs for your platform
  - Windows: `choco install git-lfs` or download from git-lfs.github.com
  - macOS: `brew install git-lfs`
  - Linux: `sudo apt-get install git-lfs`
- Run `git lfs install` after installation

**"Motion generation not yet implemented"**
- The motion integration is in placeholder state
- Manual integration with HY-Motion-1.0's inference code required
- See their documentation for direct usage
- Generated animations can be imported as .bvh or .fbx files

**"Import motion file failed"**
- Check file format (.bvh or .fbx supported)
- Verify file path is correct
- Try importing manually: File → Import → Motion Capture (.bvh)

### Auto-Rigging Issues

**"RigNet not available"**
- Solution: Install RigNet following the instructions in the "Optional: RigNet for Auto-Rigging" section
- Check that PyTorch is installed in Blender's Python environment
- Verify rignet-gj or RigNet repository is cloned in a standard location
- Restart Blender after installation

**"PyTorch not installed"**
- Solution: Install PyTorch in Blender's Python environment:
  ```bash
  python -m pip install torch torchvision
  ```

**"RigNet found but required files not present"**
- For rignet-gj: Check that utilities/ folder exists
- For original RigNet: Check that checkpoints/ folder exists and contains model weights
- Download pre-trained models if using original RigNet

**"RigNet integration is in beta"**
- This is expected - full integration is work in progress
- Use existing Blender add-ons for production work:
  - brignet: https://github.com/pKrime/brignet (Recommended)
  - Rignet_blender_addon: https://github.com/L-Medici/Rignet_blender_addon
- Or export mesh and use RigNet CLI directly

**"Mesh has too many/few vertices"**
- Solution: Use "Prepare for Auto-Rig" operator first
- RigNet works best with 1K-5K vertices
- The prepare function will automatically simplify or subdivide

**Auto-rigging grayed out**
- This is normal if RigNet is not installed
- Auto-rigging is optional - manual rigging works without it
- Click "Installation Guide" for setup instructions

## Documentation

This add-on comes with comprehensive documentation:

- **[README.md](README.md)** - Main documentation (you are here)
- **[INSTALLATION.md](INSTALLATION.md)** - Installation instructions
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide
- **[TUTORIALS.md](TUTORIALS.md)** - Detailed tutorials
- **[FAQ.md](FAQ.md)** - Frequently asked questions
- **[API_REFERENCE.md](API_REFERENCE.md)** - API documentation for scripting
- **[COMPATIBILITY.md](COMPATIBILITY.md)** - Compatibility with PhysX, other tools, and platforms
- **[NVIDIA_RESOURCES.md](NVIDIA_RESOURCES.md)** - NVIDIA repositories and tools that can help with Blender add-on development
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## Version History

### 1.0.0 (Initial Release)
- Tutorial system with three tutorials
- Error notification system
- Mesh creation and optimization tools
- Texture setup and validation
- Animation helpers
- Export functionality
- Complete mod structure generation
