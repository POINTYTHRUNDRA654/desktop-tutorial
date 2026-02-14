/**
 * Cloud Sync IPC Handlers
 * Exposes CloudSyncEngine methods to renderer process via IPC
 * 
 * Usage in renderer:
 * const result = await window.electron.api.cloudSyncSyncProject(projectId);
 */

import { ipcMain } from 'electron';
import { cloudSyncEngine } from '../mining/cloudSync';
import { ProjectChange } from '../shared/types';

/**
 * Register all cloud sync IPC handlers
 */
export function registerCloudSyncHandlers(): void {
  // Project Synchronization
  ipcMain.handle('cloud-sync:sync-project', async (event, projectId: string, direction?: string) => {
    try {
      const result = await cloudSyncEngine.syncProject(
        projectId,
        (direction as 'push' | 'pull' | 'bidirectional') || 'bidirectional'
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:enable-auto-sync', async (event, projectId: string, interval?: number) => {
    try {
      await cloudSyncEngine.enableAutoSync(projectId, interval);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Collaboration
  ipcMain.handle('cloud-sync:share-project', async (event, projectId: string, collaborators: string[]) => {
    try {
      const result = await cloudSyncEngine.shareProject(projectId, collaborators);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:join-project', async (event, inviteCode: string) => {
    try {
      const result = await cloudSyncEngine.joinProject(inviteCode);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:broadcast-change', async (event, change: ProjectChange) => {
    try {
      await cloudSyncEngine.broadcastChange(change);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Real-time Subscriptions
  let subscriptions = new Map<string, string>();

  ipcMain.handle(
    'cloud-sync:subscribe-to-changes',
    async (event, projectId: string, filters?: any) => {
      try {
        const subscriptionId = await cloudSyncEngine.subscribeToChanges(
          projectId,
          (change) => {
            // Send change to renderer via webContents
            event.sender.send('cloud-sync:change-received', {
              subscriptionId,
              change,
            });
          },
          filters
        );

        // Store subscription ID mapped to event sender for cleanup
        subscriptions.set(subscriptionId, projectId);
        return { success: true, subscriptionId };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle('cloud-sync:unsubscribe-from-changes', async (event, subscriptionId: string) => {
    try {
      cloudSyncEngine.unsubscribeFromChanges(subscriptionId);
      subscriptions.delete(subscriptionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Conflict Management
  ipcMain.handle('cloud-sync:detect-conflicts', async (event, projectId: string) => {
    try {
      // In production, this would fetch actual local/remote states
      // For now, returning mock structure
      return {
        success: true,
        data: {
          conflicts: [],
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:resolve-conflict', async (event, conflict: any, resolution: any) => {
    try {
      await cloudSyncEngine.resolveSyncConflict(conflict, resolution);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Version Control
  ipcMain.handle('cloud-sync:get-project-history', async (event, projectId: string) => {
    try {
      const snapshots = await cloudSyncEngine.getProjectHistory(projectId);
      return { success: true, data: snapshots };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:restore-snapshot', async (event, snapshotId: string) => {
    try {
      await cloudSyncEngine.restoreSnapshot(snapshotId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Asset Management
  ipcMain.handle('cloud-sync:upload-asset', async (event, assetPath: string, projectId: string) => {
    try {
      const cdnUrl = await cloudSyncEngine.uploadAsset(assetPath, projectId);
      return { success: true, data: cdnUrl };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:download-asset', async (event, cdnUrl: string, localPath: string) => {
    try {
      await cloudSyncEngine.downloadAsset(cdnUrl, localPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Status & Monitoring
  ipcMain.handle('cloud-sync:get-status', async (event, projectId: string) => {
    try {
      const status = cloudSyncEngine.getSyncStatus(projectId);
      return { success: true, data: status };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('cloud-sync:get-collaboration-session', async (event, projectId: string) => {
    try {
      const session = cloudSyncEngine.getCollaborationSession(projectId);
      return { success: true, data: session };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('[CloudSync IPC] Handlers registered successfully');
}

/**
 * Handler list for documentation
 */
export const cloudSyncIpcHandlers = [
  // Sync Operations
  'cloud-sync:sync-project',          // (projectId, direction) => SyncResult
  'cloud-sync:enable-auto-sync',      // (projectId, interval) => void

  // Collaboration
  'cloud-sync:share-project',         // (projectId, collaborators[]) => ShareResult
  'cloud-sync:join-project',          // (inviteCode) => ProjectJoinResult
  'cloud-sync:broadcast-change',      // (change: ProjectChange) => void

  // Real-time
  'cloud-sync:subscribe-to-changes',  // (projectId, filters?) => { subscriptionId }
  'cloud-sync:unsubscribe-from-changes', // (subscriptionId) => void
  // Receives events: 'cloud-sync:change-received' -> { subscriptionId, change }

  // Conflicts
  'cloud-sync:detect-conflicts',      // (projectId) => { conflicts[] }
  'cloud-sync:resolve-conflict',      // (conflict, resolution) => void

  // Version Control
  'cloud-sync:get-project-history',   // (projectId) => ProjectSnapshot[]
  'cloud-sync:restore-snapshot',      // (snapshotId) => void

  // Assets
  'cloud-sync:upload-asset',          // (assetPath, projectId) => CDNUrl
  'cloud-sync:download-asset',        // (cdnUrl, localPath) => void

  // Status
  'cloud-sync:get-status',            // (projectId) => SyncStatus | null
  'cloud-sync:get-collaboration-session', // (projectId) => CollaborationSession | null
];
