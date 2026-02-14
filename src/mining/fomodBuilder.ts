/**
 * FOMOD Builder Engine
 * Creates professional mod installers with visual builder, XML generation, and preview
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type {
  FOMODProject,
  FOMODStep,
  FOMODGroup,
  FOMODOption,
  FOMODFile,
  FOMODFlags,
  FOMODCondition,
  FOMODValidation,
  FOMODValidationError,
  FOMODValidationWarning,
} from '../shared/types';

// ============================================================================
// VALIDATION & PREVIEW INTERFACES
// ============================================================================

export interface PreviewResult {
  success: boolean;
  steps: PreviewStep[];
  duration: number;
}

export interface PreviewStep {
  stepName: string;
  groups: PreviewGroup[];
  visible: boolean;
  conditionsMet: boolean;
}

export interface PreviewGroup {
  groupName: string;
  options: PreviewOption[];
  selectionType: string;
}

export interface PreviewOption {
  name: string;
  description: string;
  image?: string;
  type: string;
  selected: boolean;
  enabled: boolean;
}

export interface ExportResult {
  success: boolean;
  fomodPath: string;
  moduleConfigPath: string;
  infoXmlPath: string;
  filesIncluded: number;
  totalSize: number;
  duration: number;
  error?: string;
}

// ============================================================================
// FOMOD BUILDER ENGINE
// ============================================================================

export class FOMODBuilderEngine {
  private xmlBuilder: XMLBuilder;
  private xmlParser: XMLParser;

  constructor() {
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Create a new FOMOD project from a mod directory
   */
  async createFOMOD(modPath: string, modInfo?: any): Promise<FOMODProject> {
    // Analyze mod structure
    const files = await this.scanModDirectory(modPath);
    
    // Create default step
    const defaultStep: FOMODStep = {
      id: 'step_1',
      name: 'Installation Options',
      description: 'Choose installation options',
      type: 'checkbox',
      sortOrder: 0,
      groups: [
        {
          id: 'group_1',
          name: 'Main Files',
          type: 'SelectExactlyOne',
          options: [
            {
              id: 'option_1',
              name: 'Complete Installation',
              description: 'Install all mod files',
              files: files.map(f => ({
                source: f.relativePath,
                destination: f.relativePath,
                priority: 0,
                alwaysInstall: true,
              })),
              flags: {
                selected: false,
                required: true,
                recommended: true,
              },
            },
          ],
        },
      ],
    };

    const project: FOMODProject = {
      name: modInfo?.name || path.basename(modPath),
      author: modInfo?.author || 'Unknown',
      version: modInfo?.version || '1.0.0',
      website: modInfo?.homepage,
      description: modInfo?.description || 'No description provided',
      steps: [defaultStep],
      requiredFiles: [],
      headerImage: 'fomod/images/header.png',
    };

    return project;
  }

  /**
   * Generate ModuleConfig.xml
   */
  async generateModuleConfig(fomod: FOMODProject): Promise<string> {
    const config: any = {
      config: {
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@_xsi:noNamespaceSchemaLocation': 'http://qconsulting.ca/fo3/ModConfig5.0.xsd',
        moduleName: fomod.name,
        moduleImage: {
          '@_path': 'fomod/images/header.png'
        },
        installSteps: {
          '@_order': 'Explicit',
          installStep: fomod.steps.map(step => this.generateStepXML(step)),
        },
        conditionalFileInstalls: this.generateConditionalFiles(fomod),
      },
    };

    return this.xmlBuilder.build(config);
  }

  /**
   * Generate info.xml
   */
  async generateInfoXML(modInfo: any): Promise<string> {
    const info = {
      fomod: {
        Name: modInfo.name,
        Author: modInfo.author,
        Version: modInfo.version,
        Website: modInfo.website || '',
        Description: modInfo.description,
        Id: modInfo.id || '0',
        Groups: {
          element: 'Main'
        }
      },
    };

    return this.xmlBuilder.build(info);
  }

  /**
   * Validate FOMOD project
   */
  async validateFOMOD(fomodPath: string): Promise<FOMODValidation> {
    const errors: FOMODValidationError[] = [];
    const warnings: FOMODValidationWarning[] = [];
    let fileCount = 0;
    let estimatedSize = 0;

    try {
      // Check for required files
      const moduleConfigPath = path.join(fomodPath, 'fomod', 'ModuleConfig.xml');
      const infoXmlPath = path.join(fomodPath, 'fomod', 'info.xml');

      if (!await fs.pathExists(moduleConfigPath)) {
        errors.push({
          severity: 'error',
          message: 'ModuleConfig.xml is missing',
          path: moduleConfigPath,
        });
      } else {
        // Validate XML structure
        const xmlContent = await fs.readFile(moduleConfigPath, 'utf-8');
        try {
          this.xmlParser.parse(xmlContent);
        } catch (err: any) {
          errors.push({
            severity: 'error',
            message: `Invalid XML in ModuleConfig.xml: ${err.message}`,
            path: moduleConfigPath,
          });
        }
      }

      if (!await fs.pathExists(infoXmlPath)) {
        warnings.push({
          severity: 'warning',
          message: 'info.xml is missing (recommended but not required)',
          path: infoXmlPath,
          suggestion: 'Create info.xml for better mod manager compatibility',
        });
      }

      // Count files and calculate size
      const files = await this.scanModDirectory(fomodPath);
      fileCount = files.length;
      
      for (const file of files) {
        const stats = await fs.stat(file.fullPath);
        estimatedSize += stats.size;
      }

      // Check for common issues
      const imagesPath = path.join(fomodPath, 'fomod', 'images');
      if (!await fs.pathExists(imagesPath)) {
        warnings.push({
          severity: 'warning',
          message: 'No images folder found',
          suggestion: 'Add images to fomod/images/ for better user experience',
        });
      }

    } catch (err: any) {
      errors.push({
        severity: 'error',
        message: `Validation error: ${err.message}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fileCount,
      estimatedSize,
    };
  }

  /**
   * Preview installer flow
   */
  async previewInstaller(fomod: FOMODProject, selections: Map<string, string[]> = new Map()): Promise<PreviewResult> {
    const startTime = Date.now();
    const steps: PreviewStep[] = [];

    try {
      for (const step of fomod.steps) {
        const previewStep: PreviewStep = {
          stepName: step.name,
          groups: [],
          visible: this.evaluateConditions(step.conditions, selections),
          conditionsMet: true,
        };

        for (const group of step.groups) {
          const previewGroup: PreviewGroup = {
            groupName: group.name,
            selectionType: group.type,
            options: [],
          };

          for (const option of group.options) {
            const enabled = !option.conditions || this.evaluateConditions(option.conditions, selections);
            
            previewGroup.options.push({
              name: option.name,
              description: option.description,
              image: option.image,
              type: option.flags.required ? 'Required' : option.flags.recommended ? 'Recommended' : 'Optional',
              selected: selections.get(step.id)?.includes(option.id) || false,
              enabled,
            });
          }

          previewStep.groups.push(previewGroup);
        }

        steps.push(previewStep);
      }

      return {
        success: true,
        steps,
        duration: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        steps: [],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Export FOMOD to directory
   */
  async exportFOMOD(fomod: FOMODProject, outputPath: string, sourceModPath: string): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Create fomod directory structure
      const fomodDir = path.join(outputPath, 'fomod');
      const imagesDir = path.join(fomodDir, 'images');
      
      await fs.ensureDir(fomodDir);
      await fs.ensureDir(imagesDir);

      // Generate and write ModuleConfig.xml
      const moduleConfig = await this.generateModuleConfig(fomod);
      const moduleConfigPath = path.join(fomodDir, 'ModuleConfig.xml');
      await fs.writeFile(moduleConfigPath, moduleConfig, 'utf-8');

      // Generate and write info.xml
      const infoXml = await this.generateInfoXML({
        name: fomod.name,
        author: fomod.author,
        version: fomod.version,
        website: fomod.website,
        description: fomod.description,
        id: '0',
      });
      const infoXmlPath = path.join(fomodDir, 'info.xml');
      await fs.writeFile(infoXmlPath, infoXml, 'utf-8');

      // Copy mod files
      let filesIncluded = 0;
      let totalSize = 0;

      const allFilePatterns = this.collectAllFilePatterns(fomod);
      
      for (const pattern of allFilePatterns) {
        const sourcePath = path.join(sourceModPath, pattern.source);
        const destPath = path.join(outputPath, pattern.destination);

        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, destPath);
          
          const stats = await fs.stat(sourcePath);
          if (stats.isDirectory()) {
            const files = await this.scanModDirectory(sourcePath);
            filesIncluded += files.length;
            for (const file of files) {
              const fileStats = await fs.stat(file.fullPath);
              totalSize += fileStats.size;
            }
          } else {
            filesIncluded++;
            totalSize += stats.size;
          }
        }
      }

      // Copy images if they exist
      const sourceImagesDir = path.join(sourceModPath, 'fomod', 'images');
      if (await fs.pathExists(sourceImagesDir)) {
        await fs.copy(sourceImagesDir, imagesDir);
      }

      return {
        success: true,
        fomodPath: outputPath,
        moduleConfigPath,
        infoXmlPath,
        filesIncluded,
        totalSize,
        duration: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        fomodPath: outputPath,
        moduleConfigPath: '',
        infoXmlPath: '',
        filesIncluded: 0,
        totalSize: 0,
        duration: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate XML for a single step
   */
  private generateStepXML(step: FOMODStep): any {
    const stepXml: any = {
      '@_name': step.name,
      visible: step.conditions ? this.generateConditionsXML(step.conditions) : undefined,
      optionalFileGroups: {
        '@_order': 'Explicit',
        group: step.groups.map(group => ({
          '@_name': group.name,
          '@_type': group.type,
          plugins: {
            '@_order': 'Explicit',
            plugin: group.options.map(option => ({
              '@_name': option.name,
              description: option.description,
              image: option.image ? { '@_path': `fomod/images/${option.image}` } : undefined,
              files: {
                file: option.files.map(file => ({
                  '@_source': file.source,
                  '@_destination': file.destination,
                  '@_priority': file.priority,
                  '@_alwaysInstall': file.alwaysInstall ? 'true' : 'false',
                })),
              },
              typeDescriptor: {
                type: {
                  '@_name': option.flags.required ? 'Required' : option.flags.recommended ? 'Recommended' : 'Optional',
                },
              },
            })),
          },
        })),
      },
    };

    return stepXml;
  }

  /**
   * Generate conditional files XML
   */
  private generateConditionalFiles(fomod: FOMODProject): any {
    // Collect all conditional file installations
    const conditionalPatterns: any[] = [];

    for (const step of fomod.steps) {
      for (const group of step.groups) {
        for (const option of group.options) {
          if (option.conditions && option.files.length > 0) {
            conditionalPatterns.push({
              patterns: {
                pattern: option.files.map(f => ({
                  '@_source': f.source,
                  '@_destination': f.destination,
                })),
              },
              dependencies: this.generateConditionsXML(option.conditions),
            });
          }
        }
      }
    }

    return conditionalPatterns.length > 0 ? { pattern: conditionalPatterns } : undefined;
  }

  /**
   * Generate conditions XML
   */
  private generateConditionsXML(conditions: FOMODCondition[]): any {
    if (conditions.length === 0) return undefined;

    if (conditions.length === 1) {
      return this.generateSingleConditionXML(conditions[0]);
    }

    // Multiple conditions - need operator
    const operator = conditions[0].operator || 'AND';
    return {
      [operator.toLowerCase()]: conditions.map(c => this.generateSingleConditionXML(c)),
    };
  }

  /**
   * Generate single condition XML
   */
  private generateSingleConditionXML(condition: FOMODCondition): any {
    switch (condition.type) {
      case 'flag':
        if (condition.operator === 'equals') {
          return { flagDependency: { '@_flag': condition.value, '@_value': 'Active' } };
        } else if (condition.operator === 'notEquals') {
          return { flagDependency: { '@_flag': condition.value, '@_value': 'Inactive' } };
        }
        break;
      case 'file':
        if (condition.operator === 'equals') {
          return { fileDependency: { '@_file': condition.value, '@_state': 'Active' } };
        } else if (condition.operator === 'notEquals') {
          return { fileDependency: { '@_file': condition.value, '@_state': 'Inactive' } };
        }
        break;
      case 'version':
        return { versionDependency: { '@_version': condition.value } };
      default:
        return {};
    }
    return {};
  }

  /**
   * Evaluate conditions for preview
   */
  private evaluateConditions(conditions: FOMODCondition[] | undefined, selections: Map<string, string[]>): boolean {
    if (!conditions || conditions.length === 0) return true;

    // AND logic: all conditions must be true
    for (const condition of conditions) {
      const result = this.evaluateSingleCondition(condition, selections);
      if (!result) return false;
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateSingleCondition(condition: FOMODCondition, selections: Map<string, string[]>): boolean {
    // For preview purposes, check if flags are set based on selections
    if (condition.type === 'flag') {
      if (condition.operator === 'equals') {
        for (const selected of selections.values()) {
          if (selected.includes(condition.value)) return true;
        }
        return false;
      } else if (condition.operator === 'notEquals') {
        for (const selected of selections.values()) {
          if (selected.includes(condition.value)) return false;
        }
        return true;
      }
    }
    
    // For file conditions, always return true in preview
    return true;
  }

  /**
   * Scan mod directory for files
   */
  private async scanModDirectory(dirPath: string): Promise<{ relativePath: string; fullPath: string; isDirectory: boolean }[]> {
    const files: { relativePath: string; fullPath: string; isDirectory: boolean }[] = [];

    async function scan(currentPath: string, basePath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        files.push({
          relativePath,
          fullPath,
          isDirectory: entry.isDirectory(),
        });

        if (entry.isDirectory()) {
          await scan(fullPath, basePath);
        }
      }
    }

    await scan(dirPath, dirPath);
    return files;
  }

  /**
   * Collect all unique file patterns from FOMOD
   */
  private collectAllFilePatterns(fomod: FOMODProject): FOMODFile[] {
    const patterns: FOMODFile[] = [];
    const seen = new Set<string>();

    for (const step of fomod.steps) {
      for (const group of step.groups) {
        for (const option of group.options) {
          for (const file of option.files) {
            const key = `${file.source}:${file.destination}`;
            if (!seen.has(key)) {
              seen.add(key);
              patterns.push(file);
            }
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Load FOMOD project from disk
   */
  async loadFOMOD(fomodPath: string): Promise<FOMODProject | null> {
    try {
      const moduleConfigPath = path.join(fomodPath, 'fomod', 'ModuleConfig.xml');
      const infoXmlPath = path.join(fomodPath, 'fomod', 'info.xml');

      if (!await fs.pathExists(moduleConfigPath)) {
        return null;
      }

      const moduleConfigXml = await fs.readFile(moduleConfigPath, 'utf-8');
      const parsedConfig = this.xmlParser.parse(moduleConfigXml);

      let info: any = {};
      if (await fs.pathExists(infoXmlPath)) {
        const infoXml = await fs.readFile(infoXmlPath, 'utf-8');
        info = this.xmlParser.parse(infoXml);
      }

      // Convert XML to FOMOD project structure
      const project: FOMODProject = {
        name: parsedConfig.config?.moduleName || 'Untitled FOMOD',
        author: info.fomod?.Author || 'Unknown',
        version: info.fomod?.Version || '1.0.0',
        website: info.fomod?.Website,
        description: info.fomod?.Description || '',
        steps: [],
        requiredFiles: [],
        headerImage: 'fomod/images/header.png',
      };

      return project;
    } catch (err) {
      console.error('Failed to load FOMOD:', err);
      return null;
    }
  }

  /**
   * Save FOMOD project metadata
   */
  async saveFOMODProject(fomod: FOMODProject, projectPath: string): Promise<boolean> {
    try {
      await fs.writeJson(projectPath, fomod, { spaces: 2 });
      return true;
    } catch (err) {
      console.error('Failed to save FOMOD project:', err);
      return false;
    }
  }
}

// Singleton instance
export const fomodBuilderEngine = new FOMODBuilderEngine();
