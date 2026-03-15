# Complete Setup Guide for Fallout 4 Blender Add-on

This guide will walk you through setting up your system for the Fallout 4 Blender Add-on, including all dependencies and optional AI features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup (Automated)](#quick-setup-automated)
3. [Manual Setup](#manual-setup)
4. [Optional AI Features Setup](#optional-ai-features-setup)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required for All Platforms

- **Blender 3.0 or higher** - [Download here](https://www.blender.org/download/)
- **Python 3.8 or higher** (usually included with Blender, but needed for AI features)
- **Internet connection** for downloading dependencies

### Platform-Specific Requirements

#### macOS
- **macOS 10.15 (Catalina) or higher**
- **Xcode Command Line Tools** (for Homebrew)
  ```bash
  xcode-select --install
  ```

#### Windows
- **Windows 10 or higher**
- **Python 3.8+** - [Download from python.org](https://www.python.org/downloads/)
  - ⚠️ **Important**: Check "Add Python to PATH" during installation

#### Linux
- **Python 3.8+** and pip (usually pre-installed)
- Build essentials for some packages

---

## Quick Setup (Automated)

### Option 1: Using Setup Scripts

#### macOS and Linux

```bash
# Navigate to the add-on directory
cd /path/to/Blender-add-on

# Run the setup script
./setup.sh
```

The script will:
1. ✅ Install Homebrew (macOS only, if not present)
2. ✅ Check Python installation
3. ✅ Upgrade pip and setuptools
4. ✅ Install core dependencies
5. ✅ Optionally install AI/ML dependencies

#### Windows

```cmd
# Navigate to the add-on directory
cd C:\path\to\Blender-add-on

# Run the setup script
setup.bat
```

The script will:
1. ✅ Check Python installation
2. ✅ Upgrade pip and setuptools
3. ✅ Install core dependencies
4. ✅ Optionally install AI/ML dependencies

---

## Manual Setup

If you prefer manual installation or the automated scripts don't work:

### Step 1: Install Homebrew (macOS only)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installation, for Apple Silicon Macs:
```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Step 2: Verify Python Installation

**macOS/Linux:**
```bash
python3 --version
pip3 --version
```

**Windows:**
```cmd
python --version
pip --version
```

If Python is not installed:
- **macOS**: `brew install python3`
- **Windows**: Download from [python.org](https://www.python.org/downloads/)
- **Linux**: Use your package manager (`apt`, `dnf`, `pacman`, etc.)

### Step 3: Upgrade pip and setuptools

**macOS/Linux:**
```bash
pip3 install --upgrade pip setuptools
```

**Windows:**
```cmd
python -m pip install --upgrade pip setuptools
```

### Step 4: Install Core Dependencies

```bash
# Navigate to add-on directory
cd /path/to/Blender-add-on

# Install core dependencies
pip3 install -r requirements.txt
```

### Step 5: Install External Command-Line Tools (ffmpeg, NVTT, texconv, whisper)

These utilities are required for video transcription, DDS texture conversion,
and other helper features. You can:

1. Use the provided Python script from the workspace:

```bash
python tools/install_all_tools.py
```

2. Alternatively, install them manually by downloading from the following
   locations:
   - ffmpeg: https://www.gyan.dev/ffmpeg/builds/
   - NVTT (nvcompress): https://github.com/castano/nvidia-texture-tools/releases
   - DirectXTex (texconv): https://github.com/microsoft/DirectXTex/releases
   - whisper CLI: `pip install openai-whisper`

3. In Blender, open the *Fallout 4* sidebar tab and click the **External Tools**
   panel.  A set of **Check/Install** buttons will automatically fetch and
   configure the tools for you.  The add-on also includes an *Environment
   Self-Test* to verify everything is working.


Core dependencies include:
- Pillow (image processing)
- numpy (numerical operations)
- requests (HTTP for desktop app integration)

### Step 5: Install Blender Add-on

1. Open Blender
2. Go to `Edit > Preferences` (or `Blender > Preferences` on macOS)
3. Navigate to "Add-ons" section
4. Click "Install..." button
5. Browse to the add-on folder
6. Select the folder or ZIP file
7. Enable "Fallout 4 Tutorial Helper" in the list

---

## Optional AI Features Setup

The add-on supports several AI-powered 3D generation features. These are **completely optional** but provide powerful capabilities.

### Prerequisites for AI Features

1. **Install PyTorch**

**macOS/Linux:**
```bash
pip3 install torch torchvision
```

**Windows (with CUDA for GPU acceleration):**
```cmd
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Windows (CPU only):**
```cmd
pip install torch torchvision
```

2. **Install additional dependencies**

```bash
pip3 install -r requirements-optional.txt
```

### AI Models Installation

#### Shap-E (OpenAI - Text/Image to 3D)

**Using GitHub CLI:**
```bash
gh repo clone openai/shap-e
cd shap-e
pip install -e .
```

**Using Git:**
```bash
git clone https://github.com/openai/shap-e
cd shap-e
pip install -e .
```

**Or from Hugging Face:**
```bash
git clone https://huggingface.co/openai/shap-e
cd shap-e
pip install -e .
```

#### Point-E (OpenAI - Fast Point Cloud Generation)

**Using GitHub CLI:**
```bash
gh repo clone openai/point-e
cd point-e
pip install -e .
```

**Using Git:**
```bash
git clone https://github.com/openai/point-e
cd point-e
pip install -e .
```

#### ComfyUI (Advanced Image Generation)

```bash
# Clone ComfyUI
gh repo clone Comfy-Org/ComfyUI
# OR
git clone https://github.com/comfyanonymous/ComfyUI.git

cd ComfyUI
pip install -r requirements.txt
```

**ComfyUI-GGUF Extension** (Recommended for efficient model loading):
```bash
# Navigate to ComfyUI custom_nodes directory
cd ComfyUI/custom_nodes

# Clone GGUF extension
git clone https://github.com/city96/ComfyUI-GGUF.git

# Install dependencies
cd ComfyUI-GGUF
pip install -r requirements.txt
```

Benefits of GGUF format:
- ✅ Smaller model files (faster download/loading)
- ✅ Efficient memory usage
- ✅ Quantized models (4-bit, 8-bit)
- ✅ Better performance on consumer hardware

#### Stable Diffusion WebUI (AUTOMATIC1111) - Alternative

```bash
# Clone SD WebUI
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run setup (auto-installs dependencies)
# Windows:
webui-user.bat

# Linux/macOS:
./webui.sh
```

**SD WebUI vs ComfyUI:**
- **WebUI**: Form-based, user-friendly, huge extension library
- **ComfyUI**: Node-based, advanced workflows, technical

**Recommendation:** Install both! Use WebUI for quick work, ComfyUI for complex workflows.

**FLUX.1-dev Model** (State-of-the-art image generation):
```bash
# Clone FLUX.1-dev model (large download ~24GB)
git clone https://huggingface.co/black-forest-labs/FLUX.1-dev

# Or download to ComfyUI models directory
cd ComfyUI/models/checkpoints
# Place FLUX.1 model files here
```

FLUX.1-dev features:
- ✅ Best-in-class image quality
- ✅ Superior text rendering in images
- ✅ Excellent for texture generation
- ✅ Great prompt understanding

**FLUX.1-schnell Model** (Fast iteration):
```bash
# Clone FLUX.1-schnell (fast variant)
git clone https://huggingface.co/black-forest-labs/FLUX.1-schnell
```

**Stable Diffusion 3.5 Large** (Balanced option):
```bash
# Clone SD 3.5 Large
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-large

# 8GB VRAM compatible, excellent quality
```

**Stable Diffusion 3.5 Medium** (Budget-friendly):
```bash
# Clone SD 3.5 Medium
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-medium

# 6GB VRAM compatible, good quality, smaller size
```

### GPU Acceleration (Recommended for AI)

**NVIDIA GPU (CUDA):**
- Install [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads)
- Install PyTorch with CUDA support (see PyTorch website for specific commands)

**AMD GPU (ROCm - Linux only):**
- Follow [ROCm installation guide](https://rocmdocs.amd.com/)
- Install PyTorch with ROCm support

**Apple Silicon (M1/M2/M3):**
- PyTorch has native Metal Performance Shaders (MPS) support
- Install regular PyTorch, it will automatically use GPU acceleration

---

## Verification

### Verify Basic Installation

1. **Open Blender**
2. **Press N** in the 3D Viewport to open sidebar
3. **Click "Fallout 4" tab**
4. **You should see these panels:**
   - Fallout 4 Tutorial
   - Batch Processing
   - Smart Presets
   - Automation & Macros
   - Desktop Tutorial App
   - AI Generation
   - Quest Creation
   - And more...

### Verify Desktop Tutorial Integration

```bash
# Start the example tutorial server
python example_tutorial_server.py
```

In Blender:
1. Go to "Desktop Tutorial App" panel
2. Click "Connect"
3. Should show "✓ Connected"

### Verify AI Installation

In Blender, go to the "AI Generation" panel:

- **Shap-E section**: Should show "Installed ✓" if Shap-E is installed
- **Point-E section**: Should show "Installed ✓" if Point-E is installed

Test generation:
```python
# In Blender's Python console
import bpy
bpy.context.scene.fo4_shap_e_prompt = "a wooden chair"
bpy.ops.fo4.generate_shap_e_text()
```

---

## Troubleshooting

### Common Issues

#### Python Not Found

**Symptom:** `python: command not found` or `python3: command not found`

**Solution:**
- **macOS**: Install via Homebrew: `brew install python3`
- **Windows**: Download from [python.org](https://www.python.org/downloads/) and ensure "Add to PATH" is checked
- **Linux**: Install via package manager: `sudo apt install python3 python3-pip`

#### pip Upgrade Fails

**Symptom:** Permission errors when upgrading pip

**Solution:**
- Use `--user` flag: `pip3 install --user --upgrade pip setuptools`
- Or use virtual environment (recommended for development)

#### Homebrew Installation Stuck (macOS)

**Symptom:** Installation hangs during Xcode tools download

**Solution:**
1. Cancel installation (Ctrl+C)
2. Install Xcode Command Line Tools first: `xcode-select --install`
3. Try Homebrew installation again

#### Blender Can't Find Dependencies

**Symptom:** AI features show "Not Installed" even after installation

**Solution:**
1. Check Blender is using the correct Python:
   ```python
   # In Blender's Python console
   import sys
   print(sys.executable)
   ```
2. Install dependencies in Blender's Python:
   ```bash
   /path/to/blender/python/bin/python -m pip install torch
   ```

#### CUDA/GPU Not Working

**Symptom:** AI generation is very slow, GPU not detected

**Solution:**
1. Verify CUDA installation:
   ```bash
   nvidia-smi  # Should show GPU info
   ```
2. Reinstall PyTorch with CUDA:
   ```bash
   pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   ```
3. Test in Python:
   ```python
   import torch
   print(torch.cuda.is_available())  # Should print True
   ```

#### Import Errors in Blender

**Symptom:** "Module not found" errors when enabling add-on

**Solution:**
1. Check all required files are present in add-on folder
2. Restart Blender completely
3. Check Blender console (Window > Toggle System Console on Windows) for specific errors
4. Ensure Python version compatibility (3.8+)

### Getting Help

If you encounter issues not covered here:

1. **Check existing documentation:**
   - INSTALLATION.md
   - README.md
   - TROUBLESHOOTING.md (if present)

2. **Check Blender console for errors:**
   - Windows: Window > Toggle System Console
   - macOS/Linux: Run Blender from terminal to see output

3. **Community resources:**
   - Blender Artists forums
   - Fallout 4 modding communities
   - GitHub issues (if available)

---

## Platform-Specific Notes

### macOS

- **Apple Silicon (M1/M2/M3)**: Most dependencies work natively, but some older packages may need Rosetta 2
- **Homebrew paths**: 
  - Intel Macs: `/usr/local/bin/brew`
  - Apple Silicon: `/opt/homebrew/bin/brew`
- **Permission issues**: May need to grant Terminal full disk access in System Preferences > Security & Privacy

### Windows

- **Path issues**: Ensure Python is in PATH during installation
- **Long path support**: Enable in Windows settings for deep directory structures
- **Antivirus**: May need to whitelist Python/pip for smooth installation
- **PowerShell vs CMD**: Commands work in both, but PowerShell is recommended

### Linux

- **Package managers**:
  - Ubuntu/Debian: `apt`
  - Fedora/RHEL: `dnf`
  - Arch: `pacman`
- **Permissions**: May need `sudo` for system-wide installations
- **Virtual environments**: Highly recommended to avoid conflicts

---

## Performance Tips

### For AI Generation

1. **Use GPU acceleration** when possible (10-100x faster)
2. **Start with lower quality settings** for testing
3. **Close other GPU-intensive applications** during generation
4. **Monitor GPU memory usage** - reduce batch size if running out of VRAM

### For General Use

1. **Keep Blender updated** for best performance
2. **Use SSD storage** for faster file operations
3. **Allocate sufficient RAM** (16GB+ recommended for large projects)
4. **Regular cleanup** of temporary files and caches

---

## Next Steps

After successful setup:

1. **Read the tutorials**: TUTORIALS.md
2. **Try the examples**: example_script.py, example_tutorial_server.py
3. **Explore features**: Check all the panels in Blender
4. **Create your first mod**: Follow COMPLETE_MOD_GUIDE.md
5. **Join the community**: Share your creations!

---

## Summary of Commands

### Quick Reference

**macOS Setup:**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Upgrade pip
pip3 install --upgrade pip setuptools

# Run setup script
./setup.sh
```

**Windows Setup:**
```cmd
# Upgrade pip
python -m pip install --upgrade pip setuptools

# Run setup script
setup.bat
```

**Linux Setup:**
```bash
# Upgrade pip
pip3 install --upgrade pip setuptools

# Run setup script
./setup.sh
```

---

**Version:** 1.0
**Last Updated:** 2026-02-17
**For Blender 3.0+**
