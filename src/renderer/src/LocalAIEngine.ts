/**
 * Local AI Engine Service
 * Connects Mossy to local AI backends like Ollama or Groq Cloud.
 */

import {
  buildKnowledgeManifestForModel,
  buildRelevantKnowledgeVaultContext,
  getRelevantKnowledgeVaultItems,
} from './knowledgeRetrieval';
import { selfImprovementEngine } from './SelfImprovementEngine';

export interface AIResponse {
  content: string;
  context?: any;
}

type LocalAiPreferred = 'auto' | 'cosmos' | 'ollama' | 'openai_compat' | 'off';

type LocalAiSettings = {
  localAiPreferredProvider?: LocalAiPreferred;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
  cosmosBaseUrl?: string;
  cosmosModel?: string;
};

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
    };
  },

  /**
   * Checks whether a local AI provider is available.
   * Uses the Electron main process to avoid CORS and to support configurable ports.
   */
  async getLocalProviderStatus(): Promise<
    | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'cosmos'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'openai_compat'; baseUrl: string; models: string[] }
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

      const pickAuto = () => {
        if (cosmosOk) return { ok: true as const, provider: 'cosmos' as const, baseUrl: caps.cosmos.baseUrl, models: caps.cosmos.models || [] };
        if (ollamaOk) return { ok: true as const, provider: 'ollama' as const, baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] };
        if (openaiOk) return { ok: true as const, provider: 'openai_compat' as const, baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] };
        return { ok: false as const, reason: 'No local provider detected.' };
      };

      if (preferred === 'off') return { ok: false, reason: 'Local AI disabled in settings.' };
      if (preferred === 'auto') return pickAuto();

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
   */
  async generateResponse(query: string, systemInstruction: string, conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>): Promise<AIResponse> {
    const localStatus = await this.getLocalProviderStatus();
    const localSettings = await this.getLocalAiSettings();
    
    // --- SELF-IMPROVEMENT: Include learning insights ---
    let enhancedSystemInstruction = systemInstruction;
    const learningInsights = selfImprovementEngine.getLearningInsights();
    if (learningInsights) {
      enhancedSystemInstruction += '\n\n### SELF-IMPROVEMENT INSIGHTS:\n' + learningInsights;
    }
    
    // --- KNOWLEDGE & PROCESS INJECTION ---
    let injectedContext = "";
    
    // Inject Process & Hardware Awareness
    const electronApiAny = (window as any).electron?.api;
    if (typeof electronApiAny?.getRunningProcesses === 'function') {
        try {
        const processes = await electronApiAny.getRunningProcesses();
            const blenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
            const detectedApps = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
            const systemProfileRaw = localStorage.getItem('mossy_system_profile');
            let userSettings: any = null;
            
            try {
                if (window.electronAPI?.getSettings) {
                    userSettings = await window.electronAPI.getSettings();
                }
            } catch (e) {
                console.error('[LocalAIEngine] Failed to get settings:', e);
            }

            if (processes.length > 0 || blenderLinked || detectedApps.length > 0 || systemProfileRaw || userSettings) {
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
                    injectedContext += `- [SYSTEM SCAN STATUS]: NOT PERFORMED. (Please run scan_hardware first)\n`;
                }

                if (userSettings) {
                    injectedContext += "- [DESKTOP APPLICATIONS - CONFIGURED]:\n";
                    if (userSettings.xeditPath) injectedContext += `  * xEdit: ${userSettings.xeditPath}\n`;
                    if (userSettings.nifSkopePath) injectedContext += `  * NifSkope: ${userSettings.nifSkopePath}\n`;
                    if (userSettings.creationKitPath) injectedContext += `  * Creation Kit: ${userSettings.creationKitPath}\n`;
                    if (userSettings.blenderPath) injectedContext += `  * Blender: ${userSettings.blenderPath}\n`;
                    if (userSettings.mo2Path) injectedContext += `  * Mod Organizer 2: ${userSettings.mo2Path}\n`;
                    if (userSettings.vortexPath) injectedContext += `  * Vortex: ${userSettings.vortexPath}\n`;
                }

                if (blenderLinked) injectedContext += "- [STATUS] Blender Neural Link: ACTIVE\n";
                
                if (detectedApps.length > 0) {
                    injectedContext += "- [AUTOMATICALLY DETECTED TOOLS]:\n";
                    detectedApps.forEach((a: any) => {
                        injectedContext += `  * ${a.name} (Path: ${a.path})\n`;
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

    // Knowledge Vault (DO NOT dump full DB; keep it relevant + compact)
    const manifest = buildKnowledgeManifestForModel();
    const relevant = buildRelevantKnowledgeVaultContext(query, { maxItems: 8, maxChars: 6000 });
    const citations = getRelevantKnowledgeVaultItems(query, { maxItems: 6 });
    if (manifest || relevant) {
      injectedContext += "\n### KNOWLEDGE VAULT (Loaded):\n";
      if (manifest) injectedContext += manifest + "\n";
      if (relevant) injectedContext += relevant + "\n";
    }

    // -----------------------------------------------------------------------
    // WEB SEARCH — automatically fetch live information when the user's query
    // needs up-to-date or specific Fallout 4 data that may not be in the vault.
    // The main process does the real HTTPS fetch; we inject the results here so
    // the AI receives them as grounded context rather than making things up.
    // -----------------------------------------------------------------------
    const webSearchTriggers = [
      'search', 'look up', 'find online', 'search the web', 'search online',
      'search internet', 'browse', 'google', "what's new", 'recent', 'current',
      'latest', 'news', 'update', 'wiki', 'fandom', 'nexus', 'mod page',
      'find information', 'find info',
      // Additional natural-language phrases users commonly say when they want
      // Mossy to go online and fetch live data.
      'go online', 'online', 'internet', 'check online', 'look it up online',
      'look online', 'fetch', 'pull up', 'scan', 'scan for', 'real-time',
      'real time', 'realtime', 'live data', 'live info', 'live information',
      'check the web', 'check web', 'check internet', 'check the internet',
      'from the web', 'from the internet', 'from online', 'on the web',
      'on the internet', 'on nexus', 'on fandom',
      // Additional explicit triggers based on user feedback
      'can you search', 'can you look', 'can you find', 'can you check',
      'are you able to search', 'are you able to look up', 'are you able to find',
      'access the internet', 'get online', 'web search', 'internet search',
      'look for', 'search for', 'find me', 'get me', 'fetch me',
      'up to date', 'up-to-date', 'most recent', 'newest', 'new information',
    ];
    // NOTE: this regex is intentionally kept in sync with the fo4Terms pattern
    // in src/electron/main.ts (web-search handler). Update both if you change it.
    const fo4TermsRenderer = /fallout\s*4|fallout4|fo4|papyrus|bethesda|creation\s*kit|vault|wasteland|commonwealth|nexus|xedit|nifskope|bodyslide/i;
    const lowerQuery = query.toLowerCase();
    const needsWebSearch = webSearchTriggers.some((kw) => lowerQuery.includes(kw));
    if (needsWebSearch) {
      console.log('[LocalAIEngine] 🌐 Web search triggered for query:', query.substring(0, 100));
      try {
        const webApi = (window.electron?.api || window.electronAPI) as any;
        if (typeof webApi?.webSearch === 'function') {
          const searchType = fo4TermsRenderer.test(query) ? 'wiki' : undefined;
          console.log('[LocalAIEngine] Calling webSearch with type:', searchType || 'general');
          const searchResult = await webApi.webSearch(query, searchType);
          if (searchResult?.success && searchResult?.text) {
            console.log('[LocalAIEngine] ✅ Web search successful, injecting results');
            injectedContext += '\n### LIVE WEB SEARCH RESULTS (use this to answer the user):\n';
            injectedContext += searchResult.text + '\n';
            if (searchResult.url) {
              injectedContext += `Source: ${searchResult.source || 'Web'} — ${searchResult.url}\n`;
            }
          } else {
            console.warn('[LocalAIEngine] Web search returned no results:', searchResult);
          }
        } else {
          console.warn('[LocalAIEngine] webSearch API not available');
        }
      } catch (webErr) {
        console.warn('[LocalAIEngine] Web search failed (non-critical):', webErr);
      }
    }
    // ---------------------------
    // RESPONSE GUARD: patterns that indicate Mossy falsely claimed she can't access the
    // internet.  Checked after the AI responds; if matched we retry once with live web
    // results injected so the user gets real information instead of a false refusal.
    const INTERNET_REFUSAL_PATTERNS = [
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
      /i\s+don'?t\s+have\s+the\s+ability\s+to\s+(browse|access\s+the\s+(web|internet))/i,
      /i\s+am\s+not\s+able\s+to\s+(browse|access\s+the\s+(web|internet)|go\s+online)/i,
      // Additional patterns based on user feedback
      /i\s+can'?t\s+(search|look\s+up|find)\s+(online|on\s+the\s+web|on\s+the\s+internet)/i,
      /i\s+cannot\s+(search|look\s+up|find)\s+(online|on\s+the\s+web|on\s+the\s+internet)/i,
      /i\s+(do\s+not|don'?t)\s+have\s+(the\s+ability|capability)\s+to\s+(access|browse|search)/i,
      /i\s+(am\s+)?not\s+able\s+to\s+(search|look\s+up|fetch|get)\s+(online|web|internet)/i,
      /as\s+an?\s+(ai|language\s+model|llm).*(cannot|can'?t|unable).*(internet|web|online|browse)/i,
      /my\s+(knowledge|training\s+data).*(cutoff|limited\s+to|goes\s+up\s+to)/i,
      // New patterns for "pre-installed data" and "just a base LLM" claims
      /my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i,
      /all\s+of\s+my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i,
      /i'?m\s+just\s+an?\s+(large\s+)?(language\s+model|base\s+llm|llm)/i,
      /i\s+am\s+just\s+an?\s+(large\s+)?(language\s+model|base\s+llm|llm)/i,
      // Patterns for "cannot review/retain data in real time"
      /i\s+cannot\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+can'?t\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+(am\s+)?unable\s+to\s+(review|retain|review\s+and\s+retain)\s+(data|information)\s+in\s+real.?time/i,
      // Patterns for "fixed model" claims
      /i'?m\s+a\s+fixed\s+(model|language\s+model|llm)/i,
      /i\s+am\s+a\s+fixed\s+(model|language\s+model|llm)/i,
      /my\s+(model|knowledge\s+base)\s+(is|was)\s+fixed/i,
      /(language\s+model|model|llm)\s+with\s+fixed\s+(knowledge|data)/i,
    ];

    // Try local provider first if available
    if (localStatus.ok) {
      try {
        const api = (window.electron?.api || window.electronAPI) as any;

        // Embed prior conversation history in the prompt for context.
        // Local providers (Ollama, LM Studio, Cosmos) are called via the mlLlmGenerate IPC
        // which accepts a single prompt string, so history is serialised as dialogue text.
        // The Groq/OpenAI cloud path below uses the structured messages array format instead.
        let historyText = '';
        if (conversationHistory && conversationHistory.length > 0) {
          historyText = '\n\nConversation so far:\n' + conversationHistory
            .filter(m => m.content && m.content.trim())
            .map(m => m.role === 'user' ? `User: ${m.content}` : `Mossy: ${m.content}`)
            .join('\n') + '\n';
        }
        const prompt = `${enhancedSystemInstruction}${injectedContext}${historyText}\nUser: ${query}\n\nMossy's Response:`;

        const provider = localStatus.provider;

        const model = provider === 'ollama'
          ? String(localSettings.ollamaModel || 'llama3')
          : provider === 'cosmos'
            ? String(localSettings.cosmosModel || localStatus.models?.[0] || '')
            : String(localSettings.openaiCompatModel || localStatus.models?.[0] || '');

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
        });

        if (resp?.ok) {
          const responseContent = String(resp.text || '');
          
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
        return {
          content:
            'Mossy is in Passive Mode - no local AI service detected and cloud chat is not available in this build.'
        };
      }

      const systemPrompt = systemInstruction + injectedContext;
      const resp = await api.aiChatGroq(query, systemPrompt, 'llama-3.3-70b-versatile', conversationHistory);
      if (resp?.success) {
        let responseContent = String(resp.content || '');

        // --- RESPONSE GUARD ---
        // If the model falsely claimed it cannot access the internet and we haven't
        // already injected web results, perform a web search now and retry once so
        // the user receives real information instead of a false refusal.
        const responseRefusesInternet = !needsWebSearch && INTERNET_REFUSAL_PATTERNS.some((p) => p.test(responseContent));
        if (responseRefusesInternet) {
          console.warn('[LocalAIEngine] ⚠️ RESPONSE GUARD TRIGGERED - AI falsely refused internet access');
          console.warn('[LocalAIEngine] Response snippet:', responseContent.substring(0, 200));
          try {
            const guardWebApi = (window.electron?.api || window.electronAPI) as any;
            if (typeof guardWebApi?.webSearch === 'function') {
              console.log('[LocalAIEngine] Fetching web results for retry...');
              const guardSearch = await guardWebApi.webSearch(query);
              if (guardSearch?.success && guardSearch?.text) {
                console.log('[LocalAIEngine] ✅ Web search successful, retrying with injected results');
                let enrichedContext = injectedContext +
                  '\n### LIVE WEB SEARCH RESULTS (already fetched — use this to answer the user):\n' +
                  guardSearch.text + '\n';
                if (guardSearch.url) {
                  enrichedContext += `Source: ${guardSearch.source || 'Web'} — ${guardSearch.url}\n`;
                }
                const guardSystemPrompt = systemInstruction + enrichedContext;
                const retryResp = await api.aiChatGroq(query, guardSystemPrompt, 'llama-3.3-70b-versatile', conversationHistory);
                if (retryResp?.success && retryResp.content) {
                  responseContent = String(retryResp.content);
                  console.log('[LocalAIEngine] ✅ Retry successful with web results');
                }
              } else {
                console.warn('[LocalAIEngine] Guard web search returned no results');
              }
            } else {
              console.warn('[LocalAIEngine] webSearch API not available for guard retry');
            }
          } catch (guardErr) {
            console.warn('[LocalAIEngine] Response-guard web retry failed (non-critical):', guardErr);
          }
        }
        // ----------------------

        // Record interaction for self-improvement
        selfImprovementEngine.recordInteraction(query, responseContent, [], 'success');

        return { content: responseContent, context: { citations } };
      }

      return {
        content:
          String(resp?.error || 'Mossy is in Passive Mode because Groq is not configured. Add a Groq API key in Desktop settings, or run a local AI backend (like Ollama).'),
        context: { citations },
      };
    } catch (e) {
      console.error('[LocalAIEngine] Groq IPC error:', e);
      return {
        content:
          'Mossy is in Passive Mode because no local AI backend (like Ollama) was detected and Groq cloud chat is not available. Configure Groq in Desktop settings or start a local backend.',
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
