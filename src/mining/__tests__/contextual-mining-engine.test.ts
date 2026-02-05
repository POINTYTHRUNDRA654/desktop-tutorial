import { describe, it, expect, beforeEach } from 'vitest';
import { ContextualMiningEngine } from '../contextual-mining-engine';

describe('ContextualMiningEngine', () => {
  let engine: ContextualMiningEngine;

  beforeEach(() => {
    engine = new ContextualMiningEngine({
      learningRate: 0.1,
      contextWindowSize: 10,
      enablePersonalization: true,
      feedbackIncorporationRate: 0.8
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

  describe('user profiling', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should build user profile from interactions', async () => {
      const interactions = [
        {
          type: 'mod_installation',
          modName: 'HighResTextures',
          timestamp: Date.now(),
          context: { gameMode: 'survival', difficulty: 'hard' },
          outcome: { success: true, performance: 8 }
        },
        {
          type: 'setting_adjustment',
          settingName: 'texture_quality',
          value: 'ultra',
          timestamp: Date.now() + 1000,
          context: { hardware: 'high_end' },
          outcome: { satisfaction: 9 }
        },
        {
          type: 'mod_removal',
          modName: 'HeavyMod',
          timestamp: Date.now() + 2000,
          context: { reason: 'performance_issues' },
          outcome: { success: true }
        }
      ];

      for (const interaction of interactions) {
        await engine.recordUserInteraction(interaction);
      }

      const profile = await engine.buildUserProfile();

      expect(profile).toHaveProperty('preferences');
      expect(profile).toHaveProperty('behaviorPatterns');
      expect(profile).toHaveProperty('performanceTolerance');
      expect(profile).toHaveProperty('modPreferences');
      expect(profile).toHaveProperty('settingPreferences');
      expect(profile).toHaveProperty('contextualPatterns');
      expect(profile).toHaveProperty('learningProgress');
    });

    it('should analyze user preferences', async () => {
      const preferences = await engine.analyzeUserPreferences();

      expect(preferences).toHaveProperty('visualQuality');
      expect(preferences).toHaveProperty('performancePriority');
      expect(preferences).toHaveProperty('modCategories');
      expect(preferences).toHaveProperty('complexityTolerance');
      expect(preferences).toHaveProperty('automationPreference');
      expect(preferences).toHaveProperty('learningStyle');
    });
  });

  describe('contextual recommendations', () => {
    beforeEach(async () => {
      await engine.start();

      // Build some context with user interactions
      await engine.recordUserInteraction({
        type: 'mod_installation',
        modName: 'RealisticLighting',
        timestamp: Date.now(),
        context: { gameMode: 'roleplay', difficulty: 'normal' },
        outcome: { success: true, performance: 7 }
      });
    });

    it('should generate contextual recommendations', async () => {
      const context = {
        currentMods: ['RealisticLighting'],
        gameMode: 'roleplay',
        difficulty: 'normal',
        hardwareProfile: { gpu: 'high_end', cpu: 'high_end' },
        performanceMetrics: { fps: 50, memoryUsage: 4096 }
      };

      const recommendations = await engine.generateContextualRecommendations(context);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('item');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('contextRelevance');
        expect(rec).toHaveProperty('expectedImpact');
      });
    });

    it('should adapt recommendations based on context', async () => {
      const roleplayContext = {
        currentMods: ['RealisticLighting'],
        gameMode: 'roleplay',
        difficulty: 'normal',
        hardwareProfile: { gpu: 'high_end', cpu: 'high_end' },
        performanceMetrics: { fps: 50, memoryUsage: 4096 }
      };

      const survivalContext = {
        currentMods: ['RealisticLighting'],
        gameMode: 'survival',
        difficulty: 'hard',
        hardwareProfile: { gpu: 'mid_range', cpu: 'mid_range' },
        performanceMetrics: { fps: 35, memoryUsage: 6144 }
      };

      const roleplayRecs = await engine.generateContextualRecommendations(roleplayContext);
      const survivalRecs = await engine.generateContextualRecommendations(survivalContext);

      // Recommendations should differ based on context
      expect(roleplayRecs.length).not.toBe(survivalRecs.length);
    });
  });

  describe('adaptive learning', () => {
    it('should learn from user feedback', async () => {
      const feedback = {
        recommendationId: 'rec-123',
        accepted: true,
        rating: 8,
        context: { gameMode: 'roleplay' },
        outcome: { performance: 7, satisfaction: 9 },
        timestamp: Date.now()
      };

      await engine.incorporateUserFeedback(feedback);

      // Verify learning occurred
      const profile = await engine.buildUserProfile();
      expect(profile.learningProgress.feedbackIncorporated).toBeGreaterThan(0);
    });

    it('should adapt behavior patterns', async () => {
      // Record multiple interactions to establish patterns
      const interactions = [
        { type: 'mod_installation', modName: 'VisualMod1', context: { gameMode: 'roleplay' }, outcome: { success: true } },
        { type: 'mod_installation', modName: 'VisualMod2', context: { gameMode: 'roleplay' }, outcome: { success: true } },
        { type: 'mod_installation', modName: 'PerformanceMod1', context: { gameMode: 'survival' }, outcome: { success: true } }
      ];

      for (const interaction of interactions) {
        await engine.recordUserInteraction(interaction);
      }

      const patterns = await engine.analyzeBehaviorPatterns();

      expect(patterns).toHaveProperty('modCategoryPreferences');
      expect(patterns).toHaveProperty('contextualBehaviors');
      expect(patterns).toHaveProperty('successPatterns');
      expect(patterns).toHaveProperty('riskTolerance');

      expect(patterns.modCategoryPreferences.visual).toBeGreaterThan(0);
    });
  });

  describe('personalization', () => {
    it('should personalize recommendations for user', async () => {
      // Establish user preferences through interactions
      await engine.recordUserInteraction({
        type: 'preference_setting',
        settingName: 'visual_quality',
        value: 'high',
        context: {},
        outcome: { satisfaction: 9 }
      });

      await engine.recordUserInteraction({
        type: 'mod_rating',
        modName: 'HighResTextures',
        rating: 9,
        context: {},
        outcome: {}
      });

      const personalizedRecs = await engine.generatePersonalizedRecommendations();

      expect(Array.isArray(personalizedRecs)).toBe(true);
      personalizedRecs.forEach(rec => {
        expect(rec).toHaveProperty('personalizationScore');
        expect(rec).toHaveProperty('userPreferenceAlignment');
        expect(rec.personalizationScore).toBeGreaterThan(0);
      });
    });
  });

  describe('context awareness', () => {
    it('should maintain context across sessions', async () => {
      const session1Context = {
        gameMode: 'roleplay',
        difficulty: 'normal',
        activeMods: ['Mod1', 'Mod2']
      };

      const session2Context = {
        gameMode: 'survival',
        difficulty: 'hard',
        activeMods: ['Mod1', 'Mod3']
      };

      await engine.updateSessionContext(session1Context);
      await engine.updateSessionContext(session2Context);

      const contextHistory = await engine.getContextHistory();

      expect(contextHistory.length).toBe(2);
      expect(contextHistory[0].gameMode).toBe('roleplay');
      expect(contextHistory[1].gameMode).toBe('survival');
    });

    it('should analyze context transitions', async () => {
      const transitions = [
        { from: { gameMode: 'roleplay' }, to: { gameMode: 'survival' }, timestamp: Date.now() },
        { from: { difficulty: 'normal' }, to: { difficulty: 'hard' }, timestamp: Date.now() + 1000 }
      ];

      for (const transition of transitions) {
        await engine.recordContextTransition(transition);
      }

      const transitionAnalysis = await engine.analyzeContextTransitions();

      expect(transitionAnalysis).toHaveProperty('commonTransitions');
      expect(transitionAnalysis).toHaveProperty('transitionPatterns');
      expect(transitionAnalysis).toHaveProperty('adaptationStrategies');
    });
  });

  describe('status monitoring', () => {
    it('should return correct status', async () => {
      const status = await engine.getStatus();

      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('engineType');
      expect(status.engineType).toBe('contextual');
    });

    it('should return results', async () => {
      const results = await engine.getResults();

      expect(results).toHaveProperty('engine');
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('userProfile');
      expect(results).toHaveProperty('contextualInsights');
      expect(results).toHaveProperty('personalizedRecommendations');
      expect(results).toHaveProperty('learningMetrics');
      expect(results).toHaveProperty('adaptationHistory');
      expect(results).toHaveProperty('metadata');
      expect(results.engine).toBe('contextual');
    });
  });
});