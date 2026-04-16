# Changelog

All notable changes to **Mossy — The Fallout 4 Modding Assistant** are documented here.

---

## [5.4.33] — Latest

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
