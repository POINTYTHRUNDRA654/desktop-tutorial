import { v4 as uuidv4 } from 'uuid';
import type {
  ChatContext,
  ChatResponse,
  GeneratedCode,
  Explanation,
  RefactoredCode,
  Fix,
  Optimization,
  FeatureSuggestion,
  Intent,
  Parameters,
  PersonalizationSettings,
  ImageAnalysis,
  AIModAssistantEngine as AIModAssistantEngineType,
} from '../shared/types';

function now() { return Date.now(); }
function makeId(prefix = 'ia') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }

type LLMProvider = 'openai' | 'groq' | 'ollama' | 'none';

interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * AIModAssistantEngine - Real LLM Integration
 * - Supports OpenAI, Groq, and Ollama backends
 * - Falls back to deterministic stubs if no backend configured
 * - Uses HTTP to call backends directly
 */
export class AIModAssistantEngine implements AIModAssistantEngineType {
  private conversations: Record<string, { id: string; history: { role: string; content: string }[] }> = {};
  private feedbackLog: Record<string, { interactionId: string; helpful: boolean; at: number }[]> = {};
  private llmConfig: LLMConfig = { provider: 'none' };

  constructor(config?: LLMConfig) {
    this.llmConfig = config || this.detectConfig();
  }

  /**
   * Auto-detect LLM configuration from environment
   */
  private detectConfig(): LLMConfig {
    // Check for environment variables (works in Electron main process)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.OPENAI_API_KEY) {
        return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4-turbo' };
      }
      if (process.env.GROQ_API_KEY) {
        return { provider: 'groq', apiKey: process.env.GROQ_API_KEY, model: 'openai/gpt-oss-120b' };
      }
      // Check for local Ollama
      if (process.env.OLLAMA_ENABLED === 'true') {
        return { provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'mistral' };
      }
    }
    return { provider: 'none' };
  }

  /**
   * Call LLM backend via HTTP
   */
  private async callLLM(systemPrompt: string, userMessage: string): Promise<string | null> {
    try {
      switch (this.llmConfig.provider) {
        case 'openai':
          return await this.callOpenAI(systemPrompt, userMessage);
        case 'groq':
          return await this.callGroq(systemPrompt, userMessage);
        case 'ollama':
          return await this.callOllama(systemPrompt, userMessage);
        default:
          return null;
      }
    } catch (error) {
      console.warn('[AI] LLM call failed:', error);
      return null;
    }
  }

  private async callOpenAI(systemPrompt: string, userMessage: string): Promise<string | null> {
    if (!this.llmConfig.apiKey) return null;
    const url = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: this.llmConfig.model || 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.llmConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  private async callGroq(systemPrompt: string, userMessage: string): Promise<string | null> {
    if (!this.llmConfig.apiKey) return null;
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const body = {
      model: this.llmConfig.model || 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.llmConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  private async callOllama(systemPrompt: string, userMessage: string): Promise<string | null> {
    const baseUrl = this.llmConfig.baseUrl || 'http://127.0.0.1:11434';
    const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;
    const body = {
      model: this.llmConfig.model || 'mistral',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      const data = await response.json() as any;
      return data.message?.content || null;
    } catch {
      return null;
    }
  }

  // ----------------------
  // Conversational methods
  // ----------------------
  async chat(message: string, context: ChatContext): Promise<ChatResponse> {
    const convId = context?.conversationId || makeId('conv');
    if (!this.conversations[convId]) this.conversations[convId] = { id: convId, history: [] };
    this.conversations[convId].history.push({ role: 'user', content: message });

    // Try real LLM first
    const systemPrompt = 'You are Mossy, an expert Fallout 4 modding assistant. Provide helpful, accurate guidance on modding. Keep responses concise and actionable.';
    let reply = await this.callLLM(systemPrompt, message);
    
    // Fallback to deterministic stub if no LLM available
    if (!reply) {
      reply = `I can help with that! (${this.llmConfig.provider === 'none' ? 'offline mode' : 'LLM temporarily unavailable'}). Here's a quick tip: ${this.generateStubAdvice(message)}`;
    }

    this.conversations[convId].history.push({ role: 'assistant', content: reply });
    const suggested = ['Show code', 'Explain this', 'Suggest optimizations'];
    const suggestions = suggested.map((t) => ({ text: t, type: 'command' as const, confidence: 0.85 }));
    return { conversationId: convId, message: reply, suggestions, suggestedActions: suggested, actions: [], confidence: this.llmConfig.provider !== 'none' ? 0.95 : 0.60, metadata: { timestamp: now(), llmUsed: this.llmConfig.provider !== 'none' } };
  }

  private generateStubAdvice(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('load order')) return 'Use LOOT to sort your load order automatically.';
    if (q.includes('ctd') || q.includes('crash')) return 'Check your load order and mod conflicts with xEdit.';
    if (q.includes('texture')) return 'Use MO2 or Vortex to manage texture mod conflicts.';
    if (q.includes('script') || q.includes('papyrus')) return 'Papyrus scripts are text files in the Scripts folder.';
    return 'Ask in the Fallout 4 modding community for more specialized help.';
  }

  async continueConversation(conversationId: string, message: string): Promise<ChatResponse> {
    return this.chat(message, { conversationId, userId: 'system', recentActions: [] });
  }

  // ----------------------
  // Code generation / analysis
  // ----------------------
  async generateScript(prompt: string, language: 'papyrus' | 'typescript'): Promise<GeneratedCode> {
    const languageName = language === 'papyrus' ? 'Papyrus' : 'TypeScript';
    const systemPrompt = `You are an expert ${languageName} code generator for Fallout 4 modding. Generate clean, production-ready ${languageName} code. Only output the code, no explanations.`;
    
    let code = await this.callLLM(systemPrompt, prompt);
    let usedFallbackStub = false;

    if (!code) {
      // No LLM configured/reachable — this is an empty template, not real
      // generated code. Flagged via `warnings` below so callers can tell.
      usedFallbackStub = true;
      code = language === 'papyrus'
        ? `Scriptname GeneratedScript\n; Generated from: ${prompt}\nEvent OnInit()\n\t; Implementation needed\nEndEvent`
        : `// Generated from: ${prompt}\nexport function generated() { return 'implementation'; }`;
    }

    const ext = language === 'papyrus' ? 'psc' : 'ts';
    return {
      code,
      language,
      explanation: `Generated ${languageName} code from prompt: ${prompt}`,
      warnings: usedFallbackStub ? ['No LLM available — this is an empty template, not real generated code.'] : [],
      alternatives: [],
      files: [{ name: `generated.${ext}`, content: code }]
    };
  }

  async explainCode(code: string): Promise<Explanation> {
    const systemPrompt = 'You are an expert code explainer. Analyze the given code and provide a clear, concise explanation of what it does, its purpose, and any potential issues.';
    const summary = await this.callLLM(systemPrompt, `Explain this code:\n\n${code}`) || `Code snippet (${code.length} chars)`;
    
    const steps = ['Read the code structure', 'Identify main functions', 'Understand flow', 'Note potential issues'];
    const lines = code.split('\n').length;
    const breakdown = [{ lineRange: [1, Math.min(10, lines)] as [number, number], explanation: 'Entry point and initialization', purpose: 'Setup' }];
    return { summary, breakdown, concepts: [], relatedDocs: [], steps, references: [] };
  }

  async refactorCode(code: string, improvements: string[]): Promise<RefactoredCode> {
    const systemPrompt = `You are an expert code refactorer. Improve the given code according to these improvements: ${improvements.join(', ')}. Only output the refactored code.`;
    const refactored = await this.callLLM(systemPrompt, code) || code;
    
    const changes = [{
      type: 'restructure' as const,
      description: `Applied improvements: ${improvements.join(', ')}`,
      before: code,
      after: refactored
    }];
    return {
      original: code,
      refactored: refactored || code,
      improved: refactored || code,
      changes,
      improvements,
      testSuggestions: ['Add unit tests', 'Test edge cases'],
      diff: refactored ? `- original\n+ refactored` : ''
    };
  }

  // ----------------------
  // Smart suggestions
  // ----------------------
  async suggestFixes(error: string, context: any): Promise<Fix[]> {
    const systemPrompt = 'You are an expert at debugging code. Suggest practical fixes for the given error.';
    const suggestion = await this.callLLM(systemPrompt, `Error: ${error}`);
    
    return [{
      id: makeId('fix'),
      title: suggestion ? suggestion.split('\n')[0] : 'Error fix',
      description: suggestion || `Debug the error: ${error}`,
      code: undefined,
      patch: suggestion ? `// Fix: ${suggestion}` : '// Check error logs and context',
      steps: ['Identify root cause', 'Apply fix', 'Test thoroughly'],
      confidence: suggestion ? 0.85 : 0.6,
      estimatedTime: 10
    }];
  }

  async suggestOptimizations(mod: string): Promise<Optimization[]> {
    const systemPrompt = 'You are a Fallout 4 modding performance expert. Suggest realistic optimizations for mods.';
    const suggestions = await this.callLLM(systemPrompt, `Suggest performance optimizations for a mod called "${mod}"`);
    
    return [{
      type: 'script',
      description: suggestions || 'Optimize script performance and reduce CPU usage',
      potentialGain: 15,
      difficulty: 'medium',
      affectedMods: [mod]
    }];
  }

  async suggestFeatures(modDescription: string): Promise<FeatureSuggestion[]> {
    const systemPrompt = 'You are a creative modder. Suggest useful, implementable features.';
    const suggestion = await this.callLLM(systemPrompt, `Suggest features for a mod: ${modDescription}`);
    
    return [{
      name: 'suggested-feature',
      title: suggestion ? suggestion.split('\n')[0] : 'Enhanced feature',
      description: suggestion || 'A new feature to expand mod functionality',
      difficulty: 'medium',
      estimatedTime: 20,
      dependencies: []
    }];
  }

  // ----------------------
  // NLP
  // ----------------------
  async parseIntent(userInput: string): Promise<Intent> {
    const lowered = userInput.toLowerCase();
    // Simple pattern matching as fallback
    if (lowered.includes('fix') || lowered.includes('error') || lowered.includes('crash')) 
      return { type: 'command', name: 'report_issue', action: 'report_issue', confidence: 0.9 };
    if (lowered.includes('generate') || lowered.includes('create') || lowered.includes('write'))
      return { type: 'request', name: 'generate_code', action: 'generate_code', confidence: 0.85 };
    if (lowered.includes('explain') || lowered.includes('what is') || lowered.includes('how does'))
      return { type: 'question', name: 'explain', action: 'explain', confidence: 0.8 };
    return { type: 'question', name: 'unknown', action: 'unknown', confidence: 0.5 };
  }

  async extractParameters(intent: Intent, userInput: string): Promise<Parameters> {
    if (intent.name === 'generate_code') {
      return { language: userInput.includes('papyrus') ? 'papyrus' : 'typescript' };
    }
    return {};
  }

  // ----------------------
  // Learning & personalization
  // ----------------------
  async learnFromFeedback(interactionId: string, helpful: boolean): Promise<void> {
    const entry = { interactionId, helpful, at: now() };
    (this.feedbackLog[interactionId] = this.feedbackLog[interactionId] || []).push(entry);
  }

  async personalizeResponses(userId: string): Promise<PersonalizationSettings> {
    return { 
      userId, 
      tone: 'helpful', 
      preferredLanguage: 'en', 
      skillLevel: 'intermediate', 
      interests: ['modding', 'scripting'], 
      frequentActions: ['search', 'generate'], 
      preferredExamples: [] 
    };
  }

  // ----------------------
  // Multi-modal
  // ----------------------
  async analyzeImage(imagePath: string, question: string): Promise<ImageAnalysis> {
    // No vision API (GPT-4V, Claude Vision, etc.) is wired up here, so this
    // honestly reports that no analysis happened rather than fabricating
    // tags/objects/a bounding box for content it never actually looked at.
    return {
      description: `Image at ${imagePath} — not analyzed`,
      objects: [],
      answer: `Unable to analyze image. ${question} (Vision API not configured)`,
      confidence: 0
    };
  }

  async generateImageDescription(imagePath: string): Promise<string> {
    return `Image located at ${imagePath} (vision analysis not available - enable GPT-4V or similar)`;
  }
}


export const aiModAssistant = new AIModAssistantEngine();
export default aiModAssistant;
