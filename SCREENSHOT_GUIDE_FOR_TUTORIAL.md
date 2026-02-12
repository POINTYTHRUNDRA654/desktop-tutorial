# Screenshot Guide for Tutorial

## Quick Instructions

This guide tells you **exactly what screenshots to capture** and **how to name them** so they automatically work in the tutorial.

---

## 📸 What You Need to Do

1. **Launch Mossy** in dev mode (`npm run dev`)
2. **Navigate to each page** listed below
3. **Take a screenshot** of the full window (Windows: `Win + Shift + S`)
4. **Save it** to `docs/screenshots/tutorial/` with the exact name shown
5. **Done!** The tutorial will automatically load your images

---

## 📋 Screenshot Checklist (In Order)

Save all images to: `docs/screenshots/tutorial/`

### Step 1: Welcome & Launch
**File:** `01-welcome.png`  
**What to capture:** The first screen users see when launching Mossy  
**Tips:** Show the main welcome dashboard or home page

### Step 2: Sidebar Navigation
**File:** `02-sidebar.png`  
**What to capture:** The left sidebar showing all the modules/sections  
**Tips:** Make sure all menu items are visible (The Nexus, Talk to Mossy, etc.)

### Step 3: The Nexus (Main Dashboard)
**File:** `03-nexus-dashboard.png`  
**What to capture:** The Nexus main page with module cards  
**Tips:** Show the overview of available tools

### Step 4: Chat Interface
**File:** `04-chat-interface.png`  
**What to capture:** The "Talk to Mossy" chat page with a conversation  
**Tips:** Have 2-3 messages visible to show how chat works

### Step 5: Live Voice
**File:** `05-live-voice.png`  
**What to capture:** The Live Voice interface  
**Tips:** Show the microphone icon and voice controls

### Step 6: The Auditor
**File:** `06-auditor.png`  
**What to capture:** The Auditor page (asset analysis)  
**Tips:** Show the file analysis interface or results

### Step 7: Image Suite
**File:** `07-image-suite.png`  
**What to capture:** The Image Suite page for texture generation  
**Tips:** Show the PBR texture generation interface

### Step 8: The Workshop
**File:** `08-workshop.png`  
**What to capture:** The Workshop code editor  
**Tips:** Show the code editor with syntax highlighting

### Step 9: The Vault
**File:** `09-vault.png`  
**What to capture:** The Vault asset management page  
**Tips:** Show the file browser or asset list

### Step 10: Desktop Bridge
**File:** `10-bridge.png`  
**What to capture:** The Desktop Bridge showing detected programs  
**Tips:** Show the program detection/connection interface

### Step 11: Settings
**File:** `11-settings.png`  
**What to capture:** The Settings page (any tab)  
**Tips:** General settings or AI configuration are good choices

### Step 12: Help/Documentation
**File:** `12-help.png`  
**What to capture:** Any help or documentation page  
**Tips:** Show the Learning Hub or reference library

---

## 📐 Technical Requirements

### Image Format
- **Format:** PNG (preferred)
- **Resolution:** 1920x1080 or higher
- **Aspect Ratio:** 16:9 preferred

### Quality Guidelines
- ✅ Full window capture (include title bar if possible)
- ✅ Clear, readable text
- ✅ No personal information visible
- ✅ Use realistic sample data (not "test" or placeholder text)
- ✅ Clean UI (close any error messages or popups)
- ❌ No blurry or pixelated images
- ❌ No partial windows or cut-off content

---

## 🎨 Optional: Add Captions

You can add captions for each screenshot in one of two ways:

### Option A: Create a simple text file (Easy)
Create `docs/screenshots/tutorial/captions.txt`:

```
01-welcome.png | Welcome to Mossy - Your Fallout 4 Modding Assistant
02-sidebar.png | Navigate between modules using the sidebar
03-nexus-dashboard.png | The Nexus shows all available tools
04-chat-interface.png | Chat with Mossy to get modding help
05-live-voice.png | Use Live Voice for hands-free conversation
06-auditor.png | The Auditor analyzes your mod files
07-image-suite.png | Generate PBR textures with Image Suite
08-workshop.png | Write and compile scripts in The Workshop
09-vault.png | Manage your assets in The Vault
10-bridge.png | Desktop Bridge detects your modding tools
11-settings.png | Configure Mossy in Settings
12-help.png | Access documentation and guides
```

### Option B: Just use filenames (Automatic)
If you don't add captions, the tutorial will auto-generate friendly names from the filename:
- `01-welcome.png` → "Welcome"
- `02-sidebar.png` → "Sidebar"
- etc.

---

## 🚀 After You're Done

Once you've added all screenshots:

1. Put them in `docs/screenshots/tutorial/`
2. (Optional) Add captions file
3. Let me know - I'll write the tutorial text to match your images
4. The tutorial will automatically load and display them in order

---

## 📁 Example Directory Structure

```
docs/
└── screenshots/
    └── tutorial/
        ├── 01-welcome.png
        ├── 02-sidebar.png
        ├── 03-nexus-dashboard.png
        ├── 04-chat-interface.png
        ├── 05-live-voice.png
        ├── 06-auditor.png
        ├── 07-image-suite.png
        ├── 08-workshop.png
        ├── 09-vault.png
        ├── 10-bridge.png
        ├── 11-settings.png
        ├── 12-help.png
        └── captions.txt (optional)
```

---

## ❓ Questions?

- **"Do I need all 12 screenshots?"** - No! Start with what you have. The tutorial adapts to available images.
- **"Can I add more?"** - Yes! Just continue the numbering (13-, 14-, etc.)
- **"What if I make a mistake?"** - Just replace the file with the same name. Easy!
- **"Can I use JPG?"** - Yes, but PNG is better quality.

---

## 🎯 Quick Capture Shortcuts

**Windows:**
- `Win + Shift + S` - Snipping Tool (rectangular select)
- `Alt + PrtScn` - Capture active window
- `PrtScn` - Capture full screen

**Mac:**
- `Cmd + Shift + 4` - Select area
- `Cmd + Shift + 3` - Full screen

**Linux:**
- `Shift + PrtScn` - Select area
- `PrtScn` - Full screen

---

That's it! Just capture the screens, save with the right names, and hand them over. I'll handle the rest! 🎉
