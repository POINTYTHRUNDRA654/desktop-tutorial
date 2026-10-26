import type { Collection, CollectionItem } from '../shared/types';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import os from 'os';

function now() { return Date.now(); }
function makeId(prefix = 'id') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }

/**
 * ModBrowserEngine - community sharing only.
 *
 * Mossy has no Nexus account link and never calls the Nexus API: finding and
 * downloading mods happens on the Nexus Mods website in the user's browser
 * (see ModBrowser.tsx). What stays here is the local "share a technique /
 * script / note" packaging.
 */
export class ModBrowserEngine {
  private collections: Record<string, Collection> = {};

  /**
   * Community collections hold techniques, scripts, and notes a user wants to
   * share - not Nexus mod lists. shareCollection() packages the content into a
   * real local zip the user then posts wherever they choose (Discord, forums,
   * a GitHub issue).
   */
  async createCollection(name: string, items: CollectionItem[] = [], description = ''): Promise<Collection> {
    const id = makeId('col');
    const collection: Collection = {
      id,
      name,
      description,
      items: items.slice(0, 100),
      author: 'local_user',
      createdAt: now(),
    };
    this.collections[id] = collection;
    return collection;
  }

  async shareCollection(collectionId: string, exportDir?: string): Promise<{ success: boolean; exportPath?: string; error?: string }> {
    const collection = this.collections[collectionId];
    if (!collection) return { success: false, error: 'Collection not found' };

    const zip = new AdmZip();
    const manifest = {
      name: collection.name,
      description: collection.description,
      author: collection.author,
      createdAt: collection.createdAt,
      items: collection.items.map((item) => ({ title: item.title, type: item.type })),
    };
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
    collection.items.forEach((item, index) => {
      const safeTitle = (item.title || `item-${index + 1}`).replace(/[^a-z0-9_-]+/gi, '_');
      const ext = item.type === 'script' ? 'psc' : 'md';
      zip.addFile(`items/${index + 1}-${safeTitle}.${ext}`, Buffer.from(item.content || ''));
    });

    const targetDir = exportDir || path.join(os.tmpdir(), 'mossy-shared-collections');
    fs.mkdirSync(targetDir, { recursive: true });
    const safeName = collection.name.replace(/[^a-z0-9_-]+/gi, '_');
    const exportPath = path.join(targetDir, `${safeName}-${collectionId}.zip`);
    zip.writeZip(exportPath);

    collection.exportPath = exportPath;
    return { success: true, exportPath };
  }
}

export const modBrowser = new ModBrowserEngine();
export default modBrowser;
