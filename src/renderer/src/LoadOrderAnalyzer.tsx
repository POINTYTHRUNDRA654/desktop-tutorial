/**
 * LoadOrderAnalyzer
 * Real MO2 profile integration — no localhost bridge dependency.
 * Reads plugins.txt via the Electron bridge and reports stats,
 * type breakdowns, and any issues it can detect from the file alone.
 */

import React, { useState, useCallback } from 'react';
import {
  List, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, RefreshCw, FolderOpen,
  Search, Filter,
} from 'lucide-react';
import { parseMo2PluginsTxt } from './loadOrder/parsers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plugin {
  name: string;
  enabled: boolean;
  index: number;
  isMaster: boolean;
  isLight: boolean;
  isESLFlagged: boolean; // ESP with ESL header flag (ESP-FE)
  conflicts: string[];
  missingMasters: string[];
  overrides: number;
}

type SortMode = 'index' | 'conflicts' | 'name';
type TypeFilter = 'all' | 'esm' | 'esp' | 'esl';

type LoadOrderAnalyzerProps = {
  embedded?: boolean;
};

const getBridge = () => (window as any).electron?.api ?? (window as any).electronAPI;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isEsm = (name: string) => name.toLowerCase().endsWith('.esm');
const isEsl = (name: string) => name.toLowerCase().endsWith('.esl');
const isEsp = (name: string) => name.toLowerCase().endsWith('.esp');

/**
 * Build a Plugin list from parsed MO2 plugins.txt entries.
 * We can derive type and relative ordering from the file; conflict
 * detection requires xEdit and is left empty (shown as clean).
 */
function buildPluginList(raw: { name: string; enabled: boolean }[]): Plugin[] {
  let espIdx = 0;
  let eslIdx = 0;
  return raw.map((entry) => {
    const master = isEsm(entry.name);
    const light = isEsl(entry.name);
    const index = light
      ? 0xFE000 + eslIdx++   // ESL indices are in FE000–FEFFF range
      : espIdx++;

    return {
      name: entry.name,
      enabled: entry.enabled,
      index,
      isMaster: master,
      isLight: light,
      isESLFlagged: false, // Can't detect from plugins.txt alone
      conflicts: [],
      missingMasters: [],
      overrides: 0,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export const LoadOrderAnalyzer: React.FC<LoadOrderAnalyzerProps> = ({ embedded = false }) => {
  const api = getBridge();

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [profileDir, setProfileDir] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('index');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadFromProfile = useCallback(async (dir?: string) => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const targetDir = dir || profileDir;
      if (!targetDir) {
        setError('No MO2 profile directory selected.');
        return;
      }
      const readFile = api?.readFile;
      if (!readFile) {
        setError('File reading is not available in this build.');
        return;
      }
      const pluginsPath = targetDir.replace(/[\\/]+$/, '') + '\\plugins.txt';
      const raw = await readFile(pluginsPath);
      if (!raw) {
        setError(`Could not read plugins.txt at:\n${pluginsPath}\n\nMake sure you selected the correct MO2 profile folder (e.g. ...\\Mod Organizer 2\\profiles\\Default).`);
        return;
      }
      const parsed = parseMo2PluginsTxt(String(raw));
      const built = buildPluginList(parsed);
      setPlugins(built);
      setStatus(`Loaded ${built.filter(p => p.enabled).length} active / ${built.length} total plugins from MO2 profile.`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [api, profileDir]);

  const pickProfile = async () => {
    setError('');
    setStatus('');
    if (!api?.pickMo2ProfileDir) {
      setError('Profile folder picker is not available in this build.');
      return;
    }
    try {
      const dir = await api.pickMo2ProfileDir();
      if (!dir) return;
      setProfileDir(dir);
      await loadFromProfile(dir);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalConflicts = plugins.reduce((s, p) => s + p.conflicts.length, 0);
  const totalMissing = plugins.reduce((s, p) => s + p.missingMasters.length, 0);
  const enabledCount = plugins.filter(p => p.enabled).length;
  const masterCount = plugins.filter(p => p.isMaster && p.enabled).length;
  const lightCount = plugins.filter(p => p.isLight && p.enabled).length;
  const espCount = plugins.filter(p => !p.isMaster && !p.isLight && p.enabled).length;

  // Warn when approaching the 255 ESP limit
  const espLimitWarning = espCount >= 240;

  const filteredAndSorted = [...plugins]
    .filter(p => {
      // Type filter
      if (typeFilter === 'esm' && !p.isMaster) return false;
      if (typeFilter === 'esl' && !p.isLight) return false;
      if (typeFilter === 'esp' && (p.isMaster || p.isLight)) return false;
      // Search
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'index') return a.index - b.index;
      if (sortBy === 'conflicts') return b.conflicts.length - a.conflicts.length;
      return a.name.localeCompare(b.name);
    });

  const getStatusIcon = (plugin: Plugin) => {
    if (plugin.missingMasters.length > 0)
      return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    if (plugin.conflicts.length > 0)
      return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  };

  const getRowClass = (plugin: Plugin) => {
    if (!plugin.enabled) return 'border-slate-800/60 bg-slate-950/30 opacity-50';
    if (plugin.missingMasters.length > 0) return 'border-red-500/40 bg-red-900/10';
    if (plugin.conflicts.length > 0) return 'border-yellow-500/40 bg-yellow-900/10';
    return 'border-slate-700/60 bg-slate-900/40';
  };

  const pluginTypeLabel = (plugin: Plugin) => {
    if (plugin.isMaster) return 'ESM';
    if (plugin.isLight) return 'ESL';
    return 'ESP';
  };

  const pluginTypeBadge = (plugin: Plugin) => {
    if (plugin.isMaster)
      return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-900/40 text-blue-300 border border-blue-700/40">ESM</span>;
    if (plugin.isLight)
      return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-900/40 text-cyan-300 border border-cyan-700/40">ESL</span>;
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">ESP</span>;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'h-full'}`}>
      {/* Controls — always visible */}
      <div className={`rounded-lg border border-slate-700/60 bg-slate-900/50 p-4 ${embedded ? '' : 'flex-shrink-0'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <List className="w-4 h-4 text-emerald-300" />
              Load Order Analyzer
            </div>
            {profileDir && (
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate max-w-xs">{profileDir}</div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profileDir && (
              <button onClick={() => void loadFromProfile()} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            <button onClick={() => void pickProfile()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs transition-colors">
              <FolderOpen className="w-3.5 h-3.5" />
              {profileDir ? 'Change Profile' : 'Pick MO2 Profile'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded border border-red-500/40 bg-red-900/20 px-3 py-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}
        {status && !error && (
          <div className="mt-3 flex items-center gap-2 rounded border border-emerald-600/30 bg-emerald-900/10 px-3 py-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {status}
          </div>
        )}
      </div>

      {/* Stats — shown when plugins are loaded */}
      {plugins.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Plugins', value: plugins.length, color: 'text-white', border: 'border-slate-700' },
              { label: 'Active ESPs', value: espCount, color: espLimitWarning ? 'text-red-400' : 'text-emerald-400', border: espLimitWarning ? 'border-red-700' : 'border-slate-700' },
              { label: 'ESL / Light', value: lightCount, color: 'text-cyan-400', border: 'border-slate-700' },
              { label: 'Masters (ESM)', value: masterCount, color: 'text-blue-400', border: 'border-slate-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border ${s.border} bg-slate-900/60 p-3`}>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{s.label}</div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {espLimitWarning && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span><strong>Warning:</strong> You have {espCount} active standard ESPs — approaching the 255-plugin hard limit. Consider converting small mods to ESL.</span>
            </div>
          )}

          {/* Search + Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="text" placeholder="Search plugins..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300" />
            </div>
            <div className="flex gap-1">
              {(['all', 'esm', 'esp', 'esl'] as TypeFilter[]).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase ${
                    typeFilter === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['index', 'name', 'conflicts'] as SortMode[]).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold capitalize ${
                    sortBy === s ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{s}</button>
              ))}
            </div>
            <div className="text-xs text-slate-500 ml-auto">
              {filteredAndSorted.length} shown
            </div>
          </div>

          {/* Plugin List */}
          <div className="space-y-1 overflow-y-auto" style={{ maxHeight: embedded ? '380px' : '100%' }}>
            {filteredAndSorted.map((plugin) => (
              <div key={plugin.name} className={`rounded-lg border transition-colors ${getRowClass(plugin)}`}>
                <button
                  onClick={() => setExpandedPlugin(expandedPlugin === plugin.name ? null : plugin.name)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-800/30 transition-colors"
                >
                  {expandedPlugin === plugin.name
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}

                  {getStatusIcon(plugin)}

                  <span className="flex-1 text-left text-xs font-mono text-slate-200 truncate">{plugin.name}</span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pluginTypeBadge(plugin)}
                    {!plugin.isLight && plugin.index < 256 && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {plugin.index.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    )}
                    {!plugin.enabled && (
                      <span className="text-[9px] text-slate-600 font-bold">DISABLED</span>
                    )}
                  </div>
                </button>

                {expandedPlugin === plugin.name && (
                  <div className="border-t border-slate-700/60 px-4 py-3 space-y-2">
                    <div className="text-xs text-slate-400">
                      Type: <span className="text-slate-200 font-bold">{pluginTypeLabel(plugin)}</span>
                      {!plugin.isLight && <> · Index: <span className="text-slate-200 font-mono">{plugin.index.toString(16).toUpperCase().padStart(2, '0')}</span></>}
                      {plugin.isLight && <> · Slot: <span className="text-cyan-300 font-mono">FE{String(plugin.index - 0xFE000).padStart(3, '0')}</span></>}
                      · Status: <span className={plugin.enabled ? 'text-emerald-300' : 'text-slate-500'}>
                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {plugin.conflicts.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-yellow-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Conflicts With:
                        </div>
                        <div className="space-y-0.5">
                          {plugin.conflicts.map((c, i) => (
                            <div key={i} className="text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded font-mono">{c}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plugin.missingMasters.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Missing Masters:
                        </div>
                        <div className="space-y-0.5">
                          {plugin.missingMasters.map((m, i) => (
                            <div key={i} className="text-xs text-red-300 bg-red-950/60 px-2 py-1 rounded font-mono">{m}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plugin.conflicts.length === 0 && plugin.missingMasters.length === 0 && (
                      <div className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected from plugins.txt
                      </div>
                    )}

                    <div className="text-[10px] text-slate-600 pt-1">
                      Tip: Run xEdit's "Find Conflicts" script for deep record-level conflict analysis.
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredAndSorted.length === 0 && plugins.length > 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">No plugins match the current filters.</div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {plugins.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <FolderOpen className="w-12 h-12 text-slate-700" />
          <div className="text-sm font-bold text-slate-400">No load order loaded</div>
          <div className="text-xs text-slate-500 max-w-xs">
            Click "Pick MO2 Profile" to select your Mod Organizer 2 profile folder
            (the one containing <span className="font-mono text-slate-400">plugins.txt</span>).
          </div>
          <button onClick={() => void pickProfile()}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors">
            <FolderOpen className="w-4 h-4" /> Pick MO2 Profile
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" /> Reading plugins.txt...
        </div>
      )}
    </div>
  );
};
