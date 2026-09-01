# Community Shaders for Fallout 4 — Complete Guide (2025/2026)

Community Shaders is an open-source post-processing framework for Fallout 4 that provides modern rendering features not available in vanilla or traditional ENB setups. It is one of the most significant graphics advancements in the FO4 modding scene since ENBSeries, and by 2026 has become the primary graphics enhancement for players who want modern rendering without the performance overhead of a full ENB.

**GitHub:** https://github.com/doodlum/skyrim-community-shaders (FO4 fork: check Nexus for the Fallout 4 release)  
**Nexus (FO4):** Search "Community Shaders" on Nexus — use the Fallout 4-specific release.  
**Requirements:** F4SE, Address Library (All-in-One), NG or 1.11.x game version.

---

## What Community Shaders Adds

Community Shaders replaces or augments the following rendering systems:

| Feature | What it does |
|---|---|
| **GGX Specular** | Physically correct microfacet specular (Cook-Torrance / GGX BRDF). Replaces Bethesda's Blinn-Phong specular with a model that respects roughness maps properly. |
| **Screen Space Global Illumination (SSGI)** | Indirect bounce lighting from screen-visible geometry. Walls, floors, and objects cast colored light onto nearby surfaces — approximating the look of global illumination. |
| **Terrain Blending** | Extended landscape layer count (beyond vanilla's 6-layer limit) and higher-res terrain blend normals. |
| **Complex Parallax** | True POM (Parallax Occlusion Mapping) on landscape and architecture textures — genuine surface depth without geometry cost. |
| **Extended Material Channels** | Reads roughness (R), metalness (G), and porosity from `_s.dds` channels, enabling full PBR workflows in CK without engine modification. |
| **Wetness & Rain** | Dynamic wetness on surfaces during rainfall — puddles form, surfaces darken, specular increases realistically. |
| **Skylighting** | Directional ambient occlusion derived from sky visibility, improving outdoor shadow contact quality. |
| **Subsurface Scattering** | Enhanced skin/foliage SSS using the new shader pipeline; more accurate than vanilla's basic implementation. |

---

## Installation

### Prerequisites

1. **Game version**: NG (1.10.980+) or 1.11.x. Community Shaders uses the NG shader pipeline and will not run on OG (1.10.163).
2. **F4SE** matching your game version (0.7.x for NG/1.11.x).
3. **Address Library for F4SE Plugins** — All In One (Nexus #47327).
4. **Addictol** (Nexus #84214) — required for engine stability at high-quality shader settings.

### Steps

1. Download Community Shaders from Nexus (use your mod manager's download button — MO2 or Vortex).
2. Install via MO2/Vortex. No manual file placement needed.
3. Community Shaders installs as an F4SE plugin: `Data\F4SE\Plugins\CommunityShaders.dll` + accompanying config files.
4. Launch the game via F4SE loader.
5. In the Pause menu → Community Shaders → opens the in-game settings panel (default key: **End**).

### Recommended Load Order

Community Shaders is an F4SE plugin and loads automatically — it has no ESP/ESM to place in your load order. It does **not** conflict with ENB but may conflict with certain ENB effects (see Compatibility section).

---

## In-Game Settings Panel

Press **End** (default) while in-game to open the Community Shaders overlay. From here you can:

- Toggle individual shader features on/off in real time.
- Adjust quality/intensity sliders without editing INI files.
- See per-feature performance cost indicators.
- Export your settings as a preset.

---

## Feature Configuration

### SSGI (Screen-Space Global Illumination)

SSGI is the most visually impactful feature. It calculates indirect light bounce from visible surfaces.

**Settings in Community Shaders panel:**

```
SSGI:
  Enable: true
  Intensity: 0.30–0.45       (0.3 = subtle, 0.5 = strong)
  Saturation: 0.6–0.8        (how much colour from surfaces affects bounce)
  Radius: 40–80 (game units)  (larger = more distant bounce, heavier performance cost)
  Sample Count: 4–8           (quality vs performance; 4 is acceptable, 8 is high quality)
  Blur Passes: 2              (reduces noise; 3 is smoother but costs more)
```

**Performance note:** SSGI is GPU-intensive. At `Intensity=0.35, SampleCount=4`, expect 8–15% GPU overhead on an RTX 3060 at 1080p. Enable DLSS or FSR (see the `DLSS_FSR_UPSCALING_GUIDE.md`) to reclaim these frames.

**Visual tip for modders:** When building custom cells, SSGI will pick up colored light from your placed light sources and bounce it onto nearby surfaces. A blue `LIGH` record near a white wall will produce a visible teal cast on adjacent objects — calibrate your `LIGH` colors with SSGI enabled, not vanilla rendering.

### GGX Specular

Replaces Bethesda's legacy Blinn-Phong specular with a GGX BRDF model. GGX produces a more natural specular tail — highlights spread realistically at grazing angles rather than cutting off sharply.

**Impact on your mod textures:**

The `_s.dds` (specular map) green channel is now interpreted as `1 - roughness` (where 0 = perfectly rough/matte, 255 = perfectly smooth/mirror). In vanilla, the G channel was a raw gloss value; the difference is subtle but matters at extreme ends.

| Surface | Correct G channel value (0–255) |
|---|---|
| Matte concrete | 10–30 |
| Worn leather | 40–70 |
| Polished metal | 180–220 |
| Wet/oily metal | 220–255 |
| Skin (face) | 100–140 |
| Glossy plastic | 150–190 |

### Terrain Blending & Parallax

For mod authors using landscape textures, Community Shaders unlocks:

- Up to **9 terrain layers** per cell (vanilla: 6).
- **POM (Parallax Occlusion Mapping)** on terrain, reading the `_p.dds` height channel.

**To enable parallax on your landscape textures:**

1. Your BGSM material file must include:
   ```
   bParallax=true
   fParallaxInnerLayerTextureScale=0.5
   fParallaxOcclusionShadows=true
   ```
2. The `_p.dds` height texture must be in BC4 format (single grayscale channel), placed in the same folder as your `_d.dds` diffuse.
3. In Community Shaders panel: Complex Parallax → Enable: true.
4. The **Parallax Mod** (Nexus — "Parallax Terrain") provides community-wide parallax height maps for vanilla textures if you want to add depth without creating your own.

### Wetness System

The dynamic wetness system:
- Detects when the in-game weather record has rain/fog parameters.
- Smoothly increases specular on outdoor surfaces as precipitation intensifies.
- Creates puddles in low-lying geometry.

**For mod authors:** No action needed for standard outdoor cells — wetness is applied automatically based on weather. For custom indoors with intentional wet areas (sewers, flooded vaults):
- Add the keyword `CS_WetSurface` to the `BGSM` file of your wet floor material.
- Set `fWetnessIntensity=1.0` in the material file.

---

## Community Shaders + ENB Coexistence

Community Shaders can run alongside ENB, but you must disable conflicting effects to avoid double-processing:

| Effect | Use in ENB | Use in Community Shaders | Notes |
|---|---|---|---|
| SSGI / AO | ❌ Disable ENB SSAO | ✅ Enable CS SSGI | CS SSGI is more accurate; ENB SSAO can't see CS-added bounce |
| Specular | ❌ Disable ENB Specular | ✅ CS GGX handles it | GGX is superior to ENB's specular override |
| Depth of Field | ✅ Keep ENB DoF | ❌ Disable CS DoF | ENB has better bokeh quality |
| Bloom | ✅ Keep ENB Bloom | ❌ Disable CS Bloom | ENB bloom integrates with its tone mapper |
| Tone Mapping | ✅ Keep ENB tone map | ❌ | ENB must control final tonemapping |
| Wetness | ❌ | ✅ CS only | |
| Terrain Parallax | Incompatible | ✅ CS only | Do not combine; ENB does not support CS parallax format |

**Recommended preset pairing:** Use **EMV ENB** or **NAC X ENB** (both have Community Shaders–aware versions on Nexus that ship with the correct ENB settings to avoid conflicts).

---

## Compatible Texture Mods (Community Shaders–Ready)

As of 2025/2026, these texture overhauls ship with `_s.dds` correctly calibrated for Community Shaders' GGX pipeline and include `_p.dds` parallax maps:

- **Luxor's HD Textures** (CS-aware update, 2025) — full landscape + architecture
- **PhyOp – Physical Fallout 4** — physics-informed PBR textures for props and clutter
- **SavrenX HD Textures** — weapons and power armor with GGX-ready specular maps
- **Vivid Fallout AiO** (2025 revision) — most popular pack; 2025 build includes CS parallax support for terrain

For textures that pre-date Community Shaders, the `_s.dds` G channel may need to be inverted (in GIMP/Photoshop) to convert from old gloss convention to roughness convention. Community Shaders includes a BGSM flag (`bInvertGlossMap=true`) to handle legacy textures without re-exporting.

---

## For Mod Authors: Creating CS-Native Textures

### _s.dds Channel Convention (Community Shaders mode)

```
R = Specular Intensity (metalness)
    Dielectrics (non-metal): 0.04 (= ~10 out of 255)
    Metals: 200–255 (full metallic response)

G = 1 - Roughness
    0 = fully rough (matte)
    255 = perfectly smooth (mirror)

B = (optional) Subsurface scattering mask
    255 = full SSS (skin, leaves)
    0 = no SSS (metal, rock)

A = Specular Color tint (where supported)
    255 = neutral white specular
    Lower = tinted specular (e.g. gold tint for brass)
```

### Exporting DDS for Community Shaders

Use **Intel Texture Works** (Photoshop plugin) or **GIMP DDS plugin**:

- Diffuse (`_d.dds`): BC7 for best quality; BC1 for performance
- Specular (`_s.dds`): BC7 (lossless channels needed for PBR accuracy)
- Normal (`_n.dds`): BC5 (two-channel RG, engine reconstructs B automatically)
- Height/Parallax (`_p.dds`): BC4 (single grayscale channel)

> **Tip:** Do not compress `_s.dds` with BC3/DXT5 — the BC7 difference is minimal file-size cost for significant quality improvement in the specular response.

---

## Performance Budget (2026 Hardware)

| GPU | Settings | Resolution | FPS impact |
|---|---|---|---|
| RTX 3060 / RX 6700 XT | SSGI medium, GGX, Parallax | 1080p + DLSS Quality | −5 to −10 FPS |
| RTX 4070 / RX 7800 XT | SSGI high, all features | 1440p + DLSS Quality | −8 to −15 FPS |
| RTX 4090 | All maxed | 4K + DLAA | −10 to −20 FPS |
| RTX 3060 (no upscaling) | SSGI low, GGX only | 1080p | −8 to −12 FPS |

**Always pair Community Shaders with DLSS or FSR** to recover frames (see `DLSS_FSR_UPSCALING_GUIDE.md`). With DLSS Quality mode at 1440p, CS full-quality typically costs fewer frames than vanilla rendering at native 4K.

---

## Troubleshooting

### "Community Shaders not loading / End key does nothing"
1. Verify you are on NG or 1.11.x — not OG 1.10.163.
2. Check `Data\F4SE\Plugins\` contains `CommunityShaders.dll` and its companion TOML/INI files.
3. Run CLASSIC (Nexus #56255) after a crash to check for DLL version mismatch.
4. Ensure F4SE and Address Library are the correct versions for your runtime.

### "SSGI causes black patches / flickering"
- Reduce `Radius` setting and `Sample Count` to 4.
- Check that no cell has an `ImageSpaceAdapter` record that overrides exposure to extreme values — very dark or bright ISAs confuse the SSGI depth buffer.
- Disable Community Shaders' SSGI in exclusively interior cells where you have custom baked ambient — SSGI is most effective in exterior and semi-open environments.

### "Terrain parallax not working on my mod"
- Ensure BGSM has `bParallax=true`.
- Confirm `_p.dds` exists in the same texture folder as `_d.dds`.
- Verify `_p.dds` is BC4 (not RGBA) format — open with Intel Texture Works and check channel count.
- Complex Parallax must be enabled in the Community Shaders in-game panel.

### "Skin / characters look over-bright"
- GGX specular is more sensitive to `_s.dds` R channel than vanilla specular. If character skin looks blown out, reduce the R channel of `_s.dds` (face/body textures) to 0.04 range (≈10 out of 255). Many older mods set R to 80+ which is only correct for metals.

---

## Summary

Community Shaders is now the **baseline graphics enhancement** for modern FO4 modding in 2025/2026. It provides physically accurate specular (GGX), screen-space global illumination (SSGI), terrain parallax, and wetness at lower performance cost than a full ENB. For mod authors, aligning textures to its PBR channel conventions ensures your mod looks correct on the majority of modern setups.

*Last updated: May 2026. Requires: F4SE NG, Address Library AiO, NG or 1.11.x game.*
