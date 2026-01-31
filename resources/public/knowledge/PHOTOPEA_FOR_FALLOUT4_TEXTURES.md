# Photopea for Fallout 4 Texture Creation - Complete Guide

## What is Photopea?

**Photopea** is a free, browser-based image editor that runs entirely in your web browser. It's essentially a Photoshop clone that requires no installation and works on any platform.

**Official Website:** https://www.photopea.com/

**Why Use Photopea for Fallout 4 Modding:**
- ✅ **100% Free** - No subscription, no purchase, no account required
- ✅ **No Installation** - Works in any modern browser (Chrome, Firefox, Edge)
- ✅ **Photoshop-Compatible** - Opens PSD files, uses similar interface
- ✅ **DDS Support** - Can export DDS with proper compression
- ✅ **Cross-Platform** - Windows, Mac, Linux, even Chromebooks
- ✅ **Offline Mode** - Can work without internet (after first load)
- ✅ **PBR Workflow** - Full layer support for material creation
- ✅ **No Registration** - Start working immediately
- ✅ **Fast** - Lightweight and responsive
- ✅ **Privacy** - All processing happens locally in browser

---

## Getting Started with Photopea

### Accessing Photopea

**Method 1: Direct Browser Access**
```
1. Open any modern browser
2. Go to: https://www.photopea.com/
3. Start creating immediately (no sign-up needed)
```

**Method 2: Desktop Shortcut (Chrome/Edge)**
```
1. Go to www.photopea.com
2. Click three dots → More tools → Create shortcut
3. Check "Open as window"
4. Acts like a desktop app!
```

**Method 3: Offline Use**
```
1. Visit www.photopea.com once (loads in browser cache)
2. Browser caches the entire app
3. Can use even with poor/no internet connection
4. Note: Cloud storage requires internet
```

### First-Time Setup

**Recommended Settings:**

1. **Interface Configuration:**
   ```
   Edit → Preferences → General:
   - UI Scaling: 100% (adjust for your display)
   - Theme: Dark (easier on eyes)
   - Show splash screen: Disabled (faster startup)
   ```

2. **Performance:**
   ```
   Edit → Preferences → Performance:
   - History States: 50 (more undo steps)
   - Cache: Auto
   ```

3. **Save Settings:**
   ```
   File → Close All
   Settings are saved to browser localStorage
   Persist across sessions automatically
   ```

### Understanding the Interface

**Layout (Photoshop-Compatible):**
```
┌─────────────────────────────────────────────┐
│ Menu Bar (File, Edit, Image, Layer, etc.)  │
├──────┬──────────────────────────────┬───────┤
│ Tools│     Canvas (Main Workspace)  │Layers │
│      │                               │Colors │
│ Bar  │                               │  +   │
│      │                               │Props  │
└──────┴──────────────────────────────┴───────┘
```

**Key Differences from Photoshop:**
- Some advanced filters are premium (most basics are free)
- No 3D capabilities (not needed for F4 textures)
- Slightly different hotkeys (but customizable)
- Ads in the UI (can be blocked with adblocker)

---

## Fallout 4 Texture Creation in Photopea

### 1. Creating Diffuse Texture (_d.dds)

**Step 1: Create New Document**
```
File → New
Name: MyTexture_d
Width: 2048 px
Height: 2048 px
Resolution: 72 PPI (doesn't matter for game textures)
Color Mode: RGB Color, 8 bit
Background: Transparent
Click: Create
```

**Step 2: Paint or Import Base**
```
Option A (Paint from scratch):
- Select Brush Tool (B)
- Paint base colors
- Use layers for organization

Option B (Import photo):
- File → Open & Place
- Select your reference image
- Transform to fit canvas
- Press Enter to place
```

**Step 3: Add Details**
```
Layer → New → Layer (for each detail pass)
- Use blend modes: Multiply, Overlay, Soft Light
- Add weathering, dirt, scratches
- Keep colors realistic (avoid pure white/black)
```

**Step 4: Export to DDS**
```
File → Export As → DDS
Settings:
- Compression: BC1 (DXT1) for opaque
             OR BC3 (DXT5) if alpha channel needed
- Generate Mipmaps: Yes
- Quality: High
Click: Save
```

**Quick Tip:** Photopea's DDS export is excellent and matches NVIDIA Texture Tools quality.

### 2. Creating Normal Map (_n.dds)

**Method 1: From Height Map (Recommended)**

**Step 1: Create Height Map**
```
New document: 2048×2048, Grayscale mode
Paint height information:
- White = Raised areas (bumps, ridges)
- Black = Recessed areas (grooves, dents)
- Gray = Flat surface
```

**Step 2: Generate Normal Map**
```
Filter → 3D → Normal Map
Settings:
- Strength: 3.0-8.0 (higher = more pronounced)
- Level: 7 (default is good)
- Click: OK
```

**Step 3: Export**
```
File → Export As → DDS
Settings:
- Compression: BC5 (3Dc/ATI2) ⚠️ CRITICAL
- Mipmaps: Yes
- Quality: Highest
```

**Method 2: From Diffuse Texture**

```
1. Open diffuse texture
2. Image → Adjustments → Desaturate
3. Image → Adjustments → Brightness/Contrast (increase contrast)
4. Filter → 3D → Normal Map (Strength: 2.0-5.0)
5. Export as BC5 DDS
```

**Common Issue:** If normal map looks wrong in-game:
- ✅ Must use BC5 compression (not BC3)
- ✅ Check Y-axis orientation (usually not inverted for F4)
- ✅ Lower strength value if too bumpy

### 3. Creating Specular Map (_s.dds)

**Understanding Channels for Fallout 4 PBR:**

- **Red Channel:** Specular intensity (how shiny)
- **Green Channel:** Glossiness (how smooth)
- **Blue Channel:** Usually black (unused)
- **Alpha Channel:** Metal mask (white=metal, black=non-metal)

**Step 1: Create Base Document**
```
File → New → 2048×2048 RGBA
```

**Step 2: Work with Channels**
```
Window → Channels (to see RGBA channels)

Red Channel (Specular):
1. Select Red channel only
2. Paint white on shiny areas
3. Paint gray on semi-shiny
4. Paint black on matte areas

Green Channel (Glossiness):
1. Select Green channel
2. Paint white on smooth surfaces
3. Paint black on rough surfaces

Blue Channel:
1. Fill with black (or 50% gray)

Alpha Channel (Metal Mask):
1. Select Alpha channel
2. Paint white where metal appears
3. Paint black for non-metal (plastic, rubber, paint)
```

**Step 3: Export**
```
File → Export As → DDS
Settings:
- Compression: BC3 (DXT5) - includes alpha
- Mipmaps: Yes
- Quality: High
```

**Quick Workflow Tip:**
```
1. Start with grayscale for Red channel
2. Duplicate to Green channel
3. Adjust brightness for variation
4. Create metal mask from selection
```

### 4. Creating Glow/Emissive Map (_g.dds)

**Step 1: Isolate Glowing Areas**
```
1. Open your diffuse texture
2. Use Magic Wand Tool (W) or Quick Selection
3. Select areas that should glow (LEDs, screens, etc.)
4. Select → Modify → Expand: 2px (include edges)
5. Select → Inverse
6. Delete (clear non-glowing areas)
```

**Step 2: Enhance Glow**
```
Image → Adjustments → Brightness/Contrast
- Brightness: +40
- Contrast: +30

Image → Adjustments → Hue/Saturation
- Shift hue to glow color (blue for energy, red for lasers, green for terminals)
- Increase saturation: +20-40
```

**Step 3: Add Glow Intensity via Alpha**
```
Layer → Layer Mask → Reveal All
Paint on mask:
- White = Full glow
- Gray = Partial glow
- Black = No glow
```

**Step 4: Export**
```
File → Export As → DDS
Settings:
- Compression: BC3 (DXT5)
- Mipmaps: Yes
- Quality: High
```

**Common Glow Colors:**
- Red (255, 0, 0): Laser sights, danger indicators
- Green (0, 255, 100): Terminals, fusion cores, friendly UI
- Blue (0, 150, 255): Energy weapons, plasma effects
- Orange (255, 150, 0): Warning lights, caution signs
- Cyan (0, 255, 255): Institute tech, synth components

### 5. Creating Parallax/Height Map (_p.dds)

**Step 1: Create Height Information**
```
1. Start with desaturated diffuse OR paint from scratch
2. Grayscale document: 2048×2048
3. Paint heights:
   - White = Maximum height
   - Black = Maximum depth
   - Mid-gray = Surface level
```

**Step 2: Refine with Levels**
```
Image → Adjustments → Levels
- Output Levels: 10 (min) to 245 (max)
- Avoid pure black/white (causes parallax artifacts)
```

**Step 3: Export**
```
File → Export As → DDS
Settings:
- Compression: BC4 (single channel grayscale)
- Mipmaps: Yes
- Quality: High
```

**Note:** Parallax mapping is performance-intensive and rarely used in Fallout 4. Only for high-detail hero assets.

### 6. Creating Subsurface Tint (_sk.dds)

**For Skin/Organic Materials**

**Step 1: Set Up Channels**
```
New document: 2048×2048 RGB
- Red Channel: Blood/redness under skin
- Green Channel: Skin mid-tones
- Blue Channel: Veins/subsurface structures
```

**Step 2: Paint Subtly**
```
Use soft brushes (0% hardness)
Low opacity (20-40%)
Reference real skin photos
Keep colors desaturated (not vibrant)
```

**Step 3: Export**
```
File → Export As → DDS
Settings:
- Compression: BC3 (DXT5)
- Mipmaps: Yes
```

---

## Advanced Photopea Techniques

### 1. Smart Objects (PSD Workflow)

**Use Case:** Non-destructive editing

```
1. Create texture layers
2. Right-click layer → Convert to Smart Object
3. Apply filters (remain editable)
4. Double-click to edit original
5. Changes update automatically
```

**Benefits for F4 Modding:**
- Edit diffuse, automatically updates normal
- Tweak colors without quality loss
- Iterate quickly

### 2. Adjustment Layers

**Better than direct edits:**

```
Layer → New Adjustment Layer → [Type]
Types:
- Hue/Saturation: Color changes
- Curves: Brightness/contrast
- Color Balance: Color grading
- Levels: Histogram adjustments

Benefits:
- Non-destructive
- Can be toggled on/off
- Easy to refine
```

### 3. Layer Styles for Effects

**Quick Effects:**

```
Right-click layer → Blending Options

Useful for F4:
- Bevel & Emboss: 3D depth
- Inner Shadow: Recessed areas
- Outer Glow: Emissive edges
- Gradient Overlay: Color variation
```

**Example: Metal Surface**
```
Base layer: Gray fill
Add Gradient Overlay: Linear, dark to light gray
Add Bevel & Emboss: Inner Bevel, 3px, 120°
Result: Brushed metal look
```

### 4. Seamless Texture Creation

**Make Tileable Textures:**

**Method: Offset Filter**
```
1. Create base texture
2. Filter → Other → Offset
   - Horizontal: 1024 px (half width)
   - Vertical: 1024 px (half height)
   - Wrap Around: Checked
3. Use Clone Stamp (S) to blend visible seams
4. Filter → Other → Offset again (reset)
5. Check for seams by tiling preview
```

**Method: Pattern Fill**
```
1. Create small tile (256×256)
2. Edit → Define Pattern
3. New document 2048×2048
4. Edit → Fill → Pattern (select your tile)
5. Adds variation with filters
```

### 5. PBR Material Workflow

**Complete PBR Set from Photo:**

**Step 1: Prepare Photo**
```
1. Open reference photo
2. Image → Adjustments → Auto Tone
3. Filter → Noise → Reduce Noise
4. Crop to square aspect ratio
5. Image → Image Size → 2048×2048
```

**Step 2: Create Diffuse (Albedo)**
```
1. Duplicate background layer
2. Image → Adjustments → Curves
   - Flatten lighting (reduce contrast slightly)
3. Image → Adjustments → Hue/Saturation
   - Reduce saturation to 80% (realistic)
4. Export: MyMaterial_d.dds (BC1)
```

**Step 3: Create Roughness Map**
```
1. Duplicate diffuse
2. Image → Adjustments → Desaturate
3. Image → Adjustments → Levels
   - Adjust contrast for roughness definition
4. Invert if needed (white=rough, black=smooth)
5. Save as working file (PSD)
```

**Step 4: Create Metalness Map**
```
1. New layer
2. Use Magic Wand to select metal areas only
3. Fill selection with white
4. Invert selection, fill with black
5. Blur slightly (1-2px Gaussian)
6. Save as working file (PSD)
```

**Step 5: Combine Specular Channels**
```
1. Open roughness PSD
2. Window → Channels
3. Copy roughness to Red channel
4. Copy roughness to Green channel (or adjust separately)
5. Fill Blue channel with black
6. Copy metalness to Alpha channel
7. Export: MyMaterial_s.dds (BC3)
```

**Step 6: Generate Normal Map**
```
1. Open diffuse
2. Image → Adjustments → Desaturate
3. Image → Adjustments → Curves (S-curve for contrast)
4. Filter → 3D → Normal Map (Strength: 4.0)
5. Export: MyMaterial_n.dds (BC5)
```

### 6. Batch Processing with Actions

**Automate Repetitive Tasks:**

**Create Action:**
```
1. Window → Actions
2. Click "Create new action" (folder icon)
3. Name: "Export DDS Diffuse"
4. Click Record
5. File → Export As → DDS (BC1, mipmaps)
6. Click Stop Recording
```

**Use Action:**
```
1. Open texture
2. Window → Actions
3. Select your action
4. Click Play (triangle icon)
5. Texture auto-exports with settings
```

**Example Actions for F4:**
- Export Diffuse (BC1)
- Export Normal (BC5)
- Export Specular (BC3)
- Resize to 2K
- Add Weathering Layer

### 7. Weathering and Realism

**Quick Weathering Technique:**

```
1. Add new layer above base color
2. Fill with dark brown (#4A3826)
3. Filter → Render → Clouds
4. Filter → Noise → Add Noise (10%)
5. Set blend mode: Multiply
6. Opacity: 30%
7. Add layer mask
8. Paint mask with soft brush (reveal weathering in crevices)
```

**Scratches:**
```
1. New layer
2. Edit → Stroke (1px, white, 100%)
3. Use Pencil Tool to draw scratch lines
4. Filter → Blur → Motion Blur (2-3px, random angles)
5. Set blend mode: Overlay or Soft Light
6. Opacity: 40%
```

**Edge Wear:**
```
1. Duplicate base layer
2. Filter → Stylize → Find Edges
3. Image → Adjustments → Threshold (create white edges)
4. Use as selection (Ctrl+Click on layer thumbnail)
5. On diffuse layer: Brighten selected edges
6. On specular layer: Increase spec on edges (shiny worn metal)
```

---

## Photopea vs GIMP vs Photoshop

| Feature | Photopea | GIMP | Photoshop |
|---------|----------|------|-----------|
| **Cost** | Free (ads) | Free | $20-60/mo |
| **Platform** | Browser (any OS) | Desktop app | Desktop app |
| **Installation** | None | Required | Required |
| **DDS Export** | Built-in | Plugin needed | Plugin needed |
| **Normal Maps** | Built-in filter | Plugin needed | Better plugins |
| **PSD Support** | ✅ Full | Partial | ✅ Native |
| **Smart Objects** | ✅ Yes | ❌ No | ✅ Yes |
| **Adjustment Layers** | ✅ Yes | ❌ No | ✅ Yes |
| **Performance** | Fast (2K textures) | Medium | Fast (all sizes) |
| **Offline Use** | After first load | ✅ Yes | ✅ Yes |
| **Learning Curve** | Easy (Photoshop-like) | Moderate | Moderate |
| **Actions/Batch** | ✅ Yes | Script-Fu | ✅ Advanced |
| **Updates** | Auto (web app) | Manual | Auto |

**When to Use Photopea:**
- ✅ No software installation allowed (school/work PC)
- ✅ Working on multiple computers (no setup needed)
- ✅ Want Photoshop-like interface for free
- ✅ Quick edits and touch-ups
- ✅ Chromebook or low-spec PC
- ✅ Opening PSD files without Photoshop
- ✅ Traveling (any device with browser)

**When to Use GIMP:**
- Need fully offline tool
- 4K+ textures (better performance)
- Prefer open-source software
- Need advanced scripting (Python)

**When to Use Photoshop:**
- Professional pipeline
- Advanced features (3D, advanced healing)
- Best performance for 8K+ textures
- Industry-standard compatibility

**Verdict for Fallout 4 Modding:** Photopea is **excellent** for 90% of texture work and requires zero setup.

---

## Photopea Limitations and Workarounds

### Limitation 1: Ads in Free Version

**Issue:** Banner ads visible in UI

**Workarounds:**
```
1. Use adblocker browser extension (uBlock Origin)
2. Pay for Photopea Premium ($5/month) - removes ads
3. Work in full-screen mode (Ctrl+` to hide panels)
4. Ignore ads (they're small and non-intrusive)
```

### Limitation 2: Some Premium Filters

**Issue:** Advanced filters require premium subscription

**Affected (rarely needed for F4):**
- Neural filters (AI-based)
- Some 3D features
- Advanced perspective tools

**Workaround:**
- Use free alternatives (GIMP, GFXMENU online tools)
- Most F4 texture work doesn't need these

### Limitation 3: Browser Limitations

**Issue:** Very large files (8K+) may lag

**Workarounds:**
```
1. Work in smaller chunks
2. Reduce undo history (Edit → Preferences → History: 20)
3. Use Chrome/Edge (better WebGL performance)
4. Close other browser tabs
5. Use desktop apps (GIMP/Photoshop) for 8K+
```

### Limitation 4: No Plugins/Extensions

**Issue:** Can't install third-party plugins like Photoshop

**Workarounds:**
- Use built-in filters (cover 95% of needs)
- Export to GIMP for specific plugin needs
- Photopea's built-ins are quite comprehensive

### Limitation 5: Cloud Save Requires Account

**Issue:** No auto-save to cloud without account

**Workarounds:**
```
1. Save locally: File → Export As → PSD
2. Use browser auto-recovery (Photopea saves to cache)
3. Create free Photopea account for cloud storage
4. Use Google Drive/OneDrive integration
```

---

## Keyboard Shortcuts (Photoshop-Compatible)

### Essential Tools

| Tool | Shortcut | Use Case |
|------|----------|----------|
| **Move Tool** | V | Reposition layers |
| **Brush** | B | Paint textures |
| **Eraser** | E | Remove areas |
| **Gradient** | G | Smooth transitions |
| **Bucket Fill** | G (hold) | Fill areas |
| **Eyedropper** | I (or hold Alt) | Sample colors |
| **Clone Stamp** | S | Fix seams, clone details |
| **Healing Brush** | J | Blend/repair |
| **Dodge/Burn** | O | Lighten/darken |
| **Pen Tool** | P | Precise selections |
| **Text** | T | Add text |
| **Hand** | H (or hold Space) | Pan canvas |
| **Zoom** | Z | Zoom in/out |

### Selection Tools

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **Rectangular Selection** | M | Select areas |
| **Lasso** | L | Freehand select |
| **Magic Wand** | W | Select by color |
| **Quick Selection** | W | Smart select |
| **Select All** | Ctrl+A | Full canvas |
| **Deselect** | Ctrl+D | Clear selection |
| **Invert Selection** | Ctrl+Shift+I | Flip selection |
| **Feather Selection** | Shift+F6 | Soft edges |

### Layer Operations

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **New Layer** | Ctrl+Shift+N | Add layer |
| **Duplicate Layer** | Ctrl+J | Copy layer |
| **Merge Down** | Ctrl+E | Flatten |
| **Merge Visible** | Ctrl+Shift+E | Flatten all visible |
| **Delete Layer** | Delete | Remove layer |
| **Layer Opacity** | 1-9 keys | Quick opacity (10%-90%) |
| **Toggle Layer Visibility** | Click eye icon | Show/hide |

### Adjustments

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **Levels** | Ctrl+L | Brightness |
| **Curves** | Ctrl+M | Advanced brightness |
| **Hue/Saturation** | Ctrl+U | Color adjust |
| **Desaturate** | Ctrl+Shift+U | Grayscale |
| **Invert** | Ctrl+I | Invert colors |
| **Auto Tone** | Ctrl+Shift+L | Auto adjust |

### File Operations

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **New** | Ctrl+N | New document |
| **Open** | Ctrl+O | Open file |
| **Save** | Ctrl+S | Save PSD |
| **Export As** | Ctrl+Shift+E | Export DDS/PNG |
| **Close** | Ctrl+W | Close document |
| **Undo** | Ctrl+Z | Undo last |
| **Redo** | Ctrl+Shift+Z | Redo |

### View

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **Fit to Screen** | Ctrl+0 | Fit canvas |
| **100% Zoom** | Ctrl+1 | Actual size |
| **Zoom In** | Ctrl++ | Zoom closer |
| **Zoom Out** | Ctrl+- | Zoom out |
| **Full Screen** | F | Toggle full screen |
| **Show/Hide Panels** | Tab | Clean workspace |

---

## Integration with Fallout 4 Workflow

### Photopea → Creation Kit Pipeline

**Step 1: Create Textures in Photopea**
```
1. www.photopea.com
2. Create/edit diffuse, normal, specular, glow
3. Export each as DDS with proper compression
4. Save PSD backup: File → Save As PSD (for future edits)
```

**Step 2: Organize Texture Files**
```
Project structure:
Data/
  Textures/
    Weapons/
      MyMod/
        MyWeapon_d.dds (BC1)
        MyWeapon_n.dds (BC5)
        MyWeapon_s.dds (BC3)
        MyWeapon_g.dds (BC3)
```

**Step 3: Create Material in Creation Kit**
```
1. Open Creation Kit
2. File → New Material
3. Material Editor:
   - Diffuse: Textures/Weapons/MyMod/MyWeapon_d.dds
   - Normal: Textures/Weapons/MyMod/MyWeapon_n.dds
   - Specular: Textures/Weapons/MyMod/MyWeapon_s.dds
   - Glow: Textures/Weapons/MyMod/MyWeapon_g.dds
4. Save as: MyWeapon.bgsm
```

**Step 4: Apply to Mesh (NifSkope)**
```
1. Open weapon mesh in NifSkope
2. Right-click BSTriShape → Shader → Properties
3. Link to MyWeapon.bgsm
4. Save NIF
5. Test in-game
```

### Photopea → Blender Pipeline

**For Custom Mesh + Texture Workflow:**

```
1. Photopea: Create textures, export PNG/TGA (working files)
2. Save DDS versions for final game use
3. Blender: Import textures in Shader Editor
   - Image Texture nodes → Principled BSDF
4. Blender: Export FBX/OBJ with materials
5. Import to F4 using NifSkope or FO4Edit
6. Replace textures with DDS versions
```

### Round-Trip Editing

**Edit Textures After In-Game Testing:**

```
1. Test in Fallout 4 → notice issue (too dark, seam visible, etc.)
2. www.photopea.com → File → Open → Load original PSD
3. Make adjustments (saved as smart objects = non-destructive)
4. File → Export As → DDS (overwrites old texture)
5. Test in-game again (Creation Kit auto-reloads textures)
6. Repeat until perfect
```

**Pro Tip:** Keep PSD source files organized:
```
MyMod_Source/
  Textures/
    PSD/
      MyWeapon_d.psd (master diffuse)
      MyWeapon_heightmap.psd (for normal generation)
      MyWeapon_specular_channels.psd (R/G/B/A separated)
```

---

## Quick Reference: DDS Export Settings

### In Photopea: File → Export As → DDS

**Diffuse (_d.dds):**
```
Format: BC1 (DXT1) - opaque textures
       BC3 (DXT5) - with alpha transparency
Mipmaps: Generate
Quality: High
```

**Normal Map (_n.dds):**
```
Format: BC5 (3Dc/ATI2) ⚠️ CRITICAL - Must be BC5
Mipmaps: Generate
Quality: Highest
```

**Specular (_s.dds):**
```
Format: BC3 (DXT5) - includes alpha for metal mask
Mipmaps: Generate
Quality: High
```

**Glow (_g.dds):**
```
Format: BC3 (DXT5) - alpha controls intensity
Mipmaps: Generate
Quality: High
```

**Parallax (_p.dds):**
```
Format: BC4 - single channel grayscale
Mipmaps: Generate
Quality: High
```

---

## Example Workflow: Complete Weapon Texture Set

### Project: Rusty Combat Rifle Skin

**Step 1: Open Photopea**
```
1. www.photopea.com
2. File → New → 2048×2048 RGBA
3. Name: CombatRifle_Rusty_d
```

**Step 2: Create Diffuse Base**
```
1. Fill background with dark gray (#5A5A5A)
2. Layer → New Layer → "Rust"
3. Fill with orange-brown (#B86A3E)
4. Filter → Render → Clouds
5. Set blend mode: Multiply, Opacity: 60%
6. Layer → New Layer → "Scratches"
7. Use Pencil (1px) to draw random lines
8. Filter → Blur → Motion Blur (3px, varying angles)
9. Set blend mode: Overlay, Opacity: 30%
10. Layer → New Layer → "Dirt"
11. Use soft brush with dark brown
12. Paint dirt in crevices and corners
13. Set blend mode: Multiply, Opacity: 40%
```

**Step 3: Export Diffuse**
```
File → Export As → DDS
- Format: BC1
- Mipmaps: Yes
- Save: CombatRifle_Rusty_d.dds
```

**Step 4: Create Normal Map**
```
1. File → Save As PSD (backup)
2. Image → Adjustments → Desaturate
3. Image → Adjustments → Curves (increase contrast)
4. Filter → 3D → Normal Map
   - Strength: 5.0
   - Level: 7
5. File → Export As → DDS
   - Format: BC5 ⚠️
   - Mipmaps: Yes
   - Save: CombatRifle_Rusty_n.dds
```

**Step 5: Create Specular**
```
1. File → Open → CombatRifle_Rusty_d.dds
2. Image → Adjustments → Desaturate
3. Window → Channels
4. Red Channel: Paint white on metal (80%), gray on rust (20%)
5. Green Channel: Copy red, reduce brightness by 30% (rust is less glossy)
6. Blue Channel: Fill black
7. Alpha Channel: Paint white on metal areas, black on rust/paint
8. File → Export As → DDS
   - Format: BC3 (includes alpha)
   - Mipmaps: Yes
   - Save: CombatRifle_Rusty_s.dds
```

**Step 6: Test In-Game**
```
1. Place textures in Data/Textures/Weapons/CombatRifle/
2. Create material in Creation Kit
3. Apply to combat rifle mesh
4. Load in-game, inspect
5. If adjustments needed, open PSD in Photopea, tweak, re-export
```

**Total Time:** 30-45 minutes for complete texture set!

---

## Troubleshooting Common Issues

### Issue: Photopea won't load

**Solution:**
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Disable browser extensions (might block)
3. Try different browser (Chrome recommended)
4. Check internet connection (first load only)
```

### Issue: DDS export option missing

**Solution:**
```
- Photopea has built-in DDS support
- File → Export As → Select "DDS" from dropdown
- If missing, try: File → Export to... → DDS
- Update browser (old browsers might not support)
```

### Issue: Colors look different in-game

**Solution:**
```
1. Image → Mode → Convert to Profile → sRGB
2. Ensure working in RGB mode (not CMYK)
3. Avoid extreme saturation
4. Test with ENB disabled (if using)
```

### Issue: Normal map looks inverted

**Solution:**
```
- Don't invert Y channel for Fallout 4
- If filter has "Invert Y" option, leave unchecked
- Regenerate normal map with correct settings
```

### Issue: Textures too large/slow browser

**Solution:**
```
1. Work at 2K max in browser
2. For 4K: Create at 2K, upscale with Image → Image Size
3. Use Desktop/GPU acceleration (Chrome: chrome://flags/ → Enable "GPU rasterization")
4. Close other tabs
```

### Issue: Can't save work

**Solution:**
```
- Browser cache: Work auto-saves to cache
- Local save: File → Export As → PSD (download)
- Cloud save: Create free account, link Google Drive
- Emergency: Take screenshot of layers panel + export WIP
```

---

## Tips for Efficient Workflow

### 1. Use Templates
```
Create master PSD with organized layers:
- Diffuse group (base, details, weathering)
- Normal group (height map)
- Specular group (R, G, B, A channels separated)

Save as "F4_Texture_Template.psd"
File → Open → Template for each new texture
```

### 2. Keyboard Shortcuts Are Essential
```
Learn these first:
- Ctrl+J: Duplicate layer (fastest way to experiment)
- Ctrl+Z/Ctrl+Shift+Z: Undo/redo
- Ctrl+E: Merge down
- [ and ]: Change brush size
- Alt+Click: Eyedropper (sample color)
```

### 3. Non-Destructive Editing
```
Always use:
- Smart Objects (filter effects remain editable)
- Adjustment Layers (color changes without destroying pixels)
- Layer Masks (hide instead of delete)
```

### 4. Test Early, Test Often
```
1. Export DDS after initial base color
2. Test in-game immediately (verify it works)
3. Add details incrementally
4. Re-export and test after each major change
5. Avoid "finishing" entire texture before first test
```

### 5. Reference Vanilla Textures
```
1. Use BAE to extract vanilla F4 textures
2. File → Open in Photopea
3. Study layer structure, colors, roughness values
4. Match style for consistency
```

---

## Resources and Learning

### Official Resources
- **Photopea Website:** https://www.photopea.com/
- **Photopea Tutorials:** https://www.photopea.com/learn/
- **YouTube Channel:** Photopea Official (tutorials)

### Fallout 4 Specific
- **Nexus Mods:** Search "texture tutorial" for F4-specific guides
- **Creation Kit Wiki:** Texture and material documentation
- **Reddit:** r/FalloutMods - Texture creation discussions

### Community
- **Photopea Reddit:** r/photopea - General help
- **Discord:** Fallout 4 Modding Discord servers
- **Forums:** Nexus Mods forums - Texture creation category

### Complementary Tools
- **Intel Texture Works Plugin:** Alternative DDS tool (desktop)
- **NifSkope:** View textures on 3D meshes
- **BAE (Bethesda Archive Extractor):** Extract vanilla textures
- **xNormal:** High-poly to low-poly normal map baking

---

## Summary: Photopea for Fallout 4

### ✅ Advantages Over Other Tools:
- **Zero setup** - Start creating in 30 seconds
- **Cross-platform** - Works on any device
- **Photoshop-compatible** - Familiar interface, opens PSD files
- **Free** - No cost, no subscription
- **DDS built-in** - Proper compression for all F4 texture types
- **Smart Objects** - Non-destructive editing (better than GIMP)
- **Always updated** - Web app auto-updates with new features

### ⚠️ Considerations:
- Requires internet for first load (then works offline)
- Ads in free version (blockable or pay $5/mo)
- Best for 2K textures (4K+ can be slower)
- No third-party plugins (built-ins cover most needs)

### 🎯 Perfect For:
- Beginners (easy to start, no installation)
- Quick texture edits and iterations
- Working on multiple computers
- School/work PCs (no admin rights needed)
- Mobile/tablet texture work (works on iPad!)
- Chromebook users (only option besides cloud GIMP)

### 💡 Pro Tip:
**Hybrid Workflow for Best Results:**
```
1. Photopea: Quick edits, iterations, PSD compatibility
2. GIMP: Complex batch processing, Python scripting
3. Creation Kit: Testing textures in actual game environment

Use the right tool for each task!
```

### 🚀 Getting Started Checklist:
```
☐ Open www.photopea.com
☐ Bookmark for quick access
☐ Create desktop shortcut (Chrome/Edge)
☐ Set preferences (Edit → Preferences)
☐ Create F4 texture template PSD
☐ Test DDS export (verify BC5 works for normals)
☐ Export one texture and test in Creation Kit
☐ You're ready to create Fallout 4 textures!
```

---

*Last Updated: January 2026*  
*Photopea Version: Web App (always current)*  
*Fallout 4: All versions compatible*  
*DDS Support: Built-in (BC1/BC3/BC5/BC7)*
