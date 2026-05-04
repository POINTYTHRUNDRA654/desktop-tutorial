# Decal & Impact System Guide for Fallout 4 Mods (2026)

Decals — blood spatters, bullet holes, scorch marks, and footprints — are what make combat and exploration feel tactile. This guide covers BSDecalNode setup, IPDS (Impact Data Set) records, material-specific impact particles, decal fade and budget settings, and footprint systems.

---

## 1. BSDecalNode — How Decals Work in FO4

Decals in FO4 are spawned as projected textures on geometry surfaces via `BSDecalNode` — a NifSkope node type that projects a textured quad onto nearby surfaces.

### BSDecalNode Structure (NifSkope)

```
BSDecalNode (in effect NIF):
  Name: "Decal" (or "BloodDecal_01" etc.)
  
  BSDecalData block:
    fMinSize = 8.0               ; minimum decal radius (game units)
    fMaxSize = 24.0              ; maximum decal radius
    fDepth = 2.0                 ; how far the projection extends into the surface
    fShininess = 30.0            ; specular on decal surface
    fParallaxScale = 0.0         ; POM on decal (0=disabled, complex)
    fAlpha = 1.0                 ; starting opacity
    fAlphaDecay = 0.0            ; opacity fade per second (0=permanent)
                                 ; set > 0 for timed decal (0.15 = fades in ~7 seconds)
    fLifetime = 60.0             ; seconds before decal auto-removes (0=permanent)
    iMinWidth = 4
    iMaxWidth = 12
    bClipShadows = false
    bMergeFollowsBone = false
```

### Decal Material (BSEffectShaderProperty or BSLightingShaderProperty)

For blood/gore decals:
```
BSLightingShaderProperty on decal geometry:
  Shader Flags 1: SLSF1_DECAL | SLSF1_DYNAMIC_DECAL
  Shader Flags 2: SLSF2_ZBUFFER_WRITE = OFF (decals don't occlude other decals)
  
  Diffuse: textures\decals\blood_splat_01_d.dds   ; RGBA — A channel = decal shape mask
  Normal: textures\decals\blood_splat_01_n.dds
  fSpecularPower = 20.0   ; blood is wet = broad specular
  fSpecularMult = 0.8
```

For bullet holes:
```
SLSF1_DECAL | SLSF1_DYNAMIC_DECAL
fSpecularPower = 80.0     ; metal is tight specular
Diffuse: rgba with circular hole + blackened edge alpha mask
Normal: inset crater normal (white center = raised rim, dark center = sunken hole)
```

---

## 2. IPDS Records — Impact Data Sets

`IPDS` (Impact Data Set) records define what happens when a projectile, melee weapon, or explosion hits a specific material. Each IPDS contains a list of material-specific impact effects.

### IPDS Record Structure (xEdit)

```
IPDS record:
  DATA - Impact Data entries (one per material type):
    [Material keyword]  →  [IPCT Impact record]
    
    Example entries:
      BGSMaterialFlesh     → ImpactFlesh01
      BGSMaterialMetal     → ImpactMetal01
      BGSMaterialWood      → ImpactWood01
      BGSMaterialConcrete  → ImpactConcrete01
      BGSMaterialGlass     → ImpactGlass01
      BGSMaterialWater     → ImpactWater01
      (default/fallback)   → ImpactDefault01
```

### IPCT Record — Individual Impact Definition (xEdit)

```
IPCT (Impact) record:
  ENAM - Effect duration
  DNAM - Data:
    fEffectDuration        ; how long the impact effect lasts
    eOrientation           ; 0=surface normal, 1=projectile direction
    bAngleDependentDecal   ; decal angle matches impact angle (realistic)
    bNoDecalData           ; skip decal for this material (e.g., water)
  
  DODT - Decal Data:
    fMinWidth/MaxWidth     ; decal size range
    fMinHeight/MaxHeight
    fDepth                 ; projection depth
    fShininess
    fParallaxScale
    fAlpha
    eColor R/G/B           ; decal tint color (blood = dark red, scorch = black)
    bSubtexture            ; use random subtexture region
    eDecalMode             ; parallel/from center/angle
  
  SNAM - Sound (impact sound)
  NAM1 - Effect (EFSH — particle effect spawned on impact)
  NAM2 - No decal effect (alternate EFSH when bNoDecalData=true)
  DOLD - Decal art object (BSDecalNode NIF)
```

### Creating a Custom Impact Data Set

**Example: custom radioactive sludge surface**

1. Create new IPCT record: "ImpactRadSludge"
   - DODT: MinWidth=10, MaxWidth=18, Color R=0.3 G=0.5 B=0.1 (green tint), fAlpha=0.85
   - SNAM: assign a wet splat sound + hissing radioactive sound
   - NAM1: acid splash particle EFSH

2. Create new IPDS record: "RadSludge_IPDS"
   - Add entry: BGSMaterialWater (or your custom sludge material keyword) → ImpactRadSludge

3. Assign `RadSludge_IPDS` to your sludge surface STAT/ACTI record in xEdit:
   ```
   STAT record → IPDS - Impact Dataset → [your IPDS formID]
   ```

---

## 3. Material Keywords — Surface Detection

The impact system uses `BGSMaterial` keywords to identify what surface was hit. These keywords are assigned in the `BGSMaterialObject` record.

### Standard Material Keywords

```
BGSMaterialFlesh         ; organic tissue, creature skin
BGSMaterialMetal         ; iron, steel, robot chassis
BGSMaterialWood          ; timber, planks
BGSMaterialConcrete      ; roads, bunker walls
BGSMaterialGlass         ; windows
BGSMaterialStone         ; rock, cliff
BGSMaterialDirt          ; soil, wasteland ground
BGSMaterialSand          ; beach, desert
BGSMaterialWater         ; water surface
BGSMaterialGrass         ; vegetation hit
BGSMaterialSkin          ; thinner than Flesh (for clothing/armor)
BGSMaterialMetalHollow   ; sheet metal (cans, car bodies — more tinny sound)
BGSMaterialPlastic       ; synth parts, pre-war consumer goods
BGSMaterialRubber        ; tires, gaskets
BGSMaterialGlassBroken   ; already-broken glass (different sound)
BGSMaterialBone          ; skeleton, ghoul skull
```

### Assigning Material Keywords to Custom Surfaces

In xEdit, navigate to your surface STAT record:
```
STAT → DNAM - Data → Material: BGSMaterialMetal (or your keyword)
```

Or in the BGSM file:
```
; .bgsm file
sPhysicsMaterial=BGSMaterialMetal   ; determines which IPDS entry is triggered on impact
```

---

## 4. Blood Decal System

### Blood Pool & Splatter Decals

Blood decals are spawned by the engine when actors are damaged. The vanilla system has limited control. Custom blood decal mods replace the IPCT entries for `BGSMaterialFlesh`.

**Blood splatter texture setup:**
```
; blood_splat_01_d.dds — BC3 with alpha channel
; Alpha channel: irregular splatter shape (hand-painted in Photoshop/Krita)
; RGB: dark red (R=0.35, G=0.05, B=0.05) — dry blood is very dark
; Normal map (_n.dds): slight raised bump at center of splat (wet pooling effect)
```

**Realistic blood appearance:**
- Freshly-hit blood: bright red R=0.5 G=0.08 B=0.08, high specular (wet)
- Dried blood: R=0.25 G=0.04 B=0.04, low specular (matte)
- Use fLifetime tiering: fresh splats (fLifetime=120) → engine replaces with dried versions (using EFSH swap)

### Blood Decal Persistence (`Fallout4.ini`)

```ini
[Decals]
iMaxDecals=500              ; maximum concurrent decals in scene
iMaxDecalsPerFrame=5        ; new decals spawned per frame (prevents stutter burst)
fDecalLifetime=180.0        ; default decal lifetime seconds (if not overridden in IPCT)
fDecalLODFadeDistance=2000  ; distance at which decals begin LOD fade
fDecalFadeAlpha=0.0         ; opacity at max fade distance (0=invisible)
```

**Performance notes:**
- Each active decal = 1 draw call
- `iMaxDecals=500` means up to 500 draw calls for decals alone in a heavy combat scene
- Reduce to 200–300 for dense combat areas: `iMaxDecals=250`

---

## 5. Bullet Hole & Scorch Mark Decals

### Bullet Holes by Material

Different materials need different bullet hole appearances:

| Material | Decal look | Alpha shape | Normal map |
|---|---|---|---|
| Metal | Circular dent + radiating cracks | Circle + irregular edge | Raised rim, sunken center |
| Wood | Splintered hole | Irregular oval + splinters | Fiber-torn edge |
| Concrete | Crater + dust | Circular + crumble | Rough pitted center |
| Glass | Radial crack pattern | Star burst | Flat (glass is thin) |
| Flesh | Entry/exit wound | Irregular circle | Slight raised edge |

### Scorch Mark from Explosions

Explosion scorch marks are larger decals (MinWidth=40, MaxWidth=80) with:
- Black center (charring): R=0.05 G=0.04 B=0.04
- Orange-brown rim (burn halo): fade from center
- fLifetime=0 (permanent — explosions leave lasting marks)
- fAlphaDecay=0 (no fade)

For the EFSH particle effect on explosion impact:
- Spawn debris particles (rock chips, concrete fragments)
- Smoke puff rising from scorch
- Spark shower for metal surfaces

---

## 6. Footprint System

Footprints are a special type of decal tied to the actor animation system.

### FSTS Records (Footstep Set)

`FSTS` (Footstep Set) records link animation events to footstep sounds AND footstep decals:

```
FSTS → Walking → Left foot:
  Sound: FootstepDirt_L
  Footprint Decal: FootprintDirt_01  (STYL record or BSDecalNode NIF)
```

### Creating Mud Footprint Decals

1. Create footprint NIF with BSDecalNode
2. DODT: MinWidth=8, MaxWidth=12, fDepth=1.5, fLifetime=60.0, Color slightly darker than mud
3. Normal map: pressed-down mud normal (center depressed, edge raised ridge)
4. Assign to FSTS record for your custom material's footstep set
5. In BGSM for your mud/soft surface: `sFootstepSet = [your FSTS formID]`

---

## 7. Impact Particle Effects (EFSH)

`EFSH` (Effect Shader) records define the particle burst on impact.

### EFSH Particle Burst Fields (xEdit)

```
EFSH record:
  DNAM - Effect data:
    bNoFullbrightParticles ; use lighting on particles (false = brighter, more visible)
    eBlendMode             ; AdditiveBlend for sparks/fire; AlphaBlend for dust
    
  Fill Texture:            ; texture for main particle
  Particle Texture:        ; texture for secondary particles
  
  Particle Data:
    fParticleLifetime      ; seconds each particle lives
    fParticleLifetimeVar   ; variance (randomizes per particle)
    fInitialSpeedAlongNormal ; launch speed off surface (sparks: 80–120)
    fInitialSpeedVar       ; speed variance
    fInitialRotation       ; starting rotation degrees
    fRotationSpeed         ; spin rate
    fRotationVar
    
  Birth Position Offset:
    fBirthPositionOffset   ; spawn offset from impact point along normal
```

### Material-Specific Particle Calibration

| Material | Effect type | Blend mode | Particle lifetime | Key parameter |
|---|---|---|---|---|
| Metal (bullet) | Sparks | Additive | 0.4s | fInitialSpeedAlongNormal=120 |
| Concrete | Dust puff | Alpha blend | 1.5s | Slow initial speed, rise with gravity=-0.3 |
| Wood | Splinters | Alpha blend | 0.6s | fParticleLifetime=0.6, small chips |
| Flesh | Blood droplets | Alpha blend | 0.8s | Gravity=9.8 (realistic drop), fInitialSpeed=60 |
| Explosive scorch | Smoke + embers | Additive (embers) | Smoke=4s, embers=1.5s | Large smoke cloud scale |
| Water | Splash | Alpha blend | 0.5s | Spawns on water surface only |

---

## 8. Decal Fade & LOD Settings

### ENB Decal Enhancement

```ini
[DECALS]
bDecalEnable=true
fDecalFarFadeStartDistance=1500   ; decals begin fading at 1500 units
fDecalFarFadeEndDistance=3000     ; fully invisible at 3000 units
fDecalNormalStrength=1.0          ; normal map intensity on decals (1.0=full depth)
bDecalRenderIntoGBuffer=true      ; deferred rendering path (more accurate lighting on decals)
```

### REALISM_AND_PERFORMANCE Note

Decals are one of the cheapest realism improvements per performance cost:
- 500 decals ≈ 2–4% GPU cost
- But each decal = 1 draw call, so in scenes with thousands of decals (long continuous combat), cost adds up
- Use `fDecalFarFadeStartDistance=1500` to cull distant decals aggressively in performance-sensitive areas
- Set `fDecalLifetime=120` (2 minutes) not 0 (permanent) for blood/bullet holes in areas players revisit frequently
