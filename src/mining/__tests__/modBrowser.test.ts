
import { modBrowser } from '../modBrowser';

describe('ModBrowserEngine - OAuth-only access and local operations', () => {
  it('requires auth before search', async () => {
    await expect(
      modBrowser.searchMods('vault', { game: 'fallout4', sortBy: 'downloads', nsfw: false }),
    ).rejects.toThrow(/sign in with your nexus account/i);
  });

  it('has no personal API key entry point', () => {
    expect((modBrowser as any).authenticateNexus).toBeUndefined();
    expect((modBrowser as any).restoreNexusAuth).toBeUndefined();
  });

  it('creates and shares a collection', async () => {
    const col = await modBrowser.createCollection('My Test Collection', [
      { title: 'My Technique', type: 'technique', content: 'Do the thing this way.' },
    ], 'Demo collection');
    expect(col.name).toBe('My Test Collection');
    expect(col.items).toHaveLength(1);
    const share = await modBrowser.shareCollection(col.id);
    expect(share.success).toBe(true);
    expect(share.exportPath).toBeDefined();
  });

  it('stores and returns local reviews', async () => {
    await modBrowser.rateMod('nx_1234', 5, 'Solid mod');
    const reviews = await modBrowser.getModReviews('nx_1234');
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews[0]).toHaveProperty('text');
  });

  it('requires auth before download', async () => {
    await expect(modBrowser.downloadMod('nx_1001', 'C:/temp')).rejects.toThrow(/sign in with your nexus account/i);
  });
});
