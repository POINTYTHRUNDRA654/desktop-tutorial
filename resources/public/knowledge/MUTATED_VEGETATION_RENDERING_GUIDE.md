# Mutated Vegetation — Advanced Engine-Level Rendering Guide for Fallout 4

A complete technical reference for moving past vanilla plastic-looking flora and achieving hyper-realistic mutated plants through CommonLibF4 shader hooks, PBR asset pipelines, LOD generation, and memory management.

---

## 1. Why Vanilla Flora Looks Like Plastic

Vanilla Fallout 4 flora uses:
- Flat diffuse + specular textures (no depth illusion)
- No subsurface scattering — leaves absorb all light rather than letting it bleed through
- Static vertex positions — no biomechanical wind response
- 512–1024px textures at most
- Single glow color with no micro-detail

Fixing each of these requires engine-level hooks, PBR-correct assets, and runtime shader property injection.

---

## 2. Parallax Occlusion Mapping (POM)

### What POM Does

POM makes a 2D texture appear to have real 3D depth by ray-marching into a height map. Used on bark, thick vines, crystalline mutant scales — anything with a complex surface that you want to look hyper-detailed without adding polygons.

### NifSkope / NIF Setup

Enable POM on a mesh by setting the correct shader flags on its `BSLightingShaderProperty`:

1. Open the NIF in NifSkope.
2. Find `BSLightingShaderProperty` → `Shader Flags 2`.
3. Enable flag `SF2_PARALLAX_OCCLUSION` (flag index 11).
4. Set `Parallax Inner Layer Thickness` (property field in the shader block) — start at `1.0`, increase for deeper illusion.
5. Add a height map in the `Parallax Inner Layer Texture` slot — this is a greyscale PNG/DDS where white = raised, black = recessed.

### CommonLibF4 Runtime Injection

Apply POM programmatically at runtime to every plant NIF that matches a keyword/form list:

```cpp
#include <RE/Fallout.h>

void ApplyPOMToPlantMesh(RE::NiAVObject* root)
{
    if (!root) return;

    RE::BSVisit::TraverseScenegraphGeometries(root,
        [](RE::BSGeometry* geo) -> RE::BSVisit::BSVisitControl {
            auto* effect = geo->GetGeometryRuntimeData().properties[1].get(); // index 1 = lighting shader
            auto* shader = netimmerse_cast<RE::BSLightingShaderProperty*>(effect);
            if (!shader) return RE::BSVisit::BSVisitControl::kContinue;

            auto* material = static_cast<RE::BSLightingShaderMaterialBase*>(shader->material);
            if (!material) return RE::BSVisit::BSVisitControl::kContinue;

            // Enable Parallax Occlusion Mapping shader flags
            shader->SetFlags(RE::BSShaderProperty::EShaderPropertyFlag::kParallax, true);
            shader->SetFlags(RE::BSShaderProperty::EShaderPropertyFlag::kParallaxOcclusion, true);

            // Set parallax scale (depth intensity)
            // BSLightingShaderMaterial has a parallaxScale field (float at offset varies by version)
            // Use Address Library to find exact offset if needed
            // material->parallaxScale = 1.5f;  // uncomment and adjust once offset is confirmed

            return RE::BSVisit::BSVisitControl::kContinue;
        });
}

// Call ApplyPOMToPlantMesh(actor->Get3D()) from your OnLoad / cell-change hook
```

> ⚠️ The exact field offsets inside `BSLightingShaderMaterial*` vary between Fallout 4 versions. Always resolve with Address Library + a binary differ rather than hardcoding. The flag approach above is safer.

### Height Map DDS Format

- Format: `BC4_UNORM` (single channel, compressed height)
- Size: match or exceed diffuse resolution (4096×4096 for highest quality)
- Mip maps: **required** — generate full mip chain in Photoshop/Substance/xNormal
- Naming convention: `\Textures\YourMod\PlantName\PlantName_h.dds` (the `_h` suffix is conventional)

---

## 3. Subsurface Scattering (SSS)

### What SSS Does

SSS simulates light bleeding through thin semi-translucent geometry — leaves, fungal caps, petals, thin bark. A leaf with proper SSS glows warm amber when a light source is behind it rather than going flat grey.

### Enabling SSS in the NIF

1. In NifSkope, select `BSLightingShaderProperty` → `Shader Type`: set to `Multilayer Parallax` or use the standard type with `SF1_SUBSURFACE_LIGHTING` flag enabled.
2. Enable `Shader Flags 1` → `SLSF1_SUBSURFACE_LIGHTING` (flag 21).
3. Set `Subsurface Rolloff` — range 0.0–1.0. Values near 0.3–0.5 work well for leaves.
4. The SSS colour comes from the diffuse texture's alpha channel in some configurations, or from a dedicated skin/translucency tint color in the material.

### CommonLibF4 SSS Hook

```cpp
void ApplySSSToLeafMesh(RE::NiAVObject* root, const RE::NiColorA& subsurfaceTint, float rolloff)
{
    RE::BSVisit::TraverseScenegraphGeometries(root,
        [&](RE::BSGeometry* geo) -> RE::BSVisit::BSVisitControl {
            auto* shader = netimmerse_cast<RE::BSLightingShaderProperty*>(
                geo->GetGeometryRuntimeData().properties[1].get());
            if (!shader) return RE::BSVisit::BSVisitControl::kContinue;

            // Set SLSF1_SUBSURFACE_LIGHTING flag
            shader->SetFlags(RE::BSShaderProperty::EShaderPropertyFlag::kSubsurfaceLighting, true);

            // Tint and rolloff — written into the material struct
            // (exact field layout verified via Address Library)
            auto* mat = static_cast<RE::BSLightingShaderMaterialBase*>(shader->material);
            if (mat) {
                // mat->subsurfaceRolloff = rolloff;        // once offset confirmed
                // mat->subsurfaceTintColor = subsurfaceTint;
            }
            return RE::BSVisit::BSVisitControl::kContinue;
        });
}
```

### Leaf Texture Setup for SSS

- **Diffuse map** (`_d.dds`): standard RGBA. The **alpha channel** controls translucency mask (white = fully translucent, black = opaque).
- **Normal map** (`_n.dds`): DirectX convention (green channel Y-up). Keep it for leaf micro-surface detail.
- **Specular / roughness map** (`_s.dds`): R=specular strength, G=roughness, B=metalness (0 for leaves).
- **Subsurface color**: often baked into a separate `_sk.dds` or controlled by material tint.

---

## 4. Dynamic Wind Vertex Deformation

### Vanilla Wind vs. Engine-Level Wind

Vanilla Fallout 4 plants use a scroll-shader approximation — the texture offsets slightly, but vertices stay fixed. Real-looking wind requires vertex shader driven by weather intensity.

### NIF Vertex Color Wind Encoding

The Creation Engine's wind deformation is driven by **vertex color channels** on the mesh:
- **Red channel**: wind influence weight (0 = rooted, 255 = maximum sway)
- Leaves and vine tips: red = 255
- Stem base / root: red = 0 (stays planted)

In Blender: vertex paint red channel to encode flexibility. Export with vertex colors via the NIF plugin.

### BSLightingShaderProperty Wind Flag

In NifSkope, enable on the plant's shader:
- `Shader Flags 1` → `SLSF1_VERTEX_ALPHA` — allows vertex color channel to influence the shader
- `Shader Flags 2` → `SF2_TREE_ANIM` — enables the engine's tree wind deformation vertex shader

The engine automatically drives the `SF2_TREE_ANIM` shader using its internal wind speed / direction values pulled from weather and wind override records.

### CommonLibF4 Wind Intensity Hook

To make plant sway more violent during storms or in the Glowing Sea:

```cpp
// TESWeather exposes wind speed — read it and push to a custom shader constant
void UpdatePlantWindIntensity()
{
    auto* sky = RE::Sky::GetSingleton();
    if (!sky || !sky->currentWeather) return;

    const float windSpeed = sky->currentWeather->data.windSpeed; // 0–1 normalized
    const float glowingSeaBoost = IsInGlowingSea() ? 1.8f : 1.0f;
    const float windIntensity = std::clamp(windSpeed * glowingSeaBoost, 0.0f, 1.0f);

    // Write to a custom BSShaderAccumulator float to scale tree anim amplitude
    // (exact mechanism: override BSTreeNode::windMagnitude via REL hook)
    // For a simpler approach, Papyrus SetActorValue on wind-related AV or use
    // BSScript native to set a global that your HLSL shader reads.
    F4SE::log::debug("Wind intensity: {:.2f}", windIntensity);
}
```

---

## 5. Hyper-Detailed Asset Pipeline

### Photogrammetry Workflow

1. **Scan**: Use Meshroom (open source) or Reality Capture to scan real bark, exotic mushrooms, or garden specimens.
2. **Clean**: Process in ZBrush or Blender — decimate to target polygon count, fix topology.
3. **Bake**: In Substance Painter or Marmoset Toolbag, bake from high-poly scan to low-poly game mesh: normal, AO, curvature, thickness.
4. **Export**: 4096×4096 or 8192×8192 DDS. FO4 supports up to 4K natively; 8K requires ENB.

### PBR Texture Set for Mutated Flora

| Map | DDS format | Notes |
|---|---|---|
| Diffuse (`_d.dds`) | `BC3_UNORM` (RGBA) | Base color + alpha for translucency |
| Normal (`_n.dds`) | `BC5_UNORM` (RG) | DirectX-convention normals (green flipped) |
| Specular/Roughness (`_s.dds`) | `BC3_UNORM` | R=spec, G=gloss, B=metal, A=glow mask |
| Glow mask (`_g.dds`) | `BC3_UNORM` | Controls which areas emit light |
| Height/parallax (`_h.dds`) | `BC4_UNORM` | Greyscale height for POM |
| AO (`_ao.dds`) | `BC4_UNORM` | Optional — can be baked into diffuse |

### Calibration for Mutated vs. Organic Parts

- **Woody / bark regions**: roughness 0.75–0.9, metalness 0.0, low specular. Normal map shows deep cracks.
- **Slimy / wet mutant growth**: roughness 0.05–0.2, metalness 0.0, high specular (0.7). Normal map shows smooth blobs.
- **Crystalline protrusions**: roughness 0.0–0.05, metalness 0.6–0.9. Normal map shows facets.
- **Bioluminescent veins**: encode in glow map (`_g.dds`). Color those vein regions bright lime-green or cyan on the glow map.

### Substance Painter Smart Material Recipe (Flora)

1. **Base** layer: bark texture fill, roughness 0.85, height variation.
2. **Slimy growth** layer: mask by curvature (concave), roughness 0.1, diffuse olive/black.
3. **Crystal growth** layer: mask by convex curvature, roughness 0.0, metalness 0.8, pale blue tint.
4. **Bioluminescent veins** layer: mask by height ridges, emissive 1.0, lime green, export to `_g.dds`.
5. **Damage/burn marks** layer: optional, AO-masked.

---

## 6. Enhanced Glow Maps with Micro-Detail

### High-Resolution Glow Mask

Instead of a flat solid-color glow, use a high-frequency glow map that follows the biological structure:

1. In Substance Painter, create a glow mask layer.
2. Paint bright white only along **vein paths** and **bioluminescent nodules** — not the whole leaf.
3. Export this as your `_g.dds` emissive map (`BC3_UNORM`, full mip chain).
4. In NifSkope, assign `_g.dds` to the `Glow Map` slot in `BSLightingShaderProperty`.
5. Set `Emissive Color` to your target hue (e.g., lime green: RGB 0.3, 1.0, 0.2) and `Emissive Multiple` to ~1.5–2.0.

### Pulsing Glow Synchronized to Breathing Animation

Synchronize the glow pulse to the plant's idle breathing animation using F4SE's animation event system:

```cpp
// Register an animation graph event sink on the plant actor
class PlantAnimEventSink : public RE::BSTEventSink<RE::BSAnimationGraphEvent>
{
public:
    RE::FormID plantFormID;

    RE::BSEventNotifyControl ProcessEvent(
        const RE::BSAnimationGraphEvent* event,
        RE::BSTEventSource<RE::BSAnimationGraphEvent>*) override
    {
        if (!event) return RE::BSEventNotifyControl::kContinue;

        // The idle breathing animation fires a custom event tag at peak inhale
        if (event->tag == "PlantBreatheIn") {
            auto* plant = RE::TESForm::LookupByID<RE::Actor>(plantFormID);
            if (plant) PulseGlowMap(plant, 2.5f); // boost emittanceMult on inhale
        } else if (event->tag == "PlantBreatheOut") {
            auto* plant = RE::TESForm::LookupByID<RE::Actor>(plantFormID);
            if (plant) PulseGlowMap(plant, 0.8f); // dim on exhale
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

void PulseGlowMap(RE::Actor* plant, float targetMult)
{
    auto* root = plant->Get3D();
    if (!root) return;
    ShaderInjection::SetEmittanceRecursive(root,
        RE::NiColorA{ 0.3f, 1.0f, 0.2f, 1.0f }, targetMult);
}
```

In your HKX behavior graph, add annotation tags `PlantBreatheIn` and `PlantBreatheOut` at the appropriate frames of the idle animation. The C++ event sink fires each time those frames play, keeping the glow perfectly in sync with the visual chest-rise.

---

## 7. LOD Generation

High-poly plants **must** have LOD models or the engine will attempt to render full detail at all distances, causing severe frame-rate drops and potential LOD pop-in.

### xLODGen / DynDOLOD Workflow

1. **LOD0** (full detail, 0–512 game units): your high-poly mesh.
2. **LOD1** (medium, 512–2048 units): ~50% of LOD0 triangles, reduced texture res (2K).
3. **LOD2** (low, 2048–8192 units): ~10% of LOD0, 1K billboard or simple mesh.
4. **LOD3** (billboard, >8192 units): flat billboard card with a pre-rendered texture.

```
Data\Meshes\YourMod\PlantName\
  PlantName.nif          ← LOD0 (full)
  PlantName_lod1.nif     ← LOD1
  PlantName_lod2.nif     ← LOD2
  PlantName_lod3.nif     ← LOD3 billboard
```

### STAT Record LOD Setup in CK

1. Open your STAT record in CK.
2. Under `Model`, assign `PlantName.nif`.
3. Under `LOD`, assign LOD1/2/3 models.
4. Set transition distances matching the values above.

### xLODGen Auto-Generation

For bulk auto-generation across your worldspace:

```bash
xLODGen.exe -fo4 -lodgen -o "Output\LOD" -b 10
```

xLODGen reads your worldspace cells, finds all your STAT plant references, and generates combined LOD atlases. Merge the output BA2 into your mod.

### DynDOLOD Rules for Custom Plants

Add a custom rule in `DynDOLOD_FO4.ini`:

```ini
[PlantName.nif]
Billboard=1
IsTree=1
LODLevel=3
UVRange=512
```

---

## 8. Memory Management — Buffout 4 / Script Heap Fix

### Why High-Detail Flora Causes Crashes

FO4's default Papyrus script heap is `~256 MB`. High-density custom plants with per-instance scripts (state machine, glow pulse) rapidly exhaust this. The crash manifests as:

```
EXCEPTION_ACCESS_VIOLATION
[Papyrus] Script stack overflow / out-of-memory
```

### Buffout 4 (Required)

**Buffout 4** (by alandtse / Ryan-rsm-McKenzie) patches engine memory and fixes several heap limits. It is essential for any mod with high-poly flora.

- Download: [https://www.nexusmods.com/fallout4/mods/47359](https://www.nexusmods.com/fallout4/mods/47359)
- Requires: Address Library, F4SE

**`Buffout4.toml` settings for flora-heavy mods:**

```toml
[Patches]
ActorIsHostileToActor = true
BSTextureStreamerLocalHeap = true
HangingMarker = true
MemoryManager = true          # replaces CRT allocator with mimalloc — big win
ScaleformAllocator = true
SmallBlockAllocator = true

[Fixes]
PipboyLightInvEdge = true
SafeExit = true

[Warnings]
CreateTexture2D = true

[Experimental]
MemoryManagerLargeHeap = false   # enable if still crashing; may conflict with some ENBs
```

### Papyrus Heap Configuration (`Fallout4.ini`)

Increase Papyrus heap for script-heavy flora:

```ini
[Papyrus]
fPostLoadUpdateTimeMS=500.0
iMaxAllocatedMemoryBytes=536870912    ; 512 MB (default 256 MB)
iMinMemoryPageSize=128
iMaxMemoryPageSize=512
iMaxArraySize=500000
```

### Script Optimization for Flora Instances

Per-plant scripts accumulate fast across a dense worldspace. Optimization rules:

1. **Unregister immediately**: always `UnregisterForUpdate()` in `OnEndState()` — never leave stale registrations.
2. **One script per base**: use a Quest-level management script to iterate plant instances rather than a full state machine per reference. Only the plant's reference script tracks lightweight state (int).
3. **Coalesce update ticks**: register at 1.0 s (not 0.1 s) for Papyrus polls. Let C++ hooks handle sub-second detection.
4. **Avoid `OnUpdate` on dead plants**: check `IsDead()` at the top of every `OnUpdate` and unregister immediately if true.

```papyrus
; Minimal per-reference script for flora instances
Scriptname PlantInstanceRef extends ObjectReference

int gState = 0  ; 0=dormant, 1=alert, 2=attacking, 3=dead
Quest Property EcosystemManager Auto

Event OnLoad()
    if gState != 3  ; not dead
        EcosystemManager.RegisterPlant(self)
    endif
EndEvent

Event OnDeath(Actor akKiller)
    gState = 3
    EcosystemManager.UnregisterPlant(self)
EndEvent
```

Quest-level manager:

```papyrus
; PlantEcosystemManager.psc — one per worldspace
Scriptname PlantEcosystemManager extends Quest

ObjectReference[] Property gPlants Auto Hidden
int gPlantCount = 0

Function RegisterPlant(ObjectReference akPlant)
    gPlants[gPlantCount] = akPlant
    gPlantCount += 1
EndFunction

Function UnregisterPlant(ObjectReference akPlant)
    ; Compact array — standard Papyrus pattern
    int idx = gPlants.Find(akPlant)
    if idx >= 0
        gPlants[idx] = gPlants[gPlantCount - 1]
        gPlantCount -= 1
    endif
EndFunction
```

---

## 9. F4SE Anim Hook — Glow Sync to Breathing

> See section 6 above for the full event sink implementation. This is the summary workflow:

1. In your HKX idle animation for the plant, add two annotation events:
   - `PlantBreatheIn` at frame 15 (peak inhale)
   - `PlantBreatheOut` at frame 45 (peak exhale)
2. Register `PlantAnimEventSink` on the plant actor in your F4SE plugin's `OnLoad` hook.
3. When `PlantBreatheIn` fires, set `emittanceMult = 2.5`; on `PlantBreatheOut`, set `emittanceMult = 0.8`.
4. Result: the glow visibly pulses with each breath, giving a living, biological feel.

---

## 10. Quick-Reference Checklist

| Feature | Tool / Method | Key Setting |
|---|---|---|
| Parallax Occlusion Mapping | NifSkope + CommonLibF4 | `SF2_PARALLAX_OCCLUSION` flag, `_h.dds` height map |
| Subsurface Scattering | NifSkope + CommonLibF4 | `SLSF1_SUBSURFACE_LIGHTING`, rolloff 0.3–0.5 |
| Wind vertex deformation | Blender (vertex paint R channel) + NIF `SF2_TREE_ANIM` | Red=1 at tips, Red=0 at root |
| 4K/8K PBR textures | Substance Painter / Photoshop | BC3/BC4/BC5 DDS, full mip chain |
| Micro-detail glow mask | Substance Painter emissive layer | Export `_g.dds`, vein paths only |
| Glow sync to animation | F4SE `BSAnimationGraphEvent` sink | Tags `PlantBreatheIn` / `PlantBreatheOut` in HKX |
| LOD generation | xLODGen / DynDOLOD | LOD0→LOD3, billboard at >8192 units |
| Memory management | Buffout 4 + `Fallout4.ini` Papyrus heap | `iMaxAllocatedMemoryBytes=536870912` |
| Script heap optimization | Papyrus quest-level manager | Unregister dead, coalesce ticks to 1.0 s |

---

## 11. Common Pitfalls

- **BC5 normals green channel**: FO4 uses DirectX convention — flip green in Photoshop (`Curves → Green → Invert`) before export, otherwise normals point the wrong way
- **Missing mip chain**: POM and SSS without full mip chains cause visible shimmering at distance — always generate mips
- **POM on thin leaves**: POM is for thick surfaces only; applying it to leaf cards causes severe texture stretching — use SSS + normal maps for leaves instead
- **SF2_TREE_ANIM without vertex paint**: the flag enables the vertex shader but without weighted vertex colors, every vertex sways equally, breaking the illusion
- **BSAnimationGraphEvent sink not removed on death**: memory leak if you don't unregister the sink in `OnDeath` / actor destructor
- **Buffout 4 MemoryManager + old ENB**: some pre-2024 ENB binaries conflict with Buffout 4's mimalloc — always use ENB 0.493+ with Buffout 4
- **xLODGen without output merged to BA2**: LOD meshes placed loose in Data folder conflict with MO2 mod order — always pack into a BA2
