import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { getRealHardwareProfile, getRealtimeSystemMetrics } from './hardwareProfiler';
import {
  PerformanceBottleneckEngine,
  MiningStatus,
  BottleneckAnalysis,
  Phase2PerformanceBottleneck,
  PerformancePrediction,
  OptimizationRecommendation,
  RealtimeMetrics,
  ModChange,
  HardwareProfile,
  PerformanceData,
  PerformanceMetric,
  Phase2SystemLimitation
} from '../shared/types';

export interface PerformanceBottleneckConfig {
  monitoringInterval: number; // ms
  bottleneckThresholds: {
    cpu: number;
    gpu: number;
    memory: number;
    fps: number;
  };
  enableRealTimeMonitoring: boolean;
  historicalDataPath?: string;
  predictionHorizon?: number; // minutes
}

export class PerformanceBottleneckDetectionEngine extends EventEmitter implements PerformanceBottleneckEngine {
  private config: PerformanceBottleneckConfig;
  private isRunning: boolean = false;
  private monitoringTimer?: NodeJS.Timeout;
  private performanceHistory: PerformanceMetric[] = [];
  private bottleneckPatterns: BottleneckPattern[] = [];
  private changePredictionHistory: PerformancePrediction[] = [];
  private systemProfiler: SystemProfiler;

  constructor(config: PerformanceBottleneckConfig) {
    super();
    this.config = config;
    this.systemProfiler = new SystemProfiler();
  }

  async start(): Promise<void> {
    this.emit('status', { status: 'starting', message: 'Initializing performance bottleneck detection' });

    try {
      this.isRunning = true;

      // Load historical data
      await this.loadHistoricalData();

      // Initialize bottleneck patterns
      this.initializeBottleneckPatterns();

      // Start real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      this.emit('status', { status: 'running', message: 'Performance bottleneck detection active' });
    } catch (error) {
      this.emit('status', { status: 'error', message: `Failed to start performance engine: ${error}` });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.emit('status', { status: 'stopping', message: 'Stopping performance bottleneck detection' });

    this.isRunning = false;

    // Stop monitoring
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    // Save historical data
    await this.saveHistoricalData();

    this.emit('status', { status: 'stopped', message: 'Performance bottleneck detection stopped' });
  }

  async getStatus(): Promise<MiningStatus> {
    const realtimeMetrics = this.config.enableRealTimeMonitoring ?
      await this.monitorRealTimePerformance() : null;

    return {
      active: this.isRunning,
      progress: this.performanceHistory.length > 0 ? 100 : 0,
      currentTask: this.isRunning ? 'Monitoring performance' : 'Idle',
      engineType: 'performance-bottleneck',
      engine: 'performance-bottleneck',
      startTime: Date.now()
    };
  }

  async getResults(): Promise<any> {
    const recentAnalysis = this.performanceHistory.length > 0 ?
      await this.analyzeBottlenecks({
        metrics: this.performanceHistory.slice(-50), // Last 50 measurements
        systemInfo: await this.systemProfiler.getCurrentProfile(),
        loadOrder: [], // Would need to be provided
        sessionDuration: 0
      }) : null;

    return {
      engine: 'performance-bottleneck',
      timestamp: new Date(),
      currentAnalysis: recentAnalysis,
      historicalTrends: this.analyzeTrends(),
      bottleneckPatterns: this.bottleneckPatterns,
      recommendations: recentAnalysis?.optimizationOpportunities || [],
      metadata: {
        totalMeasurements: this.performanceHistory.length,
        monitoringActive: this.config.enableRealTimeMonitoring,
        lastAnalysis: recentAnalysis ? new Date() : null
      }
    };
  }

  async analyzeBottlenecks(performanceData: PerformanceData): Promise<BottleneckAnalysis> {
    this.emit('status', { status: 'running', message: 'Analyzing performance bottlenecks' });

    const bottlenecks = await this.identifyBottlenecks(performanceData);
    const criticalPath = this.calculateCriticalPath(bottlenecks);
    const systemLimitations = await this.assessSystemLimitations(performanceData.systemInfo);
    const optimizationOpportunities = await this.identifyOptimizationOpportunities(performanceData.systemInfo);

    const analysis: BottleneckAnalysis = {
      primaryBottlenecks: bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high'),
      secondaryBottlenecks: bottlenecks.filter(b => b.severity === 'medium' || b.severity === 'low'),
      criticalPath,
      systemLimitations,
      optimizationOpportunities,
      confidence: this.calculateAnalysisConfidence(bottlenecks)
    };

    this.emit('status', { status: 'completed', message: 'Bottleneck analysis completed' });

    return analysis;
  }

  async predictPerformanceImpact(modChanges: ModChange[]): Promise<PerformancePrediction[]> {
    const predictions: PerformancePrediction[] = [];

    for (const change of modChanges) {
      const prediction = await this.predictSingleChange(change);
      predictions.push(prediction);
    }

    return predictions;
  }

  async identifyOptimizationOpportunities(systemProfile: HardwareProfile): Promise<OptimizationRecommendation[]> {
    const opportunities: OptimizationRecommendation[] = [];

    // Analyze system capabilities and suggest optimizations
    const gpuTier = this.categorizeGPU(systemProfile.gpu);
    const cpuTier = this.categorizeCPU(systemProfile.cpu);
    const ramTier = this.categorizeRAM(systemProfile.ram);

    // GPU-based optimizations
    if (gpuTier === 'low') {
      opportunities.push({
        type: 'texture',
        description: 'Reduce texture resolution to improve GPU performance',
        potentialGain: { fps: 15, memory: -512, loadTime: -2 },
        difficulty: 'easy',
        prerequisites: [],
        affectedMods: []
      });
    }

    // CPU-based optimizations
    if (cpuTier === 'low') {
      opportunities.push({
        type: 'script',
        description: 'Optimize or reduce script-heavy mods',
        potentialGain: { fps: 10, memory: -128, loadTime: -1 },
        difficulty: 'medium',
        prerequisites: ['Script analysis tools'],
        affectedMods: []
      });
    }

    // Memory-based optimizations
    if (ramTier === 'low') {
      opportunities.push({
        type: 'config',
        description: 'Reduce texture cache and buffer sizes',
        potentialGain: { fps: 8, memory: -1024, loadTime: -3 },
        difficulty: 'easy',
        prerequisites: [],
        affectedMods: []
      });
    }

    return opportunities;
  }

  async monitorRealTimePerformance(): Promise<RealtimeMetrics> {
    // No live FO4 process telemetry hook exists, so FPS falls back to the average of
    // the most recent recorded sessions rather than a fabricated constant.
    const recentFpsSamples = this.performanceHistory.slice(-5).map(p => p.fps).filter((v): v is number => typeof v === 'number' && v > 0);
    const recentFps = recentFpsSamples.length > 0 ? recentFpsSamples.reduce((a, b) => a + b, 0) / recentFpsSamples.length : 0;

    // Collect current system metrics
    const currentMetrics = await this.systemProfiler.getRealtimeMetrics(recentFps);

    // Analyze for bottlenecks
    const bottleneckIndicators = this.analyzeRealtimeBottlenecks(currentMetrics);

    return {
      currentFPS: currentMetrics.fps,
      memoryUsage: currentMetrics.memoryUsage || 0,
      cpuUsage: currentMetrics.cpuUsage || 0,
      gpuUsage: currentMetrics.gpuUsage || 0,
      activeMods: [], // Would need to be tracked separately
      bottleneckIndicators,
      timestamp: Date.now()
    };
  }

  private async identifyBottlenecks(performanceData: PerformanceData): Promise<Phase2PerformanceBottleneck[]> {
    const bottlenecks: Phase2PerformanceBottleneck[] = [];

    // Analyze FPS patterns
    const fpsBottleneck = this.analyzeFPSBottleneck(performanceData.metrics);
    if (fpsBottleneck) bottlenecks.push(fpsBottleneck);

    // Analyze memory usage
    const memoryBottleneck = this.analyzeMemoryBottleneck(performanceData.metrics);
    if (memoryBottleneck) bottlenecks.push(memoryBottleneck);

    // Analyze load times
    const loadTimeBottleneck = this.analyzeLoadTimeBottleneck(performanceData.metrics);
    if (loadTimeBottleneck) bottlenecks.push(loadTimeBottleneck);

    // Analyze system resource usage
    const systemBottlenecks = await this.analyzeSystemBottlenecks(performanceData.systemInfo);
    bottlenecks.push(...systemBottlenecks);

    return bottlenecks;
  }

  private analyzeFPSBottleneck(metrics: PerformanceMetric[]): Phase2PerformanceBottleneck | null {
    if (metrics.length === 0) return null;

    const avgFPS = metrics.reduce((sum, m) => sum + (typeof m.fps === 'number' ? m.fps : 0), 0) / metrics.length;
    const minFPS = Math.min(...metrics.map(m => typeof m.fps === 'number' ? m.fps : 0));

    if (avgFPS < this.config.bottleneckThresholds.fps) {
      return {
        type: 'cpu',
        severity: avgFPS < 20 ? 'critical' : avgFPS < 30 ? 'high' : 'medium',
        impact: {
          fps: -(60 - avgFPS),
          memory: 0,
          loadTime: 0
        },
        affectedMods: [], // Would need correlation analysis
        rootCause: `Average FPS (${avgFPS.toFixed(1)}) below threshold (${this.config.bottleneckThresholds.fps})`,
        mitigationStrategies: [
          {
            type: 'optimize',
            description: 'Reduce graphics settings and mod count',
            difficulty: 'medium',
            expectedImprovement: { fps: 10, memory: -256, loadTime: -1 },
            affectedMods: []
          }
        ],
        evidence: [
          {
            metric: 'average_fps',
            observedValue: avgFPS,
            expectedValue: this.config.bottleneckThresholds.fps,
            deviation: avgFPS - this.config.bottleneckThresholds.fps,
            confidence: 0.9
          }
        ]
      };
    }

    return null;
  }

  private analyzeMemoryBottleneck(metrics: PerformanceMetric[]): Phase2PerformanceBottleneck | null {
    if (metrics.length === 0) return null;

    const avgMemory = metrics.reduce((sum, m) => sum + (m.memoryUsage! ?? 0), 0) / metrics.length;
    const maxMemory = Math.max(...metrics.map(m => m.memoryUsage!));

    // Assume 8GB system memory as baseline
    const memoryThreshold = 6 * 1024; // 6GB

    if (avgMemory > memoryThreshold) {
      return {
        type: 'memory',
        severity: avgMemory > 7 * 1024 ? 'critical' : 'high',
        impact: {
          fps: -5,
          memory: avgMemory - memoryThreshold,
          loadTime: 2
        },
        affectedMods: [],
        rootCause: `High memory usage (${(avgMemory / 1024).toFixed(1)}GB) approaching system limits`,
        mitigationStrategies: [
          {
            type: 'optimize',
            description: 'Reduce texture sizes and disable memory-intensive mods',
            difficulty: 'medium',
            expectedImprovement: { fps: 5, memory: -1024, loadTime: -1 },
            affectedMods: []
          }
        ],
        evidence: [
          {
            metric: 'memory_usage_mb',
            observedValue: avgMemory,
            expectedValue: memoryThreshold,
            deviation: avgMemory - memoryThreshold,
            confidence: 0.85
          }
        ]
      };
    }

    return null;
  }

  private analyzeLoadTimeBottleneck(metrics: PerformanceMetric[]): Phase2PerformanceBottleneck | null {
    if (metrics.length === 0) return null;

    const avgLoadTime = metrics.reduce((sum, m) => sum + m.loadTime!, 0) / metrics.length;

    if (avgLoadTime > 30) { // 30 seconds threshold
      return {
        type: 'io',
        severity: avgLoadTime > 60 ? 'high' : 'medium',
        impact: {
          fps: 0,
          memory: 0,
          loadTime: avgLoadTime
        },
        affectedMods: [],
        rootCause: `Slow load times (${avgLoadTime.toFixed(1)}s) indicate I/O bottleneck`,
        mitigationStrategies: [
          {
            type: 'optimize',
            description: 'Move game to SSD, reduce mod count, optimize textures',
            difficulty: 'medium',
            expectedImprovement: { fps: 0, memory: 0, loadTime: -10 },
            affectedMods: []
          }
        ],
        evidence: [
          {
            metric: 'load_time_seconds',
            observedValue: avgLoadTime,
            expectedValue: 30,
            deviation: avgLoadTime - 30,
            confidence: 0.8
          }
        ]
      };
    }

    return null;
  }

  private async analyzeSystemBottlenecks(systemInfo: HardwareProfile): Promise<Phase2PerformanceBottleneck[]> {
    const bottlenecks: Phase2PerformanceBottleneck[] = [];

    // CPU analysis
    if (systemInfo.cpu && systemInfo.cpu.cores < 4) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        impact: { fps: -10, memory: 0, loadTime: 1 },
        affectedMods: [],
        rootCause: 'CPU may be limiting performance',
        mitigationStrategies: [],
        evidence: []
      });
    }

    // GPU analysis
    const gpu = systemInfo.gpu;
    if (gpu && gpu.vram < 4) {
      bottlenecks.push({
        type: 'gpu',
        severity: 'high',
        impact: { fps: -15, memory: 0, loadTime: 0 },
        affectedMods: [],
        rootCause: 'Limited GPU VRAM affecting texture loading',
        mitigationStrategies: [],
        evidence: []
      });
    }

    return bottlenecks;
  }

  private calculateCriticalPath(bottlenecks: Phase2PerformanceBottleneck[]): string[] {
    // Identify mods that appear in multiple bottleneck analyses
    const modFrequency: { [mod: string]: number } = {};

    bottlenecks.forEach(bottleneck => {
      bottleneck.affectedMods.forEach(mod => {
        modFrequency[mod] = (modFrequency[mod] || 0) + 1;
      });
    });

    // Return mods that appear in the most bottlenecks
    return Object.entries(modFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([mod]) => mod);
  }

  private async assessSystemLimitations(systemInfo: HardwareProfile): Promise<Phase2SystemLimitation[]> {
    const limitations = [];

    // Check CPU
    if (systemInfo.cpu && systemInfo.cpu.cores < 6) {
      limitations.push({
        component: 'cpu',
        currentCapacity: systemInfo.cpu.cores,
        recommendedMinimum: 6,
        isLimiting: true,
        upgradeSuggestions: ['Consider upgrading to 6+ core CPU']
      });
    }

    // Check GPU VRAM
    const gpu = systemInfo.gpu;
    if (gpu && gpu.vram < 8) {
      limitations.push({
        component: 'gpu',
        currentCapacity: gpu.vram,
        recommendedMinimum: 8,
        isLimiting: true,
        upgradeSuggestions: ['Upgrade to GPU with 8GB+ VRAM']
      });
    }

    // Check RAM
    if (systemInfo.ram && systemInfo.ram.total < 16) {
      limitations.push({
        component: 'ram',
        currentCapacity: systemInfo.ram.total,
        recommendedMinimum: 16,
        isLimiting: true,
        upgradeSuggestions: ['Upgrade to 16GB+ RAM']
      });
    }

    return limitations;
  }

  private async generateOptimizationOpportunities(bottlenecks: Phase2PerformanceBottleneck[], systemInfo: HardwareProfile): Promise<OptimizationRecommendation[]> {
    const opportunities: OptimizationRecommendation[] = [];

    // Generate opportunities based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'memory':
          opportunities.push({
            type: 'texture',
            description: 'Reduce texture resolution to lower memory usage',
            potentialGain: { fps: 5, memory: -512, loadTime: -1 },
            difficulty: 'easy',
            prerequisites: [],
            affectedMods: bottleneck.affectedMods
          });
          break;

        case 'gpu':
          opportunities.push({
            type: 'mesh',
            description: 'Optimize mesh LOD settings',
            potentialGain: { fps: 10, memory: -256, loadTime: 0 },
            difficulty: 'medium',
            prerequisites: ['LOD optimization tools'],
            affectedMods: bottleneck.affectedMods
          });
          break;

        case 'cpu':
          opportunities.push({
            type: 'script',
            description: 'Reduce script complexity or count',
            potentialGain: { fps: 8, memory: -128, loadTime: 0 },
            difficulty: 'hard',
            prerequisites: ['Script analysis tools'],
            affectedMods: bottleneck.affectedMods
          });
          break;
      }
    });

    return opportunities;
  }

  private calculateAnalysisConfidence(bottlenecks: Phase2PerformanceBottleneck[]): number {
    if (bottlenecks.length === 0) return 0;

    const avgConfidence = bottlenecks.reduce((sum, b) =>
      sum + b.evidence.reduce((eSum, e) => eSum + e.confidence, 0) / b.evidence.length, 0
    ) / bottlenecks.length;

    return Math.min(avgConfidence, 1.0);
  }

  private async predictSingleChange(change: ModChange): Promise<PerformancePrediction> {
    // Use historical data and patterns to predict impact
    const similarChanges = this.findSimilarChanges(change);

    let predictedImpact = { fps: 0, memory: 0, loadTime: 0 };
    let confidence = 0.5;

    if (similarChanges.length > 0) {
      // Average impact from similar changes
      predictedImpact = {
        fps: similarChanges.reduce((sum, c) => sum + c.predictedImpact.fps, 0) / similarChanges.length,
        memory: similarChanges.reduce((sum, c) => sum + c.predictedImpact.memory, 0) / similarChanges.length,
        loadTime: similarChanges.reduce((sum, c) => sum + c.predictedImpact.loadTime, 0) / similarChanges.length
      };
      confidence = Math.min(similarChanges.length / 10, 0.9); // More samples = higher confidence
    }

    const riskLevel = Math.abs(predictedImpact.fps) > 10 ? 'high' :
      Math.abs(predictedImpact.fps) > 5 ? 'medium' : 'low';

    const prediction: PerformancePrediction = {
      modChange: change,
      predictedImpact,
      confidence,
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
      recommendations: this.generateChangeRecommendations(change, predictedImpact)
    };

    // Record this prediction so future predictions for the same mod/change
    // type have real history to draw from instead of always starting cold.
    this.changePredictionHistory.push(prediction);
    if (this.changePredictionHistory.length > 200) {
      this.changePredictionHistory = this.changePredictionHistory.slice(-200);
    }

    return prediction;
  }

  private findSimilarChanges(change: ModChange): PerformancePrediction[] {
    // Real historical lookup: a "similar" change is a past recorded prediction
    // for the exact same mod undergoing the same kind of operation (add/remove/
    // update/reorder). Exact-mod matches are the most reliable signal we have;
    // same-type-different-mod matches are included only as a weaker fallback
    // when no exact-mod history exists yet.
    const exactMod = this.changePredictionHistory.filter(p =>
      p.modChange.modName === change.modName && p.modChange.type === change.type
    );
    if (exactMod.length > 0) return exactMod;

    return this.changePredictionHistory.filter(p => p.modChange.type === change.type);
  }

  private generateChangeRecommendations(change: ModChange, impact: any): string[] {
    const recommendations = [];

    if (impact.fps < -5) {
      recommendations.push('Monitor FPS after this change');
      recommendations.push('Consider alternative mods with better performance');
    }

    if (impact.memory > 256) {
      recommendations.push('Check available RAM before applying');
      recommendations.push('Consider reducing texture settings');
    }

    return recommendations;
  }

  private analyzeRealtimeBottlenecks(metrics: any): any[] {
    const indicators = [];

    if (metrics.cpuUsage > 90) {
      indicators.push({
        component: 'cpu',
        utilization: metrics.cpuUsage,
        threshold: 90,
        isBottleneck: true
      });
    }

    if (metrics.gpuUsage > 95) {
      indicators.push({
        component: 'gpu',
        utilization: metrics.gpuUsage,
        threshold: 95,
        isBottleneck: true
      });
    }

    if (metrics.memoryUsage > 90) { // Assuming percentage
      indicators.push({
        component: 'memory',
        utilization: metrics.memoryUsage,
        threshold: 90,
        isBottleneck: true
      });
    }

    return indicators;
  }

  private analyzeTrends(): any {
    const recent = this.performanceHistory.slice(-30);
    if (recent.length < 2) {
      return { fpsTrend: 'stable', memoryTrend: 'stable', loadTimeTrend: 'stable' };
    }

    const trendOf = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
      const n = values.length;
      const sumX = values.reduce((s, _, i) => s + i, 0);
      const sumY = values.reduce((s, v) => s + v, 0);
      const sumXY = values.reduce((s, v, i) => s + v * i, 0);
      const sumXX = values.reduce((s, _, i) => s + i * i, 0);
      const denom = n * sumXX - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      return slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    };

    const fpsNumber = (fps: PerformanceMetric['fps']): number => typeof fps === 'number' ? fps : (fps?.average ?? 0);

    return {
      fpsTrend: trendOf(recent.map(r => fpsNumber(r.fps))),
      memoryTrend: trendOf(recent.map(r => r.memoryUsage || 0)),
      loadTimeTrend: trendOf(recent.map(r => r.loadTime || 0))
    };
  }

  private initializeBottleneckPatterns(): void {
    // Initialize common bottleneck patterns
    this.bottleneckPatterns = [
      {
        pattern: 'high_memory_texture',
        indicators: ['memory_usage > 80%', 'fps_drop > 20%'],
        causes: ['High resolution textures', 'Too many texture mods'],
        solutions: ['Reduce texture resolution', 'Use texture optimization mods']
      },
      {
        pattern: 'cpu_script_overload',
        indicators: ['cpu_usage > 90%', 'script_count > 100'],
        causes: ['Too many active scripts', 'Complex script interactions'],
        solutions: ['Reduce script mods', 'Use script optimizers']
      }
    ];
  }

  private startRealTimeMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const metrics = await this.monitorRealTimePerformance();

        // Check for critical bottlenecks
        const criticalBottlenecks = metrics.bottleneckIndicators.filter(b => b.isBottleneck);

        if (criticalBottlenecks.length > 0) {
          this.emit('bottleneck-detected', {
            bottlenecks: criticalBottlenecks,
            metrics,
            timestamp: Date.now()
          });
        }

        // Store metrics for historical analysis. Stability is derived from how many
        // real bottleneck indicators fired this tick, not assumed.
        this.performanceHistory.push({
          modCombination: [],
          fps: metrics.currentFPS,
          memoryUsage: metrics.memoryUsage,
          loadTime: 0, // Not available in realtime
          stabilityScore: Math.max(0, 100 - metrics.bottleneckIndicators.filter(b => b.isBottleneck).length * 15),
          conflictCount: 0,
          timestamp: Date.now(),
          hardwareProfile: await this.systemProfiler.getCurrentProfile()
        });

        // Keep only recent history
        if (this.performanceHistory.length > 1000) {
          this.performanceHistory = this.performanceHistory.slice(-500);
        }

      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, this.config.monitoringInterval);
  }

  private async loadHistoricalData(): Promise<void> {
    if (this.config.historicalDataPath && fs.existsSync(this.config.historicalDataPath)) {
      const data = JSON.parse(fs.readFileSync(this.config.historicalDataPath, 'utf8'));
      this.performanceHistory = data.history || [];
      this.bottleneckPatterns = data.patterns || [];
      this.changePredictionHistory = data.changePredictions || [];
    }
  }

  private async saveHistoricalData(): Promise<void> {
    if (this.config.historicalDataPath) {
      const data = {
        history: this.performanceHistory.slice(-500), // Keep last 500 entries
        patterns: this.bottleneckPatterns,
        changePredictions: this.changePredictionHistory.slice(-200),
        lastSaved: Date.now()
      };
      fs.writeFileSync(this.config.historicalDataPath, JSON.stringify(data, null, 2));
    }
  }

  private categorizeGPU(gpu: any): 'low' | 'medium' | 'high' {
    if (!gpu) return 'low';
    if (gpu.vram >= 8) return 'high';
    if (gpu.vram >= 4) return 'medium';
    return 'low';
  }

  private categorizeCPU(cpu: any): 'low' | 'medium' | 'high' {
    if (!cpu) return 'low';
    if (cpu.cores >= 8 && cpu.baseClock >= 3.5) return 'high';
    if (cpu.cores >= 6 && cpu.baseClock >= 3.0) return 'medium';
    return 'low';
  }

  private categorizeRAM(ram: any): 'low' | 'medium' | 'high' {
    if (!ram) return 'low';
    if (ram.total >= 32) return 'high';
    if (ram.total >= 16) return 'medium';
    return 'low';
  }
}

interface BottleneckPattern {
  pattern: string;
  indicators: string[];
  causes: string[];
  solutions: string[];
}

class SystemProfiler {
  async getCurrentProfile(): Promise<HardwareProfile> {
    return getRealHardwareProfile();
  }

  /**
   * Real live CPU/memory/GPU utilization. FPS has no live in-game telemetry hook, so
   * the caller supplies the most recent recorded session average (0 if none yet)
   * rather than this class fabricating a number.
   */
  async getRealtimeMetrics(recentFps: number = 0): Promise<any> {
    const { cpuUsagePercent, memoryUsagePercent, gpuUsagePercent } = await getRealtimeSystemMetrics();
    return {
      fps: recentFps,
      memoryUsage: memoryUsagePercent,
      cpuUsage: cpuUsagePercent,
      gpuUsage: gpuUsagePercent,
      timestamp: Date.now()
    };
  }
}