# DLSS, FSR & DLAA Upscaling Guide for Fallout 4 (2025/2026)

Fallout 4 does not natively support modern upscaling technologies. However, the community has developed high-quality implementations of DLSS 3.x, FSR 3.x, and DLAA through F4SE mods and post-process injection. This guide covers every upscaling option available in 2025/2026, when to use each, and how to integrate them with ENB and Community Shaders.

---

## Overview: Why Upscaling Matters for FO4 Modders

A heavily modded Fallout 4 with high-res textures, ENB, Community Shaders, and LOD improvements can demand 2–4× more GPU time than vanilla. Upscaling allows you to:
- Run at near-native image quality while rendering at 50–70% of the native pixel count.
- Recover 30–50% of the GPU headroom consumed by visual enhancement mods.
- Enable higher-quality shader effects (SSGI, high-res shadows) without FPS penalty.

---

## Available Upscaling Technologies

| Technology | Developer | Supported GPUs | FO4 Implementation |
|---|---|---|---|
| **DLSS 3 (with Frame Gen)** | NVIDIA | RTX 20/30/40 series | PureDark DLSS mod |
| **DLAA** | NVIDIA | RTX 20/30/40 series | PureDark DLSS mod (AA only, no upscale) |
| **FSR 3 (with Frame Gen)** | AMD | Any GPU (AMD, NVIDIA, Intel) | FSR3 FO4 mod |
| **FSR 2** | AMD | Any GPU | Multiple implementations |
| **XeSS** | Intel | Any GPU (best on Intel Arc) | PureDark or standalone mod |

---

## 1. PureDark DLSS / DLAA Mod

**Author:** PureDark  
**Nexus:** Search "DLSS Fallout 4 PureDark" — available on Nexus and patreon.com/PureDark  
**Requirements:** F4SE, Address Library (All-in-One), RTX GPU (DLSS/DLAA), or any GPU (FSR 2 fallback)

### What It Does

PureDark's mod injects NVIDIA's DLSS SDK directly into FO4's render pipeline, providing:
- **DLSS Quality/Balanced/Performance modes** — render at 50–75% of native resolution, upscale to native.
- **DLAA** (Deep Learning Anti-Aliasing) — render at native resolution but use neural anti-aliasing (sharper than vanilla TAA).
- **DLSS 3 Frame Generation** — inserts AI-generated intermediate frames (RTX 40 series only).

### Installation

1. Download from Nexus — install as a regular mod via MO2 or Vortex.
2. The mod places:
   - `nvngx_dlss.dll` in the game root (DLSS runtime)
   - An F4SE plugin in `Data\F4SE\Plugins\`
3. Launch via F4SE (as always).
4. In the pause menu → DLSS menu → appears automatically if the mod loaded correctly.
5. Select mode: Quality / Balanced / Performance / Ultra Performance / DLAA.

### Recommended Settings

| Use Case | Mode | Notes |
|---|---|---|
| 4K monitor, RTX 4080+ | DLAA | Best image quality; render native, just replace TAA |
| 4K monitor, RTX 3080 | DLSS Quality (render 1440p → 4K) | Good quality/performance ratio |
| 1440p monitor, RTX 3060 | DLSS Quality (render 1080p → 1440p) | Reclaims frames for heavy ENB/CS |
| 1080p monitor, RTX 3060 | DLSS Balanced (render 720p → 1080p) | Only if you need frames for very heavy shader load |
| Any GPU without RTX | Use FSR 3 mod instead | DLSS requires NVIDIA RTX |

### ENB Compatibility

PureDark DLSS works alongside ENBSeries. However:
- ENB must be set to NOT handle its own TAA/anti-aliasing — disable `EnableEdgeAA=true` in `enblocal.ini` if you use DLAA/DLSS.
- Set `TemporalAA=false` in ENB if available — DLSS replaces temporal AA.
- The ENB tone mapping and post-processing occur BEFORE DLSS upscaling in the pipeline — correct behavior.

### Community Shaders Compatibility

DLSS works correctly with Community Shaders. SSGI and other CS effects render at the lower internal resolution, then DLSS upscales the final composite. This is the recommended combination:
- CS effects at medium quality → DLSS Quality → near-native visual result at reduced GPU cost.

---

## 2. FSR 3 (FidelityFX Super Resolution 3)

**Author:** Community implementation (AMD provides open SDK)  
**Nexus:** Search "FSR3 Fallout 4" — multiple implementations available  
**Requirements:** F4SE, Address Library; **works on all GPU brands**

### What FSR 3 Adds Over FSR 2

- **Frame Generation**: Inserts synthetic frames between real frames (like DLSS 3 Frame Gen). Works on **all GPUs**, not just NVIDIA RTX 40 series.
- **Native AA mode**: Similar to DLAA — render at native with neural AA.
- **Improved upscale quality** over FSR 2 — better motion handling, less ghosting.

### Installation

1. Download from Nexus → install via MO2/Vortex.
2. Like PureDark DLSS, this is an F4SE plugin injection.
3. AMD GPU users: ensure AMD Adrenalin drivers are up to date for best FSR 3 quality.
4. Launch via F4SE → FSR settings appear in the pause menu.

### Quality Modes

| Mode | Render Resolution | Performance Gain |
|---|---|---|
| Native AA | 100% | 5–15% (only AA improvement) |
| Quality | 67% | ~30–40% |
| Balanced | 58% | ~40–50% |
| Performance | 50% | ~50–70% |
| Ultra Performance | 33% | ~70–80% (significant quality loss) |

### Frame Generation (FSR 3 FG)

FSR 3 Frame Generation creates interpolated frames between real rendered frames:
- **Doubles displayed frame rate** without doubling GPU render cost.
- Best results above 60 FPS baseline — FG at 80 FPS baseline yields ~140–160 displayed FPS.
- Adds ~30–50ms latency to input response — enable only for single-player; not competitive scenarios.
- **Requires FO4's built-in frame pacing to be disabled** — set `iFPSClamp=0` in Custom.ini and use High FPS Physics Fix.

---

## 3. FSR 2 (Legacy — Still Viable in 2026)

FSR 2 implementations exist as standalone FO4 mods and also as a fallback within PureDark's mod when no RTX GPU is detected.

- Works on all GPUs (AMD, NVIDIA, Intel) including very old cards.
- Quality level is slightly below FSR 3 and significantly below DLSS 3 Quality.
- No frame generation.
- Recommended if FSR 3 is not yet stable for your game version — FSR 2 is well-tested.

---

## 4. DLSS vs FSR 3 — Which to Use?

| Scenario | Recommendation |
|---|---|
| NVIDIA RTX 40 series | DLSS 3 (Quality mode) + Frame Generation |
| NVIDIA RTX 30 series | DLSS 3 Quality (no Frame Gen on RTX 30) |
| NVIDIA RTX 20 series | DLSS 2 Quality (older DLSS SDK) |
| AMD RX 7000 / 6000 series | FSR 3 Quality |
| AMD RX 5000 / 580 | FSR 2 or FSR 3 Quality |
| Intel Arc | XeSS or FSR 3 |
| Older NVIDIA (GTX 10/16 series) | FSR 2 (no DLSS support) |

**Image quality ranking (best to acceptable):**
1. DLAA (NVIDIA, RTX) — native res, best AA
2. DLSS 3 Quality (NVIDIA RTX)
3. FSR 3 Quality (any GPU)
4. DLSS 3 Balanced
5. FSR 3 Balanced
6. FSR 2 Quality
7. DLSS 3 Performance / FSR 3 Performance (noticeable quality drop)

---

## 5. Integration with High FPS Physics Fix

**High FPS Physics Fix** (Nexus #44798) must be installed alongside any upscaling mod. Without it:
- FO4's Havok physics engine runs at incorrect speed above 60 FPS.
- Frame Generation from DLSS 3 / FSR 3 FG can push the *displayed* frame rate above 60 FPS without the *render* rate exceeding 60 FPS — but you still need the fix for stable physics.

In `HighFPSPhysicsFix.ini`:
```ini
[Havok]
fMaximumFramerate = 0        ; uncapped display FPS
fHavokSpeed = 60             ; lock physics simulation to 60Hz regardless of FPS
```

---

## 6. Tuning Upscaling for Maximum Visual Quality

### Sharpening

Upscaling algorithms produce softer output than native rendering. Apply sharpening to compensate:
- **DLSS**: Built-in sharpening slider in PureDark's menu (0.5–0.8 recommended).
- **FSR 3**: Built-in RCAS (Robust Contrast-Adaptive Sharpening) — enable with intensity 0.6.
- **ENB**: Disable ENB sharpening if using upscaling (double-sharpening looks artificial).
- **ReShade LumaSharpen**: Can supplement if sharpness is still insufficient.

### Ghosting Reduction

Temporal upscaling (DLSS, FSR) can produce ghosting on fast-moving objects:
- Use DLSS Preset E (2025+ DLSS SDK) which has improved anti-ghosting.
- FSR 3.1+ has improved motion vector handling — update to latest mod version.
- Particle effects and rain sometimes ghost — common limitation; no perfect fix.

### Texture Quality and Upscaling

Upscaling at 67% native resolution means your textures are rendered at 67% native. Implications:
- **2K textures become visually equivalent to ~1.3K** at Quality mode on a 1440p display.
- If texture quality is your priority, prefer DLAA (native res) and accept the GPU cost.
- Alternatively: run 4K textures + DLSS Quality to "net" approximately 2.6K effective texture resolution at 1440p.

---

## 7. Complete Recommended Graphics Stack (2026)

For a modern high-fidelity setup:

```
1. Install Addictol (Nexus #84214) — stability foundation
2. Install High FPS Physics Fix 0.8.13+ (Nexus #44798)
3. Install Community Shaders — GGX specular, SSGI, terrain parallax
4. Install ENB binaries (enbdev.com) + ENB preset (NAC X, EMV, or Rudy)
   → Disable ENB TAA; let DLSS/FSR handle anti-aliasing
5. Install PureDark DLSS (NVIDIA) or FSR 3 mod (any GPU)
   → Set mode based on GPU (Quality for RTX 3060+, Balanced for older)
6. Configure Community Shaders SSGI (Intensity 0.35, Samples 6)
7. Install texture overhaul (Vivid Fallout 2025, PhyOp, or Luxor's HD)
   → Use CS-aware versions with correct _s.dds PBR channels
8. Generate LOD with xLODGen + DynDOLOD
9. Run BethINI Pie: set bVolumetricLighting=0, bFloatPointRenderTarget=1
```

With this stack on an RTX 3060 at 1440p DLSS Quality:
- **Before**: ~35–45 FPS in dense areas (Boston, settlements)
- **After**: ~70–90 FPS in the same areas

---

## Troubleshooting

### "DLSS menu doesn't appear in pause menu"
- Verify F4SE is loaded (console: `GetF4SEVersion()` should return a version number).
- Check `Data\F4SE\Plugins\` for the DLSS plugin DLL and its companion files.
- Run CLASSIC (Nexus #56255) to check for plugin load failures.

### "FSR ghosting is severe"
- Update the FSR mod to the latest version (FSR 3.1 has better motion vectors).
- Ensure High FPS Physics Fix is correctly set with `fHavokSpeed=60`.
- Reduce FSR Quality to Balanced if ghosting persists (wider reprojection window helps).

### "Frame Generation causes black screen or crash"
- Frame generation requires the game to render at a stable baseline FPS above 45. If FPS dips below ~45, FG can cause stutters or CTD.
- Disable frame generation for heavy interior cells or during large battles.
- Check that `iFPSClamp=0` is set in Custom.ini — a hard FPS cap conflicts with FG.

### "DLSS looks blurry / worse than vanilla TAA"
- You may have DLSS running in Performance mode (33–50% of native). Switch to Quality mode (67%).
- Enable the built-in sharpening in PureDark's DLSS menu.
- Check that ENB's edge AA is disabled to avoid double anti-aliasing.

---

*Last updated: May 2026. DLSS version: 3.7.x SDK. FSR version: 3.1.x. Requires F4SE 0.7.7 (1.11.x).*
