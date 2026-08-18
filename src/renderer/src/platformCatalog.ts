/**
 * Platform Catalog — single source of truth for what exists in MOSSY.SPACE.
 *
 * Compiled 2026-08-15 by deep-diving every one of the 23 sidebar platforms'
 * actual sub-panels (not inferred from route/tab names — see the research
 * behind this file if it's ever redone: three parallel passes, each opening
 * every hub's real sub-components and describing what they actually do).
 *
 * Purpose: two things this app was missing a real answer to.
 *   1. "Does a feature like this already exist somewhere?" — before adding
 *      a new platform or a new top-level UI surface, check here first. Most
 *      new capabilities belong inside an existing hub's tab list, not as a
 *      new platform.
 *   2. Mossy's own system prompt (MossyBrain.ts) folds a condensed version
 *      of this catalog in, so the AI's answers about "what can you do" or
 *      "where do I find X" are grounded in the real, current feature set
 *      instead of the model's guess or stale training-time assumptions.
 *
 * Keep this in sync with reality: when a platform gains/loses a tab, or a
 * sub-panel's actual behavior changes meaningfully, update its entry here.
 * A stale catalog is worse than no catalog — it actively misleads whoever
 * (human or Mossy) trusts it.
 */

export interface PlatformFeature {
  name: string;
  description: string;
}

export interface PlatformEntry {
  id: number;
  name: string;
  route: string;
  mainFile: string;
  /** 1-2 sentence overview of the whole platform. */
  summary: string;
  /** Every real sub-panel/tab/tool within this platform. */
  features: PlatformFeature[];
  /** Present only when something notable applies — not a real platform
   *  quirk otherwise. */
  notes?: string;
}

export const PLATFORM_CATALOG: PlatformEntry[] = [
  {
    id: 1,
    name: 'Mossy.Space (Home Dashboard)',
    route: '/',
    mainFile: 'TheNexus.tsx',
    summary:
      'A single flat dashboard (not tabbed) — greets the user, shows a live environment-health strip, surfaces the active mod project, and provides quick-navigation into the other 22 platforms plus a 6-step FO4-modding "where to start" primer.',
    features: [
      { name: 'Time-based greeting', description: 'Morning/afternoon/evening greeting based on system clock, rendered as the central HUD readout.' },
      { name: 'Active Project banner', description: 'Reads the current mod project from storage and shows its name/description with a jump link to Journey Hub.' },
      { name: 'Health strip', description: 'Six live-checked, color-coded badges: Electron preload API, localStorage read/write, Knowledge Vault item count, Install Wizard progress, microphone permission, TTS voice count.' },
      { name: 'Bridge status pill', description: 'Live-polled Desktop Bridge connection indicator (UPLINK SYNCED/REQUIRED).' },
      { name: 'Quick Hub Access grid', description: '12 tiles linking directly into Chat, Journey Hub, CK Tools, Plugin Tools, Textures, Asset Analysis, Mod Builder, Packaging, Guides Hub, Knowledge Hub, System Hub, and Runtime Hub.' },
      { name: '"Where to Start" steps', description: 'Static 6-step onboarding cards (Setup Wizards → Mod Goal/Roadmaps → Load Order → Asset Pipeline → Version/Stability → Build & Package), each linking to the relevant hub.' },
      { name: 'Support banner', description: 'External links to Patreon and Buy Me a Coffee.' },
      { name: 'Tools Install/Verify panel', description: 'Static "what to check" / "first test loop" / troubleshooting guidance block, embedded as a mini help panel.' },
    ],
  },
  {
    id: 2,
    name: 'AI Chat',
    route: '/chat',
    mainFile: 'ChatInterface.tsx',
    summary:
      "The app's flagship AI assistant — full LLM chat with streaming, first-run onboarding/system-scan, project creation, real tool-calling into Blender/Creation Kit/xEdit/file system/web, and voice I/O.",
    features: [
      { name: 'Onboarding flow', description: 'Runs a real hardware/software scan (merges configured tool paths with Electron-detected installed programs against a modding-tool keyword list) before the assistant becomes ready.' },
      { name: 'Project Wizard', description: 'Modal that collects a new mod\'s name/description/category tags and creates a project file.' },
      { name: 'Core chat loop', description: 'Streams responses through LocalAIEngine.generateResponse with persona + knowledge base + tool-permission + knowledge-vault context injected; supports stop-generation mid-stream.' },
      { name: 'Tool-calling', description: 'Real, working actions: Blender script execution/push, scene info, Papyrus/xEdit script generation, Creation Kit record control (create/edit/duplicate/list/FormID lookup), file listing, hardware/tool scanning, web search, plugin conflict scan/fix, mod-project CRUD.' },
      { name: 'Voice mode', description: 'Browser speech-recognition mic input with auto-send-on-silence, transcription via IPC, TTS output with a stop-audio workaround for an Electron speechSynthesis bug.' },
      { name: 'Self-Improvement panel', description: 'Toggleable side panel showing Mossy\'s self-tracked learning/improvement data.' },
      { name: 'Suggestion chips', description: 'Context-aware follow-up suggestions based on onboarding state and conversation content.' },
      { name: 'Activity tracking', description: 'Every meaningful action recorded for cross-platform "Modding Journey" achievement tracking.' },
    ],
  },
  {
    id: 3,
    name: 'AI Mod Assistant',
    route: '/ai-mod-assistant',
    mainFile: 'AIModAssistant.tsx',
    summary:
      'A focused, script-centric sibling to AI Chat — two-pane Papyrus/scripting assistant with a persistent Code Assistant panel holding the most recently generated/fixed/refactored code.',
    features: [
      { name: 'Chat feed', description: 'Conversational Q&A with FO4-specific record-format rules injected, plus a live-scanned form/asset/texture/mesh/material catalog refreshed every 5 minutes.' },
      { name: 'Generate Script (wizard)', description: 'Asks what to build (quest script, dialogue, weapon/armor effect, perk, spell, trap), then generates a full Papyrus script with FO4-specific correctness rules.' },
      { name: 'Inline Suggestions', description: 'Returns 4 concrete, tool-referencing next-step suggestions from recent conversation.' },
      { name: 'Refactor Code', description: 'Cleans up structure/naming/comments of the code in the panel while preserving intent.' },
      { name: 'Quick Fix', description: 'Finds and fixes bugs using a checklist of known FO4 Papyrus bug patterns.' },
      { name: 'Learning Mode', description: 'Toggle that makes every response briefly explain its reasoning before the final answer.' },
      { name: 'Voice input', description: 'Transcribes speech directly into the input box via local Whisper or browser SpeechRecognition.' },
      { name: 'Code preview panel', description: 'Shows the latest code block with copy-to-clipboard and a reference of what each Smart Action button does.' },
    ],
  },
  {
    id: 4,
    name: 'FO4 Mod Journey Hub',
    route: '/journey-hub',
    mainFile: 'JourneyHub.tsx',
    summary: 'Onboarding, project management, AI-generated roadmaps, and mod discovery, in a 4-tab shell.',
    features: [
      { name: 'First Success', description: 'Static 4-step "first win" checklist (scan → verify tools → index guides → ask a first question).' },
      { name: 'Mod Projects', description: 'Accordion of 6 sub-sections: Mod Project Manager, Modding Journey (achievements from action logs), Collaboration Manager, Version Control (real git UI — history/branches/backups/diffs), Analytics Manager (tool-usage stats from action logs), and a second IPC-backed Project Manager.' },
      { name: 'Roadmaps', description: 'AI-generates a structured step-by-step plan from a typed modding goal, with per-step status tracking, persisted via IPC.' },
      { name: 'Mod Browser', description: 'Real Nexus-Mods-style search/browse/download/rate/endorse UI, collection creation/sharing, API-key auth, and community content submission as GitHub issues.' },
    ],
  },
  {
    id: 5,
    name: "FO4 What's New",
    route: '/whats-new',
    mainFile: 'WhatsNewPage.tsx',
    summary: 'A flat changelog/release-notes viewer for the app itself (not FO4 mod content).',
    features: [
      { name: 'Changelog viewer', description: "Loads the current version's changelog, per-feature highlight cards, and a bulleted release-highlights list; marks the version as seen." },
      { name: 'Fallback notice', description: 'Shows an amber banner when falling back to the nearest available version\'s notes.' },
      { name: 'Dismiss toggle', description: '"Don\'t auto-open again" checkbox, persisted via IPC with a localStorage fallback.' },
      { name: 'Tips panels', description: 'Static "FO4 Workflow Tips" and "Stay in the Loop" side panels.' },
    ],
  },
  {
    id: 6,
    name: 'FO4 Knowledge Hub',
    route: '/knowledge-hub',
    mainFile: 'KnowledgeHub.tsx',
    summary: 'A 4-tab hub consolidating all lookup/search/learning surfaces.',
    features: [
      { name: 'Quick Reference', description: 'Large static, searchable, collapsible reference of Papyrus keywords/syntax, F4SE functions, and CK hotkeys, with explicit anti-pattern callouts.' },
      { name: 'Knowledge Search', description: 'Real local semantic/keyword search over user-added folder roots, with ML index building and an optional local-Ollama AI-summarized-answer mode.' },
      { name: 'Community Learning', description: 'Saves a local learning profile and submits it as a pre-filled GitHub issue to a community repo.' },
      { name: 'Vanilla Assets', description: "Browses a user-unpacked copy of FO4's base-game Data folder with type-aware tree view, search/filter, and texture-reference extraction from .bgsm/.nif files." },
      { name: 'RAG Search', description: 'Queries a locally-running AnythingLLM server against a chosen workspace, returning an AI answer with cited sources.' },
    ],
  },
  {
    id: 7,
    name: 'FO4 Memory Vault',
    route: '/memory-vault',
    mainFile: 'MossyMemoryVault.tsx',
    summary:
      'A large single-page personal knowledge base — real content ingestion, trust-leveled storage, and community sharing/sync, backed by localStorage plus a durable file backup.',
    features: [
      { name: 'Manual ingestion', description: 'Form with title/content/source/credit/trust-level/tags, required-source validation, and a 7-day duplicate-title check.' },
      { name: 'File/drag-drop ingestion', description: 'Type-specific parsers for PDF, PSD (layer/metadata extraction), ABR brush files, plain text/code, and video/audio (real Whisper transcription, offline or cloud).' },
      { name: 'Trust-level system', description: 'Personal/community/official tagging with a stats bar and filter.' },
      { name: 'Bundled/community packs', description: 'Auto-imports bundled knowledge packs on first load (version-tracked), plus a Browse Library modal for selective community pack import.' },
      { name: 'Community sharing', description: 'Per-item share toggle, JSON export/import for manual sharing, and a GitHub-repo-backed community library browser.' },
      { name: 'AnythingLLM sync', description: 'Pushes vault memories into a chosen AnythingLLM workspace as searchable documents.' },
      { name: 'Export/backup', description: 'Full-vault JSON export; durable file backup that auto-restores if localStorage is empty.' },
      { name: 'Search & tag suggestions', description: 'Full-text search across title/content/tags; suggests existing tags matching text being typed.' },
    ],
  },
  {
    id: 8,
    name: 'FO4 Setup Wizards',
    route: '/wizards',
    mainFile: 'WizardsHub.tsx',
    summary:
      'An accordion walking through a linear FO4 modding setup flow, with per-section progress tracking, a game-version selector (OG/NG/AE), and an overall progress bar.',
    features: [
      { name: 'Choose a Platform', description: 'Card grid routing to Crash Triage, Packaging, CK Quest & Dialogue, Install Wizard, Deep Scan, SS2 learning path, Guides Hub, Precombine/PRP guide, PRP Patch Builder, The Vault, Audio Studio, Animation Guide.' },
      { name: 'Install Wizard', description: 'Per-topic (F4SE, xEdit, SS2, PRP, Patching) step checklists with mod-manager selection and detected tool path actions.' },
      { name: 'Crash & Bug Triage', description: 'Scenario-selectable step-by-step diagnostic checklist (collect → repro → logs → isolate → fix → verify) with scenario-specific tips.' },
      { name: 'CK Quest & Dialogue', description: 'Goal-selectable step checklist (setup → quest → dialogue → scripts → test → ship) with concrete CK guidance.' },
      { name: 'Packaging & Release', description: 'Static checklist (BA2, folder structure, FOMOD, versioning, upload checklist, conflict verification) linking to the full hub and BA2 Manager.' },
      { name: 'PRP Patch Builder', description: 'Form-driven generator producing a real PRP compatibility-patch README/plan based on your answers.' },
    ],
  },
  {
    id: 9,
    name: 'FO4 Creation Kit Hub',
    route: '/ck-tools',
    mainFile: 'CKToolsHub.tsx',
    summary:
      'An 11-tab hub covering the full Creation Kit workflow — crash prevention, plugin binary analysis/repair, quest and animation editing, save/live-game inspection, and static CK reference.',
    features: [
      { name: 'CK Safety', description: 'Pre-flight checks, Live Monitor (watches CreationKit.exe), Post-Crash Analysis (parses crash log/dump), plus embedded Spriggit ESP↔text conversion.' },
      { name: 'CK Extension', description: 'Auto-save countdown, an 8-rule client-side Papyrus linter, and a compile-job queue via IPC.' },
      { name: 'FO4 CK Guide', description: 'Static reference: CK version/NG-AE compatibility, BA2 version warnings, deprecated framework list, common crash causes.' },
      { name: 'Plugin Inspector', description: 'Binary deep-scan with one-click auto-fixes (Inspect & Fix), conflict-patch generation (Patch Creator), and a guided previsbine/PRP pipeline.' },
      { name: 'Pre-Publish', description: '22-item category-grouped release checklist with critical/optional flags and persisted progress.' },
      { name: 'INI Validator', description: 'Checks Fallout4.ini/Custom.ini against a curated list of important settings with severity ratings.' },
      { name: 'Quest Editor', description: 'Visual node-graph editor for quest stages, exporting a scaffolded Papyrus quest fragment.' },
      { name: 'Animation', description: 'Three.js skeleton/keyframe editor with bone hierarchy, 3D viewport, timeline, weight-painting, and IK transform tools.' },
      { name: 'Save Parser', description: 'Parses an FO4 save file (stats, location, active mods, missing masters, quest count, inventory, caps) via the Desktop Bridge.' },
      { name: 'Live Monitor', description: 'Polls a running FO4 process for real RAM/VRAM; deeper engine metrics require an optional F4SE bridge plugin.' },
      { name: 'Game Link', description: 'Five-tab F4SE-bridge panel: Game Monitor, Console Commander, Save Analyzer, Performance Dashboard, Quick Test Tools.' },
    ],
  },
  {
    id: 10,
    name: 'FO4 Textures & Materials',
    route: '/textures',
    mainFile: 'TextureMaterialsHub.tsx',
    summary:
      'A 13-tab texture/material pipeline hub spanning format conversion, procedural/AI generation, PBR authoring, BGSM editing, and several ComfyUI/Stable-Diffusion-backed AI image tools calling the user\'s own AI backends.',
    features: [
      { name: 'DDS Converter', description: 'PNG/TGA/BMP/JPG ⇄ DDS (BC1/BC3/BC4/BC5/BC6H/BC7/uncompressed) with mipmaps and filename-based format suggestion, single and batch mode.' },
      { name: 'Texture Generator', description: 'PBR map generation, procedural textures (noise/checkerboard/brick/concrete/metal/fabric/wood), seamless-tiling/upscale/batch tools.' },
      { name: 'Image Studio', description: 'Derives PBR maps from a source image, and converts to DDS with FO4 presets.' },
      { name: 'FO4 Texture Guide', description: 'Static DDS suffix/channel/format reference and PBR/ENB pipeline notes.' },
      { name: 'BGSM Editor', description: 'Full read/write editor for .bgsm/.bgem — texture slots, shader flags, lighting, PBR/RMAOS, alpha, emissive, tessellation, glass/envmap.' },
      { name: 'Mat Editor', description: 'Three.js node-based shader graph editor with material library and live 3D preview.' },
      { name: 'Mat Definitions', description: 'Views/edits materials from a .mossy_material.json manifest, linked to a Blender live-preview viewport.' },
      { name: 'Optimizer', description: 'Batch optimization jobs (texture resize/mipmap, mesh compression, script optimization) via a local bridge.' },
      { name: 'Enhancer', description: 'Detail-extraction/PBR-generation pipeline (not an upscaler) — albedo de-lighting, normal-map generation, roughness/metallic/AO/cavity/height maps.' },
      { name: 'Krita AI Paint', description: 'Instructional guide for Krita + ComfyUI + krita-ai-diffusion setup with FO4 prompting tips — generation happens in Krita, not in-app.' },
      { name: 'AI Image Studio', description: 'txt2img/img2img via the user\'s local Stable Diffusion backend, with FO4-flavored style presets and checkpoint recommendations.' },
      { name: 'Background Remover', description: 'AI background isolation via a local BRIA RMBG-2.0 subprocess or the user\'s ComfyUI with license-vetted model choices.' },
      { name: 'Post-Processing', description: 'Layer Effects, Face Detailer, Relight, and Upscale (SUPIR), each calling the user\'s own ComfyUI server.' },
    ],
  },
  {
    id: 11,
    name: 'FO4 Packaging & Release',
    route: '/packaging-release',
    mainFile: 'PackagingHub.tsx',
    summary:
      'A step-ordered accordion (6 numbered steps + 3 advanced sections) covering the full release pipeline from BA2 packing through FOMOD build and publish.',
    features: [
      { name: 'BA2 Archive Manager', description: 'Lists/extracts/packs/merges BA2 archives (General/DDS, V1/V2) with compression-ratio reporting.' },
      { name: 'Packaging Checklist', description: 'Structured checklist across structure/assets/plugin/BA2/QA/release with distribution-target selection.' },
      { name: 'Conflict Analysis', description: 'Scans a load order for record conflicts, explains ITMs/UDRs/navmesh issues with severity badges.' },
      { name: 'Mod Comparison', description: 'Side-by-side diff of two mods — overrides, asset conflicts, dependencies, ESL/ESM flags, load-order impact.' },
      { name: 'FOMOD Installer / "The Assembler"', description: 'Node-based page/group/option tree editor with editor/preview/raw-XML views.' },
      { name: 'Export & Release', description: 'Release-zip guidance, changelog builder, version-bump assistant, one-click upload page links.' },
      { name: 'Conflict Resolver (advanced)', description: 'Deeper conflict analysis with configurable resolution rules, generates a resolution patch ESP.' },
      { name: 'Conflict Dependency Graph (advanced)', description: 'Interactive canvas node graph of mod-to-mod conflict relationships.' },
      { name: 'Mod Auto-Enhancer (advanced)', description: 'Drag-and-drop a mod folder, auto-enhances textures at a configurable level, packages/downloads the result.' },
    ],
  },
  {
    id: 12,
    name: 'FO4 Guides Hub',
    route: '/guides-hub',
    mainFile: 'GuidesHub.tsx',
    summary:
      'A 7-tab reference-guide hub with visited/completion tracking, live search, and several tabs with embedded interactive sub-tools rather than plain text.',
    features: [
      { name: 'Animation & Rigging', description: 'Blender→FO4 animation pipeline guide with embedded Skeleton Reference, Rigging Checklist, Export Settings Helper, Mistakes Gallery, Animation Validator, and Havok/HKX sub-guides.' },
      { name: 'Quest Authoring', description: 'CK-through-Papyrus quest guide with embedded CK Quest/Dialogue Wizard, Leveled List Injection Guide, and Precombine/PRP tools.' },
      { name: 'LOD & Precombine', description: 'Manages xLODGen LOD jobs and CK precombine jobs, parses tool output, tracks per-asset settings and job status.' },
      { name: 'Textures & Materials', description: 'Embeds the full Textures & Materials hub (platform #10) inline.' },
      { name: 'Papyrus & Scripting', description: 'Scripting reference covering events, aliases, F4SE extensions, and advanced patterns.' },
      { name: 'Sim Settlements 2', description: 'SS2 addon-authoring guide with embedded Addon/Units/Loadouts/Toolkits guides and Nexus shortcuts.' },
      { name: 'BodySlide & Outfits', description: 'BodySlide/Outfit Studio guide covering CBBE conversion, weight painting, slider creation, morph packaging.' },
    ],
  },
  {
    id: 13,
    name: 'FO4 Automation Studio',
    route: '/tools/cosmos',
    mainFile: 'CosmosWorkflow.tsx',
    summary:
      'Misleadingly named — not build/task automation. A flat page that manages a fixed catalogue of 8 NVIDIA Cosmos AI research repos as local knowledge-search roots so Mossy\'s own assistant can search their docs.',
    features: [
      { name: 'Repo status detection', description: 'Checks on-disk presence and integration-doc existence for each of the 8 repos.' },
      { name: 'Knowledge-root registration', description: 'Add/remove a repo as a searchable knowledge root (persisted), individually or in bulk.' },
      { name: 'Clone-command helper', description: 'Expands a copy-pasteable git clone command for repos not yet present — no cloning performed by the app.' },
      { name: 'Integration doc access', description: 'Opens each repo\'s markdown integration doc.' },
      { name: 'Inline search validator', description: 'Mini search box confirming a repo\'s content is actually indexed and retrievable.' },
      { name: 'Health score', description: 'Aggregate readiness percentage across all 8 repos, with a "Core Ready" badge for the 3 core-tier repos.' },
    ],
  },
  {
    id: 14,
    name: 'FO4 Mod Builder Hub',
    route: '/mod-builder',
    mainFile: 'ModBuilderHub.tsx',
    summary:
      'A 5-tab hub for the mod-creation workflow — planning, files/compile, dev tools, scripting/docs, and new-project scaffolding — with drag-to-reorder tabs.',
    features: [
      { name: 'Blueprint', description: 'Mod-architecture planner with real FO4 mod-recipe templates specifying structure/components/dependencies/tools/plugin type.' },
      { name: 'Workshop', description: 'File browser + syntax-highlighted text/Papyrus editor with a compile action returning exit code/stdout/stderr.' },
      { name: 'Devtools', description: 'Accordion of 6 tools: Template Generator, Script Analyzer, Papyrus Snippet Library, xEdit quick-reference, FOMOD Installer Generator, F4SE compatibility guide.' },
      { name: 'Scribe', description: 'Multi-language editor/library (Papyrus/xEdit/Blender tabs) with validation, template library, script bundles, xEdit script runner, Project Wizard.' },
      { name: 'Project Creator', description: 'Scaffolds a new mod\'s folder structure based on mod type (weapon/armor/quest/NPC/settlement/world edit/audio/texture/general).' },
    ],
  },
  {
    id: 15,
    name: 'FO4 Asset Analysis Hub',
    route: '/asset-analysis',
    mainFile: 'AssetAnalysisHub.tsx',
    summary:
      'A 6-tab hub for asset mining, deduplication, crash-log parsing, and 3D mesh inspection.',
    features: [
      { name: 'Mining Dashboard', description: '8-sub-tab mining pipeline — ESP data, dependency graph with cycle detection, performance baseline, unused-asset/LOD/texture/animation opportunities.' },
      { name: 'Phase 2 Mining', description: 'Five real backend mining engines — Contextual, ML Conflict Prediction, Performance Bottleneck Detection, Hardware-Aware, Longitudinal — feeding a live dashboard.' },
      { name: 'Asset Deduplicator', description: 'Hash-based duplicate-file scan grouped by type, reporting wasted disk/VRAM and a keep-this-one recommendation.' },
      { name: 'Crash Analyzer', description: 'Parses Buffout 4 / Buffout 4 NG / CLASSIC-style crash logs against known patterns, extracting FormIDs/plugins/callstack with severity-rated fixes.' },
      { name: 'FO4 Asset Guide', description: 'Static reference tables (VRAM/poly/draw-call budgets, conflict-type glossary, optimization tips).' },
      { name: '3D Viewer', description: 'Real Three.js mesh viewer — launches NifSkope for NIF→glTF export, then renders real geometry with wireframe/orbit controls.' },
    ],
  },
  {
    id: 16,
    name: 'FO4 Automation Orchestrator',
    route: '/dev/orchestrator',
    mainFile: 'FO4AutomationOrchestrator.tsx',
    summary:
      'A flat page with two internal view tabs (Rules, Activity) backed by a real IPC automation engine, not a client-side simulation.',
    notes: 'The sidebar link is /orchestrator, which redirects to this route.',
    features: [
      { name: 'Rules tab', description: 'Configured automation rules (File Watch/Process Start-Stop/Scheduled/Manual triggers → actions like Conflict Scan, Papyrus Compile, BA2 Pack, Nightly Backup) with enable toggle, manual trigger, and run stats.' },
      { name: 'Activity tab', description: 'Live feed of fired rule events, pushed in real time, capped at the last 50.' },
      { name: 'Engine controls', description: 'Start/Stop the real automation engine; stats bar shows active watchers/schedules; Reset Statistics action.' },
      { name: 'Auto-refresh', description: 'Polls settings/statistics every 15s independent of the push subscription.' },
    ],
  },
  {
    id: 17,
    name: 'FO4 Automation Runner',
    route: '/workflow-runner',
    mainFile: 'WorkflowRunner.tsx',
    summary:
      'A flat visual workflow builder/runner — named workflows made of ordered steps, executed for real via Electron IPC, with live logs, run history, and JSON import/export.',
    features: [
      { name: 'Step types', description: 'runTool (spawn .exe), openProgram, openExternal, revealInFolder, waitForProcess, copyFile/deleteFile, waitSeconds.' },
      { name: 'FO4 preset templates', description: '6 built-in starters: CK launch-and-monitor, Papyrus compile chain, BA2 texture packing, load-order backup, xEdit conflict-filter launch, full release pipeline.' },
      { name: 'Workflow editor', description: 'Reorder/duplicate/delete steps, per-step or global continue-on-error, searchable workflow list with step count and last-run status.' },
      { name: 'Run history', description: 'Persists the last 50 runs with per-run log export and a clear-history action.' },
      { name: 'Import/export', description: 'JSON export of all workflows or a single run\'s log; import/merge by ID with a browser file-picker fallback.' },
    ],
  },
  {
    id: 18,
    name: 'FO4 Runtime Hub',
    route: '/runtime-hub',
    mainFile: 'RuntimeHub.tsx',
    summary:
      'A 3-tab shell with live status chips for Bridge connection, an F4AI pipeline state machine, and Blender-link status.',
    features: [
      { name: 'Live Synapse', description: 'Real-time voice chat (mic capture, mute, live transcription/TTS, text fallback) with sub-steps for Voice Setup, Selection & Mic Test, Audio Studio, Memory Vault, Neural Link, and Onboarding.' },
      { name: 'Desktop Bridge — Setup', description: 'Live bridge connection status (auto-starts with the app), a real-time Event Log, and inline firewall/loopback troubleshooting.' },
      { name: 'Desktop Bridge — Creation Kit Link', description: 'Configures/saves paths for CreationKit.exe, FO4 root, PapyrusCompiler.exe, and the flags file, used to compile Papyrus through the local tool bridge.' },
      { name: 'Desktop Bridge — Blender Link', description: 'Connect/disconnect status for the Mossy Link add-on channel, shared security token display/copy/regenerate, capability list, and a setup tutorial.' },
      { name: 'Desktop Bridge — Hardware', description: 'On-demand scan of real OS/CPU/RAM/GPU/Python info via the bridge.' },
      { name: 'Desktop Bridge — Vision', description: 'One-click full-screen screenshot capture for Mossy to visually analyze.' },
      { name: 'Desktop Bridge — Clipboard', description: 'Writes arbitrary text to the real Windows system clipboard via the bridge.' },
      { name: 'Desktop Bridge — Files', description: 'Directory browser with linked-directory shortcuts, listing real files/folders with sizes via the bridge.' },
      { name: 'Desktop Bridge — Bridges', description: 'Lists every registered Bridge implementation (id/name/version/live status) from the general BridgeRegistry plug-in system.' },
      { name: 'Holodeck', description: 'Scenario-testing tool with a predefined-scenario library (bridge status, process detection, load-order integrity, quest/combat/settlement/NPC checks), each broken into concrete steps with pass/fail/partial/skip/error logging.' },
    ],
  },
  {
    id: 19,
    name: 'FO4 External Integrations Hub',
    route: '/ext-tools',
    mainFile: 'ExternalToolsHub.tsx',
    summary:
      'A 3-tab hub for AI/mod-manager tool integrations, with a persistent auto-connect panel scanning 16 named tools for install/running status.',
    features: [
      { name: 'MO2 Integration', description: 'Parses the real ModOrganizer.ini/modlist.txt/plugins.txt/meta.ini — profile switching, mod enable/disable (writes back), heuristic conflict detection.' },
      { name: 'ComfyUI', description: 'Pings the local ComfyUI server, fetches checkpoints, submits real generation requests with FO4-specific preset workflows; falls back to a simulated run if offline.' },
      { name: 'Upscayl', description: 'Detects the installed Upscayl CLI and queues real 2x/3x/4x/Enhance upscale jobs via IPC; falls back to a clearly-labeled simulated job if the binary isn\'t found.' },
      { name: 'Auto-connect panel', description: 'Background-scans 16 tools (MO2, Vortex, xEdit, CK, Blender, NifSkope, BodySlide, LOOT, Wrye Bash, BethINI, F4SE, ComfyUI, Upscayl, iClone 8, Sniff, CAO) for install/running status and auto-registers detected paths into Settings.' },
    ],
  },
  {
    id: 20,
    name: 'FO4 Plugin & Load Order Hub',
    route: '/plugin-tools',
    mainFile: 'PluginLoadOrderHub.tsx',
    summary:
      'A 6-tab hub combining real xEdit/precombine/load-order tooling with an extensive static reference and a genuine plugin-analysis scanner.',
    features: [
      { name: 'xEdit Tools', description: 'Categorized library of real xEdit/FO4Edit scripts (Cleaning, Analysis, Utility, Advanced, Conversion, ESL, Quest) executed against a real plugin.' },
      { name: 'PRP Patch Tools', description: 'Phased wizard reading the MO2 profile\'s plugins.txt and generating real FO4Edit Pascal scripts for precombine/previs patching.' },
      { name: 'Load Order', description: '3-step accordion: Analyzer (conflict/missing-master checks), Lab (experimental MO2+LOOT import), Optimizer (rule-based reordering + export).' },
      { name: 'ESP Mining', description: 'Real FormID-relationship mapping, cell/worldspace conflict detection, and quest-dependency analysis via genuine ESP subrecord parsing.' },
      { name: 'FO4 Plugin Guide', description: 'Static reference: load-order rules, ESL/FormID limits, xEdit cleaning workflow, SEQ requirements, PRP workflow, Wrye Bash, navmesh safety, common mistakes.' },
      { name: 'Merge Scanner', description: 'Real zMerge-candidate scanner categorizing plugins as ESL-ready/ESP-merge/needs-review/blocked, exporting a ready-to-import zMerge profile.' },
    ],
  },
  {
    id: 21,
    name: 'FO4 System & Diagnostics Hub',
    route: '/system-hub',
    mainFile: 'SystemHub.tsx',
    summary:
      'An 8-tab hub covering system diagnostics, local-AI capability management, safety rule lists, an asset manifest vault, donation links, backup/snapshot management, and live file watching.',
    features: [
      { name: 'Diagnostics', description: '4-step accordion: System Monitor, Tool Verify, Diagnostic Tools (API/permission/storage checks), Crash & Bug Triage wizard.' },
      { name: 'Capabilities', description: 'Live health checks against local AI providers, a GGUF→Ollama importer with custom system prompt, and a real LoRA fine-tuning launcher with live training log.' },
      { name: 'Local AI Engine', description: 'Downloads and manages the bundled koboldcpp.exe + TinyLlama lifecycle — presence checks, download progress, start/stop, phase status.' },
      { name: 'Whitelist & Blacklist', description: 'Real persisted mod-content whitelist, mod blacklist (name+reason), and program blacklist used elsewhere in the app to gate content.' },
      { name: 'Asset Vault', description: 'Manifest-driven asset library (mesh/texture/audio/script/ui) with staging, format verification, and configurable conversion tool paths.' },
      { name: 'Support Mossy', description: 'Static Patreon/Buy-Me-a-Coffee links.' },
      { name: 'Backup Manager', description: 'Named/auto snapshots of a chosen workspace, restore, real git status, and inline commit flow when the bridge is active.' },
      { name: 'File Watcher', description: 'Watches a chosen directory via IPC, classifies changed files by type, surfaces contextual routing suggestions.' },
    ],
  },
  {
    id: 22,
    name: 'Settings',
    route: '/settings',
    mainFile: 'SettingsHub.tsx',
    summary:
      'A 12-section accordion walking through an ordered configuration flow, each section a real, independently-functional settings component.',
    features: [
      { name: 'Privacy & Security', description: 'App-lock password, memory storage folder, mod whitelist/blacklists, list-sync status, data-storage info.' },
      { name: 'Language', description: 'UI language selection, translation-request link, browser TTS voice selection/testing.' },
      { name: 'AI Engine', description: 'Provider selector (Auto/Ollama-only/Off), Inkling API config for Creative Director\'s AI Team, deliberate-reasoning and self-critique toggles.' },
      { name: 'Ollama', description: 'Base URL, chat/code model pickers curated for 8GB VRAM, model download, live status.' },
      { name: 'Brain B', description: 'Install/lifecycle manager for the local retrieval-and-tutoring enrichment service — versioned download, disk-space check, start/stop, health check.' },
      { name: 'AnythingLLM', description: 'Connects to a local AnythingLLM server, reports status, lists/creates/deletes workspaces, restart control.' },
      { name: 'External Tools', description: '~30 tool paths (xEdit, NifSkope, CK, Blender, LOOT, Vortex, MO2, Wrye Bash, BodySlide, BAE, GIMP, Archive2, F4SE, Upscayl, and more) plus UModel/PyTorch installers.' },
      { name: 'Backup & Restore', description: 'Full settings snapshot export (secrets scrubbed) and re-import.' },
      { name: 'Tutorial & Onboarding', description: 'Clears onboarding/tutorial-completion flags and forces a reload into first-run onboarding.' },
      { name: 'Internet Access Test', description: 'Probes every search provider Mossy uses with per-provider timing and DNS troubleshooting tips.' },
      { name: 'Credits & Acknowledgments', description: 'Full searchable dependency/license list.' },
      { name: 'Support the Developer', description: 'Static Patreon/Buy-Me-a-Coffee links.' },
    ],
  },
  {
    id: 23,
    name: 'Vault-Tec Creative Director',
    route: '/creative-director',
    mainFile: 'plugin_creative_director/CreativeDirectorPanel.tsx',
    summary:
      'Local-only, never shipped to Nexus/public release. A 9-tab hub for FO4 narrative/quest design — five tabs ping an external backend not in this repo and fall back to local templates/manual entry when offline; the AI Team tab runs entirely on-device instead (Groq or local KoboldCpp, no external server dependency).',
    features: [
      { name: 'Quest Builder', description: 'Stage/objective editor with rewards; generates a real Papyrus quest script skeleton (AI-enhanced online, deterministic template offline).' },
      { name: 'Dialogue Writer', description: 'Player/NPC dialogue tree with conditions and FO4 voice-type selection; AI line generation only when the backend is online; exports as a CK-import text file.' },
      { name: 'NPC Creator', description: 'Full NPC sheet (race/gender/SPECIAL/personality/faction/behavior); AI backstory generation only when the backend is online.' },
      { name: 'Lore Vault', description: 'Tagged/categorized lore-entry knowledge base with pin/search; semantic search only when the backend is online.' },
      { name: 'World Design', description: 'Structured location-design brief form, generates a formatted brief and can commission it directly to the AI Team.' },
      { name: 'AI Team', description: 'Autonomous multi-agent pipeline (11 named roles) running plan → review → analyze → human approval gate → build → verify, with a live transcript, real FO4 world-data scan, and an enable/disable toggle.' },
      { name: 'Narrative Debug', description: 'Pastes a Papyrus script and runs diagnostics (backend-analyzed online, local regex heuristics offline) plus a static pitfalls reference.' },
      { name: 'Lab Handoff', description: 'AI-Team-completed projects with a real buildability score (from actual produced .esp/.pex/records), Asset Browser, Enhance action, build/compile/generate-records/package actions, and an Animation Studio sub-panel.' },
      { name: 'Personal R&D Network (dev-only)', description: 'Only appears if the user\'s own separate external stack is reachable — not part of the shipped feature set.' },
    ],
    notes:
      'Excluded from Nexus/public release builds by standing project convention. Do not suggest adding it to release artifacts.',
  },
];

/**
 * Condensed, prompt-safe index — platform name + one-line summary only, no
 * per-feature detail. Meant for folding into Mossy's system prompt
 * (MossyBrain.ts) so "what can you do" / "where do I find X" answers are
 * grounded in the real feature set, without repeating this session's mistake
 * of injecting an unbounded payload into every single prompt call. If a
 * specific platform's full feature list is ever needed in-prompt, look it up
 * from PLATFORM_CATALOG by id/name on demand instead of always including it.
 */
export function getPlatformCatalogSummaryForPrompt(): string {
  return PLATFORM_CATALOG
    .map((p) => `${p.id}. ${p.name} (${p.route}) — ${p.summary}`)
    .join('\n');
}

/** Look up one platform's full entry (including every feature) by id. */
export function getPlatformById(id: number): PlatformEntry | undefined {
  return PLATFORM_CATALOG.find((p) => p.id === id);
}

/** Look up one platform's full entry by exact name (case-insensitive). */
export function getPlatformByName(name: string): PlatformEntry | undefined {
  const needle = name.trim().toLowerCase();
  return PLATFORM_CATALOG.find((p) => p.name.toLowerCase() === needle);
}

/**
 * Full platform-map block for system-prompt injection — header, the
 * condensed catalog index, and the hand-written disambiguation notes that
 * correct specific things the model would otherwise get wrong (Automation
 * Studio's real scope, Creative Director's real tab count, etc.).
 *
 * Deliberately NOT called unconditionally from MossyBrain.ts's system
 * instruction — measured at ~4,700 chars / ~1,170 tokens, which is a real
 * per-turn cost on every single message including voice, where
 * LiveContext.tsx already special-cases prompt size because an earlier
 * oversized-system-prompt problem was the direct cause of its 120s watchdog
 * firing. Call this only when the turn's enrichment result flags
 * app_help_related — see LocalAIEngine.ts's generateResponse(), which folds
 * this into the prompt the same way it folds in scene context, gated on the
 * matching classify_and_diagnose() flag rather than always-on.
 */
export function getPlatformMapBlockForPrompt(): string {
  return (
    '\n**🗺️ MOSSY APP — COMPLETE PLATFORM MAP (23 PLATFORMS)**' +
    '\n**═══════════════════════════════════════════════════════════**' +
    '\nYou live inside a 23-platform desktop app. The left sidebar is the primary navigation. This list is generated from the app\'s own verified platform catalog (src/renderer/src/platformCatalog.ts, deep-audited against the actual running code on 2026-08-15, not written from memory or route names) — trust it over any older assumption about what a platform does or doesn\'t do.\n\n' +
    getPlatformCatalogSummaryForPrompt() +
    '\n\n**Notable disambiguations:**' +
    '\n- The Mod Browser lives INSIDE FO4 Mod Journey Hub (`/journey-hub`) — there is no separate /mods page.' +
    '\n- "THE AUDITOR" (a name used elsewhere) is the CK Safety tab inside FO4 Creation Kit Hub (`/ck-tools`).' +
    '\n- FO4 Automation Studio (`/tools/cosmos`) does NOT run AI generation, world-building, or inference itself, despite the name — it registers NVIDIA Cosmos research repos as local knowledge-search roots so retrieval can find their docs. Never claim it does GPU inference or world generation; it doesn\'t.' +
    '\n- Vault-Tec Creative Director\'s AI Team is a real multi-agent build pipeline, but it is only ONE of that platform\'s 9 tabs (Quest Builder, Dialogue Writer, NPC Creator, Lore Vault, World Design, AI Team, Narrative Debug, Lab Handoff, and a dev-only Personal R&D Network). Most of its other tabs (Quest/Dialogue/NPC/Lore/World) depend on an external backend not shipped in this app and fall back to local templates or manual entry when that backend is offline — say so plainly if a user hits that fallback rather than acting like it\'s broken. This platform is local-only and excluded from public/Nexus release builds by standing project convention.' +
    '\n- Every sub-panel/tab listed above is real, working functionality unless its own summary says otherwise (a few explicitly document a simulated fallback when an external tool isn\'t detected, e.g. Upscayl) — none of this list is placeholder UI.'
  );
}
