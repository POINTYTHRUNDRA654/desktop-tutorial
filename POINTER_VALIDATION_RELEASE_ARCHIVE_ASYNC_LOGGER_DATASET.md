# Pointer Validation, Release Archive Deployment, and Async Telemetry Logger

This dataset covers three production-readiness topics for F4SE plugin development: safe memory pointer validation using VirtualQuery and structured exception handling to prevent crashes, the correct mod archive folder structure for deployment via Vortex or Mod Organizer 2, and a high-performance batch-buffered async telemetry logger that protects frame pacing.

---

## Phase 1: Address Pointer Validation & Crash Prevention

Writing to engine memory without first validating the page state causes instant crashes when a game update shifts code offsets. This validation sequence checks page commit status, access flags, and wraps the write in a hardware exception handler.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se_common/Relocation.h"
#include <windows.h>

bool IsPointerSafeToModify(void* ptr, size_t size) {
    if (!ptr) return false;

    MEMORY_BASIC_INFORMATION mbi;
    if (VirtualQuery(ptr, &mbi, sizeof(mbi)) == 0) {
        return false;
    }

    // Page must be committed (not reserved or free)
    if (mbi.State != MEM_COMMIT) return false;

    // Page must not be guarded or inaccessible
    if (mbi.Protect & (PAGE_GUARD | PAGE_NOACCESS)) return false;

    // Page must have a writable protection flag
    DWORD writeProtectMask = PAGE_READWRITE | PAGE_WRITECOPY
                           | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY;
    if (!(mbi.Protect & writeProtectMask)) {
        return false;
    }

    return true;
}

bool SafelyWriteFloat(uintptr_t targetRVA, float newValue) {
    uintptr_t baseAddress = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    float* targetPtr = reinterpret_cast<float*>(baseAddress + targetRVA);

    if (!IsPointerSafeToModify(targetPtr, sizeof(float))) {
        _ERROR("Crash Prevention: Memory address 0x%p is unsafe for modification!", targetPtr);
        return false;
    }

    __try {
        *targetPtr = newValue;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        _ERROR("Crash Prevention: Critical hardware exception caught while writing memory.");
        return false;
    }
}
```

**Key points:**
- `VirtualQuery` fills a `MEMORY_BASIC_INFORMATION` struct describing the page containing `ptr`. It returns 0 on failure (invalid or unmapped address).
- `mbi.State != MEM_COMMIT` catches addresses in reserved or freed regions that would fault on any access.
- `PAGE_GUARD` pages are trap pages used by the OS stack growth mechanism — touching them raises an exception and must be avoided.
- The `writeProtectMask` check confirms at least one writable flag is active. If the page is read-only (e.g., `PAGE_EXECUTE_READ`), you must call `VirtualProtect` first to temporarily promote access.
- `__try / __except(EXCEPTION_EXECUTE_HANDLER)` is Windows Structured Exception Handling (SEH). It catches hardware faults (access violations, alignment faults) that C++ `try/catch` does not handle. Use it only around raw pointer dereferences, not general logic.
- `GetModuleHandle(NULL)` returns the base load address of `Fallout4.exe` at runtime, equivalent to what `idc.get_imagebase()` returned in IDA during analysis. Adding the RVA to this gives the live absolute address.

---

## Phase 2: Production-Ready Release Archive Deployment

Compile your assets into this exact folder structure before archiving. Mod managers (Vortex, Mod Organizer 2) install files relative to the `Data\` folder — the archive root maps directly to `Data\`.

```
HelloWorldMod_Release.zip/
├── F4SE/
│   └── Plugins/
│       ├── HelloWorldPlugin.dll          ← Compiled Release x64 DLL
│       └── HelloWorldPlugin.ini          ← Optional plugin settings file
├── Interface/
│   └── EDI/
│       └── ExtendedDialogueInterface.xml ← EDI choice menu layout
├── Scripts/
│   ├── HEW_TelemetryReceiver.pex         ← Compiled Papyrus runtime binary
│   └── HEW_EDIDialogueController.pex     ← Compiled Papyrus runtime binary
└── Source/
    └── Scripts/
        ├── HEW_TelemetryReceiver.psc     ← Source script for user reference
        └── HEW_EDIDialogueController.psc ← Source script for user reference
```

**Key points:**
- `F4SE/Plugins/` is the only location the F4SE loader scans for `.dll` plugin files. The DLL must be x64 Release — x86 or Debug builds will be rejected or ignored.
- `Scripts/` holds compiled `.pex` binaries. These are the only script files required at runtime; the `.psc` source files are optional but standard practice to include for community transparency.
- `Source/Scripts/` follows the Nexus Mods community convention for distributing script source. Place `.psc` files here so users and other modders can reference your implementation.
- `Interface/EDI/` must match this exact path for EDI's XML loader to discover and merge your layout file. Case sensitivity matters on some mod manager virtual filesystems.
- Never include the `Data\` prefix in your archive paths — mod managers prepend it during installation. An archive rooted at `Data\F4SE\...` installs one level too deep.
- The `.ini` file in `F4SE/Plugins/` is optional but recommended. Name it identically to the DLL (e.g., `HelloWorldPlugin.ini`) and use it for user-configurable settings read at `F4SEPlugin_Load` time.

---

## Phase 3: High-Performance C++ Async Telemetry Log Parser

This logger runs on the background worker thread. Instead of flushing every entry to disk individually (which causes micro-stutters via I/O pressure), it batches entries in a memory buffer and flushes to disk only when the batch threshold is reached.

```cpp
#include <fstream>
#include <string>
#include <vector>
#include <chrono>
#include <mutex>

class AsyncTelemetryLogger {
private:
    std::ofstream logFile;
    std::mutex logMutex;
    std::vector<std::string> logBuffer;
    const size_t flushThreshold = 10; // Flush after every 10 entries

public:
    void Initialize(const std::string& filePath) {
        std::lock_guard<std::mutex> lock(logMutex);
        logFile.open(filePath, std::ios::out | std::ios::app);
    }

    void LogEvent(const std::string& level, const std::string& message) {
        std::lock_guard<std::mutex> lock(logMutex);

        auto now = std::chrono::system_clock::now().time_since_epoch().count();
        std::string logLine = "[" + std::to_string(now) + "] [" + level + "] " + message;

        logBuffer.push_back(logLine);

        if (logBuffer.size() >= flushThreshold) {
            FlushBuffer();
        }
    }

    void FlushBuffer() {
        if (!logFile.is_open()) return;
        for (const auto& line : logBuffer) {
            logFile << line << "\n";
        }
        logFile.flush();
        logBuffer.clear();
    }

    ~AsyncTelemetryLogger() {
        std::lock_guard<std::mutex> lock(logMutex);
        FlushBuffer();
        if (logFile.is_open()) {
            logFile.close();
        }
    }
};

AsyncTelemetryLogger g_TelemetryLogger;
```

**Key points:**
- `std::lock_guard<std::mutex>` is held for the entire duration of `LogEvent` and `FlushBuffer`. This prevents concurrent writes from two threads interleaving partial log lines.
- `flushThreshold = 10` means disk I/O fires once per 10 log entries rather than once per entry. Tune this based on log frequency — high-frequency telemetry (e.g., every frame) should use a larger threshold (50–100).
- `std::ios::app` opens in append mode so log entries accumulate across game sessions rather than being overwritten on each launch.
- `logFile.flush()` after the batch write ensures the OS write buffer is committed to disk before clearing `logBuffer`. Without `flush()`, a crash before the next batch would lose the buffered entries.
- The destructor acquires the mutex and calls `FlushBuffer()` to drain any remaining buffered entries before the file closes. This is critical — if the game exits mid-buffer, all unwritten entries would be lost without the destructor flush.
- Call `g_TelemetryLogger.Initialize(...)` from `F4SEPlugin_Load` with a path inside `Documents\My Games\Fallout4\F4SE\` to keep log files co-located with the rest of the F4SE plugin logs.

---

## Troubleshooting Focus

- **`IsPointerSafeToModify` returns false for a known-good address (Phase 1)**: The page protection flags changed after a game update. Re-verify the RVA in IDA. If the page is `PAGE_EXECUTE_READ`, call `VirtualProtect` before the write and restore after — `IsPointerSafeToModify` checks current state, not potential write-promoted state.
- **SEH `__except` fires on write (Phase 1)**: The resolved address is invalid for the current game binary. The RVA is stale. Re-run your IDA pattern scan against the updated binary.
- **DLL not detected by F4SE loader (Phase 2)**: The archive was rooted at `Data\F4SE\Plugins\` instead of `F4SE\Plugins\` — one level too deep. Re-examine the archive structure and remove the `Data\` prefix.
- **`.pex` scripts not found at runtime (Phase 2)**: Scripts must be in `Scripts\` (singular), not `Data\Scripts\` inside the archive. Verify the path depth in your archive.
- **Log file missing entries after crash (Phase 3)**: The buffer was not flushed before the crash. Reduce `flushThreshold` to 1 during debugging to force per-entry disk writes, then increase it for production builds.
- **Log entries interleaved from two threads (Phase 3)**: `FlushBuffer()` is being called from outside the class without the mutex. Only call `FlushBuffer()` from within `LogEvent` or from the destructor where the lock is already held, or acquire the lock externally before calling.
