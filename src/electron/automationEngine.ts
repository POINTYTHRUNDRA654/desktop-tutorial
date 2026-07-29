/**
 * Automation Engine for Mossy
 *
 * Provides automatic background processing for Fallout 4 modding workflows:
 * - File system monitoring (ESP/ESM, HKX, PSC, BA2, NIF, DDS)
 * - Process detection (Fallout4.exe, CreationKit.exe, F4SE loader)
 * - Scheduled tasks (maintenance, deep scan, Cosmos pipeline sync)
 * - Event-driven automation (auto-compile, auto-pack, load-order validation)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: 'file-change' | 'process-start' | 'process-stop' | 'schedule' | 'manual';
  action: string;
  params?: Record<string, unknown>;
  lastRun?: number;
  runCount?: number;
  /** Extensions to watch when trigger === 'file-change'. Default: ['.esp', '.esm'] */
  watchExtensions?: string[];
  /** Cooldown in ms — prevents re-firing within this window. Default: 5000 */
  cooldownMs?: number;
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
      // ── ESP/ESM monitors ─────────────────────────────────────────────────
      {
        id: 'auto-conflict-scan',
        name: 'Auto Conflict Scan',
        description: 'Scans for ESP/ESM conflicts whenever the Data folder changes.',
        enabled: true,
        trigger: 'file-change',
        action: 'scan-conflicts',
        params: { path: 'Data' },
        watchExtensions: ['.esp', '.esm', '.esl'],
        cooldownMs: 8000,
      },
      {
        id: 'auto-duplicate-scan',
        name: 'Auto Duplicate Scan',
        description: 'Finds redundant textures and meshes to free VRAM whenever Data changes.',
        enabled: true,
        trigger: 'file-change',
        action: 'scan-duplicates',
        params: { path: 'Data' },
        watchExtensions: ['.esp', '.esm', '.esl', '.ba2'],
        cooldownMs: 15000,
      },
      {
        id: 'auto-load-order-validate',
        name: 'Load Order Validator',
        description: 'Validates plugins.txt load order whenever a plugin is added or removed.',
        enabled: true,
        trigger: 'file-change',
        action: 'validate-load-order',
        params: { path: 'Data' },
        watchExtensions: ['.esp', '.esm', '.esl'],
        cooldownMs: 5000,
      },
      // ── Papyrus / Script monitors ────────────────────────────────────────
      {
        id: 'auto-papyrus-compile',
        name: 'Auto Papyrus Compile',
        description: 'Triggers Papyrus compiler when a .psc source file is saved.',
        enabled: false, // opt-in — requires Papyrus compiler path configured
        trigger: 'file-change',
        action: 'compile-papyrus',
        params: { path: 'Scripts/Source', compilerPath: '' },
        watchExtensions: ['.psc'],
        cooldownMs: 3000,
      },
      // ── BA2 / Asset monitors ─────────────────────────────────────────────
      {
        id: 'auto-ba2-pack',
        name: 'Auto BA2 Pack on Asset Change',
        description: 'Re-packs loose textures/meshes into a BA2 archive when assets change.',
        enabled: false, // opt-in — can be slow for large mod projects
        trigger: 'file-change',
        action: 'pack-ba2',
        params: { path: 'Data', outputName: 'MyMod - Main.ba2' },
        watchExtensions: ['.dds', '.nif', '.bgsm', '.bgem'],
        cooldownMs: 30000,
      },
      // ── HKX / Behavior monitors ──────────────────────────────────────────
      {
        id: 'auto-hkx-validate',
        name: 'HKX Behavior Validator',
        description: 'Validates Havok behavior graph files when HKX assets change.',
        enabled: true,
        trigger: 'file-change',
        action: 'validate-hkx',
        params: { path: 'Data/meshes/actors' },
        watchExtensions: ['.hkx', '.hkb'],
        cooldownMs: 5000,
      },
      // ── Process monitors ─────────────────────────────────────────────────
      {
        id: 'auto-log-monitor',
        name: 'Auto Log Monitor',
        description: 'Starts real-time log monitoring when Fallout4.exe is detected.',
        enabled: true,
        trigger: 'process-start',
        action: 'start-log-monitor',
        params: { process: 'Fallout4.exe' },
        cooldownMs: 60000,
      },
      {
        id: 'auto-ck-session',
        name: 'Creation Kit Session Tracker',
        description: 'Logs Creation Kit sessions and auto-saves active plugin state.',
        enabled: true,
        trigger: 'process-start',
        action: 'track-ck-session',
        params: { process: 'CreationKit.exe' },
        cooldownMs: 60000,
      },
      {
        id: 'auto-f4se-check',
        name: 'F4SE Launch Validator',
        description: 'Confirms F4SE is loaded (not vanilla exe) when the game starts.',
        enabled: true,
        trigger: 'process-start',
        action: 'validate-f4se',
        params: { process: 'Fallout4.exe' },
        cooldownMs: 120000,
      },
      // ── Scheduled tasks ──────────────────────────────────────────────────
      {
        id: 'auto-backup',
        name: 'Nightly Plugin Backup',
        description: 'Creates a timestamped backup of plugins.txt and loadorder.txt every night.',
        enabled: true,
        trigger: 'schedule',
        action: 'nightly-backup',
        params: { time: '02:00', backupDir: '' },
        cooldownMs: 0,
      },
      {
        id: 'daily-maintenance',
        name: 'Daily Maintenance',
        description: 'Cleans temp files, validates load order, checks for orphaned assets.',
        enabled: true,
        trigger: 'schedule',
        action: 'run-maintenance',
        params: { time: '03:00' },
        cooldownMs: 0,
      },
      {
        id: 'cosmos-pipeline-sync',
        name: 'Cosmos Pipeline Sync',
        description: 'Validates Cosmos repo presence and rebuilds Knowledge Search index weekly.',
        enabled: true,
        trigger: 'schedule',
        action: 'sync-cosmos-pipeline',
        params: { time: '04:00', dayOfWeek: 0 }, // Sunday 4 AM
        cooldownMs: 0,
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

    // Track per-rule last-fired timestamps for cooldown enforcement
    const lastFired: Map<string, number> = new Map();

    for (const rule of fileRules) {
      try {
        const watchPath = this.resolveWatchPath(rule.params?.path as string | undefined);

        if (!watchPath || !fs.existsSync(watchPath)) {
          console.log(`[Automation] Watch path not found: ${watchPath ?? '(none)'} for rule ${rule.id}`);
          continue;
        }

        const exts = rule.watchExtensions ?? ['.esp', '.esm'];
        const cooldown = rule.cooldownMs ?? 5000;

        console.log(`[Automation] Watching: ${watchPath} (${exts.join(', ')}) for rule ${rule.id}`);

        const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (!filename) return;

          const ext = path.extname(filename).toLowerCase();
          if (!exts.includes(ext)) return;

          const now = Date.now();
          const last = lastFired.get(rule.id) ?? 0;
          if (now - last < cooldown) return; // within cooldown window
          lastFired.set(rule.id, now);

          console.log(`[Automation] File change: ${filename} → rule ${rule.id}`);
          this.executeRule(rule, { eventType, filename, path: watchPath });
        });

        watcher.on('error', (err) => {
          console.error(`[Automation] Watcher error for ${rule.id}:`, err);
        });

        this.watchers.set(rule.id, watcher);
      } catch (error) {
        console.error(`[Automation] Failed to start watcher for ${rule.id}:`, error);
      }
    }
  }

  /**
   * Start process monitors for relevant rules.
   * Handles both process-start and process-stop triggers.
   */
  private startProcessMonitors(): void {
    const startRules = this.settings.rules.filter(r => r.enabled && r.trigger === 'process-start');
    const stopRules  = this.settings.rules.filter(r => r.enabled && r.trigger === 'process-stop');

    if (startRules.length === 0 && stopRules.length === 0) return;

    // Track which processes were running last cycle (for stop-trigger diffing)
    const prevRunning = new Set<string>();

    const interval = setInterval(async () => {
      // ── process-start rules ───────────────────────────────────────────
      for (const rule of startRules) {
        const processName = rule.params?.process as string | undefined;
        if (processName) {
          await this.checkProcess(processName, rule, 'start').catch(() => undefined);
        }
      }

      // ── process-stop rules ────────────────────────────────────────────
      for (const rule of stopRules) {
        const processName = rule.params?.process as string | undefined;
        if (!processName) continue;
        const key = `${rule.id}::${processName}`;
        const isRunning = await this.isProcessRunning(processName).catch(() => false);

        if (prevRunning.has(key) && !isRunning) {
          // Process was running last cycle and is now gone → fire stop trigger
          const cooldown = rule.cooldownMs ?? 60000;
          if (!rule.lastRun || Date.now() - rule.lastRun > cooldown) {
            console.log(`[Automation] Process stopped: ${processName} — triggering rule ${rule.id}`);
            this.executeRule(rule, { processName, trigger: 'process-stop' });
          }
        }

        if (isRunning) {
          prevRunning.add(key);
        } else {
          prevRunning.delete(key);
        }
      }
    }, 30000);

    this.intervals.set('process-monitor', interval);
    console.log('[Automation] Process monitor started');
  }

  /**
   * Check if a process is running and fire rule if conditions are met.
   */
  private async checkProcess(processName: string, rule: AutomationRule, _trigger: 'start' | 'stop' = 'start'): Promise<void> {
    try {
      const isRunning = await this.isProcessRunning(processName);
      const cooldown = rule.cooldownMs ?? 60000;

      if (isRunning && (!rule.lastRun || Date.now() - rule.lastRun > cooldown)) {
        console.log(`[Automation] Process detected: ${processName} — triggering rule ${rule.id}`);
        this.executeRule(rule, { processName });
        rule.lastRun = Date.now();
        this.saveSettings();
      }
    } catch (error) {
      console.error('[Automation] Process check failed:', error);
    }
  }

  /**
   * Cross-platform process detection.
   * Uses tasklist on Windows, pgrep on macOS/Linux.
   */
  private async isProcessRunning(processName: string): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `tasklist /FI "IMAGENAME eq ${processName}" /NH /FO CSV`
        );
        return stdout.toLowerCase().includes(processName.toLowerCase());
      } else {
        // macOS / Linux
        const baseName = processName.replace(/\.exe$/i, '');
        const { stdout } = await execAsync(`pgrep -x "${baseName}"`);
        return stdout.trim().length > 0;
      }
    } catch {
      return false;
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
      const time = rule.params?.time as string | undefined; // HH:MM format
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
    /** Optional day-of-week constraint (0 = Sunday … 6 = Saturday). */
    const dayOfWeek: number | undefined =
      typeof rule.params?.dayOfWeek === 'number' ? (rule.params.dayOfWeek as number) : undefined;

    const checkSchedule = () => {
      const now = new Date();
      if (now.getHours() !== hours || now.getMinutes() !== minutes) return;
      if (dayOfWeek !== undefined && now.getDay() !== dayOfWeek) return;

      // Require at least 1 hour gap to prevent double-fires within the same minute window
      if (rule.lastRun && Date.now() - rule.lastRun < 3600000) return;

      console.log(`[Automation] Running scheduled task: ${rule.name}`);
      this.executeRule(rule, { scheduled: true, dayOfWeek: now.getDay() });
      rule.lastRun = Date.now();
      this.saveSettings();
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    this.intervals.set(`schedule-${rule.id}`, interval);

    const dayLabel = dayOfWeek !== undefined
      ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]
      : 'daily';
    console.log(`[Automation] Scheduled: ${rule.name} at ${time} (${dayLabel})`);
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

    // Execute specific action — emit named events that main.ts handlers can subscribe to
    switch (rule.action) {
      // ── ESP/ESM ──────────────────────────────────────────────────────────
      case 'scan-conflicts':
        this.emit('action:scan-conflicts', context);
        break;
      case 'scan-duplicates':
        this.emit('action:scan-duplicates', context);
        break;
      case 'validate-load-order':
        this.emit('action:validate-load-order', context);
        break;
      // ── Papyrus / Scripts ────────────────────────────────────────────────
      case 'compile-papyrus':
        this.emit('action:compile-papyrus', { ...context, params: rule.params });
        break;
      // ── BA2 / Assets ─────────────────────────────────────────────────────
      case 'pack-ba2':
        this.emit('action:pack-ba2', { ...context, params: rule.params });
        break;
      // ── HKX / Havok ──────────────────────────────────────────────────────
      case 'validate-hkx':
        this.emit('action:validate-hkx', context);
        break;
      // ── Process ──────────────────────────────────────────────────────────
      case 'start-log-monitor':
        this.emit('action:start-log-monitor', context);
        break;
      case 'track-ck-session':
        this.emit('action:track-ck-session', context);
        break;
      case 'validate-f4se':
        this.emit('action:validate-f4se', context);
        break;
      // ── Scheduled ────────────────────────────────────────────────────────
      case 'create-backup':
      case 'nightly-backup':
        this.emit('action:create-backup', context);
        this.performNightlyBackup(context).catch((err) =>
          console.error('[Automation] Nightly backup failed:', err)
        );
        break;
      case 'run-maintenance':
        this.emit('action:run-maintenance', context);
        break;
      case 'sync-cosmos-pipeline':
        this.emit('action:sync-cosmos-pipeline', context);
        break;
      default:
        console.warn(`[Automation] Unknown action: ${rule.action}`);
    }
  }

  /**
   * Perform a nightly backup of plugins.txt and loadorder.txt.
   * Backs up to %LOCALAPPDATA%\Fallout4\Backups\<YYYY-MM-DD>\
   */
  private async performNightlyBackup(_context: any): Promise<void> {
    if (process.platform !== 'win32') return;
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return;

    const fo4Dir = path.join(localAppData, 'Fallout4');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const backupDir = path.join(fo4Dir, 'Backups', today);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filesToBackup = ['plugins.txt', 'loadorder.txt'];
    let backedUp = 0;

    for (const file of filesToBackup) {
      const src = path.join(fo4Dir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(backupDir, file));
        backedUp++;
      }
    }

    console.log(`[Automation] Nightly backup complete: ${backedUp} file(s) → ${backupDir}`);
    this.emit('action:backup-complete', { backupDir, filesCount: backedUp, date: today });
  }

  /**
   * Resolve a watch path relative to Fallout 4 installation
   */
  /**
   * Resolve a watch path relative to the Fallout 4 installation directory.
   *
   * Resolution order:
   * 1. Cached FO4 install path (from a previous successful lookup).
   * 2. Windows registry — Steam and GOG keys.
   * 3. Common Steam library locations across all drives.
   * 4. User's Documents folder sibling heuristic.
   */
  private fo4InstallCache: string | null = undefined as any;

  private async resolveWatchPathAsync(relativePath?: string): Promise<string | null> {
    if (!relativePath) return null;

    const installDir = await this.detectFO4InstallDir();
    if (!installDir) return null;

    const full = path.join(installDir, relativePath);
    return fs.existsSync(full) ? full : null;
  }

  /** Synchronous wrapper — uses cache if available, otherwise falls back to common paths. */
  private resolveWatchPath(relativePath?: string): string | null {
    if (!relativePath) return null;

    // If we have a cached install dir, use it synchronously
    if (typeof this.fo4InstallCache === 'string') {
      const candidate = path.join(this.fo4InstallCache, relativePath);
      if (fs.existsSync(candidate)) return candidate;
    }

    // Kick off async detection for next call
    this.detectFO4InstallDir().then((dir) => {
      if (dir) this.fo4InstallCache = dir;
    }).catch(() => undefined);

    // Synchronous fallback — Steam, GOG, and Xbox Game Pass paths
    const drives = ['C', 'D', 'E', 'F', 'G'];
    const steamRelative = path.join('SteamLibrary', 'steamapps', 'common', 'Fallout 4');
    const candidates: string[] = [
      ...drives.map((d) => path.join(`${d}:`, 'Program Files (x86)', 'Steam', 'steamapps', 'common', 'Fallout 4')),
      ...drives.map((d) => path.join(`${d}:`, steamRelative)),
      path.join('C:', 'Program Files', 'Fallout 4'),
      // Xbox Game Pass / Microsoft Store
      path.join('C:', 'XboxGames', 'Fallout 4', 'Content'),
      path.join('C:', 'Program Files', 'WindowsApps', 'BethesdaSoftworks.Fallout4-PC_1.10.980.0_x64__3275kfvn8vcwc'),
      ...drives.map((d) => path.join(`${d}:`, 'XboxGames', 'Fallout 4', 'Content')),
    ];

    for (const dir of candidates) {
      const full = path.join(dir, relativePath);
      if (fs.existsSync(full)) {
        this.fo4InstallCache = dir;
        return full;
      }
    }

    return null;
  }

  /**
   * Attempt to read the Fallout 4 install directory from the Windows registry.
   * Falls back to heuristic paths on non-Windows or if the key is absent.
   */
  private async detectFO4InstallDir(): Promise<string | null> {
    if (typeof this.fo4InstallCache === 'string') return this.fo4InstallCache;

    if (process.platform === 'win32') {
      // Steam registry key
      const steamKey =
        'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam';
      try {
        const { stdout } = await execAsync(`reg query "${steamKey}" /v InstallPath`);
        const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
        if (match) {
          const steamPath = match[1].trim();
          // Read libraryfolders.vdf for all library paths
          const libFile = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
          const candidates: string[] = [path.join(steamPath, 'steamapps', 'common', 'Fallout 4')];
          if (fs.existsSync(libFile)) {
            const vdf = fs.readFileSync(libFile, 'utf-8');
            const pathMatches = [...vdf.matchAll(/"path"\s+"([^"]+)"/g)];
            for (const m of pathMatches) {
              candidates.push(path.join(m[1], 'steamapps', 'common', 'Fallout 4'));
            }
          }
          for (const c of candidates) {
            if (fs.existsSync(path.join(c, 'Fallout4.exe'))) {
              this.fo4InstallCache = c;
              console.log(`[Automation] FO4 install detected via registry: ${c}`);
              return c;
            }
          }
        }
      } catch {
        // Registry query failed — fall through
      }

      // GOG registry key
      try {
        const gogKey = 'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1998527297';
        const { stdout } = await execAsync(`reg query "${gogKey}" /v path`);
        const match = stdout.match(/path\s+REG_SZ\s+(.+)/);
        if (match) {
          const gogPath = match[1].trim();
          if (fs.existsSync(path.join(gogPath, 'Fallout4.exe'))) {
            this.fo4InstallCache = gogPath;
            console.log(`[Automation] FO4 install detected via GOG registry: ${gogPath}`);
            return gogPath;
          }
        }
      } catch {
        // GOG key absent — fall through
      }

      // Xbox Game Pass / Microsoft Store detection
      try {
        const xboxKey = 'HKLM\\SOFTWARE\\Microsoft\\GamingServices';
        const xboxCandidates: string[] = [
          path.join('C:', 'XboxGames', 'Fallout 4', 'Content'),
          ...['C', 'D', 'E', 'F', 'G'].map((d) => path.join(`${d}:`, 'XboxGames', 'Fallout 4', 'Content')),
        ];
        for (const c of xboxCandidates) {
          if (fs.existsSync(path.join(c, 'Fallout4.exe'))) {
            this.fo4InstallCache = c;
            console.log(`[Automation] FO4 install detected via Xbox Game Pass: ${c}`);
            return c;
          }
        }
      } catch {
        // Xbox detection failed — fall through
      }
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
