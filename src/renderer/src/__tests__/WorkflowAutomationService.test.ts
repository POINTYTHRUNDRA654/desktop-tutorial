import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCacheManager = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../CacheManager', () => ({
  cacheManager: mockCacheManager,
}));

// Import after mocking
import { createWorkflowAutomationService } from '../WorkflowAutomationService';

describe('WorkflowAutomationService', () => {
  let service: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheManager.set.mockResolvedValue(undefined);
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.delete.mockResolvedValue(undefined);
    service = createWorkflowAutomationService(mockCacheManager);
  });

  it('should create a macro', async () => {
    const macroId = await service.createMacro('Test Macro', 'A test macro', ['test']);

    expect(macroId).toBeDefined();
    expect(typeof macroId).toBe('string');
    expect(macroId.startsWith('macro_')).toBe(true);
  });

  it('should get a macro by id', async () => {
    const macroId = await service.createMacro('Test Macro', 'A test macro');
    const macro = service.getMacro(macroId);

    expect(macro).toBeDefined();
    expect(macro?.name).toBe('Test Macro');
    expect(macro?.description).toBe('A test macro');
    expect(macro?.steps).toEqual([]);
    expect(macro?.isActive).toBe(true);
  });

  it('should return undefined for non-existent macro', () => {
    const macro = service.getMacro('non-existent-id');
    expect(macro).toBeUndefined();
  });

  it('should get all macros', async () => {
    await service.createMacro('Macro 1', 'First macro');
    await service.createMacro('Macro 2', 'Second macro');

    const macros = service.getAllMacros();
    expect(macros).toHaveLength(2);
    expect(macros.map(m => m.name)).toEqual(['Macro 1', 'Macro 2']);
  });

  it('should update a macro', async () => {
    const macroId = await service.createMacro('Original Name', 'Original description');

    await service.updateMacro(macroId, {
      name: 'Updated Name',
      description: 'Updated description'
    });

    const updatedMacro = service.getMacro(macroId);
    expect(updatedMacro?.name).toBe('Updated Name');
    expect(updatedMacro?.description).toBe('Updated description');
  });

  it('should throw error when updating non-existent macro', async () => {
    await expect(service.updateMacro('non-existent', { name: 'test' }))
      .rejects
      .toThrow('Macro non-existent not found');
  });

  it('should delete a macro', async () => {
    const macroId = await service.createMacro('Test Macro', 'To be deleted');

    await service.deleteMacro(macroId);

    const deletedMacro = service.getMacro(macroId);
    expect(deletedMacro).toBeUndefined();

    const allMacros = service.getAllMacros();
    expect(allMacros).toHaveLength(0);
  });

  it('should throw error when deleting non-existent macro', async () => {
    await expect(service.deleteMacro('non-existent'))
      .rejects
      .toThrow('Macro non-existent not found');
  });
});