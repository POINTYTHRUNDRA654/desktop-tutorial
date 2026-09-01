# Character Face, Skin & Hair Realism Guide for Fallout 4 Mods (2026)

NPC and player character visuals are among the first things players notice. This guide covers skin subsurface scattering, FaceGen workflow, High-Poly Head integration, LooksMenu morphs, hair alpha sorting, eye shader setup, and HDT-SMP cloth/hair physics.

---

## 1. Skin Subsurface Scattering (SSS) for Faces

### Why Vanilla Skin Looks Plastic

Vanilla skin uses a basic diffuse + specular model. Light either bounces off the surface (specular) or is absorbed (diffuse). Real skin allows light to penetrate the surface and scatter beneath it — the reddish glow you see through fingers held to a light. Without this, skin looks like matte plastic.

### FO4 Skin SSS Setup

FO4's engine supports SSS via the `SLSF1_SUBSURFACE_LIGHTING` shader flag combined with `BSLightingShaderProperty` subsurface settings.

**NifSkope — Skin material flags:**

```
BSLightingShaderProperty:
  Shader Flags 1: SLSF1_SUBSURFACE_LIGHTING = enabled
  
  Shader Type: Skin Tint (type 5)
  
  Subsurface Rolloff: 0.25–0.40
    (0.25 = light skin, minimal subsurface; 0.40 = translucent/thin skin)
    Note: Face skin typically 0.30–0.35; ear skin 0.40 (very translucent)
  
  Skin Tint Color: R=1.0 G=0.85 B=0.75 (warm caucasian base)
    ; Adjust per character ethnicity — this is the overall color multiplier
    ; ENB can override per-weather via weather-specific skin tone adjustments
```

**BGSM file for skin:**
```
bSubsurfaceLighting=true
fSubsurfaceRolloff=0.32
cSkinTintColor=1.0,0.85,0.75
bSpecularEnabled=true
fSpecularPower=35.0          ; lower = broader specular highlight (oily)
                             ; higher = tighter (dry/matte)
fSpecularColorR=0.35
fSpecularColorG=0.30
fSpecularColorB=0.28         ; slightly warm specular on skin
```

### _s.dds for Skin (PBR Mode with Community Shaders)

With Community Shaders enabled:
```
_s.dds channels:
  R = Specular Intensity (0.04 for dry skin, 0.08 for oily/sweaty)
  G = 1 - Roughness (forehead/nose = 0.7 shiny; cheeks = 0.5; neck = 0.45)
  B = Subsurface mask (white = SSS applies fully, black = SSS disabled)
    ; Tip: drive B channel with a cavity map — SSS strongest in pores/creases
```

---

## 2. FaceGen Workflow — Custom NPCs

FaceGen data is stored as a sculpt + tint offset in the ESP and as morphed `_0.nif` geometry exported from the CK.

### Complete NPC Face Creation Pipeline

**Step 1 — Set up base NPC in CK:**
1. Create NPC_ record → Race = HumanRace (or custom)
2. Face tab → adjust sliders (morphs) for base structure
3. Add skin overlay tints, eye color, complexion

**Step 2 — Export FaceGen:**
```
CK → File → Export → Export FaceGen Data (NPC)
Output: Data\meshes\actors\character\FaceGenData\FaceGeom\[Plugin]\[FormID].nif
        Data\textures\actors\character\FaceCustomization\[Plugin]\[FormID]_d.dds
```
Always export FaceGen — without it your NPC will have the "dark face bug" (a completely black/dark face in-game caused by texture mismatch between baked FaceGen and dynamic skin).

**Step 3 — Correct Dark Face Bug:**
Dark face is caused by:
- Missing FaceGen export (most common)
- Plugin load order conflict overwriting the NPC record without re-exporting
- Wrong texture paths in the exported `[FormID].nif`

Fix: In CK, load only your plugin → open NPC → don't change anything → File → Export FaceGen Data (NPC). This regenerates the geometry with your plugin's overrides baked in.

### FaceGen Editing with RaceMenu / LooksMenu Export

**LooksMenu** (F4SE) allows in-game face editing. Exported presets are stored as:
```
Data\F4SE\Plugins\F4EE\Presets\[PresetName].json
```

For sharing NPC faces:
1. Design in-game with LooksMenu
2. Export preset JSON
3. In CK: import morphs from the JSON using the LooksMenu headpart morph IDs

---

## 3. High-Poly Head Integration

**High Poly Head** (KOR_Utilities) replaces the vanilla ~2,000-polygon head mesh with a ~16,000-polygon version with precise bone weighting for smooth morph animations.

### Integration Requirements

1. Install High Poly Head — replaces `HumanHeadParts` records
2. Your custom NPC must use HPH headparts — in CK, Face tab → change `Head` headpart to the HPH variant
3. **Re-export FaceGen** after switching headparts (the geometry is different)
4. Compatible with: LooksMenu, BodySlide-based skin textures

### High-Poly Head with PBR Skin

HPH ships with vanilla-mapped UV. For PBR:
1. Rebake your `_d.dds` (diffuse), `_n.dds` (normal), `_s.dds` (spec) to HPH UV space using Blender UV transfer:
   - Import vanilla head OBJ + HPH head OBJ
   - Use **Data Transfer** modifier (source=vanilla, target=HPH, UV transfer)
   - Bake textures from vanilla UV → HPH UV
2. This preserves your PBR material calibration while matching HPH geometry

---

## 4. Eye Shader — Iris Depth & Wet Highlight

Vanilla eyes use a flat decal approach. Realistic eyes require a **cornea layer** (wet highlight) over the **iris layer** (depth parallax).

### Eye Material Setup (Two-Layer)

**Layer 1 — Iris (base):**
```
BSLightingShaderProperty:
  Shader Type: Default
  Shader Flags 1: SLSF1_USE_FALLOFF (for limbal ring fade at edges)
  Diffuse texture: textures\actors\character\eyes\[EyeColor]_d.dds
  Normal map: textures\actors\character\eyes\eye_n.dds
  fSpecularPower=80.0    ; tight specular
```

**Layer 2 — Cornea/Wet Overlay (additive layer on top):**
```
BSLightingShaderProperty:
  Shader Type: Default
  Shader Flags 1: SLSF1_VERTEX_ALPHA | SLSF1_USE_FALLOFF
  Shader Flags 2: SLSF2_VERTEX_COLORS
  Diffuse texture: textures\actors\character\eyes\eyewet_d.dds  ; nearly transparent
  Normal map: textures\actors\character\eyes\eyewet_n.dds        ; curved normals for refraction illusion
  fSpecularPower=15.0    ; very wide, bright specular highlight = wet look
  fSpecularMult=3.5      ; boosted spec to simulate corneal reflection
  fEnvironmentMapScale=0.35  ; subtle env reflection
```

### Iris Parallax Depth

In NifSkope, use an `emissiveColor` trick for iris depth: slightly blue-shifted iris color at center (0,0,0 at limbus → 0.02,0.05,0.08 shift at iris center) mimics the lens focusing depth cue.

---

## 5. Hair — Alpha Sorting & Alpha Dithering

Hair is the most visually complex mesh in character rendering. FO4 defaults to **alpha blending** which causes sorting artifacts (hair strands rendering in wrong order).

### Alpha Dithering vs Alpha Blending

**Alpha blending** (vanilla): renderer sorts triangles back-to-front, but dynamic hair never sorts correctly → Z-fighting, holes, flickering.

**Alpha dithering** (recommended for hair): instead of variable opacity, each pixel is either fully opaque or fully discarded in a screen-space dithered pattern. No sorting needed. Slight noise but no artifacts.

To enable dithering in hair NIF:
```
NifSkope → BSLightingShaderProperty → Shader Flags 1:
  Remove: SLSF1_HAIR_SOFT_LIGHTING (this forces blending)
  Add: SLSF1_ALPHA_TEST
  
Alpha Controller → AlphaProperty:
  AlphaFunction: ALPHA_TEST
  AlphaThreshold: 128  (pixels below 50% opacity are discarded; above = opaque)
  bDither: true        (if available — ENB enforces dithering regardless)
```

**ENB Hair Dithering** (enbseries.ini):
```ini
[HAIR]
bHairDitherEnable=true      ; forces dithered alpha on all hair in scene
fHairDitherBias=0.05        ; noise scale (0.02=fine grain, 0.1=coarse)
```

### Hair Normal Maps

Hair strands are thin — use a **fiber normal** technique:
- Normal map Y axis (green channel) encodes strand tangent direction
- This gives each strand specular highlight along its length rather than a point spec
- In Substance Painter, use the **Anisotropic** BSDF and bake with strand tangent flow map

### Hair Color — Tint Masks

Custom hair colors use a tint mask approach:
1. Base hair texture = greyscale (luminance only, no color)
2. In CK, NPC → Face → Hair Color: RGB value that tints the greyscale hair
3. BGSM: `bHair=true`, `bHairTint=true`
4. For highlights: store highlight color in the `_s.dds` B channel (AO channel); ENB reads this for hair shimmer

---

## 6. Eyebrow & Beard Alpha Sorting

Eyebrows and beards are head parts with strict alpha requirements:

```
For eyebrows/beards in NifSkope:
  BSLightingShaderProperty flags:
    SLSF1_HAIR_SOFT_LIGHTING = OFF
    SLSF1_ALPHA_TEST = ON
    SLSF2_ZBUFFER_WRITE = OFF   ; don't write to depth — prevents eyebrow punching holes in hair
  
  AlphaProperty:
    iAlphaFunction = ALPHA_TEST
    AlphaThreshold = 64–96  ; lower = more fringe visible at strand tips
    bBlend = false
```

Load order of alpha surfaces in NIF (critical for correct compositing):
1. Skin (opaque, base layer)
2. Eyebrows (alpha-test, ZBUFFER_WRITE = off)
3. Eyelashes (alpha-test, ZBUFFER_WRITE = off)
4. Hair (alpha-test or dithered, sorted after face geometry)

---

## 7. HDT-SMP — Soft Body Physics for Hair & Cloth

**HDT-SMP for FO4** (Havok Soft Multi-Physics) adds bone-chain simulation to hair, cloaks, scarves, and loose clothing.

### Setup Requirements

1. Install HDT-SMP F4SE plugin
2. Your asset needs an SMP bone chain in the NIF:
   - Standard NIF skeleton → add `SMP_Hair_01`, `SMP_Hair_02` etc. as child bones of `Head`
   - Each bone is a rigid body connected by a spring constraint

### SMP XML Configuration

SMP behavior is defined in `Data\SKSE\Plugins\hdtSkinnedMeshConfigs\[AssetName].xml`:

```xml
<HDTSkinnedMeshSystem>
  <PerVertexShape name="HairMesh">
    <!-- Physics world properties -->
    <system>
      <linearDamping>0.95</linearDamping>   <!-- 0.0=no drag, 1.0=instant stop -->
      <angularDamping>0.9</angularDamping>
      <gravityScale>1.0</gravityScale>
      <windStrength>0.3</windStrength>       <!-- 0=no wind effect on hair -->
      <collisionFilter>hair</collisionFilter>
    </system>
    
    <!-- Bone chain spring constraints -->
    <bone name="SMP_Hair_01" parent="Head">
      <stiffness>0.8</stiffness>    <!-- 1.0=rigid, 0.0=no spring back -->
      <damping>0.3</damping>
      <mass>0.05</mass>             <!-- grams. Lower = lighter, more floaty -->
      <maxAngle>35</maxAngle>       <!-- max bone deflection degrees -->
    </bone>
    <bone name="SMP_Hair_02" parent="SMP_Hair_01">
      <stiffness>0.5</stiffness>    <!-- decreases down chain for natural droop -->
      <damping>0.4</damping>
      <mass>0.04</mass>
      <maxAngle>45</maxAngle>
    </bone>
    <!-- Continue chain... -->
    
    <!-- Collision shapes (prevent hair clipping through shoulder/chest) -->
    <collider name="Shoulder_L" bone="L Clavicle">
      <capsule>
        <radius>8.0</radius>
        <height>20.0</height>
        <offset>0,0,5</offset>
      </capsule>
    </collider>
  </PerVertexShape>
</HDTSkinnedMeshSystem>
```

### HDT-SMP Performance Budget

Each SMP-enabled asset adds CPU physics work. Budget guidelines:
- **Hair**: 10–20 bones per strand cluster = acceptable
- **Cloak/cape**: 30–50 bones = moderate cost; avoid in combat-heavy areas
- **Multiple NPCs with SMP**: ActorCountFix (`MaxActors=4096`) must be set, but SMP also has its own cap: `MaxSimulatedActors=10` in `hdtSMP.ini` (increase carefully)

---

## 8. Complexion Overlays & Dirt/Damage Layers

For weathered, lived-in character looks:

**LooksMenu Overlay System** allows stacking textures over the base skin:
- `Data\F4SE\Plugins\F4EE\Overlays\` — define overlay textures (scars, dirt, freckles, tattoos)
- Each overlay has: opacity, blend mode (multiply/overlay/add), UV tiling

**xEdit HDPT (Head Part) records** for baked-in complexion variants:
```
HDPT → HeadPart type: Misc (for overlay mesh)
  → NIF with BSEffectShaderProperty (additive blend) over skin
  → Diffuse = dirt/scar decal texture (alpha channel = mask)
```

---

## 9. Quick Checklist — Maximum NPC Realism

- [ ] SSS enabled (`SLSF1_SUBSURFACE_LIGHTING`), rolloff 0.30–0.35 for face
- [ ] `_s.dds` B channel = SSS mask (pores/creases get most SSS)
- [ ] FaceGen exported after every NPC face change (no dark face)
- [ ] High Poly Head headparts assigned if targeting close-up NPC cinematics
- [ ] Eye: two-layer setup (iris + wet cornea overlay)
- [ ] Hair: alpha-test mode, not alpha-blend; ENB `bHairDitherEnable=true`
- [ ] Eyebrows: `SLSF2_ZBUFFER_WRITE=OFF` prevents punching holes in hair
- [ ] HDT-SMP XML with colliders for shoulder/chest if hair physics enabled
- [ ] Complexion: LooksMenu overlay or HDPT misc layer for scars/weathering
