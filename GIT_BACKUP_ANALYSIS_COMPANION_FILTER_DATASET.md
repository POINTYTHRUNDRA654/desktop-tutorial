# Automated Git Backup Script, VS2022 Code Analysis Profile, and Companion Telemetry Isolation Filters

This dataset documents three production workflow components: an automated Git workspace snapshot batch script, a Visual Studio 2022 static analysis profile for native C++ safety checks, and a C++ actor filtering helper that isolates companion telemetry from general NPC traffic.

---

## Phase 1: Automated Git Backup and Version Control Script

Save as `git_backup.bat` in your project root if you need a quick local snapshot utility.

```bat
@echo off
echo =======================================================
echo   STARTING AUTOMATED GIT WORKSPACE SNAPSHOT AUTOMATION
echo =======================================================

:: Initialize Git repository structure if not already present
if not exist ".git" (
    echo [Git Setup] Initializing local Git tracking tree...
    git init
    echo /BuildArchive/ > .gitignore
    echo *.dmp >> .gitignore
    echo *.lib >> .gitignore
)

:: Stage code modifications across the entire distribution architecture
git add F4SE/ Interface/ Scripts/ Source/ *.bat *.sln *.vcxproj

:: Create a time-stamped commit message using standard system variables
set COMMIT_TIME=%date%_%time%
git commit -m "Automated dev snapshot checkpoint: %COMMIT_TIME%"

:: Push updates if a remote branch connection is established
git push origin main 2>nul
if %errorlevel% neq 0 (
    echo [Git Notice] Remote repository offline or not configured. Saved locally.
) else (
    echo [Git Success] Workspace snapshot pushed to remote branch repository.
)

echo =======================================================
pause
```

**Key points:**
- Use `>>` after the first `.gitignore` line so later entries append instead of overwrite.
- Keep crash dumps (`*.dmp`) and static libraries (`*.lib`) out of source control unless explicitly needed.
- Consider replacing `%date%_%time%` with a sanitized timestamp format to avoid locale-specific characters in commit messages.
- In team workflows, avoid hardcoding `main`; use current branch detection when needed.
- This script is best for local snapshot workflows and should be reviewed before using in CI.

---

## Phase 2: Visual Studio 2022 Static Analysis and Leak Protection Profile

Enable compiler-assisted checks so unsafe patterns are surfaced during normal build cycles.

1. **Enable analyzer on build**
   - Open Project Properties.
   - Navigate to **Configuration Properties → Code Analysis → General**.
   - Set **Enable Code Analysis on Build** to **Yes (/analyze)**.

2. **Select strict rule profile**
   - In the same panel, set **Active Rules** to:
     - **Microsoft Native Recommended Rules** (general native safety), or
     - **Concurrency Rules** (threading and synchronization focus).

3. **Increase diagnostic signal**
   - Open **C/C++ → General**.
   - Set **Warning Level** to **Level4 (/W4)**.

**Key points:**
- `/analyze` surfaces issues that normal compile warnings miss (resource ownership, null handling, API contract misuse).
- `Concurrency Rules` is useful when telemetry threads, worker loops, and shared state are involved.
- `/W4` helps detect silent narrowing conversions and uninitialized usage paths early.
- Use baselining to triage legacy warnings without suppressing new regressions.
- Keep analysis enabled in at least one Release-like configuration to catch real build-path issues.

---

## Phase 3: Multi-Actor Telemetry Isolation Filters (C++)

Use this helper pattern to separate companion actor frames from generic NPC streams.

```cpp
#include "f4se/PluginAPI.h"
#include "f4se/GameReferences.h"

enum ActorFilterMode {
    FILTER_ALL_NPCs = 0,
    FILTER_COMPANIONS_ONLY = 1
};

bool IsTargetActorValid(Actor* actorInstance, uint32_t filterMode) {
    if (!actorInstance || actorInstance->IsDead()) return false;

    // Skip evaluations if our tracking matrix requests unfiltered raw entity data
    if (filterMode == FILTER_ALL_NPCs) return true;

    if (filterMode == FILTER_COMPANIONS_ONLY) {
        // Evaluate internal engine status flags using native bitwise masks
        // IsCompanion evaluation handles checking dynamic active follower properties
        typedef bool (*_IsPlayerCompanion)(Actor* actor);
        RelocPtr<_IsPlayerCompanion> NativeIsCompanion(0x00D94A10); // RVA specific to helper components

        if (NativeIsCompanion.GetPtr() && NativeIsCompanion(actorInstance)) {
            return true; // Entity matches an active companion instance
        }
    }

    return false; // Filter out hostile or ambient wildlife targets from the stream
}
```

**Key points:**
- Always null-check actor pointers and reject dead actors before deeper classification.
- Keep filter modes explicit so telemetry behavior is deterministic and testable.
- Resolve and verify relocation pointers before invocation to avoid invalid function calls.
- Treat hardcoded RVAs as version-sensitive and pair with signature/fallback resolution logic.
- Return `false` on uncertain states to favor safety over over-reporting.

---

## Troubleshooting Focus

- **Batch script fails on `git add`:** One or more target folders do not exist in the current workspace; gate `git add` patterns or use broader safe staging rules.
- **`git commit` reports nothing to commit:** No tracked file changes were detected; verify generated outputs are not ignored.
- **`/analyze` flood after enabling:** Start with Native Recommended Rules and triage by category before enabling additional rule sets.
- **Companion filter crashes:** The relocation address is stale for the current game/runtime version; use signature scan fallback before calling the function pointer.
- **Companions not detected:** Companion helper may not resolve for current executable state or actor context; validate runtime mode and load order assumptions.

