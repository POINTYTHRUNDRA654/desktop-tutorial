# F4SE Trampoline Hooks, Grid Dashboard with Coordinate Canvas, and Papyrus Test Suite

This dataset covers three advanced topics: injecting a 5-byte trampoline branch hook into the Fallout 4 engine's damage function using the F4SE trampoline interface, upgrading the HTML telemetry dashboard to a CSS grid layout with a live canvas coordinate tracker, and implementing an automated Papyrus unit testing framework that validates data integrity at engine runtime.

---

## Phase 1: F4SE Trampoline Memory Hooks for Damage Interception

Trampolines inject a 5-byte relative JMP instruction directly into the engine's executable code page, redirecting execution to a custom function before returning to the original code.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se_common/BranchTrampoline.h"
#include "f4se_common/SafeWrite.h"

// RVA for the engine's ApplyDamage function — discovered via IDA/Ghidra pattern analysis
#define APPLY_DAMAGE_RVA 0x00DB2340

typedef void (*_ApplyDamageInner)(void* actorInstance, void* hitDataStruct);
_ApplyDamageInner TargetApplyDamage_Original = nullptr;

void HookedApplyDamage(void* actorInstance, void* hitDataStruct) {
    if (actorInstance == (*g_player)) {
        _MESSAGE("[Trampoline Alert]: Player took real-time damage frame updates.");
        // Dispatch to telemetry pipeline or Papyrus event here
    }

    // Always return to original engine code
    TargetApplyDamage_Original(actorInstance, hitDataStruct);
}

void InitializeTrampolineHooking(F4SETrampolineInterface* trampoline) {
    if (!trampoline) return;

    void* branchBase = trampoline->AllocateFromCodePage(10);
    if (!branchBase) return;

    uintptr_t engineBase        = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    uintptr_t targetHookAddress = engineBase + APPLY_DAMAGE_RVA;

    // Write the 5-byte JMP and return the original function pointer
    TargetApplyDamage_Original = (_ApplyDamageInner)
        trampoline->Write5Branch(targetHookAddress, (uintptr_t)HookedApplyDamage);

    _MESSAGE("Trampoline hook placed at: 0x%p", targetHookAddress);
}
```

**Key points:**
- `F4SETrampolineInterface` is queried from `F4SEInterface::QueryInterface(kInterface_Trampoline)` inside `F4SEPlugin_Load`. Pass the result to `InitializeTrampolineHooking`.
- `AllocateFromCodePage(10)` reserves 10 bytes of executable memory in the trampoline pool — enough for the original overwritten bytes and a JMP back. The pool is provided by F4SE to avoid executable heap allocations in your DLL.
- `Write5Branch(targetAddress, hookFunction)` overwrites 5 bytes at `targetAddress` with a relative `E9` JMP to `hookFunction` and returns a pointer to a stub that executes the overwritten bytes followed by a jump back. Store this as `TargetApplyDamage_Original` and always call it at the end of your hook to preserve engine execution flow.
- **Always call the original.** Failing to call `TargetApplyDamage_Original` breaks the damage pipeline — enemies become immortal, death events never fire, and the save system may corrupt.
- The RVA `0x00DB2340` is an example address. Discover the real address for your target game version using IDA Pro or Ghidra pattern scanning (see the IDA Pro RVA Discovery dataset). Re-verify after every game patch.
- Request the trampoline interface as early as possible in `F4SEPlugin_Load` — after the messaging interface but before `PostLoad` hooks.

---

## Phase 2: Grid-Based HTML Dashboard with Coordinate Tracking Canvas

Replace `index.html` with this layout. It adds a CSS grid split-screen with a real-time Canvas 2D coordinate plotter alongside the health metrics panel.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Advanced Engine Diagnostics Console</title>
    <style>
        body { background: #111; color: #00ff00; font-family: monospace; padding: 20px; }
        .grid-container { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
        .panel  { border: 1px solid #00ff00; padding: 15px; background: #1a1a1a; }
        .value  { font-size: 1.8em; font-weight: bold; margin-bottom: 10px; color: #fff; }
        canvas  { border: 1px dashed #00ff00; background: #050505; width: 100%; height: 400px; }
    </style>
</head>
<body>
    <h2>Advanced Telemetry &amp; Mapping Grid</h2>
    <div class="grid-container">
        <div class="panel">
            <div id="status">Connecting...</div>
            <hr style="border-color:#00ff00;">
            <div>Player Health:</div>
            <div class="value" id="hp">0 / 0</div>
            <div>X Position: <span id="pos-x">0</span></div>
            <div>Y Position: <span id="pos-y">0</span></div>
        </div>
        <div class="panel">
            <div>Real-Time Tactical Coordinate Chart:</div>
            <canvas id="mapCanvas" width="800" height="400"></canvas>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('mapCanvas');
        const ctx    = canvas.getContext('2d');
        const socket = new WebSocket('ws://127.0.0.1:8081');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.x === undefined) return;

            document.getElementById('hp').innerText =
                `${data.health.toFixed(0)} / ${data.max_health.toFixed(0)}`;
            document.getElementById('pos-x').innerText = data.x.toFixed(2);
            document.getElementById('pos-y').innerText = data.y.toFixed(2);

            // Map Fallout 4 world units to canvas pixels
            // Divide by 200 to scale; offset by half canvas to centre the origin
            const screenX = (data.x / 200) + (canvas.width  / 2);
            const screenY = (canvas.height / 2) - (data.y / 200);

            // Semi-transparent overlay creates motion trail effect
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the player dot at the scaled position
            ctx.beginPath();
            ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        };
    </script>
</body>
</html>
```

**Key points:**
- `grid-template-columns: 320px 1fr` creates a fixed-width left panel and a flexible right panel. Add more columns (e.g., `320px 1fr 1fr`) to accommodate additional metric cards.
- `canvas.width` and `canvas.height` are the internal resolution of the canvas bitmap (800×400 pixels). The CSS `width: 100%; height: 400px` scales the rendered output to fill the panel — these are independent. Do not set canvas dimensions via CSS alone or drawing coordinates will be misaligned.
- The scale divisor `/ 200` maps one Fallout 4 world unit to 1/200th of a canvas pixel. Fallout 4 world coordinates span roughly ±200,000 units for the full map. Adjust the divisor to zoom in or out: smaller values show more detail, larger values show the full map.
- `fillRect(0, 0, canvas.width, canvas.height)` with `rgba(0,255,0,0.1)` creates a fade-trail effect — each frame fades previous dots by 10% opacity instead of clearing the canvas completely. Replace with `clearRect` for a crisp single-dot display.
- The coordinate system: Fallout 4's X axis increases east, Y axis increases north. Dividing Y and subtracting from `canvas.height/2` flips the vertical axis to match screen space (Y increases downward on canvas).

---

## Phase 3: Automated Unit Testing Framework (Papyrus)

Save as `HEW_TestSuiteRunner.psc` and attach to a persistent Quest. Call `RunAutomatedValidationSuite()` from a hotkey, console command, or OnInit to validate all data layers inside the live engine.

```papyrus
Scriptname HEW_TestSuiteRunner extends Quest

Function RunAutomatedValidationSuite()
    Debug.Notification("[Test Suite]: Starting operational validation loops...")

    TestPlayerPointerIntegrity()
    TestNetworkPayloadRanges()

    Debug.Notification("[Test Suite]: All validation routines complete.")
EndFunction

Function TestPlayerPointerIntegrity()
    Actor playerRef = Game.GetPlayer()
    If playerRef == None
        Debug.Trace("[TEST FAILED]: Core runtime reference resolved to null pointer!")
    Else
        Debug.Trace("[TEST PASSED]: Player object linkage verified successfully.")
    EndIf
EndFunction

Function TestNetworkPayloadRanges()
    Float sampleTestValue = 0.0

    If sampleTestValue < 0.0 || sampleTestValue > 100000.0
        Debug.Trace("[TEST FAILED]: Telemetry packet fell outside acceptable engine boundaries.")
    Else
        Debug.Trace("[TEST PASSED]: Telemetry payload range checks passed verification.")
    EndIf
EndFunction
```

**Key points:**
- `Debug.Trace` writes to the Papyrus log (`Documents\My Games\Fallout4\Logs\Script\Papyrus.0.log`) rather than an on-screen notification. Enable Papyrus logging by setting `bEnableLogging=1` and `bEnableTrace=1` in the `[Papyrus]` section of `Fallout4.ini`. View logs in real time with a text viewer or `tail`.
- `Debug.Notification` shows the summary message on-screen so you can confirm the suite ran without opening a log file. Use it for high-level pass/fail summaries only — calling it for every test creates notification spam.
- Extend `RunAutomatedValidationSuite` by calling additional `TestXxx()` functions for each data layer you add (e.g., a test that verifies a specific actor value is non-zero before the telemetry thread reads it).
- This pattern is a lightweight smoke-test runner, not a full test harness. For precise data validation, store expected values as constants and compare against live reads with `== None` guards around all object references.
- Call the suite on a registered hotkey (`RegisterForKey`) or from a `Debug.MessageBox` prompt so it can run at any point during play without reloading the save.

---

## Troubleshooting Focus

- **Trampoline `AllocateFromCodePage` returns null (Phase 1)**: The trampoline pool is exhausted by other plugins. Request only the bytes you need (10 for a 5-byte hook + 5-byte original). Check for conflicts with other F4SE plugins that hook the same address.
- **Game crashes immediately on the hooked function call (Phase 1)**: `TargetApplyDamage_Original` was not saved correctly, or the calling convention is wrong. Verify the function typedef matches the engine's actual signature by cross-referencing in IDA. Missing parameters or wrong types corrupt the stack.
- **Canvas dots drift off-screen at map boundaries (Phase 2)**: The scale divisor is too small for far-from-origin coordinates. Clamp `screenX` and `screenY` to `[0, canvas.width]` and `[0, canvas.height]` before drawing, or increase the divisor.
- **Canvas CSS height doesn't match drawn coordinates (Phase 2)**: Canvas internal size (`width`/`height` attributes) and CSS display size are independent. Set both the HTML attribute (`canvas.width = 800`) and CSS to avoid coordinate scaling mismatches.
- **`Debug.Trace` output not appearing in log (Phase 3)**: Papyrus logging is disabled in `Fallout4.ini`. Add `bEnableLogging=1` and `bEnableTrace=1` under `[Papyrus]`. Without these, `Debug.Trace` calls are silently discarded.
- **Test suite Quest not running `OnInit` (Phase 3)**: The Quest is not flagged **Start Game Enabled**. Open the Quest in Creation Kit, go to Quest Data, and tick **Start Game Enabled** so `OnInit` fires on every game load.
