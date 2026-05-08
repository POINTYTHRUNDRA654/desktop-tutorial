/**
 * Automation Engine for Mossy
 * 
 * Provides automatic background processing for various tasks:
 * - File system monitoring
 * - Process detection
 * - Scheduled tasks
 * - Event-driven automation
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'file-change' | 'process-start' | 'schedule' | 'manual';
  action: string;
  params?: any;
  lastRun?: number;
  runCount?: number;
}

export interface AutomationSettings {
  enabled: boolean;
  rules: AutomationRule[];
  schedules: {
    dailyMaintenance?: string; // HH:MM format
    weeklyDeepScan?: string;
  };
}

export class AutomationEngine extends EventEmitter {
  private settings: AutomationSettings;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private settingsPath: string;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.settingsPath = path.join(app.getPath('userData'), 'automation-settings.json');
    this.settings = this.loadSettings();
  }

  /**
   * Load automation settings from disk
   */
  private loadSettings(): AutomationSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[Automation] Failed to load settings:', error);
    }

    // Default settings
    return {
      enabled: true,
      rules: this.getDefaultRules(),
      schedules: {
        dailyMaintenance: '03:00', // 3 AM
        weeklyDeepScan: undefined,
      },
    };
  }

  /**
   * Save automation settings to disk
   */
  private saveSettings(): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      console.log('[Automation] Settings saved');
    } catch (error) {
      console.error('[Automation] Failed to save settings:', error);
    }
  }

  /**
   * Get default automation rules
   */
  private getDefaultRules(): AutomationRule[] {
    return [
      {
        id: 'auto-conflict-scan',
        name: 'Auto Conflict Scan',
        enabled: true,
        trigger: 'file-change',
        action: 'scan-conflicts',
        params: { path: 'Data' },
      },
      {
        id: 'auto-duplicate-scan',
        name: 'Auto Duplicate Scan',
        enabled: true,
        trigger: 'file-change',
        action: 'scan-duplicates',
        params: { path: 'Data' },
      },
      {
        id: 'auto-log-monitor',
        name: 'Auto Log Monitor',
        enabled: true,
        trigger: 'process-start',
        action: 'start-log-monitor',
        params: { process: 'Fallout4.exe' },
      },
      {
        id: 'auto-backup',
        name: 'Auto Backup',
        enabled: true,
        trigger: 'manual',
        action: 'create-backup',
        params: {},
      },
      {
        id: 'daily-maintenance',
        name: 'Daily Maintenance',
        enabled: true,
        trigger: 'schedule',
        action: 'run-maintenance',
        params: { time: '03:00' },
      },
    ];
  }

  /**
   * Start the automation engine
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Automation] Already running');
      return;
    }

    if (!this.settings.enabled) {
      console.log('[Automation] Disabled in settings');
      return;
    }

    console.log('[Automation] Starting engine...');
    this.isRunning = true;

    // Start file watchers
    this.startFileWatchers();

    // Start process monitors
    this.startProcessMonitors();

    // Start scheduled tasks
    this.startScheduledTasks();

    this.emit('started');
    console.log('[Automation] Engine started successfully');
  }

  /**
   * Stop the automation engine
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[Automation] Not running');
      return;
    }

    console.log('[Automation] Stopping engine...');
    this.isRunning = false;

    // Stop all watchers
    this.watchers.forEach((watcher, id) => {
      watcher.close();
      console.log(`[Automation] Stopped watcher: ${id}`);
    });
    this.watchers.clear();

    // Stop all intervals
    this.intervals.forEach((interval, id) => {
      clearInterval(interval);
      console.log(`[Automation] Stopped interval: ${id}`);
    });
    this.intervals.clear();

    this.emit('stopped');
    console.log('[Automation] Engine stopped');
  }

  /**
   * Start file system watchers for relevant rules
   */
  private startFileWatchers(): void {
    const fileRules = this.settings.rules.filter(
      r => r.enabled && r.trigger === 'file-change'
    );

    for (const rule of fileRules) {
      try {
        const watchPath = this.resolveWatchPath(rule.params?.path);
        
        if (!watchPath || !fs.existsSync(watchPath)) {
          console.log(`[Automation] Watch path not found: ${watchPath} for rule ${rule.id}`);
          continue;
        }

        console.log(`[Automation] Watching: ${watchPath} for rule ${rule.id}`);

        const watcher = fs.watch(watchPath, { recursive: false }, (eventType, filename) => {
          if (filename && (filename.endsWith('.esp') || filename.endsWith('.esm'))) {
            console.log(`[Automation] File change detected: ${filename}`);
            this.executeRule(rule, { eventType, filename, path: watchPath });
          }
        });

        this.watchers.set(rule.id, watcher);
      } catch (error) {
        console.error(`[Automation] Failed to start watcher for ${rule.id}:`, error);
      }
    }
  }

  /**
   * Start process monitors for relevant rules
   */
  private startProcessMonitors(): void {
    const processRules = this.settings.rules.filter(
      r => r.enabled && r.trigger === 'process-start'
    );

    if (processRules.length === 0) return;

    // Check for processes every 30 seconds
    const interval = setInterval(() => {
      for (const rule of processRules) {
        const processName = rule.params?.process;
        if (processName) {
          this.checkProcess(processName, rule);
        }
      }
    }, 30000);

    this.intervals.set('process-monitor', interval);
    console.log('[Automation] Process monitor started');
  }

  /**
   * Check if a process is running
   */
  private async checkProcess(processName: string, rule: AutomationRule): Promise<void> {
    try {
      const { exec } = require('child_process');
      
      exec(`tasklist /FI "IMAGENAME eq ${processName}" /NH`, (error: any, stdout: string) => {
        if (error) return;
        
        const isRunning = stdout.toLowerCase().includes(processName.toLowerCase());
        
        if (isRunning && (!rule.lastRun || Date.now() - rule.lastRun > 60000)) {
          console.log(`[Automation] Process detected: ${processName}`);
          this.executeRule(rule, { processName });
          rule.lastRun = Date.now();
        }
      });
    } catch (error) {
      console.error('[Automation] Process check failed:', error);
    }
  }

  /**
   * Start scheduled tasks
   */
  private startScheduledTasks(): void {
    const scheduleRules = this.settings.rules.filter(
      r => r.enabled && r.trigger === 'schedule'
    );

    for (const rule of scheduleRules) {
      const time = rule.params?.time; // HH:MM format
      if (time) {
        this.scheduleTask(rule, time);
      }
    }

    console.log('[Automation] Scheduled tasks started');
  }

  /**
   * Schedule a task to run at a specific time daily
   */
  private scheduleTask(rule: AutomationRule, time: string): void {
    const [hours, minutes] = time.split(':').map(Number);
    
    const checkSchedule = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Check if it's time to run (within 1-minute window)
      if (currentHours === hours && currentMinutes === minutes) {
        // Don't run if already ran in the last hour
        if (!rule.lastRun || Date.now() - rule.lastRun > 3600000) {
          console.log(`[Automation] Running scheduled task: ${rule.name}`);
          this.executeRule(rule, { scheduled: true });
          rule.lastRun = Date.now();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    this.intervals.set(`schedule-${rule.id}`, interval);
    
    console.log(`[Automation] Scheduled: ${rule.name} at ${time}`);
  }

  /**
   * Execute an automation rule
   */
  private executeRule(rule: AutomationRule, context: any): void {
    console.log(`[Automation] Executing rule: ${rule.name}`, context);

    // Update run statistics
    rule.runCount = (rule.runCount || 0) + 1;
    rule.lastRun = Date.now();
    this.saveSettings();

    // Emit event for the main process to handle
    this.emit('rule-executed', {
      rule,
      context,
      timestamp: Date.now(),
    });

    // Execute specific action
    switch (rule.action) {
      case 'scan-conflicts':
        this.emit('action:scan-conflicts', context);
        break;
      case 'scan-duplicates':
        this.emit('action:scan-duplicates', context);
        break;
      case 'start-log-monitor':
        this.emit('action:start-log-monitor', context);
        break;
      case 'create-backup':
        this.emit('action:create-backup', context);
        break;
      case 'run-maintenance':
        this.emit('action:run-maintenance', context);
        break;
      default:
        console.warn(`[Automation] Unknown action: ${rule.action}`);
    }
  }

  /**
   * Resolve a watch path relative to Fallout 4 installation
   */
  private resolveWatchPath(relativePath?: string): string | null {
    if (!relativePath) return null;

    try {
      // Try common Fallout 4 installation paths
      const commonPaths = [
        path.join('C:', 'Program Files (x86)', 'Steam', 'steamapps', 'common', 'Fallout 4', relativePath),
        path.join('C:', 'Program Files', 'Fallout 4', relativePath),
        path.join(app.getPath('documents'), '..', '..', 'Fallout 4', relativePath),
      ];

      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath)) {
          return testPath;
        }
      }
    } catch (error) {
      console.error('[Automation] Failed to resolve watch path:', error);
    }

    return null;
  }

  /**
   * Get current automation settings
   */
  getSettings(): AutomationSettings {
    return { ...this.settings };
  }

  /**
   * Update automation settings
   */
  updateSettings(newSettings: Partial<AutomationSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.saveSettings();

    // Restart if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }

    this.emit('settings-updated', this.settings);
  }

  /**
   * Enable/disable a specific rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.settings.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.saveSettings();

      if (this.isRunning) {
        this.stop();
        this.start();
      }

      this.emit('rule-toggled', { ruleId, enabled });
      console.log(`[Automation] Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Manually trigger a rule
   */
  triggerRule(ruleId: string): void {
    const rule = this.settings.rules.find(r => r.id === ruleId);
    if (rule) {
      console.log(`[Automation] Manually triggering rule: ${rule.name}`);
      this.executeRule(rule, { manual: true });
    }
  }

  /**
   * Get automation statistics
   */
  getStatistics(): any {
    return {
      isRunning: this.isRunning,
      activeWatchers: this.watchers.size,
      activeIntervals: this.intervals.size,
      rules: this.settings.rules.map(r => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        runCount: r.runCount || 0,
        lastRun: r.lastRun,
      })),
    };
  }

  /**
   * Reset all automation statistics
   */
  resetStatistics(): void {
    for (const rule of this.settings.rules) {
      rule.runCount = 0;
      rule.lastRun = undefined;
    }
    this.saveSettings();
    this.emit('statistics-reset');
    console.log('[Automation] Statistics reset');
  }
}

// Singleton instance
let automationEngineInstance: AutomationEngine | null = null;

export function getAutomationEngine(): AutomationEngine {
  if (!automationEngineInstance) {
    automationEngineInstance = new AutomationEngine();
  }
  return automationEngineInstance;
}
