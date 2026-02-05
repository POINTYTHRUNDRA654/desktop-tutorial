import React, { useState } from 'react';
import { ArrowDownToLine, Upload, Settings, AlertCircle, CheckCircle } from 'lucide-react';

interface SettingsData {
  [key: string]: any;
}

interface SettingsImportExportProps {
  onImport?: (data: SettingsData) => void;
  onExport?: () => SettingsData;
}

export const SettingsImportExport: React.FC<SettingsImportExportProps> = ({
  onImport,
  onExport
}) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = () => {
    try {
      const settingsData = onExport?.() || getAllSettings();
      const dataStr = JSON.stringify(settingsData, null, 2);
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
      try {
        const data = JSON.parse(e.target?.result as string);
        onImport?.(data) || importSettings(data);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        setImportStatus('error');
        setErrorMessage('Invalid settings file');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
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
      <div className="flex items-center gap-3 mb-4">
        <Settings className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Settings Backup</h3>
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

      <div className="bg-slate-800/50 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-2">What gets backed up?</h4>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• UI preferences and theme settings</li>
          <li>• Tool configurations and paths</li>
          <li>• Favorite modules and bookmarks</li>
          <li>• Voice and TTS settings</li>
          <li>• Project configurations</li>
          <li>• Custom keyboard shortcuts</li>
        </ul>
        <p className="text-xs text-slate-400 mt-3">
          Note: API keys and sensitive data are not included in backups for security reasons.
        </p>
      </div>
    </div>
  );
};