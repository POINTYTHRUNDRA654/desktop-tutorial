# Nexus Release Validation Checklist

## Fresh install tests

- [ ] **MO2 clean profile:** Install core archive, enable plugin, run game via F4SE.
- [ ] **Vortex clean profile:** Install core archive, deploy mods, run game via F4SE.
- [ ] **Manual fallback:** Extract core archive into Fallout 4 root and verify Data/ paths are correct.
- [ ] **In-place alpha update:** Install a newer alpha build over existing install and verify no uninstall is required.

## Required runtime verification

- [ ] `Data/F4AI_Core.esp` is present and enabled.
- [ ] Required scripts exist in `Data/Scripts/` (`F4AI_QueueManager.pex`, `F4AI_FeedbackMonitor.pex`, `F4AI_PushToTalkTrigger.pex`, `F4AI_VisionWidgetManager.pex`, `F4AI_InterNpcManager.pex`).
- [ ] `Data/F4AI/Fallout4_AI_Engine.exe` exists.
- [ ] `Data/F4AI/config.json` exists with default keys (`ai_temperature`, `enable_memory`, `speech_speed`).
- [ ] Baseline voice pair exists (`en_US-lessac-medium.onnx` + `en_US-lessac-medium.onnx.json`).

## Functional smoke test

- [ ] Start KoboldCPP with local GGUF model loaded.
- [ ] Run `Data/F4AI/Launch_F4AI_Bridge.bat`.
- [ ] Launch Fallout 4 via F4SE.
- [ ] Trigger one NPC interaction and confirm generated subtitle + audio output without manual file edits.
