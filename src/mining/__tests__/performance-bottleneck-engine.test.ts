import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceBottleneckDetectionEngine } from '../performance-bottleneck-engine';

describe('PerformanceBottleneckDetectionEngine', () => {
  let engine: PerformanceBottleneckDetectionEngine;

  beforeEach(() => {
    engine = new PerformanceBottleneckDetectionEngine({
      monitoringInterval: 1000,
      bottleneckThresholds: { cpu: 80, gpu: 85, memory: 90, fps: 30 },
      enableRealTimeMonitoring: false
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

  describe('bottleneck analysis', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should analyze performance bottlenecks', async () => {
      const performanceData = {
        metrics: [
          { fps: 45, memoryUsage: 4096, loadTime: 25, timestamp: Date.now() },
          { fps: 42, memoryUsage: 4352, loadTime: 28, timestamp: Date.now() + 1000 },
          { fps: 38, memoryUsage: 4608, loadTime: 32, timestamp: Date.now() + 2000 }
        ],
        systemInfo: {
          cpu: { cores: 4, baseClock: 3.0 },
          gpu: [{ vram: 4 }],
          ram: { total: 8 },
          storage: { type: 'SSD' }
        } as any,
        loadOrder: ['mod1', 'mod2', 'mod3'],
        sessionDuration: 180
      };

      const analysis = await engine.analyzeBottlenecks(performanceData);

      expect(analysis).toHaveProperty('primaryBottlenecks');
      expect(analysis).toHaveProperty('secondaryBottlenecks');
      expect(analysis).toHaveProperty('criticalPath');
      expect(analysis).toHaveProperty('systemLimitations');
      expect(analysis).toHaveProperty('optimizationOpportunities');
      expect(analysis).toHaveProperty('confidence');
    });

    it('should identify FPS bottlenecks', async () => {
      const performanceData = {
        metrics: [
          { fps: 25, memoryUsage: 2048, loadTime: 15, timestamp: Date.now() }
        ],
        systemInfo: {} as any,
        loadOrder: [],
        sessionDuration: 60
      };

      const analysis = await engine.analyzeBottlenecks(performanceData);

      expect(analysis.primaryBottlenecks.length).toBeGreaterThan(0);
      const fpsBottleneck = analysis.primaryBottlenecks.find(b => b.type === 'cpu');
      expect(fpsBottleneck).toBeDefined();
      expect(fpsBottleneck?.severity).toBe('high');
    });

    it('should identify memory bottlenecks', async () => {
      const performanceData = {
        metrics: [
          { fps: 55, memoryUsage: 7168, loadTime: 45, timestamp: Date.now() }
        ],
        systemInfo: {
          ram: { total: 8 }
        } as any,
        loadOrder: [],
        sessionDuration: 60
      };

      const analysis = await engine.analyzeBottlenecks(performanceData);

      const memoryBottleneck = analysis.primaryBottlenecks.find(b => b.type === 'memory');
      expect(memoryBottleneck).toBeDefined();
    });
  });

  describe('performance prediction', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should predict performance impact of mod changes', async () => {
      const modChanges = [
        {
          type: 'add' as const,
          modName: 'HighResTextures',
          fromVersion: undefined,
          toVersion: '1.0.0',
          newPosition: 5
        }
      ];

      const predictions = await engine.predictPerformanceImpact(modChanges);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(1);

      const prediction = predictions[0];
      expect(prediction).toHaveProperty('modChange');
      expect(prediction).toHaveProperty('predictedImpact');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('riskLevel');
      expect(prediction).toHaveProperty('recommendations');
    });
  });

  describe('optimization opportunities', () => {
    it('should identify optimization opportunities', async () => {
      const systemProfile = {
        cpu: { cores: 2, baseClock: 2.5 },
        gpu: [{ vram: 2 }],
        ram: { total: 4 },
        storage: { type: 'HDD' as const }
      };

      const opportunities = await engine.identifyOptimizationOpportunities(systemProfile);

      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBeGreaterThan(0);

      opportunities.forEach(opportunity => {
        expect(opportunity).toHaveProperty('type');
        expect(opportunity).toHaveProperty('description');
        expect(opportunity).toHaveProperty('potentialGain');
        expect(opportunity).toHaveProperty('difficulty');
        expect(opportunity).toHaveProperty('prerequisites');
        expect(opportunity).toHaveProperty('affectedMods');
      });
    });
  });

  describe('real-time monitoring', () => {
    it('should monitor real-time performance', async () => {
      const metrics = await engine.monitorRealTimePerformance();

      expect(metrics).toHaveProperty('currentFPS');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('gpuUsage');
      expect(metrics).toHaveProperty('activeMods');
      expect(metrics).toHaveProperty('bottleneckIndicators');
      expect(metrics).toHaveProperty('timestamp');
    });
  });

  describe('status monitoring', () => {
    it('should return correct status', async () => {
      const status = await engine.getStatus();

      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('engineType');
      expect(status.engineType).toBe('performance-bottleneck');
    });

    it('should return results', async () => {
      const results = await engine.getResults();

      expect(results).toHaveProperty('engine');
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('currentAnalysis');
      expect(results).toHaveProperty('historicalTrends');
      expect(results).toHaveProperty('bottleneckPatterns');
      expect(results).toHaveProperty('recommendations');
      expect(results).toHaveProperty('metadata');
      expect(results.engine).toBe('performance-bottleneck');
    });
  });
});