import { TextureInfo, TextureUpscaleOpportunity, TextureResolutionReport } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Texture Resolution Analyzer for Fallout 4
 * Analyzes DDS texture files to identify upscaling opportunities
 * Provides recommendations for improving texture quality
 */
export class TextureResolutionAnalyzer {
  private static readonly MIN_RESOLUTION = 256; // Minimum recommended resolution
  private static readonly TARGET_RESOLUTIONS = [512, 1024, 2048, 4096]; // Common target resolutions
  private static readonly USAGE_DISTANCE_MAP = {
    close: { minRes: 1024, priority: 'high' as const },
    medium: { minRes: 512, priority: 'medium' as const },
    far: { minRes: 256, priority: 'low' as const },
    background: { minRes: 128, priority: 'low' as const }
  };

  /**
   * Analyze textures for resolution optimization opportunities
   */
  static async analyzeTextures(textures: TextureInfo[]): Promise<TextureResolutionReport> {
    const opportunities: TextureUpscaleOpportunity[] = [];

    for (const texture of textures) {
      const opportunity = this.analyzeTexture(texture);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }

    // Sort by priority and potential impact
    opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.qualityImprovement - a.qualityImprovement;
    });

    const recommendations = this.generateRecommendations(opportunities);

    return {
      totalTextures: textures.length,
      lowResTextures: opportunities,
      recommendations,
      potentialQualityImprovement: opportunities.reduce((sum, opp) => sum + opp.qualityImprovement, 0) / Math.max(1, opportunities.length)
    };
  }

  /**
   * Analyze a single texture for upscaling opportunities
   */
  private static analyzeTexture(texture: TextureInfo): TextureUpscaleOpportunity | null {
    const usageConfig = this.USAGE_DISTANCE_MAP[texture.distanceUsage];
    const minResolution = usageConfig.minRes;

    // Check if texture needs upscaling
    const currentMaxDim = Math.max(texture.width, texture.height);
    if (currentMaxDim >= minResolution) {
      return null; // Already adequate resolution
    }

    // Find best target resolution
    const targetRes = this.findBestTargetResolution(currentMaxDim);
    if (!targetRes) {
      return null; // No suitable target resolution
    }

    // Calculate quality improvement (0-100 scale)
    const qualityImprovement = Math.min(100, (targetRes / currentMaxDim - 1) * 50);

    // Calculate performance impact (additional VRAM usage in MB)
    const currentSizeMB = texture.size / (1024 * 1024);
    const newPixelCount = targetRes * targetRes;
    const oldPixelCount = texture.width * texture.height;
    const sizeMultiplier = newPixelCount / oldPixelCount;
    const performanceImpact = currentSizeMB * (sizeMultiplier - 1);

    // Skip if performance impact is too high for low-priority textures
    if (usageConfig.priority === 'low' && performanceImpact > 50) {
      return null;
    }

    return {
      texture,
      recommendedResolution: { width: targetRes, height: targetRes },
      qualityImprovement: Math.round(qualityImprovement),
      performanceImpact: Math.round(performanceImpact * 100) / 100,
      priority: usageConfig.priority,
      reason: this.generateReason(texture, targetRes, usageConfig.priority)
    };
  }

  /**
   * Find the best target resolution for upscaling
   */
  private static findBestTargetResolution(currentMaxDim: number): number | null {
    // Find the smallest target resolution that's at least 2x the current size
    const minTarget = currentMaxDim * 2;

    for (const target of this.TARGET_RESOLUTIONS) {
      if (target >= minTarget) {
        return target;
      }
    }

    return null;
  }

  /**
   * Generate reason for upscaling recommendation
   */
  private static generateReason(texture: TextureInfo, targetRes: number, priority: string): string {
    const currentMax = Math.max(texture.width, texture.height);
    const improvement = Math.round((targetRes / currentMax) * 100 - 100);

    let reason = `${texture.usage} texture at ${currentMax}x${currentMax} is below recommended resolution for ${texture.distanceUsage} usage. `;

    if (priority === 'high') {
      reason += `High priority: ${improvement}% resolution increase will significantly improve visual quality.`;
    } else if (priority === 'medium') {
      reason += `Medium priority: ${improvement}% resolution increase recommended for better detail.`;
    } else {
      reason += `Low priority: ${improvement}% resolution increase suggested for consistency.`;
    }

    return reason;
  }

  /**
   * Generate overall recommendations
   */
  private static generateRecommendations(opportunities: TextureUpscaleOpportunity[]): string[] {
    const recommendations: string[] = [];

    if (opportunities.length === 0) {
      recommendations.push('All textures meet minimum resolution requirements');
      return recommendations;
    }

    const highPriority = opportunities.filter(opp => opp.priority === 'high').length;
    const totalVRAM = opportunities.reduce((sum, opp) => sum + opp.performanceImpact, 0);

    recommendations.push(`${opportunities.length} textures could benefit from resolution upscaling`);

    if (highPriority > 0) {
      recommendations.push(`${highPriority} high-priority textures should be upscaled for significant quality improvement`);
    }

    if (totalVRAM > 100) {
      recommendations.push(`Total VRAM increase: ~${Math.round(totalVRAM)}MB - consider upscaling in batches`);
    } else if (totalVRAM > 10) {
      recommendations.push(`Total VRAM increase: ~${Math.round(totalVRAM)}MB - reasonable impact for quality improvement`);
    }

    // Group by usage type
    const byUsage = opportunities.reduce((acc, opp) => {
      const usage = opp.texture.usage;
      acc[usage] = (acc[usage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usageRecommendations = Object.entries(byUsage)
      .map(([usage, count]) => `${count} ${usage} textures`)
      .join(', ');

    if (usageRecommendations) {
      recommendations.push(`Focus on upscaling: ${usageRecommendations}`);
    }

    return recommendations;
  }

  /**
   * Parse DDS texture information
   */
  static async parseDDSTextureInfo(filePath: string): Promise<TextureInfo | null> {
    try {
      const buffer = await fs.promises.readFile(filePath);

      if (buffer.length < 128) {
        return null; // Too small for DDS header
      }

      // Parse DDS header (simplified)
      const magic = buffer.readUInt32LE(0);
      if (magic !== 0x20534444) { // 'DDS '
        return null;
      }

      const height = buffer.readUInt32LE(12);
      const width = buffer.readUInt32LE(16);
      const mipMapCount = buffer.readUInt32LE(28);
      const format = this.identifyDDSFormat(buffer);

      // Determine usage based on filename/path
      const usage = this.inferTextureUsage(filePath);
      const distanceUsage = this.inferDistanceUsage(filePath);

      return {
        path: filePath,
        width,
        height,
        format,
        mipmaps: mipMapCount,
        size: buffer.length,
        usage,
        distanceUsage
      };
    } catch (error) {
      console.warn(`Failed to parse DDS texture info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Identify DDS format from header
   */
  private static identifyDDSFormat(buffer: Buffer): string {
    // This is a simplified format detection
    // Real implementation would parse the DDS_PIXELFORMAT structure

    const flags = buffer.readUInt32LE(80);
    const fourCC = buffer.readUInt32LE(84);

    if (fourCC === 0x31545844) return 'DXT1'; // 'DXT1'
    if (fourCC === 0x33545844) return 'DXT3'; // 'DXT3'
    if (fourCC === 0x35545844) return 'DXT5'; // 'DXT5'

    // Check for uncompressed formats
    if (flags & 0x40) { // DDPF_RGB
      const rgbBitCount = buffer.readUInt32LE(88);
      if (rgbBitCount === 32) return 'RGBA8';
      if (rgbBitCount === 24) return 'RGB8';
    }

    return 'Unknown';
  }

  /**
   * Infer texture usage from filename/path
   */
  private static inferTextureUsage(filePath: string): TextureInfo['usage'] {
    const filename = path.basename(filePath).toLowerCase();

    if (filename.includes('_n') || filename.includes('normal')) {
      return 'normal';
    }
    if (filename.includes('_s') || filename.includes('specular') || filename.includes('metal')) {
      return 'specular';
    }
    if (filename.includes('diffuse') || filename.includes('_d')) {
      return 'diffuse';
    }

    return 'other';
  }

  /**
   * Infer distance usage from path context
   */
  private static inferDistanceUsage(filePath: string): TextureInfo['distanceUsage'] {
    const pathLower = filePath.toLowerCase();

    // LOD textures are typically used at distance
    if (pathLower.includes('lod') || pathLower.includes('low')) {
      return 'far';
    }

    // UI textures are background
    if (pathLower.includes('interface') || pathLower.includes('ui') || pathLower.includes('menu')) {
      return 'background';
    }

    // Weapon/armor textures are close-up
    if (pathLower.includes('weapon') || pathLower.includes('armor') || pathLower.includes('character')) {
      return 'close';
    }

    // Default to medium distance
    return 'medium';
  }

  /**
   * Batch process DDS files in a directory
   */
  static async scanDirectoryForTextures(directory: string): Promise<TextureInfo[]> {
    const textures: TextureInfo[] = [];

    try {
      const files = await fs.promises.readdir(directory, { recursive: true });

      for (const file of files) {
        const filePath = path.join(directory, file);
        if (path.extname(filePath).toLowerCase() === '.dds') {
          const info = await this.parseDDSTextureInfo(filePath);
          if (info) {
            textures.push(info);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory for textures: ${directory}`, error);
    }

    return textures;
  }
}