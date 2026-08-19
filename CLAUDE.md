# Memory

## Me
Developer building MOSSY.SPACE — an advanced Fallout 4 modding desktop platform using Electron + React + TypeScript.

## Active Projects

| Name | What | Status |
|------|------|--------|
| **MOSSY.SPACE** | FO4 modding platform, Electron + React + TS | Active v5.4.66 |

→ Full details: memory/projects/mossy-space.md

## Terms

| Term | Meaning |
|------|---------|
| **asar** | Electron's app archive format — source edits don't affect running app until asar is rebuilt |
| **Mossy NVIDIA** | The build the user actually runs: `Mossy/Mossy NVIDIA/resources/app.asar` |
| **release build** | Secondary build at `release/win-unpacked/resources/app.asar` |
| **slim pack** | Asar repacked without node_modules (104MB vs 318MB); node_modules served from `app.asar.unpacked/` |
| **FO4** | Fallout 4 |
| **CK** | Creation Kit — Bethesda's official FO4 mod editor |
| **BA2** | Bethesda Archive 2 — FO4's packed asset format |
| **F4SE** | Fallout 4 Script Extender |
| **xEdit / FO4Edit** | Community mod conflict checker / editor |
| **Papyrus** | FO4's scripting language |
| **ESL/ESP/ESM** | Plugin file types (ESL = light, ESP = standard, ESM = master) |
| **SEQ** | Sequence file — required for quests to start on save load |
| **content-hash bundle** | Vite output filenames include a hash (e.g. `WorkflowRunner-CH0RESju.js`); new build = new hash |

→ Full glossary: memory/glossary.md

## Platforms (MOSSY.SPACE Components — 23 total, sidebar order)

| # | Platform Name | Route | Main File |
|---|--------------|-------|-----------|
| 1 | Mossy.Space (Home Dashboard) | `/` | `TheNexus.tsx` |
| 2 | AI Chat | `/chat` | `ChatInterface.tsx` |
| 3 | AI Mod Assistant | `/ai-mod-assistant` | `AIModAssistant.tsx` |
| 4 | FO4 Mod Journey Hub | `/journey-hub` | `JourneyHub.tsx` |
| 5 | FO4 What's New | `/whats-new` | `WhatsNewPage.tsx` |
| 6 | FO4 Knowledge Hub | `/knowledge-hub` | `KnowledgeHub.tsx` |
| 7 | FO4 Memory Vault | `/memory-vault` | `MossyMemoryVault.tsx` |
| 8 | FO4 Setup Wizards | `/wizards` | `WizardsHub.tsx` |
| 9 | FO4 Creation Kit Hub | `/ck-tools` | `CKToolsHub.tsx` |
| 10 | FO4 Textures & Materials | `/textures` | `TextureMaterialsHub.tsx` |
| 11 | FO4 Packaging & Release | `/packaging-release` | `PackagingHub.tsx` |
| 12 | FO4 Guides Hub | `/guides-hub` | `GuidesHub.tsx` |
| 13 | FO4 Automation Studio | `/tools/cosmos` | `CosmosWorkflow.tsx` |
| 14 | FO4 Mod Builder Hub | `/mod-builder` | `ModBuilderHub.tsx` |
| 15 | FO4 Asset Analysis Hub | `/asset-analysis` | `AssetAnalysisHub.tsx` |
| 16 | FO4 Automation Orchestrator | `/orchestrator` → `/dev/orchestrator` | `FO4AutomationOrchestrator.tsx` |
| 17 | FO4 Automation Runner | `/workflow-runner` | `WorkflowRunner.tsx` |
| 18 | FO4 Runtime Hub | `/runtime-hub` | `RuntimeHub.tsx` |
| 19 | FO4 External Integrations Hub | `/ext-tools` | `ExternalToolsHub.tsx` |
| 20 | FO4 Plugin & Load Order Hub | `/plugin-tools` | `PluginLoadOrderHub.tsx` |
| 21 | FO4 System & Diagnostics Hub | `/system-hub` | `SystemHub.tsx` |
| 22 | Settings | `/settings` | `SettingsHub.tsx` |
| 23 | Vault-Tec Creative Director | `/creative-director` | `plugin_creative_director/CreativeDirectorPanel.tsx` |

Note: `AutomationManager.tsx` is a separate platform at `/tools/automation` ("FO4 Automation Studio" overlaps in name only — do not confuse it with the Orchestrator).

**Backend engine (not a UI platform):** `automationEngine` → `src/electron/automationEngine.ts`

## Key Workflows

### Deploying changes to the running app

**`deploy-full.cjs` is retired — do not recreate it.** It extracted the *current*
`app.asar`, overlaid new `dist`/`dist-electron`, and repacked in place. That's
broken by construction against this build config: `electron-builder` stamps an
asar-integrity hash into `Mossy NVIDIA.exe` itself at package time, so any
asar-only swap produces an exe/asar pair whose hashes don't match — Electron
then fails during module load with no useful error (e.g. a bogus
"Invalid package config ... uuid\package.json", from corrupted byte offsets
after an interrupted repack, not an actual missing dependency). It also had no
guard against running while Mossy was open — it discovered that via an `EBUSY`
on a locked native `.dll` *after* already overwriting the archive, and a
subsequent "successful" run then silently repacked the corruption forward.
Diagnosed 2026-08-15; cost a full session to trace.

Current path — always a full, matched `electron-builder` build, never a
partial asar swap:

1. Edit source files in `src/`
2. Close Mossy NVIDIA first — an `electron-builder` pass needs to overwrite
   native `.dll`s inside `resources/app.asar.unpacked/`, which stay locked
   while the app is running.
3. `npm run build` (Vite → `dist/`, tsc → `dist-electron/`)
4. `npx electron-builder --win --dir --config.productName="Mossy NVIDIA" --config.appId="com.volttech.desktop-nvidia"`
   — produces a matched exe+asar pair at `release/win-unpacked/`. `--dir`
   skips NSIS installer creation, which isn't needed for local iteration.
5. Verify before touching the live install: launch
   `release/win-unpacked/Mossy NVIDIA.exe` directly and confirm it opens.
6. Replace the **entire** `Mossy/Mossy NVIDIA/` folder with
   `release/win-unpacked/` (not just `app.asar` — the exe must come from the
   same build).
7. **Relaunch Mossy NVIDIA** — running process has old version in memory.

### CRITICAL: Writing source files safely

**NEVER use the Write tool for `.ts` or `.tsx` files.** The Write tool silently embeds null bytes (`\x00`) in large files. TypeScript ignores them but Vite compiles the corrupted version, producing a truncated bundle with wrong runtime behaviour. This is invisible until the deployed app behaves incorrectly.

**Always write source files via Python through bash:**
```python
# In a mcp__workspace__bash call:
python3 << 'PYEOF'
content = """..."""  # full file content as a Python string
with open('/sessions/.../src/renderer/src/MyFile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
PYEOF
```

**After every file write, verify immediately:**
```python
python3 -c "
d = open('path/to/file.tsx','rb').read()
print(len(d), 'bytes,', d.count(b'\x00'), 'nulls,', d.count(b'\n'), 'lines')
"
```

**If null bytes are found:** run `node scripts/strip-nulls.cjs` — it scans all `.ts`/`.tsx` in `src/` and strips them.

**The pre-build check** (`scripts/precheck-renderer.mjs`) now catches null bytes and aborts the build before Vite compiles corrupt files.

**The Vite build requires Windows:** `npm run build` uses Rollup native binaries compiled for Windows. It cannot run in the Linux bash sandbox. After editing source files in the sandbox, the user must run `npm run build && node deploy-full.cjs` on Windows.

## Standards

### Honest degradation when a dependency isn't there — the BackupManager pattern

**The standard:** `BackupManager.tsx`'s `createRealBackup()` (`src/renderer/src/BackupManager.tsx`).
It calls the real Bridge endpoint (`POST /backup/create`), and when the Bridge is
offline it doesn't claim success — it says exactly what happened and what didn't:
*"Snapshot metadata saved, but Desktop Bridge is offline — no files were actually
backed up."* One sentence, no hedging, tells the user precisely what's true and
what to do about it. Every integration in this app — anything that calls out to
an external tool, service, or process that might not be running — should read
like that when its dependency is unavailable.

**Why this is a standard and not a suggestion:** two real bugs this session were
both the same shape — a UI action that checked an unrelated readiness flag, then
returned a hardcoded "success"-looking string with no real call behind it:

- `MossyTools.ts`'s `ck_execute_command`/`check_previs_status` and siblings
  claimed to control Creation Kit and once returned a fixed "Precombine Status:
  ACTIVE / Conflicts: None detected" regardless of what was actually asked — CK
  has no scripting interface to connect to, so there was never a real check
  behind it. Fixed 2026-08-18: real diagnosis instead, reading CKPE's own log
  file when installed, honestly reporting when it isn't.
- `AdvancedAnalysisPanel.tsx` was a dead tab in Asset Analysis Hub whose own
  header comment documented that the engines it displayed (hardware/conflict/
  memory analysis) "fabricated their output (random scores, random hardware)"
  and had already been replaced by Phase 2 Mining's real data — but the tab
  itself was left wired in as a live, selectable dead end sitting one click from
  its real replacement. Removed 2026-08-18, not left as a trap for a future
  stale build or caching issue to make it look live again.
- `tools/glowing-sea-texture-pipeline/finalize.py`'s finishing filters
  (median/unsharp/contrast/saturation) ran over the whole canvas, including
  pixels `composite_lock.py` had explicitly locked to the pristine original
  outside the UV mask — the same "operation reports success while silently
  altering something it wasn't supposed to touch" shape, just in a
  standalone tool instead of a UI panel. It looked done (stages 1-3 passed,
  the 4-stage chain ran clean) until the automated test checked the
  alpha-outside-mask guarantee directly with zero tolerance instead of
  eyeballing a sample — 6.8M of 9.7M protected pixels on one real file came
  back altered. Fixed 2026-08-19: finalize.py re-composites against the same
  real mask a second time after filtering, so the guarantee this pipeline
  exists to provide survives every stage, not just the ones that don't touch
  RGB.

**What to check when writing or reviewing an integration:** does every branch
that reports success actually follow a real IPC call, file read, or process
spawn whose result the message is derived from? Does the failure/unavailable
branch say so in plain language, instead of silently doing nothing or showing
a generic error? If a component's own comments say a former dependency was
fabricated or removed, is the component (or the specific tab/feature that used
it) actually gone from the UI, not just internally redirected?

## Preferences
- No intermediate steps shown — implement everything, report when done
- Everything must be real, professional, most advanced FO4 system possible
- Lucide icons only — no emoji in UI components
- All platforms must be fully wired end-to-end
