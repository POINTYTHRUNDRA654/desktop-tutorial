# Getting Started

Consolidated quick-start and onboarding material.

## 📥 How to Download Mossy

### For End Users (Pre-built Installer)

**Download the latest release:**
👉 **[Download from GitHub Releases](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest)**

**First-Time Installation:**
1. Download the appropriate installer for your platform (Windows .exe, macOS .dmg, or Linux .AppImage)
2. Run the installer and follow the setup wizard
3. Launch Mossy from your desktop or start menu
4. Complete the first-run tutorial

**Upgrading an Existing Installation:**

If you already have Mossy installed on your desktop:

1. **Close Mossy** completely (check system tray)
2. **Download** the new installer from GitHub Releases
3. **Run** the installer - it will automatically upgrade your installation
4. **Your data is safe**: Settings, API keys, Memory Vault, and projects are preserved
5. **Launch** the updated version

The installer replaces only the application files while keeping all your user data in `%APPDATA%/mossy-desktop/` (Windows) or equivalent on other platforms.

**Troubleshooting Updates:**
- If issues occur, you can uninstall via Windows Settings → Apps
- Your settings remain in AppData even after uninstall
- Reinstalling will restore your settings automatically
- For a fresh start, manually delete `%APPDATA%/mossy-desktop/` after uninstalling

**System Requirements:**
- Windows 10/11, macOS 10.15+, or modern Linux
- 8GB RAM minimum (16GB recommended)
- 500MB storage for application

### For Developers (Build from Source)

See the [Development Setup](#quick-start-recommended) section below for build instructions.

---

## 📚 Choose Your Learning Path

**Not sure where to start?** See **[DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md)** for a complete navigation guide to all Mossy documentation.

## 📚 Documentation Guide

**New to Mossy?** Choose your learning path:

### 1. Visual Guide (Recommended for Beginners)
**[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** - Complete page-by-page walkthrough with 55+ screenshots
- ✅ Every page explained with actual screenshots
- ✅ Step-by-step instructions for each feature
- ✅ Beginner-friendly tips and common patterns
- ✅ Troubleshooting guide included

### 2. Comprehensive Tutorial
**[MOSSY_COMPREHENSIVE_TUTORIAL.md](MOSSY_COMPREHENSIVE_TUTORIAL.md)** - Detailed feature documentation
- ✅ In-depth explanations of all modules
- ✅ Keyboard shortcuts and advanced features
- ✅ FAQ and troubleshooting
- ✅ Best for users who want complete technical details

### 3. Enhanced Tutorial
**[MOSSY_TUTORIAL_ENHANCED.md](MOSSY_TUTORIAL_ENHANCED.md)** - Beginner-focused guide
- ✅ Every button and control explained
- ✅ Common mistakes to avoid
- ✅ Glossary of modding terms
- ✅ Best for absolute beginners to Fallout 4 modding

## Quick start (recommended)
- Follow the one-minute checklist: `QUICK_START.md` or `resources/public/knowledge/QUICK_START.md` for the latest curated steps.
- Visual Studio setup: `QUICK_START_VISUAL_STUDIO.md`
- 2025 notes / changes: `QUICK_START_2025.md`

---

## 🎨 Optional: Professional Texture & Asset Tools

Mossy integrates with professional texture creation and optimization tools to enhance your modding workflow. These tools are completely optional but highly recommended for advanced texture work.

### Quick Setup (5 minutes)

Download and install any of these tools for texture creation, normal map generation, and DDS compression:

| Tool | Purpose | Download | License |
|------|---------|----------|---------|
| **Photopea** | Cloud-based image editor (Photoshop alternative) | [https://www.photopea.com](https://www.photopea.com) | Freemium |
| **NVIDIA Texture Tools** | DDS compression (essential for Fallout 4) | [https://developer.nvidia.com/nvidia-texture-tools-exporter](https://developer.nvidia.com/nvidia-texture-tools-exporter) | Free |
| **ShaderMap 4** | Normal map & texture generation | [https://shadermap.com/download/](https://shadermap.com/download/) | Commercial |
| **Upscayl** | AI-powered image upscaler | [https://github.com/upscayl/upscayl/releases](https://github.com/upscayl/upscayl/releases) | Open Source |
| **GIMP 3** | Professional image editor | [https://www.gimp.org/](https://www.gimp.org/) | Open Source |
| **CrazyBump** | Normal map generation from photos | [https://www.crazybump.com/](https://www.crazybump.com/) | Commercial |
| **PhotoDemon** | Lightweight batch image editor | [https://photodemon.org/](https://photodemon.org/) | Open Source |
| **Materialize** | Automatic texture map generation | [https://www.boundingboxsoftware.com/materialize/](https://www.boundingboxsoftware.com/materialize/) | Paid |
| **Packer-IO** | Texture channel packing & optimization | [https://github.com/DouglasDwyer/Packer-IO](https://github.com/DouglasDwyer/Packer-IO) | Open Source |

### Installation & Integration

1. Download and install any tools from the links above
2. Use default installation paths (or update paths in Mossy Settings)
3. Launch tools directly from Mossy's **Tools** menu
4. Tools will auto-detect once installed

### 📖 Full Documentation

For detailed information about each tool, features, workflows, and troubleshooting, see:

👉 **[TEXTURE_TOOLS_GUIDE.md](TEXTURE_TOOLS_GUIDE.md)** – Complete reference guide with:
- Tool descriptions and capabilities
- Installation instructions  
- Recommended workflows
- Author credits and attributions
- FAQ and troubleshooting

### 🎯 Recommended Starter Setup

**For Texture Creation:**
- NVIDIA Texture Tools (DDS compression - required)
- Photopea or GIMP 3 (image editing)
- ShaderMap 4 or CrazyBump (normal maps)

**For Batch Processing:**
- PhotoDemon (lightweight, efficient)
- Upscayl (AI upscaling of low-res textures)
- Packer-IO (texture optimization)

### ✨ Key Features

- **One-Click Launch**: Open any installed tool from Mossy
- **Auto-Detection**: Tools install → Mossy finds them
- **Zero Configuration**: Works out-of-the-box with standard installations
- **All Open Source Tools Free**: GIMP, PhotoDemon, Upscayl, Packer-IO
- **Cross-Platform**: Most tools work on Windows, macOS, and Linux

### 🎓 Credits & Attribution

All integrated tools are created by talented developers and teams:
- NVIDIA Corporation (Texture Tools)
- Ivan Kutskir (Photopea)
- Rendering Systems (ShaderMap)
- Tanner Helland (PhotoDemon)
- The GIMP Team (GIMP)
- CrazyBump Inc. (CrazyBump)
- Bound3 (Materialize)
- Upscayl Community (Upscayl)
- Douglas Dwyer (Packer-IO)

See full credits in [TEXTURE_TOOLS_GUIDE.md](TEXTURE_TOOLS_GUIDE.md#credits--attribution)

---

## Tutorials & next steps
- `TUTORIAL_QUICK_START.md` — step-through tutorial
- `GETTING_STARTED_WITH_MOSSY.md` — Mossy-specific onboarding
- `TEXTURE_TOOLS_GUIDE.md` — Professional tools reference

---
Notes: older quick-start pages are archived under `/docs/archive/`. This file is the canonical starting point for new contributors.