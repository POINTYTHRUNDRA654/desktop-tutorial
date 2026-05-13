# Live Inventory Array Traversal, Custom Crash-Dump Generator, and Web-to-Game Notification Routing

This dataset covers three advanced F4SE plugin topics: reading an actor's live inventory contents by traversing the `BGSInventoryList` structure and serialising it to JSON, registering a Windows unhandled-exception filter that generates a `MiniDump` file before the game crashes, and routing a text string typed into the external HTML dashboard through the Node.js relay to the game's native notification system using a task-thread dispatch.

---

## Phase 1: Reading Live Inventory Arrays from Memory

`BGSInventoryList` is the container structure attached to every `Actor` (and many other reference types) that tracks what items are held and in what quantities. Accessing it directly from C++ lets you build a full snapshot of the player's or any NPC's inventory without Papyrus scripting overhead.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/GameReferences.h"
#include "f4se/GameExtraData.h"
#include <string>

// Serialises the target actor's inventory to a compact JSON array.
// Call this from an AddTask lambda so it runs on the game thread.
std::string SerializeInventoryPayload(Actor* targetActor) {
    if (!targetActor) return "[]";

    BGSInventoryList* inventoryList = targetActor->inventoryList;
    if (!inventoryList) return "[]";

    std::string json = "[";
    bool firstItem = true;

    // Acquire the inventory lock before iterating.
    // BGSInventoryList::inventoryLock is a BSReadWriteLock — use Lock() for
    // exclusive write-safe read access; use LockRead() if your F4SE SDK exposes it.
    inventoryList->inventoryLock.Lock();

    for (UInt32 i = 0; i < inventoryList->items.count; i++) {
        BGSInventoryList::InventoryItem itemData;
        if (!inventoryList->items.GetNthItem(i, itemData)) continue;
        if (!itemData.form) continue;

        const char* name = itemData.form->GetFullName();
        if (!name) name = "";

        if (!firstItem) json += ",";
        firstItem = false;

        json += "{";
        json += "\"form_id\":"  + std::to_string(itemData.form->formID) + ",";
        json += "\"count\":"    + std::to_string(itemData.stackCount)   + ",";

        // Sanitise the name: strip embedded double-quotes to keep JSON valid
        std::string safeName(name);
        for (auto& c : safeName) if (c == '"') c = '\'';
        json += "\"name\":\"" + safeName + "\"";
        json += "}";
    }

    inventoryList->inventoryLock.Unlock();
    json += "]";
    return json;
}
```

**Dispatch from the game thread and send over TCP:**

```cpp
// Call from your telemetry worker, but route the actual read to the game thread
// via AddTask to avoid racing with the engine's own inventory modification code.
void BroadcastInventorySnapshot(F4SETaskInterface* taskInterface) {
    taskInterface->AddTask([=]() {
        PlayerCharacter* player = *g_player;
        if (!player) return;

        std::string payload = SerializeInventoryPayload(
            static_cast<Actor*>(player));
        // Pass to your TCP send function
        BroadcastTelemetryData(payload);
    });
}
```

**Key points:**
- `inventoryList->inventoryLock.Lock()` acquires the engine's own inventory mutex. Always pair every `Lock()` with an `Unlock()` — a missed unlock will deadlock the game the next time any engine code tries to access the same inventory. Consider wrapping in an RAII guard if your SDK provides one, or use a local `struct` with a destructor.
- `GetNthItem(i, itemData)` copies item data out of the internal `tArray` into your local struct. Check the return value; it returns `false` for out-of-range indices so the loop can exit early on a shrinking list.
- `itemData.form->GetFullName()` can return `nullptr` for forms without a name string (weapons with no FULL record, for example). Always null-check before passing to `std::string` construction.
- `stackCount` reflects the total count across all stack instances in the slot. If you need per-stack extra-data (enchantments, health, ammo type), iterate `itemData.stack` — each node is a `BGSInventoryList::InventoryStack*` and holds an `extraData` pointer.
- Call `SerializeInventoryPayload` only from the game's main thread (inside an `AddTask` lambda). The inventory lock is not sufficient protection if you also call engine functions on the item form (e.g., `GetFullName`) from a background thread — those functions are not thread-safe.
- For the player character, cast `(*g_player)` to `Actor*`. For NPCs, use `LookupFormByID` and `DYNAMIC_CAST` to `Actor*` before passing to this function.

---

## Phase 2: C++ Custom Mini Crash-Dump Generator

Registering a top-level unhandled exception filter lets your plugin intercept any crash — whether caused by your own code or a conflict with another mod — and write a `.dmp` file that can be opened in Visual Studio's debugger to inspect registers, the call stack, and heap state at the moment of the crash.

```cpp
#include <windows.h>
#include <dbghelp.h>
#include "f4se/PluginAPI.h"

#pragma comment(lib, "dbghelp.lib")

static LPTOP_LEVEL_EXCEPTION_FILTER s_previousFilter = nullptr;

LONG WINAPI InternalCrashDumpFilter(EXCEPTION_POINTERS* exceptionInfo) {
    _ERROR("[CrashDump] Unhandled exception caught — writing mini-dump...");

    // Build a timestamped filename so successive crashes don't overwrite each other
    char dumpPath[MAX_PATH];
    SYSTEMTIME st;
    GetLocalTime(&st);
    sprintf_s(dumpPath, sizeof(dumpPath),
        "Data\\F4SE\\Plugins\\HEW_CrashDump_%04d%02d%02d_%02d%02d%02d.dmp",
        st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond);

    HANDLE hFile = CreateFileA(
        dumpPath,
        GENERIC_WRITE, 0, nullptr,
        CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr
    );

    if (hFile != INVALID_HANDLE_VALUE) {
        MINIDUMP_EXCEPTION_INFORMATION mdei{};
        mdei.ThreadId          = GetCurrentThreadId();
        mdei.ExceptionPointers = exceptionInfo;
        mdei.ClientPointers    = FALSE;

        // MiniDumpWithIndirectlyReferencedMemory captures more heap context
        // than MiniDumpNormal and is still smaller than a full heap dump.
        MINIDUMP_TYPE dumpType = static_cast<MINIDUMP_TYPE>(
            MiniDumpWithIndirectlyReferencedMemory |
            MiniDumpWithThreadInfo                 |
            MiniDumpWithUnloadedModules
        );

        BOOL written = MiniDumpWriteDump(
            GetCurrentProcess(), GetCurrentProcessId(),
            hFile, dumpType, &mdei, nullptr, nullptr
        );

        CloseHandle(hFile);

        if (written) {
            _ERROR("[CrashDump] Dump written to: %s", dumpPath);
        } else {
            _ERROR("[CrashDump] MiniDumpWriteDump failed (error %lu).", GetLastError());
        }
    } else {
        _ERROR("[CrashDump] Failed to create dump file '%s' (error %lu).",
               dumpPath, GetLastError());
    }

    // Chain to the previous filter (e.g., x-cell or another crash logger)
    // so the game still exits cleanly and other handlers get a chance to run.
    if (s_previousFilter) {
        return s_previousFilter(exceptionInfo);
    }
    return EXCEPTION_CONTINUE_SEARCH;
}

void InitializeCrashDumpUtility() {
    // Save the existing filter so we can chain it on crash
    s_previousFilter = SetUnhandledExceptionFilter(InternalCrashDumpFilter);
    _MESSAGE("[CrashDump] Unhandled exception filter registered.");
}
```

**Call once during plugin load:**

```cpp
bool F4SEPlugin_Load(const F4SEInterface* f4se) {
    InitializeCrashDumpUtility();
    // ... rest of plugin init ...
    return true;
}
```

**Key points:**
- Timestamped filenames (`HEW_CrashDump_20260513_204532.dmp`) prevent later crashes from overwriting earlier dumps. When diagnosing a rare reproducer, check the oldest dump rather than the most recent one.
- `MiniDumpWithIndirectlyReferencedMemory` captures heap blocks referenced by stack variables and registers — this is far more useful than `MiniDumpNormal` for diagnosing null-pointer dereferences and use-after-free bugs. It increases dump size but remains manageable (typically 50–200 MB for a Fallout 4 session).
- `s_previousFilter` chains to whatever crash handler was already registered. Modern Fallout 4 modding relies on crash loggers (X-Cell, Buffout 4 NG) that register their own exception filters. If you replace their filter without chaining, you silently disable their reporting. Always save and call the previous filter.
- `MiniDumpWriteDump` calls `dbghelp.dll`. Link it with `#pragma comment(lib, "dbghelp.lib")` or add `dbghelp.lib` to **Project Properties → Linker → Input → Additional Dependencies**. The DLL ships with Windows and does not require redistribution.
- `Data\F4SE\Plugins\` must exist before `CreateFileA` is called. The directory is created by F4SE at game start so it is always present when the plugin loads, but add a `CreateDirectoryA` call if you want to write dumps to a custom subfolder.
- Do **not** allocate heap memory inside `InternalCrashDumpFilter`. The heap may be corrupt when the filter is called (e.g., after a heap-corruption exception). `sprintf_s` uses the stack, and `GetLocalTime` / `CreateFileA` use kernel resources — both are safe in this context.

---

## Phase 3: Web-to-Game In-Game Notification Routing

This system lets a developer or viewer type a message in the HTML dashboard, press a button, and see it appear as a native game notification (the same floating text used by quest updates and power armour alerts) without touching Papyrus.

### 3a. Dashboard Form Panel (index.html addition)

Add inside the existing `<div class="grid-container">` or an additional panel:

```html
<!-- Remote Notification Panel -->
<div class="panel">
    <div>Remote Notification:</div>
    <input type="text" id="alertText" maxlength="128"
           placeholder="Enter notification text..."
           style="width:100%; background:#111; color:#0f0; border:1px solid #0f0; padding:4px;">
    <br><br>
    <button onclick="SendRemoteNotification()"
            style="background:#1a1a1a; color:#0f0; border:1px solid #0f0; padding:6px 14px; cursor:pointer;">
        Broadcast Notification
    </button>
    <div id="notif-status" style="font-size:0.75em; margin-top:6px;"></div>
</div>

<script>
    function SendRemoteNotification() {
        const textValue = document.getElementById('alertText').value.trim();
        if (!textValue) return;

        const packet = {
            command: "INJECT_NOTIFICATION",
            message: textValue
        };

        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(packet));
            document.getElementById('notif-status').innerText =
                'Sent: "' + textValue + '"';
            document.getElementById('alertText').value = '';
        } else {
            document.getElementById('notif-status').innerText =
                'Error: WebSocket not connected.';
        }
    }

    // Allow pressing Enter in the text field to send
    document.getElementById('alertText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') SendRemoteNotification();
    });
</script>
```

### 3b. Node.js Relay — Route `INJECT_NOTIFICATION` Commands (server.js)

The relay already forwards WebSocket messages to the game TCP socket (see the Relay Bridge dataset). No relay changes are needed beyond the existing `ws.on('message', ...)` forwarding block — the C++ plugin parses the command discriminator on its end.

### 3c. C++ Notification Receiver (notifications.cpp)

```cpp
#include "f4se/PluginAPI.h"
#include <string>

// Signature for the engine's Debug.Notification implementation.
// Replace the RVA with the runtime-scanned value from FindPatternRVA()
// (see the Dynamic Signature Scanning dataset).
#define NATIVE_NOTIFICATION_RVA 0x012F4B30

typedef void (*_ShowNotification)(const char* text,
                                  const char* soundDescriptor,
                                  bool        bQueueText);
static _ShowNotification s_showNotification = nullptr;

static void EnsureNotificationResolved() {
    if (s_showNotification) return;
    uintptr_t base = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    s_showNotification = reinterpret_cast<_ShowNotification>(
        base + NATIVE_NOTIFICATION_RVA);
}

// Called from the TCP command parser when command == "INJECT_NOTIFICATION".
// The message string is captured by value so it is safe to pass across threads.
void RouteWebNotificationToGame(const std::string& messagePayload,
                                F4SETaskInterface* taskInterface) {
    if (!taskInterface) {
        _WARNING("[Notification] F4SETaskInterface is null — cannot dispatch.");
        return;
    }

    // Capture by value: the calling thread may destroy messagePayload
    // before the task executes.
    taskInterface->AddTask([messagePayload]() {
        EnsureNotificationResolved();
        if (!s_showNotification) {
            _ERROR("[Notification] Native function pointer not resolved.");
            return;
        }
        // nullptr sound descriptor uses the default notification sound.
        // true for bQueueText prevents simultaneous notifications from
        // overlapping — each one waits for the previous to dismiss.
        s_showNotification(messagePayload.c_str(), nullptr, true);
        _MESSAGE("[Notification] Displayed: \"%s\"", messagePayload.c_str());
    });
}

// ── TCP command dispatcher integration ──────────────────────────────────────
// Call this from inside your TCP data handler when a command packet arrives.
void DispatchIncomingCommand(const std::string& jsonPayload,
                             F4SETaskInterface* taskInterface) {
    // Check command discriminator before full JSON parse
    if (jsonPayload.find("\"INJECT_NOTIFICATION\"") != std::string::npos) {
        // Extract the "message" field value
        auto pos = jsonPayload.find("\"message\"");
        if (pos != std::string::npos) {
            pos = jsonPayload.find(':', pos) + 1;
            while (pos < jsonPayload.size() && (jsonPayload[pos] == ' ' ||
                   jsonPayload[pos] == '"')) ++pos;
            size_t end = jsonPayload.find('"', pos);
            if (end != std::string::npos) {
                std::string message = jsonPayload.substr(pos, end - pos);
                RouteWebNotificationToGame(message, taskInterface);
            }
        }
    }
}
```

**Key points:**
- `taskInterface->AddTask(lambda)` schedules the lambda to run on the game's main thread during the next frame tick. This is mandatory — `s_showNotification` calls engine UI code that is not thread-safe and will crash if called from the TCP background thread.
- Capture `messagePayload` **by value** (`[messagePayload]`) in the lambda, not by reference. The string lives on the TCP receive thread's stack; it will be destroyed before the task executes if captured by reference.
- `bQueueText = true` prevents concurrent notifications from stacking on top of each other. Set it to `false` only if you want interrupting behaviour (each new notification replaces the current one immediately).
- `soundDescriptor = nullptr` uses the default notification sound defined in the game's sound settings. Pass a `BSFixedString` form editor ID (e.g., `"UIHUDNotification"`) to use a specific sound — look up valid descriptor IDs in xEdit under the `SNDR` record type.
- The `NATIVE_NOTIFICATION_RVA` value `0x012F4B30` is an example — it must be verified for your specific game version with IDA Pro or replaced with a runtime scan result from `FindPatternRVA` (see the Dynamic Signature Scanning dataset). Never ship a mod with a hardcoded RVA without a version-check guard.
- Sanitise `messagePayload` before passing it to `s_showNotification`. A very long string or one containing control characters can overflow the engine's notification text buffer. Clamp length to 128 characters and strip non-printable bytes on the C++ side even if the HTML input has a `maxlength` attribute (the attribute is a client-side hint only).

---

## Troubleshooting Focus

- **`inventoryList` is null even though the actor is valid (Phase 1)**: Some actor subtypes (creatures, robots without inventory) have a null `inventoryList`. Add a null check before the lock and return `"[]"` immediately. Also check that you are calling from the game thread inside `AddTask` — accessing `inventoryList` from a background thread without the lock held is undefined behaviour and can return a stale pointer.
- **Crash inside `SerializeInventoryPayload` with access violation (Phase 1)**: `itemData.form->GetFullName()` is dereferencing a freed or partially-initialised form. Add `if (!itemData.form->formID) continue;` to skip placeholder entries. If the crash persists, confirm the lock is held and the function is executing on the game thread.
- **Dump file is created but empty (0 bytes) (Phase 2)**: `MiniDumpWriteDump` failed silently. Log `GetLastError()` after the call — common causes are insufficient disk space, `Data\F4SE\Plugins\` not existing at the time of the crash, or the path containing Unicode characters that `CreateFileA` cannot handle. Switch to `CreateFileW` with a wide-string path if the game is installed in a non-ASCII directory.
- **Crash logger (X-Cell, Buffout 4 NG) stops producing logs after installing the plugin (Phase 2)**: The previous filter (`s_previousFilter`) is not being called. Confirm `InternalCrashDumpFilter` returns `s_previousFilter(exceptionInfo)` when `s_previousFilter` is non-null rather than returning `EXCEPTION_CONTINUE_SEARCH` directly.
- **Notification text appears blank in-game (Phase 3)**: The JSON field extraction found the wrong quote boundary. Log the raw `messagePayload` string before passing it to the task to verify extraction is correct. For production use, replace the manual substring extraction with a lightweight JSON library.
- **Notification fires multiple times from a single button click (Phase 3)**: The dashboard `click` event is firing and the `keydown` Enter handler is also firing on the same keystroke. Add `e.preventDefault()` inside the `keydown` handler to suppress the synthetic click that some browsers generate when Enter is pressed on a focused button.
- **`s_showNotification` resolves to a non-null pointer but calling it crashes immediately (Phase 3)**: The RVA is wrong for the running game version. Use the dynamic signature scanner to resolve the address at runtime instead of the hardcoded constant, and add the pre-hook prologue validation check (see the Dynamic Signature Scanning dataset Phase 3) before the first call.
