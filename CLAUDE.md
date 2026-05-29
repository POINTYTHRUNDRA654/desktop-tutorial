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

## Platforms (MOSSY.SPACE Components — 22 total, sidebar order)

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
| 16 | FO4 Automation Orchestrator | `/orchestrator` | `AutomationManager.tsx` |
| 17 | FO4 Automation Runner | `/workflow-runner` | `WorkflowRunner.tsx` |
| 18 | FO4 Runtime Hub | `/runtime-hub` | `RuntimeHub.tsx` |
| 19 | FO4 External Integrations Hub | `/ext-tools` | `ExternalToolsHub.tsx` |
| 20 | FO4 Plugin & Load Order Hub | `/plugin-tools` | `PluginLoadOrderHub.tsx` |
| 21 | FO4 System & Diagnostics Hub | `/system-hub` | `SystemHub.tsx` |
| 22 | Settings | `/settings` | `SettingsHub.tsx` |

**Backend engine (not a UI platform):** `automationEngine` → `src/electron/automationEngine.ts`

## Key Workflows

### Deploying changes to the running app
1. Edit source files in `src/`
2. Run `npm run build` (Vite compiles to `dist/` and `dist-electron/`)
3. Extract asar: `node extract-asar.js` (or use `@electron/asar`)
4. Replace `dist/` and `dist-electron/` inside extracted folder
5. Slim-pack (exclude node_modules): produces ~104MB asar
6. Copy patched asar → `Mossy/Mossy NVIDIA/resources/app.asar`
7. **Close and relaunch the app** — running process has old version in memory

### Asar packing (slim, no node_modules)
```js
// Uses CJS require — ESM import path does not exist
const asar = require('/path/to/node_modules/@electron/asar/lib/asar.js');
await asar.createPackageWithOptions(srcDir, destAsar, { unpack: '*.node' });
```
- Do NOT use `--unpack` CLI flag (minimatch bug)
- Do NOT use `lib/esm/asar.js` (doesn't exist)
- Use `node_modules/@electron/asar/bin/asar.js` for CLI (not `.bin/asar` — shebang is bash-only)

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

## Preferences
- No intermediate steps shown — implement everything, report when done
- Everything must be real, professional, most advanced FO4 system possible
- Lucide icons only — no emoji in UI components
- All platforms must be fully wired end-to-end
