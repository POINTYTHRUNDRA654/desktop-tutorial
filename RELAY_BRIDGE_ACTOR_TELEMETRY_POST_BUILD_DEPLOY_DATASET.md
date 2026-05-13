# Node.js TCP-to-WebSocket Relay, Actor Telemetry Capture, and Automated Post-Build Deployment

This dataset covers three integration and deployment topics: a Node.js relay server that bridges the C++ raw TCP data stream to the browser WebSocket dashboard, extracting live player health and position data from the `PlayerCharacter*` engine pointer, and a Visual Studio 2022 post-build batch script that automatically packages compiled assets into a deployment-ready mod archive.

---

## Phase 1: Node.js TCP-to-WebSocket Relay Bridge Server

Save this as `server.js` and run it locally with `node server.js` before launching Fallout 4. It accepts raw TCP frames from the C++ plugin on port 8080 and forwards them to the browser dashboard over WebSocket on port 8081.

```javascript
const net = require('net');
const { WebSocketServer } = require('ws');

// WebSocket server — the HTML dashboard connects here
const wss = new WebSocketServer({ port: 8081 });
let activeWebsocket = null;

wss.on('connection', (ws) => {
    activeWebsocket = ws;
    console.log('[Dashboard] HTML interface connected successfully.');
    ws.on('close', () => { activeWebsocket = null; });
});

// Raw TCP server — the F4SE C++ plugin connects here
const tcpServer = net.createServer((socket) => {
    console.log('[Game Plugin] F4SE engine connected.');

    socket.on('data', (data) => {
        const payloadStr = data.toString().trim();
        console.log(`[Data Frame Stream]: ${payloadStr}`);

        // Forward to dashboard if a WebSocket client is connected and open
        if (activeWebsocket && activeWebsocket.readyState === 1) {
            activeWebsocket.send(payloadStr);
        }
    });

    socket.on('end',   () => { console.log('[Game Plugin] F4SE engine disconnected.'); });
    socket.on('error', (err) => { console.error('[TCP Error]', err.message); });
});

tcpServer.listen(8080, '127.0.0.1', () => {
    console.log('[Relay Bridge Ready] TCP port: 8080 | WebSocket port: 8081');
});
```

**Update the dashboard HTML** to point at port 8081:
```javascript
const socket = new WebSocket('ws://127.0.0.1:8081');
```

**Key points:**
- Two servers run on different ports: `8080` (raw TCP, for the C++ plugin) and `8081` (WebSocket, for the browser). They must not share a port.
- `activeWebsocket.readyState === 1` is the `OPEN` state constant. Checking this before `.send()` prevents errors when the dashboard is not loaded.
- `data.toString().trim()` converts the raw `Buffer` to a string and strips trailing newlines from the C++ `"\n"` delimiter. The resulting string is the JSON payload your dashboard already parses.
- Install the `ws` package before running: `npm install ws`. The `net` module is built into Node.js and requires no install.
- The relay handles only one active WebSocket client at a time (`activeWebsocket` is overwritten on each new connection). For a production multi-viewer scenario, maintain a `Set` of connected clients and broadcast to all of them.
- Start order: run `node server.js` first, then open `index.html` in a browser, then launch Fallout 4 with F4SE. The C++ plugin will connect to port 8080 when `BroadcastTelemetryData` fires.

---

## Phase 2: Capturing Live Actor Structural Data (Health & Coordinates)

This C++ function extracts position vectors and health actor values from the `PlayerCharacter*` engine pointer and serialises them into the JSON telemetry payload.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/GameReferences.h"
#include "f4se/GameObjects.h"
#include <string>

std::string CaptureActorTelemetry() {
    PlayerCharacter* player = (*g_player);
    if (!player) return "{}";

    // Position vectors from the engine node transformation system
    float posX = player->pos.x;
    float posY = player->pos.y;
    float posZ = player->pos.z;

    float currentHealth = 0.0f;
    float maxHealth     = 100.0f;

    if (player->actorValueOwner.GetPtr()) {
        currentHealth = player->actorValueOwner.GetPtr()->GetValue(*g_healthAV);
        maxHealth     = player->actorValueOwner.GetPtr()->GetBaseValue(*g_healthAV);
    }

    std::string json = "{";
    json += "\"health\":"      + std::to_string(currentHealth) + ",";
    json += "\"max_health\":"  + std::to_string(maxHealth)     + ",";
    json += "\"x\":"           + std::to_string(posX)          + ",";
    json += "\"y\":"           + std::to_string(posY)          + ",";
    json += "\"z\":"           + std::to_string(posZ);
    json += "}\n";

    return json;
}
```

**Key points:**
- `(*g_player)` dereferences the global double-pointer to the local `PlayerCharacter` instance. Always null-check before accessing any member — `g_player` is only valid after the game world has finished loading. Call this function only from inside an `AddTask` lambda or after verifying the world is active.
- `player->pos.x / .y / .z` are Havok world-space coordinates in game units. Divide by 142.857 to convert to metres if your dashboard needs real-world scale.
- `actorValueOwner.GetPtr()` returns the `ActorValueOwner` interface. Null-check before calling `GetValue` — early in load order this pointer may not be populated.
- `GetValue(*g_healthAV)` returns the current (modified) health value. `GetBaseValue(*g_healthAV)` returns the unmodified base. `g_healthAV` is the global `ActorValueInfo*` for the Health actor value, provided by F4SE's `GameObjects.h`.
- Call `CaptureActorTelemetry()` from inside the `AddTask` lambda in the telemetry worker thread (replacing the earlier placeholder comment) and pass the returned string to `BroadcastTelemetryData` or the async logger.
- The `"\n"` newline terminator on the JSON string is consumed by `data.toString().trim()` in the Node.js relay and is not sent to the WebSocket client.

---

## Phase 3: Visual Studio Automated Post-Build Mod Manager Deployment

Paste this batch script into **Project Properties → Configuration Properties → Build Events → Post-Build Event → Command Line**. It runs after every successful compile to stage and zip the deployment archive.

```bat
:: Create deployment folder layout inside the project directory
mkdir "$(ProjectDir)BuildArchive\F4SE\Plugins"     2>nul
mkdir "$(ProjectDir)BuildArchive\Interface\EDI"    2>nul
mkdir "$(ProjectDir)BuildArchive\Scripts"          2>nul
mkdir "$(ProjectDir)BuildArchive\fomod"            2>nul

:: Copy the freshly compiled DLL into the archive
xcopy /Y "$(TargetPath)" "$(ProjectDir)BuildArchive\F4SE\Plugins\"

:: Copy Interface and EDI XML configuration
xcopy /Y "$(ProjectDir)Interface\EDI\ExtendedDialogueInterface.xml" "$(ProjectDir)BuildArchive\Interface\EDI\"

:: Pack the completed asset tree into a zip for mod managers
tar -a -c -f "$(ProjectDir)BuildArchive\EngineTelemetryToolkit_v1.0.zip" -C "$(ProjectDir)BuildArchive" F4SE Interface Scripts fomod
```

**Key points:**
- `$(ProjectDir)` and `$(TargetPath)` are MSBuild macros. `$(ProjectDir)` resolves to the `.vcxproj` directory with a trailing backslash. `$(TargetPath)` is the full path to the compiled DLL output. These are expanded by MSBuild at build time.
- `mkdir ... 2>nul` creates directories silently — `2>nul` suppresses the "already exists" error on subsequent builds so the post-build step does not fail when the folders are already present.
- `xcopy /Y` copies without prompting when the destination file already exists. Add `/S` if you have subdirectory structures to mirror (e.g., `Scripts\` with nested source files).
- `tar -a -c -f` uses Windows 10+ built-in `tar` (BSD tar). The `-a` flag auto-selects the compression format from the file extension (`.zip`). `-C "$(ProjectDir)BuildArchive"` sets the working directory so paths inside the zip are relative (e.g., `F4SE\Plugins\Plugin.dll` not the full absolute path).
- The `tar` command lists only the top-level folder names to include (`F4SE Interface Scripts fomod`). Folders listed here must exist in `BuildArchive\` or `tar` will error. Add `Source` to the list if the Developer Debug configuration also copies `.psc` source files.
- Set this post-build script on the `Release` configuration only. Assign a separate (or empty) post-build command to `Developer Debug` if you do not want debug DLLs packaged automatically.

---

## Troubleshooting Focus

- **`ws` module not found when running server.js (Phase 1)**: Run `npm install ws` in the same directory as `server.js` before starting the relay. The `net` module is built-in and needs no install.
- **Dashboard connects to 8081 but shows no data (Phase 1)**: The C++ plugin is still sending to port 8080 and the relay is receiving but `activeWebsocket` is null. Open the browser dashboard tab before launching the game so a WebSocket client is registered when data arrives.
- **`CaptureActorTelemetry` returns `"{}"` (Phase 2)**: `(*g_player)` is null — the function is being called before the player character is loaded. Move the call into an `AddTask` lambda and add a world-loaded check. Never call it from `F4SEPlugin_Load` directly.
- **Health always reads `0.0` (Phase 2)**: `actorValueOwner.GetPtr()` returned null. This can happen if called during the loading screen before the actor value owner is initialised. Wait for a `TESLoadGameEvent` or equivalent before polling health values.
- **Post-build tar command fails with "Cannot stat" (Phase 3)**: One of the listed folder names (`F4SE`, `Interface`, `Scripts`, `fomod`) does not exist under `BuildArchive\`. Add the missing `mkdir` line for that folder at the top of the script.
- **Zip contains absolute paths (Phase 3)**: The `-C` flag was omitted or points to the wrong directory. Confirm `-C "$(ProjectDir)BuildArchive"` immediately precedes the folder names so `tar` treats them as relative paths.
