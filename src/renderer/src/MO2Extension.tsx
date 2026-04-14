import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, List, Play, RefreshCw, AlertTriangle, CheckCircle2, Folder, Settings, FileText, Download } from 'lucide-react';

interface MO2Mod {
  name: string;
  enabled: boolean;
  priority: number;
  category?: string;
  version?: string;
  hasConflicts?: boolean;
}

interface MO2Profile {
  name: string;
  path: string;
  isActive: boolean;
}

/** Decode a file result that may be a plain string or a { success, data: base64 } object. */
function decodeFileResult(result: any): string | null {
  if (typeof result === 'string') return result;
  if (result?.success && typeof result?.data === 'string') {
    try {
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch { return null; }
  }
  return null;
}

export const MO2Extension: React.FC = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [mo2Path, setMo2Path] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<MO2Profile | null>(null);
  const [mods, setMods] = useState<MO2Mod[]>([]);
  const [loadOrder, setLoadOrder] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Check if MO2 is running via Neural Link (live indicator only)
  useEffect(() => {
    const checkMO2Running = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const mo2Running = data.tools?.some((t: any) =>
            t.name.toLowerCase().includes('modorganizer') ||
            t.name.toLowerCase().includes('mo2')
          );
          if (mo2Running) setIsConnected(true);
        }
      } catch { /* ignore */ }
    };
    checkMO2Running();
    const interval = setInterval(checkMO2Running, 5000);
    return () => clearInterval(interval);
  }, []);

  /** Read the active MO2 profile's modlist.txt and plugins.txt from disk. */
  const loadMO2Config = useCallback(async () => {
    setIsScanning(true);
    setStatusMsg('');
    try {
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;

      // Resolve MO2 path: prefer settings, then try common locations
      const settings = await bridge?.getSettings?.().catch(() => null);
      let foundPath: string = settings?.mo2Path || '';

      if (!foundPath && bridge?.readFile) {
        const candidates = [
          'C:\\Modding\\MO2',
          'C:\\Program Files\\Mod Organizer 2',
          'C:\\Games\\Mod Organizer 2',
          'D:\\Modding\\MO2',
          'C:\\MO2',
        ];
        for (const p of candidates) {
          try {
            await bridge.readFile(`${p}\\ModOrganizer.ini`);
            foundPath = p;
            break;
          } catch { /* try next */ }
        }
      }

      if (!foundPath) {
        setStatusMsg('MO2 path not configured. Set it in Settings → External Tools to load your mod list.');
        setIsScanning(false);
        return;
      }

      setMo2Path(foundPath);

      // Read ModOrganizer.ini to find the selected profile name.
      // MO2 stores the active profile in two possible formats:
      //   selected_profile=@ByteArray(ProfileName)   ← Qt serialised format (common)
      //   selected_profile=ProfileName               ← plain text (older installs)
      let profileName = 'Default';
      try {
        const iniText = decodeFileResult(await bridge.readFile(`${foundPath}\\ModOrganizer.ini`));
        if (iniText) {
          // @ByteArray(ProfileName) format
          const byteArr = iniText.match(/selected_profile\s*=\s*@ByteArray\(([^)]+)\)/);
          if (byteArr) {
            profileName = byteArr[1];
          } else {
            // Plain format: selected_profile=ProfileName
            const plain = iniText.match(/selected_profile\s*=\s*(.+)/);
            if (plain) profileName = plain[1].trim();
          }
        }
      } catch { /* default to 'Default' */ }

      const profilePath = `${foundPath}\\profiles\\${profileName}`;
      setActiveProfile({ name: profileName, path: profilePath, isActive: true });

      // Read modlist.txt — format: +ModName (enabled) / -ModName (disabled)
      const parsedMods: MO2Mod[] = [];
      try {
        const modlistText = decodeFileResult(await bridge.readFile(`${profilePath}\\modlist.txt`));
        if (modlistText) {
          modlistText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#') && (l.startsWith('+') || l.startsWith('-')))
            .forEach((line: string, i: number) => {
              const enabled = line.startsWith('+');
              const name = line.slice(1).trim();
              if (name) parsedMods.push({ name, enabled, priority: i + 1 });
            });
          setMods(parsedMods);
        }
      } catch {
        setStatusMsg(`Could not read modlist.txt from profile: ${profileName}`);
      }

      // Read plugins.txt — MO2 format: *Plugin.esp (enabled) / Plugin.esp (disabled)
      const parsedPlugins: string[] = [];
      try {
        const pluginsText = decodeFileResult(await bridge.readFile(`${profilePath}\\plugins.txt`));
        if (pluginsText) {
          pluginsText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#'))
            .forEach((line: string) => {
              const plugin = line.startsWith('*') ? line.slice(1) : line;
              if (/\.(esp|esm|esl)$/i.test(plugin)) parsedPlugins.push(plugin);
            });
          setLoadOrder(parsedPlugins);
        }
      } catch { /* plugins.txt not critical */ }

      // Conflict detection heuristic: flag mods whose name prefix appears in more
      // than one plugin filename. This is intentionally simple — a false positive is
      // harmless (shows a warning triangle), while a false negative would miss a real
      // conflict. A full FormID-level conflict check requires xEdit/xDI tooling.
      const pluginLower = parsedPlugins.map((p) => p.toLowerCase());
      const updatedMods = parsedMods.map((mod) => {
        const words = mod.name.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
        const matchingPlugins = pluginLower.filter((p) => p.includes(words) || words.includes(p.replace(/\.(esp|esm|esl)$/i, '')));
        return { ...mod, hasConflicts: matchingPlugins.length > 1 };
      });
      setMods(updatedMods);
      setIsConnected(true);
    } catch (error) {
      console.error('Error loading MO2 config:', error);
      setStatusMsg('Failed to read MO2 configuration. Verify the MO2 path in Settings → External Tools.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { void loadMO2Config(); }, [loadMO2Config]);

  const launchGame = async () => {
    const bridge: any = (window as any).electron?.api;
    setStatusMsg('');
    try {
      const rawTools = localStorage.getItem('mossy_active_tools');
      if (rawTools) {
        let data: any;
        try { data = JSON.parse(rawTools); } catch { data = null; }
        const mo2Tool = data?.tools?.find((t: any) =>
          t.name.toLowerCase().includes('modorganizer') ||
          t.name.toLowerCase().includes('mo2')
        );
        if (mo2Tool?.path && bridge?.openProgram) {
          const result = await bridge.openProgram(mo2Tool.path);
          if (result?.success) {
            setStatusMsg('MO2 brought to focus – use its Launch button to start the game.');
            return;
          }
        }
      }
      setStatusMsg('MO2 is running – use its Launch button to start your game.');
    } catch {
      setStatusMsg('Could not focus MO2. Use MO2 directly to launch the game.');
    }
  };

  const exportModList = async () => {
    const bridge: any = (window as any).electron?.api;
    if (!bridge?.saveFile) {
      setStatusMsg('Export is not available in this environment.');
      return;
    }
    const lines = [
      `# MO2 Mod List – Profile: ${activeProfile?.name ?? 'Unknown'}`,
      `# Exported: ${new Date().toLocaleString()}`,
      `# MO2 Path: ${mo2Path}`,
      '',
      ...mods.map((m) =>
        `${m.enabled ? '[+]' : '[-]'} ${m.name}${m.version ? ` v${m.version}` : ''}${m.category ? ` (${m.category})` : ''}`
      ),
      '',
      '# Load Order (plugins.txt)',
      ...loadOrder.map((p, i) => `${String(i + 1).padStart(3, '0')} ${p}`),
    ];
    try {
      const savedTo = await bridge.saveFile(lines.join('\n'), 'mo2-mod-list.txt');
      if (savedTo) setStatusMsg(`Mod list exported to: ${savedTo}`);
    } catch {
      setStatusMsg('Export failed.');
    }
  };

  const filteredMods = mods.filter((mod) => {
    if (filterEnabled !== null && mod.enabled !== filterEnabled) return false;
    if (searchQuery && !mod.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const enabledCount = mods.filter((m) => m.enabled).length;
  const totalCount = mods.length;
  const conflictCount = mods.filter((m) => m.hasConflicts).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Package className="w-8 h-8 text-purple-400" />
                Mod Organizer 2 Extension
              </h1>
              <p className="text-slate-300 mt-2">
                Manage your MO2 profiles, mods, and load order
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'MO2 Detected' : 'MO2 Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-purple-900/20 border border-purple-500/30 text-purple-100 hover:bg-purple-900/30 transition-colors"
              >
                Help
              </Link>
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-300 mb-2">MO2 Not Detected</h3>
                  {statusMsg ? (
                    <p className="text-sm text-slate-300 mb-4">{statusMsg}</p>
                  ) : (
                    <p className="text-sm text-slate-300 mb-4">
                      Set your MO2 path in <strong>Settings → External Tools</strong>, then click Refresh. The extension reads your real modlist.txt and plugins.txt directly from your MO2 profile folder.
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void loadMO2Config()}
                      disabled={isScanning}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                      {isScanning ? 'Scanning…' : 'Retry'}
                    </button>
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Open Settings
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mt-3">
                    <p>Supported versions: MO2 2.4.0+</p>
                    <p>Reads: ModOrganizer.ini → modlist.txt + plugins.txt from active profile</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Profile */}
          {isConnected && activeProfile && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Folder className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Active Profile</h3>
                    <p className="text-sm text-slate-400">{activeProfile.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => void loadMO2Config()}
                  disabled={isScanning}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{enabledCount}/{totalCount}</div>
                  <div className="text-sm text-slate-400">Active Mods</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{loadOrder.length}</div>
                  <div className="text-sm text-slate-400">Plugins</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-400">{conflictCount}</div>
                  <div className="text-sm text-slate-400">Conflicts</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              {statusMsg && (
                <div className="mb-4 px-4 py-2 bg-slate-900/70 border border-slate-600/50 rounded-lg text-sm text-slate-300">
                  {statusMsg}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={launchGame}
                  className="px-4 py-3 bg-green-900/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Play className="w-4 h-4" />
                  Launch Game
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
                <button
                  onClick={() => navigate('/diagnostics')}
                  className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4" />
                  View Logs
                </button>
                <button
                  onClick={exportModList}
                  className="px-4 py-3 bg-amber-900/20 border border-amber-500/30 text-amber-300 rounded-lg hover:bg-amber-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Download className="w-4 h-4" />
                  Export List
                </button>
              </div>
            </div>
          )}

          {/* Mod List */}
          {isConnected && mods.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Mod List</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search mods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                  />
                  <select
                    value={filterEnabled === null ? 'all' : filterEnabled ? 'enabled' : 'disabled'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterEnabled(val === 'all' ? null : val === 'enabled');
                    }}
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    <option value="all">All Mods</option>
                    <option value="enabled">Enabled Only</option>
                    <option value="disabled">Disabled Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {filteredMods.map((mod, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border transition-colors ${
                      mod.enabled
                        ? 'bg-slate-900/50 border-slate-700/50 hover:border-purple-500/30'
                        : 'bg-slate-900/30 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${
                          mod.enabled ? 'bg-green-400' : 'bg-slate-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{mod.name}</span>
                            {mod.version && (
                              <span className="text-xs text-slate-400">v{mod.version}</span>
                            )}
                            {mod.hasConflicts && (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">Priority: {mod.priority}</span>
                            {mod.category && (
                              <span className="text-xs px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded">
                                {mod.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {mod.enabled ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-600 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load Order */}
          {isConnected && loadOrder.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <List className="w-5 h-5 text-purple-400" />
                Load Order
              </h3>
              <div className="space-y-1">
                {loadOrder.map((plugin, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center gap-3"
                  >
                    <span className="text-xs font-mono text-slate-500 w-8">{index + 1}</span>
                    <span className="text-sm text-white">{plugin}</span>
                    {plugin.endsWith('.esm') && (
                      <span className="ml-auto text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                        Master
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 MO2 Extension Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• View active profile and mod list</li>
              <li>• Monitor load order in real-time</li>
              <li>• Detect mod conflicts and issues</li>
              <li>• Quick launch games through MO2</li>
              <li>• Export mod lists for sharing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
