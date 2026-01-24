/**
 * Local AI Engine Service
 * Connects Mossy to local AI backends like Ollama or Groq Cloud.
 */

import { Groq } from 'groq-sdk';

export interface AIResponse {
  content: string;
  context?: any;
}

export const LocalAIEngine = {
  /**
   * Pings the local Ollama service to check if it's alive.
   */
  async checkOllama(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const response = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
      clearTimeout(id);
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Generates a response using the local Ollama service or Groq Cloud API.
   */
  async generateResponse(query: string, systemInstruction: string): Promise<AIResponse> {
    const isLocalActive = await this.checkOllama();
    
    // --- KNOWLEDGE & PROCESS INJECTION ---
    const customKnowledge = localStorage.getItem('mossy_knowledge_vault');
    let injectedContext = "";
    
    // Inject Process & Hardware Awareness
    if (typeof window.electron?.api?.getRunningProcesses === 'function') {
        try {
            const processes = await window.electron.api.getRunningProcesses();
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

    if (customKnowledge) {
        try {
            const memories = JSON.parse(customKnowledge);
            if (memories.length > 0) {
                injectedContext += "### ADDITIONAL USER-PROVIDED KNOWLEDGE:\n" + 
                    memories.map((m: any) => `[Title: ${m.title}]\n${m.content}`).join("\n---\n") + 
                    "\n\n";
            }
        } catch (e) {
            console.error('[LocalAIEngine] Failed to parse custom knowledge:', e);
        }
    }
    // ---------------------------

    // Try Ollama first if available
    if (isLocalActive) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000); // 10s timeout for generation
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'llama3', 
            prompt: `${systemInstruction}${injectedContext}\n\nUser Question: ${query}\n\nMossy's Response:`,
            stream: false
          })
        });
        clearTimeout(id);

        if (response.ok) {
          const data = await response.json();
          return { content: data.response };
        }
      } catch (e) {
        console.warn('Ollama generate failed, falling back to Groq:', e);
      }
    }

    // Fallback to Groq Cloud API
    try {
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!groqApiKey) {
        console.warn('[LocalAIEngine] No Groq API key found');
        return {
          content: "Mossy is in Passive Mode - no local AI service detected and no cloud API configured. Please set VITE_GROQ_API_KEY in .env.local to enable responses."
        };
      }

      const groqClient = new Groq({ 
        apiKey: groqApiKey, 
        dangerouslyAllowBrowser: true 
      });

      const messages: any[] = [
        {
          role: 'system',
          content: systemInstruction + injectedContext
        },
        {
          role: 'user',
          content: query
        }
      ];

      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024
      });

      const content = response.choices[0]?.message?.content || "No response generated";
      console.log('[LocalAIEngine] Groq response received');
      return { content };
    } catch (e) {
      console.error('[LocalAIEngine] Groq API error:', e);
      return {
        content: "Mossy is in Passive Mode because no local AI backend (like Ollama) was detected at localhost:11434, and Groq API is not configured. Please ensure Ollama is running to enable deep reasoning, or set VITE_GROQ_API_KEY in .env.local."
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
