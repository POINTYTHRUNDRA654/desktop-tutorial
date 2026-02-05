import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelfImprovementEngine } from './SelfImprovementEngine';

// Mock localStorage globally
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('SelfImprovementEngine', () => {
  let engine: SelfImprovementEngine;

  beforeEach(() => {
    // Clear mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    // Mock empty localStorage initially
    localStorageMock.getItem.mockReturnValue(null);

    // Create new engine instance
    engine = new SelfImprovementEngine();
  });

  afterEach(() => {
    // Clean up after each test
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('recordInteraction', () => {
    it('should record successful interactions and identify patterns', () => {
      const query = 'How do I install a Fallout 4 mod?';
      const response = 'To install a Fallout 4 mod, you need to...';
      const toolsUsed = ['file_reader'];
      const outcome = 'success' as const;

      engine.recordInteraction(query, response, toolsUsed, outcome);

      // Check that patterns were identified
      const metrics = engine.getPerformanceMetrics();
      expect(metrics.totalInteractions).toBeGreaterThan(0);
      expect(metrics.totalPatterns).toBeGreaterThan(0);
    });

    it('should identify improvement opportunities for failed interactions', () => {
      const query = 'What is the meaning of life?';
      const response = "I don't know that.";
      const toolsUsed: string[] = [];
      const outcome = 'failure' as const;

      engine.recordInteraction(query, response, toolsUsed, outcome);

      // Check for improvement opportunities
      const suggestions = engine.generateImprovementSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      const knowledgeGap = suggestions.find(s => s.type === 'knowledge_gap');
      expect(knowledgeGap).toBeDefined();
      expect(knowledgeGap?.description).toContain('Knowledge gap identified');
    });

    it('should track tool usage patterns', () => {
      const query = 'Analyze this NIF file';
      const response = 'Analysis complete...';
      const toolsUsed = ['nif_validator', 'texture_analyzer'];
      const outcome = 'success' as const;

      // Record multiple times to meet frequency threshold
      engine.recordInteraction(query, response, toolsUsed, outcome);
      engine.recordInteraction(query, response, toolsUsed, outcome);

      const insights = engine.getLearningInsights();
      expect(insights).toContain('Uses: nif_validator,texture_analyzer');
    });
  });

  describe('generateImprovementSuggestions', () => {
    it('should return top improvement opportunities by confidence', () => {
      // Record multiple interactions to generate opportunities
      engine.recordInteraction('How to fix CTD?', 'Check your mods...', [], 'partial');
      engine.recordInteraction('How to fix CTD?', 'Check your mods...', [], 'partial');
      engine.recordInteraction('How to fix CTD?', 'Check your mods...', [], 'partial');
      engine.recordInteraction('Unknown topic', "I don't know", [], 'failure');

      const suggestions = engine.generateImprovementSuggestions();

      expect(suggestions.length).toBeLessThanOrEqual(5); // Should limit to top 5
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(suggestions[suggestions.length - 1].confidence);
    });
  });

  describe('getLearningInsights', () => {
    it('should provide insights about successful patterns', () => {
      // Record successful interactions
      engine.recordInteraction('How to install mods?', 'Step 1...', [], 'success');
      engine.recordInteraction('How to install mods?', 'Step 1...', [], 'success');
      engine.recordInteraction('How to install mods?', 'Step 1...', [], 'success');

      const insights = engine.getLearningInsights();

      expect(insights).toContain('High-Success Patterns');
      expect(insights).toContain('how-to questions');
    });

    it('should identify areas needing improvement', () => {
      // Record failed interactions with recognizable patterns
      engine.recordInteraction('How to fix error in Blender', 'Short answer', [], 'failure');
      engine.recordInteraction('How to fix error in Blender', 'Short answer', [], 'failure');

      const insights = engine.getLearningInsights();

      expect(insights).toContain('Areas Needing Improvement');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', () => {
      engine.recordInteraction('Test query 1', 'Response 1', ['tool1'], 'success');
      engine.recordInteraction('Test query 2', 'Response 2', ['tool2'], 'failure');
      engine.recordInteraction('Test query 3', 'Response 3', [], 'partial');

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.totalInteractions).toBe(3);
      expect(metrics.averageSuccessRate).toBeGreaterThan(0);
      expect(metrics.averageSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  describe('recordFeedback', () => {
    it('should record and analyze user feedback', () => {
      const context = {
        userQuery: 'How to optimize textures?',
        mossyResponse: 'Use these tools...',
        toolsUsed: ['texture_optimizer'],
        outcome: 'success' as const
      };

      engine.recordFeedback(4, 'Very helpful response', context);

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.averageFeedbackRating).toBe(4);
    });
  });

  describe('implementImprovement', () => {
    it('should mark improvement opportunities as implemented', () => {
      engine.recordInteraction('Test', "I don't know", [], 'failure');

      const suggestions = engine.generateImprovementSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      const opportunityId = suggestions[0].id;
      engine.implementImprovement(opportunityId);

      const updatedSuggestions = engine.generateImprovementSuggestions();
      const implemented = updatedSuggestions.find(s => s.id === opportunityId);
      expect(implemented).toBeUndefined();
    });
  });
});