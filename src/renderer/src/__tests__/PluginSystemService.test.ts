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
import { PluginSystemService, createPluginSystemService } from '../PluginSystemService';

describe('PluginSystemService', () => {
  let service: PluginSystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheManager.set.mockResolvedValue(undefined);
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.delete.mockResolvedValue(undefined);
    service = createPluginSystemService(mockCacheManager);
  });

  it('should initialize with empty plugin list', () => {
    const plugins = service.getAllPlugins();
    expect(plugins).toEqual([]);
  });

  it('should get plugin by id', () => {
    const plugin = service.getPlugin('non-existent');
    expect(plugin).toBeUndefined();
  });

  it('should get all plugins', () => {
    const plugins = service.getAllPlugins();
    expect(plugins).toBeInstanceOf(Array);
    expect(plugins).toHaveLength(0);
  });

  it('should get active plugins', () => {
    const activePlugins = service.getActivePlugins();
    expect(activePlugins).toEqual([]);
  });

  it('should get plugin context for non-existent plugin', () => {
    const context = service.getPluginContext('non-existent');
    expect(context).toBeUndefined();
  });

  it('should discover plugins (returns empty array)', async () => {
    const plugins = await service.discoverPlugins();
    expect(plugins).toEqual([]);
  });

  it('should handle plugin installation failure', async () => {
    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(service.installPlugin('/fake/path'))
      .rejects
      .toThrow('Failed to install plugin from /fake/path: Network error');
  });

  it('should handle plugin uninstallation of non-existent plugin', async () => {
    await expect(service.uninstallPlugin('non-existent'))
      .rejects
      .toThrow('Plugin non-existent not found');
  });

  it('should handle plugin activation of non-existent plugin', async () => {
    await expect(service.activatePlugin('non-existent'))
      .rejects
      .toThrow('Plugin non-existent not found');
  });

  it('should handle plugin deactivation of non-existent plugin', async () => {
    // Should not throw for non-existent plugin
    await expect(service.deactivatePlugin('non-existent')).resolves.toBeUndefined();
  });
});