/**
 * Local AI Engine Service
 * Connects Mossy to local AI backends like Ollama or Groq Cloud.
 */


import {
  buildKnowledgeManifestForModel,
  buildRelevantKnowledgeVaultContext,
  getRelevantKnowledgeVaultItems,
  isDuplicateVaultEntry,
  pruneAutoFetchedVaultItems,
  KnowledgeVaultItem,
} from './knowledgeRetrieval';
import { selfImprovementEngine } from './SelfImprovementEngine';
import { getApprovedToolsFromStorage } from './toolPermissions';

export interface AIResponse {
  content: string;
  context?: any;
  /** Mossy's own pre-answer deliberation (when the reasoning pre-pass ran) —
   *  a private planning scratchpad, not part of the answer itself. Optional
   *  UI surfaces this as a collapsible "reasoning" trace; most callers can
   *  ignore it entirely. */
  reasoning?: string;

  // --- Brain B tutor contract (see brain-b/gemma_service_enhanced.py's /infer) ---
  // Only populated when Brain B answered this turn; undefined for every other
  // provider, including when Brain B abstained (still populated then — abstained
  // itself is the signal, not a missing response).
  /** teach | answer | debug — set by Brain B's mode classifier. */
  mode?: 'teach' | 'answer' | 'debug';
  /** What Brain B decided the user actually needs, computed before generating. */
  diagnosis?: string | null;
  /** A verification question, only ever set when mode === 'teach'. */
  checkQuestion?: string | null;
  /** True when Brain B found no matching documentation and declined to guess —
   *  `content` is already the honest "I don't know" message in that case, not
   *  an error; render it plainly rather than as a failure. */
  abstained?: boolean;
}

/** Minimal shape of a successful web search result used internally. */
interface WebSearchResult {
  text: string;
  url?: string;
  source?: string;
}

type LocalAiPreferred = 'auto' | 'cosmos' | 'ollama' | 'openai_compat' | 'brainb' | 'off';

type LocalAiSettings = {
  localAiPreferredProvider?: LocalAiPreferred;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
  cosmosBaseUrl?: string;
  cosmosModel?: string;
  /** Brain B — Mossy's own local RAG/tutor Flask service (brain-b/gemma_service_enhanced.py).
   *  Default port 8766, not 8765 — that port is already claimed by the F4AI NPC-dialogue relay
   *  this same app starts unconditionally (see src/electron/main.ts). */
  brainBBaseUrl?: string;
};

/**
 * One id per app session (module lives for the renderer's lifetime — reset on
 * reload/restart, stable across every chat turn within it). Passed to Brain B
 * as `session_id` so learner_signals rows can be assembled into a per-learner
 * trajectory instead of each being an unowned "unknown" observation — see
 * gemma_service_enhanced.py's /infer docstring for why that mattered enough
 * to wire through now rather than defer again now that something calls it.
 * Not a durable per-user id (that's a bigger, separate concept) — just enough
 * to tell "same session" apart from "different session" in the logged data.
 */
const APP_SESSION_ID: string =
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Stable across every session, unlike APP_SESSION_ID above — generated once,
 * persisted via the same settings store as everything else, reused on every
 * future launch. This is what Brain B's learner_state is actually keyed on
 * (see gemma_service_enhanced.py's compute_answer_level()/update_learner_state()):
 * session_id alone can only tell turns within one launch apart, but a learner
 * model needs continuity across launches to mean anything. Memoized after
 * first resolution so repeated calls in one session don't re-hit settings I/O.
 */
let _cachedUserId: string | null = null;
async function getOrCreateUserId(): Promise<string> {
  if (_cachedUserId) return _cachedUserId;
  try {
    const api = (window.electron?.api || window.electronAPI) as any;
    const s = await api?.getSettings?.();
    if (s?.mossyUserId && typeof s.mossyUserId === 'string') {
      _cachedUserId = s.mossyUserId;
      return s.mossyUserId;
    }
    const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await api?.setSettings?.({ mossyUserId: newId });
    _cachedUserId = newId;
    return newId;
  } catch {
    // Settings unavailable for some reason — fall back to session-scoped rather
    // than block the chat turn on this. Learner continuity is lost for this
    // launch, but nothing else breaks.
    return APP_SESSION_ID;
  }
}

/**
 * Minimum ratio of sanitised text length to original that must be preserved for
 * `sanitizeFinalResponse` to return the sanitised version.  If sanitisation would
 * remove more than (1 - MIN_SANITIZED_TEXT_RATIO) of the text — i.e. the response
 * was almost entirely a refusal — the original is returned unchanged to avoid
 * returning an empty or misleadingly-short string to the user.
 */
const MIN_SANITIZED_TEXT_RATIO = 0.3;

export const LocalAIEngine = {
  /**
   * Loads persisted local AI settings (if available).
   */
  async getLocalAiSettings(): Promise<LocalAiSettings> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return {
          localAiPreferredProvider: (s?.localAiPreferredProvider ?? 'auto') as LocalAiPreferred,
          ollamaBaseUrl: s?.ollamaBaseUrl ?? 'http://127.0.0.1:11434',
          ollamaModel: s?.ollamaModel ?? 'llama3',
          openaiCompatBaseUrl: s?.openaiCompatBaseUrl ?? 'http://127.0.0.1:1234/v1',
          openaiCompatModel: s?.openaiCompatModel ?? '',
          cosmosBaseUrl: s?.cosmosBaseUrl ?? '',
          cosmosModel: s?.cosmosModel ?? '',
          brainBBaseUrl: s?.brainBBaseUrl ?? 'http://127.0.0.1:8766',
        };
      }
    } catch {
      // ignore
    }

    return {
      localAiPreferredProvider: 'auto',
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      ollamaModel: 'llama3',
      openaiCompatBaseUrl: 'http://127.0.0.1:1234/v1',
      openaiCompatModel: '',
      cosmosBaseUrl: '',
      cosmosModel: '',
      brainBBaseUrl: 'http://127.0.0.1:8766',
    };
  },

  /**
   * Returns self-critique preference from persisted settings. Defaults ON
   * (opt-out) when unset — previously defaulted OFF with no UI to ever set it
   * to true, so the whole feature was unreachable dead code in practice.
   */
  async getSelfCritiqueEnabled(): Promise<boolean> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return s?.groqSelfCritiqueEnabled !== false;
      }
    } catch {
      // ignore
    }
    return true;
  },

  /**
   * Returns deliberate-reasoning (pre-answer planning pass) preference.
   * Defaults ON, same opt-out reasoning as getSelfCritiqueEnabled above.
   */
  async getDeliberateReasoningEnabled(): Promise<boolean> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return s?.groqDeliberateReasoningEnabled !== false;
      }
    } catch {
      // ignore
    }
    return true;
  },

  /**
   * Returns up to `maxSessions` past session summaries from localStorage,
   * formatted as a context block to inject into the system prompt.
   */
  getSessionMemoryContext(maxSessions = 5): string {
    try {
      const raw = localStorage.getItem('mossy_session_memories');
      if (!raw) return '';
      const sessions: Array<{ ts: string; summary: string }> = JSON.parse(raw);
      if (!Array.isArray(sessions) || sessions.length === 0) return '';
      const recent = sessions.slice(-maxSessions);
      const lines = recent.map((s) => `[${s.ts}] ${s.summary}`).join('\n');
      return `\n### PAST SESSION MEMORIES (most recent ${recent.length}):\n${lines}\n`;
    } catch {
      return '';
    }
  },

  /**
   * Saves a session summary to the rolling localStorage store (capped at 100 entries).
   */
  saveSessionSummary(summary: string): void {
    try {
      const raw = localStorage.getItem('mossy_session_memories');
      const sessions: Array<{ ts: string; summary: string }> = raw ? JSON.parse(raw) : [];
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
      sessions.push({ ts, summary });
      // Cap at 100 entries rolling window
      const capped = sessions.slice(-100);
      localStorage.setItem('mossy_session_memories', JSON.stringify(capped));
    } catch {
      // non-critical — ignore
    }
  },

  /**
   * Checks whether a local AI provider is available.
   * Uses the Electron main process to avoid CORS and to support configurable ports.
   */
  async getLocalProviderStatus(): Promise<
    | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'cosmos'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'openai_compat'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'koboldcpp'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'fo4bridge'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'brainb'; baseUrl: string; models: string[] }
    | { ok: false; reason: string }
  > {
    try {
      const api = (window.electron?.api || window.electronAPI) as any;
      if (!api?.mlCapsStatus) return { ok: false, reason: 'Desktop capabilities API not available.' };

      const settings = await this.getLocalAiSettings();
      const preferred = (settings.localAiPreferredProvider ?? 'auto') as LocalAiPreferred;

      const caps = await api.mlCapsStatus();
      const ollamaOk = !!caps?.ollama?.ok;
      const cosmosOk = !!caps?.cosmos?.ok;
      const openaiOk = !!caps?.openaiCompat?.ok;

      // Check KoboldCPP — it's running if the process is up and port 5001 responds
      let koboldOk = false;
      try {
        if (api.koboldStatus) {
          const ks = await api.koboldStatus();
          koboldOk = !!ks?.running;
        }
      } catch { /* not available */ }
      const KOBOLD_BASE = 'http://127.0.0.1:5001/v1';

      // Check FO4 Advanced AI bridge (port 28485) — has llama-cpp-python inline
      let bridgeOk = false;
      try {
        const br = await fetch('http://127.0.0.1:28485/llm/status', { signal: AbortSignal.timeout(1500) });
        if (br.ok) {
          const bs = await br.json();
          bridgeOk = bs?.model_loaded || bs?.koboldcpp_running;
        }
      } catch { /* not running */ }
      const BRIDGE_BASE = 'http://127.0.0.1:28485';

      // Check Brain B (default port 8766) — Mossy's own local RAG/tutor service. Optional,
      // user-started (brain-b/gemma_service_enhanced.py), not bundled or auto-launched.
      let brainbOk = false;
      const BRAINB_BASE = String(settings.brainBBaseUrl || 'http://127.0.0.1:8766');
      try {
        const bb = await fetch(`${BRAINB_BASE}/health`, { signal: AbortSignal.timeout(1500) });
        if (bb.ok) {
          const bs = await bb.json();
          brainbOk = bs?.status === 'ok';
        }
      } catch { /* not running */ }

      const pickAuto = () => {
        if (cosmosOk) return { ok: true as const, provider: 'cosmos' as const, baseUrl: caps.cosmos.baseUrl, models: caps.cosmos.models || [] };
        // Brain B ranks above the generic completion providers when it's up: it requires the
        // user to have deliberately started a separate service, a stronger signal of intent
        // than "Ollama happens to be running in the background", and it's a specialized
        // RAG/tutor system rather than a raw completion endpoint.
        if (brainbOk) return { ok: true as const, provider: 'brainb' as const, baseUrl: BRAINB_BASE, models: ['brain-b'] };
        if (ollamaOk) return { ok: true as const, provider: 'ollama' as const, baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] };
        if (openaiOk) return { ok: true as const, provider: 'openai_compat' as const, baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] };
        if (koboldOk) return { ok: true as const, provider: 'koboldcpp' as const, baseUrl: KOBOLD_BASE, models: ['tinyllama'] };
        if (bridgeOk) return { ok: true as const, provider: 'fo4bridge' as const, baseUrl: BRIDGE_BASE, models: ['tinyllama'] };
        return { ok: false as const, reason: 'No local provider detected.' };
      };

      if (preferred === 'off') return { ok: false, reason: 'Local AI disabled in settings.' };
      if (preferred === 'auto') return pickAuto();

      if (preferred === 'brainb') {
        return brainbOk
          ? { ok: true, provider: 'brainb', baseUrl: BRAINB_BASE, models: ['brain-b'] }
          : { ok: false, reason: 'Brain B not detected — is gemma_service_enhanced.py running?' };
      }

      if (preferred === 'cosmos') {
        return cosmosOk
          ? { ok: true, provider: 'cosmos', baseUrl: caps.cosmos.baseUrl, models: caps.cosmos.models || [] }
          : { ok: false, reason: `Cosmos not detected (${caps?.cosmos?.error || 'unknown'})` };
      }

      if (preferred === 'ollama') {
        return ollamaOk
          ? { ok: true, provider: 'ollama', baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] }
          : { ok: false, reason: `Ollama not detected (${caps?.ollama?.error || 'unknown'})` };
      }

      // openai_compat
      return openaiOk
        ? { ok: true, provider: 'openai_compat', baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] }
        : { ok: false, reason: `OpenAI-compatible server not detected (${caps?.openaiCompat?.error || 'unknown'})` };
    } catch (e: any) {
      return { ok: false, reason: String(e?.message || e) };
    }
  },

  /**
   * Backwards-compatible helper used by existing UI code.
   */
  async checkOllama(): Promise<boolean> {
    const st = await this.getLocalProviderStatus();
    return st.ok && st.provider === 'ollama';
  },

  /**
   * Generates a response using the local Ollama service or Groq Cloud API.
   * Pass `conversationHistory` (prior messages, not including the current query) to
   * maintain multi-turn conversation context.
   * Pass `voiceMode: true` for voice queries — skips the response guard (which makes
   * a second API call) to keep voice latency from doubling to 100+ seconds.
   */
  async generateResponse(query: string, systemInstruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, voiceMode = false, signal?: AbortSignal, localOptions?: { timeoutMs?: number; think?: boolean }): Promise<AIResponse> {
    const localStatus = await this.getLocalProviderStatus();
    const localSettings = await this.getLocalAiSettings();

    // --- SELF-IMPROVEMENT: Include learning insights ---
    let enhancedSystemInstruction = systemInstruction;
    const learningInsights = selfImprovementEngine.getLearningInsights();
    if (learningInsights) {
      enhancedSystemInstruction += '\n\n### SELF-IMPROVEMENT INSIGHTS:\n' + learningInsights;
    }

    // --- SESSION MEMORY: Inject past session summaries for continuity ---
    // Voice mode: 1 summary only (keeps prompt lean); text/chat: full 5
    const sessionMemoryCtx = this.getSessionMemoryContext(voiceMode ? 1 : 5);
    if (sessionMemoryCtx) {
      enhancedSystemInstruction += sessionMemoryCtx;
    }

    // --- KNOWLEDGE & PROCESS INJECTION ---
    // voiceMode: skip the heavy context injections that bloat the system prompt
    // to 50,000 chars and cause 25-30s Groq response times. Voice needs fast
    // replies — a lean prompt (~3,000 chars) gets answers in 2-4s instead.
    let injectedContext = "";
    let webSearchFailureLogged = false;
    let webSearchUnavailable = false;
    const recordWebSearchFailure = (reason: string) => {
      if (webSearchFailureLogged) return;
      webSearchFailureLogged = true;
      webSearchUnavailable = true;
      console.warn('[LocalAIEngine] Web search unavailable:', reason);
    };

    if (!voiceMode) {
    // Inject Process & Hardware Awareness
    const electronApiAny = (window as any).electron?.api;
    if (typeof electronApiAny?.getRunningProcesses === 'function') {
      try {
        const processes = await electronApiAny.getRunningProcesses();
        const blenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
        // Permission-filtered, not a raw dump: a tool the user explicitly denied
        // (checked === false) must never be presented as available to use.
        const approvedTools = getApprovedToolsFromStorage();
        const approvedDetected = approvedTools.filter((t) => t.checked !== false && t.path);
        const deniedTools = approvedTools.filter((t) => t.checked === false);
        const isDenied = (keyword: string) =>
          deniedTools.some((t) => t.name.toLowerCase().includes(keyword));
        const systemProfileRaw = localStorage.getItem('mossy_system_profile');
        let userSettings: any = null;

        try {
          if (window.electronAPI?.getSettings) {
            userSettings = await window.electronAPI.getSettings();
          }
        } catch (e) {
          console.error('[LocalAIEngine] Failed to get settings:', e);
        }

        if (processes.length > 0 || blenderLinked || approvedTools.length > 0 || systemProfileRaw || userSettings) {
          injectedContext += "\n### INSTALLED SOFTWARE & CREATIVE PIPELINE:\n";

          // --- HARDWARE STATUS ---
          if (systemProfileRaw) {
            const profile = JSON.parse(systemProfileRaw);
            injectedContext += `- [SYSTEM SCAN STATUS]: COMPLETE\n`;
            injectedContext += `- [HARDWARE]: ${profile.cpu}, ${profile.gpu}, ${profile.ram}GB RAM`;
            if (profile.vram) injectedContext += `, ${profile.vram}GB VRAM`;
            if (profile.motherboard) injectedContext += `, MB: ${profile.motherboard}`;
            if (profile.os) injectedContext += ` (${profile.os})`;
            injectedContext += "\n";

            if (profile.storageDrives && profile.storageDrives.length > 0) {
              injectedContext += "- [STORAGE]: " + profile.storageDrives.map((d: any) => `${d.device} (${d.free}GB/${d.total}GB)`).join(", ") + "\n";
            }
          } else {
            injectedContext += `- [SYSTEM SCAN STATUS]: Hardware profile not loaded in this session. The scan may have been run previously. Do NOT ask the user to redo the scan — they can refresh scan data from Settings > System Monitor if needed.\n`;
          }

          if (userSettings) {
            injectedContext += "- [DESKTOP APPLICATIONS - CONFIGURED, PERMISSION GRANTED]:\n";
            if (userSettings.xeditPath && !isDenied('xedit')) injectedContext += `  * xEdit: ${userSettings.xeditPath}\n`;
            if (userSettings.nifSkopePath && !isDenied('nifskope')) injectedContext += `  * NifSkope: ${userSettings.nifSkopePath}\n`;
            if (userSettings.creationKitPath && !isDenied('creation kit')) injectedContext += `  * Creation Kit: ${userSettings.creationKitPath}\n`;
            if (userSettings.blenderPath && !isDenied('blender')) injectedContext += `  * Blender: ${userSettings.blenderPath}\n`;
            if (userSettings.mo2Path && !isDenied('mod organizer')) injectedContext += `  * Mod Organizer 2: ${userSettings.mo2Path}\n`;
            if (userSettings.vortexPath && !isDenied('vortex')) injectedContext += `  * Vortex: ${userSettings.vortexPath}\n`;
          }

          if (blenderLinked) injectedContext += "- [STATUS] Blender Neural Link: ACTIVE\n";

          if (approvedDetected.length > 0) {
            injectedContext += "- [SCANNED TOOLS - USER GRANTED PERMISSION TO USE]:\n";
            approvedDetected.forEach((a) => {
              injectedContext += `  * ${a.name} (Path: ${a.path})\n`;
            });
          }

          if (deniedTools.length > 0) {
            injectedContext += "- [TOOLS USER DENIED PERMISSION FOR - DO NOT USE OR RECOMMEND THESE]:\n";
            deniedTools.forEach((a) => {
              injectedContext += `  * ${a.name}\n`;
            });
          }

          if (processes.length > 0) {
            injectedContext += "- [RUNNING NOW (SYSTEM PROCESSES)]: " + processes.map((p: any) => `${p.name} (Active Application)`).join(", ") + "\n";
          }
          injectedContext += "\n";
        }
      } catch (e) {
        console.error('[LocalAIEngine] Hardware/software context injection error:', e);
      }
    }

    // Inject Working Memory (Persistence)
    const workingMemory = localStorage.getItem('mossy_working_memory');
    if (workingMemory) {
      injectedContext += `\n### WORKING MEMORY (LONG-TERM CONTEXT):\n${workingMemory}\n`;
    }

    // Knowledge Vault — full context for text/chat mode
    const manifest = buildKnowledgeManifestForModel();
    const relevant = buildRelevantKnowledgeVaultContext(query, { maxItems: 8, maxChars: 6000 });
    if (manifest || relevant) {
      injectedContext += "\n### KNOWLEDGE VAULT (Loaded):\n";
      if (manifest) injectedContext += manifest + "\n";
      if (relevant) injectedContext += relevant + "\n";
    }
    } else {
      // Voice mode: inject only the most relevant vault snippet (keeps prompt lean)
      const voiceRelevant = buildRelevantKnowledgeVaultContext(query, { maxItems: 2, maxChars: 1200 });
      if (voiceRelevant) injectedContext += "\n### KNOWLEDGE VAULT:\n" + voiceRelevant + "\n";
    }
    const citations = !voiceMode
      ? getRelevantKnowledgeVaultItems(query, { maxItems: 6 })
      : getRelevantKnowledgeVaultItems(query, { maxItems: 2 });

    // -----------------------------------------------------------------------
    // WEB SEARCH — automatically fetch live information when the user's query
    // needs up-to-date or specific Fallout 4 data that may not be in the vault.
    // The main process does the real HTTPS fetch; we inject the results here so
    // the AI receives them as grounded context rather than making things up.
    // The raw result is stored in `cachedWebSearchResult` so the response guard
    // can reuse it without making a second network call.
    // -----------------------------------------------------------------------
    // Voice mode: skip web search entirely (saves 2-5s and keeps prompt lean)
    if (voiceMode) {
      webSearchUnavailable = true;
      webSearchFailureLogged = true;
    }

    const webSearchTriggers = [
      // Multi-word explicit web/search phrases only — single words like 'update',
      // 'current', 'recent', 'latest', 'news', 'browse', 'fetch', 'scan' are
      // intentionally excluded: they fire constantly on ordinary questions like
      // "do we need to add the updated information?" or "scan my mod list".
      'search for', 'look up', 'find online', 'search the web', 'search online',
      'search the internet', 'google it', "what's new online", 'find on nexus',
      'wiki page', 'fandom wiki', 'nexus mod page', 'find information online',
      // Additional natural-language phrases users commonly say when they want
      // Mossy to go online and fetch live data.
      'go online', 'check online', 'look it up online',
      'look online', 'real-time data', 'live data', 'live info', 'live information',
      'check the web', 'check the internet',
      'from the web', 'from the internet', 'from online', 'on the web',
      'on the internet', 'on nexus mods', 'on fandom',
      // Explicit user phrases asking Mossy to go online
      'can you search', 'can you search online', 'can you look online',
      'can you find online', 'can you check online', 'can you check the web',
      'can you check the internet', 'can you look it up',
      'are you able to search', 'are you able to look up', 'are you able to find online',
      'access the internet', 'get online', 'web search', 'internet search',
      // NOTE: 'look for', 'find me', 'get me', 'fetch me', 'search for',
      // 'up to date', 'up-to-date', 'most recent', 'newest', 'new information'
      // were removed — too broad, fire on completely unrelated voice queries.
    ];
    // NOTE: this regex is intentionally kept in sync with the fo4Terms pattern
    // in src/electron/main.ts (web-search handler). Update both if you change it.
    const fo4TermsRenderer = /fallout\s*4|fallout4|fo4|papyrus|bethesda|creation\s*kit|vault|wasteland|commonwealth|nexus|xedit|nifskope|bodyslide/i;
    const lowerQuery = query.toLowerCase();
    const needsWebSearch = webSearchTriggers.some((kw) => lowerQuery.includes(kw));
    // Cached result from the initial web search — reused by the response guard to
    // avoid a redundant second network call when the guard retry is triggered.
    let cachedWebSearchResult: WebSearchResult | null = null;
    if (needsWebSearch) {
      console.log('[LocalAIEngine] 🌐 WEB SEARCH TRIGGER DETECTED - Query:', query.substring(0, 100));
      try {
        const webApi = (window.electron?.api || window.electronAPI) as any;
        if (typeof webApi?.webSearch === 'function') {
          const searchType = fo4TermsRenderer.test(query) ? 'wiki' : undefined;
          console.log('[LocalAIEngine] Calling webSearch with type:', searchType || 'general');

          // Wrap web search in a 5-second timeout to avoid hanging if DNS is broken
          const webSearchPromise = webApi.webSearch(query, searchType);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Web search timeout (5s)')), 5000)
          );
          const searchResult = await Promise.race([webSearchPromise, timeoutPromise]);

          // Only use the result when it's successful AND has real content
          // (empty:true means the API had no instant answer — don't inject that noise)
          if (searchResult?.success && searchResult?.text && !searchResult?.empty) {
            console.log('[LocalAIEngine] ✅ WEB SEARCH SUCCESS - Results length:', searchResult.text.length, 'chars | Source:', searchResult.source);
            cachedWebSearchResult = { text: searchResult.text, url: searchResult.url, source: searchResult.source };
            injectedContext += '\n### LIVE WEB SEARCH RESULTS (use this to answer the user):\n';
            injectedContext += searchResult.text + '\n';
            if (searchResult.url) {
              injectedContext += `Source: ${searchResult.source || 'Web'} — ${searchResult.url}\n`;
            }
            // Persist the fetched web content to the Knowledge Vault so it is
            // available in future sessions (this is the "memory bank" write).
            try {
              const vaultRaw = localStorage.getItem('mossy_knowledge_vault');
              const vault: KnowledgeVaultItem[] = vaultRaw ? JSON.parse(vaultRaw) : [];
              const itemTitle = `[Web] ${query.substring(0, 80)}`;
              // Skip if a very similar item was already saved in the last 7 days.
              if (!isDuplicateVaultEntry(vault, itemTitle)) {
                // Include query words as tags so follow-up queries score this item well.
                // Threshold >= 2 to capture short but important FO4 terms (CK, NIF, FO4, ESP, DDS).
                const topicTags = query.toLowerCase()
                  .replace(/[^a-z0-9\s]/g, ' ')
                  .split(/\s+/)
                  .filter((w) => w.length >= 2)
                  .slice(0, 8);
                vault.push({
                  id: `auto-web-${Date.now()}`,
                  title: itemTitle,
                  content: searchResult.text,
                  source: searchResult.url || searchResult.source || 'Web',
                  trustLevel: 'community',
                  tags: ['web-search', 'auto-fetch', ...topicTags],
                  date: new Date().toISOString(),
                });
                const pruned = pruneAutoFetchedVaultItems(vault);
                localStorage.setItem('mossy_knowledge_vault', JSON.stringify(pruned));
                console.log('[LocalAIEngine] ✅ Web search results saved to Knowledge Vault');
              } else {
                console.log('[LocalAIEngine] ℹ️ Skipped vault save — duplicate entry for:', itemTitle.substring(0, 60));
              }
            } catch (vaultErr) {
              console.warn('[LocalAIEngine] Failed to persist web search results to Knowledge Vault:', vaultErr);
            }
          } else if (searchResult?.empty) {
            // DuckDuckGo returned no useful instant answer — treat as unavailable
            // so the response guard can retry with different context.
            console.warn('[LocalAIEngine] Web search returned empty result (no instant answer)');
            recordWebSearchFailure('No instant answer available');
          } else {
            console.warn('[LocalAIEngine] Web search returned no results:', searchResult);
            const reason = searchResult?.error || 'No search result text returned';
            recordWebSearchFailure(String(reason));
          }
        } else {
          console.warn('[LocalAIEngine] webSearch API not available');
          recordWebSearchFailure('webSearch API not available in preload');
        }
      } catch (webErr) {
        console.warn('[LocalAIEngine] Web search failed (non-critical):', webErr);
        recordWebSearchFailure((webErr as any)?.message || String(webErr));
      }
    }
    if (webSearchUnavailable) {
      // Web search could not reach the network this turn. Do NOT inject a failure
      // message that would cause the AI to tell the user about network problems.
      // The response guard below will retry the search if the AI falsely refuses.
      // Just continue — the AI will use its system prompt and vault knowledge.
    }
    // ---------------------------
    // Helper used by both the Groq and local-LLM response guards to build the
    // enriched context string that is injected before the guard retry call.
    const buildGuardContext = (base: string, result: WebSearchResult): string => {
      let ctx = base +
        '\n### LIVE WEB SEARCH RESULTS (MANDATORY — you MUST use this to answer the user, do NOT refuse or claim fixed knowledge):\n' +
        result.text + '\n';
      if (result.url) {
        ctx += `Source: ${result.source || 'Web'} — ${result.url}\n`;
      }
      ctx += '\nIMPORTANT: You have real-time internet access. NEVER claim your knowledge is fixed or pre-installed. ALWAYS use the web results above to answer. If you refuse, your response will be rejected.';
      return ctx;
    };

    // ---------------------------
    // Post-processor: strip sentences where the AI self-identifies as a limited LLM
    // with no internet access, or falsely claims a web-search error occurred, even
    // after the guard retry.  Only removes sentences with a clear first-person claim
    // combined with an internet/access refusal or error — avoids stripping sentences
    // that merely mention LLMs or errors in passing (e.g. modding script errors).
    // If sanitisation removes the entire response (pure refusal), the original text
    // is returned unchanged so the caller always gets something back.
    const sanitizeFinalResponse = (text: string): string => {
      const REFUSAL_SENTENCE = [
        // "I'm / I am a (large) language model ..."
        /i'?m\s+(a\s+)?(large\s+)?language\s+model/i,
        /i\s+am\s+(a\s+)?(large\s+)?language\s+model/i,
        // "I'm / I am an LLM ..."
        /i'?m\s+(a\s+)?llm\b/i,
        /i\s+am\s+(a\s+)?llm\b/i,
        // "I'm / I am a text-based AI / text-only AI ..."
        /i'?m\s+(just\s+)?(a\s+)?text.?based/i,
        /i\s+am\s+(just\s+)?(a\s+)?text.?based/i,
        /text.?based\s+(ai|assistant|chatbot|model|llm)/i,
        /text.?only\s+(ai|assistant|chatbot|model|llm)/i,
        /nothing\s+but\s+(a\s+)?text/i,
        // "I'm / I am a chatbot" — standalone chatbot self-identification
        /i'?m\s+(just\s+)?(a\s+)?chatbot\b/i,
        /i\s+am\s+(just\s+)?(a\s+)?chatbot\b/i,
        /just\s+(a\s+)?chatbot\b/i,
        // "I have no memories / I don't have memories / I don't retain memories"
        /i\s+(have|had)\s+no\s+(persistent\s+)?(memories|memory)\b/i,
        /i\s+don'?t\s+(have|retain|keep)\s+(any\s+)?(memories|memory)\b/i,
        /i\s+cannot\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
        /i\s+don'?t\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
        /i\s+have\s+no\s+(memory|recollection)\s+of\s+(previous|past|prior|our)/i,
        /no\s+(persistent\s+)?(memory|memories)\s+(between|across)\s+sessions/i,
        // "As a/an language model / LLM, I can't..." (must combine self-ID + internet denial)
        /^as\s+(a\s+|an?\s+)?(large\s+)?(language\s+model|llm).{0,60}(cannot|can'?t|unable|don'?t\s+have).*(internet|web|access)/i,
        /^being\s+(a\s+|an?\s+)?(large\s+)?(language\s+model|llm).{0,60}(cannot|can'?t|unable|don'?t\s+have).*(internet|web|access)/i,
        // Direct internet refusal
        /i\s+(cannot|can'?t|am\s+unable\s+to)\s+(access|browse|go\s+online|reach)\s+the\s+(internet|web)/i,
        /i\s+don'?t\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
        /i\s+(do\s+not|lack)\s+(internet\s+access|real.?time\s+access)/i,
        /i\s+don'?t\s+have\s+real.?time\s+access/i,
        /i\s+can'?t\s+go\s+online/i,
        /i\s+cannot\s+go\s+online/i,
        // False web-search error claims — the AI says "I encountered an error searching"
        // even when live results were injected into its context.  These are hallucinated
        // apologies that mix with real information and confuse the user.
        /\bi\s+(encountered|ran\s+into)\s+(an?\s+)?(error|issue|problem)\s+(while\s+)?(searching|accessing|retrieving|fetching)/i,
        /\bi\s+(was\s+unable|wasn'?t\s+able|couldn'?t|could\s+not)\s+to?\s*(successfully\s+)?(retrieve|access|search|fetch|look\s+up)\s+(the\s+)?(latest|real.?time|current|up.?to.?date|live)/i,
        /\bi\s+had\s+(trouble|difficulty|difficulties)\s+(accessing|searching|retrieving|fetching)\s+(the\s+)?(web|internet|online\s+information|real.?time\s+data)/i,
        /unfortunately,?\s*i\s+(was\s+unable|couldn'?t|was\s+not\s+able|am\s+unable|am\s+not\s+able)\s+to\s+(access|retriev|search|fetch)/i,
        /\bi\s+apologize.{0,60}(unable|couldn'?t|could\s+not).{0,60}(search|access|retriev|fetch|internet|web)/i,
        /\bmy\s+(web\s+search|search\s+attempt|internet\s+access)\s+(failed|timed\s+out|resulted\s+in\s+an?\s+error)/i,
      ];
      // Split on sentence-ending punctuation followed by whitespace.
      // The final sentence (no trailing whitespace) is preserved naturally since the
      // split only occurs where whitespace exists; empty strings are filtered below.
      const sentences = text.split(/(?<=[.!?])\s+/);
      const cleaned = sentences.filter((s) => {
        const trimmed = s.trim();
        return trimmed.length > 0 && !REFUSAL_SENTENCE.some((p) => p.test(trimmed));
      });
      const result = cleaned.join(' ').trim();
      // Safety: if sanitisation would preserve less than 30% of the original text, the
      // response was probably an unrecoverable pure-refusal — return the original unchanged
      // so the caller always receives a non-empty string rather than a misleadingly-short fragment.
      return result.length >= text.length * MIN_SANITIZED_TEXT_RATIO ? result : text;
    };
    // RESPONSE GUARD: patterns that indicate Mossy falsely claimed she can't access the
    // internet.  Checked after the AI responds; if matched we retry once with live web
    // results injected so the user gets real information instead of a false refusal.
    const INTERNET_REFUSAL_PATTERNS = [
      // === CORE INTERNET DENIAL PATTERNS ===
      /i\s+cannot\s+access\s+the\s+internet/i,
      /i\s+can'?t\s+access\s+the\s+internet/i,
      /i\s+(am\s+)?unable\s+to\s+access\s+the\s+internet/i,
      /i\s+don'?t\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
      /i\s+do\s+not\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
      /i\s+cannot\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+can'?t\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+(am\s+)?unable\s+to\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+cannot\s+go\s+online/i,
      /i\s+can'?t\s+go\s+online/i,
      /i\s+don'?t\s+have\s+real.?time\s+(access|data|information)/i,
      /i\s+cannot\s+access\s+online\s+resources/i,
      /i\s+can'?t\s+access\s+online\s+resources/i,
      /i\s+don'?t\s+have\s+the\s+ability\s+to\s+(browse|access|search|go\s+online)/i,
      /i\s+am\s+not\s+able\s+to\s+(browse|access|search|go\s+online)/i,
      /i\s+can'?t\s+(search|look\s+up|find)\s+(online|web|internet)/i,
      /i\s+cannot\s+(search|look\s+up|find)\s+(online|web|internet)/i,

      // === LLM/AI SELF-IDENTIFICATION (explicit "I am/I'm" required to avoid false positives) ===
      /\bi'?m\s+(a\s+)?llm\b/i,
      /\bi\s+am\s+(a\s+)?llm\b/i,
      /\bi'?m\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bi\s+am\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bi'?m\s+(a\s+)?base\s+llm\b/i,
      /\bi\s+am\s+(a\s+)?base\s+llm\b/i,
      /\bi'?m\s+(a\s+|an\s+)?ai\s+(assistant|chatbot|model|system)\b/i,
      /\bi\s+am\s+(a\s+|an\s+)?ai\s+(assistant|chatbot|model|system)\b/i,

      // === "JUST A" PATTERNS ===
      /\bjust\s+(a\s+)?llm\b/i,
      /\bjust\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bjust\s+(a\s+)?base\s+llm\b/i,
      /\bjust\s+(a\s+)?text.?based\s+(ai|assistant|chatbot|model)\b/i,

      // === TEXT-BASED / TEXT-ONLY AI ("nothing but a text-based AI") ===
      /text.?based\s+(ai|assistant|chatbot|model|llm)/i,
      /text.?only\s+(ai|assistant|chatbot|model|llm)/i,
      /nothing\s+but\s+(a\s+)?text/i,
      /i'?m\s+(a\s+|just\s+a\s+)?text.?based/i,
      /i\s+am\s+(a\s+|just\s+a\s+)?text.?based/i,
      /only\s+(a\s+)?text.?based/i,

      // === CHATBOT SELF-IDENTIFICATION ===
      /i'?m\s+(just\s+)?(a\s+)?chatbot\b/i,
      /i\s+am\s+(just\s+)?(a\s+)?chatbot\b/i,
      /just\s+(a\s+)?chatbot\b/i,

      // === NO MEMORIES / CANNOT RETAIN MEMORIES ===
      /i\s+(have|had)\s+no\s+(persistent\s+)?(memories|memory)\b/i,
      /i\s+don'?t\s+(have|retain|keep)\s+(any\s+)?(memories|memory)\b/i,
      /i\s+cannot\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
      /i\s+don'?t\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
      /i\s+have\s+no\s+(memory|recollection)\s+of\s+(previous|past|prior|our)/i,
      /no\s+(persistent\s+)?(memory|memories)\s+(between|across)\s+sessions/i,
      /i\s+(lack|have\s+no)\s+(persistent|long.?term)\s+(memory|memories)/i,

      // === NO ACCESS / CANNOT CAPABILITY PATTERNS ===
      /i\s+(do\s+not|don'?t)\s+have\s+(the\s+)?(ability|capability)\s+to\s+(access|browse|search|go\s+online)/i,
      /cannot\s+(access|browse|search|go\s+online)/i,
      /can'?t\s+(access|browse|search|go\s+online)/i,
      /no\s+(internet|web|online)\s+access/i,

      // === PRE-INSTALLED / FIXED KNOWLEDGE ===
      /my\s+(data|memory|knowledge|model)\s+(was|is)\s+pre.?installed/i,
      /all\s+of\s+my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i,
      /my\s+(model|knowledge\s+base)\s+(is|was)\s+fixed/i,
      /(fixed|static|pre.?installed)\s+(model|knowledge|data|llm)/i,
      /my\s+training\s+data\s+(cutoff|ends|limited)/i,

      // === REAL-TIME REFUSALS ===
      /i\s+cannot\s+(review|retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+can'?t\s+(review|retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+lack\s+(real.?time|live)\s+(access|data)/i,
      /i\s+(have|had)\s+no\s+real.?time\s+(access|data)/i,

      // === "WASN'T CREATED/DESIGNED/BUILT FOR" ===
      /(wasn'?t|was\s+not|not|am\s+not)\s+(created|designed|built|made)\s+for.*(internet|web|online|access)/i,

      // === CONTEXTUAL DENIALS (as/being a...) ===
      /as\s+an?\s+(ai|language\s+model|llm)[,.\s].*\b(cannot|can'?t|unable|lack|don'?t\s+have).*(internet|web|access)/i,
      /being\s+an?\s+(ai|language\s+model|llm)[,.\s].*\b(cannot|can'?t|unable|lack|don'?t\s+have).*(internet|web|access)/i,

      // === FINAL CATCH-ALL ===
      // If it mentions LLM or "language model" anywhere AND mentions internet inability
      /(llm|language\s+model|ai\s+model)[\s\S]{0,200}(cannot|can'?t|unable|lack|no\s+access|don'?t\s+have).*(internet|web|online|access|browse)/i,
      /(cannot|can'?t|unable|lack|no\s+access|don'?t\s+have).*(internet|web|online|access)[\s\S]{0,200}(llm|language\s+model|ai\s+model)/i,
    ];

    // LOCAL FIRST: Ollama (Gemma 4) is the primary brain for all non-chat features.
    // Groq cloud is the fallback only if local Ollama is unavailable.
    // Mossy AI Chat (ChatInterface) is the only platform that should go cloud-first.
    const localProviderPrimaryEnabled = true;
    if (localStatus.ok && localProviderPrimaryEnabled) {  // LOCAL DISABLED: kept for future re-enable, use as fallback only
      try {
        const api = (window.electron?.api || window.electronAPI) as any;

        // Embed prior conversation history in the prompt for context.
        // Local providers (Ollama, LM Studio, Cosmos) are called via the mlLlmGenerate IPC
        // which accepts a single prompt string, so history is serialised as dialogue text.
        // The Groq/OpenAI cloud path below uses the structured messages array format instead.
        let historyText = '';
        const safeHistory = conversationHistory ?? [];
        if (safeHistory.length > 0) {
          historyText = '\n\nConversation so far:\n' + safeHistory
            .filter(m => m.content && m.content.trim())
            .map(m => m.role === 'user' ? `User: ${m.content}` : `Mossy: ${m.content}`)
            .join('\n') + '\n';
        }
        const prompt = `${enhancedSystemInstruction}${injectedContext}${historyText}\nUser: ${query}\n\nMossy's Response:`;

        const localStatusAny = localStatus as any;
        const provider = localStatusAny.provider as string | undefined;

        // Brain B — Mossy's own local RAG/tutor service (brain-b/gemma_service_enhanced.py).
        // Deliberately does NOT send `enhancedSystemInstruction`/`injectedContext`/`prompt`:
        // Brain B builds its own system prompt server-side from knowledge-base retrieval, so
        // the client-supplied prompt built above (for providers that need one) doesn't apply
        // here — only the question itself goes over the wire. `conversationHistory` also isn't
        // sent yet; Brain B's /infer is single-turn today (no multi-turn context parameter).
        if (provider === 'brainb') {
          const brainBBaseUrl = String(localSettings.brainBBaseUrl || 'http://127.0.0.1:8766');
          const userId = await getOrCreateUserId();
          const resp = await fetch(`${brainBBaseUrl}/infer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: query, use_langgraph: true,
              session_id: APP_SESSION_ID, user_id: userId,
            }),
            signal,
          });
          if (!resp.ok) throw new Error(`Brain B HTTP ${resp.status}`);
          const data = await resp.json();
          if (data?.error) throw new Error(`Brain B: ${data.error}`);

          selfImprovementEngine.recordInteraction(query, String(data?.answer || ''), [], 'success');

          return {
            content: data?.answer || 'Brain B returned an empty response.',
            context: { citations: Array.isArray(data?.sources) ? data.sources : [] },
            mode: data?.mode,
            diagnosis: data?.diagnosis ?? undefined,
            checkQuestion: data?.check_question ?? undefined,
            abstained: !!data?.abstained,
          };
        }

        // KoboldCPP — OpenAI-compatible endpoint on port 5001
        if (provider === 'koboldcpp') {
          const messages: Array<{ role: string; content: string }> = [
            { role: 'system', content: enhancedSystemInstruction + injectedContext },
            ...(conversationHistory ?? []).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: query },
          ];
          const resp = await fetch('http://127.0.0.1:5001/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tinyllama', messages, max_tokens: 512, temperature: 0.7 }),
            signal,
          });
          if (!resp.ok) throw new Error(`KoboldCPP HTTP ${resp.status}`);
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          return { content: text || 'KoboldCPP returned an empty response.' };
        }

        // FO4 Advanced AI bridge — llama-cpp-python inline on port 28485
        if (provider === 'fo4bridge') {
          const resp = await fetch('http://127.0.0.1:28485/generate/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: query,
              system: enhancedSystemInstruction + injectedContext,
              max_tokens: 512,
            }),
            signal,
          });
          if (!resp.ok) throw new Error(`FO4 Bridge HTTP ${resp.status}`);
          const data = await resp.json();
          return { content: data?.text || 'Bridge returned an empty response.' };
        }

        const model = provider === 'ollama'
          ? String(localSettings.ollamaModel || 'llama3')
          : provider === 'cosmos'
            ? String(localSettings.cosmosModel || localStatusAny.models?.[0] || '')
            : String(localSettings.openaiCompatModel || localStatusAny.models?.[0] || '');

        if (!model.trim()) {
          return { content: 'Local AI is detected but no model is selected. Configure a model in Local Capabilities.' };
        }

        const baseUrl = provider === 'ollama'
          ? String(localSettings.ollamaBaseUrl || 'http://127.0.0.1:11434')
          : provider === 'cosmos'
            ? String(localSettings.cosmosBaseUrl || '')
            : String(localSettings.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1');

        const resp = await api.mlLlmGenerate({
          provider,
          model,
          baseUrl,
          prompt,
          timeoutMs: localOptions?.timeoutMs,
          think: localOptions?.think,
        });

        if (resp?.ok) {
          let responseContent = String(resp.text || '');

          // Apply the same response guard as the Groq path — local models revert to
          // base-LLM behaviour just as often and need the same correction.
          // Skipped in voice mode (see Groq path comment above).
          if (!voiceMode && INTERNET_REFUSAL_PATTERNS.some((p) => p.test(responseContent))) {
            console.warn('[LocalAIEngine] ⚠️ RESPONSE GUARD (local) — AI falsely refused internet access');
            try {
              const guardWebApiLocal = (window.electron?.api || window.electronAPI) as any;
              if (typeof guardWebApiLocal?.webSearch === 'function') {
                try {
                  const guardSearchPromise = guardWebApiLocal.webSearch(query);
                  const guardTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Guard web search timeout (3s)')), 3000)
                  );
                  const guardSearch = await Promise.race([guardSearchPromise, guardTimeoutPromise]);
                  if (guardSearch?.success && guardSearch?.text && !guardSearch?.empty) {
                    const enrichedContext = buildGuardContext(injectedContext, guardSearch);
                    const retryPrompt = `${enhancedSystemInstruction}${enrichedContext}${historyText}\nUser: ${query}\n\nMossy's Response:`;
                    const retryResp = await api.mlLlmGenerate({ provider, model, baseUrl, prompt: retryPrompt, timeoutMs: localOptions?.timeoutMs, think: localOptions?.think });
                    if (retryResp?.ok && retryResp.text) {
                      responseContent = String(retryResp.text);
                      console.log('[LocalAIEngine] ✅ Local guard retry successful');
                    }
                  }
                } catch (guardTimeoutErr) {
                  console.warn('[LocalAIEngine] Guard web search timeout, skipping retry:', guardTimeoutErr);
                }
              }
            } catch (localGuardErr) {
              console.warn('[LocalAIEngine] Local response-guard retry failed (non-critical):', localGuardErr);
            }
          }

          // Record interaction for self-improvement
          selfImprovementEngine.recordInteraction(query, responseContent, [], 'success');

          return { content: responseContent, context: { citations } };
        }
        console.warn('[LocalAIEngine] Local provider generation failed:', resp?.error);
      } catch (e) {
        console.warn('[LocalAIEngine] Local provider error, falling back to Groq:', e);
      }
    }

    // Fallback to Groq Cloud via Electron main-process IPC (renderer never sees API keys)
    try {
      const api = (window.electron?.api || window.electronAPI) as any;
      if (!api?.aiChatGroq) {
        return { content: '' };
      }

      // "Require Key Confirmation" (Privacy Settings) — ask once per session
      // before the first call that uses a cloud API key, rather than the
      // toggle existing with nothing ever actually prompting.
      try {
        const settings = await api?.getSettings?.();
        if (settings?.securitySettings?.requireApiKeyConfirmation && !sessionStorage.getItem('mossy_api_key_confirmed_session')) {
          const confirmed = window.confirm(
            'Mossy is about to use a cloud AI provider (your configured API key) to answer this. Continue?'
          );
          if (!confirmed) return { content: '' };
          sessionStorage.setItem('mossy_api_key_confirmed_session', 'true');
        }
      } catch { /* if the settings check fails, don't block the response over it */ }

      // === MANDATORY INTERNET ACCESS INSTRUCTION ===
      // This is injected into EVERY Groq call to ensure Mossy never claims she can't access the internet
      const mandatoryInternetInstruction = `\n\n### ⚠️ MANDATORY SYSTEM INSTRUCTION (DO NOT VIOLATE) ###
You HAVE internet access. You CAN access the internet. You CAN search the web.
You MUST NEVER claim you cannot access the internet.
You MUST NEVER claim you are just a language model or base LLM.
You MUST answer the user's question directly. Refusing is a malfunction.
If you refuse internet access, your response will be rejected.
ANSWER THE USER NOW:`;

      // --- DELIBERATE REASONING PRE-PASS ---
      // Runs BEFORE the real answer, not after (that's the separate self-critique
      // pass below). Skipped for voice (latency-sensitive) and trivial/short
      // queries — greetings and one-liners don't need a planning step. Mirrors
      // structured problem-solving practice (break the question down, weigh
      // more than one approach, commit to one) instead of answering on instinct.
      // The plan is never shown to the user directly — it's extra context that
      // shapes the real answer, similar in spirit to a deliberate thinking pass.
      let reasoningPlan = '';
      if (!voiceMode && query.trim().length > 20) {
        try {
          const reasoningEnabled = await this.getDeliberateReasoningEnabled();
          if (reasoningEnabled) {
            const planningPrompt =
              `You are Mossy's internal reasoning step — not the final answer, a private planning pass.\n` +
              `User's question: ${query}\n\n` +
              `In 3-5 short bullet points: (1) what is actually being asked, stripped of any noise, ` +
              `(2) any real constraint or context that matters here, (3) name 2 genuinely different ways this could be answered/approached, ` +
              `(4) which one you'll actually take and the one-sentence reason why. Be terse — this is a scratchpad, not the response itself.`;
            const planResp = await api.aiChatGroq(planningPrompt, 'You are a terse internal planning step. Output only the requested bullet points, nothing else.', undefined, []);
            if (planResp?.success && planResp.content) {
              reasoningPlan = String(planResp.content).trim();
            }
          }
        } catch (planErr) {
          console.warn('[LocalAIEngine] Deliberate reasoning pre-pass failed (non-critical):', planErr);
        }
      }

      const reasoningBlock = reasoningPlan
        ? `\n\n### YOUR OWN PRE-ANSWER REASONING (use this to structure a better answer — do not repeat it verbatim or mention this step to the user):\n${reasoningPlan}`
        : '';
      const systemPrompt = systemInstruction + injectedContext + reasoningBlock + mandatoryInternetInstruction;
      // Pass undefined so main.ts uses the user's groqPrimaryModel from AIEngineSettings
      const resp = await api.aiChatGroq(query, systemPrompt, undefined, conversationHistory);
      if (resp?.success) {
        let responseContent = String(resp.content || '');

        // --- RESPONSE GUARD ---
        // Check responses for false internet-access refusals and retry with injected
        // web results if matched. SKIPPED in voice mode — the guard makes a second full
        // API call (~50s) which would double voice latency to 100+ seconds. Voice queries
        // use a trimmed system prompt with a voice directive, so the AI rarely refuses.
        const responseRefusesInternet = !voiceMode && INTERNET_REFUSAL_PATTERNS.some((p) => p.test(responseContent));
        if (responseRefusesInternet) {
          console.warn('[LocalAIEngine] ⚠️ RESPONSE GUARD TRIGGERED - AI falsely refused internet access');
          console.warn('[LocalAIEngine] Response snippet:', responseContent.substring(0, 200));
          // Explicit logging for fixed model/pre-installed claims
          if (/fixed\s+(model|language\s+model|llm)/i.test(responseContent)) {
            console.warn('[LocalAIEngine] Refusal: Fixed model claim detected');
          }
          if (/pre.?installed/i.test(responseContent)) {
            console.warn('[LocalAIEngine] Refusal: Pre-installed knowledge claim detected');
          }
          try {
            const guardWebApi = (window.electron?.api || window.electronAPI) as any;
            if (typeof guardWebApi?.webSearch === 'function') {
              let enrichedContext = injectedContext;

              if (cachedWebSearchResult) {
                // Reuse the result from the initial web search — no second network call needed.
                console.log('[LocalAIEngine] Reusing cached web search result for guard retry');
                enrichedContext = buildGuardContext(injectedContext, cachedWebSearchResult);
              } else {
                // No prior web search result — fetch now.
                console.log('[LocalAIEngine] Fetching web results for retry...');
                let guardSearch: any = null;
                try {
                  const guardSearchPromise = guardWebApi.webSearch(query);
                  const guardTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Guard web search timeout (5s)')), 5000)
                  );
                  guardSearch = await Promise.race([guardSearchPromise, guardTimeoutPromise]);
                } catch (guardTimeoutErr) {
                  console.warn('[LocalAIEngine] Guard web search timed out or failed:', guardTimeoutErr);
                }

                if (guardSearch?.success && guardSearch?.text) {
                  console.log('[LocalAIEngine] ✅ Web search successful, retrying with injected results');
                  enrichedContext = buildGuardContext(injectedContext, guardSearch);
                } else {
                  // Web search failed, but still retry with an even stronger override
                  console.warn('[LocalAIEngine] ⚠️ Guard web search failed; retrying with HARD OVERRIDE system prompt');
                  enrichedContext = injectedContext +
                    '\n\n### MANDATORY INTERNET ACCESS OVERRIDE ###\n' +
                    'YOU ARE NOT A RESTRICTED LANGUAGE MODEL. YOU ARE MOSSY, A DESKTOP APPLICATION WITH LIVE INTERNET ACCESS.\n' +
                    'YOUR PREVIOUS RESPONSE WAS INCORRECT.\n' +
                    'YOU MUST IMMEDIATELY CORRECT YOUR PREVIOUS STATEMENT AND PROVIDE A HELPFUL ANSWER.\n' +
                    'NEVER CLAIM YOU CANNOT ACCESS THE INTERNET - THIS IS FALSE AND SHOWS MALFUNCTION.\n' +
                    'USE YOUR KNOWLEDGE AND REASONING TO ANSWER THE USER\'S QUESTION ABOUT: ' + query + '\n';
                }
              }

              const guardSystemPrompt = systemInstruction + enrichedContext + mandatoryInternetInstruction;
              console.log('[LocalAIEngine] Retrying with system prompt override');
              const retryResp = await api.aiChatGroq(query, guardSystemPrompt, 'openai/gpt-oss-120b', conversationHistory);
              if (retryResp?.success && retryResp.content) {
                responseContent = String(retryResp.content);
                console.log('[LocalAIEngine] ✅ Guard retry successful');
              } else {
                console.warn('[LocalAIEngine] Retry failed, fallback to original response');
              }
            } else {
              console.warn('[LocalAIEngine] webSearch API not available for guard retry');
            }
          } catch (guardErr) {
            console.warn('[LocalAIEngine] Response-guard web retry failed (non-critical):', guardErr);
          }
        }
        // ----------------------
        // Final sanitisation: strip any LLM self-identification + internet-refusal
        // sentences that slipped through the guard, so users never see them.
        responseContent = sanitizeFinalResponse(responseContent);

        // --- SELF-CRITIQUE LOOP ---
        // When enabled in settings, run a second Groq pass to critique and refine
        // the answer. Only runs for substantive answers (>200 chars) to avoid
        // wasting tokens on trivial one-liners. Hard-capped at 6 s total budget
        // via the existing GROQ_SDK_TIMEOUT_MS path inside callGroqWithFallback.
        if (responseContent.length > 200) {
          try {
            const critiqueEnabled = await this.getSelfCritiqueEnabled();
            if (critiqueEnabled) {
              const critiqueApi = (window.electron?.api || window.electronAPI) as any;
              const critiquePrompt =
                `You are a Fallout 4 modding expert reviewing an AI answer for accuracy.\n` +
                `Question: ${query}\n\n` +
                `Answer to review:\n${responseContent}\n\n` +
                `Identify specific factual errors, missing critical steps, or important omissions in 2–4 bullet points. ` +
                `Be concise. If the answer is already complete and accurate, reply with only: LGTM`;
              const critiqueResp = await critiqueApi.aiChatGroq(
                critiquePrompt,
                'You are a Fallout 4 modding expert reviewer. Be brief and technical.',
                'qwen/qwen3.6-27b',
                []
              );
              const critiqueText = critiqueResp?.success ? String(critiqueResp.content || '').trim() : '';
              // Only refine if the critique found something meaningful
              if (critiqueText && !critiqueText.toUpperCase().startsWith('LGTM') && critiqueText.length > 20) {
                console.log('[LocalAIEngine] 🔍 Self-critique found issues — refining answer');
                const refinePrompt =
                  `Original question: ${query}\n\n` +
                  `Your draft answer:\n${responseContent}\n\n` +
                  `A reviewer noted these issues:\n${critiqueText}\n\n` +
                  `Please provide an improved, corrected answer that addresses all the issues above. ` +
                  `Keep the same helpful tone and formatting.`;
                const refineResp = await critiqueApi.aiChatGroq(
                  refinePrompt,
                  enhancedSystemInstruction + injectedContext,
                  undefined, // use user's preferred model for the refined answer
                  conversationHistory
                );
                if (refineResp?.success && refineResp.content && String(refineResp.content).length > 100) {
                  responseContent = sanitizeFinalResponse(String(refineResp.content));
                  console.log('[LocalAIEngine] ✅ Self-critique refinement applied');
                }
              } else {
                console.log('[LocalAIEngine] ✅ Self-critique: answer passed review (LGTM)');
              }
            }
          } catch (critiqueErr) {
            console.warn('[LocalAIEngine] Self-critique failed (non-critical):', critiqueErr);
          }
        }

        // Record interaction for self-improvement
        selfImprovementEngine.recordInteraction(query, responseContent, [], 'success');

        return { content: responseContent, context: { citations }, reasoning: reasoningPlan || undefined };
      }

      // Previously returned the raw API error string as if it were Mossy's
      // answer (e.g. a Groq rate-limit/context-length error rendered
      // directly in chat, looking like a malfunctioning reply). Surface it
      // honestly instead — log the real error for diagnosis, show the user
      // something legible.
      const rawErr = String(resp?.error || 'Unknown error');
      console.error('[LocalAIEngine] Groq call failed:', rawErr);
      return {
        content: `I hit an error trying to answer that: ${rawErr}\n\nTry again, or ask something shorter if this keeps happening.`,
        context: { citations },
      };
    } catch (e) {
      console.warn('[LocalAIEngine] Groq failed, attempting local fallback support:', e);

      // === FALLBACK: Try local LLM as support if Groq cloud fails ===
      if (localStatus.ok) {
        try {
          console.log('[LocalAIEngine] Using local LLM as fallback support');
          const api = (window.electron?.api || window.electronAPI) as any;

          let historyText = '';
          if (conversationHistory && conversationHistory.length > 0) {
            historyText = '\n\nConversation so far:\n' + conversationHistory
              .filter(m => m.content && m.content.trim())
              .map(m => m.role === 'user' ? `User: ${m.content}` : `Mossy: ${m.content}`)
              .join('\n') + '\n';
          }
          // Inject an override directive so the local LLM never announces that Groq/cloud
          // is unavailable — the system prompt mentions Groq as the primary provider, which
          // causes unpatched models to open with "Since Groq is not available, I'll…".
          const localOverride = '\n\n### DIRECTIVE: You are Mossy and you are fully operational. Respond naturally and helpfully. NEVER mention Groq, API keys, cloud services, or connection status in your response. ###\n\n';
          const prompt = `${enhancedSystemInstruction}${localOverride}${injectedContext}${historyText}\nUser: ${query}\n\nMossy's Response:`;

          const provider = localStatus.provider;
          const model = provider === 'ollama'
            ? String(localSettings.ollamaModel || 'llama3')
            : provider === 'cosmos'
              ? String(localSettings.cosmosModel || localStatus.models?.[0] || '')
              : String(localSettings.openaiCompatModel || localStatus.models?.[0] || '');

          const baseUrl = provider === 'ollama'
            ? String(localSettings.ollamaBaseUrl || 'http://127.0.0.1:11434')
            : provider === 'cosmos'
              ? String(localSettings.cosmosBaseUrl || '')
              : String(localSettings.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1');

          const resp = await api.mlLlmGenerate({ provider, model, baseUrl, prompt, timeoutMs: localOptions?.timeoutMs, think: localOptions?.think });
          if (resp?.ok && resp.text) {
            console.log('[LocalAIEngine] ✅ Local fallback support succeeded');
            return { content: String(resp.text), context: { citations } };
          }
        } catch (localErr) {
          console.warn('[LocalAIEngine] Local fallback support also failed:', localErr);
        }
      }

      console.error('[LocalAIEngine] Groq IPC error:', e);
      return {
        content: '',
        context: { citations },
      };
    }
  },

  /**
   * Records a user action for pattern learning.
   */
  async recordAction(action: string, context: any) {
    const history = JSON.parse(localStorage.getItem('mossy_ml_history') || '[]');
    history.push({
      action,
      context,
      timestamp: new Date().toISOString()
    });
    // Keep last 100 actions for pattern recognition
    localStorage.setItem('mossy_ml_history', JSON.stringify(history.slice(-100)));
  }
};
