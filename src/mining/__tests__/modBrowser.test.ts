
import { modBrowser } from '../modBrowser';

describe('ModBrowserEngine - no Nexus API, local sharing only', () => {
  it('has no Nexus account or API entry points', () => {
    const engine = modBrowser as any;
    for (const name of ['searchMods', 'getModDetails', 'downloadMod', 'endorseMod', 'setAccessTokenProvider', 'authenticateNexus', 'restoreNexusAuth']) {
      expect(engine[name]).toBeUndefined();
    }
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

  it('reports a missing collection instead of pretending to share it', async () => {
    const share = await modBrowser.shareCollection('col_does_not_exist');
    expect(share.success).toBe(false);
  });
});
