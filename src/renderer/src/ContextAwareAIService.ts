// Context-Aware AI Suggestions Service
// Integrates Neural Link data with AI prompts for contextual assistance

import { cacheManager } from './CacheManager';

export interface ToolContext {
  name: string;
  processName: string;
  windowTitle?: string;
  isActive: boolean;
  lastActive: number;
  context: {
    files?: string[];
    project?: string;
    currentAction?: string;
  };
}

export interface AIContext {
  activeTools: ToolContext[];
  currentProject?: string;
  recentFiles: string[];
  userIntent: string;
  workflowStage: 'planning' | 'creating' | 'testing' | 'debugging' | 'optimizing';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionDuration: number;
}

export interface AISuggestion {
  id: string;
  type: 'action' | 'tip' | 'warning' | 'automation' | 'resource';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
  actions?: Array<{
    label: string;
    command: string;
    params?: any;
  }>;
  relevance: number; // 0-1 score
  timestamp: number;
}

export class ContextAwareAIService {
  private context: AIContext = {
    activeTools: [],
    recentFiles: [],
    userIntent: 'general-modding',
    workflowStage: 'planning',
    timeOfDay: 'morning',
    sessionDuration: 0
  };

  private suggestions: AISuggestion[] = [];
  private contextUpdateCallbacks: Array<(context: AIContext) => void> = [];
  private suggestionCallbacks: Array<(suggestions: AISuggestion[]) => void> = [];

  constructor() {
    this.initializeContext();
    this.startContextMonitoring();
  }

  private initializeContext(): void {
    // Load context from cache
    this.loadPersistedContext();

    // Set initial time context
    this.updateTimeContext();

    // Set initial session duration
    this.context.sessionDuration = 0;
  }

  private startContextMonitoring(): void {
    // Update time context every hour
    setInterval(() => this.updateTimeContext(), 60 * 60 * 1000);

    // Update session duration every minute
    setInterval(() => {
      this.context.sessionDuration += 60;
      this.saveContext();
    }, 60 * 1000);

    // Generate suggestions every 30 seconds
    setInterval(() => this.generateSuggestions(), 30 * 1000);
  }

  private updateTimeContext(): void {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      this.context.timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      this.context.timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      this.context.timeOfDay = 'evening';
    } else {
      this.context.timeOfDay = 'night';
    }
  }

  // Update tool context from Neural Link
  updateToolContext(tools: ToolContext[]): void {
    this.context.activeTools = tools;
    this.inferWorkflowStage();
    this.inferUserIntent();
    this.saveContext();
    this.notifyContextUpdate();
    this.generateSuggestions();
  }

  // Update file context
  updateFileContext(files: string[], project?: string): void {
    this.context.recentFiles = files.slice(0, 10); // Keep last 10 files
    if (project) {
      this.context.currentProject = project;
    }
    this.saveContext();
  }

  private inferWorkflowStage(): void {
    const activeTools = this.context.activeTools.filter(t => t.isActive);

    if (activeTools.length === 0) {
      this.context.workflowStage = 'planning';
      return;
    }

    // Infer stage based on active tools
    const toolNames = activeTools.map(t => t.name.toLowerCase());

    if (toolNames.some(name => name.includes('blender'))) {
      this.context.workflowStage = 'creating';
    } else if (toolNames.some(name => name.includes('creation') || name.includes('ck'))) {
      this.context.workflowStage = 'creating';
    } else if (toolNames.some(name => name.includes('xedit') || name.includes('fo4edit'))) {
      this.context.workflowStage = 'debugging';
    } else if (toolNames.some(name => name.includes('loot') || name.includes('test'))) {
      this.context.workflowStage = 'testing';
    } else if (toolNames.some(name => name.includes('optimizer') || name.includes('auditor'))) {
      this.context.workflowStage = 'optimizing';
    } else {
      this.context.workflowStage = 'planning';
    }
  }

  private inferUserIntent(): void {
    const activeTools = this.context.activeTools.filter(t => t.isActive);
    const toolNames = activeTools.map(t => t.name.toLowerCase());

    if (toolNames.some(name => name.includes('blender'))) {
      this.context.userIntent = '3d-modeling';
    } else if (toolNames.some(name => name.includes('creation') || name.includes('ck'))) {
      this.context.userIntent = 'level-design';
    } else if (toolNames.some(name => name.includes('texture') || name.includes('image'))) {
      this.context.userIntent = 'texturing';
    } else if (toolNames.some(name => name.includes('script') || name.includes('papyrus'))) {
      this.context.userIntent = 'scripting';
    } else if (toolNames.some(name => name.includes('audio') || name.includes('sound'))) {
      this.context.userIntent = 'audio-design';
    } else {
      this.context.userIntent = 'general-modding';
    }
  }

  private generateSuggestions(): void {
    const suggestions: AISuggestion[] = [];
    const now = Date.now();

    // Generate context-aware suggestions
    suggestions.push(...this.generateToolSuggestions());
    suggestions.push(...this.generateWorkflowSuggestions());
    suggestions.push(...this.generateResourceSuggestions());
    suggestions.push(...this.generateAutomationSuggestions());

    // Sort by relevance and priority
    suggestions.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return b.relevance - a.relevance;
    });

    // Keep only top 10 suggestions
    this.suggestions = suggestions.slice(0, 10);
    this.notifySuggestionUpdate();
  }

  private generateToolSuggestions(): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const activeTools = this.context.activeTools.filter(t => t.isActive);

    // Suggest complementary tools
    if (activeTools.some(t => t.name.toLowerCase().includes('blender')) &&
        !activeTools.some(t => t.name.toLowerCase().includes('auditor'))) {
      suggestions.push({
        id: 'suggest-auditor-with-blender',
        type: 'tip',
        title: 'Asset Analysis Available',
        description: 'While working in Blender, consider using The Auditor to analyze your NIF files for performance issues.',
        priority: 'medium',
        context: 'blender-active',
        actions: [{
          label: 'Open The Auditor',
          command: 'navigate',
          params: { route: '/auditor' }
        }],
        relevance: 0.8,
        timestamp: Date.now()
      });
    }

    // Suggest optimization when creating
    if (this.context.workflowStage === 'creating' && this.context.sessionDuration > 1800) { // 30 minutes
      suggestions.push({
        id: 'suggest-optimization-break',
        type: 'tip',
        title: 'Consider Performance Optimization',
        description: 'You\'ve been creating for a while. The Auditor can help ensure your assets are optimized.',
        priority: 'low',
        context: 'long-creation-session',
        actions: [{
          label: 'Check Performance',
          command: 'navigate',
          params: { route: '/auditor' }
        }],
        relevance: 0.6,
        timestamp: Date.now()
      });
    }

    return suggestions;
  }

  private generateWorkflowSuggestions(): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Suggest next steps based on workflow stage
    switch (this.context.workflowStage) {
      case 'planning':
        suggestions.push({
          id: 'workflow-planning-tip',
          type: 'tip',
          title: 'Ready to Start Creating?',
          description: 'Consider opening Blender or the Creation Kit to begin your modding project.',
          priority: 'low',
          context: 'planning-stage',
          relevance: 0.5,
          timestamp: Date.now()
        });
        break;

      case 'creating':
        if (this.context.timeOfDay === 'evening' || this.context.timeOfDay === 'night') {
          suggestions.push({
            id: 'workflow-evening-break',
            type: 'tip',
            title: 'Evening Session Tip',
            description: 'Consider taking a break and testing your work tomorrow. Fresh eyes catch more issues.',
            priority: 'low',
            context: 'evening-workflow',
            relevance: 0.7,
            timestamp: Date.now()
          });
        }
        break;

      case 'testing':
        suggestions.push({
          id: 'workflow-testing-validation',
          type: 'action',
          title: 'Validate Your Load Order',
          description: 'Testing phase detected. Ensure your load order is correct with LOOT integration.',
          priority: 'medium',
          context: 'testing-stage',
          actions: [{
            label: 'Check Load Order',
            command: 'run-loot'
          }],
          relevance: 0.8,
          timestamp: Date.now()
        });
        break;
    }

    return suggestions;
  }

  private generateResourceSuggestions(): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Suggest resources based on user intent
    switch (this.context.userIntent) {
      case '3d-modeling':
        suggestions.push({
          id: 'resource-blender-guide',
          type: 'resource',
          title: 'Blender Modeling Guide Available',
          description: 'Access comprehensive Blender tutorials and best practices for Fallout 4 modding.',
          priority: 'low',
          context: 'blender-modeling',
          actions: [{
            label: 'Open Guide',
            command: 'navigate',
            params: { route: '/guides/blender' }
          }],
          relevance: 0.6,
          timestamp: Date.now()
        });
        break;

      case 'scripting':
        suggestions.push({
          id: 'resource-papyrus-guide',
          type: 'resource',
          title: 'Papyrus Scripting Reference',
          description: 'Detailed Papyrus scripting guide with examples and best practices.',
          priority: 'low',
          context: 'papyrus-scripting',
          actions: [{
            label: 'Open Scripting Guide',
            command: 'navigate',
            params: { route: '/guides/papyrus' }
          }],
          relevance: 0.6,
          timestamp: Date.now()
        });
        break;
    }

    return suggestions;
  }

  private generateAutomationSuggestions(): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Suggest automation for repetitive tasks
    if (this.context.activeTools.some(t => t.name.toLowerCase().includes('blender'))) {
      suggestions.push({
        id: 'automation-blender-alignment',
        type: 'automation',
        title: 'Automate Scale Alignment',
        description: 'Create a workflow to automatically align Blender scenes to Fallout 4 standards (1.0 scale, 30 FPS).',
        priority: 'medium',
        context: 'blender-workflow',
        actions: [{
          label: 'Create Alignment Script',
          command: 'generate-workflow',
          params: { type: 'blender-alignment' }
        }],
        relevance: 0.7,
        timestamp: Date.now()
      });
    }

    return suggestions;
  }

  // Context persistence
  private async saveContext(): Promise<void> {
    try {
      await cacheManager.set('ai-context', 'current-context', this.context, 24 * 60 * 60 * 1000); // 24 hours
    } catch (error) {
      console.error('Failed to save AI context:', error);
    }
  }

  private async loadPersistedContext(): Promise<void> {
    try {
      const saved = await cacheManager.get('ai-context', 'current-context');
      if (saved) {
        this.context = { ...this.context, ...saved };
      }
    } catch (error) {
      console.error('Failed to load AI context:', error);
    }
  }

  // Event system
  onContextUpdate(callback: (context: AIContext) => void): () => void {
    this.contextUpdateCallbacks.push(callback);
    return () => {
      const index = this.contextUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.contextUpdateCallbacks.splice(index, 1);
      }
    };
  }

  onSuggestionsUpdate(callback: (suggestions: AISuggestion[]) => void): () => void {
    this.suggestionCallbacks.push(callback);
    return () => {
      const index = this.suggestionCallbacks.indexOf(callback);
      if (index > -1) {
        this.suggestionCallbacks.splice(index, 1);
      }
    };
  }

  private notifyContextUpdate(): void {
    this.contextUpdateCallbacks.forEach(callback => callback(this.context));
  }

  private notifySuggestionUpdate(): void {
    this.suggestionCallbacks.forEach(callback => callback(this.suggestions));
  }

  // Public API
  getCurrentContext(): AIContext {
    return { ...this.context };
  }

  getCurrentSuggestions(): AISuggestion[] {
    return [...this.suggestions];
  }

  // Enhance AI prompts with context
  enhancePromptWithContext(basePrompt: string): string {
    const contextInfo = this.buildContextString();
    return `${basePrompt}\n\nContext Information:\n${contextInfo}`;
  }

  private buildContextString(): string {
    const parts: string[] = [];

    // Active tools
    if (this.context.activeTools.length > 0) {
      const toolNames = this.context.activeTools
        .filter(t => t.isActive)
        .map(t => t.name)
        .join(', ');
      parts.push(`Active Tools: ${toolNames}`);
    }

    // Current project
    if (this.context.currentProject) {
      parts.push(`Current Project: ${this.context.currentProject}`);
    }

    // Workflow stage
    parts.push(`Workflow Stage: ${this.context.workflowStage}`);

    // User intent
    parts.push(`User Intent: ${this.context.userIntent}`);

    // Time context
    parts.push(`Time of Day: ${this.context.timeOfDay}`);

    // Recent files
    if (this.context.recentFiles.length > 0) {
      parts.push(`Recent Files: ${this.context.recentFiles.slice(0, 3).join(', ')}`);
    }

    return parts.join('\n');
  }
}

// Export singleton instance
export const contextAwareAIService = new ContextAwareAIService();