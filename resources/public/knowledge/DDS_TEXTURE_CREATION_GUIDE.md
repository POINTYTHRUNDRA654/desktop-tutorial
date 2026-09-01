# DDS Texture Creation Guide for Fallout 4

Textures are among the most impactful visual mods you can make for Fallout 4. Understanding the DDS format, compression types, channel conventions, and the export pipeline from creation software to the game is essential for producing professional-quality results. This guide covers the complete DDS workflow with specific settings, values, and common mistakes for each step.

---

## Software Overview

### NVIDIA Texture Tools Exporter (Free — Recommended for NVIDIA Users)
- **Download**: https://developer.nvidia.com/gpu-accelerated-texture-compression
- **Format support**: BC1–BC7, DDS, KTX
- **Mip generation**: GPU-accelerated, high quality
- **Best for**: High-quality BC7 compression, batch export via command line (`nvtt_export`)
- **Platform**: Windows only (requires NVIDIA GPU for GPU-accelerated export; CPU fallback available)
- **Photoshop plugin**: Available; adds "Save as DDS" option

### Intel Texture Works (Free — Works on Any GPU)
- **Download**: https://www.intel.com/content/www/us/en/developer/articles/tool/intel-texture-works-plugin.html
- **Format support**: BC1–BC7, all standard DDS types
- **Mip generation**: CPU-based; good quality
- **Best for**: Any GPU brand, Photoshop users

### Paint.NET + DDS Plugin (Free)
- **Paint.NET**: https://www.getpaint.net/
- **DDS plugin**: `FileTypes Plus` or `DDS FileType Plus` (NuGet/GitHub)
- **Format support**: BC1, BC3, BC5, BC7 (with plugin)
- **Best for**: Simple, quick texture work; no Photoshop license needed

### GIMP (Free)
- **Download**: https://www.gimp.org/
- **DDS support**: Built-in since GIMP 2.10 (native DDS export)
- **Format support**: BC1, BC3, no BC5/BC7 without additional plugins
- **Best for**: Free, cross-platform texture creation (see `GIMP_FOR_FALLOUT4_TEXTURES.md`)
- **Limitation**: BC5 normal maps require exporting R and G channels separately

### Photopea (Free — Web-Based)
- **URL**: https://www.photopea.com/
- **Format support**: Basic DDS read/write; limited compression options
- **Best for**: Quick edits without installing software; not ideal for final export
- **Limitation**: No mip map generation; export through GIMP/NVTT for final file

### texconv.exe (Free — Microsoft, Best for Batch)
- **Download**: https://github.com/microsoft/DirectXTex (Releases page)
- **Format support**: All BC formats, all DDS variants
- **Best for**: Batch conversion from command line; scripting pipelines
- **Limitation**: Command-line only; no GUI

### Substance Painter / Substance Designer (Paid / Subscription)
- **Best for**: PBR texture authoring from scratch
- **Export**: Use the Fallout 4 export preset or manually map: BaseColor→`_d`, Normal→`_n`, SpecGlossAO→`_s`
- **DDS export**: Via Substance's built-in DDS exporter or post-process with texconv

---

## DDS Format Selection

DDS (DirectDraw Surface) files use block compression. Choosing the wrong compression type causes visual artifacts or wastes VRAM. Here is when to use each format:

### BC1 / DXT1 — Diffuse textures WITHOUT alpha

| Property | Value |
|---|---|
| Compression ratio | 8:1 (very efficient) |
| Alpha support | 1-bit (punch-through) only |
| Quality | Good for opaque surfaces |
| VRAM cost | Lowest |

**Use when**: Diffuse color maps (`_d.dds`) with no transparency. Terrain, walls, furniture diffuse.

```bash
# texconv command
texconv.exe input.png -f BC1_UNORM -m 0 -o output_folder\
```

> **⚠️ WARNING**: BC1 has visible color banding on gradients and smooth surfaces. Use BC7 for skin tones, smooth metal, or anything with subtle color variation.

### BC3 / DXT5 — Diffuse textures WITH alpha

| Property | Value |
|---|---|
| Compression ratio | 4:1 |
| Alpha support | Full 8-bit alpha channel |
| Quality | Good; better than BC1 for smooth alpha |
| VRAM cost | 2× BC1 |

**Use when**: Diffuse textures needing transparency or alpha: leaves/foliage (`_d.dds` with alpha mask for leaf shapes), decals, glass, hair cards.

```bash
texconv.exe input.png -f BC3_UNORM -m 0 -o output_folder\
```

**Alpha channel uses in Fallout 4 diffuse:**
- Transparency mask (foliage, chain link fences)
- Vertex alpha blending weight (terrain blends)

### BC4 — Single-channel grayscale

| Property | Value |
|---|---|
| Compression ratio | 8:1 |
| Channels | 1 (R only) |
| Quality | Excellent for single-channel data |

**Use when**: Single-channel height maps, roughness maps, or masks used in custom shaders. Rarely used in vanilla FO4 but useful for ENB-compatible parallax height maps.

```bash
texconv.exe input.png -f BC4_UNORM -m 0 -o output_folder\
```

### BC5 — Normal maps (RG two-channel)

| Property | Value |
|---|---|
| Compression ratio | 4:1 |
| Channels | 2 (R and G; B reconstructed in shader) |
| Quality | Best available for normal maps |
| VRAM cost | Same as BC3 |

**Use when**: ALL normal maps (`_n.dds`). BC5 stores R (X tangent) and G (Y tangent); the shader reconstructs Z (depth). Superior to DXT5-nm encoding used in older games.

```bash
texconv.exe input_normal.png -f BC5_UNORM -m 0 -o output_folder\
```

> **⚠️ WARNING**: Do NOT use BC1 or BC3 for normal maps. You will get blocky, incorrect-looking surface lighting. Always use BC5 for normals.

### BC7 — High-quality universal

| Property | Value |
|---|---|
| Compression ratio | 4:1 to 8:1 (adaptive) |
| Alpha support | Full 8-bit |
| Quality | Near-lossless; best available |
| VRAM cost | Same as BC3 |
| Compression speed | Slow (GPU-accelerated helps) |

**Use when**: High-quality diffuse textures on hero assets (player armor, weapons, prominent NPCs), complex alpha where BC3 shows artifacts, or any texture where quality is paramount.

```bash
# NVIDIA Texture Tools (GPU-accelerated, much faster)
nvtt_export input.png --format bc7 --output output.dds

# texconv (slower without GPU)
texconv.exe input.png -f BC7_UNORM -m 0 -o output_folder\
```

**Performance note**: BC7 has the same VRAM footprint as BC3 but takes longer to compress. The game reads them at the same speed — compression is a one-time authoring cost.

---

## Mip Map Generation

### Why Mip Maps Are Required

Mip maps are pre-computed, progressively smaller versions of a texture (half size at each level). Without them:
- Distant surfaces show aliasing shimmer (specular flickering)
- The GPU samples full-resolution textures at any distance → VRAM thrashing
- Performance degrades for distant objects

Every DDS texture shipped in a mod **must** have mip maps. No exceptions.

### How Many Mip Levels

For a `2048×2048` texture, the mip chain is:
```
Level 0: 2048×2048 (full)
Level 1: 1024×1024
Level 2: 512×512
Level 3: 256×256
Level 4: 128×128
Level 5: 64×64
Level 6: 32×32
Level 7: 16×16
Level 8: 8×8
Level 9: 4×4
Level 10: 2×2
Level 11: 1×1
```
That's 12 levels total. The DDS exporter generates these automatically when you specify `-m 0` (all levels) in texconv or check "Generate Mipmaps" in your DDS exporter GUI.

For cubemaps (environment maps): same rule, generate all levels.

For `_g.dds` (glow/emissive) and `_h.dds` (heightmap): still generate mip maps.

### Mip Map Filter Selection

The filter applied when downsampling each mip level affects quality:

| Filter | When to use |
|---|---|
| **Kaiser** | Default; best for most textures; preserves sharpness |
| **Box** | Fast; acceptable for textures without fine detail |
| **Lanczos** | Best for normal maps; preserves edge sharpness |
| **Point** | Nearest neighbor; use for pixel art or UI textures only |

In texconv: `-if KAISER` flag.
In NVTT: "Kaiser" is the default.

> **⚠️ WARNING**: For normal maps, use "Normalize" option during mip generation. This re-normalizes the XY vectors at each mip level, preventing soft lighting errors at distance.

```bash
texconv.exe input_n.png -f BC5_UNORM -m 0 -if KAISER -nmap l -o output_folder\
```
(`-nmap l` = treat as normal map, normalize each mip level)

---

## Fallout 4 Texture Naming Conventions

Fallout 4 uses suffixes to identify texture type. The BSLightingShaderProperty in NIF files references each map by path.

| Suffix | Type | Format | Description |
|---|---|---|---|
| `_d.dds` | Diffuse / Albedo | BC1 or BC3 or BC7 | Base color; RGB = color, A = alpha/transparency |
| `_n.dds` | Normal Map | BC5 | Surface detail normals; R=X, G=Y, B reconstructed |
| `_s.dds` | Specular / Gloss | BC3 or BC7 | Lighting data (see channel packing below) |
| `_g.dds` | Glow / Emissive | BC1 or BC3 | Self-illumination; multiplied by glow color in shader |
| `_h.dds` | Height (Parallax) | BC4 | Grayscale height for parallax occlusion mapping |
| `_r.dds` | Subsurface scattering | BC1 | Used for skin/flesh; rarely in FO4 vanilla |
| `_e.dds` | Environment map | BC1 (cube) | Cubemap for reflections on metal/glass |
| `_em.dds` | Environment mask | BC1 | Controls where env map is applied |

**File naming example for an armor piece:**
```
Data\Textures\actors\Character\BaseHumanMale\MaleBody_d.dds
Data\Textures\actors\Character\BaseHumanMale\MaleBody_n.dds
Data\Textures\actors\Character\BaseHumanMale\MaleBody_s.dds
```

---

## Channel Packing for Specular (`_s.dds`)

Fallout 4 uses a packed specular texture (`_s.dds`) that stores multiple PBR-relevant values in different channels:

| Channel | Contains | Range | Notes |
|---|---|---|---|
| **R** (Red) | Specular Intensity | 0–255 | 0 = no specular, 255 = maximum reflectivity |
| **G** (Green) | Gloss / Roughness | 0–255 | Higher = shinier (narrower highlight). Inverse of roughness. |
| **B** (Blue) | Ambient Occlusion | 0–255 | 0 = fully occluded, 255 = fully lit |
| **A** (Alpha) | Specular color tint | 0–255 | Rarely used; controls metallic tint color shift |

**Practical guidelines:**

| Material | R (Spec) | G (Gloss) | B (AO) |
|---|---|---|---|
| Rough concrete | 30 | 20 | Per-bake |
| Painted metal | 120 | 100 | Per-bake |
| Polished steel | 200 | 200 | Per-bake |
| Skin | 60 | 40 | Per-bake |
| Leather | 80 | 60 | Per-bake |
| Plastic | 100 | 80 | Per-bake |
| Glass | 220 | 220 | Per-bake |

**Creating the specular texture in GIMP:**
1. Open your source images (spec intensity, gloss map, AO bake).
2. Use "Decompose" to split into channels.
3. Combine: Image > Flatten, then set R, G, B channels individually via Script-Fu or Channels panel.
4. Export as `_s.dds` using BC3 (RGBA).

**Creating in Photoshop/NVIDIA Texture Tools:**
1. Create a new document matching your texture resolution.
2. Layer 1 (Multiply/Normal blend, Red channel only): Spec intensity.
3. Use Channel Mixer to pack R=spec, G=gloss, B=AO.
4. Export as BC3 DDS with mip maps.

> **⚠️ WARNING**: If you ship a texture without a `_s.dds`, the game uses a default flat specular (usually too shiny or too matte). Always provide the specular map.

---

## Normal Map DirectX vs OpenGL

Fallout 4 uses **DirectX normal maps** (Y-axis inverted compared to OpenGL).

| Coordinate System | Green Channel | Used by |
|---|---|---|
| DirectX | Y+ = Down (dark) | Fallout 4, Skyrim, most Bethesda games |
| OpenGL | Y+ = Up (light) | Blender, Unity, Substance Painter default |

**Visual test**: On a surface that should look like it protrudes outward (a rivet, a panel edge), if it looks like a dent instead, your green channel is inverted.

**Fixing in GIMP:**
1. Open the normal map.
2. Colors > Curves → Select Green channel → Invert (drag points: top-left to bottom-left, bottom-right to top-right).
3. Export as `_n.dds`.

**Fixing in Photoshop:**
1. Image > Adjustments > Invert (with Green channel selected in Channels panel).

**Fixing in texconv:**
```bash
texconv.exe input_n_opengl.png -f BC5_UNORM -m 0 -inverty -o output_folder\
```
(`-inverty` flips the Y/green channel during conversion)

**Substance Painter export:**
- In the export dialog, set "Normal Map Format" to "DirectX" before exporting.

---

## Resolution Guidelines by Asset Type

Higher resolution is not always better. Match resolution to the asset's visual importance and on-screen size.

| Asset Type | Recommended Resolution | Notes |
|---|---|---|
| Player character body | 2K (2048) | Seen constantly; justify the VRAM |
| Player head/face | 2K | Match body resolution |
| Unique named NPC face | 2K | Generic NPCs: 1K is fine |
| Weapons (player-held) | 2K | Seen up close during ADS |
| Common environment props | 1K (1024) | Barrels, crates, chairs |
| World terrain blends | 1K | Tiled, so 1K looks like 2K via tiling |
| Landscape terrain (non-tiled) | 2K–4K | Only for hero landscape areas |
| Interior walls | 1K–2K | Depends on room size |
| Skybox | 2K | Single asset; VRAM is justified |
| UI textures | Match display res | Not DDS; usually PNG; no mip maps needed |
| Particle effects | 512 | Small on screen; 1K is waste |

**4K (4096×4096) textures**: Only justified for character faces and unique weapons/armor that fill the screen. 4K takes ~12MB uncompressed (5.3MB as BC1). A full armor set at 4K easily exceeds 100MB VRAM.

---

## Alpha Channel Usage

### Transparency

Used in `_d.dds` for foliage leaves, chain-link, glass:
- **BC3** required (BC1 only supports 1-bit "cut-out" alpha)
- Alpha `255` = fully opaque, `0` = fully transparent
- Foliage: Cut leaves from background in image editor, paint alpha mask manually or use "Color to Alpha"

### Parallax Height Maps (`_h.dds`)

For parallax occlusion mapping (requires ENB or specific shaders):
- Single-channel BC4 grayscale
- White (255) = surface high point (raised)
- Black (0) = surface low point (recessed)
- Subtle is better — typical range is 128±50 for most surfaces
- Requires the NIF to have `BSEffectShaderProperty` with parallax flag enabled

> **⚠️ WARNING**: Vanilla Fallout 4 does not support parallax natively. `_h.dds` only functions with Community Shaders or specific ENB configurations. Do not rely on parallax for vanilla compatibility.

---

## Batch Conversion with texconv.exe

`texconv.exe` is the most reliable batch conversion tool. Download from Microsoft's DirectXTex GitHub releases.

### Convert a folder of PNGs to BC1 DDS:
```bash
for %f in (*.png) do texconv.exe "%f" -f BC1_UNORM -m 0 -o "output\"
```

### Convert all normal maps (ending in _n.png) to BC5:
```batch
@echo off
for %%f in (*_n.png) do (
    texconv.exe "%%f" -f BC5_UNORM -m 0 -if KAISER -nmap l -o "normals_out\"
)
```

### Convert specular maps to BC3:
```batch
for %%f in (*_s.png) do texconv.exe "%%f" -f BC3_UNORM -m 0 -o "spec_out\"
```

### Convert to BC7 (slow, high quality):
```batch
for %%f in (*_d.png) do texconv.exe "%%f" -f BC7_UNORM -m 0 -o "diffuse_out\"
```

### Full key texconv flags:
| Flag | Meaning |
|---|---|
| `-f BC1_UNORM` | Output format |
| `-m 0` | Generate all mip levels |
| `-m 1` | No mip maps (single level) — only for UI |
| `-if KAISER` | Mip filter: Kaiser (default recommended) |
| `-nmap l` | Treat as normal map; normalize mips |
| `-inverty` | Flip green channel (OpenGL→DirectX) |
| `-o folder\` | Output directory |
| `-y` | Overwrite existing files |
| `-pow2` | Resize to nearest power of 2 |

---

## Common Mistakes and Fixes

### Mistake 1: Wrong format for normal maps
**Problem**: Using BC1 or BC3 for `_n.dds` → blocky, incorrect surface lighting.
**Fix**: Always export normal maps as BC5. No exceptions.

### Mistake 2: No mip maps
**Problem**: Texture exported with mip count = 1 → shimmer on distant surfaces, VRAM pressure.
**Fix**: Always use `-m 0` in texconv or check "Generate Mipmaps" in GUI exporters.

### Mistake 3: Green channel not flipped (OpenGL normals in DirectX game)
**Problem**: Bumps appear inverted — rivets look like holes, panels look recessed.
**Fix**: Invert green channel before or during export. Use `-inverty` in texconv.

### Mistake 4: Shipping textures without the matching `_s.dds`
**Problem**: Surface has wrong default specular — usually overly shiny or flat.
**Fix**: Always ship R, N, and S maps together. Generate a basic `_s.dds` if you don't have PBR data (flat gray with appropriate R/G values).

### Mistake 5: Texture resolution not a power of 2
**Problem**: 1000×800 texture → GPU can't generate mip chain, may crash or look wrong.
**Fix**: All DDS textures must be power-of-2 dimensions: 256, 512, 1024, 2048, 4096. Use `-pow2` in texconv to auto-resize.

### Mistake 6: Using JPEG as source for normal maps
**Problem**: JPEG compression artifacts in normals cause wavy, incorrect lighting.
**Fix**: Always work from lossless sources (PNG, TIFF, PSD) for normal maps. Never use JPEG.

### Mistake 7: BC7 compression takes too long, skipping mip maps to save time
**Problem**: Skipping mips causes shimmer, compromising the visual quality you paid for with BC7.
**Fix**: Use NVIDIA Texture Tools Exporter with GPU acceleration for fast BC7. Never skip mips.

### Mistake 8: Diffuse texture alpha channel is garbage data
**Problem**: Foliage has random white/black blobs in alpha from accidental painted data → vegetation looks torn/glitched.
**Fix**: Always verify the alpha channel before export. Use "Flatten Alpha" or explicitly paint your alpha mask.

### Mistake 9: Wrong texture dimensions for parallax
**Problem**: `_h.dds` doesn't match the dimensions of `_n.dds` → parallax miscalculation.
**Fix**: All textures for a given material must share the same resolution (or be exact power-of-2 multiples of each other).

### Mistake 10: Packing textures into BA2 without testing loose first
**Problem**: Compressing to BA2 before testing means each iteration requires unpacking to debug.
**Fix**: Always test with loose textures first. Only pack to BA2 for final release.

---

## Quick Reference Card

| Texture Type | Suffix | Format | Mip Maps | Notes |
|---|---|---|---|---|
| Diffuse (no alpha) | `_d.dds` | BC1 | Yes | Standard opaque surfaces |
| Diffuse (with alpha) | `_d.dds` | BC3 | Yes | Foliage, glass, decals |
| Normal Map | `_n.dds` | BC5 | Yes | Always DirectX (flip G if OpenGL source) |
| Specular | `_s.dds` | BC3 | Yes | R=spec, G=gloss, B=AO |
| Glow/Emissive | `_g.dds` | BC1 | Yes | RGB = glow color |
| Height/Parallax | `_h.dds` | BC4 | Yes | Requires ENB/Community Shaders |
| Environment Map | `_e.dds` | BC1 cubemap | Yes | 6-face cubemap format |
| High-quality diffuse | `_d.dds` | BC7 | Yes | Hero assets; slower to compress |
