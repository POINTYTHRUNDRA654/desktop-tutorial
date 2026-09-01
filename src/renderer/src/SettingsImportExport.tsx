import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Upload, Settings, AlertCircle, CheckCircle } from 'lucide-react';

interface SettingsData {
  [key: string]: any;
}

type SettingsSnapshot = {
  localStorage: SettingsData;
  electronSettings?: SettingsData;
};

interface SettingsImportExportProps {
  onImport?: (data: SettingsData) => void;
  onExport?: () => SettingsData;
  embedded?: boolean;
}

export const SettingsImportExport: React.FC<SettingsImportExportProps> = ({
  onImport,
  onExport,
  embedded = false
}) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  // Sensitive keys must never be included in an exported backup file
  const SENSITIVE_KEYS = new Set([
    'groqApiKey', 'openaiApiKey', 'backendToken', 'githubToken',
    'groqApiKeyHash', 'openaiApiKeyHash', 'backendTokenConfigured',
  ]);

  const scrubSensitiveFields = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!SENSITIVE_KEYS.has(k)) result[k] = v;
    }
    return result;
  };

  const handleExport = async () => {
    try {
      const localStorageData = onExport?.() || getAllSettings();
      const rawElectronSettings = await api?.getSettings?.().catch(() => undefined);
      // Strip all sensitive credentials before writing to disk
      const electronSettings = rawElectronSettings ? scrubSensitiveFields(rawElectronSettings) : undefined;
      const snapshot: SettingsSnapshot & { exportMeta?: object } = {
        localStorage: localStorageData,
        ...(electronSettings ? { electronSettings } : {}),
        exportMeta: {
          version: '2',
          exportedAt: new Date().toISOString(),
          appVersion: 'MOSSY.SPACE v5',
          note: 'API keys and tokens are intentionally excluded from this backup.',
        },
      };
      const dataStr = JSON.stringify(snapshot, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `mossy-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setErrorMessage('Failed to export settings');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const run = async () => {
        try {
          const raw = JSON.parse(e.target?.result as string) as SettingsData | SettingsSnapshot;
          const snapshot: SettingsSnapshot =
            raw && typeof raw === 'object' && 'localStorage' in raw
              ? (raw as SettingsSnapshot)
              : { localStorage: raw as SettingsData };

          onImport?.(snapshot.localStorage) || importSettings(snapshot.localStorage);
          if (snapshot.electronSettings && api?.setSettings) {
            await api.setSettings(snapshot.electronSettings);
          }
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 3000);
        } catch (error) {
          console.error('Import failed:', error);
          setImportStatus('error');
          setErrorMessage('Invalid settings file');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      };
      void run();
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const getAllSettings = (): SettingsData => {
    const settings: SettingsData = {};

    // Get all localStorage keys that start with 'mossy_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mossy_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            settings[key] = JSON.parse(value);
          }
        } catch {
          // If parsing fails, store as string
          settings[key] = localStorage.getItem(key);
        }
      }
    }

    return settings;
  };

  const importSettings = (data: SettingsData) => {
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('mossy_')) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn(`Failed to import setting ${key}:`, error);
        }
      }
    });

    // Reload the page to apply new settings
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Settings Backup</h3>
        </div>
        {!embedded && (
          <Link
            to="/reference"
            className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 transition-colors"
            title="Open help"
          >
            Help
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export Section */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <ArrowDownToLine className="w-5 h-5 text-green-400" />
            <h4 className="font-medium text-white">Export Settings</h4>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Download your current settings, preferences, and configuration as a backup file.
          </p>
          <button
            onClick={handleExport}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Export Settings
          </button>
          {exportStatus === 'success' && (
            <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Settings exported successfully
            </div>
          )}
          {exportStatus === 'error' && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>

        {/* Import Section */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Upload className="w-5 h-5 text-blue-400" />
            <h4 className="font-medium text-white">Import Settings</h4>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Restore your settings from a previously exported backup file.
          </p>
          <label className="w-full">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <div className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import Settings
            </div>
          </label>
          {importStatus === 'success' && (
            <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Settings imported successfully
            </div>
          )}
          {importStatus === 'error' && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
        <h4 className="font-medium text-white">What gets backed up?</h4>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• UI preferences and theme settings</li>
          <li>• Tool configurations and external tool paths</li>
          <li>• AI Engine settings (provider, model, token limit)</li>
          <li>• Ollama base URL and model selection</li>
          <li>• Voice and TTS settings</li>
          <li>• Privacy and security toggles</li>
          <li>• Project configurations and mod lists</li>
          <li>• Custom keyboard shortcuts</li>
        </ul>
        <div className="rounded border border-amber-700/40 bg-amber-900/10 px-3 py-2 text-xs text-amber-200">
          API keys (Groq, OpenAI, GitHub token) are intentionally excluded from backups for security. Re-enter them after restoring.
        </div>
      </div>
    </div>
  );
};
