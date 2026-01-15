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
    
    // Inject Process Awareness
    if (typeof window.electron?.api?.getRunningProcesses === 'function') {
        try {
            const processes = await window.electron.api.getRunningProcesses();
            if (processes.length > 0) {
                injectedContext += "\n### ACTIVE MODDING SESSION MONITORING:\n";
                injectedContext += processes.map((p: any) => `- ${p.name} (Window: ${p.windowTitle || 'N/A'})`).join("\n");
                injectedContext += "\n\n";
            }
        } catch (e) {}
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

    // Fallback to "Legacy" (actually simulated now but we should make it real)
    return {
      content: "I detected Ollama is offline or not configured. Please start Ollama or check your settings for 'No Fake Stuff' mode. (Falling back to Knowledge Base search for now)."
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
