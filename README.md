# Mossy - The Fallout 4 Modding Assistant

**Mossy v5.4.23** - A production-ready Electron desktop application for Fallout 4 modding with AI assistance, real-time analysis, direct-write scripting, and professional asset optimization.

---

## 🚀 Onboarding & Installer Notes (v5.4.23)

**New in v5.4.23:**
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
- Version is auto-set from `package.json` (currently 5.4.23)
- See **[PACKAGING_GUIDE.md](PACKAGING_GUIDE.md)** for complete packaging instructions
- Run `node scripts/fix-env-encryption.mjs` before packaging to ensure API keys work

**Onboarding:**
- See [BLENDER_ADDON_TUTORIAL.md](resources/public/knowledge/BLENDER_ADDON_TUTORIAL.md) for Blender scripting
- See [ANIMATION_SUITE_IMPLEMENTATION.md](resources/public/knowledge/ANIMATION_SUITE_IMPLEMENTATION.md) for animation workflow
- See [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](resources/public/knowledge/BLENDER_SCRIPT_EXECUTION_CHECKLIST.md) for script execution and trust

---

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)
![Version](https://img.shields.io/badge/version-5.4.23-blue.svg)

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

#### 🛠️ **Workshop** (Development Tools)
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

---

## 🏁 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/POINTYTHRUNDRA654/desktop-tutorial.git
   cd desktop-tutorial
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
git clone https://github.com/POINTYTHRUNDRA654/desktop-tutorial.git
cd desktop-tutorial

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

Installer output goes to `release/` (for example: `Mossy Setup 5.4.23.exe`).

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

### Modeling
- Modeling Guide: [BLENDER_MODELING_GUIDE.md](BLENDER_MODELING_GUIDE.md)
- Meshes Guide: [BLENDER_MESHES_GUIDE.md](BLENDER_MESHES_GUIDE.md)
- Mesh Tools Guide: [BLENDER_MESH_TOOLS_GUIDE.md](BLENDER_MESH_TOOLS_GUIDE.md)
- Mesh Selection and Creation Tools: [BLENDER_MESH_SELECTION_AND_CREATION_TOOLS.md](BLENDER_MESH_SELECTION_AND_CREATION_TOOLS.md)
- Advanced Mesh Selection Tools: [BLENDER_ADVANCED_MESH_SELECTION_TOOLS.md](BLENDER_ADVANCED_MESH_SELECTION_TOOLS.md)
- Selection Loops and Linked Geometry: [BLENDER_SELECTION_LOOPS_AND_LINKED_GUIDE.md](BLENDER_SELECTION_LOOPS_AND_LINKED_GUIDE.md)
- By Attribute & Mesh Operators: [BLENDER_ATTRIBUTE_AND_MESH_OPERATORS_GUIDE.md](BLENDER_ATTRIBUTE_AND_MESH_OPERATORS_GUIDE.md)
 - Transform Operators: [BLENDER_TRANSFORM_OPERATORS_GUIDE.md](BLENDER_TRANSFORM_OPERATORS_GUIDE.md)

### Installation & Setup
- Installing (General): [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
- Installing on Linux: [BLENDER_INSTALLING_LINUX.md](BLENDER_INSTALLING_LINUX.md)
- Installing on macOS: [BLENDER_INSTALLING_MAC.md](BLENDER_INSTALLING_MAC.md)
- Installing on Windows: [BLENDER_INSTALLING_WINDOWS.md](BLENDER_INSTALLING_WINDOWS.md)
- Installing from Steam: [BLENDER_INSTALLING_STEAM.md](BLENDER_INSTALLING_STEAM.md)
- Preferences: [BLENDER_PREFERENCES.md](BLENDER_PREFERENCES.md)
- Configuring Peripherals: [BLENDER_CONFIGURING_PERIPHERALS.md](BLENDER_CONFIGURING_PERIPHERALS.md)
- Help System: [BLENDER_HELP_SYSTEM.md](BLENDER_HELP_SYSTEM.md)
- Window System Introduction: [BLENDER_WINDOW_SYSTEM_INTRODUCTION.md](BLENDER_WINDOW_SYSTEM_INTRODUCTION.md)
- Splash Screen: [BLENDER_SPLASH_SCREEN.md](BLENDER_SPLASH_SCREEN.md)
- Topbar: [BLENDER_TOPBAR.md](BLENDER_TOPBAR.md)
- Workspaces: [BLENDER_WORKSPACES.md](BLENDER_WORKSPACES.md)
- Status Bar: [BLENDER_STATUS_BAR.md](BLENDER_STATUS_BAR.md)
- Areas: [BLENDER_AREAS.md](BLENDER_AREAS.md)
- Regions: [BLENDER_REGIONS.md](BLENDER_REGIONS.md)
- Tabs & Panels: [BLENDER_TABS_AND_PANELS.md](BLENDER_TABS_AND_PANELS.md)
- Keymap: [BLENDER_KEYMAP.md](BLENDER_KEYMAP.md)
- Default Keymap: [BLENDER_KEYMAP_DEFAULT.md](BLENDER_KEYMAP_DEFAULT.md)
- Industry Compatible Keymap: [BLENDER_KEYMAP_INDUSTRY_COMPATIBLE.md](BLENDER_KEYMAP_INDUSTRY_COMPATIBLE.md)
- UI Buttons: [BLENDER_UI_BUTTONS.md](BLENDER_UI_BUTTONS.md)
- UI Input Fields: [BLENDER_UI_INPUT_FIELDS.md](BLENDER_UI_INPUT_FIELDS.md)
- UI Menus: [BLENDER_UI_MENUS.md](BLENDER_UI_MENUS.md)
- UI Eyedropper: [BLENDER_UI_EYEDROPPER.md](BLENDER_UI_EYEDROPPER.md)
- UI Decorators: [BLENDER_UI_DECORATORS.md](BLENDER_UI_DECORATORS.md)
- UI Data-Block Menu: [BLENDER_UI_DATA_BLOCK_MENU.md](BLENDER_UI_DATA_BLOCK_MENU.md)
- UI List View: [BLENDER_UI_LIST_VIEW.md](BLENDER_UI_LIST_VIEW.md)
- UI Color Picker: [BLENDER_UI_COLOR_PICKER.md](BLENDER_UI_COLOR_PICKER.md)
- UI Color Ramp Widget: [BLENDER_UI_COLOR_RAMP_WIDGET.md](BLENDER_UI_COLOR_RAMP_WIDGET.md)
- UI Color Palette: [BLENDER_UI_COLOR_PALETTE.md](BLENDER_UI_COLOR_PALETTE.md)
- UI Curve Widget: [BLENDER_UI_CURVE_WIDGET.md](BLENDER_UI_CURVE_WIDGET.md)
- UI Tool System: [BLENDER_UI_TOOL_SYSTEM.md](BLENDER_UI_TOOL_SYSTEM.md)
- UI Operators: [BLENDER_UI_OPERATORS.md](BLENDER_UI_OPERATORS.md)
- UI Undo & Redo: [BLENDER_UI_UNDO_REDO.md](BLENDER_UI_UNDO_REDO.md)
- UI Annotations: [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md)
- UI Selecting: [BLENDER_UI_SELECTING.md](BLENDER_UI_SELECTING.md)
- UI Nodes: [BLENDER_UI_NODES.md](BLENDER_UI_NODES.md)
- UI Node Editors: [BLENDER_UI_NODE_EDITORS.md](BLENDER_UI_NODE_EDITORS.md)
- UI Node Parts: [BLENDER_UI_NODE_PARTS.md](BLENDER_UI_NODE_PARTS.md)
- UI Selecting Nodes: [BLENDER_UI_SELECTING_NODES.md](BLENDER_UI_SELECTING_NODES.md)
- UI Arranging Nodes: [BLENDER_UI_ARRANGING_NODES.md](BLENDER_UI_ARRANGING_NODES.md)
- UI Editing Nodes: [BLENDER_UI_EDITING_NODES.md](BLENDER_UI_EDITING_NODES.md)
- UI Common Nodes: [BLENDER_UI_COMMON_NODES.md](BLENDER_UI_COMMON_NODES.md)
- UI Enable Output Node: [BLENDER_UI_ENABLE_OUTPUT_NODE.md](BLENDER_UI_ENABLE_OUTPUT_NODE.md)
- UI Common Utilities Nodes: [BLENDER_UI_COMMON_UTILITIES_NODES.md](BLENDER_UI_COMMON_UTILITIES_NODES.md)
- UI Node Bundles: [BLENDER_UI_NODE_BUNDLES.md](BLENDER_UI_NODE_BUNDLES.md)
- UI Combine Bundle Node: [BLENDER_UI_COMBINE_BUNDLE_NODE.md](BLENDER_UI_COMBINE_BUNDLE_NODE.md)
- UI Separate Bundle Node: [BLENDER_UI_SEPARATE_BUNDLE_NODE.md](BLENDER_UI_SEPARATE_BUNDLE_NODE.md)
- UI Join Bundle Node: [BLENDER_UI_JOIN_BUNDLE_NODE.md](BLENDER_UI_JOIN_BUNDLE_NODE.md)
- UI Node Closures: [BLENDER_UI_NODE_CLOSURES.md](BLENDER_UI_NODE_CLOSURES.md)
- UI Layout Nodes: [BLENDER_UI_LAYOUT_NODES.md](BLENDER_UI_LAYOUT_NODES.md)
- UI Editors: [BLENDER_UI_EDITORS.md](BLENDER_UI_EDITORS.md)
- UI 3D Viewport: [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md)
- UI Viewport Controls: [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md)
- UI Proportional Editing: [BLENDER_UI_PROPORTIONAL_EDITING.md](BLENDER_UI_PROPORTIONAL_EDITING.md)
- UI Interactive Mesh Tools: [BLENDER_UI_INTERACTIVE_MESH_TOOLS.md](BLENDER_UI_INTERACTIVE_MESH_TOOLS.md)
- UI Image Editor and Scenes: [BLENDER_UI_IMAGE_EDITOR_AND_SCENES.md](BLENDER_UI_IMAGE_EDITOR_AND_SCENES.md)
- UI Transform: [BLENDER_UI_TRANSFORM.md](BLENDER_UI_TRANSFORM.md)
- UI Object Parenting and Properties: [BLENDER_UI_OBJECT_PARENTING_PROPERTIES.md](BLENDER_UI_OBJECT_PARENTING_PROPERTIES.md)
- About Blender: [BLENDER_ABOUT.md](BLENDER_ABOUT.md)
- Add-on Tutorial: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
- Script Execution Checklist: [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)
- GPL Overview: [BLENDER_GPL_OVERVIEW.md](BLENDER_GPL_OVERVIEW.md)
- Community: [BLENDER_COMMUNITY.md](BLENDER_COMMUNITY.md)
- History: [BLENDER_HISTORY.md](BLENDER_HISTORY.md)
- Headless runner & examples: [scripts/blender/README_BLENDER_ADDONS.md](scripts/blender/README_BLENDER_ADDONS.md)

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
- Script execution controls: [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)
- Tutorial: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
- About Blender: [BLENDER_ABOUT.md](BLENDER_ABOUT.md)
- Blender History: [BLENDER_HISTORY.md](BLENDER_HISTORY.md)
- GPL Overview: [BLENDER_GPL_OVERVIEW.md](BLENDER_GPL_OVERVIEW.md)
- Blender Community: [BLENDER_COMMUNITY.md](BLENDER_COMMUNITY.md)
- Installing Blender: [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
- Installing on Linux: [BLENDER_INSTALLING_LINUX.md](BLENDER_INSTALLING_LINUX.md)

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

