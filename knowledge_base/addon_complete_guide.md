# Mossy Industries Blender Add-on — Complete Reference for Mossy AI

This is the authoritative, exhaustive reference for every panel, button, setting,
and workflow in the Mossy Industries Blender Add-on (v5.1+).
Use it to give users exact, step-by-step guidance.

---

## HOW TO FIND THE ADD-ON

Press **N** in the 3D Viewport → click the **"Fallout 4"** tab in the sidebar.
Every panel below lives in this tab. Panels are collapsed by default — click the
arrow/triangle next to the panel name to expand it.

---

## PANEL INDEX (top to bottom in the N-panel)

1. Fallout 4 Tutorial (Main Panel)
2. Setup & Status
3. Mesh Helpers
4. Texture Helpers
5. Image to Mesh
6. Animation Helpers
7. Auto-Rigging (RigNet)
8. Texture Conversion (NVTT)
9. Advisor
10. External Tools
11. Game Assets & Library
12. Export to Fallout 4
13. Batch Processing
14. Automation & Quick Tools
15. Animation Export (HKX)
16. Armor & Clothing
17. Preset Library
18. Add-on Integrations
19. Desktop Tutorial App
20. Diagnostics & Health
21. Operation Log
22. Mossy (Quick Connect)
23. NPCs & Creatures *(v5.2)*
24. Weapons *(v5.2)*
25. Glow & Spore Effects *(v5.2)*
26. CK Cell Editor *(v5.2)*
27. ESP Generator *(v5.2)*
28. AI Texture Generator *(v5.2)*
29. Batch Export & Presets *(v5.2)*
30. Settlement Workshop *(v5.2)*
31. Compatibility Checker *(v5.2)*
32. Dialogue Tree Editor *(v5.2)*
33. Weather & Interior *(v5.2)*
34. NavMesh Generator *(v5.2)*
35. Mesh Tools (PyMeshLab) *(meshlab_helpers)*

---

## 1. MAIN PANEL — "Fallout 4 Tutorial"

The root panel. Always visible at the top of the tab.

**Shows:** Active object name and type (MESH / ARMATURE / EMPTY / etc.)

**Contains:**
- **Full FO4 Pipeline** section:
  - **Convert to Fallout 4 (Full Pipeline)** — one-click: applies transforms,
    triangulates, sets up material, exports NIF + BGSM
  - **Prepare External Mesh for FO4** — cleans up an imported mesh: applies
    transforms, fixes UV name to "UVMap", removes extra UV maps, sets material,
    merges doubles, fixes non-manifold edges
  - **Export Static Mesh (Full Pipeline)** — opens file browser, exports NIF
    with full validation and BGSM generation
  - **Validate Before Export** — checks for common issues and shows warnings
  - **Auto-Setup FO4 Material** — creates a basic FO4-compatible material

**Required settings before using:** None — works on selected object.

---

## 2. SETUP & STATUS

**Purpose:** First-run setup and ongoing dependency management.

**Buttons:**
- **Install Core Dependencies** — installs pip packages (trimesh, pypdf, etc.)
  into Blender's Python. Run once after first install.
- **Auto-Install PyNifly (Latest)** — downloads and installs the PyNifly NIF
  exporter. Required for NIF export on Blender 4.x/5.x.
- **Environment Check / Self Test** — verifies all tools and reports status.
  Green ✓ = ready. Red ✗ = needs action.
- **Reload Add-on** — hot-reloads the addon without restarting Blender.

**Status shown:**
- PyNifly: installed version
- NVTT / TexConv: path status
- PyTorch: local install status
- Each Python package: [OK] or [MISSING]

**AI Generation sub-panels** (expand under Setup):
- **AI: Hunyuan3D-2** — text/image to 3D mesh. Needs Hunyuan3D model downloaded.
- **AI: Web Interface (Gradio)** — launches Gradio web UI for AI tools.
- **AI: Motion Generation (HY-Motion)** — AI motion/animation from description.

**Required settings:** Set FO4 Data Folder path in Game Assets panel first.

---

## 3. MESH HELPERS

**Purpose:** Fix, optimize, and validate meshes for FO4 compatibility.

**Sections:**

### Prepare & Validate
- **Prepare External Mesh for FO4** — the most-used button. Applies transforms,
  renames UV map, sets material, merges doubles, fixes non-manifold edges.
  *Always run this on any imported mesh before export.*
- **Validate Mesh** — checks FO4 limits (65535 verts, UV map present, no
  non-manifold, material exists). Shows warnings with exact counts.
- **Auto-Fix Non-Manifold Edges** — fills holes and merges overlapping vertices.

### Optimize
- **Decimate Mesh** — reduces polygon count. Sets a target face count.
  *Use to stay under the 65535 vert limit.*
- **Merge by Distance** — welds overlapping vertices. Use after boolean ops.
- **Smooth Normals (FO4)** — applies Auto Smooth at 60° (FO4 standard).

### Collision
- **Generate Collision Mesh** — creates a UCX_meshname convex collision shape.
  *Required for static props to be solid in-game.*
- Collision type dropdown: STATIC (immovable), DYNAMIC (can be picked up)

### LOD
- **Generate LOD Chain** — auto-decimates to LOD0/1/2/3 at 100%/50%/25%/10%
  poly counts. Each LOD saved as separate NIF.
- LOD distance settings: LOD0=0–15m, LOD1=15–40m, LOD2=40–100m, LOD3=100m+

### Vegetation
- **Thicken Flat Planes** → see Section 7 below for full detail.

---

## 4. TEXTURE HELPERS

**Purpose:** Assign, convert, and manage textures for FO4 materials.

**Buttons:**
- **Auto-Load Textures** — scans for textures next to the mesh file matching
  the naming convention (_d, _n, _s, _g) and assigns them to material slots.
- **Convert Textures to DDS** — batch-converts PNG/TGA/BMP to DDS format.
  Uses NVTT (BC7 for diffuse/normal) or TexConv. *Must configure tool path first.*
- **Set Texture Path** — manually assign a texture file to a specific slot.
- **Auto-Setup FO4 Material** — creates BSLightingShader material with correct
  texture slots and shader flags for FO4.

**FO4 texture slots:**
- `_d.dds` = Diffuse / Albedo (colour)
- `_n.dds` = Normal map (tangent space, DirectX)
- `_s.dds` = Specular / Smoothness
- `_g.dds` = Glow / Emissive (optional)
- `_e.dds` = Environment map (optional)

**Required settings:** NVTT or TexConv path must be set in External Tools panel.

---

## 5. IMAGE TO MESH

**Purpose:** Generate a 3D mesh from a 2D image using depth estimation (ZoeDepth).

**Buttons:**
- **Generate Mesh from Image** — loads selected image, runs ZoeDepth to estimate
  depth, creates a displaced mesh. Good for terrain or bas-relief generation.
- **Load Image** — file browser to pick source image.

**Required:** ZoeDepth must be available (auto-fixes via Setup → Auto-Fix Issues).
PyTorch required. Set PyTorch path in Settings if not auto-detected.

---

## 6. ANIMATION HELPERS

**Purpose:** Wind animation for vegetation, skeleton animation helpers.

**Wind Setup:**
- **Smart Wind + FO4 Export Prep** — auto-detects mesh type (grass/shrub/tree)
  and applies correct wind vertex weights + prepares for FO4 HKX export. *Start here.*
- **Generate Wind Weights** — manually create wind vertex groups (WindWeight,
  WindWeight2). 0 = anchored, 1 = maximum sway. Paint with Weight Paint mode.
- **Wind Type** dropdown: GRASS (no bones, engine-side), TREE (bones + shape keys),
  SHRUB (light bone animation)

**Skeleton:**
- **Import FO4 Skeleton** — loads fo4_skeleton.nif into the scene for NPC rigging.
- **Auto-Weight Paint** — assigns bone weights based on bone proximity.
- **Enforce Bone Limit** — clamps bone influences to 4 per vertex (FO4 maximum).
- **Normalize Weights** — ensures all vertex weight groups sum to 1.0.

**Settings:**
- Wind strength slider (0.1–2.0, default 0.5)
- Wind direction (usually +Y in FO4 world space)

---

## 7. AUTO-RIGGING (RIGNET)

**Purpose:** AI-powered automatic skeleton generation from mesh shape.

**Buttons:**
- **Auto-Rig Mesh** — sends mesh to RigNet, returns a generated skeleton with
  weights. Best for organic shapes (creatures, NPCs).
- **Refine Rig** — adjust RigNet output, clean up joints.

**Required:** RigNet must be installed (auto-fix attempts this). PyTorch required.

**Workflow:**
1. Select mesh in Object Mode
2. Click "Auto-Rig Mesh"
3. Wait 10–60 seconds for AI processing
4. Review skeleton, adjust if needed
5. Use "Enforce Bone Limit" to stay within FO4's 4-bone limit

---

## 8. TEXTURE CONVERSION (NVTT)

**Purpose:** Convert textures to DDS format using NVIDIA Texture Tools.

**Buttons:**
- **Convert Selected Image to DDS** — converts active image to DDS BC7 format.
- **Batch Convert Folder** — converts all PNG/TGA in a folder to DDS.
- **BC1 (no alpha)** / **BC3 (with alpha)** / **BC7 (high quality)** — format selector.

**Required settings:** Set NVTT path in External Tools panel:
`D:\blender_tools\nvtt\nvidia-texture-tools-2.1.2-win\bin\nvcompress.exe`

**Note:** TexConv (Microsoft) also works and supports BC7. Both are optional but
at least one is needed for DDS conversion.

---

## 9. ADVISOR (Mossy AI Chat)

**Purpose:** Ask Mossy anything about your mesh, mod, or FO4 workflow.

**How to use:**
1. Ensure Mossy desktop app is running (check Mossy panel → Quick Connect)
2. Select your mesh in Blender
3. Open the Advisor panel
4. Type your question and press Enter or click Send
5. Mossy analyzes your actual mesh data and answers specifically

**What Mossy can do:**
- Diagnose why a mesh won't export correctly
- Walk you through any workflow step-by-step
- Explain FO4 NIF structure and limits
- Suggest fixes for specific error messages
- Answer general FO4 modding questions

**Requires:** Mossy desktop app running. Bridge must show ✓ in Mossy panel.

---

## 10. EXTERNAL TOOLS

**Purpose:** Configure paths to external tools used by the addon.

**Tool paths to configure:**
- **FFmpeg** — video/audio conversion. Default: `D:\blender_tools\ffmpeg\...\ffmpeg.exe`
- **NVTT** — NVIDIA Texture Tools for DDS. `D:\blender_tools\nvtt\...\nvcompress.exe`
- **TexConv** — Microsoft texture converter. `D:\blender_tools\texconv\texconv.exe`
- **Havok2FBX / ck-cmd** — animation export. `D:\blender_tools\ck-cmd\`
- **RealESRGAN** — AI image upscaler. `D:\blender_tools\realesrgan\realesrgan-ncnn-vulkan.exe`
- **Instant-NGP** — NeRF/3DGS renderer. `D:\blender_tools\instant-ngp\`
- **UModel** — UE4/UE5 asset extractor (optional)
- **Tools Root** — parent folder for all tools. `D:\blender_tools\`

**Download links:**
- NVTT: github.com/castano/nvidia-texture-tools
- TexConv: github.com/microsoft/DirectXTex (texconv.exe release)
- ck-cmd: github.com/aerisarn/ck-cmd/releases
- RealESRGAN: github.com/xinntao/Real-ESRGAN/releases (ncnn-vulkan)
- FFmpeg: ffmpeg.org/download.html

---

## 11. GAME ASSETS & LIBRARY

**Purpose:** Browse and import FO4 game assets and your own mod files.

**Settings to configure first:**
- **FO4 Data Folder** — path to your Fallout 4 Data directory. Example:
  `E:\Steam\steamapps\common\Fallout 4\Data`
- **Mod Output Folder** — where your finished mod files go (the mod root folder)
- **Mesh Library Path** / **Texture Library Path** / **Material Library Path** —
  optional paths for browsing your own asset libraries

**Buttons:**
- **Import Asset** — file browser. Supports: .duf, .dsf (Daz), .fbx, .obj, .nif,
  .dds, .png, .tga. Auto-routes to correct importer.
- **Scan Library** — indexes all assets in your library folders for quick browsing.
- **Browse Meshes / Textures / Materials** — visual browser for library assets.

**Mod output folder structure (auto-created):**
```
YourMod/
  Data/Meshes/       ← NIF files
  Data/Materials/    ← BGSM files
  Data/Textures/     ← DDS files
  Data/Scripts/      ← Papyrus .pex files
```

---

## 12. EXPORT TO FALLOUT 4

**Purpose:** Export meshes to FO4-compatible NIF format.

**Export buttons:**
- **Export Static Mesh (Full Pipeline)** — *recommended for most users.* Validates,
  preps, and exports NIF + BGSM in one click. Opens file browser for output path.
- **Export Mesh to NIF** — direct NIF export with fewer automatic fixes.
- **Export Scene as NIF** — exports all visible meshes as one NIF.
- **Export BGSM** — generates .bgsm material file from active object materials.
- **Export TRI Morphs** — exports shape keys as .tri file (NPC facial morphs).
- **Export Selection Only** checkbox — export just selected objects, not all.

**Settings:**
- **Output Folder** — path where NIF files are saved (auto-fills from Game Assets)
- **NIF Exporter** dropdown: Auto / PyNifly / Niftools / FBX Fallback
  - PyNifly: recommended for Blender 4.x/5.x
  - Niftools v0.1.1: for Blender 3.6 LTS only
  - FBX Fallback: when no NIF exporter is installed (for post-processing with CAO)
- **Apply Transforms** checkbox — apply Scale/Rotation before export (always enable)
- **Triangulate** checkbox — auto-triangulate quads (always enable for FO4)
- **Generate Collision** checkbox — auto-create UCX_ collision mesh
- **Generate BGSM** checkbox — auto-create BGSM material file

**FO4 export limits:**
- Max 65,535 verts per BSTriShape
- Max 65,535 tris per BSTriShape
- Max 4 bone influences per vertex
- UV map must be named "UVMap"
- All transforms applied (scale/rotation = identity)

---

## 13. BATCH PROCESSING

**Purpose:** Run FO4 prep and export operations on multiple objects at once.

**Buttons:**
- **Batch Prepare Selected** — runs "Prepare External Mesh for FO4" on every
  selected object at once.
- **Batch Export Selected** — exports each selected mesh as its own NIF.
- **Batch Convert Textures** — converts all textures in a folder.
- **Batch Validate** — checks all selected objects and reports issues.

**Use case:** You have 20 imported prop meshes. Select all → "Batch Prepare" →
"Batch Export" → done. No need to process each one individually.

---

## 14. AUTOMATION & QUICK TOOLS

**Purpose:** One-click workflow shortcuts and automation sequences.

**Quick action buttons:**
- **Full Auto-Pipeline** — completely automated: import → prepare → export.
  Select a file, click this, get a finished NIF.
- **Quick Static Prop** — prepare + collision + export in one step.
- **Quick Vegetation** — prepare + wind + LOD chain in one step.
- **Quick NPC Mesh** — prepare + skeleton + weight paint in one step.
- **Save Workflow** — save current settings as a named workflow preset.
- **Load Workflow** — apply a saved workflow preset.

---

## 15. ANIMATION EXPORT (HKX)

**Purpose:** Export animations to FO4's HKX format using ck-cmd.

**Requires:** ck-cmd configured in External Tools panel.

**Buttons:**
- **Export Animation (HKX)** — exports the active armature's animation as .hkx
  file for use in the Creation Kit.
- **Import HKX** — imports an .hkx animation file back into Blender for editing.
- **Convert HKX → FBX** — converts HKX to FBX for inspection.
- **Batch Export Animations** — exports all NLA tracks as separate .hkx files.

**Required settings:**
- ck-cmd path: `D:\blender_tools\ck-cmd\ck-cmd.exe` (must be compiled)
- FO4 skeleton must be in the scene for HKX export

**Workflow:**
1. Set up ck-cmd path in External Tools
2. Rig your mesh to FO4 skeleton
3. Create animation in Action Editor
4. Open this panel → "Export Animation (HKX)"
5. Choose output .hkx path

---

## 16. ARMOR & CLOTHING

**Purpose:** FO4-specific armor/clothing mesh setup.

**Buttons:**
- **Setup Armor Rig** — attaches mesh to FO4 armor skeleton with correct biped slots.
- **Assign Biped Slot** — set which armor slot (30=head, 31=hair, 32=body, etc.)
- **Auto-Weight Armor** — assigns weights from FO4 body mesh reference.
- **Mirror Weights** — mirrors vertex weights from left to right side.
- **Export Armor NIF** — exports with armor-specific NIF settings and BSTriShape
  flags for equipment.

**Biped slot reference:**
- 30 = Head, 31 = Hair, 32 = Body, 33 = Hands, 34 = Forearms
- 35 = Amulet, 36 = Ring, 37 = Feet, 38 = Calves, 39 = Shield
- 40 = Tail, 41 = Long Hair

---

## 17. PRESET LIBRARY

**Purpose:** Save and recall complete mesh/material/export setting configurations.

**Buttons:**
- **Save Current as Preset** — saves all current settings, tool paths, and object
  properties as a named preset.
- **Load Preset** — applies a saved preset (restores all settings).
- **Delete Preset** — removes a saved preset.
- **Export Presets** — save your preset library to a JSON file for backup/sharing.
- **Import Presets** — load a preset library from JSON.

**Use case:** You have a "vegetation" workflow preset and an "armor" workflow
preset. Switch between them with one click.

---

## 18. ADD-ON INTEGRATIONS

**Purpose:** Connect and control other Blender addons and external tools.

**Supported integrations:**
- **PyNifly** — NIF exporter status and version
- **Niftools** — legacy NIF addon status (Blender 3.6 LTS)
- **Daz Importer** — DAZ Bridge/Diffeomorphic status
- **Mesh2Rig** — auto-rigging from mesh
- **UE4/UE5 Importer** — Unreal asset import tools

**Buttons:**
- **Check Integration Status** — verifies each integration is installed and working
- **Open Integration Settings** — opens the settings for a specific integration

---

## 19. DESKTOP TUTORIAL APP

**Purpose:** Connects Blender to the Mossy desktop tutorial application.

**Connection settings:**
- **Server Port** — TCP port for Mossy ↔ Blender communication (default: 9999)
- **AI Port** — port for Mossy's local LLM (default: 5000)
- **Token** — authentication token (auto-generated, copy into Mossy desktop settings)

**Buttons:**
- **Quick Connect to Mossy** — tests bridge, AI, and server. Shows status for each.
- **Start Server** — starts the TCP listener so Mossy can send commands to Blender.
- **Stop Server** — stops the TCP listener.
- **Generate New Token** — creates a new auth token for security.
- **Copy Token** — copies token to clipboard for pasting into Mossy desktop app.

**Status indicators:**
- Bridge ✓ = Mossy desktop app is running and reachable
- AI ✓ = Mossy's local LLM is responding (port 5000)
- Server ✓ = Blender is listening for Mossy commands (port 9999)

---

## 20. DIAGNOSTICS & HEALTH

**Purpose:** System health check and auto-repair.

**Buttons:**
- **Run Diagnostics** — comprehensive check of all modules, operators, tools, and
  paths. Outputs a full report to the System Console (Window → Toggle System Console).
- **Auto-Fix Issues** — attempts to repair common problems automatically:
  - Re-imports failed modules
  - Clears stale tool path cache
  - Retries PyNifly installation
  - Refreshes AI tool status
- **Clear Tool Path Cache** — forces the addon to re-search for tools next startup.

**Reading the diagnostic report:**
- ✓ = healthy
- ✗ = failed / missing (click Auto-Fix to repair)
- ⚠ = warning (works but sub-optimal)
- · = informational (not an error)

**Common fixes from diagnostics:**
- Module failed → Auto-Fix usually resolves it (lazy-loaded AI modules)
- Tool path not found → set correct path in External Tools panel
- PyNifly missing → Setup panel → Auto-Install PyNifly

---

## 21. OPERATION LOG

**Purpose:** History of all operations run in this session.

Shows a scrollable list of every action taken (imports, exports, installs, etc.)
with timestamps. Useful for debugging "what did I just do?" situations.

**Buttons:**
- **Clear Log** — clears the current session log.
- **Export Log** — saves the log to a text file.

---

## 22. MOSSY (Quick Connect Panel)

**Purpose:** One-click connection to Mossy desktop app and status display.

**Button: Quick Connect to Mossy**
Tests three things simultaneously:
1. Bridge connection (port 21337) — is Mossy desktop running?
2. AI/LLM (port 5000) — is the local AI responding?
3. TCP server (port 9999) — is Blender listening for commands?

Reports pass/fail for each. If all three pass, full AI assistance is active.

**Status fields shown after connecting:**
- Bridge status message (version number)
- LLM status (port/timeout info if failing)
- Server status (running/stopped)
- **Token** — the auth token. Copy this into Mossy desktop app's Blender settings.

**If AI/LLM fails:** The Mossy LLM (Nemotron) uses port 5000. If it shows
"timed out" the LLM service isn't running. Start Mossy desktop app, go to its
AI section, and start the Nemotron service.

---

## 23. NPCs & CREATURES *(v5.2)*

**Purpose:** AI-assisted NPC and creature animation generation.

**Main field: "Describe what the NPC/creature does"** — type natural language
like "idle breathing guard stance" or "creature charge rush attack".

**Quick Pick presets** (click to fill the description):
- Movement: Idle, Crouch, Slide, Dodge
- Cover: Hide, Lean Left, Lean Right, Peek
- Combat Hand-to-Hand: Jab, Cross, Kick, Combo
- Sneak: Sneak idle, Attack front/back/side
- Reactions: Hit react, Stagger, Death forward, Epic death
- Creature: Charge, Pounce, Bite, Roar
- Social: Wave, Point, Shrug, Surrender
- Power Armor: PA Walk, PA Punch, PA Slam, PA Stomp

**Buttons:**
- **Full Pipeline (Build Skeleton + Animate)** — generates skeleton AND animations
  from description. Best for new NPC meshes.
- **Generate Animations** (requires armature selected) — adds animations to existing
  skeleton. Mesh must have an armature modifier.

**Keywords guide:** idle/stand/crouch, cover/lean/peek, punch/jab/kick/block,
sneak/stealth, hit/stagger/death, creature/charge/pounce/bite, wave/point/shrug

---

## 24. WEAPONS *(v5.2)*

**Purpose:** AI-assisted weapon mesh setup and animation.

**Main field: "Describe your weapon"** — type e.g. "10mm pistol handgun" or
"combat knife blade melee".

**Quick Pick presets:**
- Firearms: 10mm Pistol, Pipe Pistol, Combat Rifle, Hunting Rifle, Shotgun, Launcher
- Melee: Combat Knife, Baseball Bat, Pipe Wrench, Frag Grenade

**Keywords auto-set up the correct rig and animations:**
- pistol/handgun/revolver → Pistol rig + reload + slide action animations
- rifle/assault/sniper → Rifle rig + reload + bolt action
- shotgun/launcher → Heavy weapon animations
- knife/blade/sword/bat → Melee swing + power attack
- grenade/molotov/thrown → Throw release arc animation

**Buttons:**
- **Full Pipeline: Rig + Animate** (needs mesh selected) — attaches FO4 weapon
  skeleton and generates fitting animations in one step.
- **Auto-Rig Only** — just attaches skeleton, no animation generation.
- **Generate Animations** (needs armature) — adds weapon animations only.

---

## 25. GLOW & SPORE EFFECTS *(v5.2)*

**Purpose:** Animated glow effects and spore particle systems for vegetation/creatures.

**Settings:**
- **Color** — glow colour picker (RGB)
- **Speed** — animation speed multiplier (0.1–5.0)
- **Strength** — glow intensity (0.1–10.0)
- **Describe the effect** — natural language e.g. "pulsate heartbeat bioluminescent"
- **Output Folder** — where Papyrus scripts and baked textures are saved

**Quick Picks:**
- Light: Pulse, Breathe, Flicker, Aurora
- Spore: Spore Cloud, Toxic Puff, Mushroom, Rainbow

**Buttons:**
- **Apply Glow Effect** (needs mesh) — generates glow material, keyframe animation,
  and Papyrus script for in-game glowing.
- **Manual Settings** — opens glow settings without AI description.
- **Bake _g Sequence** — renders the glow animation to a _g.dds texture sequence.

---

## 26. CK CELL EDITOR *(v5.2)*

**Purpose:** Import, edit, and export Creation Kit cell layouts directly in Blender.

**Import section:**
- **Import from ESP/ESM (No xEdit needed)** — directly reads a .esp/.esm file
  and imports the cell layout as Blender objects. Fastest method.
- **Import from xEdit CSV** — imports a CSV exported from xEdit/FO4Edit.
  Get CSV by: open FO4Edit → find cell → right-click → Copy as CSV → save.

**Edit section:**
- **Prepare Cell for Editing** — sets up scene for editing (layers, snapping grid).

**Export section:**
- **Export Cell NIF + ESP** — exports edited cell as NIF meshes + updated .esp plugin.
- **Export Single Object** — exports just the selected object as a NIF for use in CK.

**Workflow:**
1. Click "Import from ESP/ESM" → select your .esp/.esm file
2. Edit objects in Blender (move, replace, add)
3. Click "Export Cell NIF + ESP" → select output folder
4. Open Creation Kit → load your .esp to see the changes

---

## 27. ESP GENERATOR *(v5.2)*

**Purpose:** Auto-generate ESP plugin records for your meshes (no Creation Kit needed).

**Settings:**
- **Plugin Name** — name of the .esp file to create (e.g. "MyMod")
- **Author** — your name (stored in .esp header)
- **Output Folder** — where the .esp file is saved
- **Also write xEdit script (.pas)** — generates a Papyrus AutoScript for FO4Edit

**Supported record types:** STAT (static), FLOR (flora), ACTI (activator),
WEAP (weapon), ARMO (armor), MISC (misc item), LIGH (light)

**Workflow:**
1. Select the mesh objects you want to become game objects (must be MESH type)
2. Set Plugin Name, Author, and Output Folder
3. Click **"Generate ESP"** (button shows count of selected meshes)
4. The .esp + optional .pas script are created in the Output Folder
5. Copy .esp to your FO4 Data folder, enable in mod manager

**Note:** The addon uses the object name as the editor ID.

---

## 28. AI TEXTURE GENERATOR *(v5.2)*

**Purpose:** Generate new FO4-ready texture sets from text description using AI.

**Settings:**
- **Base Name** — filename prefix for the generated textures (e.g. "rusted_barrel")
- **Description** — text prompt for the texture (e.g. "rusted iron metal corroded orange")
- **Resolution** — output texture size (512 / 1024 / 2048)
- **Output Folder** — where generated DDS files are saved

**Quick Picks** (click to fill description):
Rusted Iron, Worn Wood, Concrete, Leather, Circuit Board, Vault Wall, Tree Bark, Brick Wall

**Button: Generate Texture Set (diffuse + normal + spec)**
Generates three textures:
- `basename_d.dds` — diffuse/albedo
- `basename_n.dds` — normal map
- `basename_s.dds` — specular

**Required:** PyTorch must be available. Hunyuan3D or diffusers models needed.

---

## 29. BATCH EXPORT & PRESETS *(v5.2)*

**Purpose:** Batch export multiple objects and manage workflow presets.

**Batch Export settings:**
- **Output Folder** — where NIF files are saved
- **Apply FO4 Prep** checkbox — run Prepare mesh before each export

**Button: "Export N Objects as NIFs"** (shows count of selected mesh objects)
Exports each selected mesh as its own NIF file. Object name becomes filename.

**LOD section:**
- **Auto LOD1/2/3 for Selected** — generates LOD levels for all selected meshes
  at once. Creates LOD0/1/2/3 NIF files for each.

**Workflow Presets section:**
- **Save Current Settings** — saves all current panel settings as a preset.
- **Load Preset** — applies a previously saved settings preset.

---

## 30. SETTLEMENT WORKSHOP *(v5.2)*

**Purpose:** Prepare meshes for FO4 Settlement Workshop (buildable items).

**Snap Points section:**
- **Add Snap Points (Auto-Detect)** — analyzes mesh geometry and places
  SNAP_ORIGIN and SNAP_WALL markers at logical connection points.

**Performance Budget section:**
- **Check Budget** — evaluates mesh against Workshop performance guidelines
  (triangle count, draw calls, texture resolution).

**COBJ / Workshop Menu Stubs section:**
- **Plugin** field — your mod's .esp name
- Category buttons: STRUCTURES, FURNITURE, POWER, FOOD, DEFENSE, LIGHTING,
  DECORATIONS, STORES, MISC
- Click any category button with meshes selected to generate:
  - COBJ record (crafting recipe)
  - Workshop menu entry stubs
  - Basic Papyrus script template

**Workflow:**
1. Select your prop mesh(es)
2. Add Snap Points
3. Check Budget
4. Set Plugin name → click category → click "Generate Workshop Stubs"
5. Resulting .esp + stubs go in Output Folder

---

## 31. COMPATIBILITY CHECKER *(v5.2)*

**Purpose:** Scan your mod for conflicts with popular FO4 overhauls.

**Settings:**
- **FO4 Data Folder** — path to FO4 Data directory (for reading other mods' assets)

**Button: Run Full Compatibility Scan**
Checks selected meshes against known conflicts:
- CBBE body compatibility (armor biped slot conflicts)
- Bone naming issues (must match FO4 skeleton exactly)
- Scale/unit issues
- Naming convention violations
- AWKCR (Armor and Weapon Keywords) slot conflicts

**Results** printed to System Console (Window → Toggle System Console).
Checks: skeleton compat, scale, naming, CBBE, AWKCR, slot conflicts.

---

## 32. DIALOGUE TREE EDITOR *(v5.2)*

**Purpose:** Visual node-based NPC dialogue tree editor inside Blender.

**Workflow:**
1. Click **"New Dialogue Tree"** — creates a node group in Blender's Node Editor
2. Open **Node Editor** (top bar → Editor Type → Shader Editor, then switch to
   "FO4 Dialogue Tree" type)
3. Add FO4DialogueNode nodes — connect them to form conversation branches
4. Set topic text, conditions, and player responses on each node
5. Click **"Export JSON + xEdit"** — generates:
   - dialogue.json (for reference)
   - A Papyrus AutoScript .pas file for FO4Edit

**Trees:** The panel shows count of existing dialogue trees in the scene.

---

## 33. WEATHER & INTERIOR *(v5.2)*

**Purpose:** Add FO4-style weather particle systems and interior lighting.

**Weather Particle Systems** — click type button to add to scene:
- **Rain** — falling rain particles
- **Snow** — snow flurry particles
- **Ash** — ashfall (wasteland / volcanic areas)
- **Rad Storm** — radioactive storm particles (green-tinted)
- **Fog** — ground fog volume
- **Blizzard** — heavy snow + wind particles

**Interior Cell Helpers** — auto-place lights above floor surfaces:
- **Warm** — warm tungsten interior lighting
- **Cool** — cool fluorescent lighting
- **Vault** — vault-tec fluorescent (blue-white)
- **Neon R / Neon B** — neon sign lighting (red / blue)
- **Candle** — flickering candle point lights
- **Rad** — radioactive ambient glow

**Button: Add Room Snap Grid** — places a snapping grid at floor level for
precise interior object placement.

---

## 34. NAVMESH GENERATOR *(v5.2)*

**Purpose:** Generate and validate FO4-compatible navigation meshes for AI pathing.

**FO4 NavMesh limits:**
- Maximum 32,767 vertices
- Maximum 16,384 triangles
- Must be ALL triangles (no quads)
- Must be manifold (no holes or non-manifold edges)

**Button: Generate NavMesh from Selected**
Creates a NavMesh from selected mesh objects. Auto-triangulates and validates.

**Validate button** (requires active mesh):
- Checks triangle count, vertex count, manifold status
- Reports any limit violations

**Decimate button** — reduces NavMesh complexity if over limits.

**Cover Markers section:**
- **Left Cover / Right Cover** — places cover marker at selected face
- **Edge Cover** — marks an edge as cover (for lean-out)
- **Clear** — removes cover markers from selected faces

**Workflow:**
1. Build or import your level geometry
2. Select floor/ground surfaces
3. Click "Generate NavMesh from Selected"
4. Validate — fix any issues
5. Add cover markers at walls
6. Export via Export panel → NIF export includes NavMesh BSTreeShape

---

## 35. MESH TOOLS (PYMESHLAB)

**Purpose:** High-quality mesh repair, optimization, and splitting via PyMeshLab.

**If PyMeshLab is not installed:**
Click **"Install PyMeshLab"** — downloads and installs automatically via pip.
No restart required. Panel updates to show tools once installed.

**Tools available after install:**

### One-Shot Pipeline
- **Clean & Reduce** — runs repair + decimate in one step. Best for imported meshes
  that need both cleaning and polygon reduction. Settings: target poly count.

### Repair
- **Repair Mesh** — removes duplicate faces, fixes inverted normals, closes small
  holes, removes degenerate triangles. Use on imports with bad geometry.

### Reduce (LOD Quality)
- **Decimate Mesh** — reduces polygon count while preserving shape better than
  Blender's built-in Decimate modifier. Uses quadric error metrics.
  *Use for high-quality LOD generation.*

### Split Into Parts
- **Split by Components** — splits a single mesh object into separate objects
  by connected component. Useful for imported meshes where parts are joined.

**Settings:**
- **Target Poly Count** (for Decimate) — how many faces to reduce to
- **Repair aggressiveness** — how aggressively to fix geometry errors

**Credits:** PyMeshLab by CNR-ISTI VCLab (MIT license).

---

## COMPLETE WORKFLOW GUIDES

### A. Import Daz Studio Asset → Export to FO4 NIF

1. N-panel → **Game Assets** → **Import Asset** → select .duf or .dsf file
   *(Alt: File → Import → DAZ Studio File (.dsf/.duf))*
2. Select the imported mesh
3. **Mesh Helpers → Prepare External Mesh for FO4** (fixes everything automatically)
4. **Texture Helpers → Auto-Load Textures** (or assign manually)
5. **Export → Export Static Mesh (Full Pipeline)** → choose output path
6. Done — NIF + BGSM written to your mod folder

### B. Vegetation / Tree Mod

1. Import or model trunk + leaf card planes
2. **Prepare External Mesh for FO4** on trunk
3. Select leaf cards → **Mesh Helpers → Thicken Flat Planes** → Cross Card, count=2–4
4. Apply leaf texture with alpha, set alpha clip in material
5. Select full tree → **Animation → Smart Wind + FO4 Export Prep**
6. **Mesh Helpers → LOD → Generate LOD Chain** (auto-creates LOD0–3)
7. **Export Static Mesh (Full Pipeline)**

### C. Static Prop (sign, barrel, furniture, etc.)

1. Model or import prop
2. **Prepare External Mesh for FO4**
3. **Mesh Helpers → Collision → Generate Collision Mesh** (creates UCX_ shape)
4. Set up material + textures
5. **Validate Before Export** — fix any warnings
6. **Export Static Mesh (Full Pipeline)**

### D. NPC / Creature Mesh

1. Import mesh (FBX from Daz or OBJ)
2. **Animation → Import FO4 Skeleton** (or Auto-Rig Mesh panel)
3. **Prepare External Mesh for FO4** (with Remove Vertex Colors enabled)
4. Paint weights or **Animation → Auto-Weight Paint**
5. **Animation → Enforce Bone Limit** (max 4 influences per vertex)
6. For shape keys: **Export → Export TRI Morphs**
7. **Export → Export Mesh to NIF**

### E. Settlement Workshop Item

1. Model or import prop
2. **Prepare External Mesh for FO4** + **Generate Collision Mesh**
3. Open **Settlement Workshop** panel
4. **Add Snap Points** → **Check Budget**
5. Set Plugin Name → click category → **Generate Workshop Stubs**
6. **Export Static Mesh** with output to mod folder
7. Load .esp in FO4Edit to review records

### F. First Mod From Scratch

1. N key → Fallout 4 tab
2. **Setup & Status** → check all green ✓ (install PyNifly if needed)
3. **External Tools** → set tool paths (NVTT, TexConv minimum)
4. **Game Assets** → set FO4 Data Folder and Mod Output Folder
5. Model your mesh (or import)
6. **Prepare External Mesh for FO4**
7. **Export Static Mesh (Full Pipeline)**
8. Check output folder — NIF + BGSM ready for mod manager

---

## COMMON PROBLEMS AND FIXES

| Problem | Fix |
|---------|-----|
| Panel not showing | Press N in 3D Viewport → click "Fallout 4" tab |
| NIF export fails, PyNifly error | Setup panel → Auto-Install PyNifly |
| "65535 vertex limit exceeded" | Mesh Helpers → Decimate Mesh or PyMeshLab → Decimate |
| Non-manifold edge error | Prepare External Mesh (auto-fixes) or PyMeshLab → Repair |
| DDS conversion fails | External Tools → set NVTT or TexConv path |
| Mossy Bridge not reachable | Open Mossy desktop app first, then Quick Connect |
| Mossy LLM timed out (port 5000) | In Mossy desktop app, start the Nemotron/LLM service |
| Module failed in diagnostics | Diagnostics panel → Auto-Fix Issues |
| Texture not showing in Blender | Enable DDS add-on: Edit → Preferences → Add-ons → "DDS" |
| Wrong scale in-game | Ctrl+A → Apply All Transforms before export |
| Animation won't export (HKX) | Set ck-cmd path in External Tools; ck-cmd must be compiled |
| No UV map error | Edit Mode → select all → U → Smart UV Project |
| Weights wrong after rigging | Animation → Normalize Weights + Enforce Bone Limit |
| Instant-NGP not building | Start Mossy desktop app and run Auto-Fix (Mossy handles CMake) |
| PyMeshLab not installed | Mesh Tools panel → Install PyMeshLab (auto-downloads) |

---

## TOOL PATH QUICK REFERENCE

| Tool | Default Location |
|------|-----------------|
| NVTT | `D:\blender_tools\nvtt\nvidia-texture-tools-2.1.2-win\bin\nvcompress.exe` |
| TexConv | `D:\blender_tools\texconv\texconv.exe` |
| FFmpeg | `D:\blender_tools\ffmpeg\...\bin\ffmpeg.exe` |
| ck-cmd | `D:\blender_tools\ck-cmd\` (folder) |
| RealESRGAN | `D:\blender_tools\realesrgan\realesrgan-ncnn-vulkan.exe` |
| Instant-NGP | `D:\blender_tools\instant-ngp\` (compiled .exe inside) |
| PyTorch | `D:\PyTorch\` |

---

## FO4 TECHNICAL REFERENCE

**NIF version:** 20.2.0.7, UserVersion 12, BSVersion 130

**Key NIF nodes:**
- BSFadeNode (root), BSTriShape (mesh), BSLightingShaderProperty (material)
- BSShaderTextureSet (texture list), bhkCollisionObject + bhkRigidBody (physics)
- NiControllerSequence (animation)

**Mesh limits:**
- 65,535 verts/tris per BSTriShape
- 4 bone influences per vertex maximum
- UV map named exactly "UVMap"
- All transforms applied before export

**Texture naming:**
- `textures/[path]/name_d.dds` — diffuse
- `textures/[path]/name_n.dds` — normal (DirectX, Y-inverted vs OpenGL)
- `textures/[path]/name_s.dds` — specular
- `textures/[path]/name_g.dds` — glow/emissive

**Havok physics:** UCX_ prefix for collision, convex shapes only (no concave),
bhkConvexVerticesShape for simple props, bhkCompressedMeshShape for complex.

**NavMesh:** BSTreeShape node, all-triangles, manifold, max 32767 verts / 16384 tris.

**Papyrus:** Scripts compiled to .pex, source is .psc. BA2 archives pack Data folder.
