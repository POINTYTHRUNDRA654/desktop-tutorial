import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import {
  MossyPluginAPI,
  FileSystemAPI,
  UIAPI,
  MenuAPI,
  CommandAPI,
  SettingsAPI,
  ToolsAPI,
  AssetsAPI,
  ProjectsAPI,
  EventEmitterAPI,
  DialogOptions,
  DialogResult,
  NotificationOptions,
  CommandRegistration,
  SettingSchema,
  AssetMetadata,
  ProjectInfo,
} from '../shared/types';

// ============================================================================
// FileSystemAPI Implementation
// ============================================================================

export class FileSystemAPIImpl implements FileSystemAPI {
  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readJson(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeFile(filePath: string, content: Buffer | string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeJson(filePath: string, data: any): Promise<void> {
    try {
      await this.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to write JSON to ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async stat(filePath: string): Promise<{ isFile(): boolean; isDirectory(): boolean; size: number; mtime: Date }> {
    try {
      const stat = await fs.stat(filePath);
      return {
        isFile: () => stat.isFile(),
        isDirectory: () => stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to stat ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  watch(
    filePath: string,
    callback: (event: 'change' | 'rename', filename: string) => void
  ): () => void {
    // Mock implementation - actual implementation would use fs.watch or chokidar
    const watcher = fs.watch(filePath, (event: string, filename: string | null) => {
      if (filename) {
        callback(event as 'change' | 'rename', filename);
      }
    });

    return () => {
      watcher.close();
    };
  }
}

// ============================================================================
// UIAPI Implementation
// ============================================================================

export class UIAPIImpl implements UIAPI {
  private themeEmitter = new EventEmitter();
  private currentTheme: 'light' | 'dark' = 'dark';

  async showDialog(options: DialogOptions): Promise<DialogResult> {
    // Mock implementation - in real app would use electron.dialog
    return {
      response: options.defaultButton || 0,
      checkboxChecked: false,
    };
  }

  async showInputDialog(options: { title: string; label: string; defaultValue?: string; placeholder?: string }): Promise<string | null> {
    // Mock implementation
    return options.defaultValue || null;
  }

  showNotification(options: NotificationOptions): void {
    // Mock implementation - in real app would show system notification
    console.log(`[${options.type || 'info'}] ${options.title}: ${options.message}`);
  }

  async showOpenDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string[] | null> {
    // Mock implementation
    return null;
  }

  async showSaveDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> {
    // Mock implementation
    return null;
  }

  async showSelectFolder(options: { title?: string; defaultPath?: string }): Promise<string | null> {
    // Mock implementation
    return null;
  }

  getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
    this.themeEmitter.on('theme-change', callback);
    return () => this.themeEmitter.off('theme-change', callback);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    this.themeEmitter.emit('theme-change', theme);
  }
}

// ============================================================================
// MenuAPI Implementation
// ============================================================================

export class MenuAPIImpl implements MenuAPI {
  private menus: Map<string, string[]> = new Map();

  add(section: string, label: string, commandId: string, options?: any): void {
    if (!this.menus.has(section)) {
      this.menus.set(section, []);
    }
    this.menus.get(section)!.push(label);
  }

  remove(section: string, label: string): void {
    if (this.menus.has(section)) {
      const items = this.menus.get(section)!;
      const index = items.indexOf(label);
      if (index >= 0) {
        items.splice(index, 1);
      }
    }
  }

  addSeparator(section: string): void {
    if (!this.menus.has(section)) {
      this.menus.set(section, []);
    }
    this.menus.get(section)!.push('---');
  }

  insertSubmenu(section: string, label: string, items: any[]): void {
    if (!this.menus.has(section)) {
      this.menus.set(section, []);
    }
    this.menus.get(section)!.push(label);
  }

  refresh(): void {
    // Trigger menu rebuild
    console.log('Menu refreshed');
  }
}

// ============================================================================
// CommandAPI Implementation
// ============================================================================

export class CommandAPIImpl implements CommandAPI {
  private commands: Map<string, { handler: (args?: any) => Promise<any>; options?: any }> = new Map();

  register(id: string, handler: (args?: any) => Promise<any>, options?: any): void {
    this.commands.set(id, { handler, options });
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  async execute(id: string, args?: any): Promise<any> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command "${id}" not found`);
    }
    return await command.handler(args);
  }

  list(): CommandRegistration[] {
    const result: CommandRegistration[] = [];
    for (const [id, { handler, options }] of this.commands) {
      result.push({
        id,
        title: options?.title || id,
        category: options?.category,
        description: options?.description,
        keybinding: options?.keybinding,
        handler,
      });
    }
    return result;
  }
}

// ============================================================================
// SettingsAPI Implementation
// ============================================================================

export class SettingsAPIImpl implements SettingsAPI {
  private settings: Map<string, any> = new Map();
  private watchers: Map<string, Set<(newValue: any, oldValue: any) => void>> = new Map();

  register(schema: SettingSchema): void {
    if (!this.settings.has(schema.key)) {
      this.settings.set(schema.key, schema.default ?? null);
    }
  }

  get(key: string): any {
    return this.settings.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    const oldValue = this.settings.get(key);
    this.settings.set(key, value);

    const watchers = this.watchers.get(key);
    if (watchers) {
      for (const watcher of watchers) {
        watcher(value, oldValue);
      }
    }
  }

  watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key)!.add(callback);

    return () => {
      this.watchers.get(key)?.delete(callback);
    };
  }
}

// ============================================================================
// ToolsAPI Implementation
// ============================================================================

export class ToolsAPIImpl implements ToolsAPI {
  private toolEmitters = {
    blender: new EventEmitter(),
    nifskope: new EventEmitter(),
    xEdit: new EventEmitter(),
  };

  private toolState = {
    blender: false,
    nifskope: false,
    xEdit: false,
  };

  blender = {
    isRunning: async (): Promise<boolean> => this.toolState.blender,
    launch: async (options?: Record<string, any>): Promise<void> => {
      this.toolState.blender = true;
      this.toolEmitters.blender.emit('session-change', true);
    },
    runScript: async (script: string): Promise<string> => {
      return 'Script executed successfully';
    },
    getVersion: async (): Promise<string> => {
      return '4.0.0';
    },
    onSessionChange: (callback: (running: boolean) => void): (() => void) => {
      this.toolEmitters.blender.on('session-change', callback);
      return () => this.toolEmitters.blender.off('session-change', callback);
    },
  };

  nifskope = {
    isRunning: async (): Promise<boolean> => this.toolState.nifskope,
    launch: async (files?: string[]): Promise<void> => {
      this.toolState.nifskope = true;
      this.toolEmitters.nifskope.emit('session-change', true);
    },
    getVersion: async (): Promise<string> => {
      return '2.0.7';
    },
    onSessionChange: (callback: (running: boolean) => void): (() => void) => {
      this.toolEmitters.nifskope.on('session-change', callback);
      return () => this.toolEmitters.nifskope.off('session-change', callback);
    },
  };

  xEdit = {
    isRunning: async (): Promise<boolean> => this.toolState.xEdit,
    launch: async (plugins?: string[]): Promise<void> => {
      this.toolState.xEdit = true;
      this.toolEmitters.xEdit.emit('session-change', true);
    },
    getVersion: async (): Promise<string> => {
      return '4.1.5';
    },
    onSessionChange: (callback: (running: boolean) => void): (() => void) => {
      this.toolEmitters.xEdit.on('session-change', callback);
      return () => this.toolEmitters.xEdit.off('session-change', callback);
    },
  };
}

// ============================================================================
// AssetsAPI Implementation
// ============================================================================

export class AssetsAPIImpl implements AssetsAPI {
  private assets: Map<string, AssetMetadata> = new Map();
  private assetCount = 0;

  async import(sourcePath: string, assetType: string, options?: Record<string, any>): Promise<AssetMetadata> {
    try {
      const stat = await fs.stat(sourcePath);
      const assetId = `asset-${++this.assetCount}`;
      const metadata: AssetMetadata = {
        id: assetId,
        path: sourcePath,
        type: assetType as any,
        name: path.basename(sourcePath),
        size: stat.size,
        mtime: stat.mtimeMs,
        tags: options?.tags || [],
        dependencies: options?.dependencies || [],
      };

      this.assets.set(assetId, metadata);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to import asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async export(assetId: string, format: string, outputPath: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    // Mock implementation - would copy/convert asset to output path
    console.log(`Exporting ${assetId} to ${format} at ${outputPath}`);
  }

  async list(filter?: { type?: string; tags?: string[] }): Promise<AssetMetadata[]> {
    let results = Array.from(this.assets.values());

    if (filter?.type) {
      results = results.filter((a) => a.type === filter.type);
    }

    if (filter?.tags && filter.tags.length > 0) {
      results = results.filter((a) => filter.tags!.some((tag) => a.tags.includes(tag)));
    }

    return results;
  }

  async get(assetId: string): Promise<AssetMetadata | null> {
    return this.assets.get(assetId) || null;
  }

  async update(assetId: string, metadata: Partial<AssetMetadata>): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    Object.assign(asset, metadata);
  }

  async delete(assetId: string): Promise<void> {
    this.assets.delete(assetId);
  }

  async search(query: string): Promise<AssetMetadata[]> {
    const results = Array.from(this.assets.values()).filter(
      (a) => a.name.toLowerCase().includes(query.toLowerCase()) ||
             a.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
    return results;
  }

  async validate(assetId: string): Promise<{ valid: boolean; errors: string[] }> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return { valid: false, errors: [`Asset ${assetId} not found`] };
    }

    const errors: string[] = [];
    try {
      // Check if file exists
      await fs.access(asset.path);
    } catch {
      errors.push(`Asset file not found at ${asset.path}`);
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// ProjectsAPI Implementation
// ============================================================================

export class ProjectsAPIImpl implements ProjectsAPI {
  private projects: Map<string, ProjectInfo> = new Map();
  private currentProject: ProjectInfo | null = null;
  private emitter = new EventEmitter();

  async current(): Promise<ProjectInfo | null> {
    return this.currentProject;
  }

  async list(): Promise<ProjectInfo[]> {
    return Array.from(this.projects.values());
  }

  async create(name: string, game: string, projectPath: string): Promise<ProjectInfo> {
    const projectId = `project-${Date.now()}`;
    const project: ProjectInfo = {
      id: projectId,
      name,
      path: projectPath,
      created: Date.now(),
      modified: Date.now(),
      game: game as any,
    };

    this.projects.set(projectId, project);
    await fs.mkdir(projectPath, { recursive: true });

    return project;
  }

  async open(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    this.currentProject = project;
    this.emitter.emit('project-change', project);
  }

  async delete(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      await fs.rm(project.path, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to delete project directory: ${error}`);
    }

    this.projects.delete(projectId);

    if (this.currentProject?.id === projectId) {
      this.currentProject = null;
      this.emitter.emit('project-change', null);
    }
  }

  async export(projectId: string, format: string, outputPath: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Mock implementation
    console.log(`Exporting project ${projectId} as ${format} to ${outputPath}`);
  }

  onProjectChange(callback: (project: ProjectInfo | null) => void): () => void {
    this.emitter.on('project-change', callback);
    return () => this.emitter.off('project-change', callback);
  }
}

// ============================================================================
// EventEmitterAPI Implementation
// ============================================================================

export class EventEmitterAPIImpl implements EventEmitterAPI {
  private emitter = new EventEmitter();

  on(event: string, callback: (...args: any[]) => void): () => void {
    this.emitter.on(event, callback);
    return () => this.emitter.off(event, callback);
  }

  once(event: string, callback: (...args: any[]) => void): () => void {
    this.emitter.once(event, callback);
    return () => this.emitter.off(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.emitter.off(event, callback);
  }

  emit(event: string, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }
}

// ============================================================================
// MossyPluginAPI Factory
// ============================================================================

export class MossyPluginAPIFactory {
  private static instance: MossyPluginAPI | null = null;

  static create(): MossyPluginAPI {
    if (!MossyPluginAPIFactory.instance) {
      MossyPluginAPIFactory.instance = {
        fileSystem: new FileSystemAPIImpl(),
        ui: new UIAPIImpl(),
        menu: new MenuAPIImpl(),
        command: new CommandAPIImpl(),
        settings: new SettingsAPIImpl(),
        tools: new ToolsAPIImpl(),
        assets: new AssetsAPIImpl(),
        projects: new ProjectsAPIImpl(),
        events: new EventEmitterAPIImpl(),
      };
    }

    return MossyPluginAPIFactory.instance;
  }

  static getInstance(): MossyPluginAPI {
    if (!MossyPluginAPIFactory.instance) {
      throw new Error('MossyPluginAPI not initialized. Call create() first.');
    }
    return MossyPluginAPIFactory.instance;
  }
}

// Export singleton instance
export const mossyPluginAPI = MossyPluginAPIFactory.create();
