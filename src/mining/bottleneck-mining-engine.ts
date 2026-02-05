/**
 * Bottleneck Mining Engine
 * Identifies performance bottlenecks and optimization opportunities
 */

import {
  BottleneckAnalysis,
  PerformanceBottleneck,
  OptimizationOpportunity,
  SystemLimitation,
  BottleneckEvidence,
  PerformanceData,
  PerformanceMetric,
  HardwareProfile,
  BottleneckMiningEngine as IBottleneckMiningEngine
} from '../shared/types';

export class BottleneckMiningEngine implements IBottleneckMiningEngine {
  private baselinePerformance: PerformanceMetric | null = null;

  async analyze(performanceData: PerformanceData): Promise<BottleneckAnalysis> {
    this.baselinePerformance = this.findBaselinePerformance(performanceData.metrics);

    const bottlenecks = await this.identifyBottlenecks(performanceData);
    const criticalPath = this.calculateCriticalPath(bottlenecks, performanceData.loadOrder);
    const optimizationOpportunities = await this.findOptimizationOpportunities(performanceData);
    const systemLimitations = this.identifySystemLimitations(performanceData.systemInfo, performanceData.metrics);

    return {
      bottlenecks,
      criticalPath,
      optimizationOpportunities,
      systemLimitations
    };
  }

  async identify(performanceData: PerformanceMetric[]): Promise<PerformanceBottleneck[]> {
    const tempData: PerformanceData = {
      metrics: performanceData,
      systemInfo: { cpu: 'unknown', gpu: 'unknown', ram: 16, storage: 'unknown', os: 'unknown' },
      loadOrder: [],
      sessionDuration: 0
    };

    const analysis = await this.analyze(tempData);
    return analysis.bottlenecks;
  }

  private findBaselinePerformance(metrics: PerformanceMetric[]): PerformanceMetric | null {
    // Find the best performing configuration
    if (metrics.length === 0) return null;

    return metrics.reduce((best, current) => {
      const bestScore = this.calculatePerformanceScore(best);
      const currentScore = this.calculatePerformanceScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculatePerformanceScore(metric: PerformanceMetric): number {
    // Weighted score combining FPS, stability, and memory efficiency
    const fpsScore = Math.min(metric.fps / 60, 1) * 40; // 40% weight
    const stabilityScore = metric.stabilityScore * 0.4; // 40% weight
    const memoryScore = Math.max(0, (1 - metric.memoryUsage / 16384)) * 20; // 20% weight (16GB max)

    return fpsScore + stabilityScore + memoryScore;
  }

  private async identifyBottlenecks(performanceData: PerformanceData): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Analyze each mod's impact
    const modImpacts = await this.calculateModImpacts(performanceData);

    for (const [modName, impact] of modImpacts) {
      const bottleneckType = this.classifyBottleneckType(impact, performanceData.systemInfo);
      const confidence = this.calculateBottleneckConfidence(impact);
      const evidence = this.gatherBottleneckEvidence(modName, impact, performanceData);
      const mitigationStrategies = this.generateMitigationStrategies(bottleneckType, modName);

      if (confidence > 0.3) { // Only include significant bottlenecks
        bottlenecks.push({
          modName,
          bottleneckType,
          impact: impact.fpsDelta,
          confidence,
          evidence,
          mitigationStrategies
        });
      }
    }

    // Sort by impact (most severe first)
    return bottlenecks.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  private async calculateModImpacts(performanceData: PerformanceData): Promise<Map<string, { fpsDelta: number; memoryDelta: number; loadTimeDelta: number }>> {
    const impacts = new Map<string, { fpsDelta: number; memoryDelta: number; loadTimeDelta: number }>();

    for (const metric of performanceData.metrics) {
      for (const mod of metric.modCombination) {
        // Find comparable metric without this mod
        const withoutMod = metric.modCombination.filter(m => m !== mod);
        const comparableMetric = performanceData.metrics.find(m =>
          this.arraysEqual(m.modCombination.sort(), withoutMod.sort())
        );

        if (comparableMetric) {
          const fpsDelta = metric.fps - comparableMetric.fps;
          const memoryDelta = metric.memoryUsage - comparableMetric.memoryUsage;
          const loadTimeDelta = metric.loadTime - comparableMetric.loadTime;

          if (!impacts.has(mod)) {
            impacts.set(mod, { fpsDelta: 0, memoryDelta: 0, loadTimeDelta: 0 });
          }

          const current = impacts.get(mod)!;
          current.fpsDelta += fpsDelta;
          current.memoryDelta += memoryDelta;
          current.loadTimeDelta += loadTimeDelta;
        }
      }
    }

    // Average the impacts
    for (const [mod, impact] of impacts) {
      const count = performanceData.metrics.filter(m => m.modCombination.includes(mod)).length;
      if (count > 0) {
        impact.fpsDelta /= count;
        impact.memoryDelta /= count;
        impact.loadTimeDelta /= count;
      }
    }

    return impacts;
  }

  private classifyBottleneckType(
    impact: { fpsDelta: number; memoryDelta: number; loadTimeDelta: number },
    systemInfo: HardwareProfile
  ): 'cpu' | 'gpu' | 'memory' | 'io' | 'script' {
    // Classify based on impact patterns and system info

    if (impact.memoryDelta > 2048) { // >2GB memory increase
      return 'memory';
    }

    if (impact.fpsDelta < -20 && impact.memoryDelta < 1024) {
      // Significant FPS drop without major memory increase - likely GPU or script
      if (systemInfo.gpu.model.toLowerCase().includes('integrated') ||
          systemInfo.gpu.model.toLowerCase().includes('intel')) {
        return 'gpu'; // Integrated graphics bottleneck
      }
      return 'script'; // Script performance issue
    }

    if (impact.loadTimeDelta > 10) { // >10 second load time increase
      return 'io'; // I/O bottleneck during loading
    }

    if (impact.fpsDelta < -10) {
      return 'cpu'; // General CPU bottleneck
    }

    return 'cpu'; // Default classification
  }

  private calculateBottleneckConfidence(impact: { fpsDelta: number; memoryDelta: number; loadTimeDelta: number }): number {
    // Calculate confidence based on magnitude of impact
    const fpsConfidence = Math.min(Math.abs(impact.fpsDelta) / 30, 1); // Max confidence at 30 FPS drop
    const memoryConfidence = Math.min(impact.memoryDelta / 4096, 1); // Max confidence at 4GB increase
    const loadTimeConfidence = Math.min(impact.loadTimeDelta / 20, 1); // Max confidence at 20s increase

    return Math.max(fpsConfidence, memoryConfidence, loadTimeConfidence);
  }

  private gatherBottleneckEvidence(
    modName: string,
    impact: { fpsDelta: number; memoryDelta: number; loadTimeDelta: number },
    performanceData: PerformanceData
  ): BottleneckEvidence[] {
    const evidence: BottleneckEvidence[] = [];

    // FPS evidence
    if (Math.abs(impact.fpsDelta) > 5) {
      evidence.push({
        metric: 'fps',
        value: impact.fpsDelta,
        threshold: -10, // -10 FPS threshold for concern
        description: `FPS ${impact.fpsDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact.fpsDelta).toFixed(1)}`
      });
    }

    // Memory evidence
    if (impact.memoryDelta > 512) { // 512MB threshold
      evidence.push({
        metric: 'memory_mb',
        value: impact.memoryDelta,
        threshold: 1024,
        description: `Memory usage increased by ${impact.memoryDelta.toFixed(0)}MB`
      });
    }

    // Load time evidence
    if (impact.loadTimeDelta > 2) {
      evidence.push({
        metric: 'load_time_seconds',
        value: impact.loadTimeDelta,
        threshold: 5,
        description: `Load time increased by ${impact.loadTimeDelta.toFixed(1)} seconds`
      });
    }

    // Add system context
    const relevantMetrics = performanceData.metrics.filter(m => m.modCombination.includes(modName));
    if (relevantMetrics.length > 0) {
      const avgFps = relevantMetrics.reduce((acc, m) => acc + m.fps, 0) / relevantMetrics.length;
      evidence.push({
        metric: 'avg_fps_with_mod',
        value: avgFps,
        threshold: 30,
        description: `Average FPS with ${modName}: ${avgFps.toFixed(1)}`
      });
    }

    return evidence;
  }

  private generateMitigationStrategies(bottleneckType: string, modName: string): string[] {
    const strategies: Record<string, string[]> = {
      cpu: [
        'Consider using a lighter version or alternative of this mod',
        'Check for script optimizations or patches',
        'Monitor CPU usage during gameplay',
        'Consider upgrading CPU or using fewer concurrent mods'
      ],
      gpu: [
        'Reduce texture resolution or disable high-res textures',
        'Use performance-oriented graphics settings',
        'Consider upgrading GPU or using integrated graphics alternatives',
        'Disable VRAM-intensive features'
      ],
      memory: [
        'Reduce texture sizes or use compressed textures',
        'Disable memory-intensive features',
        'Increase system RAM or use memory optimization mods',
        'Use texture streaming or memory management mods'
      ],
      io: [
        'Use SSD storage for game files',
        'Preload assets or use faster storage solutions',
        'Reduce mod file sizes through optimization',
        'Use mods with better loading performance'
      ],
      script: [
        'Check for script conflicts or inefficiencies',
        'Use script optimization patches',
        'Monitor Papyrus logs for script errors',
        'Consider alternative mods with better script performance'
      ]
    };

    return strategies[bottleneckType] || ['General performance optimization recommended'];
  }

  private calculateCriticalPath(bottlenecks: PerformanceBottleneck[], loadOrder: string[]): string[] {
    // Calculate the most impactful mod sequence
    const sortedBottlenecks = bottlenecks
      .filter(b => b.confidence > 0.5)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    // Return mods in load order that are bottlenecks
    return loadOrder.filter(mod =>
      sortedBottlenecks.some(b => b.modName === mod)
    );
  }

  private async findOptimizationOpportunities(performanceData: PerformanceData): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Texture optimization opportunities
    const textureOpportunities = await this.findTextureOptimizationOpportunities(performanceData);
    opportunities.push(...textureOpportunities);

    // Script optimization opportunities
    const scriptOpportunities = await this.findScriptOptimizationOpportunities(performanceData);
    opportunities.push(...scriptOpportunities);

    // Load order optimization opportunities
    const loadOrderOpportunities = await this.findLoadOrderOptimizationOpportunities(performanceData);
    opportunities.push(...loadOrderOpportunities);

    // Memory optimization opportunities
    const memoryOpportunities = await this.findMemoryOptimizationOpportunities(performanceData);
    opportunities.push(...memoryOpportunities);

    return opportunities.sort((a, b) => b.potentialGain - a.potentialGain);
  }

  private async findTextureOptimizationOpportunities(performanceData: PerformanceData): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Look for high memory usage with low FPS
    for (const metric of performanceData.metrics) {
      if (metric.memoryUsage > 6144 && metric.fps < 40) { // >6GB RAM, <40 FPS
        const memoryFpsRatio = metric.memoryUsage / metric.fps;

        if (memoryFpsRatio > 200) { // High memory per FPS
          opportunities.push({
            type: 'texture',
            description: `High VRAM usage (${metric.memoryUsage}MB) with low FPS (${metric.fps}). Consider texture optimization.`,
            potentialGain: Math.min(metric.memoryUsage * 0.3, 20), // Estimate 30% memory reduction = ~20 FPS gain
            difficulty: 'medium',
            affectedMods: metric.modCombination
          });
        }
      }
    }

    return opportunities;
  }

  private async findScriptOptimizationOpportunities(performanceData: PerformanceData): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Look for mods with high load times but normal memory usage
    for (const metric of performanceData.metrics) {
      if (metric.loadTime > 30 && metric.memoryUsage < 4096) { // >30s load, <4GB RAM
        opportunities.push({
          type: 'script',
          description: `Long load time (${metric.loadTime}s) suggests script optimization opportunities.`,
          potentialGain: Math.min(metric.loadTime * 0.4, 15), // Estimate 40% load time reduction
          difficulty: 'hard',
          affectedMods: metric.modCombination
        });
      }
    }

    return opportunities;
  }

  private async findLoadOrderOptimizationOpportunities(performanceData: PerformanceData): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze load order impact
    const loadOrderMetrics = performanceData.metrics.filter(m => m.modCombination.length > 1);

    if (loadOrderMetrics.length > 1) {
      // Find load orders with significantly different performance
      const sortedByFps = [...loadOrderMetrics].sort((a, b) => b.fps - a.fps);
      const bestFps = sortedByFps[0].fps;
      const worstFps = sortedByFps[sortedByFps.length - 1].fps;

      if (bestFps - worstFps > 10) { // >10 FPS difference
        opportunities.push({
          type: 'load_order',
          description: `Load order optimization could improve FPS by up to ${(bestFps - worstFps).toFixed(1)}`,
          potentialGain: bestFps - worstFps,
          difficulty: 'easy',
          affectedMods: sortedByFps[0].modCombination
        });
      }
    }

    return opportunities;
  }

  private async findMemoryOptimizationOpportunities(performanceData: PerformanceData): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Look for memory leaks (gradual memory increase over time)
    const timeSortedMetrics = performanceData.metrics
      .filter(m => m.timestamp)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (timeSortedMetrics.length > 3) {
      const memoryTrend = this.calculateMemoryTrend(timeSortedMetrics);

      if (memoryTrend > 50) { // >50MB/hour memory growth
        opportunities.push({
          type: 'config',
          description: `Memory leak detected (${memoryTrend.toFixed(0)}MB/hour). Memory optimization needed.`,
          potentialGain: Math.min(memoryTrend * 0.5, 10), // Estimate 50% reduction in leak rate
          difficulty: 'hard',
          affectedMods: timeSortedMetrics[timeSortedMetrics.length - 1].modCombination
        });
      }
    }

    return opportunities;
  }

  private calculateMemoryTrend(metrics: PerformanceMetric[]): number {
    if (metrics.length < 2) return 0;

    // Simple linear regression for memory over time
    const n = metrics.length;
    const sumX = metrics.reduce((acc, m, i) => acc + i, 0);
    const sumY = metrics.reduce((acc, m) => acc + m.memoryUsage, 0);
    const sumXY = metrics.reduce((acc, m, i) => acc + i * m.memoryUsage, 0);
    const sumXX = metrics.reduce((acc, m, i) => acc + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Convert to MB per hour (assuming measurements are evenly spaced)
    const timeSpan = (metrics[n - 1].timestamp - metrics[0].timestamp) / (1000 * 60 * 60); // hours
    if (timeSpan > 0) {
      return slope / timeSpan; // MB per hour
    }

    return 0;
  }

  private identifySystemLimitations(systemInfo: HardwareProfile, metrics: PerformanceMetric[]): SystemLimitation[] {
    const limitations: SystemLimitation[] = [];

    // CPU limitation
    const avgCpuUsage = metrics.reduce((acc, m) => acc + (m as any).cpuUsage || 0, 0) / metrics.length;
    if (avgCpuUsage > 80) {
      limitations.push({
        component: 'cpu',
        currentUsage: avgCpuUsage,
        capacity: 100,
        bottleneck: true
      });
    }

    // GPU limitation
    const avgGpuUsage = metrics.reduce((acc, m) => acc + (m as any).gpuUsage || 0, 0) / metrics.length;
    if (avgGpuUsage > 90) {
      limitations.push({
        component: 'gpu',
        currentUsage: avgGpuUsage,
        capacity: 100,
        bottleneck: true
      });
    }

    // RAM limitation
    const maxRamUsage = Math.max(...metrics.map(m => m.memoryUsage));
    const ramUsagePercent = (maxRamUsage / (systemInfo.ram * 1024)) * 100;
    if (ramUsagePercent > 85) {
      limitations.push({
        component: 'ram',
        currentUsage: ramUsagePercent,
        capacity: 100,
        bottleneck: true
      });
    }

    // Storage I/O limitation (inferred from load times)
    const avgLoadTime = metrics.reduce((acc, m) => acc + m.loadTime, 0) / metrics.length;
    if (avgLoadTime > 60) { // >1 minute load time suggests I/O bottleneck
      limitations.push({
        component: 'storage',
        currentUsage: 90, // Estimated
        capacity: 100,
        bottleneck: true
      });
    }

    return limitations;
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
}