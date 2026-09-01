# F4SE Input Intercept Hook, Unified Build Automation, and Mutex Ring-Buffer Payload Safeguards

This dataset covers three advanced F4SE plugin engineering topics: registering a custom `PlayerInputHandler` subclass with the F4SE input pipeline to intercept keyboard and gamepad button events before the game processes them, writing a `build_all.bat` automation script that compiles the Scaleform AS3 widget and the C++ Visual Studio solution in a single step, and implementing a mutex-guarded ring buffer that safely decouples the high-frequency network receive thread from the game-thread telemetry consumer.

---

## Phase 1: F4SE Input Intercept Hook (Keyboard and Gamepad)

F4SE exposes `F4SEInputInterface`, which accepts custom `PlayerInputHandler` subclasses and inserts them into the engine's button-event dispatch chain. Every physical key press and gamepad button activation flows through this chain before the game's own input mappings respond to it.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/InputMap.h"
#include "f4se/GameInput.h"

// Subclass PlayerInputHandler and override HandleButtonEvent to intercept all
// button-level input before the engine's own action-mapping layer processes it.
class CustomInputHandler : public PlayerInputHandler {
public:
    virtual void HandleButtonEvent(ButtonEvent* evn) override {
        if (!evn) return;

        BSFixedString controlName = evn->GetControlName();
        UInt32        deviceType  = evn->deviceType;   // 0 = keyboard/mouse, 1 = gamepad
        UInt32        keyCode     = evn->keyCode;

        // isPressed is a float: 1.0 = key-down transition, 0.0 = key-up transition.
        // Check for the key-down edge only to avoid firing twice per press.
        if (evn->isPressed == 1.0f) {
            _MESSAGE("[Input Hook] Device=%d  KeyCode=%d  Control=%s",
                     deviceType, keyCode, controlName.c_str());

            // F5 (keyboard) or Back/Select (gamepad) — trigger diagnostics
            if (keyCode == InputMap::kMacro_KeyboardF5 ||
                keyCode == InputMap::kMacro_GamepadBack) {
                _MESSAGE("[Input Hook] Diagnostic hotkey activated.");
                // Call telemetry pipeline toggle or dashboard open operation here
            }
        }
    }
};

// A single global handler instance — lifetime must exceed F4SE plugin load.
static CustomInputHandler g_inputHandler;

// Call once inside F4SEPlugin_Load after acquiring F4SEInputInterface.
void InitializeInputHooking(F4SEInputInterface* inputInterface) {
    if (!inputInterface) {
        _WARNING("[Input Hook] F4SEInputInterface is null — input hooking skipped.");
        return;
    }
    inputInterface->RegisterInputHandler(&g_inputHandler);
    _MESSAGE("[Input Hook] CustomInputHandler registered with F4SE input pipeline.");
}
```

**Acquire the input interface in `F4SEPlugin_Load`:**

```cpp
extern "C" __declspec(dllexport) bool F4SEPlugin_Load(const F4SEInterface* f4se) {
    F4SEInputInterface* inputInterface =
        static_cast<F4SEInputInterface*>(f4se->QueryInterface(kInterface_Input));

    InitializeInputHooking(inputInterface);
    return true;
}
```

**Key points:**
- `HandleButtonEvent` fires for every button state transition — both key-down (`isPressed == 1.0f`) and key-up (`isPressed == 0.0f`). Check `isPressed` to avoid double-firing per physical press.
- `evn->deviceType` distinguishes keyboard/mouse (`kDeviceType_Keyboard = 0`) from gamepad (`kDeviceType_Gamepad = 2`). Use this to implement separate bindings for controller and keyboard without a separate handler.
- `evn->GetControlName()` returns the action-mapping name (e.g., `"Jump"`, `"Activate"`) that the game has bound to this key. It returns an empty string if the key is unmapped. Prefer `keyCode` for unconditional raw key interception; prefer `controlName` for semantic action interception that respects user remapping.
- `InputMap::kMacro_KeyboardF5` and other `kMacro_*` constants are defined in `f4se/InputMap.h`. Check that header for the full list of named keyboard and gamepad constants available in your F4SE SDK version.
- `g_inputHandler` is a static global. Do **not** allocate it on the stack inside `InitializeInputHooking` — the engine holds a raw pointer to it, and a stack-allocated instance would be destroyed when the function returns, leaving a dangling pointer in the dispatch chain.
- `RegisterInputHandler` must be called after `F4SEPlugin_Load` returns — do not call it during static initialisation or `DllMain`. The F4SE input system is not ready until the plugin load phase.

---

## Phase 2: Unified Cross-Language Compiler Automation Script

Save this as `build_all.bat` in the root of your mod development workspace. A single double-click (or CI invocation) compiles the AS3 Scaleform widget, rebuilds the C++ F4SE plugin solution, and runs the packaging script.

```bat
@echo off
setlocal EnableDelayedExpansion
echo =======================================================
echo   UNIFIED CROSS-LANGUAGE COMPILE AUTOMATION PIPELINE
echo =======================================================

:: ── Configuration ──────────────────────────────────────────────────────────
set PROJECT_DIR=%~dp0
set MXMLC_PATH=C:\SDKs\flex_sdk_4.6\bin\mxmlc.exe
set MSBUILD_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe
set SLN_FILE=%PROJECT_DIR%EngineTelemetryToolkit.sln
set AS3_SOURCE=%PROJECT_DIR%Interface\EDI\TelemetryWidget.as
set SWF_OUTPUT=%PROJECT_DIR%BuildArchive\Interface\EDI\TelemetryWidget.swf

:: ── Step 1: Compile AS3 Scaleform widget ────────────────────────────────────
if exist "%MXMLC_PATH%" (
    echo [UI Build] Compiling ActionScript 3 to Scaleform SWF...
    "%MXMLC_PATH%" -static-link-runtime-shared-libraries=true ^
        "%AS3_SOURCE%" -output "%SWF_OUTPUT%"
    if !ERRORLEVEL! neq 0 (
        echo [UI Build] ERROR: mxmlc returned error !ERRORLEVEL!. Aborting.
        goto :FAIL
    )
    echo [UI Build] SWF compiled successfully: %SWF_OUTPUT%
) else (
    echo [UI Build] WARNING: mxmlc not found at %MXMLC_PATH% -- skipping AS3 compile.
)

:: ── Step 2: Rebuild C++ F4SE plugin via MSBuild ──────────────────────────────
if not exist "%MSBUILD_PATH%" (
    echo [C++ Build] ERROR: MSBuild not found at "%MSBUILD_PATH%". Aborting.
    goto :FAIL
)
echo [C++ Build] Rebuilding solution: %SLN_FILE%
"%MSBUILD_PATH%" "%SLN_FILE%" /t:Rebuild ^
    /p:Configuration="Release" /p:Platform=x64 ^
    /verbosity:minimal /nologo
if %ERRORLEVEL% neq 0 (
    echo [C++ Build] ERROR: MSBuild returned error %ERRORLEVEL%. Aborting.
    goto :FAIL
)
echo [C++ Build] C++ plugin compiled successfully.

:: ── Step 3: Run packaging / post-build script ────────────────────────────────
if exist "%PROJECT_DIR%post_build.bat" (
    echo [Package] Running post-build packaging script...
    call "%PROJECT_DIR%post_build.bat"
    if !ERRORLEVEL! neq 0 (
        echo [Package] ERROR: post_build.bat failed with error !ERRORLEVEL!.
        goto :FAIL
    )
) else (
    echo [Package] No post_build.bat found -- skipping packaging step.
)

echo =======================================================
echo   BUILD COMPLETE -- ALL TARGETS SUCCEEDED
echo =======================================================
endlocal
exit /b 0

:FAIL
echo =======================================================
echo   BUILD FAILED -- SEE ERRORS ABOVE
echo =======================================================
endlocal
exit /b 1
```

**Key points:**
- `%~dp0` expands to the directory containing `build_all.bat` with a trailing backslash. Use it instead of hardcoded absolute paths so the script works on any developer's machine regardless of drive letter or folder name.
- `setlocal EnableDelayedExpansion` is required to use `!ERRORLEVEL!` inside `if` blocks. Without it, `%ERRORLEVEL%` is expanded at parse time (before the command runs) and always reads the value from the top of the block rather than the just-executed command.
- Check `%ERRORLEVEL%` (or `!ERRORLEVEL!` inside blocks) after every tool invocation. Batch files do not fail automatically on non-zero exit codes — if you omit these checks, a failed `mxmlc` compile will silently proceed to MSBuild with a stale or missing SWF.
- `/t:Rebuild` forces a clean rebuild of all C++ project outputs. Use `/t:Build` instead for incremental compilation during frequent iteration; use `Rebuild` for CI or release packaging to guarantee a clean output.
- `/verbosity:minimal` suppresses the individual file-compile lines from MSBuild output. Change to `/verbosity:normal` or `/verbosity:detailed` when diagnosing unexpected compile failures.
- The `call` keyword in `call "%PROJECT_DIR%post_build.bat"` is mandatory. Without `call`, batch execution transfers control to the sub-script and never returns to `build_all.bat` — subsequent steps and the `ERRORLEVEL` check are never reached.

---

## Phase 3: Multi-Threaded Payload Mutex Ring-Buffer Safeguards

The TCP receive thread and the game's main thread both access the telemetry payload queue simultaneously. Without synchronisation, concurrent reads and writes produce torn data, use-after-free crashes, or missed packets. A fixed-size ring buffer guarded by a `std::mutex` safely decouples the two threads: the network thread writes; the game thread reads.

```cpp
#include "f4se/PluginAPI.h"
#include <mutex>
#include <array>
#include <string>
#include <optional>

// ── Ring buffer ──────────────────────────────────────────────────────────────

template<typename T, size_t Capacity>
class MutexRingBuffer {
    static_assert(Capacity > 0, "Capacity must be at least 1");

public:
    // Push an item from the producer (network) thread.
    // Returns false and drops the item if the buffer is full.
    bool Push(T item) {
        std::lock_guard<std::mutex> lock(m_mutex);
        if (m_count == Capacity) {
            // Buffer full: drop the oldest entry to make room so fresh data
            // is never blocked — comment out the next two lines to block instead.
            m_head = (m_head + 1) % Capacity;
            --m_count;
        }
        m_buffer[m_tail] = std::move(item);
        m_tail = (m_tail + 1) % Capacity;
        ++m_count;
        return true;
    }

    // Pop the oldest item from the consumer (game) thread.
    // Returns std::nullopt if the buffer is empty.
    std::optional<T> Pop() {
        std::lock_guard<std::mutex> lock(m_mutex);
        if (m_count == 0) return std::nullopt;
        T item = std::move(m_buffer[m_head]);
        m_head = (m_head + 1) % Capacity;
        --m_count;
        return item;
    }

    size_t Size() const {
        std::lock_guard<std::mutex> lock(m_mutex);
        return m_count;
    }

private:
    mutable std::mutex    m_mutex;
    std::array<T, Capacity> m_buffer{};
    size_t m_head  = 0;
    size_t m_tail  = 0;
    size_t m_count = 0;
};

// ── Global payload queue ──────────────────────────────────────────────────────

// 64-entry buffer: holds up to 64 JSON payloads received from the TCP socket.
// If the game thread falls behind, the oldest entries are overwritten rather
// than the queue growing unboundedly and exhausting memory.
static MutexRingBuffer<std::string, 64> g_payloadQueue;

// ── Producer: called from the network receive thread ─────────────────────────

void EnqueueNetworkPayload(const std::string& json) {
    bool accepted = g_payloadQueue.Push(json);
    if (!accepted) {
        _WARNING("[RingBuffer] Payload queue full — oldest entry overwritten.");
    }
}

// ── Consumer: called from AddTask lambda on the main game thread ─────────────

void DrainPayloadQueue() {
    size_t processed = 0;
    while (auto payload = g_payloadQueue.Pop()) {
        // Process the payload on the game thread where engine APIs are safe to call
        _MESSAGE("[Payload] Dequeued: %.80s", payload->c_str());

        // Parse and route the command: e.g., NAVIGATE_ACTOR, CONFIG_UPDATE, etc.
        // HandleIncomingPayload(*payload);

        if (++processed >= 8) break;  // yield after 8 per frame to avoid stalling
    }
}

// ── Game-thread integration ───────────────────────────────────────────────────

// Register this via F4SE's task interface so it runs once per game frame on the
// game thread.  Example: taskInterface->AddTask(new DrainPayloadTask());
struct DrainPayloadTask : public ITaskDelegate {
    virtual void Run() override { DrainPayloadQueue(); }
    virtual void Dispose() override { delete this; }
};

// Re-queue itself each frame so the drain loop runs continuously:
void ScheduleDrainLoop(F4SETaskInterface* taskInterface) {
    if (taskInterface) {
        taskInterface->AddTask(new DrainPayloadTask());
    }
}
```

**Key points:**
- `std::lock_guard<std::mutex>` acquires the mutex on construction and releases it on destruction (RAII). This is safe even if an exception is thrown inside the guarded block, which `std::mutex::lock()` / `unlock()` pairs are not.
- The ring buffer uses indices (`m_head`, `m_tail`, `m_count`) rather than pointers so that modular wraparound is computed with `% Capacity` in O(1) without pointer arithmetic that could drift out of bounds.
- Dropping the oldest entry on overflow (`m_head = (m_head + 1) % Capacity`) is the correct policy for real-time telemetry: stale data from a backed-up queue is less valuable than fresh data from the current frame. Switch to a blocking `std::condition_variable::wait` strategy only if every payload must be processed and latency is acceptable.
- The per-frame drain cap (`if (++processed >= 8) break`) prevents a sudden burst of 64 queued payloads from consuming the entire game frame tick in one call. Tune the cap based on how much work `HandleIncomingPayload` does per item.
- `ITaskDelegate::Run()` executes on the game's main thread, making it safe to call F4SE engine APIs (`LookupFormByID`, actor value reads, pathfinding calls) that would crash if invoked from the TCP background thread. The network thread only calls `EnqueueNetworkPayload`, which only acquires the mutex — it never touches engine state.
- `m_mutex` is declared `mutable` to allow `Size()` (a logically `const` query) to lock the mutex without removing `const` from the method signature.

---

## Troubleshooting Focus

- **`RegisterInputHandler` has no effect — no log output from `HandleButtonEvent` (Phase 1)**: The handler was registered before `F4SEPlugin_Load` returned, or `F4SEInputInterface` was `nullptr`. Confirm `QueryInterface(kInterface_Input)` returns non-null. On some game versions the input interface is only available after `kMessage_InputLoaded`; register the handler inside the F4SE messaging callback for that message instead.
- **`controlName` is always empty (Phase 1)**: The key has no action mapping in the current input context (e.g., menus override game mappings). Use `keyCode` directly for global hotkeys that must fire regardless of input context.
- **Double-trigger on a single key press (Phase 1)**: Both key-down (`isPressed == 1.0f`) and key-up (`isPressed == 0.0f`) events are being handled. Guard with `if (evn->isPressed != 1.0f) return;` at the top of `HandleButtonEvent`.
- **`mxmlc` step in `build_all.bat` exits with error code 2 (Phase 2)**: The AS3 source file path contains spaces. Wrap `%AS3_SOURCE%` in double quotes as shown in the script. Also confirm `mxmlc.exe` is in a path without spaces, or quote `%MXMLC_PATH%` too.
- **MSBuild step fails with "project not found" (Phase 2)**: `%SLN_FILE%` resolves to a path with a trailing space if `PROJECT_DIR` ends with `\` and you concatenate without checking. Print `echo %SLN_FILE%` before the MSBuild call to inspect the resolved path.
- **`g_payloadQueue.Pop()` occasionally returns corrupt strings (Phase 3)**: The `std::move` in `Pop()` leaves the slot in a valid-but-unspecified state. If the producer writes to that slot again before `std::move` completes on the consumer side — which cannot happen because both operations are inside `lock_guard` — this should not occur. If you see corruption, confirm `std::string` move semantics work correctly in your compiler's STL (they do in MSVC 2022 with `/std:c++17`).
- **`DrainPayloadQueue` stalls the game for multiple frames (Phase 3)**: Lower the per-frame drain cap from 8 to 2–4, or move payload parsing to a second background thread and only queue the parsed result struct (not the raw JSON string) for the game thread to apply.
