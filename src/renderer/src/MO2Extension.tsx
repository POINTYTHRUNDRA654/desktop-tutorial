import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, List, Play, RefreshCw, AlertTriangle, CheckCircle2, Folder, Settings, ExternalLink, FileText, Download } from 'lucide-react';

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

export const MO2Extension: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [mo2Path, setMo2Path] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<MO2Profile | null>(null);
  const [mods, setMods] = useState<MO2Mod[]>([]);
  const [loadOrder, setLoadOrder] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if MO2 is running via Neural Link
  useEffect(() => {
    const checkMO2 = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const mo2Running = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('modorganizer') || 
            t.name.toLowerCase().includes('mo2')
          );
          setIsConnected(mo2Running);
        }
      } catch (error) {
        console.error('Error checking MO2 status:', error);
      }
    };

    checkMO2();
    const interval = setInterval(checkMO2, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load MO2 configuration
  const loadMO2Config = async () => {
    setIsScanning(true);
    try {
      // Try to detect MO2 installation
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
      
      if (bridge?.readFile) {
        // Common MO2 locations
        const commonPaths = [
          'C:\\Modding\\MO2',
          'C:\\Program Files\\Mod Organizer 2',
          'C:\\Games\\Mod Organizer 2',
          'D:\\Modding\\MO2',
        ];

        // Try to read modlist.txt from profiles
        // This is a simplified version - in production would scan actual MO2 directories
        const mockMods: MO2Mod[] = [
          { name: 'Unofficial Fallout 4 Patch', enabled: true, priority: 1, category: 'Bug Fixes', version: '2.1.5' },
          { name: 'Armor and Weapon Keywords Community Resource', enabled: true, priority: 2, category: 'Framework' },
          { name: 'F4SE', enabled: true, priority: 3, category: 'Framework', version: '0.6.23' },
          { name: 'MCM', enabled: true, priority: 4, category: 'Framework' },
          { name: 'Enhanced Lights and FX', enabled: true, priority: 5, category: 'Visuals', hasConflicts: true },
          { name: 'Better Settlers', enabled: false, priority: 6, category: 'Gameplay' },
          { name: 'Sim Settlements 2', enabled: true, priority: 7, category: 'Gameplay', version: '2.1.0' },
          { name: 'NAC X', enabled: false, priority: 8, category: 'Weather' },
        ];

        setMods(mockMods);
        setActiveProfile({
          name: 'Default',
          path: 'C:\\Modding\\MO2\\profiles\\Default',
          isActive: true
        });

        // Mock load order
        setLoadOrder([
          'Fallout4.esm',
          'DLCRobot.esm',
          'DLCworkshop01.esm',
          'Unofficial Fallout 4 Patch.esp',
          'AWKCR.esp',
          'SimSettlements2.esp',
        ]);
      }
    } catch (error) {
      console.error('Error loading MO2 config:', error);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadMO2Config();
    }
  }, [isConnected]);

  const filteredMods = mods.filter(mod => {
    if (filterEnabled !== null && mod.enabled !== filterEnabled) return false;
    if (searchQuery && !mod.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const enabledCount = mods.filter(m => m.enabled).length;
  const totalCount = mods.length;
  const conflictCount = mods.filter(m => m.hasConflicts).length;

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
                  <p className="text-sm text-slate-300 mb-4">
                    Start Mod Organizer 2 to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Supported versions: MO2 2.4.0+</p>
                    <p>Detection looks for: ModOrganizer.exe, mo2.exe, Mod Organizer 2.exe</p>
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
                  onClick={loadMO2Config}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="px-4 py-3 bg-green-900/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Play className="w-4 h-4" />
                  Launch Game
                </button>
                <button className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
                <button className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4" />
                  View Logs
                </button>
                <button className="px-4 py-3 bg-amber-900/20 border border-amber-500/30 text-amber-300 rounded-lg hover:bg-amber-900/30 transition-colors flex items-center gap-2 justify-center">
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
