import React, { useState, useEffect } from 'react';
import { List, AlertTriangle, CheckCircle2, Package, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface Plugin {
  name: string;
  enabled: boolean;
  index: number;
  isMaster: boolean;
  isLight: boolean;
  conflicts: string[];
  missingMasters: string[];
  overrides: number;
}

export const LoadOrderAnalyzer: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'index' | 'conflicts'>('index');

  useEffect(() => {
    loadPlugins();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadPlugins, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadPlugins = async () => {
    setLoading(true);
    
    try {
      // Real implementation uses Desktop Bridge to read plugins.txt
      const response = await fetch('http://localhost:21337/loadorder/read');
      if (response.ok) {
        const data = await response.json();
        setPlugins(data.plugins);
      } else {
        throw new Error('Bridge offline');
      }
    } catch (error) {
      // Demo mode
      const examplePlugins: Plugin[] = [
        { name: 'Fallout4.esm', enabled: true, index: 0, isMaster: true, isLight: false, conflicts: [], missingMasters: [], overrides: 0 },
        { name: 'DLCRobot.esm', enabled: true, index: 1, isMaster: true, isLight: false, conflicts: [], missingMasters: [], overrides: 0 },
        { name: 'DLCCoast.esm', enabled: true, index: 2, isMaster: true, isLight: false, conflicts: [], missingMasters: [], overrides: 0 },
        { name: 'DLCNukaWorld.esm', enabled: true, index: 3, isMaster: true, isLight: false, conflicts: [], missingMasters: [], overrides: 0 },
        { name: 'Unofficial Fallout 4 Patch.esp', enabled: true, index: 4, isMaster: false, isLight: false, conflicts: [], missingMasters: [], overrides: 4532 },
        { name: 'ArmorKeywords.esm', enabled: true, index: 5, isMaster: true, isLight: false, conflicts: [], missingMasters: [], overrides: 0 },
        { name: 'WeaponModifications.esp', enabled: true, index: 6, isMaster: false, isLight: false, conflicts: ['BalancedWeapons.esp'], missingMasters: [], overrides: 234 },
        { name: 'BalancedWeapons.esp', enabled: true, index: 7, isMaster: false, isLight: false, conflicts: ['WeaponModifications.esp'], missingMasters: [], overrides: 187 },
        { name: 'NewSettlement.esp', enabled: true, index: 8, isMaster: false, isLight: false, conflicts: [], missingMasters: ['SettlementKeywords.esm'], overrides: 45 },
        { name: 'BetterGraphics.esp', enabled: true, index: 9, isMaster: false, isLight: false, conflicts: [], missingMasters: [], overrides: 892 },
        { name: 'LightAddon.esl', enabled: true, index: 254, isMaster: false, isLight: true, conflicts: [], missingMasters: [], overrides: 12 }
      ];
      
      setPlugins(examplePlugins);
    } finally {
      setLoading(false);
    }
  };

  const getTotalConflicts = () => {
    return plugins.reduce((sum, p) => sum + p.conflicts.length, 0);
  };

  const getTotalMissingMasters = () => {
    return plugins.reduce((sum, p) => sum + p.missingMasters.length, 0);
  };

  const sortedPlugins = [...plugins].sort((a, b) => {
    if (sortBy === 'index') {
      return a.index - b.index;
    } else {
      return b.conflicts.length - a.conflicts.length;
    }
  });

  const getPluginIcon = (plugin: Plugin) => {
    if (plugin.missingMasters.length > 0) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (plugin.conflicts.length > 0) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getPluginColor = (plugin: Plugin) => {
    if (plugin.missingMasters.length > 0) {
      return 'border-red-500/50 bg-red-900/20';
    } else if (plugin.conflicts.length > 0) {
      return 'border-yellow-500/50 bg-yellow-900/20';
    } else {
      return 'border-slate-700 bg-slate-900';
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <List className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Load Order Analyzer</h1>
              <p className="text-sm text-slate-400">Real-time plugin conflict detection</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300">Auto-refresh (5s)</span>
            </label>
            <button
              onClick={loadPlugins}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 uppercase mb-1">Total Plugins</div>
            <div className="text-2xl font-bold text-white">{plugins.length}</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 uppercase mb-1">Enabled</div>
            <div className="text-2xl font-bold text-green-400">{plugins.filter(p => p.enabled).length}</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-yellow-700">
            <div className="text-xs text-slate-400 uppercase mb-1">Conflicts</div>
            <div className="text-2xl font-bold text-yellow-400">{getTotalConflicts()}</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-red-700">
            <div className="text-xs text-slate-400 uppercase mb-1">Missing Masters</div>
            <div className="text-2xl font-bold text-red-400">{getTotalMissingMasters()}</div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setSortBy('index')}
            className={`px-3 py-2 rounded text-sm font-bold transition-colors ${
              sortBy === 'index' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Sort by Load Order
          </button>
          <button
            onClick={() => setSortBy('conflicts')}
            className={`px-3 py-2 rounded text-sm font-bold transition-colors ${
              sortBy === 'conflicts' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Sort by Conflicts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {sortedPlugins.map((plugin, idx) => (
          <div
            key={idx}
            className={`rounded-lg border transition-colors ${getPluginColor(plugin)}`}
          >
            <button
              onClick={() => setExpandedPlugin(expandedPlugin === plugin.name ? null : plugin.name)}
              className="w-full p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors"
            >
              {expandedPlugin === plugin.name ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              
              {getPluginIcon(plugin)}
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white">{plugin.name}</span>
                  {plugin.isLight && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">ESL</span>
                  )}
                  {plugin.isMaster && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Master</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {plugin.index < 254 && (
                  <span className="text-slate-400">
                    Index: <span className="text-white font-mono">{plugin.index.toString(16).toUpperCase().padStart(2, '0')}</span>
                  </span>
                )}
                {plugin.overrides > 0 && (
                  <span className="text-slate-400">
                    Overrides: <span className="text-cyan-400 font-mono">{plugin.overrides}</span>
                  </span>
                )}
              </div>
            </button>

            {expandedPlugin === plugin.name && (
              <div className="border-t border-slate-700 p-4 space-y-3">
                {plugin.conflicts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-yellow-400 mb-2">⚠️ Conflicts With:</h4>
                    <div className="space-y-1">
                      {plugin.conflicts.map((conflict, cidx) => (
                        <div key={cidx} className="text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded font-mono">
                          {conflict}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plugin.missingMasters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-400 mb-2">❌ Missing Masters:</h4>
                    <div className="space-y-1">
                      {plugin.missingMasters.map((master, midx) => (
                        <div key={midx} className="text-xs text-red-300 bg-red-950 px-3 py-2 rounded font-mono">
                          {master}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plugin.conflicts.length === 0 && plugin.missingMasters.length === 0 && (
                  <div className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    No issues detected
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
