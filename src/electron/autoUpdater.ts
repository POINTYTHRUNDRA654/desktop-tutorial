/**
 * Auto Updater Service
 * 
 * Handles automatic updates for Mossy using electron-updater
 * - Checks for updates on startup and periodically
 * - Requires user approval before downloading
 * - Downloads updates in background
 * - Installs on app restart
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'info';

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

  constructor() {
    this.setupListeners();
    this.configureUpdater();
  }

  private configureUpdater() {
    // Allow prerelease versions in development
    autoUpdater.allowPrerelease = process.env.NODE_ENV === 'development';
    
    // Auto-download is disabled - we want user approval first
    autoUpdater.autoDownload = false;
    
    // Auto-install on quit
    autoUpdater.autoInstallOnAppQuit = true;

    log.info('[AutoUpdater] Configured:', {
      allowPrerelease: autoUpdater.allowPrerelease,
      autoDownload: autoUpdater.autoDownload,
      channel: autoUpdater.channel
    });
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('[AutoUpdater] Checking for update...');
      this.status.checking = true;
      this.sendStatusToRenderer();
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('[AutoUpdater] Update available:', info.version);
      this.status.checking = false;
      this.status.available = true;
      this.status.version = info.version;
      this.status.releaseNotes = info.releaseNotes as string || null;
      this.sendStatusToRenderer();
      
      // Show notification to user
      this.notifyUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('[AutoUpdater] Update not available. Current version:', info.version);
      this.status.checking = false;
      this.sendStatusToRenderer();
    });

    autoUpdater.on('error', (err) => {
      log.error('[AutoUpdater] Error:', err);
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = err.message;
      this.sendStatusToRenderer();
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.status.progress = progressObj.percent;
      log.info(`[AutoUpdater] Download progress: ${progressObj.percent}%`);
      this.sendStatusToRenderer();
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('[AutoUpdater] Update downloaded:', info.version);
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
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const message = `A new version ${info.version} is available!\n\n` +
      `Current version: ${autoUpdater.currentVersion}\n` +
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
      log.error('[AutoUpdater] Error showing dialog:', err);
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
        autoUpdater.quitAndInstall(false, true);
      }
    }).catch(err => {
      log.error('[AutoUpdater] Error showing dialog:', err);
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
    try {
      log.info('[AutoUpdater] Manual check for updates triggered');
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error('[AutoUpdater] Error checking for updates:', err);
      this.status.error = err instanceof Error ? err.message : String(err);
      this.sendStatusToRenderer();
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    try {
      log.info('[AutoUpdater] Starting download...');
      this.status.downloading = true;
      this.status.progress = 0;
      this.sendStatusToRenderer();
      await autoUpdater.downloadUpdate();
    } catch (err) {
      log.error('[AutoUpdater] Error downloading update:', err);
      this.status.downloading = false;
      this.status.error = err instanceof Error ? err.message : String(err);
      this.sendStatusToRenderer();
    }
  }

  /**
   * Install the downloaded update and restart
   */
  quitAndInstall(): void {
    log.info('[AutoUpdater] Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
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
    return autoUpdater.currentVersion.version;
  }
}

// Export singleton instance
export const autoUpdaterService = new AutoUpdaterService();
