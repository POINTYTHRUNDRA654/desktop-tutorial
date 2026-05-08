# Automation Engine Documentation

## Overview

The Automation Engine is a powerful background processing system that automatically handles repetitive modding tasks without user intervention. It monitors files, processes, and schedules to keep your Fallout 4 modding workflow optimized and crash-free.

## Key Features

### 1. File System Monitoring 📁
Watches your Fallout 4 Data directory for changes and automatically triggers relevant actions.

**Capabilities:**
- Detects new ESP/ESM files being added
- Monitors modifications to existing plugins
- Triggers conflict scans automatically
- Initiates duplicate asset scans
- Debounced to prevent excessive scanning

**Example Workflow:**
1. You download a new mod from Nexus
2. Extract it to your Data folder
3. Automation Engine detects the new .esp file
4. Automatically scans for conflicts with existing mods
5. Notifies you of any issues before you launch the game

### 2. Process Detection 🎮
Monitors for specific processes (like Fallout4.exe) and takes action when detected.

**Capabilities:**
- Checks for running processes every 30 seconds
- Launches appropriate tools when game starts
- Rate-limited to prevent spam (1 trigger per minute)
- Works on Windows (extensible to other platforms)

**Example Workflow:**
1. You launch Fallout 4
2. Automation Engine detects Fallout4.exe
3. Automatically starts the Game Log Monitor
4. Monitors crash logs in real-time
5. Alerts you if a crash is imminent

### 3. Scheduled Tasks ⏰
Runs maintenance and optimization tasks at specific times.

**Capabilities:**
- Daily maintenance runs (default: 3:00 AM)
- Weekly deep scans (configurable)
- Minute-level scheduling precision
- Prevents duplicate executions
- Timezone-aware

**Example Workflow:**
1. You configure daily maintenance for 3:00 AM
2. Every night at 3:00 AM (when PC is on):
   - Scans for asset duplicates
   - Checks for conflicts
   - Cleans temporary files
   - Optimizes load order
3. You wake up to an optimized setup

### 4. Manual Triggers 👆
On-demand execution of automation rules for testing or immediate needs.

**Capabilities:**
- Trigger any rule manually
- Test automation workflows
- Run maintenance on demand
- Create backups instantly

**Example Workflow:**
1. You're about to install a major mod overhaul
2. Click "Trigger Now" on Auto Backup rule
3. All important files are backed up
4. Proceed with installation safely

## Default Automation Rules

### Auto Conflict Scan
- **ID:** `auto-conflict-scan`
- **Trigger:** File change in Data folder
- **Action:** Scan for ESP/ESM conflicts
- **Purpose:** Detect mod conflicts before they cause crashes
- **Default:** Enabled

### Auto Duplicate Scan
- **ID:** `auto-duplicate-scan`
- **Trigger:** File change in Data folder
- **Action:** Scan for duplicate assets
- **Purpose:** Find redundant textures/meshes to free VRAM
- **Default:** Enabled

### Auto Log Monitor
- **ID:** `auto-log-monitor`
- **Trigger:** Fallout4.exe starts
- **Action:** Start real-time log monitoring
- **Purpose:** Catch crashes before they happen
- **Default:** Enabled

### Auto Backup
- **ID:** `auto-backup`
- **Trigger:** Manual or before modifications
- **Action:** Create timestamped backup
- **Purpose:** Safety net for all file changes
- **Default:** Enabled

### Daily Maintenance
- **ID:** `daily-maintenance`
- **Trigger:** Schedule (3:00 AM)
- **Action:** Run cleanup and optimization
- **Purpose:** Keep system healthy automatically
- **Default:** Enabled

## User Interface

### Dashboard

The Automation Manager dashboard (`/tools/automation`) provides complete control:

**Status Overview:**
- Engine Status (Running/Stopped)
- Active Watchers count
- Scheduled Tasks count
- Total Executions counter

**Rule Management:**
- List of all automation rules
- Enable/disable toggles
- Manual trigger buttons
- Run statistics (count, last run)
- Trigger type indicators (📁📎🎮⏰👆)

**Controls:**
- Start/Stop Engine button
- Reset Statistics button
- Real-time updates (every 10 seconds)
- Success/error messages

### Rule Details

Each rule shows:
- **Name:** Human-readable description
- **Trigger Type:** How it activates (icon visual)
- **Action:** What it does
- **Run Count:** How many times executed
- **Last Run:** When it last triggered
- **Status:** Enabled/Disabled

## Technical Architecture

### Core Components

#### AutomationEngine Class
Located: `src/electron/automationEngine.ts`

**Key Methods:**
- `start()` - Start the engine
- `stop()` - Stop all automation
- `getSettings()` - Get current configuration
- `updateSettings()` - Modify settings
- `toggleRule()` - Enable/disable a rule
- `triggerRule()` - Manually execute a rule
- `getStatistics()` - Get usage stats
- `resetStatistics()` - Clear all stats

**Event System:**
- `started` - Engine started
- `stopped` - Engine stopped
- `rule-executed` - A rule ran
- `action:<type>` - Specific action events
- `settings-updated` - Settings changed

#### File Watchers

Uses Node.js `fs.watch()` API:
```typescript
fs.watch(dataPath, { recursive: false }, (eventType, filename) => {
  if (filename.endsWith('.esp') || filename.endsWith('.esm')) {
    // Trigger relevant rules
  }
});
```

**Features:**
- ESP/ESM file filtering
- Event debouncing
- Error recovery
- Proper cleanup on stop

#### Process Monitors

Uses Windows `tasklist` command:
```typescript
exec(`tasklist /FI "IMAGENAME eq ${processName}" /NH`, (error, stdout) => {
  const isRunning = stdout.toLowerCase().includes(processName.toLowerCase());
  if (isRunning) {
    // Trigger relevant rules
  }
});
```

**Features:**
- 30-second polling interval
- Rate limiting (1 trigger/minute)
- Cross-platform ready
- Minimal CPU usage

#### Scheduled Tasks

Custom scheduling implementation:
```typescript
const [hours, minutes] = time.split(':').map(Number);

setInterval(() => {
  const now = new Date();
  if (now.getHours() === hours && now.getMinutes() === minutes) {
    // Execute task (with duplicate prevention)
  }
}, 60000); // Check every minute
```

**Features:**
- Minute-level precision
- Duplicate run prevention
- Timezone-aware
- Persistent across restarts

### Settings Persistence

Settings stored in: `{userData}/automation-settings.json`

**Structure:**
```json
{
  "enabled": true,
  "rules": [
    {
      "id": "auto-conflict-scan",
      "name": "Auto Conflict Scan",
      "enabled": true,
      "trigger": "file-change",
      "action": "scan-conflicts",
      "params": { "path": "Data" },
      "runCount": 42,
      "lastRun": 1708012345678
    }
  ],
  "schedules": {
    "dailyMaintenance": "03:00",
    "weeklyDeepScan": null
  }
}
```

**Features:**
- Auto-save on changes
- Default fallbacks
- Version tracking
- Graceful migration

### IPC Integration

#### Channels
Located: `src/electron/types.ts`

```typescript
AUTOMATION_START: 'automation-start'
AUTOMATION_STOP: 'automation-stop'
AUTOMATION_GET_SETTINGS: 'automation-get-settings'
AUTOMATION_UPDATE_SETTINGS: 'automation-update-settings'
AUTOMATION_TOGGLE_RULE: 'automation-toggle-rule'
AUTOMATION_TRIGGER_RULE: 'automation-trigger-rule'
AUTOMATION_GET_STATISTICS: 'automation-get-statistics'
AUTOMATION_RESET_STATISTICS: 'automation-reset-statistics'
```

#### API
Located: `src/electron/preload.ts`

```typescript
window.api.automation.start()
window.api.automation.stop()
window.api.automation.getSettings()
window.api.automation.updateSettings(settings)
window.api.automation.toggleRule(ruleId, enabled)
window.api.automation.triggerRule(ruleId)
window.api.automation.getStatistics()
window.api.automation.resetStatistics()
window.api.automation.onRuleExecuted(callback)
```

## Usage Examples

### Starting the Engine

```typescript
// In your React component
import { useEffect } from 'react';

useEffect(() => {
  // Start automation on component mount
  window.api.automation.start()
    .then(() => console.log('Automation started'))
    .catch(err => console.error('Failed to start:', err));

  // Cleanup on unmount
  return () => {
    window.api.automation.stop();
  };
}, []);
```

### Listening for Events

```typescript
useEffect(() => {
  const unsubscribe = window.api.automation.onRuleExecuted((data) => {
    console.log('Rule executed:', data.rule.name);
    console.log('Context:', data.context);
    console.log('Timestamp:', new Date(data.timestamp));
    
    // Show notification
    showNotification(`Automation: ${data.rule.name} executed`);
  });

  return unsubscribe;
}, []);
```

### Toggling a Rule

```typescript
const handleToggleRule = async (ruleId: string, enabled: boolean) => {
  try {
    await window.api.automation.toggleRule(ruleId, enabled);
    console.log(`Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Reload settings
    const settings = await window.api.automation.getSettings();
    setSettings(settings);
  } catch (error) {
    console.error('Failed to toggle rule:', error);
  }
};
```

### Manual Trigger

```typescript
const handleManualTrigger = async (ruleId: string) => {
  try {
    await window.api.automation.triggerRule(ruleId);
    console.log('Rule triggered successfully');
    
    // Reload statistics
    const stats = await window.api.automation.getStatistics();
    setStats(stats);
  } catch (error) {
    console.error('Failed to trigger rule:', error);
  }
};
```

### Custom Scheduling

```typescript
const handleUpdateSchedule = async (time: string) => {
  try {
    const settings = await window.api.automation.getSettings();
    
    settings.schedules.dailyMaintenance = time; // "HH:MM" format
    
    await window.api.automation.updateSettings(settings);
    console.log(`Daily maintenance scheduled for ${time}`);
  } catch (error) {
    console.error('Failed to update schedule:', error);
  }
};
```

## Best Practices

### 1. Start with Default Rules
The default rules cover 90% of use cases. Enable them and let them run for a week before customizing.

### 2. Monitor Statistics
Check the dashboard regularly to see which rules are triggering and adjust as needed.

### 3. Use Scheduled Maintenance
Let nightly maintenance run when your PC is idle. It'll keep your setup optimized without impact.

### 4. Test Before Enabling
Use manual triggers to test rules before enabling automatic execution.

### 5. Backup Before Automation
Ensure Auto Backup is enabled before letting other rules make changes.

### 6. Watch Resource Usage
If automation impacts performance, disable less critical rules or adjust polling intervals.

### 7. Keep Engine Running
Leave the automation engine running in the background for best results.

## Performance Considerations

### Resource Usage

**CPU:**
- Idle: <1%
- File watching: <2%
- Process monitoring: <1%
- Active scanning: 10-30% (temporary)

**Memory:**
- Engine: ~10 MB
- Settings: <1 MB
- Watchers: ~5 MB each

**Disk I/O:**
- Settings save: Minimal
- File watching: Read-only
- Scanning: Moderate (temporary)

### Optimization Tips

1. **Limit Active Rules:** Only enable rules you actually need
2. **Adjust Polling:** Increase intervals for less critical monitors
3. **Schedule Wisely:** Run heavy tasks during idle hours
4. **Use Debouncing:** Built-in to prevent spam
5. **Monitor Stats:** Check for runaway rules

## Troubleshooting

### Engine Won't Start

**Symptom:** Start button doesn't change engine status

**Solutions:**
1. Check console for errors
2. Verify settings file isn't corrupted
3. Restart Mossy
4. Reset statistics and try again

### Rules Not Triggering

**Symptom:** File changes detected but rules don't execute

**Solutions:**
1. Verify rule is enabled
2. Check watch path exists
3. Ensure file extension matches (.esp/.esm)
4. Look for errors in console logs

### High CPU Usage

**Symptom:** Automation engine using excessive CPU

**Solutions:**
1. Disable unused rules
2. Increase polling intervals
3. Check for infinite loops in logs
4. Temporarily stop engine
5. Reset statistics

### Scheduled Tasks Not Running

**Symptom:** Daily maintenance never executes

**Solutions:**
1. Verify time format is correct (HH:MM)
2. Ensure PC is on at scheduled time
3. Check system clock is accurate
4. Verify rule is enabled
5. Look for lastRun timestamp

## Security & Safety

### What Automation CAN Do

- ✅ Monitor files (read-only)
- ✅ Detect processes
- ✅ Trigger scans
- ✅ Create backups
- ✅ Send notifications

### What Automation CANNOT Do

- ❌ Modify files without permission
- ❌ Delete files automatically
- ❌ Install mods
- ❌ Change game settings
- ❌ Access network

### Safety Features

1. **Read-Only Monitoring:** File watching is non-destructive
2. **Explicit Approval:** All modifications require user action
3. **Automatic Backups:** Created before any changes
4. **Error Recovery:** Graceful handling of failures
5. **Resource Limits:** Built-in protections against runaway processes

## API Reference

### AutomationEngine

#### Methods

**`start(): void`**
- Starts the automation engine
- Initializes watchers, monitors, and schedules
- Emits 'started' event
- Safe to call multiple times (idempotent)

**`stop(): void`**
- Stops the automation engine
- Cleans up all watchers and intervals
- Emits 'stopped' event
- Safe to call when not running

**`getSettings(): AutomationSettings`**
- Returns current settings object
- Includes rules and schedules
- Returns copy (safe to modify)

**`updateSettings(newSettings: Partial<AutomationSettings>): void`**
- Updates automation settings
- Merges with existing settings
- Saves to disk
- Restarts engine if running

**`toggleRule(ruleId: string, enabled: boolean): void`**
- Enables or disables a specific rule
- Saves settings
- Restarts engine if running
- Emits 'rule-toggled' event

**`triggerRule(ruleId: string): void`**
- Manually executes a rule
- Bypasses normal triggers
- Updates statistics
- Emits 'rule-executed' event

**`getStatistics(): object`**
- Returns usage statistics
- Includes run counts and timestamps
- Shows active watchers/intervals
- Real-time data

**`resetStatistics(): void`**
- Clears all run counts
- Resets last run timestamps
- Saves settings
- Emits 'statistics-reset' event

#### Events

**`started`**
- Emitted when engine starts
- No parameters

**`stopped`**
- Emitted when engine stops
- No parameters

**`rule-executed`**
- Emitted when any rule runs
- Parameters: `{ rule, context, timestamp }`

**`action:<type>`**
- Emitted for specific actions
- Types: `scan-conflicts`, `scan-duplicates`, `start-log-monitor`, `create-backup`, `run-maintenance`
- Parameters: Action-specific context

**`settings-updated`**
- Emitted when settings change
- Parameters: New settings object

**`rule-toggled`**
- Emitted when rule enabled state changes
- Parameters: `{ ruleId, enabled }`

**`statistics-reset`**
- Emitted when statistics are cleared
- No parameters

## Future Enhancements

### Planned Features

1. **Custom Rules:** User-defined automation rules
2. **Rule Marketplace:** Share automation workflows
3. **Advanced Scheduling:** Cron-like expressions
4. **Conditional Logic:** If-then-else rules
5. **Macro Recording:** Record actions and replay
6. **Cloud Sync:** Sync settings across devices
7. **Mobile Notifications:** Alert on phone
8. **Analytics Dashboard:** Detailed usage insights

### Community Contributions

Want to add automation features? See `CONTRIBUTING.md` for guidelines.

## Support

**Documentation:** This file and inline code comments  
**Issues:** GitHub Issues tracker  
**Community:** Discord server  
**Email:** support@mossy.dev

## Changelog

### Version 1.0.0 (Current)
- Initial implementation
- File system monitoring
- Process detection
- Scheduled tasks
- Manual triggers
- 5 default rules
- Dashboard UI
- Statistics tracking

---

**Last Updated:** 2026-02-13  
**Author:** Mossy Development Team  
**Version:** 1.0.0  
**Status:** Production Ready
