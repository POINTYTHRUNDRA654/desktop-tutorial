import React, { useState } from 'react';
import { Shield, AlertTriangle, Activity, Play, Square, Brain, FolderOpen, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

const CKCrashPrevention: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'preflight' | 'monitoring' | 'postcrash'>('preflight');
  const [selectedPlugin, setSelectedPlugin] = useState<string>('');
  const [spriggitOpen, setSpriggitOpen] = useState(false);
  const [spriggitCliPath, setSpriggitCliPath] = useState('');
  const [spriggitDataPath, setSpriggitDataPath] = useState('');

  // File picker handlers
  const pickSpriggitCli = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.ckPickPlugin) {
      alert('File picker not available');
      return;
    }
    try {
      const result = await api.ckPickPlugin();
      if (result.success && result.path) setSpriggitCliPath(result.path);
    } catch (error) {
      console.error('File picker error:', error);
    }
  };

  const pickSpriggitDataFolder = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.pickDirectory) {
      alert('Folder picker not available');
      return;
    }
    try {
      const result = await api.pickDirectory('Select Fallout 4 Data Folder');
      if (result) setSpriggitDataPath(result);
    } catch (error) {
      console.error('Folder picker error:', error);
    }
  };

  const pickPlugin = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.ckPickPlugin) {
      alert('File picker not available');
      return;
    }
    try {
      const result = await api.ckPickPlugin();
      if (result.success && result.path) setSelectedPlugin(result.path);
    } catch (error) {
      console.error('File picker error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-mossy-darker text-mossy-text">
      {/* Header */}
      <div className="border-b border-mossy-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-mossy-accent" />
            <div>
              <h1 className="text-xl font-bold">Creation Kit Crash Prevention</h1>
              <p className="text-sm text-mossy-text-muted">Validate plugins and monitor CK stability</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-2 transition-colors hover:bg-mossy-border"
              title="Close"
            >
              <Square className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-mossy-border p-4">
        <div className="flex gap-2">
          {(['preflight', 'monitoring', 'postcrash'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded border px-4 py-2 transition-colors ${activeTab === tab
                ? 'border-mossy-accent bg-mossy-accent/10 text-white'
                : 'border-mossy-border text-mossy-text-muted hover:text-mossy-text'
                }`}
            >
              {tab === 'preflight' && 'Pre-flight Checks'}
              {tab === 'monitoring' && 'Live Monitor'}
              {tab === 'postcrash' && 'Post-Crash Analysis'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'preflight' && (
          <div className="space-y-4">
            <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
              <h2 className="font-semibold text-white">Select Plugin to Validate</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedPlugin}
                  onChange={(e) => setSelectedPlugin(e.target.value)}
                  placeholder="Plugin path (drag & drop or paste)..."
                  className="flex-1 rounded border border-mossy-border bg-mossy-darker px-3 py-2 text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent"
                />
                <button
                  onClick={pickPlugin}
                  title="Browse for plugin file"
                  className="rounded border border-mossy-border bg-mossy-accent px-3 py-2 text-black font-semibold hover:bg-mossy-accent-hover transition-colors flex items-center gap-1"
                >
                  <FolderOpen className="w-4 h-4" /> Load
                </button>
              </div>
              <button className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-500">
                Validate Plugin
              </button>
            </div>

            <div className="rounded border border-mossy-border bg-mossy-bg">
              <button
                onClick={() => setSpriggitOpen(!spriggitOpen)}
                className="w-full border-b border-mossy-border px-4 py-3 text-left transition-colors hover:bg-mossy-darker"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-emerald-300">Spriggit Vanilla ESM Digest</div>
                      <div className="text-xs text-mossy-text-muted">Convert ESMs to Knowledge Vault</div>
                    </div>
                  </div>
                  {spriggitOpen ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </div>
              </button>

              {spriggitOpen && (
                <div className="space-y-3 border-t border-mossy-border p-4">
                  <p className="text-xs text-mossy-text-muted">
                    Convert vanilla ESMs to YAML using Spriggit.CLI.exe
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-mossy-text-muted">
                        Spriggit.CLI.exe
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spriggitCliPath}
                          onChange={(e) => setSpriggitCliPath(e.target.value)}
                          placeholder="Paste path or use Load button..."
                          className="flex-1 rounded border border-mossy-border bg-mossy-darker px-2 py-1.5 text-xs text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent"
                        />
                        <button
                          onClick={pickSpriggitCli}
                          title="Browse for Spriggit.CLI.exe"
                          className="rounded border border-mossy-border bg-mossy-accent px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-mossy-accent-hover flex items-center gap-1"
                        >
                          <FolderOpen className="h-3.5 w-3.5" /> Load
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-mossy-text-muted">
                        Fallout 4 Data Folder
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spriggitDataPath}
                          onChange={(e) => setSpriggitDataPath(e.target.value)}
                          placeholder="Paste path or use Load button..."
                          className="flex-1 rounded border border-mossy-border bg-mossy-darker px-2 py-1.5 text-xs text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent"
                        />
                        <button
                          onClick={pickSpriggitDataFolder}
                          title="Browse for Fallout 4 Data folder"
                          className="rounded border border-mossy-border bg-mossy-accent px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-mossy-accent-hover flex items-center gap-1"
                        >
                          <FolderOpen className="h-3.5 w-3.5" /> Load
                        </button>
                      </div>
                    </div>

                    <button className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500">
                      <Brain className="h-4 w-4" />
                      Convert & Digest
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
            <h2 className="font-semibold text-white">Live Monitor</h2>
            <p className="text-sm text-mossy-text-muted">Monitor Creation Kit in real-time.</p>
            <button className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500">
              <Play className="h-4 w-4" />
              Start
            </button>
          </div>
        )}

        {activeTab === 'postcrash' && (
          <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
            <h2 className="font-semibold text-white">Crash Analysis</h2>
            <p className="text-sm text-mossy-text-muted">Analyze crash logs.</p>
            <button className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-500">
              <AlertTriangle className="h-4 w-4" />
              Load
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-mossy-border bg-mossy-bg p-4">
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-500">
            <Shield className="h-4 w-4" />
            Validate
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-500">
            <Activity className="h-4 w-4" />
            Monitor
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-3 font-semibold text-red-400 transition-colors hover:bg-red-500/30">
            <AlertTriangle className="h-4 w-4" />
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
};

export default CKCrashPrevention;
