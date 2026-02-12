# Electron Store Integration Guide

This guide explains how to use electron-store for better settings management in Mossy.

## Overview

**electron-store** is a simple data persistence solution for Electron apps. It provides:
- Type-safe settings storage
- Schema validation
- Encryption support
- Migration system
- Watch for changes
- Atomic writes

## Why electron-store?

### Before (lowdb)
- Manual schema management
- No type safety
- Basic validation
- More boilerplate

### After (electron-store)
- TypeScript integration
- Automatic schema validation
- Built-in encryption
- Simpler API
- Better performance

## Installation

Already added to package.json:
```json
{
  "dependencies": {
    "electron-store": "^8.2.0"
  }
}
```

## Basic Usage

### 1. Create Store Instance

```typescript
// src/main/settings-store.ts
import Store from 'electron-store';

interface Settings {
  theme: 'light' | 'dark';
  aiProvider: 'openai' | 'groq' | 'lmstudio';
  openaiApiKey?: string;
  groqApiKey?: string;
  windowBounds: {
    width: number;
    height: number;
  };
  recentProjects: string[];
}

const schema = {
  theme: {
    type: 'string',
    enum: ['light', 'dark'],
    default: 'dark'
  },
  aiProvider: {
    type: 'string',
    enum: ['openai', 'groq', 'lmstudio'],
    default: 'openai'
  },
  windowBounds: {
    type: 'object',
    properties: {
      width: { type: 'number', default: 1200 },
      height: { type: 'number', default: 800 }
    }
  },
  recentProjects: {
    type: 'array',
    default: []
  }
};

export const settingsStore = new Store<Settings>({
  schema,
  name: 'mossy-settings'
});
```

### 2. Read/Write Settings

```typescript
// Get a value
const theme = settingsStore.get('theme'); // 'dark'

// Set a value
settingsStore.set('theme', 'light');

// Get nested value
const width = settingsStore.get('windowBounds.width');

// Set nested value
settingsStore.set('windowBounds.width', 1400);

// Get with default
const apiKey = settingsStore.get('openaiApiKey', '');

// Delete a value
settingsStore.delete('openaiApiKey');

// Clear all
settingsStore.clear();
```

### 3. Watch for Changes

```typescript
// Watch specific key
settingsStore.onDidChange('theme', (newValue, oldValue) => {
  console.log('Theme changed:', oldValue, '→', newValue);
  // Update UI
});

// Watch any change
settingsStore.onDidAnyChange((newValue, oldValue) => {
  console.log('Settings changed');
});
```

## Advanced Features

### Encryption

```typescript
const secureStore = new Store({
  encryptionKey: 'my-secret-key',
  name: 'mossy-secure'
});

// API keys stored encrypted
secureStore.set('openaiApiKey', 'sk-...');
```

### Migrations

```typescript
const store = new Store({
  migrations: {
    '1.0.0': (store) => {
      // Migrate old settings format
      store.set('version', '1.0.0');
    },
    '2.0.0': (store) => {
      // Add new defaults
      store.set('newFeature', true);
    }
  }
});
```

### Multiple Stores

```typescript
// User settings
const userStore = new Store({ name: 'user-settings' });

// App state
const stateStore = new Store({ name: 'app-state' });

// Project data
const projectStore = new Store({ name: 'project-data' });
```

## Integration with Mossy

### Replace Current Settings System

**Current (src/main/store.ts):**
```typescript
import { Low } from 'lowdb';
// Manual JSON file handling
```

**New (src/main/settings-store.ts):**
```typescript
import Store from 'electron-store';

export const settingsStore = new Store<MossySettings>({
  schema: mossySettingsSchema,
  defaults: defaultSettings
});
```

### IPC Bridge

```typescript
// src/main/main.ts
import { ipcMain } from 'electron';
import { settingsStore } from './settings-store';

// Expose to renderer
ipcMain.handle('settings:get', (event, key) => {
  return settingsStore.get(key);
});

ipcMain.handle('settings:set', (event, key, value) => {
  settingsStore.set(key, value);
});

ipcMain.handle('settings:delete', (event, key) => {
  settingsStore.delete(key);
});
```

### Renderer Usage

```typescript
// src/renderer/src/hooks/useSettings.ts
import { useState, useEffect } from 'react';

export function useSettings<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // Get initial value
    window.electron.api.invoke('settings:get', key).then(setValue);

    // Watch for changes
    const unsubscribe = window.electron.api.on(
      `settings:changed:${key}`,
      (newValue) => setValue(newValue)
    );

    return unsubscribe;
  }, [key]);

  const updateValue = (newValue: T) => {
    setValue(newValue);
    window.electron.api.invoke('settings:set', key, newValue);
  };

  return [value, updateValue] as const;
}
```

## Schema Definition

```typescript
import { Schema } from 'electron-store';

interface MossySettings {
  // AI Settings
  aiProvider: 'openai' | 'groq' | 'lmstudio';
  openaiApiKey?: string;
  groqApiKey?: string;
  lmstudioEndpoint: string;
  
  // UI Settings
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
  
  // Tool Paths
  blenderPath?: string;
  xeditPath?: string;
  creationKitPath?: string;
  mo2Path?: string;
  
  // Features
  neuralLinkEnabled: boolean;
  autoSaveInterval: number;
  
  // Window State
  windowBounds: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
  
  // Recent Files
  recentProjects: string[];
  recentFiles: string[];
}

const mossySettingsSchema: Schema<MossySettings> = {
  aiProvider: {
    type: 'string',
    enum: ['openai', 'groq', 'lmstudio'],
    default: 'openai'
  },
  lmstudioEndpoint: {
    type: 'string',
    default: 'http://localhost:1234/v1'
  },
  theme: {
    type: 'string',
    enum: ['light', 'dark'],
    default: 'dark'
  },
  language: {
    type: 'string',
    default: 'en'
  },
  neuralLinkEnabled: {
    type: 'boolean',
    default: true
  },
  autoSaveInterval: {
    type: 'number',
    minimum: 1,
    maximum: 60,
    default: 5
  },
  windowBounds: {
    type: 'object',
    properties: {
      width: {
        type: 'number',
        default: 1200,
        minimum: 800
      },
      height: {
        type: 'number',
        default: 800,
        minimum: 600
      }
    }
  },
  recentProjects: {
    type: 'array',
    default: [],
    maxItems: 10
  }
};
```

## Migration Plan

### Step 1: Create New Store
```typescript
// src/main/settings-store.ts
export const settingsStore = new Store<MossySettings>({
  schema: mossySettingsSchema,
  name: 'mossy-settings'
});
```

### Step 2: Migrate Existing Data
```typescript
// src/main/migrate-settings.ts
import { settingsStore } from './settings-store';
import { db } from './store'; // Old lowdb

export async function migrateSettings() {
  const oldSettings = await db.data;
  
  // Copy values to new store
  if (oldSettings.theme) {
    settingsStore.set('theme', oldSettings.theme);
  }
  
  if (oldSettings.aiProvider) {
    settingsStore.set('aiProvider', oldSettings.aiProvider);
  }
  
  // ... migrate all settings
  
  console.log('Settings migrated to electron-store');
}
```

### Step 3: Update IPC Handlers
```typescript
// Replace old handlers with new ones
ipcMain.handle('settings:get', (event, key) => {
  return settingsStore.get(key);
});
```

### Step 4: Update Renderer Code
```typescript
// Replace localStorage with IPC calls
const theme = await window.electron.api.invoke('settings:get', 'theme');
```

## Benefits

### Type Safety
```typescript
// ✅ Type checked
settingsStore.get('theme'); // 'light' | 'dark'

// ❌ Compile error
settingsStore.set('theme', 'invalid');
```

### Schema Validation
```typescript
// ✅ Valid
settingsStore.set('autoSaveInterval', 5);

// ❌ Throws error
settingsStore.set('autoSaveInterval', 100); // > maximum
```

### Encryption
```typescript
const secureStore = new Store({
  encryptionKey: 'secret',
  name: 'api-keys'
});

// Encrypted on disk
secureStore.set('openaiKey', 'sk-...');
```

### Atomic Writes
- No corruption from crashes
- Safe concurrent access
- Automatic file locking

## File Location

Settings are stored in:
- **Windows**: `%APPDATA%/mossy-desktop/mossy-settings.json`
- **macOS**: `~/Library/Application Support/mossy-desktop/mossy-settings.json`
- **Linux**: `~/.config/mossy-desktop/mossy-settings.json`

## Testing

```typescript
// test/settings-store.test.ts
import Store from 'electron-store';

describe('SettingsStore', () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ 
      cwd: 'test-data',
      name: 'test-settings'
    });
  });

  afterEach(() => {
    store.clear();
  });

  test('should get default value', () => {
    expect(store.get('theme')).toBe('dark');
  });

  test('should set and get value', () => {
    store.set('theme', 'light');
    expect(store.get('theme')).toBe('light');
  });
});
```

## Performance

### Benchmarks
- **Read**: < 1ms
- **Write**: < 5ms
- **File size**: ~10KB for typical settings
- **Memory**: Minimal overhead

### Best Practices
1. Use schema for validation
2. Don't store large objects
3. Batch updates when possible
4. Use migrations for version changes
5. Encrypt sensitive data

## Troubleshooting

### Settings Not Saving
```typescript
// Check file permissions
console.log(settingsStore.path);

// Verify schema
console.log(settingsStore.schema);
```

### Migration Issues
```typescript
// Reset to defaults
settingsStore.clear();

// Manual migration
const oldData = JSON.parse(fs.readFileSync('old-settings.json'));
settingsStore.set(oldData);
```

### Encryption Problems
```typescript
// Recreate store with new key
const newStore = new Store({
  encryptionKey: 'new-key',
  name: 'new-store'
});
```

## Comparison

| Feature | lowdb | electron-store |
|---------|-------|----------------|
| Type Safety | ❌ | ✅ |
| Schema Validation | Manual | ✅ Built-in |
| Encryption | Manual | ✅ Built-in |
| Migrations | Manual | ✅ Built-in |
| Watch Changes | Manual | ✅ Built-in |
| Atomic Writes | ❌ | ✅ |
| Performance | Good | Excellent |
| API | Verbose | Simple |

## Resources

- **GitHub**: https://github.com/sindresorhus/electron-store
- **Docs**: See repository README
- **Examples**: See `external/electron-store/`

## Summary

electron-store provides:
- ✅ Better type safety
- ✅ Schema validation
- ✅ Built-in encryption
- ✅ Simpler API
- ✅ Better performance
- ✅ Atomic writes
- ✅ Migration support

**Status**: Ready to integrate! ✅
