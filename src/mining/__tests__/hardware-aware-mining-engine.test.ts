import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareAwareMiningEngine } from '../hardware-aware-mining-engine';

describe('HardwareAwareMiningEngine', () => {
  let engine: HardwareAwareMiningEngine;

  beforeEach(() => {
    engine = new HardwareAwareMiningEngine({
      enableHardwareDetection: true,
      benchmarkInterval: 7,
      compatibilityThreshold: 0.7,
      enableAdaptiveRecommendations: true
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

  describe('hardware compatibility analysis', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should analyze mod compatibility with hardware', async () => {
      const mods = ['Unofficial Skyrim Special Edition Patch', 'SkyUI', 'SSE Engine Fixes'];
      const compatibility = await engine.analyzeHardwareCompatibility(mods);

      expect(Array.isArray(compatibility)).toBe(true);
      expect(compatibility).toHaveLength(mods.length);

      compatibility.forEach(result => {
        expect(result).toHaveProperty('modName');
        expect(result).toHaveProperty('compatibility');
        expect(result).toHaveProperty('requirements');
        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('warnings');
        expect(result.compatibility).toHaveProperty('cpu');
        expect(result.compatibility).toHaveProperty('gpu');
        expect(result.compatibility).toHaveProperty('ram');
        expect(result.compatibility).toHaveProperty('storage');
      });
    });

    it('should generate hardware-aware recommendations', async () => {
      const mockProfile = {
        cpu: { model: 'Intel i5', cores: 4, threads: 8, baseClock: 3.0, boostClock: 4.0, cache: 8 },
        gpu: { model: 'GTX 1060', vram: 6, driverVersion: '400', dxVersion: '11', rayTracing: false },
        ram: { total: 16, speed: 2133, type: 'DDR4', channels: 2 },
        storage: { type: 'SSD', readSpeed: 500, writeSpeed: 400, totalSpace: 500, availableSpace: 300 },
        os: { name: 'Windows', version: '10', architecture: 'x64' }
      };

      const recommendations = await engine.generateHardwareSpecificRecommendations(mockProfile);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('component');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('performanceGain');
        expect(rec).toHaveProperty('affectedMods');
      });
    });
  });

  describe('performance prediction', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should predict performance for hardware configuration', async () => {
      const mods = ['High-res textures', 'Complex weather mod'];
      const hardwareProfile = {
        cpu: { model: 'Intel i7', cores: 8, threads: 16, baseClock: 3.8, boostClock: 5.1, cache: 16 },
        gpu: { model: 'RTX 3070', vram: 8, driverVersion: '516', dxVersion: '12', rayTracing: true },
        ram: { total: 32, speed: 3200, type: 'DDR4', channels: 2 },
        storage: { type: 'NVMe', readSpeed: 3500, writeSpeed: 3000, totalSpace: 1000, availableSpace: 700 },
        os: { name: 'Windows', version: '11', architecture: 'x64' }
      };

      const prediction = await engine.predictPerformanceForHardware(mods, hardwareProfile);

      expect(prediction).toHaveProperty('baselinePerformance');
      expect(prediction).toHaveProperty('predictedPerformance');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('limitingFactors');
      expect(prediction).toHaveProperty('optimizationSuggestions');
      expect(Array.isArray(prediction.limitingFactors)).toBe(true);
      expect(Array.isArray(prediction.optimizationSuggestions)).toBe(true);
    });
  });

  describe('optimization', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should optimize settings for hardware', async () => {
      const mods = ['Texture pack', 'Mesh replacer'];
      const hardwareProfile = {
        cpu: { model: 'Intel i5', cores: 6, threads: 12, baseClock: 4.1, boostClock: 4.6, cache: 12 },
        gpu: { model: 'RTX 3060', vram: 12, driverVersion: '531', dxVersion: '12', rayTracing: true },
        ram: { total: 16, speed: 3200, type: 'DDR4', channels: 2 },
        storage: { type: 'NVMe', readSpeed: 3500, writeSpeed: 3000, totalSpace: 1000, availableSpace: 700 },
        os: { name: 'Windows', version: '11', architecture: 'x64' }
      };

      const optimizations = await engine.optimizeForHardware(mods, hardwareProfile);

      expect(Array.isArray(optimizations)).toBe(true);
      optimizations.forEach(opt => {
        expect(opt).toHaveProperty('type');
        expect(opt).toHaveProperty('description');
        expect(opt).toHaveProperty('currentSetting');
        expect(opt).toHaveProperty('recommendedSetting');
        expect(opt).toHaveProperty('performanceImpact');
        expect(opt).toHaveProperty('compatibility');
      });
    });
  });

  describe('status monitoring', () => {
    it('should return correct status', async () => {
      const status = await engine.getStatus();

      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('engineType');
      expect(status.engineType).toBe('hardware-aware');
    });

    it('should return results', async () => {
      const results = await engine.getResults();

      expect(results).toHaveProperty('engine');
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('predictions');
      expect(results).toHaveProperty('insights');
      expect(results).toHaveProperty('recommendations');
      expect(results).toHaveProperty('metadata');
      expect(results.engine).toBe('hardware-aware');
      expect(Array.isArray(results.predictions)).toBe(true);
      expect(Array.isArray(results.insights)).toBe(true);
      expect(Array.isArray(results.recommendations)).toBe(true);
      expect(results.metadata).toHaveProperty('hardwareProfile');
      expect(results.metadata).toHaveProperty('compatibilityAnalysis');
      expect(results.metadata).toHaveProperty('recommendations');
    });
  });
});