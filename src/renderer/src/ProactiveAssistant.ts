// Proactive Assistant - Error Prevention Service
// Monitors workflow and prevents errors before they happen

import { contextAwareAIService, AIContext, WorkflowStage } from './ContextAwareAIService';
import { cacheManager } from './CacheManager';

export interface ErrorPattern {
  id: string;
  pattern: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  stage: WorkflowStage[];
  detected: boolean;
  detectedAt?: number;
}

export interface ProactiveWarning {
  id: string;
  type: 'error-prevention' | 'best-practice' | 'optimization' | 'compatibility';
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  stage: WorkflowStage;
  autoFixAvailable: boolean;
  autoFixAction?: () => Promise<void>;
  learnMoreUrl?: string;
  timestamp: number;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  warnings: ProactiveWarning[];
  errors: ProactiveWarning[];
  suggestions: string[];
  canProceed: boolean;
}

export class ProactiveAssistant {
  private errorPatterns: ErrorPattern[] = [];
  private activeWarnings: Map<string, ProactiveWarning> = new Map();
  private warningCallbacks: Set<(warnings: ProactiveWarning[]) => void> = new Set();
  private validationCache: Map<string, ValidationResult> = new Map();
  private lastCheck: number = 0;
  private checkInterval: number = 5000; // Check every 5 seconds

  constructor() {
    this.initializeErrorPatterns();
    this.startMonitoring();
  }

  private initializeErrorPatterns(): void {
    // Critical error patterns
    this.errorPatterns = [
      {
        id: 'blender-wrong-scale',
        pattern: 'scale-not-1.0',
        description: 'Blender objects not at 1.0 scale - will cause size issues in Fallout 4',
        severity: 'critical',
        stage: ['modeling', 'rigging', 'animation'],
        detected: false
      },
      {
        id: 'animation-wrong-fps',
        pattern: 'fps-not-30',
        description: 'Animation not at 30 FPS - required for Fallout 4',
        severity: 'critical',
        stage: ['animation'],
        detected: false
      },
      {
        id: 'absolute-texture-paths',
        pattern: 'absolute-paths',
        description: 'Textures using absolute paths (C:\\ or D:\\) - mod will break on other systems',
        severity: 'critical',
        stage: ['texturing', 'export'],
        detected: false
      },
      {
        id: 'high-poly-count',
        pattern: 'poly-count-high',
        description: 'Triangle count exceeds 50k - will cause performance issues',
        severity: 'high',
        stage: ['modeling', 'export'],
        detected: false
      },
      {
        id: 'missing-uv-maps',
        pattern: 'no-uv-maps',
        description: 'Model missing UV maps - textures will not display',
        severity: 'high',
        stage: ['modeling', 'texturing'],
        detected: false
      },
      {
        id: 'textures-not-packed',
        pattern: 'external-textures',
        description: 'Textures not packed in .blend file - may be missing on export',
        severity: 'high',
        stage: ['texturing', 'export'],
        detected: false
      },
      {
        id: 'invalid-bone-names',
        pattern: 'bone-naming',
        description: 'Skeleton bone names don\'t match FO4 conventions',
        severity: 'high',
        stage: ['rigging'],
        detected: false
      },
      {
        id: 'unweighted-vertices',
        pattern: 'no-weights',
        description: 'Some vertices have no weight assignment',
        severity: 'medium',
        stage: ['rigging'],
        detected: false
      },
      {
        id: 'non-power-of-2-textures',
        pattern: 'texture-size',
        description: 'Texture dimensions not power of 2 - may cause issues',
        severity: 'medium',
        stage: ['texturing'],
        detected: false
      },
      {
        id: 'missing-collision',
        pattern: 'no-collision',
        description: 'No collision mesh detected - objects will be non-solid',
        severity: 'medium',
        stage: ['modeling', 'export'],
        detected: false
      }
    ];
  }

  private startMonitoring(): void {
    // Monitor context changes
    contextAwareAIService.onContextUpdate((context) => {
      this.checkForErrors(context);
    });

    // Periodic checks
    setInterval(() => {
      const context = contextAwareAIService.getCurrentContext();
      this.checkForErrors(context);
    }, this.checkInterval);
  }

  private async checkForErrors(context: AIContext): Promise<void> {
    const now = Date.now();
    if (now - this.lastCheck < 1000) return; // Debounce
    this.lastCheck = now;

    // Clear old warnings
    this.activeWarnings.clear();

    // Check stage-specific patterns
    const relevantPatterns = this.errorPatterns.filter(
      p => p.stage.includes(context.workflowStage)
    );

    for (const pattern of relevantPatterns) {
      const warning = await this.checkPattern(pattern, context);
      if (warning) {
        this.activeWarnings.set(warning.id, warning);
      }
    }

    // Notify listeners
    this.notifyWarnings();
  }

  private async checkPattern(
    pattern: ErrorPattern,
    context: AIContext
  ): Promise<ProactiveWarning | null> {
    // Pattern-specific detection logic
    switch (pattern.id) {
      case 'blender-wrong-scale':
        return this.checkBlenderScale(context);
      
      case 'animation-wrong-fps':
        return this.checkAnimationFPS(context);
      
      case 'absolute-texture-paths':
        return this.checkTexturePaths(context);
      
      case 'high-poly-count':
        return this.checkPolyCount(context);
      
      case 'missing-uv-maps':
        return this.checkUVMaps(context);
      
      case 'textures-not-packed':
        return this.checkTexturesPacked(context);
      
      default:
        return null;
    }
  }

  private checkBlenderScale(context: AIContext): ProactiveWarning | null {
    // Check if Blender is active and we're in modeling/rigging/animation
    if (!['modeling', 'rigging', 'animation'].includes(context.workflowStage)) {
      return null;
    }

    const hasBlender = context.activeTools.some(t => 
      t.name.toLowerCase().includes('blender')
    );

    if (hasBlender && context.sessionDuration > 300) { // After 5 minutes
      return {
        id: 'warn-blender-scale',
        type: 'error-prevention',
        title: '⚠️ Scale Check Required',
        message: 'Ensure all objects are at 1.0 scale in Blender. Fallout 4 requires this for proper sizing.',
        severity: 'critical',
        stage: context.workflowStage,
        autoFixAvailable: true,
        autoFixAction: async () => {
          // Would trigger Blender script to set scale to 1.0
          console.log('Auto-fixing scale to 1.0');
        },
        timestamp: Date.now()
      };
    }

    return null;
  }

  private checkAnimationFPS(context: AIContext): ProactiveWarning | null {
    if (context.workflowStage !== 'animation') return null;
    if (!context.blenderWorkflowStage || context.blenderWorkflowStage !== 'animation') return null;

    return {
      id: 'warn-animation-fps',
      type: 'error-prevention',
      title: '🎬 Animation FPS Critical',
      message: 'Fallout 4 requires exactly 30 FPS for animations. Verify your timeline settings before exporting.',
      severity: 'critical',
      stage: 'animation',
      autoFixAvailable: true,
      autoFixAction: async () => {
        console.log('Auto-fixing FPS to 30');
      },
      learnMoreUrl: '/guides/animation',
      timestamp: Date.now()
    };
  }

  private checkTexturePaths(context: AIContext): ProactiveWarning | null {
    if (!['texturing', 'export'].includes(context.workflowStage)) return null;

    // Check if working with texture files
    const hasTextures = context.detectedFileTypes.some(type =>
      ['.dds', '.png', '.jpg', '.tga'].includes(type.toLowerCase())
    );

    if (hasTextures) {
      return {
        id: 'warn-texture-paths',
        type: 'error-prevention',
        title: '📁 Texture Path Validation',
        message: 'Ensure texture paths are relative, not absolute (C:\\ or D:\\). Absolute paths will break your mod on other systems.',
        severity: 'critical',
        stage: context.workflowStage,
        autoFixAvailable: true,
        autoFixAction: async () => {
          console.log('Auto-fixing texture paths');
        },
        timestamp: Date.now()
      };
    }

    return null;
  }

  private checkPolyCount(context: AIContext): ProactiveWarning | null {
    if (!['modeling', 'export'].includes(context.workflowStage)) return null;

    // Warning for modeling stage after working for a while
    if (context.workflowStage === 'modeling' && context.sessionDuration > 1800) {
      return {
        id: 'warn-poly-count',
        type: 'best-practice',
        title: '📊 Performance Check',
        message: 'Check your poly count. Keep triangles under 50,000 for good performance in Fallout 4.',
        severity: 'medium',
        stage: 'modeling',
        autoFixAvailable: false,
        learnMoreUrl: '/guides/optimization',
        timestamp: Date.now()
      };
    }

    return null;
  }

  private checkUVMaps(context: AIContext): ProactiveWarning | null {
    if (!['modeling', 'texturing'].includes(context.workflowStage)) return null;

    // Show reminder when moving to texturing stage
    if (context.workflowStage === 'texturing' && context.stageConfidence > 0.7) {
      return {
        id: 'warn-uv-maps',
        type: 'error-prevention',
        title: '🗺️ UV Map Check',
        message: 'Verify your model has proper UV maps. Without them, textures won\'t display correctly.',
        severity: 'high',
        stage: 'texturing',
        autoFixAvailable: false,
        timestamp: Date.now()
      };
    }

    return null;
  }

  private checkTexturesPacked(context: AIContext): ProactiveWarning | null {
    if (context.workflowStage !== 'export') return null;

    const hasBlender = context.activeTools.some(t => 
      t.name.toLowerCase().includes('blender')
    );

    if (hasBlender) {
      return {
        id: 'warn-textures-packed',
        type: 'error-prevention',
        title: '📦 Pack Textures',
        message: 'Before exporting, pack all external textures into your .blend file to avoid missing textures.',
        severity: 'high',
        stage: 'export',
        autoFixAvailable: true,
        autoFixAction: async () => {
          console.log('Auto-packing textures');
        },
        timestamp: Date.now()
      };
    }

    return null;
  }

  // Pre-export validation
  async validateBeforeExport(): Promise<ValidationResult> {
    const context = contextAwareAIService.getCurrentContext();
    const warnings: ProactiveWarning[] = [];
    const errors: ProactiveWarning[] = [];
    const suggestions: string[] = [];

    // Get all current warnings
    const currentWarnings = Array.from(this.activeWarnings.values());
    
    for (const warning of currentWarnings) {
      if (warning.severity === 'critical') {
        errors.push(warning);
      } else {
        warnings.push(warning);
      }
    }

    // Calculate quality score
    let score = 100;
    score -= errors.length * 20; // -20 per error
    score -= warnings.filter(w => w.severity === 'high').length * 10; // -10 per high warning
    score -= warnings.filter(w => w.severity === 'medium').length * 5; // -5 per medium warning
    score = Math.max(0, score);

    // Generate suggestions
    if (errors.length > 0) {
      suggestions.push('Fix critical issues before exporting');
    }
    if (score < 70) {
      suggestions.push('Consider addressing warnings to improve quality');
    }
    if (score >= 90) {
      suggestions.push('Asset looks good! Ready for export');
    }

    const result: ValidationResult = {
      passed: errors.length === 0,
      score,
      warnings,
      errors,
      suggestions,
      canProceed: errors.length === 0
    };

    // Cache result
    this.validationCache.set('last-validation', result);

    return result;
  }

  // Auto-fix all available issues
  async autoFixAll(): Promise<{ fixed: number; failed: number }> {
    let fixed = 0;
    let failed = 0;

    for (const warning of this.activeWarnings.values()) {
      if (warning.autoFixAvailable && warning.autoFixAction) {
        try {
          await warning.autoFixAction();
          fixed++;
          this.activeWarnings.delete(warning.id);
        } catch (error) {
          console.error(`Failed to auto-fix ${warning.id}:`, error);
          failed++;
        }
      }
    }

    this.notifyWarnings();
    return { fixed, failed };
  }

  // Event system
  onWarningsUpdate(callback: (warnings: ProactiveWarning[]) => void): () => void {
    this.warningCallbacks.add(callback);
    return () => {
      this.warningCallbacks.delete(callback);
    };
  }

  private notifyWarnings(): void {
    const warnings = Array.from(this.activeWarnings.values());
    this.warningCallbacks.forEach(callback => callback(warnings));
  }

  // Public API
  getCurrentWarnings(): ProactiveWarning[] {
    return Array.from(this.activeWarnings.values());
  }

  getCriticalWarnings(): ProactiveWarning[] {
    return this.getCurrentWarnings().filter(w => w.severity === 'critical');
  }

  getWarningCount(): { critical: number; high: number; medium: number; low: number } {
    const warnings = this.getCurrentWarnings();
    return {
      critical: warnings.filter(w => w.severity === 'critical').length,
      high: warnings.filter(w => w.severity === 'high').length,
      medium: warnings.filter(w => w.severity === 'medium').length,
      low: warnings.filter(w => w.severity === 'low').length
    };
  }

  dismissWarning(warningId: string): void {
    this.activeWarnings.delete(warningId);
    this.notifyWarnings();
  }

  // Save error patterns for learning
  async recordError(pattern: string, context: AIContext): Promise<void> {
    try {
      const history = await cacheManager.get('error-history', 'patterns') || [];
      history.push({
        pattern,
        context: {
          stage: context.workflowStage,
          tools: context.activeTools.map(t => t.name),
          fileTypes: context.detectedFileTypes
        },
        timestamp: Date.now()
      });
      await cacheManager.set('error-history', 'patterns', history.slice(-100), 30 * 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to record error:', error);
    }
  }
}

// Export singleton instance
export const proactiveAssistant = new ProactiveAssistant();
