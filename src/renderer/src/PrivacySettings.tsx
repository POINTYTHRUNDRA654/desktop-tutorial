import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Database, Share2, Shield, Settings as SettingsIcon, AlertCircle, CheckCircle2, Clock, Network, Key, Trash2, ArrowDownToLine, RefreshCw, Plus, X, Ban } from 'lucide-react';
import { DEFAULT_SETTINGS, Settings, BlacklistEntry } from '../../shared/types';

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

interface DataStorageInfo {
  localStorageSize: string;
  lastBackup?: string;
  encryptionEnabled: boolean;
}

type PrivacySettingsProps = {
  embedded?: boolean;
};

function PrivacySettings({ embedded = false }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [storageInfo, setStorageInfo] = useState<DataStorageInfo>({
    localStorageSize: 'Calculating...',
    encryptionEnabled: true
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [listSyncStatus, setListSyncStatus] = useState<{ lastSyncAt?: number; lastError?: string; pendingPush?: boolean }>({});
  const [listSyncBusy, setListSyncBusy] = useState(false);

  // Mod Content Whitelist
  const [whitelistInput, setWhitelistInput] = useState<string>('');

  // Blacklists
  const [modBlacklistInput, setModBlacklistInput] = useState<string>('');
  const [programBlacklistInput, setProgramBlacklistInput] = useState<string>('');

  const browseMemoryFolder = async () => {
    const api = getElectronApi();
    if (typeof api?.pickDirectory === 'function') {
      try {
        const selected = await api.pickDirectory('Select Memory Storage Folder');
        if (selected) saveSettings({ memoryStoragePath: String(selected) });
      } catch (e) {
        console.warn('[PrivacySettings] browseMemoryFolder error', e);
      }
    } else {
      const manual = prompt('Folder picker unavailable.\n\nPaste the absolute path for your memory storage folder:');
      if (manual && manual.trim()) saveSettings({ memoryStoragePath: manual.trim() });
    }
  };

  async function refreshListSyncStatus() {
    const api = getElectronApi();
    if (!api?.listSyncGetStatus) return;
    try {
      const status = await api.listSyncGetStatus();
      setListSyncStatus(status || {});
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadSettings();
    calculateStorageInfo();
    refreshListSyncStatus();
  }, []);

  const loadSettings = async () => {
    const api = getElectronApi();
    if (api?.getSettings) {
      try {
        const s = await api.getSettings();
        const mergedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...(s || {}),
          privacySettings: {
            ...DEFAULT_SETTINGS.privacySettings,
            ...(s?.privacySettings || {}),
          },
          securitySettings: {
            ...DEFAULT_SETTINGS.securitySettings,
            ...(s?.securitySettings || {}),
          },
        };
        setSettings(mergedSettings);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  };

  const saveSettings = async (updates: Partial<Settings>) => {
    const api = getElectronApi();
    if (!api?.setSettings || !settings) return;

    setSaveStatus('saving');
    try {
      const newSettings = { ...settings, ...updates };
      await api.setSettings(newSettings);
      setSettings(newSettings);
      setSaveStatus('saved');
      refreshListSyncStatus();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('idle');
    }
  };

  const handleSyncNow = async () => {
    const api = getElectronApi();
    if (!api?.listSyncSyncNow) return;
    setListSyncBusy(true);
    try {
      await api.listSyncSyncNow();
      await refreshListSyncStatus();
    } finally {
      setListSyncBusy(false);
    }
  };

  const calculateStorageInfo = () => {
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }
      const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
      setStorageInfo(prev => ({
        ...prev,
        localStorageSize: `${sizeInMB} MB`
      }));
    } catch (e) {
      setStorageInfo(prev => ({
        ...prev,
        localStorageSize: 'Unable to calculate'
      }));
    }
  };

  const handlePrivacySettingToggle = (key: keyof Settings['privacySettings']) => {
    if (!settings) return;
    const newValue = !settings.privacySettings[key];
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        [key]: newValue
      }
    });
  };

  const handleSecuritySettingToggle = (key: keyof Settings['securitySettings']) => {
    if (!settings) return;
    const newValue = !settings.securitySettings[key];
    saveSettings({
      securitySettings: {
        ...settings.securitySettings,
        [key]: newValue
      }
    });
  };

  const handleSecuritySettingChange = (key: keyof Settings['securitySettings'], value: any) => {
    if (!settings) return;
    saveSettings({
      securitySettings: {
        ...settings.securitySettings,
        [key]: value
      }
    });
  };

  const handleExportData = () => {
    if (!settings) return;
    try {
      const data = {
        settings: {
          ...settings,
          // Remove sensitive data from export
          openaiApiKey: undefined,
          groqApiKey: undefined,
          backendToken: undefined
        },
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mossy-privacy-settings-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export data:', e);
    }
  };

  const handleDeleteAllData = async () => {
    if (confirm('Are you absolutely sure? This will delete all local data including your Knowledge Vault, mod projects, and chat history. This cannot be undone.')) {
      if (confirm('Final warning: This will permanently erase your knowledge vault, mod projects, chat history, and all settings. Continue?')) {
        // Wipe durable file backups so they do not restore on next launch.
        const api = (window as any).electron?.api || (window as any).electronAPI;
        try {
          await Promise.allSettled([
            api?.saveKnowledgeVault?.([]),
            api?.saveModProjects?.([]),
            api?.saveChatHistory?.([]),
          ]);
        } catch {
          // Ignore — we still clear localStorage below
        }
        localStorage.clear();
        location.reload();
      }
    }
  };

  const currentWhitelist = (): string[] => {
    return settings?.privacySettings?.modContentWhitelist ?? [];
  };

  const handleAddToWhitelist = () => {
    const trimmed = whitelistInput.trim();
    if (!trimmed || !settings) return;
    const existing = currentWhitelist();
    if (existing.includes(trimmed)) {
      setWhitelistInput('');
      return;
    }
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        modContentWhitelist: [...existing, trimmed],
      },
    });
    setWhitelistInput('');
  };

  const handleRemoveFromWhitelist = (entry: string) => {
    if (!settings) return;
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        modContentWhitelist: currentWhitelist().filter((e) => e !== entry),
      },
    });
  };

  // Mod Blacklist handlers
  const currentModBlacklist = (): BlacklistEntry[] => {
    return (settings?.privacySettings?.modContentBlacklist ?? []).map((e: any) =>
      typeof e === 'string' ? { name: e } : e
    );
  };

  const handleAddToModBlacklist = () => {
    const trimmed = modBlacklistInput.trim();
    if (!trimmed || !settings) return;
    const existing = currentModBlacklist();
    if (existing.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setModBlacklistInput('');
      return;
    }
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        modContentBlacklist: [...existing, { name: trimmed }],
      },
    });
    setModBlacklistInput('');
  };

  const handleRemoveFromModBlacklist = (name: string) => {
    if (!settings) return;
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        modContentBlacklist: currentModBlacklist().filter((e) => e.name !== name),
      },
    });
  };

  // Program Blacklist handlers
  const currentProgramBlacklist = (): BlacklistEntry[] => {
    return (settings?.privacySettings?.programBlacklist ?? []).map((e: any) =>
      typeof e === 'string' ? { name: e } : e
    );
  };

  const handleAddToProgramBlacklist = () => {
    const trimmed = programBlacklistInput.trim();
    if (!trimmed || !settings) return;
    const existing = currentProgramBlacklist();
    if (existing.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setProgramBlacklistInput('');
      return;
    }
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        programBlacklist: [...existing, { name: trimmed }],
      },
    });
    setProgramBlacklistInput('');
  };

  const handleRemoveFromProgramBlacklist = (name: string) => {
    if (!settings) return;
    saveSettings({
      privacySettings: {
        ...settings.privacySettings,
        programBlacklist: currentProgramBlacklist().filter((e) => e.name !== name),
      },
    });
  };

  const settingGroups = [
    {
      title: 'Data Collection & Sharing',
      description: 'Control what data is collected and shared',
      icon: <Database className="w-5 h-5" />,
      settings: [
        {
          id: 'allowAnalytics' as keyof Settings['privacySettings'],
          label: 'Allow Usage Analytics',
          description: 'Help improve Mossy by sharing anonymous usage statistics and feature usage patterns.',
          hint: 'No personal data or content is included',
          icon: <Share2 className="w-5 h-5" />
        },
        {
          id: 'allowCrashReporting' as keyof Settings['privacySettings'],
          label: 'Allow Crash Reporting',
          description: 'Automatically send crash reports to help fix bugs and improve stability.',
          hint: 'Reports are anonymized and contain no personal data',
          icon: <AlertCircle className="w-5 h-5" />
        },
        {
          id: 'allowUsageMetrics' as keyof Settings['privacySettings'],
          label: 'Allow Usage Metrics',
          description: 'Share feature usage metrics to prioritize development efforts.',
          hint: 'Only counts and timings, no content',
          icon: <SettingsIcon className="w-5 h-5" />
        }
      ]
    },
    {
      title: 'Knowledge Base Contributions',
      description: 'Help the Mossy community by sharing anonymized insights',
      icon: <Share2 className="w-5 h-5" />,
      settings: [
        {
          id: 'contributeToKnowledgeBase' as keyof Settings['privacySettings'],
          label: 'Contribute to Shared Knowledge Base',
          description: 'Share script patterns, mesh techniques, and modding solutions you discover.',
          hint: 'No personal data is included - only patterns and techniques',
          icon: <Database className="w-5 h-5" />
        },
        {
          id: 'shareScriptPatterns' as keyof Settings['privacySettings'],
          label: 'Share Script Patterns',
          description: 'Contribute Papyrus script patterns and coding techniques you develop.',
          hint: 'Requires "Contribute to Knowledge Base" to be enabled',
          icon: <SettingsIcon className="w-5 h-5" />,
          dependsOn: 'contributeToKnowledgeBase'
        },
        {
          id: 'shareMeshOptimizations' as keyof Settings['privacySettings'],
          label: 'Share Mesh Optimization Techniques',
          description: '3D mesh optimization methods and best practices you discover.',
          hint: 'Requires "Contribute to Knowledge Base" to be enabled',
          icon: <SettingsIcon className="w-5 h-5" />,
          dependsOn: 'contributeToKnowledgeBase'
        }
      ]
    },
    {
      title: 'Data Storage & Retention',
      description: 'Control how your data is stored and managed',
      icon: <Database className="w-5 h-5" />,
      settings: [
        {
          id: 'keepLocalOnly' as keyof Settings['privacySettings'],
          label: 'Keep All Data Local',
          description: 'Store all project data, conversations, and learning exclusively on your computer.',
          hint: 'Recommended for maximum privacy',
          icon: <Lock className="w-5 h-5" />
        },
        {
          id: 'encryptLocalData' as keyof Settings['privacySettings'],
          label: 'Encrypt Local Data',
          description: 'Encrypt sensitive data stored locally on your computer.',
          hint: 'Uses system encryption when available',
          icon: <Shield className="w-5 h-5" />
        },
        {
          id: 'autoDeleteOldData' as keyof Settings['privacySettings'],
          label: 'Auto-Delete Old Data',
          description: 'Automatically delete old conversation history and temporary files.',
          hint: 'Helps maintain privacy by limiting data retention',
          icon: <Trash2 className="w-5 h-5" />
        }
      ]
    },
    {
      title: 'Permissions',
      description: 'Control what Mossy can access on your system',
      icon: <Shield className="w-5 h-5" />,
      settings: [
        {
          id: 'allowFileSystemAccess' as keyof Settings['privacySettings'],
          label: 'Allow File System Access',
          description: 'Allow Mossy to read and write files for modding operations.',
          hint: 'Required for most modding features',
          icon: <Database className="w-5 h-5" />
        },
        {
          id: 'allowNetworkAccess' as keyof Settings['privacySettings'],
          label: 'Allow Network Access',
          description: 'Allow Mossy to connect to external services for AI features.',
          hint: 'Required for cloud AI services',
          icon: <Network className="w-5 h-5" />
        },
        {
          id: 'allowExternalTools' as keyof Settings['privacySettings'],
          label: 'Allow External Tools',
          description: 'Allow Mossy to launch external modding tools and applications.',
          hint: 'Required for integrated workflows',
          icon: <SettingsIcon className="w-5 h-5" />
        },
        {
          id: 'allowClipboardAccess' as keyof Settings['privacySettings'],
          label: 'Allow Clipboard Access',
          description: 'Allow Mossy to read from and write to your clipboard.',
          hint: 'Used for copy/paste operations',
          icon: <SettingsIcon className="w-5 h-5" />
        }
      ]
    },
    {
      title: 'Security Features',
      description: 'Additional security and access controls',
      icon: <Shield className="w-5 h-5" />,
      settings: [
        {
          id: 'requirePasswordForSettings' as keyof Settings['privacySettings'],
          label: 'Require Password for Settings',
          description: 'Require authentication to access privacy and security settings.',
          hint: 'Extra protection for sensitive configuration',
          icon: <Lock className="w-5 h-5" />
        },
        {
          id: 'autoLockAfterInactivity' as keyof Settings['privacySettings'],
          label: 'Auto-Lock After Inactivity',
          description: 'Automatically lock Mossy after a period of inactivity.',
          hint: 'Protects against unauthorized access',
          icon: <Clock className="w-5 h-5" />
        }
      ]
    }
  ];

  const securitySettingGroups = [
    {
      title: 'API Key Management',
      description: 'Control how API keys are managed and secured',
      icon: <Key className="w-5 h-5" />,
      settings: [
        {
          id: 'apiKeyRotationEnabled' as keyof Settings['securitySettings'],
          label: 'Enable API Key Rotation',
          description: 'Automatically rotate API keys periodically for enhanced security.',
          hint: 'Reduces risk if a key is compromised',
          icon: <RefreshCw className="w-5 h-5" />
        },
        {
          id: 'requireApiKeyConfirmation' as keyof Settings['securitySettings'],
          label: 'Require Key Confirmation',
          description: 'Require confirmation before using API keys for sensitive operations.',
          hint: 'Extra verification for key usage',
          icon: <CheckCircle2 className="w-5 h-5" />
        }
      ]
    },
    {
      title: 'Access Control',
      description: 'Control network access and domain restrictions',
      icon: <Network className="w-5 h-5" />,
      settings: [
        {
          id: 'requireHttps' as keyof Settings['securitySettings'],
          label: 'Require HTTPS',
          description: 'Only allow connections to HTTPS endpoints for security.',
          hint: 'Prevents man-in-the-middle attacks',
          icon: <Shield className="w-5 h-5" />
        }
      ]
    }
  ];

  const containerClassName = embedded
    ? 'bg-slate-950 text-slate-100 p-6'
    : 'min-h-screen bg-slate-950 text-slate-100 p-8 pb-20';

  const loadingClassName = embedded
    ? 'bg-slate-950 text-slate-100 p-6 flex items-center justify-center'
    : 'min-h-screen bg-slate-950 p-8 pb-20 flex items-center justify-center';

  if (!settings) {
    return (
      <div className={loadingClassName}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        {!embedded && (
          <div className="mb-8 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2">Privacy & Security Settings</h1>
              <p className="text-slate-400">Control your data, privacy, and security preferences</p>
            </div>
            <Link
              to="/reference"
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-blue-900/20 border border-blue-500/30 text-blue-100 hover:bg-blue-900/30 transition-colors"
              title="Open help"
            >
              Help
            </Link>
          </div>
        )}

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            saveStatus === 'saving' ? 'bg-blue-500/10 border border-blue-500/20' :
            'bg-green-500/10 border border-green-500/20'
          }`}>
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
            <span className={saveStatus === 'saving' ? 'text-blue-400' : 'text-green-400'}>
              {saveStatus === 'saving' ? 'Saving settings...' : 'Settings saved successfully'}
            </span>
          </div>
        )}

        <div className="mb-8 bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 space-y-5">
          <h2 className="text-xl font-semibold text-slate-100">Identity, Memory & List Sync</h2>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Preferred name</label>
            <input
              type="text"
              value={settings.userPreferredName || ''}
              onChange={(e) => saveSettings({ userPreferredName: e.target.value })}
              placeholder="How Mossy should address you"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                checked={(settings.memoryStorageMode || 'userData') === 'userData'}
                onChange={() => saveSettings({ memoryStorageMode: 'userData', memoryStoragePath: '' })}
              />
              Store memory in app userData
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                checked={(settings.memoryStorageMode || 'userData') === 'custom'}
                onChange={() => saveSettings({ memoryStorageMode: 'custom' })}
              />
              Store memory in custom path
            </label>
          </div>
          {(settings.memoryStorageMode || 'userData') === 'custom' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.memoryStoragePath || ''}
                onChange={(e) => saveSettings({ memoryStoragePath: e.target.value })}
                placeholder="Absolute folder path, e.g. H:\Mossy Memory"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => void browseMemoryFolder()}
                className="flex items-center gap-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded-md text-slate-100 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Browse
              </button>
            </div>
          )}

          <div className="space-y-3 border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400">
              When enabled, Mossy syncs whitelist/blacklist changes to GitHub and pulls latest list data on startup.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={!!settings.listSyncEnabled}
                onChange={(e) => saveSettings({ listSyncEnabled: e.target.checked })}
              />
              Enable GitHub list sync
            </label>
            <input
              type="text"
              value={settings.listSyncRepo || ''}
              onChange={(e) => saveSettings({ listSyncRepo: e.target.value })}
              placeholder="owner/repo"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
            />
            <input
              type="text"
              value={settings.listSyncBranch || 'main'}
              onChange={(e) => saveSettings({ listSyncBranch: e.target.value })}
              placeholder="branch"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
            />
            <input
              type="password"
              value={settings.githubToken || ''}
              onChange={(e) => saveSettings({ githubToken: e.target.value })}
              placeholder="GitHub token (repo content write)"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
            />
            <div className="text-xs text-slate-400">
              Last sync: {listSyncStatus.lastSyncAt ? new Date(listSyncStatus.lastSyncAt).toLocaleString() : 'never'}{listSyncStatus.pendingPush ? ' • pending retry' : ''}
              {listSyncStatus.lastError ? ` • Error: ${listSyncStatus.lastError}` : ''}
            </div>
            <button
              onClick={handleSyncNow}
              disabled={listSyncBusy}
              className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {listSyncBusy ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-8">
          {settingGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-blue-400">{group.icon}</div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{group.title}</h2>
                  <p className="text-slate-400 text-sm">{group.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {group.settings.map((setting, settingIndex) => {
                  const isEnabled = (settings.privacySettings as unknown as Record<string, boolean | undefined>)[setting.id];
                  const isDisabled = setting.dependsOn && !(settings.privacySettings as unknown as Record<string, boolean | undefined>)[setting.dependsOn];

                  return (
                    <div key={settingIndex} className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      isDisabled ? 'bg-slate-700/20 border-slate-600/30 opacity-60' : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50'
                    }`}>
                      <div className="text-slate-400 mt-0.5">{setting.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-slate-100 font-medium cursor-pointer" htmlFor={`setting-${setting.id}`}>
                            {setting.label}
                          </label>
                          <button
                            id={`setting-${setting.id}`}
                            onClick={() => !isDisabled && handlePrivacySettingToggle(setting.id)}
                            disabled={!!isDisabled}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                              isEnabled && !isDisabled ? 'bg-blue-600' : 'bg-slate-600'
                            } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled && !isDisabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm mb-2">{setting.description}</p>
                        <p className="text-slate-500 text-xs">{setting.hint}</p>
                        {setting.dependsOn && (
                          <p className="text-amber-400 text-xs mt-1">
                            ⚠️ Requires "{settingGroups.find(g => g.settings.some(s => s.id === setting.dependsOn))?.settings.find(s => s.id === setting.dependsOn)?.label}" to be enabled
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Security Settings */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Security Settings</h2>
          <div className="space-y-8">
            {securitySettingGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-blue-400">{group.icon}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">{group.title}</h3>
                    <p className="text-slate-400 text-sm">{group.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {group.settings.map((setting, settingIndex) => {
                    const isEnabled = settings.securitySettings[setting.id];

                    return (
                      <div key={settingIndex} className="flex items-start gap-4 p-4 rounded-lg border bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50 transition-colors">
                        <div className="text-slate-400 mt-0.5">{setting.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-slate-100 font-medium cursor-pointer" htmlFor={`security-${setting.id}`}>
                              {setting.label}
                            </label>
                            <button
                              id={`security-${setting.id}`}
                              onClick={() => handleSecuritySettingToggle(setting.id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                                isEnabled ? 'bg-blue-600' : 'bg-slate-600'
                              } cursor-pointer`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-slate-400 text-sm mb-2">{setting.description}</p>
                          <p className="text-slate-500 text-xs">{setting.hint}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Data Management</h2>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Storage Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Local Storage:</span>
                    <span className="text-slate-100">{storageInfo.localStorageSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Encryption:</span>
                    <span className="text-slate-100">{storageInfo.encryptionEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportData}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-100 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Export Settings
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mod Content Whitelist */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Mod Content Whitelist</h2>
          <p className="text-slate-400 text-sm mb-6">
            If you are a mod author — or a user who wants to protect specific mods from being referenced,
            discussed, or touched by Mossy in any way — add them here. Mossy will never mention, recommend,
            use as examples, or interact with whitelisted mods in any response or action.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-700/40">
              <Ban className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-200">
                <span className="font-semibold">Protected mod notice:</span> Adding a mod here tells Mossy
                to stay away from that content entirely — she cannot touch it no matter what. This is entirely local — no data is sent
                anywhere. The whitelist is stored in your private settings file.
              </div>
            </div>

            {/* Add entry */}
            <div className="flex gap-2">
              <input
                type="text"
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && whitelistInput.trim()) handleAddToWhitelist(); }}
                placeholder="Mod name or keyword (e.g. My Awesome Mod)"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddToWhitelist}
                disabled={!whitelistInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Whitelist entries */}
            {currentWhitelist().length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                No mods are protected yet. Mossy will treat all mod content equally.
              </p>
            ) : (
              <ul className="space-y-2">
                {currentWhitelist().map((entry) => (
                  <li
                    key={entry}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-700/40 rounded-md border border-slate-600/50"
                  >
                    <span className="text-slate-200 text-sm font-mono truncate">{entry}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromWhitelist(entry)}
                      className="shrink-0 p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      title="Remove from whitelist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-slate-500">
              {currentWhitelist().length} mod{currentWhitelist().length !== 1 ? 's' : ''} protected.
              Changes take effect on your next message to Mossy.
            </p>
          </div>
        </div>

        {/* Mod Content Blacklist */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Mod Content Blacklist</h2>
          <p className="text-slate-400 text-sm mb-6">
            Add mods that are problematic, broken, or incompatible that Mossy should warn against.
            When users ask about these mods, Mossy will provide warnings about potential issues.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-900/20 border border-red-700/40">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm text-red-200">
                <span className="font-semibold">Problematic mod warning:</span> Mods added here will be
                flagged as potentially problematic. Mossy will warn users about known issues with these mods
                and suggest alternatives when appropriate.
              </div>
            </div>

            {/* Add entry */}
            <div className="flex gap-2">
              <input
                type="text"
                value={modBlacklistInput}
                onChange={(e) => setModBlacklistInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && modBlacklistInput.trim()) handleAddToModBlacklist(); }}
                placeholder="Mod name or keyword (e.g. Broken Mod X)"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddToModBlacklist}
                disabled={!modBlacklistInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-700 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Blacklist entries */}
            {currentModBlacklist().length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                No mods are blacklisted yet. Mossy will not warn about any specific mods.
              </p>
            ) : (
              <ul className="space-y-2">
                {currentModBlacklist().map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-700/40 rounded-md border border-orange-600/50"
                  >
                    <div className="min-w-0">
                      <span className="text-slate-200 text-sm font-mono truncate block">{entry.name}</span>
                      {entry.reason && <span className="text-xs text-slate-400 truncate block">{entry.reason}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromModBlacklist(entry.name)}
                      className="shrink-0 p-1 rounded text-slate-400 hover:text-orange-400 hover:bg-orange-900/20 transition-colors"
                      title="Remove from blacklist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-slate-500">
              {currentModBlacklist().length} mod{currentModBlacklist().length !== 1 ? 's' : ''} blacklisted.
              Changes take effect on your next message to Mossy.
            </p>
          </div>
        </div>

        {/* Program Blacklist */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Program Blacklist</h2>
          <p className="text-slate-400 text-sm mb-6">
            Add programs or tools that are known to cause issues, conflicts, or problems with modding workflows.
            Mossy will warn users against using these programs and suggest safer alternatives.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-900/20 border border-red-700/40">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm text-red-200">
                <span className="font-semibold">Problematic program warning:</span> Programs added here will be
                flagged as potentially dangerous or incompatible. Mossy will actively discourage their use
                and recommend safer alternatives when asked.
              </div>
            </div>

            {/* Add entry */}
            <div className="flex gap-2">
              <input
                type="text"
                value={programBlacklistInput}
                onChange={(e) => setProgramBlacklistInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && programBlacklistInput.trim()) handleAddToProgramBlacklist(); }}
                placeholder="Program name (e.g. Buggy Tool 2023)"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddToProgramBlacklist}
                disabled={!programBlacklistInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-700 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Blacklist entries */}
            {currentProgramBlacklist().length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                No programs are blacklisted yet. Mossy will not warn against any specific programs.
              </p>
            ) : (
              <ul className="space-y-2">
                {currentProgramBlacklist().map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-700/40 rounded-md border border-orange-600/50"
                  >
                    <div className="min-w-0">
                      <span className="text-slate-200 text-sm font-mono truncate block">{entry.name}</span>
                      {entry.reason && <span className="text-xs text-slate-400 truncate block">{entry.reason}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromProgramBlacklist(entry.name)}
                      className="shrink-0 p-1 rounded text-slate-400 hover:text-orange-400 hover:bg-orange-900/20 transition-colors"
                      title="Remove from blacklist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-slate-500">
              {currentProgramBlacklist().length} program{currentProgramBlacklist().length !== 1 ? 's' : ''} blacklisted.
              Changes take effect on your next message to Mossy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacySettings;
