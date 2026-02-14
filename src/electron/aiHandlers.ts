/**
 * AI Assistant Engine - IPC Handlers
 * Bridges renderer process to AI engine via IPC
 */

import { ipcMain } from 'electron';
import { aiAssistantEngine } from '../mining/aiAssistant';
import { aiModAssistant } from '../mining/aiModAssistant';
import {
  ScriptGenerationRequest,
  AssetNamingRequest,
  BatchAssetNaming,
  WorkflowRequest,
  DocumentationRequest,
  SearchRequest,
  ErrorContext,
  ExplanationRequest,
  TutorialRequest,
  AIFeedback,
  AIAssistantConfig,
} from '../shared/types';

/**
 * Register all AI Assistant IPC handlers
 */
export function registerAIAssistantHandlers(): void {
  // Script Generation
  ipcMain.handle('ai:generate-script', async (event, request: ScriptGenerationRequest) => {
    try {
      return await aiAssistantEngine.generateScript(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Asset Naming
  ipcMain.handle('ai:suggest-names', async (event, request: AssetNamingRequest) => {
    try {
      return await aiAssistantEngine.suggestNames(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:batch-rename', async (event, request: BatchAssetNaming) => {
    try {
      return await aiAssistantEngine.batchRenameAssets(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Workflow Automation
  ipcMain.handle('ai:plan-workflow', async (event, request: WorkflowRequest) => {
    try {
      return await aiAssistantEngine.planWorkflow(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:execute-workflow', async (event, plan: any) => {
    try {
      return await aiAssistantEngine.executeWorkflow(plan);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Documentation Generation
  ipcMain.handle('ai:generate-docs', async (event, request: DocumentationRequest) => {
    try {
      return await aiAssistantEngine.generateDocumentation(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Semantic Search
  ipcMain.handle('ai:search', async (event, request: SearchRequest) => {
    try {
      return await aiAssistantEngine.search(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:build-index', async (event, sourceFolder: string) => {
    try {
      await aiAssistantEngine.buildSearchIndex(sourceFolder);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Error Diagnosis
  ipcMain.handle('ai:diagnose-error', async (event, context: ErrorContext) => {
    try {
      return await aiAssistantEngine.diagnoseError(context);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:analyze-logs', async (event, logContent: string, context?: any) => {
    try {
      return await aiAssistantEngine.analyzeLogs(logContent, context);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Learning & Explanation
  ipcMain.handle('ai:explain', async (event, request: ExplanationRequest) => {
    try {
      return await aiAssistantEngine.explain(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:suggest-tutorial', async (event, request: TutorialRequest) => {
    try {
      return await aiAssistantEngine.suggestTutorial(request);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:get-related', async (event, concept: string) => {
    try {
      return await aiAssistantEngine.getRelatedConcepts(concept);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Configuration
  ipcMain.handle('ai:get-status', async (event) => {
    try {
      return await aiAssistantEngine.getStatus();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:get-config', async (event) => {
    try {
      return aiAssistantEngine.getConfig();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:update-config', async (event, config: Partial<AIAssistantConfig>) => {
    try {
      await aiAssistantEngine.updateConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Feedback & Statistics
  ipcMain.handle('ai:submit-feedback', async (event, feedback: AIFeedback) => {
    try {
      await aiAssistantEngine.submitFeedback(feedback);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('ai:get-stats', async (event) => {
    try {
      return await aiAssistantEngine.getUsageStatistics();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // ========== ALTERNATIVE API (ai-assistant:* channels) ==========
  // These handlers provide a simplified interface with different parameter signatures

  /**
   * Generate Papyrus script from natural language description
   * Channel: ai-assistant:generate-script
   */
  ipcMain.handle('ai-assistant:generate-script', async (event, description: string) => {
    try {
      const result = await aiAssistantEngine.generateScript({
        description,
        language: 'papyrus',
        context: { projectType: 'Fallout4 mod' },
        style: 'commented',
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error), scripts: [] };
    }
  });

  /**
   * Suggest asset names based on type and context
   * Channel: ai-assistant:suggest-names
   */
  ipcMain.handle('ai-assistant:suggest-names', async (event, assetType: string, context: string) => {
    try {
      const result = await aiAssistantEngine.suggestNames({
        type: assetType as any,
        description: context,
        context: { purpose: context },
        enforceLdFormat: true,
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error), suggestions: [] };
    }
  });

  /**
   * Parse natural language to workflow plan
   * Channel: ai-assistant:parse-workflow
   */
  ipcMain.handle('ai-assistant:parse-workflow', async (event, naturalLanguage: string) => {
    try {
      const result = await aiAssistantEngine.planWorkflow({
        goal: naturalLanguage,
        description: naturalLanguage,
        skillLevel: 'intermediate',
        constraints: [],
        tools: [],
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error), plan: undefined };
    }
  });

  /**
   * Execute a workflow plan
   * Channel: ai-assistant:execute-workflow
   */
  ipcMain.handle('ai-assistant:execute-workflow', async (event, plan: any) => {
    try {
      const result = await aiAssistantEngine.executeWorkflow(plan);
      return result;
    } catch (error) {
      return { success: false, error: String(error), completedSteps: 0, results: {} };
    }
  });

  /**
   * Generate README documentation for a project
   * Channel: ai-assistant:generate-readme
   */
  ipcMain.handle('ai-assistant:generate-readme', async (event, projectData: any) => {
    try {
      const result = await aiAssistantEngine.generateDocumentation({
        type: 'readme',
        content: {
          projectName: projectData.name || 'Project',
          description: projectData.description || '',
          features: projectData.features || [],
        },
        style: 'technical',
        targetAudience: 'mixed',
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error), documentation: { content: '', format: 'markdown', sections: [], metadata: { generatedAt: Date.now(), estimatedReadTime: 0, wordCount: 0 } } };
    }
  });

  /**
   * Diagnose an error from logs and context
   * Channel: ai-assistant:diagnose-error
   */
  ipcMain.handle('ai-assistant:diagnose-error', async (event, errorLog: string, context: any) => {
    try {
      const result = await aiAssistantEngine.diagnoseError({
        errorMessage: errorLog,
        stackTrace: context.stackTrace || '',
        logContent: errorLog,
        contextData: context,
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: String(error),
        diagnosis: {
          errorType: 'unknown',
          severity: 'high',
          rootCause: 'Unable to diagnose error',
          explanation: String(error),
          affectedSystems: [],
          diagnosticSteps: [],
          possibleFixes: [],
        },
      };
    }
  });

  /**
   * Conversational chat (AIModAssistant)
   * Channel: ai-assistant:chat
   */
  ipcMain.handle('ai-assistant:chat', async (event, message: string, context: any) => {
    try {
      return await aiModAssistant.chat(message, context);
    } catch (error) {
      return { conversationId: '', message: String(error), suggestions: [], actions: [], confidence: 0 };
    }
  });

  /**
   * Explain code (AIModAssistant)
   * Channel: ai-assistant:explain-code
   */
  ipcMain.handle('ai-assistant:explain-code', async (event, code: string) => {
    try {
      return await aiModAssistant.explainCode(code);
    } catch (error) {
      return { summary: 'Unable to explain code', breakdown: [], concepts: [], relatedDocs: [] };
    }
  });

  /**
   * Suggest fixes for an error (AIModAssistant)
   * Channel: ai-assistant:suggest-fixes
   */
  ipcMain.handle('ai-assistant:suggest-fixes', async (event, error: string, context: any) => {
    try {
      return await aiModAssistant.suggestFixes(error, context);
    } catch (err) {
      return [];
    }
  });

  /**
   * Refactor code (AIModAssistant)
   * Channel: ai-assistant:refactor-code
   */
  ipcMain.handle('ai-assistant:refactor-code', async (event, code: string, improvements: string[]) => {
    try {
      return await aiModAssistant.refactorCode(code, improvements || []);
    } catch (err) {
      return { original: code, refactored: code, changes: [], improvements: [], testSuggestions: [] };
    }
  });

  /**
   * Parse user intent (AIModAssistant)
   * Channel: ai-assistant:parse-intent
   */
  ipcMain.handle('ai-assistant:parse-intent', async (event, userInput: string) => {
    try {
      return await aiModAssistant.parseIntent(userInput);
    } catch (err) {
      return { type: 'request', action: 'unknown', confidence: 0 };
    }
  });

  /**
   * Analyze image (AIModAssistant)
   * Channel: ai-assistant:analyze-image
   */
  ipcMain.handle('ai-assistant:analyze-image', async (event, imagePath: string, question: string) => {
    try {
      return await aiModAssistant.analyzeImage(imagePath, question);
    } catch (err) {
      return { description: '', objects: [], answer: '', confidence: 0 };
    }
  });

  console.log('AI Assistant IPC handlers registered successfully');
}

/**
 * Initialize AI Assistant Engine
 */
export async function initializeAIAssistant(config?: Partial<AIAssistantConfig>): Promise<void> {
  try {
    const finalConfig = {
      enabled: true,
      model: config?.model || 'gpt-3.5-turbo',
      provider: config?.provider || 'openai',
      apiKey: config?.apiKey,
      apiEndpoint: config?.apiEndpoint,
      ...config,
    } as AIAssistantConfig;

    await aiAssistantEngine.initialize(finalConfig);
    console.log('AI Assistant Engine initialized');
  } catch (error) {
    console.error('Failed to initialize AI Assistant:', error);
    // Continue without AI features if initialization fails
  }
}
