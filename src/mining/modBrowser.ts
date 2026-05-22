import type { ModListing, ModDetails, SearchFilters, DownloadResult, Review, Collection, AuthResult, ModFile } from '../shared/types';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

function now() { return Date.now(); }
function makeId(prefix = 'id') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }
function cloneDeep<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

interface NexusModResponse {
  mod_id: number;
  name: string;
  summary: string;
  description?: string;
  picture_url: string;
  mod_downloads: number;
  mod_endorsements: number;
  version: string;
  uploaded_time: number;
  updated_time: number;
  author?: string;
  category_id?: number;
}

interface NexusModFileResponse {
  file_id: number;
  name: string;
  version?: string;
  size_in_bytes?: number;
  is_primary?: boolean;
}

/**
 * ModBrowserEngine - Real Nexus Mods API Integration
 * - Requires explicit Nexus API authentication
 * - Reads live mod metadata from Nexus
 * - Performs real file downloads for selected mods
 */
export class ModBrowserEngine {
  private listings: Record<string, ModListing> = {};
  private details: Record<string, ModDetails> = {};
  private reviews: Record<string, Review[]> = {};
  private collections: Record<string, Collection> = {};
  private tracked: Set<string> = new Set();
  private nexusApiKey: string | null = null;
  private apiCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 1000 * 60 * 5;
  private apiBaseUrl = 'api.nexusmods.com';

  private ensureAuthenticated() {
    if (!this.nexusApiKey) {
      throw new Error('Nexus Mods API key is required. Authenticate first.');
    }
  }

  private extractNexusModId(modId: string): number {
    if (!modId) throw new Error('Missing mod id');
    const normalized = String(modId).trim();
    let parsed: number;
    if (normalized.startsWith('nx_')) {
      parsed = Number.parseInt(normalized.slice(3), 10);
    } else {
      parsed = Number.parseInt(normalized, 10);
    }
    if (!Number.isFinite(parsed)) throw new Error('Invalid Nexus mod id');
    return parsed;
  }

  private async apiRequest<T>(endpoint: string): Promise<T> {
    this.ensureAuthenticated();

    const cacheKey = `${this.nexusApiKey}:${endpoint}`;
    const cached = this.apiCache.get(cacheKey);
    if (cached && now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }

    const requestUrl = `https://${this.apiBaseUrl}${endpoint}`;
    const parsedUrl = new URL(requestUrl);

    const data = await new Promise<T>((resolve, reject) => {
      const req = https.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method: 'GET',
          timeout: 10000,
          headers: {
            apikey: this.nexusApiKey as string,
            accept: 'application/json',
            'user-agent': 'Mossy/ModBrowser',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += String(chunk);
          });
          res.on('end', () => {
            if ((res.statusCode || 500) >= 400) {
              reject(new Error(`Nexus API request failed (${res.statusCode}): ${body || 'Unknown error'}`));
              return;
            }
            try {
              resolve(JSON.parse(body) as T);
            } catch {
              reject(new Error('Failed to parse Nexus API response'));
            }
          });
        },
      );

      req.on('error', (error) => reject(error));
      req.on('timeout', () => req.destroy(new Error('Nexus API request timed out')));
      req.end();
    });

    this.apiCache.set(cacheKey, { data, timestamp: now() });
    return data;
  }

  private convertNexusToModListing(nexusMod: NexusModResponse): ModListing {
    return {
      id: `nx_${nexusMod.mod_id}`,
      name: nexusMod.name,
      author: nexusMod.author || 'Unknown',
      summary: nexusMod.summary || '',
      category: this.getCategoryFromId(nexusMod.category_id),
      version: nexusMod.version || 'Unknown',
      downloads: nexusMod.mod_downloads || 0,
      endorsements: nexusMod.mod_endorsements || 0,
      thumbnailUrl: nexusMod.picture_url || '',
      uploadedAt: (nexusMod.uploaded_time || 0) * 1000,
      updatedAt: (nexusMod.updated_time || 0) * 1000,
      tags: [],
    };
  }

  private getCategoryFromId(categoryId?: number): string {
    const categories: Record<number, string> = {
      1: 'armor',
      2: 'weapons',
      3: 'clothing',
      4: 'gameplay',
      5: 'visual',
      6: 'tools',
    };
    return categories[categoryId || 0] || 'other';
  }

  async searchMods(query: string, filters: SearchFilters = { game: 'fallout4', sortBy: 'trending', nsfw: false }): Promise<ModListing[]> {
    this.ensureAuthenticated();

    const game = filters.game === 'skyrim' ? 'skyrimspecialedition' : 'fallout4';
    const sortMap: Record<string, string> = {
      trending: 'trending',
      downloads: 'downloads',
      recent: 'updated',
      endorsements: 'endorsements',
    };
    const sortParam = sortMap[filters.sortBy] || 'trending';
    const endpoint = `/v1/games/${game}/mods/latest?sort=${sortParam}&limit=50`;

    const nexusMods = await this.apiRequest<NexusModResponse[]>(endpoint);
    let results = Array.isArray(nexusMods) ? nexusMods.map((mod) => this.convertNexusToModListing(mod)) : [];

    const q = (query || '').trim().toLowerCase();
    if (q) {
      results = results.filter((mod) =>
        mod.name.toLowerCase().includes(q)
        || mod.summary.toLowerCase().includes(q)
        || mod.author.toLowerCase().includes(q),
      );
    }

    if (filters.category) {
      results = results.filter((mod) => mod.category === filters.category);
    }

    for (const mod of results) {
      this.listings[mod.id] = mod;
    }

    return results.slice(0, 50);
  }

  async getModDetails(modId: string): Promise<ModDetails> {
    this.ensureAuthenticated();

    if (this.details[modId]) {
      return cloneDeep(this.details[modId]);
    }

    const game = 'fallout4';
    const nexusModId = this.extractNexusModId(modId);

    const detailsResponse = await this.apiRequest<NexusModResponse>(`/v1/games/${game}/mods/${nexusModId}.json`);
    const filesResponse = await this.apiRequest<{ files?: NexusModFileResponse[] }>(`/v1/games/${game}/mods/${nexusModId}/files.json`);

    const listing = this.convertNexusToModListing(detailsResponse);
    const files: ModFile[] = Array.isArray(filesResponse?.files)
      ? filesResponse.files.map((file) => ({
          id: String(file.file_id),
          name: file.name || `File ${file.file_id}`,
          version: file.version || listing.version,
          size: Number(file.size_in_bytes || 0),
          downloadUrl: '',
          isPrimary: !!file.is_primary,
        }))
      : [];

    const details: ModDetails = {
      ...listing,
      description: detailsResponse.description || listing.summary,
      requirements: [],
      files,
      images: listing.thumbnailUrl ? [listing.thumbnailUrl] : [],
      videos: [],
      changelog: '',
      tags: listing.tags || [],
      homepage: `https://www.nexusmods.com/${game}/mods/${nexusModId}`,
    };

    this.details[listing.id] = details;
    this.listings[listing.id] = listing;
    return cloneDeep(details);
  }

  async getTrendingMods(_timeframe = 'week'): Promise<ModListing[]> {
    return this.searchMods('', { game: 'fallout4', sortBy: 'trending', nsfw: false });
  }

  private async getDownloadLink(modId: string, fileId: string): Promise<string> {
    this.ensureAuthenticated();

    const game = 'fallout4';
    const nexusModId = this.extractNexusModId(modId);
    const nexusFileId = this.extractNexusModId(fileId);
    const links = await this.apiRequest<Array<{ URI?: string }>>(
      `/v1/games/${game}/mods/${nexusModId}/files/${nexusFileId}/download_link.json`,
    );

    const first = Array.isArray(links) ? links[0] : null;
    if (!first?.URI) throw new Error('No download link returned by Nexus');
    return first.URI;
  }

  async getDownloadUrl(modId: string): Promise<string> {
    const details = await this.getModDetails(modId);
    const primary = details.files.find((file) => file.isPrimary) || details.files[0];
    if (!primary) throw new Error('No downloadable files available for this mod');
    return this.getDownloadLink(modId, primary.id);
  }

  async downloadMod(modId: string, destination: string): Promise<DownloadResult> {
    this.ensureAuthenticated();

    const startedAt = now();
    const details = await this.getModDetails(modId);
    const selectedFile = details.files.find((file) => file.isPrimary) || details.files[0];
    if (!selectedFile) {
      throw new Error('No downloadable file found for selected mod');
    }

    const downloadUrl = await this.getDownloadLink(modId, selectedFile.id);
    const outputDir = destination.trim();
    if (!outputDir) throw new Error('A download destination is required');

    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${modId}-${selectedFile.id}.zip`);

    await new Promise<void>((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);
      const request = https.get(downloadUrl, (response) => {
        if ((response.statusCode || 500) >= 400) {
          fileStream.close();
          try {
            fs.rmSync(outputPath, { force: true });
          } catch (cleanupError) {
            console.error('Failed to clean up partial download:', cleanupError);
          }
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      });

      request.on('error', (error) => {
        fileStream.close();
        try {
          fs.rmSync(outputPath, { force: true });
        } catch (cleanupError) {
          console.error('Failed to clean up partial download:', cleanupError);
        }
        reject(error);
      });
    });

    const stats = fs.statSync(outputPath);
    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      duration: now() - startedAt,
    };
  }

  async rateMod(modId: string, rating: number, reviewText: string): Promise<void> {
    if (!modId) throw new Error('Missing mod id');
    const review: Review = {
      userId: 'local_user',
      username: 'you',
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      text: reviewText || 'Review submitted',
      helpful: 0,
      timestamp: now(),
    };
    this.reviews[modId] = this.reviews[modId] || [];
    this.reviews[modId].unshift(review);
  }

  async getModReviews(modId: string): Promise<Review[]> {
    return (this.reviews[modId] || []).slice(0, 50);
  }

  async createCollection(name: string, mods: string[] = [], description = ''): Promise<Collection> {
    const id = makeId('col');
    const collection: Collection = {
      id,
      name,
      description,
      mods: mods.slice(0, 100),
      author: 'local_user',
      downloads: 0,
      shareUrl: `https://next.nexusmods.com/fallout4/collections/${id}`,
    };
    this.collections[id] = collection;
    return collection;
  }

  async shareCollection(collectionId: string): Promise<{ success: boolean; shareUrl?: string }> {
    const collection = this.collections[collectionId];
    if (!collection) return { success: false };
    return { success: true, shareUrl: collection.shareUrl };
  }

  async authenticateNexus(apiKey: string): Promise<AuthResult> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Invalid API key' };
    }

    this.nexusApiKey = apiKey.trim();
    this.apiCache.clear();

    try {
      const validation = await this.apiRequest<{ user_id: number }>('/v1/users/validate.json');
      if (!validation?.user_id) {
        this.nexusApiKey = null;
        return { success: false, error: 'Nexus API key validation failed' };
      }

      return {
        success: true,
        provider: 'nexusmods',
        token: this.nexusApiKey,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      };
    } catch (error) {
      this.nexusApiKey = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nexus authentication failed',
      };
    }
  }

  async endorseMod(modId: string): Promise<void> {
    this.ensureAuthenticated();
    const game = 'fallout4';
    const nexusModId = this.extractNexusModId(modId);
    await this.apiRequest<any>(`/v1/games/${game}/mods/${nexusModId}/endorse.json`);
  }

  async trackMod(modId: string): Promise<void> {
    this.tracked.add(modId);
  }
}

export const modBrowser = new ModBrowserEngine();
export default modBrowser;
