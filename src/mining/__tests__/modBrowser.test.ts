
import { modBrowser } from '../modBrowser';

describe('ModBrowserEngine - authentication and local operations', () => {
  it('requires auth before search', async () => {
    await expect(
      modBrowser.searchMods('vault', { game: 'fallout4', sortBy: 'downloads', nsfw: false }),
    ).rejects.toThrow(/API key is required/i);
  });

  it('rejects invalid nexus auth', async () => {
    const auth = await modBrowser.authenticateNexus('');
    expect(auth.success).toBe(false);
  });

  it('creates and shares a collection', async () => {
    const col = await modBrowser.createCollection('My Test Collection', ['nx_1001', 'nx_1002'], 'Demo collection');
    expect(col.name).toBe('My Test Collection');
    expect(col).toHaveProperty('shareUrl');
    const share = await modBrowser.shareCollection(col.id);
    expect(share.success).toBe(true);
    expect(share.shareUrl).toBeDefined();
  });

  it('stores and returns local reviews', async () => {
    await modBrowser.rateMod('nx_1234', 5, 'Solid mod');
    const reviews = await modBrowser.getModReviews('nx_1234');
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews[0]).toHaveProperty('text');
  });

  it('requires auth before download', async () => {
    await expect(modBrowser.downloadMod('nx_1001', 'C:/temp')).rejects.toThrow(/API key is required/i);
  });
});
