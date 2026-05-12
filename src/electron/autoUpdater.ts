/**
 * Auto Updater Service
 *
 * Handles automatic updates for Mossy using electron-updater
 * - Checks for updates on startup and periodically
 * - Requires user approval before downloading
 * - Downloads updates in background
 * - Installs on app restart
 *
 * Note: Disabled in dev mode to prevent crashes when electron app isn't fully initialized
 */

import { BrowserWindow, dialog, app } from 'electron';
// Dynamically import autoUpdater only in production to avoid dev mode crashes
import type { AppUpdater, UpdateInfo } from 'electron-updater';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
  releaseNotes: string | null;
}

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    progress: 0,
    version: null,
    releaseNotes: null
  };
  private isDevMode: boolean = false;
  private autoUpdater: AppUpdater | null = null;
  // Resolves once initializeUpdater() finishes (success or failure)
  private initReady: Promise<void>;
  private resolveInit: () => void = () => {};

  constructor() {
    this.initReady = new Promise<void>((resolve) => {
      this.resolveInit = resolve;
    });

    // Disable auto-updater in dev mode to prevent crashes
    // Check NODE_ENV first, then check app.isPackaged only if app is defined
    this.isDevMode = process.env.NODE_ENV === 'development' || (app ? !app.isPackaged : true);

    if (this.isDevMode) {
      console.log('[AutoUpdater] Running in dev mode - auto-updater disabled');
      this.resolveInit();
      return;
    }

    this.initializeUpdater();
  }

  private async initializeUpdater() {
    try {
      // Dynamically import autoUpdater to avoid dev mode crashes
      const { autoUpdater } = await import('electron-updater');
      this.autoUpdater = autoUpdater;

      // Configure logging
      this.autoUpdater.logger = console;

      this.setupListeners();
      this.configureUpdater();
    } catch (err) {
      console.error('[AutoUpdater] Failed to initialize:', err);
    } finally {
      this.resolveInit();
    }
  }

  private configureUpdater() {
    if (this.isDevMode || !this.autoUpdater) return;

    // Allow prerelease updates — required for the alpha release channel
    this.autoUpdater.allowPrerelease = true;

    // Auto-download is disabled - we want user approval first
    this.autoUpdater.autoDownload = false;

    // Auto-install on quit
    this.autoUpdater.autoInstallOnAppQuit = true;

    console.log('[AutoUpdater] Configured:', {
      allowPrerelease: this.autoUpdater.allowPrerelease,
      autoDownload: this.autoUpdater.autoDownload,
      channel: this.autoUpdater.channel
    });
  }

  private setupListeners() {
    if (this.isDevMode || !this.autoUpdater) return;

    this.autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for update...');
      this.status.checking = true;
      this.sendStatusToRenderer();
    });

    this.autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.status.checking = false;
      this.status.available = true;
      this.status.version = info.version;
      this.status.releaseNotes = info.releaseNotes as string || null;
      this.sendStatusToRenderer();

      // Show notification to user
      this.notifyUpdateAvailable(info);
    });

    this.autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('[AutoUpdater] Update not available. Current version:', info.version);
      this.status.checking = false;
      this.sendStatusToRenderer();
    });

    this.autoUpdater.on('error', (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('404') || errorMsg.includes('Cannot find latest.yml')) {
        console.log('[AutoUpdater] No release found on GitHub yet (expected in dev) - skipping');
        this.status.checking = false;
        this.status.downloading = false;
        this.status.error = null;
        this.sendStatusToRenderer();
        return;
      }
      console.error('[AutoUpdater] Error:', err);
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = errorMsg;
      this.sendStatusToRenderer();
    });

    this.autoUpdater.on('download-progress', (progressObj) => {
      this.status.progress = progressObj.percent;
      console.log(`[AutoUpdater] Download progress: ${progressObj.percent}%`);
      this.sendStatusToRenderer();
    });

    this.autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.status.downloading = false;
      this.status.downloaded = true;
      this.sendStatusToRenderer();

      // Notify user that update is ready to install
      this.notifyUpdateDownloaded(info);
    });
  }

  private sendStatusToRenderer() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', this.status);
    }
  }

  private notifyUpdateAvailable(info: UpdateInfo) {
    if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.autoUpdater) return;

    const message = `A new version ${info.version} is available!\n\n` +
      `Current version: ${this.autoUpdater.currentVersion.version}\n` +
      `Would you like to download it now?`;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'Mossy Update Available',
      detail: message,
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        this.downloadUpdate();
      }
    }).catch(err => {
      console.error('[AutoUpdater] Error showing dialog:', err);
    });
  }

  private notifyUpdateDownloaded(info: UpdateInfo) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const message = `Version ${info.version} has been downloaded.\n\n` +
      `The update will be installed when you restart Mossy.\n` +
      `Would you like to restart now?`;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update Downloaded',
      detail: message,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        // Quit and install
        this.quitAndInstall();
      }
    }).catch(err => {
      console.error('[AutoUpdater] Error showing dialog:', err);
    });
  }

  /**
   * Set the main window to send status updates to
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<void> {
    if (this.isDevMode) {
      console.log('[AutoUpdater] Check skipped - running in dev mode');
      return;
    }

    // Wait for the dynamic import to finish before proceeding
    await this.initReady;

    if (!this.autoUpdater) {
      console.log('[AutoUpdater] Not initialized - skipping update check');
      return;
    }

    // Clear any previous error so the UI reflects a fresh attempt
    this.status.error = null;

    try {
      console.log('[AutoUpdater] Manual check for updates triggered');
      await this.autoUpdater.checkForUpdates();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // Suppress 404 errors gracefully - happens when no GitHub release exists yet
      // This is normal in development/pre-release and shouldn't alarm the user
      if (errorMsg.includes('404') || errorMsg.includes('Cannot find latest.yml')) {
        console.log('[AutoUpdater] No release found on GitHub yet (expected in dev) - skipping');
        this.status.error = null; // Don't show error to user for missing releases
        return;
      }
      
      console.error('[AutoUpdater] Error checking for updates:', err);
      this.status.error = errorMsg;
      this.sendStatusToRenderer();
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    if (this.isDevMode) {
      console.log('[AutoUpdater] Download skipped - running in dev mode');
      return;
    }

    if (!this.autoUpdater) {
      console.log('[AutoUpdater] Not initialized yet');
      return;
    }

    // Clear any previous error so the UI reflects a fresh download attempt
    this.status.error = null;

    try {
      console.log('[AutoUpdater] Starting download...');
      this.status.downloading = true;
      this.status.progress = 0;
      this.sendStatusToRenderer();
      await this.autoUpdater.downloadUpdate();
    } catch (err) {
      console.error('[AutoUpdater] Error downloading update:', err);
      this.status.downloading = false;
      this.status.error = err instanceof Error ? err.message : String(err);
      this.sendStatusToRenderer();
    }
  }

  /**
   * Install the downloaded update and restart.
   * Uses silent mode (isSilent = true) so the NSIS installer runs in the
   * background without showing the install wizard — no uninstall/reinstall UX.
   */
  quitAndInstall(): void {
    if (this.isDevMode) {
      console.log('[AutoUpdater] Quit and install skipped - running in dev mode');
      return;
    }

    if (!this.autoUpdater) {
      console.log('[AutoUpdater] Not initialized yet');
      return;
    }

    console.log('[AutoUpdater] Quitting and installing update (silent)...');
    // isSilent=true  → NSIS runs with /S flag, no wizard shown
    // isForceRunAfter=true → app restarts automatically after install
    this.autoUpdater.quitAndInstall(true, true);
  }

  /**
   * Get current update status
   */
  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Get current app version
   */
  getCurrentVersion(): string {
    if (this.isDevMode || !this.autoUpdater) {
      return app.getVersion();
    }
    return this.autoUpdater.currentVersion.version;
  }
}

// Export singleton instance
export const autoUpdaterService = new AutoUpdaterService();
