# Mossy v5.4.23 - Quick Start (5 minutes)

**Welcome to Mossy!** This guide gets you from install → first launch → first useful action.

## 1) Install (Windows)

1. Download the latest Windows installer (for example: `Mossy Setup 5.4.23.exe`).
2. Run the installer and follow the prompts.
3. Launch Mossy from the Start Menu or desktop shortcut.

## 2) First Launch (Onboarding)

On first run, Mossy walks you through a quick setup:

1. **Pick your UI language** (Auto/system, English, Español, Français, Deutsch, Русский, 中文（简体）).
2. **System Scan** finds modding tools installed on your PC.
3. **Tool Permissions** grant explicit approval for direct-write and automation features.
4. **Privacy Settings** configure data sharing (default: nothing shared).
5. **Setup Complete** - you're ready to mod!

You can change settings later in Settings.

## 3) Configure AI (Optional)

Mossy works in a “local-first” way, but some features use external providers if you enable them.

- Open **Settings → AI/Voice** and choose your provider(s).
- If you choose a cloud provider, enter your API key in Settings.

## 4) Use the Install Wizard (Recommended)

Open **Install Wizard** for guided checklists (xEdit/FO4Edit setup, PRP, SS2, patch-building, and verification).

## What is Mossy?

Mossy is a professional Fallout 4 modding dashboard. Unlike other tools, Mossy uses **zero simulated data**. Everything you see is derived from real-time system monitoring and file analysis.

- 🤖 **Hybrid AI** - Use OpenAI/Groq (cloud) or Ollama (Local/Private).
- 🧠 **Memory Vault** - Feed Mossy custom tutorials to create your own modding RAG.
- 🔗 **Neural Link** - Real-time monitoring of Blender, Creation Kit, xEdit, and NifSkope with session awareness.
- ⚡ **Direct-Write Protocol** - Direct script writing to Papyrus, xEdit, and Blender (with explicit permission).
- 🚀 **Headless Automation** - Batch execution and automation for Blender operations.
- 🔍 **Asset Analysis** - Real binary validation of NIF, DDS, and ESP files.
- 🎨 **PBR Generation** - Apply real Sobel edge detection and luminance algorithms to your textures.
- 🛠️ **Tools Integration** - Direct system link to detect and launch your modding utilities.
- 📊 **System Monitor** - Real-time hardware telemetry (No fake metrics).
- 🔒 **Audit Logging** - Complete audit trail for all direct-write and automation actions.

### Step 3: Train Mossy (Optional but Recommended)
Go to **Memory Vault** and upload any `.txt` or `.md` tutorials you have. Mossy will "digest" these and use them to answer your questions.

### Step 4: Link Your Tools
Launch Blender or the Creation Kit. Mossy's **Neural Link** will pulse green when it detects them, enabling real-time advice.

## 🎯 First Time User

When you launch Mossy for the first time:

1. **Complete onboarding** - Language + tool discovery + approvals.
2. **Open Neural Link** - See which modding tools Mossy is watching.
3. **Check the Vault** - Stage assets and organize outputs.
4. **Try the Workshop/Scribe** - Edit and manage scripts.

## 🔍 Key Features Explained

### 1. Chat Interface (Mossy)
- **Talk to AI** - Natural conversation (cloud or local)
- **Voice Input/Output** - Use your microphone
- **Custom Avatar** - Upload custom avatar image
- **Real-time Status** - See if Mossy is listening, processing, or speaking

### 2. The Auditor (File Analysis)
Go to **The Auditor** to analyze your mod files:

**ESP Files:**
- Reads TES4 header
- Counts records
- Checks file size (max 250MB)

**NIF Files:**
- Counts vertices and triangles
- Lists texture paths
- Detects hardcoded absolute paths (C:\, D:\)
- Warns if too complex (>100k vertices, >50k triangles)

**DDS Files:**
- Detects format (BC1, BC3, BC7, A8R8G8B8, etc.)
- Checks resolution
- Validates power-of-2 dimensions
- Warns if too large (4K+)

### 3. Image Suite (PBR Maps)
Generate texture maps from a base image:

1. **Select Image** - Choose your base texture
2. **Generate Maps** - Creates:
   - Normal map (from edges)
   - Roughness map (from luminance)
   - Height map (grayscale)
   - Metallic map (edge detection)
   - AO map (luminance variance)

### 4. Desktop Bridge (Tools)
Mossy automatically detects:
- ✅ Blender
- ✅ Creation Kit
- ✅ xEdit
- ✅ LOOT
- ✅ And more...

Click "Launch" to open any installed tool.

### 5. System Monitor
Real-time stats:
- CPU usage %
- RAM usage GB
- GPU VRAM available
- System info

### 6. Workshop
For Papyrus scripting:
- Set your Papyrus compiler path
- Compile scripts (.psc)
- View output and errors

### 7. The Assembler
Create FOMOD installers:
1. Create steps
2. Add plugin groups
3. Set conditional logic
4. Export as standard FOMOD

### 8. Holodeck
Test your mod in Fallout 4:
1. Configure game path
2. Set load order
3. Click "Launch Game"
4. Monitor console output

## 🎨 Customize Mossy

### Change Avatar
1. Go to Chat interface
2. Find the avatar section
3. Click "Upload Avatar"
4. Select your image

### Set Tool Paths
1. Go to **Settings → External Tools**
2. Set paths to your:
   - Blender executable
   - Creation Kit
   - xEdit
   - Papyrus compiler
   - etc.

## 🔧 Troubleshooting

### "API Key Missing"
- Check `.env.local` file exists
- Configure keys in the Desktop Settings UI (recommended). For development env vars, use `OPENAI_API_KEY`, `GROQ_API_KEY`.
- Restart app: `npm run dev`

### Tools Not Detected
- Click "Detect Programs" in Desktop Bridge
- Or manually set paths in The Scribe

### Files Won't Analyze
- Make sure file paths are correct
- Try smaller files first
- Check file format is supported (ESP, NIF, DDS)

## 📚 Module Overview

| Module | Purpose | Status |
|--------|---------|--------|
| Mossy Chat | AI conversation | ✅ Working |
| The Auditor | File analysis | ✅ Working |
| Image Suite | Texture generation | ✅ Working |
| Desktop Bridge | Tool detection | ✅ Working |
| System Monitor | Performance stats | ✅ Working |
| The Vault | Asset management | ✅ Working |
| The Scribe | Code editor | ✅ Working |
| Workshop | Papyrus tools | ✅ Working |
| The Assembler | FOMOD creation | ✅ Working |
| Holodeck | Game testing | ✅ Working |
| Lorekeeper | Modding guides | ✅ Working |
| TTSPanel | Text-to-speech | ✅ Working |

## ❌ What's NOT Included

We removed 30+ fake modules to keep Mossy clean and trustworthy. These were removed:

- Demo modules with hardcoded sample data
- Non-functional UI mockups
- Tools that claimed features they didn't have
- Fake AI capabilities

**Why?** Real > Fake. One working tool beats 10 fake ones.

## 🚀 Build for Release

When ready to release:

```bash
# Build for production
npm run build

# Create Windows installer
npm run package:win
```

Installer output goes to `release/` (for example: `Mossy Setup 4.0.0.exe`).

## 📖 Documentation

- [Full README](README.md) - Architecture and features
- [User Guide](USER_GUIDE.md) - Detailed feature documentation
- [Privacy Settings](PRIVACY_ARCHITECTURE.md) - Data privacy details

## 💬 Support

For issues:
1. Check Troubleshooting section above
2. Review error messages in DevTools (Ctrl+Shift+I)
3. Check `.env.local` setup

## 🎉 You're Ready!

You now have Mossy set up and ready to use. Start by:

1. **Chat with Mossy** - Ask about FO4 modding
2. **Analyze a File** - Try The Auditor on one of your mods
3. **Generate a Map** - Create PBR maps in Image Suite
4. **Launch a Tool** - Use Desktop Bridge to launch Blender

Happy modding! 🚀

