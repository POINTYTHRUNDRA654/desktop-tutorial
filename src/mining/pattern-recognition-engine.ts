/**
 * Pattern Recognition Engine
 * Analyzes modding data to identify patterns, anomalies, and provide recommendations
 */

import {
  PatternRecognitionResult,
  DetectedPattern,
  Anomaly,
  PatternRecommendation,
  PatternExample,
  AnalysisData,
  HistoricalData,
  PatternRecognitionEngine as IPatternRecognitionEngine
} from '../shared/types';

export class PatternRecognitionEngine implements IPatternRecognitionEngine {
  private patterns: Map<string, DetectedPattern> = new Map();
  private historicalData: HistoricalData[] = [];

  async analyze(data: AnalysisData): Promise<PatternRecognitionResult> {
    const patterns = await this.detectPatterns(data);
    const anomalies = await this.detectAnomalies(data);
    const recommendations = await this.generateRecommendations(patterns, anomalies);

    return {
      patterns,
      anomalies,
      recommendations,
      confidence: this.calculateOverallConfidence(patterns, anomalies)
    };
  }

  async train(historicalData: HistoricalData[]): Promise<void> {
    this.historicalData = historicalData;
    await this.updatePatternDatabase();
  }

  async getPatterns(): Promise<DetectedPattern[]> {
    return Array.from(this.patterns.values());
  }

  private async detectPatterns(data: AnalysisData): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Conflict patterns
    const conflictPatterns = await this.detectConflictPatterns(data);
    patterns.push(...conflictPatterns);

    // Performance patterns
    const performancePatterns = await this.detectPerformancePatterns(data);
    patterns.push(...performancePatterns);

    // Compatibility patterns
    const compatibilityPatterns = await this.detectCompatibilityPatterns(data);
    patterns.push(...compatibilityPatterns);

    // Resource usage patterns
    const resourcePatterns = await this.detectResourcePatterns(data);
    patterns.push(...resourcePatterns);

    return patterns;
  }

  private async detectConflictPatterns(data: AnalysisData): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Analyze conflict frequency by mod combinations
    const conflictFrequency = new Map<string, number>();
    const conflictExamples = new Map<string, PatternExample[]>();

    for (const conflict of data.conflicts) {
      const key = `${conflict.conflictingMod}-${conflict.recordType}`;
      conflictFrequency.set(key, (conflictFrequency.get(key) || 0) + 1);

      if (!conflictExamples.has(key)) {
        conflictExamples.set(key, []);
      }

      conflictExamples.get(key)!.push({
        modCombination: [conflict.conflictingMod],
        outcome: 'failure',
        description: `Conflict in ${conflict.recordType} records`
      });
    }

    // Create patterns for frequently conflicting mods
    for (const [key, frequency] of conflictFrequency) {
      if (frequency > 2) { // Threshold for pattern detection
        const [mod, recordType] = key.split('-');
        patterns.push({
          id: `conflict-${key}`,
          type: 'conflict',
          description: `${mod} frequently conflicts in ${recordType} records`,
          affectedMods: [mod],
          severity: frequency > 5 ? 'high' : 'medium',
          frequency,
          examples: conflictExamples.get(key) || []
        });
      }
    }

    return patterns;
  }

  private async detectPerformancePatterns(data: AnalysisData): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Analyze performance impact patterns
    const modPerformance = new Map<string, number[]>();

    for (const metric of data.performanceMetrics) {
      for (const mod of metric.modCombination) {
        if (!modPerformance.has(mod)) {
          modPerformance.set(mod, []);
        }
        modPerformance.get(mod)!.push(metric.fps);
      }
    }

    // Detect mods with consistently poor performance
    for (const [mod, fpsValues] of modPerformance) {
      if (fpsValues.length > 3) {
        const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
        const variance = fpsValues.reduce((acc, fps) => acc + Math.pow(fps - avgFps, 2), 0) / fpsValues.length;

        if (avgFps < 30 && variance < 10) { // Consistently poor performance
          patterns.push({
            id: `performance-${mod}`,
            type: 'performance',
            description: `${mod} consistently causes low FPS (${avgFps.toFixed(1)} avg)`,
            affectedMods: [mod],
            severity: avgFps < 20 ? 'critical' : 'high',
            frequency: fpsValues.length,
            examples: [{
              modCombination: [mod],
              outcome: 'failure',
              metrics: data.performanceMetrics.find(m => m.modCombination.includes(mod)),
              description: `Average FPS: ${avgFps.toFixed(1)}`
            }]
          });
        }
      }
    }

    return patterns;
  }

  private async detectCompatibilityPatterns(data: AnalysisData): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Analyze load order patterns that work well together
    const successfulCombinations = new Map<string, number>();
    const failedCombinations = new Map<string, number>();

    for (const metric of data.performanceMetrics) {
      const key = metric.modCombination.sort().join(',');
      const isSuccess = metric.fps > 50 && metric.stabilityScore > 80;

      if (isSuccess) {
        successfulCombinations.set(key, (successfulCombinations.get(key) || 0) + 1);
      } else {
        failedCombinations.set(key, (failedCombinations.get(key) || 0) + 1);
      }
    }

    // Find highly successful combinations
    for (const [combo, count] of successfulCombinations) {
      if (count > 3) {
        const mods = combo.split(',');
        patterns.push({
          id: `compatibility-${combo}`,
          type: 'compatibility',
          description: `Mods ${mods.join(', ')} work well together (${count} successful tests)`,
          affectedMods: mods,
          severity: 'low',
          frequency: count,
          examples: [{
            modCombination: mods,
            outcome: 'success',
            description: `Successful combination with high performance`
          }]
        });
      }
    }

    return patterns;
  }

  private async detectResourcePatterns(data: AnalysisData): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Analyze memory usage patterns
    const highMemoryMods: string[] = [];

    for (const metric of data.performanceMetrics) {
      if (metric.memoryUsage > 8000) { // 8GB threshold
        highMemoryMods.push(...metric.modCombination);
      }
    }

    // Find mods that frequently cause high memory usage
    const memoryFrequency = new Map<string, number>();
    for (const mod of highMemoryMods) {
      memoryFrequency.set(mod, (memoryFrequency.get(mod) || 0) + 1);
    }

    for (const [mod, count] of memoryFrequency) {
      if (count > 2) {
        patterns.push({
          id: `resource-memory-${mod}`,
          type: 'resource',
          description: `${mod} frequently causes high memory usage`,
          affectedMods: [mod],
          severity: 'medium',
          frequency: count,
          examples: [{
            modCombination: [mod],
            outcome: 'warning',
            description: `High memory usage detected`
          }]
        });
      }
    }

    return patterns;
  }

  private async detectAnomalies(data: AnalysisData): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Performance anomalies
    const performanceAnomalies = await this.detectPerformanceAnomalies(data);
    anomalies.push(...performanceAnomalies);

    // Memory anomalies
    const memoryAnomalies = await this.detectMemoryAnomalies(data);
    anomalies.push(...memoryAnomalies);

    // Compatibility anomalies
    const compatibilityAnomalies = await this.detectCompatibilityAnomalies(data);
    anomalies.push(...compatibilityAnomalies);

    return anomalies;
  }

  private async detectPerformanceAnomalies(data: AnalysisData): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (data.performanceMetrics.length < 3) return anomalies;

    // Calculate baseline performance
    const fpsValues = data.performanceMetrics.map(m => m.fps);
    const meanFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const stdDevFps = Math.sqrt(
      fpsValues.reduce((acc, fps) => acc + Math.pow(fps - meanFps, 2), 0) / fpsValues.length
    );

    // Find anomalous performance metrics
    for (const metric of data.performanceMetrics) {
      const deviation = Math.abs(metric.fps - meanFps) / stdDevFps;

      if (deviation > 2) { // 2 standard deviations
        anomalies.push({
          id: `performance-anomaly-${metric.modCombination.join('-')}`,
          type: 'performance',
          description: `Unusual FPS performance (${metric.fps}) for mod combination`,
          affectedMods: metric.modCombination,
          deviation,
          severity: deviation > 3 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  private async detectMemoryAnomalies(data: AnalysisData): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (data.performanceMetrics.length < 3) return anomalies;

    const memoryValues = data.performanceMetrics.map(m => m.memoryUsage);
    const meanMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const stdDevMemory = Math.sqrt(
      memoryValues.reduce((acc, mem) => acc + Math.pow(mem - meanMemory, 2), 0) / memoryValues.length
    );

    for (const metric of data.performanceMetrics) {
      const deviation = Math.abs(metric.memoryUsage - meanMemory) / stdDevMemory;

      if (deviation > 2) {
        anomalies.push({
          id: `memory-anomaly-${metric.modCombination.join('-')}`,
          type: 'memory',
          description: `Unusual memory usage (${metric.memoryUsage}MB) for mod combination`,
          affectedMods: metric.modCombination,
          deviation,
          severity: deviation > 3 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  private async detectCompatibilityAnomalies(data: AnalysisData): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Find mods that conflict with many others
    const conflictCount = new Map<string, number>();

    for (const conflict of data.conflicts) {
      conflictCount.set(conflict.conflictingMod, (conflictCount.get(conflict.conflictingMod) || 0) + 1);
    }

    const totalMods = new Set(data.mods).size;
    for (const [mod, conflicts] of conflictCount) {
      const conflictRatio = conflicts / totalMods;

      if (conflictRatio > 0.3) { // Conflicts with more than 30% of mods
        anomalies.push({
          id: `compatibility-anomaly-${mod}`,
          type: 'compatibility',
          description: `${mod} conflicts with ${conflicts} other mods (${(conflictRatio * 100).toFixed(1)}%)`,
          affectedMods: [mod],
          deviation: conflictRatio,
          severity: conflictRatio > 0.5 ? 'critical' : 'high'
        });
      }
    }

    return anomalies;
  }

  private async generateRecommendations(
    patterns: DetectedPattern[],
    anomalies: Anomaly[]
  ): Promise<PatternRecommendation[]> {
    const recommendations: PatternRecommendation[] = [];

    // Generate recommendations based on patterns
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'conflict':
          recommendations.push({
            type: 'avoid',
            targetPattern: pattern.id,
            description: `Avoid using ${pattern.affectedMods.join(', ')} together due to frequent conflicts`,
            confidence: Math.min(pattern.frequency * 20, 100),
            alternatives: await this.findAlternatives(pattern.affectedMods[0])
          });
          break;

        case 'performance':
          recommendations.push({
            type: 'avoid',
            targetPattern: pattern.id,
            description: `Consider disabling ${pattern.affectedMods.join(', ')} to improve performance`,
            confidence: 85,
            alternatives: await this.findPerformanceAlternatives(pattern.affectedMods[0])
          });
          break;

        case 'compatibility':
          recommendations.push({
            type: 'prefer',
            targetPattern: pattern.id,
            description: `Recommended combination: ${pattern.affectedMods.join(', ')}`,
            confidence: pattern.frequency * 15,
          });
          break;
      }
    }

    // Generate recommendations based on anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        recommendations.push({
          type: 'avoid',
          targetPattern: anomaly.id,
          description: `Address ${anomaly.type} anomaly: ${anomaly.description}`,
          confidence: Math.min(anomaly.deviation * 25, 100),
        });
      }
    }

    return recommendations;
  }

  private calculateOverallConfidence(patterns: DetectedPattern[], anomalies: Anomaly[]): number {
    if (patterns.length === 0 && anomalies.length === 0) return 0;

    const patternConfidence = patterns.length > 0
      ? patterns.reduce((acc, p) => acc + p.frequency, 0) / patterns.length
      : 0;

    const anomalyConfidence = anomalies.length > 0
      ? anomalies.reduce((acc, a) => acc + a.deviation, 0) / anomalies.length * 25
      : 0;

    return Math.min((patternConfidence + anomalyConfidence) / 2, 100);
  }

  private async updatePatternDatabase(): Promise<void> {
    // Update patterns based on historical data
    // This would involve more sophisticated ML/statistical analysis
    this.patterns.clear();

    // Simple frequency-based pattern extraction
    const patternFrequency = new Map<string, number>();

    for (const data of this.historicalData) {
      const key = `${data.outcome}-${data.mods.join(',')}`;
      patternFrequency.set(key, (patternFrequency.get(key) || 0) + 1);
    }

    // Create patterns from frequent combinations
    for (const [key, frequency] of patternFrequency) {
      if (frequency > 2) {
        const [outcome, modsStr] = key.split('-', 2);
        const mods = modsStr.split(',');

        this.patterns.set(key, {
          id: key,
          type: 'compatibility',
          description: `Pattern: ${mods.join(', ')} - ${outcome}`,
          affectedMods: mods,
          severity: outcome === 'failure' ? 'high' : 'low',
          frequency,
          examples: []
        });
      }
    }
  }

  private async findAlternatives(modName: string): Promise<string[]> {
    // Find mods that are similar but don't conflict as much
    const alternatives: string[] = [];

    // This would use more sophisticated logic in a real implementation
    // For now, return some generic alternatives
    const commonAlternatives: Record<string, string[]> = {
      'SKSE': ['SSE Engine Fixes'],
      'SkyUI': ['SSE Engine Fixes', 'Unofficial Skyrim Special Edition Patch'],
      'Frostfall': ['Campfire', 'Frostfall - Hypothermia Camping Survival'],
    };

    return commonAlternatives[modName] || [];
  }

  private async findPerformanceAlternatives(modName: string): Promise<string[]> {
    // Find lighter alternatives to performance-heavy mods
    const performanceAlternatives: Record<string, string[]> = {
      'ENB Series': ['SSE Engine Fixes', 'SSE Engine Fixes - ini'],
      'Complex Particle Systems': ['Particle Patch for ENB'],
      'High Quality Textures': ['Optimized Vanilla Textures', 'Compressed Textures'],
    };

    return performanceAlternatives[modName] || [];
  }
}