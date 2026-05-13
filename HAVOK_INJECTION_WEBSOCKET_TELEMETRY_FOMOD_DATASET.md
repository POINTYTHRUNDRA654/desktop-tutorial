# Havok Animation Injection, WebSocket Telemetry Stream, and FOMOD Installer Configuration

This dataset covers three integration and distribution topics: triggering Havok behavior graph state transitions from Papyrus in response to engine memory events, streaming live telemetry over a local TCP socket to an external dashboard, and authoring a FOMOD ModuleConfig.xml that lets mod managers present conditional install options to the user.

---

## Phase 1: Havok Behavior Graph Injection via Papyrus

This script ties engine memory modification results to physical mechanical object animations by sending named events directly to Havok state machines via `PlayAnimation`.

Save as `HEW_MechanicalObjectController.psc` and attach to the mechanical object reference in the Creation Kit.

```papyrus
Scriptname HEW_MechanicalObjectController extends ObjectReference

; Sends a named event to the Havok behavior graph attached to this object reference
Function TriggerMechanicalAnimation(String asEventName)
    Self.PlayAnimation(asEventName)
EndFunction

; Fires when the C++ safe memory write confirms the value was committed
Event OnMemoryWriteSuccess(Float afConfirmedValue)
    If afConfirmedValue == 1.0
        ; "Stage_Open" must match a transition event node name in the .hkx behavior graph
        TriggerMechanicalAnimation("Stage_Open")
        Debug.Notification("Memory threshold reached: Activating physical mechanisms.")
    EndIf
EndEvent
```

**Key points:**
- `Self.PlayAnimation(asEventName)` sends the named string as a behavior graph event to the Havok state machine running on this `ObjectReference`. The string must exactly match an event node identifier defined inside the `.hkx` graph — case-sensitive.
- Event node names like `"Stage_Open"` are defined in Havok Content Tools (HCT) during behavior graph authoring in 3ds Max. They appear as string-keyed transition conditions on state machine edges inside the `.hkx` binary.
- `OnMemoryWriteSuccess` is a custom event dispatched from the C++ side via Papyrus `SendCustomEvent` or a `vm->CallGlobalFunctionNoWait` call inside the `AddTask` lambda after `SafelyWriteFloat` returns `true`.
- If the mechanical object is a non-actor reference (a door, lever, or container), verify it has an **Animated Object** form with the `.hkx` graph assigned in the Creation Kit object properties. `PlayAnimation` silently does nothing on references without a bound behavior graph.
- For multi-state mechanisms (open → idle → close), define a separate event node for each transition direction in the `.hkx` graph and call `TriggerMechanicalAnimation` with the appropriate name from each code path.

---

## Phase 2: Live Local WebSocket Telemetry Stream (C++)

This function pushes live float telemetry values over a raw TCP connection to a locally-running web dashboard or diagnostic tool, running entirely on a detached background thread to avoid any impact on game frame timing.

```cpp
#include <winsock2.h>
#include <string>
#include <thread>

#pragma comment(lib, "ws2_32.lib")

void BroadcastTelemetryData(float liveValue) {
    std::thread([liveValue]() {
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return;

        SOCKET connectSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (connectSocket == INVALID_SOCKET) {
            WSACleanup();
            return;
        }

        sockaddr_in clientService;
        clientService.sin_family      = AF_INET;
        clientService.sin_addr.s_addr = inet_addr("127.0.0.1"); // Local dashboard target
        clientService.sin_port        = htons(8080);            // Monitoring port

        if (connect(connectSocket, (SOCKADDR*)&clientService, sizeof(clientService)) != SOCKET_ERROR) {
            std::string payload = "{\"telemetry\":" + std::to_string(liveValue) + "}\n";
            send(connectSocket, payload.c_str(), static_cast<int>(payload.length()), 0);
        }

        closesocket(connectSocket);
        WSACleanup();
    }).detach();
}
```

**Key points:**
- `WSAStartup(MAKEWORD(2, 2), &wsaData)` initialises Winsock 2.2 on the calling thread. It must be called before any socket operation and matched with `WSACleanup()` on every exit path.
- `.detach()` releases the thread from the `std::thread` object so it runs independently. Because each call creates, connects, sends, and closes its own socket, there is no shared state that requires a mutex between calls.
- `inet_addr("127.0.0.1")` and port `8080` target a locally-running listener (e.g., a Node.js WebSocket server, Python `websockets` server, or a browser-based dashboard). Change the port to match your receiver.
- The JSON payload `{"telemetry":<value>}\n` is newline-delimited so a streaming receiver can split messages on `\n` without a length prefix. Adjust the schema to include a timestamp or value name if your dashboard needs them.
- `#pragma comment(lib, "ws2_32.lib")` tells the MSVC linker to automatically include the Winsock library. Alternatively, add `ws2_32.lib` to **Linker → Input → Additional Dependencies** in your VS2022 project properties.
- Each call to `BroadcastTelemetryData` opens and closes a new socket. For high-frequency calls (e.g., every 500ms from the telemetry loop), consider maintaining a persistent socket connection on the worker thread instead of reconnecting on every call.

---

## Phase 3: Automated FOMOD Installer Script Configuration

Create `ModuleConfig.xml` inside a `fomod/` folder at the root of your mod archive. This tells Vortex and Mod Organizer 2 how to present install options and which files to deploy for each choice.

```xml
<?xml version="1.0" encoding="utf-8"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>Engine Telemetry and EDI Toolkit</moduleName>
  <installSteps order="Explicit">
    <installStep name="Component Selection">
      <optionalFileGroups order="Explicit">
        <group name="Core Modules" type="SelectExactlyOne">
          <plugins order="Explicit">

            <plugin name="Standard Telemetry Build">
              <description>Installs the base F4SE plugin and EDI configurations.</description>
              <files>
                <folder source="F4SE"       destination="F4SE"       priority="0"/>
                <folder source="Interface"  destination="Interface"  priority="0"/>
                <folder source="Scripts"    destination="Scripts"    priority="0"/>
              </files>
            </plugin>

            <plugin name="Developer Debug Build">
              <description>Includes the local WebSocket broadcaster and full Papyrus source scripts.</description>
              <files>
                <folder source="F4SE"       destination="F4SE"       priority="0"/>
                <folder source="Interface"  destination="Interface"  priority="0"/>
                <folder source="Scripts"    destination="Scripts"    priority="0"/>
                <folder source="Source"     destination="Source"     priority="0"/>
              </files>
            </plugin>

          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>
```

**Key points:**
- The `fomod/` folder must sit at the **archive root** (not inside `Data/`). Mod managers scan for `fomod/ModuleConfig.xml` at the top level to detect a FOMOD installer.
- `type="SelectExactlyOne"` forces the user to pick exactly one option from the group. Use `SelectAtLeastOne` if you want multiple selections, or `SelectAny` for fully optional checkboxes.
- `source` is the folder path relative to the archive root; `destination` is the path relative to the game `Data/` folder. `source="F4SE"` + `destination="F4SE"` copies `ArchiveRoot/F4SE/` → `Data/F4SE/`.
- `priority="0"` sets the file conflict priority. Higher numbers win when two FOMOD options install the same file path. Use this to let optional patches override base files.
- A companion `info.xml` file in `fomod/` (not shown here) provides the mod name, version, author, and description shown in the mod manager installer header. It is optional but strongly recommended for Nexus Mods submissions.
- To add a dependency check (e.g., require F4SE to be installed), add a `<moduleDependencies>` block before `<installSteps>`. This causes the installer to warn users who are missing required mods before proceeding.

---

## Troubleshooting Focus

- **`PlayAnimation` has no effect (Phase 1)**: The object reference does not have a bound `.hkx` behavior graph, or the event name does not match any transition event node in the graph. Open the HCT behavior graph in 3ds Max and confirm the exact event node string identifier.
- **`OnMemoryWriteSuccess` never fires (Phase 1)**: The C++ side is not dispatching the custom event after a confirmed write. Verify the `AddTask` lambda calls `vm->SendEvent` or the registered Papyrus function with the confirmed float value.
- **TCP connect fails (Phase 2)**: No listener is running on `127.0.0.1:8080`. Start your dashboard server before launching the game, or handle the `SOCKET_ERROR` connect case gracefully (it is already silently skipped in this implementation).
- **Winsock LNK2019 error (Phase 2)**: `ws2_32.lib` is not linked. Add `#pragma comment(lib, "ws2_32.lib")` to the source file or add `ws2_32.lib` in VS2022 **Linker → Input → Additional Dependencies**.
- **FOMOD installer not triggered by mod manager (Phase 3)**: The `fomod/` folder or `ModuleConfig.xml` is not at the archive root — it may be inside `Data/fomod/`. Re-examine the archive structure and move the `fomod/` folder to the top level.
- **Files installed to wrong location (Phase 3)**: The `source` path does not match the actual folder name in the archive (case-sensitive on some systems), or `destination` has an extra `Data/` prefix. Verify both paths in the `<folder>` element.
