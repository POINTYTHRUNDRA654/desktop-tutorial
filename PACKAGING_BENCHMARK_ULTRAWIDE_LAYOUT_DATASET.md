# Automated Packaging Pipeline, Microsecond Performance Benchmarking, and Ultra-Wide EDI Layout Adaptation

This dataset documents three release-readiness components: a packaging batch workflow for distribution archives, high-resolution telemetry loop benchmarking in C++, and responsive EDI XML layout tuning for ultra-wide displays.

---

## Phase 1: Automated Production Packaging Pipeline (`package_release.bat`)

Save this script as `package_release.bat` to bundle deployable assets into a predictable archive layout.

```bat
@echo off
echo =======================================================
echo   RUNNING AUTOMATED MOD DISTRIBUTION BUILD PACKAGER
echo =======================================================

set ARCHIVE_DIR=$(ProjectDir)BuildArchive
set OUTPUT_ZIP=$(ProjectDir)EngineTelemetryToolkit_v1.0.0.zip

:: Clean previous build artifacts safely
if exist "%ARCHIVE_DIR%" rmdir /S /Q "%ARCHIVE_DIR%"

:: Create deployment directory infrastructure mapping
mkdir "%ARCHIVE_DIR%\fomod" 2>nul
mkdir "%ARCHIVE_DIR%\F4SE\Plugins" 2>nul
mkdir "%ARCHIVE_DIR%\Interface\EDI" 2>nul
mkdir "%ARCHIVE_DIR%\Scripts" 2>nul

:: Copy core binaries and configurations into the layout folder
xcopy /Y "$(TargetPath)" "%ARCHIVE_DIR%\F4SE\Plugins\"
xcopy /Y "$(ProjectDir)Interface\EDI\*.swf" "%ARCHIVE_DIR%\Interface\EDI\"
xcopy /Y "$(ProjectDir)Interface\EDI\*.xml" "%ARCHIVE_DIR%\Interface\EDI\"
xcopy /Y "$(ProjectDir)Scripts\*.pex" "%ARCHIVE_DIR%\Scripts\"
xcopy /Y "$(ProjectDir)fomod\ModuleConfig.xml" "%ARCHIVE_DIR%\fomod\"

:: Generate release archive file using built-in compression engine tools
tar -a -c -f "%OUTPUT_ZIP%" -C "%ARCHIVE_DIR%" fomod F4SE Interface Scripts

echo [Success] Final production archive compiled: %OUTPUT_ZIP%
echo =======================================================
pause
```

**Key points:**
- Keep packaging paths deterministic so mod managers receive stable archive structure every release.
- Ensure script variable syntax matches your execution context (batch `%VAR%` vs MSBuild property expansion).
- Clean build archives before copy to avoid stale artifact bleed-through.
- Include only runtime-required folders in the ZIP root (`fomod`, `F4SE`, `Interface`, `Scripts`) unless source distribution is intentional.
- Validate output ZIP contents after packaging to catch missing dependency copies.

---

## Phase 2: Performance Benchmarking Counters (C++)

Use microsecond-level timing around telemetry loops to detect frame-cost regressions.

```cpp
#include "f4se/PluginAPI.h"
#include <chrono>
#include <string>

void BenchmarkMultiActorLoop() {
    // Capture high-precision starting hardware clock ticks
    auto startTime = std::chrono::high_resolution_clock::now();

    // Execute your multi-actor array lookups and filtering algorithms
    // (e.g., Calling CaptureMultiActorTelemetry here)

    auto endTime = std::chrono::high_resolution_clock::now();
    auto executionDuration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

    // Log calculation metrics to analyze engine thread performance impact
    if (executionDuration > 500) {
        _WARNING("[PERF ALERT]: Multi-actor loop exceeded 500 microseconds! Cost: %lld us", executionDuration);
    } else {
        _MESSAGE("[PERF]: Multi-actor telemetry parsing completed smoothly in %lld us", executionDuration);
    }
}
```

**Key points:**
- Use scoped timing around the exact hot path you want to monitor.
- Keep threshold alerts explicit (`>500us`) to simplify triage in logs.
- Compare measurements across equivalent scenes/saves to reduce noise.
- Prefer periodic or sampled logging in production to avoid logging overhead spikes.
- Track regressions over time by recording benchmark windows in release notes.

---

## Phase 3: Ultra-Wide Resolution Adaptive Layout Configuration (`ExtendedDialogueInterface.xml`)

Use relative positioning and adaptive scaling flags to keep menu geometry consistent on 21:9 and wider displays.

```xml
<?xml version="1.0" encoding="utf-8"?>
<EDIConfig>
    <DialogueMenuLayout>
        <!-- Horizontal positioning uses percentages to scale cleanly across 21:9 displays -->
        <ListProperties>
            <MaxVisibleItems>6</MaxVisibleItems>
            <VerticalSpacing>36</VerticalSpacing>
            <PositionRelativeX>0.08</PositionRelativeX>
            <PositionRelativeY>0.50</PositionRelativeY>
            <Alignment>Left</Alignment>
            <AdaptiveScalingEnabled>true</AdaptiveScalingEnabled>
        </ListProperties>
        
        <TextProperties>
            <FontName>$FontDF_B</FontName>
            <FontSize>24</FontSize>
            <NormalColor>0xFFB000</NormalColor>
            <SelectedColor>0xFFFFFF</SelectedColor>
            <DisabledColor>0x443300</DisabledColor>
        </TextProperties>
    </DialogueMenuLayout>
</EDIConfig>
```

**Key points:**
- Relative X/Y placement avoids hardcoded pixel drift across aspect ratios.
- Keep `MaxVisibleItems` aligned with your intended 6-choice matrix behavior.
- Pair adaptive scaling with readable font sizing to preserve usability on high-DPI displays.
- Preserve color contrast between normal, selected, and disabled text states.
- Validate UI at 16:9, 21:9, and 32:9 to catch clipping and overlap edge cases.

---

## Troubleshooting Focus

- **Package script outputs empty ZIP:** Source copy paths did not resolve in current shell context or build artifacts were missing.
- **Wrong archive layout depth:** Packaging root includes extra folder levels; ensure ZIP root starts at `fomod/F4SE/Interface/Scripts`.
- **Benchmark logs always over threshold:** Measured scope includes unrelated expensive work; isolate only actor extraction and filter logic.
- **Benchmark logs missing:** Compile flags or logger macros may differ between Debug/Release runtime.
- **Ultra-wide menu clipping:** Relative anchor values plus font size exceed safe viewport bounds; reduce spacing or shift origin inward.

