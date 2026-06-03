# Mossy Industries Blender Add-on — Complete Guide for Mossy AI

This document is the authoritative reference for Mossy AI to help users with
every aspect of the Mossy Industries Blender Add-on. Use it to answer questions
about panels, workflows, features, troubleshooting, and step-by-step processes.

---

## 1. What the Add-on Does

The Mossy Industries Blender Add-on is a professional Fallout 4 modding toolkit
built into Blender's N-panel (press N in the 3D viewport, then click "Fallout 4").
It covers the full mod-creation pipeline:

- Import assets (Daz Studio .duf/.dsf, FBX, OBJ, NIF)
- Prepare and validate meshes for FO4 (triangulate, UV, materials, collision)
- Export to FO4 NIF format via PyNifly or Niftools
- Generate BGSM/BGEM material files
- Convert textures to DDS (BC7/BC1) using NVTT or TexConv
- Wind animation for vegetation
- Thicken flat planes (leaf cards, grass cards, signs)
- LOD chain generation
- Skeleton/rig helpers for NPCs and creatures
- Papyrus script templates
- Mod packaging (BA2 archives, FOMOD installer)
- AI scene analysis and advice via Mossy desktop app (FREE, local, no cloud)

---

## 2. N-Panel Layout (Press N → Fallout 4 Tab)

### Main Panel — "Fallout 4 Tools"
The primary panel. Shows the active object name and type. Contains:
- **Full FO4 Pipeline** — one-click Convert/Prepare/Fix buttons
- **Mesh Helpers** — optimize, validate, collision, LOD
- **Thicken Flat Planes** — leaf cards, grass cards, solid props
- **Export** — NIF export, BGSM export, scene export
- **Textures** — DDS conversion, material setup

### Setup & Status Panel
First-run setup. Shows dependency status (PyNifly, Niftools, NVTT, TexConv).
Has "Install Core Dependencies" and "Environment Check" buttons.

### AI Advisor Panel
Mossy AI chat interface. Ask any question about your mesh or mod. Requires
Mossy desktop app running (free download, connects via localhost only).

### Game Assets Panel
Browse and import assets from your FO4 Data folder or extracted game files.
Import button supports: FBX, OBJ, NIF, DUF, DSF, DDS, PNG, TGA.

### Animation Panel
Wind animation setup, Havok physics, animation export (HKX via ck-cmd).

### Vegetation Panel
Thicken Flat Planes section + Wind Setup.

### Materials Panel
BGSM browser, material setup, texture slot assignment.

### Mod Packaging Panel
BA2 archive creation, FOMOD installer XML generation, manifest creation.

---

## 3. Complete Workflow: Import Daz Asset → Export to FO4

### Step 1 — Import the Daz Asset
1. In the N-panel, go to **Game Assets** section
2. Click **"Import Asset"** button
3. In the file browser, navigate to your .duf or .dsf file
4. Select it and click Open (the addon routes it to the DAZ importer automatically)

   **Alternative**: File menu → Import → DAZ Studio File (.dsf/.duf)

   **What happens**: The mesh, skeleton, and materials are imported into Blender.
   Daz uses centimetres; the importer applies a 0.01 scale to convert to metres.

### Step 2 — Prepare the Mesh for FO4
1. Select the imported mesh object
2. In the N-panel → **Full FO4 Pipeline** section, click:
   - **"Prepare External Mesh for FO4"** — applies transforms, cleans UV maps,
     sets up FO4 material, optimizes geometry, auto-fixes non-manifold edges
   OR
   - **"Convert to Fallout 4 (Full Pipeline)"** — one-click full conversion

3. What gets fixed automatically:
   - Rotation and scale transforms applied
   - UV map renamed to "UVMap" (FO4 requirement), extras removed
   - FO4-compatible material created if none exists
   - Mesh optimized (merge doubles, smooth normals)
   - Non-manifold edges repaired

### Step 3 — Validate the Mesh
1. Click **"Validate Mesh"** or **"Validate Before Export"**
2. Read any warnings — fix them before exporting
3. Common issues and fixes:
   - "No UV map" → Add a UV unwrap in Edit Mode
   - "Non-manifold edges" → Use Auto-Fix or manually fill holes
   - "Too many vertices" → Run Decimate modifier, keep under 65,535
   - "No material" → Click "Auto-Setup FO4 Material"

### Step 4 — Set Up Textures
1. In the **Textures** section, click **"Auto-Load Textures"** to scan for textures
2. Or manually assign textures in the material slots:
   - _d.dds = diffuse/albedo
   - _n.dds = normal map
   - _s.dds = specular/smoothness
   - _g.dds = glow/emissive (optional)
3. Click **"Convert Textures to DDS"** if your textures are PNG/TGA

### Step 5 — Export as NIF
1. In the **Export** section, enter your mod output folder path
2. Click **"Export Static Mesh (Full Pipeline)"** for a complete one-click export
   OR use **"Export Mesh to NIF"** for manual control
3. The NIF goes to: [YourModFolder]/Data/Meshes/[subfolder]/meshname.nif
4. BGSM material file goes to: [YourModFolder]/Data/Materials/

---

## 4. Complete Workflow: Tree / Vegetation Mod

### Setting Up a Tree Mesh

**Trunk and Branches:**
1. Import or model your trunk/branch mesh
2. Run "Prepare External Mesh for FO4"
3. In Vegetation panel → **"Smart Wind + FO4 Export Prep"** — auto-detects mesh
   type and applies correct wind weights

**Leaf Cards (flat planes with leaf texture):**
1. Create or import your leaf card plane
2. In Vegetation panel → **Thicken Flat Planes** section:
   - Click **"Thicken Selected Plane"**
   - Choose technique:
     - **Cross Card** (recommended for leaves) — creates 2-4 intersecting planes
       so leaves look 3D from every angle. Use "Card Count: 2" for X shape,
       "Card Count: 3" for star shape, "Card Count: 4" for dense canopy.
     - **Solidify** — adds real geometry thickness. Good for thick bark planes.
     - **Both** — solidify + cross card combined for maximum depth.
   - Set Thickness (0.02-0.1 works well for leaves)
   - Click OK

3. Apply your leaf texture with alpha channel (cutout transparency)
4. In Material settings, enable alpha clip (not alpha blend — for performance)

**Wind Animation for Trees:**
1. Select your tree mesh
2. In **Animation** panel → **Wind Setup**:
   - Click **"Smart Wind + FO4 Export Prep"** — automatically applies wind
     weights based on mesh shape (trunk = less wind, branch tips = more)
   - OR manually: "Generate Wind Weights" then adjust vertex groups
3. For shrubs/trees: wind uses armature + shape keys
4. For grass: wind is engine-side (GRAS record), no bones needed

**LOD Chain:**
1. Select your finished tree mesh (highest detail = LOD0)
2. In **Mesh Helpers → LOD** section:
   - Click **"Generate LOD Chain"**
   - LOD0 = full detail (0-15m), LOD1 (15-40m), LOD2 (40-100m), LOD3 (100m+)
   - Each LOD is a separate NIF exported automatically
3. Name your NIFs: treename_lod0.nif, treename_lod1.nif, etc.

---

## 5. Complete Workflow: Static Prop (Sign, Furniture, Weapon, etc.)

1. Import or model your prop
2. Run **"Prepare External Mesh for FO4"**
3. In **Collision** section:
   - Select collision type: STATIC (most props), DYNAMIC (throwable items)
   - Click **"Generate Collision Mesh"** — creates UCX_ prefixed collision object
4. Run **"Validate Before Export"** — fix any issues shown
5. Set up material and textures
6. Click **"Export Static Mesh (Full Pipeline)"** → enter your mod output folder

---

## 6. Complete Workflow: NPC / Creature Mesh

1. Import your mesh (FBX from Daz, or OBJ)
2. In **Skeleton Helpers** section, use **"Import FO4 Skeleton"** to load the
   standard FO4 skeleton (fo4_skeleton.nif must be in your tools folder)
3. Run **"Prepare External Mesh for FO4"** with "Remove Vertex Colors" enabled
4. Assign vertex groups matching FO4 bone names (or use **"Auto-Weight Paint"**)
5. Keep bone influences ≤ 4 per vertex — use **"Enforce Bone Limit"** operator
6. For shape keys (facial morphs): use **"Export TRI Morphs"** in Export section
7. Export via **"Export NIF"**

---

## 7. Feature Reference — Thicken Flat Planes

**Location**: N-panel → Vegetation section → "Thicken Flat Planes" box

**Purpose**: Give alpha-cutout flat planes the appearance of 3D depth.
FO4 uses many flat planes for leaves, grass, ferns, and other vegetation.
Without thickening they look unrealistically flat when viewed from the side.

**Techniques:**

| Technique | Best For | How It Works |
|-----------|---------|--------------|
| Cross Card | Leaves, grass, foliage | Duplicates plane, rotates copies at equal angles, merges into one X/star/dense shape. Looks 3D from all viewing angles with minimal extra polygons. |
| Solidify | Signs, fences, thin props, bark | Adds real geometry depth using Blender's Solidify modifier, then applies it. Fill Rim caps the open edges. |
| Solidify + Cross | Thick leaf clusters, bushes | Both combined for maximum 3D illusion |

**Settings:**
- **Thickness** (Solidify): how deep the geometry gets. 0.02–0.1m for leaves.
- **Fill Rim**: caps the side edges of solidified plane (enable for solid props)
- **Even Thickness**: maintains uniform depth around curved edges
- **Card Count** (Cross Card): 2=X shape, 3=star/Y, 4=dense cross

**Batch button**: "Thicken All Selected Planes" — select many planes at once,
apply the same technique to all of them in one click.

---

## 8. Feature Reference — FO4 Export Pipeline

**Export Static Mesh (Full Pipeline)** — `fo4.pipeline_static_mesh`
Validates → applies transforms → triangulates → smooths normals → generates
UCX_ collision → exports NIF + BGSM in one click. Opens a file browser to
choose the NIF output path.

**Export Mesh to NIF** — basic NIF export. Requires PyNifly (recommended for
Blender 4.x/5.x) or Niftools v0.1.1 (Blender 3.6 LTS).

**Export Scene as NIF** — exports all visible mesh objects as a single NIF.

**Export BGSM** — generates .bgsm material files from active object materials.

**Export TRI Morphs** — exports shape keys as .tri morph file (FRTRI003 format)
for NPC facial animation.

---

## 9. Feature Reference — Mossy AI Advisor

**What it can do** (requires Mossy desktop app running):
- Analyze your current mesh and spot issues before export
- Give step-by-step advice for your specific situation
- Answer any FO4 modding question
- Help debug export errors

**How to use**:
1. Make sure Mossy desktop app is running (check status in Setup panel)
2. Select your mesh object in Blender
3. Open AI Advisor panel in the N-panel
4. Type your question or click "Analyze Scene"
5. Mossy answers based on your actual mesh data + FO4 knowledge

**All processing is local** — no cloud services, no API keys, runs on your GPU.

---

## 10. Troubleshooting Common Issues

### "PyNifly not found" / NIF export fails
- Go to **Setup & Status** panel → click **"Auto-Install PyNifly (Latest)"**
- Or download from GitHub: BadDogSkyrim/PyNifly and install via Blender preferences
- For Blender 3.6 LTS: use Niftools v0.1.1 instead

### Mesh exports but looks wrong in-game
- Check that transforms were applied (scale/rotation = 1,0,0)
- Ensure UV map is named exactly "UVMap"
- Verify no more than 65,535 verts/faces per BSTriShape
- Check material shader flags in BGSM file

### "Non-manifold edges" error
- In Edit Mode, Select → Select All by Trait → Non Manifold
- Fix: close holes with Fill (F), merge nearby vertices with M → By Distance
- Or click **"Auto-Fix Non-Manifold Edges"** in the Prepare mesh operator

### Import fails / DAZ file won't load
- Make sure you're using **Import Asset** button (supports .duf/.dsf) OR
  File → Import → DAZ Studio File (.dsf/.duf)
- Check the Blender console (Window → Toggle System Console) for error details
- Try exporting from DAZ as FBX first, then importing the FBX

### Textures not showing / DDS won't load
- Blender needs the DDS plugin enabled: Edit → Preferences → Add-ons → search "DDS"
- Or convert DDS to PNG using NVTT/TexConv first, work in Blender, re-convert on export
- Click **"Convert Textures to DDS"** in Textures section to batch-convert

### Blender lags / slow startup
- Check Setup & Status panel — if packages are still installing, wait for them
- Make sure Mossy desktop app is running for best performance
- Core tools load in ~1 second; advanced features load quietly after 3 seconds

### Wind animation looks wrong / too strong
- Select the mesh, go to Animation panel → **Wind Setup**
- Use **"Smart Wind + FO4 Export Prep"** which auto-calibrates for mesh size
- Manually adjust wind weight vertex group values: 0 = no movement, 1 = full sway
- Trunk base = 0 (anchored), branch tips = 0.8–1.0 (maximum sway)

### Collision not working in-game
- Collision mesh MUST be named with UCX_ prefix: UCX_meshname
- Must be a convex shape (no concave shapes in FO4 Havok)
- In Blender: select collision → set as "PASSIVE" rigid body type
- Run **"Generate Collision Mesh"** to auto-create a correct UCX_ mesh

### Material / BGSM issues
- BGSM files must be in Data/Materials/ relative path matching the NIF path
- Texture paths in BGSM are relative to Data/Textures/
- Use the **BGSM Browser** to check and fix material file contents

---

## 11. Keyboard Shortcuts & Tips

- **N key** in 3D viewport → opens/closes the N-panel (Fallout 4 tab)
- **Tab** → toggle Edit Mode / Object Mode
- **Ctrl+A** → Apply transforms (scale/rotation — do this before export)
- **Alt+G / Alt+R / Alt+S** → clear location/rotation/scale
- **Ctrl+L** → select linked geometry in Edit Mode
- **G, S, R** → grab, scale, rotate

---

## 12. Mod Output Folder Structure

Your mod folder should be structured as:
```
YourModName/
├── Data/
│   ├── Meshes/
│   │   └── [your NIF files here]
│   ├── Materials/
│   │   └── [your .bgsm files here]
│   ├── Textures/
│   │   └── [your .dds files here]
│   └── Scripts/
│       └── [compiled .pex Papyrus scripts]
```

Set this root folder in the **Game Assets** section → "Mod Output Folder" field.
The add-on automatically places NIF, BGSM, and texture files in the correct
subdirectories when you use the full pipeline export.

---

## 13. Step-by-Step: First Mod From Scratch

1. Open Blender, open N-panel (N key), click **Fallout 4** tab
2. Go to **Setup & Status** panel — ensure PyNifly shows green ✓
3. Set your **FO4 Data Folder** path in Game Assets section
4. Set your **Mod Output Folder** (where finished files go)
5. Model or import your mesh
6. Select mesh → click **"Prepare External Mesh for FO4"**
7. Run **"Validate Before Export"** — fix any issues
8. Set up material and assign textures
9. Click **"Export Static Mesh (Full Pipeline)"** → choose output NIF path
10. Open Creation Kit → File → Data → load your mod .esp
11. Find your NIF in Object Window → Static objects, place it in a cell
12. Test in game

---

## 14. Tools the Add-on Can Auto-Install

The add-on can download and configure these tools automatically:
- **PyNifly** — NIF exporter for Blender 4.x/5.x (required for export)
- **Niftools** — NIF exporter for Blender 3.6 LTS
- **NVTT / TexConv** — DDS texture conversion
- **ck-cmd** — Havok animation conversion (HKX export)
- **UModel** — UE4 asset extraction
- **AssetStudio / AssetRipper** — Unity asset extraction
- **ffmpeg** — video processing (for AI features)

Go to **Setup & Status** panel → click the install button next to any missing tool.
