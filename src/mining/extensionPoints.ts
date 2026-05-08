import {
  ExtensionType,
  ExtensionPointRegistry,
  ExtensionContext,
  ImporterExtension,
  ExporterExtension,
  ValidatorExtension,
  ToolWrapperExtension,
  LanguageExtension,
  ThemeExtension,
  SnippetExtension,
  CommandExtension,
  PanelExtension,
  WizardExtension,
  MossyPluginAPI,
} from '../shared/types';

// ============================================================================
// Extension Point Registry Implementation
// ============================================================================

export class ExtensionRegistryImpl implements ExtensionPointRegistry {
  private registry: Map<ExtensionType, Map<string, { extension: any; pluginId: string; context: ExtensionContext }>> = new Map();

  constructor() {
    // Initialize all extension type collections
    const types: ExtensionType[] = [
      'importer',
      'exporter',
      'validator',
      'tool-wrapper',
      'language',
      'theme',
      'snippet',
      'command',
      'panel',
      'wizard',
    ];

    for (const type of types) {
      this.registry.set(type, new Map());
    }
  }

  register<T extends ExtensionType>(type: T, extension: any, pluginId: string, api?: MossyPluginAPI): void {
    if (!this.registry.has(type)) {
      this.registry.set(type, new Map());
    }

    const extensions = this.registry.get(type)!;

    // Create extension context
    const context: ExtensionContext = {
      extensionId: extension.id || `${pluginId}-${type}-${Date.now()}`,
      pluginId,
      type,
      api: api || ({} as MossyPluginAPI),
    };

    // Validate extension structure
    this.validateExtension(type, extension);

    extensions.set(context.extensionId, {
      extension,
      pluginId,
      context,
    });

    console.log(`Registered extension: ${context.extensionId} (${type}) from plugin ${pluginId}`);
  }

  unregister(extensionId: string): void {
    for (const [type, extensions] of this.registry) {
      if (extensions.has(extensionId)) {
        extensions.delete(extensionId);
        console.log(`Unregistered extension: ${extensionId}`);
        return;
      }
    }
    console.warn(`Extension not found: ${extensionId}`);
  }

  get<T extends ExtensionType>(type: T, extensionId?: string): any | any[] | null {
    const extensions = this.registry.get(type);
    if (!extensions) {
      return null;
    }

    if (extensionId) {
      const entry = extensions.get(extensionId);
      return entry?.extension || null;
    }

    return Array.from(extensions.values()).map((entry) => entry.extension);
  }

  getForType(type: ExtensionType): any[] {
    const extensions = this.registry.get(type);
    if (!extensions) {
      return [];
    }
    return Array.from(extensions.values()).map((entry) => entry.extension);
  }

  async invoke<T extends ExtensionType>(
    type: T,
    extensionId: string,
    method: string,
    ...args: any[]
  ): Promise<any> {
    const extensions = this.registry.get(type);
    if (!extensions) {
      throw new Error(`Unknown extension type: ${type}`);
    }

    const entry = extensions.get(extensionId);
    if (!entry) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    const extension = entry.extension;
    if (typeof extension[method] !== 'function') {
      throw new Error(`Method ${method} not found in extension ${extensionId}`);
    }

    try {
      return await extension[method](...args);
    } catch (error) {
      throw new Error(
        `Extension invocation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateExtension(type: ExtensionType, extension: any): void {
    // Basic validation - ensure extension has required properties
    if (!extension.id) {
      throw new Error(`Extension must have an 'id' property`);
    }

    if (!extension.name) {
      throw new Error(`Extension must have a 'name' property`);
    }

    // Type-specific validation
    switch (type) {
      case 'importer':
        if (!Array.isArray(extension.fileTypes)) {
          throw new Error(`Importer extension must have 'fileTypes' array`);
        }
        if (typeof extension.import !== 'function') {
          throw new Error(`Importer extension must have 'import' method`);
        }
        break;

      case 'exporter':
        if (!extension.format) {
          throw new Error(`Exporter extension must have 'format' property`);
        }
        if (typeof extension.export !== 'function') {
          throw new Error(`Exporter extension must have 'export' method`);
        }
        break;

      case 'validator':
        if (!Array.isArray(extension.assetTypes)) {
          throw new Error(`Validator extension must have 'assetTypes' array`);
        }
        if (typeof extension.validate !== 'function') {
          throw new Error(`Validator extension must have 'validate' method`);
        }
        break;

      case 'tool-wrapper':
        if (!extension.toolName) {
          throw new Error(`Tool wrapper must have 'toolName' property`);
        }
        if (typeof extension.isRunning !== 'function' || typeof extension.execute !== 'function') {
          throw new Error(`Tool wrapper must have 'isRunning' and 'execute' methods`);
        }
        break;

      case 'language':
        if (!extension.languageId) {
          throw new Error(`Language extension must have 'languageId' property`);
        }
        if (!Array.isArray(extension.fileExtensions)) {
          throw new Error(`Language extension must have 'fileExtensions' array`);
        }
        break;

      case 'theme':
        if (!extension.colors) {
          throw new Error(`Theme extension must have 'colors' object`);
        }
        break;

      case 'snippet':
        if (!extension.language) {
          throw new Error(`Snippet extension must have 'language' property`);
        }
        if (!Array.isArray(extension.snippets)) {
          throw new Error(`Snippet extension must have 'snippets' array`);
        }
        break;

      case 'command':
        if (!extension.command) {
          throw new Error(`Command extension must have 'command' property`);
        }
        if (typeof extension.execute !== 'function') {
          throw new Error(`Command extension must have 'execute' method`);
        }
        break;

      case 'panel':
        if (!extension.title) {
          throw new Error(`Panel extension must have 'title' property`);
        }
        if (typeof extension.render !== 'function') {
          throw new Error(`Panel extension must have 'render' method`);
        }
        break;

      case 'wizard':
        if (!Array.isArray(extension.steps)) {
          throw new Error(`Wizard extension must have 'steps' array`);
        }
        if (extension.steps.length === 0) {
          throw new Error(`Wizard extension must have at least one step`);
        }
        break;
    }
  }

  getAllExtensions(): Map<ExtensionType, any[]> {
    const all = new Map<ExtensionType, any[]>();
    this.registry.forEach((extensions, type) => {
      all.set(type, Array.from(extensions.values()).map((e: any) => e.extension));
    });
    return all;
  }

  getStatistics(): Record<ExtensionType, number> {
    const stats: any = {};
    this.registry.forEach((extensions, type) => {
      stats[type] = extensions.size;
    });
    return stats;
  }
}

// ============================================================================
// Extension Point Manager - Coordinates with Plugin System
// ============================================================================

export class ExtensionPointManager {
  private registry: ExtensionRegistryImpl;
  private importerChain: ImporterExtension[] = [];
  private exporterChain: ExporterExtension[] = [];
  private validatorChain: ValidatorExtension[] = [];

  constructor() {
    this.registry = new ExtensionRegistryImpl();
  }

  getRegistry(): ExtensionPointRegistry {
    return this.registry;
  }

  // Importer chain - try each importer in order
  async importFile(filePath: string, options?: any): Promise<any> {
    const importers = this.registry.getForType('importer') as ImporterExtension[];

    for (const importer of importers) {
      // Check file type
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (!ext || !importer.fileTypes.includes(`.${ext}`) && !importer.fileTypes.includes(ext)) {
        continue;
      }

      try {
        const result = await importer.import(filePath, options);
        if (result.success) {
          console.log(`Successfully imported ${filePath} using ${importer.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`Importer ${importer.name} failed:`, error);
        continue;
      }
    }

    throw new Error(`No importer found for ${filePath}`);
  }

  // Exporter chain - try each exporter matching format
  async exportFile(data: any, format: string, outputPath: string, options?: any): Promise<any> {
    const exporters = this.registry.getForType('exporter') as ExporterExtension[];

    const matching = exporters.filter((e) => e.format.toLowerCase() === format.toLowerCase());
    if (matching.length === 0) {
      throw new Error(`No exporter found for format: ${format}`);
    }

    for (const exporter of matching) {
      try {
        const result = await exporter.export(data, outputPath, options);
        if (result.success) {
          console.log(`Successfully exported to ${outputPath} using ${exporter.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`Exporter ${exporter.name} failed:`, error);
        continue;
      }
    }

    throw new Error(`Export failed for format: ${format}`);
  }

  // Validation chain - run all validators
  async validateAsset(assetPath: string, assetType?: string): Promise<any[]> {
    const validators = this.registry.getForType('validator') as ValidatorExtension[];

    const results: any[] = [];

    for (const validator of validators) {
      if (assetType && !validator.assetTypes.includes(assetType)) {
        continue;
      }

      try {
        const issues = await validator.validate(assetPath);
        results.push({
          validator: validator.name,
          issues,
        });
      } catch (error) {
        console.warn(`Validator ${validator.name} failed:`, error);
      }
    }

    return results;
  }

  // Tool wrappers - find tool by name
  async executeTool(toolName: string, command: string, args?: any): Promise<any> {
    const toolWrappers = this.registry.getForType('tool-wrapper') as ToolWrapperExtension[];

    const tool = toolWrappers.find((t) => t.toolName.toLowerCase() === toolName.toLowerCase());
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const running = await tool.isRunning();
    if (!running) {
      await tool.launch();
    }

    return await tool.execute(command, args);
  }

  // Panel extensions - get UI panels
  getPanels(): PanelExtension[] {
    return this.registry.getForType('panel') as PanelExtension[];
  }

  // Wizard extensions - find wizard
  getWizard(wizardId: string): WizardExtension | null {
    return this.registry.get('wizard', wizardId) as WizardExtension | null;
  }

  // Theme extensions - list themes
  getThemes(): ThemeExtension[] {
    return this.registry.getForType('theme') as ThemeExtension[];
  }

  // Language extensions - find language
  getLanguage(languageId: string): LanguageExtension | null {
    const languages = this.registry.getForType('language') as LanguageExtension[];
    return languages.find((l) => l.languageId === languageId) || null;
  }

  // Snippet extensions - get snippets for language
  getSnippets(language: string): SnippetExtension[] {
    const snippets = this.registry.getForType('snippet') as SnippetExtension[];
    return snippets.filter((s) => s.language === language);
  }

  // Command extensions
  getCommands(): CommandExtension[] {
    return this.registry.getForType('command') as CommandExtension[];
  }

  getStatistics() {
    return this.registry.getStatistics();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const extensionPointManager = new ExtensionPointManager();
