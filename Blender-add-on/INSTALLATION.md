# Installation Guide

## Quick Links

- **Quick Setup**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) for automated installation
- **AI Features**: See [SHAP_E_INTEGRATION.md](SHAP_E_INTEGRATION.md) and [COMFYUI_INTEGRATION.md](COMFYUI_INTEGRATION.md)
- **Desktop Integration**: See [DESKTOP_TUTORIAL_INTEGRATION.md](DESKTOP_TUTORIAL_INTEGRATION.md)

## Prerequisites

- Blender 3.0 or higher
- Python 3.8 or higher (for AI features)
- Basic knowledge of Blender interface
- Understanding of Fallout 4 modding basics (helpful but not required)

## Quick Setup (Recommended)

### Automated Setup Scripts

We provide automated setup scripts that will install all dependencies:

**macOS/Linux:**
```bash
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

These scripts will:
1. Check system requirements
2. Install/upgrade pip and setuptools
3. Install core dependencies
4. Optionally install AI/ML dependencies

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Manual Installation Steps

### Method 1: Install from ZIP

1. Download the add-on as a ZIP file
2. Open Blender
3. Go to `Edit > Preferences` (or `Blender > Preferences` on macOS)
4. Navigate to the "Add-ons" section
5. Click the "Install..." button at the top
6. Browse to the downloaded ZIP file and select it
7. The add-on will be installed
8. Find "Fallout 4 Tutorial Helper" in the add-ons list
9. Check the checkbox to enable it

### Method 2: Install from Folder

1. Download or clone the add-on folder
2. Locate your Blender add-ons directory:
   - **Windows**: `%APPDATA%\Blender Foundation\Blender\<version>\scripts\addons\`
   - **macOS**: `~/Library/Application Support/Blender/<version>/scripts/addons/`
   - **Linux**: `~/.config/blender/<version>/scripts/addons/`
3. Copy the entire add-on folder into the addons directory
4. Restart Blender
5. Go to `Edit > Preferences > Add-ons`
6. Search for "Fallout 4 Tutorial Helper"
7. Enable the add-on by checking its checkbox

## Verification

After installation, verify the add-on is working:

1. Open Blender
2. In the 3D Viewport, press `N` to open the sidebar
3. Look for a "Fallout 4" tab
4. Click on the tab to see the add-on panels
5. You should see:
   - Fallout 4 Tutorial (main panel)
   - Mesh Helpers
   - Texture Helpers
   - Animation Helpers
   - Export to FO4

## Dependencies Installation

### Core Dependencies

Install with pip:
```bash
pip install -r requirements.txt
```

This includes:
- Pillow (image processing)
- numpy (numerical operations)
- requests (HTTP communication)

### Optional AI/ML Dependencies

For AI-powered features:
```bash
pip install -r requirements-optional.txt
```

This includes:
- PyTorch
- Additional ML libraries

For specific AI models:
- **Shap-E**: `gh repo clone openai/shap-e`
- **Point-E**: `gh repo clone openai/point-e`
- **ComfyUI**: `git clone https://github.com/comfyanonymous/ComfyUI.git`
- **ComfyUI-GGUF**: `git clone https://github.com/city96/ComfyUI-GGUF.git`

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

## Troubleshooting Installation

### Add-on doesn't appear in the list
- Make sure you're using Blender 3.0 or higher
- Check that all Python files are in the correct directory
- Restart Blender completely
- Run setup script: `./setup.sh` or `setup.bat`

### Add-on appears but can't be enabled
- Check the Blender console (Window > Toggle System Console on Windows)
- Look for error messages
- Ensure all required files are present (see file list below)
- Install dependencies: `pip install -r requirements.txt`

### Python/pip not found
- **macOS**: Install Homebrew first, then run setup script
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  pip3 install --upgrade pip setuptools
  ```
- **Windows**: Download Python from python.org, ensure "Add to PATH" is checked
- **Linux**: Install via package manager: `sudo apt install python3 python3-pip`

### AI features not working
- Verify AI models are installed (see SETUP_GUIDE.md)
- Check installation in Blender: AI Generation panel should show "Installed ✓"
- Install PyTorch: `pip install torch torchvision`

### Tab doesn't appear in sidebar
- Press `N` to toggle the sidebar visibility
- Make sure the add-on is enabled in preferences
- Try switching to a different workspace and back

## Updating the Add-on

To update to a newer version:

1. Disable the current version in Add-ons preferences
2. Remove the old add-on files
3. Install the new version using either method above
4. Enable the new version

## Uninstallation

To remove the add-on:

1. Go to `Edit > Preferences > Add-ons`
2. Find "Fallout 4 Tutorial Helper"
3. Click the remove button (trash icon)
4. Restart Blender

Alternatively, manually delete the add-on folder from the Blender addons directory.
