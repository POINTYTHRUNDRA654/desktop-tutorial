import packageJson from '../../../../package.json';

const BACKUP_PANEL_ID = 'critical-progress-backup';

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

const getApi = () => (window as any).electron?.api || (window as any).electronAPI;

const collectCriticalValues = (): Record<string, string> => {
  const values: Record<string, string> = {};
  CRITICAL_PROGRESS_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) values[key] = value;
  });
  return values;
};

export const backupCriticalProgressToDisk = async (): Promise<void> => {
  const api = getApi();
  if (!api?.savePanelData) return;

  const values = collectCriticalValues();
  if (Object.keys(values).length === 0) return;

  const snapshot: CriticalProgressSnapshot = {
    savedAt: Date.now(),
    appVersion: packageJson.version,
    values,
  };

  try {
    await api.savePanelData(BACKUP_PANEL_ID, snapshot);
  } catch (err) {
    console.warn('[CriticalProgressBackup] Failed to save backup:', err);
  }
};

export const restoreCriticalProgressFromDiskIfMissing = async (): Promise<number> => {
  const api = getApi();
  if (!api?.loadPanelData) return 0;

  const missingKeys = CRITICAL_PROGRESS_KEYS.filter((key) => localStorage.getItem(key) === null);
  if (missingKeys.length === 0) return 0;

  try {
    const response = await api.loadPanelData(BACKUP_PANEL_ID);
    const snapshot = response?.data as CriticalProgressSnapshot | null;
    if (!snapshot?.values || typeof snapshot.values !== 'object') return 0;

    let restoredCount = 0;
    missingKeys.forEach((key) => {
      const value = snapshot.values[key];
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

