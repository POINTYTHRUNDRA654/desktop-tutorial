# Advanced F4SE Integration: Complex Argument Bridging, Event Listeners, and RVA Memory Access

This dataset covers three advanced F4SE plugin development phases: passing complex Papyrus types to native C++, intercepting engine events and dispatching custom Papyrus events from C++, and reading or writing live engine memory via Relative Virtual Address (RVA) offsets.

---

## Phase 1: Passing Complex Arguments Between C++ and Papyrus

This template extends the basic function bridge to accept a native Fallout 4 object form pointer (`TESForm*`), a string (`BSFixedString`), and an integer array (`VMArray<SInt32>`) from Papyrus.

### C++ Function Implementation

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/PapyrusVM.h"
#include "f4se/PapyrusNativeFunctions.h"
#include "f4se/PapyrusArgs.h"
#include "f4se/GameForms.h"

// Receives a base form pointer, an operation string, and a data array from Papyrus
void ProcessComplexData(VirtualMachine* vm, UInt32 stackId, Variable* value,
                        TESForm* targetForm, BSFixedString operation, VMArray<SInt32> dataArray)
{
    if (!targetForm) {
        _MESSAGE("Error: Target form is null.");
        return;
    }

    const char* opStr = operation.c_str();
    _MESSAGE("Executing operation: %s on Form ID: 0x%08X", opStr, targetForm->formID);

    UInt32 arraySize = dataArray.Length();
    for (UInt32 i = 0; i < arraySize; i++) {
        SInt32 elementValue;
        dataArray.Get(&elementValue, i);
        _MESSAGE("Array Index %d Value: %d", i, elementValue);
    }
}

bool RegisterComplexFunctions(VirtualMachine* vm) {
    vm->RegisterFunction(
        new NativeFunction3<Variable, void, TESForm*, BSFixedString, VMArray<SInt32>>(
            "SendComplexData", "HEW_ComplexBridge", ProcessComplexData, vm
        )
    );
    return true;
}
```

**Key points:**
- `TESForm*` is the base type for all Fallout 4 game objects. Always null-check before accessing `formID` or any form fields.
- `BSFixedString` is F4SE's interned string type. Call `.c_str()` to get a `const char*` for use with `_MESSAGE` or standard string operations.
- `VMArray<SInt32>` maps to a Papyrus `Int[]`. Use `.Length()` and `.Get(&value, index)` to iterate safely.
- The template parameter count on `NativeFunction3` matches the number of user-visible Papyrus arguments (3), not counting `vm`, `stackId`, and `value`.

### Matching Papyrus Interface Script (HEW_ComplexBridge.psc)

```papyrus
Scriptname HEW_ComplexBridge extends ObjectReference

; Signature must match the argument count and types defined in the NativeFunction3 binding
Function SendComplexData(Form akTargetForm, String asOperation, Int[] aiDataArray) native

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Int[] testData = new Int[3]
        testData[0] = 105
        testData[1] = 220
        testData[2] = 433

        ; Pass the player base actor, a string directive, and our fresh array
        SendComplexData(Game.GetPlayer().GetBaseObject(), "ProcessStats", testData)
    EndIf
EndEvent
```

**Key points:**
- The Papyrus `Function` signature (name, script name, argument types) must match the `RegisterFunction` binding exactly or the VM will silently fail to route the call.
- `Game.GetPlayer().GetBaseObject()` returns a `Form` reference, which maps to `TESForm*` on the C++ side.
- Declare the function `native` with no body — the body lives entirely in the C++ DLL.

---

## Phase 2: C++ Event Listeners Dispatching to Papyrus

Plugins can intercept native game engine events using `BSTEventSink` and then broadcast custom Papyrus events to listening scripts.

### C++ Source Code (events.cpp)

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/PapyrusVM.h"
#include "f4se/PapyrusInterfaces.h"
#include "f4se/GameEvents.h"

class OurMenuOpenCloseHandler : public BSTEventSink<MenuOpenCloseEvent> {
public:
    virtual EventResult ReceiveEvent(MenuOpenCloseEvent* evn, void* dispatcher) override {
        if (evn && evn->menuName == "PipboyMenu") {
            _MESSAGE("Pipboy Menu toggled state. Open status: %d", evn->isOpen);

            VirtualMachine* vm = (*g_gameVM)->m_virtualMachine;
            // Dispatch a custom Papyrus event here using vm->SendEvent or a registered callback
        }
        return kEvent_Continue;
    }
};

OurMenuOpenCloseHandler g_menuHandler;

void InitializeEventListeners() {
    (*g_ui)->menuOpenCloseEventSource.AddEventSink(&g_menuHandler);
    _MESSAGE("Menu event listener sink registered.");
}
```

**Key points:**
- `BSTEventSink<T>` is the engine's generic event listener interface. Implement `ReceiveEvent` for the specific event type you want to intercept.
- `MenuOpenCloseEvent` provides `menuName` (the Scaleform menu identifier string) and `isOpen` (open/close state). `"PipboyMenu"` is the Pip-Boy UI identifier.
- Always return `kEvent_Continue` unless you need to stop further event propagation.
- Call `InitializeEventListeners()` from inside `F4SEPlugin_Load` after verifying interfaces are available.

### Custom Papyrus Event Definition (HEW_EventListener.psc)

```papyrus
Scriptname HEW_EventListener extends Quest

; Define a custom event layout
CustomEvent OnNativeEngineAlert

Function TriggerScriptAlert(String asMessage)
    ; Send the notification payload out to any external scripts listening to this quest
    Var[] kArgs = new Var[1]
    kArgs[0] = asMessage
    SendCustomEvent("OnNativeEngineAlert", kArgs)
EndFunction
```

**Key points:**
- `CustomEvent` declares an event signature that other scripts can register to receive via `RegisterForCustomEvent`.
- `SendCustomEvent` broadcasts the payload to all registered listeners. The `Var[]` array must match the parameter layout external scripts expect.
- This quest script is the bridge target — the C++ side calls back into it via a registered native function or via `vm->SendEvent`.

---

## Phase 3: Memory Address Offsets (RVAs) for Live Engine Data

Reading or writing raw engine memory uses RVAs (Relative Virtual Addresses) resolved at runtime relative to the `Fallout4.exe` base load address.

### Memory Addressing Concept

```
[ FALLOUT4.EXE BASE ADDR ] ---> System Allocates Dynamically (e.g., 0x7FF65A000000)
             |
             +---> + [ Relative Virtual Address (RVA) ] (e.g., 0x011D32A0)
             |
             v
[ TARGET ENGINE MEMORY ADDRESS ] ---> Access live variables or hook instructions directly
```

The base address changes every launch (ASLR). RVAs are stable offsets discovered via IDA Pro or Ghidra static analysis. `RelocPtr<T>` in F4SE resolves the final address at runtime.

### C++ Live Read/Write Implementation

```cpp
#include "f4se/PluginAPI.h"
#include "f4se_common/Relocation.h"

// RVA discovered via static analysis — example: global timescale multiplier
#define ENGINE_GLOBAL_TIMESCALE_RVA 0x011D32A0

void ReadLiveEngineValues() {
    RelocPtr<float> globalTimeScale(ENGINE_GLOBAL_TIMESCALE_RVA);

    if (globalTimeScale.GetPtr()) {
        float currentScale = *globalTimeScale;
        _MESSAGE("Successfully read live engine timescale value: %f", currentScale);

        // Direct memory write — only write to verified data variables, never to code segments
        *globalTimeScale = 1.0f;
        _MESSAGE("Engine value safely manipulated in memory space.");
    } else {
        _MESSAGE("Failed to resolve absolute memory address pointer for offset.");
    }
}
```

**Key points:**
- `RelocPtr<T>` accepts a compile-time RVA and produces a typed pointer to the runtime address after ASLR relocation.
- Always call `.GetPtr()` and null-check before dereferencing. An invalid RVA (e.g., from a different game version) will return null or produce an access violation.
- Write only to verified data globals. Never write to code/text segment addresses — this corrupts engine bytecode and will crash.
- RVAs must be re-verified after every game patch using IDA Pro, Ghidra, or pattern scanning. Hard-coded offsets are version-specific.

---

## Troubleshooting Focus

- **Null form crash (Phase 1)**: Always null-check `TESForm*` before any field access. Papyrus can pass `None` forms; the C++ side receives a null pointer.
- **VM call silently dropped (Phase 1)**: The Papyrus function name, script name, and argument types must be an exact match to the `RegisterFunction` binding. Any mismatch causes the VM to silently skip the native call.
- **Event sink not firing (Phase 2)**: Verify `InitializeEventListeners()` is called after `g_ui` is available. Calling it too early (before interface pointers are populated) silently fails.
- **Access violation on RVA read (Phase 3)**: The RVA is wrong for the current game version. Re-analyze with IDA/Ghidra or update to the correct pattern scan result for the patched binary.
