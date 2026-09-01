# Deprecated Frameworks, Multi-Target CI, and Crash Log Diagnostics

## Overview

This guide covers three advanced topics for Fallout 4 modders targeting the 2025/2026 Anniversary Edition (AE) and Next-Gen (NG) engine:

1. **Deprecated mod frameworks** — which legacy systems must be avoided entirely in modern load orders and what replaces them.
2. **Multi-target C++ CI pipeline** — automating DLL compilation for both pre-NG and AE targets via GitHub Actions.
3. **Crash log diagnostics** — how to read engine stack overflow dumps to pinpoint version-mismatched memory hooks.

---

## Part 1 — Avoiding Obsolete Frameworks in Modern Modding

### Learning Objectives

- Identify and replace deprecated structural frameworks in modern load orders.
- Migrate legacy keyword distribution systems to lightweight modern alternatives.
- Debug UI and item crafting crashes caused by outdated master files.

### Deprecated Systems Reference

#### AWKCR (Armor and Weapon Keywords Community Resource)
**Status: CRITICAL DEPRECATION — DO NOT USE**

- **Problem**: Bloats save files with thousands of unused, redundant keywords. Causes severe workbench menu lag and is highly incompatible with modern 2025/2026 scripts. The sheer size of the keyword pool stresses the engine's form resolution pipeline on every cell load.
- **Modern replacement**: **ECO (Equipment and Crafting Overhaul)** or **NEO (New Equipment Overhaul)**. Both provide keyword distribution without the save-file weight, and both are designed against the NG/AE load order architecture.

#### Armorsmith Extended
**Status: DEPRECATED**

- **Problem**: Relies entirely on AWKCR as a master. Hard-overwrites vanilla armor slots, breaking modern body meshes and any clothing mod that uses dynamically assigned armor slots (the standard in 2025/2026 modding).
- **Modern replacement**: **LEO (Legendary Effect Overhaul)** paired with specialized RobCo Scripter configurations for slot management.

#### DEF_UI / DEF_HUD
**Status: CRITICAL ENGINE INCOMPATIBILITY**

- **Problem**: Hardcodes Interface `.swf` (Flash) container files compiled in 2015. The Next-Gen and Anniversary updates completely overhauled the in-game Creations store menu. The old interface files conflict with the new UI code and cause **instant crashes** whenever a player opens the pause menu or map.
- **Modern replacement**: **FallUI Suite** — specifically FallUI - HUD and FallUI - Inventory. These are built for the NG/AE interface layer.

### Module 9 Schema Reference

```json
{
  "fallout4_modding_course": {
    "module_9_deprecated_frameworks": {
      "lesson_title": "Avoiding Obsolete Frameworks in Modern Modding",
      "technical_blueprint": {
        "deprecated_systems": [
          {
            "framework_name": "AWKCR",
            "status": "CRITICAL DEPRECATION / DO NOT USE",
            "modern_replacement": "ECO or NEO"
          },
          {
            "framework_name": "Armorsmith Extended",
            "status": "DEPRECATED",
            "modern_replacement": "LEO + RobCo Scripter configurations"
          },
          {
            "framework_name": "DEF_UI / DEF_HUD",
            "status": "CRITICAL ENGINE INCOMPATIBILITY",
            "modern_replacement": "FallUI Suite (FallUI - HUD, FallUI - Inventory)"
          }
        ]
      }
    }
  }
}
```

### Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| Instant CTD when opening a weapons or armor workbench | Mod relies on AWKCR keyword linkages missing from a modern AE load order | Strip all AWKCR master references in xEdit; re-map recipe forms to vanilla crafting keywords or ECO keywords |
| Workbench menu extreme lag / freeze | AWKCR keyword bloat on every bench open | Remove AWKCR entirely; rebuild keyword assignments using ECO |
| Instant CTD when opening pause menu or map | DEF_UI `.swf` files conflict with the AE Creations menu interface code | Replace DEF_UI/DEF_HUD with FallUI Suite |
| Body mesh gaps or clipping after equipping armor | Armorsmith Extended hard-overwriting vanilla armor slots | Remove Armorsmith Extended; use LEO for slot management |

---

## Part 2 — Automated Multi-Target C++ Continuous Integration

### Architecture

To support both the modern AE user base and the legacy pre-NG community, developers use GitHub Actions to automatically compile both DLL variants on every push.

```
[GitHub Actions Multi-Target CI Architecture]
 ├── Step 1: Code Push  — trigger workflow on commit to 'main'
 ├── Step 2: Environment Provisioning — Windows runner + MSVC Build Tools
 ├── Step 3: Compile Target A — Pre-NG Address Library offsets (v1.10.163)
 └── Step 4: Compile Target B — Anniversary Edition offsets (v1.10.984+)
```

### Workflow File — `.github/workflows/build.yml`

Place this file inside your plugin repository:

```yaml
name: Multi-Target F4SE Plugin Compilation Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-variants:
    runs-on: windows-2022
    steps:
      - name: Checkout Code Repository Base
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Initialize Microsoft Visual Studio Build Toolchain
        uses: microsoft/setup-msbuild@v2

      - name: Build Pre-Next-Gen Legacy DLL Variant (v1.10.163)
        run: |
          msbuild /p:Configuration=Release_PreNG /p:Platform=x64 MyF4SEPlugin.sln
          copy bin\MyF4SEPlugin_PreNG.dll distribution\PreNG\Data\F4SE\Plugins\MyF4SEPlugin.dll

      - name: Build Modern Anniversary Edition DLL Variant (v1.10.984+)
        run: |
          msbuild /p:Configuration=Release_Anniversary /p:Platform=x64 MyF4SEPlugin.sln
          copy bin\MyF4SEPlugin_Anniversary.dll distribution\Anniversary\Data\F4SE\Plugins\MyF4SEPlugin.dll

      - name: Upload Finished Multi-Version Release Artifact Packages
        uses: actions/upload-artifact@v4
        with:
          name: Compiled-F4SE-Plugins
          path: distribution/
```

### Key Teaching Points

- **Two MSBuild configurations** (`Release_PreNG` and `Release_Anniversary`) are defined in the `.vcxproj` file, each linking against the appropriate CommonAddressLibrary `.bin` database for its target version.
- The `submodules: recursive` checkout flag pulls the Address Library as a git submodule automatically — do not hardcode the CAL header path.
- Artifacts are uploaded under a single `Compiled-F4SE-Plugins` archive containing both `PreNG/` and `Anniversary/` subdirectories, making it straightforward for the release step or a mod manager installer (FOMOD) to pick the correct DLL based on the user's game version.
- Use `windows-2022` (not `windows-latest`) for reproducibility; MSVC toolchain versions can shift between `windows-latest` updates.

### Project Setup Requirements

In your `.vcxproj`, define the two configurations:

```xml
<!-- Release_PreNG configuration -->
<PropertyGroup Condition="'$(Configuration)'=='Release_PreNG'">
  <PreprocessorDefinitions>PLUGIN_TARGET_PRENG;%(PreprocessorDefinitions)</PreprocessorDefinitions>
  <!-- Link against CAL pre-NG .bin database -->
</PropertyGroup>

<!-- Release_Anniversary configuration -->
<PropertyGroup Condition="'$(Configuration)'=='Release_Anniversary'">
  <PreprocessorDefinitions>PLUGIN_TARGET_AE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
  <!-- Link against CAL AE .bin database -->
</PropertyGroup>
```

Then in code, guard version-specific address IDs with those defines:

```cpp
#if defined(PLUGIN_TARGET_AE)
    REL::ID applyDamageID(26104);   // AE 2025/2026
#elif defined(PLUGIN_TARGET_PRENG)
    REL::ID applyDamageID(12431);   // Pre-NG
#endif
```

---

## Part 3 — Debugging Engine Stack Overflows Across Versions

### Overview

When the game crashes, the engine dumps active memory addresses into a log file if **X-Cell** (the modern 2025/2026 crash logger) is installed. Students must learn to read these dumps to pinpoint why a script or plugin failed.

> **Note**: Buffout 4 has been superseded by X-Cell as the primary crash logger for NG/AE installations. If a student is still using Buffout 4 alone, advise them to migrate to X-Cell for accurate NG/AE crash reports.

### Case Study: Reading a Call-Stack Trace

A student submits a crash log containing the following memory dump:

```
PROBABLE CALL STACK:
[0] 0x7FF7F3A210A4  Fallout4.exe+12410A4  -> Virtual function tracking hook loop
[1] 0x7FF8A214B102  F4SE_Plugin_Custom.dll+0x02B102  -> Injected function loop
[2] 0x7FF7F2913A11  Fallout4.exe+0x913A11  -> Papyrus Virtual Machine stack runner
[3] 0x01F2B3041A90  (Virtual Memory Address Space allocated to Active Script Arrays)
```

#### Step 1 — Decode the Crash Log Elements

- **Entry `[1]`** (`F4SE_Plugin_Custom.dll+0x02B102`) points directly to a custom F4SE plugin. This tells you the crash was not a vanilla engine bug — it originated in a custom code injection.
- **Entry `[0]`** (`Fallout4.exe+12410A4`) is the precise instruction offset where the engine faulted while processing data from the plugin's hook.

#### Step 2 — Version Validation

Check the crash address offset against the target engine version map:

- If the crash log confirms the user is running **Anniversary Edition (v1.10.984)**, but the offset `+12410A4` maps to a function that exists in the **Pre-Next-Gen (v1.10.163)** executable layout, the plugin is pointing to the wrong memory location.
- **Result**: The plugin tried to read a memory address that no longer exists in the updated game code — an **Access Violation Exception (0xC0000005)**, causing an instant CTD.

#### Step 3 — Apply the Structural Code Fix

Replace any hardcoded memory offsets with dynamic `REL::ID` lookups via the CommonAddressLibrary:

```cpp
// ANTI-PATTERN: Hardcoded offset — breaks on any engine update
// uintptr_t TargetFunctionAddress = RelocationManager::BaseAddress + 0x12410A4;

// CORRECT APPROACH: Dynamic Address ID — resolves correctly on every build
#include "REL/Relocation.h"

void InjectEngineMemoryPatch()
{
    // REL::ID 58319 automatically resolves to the correct virtual address
    // regardless of whether the player is on Next-Gen or Anniversary Edition
    REL::Relocation<uintptr_t> targetFunction(REL::ID(58319));

    // Safely write memory modifications (3-byte NOP sled example)
    SafeWriteBuf(targetFunction.address(), "\x90\x90\x90", 3);
}
```

### Crash Log Diagnostic Checklist

1. **Identify the faulting module** — is it `Fallout4.exe`, an F4SE plugin DLL, or a third-party DLL?
2. **Extract the offset** — note the hex value after `+` (e.g., `+12410A4`).
3. **Cross-reference the offset** against the Address Library for the user's reported game version. If the offset doesn't appear in the CAL database for that version, the plugin was built for a different version.
4. **Check for AWKCR / DEF_UI masters** in the load order — their presence alone can produce crash stacks that look like engine faults.
5. **Confirm X-Cell is installed** (not only Buffout 4) for complete NG/AE crash data.
6. **Request the full log, not a screenshot** — truncated screenshots cut off the most useful lower stack frames.

---

## Quick Reference Summary

| Topic | Anti-Pattern | Correct Approach |
|---|---|---|
| Armor keyword framework | AWKCR | ECO or NEO |
| Armor slot management | Armorsmith Extended | LEO + RobCo Scripter |
| Interface/HUD mod | DEF_UI / DEF_HUD | FallUI Suite |
| C++ multi-version build | Single hardcoded configuration | GitHub Actions with `Release_PreNG` + `Release_Anniversary` configs |
| Memory address resolution | `BaseAddress + 0x12410A4` | `REL::Relocation<uintptr_t>(REL::ID(58319))` |
| Crash logging on NG/AE | Buffout 4 alone | X-Cell (primary) |
| Workbench CTD diagnosis | Assume engine bug | Check AWKCR references in xEdit first |
