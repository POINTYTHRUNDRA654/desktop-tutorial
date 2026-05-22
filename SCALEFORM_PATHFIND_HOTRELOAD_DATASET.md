# Scaleform AS3 Widget Injection, Remote Click-to-Pathfind, and INI Hot-Reload

This dataset covers three advanced F4SE integration topics: compiling a custom ActionScript 3 widget into the Pip-Boy's Scaleform movie and driving it from C++ via the GFx external interface, routing canvas click coordinates from the HTML telemetry dashboard back through the Node.js relay to force an actor to pathfind to a world position, and running a background `ReadDirectoryChangesW` watcher that re-parses an INI file whenever it is saved so plugin settings update without restarting the game.

---

## Phase 1: Scaleform ActionScript 3 Telemetry Widget Injection

The Pip-Boy and all HUD elements in Fallout 4 are rendered by the Scaleform GFx runtime — a Flash-compatible engine that executes compiled ActionScript 3 bytecode inside `.swf` files. F4SE exposes a `GFxMovieView` interface that lets C++ code invoke AS3 functions and read AS3 values in the live movie, enabling custom widgets driven by real engine data.

### 1a. ActionScript 3 Source (TelemetryWidget.as)

Compile this file with Adobe Animate (formerly Flash Professional) or the open-source `mxmlc` compiler targeting Flash Player 11.x / AIR 3.x:

```bash
mxmlc -target-player=11.1 -output TelemetryWidget.swf TelemetryWidget.as
```

```actionscript
package {
    import flash.display.MovieClip;
    import flash.external.ExternalInterface;
    import flash.text.TextField;

    public class TelemetryWidget extends MovieClip {
        public var statusTextField:TextField;

        public function TelemetryWidget() {
            // Register a named callback so C++ can call this function
            // via GFxMovieView::Invoke on "_root"
            ExternalInterface.addCallback("UpdateWidgetData", updateDisplayValue);
            statusTextField.text = "SYS_INIT_ONLINE";
        }

        public function updateDisplayValue(newValue:Number):void {
            // Refresh the text field with the live telemetry float
            statusTextField.text = "LIVE_TS: " + newValue.toFixed(4);
        }
    }
}
```

**Scaleform placement:** Package `TelemetryWidget.swf` inside your mod's `Interface\` folder (e.g., `Interface\TelemetryWidget.swf`). Register it with F4SE's Scaleform API in your plugin so the engine loads it as an overlay or Pip-Boy sub-movie.

### 1b. C++ Scaleform View Update (scaleform.cpp)

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/ScaleformMovie.h"
#include "f4se/ScaleformValue.h"

// Call this from inside the F4SE Scaleform callback registered via
// ScaleformInterface::Register(). pipboyView is the GFxMovieView* provided
// by the engine when the Pip-Boy movie is opened.
void PushTelemetryToScaleformWidget(GFxMovieView* pipboyView, float currentTelemetry) {
    if (!pipboyView) return;

    GFxValue root;
    // Retrieve _root — the top-level stage object of the loaded .swf
    if (!pipboyView->GetVariable(&root, "_root")) {
        _WARNING("[Scaleform] Failed to acquire _root from Pip-Boy movie view.");
        return;
    }

    GFxValue args[1];
    args[0].SetNumber(static_cast<double>(currentTelemetry));

    // Invoke the AS3 callback registered via ExternalInterface.addCallback()
    root.Invoke("UpdateWidgetData", nullptr, args, 1);
}
```

**Register the Scaleform callback with F4SE:**

```cpp
// Called by F4SE when the Pip-Boy movie is opened.
// Register via scaleformInterface->Register("TelemetryWidget", OnScaleformLoad).
bool OnScaleformLoad(GFxMovieView* view, GFxValue* root) {
    // Load and attach the widget .swf as a child clip on _root
    GFxValue loadMovieArgs[2];
    loadMovieArgs[0].SetString("Interface/TelemetryWidget.swf");
    loadMovieArgs[1].SetString("telemetryWidget");
    root->Invoke("loadMovie", nullptr, loadMovieArgs, 2);

    _MESSAGE("[Scaleform] TelemetryWidget loaded into Pip-Boy movie.");
    return true;
}
```

**Key points:**
- `ExternalInterface.addCallback(name, function)` registers `function` as a named entry point that C++ can invoke through `GFxValue::Invoke`. The name string must match exactly — it is case-sensitive and is not prefixed with `_root.` when passed to `Invoke`.
- `root.Invoke("UpdateWidgetData", nullptr, args, 1)` calls the callback on `_root`. If the widget is loaded as a child clip named `"telemetryWidget"`, call `pipboyView->GetVariable(&widget, "_root.telemetryWidget")` first and invoke on the widget `GFxValue` instead.
- `GFxValue::SetNumber` takes a `double`. Cast your `float` telemetry value with `static_cast<double>` to avoid narrowing-conversion warnings.
- The Scaleform callback registered via `ScaleformInterface::Register` fires each time the named movie is opened. Store the `GFxMovieView*` in a global guarded by a null check — it is only valid while the movie is open. Do not cache the pointer across movie close/open cycles; request it fresh each time the callback fires.
- `loadMovie` is a Scaleform-era ActionScript method not available in pure AS3 targets. In AS3-only projects, use `Loader` instead of `loadMovie`. Cross-check with the F4SE Scaleform documentation for the target API version.
- Keep widget AS3 light: Scaleform runs on the game thread. Heavy per-frame logic inside AS3 will stutter gameplay. Push data in from C++ at a controlled rate (e.g., 500 ms via the telemetry worker thread) rather than polling from AS3 with an `EnterFrame` listener.

---

## Phase 2: Remote Dashboard Click-to-Pathfind Command System

This extends the existing dashboard and relay architecture (see the Relay Bridge dataset) with a bidirectional command channel. Clicking on the canvas sends a pathfind command back through the WebSocket relay to the C++ plugin, which translates the world coordinates and calls the engine's native `Actor::PathToPoint` function.

### 2a. Web Dashboard Click Handler (index.html addition)

Add this block inside the existing `<script>` section, after the WebSocket and canvas are defined:

```javascript
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();

    // CSS display size may differ from canvas bitmap size — normalise to bitmap coords
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;

    const bitmapX = (event.clientX - rect.left) * scaleX;
    const bitmapY = (event.clientY - rect.top)  * scaleY;

    // Invert the coordinate mapping used when plotting player position:
    //   screenX = (worldX / 200) + (canvas.width  / 2)  ->  worldX = (screenX - canvas.width/2)  * 200
    //   screenY = (canvas.height / 2) - (worldY / 200)  ->  worldY = (canvas.height/2 - screenY) * 200
    const targetWorldX = (bitmapX - canvas.width  / 2) * 200;
    const targetWorldY = (canvas.height / 2 - bitmapY) * 200;

    const commandPacket = {
        command: "NAVIGATE_ACTOR",
        x: targetWorldX,
        y: targetWorldY
    };

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(commandPacket));
        console.log(`[Navigate] Sent NAVIGATE_ACTOR to (${targetWorldX.toFixed(0)}, ${targetWorldY.toFixed(0)})`);
    }
});
```

### 2b. Node.js Relay — Route Inbound Commands (server.js addition)

The relay already forwards TCP data from the game to the dashboard. Add the reverse path: incoming WebSocket messages from the dashboard are forwarded to the game via a second TCP connection or a shared socket reference.

```javascript
// Track the active game (F4SE plugin) TCP socket
let activeGameSocket = null;

const tcpServer = net.createServer((socket) => {
    activeGameSocket = socket;
    console.log('[Game Plugin] F4SE engine connected.');

    socket.on('data',  (data) => { /* ... existing data forwarding ... */ });
    socket.on('end',   () => { activeGameSocket = null; });
    socket.on('error', (err) => { console.error('[TCP Error]', err.message); });
});

// Forward dashboard commands to the game
wss.on('connection', (ws) => {
    activeWebsocket = ws;
    ws.on('message', (msg) => {
        // Any message from the dashboard is forwarded to the game as a command
        if (activeGameSocket && !activeGameSocket.destroyed) {
            activeGameSocket.write(msg + '\n');
            console.log('[Command] Forwarded to game:', msg.toString());
        }
    });
    ws.on('close', () => { activeWebsocket = null; });
});
```

### 2c. C++ Command Parser and Pathfinder (pathfinder.cpp)

The C++ plugin reads the `NAVIGATE_ACTOR` JSON command from the TCP socket and calls the engine's `Actor::PathToPoint`:

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/GameReferences.h"
#include "f4se_common/Relocation.h"
#include <string>

// Signature for Actor::PathToPoint — discover the correct RVA for your game version
// using dynamic signature scanning (see the Dynamic Signature Scanning dataset).
#define ACTOR_PATH_TO_POINT_RVA 0x00E2B510

typedef bool (*_PathToPoint)(Actor* actor, NiPoint3* dest, float speedMult);
static _PathToPoint s_pathToPoint = nullptr;

static void EnsurePathToPointResolved() {
    if (s_pathToPoint) return;
    uintptr_t base = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    s_pathToPoint  = reinterpret_cast<_PathToPoint>(base + ACTOR_PATH_TO_POINT_RVA);
}

// ParseFloat helper — avoids linking <stdlib.h> directly in tight plugin code
static float SafeParseFloat(const std::string& s) {
    try { return std::stof(s); } catch (...) { return 0.0f; }
}

// Minimal JSON field extractor for "x":value and "y":value pairs.
// For production use, prefer a lightweight JSON library (nlohmann/json header-only).
static bool ExtractXY(const std::string& json, float& outX, float& outY) {
    auto extract = [&](const char* key) -> float {
        auto pos = json.find(key);
        if (pos == std::string::npos) return 0.0f;
        pos = json.find(':', pos) + 1;
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) ++pos;
        size_t end = pos;
        while (end < json.size() && (std::isdigit(json[end]) || json[end] == '-'
                                     || json[end] == '.' || json[end] == 'e'
                                     || json[end] == 'E' || json[end] == '+')) ++end;
        return SafeParseFloat(json.substr(pos, end - pos));
    };

    outX = extract("\"x\"");
    outY = extract("\"y\"");
    return true;
}

// Called from the TCP receive handler when a "NAVIGATE_ACTOR" command arrives.
// actorFormID is the FormID of the actor to move (use the player's FormID 0x14 for
// the player character, or a tracked NPC FormID for companion routing).
void HandleNavigateActorCommand(const std::string& jsonPayload, UInt32 actorFormID) {
    float targetX = 0.0f, targetY = 0.0f;
    if (!ExtractXY(jsonPayload, targetX, targetY)) {
        _WARNING("[Pathfind] Failed to parse coordinates from command.");
        return;
    }

    TESForm* form = LookupFormByID(actorFormID);
    Actor*   actor = DYNAMIC_CAST(form, TESForm, Actor);
    if (!actor) {
        _WARNING("[Pathfind] Actor FormID 0x%08X not found or not an Actor.", actorFormID);
        return;
    }

    EnsurePathToPointResolved();
    if (!s_pathToPoint) {
        _ERROR("[Pathfind] PathToPoint function pointer not resolved.");
        return;
    }

    // Preserve the actor's current Z so pathfinding uses the ground plane
    NiPoint3 destination = { targetX, targetY, actor->pos.z };
    bool     success     = s_pathToPoint(actor, &destination, 1.0f);

    _MESSAGE("[Pathfind] PathToPoint(%08X -> %.1f, %.1f) returned %s",
             actorFormID, targetX, targetY, success ? "true" : "false");
}
```

**Key points:**
- The canvas-to-world coordinate inversion must exactly match the world-to-canvas formula used when plotting the player position. If `screenX = (worldX / scale) + (width / 2)`, then `worldX = (screenX - width / 2) * scale`. Getting this wrong sends the actor to the mirrored or offset position.
- `canvas.getBoundingClientRect()` returns CSS pixel coordinates. When the canvas element is scaled by CSS (e.g., `width: 100%`), the click position in CSS pixels does not equal the bitmap position. The `scaleX / scaleY` correction factors above map CSS pixels to canvas bitmap pixels before the world-coordinate inversion.
- `LookupFormByID` is safe to call from an `AddTask` lambda on the main game thread. Never call it from a background thread — the form cache is not thread-safe. Receive the TCP command on the background socket thread, extract the coordinates, then queue `HandleNavigateActorCommand` via `F4SETaskInterface::AddTask`.
- `DYNAMIC_CAST(form, TESForm, Actor)` returns `nullptr` if the form is not an `Actor` subclass (e.g., if the FormID points to a container, weapon, or static object). Always null-check the result.
- The `ACTOR_PATH_TO_POINT_RVA` address must be verified for your game version using the dynamic signature scanner (Phase 1 of the Dynamic Signature Scanning dataset). Replace it with a runtime-resolved address from `ResolveAddress("PathToPoint", "<pattern>")` before shipping.

---

## Phase 3: Runtime INI Hot-Reload Watcher

`ReadDirectoryChangesW` is a Win32 API that blocks until one or more files in a watched directory change. Running it on a background thread lets the plugin detect when the user edits and saves its `.ini` file and immediately re-parse the new values — port numbers, loop intervals, toggle flags — without requiring a game restart.

```cpp
#include "f4se/PluginAPI.h"
#include <windows.h>
#include <string>
#include <thread>
#include <atomic>
#include <functional>

// ---- Config struct updated on reload ----
struct PluginConfig {
    int   tcpPort       = 8080;
    int   pollIntervalMs = 500;
    bool  enableLogging  = true;
};
PluginConfig g_config;

// ---- INI parser ----
static void ReloadConfig(const std::string& iniPath) {
    char buf[64];

    g_config.tcpPort = static_cast<int>(
        GetPrivateProfileIntA("Settings", "TCPPort", 8080, iniPath.c_str()));

    g_config.pollIntervalMs = static_cast<int>(
        GetPrivateProfileIntA("Settings", "PollIntervalMs", 500, iniPath.c_str()));

    GetPrivateProfileStringA("Settings", "EnableLogging", "1",
                              buf, sizeof(buf), iniPath.c_str());
    g_config.enableLogging = (buf[0] == '1');

    _MESSAGE("[HotReload] Config reloaded — TCPPort=%d  PollIntervalMs=%d  EnableLogging=%d",
             g_config.tcpPort, g_config.pollIntervalMs, g_config.enableLogging ? 1 : 0);
}

// ---- Watcher thread ----
static std::atomic<bool> g_watcherRunning{ false };
static std::thread       g_watcherThread;

static void WatcherLoop(const std::string& watchDir, const std::string& iniPath) {
    HANDLE hDir = CreateFileA(
        watchDir.c_str(),
        FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        nullptr,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        nullptr
    );

    if (hDir == INVALID_HANDLE_VALUE) {
        _ERROR("[HotReload] Failed to open watch directory '%s' (error %lu).",
               watchDir.c_str(), GetLastError());
        return;
    }

    // Use an OVERLAPPED structure so the blocking wait can be interrupted on shutdown
    OVERLAPPED overlapped{};
    overlapped.hEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);

    alignas(DWORD) char notifyBuffer[2048];

    while (g_watcherRunning.load()) {
        DWORD bytesReturned = 0;
        ResetEvent(overlapped.hEvent);

        BOOL ok = ReadDirectoryChangesW(
            hDir,
            notifyBuffer, sizeof(notifyBuffer),
            FALSE,                          // do not recurse into subdirectories
            FILE_NOTIFY_CHANGE_LAST_WRITE,  // only fire on file-write completion
            &bytesReturned,
            &overlapped,
            nullptr                         // no completion routine — use event
        );

        if (!ok) {
            _ERROR("[HotReload] ReadDirectoryChangesW failed (error %lu).", GetLastError());
            break;
        }

        // Wait up to 250 ms so the loop checks g_watcherRunning frequently
        DWORD waitResult = WaitForSingleObject(overlapped.hEvent, 250);

        if (waitResult == WAIT_OBJECT_0) {
            // A file in the directory was modified — check if it is our INI
            auto* info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(notifyBuffer);
            do {
                // FileName is a WCHAR array (not null-terminated); convert for comparison
                std::wstring changedW(info->FileName, info->FileNameLength / sizeof(WCHAR));

                // Extract just the filename part of iniPath for comparison
                size_t lastSlash = iniPath.find_last_of("\\/");
                std::string iniName = (lastSlash == std::string::npos)
                                      ? iniPath
                                      : iniPath.substr(lastSlash + 1);
                std::wstring iniNameW(iniName.begin(), iniName.end());

                if (changedW == iniNameW) {
                    _MESSAGE("[HotReload] Detected change in '%s' — reloading config.", iniPath.c_str());
                    // Small delay: editors often write in two passes (truncate then write)
                    Sleep(50);
                    ReloadConfig(iniPath);
                }

                if (!info->NextEntryOffset) break;
                info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(
                    reinterpret_cast<uint8_t*>(info) + info->NextEntryOffset);
            } while (true);
        }
        // WAIT_TIMEOUT: loop back and re-issue ReadDirectoryChangesW
    }

    CloseHandle(overlapped.hEvent);
    CloseHandle(hDir);
}

// ---- Public API ----
void StartHotReloadWatcher(const std::string& iniPath) {
    if (g_watcherRunning.load()) return;

    // Perform an initial config load before starting the watcher
    ReloadConfig(iniPath);

    size_t lastSlash = iniPath.find_last_of("\\/");
    std::string watchDir = (lastSlash == std::string::npos) ? "." : iniPath.substr(0, lastSlash);

    g_watcherRunning.store(true);
    g_watcherThread = std::thread(WatcherLoop, watchDir, iniPath);
    _MESSAGE("[HotReload] File watcher started for directory: %s", watchDir.c_str());
}

void StopHotReloadWatcher() {
    g_watcherRunning.store(false);
    if (g_watcherThread.joinable()) g_watcherThread.join();
    _MESSAGE("[HotReload] File watcher stopped.");
}
```

**Call from your plugin entry points:**

```cpp
// F4SEPlugin_Load
StartHotReloadWatcher("Data\\F4SE\\Plugins\\MyPlugin.ini");

// DLL detach / game shutdown via F4SE messaging kMessage_PreLoadGame or kMessage_NewGame
StopHotReloadWatcher();
```

**Key points:**
- `FILE_FLAG_BACKUP_SEMANTICS` is required when opening a directory handle with `CreateFileA`. Without it, `CreateFileA` fails with `ERROR_ACCESS_DENIED` even with sufficient user privileges.
- Using `OVERLAPPED` with an event object (`WaitForSingleObject`) instead of a plain synchronous `ReadDirectoryChangesW` call allows the loop to check `g_watcherRunning` on a 250 ms timeout. A purely synchronous call would block indefinitely and `g_watcherThread.join()` would hang on shutdown.
- `FILE_NOTIFY_CHANGE_LAST_WRITE` fires when a file's write timestamp changes. Most text editors (Notepad, VS Code, Sublime Text) write the new content and then update the timestamp, so this flag reliably catches INI saves. Avoid `FILE_NOTIFY_CHANGE_ATTRIBUTES` or `FILE_NOTIFY_CHANGE_SIZE` unless you also need to detect renames or permission changes.
- The 50 ms `Sleep` after detecting a change is a write-completion guard. Many editors write a file in two phases: they first truncate it to zero bytes, then write the new content. Reading the INI immediately after the truncation phase yields an empty file. The small delay ensures the write is complete before `ReloadConfig` runs.
- `GetPrivateProfileIntA` and `GetPrivateProfileStringA` are Win32 INI readers built into Windows. They require a fully-qualified absolute path for the `.ini` file — relative paths are resolved from the current working directory, which may not be the game folder when F4SE launches. Prepend the game root path using `GetModuleFileNameA(NULL, ...)` and string manipulation if you need reliable relative-to-game-folder resolution.
- Apply new config values atomically where possible. If your telemetry thread reads `g_config.pollIntervalMs`, protect writes to `g_config` with a `std::mutex` or use `std::atomic` fields to avoid torn reads when the watcher thread updates and the telemetry thread reads simultaneously.

---

## Troubleshooting Focus

- **`ExternalInterface.addCallback` callbacks never fire from C++ (Phase 1)**: The AS3 callback was registered on a `MovieClip` instance that has been garbage-collected. Store the `TelemetryWidget` instance on `_root` (e.g., `_root.widget = new TelemetryWidget()`) to root it against GC, then invoke on `_root.widget`.
- **`GetVariable(&root, "_root")` returns false (Phase 1)**: The `GFxMovieView*` provided to the Scaleform callback has not finished initialising its AS3 stage. Add a frame-delay: register an `AddTask` that calls `PushTelemetryToScaleformWidget` one frame later, or listen for the Pip-Boy open event before pushing data.
- **Canvas click sends wrong world coordinates (Phase 2)**: The CSS scale correction factors (`scaleX`, `scaleY`) were not applied, or the coordinate inversion formula does not match the plotting formula. Log `bitmapX`, `bitmapY`, `targetWorldX`, `targetWorldY` to the browser console and compare against the player position values shown on the dashboard to verify the round-trip.
- **Commands received by Node.js relay but not reaching the C++ plugin (Phase 2)**: The `activeGameSocket` reference is `null` at command dispatch time — either the game is not connected, or the TCP socket's `end` handler cleared the reference before the command arrived. Add a reconnection retry on the C++ TCP client side so `activeGameSocket` is repopulated after a disconnect.
- **`CreateFileA` returns `INVALID_HANDLE_VALUE` with `ERROR_ACCESS_DENIED` (Phase 3)**: The `FILE_FLAG_BACKUP_SEMANTICS` flag is missing. This flag is mandatory when opening a directory handle; without it, Windows refuses the open regardless of file-system permissions.
- **Hot-reload fires multiple times on a single save (Phase 3)**: The editor writes the file in multiple passes (common with VS Code and Sublime Text autosave + format-on-save). Debounce the reload by recording the last reload timestamp and ignoring subsequent events within a 500 ms window.
- **`g_watcherThread.join()` hangs on game exit (Phase 3)**: `g_watcherRunning` was set to `false` but `WaitForSingleObject` is blocking on a `ReadDirectoryChangesW` call that never returns. Ensure the `OVERLAPPED` path is used (not the synchronous no-`OVERLAPPED` overload) so the 250 ms timeout causes the loop to re-check the flag and exit cleanly.
