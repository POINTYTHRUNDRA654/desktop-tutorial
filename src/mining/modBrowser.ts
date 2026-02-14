import type { ModListing, ModDetails, SearchFilters, DownloadResult, Review, Collection, AuthResult, ModFile } from '../shared/types';

function now() { return Date.now(); }
function makeId(prefix = 'id') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }

/**
 * ModBrowserEngine (updated to match new DTOs)
 * - In-memory/stub implementation for UI + IPC wiring
 */
export class ModBrowserEngine {
  private listings: Record<string, ModListing> = {};
  private details: Record<string, ModDetails> = {};
  private reviews: Record<string, Review[]> = {};
  private collections: Record<string, Collection> = {};
  private tracked: Set<string> = new Set();
  private nexusApiKey: string | null = null;

  constructor() {
    const nowTs = now();
    const seed: ModListing[] = [
      { id: 'm_1001', name: 'VaultTech Overhaul', author: 'VaultDev', summary: 'Graphical overhaul for Vault interiors', category: 'visual', version: '1.2.0', downloads: 12456, endorsements: 321, thumbnailUrl: '', uploadedAt: nowTs - 1000 * 60 * 60 * 24 * 90, updatedAt: nowTs - 1000 * 60 * 60 * 24 * 30 },
      { id: 'm_1002', name: 'Settlement Plus', author: 'BuildMaster', summary: 'Expanded settlement objects & menus', category: 'gameplay', version: '0.9.3', downloads: 9021, endorsements: 210, thumbnailUrl: '', uploadedAt: nowTs - 1000 * 60 * 60 * 24 * 40, updatedAt: nowTs - 1000 * 60 * 60 * 24 * 7 },
      { id: 'm_1003', name: 'Papyrus Utils', author: 'ScriptKid', summary: 'Utility scripts for mod authors', category: 'tools', version: '2.0.0', downloads: 4523, endorsements: 512, thumbnailUrl: '', uploadedAt: nowTs - 1000 * 60 * 60 * 24 * 10, updatedAt: nowTs - 1000 * 60 * 60 * 24 * 2 },
    ];

    for (const l of seed) {
      this.listings[l.id] = l;
      const files: ModFile[] = [
        { id: `${l.id}_f1`, name: `${l.name} v${l.version}`, version: l.version, size: 4_321_000, downloadUrl: `https://example.com/download/${l.id}`, isPrimary: true },
      ];
      this.details[l.id] = {
        ...l,
        description: `${l.name} — full description (auto-generated).`,
        requirements: [],
        files,
        images: [],
        videos: [],
        changelog: `Changelog for ${l.name}`,
        tags: [l.category],
      } as ModDetails;
      this.reviews[l.id] = [{ userId: 'u_alice', username: 'alice', rating: Math.round(Math.min(5, (l.endorsements || 0) / 100)), text: 'Nice mod—stable and well-documented.', helpful: 2, timestamp: now() }];
    }
  }

  // Mod discovery
  async searchMods(query: string, filters: SearchFilters = { game: 'fallout4', sortBy: 'trending', nsfw: false }): Promise<ModListing[]> {
    const q = (query || '').trim().toLowerCase();
    let results = Object.values(this.listings);
    if (q) results = results.filter(r => r.name.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q) || r.author.toLowerCase().includes(q) || (r.tags || []).some(t => t.includes(q)));
    if (filters.category) results = results.filter(r => r.category === filters.category);
    if (filters.tags && filters.tags.length) results = results.filter(r => filters.tags!.every(t => (r.tags || []).includes(t)));

    switch (filters.sortBy) {
      case 'downloads': results = results.sort((a,b) => b.downloads - a.downloads); break;
      case 'recent': results = results.sort((a,b) => b.updatedAt - a.updatedAt); break;
      case 'endorsements': results = results.sort((a,b) => b.endorsements - a.endorsements); break;
      case 'trending':
      default:
        results = results.sort((a,b) => (b.endorsements + b.downloads / 100) - (a.endorsements + a.downloads / 100));
        break;
    }

    // simulate async latency
    return new Promise(resolve => setTimeout(() => resolve(results.slice(0, 50)), 40));
  }

  async getModDetails(modId: string): Promise<ModDetails> {
    const d = this.details[modId];
    if (!d) throw new Error('Mod not found');
    return JSON.parse(JSON.stringify(d));
  }

  async getTrendingMods(timeframe: string = 'week'): Promise<ModListing[]> {
    return Object.values(this.listings).sort((a,b) => b.endorsements - a.endorsements).slice(0, 10);
  }

  // Downloads
  async getDownloadUrl(modId: string): Promise<string> {
    const d = this.details[modId];
    if (!d) throw new Error('Mod not found');
    return d.files[0].downloadUrl;
  }

  async downloadMod(modId: string, destination: string): Promise<DownloadResult> {
    const d = this.details[modId];
    if (!d) return { success: false, filePath: '', size: 0, duration: 0 };
    const outPath = `${destination.replace(/\\+$/,'')}/${modId}-${d.files[0].id}.zip`;
    // stubbed duration
    const duration = 350; // ms
    return { success: true, filePath: outPath, size: d.files[0].size, duration };
  }

  // Reviews
  async rateMod(modId: string, rating: number, reviewText: string): Promise<void> {
    const r: Review = { userId: 'local_user', username: 'you', rating: Math.max(1, Math.min(5, Math.round(rating))), text: reviewText, helpful: 0, timestamp: now() };
    this.reviews[modId] = this.reviews[modId] || [];
    this.reviews[modId].unshift(r);
  }

  async getModReviews(modId: string): Promise<Review[]> {
    return (this.reviews[modId] || []).slice(0, 50);
  }

  // Collections
  async createCollection(name: string, mods: string[] = [], description = ''): Promise<Collection> {
    const id = makeId('col');
    const col: Collection = { id, name, description, mods: mods.slice(0, 100), author: 'local_user', downloads: 0, shareUrl: `https://example.com/collection/${id}` };
    this.collections[id] = col;
    return col;
  }

  async shareCollection(collectionId: string): Promise<{ success: boolean; shareUrl?: string }> {
    const c = this.collections[collectionId];
    if (!c) return { success: false };
    return { success: true, shareUrl: c.shareUrl };
  }

  // Nexus Mods (stubs)
  async authenticateNexus(apiKey: string): Promise<AuthResult> {
    if (!apiKey || !apiKey.trim()) return { success: false, error: 'Invalid API key' };
    this.nexusApiKey = apiKey.trim();
    return { success: true, provider: 'nexusmods', token: `token_${makeId('nx')}`, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  }

  async endorseMod(modId: string): Promise<void> {
    const m = this.listings[modId];
    if (m) m.endorsements = (m.endorsements || 0) + 1;
  }

  async trackMod(modId: string): Promise<void> {
    this.tracked.add(modId);
  }
}

export const modBrowser = new ModBrowserEngine();
export default modBrowser;
