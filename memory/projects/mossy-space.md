# MOSSY.SPACE

**Version:** v5.4.66  
**Stack:** Electron 42 + React 18.3.1 + TypeScript + Vite  
**Root:** `D:\Projects\desktop-tutorial`  
**Status:** Active development

## What It Is

A professional desktop platform for Fallout 4 modding. Combines automation, workflow orchestration, mod building, blueprint planning, asset management, and developer tooling in one Electron app.

## Build Locations

| Location | Notes |
|----------|-------|
| `release/win-unpacked/resources/app.asar` | Release build (not the one user runs) |
| `Mossy/Mossy NVIDIA/resources/app.asar` | **The build the user actually runs** |
| `dist/` | Vite renderer output |
| `dist-electron/` | Vite electron main output |
| `app.asar.unpacked/` | node_modules served transparently by Electron |

**Backup naming:** `app.asar.bak-YYYYMMDD-HHMMSS`  
**Last patched:** 2026-05-27 (backup: `app.asar.bak-20260527-160405`)

## Platforms & Their State

### WorkflowRunner (`src/renderer/src/WorkflowRunner.tsx`) — 1,549 lines
FO4 Automation Runner. Fully rewritten.
- Quote-aware CLI arg parser (`splitArgs()`)
- `waitForProcess` step type (polls `tasklist` every 2s with configurable timeout)
- 6 FO4 presets: Creation Kit Launch, Papyrus Compile Chain, BA2 Pack, Load Order Backup, xEdit Conflict Export, Full Mod Build Pipeline
- Live step status (spinner / checkmark / X per step)
- Auto-scroll log panel (`logPanelRef`)
- Live run timer (`runElapsedMs`)
- Workflow search + filter
- `duplicateWorkflow()` deep copy with fresh IDs
- `continueOnError` at workflow and per-step level
- `durationMs` stored in `RunnerRun` history

### AutomationManager (`src/renderer/src/AutomationManager.tsx`) — 461 lines
FO4 Automation Orchestrator. Fully rewritten.
- All emoji replaced with Lucide icons
- `TRIGGER_META` map: file-change, process-start, process-stop, schedule, manual
- `ACTION_META` map with labels and icons
- Expandable rule rows (description, watchExtensions, params, cooldown, rule ID)
- Stats refresh every 5000ms + manual refresh button + spinner
- `formatCooldown()` human-readable helper

### automationEngine (`src/electron/automationEngine.ts`) — 826 lines
Electron main process automation engine.
- Xbox Game Pass paths in `resolveWatchPath()` sync fallback
- Xbox detection block in `detectFO4InstallDir()` (after GOG block)
- `performNightlyBackup()` — copies plugins.txt + loadorder.txt to `%LOCALAPPDATA%\Fallout4\Backups\YYYY-MM-DD\`
- `process-stop` monitoring via `prevRunning` Set diffing (not just `process-start`)
- `auto-backup` rule: trigger=schedule, action=nightly-backup, time=02:00

### TheBlueprint (`src/renderer/src/TheBlueprint.tsx`) — 777 lines
- Commonwealth (not Tamriel)
- Plugin type badges (ESL/ESP/ESM)
- Checklist tab
- 10 FO4 mod templates (word-based IDs: quest, settlement, companion, weapon, armor, location, overhaul, patch, framework, player-home)
- SEQ file warning
- ESL/ESP/ESM guidance

### DevtoolsHub (`src/renderer/src/DevtoolsHub.tsx`) — 722 lines
- 10 Papyrus snippets (word-based IDs: onactivate, oninit, etc.)
- xEdit quick reference panel
- F4SE version guide
- Copy-to-clipboard on all snippets

### ModBuilderHub (`src/renderer/src/ModBuilderHub.tsx`) — 234 lines
- Double-scroll bug fixed (removed outer `overflow-y-auto p-6`)
- Keyboard shortcuts 1–5 for tab switching
- Version badge v2.x.x

### Workshop (`src/renderer/src/Workshop.tsx`) — 715 lines
- `onKeyPress` → `onKeyDown` (deprecated API fixed)
- File type icons: `.esp` (FileBox, emerald), `.ba2` (FileBox, amber), `.hkx` (FileBox, purple)
- Uses `case 'esp':` / `case 'ba2':` / `case 'hkx':` syntax

### ProjectCreator (`src/renderer/src/ProjectCreator.tsx`) — 627 lines
- FO4-only variants (removed Skyrim/Fallout76)
- Inline form layout (no `fixed inset-0` modal overlay)

## Audit Results (2026-05-27)

All 8 platforms verified correct. 49/54 audit checks passed; 5 were regex false-negatives (not real failures):
- TheBlueprint templates use word-based IDs, not numeric
- DevtoolsHub snippets use word-based IDs, not numeric
- Workshop uses `case 'esp':` syntax (not a string literal pattern)

## Known Gotchas

- **Editing source files does nothing** until asar is rebuilt and the app is relaunched
- Vite content-hashed bundles mean each build produces different filenames — audits searching old hash names will fail
- `asar pack` with `node_modules` = 318MB and likely timeout; use slim-pack approach
- `@electron/asar` ESM path (`lib/esm/asar.js`) does not exist — use CJS `lib/asar.js`
- `.bin/asar` shebang is bash-only — use `node_modules/@electron/asar/bin/asar.js` on Linux/shell
