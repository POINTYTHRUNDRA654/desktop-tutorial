# 🎵 Mossy Link for Blender - User Guide

**Add-on Version**: 6.0  
**Blender Target**: 4.0+  
**For**: Fallout 4 Modding with AI Assistance

---

## Quick Start (2 minutes)

### 1. Install
- Edit → Preferences → Add-ons → Install…
- Select `mossy_link_addon.py`
- Search "Mossy" and enable ✓

### 2. Connect
- Press `N` in 3D Viewport (sidebar)
- Click "Connect to Mossy"
- Status should show ✅ Connected

### 3. First Action
- Click "Setup FO4 Scene" button
- Scene is now FO4-ready!

---

## What is Mossy Link?

**Mossy Link** connects your Blender workspace to the **Mossy AI Desktop App** running locally.

**What you get:**
- ✅ Real-time AI feedback on your scene
- ✅ Automatic FO4 validation (triangles, bones, scale)
- ✅ One-click automation tools
- ✅ Smart mesh cleanup and optimization
- ✅ Batch export with FO4-safe defaults
- ✅ Custom Python script execution from Mossy

**Connection**: TCP over localhost (127.0.0.1:9999)  
**Requirements**: Mossy Desktop app running on same machine

---

## Installation

### Prerequisites
- Blender 4.0 or higher
- Mossy Desktop app (downloaded separately)
- Windows 10+ (primary support; Linux/Mac support experimental)

### Step-by-Step

**Step 1: Locate the add-on file**

Option A - Download from Mossy:
1. Open Mossy Desktop app
2. Go to: Settings → Downloads
3. Click "Download Blender Add-on"
4. File saved as: `Downloads/mossy_link_addon.py`

Option B - GitHub:
1. Visit: [Mossy GitHub releases](https://github.com/)
2. Download: `mossy_link_addon.py` from latest release
3. Save to Desktop or Downloads

**Step 2: Install in Blender**

1. Open Blender version 4.0+
2. Go to: **Edit → Preferences** (or `A,P` hotkey)
3. Left panel: Click **"Add-ons"**
4. Top right: Click **"Install…"** button
5. Navigate to `mossy_link_addon.py` and select it
6. Click: **"Install Add-on"**
7. Window closes, you return to Preferences

**Step 3: Enable the add-on**

1. Still in Preferences → Add-ons
2. Search box: Type **"Mossy"**
3. Result appears: "Mossy Link — Fallout 4 AI Assistant"
4. Check the **☑ checkbox** to enable
5. *(Optional)* Click dropdown to see preferences:
   - **Port**: Leave as 9999 (matches Mossy)
   - **Auto-start on launch**: Enable for auto-reconnect
   - **Show live FO4 warnings**: Enable for validation

**Step 4: Verify installation**

1. Close Preferences window
2. Go to **View3D** (main 3D viewport)
3. Press **`N`** key (toggles sidebar)
4. Look for **"Mossy"** tab (usually rightmost)
5. You should see: Connection status + buttons

✅ **Installation successful!**

---

## First-Time Setup

### Connecting to Mossy

**Prerequisites:**
- Mossy Desktop app is open and running
- Blender is open
- Add-on is installed and enabled

**Steps:**

1. **In Mossy Desktop**:
   - Go to "Blender Bridge" tab
   - Should show: "Ready to connect" or similar
   - Note the **port** (usually 9999)

2. **In Blender**:
   - Press `N` in 3D Viewport
   - Open "Mossy" tab
   - Click: **"Connect to Mossy"** button
   - Wait 2-3 seconds

3. **Status Updates**:
   - 🔄 "Connecting…" (in progress)
   - ✅ "Connected" (success!)
   - ❌ "Offline" (failed — see troubleshooting)

**If connected successfully:**
- N-panel shows scene statistics
- FO4 Quick Actions become available
- Warnings appear in real-time

---

## The Mossy N-Panel (Your Control Hub)

**Location**: View3D → Press `N` → "Mossy" tab

### Section 1: Connection Status
```
✅ Connected to Mossy (127.0.0.1:9999)
            [Disconnect]
```

**Status indicators:**
- ✅ Green = Connected and ready
- 🔄 Yellow = Connecting
- ❌ Red = Offline

**Buttons:**
- **Connect Now**: Establish/reconnect to Mossy
- **Disconnect**: Close connection cleanly
- **Test Bridge**: Send test message to verify link

### Section 2: Scene Information
```
📊 Scene Status
  Objects: 12
  Meshes: 8
  Armatures: 1
  Total Triangles: 45,230
  Selected: 3 objects
```

Auto-updates as you work. Click refresh icon to force update.

### Section 3: FO4 Quick Actions

Six automation buttons:

| Button | What it does | Hotkey |
| --- | --- | --- |
| 🔨 **Setup FO4 Scene** | Configure units, FPS, FOV | — |
| 🧹 **Clean Mesh** | Remove doubles, loose verts | — |
| ✏️ **Apply Transforms** | Bake loc/rot/scale | — |
| 🎨 **UV Setup** | Generate lightmap UVs | — |
| 📦 **Generate LOD** | Create LOD0/1/2 variants | — |
| 📤 **Export FBX** | FO4-safe FBX export | — |

### Section 4: Live Warnings
```
⚠️ FO4 Warnings:
  • Mesh "Body" has 70,000 triangles (max: 65,534)
  • Object "Hat" has non-uniform scale
  • 3 loose vertices in "Clothing"
```

Real-time validation. Warnings clear when issues fixed.

---

## Core Features

### 1. Scene Context (Scene Awareness)

**What it does:**
Mossy sees your entire scene: objects, selections, mesh stats, animations

**How to trigger:**
- Automatic: Every 5 seconds when connected
- Manual: Click **"Get Scene Context"** in N-panel

**What Mossy sees:**
- All object names and types
- Currently selected objects
- Mesh statistics (vertices, triangles, bones)
- Animation data (actions, markers)
- FO4 compliance status

**Use case:**
"Mossy, analyze my scene"
→ Mossy checks: triangle limits, bone counts, scale issues, missing UVs, geometry problems
→ Returns detailed report with suggestions

---

### 2. Live FO4 Validation

**What it does:**
Real-time checks for Fallout 4 export readiness

**Checks performed:**

| Check | FO4 Limit | Warning Threshold |
| --- | --- | --- |
| Triangles per mesh | 65,534 | >50,000 |
| Bones per armature | 80 | >70 |
| Object scale uniformity | 1.0 | ±0.1 from target |
| UV coverage | 2 maps required | Missing any |
| Loose geometry | 0 allowed | >0 vertices |
| Degenerate faces | 0 allowed | >0 faces |

**Example warnings:**
```
⚠️ Body mesh: 72,000 triangles (exceeds 65,534 limit)
   Fix: Use "Generate LOD" to create optimized variants
   
⚠️ Rig: 95 bones (exceeds FO4 limit of 80)
   Fix: Merge or remove unused bones
   
⚠️ Scale non-uniform: X=1.0, Y=0.8, Z=1.2
   Fix: Use "Apply Transforms" to normalize
```

---

### 3. One-Click Automation

#### 🔨 Setup FO4 Scene

**Problem**: Blender defaults aren't FO4-compatible

**What it fixes**:
- Units → METRIC (cm)
- Timeline FPS → 60 (studio/baking rate)
- Camera FOV → 18mm (90° on standard sensor)
- Render settings → FO4 defaults

**When to use**: Starting new FO4 project

```
Steps:
1. Create new scene in Blender
2. Click "Setup FO4 Scene" in Mossy panel
3. Scene configured correctly
4. Ready to model
```

---

#### 🧹 Clean Mesh

**Problem**: Mesh has modeling artifacts

**What it fixes**:
- Duplicate vertices (merge within tolerance)
- Loose edges/verts (remove orphaned geometry)
- Degenerate faces (delete zero-area triangles)
- Small holes (auto-fill)

**When to use**: After modeling, before export

```
Steps:
1. Select mesh (Object Mode)
2. Click "Clean Mesh"
3. Console shows: "Removed X vertices, Y faces"
4. Mesh is clean
```

**Note**: Creates undo step if you want to revert

---

#### ✏️ Apply Transforms

**Problem**: Object has transforms that affect export

**What it fixes**:
- Apply Location (position)
- Apply Rotation (orientation)
- Apply Scale (size)

**When to use**: Before rigging or export

```
Steps:
1. Select mesh(es) in Object Mode
2. Click "Apply Transforms"
3. Transforms baked into mesh data
4. Ready for next step
```

**Important**: Do this BEFORE creating an armature/rigging

---

#### 🎨 UV Setup

**Problem**: No lightmap UV map (required for FO4 baking)

**What it creates**:
- Secondary UV map (named "UVMap" or "LightmapUV")
- Smart UV projection (minimizes distortion)
- Auto-packed for optimal atlas space

**When to use**: After mesh/texture setup, before baking

```
Steps:
1. Select mesh
2. Click "UV Setup"
3. New UV map created (see UV Editor)
4. Ready for Marmoset Baker or CK NIF tools
```

**Note**: Original UVs preserved, new map on second channel

---

#### 📦 Generate LOD

**Problem**: High-poly mesh needs optimization variants

**What it creates**:
- **LOD0**: Original (100% detail)
- **LOD1**: 50% detail (Decimate modifier 0.5)
- **LOD2**: 25% detail (Decimate modifier 0.25)
- **LOD4**: 10% detail (Decimate modifier 0.1)

**When to use**: After modeling finalized

```
Steps:
1. Select high-poly mesh
2. Click "Generate LOD"
3. 4 variants created with modifiers
4. Export each separately to CK
```

**Note**: Modifiers are non-destructive. You can disable/tweak before export.

---

#### 📤 Export FBX

**Problem**: Standard FBX export has wrong settings for FO4

**What it does**:
- ✅ Triangulates all geometry
- ✅ Sets correct FOV (18mm)
- ✅ Removes duplication
- ✅ Applies FO4 animation rate (30 FPS for HKX)
- ✅ Normalizes scale (1.0 IMPERIAL)

**When to use**: Ready to export to Creator Kit/Outfit Studio

```
Steps:
1. Select mesh(es) to export
2. Click "Export FBX"
3. File dialog: Choose folder and filename
4. Click "Export"
5. File ready for CK/Outfit Studio
```

**Output format**:
```
filename.fbx
├─ Mesh data (triangulated)
├─ Materials (if present)
├─ Armature (if rigged)
└─ Animations (if present)
```

---

### 4. Script Execution

**What it does**: Run arbitrary Python code from Mossy inside Blender

**Example workflow**:
1. Mossy sends Python script: `bpy.context.object.scale = (1.0, 1.0, 1.0)`
2. Blender executes it instantly
3. You see results in viewport

**Use cases:**
- Batch operations (process 10 objects at once)
- Parametric modeling (generate mesh from dimensions)
- Automated rigging
- Custom mesh generation

**How it works:**
- Mossy detects your intent: "scale all objects uniformly"
- Mossy generates Python code
- Sends to Blender via TCP
- Blender compiles and executes
- Results visible immediately

---

## Common Workflows

### Workflow 1: Simple Outfit (30 min)

```
⏱️ Timeline: ~30 minutes total

1. [1 min]  Setup
   - New Blender scene
   - Click "Setup FO4 Scene"
   - Scene configured

2. [20 min] Model
   - Use standard Blender tools
   - Watch Mossy warnings in real-time
   - Keep under 65,534 triangles

3. [5 min]  Cleanup
   - Select mesh
   - Click "Clean Mesh"
   - Click "Apply Transforms"

4. [2 min]  Export
   - Click "Export FBX"
   - Choose folder
   - Done!
```

---

### Workflow 2: Rigged Armor (1 hour)

```
⏱️ Timeline: ~1 hour total

1. [5 min]  Prepare mesh
   - Import or model mesh
   - Click "Clean Mesh"
   - Click "Apply Transforms"

2. [20 min] Create armature (Blender native)
   - Shift+A → Add → Armature
   - Model bones (keep ≤80)
   - Parent to mesh

3. [20 min] Weight paint (Blender native)
   - Tab → Weight Paint Mode
   - Paint bone weights
   - Test deformations

4. [10 min] Generate LOD
   - Click "Generate LOD"
   - Creates 4 variants

5. [5 min]  Export
   - Click "Export FBX"
   - Ready for CK
```

---

### Workflow 3: Batch Processing (Mossy-driven)

```
Tell Mossy: "Process these 5 outfits"

Mossy automatically:
1. Opens each .blend file
2. Cleans mesh
3. Applies transforms
4. Generates LOD
5. Exports FBX
→ All done, 5 files ready

You just wait!
```

---

## Keyboard Shortcuts (Optional Custom Setup)

**Suggested hotkeys** (set in Edit → Preferences → Keymap):

```
Ctrl+M        → Clean Mesh
Ctrl+Shift+E  → Export FBX
Ctrl+Shift+G  → Generate LOD
Ctrl+Shift+U  → UV Setup
```

**To set custom hotkeys:**
1. Preferences → Keymap
2. Search: "Mossy"
3. Find action (e.g., "Clean Mesh")
4. Click binding
5. Press desired key combo
6. Click "Confirm"

---

## Troubleshooting

### ❌ "Add-on not found when I search"

**Causes:**
- File not in correct location
- File not actually installed
- Blender cache not updated

**Fixes:**
1. Reinstall: Edit → Preferences → Add-ons → Install… → Select file
2. Restart Blender completely
3. If still not found, check Preferences → File Paths → Scripts
4. Copy `mossy_link_addon.py` to that folder
5. Restart Blender

---

### ❌ "Mossy tab doesn't appear in N-panel"

**Causes:**
- Add-on not enabled
- N-panel not open
- Wrong workspace

**Fixes:**
1. **Enable add-on**: Search "Mossy" in Add-ons, check ☑
2. **Open N-panel**: Press `N` in View3D
3. Look for "Mossy" tab (may be rightmost)
4. If missing, restart Blender

---

### ❌ "Cannot connect to Mossy" error

**Causes:**
- Mossy app not running
- Port mismatch
- Firewall blocking
- Network error

**Fixes:**

**Step 1: Verify Mossy is running**
- Open Mossy Desktop app
- Go to: Blender Bridge tab
- Should show "Ready" status

**Step 2: Check port**
- In Blender Preferences → Add-ons → Mossy Link
- Port should be 9999 (default)
- Verify Mossy uses same port

**Step 3: Check firewall**
- Windows Defender Firewall → "Allow an app" → Blender
- Ensure checked for Private networks
- May need to restart Blender

**Step 4: Manual reconnect**
- Click "Disconnect" in N-panel
- Wait 2 seconds
- Click "Connect Now"
- Try "Test Bridge"

---

### ❌ "FO4 Quick Action failed" error

**Causes vary by action:**

**For "Clean Mesh" / "Apply Transforms":**
- No mesh selected (need mesh object)
- In Edit Mode (need Object Mode)
- Mesh is empty (no vertices)

**For "Generate LOD":**
- Mesh has no faces (just wireframe)
- Too few triangles to decimate (<100)

**For "Export FBX":**
- No mesh selected
- Folder not writable
- Disk full

**Fixes:**
1. Select a mesh in Object Mode
2. Ensure mesh has geometry (vertices and faces)
3. Try simpler action first ("Clean Mesh")
4. Check console (Widnow → Toggle System Console) for detailed error

---

### ❌ "Warnings keep reappearing"

**Normal behavior**: Warnings update every frame

**To fix an issue:**
- Warning: "Non-uniform scale detected"
- Fix: Click "Apply Transforms"
- Warning should disappear next update

If warning persists after fix:
1. Try action again
2. File → Revert (reload scene)
3. Report to Mossy issue tracker

---

### ❌ "Connection test passes but script execution fails"

**Cause**: Script permission or syntax issue

**Checks:**
1. Is Mossy sending valid Python code?
2. Does Blender have permission to execute?
3. Check console (Ctrl+Alt+T on Linux, see logs on Windows)

**Fixes:**
1. Try simple test: "scale selected object to 1.0"
2. If works, issue with specific script
3. Report error message to Mossy support

---

## Advanced Settings

### Add-on Preferences

**Location**: Edit → Preferences → Add-ons → Mossy Link → Expand ▼

**Available options:**

| Setting | Default | Use | Notes |
| --- | --- | --- | --- |
| **Port** | 9999 | TCP port for connection | Must match Mossy port |
| **Auto-start** | ON | Auto-reconnect on launch | Disable for manual control |
| **Live Warnings** | ON | Show FO4 validation | Disable if too noisy |

### Changing the TCP Port

If port 9999 is already in use:

1. Preferences → Add-ons → Mossy Link → Expand
2. Change **Port** to: 9998, 10000, 10001, etc. (any 1024-65535)
3. Restart Blender
4. **In Mossy Desktop**: Update to same port
5. Reconnect

---

## Tips & Techniques

### Tip 1: Create a "FO4 Modeling" Workspace

**Why**: Dedicated workspace for all FO4 tools

**Steps:**
1. Top menu: Workspace tabs
2. Click "+" to add new
3. Name: "FO4 Modeling"
4. Customize layout:
   - Left: Model (full 3D)
   - Right: UV Editor + Material Properties
   - Bottom: Mossy N-panel
5. Workspace auto-saves

**Result**: One-click workspace switch for FO4 work

---

### Tip 2: Pre-Export Checklist

Before clicking "Export FBX", verify:

```
✓ Mesh is closed (no holes)
✓ Triangles: 100 - 65,534
✓ No loose vertices
✓ Transforms applied
✓ UV maps created (2 for rigged)
✓ No modifiers (except Decimate for LOD)
✓ Bones < 80 (if rigged)
✓ No missing materials
✓ Target folder writable
```

---

### Tip 3: LOD Export Strategy

**Option A: Export all LODs**
- Generate LOD
- Select LOD0 + click Export → "outfit_lod0.fbx"
- Select LOD1 + click Export → "outfit_lod1.fbx"
- Select LOD2 + click Export → "outfit_lod2.fbx"
- Import all in CK

**Option B: Let Mossy handle it**
- Generate LOD
- Tell Mossy: "Export all LOD variants"
- Mossy exports all 4 automatically

---

### Tip 4: Real-Time Feedback Loop

**Workflow**:
1. Model → Watch warnings in Mossy panel
2. Fix issues as they appear
3. No export surprises
4. Export with confidence

**Example**:
- You: Create new mesh
- Mossy: "⚠️ 200 loose vertices"
- You: Click "Clean Mesh"
- Mossy: "✅ Cleaned"
- You: Continue modeling

---

## Support & Feedback

### Getting Help

1. **In-app**: Mossy Desktop → Blender Bridge → "Help"
2. **Documentation**: Resources → Knowledge Base → Blender
3. **Community**: Discord server (link in Mossy app)
4. **GitHub**: [Report issues here](https://github.com/)

### Reporting Bugs

Include:
- Blender version (Help → About)
- Add-on version (Preferences → Add-ons → Mossy Link)
- Error message (full text from console)
- Screenshot
- Steps to reproduce

**GitHub Issues**: https://github.com/

---

## Next Steps

1. ✅ **Install** the add-on
2. ✅ **Connect** to Mossy
3. ✅ **Try one action**: Click "Setup FO4 Scene"
4. ✅ **Create simple mesh** and test "Clean Mesh"
5. ✅ **Export** your first asset

**Happy modding!** 🎨

---

**Last Updated**: March 2026  
**For**: Blender 4.0+ | Mossy 5.4.23+
