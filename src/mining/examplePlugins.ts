import { MossyPluginAPI } from '../shared/types';

// ============================================================================
// Base Plugin Class
// ============================================================================

export abstract class MossyPlugin {
  constructor(protected api: MossyPluginAPI) {}

  abstract activate(): Promise<void>;
  abstract deactivate(): Promise<void>;

  protected async log(message: string): Promise<void> {
    const fileSystem = this.api.fileSystem;
    const logPath = './plugin.log';
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    const exists = await fileSystem.exists(logPath);
    if (exists) {
      const content = await fileSystem.readFile(logPath);
      await fileSystem.writeFile(logPath, Buffer.concat([content, Buffer.from(logEntry)]));
    } else {
      await fileSystem.writeFile(logPath, logEntry);
    }
  }
}

// ============================================================================
// Example 1: Basic Plugin with Commands & Menu Items
// ============================================================================

export class MyPlugin extends MossyPlugin {
  private unsubscribers: Array<() => void> = [];

  async activate(): Promise<void> {
    await this.log('MyPlugin activated');

    // Register command
    this.api.command.register(
      'myPlugin.doSomething',
      async () => {
        const result = await this.api.ui.showDialog({
          title: 'My Plugin',
          message: 'Hello from plugin!',
          type: 'info',
          buttons: ['OK', 'Cancel'],
        });

        if (result.response === 0) {
          this.api.ui.showNotification({
            title: 'Success',
            message: 'You clicked OK!',
            type: 'success',
            duration: 3000,
          });
        }

        return result;
      },
      {
        title: 'Do Something',
        category: 'My Plugin',
        description: 'Performs a sample action',
        keybinding: 'ctrl+shift+p',
      }
    );

    // Add menu item
    this.api.menu.add('Tools', 'My Plugin Action', 'myPlugin.doSomething', {
      accelerator: 'Ctrl+Shift+P',
    });

    // Listen to project changes
    const unsubscribeProject = this.api.projects.onProjectChange((project) => {
      if (project) {
        this.api.ui.showNotification({
          title: 'Project Opened',
          message: `Opened project: ${project.name}`,
          type: 'info',
        });
      }
    });
    this.unsubscribers.push(unsubscribeProject);

    // Listen to file saves
    const unsubscribeFileEvent = this.api.events.on('file-saved', (file: string) => {
      this.log(`File saved: ${file}`);
    });
    this.unsubscribers.push(unsubscribeFileEvent);
  }

  async deactivate(): Promise<void> {
    await this.log('MyPlugin deactivated');

    // Unsubscribe from all events
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Unregister command
    this.api.command.unregister('myPlugin.doSomething');

    // Remove menu items
    this.api.menu.remove('Tools', 'My Plugin Action');
  }
}

// ============================================================================
// Example 2: Asset Management Plugin
// ============================================================================

export class AssetManagerPlugin extends MossyPlugin {
  async activate(): Promise<void> {
    await this.log('AssetManagerPlugin activated');

    // Register settings
    this.api.settings.register({
      key: 'assetManager.autoImport',
      title: 'Auto Import Assets',
      description: 'Automatically import assets when they are added to the project',
      type: 'boolean',
      default: true,
    });

    this.api.settings.register({
      key: 'assetManager.maxAssetSize',
      title: 'Maximum Asset Size (MB)',
      description: 'Maximum file size for imported assets',
      type: 'number',
      default: 100,
      minimum: 1,
      maximum: 1000,
    });

    // Register command to import asset
    this.api.command.register(
      'assetManager.importAsset',
      async () => {
        const filePath = await this.api.ui.showOpenDialog({
          title: 'Import Asset',
          filters: [
            { name: 'All Assets', extensions: ['nif', 'dds', 'fbx', 'hkx', 'esp'] },
            { name: 'Meshes', extensions: ['nif', 'fbx'] },
            { name: 'Textures', extensions: ['dds'] },
            { name: 'Animations', extensions: ['hkx'] },
          ],
        });

        if (!filePath || filePath.length === 0) {
          return { success: false, message: 'No file selected' };
        }

        try {
          const assetType = this.getAssetType(filePath[0]);
          const metadata = await this.api.assets.import(filePath[0], assetType, {
            tags: ['imported', 'user'],
          });

          this.api.ui.showNotification({
            title: 'Asset Imported',
            message: `Successfully imported ${metadata.name}`,
            type: 'success',
            duration: 3000,
          });

          return { success: true, asset: metadata };
        } catch (error) {
          this.api.ui.showNotification({
            title: 'Import Failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'error',
            duration: 5000,
          });

          return { success: false, error };
        }
      },
      {
        title: 'Import Asset',
        category: 'Asset Manager',
      }
    );

    this.api.menu.add('Assets', 'Import Asset', 'assetManager.importAsset');

    // Register command to list assets
    this.api.command.register(
      'assetManager.listAssets',
      async (filter?: { type?: string }) => {
        const assets = await this.api.assets.list(filter);
        return {
          count: assets.length,
          assets: assets.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            size: a.size,
          })),
        };
      },
      {
        title: 'List Assets',
        category: 'Asset Manager',
      }
    );

    // Watch settings changes
    const unsubscribe = this.api.settings.watch('assetManager.maxAssetSize', (newValue, oldValue) => {
      console.log(`Max asset size changed from ${oldValue}MB to ${newValue}MB`);
    });
    this._unsubscribers.push(unsubscribe);
  }

  async deactivate(): Promise<void> {
    await this.log('AssetManagerPlugin deactivated');
    this._unsubscribers.forEach((unsub) => unsub());
  }

  private _unsubscribers: Array<() => void> = [];

  private getAssetType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'nif':
      case 'fbx':
        return 'mesh';
      case 'dds':
        return 'texture';
      case 'hkx':
        return 'animation';
      case 'esp':
        return 'script';
      default:
        return 'asset';
    }
  }
}

// ============================================================================
// Example 3: Tool Integration Plugin
// ============================================================================

export class ToolIntegrationPlugin extends MossyPlugin {
  private unsubscribers: Array<() => void> = [];

  async activate(): Promise<void> {
    await this.log('ToolIntegrationPlugin activated');

    // Monitor Blender
    const unsubBlender = this.api.tools.blender.onSessionChange((running) => {
      if (running) {
        this.api.ui.showNotification({
          title: 'Blender Detected',
          message: 'Blender is now running',
          type: 'info',
          duration: 2000,
        });
      }
    });
    this.unsubscribers.push(unsubBlender);

    // Monitor xEdit
    const unsubXEdit = this.api.tools.xEdit.onSessionChange((running) => {
      if (running) {
        this.api.ui.showNotification({
          title: 'xEdit Detected',
          message: 'xEdit is now running',
          type: 'info',
          duration: 2000,
        });
      }
    });
    this.unsubscribers.push(unsubXEdit);

    // Register command to check tool versions
    this.api.command.register(
      'tools.checkVersions',
      async () => {
        const blenderVersion = await this.api.tools.blender.getVersion();
        const xEditVersion = await this.api.tools.xEdit.getVersion();
        const nifskopeVersion = await this.api.tools.nifskope.getVersion();

        return {
          blender: blenderVersion,
          xEdit: xEditVersion,
          nifskope: nifskopeVersion,
        };
      },
      {
        title: 'Check Tool Versions',
        category: 'Tools',
      }
    );

    this.api.menu.add('Tools', 'Check Versions', 'tools.checkVersions');

    // Register command to launch Blender
    this.api.command.register(
      'tools.launchBlender',
      async () => {
        try {
          await this.api.tools.blender.launch();
          this.api.ui.showNotification({
            title: 'Blender Launched',
            message: 'Blender is starting...',
            type: 'success',
            duration: 2000,
          });
        } catch (error) {
          this.api.ui.showNotification({
            title: 'Launch Failed',
            message: error instanceof Error ? error.message : 'Failed to launch Blender',
            type: 'error',
            duration: 3000,
          });
        }
      },
      {
        title: 'Launch Blender',
        category: 'Tools',
        keybinding: 'ctrl+alt+b',
      }
    );

    this.api.menu.add('Tools', 'Launch Blender', 'tools.launchBlender', {
      accelerator: 'Ctrl+Alt+B',
    });
  }

  async deactivate(): Promise<void> {
    await this.log('ToolIntegrationPlugin deactivated');
    this.unsubscribers.forEach((unsub) => unsub());
  }
}

// ============================================================================
// Example 4: File System Watcher Plugin
// ============================================================================

export class FileWatcherPlugin extends MossyPlugin {
  private watchers: Array<() => void> = [];

  async activate(): Promise<void> {
    await this.log('FileWatcherPlugin activated');

    // Register command to watch a directory
    this.api.command.register(
      'fileWatcher.watchDirectory',
      async () => {
        const dirPath = await this.api.ui.showSelectFolder({
          title: 'Select Directory to Watch',
        });

        if (!dirPath) {
          return { success: false };
        }

        try {
          const unwatch = this.api.fileSystem.watch(dirPath, (event, filename) => {
            console.log(`[${event}] ${filename}`);
            this.api.events.emit('file-changed', { event, filename, directory: dirPath });
          });

          this.watchers.push(unwatch);

          this.api.ui.showNotification({
            title: 'Watching Directory',
            message: `Now watching: ${dirPath}`,
            type: 'success',
            duration: 3000,
          });

          return { success: true, path: dirPath };
        } catch (error) {
          this.api.ui.showNotification({
            title: 'Watch Failed',
            message: error instanceof Error ? error.message : 'Failed to watch directory',
            type: 'error',
            duration: 3000,
          });

          return { success: false, error };
        }
      },
      {
        title: 'Watch Directory',
        category: 'File System',
      }
    );

    this.api.menu.add('Tools', 'Watch Directory', 'fileWatcher.watchDirectory');

    // Listen to file changes
    const unsubscribe = this.api.events.on('file-changed', (data) => {
      this.log(`File event: ${data.event} - ${data.filename}`);
    });

    this.watchers.push(unsubscribe);
  }

  async deactivate(): Promise<void> {
    await this.log('FileWatcherPlugin deactivated');
    this.watchers.forEach((watcher) => watcher());
  }
}

// ============================================================================
// Example 5: Project Manager Plugin
// ============================================================================

export class ProjectManagerPlugin extends MossyPlugin {
  private unsubscribers: Array<() => void> = [];

  async activate(): Promise<void> {
    await this.log('ProjectManagerPlugin activated');

    // Register command to create project
    this.api.command.register(
      'projectManager.createProject',
      async () => {
        const name = await this.api.ui.showInputDialog({
          title: 'Create New Project',
          label: 'Project Name:',
          placeholder: 'My Awesome Mod',
        });

        if (!name) {
          return { success: false };
        }

        try {
          const projectPath = await this.api.ui.showSelectFolder({
            title: 'Select Project Directory',
          });

          if (!projectPath) {
            return { success: false };
          }

          const project = await this.api.projects.create(name, 'skyrim', projectPath);

          this.api.ui.showNotification({
            title: 'Project Created',
            message: `Created project: ${project.name}`,
            type: 'success',
            duration: 3000,
          });

          return { success: true, project };
        } catch (error) {
          this.api.ui.showNotification({
            title: 'Creation Failed',
            message: error instanceof Error ? error.message : 'Failed to create project',
            type: 'error',
            duration: 3000,
          });

          return { success: false, error };
        }
      },
      {
        title: 'Create Project',
        category: 'Project Manager',
      }
    );

    this.api.menu.add('File', 'New Project', 'projectManager.createProject');

    // Listen to project changes
    const unsubscribe = this.api.projects.onProjectChange((project) => {
      if (project) {
        this.log(`Project switched to: ${project.name}`);
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  async deactivate(): Promise<void> {
    await this.log('ProjectManagerPlugin deactivated');
    this.unsubscribers.forEach((unsub) => unsub());
  }
}
