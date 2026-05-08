/**
 * DDS Converter Engine
 * Handles texture format conversion, mipmap generation, and batch processing
 * Supports multiple DDS compression formats for Fallout 4 modding
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TextureFormat = 
  | 'DDS_DXT1'      // BC1 - 1-bit alpha or no alpha (diffuse, 4:1 compression)
  | 'DDS_DXT3'      // BC2 - Explicit alpha (rarely used)
  | 'DDS_DXT5'      // BC3 - Interpolated alpha (diffuse with alpha)
  | 'DDS_BC5'       // BC5 - 2-channel compression (optimized for normal maps)
  | 'DDS_BC7'       // BC7 - Higher quality, slower (modern, best quality)
  | 'DDS_UNCOMPRESSED' // Uncompressed RGBA
  | 'PNG'
  | 'TGA'
  | 'BMP'
  | 'JPG';

export type TextureType = 'diffuse' | 'normal' | 'specular' | 'emissive' | 'glow' | 'roughness' | 'metallic';

export interface DDSConversionInput {
  sourcePath: string;
  outputPath?: string; // If omitted, replaces extension with .dds
  format: TextureFormat;
  textureType?: TextureType;
  generateMipmaps?: boolean;
  mipmapLevels?: number; // Auto-calculate if not specified
  quality?: 'fast' | 'normal' | 'high' | 'ultra';
  resize?: {
    width: number;
    height: number;
    maintainAspect?: boolean;
  };
  flipY?: boolean; // Flip vertically (important for normal maps)
}

export interface FormatMappingRule {
  pattern: RegExp; // File name pattern (e.g., /_n\.png$/ for normal maps)
  format: TextureFormat;
  textureType: TextureType;
  description: string;
}

export interface BatchConversionOptions {
  formatMappingRules?: FormatMappingRule[];
  defaultFormat?: TextureFormat;
  defaultQuality?: 'fast' | 'normal' | 'high' | 'ultra';
  generateMipmaps?: boolean;
  onProgress?: (current: number, total: number, fileName: string) => void;
  onError?: (fileName: string, error: string) => void;
}

export interface DDSConversionResult {
  success: boolean;
  outputPath?: string;
  originalSize: number; // bytes
  convertedSize: number; // bytes
  compressionRatio: number; // e.g., 4.2 means 4.2:1
  format: TextureFormat;
  width: number;
  height: number;
  mipmapCount: number;
  processingTime: number; // milliseconds
  error?: string;
}

export interface BatchConversionResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: DDSConversionResult[];
  totalOriginalSize: number;
  totalConvertedSize: number;
  totalCompressionRatio: number;
  totalProcessingTime: number;
}

export interface CompressionPreset {
  format: TextureFormat;
  quality: 'fast' | 'normal' | 'high' | 'ultra';
  generateMipmaps: boolean;
  mipmapFilter: 'box' | 'triangle' | 'kaiser';
  flipY: boolean;
  description: string;
}

export interface MipmapLevel {
  width: number;
  height: number;
  dataSize: number;
}

export interface MipmapChain {
  levels: MipmapLevel[];
  totalSize: number;
  count: number;
}

export interface TextureInfo {
  format: TextureFormat;
  width: number;
  height: number;
  mipmapCount: number;
  hasAlpha: boolean;
  fileSize: number;
  compressionType?: string;
}

// ============================================================================
// COMPRESSION PRESETS
// ============================================================================

const PRESETS: Record<TextureType, CompressionPreset> = {
  diffuse: {
    format: 'DDS_DXT1',
    quality: 'high',
    generateMipmaps: true,
    mipmapFilter: 'kaiser',
    flipY: false,
    description: 'DXT1 (BC1) - 4:1 compression, no alpha channel. Best for diffuse/color textures without transparency.'
  },
  normal: {
    format: 'DDS_BC5',
    quality: 'ultra',
    generateMipmaps: true,
    mipmapFilter: 'kaiser',
    flipY: false, // BC5 handles normal maps correctly
    description: 'BC5 - Optimized 2-channel compression specifically designed for normal maps. Best quality and performance.'
  },
  specular: {
    format: 'DDS_DXT5',
    quality: 'high',
    generateMipmaps: true,
    mipmapFilter: 'triangle',
    flipY: false,
    description: 'DXT5 (BC3) - Handles specular intensity with alpha channel for gloss maps.'
  },
  emissive: {
    format: 'DDS_DXT1',
    quality: 'normal',
    generateMipmaps: true,
    mipmapFilter: 'box',
    flipY: false,
    description: 'DXT1 (BC1) - Sufficient for emissive/glow maps without alpha.'
  },
  glow: {
    format: 'DDS_DXT1',
    quality: 'normal',
    generateMipmaps: true,
    mipmapFilter: 'box',
    flipY: false,
    description: 'DXT1 (BC1) - Optimized for glow/emissive maps without alpha.'
  },
  roughness: {
    format: 'DDS_BC7',
    quality: 'high',
    generateMipmaps: true,
    mipmapFilter: 'kaiser',
    flipY: false,
    description: 'BC7 - Modern high-quality compression for PBR roughness maps.'
  },
  metallic: {
    format: 'DDS_BC7',
    quality: 'high',
    generateMipmaps: true,
    mipmapFilter: 'kaiser',
    flipY: false,
    description: 'BC7 - High-quality compression for PBR metallic maps.'
  }
};

/**
 * Default format mapping rules for intelligent batch conversion.
 * These rules automatically select the optimal DDS format based on filename patterns.
 */
export const DEFAULT_FORMAT_MAPPING_RULES: FormatMappingRule[] = [
  {
    pattern: /_n\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_BC5',
    textureType: 'normal',
    description: 'Normal maps (*_n.*) → BC5 (optimized 2-channel compression)'
  },
  {
    pattern: /_d\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_DXT1',
    textureType: 'diffuse',
    description: 'Diffuse maps (*_d.*) → BC1/DXT1 (no alpha needed)'
  },
  {
    pattern: /_s\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_DXT5',
    textureType: 'specular',
    description: 'Specular maps (*_s.*) → BC3/DXT5 (alpha for gloss)'
  },
  {
    pattern: /_g\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_DXT1',
    textureType: 'glow',
    description: 'Glow/emissive maps (*_g.*) → BC1/DXT1 (no alpha)'
  },
  {
    pattern: /_e\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_DXT1',
    textureType: 'glow',
    description: 'Environment/emissive maps (*_e.*) → BC1/DXT1'
  },
  {
    pattern: /_m\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_BC7',
    textureType: 'metallic',
    description: 'Metallic maps (*_m.*) → BC7 (high quality PBR)'
  },
  {
    pattern: /_r\.(png|tga|bmp|jpg|jpeg)$/i,
    format: 'DDS_BC7',
    textureType: 'roughness',
    description: 'Roughness maps (*_r.*) → BC7 (high quality PBR)'
  }
];

// ============================================================================
// TOOL DETECTION
// ============================================================================

interface ConversionTool {
  name: string;
  executable: string;
  args: (input: DDSConversionInput) => string[];
  priority: number;
}

const CONVERSION_TOOLS: ConversionTool[] = [
  {
    name: 'texconv',
    executable: 'texconv.exe',
    priority: 1,
    args: (input: DDSConversionInput) => {
      const args: string[] = [];
      
      // Format selection
      switch (input.format) {
        case 'DDS_DXT1':
          args.push('-f', 'BC1_UNORM');
          break;
        case 'DDS_DXT3':
          args.push('-f', 'BC2_UNORM');
          break;
        case 'DDS_DXT5':
          args.push('-f', 'BC3_UNORM');
          break;
        case 'DDS_BC5':
          args.push('-f', 'BC5_UNORM');
          break;
        case 'DDS_BC7':
          args.push('-f', 'BC7_UNORM');
          break;
        case 'DDS_UNCOMPRESSED':
          args.push('-f', 'R8G8B8A8_UNORM');
          break;
      }
      
      // Mipmap generation
      if (input.generateMipmaps) {
        args.push('-m', String(input.mipmapLevels || 0)); // 0 = auto
      }
      
      // Quality settings
      if (input.quality === 'ultra') {
        args.push('-pmalpha'); // Premultiplied alpha for better quality
      }
      
      // Resize
      if (input.resize) {
        args.push('-w', String(input.resize.width));
        args.push('-h', String(input.resize.height));
        if (!input.resize.maintainAspect) {
          args.push('-keepcoverage'); // Stretch to fit
        }
      }
      
      // Flip Y axis
      if (input.flipY) {
        args.push('-vflip');
      }
      
      // Output directory
      if (input.outputPath) {
        args.push('-o', path.dirname(input.outputPath));
      }
      
      // Input file (must be last)
      args.push(input.sourcePath);
      
      return args;
    }
  },
  {
    name: 'nvcompress',
    executable: 'nvcompress.exe',
    priority: 2,
    args: (input: DDSConversionInput) => {
      const args: string[] = [];
      
      // Format selection
      switch (input.format) {
        case 'DDS_DXT1':
          args.push('-bc1');
          break;
        case 'DDS_DXT3':
          args.push('-bc2');
          break;
        case 'DDS_DXT5':
          args.push('-bc3');
          break;
        case 'DDS_BC5':
          args.push('-bc5');
          break;
        case 'DDS_BC7':
          args.push('-bc7');
          break;
      }
      
      // Quality
      if (input.quality === 'fast') {
        args.push('-fast');
      } else if (input.quality === 'high' || input.quality === 'ultra') {
        args.push('-highest');
      }
      
      // Mipmaps
      if (input.generateMipmaps) {
        args.push('-mipmap');
      } else {
        args.push('-nomips');
      }
      
      // Input and output
      args.push(input.sourcePath);
      args.push(input.outputPath || input.sourcePath.replace(/\.[^.]+$/, '.dds'));
      
      return args;
    }
  }
];

// ============================================================================
// CORE ENGINE CLASS
// ============================================================================

export class DDSConverterEngine {
  private availableTool: ConversionTool | null = null;
  
  /**
   * Initialize and detect available conversion tools
   */
  async initialize(): Promise<boolean> {
    // Sort tools by priority
    const sortedTools = [...CONVERSION_TOOLS].sort((a, b) => a.priority - b.priority);
    
    for (const tool of sortedTools) {
      try {
        // Try to execute with --version or --help to check if available
        await execFileAsync(tool.executable, ['--version']);
        this.availableTool = tool;
        console.log(`[DDSConverter] Using tool: ${tool.name}`);
        return true;
      } catch {
        // Tool not found, try next
        continue;
      }
    }
    
    console.error('[DDSConverter] No conversion tools found (texconv.exe or nvcompress.exe)');
    return false;
  }
  
  /**
   * Convert a single texture file
   */
  async convertTexture(input: DDSConversionInput): Promise<DDSConversionResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!fs.existsSync(input.sourcePath)) {
        return {
          success: false,
          originalSize: 0,
          convertedSize: 0,
          compressionRatio: 0,
          format: input.format,
          width: 0,
          height: 0,
          mipmapCount: 0,
          processingTime: 0,
          error: 'Source file not found'
        };
      }
      
      // Ensure tool is available
      if (!this.availableTool) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            originalSize: 0,
            convertedSize: 0,
            compressionRatio: 0,
            format: input.format,
            width: 0,
            height: 0,
            mipmapCount: 0,
            processingTime: 0,
            error: 'No conversion tools available. Install texconv.exe or nvcompress.exe'
          };
        }
      }
      
      // Get source file size
      const sourceStats = fs.statSync(input.sourcePath);
      const originalSize = sourceStats.size;
      
      // Determine output path
      const outputPath = input.outputPath || input.sourcePath.replace(/\.[^.]+$/, '.dds');
      
      // Build conversion command
      const args = this.availableTool!.args(input);
      
      // Execute conversion
      await execFileAsync(this.availableTool!.executable, args);
      
      // Verify output file was created
      if (!fs.existsSync(outputPath)) {
        return {
          success: false,
          originalSize,
          convertedSize: 0,
          compressionRatio: 0,
          format: input.format,
          width: 0,
          height: 0,
          mipmapCount: 0,
          processingTime: Date.now() - startTime,
          error: 'Output file was not created'
        };
      }
      
      // Get converted file info
      const outputStats = fs.statSync(outputPath);
      const convertedSize = outputStats.size;
      const compressionRatio = originalSize / convertedSize;
      
      // Parse DDS header to get dimensions and mipmap count
      const textureInfo = await this.getTextureInfo(outputPath);
      
      return {
        success: true,
        outputPath,
        originalSize,
        convertedSize,
        compressionRatio,
        format: input.format,
        width: textureInfo.width,
        height: textureInfo.height,
        mipmapCount: textureInfo.mipmapCount,
        processingTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      return {
        success: false,
        originalSize: 0,
        convertedSize: 0,
        compressionRatio: 0,
        format: input.format,
        width: 0,
        height: 0,
        mipmapCount: 0,
        processingTime: Date.now() - startTime,
        error: error.message || 'Conversion failed'
      };
    }
  }
  
  /**
   * Convert multiple files in batch
   */
  async convertBatch(
    files: DDSConversionInput[], 
    options?: BatchConversionOptions
  ): Promise<BatchConversionResult> {
    const startTime = Date.now();
    const results: DDSConversionResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let totalOriginalSize = 0;
    let totalConvertedSize = 0;
    
    // Use provided format mapping rules or default rules
    const formatRules = options?.formatMappingRules || DEFAULT_FORMAT_MAPPING_RULES;
    
    for (let i = 0; i < files.length; i++) {
      const input = files[i];
      
      // Apply format mapping if enabled
      if (formatRules.length > 0) {
        const fileName = path.basename(input.sourcePath);
        for (const rule of formatRules) {
          if (rule.pattern.test(fileName)) {
            // Override format and quality with rule-based values
            input.format = rule.format;
            input.quality = options?.defaultQuality || 'normal';
            input.generateMipmaps = options?.generateMipmaps ?? true;
            break; // Use first matching rule
          }
        }
      }
      
      // Use default options if no rule matched
      if (!input.format && options?.defaultFormat) {
        input.format = options.defaultFormat;
      }
      if (!input.quality && options?.defaultQuality) {
        input.quality = options.defaultQuality;
      }
      if (input.generateMipmaps === undefined && options?.generateMipmaps !== undefined) {
        input.generateMipmaps = options.generateMipmaps;
      }
      
      // Convert texture
      const result = await this.convertTexture(input);
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalOriginalSize += result.originalSize;
        totalConvertedSize += result.convertedSize;
      } else {
        failureCount++;
        
        // Call error callback if provided
        if (options?.onError) {
          options.onError(input.sourcePath, result.error || 'Unknown error');
        }
      }
      
      // Call progress callback if provided
      if (options?.onProgress) {
        options.onProgress(i + 1, files.length, input.sourcePath);
      }
    }
    
    return {
      totalFiles: files.length,
      successCount,
      failureCount,
      results,
      totalOriginalSize,
      totalConvertedSize,
      totalCompressionRatio: totalOriginalSize / (totalConvertedSize || 1),
      totalProcessingTime: Date.now() - startTime
    };
  }
  
  /**
   * Detect the format of a texture file
   */
  async detectFormat(filePath: string): Promise<TextureFormat> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Non-DDS formats
      if (ext === '.png') return 'PNG';
      if (ext === '.tga') return 'TGA';
      if (ext === '.bmp') return 'BMP';
      if (ext === '.jpg' || ext === '.jpeg') return 'JPG';
      
      // DDS format - need to read header
      if (ext === '.dds') {
        const buffer = Buffer.alloc(128);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 128, 0);
        fs.closeSync(fd);
        
        // DDS magic number: "DDS " (0x20534444)
        const magic = buffer.toString('ascii', 0, 4);
        if (magic !== 'DDS ') {
          return 'DDS_UNCOMPRESSED';
        }
        
        // Read FOURCC code (offset 84)
        const fourCC = buffer.toString('ascii', 84, 88);
        
        switch (fourCC) {
          case 'DXT1':
            return 'DDS_DXT1';
          case 'DXT3':
            return 'DDS_DXT3';
          case 'DXT5':
            return 'DDS_DXT5';
          case 'DX10':
            // BC7 uses DX10 header extension
            return 'DDS_BC7';
          default:
            return 'DDS_UNCOMPRESSED';
        }
      }
      
      return 'DDS_UNCOMPRESSED';
    } catch (error) {
      console.error('[DDSConverter] Format detection error:', error);
      return 'DDS_UNCOMPRESSED';
    }
  }
  
  /**
   * Generate mipmap chain for an image
   */
  async generateMipmaps(imagePath: string, levels?: number): Promise<MipmapChain> {
    try {
      // Get source image dimensions
      const info = await this.getTextureInfo(imagePath);
      let width = info.width;
      let height = info.height;
      
      // Calculate max possible mipmap levels if not specified
      const maxLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
      const targetLevels = levels || maxLevels;
      
      const mipmapLevels: MipmapLevel[] = [];
      let totalSize = 0;
      
      for (let i = 0; i < targetLevels; i++) {
        const levelWidth = Math.max(1, width >> i);
        const levelHeight = Math.max(1, height >> i);
        const dataSize = levelWidth * levelHeight * 4; // RGBA
        
        mipmapLevels.push({
          width: levelWidth,
          height: levelHeight,
          dataSize
        });
        
        totalSize += dataSize;
        
        // Stop if we've reached 1x1
        if (levelWidth === 1 && levelHeight === 1) break;
      }
      
      return {
        levels: mipmapLevels,
        totalSize,
        count: mipmapLevels.length
      };
      
    } catch (error) {
      console.error('[DDSConverter] Mipmap generation error:', error);
      return {
        levels: [],
        totalSize: 0,
        count: 0
      };
    }
  }
  
  /**
   * Get compression preset for a texture type
   */
  getPreset(type: TextureType): CompressionPreset {
    return PRESETS[type];
  }
  
  /**
   * Get all available presets
   */
  getAllPresets(): Record<TextureType, CompressionPreset> {
    return PRESETS;
  }
  
  /**
   * Parse DDS header to extract texture information
   */
  private async getTextureInfo(filePath: string): Promise<TextureInfo> {
    try {
      const buffer = Buffer.alloc(128);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 128, 0);
      fs.closeSync(fd);
      
      const stats = fs.statSync(filePath);
      
      // Check DDS magic
      const magic = buffer.toString('ascii', 0, 4);
      if (magic !== 'DDS ') {
        // Not a DDS file, try to read as image
        // For now, return default values
        return {
          format: await this.detectFormat(filePath),
          width: 1024, // Default assumption
          height: 1024,
          mipmapCount: 1,
          hasAlpha: true,
          fileSize: stats.size
        };
      }
      
      // Read DDS header fields
      const height = buffer.readUInt32LE(12);
      const width = buffer.readUInt32LE(16);
      const mipmapCount = buffer.readUInt32LE(28) || 1;
      const pixelFormatFlags = buffer.readUInt32LE(80);
      const hasAlpha = (pixelFormatFlags & 0x1) !== 0;
      const fourCC = buffer.toString('ascii', 84, 88);
      
      let format: TextureFormat = 'DDS_UNCOMPRESSED';
      let compressionType = 'None';
      
      switch (fourCC) {
        case 'DXT1':
          format = 'DDS_DXT1';
          compressionType = 'BC1';
          break;
        case 'DXT3':
          format = 'DDS_DXT3';
          compressionType = 'BC2';
          break;
        case 'DXT5':
          format = 'DDS_DXT5';
          compressionType = 'BC3';
          break;
        case 'DX10':
          format = 'DDS_BC7';
          compressionType = 'BC7';
          break;
      }
      
      return {
        format,
        width,
        height,
        mipmapCount,
        hasAlpha,
        fileSize: stats.size,
        compressionType
      };
      
    } catch (error: any) {
      console.error('[DDSConverter] Error reading texture info:', error);
      const stats = fs.statSync(filePath);
      return {
        format: 'DDS_UNCOMPRESSED',
        width: 0,
        height: 0,
        mipmapCount: 0,
        hasAlpha: false,
        fileSize: stats.size
      };
    }
  }
  
  /**
   * Validate conversion input
   */
  validateInput(input: DDSConversionInput): { valid: boolean; error?: string } {
    if (!input.sourcePath) {
      return { valid: false, error: 'Source path is required' };
    }
    
    if (!fs.existsSync(input.sourcePath)) {
      return { valid: false, error: 'Source file does not exist' };
    }
    
    const ext = path.extname(input.sourcePath).toLowerCase();
    const validExtensions = ['.dds', '.png', '.tga', '.bmp', '.jpg', '.jpeg'];
    if (!validExtensions.includes(ext)) {
      return { valid: false, error: `Unsupported file format: ${ext}` };
    }
    
    if (input.resize) {
      if (input.resize.width <= 0 || input.resize.height <= 0) {
        return { valid: false, error: 'Invalid resize dimensions' };
      }
      
      // Warn if not power of 2 (common requirement for game textures)
      const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
      if (!isPowerOf2(input.resize.width) || !isPowerOf2(input.resize.height)) {
        console.warn('[DDSConverter] Warning: Dimensions are not power of 2');
      }
    }
    
    return { valid: true };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ddsConverter = new DDSConverterEngine();
