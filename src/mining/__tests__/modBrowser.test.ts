import { describe, it, expect } from 'vitest';
import { modBrowser } from '../modBrowser';

describe('ModBrowserEngine (stubs) - updated DTOs', () => {
  it('searches and returns listings', async () => {
    const results = await modBrowser.searchMods('vault', { game: 'fallout4', sortBy: 'downloads', nsfw: false });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
    expect(results[0]).toHaveProperty('endorsements');
    expect(results[0]).toHaveProperty('thumbnailUrl');
  });

  it('retrieves mod details and reviews', async () => {
    const list = await modBrowser.searchMods('', { game: 'fallout4', sortBy: 'trending', nsfw: false });
    const id = list[0]?.id;
    expect(id).toBeDefined();
    const details = await modBrowser.getModDetails(id!);
    expect(details.id).toBe(id);
    expect(Array.isArray(details.files)).toBe(true);
    const reviews = await modBrowser.getModReviews(id!);
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews[0]).toHaveProperty('text');
  });

  it('creates and shares a collection', async () => {
    const col = await modBrowser.createCollection('My Test Collection', ['m_1001', 'm_1002'], 'Demo collection');
    expect(col.name).toBe('My Test Collection');
    expect(col).toHaveProperty('shareUrl');
    const share = await modBrowser.shareCollection(col.id);
    expect(share.success).toBe(true);
    expect(share.shareUrl).toBeDefined();
  });

  it('authenticates nexus and endorses a mod', async () => {
    const auth = await modBrowser.authenticateNexus('fake-key-123');
    expect(auth.success).toBe(true);
    const before = (await modBrowser.searchMods('papyrus', { game: 'fallout4', sortBy: 'trending', nsfw: false })).find(m => m.id === 'm_1003');
    const beforeEndorse = before?.endorsements ?? 0;
    await modBrowser.endorseMod('m_1003');
    const after = (await modBrowser.searchMods('papyrus', { game: 'fallout4', sortBy: 'trending', nsfw: false })).find(m => m.id === 'm_1003');
    expect((after?.endorsements ?? 0)).toBeGreaterThanOrEqual(beforeEndorse + 1);
  });

  it('downloads a mod (stub) and returns DownloadResult', async () => {
    const res = await modBrowser.downloadMod('m_1001', 'C:/temp');
    expect(res.success).toBe(true);
    expect(res).toHaveProperty('filePath');
    expect(res.duration).toBeGreaterThanOrEqual(0);
  });
});