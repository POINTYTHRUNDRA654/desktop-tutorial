import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MLConflictPredictionEngine } from '../ml-conflict-prediction-engine';

describe('MLConflictPredictionEngine', () => {
  let engine: MLConflictPredictionEngine;

  beforeEach(() => {
    engine = new MLConflictPredictionEngine({
      modelPath: './test-model.json',
      trainingDataPath: './test-training.json',
      confidenceThreshold: 0.7,
      enableRealTimeLearning: true,
      featureWeights: {
        historicalConflicts: 0.3,
        modSimilarity: 0.25,
        loadOrder: 0.2,
        hardwareCompatibility: 0.15,
        versionCompatibility: 0.1
      }
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

  describe('conflict prediction', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should predict conflicts for mod combinations', async () => {
      const modCombination = ['mod1', 'mod2', 'mod3'];
      const predictions = await engine.predictConflicts(modCombination);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('modA');
        expect(prediction).toHaveProperty('modB');
        expect(prediction).toHaveProperty('probability');
        expect(prediction).toHaveProperty('severity');
        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should return predictions sorted by probability', async () => {
      const modCombination = ['mod1', 'mod2', 'mod3', 'mod4'];
      const predictions = await engine.predictConflicts(modCombination);

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i-1].probability).toBeGreaterThanOrEqual(predictions[i].probability);
      }
    });
  });

  describe('model training', () => {
    it('should train model with training data', async () => {
      const trainingData = [
        {
          modA: 'mod1',
          modB: 'mod2',
          actualConflict: true,
          conflictType: 'override',
          severity: 0.8,
          context: {
            gameVersion: '1.10.0',
            modVersions: { mod1: '1.0.0', mod2: '2.0.0' },
            hardwareProfile: {} as any,
            loadOrder: ['mod1', 'mod2']
          }
        }
      ];

      await expect(engine.trainModel(trainingData)).resolves.not.toThrow();
    });

    it('should get model accuracy metrics', async () => {
      const metrics = await engine.getModelAccuracy();

      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('recall');
      expect(metrics).toHaveProperty('f1Score');
      expect(metrics).toHaveProperty('trainingDataSize');
      expect(metrics).toHaveProperty('lastTrained');
    });
  });

  describe('feedback incorporation', () => {
    it('should incorporate user feedback', async () => {
      const feedback = [
        {
          predictionId: 'pred-1',
          actualOutcome: true,
          userRating: 4,
          comments: 'Accurate prediction'
        }
      ];

      await expect(engine.updateWithFeedback(feedback)).resolves.not.toThrow();
    });
  });

  describe('status monitoring', () => {
    it('should return correct status', async () => {
      const status = await engine.getStatus();

      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('engineType');
      expect(status.engineType).toBe('ml-conflict-prediction');
    });

    it('should return results', async () => {
      const results = await engine.getResults();

      expect(results).toHaveProperty('engine');
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('predictions');
      expect(results).toHaveProperty('insights');
      expect(results).toHaveProperty('recommendations');
      expect(results).toHaveProperty('metadata');
      expect(results.engine).toBe('ml-conflict-prediction');
    });
  });
});