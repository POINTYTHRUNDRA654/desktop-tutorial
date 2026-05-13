# Navigating Next-Gen and Anniversary Engine Updates

## Overview

For a Fallout 4 modder, understanding the distinction between the **Next-Gen (NG) Patch** (April 2024) and the **Anniversary Edition (AE) Update** (late 2025) is essential. They are **not** the same thing. Both share the updated engine, but they serve different roles:

- **Next-Gen Patch**: A forced, free engine overhaul that changed the core game compilation format, memory addressing, native 4K console support, and `.ba2` archive headers.
- **Anniversary Edition**: A content bundle and UI upgrade built *on top of* the Next-Gen engine. It modernises the in-game shop into the "Creations" menu, auto-packages bundled Creation Club DLCs, and delivers an engine bug-fix update that resolves lingering issues introduced by the initial Next-Gen patch.

---

## 1. The .BA2 File Header Version Shift

The engine change directly impacts how assets are read.

| Game Version | BA2 Header Version | Behaviour |
|---|---|---|
| Pre-Next-Gen (1.163 and older) | Version 1 | Standard archive format for legacy mod tools |
| Next-Gen & Anniversary Edition | **Version 2** | Required — old headers are ignored or cause CTD |

### Tutor Rule

Teach students to configure Archive2.exe (or any BA2 packing tool) to target **Header Version 2** explicitly, unless they are intentionally building for the legacy pre-Next-Gen game community.

If a mod is packed with an outdated tool that outputs Version 1 headers, the modern engine will silently ignore the archive or crash to desktop. This is a common silent-failure mode that beginners confuse with a load-order problem.

---

## 2. The Native Face-Gen Stutter Fix (Anniversary Patch Advantage)

### The Next-Gen Flaw (2024)

The initial Next-Gen patch introduced a severe engine bug: if a mod altered any NPC's facial data record via a plugin (`.esp`/`.esl`), the engine would stutter violently for several frames every time that NPC loaded into the current cell. Modders were forced to use workarounds such as face-data stripping scripts or avoid editing facial records entirely.

### The Anniversary Resolution (2025)

The late 2025 Anniversary engine update **completely removed** the face-gen data stutter bug. The standard NPC facial data workflow is fully restored.

### Tutor Rule

Instruct custom character and companion modders that they **no longer need face-data stripping workarounds**, provided their end users are running the Anniversary-era engine (late 2025 or newer). Always note the minimum engine version requirement in a mod's description so users know which runtime is required.

---

## 3. Creation ID Master Constraints & Memory Allocation

### Next-Gen Limitations

The initial Next-Gen switch expanded console mod storage space but left the internal plugin index limits for official Creations restricted.

### Anniversary Upgrades

The Anniversary update:
- Expands console internal mod storage up to **100 GB** on select platforms.
- Re-allocates structural memory boundaries to accommodate the high volume of official Creation bundle plugins injected into the load order.
- Natively injects dozens of new `.esl` and `.esp` official master records into every player's game.

### Tutor Rule

Because the Anniversary Edition injects many new official master records automatically, students must write scripts that use **defensive validation** before referencing vanilla properties. Use `Game.IsPluginInstalled()` to check for the presence of a bundled Creation before accessing any of its Form IDs, preventing ID conflicts with the newly bundled items.

**Example defensive pattern (Papyrus):**

```papyrus
; Check before referencing a bundled Creation's form
if Game.IsPluginInstalled("ccXXXFO4001-PipBoy(Black).esl")
    ; Safe to reference forms from this Creation
    Actor kTarget = Game.GetForm(0xFE000800) as Actor
    ; ... rest of logic
endIf
```

---

## 4. F4SE & Address Library Compatibility

### Symptom
F4SE script plugin states fail to execute or produce severe memory dump errors on an Anniversary Edition installation.

### Cause
C++ plugins that target memory offsets mapped for the 2024 Next-Gen branch break when the late 2025 Anniversary compilation update shifts those offsets.

### Resolution
Update the plugin's Address Library target headers to match the latest build version, or utilise the modern **CommonAddressLibrary** (CAL) database offsets. Do not ship plugins that hard-code version-specific memory addresses without an address library abstraction.

---

## 5. BA2 Header Diagnostic Checklist

When a student reports invisible textures, missing meshes, or unexplained CTDs on a Next-Gen or Anniversary installation, run through this checklist:

1. **Verify archive tool version**: Is Archive2.exe or Cathedral Assets Optimizer (CAO) configured for BA2 Header Version 2?
2. **Check the pack log**: Does the log show `Header: 1`? If so, repack with the correct version flag.
3. **Confirm game version**: Run the game executable and check the title screen version number. Pre-1.10.980 = legacy; 1.10.980+ = Next-Gen/AE.
4. **Test with loose files**: Temporarily unpack the BA2 and test with loose files to confirm the content itself is valid before blaming the archive.
5. **Check load order for injected masters**: Use xEdit to verify no FormID conflicts with newly bundled AE Creation masters.

---

## Module 8 Schema Reference

```json
{
  "fallout4_modding_course": {
    "module_8_engine_version_control": {
      "lesson_title": "Navigating Next-Gen and Anniversary Engine Updates",
      "technical_blueprint": {
        "ba2_header_rule": "Next-Gen and Anniversary execution runtimes require BA2 archives using Header Format Version 2. Standard Pre-Next-Gen mod tools output Version 1, causing texture masking and mesh invisible loading errors.",
        "resolved_engine_bugs": "Anniversary patch fixes the Next-Gen FaceGen runtime performance stutter and restores standard structural VATS accuracy logic fields."
      },
      "troubleshooting_guide": [
        {
          "symptom": "F4SE script plugin states fail to execute or produce severe memory dump errors on an Anniversary Edition installation.",
          "cause": "The C++ plugin targets memory offsets mapped for the 2024 Next-Gen branch, which shifted during the late 2025 Anniversary compilation update.",
          "resolution": "Update the plugin's Address Library target headers to match the latest build version or utilise the modern CommonAddressLibrary database offsets."
        }
      ]
    }
  }
}
```

---

## Quick Reference Summary

| Topic | Pre-Next-Gen | Next-Gen (2024) | Anniversary (2025) |
|---|---|---|---|
| BA2 Header Version | 1 | **2** | **2** |
| Face-Gen NPC stutter | None | **Present (critical bug)** | **Fixed** |
| Plugin index limits | Standard | Expanded (console) | Further expanded |
| Official master injection | Minimal | Moderate | **Heavy (dozens of .esl/.esp)** |
| F4SE address offsets | Legacy | 2024 branch | **2025 branch** |
