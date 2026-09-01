# BethINI Pie — INI Optimization Guide for Fallout 4 (2025/2026)

BethINI Pie is the 2025 successor to the original BethINI tool. It provides a clean, organized UI for configuring Fallout 4's INI files, applying hardware-optimized presets, and avoiding the common INI pitfalls that cause crashes or poor performance in modded setups.

**GitHub:** https://github.com/Exit-9B/BethINI-Pie  
**Nexus:** Search "BethINI Pie" — available in the Fallout 4 utilities section.  
**Replaces:** The original BethINI by DoubleYouC (which is no longer updated for NG/1.11.x).

> **Why this matters:** Incorrect INI settings are responsible for a large percentage of "mod setup" crashes, texture loading failures, grass popping, LOD issues, and microstutter. BethINI Pie applies tested, documented defaults that are safer than hand-editing.

---

## Overview: The Three INI Files

Fallout 4 reads three INI files, applied in layers:

| File | Location | Purpose | Modified by |
|---|---|---|---|
| `Fallout4.ini` | `Documents\My Games\Fallout4\` | Base engine settings | Bethesda / manual |
| `Fallout4Prefs.ini` | `Documents\My Games\Fallout4\` | Display + audio preferences | Game launcher (overwrites!) |
| `Fallout4Custom.ini` | `Documents\My Games\Fallout4\` | Your personal overrides | You / BethINI Pie |

**Golden rule:** Always put custom changes in `Fallout4Custom.ini`. The game launcher rewrites `Fallout4Prefs.ini` every time you open it.

With MO2: BethINI Pie uses the profile-specific INIs in `\MO2\profiles\<ProfileName>\` if you enable profile-specific game INI files in MO2.

---

## Installation & Setup

### Prerequisites

- .NET 6+ runtime (required by BethINI Pie — it's a WPF application)
- Fallout 4 installed
- MO2 or Vortex (optional but recommended — BethINI Pie auto-detects both)

### Steps

1. Download BethINI Pie from GitHub/Nexus.
2. Extract to a standalone folder (e.g. `C:\Tools\BethINI_Pie\`).
3. **Do not run from inside a UAC-protected folder** (`C:\Program Files\`).
4. Run `BethINI Pie.exe`.
5. First launch: BethINI Pie asks for your **game** and **mod manager**:
   - Game: **Fallout 4**
   - Mod manager: **MO2** (or Vortex, or None)
   - MO2 path: point to your MO2 installation
   - MO2 profile: select your active profile
6. Click **OK** — BethINI Pie loads your current INI values.

> **Important:** Close MO2 and the game launcher before editing INIs with BethINI Pie. Multiple processes writing to the same files causes corruption.

---

## Interface & Tabs

### Basic Tab

The starting point. Shows the most impactful settings:

- **Preset buttons**: Low / Medium / High / Ultra / BethINI Default / Recommended
- **Resolution**: Matches your monitor's native resolution. BethINI Pie reads the system display automatically.
- **Display mode**: Windowed / Borderless / Fullscreen
- **FPS cap**: Recommend setting to match your monitor's refresh rate (60, 144, etc.) — or 0 to uncap if using High FPS Physics Fix.
- **Shadow Distance** slider
- **Grass density** and **distance** sliders

### General Tab

Engine-level settings:

- **Intro Video**: Disable (saves ~5 seconds every launch)
- **Bethesda.net Login**: Disable (removes login prompt)
- **Console**: Enable (needed for debugging/testing)
- **Papyrus Logging**: Enable during development only — significant performance cost.

### Gameplay Tab

- **Difficulty modifiers**
- **Autosave frequency**
- **Quick save enabling/disabling**

### Interface Tab

- **HUD opacity**
- **Subtitle settings**
- **Map marker visibility**

### Detail Tab

**Most important for modders:**

| Setting | Recommended | Notes |
|---|---|---|
| `bInvalidateOlderFiles` | 1 | Required for loose-file texture mods |
| `sResourceDataDirsFinal` | `STRINGS\` | Required; do not add extra paths (see INI guide) |
| Shadow Map Resolution | 2048 (primary), 1024 (secondary) | Higher = better shadows, more GPU cost |
| `uiMaxSkinnedTrisPerFrame` | 32000 | Prevents CTD with high-poly character mods |
| `bUseCombinedObjects` | 1 | Keep ON — disabling breaks precombines |
| `bUsePreCulledObjects` | 1 | Keep ON — disabling breaks previs |

### Performance Tab

- **Cell buffer size**: Controls how many cells the engine keeps loaded in RAM.
  - Default: `uGridsToLoad=5`. Do NOT increase above 7 — causes instability.
  - Recommendation: Leave at 5 for most setups; increase to 7 only on 32GB+ RAM setups.
- **Thread count**: BethINI Pie auto-detects your CPU thread count and sets `iNumHWThreads` correctly.
- **Heap size**: Leave at default — Addictol manages memory allocation.

---

## Recommended Preset Workflow

### Step 1: Apply the "Recommended" Preset

BethINI Pie's **Recommended** preset applies a community-tested baseline that is safer than Bethesda's "High" preset. It:
- Sets correct Archive INI for mod loading.
- Sets shadow distance to a stable value.
- Disables god rays (performance cost outweighs visual quality for most users).
- Enables the console.
- Sets correct thread count for your CPU.

### Step 2: Adjust for Your Hardware

After applying Recommended, fine-tune on the **Basic** tab:

| Hardware tier | Adjustments |
|---|---|
| Budget (GTX 1060 / RX 580) | Shadow distance: 3000, grass: 80, cell buffer: 5 |
| Mid (RTX 3060 / RX 6700 XT) | Shadow distance: 5000, grass: 120, cell buffer: 5 |
| High (RTX 4070+ / RX 7800 XT+) | Shadow distance: 7000, grass: 150, cell buffer: 7 |

### Step 3: Save and Apply

Click **Save and Exit** — BethINI Pie writes all three INI files with only the changed values. It never overwrites values you didn't touch.

---

## Important Settings for Modded Installs

### Archive Settings (Critical)

BethINI Pie ensures these are set, but verify:

```ini
[Archive]
bInvalidateOlderFiles=1
sResourceDataDirsFinal=STRINGS\
```

Both must be in `Fallout4Custom.ini`. Without `bInvalidateOlderFiles=1`, loose texture/mesh replacer mods don't load. Without `sResourceDataDirsFinal`, some mod assets are invisible.

### High FPS Physics Fix Compatibility

If using High FPS Physics Fix (Nexus #44798), set in your Custom.ini:

```ini
[Display]
iFPSClamp=0
```

High FPS Physics Fix manages its own frame rate decoupling — the engine's built-in clamp conflicts with it.

### ENB Compatibility

If using ENBSeries, set in `Fallout4Prefs.ini` (or BethINI Pie's Detail tab):

```ini
[Display]
bFloatPointRenderTarget=1
```

This unlocks the HDR render target that ENB requires. Without it, ENB effects display incorrectly. BethINI Pie sets this automatically when it detects ENB binaries in your game folder.

### Community Shaders Compatibility

No special INI changes needed for Community Shaders specifically — it reads its own config file. However, ensure `bInvalidateOlderFiles=1` is set (it usually is after BethINI Pie runs).

### Papyrus Debug Logging

For mod development only — turn off for release play:

```ini
[Papyrus]
bEnableLogging=1          ; writes to Documents\My Games\Fallout4\Logs\
bEnableTrace=1            ; verbose trace (VERY slow; use only for specific issues)
bLoadDebugInformation=1
fUpdateBudgetMS=1.6       ; script VM time budget per frame
```

BethINI Pie has a **Development** section that toggles Papyrus logging with one click.

---

## God Rays — Disable Unless Using ENB

Fallout 4's built-in god rays (`bVolumetricLighting`) are expensive (~5–10 FPS) and low quality. BethINI Pie's Recommended preset disables them. If you use an ENB preset, the ENB replaces god rays with its own implementation — you still want the vanilla version disabled.

```ini
[Display]
bVolumetricLighting=0
```

---

## Grass Settings for Grass Overhaul Mods

If using **Verdant**, **Ultra Exterior Lighting**, or other heavy grass overhauls:

| Setting | Value | Effect |
|---|---|---|
| `iMinGrassSize` | 60–80 | Grass density (lower = more dense but more expensive) |
| `fGrassStartFadeDistance` | 35000 | Distance at which grass fades out |
| `fGrassMaxStartFadeDistance` | 35000 | Max grass distance |
| `bAllowCreateGrass` | 1 | Must be on for grass to appear |

BethINI Pie's Performance tab exposes these as sliders.

---

## Fixing Common INI-Caused Issues

### Invisible textures (mod textures not loading)
→ Check `bInvalidateOlderFiles=1` in Custom.ini. Also check that `sResourceDataDirsFinal=STRINGS\` is present.

### ENB not rendering correctly (flat/wrong colors)  
→ Check `bFloatPointRenderTarget=1`. If missing, add to `Fallout4Prefs.ini` manually or via BethINI Pie Detail tab.

### Constant stutter even with Addictol installed
→ Set `iPresentInterval=0` (disables vsync — use driver-level vsync or G-Sync instead). Also try `iFPSClamp=0` if using High FPS Physics Fix.

### Game locked at 60 FPS despite having a 144Hz monitor
→ Set `iFPSClamp=0` in Custom.ini and install High FPS Physics Fix. The engine's internal FPS lock must be removed, and High FPS Physics Fix prevents physics breakage at high framerates.

### Crashes near Diamond City or dense settlement areas
→ Do not change `uGridsToLoad` beyond 5. Also check `bUseCombinedObjects=1` and `bUsePreCulledObjects=1` — if either is 0, precombines are disabled and those areas will CTD under load.

---

## BethINI Pie vs. Manual INI Editing

BethINI Pie is safer for most users because it:
- Knows which values are safe to change and which to leave alone.
- Never writes conflicting duplicate entries.
- Provides hardware-aware presets.
- Can restore defaults if something breaks.

Manual editing is still appropriate for:
- Setting very specific values BethINI Pie doesn't expose.
- Script-driven automation (CI/CD for mod testing).
- Following mod-specific installation instructions that give exact INI values.

When manually editing, **always use Notepad++ or a similar plain-text editor**. Windows Notepad may corrupt line endings on some systems.

---

## Quick Reference: Most Important INI Settings

```ini
; Fallout4Custom.ini — minimum correct modded setup
[Archive]
bInvalidateOlderFiles=1
sResourceDataDirsFinal=STRINGS\

[Display]
bFloatPointRenderTarget=1   ; Required for ENB
bVolumetricLighting=0       ; Disable vanilla god rays (replaced by ENB)
iFPSClamp=0                 ; Allow High FPS Physics Fix to control frame rate

[Papyrus]
; Only during development:
; bEnableLogging=1
; bEnableTrace=1

[General]
sIntroSequence=             ; Disables intro videos
```

*Last updated: May 2026. Compatible with BethINI Pie (Exit-9B), FO4 OG through 1.11.x.*
