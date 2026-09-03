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

**`deploy-full.cjs` (and its undocumented `deploy-full.mjs` sibling, found and retired 2026-09-03 -- same design, just never deleted the first time) are retired -- do not recreate either.** They extracted the *current*
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

**The Vite build requires Windows:** `npm run build` uses Rollup native binaries compiled for Windows. It cannot run in the Linux bash sandbox. After editing source files in the sandbox, the user must run the full `electron-builder` deploy documented above (steps 3-7 under "Deploying changes to the running app") on Windows -- never `deploy-full.cjs`/`.mjs`, both retired.

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

### "Verified" from a reviewer is not ground truth — the Papyrus timer bug

**The standard:** a claim that code is "correct," "verified," or "fixed" —
from Billy, from Claude, from any reviewer, human or AI — is a claim about
what the reviewer *believes* after reading the code. It is not the same
thing as the code actually being checked against reality, and treating it
as equivalent is a real, recurring risk, not a hypothetical one.

**What happened, 2026-08-19:** a Papyrus trap script had a real threading
bug (`Utility.Wait()` inside an event handler, queuing instead of dropping
concurrent calls). The proposed fix used `RegisterForSingleUpdate()` /
`Event OnUpdate()` — real, commonly-used functionality in Skyrim's Papyrus
that does not exist anywhere in Fallout 4's Papyrus API. This fix was:

- Written and proposed as correct.
- Independently reviewed by Billy, who confirmed it was correct and
  specifically called the related stuck-state failure mode "structurally
  eliminated."
- Implemented, tested for the *behavior* it was meant to fix (state
  transitions, re-entry handling), and shipped — into the hand-fixed
  script, three Blender-add-on generator templates, and a new
  `papyrusThreadingGotchas` knowledge-base entry that recommended the same
  nonexistent function as *the* fix for anyone consulting it later.

None of that caught it. What caught it: running `PapyrusCompiler.exe` — a
free, two-second, fully mechanical check — for the first time, on
something else entirely (a smoke test of unrelated tooling). It failed
immediately with `RegisterForSingleUpdate is not a function or does not
exist`. Every subsequent claim in this codebase and the linter built to
prevent this exact class of bug had to be corrected once actual compilation
was run.

**Why this is the more important failure, not a smaller one:** the
knowledge-base entry and the linter's own finding message both taught the
wrong fix as correct. If that had gone unnoticed, every future script
checked against that KB entry, or against the linter's guidance, would have
been steered toward the same broken API — the corpus would have been
actively teaching the bug rather than preventing it. A wrong fix that stays
local to one file is a bug. A wrong fix baked into the reference material
other code (or other people, or Mossy herself) is expected to trust is a
bug that compounds every time it's consulted.

**What to check, going forward, in this codebase and beyond:** when a fix,
a review, or a "this is now correct" claim depends on an external system's
real behavior (a compiler, an API's actual signature, a runtime's actual
capabilities) — run the real check. Reading the code carefully, twice, by
two different reviewers, is not a substitute for executing it against
ground truth once. This applies with equal force to a human reviewer's
sign-off and to an AI's confident-sounding confirmation — confidence is not
evidence, and neither is agreement between two reviewers who made the same
unverified assumption.

### A negative result is still a result — the Brain B reranker A/B

**The standard:** when an experiment is scoped as "test X, decide on the numbers,
document either way," a real test that shows no improvement is a completed task,
not an incomplete one. The write-up should read "we tested a reranker against the
real eval set, here's what happened," never "we added a reranker" — regardless of
how much real engineering went into getting the test to run.

**What happened, 2026-08-21:** `nvidia/llama-nemotron-rerank-1b-v2` was wired into
Brain B's `hybrid_retrieve()` as an opt-in post-RRF-fusion pass and A/B'd for real
against the actual 20-query eval (`brain-b/eval_retrieval.py`, both with and
without `--reranker`, real GPU, real ChromaDB, real BM25 index — see
`brainb_reranker_ab_finding` in project memory for the full numbers). Getting the
reranker running at all took real debugging: a `trust_remote_code` config
incompatible with `transformers>=5.0`'s newer internals, an `AutoTokenizer`
registry gap for a subclassed config with no registered tokenizer mapping, and a
real pip-resolution footgun where installing `sentence-transformers` unpinned
silently re-upgraded an already-fixed `transformers` pin back to an incompatible
version. All real, all fixed, all documented in `reranker.py`'s own docstring so
the next person (or Mossy) doesn't rediscover them the hard way.

Then the actual A/B ran clean: 0 of 20 tier (confident/hedge/abstain)
classifications changed, 0 false positives introduced or fixed, 0 regressions —
and the one specific case this task named up front (the GetName near-identical-
function-name collision) came back exactly as a six-days-earlier memory had
already predicted: the target document doesn't enter the retrieval candidate pool
at all, so no reranker can surface it — confirmed, not fixed. Top-6 content
changed in all 20 queries, and spot-checking a few of those changes suggested a
plausible real improvement (more specific function-level chunks displacing more
generic parent/introduction chunks) — but that's an eyeball read, not a number,
and the task was explicit that a decision needed the numbers, not the vibes.

**Decision: not wired in as the default.** `retrieval_tuning.py`'s constants and
eval baseline are unchanged. The reranker code stays in the repo, real and
working, behind `use_reranker=False`, because the one thing this eval actually
measures didn't move, and the real-but-unquantified change elsewhere isn't a
basis for shipping added latency and a real environment-compatibility burden.

**What to check, going forward:** when an eval technically "passes" (nothing
broke) but the metric it exists to move didn't move, that is not the same as the
change being validated — check specifically whether the mechanism you added could
even reach the signal you're measuring (here: reranking can't touch the tier
decision at all, by construction, since agreement/margin are computed pre-rerank)
before concluding "no effect" means "doesn't matter." A structurally-inert result
and a genuinely negative result look identical in a summary table; only reading
the mechanism tells them apart.

## Preferences
- No intermediate steps shown — implement everything, report when done
- Everything must be real, professional, most advanced FO4 system possible
- Lucide icons only — no emoji in UI components
- All platforms must be fully wired end-to-end
