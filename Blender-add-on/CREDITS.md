# Credits & Attribution

This document acknowledges all contributors, third-party code, libraries, models, and resources used in the Fallout 4 Blender Add-on.

---

## 🏆 Main Contributors

### Primary Development Team
- **POINTYTHRUNDRA654** - Project Lead & Primary Developer
- **Tutorial Team** - Documentation & Tutorial System

---

## 🤝 Third-Party Add-ons & Integrations

This add-on integrates with and provides support for numerous third-party Blender add-ons. We are grateful to their developers for their excellent work.

### Detected & Supported Add-ons

#### 1. Blender NIF Plugin
- **Author**: niftools team
- **License**: BSD License
- **Repository**: https://github.com/niftools/blender_nif_plugin
- **Purpose**: Essential for importing/exporting Fallout 4 .nif files
- **Credit**: The NIF format support that makes FO4 modding in Blender possible
- **Integration**: Our add-on detects and provides tutorials for using this plugin

#### 2. Rigify
- **Author**: Blender Foundation / Nathan Vegdahl, Lucio Rossi, Ivan Cappiello
- **License**: GPL v2+
- **Bundled with**: Blender (official add-on)
- **Purpose**: Advanced character rigging
- **Credit**: Professional rigging system for NPCs and creatures
- **Integration**: Character creation workflows use Rigify

#### 3. Loop Tools
- **Author**: Bart Crouch
- **License**: GPL v2+
- **Bundled with**: Blender (official add-on)
- **Purpose**: Advanced mesh editing tools
- **Credit**: Essential mesh manipulation features
- **Integration**: Mesh optimization workflows

#### 4. Node Wrangler
- **Author**: Bartek Skorupa, Greg Zaal, Sebastian Koenig, Christian Brinkmann, Florian Meyer
- **License**: GPL v2+
- **Bundled with**: Blender (official add-on)
- **Purpose**: Node editing enhancements
- **Credit**: Speeds up material node workflow
- **Integration**: Material setup procedures

#### 5. 3D Print Toolbox
- **Author**: Campbell Barton
- **License**: GPL v2+
- **Bundled with**: Blender (official add-on)
- **Purpose**: Mesh validation and analysis
- **Credit**: Helps ensure mesh quality
- **Integration**: Validation operators

---

## 🤖 AI Models & Systems

### Image Generation Models

#### FLUX Models (Black Forest Labs)
- **FLUX.1-dev**
  - **Developer**: Black Forest Labs
  - **License**: Apache 2.0 (non-commercial variant available)
  - **Repository**: https://huggingface.co/black-forest-labs/FLUX.1-dev
  - **Purpose**: State-of-the-art text-to-image generation
  - **Credit**: Highest quality texture and concept generation

- **FLUX.1-schnell**
  - **Developer**: Black Forest Labs
  - **License**: Apache 2.0
  - **Repository**: https://huggingface.co/black-forest-labs/FLUX.1-schnell
  - **Purpose**: Fast text-to-image generation
  - **Credit**: Rapid iteration for texture creation

#### Stable Diffusion Models (Stability AI)
- **SD 3.5 Large**
  - **Developer**: Stability AI
  - **License**: Stability AI Community License
  - **Repository**: https://huggingface.co/stabilityai/stable-diffusion-3.5-large
  - **Purpose**: High-quality image generation
  - **Credit**: Balanced quality and speed

- **SD 3.5 Medium**
  - **Developer**: Stability AI
  - **License**: Stability AI Community License
  - **Repository**: https://huggingface.co/stabilityai/stable-diffusion-3.5-medium
  - **Purpose**: Efficient image generation
  - **Credit**: Lower VRAM requirements

### 3D Generation Models

#### Shap-E (OpenAI)
- **Developer**: OpenAI
- **License**: MIT License
- **Repository**: https://github.com/openai/shap-e
- **Paper**: https://arxiv.org/abs/2305.02463
- **Purpose**: Text and image to 3D generation
- **Credit**: AI-powered 3D mesh creation from descriptions
- **Integration**: Full integration for asset generation

#### Point-E (OpenAI)
- **Developer**: OpenAI
- **License**: MIT License
- **Repository**: https://github.com/openai/point-e
- **Paper**: https://arxiv.org/abs/2212.08751
- **Purpose**: Fast point cloud generation
- **Credit**: Rapid 3D prototyping from text/images
- **Integration**: Fast iteration workflows

#### Hunyuan3D (Tencent)
- **Developer**: Tencent AI Lab
- **License**: Apache 2.0
- **Repository**: https://huggingface.co/tencent/Hunyuan3D-2
- **Purpose**: Advanced image-to-3D generation
- **Credit**: High-quality 3D reconstruction
- **Integration**: Referenced in documentation

### Animation & Motion

#### Hotshot-XL
- **Developer**: Hotshot
- **License**: Apache 2.0
- **Repository**: https://huggingface.co/hotshotco/Hotshot-XL
- **Purpose**: Text/image to animated GIF/video
- **Credit**: Animation generation for holotapes and effects
- **Integration**: Full documentation and workflows

#### HY-Motion-1.0 (Tencent)
- **Developer**: Tencent AI Lab
- **License**: Apache 2.0
- **Repository**: https://huggingface.co/tencent/HY-Motion-1.0
- **Purpose**: Motion generation
- **Credit**: Character animation synthesis
- **Integration**: Referenced in rigging documentation

### Control & Enhancement

#### T2I-Adapter (TencentARC)
- **Developer**: Tencent ARC Lab
- **License**: Apache 2.0
- **Repository**: https://huggingface.co/TencentARC/t2i-adapter-depth-midas-sdxl-1.0
- **Purpose**: Depth-controlled image generation
- **Credit**: 3D-aware texture generation
- **Integration**: Full integration guide

#### IP-Adapter (cubiq)
- **Developer**: Matteo "cubiq" Spinelli
- **License**: Apache 2.0
- **Repository**: https://github.com/cubiq/ComfyUI_IPAdapter_plus
- **Purpose**: Image prompt adapter for style transfer
- **Credit**: Consistent style across multiple assets
- **Integration**: ComfyUI extension support

---

## 🛠️ Professional Tools (Documented)

### External Tools We Document

#### Substance Painter (Adobe)
- **Developer**: Adobe (formerly Allegorithmic)
- **License**: Commercial Software
- **Website**: https://www.adobe.com/products/substance3d-painter.html
- **Purpose**: Professional 3D texture painting
- **Credit**: Industry-standard PBR texturing
- **Integration**: Workflow documentation and best practices

#### GIMP (GNU Image Manipulation Program)
- **Developer**: GIMP Team / Free Software Community
- **License**: GPL v3
- **Website**: https://www.gimp.org/
- **Purpose**: Free image editing and DDS support
- **Credit**: Free alternative for texture editing
- **Integration**: Plugin installation guides and workflows

#### FO4Edit (xEdit)
- **Developer**: ElminsterAU and xEdit team
- **License**: Mozilla Public License
- **Repository**: https://github.com/TES5Edit/TES5Edit
- **Purpose**: Fallout 4 plugin editing
- **Credit**: Essential tool for creating .esp/.esm files
- **Integration**: Complete usage documentation

#### Creation Kit (Bethesda)
- **Developer**: Bethesda Game Studios
- **License**: Proprietary (Free to use for modding)
- **Website**: https://www.creationkit.com/
- **Purpose**: Official Fallout 4 world editor
- **Credit**: World building and quest creation
- **Integration**: Integration workflows documented

---

## 🎨 UI Platforms Documented

### ComfyUI
- **Developer**: comfyanonymous
- **License**: GPL v3
- **Repository**: https://github.com/comfyanonymous/ComfyUI
- **Purpose**: Node-based AI workflow interface
- **Credit**: Advanced AI generation workflows
- **Integration**: Complete setup and extension guides

#### ComfyUI Extensions:

**ComfyUI-GGUF**
- **Developer**: city96
- **License**: GPL v3
- **Repository**: https://github.com/city96/ComfyUI-GGUF
- **Purpose**: Efficient model loading with GGUF format
- **Credit**: Lower VRAM usage for AI models

**ComfyUI Manager**
- **Developer**: ltdrdata
- **License**: GPL v3
- **Repository**: https://github.com/ltdrdata/ComfyUI-Manager
- **Purpose**: Extension management
- **Credit**: Easy installation of other extensions

**ComfyUI Custom Scripts**
- **Developer**: pythongosssss
- **License**: MIT License
- **Repository**: https://github.com/pythongosssss/ComfyUI-Custom-Scripts
- **Purpose**: UI improvements
- **Credit**: Better user experience

**Z-Tipo Extension**
- **Developer**: KohakuBlueleaf
- **License**: Apache 2.0
- **Repository**: https://github.com/KohakuBlueleaf/z-tipo-extension
- **Purpose**: Quality improvements
- **Credit**: Better type handling and quality

### AUTOMATIC1111 Stable Diffusion WebUI
- **Developer**: AUTOMATIC1111
- **License**: AGPL v3
- **Repository**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **Purpose**: User-friendly AI image generation
- **Credit**: Accessible AI for everyone
- **Integration**: Complete setup guide and workflows

---

## 📚 Libraries & Dependencies

### Python Libraries

#### Core Dependencies
- **Pillow (PIL)**
  - **License**: HPND License
  - **Purpose**: Image processing
  - **Credit**: Essential image manipulation

- **NumPy**
  - **License**: BSD License
  - **Purpose**: Numerical operations
  - **Credit**: Array and matrix operations

- **requests**
  - **License**: Apache 2.0
  - **Purpose**: HTTP communication
  - **Credit**: Desktop tutorial app integration

#### Optional AI Dependencies
- **PyTorch**
  - **Developer**: Meta AI (Facebook)
  - **License**: BSD License
  - **Purpose**: Deep learning framework
  - **Credit**: Powers all AI model inference

- **transformers**
  - **Developer**: Hugging Face
  - **License**: Apache 2.0
  - **Purpose**: NLP and model loading
  - **Credit**: T5 text encoder support

- **diffusers**
  - **Developer**: Hugging Face
  - **License**: Apache 2.0
  - **Purpose**: Diffusion model interface
  - **Credit**: Stable Diffusion integration

- **accelerate**
  - **Developer**: Hugging Face
  - **License**: Apache 2.0
  - **Purpose**: Model optimization
  - **Credit**: Faster inference

---

## 🌐 Model Repositories

### Hugging Face
- **Organization**: Hugging Face Inc.
- **Website**: https://huggingface.co/
- **Purpose**: AI model hosting and distribution
- **Credit**: Central hub for all AI models we reference

### GitHub
- **Organization**: GitHub Inc. (Microsoft)
- **Website**: https://github.com/
- **Purpose**: Code repository and version control
- **Credit**: Hosting for all code repositories

---

## 📖 Documentation & Learning Resources

### Referenced Documentation
- **Blender Manual**: https://docs.blender.org/
  - **License**: CC BY-SA 4.0
  - **Credit**: Official Blender documentation

- **Fallout 4 Modding Wiki**: Various community wikis
  - **Credit**: Community knowledge base

- **Nexus Mods**: https://www.nexusmods.com/
  - **Credit**: Mod hosting and community

---

## 🙏 Special Thanks

### Community Contributors
- **Blender Community** - For the amazing open-source 3D software
- **FO4 Modding Community** - For tutorials, guides, and support
- **AI/ML Community** - For open-source models and tools
- **GitHub Community** - For code hosting and collaboration

### Organizations
- **Blender Foundation** - For Blender itself
- **OpenAI** - For Shap-E and Point-E models
- **Stability AI** - For Stable Diffusion models
- **Black Forest Labs** - For FLUX models
- **Tencent** - For Hunyuan3D and HY-Motion
- **Hugging Face** - For model hosting and libraries
- **Bethesda Game Studios** - For Fallout 4 and modding tools

---

## 📄 License Information

### This Add-on
- **License**: MIT License (see LICENSE file)
- **Copyright**: © 2024-2026 POINTYTHRUNDRA654 and Contributors
- **Permissions**: Free to use, modify, and distribute with attribution

### Integrated Components
Each integrated component maintains its own license:
- Check individual repositories for specific license terms
- Some models are for non-commercial use only
- Some tools require separate licensing

### Usage Guidelines
- ✅ Free to use this add-on for personal projects
- ✅ Free to use for commercial Fallout 4 mods
- ✅ Attribution appreciated but not required
- ⚠️ AI models may have usage restrictions
- ⚠️ Check individual model licenses

---

## 🔄 Contributing

### How to Get Credit
If you contribute to this project:
1. Your name will be added to this file
2. Contributions noted in CHANGELOG.md
3. Git history preserves your commits
4. Public recognition in releases

### Report Missing Credits
If we've missed anyone or any attribution:
1. Open an issue on GitHub
2. Contact project maintainers
3. Submit a pull request with updates

We strive for complete and accurate attribution!

---

## 📞 Contact

**For Attribution Questions:**
- Open an issue: https://github.com/POINTYTHRUNDRA654/Blender-add-on/issues
- Tag: @POINTYTHRUNDRA654

**For License Questions:**
- Check individual component licenses
- Refer to original repositories
- Contact original authors for clarifications

---

## ✨ Final Note

This add-on stands on the shoulders of giants. Every person, organization, and project listed here has contributed to making FO4 modding more accessible and powerful.

**Thank you to everyone who builds open-source software and shares knowledge with the community!** 🙏

---

*Credits Version: 1.0*  
*Last Updated: 2026-02-18*  
*If you're listed here: THANK YOU!*  
*If you should be listed: Please let us know!*
