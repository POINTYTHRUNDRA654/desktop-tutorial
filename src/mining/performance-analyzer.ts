/**
 * Performance Metrics Analyzer
 * Extracts FPS impact data from load order combinations and generates recommendations
 */

import {
  PerformanceMetric,
  PerformanceReport,
  PerformanceImpact,
  PerformanceRecommendation,
  HardwareProfile
} from '../shared/types';
import { PerformanceAnalyzer as IPerformanceAnalyzer } from '../shared/types';

export class PerformanceAnalyzer implements IPerformanceAnalyzer {
  private baselineMetrics?: PerformanceMetric;

  // Interface implementation
  analyze = this.analyzeMetrics.bind(this);
  supportedMetrics = ['fps', 'memory', 'loadTime', 'stability', 'conflicts'];

  /**
   * Analyze performance metrics and generate report
   */
  async analyzeMetrics(metrics: PerformanceMetric[]): Promise<PerformanceReport> {
    // Find baseline (no mods or minimal mod setup)
    this.baselineMetrics = this.findBaselineMetrics(metrics);

    // Calculate impact for each mod combination
    const modImpact = this.calculateModImpact(metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, modImpact);

    // Build compatibility matrix
    const compatibilityMatrix = this.buildCompatibilityMatrix(metrics);

    return {
      baselineMetrics: this.baselineMetrics,
      modImpact,
      recommendations,
      compatibilityMatrix
    };
  }

  private findBaselineMetrics(metrics: PerformanceMetric[]): PerformanceMetric {
    // Find metrics with minimal or no mods
    let baseline = metrics.find(m => m.modCombination.length === 0);
    if (!baseline) {
      // Find combination with least mods
      baseline = metrics.reduce((min, current) =>
        current.modCombination.length < min.modCombination.length ? current : min
      );
    }
    return baseline;
  }

  private calculateModImpact(metrics: PerformanceMetric[]): Map<string, PerformanceImpact> {
    const impact = new Map<string, PerformanceImpact>();

    // Group metrics by individual mods
    const modMetrics = new Map<string, PerformanceMetric[]>();

    for (const metric of metrics) {
      for (const mod of metric.modCombination) {
        if (!modMetrics.has(mod)) {
          modMetrics.set(mod, []);
        }
        modMetrics.get(mod)!.push(metric);
      }
    }

    // Calculate impact for each mod
    for (const [mod, modMetricsList] of modMetrics) {
      const impacts: PerformanceImpact[] = [];

      for (const metric of modMetricsList) {
        // Find comparable metric without this mod
        const withoutMod = metric.modCombination.filter(m => m !== mod);
        const comparableMetric = metrics.find(m =>
          this.arraysEqual(m.modCombination.sort(), withoutMod.sort())
        );

        if (comparableMetric && this.baselineMetrics) {
          const fpsDelta = metric.fps - comparableMetric.fps;
          const memoryDelta = metric.memoryUsage - comparableMetric.memoryUsage;
          const loadTimeDelta = metric.loadTime - comparableMetric.loadTime;
          const stabilityDelta = metric.stabilityScore - comparableMetric.stabilityScore;

          impacts.push({
            fpsDelta,
            memoryDelta,
            loadTimeDelta,
            stabilityDelta
          });
        }
      }

      // Average the impacts
      if (impacts.length > 0) {
        const avgImpact: PerformanceImpact = {
          fpsDelta: impacts.reduce((sum, i) => sum + i.fpsDelta, 0) / impacts.length,
          memoryDelta: impacts.reduce((sum, i) => sum + i.memoryDelta, 0) / impacts.length,
          loadTimeDelta: impacts.reduce((sum, i) => sum + i.loadTimeDelta, 0) / impacts.length,
          stabilityDelta: impacts.reduce((sum, i) => sum + i.stabilityDelta, 0) / impacts.length
        };
        impact.set(mod, avgImpact);
      }
    }

    return impact;
  }

  private generateRecommendations(
    metrics: PerformanceMetric[],
    modImpact: Map<string, PerformanceImpact>
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Sort mods by negative FPS impact
    const sortedMods = Array.from(modImpact.entries())
      .filter(([, impact]) => impact.fpsDelta < -5) // Significant FPS drop
      .sort(([, a], [, b]) => a.fpsDelta - b.fpsDelta); // Most negative first

    for (const [mod, impact] of sortedMods) {
      if (impact.fpsDelta < -10) {
        recommendations.push({
          type: 'disable',
          targetMods: [mod],
          description: `${mod} causes significant FPS drop (${impact.fpsDelta.toFixed(1)} FPS). Consider disabling or finding alternative.`,
          expectedImprovement: {
            fpsDelta: -impact.fpsDelta,
            memoryDelta: -impact.memoryDelta,
            loadTimeDelta: -impact.loadTimeDelta,
            stabilityDelta: -impact.stabilityDelta
          },
          confidence: this.calculateConfidence(mod, metrics)
        });
      } else if (impact.fpsDelta < -5) {
        recommendations.push({
          type: 'reorder',
          targetMods: [mod],
          description: `${mod} has moderate FPS impact. Try loading it later in the order.`,
          expectedImprovement: {
            fpsDelta: -impact.fpsDelta * 0.5, // Partial improvement
            memoryDelta: -impact.memoryDelta * 0.5,
            loadTimeDelta: -impact.loadTimeDelta * 0.5,
            stabilityDelta: -impact.stabilityDelta * 0.5
          },
          confidence: 70
        });
      }
    }

    // Check for incompatible mod combinations
    const incompatiblePairs = this.findIncompatiblePairs(metrics);
    for (const [mod1, mod2, impact] of incompatiblePairs) {
      recommendations.push({
        type: 'disable',
        targetMods: [mod1, mod2],
        description: `${mod1} and ${mod2} together cause severe performance degradation. Consider using only one.`,
        expectedImprovement: impact,
        confidence: 85
      });
    }

    return recommendations;
  }

  private findIncompatiblePairs(metrics: PerformanceMetric[]): Array<[string, string, PerformanceImpact]> {
    const pairs: Array<[string, string, PerformanceImpact]> = [];

    for (const metric of metrics) {
      if (metric.modCombination.length >= 2 && metric.fps < 30) { // Very low FPS
        // Check if individual mods perform better
        for (let i = 0; i < metric.modCombination.length; i++) {
          for (let j = i + 1; j < metric.modCombination.length; j++) {
            const mod1 = metric.modCombination[i];
            const mod2 = metric.modCombination[j];

            // Find metrics with just mod1
            const mod1Only = metrics.find(m =>
              m.modCombination.length === 1 && m.modCombination[0] === mod1
            );

            // Find metrics with just mod2
            const mod2Only = metrics.find(m =>
              m.modCombination.length === 1 && m.modCombination[0] === mod2
            );

            if (mod1Only && mod2Only) {
              const expectedFps = Math.min(mod1Only.fps, mod2Only.fps);
              if (metric.fps < expectedFps * 0.7) { // Much worse than expected
                pairs.push([mod1, mod2, {
                  fpsDelta: expectedFps - metric.fps,
                  memoryDelta: (mod1Only.memoryUsage + mod2Only.memoryUsage) - metric.memoryUsage,
                  loadTimeDelta: (mod1Only.loadTime + mod2Only.loadTime) - metric.loadTime,
                  stabilityDelta: (mod1Only.stabilityScore + mod2Only.stabilityScore) / 2 - metric.stabilityScore
                }]);
              }
            }
          }
        }
      }
    }

    return pairs;
  }

  private buildCompatibilityMatrix(metrics: PerformanceMetric[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    // Get all unique mods
    const allMods = new Set<string>();
    for (const metric of metrics) {
      metric.modCombination.forEach(mod => allMods.add(mod));
    }

    // Initialize matrix
    for (const mod1 of allMods) {
      matrix.set(mod1, new Map());
      for (const mod2 of allMods) {
        matrix.get(mod1)!.set(mod2, 100); // Default compatibility
      }
    }

    // Calculate compatibility scores
    for (const metric of metrics) {
      if (metric.modCombination.length === 2) {
        const [mod1, mod2] = metric.modCombination.sort();
        const score = this.calculateCompatibilityScore(metric);
        matrix.get(mod1)!.set(mod2, score);
        matrix.get(mod2)!.set(mod1, score);
      }
    }

    return matrix;
  }

  private calculateCompatibilityScore(metric: PerformanceMetric): number {
    if (!this.baselineMetrics) return 100;

    // Calculate performance degradation
    const fpsDegradation = (this.baselineMetrics.fps - metric.fps) / this.baselineMetrics.fps;
    const memoryDegradation = (metric.memoryUsage - this.baselineMetrics.memoryUsage) / this.baselineMetrics.memoryUsage;
    const stabilityDegradation = (this.baselineMetrics.stabilityScore - metric.stabilityScore) / 100;

    // Weighted score (0-100, higher is better compatibility)
    const degradation = (fpsDegradation * 0.5) + (memoryDegradation * 0.3) + (stabilityDegradation * 0.2);
    return Math.max(0, Math.min(100, 100 - (degradation * 100)));
  }

  private calculateConfidence(mod: string, metrics: PerformanceMetric[]): number {
    // Count how many times this mod appears in metrics
    const appearances = metrics.filter(m => m.modCombination.includes(mod)).length;
    return Math.min(95, appearances * 10 + 50); // More data = higher confidence
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.sort().every((val, index) => val === b.sort()[index]);
  }
}