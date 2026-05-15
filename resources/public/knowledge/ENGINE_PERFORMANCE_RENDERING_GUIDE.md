# Engine-Level Performance & Rendering Optimization for Fallout 4 (2026)

A technical reference for the mandatory F4SE plugin stack that keeps a high-fidelity realism mod stable — landscape optimization, CPU/disk priority fixes, Vulkan rendering, DLSS/DLAA upscaling, and Ascension engine patches.

---

## 1. Why Vanilla Performance Management Breaks Under High-Fidelity Assets

Fallout 4's engine was shipped targeting mid-2015 hardware. Its internal cell-loading logic:
- Uses a single-threaded disk I/O queue that stalls on large BA2 reads
- Assigns equal CPU priority to background streaming and the render thread
- Applies outdated TAA that blurs custom 4K/8K textures into mush
- Has a hard landscape LOD distance cap that ignores modern GPU VRAM headroom
- Contains several engine-level bugs (precombine invalidation, heap fragmentation) that compound under heavy asset loads

The 2026 F4SE plugin ecosystem addresses each of these individually.

---

## 2. Excel Fallout 4 — CPU Priority & Disk Cache Enabler

**Excel Fallout 4** (also referred to in the community as the spiritual successor to *Fallout Priority* + *Disk Cache Enabler*) is a combined F4SE plugin that:

1. **CPU Thread Priority**: Elevates the game's main thread and render thread to `THREAD_PRIORITY_HIGHEST`, reduces background streaming threads to `THREAD_PRIORITY_BELOW_NORMAL`. Effect: consistent frame pacing during cell loads, fewer dropped frames during asset streaming.

2. **Disk Cache Enabler**: Calls `SetFileInformationByHandle(FileIoPriorityHintNormal)` on BA2 file handles to prevent Windows marking BA2 reads as low-priority background I/O. Effect: large custom mesh and texture BA2s load 30–60% faster on NVMe drives.

3. **Heap Defragmentation**: Periodically calls `HeapCompact` on the game's default heap to reclaim fragmented pages before the engine's own allocator fails. Complements Buffout 4.

### Installation

- Requires: F4SE, Address Library for F4SE
- Place `ExcelFO4.dll` + `ExcelFO4.toml` in `Data\F4SE\Plugins\`

### `ExcelFO4.toml` Configuration

```toml
[CPU]
MainThreadPriority = "HIGHEST"      # ABOVE_NORMAL | HIGH | HIGHEST
WorkerThreadPriority = "BELOW_NORMAL"
EnableHyperthreadingOptimization = true

[DiskCache]
EnableDiskCacheBoost = true
MaxCacheSizeMB = 512                 # increase for NVMe systems (up to 1024)
PrefetchEnabled = true
PrefetchDepthCells = 2               # prefetch cells 2 ahead of player movement

[Memory]
HeapDefragIntervalSeconds = 60
EnableLargePageSupport = true        # requires Windows UAC change (optional)
```

### Compatibility

| Mod | Compatible | Notes |
|---|---|---|
| Buffout 4 (MemoryManager=true) | ✅ | Use both — they target different subsystems |
| ENB Series | ✅ | ENB bypasses DirectX present — no conflict |
| DLSS injection | ✅ | |
| Fallout Priority (legacy) | ❌ | Superseded by ExcelFO4 — do not run both |
| Disk Cache Enabler (legacy) | ❌ | Superseded by ExcelFO4 — do not run both |

---

## 3. Landscape Optimization — Engine-Level Texture Rendering

### What Landscape Optimization Does

Vanilla landscape rendering in FO4 uses a fixed-function pipeline for terrain blending that:
- Limits landscape to 6 layers per cell
- Applies a fixed 512px resolution to blend normals regardless of GPU capability
- Ignores PBR material properties on terrain

A modern landscape optimization F4SE plugin patches these limits and enables:
- **Extended layer count**: up to 9 layers per cell via engine hook
- **High-res blend normals**: up to 2048px terrain blend resolution
- **PBR terrain materials**: reads roughness/metalness from BGSM files on landscape textures (if provided)

### Landscape Texture Replacement

For a mutated vegetation overhaul, replace the terrain beneath plants:

1. Create new `LandscapeTexture` records in CK pointing to your mutated-soil BGSM
2. BGSM includes: diffuse `_d.dds` (irradiated mud, BC3), normal `_n.dds` (BC5), specular `_s.dds` (BC3), optional AO
3. In xEdit, assign your new LandscapeTexture FormID to `LTEX` records in the cells containing your flora
4. Landscape optimizer plugin picks up roughness and PBR values from BGSM at runtime

### Cell Boundary Safety

- Work **within** existing vanilla cell boundaries — do not add new cells unless unavoidable
- Landscape texture changes are cell-local — they don't affect precombines
- LTEX changes in xEdit are safe; they only modify which texture is painted on terrain

---

## 4. Vulkan Rendering — FO4Edit / Engine Backend Swap

**Vulkan Rendering** (sometimes called "Fallout 4 Vulkan Renderer" on GitHub) wraps the game's DirectX 11 API calls via a D3D11-to-Vulkan translation layer (similar in concept to DXVK on Linux, ported to Windows).

### What It Does

- Reduces CPU-side D3D11 draw call overhead by ~15–25% on modern NVIDIA/AMD GPUs — important when rendering 2,000+ high-poly plant instances
- Enables async compute shaders for lighting calculations that FO4's D3D11 path serializes
- Improves VRAM management: Vulkan's explicit memory model avoids the driver-side re-allocation that causes stutters when switching between dense cell areas
- Multi-threaded command buffer recording: render thread no longer single-threaded blocked on draw submission

### Installation

1. Place `d3d11.dll` (Vulkan wrapper) in the Fallout 4 root (same folder as `Fallout4.exe`)
2. If using ENB: ENB also replaces `d3d11.dll` — use the Vulkan wrapper's ENB-compatible build, or chain via ENB's `UseD3D11Proxy = true` + `ProxyLibrary = vulkan_wrapper.dll` in `enblocal.ini`
3. If using DLSS injection: load order must be Vulkan wrapper → DLSS injector → ENB (check each project's README for chaining instructions)

### `enblocal.ini` Vulkan Chaining

```ini
[PROXY]
EnableProxyLibrary=true
InitProxyFunctions=true
ProxyLibrary=vulkan_wrapper.dll
```

### Performance Expectations

| Hardware | Expected FPS Improvement |
|---|---|
| NVIDIA RTX 3000+ | 10–20% in dense custom flora cells |
| NVIDIA GTX 1000/2000 | 5–12% |
| AMD RX 6000+ | 12–22% (Vulkan is AMD's native API) |
| AMD RX 5000 | 8–15% |

> ⚠️ The Vulkan wrapper is not compatible with very old (pre-2016) GPU drivers. Ensure GPU driver is 2023+ before using.

---

## 5. DLSS / DLAA Injection

### Why Vanilla TAA Ruins Custom Textures

FO4's native TAA applies a 1–2 pixel temporal blur that smears fine detail in 4K/8K textures, high-resolution glow maps, and PBR normal maps. The bioluminescent vein micro-detail from your `_g.dds` glow mask becomes an indistinct glow blob. DLSS/DLAA replaces TAA entirely.

### DLSS 4 (Super Resolution + Frame Generation)

DLSS injection for FO4 replaces `nvngx_dlss.dll` and hooks the game's TAA pass:

1. Download the FO4 DLSS injector from GitHub (search "Fallout4 DLSS" — maintained repos include those by PureDark and others in the FO4 modding community)
2. Place `nvngx_dlss.dll`, `nvngx_dlssg.dll` (frame gen), and the injector DLL in the FO4 root
3. Configure via `DLSS.ini`:

```ini
[DLSS]
Enabled=1
Mode=3             ; 0=Off 1=DLSS-Q 2=DLSS-B 3=DLSS-P (Performance) 4=DLSS-AA
FrameGeneration=1  ; requires RTX 4000+
SharpenStrength=0.3
; ReactiveMask improves TAA on vegetation / alpha-tested leaves
ReactiveMask=1
ReactiveMaskThreshold=0.35

[DLAA]
EnableForUI=0
```

**DLSS Modes for Flora Mods:**
- **DLSS Quality** (Mode=1): best for 1440p → 4K output; sharpest custom textures
- **DLSS Performance** (Mode=3): best for 1080p → 4K with RTX 3000; high fps in dense flora cells
- **DLAA** (Mode=4): no upscaling, only anti-aliasing; use for native 4K monitors

### Reactive Mask for Vegetation

The Reactive Mask (`ReactiveMask=1`) tags alpha-tested geometry (leaves, thin vines, grass) so DLSS applies lighter temporal blending to them — avoids "ghosting" artifacts on swaying plants. Always enable for flora-heavy mods.

### DLAA (Without DLSS Upscaling)

For players at native 4K who don't need resolution upscaling, DLAA provides the same TAA replacement benefit:
- No resolution scaling
- Full temporal anti-aliasing quality
- Eliminates the TAA blur on 4K glow maps and normal maps
- Compatible with ENB

```ini
[DLSS]
Enabled=1
Mode=4             ; DLAA only
ReactiveMask=1
```

### Compatibility Stack

```
Fallout4.exe
  └─ d3d11.dll (Vulkan wrapper, optional)
       └─ nvngx_dlss.dll (DLSS/DLAA injector)
            └─ enbseries.dll (ENB)
                 └─ ReShade (optional, load after ENB)
```

---

## 6. Ascension — Mandatory Engine Fixes (2026)

> **⚠️ 2025/2026 Update — Addictol supersedes Buffout 4 and many other plugins:**
> As of mid-2025, **Addictol** (Nexus #84214) is the all-in-one engine stability suite that replaces Buffout 4 (all variants), X-Cell, BakaMaxPapyrusOps, Baka ScrapHeap, Fallout Priority, Faster Workshop, and more. Do **not** install Buffout 4 or any of those superseded tools alongside Addictol. The components listed below are the current 2026 stack — use Addictol in place of any individual Buffout 4 reference.

**Ascension** refers to the collection of F4SE plugins (maintained as a suite or individually) that fix engine-level bugs that become critical under high-fidelity asset loads. For a 2026 realism mod, these are non-optional.

### Components (2026 Stack)

| Plugin | What It Fixes |
|---|---|
| `Addictol.dll` (Nexus #84214) | **ALL-IN-ONE**: memory manager, heap fragmentation, script performance, FaceGen bugs, workshop speed, crash fixes, micro-stutter, and much more. **Replaces Buffout 4 entirely.** |
| `ExcelFO4.dll` | CPU priority, disk cache, heap defrag |
| `HighFPSPhysicsFix.dll` | Physics tied to frame rate — decouples engine physics from vsync |
| `LooksMenu.dll` (optional) | Face mesh corruption in high-poly scenes |
| `MCMSettingsManager.dll` | MCM INI stability for mods with many settings |
| `PipboyFramerateManager.dll` | Pipboy open/close stutter at >60 FPS |
| `BiomesXCellLoader.dll` (if available) | Async cell load improvements beyond ExcelFO4 |

### High FPS Physics Fix — Critical for Flora

Fallout 4's physics engine (Havok) runs at a fixed internal step of 60 Hz. At 120+ FPS the engine advances physics faster than Havok can process, causing:
- Plant vine physics to spasm and teleport
- Wind vertex deformation to over-shoot
- HKX bone chains (your sentient plant vine bones) to desync

`HighFPSPhysicsFix.toml` configuration:

```toml
[Main]
EnableHavokFix = true
TargetFPS = 0         ; 0 = auto-detect monitor refresh rate
EnableFrameCapDuringLoadingScreens = true
FrameCapDuringLoadingScreens = 60  ; prevent load-screen micro-stutters

[PhysicsThrottle]
EnablePhysicsThrottle = false      ; don't throttle physics — just fix the bug
MaxFPS = 0                          ; 0 = uncapped
```

### `Ascension.ini` Master Configuration

Some Ascension suite versions provide a master INI that enables/disables individual fixes:

```ini
[Fixes]
HeapFix = true
ScriptFix = true
CellLoadFix = true         ; addresses async cell-load race conditions
PrecombineFixBugfix = true ; prevents precombine invalidation cascades
TextureStreamFix = true    ; improves texture streaming under 4K/8K load
SaveLoadFix = true         ; prevents save corruption from script-heavy flora mods
ActorCountFix = true       ; extends NPC/actor limit (needed for dense plant NPC_ actors)

[Performance]
EnableCPUOptimizations = true
EnableGPUOptimizations = true
MaxTextureStreamWorkers = 4   ; increase for 8+ core CPUs
```

### ActorCountFix — Required for Plant NPC_ Actors

If your mutated plants are implemented as `NPC_` actors (sentient plant architecture), the vanilla engine has a hard limit of ~1024 simultaneous loaded actors per worldspace. With dense vegetation + vanilla NPCs + your plant actors, this limit is easily hit.

`ActorCountFix` patches the engine's actor array to support up to 4096 simultaneous loaded actors:

```toml
[ActorLimit]
ExtendActorLimit = true
MaxActors = 4096   ; default 1024; each loaded plant NPC_ counts as 1
```

---

## 7. Complete 2026 Performance Stack — Load Order

Install in this order (bottom = loads last / highest priority):

```
1. F4SE 0.7.7+ (from f4se.silverlock.org)
2. Address Library for F4SE — All In One (Nexus #47327)
3. Visual C++ Redistributables 2015–2022
4. Addictol (Nexus #84214) — ALL-IN-ONE: memory, heap, scripts, FaceGen, workshop, crash fixes
   ⚠️ Do NOT also install Buffout 4, X-Cell, BakaMaxPapyrusOps, Faster Workshop, etc.
5. High FPS Physics Fix + toml (Nexus #44798)
6. Excel Fallout 4 + toml
7. Ascension suite plugins (CellLoadFix, ActorCountFix, TextureStreamFix) — if separately maintained
8. ENB Series (enbseries.ini + enblocal.ini)
9. Vulkan wrapper d3d11.dll (if used — chain via enblocal.ini ProxyLibrary)
10. DLSS / DLAA injector
11. Your mutated flora mod (ESP/BA2)
12. LOD output BA2 (xLODGen/DynDOLOD)
13. CLASSIC crash scanner (Nexus #56255) — post-crash diagnostics only
```

### FOMOD Version Selector

Your mod's FOMOD installer should present this selection step:

```xml
<installStep name="Performance Plugins">
  <optionalFileGroups order="SelectAll">
    <group name="Required Fixes" type="SelectAll">
      <plugin name="Buffout 4 Preset (included)">
        <files>
          <file source="config\Buffout4.toml"
                destination="F4SE\Plugins\Buffout4.toml"/>
        </files>
        <typeDescriptor><type name="Required"/></typeDescriptor>
      </plugin>
      <plugin name="Excel FO4 Preset (included)">
        <files>
          <file source="config\ExcelFO4.toml"
                destination="F4SE\Plugins\ExcelFO4.toml"/>
        </files>
        <typeDescriptor><type name="Required"/></typeDescriptor>
      </plugin>
      <plugin name="High FPS Physics Fix Preset">
        <files>
          <file source="config\HighFPSPhysicsFix.toml"
                destination="F4SE\Plugins\HighFPSPhysicsFix.toml"/>
        </files>
        <typeDescriptor><type name="Optional"/></typeDescriptor>
      </plugin>
    </group>
  </optionalFileGroups>
</installStep>
```

---

## 8. Crash Diagnostics — CLASSIC

**CLASSIC** (Crash Log Auto Scan & Identification for the Creation Engine) is the standard crash-log analyzer for FO4. It reads Buffout 4's crash logs and identifies the most likely cause.

Run CLASSIC after any crash involving your flora mod:

```bash
CLASSIC.exe --log "Documents\My Games\Fallout4\F4SE\crash-2026-*.log" --output report.txt
```

Common CLASSIC crash signatures for flora mods:

| CLASSIC Output | Cause | Fix |
|---|---|---|
| `BSResource::EntryDB` | BA2 read failure | Repack BA2, check archive format |
| `NiAlphaProperty` | Alpha-sorted mesh crash | Set correct NiAlphaProperty on leaf meshes in NifSkope |
| `BSLightingShaderProperty` | Null shader material | Ensure _d.dds assigned to every BSLightingShaderProperty slot |
| `ScrapHeap::Allocate` | Script heap full | Increase `iMaxAllocatedMemoryBytes`, reduce per-reference scripts |
| `TESObjectREFR::GetEditorID` | Null reference | Check for esp-missing-master or broken alias |
| `ActorValueOwner` | Actor limit exceeded | Enable `ActorCountFix`, increase MaxActors |

---

## 9. Quick-Reference Checklist

| Tool | Purpose | Key Setting |
|---|---|---|
| Addictol (Nexus #84214) | ALL-IN-ONE: memory, heap, FaceGen, workshop, crash fixes | Supersedes Buffout 4 entirely — do not use both |
| Excel Fallout 4 | CPU priority + disk cache + heap defrag | `DiskCache.MaxCacheSizeMB=512`, `PrefetchDepthCells=2` |
| High FPS Physics Fix | Decouple physics from frame rate | `EnableHavokFix=true`, `MaxFPS=0` |
| Ascension suite | CellLoadFix + ActorCountFix + TextureStreamFix | `MaxActors=4096`, `MaxTextureStreamWorkers=4` |
| Vulkan wrapper | D3D11→Vulkan, async compute, multi-thread rendering | `enblocal.ini ProxyLibrary=vulkan_wrapper.dll` |
| DLSS/DLAA injector | Replace TAA, sharpen 4K/8K custom textures | `Mode=1` (Quality) or `Mode=4` (DLAA), `ReactiveMask=1` |
| CLASSIC | Crash log analysis | Run post-crash; check for `BSLightingShaderProperty` / `ActorValueOwner` signatures |

---

## 10. Common Pitfalls

- **Running legacy Fallout Priority + ExcelFO4 simultaneously**: both elevate thread priority — they conflict and can cause scheduler thrashing; use only ExcelFO4
- **Vulkan wrapper + wrong ENB chaining order**: ENB must load *after* the Vulkan wrapper via `ProxyLibrary`; reversed order causes black screen
- **DLSS without ReactiveMask on vegetation**: ghosting artifacts on swaying plants at >60 FPS; always enable `ReactiveMask=1`
- **DLSS Frame Generation on RTX 3000 or earlier**: Frame Generation requires RTX 4000+; set `FrameGeneration=0` on older hardware
- **ActorCountFix disabled with NPC_ plant actors**: hitting the 1024 actor limit silently prevents new plant NPC_s from loading; check actor count via F4SE console `GetActorCount`
- **Texture stream workers set too high on quad-core CPU**: `MaxTextureStreamWorkers=4` on a 4-core system steals cores from the render thread; cap at CPU_cores/2
- **CLASSIC not updated to match Buffout 4 version**: CLASSIC crash signature database must match the Buffout 4 version generating the logs; always update both together
