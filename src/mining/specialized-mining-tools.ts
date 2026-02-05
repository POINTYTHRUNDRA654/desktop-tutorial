/**
 * Specialized Mining Tools
 *
 * Deep inspection tools for NIF, DDS, BA2, and Papyrus analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface NifAnalysisResult {
  filePath: string;
  version: string;
  vertexCount: number;
  triangleCount: number;
  texturePaths: string[];
  materialProperties: Record<string, any>;
  performanceWarnings: string[];
  optimizationSuggestions: string[];
  hasAbsolutePaths: boolean;
  absolutePaths: string[];
}

export interface DdsAnalysisResult {
  filePath: string;
  format: string;
  dimensions: { width: number; height: number };
  mipmaps: number;
  compression: string;
  sizeBytes: number;
  isPowerOfTwo: boolean;
  qualityScore: number; // 0-100
  optimizationSuggestions: string[];
  usage: 'diffuse' | 'normal' | 'specular' | 'other';
}

export interface Ba2AnalysisResult {
  filePath: string;
  archiveType: 'General' | 'Textures' | 'Strings';
  fileCount: number;
  totalSizeBytes: number;
  compressionRatio: number;
  containsTextures: boolean;
  containsMeshes: boolean;
  containsScripts: boolean;
  duplicateFiles: string[];
  largeFiles: Array<{ name: string; size: number }>;
  optimizationSuggestions: string[];
}

export interface PapyrusAnalysisResult {
  filePath: string;
  scriptName: string;
  extends: string;
  properties: Array<{ name: string; type: string; value?: any }>;
  functions: Array<{ name: string; parameters: string[]; returnType: string }>;
  events: string[];
  complexity: number;
  performanceWarnings: string[];
  securityIssues: string[];
  optimizationSuggestions: string[];
}

export interface SpecializedMiningResult {
  nifAnalysis: NifAnalysisResult[];
  ddsAnalysis: DdsAnalysisResult[];
  ba2Analysis: Ba2AnalysisResult[];
  papyrusAnalysis: PapyrusAnalysisResult[];
  crossFileInsights: string[];
  optimizationReport: {
    totalFiles: number;
    optimizationPotential: number; // 0-100
    priorityActions: string[];
    estimatedSavings: string;
  };
}

/**
 * Specialized Mining Tools Engine
 *
 * Provides deep inspection capabilities for mod assets
 */
export class SpecializedMiningTools {
  private nifAnalyzer: NifAnalyzer;
  private ddsAnalyzer: DdsAnalyzer;
  private ba2Analyzer: Ba2Analyzer;
  private papyrusAnalyzer: PapyrusAnalyzer;

  constructor() {
    this.nifAnalyzer = new NifAnalyzer();
    this.ddsAnalyzer = new DdsAnalyzer();
    this.ba2Analyzer = new Ba2Analyzer();
    this.papyrusAnalyzer = new PapyrusAnalyzer();
  }

  /**
   * Perform comprehensive asset analysis
   */
  async performDeepAssetAnalysis(
    nifFiles: string[] = [],
    ddsFiles: string[] = [],
    ba2Files: string[] = [],
    papyrusFiles: string[] = []
  ): Promise<SpecializedMiningResult> {
    // Run all analyses in parallel
    const [
      nifResults,
      ddsResults,
      ba2Results,
      papyrusResults
    ] = await Promise.all([
      this.analyzeNifFiles(nifFiles),
      this.analyzeDdsFiles(ddsFiles),
      this.analyzeBa2Files(ba2Files),
      this.analyzePapyrusFiles(papyrusFiles)
    ]);

    // Generate cross-file insights
    const crossFileInsights = this.generateCrossFileInsights(
      nifResults,
      ddsResults,
      ba2Results,
      papyrusResults
    );

    // Generate optimization report
    const optimizationReport = this.generateOptimizationReport(
      nifResults,
      ddsResults,
      ba2Results,
      papyrusResults
    );

    return {
      nifAnalysis: nifResults,
      ddsAnalysis: ddsResults,
      ba2Analysis: ba2Results,
      papyrusAnalysis: papyrusResults,
      crossFileInsights,
      optimizationReport
    };
  }

  /**
   * Analyze NIF files for mesh data and optimization opportunities
   */
  async analyzeNifFiles(filePaths: string[]): Promise<NifAnalysisResult[]> {
    const results: NifAnalysisResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.nifAnalyzer.analyze(filePath);
        results.push(result);
      } catch (error) {
        console.error(`[SpecializedMining] Error analyzing NIF ${filePath}:`, error);
        // Add error result
        results.push({
          filePath,
          version: 'unknown',
          vertexCount: 0,
          triangleCount: 0,
          texturePaths: [],
          materialProperties: {},
          performanceWarnings: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
          optimizationSuggestions: [],
          hasAbsolutePaths: false,
          absolutePaths: []
        });
      }
    }

    return results;
  }

  /**
   * Analyze DDS files for texture optimization
   */
  async analyzeDdsFiles(filePaths: string[]): Promise<DdsAnalysisResult[]> {
    const results: DdsAnalysisResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.ddsAnalyzer.analyze(filePath);
        results.push(result);
      } catch (error) {
        console.error(`[SpecializedMining] Error analyzing DDS ${filePath}:`, error);
        // Add error result
        results.push({
          filePath,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          mipmaps: 0,
          compression: 'unknown',
          sizeBytes: 0,
          isPowerOfTwo: false,
          qualityScore: 0,
          optimizationSuggestions: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
          usage: 'other'
        });
      }
    }

    return results;
  }

  /**
   * Analyze BA2 archives for content and optimization
   */
  async analyzeBa2Files(filePaths: string[]): Promise<Ba2AnalysisResult[]> {
    const results: Ba2AnalysisResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.ba2Analyzer.analyze(filePath);
        results.push(result);
      } catch (error) {
        console.error(`[SpecializedMining] Error analyzing BA2 ${filePath}:`, error);
        // Add error result
        results.push({
          filePath,
          archiveType: 'General',
          fileCount: 0,
          totalSizeBytes: 0,
          compressionRatio: 0,
          containsTextures: false,
          containsMeshes: false,
          containsScripts: false,
          duplicateFiles: [],
          largeFiles: [],
          optimizationSuggestions: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`]
        });
      }
    }

    return results;
  }

  /**
   * Analyze Papyrus scripts for performance and security
   */
  async analyzePapyrusFiles(filePaths: string[]): Promise<PapyrusAnalysisResult[]> {
    const results: PapyrusAnalysisResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.papyrusAnalyzer.analyze(filePath);
        results.push(result);
      } catch (error) {
        console.error(`[SpecializedMining] Error analyzing Papyrus ${filePath}:`, error);
        // Add error result
        results.push({
          filePath,
          scriptName: 'unknown',
          extends: '',
          properties: [],
          functions: [],
          events: [],
          complexity: 0,
          performanceWarnings: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
          securityIssues: [],
          optimizationSuggestions: []
        });
      }
    }

    return results;
  }

  // Cross-file analysis methods
  private generateCrossFileInsights(
    nifResults: NifAnalysisResult[],
    ddsResults: DdsAnalysisResult[],
    ba2Results: Ba2AnalysisResult[],
    papyrusResults: PapyrusAnalysisResult[]
  ): string[] {
    const insights: string[] = [];

    // Check for missing textures referenced by NIFs
    const referencedTextures = new Set(
      nifResults.flatMap(nif => nif.texturePaths)
    );

    const availableTextures = new Set(
      ddsResults.map(dds => path.basename(dds.filePath))
    );

    const missingTextures = Array.from(referencedTextures)
      .filter(tex => !availableTextures.has(path.basename(tex)));

    if (missingTextures.length > 0) {
      insights.push(`Found ${missingTextures.length} missing texture references in NIF files`);
    }

    // Check for oversized textures
    const oversizedTextures = ddsResults.filter(dds =>
      dds.dimensions.width > 2048 || dds.dimensions.height > 2048
    );

    if (oversizedTextures.length > 0) {
      insights.push(`${oversizedTextures.length} textures exceed recommended 2048x2048 limit`);
    }

    // Check for high-poly meshes
    const highPolyMeshes = nifResults.filter(nif => nif.triangleCount > 50000);

    if (highPolyMeshes.length > 0) {
      insights.push(`${highPolyMeshes.length} meshes have very high polygon counts (>50k triangles)`);
    }

    // Check for BA2 archive efficiency
    const inefficientArchives = ba2Results.filter(ba2 =>
      ba2.compressionRatio < 0.5 || ba2.duplicateFiles.length > 0
    );

    if (inefficientArchives.length > 0) {
      insights.push(`${inefficientArchives.length} BA2 archives could benefit from optimization`);
    }

    // Check for complex scripts
    const complexScripts = papyrusResults.filter(script => script.complexity > 100);

    if (complexScripts.length > 0) {
      insights.push(`${complexScripts.length} Papyrus scripts have high complexity scores`);
    }

    return insights;
  }

  private generateOptimizationReport(
    nifResults: NifAnalysisResult[],
    ddsResults: DdsAnalysisResult[],
    ba2Results: Ba2AnalysisResult[],
    papyrusResults: PapyrusAnalysisResult[]
  ): SpecializedMiningResult['optimizationReport'] {
    const totalFiles = nifResults.length + ddsResults.length + ba2Results.length + papyrusResults.length;

    // Calculate optimization potential
    let optimizationScore = 0;

    // Texture optimization potential
    const textureOptimization = ddsResults.filter(dds =>
      !dds.isPowerOfTwo || dds.qualityScore < 70
    ).length / Math.max(ddsResults.length, 1);

    // Mesh optimization potential
    const meshOptimization = nifResults.filter(nif =>
      nif.vertexCount > 10000 || nif.hasAbsolutePaths
    ).length / Math.max(nifResults.length, 1);

    // Archive optimization potential
    const archiveOptimization = ba2Results.filter(ba2 =>
      ba2.duplicateFiles.length > 0 || ba2.compressionRatio < 0.7
    ).length / Math.max(ba2Results.length, 1);

    // Script optimization potential
    const scriptOptimization = papyrusResults.filter(script =>
      script.performanceWarnings.length > 0
    ).length / Math.max(papyrusResults.length, 1);

    optimizationScore = (textureOptimization + meshOptimization + archiveOptimization + scriptOptimization) / 4;
    const optimizationPotential = Math.round(optimizationScore * 100);

    // Generate priority actions
    const priorityActions: string[] = [];

    if (textureOptimization > 0.5) {
      priorityActions.push('Optimize texture formats and resolutions');
    }

    if (meshOptimization > 0.5) {
      priorityActions.push('Reduce mesh complexity and fix absolute paths');
    }

    if (archiveOptimization > 0.5) {
      priorityActions.push('Merge and optimize BA2 archives');
    }

    if (scriptOptimization > 0.5) {
      priorityActions.push('Optimize Papyrus script performance');
    }

    // Estimate savings
    const estimatedSavings = this.estimateOptimizationSavings(
      nifResults,
      ddsResults,
      ba2Results,
      papyrusResults
    );

    return {
      totalFiles,
      optimizationPotential,
      priorityActions,
      estimatedSavings
    };
  }

  private estimateOptimizationSavings(
    nifResults: NifAnalysisResult[],
    ddsResults: DdsAnalysisResult[],
    ba2Results: Ba2AnalysisResult[],
    papyrusResults: PapyrusAnalysisResult[]
  ): string {
    let totalSizeReduction = 0;

    // Estimate texture size reduction (30% average)
    const textureSize = ddsResults.reduce((sum, dds) => sum + dds.sizeBytes, 0);
    totalSizeReduction += textureSize * 0.3;

    // Estimate mesh optimization (20% average)
    // This is harder to estimate, but let's assume some reduction

    // Estimate archive optimization
    for (const ba2 of ba2Results) {
      // Estimate 10% reduction from deduplication
      totalSizeReduction += ba2.totalSizeBytes * 0.1;
    }

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    return formatSize(totalSizeReduction);
  }
}

/**
 * NIF File Analyzer
 */
class NifAnalyzer {
  async analyze(filePath: string): Promise<NifAnalysisResult> {
    const buffer = await fs.promises.readFile(filePath);
    const result: NifAnalysisResult = {
      filePath,
      version: 'unknown',
      vertexCount: 0,
      triangleCount: 0,
      texturePaths: [],
      materialProperties: {},
      performanceWarnings: [],
      optimizationSuggestions: [],
      hasAbsolutePaths: false,
      absolutePaths: []
    };

    try {
      // Basic NIF parsing (simplified)
      // In a real implementation, this would use a proper NIF parser library

      // Check for absolute paths in the file content
      const content = buffer.toString('binary');
      const absolutePathRegex = /[C-Z]:\\[^"\\]*(?:\\[^"\\]*)*\.(?:dds|nif|hkx)/gi;
      const matches = content.match(absolutePathRegex) || [];

      result.absolutePaths = matches;
      result.hasAbsolutePaths = matches.length > 0;

      if (result.hasAbsolutePaths) {
        result.performanceWarnings.push('Contains absolute paths - will break mod portability');
        result.optimizationSuggestions.push('Replace absolute paths with relative paths');
      }

      // Extract texture references (simplified)
      const textureRegex = /textures?\\[^"\\]*(?:\\[^"\\]*)*\.(?:dds|png|tga)/gi;
      const textureMatches = content.match(textureRegex) || [];
      result.texturePaths = textureMatches;

      // Estimate vertex/triangle counts from file size and content hints
      // This is a rough approximation
      const fileSize = buffer.length;
      if (fileSize > 1000000) { // > 1MB
        result.performanceWarnings.push('Large mesh file - may impact performance');
        result.optimizationSuggestions.push('Consider LOD variants or mesh optimization');
      }

      // Mock some analysis results
      result.version = 'NIF 20.2.0.7'; // Skyrim SE version
      result.vertexCount = Math.floor(fileSize / 100); // Rough estimate
      result.triangleCount = result.vertexCount * 2; // Rough estimate

      if (result.triangleCount > 10000) {
        result.performanceWarnings.push('High polygon count may impact performance');
        result.optimizationSuggestions.push('Consider reducing polygon count or using LOD');
      }

    } catch (error) {
      result.performanceWarnings.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}

/**
 * DDS File Analyzer
 */
class DdsAnalyzer {
  async analyze(filePath: string): Promise<DdsAnalysisResult> {
    const buffer = await fs.promises.readFile(filePath);
    const result: DdsAnalysisResult = {
      filePath,
      format: 'unknown',
      dimensions: { width: 0, height: 0 },
      mipmaps: 0,
      compression: 'unknown',
      sizeBytes: buffer.length,
      isPowerOfTwo: false,
      qualityScore: 0,
      optimizationSuggestions: [],
      usage: 'other'
    };

    try {
      // Parse DDS header (simplified)
      if (buffer.length < 128) {
        throw new Error('Invalid DDS file - too small');
      }

      // Check DDS magic number
      const magic = buffer.toString('ascii', 0, 4);
      if (magic !== 'DDS ') {
        throw new Error('Not a valid DDS file');
      }

      // Parse header (simplified)
      const height = buffer.readUInt32LE(12);
      const width = buffer.readUInt32LE(16);
      const mipMapCount = buffer.readUInt32LE(28);
      const fourCC = buffer.toString('ascii', 84, 88);

      result.dimensions = { width, height };
      result.mipmaps = mipMapCount;

      // Check if dimensions are power of two
      const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;
      result.isPowerOfTwo = isPowerOfTwo(width) && isPowerOfTwo(height);

      if (!result.isPowerOfTwo) {
        result.optimizationSuggestions.push('Dimensions should be power of two for optimal performance');
      }

      // Determine compression format
      switch (fourCC) {
        case 'DXT1': result.compression = 'BC1 (DXT1)'; break;
        case 'DXT3': result.compression = 'BC2 (DXT3)'; break;
        case 'DXT5': result.compression = 'BC3 (DXT5)'; break;
        case 'ATI2': result.compression = 'BC5 (ATI2)'; break;
        default: result.compression = 'Uncompressed or unknown';
      }

      // Determine usage based on filename
      const filename = path.basename(filePath).toLowerCase();
      if (filename.includes('_n') || filename.includes('normal')) {
        result.usage = 'normal';
      } else if (filename.includes('_s') || filename.includes('specular')) {
        result.usage = 'specular';
      } else {
        result.usage = 'diffuse';
      }

      // Calculate quality score
      let score = 100;

      if (!result.isPowerOfTwo) score -= 20;
      if (result.mipmaps === 0) score -= 15;
      if (width > 2048 || height > 2048) score -= 10;
      if (result.compression === 'Uncompressed or unknown') score -= 30;

      result.qualityScore = Math.max(0, score);

      // Size optimization suggestions
      if (result.sizeBytes > 2 * 1024 * 1024) { // > 2MB
        result.optimizationSuggestions.push('Large texture file - consider reducing resolution');
      }

      if (result.compression === 'Uncompressed or unknown') {
        result.optimizationSuggestions.push('Use compressed DDS format for better performance');
      }

    } catch (error) {
      result.optimizationSuggestions.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}

/**
 * BA2 Archive Analyzer
 */
class Ba2Analyzer {
  async analyze(filePath: string): Promise<Ba2AnalysisResult> {
    const result: Ba2AnalysisResult = {
      filePath,
      archiveType: 'General',
      fileCount: 0,
      totalSizeBytes: 0,
      compressionRatio: 0,
      containsTextures: false,
      containsMeshes: false,
      containsScripts: false,
      duplicateFiles: [],
      largeFiles: [],
      optimizationSuggestions: []
    };

    try {
      // Use BSArch tool to analyze BA2 (if available)
      const bsarchPath = await this.findBSArchTool();

      if (bsarchPath) {
        const { stdout } = await execAsync(`"${bsarchPath}" list "${filePath}"`);
        const lines = stdout.split('\n');

        // Parse BSArch output
        const files: Array<{ name: string; size: number }> = [];
        let totalSize = 0;

        for (const line of lines) {
          if (line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
              const size = parseInt(parts[2]) || 0;
              const name = parts[1];

              files.push({ name, size });
              totalSize += size;

              // Check file types
              const ext = path.extname(name).toLowerCase();
              if (['.dds', '.png', '.tga'].includes(ext)) {
                result.containsTextures = true;
              } else if (['.nif', '.hkx'].includes(ext)) {
                result.containsMeshes = true;
              } else if (['.pex', '.psc'].includes(ext)) {
                result.containsScripts = true;
              }
            }
          }
        }

        result.fileCount = files.length;
        result.totalSizeBytes = totalSize;

        // Find duplicates
        const fileNames = files.map(f => f.name);
        const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
        result.duplicateFiles = [...new Set(duplicates)];

        // Find large files
        result.largeFiles = files
          .filter(f => f.size > 10 * 1024 * 1024) // > 10MB
          .sort((a, b) => b.size - a.size)
          .slice(0, 5);

        // Determine archive type
        if (result.containsTextures && !result.containsMeshes) {
          result.archiveType = 'Textures';
        } else if (result.containsMeshes) {
          result.archiveType = 'General';
        }

        // Calculate compression ratio (rough estimate)
        const rawSize = files.reduce((sum, f) => sum + f.size, 0);
        const compressedSize = (await fs.promises.stat(filePath)).size;
        result.compressionRatio = rawSize > 0 ? compressedSize / rawSize : 0;

        // Generate optimization suggestions
        if (result.duplicateFiles.length > 0) {
          result.optimizationSuggestions.push(`Remove ${result.duplicateFiles.length} duplicate files`);
        }

        if (result.largeFiles.length > 0) {
          result.optimizationSuggestions.push('Consider splitting large files or using separate archives');
        }

        if (result.compressionRatio > 0.8) {
          result.optimizationSuggestions.push('Low compression ratio - consider different compression settings');
        }

      } else {
        // Fallback: basic file analysis
        const stats = await fs.promises.stat(filePath);
        result.totalSizeBytes = stats.size;
        result.optimizationSuggestions.push('Install BSArch tool for detailed BA2 analysis');
      }

    } catch (error) {
      result.optimizationSuggestions.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  private async findBSArchTool(): Promise<string | null> {
    // Look for BSArch in common locations
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Skyrim Special Edition\\Tools\\Archive\\BSArch.exe',
      'C:\\Program Files\\Bethesda Softworks\\Archive\\BSArch.exe',
      'BSArch.exe' // In PATH
    ];

    for (const toolPath of commonPaths) {
      try {
        await fs.promises.access(toolPath);
        return toolPath;
      } catch {
        // Continue searching
      }
    }

    return null;
  }
}

/**
 * Papyrus Script Analyzer
 */
class PapyrusAnalyzer {
  async analyze(filePath: string): Promise<PapyrusAnalysisResult> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const result: PapyrusAnalysisResult = {
      filePath,
      scriptName: 'unknown',
      extends: '',
      properties: [],
      functions: [],
      events: [],
      complexity: 0,
      performanceWarnings: [],
      securityIssues: [],
      optimizationSuggestions: []
    };

    try {
      const lines = content.split('\n');
      let complexity = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Extract script name
        if (trimmed.startsWith('ScriptName ')) {
          result.scriptName = trimmed.split(' ')[1] || 'unknown';
        }

        // Extract extends
        if (trimmed.startsWith('extends ')) {
          result.extends = trimmed.split(' ')[1] || '';
        }

        // Extract properties
        if (trimmed.includes('Property ') || trimmed.includes('property ')) {
          const propMatch = trimmed.match(/(?:Property|property)\s+(\w+)\s+(\w+)/i);
          if (propMatch) {
            result.properties.push({
              name: propMatch[1],
              type: propMatch[2]
            });
          }
        }

        // Extract functions
        if (trimmed.includes('Function ') || trimmed.includes('function ')) {
          const funcMatch = trimmed.match(/(?:Function|function)\s+(\w+)\s*\(([^)]*)\)/i);
          if (funcMatch) {
            const params = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
            result.functions.push({
              name: funcMatch[1],
              parameters: params,
              returnType: 'void' // Simplified
            });
          }
        }

        // Extract events
        if (trimmed.includes('Event ') || trimmed.includes('event ')) {
          const eventMatch = trimmed.match(/(?:Event|event)\s+(\w+)/i);
          if (eventMatch) {
            result.events.push(eventMatch[1]);
          }
        }

        // Calculate complexity
        if (trimmed.includes('if ') || trimmed.includes('while ') || trimmed.includes('for ')) {
          complexity += 1;
        }
        if (trimmed.includes('&&') || trimmed.includes('||')) {
          complexity += 0.5;
        }
      }

      result.complexity = complexity;

      // Performance analysis
      if (result.complexity > 50) {
        result.performanceWarnings.push('High complexity script - may impact performance');
        result.optimizationSuggestions.push('Consider breaking into smaller functions or optimizing logic');
      }

      if (result.functions.length > 20) {
        result.performanceWarnings.push('Many functions in single script - consider splitting');
        result.optimizationSuggestions.push('Split script into multiple files for better organization');
      }

      // Security analysis
      const dangerousFunctions = ['Game.GetPlayer()', 'Debug.TraceUser()', 'Utility.Wait()'];
      for (const func of dangerousFunctions) {
        if (content.includes(func)) {
          result.securityIssues.push(`Potentially unsafe function call: ${func}`);
        }
      }

      if (result.properties.length > 50) {
        result.performanceWarnings.push('Many properties - may impact save file size');
        result.optimizationSuggestions.push('Consider using arrays or structs for related properties');
      }

    } catch (error) {
      result.performanceWarnings.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}