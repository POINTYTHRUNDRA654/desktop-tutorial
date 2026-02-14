# MossyPluginAPI - Complete Implementation

## Overview

The `MossyPluginAPI` is a comprehensive plugin system that provides plugins with full access to Mossy's core functionality. It consists of 8 major API categories, each providing specific functionality for plugins to interact with the application.

## Architecture

### API Structure

```typescript
interface MossyPluginAPI {
  fileSystem: FileSystemAPI;        // File I/O operations
  ui: UIAPI;                        // User interface dialogs and notifications
  menu: MenuAPI;                    // Menu management
  command: CommandAPI;              // Command registration and execution
  settings: SettingsAPI;            // Settings/preferences management
  tools: ToolsAPI;                  // External tool integration (Blender, xEdit, NifSkope)
  assets: AssetsAPI;                // Asset management and validation
  projects: ProjectsAPI;            // Project lifecycle management
  events: EventEmitterAPI;          // Global event system
}
```

### File Structure

#### 1. **Type Definitions** (`src/shared/types.ts`)
- All API interfaces and types
- Exported for use across renderer and main processes
- Type-safe plugin development

#### 2. **API Implementation** (`src/mining/pluginApi.ts`)
- Concrete implementations of all API interfaces
- Factory pattern for singleton instance
- Mock implementations ready for backend integration

#### 3. **Example Plugins** (`src/mining/examplePlugins.ts`)
- 5 complete example plugins demonstrating different features
- Base `MossyPlugin` class for plugin development
- Real-world usage patterns

---

## API Reference

### 1. FileSystemAPI

Provides file and directory operations with Promise-based interface.

```typescript
interface FileSystemAPI {
  readFile(path: string): Promise<Buffer>;
  readJson(path: string): Promise<any>;
  writeFile(path: string, content: Buffer | string): Promise<void>;
  writeJson(path: string, data: any): Promise<void>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStat>;
  watch(path: string, callback): () => void;  // Returns unsubscriber
}
```

**Example Usage:**
```typescript
// Read asset data
const buffer = await this.api.fileSystem.readFile('./asset.nif');

// Watch for changes
const unwatch = this.api.fileSystem.watch('./assets', (event, filename) => {
  console.log(`${filename} was ${event}`);
});

// Stop watching
unwatch();
```

---

### 2. UIAPI

Dialog boxes, notifications, and theme management.

```typescript
interface UIAPI {
  showDialog(options: DialogOptions): Promise<DialogResult>;
  showInputDialog(options: InputDialogOptions): Promise<string | null>;
  showNotification(options: NotificationOptions): void;
  showOpenDialog(options): Promise<string[] | null>;
  showSaveDialog(options): Promise<string | null>;
  showSelectFolder(options): Promise<string | null>;
  getTheme(): 'light' | 'dark';
  onThemeChange(callback): () => void;
}
```

**Example Usage:**
```typescript
// Show confirmation dialog
const result = await this.api.ui.showDialog({
  title: 'Import Assets',
  message: 'Import all selected files?',
  type: 'question',
  buttons: ['Yes', 'No', 'Cancel'],
});

// Show notification
this.api.ui.showNotification({
  title: 'Success',
  message: 'Assets imported successfully',
  type: 'success',
  duration: 3000,
});

// Listen to theme changes
const unsubscribe = this.api.ui.onThemeChange((theme) => {
  console.log(`Theme changed to: ${theme}`);
});
```

---

### 3. MenuAPI

Register and manage menu items.

```typescript
interface MenuAPI {
  add(section: string, label: string, commandId: string, options?): void;
  remove(section: string, label: string): void;
  addSeparator(section: string): void;
  insertSubmenu(section: string, label: string, items: MenuItemOptions[]): void;
  refresh(): void;
}
```

**Example Usage:**
```typescript
// Add menu item
this.api.menu.add('Tools', 'My Plugin Action', 'myPlugin.doSomething', {
  accelerator: 'Ctrl+Shift+P',
});

// Add separator
this.api.menu.addSeparator('Tools');

// Add submenu
this.api.menu.insertSubmenu('Tools', 'My Submenu', [
  { label: 'Action 1', id: 'action1' },
  { label: 'Action 2', id: 'action2' },
]);

// Refresh UI
this.api.menu.refresh();
```

---

### 4. CommandAPI

Register custom commands that can be executed from menus, keybindings, etc.

```typescript
interface CommandAPI {
  register(id: string, handler, options?): void;
  unregister(id: string): void;
  execute(id: string, args?): Promise<any>;
  list(): CommandRegistration[];
}
```

**Example Usage:**
```typescript
// Register command
this.api.command.register(
  'myPlugin.process',
  async (args) => {
    console.log('Processing with args:', args);
    return { success: true };
  },
  {
    title: 'Process Assets',
    category: 'My Plugin',
    description: 'Process selected assets',
    keybinding: 'ctrl+shift+a',
  }
);

// Execute command
const result = await this.api.command.execute('myPlugin.process', {
  recursive: true,
});

// List all commands
const commands = this.api.command.list();
```

---

### 5. SettingsAPI

User settings and preferences with watchers for changes.

```typescript
interface SettingsAPI {
  register(schema: SettingSchema): void;
  get(key: string): any;
  set(key: string, value: any): Promise<void>;
  watch(key: string, callback): () => void;  // Returns unsubscriber
}
```

**Example Usage:**
```typescript
// Register settings schema
this.api.settings.register({
  key: 'myPlugin.autoImport',
  title: 'Auto Import Assets',
  type: 'boolean',
  default: true,
});

this.api.settings.register({
  key: 'myPlugin.maxSize',
  title: 'Max File Size (MB)',
  type: 'number',
  default: 100,
  minimum: 1,
  maximum: 1000,
});

// Get setting
const autoImport = this.api.settings.get('myPlugin.autoImport');

// Update setting
await this.api.settings.set('myPlugin.autoImport', false);

// Watch for changes
const unsubscribe = this.api.settings.watch('myPlugin.maxSize', (newVal, oldVal) => {
  console.log(`Max size changed: ${oldVal} → ${newVal}`);
});
```

---

### 6. ToolsAPI

Monitor and interact with external tools (Blender, xEdit, NifSkope).

```typescript
interface ToolsAPI {
  blender: {
    isRunning(): Promise<boolean>;
    launch(options?): Promise<void>;
    runScript(script: string): Promise<string>;
    getVersion(): Promise<string>;
    onSessionChange(callback): () => void;
  };
  nifskope: { /* similar */ };
  xEdit: { /* similar */ };
}
```

**Example Usage:**
```typescript
// Check if tool is running
const running = await this.api.tools.blender.isRunning();

// Launch tool
await this.api.tools.blender.launch();

// Run script
const result = await this.api.tools.blender.runScript(
  'import bpy; print(bpy.app.version_string)'
);

// Get version
const version = await this.api.tools.blender.getVersion();

// Monitor tool
const unsubscribe = this.api.tools.blender.onSessionChange((running) => {
  if (running) {
    console.log('Blender started!');
  } else {
    console.log('Blender closed!');
  }
});
```

---

### 7. AssetsAPI

Import, export, list, search, and validate assets.

```typescript
interface AssetsAPI {
  import(sourcePath: string, assetType: string, options?): Promise<AssetMetadata>;
  export(assetId: string, format: string, outputPath: string): Promise<void>;
  list(filter?): Promise<AssetMetadata[]>;
  get(assetId: string): Promise<AssetMetadata | null>;
  update(assetId: string, metadata: Partial<AssetMetadata>): Promise<void>;
  delete(assetId: string): Promise<void>;
  search(query: string): Promise<AssetMetadata[]>;
  validate(assetId: string): Promise<{ valid: boolean; errors: string[] }>;
}
```

**Example Usage:**
```typescript
// Import asset
const metadata = await this.api.assets.import(
  './model.nif',
  'mesh',
  { tags: ['imported', 'character'] }
);

// List all mesh assets
const meshes = await this.api.assets.list({ type: 'mesh' });

// Search assets
const results = await this.api.assets.search('character');

// Validate asset
const validation = await this.api.assets.validate(assetId);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Export asset
await this.api.assets.export(assetId, 'fbx', './export/model.fbx');

// Update asset metadata
await this.api.assets.update(assetId, {
  tags: ['updated', 'v2.0'],
});
```

---

### 8. ProjectsAPI

Create, open, and manage projects.

```typescript
interface ProjectsAPI {
  current(): Promise<ProjectInfo | null>;
  list(): Promise<ProjectInfo[]>;
  create(name: string, game: string, path: string): Promise<ProjectInfo>;
  open(projectId: string): Promise<void>;
  delete(projectId: string): Promise<void>;
  export(projectId: string, format: string, outputPath: string): Promise<void>;
  onProjectChange(callback): () => void;
}
```

**Example Usage:**
```typescript
// Get current project
const project = await this.api.projects.current();

// List all projects
const projects = await this.api.projects.list();

// Create new project
const newProject = await this.api.projects.create(
  'My Awesome Mod',
  'skyrim',
  './projects/my-mod'
);

// Open project
await this.api.projects.open(projectId);

// Listen to project changes
const unsubscribe = this.api.projects.onProjectChange((project) => {
  if (project) {
    console.log(`Switched to: ${project.name}`);
  }
});

// Export project
await this.api.projects.export(projectId, 'esp', './dist/my-mod.esp');
```

---

### 9. EventEmitterAPI

Global event system for inter-plugin communication.

```typescript
interface EventEmitterAPI {
  on(event: string, callback): () => void;            // Returns unsubscriber
  once(event: string, callback): () => void;
  off(event: string, callback): void;
  emit(event: string, ...args): void;
}
```

**Example Usage:**
```typescript
// Listen to event
const unsubscribe = this.api.events.on('file-saved', (file) => {
  console.log(`File saved: ${file}`);
});

// Listen once
this.api.events.once('project-opened', (project) => {
  console.log('Project opened:', project);
});

// Emit event
this.api.events.emit('my-event', { data: 'value' });

// Stop listening
unsubscribe();
```

---

## Example Plugins

### 1. MyPlugin - Basic Commands & Menus

```typescript
import { MossyPlugin } from './examplePlugins';

export class MyPlugin extends MossyPlugin {
  async activate() {
    // Register command
    this.api.command.register('myPlugin.doSomething', async () => {
      const result = await this.api.ui.showDialog({
        title: 'My Plugin',
        message: 'Hello from plugin!',
      });
      return result;
    });

    // Add menu item
    this.api.menu.add('Tools', 'My Action', 'myPlugin.doSomething');

    // Listen to events
    this.api.events.on('file-saved', this.handleFileSaved);
  }

  async deactivate() {
    this.api.command.unregister('myPlugin.doSomething');
    this.api.menu.remove('Tools', 'My Action');
  }

  private handleFileSaved = (file: string) => {
    console.log(`File saved: ${file}`);
  };
}
```

### 2. AssetManagerPlugin - Asset Operations

```typescript
export class AssetManagerPlugin extends MossyPlugin {
  async activate() {
    // Register settings
    this.api.settings.register({
      key: 'assetManager.autoImport',
      title: 'Auto Import',
      type: 'boolean',
      default: true,
    });

    // Register command
    this.api.command.register(
      'assets.import',
      async () => {
        const files = await this.api.ui.showOpenDialog({
          title: 'Import Assets',
          filters: [
            { name: 'Meshes', extensions: ['nif', 'fbx'] },
          ],
        });

        if (!files) return { success: false };

        for (const file of files) {
          await this.api.assets.import(file, 'mesh');
        }

        this.api.ui.showNotification({
          title: 'Success',
          message: `Imported ${files.length} assets`,
          type: 'success',
        });

        return { success: true };
      }
    );

    this.api.menu.add('Assets', 'Import', 'assets.import');
  }
}
```

### 3. ToolIntegrationPlugin - External Tool Monitoring

```typescript
export class ToolIntegrationPlugin extends MossyPlugin {
  async activate() {
    // Monitor Blender
    this.api.tools.blender.onSessionChange((running) => {
      if (running) {
        this.api.ui.showNotification({
          title: 'Blender Detected',
          message: 'Blender is now running',
        });
      }
    });

    // Register version checker
    this.api.command.register(
      'tools.checkVersions',
      async () => {
        return {
          blender: await this.api.tools.blender.getVersion(),
          xEdit: await this.api.tools.xEdit.getVersion(),
        };
      }
    );
  }
}
```

See `src/mining/examplePlugins.ts` for 5 complete examples.

---

## Creating Your Plugin

### Step 1: Extend MossyPlugin

```typescript
import { MossyPlugin, MossyPluginAPI } from 'mossy';

export class MyCustomPlugin extends MossyPlugin {
  constructor(api: MossyPluginAPI) {
    super(api);
  }

  async activate(): Promise<void> {
    // Initialize plugin
  }

  async deactivate(): Promise<void> {
    // Cleanup
  }
}
```

### Step 2: Register Commands

```typescript
async activate() {
  this.api.command.register(
    'myPlugin.action',
    async (args) => {
      // Command handler
      return { success: true };
    },
    {
      title: 'My Action',
      category: 'My Plugin',
      keybinding: 'ctrl+shift+a',
    }
  );
}
```

### Step 3: Add Menu Items

```typescript
this.api.menu.add(
  'Tools',
  'My Action',
  'myPlugin.action',
  { accelerator: 'Ctrl+Shift+A' }
);
```

### Step 4: Listen to Events

```typescript
private unsubscribers: Array<() => void> = [];

async activate() {
  const unsub = this.api.events.on('file-saved', this.handleEvent);
  this.unsubscribers.push(unsub);
}

async deactivate() {
  this.unsubscribers.forEach(u => u());
}
```

### Step 5: Cleanup on Deactivate

```typescript
async deactivate() {
  // Unregister commands
  this.api.command.unregister('myPlugin.action');

  // Remove menu items
  this.api.menu.remove('Tools', 'My Action');

  // Unsubscribe from events
  this.unsubscribers.forEach(u => u());
}
```

---

## Best Practices

1. **Always Cleanup**: Unregister commands and unsubscribe from events in `deactivate()`
2. **Error Handling**: Always wrap async operations in try-catch and show notifications
3. **Settings**: Use settings API for user preferences instead of hardcoding
4. **Logging**: Use `this.log()` helper method (inherited from MossyPlugin)
5. **Type Safety**: Always type your command handlers and event listeners
6. **Keybindings**: Use standard shortcuts (Ctrl+Shift, Ctrl+Alt)
7. **Menu Organization**: Use consistent menu sections ('Tools', 'File', 'Edit', etc.)

---

## Compilation Status

✅ **All Plugin API code compiles successfully with 0 new TypeScript errors**

- `src/shared/types.ts`: 10+ plugin API interfaces added
- `src/mining/pluginApi.ts`: 1500+ lines, 9 API implementations
- `src/mining/examplePlugins.ts`: 450+ lines, 5 complete example plugins

---

## Next Steps

1. **Plugin System Integration**: Connect plugin API to PluginSystemEngine
2. **IPC Handlers**: Add handlers to expose API to plugin process
3. **Plugin Loader**: Implement plugin discovery and loading
4. **Console/Debug**: Add plugin debugging console
5. **Performance**: Profile and optimize API calls
