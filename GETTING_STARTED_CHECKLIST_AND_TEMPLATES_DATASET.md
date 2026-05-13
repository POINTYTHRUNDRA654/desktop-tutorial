# Getting Started Checklist & F4SE/Papyrus Code Templates

This dataset covers the environment setup checklist for advanced Fallout 4 development, an F4SE Hello World C++ plugin template, a basic Papyrus event script template, and a structural architectural overview of how the layers connect.

## Getting Started Checklist

- **C++ Environment**: Open Visual Studio 2022 and install the "Desktop development with C++" workload. Target the x64 Release configuration for all F4SE plugin projects.
- **F4SE SDK**: Download the latest Fallout 4 Script Extender SDK files from the official Silverlock site. Extract headers and libs into your project's include/lib paths and ensure version alignment with the game binary you are targeting.
- **Creation Kit**: Install the Fallout 4 Creation Kit via Steam and extract the `Base.zip` source scripts into `Data/Scripts/Source/Base/` so the compiler can resolve all native type dependencies.
- **Havok Tools**: Ensure Autodesk 3ds Max and the Havok Content Tools libraries are configured for `.hkx` export. Confirm the HCT plugin loads at Max startup before attempting any behavior graph work.

---

## 1) F4SE "Hello World" Memory Hook Template (C++)

Create a new C++ Dynamic-Link Library (DLL) project in Visual Studio 2022 to implement this basic plugin setup. This establishes the minimum viable plugin handshake with the F4SE loader.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se_common/f4se_version.h"

// Define plugin details for the F4SE loader
extern "C" __declspec(dllexport) F4SEPluginVersionData F4SEPlugin_Version = {
    F4SEPluginVersionData::kVersion,
    1,                       // Plugin version
    "HelloWorldPlugin",      // Plugin name
    "AuthorName",            // Author
    0,                       // Compatibility flags
    F4SEPluginVersionData::kVersion_SignalingEnabled,
    { RUNTIME_VERSION_1_10_163, 0 }, // Target runtime version
    0                        // Reserved
};

// Main initialization function called by F4SE loader
extern "C" __declspec(dllexport) bool F4SEPlugin_Load(const F4SEInterface* f4se) {
    // Log message to the F4SE plugin log file
    _MESSAGE("Hello World! F4SE Plugin loaded successfully.");
    return true;
}
```

**Key points:**
- `F4SEPlugin_Version` is the metadata struct the loader reads before calling `F4SEPlugin_Load`. Both exports must be present.
- `RUNTIME_VERSION_1_10_163` should match the exact game version you are targeting. Update this value when the game patches.
- `_MESSAGE` writes to `Data/F4SE/Logs/<PluginName>.log` — check this file first when diagnosing load failures.
- The DLL output must be placed in `Data/F4SE/Plugins/` for the loader to discover it.

---

## 2) Basic Papyrus Event Script (HEW_ExampleScript.psc)

Save this as `HEW_ExampleScript.psc` inside `Data/Scripts/Source/User/`, then compile it with the Creation Kit or Caprica. Assign it to any placeable object in the CK to test activation.

```papyrus
Scriptname HEW_ExampleScript extends ObjectReference
; Triggers when the player activates the object holding this script

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.MessageBox("Hello World! Script event executed successfully.")
    EndIf
EndEvent
```

**Key points:**
- `extends ObjectReference` is the correct base for scripts attached to placed world objects or containers.
- `OnActivate` fires when the player presses the interact key while the activation prompt is visible.
- `Debug.MessageBox` is the simplest way to confirm event execution without needing a Papyrus log viewer.
- Compiled `.pex` output goes to `Data/Scripts/` — the source `.psc` is not required at runtime.

---

## 3) Structural Architectural Overview

This diagram maps how the three engine layers connect at runtime:

```
+-----------------------------------------------------------------------+
|                       FALLOUT 4 GAME ENGINE                           |
+-----------------------------------------------------------------------+
       ^                                                        ^
       | [Memory Hooks / RVAs]                                  | [Engine Events]
       v                                                        v
+-----------------------+   [.RegisterFunction()]    +------------------+
|   F4SE C++ PLUGIN     | =========================> |  PAPYRUS SCRIPT  |
|                       | <========================= |                  |
| Direct Memory Control |    [Call Custom Native]    | Game-World Logic |
+-----------------------+                            +------------------+
                                                              ^
                                                              | [Fired Events]
                                                              v
                                                     +------------------+
                                                     |  CREATION KIT /  |
                                                     |    EDI CONFIG    |
                                                     +------------------+
```

**Layer summary:**
- **F4SE C++ Plugin**: Hooks into engine memory via RVAs, exposes custom native functions upward via `VirtualMachine::RegisterFunction`.
- **Papyrus Script**: Receives engine events from the game world, calls down into registered native functions when advanced operations are needed.
- **Creation Kit / EDI Config**: Defines the data layer — quest records, dialogue, forms — that fires the events Papyrus scripts respond to.

---

## Troubleshooting Focus

- If `F4SEPlugin_Load` is never called, verify the DLL is in `Data/F4SE/Plugins/` and the `RUNTIME_VERSION` in `F4SEPlugin_Version` matches your game binary exactly.
- If the Papyrus `OnActivate` event never fires, confirm the script is compiled, the `.pex` is present in `Data/Scripts/`, and the object has the script attached in the Creation Kit object properties.
- If `Debug.MessageBox` shows nothing, verify `bEnableLogging=1` and the script is not trapped inside an unreachable conditional branch.
