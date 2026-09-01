# Weather, Sky & Volumetric Lighting Guide for Fallout 4 Mods (2026)

Custom weather and volumetric lighting define the entire mood of a scene. This guide covers creating WTHR records, cloud layers, precipitation particles, volumetric fog, and godray calibration — the systems that separate flat-looking mods from cinematic ones.

---

## 1. Weather Records (WTHR) — The Foundation

Every visual condition in FO4 is controlled by a `WTHR` (Weather) record. Creating a custom WTHR is the entry point for any atmosphere overhaul.

### WTHR Record Structure (xEdit)

```
WTHR record fields (key ones):
  NAM0 - Cloud Layer 0 texture path  (e.g., textures\sky\clouds\cloudlayer00.dds)
  NAM1 - Cloud Layer 1 texture path
  ...up to NAM9 for 10 cloud layers total
  
  DNAM - Data:
    fWindSpeed             ; 0.0–1.0 apparent wind speed for cloud scrolling
    fTransDelta            ; transition speed to this weather (0.0 fast, 1.0 very slow)
    fSunGlare              ; sun glare intensity (0.0–1.0)
    fSunDamage             ; radiation damage multiplier in this weather
    fPrecipitationBegin    ; at what % through transition precipitation starts
    fPrecipitationEnd      ; at what % precipitation ends
    fThunder Begin/End     ; thunder timing range
    fWindDirection         ; 0.0–360.0 degrees
    fWindDirectionRange    ; ±spread around fWindDirection

  FNAM - Fog Distance Near/Far/Power (daytime)
  GNAM - Fog Distance Near/Far/Power (nighttime)
  
  SNAM - Precipitation particle system (e.g., Rain01, Snow01, AshStorm01)
  
  NAM1/Colors - 17 color sets × 8 time-of-day keys:
    SkyUpper, FogNear, Ambient, Sunlight, Sun, Stars, SkyLower, Horizon,
    EffectLighting, CloudLODDiffuse, CloudLODSpecular, SkyStatics,
    WaterMultiplier, SunSpecular, Precipitation, OblivionFog, Unknown
```

### Creating a Custom Weather in CK

1. **Object Window → Weather** → right-click → New
2. Assign cloud layer textures (up to 10 layers, each with X/Y speed, alpha, color tint)
3. Set fog near/far distances — these are critical for atmosphere:
   - Clear sunny day: Near=0, Far=150000, Power=1.5
   - Heavy overcast: Near=5000, Far=80000, Power=2.0
   - Radiation storm: Near=1000, Far=40000, Power=3.0
4. Set precipitation particle effect
5. Set color keys for each of 8 time-of-day phases (sunrise/noon/sunset/night etc.)
6. **Thunder sounds**: assign in `Sound → Thunder` tab — use multiple variants for realism
7. Connect to a **Climate** record (`CLMT`) which controls which weathers appear and at what probability

### Weather Transition Formula

```
At any moment: blendWeight = transitionProgress (0.0→1.0)
Each rendering property lerps between previous WTHR and new WTHR values.
fTransDelta controls how fast transitionProgress advances per game-hour.
Fast = 0.5+ (storm rolling in quickly), Slow = 0.05 (gradual dawn)
```

---

## 2. Cloud Layers

Each of 10 cloud layers has:
- A texture (DDS, typically 2K seamless, BC3 compressed)
- **X/Y scroll speed** — different speeds per layer create parallax depth
- **Alpha** — opacity of the layer
- **Color tint** at each time-of-day

### Cloud Texture Guidelines

| Layer | Purpose | Typical resolution | X/Y speed |
|---|---|---|---|
| Layer 0 | Base overcast cover | 2K seamless | 0.01/0.005 (slow drift) |
| Layer 1 | Mid-altitude cumulus | 2K seamless | 0.025/0.015 |
| Layer 2 | High cirrus wisps | 1K seamless | 0.05/0.03 |
| Layer 3–9 | Storm cells / ash clouds | 1K–2K | Varies |

### Creating Seamless Cloud Textures in Photoshop/Krita

1. Start with a high-resolution photo or procedural cloud render
2. Apply **Offset filter** (half width/height) to see seams
3. Clone/heal the seams until seamless
4. Adjust levels: clouds should have black background (alpha = 0 in the black regions)
5. Export as DDS BC3 (BC3 preserves cloud softness better than BC7 for scrolling textures)
6. Store in `textures\sky\clouds\` using your mod prefix

---

## 3. Precipitation Particle Systems

Precipitation is attached via the `SNAM` field pointing to a `RFCT` (Reference Effect) or directly to a particle system NIF.

### Vanilla Precipitation NIF Paths

```
meshes\effects\weather\rain01.nif          ; standard rain
meshes\effects\weather\heavyrain01.nif     ; heavy rain
meshes\effects\weather\snow01.nif          ; snow
meshes\effects\weather\ashstorm01.nif      ; ash storm (Far Harbor pattern)
```

### Custom Rain — Splash Decals

Splash decals on ground surfaces during rain require a `BGSMaterialObject` with rain-responsive animation. Key settings in the NIF:

```
BSDecalNode (on ground impact point):
  Name: "RainSplash"
  BSDecalData:
    fLifetime = 0.8        ; seconds splash is visible
    fAlphaDecay = 0.3      ; fade-out rate
    fMinSize = 4.0
    fMaxSize = 12.0
```

The precipitation particle emitter should point downward at 270° with:
- Gravity = 9.8 (realistic fall speed)
- Initial velocity = 800–1200 units/s (tuned to player's perceived field of view)
- Spawn rate scaled to weather intensity

### Snow Accumulation

Snow accumulation on surfaces (static props/world) is a texture blend, not geometry. Apply via:
1. Multi-layer terrain BGSM with snow layer controlled by `WeatherBlend` parameter
2. ENB weather variable (`Weather1WeatherBlend`) to drive blend weight in custom shader

---

## 4. Volumetric Fog — xFOG & CK Fog Settings

### CK Cell-Level Fog Settings

Every cell has fog settings in the **World → Lighting** tab:

```
Fog Near = distance where fog begins (e.g., 0 = starts at player)
Fog Far  = distance where fog reaches maximum density (e.g., 100000 for exterior)
Fog Power = falloff curve (1.0 = linear; 2.0+ = exponential; more dramatic)
Fog Color = tinted towards ambient light color for believability
```

Guidelines by environment:
| Environment | Near | Far | Power | Color |
|---|---|---|---|---|
| Clear Commonwealth exterior | 0 | 180000 | 1.5 | Warm grey/brown |
| Glowing Sea | 0 | 30000 | 2.5 | Green-grey |
| Vault interior | 5000 | 60000 | 2.0 | Blue-grey |
| Far Harbor | 0 | 50000 | 1.8 | Desaturated cyan |
| Pre-war home interior | 20000 | 80000 | 1.5 | Warm neutral |

### xFOG Mod (Engine-Level Volumetric Fog)

**xFOG** injects true volumetric fog into the FO4 engine, replacing the flat distance-falloff with light-scattering fog volumes. Key config (`xFOG.ini`):

```ini
[Volumetric]
bEnabled=1
fScatterCoefficient=0.003      ; how much light scatters per unit. Higher = denser fog
fAbsorptionCoefficient=0.001   ; how much light is absorbed (darkens fog depth)
fPhaseG=0.4                    ; Henyey-Greenstein phase parameter (0=isotropic, 0.9=forward)
fHeightFalloff=0.0003          ; fog density falloff per vertical unit (ground = dense)
fBaseHeight=0.0                ; z-height where base density starts

[InteriorOverride]
fInteriorScatter=0.006         ; denser fog in interiors for claustrophobic feel
bSeparateInteriorSettings=1

[Performance]
iVolumeSamples=64              ; raymarching steps. 32=fast/low quality, 128=high/expensive
fMaxDistance=15000.0           ; max distance to raymarch fog
```

### ENB Fog Controls

In `enbseries.ini`, the `[FOG]` section supplements xFOG:

```ini
[FOG]
fFogNearMult=1.0               ; multiplier on CK fog near distance
fFogFarMult=1.0                ; multiplier on CK fog far distance  
fFogDensity=1.0                ; overall density scale
bFogColorFromSky=true          ; tint fog with sky/ambient color automatically
```

In custom ENB effect shader (`enbeffect.fx`), fog can be driven by weather blend:

```hlsl
// In your custom enbeffect.fx
float weatherFog = ENBParams01.x; // Weather1FogNear packed by ENB Extender
float fogBlend = saturate((linearDepth - fogNear) / (fogFar - fogNear));
color.rgb = lerp(color.rgb, FogColor.rgb, fogBlend * weatherFog);
```

---

## 5. Godrays / Volumetric Light Shafts

### Vanilla Godrays (Fallout4.ini)

```ini
[Imagespace]
bVolumetricLightingEnable=1
iVolumetricLightingQuality=2      ; 0=off, 1=low, 2=medium, 3=high
fVolumetricLightingIntensity=1.0
fVolumetricLightingDistanceMult=1.0
```

Higher quality increases the number of sample steps for light shaft rendering, reducing "banding" artifacts.

### ENB Sunrays (More Control)

In `enbseries.ini`:

```ini
[SUNRAYS]
bSunRaysEnable=true
fSunRaysBrightness=1.2         ; 0.5 = subtle, 2.0 = dramatic cinematic shafts
fSunRaysSaturation=0.9
fSunRaysIntensity=0.8          ; affects shaft length
```

In `enbsunsprite.fx` (ENB lens flare + godray shader): control shaft width, falloff profile, and scatter color per time-of-day.

### Per-Weather Godray Intensity

Using ENB Extender weather variables, you can modulate godray intensity dynamically:

```hlsl
// In enbeffect.fx — access current weather godray blend factor
float godrayScale = ENBWeatherParams.y; // set via ENB Extender weather variable "GodrayScale"
// Apply to sun shaft intensity
float shaftIntensity = fSunRaysIntensity * godrayScale;
```

Define per-weather ENB Extender variables in `WeatherSpecific\[WeatherEditorID].ini`:

```ini
[Params]
GodrayScale=0.8    ; for standard clear weather
; Set to 0.1 for overcast, 2.0 for dramatic storm-clearing beam
```

---

## 6. Aurora Effects (Far Harbor Style)

Aurora borealis-style effects use a combination of:
1. **Sky static mesh** — a dome with animated UV scroll shader
2. **BSEffectShaderProperty** with `SF1_EFFECT_LIGHTING` flag
3. `emittanceMult` driven by time-of-day condition via Papyrus or ENB

```papyrus
; Toggle aurora visibility based on time of day
Scriptname AuroraController extends ObjectReference

ObjectReference Property AuroraMesh Auto
Float Property NightEmittance = 3.5 Auto
Float Property DayEmittance = 0.0 Auto

Event OnInit()
    RegisterForUpdateGameTime(1.0)
EndEvent

Event OnUpdateGameTime()
    Float gameHour = Game.GetRealHoursPassed() as Float % 24.0
    Float intensity = 0.0
    If (gameHour < 6.0 || gameHour > 21.0)
        intensity = NightEmittance
    EndIf
    (AuroraMesh.GetBaseObject() as Static).SetEmittanceMult(intensity)
    RegisterForUpdateGameTime(0.5)
EndEvent
```

---

## 7. Radiation Storm Visuals

Far Harbor and Glowing Sea use radiation storms — a heavily post-processed weather type. Key settings:

```
In WTHR record:
  fSunDamage = 10.0              ; high radiation damage
  fSunGlare = 0.0                ; no direct sun
  Precipitation = AshStorm       ; particle effect
  Fog Near = 0, Far = 25000      ; heavy fog
  Power = 3.5                    ; exponential falloff (walls of greenish murk)
  
  Colors (Ambient) at all time slots:
    R=120 G=135 B=80             ; radioactive greenish-amber ambient
  Colors (FogNear):
    R=100 G=120 B=60             ; sickly fog tint
```

ENB Imagespace for radiation storms:
```ini
; In WeatherSpecific\RadiationStorm01.ini (ENB Extender)
[Imagespace]
fSaturation=0.6              ; desaturate scene
fContrast=1.2                ; slightly higher contrast for oppressive feel
fBrightness=0.85             ; darker
fTintR=1.15                  ; slight warm tint to boost green channel
```

---

## 8. Connecting Weather to Your Mod — Climate Records

A `CLMT` (Climate) record controls which weathers appear where and at what probability.

```
CLMT fields (xEdit):
  WLST - Weather List:
    Each entry: {WTHR formID} {probability 0–100} {global flag}
  FNAM - Sun texture
  GNAM - Sun glare texture  
  MODL - Moon phase textures
  TNAM - Timing:
    iRiseBegin  ; sunrise start (0–2880 in 10-minute units, 720=noon)
    iRiseEnd    ; sunrise end
    iSetBegin   ; sunset start
    iSetEnd     ; sunset end
    bVolatile   ; weather changes frequently if true
    bMoon       ; show moons if true
    iMoonPhase  ; 0–7
```

To make a custom worldspace use your weather: in CK, Cell Properties → World Data → Climate → assign your CLMT record.

---

## 9. Tools Reference

| Tool | Purpose |
|---|---|
| Creation Kit | Create/edit WTHR, CLMT records |
| xEdit | Batch-edit weather color keys, inspect cloud layer assignments |
| xFOG | Engine-level volumetric fog injection |
| ENB Extender | Per-weather shader variable injection |
| ENB Series | Godrays, fog multipliers, sky rendering |
| Photoshop / Krita | Cloud texture creation |
| NifSkope | Custom precipitation particle NIF editing |
| Buffout 4 | Diagnose weather transition crashes |
