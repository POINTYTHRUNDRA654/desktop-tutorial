/**
 * Local AI Engine Service
 * Connects Mossy to local AI backends like Ollama or LM Studio.
 */

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
   * Generates a response using the local Ollama service.
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
            } catch (e) {}

            if (processes.length > 0 || blenderLinked || detectedApps.length > 0 || systemProfileRaw || userSettings) {
                injectedContext += "\n### SYSTEM & TOOL CAPABILITIES:\n";
                
                if (userSettings) {
                    injectedContext += "- [USER CONFIGURED TOOLS]:\n";
                    if (userSettings.xeditPath) injectedContext += `  * xEdit: ${userSettings.xeditPath}\n`;
                    if (userSettings.nifSkopePath) injectedContext += `  * NifSkope: ${userSettings.nifSkopePath}\n`;
                    if (userSettings.creationKitPath) injectedContext += `  * Creation Kit: ${userSettings.creationKitPath}\n`;
                    if (userSettings.blenderPath) injectedContext += `  * Blender: ${userSettings.blenderPath}\n`;
                    if (userSettings.mo2Path) injectedContext += `  * MO2: ${userSettings.mo2Path}\n`;
                    if (userSettings.vortexPath) injectedContext += `  * Vortex: ${userSettings.vortexPath}\n`;
                    if (userSettings.upscaylPath) injectedContext += `  * Upscayl: ${userSettings.upscaylPath}\n`;
                    if (userSettings.photopeaPath) injectedContext += `  * Photopea: ${userSettings.photopeaPath}\n`;
                    if (userSettings.shaderMapPath) injectedContext += `  * ShaderMap: ${userSettings.shaderMapPath}\n`;
                    if (userSettings.nvidiaTextureToolsPath) injectedContext += `  * NVIDIA Texture Tools: ${userSettings.nvidiaTextureToolsPath}\n`;
                    if (userSettings.autodeskFbxPath) injectedContext += `  * FBX Converter: ${userSettings.autodeskFbxPath}\n`;
                    if (userSettings.photoDemonPath) injectedContext += `  * PhotoDemon: ${userSettings.photoDemonPath}\n`;
                    if (userSettings.unWrap3Path) injectedContext += `  * UnWrap3: ${userSettings.unWrap3Path}\n`;
                    if (userSettings.nifUtilsSuitePath) injectedContext += `  * NifUtilsSuite: ${userSettings.nifUtilsSuitePath}\n`;
                    if (userSettings.nvidiaOmniversePath) injectedContext += `  * NVIDIA Omniverse: ${userSettings.nvidiaOmniversePath}\n`;
                    if (userSettings.spin3dPath) injectedContext += `  * Spin3D: ${userSettings.spin3dPath}\n`;
                    if (userSettings.nvidiaCanvasPath) injectedContext += `  * NVIDIA Canvas: ${userSettings.nvidiaCanvasPath}\n`;
                }

                if (systemProfileRaw) {
                    const profile = JSON.parse(systemProfileRaw);
                    injectedContext += `- [HARDWARE]: ${profile.cpu}, ${profile.gpu}, ${profile.ram}GB RAM`;
                    if (profile.vram) injectedContext += `, ${profile.vram}GB VRAM`;
                    if (profile.motherboard) injectedContext += `, MB: ${profile.motherboard}`;
                    if (profile.os) injectedContext += ` (${profile.os})`;
                    injectedContext += "\n";
                    
                    if (profile.storageDrives && profile.storageDrives.length > 0) {
                        injectedContext += "- [STORAGE]: " + profile.storageDrives.map((d: any) => `${d.device} (${d.free}GB/${d.total}GB)`).join(", ") + "\n";
                    }
                }

                if (blenderLinked) injectedContext += "- [STATUS] Blender Neural Link: ACTIVE\n";
                
                if (detectedApps.length > 0) {
                    injectedContext += "- [INSTALLED TOOLS]: " + detectedApps.map((a: any) => `${a.name} (${a.path || 'Manual Link'})`).join(", ") + "\n";
                }

                if (processes.length > 0) {
                    injectedContext += "- [RUNNING NOW]: " + processes.map((p: any) => p.name).join(", ") + "\n";
                }
                injectedContext += "\n";
            }
        } catch (e) {}
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
        } catch (e) {}
    }
    // ---------------------------

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
        console.warn('Ollama generate failed, falling back to legacy engine:', e);
      }
    }

    // Fallback message when local LLM is unavailable
    return {
      content: "Mossy is currently in Passive Mode because no local AI backend (like Ollama) was detected at localhost:11434. Please ensure Ollama is running to enable deep reasoning, or use the Desktop Bridge to sync your Fallout 4 installation data."
    };
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
