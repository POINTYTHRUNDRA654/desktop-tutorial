# Creation Kit Crash Prevention System

## Overview

The CK Crash Prevention Engine is a proactive safety system that helps prevent common Creation Kit crashes through validation, real-time monitoring, and crash pattern analysis.

## Features

### 1. Pre-Launch Validation
Analyzes your plugin **before** opening in CK:
- ✅ Missing master file detection
- ✅ File size risk assessment (>50MB plugins)
- ✅ Navmesh crash risk detection
- ✅ Precombine/previs conflict warnings
- ✅ Script compilation error checks
- ✅ Record count analysis (>5000 records)
- ✅ Comprehensive crash risk score (0-100%)

### 2. Real-Time Monitoring
Tracks CK process health every 2 seconds:
- 📊 Memory usage (warns at 3.5GB, CK has 4GB limit)
- 📊 Handle count (resource leak detection)
- 📊 CPU usage percentage
- 📊 Thread count
- 📊 Responsiveness status (normal/slow/frozen)
- 🚨 Automatic alerts on critical conditions

### 3. Crash Log Analysis
Automatically diagnoses crash causes:
- 🔍 Memory overflow (4GB 32-bit limit exceeded)
- 🔍 Access violations (invalid memory access)
- 🔍 Stack overflow (infinite recursion)
- 🔍 Missing assets (meshes, textures, scripts)
- 🔍 Navmesh corruption
- 🔍 Precombine/previs conflicts

### 4. Prevention Plans
Generates step-by-step mitigation strategies:
- 📋 Ordered action steps
- 📋 Automated vs manual tasks
- 📋 Tool recommendations (LOOT, xEdit, etc.)
- 📋 Estimated risk reduction percentage
- 📋 Time estimates for completion

## Usage

### Basic Integration

```tsx
import { CKSafetyPanel } from './CKSafetyPanel';

function DesktopBridge() {
  const [selectedPlugin, setSelectedPlugin] = useState<string>('');

  const handleLaunchCK = () => {
    // Launch CK with validated plugin
    window.electron.api.launchProgram('Creation Kit', [selectedPlugin]);
  };

  return (
    <div>
      <CKSafetyPanel 
        pluginPath={selectedPlugin}
        onLaunchCK={handleLaunchCK}
      />
    </div>
  );
}
```

### Standalone Engine Usage

```typescript
import { ckCrashPrevention, ModData } from './CKCrashPreventionEngine';

// Validate before launch
const modData: ModData = {
  pluginPath: 'Data/MyMod.esp',
  pluginName: 'MyMod.esp',
  masters: ['Fallout4.esm', 'DLCRobot.esm'],
  recordCount: 3500,
  fileSize: 25 * 1024 * 1024,
  lastModified: new Date(),
  hasScripts: true,
  hasNavmesh: false,
  hasPrecombines: true
};

const result = await ckCrashPrevention.validateBeforeCK(modData);

if (result.isValid && result.estimatedCrashRisk < 50) {
  console.log('Safe to launch CK');
} else {
  console.log('Warning:', result.issues);
  console.log('Recommendations:', result.recommendations);
}

// Monitor CK process
const ckPid = 12345; // From process detection
ckCrashPrevention.monitorCKProcess(ckPid, (metrics) => {
  console.log('Memory:', metrics.memoryUsageMB + 'MB');
  
  if (metrics.warningSignals.length > 0) {
    alert('⚠️ ' + metrics.warningSignals.join('\n'));
  }
});

// Analyze crash after it happens
const diagnosis = await ckCrashPrevention.analyzeCrashLog(
  'Documents/My Games/Fallout4/F4SE/Logs/crash-2026-02-13.log'
);

console.log('Crash Type:', diagnosis.crashType);
console.log('Root Cause:', diagnosis.rootCause);
console.log('Recommendations:', diagnosis.recommendations);
```

## Common Crash Patterns & Solutions

### 1. Memory Overflow (Most Common)
**Symptoms:** CK freezes, becomes unresponsive, crashes without warning
**Cause:** CK is 32-bit, limited to 4GB RAM
**Solutions:**
- Split large plugins into multiple smaller files
- Disable precombines before editing: `CompressPSG OFF`
- Close unnecessary master files
- Edit in sessions (close/reopen CK every 30-45 min)
- Use xEdit for bulk record operations instead

### 2. Navmesh Crashes
**Symptoms:** Crash when clicking navmesh, dragging triangles, or finalizing
**Cause:** Complex navmesh operations on invalid geometry
**Solutions:**
- Save before touching navmesh (Ctrl+S)
- Use navmesh cut tool instead of delete
- Avoid dragging large sections
- Regenerate navmesh if corruption suspected
- Edit in small chunks

### 3. Precombine/Previs Conflicts
**Symptoms:** Crash when opening cells, invisible objects, CTD on load
**Cause:** Precombine data conflicts with new edits
**Solutions:**
- Disable precombines before CK editing: `CompressPSG OFF MyMod.esp`
- Edit plugin without precombined data
- Regenerate precombines after completion
- Never manually edit precombine records in CK

### 4. Missing Assets
**Symptoms:** Immediate crash on load, "file not found" errors
**Cause:** Plugin references missing meshes/textures/scripts
**Solutions:**
- Check Data folder for all referenced files
- Verify mod dependencies are installed
- Run Archive Invalidation for loose files
- Use xEdit "Check for Errors" before CK

### 5. Script Compilation Errors
**Symptoms:** Crash when compiling scripts, editor becomes unstable
**Cause:** Syntax errors, missing script properties
**Solutions:**
- Fix script errors in external editor first
- Verify script paths in CK settings
- Check for circular script references
- Use proper script property types

## Integration with Desktop Bridge

The CK Safety Panel can be integrated into Desktop Bridge's program launch workflow:

### 1. Add to Program Selection
```tsx
// In DesktopBridge.tsx
const [showCKSafety, setShowCKSafety] = useState(false);
const [selectedPlugin, setSelectedPlugin] = useState('');

// When user selects CK
if (selectedProgram === 'Creation Kit') {
  setShowCKSafety(true);
}
```

### 2. Plugin File Picker
```tsx
const handleSelectPlugin = async () => {
  const result = await window.electron.api.openFileDialog({
    title: 'Select Plugin File',
    filters: [
      { name: 'Fallout 4 Plugins', extensions: ['esp', 'esm', 'esl'] }
    ]
  });
  
  if (result.filePaths[0]) {
    setSelectedPlugin(result.filePaths[0]);
  }
};
```

### 3. Launch with Validation
```tsx
const handleLaunchCK = async () => {
  // CKSafetyPanel has already validated
  // Launch CK with selected plugin as argument
  await window.electron.api.launchProgram('Creation Kit', [
    `-editor:${selectedPlugin}`
  ]);
  
  // Start monitoring (get PID from process detection)
  const ckProcess = await window.electron.api.getProcessByName('CreationKit.exe');
  if (ckProcess) {
    startMonitoring(ckProcess.pid);
  }
};
```

## Neural Link Integration

The crash prevention system can integrate with Neural Link for advanced monitoring:

```typescript
// In NeuralLink session tracking
if (neuralLink.activeSession?.program === 'Creation Kit') {
  // Auto-validate user's working plugin
  const workingPlugin = neuralLink.activeSession.context.filePath;
  const validation = await ckCrashPrevention.validateBeforeCK(
    await getModDataFromFile(workingPlugin)
  );
  
  // Show warning notification if high risk
  if (validation.estimatedCrashRisk > 60) {
    showNotification({
      type: 'warning',
      title: 'CK Crash Risk Detected',
      message: `${validation.estimatedCrashRisk}% crash risk - see Safety Panel`,
      actions: ['View Issues', 'Dismiss']
    });
  }
}
```

## Electron IPC Handlers

To enable full functionality, add these IPC handlers in `main.ts`:

```typescript
// Get plugin metadata
ipcMain.handle('get-plugin-metadata', async (event, pluginPath: string) => {
  // Parse ESP/ESM file headers
  // Extract masters, record count, etc.
  return {
    masters: ['Fallout4.esm'],
    recordCount: 2500,
    fileSize: fsSync.statSync(pluginPath).size,
    // ... other metadata
  };
});

// Monitor process
ipcMain.handle('get-process-metrics', async (event, pid: number) => {
  // Use Windows API or third-party library
  // Get memory, CPU, handles, etc.
  return {
    memoryUsageMB: 2048,
    cpuPercent: 45,
    handleCount: 5000,
    // ... other metrics
  };
});

// Read crash log
ipcMain.handle('read-crash-log', async (event, logPath: string) => {
  return fsSync.readFileSync(logPath, 'utf-8');
});
```

## Configuration

### Risk Thresholds
Customize risk assessment in `CKCrashPreventionEngine.ts`:

```typescript
// In validateBeforeCK method
if (modData.fileSize > 50 * 1024 * 1024) {  // 50MB threshold
  crashRisk += 20;
}

if (modData.recordCount > 5000) {  // 5000 record threshold
  crashRisk += 10;
}
```

### Monitoring Interval
Change monitoring frequency:

```typescript
// In monitorCKProcess method
const interval = setInterval(async () => {
  // Collect metrics
}, 2000);  // 2000ms = 2 seconds
```

### Memory Warning Level
Adjust when warnings trigger:

```typescript
if (metrics.memoryUsageMB > 3500) {  // 3.5GB warning
  metrics.warningSignals.push('⚠️ Memory usage approaching 4GB limit');
}
```

## Best Practices

### For Modders
1. **Always validate before launch** - Catch issues early
2. **Monitor during long sessions** - Watch for memory buildup
3. **Save frequently** - Ctrl+S every 5 minutes minimum
4. **Restart CK regularly** - Every 30-45 minutes to clear memory
5. **Keep backups** - Plugin corruption can happen
6. **Use xEdit for bulk operations** - More stable than CK
7. **Test in small increments** - Don't make 500 changes then test

### For Development
1. **Cache validation results** - Don't re-validate unchanged plugins
2. **Persist crash history** - Learn from past crashes
3. **Track patterns** - Build database of common crash signatures
4. **Add telemetry** - (opt-in) Aggregate crash data to improve detection
5. **Integrate with logging** - Capture CK console output
6. **Auto-backup before launch** - Create safety restore point

## Future Enhancements

### Planned Features
- 🔮 ML-based crash prediction from edit patterns
- 🔮 Automatic backup before high-risk operations
- 🔮 Integration with xEdit for pre-validation
- 🔮 Cloud-based crash pattern database
- 🔮 Auto-recovery suggestions from crash history
- 🔮 Performance profiling (identify slow operations)
- 🔮 Cell edit complexity scoring
- 🔮 Asset dependency visualization
- 🔮 Safe edit recommendations (low-risk tasks first)

### Community Contributions
- Share crash patterns and solutions
- Build crash signature database
- Document rare crash causes
- Create automated fix scripts

## Troubleshooting

### Validation Not Running
- Check that `pluginPath` prop is set correctly
- Verify plugin file exists and is readable
- Check console for errors in `validateBeforeCK`

### Monitoring Not Working
- Verify CK process PID is correct
- Check if process access permissions are granted
- Ensure IPC handlers are registered in main process

### Inaccurate Risk Scores
- Calibrate thresholds based on your system specs
- Higher RAM systems can handle larger plugins
- Adjust risk weights in `validateBeforeCK`

### False Positives
- Some "issues" may not crash on all systems
- Use `severity` levels to filter critical vs warnings
- Customize validation rules for your workflow

## Resources

- [Creation Kit Documentation](https://www.creationkit.com/)
- [xEdit Documentation](https://tes5edit.github.io/)
- [Fallout 4 Mod Author Community](https://bethesda.net/community/category/232/fallout-4-mod-community)
- [CK Crash Logs Location](file:///C:/Users/USERNAME/Documents/My%20Games/Fallout4/F4SE/Logs/)

## Support

For issues or feature requests:
- GitHub Issues: [Mossy Repository](https://github.com/YOUR_USERNAME/mossy)
- Community Forum: [Fallout 4 Modding Discord](https://discord.gg/fallout4mods)
- Documentation Updates: Submit PR to improve this guide

---

**Safety First! The best crash is the one that never happens. 🛡️**
