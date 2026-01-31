# GIMP for Fallout 4 Texture Creation - Complete Guide

## What is GIMP?

**GIMP (GNU Image Manipulation Program)** is a free, open-source image editor that's a powerful alternative to Photoshop for creating and editing Fallout 4 textures.

**Why Use GIMP for Fallout 4 Modding:**
- ✅ **100% Free** - No subscription or purchase required
- ✅ **DDS Plugin Support** - Save directly to DDS format
- ✅ **Normal Map Generation** - Built-in normal map plugin
- ✅ **Layer Support** - Professional editing capabilities
- ✅ **Cross-Platform** - Windows, Mac, Linux
- ✅ **PBR Workflow** - Create metalness/roughness maps
- ✅ **Batch Processing** - Script-Fu for automation

---

## Installation and Setup

### Step 1: Install GIMP

**Download:**
- Official site: https://www.gimp.org/downloads/
- Recommended version: **GIMP 2.10.36+** (stable)
- Windows: Use the installer version (not portable)

**Installation:**
```
1. Download GIMP installer
2. Run installer (default settings are fine)
3. Launch GIMP
4. Go to Edit → Preferences to configure
```

### Step 2: Install DDS Plugin

**For Windows:**

1. **Download DDS Plugin:**
   - Plugin: `dds-gimp.exe` from GitHub (gimp-dds releases)
   - Or: Use GIMP Registry DDS plugin

2. **Install Plugin:**
   ```
   1. Close GIMP if running
   2. Run dds plugin installer
   3. Point to GIMP installation folder (usually C:\Program Files\GIMP 2)
   4. Restart GIMP
   ```

3. **Verify Installation:**
   ```
   1. Open GIMP
   2. File → Export As
   3. Type "test.dds" as filename
   4. If DDS options appear, plugin is installed ✓
   ```

**For Linux:**
```bash
# Ubuntu/Debian
sudo apt install gimp-dds

# Fedora
sudo dnf install gimp-dds-plugin
```

### Step 3: Install Normal Map Plugin

**Recommended: normalmap plugin**

1. **Download:**
   - Plugin: `normalmap.py` from GIMP Plugin Registry
   - Or: Use built-in Filters → Generic → Normal Map

2. **Install (if needed):**
   ```
   Windows: C:\Users\[YourName]\AppData\Roaming\GIMP\2.10\plug-ins\
   Linux: ~/.config/GIMP/2.10/plug-ins/
   ```

3. **Make executable (Linux):**
   ```bash
   chmod +x ~/.config/GIMP/2.10/plug-ins/normalmap.py
   ```

### Step 4: Configure GIMP for Modding

**Recommended Settings:**

1. **Image Quality:**
   ```
   Edit → Preferences → Image Windows → Zoom Quality: Best
   Edit → Preferences → Display → Monitor Resolution: 96 pixels/inch
   ```

2. **Performance:**
   ```
   Edit → Preferences → System Resources
   - Tile cache size: 2048 MB (adjust based on RAM)
   - Maximum undo levels: 50-100
   ```

3. **Interface:**
   ```
   Windows → Single-Window Mode (easier workflow)
   View → Show Grid (for alignment)
   ```

---

## Fallout 4 Texture Types and Creation

### 1. Diffuse Texture (_d.dds)

**What it is:** Base color/albedo map

**Creation Steps:**

1. **Create New Image:**
   ```
   File → New
   Width: 2048 (or 1024/4096)
   Height: 2048
   Fill with: Transparency
   Advanced Options: RGB color, 8-bit precision
   ```

2. **Paint/Import Base Texture:**
   ```
   - Use brushes, gradients, patterns
   - Or: File → Open as Layers (import photo reference)
   - Keep colors realistic (no pure white/black)
   ```

3. **Add Details:**
   ```
   - Layer → New Layer for each detail pass
   - Use soft light/overlay blend modes
   - Add dirt, scratches, weathering
   ```

4. **Flatten and Export:**
   ```
   Image → Flatten Image
   File → Export As → myTexture_d.dds
   ```

**DDS Export Settings for Diffuse:**
- **Compression:** BC1 (DXT1) for opaque, BC3 (DXT5) if alpha needed
- **Mipmaps:** Generate mipmaps (checked)
- **Format:** RGB8 or RGBA8
- **Quality:** High

**Recommended Resolutions:**
- Weapons: 2048×2048 or 2048×1024
- Armor: 2048×2048
- Clutter/Small Objects: 512×512 or 1024×1024
- Large Props: 4096×4096

### 2. Normal Map (_n.dds)

**What it is:** Surface detail/bump information

**Method 1: From Height Map (Best)**

1. **Create Height Map:**
   ```
   Create grayscale image where:
   - White = High (raised areas)
   - Black = Low (recessed areas)
   - Gray = Mid-level
   ```

2. **Generate Normal Map:**
   ```
   Filters → Generic → Normal Map
   
   Settings:
   - 3D Preview: Enable (to see result)
   - Scale: 3.0-8.0 (higher = more pronounced)
   - Conversion: Heightmap to normalmap
   - Invert X/Y: Unchecked (for Fallout 4)
   - Wrap: Disabled
   ```

3. **Export:**
   ```
   File → Export As → myTexture_n.dds
   ```

**Method 2: From Diffuse Texture**

1. **Desaturate Diffuse:**
   ```
   Colors → Desaturate → Desaturate (Lightness mode)
   Adjust Curves to increase contrast
   ```

2. **Generate Normal Map:**
   ```
   Filters → Generic → Normal Map
   Scale: 2.0-5.0 (lower than height map method)
   ```

**DDS Export Settings for Normal Map:**
- **Compression:** BC5 (3Dc/ATI2) - CRITICAL for Fallout 4
- **Mipmaps:** Generate mipmaps (checked)
- **Format:** Normalmap
- **Quality:** Highest

**Common Mistakes:**
- ❌ Using BC3 (DXT5) instead of BC5 → Worse quality
- ❌ Inverting Y channel → Inverted lighting
- ❌ Too much scale → Unrealistic bumps

### 3. Specular Map (_s.dds)

**What it is:** Shininess/roughness information

**For PBR Workflow (Fallout 4):**

**Red Channel:** Specular intensity (how shiny)
- White = Very shiny (metal, glass)
- Gray = Medium shine (plastic, paint)
- Black = Matte (cloth, rubber)

**Green Channel:** Glossiness (smoothness)
- White = Mirror-smooth
- Gray = Semi-smooth
- Black = Rough

**Blue Channel:** Usually unused (set to black)

**Alpha Channel:** Material type
- White = Metal
- Black = Non-metal (dielectric)

**Creation Steps:**

1. **Create Base Image (2048×2048):**
   ```
   File → New → RGB color
   ```

2. **Decompose to Channels:**
   ```
   Colors → Components → Decompose
   Model: RGB
   This creates separate red, green, blue layers
   ```

3. **Edit Each Channel:**
   ```
   Red (Specular):
   - Paint white on shiny areas
   - Paint gray on semi-shiny
   - Paint black on matte
   
   Green (Glossiness):
   - Paint based on smoothness
   - Use gradients for variation
   
   Blue:
   - Fill with black (or leave at 50% gray)
   ```

4. **Compose Back:**
   ```
   Colors → Components → Compose
   Compose Channels: RGB
   Select your edited channel layers
   ```

5. **Add Alpha Channel (for PBR):**
   ```
   Layer → Transparency → Add Alpha Channel
   Select → All
   Edit → Copy (from your metal mask)
   Select → By Color → Select Black areas
   Edit → Fill with FG Color (white for metal)
   ```

**DDS Export Settings for Specular:**
- **Compression:** BC3 (DXT5) - Includes alpha channel
- **Mipmaps:** Generate mipmaps (checked)
- **Format:** RGBA8
- **Quality:** High

### 4. Glow/Emissive Map (_g.dds)

**What it is:** Self-illuminated areas (LEDs, screens, energy effects)

**Creation Steps:**

1. **Start with Diffuse Texture:**
   ```
   Open your _d.dds
   Save As → myTexture_g.dds (to preserve)
   ```

2. **Isolate Glowing Areas:**
   ```
   Select → By Color → Click areas that should glow
   Select → Grow → 2 pixels (to include edges)
   Select → Invert
   Edit → Clear (delete non-glowing areas)
   ```

3. **Enhance Glow:**
   ```
   Colors → Brightness-Contrast → Increase both
   Colors → Color Temperature → Shift to blue/green/red (glow color)
   Filters → Light and Shadow → Lens Flare (for bright spots)
   ```

4. **Add Glow Intensity:**
   ```
   Use alpha channel to control glow strength:
   - White alpha = Full glow
   - Gray alpha = Partial glow
   - Black alpha = No glow
   ```

**DDS Export Settings for Glow:**
- **Compression:** BC3 (DXT5) - Needs alpha
- **Mipmaps:** Generate mipmaps (checked)
- **Format:** RGBA8
- **Quality:** High

**Common Glow Colors:**
- Red: 255, 0, 0 (laser sights, danger lights)
- Green: 0, 255, 100 (terminal screens, fusion cores)
- Blue: 0, 150, 255 (energy weapons, plasma)
- Orange: 255, 150, 0 (warning lights)
- White: 255, 255, 255 (bright LEDs)

### 5. Parallax/Height Map (_p.dds)

**What it is:** Depth information for parallax occlusion mapping

**Creation Steps:**

1. **Create Height Map:**
   ```
   Same as normal map height map step
   But: Export directly as _p.dds (don't convert to normal)
   ```

2. **Grayscale Rules:**
   ```
   - Pure white = Maximum height
   - Pure black = Maximum depth
   - Mid-gray = Surface level
   ```

3. **Refine with Levels:**
   ```
   Colors → Levels
   - Adjust output levels: 10 (min) to 245 (max)
   - Avoid pure black/white (causes artifacts)
   ```

**DDS Export Settings for Parallax:**
- **Compression:** BC4 (single channel)
- **Mipmaps:** Generate mipmaps (checked)
- **Format:** Grayscale
- **Quality:** High

**Note:** Parallax mapping is expensive and not widely used in Fallout 4 base game.

### 6. Subsurface Tint (_sk.dds)

**What it is:** Skin/organic material color tinting

**Used for:** Character skin, creature textures

**Creation Steps:**

1. **Create Tint Map:**
   ```
   Red Channel: Blood/redness under skin
   Green Channel: Skin mid-tones
   Blue Channel: Veins/subsurface structures
   ```

2. **Paint Tint Areas:**
   ```
   - Use soft brushes (low hardness)
   - Subtle colors (avoid saturation)
   - Reference real skin photos
   ```

**DDS Export Settings:**
- **Compression:** BC3 (DXT5)
- **Mipmaps:** Generate mipmaps
- **Format:** RGB8

---

## Advanced GIMP Techniques for Fallout 4

### Batch Processing with Script-Fu

**Convert Multiple Textures to DDS:**

```scheme
; Save as batch-convert-dds.scm in scripts folder

(define (batch-convert-dds pattern)
  (let* ((filelist (cadr (file-glob pattern 1))))
    (while (not (null? filelist))
      (let* ((filename (car filelist))
             (image (car (gimp-file-load RUN-NONINTERACTIVE filename filename)))
             (drawable (car (gimp-image-get-active-layer image)))
             (newname (string-append (substring filename 0 (- (string-length filename) 4)) ".dds")))
        (file-dds-save RUN-NONINTERACTIVE image drawable newname newname 1 0 0 0 0 0 0)
        (gimp-image-delete image))
      (set! filelist (cdr filelist)))))
```

**Run in GIMP Console:**
```
Filters → Script-Fu → Console
(batch-convert-dds "C:/Textures/*.png")
```

### Creating Tileable Textures

**Method: Offset and Blend**

1. **Create Base Texture:**
   ```
   Paint or import texture
   ```

2. **Offset by Half:**
   ```
   Filters → Distorts → Tile Seamless
   Or manually:
   Layer → Transform → Offset
   Offset X: Width/2
   Offset Y: Height/2
   Wrap around: Checked
   ```

3. **Blend Seams:**
   ```
   Use Clone tool (C) with soft brush
   Clone from nearby areas to hide seams
   Use Healing tool (H) for organic textures
   ```

4. **Test Tiling:**
   ```
   Filters → Render → Tile
   Set rows/columns to 3×3
   Check for visible seams
   ```

### PBR Material Creation Workflow

**Creating Full PBR Set from Photo:**

1. **Diffuse (Albedo):**
   ```
   Open photo
   Colors → Auto → White Balance
   Filters → Enhance → Despeckle (remove noise)
   Colors → Curves → Reduce contrast slightly
   Colors → Desaturate → Re-saturate to 80% (for realism)
   Export: myMaterial_d.dds (BC1)
   ```

2. **Roughness Map (for Specular Green Channel):**
   ```
   Duplicate diffuse
   Colors → Desaturate → Luminosity
   Colors → Invert (if needed)
   Use Levels to adjust contrast
   Save as working file
   ```

3. **Metalness Map (for Specular Alpha Channel):**
   ```
   Duplicate diffuse
   Select metal areas only
   Fill with white
   Select → Invert
   Fill with black
   Save as working file
   ```

4. **Combine Specular Channels:**
   ```
   Create new RGBA image
   Paste roughness into Red channel
   Paste roughness into Green channel (or adjust separately)
   Fill Blue with black
   Paste metalness into Alpha channel
   Export: myMaterial_s.dds (BC3)
   ```

5. **Normal Map:**
   ```
   From diffuse: Colors → Desaturate
   Adjust contrast with Curves
   Filters → Generic → Normal Map (scale: 4.0)
   Export: myMaterial_n.dds (BC5)
   ```

### Weathering and Dirt Layers

**Add Realism with Weathering:**

1. **Dirt Layer:**
   ```
   Layer → New Layer → "Dirt"
   Fill with brown/gray (50% gray)
   Filters → Render → Clouds → Difference Clouds
   Set blend mode: Multiply or Overlay
   Opacity: 20-40%
   Use layer mask to control where dirt appears
   ```

2. **Scratches:**
   ```
   Layer → New Layer → "Scratches"
   Use Pencil tool (1px) with pressure sensitivity
   Draw random scratches
   Filters → Blur → Motion Blur (slight)
   Set blend mode: Overlay
   Opacity: 30-50%
   ```

3. **Rust/Corrosion:**
   ```
   Layer → New Layer → "Rust"
   Fill with orange-brown
   Filters → Render → Clouds → Solid Noise
   Colors → Threshold → Create rust pattern
   Set blend mode: Multiply
   Add layer mask with gradient for variation
   ```

4. **Edge Wear:**
   ```
   Select → By Color → Select edges on normal map
   Select → Grow → 2 pixels
   On diffuse: Colors → Brightness-Contrast → Increase brightness
   Adds worn/shiny edges
   ```

---

## GIMP vs Photoshop for Fallout 4

| Feature | GIMP | Photoshop |
|---------|------|-----------|
| **Cost** | Free | $20-60/month |
| **DDS Export** | Plugin (free) | Plugin (paid) |
| **Normal Maps** | Built-in plugin | Better plugins available |
| **Layer Support** | Full support | Full support (more advanced) |
| **Adjustment Layers** | Limited | Full support |
| **Smart Objects** | ❌ No | ✅ Yes |
| **Batch Processing** | Script-Fu (complex) | Actions (easier) |
| **Performance** | Good for 2K, slower for 4K | Better for 4K+ |
| **Learning Curve** | Moderate | Moderate |
| **Plugins/Scripts** | Smaller ecosystem | Huge ecosystem |

**When to Use GIMP:**
- ✅ Budget constraints (it's free!)
- ✅ Basic to intermediate texture work
- ✅ 2K textures and below
- ✅ Simple edits and touch-ups
- ✅ Open-source preference

**When to Use Photoshop:**
- Advanced PBR workflows
- High-end 4K+ textures
- Complex layer effects
- Professional pipeline integration

**Verdict for Fallout 4 Modding:** GIMP is 100% capable for all Fallout 4 texture needs.

---

## Common GIMP Issues and Solutions

### Issue 1: DDS Plugin Not Appearing

**Solution:**
```
1. Check plugin installation path
2. Ensure plugin is in: C:\Users\[Name]\AppData\Roaming\GIMP\2.10\plug-ins\
3. Make plugin executable (right-click → Properties → Unblock)
4. Restart GIMP
5. Try different DDS plugin (gimp-dds vs dds-gimp)
```

### Issue 2: Normal Maps Look Wrong In-Game

**Solution:**
```
- Ensure BC5 compression (not BC3)
- Check "Generate mipmaps" is enabled
- Verify Y-axis is NOT inverted
- Scale might be too high (reduce to 3.0-5.0)
```

### Issue 3: Textures Look Blurry

**Solution:**
```
- Export at higher resolution
- Use "Generate mipmaps" with quality = High
- Check compression format:
  - Use BC7 instead of BC1 for better quality (larger file)
  - Or use uncompressed DDS (huge files, but crisp)
```

### Issue 4: GIMP Crashes with Large Textures

**Solution:**
```
Edit → Preferences → System Resources
- Increase tile cache size to 4096+ MB
- Enable "Number of processors to use" → All
- Reduce undo levels to 20-30
- Work in 8-bit mode (not 16-bit) unless needed
```

### Issue 5: Colors Look Different In-Game

**Solution:**
```
- Check color profile:
  Edit → Preferences → Color Management
  - Mode of operation: Color managed display
  - RGB profile: sRGB
- Convert image to sRGB before export:
  Image → Mode → Convert to Color Profile → sRGB
```

---

## GIMP Hotkeys for Faster Workflow

### Essential Shortcuts

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **Pencil Tool** | N | Drawing, details |
| **Paintbrush** | P | Painting textures |
| **Eraser** | Shift+E | Removing areas |
| **Clone Tool** | C | Fixing seams |
| **Healing Tool** | H | Blending |
| **Bucket Fill** | Shift+B | Fill areas |
| **Gradient** | G | Smooth transitions |
| **Color Picker** | O | Sample colors |
| **Zoom In/Out** | + / - | Navigation |
| **Fit in Window** | Shift+Ctrl+J | Reset zoom |
| **Undo** | Ctrl+Z | Fix mistakes |
| **Redo** | Ctrl+Y | Redo changes |
| **Duplicate Layer** | Shift+Ctrl+D | Layer management |
| **Merge Down** | Ctrl+M | Flatten layers |
| **Select All** | Ctrl+A | Full selection |
| **Deselect** | Shift+Ctrl+A | Clear selection |
| **Invert Selection** | Ctrl+I | Invert selection |

### Advanced Shortcuts

| Action | Shortcut | Use Case |
|--------|----------|----------|
| **Layer Dialog** | Ctrl+L | Manage layers |
| **Channels Dialog** | Ctrl+Shift+L | Edit channels |
| **Toggle Quick Mask** | Shift+Q | Selection refinement |
| **Color Balance** | Ctrl+B | Adjust colors |
| **Hue-Saturation** | Ctrl+U | Change colors |
| **Levels** | Ctrl+L | Adjust brightness |
| **Curves** | Ctrl+M | Advanced brightness |
| **Desaturate** | Shift+Ctrl+U | Grayscale |
| **Scale Image** | Ctrl+Alt+I | Resize |
| **Canvas Size** | Ctrl+Shift+R | Expand canvas |

---

## Recommended GIMP Plugins for Fallout 4

### Essential Plugins

1. **DDS Plugin** (Critical)
   - Download: GitHub gimp-dds
   - Purpose: Save/load DDS files
   - Status: **REQUIRED**

2. **Normal Map Plugin**
   - Download: GIMP Registry or built-in
   - Purpose: Generate normal maps from height
   - Status: **REQUIRED**

3. **G'MIC (Graphics Magic)**
   - Download: https://gmic.eu/
   - Purpose: Advanced filters and effects
   - Features: Texture synthesis, repair tools
   - Status: Highly recommended

4. **Resynthesizer**
   - Download: GIMP Plugin Registry
   - Purpose: Content-aware fill (like Photoshop)
   - Features: Remove objects, heal areas
   - Status: Recommended

5. **BIMP (Batch Image Manipulation)**
   - Download: GIMP Plugin Registry
   - Purpose: Batch process multiple images
   - Features: Resize, convert, watermark
   - Status: Recommended for large projects

### Optional Plugins

6. **Liquid Rescale**
   - Purpose: Content-aware scaling
   - Use: Resize textures intelligently

7. **Wavelet Decompose**
   - Purpose: Separate detail from color
   - Use: Advanced texture editing

8. **FX Foundry**
   - Purpose: Collection of effects
   - Use: Special effects and filters

---

## Integration with Fallout 4 Workflow

### Texture Creation Pipeline

```
1. GIMP: Create/edit textures (PNG, TGA, etc.)
   ↓
2. GIMP: Export to DDS with proper compression
   ↓
3. File Structure: Place in Data/Textures/[category]/
   ↓
4. Creation Kit: Reference textures in BGSM/BGEM materials
   ↓
5. NifSkope: Assign materials to mesh
   ↓
6. Test in-game
```

### GIMP to Creation Kit

**Material Setup:**

1. **Create Textures in GIMP:**
   ```
   myWeapon_d.dds (Diffuse)
   myWeapon_n.dds (Normal)
   myWeapon_s.dds (Specular)
   ```

2. **Create Material File (.BGSM):**
   ```
   Open Creation Kit Material Editor
   File → New Material
   Set texture paths:
   - Diffuse: Textures/Weapons/MyMod/myWeapon_d.dds
   - Normal: Textures/Weapons/MyMod/myWeapon_n.dds
   - Specular: Textures/Weapons/MyMod/myWeapon_s.dds
   Save as: myWeapon.bgsm
   ```

3. **Apply to Mesh:**
   ```
   Open mesh in NifSkope
   Right-click BSTriShape → Shader → Add/Edit
   Link to myWeapon.bgsm
   Save NIF
   ```

### GIMP to Blender

**For creating custom meshes with GIMP textures:**

1. **Export from GIMP:**
   ```
   Save as PNG/TGA (preserve layers if needed)
   Also export DDS versions for in-game use
   ```

2. **Import to Blender:**
   ```
   Blender Shader Editor:
   - Add → Texture → Image Texture
   - Open your PNG from GIMP
   - Connect to Principled BSDF
   ```

3. **UV Mapping:**
   ```
   Use GIMP texture as reference for UV layout
   Export final texture from GIMP as DDS
   ```

---

## Quick Reference: GIMP DDS Export Settings

### Diffuse (_d.dds)
```
Compression: BC1 (no alpha) or BC3 (with alpha)
Format: RGB8 or RGBA8
Mipmaps: Yes (generate)
Quality: High
```

### Normal Map (_n.dds)
```
Compression: BC5 (3Dc/ATI2) ⚠️ CRITICAL
Format: Normalmap
Mipmaps: Yes (generate)
Quality: Highest
```

### Specular (_s.dds)
```
Compression: BC3 (DXT5)
Format: RGBA8
Mipmaps: Yes (generate)
Quality: High
Alpha: Material ID (metalness)
```

### Glow (_g.dds)
```
Compression: BC3 (DXT5)
Format: RGBA8
Mipmaps: Yes (generate)
Quality: High
Alpha: Glow intensity
```

### Parallax (_p.dds)
```
Compression: BC4 (single channel)
Format: Grayscale
Mipmaps: Yes (generate)
Quality: High
```

---

## Example Workflow: Creating a Weapon Texture in GIMP

### Step-by-Step: Rusty Pipe Weapon

**1. Create Diffuse Texture:**
```
File → New → 2048×2048 RGB
Layer → New Layer → "Base Metal"
  Fill with gray (#7A7A7A)
Layer → New Layer → "Rust Patches"
  Filters → Render → Clouds → Solid Noise
  Colors → Colorize → Hue: 25, Saturation: 60
  Set blend mode: Multiply
  Opacity: 60%
Layer → New Layer → "Scratches"
  Use Pencil tool (1px) draw random lines
  Filters → Blur → Motion Blur (2px)
  Set blend mode: Overlay
  Opacity: 40%
Image → Flatten Image
File → Export As → RustyPipe_d.dds
  Settings: BC1, Mipmaps enabled
```

**2. Create Normal Map:**
```
From diffuse:
Colors → Desaturate → Lightness
Colors → Curves → S-curve for contrast
Filters → Generic → Normal Map
  Scale: 5.0
  3D Preview: Enabled
File → Export As → RustyPipe_n.dds
  Settings: BC5, Mipmaps enabled ⚠️ Must be BC5
```

**3. Create Specular Map:**
```
File → New → 2048×2048 RGBA
Fill Red channel:
  Paint white on metal areas (70% coverage)
  Paint gray on semi-rusty areas (30%)
Fill Green channel:
  Copy red channel
  Colors → Brightness → Reduce by 20% (less glossy rust)
Fill Blue channel:
  Fill with black
Fill Alpha channel:
  Paint white where metal appears
  Paint black where rust/paint appears
File → Export As → RustyPipe_s.dds
  Settings: BC3, Mipmaps enabled
```

**Result:** Realistic rusty pipe weapon texture ready for Fallout 4!

---

## Troubleshooting Guide

### Problem: Normal map has pink/purple artifacts

**Cause:** Wrong compression format  
**Solution:** Export as BC5, not BC3 or BC7

### Problem: Specular map not working in-game

**Cause:** Channels incorrect or alpha missing  
**Solution:** Verify red=specular, green=glossiness, alpha=metal

### Problem: Texture looks pixelated in-game

**Cause:** Resolution too low or mipmaps disabled  
**Solution:** Use 2048×2048 minimum, enable "generate mipmaps"

### Problem: GIMP crashes when exporting DDS

**Cause:** Image too large or corrupted layers  
**Solution:** Flatten image, reduce to 4K max, increase GIMP memory

### Problem: Texture has visible seams

**Cause:** Not properly tiled  
**Solution:** Use Filters → Distorts → Tile Seamless

### Problem: Colors too saturated in-game

**Cause:** Color profile mismatch  
**Solution:** Convert to sRGB before export

---

## Resources and Learning

**Official:**
- GIMP Documentation: https://docs.gimp.org/
- GIMP Tutorials: https://www.gimp.org/tutorials/

**Fallout 4 Specific:**
- Nexus Mods Tutorials: Search "texture creation"
- Creation Kit Wiki: Texture guidelines
- YouTube: "Fallout 4 texture tutorial GIMP"

**Community:**
- r/GIMP (Reddit) - General GIMP help
- r/FO4 (Reddit) - Fallout 4 modding
- Nexus Forums - Texture creation discussion

**Tools to Complement GIMP:**
- **xNormal** - High-poly to low-poly normal baking
- **CrazyBump** - Normal/specular generation (paid)
- **NifSkope** - View textures on meshes
- **BAE (Bethesda Archive Extractor)** - Extract vanilla textures for reference

---

## Summary: GIMP for Fallout 4 Modding

### ✅ What GIMP Does Well:
- Free and capable for all F4 texture needs
- DDS export with proper compression
- Normal map generation
- PBR material creation
- Layer-based editing
- Batch processing via scripts

### ⚠️ GIMP Limitations:
- Slower with 4K+ textures
- Less intuitive than Photoshop (learning curve)
- Fewer plugins/presets available
- No smart objects or adjustment layers

### 🎯 Best Practices:
1. Always export normal maps as BC5
2. Use 2048×2048 for most assets
3. Enable mipmaps for all textures
4. Work in sRGB color space
5. Save working files as XCF (GIMP native format)
6. Export DDS only when ready for in-game testing

### 💡 Pro Tip:
Keep a template XCF file with proper layer structure:
```
myTexture_Template.xcf
├── Diffuse Group
│   ├── Base Color
│   ├── Detail
│   └── Weathering
├── Normal Group
│   └── Height Map
├── Specular Group
│   ├── Specular (Red)
│   ├── Glossiness (Green)
│   └── Metal (Alpha)
└── Glow Group
    └── Emissive Areas
```

Save this as a starting point for new textures!

---

*Last Updated: January 2026*  
*GIMP Version: 2.10.36*  
*Fallout 4: All versions compatible*  
*DDS Plugin: gimp-dds v3.0+*
