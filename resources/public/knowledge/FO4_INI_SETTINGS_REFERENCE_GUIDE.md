# Fallout 4 INI Settings Reference Guide

Fallout 4 uses three layered INI files to control virtually every aspect of the engine — graphics, audio, Papyrus scripting, LOD, grass, archives, and more. Understanding which file controls what, what each setting actually does, and what safe values look like is essential for both modders and players. This guide documents 80+ individual settings with explanations, safe ranges, common mistakes, and performance/quality tradeoff notes.

---

## The Three INI Files and How They Layer

| File | Location | Purpose |
|---|---|---|
| `Fallout4.ini` | `Documents\My Games\Fallout4\` | Base settings; mostly untouched by users |
| `Fallout4Prefs.ini` | `Documents\My Games\Fallout4\` | Launcher-written settings (graphics, audio) |
| `Fallout4Custom.ini` | `Documents\My Games\Fallout4\` | **Your overrides**; survives launcher resets |

**The golden rule:** Always put your custom changes in `Fallout4Custom.ini`. The game launcher rewrites `Fallout4Prefs.ini` on every launch, and `Fallout4.ini` is considered a base file that the launcher may also reset. `Fallout4Custom.ini` is never touched by the launcher and safely persists.

> **⚠️ WARNING:** Do NOT copy the entire contents of one INI into Custom.ini. Only add the specific keys you want to override. Redundant or conflicting entries slow parsing and can cause unexpected behavior.

### How MO2 and Vortex handle INIs
- **MO2**: Each profile has its own `Fallout4Custom.ini` at `\MO2\profiles\<ProfileName>\`. Edits you make in-game or via the INI editor are profile-scoped.
- **Vortex**: Uses a staging folder; the game's `Documents` INIs are live. Edit them directly.

---

## [Archive] Section

Controls which BA2 archive files are loaded and in what order. **This section must be in `Fallout4Custom.ini`** for mod archives to load.

### `sResourceDataDirsFinal`
```ini
[Archive]
sResourceDataDirsFinal=STRINGS\
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Tells the engine which loose-file directories to allow. The value `STRINGS\` is the default; having this key present (even with just `STRINGS\`) unlocks loose file loading needed by most mods.
- **Safe value**: `STRINGS\` — do not remove this or add random paths.
- **⚠️ WARNING**: Some older guides told users to add `TEXTURES\, MESHES\` etc. here. This is **not necessary** on modern setups (post-NG) and can conflict with BA2 loading priority.

### `sResourceArchive2List`
```ini
[Archive]
sResourceArchive2List=Fallout4 - Textures1.ba2, Fallout4 - Textures2.ba2, Fallout4 - Textures3.ba2, Fallout4 - Textures4.ba2, Fallout4 - Textures5.ba2, Fallout4 - Textures6.ba2, Fallout4 - Textures7.ba2, Fallout4 - Textures8.ba2, Fallout4 - Textures9.ba2
```
- **File**: `Fallout4.ini` (base; do not override unless adding DLC archives)
- **What it does**: Lists all BA2 texture archives to load on startup.
- **⚠️ WARNING**: If your Custom.ini has a `sResourceArchive2List` entry it **replaces** the base list entirely — you'll lose all vanilla textures. To add archives, list everything including vanilla entries.

### `bInvalidateOlderFiles`
```ini
[Archive]
bInvalidateOlderFiles=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Allows loose files to override BA2-packed files of the same name. **Required for most texture and mesh replacer mods.**
- **Safe value**: `1` (always on for modded installs)
- **Performance**: Negligible impact.

---

## [Display] Section

Graphics and rendering settings. Most are written by the launcher to `Fallout4Prefs.ini`; override specific ones in Custom.ini.

### `iSize W` / `iSize H`
```ini
[Display]
iSize W=2560
iSize H=1440
```
- **File**: `Fallout4Prefs.ini` (launcher-managed)
- **What it does**: Game resolution in pixels.
- **Note**: Set via in-game video menu; do not hand-edit unless the launcher won't accept your native res.

### `fFOVWorldFOV` / `fDefaultWorldFOV`
```ini
[Display]
fFOVWorldFOV=90.0000
fDefaultWorldFOV=90.0000
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Field of view for third- and first-person cameras.
- **Safe range**: `70.0`–`110.0`. Values above 110 cause fisheye distortion. Default is `70`.
- **Performance**: No impact.

### `iMaxGrassTypesPerTexure`
```ini
[Display]
iMaxGrassTypesPerTexure=7
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum grass type variants rendered per texture set. Increasing this enables denser grass diversity.
- **Safe range**: `4`–`15`. Vanilla default is `7`.
- **⚡ Performance**: Higher values increase CPU grass generation time. Keep at `7` for mid-range hardware.

### `iLocation X` / `iLocation Y`
```ini
[Display]
iLocation X=0
iLocation Y=0
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Window position for windowed mode. `0,0` = top-left corner.

### `bFull Screen`
```ini
[Display]
bFull Screen=1
```
- **File**: `Fallout4Prefs.ini`
- **Values**: `1` = exclusive fullscreen, `0` = windowed.
- **Note**: Exclusive fullscreen is required for G-Sync/FreeSync in Fallout 4.

### `iBorderless`
```ini
[Display]
iBorderless=0
```
- **File**: `Fallout4Prefs.ini`
- **Values**: `1` = borderless windowed. Set `bFull Screen=0` and `iBorderless=1` for borderless.

### `iTexMipMapSkip`
```ini
[Display]
iTexMipMapSkip=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Skips the N highest-resolution mip levels for textures. `0` = full resolution. `1` = skip the 4K mip (effectively halves texture res). `2` = skip 4K and 2K.
- **⚡ Performance**: `1` or `2` dramatically reduces VRAM use on low-end GPUs.
- **⚠️ WARNING**: Setting this to `2+` will make textures blurry at close range.

### `bShadowMaskZPrepass`
```ini
[Display]
bShadowMaskZPrepass=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables a Z-prepass for shadow masking. Can improve shadow quality at a GPU cost.
- **⚡ Performance**: Disable (`0`) for better performance.

### `iShadowMapResolution`
```ini
[Display]
iShadowMapResolution=2048
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Shadow map resolution. Higher = sharper shadows.
- **Safe range**: `512`, `1024`, `2048`, `4096`. Vanilla ultra = `2048`.
- **⚡ Performance**: `4096` is GPU-intensive; only use on high-end cards.

### `fDirShadowDistance`
```ini
[Display]
fDirShadowDistance=3000.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum distance for directional (sun/moon) shadow casting.
- **Safe range**: `1500.0`–`8000.0`. Vanilla = `3000`.
- **⚡ Performance**: Values above `5000` have significant GPU cost.

### `iMaxAnisotropy`
```ini
[Display]
iMaxAnisotropy=16
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Anisotropic filtering level for textures. `16` is maximum quality.
- **Safe range**: `1`, `2`, `4`, `8`, `16`. Always use `16` on modern hardware — almost no performance cost.

### `bScreenSpaceReflections`
```ini
[Display]
bScreenSpaceReflections=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Enables screen-space reflections on water and wet surfaces.
- **⚡ Performance**: Medium GPU cost. Disable for 5–10 FPS on mid-range cards.

### `bVolumetricLighting`
```ini
[Display]
bVolumetricLighting=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Enables god rays / volumetric light shafts.
- **⚡ Performance**: High GPU cost. One of the first settings to disable for performance.

### `bDynamicDepthOfField`
```ini
[Display]
bDynamicDepthOfField=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Auto depth-of-field blur on distant objects when ADS (aiming down sights).
- **Note**: Many players disable this for clarity. ENB provides its own, better DoF.

### `iBlurDeferredShadowMask`
```ini
[Display]
iBlurDeferredShadowMask=3
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Blur passes on shadow edges. Higher = softer shadows.
- **Safe range**: `1`–`5`. Default is `3`.
- **⚡ Performance**: Minimal impact.

---

## [Papyrus] Section

Controls the Papyrus VM — Fallout 4's scripting engine. These settings live in `Fallout4Custom.ini`.

> **⚠️ WARNING**: Do NOT blindly copy "performance Papyrus tweaks" from old guides. Increasing stack/dump sizes beyond reason wastes RAM. Decreasing update budgets breaks complex mods.

### `fUpdateBudgetMS`
```ini
[Papyrus]
fUpdateBudgetMS=1.2
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Milliseconds per frame allocated to running Papyrus scripts. Default is `1.2`.
- **Safe range**: `1.2`–`3.0`. Values above `3.0` can cause frame rate stuttering. Do not set below `1.0` with heavy script mods.
- **⚠️ WARNING**: The myth that `fUpdateBudgetMS=5.0` "helps" is false — it increases script CPU time per frame and can cause hitches.

### `fExtraTasklets`
```ini
[Papyrus]
fExtraTasklets=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Additional processing slots for async script tasks. Default `0`.
- **Note**: Leave at `0` unless a specific mod requires otherwise.

### `iMaxAllocatedMemoryBytes`
```ini
[Papyrus]
iMaxAllocatedMemoryBytes=151388928
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum RAM allocated for the Papyrus VM heap. Default ≈ `76MB` (~`76800000`). Value shown is `144MB`.
- **Safe range**: `76800000`–`201326592` (192MB). Do not exceed system RAM limits.
- **⚡ Performance**: Heavy script mods (SS2, CWSS, etc.) benefit from `151388928` or higher.

### `iMinMemoryPageSize`
```ini
[Papyrus]
iMinMemoryPageSize=128
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Minimum size in bytes of a Papyrus memory page.
- **Safe value**: `128` (default). Do not change.

### `iMaxMemoryPageSize`
```ini
[Papyrus]
iMaxMemoryPageSize=512
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum Papyrus memory page size in bytes.
- **Safe value**: `512` (default).

### `bEnableLogging`
```ini
[Papyrus]
bEnableLogging=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables writing Papyrus.0.log. Disable in normal play; enable only for debugging.
- **⚡ Performance**: `1` causes disk I/O on every script log write — disable when not debugging.

### `bEnableTrace`
```ini
[Papyrus]
bEnableTrace=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables verbose trace-level Papyrus logging.
- **⚡ Performance**: Severe performance impact when enabled. Debug use only.

### `bLoadDebugInformation`
```ini
[Papyrus]
bLoadDebugInformation=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Loads debug info for Papyrus scripts (needed by some debuggers).
- **Note**: Leave `0` for normal play.

---

## [Grass] Section

Controls grass density, distance, and fade. All go in `Fallout4Custom.ini`.

### `fGrassStartFadeDistance`
```ini
[Grass]
fGrassStartFadeDistance=7000.0
```
- **What it does**: Distance (in game units, roughly inches) at which grass begins fading out. Default ≈ `3500`.
- **Safe range**: `3500.0`–`14000.0`.
- **⚡ Performance**: High impact. Doubling this value can drop FPS by 10–20% in grassy areas.

### `fGrassMaxStartFadeDistance`
```ini
[Grass]
fGrassMaxStartFadeDistance=7000.0
```
- **What it does**: Hard cap on grass start fade. Should match or exceed `fGrassStartFadeDistance`.

### `fGrassMinStartFadeDistance`
```ini
[Grass]
fGrassMinStartFadeDistance=400.0
```
- **What it does**: Minimum fade distance — grass never disappears closer than this.
- **Safe value**: `400.0` (default).

### `iMinGrassSize`
```ini
[Grass]
iMinGrassSize=20
```
- **What it does**: Controls grass density (counterintuitively). Lower = denser. Vanilla = `20`.
- **Safe range**: `10`–`40`. `10` is very dense; `40` is sparse.
- **⚡ Performance**: `10` can halve FPS in dense areas. Use `15`–`20` for a balance.

### `bAllowCreateGrass`
```ini
[Grass]
bAllowCreateGrass=1
```
- **What it does**: Master switch for grass rendering. `0` disables all grass globally.
- **⚡ Performance**: Disabling grass gives a significant FPS boost in outdoor areas.

### `bAllowLoadGrass`
```ini
[Grass]
bAllowLoadGrass=1
```
- **What it does**: Allows grass data to be loaded from cell records. Must be `1` for grass mods to work.

---

## [General] Section

Miscellaneous engine settings. Split between `Fallout4.ini` and `Fallout4Custom.ini`.

### `uGridsToLoad`
```ini
[General]
uGridsToLoad=5
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Number of cell grids loaded around the player. Default `5` (a 5×5 grid = 25 cells).
- **Safe range**: `5`–`7`. Values above `7` risk save corruption and CTDs.
- **⚠️ WARNING**: This is one of the most dangerous settings to change. `uGridsToLoad=7` requires at minimum 16GB RAM and a heavily stable load order. Never go above `7`.

### `uExteriorCellBuffer`
```ini
[General]
uExteriorCellBuffer=64
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Number of exterior cells held in the buffer cache. Higher = faster area traversal at cost of RAM.
- **Safe range**: `36`–`256`. Scale with available RAM: 8GB → `64`, 16GB → `128`, 32GB → `256`.

### `bPreemptivelyUnloadCells`
```ini
[General]
bPreemptivelyUnloadCells=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Unloads distant cells before they'd normally be unloaded. Reduces RAM pressure at cost of more loading.
- **⚡ Performance**: Enable (`1`) on 8GB RAM systems. Disable on 16GB+.

### `iNumHWThreads`
```ini
[General]
iNumHWThreads=4
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Tells the engine how many hardware threads to use.
- **Note**: The engine auto-detects this on modern hardware. Only override if auto-detection is wrong.

### `fDefaultFOV`
```ini
[General]
fDefaultFOV=80.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Default FOV for menus and cutscenes (separate from `fDefaultWorldFOV`).

### `bAlwaysActive`
```ini
[General]
bAlwaysActive=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Prevents the game from pausing when the window loses focus.
- **Note**: Useful for multi-monitor setups and streaming. Can cause audio to play in background.

### `bModManagerMenuEnabled`
```ini
[General]
bModManagerMenuEnabled=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables/disables the in-game mod menu (Bethesda.net Creations).
- **⚠️ WARNING**: Leave `0` if using MO2/Vortex. The in-game manager conflicts with external managers.

---

## [LOD] Section

Controls level-of-detail distance and quality.

### `fLODFadeOutMultObjects`
```ini
[LOD]
fLODFadeOutMultObjects=6.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Multiplier on the base LOD fade distance for static objects. Default `1.0`. Higher = objects visible at greater distance before switching to LOD.
- **Safe range**: `1.0`–`10.0`.
- **⚡ Performance**: Values above `6.0` increase draw calls significantly.

### `fLODFadeOutMultItems`
```ini
[LOD]
fLODFadeOutMultItems=3.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: LOD fade multiplier for items/clutter. Default `1.0`.
- **Safe range**: `1.0`–`6.0`.

### `fLODFadeOutMultActors`
```ini
[LOD]
fLODFadeOutMultActors=6.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: LOD fade multiplier for NPCs/actors. Higher = NPCs rendered at greater distance.
- **⚡ Performance**: High impact in dense NPC areas (Diamond City, Goodneighbor).

### `fSkyObjectsFadeStart`
```ini
[LOD]
fSkyObjectsFadeStart=0.8
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Distance fraction at which sky objects begin fading.

### `fLODFadeOutMultTrees`
```ini
[LOD]
fLODFadeOutMultTrees=6.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: LOD multiplier for trees. Affects how far trees render at full quality vs billboard LOD.
- **Note**: Works in concert with DynDOLOD tree LOD generation.

---

## [Water] Section

### `bReflectLODObjects`
```ini
[Water]
bReflectLODObjects=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Reflects LOD-resolution objects in water surfaces.
- **⚡ Performance**: Minor GPU cost. Generally keep enabled.

### `bReflectLODLand`
```ini
[Water]
bReflectLODLand=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Reflects LOD terrain in water.

### `bReflectSky`
```ini
[Water]
bReflectSky=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables sky reflection in water surfaces. Disabling causes flat, dark water.

### `iWaterReflectHeight` / `iWaterReflectWidth`
```ini
[Water]
iWaterReflectHeight=512
iWaterReflectWidth=512
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Resolution of the water reflection render target in pixels.
- **Safe range**: `256`–`2048`. Higher = sharper reflections.
- **⚡ Performance**: `1024×1024` is a good quality/performance balance. `2048` has high VRAM cost.

### `bForceHighDetailReflections`
```ini
[Water]
bForceHighDetailReflections=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Forces full-quality (non-LOD) objects to appear in water reflections.
- **⚡ Performance**: High cost; can cause notable FPS drops near large water bodies.

---

## [Trees] Section

### `bRenderSkinnedTrees`
```ini
[Trees]
bRenderSkinnedTrees=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables swaying/animated trees. Disable for a minor performance boost.

### `uiMaxSkinnedTreesToRender`
```ini
[Trees]
uiMaxSkinnedTreesToRender=20
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum number of animated trees rendered simultaneously.
- **Safe range**: `10`–`50`. Higher values with dense tree mods can cause CPU overhead.

---

## [Combat] Section

### `f1PArmorRating`
```ini
[Combat]
f1PArmorRating=65535.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Maximum effective armor rating in first-person. This is a rarely-changed gameplay tuning value.

### `fGunShellLifetime`
```ini
[Combat]
fGunShellLifetime=5.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: How long ejected shell casings persist (seconds) before disappearing.
- **Safe range**: `1.0`–`30.0`. Higher values in firefights = more shells on ground = minor performance hit.

### `fGunShellCameraDistance`
```ini
[Combat]
fGunShellCameraDistance=12800.0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Distance from camera at which shells are rendered/simulated.

---

## [Interface] Section

### `bDialogueSubtitles`
```ini
[Interface]
bDialogueSubtitles=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Enables dialogue subtitles.

### `bGeneralSubtitles`
```ini
[Interface]
bGeneralSubtitles=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Enables environmental/ambient dialogue subtitles.

### `fMouseHeadingXScale` / `fMouseHeadingYScale`
```ini
[Interface]
fMouseHeadingXScale=0.021
fMouseHeadingYScale=0.021
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Mouse sensitivity multipliers for horizontal/vertical camera movement. Default `0.021`.
- **Note**: The in-game sensitivity slider maps to these. Override here for sub-pixel precision.

### `bShowTutorials`
```ini
[Interface]
bShowTutorials=0
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Disables first-time tutorial pop-ups. Set `0` on second playthroughs.

---

## [Audio] Section

### `fAudioMasterVolume`
```ini
[Audio]
fAudioMasterVolume=1.0
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Master audio volume. Range `0.0`–`1.0`.

### `uiAudioFullDuplexAPI`
```ini
[Audio]
uiAudioFullDuplexAPI=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables full-duplex audio API for lower latency.

### `bEnableAudio`
```ini
[Audio]
bEnableAudio=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Master audio switch. Setting `0` silences the entire game.

### `fMusicDuckingSeconds`
```ini
[Audio]
fMusicDuckingSeconds=1.5
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Seconds music takes to duck (lower volume) when dialogue starts.

---

## [GamePlay] Section

### `bShowFloatingQuestMarkers`
```ini
[GamePlay]
bShowFloatingQuestMarkers=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Shows objective markers above quest targets in world space.

### `bShowQuestMarkers`
```ini
[GamePlay]
bShowQuestMarkers=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Shows quest markers on the compass.

### `iDifficulty`
```ini
[GamePlay]
iDifficulty=2
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Difficulty level. `0`=Peaceful, `1`=Easy, `2`=Normal, `3`=Hard, `4`=Very Hard, `5`=Survival.

---

## ENB-Specific INI Tips

ENB (by Boris Vorontsov) reads the game's INIs and has its own `enbseries.ini`/`enblocal.ini`, but several game INI settings directly interact with ENB.

### Settings ENB OVERRIDES (game value is ignored)
- Depth of field (`bDynamicDepthOfField`) — ENB provides its own DoF
- Ambient Occlusion — ENB's SSAO replaces the game's HBAO
- Bloom — ENB replaces the game bloom pipeline

### Settings ENB REQUIRES to be set correctly

```ini
[Display]
bScreenSpaceReflections=0  ; ENB handles reflections; game SSR causes conflict
bVolumetricLighting=1      ; Many ENBs require this ON to process god rays themselves
bSAOEnable=0               ; Disable game HBAO — ENB replaces it
bUseTAA=0                  ; Disable TAA if ENB uses its own temporal AA
```

### `bUseTAA`
```ini
[Display]
bUseTAA=1
```
- **File**: `Fallout4Prefs.ini`
- **What it does**: Enables Temporal Anti-Aliasing. TAA reduces shimmer but can cause ghosting in motion.
- **ENB note**: Some ENBs include temporal resolution solutions that conflict with game TAA. Check the ENB's readme.

### `bSAOEnable`
```ini
[Display]
bSAOEnable=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables the game's Screen-Space Ambient Occlusion (HBAO+).
- **ENB note**: Disable when using an ENB with its own AO to avoid double-AO darkening.

### `bTransparencyMultisampling`
```ini
[Display]
bTransparencyMultisampling=1
```
- **File**: `Fallout4Custom.ini`
- **What it does**: Enables alpha-to-coverage for transparent geometry (foliage edges, fences). Reduces transparency aliasing.
- **⚡ Performance**: Minor GPU cost. Always enable with ENB.

---

## Recommended Fallout4Custom.ini Template

A safe, commonly-used Custom.ini for a modded install on mid-to-high-end hardware:

```ini
[Archive]
bInvalidateOlderFiles=1
sResourceDataDirsFinal=STRINGS\

[Display]
fFOVWorldFOV=90.0000
fDefaultWorldFOV=90.0000
iTexMipMapSkip=0
bSAOEnable=0
bTransparencyMultisampling=1
bScreenSpaceReflections=0
fDirShadowDistance=5000.0
iBlurDeferredShadowMask=3

[Grass]
fGrassStartFadeDistance=7000.0
fGrassMaxStartFadeDistance=7000.0
iMinGrassSize=20

[General]
uGridsToLoad=5
uExteriorCellBuffer=128
bPreemptivelyUnloadCells=0
bAlwaysActive=1
bModManagerMenuEnabled=0

[Interface]
bShowTutorials=0

[LOD]
fLODFadeOutMultObjects=6.0
fLODFadeOutMultItems=3.0
fLODFadeOutMultActors=6.0
fLODFadeOutMultTrees=6.0

[Papyrus]
fUpdateBudgetMS=1.2
iMaxAllocatedMemoryBytes=151388928
bEnableLogging=0
bEnableTrace=0

[Water]
bReflectLODObjects=1
bReflectLODLand=1
bReflectSky=1
iWaterReflectHeight=512
iWaterReflectWidth=512
```

---

## Common Mistakes Reference

| Mistake | Consequence | Fix |
|---|---|---|
| Editing `Fallout4Prefs.ini` directly | Launcher overwrites changes | Use `Fallout4Custom.ini` instead |
| Setting `uGridsToLoad=9` | CTDs, save corruption | Never go above `7`; use `5` for safety |
| Setting `fUpdateBudgetMS=5.0` | Frame hitches from Papyrus overuse | Keep at `1.2`–`2.0` |
| Having `sResourceArchive2List` in Custom.ini | Loses all vanilla textures | Only override if adding DLC archives; include full list |
| Enabling `bEnableLogging=1` permanently | Disk I/O performance hit | Only enable when actively debugging scripts |
| Setting `iMaxAnisotropy=1` | Blurry textures at angles | Use `16`; virtually free on modern hardware |
| Disabling `bInvalidateOlderFiles` | Texture/mesh mods don't load | Always `1` on modded installs |

---

## Quick Settings by Use Case

### Maximum Performance (Low-end Hardware)
```ini
[Display]
iTexMipMapSkip=2
bVolumetricLighting=0
bScreenSpaceReflections=0
bSAOEnable=0
fDirShadowDistance=1500.0
iShadowMapResolution=1024

[Grass]
bAllowCreateGrass=0

[LOD]
fLODFadeOutMultObjects=1.0
fLODFadeOutMultActors=1.0
```

### Maximum Quality (High-end Hardware, no ENB)
```ini
[Display]
iTexMipMapSkip=0
bVolumetricLighting=1
bScreenSpaceReflections=1
bSAOEnable=1
fDirShadowDistance=7000.0
iShadowMapResolution=4096
iMaxAnisotropy=16

[Grass]
fGrassStartFadeDistance=12000.0
iMinGrassSize=15

[Water]
iWaterReflectHeight=1024
iWaterReflectWidth=1024
bForceHighDetailReflections=1
```

### ENB Setup
```ini
[Display]
bScreenSpaceReflections=0
bSAOEnable=0
bDynamicDepthOfField=0
bTransparencyMultisampling=1
bVolumetricLighting=1
bUseTAA=0
```
