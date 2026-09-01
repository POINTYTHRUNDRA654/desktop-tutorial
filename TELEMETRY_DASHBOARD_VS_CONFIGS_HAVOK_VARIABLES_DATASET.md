# Telemetry Dashboard, VS2022 Build Configurations, and Havok Graph Variable States

This dataset covers three developer experience and animation topics: a standalone HTML/JS WebSocket telemetry dashboard for live engine data visualization, Visual Studio 2022 multi-configuration setup with preprocessor-gated feature flags, and driving Havok behavior graph float and integer variable slots from Papyrus to achieve smooth mechanical state transitions.

---

## Phase 1: Minimal HTML/JS Telemetry Dashboard Interface

Save this as `index.html` on your local machine. It connects to the Node.js WebSocket relay on port 8080 and renders live engine telemetry values in a terminal-style layout.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>F4SE Live Telemetry Dashboard</title>
    <style>
        body  { background: #111; color: #00ff00; font-family: monospace; padding: 20px; }
        .card { border: 1px solid #00ff00; padding: 15px; width: 300px; background: #1a1a1a; }
        .value  { font-size: 2em; font-weight: bold; margin-top: 10px; }
        .status { color: #888; font-size: 0.9em; margin-bottom: 5px; }
    </style>
</head>
<body>
    <h2>Engine Diagnostics Console</h2>
    <div class="card">
        <div class="status" id="connection-status">Connecting to game server...</div>
        <div>Live Timescale / Telemetry:</div>
        <div class="value" id="telemetry-value">0.00</div>
    </div>

    <script>
        // WebSocket requires a WS server wrapper around raw TCP streams.
        // If your C++ plugin uses raw TCP, a Node.js relay bridge forwards
        // raw buffers to this WebSocket connection.
        const socket = new WebSocket('ws://127.0.0.1:8080');

        socket.onopen = () => {
            document.getElementById('connection-status').innerText = "CONNECTED TO FALLOUT 4";
            document.getElementById('connection-status').style.color = "#00ff00";
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.telemetry !== undefined) {
                    document.getElementById('telemetry-value').innerText =
                        data.telemetry.toFixed(4);
                }
            } catch (e) {
                console.error("Failed to parse telemetry data frame", e);
            }
        };

        socket.onclose = () => {
            document.getElementById('connection-status').innerText = "DISCONNECTED - RETRYING...";
            document.getElementById('connection-status').style.color = "#ff0000";
        };
    </script>
</body>
</html>
```

**Key points:**
- `new WebSocket('ws://127.0.0.1:8080')` opens a WebSocket connection to localhost. Browser WebSocket requires a proper WebSocket handshake — the C++ raw TCP plugin sends raw bytes, so you need a small Node.js relay (e.g., the `ws` package) that accepts the raw TCP connection and forwards data over a WebSocket to this page.
- `socket.onmessage` fires on every incoming frame. `JSON.parse(event.data)` parses the `{"telemetry":<value>}` payload from the C++ side. The `try/catch` handles malformed frames gracefully without crashing the listener loop.
- `data.telemetry.toFixed(4)` formats the float to 4 decimal places for readability. Adjust as needed for your data range.
- `socket.onclose` fires when the game exits or the relay server stops. Add a `setTimeout` reconnect loop here if you want the dashboard to auto-reconnect without a page refresh.
- Open `index.html` directly in a browser (`file://`) — no web server is needed for the client side. The WebSocket connection itself targets the local relay server.

---

## Phase 2: Visual Studio Build Configurations (Standard vs. Developer Debug)

Map separate Visual Studio 2022 configurations to your FOMOD install options, so the Standard and Developer Debug DLL builds compile with different features.

### Setting Up Custom Configurations

1. Open **Build → Configuration Manager** from the Visual Studio menu bar.
2. Under **Active solution configuration**, choose **`<New...>`**.
3. Name the new configuration `Developer Debug` and copy settings from `Release`.
4. Repeat for the solution configuration if prompted.

### Preprocessor-Gated Feature Flags (main.cpp)

```cpp
#include "f4se/PluginAPI.h"

void RunTelemetryPipeline(float liveValue) {
#ifdef _DEVELOPER_DEBUG
    // Compiles ONLY in the Developer Debug configuration
    // Heavy network feature: streams data over local TCP to the dashboard
    BroadcastTelemetryData(liveValue);
#else
    // Production behavior: write to async batch log, no network overhead
    g_TelemetryLogger.LogEvent("INFO",
        "Telemetry event saved safely to background storage disk.");
#endif
}
```

### Adding the Preprocessor Macro

1. Right-click the project in **Solution Explorer → Properties**.
2. Set the **Configuration** dropdown to `Developer Debug | x64`.
3. Navigate to **C/C++ → Preprocessor → Preprocessor Definitions**.
4. Click **Edit** and add: `_DEVELOPER_DEBUG;`
5. Click **OK** and confirm only the `Developer Debug` configuration has this definition — the `Release` configuration must not.

**Key points:**
- `#ifdef _DEVELOPER_DEBUG` is evaluated at compile time. The `BroadcastTelemetryData` call is completely absent from the Release binary — it is not compiled in, not just disabled at runtime.
- Never rely on `#ifdef` for security-critical gating. Use it only for development-only features (logging verbosity, network broadcasters, diagnostic overlays) that you intentionally exclude from production builds.
- Copy settings from `Release` rather than `Debug` when creating `Developer Debug`. This keeps optimizations and runtime library settings (`/MT`, `x64`, `C++17`) identical to your production build, so crashes reproduce faithfully.
- Set the `Developer Debug` **Output Directory** to a different path than `Release` (e.g., `$(SolutionDir)Output\DevDebug\`) so both configurations can be built without overwriting each other.

---

## Phase 3: Havok Behavior Graph Variables & Complex States

For smooth mechanical movement, drive float and integer variable slots inside the `.hkx` behavior graph directly from Papyrus rather than only sending named event pulses.

### Havok Graph Variable Data Flow

```
[ PAPYRUS / F4SE INTERFACE ]
        |
        | SetAnimationVariableFloat("fMechanicalSpeed", value)
        | SetAnimationVariableInt("iMovementDirection", value)
        v
[ HAVOK GRAPH VARIABLE SLOT ]  (e.g., fMechanicalSpeed, iMovementDirection)
        |
        v
[ BLEND / TRANSITION NODE ]   (reads variable to control blend weight or speed)
        |
        v
[ MECHANICAL RIGGED MESH ]    (animated output)
```

### Papyrus Graph Driver Script (HEW_MechanicalGraphDriver.psc)

```papyrus
Scriptname HEW_MechanicalGraphDriver extends ObjectReference

; Sets a Float variable slot inside the bound .hkx behavior graph
Function UpdateMechanismSpeed(Float afNewSpeed)
    ; "fMechanicalSpeed" must match the variable name defined in the
    ; Autodesk 3ds Max / Havok Behavior Tool project
    Self.SetAnimationVariableFloat("fMechanicalSpeed", afNewSpeed)
EndFunction

; Sets an Int variable slot to drive directional blend state branches
Function UpdateMechanismDirection(Bool abForward)
    Int directionValue = -1
    If abForward
        directionValue = 1
    EndIf
    Self.SetAnimationVariableInt("iMovementDirection", directionValue)
EndFunction

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        UpdateMechanismSpeed(2.5)
        UpdateMechanismDirection(true)
        Self.PlayAnimation("TriggerOpen")
    EndIf
EndEvent
```

**Key points:**
- `SetAnimationVariableFloat` and `SetAnimationVariableInt` write directly to named variable slots in the Havok behavior graph. These variables must be declared and named identically in the HCT workspace — the names are case-sensitive.
- Float variables typically drive **blend trees** (speed multipliers, transition weights, rotation targets). Integer variables typically drive **condition branches** (direction flags, state selectors). Use the appropriate type to match how the graph node reads the value.
- Combining variable writes with a `PlayAnimation` event call is the standard pattern: set the variables first so the transition node has correct values, then fire the event to trigger the state change. Firing the event before setting variables may cause the animation to start with default (zero) values.
- In the HCT behavior graph, connect the float variable to a **Blend Speed** or **Modify Frame** node input, and connect the integer variable to a **Condition** node that gates which state machine branch activates.
- Variables persist in the graph until explicitly overwritten. If a mechanism can be reversed, call `UpdateMechanismDirection(false)` before firing the closing animation event.

---

## Troubleshooting Focus

- **WebSocket `onopen` never fires (Phase 1)**: The Node.js relay server is not running or is bound to a different port. Confirm the relay is started before launching the game and listening on `127.0.0.1:8080`. Check the browser developer console for connection refused errors.
- **Dashboard shows `0.00` permanently (Phase 1)**: The relay is connected but not forwarding data. Add `console.log(event.data)` inside `onmessage` to confirm raw frames are arriving before parsing.
- **`BroadcastTelemetryData` still compiles in Release (Phase 2)**: The `_DEVELOPER_DEBUG` macro was added to the `Release` configuration by mistake. Open Properties, switch to the `Release` configuration, and verify Preprocessor Definitions does not contain `_DEVELOPER_DEBUG`.
- **Both DLL builds overwrite the same output file (Phase 2)**: The Output Directory for `Developer Debug` was not changed from `Release`. Set them to separate output paths.
- **`SetAnimationVariableFloat` has no visible effect (Phase 3)**: The variable name string does not match the slot name in the HCT project (case-sensitive), or the object reference does not have a behavior graph that reads this variable. Open the `.hkx` in HCT and confirm the variable exists and is wired to a node input.
- **Mechanism starts at wrong speed on activation (Phase 3)**: The event was fired before the variable writes completed. Reorder to always call `UpdateMechanismSpeed` and `UpdateMechanismDirection` before `PlayAnimation`.
