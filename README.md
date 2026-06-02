# Mossy Fallout 4 Blender Add-on

**Professional Fallout 4 modding tools with FREE local AI assistance**  
**A Mossy Industries Product**

[![Build Status](https://github.com/POINTYTHRUNDRA654/Blender-add-on/workflows/Build%20Add-on%20Zips/badge.svg)](https://github.com/POINTYTHRUNDRA654/Blender-add-on/actions)
[![Tests](https://github.com/POINTYTHRUNDRA654/Blender-add-on/workflows/Addon%20Integrity%20Tests/badge.svg)](https://github.com/POINTYTHRUNDRA654/Blender-add-on/actions)

---

## 🏢 About Mossy Industries

**Mossy Industries** develops professional, privacy-first tools for game modders and developers. Our mission is to provide powerful, FREE software that respects user privacy by keeping all processing local.

### Our Products
- **Mossy Desktop App** - FREE local AI assistant for modding (coming soon)
- **Mossy Fallout 4 Blender Add-on** - This addon (100% free)
- More tools coming soon...

---

## 🎯 What Makes This Add-on Special

### ✅ **100% FREE - No Subscriptions, No API Keys**
- **FREE AI assistance** via Mossy desktop app (100% local, no cloud)
- **No paid services** - Everything runs on your machine
- **Privacy-first** - Your data never leaves your computer
- **Zero recurring costs** - Free forever

### 🚀 **Professional Fallout 4 Workflow**
- Native **NIF export** (BSTriShape) via PyNifly or Niftools
- Automatic mesh preparation (triangulate, UV validation, transforms)
- **UCX_ collision generation**
- FO4 limit validation
- **FBX fallback** when no NIF exporter available

### 🤖 **FREE Local AI Features (via Mossy)**
All AI features are powered by the **free Mossy desktop app** - no cloud services:
- Scene analysis and optimization suggestions
- Export readiness validation
- Material setup guidance
- Quest/NPC/item creation assistance
- Real-time modding advice

### 🎨 **Advanced Features**
- **AI-powered mesh tools**: RigNet auto-rigging, mesh optimization
- **Texture processing**: DDS conversion (NVTT/texconv), upscaling (RealESRGAN)
- **Animation support**: Wind animation, Havok export, motion generation
- **Multi-engine support**: Fallout 4, Unreal, Unity asset import
- **Smart presets**: Material library, asset browser, automation workflows

---

## 📥 Installation

### **Blender Version Compatibility**
This add-on supports **Blender 2.90 through 5.x+**

| Blender Version | Download File | Format |
|----------------|---------------|--------|
| **Blender 5.0+** | `blender5x.zip` | Extension |
| **Blender 4.2–4.9** | `blender42.zip` | Extension |
| **Blender 4.0–4.1** | `blender4x.zip` | Legacy |
| **Blender 3.6 LTS** | `blender3x.zip` | Legacy |

### **Installation Steps**

1. Download the appropriate ZIP for your Blender version from [Releases](https://github.com/POINTYTHRUNDRA654/Blender-add-on/releases)
2. In Blender: `Edit → Preferences → Add-ons → Install`
3. Select the downloaded ZIP
4. Enable the add-on: Check the box next to "Mossy Fallout 4 Blender Add-on"
5. **Optional**: Download [Mossy desktop app](https://your-mossy-link-here.com) for FREE AI features

---

## 🤖 FREE AI Setup (Mossy)

### **What is Mossy?**
Mossy is a **free, open-source desktop application** that provides local AI assistance for Fallout 4 modding. All processing happens on your machine - **no cloud services, no API keys, no subscriptions**.

### **Setting Up Mossy Connection**

1. **Download & Install Mossy**
   - Get the free Mossy desktop app
   - Launch Mossy and start the AI service

2. **Connect Blender to Mossy**
   - In Blender, press `N` to open the sidebar
   - Go to **Fallout 4 → Settings**
   - Scroll to **"AI Advisor – FREE via Mossy"**
   - Check **"Enable AI Advisor"**
   - Set your Mossy connection token (same in both apps)

3. **Start Using AI Features**
   - Scene analysis: Get AI suggestions for optimization
   - Export validation: AI checks export readiness
   - Material guidance: AI helps with shader setup
   - Quest/NPC assistance: AI guides you through creation

### **No Mossy? No Problem!**
All core features work perfectly without Mossy - it's only needed for the optional AI assistance.

---

## 🎮 Core Features

### **Mesh Export & Validation**
- ✅ Native NIF (BSTriShape) export for Fallout 4
- ✅ Auto-triangulation and UV validation
- ✅ Transform application and validation
- ✅ UCX_ collision mesh generation
- ✅ Vertex/triangle count validation (FO4 limits)
- ✅ FBX fallback for compatibility

### **Texture Tools**
- ✅ DDS texture conversion (NVTT/texconv)
- ✅ RealESRGAN upscaling (AI)
- ✅ Material browser & presets
- ✅ BGSM material format support
- ✅ Texture validation & auto-fix

### **Animation & Rigging**
- ✅ RigNet auto-rigging (AI)
- ✅ Havok animation export
- ✅ Wind animation setup
- ✅ Motion generation (HyMotion)
- ✅ Animation validation

### **Fallout 4 Specific**
- ✅ Quest creation helpers
- ✅ NPC setup tools
- ✅ Item/weapon creation
- ✅ Papyrus script helpers
- ✅ World building tools
- ✅ Navmesh validation
- ✅ .TRI morph export (facial animations)
- ✅ Mod packaging system

### **Multi-Engine Support**
- ✅ **Fallout 4** - Primary focus
- ✅ **Unreal Engine** - UE4/UE5 asset import
- ✅ **Unity** - FBX and asset import
- ✅ Universal asset ripper integration

---

## 📚 Usage

### **Quick Start**

1. **Enable the add-on** (see Installation above)
2. Press `N` in the 3D Viewport to open the sidebar
3. Navigate to the **Fallout 4** tab
4. Click **"Start Tutorial"** for a guided introduction

### **Main Panels**

| Panel | Location | Purpose |
|-------|----------|---------|
| **Main Panel** | N-panel → Fallout 4 | Core tools, export, quick actions |
| **Setup & Status** | N-panel → Fallout 4 | Dependency checks, environment setup |
| **Settings** | N-panel → Fallout 4 | All configuration options |
| **Asset Browser** | N-panel → Fallout 4 | Preset library, materials |

### **Typical Workflow**

1. **Model your asset** in Blender
2. **Validate mesh**: Use the Advisor for AI-powered checks
3. **Apply materials**: Browse preset materials or create custom
4. **Generate collision**: Automatic UCX_ collision meshes
5. **Export to NIF**: One-click export with validation
6. **Test in-game**: Import to Creation Kit / FO4Edit

---

## 🔧 Dependencies

### **Core Dependencies** (Auto-installed)
- `trimesh` - 3D mesh processing
- `pypdf` - Documentation parsing

### **Optional AI Dependencies** (Mossy handles these)
When using Mossy for AI features, Mossy provides PyTorch and all AI models:
- PyTorch (provided by Mossy)
- RigNet, Shape-E, Point-E (provided by Mossy)
- All models run locally via Mossy

### **External Tools** (Optional)
- **PyNifly** - NIF export (Blender 4.x/5.x)
- **Niftools** v0.1.1 - NIF export (Blender 3.6 LTS)
- **NVTT** - NVIDIA Texture Tools (DDS compression)
- **texconv** - DirectX Texture Converter
- **Havok2FBX** - Havok animation export

---

## 🏗️ Development

### **Building from Source**

```bash
# Clone the repository
git clone https://github.com/POINTYTHRUNDRA654/Blender-add-ongit
cd Blender-add-on

# Run integrity tests (219 tests)
python test_addon_integrity.py

# Build all variants
python build_addon.py --version all --outdir dist
```

### **Project Structure**
```
├── __init__.py              # Main addon entry point
├── preferences.py           # User preferences & settings
├── ui_panels.py            # All UI panels (4,418 lines)
├── operators.py            # Operator implementations
├── advisor_helpers.py      # AI advisor (Mossy integration)
├── mossy_link.py          # Mossy desktop app connection
├── export_helpers.py      # NIF/FBX export logic
├── mesh_helpers.py        # Mesh validation & processing
├── texture_helpers.py     # Texture tools
└── [60+ more modules]     # Specialized features
```

### **Code Quality**
- ✅ **219 automated tests** - Full integrity suite
- ✅ **64,506 lines of code** - Professional codebase
- ✅ **70 Python modules** - Modular architecture
- ✅ **CI/CD with GitHub Actions** - Automated builds & tests
- ✅ **Zero syntax errors** - 100% valid Python

---

## 🌐 Publishing

### **Blender Extensions Platform** (extensions.blender.org)

Ready for submission to the official Blender extension marketplace:

✅ **Extension-compliant manifest** (`blender_manifest.toml`)  
✅ **GPL-3.0-or-later license** (required by Blender)  
✅ **Clear permission descriptions** (network = localhost only)  
✅ **Multi-version builds** (4.2+, 5.0+)  
✅ **No paid services** (all AI is local via Mossy)

**Submission ready** - Upload `blender42.zip` or `blender5x.zip` to extensions.blender.org

### **Nexus Mods**

Also available on Nexus Mods with the complete bundle including all Blender version variants.

---

## 🎉 Key Changes (v5.1.0)

### **100% Free, No Paid APIs** ✅
- ❌ **REMOVED**: OpenAI API integration
- ❌ **REMOVED**: Paid LLM endpoints
- ❌ **REMOVED**: API key requirements
- ✅ **ADDED**: 100% free Mossy AI integration
- ✅ **IMPROVED**: All AI now runs locally (privacy-first)

### **Blender Extension Platform Ready** ✅
- ✅ Updated manifest with clear permissions
- ✅ Network usage clarified (localhost only)
- ✅ No external API dependencies
- ✅ GPL-3.0-or-later compliant

### **User Experience** ✅
- ✅ Simplified setup (no API keys to manage)
- ✅ Clear AI feature descriptions
- ✅ Prominent "FREE" labeling throughout UI
- ✅ Better error messages

---

## 📜 License

**GPL-3.0-or-later**

This add-on is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

---

## 🙏 Acknowledgments

- **Mossy Industries** - Professional tools for game modders
- **Blender Foundation** - Amazing 3D software
- **PyNifly** - Modern NIF export support
- **Niftools** - Legacy NIF tools
- **Fallout 4 Modding Community** - Tools, documentation, support

---

## 📞 Support & Links

- **Mossy Industries**: https://mossy.industries (coming soon)
- **GitHub Repository**: https://github.com/POINTYTHRUNDRA654/Blender-add-on
- **Issues/Bug Reports**: [GitHub Issues](https://github.com/POINTYTHRUNDRA654/Blender-add-on/issues)
- **Discussions**: [GitHub Discussions](https://github.com/POINTYTHRUNDRA654/Blender-add-on/discussions)
- **Documentation**: See `DEVELOPMENT_NOTES.md` and `RELEASE_GUIDE.md`

---

## ⭐ Features at a Glance

| Category | Features | Status |
|----------|----------|--------|
| **AI Assistance** | Scene analysis, export validation, material guidance | ✅ FREE via Mossy |
| **NIF Export** | PyNifly, Niftools, BSTriShape, auto-prep | ✅ Production |
| **Mesh Tools** | Optimization, collision, validation, auto-rigging | ✅ Advanced |
| **Textures** | DDS conversion, upscaling, material presets | ✅ Professional |
| **Animation** | Havok export, wind setup, motion generation | ✅ Complete |
| **FO4 Tools** | Quest, NPC, items, Papyrus, world building | ✅ Comprehensive |
| **Multi-Engine** | UE4/5, Unity, FO4 asset import | ✅ Supported |
| **Automation** | Presets, batch processing, smart workflows | ✅ Advanced |

---

**Made with ❤️ by Mossy Industries for the Fallout 4 modding community**

*No subscriptions. No API keys. Just great tools and free local AI.*  
*A Mossy Industries Product - Professional tools for game modders*
