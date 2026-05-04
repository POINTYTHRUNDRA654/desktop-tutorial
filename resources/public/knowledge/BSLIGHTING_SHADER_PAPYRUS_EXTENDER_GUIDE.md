# BSLightingShader Injection, Papyrus Extenders & F4SE Plugin Template

A guide to engine-level shader injection via CommonLibF4, driving shader state from Papyrus, and the Papyrus extender frameworks that make complex environmental scripting possible.

---

## 1. BSLightingShaderProperty — Runtime Emittance Injection

### What BSLightingShaderProperty Is

`RE::BSLightingShaderProperty` is the primary shader class in Fallout 4's Creation Engine. Every NIF mesh node that has material properties uses one. It contains a pointer to a `BSLightingShaderMaterial` which holds the actual rendering parameters — including **emittance color** (the self-illumination/glow tint) and **emittance multiplier**.

By hooking this class at runtime via CommonLibF4 you can:
- Make objects pulse with radiation intensity (e.g. glowing mushrooms that brighten during rad storms)
- Make bioluminescent flora flicker like ball lightning
- Simulate thick toxic gas by tinting ambient light dynamically
- Replace any static emittance color with a game-variable-driven value each frame

### Class Layout (CommonLibF4 RE namespace)

```cpp
// Approximate RE:: layout — exact offsets from IDA / CommonLibF4 headers
namespace RE
{
    class BSLightingShaderMaterial
    {
    public:
        NiColorA  emittanceColor;      // RGBA float 0–1; controls self-illumination tint
        float     emittanceMult;       // multiplier — >1.0 = brighter than NIF bakes
        // ... other material fields
    };

    class BSLightingShaderProperty : public BSShaderProperty
    {
    public:
        BSLightingShaderMaterial* material;  // non-null when mesh has a material
        // virtual SetupMaterial(), UpdateMaterial(), etc.
    };
}
```

### Recursive Scene-Graph Walk — Change Emittance on All Geometry

```cpp
// src/ShaderInjection.cpp
#include <RE/Fallout.h>
#include <F4SE/F4SE.h>
#include <cmath>

namespace ShaderInjection
{
    // Walk the NIF scene graph and set emittance on every lighting shader found
    void SetEmittanceRecursive(RE::NiAVObject* root, const RE::NiColorA& color, float mult)
    {
        if (!root) return;

        // If this node has a shader property, try casting to BSLightingShaderProperty
        if (root->m_spEffect) {
            auto* lsp = static_cast<RE::BSLightingShaderProperty*>(root->m_spEffect.get());
            if (lsp && lsp->material) {
                lsp->material->emittanceColor = color;
                lsp->material->emittanceMult  = mult;
            }
        }

        // Recurse into children (NiNode branches)
        if (auto* node = root->As<RE::NiNode>()) {
            for (auto& child : node->children) {
                SetEmittanceRecursive(child.get(), color, mult);
            }
        }
    }

    // Radiation-driven pulse: call each frame from a hooked update function
    // radLevel = actor's current RadiationRads value (0–1000)
    void ApplyRadiationGlow(RE::TESObjectREFR* ref, float radLevel)
    {
        if (!ref) return;
        auto* root = ref->Get3D();
        if (!root) return;

        // Normalize and apply exponential curve for dramatic pulse above 50% rads
        const float ratio  = radLevel / 1000.0f;
        const float pulse  = (ratio < 0.5f) ? ratio : 0.5f + std::pow((ratio - 0.5f) * 2.0f, 2.0f) * 0.5f;
        const float flicker = 0.85f + 0.15f * std::sin(static_cast<float>(RE::GetCurrentTimeInSeconds()) * 7.3f);

        const RE::NiColorA glow{
            0.1f,                          // R — minimal red
            0.55f + pulse * 0.45f,         // G — green ramps with rads
            0.05f,                         // B — minimal blue
            1.0f                           // A — full opacity
        };

        SetEmittanceRecursive(root, glow, (1.0f + pulse * 4.0f) * flicker);
    }
}
```

### Hooking BSLightingShaderProperty::UpdateMaterial (Per-Frame Update)

To drive emittance every frame, hook the function the renderer calls when updating material state:

```cpp
// Hook pattern: intercept after material is updated, before draw call
namespace ShaderHooks
{
    using UpdateMaterial_t = void(RE::BSLightingShaderProperty*, RE::BSRenderPass*);
    REL::Relocation<UpdateMaterial_t*> _UpdateMaterial;

    void UpdateMaterial_Hook(RE::BSLightingShaderProperty* prop, RE::BSRenderPass* pass)
    {
        _UpdateMaterial(prop, pass); // call original first

        if (!prop || !prop->material) return;

        // Example: tint all materials in Glowing Sea cells green
        // (check current cell/weather here)
        auto* sky = RE::Sky::GetSingleton();
        if (sky && sky->currentWeather) {
            const std::uint32_t wid = sky->currentWeather->GetFormID();
            if (wid == 0x001CD35B || wid == 0x00225974 || wid == 0x00225975) {
                prop->material->emittanceColor = RE::NiColorA{ 0.1f, 0.7f, 0.1f, 1.0f };
                prop->material->emittanceMult  = 1.5f;
            }
        }
    }

    void InstallShaderHooks()
    {
        // REL::Relocation<uintptr_t> target{ REL::ID(/* BSLightingShaderProperty::UpdateMaterial */) };
        // _UpdateMaterial = reinterpret_cast<UpdateMaterial_t*>(
        //     F4SE::GetTrampoline().write_call<5>(target.address(), UpdateMaterial_Hook));
        F4SE::log::info("ShaderHooks installed");
    }
}
```

### HLSL / Shader Replacement Notes

Fallout 4 uses pre-compiled HLSL shaders stored in `Data\Shaders\`. Direct runtime HLSL injection (replacing compiled `.fxp` files with custom code) is possible by:

1. Decompiling the target `.fxp` shader with a DXBC decompiler (e.g. `fxc /dumpbin` or NDA tools).
2. Writing your modified HLSL, adding custom constant buffers for radiation/pulse data.
3. Compiling to DXBC with `fxc.exe /T ps_5_0 /E main`.
4. Replacing the `.fxp` file in `Data\Shaders\` via a BA2 override.
5. From C++ (F4SE plugin), write the per-frame uniform data into the game's constant buffer using D3D11 `UpdateSubresource` after acquiring the device context.

⚠️ HLSL replacement requires matching the exact shader version slot — check the game's shader list in IDA or use ENB's shader cache dump feature to identify the target.

---

## 2. Papyrus-Driven Shader Logic

The pattern is: **Papyrus reads game state → passes values via a custom F4SE native function → C++ plugin updates shader uniforms each frame**.

### Step 1 — Register a Papyrus Native Function in Your DLL

```cpp
// In F4SEPlugin_Load or a Papyrus registration callback:
F4SE::GetPapyrusInterface()->Register([](RE::BSScript::IVirtualMachine* vm) {
    // Register: MutatedShaders.SetRadiationGlowLevel(float level)
    vm->RegisterFunction("SetRadiationGlowLevel", "MutatedShaders",
        [](RE::BSScript::IVirtualMachine*, RE::VMStackID, RE::StaticFunctionTag*, float level) {
            // Store level in a thread-safe atomic for the render-thread hook to read
            ShaderInjection::gRadiationGlowLevel.store(level);
        });
    return true;
});
```

### Step 2 — Call It from Papyrus

```papyrus
; MutatedEnvironment.psc
Scriptname MutatedEnvironment extends Quest

Event OnInit()
    RegisterForUpdateGameTime(0.1)  ; every ~6 in-game minutes
EndEvent

Event OnUpdateGameTime()
    ; Read player's current radiation level
    float radRatio = Game.GetPlayer().GetValue(Game.GetForm(0x00000039) as ActorValue) / 1000.0
    
    ; Decide glow intensity based on weather + radiation
    float glowIntensity = radRatio
    
    ; If Glowing Sea weather, boost intensity
    Weather currentWeather = Weather.GetCurrentWeather()
    if currentWeather.GetFormID() == 0x001CD35B
        glowIntensity = Math.Min(1.0, glowIntensity * 1.8)
    endif
    
    ; Push value to C++ shader system
    MutatedShaders.SetRadiationGlowLevel(glowIntensity)
EndEvent
```

### Step 3 — Consume in Render Thread Hook

The atomic float `gRadiationGlowLevel` is written by the Papyrus game thread and read by the render thread hook without a mutex (atomic float is safe for this pattern).

---

## 3. Lighthouse Papyrus Extender (by GELUXRUM)

### What It Is

Lighthouse Papyrus Extender (Nexus #71420) by GELUXRUM is an F4SE plugin that adds 180+ new native Papyrus functions beyond what vanilla F4SE provides. It is a required dependency for many advanced mods that need richer environment scripting.

**Nexus:** https://www.nexusmods.com/fallout4/mods/71420  
**GitHub:** https://github.com/GELUXRUM/LighthousePapyrusExtender  
**Requirements:** F4SE, Address Library (All-in-One)

### Key Functions Added

| Category | Example Functions |
|---|---|
| Actor / AI | `GetCurrentAIProcessDestinationWorldSpace`, `GetActorsHostileToActor` (improved) |
| Forms | `GetFormByEditorID`, `GetFormEditorID`, `IsRecordFlagSet` |
| Inventory & Leveled Lists | Array-formatted inventory queries, `RemoveScriptAddedLeveledObjects` |
| Sound & UI | Sound ID utilities, UI container update functions |
| Debug | PDB file support for Buffout 4 NG crash log stack traces |

Functions are organized in `Lighthouse2.psc` (second file needed because engine limits script file size). Check the GitHub wiki or Nexus page for the complete function index.

### Usage Pattern

```papyrus
; Import the extender script header
import Lighthouse

; Example: get a form by editor ID at runtime
Form myForm = GetFormByEditorID("MyMod_MutatedFern_Flora")
if myForm != None
    ; Spawn or swap the form
endif
```

### Why It Matters for Environmental Scripting

For the Glowing Sea mutation system, Lighthouse functions let Papyrus:
- Query NPC AI destinations to decide whether they are "in the sea"
- Perform robust hostile-faction checks for radiation-driven enemy behavior
- Dynamically look up mutated form variants by EditorID without hardcoded FormIDs

---

## 4. Garden of Eden Papyrus Script Extender (by LarannKiar)

### What It Is

Garden of Eden Papyrus Script Extender (Nexus #74160) by LarannKiar adds over **1,150 new native Papyrus functions** — the most comprehensive Papyrus expansion available for Fallout 4. Functions are organized in script files mirroring the vanilla structure.

**Nexus:** https://www.nexusmods.com/fallout4/mods/74160  
**Requirements:** F4SE, Address Library (All-in-One)  
**License:** MIT (legacy versions)

### Key Capabilities

| Category | Description |
|---|---|
| Advanced inventory | Per-item indexed manipulation — find, copy, transfer, remove, equip individual items |
| AI / physics | AI travel package injection, Havok physics queries, collision boundary manipulation |
| Animation | Actor animation state reads, physics direction and velocity |
| Raycasting | Line-of-sight and reference detection via script |
| Quest / terminal | Query quest priority, alias counts, reference counts, terminal data access |
| Array utilities | Sort, merge, filter arrays from script |
| Console extensions | Run console commands silently from script — for state manipulation |
| Dialogue | Start/pause/stop dialogue from script directly |

### Usage for Mutated Environment

```papyrus
; Use raycasting to check if a mutated flora form is in LOS of player
; before triggering a bioluminescent effect
bool inLOS = GardenOfEden.CastRayFromActor(Game.GetPlayer(), myPlant, 2048.0)
if inLOS
    MutatedShaders.SetRadiationGlowLevel(0.9)
endif
```

---

## 5. F4SE Plugin Template — Pre-Configured DLL Scaffold

### What It Is

The F4SE Plugin Template is a GitHub-hosted CMake starter project for building Fallout 4 F4SE plugin DLLs. It removes the boilerplate of setting up includes, linking, versioning, and deployment so you can focus on the hook logic.

**Primary Template:** https://github.com/Ryan-rsm-McKenzie/f4se_plugin_template  
**Alternative:** https://github.com/Expired6978/f4se_plugin_template

### What It Provides Out of the Box

- `CMakeLists.txt` pre-configured for x64 MSVC (Visual Studio 2022)
- CommonLibF4 as a git submodule
- F4SE version declaration boilerplate (`F4SE_PLUGIN_VERSION`)
- Plugin load entry point (`F4SEPlugin_Load`)
- `spdlog` structured file logging wired up
- `vcpkg.json` for easy dependency addition
- Post-build copy step to deploy to `Data\F4SE\Plugins\`

### Getting Started

```cmd
REM 1. Clone (use your repo name)
git clone --recurse-submodules https://github.com/Ryan-rsm-McKenzie/f4se_plugin_template.git MutatedSeaPlugin
cd MutatedSeaPlugin

REM 2. Install vcpkg dependencies
vcpkg install

REM 3. Configure for Visual Studio 2022 x64
cmake -B build -A x64 -DCMAKE_TOOLCHAIN_FILE="%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake"

REM 4. Build Release
cmake --build build --config Release
```

### Adding Shader Hook Sources to the Template

```cmake
# In CMakeLists.txt — add your files to the existing target
target_sources(${PROJECT_NAME}
    PRIVATE
        src/main.cpp          # provided by template
        src/ShaderInjection.cpp   # your BSLightingShader hook
        src/RadiationHooks.cpp    # your radiation AV hook
        src/LightingHooks.cpp     # your ambient lighting hook
)
```

### Template main.cpp Pattern

```cpp
#include <F4SE/F4SE.h>
#include <RE/Fallout.h>

// Forward declarations of your hook installers
void InstallShaderHooks();
void InstallRadiationHooks();

F4SE_PLUGIN_VERSION = []()
{
    F4SE::PluginVersionData v{};
    v.PluginVersion(REL::Version{ 1, 0, 0 });
    v.PluginName("MutatedSeaPlugin");
    v.AuthorName("YourName");
    v.UsesAddressLibrary();
    v.CompatibleVersions({
        REL::Version{ 1, 10, 163,  0 }, // OG
        REL::Version{ 1, 10, 984,  0 }, // NG
        REL::Version{ 1, 11, 191,  0 }, // Creations Menu
    });
    return v;
}();

extern "C" [[maybe_unused]] bool F4SEPlugin_Load(const F4SE::LoadInterface* a_f4se)
{
    F4SE::Init(a_f4se);
    F4SE::log::info("MutatedSeaPlugin loaded — installing hooks");

    InstallShaderHooks();
    InstallRadiationHooks();

    // Register Papyrus native functions (so .psc scripts can call C++)
    F4SE::GetPapyrusInterface()->Register([](RE::BSScript::IVirtualMachine* vm) {
        vm->RegisterFunction("SetRadiationGlowLevel", "MutatedShaders",
            [](RE::BSScript::IVirtualMachine*, RE::VMStackID, RE::StaticFunctionTag*, float level) {
                ShaderInjection::gRadiationGlowLevel.store(level);
            });
        return true;
    });

    return true;
}
```

---

## 6. Papyrus + C++ Shader Architecture — End-to-End

```
Game thread (Papyrus)                    Render thread (C++)
─────────────────────────────────────    ─────────────────────────────────────
OnUpdateGameTime() fires every 0.1h  →   BSLightingShaderProperty hook
  Read player RadiationRads             fires before each draw call
  Read current weather FormID        →   Reads atomic<float> gRadiationGlowLevel
  Compute glowIntensity float        →   Builds NiColorA from intensity
  Call MutatedShaders.SetLevel(f)    →   Calls SetEmittanceRecursive(root, color, mult)
                                         Updates emittanceColor + emittanceMult
                                         Original UpdateMaterial() runs
                                         GPU sees updated material constants
                                     →   Mesh glows green with correct radiation intensity
```

**Thread safety:** Use `std::atomic<float>` for the value passed between threads. Never lock a mutex inside a render-thread hook — it will deadlock under load.

---

## 7. Summary — Tools, Authors, Download Links

| Tool | Author | Nexus / GitHub | Purpose |
|---|---|---|---|
| Lighthouse Papyrus Extender | GELUXRUM | Nexus #71420 + GitHub | 180+ new Papyrus functions |
| Garden of Eden Papyrus Script Extender | LarannKiar | Nexus #74160 | 1150+ new Papyrus functions |
| F4SE Plugin Template | Ryan-rsm-McKenzie / Expired6978 | GitHub | CMake DLL starter kit |
| CommonLibF4 | Ryan-rsm-McKenzie & contributors | GitHub | RE:: engine headers |
| F4SE | Ian Patterson (ianpatt) | f4se.silverlock.org | Script Extender base |
| Address Library | meh321 | Nexus #47327 | Cross-version address resolution |
| ENB Series | Boris Vorontsov | enbdev.com | Post-process shader layer |
