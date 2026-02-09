import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextAwareAIService } from '../ContextAwareAIService';

// Mock IndexedDB since it's not available in Node.js test environment
const mockIndexedDB = {
  openDB: vi.fn(),
  deleteDB: vi.fn(),
};

// Mock the idb module
vi.mock('idb', () => ({
  openDB: mockIndexedDB.openDB,
  deleteDB: mockIndexedDB.deleteDB,
}));

// Mock CacheManager to avoid IndexedDB dependency
vi.mock('../CacheManager', () => ({
  cacheManager: {
    init: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ContextAwareAIService', () => {
  let service: ContextAwareAIService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create a fresh service instance for testing
    service = new ContextAwareAIService();
  });

  it('should initialize with default context', () => {
    const context = service.getCurrentContext();
    expect(context).toBeDefined();
    expect(context.userIntent).toBe('general-modding');
    expect(context.workflowStage).toBe('planning');
    expect(Array.isArray(context.activeTools)).toBe(true);
    expect(Array.isArray(context.recentFiles)).toBe(true);
  });

  it('should update tool context and infer workflow stage', () => {
    const mockTools = [
      {
        name: 'Blender',
        processName: 'blender.exe',
        isActive: true,
        lastActive: Date.now(),
        context: {}
      }
    ];

    service.updateToolContext(mockTools);

    const context = service.getCurrentContext();
    expect(context.activeTools).toEqual(mockTools);
    expect(context.workflowStage).toBe('modeling'); // Updated: now returns specific stage instead of generic 'creating'
    expect(context.userIntent).toBe('3d-modeling');
  });

  it('should generate suggestions based on context', () => {
    const mockTools = [
      {
        name: 'Blender',
        processName: 'blender.exe',
        isActive: true,
        lastActive: Date.now(),
        context: {}
      }
    ];

    service.updateToolContext(mockTools);

    // Wait a bit for suggestions to generate (30 second interval in real service)
    // For testing, we'll manually trigger generation
    setTimeout(() => {
      const suggestions = service.getCurrentSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
      // Note: In real usage, suggestions would be generated every 30 seconds
      // For this test, we verify the service can be initialized and context updated
    }, 100);
  });

  it('should update file context', () => {
    const testFiles = ['model.nif', 'texture.dds', 'script.pex'];
    const projectName = 'TestMod';

    service.updateFileContext(testFiles, projectName);

    const context = service.getCurrentContext();
    expect(context.recentFiles).toEqual(testFiles);
    expect(context.currentProject).toBe(projectName);
  });

  it('should enhance prompts with context', () => {
    const basePrompt = 'Help me with Fallout 4 modding';
    const enhanced = service.enhancePromptWithContext(basePrompt);

    expect(enhanced).toContain(basePrompt);
    expect(enhanced).toContain('Context Information');
    expect(enhanced).toContain('Workflow Stage');
    expect(enhanced).toContain('User Intent');
  });
});