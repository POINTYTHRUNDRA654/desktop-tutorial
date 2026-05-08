# PBR Pipeline for Fallout 4 (2026 Hybrid Approach)

A practical reference for achieving modern Physically Based Rendering (PBR) results in Fallout 4. Covers the engine's native specular-glossiness model, the community shader and ENB extension stack that bridges it toward metal-roughness PBR, map channel packing conventions, and the surface technique injections (POM, DLSS/DLAA) that make 4K/8K custom assets look their best.

---

## 1. Understanding FO4's Rendering Model

### What FO4 Actually Uses: Specular-Glossiness (Not Metal-Roughness)

Fallout 4 uses a rendering model sometimes called "Todd-Based Rendering" (TBR) in the modding community — in industry terms it is a **specular-glossiness** workflow, the older PBR variant used in Unreal Engine 3 and early Physically Based pipelines (circa 2010–2013). Key properties:

| Channel | FO4 interpretation |
|---|---|
| Diffuse (`_d.dds`) | Albedo + baked indirect lighting residual |
| Specular (`_s.dds`) | **R = specular intensity** (grayscale), **G = glossiness** (inverse of roughness), **B = unused** by standard shaders |
| Normal (`_n.dds`) | DirectX convention (Y-up = green channel = **NOT** inverted like OpenGL) |
| Emissive/Glow (`_g.dds`) | Self-illumination mask, drives emittanceMult in BGSM |

### Why Vanilla FO4 Does Not Natively Support Metal-Roughness

The engine's `BSLightingShaderProperty` was never updated to read metalness or roughness directly. There is no `metallic` field in the standard BGSM format. Modern PBR authoring tools (Substance Painter, Adobe Substance 3D) default to metal-roughness output — you must **convert** before shipping assets.

### The Conversion Formula

When converting from metal-roughness (Substance/Marmoset output) to FO4 specular-glossiness:

- **Specular R** = `lerp(0.04, Albedo_RGB_luminance, Metallic)` — for purely dielectric surfaces `0.04` (4% reflectance); for metals, use albedo luminance
- **Specular G** (Glossiness) = `1.0 - Roughness` — invert the roughness map
- **Specular B** = leave black (0) for standard shaders; ENB Extender or Community Shaders may read this channel for extended data (see §3)
- **Diffuse** = `Albedo × (1 - Metallic)` — metals have near-black diffuse

Tools: use Photoshop/Krita with a channel mixer, or a custom Substance Painter export template (see §5).

---

## 2. Community Shaders for Fallout 4 (2026)

Originally developed for Skyrim, Community Shaders expanded FO4 support in 2026. It is an F4SE plugin that **replaces the game's compiled HLSL shaders** at runtime, injecting modern screen-space and surface techniques without touching the BGSM pipeline.

### What Community Shaders Adds to FO4

- **Extended BGSM channel reads**: can read the unused Specular B channel as an AO/cavity mask or subsurface weight when a special flag is set in the BGSM
- **Script heap allocation monitoring**: detects when PRP (Previs Repair Pack) custom material loads approach the Papyrus heap limit and pre-allocates buffer, preventing "ScrapHeap" crashes on large custom material loads
- **Extended specular model**: Beckmann NDF by default; optionally switch to GGX (more physically accurate for rough surfaces like irradiated bark and wet stone)
- **Screen-space global illumination (SSGI)**: bounced indirect light approximation that makes custom PBR materials appear lit from the environment rather than floating with baked-only AO
- **Screen-space shadows (SSS)**: fine contact shadows that respect normal map detail on custom meshes

### Installation

1. Place `CommunityShaders.dll` + `CommunityShaders.toml` in `Data\F4SE\Plugins\`
2. Place compiled HLSL `.cso` files in `Data\Shaders\`
3. Requires F4SE, Address Library

### `CommunityShaders.toml` Key Settings for Custom PBR

```toml
[Rendering]
SpecularModel = "GGX"          # Beckmann | GGX | Phong
EnableSSGI = true
SSGIIntensity = 0.4            # 0.3–0.6 for outdoor wasteland
EnableSSS = true               # screen-space shadows
SSSMaxDistance = 256           # units; lower = less GPU cost

[ExtendedBGSM]
EnableSpecBChannelAO = true    # read _s.dds blue as AO cavity mask
EnableGGXRoughnessFix = true   # clamp roughness > 0.02 (prevents specular fireflies)

[Compatibility]
DisableForInterior = false     # set true if interiors have artifacts
HeapPreallocationMB = 64       # prevent ScrapHeap crash on large PRP installs
```

### Community Shaders + PRP Compatibility

If using PRP (Previs Repair Pack) with Community Shaders:
- PRP invalidates many precombines during its rebuild pass — Community Shaders' heap pre-allocation (`HeapPreallocationMB=64`) prevents the Papyrus heap from overflowing when the engine re-evaluates custom material assignments on rebuild
- Do **not** enable both Community Shaders SSGI and an ENB SSAO simultaneously — they compute similar effects and double-sampling causes a ~15–30% FPS drop in exterior cells

---

## 3. ENB Extender

**ENB Extender** (GitHub / Nexus) is an ENB add-on plugin that enhances Boris Vorontsov's ENB Series for Fallout 4 by:

1. **Pre-weather shader variables**: exposes `WeatherTransition`, `FogNear`, `SunAngle`, and `TimeOfDay` as ENB shader constants. This allows external shader code (your ENB preset's `enbeffect.fx`) to sample these values and modulate PBR lighting response accordingly — e.g., increasing specular glossiness falloff at sunrise and sunset to match the warm directional light angle
2. **External shader caching**: caches compiled `.fx` shader binaries to disk, so startup time is not wasted recompiling ENB shaders every launch. Critical when using large custom shader sets with many permutations
3. **Extended constant buffers**: unlocks additional `float4` constant slots in the ENB shader pipeline that vanilla ENB cannot reach, used by advanced presets to pass PBR correction factors (exposure bias, tonemap shoulder, GGX roughness clamp) per-weather

### Installation

Place `ENBExtender.dll` in the FO4 root folder (same directory as `Fallout4.exe`). Edit `ENBExtender.ini`:

```ini
[General]
EnableWeatherVariables=1       ; expose TESWeather values to enbeffect.fx
EnableShaderCaching=1          ; cache compiled .fx to .cache/ folder
EnableExtendedConstants=1      ; unlock additional CBs for advanced presets
LogLevel=2                     ; 0=off 1=errors 2=info 3=verbose

[Compatibility]
ForceENBHelperLoad=1           ; ensure ENBHelper.dll loads before game renders first frame
```

### Using Weather Variables in Your ENB Shader

In `enbeffect.fx` (with ENB Extender active):

```hlsl
// Provided by ENB Extender
extern float WeatherTransition;  // 0.0–1.0 blend between current/next weather
extern float FogNear;            // engine fogNear distance in units
extern float TimeOfDay;          // 0.0 (midnight) → 1.0 (next midnight)
extern float SunAngle;           // 0.0 = horizon, 1.0 = zenith

// Example: boost glossiness response at golden hour
float goldenHour = saturate(1.0 - abs(TimeOfDay - 0.25) * 8.0);
float glossBoost = 1.0 + goldenHour * 0.35;
color.rgb = ApplySpecularGloss(color.rgb, glossBoost);
```

---

## 4. EMV — Physically Correct Bloom and Tone Mapping

**EMV** is an ENB preset (GitHub) specifically designed to implement:

- **Physically correct bloom**: instead of the screen-space scatter blur used by vanilla ENB, EMV implements a multi-tap Kawase blur with luminance threshold gating — bright specular highlights from your custom PBR materials bloom proportionally to their true luminance rather than their screen radius
- **Unreal Engine 4 style ACES tone mapping**: the ACES filmic curve (used by UE4/UE5) produces more naturalistic highlight roll-off and shadow lift than vanilla linear or Reinhard tone mapping, which is critical when your custom PBR textures have physically calibrated albedo values (50–240 sRGB for diffuse, not arbitrary artist values)

### Why EMV Matters for Custom PBR Assets

Standard ENB presets were tuned for vanilla Fallout 4's non-physically-calibrated textures. When you ship assets with Substance Painter's "Physically Based (Metallic/Roughness)" baking calibration (albedo in 50–240 sRGB, specular at 0.04 for dielectrics), vanilla ENB overexposures highlight regions because it expects darker diffuse maps. EMV's tone mapping curve handles the full dynamic range correctly.

### EMV `enbseries.ini` Key Values

```ini
[BLOOM]
; EMV uses multi-tap Kawase — do not override these without understanding the chain
BloomAmount=0.15               ; lower than vanilla — physically correct bloom is subtle
BloomThreshold=0.85            ; only bloom pixels above 85% exposure
BloomSaturation=1.2

[TONEMAPPING]
ToneMappingCurve=ACES          ; ACES | Reinhard | Hable | Linear
ToneMappingExposure=1.0        ; calibrated for Substance PBR albedo (50–240 sRGB)
ToneMappingShoulder=0.22       ; ACES shoulder — keeps specular from clipping
ToneMappingToe=0.015           ; shadow lift — prevents crushed blacks in fog

[CORRECTION]
ColorSaturation=1.05           ; subtle boost for post-nuclear palette
GammaCorrectionEnable=true     ; required with ACES curve
```

---

## 5. Custom PBR Workflow — From Substance Painter to FO4

### Step 1: Substance Painter Export Template for FO4

Create a custom export template in Substance Painter (`File → Export Textures → New template`):

```json
{
  "name": "Fallout4_SpecGloss",
  "channels": {
    "BaseColor": {
      "outputName": "$mesh_d.dds",
      "colorSpace": "sRGB",
      "format": "BC3",
      "channels": ["R","G","B","A"]
    },
    "SpecGloss_FO4": {
      "outputName": "$mesh_s.dds",
      "colorSpace": "Linear",
      "format": "BC3",
      "channels": {
        "R": "SpecularLevel",
        "G": "GlossInverted",
        "B": "zero",
        "A": "zero"
      }
    },
    "Normal_DirectX": {
      "outputName": "$mesh_n.dds",
      "colorSpace": "Linear",
      "format": "BC5",
      "channels": ["R","G"]
    },
    "Emissive": {
      "outputName": "$mesh_g.dds",
      "colorSpace": "Linear",
      "format": "BC3",
      "channels": ["R","G","B","A"]
    }
  }
}
```

**Critical channel notes:**
- `GlossInverted` = `1.0 - Roughness` — Substance Painter has a built-in "Glossiness" channel that outputs this automatically
- `SpecularLevel` = Substance's "Specular Level" channel at default 0.04 for dielectrics; for metals set to `Albedo × Metallic`
- **B channel** = `zero` for standard shaders. If using Community Shaders with `EnableSpecBChannelAO=true`, pack your AO/cavity bake into B (keep it as a separate pass, then composite: `SpecR`, `GlossG`, `AOcavityB`)

### Step 2: MRAO — When to Use It

The MRAO map (Metallic-Roughness-Ambient Occlusion packed into a single BC3 texture) is used when targeting **Community Shaders' extended BGSM mode** or when building assets for upscaled ENB presets that can read a separate MRAO pass:

```
MRAO channels:
  R = Metallic (0.0 = dielectric, 1.0 = pure metal)
  G = Roughness (0.0 = mirror, 1.0 = fully rough)
  B = Ambient Occlusion (1.0 = fully lit)
```

In your BGSM file, reference the MRAO as a secondary texture slot (slot varies by shader type — check `BSLightingShaderProperty.textureSet[8]` for the extra slots unlocked by Community Shaders). This is an advanced workflow — only use it if your Community Shaders build supports the extended BGSM reads.

### Step 3: Normal Map Convention

FO4 uses **DirectX convention** normals (Y-up means **green channel points up** = NOT inverted). Substance Painter defaults to OpenGL (Y inverted). Always export with:

- Substance: `File → Document Settings → Normal Map Format: DirectX`

Or flip the green channel in your export template:
```json
"Normal_G": { "channel": "NormalGreen", "flipY": false }
```

If your normals look inverted (surface lighting reversed), your green channel is in OpenGL format — flip it.

### Step 4: DDS Format Reference

| Map | Format | Notes |
|---|---|---|
| Diffuse (`_d.dds`) | BC3 (DXT5) | Alpha = opacity mask or parallax height |
| Specular (`_s.dds`) | BC3 (DXT5) | R=spec, G=gloss, B=AO (if Community Shaders), A=unused |
| Normal (`_n.dds`) | BC5 (ATI2N) | RG = X/Y normal; Z reconstructed. Most memory-efficient for normals |
| Emissive (`_g.dds`) | BC3 or BC1 | BC3 if alpha mask needed; BC1 if fully opaque emission |
| Height/Parallax (`_h.dds`) | BC4 (ATI1N) | Single-channel grayscale; used for POM |
| MRAO | BC3 | R=metallic, G=roughness, B=AO |

---

## 6. Specular-Gloss Channel Packing — Visual Reference

```
_s.dds layout:
┌─────────────────────────────────────────────┐
│  R channel — Specular Intensity (grayscale) │
│    0.0 = no reflectance                     │
│    0.04 = dielectric (most materials)       │
│    0.3+ = semi-metal or wet surface         │
│    1.0 = pure metal                         │
├─────────────────────────────────────────────┤
│  G channel — Glossiness (roughness inverted)│
│    0.0 = fully rough (matte)                │
│    0.5 = semi-polished (aged metal)         │
│    1.0 = mirror (polished chrome)           │
├─────────────────────────────────────────────┤
│  B channel — (unused by vanilla engine)     │
│    With Community Shaders ExtendedBGSM:     │
│    pack AO/cavity here for better shadowing │
├─────────────────────────────────────────────┤
│  A channel — unused by standard shaders     │
│    Some ENB presets read A as depth bias    │
└─────────────────────────────────────────────┘
```

### Common Calibration Values

| Material | Spec R | Spec G (Gloss) | Notes |
|---|---|---|---|
| Concrete/stone | 0.04 | 0.1–0.3 | Very rough dielectric |
| Irradiated mud | 0.04 | 0.05–0.15 | Wet = slightly higher G |
| Painted metal | 0.04–0.06 | 0.2–0.6 | Paint layer over metal |
| Exposed rusted steel | 0.5 | 0.2–0.35 | Partial metal |
| Polished chrome | 0.9 | 0.9 | High-spec metal |
| Mutant plant skin | 0.04 | 0.3–0.5 | Slimy = higher gloss |
| Bioluminescent tissue | 0.04 | 0.5–0.7 | Wet/waxy surface |

---

## 7. Parallax Occlusion Mapping (POM) via ENB

POM gives flat textures apparent 3D depth by ray-marching into the height map (`_h.dds`) during rendering. For custom landscape textures (irradiated soil, cracked concrete, mossy surfaces) it dramatically increases perceived realism without adding geometry polygons.

### Enabling POM Through ENB

In `enbseries.ini`:

```ini
[PARALLAX]
EnableParallax=true
ParallaxOcclusionMapping=true   ; false = plain offset parallax (cheaper, less accurate)
ParallaxHeight=0.08             ; height scale — 0.05–0.12 for landscape; higher = stronger 3D effect
ParallaxShadows=true            ; self-shadowing at parallax depth (more realistic; 5–8% GPU cost)
ParallaxMinSamples=8
ParallaxMaxSamples=32           ; increase for smoother quality at steep viewing angles
```

### Enabling POM Through Community Shaders

Community Shaders can inject POM independently of ENB:

```toml
[ParallaxOcclusionMapping]
Enabled = true
HeightScale = 0.07
MaxSamples = 32
SelfShadow = true
SelfShadowStrength = 0.6
```

### Height Map Requirements for POM

- Format: `_h.dds` BC4 (single channel, 8-bit grayscale)
- Convention: `1.0 = surface top` (extruded), `0.0 = surface bottom` (recessed)
- Resolution: match or double the diffuse resolution (4K diffuse → 4K or 8K height)
- In Substance Painter: use the `Height` output channel; export as BC4

### BGSM Flag for POM

In your BGSM file, set `bParallaxOcclusion = true` and reference your `_h.dds` in `sParallaxTexture`. Also set `SF2_PARALLAX_OCCLUSION` in the shader flags:

```
BSLightingShaderProperty Shader Flags 2:
  SF2_PARALLAX_OCCLUSION = bit 11 (flag value 0x00000800)
```

---

## 8. DLSS / DLAA 4 — Why It Matters for PBR Assets

### The Vanilla TAA Problem for PBR

FO4's native TAA applies a temporal blur that:
- Smears fine normal map detail (your 4K normal maps look like 512px in motion)
- Blurs specular highlights, making PBR calibrated glossiness look uniformly flat
- Ghosts on moving specular (bioluminescent plants, wet surface reflections)

### PureDark DLSS 4 Mod

PureDark's DLSS 4 mod for FO4 replaces TAA entirely with NVIDIA's DLSS neural upscaling:

- **DLSS Quality mode** (`Mode=1`): best for custom PBR — minimal blur, sharp normal map detail at any resolution
- **DLAA** (`Mode=4`): native resolution, no upscaling, purely anti-aliasing. Best for 4K monitors with custom PBR assets — preserves every pixel of your 4K/8K maps
- **Reactive Mask** (`ReactiveMask=1`): tag alpha-tested meshes (vegetation, foliage) to receive lighter temporal weighting — eliminates ghosting on specular highlights in plant bioluminescence and wet-surface reflections

### DLSS.ini Configuration for PBR-Heavy Mods

```ini
[DLSS]
Enabled=1
Mode=1                ; 1=Quality | 2=Balanced | 3=Performance | 4=DLAA
FrameGeneration=0     ; 0=off (RTX 3000 safe); 1=on requires RTX 4000+
SharpenStrength=0.25  ; 0.1–0.3 — add mild sharpening to restore normal map crispness
ReactiveMask=1        ; CRITICAL for vegetation/flora mods
ReactiveMaskThreshold=0.35

[PBRCompat]
; Lower threshold picks up more fine specular detail in PBR textures
DisocclusionMask=1
DisocclusionThreshold=0.15
```

### ENB + DLSS Compatibility

DLSS intercepts the D3D11 present call. ENB also intercepts it. Load order:

```
Game render
  → DLSS injector (nvngx_dlss.dll + injector)
       → ENB (d3d11.dll from Boris Vorontsov)
            → ReShade (optional)
```

If ENB loads before DLSS, DLSS cannot hook the TAA pass. If your DLSS injection provides ENB-compatible mode (most 2026 builds do), enable it:

```ini
; in DLSS.ini
[Compat]
EnableENBCompat=1
```

---

## 9. Putting It All Together — Recommended 2026 PBR Stack

### Tool Stack (in priority order)

| Layer | Tool | Purpose |
|---|---|---|
| F4SE base | F4SE + Address Library | Required foundation |
| Stability | Buffout 4 | Crash guards + heap |
| Shaders | Community Shaders | GGX specular, SSGI, extended BGSM, heap pre-alloc |
| ENB pipeline | ENB Series + ENB Extender | Weather variables, shader caching, extended CBs |
| ENB preset | EMV | ACES tone mapping, physically correct bloom |
| Anti-aliasing | DLSS/DLAA (PureDark) | Replace TAA, preserve PBR detail |

### Texture Export Checklist

- [ ] Diffuse (`_d.dds`): BC3, sRGB, albedo = 50–240 sRGB for dielectrics
- [ ] Specular (`_s.dds`): BC3, linear, R=spec intensity (0.04 dielectric), G=1-roughness, B=AO if Community Shaders
- [ ] Normal (`_n.dds`): BC5, linear, DirectX convention (green = up, NOT inverted)
- [ ] Height (`_h.dds`): BC4, linear, white=extruded, BC4 format for POM
- [ ] Emissive (`_g.dds`): BC3, linear, matches `emittanceMult` in BGSM
- [ ] BGSM flags: `bParallaxOcclusion=true` if POM, `SF2_PARALLAX_OCCLUSION` set if using BGSM POM

### BGSM Template for Custom PBR Material

```ini
[BSLightingShaderMaterial]
version = 2

; Textures
sDiffuse = Textures\myfloramod\myplant_d.dds
sNormal = Textures\myfloramod\myplant_n.dds
sSpecular = Textures\myfloramod\myplant_s.dds
sEmittance = Textures\myfloramod\myplant_g.dds
sParallax = Textures\myfloramod\myplant_h.dds

; Specular settings — match your Substance export
fSmoothness = 0.7           ; base glossiness (overridden per-pixel by _s.dds G channel)
fSpecularMult = 1.0         ; multiplier on _s.dds R channel
fEmittanceMult = 1.0        ; multiplier on emissive (_g.dds); set higher for bioluminescence

; PBR-relevant flags
bParallaxOcclusion = true   ; enable POM height map reading
bTranslucency = false       ; true for SSS (subsurface scattering on thin leaves)
bEnvironmentMapping = false ; true for mirror-like reflections (polished chrome)
fEnvironmentMappingMaskScale = 1.0

; Shader type — MUST match NifSkope BSLightingShaderType
[BSShaderProperty]
Shader_Flags_1 = SLSF1_SPECULAR | SLSF1_REMAPPED_TEXTURES
Shader_Flags_2 = SF2_ZBUFFER_TEST | SF2_PARALLAX_OCCLUSION
```

---

## 10. Common Mistakes and How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| OpenGL normals shipped to FO4 | Lighting looks reversed (dark on lit side) | Flip green channel or set DirectX convention in Substance |
| Roughness map not inverted | Surfaces look uniformly matte | Ensure G channel in `_s.dds` = `1 - Roughness`, not raw Roughness |
| Albedo > 240 sRGB for dielectrics | Overblown specular bloom, materials look like emissive | Clamp diffuse to 50–240 sRGB range in Substance calibration |
| BC5 normal with alpha channel | NifSkope warns, possible shader fallback | BC5 has no alpha — use BC3 if you need an alpha normal mask |
| POM height too high | Extreme stepping artifact at steep angles | Reduce `ParallaxHeight` to 0.05–0.08; increase `MaxSamples` to 32+ |
| Community Shaders SSGI + ENB SSAO both enabled | 15–30% FPS drop, doubled indirect lighting | Disable one — either ENB's SSAO or CS's SSGI |
| DLSS loads after ENB | DLSS cannot hook TAA pass; vanilla TAA active | Ensure DLSS injector loads first; enable `EnableENBCompat=1` in DLSS.ini |
| MRAO packed into `_s.dds` without Community Shaders | B channel (AO) ignored; no improvement | MRAO extended reads require Community Shaders `EnableSpecBChannelAO=true` |
