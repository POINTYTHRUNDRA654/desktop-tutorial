/**
 * Multi-Source Data Pipeline for Fallout 4 Mod Mining
 * Orchestrates ESP parsing, asset correlation, dependency analysis, and performance mining
 */

import {
  DataSource,
  MiningPipeline,
  MiningResult,
  ExtendedMiningResult,
  DataProcessor,
  AssetCorrelator as IAssetCorrelator,
  PerformanceAnalyzer as IPerformanceAnalyzer,
  AssetReference,
  PerformanceMetric,
  HardwareProfile
} from '../shared/types';
import { ESPParser } from './esp-parser';
import { AssetCorrelator } from './asset-correlator';
import { DependencyGraphBuilder } from './dependency-graph-builder';
import { PerformanceAnalyzer } from './performance-analyzer';
import { BSAParser } from './bsa-parser';
import { LODAnalyzer } from './lod-analyzer';
import { TextureResolutionAnalyzer } from './texture-resolution-analyzer';
import { AnimationFrameAnalyzer } from './animation-frame-analyzer';
import { UnusedAssetDetector } from './unused-asset-detector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class MiningPipelineOrchestrator {
  private pipeline: MiningPipeline;
  private progressCallback?: (progress: number, task: string) => void;

  constructor() {
    this.pipeline = {
      sources: [],
      processors: [],
      correlators: [],
      analyzers: [],
      output: {
        espData: new Map(),
        correlations: [],
        dependencyGraph: {
          nodes: new Map(),
          edges: [],
          cycles: [],
          loadOrder: []
        },
        performanceReport: {
          // Honest empty state until real benchmark data is supplied — no
          // fabricated FPS/memory numbers (see analyzePerformance()).
          baselineMetrics: {
            modCombination: [],
            fps: 0,
            memoryUsage: 0,
            loadTime: 0,
            stabilityScore: 0,
            conflictCount: 0,
            timestamp: Date.now(),
            hardwareProfile: {
              cpu: { model: 'Unknown', cores: 1, threads: 1, baseClock: 0, boostClock: 0, cache: 0 },
              gpu: { model: 'Unknown', vram: 0, driverVersion: '', dxVersion: '', rayTracing: false },
              ram: { total: 0, speed: 0, type: 'Unknown', channels: 0 },
              storage: { type: 'Unknown', readSpeed: 0, writeSpeed: 0, totalSpace: 0, availableSpace: 0 },
              os: { name: 'Unknown', version: '', architecture: 'x64' }
            }
          },
          modImpact: new Map(),
          recommendations: [],
          compatibilityMatrix: new Map()
        },
        processedAt: Date.now(),
        errors: []
      }
    };
  }

  /**
   * Set progress callback for UI updates
   */
  setProgressCallback(callback: (progress: number, task: string) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Execute the mining pipeline
   */
  async execute(sources: DataSource[]): Promise<ExtendedMiningResult> {
    this.pipeline.sources = sources;
    this.updateProgress(0, 'Initializing mining pipeline...');

    try {
      // Phase 1: Data Ingestion and Processing
      await this.ingestData();
      this.updateProgress(20, 'Data ingestion complete');

      // Phase 2: ESP File Analysis
      await this.processESPFiles();
      this.updateProgress(35, 'ESP analysis complete');

      // Phase 3: Asset Correlation
      await this.correlateAssets();
      this.updateProgress(50, 'Asset correlation complete');

      // Phase 4: Dependency Analysis
      await this.analyzeDependencies();
      this.updateProgress(60, 'Dependency analysis complete');

      // Phase 5: Performance Analysis
      await this.analyzePerformance();
      this.updateProgress(75, 'Performance analysis complete');

      // Phase 6: Intelligent Asset Discovery
      await this.discoverAssets();
      this.updateProgress(100, 'Asset discovery complete');

      this.pipeline.output.processedAt = Date.now();
      return this.pipeline.output as ExtendedMiningResult;

    } catch (error) {
      console.error('Mining pipeline failed:', error);
      this.pipeline.output.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return this.pipeline.output as ExtendedMiningResult;
    }
  }

  private async ingestData(): Promise<void> {
    const allAssets: AssetReference[] = [];

    for (const source of this.pipeline.sources) {
      try {
        const assets = await this.scanDataSource(source);
        allAssets.push(...assets);
      } catch (error) {
        console.warn(`Failed to scan source ${source.path}:`, error);
        this.pipeline.output.errors.push(`Source scan failed: ${source.path}`);
      }
    }

    // Initialize processors
    this.pipeline.processors = [
      {
        name: 'ESP Processor',
        process: async (data: any) => {
          if (data.type === 'esp') {
            return await ESPParser.parseFile(data.path);
          }
          return data;
        },
        supportedTypes: ['esp', 'esm']
      }
    ];

    // Initialize correlator
    const correlator = new AssetCorrelator();
    correlator.addAssets(allAssets);
    this.pipeline.correlators = [correlator];

    // Initialize analyzers
    this.pipeline.analyzers = [
      new PerformanceAnalyzer()
    ];
  }

  private async scanDataSource(source: DataSource): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];

    if (!fs.existsSync(source.path)) {
      throw new Error(`Source path does not exist: ${source.path}`);
    }

    const stats = fs.statSync(source.path);
    if (stats.isFile()) {
      assets.push(this.createAssetReference(source.path, source.type));
    } else if (stats.isDirectory()) {
      await this.scanDirectory(source.path, source.type, assets);
    }

    return assets;
  }

  private async scanDirectory(dirPath: string, type: string, assets: AssetReference[]): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await this.scanDirectory(fullPath, type, assets);
      } else if (entry.isFile()) {
        // Check if file matches the expected type
        if (this.matchesFileType(entry.name, type)) {
          assets.push(this.createAssetReference(fullPath, type));
        }
      }
    }
  }

  private matchesFileType(filename: string, type: string): boolean {
    const lowerName = filename.toLowerCase();

    switch (type) {
      case 'esp':
        return lowerName.endsWith('.esp') || lowerName.endsWith('.esm');
      case 'nif':
        return lowerName.endsWith('.nif');
      case 'dds':
        return lowerName.endsWith('.dds');
      case 'hkx':
        return lowerName.endsWith('.hkx');
      case 'seq':
        return lowerName.endsWith('.seq');
      case 'log':
        return lowerName.endsWith('.log');
      case 'config':
        return lowerName.endsWith('.ini') || lowerName.endsWith('.json');
      case 'benchmark':
        return lowerName.includes('benchmark') || lowerName.includes('performance');
      default:
        return true; // Accept all files for unknown types
    }
  }

  private createAssetReference(filePath: string, type: string): AssetReference {
    return {
      type: type as AssetReference['type'],
      path: filePath,
      formId: undefined, // Will be filled during correlation
      recordType: undefined
    };
  }

  private async processESPFiles(): Promise<void> {
    const espSources = this.pipeline.sources.filter(s => s.type === 'esp');

    for (const source of espSources) {
      try {
        const espData = await ESPParser.parseFile(source.path);
        const filename = path.basename(source.path);
        this.pipeline.output.espData.set(filename, espData);
      } catch (error) {
        console.warn(`Failed to process ESP file ${source.path}:`, error);
        this.pipeline.output.errors.push(`ESP processing failed: ${source.path}`);
      }
    }
  }

  private async correlateAssets(): Promise<void> {
    if (this.pipeline.correlators.length === 0) return;

    const correlator = this.pipeline.correlators[0];
    const allAssets = this.gatherAllAssets();

    try {
      this.pipeline.output.correlations = await correlator.correlate(allAssets);
    } catch (error) {
      console.warn('Asset correlation failed:', error);
      this.pipeline.output.errors.push('Asset correlation failed');
    }
  }

  private async analyzeDependencies(): Promise<void> {
    const modFiles = Array.from(this.pipeline.output.espData.keys())
      .map(filename => {
        // Find the source path for this file
        const source = this.pipeline.sources.find(s =>
          path.basename(s.path) === filename
        );
        return source?.path;
      })
      .filter(Boolean) as string[];

    if (modFiles.length === 0) return;

    const builder = new DependencyGraphBuilder();
    try {
      this.pipeline.output.dependencyGraph = await builder.buildGraph(modFiles);
    } catch (error) {
      console.warn('Dependency analysis failed:', error);
      this.pipeline.output.errors.push('Dependency analysis failed');
    }
  }

  private async analyzePerformance(): Promise<void> {
    // Performance impact analysis is a comparative technique: it needs at least
    // two real benchmark samples (different load-order/mod combinations) to
    // compute FPS/memory/stability deltas per mod. That data can only come from
    // the user's own measurements — it is never invented here. Add a
    // `benchmark` data source (a JSON file — see loadBenchmarkMetrics() below)
    // to populate this report.
    const metrics = await this.loadBenchmarkMetrics();
    if (metrics.length === 0) {
      // Honest empty state — no fabricated FPS/memory numbers.
      return;
    }

    const performanceAnalyzer = this.pipeline.analyzers.find(a => a instanceof PerformanceAnalyzer) as PerformanceAnalyzer;
    if (performanceAnalyzer) {
      try {
        this.pipeline.output.performanceReport = await performanceAnalyzer.analyze(metrics);
      } catch (error) {
        console.warn('Performance analysis failed:', error);
        this.pipeline.output.errors.push('Performance analysis failed');
      }
    }
  }

  /**
   * Load real benchmark samples from any `benchmark`-type data sources.
   * Expected JSON shape: an array of objects (or a single object) with
   * `{ modCombination?: string[], fps: number, memoryUsage?: number,
   *    loadTime?: number, stabilityScore?: number, conflictCount?: number }`
   * — e.g. exported from CapFrameX/PresentMon/FRAPS runs at different load
   * orders. Entries missing a numeric `fps` are skipped rather than guessed.
   */
  private async loadBenchmarkMetrics(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const benchmarkSources = this.pipeline.sources.filter(s => s.type === 'benchmark');

    for (const source of benchmarkSources) {
      try {
        const raw = JSON.parse(await fs.promises.readFile(source.path, 'utf-8'));
        const entries = Array.isArray(raw) ? raw : [raw];
        for (const e of entries) {
          if (!e || typeof e.fps !== 'number') continue;
          metrics.push({
            modCombination: Array.isArray(e.modCombination) ? e.modCombination : [],
            fps: e.fps,
            memoryUsage: typeof e.memoryUsage === 'number' ? e.memoryUsage : 0,
            loadTime: typeof e.loadTime === 'number' ? e.loadTime : 0,
            stabilityScore: typeof e.stabilityScore === 'number' ? e.stabilityScore : 100,
            conflictCount: typeof e.conflictCount === 'number' ? e.conflictCount : 0,
            timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
            hardwareProfile: e.hardwareProfile ?? this.getRealHardwareProfile()
          });
        }
      } catch (error) {
        console.warn(`Failed to read benchmark source ${source.path}:`, error);
        this.pipeline.output.errors.push(`Benchmark data unreadable: ${path.basename(source.path)}`);
      }
    }

    return metrics;
  }

  /** Real hardware profile read from the host OS (used as a fallback when a benchmark entry omits one). */
  private getRealHardwareProfile(): HardwareProfile {
    const cpus = os.cpus();
    const totalMemGB = os.totalmem() / (1024 ** 3);
    return {
      cpu: {
        model: cpus[0]?.model?.trim() || 'Unknown',
        cores: cpus.length,
        threads: cpus.length,
        baseClock: cpus[0] ? Math.round((cpus[0].speed / 1000) * 10) / 10 : 0,
        boostClock: 0,
        cache: 0
      },
      gpu: { model: 'Unknown', vram: 0, driverVersion: '', dxVersion: '', rayTracing: false },
      ram: { total: Math.round(totalMemGB), speed: 0, type: 'Unknown', channels: 0 },
      storage: { type: 'Unknown', readSpeed: 0, writeSpeed: 0, totalSpace: 0, availableSpace: 0 },
      os: {
        name: os.type(),
        version: os.release(),
        architecture: this.mapArch(os.arch())
      }
    };
  }

  private mapArch(arch: string): 'x64' | 'x86' | 'arm64' | 'Unknown' {
    if (arch === 'x64' || arch === 'arm64') return arch;
    if (arch === 'ia32') return 'x86';
    return 'Unknown';
  }

  private async discoverAssets(): Promise<void> {
    const extendedOutput = this.pipeline.output as ExtendedMiningResult;

    // Initialize asset discovery results
    extendedOutput.assetDiscovery = {
      unusedAssets: {
        totalAssets: 0,
        unusedAssets: [],
        potentialSpaceSavings: 0,
        recommendations: []
      },
      lodOptimizations: {
        totalMeshes: 0,
        optimizedMeshes: [],
        recommendations: []
      },
      textureResolutions: {
        totalTextures: 0,
        lowResTextures: [],
        recommendations: [],
        potentialQualityImprovement: 0
      },
      animationOptimizations: {
        totalAnimations: 0,
        optimizableAnimations: [],
        recommendations: [],
        potentialSavings: {
          totalFileSize: 0,
          totalMemory: 0,
          totalCPU: 0
        }
      }
    };

    try {
      // Scan for BSA archives
      const bsaArchives = await this.scanForBSAs();
      const espFiles = Array.from(this.pipeline.output.espData.values());

      // Unused Asset Detection
      extendedOutput.assetDiscovery.unusedAssets = await UnusedAssetDetector.detectUnusedAssets(bsaArchives, this.pipeline.output.espData);

      // LOD Analysis
      const lodMeshes = await this.scanForLODMeshes();
      extendedOutput.assetDiscovery.lodOptimizations = await LODAnalyzer.analyzeLODs(lodMeshes);

      // Texture Resolution Analysis
      const textures = await this.scanForTextures();
      extendedOutput.assetDiscovery.textureResolutions = await TextureResolutionAnalyzer.analyzeTextures(textures);

      // Animation Analysis
      const animations = await this.scanForAnimations();
      extendedOutput.assetDiscovery.animationOptimizations = await AnimationFrameAnalyzer.analyzeAnimations(animations);

    } catch (error) {
      console.warn('Asset discovery failed:', error);
      this.pipeline.output.errors.push('Asset discovery failed');
    }
  }

  private gatherAllAssets(): AssetReference[] {
    const assets: AssetReference[] = [];

    // Add assets from all sources
    for (const source of this.pipeline.sources) {
      if (source.type !== 'esp') { // ESP files are handled separately
        try {
          const sourceAssets = fs.statSync(source.path).isDirectory()
            ? this.getAssetsFromDirectory(source.path, source.type)
            : [this.createAssetReference(source.path, source.type)];
          assets.push(...sourceAssets);
        } catch (error) {
          // Skip invalid sources
        }
      }
    }

    return assets;
  }

  private getAssetsFromDirectory(dirPath: string, type: string): AssetReference[] {
    const assets: AssetReference[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && this.matchesFileType(entry.name, type)) {
          assets.push(this.createAssetReference(path.join(dirPath, entry.name), type));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return assets;
  }

  private async scanForBSAs(): Promise<any[]> {
    const bsaArchives: any[] = [];

    for (const source of this.pipeline.sources) {
      if (source.type === 'bsa') {
        try {
          if (fs.statSync(source.path).isDirectory()) {
            const archives = await UnusedAssetDetector.scanDirectoryForBSAs(source.path);
            bsaArchives.push(...archives);
          } else if (source.path.toLowerCase().endsWith('.bsa')) {
            const archive = await BSAParser.parseArchive(source.path);
            bsaArchives.push(archive);
          }
        } catch (error) {
          console.warn(`Failed to scan BSA source ${source.path}:`, error);
        }
      }
    }

    return bsaArchives;
  }

  private async scanForLODMeshes(): Promise<any[]> {
    const lodMeshes: any[] = [];

    for (const source of this.pipeline.sources) {
      if (source.type === 'nif') {
        try {
          const assets = await this.scanDataSource(source);
          for (const asset of assets) {
            if (asset.path.toLowerCase().includes('lod') || asset.path.toLowerCase().endsWith('.nif')) {
              const lodInfo = await LODAnalyzer.parseNIFLODInfo(asset.path);
              if (lodInfo) {
                lodMeshes.push(lodInfo);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to scan LOD meshes from ${source.path}:`, error);
        }
      }
    }

    return lodMeshes;
  }

  private async scanForTextures(): Promise<any[]> {
    const textures: any[] = [];

    for (const source of this.pipeline.sources) {
      if (source.type === 'dds') {
        try {
          const assets = await this.scanDataSource(source);
          for (const asset of assets) {
            if (asset.path.toLowerCase().endsWith('.dds')) {
              const textureInfo = await TextureResolutionAnalyzer.parseDDSTextureInfo(asset.path);
              if (textureInfo) {
                textures.push(textureInfo);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to scan textures from ${source.path}:`, error);
        }
      }
    }

    return textures;
  }

  private async scanForAnimations(): Promise<any[]> {
    const animations: any[] = [];

    for (const source of this.pipeline.sources) {
      if (source.type === 'hkx') {
        try {
          const assets = await this.scanDataSource(source);
          for (const asset of assets) {
            if (asset.path.toLowerCase().endsWith('.hkx')) {
              const animationInfo = await AnimationFrameAnalyzer.parseHKXAnimationInfo(asset.path);
              if (animationInfo) {
                animations.push(animationInfo);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to scan animations from ${source.path}:`, error);
        }
      }
    }

    return animations;
  }

  private updateProgress(progress: number, task: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, task);
    }
  }

}