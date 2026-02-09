# 📦 Mossy Installation Guide

**Welcome to Mossy v5.4.21** - Your AI-powered Fallout 4 Modding Assistant!

This guide will walk you through installing and setting up Mossy on your Windows PC.

---

## 🚀 Quick Start (3 Steps)

1. **Download** the installer (`Mossy-Setup-5.4.21.exe`)
2. **Run** the installer and follow the prompts
3. **Launch** Mossy and complete the first-run setup

**That's it!** The installation is automatic - just click "Next" a few times.

---

## 📋 System Requirements

### Minimum Requirements
- **OS:** Windows 10 (64-bit) or Windows 11
- **RAM:** 4 GB
- **Storage:** 500 MB free space
- **Screen:** 1280x720 resolution

### Recommended for Best Experience
- **OS:** Windows 11
- **RAM:** 8 GB or more
- **Storage:** 2 GB free space (for knowledge base and cache)
- **Screen:** 1920x1080 or higher
- **Internet:** For cloud AI features (optional - local AI works offline)

### Optional Enhancements
- **NVIDIA GPU:** For faster local AI inference (optional)
- **Microphone:** For voice chat with Mossy (optional)
- **Modding Tools:** Blender, Creation Kit, xEdit (Mossy helps install these)

---

## 📥 Step 1: Download the Installer

### Option A: GitHub Releases (Recommended)
1. Go to the [Releases page](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases)
2. Find the latest version (v5.4.21)
3. Click `Mossy-Setup-5.4.21.exe` to download
4. Save to your Downloads folder

### Option B: Build From Source (Advanced)
```bash
# Clone the repository
git clone https://github.com/POINTYTHRUNDRA654/desktop-tutorial.git
cd desktop-tutorial

# Install dependencies
npm install --legacy-peer-deps

# Build and package
npm run package:win

# Installer will be in release/ folder
```

---

## 🔧 Step 2: Install Mossy

### Installation Process

#### 1. **Launch the Installer**
- Double-click `Mossy-Setup-5.4.21.exe`
- Windows may show a SmartScreen warning (this is normal for new apps)
- Click "More info" → "Run anyway"

#### 2. **Welcome Screen**
```
┌─────────────────────────────────────────┐
│   Welcome to Mossy Setup                │
│                                         │
│   This will install Mossy v5.4.21      │
│   on your computer.                     │
│                                         │
│   Mossy is a Fallout 4 modding         │
│   assistant with AI capabilities.      │
│                                         │
│   [Cancel]              [Next >]        │
└─────────────────────────────────────────┘
```
Click **Next** to continue.

#### 3. **Choose Installation Location**
```
┌─────────────────────────────────────────┐
│   Select Destination                    │
│                                         │
│   Install to:                           │
│   C:\Program Files\Mossy    [Browse...] │
│                                         │
│   Space required: 500 MB                │
│   Space available: 50 GB                │
│                                         │
│   [< Back]    [Cancel]    [Next >]      │
└─────────────────────────────────────────┘
```
- Default location: `C:\Program Files\Mossy`
- Click **Browse** to change location (optional)
- Click **Next** to continue

#### 4. **Select Components**
```
┌─────────────────────────────────────────┐
│   Select Components                     │
│                                         │
│   ☑ Mossy Application (required)        │
│   ☑ Knowledge Base (200+ guides)        │
│   ☐ Desktop Shortcut                    │
│   ☐ Start Menu Shortcut                 │
│                                         │
│   [< Back]    [Cancel]    [Next >]      │
└─────────────────────────────────────────┘
```
- All boxes are checked by default
- Shortcuts are optional but recommended
- Click **Next** to continue

#### 5. **Installing**
```
┌─────────────────────────────────────────┐
│   Installing Mossy...                   │
│                                         │
│   █████████████████████░░░░░ 75%        │
│                                         │
│   Extracting files...                   │
│   Setting up components...              │
│                                         │
│   [Cancel]                              │
└─────────────────────────────────────────┘
```
Wait for installation to complete (usually 30-60 seconds).

#### 6. **Installation Complete**
```
┌─────────────────────────────────────────┐
│   Installation Complete!                │
│                                         │
│   Mossy has been successfully installed │
│                                         │
│   ☑ Launch Mossy now                    │
│                                         │
│   [Finish]                              │
└─────────────────────────────────────────┘
```
- Keep "Launch Mossy now" checked
- Click **Finish** to complete installation

**Installation is complete!** 🎉

---

## 🎯 Step 3: First Launch & Setup

When you launch Mossy for the first time, you'll see a guided setup wizard.

### First-Run Onboarding (6 Steps)

#### Step 1: Welcome & Language
```
┌─────────────────────────────────────────────────────────┐
│  🎨 Welcome to Mossy!                                   │
│                                                         │
│  Your AI-powered Fallout 4 modding assistant           │
│                                                         │
│  Choose your language:                                  │
│  ○ English         ○ Español      ○ Français           │
│  ○ Deutsch         ○ Русский      ○ 中文（简体）         │
│                                                         │
│                              [Next: Getting Started →]  │
└─────────────────────────────────────────────────────────┘
```
**What to do:**
1. Select your preferred language
2. Click "Next" to continue

**What Mossy tells you:**
- "Hi! I'm Mossy, your AI modding assistant"
- "I can help you with Blender, Creation Kit, xEdit, and more"
- "Let's get you set up in just a few steps!"

---

#### Step 2: System Scan & Tool Detection
```
┌─────────────────────────────────────────────────────────┐
│  🔍 Scanning Your System...                             │
│                                                         │
│  Looking for modding tools and compatible software     │
│                                                         │
│  █████████████████████████████░░░░░ 75%                 │
│                                                         │
│  Found:                                                 │
│  ✓ Blender 4.1 (C:\Program Files\Blender Foundation)  │
│  ✓ xEdit (C:\Modding\FO4Edit)                         │
│  ⚠ Creation Kit not found                              │
│                                                         │
│  [Skip Scan]                      [Next: Configure →]  │
└─────────────────────────────────────────────────────────┘
```
**What happens:**
- Mossy automatically scans for installed modding tools
- Shows what was found and what's missing
- No action needed - just watch the progress

**What Mossy tells you:**
- "I'm checking what modding tools you already have"
- "I found Blender and xEdit - great!"
- "Don't worry if something's missing - I'll help you install it later"

---

#### Step 3: Neural Link Calibration
```
┌─────────────────────────────────────────────────────────┐
│  🧠 Neural Link Calibration                             │
│                                                         │
│  I can monitor these tools while you work:              │
│                                                         │
│  ☑ Blender - Track your mesh work and rigging         │
│  ☑ Creation Kit - Monitor scripts and forms            │
│  ☑ xEdit - Watch for conflicts and patches             │
│  ☐ NifSkope - Track model viewing                      │
│                                                         │
│  This helps me give better advice based on what        │
│  you're doing right now.                               │
│                                                         │
│  [Learn More]                [Next: Memory Vault →]    │
└─────────────────────────────────────────────────────────┘
```
**What to do:**
1. Check the tools you want Mossy to monitor
2. Click "Learn More" to understand how Neural Link works
3. Click "Next" to continue

**What Mossy tells you:**
- "Neural Link lets me see what tool you're using"
- "I'll adjust my advice based on your current task"
- "Example: If you open Blender, I'll focus on mesh and rigging help"

---

#### Step 4: Memory Vault (Knowledge Base)
```
┌─────────────────────────────────────────────────────────┐
│  📚 Memory Vault Setup                                  │
│                                                         │
│  I come with 200+ built-in guides, but you can add     │
│  your own tutorials and documentation!                  │
│                                                         │
│  Current Knowledge:                                     │
│  • Blender guides (50+)                                │
│  • Creation Kit tutorials (30+)                        │
│  • Papyrus scripting (25+)                             │
│  • xEdit guides (20+)                                  │
│  • And much more...                                    │
│                                                         │
│  [Browse Knowledge Base]      [Next: AI Setup →]       │
└─────────────────────────────────────────────────────────┘
```
**What to do:**
1. Click "Browse Knowledge Base" to see what's included (optional)
2. Click "Next" to continue

**What Mossy tells you:**
- "I have tons of knowledge about Fallout 4 modding"
- "You can also upload your own PDFs and tutorials"
- "This helps me give more specific answers to your questions"

---

#### Step 5: AI Configuration
```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI Configuration                                    │
│                                                         │
│  Choose how you want to chat with me:                  │
│                                                         │
│  ○ Local AI (Private, works offline)                   │
│    • Uses Ollama on your computer                      │
│    • 100% private, no internet needed                  │
│    • Requires: 8GB RAM                                 │
│                                                         │
│  ● Cloud AI (OpenAI or Groq)                           │
│    • More powerful responses                           │
│    • Requires API key and internet                     │
│    • Configure in Settings later                       │
│                                                         │
│  [More Info]                    [Next: Privacy →]      │
└─────────────────────────────────────────────────────────┘
```
**What to do:**
1. Choose Local AI or Cloud AI
2. You can change this later in Settings
3. Click "Next" to continue

**What Mossy tells you:**
- "Local AI keeps everything on your computer"
- "Cloud AI is more powerful but needs internet"
- "You can switch between them anytime"

---

#### Step 6: Privacy Settings
```
┌─────────────────────────────────────────────────────────┐
│  🔒 Privacy & Data Settings                             │
│                                                         │
│  Your privacy is important. All data stays local       │
│  unless you choose to share.                           │
│                                                         │
│  ☐ Share anonymous usage data                          │
│  ☐ Share crash reports                                 │
│  ☐ Contribute to community knowledge                   │
│  ☐ Check for updates automatically                     │
│                                                         │
│  All options are OFF by default - you're in control.   │
│                                                         │
│  [Privacy Policy]              [Start Using Mossy →]   │
└─────────────────────────────────────────────────────────┘
```
**What to do:**
1. Review privacy options (all unchecked by default)
2. Check any boxes you're comfortable with
3. Click "Privacy Policy" to learn more (optional)
4. Click "Start Using Mossy" to finish setup

**What Mossy tells you:**
- "Everything stays on your computer by default"
- "You decide what (if anything) to share"
- "You can change these settings anytime"

---

### Setup Complete! 🎉
```
┌─────────────────────────────────────────────────────────┐
│  ✨ You're All Set!                                     │
│                                                         │
│  Mossy is ready to help with your Fallout 4 modding!   │
│                                                         │
│  Quick tips:                                            │
│  • Press Ctrl+K to open command palette                │
│  • Use voice chat to ask questions hands-free          │
│  • Check the Knowledge Base for guides                 │
│  • Mossy learns from your questions over time          │
│                                                         │
│  [Take Guided Tour]         [Start Modding Now →]      │
└─────────────────────────────────────────────────────────┘
```

**What to do:**
- Click "Take Guided Tour" for a 5-minute walkthrough (recommended)
- Or click "Start Modding Now" to jump right in!

---

## 📖 Using Mossy - Quick Tutorial

### Main Interface Overview
```
┌─────────────────────────────────────────────────────────────┐
│  Mossy - Fallout 4 Modding Assistant                       │
├──────────┬──────────────────────────────────────────────────┤
│          │  🏠 Welcome to Mossy                             │
│  📁 Home │                                                  │
│  💬 Chat │  What can I help you with today?                │
│  🔍 Audit│                                                  │
│  🖼️ Image│  Quick Actions:                                  │
│  🛠️ Tools│  • Analyze ESP file                              │
│  📚 Know │  • Generate normal maps                          │
│  ⚙️ Set  │  • Compile Papyrus script                        │
│          │  • Check NIF file                                │
│          │  • Open Creation Kit                             │
│          │                                                  │
│          │  [Type a question or command...]                 │
└──────────┴──────────────────────────────────────────────────┘
```

### Key Features to Try First

#### 1. **Chat with Mossy** 💬
- Click "Chat" in the sidebar
- Type: "How do I create a new armor mod?"
- Mossy will guide you step-by-step!

#### 2. **Analyze Files** 🔍
- Click "Auditor" (The Auditor)
- Drag an ESP, NIF, or DDS file
- Get instant analysis and warnings

#### 3. **Generate Textures** 🖼️
- Click "Image Suite"
- Upload a base texture
- Generate normal maps, roughness, height maps automatically

#### 4. **Compile Scripts** 🛠️
- Click "Workshop"
- Write or paste Papyrus code
- Click "Compile" - Mossy handles the rest

#### 5. **Search Knowledge** 📚
- Click "Knowledge Base"
- Search for any topic: "Blender rigging", "xEdit patching", etc.
- 200+ guides at your fingertips

---

## 🎓 Next Steps

### 1. Install Modding Tools (If Needed)
Mossy can help you install:
- **Blender** - For 3D modeling and animation
- **Creation Kit** - Official Fallout 4 editor
- **xEdit** - For advanced mod editing
- **NifSkope** - For viewing 3D models
- **BodySlide** - For outfit customization

**How:**
1. Click "External Tools" in sidebar
2. Click "Install & Verify Tools"
3. Follow Mossy's instructions

### 2. Take the Guided Tour
- Click the "?" icon (top-right)
- Select "Guided Tour"
- 5-minute interactive walkthrough

### 3. Try a Simple Project
**Beginner Project: Create a Weapon Mod**
1. Ask Mossy: "Walk me through creating a new weapon"
2. Follow the step-by-step instructions
3. Mossy will help at each stage!

### 4. Join the Community
- Share your creations on Nexus Mods
- Get help in Fallout 4 modding forums
- Contribute to Mossy's knowledge base

---

## ❓ Troubleshooting

### Installation Issues

#### Windows SmartScreen Warning
**Problem:** "Windows protected your PC" message appears

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. This is normal for new applications

#### Installation Failed
**Problem:** Installer shows error

**Solution:**
1. Make sure you have admin rights
2. Disable antivirus temporarily
3. Free up disk space (need 500 MB)
4. Try installing to a different location

#### Can't Launch After Install
**Problem:** Mossy won't open

**Solution:**
1. Right-click Mossy shortcut
2. Select "Run as Administrator"
3. Check Windows Event Viewer for errors
4. Reinstall if issue persists

### First-Run Issues

#### Stuck on Loading Screen
**Problem:** App hangs on startup

**Solution:**
1. Wait 30 seconds (first launch is slower)
2. Close and restart Mossy
3. Clear cache: Delete `%APPDATA%\Mossy`
4. Reinstall if needed

#### Can't Connect to AI
**Problem:** Chat doesn't respond

**Solution:**
1. Check internet connection (for cloud AI)
2. Verify API keys in Settings
3. Try switching to local AI mode
4. Restart Mossy

#### Tools Not Detected
**Problem:** Blender/CK/xEdit not found

**Solution:**
1. Install tools if not already installed
2. Go to Settings → External Tools
3. Manually set tool paths
4. Rescan system

---

## 🔧 Advanced Configuration

### Custom Installation Path
```bash
# Install to custom location
C:\MyApps\Mossy\

# Set environment variable (optional)
MOSSY_HOME=C:\MyApps\Mossy
```

### Portable Installation
1. Extract installer files manually
2. Copy entire folder to USB drive
3. Run from any PC (settings saved in app folder)

### Command-Line Installation (Silent)
```cmd
# Silent install to default location
Mossy-Setup-5.4.21.exe /S

# Silent install to custom location
Mossy-Setup-5.4.21.exe /S /D=C:\MyApps\Mossy
```

### Multiple Versions
You can install multiple versions side-by-side:
```
C:\Program Files\Mossy\         (v5.4.21)
C:\Program Files\Mossy-Beta\    (v5.5.0-beta)
```

---

## 📦 Uninstalling Mossy

### Standard Uninstall
1. Go to Windows Settings → Apps
2. Find "Mossy" in the list
3. Click "Uninstall"
4. Follow prompts

### Complete Removal (Including Data)
After uninstalling, also delete:
- `%APPDATA%\Mossy` (settings and cache)
- `%LOCALAPPDATA%\Mossy` (temporary files)
- Desktop/Start Menu shortcuts

---

## 🆘 Getting Help

### In-App Help
- Press `F1` for help
- Click "?" icon for tutorials
- Search knowledge base for guides

### Documentation
- [User Guide](USER_GUIDE.md)
- [Quick Start](QUICK_START.md)
- [FAQ](README.md)

### Community Support
- GitHub Issues: [Report bugs](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues)
- Nexus Mods: Share and discuss mods
- Discord: Join the Fallout 4 modding community

### Contact
- Email: support@mossy-app.com (if available)
- GitHub: [@POINTYTHRUNDRA654](https://github.com/POINTYTHRUNDRA654)

---

## 📊 Installation Checklist

Before you start:
- [ ] Windows 10/11 (64-bit)
- [ ] 500 MB free disk space
- [ ] Internet connection (for cloud AI)
- [ ] Admin rights (for installation)

Installation steps:
- [ ] Download installer
- [ ] Run installer
- [ ] Choose installation location
- [ ] Wait for installation
- [ ] Launch Mossy

First-run setup:
- [ ] Choose language
- [ ] Complete system scan
- [ ] Configure Neural Link
- [ ] Set up AI preferences
- [ ] Review privacy settings
- [ ] Start using Mossy!

---

## 🎉 Congratulations!

**You've successfully installed Mossy!** 🚀

You're now ready to:
- ✅ Create amazing Fallout 4 mods
- ✅ Get AI-powered modding assistance
- ✅ Access 200+ modding guides
- ✅ Automate repetitive tasks
- ✅ Analyze and optimize your mods

**Happy modding!** 🎮✨

---

**Version:** 5.4.21  
**Last Updated:** February 9, 2026  
**Platform:** Windows 10/11 (64-bit)  
**License:** MIT  

For the latest version, visit: [GitHub Releases](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases)
