# MOSSY.SPACE Changelog

## [5.6.0] — 2026-08-05

### Background Remover — New Texture Hub Tab

- Added AI-powered background removal with two backends: a standalone local install (BRIA AI RMBG-2.0, GPU-accelerated, runs entirely on your machine) or a ComfyUI-RMBG backend defaulting to the permissively-licensed BEN2/InSPyReNet/BEN models
- RMBG-2.0 is CC BY-NC 4.0 (non-commercial only) and gated on HuggingFace — you'll need to accept BRIA's license and provide your own access token; this can't be automated and the tab walks you through it step by step
- Both backends support batch processing (pick multiple images at once)

### AI Post-Processing Pipeline — New Texture Hub Tab

- Layer Effects: drop shadow, outer glow, and color matching (match a cut-out foreground's grading to a new background)
- Face Detailer: automatic face detection and detail restoration
- Relight: AI relighting for an already-isolated subject (IC-Light)
- Upscale: photo-realistic detail upscaling (SUPIR — custom non-commercial license, only available because MOSSY.SPACE stays free forever) or tiled upscaling with your own checkpoints (UltimateSDUpscale, no license restrictions)
- Every tool here talks to your own separately-installed, separately-running ComfyUI over HTTP — none of this is bundled into MOSSY.SPACE itself

### AI Image Studio — Transparency & Inpaint

- Added a "Generate with transparency" toggle (LayerDiffuse) — produces a real alpha channel directly from generation, no separate background-removal pass needed
- Added a new Inpaint mode: brush a mask directly over the loaded image, then regenerate just that region via a crop-and-stitch pipeline (Inpaint Crop & Stitch) for faster, higher-quality results than whole-image inpainting

### One-Click ComfyUI Custom Node Installer

- All seven of the ComfyUI-based tools above (plus LayerDiffuse and Inpaint Crop & Stitch) can now be installed with one click, straight from wherever they're used — downloads the node's real GitHub source, installs its Python dependencies via ComfyUI's own embedded Python, pulls any needed model files, and restarts ComfyUI to load it. Mirrors the same auto-download precedent already used elsewhere in the app (e.g. the KoboldCPP setup step) — nothing here is manually hunted down by the user
- New **AI Texture Tools Setup Wizard** runs automatically right after Voice Setup on first install, and any time you replay "Initial Install" from Settings → Tutorial & Onboarding — walks through every tool above with live install status and one-click fixes, fully skippable

### Texture Enhancer — AI Detail Synthesis

- New first pipeline stage: generates real new fine surface detail via your own ComfyUI install (img2img) before every classical stage runs — unlike the rest of the pipeline (Sharp-based sharpening/edge-detection, which can only amplify detail already present), this adds detail that wasn't there in the source texture, so the derived normal/roughness/AO/height maps come out richer too
- Prompted automatically from the Material Surface you already select (organic, metal, stone, wood, fabric, etc.), with a denoise/steps/CFG slider and optional manual prompt override
- Off by default — opt-in since it needs ComfyUI running and takes real generation time, unlike the instant classical stages

### SS2 "Reality Check" Self-Improvement — Real Closed Loop

- Practice → grade → regenerate loop for SS2 Plot/City Plan generation now actually closes: a graded script's real deficiencies (and the actual real property names/EditorID conventions from your reference mods) get fed back into the next attempt's prompt, instead of one-shot diagnosis-only grading
- New Continuous Practice Session mode: runs scenario after scenario automatically (generate, grade, refine up to 8 attempts, move to a new scenario) until you hit Stop — pulled from a combinatorial pool of 27 real vanilla FO4 settlements and real SS2 Type/Tier/Size axes instead of a small fixed list of canned prompts
- Fixed a real scoring bug where City Plan docs were penalized for lacking CK records/properties the system prompt itself says basic City Plans don't need
- Fixed the deterministic rubric's header-matching to tolerate real wording variation (e.g. "Kitbash" vs "Kit-Bash") instead of requiring an exact string match
- New "Build Fine-Tune Dataset from These Mods" button converts your mined reference-corpus data into a real Unsloth/ShareGPT `.jsonl` training set for actually fine-tuning a local model on real SS2 conventions

### ComfyUI Reliability Fixes

- Fixed AI Image Studio showing stale/empty models after a live server hiccup — model list and disk-scanned checkpoints now always refresh together
- Fixed "Start ComfyUI" silently swallowing errors — failures now show the real reason instead of nothing happening
- Added an in-context "Set ComfyUI path" editor directly in AI Image Studio's offline banner, instead of only being configurable from External Integrations Hub
- Fixed the launch console window closing before a crash reason could be read — output is now captured to a log file (via PowerShell `Tee-Object`) and surfaced directly in the app, with an early ~10s failure check instead of always waiting the full 120s timeout

### DeepSeek-V4-Flash-0731 — Opt-In Cloud Model

- Added as an optional Ollama Cloud backend in Ollama Settings — free-tier, 1M-token context, runs through your existing local Ollama connection (no separate API key needed in Mossy)

### Mossy's Brain — Reasoning, Tutoring, and Real Community Knowledge

- New tutoring-methodology knowledge module: Socratic questioning, adjustable scaffolding, and honest AI-not-human framing when Mossy is in an actual teaching moment — explicitly scoped so it doesn't override her existing direct navigation guidance for "let's start a mod"-style requests
- New reasoning-methodology module: structured problem decomposition, root-causing instead of patching symptoms, weighing real alternatives before committing to an approach
- New real, researched FO4 modding-community knowledge module: what actually drives mod adoption (ESL flagging, FOMOD quality, compatibility patches, endorsement-driven discovery) versus abandonment (dependency cascades, F4SE version-break ripples, save-file bloat, silent-abandonment trust erosion)
- Added a real deliberate-reasoning pass before substantive answers and a self-critique pass after — both existed as settings fields already read by the code but had no UI to ever turn them on; now real, on-by-default toggles in AI Engine Settings

## [5.5.0] — 2026-07-28

### Localization — 12 Languages (In Progress)

- Added full UI translation infrastructure and real (non-placeholder) translations across English, Spanish, French, German, Russian, Simplified Chinese, Brazilian Portuguese, Japanese, Korean, Italian, Polish, and Turkish
- Fully localized: Home Dashboard, FO4 Mod Journey Hub, FO4 System & Diagnostics Hub, FO4 Knowledge Hub, FO4 What's New, FO4 Mod Builder Hub, FO4 Runtime Hub, FO4 Packaging & Release Hub, FO4 Automation Orchestrator, FO4 Setup Wizards Hub, FO4 External Integrations Hub, and the remaining un-translated Settings sections (AnythingLLM, Support, Credits)
- Larger platforms (AI Chat, Textures & Materials, Creation Kit Hub, and others) are not yet localized — this is an ongoing pass, not complete

### Texture Enhancer — Real Output, Not Placeholders

- Fixed weak/under-detailed normal map generation: replaced a single flat gradient tap with real per-method 3×3 kernels (Sobel/Prewitt/Scharr), configurable strength/smoothing, and fine-detail high-pass injection
- Added genuine specular map generation — the pipeline had a UI toggle for it but no actual implementation existed
- Fixed .bgsm material export: the specular texture slot was being filled from the metallic map instead of the real specular map; the greyscale-palette field was incorrectly populated from the roughness map; wired real height→displacement mapping; a .bgsm is no longer written at all if there's no real specular/metallic data to put in it
- Added a persistent, per-surface-preset learning loop — rating or discarding an enhancement result now measurably shifts future defaults for that surface type

### New Tool Integrations

- Added Sniff (NIF Batch Patcher, by zilav) as an auto-detected External Tools Hub integration, plus deep how-to-use coverage in Mossy's knowledge base for 17 additional professional tools (MO2, Vortex, LOOT, Wrye Bash, BethINI, BAE, GIMP, Photopea, PhotoDemon, NVIDIA Texture Tools, NifSkope, UnWrap3, NifUtilsSuite, Spin3D, UModel, Autodesk FBX Converter, iClone)
- Added Cathedral Assets Optimizer as a recognized External Tools Hub integration. BA2 packing failures caused by Archive2's real duplicate-filename limitation (same-named files across different subfolders — common in any mod past a trivial size) now surface a clear explanation and point to CAO, which handles this correctly
- Added a "Create a blank dummy plugin…" option to CK Tools Hub → Previsbines & PRP — saves a fresh copy of a minimal blank .esp for use as the active file during precombine/previs generation, so previs data lands in a clean patch instead of your real plugin

### Reliability Fixes

- Fixed a process leak in CK Crash Prevention's Live Monitor: its 3-second polling loop had no protection against overlapping calls, so a single slow poll (e.g. intercepted by antivirus) could cause dozens of orphaned processes to pile up and drive CPU to 100%. Polls are now deduplicated with a hard timeout
- Fixed Full Mod Scan (CK Crash Prevention) hanging indefinitely on real-world mods with thousands of files: the scan previously ran fully synchronously with no yielding, blocking the entire app for its whole duration. It now yields periodically and reports live progress instead of a static spinner — verified against a real 2,566-file mod that never completed in 10 minutes before the fix and now finishes in under a minute
- Fixed the ESP/plugin parser (Asset Analysis Hub → Mining Dashboard) failing on essentially any real Fallout 4 plugin: it had no handling for GRUP record groups — the structure virtually every real record is actually organized under — or for zlib-compressed records, causing it to misread the file and crash. Rewrote the group/record walker with correct GRUP semantics, added compressed-record decompression, and added defensive realignment so one malformed record can no longer cascade into failing the rest of the file. Verified against a real mod's plugin that previously failed 100% of the time

### Vault-Tec Creative Director (local-only, dev tooling)

- Fixed the Handoff panel: queued projects were never rendered as interactive cards, making the entire queue workflow unreachable
- Fixed VR Lab "send to lab" to also search the pending queue, not just completed projects
- Added stalled-request detection (pending 2+ hours with no report) with a clear warning and re-submit option in the UI
- Built out the previously-missing "Personal R&D Network" REST backend (port 8767) with real LLM-generated, sandboxed analysis scripts, closing a gap where the panel showed "Offline Mode" even though the client already expected this service to exist

### Onboarding & Tutorial — Full Accuracy Overhaul

- Fixed a first-run bug where Voice Setup could never appear: its visibility check ran at mount time before onboarding had completed, so it always evaluated false. Voice Setup now correctly re-triggers right after onboarding finishes (if not already completed).
- Fixed an onboarding-completion tracking bug: two different localStorage flags (`mossy_onboarding_complete` and `mossy_onboarding_completed`) were set inconsistently, causing First Run and Voice Setup to disagree about whether onboarding had finished. Both flags are now always set together.
- Rewrote the First Run onboarding step list to match real tools: replaced a fictional "The Organizer" step with the real FO4 Plugin & Load Order Hub (drag-and-drop load order editing, MO2/Vortex import/export, FormID conflict detection), and corrected "The Auditor" to describe its real location as the Crash Prevention & Audit tab inside the FO4 Creation Kit Hub rather than a standalone tool
- Fixed the Install Wizard's guide-hub link text, which undercounted the tutorial platform list (22 → the real 23)
- Deleted a dead, stale image-mapping system (56 old screenshots under an out-of-date naming scheme, plus its generator script) that could never actually be reached by the current 23-page tutorial — the real, current screenshot set is now the only one referenced anywhere
- Rebuilt the Fallout 4 Wiki tutorial entry: removed it from the 23-page guided tour (the standalone wiki page it described no longer exists) and added a real "Fallout Wiki" reference button directly in the FO4 Guides Hub instead
- Swapped Guided Tours into tutorial page 23 (it was previously mismatched with a Creative Director screenshot) and gave it full, accurate coverage of the real Welcome Tour / Feature Spotlight / Initial Install replay buttons
- Rewrote the Pip-Boy Mode tutorial entry to correctly describe it as a full app-wide visual theme (CRT green monospace UI, screen-reflection overlay), not just a lit button
- Audited every tutorial route against the app's real routing table and fixed 16 stale/broken routes across secondary contextual-help entries (Live Voice, Holodeck, Diagnostics, Desktop Bridge, Support, guide pages, Roadmap, First Success, Advanced Analysis, Capabilities, and more)
- Audited every multi-tab hub in the app against its real tab list and fixed 7 tutorial entries that undercounted real tabs: FO4 Textures & Materials (4→11 tabs documented), FO4 Plugin & Load Order Hub (4→6), FO4 Guides Hub (3→7), FO4 Creation Kit Hub (8→11, adding Plugin Inspector, Pre-Publish Checklist, INI Validator), FO4 Asset Analysis Hub (5→7, adding Phase 2 Mining, Crash Analyzer), FO4 Knowledge Hub (3→5, adding Vanilla Assets, RAG Search), FO4 Mod Builder Hub (4→5, adding Project Creator)

### Capability Gaps Closed

- Animation Editor can now load and save real NIF/HKX skeleton data through the Blender + PyNifly bridge, instead of only showing a demo skeleton
- Asset Optimizer now performs real mesh cleanup (via Blender + PyNifly) and real Papyrus script recompilation, instead of reporting "not implemented" for those operations
- Runtime Hub's live game monitor now reports real RAM and VRAM usage (via live process/GPU queries) instead of placeholder zeros; FPS, script timing, and console/variable inspection are honestly labeled "unavailable — requires an F4SE plugin" rather than showing fake data

### FO4 Asset Analysis / Plugin & Load Order Hub — Real ESP Mining

- New ESP Mining tab: pick any plugin from your load order and analyze its real FormID relationships, cell/worldspace data, and quest objectives, powered by a new binary GRUP/record-tree parser that handles zlib-compressed records
- New Mod Comparison Tool support: real side-by-side plugin diffing (shared FormIDs, shared asset paths, shared masters, ESL/ESM/ESP flags), plus ESL-flag detection in plugin headers

### Material & Texture Tooling — Real File Output

- BGSM Editor and Material Editor now write genuine binary Fallout 4 .bgsm v2 files (verified against the community Material-Editor format reference) instead of exporting JSON disguised as .bgsm; non-v2 saves now honestly export as .json with a clear "not a binary .bgsm" notice
- Material Editor: replaced the static preview sphere with a real live 3D preview, added working shader-graph node wiring/dragging, a functional material Validate check, and real texture baking
- Material Definitions: added a real "Browse Mod Folder" picker (previously always showed an empty list with no way to load a manifest), a working "Preview in Blender" button, and a working "Export Material" button
- Texture Generator: "download map" buttons now actually reveal the file on disk instead of just showing a toast; added a real cavity-map generator; gallery now persists between sessions

### Mining Engines — Removed Fabricated Data

- Replaced hardcoded fake hardware profiles ("Intel Core i7-10700K", "Mock CPU", "RTX 3070") with real CPU/GPU/RAM/storage detection
- ML Conflict Prediction no longer returns random conflict probabilities — it now checks real plugin files directly when both mods resolve to actual files, falling back to a transparent (explicitly non-ML) weighted-feature heuristic otherwise
- Unused Asset Detector now scans real record data for asset paths instead of matching against a hardcoded mock file list
- Cell/Worldspace mining's unknown-worldspace fallback fixed from Skyrim's "Tamriel" to Fallout 4's "Commonwealth"
- Longitudinal and pipeline-wide stability/FPS/performance metrics are now computed from real session data (or honestly left empty) instead of hardcoded placeholder numbers
- Deleted seven dead/fabricated-output mining engine files that either produced fake data or were unreachable from any UI

### App Lock & Privacy

- New password-protected App Lock: set a password in Settings → Privacy to require it for opening Settings, with a configurable auto-lock timer (1–240 minutes of inactivity)
- "Allow Clipboard Access" is now a real, enforced toggle — disabling it actually blocks clipboard read/write app-wide instead of only being cosmetic
- API keys in Settings now show their real age and are flagged when overdue for rotation

### AI Chat Interface

- Attached files are now actually read and sent to the AI — previously an attached file was invisible to the model and silently ignored
- "Stop Generation" now genuinely aborts the in-flight request instead of racing it against a "Stopped" message
- AI-proposed Python code blocks now get a real "Run Command" button when Blender is in scope
- Chat now injects FO4 knowledge base context automatically

### Editor & Tool Fixes

- Quest Editor: "Test Quest" now runs real structural validation (duplicate stages, unreachable stages, empty objectives, dangling connections) instead of just echoing a count; Conditions and Actions are now fully editable, matching Objectives
- Conflict Resolver: added a real deep-scan mode with per-field diffing, and wired up the previously-dead "Export Conflict Report" button
- Mod Browser: reviews now persist between sessions instead of resetting on every restart; fixed a bug where mod endorsements silently failed against Nexus's API
- Self-Improvement Engine's script generator now calls the real local AI model with your actual request instead of returning a static template with a fabricated confidence score
- Save Game Parser no longer shows fabricated example data on a parse failure — it now shows the real error
- Knowledge Search no longer mislabels indexing errors as "no internet access" (search is fully local/offline)
- System metrics feeding the AI's live hardware awareness are now real readings instead of simulated values
- Texture Detail Enhancer: added a true 1x "Enhance" mode (detail pass without upscaling); simulated jobs are now clearly labeled as such
- Voice Commands now runs through the app's real speech-recognition service instead of a non-functional stub
- Donation links now point to real, active accounts
- Updated to currently-available Groq model IDs

### Dead Code Removal

- Removed unreferenced legacy modules with no remaining call sites anywhere in the app: old mining/AI-assistant engines superseded by their consolidated replacements, and an unused Mining Hub component

---

## [5.4.69] — 2026-07-25

### FO4 Knowledge Base — Comprehensive Verified Expansion

- Audited and expanded `FO4KnowledgeBase.ts` from 1,294 to 1,858 lines (~254 KB serialized) — every AI surface (main chat, AI Mod Assistant, Creative Director) now injects substantially deeper, source-verified FO4 modding knowledge
- Verification method: each addition was checked against real shipped Papyrus source (`FollowersScript`, `CompanionActorScript`, `Quest`, `Faction`, `EncounterZone`, `Terminal`, `LeveledItem`/`LeveledActor`, `InputEnableLayer`, `LegendaryItemQuestScript`), xEdit's real record definitions (`wbDefinitionsFO4.pas`), or 35+ real, popular mods' own technical documentation — never guessed
- New standing practice: when web search turns up nothing on a mechanic, scan the actual installed game's Papyrus source and DLC archives before calling it unverifiable (now saved as durable project guidance)
- New sections added: `baseObjectSwapper`, `robCoPatcher`, `gardenOfEdenPapyrusExtender`, `animationFrameworkLandscape` (AAF vs. NAF vs. IAF), `scaleformUIModding` (Hydra, F4SE Menu Framework, PrismaUI, HUDFramework), `extensibleCustomSystemArchitecture`, `vegetationAndFoliageSystem` — completing full coverage of the config-driven, no-CK-editing patching ecosystem (SPID + Base Object Swapper + RobCo Patcher + SUP F4SE)
- Major corrections/expansions to existing sections: `companionSystem` (real `SetPlayerTeammate()` primitive, multi-companion architectures, alternative affinity models), `settlementSystem` (Workshop Framework's real per-workshop load/unload data architecture), `previsSystem` (LOD Clip Volumes, `bUseCombinedObjects`, missing-ground diagnostics), `leveledListSystem`, `spellPerkItemDistributorSPID`, `weatherSystem` (seasonal weather technique), `combatAISystem` (real hardcoded active-actor and interior-chase caps), `compatibilityPatching` (engine-bug-dependency cautionary case study), `looksMenuCustomization` (BodyGen per-plugin scoping), `f4sePluginDevelopment`
- Fixed pre-existing bugs found during the audit: fabricated code/console-command examples, a duplicate/incorrect version number, an unverifiable citation, a scope-mismatched conflict-pattern description

### Onboarding

- Updated first-run welcome screen "What's new" summary to reflect the knowledge base expansion above

## [5.4.68] — 2026-06-27

### Creative Director — Full Pipeline Restructure

- Replaced old multi-agent "write all sections" loop with a strict gated 5-agent pipeline: Mod Planner → Plan Reviewer → Game Data Analyst → USER APPROVAL GATE → Mod Builder → Build Verifier
- Approval gate: AI pipeline pauses after analysis and waits for user confirmation before any building starts
- Send Back with Feedback: user writes specific revision notes and sends the plan back to the Planner; reviewer and analyst re-run automatically
- Scope hard-capped at 1 quest (3–5 stages), 1–2 NPCs, 1 location, no custom assets — enforced by all agent system prompts
- Builder writes one section at a time (Quest & Stage Design → NPC Records → Scene & Placement → Build Instructions); Verifier checks each before advancing
- Phase progress bar in UI: Planning → Review → Analysis → Approval → Building → Verifying → Done
- Per-turn status badges: APPROVED / NEEDS REVISION / PASSED / FAILED shown on reviewer and verifier messages
- New IPC handlers: creative-director:approve-plan, creative-director:reject-plan
- New preload API: approvePlan(), rejectPlan(feedback)
- New agent color coding for all 5 pipeline roles (Planner cyan, Reviewer rose, Analyst violet, Builder emerald, Verifier orange)
- Build section progress tracker shown during building/verifying phases

### FO4 Game Data — Brain Neurons Added

- fo4-form-graph brain neuron (priority 91): injects FO4 record relationships, 554 perk chain texts, faction data, and KWDA keyword index into every AI prompt at startup
- fo4-asset-graph brain neuron (priority 90): injects 32,708 NIF model paths, 1,062 ARMA records with model paths, 3,976 OMOD records with parsed property data, and armor paint system details
- Both neurons loaded in the startup fast-scan sequence and included in scan:run-all tier 2

### FO4 Asset Graph Scanner (scripts/fo4_asset_graph.py)

- New script: extracts OMOD DATA binary (20-byte preamble + 24-byte property entries per property), ARMA model paths (MODL/MOD2/MOD3/MOD4), ARMO-to-ARMA addon links, armor paint FNAM filter keywords
- Outputs H:\Mossy Memory\fo4_asset_graph.json (9.4 MB): model_paths, arma_info, armo_addons, omod_data, keyword_omod, edid_index, type_index
- Parses 3,000+ OMODs with full property tables (valueType, funcType, propEnum, value, step, flags)
- Armor paint system documented: regular armor ap_armor_Paint KYWD (0x0024A0FA), Power Armor parent ARMO 0x0017DAA8

### FO4 Form Graph Scanner (scripts/fo4_form_graph.py)

- Added perk_chain_texts to JSON output: 554 pre-built text chains (PERK → SPEL → MGEF → Script) for all FO4 perks
- Graph JSON updated to 10.5 MB
- Fixed: perk chain texts were previously computed but not saved to JSON output

### FO4 Only — Skyrim Removed from Game Link

- CK Hub → Game Link tab: Skyrim dropdown removed, replaced with static Fallout 4 label
- GameIntegration.tsx: removed selectedGame state, setSelectedGame handler, Skyrim SelectItem, and unused Select component imports
- Mossy is strictly Fallout 4 — no other game references in UI components

### Tutorial & Documentation

- Updated Creative Director tutorial context: new pipeline description, 5-agent roles, approval gate guide, rejection feedback guide, updated common mistakes and suggested questions
- Created CHANGELOG.md (this file) at project root — parsed by What's New system

---

## [5.4.67] — 2026-06-17

### AnythingLLM RAG Engine Integration

- Integrated AnythingLLM as local RAG engine for FO4 knowledge queries
- AnythingLLMSearch.tsx and AnythingLLMSettings.tsx added to AI platforms
- Backend bridge connects Mossy AI Chat to AnythingLLM workspace documents
- Settings panel for workspace URL, API key, and workspace slug configuration

### FO4 NPC Catalogue and Export Tools

- NPC record catalogue with faction affiliations, race data, and voice type index
- Export tools for NPC records to JSON for AI context injection
- Integrated into asset graph scan pipeline

### Backend Environment and Auth Fixes

- Fixed backend .env loading order — project root takes precedence over packaged defaults
- Fixed auth token handling for Render-hosted backend connections
- Added connection health check with retry logic on startup

---

## [5.4.66] — 2026-06-10

### Creative Director — Initial Scaffolding

- Concept art generation pipeline with Stable Diffusion integration
- Scaffold mod structure from BUILD_GUIDE.md
- VR lab quest spec writer for Unity NavMesh testing
- xEdit Script Generator — Pascal FO4Edit script auto-wires selected records into ESP
- Lab Handoff panel with project queue management
