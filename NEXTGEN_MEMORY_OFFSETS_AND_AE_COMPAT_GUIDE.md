# Memory Offset Mapping, Anniversary Compatibility Checks, and Downgrade Pipeline

## Overview

This guide covers three advanced topics for Fallout 4 C++ and Papyrus modders targeting both the 2024 Next-Gen (v1.10.980–v1.10.984) and 2025/2026 Anniversary Edition executable builds:

1. **Shifted engine memory offsets** — how virtual address IDs change between builds and how to resolve them safely.
2. **Scripted Anniversary content checks** — a Papyrus pattern for detecting AE master files and branching behaviour accordingly.
3. **Backward-compatibility downgrade pipeline** — how to fetch pre-Next-Gen binaries and re-package archives for legacy testing.

---

## Part 1 — Memory Offset Mapping: Next-Gen vs. Anniversary Update

### Learning Objectives

- Map critical virtual engine functions across shifting executable layouts.
- Update structural memory hooks to prevent runtime address violation exceptions.
- Implement Address Library lookups that dynamically resolve pointer offsets.

### Why Offsets Shift

Each time Bethesda recompiles `Fallout4.exe`, the linker places functions at different virtual addresses. The relocation affects central virtual method tables (VTables) for classes such as `Actor`, `PlayerCharacter`, and `TESObjectREFR`. A C++ plugin that hard-codes the virtual address from one build will either silently crash or throw an access violation on a different build.

**Rule**: Always use structural Address IDs from the CommonAddressLibrary (CAL) database rather than raw virtual memory addresses.

### Critical Address ID Shifts

| Function | Pre-Next-Gen ID | Next-Gen 2024 ID | Anniversary 2025/2026 ID |
|---|---|---|---|
| `PlayerCharacter::UpdateCombat` | 41253 | 56122 | **58319** |
| `Actor::ApplyDamage` | 12431 | 24901 | **26104** |
| `BGSAnimationSystem::ProcessEvents` | 89124 | 91043 | **93152** |

> These IDs are resolved at runtime by the Address Library. The game build version is detected automatically, and the library maps the abstract ID to the correct virtual address for that executable.

### Implementation Pattern (C++)

```cpp
// BAD — hardcoded RVA, breaks on any new build
uintptr_t applyDamageAddr = REL::Offset(0x5E1A40).address();

// GOOD — resolved via Address Library ID, cross-version safe
REL::ID applyDamageID(26104);  // AE 2025/2026 address ID
auto applyDamageAddr = applyDamageID.address();
```

Always re-verify IDs against the current CAL database file after any game patch. The database file name encodes the build version (e.g., `version-1.10.984-0.bin`).

### Module 8 Submodule Schema Reference

```json
{
  "fallout4_modding_course": {
    "module_8_submodule_memory_offsets": {
      "lesson_title": "Memory Offset Mapping: Next-Gen vs. Anniversary Update",
      "technical_blueprint": {
        "engine_architecture": {
          "vtable_shifts": "Relocation of central VTables for Actor, PlayerCharacter, and TESObjectREFR.",
          "relocation_mapping": "Use structural Address IDs rather than raw virtual memory addresses."
        },
        "critical_address_shifts": [
          {
            "function_name": "PlayerCharacter::UpdateCombat",
            "pre_next_gen_id": 41253,
            "next_gen_2024_id": 56122,
            "anniversary_2025_2026_id": 58319
          },
          {
            "function_name": "Actor::ApplyDamage",
            "pre_next_gen_id": 12431,
            "next_gen_2024_id": 24901,
            "anniversary_2025_2026_id": 26104
          },
          {
            "function_name": "BGSAnimationSystem::ProcessEvents",
            "pre_next_gen_id": 89124,
            "next_gen_2024_id": 91043,
            "anniversary_2025_2026_id": 93152
          }
        ]
      },
      "troubleshooting_guide": [
        {
          "symptom": "F4SE C++ plugin logs show 'Failed to locate critical memory address' or cause a silent instant crash on game boot.",
          "cause": "Plugin is hardcoding outdated virtual addresses from older executables.",
          "resolution": "Replace hardcoded addresses with REL::ID macro lookups using the updated CommonAddressLibrary database matching the target executable version."
        }
      ]
    }
  }
}
```

### Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| F4SE log shows `Failed to locate critical memory address` | Plugin hardcodes virtual addresses from an older build | Replace with `REL::ID` lookups using the updated CAL database |
| Silent instant crash on game boot | Address ID maps to wrong memory region on current build | Re-check IDs against the build-specific CAL `.bin` file |
| Plugin works on NG but crashes on AE | IDs were updated for NG but not AE branch | Update IDs to the Anniversary 2025/2026 column in the shift table |

---

## Part 2 — Scripted Anniversary Content Checks (Papyrus)

### The Problem

The Anniversary Edition injects unique master files (`.esm`) and bundled Creation Club packages into every player's load order automatically. A mod that references a form from one of these masters without first confirming the master is present will throw a `None` reference error or produce incorrect behaviour on setups where those masters are absent (e.g., a user who has not yet updated to AE).

### Detection Pattern

```
[Anniversary Content Detection Loop]
 ├── Step 1: Query the Global Mod Manager Array via Script Methods
 ├── Step 2: Validate the Presence of Specific Anniversary Master Files
 ├── Step 3: Fork Execution Paths Based on Content Detection Rules
 └── Step 4: Gracefully Fail or Fall Back if Essential Content is Missing
```

### AnniversaryCompatibilityController.psc

```papyrus
Scriptname AnniversaryCompatibilityController extends Quest

; Struct containing metadata for specific Anniversary content packs
Struct ContentPack
    String MasterName
    Int MinimumVersion
EndStruct

ContentPack[] Property AnniversaryPacks Auto Const
Bool Property IsAnniversaryEngineActive = False Auto Hidden

Event OnQuestInit()
    EvaluateEngineEnvironment()
EndEvent

Function EvaluateEngineEnvironment()
    Debug.Trace("[MOD_CHECK] Initializing system platform compatibility sweep...")

    ; Check if the user is running the updated Anniversary execution layout
    if (Game.IsPluginInstalled("Fallout4 - Creations.esm"))
        IsAnniversaryEngineActive = True
        Debug.Trace("[MOD_CHECK] Anniversary engine architecture detected. Enabling native FaceGen fixes.")
    else
        Debug.Trace("[MOD_CHECK] Legacy or pre-NG engine detected. Activating performance fallbacks.")
    endif

    ; Iterate through content packs to check for bundled DLCs
    Int i = 0
    While (i < AnniversaryPacks.Length)
        if (Game.IsPluginInstalled(AnniversaryPacks[i].MasterName))
            InitializeContentBridge(AnniversaryPacks[i].MasterName)
        else
            Debug.Trace("[MOD_CHECK] Optional content missing: " + AnniversaryPacks[i].MasterName)
        endif
        i += 1
    EndWhile
EndFunction

Function InitializeContentBridge(String asMasterName)
    Debug.Trace("[MOD_CHECK] Content bridge created successfully for: " + asMasterName)
    ; Fire custom initialization events or adjust leveled lists safely here
EndFunction
```

### Key Teaching Points

- **`Game.IsPluginInstalled()`** is the correct defensive gate. Never reference a form from an optional master without this check.
- The `Fallout4 - Creations.esm` master is the canonical signal that the Anniversary layer is active.
- `IsAnniversaryEngineActive` is exposed as a hidden property so other scripts on the same quest can read it with `GetPropertyValue`.
- The `ContentPack` struct approach scales cleanly: populate `AnniversaryPacks` in the CK with the list of optional masters your mod cares about, and the loop handles all of them uniformly.
- Always attach this kind of controller to a **Start Game Enabled** quest so `OnQuestInit` fires reliably on every load.

---

## Part 3 — Environment Downgrading for Backward Compatibility

Some modders build and test against the pre-Next-Gen executable to serve the legacy community or because the older toolchain is more stable for their workflow. This section documents the complete downgrade pipeline.

```
[Development Downgrade Pipeline]
 ├── Step 1: Clear current game data folders and establish backup directories
 ├── Step 2: Fetch legacy binary files using Steam Console Depot manifests
 ├── Step 3: Replace Next-Gen/Anniversary executables with Pre-Next-Gen binaries
 └── Step 4: Down-convert BA2 archives from Header Format Version 2 to Version 1
```

### Step 1 — Fetch Legacy Binaries via Steam Depot Manifests

Open the Steam Console (`steam://open/console` in your browser address bar) and run these commands to download the pre-Next-Gen (v1.10.163) files:

```bash
# Download the core Pre-Next-Gen executable binary package (v1.10.163)
download_depot 377160 377161 4875416049448831327

# Download the matching original asset configuration scripts profile
download_depot 377160 377163 1034440628283526848
```

The files download to your Steam `depotcache` folder. Copy `Fallout4.exe` and any matching `.dll` files into your working game directory, replacing the current Next-Gen/AE versions.

> **Warning**: Keep a backup of your current AE/NG executables before replacing them. Never commit executables to version control.

### Step 2 — Automated Python BA2 Down-Converter

Anniversary and Next-Gen builds pack textures and meshes into BA2 Header Version 2 archives, which the pre-Next-Gen engine cannot read. Use this Python script to extract and repack assets into Version 1 archives using a legacy Archive2.exe:

```python
import os
import subprocess

def downconvert_archive_pipeline(archive_v2_path, output_dir, archive2_legacy_exe):
    """
    Extracts a Version 2 Next-Gen/Anniversary BA2 archive and recompiles it
    into a Version 1 Pre-Next-Gen compatible BA2 container.
    """
    print(f"[DOWNGRADE] Initializing processing on: {archive_v2_path}")

    # Define intermediate extraction path
    extraction_target = os.path.join(output_dir, "extracted_loose_files")

    # Step 1: Extract the Version 2 BA2 using a modern Archive2 build
    extract_cmd = f'"{archive2_legacy_exe}" "{archive_v2_path}" -x "{extraction_target}"'
    subprocess.run(extract_cmd, shell=True, check=True)

    # Step 2: Repack with legacy Archive2 enforcing Version 1 headers (-f H1)
    output_ba2_v1 = archive_v2_path.replace(".ba2", "_Legacy_V1.ba2")
    repack_cmd = f'"{archive2_legacy_exe}" "{extraction_target}" -c "{output_ba2_v1}" -f H1'
    subprocess.run(repack_cmd, shell=True, check=True)

    print(f"[DOWNGRADE] Conversion successful. Output: {output_ba2_v1}")


if __name__ == "__main__":
    downconvert_archive_pipeline(
        archive_v2_path="Data\\MyMod - Textures.ba2",
        output_dir="C:\\Modding_Workspace\\DowngradeOutput\\",
        archive2_legacy_exe="C:\\Modding_Tools\\LegacyArchive2\\Archive2.exe"
    )
```

**Teaching notes**:
- The `-f H1` flag tells the legacy Archive2 wrapper to write Version 1 headers.
- Always extract first using a build of Archive2 that understands Version 2 input; the legacy executable used for the repack only needs to write Version 1 output.
- The output filename gets `_Legacy_V1` appended to avoid overwriting the original.

### Step 3 — Finalise Plugin Header Version in xEdit

After downgrading binaries and archives, the mod plugin itself must also declare compatibility with the pre-Next-Gen format:

1. Open your `.esp` or `.esl` in **xEdit / FO4Edit**.
2. Expand the **File Header** block.
3. Locate the **HEDR - Version** record.
4. Change the value:
   - `1.0` = Next-Gen / Anniversary metadata format
   - `0.95` = Standard Pre-Next-Gen metadata format ← set this for legacy targets
5. Save. The plugin will now load cleanly on pre-Next-Gen setups without startup errors or interface corruption.

> **Reminder**: If you later publish for the modern (AE) audience, revert the HEDR version back to `1.0` and repack your BA2 archives in Version 2 format.

---

## Quick Reference

| Task | Tool | Key Parameter |
|---|---|---|
| Resolve engine function address | `REL::ID` + CAL `.bin` | Use AE 2025/2026 ID column |
| Detect AE layer in Papyrus | `Game.IsPluginInstalled()` | `"Fallout4 - Creations.esm"` |
| Pack archives for modern engine | Archive2 / CAO | BA2 Header **Version 2** |
| Pack archives for legacy engine | Legacy Archive2 | `-f H1` (Version 1) |
| Plugin header for modern engine | xEdit HEDR field | `1.0` |
| Plugin header for legacy engine | xEdit HEDR field | `0.95` |
| Fetch pre-NG executable | Steam Console | `download_depot 377160 377161 4875416049448831327` |
