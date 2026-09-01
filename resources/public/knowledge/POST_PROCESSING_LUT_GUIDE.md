# Post-Processing, LUT & Color Grading Guide for Fallout 4 Mods (2026)

Color grading and post-processing are the "grade" that separates a mod that renders correctly from one that looks cinematic. This guide covers LUT injection via ENB, ImageSpaceAdapter per-cell/weather color correction, bokeh depth of field, film grain calibration, and chromatic aberration.

---

## 1. LUT (Look-Up Table) — The Master Color Grade

A LUT is a 3D color transformation table that remaps every RGB value in the final image to a new color. It is the single most powerful post-processing tool available — it defines the overall "film stock" look of your mod.

### LUT Types Used in FO4 ENB

**Neutral LUT (identity)**: the unmodified starting point. All values pass through unchanged. Always start here.

**Color graded LUT**: maps input colors to your cinematic target. Common grading goals for FO4:
- **Gritty/post-apocalyptic**: shift midtones toward yellow-green, reduce saturation 15%, lift blacks slightly (bleach bypass look)
- **Cinematic/moody**: strong teal shadows, warm highlights (orange-teal split)
- **Clean/hopeful**: neutral shadows, slight warm highlights, full saturation
- **Harsh/radioactive Glowing Sea**: strong green push, crushed blacks, harsh contrast

### Creating a LUT in Photoshop or DaVinci Resolve

**Photoshop workflow:**
1. Open the **neutral LUT** (download from ENB preset tools, typically `neutral_lut.png` — a 512×512 or 1024×1024 color grid)
2. Apply your color grading adjustments:
   - Curves (RGB + individual channel)
   - Hue/Saturation (selective color by range)
   - Color Balance (shadows/midtones/highlights)
   - Vibrance (more natural than Saturation)
3. **Do NOT apply any luminance-changing filters** before exporting — LUTs encode color transforms, not exposure changes (use ENB tone mapping for exposure)
4. Export as PNG (same dimensions as input)

**DaVinci Resolve workflow (recommended for precise control):**
1. Import a 1-second clip from a neutral FO4 screenshot or video
2. Grade using Color Wheels, Curves, Hue-vs-Sat, Color Warper
3. Export: File → Export LUT → `.cube` format (33-point or 65-point)
4. Convert `.cube` to ENB format using ENBConvert tool or use directly if your ENB supports `.cube`

### ENB LUT Integration

In `enbseries.ini`:
```ini
[COLORGRADING]
bColorGradingEnable=true
FileLUT=lut_yourgrade.png       ; path relative to Data\ folder
LUTSize=1024                    ; 512 or 1024 (match your LUT texture dimensions)
LUTStrength=1.0                 ; 0.0 = no effect, 1.0 = full grade, 0.7 = subtle blend
```

Place LUT texture in: `Data\enbseries\lut_yourgrade.png`

### Per-Weather LUT via ENB Extender

ENB Extender allows per-weather LUT swaps:

In `WeatherSpecific\[WeatherEditorID].ini`:
```ini
[ColorGrading]
FileLUT=enbseries\luts\weather_storm.png   ; stormy desaturated grade
LUTStrength=0.9
```

This means bright sunny days use a warm vibrant LUT, radiation storms switch to a sickly desaturated LUT — all automatically.

### Per-Cell/Interior LUT via Papyrus

```papyrus
; Switch LUT when entering a specific cell (Vault interior)
Scriptname VaultLUTController extends ObjectReference

String Property LUTPath = "luts\\vault_blue_cold.png" Auto

Event OnTriggerEnter(ObjectReference triggerRef)
    ; ENB Extender exposes SetLUTPath native (if installed)
    ; Or: use ImageSpaceAdapter for vanilla-compatible approach
    ImageSpaceModifier.ApplyImod(Game.GetForm(0x[IMOD_FormID]) as ImageSpaceModifier)
EndEvent
```

---

## 2. ImageSpaceAdapter (IMOD) — Color Grading Without ENB

`ImageSpaceModifier` (IMOD) records are vanilla FO4's native color grading system. They work without ENB and can be triggered by Papyrus, quests, or cell transitions.

### IMOD Record Fields (xEdit)

```
IMOD record:
  ENAM - Effect duration (seconds; 0 = instant snap, 3.0 = gradual transition)
  
  DATA - Image Space Adapter Data:
    HDR:
      fEyeAdaptSpeed        ; how fast exposure adapts (0.1 = slow, 3.0 = fast)
      fBloom                ; bloom intensity (0.0–3.0; 1.0 = vanilla)
      fBloomThreshold       ; luminance cutoff before bloom starts
      fSkyScale             ; sky brightness multiplier
      
    Cinematic:
      fSaturation           ; 0.0 = greyscale, 1.0 = normal, 1.5 = oversaturated
      fBrightness           ; 0.5 = dark, 1.0 = normal, 1.5 = bright
      fContrast             ; 0.5 = flat, 1.0 = normal, 1.5 = crunched
      fTintR/G/B            ; color tint multipliers (1.0,1.0,1.0 = neutral)
      fTintA                ; tint strength (0.0 = no tint, 1.0 = full tint)
      
    Depth of Field:
      fStrength             ; DoF blur intensity
      fDistance             ; focal distance (game units)
      fRange                ; depth of field range
      bUnknown              ; use this for bokeh effect flag
```

### Applying IMOD per Cell in Papyrus

```papyrus
; Interior IMOD application script
Scriptname CellColorGrade extends Quest

ImageSpaceModifier Property IMODVaultBlue Auto
ImageSpaceModifier Property IMODExteriorWarm Auto

Event OnInit()
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
EndEvent

Event OnLocationChange(ObjectReference akSender, Location akOldLoc, Location akNewLoc)
    If (Game.GetPlayer().GetParentCell().IsInterior())
        IMODExteriorWarm.Remove()
        IMODVaultBlue.Apply()
    Else
        IMODVaultBlue.Remove()
        IMODExteriorWarm.Apply()
    EndIf
EndEvent
```

### Weather-Linked IMOD (via WTHR record)

In the WTHR record, the `Imagespace` field directly points to an ImageSpace record (`IMGS`). The `IMGS` record defines HDR + bloom + desaturation for that weather type. This is the vanilla approach and compatible with all setups.

---

## 3. Depth of Field (DoF)

### Vanilla FoF vs ENB Bokeh DoF

**Vanilla DoF**: gaussian blur on far objects — fast but uniform blur, no bokeh shape, no near-field blur.

**ENB Bokeh DoF**: physically-based depth of field with:
- Hexagonal/circular aperture bokeh shape
- Near-field blur (objects between camera and focus point also blur)
- Continuous focus follow (focus tracks center screen depth)

### ENB DoF Configuration (`enbdof.fx` or `enbseries.ini [DOF]`)

```ini
[DOF]
bDoFEnable=true
bDoFNearBlurEnable=true         ; near-field blur (objects too close)
bDoFDynamicFocus=true           ; auto-focus on center pixel depth

fDoFBokehShape=1.0              ; 0.0=circle, 1.0=hexagon, 0.5=octagon
fDoFFocalLength=50.0            ; simulated lens focal length (mm). 50=natural, 85=portrait
fDoFFStop=2.8                   ; aperture f-stop. Lower = more blur, shallower DoF
fDoFNearFadeBegin=30.0          ; near blur begins at this distance (game units)
fDoFNearFadeEnd=80.0            ; near blur at full strength at this distance
fDoFFarFadeBegin=3000.0         ; far blur begins
fDoFFarFadeEnd=8000.0           ; far blur at maximum

fDoFBlurStrength=0.4            ; overall bokeh kernel size (0.1=subtle, 1.0=extreme)
fDoFBokehBrightBoost=1.5        ; boost bright specular highlights in bokeh = lens flare-like bokeh circles
```

### When to Use DoF

- **Cinematic cutscenes** (triggered via `ForcedPerspective`): strong DoF for drama
- **Normal gameplay**: subtle DoF only (`fDoFFStop=5.6`, `fDoFBlurStrength=0.15`) — strong DoF in gameplay hurts readability
- **Dialogue scenes**: medium DoF (`fDoFFStop=2.8`) to isolate NPC face from background

### Per-Cell IMOD DoF Trigger

For specific interior cells (close quarters), trigger a shallow DoF IMOD to make the space feel intimate:
```
IMOD → Depth of Field:
  fStrength = 0.4
  fDistance = 800      ; focus at NPC conversation distance
  fRange = 300         ; very shallow range — background quickly blurs
```

---

## 4. Film Grain

Film grain adds organic texture noise that disguises compression artifacts, dithering, and makes the image feel tactile rather than digital.

### ENB Film Grain (`enbseries.ini`)

```ini
[FILMGRAIN]
bFilmGrainEnable=true
fFilmGrainAmount=0.08           ; 0.02=barely visible, 0.12=gritty film
fFilmGrainBrightness=0.5        ; grain more visible in bright areas (0.5) or dark (0.0=uniform)
fFilmGrainContrast=1.0          ; contrast of grain particles
fFilmGrainFrameDelta=1          ; grain changes every N frames (1=every frame=most organic)
iFilmGrainSeed=42               ; random seed (doesn't affect look much)
```

### Calibration Guidelines

| Mod tone | Grain amount | Brightness | Notes |
|---|---|---|---|
| Gritty post-apocalyptic | 0.10–0.14 | 0.3 | Visible grain everywhere, lean into the roughness |
| Cinematic drama | 0.05–0.08 | 0.5 | Medium grain, more in shadows |
| Clean/bright | 0.02–0.04 | 0.7 | Barely perceptible, mostly in shadows |
| Night terror | 0.12–0.18 | 0.1 | Heavy grain in darkness — mimics high ISO photography |

### Per-Weather Grain Intensity via ENB Extender

```ini
; In WeatherSpecific\ClearDay.ini
[FilmGrain]
fFilmGrainAmount=0.04    ; less grain in bright daylight

; In WeatherSpecific\RadiationStorm.ini
[FilmGrain]
fFilmGrainAmount=0.15    ; heavy grain during storms = visual distortion
```

---

## 5. Chromatic Aberration

Chromatic aberration (CA) simulates the color fringing at image edges caused by imperfect lenses. Subtle CA adds photographic realism; too much is distracting.

### ENB Chromatic Aberration (`enbseries.ini`)

```ini
[CHROMATIC_ABERRATION]
bChromaticAberrationEnable=true
fChromaticAberrationStrength=0.003    ; 0.001=invisible, 0.005=subtle, 0.015=severe
fChromaticAberrationFocus=0.5         ; 0.0=CA at center, 1.0=CA only at edges
bChromaticAberrationRadial=true       ; radial pattern (realistic lens) vs uniform
```

**Realistic calibration**: real photographic CA is strongest at corners and near-zero at center. Use `fChromaticAberrationFocus=0.8` (strong edge bias) + `fChromaticAberrationStrength=0.002–0.004`.

### When to Disable CA

CA should be **off by default** in any action-focused mod — it introduces visual noise that affects targeting and reading enemy silhouettes. Add a toggle option in your MCM:

```papyrus
; MCM toggle for CA
Event OnSliderAcceptST()
    Float value = GetSliderValue("CAStrength")
    ; Store and apply via ENB Extender SetParamFloat native
EndEvent
```

---

## 6. Vignette

Vignette darkens the screen edges, focusing player attention on the center and mimicking the light falloff of real camera lenses.

```ini
[VIGNETTE]
bVignetteEnable=true
fVignetteRadius=0.65          ; 0.5=strong (dark corners), 0.8=subtle
fVignetteStrength=0.35        ; how dark the corners get
fVignetteSmoothness=0.4       ; 0.0=hard edge, 1.0=very gradual fade
```

For interiors: increase vignette to `fVignetteStrength=0.5` for claustrophobic feel. For open world: reduce to `0.15–0.25` to not block peripheral vision.

---

## 7. Tone Mapping & Exposure

### ENB Tone Mapping Options

```ini
[TONEMAPPING]
iToneMappingMode=3              ; 0=linear, 1=Reinhard, 2=Filmic, 3=ACES (best for realism)
fExposure=1.0                   ; global exposure multiplier
fEyeAdaptationMinimum=0.2       ; darkest the eye adapts to (black crushing)
fEyeAdaptationMaximum=4.0       ; brightest the eye adapts to (white handling)
fEyeAdaptationSpeed=1.5         ; speed of exposure adaptation

; ACES-specific controls (iToneMappingMode=3)
fACESSlope=0.88                 ; shoulder of the S-curve (controls highlight rolloff)
fACESToe=0.55                   ; toe of the S-curve (controls shadow lift)
fACESBlack=0.0                  ; black point (0.0=pure black)
fACESWhite=11.2                 ; white point (11.2=standard cinematic)
```

### ACES vs Reinhard vs Filmic

| Mode | Characteristics | Best for |
|---|---|---|
| Linear | No tonemapping — HDR values clip harshly | Developer debug only |
| Reinhard | Smooth rolloff but colors desaturate in highlights | Older/simpler presets |
| Filmic | S-curve, good shadow detail, slight color shift | Balanced gameplay |
| ACES | Photographic, preserves hue in highlights, best for PBR | Max realism |

### EMV Preset ACES Configuration

EMV (2026 premium preset) uses ACES with these refined values:
```ini
fACESSlope=0.91
fACESToe=0.58
fExposure=0.95                  ; slightly underexposed = more dramatic/cinematic
fEyeAdaptationMinimum=0.15      ; darker shadows in dark interiors
fEyeAdaptationMaximum=3.5       ; caps bright outdoor to prevent washing out
```

---

## 8. Bloom & Lens Flare

### Bloom Calibration

**Physically correct bloom**: only sources bright enough to exceed sensor capacity should bloom. In FO4 PBR terms: emittanceMult > 1.5 on light sources → visible bloom.

```ini
[BLOOM]
bBloomEnable=true
fBloomThreshold=0.85            ; luminance cutoff (0.0=everything blooms, 1.0=only very bright)
fBloomAmount=0.3                ; bloom contribution to final image
fBloomSaturation=0.9            ; slightly desaturated bloom = photographic
fBloomRadius=5.0                ; blur radius of bloom glow (game units)
fBloomGhostIntensity=0.1        ; lens ghost intensity (internal reflections)
```

For neon signs, terminal screens, bioluminescent creatures:
- `emittanceMult=3.0–8.0` on the emissive BGSM → will exceed bloom threshold → natural bloom halo
- Do not manually add bloom meshes — let ENB handle it via threshold

### Lens Flare

```ini
[LENSFLARE]
bLensFlaresEnable=true
fLensFlaresIntensity=0.4        ; 0.0=off, 1.0=intense Hollywood flares
fLensFlaresSize=1.0             ; scale of flare elements
bLensFlaresOcclusionEnable=true ; flares blocked by geometry (realistic)
```

---

## 9. Complete Post-Processing Stack Load Order

ENB applies post-processing in this order (important to understand the pipeline):

```
1. Engine renders scene to HDR buffer
2. ENB SSAO injection (if enabled)
3. ENB SSGI injection (if enabled)
4. ENB Skylighting (ambient cube)
5. → Depth of Field
6. → Bloom pass
7. → ACES / Tone mapping (HDR → LDR)
8. → LUT color grade
9. → Film grain
10. → Chromatic aberration
11. → Vignette
12. → Lens flare
13. → DLSS/DLAA upscaling (if enabled)
14. Final output to display
```

Understanding this order prevents incorrect calibration — e.g., your LUT should be calibrated on tone-mapped (LDR) output, not on HDR values.

---

## 10. Quick Checklist — Maximum Color Grading Realism

- [ ] ACES tone mapping enabled (`iToneMappingMode=3`) + EMV parameters
- [ ] Custom LUT applied (`FileLUT=`, calibrated in Resolve or Photoshop)
- [ ] Per-weather LUT via ENB Extender (storms = desaturated, clear = vibrant)
- [ ] Film grain: `0.05–0.10` for gameplay, `0.12+` for horror/gritty tone
- [ ] Bloom threshold `0.80–0.90` — only genuinely bright sources bloom
- [ ] Bokeh DoF enabled but subtle during gameplay (`fDoFFStop=5.6`)
- [ ] CA enabled but subtle (`fChromaticAberrationStrength ≤ 0.004`, edge-only)
- [ ] Vignette calibrated per environment (stronger interior, subtler exterior)
- [ ] ImageSpaceModifier IMOD records created for unique cells/quest moments
