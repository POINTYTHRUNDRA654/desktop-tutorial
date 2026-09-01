# Water Rendering Guide for Fallout 4 Mods (2026)

Water is one of the most visually complex surfaces in FO4 — it reflects the sky, refracts objects below the surface, generates foam where it meets geometry, and creates caustics on the riverbed. This guide covers the complete water rendering pipeline: WATR records, custom water BGSM, reflection planes, caustics, puddles, and flood cell setup.

---

## 1. WATR Records — The Water Type Definition

Every water surface in FO4 references a `WATR` (Water Type) record that defines its material behavior.

### WATR Record Fields (xEdit)

```
WATR record fields:
  ANAM - Material (path to .bgsm or water material definition)
  FNAM - Data block:
    fWindVelocity           ; wave speed (0.0–1.0)
    fWindAngle              ; wind direction (degrees)
    fWaveAmplitude          ; wave height (0.0=glass flat, 0.5=choppy)
    fWaveFrequency          ; wave density/spacing
    fSunPower               ; specular highlight intensity of sun reflection
    fReflectivity           ; 0.0=no reflections, 1.0=mirror surface
    fFresnelAmount          ; Fresnel effect strength (look-at-water-flat = less reflect)
    fScrollVelocityX/Y      ; normal map scroll speed
    fFogAmount              ; underwater fog density
    fFogNear/Far            ; underwater visibility range
    fDepthAmount            ; darkening with depth (0.0=uniform, 1.0=deep dark)
    fShallowColor R/G/B/A   ; color at water edge
    fDeepColor R/G/B/A      ; color in deep water
    fBlendRadius            ; distance over which shallow→deep blends
    fRainSimulator*         ; rain ripple parameters (frequency, damping, radius)
    fDisplacementSim*       ; wake/displacement simulation settings
  NAM0 - Noise texture 1 (scrolling normal map)
  NAM1 - Noise texture 2 (second scroll layer, different speed)
  NAM2 - Noise texture 3 (micro-detail, fast scroll)
  GNAM - Damage (radiation/fire per second for touching this water type)
  TNAM - Opacity (0–255)
  ANAM - Open/underwater audio set
  SNAM - Spell applied on contact (poison, radiation, etc.)
```

### Common Water Type Presets

| Type | fWaveAmplitude | fReflectivity | fShallowColor | fDeepColor | Use case |
|---|---|---|---|---|---|
| `DefaultWater` | 0.08 | 0.7 | 0.4,0.6,0.5,0.9 | 0.0,0.1,0.15,1.0 | Rivers, ponds |
| `IrradWater` | 0.12 | 0.5 | 0.2,0.35,0.1,0.9 | 0.05,0.1,0.0,1.0 | Glowing Sea pools |
| `MurkyWater` | 0.05 | 0.3 | 0.25,0.22,0.15,0.95 | 0.1,0.09,0.05,1.0 | Swamps, sewers |
| `ShallowPuddle` | 0.01 | 0.85 | 0.3,0.35,0.3,0.6 | same | Puddles, rain |
| `VaultFlood` | 0.15 | 0.65 | 0.2,0.3,0.35,0.95 | 0.05,0.1,0.15,1.0 | Flooded vaults |

### Creating a Custom Water Type

1. In xEdit, copy an existing WATR record as override into your plugin
2. Adjust color channels for desired look:
   - Swamp: push shallow color toward brown-green, reduce reflectivity to 0.3
   - Ocean Far Harbor: cool blue-grey, higher wave amplitude 0.15–0.20
   - Blood pool (horror mod): shallow R=0.6 G=0.1 B=0.1, fFogAmount=0.9
3. Assign your custom WATR to the water plane REFR in your cell

---

## 2. Water BGSM / Shader Setup

Water material is defined via a specialized `BGSM` with `bWater=true`.

### Water BGSM File

```
; Data\materials\landscape\water\custom_water.bgsm
bShaderModel=true
bWater=true

; Noise textures (scrolling normal maps — critical for wave animation)
sTexture0=textures\water\noise01.dds      ; primary normal scroll
sTexture1=textures\water\noise02.dds      ; secondary normal scroll
sTexture2=textures\water\noise03.dds      ; tertiary micro-detail

; PBR-style water settings (with Community Shaders)
bPBRCompatible=true
fRoughness=0.05          ; near-mirror at 0.0 → slightly rough at 0.1
fSpecularPower=120.0     ; tight specular highlight for sun on water

; Foam settings
bFoamEnabled=true
sFoamTexture=textures\water\foam01.dds
fFoamStrength=0.6        ; foam opacity where water meets shore geometry
fFoamDistance=80.0       ; distance from shore where foam appears
```

### Normal Map Scrolling for Waves

Three-layer normal map scrolling creates convincing wave complexity:
- Layer 0: large-scale ocean swell pattern — slow X scroll (0.008), near-zero Y
- Layer 1: medium chop — faster, diagonal scroll (0.018 X, 0.012 Y)
- Layer 2: micro-ripple — fast scroll (0.035), opposite direction

All three normal maps are combined in the water shader. Each should be `_n.dds` format (BC5 compressed, DirectX convention green=up).

---

## 3. Reflection Planes

FO4 water uses **planar reflections** — the engine renders the scene a second time from a mirrored camera below the water surface.

### Reflection Quality Settings (`Fallout4.ini`)

```ini
[Water]
bReflectSky=1               ; reflect sky/clouds (always enable)
bReflectLODObjects=1        ; reflect LOD-level objects (medium cost)
bReflectObjects=1           ; reflect full-detail objects near water
bReflectActors=0            ; reflect NPCs/player (high cost — disable for performance)
iWaterReflectHeight=512     ; reflection render target height (256=low, 512=med, 1024=high)
iWaterReflectWidth=512      ; reflection render target width

bForceHighDetailReflections=0  ; force full quality regardless of distance
```

### ENB Water Reflections

```ini
[WATER]
bWaterReflection=true
bWaterRefraction=true       ; underwater refraction (bends light at surface)
fWaterReflectionStrength=1.0
fWaterSpecularIntensity=1.2   ; sun/light specular on surface
fWaterFresnelBias=0.02        ; Fresnel offset (lower = more reflective at shallow angles)
fWaterFresnelPower=5.0        ; Fresnel falloff speed
bWaterSSR=true               ; Screen-Space Reflections for water (replaces planar for off-screen objects)
fWaterSSRStrength=0.8        ; SSR contribution
```

**SSR (Screen-Space Reflections) for water**: more accurate than planar for nearby objects, but only reflects what's on screen. Use both: planar for sky (always visible), SSR for nearby geometry/actors.

---

## 4. Water Caustics

Caustics are the light patterns projected on the riverbed as sunlight bends through moving water. Vanilla FO4 has no dynamic caustics — they must be added via ENB or a caustic mesh.

### ENB Caustics (Post-Process)

In `enbeffect.fx`, caustics are simulated as a screen-space effect on surfaces below the water plane:

```hlsl
// Simplified ENB caustics injection
float waterDepth = ...; // depth below water surface
float causticMask = saturate(1.0 - waterDepth / fCausticsMaxDepth);

// Animated caustic pattern from noise texture
float2 causticUV = worldPos.xy * fCausticsScale + GameTime * fCausticsSpeed;
float causticIntensity = tex2D(CausticsTex, causticUV).r * causticMask;
color.rgb += causticIntensity * fCausticsStrength * SunColor;
```

In `enbseries.ini` user variables:
```ini
fCausticsScale=0.003
fCausticsSpeed=0.4
fCausticsStrength=0.35
fCausticsMaxDepth=200.0
```

### Caustic Mesh (Static Alternative)

For custom interior flood cells without ENB:
1. Create a plane mesh at the water surface level
2. Apply a scrolling projector material (BGEM with `bProjected=true`)
3. The caustic texture scrolls/cycles on surfaces below
4. Lower performance cost than dynamic shader caustics but less realistic

---

## 5. Puddles & Rain Interaction

### Puddle Water Planes

Small puddles use the same WATR-referenced water plane at micro scale. Key settings for realistic puddles:

```
WATR for puddles:
  fWaveAmplitude = 0.005 to 0.02 (barely any wave — puddles are sheltered from wind)
  fReflectivity = 0.85–0.95 (puddles are nearly perfect mirrors)
  fShallowColor = slightly warm grey with high alpha (0.35,0.33,0.30,0.5)
  fDepthAmount = 0.0 (puddles have no visible depth — they're millimeters deep)
  fFogAmount = 0.0 (no underwater fog in a puddle)
```

### Dynamic Rain Ripples (ENB / Water Displacement Simulation)

FO4's `WATR` record includes `fRainSimulatorStrength`, `fRainSimulatorFrequency`, and `fRainSimulatorDamping` fields that activate the displacement simulation when precipitation is active.

```
fRainSimulatorStrength = 0.6    ; ripple height per raindrop
fRainSimulatorFrequency = 70    ; drops per second per unit area
fRainSimulatorDamping = 0.6     ; how quickly ripple fades (0.0=forever, 1.0=instant)
fRainSimulatorRadius = 16.0     ; radius of ripple pattern per drop
```

These are automatically active during rain WTHR records that have `bRainSimulator=true`.

---

## 6. Flood Cell Setup

Flooded interior cells (post-apocalyptic vault floods, sewer systems) require:

### Step 1 — Water Plane Placement in CK

1. Create a static reference of a flat plane mesh (or use the engine water plane marker)
2. Place at flood height
3. Assign WATR type (e.g., `VaultFloodWater`)
4. The engine automatically renders everything below this plane level as underwater

### Step 2 — Underwater Fog

Cell → Lighting tab:
```
Underwater: bHasWater = true (checkbox)
Water Type: [your WATR record]
Water Height: [z-coordinate of flood level]
```

The engine uses `fFogNear` and `fFogFar` from the WATR record for underwater visibility.

### Step 3 — Navmesh & Wading

For NPCs to wade through flood water:
1. Navmesh the flooded area with the normal navmesh tool
2. Flag triangles with `Water` property (`Edit → Mark As: Water Navmesh Preferred`)
3. NPC AI packages automatically trigger wading animation when pathing through water triangles

### Step 4 — Underwater Ambient Sound

Assign an `ADIA` (Acoustic Space) record with underwater ambience to the cell. The engine transitions to it based on the player's z-position vs water height.

---

## 7. Ocean & Large Water Body Tips

For custom worldspaces with oceans (Far Harbor style):

```
fWaveAmplitude = 0.15–0.25 (much more aggressive than rivers)
fWindVelocity = 0.7
fScrollVelocityX = 0.015, Y = 0.008 (diagonal swell direction)
fFogAmount = 0.6 (ocean water has significant internal fog)
fDeepColor = 0.0, 0.08, 0.12, 1.0 (deep oceanic blue)
fShallowColor = 0.1, 0.25, 0.25, 0.85 (lighter coastal water)
```

For foam at coastlines: place static foam overlay meshes at the shore geometry or use a projected material on the beach sand BGSM triggered by proximity to water height.

---

## 8. Performance Notes

- Water reflection render pass is the most expensive water cost — each body of water = 1 full scene render from below. Cap with `iWaterReflectHeight=512` or lower.
- Multiple overlapping water planes in the same cell multiply reflection passes — merge into single water plane wherever possible.
- `bReflectActors=0` saves 15–25% water render time in combat areas with many actors.
- LOD water (distant) uses a simplified flat plane with no reflections — make sure your custom water has an LOD variant in the `Data\meshes\water\` path.
