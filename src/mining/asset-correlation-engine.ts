import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Phase1MiningEngine, MiningStatus, Phase1MiningResult, Phase1AssetCorrelation } from '../shared/types';

export interface PatternRecognition {
  patternId: string;
  patternType: 'usage' | 'conflict' | 'optimization' | 'compatibility';
  confidence: number;
  assets: string[];
  description: string;
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface AssetCorrelationEngineConfig {
  scanDirectories: string[];
  correlationThreshold: number;
  patternConfidenceThreshold: number;
  maxCorrelationsPerAsset: number;
  enableDeepAnalysis: boolean;
}

export class AssetCorrelationEngine extends EventEmitter implements Phase1MiningEngine {
  private config: AssetCorrelationEngineConfig;
  private isRunning: boolean = false;
  private correlations: Map<string, Phase1AssetCorrelation[]> = new Map();
  private patterns: PatternRecognition[] = [];
  private assetRegistry: Map<string, any> = new Map();

  constructor(config: AssetCorrelationEngineConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Asset correlation engine is already running');
    }

    this.isRunning = true;
    this.emit('status', { status: 'running', message: 'Starting asset correlation analysis' });

    try {
      await this.initializeAssetRegistry();
      await this.buildCorrelations();
      await this.recognizePatterns();
      await this.generateInsights();

      this.emit('status', { status: 'completed', message: 'Asset correlation analysis completed' });
    } catch (error) {
      this.isRunning = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('status', { status: 'error', message: `Asset correlation failed: ${errorMessage}` });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('status', { status: 'stopped', message: 'Asset correlation engine stopped' });
  }

  async getStatus(): Promise<MiningStatus> {
    return {
      active: this.isRunning,
      progress: this.calculateProgress(),
      currentTask: this.isRunning ? 'Analyzing asset correlations' : undefined,
      engineType: 'asset-correlation',
      engine: 'asset-correlation',
      lastUpdate: Date.now()
    };
  }

  async getResults(): Promise<Phase1MiningResult> {
    return {
      engine: 'asset-correlation',
      timestamp: new Date(),
      data: {
        correlations: Array.from(this.correlations.entries()).map(([assetId, correlatedAssets]) => ({
          assetId,
          correlatedAssets,
          correlationStrength: 0.8,
          correlationType: 'dependency'
        })),
        patterns: this.patterns,
        assetRegistry: Array.from(this.assetRegistry.entries()),
        insights: await this.generateInsights()
      },
      metadata: {
        totalAssets: this.assetRegistry.size,
        totalCorrelations: Array.from(this.correlations.values()).reduce((sum, cors) => sum + cors.length, 0),
        totalPatterns: this.patterns.length,
        config: this.config
      }
    };
  }

  private async initializeAssetRegistry(): Promise<void> {
    this.emit('status', { status: 'running', message: 'Initializing asset registry' });

    for (const directory of this.config.scanDirectories) {
      if (!fs.existsSync(directory)) continue;

      const files = await this.scanDirectory(directory);
      for (const file of files) {
        const assetInfo = await this.analyzeAsset(file);
        if (assetInfo) {
          this.assetRegistry.set(assetInfo.id, assetInfo);
        }
      }
    }
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const scan = async (currentPath: string): Promise<void> => {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          await scan(fullPath);
        } else if (this.isModAsset(fullPath)) {
          files.push(fullPath);
        }
      }
    };

    await scan(dirPath);
    return files;
  }

  private isModAsset(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.esp', '.esm', '.nif', '.dds', '.ba2', '.pex', '.psc'].includes(ext);
  }

  private async analyzeAsset(filePath: string): Promise<any | null> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);

      const baseInfo = {
        id: filePath,
        path: filePath,
        name: fileName,
        extension: ext,
        size: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime
      };

      switch (ext) {
        case '.esp':
        case '.esm':
          return { ...baseInfo, type: 'plugin', dependencies: await this.extractPluginDependencies(filePath) };
        case '.nif':
          return { ...baseInfo, type: 'mesh', textures: await this.extractNifTextures(filePath) };
        case '.dds':
          return { ...baseInfo, type: 'texture', dimensions: await this.extractDdsDimensions(filePath) };
        case '.ba2':
          return { ...baseInfo, type: 'archive', contents: await this.extractBa2Contents(filePath) };
        case '.pex':
          return { ...baseInfo, type: 'script', functions: await this.extractScriptFunctions(filePath) };
        case '.psc':
          return { ...baseInfo, type: 'script_source', references: await this.extractScriptReferences(filePath) };
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to analyze asset ${filePath}:`, error);
      return null;
    }
  }

  private async buildCorrelations(): Promise<void> {
    this.emit('status', { status: 'running', message: 'Building asset correlations' });

    for (const [assetId, assetInfo] of this.assetRegistry) {
      const correlations: Phase1AssetCorrelation[] = [];

      // Find dependencies
      if (assetInfo.dependencies) {
        for (const dep of assetInfo.dependencies) {
          const depAsset = this.findAssetByName(dep);
          if (depAsset) {
            correlations.push({
              assetId: depAsset.id,
              correlatedAssets: [assetId],
              correlationStrength: 1.0,
              correlationType: 'dependency',
              metadata: { dependencyType: 'plugin' }
            });
          }
        }
      }

      // Find texture references
      if (assetInfo.textures) {
        for (const texture of assetInfo.textures) {
          const textureAsset = this.findAssetByName(texture);
          if (textureAsset) {
            correlations.push({
              assetId: textureAsset.id,
              correlatedAssets: [assetId],
              correlationStrength: 0.8,
              correlationType: 'usage',
              metadata: { usageType: 'texture' }
            });
          }
        }
      }

      // Find script references
      if (assetInfo.references) {
        for (const ref of assetInfo.references) {
          const refAsset = this.findAssetByName(ref);
          if (refAsset) {
            correlations.push({
              assetId: refAsset.id,
              correlatedAssets: [assetId],
              correlationStrength: 0.9,
              correlationType: 'dependency',
              metadata: { dependencyType: 'script' }
            });
          }
        }
      }

      // Limit correlations per asset
      correlations.sort((a, b) => b.correlationStrength - a.correlationStrength);
      this.correlations.set(assetId, correlations.slice(0, this.config.maxCorrelationsPerAsset));
    }
  }

  private async recognizePatterns(): Promise<void> {
    this.emit('status', { status: 'running', message: 'Recognizing usage patterns' });

    // Pattern 1: Texture reuse patterns
    const textureReusePatterns = this.findTextureReusePatterns();
    this.patterns.push(...textureReusePatterns);

    // Pattern 2: Plugin dependency chains
    const dependencyChainPatterns = this.findDependencyChainPatterns();
    this.patterns.push(...dependencyChainPatterns);

    // Pattern 3: Script coupling patterns
    const scriptCouplingPatterns = this.findScriptCouplingPatterns();
    this.patterns.push(...scriptCouplingPatterns);

    // Pattern 4: Asset size optimization opportunities
    const optimizationPatterns = this.findOptimizationPatterns();
    this.patterns.push(...optimizationPatterns);

    // Filter by confidence threshold
    this.patterns = this.patterns.filter(p => p.confidence >= this.config.patternConfidenceThreshold);
  }

  private findTextureReusePatterns(): PatternRecognition[] {
    const patterns: PatternRecognition[] = [];
    const textureUsage = new Map<string, string[]>();

    // Build texture usage map
    for (const [assetId, assetInfo] of this.assetRegistry) {
      if (assetInfo.type === 'texture') {
        const users = this.findTextureUsers(assetId);
        textureUsage.set(assetId, users);
      }
    }

    // Find highly reused textures
    for (const [textureId, users] of textureUsage) {
      if (users.length >= 5) { // Threshold for "highly reused"
        patterns.push({
          patternId: `texture-reuse-${textureId}`,
          patternType: 'usage',
          confidence: Math.min(users.length / 10, 1.0), // Scale confidence
          assets: [textureId, ...users],
          description: `Texture ${path.basename(textureId)} is reused by ${users.length} meshes`,
          recommendations: [
            'Consider texture atlas optimization',
            'Evaluate texture compression settings',
            'Check for texture streaming opportunities'
          ],
          metadata: { reuseCount: users.length, users }
        });
      }
    }

    return patterns;
  }

  private findDependencyChainPatterns(): PatternRecognition[] {
    const patterns: PatternRecognition[] = [];
    const visited = new Set<string>();
    const chains: string[][] = [];

    const findChain = (assetId: string, chain: string[] = []): void => {
      if (visited.has(assetId) || chain.length > 10) return; // Prevent infinite loops

      visited.add(assetId);
      chain.push(assetId);

      const correlations = this.correlations.get(assetId) || [];
      for (const correlation of correlations) {
        if (correlation.correlationType === 'dependency') {
          findChain(correlation.assetId, [...chain]);
        }
      }

      if (chain.length >= 3) { // Minimum chain length
        chains.push([...chain]);
      }
    };

    // Find all dependency chains
    for (const assetId of this.assetRegistry.keys()) {
      findChain(assetId);
    }

    // Convert chains to patterns
    for (const chain of chains) {
      patterns.push({
        patternId: `dependency-chain-${chain.join('-')}`,
        patternType: 'compatibility',
        confidence: Math.max(0.5, 1.0 - (chain.length - 3) * 0.1), // Longer chains less confident
        assets: chain,
        description: `Dependency chain: ${chain.map(id => path.basename(id)).join(' → ')}`,
        recommendations: [
          'Monitor for cascading load order issues',
          'Consider consolidating dependencies',
          'Check for circular dependencies'
        ],
        metadata: { chainLength: chain.length, chain }
      });
    }

    return patterns;
  }

  private findScriptCouplingPatterns(): PatternRecognition[] {
    const patterns: PatternRecognition[] = [];
    const scriptInteractions = new Map<string, Set<string>>();

    // Build script interaction map
    for (const [assetId, assetInfo] of this.assetRegistry) {
      if (assetInfo.type === 'script' || assetInfo.type === 'script_source') {
        const interactions = new Set<string>();

        // Find scripts that reference this one
        for (const [otherId, otherInfo] of this.assetRegistry) {
          if ((otherInfo.type === 'script' || otherInfo.type === 'script_source') &&
              otherInfo.references?.includes(path.basename(assetId))) {
            interactions.add(otherId);
          }
        }

        scriptInteractions.set(assetId, interactions);
      }
    }

    // Find tightly coupled script groups
    for (const [scriptId, interactions] of scriptInteractions) {
      if (interactions.size >= 3) {
        patterns.push({
          patternId: `script-coupling-${scriptId}`,
          patternType: 'compatibility',
          confidence: Math.min(interactions.size / 8, 1.0),
          assets: [scriptId, ...Array.from(interactions)],
          description: `Script ${path.basename(scriptId)} is tightly coupled with ${interactions.size} other scripts`,
          recommendations: [
            'Consider script consolidation',
            'Review for potential conflicts',
            'Monitor for performance impact'
          ],
          metadata: { couplingCount: interactions.size, coupledScripts: Array.from(interactions) }
        });
      }
    }

    return patterns;
  }

  private findOptimizationPatterns(): PatternRecognition[] {
    const patterns: PatternRecognition[] = [];
    const largeAssets: Array<{ id: string; size: number }> = [];

    // Find large assets
    for (const [assetId, assetInfo] of this.assetRegistry) {
      if (assetInfo.size > 50 * 1024 * 1024) { // 50MB threshold
        largeAssets.push({ id: assetId, size: assetInfo.size });
      }
    }

    // Sort by size
    largeAssets.sort((a, b) => b.size - a.size);

    if (largeAssets.length > 0) {
      patterns.push({
        patternId: 'large-asset-optimization',
        patternType: 'optimization',
        confidence: 0.8,
        assets: largeAssets.slice(0, 5).map(a => a.id), // Top 5 largest
        description: `Found ${largeAssets.length} large assets that may impact performance`,
        recommendations: [
          'Consider asset compression',
          'Evaluate texture resolution reduction',
          'Check for unused assets in archives'
        ],
        metadata: {
          largeAssetCount: largeAssets.length,
          totalSize: largeAssets.reduce((sum, a) => sum + a.size, 0),
          largestAssets: largeAssets.slice(0, 5)
        }
      });
    }

    return patterns;
  }

  private async generateInsights(): Promise<any> {
    const insights = {
      correlationSummary: {
        totalCorrelations: Array.from(this.correlations.values()).reduce((sum, cors) => sum + cors.length, 0),
        averageCorrelationsPerAsset: this.assetRegistry.size > 0 ?
          Array.from(this.correlations.values()).reduce((sum, cors) => sum + cors.length, 0) / this.assetRegistry.size : 0,
        correlationTypes: this.getCorrelationTypeDistribution()
      },
      patternSummary: {
        totalPatterns: this.patterns.length,
        patternTypes: this.getPatternTypeDistribution(),
        highConfidencePatterns: this.patterns.filter(p => p.confidence >= 0.8).length
      },
      assetSummary: {
        totalAssets: this.assetRegistry.size,
        assetTypes: this.getAssetTypeDistribution(),
        largestAssets: this.getLargestAssets(10)
      },
      recommendations: this.generateRecommendations()
    };

    return insights;
  }

  private getCorrelationTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const correlations of this.correlations.values()) {
      for (const correlation of correlations) {
        distribution[correlation.correlationType] = (distribution[correlation.correlationType] || 0) + 1;
      }
    }
    return distribution;
  }

  private getPatternTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const pattern of this.patterns) {
      distribution[pattern.patternType] = (distribution[pattern.patternType] || 0) + 1;
    }
    return distribution;
  }

  private getAssetTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const assetInfo of this.assetRegistry.values()) {
      distribution[assetInfo.type] = (distribution[assetInfo.type] || 0) + 1;
    }
    return distribution;
  }

  private getLargestAssets(count: number): Array<{ id: string; size: number; type: string }> {
    const assets = Array.from(this.assetRegistry.entries())
      .map(([id, info]) => ({ id, size: info.size, type: info.type }))
      .sort((a, b) => b.size - a.size)
      .slice(0, count);

    return assets;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Based on correlation analysis
    const totalCorrelations = Array.from(this.correlations.values()).reduce((sum, cors) => sum + cors.length, 0);
    if (totalCorrelations > this.assetRegistry.size * 2) {
      recommendations.push('High asset interdependency detected - consider mod consolidation');
    }

    // Based on patterns
    const highConfidencePatterns = this.patterns.filter(p => p.confidence >= 0.8);
    if (highConfidencePatterns.length > 5) {
      recommendations.push('Multiple optimization opportunities identified - review pattern analysis');
    }

    // Based on asset types
    const assetTypes = this.getAssetTypeDistribution();
    if ((assetTypes.texture || 0) > (assetTypes.mesh || 0) * 3) {
      recommendations.push('Texture-to-mesh ratio suggests potential texture optimization opportunities');
    }

    return recommendations;
  }

  private calculateProgress(): number {
    // Simple progress calculation based on completed phases
    let progress = 0;
    if (this.assetRegistry.size > 0) progress += 25;
    if (this.correlations.size > 0) progress += 25;
    if (this.patterns.length > 0) progress += 25;
    return Math.min(progress, 100);
  }

  // Helper methods
  private findAssetByName(name: string): any | null {
    for (const [id, info] of this.assetRegistry) {
      if (path.basename(id) === name || info.name === name) {
        return { id, ...info };
      }
    }
    return null;
  }

  private findTextureUsers(textureId: string): string[] {
    const users: string[] = [];
    const textureName = path.basename(textureId);

    for (const [assetId, assetInfo] of this.assetRegistry) {
      if (assetInfo.type === 'mesh' && assetInfo.textures?.includes(textureName)) {
        users.push(assetId);
      }
    }

    return users;
  }

  // Placeholder methods for asset analysis (would need actual implementations)
  private async extractPluginDependencies(filePath: string): Promise<string[]> {
    // This would parse ESP/ESM files to extract master dependencies
    // For now, return empty array
    return [];
  }

  private async extractNifTextures(filePath: string): Promise<string[]> {
    // This would parse NIF files to extract texture references
    // For now, return empty array
    return [];
  }

  private async extractDdsDimensions(filePath: string): Promise<{ width: number; height: number }> {
    // This would read DDS header to extract dimensions
    // For now, return default
    return { width: 512, height: 512 };
  }

  private async extractBa2Contents(filePath: string): Promise<string[]> {
    // This would list BA2 archive contents
    // For now, return empty array
    return [];
  }

  private async extractScriptFunctions(filePath: string): Promise<string[]> {
    // This would parse PEX files to extract function names
    // For now, return empty array
    return [];
  }

  private async extractScriptReferences(filePath: string): Promise<string[]> {
    // This would parse PSC files to extract references
    // For now, return empty array
    return [];
  }
}