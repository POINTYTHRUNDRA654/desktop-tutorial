# Capstone Exam, Curriculum Index, and Script Performance Rubric

## Overview

This document contains the final graduation milestone for the Advanced Fallout 4 Modding curriculum, the complete course module index, the student script optimisation evaluation rubric, and the automated performance validation script template.

---

## Module 10 — Capstone Project: The Next-Gen Modular Energy Weapon Integration

### Project Summary

Students must design, build, script, and distribute a lore-friendly, modular energy weapon asset from scratch that **functions identically on both Pre-Next-Gen and Anniversary Edition game engines**. This assignment forces integration of every discipline covered in the course: Asset Pipelines, Scripting, Engine Modification, and Platform Version Control.

### Core Deliverables

#### Deliverable 1 — 3D Asset & Material Pipeline

A customised 3D weapon model meeting all of the following requirements:

- Geometry: low-poly target of **< 35,000 triangles**
- UV layout: tight, no overlapping islands except intentional mirrored symmetry
- Texture maps: custom packed PBR material sheets:
  - `_d.dds` — base colour / diffuse
  - `_n.dds` — normal map with gloss packed into alpha
  - `_s.dds` — specular / surface response
- Material: all texture references wired through a relative `.BGSM` file path (no absolute paths)
- NIF: sanitised with NifSkope's *Spells → Optimize → Clean Nifty String Index Table* before submission

#### Deliverable 2 — State-Driven Papyrus Injection Script

An optimised, event-based Papyrus script that:

- Is attached to a **Start Game Enabled** injector quest
- Pushes the weapon item into leveled lists **at runtime** without hard-overwriting any default master leveled list record
- Uses **no** `RegisterForUpdate()` or blocking `while`/`Utility.Wait` polling patterns
- Manages state transitions cleanly with Papyrus `State` blocks
- Self-terminates the quest after injection is complete to purge from memory

#### Deliverable 3 — F4SE C++ Plugin

A C++ plugin that:

- Implements a custom memory-hook modifying **recoil scaling mechanics** based on weapon charge state
- Resolves all engine function addresses via **`REL::ID` / CommonAddressLibrary** — zero hardcoded offsets
- Provides two compiled variants (Pre-NG and AE) built from the same source using `#if defined(PLUGIN_TARGET_AE)` / `#if defined(PLUGIN_TARGET_PRENG)` guards

#### Deliverable 4 — Dual-Compiled FOMOD Distribution Package

A release ZIP containing:

- `FOMOD/info.xml` — mod metadata
- `FOMOD/ModuleConfig.xml` — installer logic that **auto-detects the user's engine version** (by checking for `Fallout4 - Creations.esm`) and installs the matching DLL variant
- Pre-NG DLL path: `Data/F4SE/Plugins/MyWeaponPlugin.dll`
- AE DLL path: `Data/F4SE/Plugins/MyWeaponPlugin.dll` (same destination, different binary)

### Submission Criteria

#### Repository Requirement

The final project must be pushed to a **public Git repository** with:

- An optimised `.gitignore` excluding build artefacts but not binary mod files
- **Git LFS** configured to track all binary asset forms:

  ```gitattributes
  *.esp filter=lfs diff=lfs merge=lfs -text
  *.nif filter=lfs diff=lfs merge=lfs -text
  *.dds filter=lfs diff=lfs merge=lfs -text
  *.ba2 filter=lfs diff=lfs merge=lfs -text
  ```

#### CI Requirement

The repository must include an active GitHub Actions workflow (`.github/workflows/build.yml`) that:

- Builds **error-free** for both `Release_PreNG` and `Release_Anniversary` MSBuild configurations
- Uploads compiled DLLs as release artifacts

### Module 10 Schema Reference

```json
{
  "fallout4_modding_course": {
    "module_10_capstone_exam": {
      "project_title": "The Next-Gen Modular Energy Weapon Integration Assignment",
      "core_deliverables": [
        "3D weapon <35k tris with packed PBR maps and relative .BGSM paths",
        "State-driven event-based Papyrus leveled list injector quest",
        "F4SE C++ recoil hook with REL::ID address resolution, dual-compiled",
        "FOMOD installer auto-detecting engine version and provisioning matching DLL"
      ],
      "submission_criteria": {
        "repository_requirement": "Public Git repo with .gitignore and Git LFS tracking .esp/.nif/.dds",
        "ci_requirement": "GitHub Actions workflow building error-free for Pre-NG and AE targets"
      }
    }
  }
}
```

---

## Comprehensive Course Curriculum Index (2025/2026 Engine Specifications)

### Module 1 — High-Fidelity 3D Asset & .NIF Optimisation Pipeline

- **Module 1A** — High-to-Low Poly Baking Protocols (MikkTSpace Standards)
- **Module 1B** — Custom PBR Shader Channel Packing Configuration (`_d.dds`, `_n.dds`, `_s.dds`)
- **Module 1C** — Material Node Assembly, Relative File Linking, and `.BGSM` Mapping
- **Module 1D** — NifSkope File Sanitisation & String Index Table Optimisation

### Module 2 — High-Performance Event-Driven Papyrus Scripting

- **Module 2A** — Eliminating `OnUpdate()` Polling (the Engine Performance Anti-Pattern)
- **Module 2B** — Implementing State-Driven Architectures and Logic Control Blocks
- **Module 2C** — Safe Memory & Array Management (Avoiding Save-Game Bloating)
- **Module 2D** — Short-Lived Quest Structuring and Runtime Instance Termination Loops

### Module 3 — Advanced Optimisation & In-Game Systems Integration

- **Module 3A** — Worldspace Performance Finalisation (Precombines `.ucb` and Previs `.uvd` Generation)
- **Module 3B** — FormID Mapping Boundaries & ESL Flagging Constraints (`0x000` to `0xFFF` limits)
- **Module 3C** — Custom Object Modifications (OMODs), Attach Points (AP), and Mod Association (MA) Setup
- **Module 3D** — Sound Engineering, Dialogue Ingestion, and Custom Lip-Sync (`.FUZ`) Compilation

### Module 4 — User Interfaces, Physics, and Advanced Infrastructure

- **Module 4A** — Mod Configuration Menu (MCM) Integration (JSON Structs + Papyrus Event Handlers)
- **Module 4B** — Havok Collision Geometry Synthesis and Rig Body Convex Hull Mapping
- **Module 4C** — Particle Effect Lighting Shaders, Projectile Mesh Generation, and UV Velocity Scrolling
- **Module 4D** — Havok Cloth Physics Constraint Rigging for Dynamic Vertex Simulation

### Module 5 — Cross-Generation Compatibility & Software Architecture

- **Module 5A** — FOMOD Graphical Installer Script Generation (`info.xml` + `ModuleConfig.xml`)
- **Module 5B** — Low-Level C++ Engine Hook Architecture Setup and Address Library Resolution
- **Module 5C** — Multi-Target Automated Compilation Pipelines (GitHub Actions Workflows)
- **Module 5D** — Call-Stack Trace Analysis, Version Offsets, and Memory Dump Debugging Protocols

### Extended Modules (Engine Version Control Series)

| Module | Topic | Key Document |
|---|---|---|
| 8 | Next-Gen vs Anniversary Engine Updates | `NEXTGEN_VS_ANNIVERSARY_ENGINE_GUIDE.md` |
| 8 (sub) | Memory Offset Mapping & BA2 Downgrade Pipeline | `NEXTGEN_MEMORY_OFFSETS_AND_AE_COMPAT_GUIDE.md` |
| 9 | Deprecated Frameworks, CI, and Crash Log Diagnostics | `DEPRECATED_FRAMEWORKS_CI_AND_CRASH_LOG_GUIDE.md` |
| 10 | Capstone Exam | This document |

---

## Student Script Optimisation Evaluation Rubric

The AI tutor applies this weighted rubric when evaluating student Papyrus script submissions.

### Grading Criteria

| Metric | Target / Benchmark | Weight | Instant Failure Condition |
|---|---|---|---|
| **Logic Execution Paradigm** | 100% event-driven. Script must remain completely idle until kicked off by explicit remote or animation engine registration hooks. | 35% | Any use of `RegisterForUpdate()` or active `while`-loop polling delays. |
| **State Separation Efficiency** | State-driven workflow separation. Complex multi-stage tracking must use distinct Papyrus `State` blocks. | 25% | Heavily nested `if/else` chains recalculating conditional state on every function call. |
| **Save-Game Footprint Safety** | Explicit memory tracking. Scripts processing external data arrays must execute self-termination hooks to purge structural data traces. | 20% | Unrestricted array expansion or background quests left running indefinitely in runtime memory. |
| **Variable Scope Configuration** | Strict scope enforcement. Immutable parameters use `Const` indicators; lookups use global property tables. | 20% | Global arrays abused as general-purpose storage, or recursive variable paths creating circular references. |

### Scoring Guide

- **90–100%**: Exceeds optimisation targets. Script is publishable as a community reference implementation.
- **75–89%**: Meets all targets. Minor style issues only; ready for release with light polish.
- **50–74%**: Partial compliance. One or more instant-failure conditions present; mandatory revision required.
- **< 50% or any instant failure**: Fail. Student must review the relevant module and resubmit.

---

## Automated Script Performance Validation — `StudentPerformanceValidator.psc`

### Purpose

This Papyrus script is the AI tutor's testing harness. It hooks into a student's submitted script, fires 1000 asynchronous test events, measures total execution time, and logs a pass/fail report against the 0.05-second benchmark.

```papyrus
Scriptname StudentPerformanceValidator extends Quest

; Reference to the student script asset being evaluated
Form Property StudentSubmissionQuest Auto Const
String Property LogName = "StudentEvaluationLogs" Auto Const

Event OnQuestInit()
    Debug.OpenUserLog(LogName)
    RunOptimizationAudit()
EndEvent

Function RunOptimizationAudit()
    Debug.WriteToUserLog(LogName, "[AUDIT] Starting automated structural optimization audit...")

    Float StartTime = Utility.GetCurrentRealTime()

    ; Fire 1000 async test events against the student's submission
    Int PerformanceLoopCheck = 0
    While (PerformanceLoopCheck < 1000)
        Var[] Args = new Var[1]
        Args[0] = Game.GetPlayer()
        UserFunctionManager.CallUserFunctionAsync(StudentSubmissionQuest, "OnTestEventTrigger", Args)
        PerformanceLoopCheck += 1
    EndWhile

    Float EndTime = Utility.GetCurrentRealTime()
    Float TotalExecutionTime = EndTime - StartTime

    Debug.WriteToUserLog(LogName, "[AUDIT] Performance test completed. Total processing time: " + TotalExecutionTime + " seconds.")

    ; Benchmark: 1000 async pass-throughs must complete in < 0.05 seconds
    if (TotalExecutionTime > 0.05)
        Debug.WriteToUserLog(LogName, "[WARNING] Script failed efficiency criteria. Script lag detected. Review Module 2A.")
    else
        Debug.WriteToUserLog(LogName, "[SUCCESS] Student script meets target engine processing optimization profiles.")
    endif

    Self.Stop() ; Purge validator from memory after audit completes
EndFunction
```

### Teaching Notes

- The **0.05-second threshold** for 1000 async invocations is the pass/fail gate. A properly event-driven, stateless handler should pass comfortably; a blocking or polling implementation will exceed it.
- `UserFunctionManager.CallUserFunctionAsync` is an F4SE-provided function. The student's submitted script must expose an `OnTestEventTrigger` callable entry point.
- `Self.Stop()` at the end is mandatory — it implements the save-footprint safety rule from the rubric. A validator quest that never stops is itself a violation of the rubric's instant-failure condition.
- `Debug.OpenUserLog` / `Debug.WriteToUserLog` write to `Documents\My Games\Fallout4\Logs\User\StudentEvaluationLogs.0.log`. Require students to provide this log file alongside their submission.
- The validator should be attached to a **Start Game Enabled** quest with a clean stop condition so it does not linger in saves after evaluation completes.

---

## Quick Reference — Capstone Checklist

| Deliverable | Key Requirement | Common Failure Mode |
|---|---|---|
| 3D Asset | < 35k tris, relative BGSM paths, clean NIF string table | Absolute texture paths, no string table sanitisation |
| Papyrus Script | Event-driven, no polling, self-terminating quest | `RegisterForUpdate()` found anywhere in script |
| C++ Plugin | `REL::ID` only, dual-compiled Pre-NG + AE | Hardcoded `BaseAddress + offset` |
| FOMOD Installer | Auto-detects `Fallout4 - Creations.esm`, installs matching DLL | Single DLL shipped, no version detection |
| Git Repository | LFS for `.esp`/`.nif`/`.dds`, CI passes both configs | Binary files committed without LFS |
| CI Pipeline | Both `Release_PreNG` and `Release_Anniversary` build clean | Only one configuration wired up |
