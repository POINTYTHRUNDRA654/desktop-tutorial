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

### 4. Bethel Integration Guide (NEW!)
**[BETHEL_INTEGRATION_GUIDE.md](BETHEL_INTEGRATION_GUIDE.md)** - Automatic mod enhancement system
- ✅ Complete workflow: Upload → Analyze → Enhance → Export
- ✅ 4x/8x/16x AI texture upscaling
- ✅ ZIP and FOMOD export formats
- ✅ Real-time progress tracking
- ✅ Professional packaging with auto-generated installers
- ✅ Best for users who want to enhance existing mods

### 5. Texture Enhancement Guide (NEW!)
**[TEXTURE_ENHANCER_IMPLEMENTATION.md](TEXTURE_ENHANCER_IMPLEMENTATION.md)** - Neural texture upscaling
- ✅ LANCZOS resampling for artifact-free upscaling
- ✅ Normal map detail sharpening
- ✅ Material manifest preservation
- ✅ GPU-accelerated Blender pipeline
- ✅ Technical implementation details

## 🎯 New Features in v5.4.41

**Bethel - Automatic Mod Enhancement**
- Drag-drop any Fallout 4 mod into Mossy
- Automatic texture analysis and classification
- Choose 4x, 8x, or 16x upscaling level
- Export as ZIP (mod managers) or FOMOD (professional installers)
- Real-time progress tracking
- 7-day job retention with auto-cleanup
- See [BETHEL_INTEGRATION_GUIDE.md](BETHEL_INTEGRATION_GUIDE.md) for details

**Phase 1B: Texture Enhancement Engine**
- Neural network-powered texture upscaling
- LANCZOS resampling removes artifacts
- Normal map sharpening for surface detail
- Preserves PBR material metadata
- GPU-accelerated via Blender BridgeServer
- See [TEXTURE_ENHANCER_IMPLEMENTATION.md](TEXTURE_ENHANCER_IMPLEMENTATION.md) for details

## Quick start (recommended)
- Follow the one-minute checklist: `QUICK_START.md` or `resources/public/knowledge/QUICK_START.md` for the latest curated steps.
- Visual Studio setup: `QUICK_START_VISUAL_STUDIO.md`
- 2025 notes / changes: `QUICK_START_2025.md`

## Tutorials & next steps
- `TUTORIAL_QUICK_START.md` — step-through tutorial
- `GETTING_STARTED_WITH_MOSSY.md` — Mossy-specific onboarding

---
Notes: older quick-start pages are archived under `/docs/archive/`. This file is the canonical starting point for new contributors.