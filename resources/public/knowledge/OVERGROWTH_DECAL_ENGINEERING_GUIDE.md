# Overgrowth Decal Engineering Guide for Fallout 4 Mods (2026)

Standard FO4 decals are flat projections — good for blood or bullet holes, but useless for convincing overgrowth. Moss, vines, ivy, and cracked-earth creep must appear to have physical volume, soft organic edges, and gentle movement. This guide documents the complete F4SE + CommonLibF4 C++ pipeline for upgrading the decal system to support overgrowth aesthetics: POM/parallax height, depth-based soft-edge blending, procedural placement, wind animation vectors, and memory pool expansion.

---

## 1. Why Vanilla Decals Fail for Overgrowth

FO4's BSDecalNode/BSShaderProperty pipeline is optimized for:
- Flat impact markers (bullet holes, blood)
- Simple projected textures with binary edges

Overgrowth requires:
- **Physical depth/volume** — moss should look fuzzy and 3D, not painted on
- **Soft biological edges** — ivy fades out where it meets concrete; it doesn't hard-clip
- **Dynamic placement** — manually placing thousands of moss decals is impractical
- **Wind response** — static decals break immersion in a world with moving trees/grass
- **Scale** — post-apocalyptic nature reclamation means 10–50× more decals than vanilla

All five gaps require engine hooks via F4SE + CommonLibF4.

---

## 2. POM (Parallax Occlusion Mapping) on Decals

### Why Decals Don't Get POM by Default

The vanilla decal shader path uses `BSDecalNode` which routes through a simplified lighting path — it skips the `SF2_PARALLAX_OCCLUSION` code path entirely even if the flag is set in the NIF. The fix is to redirect decal shader initialization to a custom hook that forces the full `BSLightingShaderProperty` path.

### Essential C++ Headers

```cpp
// CommonLibF4 reverse-engineered headers (search github.com/Ryan-rsm-McKenzie/CommonLibF4)
#include "RE/B/BSLightingShaderProperty.h"
#include "RE/B/BSShaderProperty.h"
#include "RE/B/BSDecalNode.h"
#include "RE/B/BSShaderTextureSet.h"
#include "RE/B/BSGeometry.h"
#include "RE/B/NiAVObject.h"
```

### Hook: Force Full Lighting Path on Decal Shaders

Using Detours/xbyak via F4SE (include in your CMakeLists via vcpkg):

```cpp
// Hook BSDecalNode::SetupMaterial to inject POM flags
namespace OvergrowthDecals {

    // Address Library ID for BSDecalNode::SetupMaterial
    // Look up in Fallout4 Address Library (github.com/nikitalita/address_library)
    // or search the ida/ghidra database for "BSDecalNode" symbol
    static constexpr REL::ID kSetupMaterialID{ 42815 }; // example — verify in Address Library

    using SetupMaterial_t = void(*)(RE::BSDecalNode*, RE::BSShaderProperty*, RE::BSGeometry*);
    static SetupMaterial_t OrigSetupMaterial = nullptr;

    void HookedSetupMaterial(
        RE::BSDecalNode* a_decalNode,
        RE::BSShaderProperty* a_prop,
        RE::BSGeometry* a_geom)
    {
        // Call original first to let engine set up base material
        OrigSetupMaterial(a_decalNode, a_prop, a_geom);

        // Cast to BSLightingShaderProperty to access extended flags
        auto* lightingProp = skyrim_cast<RE::BSLightingShaderProperty*>(a_prop);
        if (!lightingProp) return;

        // Check if this is an overgrowth decal (identified by keyword in BSGeometry name)
        std::string geomName = a_geom->name.c_str();
        if (geomName.find("OG_MOSS") == std::string::npos &&
            geomName.find("OG_IVY") == std::string::npos &&
            geomName.find("OG_VINE") == std::string::npos) return;

        // Force POM shader flags
        using ShaderFlags2 = RE::BSLightingShaderProperty::EShaderPropertyFlag2;
        lightingProp->flags.set(ShaderFlags2::kParallaxOcclusion);
        lightingProp->flags.set(ShaderFlags2::kAnisotropicLighting); // better for fibrous moss

        // Set parallax depth scale (height map amplitude)
        lightingProp->parallaxOcclusionMaxPasses = 16;   // sample steps (8=fast, 32=high quality)
        lightingProp->parallaxOcclusionScale = 0.04f;    // depth amplitude: 0.02=shallow, 0.08=deep moss
    }

    void Install() {
        REL::Relocation<SetupMaterial_t> target{ kSetupMaterialID };
        SKSE::GetTrampoline().write_call<5>(target.address(), &HookedSetupMaterial);
        OrigSetupMaterial = target.address(); // store original
        logger::info("OvergrowthDecals: POM hook installed");
    }
}
```

### Texture Setup for Decal POM

Your moss/ivy decal NIFs must have a height map in the correct slot:

```
BSShaderTextureSet slots for POM decals:
  Slot 0: _d.dds   (diffuse — RGB color, A = alpha mask)
  Slot 1: _n.dds   (normal map — RG = XY normals, B = height map if using BC3)
  
  For explicit height slot (if BSShaderTextureSet is extended via your C++ hook):
  Slot 3: _h.dds   (dedicated height map — BC4 single channel, white=raised, black=sunken)

Height map content for moss:
  - White (high) = pillow/clump tops (raised moss heads)
  - Grey (mid) = moss mat surface
  - Black (low) = gaps between moss clusters, crevices
  
  Create in Substance Painter:
  - AO-inverted for height base (cavities = low)
  - Hand-paint pillow bumps on top of AO
  - Export as 16-bit greyscale, convert to BC4 DDS
```

---

## 3. Depth-Based Soft Edge Blending

### The Problem

Hard decal edges are the #1 realism killer for overgrowth. The standard alpha cutoff creates a perfect circle/rectangle boundary where moss stops — nothing in nature does that.

### The Solution: Depth Difference Blending

Hook into the decal shader to sample the scene depth buffer at the decal pixel and compare it to the decal's own depth. Where they are nearly equal (the decal is right at the surface), blend normally. At projected edges where depth diverges, fade the alpha.

```cpp
// Inject custom HLSL logic via ENB enbeffect.fx OR via a shader replacement DLL
// The cleaner F4SE approach: hook BSLightingShaderProperty::GetDepthBias

namespace DecalSoftEdge {
    
    // In your custom enbeffect.fx (no C++ needed — ENB approach):
    /*
    float SoftDecalBlend(float decalDepth, float sceneDepth, float blendRange) {
        float depthDiff = abs(decalDepth - sceneDepth);
        return saturate(1.0 - (depthDiff / blendRange));
    }
    */

    // C++ approach: patch the decal normal tolerance
    // BSDecalNode stores fNormalTolerance — higher = wraps around corners better
    static constexpr REL::ID kDecalNormalToleranceOffset{ 0x128 }; // offset into BSDecalNode struct

    void PatchNormalTolerance(RE::BSDecalNode* a_node, float a_tolerance = 0.65f) {
        // Write tolerance directly — vanilla is 0.0 (strict normal alignment)
        // 0.65 = decal wraps 65% around curved/angled surfaces (vine following wall edge)
        auto* tolerancePtr = reinterpret_cast<float*>(
            reinterpret_cast<uintptr_t>(a_node) + kDecalNormalToleranceOffset);
        *tolerancePtr = a_tolerance;
    }
}
```

### ENB Soft Decal Blending (No C++ — simpler)

In `enbeffect.fx`, add a post-process depth-fade pass over decals:

```hlsl
// Soft decal edge blending in enbeffect.fx
// Requires ENB depth buffer access (bDepthBufferAvailable=true in enblocal.ini)

float4 SoftDecalPass(VS_OUTPUT IN) : SV_Target {
    float4 color = tex2D(TextureColor, IN.texcoord);
    float depth = tex2D(TextureDepth, IN.texcoord).r;
    
    // Reconstruct world depth from depth buffer
    float linearDepth = LinearizeDepth(depth);
    
    // Sample depth one pixel offset (approximates geometry edge)
    float depthOffset = tex2D(TextureDepth, IN.texcoord + float2(0.001, 0.0)).r;
    float edgeMask = saturate(abs(linearDepth - LinearizeDepth(depthOffset)) / 0.5);
    
    // Where depth changes rapidly (edges), fade overgrowth decals
    // This requires decal layer mask — approximated by green channel for overgrowth
    float decalMask = color.g * 0.3; // green-dominant = moss
    color.a *= lerp(1.0, 0.0, edgeMask * decalMask * fSoftDecalStrength);
    
    return color;
}
```

Config in your ENB preset:
```ini
fSoftDecalStrength=0.8   ; 0=hard edges, 1.0=maximum softening
```

---

## 4. Procedural Decal Placement via F4SE

Manually placing every moss clump across an entire Commonwealth overhaul is infeasible. The F4SE approach: scan geometry at runtime and auto-place decals matching biological rules.

### Placement Rules for Moss/Overgrowth

| Surface condition | Decal | Placement frequency |
|---|---|---|
| Concrete + N-facing (shade) | Dense moss | 60% |
| Concrete + S-facing (sun) | Sparse lichen | 20% |
| Rock + any facing | Moss + dirt | 40% |
| Wood + wet cell | Algae/mold | 50% |
| Metal + exposed exterior | Rust + lichen | 30% |
| Asphalt + any | Crack-weed | 15% |

### Papyrus Procedural Placement Script

```papyrus
; OvergrowthDecalPlacer.psc
; Run at cell load — places overgrowth decals on qualifying surfaces
Scriptname OvergrowthDecalPlacer extends Quest

; Decal references — fill in CK with your custom OMOD/Static decal objects
ObjectReference Property MossDecalDense Auto
ObjectReference Property MossDecalSparse Auto
ObjectReference Property LichenDecal Auto
ObjectReference Property CrackWeedDecal Auto

Float Property PlacementRadius = 2000.0 Auto  ; scan radius (game units) around player
Float Property DecalHeightOffset = 2.0 Auto   ; offset from surface to prevent z-fighting

; Called by cell load hook (RegisterForCellAttach or quest alias)
Event OnCellAttach()
    ; Get all statics in radius
    ObjectReference[] statics = Game.GetPlayer().FindAllReferencesWithKeyword(
        Game.GetForm(0x[ConcreteMaterialKW]) as Keyword, PlacementRadius)
    
    Int i = 0
    While (i < statics.Length)
        ObjectReference surf = statics[i]
        Float rng = Utility.RandomFloat(0.0, 100.0)
        
        ; North-facing surfaces (normal.y < -0.5 approximates N-face in worldspace)
        Float surfAngle = surf.GetAngleZ()
        Bool isNorthFacing = (surfAngle > 135.0 && surfAngle < 225.0)
        
        If (isNorthFacing && rng < 60.0)
            ; Place dense moss decal on this surface
            ObjectReference placed = Game.GetPlayer().PlaceAtMe(MossDecalDense)
            placed.MoveTo(surf, 0.0, 0.0, DecalHeightOffset)
            placed.SetAngle(surf.GetAngleX(), surf.GetAngleY(), surf.GetAngleZ())
        ElseIf (!isNorthFacing && rng < 20.0)
            ObjectReference placed = Game.GetPlayer().PlaceAtMe(LichenDecal)
            placed.MoveTo(surf, 0.0, 0.0, DecalHeightOffset)
        EndIf
        
        i += 1
    EndWhile
EndEvent
```

### F4SE Native Placement Function (C++ — more accurate)

For precise surface-normal detection (Papyrus can't query geometry normals):

```cpp
// OvergrowthPlacer.cpp
namespace OvergrowthPlacer {

    struct PlacementResult {
        RE::NiPoint3 position;
        RE::NiPoint3 normal;
        RE::BSMaterial* material;
    };

    // Raycast from above to find surface normal at point
    std::optional<PlacementResult> RaycastSurface(
        const RE::NiPoint3& origin,
        const RE::NiPoint3& direction,
        float maxDistance)
    {
        // Use Havok bhkWorld raycasting
        auto* worldSpace = RE::TES::GetSingleton()->worldSpace;
        if (!worldSpace) return std::nullopt;

        RE::bhkPickData pickData;
        pickData.rayInput.from = { origin.x / 7.f, origin.y / 7.f, origin.z / 7.f }; // Havok units
        RE::NiPoint3 rayEnd = origin + direction * maxDistance;
        pickData.rayInput.to = { rayEnd.x / 7.f, rayEnd.y / 7.f, rayEnd.z / 7.f };

        // Filter: only hit static objects
        pickData.rayInput.filterInfo = RE::CollisionLayer::kStatic;

        if (worldSpace->GetbhkWorld()->PickObject(pickData)) {
            PlacementResult result;
            result.position = {
                pickData.rayOutput.normal.quad.m128_f32[0] * 7.f,
                pickData.rayOutput.normal.quad.m128_f32[1] * 7.f,
                pickData.rayOutput.normal.quad.m128_f32[2] * 7.f
            };
            result.normal = {
                pickData.rayOutput.normal.quad.m128_f32[0],
                pickData.rayOutput.normal.quad.m128_f32[1],
                pickData.rayOutput.normal.quad.m128_f32[2]
            };
            return result;
        }
        return std::nullopt;
    }

    // Determine if this surface normal qualifies for moss
    bool IsNorthShade(const RE::NiPoint3& normal) {
        // North-facing in FO4 worldspace = negative Y axis
        // 0.4 threshold = within 66° of north-facing (generous for moss growth)
        return normal.y < -0.4f && normal.z > 0.2f; // not pointing straight down
    }

    // Place overgrowth decal at point
    void PlaceDecalAt(
        const PlacementResult& surface,
        RE::TESForm* decalForm,
        RE::TESObjectCELL* cell)
    {
        // Use F4SE PlaceAtMe equivalent via CreateReference
        RE::NiMatrix3 rot;
        RE::NiMath::BuildRotationMatrix(rot, surface.normal); // align to surface
        
        // Create reference at surface position + small offset
        RE::NiPoint3 spawnPos = surface.position + surface.normal * 2.0f;
        cell->PlaceRef(decalForm, spawnPos, rot);
    }
}
```

---

## 5. Wind Animation on Decals

Static decals in a world with moving grass and trees break immersion. The fix: inject wind vector data from the WTHR weather system into the decal vertex shader.

### BSLightingShaderProperty Wind Vector Injection

```cpp
// Inject weather wind vector into decal shader constant buffer
namespace DecalWindAnim {

    // Called each frame — update decal wind shader parameter
    void UpdateDecalWindVector(RE::BSLightingShaderProperty* a_prop, float a_deltaTime) {
        // Get current weather wind from TESWeather
        auto* currentWeather = RE::Sky::GetSingleton()->currentWeather;
        if (!currentWeather) return;

        float windSpeed = currentWeather->data.windSpeed;
        float windAngle = currentWeather->data.windDirection * 0.01745f; // degrees to radians

        // Build wind vector
        float windX = std::cos(windAngle) * windSpeed;
        float windY = std::sin(windAngle) * windSpeed;

        // Modulate amplitude by decal type — ivy sways less than grass decals
        float decalWindMult = 0.3f; // 30% of grass wind effect for hanging decals

        // Write to shader property extra data
        // BSLightingShaderProperty has a custom float[4] params slot accessible via:
        a_prop->materialAlpha = windX * decalWindMult;  // repurpose for wind X
        // Note: proper approach is to write to a named NiExtraData float controller
        // attached to the decal node (more stable than patching material floats)
        
        auto* windData = static_cast<RE::NiFloatExtraData*>(
            a_prop->GetExtraData("WindX"));
        if (windData) windData->value = windX * decalWindMult;
    }
}
```

### Vertex Shader Wind Animation (HLSL)

In your custom vertex shader for overgrowth decals (replace via ENB shader override or F4SE shader hook):

```hlsl
// Overgrowth decal vertex wind deformation
cbuffer WindParams : register(b5) {
    float2 WindVector;    // injected by C++ hook
    float WindTime;       // GameTime from ENB/engine
    float WindFrequency;  // wave frequency (0.5=gentle, 2.0=strong)
};

VS_OUTPUT main(VS_INPUT IN) {
    VS_OUTPUT OUT;
    
    // Base transform
    float4 worldPos = mul(World, float4(IN.position, 1.0));
    
    // Wind vertex deformation — only affects top vertices (high V in UV)
    // UV.y near 0 = base of decal (anchored), UV.y near 1 = tip (free to move)
    float windMask = IN.uv.y; // assumes decal UV: 0=base, 1=tip
    
    float windOffset = sin(WorldPosition.x * WindFrequency + WindTime * 3.0) * WindVector.x
                     + cos(WorldPosition.y * WindFrequency + WindTime * 2.7) * WindVector.y;
    
    worldPos.xy += windOffset * windMask * 2.0; // 2.0 = max sway in game units
    
    OUT.position = mul(ViewProjection, worldPos);
    OUT.uv = IN.uv;
    return OUT;
}
```

**Important**: Anchor UV convention — for hanging vine/ivy decals, place UV origin at the attachment point. The top UV row (v=0) should be the wall-attached anchor; the bottom row (v=1) should be the free-swinging tip.

---

## 6. Decal Memory Pool Expansion

### The Vanilla Bottleneck

Vanilla FO4 limits active decals to 250–500. An overgrown Commonwealth with procedural moss placement needs 2,000–8,000 concurrent decals. Without expanding the pool, decals pop out or fail to spawn entirely.

### INI Method (No Code — Quick Fix)

```ini
; Fallout4.ini [Decals] section
iMaxDecals=4000           ; raise from vanilla 500
iMaxDecalsPerFrame=20     ; allow more decals to register per frame (vanilla=5)
fDecalLifetime=0          ; 0=permanent (moss doesn't fade)
fDecalLODFadeDistance=3000 ; start fading overgrowth at 3K units (not 2K vanilla)
```

**Trade-off**: 4,000 active decals at 1 draw call each = significant GPU overhead. Mitigate with:
- Precombine overgrowth decals wherever possible (bakes them into static geometry = 0 draw calls)
- Use decal atlases (one 4K atlas texture with 16 decal variants = 1 texture bind for all 16)

### F4SE C++ Memory Pool Patch

For runtime control (MCM slider → pool size):

```cpp
// Patch the engine's decal pool allocation count
namespace DecalPoolPatch {

    static constexpr REL::ID kMaxDecalsGlobalID{ 519456 }; // verify in Address Library
    static constexpr REL::ID kMaxDecalsPerFrameID{ 519457 };

    void SetMaxDecals(int maxDecals, int maxPerFrame) {
        REL::Relocation<int*> maxDecalsPtr{ kMaxDecalsGlobalID };
        REL::Relocation<int*> maxPerFramePtr{ kMaxDecalsPerFrameID };
        
        *maxDecalsPtr = maxDecals;
        *maxPerFramePtr = maxPerFrame;
        
        logger::info("Decal pool: max={}, perFrame={}", maxDecals, maxPerFrame);
    }

    // Called from MCM via F4SE messaging
    void OnMCMUpdate(int qualityLevel) {
        switch (qualityLevel) {
            case 0: SetMaxDecals(1000, 10); break; // Low
            case 1: SetMaxDecals(2500, 15); break; // Medium
            case 2: SetMaxDecals(5000, 25); break; // High
            case 3: SetMaxDecals(8000, 40); break; // Ultra (high-end GPU only)
        }
    }
}
```

---

## 7. Decal Atlas for Overgrowth Efficiency

Instead of individual textures per moss variant, pack all variants into a single atlas:

```
Atlas layout (4K DDS BC3):
  Row 0: MossDense_01, MossDense_02, MossLight_01, MossLight_02  (4 cells × 1K each)
  Row 1: IvyLeaf_01, IvyLeaf_02, VineSegment_01, VineSegment_02
  Row 2: Lichen_01, Lichen_02, Algae_01, Algae_02
  Row 3: CrackWeed_01, CrackWeed_02, Fern_01, Fern_02

UV offsets per variant:
  MossDense_01: uv.x = 0.0–0.25, uv.y = 0.0–0.25
  MossDense_02: uv.x = 0.25–0.5, uv.y = 0.0–0.25
  etc.
```

BGSM for atlas decal:
```
sTextureDiffuse = textures\decals\overgrowth_atlas_d.dds
; UV sub-region selected by BSDecalNode uvOffset + uvScale at placement time
fUVOffsetU = 0.0    ; set per-instance via NIF extra data or Papyrus
fUVOffsetV = 0.0
fUVScaleU = 0.25    ; 1/4 atlas width per variant
fUVScaleV = 0.25    ; 1/4 atlas height per variant
```

---

## 8. Complete Implementation Checklist

### Texture Preparation
- [ ] Create height map for each moss/vine variant (BC4, white=raised, black=sunken)
- [ ] Store height in normal map B channel OR as dedicated _h.dds slot 3
- [ ] Pack 16 variants into 4K atlas DDS (BC3) for draw-call efficiency
- [ ] Set UV origin at anchor point for wind-animated decals

### C++ F4SE Plugin
- [ ] Add CommonLibF4 dependency via vcpkg (`commonlibf4`)
- [ ] Add Detours or xbyak via vcpkg for function hooking
- [ ] Hook `BSDecalNode::SetupMaterial` → set POM flags + parallax scale
- [ ] Patch `fNormalTolerance` in BSDecalNode for corner-wrapping
- [ ] Hook weather update → push wind vector to decal shader params
- [ ] Register MCM messaging callback for pool size control

### Address Library Lookups
- [ ] Verify all REL::ID values against Address Library for your target FO4 version (1.10.163 / NG)
- [ ] Build against both OG and NG address libraries if supporting both game versions

### Papyrus / Placement
- [ ] Write `OvergrowthDecalPlacer.psc` using `FindAllReferencesWithKeyword`
- [ ] Create material-tag keywords: `OG_ConcreteMaterial`, `OG_RockMaterial` etc.
- [ ] Test procedural placement in a test cell before rolling out Commonwealth-wide

### INI + Performance
- [ ] Set `iMaxDecals=4000`, `iMaxDecalsPerFrame=20` in Fallout4.ini
- [ ] Precombine static overgrowth decals in non-player-interactive cells
- [ ] Set `fDecalLODFadeDistance=3000` to cull distant decals before performance cliff

### NIF Setup
- [ ] Name decal geometry with `OG_MOSS`, `OG_IVY`, or `OG_VINE` prefix for hook detection
- [ ] UV: anchor at v=0, free tip at v=1 for correct wind vertex deformation direction
- [ ] BSDecalNode: `fNormalTolerance = 0.65`, `fMinSize/MaxSize` appropriate for surface

---

## 9. Key Resources

| Resource | Purpose |
|---|---|
| CommonLibF4 (Ryan-rsm-McKenzie, GitHub) | Reverse-engineered headers for BSLightingShaderProperty, BSDecalNode, bhkWorld |
| Fallout 4 Address Library (nikitalita, GitHub) | Version-independent function ID mapping for all REL::ID lookups |
| F4SE Plugin Template (Expired6978/Ryan-rsm-McKenzie) | CMake project scaffold with Detours/xbyak pre-configured |
| FO4 Shader Research repo | Documented pixel/vertex shader structures for decals and lighting |
| xbyak (herumi) | x86-64 JIT assembler for inline hook trampolines (preferred over raw Detours) |
| ENB enbeffect.fx | Post-process depth-based soft edge blending (no C++ required) |
