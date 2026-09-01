# Mossy - The Fallout 4 Modding Assistant

**Mossy v5.6.0** - A production-ready Electron desktop application for Fallout 4 modding with AI assistance, real-time analysis, direct-write scripting, and professional asset optimization.

## Support the Developer

If Mossy.Space has helped your modding workflow, consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support-orange?logo=patreon)](https://www.patreon.com/c/Pointytundra654)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Tip-yellow?logo=buymeacoffee)](https://buymeacoffee.com/tundra654)

---

> 🔄 **For Contributors:** If you have this repository cloned and want to update your local copy with recent bug fixes, see [GIT_UPDATE_GUIDE.md](GIT_UPDATE_GUIDE.md)
> 
> 🔀 **Merge & Cleanup:** Ready to merge to master or clean up temporary files? See [MERGE_TO_MASTER_GUIDE.md](MERGE_TO_MASTER_GUIDE.md) and [REPOSITORY_CLEANUP_GUIDE.md](REPOSITORY_CLEANUP_GUIDE.md)

---

## 🚀 Onboarding & Installer Notes (v5.6.0)

**New in v5.6.0 (Latest):**
- ✅ **Background Remover** (Textures & Materials Hub) - AI background removal: a standalone local RMBG-2.0 GPU install, or a ComfyUI-RMBG backend with permissively-licensed BEN2/InSPyReNet/BEN models
- ✅ **AI Post-Processing Pipeline** (Textures & Materials Hub) - Layer Effects, Face Detailer, Relight, and Upscale (SUPIR or UltimateSDUpscale), all running through your own local ComfyUI
- ✅ **AI Image Studio: Transparency & Inpaint** - "Generate with transparency" toggle (LayerDiffuse, real alpha channel) plus a brush-based mask editor for crop-and-stitch inpainting
- ✅ **One-Click ComfyUI Custom Node Installer** - every ComfyUI-based tool above installs with one click (downloads real GitHub source + Python deps + model files, restarts ComfyUI), plus a new AI Texture Tools Setup Wizard that walks through all of them right after Voice Setup on first install or Initial Install replay
- 📄 See [CHANGELOG.md](CHANGELOG.md) for full details

**From v5.5.0:**
- ✅ **Bethel Integration** - Automatic mod enhancement system! Upload any Fallout 4 mod → Auto-enhance textures → Export as ZIP or FOMOD
  - 4x/8x/16x AI upscaling with neural networks
  - Intelligent texture classification (diffuse, normal, specular, roughness, metallic, AO)
  - Professional ZIP and FOMOD export packages with auto-generated installers
  - Real-time progress tracking with persistent job registry
  - 7-day auto-cleanup with error recovery
  - See [BETHEL_INTEGRATION_GUIDE.md](BETHEL_INTEGRATION_GUIDE.md) for complete documentation
- ✅ **Phase 1B: RTX Remix Texture Enhancement** - Neural texture upscaling engine
  - LANCZOS resampling for artifact-free upscaling
  - Normal map detail sharpening with unsharp masks
  - Material manifest preservation (.mossy_material.json)
  - Real PIL/Pillow processing with progress events
  - GPU-accelerated via Blender BridgeServer
  - See [TEXTURE_ENHANCER_IMPLEMENTATION.md](TEXTURE_ENHANCER_IMPLEMENTATION.md) for technical details
- ✅ **Multi-Language Support** - Mossy now supports 12 languages! Choose your preferred language in Settings → Language Settings
  - Languages: English, Spanish, French, German, Russian, Chinese (Simplified), Portuguese (BR), Japanese, Korean, Italian, Polish, Turkish
  - See [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md) to help translate
- ✅ **Anniversary Edition Awareness** - Mossy now understands all four FO4 version states: OG, NG, AE, and Creations Menu
- ✅ **AE Knowledge** - AE = same NG executable (1.10.984) + 76 bundled free CC items; mods often need AE patches; PRP 81+ required for AE cells
- ✅ **Improved Version Guidance** - AI correctly identifies your runtime and gives version-accurate advice
- 📄 See [CHANGELOG.md](CHANGELOG.md) for the full version history

**From v5.4.25:**
- Deep scan of all Fallout 4 modding knowledge — updated tool recommendations, version compatibility, and community best practices

**From v5.4.24:**
- Fixed tutorial TTS integration - Mossy now speaks during tutorials
- **Memory Vault** - Now accessible directly from Mossy.Space sidebar
- **Community Knowledge Sharing** - Export approved knowledge to share with other users
- **Import Community Knowledge** - Load knowledge packs from other Mossy users
- All previous v5.4.21 features included

**From v5.4.21:**
- Direct-write protocol for Papyrus, xEdit, and Blender scripting
- Headless automation and batch execution for Blender
- Real-time tool monitoring (Neural Link)
- Explicit user permission and audit logging for all direct-write and automation features
- All modules are functional—no placeholders
- ⚠️ **Note:** The Blender add-on is still under active development
- **Fixed**: Encryption key parity between dev and production builds
- **Added**: Automatic API key decryption in packaged builds
- **New**: Tutorial replay feature - Re-experience the installation tutorial anytime!

**Important Notes:**
- Mossy **intentionally recommends** Mod Organizer 2 (MO2) or Vortex when users ask about installation tutorials
- This is correct behavior for Fallout 4 modding workflows
- The installer has the same features as the dev environment
- API keys are automatically decrypted from `.env.encrypted` in packaged builds
- **You can now replay the installation tutorial** from Settings → Tutorial & Onboarding

**Replaying the Tutorial:**
1. Go to Settings (gear icon in sidebar)
2. Scroll to "Step 5: Tutorial & Onboarding"
3. Click "Replay Tutorial"
4. Confirm the reset
5. App will reload and show the first-run experience again

**Packaging:**
- Windows installer is generated via NSIS (`npm run package:win`)
- Version is auto-set from `package.json` (currently 5.6.0)
- See **[PACKAGING_GUIDE.md](PACKAGING_GUIDE.md)** for complete packaging instructions
- Run `node scripts/fix-env-encryption.mjs` before packaging to ensure API keys work

**Onboarding:**
- **📚 Documentation Guide:** See [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) - Navigation guide for all documentation
- **📦 Archived Docs:** See [docs/archive/ARCHIVE_INDEX.md](docs/archive/ARCHIVE_INDEX.md) - Historical session documentation (81 archived files)
- **Getting Started:** See [GETTING_STARTED.md](GETTING_STARTED.md) for quick-start information
- **Visual Guide:** See [VISUAL_GUIDE.md](VISUAL_GUIDE.md) for page-by-page screenshots and explanations (55+ pages)
- **Comprehensive Tutorial:** See [MOSSY_COMPREHENSIVE_TUTORIAL.md](MOSSY_COMPREHENSIVE_TUTORIAL.md) for detailed feature documentation
- **Enhanced Tutorial:** See [MOSSY_TUTORIAL_ENHANCED.md](MOSSY_TUTORIAL_ENHANCED.md) for beginner-friendly step-by-step guide
- **Blender Integration:** See [BLENDER_ADDON_TUTORIAL.md](resources/public/knowledge/BLENDER_ADDON_TUTORIAL.md) for Blender scripting
- **Animation Workflow:** See [ANIMATION_SUITE_IMPLEMENTATION.md](resources/public/knowledge/ANIMATION_SUITE_IMPLEMENTATION.md) for animation workflow
- **Script Execution:** See [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](resources/public/knowledge/BLENDER_SCRIPT_EXECUTION_CHECKLIST.md) for script execution and trust

---

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)
![Version](https://img.shields.io/github/package-json/v/POINTYTHRUNDRA654/mossy-ai?label=version&color=blue)

---

## 📥 Download & Install

### Quick Download

**Ready to use Mossy?** Download the latest installer:

👉 **[Download Mossy v5.6.0 from GitHub Releases](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest)**

### System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 500MB for application + space for mods
- **Optional:** OpenAI API key for AI features (can be added later)

### First-Time Installation

1. **Download** the installer from the [Releases page](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest)
2. **Run** the `.exe` installer (Windows) or `.dmg` (macOS)
3. **Follow** the installation wizard
4. **Launch** Mossy from your desktop or start menu
5. **Complete** the first-run tutorial to learn the basics

> **Note:** Windows may show a SmartScreen warning for new releases. Click "More info" → "Run anyway" to proceed. Mossy is open source and safe.

### Upgrading from a Previous Version

**Already have Mossy installed on your desktop?** Here's how to safely upgrade:

> 📘 **Detailed Guide:** See [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) for complete upgrade instructions and troubleshooting.

#### ✅ Safe Upgrade Process (Recommended)

1. **Download** the new version installer from [GitHub Releases](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest)
2. **Close** Mossy completely (check system tray if it's running in background)
3. **Run** the new installer
   - The installer will detect your existing installation
   - Choose "Install" - it will automatically upgrade over the existing version
4. **Your data is preserved:**
   - ✅ Settings and preferences
   - ✅ Memory Vault content
   - ✅ API keys
   - ✅ Project configurations
   - ✅ Tutorial progress

**Quick Summary:** The installer safely upgrades without conflicts. Your data stays in `%APPDATA%/mossy-desktop/` and is automatically preserved.

#### 📁 What Gets Preserved

The installer **keeps** all your user data:
- Settings stored in: `%APPDATA%/mossy-desktop/` (Windows)
- Memory Vault data
- Encrypted API keys
- Recent projects list

The installer **replaces**:
- Application files
- Built-in knowledge base
- System dependencies

#### ⚠️ If You Have Issues

**Option 1: Clean Reinstall (keeps settings)**
1. Uninstall the current version via Windows Settings → Apps
2. Your data stays in `%APPDATA%/mossy-desktop/`
3. Install the new version
4. Settings will be automatically restored

**Option 2: Fresh Start (removes everything)**
1. Uninstall via Windows Settings → Apps
2. Delete: `%APPDATA%/mossy-desktop/` (backs up your settings first if needed)
3. Install the new version
4. Will run the first-time setup again

#### 💡 Pro Tips

- **Back up your Memory Vault**: Settings → Memory Vault → Export before major upgrades
- **Note your API keys**: Settings are preserved, but it's good to have backups
- **Check release notes**: Review changes at [Releases page](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases)

### Building from Source

Prefer to build from source? See the [Development Setup](#-quick-start-development-setup) section below.

### 🤖 Automated Releases with GitHub Actions

**New!** Mossy now uses GitHub Actions to build and release automatically from GitHub's infrastructure. This bypasses local network bottlenecks and provides fast, reliable releases.

**Quick Start:**
1. Go to [Actions tab](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/actions)
2. Select **"Release Build and Upload"**
3. Click **"Run workflow"** → Enter version → Wait 20 minutes
4. Download from [Releases tab](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases)

**Benefits:**
- ✅ No local bandwidth used for uploads
- ✅ Builds on GitHub's fast servers
- ✅ Parallel builds (Universal + NVIDIA)
- ✅ Automatic release creation
- ✅ 30-day artifact backup

**Learn More:**
- 📖 [Quick Release Guide](QUICK_RELEASE_GUIDE.md) - 3-step process
- 📚 [Full GitHub Actions Guide](GITHUB_ACTIONS_RELEASE_GUIDE.md) - Complete documentation

---

## 💖 Support This Project

Mossy is **100% free** and will always remain free. If you find it helpful, consider supporting development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/POINTYTHRUNDRA654)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/mossy)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/mossy)
[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/mossy)

Your support helps:
- 💰 Cover AI API costs (OpenAI, embeddings)
- 🚀 Fund continued development and new features
- 📚 Expand the Fallout 4 knowledge base
- ☕ Keep the developer caffeinated
- 🎮 Enable future versions for other games

**Can't donate?** No problem! You can also help by:
- ⭐ Starring this repository
- 📢 Sharing Mossy with the Fallout 4 modding community
- 🐛 Reporting bugs and issues
- 📖 Contributing to the knowledge base

> **Note:** The sponsorship links above are placeholders. See [SPONSORSHIP_SETUP_GUIDE.md](SPONSORSHIP_SETUP_GUIDE.md) for setup instructions.

## 🎯 What's Inside

**Mossy** is a focused, lean toolkit with only real, working features. All modules are production-ready and tested. See onboarding notes above for new user guidance.

### Core Modules

#### 🤖 **Mossy AI Engine** (Hybrid Intelligence)
- Real-time voice conversation (local Windows voices by default; optional STT providers)
- **Local ML Inference** - Support for Ollama (Llama 3) for private, offline assistance
- **Memory Vault (RAG)** - Ingest custom tutorials and documentation to expand Mossy's "brain"
- **Community Knowledge Sharing** - Share and import knowledge with other Mossy users
- Custom avatar support with image uploads
- Mode detection: listening, processing, speaking
- Fallout 4 modding knowledge base (Modern 2025 Standards)
- Text and voice input/output

#### 📚 **Memory Vault** (Community Knowledge System)
- **Upload Multiple Formats** - PDF, text, video (with transcription), and audio files
- **RAG Integration** - All ingested content becomes searchable and AI-accessible
- **Community Sharing** - Mark knowledge items for sharing with other users
- **Export/Import** - JSON-based knowledge packs you can share via GitHub/Discord
- **Trust Levels** - Personal, Community, or Official classification
- **Privacy First** - Only explicitly marked items are shared; private notes stay private
- **Credit Preservation** - Always maintains original author attribution
- **Offline Transcription** - Optional whisper.cpp support for local video/audio transcription
- See [COMMUNITY_KNOWLEDGE_SHARING.md](COMMUNITY_KNOWLEDGE_SHARING.md) for detailed guide

#### 🧠 **Neural Link** (Direct Tool Integration)
- **Active Process Monitoring** - Monitors Blender, Creation Kit, xEdit, and NifSkope in real-time
- **Session Awareness** - Mossy adjusts advice based on which tool you have active
- **Standards Alignment** - One-click generation of alignment scripts (1.0 Scale / 30 FPS) for Blender

#### 🔍 **The Auditor** (Asset Analysis)
- **ESP file analysis** - TES4 header validation, record counting, file size limits
- **NIF file analysis** - Vertex/triangle counts, texture path validation, performance warnings
- **DDS file analysis** - Format detection, resolution validation, power-of-2 checks, compression type analysis
- **Absolute path detection** - Finds hardcoded C:\ and D:\ references that break mod portability

#### 🎨 **Image Suite** (PBR Texture Generation)
- Normal map generation (Sobel edge detection)
- Roughness map from luminance inversion
- Height map extraction (grayscale conversion)
- Metallic map via edge detection
- Ambient Occlusion map from luminance variance
- Real image processing via sharp library

#### � **Phase 1B: RTX Remix Texture Enhancement** (Neural Upscaling)
- **AI-Powered Texture Upscaling** - 4x, 8x, 16x resolution enhancement via neural networks
- **Intelligent Material Analysis** - Automatic classification of diffuse, normal, specular, roughness, metallic, AO textures
- **Normal Map Sharpening** - Unsharp mask detail enhancement for surface topology
- **Real PIL/Pillow Processing** - LANCZOS resampling for artifact-free upscaling
- **Material Manifest** - Preserves PBR metadata and texture definitions (.mossy_material.json)
- **Blender Pipeline Integration** - GPU-accelerated enhancement via BridgeServer
- **Progress Tracking** - Real-time job status and texture processing updates
- See [TEXTURE_ENHANCER_IMPLEMENTATION.md](TEXTURE_ENHANCER_IMPLEMENTATION.md) for technical details

#### 📦 **Bethel** (Bethesda Enhanced Texture Enhancement Layer)
- **Automatic Mod Enhancement Workflow** - Drag-drop upload → Analyze → Enhance → Export
- **Job Registry System** - Persistent storage with 7-day auto-cleanup and progress tracking
- **Multiple Export Formats**:
  - 📦 **ZIP Package** - Compressed archive with textures and README (optimal for mod managers)
  - 🎯 **FOMOD Installer** - Professional Fallout Mod Organizer package with installer UI
  - 📂 **Default Format** - Raw directory structure for manual installation
- **Real-Time Progress Streaming** - WebContents event system for live job updates
- **Texture Statistics** - Automatic analysis of texture counts, types, and sizes
- **Material Preservation** - Includes material manifest and metadata in exports
- **Error Recovery** - Automatic retry logic and cleanup for failed jobs
- **UI Integration** - Drag-drop interface with job history and download management
- **Archiver Support** - Professional-grade ZIP creation with max compression (level 9)
- **FOMOD Config Generation** - Auto-generates ModuleConfig.xml and Info.xml for proper installer UI
- See [BETHEL_INTEGRATION_GUIDE.md](BETHEL_INTEGRATION_GUIDE.md) for complete guide

#### �🛠️ **Workshop** (Development Tools)
- Papyrus script compilation
- File browser and management
- Tool path configuration
- Real system integration

#### 📦 **The Assembler** (FOMOD Creation)
- Graphical FOMOD package creator
- Step/group/plugin management
- Conditional logic setup
- Export to standard format

#### 🖥️ **Desktop Bridge** (System Integration)
- Detect installed programs (Blender, xEdit, LOOT, Creation Kit, etc.)
- Launch applications with file paths
- System program detection and automation

#### �️ **CK Crash Prevention Engine** (Safety System)
- **Pre-Launch Validation** - Analyze plugins before opening in Creation Kit
- **Risk Assessment** - 0-100% crash risk score based on file analysis
- **Real-Time Monitoring** - Track CK memory, CPU, handles every 2 seconds
- **Crash Log Analysis** - Automatic diagnosis of crash causes and solutions
- **Prevention Plans** - Step-by-step guides to reduce crash risk
- **Common Pattern Detection** - Recognizes memory overflow, navmesh crashes, precombine conflicts
- **Proactive Warnings** - Alerts when memory approaches 4GB limit (32-bit CK)
- See [CK_CRASH_PREVENTION_GUIDE.md](CK_CRASH_PREVENTION_GUIDE.md) for detailed usage

#### �📊 **System Monitor**
- Real-time CPU usage
- RAM consumption tracking
- GPU memory monitoring
- System information display

#### 🏛️ **The Vault** (Asset Management)
- Asset file management
- DDS dimension reading
- Metadata organization
- Import/export capabilities

#### 📝 **The Scribe** (Code Editor)
- Text editor with syntax highlighting
- Tool path management
- Script editing with line numbers
- **NEW**: Gradio Python Code Assistant - AI-powered Python writing with templates, formatting, and validation

#### 🎮 **Holodeck** (Testing & Launch)
- Game launch configuration
- Test load order management
- Log file monitoring

#### 📚 **Reference Modules**
- **Lorekeeper** - LOD and precombine guides
- **TTSPanel** - Text-to-speech support
- **Reference Library** - FO4 modding documentation

## ✨ Key Features

- ✅ **Hybrid AI Integration** - Choose between OpenAI/Groq (cloud) or local Ollama (private)
- ✅ **Memory Vault (RAG)** - Upload your own PDF/Text tutorials to train Mossy on your specific needs
- ✅ **Active Neural Link** - Real-time monitoring of your modding tools (Blender, CK, xEdit)
- ✅ **Modern Standards** - Built-in support for Blender 4.1 metrics (1.0 scale, 30 FPS)
- ✅ **Production Asset Analysis** - Real binary format reading for NIF/DDS/ESP
- ✅ **Advanced Image Processing** - Real Sobel operators and image algorithms
- ✅ **Neural Texture Enhancement** - 4x/8x/16x AI upscaling with LANCZOS resampling and normal map sharpening
- ✅ **Bethel Auto-Enhancement** - One-click mod upload → enhance → export workflow with job persistence
- ✅ **Professional Packaging** - ZIP and FOMOD export formats with auto-generated installers
- ✅ **Gradio Python Assistant** - Interactive web UI for Python code writing with templates, formatting, and validation
- ✅ **Zero Fake Features** - Everything is functional and tested
- ✅ **Real IPC Bridge** - Direct Electron API access for system operations

## 🌍 UI Language

Mossy supports UI language selection on first launch (and later in Settings).

Current UI languages:
- English (`en`)
- Español (`es`)
- Français (`fr`)
- Deutsch (`de`)
- Русский (`ru`)
- 中文（简体）(`zh-Hans`)

## 🏗️ Architecture

### Technology Stack

- **Electron** - Cross-platform desktop framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Cloud AI (optional)** - Real AI integration (OpenAI/Groq), or stay local
- **sharp** - Real image processing library
- **Electron IPC** - Real system integration

### Project Structure

```
desktop-ai-assistant/
├── src/
│   ├── main/               # Electron main process
│   │   ├── main.ts         # Entry point, window management, IPC
│   │   ├── preload.ts      # Secure contextBridge API
│   │   └── store.ts        # Data persistence (lowdb)
│   ├── renderer/           # React renderer process
│   │   ├── src/
│   │   │   ├── App.tsx     # Main React component
│   │   │   ├── main.tsx    # React entry point
│   │   │   └── styles.css  # Global styles
│   │   └── index.html      # HTML entry
│   ├── shared/             # Shared code between main and renderer
│   │   └── types.ts        # TypeScript interfaces
│   └── integrations/       # System integration modules
│       ├── README.md       # Integration documentation
│       └── hello-world.ts  # Example integration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🚀 Getting Started

> **👨‍💻 For Developers:** If you have this repository cloned and need to pull the latest fixes, see [GIT_UPDATE_GUIDE.md](GIT_UPDATE_GUIDE.md) for GitHub Desktop instructions.

---

## 🏁 Quick Start (Development Setup)

Want to build from source or contribute? Follow these steps:

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/POINTYTHRUNDRA654/mossy-ai.git
   cd mossy-ai
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
   
   **Troubleshooting Installation:**
   
   If you encounter crashes during `npm run dev` or `npm run package`, the issue is likely missing binaries:
   
   - **Error: "Electron failed to install correctly"**
     ```bash
     npm rebuild electron
     ```
   
   - **Error: "concurrently: not found"**
     ```bash
     npm install  # Dependencies weren't installed
     ```
   
   - **Network restrictions preventing chromedriver/puppeteer downloads:**
     - These are optional dependencies for automated testing
     - The app will work without them
     - If needed, install manually or use `npm install --ignore-scripts` and then `npm rebuild electron`
   
   The postinstall script automatically checks for critical dependencies and will warn if something is missing.

3. (Optional) Install Python dependencies for Gradio Code Assistant:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Set development API keys (Electron main only):
   - Create `.env.local` in the project root and add any keys you want to use in dev.
   - Example:
     ```env
     OPENAI_API_KEY=your-api-key-here
     GROQ_API_KEY=your-key-here
     ELEVENLABS_API_KEY=your-key-here
     ```
   - Security note: do not put secrets in `VITE_*` variables (Vite exposes those to the renderer).

### Development
Start the development server:
```bash
npm run dev
```
This will:
1. Start Vite dev server for the renderer (port 5174)
2. Launch Electron with hot reload enabled
3. Open DevTools automatically

_Note: Vite (build/dev server) is v7.x; Vitest (the test runner) is v4.x — the `v4.x` version you see in test output refers to Vitest, not Vite._

### Building
Build the application for production:
```bash
npm run build
```

This creates:
- `dist/` - Compiled renderer files
- `dist-electron/` - Compiled main process files

### Packaging

Create distributable packages:

```bash
npm run package
```

Outputs to `release/` directory:
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage`

## 🎯 Core Features (Current Implementation)

### ✅ Implemented

- [x] Electron + React + TypeScript scaffold
- [x] Secure IPC communication via contextBridge
- [x] Basic chat UI with message history
- [x] Persistent storage with lowdb
- [x] Settings management
- [x] Web Speech API integration (TTS/STT in browser)
- [x] Integration framework with examples
- [x] MIT License
- [x] ESLint + Prettier setup

### 🚧 TODO: Remaining Tasks


## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **yarn**

### Installation

```bash
# Clone repository
git clone https://github.com/POINTYTHRUNDRA654/mossy-ai.git
cd mossy-ai

# Install dependencies
npm install

# (Optional) Set dev-only API keys for Electron main
echo "OPENAI_API_KEY=your_key_here" > .env.local
```

### Development

```bash
npm run dev
```

Starts:
- Vite dev server (port 5174)
- Electron with hot reload
- Auto-opening DevTools

### Production Build

```bash
npm run build        # Build all
npm run package:win  # Windows installer
```

Installer output goes to `release/` (for example: `Mossy Setup 5.6.0.exe`).

---

## 📦 What's NOT Included

For transparency, these modules were removed because they had no real functionality:

- ❌ Save Parser (fake save file reading)
- ❌ Patch Generator (no real patching)
- ❌ Mod Distribution (was demo only)
- ❌ Load Order Analyzer (fake sorting)
- ❌ Live Game Monitor (no actual monitoring)
- ❌ File Watcher (demo only)
- ❌ Backup Manager (fake backups)
- ❌ Performance Predictor (no calculations)
- ❌ AutoCompiler (template only)
- ❌ ConflictGraph (visualization only)
- ❌ AssetOptimizer (no optimization)
- ❌ Quest Editor (UI mockup)
- ❌ Quest Automation (no real automation)
- ❌ BA2Manager (didn't work)
- ❌ Voice Commands (speech parsing only)
- ❌ Popular Mods Database (hardcoded data)
- ❌ 15+ "The..." sample data modules

**Why removed?** Real, working features are better than 30 fake ones. Mossy is now lean and trustworthy.

## 🔑 API Configuration

This app does not use Google / Gemini.

- Preferred: configure keys inside the Desktop app Settings UI (stored in the Electron main process and never exposed to the renderer).
- Optional (dev only): set main-process env vars in `.env.local`:
   - `OPENAI_API_KEY`
   - `GROQ_API_KEY`
   - `ELEVENLABS_API_KEY`

Note: Do not put secrets in `VITE_*` env vars. Vite exposes `VITE_*` to the renderer.

## 🎨 Customizing Mossy's Avatar

Users can upload custom avatars in the app. The default avatar is a beautiful 3D rendered blue-white face with flowing red/orange hair and golden spheres.

To change the default avatar:
1. Place image in `public/mossy-avatar.png`
2. Restart app

Users can also upload custom avatars via AvatarCard in the app.

## 🧪 Testing

Run the full test suite:

```bash
npm test              # Run all unit tests (111 tests)
npm run test:watch    # Run tests in watch mode
npm run smoke         # Run linting + tests
npm run verify        # Run linting + tests + build
```

Run E2E tests (requires full Electron installation):

```bash
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
npm run test:e2e:debug   # Debug E2E tests
```

For detailed test results, see [TEST_REPORT.md](TEST_REPORT.md).

## 📊 Quality Assurance

Mossy has undergone comprehensive quality auditing to ensure all features are functional and professional:

- ✅ **Build Status**: Passing - Application compiles without errors
- ✅ **Security Scan**: 0 Vulnerabilities (CodeQL JavaScript analysis)
- ✅ **Test Coverage**: 20+ test suites covering core functionality
- ✅ **Code Quality**: TypeScript strict mode, ESLint, Prettier
- ✅ **Real Data**: All mock data replaced with real system metrics
- ✅ **Documentation**: Comprehensive guides and accurate feature descriptions
- 📄 **Audit Report**: See [PAGE_AUDIT_COMPLETE.md](PAGE_AUDIT_COMPLETE.md) for detailed results

### Production Ready Checklist
- ✅ No fake data or misleading features
- ✅ All features work as designed or clearly labeled as demos
- ✅ Correct game-specific content (Fallout 4 throughout)
- ✅ Real system integration via Electron IPC
- ✅ Professional error handling and user feedback
- ✅ Security best practices followed

## 📊 Project Stats

- **Working Modules**: 11
- **Lines of Real Code**: ~15,000+
- **Zero Fake Features**: ✅
- **Production Ready**: ✅
- **Test Coverage**: 111 unit tests across 12 test files

## 📝 License

MIT - See [LICENSE](LICENSE) file

## 🙏 Credits

Built with Electron, React, and TypeScript.

- **macOS**: Accessibility permissions in System Preferences
- **Windows**: No special permissions required
- **Linux**: Varies by desktop environment

## 📝 Development Notes

### Code Style

- **TypeScript** everywhere for type safety
- **ESLint** for code quality
- **Prettier** for consistent formatting
- Run `npm run lint` and `npm run format` before committing

### TODOs in Code

Look for `TODO:` comments throughout the codebase for areas that need implementation:
- `src/main/main.ts` - LLM API integration, tray icon, hotkeys
- `src/main/store.ts` - Consider SQLite migration
- `src/renderer/src/App.tsx` - Backend TTS/STT providers

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Build tool: [Vite](https://vitejs.dev/)
- Icons: System emoji

---

## PRP/Previsbines Documentation Index

- Deep dive fundamentals: [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md)
- PRP notes (74+ / 78): [PRP_PATCH_NOTES_74_PLUS.md](PRP_PATCH_NOTES_74_PLUS.md)
- Scripts overview: [PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md](PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md)
- Scripts index + setup: [PJM_SCRIPTS_INDEX.md](PJM_SCRIPTS_INDEX.md)
- Lighting/environment patching: [CREATING_LIGHTING_ENVIRONMENT_PATCHES.md](CREATING_LIGHTING_ENVIRONMENT_PATCHES.md)
- Generate within an existing mod: [GENERATING_PREVISBINES_FOR_EXISTING_MOD.md](GENERATING_PREVISBINES_FOR_EXISTING_MOD.md)
- CK crash troubleshooting: [RESOLVING_CREATION_KIT_CRASHES.md](RESOLVING_CREATION_KIT_CRASHES.md)

## Blender Docs

- Consolidated guide: [`BLENDER_MASTER_GUIDE.md`](BLENDER_MASTER_GUIDE.md) — single entry for Installation, UI overview, Modeling & Meshing, Animation & Rigging, and Keymaps.
- Detailed reference pages remain available under `resources/public/knowledge/` (individual `BLENDER_*` files).
- Legacy/root duplicates have been moved to `/docs/archive/` where applicable.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions

---

**Note**: This is an initial scaffold. Many features are placeholders and require implementation. See the TODO section above for details on what needs to be completed to reach a fully functional AI assistant.

## Blender Add-ons & Headless Runner
- See [scripts/blender/README_BLENDER_ADDONS.md](scripts/blender/README_BLENDER_ADDONS.md) for install and usage.
- Headless execution helper: [scripts/blender/run_blender_ops.ps1](scripts/blender/run_blender_ops.ps1)
   - Example (PowerShell):
      - Move X by One: `./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\Path\To\scene.blend" -Operator move_x -EnableAutoExec`
      - Cursor Array: `./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\Path\To\scene.blend" -Operator cursor_array -Total 8 -EnableAutoExec`
- Script execution controls: [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](resources/public/knowledge/BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)
- Tutorial: [BLENDER_ADDON_TUTORIAL.md](resources/public/knowledge/BLENDER_ADDON_TUTORIAL.md)
- About Blender: [BLENDER_ABOUT.md](resources/public/knowledge/BLENDER_ABOUT.md)
- Blender History: [BLENDER_HISTORY.md](resources/public/knowledge/BLENDER_HISTORY.md)
- GPL Overview: [BLENDER_GPL_OVERVIEW.md](resources/public/knowledge/BLENDER_GPL_OVERVIEW.md)
- Blender Community: [BLENDER_COMMUNITY.md](resources/public/knowledge/BLENDER_COMMUNITY.md)
- Installing Blender: [BLENDER_INSTALLING.md](resources/public/knowledge/BLENDER_INSTALLING.md)
- Installing on Linux: [BLENDER_INSTALLING_LINUX.md](resources/public/knowledge/BLENDER_INSTALLING_LINUX.md)

## 🐍 Python Code Assistant (Gradio)

Mossy includes a Gradio-powered Python code assistant for writing, formatting, and validating Python scripts:

### Quick Start
```bash
# Install Python dependencies
pip install -r requirements.txt

# Launch the Gradio interface
python launch_gradio.py
```

The interface will open at `http://127.0.0.1:7860` with features including:
- **Code Templates**: Papyrus pseudocode, Blender scripts, Python utilities
- **Syntax Validation**: Real-time Python syntax checking
- **Code Formatting**: Black and autopep8 formatters
- **Safe Execution**: Sandboxed code execution with output capture

See **[GRADIO_PYTHON_ASSISTANT.md](GRADIO_PYTHON_ASSISTANT.md)** for complete documentation.

