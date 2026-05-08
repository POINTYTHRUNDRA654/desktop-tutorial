/**
 * Mod Packaging Engine
 * Comprehensive mod packaging system for Fallout 4 modding
 * Supports 7z, ZIP, FOMOD formats and Nexus Mods integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec, spawn } from 'child_process';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);
const execAsync = promisify(exec);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PackagingSession {
  id: string;
  modPath: string;
  status: 'initialized' | 'validating' | 'configuring' | 'building' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  modInfo?: ModInfo;
  structureValidation?: StructureValidation;
  archiveSettings?: ArchiveSettings;
  createdAt: number;
  lastUpdated: number;
}

export interface ModInfo {
  name: string;
  version: string;
  author: string;
  description: string;
  category?: string;
  requirements?: string[];
  tags?: string[];
  homepage?: string;
  supportUrl?: string;
  donationUrl?: string;
  nexusId?: string;
}

export interface StructureValidation {
  valid: boolean;
  hasData: boolean;
  hasDocs: boolean;
  hasReadme: boolean;
  hasChangelog: boolean;
  fileCount: number;
  totalSize: number;
  folders: string[];
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    path?: string;
  }>;
  suggestions: string[];
}

export interface ArchiveSettings {
  modPath: string;
  outputPath: string;
  format: '7z' | 'zip' | 'fomod';
  compressionLevel: 0 | 1 | 3 | 5 | 7 | 9; // 0=none, 9=ultra
  includeFiles: string[];
  excludeFiles: string[];
  excludePatterns: string[];
  createFomod: boolean;
  fomodConfig?: FomodConfig;
}

export interface FomodConfig {
  moduleName: string;
  moduleImage?: string;
  installSteps: FomodInstallStep[];
}

export interface FomodInstallStep {
  name: string;
  visible: { dependencyType: string };
  optionalFileGroups: FomodFileGroup[];
}

export interface FomodFileGroup {
  name: string;
  type: 'SelectExactlyOne' | 'SelectAtMostOne' | 'SelectAll' | 'SelectAny';
  plugins: FomodPlugin[];
}

export interface FomodPlugin {
  name: string;
  description: string;
  image?: string;
  files: FomodFile[];
  conditionFlags: FomodFlag[];
  typeDescriptor: { type: string };
}

export interface FomodFile {
  source: string;
  destination: string;
  priority: number;
}

export interface FomodFlag {
  name: string;
  value: string;
}

export interface ArchiveResult {
  success: boolean;
  archivePath?: string;
  archiveSize?: number;
  filesIncluded?: number;
  compressionRatio?: number;
  buildTime?: number;
  error?: string;
  warnings?: string[];
}

export interface NexusPrep {
  ready: boolean;
  packagePath: string;
  fileSize: number;
  files: string[];
  checks: {
    hasReadme: boolean;
    hasChangelog: boolean;
    hasProperStructure: boolean;
    hasPermissions: boolean;
    hasScreenshots: boolean;
  };
  recommendations: string[];
  nexusTemplates: {
    description: string;
    requirements: string;
    installation: string;
    changelog: string;
  };
}

export interface ModPackage {
  modInfo: ModInfo;
  archivePath: string;
  files: string[];
  readme?: string;
  changelog?: string;
  screenshots?: string[];
}

export interface VersionInfo {
  current: string;
  next: string;
  type: 'major' | 'minor' | 'patch';
  changeType: string;
}

// ============================================================================
// MOD PACKAGING ENGINE
// ============================================================================

export class ModPackagingEngine {
  private activeSessions: Map<string, PackagingSession> = new Map();
  private sessionCounter = 0;

  /**
   * Start a new packaging session
   */
  async startPackaging(modPath: string): Promise<PackagingSession> {
    if (!fs.existsSync(modPath)) {
      throw new Error(`Mod path does not exist: ${modPath}`);
    }

    const stat = await statAsync(modPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${modPath}`);
    }

    const sessionId = `pkg_${Date.now()}_${this.sessionCounter++}`;
    
    const session: PackagingSession = {
      id: sessionId,
      modPath,
      status: 'initialized',
      currentStep: 1,
      totalSteps: 8,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    this.activeSessions.set(sessionId, session);

    // Perform initial validation
    session.status = 'validating';
    session.structureValidation = await this.validateStructure(modPath);
    session.status = 'configuring';
    session.lastUpdated = Date.now();

    return session;
  }

  /**
   * Validate mod folder structure
   */
  async validateStructure(modPath: string): Promise<StructureValidation> {
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; path?: string }> = [];
    const suggestions: string[] = [];
    const folders: string[] = [];

    // Check for required folders
    const hasData = fs.existsSync(path.join(modPath, 'Data'));
    const hasDocs = fs.existsSync(path.join(modPath, 'Docs')) || fs.existsSync(path.join(modPath, 'Documentation'));
    
    // Check for documentation files
    const files = fs.readdirSync(modPath);
    const hasReadme = files.some(f => f.toLowerCase().startsWith('readme'));
    const hasChangelog = files.some(f => f.toLowerCase().includes('changelog') || f.toLowerCase().includes('changes'));

    if (!hasData) {
      issues.push({
        severity: 'warning',
        message: 'No Data folder found - mod may not follow standard structure',
        path: modPath
      });
      suggestions.push('Create a Data folder to organize mod files');
    }

    if (!hasReadme) {
      issues.push({
        severity: 'warning',
        message: 'No README file found',
        path: modPath
      });
      suggestions.push('Add a README.md or README.txt file describing your mod');
    }

    if (!hasChangelog) {
      issues.push({
        severity: 'info',
        message: 'No changelog file found',
        path: modPath
      });
      suggestions.push('Consider adding a CHANGELOG.md to track version changes');
    }

    // Scan all files
    let fileCount = 0;
    let totalSize = 0;

    const scanDir = async (dir: string): Promise<void> => {
      const entries = await readdirAsync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const relativePath = path.relative(modPath, fullPath);
          folders.push(relativePath);
          await scanDir(fullPath);
        } else {
          fileCount++;
          const stat = await statAsync(fullPath);
          totalSize += stat.size;

          // Check for problematic files
          if (entry.name.toLowerCase().endsWith('.bak') || entry.name.toLowerCase().endsWith('.tmp')) {
            issues.push({
              severity: 'warning',
              message: `Temporary/backup file should be excluded: ${entry.name}`,
              path: fullPath
            });
          }

          if (entry.name.toLowerCase().includes('desktop.ini') || entry.name.toLowerCase().includes('thumbs.db')) {
            issues.push({
              severity: 'info',
              message: `System file should be excluded: ${entry.name}`,
              path: fullPath
            });
          }
        }
      }
    };

    await scanDir(modPath);

    // Check total size
    if (totalSize > 500 * 1024 * 1024) { // > 500MB
      issues.push({
        severity: 'warning',
        message: `Mod is very large (${(totalSize / 1024 / 1024).toFixed(2)}MB) - consider splitting into multiple archives`
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      hasData,
      hasDocs,
      hasReadme,
      hasChangelog,
      fileCount,
      totalSize,
      folders,
      issues,
      suggestions
    };
  }

  /**
   * Create archive package
   */
  async createArchive(settings: ArchiveSettings): Promise<ArchiveResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!fs.existsSync(settings.modPath)) {
        throw new Error('Mod path does not exist');
      }

      // Ensure output directory exists
      const outputDir = path.dirname(settings.outputPath);
      if (!fs.existsSync(outputDir)) {
        await mkdirAsync(outputDir, { recursive: true });
      }

      let result: ArchiveResult;

      if (settings.format === 'fomod' && settings.createFomod) {
        result = await this.createFomodArchive(settings);
      } else if (settings.format === '7z') {
        result = await this.create7zArchive(settings);
      } else {
        result = await this.createZipArchive(settings);
      }

      result.buildTime = Date.now() - startTime;
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        buildTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate README file
   */
  async generateReadme(modInfo: ModInfo, template: string = 'default'): Promise<string> {
    const templates: Record<string, string> = {
      default: this.getDefaultReadmeTemplate(modInfo),
      nexus: this.getNexusReadmeTemplate(modInfo),
      github: this.getGitHubReadmeTemplate(modInfo),
      simple: this.getSimpleReadmeTemplate(modInfo)
    };

    return templates[template] || templates['default'];
  }

  /**
   * Append to changelog
   */
  async appendChangelog(
    changelogPath: string,
    version: string,
    changes: string[]
  ): Promise<void> {
    let existingContent = '';

    // Read existing changelog if it exists
    if (fs.existsSync(changelogPath)) {
      existingContent = await readFileAsync(changelogPath, 'utf-8');
    }

    // Format new entry
    const date = new Date().toISOString().split('T')[0];
    const newEntry = `
## [${version}] - ${date}

${changes.map(change => `- ${change}`).join('\n')}

`;

    // Prepend new entry (keep latest at top)
    const updatedContent = existingContent
      ? `${newEntry}\n${existingContent}`
      : `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newEntry}`;

    await writeFileAsync(changelogPath, updatedContent, 'utf-8');
  }

  /**
   * Prepare mod for Nexus Mods upload
   */
  async prepareForNexus(modPackage: ModPackage): Promise<NexusPrep> {
    const checks = {
      hasReadme: !!modPackage.readme,
      hasChangelog: !!modPackage.changelog,
      hasProperStructure: modPackage.files.some(f => f.includes('Data/')),
      hasPermissions: true, // Manual check
      hasScreenshots: (modPackage.screenshots?.length || 0) > 0
    };

    const recommendations: string[] = [];

    if (!checks.hasReadme) {
      recommendations.push('Add a README file with mod description and installation instructions');
    }

    if (!checks.hasChangelog) {
      recommendations.push('Add a CHANGELOG file to track version history');
    }

    if (!checks.hasScreenshots) {
      recommendations.push('Add screenshots to showcase your mod (recommended: 5-10 images)');
    }

    if (!modPackage.modInfo.requirements || modPackage.modInfo.requirements.length === 0) {
      recommendations.push('List any required mods or DLCs in the mod information');
    }

    const stat = await statAsync(modPackage.archivePath);
    const fileSize = stat.size;

    // Generate Nexus-compatible templates
    const nexusTemplates = {
      description: this.generateNexusDescription(modPackage.modInfo),
      requirements: this.generateNexusRequirements(modPackage.modInfo),
      installation: this.generateNexusInstallation(modPackage.modInfo),
      changelog: modPackage.changelog || 'Initial release'
    };

    return {
      ready: Object.values(checks).every(v => v === true),
      packagePath: modPackage.archivePath,
      fileSize,
      files: modPackage.files,
      checks,
      recommendations,
      nexusTemplates
    };
  }

  /**
   * Increment version number
   */
  async incrementVersion(
    currentVersion: string,
    type: 'major' | 'minor' | 'patch'
  ): Promise<string> {
    const parts = currentVersion.split('.').map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error('Invalid version format. Expected: X.Y.Z');
    }

    let [major, minor, patch] = parts;

    switch (type) {
      case 'major':
        major++;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor++;
        patch = 0;
        break;
      case 'patch':
        patch++;
        break;
    }

    return `${major}.${minor}.${patch}`;
  }

  /**
   * Get packaging session
   */
  getSession(sessionId: string): PackagingSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<PackagingSession>): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastUpdated: Date.now() });
      this.activeSessions.set(sessionId, session);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async create7zArchive(settings: ArchiveSettings): Promise<ArchiveResult> {
    // Check if 7z is available
    const sevenZipPath = await this.find7zExecutable();

    if (!sevenZipPath) {
      throw new Error('7-Zip not found. Please install 7-Zip to create .7z archives.');
    }

    const compressionArgs = [
      'a', // Add to archive
      '-t7z', // Archive type
      `-mx${settings.compressionLevel}`, // Compression level
      settings.outputPath,
      path.join(settings.modPath, '*')
    ];

    // Add exclusions
    for (const pattern of settings.excludePatterns) {
      compressionArgs.push(`-xr!${pattern}`);
    }

    try {
      const { stdout } = await execAsync(`"${sevenZipPath}" ${compressionArgs.join(' ')}`);

      const stat = await statAsync(settings.outputPath);
      const originalSize = await this.calculateDirectorySize(settings.modPath);

      return {
        success: true,
        archivePath: settings.outputPath,
        archiveSize: stat.size,
        filesIncluded: settings.includeFiles.length,
        compressionRatio: (1 - stat.size / originalSize) * 100,
        warnings: []
      };
    } catch (error: any) {
      throw new Error(`7-Zip compression failed: ${error.message}`);
    }
  }

  private async createZipArchive(settings: ArchiveSettings): Promise<ArchiveResult> {
    // Use Node.js built-in archiver or external zip tool
    const archiver = require('archiver');
    const output = fs.createWriteStream(settings.outputPath);
    const archive = archiver('zip', {
      zlib: { level: settings.compressionLevel }
    });

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        const stat = await statAsync(settings.outputPath);
        const originalSize = await this.calculateDirectorySize(settings.modPath);

        resolve({
          success: true,
          archivePath: settings.outputPath,
          archiveSize: stat.size,
          filesIncluded: archive.pointer(), // File count
          compressionRatio: (1 - stat.size / originalSize) * 100,
          warnings: []
        });
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add files
      archive.directory(settings.modPath, false);

      archive.finalize();
    });
  }

  private async createFomodArchive(settings: ArchiveSettings): Promise<ArchiveResult> {
    if (!settings.fomodConfig) {
      throw new Error('FOMOD configuration is required for FOMOD archives');
    }

    // Create FOMOD structure
    const fomodDir = path.join(settings.modPath, 'fomod');
    if (!fs.existsSync(fomodDir)) {
      await mkdirAsync(fomodDir, { recursive: true });
    }

    // Generate ModuleConfig.xml
    const moduleConfig = this.generateFomodModuleConfig(settings.fomodConfig);
    await writeFileAsync(path.join(fomodDir, 'ModuleConfig.xml'), moduleConfig, 'utf-8');

    // Generate Info.xml
    const infoXml = this.generateFomodInfo(settings.fomodConfig);
    await writeFileAsync(path.join(fomodDir, 'info.xml'), infoXml, 'utf-8');

    // Create archive with FOMOD structure
    return this.create7zArchive(settings);
  }

  private generateFomodModuleConfig(config: FomodConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>${this.escapeXml(config.moduleName)}</moduleName>
  ${config.moduleImage ? `<moduleImage path="${this.escapeXml(config.moduleImage)}" />` : ''}
  
  <installSteps order="Explicit">
    ${config.installSteps.map(step => `
    <installStep name="${this.escapeXml(step.name)}">
      <visible>
        <dependencyType>
          <defaultType name="Optional"/>
        </dependencyType>
      </visible>
      <optionalFileGroups order="Explicit">
        ${step.optionalFileGroups.map(group => `
        <group name="${this.escapeXml(group.name)}" type="${group.type}">
          <plugins order="Explicit">
            ${group.plugins.map(plugin => `
            <plugin name="${this.escapeXml(plugin.name)}">
              <description>${this.escapeXml(plugin.description)}</description>
              ${plugin.image ? `<image path="${this.escapeXml(plugin.image)}" />` : ''}
              <files>
                ${plugin.files.map(file => `
                <file source="${this.escapeXml(file.source)}" destination="${this.escapeXml(file.destination)}" priority="${file.priority}" />
                `).join('')}
              </files>
              <typeDescriptor>
                <type name="${plugin.typeDescriptor.type}" />
              </typeDescriptor>
            </plugin>
            `).join('')}
          </plugins>
        </group>
        `).join('')}
      </optionalFileGroups>
    </installStep>
    `).join('')}
  </installSteps>
</config>`;
  }

  private generateFomodInfo(config: FomodConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<fomod>
  <Name>${this.escapeXml(config.moduleName)}</Name>
  <Version>1.0.0</Version>
</fomod>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async find7zExecutable(): Promise<string | null> {
    const possiblePaths = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe',
      path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', '7-Zip', '7z.exe')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Try PATH
    try {
      await execAsync('7z --help');
      return '7z';
    } catch {
      return null;
    }
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const scan = async (dir: string) => {
      const entries = await readdirAsync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          const stat = await statAsync(fullPath);
          totalSize += stat.size;
        }
      }
    };

    await scan(dirPath);
    return totalSize;
  }

  // ============================================================================
  // README TEMPLATES
  // ============================================================================

  private getDefaultReadmeTemplate(modInfo: ModInfo): string {
    return `# ${modInfo.name}

**Version:** ${modInfo.version}  
**Author:** ${modInfo.author}

## Description

${modInfo.description}

## Requirements

${modInfo.requirements && modInfo.requirements.length > 0 
  ? modInfo.requirements.map(req => `- ${req}`).join('\n')
  : 'No special requirements'}

## Installation

1. Extract the archive
2. Copy the contents to your Fallout 4 Data folder
3. Enable the mod in your mod manager

## Uninstallation

1. Disable the mod in your mod manager
2. Delete the mod files from your Data folder

## Support

${modInfo.supportUrl ? `For support, visit: ${modInfo.supportUrl}` : 'For support, contact the author'}

## Credits

Created by ${modInfo.author}

${modInfo.homepage ? `Homepage: ${modInfo.homepage}` : ''}
${modInfo.donationUrl ? `Support the author: ${modInfo.donationUrl}` : ''}

## License

All rights reserved.
`;
  }

  private getNexusReadmeTemplate(modInfo: ModInfo): string {
    return `[center][size=6][b]${modInfo.name}[/b][/size]
[size=4]Version ${modInfo.version}[/size]
[size=3]by ${modInfo.author}[/size][/center]

[size=5][b]Description[/b][/size]
${modInfo.description}

[size=5][b]Requirements[/b][/size]
${modInfo.requirements && modInfo.requirements.length > 0 
  ? modInfo.requirements.map(req => `[*]${req}`).join('\n')
  : '[i]No special requirements[/i]'}

[size=5][b]Installation[/b][/size]
[list=1]
[*]Download with mod manager
[*]Install and activate
[*]Enjoy!
[/list]

[size=5][b]Compatibility[/b][/size]
Should be compatible with most mods.

[size=5][b]Credits[/b][/size]
Created by ${modInfo.author}

${modInfo.donationUrl ? `[size=4][b][url=${modInfo.donationUrl}]Support the Author[/url][/b][/size]` : ''}
`;
  }

  private getGitHubReadmeTemplate(modInfo: ModInfo): string {
    return `# ${modInfo.name}

![Version](https://img.shields.io/badge/version-${modInfo.version}-blue)
${modInfo.nexusId ? `![Nexus](https://img.shields.io/badge/nexus-${modInfo.nexusId}-orange)` : ''}

## 📖 Description

${modInfo.description}

## 📋 Requirements

${modInfo.requirements && modInfo.requirements.length > 0 
  ? modInfo.requirements.map(req => `- ${req}`).join('\n')
  : '_No special requirements_'}

## 🚀 Installation

### Using Mod Manager (Recommended)
1. Download the mod from Nexus Mods
2. Install using your preferred mod manager (Mod Organizer 2, Vortex, etc.)
3. Enable the mod
4. Launch the game

### Manual Installation
1. Extract the archive
2. Copy the \`Data\` folder contents to your Fallout 4 \`Data\` folder
3. Enable the ESP/ESM in your load order
4. Launch the game

## 🔧 Configuration

[Add configuration instructions here if applicable]

## 🗑️ Uninstallation

1. Disable the mod in your mod manager
2. Remove the mod files from your \`Data\` folder
3. Clean your save if necessary

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

All rights reserved © ${new Date().getFullYear()} ${modInfo.author}

## 💖 Support

${modInfo.donationUrl ? `If you enjoy this mod, consider [supporting the author](${modInfo.donationUrl})!` : ''}

## 🔗 Links

${modInfo.homepage ? `- [Homepage](${modInfo.homepage})` : ''}
${modInfo.nexusId ? `- [Nexus Mods](https://www.nexusmods.com/fallout4/mods/${modInfo.nexusId})` : ''}
${modInfo.supportUrl ? `- [Support](${modInfo.supportUrl})` : ''}

---

**Created by ${modInfo.author}**
`;
  }

  private getSimpleReadmeTemplate(modInfo: ModInfo): string {
    return `${modInfo.name} v${modInfo.version}
by ${modInfo.author}

${modInfo.description}

REQUIREMENTS:
${modInfo.requirements && modInfo.requirements.length > 0 
  ? modInfo.requirements.map(req => `- ${req}`).join('\n')
  : '- None'}

INSTALLATION:
1. Extract archive
2. Copy to Fallout 4 Data folder
3. Enable in mod manager

${modInfo.homepage ? `\nMore info: ${modInfo.homepage}` : ''}
`;
  }

  // ============================================================================
  // NEXUS TEMPLATES
  // ============================================================================

  private generateNexusDescription(modInfo: ModInfo): string {
    return `[size=5][b]${modInfo.name}[/b][/size]

${modInfo.description}

[size=4][b]Features:[/b][/size]
[list]
[*]High-quality assets
[*]Fully voiced (if applicable)
[*]Quest integration (if applicable)
[*]Compatible with popular mods
[/list]

${modInfo.tags && modInfo.tags.length > 0 ? `[b]Tags:[/b] ${modInfo.tags.join(', ')}` : ''}
`;
  }

  private generateNexusRequirements(modInfo: ModInfo): string {
    if (!modInfo.requirements || modInfo.requirements.length === 0) {
      return '[i]No special requirements[/i]';
    }

    return `[list]
${modInfo.requirements.map(req => `[*]${req}`).join('\n')}
[/list]`;
  }

  private generateNexusInstallation(modInfo: ModInfo): string {
    return `[size=4][b]Installation:[/b][/size]

[size=3][b]Using Mod Manager (Recommended):[/b][/size]
[list=1]
[*]Download with Vortex or Mod Organizer 2
[*]Install and activate
[*]Launch the game
[/list]

[size=3][b]Manual Installation:[/b][/size]
[list=1]
[*]Extract the archive
[*]Copy the Data folder contents to your Fallout 4 Data folder
[*]Enable the plugin in your load order
[*]Launch the game
[/list]

[size=4][b]Uninstallation:[/b][/size]
[list=1]
[*]Disable the mod in your mod manager
[*]Delete the mod files
[/list]
`;
  }
}

// Singleton instance
export const modPackaging = new ModPackagingEngine();
