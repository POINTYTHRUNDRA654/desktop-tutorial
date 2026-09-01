# CommonLibF4 Reverse Engineering, Engine Hooks & Mutated World Systems

A deep guide to reverse-engineering Fallout 4's engine with CommonLibF4, writing production-quality F4SE DLL plugins, hooking weather/radiation/lighting systems, and driving dynamic world mutation in the Glowing Sea.

---

## 1. CommonLibF4 — Collaborated Reverse-Engineered Library

### What CommonLibF4 Is

CommonLibF4 is a community reverse-engineered C++ header library that mirrors Fallout 4's internal engine class layout. Every class in the `RE::` namespace is a faithful reconstruction of what exists inside `Fallout4.exe` — discovered via RTTI dumps, IDA/Ghidra decompilation, and pattern scanning.

**Repository:** https://github.com/Ryan-rsm-McKenzie/CommonLibF4  
**Namespace convention:** `RE::` for engine runtime classes, `REL::` for relocation utilities (address resolution), `F4SE::` for extender interfaces.

### Class Hierarchy Overview

```
RE::TESForm                    ← Base for every persistent game record
├── RE::TESWeather             ← Weather record (colors, FX, sounds, flags)
├── RE::TESClimate             ← Climate (weather array + probabilities)
├── RE::TESObjectREFR          ← Placed reference (any object in the world)
│   └── RE::Actor              ← Living actor (player, NPC, creature)
│       └── RE::Character      ← Specifically humanoid actors
├── RE::TESObjectSTAT          ← Static mesh object
├── RE::TESFlora               ← Harvestable flora
├── RE::TESObjectTREE          ← Tree object
├── RE::TESRegion              ← Region record (weather/sound/flora tables)
└── RE::TESCell                ← Interior or exterior cell

RE::Sky                        ← Singleton; manages active weather, sky colors
RE::ActorValueOwner            ← AV system for actors (health, rads, etc.)
RE::ActorValueInfo             ← Descriptor for a single actor value
RE::BSGeometry                 ← NIF geometry node
RE::NiNode                     ← Scene graph node (base of NIF hierarchy)
RE::BSParticleShaderProperty   ← Particle shader (fog, embers, etc.)
```

### Key Singleton Accessors

```cpp
// Get active Sky manager
auto* sky = RE::Sky::GetSingleton();

// Get current weather
RE::TESWeather* weather = sky->currentWeather;

// Look up any form by FormID
auto* radStorm = RE::TESForm::LookupByID<RE::TESWeather>(0x001CD35B);

// Get player actor
auto* player = RE::PlayerCharacter::GetSingleton();

// Get an actor value by index
float rads = player->GetActorValue(RE::ActorValue::kRadiationRads);
```

---

## 2. Complete CMake + vcpkg Build Pipeline

### Project Layout

```
MutatedSeaPlugin/
├── CMakeLists.txt
├── vcpkg.json
├── vcpkg-configuration.json
├── src/
│   ├── main.cpp
│   ├── WeatherHooks.cpp
│   ├── RadiationHooks.cpp
│   ├── LightingHooks.cpp
│   └── BaseObjectSwap.cpp
├── include/
│   └── MutatedSeaPlugin.h
└── extern/
    └── CommonLibF4/          ← git submodule
```

### CMakeLists.txt (Complete)

```cmake
cmake_minimum_required(VERSION 3.21)
project(MutatedSeaPlugin VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# vcpkg toolchain — set VCPKG_ROOT env var before configuring
if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"
        CACHE STRING "")
endif()

# Force static CRT — avoid VCRUNTIME DLL dependency on end-user machines
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

# ---- CommonLibF4 ----
add_subdirectory(extern/CommonLibF4)

# ---- Optional vcpkg packages ----
find_package(spdlog CONFIG REQUIRED)   # structured logging
find_package(nlohmann_json CONFIG REQUIRED)  # JSON config reading

# ---- Plugin DLL ----
add_library(${PROJECT_NAME} SHARED
    src/main.cpp
    src/WeatherHooks.cpp
    src/RadiationHooks.cpp
    src/LightingHooks.cpp
    src/BaseObjectSwap.cpp
)

target_include_directories(${PROJECT_NAME}
    PRIVATE
        include
        extern/CommonLibF4/include
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        CommonLibF4::CommonLibF4
        spdlog::spdlog
        nlohmann_json::nlohmann_json
)

target_compile_definitions(${PROJECT_NAME}
    PRIVATE
        UNICODE
        _UNICODE
        NDEBUG                          # never ship a debug F4SE plugin
)

# Compiler flags: Unicode + fast parallel build
target_compile_options(${PROJECT_NAME} PRIVATE
    /W4 /WX-            # warnings but not fatal
    /MP                 # parallel compilation
    /Zc:preprocessor    # conformant preprocessor (required by CommonLibF4)
)

set_target_properties(${PROJECT_NAME} PROPERTIES
    OUTPUT_NAME "MutatedSeaPlugin"
    SUFFIX ".dll"
)

# Auto-deploy to FO4 after build (set FALLOUT4_PATH env var)
if(DEFINED ENV{FALLOUT4_PATH})
    add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            $<TARGET_FILE:${PROJECT_NAME}>
            "$ENV{FALLOUT4_PATH}/Data/F4SE/Plugins/$<TARGET_FILE_NAME:${PROJECT_NAME}>"
        COMMENT "Deploying to Fallout 4 Data/F4SE/Plugins/"
    )
endif()
```

### vcpkg.json

```json
{
  "name": "mutatedseaplugin",
  "version": "1.0.0",
  "dependencies": [
    "spdlog",
    "nlohmann-json"
  ]
}
```

### Build Commands

```cmd
REM Configure (Release x64 only — debug DLLs crash with F4SE)
cmake -B build -A x64 -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release

REM Output: build/Release/MutatedSeaPlugin.dll
REM Deploy manually or rely on POST_BUILD step
```

---

## 3. F4SE Plugin Entry Point (CommonLibF4 Style)

```cpp
// src/main.cpp
#include <F4SE/F4SE.h>
#include <RE/Fallout.h>
#include <spdlog/sinks/basic_file_sink.h>

namespace logger = F4SE::log;

// Forward declarations
void InstallWeatherHooks();
void InstallRadiationHooks();
void InstallLightingHooks();
void InitBaseObjectSwapper();

// Version declaration — F4SE reads this to decide whether to load the plugin
F4SE_PLUGIN_VERSION = []()
{
    F4SE::PluginVersionData v{};
    v.PluginVersion(REL::Version{ 1, 0, 0 });
    v.PluginName("MutatedSeaPlugin");
    v.AuthorName("YourName");
    v.UsesAddressLibrary();              // tells F4SE we use Address Library
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

    // Set up file logger in Documents/My Games/Fallout4/F4SE/
    auto path = F4SE::log::log_directory();
    if (path) {
        *path /= "MutatedSeaPlugin.log";
        auto sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(path->string(), true);
        auto log  = std::make_shared<spdlog::logger>("global", sink);
        spdlog::set_default_logger(log);
        spdlog::set_level(spdlog::level::debug);
    }

    logger::info("MutatedSeaPlugin loading...");

    InstallWeatherHooks();
    InstallRadiationHooks();
    InstallLightingHooks();
    InitBaseObjectSwapper();

    logger::info("MutatedSeaPlugin loaded successfully");
    return true;
}
```

---

## 4. TESWeather / TESClimate / RE::Sky Hooks

### Hooking Weather Transitions

The `RE::Sky::ForceWeather` (or `SetWeather`) virtual function is called whenever the engine transitions weather. Hook it to react to Glowing Sea weather changes.

```cpp
// src/WeatherHooks.cpp
#include <RE/Fallout.h>
#include <F4SE/F4SE.h>

namespace WeatherHooks
{
    // Glowing Sea weather FormIDs (verify in xEdit)
    static constexpr REL::ID kRadWeather_GS   { 0x001CD35B }; // RADWeatherGlowingSea
    static constexpr REL::ID kGSFogWeather    { 0x00225974 }; // GlowingSeaFogWeather
    static constexpr REL::ID kGSPermRadWeather{ 0x00225975 }; // GlowingSeaPermanentRadWeather

    // Trampoline — original function pointer
    using ForceWeather_t = void(RE::Sky*, RE::TESWeather*, bool);
    REL::Relocation<ForceWeather_t*> _ForceWeather;

    void OnWeatherChange(RE::Sky* sky, RE::TESWeather* newWeather, bool override)
    {
        if (newWeather) {
            F4SE::log::debug("Weather changed → FormID {:08X}", newWeather->GetFormID());

            const bool isGSWeather =
                newWeather->GetFormID() == 0x001CD35B ||
                newWeather->GetFormID() == 0x00225974 ||
                newWeather->GetFormID() == 0x00225975;

            if (isGSWeather) {
                // Trigger mutation systems
                // e.g. signal BOS reload, activate fog shader
            }
        }
        _ForceWeather(sky, newWeather, override);  // call original
    }

    void InstallWeatherHooks()
    {
        // Use Address Library ID for Sky::ForceWeather — get ID from IDA/RTTI dump
        // REL::Relocation<uintptr_t> target{ REL::ID(12345) };
        // F4SE::GetTrampoline().write_branch<5>(target.address(), OnWeatherChange);
        F4SE::log::info("WeatherHooks installed");
    }
}
```

### Overriding Weather Properties at Runtime

```cpp
// Directly modify a weather record's ambient lighting after lookup
auto* gsRadWeather = RE::TESForm::LookupByID<RE::TESWeather>(0x001CD35B);
if (gsRadWeather) {
    // Tint ambient to sickly green-yellow (toxic fog simulation)
    // directionalAmbientLightingColors is an array of 3 color entries
    // [0]=sky above, [1]=sky below, [2]=directional
    for (int i = 0; i < 3; ++i) {
        auto& c = gsRadWeather->directionalAmbientLightingColors[i].colors;
        // RGBA in 0–255 space (exact field names depend on current CommonLibF4 revision)
        c.x.r = 60;   c.x.g = 120;  c.x.b = 30;   // toxic green ambient
        c.y.r = 80;   c.y.g = 40;   c.y.b = 10;    // murky orange undertone
    }
}
```

---

## 5. Radiation Logic Hook — Nonlinear Burst Fog Displacement

### ActorValue: RadiationRads

Radiation is stored as Actor Value index `0x39` (`kRadiationRads`). Hook `ActorValueOwner::GetActorValue` to intercept radiation reads and implement nonlinear burst logic.

```cpp
// src/RadiationHooks.cpp
#include <RE/Fallout.h>
#include <F4SE/F4SE.h>
#include <cmath>

namespace RadiationHooks
{
    using GetActorValue_t = float(RE::ActorValueOwner*, std::uint32_t);
    REL::Relocation<GetActorValue_t*> _GetActorValue;

    // Nonlinear "burst" modifier:
    // Low rads → normal; near max → exponential spike (simulates burst fog)
    static float NonlinearRadMod(float rads, float maxRads)
    {
        const float ratio = rads / maxRads;
        if (ratio < 0.5f) return rads;                       // linear below 50%
        // Exponential growth above 50% → forces sudden fog thickening
        return maxRads * 0.5f + (maxRads * 0.5f) * std::pow((ratio - 0.5f) * 2.0f, 2.5f);
    }

    float GetActorValue_Hook(RE::ActorValueOwner* owner, std::uint32_t av)
    {
        float val = _GetActorValue(owner, av);
        if (av == static_cast<std::uint32_t>(RE::ActorValue::kRadiationRads)) {
            // Apply only to actors in Glowing Sea cells
            // (check owner's parent cell region here)
            float maxRads = 1000.0f; // vanilla max
            val = NonlinearRadMod(val, maxRads);
        }
        return val;
    }

    void InstallRadiationHooks()
    {
        // REL::Relocation<uintptr_t> target{ REL::ID(/* ActorValueOwner::GetActorValue ID */) };
        // _GetActorValue = reinterpret_cast<GetActorValue_t*>(
        //     F4SE::GetTrampoline().write_call<5>(target.address(), GetActorValue_Hook));
        F4SE::log::info("RadiationHooks installed");
    }
}
```

---

## 6. Automatic Lighting Buffer — Toxic Gas Simulation

### What DirectionalAmbientLightingColors Controls

Each `TESWeather` record has a `directionalAmbientLightingColors` array (dawn, day, dusk/night slots). By hooking the lighting update function you can animate these values each frame to simulate thick glowing toxic gas that responds to light sources.

```cpp
// src/LightingHooks.cpp
#include <RE/Fallout.h>
#include <F4SE/F4SE.h>
#include <cmath>

namespace LightingHooks
{
    static float gPulseTimer = 0.0f;

    // Called each frame by the engine's ambient update pass
    // Hook address must be resolved from IDA/Address Library
    using UpdateAmbient_t = void(RE::Sky*);
    REL::Relocation<UpdateAmbient_t*> _UpdateAmbient;

    void UpdateAmbient_Hook(RE::Sky* sky)
    {
        _UpdateAmbient(sky); // run original first

        if (!sky || !sky->currentWeather) return;

        const std::uint32_t formID = sky->currentWeather->GetFormID();
        const bool inGlowingSea =
            formID == 0x001CD35B || formID == 0x00225974 || formID == 0x00225975;

        if (!inGlowingSea) return;

        // Animate toxic glow: pulsing green-tinted ambient
        gPulseTimer += 0.016f; // ~60fps delta
        const float pulse = 0.5f + 0.5f * std::sin(gPulseTimer * 1.2f); // 0–1 breathe

        const std::uint8_t baseG = 90;
        const std::uint8_t varG  = static_cast<std::uint8_t>(pulse * 50.0f);

        auto& colors = sky->currentWeather->directionalAmbientLightingColors;
        for (int i = 0; i < 3; ++i) {
            colors[i].colors.x.r = 20;
            colors[i].colors.x.g = static_cast<std::uint8_t>(baseG + varG);
            colors[i].colors.x.b = 15;
        }
    }

    void InstallLightingHooks()
    {
        // REL::Relocation<uintptr_t> target{ REL::ID(/* Sky::UpdateAmbient ID */) };
        // _UpdateAmbient = reinterpret_cast<UpdateAmbient_t*>(
        //     F4SE::GetTrampoline().write_call<5>(target.address(), UpdateAmbient_Hook));
        F4SE::log::info("LightingHooks installed");
    }
}
```

### Bioluminescent / Ball-Lightning Shader Effects

To add actual ball-lightning particle bursts during radiation storms, use `RE::BSTSmartPointer` and particle system APIs to spawn `BGSExplosion` effects from C++:

```cpp
// Spawn a ball-lightning burst particle at a world position
void SpawnBallLightningFX(const RE::NiPoint3& pos)
{
    // Look up a custom BGSExplosion record you created in the CK
    // EditorID: "MutatedBallLightningFX" — use your own FormID
    auto* fxForm = RE::TESForm::LookupByEditorID<RE::BGSExplosion>("MutatedBallLightningFX");
    if (!fxForm) return;

    // Place the explosion at the position
    // RE::TES::PlaceExplosion(fxForm, pos, nullptr);  // exact API depends on CommonLibF4 version
}
```

For shader-level effects (bioluminescent glow on NPC/creature NIF nodes), modify `RE::BSLightingShaderProperty::emissiveColor` on attached geometry at runtime using the scene graph traversal API.

---

## 7. Cell / Lighting / Region Patcher — Mass Worldspace Edits

### Framework Pattern (CellLightingPatcher)

A "cell lighting patcher" framework applies lighting overrides across all exterior cells in a worldspace (e.g., the Glowing Sea region) without requiring per-cell xEdit edits. The pattern:

1. At plugin load, iterate all cells in the target worldspace.
2. For each cell in the target region, override its `XCLL` (cell lighting) block values.
3. Apply poison-green ambient, raised fog density, and a radiation-tinted directional light.

```cpp
// Conceptual cell patcher — iterate cells in Fallout4.esm Commonwealth worldspace
void PatchGlowingSeaCellLighting()
{
    // Commonwealth worldspace FormID = 0x0000003C
    auto* commonwealth = RE::TESForm::LookupByID<RE::TESWorldSpace>(0x0000003C);
    if (!commonwealth) return;

    // Iterate exterior cells (grid -35..−20 X, -20..−5 Y = approximate Glowing Sea)
    for (auto& [key, cell] : commonwealth->cellMap) {
        const auto [cellX, cellY] = key;
        if (cellX >= -35 && cellX <= -20 && cellY >= -20 && cellY <= -5) {
            // Override ambient lighting block
            if (cell && cell->cellLightingData) {
                auto& ld = *cell->cellLightingData;
                ld.ambientColor.red   = 25;
                ld.ambientColor.green = 110;
                ld.ambientColor.blue  = 20;
                ld.directionalXPlus.red   = 40;
                ld.directionalXPlus.green = 120;
                ld.directionalXPlus.blue  = 15;
                ld.fogNear  = 512.0f;
                ld.fogFar   = 4096.0f;
                ld.fogPower = 2.5f;
                ld.fogMax   = 0.85f;   // 85% fog density
            }
        }
    }
}
```

### Region Weather/Flora Tables

Fallout 4 `TESRegion` records control which weather is used in an area and what flora appears. To mass-apply mutated traits via the region system:

```cpp
// Override a region's weather entry to force Glowing Sea radiation storm
auto* gsRegion = RE::TESForm::LookupByEditorID<RE::TESRegion>("RegionGlowingSea");
if (gsRegion) {
    // Iterate region data entries
    for (auto* entry : gsRegion->dataList) {
        if (entry && entry->GetType() == RE::TESRegionDataWeather::RTTI) {
            auto* wEntry = static_cast<RE::TESRegionDataWeather*>(entry);
            // Set 80% chance of RADWeatherGlowingSea
            for (auto& w : wEntry->weatherList) {
                w.chance = (w.weather->GetFormID() == 0x001CD35B) ? 80 : 5;
            }
        }
    }
}
```

---

## 8. Base Object Swapper — Dynamic Flora/Fauna Mutation

### What Base Object Swapper (BOS) Does

Base Object Swapper (Nexus #64943) reads `.ini` files at startup from `Data\BaseObjectSwapper\` and replaces base object references game-wide. No ESP slot used. Conditions include: weather FormID, worldspace, cell coordinate range, time of day, season.

### INI Rules for Glowing Sea Mutation

Create `Data\BaseObjectSwapper\GlowingSeaMutation.ini`:

```ini
; ===== Glowing Sea Flora Mutation =====
; Swap standard wasteland flora for mutated variants when Glowing Sea weathers are active

; Softscale → MutatedSoftscale (glowing bioluminescent variant)
[Swap]
Type=Flora
Form=Fallout4.esm|0x000FC89A       ; vanilla Softscale flora base ID
FormOut=GlowingSeaMod.esp|0x000800 ; your mutated variant form
Worldspace=Commonwealth
CellXMin=-35
CellXMax=-20
CellYMin=-20
CellYMax=-5

; Razorgrain → MutatedRazorgrain under active radiation storm
[Swap]
Type=Flora
Form=Fallout4.esm|0x00059B0C       ; Razorgrain
FormOut=GlowingSeaMod.esp|0x000801
Weather=0x001CD35B,0x00225975      ; RADWeatherGlowingSea, GlowingSeaPermanentRadWeather
Worldspace=Commonwealth
CellXMin=-35
CellXMax=-20
CellYMin=-20
CellYMax=-5

; Bloatfly → MutatedBloatfly (glowing variant)
[Swap]
Type=NPC
Form=Fallout4.esm|0x0001CF6F       ; BloatflyDefault
FormOut=GlowingSeaMod.esp|0x000810
Worldspace=Commonwealth
CellXMin=-35
CellXMax=-20
CellYMin=-20
CellYMax=-5
```

### BOS Syntax Quick Reference

| Key | Description |
|---|---|
| `Type=` | Record type: Flora, Static, NPC, Tree, Furniture, etc. |
| `Form=Plugin\|FormID` | Source (vanilla) base form |
| `FormOut=Plugin\|FormID` | Replacement base form |
| `Worldspace=` | Target worldspace EditorID |
| `CellXMin/XMax` | Exterior cell X grid range |
| `CellYMin/YMax` | Exterior cell Y grid range |
| `Weather=` | Comma-separated weather FormIDs (swap only under these weathers) |
| `Season=` | Season name (requires Seasons of the Commonwealth) |
| `Location=` | Location FormID (alternative to cell grid) |

### Triggering BOS Reload from C++ Plugin

BOS exposes a Papyrus function for reload. From your F4SE plugin, fire a Papyrus string event to signal BOS:

```cpp
// Signal BOS to re-evaluate all swap rules (e.g. after weather change detected)
auto* vm = RE::GameVM::GetSingleton()->GetVM().get();
if (vm) {
    auto* args = RE::MakeFunctionArguments();
    vm->SendModEvent("BOS_Reload"sv, args);
    delete args;
}
```

---

## 9. Address Resolution Workflow

When writing hooks you need the correct Address Library ID or byte signature for each function:

1. **IDA / Ghidra** — Open `Fallout4.exe` (1.10.163 for OG; match your target version). Use RTTI names to find classes. Search for `TESWeather` or `Sky::` in the Names window.
2. **CommonLibF4 headers** — Check `extern/CommonLibF4/include/RE/` for already-mapped functions. If `Sky::ForceWeather` is there, it has a `REL::ID` constant you can use directly.
3. **Address Library database** — `Data\F4SE\Plugins\version-1-10-163-0.bin` maps IDs to RVAs. Use the Address Library viewer tool to search by RVA found in IDA.
4. **Byte signature** — If the function isn't in the Address Library, write a byte signature using IDA's "Copy bytes" feature. Add it to your plugin's `.toml` under `[signatures]`.

```cpp
// Example: resolve via ID (safest — works across all versions if Address Library is updated)
REL::Relocation<uintptr_t> targetAddr{ REL::ID(12345) };
F4SE::GetTrampoline().write_branch<5>(targetAddr.address(), MyHookFunction);

// Example: resolve via byte signature (fallback)
// "F4:48 89 5C 24 ?? 48 89 74 24 ?? 57 41 56 41 57 48 83 EC 40"
```

---

## 10. Safety Rules for Engine Hooks

- **Always call the original function** unless you explicitly want to suppress it — skipping it crashes other mods.
- **Never install hooks in `DllMain`** — only in `F4SEPlugin_Load`.
- **Only one plugin per function** — double-hooking the same address via write_branch corrupts both plugins.
- **Use the trampoline allocator** (`F4SE::GetTrampoline()`) — never patch code directly with raw pointer writes.
- **Test each hook version separately** — a hook that works on OG (1.10.163) may crash on NG (1.10.984) if the Address Library ID or byte pattern changed.
- **Log every hook installation** — helps diagnose "plugin loaded but has no effect" vs "plugin crashed on hook install".
- **No blocking work in hooks** — engine callbacks run on the main thread; expensive computation (file I/O, heavy math) must be offloaded to a worker thread with a lock-free result queue.

---

## 11. Glowing Sea Mutation — End-to-End Checklist

- [ ] CommonLibF4 cloned as git submodule; CMake + vcpkg configured
- [ ] F4SE plugin entry point compiles with `UsesAddressLibrary()` and all three `CompatibleVersions`
- [ ] TESWeather hook detects Glowing Sea FormIDs: 0x001CD35B, 0x00225974, 0x00225975
- [ ] Radiation hook applies nonlinear burst modifier for actors in Glowing Sea cells
- [ ] Lighting hook animates directional ambient to toxic green pulsing glow each frame
- [ ] Cell patcher iterates grid (-35..−20, -20..−5) and overrides XCLL fog/ambient data
- [ ] Region patcher biases TESRegion weather table to 80% radiation storm in Glowing Sea
- [ ] BOS INI rules placed in `Data\BaseObjectSwapper\GlowingSeaMutation.ini`; flora and fauna swap rules defined with cell range + weather conditions
- [ ] TOML file (`Data\F4SE\Plugins\MutatedSeaPlugin.toml`) written with address entries for custom hooks
- [ ] All hooks tested on OG (1.10.163), NG (1.10.984), and Creations Menu (1.11.x) builds
- [ ] `bEnableLogging=0` confirmed in Papyrus.ini for end-user build
- [ ] Plugin deployed to `Data\F4SE\Plugins\MutatedSeaPlugin.dll`
