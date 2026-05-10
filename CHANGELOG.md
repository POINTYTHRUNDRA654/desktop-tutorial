# Changelog

All notable changes to **Mossy — The Fallout 4 Modding Assistant** are documented here.

---

## [5.4.43] — Latest

### Added
- **Journey Hub** (`/journey-hub`) — consolidated First Success, Mod Projects, Modding Roadmaps, and Mod Browser into one platform.
- **Runtime Hub** (`/runtime-hub`) — consolidated Live Synapse, Desktop Bridge, and Holodeck into one platform.
- **System Hub** (`/system-hub`) — consolidated Diagnostics, Local Capabilities, Blacklist Manager, Vault, and Support into one platform.
- **Guides Hub** (`/guides-hub`) — consolidated Animation & Rigging, Quest Authoring, and LOD & Precombine guides into one platform.

### Changed
- Sidebar reduced further from **33 to 22 platforms** (below the 24-target), with old routes still accessible.
- Platform names were clarified for discoverability (examples: Setup Wizards, Creation Kit Hub, Automation Studio, Automation Orchestrator, Automation Runner, External Integrations Hub, Plugin & Load Order Hub, Asset Analysis Hub).

---

## [5.4.42]

### Added
- **Textures & Materials Hub** — DDS Converter, Texture Generator, and Image Studio unified under `/textures`. New FO4 Texture Guide tab with BC-format table, channel conventions (_d/_n/_s/_g/_h/_rmaos/.bgsm), mipmap rules, PBR pipeline notes (Community Shaders + ENB), and tools reference.
- **CK Tools Hub** — CK Safety (Crash Prevention) and CK Extension (auto-save, script compilation) unified under `/ck-tools`. New FO4 CK Guide with crash causes, best practices, Papyrus tips, ESL/FormID table, and tools reference.
- **Asset Analysis Hub** — Mining Dashboard, Advanced Analysis, and Asset Deduplicator unified under `/asset-analysis`. New FO4 Asset Guide with asset budgets, conflict types, optimization strategies, and analysis tools.
- **BA2 Manager integrated into Packaging Hub** — BA2 Manager is now Step 0 inside the Packaging & Release hub. Single sidebar entry covers the full packaging pipeline (archive management → checklist → conflict analysis → comparison → FOMOD builder).
- **Plugin & Load Order Hub** — xEdit Tools, PRP Patch Tools, and Load Order Hub unified under `/plugin-tools`. New FO4 Plugin Guide with load order rules, xEdit cleaning workflow, PRP precombine workflow, ESL/FormID table, and common mistakes.
- **External Tools Hub** — MO2 Extension, ComfyUI Extension, and Upscayl Extension unified under `/ext-tools` with contextual FO4 tips for each tool.
- **Knowledge Hub** — Quick Reference, Knowledge Search, and Community Learning unified under `/knowledge-hub` for all knowledge lookup and learning needs.
- **Mod Builder Hub** — The Blueprint (mod architecture), Workshop (file browser + compile), Devtools (Papyrus scripts), and The Scribe (documentation) unified under `/mod-builder`.

### Changed
- Sidebar reduced from 52+ entries to 33 — nearly 37% fewer navigation items, with all content preserved and accessible via unified hubs.
- Lorekeeper sidebar label updated to **LOD & Precombine** to accurately reflect the tool's function (LOD generation + precombine management).
- Animation Guide sidebar label updated to **Animation & Rigging** for clarity.
- Redundant sidebar entries removed (Crash Triage, Tool Verify, System Monitor, Tools hub root) — all redirected to Diagnostics.

### Fixed
- All old URLs continue to work via automatic redirects to new hub paths.

---

## [5.4.41]

### Added
- **Changelog-driven What's New** — What's New now renders from CHANGELOG.md by app version, with fallback to the latest entry if the current version is missing.
- **Critical Progress Backup** — User-authored progress (mod projects, chat history, knowledge vault, roadmap, workflow state) is now backed up to durable local storage and restored on startup if missing, ensuring data survives updates and rescans.

---

## [5.4.34]

### Added
- **Tutorial reordered** — the Guided Tour welcome sequence now matches the updated sidebar lineup, with Mod Projects and Modding Roadmaps steps inserted after the First Success Wizard

---

## [5.4.33]

### Added
- **Multi-Language Support** — Mossy now supports 12 languages. Choose your preferred language in Settings → Language Settings.
  - English, Spanish, French, German, Russian, Chinese (Simplified), Portuguese (BR), Japanese, Korean, Italian, Polish, Turkish
  - Community translations welcome — see [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md)
- **Anniversary Edition (AE) Awareness** — Mossy now understands all four Fallout 4 version states: OG (1.10.163), NG (1.10.984), AE, and Creations Menu (1.11.191)
  - AE = same NG executable + 76 bundled free CC items; mods often require AE patches; PRP 81+ needed for AE cells
  - If you say "I have AE," Mossy correctly assumes NG runtime

### Improved
- Version-accurate advice — the AI now identifies your runtime before giving version-sensitive recommendations

---

## [5.4.26]

### Added
- **Anniversary Edition AI Knowledge** — Mossy's system prompt now includes a dedicated AE section covering runtime version, CC content, patch requirements, and common misconceptions

### Changed
- Updated version awareness from three to four distinct Fallout 4 runtime states

---

## [5.4.25]

### Improved
- **Deep Scan of Fallout 4 Modding Knowledge** — comprehensive refresh of tool recommendations, version compatibility notes, and community best practices
- Mossy now always asks which FO4 version you are on before giving version-sensitive advice, with a downgrader note (Nexus #81463)
- Added 2024–2026 stability tools to system knowledge: Addictol/X-Cell, Buffout 4 NG, CLASSIC, Address Library AiO, High FPS Physics Fix, MCM NG, UFO4P
- Updated CK → Blender workflow prerequisites including PyNifly latest + BA2 V7/V8 note for NG users
- Updated F4SE Plugin Development section to clarify OG vs NG differences and recommend Address Library for NG plugins
- Updated Load Order Best Practices with version-sensitive guidance and LOOT 0.21+ note

---

## [5.4.24]

### Added
- **Memory Vault** — now accessible directly from the Mossy.Space sidebar
- **Community Knowledge Sharing** — export approved knowledge to share with other Mossy users
- **Import Community Knowledge** — load knowledge packs from other Mossy users

### Fixed
- Tutorial TTS integration — Mossy now speaks during the interactive tutorial

---

## [5.4.21]

### Added
- **Direct-Write Protocol** — direct-write scripting for Papyrus, xEdit, and Blender
- **Neural Link** — real-time monitoring of Blender, Creation Kit, and other modding tools
- **Headless Automation** — batch execution for Blender operations
- **Tutorial Replay** — re-experience the installation tutorial at any time from Settings → Tutorial & Onboarding
- Explicit user permission and audit logging for all direct-write and automation features

### Fixed
- Encryption key parity between dev and production builds
- Automatic API key decryption in packaged builds

### Notes
- All modules are functional — no placeholders
- Blender add-on is still under active development

---

## Earlier Releases

### Internet & AI Reliability (multiple patch releases)
- Restored Mossy's internet access with a multi-provider fallback system
- Fixed response-guard interceptors that were incorrectly blocking AI responses
- Fixed Mossy incorrectly claiming to be "a fixed model" or "just a base LLM"
- Added real-time Fallout 4 database scanning via web search
- Improved Knowledge Vault pipeline reliability

### Voice & Conversation
- Fixed voice chat race condition with correlation IDs for multi-message handling
- Fixed MediaRecorder race condition for continuous conversation
- Improved silence detection to prevent premature cut-off mid-sentence
- Added Pause/Resume conversation button
- Mossy's personality update — friendlier, more contextual responses

### Core Features
- Conversation context — Mossy remembers the full chat history (up to 20 messages)
- Render backend resilience — backend-first with SDK fallback
- API key encryption — two security bugs fixed
- Automated GitHub Actions release pipeline (build + publish without local infrastructure)

---

> **Full developer change log:** [CHANGES.md](CHANGES.md)  
> **Download the latest release:** [GitHub Releases](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases/latest)
