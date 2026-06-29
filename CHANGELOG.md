# MOSSY.SPACE Changelog

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
