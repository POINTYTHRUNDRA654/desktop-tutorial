# Papyrus Telemetry Receiver, EDI XML Layout, and Thread-Safe Memory Writer

This dataset covers the final integration layer connecting the C++ telemetry background thread to Papyrus, defining the EDI XML layout for extended dialogue menus, and implementing a VirtualProtect-guarded direct memory write triggered from an EDI button selection.

---

## Phase 1: Papyrus Telemetry Event Receiver

This Quest script runs on the main game thread and receives telemetry updates dispatched from the C++ background task queue via `F4SETaskInterface::AddTask`. It broadcasts the received value as a `CustomEvent` so any other script can listen for live engine data without polling.

Save as `HEW_TelemetryReceiver.psc` and attach it to a persistent custom Quest.

```papyrus
Scriptname HEW_TelemetryReceiver extends Quest

CustomEvent OnTelemetryUpdate

; Called via F4SE TaskInterface from the C++ worker thread callback
Function ReceiveEngineData(Float afLiveValue)
    ; Broadcast the raw value to all registered listeners
    Var[] kArgs = new Var[1]
    kArgs[0] = afLiveValue
    SendCustomEvent("OnTelemetryUpdate", kArgs)
EndFunction

; Internal listener — processes the value on arrival
Event HEW_TelemetryReceiver.OnTelemetryUpdate(Quest akSender, Var[] akArgs)
    Float currentTimescale = akArgs[0] as Float
    Debug.Notification("Live Engine Telemetry Updated: " + currentTimescale)
EndEvent
```

**Key points:**
- `ReceiveEngineData` is the Papyrus-side entry point. The C++ side calls this via `vm->CallGlobalFunctionNoWait` or a registered native-to-Papyrus dispatch inside the `AddTask` lambda, where the VM is safe to call.
- `CustomEvent OnTelemetryUpdate` declares the event layout. External scripts subscribe using `RegisterForCustomEvent(questRef, "OnTelemetryUpdate")` and receive the `Var[]` array in their own handler.
- `akArgs[0] as Float` casts the `Var` element back to a typed float. The cast must match the type the C++ side packed into the argument array.
- Attach this script to a Quest flagged **Start Game Enabled** with **Run Once** unchecked so it persists across all save sessions and keeps the `CustomEvent` dispatch channel open.

---

## Phase 2: EDI Layout Configuration XML

EDI reads custom UI definitions to display more than 4 dialogue choices. Create `ExtendedDialogueInterface.xml` and place it inside your mod's `Interface\EDI\` directory.

```xml
<?xml version="1.0" encoding="utf-8"?>
<EDIConfig>
    <!-- Layout configuration for the multi-choice list matrix -->
    <DialogueMenuLayout>
        <ListProperties>
            <MaxVisibleItems>6</MaxVisibleItems>
            <VerticalSpacing>32</VerticalSpacing>
            <PositionX>100</PositionX>
            <PositionY>540</PositionY>
            <Alignment>Left</Alignment>
        </ListProperties>

        <!-- Text styling parameters for the extended list -->
        <TextProperties>
            <FontName>$FontDF_B</FontName>
            <FontSize>22</FontSize>
            <NormalColor>0xFFFFFF</NormalColor>
            <SelectedColor>0x00FF00</SelectedColor>
            <DisabledColor>0x555555</DisabledColor>
        </TextProperties>
    </DialogueMenuLayout>
</EDIConfig>
```

**Key points:**
- `MaxVisibleItems` controls how many buttons are rendered before a scroll bar appears. Set this to match the size of the `String[]` array passed to `DisplayExtendedOptions` in your Papyrus controller.
- `VerticalSpacing` is the pixel gap between button rows. Increase this if button text clips with large font sizes.
- `PositionX` / `PositionY` are screen-space pixel coordinates for the top-left corner of the list. `PositionY: 540` places the list in the lower-left area of a 1080p viewport.
- `$FontDF_B` is the Fallout 4 bold UI font token. Other valid tokens include `$FontDF` (regular) and `$FontHUD` (HUD font).
- `NormalColor`, `SelectedColor`, and `DisabledColor` are hex ARGB values. The `0x` prefix is required; omitting the alpha channel defaults to fully opaque.
- Package this file inside your FOMOD under `Interface\EDI\` — EDI merges all XML files it finds in that folder at load time.

---

## Phase 3: Thread-Safe Memory Modification on Button Press

This bridge allows EDI menu selections to trigger real-time direct memory writes back into the engine via a C++ native function, using `VirtualProtect` to temporarily change page permissions around read-only data regions.

### C++ Direct Memory Writer (writer.cpp)

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/PapyrusVM.h"
#include "f4se/PapyrusNativeFunctions.h"
#include "f4se_common/Relocation.h"

#define TARGET_TELEMETRY_RVA 0x011D32A0

void WriteEngineMemoryValue(VirtualMachine* vm, UInt32 stackId, Variable* value, float afNewValue) {
    RelocPtr<float> engineDataTarget(TARGET_TELEMETRY_RVA);

    if (engineDataTarget.GetPtr()) {
        DWORD oldProtect;
        VirtualProtect((void*)engineDataTarget.GetPtr(), sizeof(float), PAGE_EXECUTE_READWRITE, &oldProtect);

        *engineDataTarget = afNewValue;

        VirtualProtect((void*)engineDataTarget.GetPtr(), sizeof(float), oldProtect, &oldProtect);

        _MESSAGE("Direct Memory Overwrite Committed. New value set: %f", afNewValue);
    }
}

bool RegisterMemoryWriter(VirtualMachine* vm) {
    vm->RegisterFunction(
        new NativeFunction1<Variable, void, float>(
            "CommitMemoryWrite", "HEW_EDIDialogueController", WriteEngineMemoryValue, vm
        )
    );
    return true;
}
```

**Key points:**
- `VirtualProtect` temporarily changes the memory page protection flags on the target address to `PAGE_EXECUTE_READWRITE`, allowing the write. The original protection is saved in `oldProtect` and restored immediately after the write.
- **Always restore `oldProtect` after the write.** Leaving pages as `EXECUTE_READWRITE` is a security risk and can cause anti-cheat or system integrity checks to flag the process.
- `VirtualProtect` is only necessary for addresses in read-protected or code-marked pages. Ordinary data globals are already writable and do not need this. Use it selectively.
- `NativeFunction1` takes one user-visible Papyrus argument (`float`). The function name `"CommitMemoryWrite"` and script name `"HEW_EDIDialogueController"` must match the Papyrus `native` declaration exactly.

### EDI Selection Handler (HEW_EDIDialogueController.psc update)

```papyrus
Scriptname HEW_EDIDialogueController extends Quest

import ExtendedDialogueInterface

; Declare the C++ native write function
Function CommitMemoryWrite(Float afNewValue) native

Event OnInit()
    EDI_API:GetAPI().RegisterCustomDialogueHandler(Self)
EndEvent

; Triggered by EDI when a selection is made from the 6-button matrix
Event OnCustomDialogueSelection(Int aiDialogueNodeId, Int aiSelectionIndex)
    If aiDialogueNodeId == 999
        If aiSelectionIndex == 1
            Debug.Notification("Optimizing Memory Engine Space...")
            CommitMemoryWrite(1.0)
        ElseIf aiSelectionIndex == 2
            Debug.Notification("Setting Timescale standard...")
            CommitMemoryWrite(20.0)
        EndIf
    EndIf
EndEvent
```

**Key points:**
- `OnCustomDialogueSelection` is the EDI callback for button press events. `aiDialogueNodeId` identifies which layout block was active; `aiSelectionIndex` is the zero-based index of the chosen button.
- `CommitMemoryWrite` declared `native` with no body routes directly to the registered C++ function. The float argument maps to `afNewValue` on the C++ side.
- Add additional `ElseIf aiSelectionIndex` branches for each button in your 6-option array. Index `0` is the first button, `5` is the last.

---

## Troubleshooting Focus

- **CustomEvent never fires (Phase 1)**: Verify the Quest is persistent (Start Game Enabled, not Run Once) and `ReceiveEngineData` is being called from inside a valid `AddTask` lambda where the VM pointer is non-null.
- **EDI list shows only 4 items (Phase 2)**: The XML file is not being found. Verify the path is exactly `Interface\EDI\ExtendedDialogueInterface.xml` inside your mod archive and that EDI is installed and loading your mod's Interface folder.
- **VirtualProtect fails silently (Phase 3)**: `VirtualProtect` returns 0 on failure. Add `if (!VirtualProtect(...)) { _MESSAGE("VirtualProtect failed: %d", GetLastError()); }` to diagnose. Failure usually means the address is in a guard page or the process does not have write access to the region.
- **Game crash after memory write (Phase 3)**: The RVA pointed to a code byte rather than a data float. Re-verify the RVA in IDA — look at the data type at the address (should show as a `float` global, not an instruction).
- **Wrong selection index (Phase 3)**: EDI selection indices are zero-based. If your options array has 6 strings, valid indices are 0–5. An off-by-one in the `ElseIf` chain silently skips the handler.
