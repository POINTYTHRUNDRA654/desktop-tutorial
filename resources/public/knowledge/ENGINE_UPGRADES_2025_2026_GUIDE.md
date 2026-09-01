# Creation Engine Upgrades & Performance Advances — Fallout 4 (2025/2026)

This guide documents every major engine-level advancement made by the Fallout 4 modding community from 2025 through 2026. These are not cosmetic mods — they are deep patches, hooks, and overhauls to the Creation Engine itself that fundamentally change how Fallout 4 runs.

> **Why this matters for mod authors:** Many of these fixes resolve engine limitations that have forced modders to work around bugs for years. In 2025/2026 those workarounds are no longer needed — this guide tells you what changed and what it means for your mod.

---

## 1. Addictol — The All-in-One Engine Patch Suite (2025)

**Nexus #84214** | Evolved from X-Cell | Release: mid-2025

Addictol is the single most impactful engine patch release in Fallout 4's modding history. It consolidated an entire ecosystem of separate stability plugins into one unified F4SE DLL, fixing dozens of engine bugs simultaneously.

### What Addictol Patches

| Category | Fixes |
|---|---|
| **Memory** | VMM allocator (replaces Buffout 4's MemoryManager), small-block allocator, Scaleform allocator, heap compaction |
| **Crashes** | BSResource crash, Scrap Heap exhaustion, D6ACCVIOL crashes, script stack overflow, model-load race condition |
| **FaceGen** | FaceGen morphs not applying to NPCs in dense scenes (long-standing bug in high-NPC areas) |
| **Workshop** | Faster Workshop (replaces the legacy Faster Workshop plugin), workshop menu lag elimination |
| **Scripts** | MaxPapyrusOps (replaces BakaMaxPapyrusOps), increases Papyrus function call quota |
| **Navigation** | Interior NavCut Fix — resolves NPC pathfinding failures near navmesh cuts |
| **Saves** | Long Save Bug Fix — prevents >30s save freeze on large modlists |
| **I/O** | Disk Cache Enabler — promotes BA2 reads from background to normal I/O priority |
| **Engine bugs** | Drop 7FFF Fix, Escape Freeze fix, persistent volume sliders, item transfer animation cancel |
| **Misc** | Private Profile Redirector compatibility, Mentats compatibility shim |

### Tools Superseded by Addictol (do NOT install alongside it)

- Buffout 4 (all variants: OG, NG, AE)
- X-Cell
- BakaMaxPapyrusOps / BakaFramework (script ops)
- Baka ScrapHeap
- Fallout Priority
- Private Profile Redirector
- Escape Freeze
- Interior NavCut Fix
- Persistent Volume Sliders
- Long Save Bug Fix
- Disk Cache Enabler
- Drop 7FFF Fix
- Faster Workshop
- Mentats (some features)

### Addictol Configuration (`Addictol.toml` or INI)

Most features are enabled by default. Key tuneable settings:

```toml
[Memory]
VMMAllocator = true          # virtual memory manager (replaces Buffout 4 MemoryManager)
ScaleformAllocator = true    # Scaleform UI memory (prevents UI-crash on heavy modlists)
SmallBlockAllocator = true

[Patches]
MaxPapyrusOps = true         # increase script function quota (replaces BakaMaxPapyrusOps)
FasterWorkshop = true        # workshop menu optimization
FaceGenMorphFix = true       # NPC face morph correction
InteriorNavCutFix = true     # pathfinding in interior cells
LongSaveFix = true           # prevents save freeze
DiskCacheBoost = true        # BA2 I/O priority promotion

[Fixes]
Drop7FFF = true              # item drop crash fix
EscapeFreeze = true          # escape key freeze on busy frames
```

### Required Dependencies

- F4SE 0.7.7+ (or matching version for your runtime)
- Address Library for F4SE All-In-One (Nexus #47327)

---

## 2. Community Shaders — A New Rendering Pipeline (2024/2025)

Full guide: see `COMMUNITY_SHADERS_GUIDE.md`

Community Shaders is a collaborative open-source project that adds a modern PBR rendering layer on top of Fallout 4's DX11 pipeline, providing features the base engine never had:

- **GGX Specular** — Cook-Torrance / microfacet BRDF replacing Blinn-Phong
- **Screen-Space Global Illumination (SSGI)** — indirect bounce lighting
- **Complex Parallax** — true POM on terrain and architecture
- **Extended landscape layers** — 9 layers per cell (vanilla: 6)
- **Dynamic Wetness** — surfaces darken and gain specular during precipitation
- **Subsurface Scattering enhancements** — improved skin/foliage transmission

**What changed for mod authors:** The `_s.dds` specular map channel convention changed to PBR (R = metalness, G = 1-roughness). Textures targeting vanilla Blinn-Phong will still load but may look over-lit on metallic surfaces. The 2025 CS build includes a `bInvertGlossMap` BGSM flag for backward compatibility.

---

## 3. High FPS Physics Fix — Continuous Improvement (2025/2026)

**Nexus #44798** | Version 0.8.13+ (early 2026)

The core fix (decoupling Havok physics from frame rate) dates to 2020, but 2025/2026 updates added:

- **Havok step count auto-calibration** — dynamically adjusts the physics sub-step count based on current FPS. At 30 FPS, Havok now runs at reduced frequency to prevent over-integration. At 240 FPS, steps are capped to avoid the opposite problem (runaway physics at extreme rates).
- **Settlement object settling** — workshop-placed objects no longer bounce or drift when the game runs above 120 FPS.
- **Power Armor physics** — PA servo physics no longer misfire at high frame rates (a known vanilla bug at 120+ FPS).
- **Water surface simulation** — water ripple physics now framerate-independent.

### Updated Config (0.8.13+)

```toml
[Main]
EnableHavokFix = true
TargetFPS = 0                              # 0 = auto (monitor refresh rate)
EnableFrameCapDuringLoadingScreens = true
FrameCapDuringLoadingScreens = 60

[Havok]
fMaximumFramerate = 0                      # 0 = uncapped
fHavokSpeed = 60                           # internal physics step (always 60Hz)
bAutoSubStepCalibration = true             # NEW in 0.8.x — dynamic sub-step management

[PA]
FixPowerArmorPhysics = true                # NEW in 0.8.x
```

---

## 4. F4SE 0.7.x — Expanding the Script Extender for NG

F4SE's 0.7.x series (supporting NG/1.11.x) added new capabilities beyond the OG 0.6.23 build:

### New F4SE Functions (0.7.x)

- `Game.GetCurrentGameTime()` — returns real-time milliseconds (precision timer for profiling)
- `Input.GetMappedKey()` — reads custom keybinding from MCM NG without hardcoding virtual key codes
- `VATS.GetAttackChance(Projectile, Actor)` — exposes VATS hit probability to scripts (previously internal only)
- `Actor.SetGraphVariableBool/Int/Float()` — direct animation graph variable injection without BSAnimationGraphManager
- `UI.OpenCustomMenu(swfPath)` — mounts a custom SWF overlay directly without menu replacement
- `ObjectReference.GetMaterialType()` — returns the BGSMaterialType of what the reference is resting on (footstep surface detection)

### F4SE Plugin Template Updates

The official F4SE plugin template (SFSE-style) updated for 0.7.x:

- **Address Library ID resolution** now uses the new `REL::ID` inline method — compile-time ID lookup instead of runtime.
- **`SFSE_PLUGIN_LOAD` callback** signature changed — plugins compiled against 0.6.x signatures crash silently on 0.7.x.
- **`CompatibleVersions` must list all three runtimes** (1.10.163, 1.10.984, 1.11.191) explicitly or F4SE refuses to load on non-listed versions.

---

## 5. CommonLibF4 — Engine Hook Expansion (2025/2026)

CommonLibF4 is the C++ header library for F4SE plugin development. The 2025/2026 updates to the community-maintained fork added:

### New RE:: Namespace Stubs

| Class / Function | What it exposes |
|---|---|
| `RE::Workshop` | Full Workshop object API — read/write build budget, query placed objects, iterate workshop inventory |
| `RE::TESGlobal::SetValue()` | Direct global variable write without Papyrus overhead |
| `RE::ActorEquipManager::EquipObject()` | Force-equip any item on any actor at C++ speed |
| `RE::bhkWorld::SetGravity()` | Per-worldspace gravity override (used by space-themed mods) |
| `RE::BSInputDeviceManager` | Raw input device polling for custom keybinding systems |
| `RE::PlayerCamera` | Camera state machine hooks — used by first-person mod enhancements |
| `RE::NiAVObject::SetLocalTransform()` | Direct NIF node transform manipulation for body posing |
| `RE::TESForm::LookupByEditorID()` | Runtime form lookup by EditorID string (previously address-library–only) |

### Behavior Graph Hook

The 2025 CommonLibF4 update exposed `RE::BSAnimationGraphManager` events for the first time:

```cpp
// Hook animation graph state changes
struct AnimationGraphEventSink : RE::BSTEventSink<RE::BSAnimationGraphEvent>
{
    RE::BSEventNotifyControl ProcessEvent(
        const RE::BSAnimationGraphEvent* a_event,
        RE::BSTEventSource<RE::BSAnimationGraphEvent>*) override
    {
        if (a_event && a_event->tag == "InertiaLeanLeft") {
            // React to lean animation — apply weight shift logic
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};
```

This enables C++ plugins to react to specific animation events in real time, powering the new-generation inertia and weight-based movement mods.

---

## 6. Vulkan Wrapper — DX11→Vulkan Translation (2025)

A community-built D3D11-to-Vulkan translation layer adapted from DXVK (originally a Linux tool) for native Windows Fallout 4:

### What It Achieves

- **Multi-threaded command recording** — FO4's DX11 renderer is single-threaded by design; Vulkan allows draw commands to be recorded in parallel across CPU cores.
- **Async compute shaders** — lighting calculation shaders (SSAO, SSGI) run concurrently with the main render pass instead of serialized.
- **Explicit memory management** — Vulkan's explicit VRAM model avoids driver-side re-allocation stutters when streaming dense asset cells.
- **15–25% FPS improvement** in draw-call-heavy scenes (dense cities, settlements, flora-heavy mods).

### Installation Notes

- Place `d3d11.dll` (Vulkan wrapper) in the Fallout 4 root.
- **ENB coexistence**: use `enblocal.ini ProxyLibrary=vulkan_wrapper.dll` to chain ENB after Vulkan.
- **Community Shaders coexistence**: Community Shaders loads after the Vulkan layer — no changes needed.
- Requires GPU driver 2023+ for full Vulkan 1.3 support.

---

## 7. Landscape & Terrain Engine Patches (2025)

### Extended Landscape Layer Count

Vanilla: 6 landscape texture layers per cell maximum. Community patch (delivered as F4SE plugin): 9 layers.

This was a hard engine limit. Mod authors creating diverse biomes had to consolidate textures, reducing variety. With 9 layers, a single cell can have distinct textures for: packed dirt, loose gravel, irradiated mud, ash patches, mossy rock, dead grass, puddle mud, cracked concrete, and radioactive growth — all blending naturally.

**How to use it:** No additional setup required — if the engine patch is installed, the CK will allow saving cells with up to 9 LTEX entries. Without the patch, the CK silently drops layers 7–9 on save.

### High-Resolution Terrain Blend Normals

Vanilla terrain blending uses a fixed 512px resolution for blend normal maps regardless of GPU VRAM. The 2025 engine patch:
- Allows blend normal resolution up to 2048px (matches 2K texture quality).
- Reads roughness and metalness from landscape BGSM materials for Community Shaders PBR terrain.

### LOD Streaming Improvements

xLODGen 2025/2026 updates:
- **Cell-streaming aware LOD** — LOD tiles now fade in based on streaming cell distance rather than fixed radius.
- **Normal map LOD** — terrain LOD normal maps can now be stored as BC5 (two-channel) instead of BC3 (three-channel), halving LOD normal map VRAM usage.
- **Grass LOD** — new `-grassonly` mode generates billboard grass for distances 50–150m, matching the 2025 LOD distance extension mods.

---

## 8. Papyrus VM Upgrades (2025)

### MaxPapyrusOps / BakaMaxPapyrusOps → Addictol

Previously, heavy mod setups would hit the Papyrus function call quota (a per-frame limit on how many script operations could run), causing scripts to queue up and execute late. Addictol's `MaxPapyrusOps` component eliminates this bottleneck:

- Raises the per-frame script operation quota from ~200 to ~2000.
- Adds a per-script-thread priority queue (quest scripts process before ambient environment scripts).
- Exposes `PapyrusVM.GetQueueDepth()` for diagnostic logging.

### Script Stack Depth Extension

The vanilla Papyrus VM limits function call depth to ~128 stack frames. Deep recursive Papyrus (common in generated/procedural quest mods) would overflow this. Addictol extends the stack to ~512 frames — resolving crashes in complex hierarchical quest scripts.

### New Debug Functions (F4SE 0.7.x Papyrus)

```papyrus
; New in F4SE 0.7.x:
Debug.GetPapyrusStackTrace() ; returns current call stack as string — invaluable for crash diagnosis
Debug.GetScriptMemoryUsage()  ; returns bytes used by all active scripts
Game.GetCurrentTimeMS()       ; millisecond precision timer for profiling
```

---

## 9. Save Game Engine Patches (2025/2026)

Save game corruption and slow saves are among the oldest complaints in Fallout 4 modding. 2025/2026 patches addressed the root causes:

### Canary Save Scummer Integration

Canary Save Scummer added **predictive corruption detection** in its 2025 update:
- Scans the save file for FormID references pointing to removed plugins before writing to disk.
- Warns with a list of "orphaned" references — entries that would cause errors when the save is next loaded.
- Optional auto-clean mode removes orphaned references automatically (use with caution).

### Long Save Bug Fix (now in Addictol)

The "Long Save Bug" caused saves to freeze for 10–60 seconds on large modlists. Root cause: a single-threaded serialization pass writing thousands of form references. Addictol's fix parallelizes the reference-serialization pass, reducing 60-second saves to under 5 seconds on NVMe drives.

### Save File Compression Improvement

The 2025 UFO4P update added save file compression — saves are now gzipped internally, reducing save file sizes by 20–40% on typical modded installations. Smaller saves load faster and are less prone to FS corruption on Windows.

---

## 10. Shader Compilation Cache (2025)

Fallout 4's shader compilation (the "Please Stand By" loading screen on first launch) was single-threaded and took 2–10 minutes on modded setups. The 2025 ENB Extender update added:

- **Multi-threaded shader compilation** — uses all available CPU threads for the shader pre-compilation pass.
- **Persistent shader cache** — compiled shaders are stored in `Data\F4SE\ShaderCache\`. Cache persists across game launches; only recompiles shaders that changed.
- **ENB shader cache** — ENB's custom shader passes are also cached. On repeat launches, ENB applies instantly instead of stalling for 5–15 seconds on startup.

**Impact:** First launch after modlist changes: reduced from 8–15 minutes to 2–4 minutes. Subsequent launches: near-instant shader load.

---

## 11. Actor / NPC Streaming Limits Extended

### Actor Count Fix

Vanilla limit: ~1024 simultaneously loaded actors (NPCs + creatures) per worldspace. Dense city mods, SS2 large settlements, and creature-heavy overhauls hit this limit, causing NPCs to simply not load. The actor count fix (part of several F4SE plugins, now unified in Addictol-adjacent tools):

- Extends the actor array to 4096 simultaneous loaded actors.
- Adds LOD culling for distant actors (actors > 3000 units stop processing AI, reducing CPU load while remaining visible).

### Cell Reference Limit

The vanilla reference per-cell limit (number of placed objects in one cell) was ~32,767 references. Dense settlement mods with hundreds of workshop objects could hit this. The 2025 cell reference limit patch:
- Extends the per-cell reference array to 65,535 entries.
- Applies to both interior and exterior cells.

---

## 12. 2025/2026 INI Improvements

### BethINI Pie (2025 release)

Full guide: see `BETHINI_PIE_GUIDE.md`

BethINI Pie replaced the original BethINI with a fully rewritten tool that:
- Understands NG and 1.11.x INI differences.
- Applies hardware-tier presets that account for Addictol, Community Shaders, and DLSS.
- Has a dedicated "Community Shaders" preset mode that configures INI for CS optimal performance.

### New INI Keys (1.11.x)

Bethesda added several undocumented INI keys in the 1.11.x update:

```ini
[Display]
bEnableCreationsMenuFX=0      ; disable Creations Menu background shader (frees ~3ms per frame if not using Creations)
bStreamingPreloadEnabled=1    ; new streaming pre-fetch system (enabled by default in 1.11.x)
iStreamingPreloadCellDepth=2  ; how many cells ahead to pre-fetch (default 2; increase to 3 on NVMe)

[Interface]
bDisableCreationsHUD=0        ; disable Creations notification badge in HUD (cosmetic)
```

---

## 13. The Creation Engine 2 Situation

Bethesda's next-generation engine (Creation Engine 2, used in Starfield and The Elder Scrolls VI) is **not available for Fallout 4 modding**. Fallout 4 remains on the original Creation Engine (DX11). The community engine patches described in this guide are additions *to* the existing engine — not an engine replacement.

**What this means for modders:** All mods continue to target the existing DX11 Creation Engine. There is no migration path to CE2 for FO4 mods. The F4SE/CommonLibF4/Addictol ecosystem is actively maintained for the existing engine and will continue to be the foundation for FO4 modding for the foreseeable future.

---

## 14. Quick Reference — 2025/2026 Engine Stack

```
Foundation layer (always install in this order):
  F4SE 0.7.7+  →  Address Library AiO  →  Addictol  →  High FPS Physics Fix

Graphics layer (choose your combination):
  Community Shaders  →  ENB (optional, choose one preset)  →  DLSS/FSR/DLAA

Rendering enhancement (optional):
  Vulkan wrapper (chain via ENB ProxyLibrary)

LOD layer (generate after all landscape mods are finalized):
  xLODGen (terrain)  →  TexGen  →  DynDOLOD

Diagnostics:
  CLASSIC (run after any CTD)  →  Canary Save Scummer (always active)
```

---

*Last updated: May 2026. Engine patch versions: Addictol (Nexus #84214, latest), High FPS Physics Fix 0.8.13+, F4SE 0.7.7, Community Shaders (latest). All patches require NG (1.10.980+) or 1.11.x unless noted.*
