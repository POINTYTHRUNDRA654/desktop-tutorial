import { BSAArchive, BSAFileEntry, UnusedAsset, UnusedAssetReport, ESPFile } from '../shared/types';
import { BSAParser } from './bsa-parser';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Unused Asset Detector for Fallout 4
 * Scans BSA archives and ESP files to identify orphaned or unused assets
 * Provides recommendations for archive cleanup and mod optimization
 */
export class UnusedAssetDetector {
  private static readonly ASSET_EXTENSIONS = ['.dds', '.nif', '.hkx', '.wav', '.xwm', '.txt', '.xml'];
  private static readonly TEXTURE_EXTENSIONS = ['.dds'];
  private static readonly MESH_EXTENSIONS = ['.nif'];
  private static readonly ANIMATION_EXTENSIONS = ['.hkx'];
  private static readonly SOUND_EXTENSIONS = ['.wav', '.xwm'];

  /**
   * Detect unused assets across BSA archives and ESP references
   */
  static async detectUnusedAssets(
    bsaArchives: BSAArchive[],
    espFiles: Map<string, ESPFile>
  ): Promise<UnusedAssetReport> {
    const allAssets = new Map<string, { path: string; archive: string; size: number; type: UnusedAsset['type'] }>();
    const referencedAssets = new Set<string>();

    // Collect all assets from BSA archives
    for (const archive of bsaArchives) {
      const files = BSAParser.listFiles(archive);
      for (const file of files) {
        const normalizedPath = file.toLowerCase().replace(/\\/g, '/');
        const ext = path.extname(normalizedPath).toLowerCase();

        if (this.ASSET_EXTENSIONS.includes(ext)) {
          const assetType = this.classifyAssetType(ext);
          
          // Find the file entry in the archive
          let fileEntry: BSAFileEntry | undefined;
          for (const dir of archive.directories) {
            fileEntry = dir.files.find(f => path.join(dir.name, f.filename).replace(/\\/g, '/') === file);
            if (fileEntry) break;
          }

          if (fileEntry) {
            allAssets.set(normalizedPath, {
              path: file,
              archive: archive.path,
              size: fileEntry.size,
              type: assetType
            });
          }
        }
      }
    }

    // Collect referenced assets from ESP files
    for (const [espPath, esp] of espFiles) {
      const references = this.extractAssetReferences(espPath, esp);
      for (const ref of references) {
        referencedAssets.add(ref.toLowerCase().replace(/\\/g, '/'));
      }
    }

    // Find unused assets
    const unusedAssets: UnusedAsset[] = [];
    for (const [normalizedPath, asset] of allAssets) {
      if (!referencedAssets.has(normalizedPath)) {
        const reason = this.determineUnusedReason(normalizedPath, asset.type);
        const potentialSavings = this.calculatePotentialSavings(asset.size, reason);

        unusedAssets.push({
          path: asset.path,
          type: asset.type,
          size: asset.size,
          archive: asset.archive,
          reason,
          potentialSavings
        });
      }
    }

    // Sort by potential savings (largest first)
    unusedAssets.sort((a, b) => b.potentialSavings - a.potentialSavings);

    const totalPotentialSavings = unusedAssets.reduce((sum, asset) => sum + asset.potentialSavings, 0);
    const recommendations = this.generateRecommendations(unusedAssets, totalPotentialSavings);

    return {
      totalAssets: allAssets.size,
      unusedAssets,
      potentialSpaceSavings: totalPotentialSavings,
      recommendations
    };
  }

  /**
   * Classify asset type based on file extension
   */
  private static classifyAssetType(extension: string): UnusedAsset['type'] {
    if (this.TEXTURE_EXTENSIONS.includes(extension)) return 'texture';
    if (this.MESH_EXTENSIONS.includes(extension)) return 'model';
    if (this.ANIMATION_EXTENSIONS.includes(extension)) return 'animation';
    if (this.SOUND_EXTENSIONS.includes(extension)) return 'sound';
    return 'other';
  }

  /**
   * Extract asset references from ESP file
   */
  private static extractAssetReferences(espPath: string, esp: ESPFile): string[] {
    const references: string[] = [];

    // This is a simplified extraction - real implementation would parse ESP structure
    // ESP files contain references to meshes, textures, sounds, etc.

    // Mock extraction based on common patterns
    // Real implementation would parse the actual ESP record structures

    // For demonstration, we'll create some mock references
    // In a real implementation, this would parse the ESP binary format
    const mockReferences = [
      'meshes/weapons/pistol.nif',
      'textures/weapons/pistol_d.dds',
      'sound/fx/weapon/pistol.wav',
      'meshes/armor/combat.nif',
      'textures/armor/combat_d.dds'
    ];

    // Filter mock references based on ESP filename to simulate different mods
    const espName = path.basename(espPath, '.esp').toLowerCase();
    if (espName.includes('weapon')) {
      references.push(...mockReferences.filter(ref => ref.includes('weapon')));
    } else if (espName.includes('armor')) {
      references.push(...mockReferences.filter(ref => ref.includes('armor')));
    }

    return references;
  }

  /**
   * Determine why an asset might be unused
   */
  private static determineUnusedReason(assetPath: string, type: UnusedAsset['type']): UnusedAsset['reason'] {
    const pathLower = assetPath.toLowerCase();

    // Check for orphaned assets (no clear ownership)
    if (pathLower.includes('temp') || pathLower.includes('backup') || pathLower.includes('old')) {
      return 'orphaned';
    }

    // Check for duplicates
    const baseName = path.basename(assetPath, path.extname(assetPath));
    if (baseName.match(/\d+$/) || baseName.includes('copy')) {
      return 'duplicate';
    }

    // Check for low usage patterns
    if (pathLower.includes('lod') && type === 'texture') {
      // LOD textures might be unused if LOD system is disabled
      return 'low_usage';
    }

    // Default to orphaned
    return 'orphaned';
  }

  /**
   * Calculate potential space savings from removing an asset
   */
  private static calculatePotentialSavings(size: number, reason: UnusedAsset['reason']): number {
    // For orphaned assets, we can save the full size
    if (reason === 'orphaned') {
      return size;
    }

    // For duplicates, we might save some space but need to keep one copy
    if (reason === 'duplicate') {
      return Math.floor(size * 0.8); // Assume we can remove 80% of duplicates
    }

    // For low usage, savings depend on how often it's used
    if (reason === 'low_usage') {
      return Math.floor(size * 0.5); // Conservative estimate
    }

    return size;
  }

  /**
   * Generate recommendations based on findings
   */
  private static generateRecommendations(unusedAssets: UnusedAsset[], totalSavings: number): string[] {
    const recommendations: string[] = [];

    if (unusedAssets.length === 0) {
      recommendations.push('No unused assets detected - archives are clean');
      return recommendations;
    }

    const orphaned = unusedAssets.filter(a => a.reason === 'orphaned').length;
    const duplicates = unusedAssets.filter(a => a.reason === 'duplicate').length;
    const lowUsage = unusedAssets.filter(a => a.reason === 'low_usage').length;

    recommendations.push(`${unusedAssets.length} unused assets found across ${unusedAssets.reduce((set, a) => set.add(a.archive), new Set()).size} archives`);

    if (totalSavings > 1024 * 1024 * 10) { // Over 10MB
      recommendations.push(`Potential space savings: ${(totalSavings / (1024 * 1024)).toFixed(1)}MB by cleaning unused assets`);
    } else if (totalSavings > 1024 * 1024) {
      recommendations.push(`Potential space savings: ${(totalSavings / (1024 * 1024)).toFixed(1)}MB by cleaning unused assets`);
    } else {
      recommendations.push(`Potential space savings: ${(totalSavings / 1024).toFixed(1)}KB by cleaning unused assets`);
    }

    if (orphaned > 0) {
      recommendations.push(`${orphaned} orphaned assets can be safely removed`);
    }

    if (duplicates > 0) {
      recommendations.push(`${duplicates} duplicate assets - review and consolidate`);
    }

    if (lowUsage > 0) {
      recommendations.push(`${lowUsage} low-usage assets - consider removal if not needed`);
    }

    // Group by type
    const byType = unusedAssets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeBreakdown = Object.entries(byType)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    recommendations.push(`Asset types affected: ${typeBreakdown}`);

    // Safety recommendations
    recommendations.push('⚠️  Backup archives before removing assets');
    recommendations.push('⚠️  Test game after cleanup to ensure no missing assets');

    return recommendations;
  }

  /**
   * Scan directory for BSA archives
   */
  static async scanDirectoryForBSAs(directory: string): Promise<BSAArchive[]> {
    const archives: BSAArchive[] = [];

    try {
      const files = await fs.promises.readdir(directory, { recursive: true });

      for (const file of files) {
        const filePath = path.join(directory, file);
        if (path.extname(filePath).toLowerCase() === '.bsa') {
          try {
            const archive = await BSAParser.parseArchive(filePath);
            archives.push(archive);
          } catch (error) {
            console.warn(`Failed to parse BSA archive: ${filePath}`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory for BSA archives: ${directory}`, error);
    }

    return archives;
  }

  /**
   * Get assets referenced by ESP files
   */
  static async getReferencedAssets(espFiles: Map<string, ESPFile>): Promise<Set<string>> {
    const referenced = new Set<string>();

    for (const [espPath, esp] of espFiles) {
      const refs = this.extractAssetReferences(espPath, esp);
      for (const ref of refs) {
        referenced.add(ref.toLowerCase().replace(/\\/g, '/'));
      }
    }

    return referenced;
  }

  /**
   * Generate cleanup script for removing unused assets
   */
  static generateCleanupScript(unusedAssets: UnusedAsset[]): string {
    const scriptLines: string[] = [
      '# PowerShell script to clean unused assets from BSA archives',
      '# WARNING: Backup your archives before running this script!',
      '',
      '$bsaPaths = @('
    ];

    // Group by archive
    const byArchive = unusedAssets.reduce((acc, asset) => {
      const archiveKey = asset.archive || 'unknown';
      if (!acc[archiveKey]) acc[archiveKey] = [];
      acc[archiveKey].push(asset);
      return acc;
    }, {} as Record<string, UnusedAsset[]>);

    // Add archive paths
    for (const archive of Object.keys(byArchive)) {
      scriptLines.push(`    "${archive}"`);
    }
    scriptLines.push(')', '');

    // Add cleanup logic (simplified)
    scriptLines.push(
      '# Note: This is a template script. Actual BSA editing requires specialized tools.',
      '# Consider using tools like BSA Browser or Archive2 for safe archive editing.',
      '',
      'foreach ($bsaPath in $bsaPaths) {',
      '    Write-Host "Processing: $bsaPath"',
      '    # TODO: Implement asset removal logic here',
      '    # This would require BSA unpacking, file removal, and re-packing',
      '}',
      '',
      'Write-Host "Cleanup complete. Test your game to ensure no assets are missing."'
    );

    return scriptLines.join('\n');
  }

  /**
   * Validate that removing assets won't break the game
   */
  static async validateAssetRemoval(unusedAssets: UnusedAsset[], espFiles: ESPFile[]): Promise<string[]> {
    const warnings: string[] = [];

    // Check for assets that might be referenced indirectly
    const textureAssets = unusedAssets.filter(a => a.type === 'texture');
    if (textureAssets.length > 0) {
      warnings.push(`${textureAssets.length} texture assets marked for removal - verify no material files reference them`);
    }

    // Check for animation assets
    const animationAssets = unusedAssets.filter(a => a.type === 'animation');
    if (animationAssets.length > 0) {
      warnings.push(`${animationAssets.length} animation assets marked for removal - check if used by game systems`);
    }

    // Check for large removals that might indicate false positives
    const largeRemovals = unusedAssets.filter(a => a.size > 1024 * 1024); // Over 1MB
    if (largeRemovals.length > 0) {
      warnings.push(`${largeRemovals.length} large assets marked for removal - double-check these are truly unused`);
    }

    return warnings;
  }
}