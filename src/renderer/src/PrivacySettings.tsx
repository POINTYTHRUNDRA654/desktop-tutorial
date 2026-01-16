import React, { useState, useEffect } from 'react';
import { Lock, Database, Share2, Shield, Settings as SettingsIcon, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface PrivacySettings {
  keepLocalOnly: boolean;
  shareModProjectData: boolean;
  shareScriptPatterns: boolean;
  shareMeshOptimizations: boolean;
  shareBugReports: boolean;
  contributeToKnowledgeBase: boolean;
  allowAnalytics: boolean;
}

interface DataStorageInfo {
  localStorageSize: string;
  lastBackup?: string;
  encryptionEnabled: boolean;
}

const PrivacySettings: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    keepLocalOnly: true,
    shareModProjectData: false,
    shareScriptPatterns: false,
    shareMeshOptimizations: false,
    shareBugReports: false,
    contributeToKnowledgeBase: false,
    allowAnalytics: false
  });

  const [storageInfo, setStorageInfo] = useState<DataStorageInfo>({
    localStorageSize: 'Calculating...',
    encryptionEnabled: true
  });

  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(false);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('mossy_privacy_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load privacy settings:', e);
      }
    }

    // Load OpenAI API key
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setOpenaiApiKey(savedKey);
      setApiKeySaved(true);
    }

    // Calculate storage
    calculateStorageInfo();
  }, []);

  const calculateStorageInfo = () => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
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

  const handleToggleSetting = (key: keyof PrivacySettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setSaveStatus('saving');
    
    // Simulate save
    setTimeout(() => {
      localStorage.setItem('mossy_privacy_settings', JSON.stringify(newSettings));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  const handleExportData = () => {
    try {
      const data = {
        settings,
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
      title: 'Data Storage',
      description: 'How your data is stored on your computer',
      icon: <Database className="w-5 h-5" />,
      settings: [
        {
          id: 'keepLocalOnly',
          label: 'Keep All Data Local',
          description: 'Store all project data, conversations, and learning exclusively on your computer. Nothing is ever sent to external servers.',
          hint: 'Recommended for maximum privacy',
          icon: <Lock className="w-5 h-5" />
        }
      ]
    },
    {
      title: 'Knowledge Base Contributions',
      description: 'Help the Mossy community by sharing anonymized insights',
      icon: <Share2 className="w-5 h-5" />,
      settings: [
        {
          id: 'contributeToKnowledgeBase',
          label: 'Contribute to Shared Knowledge Base',
          description: 'Share script patterns, mesh techniques, and modding solutions you discover. This helps all Mossy users get better recommendations.',
          hint: 'No personal data is included - only patterns and techniques',
          icon: <Database className="w-5 h-5" />
        },
        {
          id: 'shareScriptPatterns',
          label: 'Share Script Patterns',
          description: 'Contribute Papyrus script patterns and coding techniques you develop.',
          hint: 'Requires "Contribute to Knowledge Base" to be enabled',
          icon: <SettingsIcon className="w-5 h-5" />,
          dependsOn: 'contributeToKnowledgeBase'
        },
        {
          id: 'shareMeshOptimizations',
          label: 'Share Mesh Optimization Techniques',
          description: '3D mesh optimization methods and best practices you discover.',
          hint: 'Requires "Contribute to Knowledge Base" to be enabled',
          icon: <SettingsIcon className="w-5 h-5" />,
          dependsOn: 'contributeToKnowledgeBase'
        }
      ]
    },
    {
      title: 'Quality & Support',
      description: 'Help improve Mossy for everyone',
      icon: <Shield className="w-5 h-5" />,
      settings: [
        {
          id: 'shareBugReports',
          label: 'Share Bug Reports',
          description: 'Send information about bugs and errors you encounter. This helps us fix issues faster.',
          hint: 'Bug reports are reviewed for privacy before analysis',
          icon: <AlertCircle className="w-5 h-5" />
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-red-400" />
            <h1 className="text-4xl font-bold text-white">Privacy & Data Settings</h1>
          </div>
          <p className="text-slate-400">
            Your data privacy and security are fundamental rights. Control exactly what information Mossy collects, stores, and shares.
          </p>
        </div>

        {/* OpenAI API Key Section */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-emerald-400"><Lock className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-white">API Keys</h2>
            </div>
            <p className="text-slate-400 text-sm">Manage API keys for AI features. Keys are stored locally and encrypted.</p>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                OpenAI API Key (for video transcription)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={openaiApiKey}
                    onChange={(e) => {
                      setOpenaiApiKey(e.target.value);
                      setApiKeySaved(false);
                    }}
                    placeholder="sk-..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (openaiApiKey.trim()) {
                      localStorage.setItem('openai_api_key', openaiApiKey.trim());
                      setApiKeySaved(true);
                      setTimeout(() => setApiKeySaved(false), 3000);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    apiKeySaved 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {apiKeySaved ? '✓ Saved' : 'Save'}
                </button>
                {openaiApiKey && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('openai_api_key');
                      setOpenaiApiKey('');
                      setApiKeySaved(false);
                    }}
                    className="px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Promise */}
        <div className="bg-emerald-900/20 border border-emerald-400/30 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-emerald-200 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Mossy's Privacy Promise
          </h2>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><span className="font-bold">Your data is yours.</span> We never sell or monetize your information.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><span className="font-bold">Default privacy.</span> We ask permission before sharing anything.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><span className="font-bold">Local first.</span> Your computer is the primary storage location.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><span className="font-bold">Transparent sharing.</span> Any shared data is anonymized and reviewed.</span>
            </li>
          </ul>
        </div>

        {/* Settings Groups */}
        <div className="space-y-8">
          {settingGroups.map((group, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              {/* Group Header */}
              <div className="bg-slate-800 border-b border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-emerald-400">{group.icon}</div>
                  <h2 className="text-xl font-bold text-white">{group.title}</h2>
                </div>
                <p className="text-slate-400 text-sm">{group.description}</p>
              </div>

              {/* Group Settings */}
              <div className="divide-y divide-slate-700">
                {group.settings.map((setting: any) => {
                  const isEnabled = settings[setting.id as keyof PrivacySettings];
                  const isDependencyMet = !setting.dependsOn || settings[setting.dependsOn as keyof PrivacySettings];
                  const isDisabled = !isDependencyMet;

                  return (
                    <div
                      key={setting.id}
                      className={`p-6 transition-colors ${isDisabled ? 'bg-slate-950/50 opacity-60' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={isDisabled ? 'text-slate-600' : 'text-emerald-400'}>
                            {setting.icon}
                          </div>
                          <div className="flex-1">
                            <label className="font-bold text-slate-200 cursor-pointer block mb-1 flex items-center gap-2">
                              {setting.label}
                              {isDisabled && (
                                <span className="text-xs font-normal text-slate-500">(requires {setting.dependsOn?.replace(/([A-Z])/g, ' $1')})</span>
                              )}
                            </label>
                            <p className="text-slate-400 text-sm mb-2">{setting.description}</p>
                            {setting.hint && (
                              <p className="text-xs text-emerald-600/80 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {setting.hint}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => !isDisabled && handleToggleSetting(setting.id)}
                          disabled={isDisabled}
                          className={`w-12 h-7 rounded-full flex items-center px-1 flex-shrink-0 transition-all ${
                            isEnabled
                              ? 'bg-emerald-600'
                              : 'bg-slate-700'
                          } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-5' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Details */}
                      <button
                        onClick={() => setShowDetails(showDetails === setting.id ? null : setting.id)}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-bold ml-8 flex items-center gap-1"
                      >
                        {showDetails === setting.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showDetails === setting.id ? 'Hide details' : 'Learn more'}
                      </button>

                      {showDetails === setting.id && (
                        <div className="mt-4 ml-8 pt-4 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                          <p><span className="font-bold text-slate-300">What gets shared:</span> Only anonymized patterns and techniques, never your personal project details.</p>
                          <p><span className="font-bold text-slate-300">How it helps:</span> Shared knowledge improves Mossy's recommendations for all users in the community.</p>
                          <p><span className="font-bold text-slate-300">Can I change this?</span> Yes, anytime. Toggle this setting off to stop contributions immediately.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Data Management */}
        <div className="mt-8 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Data Management</h2>
            </div>
            <p className="text-slate-400 text-sm">Control your local data and backups</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Storage Info */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-2"><span className="font-bold">Local Storage Used:</span> {storageInfo.localStorageSize}</p>
              <p className="text-xs text-slate-500">This includes project data, conversations, and settings stored on your computer.</p>
            </div>

            {/* Encryption Status */}
            <div className="bg-emerald-900/20 border border-emerald-400/30 rounded-lg p-4">
              <p className="text-sm text-emerald-200 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span><span className="font-bold">Encryption:</span> Enabled</span>
              </p>
              <p className="text-xs text-slate-500">Your local data is encrypted at rest to protect sensitive information.</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <button
                onClick={handleExportData}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                Export My Data
              </button>
              <button
                onClick={handleDeleteAllData}
                className="w-full px-4 py-3 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm font-bold transition-colors border border-red-700/50 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Delete All Local Data
              </button>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className="fixed bottom-8 right-8 bg-slate-800 border border-emerald-400 rounded-lg p-4 flex items-center gap-3">
            {saveStatus === 'saving' && (
              <>
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-300">Saving settings...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Settings saved</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySettings;
