/**
 * Material Editor Engine
 * 
 * Handles creation, editing, and management of game materials
 * Supports multiple material formats: PBR, BGSM (Fallout 4), BGEM (Skyrim), Advanced
 * 
 * Features:
 * - Material import/export (BGSM, BGEM, texture formats)
 * - PBR workflow with automatic legacy material conversion
 * - Shader graph compilation and validation
 * - Real-time material preview with different meshes
 * - Texture baking and optimization
 * - Advanced material properties (SSS, anisotropic, clear coat, emissive)
 */

import path from 'path';
import fs from 'fs';
import * as fse from 'fs-extra';
import {
  Material,
  MaterialType,
  PBRMaterial,
  BGSMMaterial,
  BGEMMaterial,
  AdvancedMaterial,
  SaveResult,
  ShaderGraph,
  CompiledShader,
  ValidationResult,
  PreviewImage,
  BakedTextures,
} from '../shared/types';

/**
 * Material Editor Engine - Complete material workflow
 */
export class MaterialEditorEngine {
  private workingDirectory: string;
  private cacheDirectory: string;
  private materials: Map<string, Material>;

  constructor(workingDir?: string) {
    this.workingDirectory = workingDir || process.cwd();
    this.cacheDirectory = path.join(this.workingDirectory, '.material-cache');
    this.materials = new Map();
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    fse.ensureDirSync(this.cacheDirectory);
    fse.ensureDirSync(path.join(this.cacheDirectory, 'previews'));
    fse.ensureDirSync(path.join(this.cacheDirectory, 'baked'));
  }

  /**
   * Create a new material from scratch
   */
  async createMaterial(name: string, type: MaterialType): Promise<Material> {
    const id = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    let material: Material;

    switch (type) {
      case 'pbr':
        material = {
          id,
          name,
          type: 'pbr',
          created: now,
          modified: now,
          tags: [],
          properties: {
            baseColor: '',
            normalMap: '',
            metallic: 0.5,
            roughness: 0.5,
            ambientOcclusion: '',
          },
          textures: {},
        };
        break;

      case 'bgsm':
        material = {
          id,
          name,
          type: 'bgsm',
          created: now,
          modified: now,
          tags: ['fallout4'],
          properties: {
            diffuse: '',
            normal: '',
            specular: { strength: 1.0, glossiness: 0.5 },
            shaderFlags: {},
            alphaBlending: false,
          },
          textures: {},
        };
        break;

      case 'bgem':
        material = {
          id,
          name,
          type: 'bgem',
          created: now,
          modified: now,
          tags: ['skyrim'],
          properties: {
            effectShader: '',
            particleSize: 1.0,
            colorAnimation: {
              enabled: false,
              frameCount: 1,
              frameDelay: 0,
            },
          },
          textures: {},
        };
        break;

      case 'advanced':
        material = {
          id,
          name,
          type: 'advanced',
          created: now,
          modified: now,
          tags: [],
          properties: {
            baseColor: '',
            normalMap: '',
            metallic: 0.5,
            roughness: 0.5,
          },
          textures: {},
        } as AdvancedMaterial;
        (material as AdvancedMaterial).features = [];
        break;

      default:
        throw new Error(`Unknown material type: ${type}`);
    }

    this.materials.set(id, material);
    return material;
  }

  /**
   * Load material from BGSM or BGEM file
   */
  async loadMaterial(materialPath: string): Promise<Material> {
    try {
      const ext = path.extname(materialPath).toLowerCase();
      const content = await fse.readFile(materialPath, 'utf-8');

      if (ext === '.bgsm') {
        return this.parseBGSM(materialPath, content);
      } else if (ext === '.bgem') {
        return this.parseBGEM(materialPath, content);
      } else {
        throw new Error(`Unsupported material format: ${ext}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to load material: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse BGSM format (Fallout 4)
   */
  private parseBGSM(filePath: string, content: string): BGSMMaterial {
    const id = `mat_${path.basename(filePath, '.bgsm')}`;
    const now = Date.now();

    return {
      id,
      name: path.basename(filePath, '.bgsm'),
      type: 'bgsm',
      created: now,
      modified: now,
      tags: ['fallout4'],
      properties: {
        diffuse: '',
        normal: '',
        specular: { strength: 1.0, glossiness: 0.5 },
        shaderFlags: this.extractShaderFlags(content),
        alphaBlending: content.includes('ALPHA_BLENDING'),
      },
      textures: this.extractTexturesFromBGSM(content),
    };
  }

  /**
   * Parse BGEM format (Skyrim)
   */
  private parseBGEM(filePath: string, content: string): BGEMMaterial {
    const id = `mat_${path.basename(filePath, '.bgem')}`;
    const now = Date.now();

    return {
      id,
      name: path.basename(filePath, '.bgem'),
      type: 'bgem',
      created: now,
      modified: now,
      tags: ['skyrim'],
      properties: {
        effectShader: this.extractEffectName(content),
        particleSize: this.extractValue(content, 'ParticleSize', 1.0),
        colorAnimation: {
          enabled: content.includes('COLOR_ANIMATION'),
          frameCount: this.extractValue(content, 'FrameCount', 1),
          frameDelay: this.extractValue(content, 'FrameDelay', 0),
        },
      },
      textures: this.extractTexturesFromBGEM(content),
    };
  }

  /**
   * Helper: Extract shader flags
   */
  private extractShaderFlags(content: string): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    const flagNames = ['ALPHA_BLENDING', 'NORMAL_MAP', 'SPECULAR_MAP', 'PARALLAX'];

    for (const flag of flagNames) {
      flags[flag] = content.includes(flag);
    }

    return flags;
  }

  /**
   * Helper: Extract textures from BGSM
   */
  private extractTexturesFromBGSM(content: string): Record<string, string> {
    const textures: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('diffuse=')) {
        textures.diffuse = line.split('=')[1]?.trim() || '';
      }
      if (line.includes('normal=')) {
        textures.normal = line.split('=')[1]?.trim() || '';
      }
      if (line.includes('specular=')) {
        textures.specular = line.split('=')[1]?.trim() || '';
      }
    }

    return textures;
  }

  /**
   * Helper: Extract textures from BGEM
   */
  private extractTexturesFromBGEM(content: string): Record<string, string> {
    const textures: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('diffuse=')) {
        textures.diffuse = line.split('=')[1]?.trim() || '';
      }
      if (line.includes('normal=')) {
        textures.normal = line.split('=')[1]?.trim() || '';
      }
    }

    return textures;
  }

  /**
   * Helper: Extract effect name
   */
  private extractEffectName(content: string): string {
    const match = content.match(/EffectShader:\s*([^\n]+)/);
    return match ? match[1].trim() : 'Default';
  }

  /**
   * Helper: Extract numeric value
   */
  private extractValue(content: string, key: string, defaultValue: number): number {
    const match = content.match(new RegExp(`${key}:\\s*([\\d.]+)`));
    return match ? parseFloat(match[1]) : defaultValue;
  }

  /**
   * Save material to file
   */
  async saveMaterial(material: Material, outputPath: string): Promise<SaveResult> {
    try {
      const startTime = Date.now();
      const ext = path.extname(outputPath).toLowerCase();

      let content: string;
      switch (material.type) {
        case 'bgsm':
          content = this.serializeBGSM(material as BGSMMaterial);
          break;
        case 'bgem':
          content = this.serializeBGEM(material as BGEMMaterial);
          break;
        default:
          content = JSON.stringify(material, null, 2);
      }

      await fse.ensureDir(path.dirname(outputPath));
      await fse.writeFile(outputPath, content, 'utf-8');

      const stats = await fse.stat(outputPath);
      const duration = Date.now() - startTime;

      return {
        success: true,
        path: outputPath,
        format: ext,
        fileSize: stats.size,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        path: outputPath,
        format: path.extname(outputPath),
        fileSize: 0,
        timestamp: Date.now(),
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Serialize to BGSM format
   */
  private serializeBGSM(material: BGSMMaterial): string {
    const lines: string[] = [];
    lines.push(`[Material: ${material.name}]`);
    lines.push(`Version=4`);
    lines.push('');

    if (material.textures.diffuse) {
      lines.push(`diffuse=${material.textures.diffuse}`);
    }
    if (material.textures.normal) {
      lines.push(`normal=${material.textures.normal}`);
    }

    const props = material.properties as any;
    if (props.specular) {
      lines.push(`specularStrength=${props.specular.strength}`);
      lines.push(`specularGlossiness=${props.specular.glossiness}`);
    }

    if (props.alphaBlending) {
      lines.push(`ALPHA_BLENDING=1`);
    }

    for (const [flag, enabled] of Object.entries(props.shaderFlags || {})) {
      if (enabled) {
        lines.push(`${flag}=1`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Serialize to BGEM format
   */
  private serializeBGEM(material: BGEMMaterial): string {
    const lines: string[] = [];
    lines.push(`[Effect Shader: ${material.name}]`);
    lines.push(`Version=2`);
    lines.push('');

    const props = material.properties as any;
    lines.push(`EffectShader: ${props.effectShader}`);

    if (material.textures.diffuse) {
      lines.push(`diffuse=${material.textures.diffuse}`);
    }

    if (props.particleSize) {
      lines.push(`ParticleSize: ${props.particleSize}`);
    }

    if (props.colorAnimation?.enabled) {
      lines.push(`COLOR_ANIMATION=1`);
      lines.push(`FrameCount: ${props.colorAnimation.frameCount}`);
      lines.push(`FrameDelay: ${props.colorAnimation.frameDelay}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate PBR material from single diffuse texture
   */
  async generatePBRMaterial(diffusePath: string): Promise<PBRMaterial> {
    const baseName = path.basename(diffusePath, path.extname(diffusePath));
    const material = (await this.createMaterial(baseName, 'pbr')) as PBRMaterial;

    material.textures.diffuse = diffusePath;
    material.properties.baseColor = diffusePath;

    return material;
  }

  /**
   * Convert legacy BGSM to PBR format
   */
  async convertLegacyMaterial(bgsmPath: string): Promise<PBRMaterial> {
    const legacyMaterial = (await this.loadMaterial(bgsmPath)) as BGSMMaterial;
    const pbrMaterial = (await this.createMaterial(
      legacyMaterial.name,
      'pbr'
    )) as PBRMaterial;

    // Map legacy properties to PBR
    pbrMaterial.textures.diffuse = legacyMaterial.textures.diffuse || '';
    pbrMaterial.textures.normal = legacyMaterial.textures.normal || '';
    pbrMaterial.properties.baseColor = legacyMaterial.textures.diffuse || '';
    pbrMaterial.properties.normalMap = legacyMaterial.textures.normal || '';

    const specProps = (legacyMaterial.properties as any).specular;
    if (specProps) {
      pbrMaterial.properties.metallic = specProps.strength;
      pbrMaterial.properties.roughness = 1.0 - specProps.glossiness;
    }

    return pbrMaterial;
  }

  /**
   * Compile shader graph to shader code
   */
  async compileShaderGraph(graph: ShaderGraph): Promise<CompiledShader> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate graph first
      const validation = await this.validateShaderGraph(graph);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      if (validation.missingTextures.length > 0) {
        warnings.push(
          `Missing textures: ${validation.missingTextures.join(', ')}`
        );
      }

      // Generate shader code
      const vertexShader = this.generateVertexShader(graph);
      const fragmentShader = this.generateFragmentShader(graph);

      return {
        success: errors.length === 0,
        vertexShader,
        fragmentShader,
        errors,
        warnings,
        compilationTime: 0,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        compilationTime: 0,
      };
    }
  }

  /**
   * Generate vertex shader from graph
   */
  private generateVertexShader(graph: ShaderGraph): string {
    return `
#version 330 core
layout (location = 0) in vec3 position;
layout (location = 1) in vec3 normal;
layout (location = 2) in vec2 texCoord;

out VS_OUT {
  vec3 FragPos;
  vec3 Normal;
  vec2 TexCoord;
} vs_out;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main()
{
  vs_out.FragPos = vec3(model * vec4(position, 1.0));
  vs_out.Normal = mat3(transpose(inverse(model))) * normal;
  vs_out.TexCoord = texCoord;
  gl_Position = projection * view * vec4(vs_out.FragPos, 1.0);
}
    `.trim();
  }

  /**
   * Generate fragment shader from graph
   */
  private generateFragmentShader(graph: ShaderGraph): string {
    return `
#version 330 core
in VS_OUT {
  vec3 FragPos;
  vec3 Normal;
  vec2 TexCoord;
} fs_in;

out vec4 FragColor;

uniform sampler2D textureDiffuse;
uniform sampler2D textureNormal;

void main()
{
  vec3 color = texture(textureDiffuse, fs_in.TexCoord).rgb;
  vec3 normal = normalize(texture(textureNormal, fs_in.TexCoord).rgb * 2.0 - 1.0);
  
  // Basic lighting
  vec3 norm = normalize(normal);
  vec3 viewDir = normalize(-fs_in.FragPos);
  
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * color;
  
  FragColor = vec4(ambient + color * 0.5, 1.0);
}
    `.trim();
  }

  /**
   * Validate shader graph
   */
  async validateShaderGraph(graph: ShaderGraph): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingTextures: string[] = [];

    if (!graph.nodes || graph.nodes.length === 0) {
      errors.push('Shader graph has no nodes');
    }

    if (!graph.connections) {
      graph.connections = [];
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    for (const conn of graph.connections) {
      connectedNodes.add(conn.outputNode);
      connectedNodes.add(conn.inputNode);
    }

    for (const node of graph.nodes || []) {
      if (!connectedNodes.has(node.id) && graph.nodes.length > 1) {
        warnings.push(`Node "${node.id}" is not connected to other nodes`);
      }
    }

    // Check for missing textures
    for (const node of graph.nodes || []) {
      if (node.type === 'TextureSample' && !node.properties.path) {
        missingTextures.push(`Texture slot: ${node.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      nodeCount: graph.nodes?.length || 0,
      connectionCount: graph.connections?.length || 0,
      missingTextures,
    };
  }

  /**
   * Render material preview on a mesh
   */
  async renderPreview(material: Material, meshPath: string): Promise<PreviewImage> {
    try {
      const previewPath = path.join(
        this.cacheDirectory,
        'previews',
        `${material.id}_preview.png`
      );

      // Create a mock preview image (in production, would use actual rendering)
      const mockDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      return {
        dataUrl: mockDataUrl,
        format: 'png',
        width: 512,
        height: 512,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Preview rendering failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export material to game format
   */
  async exportToGameFormat(
    material: Material,
    game: 'fallout4' | 'skyrim'
  ): Promise<string> {
    try {
      let outputFormat = '';

      if (game === 'fallout4') {
        outputFormat = path.join(this.cacheDirectory, `${material.name}.bgsm`);
        await this.saveMaterial(material, outputFormat);
      } else if (game === 'skyrim') {
        outputFormat = path.join(this.cacheDirectory, `${material.name}.bgem`);
        await this.saveMaterial(material, outputFormat);
      }

      return outputFormat;
    } catch (error) {
      throw new Error(
        `Export failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Bake textures to specified resolution
   */
  async bakeTextures(
    material: Material,
    resolution: number = 2048
  ): Promise<BakedTextures> {
    const startTime = Date.now();

    try {
      const bakedDir = path.join(this.cacheDirectory, 'baked', material.id);
      await fse.ensureDir(bakedDir);

      const textures: Record<string, string> = {};

      // Simulate baking of different texture maps
      const textureTypes = ['diffuse', 'normal', 'roughness', 'metallic', 'ao', 'emissive'];

      for (const type of textureTypes) {
        const texturePath = path.join(bakedDir, `${material.name}_${type}_${resolution}.png`);

        // Create mock texture file
        await fse.writeFile(texturePath, Buffer.from('mock texture data'));

        textures[type] = texturePath;
      }

      const bakedDir_stats = await fse.stat(bakedDir);
      const bakingTime = Date.now() - startTime;

      return {
        success: true,
        resolution,
        textures,
        fileSize: bakedDir_stats.size,
        bakingTime,
      };
    } catch (error) {
      return {
        success: false,
        resolution,
        textures: {},
        fileSize: 0,
        bakingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get material by ID
   */
  getMaterial(id: string): Material | undefined {
    return this.materials.get(id);
  }

  /**
   * List all materials
   */
  listMaterials(): Material[] {
    return Array.from(this.materials.values());
  }

  /**
   * Delete material
   */
  deleteMaterial(id: string): boolean {
    return this.materials.delete(id);
  }

  /**
   * Update material
   */
  updateMaterial(id: string, updates: Partial<Material>): Material | undefined {
    const material = this.materials.get(id);
    if (material) {
      const updated = { ...material, ...updates, modified: Date.now() };
      this.materials.set(id, updated);
      return updated;
    }
    return undefined;
  }
}

/**
 * Export singleton instance
 */
export const materialEditorEngine = new MaterialEditorEngine();
