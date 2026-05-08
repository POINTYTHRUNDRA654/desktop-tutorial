# C++ / F4SE / Papyrus Bridge & Memory Management Guide

## Overview

This guide covers the recommended patterns for offloading heavy computation from Papyrus to native C++ via an F4SE DLL plugin, bridging results back to Papyrus scripts (.psc), monitoring for Papyrus stack dumps, and configuring the correct 32-bit / 64-bit compiler settings for Papyrus script compilation (including CorFlags.exe for legacy setups).

---

## 1. Why Offload to C++?

Papyrus is an interpreted, single-threaded script engine running on the game's main thread. It is intentionally limited to prevent modder scripts from destabilising the engine. Heavy tasks should be moved to native C++:

| Scenario | Papyrus Problem | C++ Solution |
|---|---|---|
| Pathfinding / A* over large grids | Timeout / stack overflow | Native DLL function, result returned async |
| Large array sort / search | Too slow, blocks VM | C++ sort in-place, return result to Papyrus |
| Complex math (FFT, matrix ops) | No FP hardware, loops lag | SIMD in C++, single Papyrus call |
| String parsing / regex | No regex support | C++ std::regex, returned as string |
| File I/O (e.g. reading JSON config) | Not available in vanilla | F4SE serialization / custom IPC via DLL |
| Bulk record scanning | Iterating thousands of forms | Batch scan in C++, single Papyrus notification |

**Key rule:** Papyrus should only be responsible for _orchestrating_ actions and reacting to results. All data-heavy loops, parsing, and maths should live in C++.

---

## 2. Project Setup

### Visual Studio Project Settings

```
Platform: x64 (required — Fallout 4 is 64-bit)
Configuration: Release (Debug builds incompatible with F4SE live injection)
Character Set: Use Unicode Character Set (/DUNICODE /D_UNICODE)
Runtime Library: Multi-threaded (/MT) — avoids VCRUNTIME DLL dependency
C++ Language Standard: ISO C++17 (/std:c++17) or C++20
```

### CMakeLists.txt Skeleton (CommonLibF4 approach)

```cmake
cmake_minimum_required(VERSION 3.21)
project(MyHeavyPlugin VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

find_package(CommonLibF4 CONFIG REQUIRED)

add_library(MyHeavyPlugin SHARED
  src/main.cpp
  src/PapyrusBridge.cpp
  src/HeavyAlgorithms.cpp
)

target_link_libraries(MyHeavyPlugin PRIVATE CommonLibF4::CommonLibF4)
target_include_directories(MyHeavyPlugin PRIVATE include)

install(TARGETS MyHeavyPlugin
  RUNTIME DESTINATION "F4SE/Plugins"
)
```

### vcpkg Manifest (vcpkg.json)

```json
{
  "name": "myheavyplugin",
  "version": "1.0.0",
  "dependencies": [
    "commonlibf4"
  ]
}
```

---

## 3. Registering Native Functions with Papyrus

### C++ Side — PapyrusBridge.cpp

```cpp
#include <RE/Fallout.h>       // CommonLibF4 RE namespace
#include <F4SE/F4SE.h>

// ---- Heavy algorithm (example: sort + sum) ----
static std::int32_t SortAndSumArray(
    RE::BSScript::IVirtualMachine* vm,
    RE::VMStackID stackID,
    RE::StaticFunctionTag*,
    RE::BSTSmartPointer<RE::BSScript::Array> arr)
{
    if (!arr) return 0;

    std::vector<std::int32_t> data;
    data.reserve(arr->size());
    for (std::uint32_t i = 0; i < arr->size(); ++i)
        data.push_back(arr->data()[i].GetSInt());

    std::sort(data.begin(), data.end());

    std::int32_t sum = 0;
    for (auto v : data) sum += v;
    return sum;
}

// ---- Heavy path-find result (example: returns found=true/false) ----
static bool FindPathNative(
    RE::BSScript::IVirtualMachine* vm,
    RE::VMStackID stackID,
    RE::StaticFunctionTag*,
    RE::TESObjectREFR* startRef,
    RE::TESObjectREFR* goalRef)
{
    if (!startRef || !goalRef) return false;
    // ... heavy A* logic here ...
    return true; // result back to Papyrus
}

// ---- Registration ----
bool RegisterPapyrusFunctions(RE::BSScript::IVirtualMachine* vm)
{
    // Namespace "MyPlugin" exposed to Papyrus
    vm->BindNativeMethod("MyPlugin"sv, "SortAndSumArray"sv,
        SortAndSumArray, true);

    vm->BindNativeMethod("MyPlugin"sv, "FindPath"sv,
        FindPathNative, true);

    return true;
}
```

### main.cpp — Plugin Entry Point

```cpp
#include <F4SE/F4SE.h>

extern bool RegisterPapyrusFunctions(RE::BSScript::IVirtualMachine* vm);

F4SE_PLUGIN_VERSION = []()
{
    F4SE::PluginVersionData ver{};
    ver.PluginVersion({ 1, 0, 0 });
    ver.PluginName("MyHeavyPlugin");
    ver.AuthorName("YourName");
    ver.CompatibleVersions({ F4SE::RUNTIME_LATEST });
    return ver;
}();

extern "C" [[maybe_unused]] bool F4SEPlugin_Load(const F4SE::LoadInterface* a_f4se)
{
    F4SE::Init(a_f4se);

    const auto papyrus = F4SE::GetPapyrusInterface();
    if (!papyrus) {
        logger::error("Failed to get Papyrus interface");
        return false;
    }
    papyrus->Register(RegisterPapyrusFunctions);
    return true;
}
```

---

## 4. Calling C++ Functions from Papyrus (.psc)

### Synchronous Pattern (simple return value)

```papyrus
; MyPluginBridge.psc
Scriptname MyPluginBridge extends Quest

; Declaration — native keyword marks it as a C++ function
Int Function SortAndSumArray(Int[] akArray) Global Native

Bool Function FindPath(ObjectReference akStart, ObjectReference akGoal) Global Native

Function RunHeavyTask()
    Int[] myData = new Int[10]
    myData[0] = 99 ; ... fill data ...

    Int result = MyPluginBridge.SortAndSumArray(myData)
    Debug.Notification("Sorted sum: " + result)
EndFunction
```

### Asynchronous Pattern (fire-and-forget with callback event)

When C++ work is truly async (e.g. file I/O, network, background thread), use a custom event to notify Papyrus when done:

**C++ side — fire event on completion:**
```cpp
// After background work is done, send a custom event back to Papyrus
void NotifyPapyrusComplete(std::int32_t result)
{
    const auto vm = RE::GameVM::GetSingleton()->GetVM().get();
    if (!vm) return;

    // Dispatch a custom SKSE/F4SE mod event
    auto* args = RE::MakeFunctionArguments(result);
    vm->SendModEvent("OnMyPluginTaskComplete"sv, args);
    delete args;
}
```

**Papyrus side — register for the event:**
```papyrus
Scriptname MyPluginListener extends Quest

Event OnMyPluginTaskComplete(Int aiResult)
    Debug.Notification("C++ task done. Result: " + aiResult)
EndEvent

Function StartAsyncTask()
    ; Kick off the C++ async operation
    MyPluginBridge.StartBackgroundTask()
    ; Papyrus returns immediately; result arrives via event
EndFunction
```

---

## 5. Papyrus Stack Dump Monitoring

Even when C++ handles the heavy lifting, **improper Papyrus coding can still crash the script engine**.

### What Causes Papyrus Stack Dumps

| Cause | Description | Fix |
|---|---|---|
| Infinite loop | `While True` with no exit condition | Always have a break condition; use `RegisterForSingleUpdate` instead |
| Runaway `OnUpdate` | Too many scripts calling `RegisterForUpdate(0.001)` | Increase interval; use `OnCellAttach`/`OnLoad` triggers instead |
| Deep recursion | Function calling itself (direct or indirect) hundreds of times | Rewrite as iterative; move recursion to C++ |
| Latent function overload | Too many concurrent `Wait()` / latent calls pending | Throttle concurrent tasks; use a semaphore pattern |
| Missing `None` check | Calling a method on a `None` reference causes an unhandled exception | Always guard: `If myRef != None` |
| Hung stack frame | Latent function waiting on a condition that never fires | Add timeout / fallback path |

### Reading Stack Dumps in Papyrus.0.log

```
[MM/DD/YYYY HH:MM:SS] Papyrus log opened
...
[ (0.00)] RUNTIME ERROR: ...
[ (0.00)]   stack:
[ (0.00)]     [MyScript <alias Player on quest MyQuest (XXXXXXXX)>].MyScript.OnUpdate() Line 42
[ (0.00)]     [MyScript <alias Player on quest MyQuest (XXXXXXXX)>].MyScript.HeavyLoop() Line 18
```

- **Log location:** `Documents\My Games\Fallout4\Logs\Script\Papyrus.0.log`  
  (or `User.0.log` for user-generated Debug.Trace calls)
- Enable logging in `Papyrus.ini` (under `[Papyrus]`): `bEnableLogging=1`, `bEnableTrace=1`
- In release builds set `bEnableLogging=0` to avoid log spam slowing the VM

### Mossy Stack-Dump Detection Pattern

Mossy watches `Papyrus.0.log` for the keywords `RUNTIME ERROR` and `stack:` lines. When detected, she will:
1. Parse the stack trace
2. Identify the script/function/line
3. Suggest likely cause (loop, None ref, latent overload)
4. Recommend whether to move the logic to C++

### Safe OnUpdate Pattern

```papyrus
; BAD — fires every 0.001 seconds, clogs the VM
Event OnUpdate()
    DoExpensiveWork()
    RegisterForUpdate(0.001)  ; ← never do this
EndEvent

; GOOD — single update, sensible interval
Event OnUpdate()
    DoWork()
    RegisterForSingleUpdate(1.0)  ; re-register only after work completes
EndEvent

; BEST — event-driven, no polling at all
Event OnActivate(ObjectReference akActionRef)
    DoWork()  ; only fires when player activates the object
EndEvent
```

### Preventing Runaway Recursion

If an algorithm is recursive by nature, always implement it in C++:
```papyrus
; DON'T recurse in Papyrus
Function RecursiveSearch(Form akTarget, Int depth)
    If depth > 10 Return EndIf
    RecursiveSearch(akTarget, depth + 1)  ; stack grows each call
EndFunction

; DO call native C++ which handles recursion internally
Function SafeSearch(Form akTarget)
    MyPluginBridge.RecursiveSearch(akTarget)  ; single Papyrus frame
EndFunction
```

---

## 6. Compiler Settings: 32-bit vs 64-bit and CorFlags.exe

### PapyrusCompiler.exe — Architecture

The Papyrus Compiler (`PapyrusCompiler.exe`) is a **managed .NET executable**. Its bitness matters when the tool is run on a 32-bit CLR vs a 64-bit CLR, particularly on older Windows systems or legacy build pipelines.

| Setup | Behaviour |
|---|---|
| Modern Windows 64-bit + .NET 4.x | Runs as 64-bit by default — no changes needed |
| Older 32-bit Windows or WoW64 issues | May need LARGEADDRESSAWARE flag or bitness override |
| Legacy CI pipelines with 32-bit .NET host | Use `CorFlags.exe` to force 32-bit or 64-bit execution |

### What is CorFlags.exe?

`CorFlags.exe` is a Windows SDK utility that reads and modifies the CLR header flags in a managed assembly. For `PapyrusCompiler.exe` it can be used to force a specific execution mode.

**Check current flags:**
```cmd
CorFlags.exe "C:\Steam\steamapps\common\Fallout 4\Papyrus Compiler\PapyrusCompiler.exe"
```

Sample output:
```
Version   : v4.0.30319
CLR Header: 2.5
PE        : PE32
CorFlags  : 0x3
ILONLY    : 1
32BITREQ  : 0   ← if 1, forces 32-bit execution
32BITPREF : 0
Signed    : 0
```

**Force 32-bit execution (legacy fix):**
```cmd
CorFlags.exe "PapyrusCompiler.exe" /32BITREQ+
```

**Remove 32-bit requirement (restore 64-bit):**
```cmd
CorFlags.exe "PapyrusCompiler.exe" /32BITREQ-
```

**Why this matters:**
- On older machines or CI build servers, if `PapyrusCompiler.exe` tries to run as 32-bit on a 64-bit OS it may fail to access long import paths (> 260 chars).
- When using large script source trees (e.g., base game + DLCs + F4SE headers), the compiler may run out of memory under 32-bit address space limits.
- Setting `/32BITREQ-` allows the OS to run the compiler as a 64-bit process, giving it full 4 GB+ virtual address space.

### Recommended Compilation Flags for Release

```cmd
PapyrusCompiler.exe "Data\Scripts\Source\User" ^
  -i="Data\Scripts\Source\Base;Data\Scripts\Source\User" ^
  -o="Data\Scripts" ^
  -f="Institute_Papyrus_Flags.flg" ^
  -all ^
  -r ^
  -op
```

| Flag | Purpose |
|---|---|
| `-all` | Compile all .psc files in the source folder |
| `-r` | Release mode — strips `Debug.Trace` and `debugOnly` calls |
| `-op` | Optimize — reduces .pex size and execution overhead |
| `-final` | Final release — also strips `betaOnly` calls (use for shipping) |

### Papyrus Flags File (Institute_Papyrus_Flags.flg)

The flags file enables conditional compilation. Use it to gate F4SE-only code:
```
; Institute_Papyrus_Flags.flg
; Standard flags for Fallout 4 Papyrus
```

If you have F4SE-gated Papyrus functions, wrap them:
```papyrus
{DEBUG_ONLY}
Function DebugDump()
    Debug.Trace("Debug output")
EndFunction
```

Compiled with `-r`, all `{DEBUG_ONLY}` blocks are removed.

---

## 7. End-to-End Memory-Safe Workflow

```
[Heavy Data / Algorithm]
       │
       ▼
[C++ DLL (F4SE Plugin)]  ← allocates/frees memory in C++ heap
       │  result (int/string/array)
       ▼
[Papyrus Native Call]    ← single VM stack frame
       │  return value
       ▼
[Papyrus Script Logic]   ← orchestration only, no loops
       │  UI / world state changes
       ▼
[Game Engine]
```

### Checklist Before Shipping

- [ ] All heavy loops (> ~100 iterations) implemented in C++
- [ ] No unbounded `While` loops in Papyrus
- [ ] All `OnUpdate` events use `RegisterForSingleUpdate` with interval ≥ 0.5s
- [ ] All object references guarded with `!= None` before use
- [ ] Stack dump log reviewed; no RUNTIME ERRORs in Papyrus.0.log
- [ ] PapyrusCompiler built as 64-bit (verify with CorFlags.exe or Task Manager)
- [ ] Release compiled with `-r -op` flags
- [ ] `bEnableLogging=0` set in Papyrus.ini for end-user release build
- [ ] F4SE DLL compiled as Release x64, placed in `Data/F4SE/Plugins/`
- [ ] Address Library `.toml` included for multi-runtime compatibility

---

## 8. Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| `RUNTIME ERROR: stack overflow` | Deep recursion in Papyrus | Move recursion to C++ |
| `RUNTIME ERROR: None.` | Method called on None reference | Add None guard |
| Scripts freeze / game hangs | Runaway `OnUpdate` or infinite loop | Use `RegisterForSingleUpdate`; check log |
| Native function not found | Namespace mismatch | Match `BindNativeMethod` namespace to Papyrus `Global Native` declaration |
| DLL not loading | Wrong bitness or runtime version | Confirm x64 Release, check `F4SE/Plugins/*.log` |
| Compiler OOM / access violation | 32-bit compiler on large source tree | Use `CorFlags.exe /32BITREQ-` to force 64-bit |
| Scripts very slow but no crash | C++ not registered or Papyrus doing heavy work | Profile with `tps`; move bottleneck to C++ |
