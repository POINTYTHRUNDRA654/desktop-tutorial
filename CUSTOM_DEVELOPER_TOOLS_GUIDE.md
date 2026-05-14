# Custom Developer Tools: FormID Sanitizer, PBR Checker, and Script Watchdog

## Overview

Three lightweight automation tools tailored to 2026 modding standards that save creators significant manual diagnostic time:

1. **ESL FormID Sanitizer** — xEdit/Pascal script that scans Light Plugins for out-of-bounds FormID records before they corrupt saves.
2. **PBR Texture Channel Checker** — Python command-line tool that validates `_s.dds` channel packing before an asset is archived.
3. **Papyrus Runtime Stack-Overflow Monitor** — In-game watchdog script that alerts modders when a function runs too slowly.

---

## Tool 1 — ESL FormID Sanitizer (xEdit Pascal Script)

### Problem

Light Plugin (`.esl`) records must have local FormIDs in the range `0x000`–`0xFFF` (0–4095 decimal). Any record outside this boundary causes **instant save-game corruption** when loaded. Modders frequently create records that exceed this limit without realising it, especially when compacting or merging.

### Solution

Save the script below as `SanitizeESL.pas` inside your `FO4Edit\Edit Scripts\` folder. Run it from within FO4Edit via the *Apply Script* option to scan the active mod file and report every out-of-bounds record.

```pascal
{
    Fallout 4 ESL FormID Sanitizer & Compliance Tool (2026 Engine Specs)
    Save as: FO4Edit\Edit Scripts\SanitizeESL.pas
}
unit SanitizeESL;

function Process(e: IInterface): Integer;
var
  formID: Cardinal;
  localID: Cardinal;
begin
  if Signature(e) = 'TES4' then Exit; // Skip the main file header record

  formID := GetLoadOrderFormID(e);
  localID := formID and $00FFFFFF; // Isolate the local record index

  // ESL hard boundary: local index must not exceed 0xFFF (4095 decimal)
  if localID > $FFF then begin
    AddMessage('[WARNING] Out of Bounds ESL Record Detected: '
      + Name(e) + ' [Local ID: ' + IntToHex(localID, 6) + ']');

    {
      Resolution: Direct the student to use FO4Edit's built-in
      "Compact FormIDs for ESL" function to shift these records
      into the valid range automatically.
    }
  end;
end;

end.
```

### Teaching Notes

- `GetLoadOrderFormID(e) and $00FFFFFF` masks off the plugin index byte, leaving only the 24-bit local record ID.
- The ESL cap is **0xFFF** — that is 12 bits, giving 4096 possible records (0x000 inclusive).
- If any warnings fire, the correct fix is **not** to hand-renumber records. Use FO4Edit's built-in *File → Compact FormIDs for ESL* which reassigns all local IDs sequentially from 0x800 downward, preserving cross-references automatically.
- Run this script **before** flagging a plugin as an ESL, not after. Compacting after the mod is already distributed requires a compatibility patch for users who already have the old FormIDs in their saves.

### Tutor Rule

Teach students to run `SanitizeESL.pas` as the last step before every release when targeting ESL format. Any `[WARNING]` line in the xEdit message log is a blocker — do not ship until all records are within bounds.

---

## Tool 2 — PBR Texture Channel Checker (Python)

### Problem

Fallout 4's specular shader reads three distinct data maps packed into the RGB channels of a single `_s.dds` file. Students routinely export with one or more channels left as flat black, producing assets that render as unlit plastic or have no ambient occlusion shading.

### Channel Layout for `_s.dds`

| Channel | Data | If Empty |
|---|---|---|
| Red | Metalness | Metal objects render as non-metallic plastic |
| Green | Specular Intensity | Asset reflects zero light — appears completely matte |
| Blue | Ambient Occlusion | Shadows are flat; surface crevices lose all depth |

### Solution

This standalone Python script can be run from the command line against any exported `_s.dds` before the file is packed into a BA2 archive.

```python
import os
from PIL import Image

def analyze_pbr_channels(specular_dds_path):
    """
    Inspects a _s.dds file to verify Red (Metalness), Green (Specular Intensity),
    and Blue (Ambient Occlusion) channels are correctly packed for the FO4 lighting engine.
    """
    if not os.path.exists(specular_dds_path):
        print(f"[ERROR] Target file not found: {specular_dds_path}")
        return False

    with Image.open(specular_dds_path) as img:
        channels = img.split()

        if len(channels) < 3:
            print("[CRITICAL] Texture missing colour channels. File must be RGB or RGBA.")
            return False

        red_chan, green_chan, blue_chan = channels[0], channels[1], channels[2]

        if red_chan.getextrema() == (0, 0):
            print("[WARNING] Red Channel (Metalness) is entirely empty. "
                  "Metal objects will render as plastic.")
        if green_chan.getextrema() == (0, 0):
            print("[CRITICAL] Green Channel (Specular Intensity) is blank. "
                  "The asset will reflect zero light.")
        if blue_chan.getextrema() == (0, 0):
            print("[WARNING] Blue Channel (Ambient Occlusion) is blank. "
                  "Surface shadows will look completely flat.")

    print(f"[SUCCESS] Channel validation completed for: {os.path.basename(specular_dds_path)}")
    return True


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python check_pbr.py <path_to_s.dds>")
    else:
        analyze_pbr_channels(sys.argv[1])
```

### Dependencies

```bash
pip install Pillow
```

> **Note**: Pillow can open `.dds` files directly on most platforms. If it raises an `UnidentifiedImageError`, install the `pillow-dds` extension or pre-convert to `.png` for inspection using a tool like `texconv`.

### Teaching Notes

- `getextrema()` returns `(min, max)` pixel values for the channel. A result of `(0, 0)` means every pixel is black — the channel was never painted.
- A `[CRITICAL]` on the Green channel (Specular Intensity) is the most visually damaging failure. The asset will look like it has no surface reaction to lighting at all.
- Run this check **before** DDS compression. Compressing a flat-black channel wastes texture memory and the error is harder to diagnose after the fact.
- Extend the script to batch-check an entire texture directory by wrapping `analyze_pbr_channels` in an `os.walk` loop over the mod's `Textures\` folder.

### Tutor Rule

Make running the PBR channel checker a mandatory step in the asset pipeline checklist, positioned between *export from Substance/GIMP* and *pack into BA2*. Any `[CRITICAL]` output is a hard block on packaging.

---

## Tool 3 — Papyrus Runtime Stack-Overflow Monitor (`ScriptPerformanceWatchdog.psc`)

### Problem

When complex mods cause game freezing or Papyrus script lag, modders struggle to identify which function is the bottleneck. The Papyrus log records failures after the fact but gives no real-time timing data during a live session.

### Solution

This in-game watchdog script is compiled into a **development build** of the mod only. It wraps function calls with timing brackets and fires an on-screen alert if execution exceeds the configurable threshold.

```papyrus
Scriptname ScriptPerformanceWatchdog extends Quest

; The script name (or function label) to monitor — set in the CK property panel
String Property TargetScriptToMonitor Auto Const

; Maximum acceptable execution time in milliseconds before an alert fires
Int Property MaxAllowedExecutionTimeMs = 50 Auto Const

Function StartTrackingAction(String asFunctionName)
    Float StartTime = Utility.GetCurrentRealTime()

    Debug.Trace("[WATCHDOG] Monitoring execution path for: "
        + TargetScriptToMonitor + " -> " + asFunctionName)

    ; ------------------------------------------------------------------
    ; The monitored function call goes here in the student's development
    ; build. In production, this wrapper is removed entirely.
    ; ------------------------------------------------------------------

    Float EndTime = Utility.GetCurrentRealTime()
    Float Delta = (EndTime - StartTime) * 1000.0 ; Convert seconds to milliseconds

    if (Delta > MaxAllowedExecutionTimeMs)
        Debug.MessageBox("[PERFORMANCE CRITICAL] " + TargetScriptToMonitor
            + " took " + Delta + "ms to finish! Optimize your loops.")
    endif
EndFunction
```

### Teaching Notes

- `Utility.GetCurrentRealTime()` returns wall-clock seconds as a `Float`. Multiplying the delta by `1000.0` gives milliseconds, which is the unit the engine's script budget operates in.
- The **50 ms default threshold** (`MaxAllowedExecutionTimeMs`) aligns with the Papyrus VM's per-frame budget. Any single function exceeding this will cause a perceptible stutter.
- `Debug.MessageBox` is a **blocking** call — it pauses the game until the player dismisses it. Use it only in development builds. For automated test pipelines, replace it with `Debug.Trace` or `Debug.WriteToUserLog`.
- This script is a **development-only instrument**. Strip it (or compile it out with a `bool bDevMode` property) before shipping. A watchdog quest left running in a release build adds unnecessary overhead to the save file — a violation of the rubric's save-footprint safety criterion.
- Pair with `Debug.OpenUserLog("WatchdogLog")` and `Debug.WriteToUserLog` to capture a persistent timing log across a full play session rather than relying on one-off message boxes.

### Tutor Rule

Teach students to use the watchdog during the optimisation phase of development, not as an afterthought. The workflow is: instrument with the watchdog → identify slow functions → refactor to event-driven patterns per Module 2A → re-run until all deltas are under 50 ms → remove the watchdog before release.

---

## Integration Checklist — Using All Three Tools Together

The three tools map to specific pipeline stages:

| Stage | Tool | Pass Condition |
|---|---|---|
| **Before ESL flag is set** | `SanitizeESL.pas` in FO4Edit | Zero `[WARNING]` lines in message log |
| **Before BA2 packing** | `check_pbr.py` on every `_s.dds` | Zero `[CRITICAL]` lines in console output |
| **During in-game testing** | `ScriptPerformanceWatchdog.psc` | No `[PERFORMANCE CRITICAL]` alerts; all deltas < 50 ms |
| **Before final release** | All three tools clean | Watchdog removed from release build |

A mod that clears all three tools is structurally sound for release on both NG and AE installations.
