/**
 * Asset Correlation Engine
 * Cross-references NIF meshes with DDS textures, animations, and physics
 */

import { AssetReference, AssetCorrelation } from '../shared/types';
import { AssetCorrelator as IAssetCorrelator } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class AssetCorrelator implements IAssetCorrelator {
  private assetMap: Map<string, AssetReference> = new Map();
  private correlationCache: Map<string, AssetCorrelation> = new Map();

  // Interface implementation
  correlate = this.correlateAssets.bind(this);
  supportedTypes = ['nif', 'dds', 'hkx', 'seq', 'wav', 'fuz'];

  /**
   * Add assets to the correlation engine
   */
  addAssets(assets: AssetReference[]): void {
    for (const asset of assets) {
      this.assetMap.set(asset.path.toLowerCase(), asset);
    }
  }

  /**
   * Correlate assets based on file paths and content analysis
   */
  async correlateAssets(assets: AssetReference[]): Promise<AssetCorrelation[]> {
    const correlations: AssetCorrelation[] = [];

    for (const asset of assets) {
      const correlation = await this.buildCorrelation(asset);
      if (correlation) {
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  private async buildCorrelation(primaryAsset: AssetReference): Promise<AssetCorrelation | null> {
    const cacheKey = primaryAsset.path.toLowerCase();
    if (this.correlationCache.has(cacheKey)) {
      return this.correlationCache.get(cacheKey)!;
    }

    const relatedAssets: AssetReference[] = [];
    const dependencies: string[] = [];
    const dependents: string[] = [];

    // Get file metadata
    let metadata: any = {};
    try {
      const stats = await fs.promises.stat(primaryAsset.path);
      metadata = {
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        hash: await this.getFileHash(primaryAsset.path)
      };
    } catch (error) {
      console.warn(`Could not read metadata for ${primaryAsset.path}:`, error);
      return null;
    }

    // Analyze based on asset type
    switch (primaryAsset.type) {
      case 'nif':
        await this.correlateNifAsset(primaryAsset, relatedAssets, dependencies);
        break;
      case 'dds':
        await this.correlateDdsAsset(primaryAsset, relatedAssets, dependents);
        break;
      case 'hkx':
        await this.correlateHkxAsset(primaryAsset, relatedAssets);
        break;
      case 'seq':
        await this.correlateSeqAsset(primaryAsset, relatedAssets);
        break;
    }

    const correlation: AssetCorrelation = {
      primaryAsset,
      relatedAssets,
      dependencies,
      dependents,
      metadata
    };

    this.correlationCache.set(cacheKey, correlation);
    return correlation;
  }

  private async correlateNifAsset(
    nifAsset: AssetReference,
    relatedAssets: AssetReference[],
    dependencies: string[]
  ): Promise<void> {
    try {
      const buffer = await fs.promises.readFile(nifAsset.path);

      // Extract texture paths from NIF (simplified - real implementation would parse NIF format)
      const texturePaths = this.extractTexturesFromNif(buffer);

      for (const texPath of texturePaths) {
        const fullPath = this.resolveTexturePath(texPath, nifAsset.path);
        if (fullPath) {
          const ddsAsset = this.assetMap.get(fullPath.toLowerCase());
          if (ddsAsset) {
            relatedAssets.push(ddsAsset);
            dependencies.push(fullPath);
          }
        }
      }

      // Look for associated animation and physics files
      const baseName = path.basename(nifAsset.path, '.nif');
      const dir = path.dirname(nifAsset.path);

      // Check for HKX files
      const hkxPath = path.join(dir, baseName + '.hkx');
      const hkxAsset = this.assetMap.get(hkxPath.toLowerCase());
      if (hkxAsset) {
        relatedAssets.push(hkxAsset);
        dependencies.push(hkxPath);
      }

      // Check for SEQ files
      const seqPath = path.join(dir, baseName + '.seq');
      const seqAsset = this.assetMap.get(seqPath.toLowerCase());
      if (seqAsset) {
        relatedAssets.push(seqAsset);
        dependencies.push(seqPath);
      }

    } catch (error) {
      console.warn(`Error correlating NIF asset ${nifAsset.path}:`, error);
    }
  }

  private async correlateDdsAsset(
    ddsAsset: AssetReference,
    relatedAssets: AssetReference[],
    dependents: string[]
  ): Promise<void> {
    // Find NIF files that reference this texture
    const textureName = path.basename(ddsAsset.path, '.dds').toLowerCase();

    for (const [path, asset] of this.assetMap) {
      if (asset.type === 'nif') {
        try {
          const buffer = await fs.promises.readFile(asset.path);
          const textures = this.extractTexturesFromNif(buffer);

          if (textures.some(tex => tex.toLowerCase().includes(textureName))) {
            relatedAssets.push(asset);
            dependents.push(asset.path);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  private async correlateHkxAsset(
    hkxAsset: AssetReference,
    relatedAssets: AssetReference[]
  ): Promise<void> {
    // Find associated NIF file
    const baseName = path.basename(hkxAsset.path, '.hkx');
    const dir = path.dirname(hkxAsset.path);

    const nifPath = path.join(dir, baseName + '.nif');
    const nifAsset = this.assetMap.get(nifPath.toLowerCase());
    if (nifAsset) {
      relatedAssets.push(nifAsset);
    }
  }

  private async correlateSeqAsset(
    seqAsset: AssetReference,
    relatedAssets: AssetReference[]
  ): Promise<void> {
    // Find associated NIF file
    const baseName = path.basename(seqAsset.path, '.seq');
    const dir = path.dirname(seqAsset.path);

    const nifPath = path.join(dir, baseName + '.nif');
    const nifAsset = this.assetMap.get(nifPath.toLowerCase());
    if (nifAsset) {
      relatedAssets.push(nifAsset);
    }
  }

  private extractTexturesFromNif(buffer: Buffer): string[] {
    // Simplified texture extraction - real implementation would parse NIF format properly
    const textures: string[] = [];
    const str = buffer.toString('latin1');

    // Look for texture paths in the NIF data
    const textureRegex = /textures[\\/]([^\0]+?\.dds)/gi;
    let match;
    while ((match = textureRegex.exec(str)) !== null) {
      textures.push(match[1]);
    }

    return [...new Set(textures)]; // Remove duplicates
  }

  private resolveTexturePath(texturePath: string, nifPath: string): string | null {
    // Resolve relative texture paths
    const nifDir = path.dirname(nifPath);
    const texturesDir = path.join(nifDir, 'textures');

    // Try different possible locations
    const candidates = [
      path.join(nifDir, texturePath),
      path.join(texturesDir, texturePath),
      path.join(nifDir, '..', 'textures', texturePath),
      texturePath // Absolute path
    ];

    for (const candidate of candidates) {
      if (this.assetMap.has(candidate.toLowerCase())) {
        return candidate;
      }
    }

    return null;
  }

  private async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.promises.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
}