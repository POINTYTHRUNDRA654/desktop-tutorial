import { EventEmitter } from 'events';
import { getRealHardwareProfile } from './hardwareProfiler';
import {
  HardwareAwareMiningEngine,
  HardwareProfile,
  HardwareCompatibility,
  HardwareRecommendation,
  HardwarePerformancePrediction,
  HardwareOptimization,
  HardwareRequirements,
  CPUInfo,
  GPUInfo,
  RAMInfo,
  StorageInfo,
  OSInfo,
  Phase2MiningResult,
  MiningStatus,
  PerformanceMetric
} from '../shared/types';

export interface HardwareAwareConfig {
  enableHardwareDetection: boolean;
  benchmarkInterval: number; // days
  compatibilityThreshold: number; // 0-1
  optimizationCachePath?: string;
  enableAdaptiveRecommendations: boolean;
}

export class HardwareAwareMiningEngineImpl extends EventEmitter implements HardwareAwareMiningEngine {
  private config: HardwareAwareConfig;
  private isRunning: boolean = false;

  constructor(config: HardwareAwareConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('stopped');
  }

  async getStatus(): Promise<MiningStatus> {
    return {
      active: this.isRunning,
      progress: 100,
      currentTask: this.isRunning ? 'Analyzing hardware compatibility' : 'Idle',
      engineType: 'hardware-aware',
      engine: 'hardware-aware',
      startTime: Date.now()
    };
  }

  async analyzeHardwareCompatibility(mods: string[]): Promise<HardwareCompatibility[]> {
    const hardwareProfile = await this.getHardwareProfile();

    const results: HardwareCompatibility[] = [];

    for (const mod of mods) {
      const compatibility = await this.calculateCompatibilityScore(mod, hardwareProfile);
      const requirements = await this.estimateRequirements(mod);

      results.push({
        modName: mod,
        compatibility,
        requirements,
        recommendations: this.generateRecommendations(compatibility, hardwareProfile),
        warnings: this.generateWarnings(compatibility)
      });
    }

    return results;
  }

  async generateHardwareSpecificRecommendations(profile: HardwareProfile): Promise<HardwareRecommendation[]> {
    const recommendations: HardwareRecommendation[] = [];

    // CPU recommendations
    if (profile.cpu.cores < 4) {
      recommendations.push({
        type: 'upgrade',
        component: 'cpu',
        description: 'Upgrade CPU to at least 4 cores for better multi-threading performance',
        priority: 'high',
        performanceGain: 25,
        affectedMods: ['Multi-threaded mods'],
        iniSettings: {},
        loadOrderAdjustments: [],
        textureSettings: [],
        meshSettings: [],
        expectedPerformance: {
          baselinePerformance: this.buildPerformanceMetric(profile, this.calculateBaselineFPS(profile)),
          predictedPerformance: this.buildPerformanceMetric(
            profile,
            this.calculateBaselineFPS({ ...profile, cpu: { ...profile.cpu, cores: 4, threads: Math.max(profile.cpu.threads, 8) } })
          ),
          confidence: 0.8,
          limitingFactors: ['CPU cores'],
          optimizationSuggestions: []
        }
      });
    }

    // GPU recommendations
    if (profile.gpu.vram < 4) {
      recommendations.push({
        type: 'upgrade',
        component: 'gpu',
        description: 'Upgrade GPU to at least 4GB VRAM for high-resolution textures',
        priority: 'high',
        performanceGain: 30,
        affectedMods: ['High-res textures'],
        iniSettings: {},
        loadOrderAdjustments: [],
        textureSettings: [],
        meshSettings: [],
        expectedPerformance: {
          baselinePerformance: this.buildPerformanceMetric(profile, this.calculateBaselineFPS(profile)),
          predictedPerformance: this.buildPerformanceMetric(
            profile,
            this.calculateBaselineFPS({ ...profile, gpu: { ...profile.gpu, vram: 4 } })
          ),
          confidence: 0.8,
          limitingFactors: ['GPU VRAM'],
          optimizationSuggestions: []
        }
      });
    }

    // RAM recommendations
    if (profile.ram.total < 16) {
      recommendations.push({
        type: 'upgrade',
        component: 'ram',
        description: 'Upgrade RAM to at least 16GB for large mod collections',
        priority: 'medium',
        performanceGain: 15,
        affectedMods: ['Large mod collections'],
        iniSettings: {},
        loadOrderAdjustments: [],
        textureSettings: [],
        meshSettings: [],
        expectedPerformance: {
          baselinePerformance: this.buildPerformanceMetric(profile, this.calculateBaselineFPS(profile)),
          predictedPerformance: this.buildPerformanceMetric(
            profile,
            this.calculateBaselineFPS({ ...profile, ram: { ...profile.ram, total: 16 } })
          ),
          confidence: 0.8,
          limitingFactors: ['System RAM'],
          optimizationSuggestions: []
        }
      });
    }

    return recommendations;
  }

  async predictPerformanceForHardware(mods: string[], targetHardware: HardwareProfile): Promise<HardwarePerformancePrediction> {
    // Estimate derived from real hardware tiering (see calculateBaselineFPS); mod count
    // is a rough linear proxy for script/render load since we don't profile each mod individually.
    const baselineFPS = this.calculateBaselineFPS(targetHardware);
    const modImpact = mods.length * 2; // Rough estimate: 2 FPS drop per mod

    return {
      baselinePerformance: this.buildPerformanceMetric(targetHardware, baselineFPS, targetHardware.ram.total * 0.7),
      predictedPerformance: this.buildPerformanceMetric(targetHardware, Math.max(baselineFPS - modImpact, 20), targetHardware.ram.total * 0.8),
      confidence: 0.75,
      limitingFactors: this.identifyBottlenecks(targetHardware, mods),
      optimizationSuggestions: await this.generateOptimizations(targetHardware, mods)
    };
  }

  async optimizeForHardware(mods: string[], hardwareProfile: HardwareProfile): Promise<HardwareOptimization[]> {
    return this.generateOptimizations(hardwareProfile, mods);
  }

  async getResults(): Promise<Phase2MiningResult> {
    const hardwareProfile = await this.getHardwareProfile();
    const compatibilityAnalysis = await this.analyzeHardwareCompatibility([]);
    const recommendations = await this.generateHardwareSpecificRecommendations(hardwareProfile);
    const metadata = {
      hardwareProfile,
      compatibilityAnalysis,
      recommendations,
      optimizationHistory: []
    };

    return {
      engine: 'hardware-aware',
      timestamp: new Date(),
      timestampNum: Date.now(),
      predictions: [],
      insights: [],
      recommendations: recommendations,
      metadata,
      resultMetadata: metadata
    };
  }

  // Helper methods

  /** Real hardware detection, shared with performance-bottleneck-engine.ts's SystemProfiler. */
  private async getHardwareProfile(): Promise<HardwareProfile> {
    return getRealHardwareProfile();
  }

  private async calculateCompatibilityScore(mod: string, hardware: HardwareProfile): Promise<HardwareCompatibility['compatibility']> {
    // Ratio of the real detected hardware against the baseline tier used across this engine
    // (8 cores / 8GB VRAM / 32GB RAM / 500GB free storage) so recommendations stay consistent.
    const lower = mod.toLowerCase();
    const isTextureHeavy = /texture|4k|8k|hd|retexture/.test(lower);
    const isScriptHeavy = /script|papyrus|framework|sim settlement/.test(lower);

    return {
      cpu: Math.min(hardware.cpu.cores / (isScriptHeavy ? 10 : 8), 1),
      gpu: Math.min(hardware.gpu.vram / (isTextureHeavy ? 10 : 8), 1),
      ram: Math.min(hardware.ram.total / 32, 1),
      storage: Math.min(hardware.storage.availableSpace / 500, 1)
    };
  }

  private async estimateRequirements(mod: string): Promise<HardwareRequirements> {
    // Baseline community-standard tiers for modded FO4, nudged by mod-name keywords
    // (texture/script-heavy mods raise their respective bottleneck requirement).
    const lower = mod.toLowerCase();
    const isTextureHeavy = /texture|4k|8k|hd|retexture/.test(lower);
    const isScriptHeavy = /script|papyrus|framework|sim settlement/.test(lower);

    return {
      minimum: {
        cpu: { model: 'Intel i5', cores: isScriptHeavy ? 6 : 4, threads: isScriptHeavy ? 12 : 8, baseClock: 3.0, boostClock: 4.0, cache: 8 },
        gpu: { model: isTextureHeavy ? 'GTX 1070' : 'GTX 1060', vram: isTextureHeavy ? 8 : 4, driverVersion: '400', dxVersion: '11', rayTracing: false },
        ram: { total: 8, speed: 2133, type: 'DDR4', channels: 2 },
        storage: { type: 'SSD', readSpeed: 500, writeSpeed: 400, totalSpace: isTextureHeavy ? 1000 : 500, availableSpace: isTextureHeavy ? 400 : 200 },
        os: { name: 'Windows', version: '10', architecture: 'x64' }
      },
      recommended: {
        cpu: { model: 'Intel i7', cores: isScriptHeavy ? 8 : 6, threads: isScriptHeavy ? 16 : 12, baseClock: 3.5, boostClock: 4.5, cache: 12 },
        gpu: { model: isTextureHeavy ? 'RTX 3070' : 'RTX 2060', vram: isTextureHeavy ? 8 : 6, driverVersion: '450', dxVersion: '12', rayTracing: isTextureHeavy },
        ram: { total: 16, speed: 3200, type: 'DDR4', channels: 2 },
        storage: { type: 'NVMe', readSpeed: 2000, writeSpeed: 1800, totalSpace: 1000, availableSpace: 500 },
        os: { name: 'Windows', version: '11', architecture: 'x64' }
      },
      estimatedPerformance: {
        minSpecFPS: 30,
        recSpecFPS: 60
      }
    };
  }

  private generateRecommendations(compatibility: HardwareCompatibility['compatibility'], hardware: HardwareProfile): string[] {
    const recommendations: string[] = [];

    if (compatibility.cpu < 0.7) recommendations.push('Consider CPU upgrade for better performance');
    if (compatibility.gpu < 0.7) recommendations.push('GPU upgrade recommended for high-res textures');
    if (compatibility.ram < 0.7) recommendations.push('More RAM needed for large mod collections');
    if (compatibility.storage < 0.7) recommendations.push('SSD/NVMe storage recommended for faster loading');

    return recommendations;
  }

  private generateWarnings(compatibility: HardwareCompatibility['compatibility']): string[] {
    const warnings: string[] = [];

    if (compatibility.cpu < 0.5) warnings.push('CPU may bottleneck performance significantly');
    if (compatibility.gpu < 0.5) warnings.push('GPU insufficient for modern graphics mods');
    if (compatibility.ram < 0.5) warnings.push('Insufficient RAM may cause crashes with many mods');
    if (compatibility.storage < 0.5) warnings.push('Slow storage will increase load times dramatically');

    return warnings;
  }

  private calculateBaselineFPS(hardware: HardwareProfile): number {
    // Simple FPS calculation based on hardware specs
    const cpuScore = hardware.cpu.cores * hardware.cpu.baseClock;
    const gpuScore = hardware.gpu.vram * 10;
    const ramScore = hardware.ram.total;

    return Math.min(60 + (cpuScore + gpuScore + ramScore) / 10, 120);
  }

  private identifyBottlenecks(hardware: HardwareProfile, mods: string[]): string[] {
    const bottlenecks: string[] = [];

    if (hardware.cpu.cores < 6) bottlenecks.push('CPU cores');
    if (hardware.gpu.vram < 6) bottlenecks.push('GPU VRAM');
    if (hardware.ram.total < 16) bottlenecks.push('System RAM');
    if (hardware.storage.type === 'HDD') bottlenecks.push('Storage speed');

    if (mods.length > 50) bottlenecks.push('Too many mods');

    return bottlenecks;
  }

  private async generateOptimizations(hardware: HardwareProfile, mods: string[]): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    // Texture resolution optimization
    if (hardware.gpu.vram < 8) {
      optimizations.push({
        type: 'texture_resolution',
        description: 'Reduce texture resolution to improve performance on lower VRAM GPUs',
        currentSetting: 'Ultra',
        recommendedSetting: 'High',
        performanceImpact: { fps: 15, quality: -20 },
        compatibility: mods.filter(m => m.includes('texture'))
      });
    }

    // Mesh LOD optimization
    optimizations.push({
      type: 'mesh_lod',
      description: 'Enable mesh level of detail for distant objects to improve performance',
      currentSetting: 'Disabled',
      recommendedSetting: 'Enabled',
      performanceImpact: { fps: 10, quality: 0 },
      compatibility: mods.filter(m => m.includes('mesh'))
    });

    // Shadow quality optimization
    if (hardware.gpu.vram < 6) {
      optimizations.push({
        type: 'shadow_quality',
        description: 'Reduce shadow quality for better performance on lower-end GPUs',
        currentSetting: 'Ultra',
        recommendedSetting: 'High',
        performanceImpact: { fps: 8, quality: -15 },
        compatibility: mods.filter(m => m.includes('lighting'))
      });
    }

    return optimizations;
  }

  private buildPerformanceMetric(hardware: HardwareProfile, fps: number = 60, memoryUsage: number = 8): PerformanceMetric {
    return {
      modCombination: [],
      conflictCount: 0,
      timestamp: Date.now(),
      hardwareProfile: hardware,
      fps,
      memoryUsage,
      loadTime: 30,
      stabilityScore: 0.85
    };
  }
}

// Export the implementation as the interface name for easier importing
export { HardwareAwareMiningEngineImpl as HardwareAwareMiningEngine };