# MOSSY.SPACE Architecture

One-page orientation for this repo: what exists, what each piece does, how they connect, and what's live versus aspirational. Written so a new session (human or AI) can read this once and be oriented — not a changelog, not a tutorial. Verified against the code as of commit `65ea461e` (2026-08-13); re-verify anything load-bearing before relying on it if this file is old.

## What this is

MOSSY.SPACE is an Electron + React + TypeScript desktop app for Fallout 4 modding, built around an AI assistant ("Mossy") plus 23 sidebar platforms covering the full modding workflow — Creation Kit tooling, texture/asset pipelines, packaging, load-order management, and more.

## Top-level layout

| Path | What it is |
|---|---|
| `src/electron/` | Electron main process — window/app lifecycle, all IPC handlers, ESP/BGSM parsing, auto-updater, ML provider clients. Entry: `main.ts` (huge — tens of thousands of lines). |
| `src/renderer/` | The actual UI (Vite + React). By far the largest part of the app (~343 files). Entry: `index.html` → `main.tsx` → `App.tsx`. |
| `src/backend/` | Small Express server, **deployed separately to Render** (`mossy.onrender.com`). Holds the real Groq/OpenAI API keys server-side; both the Electron app and `brain-b/` call out to it for generation. Entry: `index.ts`. |
| `src/mining/` | FO4 domain-logic engines — ESP/BSA parsing, load-order optimization, conflict resolution, crash prevention, etc. Second-largest area of `src/` (83 files). No single entry point; independently-imported modules. |
| `src/shared/` | Shared types + embedded FO4 knowledge base. `types.ts` and `FO4KnowledgeBase.ts` are both very large single files. |
| `src/integrations/` | Third-party service clients: Bethel, Nexus Mods, Discord Rich Presence, Nemotron. |
| `brain-b/` | Python/Flask local AI service — retrieval + tutoring-contract router. Two variants: the developer's own GPU build (`gemma_service_enhanced.py`), and `nexus/` (CPU-only, no local model, compiled to a standalone .exe for Nexus release — see its own module docstrings for the full rationale). |
| `backend/` | **Not the same as `src/backend/`.** A separate, tiny standalone Express token server (`token-server.ts`) for OpenAI Realtime WebRTC ephemeral tokens. Easy to confuse with `src/backend/` by name alone — they're unrelated services. |
| `docs/` | The small set of *current* docs — this file, `mossy-brain-spec.md` (locked behavior/consent spec for Mossy's guided-flow features), `archive/`. |
| `docs-dev/` | ~76 files of historical fix/status/report markdown from past dev iterations. Not current documentation — a dev log, not a reference. Don't treat anything in here as ground truth without checking its date/relevance first. |
| `scripts/` | Build/dev tooling invoked from `package.json` (clean, validate, release, knowledge-sync). |
| `Mossy/` | electron-builder **output** — packaged app + `app.asar` for both editions ("Mossy NVIDIA", "Mossy Universal"). Build artifact, not source; `deploy-full.cjs` patches directly into `Mossy/<Edition>/resources/app.asar`. |
| `external/` | Knowledge-data folders (`mossy-brain-data`, `mossy-knowledge`, `volttech-dist`) — not real git submodules despite the name pattern. |
| `superpowers/`, `krita-ai-diffusion/` | Vendored third-party repos sitting in the tree, not MOSSY's own code. |

**Known repo hygiene issues** (not urgent, just don't be confused by them): the repo root has ~30 committed zero-byte junk files (single English words like `a`, `and`, `the` — almost certainly an old shell mishap that expanded a sentence into file-creation args, never cleaned up); `deploy-full.cjs` and `deploy-full.mjs` both exist but only the `.cjs` is wired into `npm run deploy`; `CHANGELOG.md` and `CHANGES.md` both exist at root; `src/components/` and `src/renderer/src/components/` are two different, confusingly-named directories (the root one only has a `guides/` subfolder — looks like an abandoned reorg).

## Build & deploy pipeline

- **`npm run build`**: validates version → Vite-compiles `src/renderer/` → `tsc`-compiles `src/electron/`+`src/main/`+`src/shared/` → runs a platform audit.
- **`npm run deploy`** = build, then `deploy-full.cjs` — a fast slim-pack deployer. It does *not* run electron-builder; it extracts the already-packaged `app.asar`, overlays fresh `dist/`+`dist-electron/` output (plus refreshed `.env.encrypted`/`CHANGELOG.md`/`package.json`), re-syncs a short required-`node_modules` list, and repacks — backing up the old asar first. This is the normal dev-iteration deploy path.
- **Full packaging** (`npm run package:win:nvidia` etc.) runs electron-builder from scratch, producing what `deploy-full.cjs` later patches for fast iteration.
- **Release publishing** is separate again — `scripts/Publish-MossyRelease.ps1`.

## The AI provider chain (verified against code, not memory — this is the part most likely to go stale)

### Cloud chat path
For the main chat surface, the fallback order inside `main.ts`'s `ai-chat-groq` handler is:
1. **Inkling** (Thinking Machines Tinker API, `thinkingmachines/Inkling`) — tried first if an API key is configured. A third, distinct provider from Groq/OpenAI.
2. **Render backend proxy** (`src/backend/routes/chat.ts`, `provider: 'groq'`) — the default path when a backend URL is configured (which it is, by default: `mossy.onrender.com`). Backend's own primary/fallback models: `openai/gpt-oss-120b` → `qwen/qwen3.6-27b` on rate-limit/context-overflow.
3. **Direct Groq SDK** — last-resort, only when no backend is reachable at all. Its own primary/fallback constants in `main.ts` are reversed from the backend's (`qwen/qwen3.6-27b` primary there) — harmless since it only activates when #2 is down, but don't assume the two "primary Groq model" constants in the codebase agree with each other.

Transcription is separate: goes through the Render backend too, but via OpenAI's `whisper-1`, not Groq.

### Local chat alternatives — all live, none dead
- **Ollama** (`src/electron/ml/ollama.ts`) — full chat-completion backend, real settings UI.
- **KoboldCpp** (`KoboldSetup.tsx`) — bundled `koboldcpp.exe` + `tinyllama`, full install/lifecycle manager, lowest-priority local fallback.
- **Brain B** — see its own section below.
- **DeepSeek-V4-Flash-0731** — lives in Ollama Settings but is actually a *hosted* Ollama Cloud model (needs `ollama signin`), not on-device.

### ⚠️ Open discrepancy — code and UI text disagree, don't assume either is authoritative
`LocalAIEngine.ts`'s actual `pickAuto()` priority order is: **`cosmos > brainb > ollama > openai_compat > koboldcpp > fo4bridge`**, with cloud only reached if no local provider is running. `localProviderPrimaryEnabled = true` confirms this is live behavior, not a disabled flag (despite an adjacent stale comment claiming the opposite). But `AIEngineSettings.tsx` and `BrainBSettings.tsx`'s own UI copy tell the user "Auto" mode is cloud-first, falling back to local. **The code and the shipped UI text contradict each other.** Verify which is actually intended before changing either — this wasn't resolved during the audit that found it.

### Image/texture/audio AI tools
All local-ComfyUI-based tools are **not bundled** — they call the user's own separately-running ComfyUI over HTTP. Licenses are annotated in-repo per tool:
- RMBG-2.0 (CC BY-NC 4.0, gated, user accepts license themselves), ComfyUI-RMBG defaults to BEN2/InSPyReNet/BEN (MIT) instead
- SUPIR upscaling — custom non-commercial license, only usable because MOSSY.SPACE stays free
- UltimateSDUpscale (GPL-3.0), IC-Light (Apache-2.0), LayerStyle (MIT), Impact-Pack (GPL-3.0), layerdiffuse (Apache-2.0)
- Knowledge Search's embeddings are **not an ML model at all** — local FNV-1a + TF-IDF hash-based, deliberately, not an oversight.

## Brain B (local retrieval + tutoring service)

Two variants, both documented in depth in their own module docstrings — this section is just the map:

- **Dev build** (`brain-b/gemma_service_enhanced.py`) — GPU-based, local Gemma model. Stays on the developer's own machine, never packaged for Nexus (same pattern as Creative Director's local-only status).
- **Nexus build** (`brain-b/nexus/brain_b_slim.py`) — CPU-only, no local model at all, retrieval via `fastembed`/ONNX, all generation routed through the same Render backend the rest of the app uses. Compiled to a standalone package via `build_nexus_package.py`, distributed via GitHub Releases, downloaded on-demand when a user clicks "Enable Brain B" (not bundled in the base installer).

**How the app calls into it**: `LocalAIEngine.ts` polls `{baseUrl}/health` and treats Brain B as one of the local providers in the Auto-mode priority chain above (2nd, right after `cosmos`) — when running, it's *preferred* over cloud, not merely a fallback. Any failure (not running, timeout, error) falls through to cloud silently. `BrainBSettings.tsx` is the settings UI; its "Auto mode prefers cloud" copy has the same discrepancy noted above.

## The 23 sidebar platforms

Dominant pattern: 16 of 23 are thin tabbed "hub" shells (`React.lazy` + `Suspense`) loading several substantial (100–1,800+ line) real sub-panels each. The shell layer is uniformly live and well-built (persisted tab state, keyboard shortcuts) across all of them; individual sub-panels weren't all exhaustively traced, but sampling found no placeholder/stub content.

| # | Platform | Route | What it does | Status |
|---|---|---|---|---|
| 1 | Mossy.Space (Home) | `/` | Dashboard: greeting, active project, live health strip (Electron API, Knowledge Vault, bridge connection). | Live |
| 2 | AI Chat | `/chat` | The main assistant — LLM chat, tool-calling for file/CK/Blender actions, project wizard, voice I/O. Largest file in the app. | Live |
| 3 | AI Mod Assistant | `/ai-mod-assistant` | Focused Papyrus/scripting assistant — generates from description, "quick fix" for broken code. | Live |
| 4 | FO4 Mod Journey Hub | `/journey-hub` | Onboarding/progression: First Success Wizard, Mod Projects, Roadmaps, Mod Browser. | Live shell |
| 5 | FO4 What's New | `/whats-new` | Changelog viewer for the current version. | Live |
| 6 | FO4 Knowledge Hub | `/knowledge-hub` | Quick Reference, Knowledge Search, Community Learning, Vanilla Asset Browser, AnythingLLM RAG search. | Live shell |
| 7 | FO4 Memory Vault | `/memory-vault` | Personal knowledge base with trust levels, community sharing, real AnythingLLM sync. | Live |
| 8 | FO4 Setup Wizards | `/wizards` | Install Wizard, PRP Patch Builder, Crash Triage, CK Quest wizard — real localStorage-backed progress. | Live |
| 9 | FO4 Creation Kit Hub | `/ck-tools` | CK Safety, Extension, Plugin Inspector (BA2/ESL/masters analysis), Quest Editor, Save Parser, Live Monitor, Game Link. 11 tabs, one of the deepest hubs. | Live |
| 10 | FO4 Textures & Materials | `/textures` | DDS Converter, Texture Generator, Image Studio, BGSM Editor, Optimizer, Enhancer, Background Remover, Post-Processing. 13 tabs. | Live shell |
| 11 | FO4 Packaging & Release | `/packaging-release` | BA2 Manager, checklist, Conflict Visualizer, Mod Comparison, FOMOD Assembler, Bethel Uploader. | Live |
| 12 | FO4 Guides Hub | `/guides-hub` | 7 full reference guides (Animation, Quest Authoring, LOD/Precombine, Papyrus, SS2, BodySlide). | Live (real content, not stubs) |
| 13 | FO4 Automation Studio | `/tools/cosmos` | **Misleadingly named** — not build automation. Manages NVIDIA Cosmos AI research repos as "knowledge roots" for the assistant; checks disk presence, gives clone commands. | Live for what it does |
| 14 | FO4 Mod Builder Hub | `/mod-builder` | Blueprint, Workshop, Devtools, Scribe, Project Creator — real drag-reorder, persisted state. | Live shell |
| 15 | FO4 Asset Analysis Hub | `/asset-analysis` | Mining Dashboard, Advanced Analysis, ML Mining, Deduplicator, Crash Analyzer, 3D Viewer. | Live shell |
| 16 | FO4 Automation Orchestrator | `/dev/orchestrator` | Real rule-based automation — file-watch/process/schedule triggers wired to real actions via a dedicated `electronAPI.automation` backend. | Live |
| 17 | FO4 Automation Runner | `/workflow-runner` | Step-based workflow builder — genuinely runs external programs/processes via real IPC. | Live |
| 18 | FO4 Runtime Hub | `/runtime-hub` | Live Synapse (voice), **Desktop Bridge** (= "Mossy Bridge", see below), Holodeck (scenario testing). | Live shell |
| 19 | FO4 External Integrations Hub | `/ext-tools` | MO2, ComfyUI, Upscayl panels + real tool auto-detection (installed/running state). | Live |
| 20 | FO4 Plugin & Load Order Hub | `/plugin-tools` | xEdit Tools, PRP Patch Tools, Load Order Hub, ESP Mining, Merge Scanner + detailed embedded reference. | Live shell |
| 21 | FO4 System & Diagnostics Hub | `/system-hub` | Diagnostics, Capabilities, KoboldCPP setup, Whitelist/Blacklist validator, Backup Manager, File Watcher. | Live shell |
| 22 | Settings | `/settings` | Privacy, App Lock, AI Engine selection, Ollama role assignment, Brain B/AnythingLLM settings, credits/licenses. | Live |
| 23 | Vault-Tec Creative Director | `/creative-director` | Quest/Dialogue/NPC/Lore/World-design suite. Pings an external backend at `localhost:8767` for richer generation; **that backend isn't in this repo** — falls back to a local template generator when offline. | **Partially aspirational** — real UI, works in degraded mode, headline AI features depend on infrastructure not shipped here. Local-only, per standing project convention. |

### Names that aren't separate platforms
- **"Mossy Bridge"** = the **Desktop Bridge** (`BridgeServer.ts`, port 21337) — screen capture, clipboard, hardware info, Blender add-on channel (port 9999). Lives inside Runtime Hub (#18), not its own sidebar entry. A legacy standalone Python reimplementation (`mossy_server.py`, repo root) exists as an alternate launcher for the same concept.
- **"Mossy Link"** = the downloadable Blender add-on itself (`public/mossy_link_addon.py`), the other end of that port-9999 channel. Not a platform/route — a bundled download, installed into Blender's own Add-ons preferences, surfaced from Runtime Hub. Binds to `127.0.0.1:9999` only (`MossyLinkServer.__init__`); auth is a locally-generated `secrets.token_hex(16)` (`_generate_secure_token()`), never an external API key, never leaves the machine. Once connected it gives Mossy real scene introspection (`_build_scene_context()` — object/mesh/armature stats, units, FPS, active action) and real FO4-specific export validation (`_build_fo4_warnings()` — FPS-pipeline mismatch, unit/scale mismatch, unapplied transforms, triangle-count vs. FO4's hard limit, missing UV layers, bone-count vs. recommended max, missing HKX pose markers), plus one-click automation presets (`_run_automation()` dispatch: `fo4_setup_scene`, `fo4_align`, `fo4_apply_transforms`, `fo4_clean_mesh`, `fo4_check`, `fo4_prep_rig`, `fo4_uv_check`, `fo4_generate_lightmap_uv`, `fo4_lod_setup`, `fo4_batch_export`). Two leftover ops from the Blender tutorial this was scaffolded from (`move_x`, `cursor_array`) are dead boilerplate, not real features — the code comments say so explicitly. Documented for the [5.6.0] release in `CHANGELOG.md`.
- **"Papyrus Studio"** = not a platform — a model-assignment *label* inside Settings → Ollama Settings ("which local model handles Papyrus generation"), used by the AI Mod Assistant and Mod Builder Hub.
- **"The F4AI relay"** = real, live HTTP server in `main.ts` on **port 8765** — receives NPC-dialogue requests from an external Python bridge (`Fallout-4-advanced-AI/`), calls Groq, optionally enriches with per-NPC memory files, returns the line. Status surfaced in Runtime Hub.
- **"Virtual Lab"** — **not found anywhere in this repo.** Possibly an outdated name for Holodeck (similar concept, inside Runtime Hub), a cut feature, or something from outside this repo. Unresolved — don't assume it exists as described.

## Why this division of labor works (keep it)

VS Code / an in-repo coding session has ground truth about the code and no view of licensing, platform policy, product framing, or whether an argument holds together end-to-end. A fresh reasoning-only session has the opposite. The sharpest catches in this project's history — retrieval-confidence-signal design, tokenization root-causing, license-obligation analysis, deploy/working-tree gaps — came from reasoning about a description of the system, not from reading its code directly. More repo access wouldn't have produced those catches; it risks crowding out the outside view that did. This file exists to make that outside view *accurate* without requiring full repo access — paste it at the start of a session for orientation, then reason from there.
