# Large-Scale Flora Overhaul Architecture for Fallout 4

A complete technical reference for scaling mutated vegetation mods across the full Commonwealth + DLCs (Far Harbor, Nuka-World, Automatron) without stuttering, script bloat, or compatibility breakage.

---

## 1. Cell Loading Optimization

### Why Large Overhauls Cause Stuttering

Every cell-load event triggers:
1. Mesh streaming (NIF + BA2 decompression)
2. Script `OnLoad` events on every enabled reference in the cell
3. Precombine bounding-box recalculation if any precombined reference was touched by your ESP
4. AI package re-registration for NPC_ actors (your plant actors)

Multiplied across hundreds of hyper-detailed plant references, each load stutter is the sum of all four.

### ADDICTOL — Engine Load Order Optimization

**ADDICTOL** (Nexus #66982, by PJMail) pre-sorts the game's internal plugin load order at runtime to minimize FormID lookup overhead. For large overhauls with hundreds of new STAT/FLOR/NPC_ records:

1. Install ADDICTOL via your mod manager.
2. No INI configuration needed for most mods — it works automatically on game launch.
3. If your mod ships 200+ new form records, add it to ADDICTOL's priority list in `ADDICTOL.ini`:

```ini
[Priority]
YourPlantMod.esp=1
```

This ensures your mod's records are pre-cached before the player enters any cell containing your plants.

### Pre-combined Meshes Across DLC Worldspaces

**Never edit vanilla precombined references** without regenerating precombines. Breaking a precombine in a vanilla cell turns its entire pre-combined geometry into individual draw calls — a common source of dramatic fps drops in overhaul mods.

Rules:
- If you place new STAT/NPC_ plant references in vanilla cells: place them in **new** layers or **new** cells if possible.
- If you must edit a cell that contains precombines (e.g., replace vanilla glowing fungus): use **Base Object Swapper** (see Section 5) to swap the mesh at runtime rather than touching the ESP record.
- If editing is unavoidable: regenerate precombines using the **PRP (Previs Repair Pack)** pipeline or submit PRP patches.

### Precombine Safety Checklist

| Action | Safe? | Notes |
|---|---|---|
| Add new reference to vanilla cell | ⚠️ | Breaks cell's previs if reference is large; use disable-previs cell if possible |
| Edit existing STAT reference properties | ❌ | Breaks previs — use BOS swap instead |
| Add NPC_ plant actor | ✅ | Actors are excluded from previs |
| Place references in new worldspace or custom cell | ✅ | No vanilla previs to break |

---

## 2. Scalable Papyrus — Quest & Ecosystem Architecture

### The Script Bloat Problem

A naïve design puts a full state-machine script on every plant reference. With 2,000 plant references across the Commonwealth + DLCs, this is 2,000 `OnUpdate` registrations, 2,000 OnLoad events, and 2,000 faction checks every 0.5–1.0 seconds. The script engine collapses.

### Solution: Central Quest Manager + Thin Reference Scripts

```
EcosystemQuest (persistent quest)
  └─ PlantEcosystemManager.psc  ← one instance, manages ALL plants globally
       ├─ MutatedFlora_Commonwealth.psc  ← regional module, Commonwealth only
       ├─ MutatedFlora_FarHarbor.psc     ← regional module, Far Harbor only
       └─ MutatedFlora_NukaWorld.psc     ← regional module, Nuka-World only

Each plant ACHR reference:
  └─ PlantInstanceRef.psc  ← only 3 fields: int gState, bool gRegistered, FormID gRegionID
```

### PlantEcosystemManager.psc (Quest Script)

```papyrus
; PlantEcosystemManager.psc
Scriptname PlantEcosystemManager extends Quest

; ── Regional sub-managers (set in CK) ────────────────────────────────────────
PlantRegionBase Property RegionCommonwealth Auto
PlantRegionBase Property RegionFarHarbor    Auto
PlantRegionBase Property RegionNukaWorld    Auto

; ── Global plant registry ─────────────────────────────────────────────────────
ObjectReference[] Property gAllPlants    Auto Hidden
int               Property gCount = 0    Auto Hidden

; ── Registration API ──────────────────────────────────────────────────────────
Function RegisterPlant(ObjectReference akPlant, int regionID)
    if gCount >= gAllPlants.Length
        return  ; array full — increase array size in CK if needed
    endif
    gAllPlants[gCount] = akPlant
    gCount += 1
    ; Delegate to the correct regional manager
    PlantRegionBase mgr = GetRegionManager(regionID)
    if mgr != None
        mgr.OnPlantRegistered(akPlant)
    endif
EndFunction

Function UnregisterPlant(ObjectReference akPlant)
    int idx = gAllPlants.Find(akPlant)
    if idx < 0
        return
    endif
    gAllPlants[idx] = gAllPlants[gCount - 1]
    gAllPlants[gCount - 1] = None
    gCount -= 1
EndFunction

; ── Helper ────────────────────────────────────────────────────────────────────
PlantRegionBase Function GetRegionManager(int regionID)
    if regionID == 1
        return RegionCommonwealth
    elseif regionID == 2
        return RegionFarHarbor
    elseif regionID == 3
        return RegionNukaWorld
    endif
    return None
EndFunction
```

### PlantRegionBase.psc (Base Script for Regional Modules)

```papyrus
; PlantRegionBase.psc  — extended by each DLC module
Scriptname PlantRegionBase extends Quest

Function OnPlantRegistered(ObjectReference akPlant)
    ; Override in each regional script
EndFunction

Function OnRegionActivated()
    ; Called when player enters this DLC area
EndFunction

Function OnRegionDeactivated()
    ; Called when player leaves — unregisters all update loops
EndFunction
```

### MutatedFlora_Commonwealth.psc

```papyrus
Scriptname MutatedFlora_Commonwealth extends PlantRegionBase

int gActivePlants = 0

Function OnPlantRegistered(ObjectReference akPlant)
    gActivePlants += 1
    ; Commonwealth-specific logic: register for weather-based alert
EndFunction

Function OnRegionDeactivated()
    ; Player has left Commonwealth — stop all ticks
    UnregisterForUpdate()
    gActivePlants = 0
EndFunction
```

### MutatedFlora_FarHarbor.psc

```papyrus
Scriptname MutatedFlora_FarHarbor extends PlantRegionBase

; Far Harbor plants react to fog density
GlobalVariable Property FogDensity_FarHarbor Auto

Function OnPlantRegistered(ObjectReference akPlant)
    RegisterForUpdate(2.0)  ; slower poll in Far Harbor — engine is foggier, harder to detect
EndFunction

Event OnUpdate()
    ; Increase threat radius when fog is dense (player less visible)
    float fogFactor = FogDensity_FarHarbor.GetValue()
    ; Modify detection radii via C++ native call
    SentientPlantNative.SetFogFactor(self, fogFactor)
    RegisterForSingleUpdate(2.0)
EndEvent

Function OnRegionDeactivated()
    UnregisterForUpdate()
EndFunction
```

---

## 3. Workshop Framework Integration

### Why Workshop Framework for Non-Settlement Mods

Workshop Framework (WF) by kinggath provides a **thread-safe messaging system** built on Papyrus. For a global flora mod, use it to:
- Queue spawn/despawn events across cells without stacking `OnUpdate` registrations
- Broadcast ecosystem state changes to interested scripts without direct object references
- Throttle global events so the Papyrus VM never processes more than N plant events per frame

### WF Thread-Safe Message Pattern

```papyrus
; In your plant script — send a message instead of calling directly
; This queues the call via WF's thread pool, preventing VM starvation

WorkshopFramework:Library:ObjectRefs Property WFLibrary Auto

Function BroadcastPlantDeath(ObjectReference akPlant)
    ; Use WF's SendCustomEvent to notify all interested listeners without direct reference
    WFLibrary.SendCustomEvent("PlantKilled", akPlant)
EndFunction
```

Receiving scripts register via WF's event system:

```papyrus
; EcosystemQuest script fragment — receives plant-killed events from WF
Event WorkshopFramework:Library:ObjectRefs.CustomEvent_PlantKilled(
    WorkshopFramework:Library:ObjectRefs akSource,
    Var[] akArgs)
    ObjectReference deadPlant = akArgs[0] as ObjectReference
    ; update ecosystem stats, set quest stage, etc.
EndEvent
```

### WF Global Spawn Throttling

Use WF's `ThreadManager` to limit concurrent plant-spawn/despawn operations:

```papyrus
WorkshopFramework:ThreadManager Property WFThreadMgr Auto

; Never spawn more than 5 plants per frame
Function QueuePlantSpawn(ObjectReference akLocation)
    WFThreadMgr.QueueTask(self, "DoSpawnPlant", akLocation, 5)
EndFunction

Function DoSpawnPlant(ObjectReference akLocation)
    ; actual spawn logic here
EndFunction
```

---

## 4. Regional Script States — DLC Module Pattern

### File Structure

```
Data\Scripts\Source\
  PlantEcosystemManager.psc
  PlantRegionBase.psc
  MutatedFlora_Commonwealth.psc
  MutatedFlora_FarHarbor.psc
  MutatedFlora_NukaWorld.psc
  PlantInstanceRef.psc          ← thin per-reference (3 fields only)
```

### Cell-Change Detection

Detect which region the player is in using `OnPlayerLoadGame` + worldspace check:

```papyrus
; PlantEcosystemManager.psc — detect DLC area on load
Event OnPlayerLoadGame()
    WorldSpace ws = Game.GetPlayer().GetWorldSpace()
    ; Far Harbor worldspace FormID: 0x0100C02E (DLC02WorldSpace)
    if ws.GetFormID() == 0x0100C02E
        RegionCommonwealth.OnRegionDeactivated()
        RegionFarHarbor.OnRegionActivated()
    ; Nuka-World: 0x0200C2E0
    elseif ws.GetFormID() == 0x0200C2E0
        RegionCommonwealth.OnRegionDeactivated()
        RegionNukaWorld.OnRegionActivated()
    else
        RegionFarHarbor.OnRegionDeactivated()
        RegionNukaWorld.OnRegionDeactivated()
        RegionCommonwealth.OnRegionActivated()
    endif
EndEvent
```

This ensures **only one region's update loops are active at any time** — a massive Papyrus VM performance win.

---

## 5. Unified Asset Pipeline — Base Object Swapper (BOS) Integration

### Dynamic Vanilla Plant Replacement via C++

Instead of hard-coding replacements in the ESP (which breaks compatibility), use **Base Object Swapper** (powerofthree, Nexus #64943) logic within your C++ plugin to swap vanilla plant NIFs for your hyper-detailed versions dynamically when the player enters a cell.

### BOS INI Rules (Simple Approach)

For the simple case, add BOS swap rules in `YourMod_BOS.ini`:

```ini
[Base Object Swap - YourMod]
; Swap vanilla glowing fungus STAT with your hyper-detail version
Form = 0x0003E00B~Fallout4.esm | 0x00001234~YourMod.esp

; Swap vanilla mutfruit plant
Form = 0x001A8D45~Fallout4.esm | 0x00001235~YourMod.esp

; Far Harbor specific — only in DLC02 worldspace
Form = 0x0100F3A2~DLC02.esm | 0x00001236~YourMod.esp | ws:0x0100C02E~DLC02.esm
```

### C++ Plugin Dynamic Swap (Advanced)

For logic that BOS INI can't express (e.g., swap only when a quest stage is active, or only swap at night):

```cpp
// Hook Cell::Load or TESForm::GetFormEditorID on cell-change
// Replace NiAVObject model on the target STAT reference directly

void OnCellLoad(RE::TESObjectCELL* cell)
{
    if (!cell) return;

    cell->ForEachReference([](RE::TESObjectREFR* ref) {
        auto* baseObj = ref->GetBaseObject();
        if (!baseObj) return RE::BSContainer::ForEachResult::kContinue;

        // Check if this is a vanilla glowing fungus (FormID 0x0003E00B)
        if (baseObj->GetFormID() == 0x0003E00B) {
            // Swap base object to our hyper-detail version at runtime
            // (This is the "soft" approach — changes the displayed model, not the ESP)
            auto* customBase = RE::TESForm::LookupByID<RE::TESBoundObject>(0x00001234); // your form
            if (customBase) {
                ref->SetBaseObject(customBase);
                ref->Update3D();
            }
        }
        return RE::BSContainer::ForEachResult::kContinue;
    });
}
```

> ⚠️ `SetBaseObject` at runtime is safe for visual swaps but do not call it on quest-aliased references — it will break alias binding.

---

## 6. Unified PBR Source Materials Across DLCs

### The Cross-Region Consistency Problem

Far Harbor is blue-grey desaturated fog. The Commonwealth is yellow-green irradiated haze. Nuka-World is orange-red neon. A single PBR material that looks correct in one region will look wrong in another unless calibrated for each lighting environment.

### Solution: Region-Specific Material Variants

```
Data\Materials\YourMod\Flora\
  MutatedVine_Commonwealth.bgsm   ← warm green emittance, roughness 0.75
  MutatedVine_FarHarbor.bgsm      ← cool blue-green emittance, roughness 0.6 (wetter)
  MutatedVine_NukaWorld.bgsm      ← orange-red glow tint, roughness 0.8 (drier)
```

Each BGSM points to the same NIF geometry but different texture sets and emittance colors. The BOS swap (Section 5) selects the correct BGSM for the active worldspace.

### Substance Painter Multi-Region Workflow

Maintain **one source SPP file** with three texture-set outputs:

1. `Commonwealth` texture set: emissive hue HSL(120°, 80%, 50%) — lime green.
2. `FarHarbor` texture set: emissive hue HSL(190°, 70%, 45%) — teal-cyan.
3. `NukaWorld` texture set: emissive hue HSL(30°, 85%, 55%) — amber.

Only the emissive channel differs; diffuse, normal, roughness remain shared. Export all three texture sets from one project.

### BGSM Emittance Calibration

```ini
; MutatedVine_FarHarbor.bgsm (relevant fields)
[BGSMaterial]
EmittanceEnabled = true
EmittanceR = 0.15
EmittanceG = 0.90
EmittanceB = 0.75
EmittanceMultiple = 1.8      ; slightly higher than Commonwealth — fog amplifies glow
EnableEditorAlphaRef = false
RimLightPower = 2.0          ; stronger rim in Far Harbor — fog-scattered backlight
Glossiness = 90              ; wet, foggy = glossier surface
SpecularStrength = 0.6
```

---

## 7. Far Harbor Fog System Hooks

### Making Glow Maps Look Atmospheric in Mist

Far Harbor's volumetric fog is driven by `TESWeather` fog fields and the `FOG` climate record. Hook into them from C++ to scale your plant emittance in real time with fog density:

```cpp
void UpdateFarHarborFogGlow(RE::Actor* plant)
{
    auto* sky = RE::Sky::GetSingleton();
    if (!sky || !sky->currentWeather) return;

    // TESWeather has fogNear / fogFar / fogPower fields
    const float fogNear  = sky->currentWeather->data.fogNear;   // lower = thicker fog
    const float fogFar   = sky->currentWeather->data.fogFar;
    const float fogDepth = std::clamp(1.0f - (fogNear / 3000.0f), 0.0f, 1.0f);

    // Denser fog → higher emittance mult (plant glow diffuses through mist beautifully)
    const float emittanceMult = 1.5f + fogDepth * 2.5f;  // 1.5 clear → 4.0 deep fog

    // Teal-cyan glow for Far Harbor atmosphere
    const RE::NiColorA fogGlow{ 0.15f, 0.9f, 0.75f, 1.0f };

    auto* root = plant->Get3D();
    if (root) ShaderInjection::SetEmittanceRecursive(root, fogGlow, emittanceMult);
}
```

### C++ Weather Change Hook

```cpp
// Register a hook on TESWeather::SetCurrentWeather to react to weather transitions
class WeatherChangeSink : public RE::BSTEventSink<RE::TESWeatherEvent>
{
public:
    RE::BSEventNotifyControl ProcessEvent(
        const RE::TESWeatherEvent* event,
        RE::BSTEventSource<RE::TESWeatherEvent>*) override
    {
        if (!event || !event->weather) return RE::BSEventNotifyControl::kContinue;

        const bool isFarHarborFog = IsFarHarborFogWeather(event->weather->GetFormID());
        // Update all registered Far Harbor plants
        for (auto& [formID, state] : PlantProximity::gPlantStates) {
            auto* plant = RE::TESForm::LookupByID<RE::Actor>(formID);
            if (plant && isFarHarborFog) UpdateFarHarborFogGlow(plant);
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};
```

---

## 8. CI/CD Build System for OG / NG / AE Targets

### Why Three Builds

| Game version | Address Library version | CommonLibF4 branch |
|---|---|---|
| OG (1.10.163) | v1 (pre-NG) | master / pre-NG |
| NG (1.10.984) | v2 (NG) | ng / post-NG |
| AE (1.10.984+) | v2 + AE extras | ng branch |

A DLL compiled for OG will crash on NG because virtual function table offsets differ. You must compile separate DLLs.

### CMake Multi-Target Setup

```cmake
# CMakeLists.txt root
cmake_minimum_required(VERSION 3.21)
project(YourPlantPlugin VERSION 1.0.0)

option(BUILD_OG "Build for OG (1.10.163)" OFF)
option(BUILD_NG "Build for NG/AE (1.10.984)" ON)

if(BUILD_OG)
    set(COMMONLIBF4_TARGET "CommonLibF4-OG")
    add_compile_definitions(GAME_VERSION_OG)
elseif(BUILD_NG)
    set(COMMONLIBF4_TARGET "CommonLibF4-NG")
    add_compile_definitions(GAME_VERSION_NG)
endif()

find_package(${COMMONLIBF4_TARGET} CONFIG REQUIRED)
target_link_libraries(YourPlantPlugin PRIVATE ${COMMONLIBF4_TARGET})
```

### GitHub Actions Workflow (CI/CD)

```yaml
# .github/workflows/build.yml
name: Build Plugin

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-og:
    name: Build OG (1.10.163)
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/cache@v4
        with:
          path: vcpkg
          key: vcpkg-og-${{ hashFiles('vcpkg.json') }}
      - name: Configure CMake (OG)
        run: cmake -B build-og -DBUILD_OG=ON -DCMAKE_BUILD_TYPE=Release
      - name: Build (OG)
        run: cmake --build build-og --config Release
      - uses: actions/upload-artifact@v4
        with:
          name: YourPlantPlugin-OG
          path: build-og/Release/YourPlantPlugin.dll

  build-ng:
    name: Build NG/AE (1.10.984+)
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/cache@v4
        with:
          path: vcpkg
          key: vcpkg-ng-${{ hashFiles('vcpkg.json') }}
      - name: Configure CMake (NG)
        run: cmake -B build-ng -DBUILD_NG=ON -DCMAKE_BUILD_TYPE=Release
      - name: Build (NG)
        run: cmake --build build-ng --config Release
      - uses: actions/upload-artifact@v4
        with:
          name: YourPlantPlugin-NG
          path: build-ng/Release/YourPlantPlugin.dll

  package:
    name: Package Release
    needs: [build-og, build-ng]
    runs-on: windows-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: YourPlantPlugin-OG
          path: release/OG
      - uses: actions/download-artifact@v4
        with:
          name: YourPlantPlugin-NG
          path: release/NG
      - uses: actions/upload-artifact@v4
        with:
          name: YourPlantPlugin-Release
          path: release/
```

### FOMOD Structure for Multi-Version DLL

```xml
<!-- fomod/ModuleConfig.xml -->
<config>
  <moduleName>Mutated Flora Overhaul</moduleName>
  <installSteps order="Explicit">
    <installStep name="Game Version">
      <optionalFileGroups order="SelectExactlyOne">
        <group name="Game Version" type="SelectExactlyOne">
          <plugin name="Original (1.10.163)">
            <files>
              <file source="OG\YourPlantPlugin.dll"
                    destination="F4SE\Plugins\YourPlantPlugin.dll"/>
            </files>
          </plugin>
          <plugin name="Next-Gen / Anniversary (1.10.984+)">
            <files>
              <file source="NG\YourPlantPlugin.dll"
                    destination="F4SE\Plugins\YourPlantPlugin.dll"/>
            </files>
          </plugin>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>
```

---

## 9. Quick-Reference Checklist

| Area | Tool / Method | Key Setting |
|---|---|---|
| Cell load optimization | ADDICTOL (Nexus #66982) | Priority list in ADDICTOL.ini |
| Precombine safety | BOS swap instead of ESP edit | Avoid touching vanilla STAT records |
| Papyrus architecture | Quest manager + thin reference scripts | Regional modules, one active at a time |
| Workshop Framework | ThreadManager + SendCustomEvent | Queue max 5 spawns/frame |
| DLC region detection | OnPlayerLoadGame + GetWorldSpace() | FormID 0x0100C02E = Far Harbor |
| Dynamic plant swap | BOS INI + C++ SetBaseObject | ws: filter for worldspace-specific swaps |
| PBR cross-DLC | Three BGSM variants (one per region) | Same NIF, different emittance hue |
| Far Harbor fog glow | C++ TESWeather fogNear hook | emittanceMult 1.5 (clear) → 4.0 (fog) |
| OG/NG/AE builds | CMake BUILD_OG/BUILD_NG options | GitHub Actions matrix, FOMOD selector |

---

## 10. Common Pitfalls

- **Touching vanilla STAT records in ESP**: always use BOS swap — any STAT edit breaks previs in that cell
- **Running all regional update loops simultaneously**: deactivate non-current region's loops on `OnPlayerLoadGame` — running all three at once triples Papyrus load
- **Direct object reference calls in WF messaging**: always pass `Var[]` akArgs — direct ObjectReference parameters cause null crashes when the reference is in an unloaded cell
- **Single DLL on both OG and NG**: virtual table layout differs — the DLL will crash immediately on the wrong version; always ship OG + NG separately in FOMOD
- **GitHub Actions vcpkg cache miss**: include `vcpkg.json` in the cache key hash or builds will redownload all packages every run
- **BGSM emittance on mesh without glow slot assigned**: BGSM emittance settings are ignored if the NIF's BSLightingShaderProperty has no glow map texture assigned — always assign a `_g.dds` even if it's all white
- **SetBaseObject on aliased reference**: quest alias bindings store the old base form pointer — calling SetBaseObject breaks alias fill conditions silently
