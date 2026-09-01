# Realism & Performance Optimization Guide for Fallout 4 Mods (2026)

A comprehensive reference covering: weight-based physical movement, auditory / reverb realism, FPS draw-call reduction, and maximum visual realism techniques. Designed to help modders achieve cinematic quality without sacrificing playability.

---

## 1. Realistic Weight-Based Movement

### Why Vanilla Movement Feels "Skatey"

Vanilla FO4 movement uses a flat, constant acceleration curve. Regardless of carry weight, the character accelerates to maximum run speed in 1–2 frames. There is no lean, no momentum carry-over in turns, and no deceleration penalty for heavy loads. The result is the infamous "ice skating" feel.

### 2026 Solution: Inertia Overhaul Mods

**Realistic Weight-Based Movement / Inertia** (2026 release) is an F4SE plugin + Papyrus MCM combo that replaces the character movement state machine with a momentum-aware model.

#### Core Mechanics

| Feature | Vanilla | Inertia Mod |
|---|---|---|
| Acceleration curve | Instant | Dynamic — scales with `fCarryWeightRatio` |
| Turn lean | None | Character mesh rotates `fTurnLeanAngle` based on angular velocity |
| Deceleration | Near-instant | `fBrakingDecelerationWalking` scales with total carried weight |
| Sprint stamina cost | Flat rate | Increases by `fCarryWeightSprintMultiplier × totalWeight` |
| Crouch transition | Snap | Blend over `fCrouchBlendTime` seconds |

#### Key INI / Config Settings

Located in `Data\F4SE\Plugins\InertiaOverhaul.ini`:

```ini
[Movement]
; Base values — tune to taste
fBaseAcceleration = 550.0          ; vanilla ≈ 700. Lower = more sluggish startup
fBrakingDecelerationWalking = 250.0 ; deceleration when stopping
fCarryWeightRatio = 0.65           ; weight at which penalties begin (fraction of max carry)
fHeavyLoadAccelMult = 0.55         ; multiplier applied when > fCarryWeightRatio
fHeavyLoadSpeedMult = 0.80         ; max speed reduction at full carry weight

[TurnLean]
fTurnLeanMax = 8.0                 ; degrees of lean; 5–12 realistic
fTurnLeanSmoothing = 0.15          ; lerp speed; lower = more gradual
bEnableTurnLean = true

[Crouch]
fCrouchBlendTime = 0.22            ; seconds to blend crouching (vanilla = ~0.08)

[Compatibility]
bDisableWithPowerArmor = true      ; disable momentum sim inside Power Armor (physics conflict)
bCompatHighFPSPhysicsFix = true    ; sync with HighFPSPhysicsFix Havok step decoupling
```

#### Carry Weight Ratio — The Core Formula

The mod computes a `loadFraction` each frame:

```
loadFraction = clamp(currentWeight / maxCarryWeight, 0.0, 1.0)
```

Then applies:

```
effectiveAccel = fBaseAcceleration × lerp(1.0, fHeavyLoadAccelMult, loadFraction)
effectiveSpeed = baseSpeed × lerp(1.0, fHeavyLoadSpeedMult, loadFraction)
leanAngle = fTurnLeanMax × angularVelocityNormalized × loadFraction × 0.5
```

At full carry weight (loadFraction = 1.0): character accelerates at 55% normal rate, max speed is 80% of base, and leans up to 8° in turns.

#### CommonLibF4 Implementation Pattern

If building a custom C++ plugin to replace/extend the inertia system:

```cpp
// Hook the movement controller update
REL::Relocation<uintptr_t> movCtrlVtbl{ RE::PlayerCharacter::VTABLE[0] };
// Override ProcessThumbstick / UpdateAnimation virtual
auto* player = RE::PlayerCharacter::GetSingleton();
float loadFraction = player->GetActorValue(RE::ActorValue::kCarryWeight)
                     / player->GetBaseActorValue(RE::ActorValue::kCarryWeight);
// Apply to speedMult
player->SetActorValue(RE::ActorValue::kSpeedMult, 
    100.0f * std::lerp(1.0f, 0.80f, std::clamp(loadFraction, 0.0f, 1.0f)));
```

#### Compatibility Notes

- **HighFPSPhysicsFix** (Havok step decoupling) is required — without it, momentum calculations double at 120+ FPS
- **Power Armor**: disable momentum sim (`bDisableWithPowerArmor=true`) — the PA servo motor system has its own movement modifiers that conflict
- **Animations**: pair with a custom HKX animation set that includes lean/stagger states. The mod fires `BSAnimationGraphEvent` events: `InertiaLeanLeft`, `InertiaLeanRight`, `InertiaHeavyStep` which drive animation layer blending

---

## 2. Auditory Realism — Room Reverb & Acoustic Simulation

### Why Vanilla Audio Sounds Flat

FO4's engine uses a basic distance-falloff model for sound. There is no material-based reflection, no room-size reverb calculation, and no distinction between "echo in a metal vault" versus "muffled thuds in a carpeted pre-war home." Every interior sounds the same because the game uses a single reverb preset per cell type.

### 2026 Solution: Reverb & Abundance Overhaul / Acoustic Realism

**Reverb and Abundance Overhaul** (RAO) is the standard 2026 mod that replaces vanilla's reverb presets with a physics-informed acoustic model. It also adds outdoor reverb to open areas that lack it entirely in vanilla.

#### How RAO Works

RAO injects custom `REVERBPARAMETERS` records into the game and assigns them per-cell using keyword matching and a lightweight F4SE plugin that monitors `TESLoadGameEvent` and `TESCellFullyLoadedEvent` to apply the correct reverb preset when a cell loads.

Key components:
1. **Custom Reverb presets** — `Data\Sound\FX\RAO\` — set of ~40 reverb IR (impulse response) profiles
2. **Cell keyword scanner** — F4SE plugin reads cell flags (cave/dungeon/building/outdoor) and applies matching preset
3. **Material reflection table** — maps `BGSMaterialObject` keywords to reflection coefficients

#### Reverb Preset Categories

| Category | Example Cells | RT60 (ms) | Characteristics |
|---|---|---|---|
| `RAO_Vault` | Vault 81, Vault 111 | 800–1200 | Long metal echo, high-frequency shine |
| `RAO_Underground` | Subway/sewer tunnels | 500–800 | Mid echo, low rumble |
| `RAO_SmallRoom` | Pre-war house kitchen | 120–250 | Short, dry, carpet-dampened |
| `RAO_LargeHall` | Diamond City, GNN | 400–600 | Wide spread, marble/tile reflection |
| `RAO_Outdoor_Open` | Commonwealth wasteland | 50–100 | Near-zero reverb, wind dampening |
| `RAO_Forest` | Far Harbor forest | 100–200 | Organic scatter, canopy absorption |
| `RAO_Cave` | Rock caves | 600–1000 | Stone resonance, drip echo |
| `RAO_Industrial` | Robot factories | 350–550 | Hard metal, mechanical resonance |

#### RAO Configuration (`RAO.ini`)

```ini
[General]
bEnabled=1
bVerboseLog=0

[Reverb]
fGlobalReverbMix=0.65       ; 0.0–1.0. Lower = drier sound. 0.65 is naturalistic
fIndoorWetMix=0.75          ; reverb wet mix for interior cells
fOutdoorWetMix=0.18         ; reverb for open world (subtle)

[Performance]
bUseLowLatencyMode=1        ; reduces reverb calculation to every 4 frames instead of every frame
iMaxSimultaneousReverbs=4   ; cap reverb channels to prevent CPU spike in busy cells

[MaterialReflection]
; Material reflection coefficients (0.0=fully absorptive, 1.0=fully reflective)
fMetalReflection=0.92       ; vault walls, robot chassis
fConcrete=0.68              ; institute, bunkers
fCarpet=0.08                ; pre-war homes, Diamond City residences  
fWood=0.32                  ; Far Harbor cabins
fRock=0.78                  ; caves, quarries
fGlass=0.45                 ; office buildings
```

#### Adding Reverb to Custom Cells (CK + xEdit)

1. **In Creation Kit**: your cell's Audio properties → assign a `REVERBPARAMETERS` record. RAO provides a full set under `AcousticSpace` in the object browser.
2. **Keyword assignment**: add one of RAO's acoustic keywords to your cell record in xEdit:
   - `RAO_AcousticVault`, `RAO_AcousticCave`, `RAO_AcousticSmallRoom`, etc.
3. **Custom preset** (advanced): duplicate an existing `REVERBPARAMETERS` record in xEdit and adjust `fDecayTime`, `fHFDecayRatio`, `fDiffusion`, `fDensity` to match your custom material

#### xEdit Reverb Parameters Fields

```
REVERBPARAMETERS record:
  fDecayTime: 0.1–20.0 seconds (room resonance length)
  fHFDecayRatio: 0.1–2.0 (high frequency decay relative to mid — lower = more carpet absorption)
  fDiffusion: 0.0–100.0 (scatter — high = even diffuse field, low = flutter echoes)
  fDensity: 0.0–100.0 (modal density — higher = smoother decay)
  fWetMix: 0.0–1.0 (reverb level)
  fDryMix: 0.0–1.0 (direct signal level)
  fPreDelay: 0–300ms (time before first reflection — larger = larger perceived room)
  fLateReverbDelay: 0–100ms (gap between early reflections and late reverb tail)
  fHFReference: 5000Hz (reference frequency for HFDecayRatio)
  fEnvironmentSize: 1.0–100.0 (perceived room size multiplier)
```

#### Papyrus Script — Dynamic Reverb Assignment

```papyrus
; Assign reverb dynamically based on cell size at runtime
Scriptname RAO_DynamicReverb extends ObjectReference

Event OnInit()
    Cell parentCell = self.GetParentCell()
    If (parentCell.IsInterior())
        Float cellVolume = parentCell.GetVolume()  ; RAO exposes this via F4SE
        If (cellVolume > 50000.0)
            parentCell.SetAcousticSpace(Game.GetForm(0x12345678) as AcousticSpace) ; RAO_LargeHall
        ElseIf (cellVolume > 10000.0)
            parentCell.SetAcousticSpace(Game.GetForm(0x12345679) as AcousticSpace) ; RAO_SmallRoom
        Else
            parentCell.SetAcousticSpace(Game.GetForm(0x1234567A) as AcousticSpace) ; RAO_Closet
        EndIf
    EndIf
EndEvent
```

---

## 3. FPS Optimization — Reducing Draw Calls From Your Mod

### What Causes FPS Drop in Modded FO4

The three primary causes of mod-induced FPS loss, in order of impact:

1. **Draw call count** — each unique mesh/material combo = 1+ draw call. FO4's DX11 renderer struggles above ~3,000 draw calls per frame in dense cells
2. **Precombine invalidation** — your mod disabling precombines forces individual reference rendering, multiplying draw calls 10–30× in affected cells
3. **High-resolution textures without streaming** — 4K/8K textures that aren't properly set up for mip-mapping stall VRAM streaming and cause stutters

### Rule 1: Never Disable Precombines Unless You Have To

**The most impactful single FPS optimization**: keep precombines intact.

If your mod changes references in a cell:
- Use **PRP (Previs Repair Pack)** to regenerate precombines, OR
- Limit changes to references that are NOT part of existing precombined groups (check in CK — greyed-out references in the render window are precombined)

To check if a reference is precombined: open xEdit → navigate to the REFR → check if `XCNT - Count` field exists (precombined references have this)

**If you must invalidate precombines**: add a custom precombine regeneration step in your FOMOD and document it clearly. FPS impact can be 30–60% in dense exterior cells.

### Rule 2: Mesh LOD Strategy

Every visible mesh in a cell contributes to draw calls. Budget your mesh LODs:

| Distance | Target poly count | LOD type |
|---|---|---|
| 0–50m | Full detail | `_0.nif` |
| 50–150m | 50% reduction | `_1.nif` |
| 150–500m | 10% | `_2.nif` |
| 500m+ | Billboard/impostor | xLODGen-generated |

Generate LODs with **xLODGen** (terrain + object LOD) and **DynDOLOD** (dynamic LOD for animated/seasonal objects). Never ship a mod with custom meshes and no LODs — every custom asset visible at distance uses full LOD, killing FPS in exterior cells.

**xLODGen command** for object LOD:
```
xLODGen.exe -fo4 -o:"Output\LOD" -lodlevel:4,8,16 -lodsize:256,512,1024
```

### Rule 3: Texture Optimization

| Issue | Cause | Fix |
|---|---|---|
| Missing mip maps | Texture exported without mips | Always generate full mip chain in Photoshop/Paint.net/Substance |
| Wrong DDS format | BC7 instead of BC3/BC5 | Use BC3 for diffuse, BC5 for normals, BC4 for height/AO |
| Oversized textures | 4K on a rock pebble | Match texture resolution to screen-space size: <0.5m mesh → 512px max |
| No VRAM streaming | Texture not in BA2 | Always pack textures into BA2 archives — loose files bypass the streaming system |

**Texture resolution budget guidelines:**

| Asset type | Recommended max |
|---|---|
| Character face / armor (player-visible close-up) | 2K–4K |
| Major architecture (Diamond City walls) | 2K |
| Environment props (barrels, crates) | 512–1K |
| Ground/landscape tiles | 1K–2K |
| Distant clutter (debris, rubble) | 256–512 |

### Rule 4: Material Consolidation

Each unique BGSM/BGEM material = 1 draw call state change. If you have 50 variations of a single crate texture, you have 50 draw calls for that mesh type.

**Strategy**: use texture atlasing — combine multiple small material variants into a single large atlas texture, with UV coordinates pointing to different regions. This reduces unique material count and therefore draw calls.

Tool: **NifSkope** UV editor for manual atlasing, or Blender's **TexTools** addon for automated UV atlas baking.

### Rule 5: Shadow-Casting Limits

Every shadow-casting light source adds a full shadow map render pass. Budget your custom lights:

```ini
; In your ENB preset or Fallout4.ini
[Display]
; Vanilla: iShadowMapResolutionSecondary=1024
; For modded environments with many lights:
iShadowMapResolutionPrimary=2048      ; main shadow cascade
iShadowMapResolutionSecondary=512     ; secondary cascade (reduce if FPS-bound)
iMaxShadowLights=4                    ; cap shadow-casting lights visible at once
```

For custom cells: prefer **baked (prebaked) ambient light + 1–2 key shadow-casting lights** over 10+ dynamic shadow lights. Baked ambient = zero runtime cost; each shadow-casting light = significant GPU cost.

### Rule 6: Particle Effect Budget

Custom particle systems (smoke, fire, sparks) are expensive. Guidelines:
- Max **200 active particles** per effect in an area players will spend time in
- Use **LOD fade-out** (`fParticleLODDistance` in BGSM or in the EFSH record) — particles should disappear at 30–50m
- Prefer **GPU particles** (set `bGPUParticles=1` in the effect shader) — cheaper for static emitters

### Rule 7: Script Overhead

Heavy Papyrus scripts running in dense cells multiply performance problems. Rules:
- Use `RegisterForSingleUpdate` (one-shot) instead of `RegisterForUpdate` (continuous) wherever possible
- Cache references (`akTarget` stored in property) instead of `GetNearestActor()` on every cycle
- Maximum script update frequency for environmental effects: every 3–5 seconds
- Use `IsInCombat()` guard to disable non-combat scripts during combat (engine already under load)

### Profiling Tools

- **CLASSIC** (Crash Log AI Scanner): parses `Documents\My Games\Fallout4\F4SE\crash-*.log` to identify script heap exhaustion and rendering bottlenecks
- **Buffout 4** with `[Patches] MaxStdio = true` + `[Compatibility] F4EE = true`: exposes detailed FPS/frame time data in the log
- **ENB Frame Rate Display** (`enbseries.ini [PERFORMANCE] ShowFPS=true`): shows GPU/CPU frame time split

---

## 4. Maximum Visual Realism — Best Practices Summary

### The Realism Stack (2026)

```
GPU rendering
  → DLSS/DLAA 4 (PureDark)         — sharp native image, no TAA blur
       → ENB Series + ENB Extender  — PBR-correct tone mapping, weather vars
            → EMV preset             — ACES bloom + filmic tonemap
                 → Community Shaders — GGX specular, SSGI, extended BGSM
```

### Lighting Realism Checklist

- [ ] Every custom interior cell has **1 primary shadow-casting directional/point light** (the key light)
- [ ] Ambient fill via `ImageSpaceAdapter` + ENB ambient occlusion (no additional shadow lights needed)
- [ ] Emissive surfaces (screens, bioluminescent plants) use `emittanceMult` calibrated to luminance (0.5–3.0 for practical light sources; 10+ for dramatic glow)
- [ ] Weather transitions use `TESWeatherEvent` hook (C++) or `OnLocationChange` (Papyrus) to blend `ImageSpace` exposure settings
- [ ] All custom light sources have a matching `LIGH` record with correct radius, falloff exponent, and shadow flag

### Material Realism Checklist

- [ ] All diffuse textures in 50–240 sRGB albedo range (no over-bright or pitch-black diffuse)
- [ ] `_s.dds` R channel = 0.04 for dielectrics; G channel = 1 - roughness (not raw roughness)
- [ ] Normals in DirectX convention (green = up, not inverted)
- [ ] POM enabled for landscape/floor tiles via `SF2_PARALLAX_OCCLUSION` + `_h.dds` BC4
- [ ] Subsurface scattering (`SLSF1_SUBSURFACE_LIGHTING`) for thin organic surfaces (leaves, skin)

### Environment Realism Checklist

- [ ] Reverb assigned per-cell with appropriate RAO acoustic preset
- [ ] Footstep material maps set correctly in `BGSMaterialObject` (affects both sound and particle)
- [ ] Wind affects vegetation via `SF2_TREE_ANIM` + vertex color red-channel wind mask
- [ ] Custom worldspace uses `xLODGen` for terrain LOD + `DynDOLOD` for object LOD
- [ ] Far Harbor fog (if applicable) uses `TESWeatherEvent + fogNear` hook for dynamic density

### Movement Realism Checklist

- [ ] `HighFPSPhysicsFix.ini` configured: `fMaximumFramerate=0` (uncapped), `fHavokSpeed=60` (fixed physics step)
- [ ] Inertia Overhaul installed and configured: `fCarryWeightRatio=0.65`, `bEnableTurnLean=true`
- [ ] Power Armor exempt from inertia mod (`bDisableWithPowerArmor=true`)
- [ ] Custom animations include lean/stagger states keyed to `InertiaLeanLeft/Right` animation graph events

### Performance vs Realism — The Trade-Off Table

| Feature | Visual impact | FPS cost | Recommendation |
|---|---|---|---|
| 4K textures | High | Medium (VRAM) | Use for player-visible surfaces only |
| POM parallax | High (landscape) | Low–Medium | Enable for ground/floors, skip for props |
| SSGI | High (indirect bounce) | Medium | Enable at SSGIIntensity=0.3–0.4 |
| ENB SSAO | High (contact shadow) | Medium | Choose SSGI OR SSAO, not both |
| DLAA | High (sharp image) | Low–Medium | Always use on 4K monitors |
| Particle effects | Medium | High if uncapped | Max 200 particles/effect |
| Dynamic shadow lights | High | Very high | Max 2–3 per cell |
| Precombine rebuild | High (density) | Zero at runtime | Generate properly; never skip |
| Reverb (RAO) | Medium (immersion) | Very low | Always enable |
| LOD mesh generation | High (distance) | Zero at runtime | Always generate; no naked distance |

---

## 5. Quick Diagnostic — "My Mod Kills FPS"

**Step 1**: Enable Buffout 4 frame logging and walk through the affected area. Note whether FPS drops in a specific cell or at a specific distance.

**Step 2**: Disable your mod in MO2/Vortex and compare FPS. If FPS is the same, the issue is not your mod — it's the tool stack.

**Step 3**: If your mod causes the drop:
- Open your cell in CK. If > 50% of references are **not** greyed-out (not precombined), your cell needs precombine regeneration.
- Count unique materials in your cell via xEdit: `CELL → Persistent/Temporary Children → count unique BGSM paths`. If > 200, you need material consolidation or texture atlasing.

**Step 4**: Check CLASSIC logs for `ScrapHeap::Allocate` failures — these indicate too many Papyrus scripts or too many active references. Reduce `RegisterForUpdate` frequency or cap reference counts.

**Step 5**: Check texture packing — are your textures in a BA2? If not, pack them: `Archive2.exe -create -root:"Data\Textures\MyMod" -output:"Data\MyMod - Textures.ba2" -format:DX10`.

---

## 6. Tool Reference

| Tool | Purpose | Source |
|---|---|---|
| HighFPSPhysicsFix | Decouple Havok 60Hz from frame rate | Nexus |
| Inertia Overhaul | Weight-based movement momentum | Nexus (2026) |
| Reverb and Abundance Overhaul | Room-size/material reverb | Nexus |
| xLODGen | Terrain + object LOD generation | GitHub/Nexus |
| DynDOLOD | Dynamic LOD (animated objects) | GitHub/Nexus |
| Community Shaders | GGX specular, SSGI, extended BGSM | GitHub/Nexus |
| ENB Extender | Weather shader vars, shader caching | GitHub/Nexus |
| EMV ENB preset | ACES tone mapping, physical bloom | GitHub |
| DLSS/DLAA 4 (PureDark) | Replace vanilla TAA | Nexus |
| Buffout 4 | Crash guard + frame time logging | Nexus |
| CLASSIC | Crash log AI diagnostic | Nexus |
| Archive2 | BA2 packing for texture streaming | Bundled with CK |
