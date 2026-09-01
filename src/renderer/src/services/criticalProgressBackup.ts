import packageJson from '../../../../package.json';

const BACKUP_PANEL_ID = 'critical-progress-backup';
const LOCAL_BACKUP_STORAGE_KEY = 'mossy_critical_progress_backup';

// Keys that represent user-authored progress/state and should survive updates/rescans.
const CRITICAL_PROGRESS_KEYS = [
  'mossy_mod_projects',
  'mossy_current_mod',
  'mossy_chat_history',
  'mossy_knowledge_vault',
  'mossy_roadmap',
  'mossy_workflow_state',
] as const;

interface CriticalProgressSnapshot {
  savedAt: number;
  appVersion: string;
  values: Record<string, string>;
}

interface PanelDataApi {
  savePanelData?: (panelId: string, data: unknown) => Promise<{ ok: boolean; panelId: string; error?: string }>;
  loadPanelData?: (panelId: string) => Promise<{ ok: boolean; data: unknown; panelId: string; error?: string }>;
}

interface WindowWithElectronApi {
  electron?: { api?: PanelDataApi };
  electronAPI?: PanelDataApi;
}

const getApi = (): PanelDataApi | undefined => {
  const host = window as WindowWithElectronApi;
  return host.electron?.api ?? host.electronAPI;
};

const collectCriticalValues = (): Record<string, string> => {
  const values: Record<string, string> = {};
  CRITICAL_PROGRESS_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) values[key] = value;
  });
  return values;
};

/**
 * Creates a synchronous local snapshot of critical progress keys.
 * This is used as a last-resort backup path for visibility/unload boundaries.
 */
export const backupCriticalProgressSnapshotSync = (): void => {
  const values = collectCriticalValues();
  if (Object.keys(values).length === 0) return;
  const snapshot: CriticalProgressSnapshot = {
    savedAt: Date.now(),
    appVersion: packageJson.version,
    values,
  };
  localStorage.setItem(LOCAL_BACKUP_STORAGE_KEY, JSON.stringify(snapshot));
};

/**
 * Snapshots critical user-authored local progress and persists it to durable
 * disk storage via panel data APIs. Failures are non-fatal by design.
 */
export const backupCriticalProgressToDisk = async (): Promise<void> => {
  const api = getApi();
  backupCriticalProgressSnapshotSync();
  if (!api?.savePanelData) return;

  const rawSnapshot = localStorage.getItem(LOCAL_BACKUP_STORAGE_KEY);
  if (!rawSnapshot) return;
  const snapshot = JSON.parse(rawSnapshot) as CriticalProgressSnapshot;

  try {
    await api.savePanelData(BACKUP_PANEL_ID, snapshot);
  } catch (err) {
    console.warn('[CriticalProgressBackup] Failed to save backup:', err);
  }
};

/**
 * Restores only missing critical progress keys from durable backup storage.
 * Returns the number of localStorage keys restored in this call.
 */
export const restoreMissingCriticalProgress = async (): Promise<number> => {
  const api = getApi();

  const missingKeys = CRITICAL_PROGRESS_KEYS.filter((key) => localStorage.getItem(key) === null);
  if (missingKeys.length === 0) return 0;

  try {
    let snapshot: CriticalProgressSnapshot | null = null;

    if (api?.loadPanelData) {
      const response = await api.loadPanelData(BACKUP_PANEL_ID);
      snapshot = (response?.data as CriticalProgressSnapshot | null) ?? null;
    }

    if (!snapshot) {
      const localRaw = localStorage.getItem(LOCAL_BACKUP_STORAGE_KEY);
      snapshot = localRaw ? (JSON.parse(localRaw) as CriticalProgressSnapshot) : null;
    }

    if (!snapshot?.values || typeof snapshot.values !== 'object') return 0;

    let restoredCount = 0;
    missingKeys.forEach((key) => {
      const value = (snapshot as CriticalProgressSnapshot).values[key];
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
        restoredCount += 1;
      }
    });
    return restoredCount;
  } catch (err) {
    console.warn('[CriticalProgressBackup] Failed to restore backup:', err);
    return 0;
  }
};
