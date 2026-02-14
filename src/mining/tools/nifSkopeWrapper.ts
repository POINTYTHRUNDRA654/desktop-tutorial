/**
 * NifSkope Wrapper
 * Specialized interface for NIF file manipulation
 * Note: NifSkope has limited CLI support, so many operations use NIF library parsing
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OptimizeOptions {
  removeHiddenGeometry?: boolean;
  stripUnusedVertices?: boolean;
  recalculateBounds?: boolean;
  recalculateNormals?: boolean;
  compressVertexData?: boolean;
}

export interface CollisionFixOptions {
  recalculateMassProperties?: boolean;
  fixInvalidShapes?: boolean;
  removeInvalidCollision?: boolean;
}

export class NifSkopeWrapper {
  private nifSkopePath: string;

  constructor(nifSkopePath?: string) {
    this.nifSkopePath = nifSkopePath || this.detectNifSkope();
  }

  /**
   * Optimize NIF file (reduce file size, improve performance)
   */
  async optimize(nifPath: string, options: OptimizeOptions = {}): Promise<void> {
    if (!fs.existsSync(nifPath)) {
      throw new Error(`NIF file not found: ${nifPath}`);
    }

    const {
      removeHiddenGeometry = true,
      stripUnusedVertices = true,
      recalculateBounds = true,
      recalculateNormals = false,
      compressVertexData = true
    } = options;

    // Create backup
    const backupPath = nifPath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(nifPath, backupPath);
    }

    // NifSkope doesn't have good CLI support
    // This is a placeholder for custom NIF optimization logic
    // In practice, this would use a NIF parsing library (pyniftools, niflib, etc.)
    
    const buffer = fs.readFileSync(nifPath);
    
    // Basic NIF validation
    const header = buffer.toString('utf-8', 0, 40);
    if (!header.includes('Gamebryo') && !header.includes('NetImmerse')) {
      throw new Error('Invalid NIF file format');
    }

    // Placeholder: Actual optimization would require full NIF parsing library
    console.log(`[NifSkope] Optimization requested for: ${nifPath}`);
    console.log(`[NifSkope] Options:`, options);
    console.log(`[NifSkope] Note: Full NIF optimization requires PyNifTools or similar library`);

    // For now, just validate the file is readable
    if (buffer.length === 0) {
      throw new Error('NIF file is empty or corrupted');
    }
  }

  /**
   * Change texture paths in NIF file
   */
  async changeTexturePath(nifPath: string, oldPath: string, newPath: string): Promise<void> {
    if (!fs.existsSync(nifPath)) {
      throw new Error(`NIF file not found: ${nifPath}`);
    }

    // Create backup
    const backupPath = nifPath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(nifPath, backupPath);
    }

    // Read NIF file
    let buffer = fs.readFileSync(nifPath);
    
    // NIF files store texture paths as null-terminated strings
    // This is a simplified string replacement approach
    // A proper implementation would parse the NIF structure
    
    const oldPathBuffer = Buffer.from(oldPath + '\0', 'utf-8');
    const newPathBuffer = Buffer.from(newPath + '\0', 'utf-8');

    // Search and replace texture path
    let modified = false;
    for (let i = 0; i <= buffer.length - oldPathBuffer.length; i++) {
      if (buffer.slice(i, i + oldPathBuffer.length).equals(oldPathBuffer)) {
        // Found matching texture path
        if (newPathBuffer.length <= oldPathBuffer.length) {
          // Can replace in-place
          newPathBuffer.copy(buffer, i);
          // Pad with zeros if new path is shorter
          if (newPathBuffer.length < oldPathBuffer.length) {
            buffer.fill(0, i + newPathBuffer.length, i + oldPathBuffer.length);
          }
          modified = true;
        } else {
          console.warn(`[NifSkope] New path too long, cannot replace: ${oldPath} -> ${newPath}`);
        }
      }
    }

    if (modified) {
      fs.writeFileSync(nifPath, buffer);
      console.log(`[NifSkope] Replaced texture path: ${oldPath} -> ${newPath}`);
    } else {
      console.log(`[NifSkope] Texture path not found: ${oldPath}`);
    }
  }

  /**
   * Fix collision issues in NIF
   */
  async fixCollision(nifPath: string, options: CollisionFixOptions = {}): Promise<void> {
    if (!fs.existsSync(nifPath)) {
      throw new Error(`NIF file not found: ${nifPath}`);
    }

    const {
      recalculateMassProperties = true,
      fixInvalidShapes = true,
      removeInvalidCollision = false
    } = options;

    // Create backup
    const backupPath = nifPath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(nifPath, backupPath);
    }

    // Read NIF file
    const buffer = fs.readFileSync(nifPath);
    
    // Validate NIF format
    const header = buffer.toString('utf-8', 0, 40);
    if (!header.includes('Gamebryo') && !header.includes('NetImmerse')) {
      throw new Error('Invalid NIF file format');
    }

    // Placeholder for collision fixing logic
    // Real implementation would:
    // 1. Parse NIF structure to find bhkCollisionObject nodes
    // 2. Validate collision shapes (bhkBoxShape, bhkConvexVerticesShape, etc.)
    // 3. Recalculate mass properties if requested
    // 4. Fix or remove invalid collision data
    
    console.log(`[NifSkope] Collision fix requested for: ${nifPath}`);
    console.log(`[NifSkope] Options:`, options);
    console.log(`[NifSkope] Note: Full collision fixing requires NIF parsing library`);
  }

  /**
   * Extract metadata from NIF file
   */
  async extractMetadata(nifPath: string): Promise<NIFMetadata> {
    if (!fs.existsSync(nifPath)) {
      throw new Error(`NIF file not found: ${nifPath}`);
    }

    const buffer = fs.readFileSync(nifPath);
    const stats = fs.statSync(nifPath);

    const metadata: NIFMetadata = {
      filePath: nifPath,
      fileSize: stats.size,
      version: 'Unknown',
      numBlocks: 0,
      numTriangles: 0,
      numVertices: 0,
      hasSkinning: false,
      hasCollision: false,
      hasAnimation: false,
      textureReferences: []
    };

    // Parse NIF header
    const headerString = buffer.toString('utf-8', 0, 40);
    
    if (headerString.includes('Gamebryo File Format')) {
      // Extract version from header
      const versionMatch = headerString.match(/Version:?\s*(\d+\.\d+\.\d+\.\d+)/i);
      if (versionMatch) {
        metadata.version = versionMatch[1];
      }
    } else if (headerString.includes('NetImmerse File Format')) {
      metadata.version = 'NetImmerse (Legacy)';
    } else {
      throw new Error('Invalid NIF file format');
    }

    // Parse number of blocks (uint32 at offset ~0x40)
    if (buffer.length > 0x44) {
      metadata.numBlocks = buffer.readUInt32LE(0x40);
    }

    // Search for common block signatures
    const bufferStr = buffer.toString('utf-8');
    metadata.hasSkinning = bufferStr.includes('NiSkinInstance') || bufferStr.includes('BSDismemberSkinInstance');
    metadata.hasCollision = bufferStr.includes('bhkCollisionObject') || bufferStr.includes('bhkRigidBody');
    metadata.hasAnimation = bufferStr.includes('NiControllerManager') || bufferStr.includes('NiKeyframeController');

    // Extract texture references (look for .dds extensions)
    const ddsMatches = bufferStr.match(/[\w\\/]+\.dds/gi);
    if (ddsMatches) {
      metadata.textureReferences = [...new Set(ddsMatches)]; // Remove duplicates
    }

    return metadata;
  }

  /**
   * Batch process multiple NIF files
   */
  async batchOptimize(nifFiles: string[], options: OptimizeOptions = {}): Promise<BatchResult> {
    const results: BatchResult = {
      totalFiles: nifFiles.length,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    for (const nifPath of nifFiles) {
      try {
        await this.optimize(nifPath, options);
        results.successCount++;
      } catch (error: any) {
        results.failureCount++;
        results.errors.push({
          file: nifPath,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Detect NifSkope installation
   */
  private detectNifSkope(): string {
    const commonPaths = [
      'C:\\Program Files\\NifSkope\\NifSkope.exe',
      'C:\\Program Files (x86)\\NifSkope\\NifSkope.exe',
      'C:\\NifSkope\\NifSkope.exe'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('NifSkope not found. Please install NifSkope or specify path manually.');
  }

  /**
   * Validate NIF file structure
   */
  validateNIF(nifPath: string): ValidationResult {
    if (!fs.existsSync(nifPath)) {
      return {
        valid: false,
        errors: [`File not found: ${nifPath}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const buffer = fs.readFileSync(nifPath);
      
      // Check minimum file size
      if (buffer.length < 100) {
        errors.push('File too small to be a valid NIF');
      }

      // Check header
      const header = buffer.toString('utf-8', 0, 40);
      if (!header.includes('Gamebryo') && !header.includes('NetImmerse')) {
        errors.push('Invalid NIF header');
      }

      // Check for common issues
      if (buffer.includes('textures\\\\')) {
        warnings.push('Contains double backslashes in texture paths');
      }

      if (buffer.includes('C:\\') || buffer.includes('D:\\')) {
        warnings.push('Contains absolute paths - should use relative paths');
      }

    } catch (error: any) {
      errors.push(`Failed to read file: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

interface NIFMetadata {
  filePath: string;
  fileSize: number;
  version: string;
  numBlocks: number;
  numTriangles: number;
  numVertices: number;
  hasSkinning: boolean;
  hasCollision: boolean;
  hasAnimation: boolean;
  textureReferences: string[];
}

interface BatchResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ file: string; error: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
