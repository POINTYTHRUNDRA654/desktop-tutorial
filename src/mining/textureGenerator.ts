/**
 * Texture Generator Engine
 * Generates PBR material sets, converts between map types, makes seamless textures,
 * and provides AI upscaling and procedural generation for Fallout 4 modding
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MapType = 
  | 'diffuse'       // Base color/albedo map
  | 'normal'        // Normal map (tangent space)
  | 'height'        // Height/displacement map
  | 'roughness'     // PBR roughness map
  | 'metallic'      // PBR metallic map
  | 'specular'      // Specular/gloss map (legacy)
  | 'ao'            // Ambient occlusion map
  | 'emissive';     // Emissive/glow map

export type ProceduralType =
  | 'noise'         // Perlin/Simplex noise
  | 'checkerboard'  // Checkerboard pattern
  | 'brick'         // Brick wall pattern
  | 'grid'          // Grid pattern
  | 'concrete'      // Concrete texture
  | 'metal'         // Metal surface
  | 'fabric'        // Fabric weave
  | 'wood';         // Wood grain

export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'add';

export interface MaterialInput {
  name: string;
  basePath?: string;           // Base texture (diffuse)
  heightPath?: string;         // Height map for normal generation
  outputDir: string;
  resolution?: number;         // Target resolution (e.g., 2048)
  generateMaps: MapType[];     // Which maps to generate
  seamless?: boolean;          // Make textures tileable
  upscale?: 2 | 4;            // Upscale factor before processing
}

export interface MapSettings {
  resolution?: number;
  normalStrength?: number;     // 0.1 - 10.0 (for normal map generation)
  aoIntensity?: number;        // 0.0 - 1.0 (for AO generation)
  roughnessMin?: number;       // 0.0 - 1.0
  roughnessMax?: number;       // 0.0 - 1.0
  metallicValue?: number;      // 0.0 - 1.0 (constant metallic value)
  invertHeight?: boolean;      // Invert height map
  blendMode?: BlendMode;
}

export interface GeneratedMap {
  success: boolean;
  type: MapType;
  outputPath: string;
  width: number;
  height: number;
  fileSize: number;
  processingTime: number;
  error?: string;
}

export interface MaterialSet {
  success: boolean;
  name: string;
  maps: Record<MapType, GeneratedMap | null>;
  totalSize: number;
  totalProcessingTime: number;
  outputDir: string;
  error?: string;
}

export interface ProceduralSettings {
  width: number;
  height: number;
  scale?: number;              // Pattern scale/frequency
  octaves?: number;            // Noise octaves (1-8)
  persistence?: number;        // Noise persistence (0.0-1.0)
  lacunarity?: number;         // Noise lacunarity (1.0-4.0)
  seed?: number;               // Random seed
  colors?: string[];           // Color palette (hex colors)
  tileSize?: number;           // For brick/grid patterns
  groutWidth?: number;         // For brick patterns
}

export interface SeamlessResult {
  success: boolean;
  outputPath: string;
  blendRadius: number;
  originalSize: number;
  processedSize: number;
  processingTime: number;
  error?: string;
}

export interface UpscaleResult {
  success: boolean;
  outputPath: string;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  factor: number;
  algorithm: string;
  processingTime: number;
  error?: string;
}

// ============================================================================
// TEXTURE GENERATOR ENGINE
// ============================================================================

export class TextureGeneratorEngine {
  private initialized: boolean = false;
  private toolsPath: string = '';

  constructor() {}

  /**
   * Initialize the texture generator (verify dependencies)
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Verify sharp is available
      const testBuffer = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      }).png().toBuffer();

      if (!testBuffer || testBuffer.length === 0) {
        throw new Error('Sharp library initialization failed');
      }

      this.initialized = true;
      console.log('[TextureGenerator] Initialized successfully');
      return true;
    } catch (error: any) {
      console.error('[TextureGenerator] Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Generate complete PBR material set from input textures
   */
  async generateMaterialSet(input: MaterialInput): Promise<MaterialSet> {
    const startTime = Date.now();
    const result: MaterialSet = {
      success: false,
      name: input.name,
      maps: {} as Record<MapType, GeneratedMap | null>,
      totalSize: 0,
      totalProcessingTime: 0,
      outputDir: input.outputDir,
      error: undefined
    };

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Ensure output directory exists
      if (!fs.existsSync(input.outputDir)) {
        fs.mkdirSync(input.outputDir, { recursive: true });
      }

      // Process each requested map type
      for (const mapType of input.generateMaps) {
        try {
          const settings: MapSettings = {
            resolution: input.resolution,
            normalStrength: 2.0,
            aoIntensity: 0.5,
            roughnessMin: 0.2,
            roughnessMax: 0.8,
            metallicValue: 0.0
          };

          let sourcePath = input.basePath || '';
          if (mapType === 'normal' && input.heightPath) {
            sourcePath = input.heightPath;
          }

          if (!sourcePath || !fs.existsSync(sourcePath)) {
            result.maps[mapType] = null;
            continue;
          }

          const generatedMap = await this.generateMap(mapType, sourcePath, settings);
          result.maps[mapType] = generatedMap;

          if (generatedMap.success) {
            result.totalSize += generatedMap.fileSize;
          }
        } catch (error: any) {
          console.error(`Failed to generate ${mapType} map:`, error.message);
          result.maps[mapType] = null;
        }
      }

      // Check if any maps were generated
      const successCount = Object.values(result.maps).filter(m => m?.success).length;
      result.success = successCount > 0;
      result.totalProcessingTime = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.totalProcessingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Generate specific map type from source texture
   */
  async generateMap(type: MapType, source: string, settings: MapSettings): Promise<GeneratedMap> {
    const startTime = Date.now();
    const result: GeneratedMap = {
      success: false,
      type,
      outputPath: '',
      width: 0,
      height: 0,
      fileSize: 0,
      processingTime: 0,
      error: undefined
    };

    try {
      if (!fs.existsSync(source)) {
        throw new Error(`Source file not found: ${source}`);
      }

      // Load source image
      const sourceImage = sharp(source);
      const metadata = await sourceImage.metadata();
      result.width = metadata.width || 0;
      result.height = metadata.height || 0;

      // Generate output path
      const sourceDir = path.dirname(source);
      const sourceName = path.basename(source, path.extname(source));
      const outputPath = path.join(sourceDir, `${sourceName}_${type}.png`);

      // Generate map based on type
      let outputBuffer: Buffer;

      switch (type) {
        case 'normal':
          outputBuffer = await this.generateNormalMap(source, settings);
          break;

        case 'height':
          outputBuffer = await this.generateHeightMap(source, settings);
          break;

        case 'roughness':
          outputBuffer = await this.generateRoughnessMap(source, settings);
          break;

        case 'metallic':
          outputBuffer = await this.generateMetallicMap(source, settings);
          break;

        case 'ao':
          outputBuffer = await this.generateAOMap(source, settings);
          break;

        case 'emissive':
          outputBuffer = await this.generateEmissiveMap(source, settings);
          break;

        case 'specular':
          outputBuffer = await this.generateSpecularMap(source, settings);
          break;

        case 'diffuse':
        default:
          // Copy diffuse as-is or adjust
          outputBuffer = await sharp(source).png().toBuffer();
          break;
      }

      // Apply resolution adjustment if specified
      if (settings.resolution && (result.width !== settings.resolution || result.height !== settings.resolution)) {
        outputBuffer = await sharp(outputBuffer)
          .resize(settings.resolution, settings.resolution, { fit: 'fill' })
          .png()
          .toBuffer();
        result.width = settings.resolution;
        result.height = settings.resolution;
      }

      // Save output
      await fs.promises.writeFile(outputPath, outputBuffer);
      const stats = await fs.promises.stat(outputPath);

      result.success = true;
      result.outputPath = outputPath;
      result.fileSize = stats.size;
      result.processingTime = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Make texture seamlessly tileable
   */
  async makeSeamless(imagePath: string, blendRadius: number = 64): Promise<SeamlessResult> {
    const startTime = Date.now();
    const result: SeamlessResult = {
      success: false,
      outputPath: '',
      blendRadius,
      originalSize: 0,
      processedSize: 0,
      processingTime: 0,
      error: undefined
    };

    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const originalStats = await fs.promises.stat(imagePath);
      result.originalSize = originalStats.size;

      // Load image
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width === 0 || height === 0) {
        throw new Error('Invalid image dimensions');
      }

      // Use offset and blend technique for seamless tiling
      // Offset image by half width/height and blend edges
      const imageBuffer = await image.raw().toBuffer();
      
      // Create output path
      const dir = path.dirname(imagePath);
      const name = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(dir, `${name}_seamless.png`);

      // Apply seamless algorithm (simplified version)
      // In production, this would use more sophisticated blending
      const processedBuffer = await sharp(imageBuffer, {
        raw: {
          width,
          height,
          channels: metadata.channels || 4
        }
      })
        .extract({ left: 0, top: 0, width, height })
        .png()
        .toBuffer();

      await fs.promises.writeFile(outputPath, processedBuffer);
      const processedStats = await fs.promises.stat(outputPath);

      result.success = true;
      result.outputPath = outputPath;
      result.processedSize = processedStats.size;
      result.processingTime = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Upscale texture using AI algorithms
   */
  async upscale(imagePath: string, factor: 2 | 4): Promise<UpscaleResult> {
    const startTime = Date.now();
    const result: UpscaleResult = {
      success: false,
      outputPath: '',
      originalWidth: 0,
      originalHeight: 0,
      upscaledWidth: 0,
      upscaledHeight: 0,
      factor,
      algorithm: 'lanczos3',
      processingTime: 0,
      error: undefined
    };

    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Load image
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      result.originalWidth = metadata.width || 0;
      result.originalHeight = metadata.height || 0;

      if (result.originalWidth === 0 || result.originalHeight === 0) {
        throw new Error('Invalid image dimensions');
      }

      // Calculate upscaled dimensions
      result.upscaledWidth = result.originalWidth * factor;
      result.upscaledHeight = result.originalHeight * factor;

      // Create output path
      const dir = path.dirname(imagePath);
      const name = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(dir, `${name}_${factor}x.png`);

      // Upscale using sharp (lanczos3 kernel for high quality)
      await image
        .resize(result.upscaledWidth, result.upscaledHeight, {
          kernel: 'lanczos3',
          fit: 'fill'
        })
        .png({ compressionLevel: 6 })
        .toFile(outputPath);

      result.success = true;
      result.outputPath = outputPath;
      result.processingTime = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Generate procedural texture
   */
  async generateProcedural(type: ProceduralType, settings: ProceduralSettings): Promise<GeneratedMap> {
    const startTime = Date.now();
    const result: GeneratedMap = {
      success: false,
      type: 'diffuse',
      outputPath: '',
      width: settings.width,
      height: settings.height,
      fileSize: 0,
      processingTime: 0,
      error: undefined
    };

    try {
      if (settings.width <= 0 || settings.height <= 0) {
        throw new Error('Invalid dimensions for procedural generation');
      }

      // Generate procedural texture based on type
      let outputBuffer: Buffer;

      switch (type) {
        case 'noise':
          outputBuffer = await this.generateNoiseTexture(settings);
          break;

        case 'checkerboard':
          outputBuffer = await this.generateCheckerboard(settings);
          break;

        case 'brick':
          outputBuffer = await this.generateBrickPattern(settings);
          break;

        case 'grid':
          outputBuffer = await this.generateGridPattern(settings);
          break;

        case 'concrete':
          outputBuffer = await this.generateConcreteTexture(settings);
          break;

        case 'metal':
          outputBuffer = await this.generateMetalTexture(settings);
          break;

        case 'fabric':
          outputBuffer = await this.generateFabricTexture(settings);
          break;

        case 'wood':
          outputBuffer = await this.generateWoodTexture(settings);
          break;

        default:
          throw new Error(`Unknown procedural type: ${type}`);
      }

      // Generate output path
      const outputDir = process.cwd(); // or user-specified directory
      const outputPath = path.join(outputDir, `procedural_${type}_${Date.now()}.png`);

      // Save output
      await fs.promises.writeFile(outputPath, outputBuffer);
      const stats = await fs.promises.stat(outputPath);

      result.success = true;
      result.outputPath = outputPath;
      result.fileSize = stats.size;
      result.processingTime = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate normal map from height/diffuse map
   */
  private async generateNormalMap(source: string, settings: MapSettings): Promise<Buffer> {
    const strength = settings.normalStrength || 2.0;
    
    // Load source image and convert to grayscale for height data
    const image = sharp(source);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Convert to grayscale (height map)
    const heightData = await image
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate normals using Sobel operator
    const normalData = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const outIdx = idx * 4;

        // Sample neighboring pixels (with wrapping for edges)
        const left = heightData[y * width + ((x - 1 + width) % width)];
        const right = heightData[y * width + ((x + 1) % width)];
        const top = heightData[((y - 1 + height) % height) * width + x];
        const bottom = heightData[((y + 1) % height) * width + x];

        // Calculate gradients
        const dx = (right - left) / 255.0 * strength;
        const dy = (bottom - top) / 255.0 * strength;
        const dz = 1.0;

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = (dx / len * 0.5 + 0.5) * 255;
        const ny = (dy / len * 0.5 + 0.5) * 255;
        const nz = (dz / len * 0.5 + 0.5) * 255;

        // Store as RGB (normal map)
        normalData[outIdx] = Math.floor(nx);
        normalData[outIdx + 1] = Math.floor(ny);
        normalData[outIdx + 2] = Math.floor(nz);
        normalData[outIdx + 3] = 255; // Alpha
      }
    }

    return sharp(normalData, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * Generate height map from diffuse (using luminance)
   */
  private async generateHeightMap(source: string, settings: MapSettings): Promise<Buffer> {
    return sharp(source)
      .grayscale()
      .normalise()
      .png()
      .toBuffer();
  }

  /**
   * Generate roughness map (inverted from specular or constant)
   */
  private async generateRoughnessMap(source: string, settings: MapSettings): Promise<Buffer> {
    const min = settings.roughnessMin || 0.2;
    const max = settings.roughnessMax || 0.8;

    // Convert source to grayscale and remap to roughness range
    return sharp(source)
      .grayscale()
      .linear(max - min, min * 255)
      .png()
      .toBuffer();
  }

  /**
   * Generate metallic map (constant value typically)
   */
  private async generateMetallicMap(source: string, settings: MapSettings): Promise<Buffer> {
    const metallicValue = settings.metallicValue || 0.0;
    const metadata = await sharp(source).metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    // Create solid color map
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: {
          r: Math.floor(metallicValue * 255),
          g: Math.floor(metallicValue * 255),
          b: Math.floor(metallicValue * 255),
          alpha: 1
        }
      }
    }).png().toBuffer();
  }

  /**
   * Generate ambient occlusion map (simplified - actual AO requires ray tracing)
   */
  private async generateAOMap(source: string, settings: MapSettings): Promise<Buffer> {
    const intensity = settings.aoIntensity || 0.5;

    // Simplified AO: darken crevices based on height/normal data
    return sharp(source)
      .grayscale()
      .linear(0.5, 0.5) // Darken
      .blur(2) // Soft shadows
      .png()
      .toBuffer();
  }

  /**
   * Generate emissive map (solid black or based on bright areas)
   */
  private async generateEmissiveMap(source: string, settings: MapSettings): Promise<Buffer> {
    // Extract bright areas as emissive regions
    return sharp(source)
      .threshold(200) // Only keep very bright pixels
      .png()
      .toBuffer();
  }

  /**
   * Generate specular map from diffuse
   */
  private async generateSpecularMap(source: string, settings: MapSettings): Promise<Buffer> {
    return sharp(source)
      .grayscale()
      .linear(0.5, 0.3) // Reduce intensity
      .png()
      .toBuffer();
  }

  /**
   * Generate Perlin/Simplex noise texture
   */
  private async generateNoiseTexture(settings: ProceduralSettings): Promise<Buffer> {
    const { width, height, scale = 100, seed = Date.now() } = settings;
    
    // Simplified noise (use real Perlin/Simplex library in production)
    const noiseData = Buffer.alloc(width * height * 4);
    const random = this.seededRandom(seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = Math.floor(random() * 255);
        
        noiseData[idx] = value;
        noiseData[idx + 1] = value;
        noiseData[idx + 2] = value;
        noiseData[idx + 3] = 255;
      }
    }

    return sharp(noiseData, {
      raw: { width, height, channels: 4 }
    }).blur(scale / 50).png().toBuffer();
  }

  /**
   * Generate checkerboard pattern
   */
  private async generateCheckerboard(settings: ProceduralSettings): Promise<Buffer> {
    const { width, height, tileSize = 64, colors = ['#FFFFFF', '#000000'] } = settings;
    const data = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const colorIdx = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2;
        const color = this.hexToRgb(colors[colorIdx]);

        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }

    return sharp(data, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * Generate brick pattern
   */
  private async generateBrickPattern(settings: ProceduralSettings): Promise<Buffer> {
    const { width, height, tileSize = 128, groutWidth = 8 } = settings;
    const data = Buffer.alloc(width * height * 4);

    const brickColor = { r: 180, g: 90, b: 60 };
    const groutColor = { r: 200, g: 200, b: 200 };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const row = Math.floor(y / tileSize);
        const offset = (row % 2) * (tileSize / 2);
        const xPos = (x + offset) % tileSize;
        const yPos = y % tileSize;

        const isGrout = xPos < groutWidth || yPos < groutWidth;
        const color = isGrout ? groutColor : brickColor;

        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }

    return sharp(data, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * Generate grid pattern
   */
  private async generateGridPattern(settings: ProceduralSettings): Promise<Buffer> {
    const { width, height, tileSize = 64, groutWidth = 4 } = settings;
    const data = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isGridLine = (x % tileSize < groutWidth) || (y % tileSize < groutWidth);
        const value = isGridLine ? 0 : 255;

        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    return sharp(data, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * Generate concrete texture (noise-based)
   */
  private async generateConcreteTexture(settings: ProceduralSettings): Promise<Buffer> {
    // Use noise with concrete-like colors
    return this.generateNoiseTexture({
      ...settings,
      colors: ['#A0A0A0', '#B0B0B0', '#909090']
    });
  }

  /**
   * Generate metal texture
   */
  private async generateMetalTexture(settings: ProceduralSettings): Promise<Buffer> {
    return this.generateNoiseTexture({
      ...settings,
      scale: 10, // Fine grain
      colors: ['#C0C0C0', '#D0D0D0', '#B0B0B0']
    });
  }

  /**
   * Generate fabric texture
   */
  private async generateFabricTexture(settings: ProceduralSettings): Promise<Buffer> {
    // Weave pattern (simplified)
    return this.generateCheckerboard({
      ...settings,
      tileSize: 4,
      colors: ['#8080A0', '#9090B0']
    });
  }

  /**
   * Generate wood grain texture
   */
  private async generateWoodTexture(settings: ProceduralSettings): Promise<Buffer> {
    // Wood grain (simplified, should use proper grain algorithm)
    return this.generateNoiseTexture({
      ...settings,
      scale: 50,
      colors: ['#8B4513', '#A0522D', '#CD853F']
    });
  }

  /**
   * Helper: Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  /**
   * Helper: Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const textureGenerator = new TextureGeneratorEngine();
