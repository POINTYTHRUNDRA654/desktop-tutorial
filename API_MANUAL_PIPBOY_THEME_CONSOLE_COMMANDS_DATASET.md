# Developer API Integration Manual, Pip-Boy Dashboard Skin, and Papyrus Console Debug Command Interface

This dataset covers three practical developer workflows for an F4SE telemetry stack: drafting a clear API integration manual, applying a Fallout-style Pip-Boy visual skin to a diagnostics dashboard, and exposing a Papyrus console command path for injecting synthetic telemetry during runtime testing.

---

## Phase 1: Comprehensive Developer API Integration README

Use this as the API manual content template for your toolkit project root README.

```markdown
# Engine Telemetry & EDI Toolkit API Manual

## 1. Architecture Map
* **Data Sources:** Direct Engine Memory Access (RVAs via Signature Scanner)
* **Encryption Layer:** Symmetric 8-bit XOR Cipher Rotation (`F4SE_SecureTelemetryKey_2026`)
* **Transport Layer:** Local TCP Socket Stream (Port 8080) -> Node.js Relay -> WebSockets (Port 8081)

## 2. Native C++ Function Bindings Exposed to Papyrus

### `CommitMemoryWrite(Float afNewValue)`
* **Script Target:** `HEW_EDIDialogueController`
* **Description:** Safely modifies game engine timescale or target tracking values in memory.
* **Safety Rules:** Protected by structured exception handling (SEH) and VirtualQuery page-protection validations.

### `SendComplexData(Form akTargetForm, String asOperation, Int[] aiDataArray)`
* **Script Target:** `HEW_ComplexBridge`
* **Description:** Passes complex game objects, strings, and integer arrays directly to the C++ processing layer.

## 3. Custom Papyrus Framework Events

### `OnTelemetryUpdate(Quest akSender, Var[] akArgs)`
* **Payload Type:** `akArgs[0]` as Float
* **Description:** Fires on the game thread when the C++ worker loop finishes processing an update frame.
```

**Key points:**
- Keep architecture, bindings, and event contracts in separate sections so engine and scripting teams can coordinate quickly.
- Include exact parameter types (`Float`, `Int[]`, `Var[]`) to avoid Papyrus/C++ marshaling mismatches.
- Keep event payload indexing documented (for example `akArgs[0]`) so consumers parse correctly.
- Treat encryption and transport details as protocol-level API and version them when changed.
- In multi-product repos, prefer a feature-specific manual filename (for example `ENGINE_TELEMETRY_API_MANUAL.md`) instead of overwriting a global README.

---

## Phase 2: Pip-Boy Themed Dashboard Skin (HTML/CSS)

Replace the dashboard style module with this Pip-Boy-inspired monochrome amber theme.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Pip-Boy Terminal Console</title>
    <style>
        body { 
            background-color: #051105; 
            color: #ffb000; 
            font-family: 'Courier New', Courier, monospace; 
            text-shadow: 0 0 5px rgba(255, 176, 0, 0.7);
            padding: 20px;
        }
        .panel { 
            border: 2px solid #ffb000; 
            padding: 15px; 
            background: #0a220a; 
            box-shadow: inset 0 0 15px rgba(255, 176, 0, 0.2), 0 0 10px rgba(255, 176, 0, 0.3);
            margin-bottom: 15px;
        }
        .grid-container { display: grid; grid-template-columns: 350px 1fr; gap: 20px; }
        .value { font-size: 2.2em; font-weight: bold; margin: 10px 0; border-bottom: 1px dashed #ffb000; }
        canvas { 
            border: 2px solid #ffb000; 
            background: #020802; 
            box-shadow: 0 0 15px rgba(255, 176, 0, 0.3);
        }
        th, td { border: 1px solid #ffb000; padding: 10px; color: #ffb000; }
        th { background: #123312; }
    </style>
</head>
<body>
    <div class="panel">
        <h1>[ PIP-BOY DIAGNOSTIC SYSTEM v4.26 ]</h1>
    </div>
    <!-- Remainder of the dashboard body maps identically to previous steps -->
</body>
</html>
```

**Key points:**
- Keep contrast high (`#ffb000` on deep green-black) to preserve readability in low-light play sessions.
- Apply shared panel/table/canvas styling tokens so new UI modules inherit the same visual language.
- Preserve existing DOM IDs and telemetry bindings while changing style-only concerns.
- Use monospace terminal typography for consistent numeric alignment in telemetry tables.
- If canvas overlays are used, ensure glow/box-shadow effects do not hide critical point markers.

---

## Phase 3: Papyrus Developer Debug Console Commands

Save as `HEW_ConsoleCommandInterface.psc` and attach to a persistent Quest/global execution context.

```papyrus
Scriptname HEW_ConsoleCommandInterface extends Quest

; Expose variables to the game engine console environment
Function InjectMockTelemetry(Float afFakeValue) global
    Debug.Trace("[CONSOLE COMMAND]: Manually forcing artificial value insertion: " + afFakeValue)
    
    ; Locate the active global telemetry dispatcher instance in the world
    HEW_TelemetryReceiver scriptTarget = Game.GetFormFromFile(0x01000D62, "EngineTelemetryToolkit.esp") as HEW_TelemetryReceiver
    
    If scriptTarget != None
        ; Force a mock dataset down the network loop to verify the UI chart's response
        scriptTarget.ReceiveEngineData(afFakeValue)
    Else
        Debug.Trace("[CONSOLE ERROR]: Telemetry processing system cannot be located in current cell layout.")
    EndIf
EndFunction

; Execution syntax inside the in-game console: 
; cgf "HEW_ConsoleCommandInterface.InjectMockTelemetry" 45.25
```

**Key points:**
- Use `global` for console-callable helper functions (`cgf`) so they can be triggered without instance-scoped references.
- Validate `GetFormFromFile` results before calling into script APIs to avoid null-reference runtime faults.
- Keep injected telemetry paths identical to real data paths (`ReceiveEngineData`) to test full pipeline behavior.
- Use `Debug.Trace` for debug command output so results are visible in Papyrus logs after test sessions.
- Maintain a known-good form ID map per plugin version so console helpers do not break after load-order changes.

---

## Troubleshooting Focus

- **`cgf` command returns nothing (Phase 3):** Function is not marked `global`, script did not compile, or script is not loaded in the current save.
- **`GetFormFromFile` returns `None` (Phase 3):** Incorrect FormID, wrong plugin filename, or plugin load order mismatch.
- **Dashboard theme not fully applied (Phase 2):** Existing CSS selectors are more specific; increase selector specificity or load this stylesheet last.
- **Manual/API docs drift from implementation (Phase 1):** Binding names changed in C++/Papyrus but README contract was not updated in the same commit.
- **Unreadable terminal colors on some displays (Phase 2):** Reduce glow opacity and increase foreground brightness while preserving Pip-Boy palette identity.

