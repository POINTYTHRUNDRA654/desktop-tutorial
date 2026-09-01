# IDA Pro RVA Discovery, EDI Dialogue Controller, and Thread-Safe Telemetry Dispatcher

This dataset covers three advanced F4SE and modding engineering topics: automated RVA discovery using IDA Pro Python scripting, Extended Dialogue Interface (EDI) dynamic dialogue layout control from Papyrus, and a thread-safe C++ background loop that dispatches live engine telemetry to the Papyrus VM.

---

## Phase 1: IDA Pro Python RVA Discovery Script

This Python script runs inside IDA Pro (7.x / 8.x / 9.x) to locate target engine functions by scanning for distinct byte patterns (signatures). It prints the Relative Virtual Address (RVA) that goes directly into `RelocPtr<T>` in your F4SE plugin.

```python
import idc
import idautils

def find_engine_rva(pattern_string, name="TargetFunction"):
    # Convert space-separated hex string into IDA internal search format.
    # Use '?' as a wildcard for bytes that vary between builds.
    # Example: "48 89 5C 24 ? 57 48 83 EC 20 48 8B D9"
    ea = idc.find_binary(0, idc.SEARCH_DOWN, pattern_string)

    if ea != idc.BADADDR:
        base_addr = idc.get_imagebase()
        rva = ea - base_addr
        print(f"[{name}] Found pattern at absolute address: 0x{ea:X}")
        print(f"[{name}] Relative Virtual Address (RVA) for F4SE: 0x{rva:X}")
        return rva
    else:
        print(f"[{name}] Error: Pattern not found in binary.")
        return None

# Execute lookup scan
find_engine_rva("48 89 5C 24 ? 57 48 83 EC 20 48 8B D9", "SomeEngineFunction")
```

**Key points:**
- `idc.find_binary(0, idc.SEARCH_DOWN, pattern)` scans from the start of the loaded image downward for the first match.
- Wildcard bytes (`?`) are critical for stability — bytes that encode absolute addresses or immediate values change between patches, but the surrounding instruction opcode bytes remain stable.
- `idc.get_imagebase()` returns the base address IDA loaded the binary at. Subtracting this from the match address gives the RVA that is version-stable across ASLR restarts.
- Run this script via **File → Script File** or paste into the **IDC/Python** console. Re-run against each new game binary after a patch to verify the RVA is still valid.
- If the pattern returns `BADADDR`, the function was inlined, moved, or the opcode sequence changed — you need a wider or different signature. Use the IDA **Bytes** view to find an alternative unique byte sequence near the target function prologue.

---

## Phase 2: Extended Dialogue Interface (EDI) Script Configuration

This configuration binds the dynamic C++ data layers to custom expanded dialogue layouts using the Extended Dialogue Interface, overriding the vanilla 4-choice dialogue cap.

### Papyrus EDI Manifest (HEW_EDIDialogueController.psc)

```papyrus
Scriptname HEW_EDIDialogueController extends Quest

; Import the Extended Dialogue Interface API namespace
import ExtendedDialogueInterface

Event OnInit()
    RegisterForEDIEvent()
EndEvent

Function RegisterForEDIEvent()
    ; Initialize the framework hooks
    EDI_API:GetAPI().RegisterCustomDialogueHandler(Self)
EndFunction

; Triggered by EDI when a custom multi-choice prompt is drawn on screen
Event OnCustomDialogueRequest(ObjectReference akSpeaker, Int aiDialogueNodeId)
    If aiDialogueNodeId == 999 ; Our custom assigned layout block ID
        String[] options = new String[6]
        options[0] = "Inquire Engine Telemetry"
        options[1] = "Force Memory Optimization"
        options[2] = "Read Live Timescale"
        options[3] = "Toggle Core Threads"
        options[4] = "Inject Custom Packet"
        options[5] = "Exit Interface"

        ; Override the vanilla 4-choice hard limit with our 6-button matrix
        EDI_API:GetAPI().DisplayExtendedOptions(akSpeaker, options)
    EndIf
EndEvent
```

**Key points:**
- `import ExtendedDialogueInterface` pulls in the EDI API namespace. EDI must be installed and its Papyrus source scripts must be present in `Data/Scripts/Source/` for the compiler to resolve these calls.
- `RegisterCustomDialogueHandler(Self)` registers this Quest script instance as the handler for EDI-routed dialogue requests. Call this from `OnInit` so registration happens when the quest starts.
- `aiDialogueNodeId` is the layout block ID you define in the EDI XML configuration file. The value `999` is an example — choose a unique ID that does not collide with vanilla or other mods.
- `DisplayExtendedOptions` accepts a `String[]` of any size, bypassing the vanilla 4-choice engine limit. The XML layout file controls button positions and scroll behavior for arrays larger than 4.
- Button selection responses flow back through a separate EDI callback event (not shown here) where `aiSelectedIndex` indicates which option the player chose.

---

## Phase 3: Thread-Safe Memory Loop and Telemetry Dispatcher

F4SE plugins execute across multiple engine worker threads. A background loop that continuously reads engine memory and pushes telemetry to Papyrus requires C++ thread containment and mutex safeguards to avoid crashes from concurrent memory access.

### C++ Thread Implementation (telemetry.cpp)

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/PapyrusVM.h"
#include "f4se/PapyrusInterfaces.h"
#include "f4se_common/Relocation.h"
#include <thread>
#include <mutex>
#include <atomic>

#define TARGET_TELEMETRY_RVA 0x011D32A0

std::thread        g_workerThread;
std::atomic<bool>  g_keepRunning(false);
std::mutex         g_dataMutex;
float              g_lastLoggedTelemetryValue = 0.0f;

void TelemetryLoopInstance() {
    RelocPtr<float> engineDataTarget(TARGET_TELEMETRY_RVA);

    while (g_keepRunning.load()) {
        {
            std::lock_guard<std::mutex> lock(g_dataMutex);
            if (engineDataTarget.GetPtr()) {
                g_lastLoggedTelemetryValue = *engineDataTarget;
            }
        }

        F4SETaskInterface* taskAPI = (F4SETaskInterface*)F4SEInterface::QueryInterface(kInterface_Task);
        if (taskAPI) {
            taskAPI->AddTask([]() {
                VirtualMachine* vm = (*g_gameVM)->m_virtualMachine;
                if (vm) {
                    // Fire custom Papyrus event carrying g_lastLoggedTelemetryValue
                    // from inside the safe main game loop context
                }
            });
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
}

void StartTelemetrySystem() {
    if (!g_keepRunning.load()) {
        g_keepRunning.store(true);
        g_workerThread = std::thread(TelemetryLoopInstance);
        _MESSAGE("Background engine telemetry thread spawned.");
    }
}

void StopTelemetrySystem() {
    g_keepRunning.store(false);
    if (g_workerThread.joinable()) {
        g_workerThread.join();
        _MESSAGE("Background thread successfully closed down.");
    }
}
```

**Key points:**
- `std::atomic<bool> g_keepRunning` provides a lock-free stop signal the main thread can set without a mutex. Always use `.load()` and `.store()` for atomic reads and writes.
- `std::lock_guard<std::mutex>` creates an RAII-scoped lock around the memory read. This prevents the main thread from reading `g_lastLoggedTelemetryValue` while the worker thread is writing it.
- **Never call Papyrus VM functions directly from a background thread.** The VM is not thread-safe. Use `taskAPI->AddTask(lambda)` to queue the Papyrus dispatch onto the main game thread, where it executes safely on the next engine tick.
- `StopTelemetrySystem()` must be called from `F4SEPlugin_Load`'s cleanup path or a registered shutdown hook before the DLL unloads. Failing to join the thread before unload causes a crash during game exit.
- The 500ms poll interval is a tuning value — too short increases CPU overhead, too long makes telemetry stale. Adjust based on how frequently the target engine value changes.

---

## Troubleshooting Focus

- **IDA pattern returns BADADDR (Phase 1)**: The byte sequence changed in this patch. Use IDA's **Search → Sequence of bytes** on a known function address to find a new unique prologue signature. Add more wildcard bytes around address-dependent immediates.
- **EDI options not displaying (Phase 2)**: Verify EDI is loaded before your mod in the load order and that the `RegisterCustomDialogueHandler` call fires before the dialogue node is reached. Check the EDI log file for registration errors.
- **EDI node ID collision (Phase 2)**: If another mod uses the same `aiDialogueNodeId`, your handler and theirs will both fire. Use a high unique ID value in a range you own, documented in your mod's configuration.
- **Crash on game exit (Phase 3)**: The worker thread was still running when the DLL unloaded. Ensure `StopTelemetrySystem()` is called and `g_workerThread.join()` completes before the plugin cleanup path returns.
- **Papyrus events not firing from AddTask (Phase 3)**: Verify `g_gameVM` is valid and the `VirtualMachine*` pointer is non-null inside the task lambda. These pointers are only valid after the game world finishes loading.
