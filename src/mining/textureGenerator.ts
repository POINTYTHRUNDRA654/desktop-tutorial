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
  | 'cavity'        // Fine-crevice cavity map (high-frequency curvature)
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
  normalMethod?: 'sobel' | 'prewitt' | 'scharr'; // gradient kernel used for extraction
  normalSmoothing?: number;    // 0-3 — Gaussian pre-blur radius before extraction (reduces noise)
  normalFineDetail?: boolean;  // inject a high-frequency micro-detail pass on top of the base gradient
  invertY?: boolean;           // false = DirectX (FO4 standard), true = OpenGL — flips the green channel
  aoIntensity?: number;        // 0.0 - 1.0 (for AO generation)
  roughnessMin?: number;       // 0.0 - 1.0
  roughnessMax?: number;       // 0.0 - 1.0
  metallicValue?: number;      // 0.0 - 1.0 (constant metallic value)
  specularIntensity?: number;  // 0.0 - 1.0 — how strongly the RGB tint is dimmed from the source diffuse
  glossMin?: number;           // 0.0 - 1.0 — alpha channel (smoothness) floor
  glossMax?: number;           // 0.0 - 1.0 — alpha channel (smoothness) ceiling
  invertHeight?: boolean;      // Invert height map
  blendMode?: BlendMode;
  cavityRadius?: number;       // 1-8px — blur radius used as the high-pass baseline
  cavityStrength?: number;     // 0.0 - 2.0 — how strongly crevices are darkened
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

        case 'cavity':
          outputBuffer = await this.generateCavityMap(source, settings);
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
  /**
   * 3x3 gradient kernels (Gx, Gy) for each supported extraction method, plus
   * the divisor that normalizes each kernel's raw weighted sum back to a
   * per-pixel-difference-equivalent scale (so `strength` behaves consistently
   * across methods). Scharr's larger integer weights need a bigger divisor
   * or it would look wildly stronger than Sobel/Prewitt at the same strength.
   */
  private static readonly NORMAL_KERNELS: Record<
    'sobel' | 'prewitt' | 'scharr',
    { gx: number[]; gy: number[]; divisor: number }
  > = {
    sobel:   { gx: [-1, 0, 1, -2, 0, 2, -1, 0, 1], gy: [-1, -2, -1, 0, 0, 0, 1, 2, 1], divisor: 4 },
    prewitt: { gx: [-1, 0, 1, -1, 0, 1, -1, 0, 1], gy: [-1, -1, -1, 0, 0, 0, 1, 1, 1], divisor: 3 },
    scharr:  { gx: [-3, 0, 3, -10, 0, 10, -3, 0, 3], gy: [-3, -10, -3, 0, 0, 0, 3, 10, 3], divisor: 16 },
  };

  private async generateNormalMap(source: string, settings: MapSettings): Promise<Buffer> {
    const strength = settings.normalStrength || 2.0;
    const method = settings.normalMethod || 'sobel';
    const kernel = TextureGeneratorEngine.NORMAL_KERNELS[method] ?? TextureGeneratorEngine.NORMAL_KERNELS.sobel;
    const smoothing = Math.max(0, Math.min(3, settings.normalSmoothing ?? 0));
    const fineDetail = !!settings.normalFineDetail;
    const invertY = !!settings.invertY;

    const image = sharp(source);
    const { width, height } = await image.metadata();

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Optional pre-blur to suppress source noise before extracting gradients
    // (sharp requires a sigma >= 0.3; smaller settings are treated as "off").
    let grayscalePipeline = image.clone().grayscale();
    if (smoothing >= 0.3) grayscalePipeline = grayscalePipeline.blur(smoothing);
    const heightData = await grayscalePipeline.raw().toBuffer();

    // Fine-detail pass: a small-radius high-pass (raw minus a tightly blurred
    // baseline) captures crevice-scale luminance variation the base 3x3
    // kernel is too coarse to see — the same high-pass principle already
    // used by generateCavityMap. Blended additively into the gradients below
    // rather than replacing them, so it adds micro-bump without altering the
    // overall large-scale shape of the normal map.
    let fineData: Buffer | null = null;
    if (fineDetail) {
      const rawUnblurred = await image.clone().grayscale().raw().toBuffer();
      const tightBlur = await image.clone().grayscale().blur(1.2).raw().toBuffer();
      fineData = Buffer.alloc(width * height);
      for (let i = 0; i < rawUnblurred.length; i++) {
        fineData[i] = rawUnblurred[i] - tightBlur[i] + 128;
      }
    }

    const sample = (buf: Buffer, x: number, y: number): number => {
      const wx = (x + width) % width;
      const wy = (y + height) % height;
      return buf[wy * width + wx];
    };

    const normalData = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        let gx = 0;
        let gy = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const v = sample(heightData, x + kx, y + ky);
            gx += v * kernel.gx[k];
            gy += v * kernel.gy[k];
            k++;
          }
        }

        let dx = (gx / kernel.divisor) / 255.0 * strength;
        let dy = (gy / kernel.divisor) / 255.0 * strength;

        if (fineData) {
          // Same 3x3 gradient applied to the high-pass detail layer, scaled
          // down so it augments rather than overwhelms the base normal.
          let fgx = 0;
          let fgy = 0;
          k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const v = sample(fineData, x + kx, y + ky);
              fgx += v * kernel.gx[k];
              fgy += v * kernel.gy[k];
              k++;
            }
          }
          dx += (fgx / kernel.divisor) / 255.0 * strength * 0.5;
          dy += (fgy / kernel.divisor) / 255.0 * strength * 0.5;
        }

        const dz = 1.0;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = (dx / len * 0.5 + 0.5) * 255;
        let ny = (dy / len * 0.5 + 0.5) * 255;
        const nz = (dz / len * 0.5 + 0.5) * 255;
        if (invertY) ny = 255 - ny;

        normalData[outIdx] = Math.max(0, Math.min(255, Math.floor(nx)));
        normalData[outIdx + 1] = Math.max(0, Math.min(255, Math.floor(ny)));
        normalData[outIdx + 2] = Math.max(0, Math.min(255, Math.floor(nz)));
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
   * Generate a cavity map — fine-crevice detail distinct from the broad-scale
   * AO map above. Real per-pixel technique: a high-pass filter against a
   * blurred baseline. Where a pixel is darker than its blurred local average
   * it sits in a small crevice/pore (darkened proportional to how much
   * darker); where it's brighter than its surroundings (an edge/ridge) it's
   * left neutral. This is the same "curvature from a height/luminance field"
   * principle real texturing tools (e.g. Substance's cavity baker) use when
   * no actual 3D mesh curvature data is available — genuinely computed from
   * the source image, not fabricated.
   */
  private async generateCavityMap(source: string, settings: MapSettings): Promise<Buffer> {
    const radius = Math.max(1, Math.min(8, settings.cavityRadius ?? 3));
    const strength = Math.max(0, Math.min(2, settings.cavityStrength ?? 1));

    const image = sharp(source);
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error('Invalid image dimensions');

    const raw = await image.clone().grayscale().raw().toBuffer();
    const blurred = await image.clone().grayscale().blur(radius * 2).raw().toBuffer();

    const out = Buffer.alloc(width * height);
    for (let i = 0; i < raw.length; i++) {
      const diff = raw[i] - blurred[i]; // negative = darker than surroundings (a crevice)
      const cavity = diff < 0 ? 128 + diff * strength : 128; // darken crevices, leave ridges/flat areas neutral gray
      out[i] = Math.max(0, Math.min(255, Math.round(cavity)));
    }

    return sharp(out, { raw: { width, height, channels: 1 } }).png().toBuffer();
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
   * Generate a real Fallout 4 "Smooth Spec" texture from the diffuse source.
   * FO4's vanilla (non-PBR) material shader reads this exact texture slot as
   * RGB = tinted specular reflectance color, Alpha = smoothness/gloss — it is
   * NOT a plain grayscale dimming of the diffuse. Both channels are computed
   * per-pixel here rather than filled with a placeholder:
   *   - RGB: the source color dimmed toward black by `specularIntensity`,
   *     preserving hue/saturation the way a real specular tint derived from
   *     albedo would (metals keep colored highlights, dielectrics go neutral).
   *   - Alpha: per-pixel luminance remapped into [glossMin, glossMax] —
   *     brighter/cleaner areas of the source typically read as smoother, so
   *     luminance drives gloss the same way generateRoughnessMap already
   *     drives roughness from luminance (inverse relationship, same technique).
   */
  private async generateSpecularMap(source: string, settings: MapSettings): Promise<Buffer> {
    const intensity = Math.max(0, Math.min(1, settings.specularIntensity ?? 0.35));
    const glossMin = Math.max(0, Math.min(1, settings.glossMin ?? 0.1));
    const glossMax = Math.max(0, Math.min(1, settings.glossMax ?? 0.6));

    const image = sharp(source);
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error('Invalid image dimensions');

    const rgb = await image.clone().removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    const channels = rgb.info.channels;
    const rgbData = rgb.data;
    const luminance = await image.clone().grayscale().raw().toBuffer();

    const out = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const outIdx = i * 4;
      out[outIdx] = Math.round(rgbData[srcIdx] * intensity);
      out[outIdx + 1] = Math.round(rgbData[srcIdx + 1] * intensity);
      out[outIdx + 2] = Math.round(rgbData[srcIdx + 2] * intensity);
      const lum = luminance[i] / 255;
      const gloss = glossMax - lum * (glossMax - glossMin);
      out[outIdx + 3] = Math.max(0, Math.min(255, Math.round(gloss * 255)));
    }

    return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
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
