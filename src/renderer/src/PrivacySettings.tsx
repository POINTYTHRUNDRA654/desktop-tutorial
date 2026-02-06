import React, { useState, useEffect } from 'react';
import { Lock, Database, Share2, Shield, Settings as SettingsIcon, AlertCircle, CheckCircle2, Eye, EyeOff, Clock, Network, Key, Trash2, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { DEFAULT_SETTINGS, Settings } from '../../shared/types';

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

interface DataStorageInfo {
  localStorageSize: string;
  lastBackup?: string;
  encryptionEnabled: boolean;
}

function PrivacySettings() {
  console.log('[PrivacySettings] Component rendering');

  const [settings, setSettings] = useState<Settings | null>(null);
  const [storageInfo, setStorageInfo] = useState<DataStorageInfo>({
    localStorageSize: 'Calculating...',
    encryptionEnabled: true
  });
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // API Key inputs
  const [backendBaseUrlInput, setBackendBaseUrlInput] = useState<string>('');
  const [backendTokenInput, setBackendTokenInput] = useState<string>('');
  const [showBackendToken, setShowBackendToken] = useState(false);

  const [secrets, setSecrets] = useState<{ backendToken: boolean } | null>(null);
  const [keySaveStatus, setKeySaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  useEffect(() => {
    console.log('[PrivacySettings] useEffect running');
    loadSettings();
    calculateStorageInfo();
  }, []);

  const loadSettings = async () => {
    console.log('[PrivacySettings] loadSettings called');
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
        setBackendBaseUrlInput(String(mergedSettings?.backendBaseUrl || '').trim());
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    // Load secret status
    if (api?.getSecretStatus) {
      try {
        const st = await api.getSecretStatus();
        if (st?.ok) {
          setSecrets({ backendToken: !!st.backendToken });
        }
      } catch (e) {
        console.warn('Failed to load secret status:', e);
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
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('idle');
    }
  };

  const saveBackendConfig = async (baseUrl: string, tokenOrEmpty?: string) => {
    const api = getElectronApi();
    if (!api?.setSettings || !api?.getSecretStatus) {
      setKeySaveStatus((prev) => ({ ...prev, backend: 'error' }));
      return;
    }

    setKeySaveStatus((prev) => ({ ...prev, backend: 'saving' }));
    try {
      const payload: any = { backendBaseUrl: String(baseUrl || '').trim() };
      if (typeof tokenOrEmpty === 'string') {
        payload.backendToken = tokenOrEmpty.trim();
      }
      await api.setSettings(payload);

      // Clear token input so it doesn't linger in renderer memory.
      if (typeof tokenOrEmpty === 'string' && tokenOrEmpty.trim()) {
        setBackendTokenInput('');
      }

      const st = await api.getSecretStatus();
      if (st?.ok) setSecrets({ backendToken: !!st.backendToken });

      setKeySaveStatus((prev) => ({ ...prev, backend: 'saved' }));
      setTimeout(() => setKeySaveStatus((prev) => ({ ...prev, backend: 'idle' })), 2500);
    } catch {
      setKeySaveStatus((prev) => ({ ...prev, backend: 'error' }));
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
          deepgramApiKey: undefined,
          elevenLabsApiKey: undefined,
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

  const handleDeleteAllData = () => {
    if (confirm('Are you absolutely sure? This will delete all local data and cannot be undone.')) {
      if (confirm('This is your final warning. All your project data will be lost.')) {
        localStorage.clear();
        location.reload();
      }
    }
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

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 pb-20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Privacy & Security Settings</h1>
          <p className="text-slate-400">Control your data, privacy, and security preferences</p>
        </div>

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
                  const isEnabled = settings.privacySettings[setting.id];
                  const isDisabled = setting.dependsOn && !settings.privacySettings[setting.dependsOn];

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
                            disabled={isDisabled}
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

        {/* API Configuration - Backend Only */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">API Configuration</h2>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-blue-100 font-medium mb-1">Backend-Only Architecture</h4>
                    <p className="text-blue-200 text-sm">
                      Mossy uses a backend service for all AI features. Individual API keys are no longer supported.
                      Configure your backend service below to enable chat, transcription, and other AI features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backend Configuration */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-100">Backend Service Configuration</h4>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-100">Backend Base URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={backendBaseUrlInput}
                      onChange={(e) => setBackendBaseUrlInput(e.target.value)}
                      placeholder="https://your-backend.onrender.com"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => saveBackendConfig(backendBaseUrlInput)}
                      disabled={keySaveStatus.backend === 'saving'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {keySaveStatus.backend === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-100">Backend Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showBackendToken ? 'text' : 'password'}
                        value={backendTokenInput}
                        onChange={(e) => setBackendTokenInput(e.target.value)}
                        placeholder="Bearer token for backend authentication"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => setShowBackendToken(!showBackendToken)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showBackendToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => saveBackendConfig(backendBaseUrlInput, backendTokenInput)}
                      disabled={keySaveStatus.backend === 'saving'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {keySaveStatus.backend === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                    {secrets?.backendToken && (
                      <button
                        onClick={() => saveBackendConfig(backendBaseUrlInput, '')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {keySaveStatus.backend && keySaveStatus.backend !== 'idle' && (
                    <p className={`text-sm ${keySaveStatus.backend === 'saved' ? 'text-green-400' : 'text-red-400'}`}>
                      {keySaveStatus.backend === 'saved' ? '✓ Backend configuration saved' : keySaveStatus.backend === 'saving' ? 'Saving...' : 'Failed to save'}
                    </p>
                  )}
                </div>
              </div>
            </div>
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
      </div>
    </div>
  );
}

export default PrivacySettings;
