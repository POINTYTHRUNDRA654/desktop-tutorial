/**
 * Bethel Integration - "Bethesda Texture Enhancement Layer"
 * 
 * Automatic mod upload → enhance → export workflow
 * Orchestrates texture enhancement with seamless mod packaging
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import { BridgeServer } from '../electron/BridgeServer';
import {
  analyzeModTextures,
  enhanceTexturesViaBlender,
  type TextureAnalysis,
  type EnhancementRequest,
} from '../electron/textureEnhancer';
import type { MossyMaterialManifest } from '../electron/materialDefinitions';

/**
 * Bethel Job Status - tracks enhancement lifecycle
 */
export interface BethelJob {
  jobId: string;
  uploadedAt: number;
  modName: string;
  modPath: string;
  enhancedModPath?: string;
  status: 'uploading' | 'analyzing' | 'enhancing' | 'packaging' | 'complete' | 'error';
  progress: number;
  message: string;
  textureStats?: TextureAnalysis;
  manifest?: MossyMaterialManifest;
  error?: string;
  exportFormat: 'zip' | 'fomod' | 'default';
  downloadUrl?: string;
  expiresAt?: number; // Auto-cleanup after 7 days
}

/**
 * Bethel job registry - in-memory + persistent
 */
class BethelJobRegistry {
  private jobs = new Map<string, BethelJob>();
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.loadJobs();
  }

  private loadJobs() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const jobs = JSON.parse(data);
        Object.entries(jobs).forEach(([jobId, job]: [string, any]) => {
          this.jobs.set(jobId, job);
        });
      }
    } catch (err) {
      console.error('[Bethel] Failed to load job registry:', err);
    }
  }

  private saveJobs() {
    try {
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const data: Record<string, BethelJob> = {};
      this.jobs.forEach((job, jobId) => {
        data[jobId] = job;
      });
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[Bethel] Failed to save job registry:', err);
    }
  }

  create(): BethelJob {
    const job: BethelJob = {
      jobId: uuidv4(),
      uploadedAt: Date.now(),
      modName: 'Unknown Mod',
      modPath: '',
      status: 'uploading',
      progress: 0,
      message: 'Initializing...',
      exportFormat: 'zip',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    this.jobs.set(job.jobId, job);
    this.saveJobs();
    return job;
  }

  update(jobId: string, updates: Partial<BethelJob>) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.saveJobs();
    }
  }

  get(jobId: string): BethelJob | undefined {
    return this.jobs.get(jobId);
  }

  list(): BethelJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.uploadedAt - a.uploadedAt
    );
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    this.jobs.forEach((job, jobId) => {
      if (job.expiresAt && job.expiresAt < now) {
        this.jobs.delete(jobId);
        cleaned++;
        // Clean up mod directories
        if (job.modPath && fs.existsSync(job.modPath)) {
          try {
            fs.rmSync(job.modPath, { recursive: true, force: true });
          } catch (err) {
            console.error(`[Bethel] Failed to cleanup ${job.modPath}:`, err);
          }
        }
      }
    });
    if (cleaned > 0) {
      this.saveJobs();
      console.log(`[Bethel] Cleaned up ${cleaned} expired jobs`);
    }
  }
}

/**
 * Bethel Integration Handler
 */
export class BethelIntegration {
  private bridgeServer: BridgeServer;
  private jobRegistry: BethelJobRegistry;
  private uploadsDir: string;

  constructor(bridgeServer: BridgeServer, dataDir: string) {
    this.bridgeServer = bridgeServer;
    this.uploadsDir = path.join(dataDir, 'bethel_uploads');
    this.jobRegistry = new BethelJobRegistry(
      path.join(dataDir, 'bethel_jobs.json')
    );

    // Cleanup expired jobs on startup
    this.jobRegistry.cleanup();

    // Periodic cleanup (every hour)
    setInterval(() => this.jobRegistry.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Create upload session for mod
   */
  createUploadSession(): BethelJob {
    const job = this.jobRegistry.create();
    const uploadDir = path.join(this.uploadsDir, job.jobId);
    fs.mkdirSync(uploadDir, { recursive: true });
    job.modPath = uploadDir;
    this.jobRegistry.update(job.jobId, { modPath: uploadDir });
    return job;
  }

  /**
   * Process uploaded mod - analyze textures
   */
  async analyzeUploadedMod(jobId: string): Promise<BethelJob> {
    const job = this.jobRegistry.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      this.jobRegistry.update(jobId, {
        status: 'analyzing',
        progress: 10,
        message: 'Analyzing textures...',
      });

      const analysis = await analyzeModTextures(job.modPath);

      // Extract mod name from directory structure
      const modName = this.extractModName(job.modPath);

      this.jobRegistry.update(jobId, {
        modName,
        textureStats: analysis,
        progress: 30,
        message: `Found ${analysis.totalTextures} textures`,
      });

      return job;
    } catch (err) {
      const errorMsg = `Analysis failed: ${err}`;
      this.jobRegistry.update(jobId, {
        status: 'error',
        error: errorMsg,
        message: errorMsg,
      });
      throw err;
    }
  }

  /**
   * Start enhancement - orchestrate texture processing
   */
  async enhanceMod(
    jobId: string,
    enhancementLevel: 4 | 8 | 16 = 4,
    mainWindow?: any
  ): Promise<BethelJob> {
    const job = this.jobRegistry.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (!job.textureStats) throw new Error(`No texture analysis for job ${jobId}`);

    try {
      this.jobRegistry.update(jobId, {
        status: 'enhancing',
        progress: 35,
        message: 'Starting texture enhancement...',
      });

      // Create enhancement request
      const request: EnhancementRequest = {
        jobId,
        modPath: job.modPath,
        level: enhancementLevel,
      };

      // Listen for enhancement progress from textureEnhancer
      let enhancementComplete = false;
      const enhancementPromise = enhanceTexturesViaBlender(
        request,
        this.bridgeServer,
        job.textureStats,
        mainWindow
      );

      // Wait for enhancement
      const result = await enhancementPromise;

      if (!result.success) {
        throw new Error(result.message);
      }

      this.jobRegistry.update(jobId, {
        progress: 85,
        message: 'Preparing export...',
        manifest: result.manifest,
      });

      return job;
    } catch (err) {
      const errorMsg = `Enhancement failed: ${err}`;
      this.jobRegistry.update(jobId, {
        status: 'error',
        error: errorMsg,
        message: errorMsg,
      });
      throw err;
    }
  }

  /**
   * Export enhanced mod
   */
  async exportEnhancedMod(
    jobId: string,
    format: 'zip' | 'fomod' | 'default' = 'zip'
  ): Promise<BethelJob> {
    const job = this.jobRegistry.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      this.jobRegistry.update(jobId, {
        status: 'packaging',
        progress: 90,
        message: `Packaging as ${format}...`,
      });

      const enhancedDir = path.join(job.modPath, '.mossy_enhanced');
      if (!fs.existsSync(enhancedDir)) {
        throw new Error('No enhanced textures found');
      }

      // Create export directory
      const exportsDir = path.join(
        this.uploadsDir,
        'exports',
        job.jobId
      );
      fs.mkdirSync(exportsDir, { recursive: true });

      // Create filename
      const exportName = `${job.modName
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}_enhanced`;

      let exportPath: string;

      // Export based on format
      if (format === 'fomod') {
        exportPath = await this.createFOMODPackage(
          jobId,
          job.modName,
          enhancedDir,
          exportsDir,
          job.textureStats
        );
      } else {
        // Default to ZIP
        exportPath = await this.createZIPPackage(
          enhancedDir,
          exportsDir,
          exportName,
          job.manifest
        );
      }

      const downloadUrl = `/bethel/download/${job.jobId}/${path.basename(exportPath)}`;

      this.jobRegistry.update(jobId, {
        status: 'complete',
        progress: 100,
        message: 'Enhancement complete!',
        enhancedModPath: exportPath,
        downloadUrl,
        exportFormat: format,
      });

      return job;
    } catch (err) {
      const errorMsg = `Export failed: ${err}`;
      this.jobRegistry.update(jobId, {
        status: 'error',
        error: errorMsg,
        message: errorMsg,
      });
      throw err;
    }
  }

  /**
   * Create ZIP package from enhanced mod
   */
  private async createZIPPackage(
    enhancedDir: string,
    exportsDir: string,
    exportName: string,
    manifest?: MossyMaterialManifest
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(exportsDir, `${exportName}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(
          `[Bethel] ZIP created: ${zipPath} (${archive.pointer()} bytes)`
        );
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        console.error(`[Bethel] ZIP creation failed:`, err);
        reject(err);
      });

      archive.pipe(output);

      // Add material manifest if available
      if (manifest) {
        const manifestPath = path.join(exportsDir, '.mossy_material.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        archive.file(manifestPath, { name: '.mossy_material.json' });
      }

      // Add all enhanced textures
      archive.directory(enhancedDir, 'Data');

      // Add README
      const readme = this.generateModReadme(manifest);
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * Create FOMOD installer package
   */
  private async createFOMODPackage(
    jobId: string,
    modName: string,
    enhancedDir: string,
    exportsDir: string,
    textureStats?: TextureAnalysis
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create FOMOD structure
        const fomodDir = path.join(exportsDir, modName);
        const installerDir = path.join(fomodDir, 'fomod');
        fs.mkdirSync(installerDir, { recursive: true });

        // Create ModuleConfig.xml
        const moduleConfig = this.generateFOMODConfig(modName, textureStats);
        fs.writeFileSync(
          path.join(installerDir, 'ModuleConfig.xml'),
          moduleConfig
        );

        // Create Info.xml
        const infoXml = this.generateFOMODInfo(modName);
        fs.writeFileSync(path.join(installerDir, 'Info.xml'), infoXml);

        // Copy enhanced textures to Data directory
        const dataDir = path.join(fomodDir, 'Data');
        this.copyDirectory(enhancedDir, dataDir);

        // Create the FOMOD archive
        const fomodZipPath = path.join(
          exportsDir,
          `${modName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_fomod.zip`
        );
        const output = fs.createWriteStream(fomodZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(
            `[Bethel] FOMOD created: ${fomodZipPath} (${archive.pointer()} bytes)`
          );
          // Cleanup temporary directory
          fs.rmSync(fomodDir, { recursive: true, force: true });
          resolve(fomodZipPath);
        });

        archive.on('error', (err) => {
          console.error(`[Bethel] FOMOD creation failed:`, err);
          fs.rmSync(fomodDir, { recursive: true, force: true });
          reject(err);
        });

        archive.pipe(output);
        archive.directory(fomodDir, modName);
        archive.finalize();
      } catch (err) {
        console.error(`[Bethel] FOMOD creation error:`, err);
        reject(err);
      }
    });
  }

  /**
   * Generate FOMOD ModuleConfig.xml
   */
  private generateFOMODConfig(
    modName: string,
    textureStats?: TextureAnalysis
  ): string {
    const textureCount = textureStats?.totalTextures || 0;
    const typesList = [
      textureStats?.diffuseCount ? `Diffuse (${textureStats.diffuseCount})` : null,
      textureStats?.normalCount ? `Normal (${textureStats.normalCount})` : null,
      textureStats?.specularCount ? `Specular (${textureStats.specularCount})` : null,
    ].filter(Boolean).join(', ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>${this.escapeXml(modName)} - Mossy Enhanced</moduleName>
  <moduleDependencies />
  <installSteps order="Explicit">
    <installStep name="Installation">
      <optionalFileGroups order="Explicit">
        <group name="Texture Quality" type="SelectAny">
          <plugins order="Explicit">
            <plugin name="Enhanced Textures">
              <description>Install ${textureCount} enhanced textures (${typesList})</description>
              <files>
                <file source="Data" destination="Data" priority="0" />
              </files>
              <typeDescriptor type="Required" />
            </plugin>
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
  <conditionalFileInstalls />
  <requiredInstallSteps />
</config>`;
  }

  /**
   * Generate FOMOD Info.xml
   */
  private generateFOMODInfo(modName: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `<?xml version="1.0" encoding="UTF-8"?>
<fomod>
  <Name>${this.escapeXml(modName)} - Mossy Enhanced</Name>
  <Author>Mossy - Fallout 4 Modding Assistant</Author>
  <Version>1.0</Version>
  <Website>https://github.com/POINTYTHRUNDRA654/desktop-tutorial</Website>
  <Description>Enhanced textures for ${this.escapeXml(modName)} using Mossy's advanced neural texture enhancement pipeline. Features 4x-16x upscaling with AI-powered normal map detail enhancement.</Description>
  <Groups>
    <element>
      <name>TextureEnhancement</name>
    </element>
  </Groups>
</fomod>`;
  }

  /**
   * Generate mod README.txt
   */
  private generateModReadme(manifest?: MossyMaterialManifest): string {
    const materials = manifest?.materials || [];
    const materialList = materials
      .map((m) => `  - ${m.baseTexture}: ${m.name}`)
      .join('\n');

    return `========================================
Mossy Enhanced Textures - Bethel Package
========================================

This mod contains texture enhancements created by Mossy, the AI-powered Fallout 4 modding assistant.

CONTENTS:
- Enhanced 4K/8K textures with upscaling
- AI-improved normal maps with detail sharpening
- Advanced material definitions
- Full compatibility with existing mods

MATERIALS INCLUDED:
${materialList || '  (Auto-detected from mod)'}

INSTALLATION:
1. Extract this archive to your Fallout 4 Data folder
2. Enable the mod in your mod manager
3. Run Fallout 4 and enjoy enhanced visuals

UNINSTALLATION:
Remove the extracted files from your Data folder.

COMPATIBILITY:
- Works with most visual mods
- Compatible with custom ENBs and ReShade
- No conflicts with gameplay mods

SUPPORT:
For issues or questions, visit: https://github.com/POINTYTHRUNDRA654/desktop-tutorial

========================================
Enhanced with Mossy v5.4.41
========================================`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get job status
   */
  getJob(jobId: string): BethelJob | undefined {
    return this.jobRegistry.get(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(limit = 50): BethelJob[] {
    return this.jobRegistry.list().slice(0, limit);
  }

  /**
   * Extract mod name from directory structure
   */
  private extractModName(modPath: string): string {
    const entries = fs.readdirSync(modPath);
    
    // Look for common mod directory names
    const dataDir = entries.find(e => 
      e.toLowerCase() === 'data' || 
      e.toLowerCase().includes('meshes') ||
      e.toLowerCase().includes('textures')
    );

    if (dataDir) {
      // If we found data/meshes/textures, use parent name
      return path.basename(modPath);
    }

    return path.basename(modPath) || 'Unknown_Mod';
  }

  /**
   * Utility: Copy directory recursively
   */
  private copyDirectory(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Get download stream for enhanced mod
   */
  getDownloadStream(jobId: string): fs.ReadStream | null {
    const job = this.jobRegistry.get(jobId);
    if (!job || !job.enhancedModPath) return null;

    if (fs.existsSync(job.enhancedModPath)) {
      return fs.createReadStream(job.enhancedModPath);
    }
    return null;
  }
}

export default BethelIntegration;
