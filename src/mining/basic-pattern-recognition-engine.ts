import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Phase1MiningEngine, MiningStatus, Phase1MiningResult } from '../shared/types';

export interface Pattern {
  id: string;
  type: 'structural' | 'behavioral' | 'performance' | 'compatibility';
  confidence: number;
  description: string;
  assets: string[];
  rules: PatternRule[];
  metadata: Record<string, any>;
}

export interface PatternRule {
  condition: string;
  threshold: number;
  weight: number;
  description: string;
}

export interface BasicPatternRecognitionConfig {
  scanDirectories: string[];
  minPatternConfidence: number;
  maxPatterns: number;
  enableAdvancedAnalysis: boolean;
  patternTypes: string[];
}

export class BasicPatternRecognitionEngine extends EventEmitter implements Phase1MiningEngine {
  private config: BasicPatternRecognitionConfig;
  private isRunning: boolean = false;
  private patterns: Pattern[] = [];
  private assetIndex: Map<string, any> = new Map();
  private ruleEngine: Map<string, PatternRule[]> = new Map();

  constructor(config: BasicPatternRecognitionConfig) {
    super();
    this.config = config;
    this.initializeRuleEngine();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Basic pattern recognition engine is already running');
    }

    this.isRunning = true;
    this.emit('status', { status: 'running', message: 'Starting basic pattern recognition' });

    try {
      await this.buildAssetIndex();
      await this.applyPatternRules();
      await this.rankAndFilterPatterns();
      await this.generateInsights();

      this.emit('status', { status: 'completed', message: 'Basic pattern recognition completed' });
    } catch (error) {
      this.isRunning = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('status', { status: 'error', message: `Pattern recognition failed: ${errorMessage}` });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('status', { status: 'stopped', message: 'Basic pattern recognition engine stopped' });
  }

  async getStatus(): Promise<MiningStatus> {
    return {
      active: this.isRunning,
      progress: this.calculateProgress(),
      currentTask: this.isRunning ? 'Analyzing patterns' : undefined,
      engineType: 'basic-pattern-recognition',
      engine: 'basic-pattern-recognition',
      lastUpdate: Date.now()
    };
  }

  async getResults(): Promise<Phase1MiningResult> {
    return {
      engine: 'basic-pattern-recognition',
      timestamp: new Date(),
      data: {
        patterns: this.patterns,
        assetIndex: Array.from(this.assetIndex.entries()),
        ruleEngine: Array.from(this.ruleEngine.entries()),
        insights: await this.generateInsights()
      },
      metadata: {
        totalPatterns: this.patterns.length,
        totalAssets: this.assetIndex.size,
        totalRules: Array.from(this.ruleEngine.values()).reduce((sum, rules) => sum + rules.length, 0),
        config: this.config
      }
    };
  }

  private initializeRuleEngine(): void {
    // Structural Patterns
    this.ruleEngine.set('structural', [
      {
        condition: 'file_size > 100MB',
        threshold: 100 * 1024 * 1024,
        weight: 0.8,
        description: 'Large asset files that may impact performance'
      },
      {
        condition: 'texture_resolution > 4096',
        threshold: 4096,
        weight: 0.7,
        description: 'High resolution textures that may cause memory issues'
      },
      {
        condition: 'mesh_vertex_count > 50000',
        threshold: 50000,
        weight: 0.6,
        description: 'High polygon meshes that may impact rendering performance'
      },
      {
        condition: 'script_complexity > 1000',
        threshold: 1000,
        weight: 0.5,
        description: 'Complex scripts that may have performance implications'
      }
    ]);

    // Behavioral Patterns
    this.ruleEngine.set('behavioral', [
      {
        condition: 'texture_reuse_ratio > 10',
        threshold: 10,
        weight: 0.9,
        description: 'Textures used by many meshes - potential optimization target'
      },
      {
        condition: 'dependency_depth > 5',
        threshold: 5,
        weight: 0.7,
        description: 'Deep dependency chains that may cause load order issues'
      },
      {
        condition: 'script_interaction_count > 20',
        threshold: 20,
        weight: 0.6,
        description: 'Scripts with many interactions - potential conflict source'
      },
      {
        condition: 'asset_modification_frequency > 10',
        threshold: 10,
        weight: 0.4,
        description: 'Frequently modified assets - may indicate instability'
      }
    ]);

    // Performance Patterns
    this.ruleEngine.set('performance', [
      {
        condition: 'memory_usage_estimate > 2GB',
        threshold: 2 * 1024 * 1024 * 1024,
        weight: 0.8,
        description: 'Assets that may consume significant memory'
      },
      {
        condition: 'draw_call_estimate > 1000',
        threshold: 1000,
        weight: 0.7,
        description: 'Assets that may generate many draw calls'
      },
      {
        condition: 'load_time_estimate > 30s',
        threshold: 30,
        weight: 0.6,
        description: 'Assets with long load times'
      },
      {
        condition: 'compression_ratio < 0.5',
        threshold: 0.5,
        weight: 0.5,
        description: 'Poorly compressed assets wasting disk space'
      }
    ]);

    // Compatibility Patterns
    this.ruleEngine.set('compatibility', [
      {
        condition: 'incompatible_format_count > 3',
        threshold: 3,
        weight: 0.9,
        description: 'Multiple assets using incompatible formats'
      },
      {
        condition: 'missing_dependency_count > 5',
        threshold: 5,
        weight: 0.8,
        description: 'Assets with many missing dependencies'
      },
      {
        condition: 'version_conflict_count > 2',
        threshold: 2,
        weight: 0.7,
        description: 'Assets with version conflicts'
      },
      {
        condition: 'platform_incompatibility_count > 1',
        threshold: 1,
        weight: 0.6,
        description: 'Assets incompatible with current platform'
      }
    ]);
  }

  private async buildAssetIndex(): Promise<void> {
    this.emit('status', { status: 'running', message: 'Building asset index for pattern analysis' });

    for (const directory of this.config.scanDirectories) {
      if (!fs.existsSync(directory)) continue;

      const files = await this.scanDirectory(directory);
      for (const file of files) {
        const assetInfo = await this.analyzeAssetForPatterns(file);
        if (assetInfo) {
          this.assetIndex.set(assetInfo.id, assetInfo);
        }
      }
    }
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const scan = async (currentPath: string): Promise<void> => {
      try {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            await scan(fullPath);
          } else if (this.isRelevantAsset(fullPath)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${currentPath}:`, error);
      }
    };

    await scan(dirPath);
    return files;
  }

  private isRelevantAsset(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.esp', '.esm', '.nif', '.dds', '.ba2', '.pex', '.psc', '.bgsm', '.bgem'].includes(ext);
  }

  private async analyzeAssetForPatterns(filePath: string): Promise<any | null> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const stat = fs.statSync(filePath);

      const baseInfo = {
        id: filePath,
        path: filePath,
        name: fileName,
        extension: ext,
        size: stat.size,
        lastModified: stat.mtime,
        metrics: {} as Record<string, number>
      };

      // Calculate basic metrics
      baseInfo.metrics.file_size = stat.size;
      baseInfo.metrics.age_days = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);

      // Asset-specific analysis
      switch (ext) {
        case '.esp':
        case '.esm':
          return { ...baseInfo, type: 'plugin', ...await this.analyzePluginPatterns(filePath) };
        case '.nif':
          return { ...baseInfo, type: 'mesh', ...await this.analyzeMeshPatterns(filePath) };
        case '.dds':
          return { ...baseInfo, type: 'texture', ...await this.analyzeTexturePatterns(filePath) };
        case '.ba2':
          return { ...baseInfo, type: 'archive', ...await this.analyzeArchivePatterns(filePath) };
        case '.pex':
        case '.psc':
          return { ...baseInfo, type: 'script', ...await this.analyzeScriptPatterns(filePath) };
        default:
          return baseInfo;
      }
    } catch (error) {
      console.warn(`Failed to analyze asset ${filePath}:`, error);
      return null;
    }
  }

  private async applyPatternRules(): Promise<void> {
    this.emit('status', { status: 'running', message: 'Applying pattern recognition rules' });

    const patterns: Pattern[] = [];

    for (const [assetId, assetInfo] of this.assetIndex) {
      for (const [patternType, rules] of this.ruleEngine) {
        if (!this.config.patternTypes.includes(patternType)) continue;

        for (const rule of rules) {
          const matches = this.evaluateRule(assetInfo, rule);
          if (matches) {
            const pattern = this.createPattern(assetId, assetInfo, rule, patternType as any);
            if (pattern) {
              patterns.push(pattern);
            }
          }
        }
      }
    }

    // Group similar patterns
    this.patterns = this.consolidatePatterns(patterns);
  }

  private evaluateRule(assetInfo: any, rule: PatternRule): boolean {
    const { metrics } = assetInfo;

    switch (rule.condition) {
      case 'file_size > 100MB':
        return metrics.file_size > rule.threshold;
      case 'texture_resolution > 4096':
        return (assetInfo.dimensions?.width > rule.threshold) ||
               (assetInfo.dimensions?.height > rule.threshold);
      case 'mesh_vertex_count > 50000':
        return metrics.vertex_count > rule.threshold;
      case 'script_complexity > 1000':
        return metrics.complexity > rule.threshold;
      case 'texture_reuse_ratio > 10':
        return metrics.reuse_ratio > rule.threshold;
      case 'dependency_depth > 5':
        return metrics.dependency_depth > rule.threshold;
      case 'script_interaction_count > 20':
        return metrics.interaction_count > rule.threshold;
      case 'asset_modification_frequency > 10':
        return metrics.modification_frequency > rule.threshold;
      case 'memory_usage_estimate > 2GB':
        return metrics.memory_estimate > rule.threshold;
      case 'draw_call_estimate > 1000':
        return metrics.draw_calls > rule.threshold;
      case 'load_time_estimate > 30s':
        return metrics.load_time > rule.threshold;
      case 'compression_ratio < 0.5':
        return metrics.compression_ratio < rule.threshold;
      case 'incompatible_format_count > 3':
        return metrics.incompatible_formats > rule.threshold;
      case 'missing_dependency_count > 5':
        return metrics.missing_dependencies > rule.threshold;
      case 'version_conflict_count > 2':
        return metrics.version_conflicts > rule.threshold;
      case 'platform_incompatibility_count > 1':
        return metrics.platform_incompatibilities > rule.threshold;
      default:
        return false;
    }
  }

  private createPattern(assetId: string, assetInfo: any, rule: PatternRule, type: Pattern['type']): Pattern | null {
    const confidence = this.calculateConfidence(assetInfo, rule);

    if (confidence < this.config.minPatternConfidence) {
      return null;
    }

    return {
      id: `${type}-${rule.condition.replace(/[^a-zA-Z0-9]/g, '-')}-${assetId.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type,
      confidence,
      description: `${rule.description} (${path.basename(assetId)})`,
      assets: [assetId],
      rules: [rule],
      metadata: {
        assetInfo,
        rule,
        detectedAt: new Date(),
        severity: this.calculateSeverity(confidence, type)
      }
    };
  }

  private consolidatePatterns(patterns: Pattern[]): Pattern[] {
    const consolidated = new Map<string, Pattern>();

    for (const pattern of patterns) {
      const key = `${pattern.type}-${pattern.description.split(' ')[0]}`;

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.assets.push(...pattern.assets);
        existing.confidence = Math.max(existing.confidence, pattern.confidence);
        existing.rules.push(...pattern.rules);
        existing.metadata.consolidatedCount = (existing.metadata.consolidatedCount || 1) + 1;
      } else {
        consolidated.set(key, { ...pattern, metadata: { ...pattern.metadata, consolidatedCount: 1 } });
      }
    }

    return Array.from(consolidated.values());
  }

  private async rankAndFilterPatterns(): Promise<void> {
    // Sort by confidence and limit to max patterns
    this.patterns.sort((a, b) => b.confidence - a.confidence);
    this.patterns = this.patterns.slice(0, this.config.maxPatterns);

    // Add ranking metadata
    this.patterns.forEach((pattern, index) => {
      pattern.metadata.rank = index + 1;
      pattern.metadata.percentile = ((this.patterns.length - index) / this.patterns.length) * 100;
    });
  }

  private async generateInsights(): Promise<any> {
    const insights = {
      patternSummary: {
        totalPatterns: this.patterns.length,
        patternTypes: this.getPatternTypeDistribution(),
        averageConfidence: this.patterns.length > 0 ?
          this.patterns.reduce((sum, p) => sum + p.confidence, 0) / this.patterns.length : 0,
        highConfidencePatterns: this.patterns.filter(p => p.confidence >= 0.8).length
      },
      assetSummary: {
        totalAssets: this.assetIndex.size,
        assetTypes: this.getAssetTypeDistribution(),
        patternsPerAsset: this.patterns.length / Math.max(this.assetIndex.size, 1)
      },
      ruleEffectiveness: this.analyzeRuleEffectiveness(),
      recommendations: this.generateRecommendations()
    };

    return insights;
  }

  private calculateConfidence(assetInfo: any, rule: PatternRule): number {
    // Base confidence from rule weight
    let confidence = rule.weight;

    // Adjust based on asset metrics
    const { metrics } = assetInfo;

    // Severity multiplier based on how far over threshold
    const threshold = rule.threshold;
    let severityMultiplier = 1.0;

    switch (rule.condition) {
      case 'file_size > 100MB':
        severityMultiplier = Math.min(metrics.file_size / threshold, 3.0);
        break;
      case 'texture_resolution > 4096': {
        const maxDim = Math.max(assetInfo.dimensions?.width || 0, assetInfo.dimensions?.height || 0);
        severityMultiplier = Math.min(maxDim / threshold, 2.0);
        break;
      }
      // Add more cases as needed
    }

    confidence *= severityMultiplier;

    // Age factor - newer assets might be more relevant
    const ageFactor = Math.max(0.5, Math.min(1.0, 1.0 - (metrics.age_days / 365)));
    confidence *= ageFactor;

    return Math.min(confidence, 1.0);
  }

  private calculateSeverity(confidence: number, type: Pattern['type']): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  private getPatternTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const pattern of this.patterns) {
      distribution[pattern.type] = (distribution[pattern.type] || 0) + 1;
    }
    return distribution;
  }

  private getAssetTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const assetInfo of this.assetIndex.values()) {
      distribution[assetInfo.type] = (distribution[assetInfo.type] || 0) + 1;
    }
    return distribution;
  }

  private analyzeRuleEffectiveness(): Record<string, any> {
    const effectiveness: Record<string, any> = {};

    for (const [type, rules] of this.ruleEngine) {
      effectiveness[type] = {};

      for (const rule of rules) {
        const triggeredPatterns = this.patterns.filter(p =>
          p.type === type && p.rules.some(r => r.condition === rule.condition)
        );

        effectiveness[type][rule.condition] = {
          triggeredCount: triggeredPatterns.length,
          averageConfidence: triggeredPatterns.length > 0 ?
            triggeredPatterns.reduce((sum, p) => sum + p.confidence, 0) / triggeredPatterns.length : 0,
          effectiveness: triggeredPatterns.length * rule.weight
        };
      }
    }

    return effectiveness;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const patternTypes = this.getPatternTypeDistribution();

    if (patternTypes.performance > patternTypes.structural) {
      recommendations.push('Performance patterns dominate - focus on optimization opportunities');
    }

    if (patternTypes.compatibility > 5) {
      recommendations.push('High compatibility issues detected - review mod conflicts');
    }

    const highSeverityPatterns = this.patterns.filter(p => p.metadata.severity === 'critical');
    if (highSeverityPatterns.length > 0) {
      recommendations.push(`${highSeverityPatterns.length} critical patterns found - immediate attention required`);
    }

    if (this.patterns.length < 5) {
      recommendations.push('Few patterns detected - consider expanding scan directories or adjusting thresholds');
    }

    return recommendations;
  }

  private calculateProgress(): number {
    let progress = 0;
    if (this.assetIndex.size > 0) progress += 33;
    if (this.patterns.length > 0) progress += 34;
    return Math.min(progress, 100);
  }

  // Placeholder methods for asset analysis
  private async analyzePluginPatterns(filePath: string): Promise<any> {
    return {
      metrics: {
        dependency_depth: Math.floor(Math.random() * 10),
        version_conflicts: Math.floor(Math.random() * 5),
        missing_dependencies: Math.floor(Math.random() * 10)
      }
    };
  }

  private async analyzeMeshPatterns(filePath: string): Promise<any> {
    return {
      metrics: {
        vertex_count: Math.floor(Math.random() * 100000),
        draw_calls: Math.floor(Math.random() * 100),
        memory_estimate: Math.floor(Math.random() * 100000000)
      }
    };
  }

  private async analyzeTexturePatterns(filePath: string): Promise<any> {
    return {
      dimensions: { width: 1024, height: 1024 },
      metrics: {
        reuse_ratio: Math.floor(Math.random() * 20),
        compression_ratio: Math.random() * 0.8 + 0.2,
        memory_estimate: 1024 * 1024 * 4 // Rough RGBA estimate
      }
    };
  }

  private async analyzeArchivePatterns(filePath: string): Promise<any> {
    return {
      metrics: {
        load_time: Math.random() * 60,
        compression_ratio: Math.random() * 0.8 + 0.2,
        file_count: Math.floor(Math.random() * 1000)
      }
    };
  }

  private async analyzeScriptPatterns(filePath: string): Promise<any> {
    return {
      metrics: {
        complexity: Math.floor(Math.random() * 2000),
        interaction_count: Math.floor(Math.random() * 50),
        modification_frequency: Math.floor(Math.random() * 20)
      }
    };
  }
}