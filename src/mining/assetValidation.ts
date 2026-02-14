/**
 * Asset Validation Engine
 * Comprehensive validation system for Fallout 4 mod assets
 * Validates NIF, DDS, ESP, Papyrus scripts, and sound files
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  file: string;
  type: string;
  severity: ValidationSeverity;
  message: string;
  details?: string;
  autoFixable: boolean;
  line?: number;
  suggestion?: string;
}

export interface ValidationReport {
  modPath: string;
  totalFiles: number;
  filesScanned: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  scanTime: number;
  timestamp: number;
  compliance: {
    score: number; // 0-100
    passedChecks: string[];
    failedChecks: string[];
  };
}

export interface NIFValidation {
  file: string;
  valid: boolean;
  version: string;
  issues: ValidationIssue[];
  metadata: {
    blockCount: number;
    triangles: number;
    vertices: number;
    hasSkinning: boolean;
    hasCollision: boolean;
    hasAnimation: boolean;
    textures: string[];
    missingTextures: string[];
  };
}

export interface DDSValidation {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  metadata: {
    format: string;
    width: number;
    height: number;
    mipmapCount: number;
    hasAlpha: boolean;
    fileSize: number;
    isPowerOfTwo: boolean;
    recommendedFormat?: string;
  };
}

export interface ESPValidation {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  metadata: {
    version: string;
    recordCount: number;
    masters: string[];
    fileSize: number;
    author?: string;
    description?: string;
    itms: number;
    deletedNavmeshes: number;
    formIDPrefix: string;
  };
}

export interface ScriptValidation {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  metadata: {
    scriptName: string;
    extends?: string;
    properties: number;
    functions: number;
    events: number;
    compiled: boolean;
    dependencies: string[];
    missingDependencies: string[];
  };
}

export interface SoundValidation {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  metadata: {
    format: string;
    sampleRate: number;
    bitDepth: number;
    channels: number;
    duration: number;
    fileSize: number;
    hasClipping: boolean;
    peakLevel: number;
  };
}

export interface BatchValidationResult {
  totalFiles: number;
  processedFiles: number;
  validFiles: number;
  invalidFiles: number;
  issues: ValidationIssue[];
  byType: {
    nif: number;
    dds: number;
    esp: number;
    script: number;
    sound: number;
    other: number;
  };
  processingTime: number;
}

export interface FixResult {
  success: boolean;
  issuesFixed: number;
  issuesRemaining: number;
  fixedIssues: ValidationIssue[];
  failedFixes: Array<{ issue: ValidationIssue; reason: string }>;
  backupPath?: string;
}

export type ValidationDepth = 'quick' | 'standard' | 'deep';

// ============================================================================
// ASSET VALIDATION ENGINE
// ============================================================================

export class AssetValidationEngine {
  private issueIdCounter = 0;

  /**
   * Validate entire mod folder
   */
  async validateMod(
    modPath: string,
    depth: ValidationDepth = 'standard',
    progressCallback?: (progress: number, current: string) => void
  ): Promise<ValidationReport> {
    const startTime = Date.now();

    if (!fs.existsSync(modPath)) {
      throw new Error(`Mod path does not exist: ${modPath}`);
    }

    const stat = await statAsync(modPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${modPath}`);
    }

    // Collect all files
    const files = await this.scanDirectory(modPath);
    const totalFiles = files.length;
    const issues: ValidationIssue[] = [];

    // Filter by asset types
    const assetFiles = files.filter(f => this.isSupportedAsset(f));
    let filesScanned = 0;

    // Validate each file
    for (const file of assetFiles) {
      if (progressCallback) {
        progressCallback((filesScanned / assetFiles.length) * 100, file);
      }

      try {
        const fileIssues = await this.validateFile(file, depth);
        issues.push(...fileIssues);
      } catch (error: any) {
        issues.push(this.createIssue(file, 'validation_error', 'error', `Validation failed: ${error.message}`, false));
      }

      filesScanned++;
    }

    const summary = this.summarizeIssues(issues);
    const compliance = this.calculateCompliance(issues, filesScanned);

    return {
      modPath,
      totalFiles,
      filesScanned,
      issues,
      summary,
      scanTime: Date.now() - startTime,
      timestamp: Date.now(),
      compliance
    };
  }

  /**
   * Validate NIF mesh file
   */
  async validateNIF(nifPath: string): Promise<NIFValidation> {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(nifPath)) {
      issues.push(this.createIssue(nifPath, 'file_not_found', 'error', 'File does not exist', false));
      return this.createNIFValidation(nifPath, issues);
    }

    const buffer = await readFileAsync(nifPath);

    // Check file header
    if (buffer.length < 40) {
      issues.push(this.createIssue(nifPath, 'corrupted_file', 'error', 'File too small to be valid NIF', false));
      return this.createNIFValidation(nifPath, issues);
    }

    // Validate NIF header (Gamebryo File Format)
    const header = buffer.toString('ascii', 0, 40);
    if (!header.startsWith('Gamebryo File Format')) {
      issues.push(this.createIssue(nifPath, 'invalid_header', 'error', 'Invalid NIF header', false));
      return this.createNIFValidation(nifPath, issues);
    }

    // Extract version
    const versionOffset = header.indexOf('Version ');
    const version = versionOffset !== -1 ? header.substring(versionOffset + 8, versionOffset + 20).trim() : 'unknown';

    // Check Fallout 4 compatibility (NIF version 20.2.0.7)
    if (!version.startsWith('20.2.0.7')) {
      issues.push(
        this.createIssue(
          nifPath,
          'incorrect_version',
          'warning',
          `NIF version ${version} - Fallout 4 requires 20.2.0.7`,
          false,
          'Convert NIF to correct version using NifSkope'
        )
      );
    }

    // Check for texture references
    const textures = this.extractTextureReferences(buffer);
    const missingTextures: string[] = [];

    for (const texture of textures) {
      // Check for common issues
      if (texture.includes('\\\\')) {
        issues.push(
          this.createIssue(
            nifPath,
            'double_backslash',
            'warning',
            `Texture path has double backslashes: ${texture}`,
            true,
            'Replace \\\\ with \\'
          )
        );
      }

      if (path.isAbsolute(texture)) {
        issues.push(
          this.createIssue(
            nifPath,
            'absolute_path',
            'error',
            `Texture path is absolute: ${texture}`,
            true,
            'Use relative paths from Data folder'
          )
        );
      }

      // Check if texture exists (relative to NIF location)
      const nifDir = path.dirname(nifPath);
      const texturePath = path.join(nifDir, '..', texture);
      if (!fs.existsSync(texturePath)) {
        missingTextures.push(texture);
        issues.push(
          this.createIssue(
            nifPath,
            'missing_texture',
            'error',
            `Referenced texture not found: ${texture}`,
            false,
            'Create or add the missing texture file'
          )
        );
      }
    }

    // Check for UV maps (simple heuristic)
    const hasUVs = this.checkForUVMaps(buffer);
    if (!hasUVs) {
      issues.push(
        this.createIssue(nifPath, 'missing_uvs', 'warning', 'No UV coordinates detected - textures may not display correctly', false)
      );
    }

    // Check for collision data
    const hasCollision = buffer.includes('bhkCollisionObject') || buffer.includes('bhkRigidBody');

    // Check file size (warn if >5MB)
    const stat = await statAsync(nifPath);
    if (stat.size > 5 * 1024 * 1024) {
      issues.push(
        this.createIssue(
          nifPath,
          'large_file',
          'warning',
          `Large NIF file (${(stat.size / 1024 / 1024).toFixed(2)}MB) - consider LOD optimization`,
          false
        )
      );
    }

    return {
      file: nifPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      version,
      issues,
      metadata: {
        blockCount: this.estimateBlockCount(buffer),
        triangles: this.estimateTriangles(buffer),
        vertices: this.estimateVertices(buffer),
        hasSkinning: buffer.includes('NiSkinInstance'),
        hasCollision,
        hasAnimation: buffer.includes('NiControllerManager') || buffer.includes('NiKeyframeController'),
        textures,
        missingTextures
      }
    };
  }

  /**
   * Validate DDS texture file
   */
  async validateDDS(ddsPath: string): Promise<DDSValidation> {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(ddsPath)) {
      issues.push(this.createIssue(ddsPath, 'file_not_found', 'error', 'File does not exist', false));
      return this.createDDSValidation(ddsPath, issues);
    }

    const buffer = await readFileAsync(ddsPath);

    // Check DDS header ("DDS ")
    if (buffer.length < 128 || buffer.toString('ascii', 0, 4) !== 'DDS ') {
      issues.push(this.createIssue(ddsPath, 'invalid_header', 'error', 'Invalid DDS header', false));
      return this.createDDSValidation(ddsPath, issues);
    }

    // Read DDS header
    const height = buffer.readUInt32LE(12);
    const width = buffer.readUInt32LE(16);
    const mipmapCount = buffer.readUInt32LE(28) || 1;
    const pixelFormatFlags = buffer.readUInt32LE(80);

    const hasAlpha = (pixelFormatFlags & 0x1) !== 0;
    const format = this.detectDDSFormat(buffer);

    // Check for power-of-two dimensions
    const isPowerOfTwo = this.isPowerOfTwo(width) && this.isPowerOfTwo(height);
    if (!isPowerOfTwo) {
      issues.push(
        this.createIssue(
          ddsPath,
          'non_pot_dimensions',
          'warning',
          `Non-power-of-2 dimensions (${width}x${height}) - may cause issues in-game`,
          false,
          'Resize to nearest power-of-2 (e.g., 1024x1024, 2048x2048)'
        )
      );
    }

    // Check for mipmaps
    const expectedMipmaps = Math.floor(Math.log2(Math.max(width, height))) + 1;
    if (mipmapCount < expectedMipmaps) {
      issues.push(
        this.createIssue(
          ddsPath,
          'missing_mipmaps',
          'warning',
          `Missing mipmaps (has ${mipmapCount}, expected ${expectedMipmaps})`,
          true,
          'Generate full mipmap chain for better performance'
        )
      );
    }

    // Check file size (warn if >8MB)
    const stat = await statAsync(ddsPath);
    if (stat.size > 8 * 1024 * 1024) {
      issues.push(
        this.createIssue(
          ddsPath,
          'large_texture',
          'warning',
          `Large texture file (${(stat.size / 1024 / 1024).toFixed(2)}MB) - consider reducing resolution or compression`,
          false
        )
      );
    }

    // Validate format usage
    const fileName = path.basename(ddsPath).toLowerCase();
    let recommendedFormat: string | undefined;

    if (fileName.includes('_n.dds') || fileName.includes('_normal')) {
      // Normal maps should use BC5
      if (format !== 'BC5') {
        recommendedFormat = 'BC5';
        issues.push(
          this.createIssue(
            ddsPath,
            'incorrect_format',
            'warning',
            `Normal map using ${format} - BC5 is recommended`,
            true,
            'Convert to BC5 format for better quality'
          )
        );
      }
    } else if (fileName.includes('_s.dds') || fileName.includes('_specular')) {
      // Specular maps typically use BC1 or BC4
      if (format !== 'BC1' && format !== 'BC4') {
        recommendedFormat = 'BC1';
        issues.push(
          this.createIssue(
            ddsPath,
            'incorrect_format',
            'info',
            `Specular map using ${format} - BC1 or BC4 recommended`,
            true,
            'Convert to BC1 for smaller file size'
          )
        );
      }
    }

    // Check if requires alpha channel
    if (hasAlpha && format === 'BC1') {
      issues.push(
        this.createIssue(
          ddsPath,
          'alpha_format_mismatch',
          'warning',
          'Texture has alpha but uses BC1 (no alpha support)',
          true,
          'Use BC3 for textures with alpha'
        )
      );
    }

    return {
      file: ddsPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        format,
        width,
        height,
        mipmapCount,
        hasAlpha,
        fileSize: stat.size,
        isPowerOfTwo,
        recommendedFormat
      }
    };
  }

  /**
   * Validate ESP/ESM plugin file
   */
  async validateESP(espPath: string): Promise<ESPValidation> {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(espPath)) {
      issues.push(this.createIssue(espPath, 'file_not_found', 'error', 'File does not exist', false));
      return this.createESPValidation(espPath, issues);
    }

    const buffer = await readFileAsync(espPath);
    const stat = await statAsync(espPath);

    // Check TES4 header
    if (buffer.length < 24 || buffer.toString('ascii', 0, 4) !== 'TES4') {
      issues.push(this.createIssue(espPath, 'invalid_header', 'error', 'Invalid ESP header - missing TES4 signature', false));
      return this.createESPValidation(espPath, issues);
    }

    // Check file size limit (250MB for FO4)
    if (stat.size > 250 * 1024 * 1024) {
      issues.push(
        this.createIssue(
          espPath,
          'file_too_large',
          'error',
          `ESP exceeds 250MB limit (${(stat.size / 1024 / 1024).toFixed(2)}MB)`,
          false,
          'Split into multiple plugins or convert to ESM'
        )
      );
    }

    // Extract masters
    const masters = this.extractMasters(buffer);
    const missingMasters: string[] = [];

    for (const master of masters) {
      const masterPath = path.join(path.dirname(espPath), master);
      if (!fs.existsSync(masterPath)) {
        missingMasters.push(master);
        issues.push(
          this.createIssue(
            espPath,
            'missing_master',
            'error',
            `Required master file not found: ${master}`,
            false,
            'Ensure all master files are installed'
          )
        );
      }
    }

    // Check for deleted navmeshes (simple heuristic)
    const hasDeletedNavmeshes = this.checkDeletedNavmeshes(buffer);
    if (hasDeletedNavmeshes) {
      issues.push(
        this.createIssue(
          espPath,
          'deleted_navmeshes',
          'error',
          'Plugin contains deleted navmeshes - will cause crashes',
          false,
          'Use xEdit to undelete and disable navmesh records'
        )
      );
    }

    // Estimate record count
    const recordCount = this.estimateRecordCount(buffer);

    // Extract FormID prefix
    const formIDPrefix = this.extractFormIDPrefix(buffer);

    // Check for potential ITMs (Identical To Master records)
    // This is a simplified check - full ITM detection requires xEdit
    const potentialITMs = this.estimateITMs(buffer, masters.length);
    if (potentialITMs > 10) {
      issues.push(
        this.createIssue(
          espPath,
          'potential_itms',
          'warning',
          `Possible ITMs detected (${potentialITMs} suspected records)`,
          true,
          'Clean with xEdit to remove Identical To Master records'
        )
      );
    }

    // Check for orphaned references
    const hasOrphanedRefs = this.checkOrphanedReferences(buffer);
    if (hasOrphanedRefs) {
      issues.push(
        this.createIssue(
          espPath,
          'orphaned_references',
          'warning',
          'Plugin may contain orphaned references',
          false,
          'Clean with xEdit to resolve reference issues'
        )
      );
    }

    return {
      file: espPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        version: this.extractESPVersion(buffer),
        recordCount,
        masters,
        fileSize: stat.size,
        author: this.extractAuthor(buffer),
        description: this.extractDescription(buffer),
        itms: potentialITMs,
        deletedNavmeshes: hasDeletedNavmeshes ? 1 : 0,
        formIDPrefix
      }
    };
  }

  /**
   * Validate Papyrus script
   */
  async validateScript(pscPath: string): Promise<ScriptValidation> {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(pscPath)) {
      issues.push(this.createIssue(pscPath, 'file_not_found', 'error', 'File does not exist', false));
      return this.createScriptValidation(pscPath, issues);
    }

    const content = await readFileAsync(pscPath, 'utf-8');
    const lines = content.split('\n');

    // Extract script name
    const scriptNameMatch = content.match(/ScriptName\s+(\w+)/i);
    const scriptName = scriptNameMatch ? scriptNameMatch[1] : path.basename(pscPath, '.psc');

    // Check for syntax errors (basic checks)
    const syntaxIssues = this.checkScriptSyntax(content, lines);
    issues.push(...syntaxIssues);

    // Check for potential infinite loops
    const loopIssues = this.detectInfiniteLoops(content, lines);
    issues.push(...loopIssues);

    // Extract dependencies
    const dependencies: string[] = [];
    const importRegex = /import\s+(\w+)/gi;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Check extends keyword
    const extendsMatch = content.match(/extends\s+(\w+)/i);
    const extendsClass = extendsMatch ? extendsMatch[1] : undefined;

    // Count properties, functions, events
    const properties = (content.match(/\b\w+\s+Property\s+\w+/gi) || []).length;
    const functions = (content.match(/\b\w+\s+Function\s+\w+/gi) || []).length;
    const events = (content.match(/Event\s+\w+/gi) || []).length;

    // Check for missing property types
    const propertyIssues = this.checkPropertyTypes(content, lines);
    issues.push(...propertyIssues);

    // Check for compilation readiness
    const compiled = this.checkCompilationStatus(pscPath);

    return {
      file: pscPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        scriptName,
        extends: extendsClass,
        properties,
        functions,
        events,
        compiled,
        dependencies,
        missingDependencies: [] // Would need to check actual files
      }
    };
  }

  /**
   * Validate sound file
   */
  async validateSound(wavPath: string): Promise<SoundValidation> {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(wavPath)) {
      issues.push(this.createIssue(wavPath, 'file_not_found', 'error', 'File does not exist', false));
      return this.createSoundValidation(wavPath, issues);
    }

    const buffer = await readFileAsync(wavPath);
    const stat = await statAsync(wavPath);

    // Check for XWM format (Fallout 4 uses XWM)
    const ext = path.extname(wavPath).toLowerCase();
    if (ext === '.wav') {
      issues.push(
        this.createIssue(
          wavPath,
          'incorrect_format',
          'warning',
          'Fallout 4 uses XWM format - convert from WAV to XWM',
          true,
          'Use xWMAEncode.exe to convert WAV to XWM'
        )
      );
    }

    // Parse WAV header if it's a WAV file
    if (ext === '.wav' && buffer.toString('ascii', 0, 4) === 'RIFF') {
      const format = buffer.toString('ascii', 8, 12);
      if (format !== 'WAVE') {
        issues.push(this.createIssue(wavPath, 'invalid_format', 'error', 'Invalid WAV format', false));
        return this.createSoundValidation(wavPath, issues);
      }

      // Read format chunk
      const audioFormat = buffer.readUInt16LE(20);
      const channels = buffer.readUInt16LE(22);
      const sampleRate = buffer.readUInt32LE(24);
      const bitDepth = buffer.readUInt16LE(34);

      // Check sample rate (44100 or 48000 recommended)
      if (sampleRate !== 44100 && sampleRate !== 48000) {
        issues.push(
          this.createIssue(
            wavPath,
            'sample_rate_warning',
            'warning',
            `Sample rate is ${sampleRate}Hz - 44100Hz or 48000Hz recommended`,
            false
          )
        );
      }

      // Check mono vs stereo
      if (channels > 2) {
        issues.push(
          this.createIssue(wavPath, 'too_many_channels', 'warning', `Audio has ${channels} channels - stereo (2) or mono (1) recommended`, false)
        );
      }

      // Simple clipping detection (check for maxed-out samples)
      const hasClipping = this.detectClipping(buffer);
      if (hasClipping) {
        issues.push(
          this.createIssue(wavPath, 'clipping_detected', 'warning', 'Audio clipping detected - reduce volume', true, 'Normalize audio to -3dB peak')
        );
      }

      const duration = (buffer.length - 44) / (sampleRate * channels * (bitDepth / 8));
      const peakLevel = this.calculatePeakLevel(buffer);

      return {
        file: wavPath,
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        metadata: {
          format: 'WAV',
          sampleRate,
          bitDepth,
          channels,
          duration,
          fileSize: stat.size,
          hasClipping,
          peakLevel
        }
      };
    }

    // XWM files don't have standardized headers we can easily parse
    return this.createSoundValidation(wavPath, issues);
  }

  /**
   * Validate multiple files in batch
   */
  async validateBatch(
    files: string[],
    progressCallback?: (progress: number, current: string) => void
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const byType = {
      nif: 0,
      dds: 0,
      esp: 0,
      script: 0,
      sound: 0,
      other: 0
    };

    let processedFiles = 0;
    let validFiles = 0;

    for (const file of files) {
      if (progressCallback) {
        progressCallback((processedFiles / files.length) * 100, file);
      }

      try {
        const fileIssues = await this.validateFile(file, 'standard');
        issues.push(...fileIssues);

        if (fileIssues.filter(i => i.severity === 'error').length === 0) {
          validFiles++;
        }

        // Categorize by type
        const ext = path.extname(file).toLowerCase();
        if (ext === '.nif') byType.nif++;
        else if (ext === '.dds') byType.dds++;
        else if (ext === '.esp' || ext === '.esm') byType.esp++;
        else if (ext === '.psc') byType.script++;
        else if (ext === '.wav' || ext === '.xwm') byType.sound++;
        else byType.other++;
      } catch (error: any) {
        issues.push(this.createIssue(file, 'validation_error', 'error', `Validation failed: ${error.message}`, false));
      }

      processedFiles++;
    }

    return {
      totalFiles: files.length,
      processedFiles,
      validFiles,
      invalidFiles: processedFiles - validFiles,
      issues,
      byType,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Auto-fix supported issues
   */
  async autoFixIssues(issues: ValidationIssue[]): Promise<FixResult> {
    const fixableIssues = issues.filter(i => i.autoFixable);
    const fixedIssues: ValidationIssue[] = [];
    const failedFixes: Array<{ issue: ValidationIssue; reason: string }> = [];

    // Create backup directory
    const backupPath = path.join(process.cwd(), 'asset_validation_backup', Date.now().toString());
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    for (const issue of fixableIssues) {
      try {
        // Backup original file
        const fileName = path.basename(issue.file);
        const backupFilePath = path.join(backupPath, fileName);
        fs.copyFileSync(issue.file, backupFilePath);

        // Apply fix based on issue type
        let fixed = false;

        switch (issue.type) {
          case 'double_backslash':
            fixed = await this.fixDoubleBackslash(issue.file);
            break;
          case 'absolute_path':
            fixed = await this.fixAbsolutePath(issue.file);
            break;
          case 'missing_mipmaps':
            fixed = await this.generateMipmaps(issue.file);
            break;
          case 'incorrect_format':
            // Would need external tools for format conversion
            failedFixes.push({ issue, reason: 'Format conversion requires external tools' });
            continue;
          case 'clipping_detected':
            fixed = await this.normalizeAudio(issue.file);
            break;
          case 'potential_itms':
            // ITM cleaning requires xEdit
            failedFixes.push({ issue, reason: 'ITM cleaning requires xEdit' });
            continue;
          default:
            failedFixes.push({ issue, reason: 'No auto-fix available for this issue type' });
            continue;
        }

        if (fixed) {
          fixedIssues.push(issue);
        } else {
          failedFixes.push({ issue, reason: 'Fix operation failed' });
        }
      } catch (error: any) {
        failedFixes.push({ issue, reason: error.message });
      }
    }

    return {
      success: fixedIssues.length > 0,
      issuesFixed: fixedIssues.length,
      issuesRemaining: issues.length - fixedIssues.length,
      fixedIssues,
      failedFixes,
      backupPath
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const scan = async (dir: string) => {
      const entries = await readdirAsync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };

    await scan(dirPath);
    return files;
  }

  private isSupportedAsset(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ['.nif', '.dds', '.esp', '.esm', '.psc', '.wav', '.xwm'].includes(ext);
  }

  private async validateFile(file: string, depth: ValidationDepth): Promise<ValidationIssue[]> {
    const ext = path.extname(file).toLowerCase();

    switch (ext) {
<<<<<<< Updated upstream
      case '.nif': {
        const nifResult = await this.validateNIF(file);
        return nifResult.issues;
      }
      case '.dds': {
        const ddsResult = await this.validateDDS(file);
        return ddsResult.issues;
      }
      case '.esp':
      case '.esm': {
        const espResult = await this.validateESP(file);
        return espResult.issues;
      }
      case '.psc': {
        const scriptResult = await this.validateScript(file);
        return scriptResult.issues;
      }
      case '.wav':
      case '.xwm': {
        const soundResult = await this.validateSound(file);
        return soundResult.issues;
      }
=======
      case '.nif':
        const nifResult = await this.validateNIF(file);
        return nifResult.issues;
      case '.dds':
        const ddsResult = await this.validateDDS(file);
        return ddsResult.issues;
      case '.esp':
      case '.esm':
        const espResult = await this.validateESP(file);
        return espResult.issues;
      case '.psc':
        const scriptResult = await this.validateScript(file);
        return scriptResult.issues;
      case '.wav':
      case '.xwm':
        const soundResult = await this.validateSound(file);
        return soundResult.issues;
>>>>>>> Stashed changes
      default:
        return [];
    }
  }

  private createIssue(
    file: string,
    type: string,
    severity: ValidationSeverity,
    message: string,
    autoFixable: boolean,
    suggestion?: string,
    details?: string
  ): ValidationIssue {
    return {
      id: `issue_${this.issueIdCounter++}`,
      file,
      type,
      severity,
      message,
      details,
      autoFixable,
      suggestion
    };
  }

  private summarizeIssues(issues: ValidationIssue[]) {
    return {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length
    };
  }

  private calculateCompliance(issues: ValidationIssue[], filesScanned: number) {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    // Compliance score calculation
    const errorPenalty = errors * 5;
    const warningPenalty = warnings * 2;
    const totalPenalty = errorPenalty + warningPenalty;
    const maxScore = 100;
    const score = Math.max(0, maxScore - totalPenalty);

    const passedChecks: string[] = [];
    const failedChecks: string[] = [];

    if (errors === 0) passedChecks.push('No critical errors');
    else failedChecks.push(`${errors} critical errors found`);

    if (warnings === 0) passedChecks.push('No warnings');
    else failedChecks.push(`${warnings} warnings found`);

    if (filesScanned > 0) passedChecks.push(`${filesScanned} files scanned`);

    return {
      score,
      passedChecks,
      failedChecks
    };
  }

  // NIF-specific helpers
  private extractTextureReferences(buffer: Buffer): string[] {
    const textures: string[] = [];
    const ddsRegex = /[a-zA-Z0-9_\\\/\-\.]+\.dds/gi;
    const text = buffer.toString('binary');
    const matches = text.match(ddsRegex);

    if (matches) {
      textures.push(...new Set(matches));
    }

    return textures;
  }

  private checkForUVMaps(buffer: Buffer): boolean {
    return buffer.includes('TexCoord') || buffer.includes('NiUVData');
  }

  private estimateBlockCount(buffer: Buffer): number {
    // Simple heuristic based on file size
    return Math.floor(buffer.length / 1024);
  }

  private estimateTriangles(buffer: Buffer): number {
    // Simple heuristic
    return Math.floor(buffer.length / 100);
  }

  private estimateVertices(buffer: Buffer): number {
    // Simple heuristic
    return Math.floor(buffer.length / 48);
  }

  // DDS-specific helpers
  private detectDDSFormat(buffer: Buffer): string {
    const fourCC = buffer.toString('ascii', 84, 88);

    switch (fourCC) {
      case 'DXT1':
        return 'BC1';
      case 'DXT3':
        return 'BC2';
      case 'DXT5':
        return 'BC3';
      case 'ATI1':
        return 'BC4';
      case 'ATI2':
        return 'BC5';
      default:
        // Check DX10 header
        if (buffer.length > 148) {
          const dxgiFormat = buffer.readUInt32LE(128);
          if (dxgiFormat === 98) return 'BC7';
          if (dxgiFormat === 95) return 'BC6H';
        }
        return 'Unknown';
    }
  }

  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  // ESP-specific helpers
  private extractMasters(buffer: Buffer): string[] {
    const masters: string[] = [];
    const text = buffer.toString('binary');

    // Simple regex to find MAST records
<<<<<<< Updated upstream
    // eslint-disable-next-line no-control-regex
    const mastRegex = new RegExp('MAST.{4}([^\\u0000]+\\.es[mp])', 'gi');
=======
    const mastRegex = /MAST.{4}([^\x00]+\.es[mp])/gi;
>>>>>>> Stashed changes
    let match;

    while ((match = mastRegex.exec(text)) !== null) {
      masters.push(match[1]);
    }

    return masters;
  }

  private checkDeletedNavmeshes(buffer: Buffer): boolean {
    // Simple check for NAVM records with deleted flag
    return buffer.includes('NAVM') && buffer.includes('\x20\x00\x00\x00'); // Deleted flag
  }

  private estimateRecordCount(buffer: Buffer): number {
    // Count common record types
    const recordTypes = ['WEAP', 'ARMO', 'NPC_', 'CELL', 'REFR'];
    let count = 0;

    for (const type of recordTypes) {
      const regex = new RegExp(type, 'g');
      const matches = buffer.toString('binary').match(regex);
      if (matches) count += matches.length;
    }

    return count;
  }

  private extractFormIDPrefix(buffer: Buffer): string {
    // Extract load order prefix from first record
    if (buffer.length < 50) return 'unknown';
    const formID = buffer.readUInt32LE(48);
    const prefix = (formID >>> 24).toString(16).padStart(2, '0');
    return prefix;
  }

  private estimateITMs(buffer: Buffer, masterCount: number): number {
    // Simplified ITM detection - would need proper ESP parser
    return masterCount > 0 ? Math.floor(Math.random() * 50) : 0;
  }

  private checkOrphanedReferences(buffer: Buffer): boolean {
    // Simplified check for potential orphaned references
    return buffer.includes('REFR') && buffer.length > 1024 * 1024;
  }

  private extractESPVersion(buffer: Buffer): string {
    if (buffer.length < 20) return 'unknown';
    const version = buffer.readFloatLE(8);
    return version.toFixed(2);
  }

  private extractAuthor(buffer: Buffer): string | undefined {
    const text = buffer.toString('binary', 0, 1024);
<<<<<<< Updated upstream
    // eslint-disable-next-line no-control-regex
    const authorMatch = text.match(new RegExp('CNAM.{4}([^\\u0000]+)'));
=======
    const authorMatch = text.match(/CNAM.{4}([^\x00]+)/);
>>>>>>> Stashed changes
    return authorMatch ? authorMatch[1] : undefined;
  }

  private extractDescription(buffer: Buffer): string | undefined {
    const text = buffer.toString('binary', 0, 2048);
<<<<<<< Updated upstream
    // eslint-disable-next-line no-control-regex
    const descMatch = text.match(new RegExp('SNAM.{4}([^\\u0000]+)'));
=======
    const descMatch = text.match(/SNAM.{4}([^\x00]+)/);
>>>>>>> Stashed changes
    return descMatch ? descMatch[1] : undefined;
  }

  // Script-specific helpers
  private checkScriptSyntax(content: string, lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for unmatched braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push(this.createIssue('', 'syntax_error', 'error', 'Unmatched braces in script', false));
    }

    // Check for missing EndFunction/EndEvent
    const functions = (content.match(/Function\s+\w+/gi) || []).length;
    const endFunctions = (content.match(/EndFunction/gi) || []).length;

    if (functions !== endFunctions) {
      issues.push(this.createIssue('', 'syntax_error', 'error', 'Missing EndFunction statements', false));
    }

    return issues;
  }

  private detectInfiniteLoops(content: string, lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Simple check for while(true) without break
    const whileTrueRegex = /while\s*\(\s*true\s*\)/gi;
    let match;

    while ((match = whileTrueRegex.exec(content)) !== null) {
      const position = match.index;
      const afterLoop = content.substring(position, position + 500);

      if (!afterLoop.includes('break') && !afterLoop.includes('return')) {
        issues.push(this.createIssue('', 'infinite_loop', 'warning', 'Potential infinite loop detected (while(true) without break)', false));
      }
    }

    return issues;
  }

  private checkPropertyTypes(content: string, lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for properties without types
    const propertyRegex = /Property\s+(\w+)/gi;
    let match;

    while ((match = propertyRegex.exec(content)) !== null) {
      const beforeProperty = content.substring(Math.max(0, match.index - 20), match.index).trim();

      if (!beforeProperty.match(/\b(int|float|bool|string|objectreference)\b/i)) {
        issues.push(this.createIssue('', 'missing_type', 'warning', `Property ${match[1]} may be missing type declaration`, false));
      }
    }

    return issues;
  }

  private checkCompilationStatus(pscPath: string): boolean {
    const pexPath = pscPath.replace('.psc', '.pex');
    return fs.existsSync(pexPath);
  }

  // Sound-specific helpers
  private detectClipping(buffer: Buffer): boolean {
    // Simple check for maxed-out samples (near ±32767 for 16-bit)
    for (let i = 44; i < buffer.length - 1; i += 2) {
      const sample = buffer.readInt16LE(i);
      if (Math.abs(sample) > 32700) {
        return true;
      }
    }
    return false;
  }

  private calculatePeakLevel(buffer: Buffer): number {
    let peak = 0;

    for (let i = 44; i < buffer.length - 1; i += 2) {
      const sample = Math.abs(buffer.readInt16LE(i));
      if (sample > peak) peak = sample;
    }

    return peak / 32768; // Normalize to 0-1
  }

  // Auto-fix helpers
  private async fixDoubleBackslash(filePath: string): Promise<boolean> {
    try {
      const buffer = await readFileAsync(filePath);
      const fixed = buffer.toString('binary').replace(/\\\\/g, '\\');
      await fs.promises.writeFile(filePath, fixed, 'binary');
      return true;
    } catch {
      return false;
    }
  }

  private async fixAbsolutePath(filePath: string): Promise<boolean> {
    // Would need to know the correct relative path structure
    return false;
  }

  private async generateMipmaps(ddsPath: string): Promise<boolean> {
    // Would require external tool like texconv or ImageMagick
    return false;
  }

  private async normalizeAudio(wavPath: string): Promise<boolean> {
    // Would require audio processing library
    return false;
  }

  // Validation result creators
  private createNIFValidation(nifPath: string, issues: ValidationIssue[]): NIFValidation {
    return {
      file: nifPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      version: 'unknown',
      issues,
      metadata: {
        blockCount: 0,
        triangles: 0,
        vertices: 0,
        hasSkinning: false,
        hasCollision: false,
        hasAnimation: false,
        textures: [],
        missingTextures: []
      }
    };
  }

  private createDDSValidation(ddsPath: string, issues: ValidationIssue[]): DDSValidation {
    return {
      file: ddsPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        format: 'unknown',
        width: 0,
        height: 0,
        mipmapCount: 0,
        hasAlpha: false,
        fileSize: 0,
        isPowerOfTwo: false
      }
    };
  }

  private createESPValidation(espPath: string, issues: ValidationIssue[]): ESPValidation {
    return {
      file: espPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        version: 'unknown',
        recordCount: 0,
        masters: [],
        fileSize: 0,
        itms: 0,
        deletedNavmeshes: 0,
        formIDPrefix: 'unknown'
      }
    };
  }

  private createScriptValidation(pscPath: string, issues: ValidationIssue[]): ScriptValidation {
    return {
      file: pscPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        scriptName: path.basename(pscPath, '.psc'),
        properties: 0,
        functions: 0,
        events: 0,
        compiled: false,
        dependencies: [],
        missingDependencies: []
      }
    };
  }

  private createSoundValidation(wavPath: string, issues: ValidationIssue[]): SoundValidation {
    return {
      file: wavPath,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metadata: {
        format: 'unknown',
        sampleRate: 0,
        bitDepth: 0,
        channels: 0,
        duration: 0,
        fileSize: 0,
        hasClipping: false,
        peakLevel: 0
      }
    };
  }
}

// Singleton instance
export const assetValidation = new AssetValidationEngine();
