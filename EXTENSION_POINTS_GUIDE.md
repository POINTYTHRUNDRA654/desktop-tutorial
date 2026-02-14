# Extension Points System - Complete Guide

## Overview

The Extension Points System provides a powerful, plugin-based architecture for extending Mossy with custom functionality. It allows plugins to contribute importers, exporters, validators, tools, themes, and more through a standardized extension mechanism.

## Architecture

### Extension Types

10 primary extension types are supported:

| Type | Purpose | Example |
|------|---------|---------|
| **importer** | Custom file importers | NIF, FBX, GLTF importers |
| **exporter** | Custom file exporters | Export to OBJ, FBX, glTF |
| **validator** | Asset validators | Mesh validation, texture checks |
| **tool-wrapper** | External tool integrations | Blender, xEdit, NifSkope wrappers |
| **language** | Syntax highlighting/LSP | Blueprint script language |
| **theme** | UI themes | Dark/Light professional themes |
| **snippet** | Code snippets | Reusable code templates |
| **command** | Custom commands | Quick actions with keybindings |
| **panel** | Custom UI panels | Workspace panels and sidebars |
| **wizard** | Multi-step wizards | Asset import wizard |

### System Components

#### 1. Extension Registry (`ExtensionPointRegistry`)
- Manages extension registration and lifecycle
- Validates extension structure against type schema
- Provides lookup and invocation methods

#### 2. Extension Manager (`ExtensionPointManager`)
- Coordinates with plugin system
- Manages extension chains (importer, exporter, validator)
- Provides high-level APIs for extension execution

#### 3. Plugin Integration
- Plugins extend `MossyPlugin` base class
- Access extension system via `this.api.events` and direct registry calls
- Register extensions during `activate()` phase

---

## Extension Type Details

### 1. Importer Extensions

For importing external file formats.

```typescript
interface ImporterExtension {
  id: string;
  name: string;
  fileTypes: string[];           // e.g., ['.nif', '.fbx']
  import(filePath: string, options?: any): Promise<ImportResult>;
}

interface ImportResult {
  success: boolean;
  assetId?: string;
  metadata?: AssetMetadata;
  warnings?: string[];
  error?: string;
}
```

**Example: NIF Mesh Importer**

```typescript
class NIFImporterExtension implements ImporterExtension {
  id = 'importer.nif';
  name = 'NIF Mesh Importer';
  fileTypes = ['.nif'];

  async import(filePath: string, options?: any): Promise<ImportResult> {
    try {
      const buffer = await this.api.fileSystem.readFile(filePath);
      
      // Validate NIF format
      if (!isValidNIF(buffer)) {
        return { success: false, error: 'Invalid NIF file' };
      }

      // Import as asset
      const metadata = await this.api.assets.import(filePath, 'mesh', {
        tags: ['nif', 'imported'],
      });

      return {
        success: true,
        assetId: metadata.id,
        metadata,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**Registration in Plugin:**

```typescript
export class MeshIOPlugin extends MossyPlugin {
  async activate() {
    const registry = extensionPointManager.getRegistry();
    registry.register('importer', 
      new NIFImporterExtension(this.api), 
      this.pluginId
    );
  }
}
```

**Usage:**

```typescript
// Automatic chain execution
const result = await extensionPointManager.importFile('./model.nif');

// Direct invocation
const result = await registry.invoke(
  'importer',
  'importer.nif',
  'import',
  './model.nif'
);
```

---

### 2. Exporter Extensions

For exporting to external file formats.

```typescript
interface ExporterExtension {
  id: string;
  name: string;
  format: string;                // e.g., 'fbx', 'obj', 'gltf'
  export(data: any, outputPath: string, options?: any): Promise<ExportResult>;
}

interface ExportResult {
  success: boolean;
  outputPath?: string;
  bytesWritten?: number;
  warnings?: string[];
  error?: string;
}
```

**Example: glTF Exporter**

```typescript
class GLTFExporterExtension implements ExporterExtension {
  id = 'exporter.gltf';
  name = 'glTF Model Exporter';
  format = 'gltf';

  async export(data: any, outputPath: string, options?: any): Promise<ExportResult> {
    try {
      const gltfData = {
        asset: { version: '2.0' },
        scenes: [{ nodes: [...] }],
        meshes: data.meshes,
        materials: data.materials,
      };

      const content = options?.binary 
        ? Buffer.from(JSON.stringify(gltfData))
        : JSON.stringify(gltfData, null, 2);

      await this.api.fileSystem.writeFile(outputPath, content);

      const stats = await this.api.fileSystem.stat(outputPath);
      return {
        success: true,
        outputPath,
        bytesWritten: stats.size,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**Usage:**

```typescript
const result = await extensionPointManager.exportFile(
  meshData,
  'gltf',
  './output/model.gltf',
  { binary: true }
);
```

---

### 3. Validator Extensions

For validating asset integrity and structure.

```typescript
interface ValidatorExtension {
  id: string;
  name: string;
  assetTypes: string[];          // e.g., ['mesh', 'texture']
  validate(assetPath: string, options?: any): Promise<ValidationIssue[]>;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}
```

**Example: Mesh Validator**

```typescript
class MeshValidatorExtension implements ValidatorExtension {
  id = 'validator.mesh';
  name = 'Mesh Validator';
  assetTypes = ['mesh'];

  async validate(assetPath: string, options?: any): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    const stats = await this.api.fileSystem.stat(assetPath);

    if (stats.size === 0) {
      issues.push({
        severity: 'error',
        code: 'EMPTY_FILE',
        message: 'Mesh file is empty',
      });
    }

    if (stats.size > 100 * 1024 * 1024) {
      issues.push({
        severity: 'warning',
        code: 'LARGE_FILE',
        message: 'Mesh file is very large (>100MB)',
        suggestion: 'Consider using LOD',
      });
    }

    return issues;
  }
}
```

**Usage:**

```typescript
const results = await extensionPointManager.validateAsset(
  './meshes/character.nif',
  'mesh'
);

// Results from all matched validators
for (const result of results) {
  console.log(`Validator: ${result.validator}`);
  for (const issue of result.issues) {
    console.log(`  [${issue.severity}] ${issue.message}`);
  }
}
```

---

### 4. Tool Wrapper Extensions

For integrating with external tools.

```typescript
interface ToolWrapperExtension {
  id: string;
  name: string;
  toolName: string;               // e.g., 'blender', 'xedit'
  isRunning(): Promise<boolean>;
  launch(options?: any): Promise<void>;
  execute(command: string, args?: any): Promise<any>;
}
```

**Example: Blender Wrapper**

```typescript
class BlenderToolWrapperExtension implements ToolWrapperExtension {
  id = 'tool.blender';
  name = 'Blender Integration';
  toolName = 'blender';

  async isRunning(): Promise<boolean> {
    return this.api.tools.blender.isRunning();
  }

  async launch(options?: any): Promise<void> {
    await this.api.tools.blender.launch(options);
  }

  async execute(command: string, args?: any): Promise<any> {
    if (command === 'version') {
      return await this.api.tools.blender.getVersion();
    } else if (command === 'runScript') {
      return await this.api.tools.blender.runScript(args.script);
    }
    return { success: true };
  }
}
```

**Usage:**

```typescript
const result = await extensionPointManager.executeTool(
  'blender',
  'runScript',
  { script: 'import bpy; print(bpy.app.version)' }
);
```

---

### 5. Language Extensions

For adding syntax highlighting and language support.

```typescript
interface LanguageExtension {
  id: string;
  name: string;
  languageId: string;
  fileExtensions: string[];
  highlightRules?: any;
  autoComplete?: {
    trigger: string[];
    items: Array<{ label: string; detail?: string; insertText: string }>;
  };
}
```

**Example: Blueprint Language**

```typescript
class BlueprintLanguageExtension implements LanguageExtension {
  id = 'language.blueprint';
  name = 'Blueprint Script';
  languageId = 'blueprint';
  fileExtensions = ['.bp', '.blueprint'];

  highlightRules = {
    keywords: ['if', 'else', 'for', 'function', 'var'],
    types: ['int', 'float', 'string', 'vector'],
  };

  autoComplete = {
    trigger: ['.'],
    items: [
      { label: 'position', detail: 'Vector3' },
      { label: 'rotation', detail: 'Quaternion' },
    ],
  };
}
```

---

### 6. Theme Extensions

For custom UI themes.

```typescript
interface ThemeExtension {
  id: string;
  name: string;
  isDark: boolean;
  colors: { [key: string]: string };
  icons?: { [key: string]: string };
}
```

**Example: Dark Professional Theme**

```typescript
class DarkThemeExtension implements ThemeExtension {
  id = 'theme.dark-professional';
  name = 'Dark Professional';
  isDark = true;

  colors = {
    primary: '#2962FF',
    secondary: '#1565C0',
    background: '#1E1E1E',
    foreground: '#E0E0E0',
    accent: '#00BCD4',
    error: '#F44336',
    warning: '#FF9800',
    success: '#4CAF50',
    border: '#333333',
  };
}
```

**Usage:**

```typescript
const themes = extensionPointManager.getThemes();
// Apply selected theme
applyTheme(themes[0]);
```

---

### 7. Snippet Extensions

For code snippets and templates.

```typescript
interface SnippetExtension {
  id: string;
  name: string;
  language: string;
  snippets: Array<{
    label: string;
    description?: string;
    prefix: string;
    body: string | string[];
    scope?: string;
  }>;
}
```

**Example: Blueprint Snippets**

```typescript
class BlueprintSnippetsExtension implements SnippetExtension {
  id = 'snippets.blueprint';
  name = 'Blueprint Snippets';
  language = 'blueprint';

  snippets = [
    {
      label: 'Function',
      prefix: 'func',
      body: [
        'Function ${1:name}()',
        '{',
        '\t${0}',
        '}',
      ],
    },
    {
      label: 'If Statement',
      prefix: 'if',
      body: [
        'if (${1:condition})',
        '{',
        '\t${0}',
        '}',
      ],
    },
  ];
}
```

---

### 8. Command Extensions

For custom commands with keybindings.

```typescript
interface CommandExtension {
  id: string;
  name: string;
  command: string;
  title: string;
  category?: string;
  keybinding?: string;
  execute(args?: any): Promise<any>;
}
```

**Example: Quick Export Command**

```typescript
class QuickExportCommandExtension implements CommandExtension {
  id = 'cmd.quickExport';
  name = 'Quick Export';
  command = 'extension.quickExport';
  title = 'Quick Export Asset';
  category = 'Assets';
  keybinding = 'ctrl+alt+e';

  async execute(args?: any): Promise<any> {
    const result = await this.api.ui.showDialog({
      title: 'Export Format',
      buttons: ['FBX', 'OBJ', 'glTF', 'Cancel'],
    });

    if (result.response < 3) {
      return { success: true, format: ['fbx', 'obj', 'gltf'][result.response] };
    }

    return { success: false };
  }
}
```

---

### 9. Panel Extensions

For custom UI panels.

```typescript
interface PanelExtension {
  id: string;
  name: string;
  title: string;
  icon?: string;
  position?: 'left' | 'right' | 'bottom' | 'top';
  defaultVisible?: boolean;
  render(): any;                  // React component
  onActivate?(): void;
  onDeactivate?(): void;
}
```

**Usage:**

```typescript
const panels = extensionPointManager.getPanels();
// Render panels in workspace layout
panels.forEach(panel => {
  renderPanel(panel);
});
```

---

### 10. Wizard Extensions

For multi-step wizards.

```typescript
interface WizardExtension {
  id: string;
  name: string;
  title: string;
  steps: Array<{
    id: string;
    title: string;
    render(): any;
    validate?(): Promise<boolean>;
  }>;
  onComplete?(data: any): Promise<void>;
  onCancel?(): void;
}
```

---

## Usage Patterns

### Pattern 1: Importer Chain

Automatically try importers in sequence until one succeeds:

```typescript
// In plugin activate()
registry.register('importer', 
  new NIFImporterExtension(this.api),
  this.pluginId
);
registry.register('importer',
  new FBXImporterExtension(this.api),
  this.pluginId
);

// Automatic execution
const result = await extensionPointManager.importFile('./model.nif');
// Tries NIF importer first, falls back to FBX if needed
```

### Pattern 2: Validation Chain

Run all validators for an asset:

```typescript
registry.register('validator',
  new MeshValidatorExtension(),
  this.pluginId
);
registry.register('validator',
  new TextureValidatorExtension(),
  this.pluginId
);

// All validators execute
const results = await extensionPointManager.validateAsset(
  './asset.nif',
  'mesh'
);
```

### Pattern 3: Tool Integration

Wrap external tool and launch on demand:

```typescript
registry.register('tool-wrapper',
  new BlenderToolWrapperExtension(this.api),
  this.pluginId
);

// Auto-launch if not running
const result = await extensionPointManager.executeTool(
  'blender',
  'runScript',
  { script: '...' }
);
```

---

## Creating Custom Extensions

### Step 1: Define Extension Interface

```typescript
interface MyExtension {
  id: string;
  name: string;
  // ... specific properties
  myMethod(): Promise<any>;
}
```

### Step 2: Implement Extension

```typescript
class MyExtensionImpl implements MyExtension {
  id = 'my-extension';
  name = 'My Custom Extension';

  async myMethod(): Promise<any> {
    // Implementation
  }
}
```

### Step 3: Register in Plugin

```typescript
export class MyPlugin extends MossyPlugin {
  async activate() {
    const registry = extensionPointManager.getRegistry();
    registry.register('importer', // or other type
      new MyExtensionImpl(),
      'my-plugin-id'
    );
  }
}
```

---

## Extension Registry API

```typescript
// Register extension
registry.register<T extends ExtensionType>(
  type: T,
  extension: any,
  pluginId: string
): void;

// Unregister extension
registry.unregister(extensionId: string): void;

// Get single extension
registry.get<T extends ExtensionType>(
  type: T,
  extensionId?: string
): any | null;

// Get all extensions of type
registry.getForType(type: ExtensionType): any[];

// Invoke extension method
registry.invoke<T extends ExtensionType>(
  type: T,
  extensionId: string,
  method: string,
  ...args: any[]
): Promise<any>;
```

---

## Extension Manager API

```typescript
// Import with chain fallback
extensionPointManager.importFile(
  filePath: string,
  options?: any
): Promise<any>;

// Export with format matching
extensionPointManager.exportFile(
  data: any,
  format: string,
  outputPath: string,
  options?: any
): Promise<any>;

// Validate with all validators
extensionPointManager.validateAsset(
  assetPath: string,
  assetType?: string
): Promise<any[]>;

// Execute tool command
extensionPointManager.executeTool(
  toolName: string,
  command: string,
  args?: any
): Promise<any>;

// Get UI panels
extensionPointManager.getPanels(): PanelExtension[];

// Get themes
extensionPointManager.getThemes(): ThemeExtension[];

// Get language support
extensionPointManager.getLanguage(languageId: string): LanguageExtension | null;

// Get snippets
extensionPointManager.getSnippets(language: string): SnippetExtension[];

// Get statistics
extensionPointManager.getStatistics(): Record<ExtensionType, number>;
```

---

## Best Practices

1. **Always validate input**: Check file formats, data structures, options
2. **Use meaningful IDs**: Format: `type.vendor.name` (e.g., `importer.bethesda.nif`)
3. **Provide clear errors**: Return detailed error messages and suggestions
4. **Handle failures gracefully**: Chain execution allows fallbacks
5. **Document requirements**: Clearly list dependencies and configurations
6. **Type everything**: Use TypeScript interfaces for all data
7. **Test registration**: Validate extension structure before use
8. **Log operations**: Help users understand what extensions are doing

---

## Compilation Status

✅ **All extension point code compiles successfully with 0 new TypeScript errors**

- `src/shared/types.ts`: 20+ extension interfaces added
- `src/mining/extensionPoints.ts`: 250+ lines, registry and manager
- `src/mining/extensionExamples.ts`: 450+ lines, 15 complete example extensions

---

## Next Steps

1. **IPC Handler Integration** - Expose extension APIs to renderer
2. **Plugin Discovery** - Auto-discover extensions in plugin directories
3. **Runtime Validation** - Enforce permission constraints on extensions
4. **Performance Profiling** - Monitor extension chain execution times
5. **Extension Marketplace** - Distribute and share extensions
