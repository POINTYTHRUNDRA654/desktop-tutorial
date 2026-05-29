# Mossy.Space — FO4 Mod Builder Hub Deep Scan & Improvement Report
**Date:** 2026-05-26  
**Version Audited:** v5.4.64 (Electron 42, React 18.3.1)  
**Scope:** TheBlueprint · Workshop · DevtoolsHub · TheScribeEnhanced · ModBuilderHub · ProjectCreator

---

## 1. BUGS FIXED

| File | Issue | Fix Applied |
|------|-------|------------|
| `TheBlueprint.tsx:132` | `"if expanding Tamriel"` — Skyrim language in an FO4 tool | Replaced with "Commonwealth" context |
| `Workshop.tsx` | `onKeyPress` is deprecated in React 17+ (triggers console warnings) | Replaced with `onKeyDown` |
| `ModBuilderHub.tsx` | Tab content wrapper used `overflow-y-auto p-6` conflicting with inner panels that are `h-full overflow-hidden` — caused double scrollbar and clipped Workshop/Blueprint content | Replaced with `flex-1 overflow-hidden`; inner panels manage their own scroll |
| `ProjectCreator.tsx` | Renders as `fixed inset-0` modal overlay placed inside ModBuilderHub's scroll container — breaks layout | Changed to inline `max-w-lg mx-auto` form |
| `ProjectCreator.tsx` | Lists Skyrim SE, Skyrim, and Fallout 76 as game options in an FO4-dedicated platform | Replaced with FO4 Standard / Next-Gen / Creations variants |

---

## 2. NEW FEATURES ADDED

### TheBlueprint.tsx — v2.4.0 (was v2.1.0)

**3 New Mod Templates Added:**
- **Player Home / Interior** — door pair teleport setup, ownership, container respawn, map marker
- **Texture / Mesh Replacer** — no-plugin loose file workflow, BC7/BC5 format guidance, CAO workflow
- **Compatibility Patch** — xEdit conflict resolution workflow, master declaration, ESL-flagging guidance

**Plugin Type Badge System:**
- Each template now declares `pluginType: 'ESP' | 'ESL' | 'ESM' | 'None'`
- Color-coded badges on template cards and tab header (amber=ESP, emerald=ESL, blue=ESM, grey=None)

**New "Checklist" Tab:**
- Per-template pre-release checklist (7–8 items each)
- Interactive checkboxes with progress bar and completion state
- "Ready to package!" celebration state when all checks pass
- State keyed by template ID (switching templates resets state correctly)

**Enhanced Dependencies Tab:**
- ESL / ESP / ESL-flagged ESP guidance panel (what each type means, when to use)
- Recommended Tools section per template
- Correct descriptions for DLC masters

**Data Fixes:**
- World Expansion template: "Tamriel" → "Commonwealth", added Vis/Previs folder, PRP noted in tools
- Quest template: Added SEQ file entry with warning about it being the #1 cause of quests not starting
- Weapon/Armor: Removed incorrect `ArmorKeywords.esm` dependency (only needed for AWKCR builds)

---

### DevtoolsHub.tsx — Major Expansion (was 2 sections → now 5)

**Added Sections:**
1. **Papyrus Snippet Library** (10 production-ready snippets)
   - Events: OnActivate player gate, safe OnInit with deferred init, timer via RegisterForSingleUpdate
   - Properties: Auto, Conditional, read-only getter pattern
   - Quests: GetActorRef from alias with null-check
   - Items: Runtime leveled list injection
   - F4SE: MCM ini reading, cross-mod ModEvent dispatch and receive
   - Performance: Batch actor processing queue pattern
   - Debug: Structured trace with timing profile
   - Searchable by text and filterable by category
   - One-click copy with clipboard confirmation

2. **xEdit / FO4Edit Quick Reference** (8 operations)
   - Copy As Override, Forward Value, Clean Masters, Remove ITM
   - Undelete References (UDR), ESL Flag, Script Fragment Injection, Conflict Filter
   - F4SE game version note

3. **F4SE Version Guide**
   - F4SE 0.6.23 → 1.10.163 (Legacy)
   - F4SE 0.7.2 → 1.10.980/984 (Next-Gen)
   - F4SE 0.7.7+ → 1.11.x (Creations Update, Nov 2025+)
   - Address Library note (All In One AE build for 1.11.x)
   - DLL plugin compatibility warning

**Improved Flow Documentation:**
- 4-step recommended flow replacing the previous 2-step stub
- Each section now has accurate descriptions vs generic placeholders

---

### ModBuilderHub.tsx — v2.4.0

**Keyboard Shortcuts:** Press 1–5 to switch tabs (disabled when focus is in input/textarea)  
**Version Badge:** Displayed in hub header (`v2.4.0`)  
**Improved Tab Bar:** Browser-style tab design with keyboard shortcut hints visible on xl screens  
**Scroll Architecture Fixed:** Documented in comments; Creator tab gets its own scroll wrapper

---

### Workshop.tsx

**File Type Icons Expanded:**
- `.psc` (yellow) — Papyrus Source
- `.pex` (dark yellow) — Papyrus Compiled  
- `.nif` (blue) — NIF Mesh
- `.dds` (purple) — DDS Texture
- `.esp` (amber) — ESP Plugin  ← NEW
- `.esm` (amber dark) — ESM Master  ← NEW
- `.esl` (emerald) — ESL Light Plugin  ← NEW
- `.ba2` (orange) — BA2 Archive  ← NEW
- `.bgsm`/`.bgem` (teal) — Material File  ← NEW
- `.hkx` (pink) — Havok Animation  ← NEW
- `.xwm`/`.wav`/`.fuz` (indigo) — Audio  ← NEW

---

## 3. GAPS IDENTIFIED (NOT YET IMPLEMENTED — FUTURE WORK)

| Area | Gap | Recommendation |
|------|-----|----------------|
| Workshop | No syntax highlighting for `.psc` files | Integrate `prism-react-renderer` or `highlight.js` with Papyrus grammar |
| Workshop | Compiler path not persisted between sessions | Save to `electronStore` / `localStorage` |
| Workshop | No line numbers in textarea editor | Replace `<textarea>` with CodeMirror 6 or Monaco Editor lite |
| Workshop | No `.esp`/`.esm` record viewer (just shows raw binary) | Integrate espParser.ts for basic record listing |
| ScriptAnalyzer | Analysis runs in `setTimeout` simulation, not a real parser | Wire to a real Papyrus grammar parser |
| TemplateGenerator | Generation is keyword matching, not AI | Wire to Mossy AI backend (Nemotron / OpenAI compat) |
| TheBlueprint | No "new mod type" templates for: FOMOD installer, Animation (OAR/IAF), F4SE plugin | Add in next pass |
| DevtoolsHub | No integrated Papyrus compiler output (compile directly from Devtools) | Wire `api.runPapyrusCompiler` here as well |
| DevtoolsHub | No FOMOD builder | Add FOMOD XML generator as a new section |
| TheScribe | xEdit script runner status not shown in real-time | Add WebSocket or polling for live run output |
| ModBuilderHub | No drag-to-reorder tabs | Nice-to-have UX improvement |
| ProjectCreator | Does not scaffold actual folder structure after creation | Call `api.createProject` then auto-open in Workshop |

---

## 4. VERIFICATION

All modified files pass basic structural checks:

```
TheBlueprint.tsx   — 704 lines, no "Tamriel", 8 templates, Checklist tab present ✓
DevtoolsHub.tsx    — 478 lines, 5 sections, 10 snippets, xEdit + F4SE guide ✓
ModBuilderHub.tsx  — 170 lines, keyboard handler, no overflow-y-auto on content wrapper ✓
Workshop.tsx       — onKeyDown (not onKeyPress), 11 file type cases ✓
ProjectCreator.tsx — FO4 variants only, inline form (not modal overlay) ✓
```
