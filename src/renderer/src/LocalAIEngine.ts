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

type LocalAiPreferred = 'auto' | 'ollama' | 'openai_compat' | 'off';

type LocalAiSettings = {
  localAiPreferredProvider?: LocalAiPreferred;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
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
    };
  },

  /**
   * Checks whether a local AI provider is available.
   * Uses the Electron main process to avoid CORS and to support configurable ports.
   */
  async getLocalProviderStatus(): Promise<
    | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
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
      const openaiOk = !!caps?.openaiCompat?.ok;

      const pickAuto = () => {
        if (ollamaOk) return { ok: true as const, provider: 'ollama' as const, baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] };
        if (openaiOk) return { ok: true as const, provider: 'openai_compat' as const, baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] };
        return { ok: false as const, reason: 'No local provider detected.' };
      };

      if (preferred === 'off') return { ok: false, reason: 'Local AI disabled in settings.' };
      if (preferred === 'auto') return pickAuto();

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
   */
  async generateResponse(query: string, systemInstruction: string): Promise<AIResponse> {
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
    // ---------------------------

    // Try local provider first if available
    if (localStatus.ok) {
      try {
        const api = (window.electron?.api || window.electronAPI) as any;
        const prompt = `${enhancedSystemInstruction}${injectedContext}\n\nUser Question: ${query}\n\nMossy's Response:`;

        const provider = localStatus.provider;

        const model = provider === 'ollama'
          ? String(localSettings.ollamaModel || 'llama3')
          : String(localSettings.openaiCompatModel || localStatus.models?.[0] || '');

        if (!model.trim()) {
          return { content: 'Local AI is detected but no model is selected. Configure a model in Local Capabilities.' };
        }

        const baseUrl = provider === 'ollama'
          ? String(localSettings.ollamaBaseUrl || 'http://127.0.0.1:11434')
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
      const resp = await api.aiChatGroq(query, systemPrompt, 'llama-3.3-70b-versatile');
      if (resp?.success) {
        const responseContent = String(resp.content || '');
        
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
