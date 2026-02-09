// Context-Aware AI Suggestions Service
// Integrates Neural Link data with AI prompts for contextual assistance

import { cacheManager } from './CacheManager';
import { communityKnowledgeMiner } from './CommunityKnowledgeMiner';

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

export type WorkflowStage = 
  | 'planning'
  | 'modeling'
  | 'rigging'
  | 'animation'
  | 'texturing'
  | 'export'
  | 'testing'
  | 'debugging'
  | 'optimizing'
  | 'packaging';

export interface AIContext {
  activeTools: ToolContext[];
  currentProject?: string;
  recentFiles: string[];
  userIntent: string;
  workflowStage: WorkflowStage;
  blenderWorkflowStage?: 'modeling' | 'rigging' | 'animation' | 'export';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionDuration: number;
  stageConfidence: number; // 0-1 confidence in stage detection
  detectedFileTypes: string[]; // .blend, .nif, .esp, etc.
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
    sessionDuration: 0,
    stageConfidence: 1.0,
    detectedFileTypes: []
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
    
    // Detect file types
    this.context.detectedFileTypes = files
      .map(f => {
        const ext = f.substring(f.lastIndexOf('.')).toLowerCase();
        return ext;
      })
      .filter((ext, index, self) => self.indexOf(ext) === index); // unique
    
    // Re-infer workflow stage with new file context
    this.inferWorkflowStage();
    
    this.saveContext();
    this.notifyContextUpdate();
  }

  private inferWorkflowStage(): void {
    const activeTools = this.context.activeTools.filter(t => t.isActive);

    if (activeTools.length === 0) {
      this.context.workflowStage = 'planning';
      this.context.stageConfidence = 1.0;
      return;
    }

    // Infer stage based on active tools and file types
    const toolNames = activeTools.map(t => t.name.toLowerCase());
    const fileTypes = this.context.detectedFileTypes;

    // Blender-specific workflow detection
    if (toolNames.some(name => name.includes('blender'))) {
      this.inferBlenderWorkflowStage(activeTools, fileTypes);
      return;
    }

    // Creation Kit workflow
    if (toolNames.some(name => name.includes('creation') || name.includes('ck'))) {
      if (fileTypes.some(f => f.endsWith('.esp') || f.endsWith('.esm'))) {
        this.context.workflowStage = 'testing';
        this.context.stageConfidence = 0.8;
      } else {
        this.context.workflowStage = 'modeling';
        this.context.stageConfidence = 0.7;
      }
      return;
    }

    // xEdit workflow (usually debugging)
    if (toolNames.some(name => name.includes('xedit') || name.includes('fo4edit'))) {
      this.context.workflowStage = 'debugging';
      this.context.stageConfidence = 0.9;
      return;
    }

    // Testing tools
    if (toolNames.some(name => name.includes('loot') || name.includes('test'))) {
      this.context.workflowStage = 'testing';
      this.context.stageConfidence = 0.9;
      return;
    }

    // Optimization tools
    if (toolNames.some(name => name.includes('optimizer') || name.includes('auditor'))) {
      this.context.workflowStage = 'optimizing';
      this.context.stageConfidence = 0.9;
      return;
    }

    // FOMOD/Packaging tools
    if (toolNames.some(name => name.includes('fomod') || name.includes('assembler'))) {
      this.context.workflowStage = 'packaging';
      this.context.stageConfidence = 0.9;
      return;
    }

    // Default to planning
    this.context.workflowStage = 'planning';
    this.context.stageConfidence = 0.5;
  }

  private inferBlenderWorkflowStage(activeTools: ToolContext[], fileTypes: string[]): void {
    // Analyze window titles and file types for Blender workflow stage
    const windowTitles = activeTools
      .filter(t => t.name.toLowerCase().includes('blender'))
      .map(t => (t.windowTitle || '').toLowerCase());

    // Check for rigging-related keywords
    if (windowTitles.some(title => 
      title.includes('rig') || 
      title.includes('armature') || 
      title.includes('bone') || 
      title.includes('weight')
    )) {
      this.context.workflowStage = 'rigging';
      this.context.blenderWorkflowStage = 'rigging';
      this.context.stageConfidence = 0.85;
      return;
    }

    // Check for animation-related keywords
    if (windowTitles.some(title => 
      title.includes('anim') || 
      title.includes('action') || 
      title.includes('keyframe')
    )) {
      this.context.workflowStage = 'animation';
      this.context.blenderWorkflowStage = 'animation';
      this.context.stageConfidence = 0.85;
      return;
    }

    // Check for texturing
    if (windowTitles.some(title => 
      title.includes('shader') || 
      title.includes('material') || 
      title.includes('texture') ||
      title.includes('uv')
    ) || fileTypes.some(f => f.endsWith('.dds') || f.endsWith('.png') || f.endsWith('.jpg'))) {
      this.context.workflowStage = 'texturing';
      this.context.stageConfidence = 0.8;
      return;
    }

    // Check for export/NIF files
    if (fileTypes.some(f => f.endsWith('.nif') || f.endsWith('.fbx'))) {
      this.context.workflowStage = 'export';
      this.context.blenderWorkflowStage = 'export';
      this.context.stageConfidence = 0.9;
      return;
    }

    // Default to modeling for Blender
    this.context.workflowStage = 'modeling';
    this.context.blenderWorkflowStage = 'modeling';
    this.context.stageConfidence = 0.7;
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

      case 'modeling':
        suggestions.push({
          id: 'workflow-modeling-standards',
          type: 'tip',
          title: 'FO4 Modeling Standards',
          description: 'Remember: Use 1.0 scale in Blender. Keep poly count under 50k triangles for optimal performance.',
          priority: 'medium',
          context: 'modeling-stage',
          actions: [{
            label: 'View Standards Guide',
            command: 'navigate',
            params: { route: '/guides/blender' }
          }],
          relevance: 0.85,
          timestamp: Date.now()
        });
        
        if (this.context.sessionDuration > 1800) { // 30 min
          suggestions.push({
            id: 'workflow-modeling-checkpoint',
            type: 'tip',
            title: 'Consider Testing Your Model',
            description: 'Export to NIF and test in-game to catch issues early.',
            priority: 'medium',
            context: 'modeling-checkpoint',
            relevance: 0.7,
            timestamp: Date.now()
          });
        }
        break;

      case 'rigging':
        suggestions.push({
          id: 'workflow-rigging-skeleton',
          type: 'tip',
          title: 'Skeleton Validation',
          description: 'Ensure bone names match FO4 skeleton conventions. Check bone hierarchy and weights.',
          priority: 'high',
          context: 'rigging-stage',
          actions: [{
            label: 'View Rigging Guide',
            command: 'navigate',
            params: { route: '/guides/rigging' }
          }],
          relevance: 0.9,
          timestamp: Date.now()
        });
        break;

      case 'animation':
        suggestions.push({
          id: 'workflow-animation-fps',
          type: 'warning',
          title: 'Animation Must Be 30 FPS',
          description: 'Fallout 4 requires animations at exactly 30 FPS. Verify your timeline settings.',
          priority: 'high',
          context: 'animation-stage',
          actions: [{
            label: 'Set Timeline to 30 FPS',
            command: 'blender-set-fps'
          }],
          relevance: 0.95,
          timestamp: Date.now()
        });
        break;

      case 'texturing':
        suggestions.push({
          id: 'workflow-texturing-pbr',
          type: 'tip',
          title: 'PBR Texture Generation',
          description: 'Use Image Suite to automatically generate normal, roughness, and height maps from your diffuse texture.',
          priority: 'medium',
          context: 'texturing-stage',
          actions: [{
            label: 'Open Image Suite',
            command: 'navigate',
            params: { route: '/media/images' }
          }],
          relevance: 0.8,
          timestamp: Date.now()
        });
        break;

      case 'export':
        suggestions.push({
          id: 'workflow-export-validation',
          type: 'action',
          title: 'Validate Export Settings',
          description: 'Before exporting, ensure all textures are packed and paths are relative.',
          priority: 'high',
          context: 'export-stage',
          actions: [{
            label: 'Pre-Export Checklist',
            command: 'show-export-checklist'
          }],
          relevance: 0.9,
          timestamp: Date.now()
        });

        suggestions.push({
          id: 'workflow-export-auditor',
          type: 'action',
          title: 'Analyze Exported Files',
          description: 'Use The Auditor to analyze your NIF files for errors before testing in-game.',
          priority: 'medium',
          context: 'export-stage',
          actions: [{
            label: 'Open The Auditor',
            command: 'navigate',
            params: { route: '/tools/auditor' }
          }],
          relevance: 0.85,
          timestamp: Date.now()
        });
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

      case 'debugging':
        suggestions.push({
          id: 'workflow-debugging-xedit',
          type: 'tip',
          title: 'Conflict Resolution',
          description: 'Use xEdit to identify and resolve conflicts with other mods.',
          priority: 'medium',
          context: 'debugging-stage',
          relevance: 0.8,
          timestamp: Date.now()
        });
        break;

      case 'optimizing':
        suggestions.push({
          id: 'workflow-optimizing-performance',
          type: 'tip',
          title: 'Performance Optimization Tips',
          description: 'Focus on reducing poly count, optimizing textures, and using LODs effectively.',
          priority: 'medium',
          context: 'optimizing-stage',
          actions: [{
            label: 'View Optimization Guide',
            command: 'navigate',
            params: { route: '/guides/optimization' }
          }],
          relevance: 0.85,
          timestamp: Date.now()
        });
        break;

      case 'packaging':
        suggestions.push({
          id: 'workflow-packaging-fomod',
          type: 'action',
          title: 'Create FOMOD Installer',
          description: 'Package your mod with a FOMOD installer for easy distribution.',
          priority: 'medium',
          context: 'packaging-stage',
          actions: [{
            label: 'Open The Assembler',
            command: 'navigate',
            params: { route: '/tools/assembler' }
          }],
          relevance: 0.9,
          timestamp: Date.now()
        });
        break;
    }

    // Evening workflow tip
    if (this.context.timeOfDay === 'evening' || this.context.timeOfDay === 'night') {
      if (['modeling', 'rigging', 'animation'].includes(this.context.workflowStage)) {
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

    // Workflow stage with confidence
    parts.push(`Workflow Stage: ${this.context.workflowStage} (confidence: ${Math.round(this.context.stageConfidence * 100)}%)`);
    
    // Blender-specific stage if applicable
    if (this.context.blenderWorkflowStage) {
      parts.push(`Blender Pipeline Stage: ${this.context.blenderWorkflowStage}`);
    }

    // User intent
    parts.push(`User Intent: ${this.context.userIntent}`);

    // Time context
    parts.push(`Time of Day: ${this.context.timeOfDay}`);
    
    // Session duration
    const hours = Math.floor(this.context.sessionDuration / 3600);
    const minutes = Math.floor((this.context.sessionDuration % 3600) / 60);
    if (hours > 0) {
      parts.push(`Session Duration: ${hours}h ${minutes}m`);
    } else if (minutes > 0) {
      parts.push(`Session Duration: ${minutes}m`);
    }

    // File types being worked on
    if (this.context.detectedFileTypes.length > 0) {
      parts.push(`Working with: ${this.context.detectedFileTypes.join(', ')}`);
    }

    // Recent files
    if (this.context.recentFiles.length > 0) {
      parts.push(`Recent Files: ${this.context.recentFiles.slice(0, 3).join(', ')}`);
    }
    
    // Community knowledge integration
    try {
      const activeTools = this.context.activeTools.filter(t => t.isActive);
      const patterns = communityKnowledgeMiner.getRelevantPatterns({
        workflowStage: this.context.workflowStage,
        activeTools: activeTools.map(t => t.name),
      });
      
      if (patterns.length > 0) {
        parts.push('\n--- Community Learnings ---');
        for (const pattern of patterns) {
          parts.push(`💡 ${pattern.pattern}: ${pattern.suggestedSolution}`);
        }
      }
    } catch (error) {
      console.error('Failed to add community knowledge to context:', error);
    }

    return parts.join('\n');
  }
}

// Export singleton instance
export const contextAwareAIService = new ContextAwareAIService();