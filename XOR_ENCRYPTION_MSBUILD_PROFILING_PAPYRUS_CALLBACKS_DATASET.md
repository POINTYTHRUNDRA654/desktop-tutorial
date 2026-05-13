# Symmetric XOR Packet Transform, VS2022 Profiling Configuration, and Papyrus Animation Callback Mapping

This dataset covers three practical implementation areas for an F4SE + dashboard toolchain: applying a lightweight symmetric XOR transform to outbound telemetry strings, configuring Visual Studio/MSBuild for profiler-friendly builds, and wiring Papyrus animation event callbacks so Havok graph state transitions can trigger gameplay and telemetry logic.

---

## Phase 1: Symmetric XOR Network Packet Encryptor (C++)

XOR is a reversible byte transform where the same key is used for both encrypt and decrypt operations:

`plain ^ key = cipher` and `cipher ^ key = plain`

```cpp
#include <string>

// Keep this private to the plugin binary and never expose to renderer/UI layers.
static const std::string g_NetworkCipherKey = "F4SE_SecureTelemetryKey_2026";

// Shared routine: XOR is symmetric, so this function both encrypts and decrypts.
std::string ApplyXorCipher(const std::string& input) {
    if (g_NetworkCipherKey.empty()) return input;

    std::string output = input;
    const size_t keyLen = g_NetworkCipherKey.size();

    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = static_cast<char>(
            static_cast<unsigned char>(output[i]) ^
            static_cast<unsigned char>(g_NetworkCipherKey[i % keyLen]));
    }
    return output;
}

std::string EncryptXORPayload(const std::string& rawJson) {
    return ApplyXorCipher(rawJson);
}

std::string DecryptXORPayload(const std::string& encryptedPayload) {
    return ApplyXorCipher(encryptedPayload);
}
```

**Node.js relay equivalent:**

```js
const key = Buffer.from("F4SE_SecureTelemetryKey_2026", "utf8");

function applyXorCipher(buf) {
  const out = Buffer.from(buf);
  for (let i = 0; i < out.length; i++) {
    out[i] = out[i] ^ key[i % key.length];
  }
  return out;
}
```

**Key points:**
- XOR obfuscates plaintext and prevents casual packet inspection, but it is **not cryptographically strong**. For hostile-network environments, use authenticated encryption (AES-GCM or ChaCha20-Poly1305).
- Keep the key in the native plugin side only; never expose it through Electron preload bridges or dashboard JavaScript.
- Always cast to `unsigned char` before XOR to avoid signed-char edge behavior on non-ASCII bytes.
- If packets are UTF-8 strings, XOR output may include non-printable bytes. Send as raw bytes or Base64-encode before JSON transport.
- Add protocol versioning (`cipher: "xor-v1"`) so both sides can negotiate and reject mismatched transforms cleanly.

---

## Phase 2: Visual Studio MSBuild Profiling Configuration

Use a dedicated configuration (for example `Profile|x64`) instead of modifying Release defaults.

### 1) C/C++ optimization settings

**Project Properties → Configuration Properties → C/C++ → Optimization**
- **Optimization**: `Maximize Speed (/O2)`
- **Favor Size or Speed**: `Favor Fast Code (/Ot)`
- (Optional for clearer call stacks) **Inline Function Expansion**: `Only __inline (/Ob1)` instead of aggressive inlining

### 2) Linker profiling/debug settings

**Project Properties → Configuration Properties → Linker → Debugging**
- **Generate Debug Info**: `Generate Debug Information (/DEBUG:FULL)`
- **Profile**: `Yes (/PROFILE)`

### 3) Useful matching flags (Property Pages or `.vcxproj`)

```xml
<ClCompile>
  <Optimization>MaxSpeed</Optimization>     <!-- /O2 -->
  <FavorSizeOrSpeed>Speed</FavorSizeOrSpeed><!-- /Ot -->
</ClCompile>
<Link>
  <GenerateDebugInformation>true</GenerateDebugInformation> <!-- /DEBUG -->
  <Profile>true</Profile>                                   <!-- /PROFILE -->
</Link>
```

**Key points:**
- `/O2` + `/Ot` gives realistic runtime behavior for stutter/perf analysis versus Debug builds.
- `/DEBUG:FULL` preserves richer symbols for stack inspection in Visual Studio Performance Profiler.
- `/PROFILE` helps retain frame-pointer/profiler metadata paths for call attribution.
- Prefer profiling with the same plugin load order and save state used in real gameplay to avoid false positives.
- Capture both CPU usage and ETW timeline views when measuring code cave impacts around hot paths.

---

## Phase 3: Papyrus Animation State Callback Mapping

Papyrus can subscribe to animation events emitted by Havok behavior graphs and react when named transitions occur.

```papyrus
Scriptname HEW_MechanicalStateFeedback extends ObjectReference

Function InitializeAnimationFeedbackHooks()
    ; Event names must exactly match HKX behavior event labels
    Self.RegisterForAnimationEvent(Self, "GateOpeningSequenceStart")
    Self.RegisterForAnimationEvent(Self, "GateOpeningSequenceComplete")
EndFunction

Event OnLoad()
    InitializeAnimationFeedbackHooks()
EndEvent

Event OnAnimationEvent(ObjectReference akSource, String asEventName)
    If akSource == Self
        If asEventName == "GateOpeningSequenceStart"
            Debug.Notification("[Mechanism Alert]: Heavy vault gate motors active.")
        ElseIf asEventName == "GateOpeningSequenceComplete"
            Debug.Notification("[Mechanism Alert]: Security matrix open.")

            ; Example integration point:
            ; call into telemetry/Papyrus-exposed native bridge here
        EndIf
    EndIf
EndEvent
```

**Key points:**
- Event label strings are case-sensitive and must match the exact names exported in the `.hkx` behavior graph.
- `OnLoad` is the safe place to register when using placed references; for dynamically spawned refs, also consider re-registering after attach/reset.
- Always guard with `akSource == Self` so unrelated nearby animation events do not trigger this object’s logic.
- Use notifications sparingly; use `Debug.Trace` for high-volume diagnostics to avoid UI spam.
- If the object can unload/reload repeatedly, maintain idempotent registration flow so callbacks remain reliable after cell transitions.

---

## Troubleshooting Focus

- **Encrypted packets arrive as invalid JSON (Phase 1):** You are attempting to parse XOR output before decrypting. Decrypt first, then JSON-parse.
- **Random garbled payloads under load (Phase 1):** Sender and receiver keys differ, or packet boundaries are not preserved (partial TCP frame handling bug). Reassemble full packets before decrypt.
- **Profiler shows flat/inaccurate stacks (Phase 2):** Symbols not loaded or wrong PDB version; verify build path, clean/rebuild, and point Visual Studio to current symbol output.
- **Stutter only in Profile build (Phase 2):** Diagnostic instrumentation overhead can shift timings; compare with pure Release to isolate tooling overhead from plugin logic cost.
- **`OnAnimationEvent` never fires (Phase 3):** Event label not present in HKX graph, wrong object instance, or script never registered due `OnLoad` not firing on expected ref.
- **Events fire twice (Phase 3):** Duplicate registration calls without state guard. Add a bool flag or explicit unregister/re-register pattern.

