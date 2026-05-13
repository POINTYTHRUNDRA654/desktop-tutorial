# ActionScript Radar Matrix Rendering, Automated Changelog Generation, and Dynamic XOR Key Rotation

This dataset captures three coordinated systems in a mod telemetry workflow: ActionScript 3 rendering of multi-actor markers in Scaleform, automated changelog generation from Git history, and time-window based XOR key mutation for stream obfuscation.

---

## Phase 1: ActionScript 3 Multi-Marker Radar Rendering (`TelemetryWidget.as`)

Use this ActionScript 3 structure to parse actor arrays and draw coordinate markers on your Pip-Boy overlay.

```actionscript
package {
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.external.ExternalInterface;

    public class TelemetryWidget extends MovieClip {
        private var markerLayer:Shape;

        public function TelemetryWidget() {
            ExternalInterface.addCallback("RenderRadarMatrix", this.renderRadarMatrix);
            markerLayer = new Shape();
            addChild(markerLayer);
        }

        public function renderRadarMatrix(jsonData:String):void {
            markerLayer.graphics.clear();
            
            // Native Flash Player JSON decoding routine
            var rawData:Object = JSON.parse(jsonData);
            if (!rawData || !rawData.actors) return;

            for (var i:int = 0; i < rawData.actors.length; i++) {
                var actor:Object = rawData.actors[i];
                
                // Map local coordinate math limits to screen pixel clip spaces
                var renderX:Number = (actor.x / 200) + (stage.stageWidth / 2);
                var renderY:Number = (stage.stageHeight / 2) - (actor.y / 200);

                // Assign amber tints for companions, white tints for the player character
                var markerColor:uint = (actor.isCompanion) ? 0xFFB000 : 0xFFFFFF;

                markerLayer.graphics.beginFill(markerColor, 0.85);
                markerLayer.graphics.drawCircle(renderX, renderY, 4);
                markerLayer.graphics.endFill();
            }
        }
    }
}
```

**Key points:**
- Register callback names exactly (`RenderRadarMatrix`) so external bridge calls resolve correctly.
- Clear graphics each frame/update to avoid stale marker trails.
- Normalize world coordinates with a fixed scale divisor (here `200`) for stable map density.
- Keep companion/player tint logic explicit for immediate visual classification.
- Guard against missing `actors` arrays before iterating.

---

## Phase 2: Automated Project Changelog Document Generator (`generate_changelog.bat`)

Use this batch script to build a markdown release note file from recent commits.

```bat
@echo off
echo =======================================================
echo   CREATING FORMATTED PROJECT RELEASE CHANGELOG MATRIX  
echo =======================================================

set OUTPUT_FILE=Data\F4SE\Plugins\HEW_Changelog.md

echo # Mod Development Release Notes > %OUTPUT_FILE%
echo ## System Compilation Build Time: %date% %time% >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo ### Core Commits Log Architecture: >> %OUTPUT_FILE%

:: Query local git structures to format tracking notes into a scannable table list
git log --pretty=format:"* [%%h] - %%s (%%an)" -n 15 >> %OUTPUT_FILE%

echo. >> %OUTPUT_FILE%
echo [Success] Release distribution documentation saved to %OUTPUT_FILE%
echo =======================================================
pause
```

**Key points:**
- Ensure the output directory exists before writing (`Data\F4SE\Plugins\`) to avoid silent failures.
- `%%h`, `%%s`, and `%%an` are escaped in batch context; keep double `%` in `.bat` files.
- Use bounded history (`-n 15`) for concise release notes that stay readable.
- Treat generated changelog artifacts as build outputs unless your workflow explicitly commits them.
- Keep script execution local-only unless repository policy allows automated commit metadata export.

---

## Phase 3: Dynamic Network Encryption Key Rotation (C++)

Use a minute-based rolling mask so each time window produces a different XOR key.

```cpp
#include <string>
#include <chrono>

std::string GetDynamicXORRotationMask() {
    // Acquire the current Unix system epoch tracking window minute slot
    auto timePoint = std::chrono::system_clock::now().time_since_epoch();
    auto totalMinutes = std::chrono::duration_cast<std::chrono::minutes>(timePoint).count();

    // Dynamically derive a varying mask string sequence using the current time slot value
    std::string proceduralKey = "F4SE_Key_" + std::to_string(totalMinutes);
    return proceduralKey;
}

std::string EncryptDynamicPayload(const std::string& rawInput) {
    std::string activeMask = GetDynamicXORRotationMask();
    std::string outputBuffer = rawInput;
    size_t keyLen = activeMask.length();

    for (size_t i = 0; i < rawInput.length(); ++i) {
        outputBuffer[i] = rawInput[i] ^ activeMask[i % keyLen];
    }

    return outputBuffer;
}

// Ensure your Node.js relay handler applies an identical dynamic timestamp string 
// calculation sequence to decrypt the incoming data stream frames without drift desyncs.
```

**Key points:**
- Sender and receiver must use identical time-window logic or decryption will fail.
- Add tolerated window skew (for example current/previous minute) to handle clock drift and network delay.
- This is obfuscation, not strong cryptography; use authenticated encryption for hostile environments.
- Keep mask derivation deterministic and versioned so protocol upgrades can coexist safely.
- Record key-window mismatches in logs to diagnose desync events quickly.

---

## Troubleshooting Focus

- **No radar markers rendered:** Callback mismatch, missing `actors` payload key, or `stage` not initialized at render time.
- **Markers are mirrored/inverted:** Axis mapping math is reversed between world and UI coordinate systems.
- **Changelog file missing:** Output directory does not exist, or `git` is unavailable in PATH.
- **Garbled decrypted payloads:** Plugin and relay disagree on minute window or key derivation string format.
- **Intermittent decrypt failures near minute boundaries:** Accept adjacent windows (`t`, `t-1`) during verification to reduce boundary race failures.

