# Landscape & Terrain Detail Guide for Fallout 4 Mods (2026)

The ground beneath the player's feet is the most-seen surface in any open-world mod. This guide covers LTEX terrain blending, vertex color painting, grass distance and density LOD, terrain micro-detail normal maps, and rock scatter placement budgets.

---

## 1. LTEX Records — Terrain Layer System

Terrain in FO4 is painted using **Land Texture** (`LTEX`) records. Each LTEX references a BGSM material, and up to 6 LTEX layers can be blended per terrain quad.

### LTEX Record Fields (xEdit)

```
LTEX record:
  TNAM - Material (path to .bgsm)
  HNAM - Havok material (determines footstep sound + impact particle)
  SNAM - Specular Exponent (legacy — overridden by BGSM in modern setups)
  GNAM - Grass list (which grass types grow on this texture)
```

### LTEX Layer Limit — The 6-Layer Rule

Each terrain quad (the smallest paintable area) supports a maximum of **6 simultaneous LTEX layers**. Exceeding this causes visual corruption (grey squares) and engine errors.

**Practical rules:**
- Base layer (Layer 0): your dominant ground texture (dirt, asphalt, grass)
- Layers 1–3: transition blends (gravel, rubble, moss)
- Layers 4–5: accent details (blood stains, wet patches, debris)
- Never exceed 6 unique LTEX per quad — xEdit shows this as `land record error`

### Terrain BGSM for PBR

```
; Data\materials\landscape\terrain\wasteland_dirt_pbr.bgsm
bShaderModel=true
bLandscape=true             ; marks as terrain blend material (required)

sTextureDiffuse=textures\landscape\wasteland_dirt_d.dds        ; BC3, 1K–2K
sTextureNormal=textures\landscape\wasteland_dirt_n.dds         ; BC5, same res
sTextureSpec=textures\landscape\wasteland_dirt_s.dds           ; BC3
sTextureHeight=textures\landscape\wasteland_dirt_h.dds         ; BC4, for terrain POM

; PBR calibration for dry cracked dirt
fRoughness=0.85             ; very rough surface
fSpecularIntensity=0.04     ; dielectric spec
bSpecularEnabled=true

; Terrain-specific tiling
fTexcoordScale=1.0          ; UV scale (how many times texture tiles per terrain quad)
                            ; 0.5 = large tiles (blurry close up); 2.0 = fine tiles (good close up, may repeat visibly)
```

### Multi-Layer Terrain Blending Weights

In CK terrain paint mode, each layer's blend weight per vertex is stored in the land record vertex colors. The engine uses hardware alpha blending between layers with a distance-based LOD fade.

**Blending tips:**
- Always feather edges between layers (use small brush + low opacity for natural transitions)
- Rocky to dirt: insert a gravel layer between — never jump directly rock→dirt
- Keep high-contrast layer pairs (dark/light) at least 1 brush-radius apart to prevent harsh seam lines
- Wet transitions (mud/water edge): use a dark moisture layer between normal dirt and the water LTEX

---

## 2. Vertex Color Terrain Painting

Beyond LTEX layer blending, terrain vertex colors encode additional data used by shaders:

```
R channel = dirt/ambient occlusion darkening (0=shadow pocket, 255=neutral)
G channel = wetness mask (255=fully wet/dark in rain, 0=dry)
B channel = snow coverage (used by weather blend system — 255=full snow cover)
A channel = foliage density modifier (0=no grass here, 255=full grass density)
```

**CK vertex color workflow:**
1. Terrain Paint → Color Mode (toggle in toolbar)
2. Paint R channel: darken rock crevices, shadow edges of debris piles
3. Paint A (alpha) channel to zero out grass from: roads, rocky outcrops, building footprints

This is the correct way to prevent grass growing on roads — not via disabling the LTEX grass list, which affects all instances of that texture globally.

---

## 3. Grass — Distance, Density & LOD

### Key Grass INI Settings

```ini
; Fallout4.ini [Grass]
iMinGrassSize=40                    ; lower = denser (20=very dense, 60=sparse)
fGrassStartFadeDistance=6000        ; distance where grass begins fading out (game units)
fGrassMaxStartFadeDistance=7000     ; max fade distance
fGrassMinStartFadeDistance=400      ; min distance (close fade-in)
bAllowCreateGrass=1
bAllowLoadGrass=1

; With Extended Grass Distance mod:
fGrassStartFadeDistance=15000       ; 15K units ≈ 200m — far denser grass field
fGrassMaxStartFadeDistance=18000
```

**Performance cost of grass**: grass is the #2 cause of exterior FPS loss after precombine invalidation. Every 1000-unit increase in `fGrassStartFadeDistance` costs 5–15 FPS depending on grass density.

### Grass GRAS Records (CK)

Each `GRAS` record defines a grass type:

```
GRAS fields (xEdit):
  DNAM:
    iDensity        ; blades per unit area (1–100). 20=normal, 40=lush
    fMinSlope       ; min surface angle for grass (0=flat, 45=45° slope)
    fMaxSlope       ; max slope grass grows on (45–90 means grass on vertical = wrong)
    fMinHeight      ; minimum blade height
    fMaxHeight      ; maximum blade height (randomized per blade)
    fUnitFromWater  ; minimum distance from water (prevents underwater grass)
    bUnitsFromWaterType ; above/below water
    fPositionRange  ; random position offset (creates organic distribution)
    fHeightRange    ; random height variation
    fColorRange     ; random tint variation
    bWavePeriod     ; animation sway enabled
    fWaveSpeed      ; 0.5=gentle, 2.0=stormy
    bAllowOnSlopes  ; explicit slope permission
```

### Custom Grass Mesh + Texture

Grass geometry best practices:
- **2–4 crossed quads** per blade cluster (cards technique)
- Alpha-test texture (not alpha-blend) — same rule as hair
- LOD1 mesh: single cross-quad
- LOD2: billboard sprite
- Keep poly count per cluster ≤ 50 triangles
- Normal map: flat normal pointing up with slight random variation per quad card

```
Grass BGSM flags:
  bGrass=true
  bWind=true          ; enables wind sway
  fGrassWindSpeed=1.0
  bAlphaTest=true
  AlphaThreshold=64   ; lower = more fringe visible (realistic wispy edges)
```

### xLODGen Grass LOD

**xLODGen** generates grass LOD for large worldspaces (required for custom worldspaces):
```
xLODGen.exe -fo4 -grassonly -o:"Output\GrassLOD"
```

Without grass LOD, grass abruptly disappears at `fGrassStartFadeDistance` — a very visible pop that destroys immersion.

---

## 4. Terrain Micro-Detail Normal Maps

Vanilla terrain looks flat up close because each LTEX tile is 1–2m but the texture tiles at a coarse scale. Micro-detail normals add high-frequency surface detail at close range.

### Setup in BGSM

```
; terrain BGSM with micro-detail
sTextureNormal=textures\landscape\dirt_n.dds           ; primary normal (low-frequency)
sTextureMicroDetail=textures\landscape\dirt_micro_n.dds ; micro-detail normal (high-frequency)

fMicroDetailScale=8.0   ; tiles 8× faster than primary — adds fine grain/pebble detail
fMicroDetailBlend=0.5   ; blend weight of micro vs primary normal (0.3–0.7 for subtle effect)
```

Micro-detail normal maps:
- BC5 compressed (RG only — normals only need 2 channels)
- 512×512 or 1K — since they tile 8× faster, high-res isn't needed
- Content: fine pebble texture, cracked dirt, moss grain — depends on LTEX type
- Must NOT have large-scale features (no rocks) — micro-detail only

### POM for Terrain (Parallax Occlusion Mapping)

With Community Shaders or ENB POM injection:
```
BGSM flags:
  SF2_PARALLAX_OCCLUSION = enabled
  sTextureHeight = textures\landscape\dirt_h.dds  ; BC4, height map
  fPOMScale = 0.015         ; displacement depth (0.008=subtle, 0.025=very deep cracks)
  fPOMMinSamples = 8
  fPOMMaxSamples = 32       ; sample count (higher=better at steep angles, more GPU cost)
```

Best used on: cracked asphalt, rock faces, stone floors, brick. Avoid on smooth terrain (sand, mud) where POM adds no detail.

---

## 5. Rock Scatter — Reference Placement Budget

Scattered rocks, rubble, and clutter define environmental realism but are the fastest way to destroy FPS if over-placed.

### Per-Cell Rock Scatter Budget

| Cell type | Max unique mesh types | Max total references | Notes |
|---|---|---|---|
| Dense exterior (Diamond City area) | 8–12 | 150–200 | Already near draw-call limit |
| Open wasteland exterior | 15–25 | 300–500 | LODs critical |
| Large interior dungeon | 20–35 | 200–400 | Precombines generated |
| Small interior room | 10–15 | 50–100 | No LOD needed |

### Precombine Requirements for Rock Scatter

Any rock/rubble scatter in exterior cells **must** be included in a precombine pass. Individual scattered rocks without precombines = 1 draw call each. 200 scattered rocks = 200 draw calls = severe FPS loss.

Precombine workflow for scatter:
1. Place all scatter references in CK
2. Mark as "Can Be Precombined" (default for static refs)
3. Generate precombines: `Gameplay → Generate Precombined Objects`
4. Generate previs: `Gameplay → Generate Previs Data`
5. Pack previs into plugin BA2

### Rock Texture Realism Tips

- Use a **triplanar mapping** rock BGSM (`bTriplanar=true`) for rocks larger than 1m — prevents UV stretching on curved surfaces
- Normal map should have: deep crack shadows, surface grain, edge wear
- `_s.dds` R channel for rocks: 0.04–0.06 (slightly higher than dirt — rocks have faint sheen)
- AO texture (`_s.dds` B channel with Community Shaders): baked from high-poly for contact shadow in crevices

---

## 6. Extended Terrain Layer Count

Vanilla CK enforces 6 LTEX layers per quad. The **Extended Landscape Textures** mod removes this limit at the cost of increased terrain data size.

```
; Extended Landscape Textures INI
iMaxLandTextureLayersPerQuad=8   ; allows 2 extra layers
bExtendedBlending=true           ; uses custom shader for extra blend
```

**When to use**: complex transitions needing 7–8 layers (e.g., rocky cliff transitioning to mud to moss to grass to rubble to dried blood near a battle site). Performance impact is small (one extra texture sample per layer) but terrain data file size increases.

---

## 7. Terrain LOD & Normals

Terrain LOD (generated by xLODGen) uses simplified meshes at distance. For best LOD visual quality:

**xLODGen terrain settings:**
```
-lodlevel:4,8,16,32
-lodsize:256,512,1024,2048   ; LOD texture atlas size per level
-texturesize:256             ; per-tile LOD texture resolution
-normalmap                   ; generate LOD normal maps (critical for shading at distance)
```

Without LOD normal maps, distant terrain appears completely flat — no apparent hills or rock faces visible at range. Always generate LOD normals.

**Terrain LOD normal map quality**: LOD normals are generated by xLODGen baking the actual terrain height data. The result should show the same hills/cliffs as close-up view. If they look wrong, check xLODGen `-zscale` parameter matches your worldspace height scale.
