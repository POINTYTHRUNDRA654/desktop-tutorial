import { describe, it, expect, beforeEach } from 'vitest';
import { LongitudinalMiningEngine } from '../longitudinal-mining-engine';

describe('LongitudinalMiningEngine', () => {
  let engine: LongitudinalMiningEngine;

  beforeEach(() => {
    engine = new LongitudinalMiningEngine({
      dataRetentionDays: 90,
      trendAnalysisInterval: 24,
      degradationThreshold: 10,
      predictionHorizon: 30,
      enablePredictiveAlerts: true
    });
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(engine).toBeDefined();
    });

    it('should start without errors', async () => {
      await expect(engine.start()).resolves.not.toThrow();
    });

    it('should stop without errors', async () => {
      await engine.start();
      await expect(engine.stop()).resolves.not.toThrow();
    });
  });

  describe('interface methods', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should track performance over time', async () => {
      const sessionData = [
        {
          sessionId: 'session-1',
          startTime: Date.now() - 86400000, // 1 day ago
          endTime: Date.now() - 86400000 + 30000, // 30 seconds later
          mods: ['mod1', 'mod2'],
          peakVRAM: 2048,
          peakRAM: 4096,
          averageFPS: 50
        },
        {
          sessionId: 'session-2',
          startTime: Date.now() - 43200000, // 12 hours ago
          endTime: Date.now() - 43200000 + 25000,
          mods: ['mod1', 'mod2'],
          peakVRAM: 2100,
          peakRAM: 4200,
          averageFPS: 48
        }
      ];

      const trends = await engine.trackPerformanceOverTime(sessionData);

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);

      const trend = trends[0];
      expect(trend).toHaveProperty('modCombination');
      expect(trend).toHaveProperty('timeRange');
      expect(trend).toHaveProperty('metrics');
      expect(trend).toHaveProperty('significantChanges');
      expect(trend).toHaveProperty('overallTrend');

      expect(trend.metrics).toHaveProperty('fps');
      expect(trend.metrics).toHaveProperty('memory');
      expect(trend.metrics).toHaveProperty('loadTime');
      expect(trend.metrics).toHaveProperty('stability');
    });

    it('should detect performance degradation', async () => {
      const trends = [
        {
          modCombination: ['mod1', 'mod2'],
          timeRange: { start: Date.now() - 86400000, end: Date.now() },
          metrics: {
            fps: {
              values: [50, 40, 30], // More significant degradation
              timestamps: [Date.now() - 86400000, Date.now() - 43200000, Date.now()],
              average: 40,
              min: 30,
              max: 50,
              standardDeviation: 10,
              trend: 'decreasing' as const,
              slope: -10 // More significant slope to trigger alert
            },
            memory: {
              values: [4000, 4100, 4200],
              timestamps: [Date.now() - 86400000, Date.now() - 43200000, Date.now()],
              average: 4100,
              min: 4000,
              max: 4200,
              standardDeviation: 100,
              trend: 'increasing' as const,
              slope: 100
            },
            loadTime: {
              values: [20000, 21000, 22000],
              timestamps: [Date.now() - 86400000, Date.now() - 43200000, Date.now()],
              average: 21000,
              min: 20000,
              max: 22000,
              standardDeviation: 1000,
              trend: 'increasing' as const,
              slope: 1000
            },
            stability: {
              values: [1, 1, 1],
              timestamps: [Date.now() - 86400000, Date.now() - 43200000, Date.now()],
              average: 1,
              min: 1,
              max: 1,
              standardDeviation: 0,
              trend: 'stable' as const,
              slope: 0
            }
          },
          significantChanges: [],
          overallTrend: 'degrading' as const
        }
      ];

      const alerts = await engine.detectPerformanceDegradation(trends);

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts[0];
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('description');
      expect(alert).toHaveProperty('affectedMods');
      expect(alert).toHaveProperty('rootCause');
      expect(alert).toHaveProperty('mitigationSteps');
      expect(alert).toHaveProperty('predictedImpact');
      expect(alert).toHaveProperty('timeframe');
    });

    it('should predict future performance', async () => {
      // Add some historical data first
      await engine.recordPerformanceData({
        timestamp: Date.now() - 86400000,
        fps: 50,
        memoryUsage: 4000,
        loadTime: 20000,
        modCombination: ['mod1', 'mod2'],
        conflictCount: 0
      });

      await engine.recordPerformanceData({
        timestamp: Date.now() - 43200000,
        fps: 48,
        memoryUsage: 4100,
        loadTime: 21000,
        modCombination: ['mod1', 'mod2'],
        conflictCount: 0
      });

      const currentMods = ['mod1', 'mod2'];
      const futureChanges = [
        {
          type: 'add' as const,
          modName: 'mod3',
          fromVersion: undefined,
          toVersion: '1.0.0'
        }
      ];

      const prediction = await engine.predictFuturePerformance(currentMods, futureChanges);

      expect(prediction).toHaveProperty('timeHorizon');
      expect(prediction).toHaveProperty('predictedMetrics');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('riskFactors');
      expect(prediction).toHaveProperty('recommendedActions');

      expect(prediction.predictedMetrics).toHaveProperty('fps');
      expect(prediction.predictedMetrics).toHaveProperty('memoryUsage');
      expect(prediction.predictedMetrics).toHaveProperty('loadTime');
      expect(prediction.predictedMetrics).toHaveProperty('timestamp');

      expect(typeof prediction.confidence).toBe('number');
      expect(Array.isArray(prediction.riskFactors)).toBe(true);
      expect(Array.isArray(prediction.recommendedActions)).toBe(true);
    });

    it('should analyze mod update impact', async () => {
      const updates = [
        {
          modName: 'mod1',
          fromVersion: '1.0.0',
          toVersion: '1.1.0',
          updateType: 'minor' as const,
          changelog: 'Performance improvements',
          timestamp: Date.now() - 86400000
        }
      ];

      const analyses = await engine.analyzeModUpdateImpact(updates);

      expect(Array.isArray(analyses)).toBe(true);
      expect(analyses.length).toBe(1);

      const analysis = analyses[0];
      expect(analysis).toHaveProperty('modName');
      expect(analysis).toHaveProperty('update');
      expect(analysis).toHaveProperty('performanceImpact');
      expect(analysis).toHaveProperty('compatibilityChanges');
      expect(analysis).toHaveProperty('riskLevel');
      expect(analysis).toHaveProperty('recommendations');

      expect(analysis.performanceImpact).toHaveProperty('fps');
      expect(analysis.performanceImpact).toHaveProperty('memory');
      expect(analysis.performanceImpact).toHaveProperty('loadTime');

      expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
    });
  });

  describe('status monitoring', () => {
    it('should return correct status', async () => {
      await engine.start();
      const status = await engine.getStatus();

      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('engineType');
      expect(status).toHaveProperty('engine');
      expect(status).toHaveProperty('startTime');

      expect(status.engine).toBe('longitudinal');
      expect(status.engineType).toBe('longitudinal');
    });

    it('should return results', async () => {
      await engine.start();
      const results = await engine.getResults();

      expect(results).toHaveProperty('engine');
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('dataPoints');
      expect(results).toHaveProperty('trends');
      expect(results).toHaveProperty('degradationAlerts');
      expect(results).toHaveProperty('predictions');
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('metadata');

      expect(results.engine).toBe('longitudinal');
      expect(typeof results.dataPoints).toBe('number');
      expect(Array.isArray(results.trends)).toBe(true);
      expect(Array.isArray(results.degradationAlerts)).toBe(true);
      expect(typeof results.predictions).toBe('object'); // Now returns single FuturePerformancePrediction
    });
  });
});