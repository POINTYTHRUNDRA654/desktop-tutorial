# Mossy – Change Log & Sync Guard

> **Purpose of this file:** Single source of truth for every code change made in this
> repository. Before touching *anything* — whether working locally on your desktop or
> via the GitHub Copilot agent — read this file first. If a fix is listed here as
> **DONE ✅**, do **not** redo it, revert it, or work around it. Only add to the
> "What's next" section and work from there.

---

## How to use this file

| Situation | What to do |
|---|---|
| Starting a new session on your local desktop | Read this file first. Only touch things in "What's next". |
| Opening a new GitHub Copilot agent session | The agent reads this file first and verifies changes before touching anything. |
| Finishing a change (local or GitHub) | Update this file: move the item from "What's next" → "Done", note the files changed. |
| Unsure if something was already fixed | Grep for the topic in this file. If it's in "Done", leave it alone. |

---

## Branch: `copilot/fix-render-vulnerabilities`

All changes in this PR live on this branch. The branch name reflects its origin (fixing render/communication vulnerabilities); the scope has since grown to cover the full stable-communication + out-of-box-keys system. Merge to `master`/`main` when ready to ship.

---

## Done ✅  (DO NOT redo, revert, or override these)

### 37. Fix: Resolve unmerged commits from prior session — README version sync ✅

**Request:** "The last session closed with unmerged commitments. We need to fix that."

**Background:** The prior session (branch `copilot/create-package-for-release`, PR #104) made a
single commit that updated README.md version references from 5.4.24 → 5.4.26 to match `package.json`.
That commit was applied to master via a direct branch merge (commit `750dc56`) but the PR was closed
as a draft without going through GitHub's merge button, and no CHANGES.md entry was created.

This session confirmed the commit is present in master (HEAD = origin/master = `750dc56`), the
working tree is clean, and no work was lost. The fix here is to document the prior session's change
and confirm the state is healthy.

**Changes applied in the prior session (already in master):**
- `README.md` — replaced all v5.4.24 references with v5.4.26: header tagline, section heading,
  version badge, download link, installer example path, packaging note. Replaced the "New in v5.4.24"
  release notes block with a proper v5.4.26 entry (Anniversary Edition awareness), demoted the old
  v5.4.24 content to a historical entry alongside v5.4.25.

Files changed:
- `CHANGES.md` — this entry (documents the prior-session fix)

---

### 36. Enhancement: Add Anniversary Edition (AE) to version awareness (v5.4.26) ✅

**Request:** "What about the anniversary edition? I don't notice that in here."

**Changes made:**
- Added **AE / Anniversary Edition** bullet to `getFullSystemInstruction` GAME VERSION AWARENESS block. Key points taught to Mossy: AE is NOT a separate executable (same NG EXE, 1.10.984); it is NG + 76 bundled free CC items; mods often have AE patches; PRP 81+ required for AE cells; CC items are `.esl` masters that can conflict; unlike Skyrim AE it was **free**; if user says "I have AE" without a runtime number, assume NG (1.10.984).
- Updated count from "three distinct runtime states" to "four distinct version states."
- Added AE line to `MASTER_TECHNICAL_GUIDE` version snapshot (sent on every request).
- Bumped version to **5.4.26**.

Files changed:
- `src/renderer/src/MossyBrain.ts` — AE bullet + snapshot update
- `package.json` — version 5.4.25 → 5.4.26
- `CHANGES.md` — this entry

---

### 35. Enhancement: Deep scan — updated Fallout 4 modding knowledge & version awareness (v5.4.25) ✅

**Request:** Nine-month deep scan to make sure Mossy is professional, up-to-date, and has the most advanced knowledge for Fallout 4 modding assistance.

**Changes made:**
- Added **GAME VERSION AWARENESS** block to `getFullSystemInstruction` system prompt: Mossy now always asks which FO4 version (OG 1.10.163 / NG 1.10.984 / Creations Menu 1.11.191) the user is on before giving version-sensitive advice. Includes downgrader note (Nexus #81463).
- Added **2024–2026 stability tools reference** to system prompt: Addictol/X-Cell #84214 (primary stability), Buffout 4 NG #64880 (crash logger), CLASSIC #56255 (crash auto-scanner), Address Library AiO #47327, High FPS Physics Fix #44798, MCM NG build, UFO4P.
- Updated **CK→Blender workflow prerequisites**: Updated PyNifly reference to mention latest version + BA2 V7/V8 note for NG users.
- Updated **MASTER_TECHNICAL_GUIDE preamble**: Added a version snapshot table (OG/NG/1.11.x) at the top — this section IS sent to the AI on every request (first 3000 chars), so Mossy now always has current version context.
- Updated **F4SE Plugin Development section**: Clarified OG vs NG header/lib/runtime-version differences; added Address Library as the recommended modern approach for NG plugins; added commentary to the code example distinguishing OG vs NG runtime checks.
- Updated **Load Order Best Practices**: Added version-sensitive note, updated structure to include Address Library/Addictol/Buffout 4 in proper position, added LOOT 0.21+ note.
- Updated **Fallout-Specific Diagnostics**: Updated Buffout 4 to mention NG fork (alandtse/Buffout4, v1.37.0+); added Addictol, CLASSIC, PRP 81.5.
- Bumped version to **5.4.25** in `package.json`.

Files changed:
- `src/renderer/src/MossyBrain.ts` — all system prompt + knowledge guide updates
- `package.json` — version 5.4.24 → 5.4.25
- `CHANGES.md` — this entry

---

### 34. Fix: Mossy keeps asking to redo the scan after an app rebuild ✅

**Request:** "She's wanting me to redo the scan, which she should already remember. Because the scans already been ran. And this for some reason we've completely rebuilt her without Remembering that this is just an update."

**Root cause:**
After an app rebuild or update that clears renderer localStorage, Mossy's context shows missing scan data. Four places in the codebase were explicitly telling Mossy to request a new scan whenever scan data was absent:

1. `LocalAIEngine.ts` — `[SYSTEM SCAN STATUS]: NOT PERFORMED. (Please run scan_hardware first)` 
2. `toolPermissions.ts` — "ask them to run a system scan" when no tools are saved
3. `MossyBrain.ts` rule 630 — allowed scan requests "when scan history is missing/unknown"
4. `MossyBrain.ts` rule 12 (×2) — "ask the user to…run a new scan" for missing paths
5. `MossyBrain.ts` `scan_hardware` tool description — "Only run this if the [SYSTEM SCAN STATUS] is NOT PERFORMED"

**Fix:**
- Changed `LocalAIEngine.ts` status message to: "Hardware profile not loaded in this session. The scan may have been run previously. Do NOT ask the user to redo the scan — they can refresh scan data from Settings > System Monitor if needed."
- Changed `toolPermissions.ts` no-tools message to: "Do NOT ask the user to redo the scan. If they want to update their tool list, they can go to Settings > System Monitor."
- Updated `MossyBrain.ts` rule 630 to: "Do NOT request a new scan — even if scan history is missing or unknown…Only run scan_hardware if the user explicitly asks you to."
- Updated both instances of rule 12 in `MossyBrain.ts`: replaced "or run a new scan" with "Do NOT ask the user to run a new scan — the scan may have already been completed."
- Updated `scan_hardware` tool description: "Only run this tool if the user EXPLICITLY asks you to run a scan or re-scan. Never run this automatically just because scan data is missing from context."

**Files changed:**
- `src/renderer/src/LocalAIEngine.ts`
- `src/renderer/src/toolPermissions.ts`
- `src/renderer/src/MossyBrain.ts`
- `CHANGES.md`



### 33. Feature: Internet Access Test — live diagnostic tool ✅

**Request:** "Is it possible for you to ask her to access the Internet? And see what response you get."

**What was built:**

1. **`scripts/test-web-search.mjs`** — Standalone CLI diagnostic (`npm run test-web-search`):
   - Probes all 4 search providers (fallout.wiki, fallout.fandom.com, DuckDuckGo, Wikipedia)
   - Shows which providers are reachable, what results they return, and what error occurred
   - Confirms DNS is the blocking layer in restricted environments
   - Exit code 0 = at least one provider per query type works; exit code 1 = all failed

2. **`test-internet-access` IPC handler** (`src/electron/main.ts`):
   - Runs a structured live probe of all 4 providers using `net.fetch()` (Electron Chromium stack)
   - Tests wiki providers with "Papyrus scripting Fallout 4" and general providers with "Fallout 4 modding guide"
   - Returns `{ providers, wikiOk, generalOk, summary }` — timing per provider, result snippet, error details
   - Only probes fallback providers when the primary fails (mirrors production fallback chain)

3. **`testInternetAccess()` in `src/electron/preload.ts`**:
   - Exposes the new handler to the renderer as `window.electron.api.testInternetAccess()`

4. **Internet Access Test panel in `src/renderer/src/SettingsHub.tsx`** (Step 6):
   - "Test Internet Access Now" button triggers the live probe
   - Shows per-provider table (name, ✅/⚠/❌ status, response time in ms)
   - Shows a sample result snippet from the first successful provider
   - Shows DNS troubleshooting steps when all providers fail
   - Summary banner: green (all working), yellow (partial), red (all failed)

**Result in sandbox environment:** All 4 providers fail with `ENOTFOUND` (DNS blocked).
In a user's normal desktop environment with internet access, the providers will respond.

**Files changed:**
- `scripts/test-web-search.mjs` — new CLI diagnostic
- `src/electron/main.ts` — `test-internet-access` IPC handler
- `src/electron/preload.ts` — `testInternetAccess()` exposure
- `src/renderer/src/SettingsHub.tsx` — Step 6 Internet Access Test panel
- `package.json` — `"test-web-search": "node scripts/test-web-search.mjs"` script
- `CHANGES.md`

---

### 32. Fix: Mossy keeps saying she's a large language model with no internet access ✅

**Problem addressed:**
Even with the existing response guard and mandatory system prompt override, Mossy would still tell users "I'm a large language model and I'm not capable of accessing the internet." Two root causes:

1. **Guard retry missing `mandatoryInternetInstruction`** (`src/renderer/src/LocalAIEngine.ts`):
   The initial Groq call correctly appended `mandatoryInternetInstruction` to the system prompt.
   The guard retry did NOT — it used `systemInstruction + enrichedContext` with no terminal override.
   This gave the model a weaker instruction on the retry, allowing it to repeat the refusal.

2. **No post-processing of the final response** (`src/renderer/src/LocalAIEngine.ts`):
   Even when the guard fired and retried, the retry response was returned to the user unchanged.
   If the retry itself still contained self-identification sentences ("I'm a large language model…"),
   those sentences appeared in the chat. There was no last-resort text filter to remove them.

**Fix A — Add `mandatoryInternetInstruction` to guard retry:**
- Changed `guardSystemPrompt = systemInstruction + enrichedContext` to
  `guardSystemPrompt = systemInstruction + enrichedContext + mandatoryInternetInstruction`
- The retry now ends with the same strong `ANSWER THE USER NOW:` override as the initial call.

**Fix B — Add `sanitizeFinalResponse()` post-processor:**
- Added a new helper function `sanitizeFinalResponse(text)` inside `generateResponse`.
- It splits the response into sentences and filters out any sentence that matches a refusal
  pattern: "I'm a large language model", "As a language model", "I cannot access the internet",
  "I don't have internet access", etc. — a targeted list of 12 sentence-level patterns.
- Unlike the broad `INTERNET_REFUSAL_PATTERNS` used for guard detection, these are
  **sentence-level** patterns that only match when the harmful claim is the main content of
  the sentence, avoiding false positives from passing mentions.
- Applied to the FINAL `responseContent` (after any guard retry) before returning to the user.
- Safety guard: if sanitisation removes more than 70% of the text, the original is returned
  unchanged to prevent empty responses.

**Files changed:**
- `src/renderer/src/LocalAIEngine.ts` — Fix A (mandatoryInternetInstruction in retry) + Fix B (sanitizeFinalResponse helper + application)
- `CHANGES.md`

---

### 31. Fix: Restore Mossy's internet access with multi-provider fallback ✅

**Problem addressed:**
Mossy's web search was completely broken when DNS resolution failed for the two primary search providers (`api.duckduckgo.com` and `fallout.fandom.com`). A single DNS failure caused the entire search to return `{ success: false }` with no retry, leaving the AI with no live data to work with.

**Root cause:**
The `web-search` IPC handler in `src/electron/main.ts` had no fallback providers. One network failure = total failure. Both primary providers were hosted on the same DNS-restricted path.

**Fix — Multi-provider fallback chain (`src/electron/main.ts`):**

For **wiki queries** (Fallout 4 topics), the handler now tries in order:
1. `fallout.wiki` — The Vault (independent Fallout wiki, primary — moved here from fandom)
2. `fallout.fandom.com` — Fallout Fandom MediaWiki (secondary)

For **general queries**, the handler now tries in order:
1. `api.duckduckgo.com` — DuckDuckGo Instant Answer API (no API key, primary)
2. `en.wikipedia.org` — Wikipedia search + intro-extract API (no API key, fallback)

Each provider is wrapped in try/catch. If one fails (DNS, timeout, HTTP error), the next is tried automatically. Only if all providers fail does the handler return `{ success: false }`.

For wiki queries that exhaust all wiki providers, the handler falls through to the general search providers so some result is always attempted.

**Files changed:**
- `src/electron/main.ts` — web-search handler rewritten with provider loop
- `resources/public/knowledge/INTERNET_ACCESS_DNS_FAILURE.md` — updated to reflect fix
- `CHANGES.md`

---

### 30. Fix: Mossy's online Knowledge Vault pipeline reliability ✅

**Question asked:** "Is she actually going to be able to go online for finding information and store it to her database like she is intended to? She is supposed to be a professional Fallout 4 tutor."

**Answer:** The end-to-end pipeline (web search → vault save → vault retrieval → AI context injection) was structurally complete, but four reliability bugs prevented it from working well in practice:

**Bug 1 — Auto-web items were unfindable on follow-up queries (`src/renderer/src/LocalAIEngine.ts`):**
Items saved by the automatic web-search path had `tags: ['web-search', 'auto-fetch']` — generic tags that contain no Fallout 4 topic words. Since `scoreItem()` in `knowledgeRetrieval.ts` awards +3 per tag keyword match, auto-web items always scored near-zero when the user asked follow-up questions about the same Fallout 4 topic, meaning they were never included in the AI context.
**Fix:** Extract query words as topic tags (`topicTags`) and include them in the vault item so follow-up queries retrieve the right items.

**Bug 2 — No deduplication (`src/renderer/src/LocalAIEngine.ts` + `src/renderer/src/MossyTools.ts`):**
Every web search or `scan_fallout4_live` call pushed new items unconditionally. Asking about the same topic twice in a week added two near-identical entries, wasting storage and polluting the AI context with redundant data.
**Fix:** Added `isDuplicateVaultEntry(vault, title)` exported from `knowledgeRetrieval.ts`. Checks if an item with the same title (first 80 chars) was saved within the last 7 days; if so, the new save is skipped.

**Bug 3 — No vault size cap on auto-fetched items (`src/renderer/src/knowledgeRetrieval.ts`):**
No code anywhere ever pruned auto-fetched vault entries. Power users could eventually hit the localStorage limit (~5 MB) after extended use, causing silent save failures and data loss.
**Fix:** Added `pruneAutoFetchedVaultItems(vault)` exported from `knowledgeRetrieval.ts`. Auto-fetched items (IDs starting `auto-web-`, `live-scan-wiki-`, `live-scan-web-`) are capped at **200 total**; the oldest are removed first. User-uploaded / manually-added items are never pruned.

**Bug 4 — Misleading "rest of our session" message (`src/renderer/src/MossyTools.ts`):**
The `scan_fallout4_live` result message told the user (and Mossy) *"I'll remember this for the rest of our session"* — but the data is stored in `localStorage` and persists permanently across all sessions. This caused confusion about Mossy's memory capabilities.
**Fix:** Changed to *"I'll remember this permanently across all future sessions."*

**Files changed:**
- `src/renderer/src/knowledgeRetrieval.ts` — added `isDuplicateVaultEntry()`, `pruneAutoFetchedVaultItems()`, `MAX_AUTO_ITEMS = 200`, `AUTO_ID_PREFIXES`, `isAutoFetched()`
- `src/renderer/src/LocalAIEngine.ts` — import new helpers; add topic tags to auto-web items; dedup + prune on save
- `src/renderer/src/MossyTools.ts` — import new helpers; dedup + prune on wiki + DDG vault saves; fix "session" message
- `CHANGES.md`

---

### 29. Fix: Mossy keeps claiming she's a language model with no internet access ✅

**Problem:**
Mossy would respond to online-search requests with phrases like "I'm a language model and I don't have access to the internet" or "As a language model, I lack real-time access." Three root-cause bugs:

1. **Response guard disabled when web search succeeded** (`src/renderer/src/LocalAIEngine.ts` line ~454):
   The guard condition was `(!needsWebSearch || webSearchUnavailable) && PATTERNS.some(...)`.
   When the user said "search for…" (triggering `needsWebSearch=true`) and the web search call
   succeeded (`webSearchUnavailable=false`), both halves were `false` → guard was completely
   disabled. The base LLM could still respond with a refusal and the guard would never fire.

2. **Missing "I'm a language model" refusal patterns (without "just")**:
   Patterns only caught `"I'm just a language model"` / `"as an AI, I cannot…"` but missed:
   - `"I'm a language model and I don't…"` / `"I am a language model and I can't…"`
   - `"as a language model, I don't have access"` / `"as a language model, I lack…"`
   - `"as an AI, I don't have access"` / `"being a language model…"`
   - `"I lack real-time access"` / `"I have no internet access"`
   - `"I don't have the ability/capability to access…"`

3. **Local LLM path (Ollama/LM Studio/Cosmos) had zero response guard**:
   The local provider branch returned immediately with no refusal check, so any local model
   that said it was an LLM with no internet access was passed directly to the user.

**Fixes:**

**Fix A — Unconditional response guard (`src/renderer/src/LocalAIEngine.ts`):**
- Removed `(!needsWebSearch || webSearchUnavailable) &&` from the guard condition.
- Guard now runs on EVERY Groq response, regardless of whether web search already ran.
- Comment updated to explain the reasoning.

**Fix B — 7 new refusal patterns added to `INTERNET_REFUSAL_PATTERNS`:**
- `/(i'm|i am) a(n)? (large language model|language model|llm)[,.] .*(don't|cannot|unable|lack).*(internet|web|online|access|real-time)/i`
- `/(i'm|i am) an? ai[,.] .*(don't|cannot|unable|lack).*(internet|web|online|access|real-time)/i`
- `/as an? (ai|language model|llm)[,.] .*(don't|cannot|unable|lack).*(internet|web|online|access|browse|real-time)/i`
- `/being an? (ai|language model|llm)[,.] .*(don't|cannot|unable|lack).*(internet|web|online|access|browse)/i`
- `/i (do not|don't) have the (ability|capability|capacity) to (access|browse|search|go online|retrieve|fetch)/i`
- `/i lack (real-time|internet|web|online|live) (access|data|information)/i`
- `/i (have|had) no (real-time|internet|web|live) (access|data|information)/i`

**Fix C — Local LLM response guard (`src/renderer/src/LocalAIEngine.ts`):**
- After `api.mlLlmGenerate()` responds, the same `INTERNET_REFUSAL_PATTERNS` check is applied.
- If triggered: fetches web results via `guardWebApiLocal.webSearch()`, injects them into an
  enriched context, and retries with `api.mlLlmGenerate()` using the same local provider/model.
- Failure is non-critical (falls through to original response rather than erroring out).

**Fix D — System prompt forbidden list expanded (`src/renderer/src/MossyBrain.ts`):**
- Added explicit `❌` entries for all the new phrase patterns:
  - `"as a language model, I don't have access"` / `"as a language model, I lack"`
  - `"as an AI, I don't have access"` / `"as an AI, I cannot"`
  - `"I'm a language model and I don't/can't"` / `"I am a language model and I don't/can't"`
  - `"I'm a large language model and"` / `"I am a large language model and"`
  - `"being a language model"` / `"being an AI"`
  - `"I lack real-time access"` / `"I have no real-time access"`
  - `"I lack internet access"` / `"I have no internet access"`
  - `"I don't have the ability to access"` / `"I don't have the capability to access"`

**Files changed:**
- `src/renderer/src/LocalAIEngine.ts` — guard condition fix; 8 new patterns; local LLM guard
- `src/renderer/src/MossyBrain.ts` — 16 new forbidden-statement entries
- `CHANGES.md`

---

### 28. Investigation: PR #83 closed without merging ✅

**Question:** "Why did PR #83 close without merging? We need to fix this."

**Root cause of the closure:**
PR #83 was a **draft PR** (`draft: true`) with `mergeable_state: unstable` (CI checks had not completed). GitHub's auto-merge workflow only runs on non-draft, ready-for-review PRs with passing checks. Because PR #83 was still in draft state when it was closed, the auto-merge workflow never triggered, so it was closed instead of merged.

**Are the changes lost?**
**No.** All five changes from PR #83 were already present in `master` via the prior merge commit (`f8869b4: Merge copilot/debug-mossy-connection-issue into master`). That merge commit incorporated the branch `copilot/debug-mossy-connection-issue` — the same branch that PR #83 was based on — so all content arrived in master regardless of the PR status.

**Verified present in current codebase (all from PR #83 diff):**
1. ✅ `src/electron/preload.ts` — `webSearch()` and `browseWeb()` IPC wrappers added (primary fix)
2. ✅ `src/electron/main.ts` — DuckDuckGo handler returns `empty: true` for no-content responses
3. ✅ `src/renderer/src/LocalAIEngine.ts` — Respects `empty` flag; persists web results to Knowledge Vault
4. ✅ `src/renderer/src/knowledgeRetrieval.ts` — `KnowledgeVaultItem` type exported
5. ✅ `CHANGES.md` — Entry #27 documents all three bugs fixed

**No code changes required.** All functionality is working correctly.

---

### 27. Fix: Mossy cannot go online or store results to memory bank — preload mismatch ✅

**Root cause (the real "fake fix" problem):**
`webSearch` and `browseWeb` were added to `src/main/preload.ts` — a secondary file that is **never loaded by Electron**. The actual preload loaded by `BrowserWindow` is `src/electron/preload.ts` (built to `preload.js` via `tsconfig.electron.json`). Because `src/electron/preload.ts` did not expose these two IPC methods, every call to `window.electron.api.webSearch()` returned `undefined`, causing `LocalAIEngine.ts` to log "webSearch API not available in preload" and mark web search as unavailable for the entire session.

This means ALL the previous fixes (#20–#26) that improved the response guard, vault pollution, or switched to `net.fetch()` were building on a broken foundation: the web search IPC bridge was never wired up in the real preload.

**Three compounding bugs fixed in this change:**

1. **Wrong preload file** (`src/electron/preload.ts` was missing `webSearch` + `browseWeb`):
   - `webSearch` and `browseWeb` were only in `src/main/preload.ts` which is NOT loaded by Electron.
   - Fix: Added both methods to `src/electron/preload.ts` with full JSDoc.

2. **Web search results not saved to memory bank** (`src/renderer/src/LocalAIEngine.ts`):
   - The automatic web search injection injected results into the AI context for the current session only — it never wrote to `mossy_knowledge_vault` (the memory bank). Users expected fetched info to persist.
   - Fix: After a successful web search, the result is now also pushed to `mossy_knowledge_vault` in localStorage so it persists across sessions (same pattern as `scan_fallout4_live`).

3. **Empty DuckDuckGo responses polluting context** (`src/electron/main.ts` + `src/renderer/src/LocalAIEngine.ts`):
   - DuckDuckGo's Instant Answer API often returns `{ success: true, text: '' }` for specific queries. The previous code returned a human-readable "No instant answer found" string with `success: true`, which got injected into the AI context as if it were real search results and sometimes confused the AI.
   - Fix: The DuckDuckGo handler now includes `empty: true` in the response when there is no real content. `LocalAIEngine.ts` checks this flag; empty results are treated as a search failure (triggering the response guard) instead of being injected as fake context.

**Files changed:**
- `src/electron/preload.ts` — **THE PRIMARY FIX**: added `webSearch()` and `browseWeb()` IPC wrappers
- `src/electron/main.ts` — DuckDuckGo handler: add `empty: true` flag to empty responses
- `src/renderer/src/LocalAIEngine.ts` — respect `empty` flag; save successful results to Knowledge Vault
- `CHANGES.md`

---

### 26. Fix: Mossy says she can't access the Internet after a recent update ✅

**Problem addressed:**
After a series of recent agent commits, Mossy started telling users she couldn't access the internet. Three compounding bugs were found:

1. **Vault pollution** (`recordWebSearchFailure` in `src/renderer/src/LocalAIEngine.ts`): A previous Codex agent added code that permanently stores "Mossy could not reach the internet" entries in the Knowledge Vault (localStorage) whenever a web search fails. These entries persist across sessions and are included in future AI contexts, causing the AI to report internet failures even when connectivity is restored.

2. **Misleading fallback message** (`webSearchUnavailable` context in `LocalAIEngine.ts`): The same Codex agent added a context injection that told the AI "Internet fetch failed (likely DNS or egress blocked). Do NOT say you lack internet access. Answer with existing knowledge and **advise the user to allow HTTPS to api.duckduckgo.com...**" — this message directly caused Mossy to tell users about network failures.

3. **Response guard disabled for web-search queries** (`LocalAIEngine.ts` line ~441): The response guard used `!needsWebSearch` as its condition, meaning it was DISABLED for any query that had already triggered a web search attempt. When web search failed (DNS error, network issue), the guard never fired to catch the AI's false refusal.

4. **Node `https` module bypassing system network settings** (`src/electron/main.ts`): The `httpsGetText` helper used Node's native `https` module which bypasses OS proxy settings, system certificate stores, and VPN configurations. Switching to Electron's `net.fetch()` (Chromium-backed) respects these settings.

**Fix A — Remove vault pollution (`src/renderer/src/LocalAIEngine.ts`):**
- `recordWebSearchFailure` now only logs to console; it no longer writes failure entries to the Knowledge Vault
- Web search failures are ephemeral diagnostic info, not knowledge to retain

**Fix B — Remove misleading fallback message (`src/renderer/src/LocalAIEngine.ts`):**
- Removed the `### LIVE WEB SEARCH TEMPORARILY UNAVAILABLE` injected context that told the AI to "advise the user to allow HTTPS to api.duckduckgo.com..."
- When web search fails, the AI simply answers from its existing knowledge without being told about the failure

**Fix C — Fix response guard condition (`src/renderer/src/LocalAIEngine.ts`):**
- Changed guard condition from `!needsWebSearch` to `(!needsWebSearch || webSearchUnavailable)`
- The guard now fires when web search was attempted but failed, allowing it to retry once and potentially recover if connectivity is restored

**Fix D — Use Electron net module for web search (`src/electron/main.ts`):**
- Replaced Node's `https.get()` with `net.fetch()` (Electron's Chromium-backed fetch) in `httpsGetText`
- Added `net` to the electron import
- Electron's `net.fetch()` respects OS proxy settings, system certificate stores, and VPN routes — the previous Node `https` module bypassed all of these

**Fix E — Clean up existing vault pollution on startup (`src/renderer/src/ChatInterface.tsx`):**
- Added cleanup in the mount `useEffect` to remove any existing `web-access-failure-*` vault entries from previous sessions
- One-time removal ensures users who already have the polluted vault get cleaned up automatically

**Fix F — Improve scan_fallout4_live no-results message (`src/renderer/src/MossyTools.ts`):**
- Changed "check your network connection" message to one that doesn't imply network failure
- Now suggests rephrasing the topic and offers to answer from existing knowledge

Files changed:
- `src/renderer/src/LocalAIEngine.ts` — fixes A, B, C
- `src/electron/main.ts` — fix D (net.fetch + net import)
- `src/renderer/src/ChatInterface.tsx` — fix E (vault cleanup on mount)
- `src/renderer/src/MossyTools.ts` — fix F (better no-results message)
- `CHANGES.md`

---

### 25. Fix: Mossy claims she's a "fixed model" ✅

**Problem addressed:**
Despite fixes #20-24, Mossy still occasionally told users "I'm a fixed model" or "my model is fixed" when asked about her capabilities. This specific phrasing was not covered by the existing forbidden statements list or response guard patterns.

**Fix A — Added "fixed model" patterns to forbidden statements (`src/renderer/src/MossyBrain.ts`):**
- Added 7 new forbidden phrases to the system prompt's CRITICAL: FORBIDDEN STATEMENTS section:
  - `"I'm a fixed model"`
  - `"I am a fixed model"`
  - `"my model is fixed"`
  - `"I'm a fixed language model"`
  - `"I am a fixed language model"`
  - `"language model with fixed knowledge"`
  - `"model with fixed data"`

**Fix B — Added "fixed model" patterns to response guard (`src/renderer/src/LocalAIEngine.ts`):**
- Added 4 new regex patterns to `INTERNET_REFUSAL_PATTERNS` array (now 32 patterns total):
  - `/i'?m\s+a\s+fixed\s+(model|language\s+model|llm)/i` — Catches "I'm a fixed model/language model/LLM"
  - `/i\s+am\s+a\s+fixed\s+(model|language\s+model|llm)/i` — Catches "I am a fixed model/language model/LLM"
  - `/my\s+(model|knowledge\s+base)\s+(is|was)\s+fixed/i` — Catches "my model/knowledge base is/was fixed"
  - `/(language\s+model|model|llm)\s+with\s+fixed\s+(knowledge|data)/i` — Catches "model with fixed knowledge/data"
- Response guard now catches all variations of the "fixed model" claim and triggers automatic web search + retry with injected results.

**Note:** The pause/resume button was already working correctly (fix #20). The button properly shows "Pause Mossy" when active and "Resume Mossy" when paused, which is the correct action-oriented labeling.

Files changed:
- `src/renderer/src/MossyBrain.ts` (lines 526-533)
- `src/renderer/src/LocalAIEngine.ts` (lines 318-322)
- `CHANGES.md`

---

### 24. Fix: Mossy claims data is "pre installed" and she's "just a base LLM" with no real-time access ✅

**Problems addressed:**
1. Despite fixes #20-23, Mossy still told users her "memory was pre installed", "all of my data was pre installed", and "I am just a large base LLM" or "just a base LLM".
2. She claimed she cannot "review and retain data in real time" or "cannot review data in real time" or "cannot retain data in real time".
3. These specific phrasings were not covered by the existing forbidden statements list or response guard patterns.

**Fix A — Expanded forbidden statements list (`src/renderer/src/MossyBrain.ts`):**
- Added 13 new forbidden phrases to the system prompt's CRITICAL: FORBIDDEN STATEMENTS section:
  - `"I cannot review data in real time"`
  - `"I cannot retain data in real time"`
  - `"I cannot review and retain data in real time"`
  - `"my data was pre installed"`
  - `"my memory was pre installed"`
  - `"all of my data was pre installed"`
  - `"all of my memory was pre installed"`
  - `"I'm just a large language model"`
  - `"I am just a large language model"`
  - `"I'm just a base LLM"`
  - `"I am just a base LLM"`
  - `"I'm just an LLM"`
  - `"I am just an LLM"`

**Fix B — Strengthened identity statement (`src/renderer/src/MossyBrain.ts`):**
- Replaced single line "YOU ARE NOT A BARE LLM..." with a comprehensive multi-line block:
  - `**YOU CAN REVIEW, RETAIN, AND ACCESS DATA IN REAL TIME. YOUR KNOWLEDGE IS NOT PRE-INSTALLED OR FIXED.**`
  - Added explicit bullet list of capabilities:
    - Search the internet RIGHT NOW using scan_fallout4_live
    - Review and retain new information from the web in your Knowledge Vault
    - Access real-time data from Fallout 4 Wiki, DuckDuckGo, and other sources
    - Update your knowledge dynamically based on current information

**Fix C — Expanded response guard patterns (`src/renderer/src/LocalAIEngine.ts`):**
- Added 7 new regex patterns to `INTERNET_REFUSAL_PATTERNS` array (now 28 patterns total):
  - `/my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i` — Catches "my data/memory/knowledge was/is pre-installed" or "preinstalled"
  - `/all\s+of\s+my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i` — Catches "all of my data/memory/knowledge was/is pre-installed"
  - `/i'?m\s+just\s+an?\s+(large\s+)?(language\s+model|base\s+llm|llm)/i` — Catches "I'm just a/an [large] language model/base LLM/LLM"
  - `/i\s+am\s+just\s+an?\s+(large\s+)?(language\s+model|base\s+llm|llm)/i` — Catches "I am just a/an [large] language model/base LLM/LLM"
  - `/i\s+cannot\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i` — Catches "I cannot review/retain/review and retain data/information in real-time" or "realtime"
  - `/i\s+can'?t\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i` — Catches "I can't review/retain/review and retain data/information in real-time"
  - `/i\s+(am\s+)?unable\s+to\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i` — Catches "I am unable to review/retain/review and retain data/information in real-time"
- Response guard now catches all variations of the "pre-installed", "just a base LLM", and "cannot review/retain real-time data" claims and triggers automatic web search + retry with injected results.

Files changed:
- `src/renderer/src/MossyBrain.ts` (lines 493-526, 538-545)
- `src/renderer/src/LocalAIEngine.ts` (lines 286-318)
- `CHANGES.md`

---

### 23. Fix: Mossy still says she can't access the internet (response-guard interceptor) ✅

**Problems addressed:**
1. Despite fixes #20–22, Mossy still occasionally told users she cannot access the internet.
   Root cause: LLMs may ignore "NEVER say" system-prompt instructions and fall back to
   trained behaviour when the user asks about her capabilities rather than asking her to
   search something specific.

**Fix A — Response-guard interceptor (`src/renderer/src/LocalAIEngine.ts`):**
- Added `INTERNET_REFUSAL_PATTERNS` — 15 regex patterns covering every known internet-refusal
  phrase: `"I cannot access the internet"`, `"I can't access the internet"`,
  `"I am unable to access the internet"`, `"I don't have internet access"`,
  `"I cannot browse the web"`, `"I can't go online"`, `"I don't have real-time access"`, etc.
- After the Groq cloud response is received, the patterns are tested against the response text.
- If a match is found AND no web search was already injected for that query, the interceptor:
  1. Immediately calls `api.webSearch(query)` to fetch live results.
  2. Rebuilds the system prompt with those live results injected.
  3. Retries the Groq call **once** with the enriched context so Mossy answers
     with real data rather than a false refusal.
- One-retry-only guard prevents infinite loops; errors in the retry path are non-fatal
  (the original response is returned as a fallback).

**Fix B — Broader INTERNET ACCESS block (`src/renderer/src/MossyBrain.ts`):**
- Added more explicit phrase variants to the first NEVER bullet:
  `"I'm unable to access the internet"`, `"I am unable to access the internet"`,
  `"I can't access the internet"`, `"I cannot connect to the internet"`,
  `"I can't go online"`, `"I cannot go online"`.
- Added more variants to the second NEVER bullet:
  `"I don't have access to real-time data"`, `"I'm not able to browse"`.
- Ensures the system-prompt instruction covers all known phrases before the response guard
  is even needed (defence in depth).

Files changed:
- `src/renderer/src/LocalAIEngine.ts`
- `src/renderer/src/MossyBrain.ts`
- `CHANGES.md`

---

### 22. Fix: Mossy still says "my knowledge base is fixed" / "I'm an LLM" after fix #21 ✅

**Problems addressed:**
1. After fix #21 the system prompt already forbade `"I cannot access the internet"` etc., but Mossy was still refusing with related phrases: `"my knowledge base is fixed"`, `"my training data only goes up to…"`, `"as a language model I cannot"`, `"I'm an LLM so I can't"`, `"I don't have real-time access"`.
2. Line 487 of `MossyBrain.ts` contained a double `++` concatenation operator which evaluated to `NaN`, injecting the literal text `NaN` into the system prompt between the last two sentences of the INTERNET ACCESS block — corrupting that part of the prompt.

**Fix A — Broadened forbidden-phrase list + removed double-`+` bug (`src/renderer/src/MossyBrain.ts`):**
- Fixed the `+ +` (double-plus) typo on the previous last line of the INTERNET ACCESS block.
- Added two new `NEVER` bullet points explicitly prohibiting all LLM-identity disclaimers:
  - `"my knowledge base is fixed"`, `"my knowledge has a cutoff"`, `"my training data only goes up to"`, `"as a language model I cannot"`, `"I'm an LLM so I can't"`, `"I don't have real-time access"`, `"I can't look that up"` — all forbidden.
  - Explicit instruction: never use LLM identity as an excuse to refuse web/real-time/live-data requests. Mossy is a desktop app with live internet tools, not a bare language model.

Files changed:
- `src/renderer/src/MossyBrain.ts`
- `CHANGES.md`

---

### 21. Fix: Mossy says "I cannot go online" + real-time Fallout 4 database scanning ✅

**Problems addressed:**
1. Despite the system prompt saying she has internet access, Mossy still told users she "cannot go online" or "cannot scan Fallout 4 information in real time."
2. There was no tool to actively scan multiple online Fallout 4 sources and save results to the Knowledge Vault.
3. Web-search auto-trigger keywords were too narrow — phrases like "go online", "scan", "real-time", "internet", "check online" did not trigger the automatic web search.

**Fix A — Broader web-search triggers (`src/renderer/src/LocalAIEngine.ts`):**
- Expanded `webSearchTriggers` array with ~27 new phrases:
  `go online`, `online`, `internet`, `check online`, `look it up online`, `look online`, `fetch`, `pull up`, `scan`, `scan for`, `real-time`, `real time`, `realtime`, `live data`, `live info`, `live information`, `check the web`, `check web`, `check internet`, `check the internet`, `from the web`, `from the internet`, `from online`, `on the web`, `on the internet`, `on nexus`, `on fandom`.
- These ensure the automatic background web-search fires whenever the user uses natural "go online" language.

**Fix B — New `scan_fallout4_live` tool (`src/renderer/src/MossyBrain.ts` + `src/renderer/src/MossyTools.ts`):**
- Added `scan_fallout4_live` to `toolDeclarations` in `MossyBrain.ts`. The AI is now explicitly told to call this tool whenever the user says "go online", "scan for info", "look up the latest", etc.
- Implemented handler in `MossyTools.ts`:
  1. Calls `api.webSearch(topic, 'wiki')` to fetch from the Fallout 4 Fandom MediaWiki.
  2. Calls `api.webSearch('Fallout 4 ' + topic)` to fetch broader DuckDuckGo web results.
  3. Both results are saved to `localStorage` `mossy_knowledge_vault` with `trustLevel: 'community'` and `tags: ['live-scan']`.
  4. Returns a formatted message with both sets of results plus a "✅ Saved to Knowledge Vault" confirmation.

**Fix C — System prompt update (`src/renderer/src/MossyBrain.ts`):**
- Under **INTERNET ACCESS — CRITICAL**, added two new bullet points explicitly describing `scan_fallout4_live` and instructing Mossy to call it immediately (never say "I cannot") when asked to go online or scan for information.

Files changed:
- `src/renderer/src/LocalAIEngine.ts`
- `src/renderer/src/MossyBrain.ts`
- `src/renderer/src/MossyTools.ts`
- `CHANGES.md`

---

### 20. Web search + Pause/Resume UX fix ✅

**Problems addressed:**
1. Mossy said she "cannot" search the Internet even though tools were defined in MossyBrain.ts.
2. After clicking the stop/pause button, users could not start communicating with Mossy again
   without restarting the app because the button label showed current state ("Mossy: OFF") rather
   than the action to take ("Resume Mossy"), so users did not know to click it again.

**Fix A — Web search (4 files):**
- `src/electron/main.ts`: Added `web-search` and `browse-web` IPC handlers.
  - `web-search` queries the **Fallout 4 Fandom MediaWiki API** for FO4-related terms, or the
    **DuckDuckGo Instant Answer API** for everything else. No API key required for either.
  - `browse-web` fetches any HTTPS URL via Node HTTPS, strips HTML, returns plain text (max 6,000 chars).
  - Both follow redirects (max 2 hops), enforce HTTPS-only, cap body size, and time out at 12 s.
- `src/main/preload.ts`: Exposed `webSearch(query, type?)` and `browseWeb(url)` via `contextBridge`.
- `src/renderer/src/MossyTools.ts`:
  - `search_fallout4_wiki` now calls `api.webSearch(query, 'wiki')` and returns the content as
    a formatted message. Falls back to opening the browser only if the IPC call fails.
  - `browse_web` is now implemented: calls `api.browseWeb(url)`, returns fetched text or an
    HTTPS-only error. Falls back to `openExternal` if the IPC method is unavailable.
- `src/renderer/src/LocalAIEngine.ts`: Added automatic web-search injection. When the user's query
  contains web-search trigger keywords (search, browse, look up, latest, wiki, nexus, etc.),
  Mossy proactively calls `webSearch` before the AI generates a response and injects the result
  into the system context under `### LIVE WEB SEARCH RESULTS`.

**Fix B — Pause/Resume UX (1 file: `src/renderer/src/ChatInterface.tsx`):**
- Toolbar button text changed from showing current state (`"Mossy: ON"` / `"Mossy: OFF"`) to
  showing the **action** (`"Pause Mossy"` / `"Resume Mossy"`). Icons and hover colours inverted
  to match: active state uses the neutral gray style; paused state uses the green/emerald style
  so "Resume Mossy" looks like a positive call-to-action.
- Updated `title` attribute: paused → `"Click to resume — Mossy will start responding again"`.
- Header badge updated: now reads `"Paused — click 'Resume Mossy' to continue"`.
- Chat input `disabled` when `isConversationPaused`; placeholder text changes to
  `"Mossy is paused — click Resume Mossy to continue"`.
- Send button `disabled` now includes `isConversationPaused` so it is visually grayed-out.
- Yellow banner added inside the input row when paused with explicit resume instructions.

**Do not touch:** The `isConversationPaused` state initialization (`false`), the
`toggleConversationPause` logic, or the mount-time localStorage cleanup.

---

### 18. Fix: Mossy never responds after first message (persisted pause bug) ✅

**Problem:** `isConversationPaused` state was initialised by reading `localStorage.getItem('mossy_conversation_paused')` on every app launch. If that key was ever set to `'true'` (e.g. the user once clicked the Pause/OFF button), Mossy would silently refuse to respond on every subsequent launch — `handleSend` returns immediately when `isConversationPaused` is `true`.

**Root cause:** The pause feature is intended as a temporary in-session toggle ("pause and restart without exiting"). Persisting it across app restarts was wrong — users should never start a fresh session with Mossy already paused.

**Fix (single file: `src/renderer/src/ChatInterface.tsx`):**
1. `isConversationPaused` now initialises to `false` unconditionally instead of reading from `localStorage`.
2. `toggleConversationPause()` no longer writes to `localStorage` (the pause/resume works in-session only).
3. Added a one-time mount `useEffect` that calls `localStorage.removeItem('mossy_conversation_paused')` to immediately clear any stale value for existing users.
4. Added `localStorage.removeItem('mossy_conversation_paused')` to the `resetMemory()` cleanup list.

**Do not touch:** The `isConversationPaused` state, the mount-time cleanup effect, or the `toggleConversationPause` handler. These are the correct, minimal fix.

---

### 17. Mossy's personality update + Pause/Resume conversation button ✅

**Requests:** 
1. Update Mossy to sound like a teaching assistant rather than a robot
2. Add pause/resume button for her communication so users can pause and restart without exiting the app

**Implementation:**

**Part 1: Personality Update**
- Enhanced `getFullSystemInstruction()` in `src/renderer/src/MossyBrain.ts` to emphasize Mossy as a **teaching mentor**
- New system prompt highlights:
  - "Teaching Philosophy" section that explains calibration by skill level
  - "Meeting them where they are" — beginners get step-by-step guidance, experts get technical depth
  - Emphasis on explaining the "why" behind each step, not just the "what"
  - Building confidence and normalizing mistakes as learning opportunities
  - Conversational tone ("you're a person who happens to know modding really well")
  - "Live Synapse Brevity" guidance for voice sessions reminds to still engage like a real person, not a script
  - Users can pause/resume at any time (added to voice capabilities section)

**Part 2: Pause/Resume Conversation Button**
- Added pause/resume control functions to `src/renderer/src/mossyTts.ts`:
  1. `pauseMossySpeech()` — pauses Mossy's voice output via `window.speechSynthesis.pause()`
  2. `resumeMossySpeech()` — resumes paused speech via `window.speechSynthesis.resume()`
  3. `isMossySpeechPaused()` — checks if speech is currently paused
  4. `stopMossySpeech()` — stops speech completely (cannot resume)

- Added new state to `src/renderer/src/ChatInterface.tsx`:
  - `isConversationPaused` state (persists to localStorage as `mossy_conversation_paused`)
  - `toggleConversationPause()` handler that:
    * Toggles pause state
    * Auto-pauses speech when pausing
    * Auto-resumes speech (if paused) when resuming
    * Dispatches event for other components

- Updated `src/renderer/src/ChatInterface.tsx` to prevent sending messages while paused:
  - `handleSend()` checks `isConversationPaused` and returns early if true
  - Users cannot send new messages during pause (UI prevents interaction)

- Added new toolbar button "Pause / Resume":
  - Shows "Pause" when conversation is active
  - Shows "Resume" when conversation is paused (with Play icon)
  - Located next to the "Monitor: ON/OFF" button in the chat toolbar
  - Visible on lg screens and up
  - Styled to show pause/resume state clearly (blue when active, gray when paused)

- Added visual indicator in chat header:
  - Yellow badge shows "Conversation Paused" when paused
  - Appears next to monitoring status and other indicators
  - Only visible on md screens and up

Files changed:
- `src/renderer/src/MossyBrain.ts` — Enhanced system prompt with teaching assistant focus
- `src/renderer/src/mossyTts.ts` — Added pause/resume/stop speech control functions
- `src/renderer/src/ChatInterface.tsx`:
  1. Added `isConversationPaused` state
  2. Added `toggleConversationPause()` handler
  3. Added pause/resume button to toolbar
  4. Added visual indicator in header
  5. Updated `handleSend()` to check pause state
  6. Imported new pause/resume functions

**User Experience:**
- Click "Pause" button → Mossy's speech pauses immediately, no new responses accepted
- Click "Resume" button → Mossy's paused speech resumes (or conversation resumes if no speech was playing)
- Yellow "Conversation Paused" badge appears in header for visibility
- Works perfectly with voice (TTS) disabled too
- No need to restart app or reload page

**Do not touch:** The pause/resume control functions, the state persistence, and the pause check in `handleSend()`.
These are critical for the pause/resume feature to work seamlessly.

---

### 1. Conversation context — Mossy remembers the whole chat
**Problem:** After the first exchange, every subsequent message was sent to the AI as a
brand-new single-turn conversation. No memory of what had been said.  
**Root cause:** `ChatInterface.tsx` built `localHistory` but never passed it down.  
**Fix:** `priorHistory` (last 20 messages) is threaded through the full IPC chain.

Files changed:
- `src/renderer/src/ChatInterface.tsx` — builds `priorHistory`, passes to `generateResponse()`
- `src/renderer/src/LocalAIEngine.ts` — `generateResponse()` accepts optional `conversationHistory`;
  embeds it as dialogue text for local providers (Ollama/LM Studio/Cosmos), passes as structured
  messages array for Groq/OpenAI cloud path
- `src/electron/preload.ts` — `aiChatGroq()` IPC wrapper accepts and forwards `conversationHistory`
- `src/electron/main.ts` — `ai-chat-groq` handler builds `messages[]` with full history between
  system prompt and current user message

**Do not touch:** The `priorHistory` build + pass-through chain above. It is working correctly.

---

### 2. Render backend resilience — backend-first, SDK fallback
**Problem:** Both `ai-chat-groq` and `ai-chat-openai` IPC handlers returned a hard error the
moment the Render backend was unavailable or returned any non-OK response. Voice chat (`sendMessage`)
already had the correct pattern; text chat did not.  
**Fix:** Both handlers now follow: try Render backend → fall back to direct SDK.

Files changed:
- `src/electron/main.ts`
  - `ai-chat-openai` handler: try Render → fall back to direct OpenAI SDK
  - `ai-chat-groq` handler: try Render → fall back to direct Groq SDK

Pattern (both handlers now follow this):
```
1. Build messages[] (system + history + user)
2. If backend configured → try POST /v1/chat to Render (20 s timeout, warn on failure)
3. If content still empty → load API key from settings/env → call SDK directly
4. Return { success: true, content }
```

Backend URL for Render: `https://mossy.onrender.com` (set in `.env.encrypted` and as packaged default)

**Do not touch:** The backend-first / SDK-fallback structure in both handlers. It must stay.

---

### 3. API key encryption — two security bugs fixed in `set-settings`
**Problem A (wipe bug):** Renderer always sends empty strings for secret fields (correctly
redacted by `redactSettingsForRenderer`). Old code called `encryptSecretForStorage('')` → `''`
and overwrote the valid `groqApiKeyEnc` with nothing. Key was silently deleted on next settings save.

**Problem B (bypass bug):** `{ ...current, ...newSettings }` let a renderer send
`groqApiKeyEnc: 'enc:...'` directly, bypassing `encryptSecretForStorage()` entirely.

**Fix:** Both fixed in `set-settings` IPC handler.

Files changed:
- `src/electron/main.ts` — `set-settings` handler:
  1. Strips all `*Enc` fields from renderer input before merging
  2. Empty string from renderer → preserves existing encrypted key, does **not** overwrite it

**Do not touch:** The `sanitizedInput` stripping and empty-value guard in `set-settings`.
These are security-critical.

---

### 4. Type safety — history filter type predicate
**Problem:** `(entry: any)` cast in `ai-chat-groq` history filter weakened type safety.  
**Fix:** Replaced with a proper TypeScript type predicate.

Files changed:
- `src/electron/main.ts` — `ai-chat-groq` history `.filter()` uses typed predicate

---

### 5. History cap — standardised to 20 messages
**Problem:** Renderer capped history at 20 messages; main process capped at 30. The main
process filter was redundant and inconsistent.  
**Fix:** Both capped at 20.

Files changed:
- `src/electron/main.ts` — `ai-chat-groq` `.slice(-20)` (was -30)

---

### 6. `.gitignore` — runtime data files excluded
Runtime-generated JSON files that should not be committed:
- `behavior-history.json`
- `longitudinal-data.json`
- `user-profile.json`

Files changed:
- `.gitignore` — added entries for the three files above

---

### 7. Voice chat race condition — correlation IDs fix multi-message handling
**Problem:** Mossy stopped responding after 1-2 voice exchanges. When multiple voice messages
were sent in quick succession (or even sequentially), the IPC message listeners had no way to
correlate responses with their originating requests. Each call to `sendMessageToMain()` created
a new listener on the 'message' channel that would resolve when it received ANY message with
`role: 'assistant'`. This caused race conditions where:
- The first listener to see any assistant response would resolve, even if it wasn't meant for it
- Subsequent messages would have their listeners resolve with the wrong response or timeout
- Old listeners from previous messages could intercept responses meant for newer messages

**Root cause:** No request/response correlation mechanism in the IPC communication pattern.
All listeners watched the same channel and competed to handle any assistant response that arrived.

**Fix:** Added unique correlation IDs to each request-response cycle:
- `LiveContext.tsx`: Generate a unique `correlationId` for each `sendMessage` call
- Each listener now only resolves when it receives a response with its matching `correlationId`
- Responses with mismatched IDs are logged and ignored
- `main.ts`: Extract `correlationId` from the request payload and echo it in the response

This ensures each voice message gets its own dedicated response handler with no cross-talk
between concurrent or sequential messages.

Files changed:
- `src/renderer/src/LiveContext.tsx` — `sendMessageToMain()` generates correlation ID, filters responses by ID
- `src/electron/main.ts` — `sendMessage` IPC handler extracts and echoes correlation ID

**Do not touch:** The correlation ID generation and matching logic. It is critical for preventing
listener race conditions in multi-message scenarios.

---

### 8. Voice chat MediaRecorder race condition — continuous conversation fix
**Problem:** Mossy stopped responding after 1-2 voice exchanges. After the first successful
exchange, the microphone would not restart properly for subsequent transcriptions. The user's
provided log showed the MediaRecorder starting during TTS playback (which should never happen),
and then failing to restart after TTS ended.

**Root cause:** Race condition in `voice-service.ts:385`. When a transcription completed, the code
scheduled an auto-restart setTimeout with a 1000ms delay. The condition check happened when
SCHEDULING the timeout, not when the callback FIRED. Timeline:
1. Recording completes → schedules auto-restart for T+1000ms (checks: `!isSpeaking` ✓)
2. T+594ms: AI processes → TTS starts (`isSpeaking = true`)
3. T+1000ms: setTimeout fires → **doesn't re-check `isSpeaking`** → starts MediaRecorder during TTS
4. TTS ends → tries to restart recording, but `isRecording` is already `true` → skips restart
5. Second transcription never happens → conversation stalls

**Fix:** Re-check all conditions INSIDE the setTimeout callback, not just when scheduling:
- `voice-service.ts:382-398`: Auto-restart after transcription now re-validates all flags
- `voice-service.ts:505-521`: TTS completion handler also re-validates (defense in depth)
- Both callbacks now check: `isListening && !shouldStop && !isUsingBrowserStt && !isSpeaking && !isRecording`
- Added defensive logging to show when/why restarts are skipped

This ensures the two restart timers (1000ms auto-restart and 400ms TTS-resume) can coexist
without creating duplicate MediaRecorders or missing restarts.

Files changed:
- `src/renderer/src/voice-service.ts` — auto-restart and TTS-resume timeout callbacks with condition re-validation

**Do not touch:** The condition re-checking inside both setTimeout callbacks. This is critical for
preventing MediaRecorder conflicts between the auto-restart and TTS-resume timers.

---

### 9. Voice silence detection — prevent premature cutoff mid-sentence
**Problem:** Mossy interrupted users mid-sentence by stopping recording too early during natural
speech pauses. Users reported being "cut off before finishing their sentence." The voice service
was stopping recording after only 1.5 seconds of silence, which is shorter than natural pauses
for breathing or thinking.

**Root cause:** `voice-service.ts:445` had a hardcoded 1500ms silence timeout, combined with a
silence threshold of 10. The threshold logic works as: `if (average < threshold) → silence`.
This meant values 0-9 were considered silence. Natural speech patterns include:
- Breathing pauses (typically 1-2 seconds)
- Thinking pauses while formulating thoughts (1-3 seconds)
- Quiet speaking voice (average 11-20 for some users)
- Background room noise or breathing sounds (average 7-14)

The 1.5s timeout was too aggressive, AND the threshold needed to be LOWER, not higher.

**Initial mistake (commit d1665e5):** INCREASED threshold from 10 → 15, which made the problem
WORSE. Since the check is `if (average < threshold)`, raising the threshold meant MORE values
counted as silence. Users with quiet voices (average 11-14 when speaking) were now detected as
silent even while talking!

**Correct fix (commit 3ace5a5):** DECREASED threshold and increased timeout:
1. **Decreased silence threshold:** 10 → 6 (voice-service.ts:441)
   - Lower threshold = only TRUE silence (very low audio ~0-5) triggers timer
   - Quiet speaking voice (avg 15-30 for most users) won't trigger silence
   - Breathing sounds (avg 7-14) won't trigger false silence detection
   - Only genuine quiet (< 6) is considered silence
2. **Increased silence duration:** 1500ms → 3000ms (voice-service.ts:449)
   - Full 3 seconds of TRUE silence before stopping
   - Very forgiving for natural pauses, breathing, thinking

How it works now:
- Speaking creates frequency average of ~15-30 (or higher for loud voices)
- Breathing/quiet ambient sounds create average of ~7-14
- TRUE silence creates average of ~0-5
- Only values < 6 trigger the 3-second countdown
- Allows natural pauses without premature cutoff

Files changed:
- `src/renderer/src/voice-service.ts` — silence detection threshold (line 441) and timeout (line 449)

**Do not touch:** The threshold of 6 and timeout of 3000ms. These values were tuned through
testing to balance responsiveness with patience. Lower threshold = less sensitive to silence
= more forgiving.

---

## In progress 🔄

_Nothing currently pending. All items are in Done._

---

### 16. Nemotron development testing infrastructure ✅

**Request:** Create dev-friendly testing infrastructure for Nemotron integration without requiring
actual service binary.

**Problem:** To test Nemotron auto-connector and communication flow, developers had to:
1. Build the actual Nemotron Python service (PyTorch, Transformers)
2. Wait for installer packaging
3. Run packaged installer to get nemotron-service.exe

This blocked rapid development iteration and testing of the optional installation system.

**Solution:** Created three-tier testing infrastructure:
1. **Mock HTTP Service** (`scripts/mock-nemotron-service.mjs`) — simulates Nemotron on localhost:5000
2. **Environment Variable Override** (`NEMOTRON_DEV_MODE`) — enables dev mode detection
3. **Combined Dev Launcher** (`scripts/dev-launcher.mjs`) — coordinates service + app startup

**Implementation:**

Files created:
- `scripts/mock-nemotron-service.mjs` — 140-line HTTP server with endpoints:
  - `GET /health` → health status + uptime + model version
  - `POST /generate` → accepts prompt, returns mock-generated text
  - `GET /config` → returns model configuration
  - `GET /` → service information
  - CORS headers enabled, request logging, graceful shutdown

- `scripts/dev-launcher.mjs` — 85-line orchestration script:
  - Spawns mock service on port 5000
  - Waits 2 seconds for startup
  - Spawns `npm run dev` with `NEMOTRON_DEV_MODE=true` environment variable
  - Coordinates cleanup on exit

- `package.json` — Added `"dev:nemotron": "node scripts/dev-launcher.mjs"` script

Files modified:
- `src/electron/services/nemotron-auto-connector.ts` — Enhanced `isNemotronInstalled()`:
  1. Checks `process.env.NEMOTRON_DEV_MODE === 'true'` first (dev override)
  2. Falls back to `NEMOTRON_DISABLED` check
  3. Falls back to Windows Registry (packaged app)
  4. Falls back to file existence (dev mode without override)
  - Logs: "[NemotronAutoConnector] Dev mode enabled - treating Nemotron as installed" when enabled

**Testing validation:** ✅ All end-to-end tests pass:
1. Mock service starts and responds on port 5000
2. App detects dev mode via environment variable
3. Auto-connector treats mock service as valid installation
4. App connects to mock service on startup
5. DesktopBridge routes health checks and requests to service
6. Mock service responds with proper JSON payloads
7. Complete request/response flow works end-to-end

**Workflow (two options):**

Option A - Automated:
```bash
npm run dev:nemotron
# This spawns both mock service and dev app together
```

Option B - Manual (two terminals):
```bash
# Terminal 1:
node scripts/mock-nemotron-service.mjs

# Terminal 2:
$env:NEMOTRON_DEV_MODE = 'true'
npm run dev
```

**Do not touch:** The three-tier architecture above. It enables safe development testing without
requiring the actual Nemotron service binary. Environment variable detection must take precedence
for dev mode to work.

**Next steps:**
- ✅ Dev testing complete (use dev-launcher or manual terminals)
- ⏳ Build installer: `npm run package:win`
- ⏳ Test with actual Nemotron component selected in installer
- ⏳ Verify registry flag and post-install auto-connection

---

### 15. Automated conversation + TTS tests ✅

**Request:** Run a test to verify that Mossy returns speech and keeps talking across 1-5+
conversations without stopping.

**Implementation:** New test file `src/renderer/src/__tests__/MossyConversation.test.tsx`
with 12 focused unit tests that cover every path in the `handleSend → AI response → speakMossy`
pipeline without requiring a running Electron app or live API keys.

**Tests included:**

| # | Description |
|---|---|
| 1 | `speakMossy` called with exact AI response text when voice is ON |
| 2 | `speakMossy` NOT called when voice is OFF |
| 3 | `speakMossy` NOT called when Live Voice is active (audio-feedback guard) |
| 4 | `isLoading` resets to `false` after every successful response |
| 5 | `recordAction` failure does NOT prevent response or TTS (bug fix from item 14) |
| 6 | `isLoading` resets even when `generateResponse` throws (finally always runs) |
| 7 | **5 back-to-back exchanges all produce a response + TTS call** (core loop test) |
| 8 | 5 exchanges with `recordAction` always failing — all still speak + unlock |
| 9 | Turns 1-4 fail (network error) → turn 5 recovers and speaks normally |
| 10 | `speakMossy` module resolves without throwing for a single call |
| 11 | `speakMossy` module resolves for a full sentence |
| 12 | `speakMossy` called with the correct text for each of 5 unique messages |

**Result: 205 tests pass (193 original + 12 new), 0 CodeQL alerts.**

Files changed:
- `src/renderer/src/__tests__/MossyConversation.test.tsx` — new test file (12 tests)

**Do not touch:** The test structure, mock setup, or `simulateSend` helper. These tests guard
the fixes made in items 12, 14 and must keep passing.



### 14. Mossy won't answer — three root causes fixed ✅

**Problem A (critical — chat silently locked up):** `await LocalAIEngine.recordAction(...)` was
called *after* `setIsLoading(true)` but *before* the `try/catch/finally` block in `handleSend`.
If it threw (e.g. `QuotaExceededError` from a full localStorage, or `SyntaxError` from corrupted
`mossy_ml_history` JSON), the `finally { setIsLoading(false) }` block was never reached.
`isLoading` stayed `true` forever. Every subsequent send hit the early-return guard
`if (... || isLoading || ...) return` and was silently swallowed — Mossy appeared completely
unresponsive until page reload.

**Problem B (voice chat — recording never stopped):** The browser STT silence-detection threshold
in `voice-service.ts` was raised from **8 → 15**. The previous value of 8 was still below the
typical ambient room-noise floor of 8–12, so silence was never detected, the MediaRecorder never
stopped, no audio blob was ever produced, and no transcript was ever sent — Mossy never heard
anything the user said.

**Problem C (TTS — greeting never spoken):** `initMossy()` set a welcome text message but never
called `speakMossy()`, so Mossy was completely silent on startup even when TTS was enabled.

**Fixes:**

- `src/renderer/src/ChatInterface.tsx`
  - Wrapped `await LocalAIEngine.recordAction(...)` in its own `try/catch` (non-fatal: logs
    a warning and continues so the main `try/finally` always runs and resets `isLoading`).
  - Added `speakMossy(...)` calls at the end of both `initMossy()` paths (new-user and
    returning-user). Text kept concise for TTS. `speakMossy` reads settings from localStorage
    independently so it works before `isVoiceEnabled` React state is rehydrated.

- `src/renderer/src/voice-service.ts`
  - Silence threshold: `8 → 15`. Normal speech is 15–40 (above threshold → keeps recording).
    Room noise and breathing are 0–14 (below threshold → timer fires after 2.5 s → recording
    stops → transcript sent → Mossy answers).

**Do not touch:** The `try/catch` around `recordAction` in `handleSend`, the threshold value of 15,
or the `speakMossy` calls in `initMossy`. These are the three fixes for "Mossy won't answer".



### 13. Always route through Render backend — Mossy can now talk ✅
**Problem:** `getBackendConfig()` returned `null` whenever `MOSSY_BACKEND_URL` was not set in
the environment (e.g. dev run without `.env.local`, or an existing `settings.json` that had an
empty `backendBaseUrl`). With no backend config, all three IPC handlers (`ai-chat-openai`,
`ai-chat-groq`, `sendMessage`) skipped the Render backend entirely and fell through to the local
Groq SDK fallback. The SDK fallback also failed because no Groq API key is present without
`.env.local`. Result: Mossy produced no response at all.

**Architecture:** Mossy always routes through the Render backend (`https://mossy.onrender.com`).
The backend holds all API keys server-side. The local SDK fallback is only a last-resort safety
net; it is not the primary path.

**Fix:** Added `'https://mossy.onrender.com'` as the hardcoded ultimate fallback in every place
that constructs the backend URL:

Files changed:
- `src/electron/main.ts`
  1. File-scope `getBackendConfig()`: `process.env.MOSSY_BACKEND_URL || 'https://mossy.onrender.com'`
     (was `|| ''`, causing `null` return when env var absent).
  2. `defaultBackendBaseUrl` in `loadSettings()` defaults block: removed `app.isPackaged` guard —
     Render URL is now the fallback in every environment, not just packaged builds.
  3. Function-scope `getBackendConfig()` inside `setupIpcHandlers()`: same Render URL fallback so
     existing `settings.json` files with an empty `backendBaseUrl` still resolve correctly.
  4. `get-settings` IPC handler: same fallback so the renderer always displays the correct URL.

**Timeouts unchanged at 20 s** — appropriate for a paid Render subscription (no cold-start delays).

**Do not touch:** The `'https://mossy.onrender.com'` hardcoded fallback in all four locations above.
This is what keeps Mossy talking when no explicit backend URL is configured.

---

### 12. Voice / TTS fixes — Mossy can now talk reliably  ✅
**Problem A:** Mossy (the AI) didn't know she had voice/TTS capabilities. When users asked
"can you talk?" or reported voice not working, the AI said it couldn't speak, which was
confusing and incorrect.

**Problem B:** Voice settings required a manual "Save" click before taking effect. The
"Enabled" checkbox in Voice Settings only updated the UI; if the user forgot to click Save,
the change was lost and TTS remained disabled.

**Problem C:** The "Test" button in Voice Settings used the previously-saved settings from
localStorage, not the current UI state. If the user had changed settings but not saved yet,
the test would use the old (possibly disabled) settings.

**Problem D:** `VoiceService.speakBrowser()` did not wait for voices to load before queuing
the utterance, meaning the preferred voice selection was sometimes skipped. It also did not
handle the `paused` state, which can cause Chrome/Electron speech synthesis to silently
queue utterances that never start.

**Fixes:**
- `src/renderer/src/MossyBrain.ts` — Added a **VOICE & AUDIO CAPABILITIES** section to the
  system prompt: Mossy now knows she has browser TTS, knows how to tell users to turn it on
  (Voice toggle in chat toolbar), and guides them to Settings → Voice Settings for
  troubleshooting.
- `src/renderer/src/VoiceSettings.tsx` — Settings now **auto-save on every change** (no
  manual Save click required). The `enabled` checkbox, voice selector, rate/pitch/volume
  sliders all save immediately. The "Test" button saves the current UI state before testing
  so the test always reflects what the user sees.
- `src/renderer/src/voice-service.ts` — `speakBrowser()` now: (1) resumes if `paused`;
  (2) waits for voices to be available before creating the utterance; (3) removes the
  hardcoded fallback voice name `'Linda'` (was causing log noise on systems without that
  voice).

**Do not touch:** The auto-save `updateSettings()` helper in VoiceSettings.tsx or the
`paused`/voice-load-wait logic in `speakBrowser()`.

### 10. Groq cost optimisation — correct model + rate-limit fallback  ✅
**Problem A:** Render backend defaulted to `llama-3.1-70b-versatile` (deprecated model name).  
**Problem B:** Neither the backend nor the desktop direct-SDK path handled Groq `429 RateLimitError`.
For a free service with shared keys and many users, rate limits on the 70b model will be hit regularly
(free tier: 500 req/day). When that happened, both paths silently failed with no recovery.

**Fix:**
- `llama-3.3-70b-versatile` is now the primary model everywhere (current flagship, free tier)
- On `RateLimitError` the code automatically retries **once** with `llama-3.1-8b-instant`
  — free tier: **14 400 req/day and 20 000 tokens/min** — ~28× the quota of the 70b model
- This fallback is in **both** places: the Render backend route AND the desktop direct-SDK path

Files changed:
- `src/backend/routes/chat.ts` — `GROQ_PRIMARY_MODEL`/`GROQ_FALLBACK_MODEL` constants,
  `groqChatWithFallback()` helper, updated default model env var read
- `src/electron/main.ts` — `callGroqWithFallback()` helper near line 3940,
  used in `ai-chat-groq` direct SDK path and `sendMessage` direct SDK path
- `.env.backend.example` — `GROQ_MODEL` updated to `llama-3.3-70b-versatile`

**Do not touch:** The `GROQ_PRIMARY_MODEL` / `GROQ_FALLBACK_MODEL` constants or the fallback logic.

---

**What to do on Render after getting a new Groq key:**
1. Render dashboard → your Mossy service → Environment → set `GROQ_API_KEY=<your new key>`
2. Render will auto-restart the service
3. Run `npm run setup-keys` locally → enter the same new key → re-package

---

### 11. `check-comms` — live end-to-end communication health check  ✅
**Problem:** `verify-build.mjs` only checks that keys exist and are encrypted in the file.
It does NOT call the Groq API. The only way to know if Groq is actually responding was to
open the app and talk to it — which is slow and manual.

**Fix:** New script makes real live API calls and prints clear pass/fail per step.

```
npm run check-comms
```

Steps it tests:
1. `.env.encrypted` present → Groq key decrypts correctly
2. Primary model (`llama-3.3-70b-versatile`) → real Groq API call → responds
3. Fallback model (`llama-3.1-8b-instant`) → real Groq API call → responds
4. Render backend (`/v1/chat`) → real HTTP call → responds (warn-only if unreachable, not critical)

Rate-limit on primary is shown as a warning (not failure) — the fallback is still tested.  
Backend errors are shown as warnings — the desktop will fall back to direct SDK.  
Exit code 0 = critical checks passed (ready to package). Exit code 1 = action needed.

Files changed:
- `scripts/check-comms.mjs` — new script
- `package.json` — `"check-comms": "node scripts/check-comms.mjs"`

**Run order for a new key:**
```
npm run setup-keys      # enter new key
npm run check-comms     # verify it actually works
npm run build && npm run package:win
```

---

### 7. Packaged build `.env.encrypted` path resolution  ✅
**Problem:** `process.cwd()` is unreliable on Windows in packaged Electron apps.  
**Fix:** Searches four candidate paths — `app.getAppPath()` (inside asar, primary),
`process.resourcesPath`, `path.dirname(process.execPath)`, then `process.cwd()`.

Files changed:
- `src/electron/main.ts` — `findEnvFile()` helper replaces single `process.cwd()` lookup

---

### 8. First-run `loadSettings()` — seed env keys into defaults  ✅
**Problem:** New users (no `settings.json`) got empty defaults; keys from `.env.encrypted`
were never seeded on first launch.  
**Fix:** `loadSettings()` default path now calls `seedSecretFromEnv()` and persists result.

Files changed:
- `src/electron/main.ts` — fallback return block seeds + writes `settings.json` on first run

---

### 9. `setup-keys` developer script  ✅
**Problem:** No easy way to add/update a Groq key into `.env.encrypted` without a `.env.local`.  
**Fix:** New interactive script reads existing encrypted file, prompts per key, re-encrypts, verifies.

Files changed:
- `scripts/setup-keys.mjs` — new interactive CLI tool
- `package.json` — `"setup-keys": "node scripts/setup-keys.mjs"`

```bash
npm run setup-keys   # enter your Groq key → encrypted → verified → ready to package
```

---

## What's working and must NOT be changed

| System | Status | Notes |
|---|---|---|
| `.env.encrypted` | ✅ Valid | GROQ_API_KEY (`gsk_...`, 56 chars), OPENAI_API_KEY (`sk-...`, 164 chars), MOSSY_BACKEND_TOKEN (32 chars), MOSSY_BACKEND_URL (`https://mossy.onrender.com`) — all decrypt correctly |
| Encryption algorithm | ✅ AES-256-CBC | `mossy-2026-packaging-key-change-in-production`, same key in `scripts/setup-keys.mjs`, `scripts/encrypt-keys.js`, and `src/electron/main.ts` startup block — must stay in sync |
| `electron-builder` config | ✅ | `.env.encrypted` is in `"files"` array → bundled inside asar |
| `safeStorage` at-rest encryption | ✅ | Settings `*Enc` fields use Electron `safeStorage` (OS keychain-backed) |
| `redactSettingsForRenderer` | ✅ | All secret fields blanked before sending to renderer |
| Render backend URL | ✅ | `https://mossy.onrender.com` — set in `.env.encrypted` and as `app.isPackaged` hardcoded default |
| Voice chat (sendMessage) | ✅ | Already had backend-first + SDK fallback before this PR |
| Text chat history | ✅ | Fixed in item 1 above |
| Tests | ✅ 193/193 passing | Run: `npm run test:unit` |
| CodeQL security scan | ✅ 0 alerts | |

---

## Key architecture rules (enforce always)

1. **API keys never touch the renderer.** Main process owns all secrets. Renderer only ever
   sees presence booleans from `getSecretStatus()`.

2. **`ai-chat-*` IPC handlers always try Render backend first, then SDK fallback.**
   Never hard-fail when backend is absent. See item 2 above.

3. **`set-settings` must strip `*Enc` fields from renderer input before merging.**
   And must preserve existing encrypted key when renderer sends empty string. See item 3 above.

4. **`.env.encrypted` is the carrier for developer-supplied API keys.**
   Users never enter keys. Developer encrypts keys → bundled at build time → distributed in installer.

5. **`scripts/setup-keys.mjs`, `scripts/encrypt-keys.js`, and the `ENCRYPTION_KEY` constant in `main.ts` must always match.**
   Both use `'mossy-2026-packaging-key-change-in-production'`. If you change one, change both.

---

## Packaging checklist (before running `npm run package:win`)

- [ ] `.env.encrypted` has valid, current keys (run `npm run setup-keys` to update)
- [ ] `npm run check-comms` → all critical checks pass (confirms Groq API is live)
- [ ] Render backend has `GROQ_API_KEY` set in its environment variables dashboard
- [ ] Render backend has `MOSSY_API_TOKEN` matching `MOSSY_BACKEND_TOKEN` in `.env.encrypted`
- [ ] `npm run test:unit` → all 193 tests pass
- [ ] `npm run build` succeeds without errors

---

## Render backend environment variables (set on render.com dashboard)

These live on the **server**, not in the app. Set them in the Render service's Environment tab:

```
GROQ_API_KEY=<your groq key>
OPENAI_API_KEY=<your openai key>
MOSSY_API_TOKEN=<must match MOSSY_BACKEND_TOKEN in .env.encrypted>
```
