# Features 3-10: IPC Implementation Guide

## Overview

This document provides the complete IPC handler implementations needed for features 3-10. These handlers should be added to `src/electron/main.ts` and exposed through `src/electron/preload.ts`.

## Implementation Status

- ✅ Feature 1: INI Configuration Manager - Complete
- ✅ Feature 2: Asset Duplicate Scanner - Complete  
- 📋 Features 3-10: Need IPC handlers (documented below)

---

## Feature 3: Game Log Monitor

### IPC Handlers (main.ts)

```typescript
// Game Log Monitor - Browse for log file
ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_BROWSE_LOG, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// Start monitoring
let logWatcher: fs.FSWatcher | null = null;
ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_START, async (event, logPath: string) => {
  if (logWatcher) logWatcher.close();
  
  logWatcher = fs.watch(logPath, (eventType) => {
    if (eventType === 'change') {
      // Read new lines and send to renderer
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').slice(-10);
      lines.forEach(line => {
        event.sender.send('log-update', {
          timestamp: new Date().toISOString(),
          level: line.includes('ERROR') ? 'error' : line.includes('WARNING') ? 'warning' : 'info',
          message: line
        });
      });
    }
  });
  return true;
});

// Stop monitoring
ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_STOP, async () => {
  if (logWatcher) {
    logWatcher.close();
    logWatcher = null;
  }
  return true;
});

// Get/Save last path
ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_GET_LAST_PATH, async () => {
  const settingsPath = path.join(app.getPath('userData'), 'log-monitor-settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return settings.lastPath || null;
  }
  return null;
});

ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_SAVE_LAST_PATH, async (event, logPath: string) => {
  const settingsPath = path.join(app.getPath('userData'), 'log-monitor-settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify({ lastPath: logPath }));
  return true;
});

// Export logs
ipcMain.handle(IPC_CHANNELS.GAME_LOG_MONITOR_EXPORT_LOGS, async (event, logs: any[]) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `fallout4-logs-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(logs, null, 2));
    return true;
  }
  return false;
});
```

### API Exposure (preload.ts)

```typescript
gameLogMonitor: {
  browseLogFile: () => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_BROWSE_LOG),
  startMonitoring: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_START, path),
  stopMonitoring: () => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_STOP),
  getLastLogPath: () => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_GET_LAST_PATH),
  saveLastLogPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_SAVE_LAST_PATH, path),
  exportLogs: (logs: any[]) => ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_EXPORT_LOGS, logs),
  onLogUpdate: (callback: (entry: any) => void) => {
    ipcRenderer.on('log-update', (_event, entry) => callback(entry));
  }
}
```

---

## Feature 4: xEdit Script Executor

### IPC Handlers (main.ts)

```typescript
// Browse for xEdit executable
ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_XEDIT, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Executables', extensions: ['exe'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// Browse for plugin
ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_PLUGIN, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Plugins', extensions: ['esp', 'esm', 'esl'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// Get/Save xEdit path
ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_GET_XEDIT_PATH, async () => {
  const settingsPath = path.join(app.getPath('userData'), 'xedit-settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return settings.xEditPath || null;
  }
  return null;
});

ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_SAVE_XEDIT_PATH, async (event, xEditPath: string) => {
  const settingsPath = path.join(app.getPath('userData'), 'xedit-settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify({ xEditPath }));
  return true;
});

// Get plugin list
ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_GET_PLUGIN_LIST, async () => {
  const dataPath = path.join(process.env.USERPROFILE || '', 'Documents', 'My Games', 'Fallout4', 'Data');
  if (fs.existsSync(dataPath)) {
    return fs.readdirSync(dataPath)
      .filter(f => f.endsWith('.esp') || f.endsWith('.esm') || f.endsWith('.esl'));
  }
  return [];
});

// Execute script
ipcMain.handle(IPC_CHANNELS.XEDIT_SCRIPT_EXECUTE, async (event, xEditPath: string, plugin: string, scriptId: string) => {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const xedit = spawn(xEditPath, [
      '-quickautoclean',
      '-autoload',
      plugin
    ]);

    let output = '';
    let errors: string[] = [];
    let warnings: string[] = [];

    xedit.stdout?.on('data', (data) => {
      output += data.toString();
      event.sender.send('xedit-progress', {
        progress: 50,
        text: 'Processing...'
      });
    });

    xedit.stderr?.on('data', (data) => {
      errors.push(data.toString());
    });

    xedit.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        errors,
        warnings,
        duration: (Date.now() - startTime) / 1000
      });
    });
  });
});
```

### API Exposure (preload.ts)

```typescript
xEditScriptExecutor: {
  browseXEdit: () => ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_XEDIT),
  browsePlugin: () => ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_PLUGIN),
  getXEditPath: () => ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_GET_XEDIT_PATH),
  saveXEditPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_SAVE_XEDIT_PATH, path),
  getPluginList: () => ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_GET_PLUGIN_LIST),
  executeScript: (xEditPath: string, plugin: string, scriptId: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_EXECUTE, xEditPath, plugin, scriptId),
  onProgress: (callback: (data: { progress: number; text: string }) => void) => {
    ipcRenderer.on('xedit-progress', (_event, data) => callback(data));
  }
}
```

---

## Feature 5: Project Templates

### IPC Handlers (main.ts)

```typescript
// Browse for path
ipcMain.handle(IPC_CHANNELS.PROJECT_TEMPLATE_BROWSE_PATH, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Create project
ipcMain.handle(IPC_CHANNELS.PROJECT_TEMPLATE_CREATE, async (event, config: {
  templateId: string;
  projectName: string;
  projectPath: string;
  authorName: string;
}) => {
  const projectDir = path.join(config.projectPath, config.projectName);
  
  try {
    // Create directory structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'Textures'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'Meshes'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'Sound'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'Scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'Interface'), { recursive: true });

    // Create README
    const readme = `# ${config.projectName}\n\nAuthor: ${config.authorName}\nTemplate: ${config.templateId}\n\nCreated with Mossy`;
    fs.writeFileSync(path.join(projectDir, 'README.md'), readme);

    // Create .gitignore
    const gitignore = `*.bak\n*.tmp\n.DS_Store\nThumbs.db`;
    fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignore);

    return { success: true, path: projectDir };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Download template
ipcMain.handle(IPC_CHANNELS.PROJECT_TEMPLATE_DOWNLOAD, async (event, templateId: string) => {
  // Stub - would download from online repository
  return true;
});
```

### API Exposure (preload.ts)

```typescript
projectTemplates: {
  browsePath: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_BROWSE_PATH),
  createProject: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_CREATE, config),
  downloadTemplate: (templateId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_DOWNLOAD, templateId)
}
```

---

## Features 6-10: Stub Implementations

For features 6-10 (Mod Conflict Visualizer, FormID Remapper, Mod Comparison Tool, Precombine Generator, Voice Commands), implement similar patterns with stub handlers that return mock data for now:

### Main.ts Stub Pattern

```typescript
// Example stub for any feature
ipcMain.handle(IPC_CHANNELS.FEATURE_ACTION, async (event, ...args) => {
  console.log(`Feature action called with:`, args);
  // Return mock/stub data
  return { success: true, data: [] };
});
```

### Preload.ts Stub Pattern

```typescript
featureName: {
  action: (...args: any[]) => ipcRenderer.invoke(IPC_CHANNELS.FEATURE_ACTION, ...args)
}
```

---

## Routing Updates (App.tsx)

Add these routes to App.tsx:

```typescript
const GameLogMonitor = lazy(() => import('./GameLogMonitor'));
const XEditScriptExecutor = lazy(() => import('./XEditScriptExecutor'));
const ProjectTemplates = lazy(() => import('./ProjectTemplates'));
const ModConflictVisualizer = lazy(() => import('./ModConflictVisualizer'));
const FormIdRemapper = lazy(() => import('./FormIdRemapper'));
const ModComparisonTool = lazy(() => import('./ModComparisonTool'));
const PrecombineGenerator = lazy(() => import('./PrecombineGenerator'));
const VoiceCommands = lazy(() => import('./VoiceCommands'));

// In routes:
<Route path="/tools/log-monitor" element={<GameLogMonitor />} />
<Route path="/tools/xedit-executor" element={<XEditScriptExecutor />} />
<Route path="/tools/project-templates" element={<ProjectTemplates />} />
<Route path="/tools/conflict-visualizer" element={<ModConflictVisualizer />} />
<Route path="/tools/formid-remapper" element={<FormIdRemapper />} />
<Route path="/tools/mod-comparison" element={<ModComparisonTool />} />
<Route path="/tools/precombine-generator" element={<Precombine Generator />} />
<Route path="/tools/voice-commands" element={<VoiceCommands />} />
```

---

## Implementation Priority

1. **High Priority** (Features 3-5): Game Log Monitor, xEdit Executor, Project Templates
   - Most commonly used
   - Clear user value
   - Implement full handlers

2. **Medium Priority** (Features 6-8): Conflict Visualizer, FormID Remapper, Mod Comparison
   - Advanced users
   - Can start with stubs

3. **Low Priority** (Features 9-10): Precombine Generator, Voice Commands
   - Experimental features
   - Stub implementations sufficient for now

---

## Testing Checklist

For each feature:
- [ ] IPC handlers added to main.ts
- [ ] API exposed in preload.ts
- [ ] Route added to App.tsx
- [ ] Component imports correctly
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Feature loads in UI
- [ ] Basic functionality works
