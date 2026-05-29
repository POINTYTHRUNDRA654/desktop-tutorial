/**
 * ModConflictVisualizer — FO4 Packaging & Release Hub — Step 2
 * Scans load order for conflicts; explains ITMs, UDRs, navmesh issues.
 */

import { useState } from 'react';
import {
  GitBranch, AlertTriangle, CheckCircle, Layers, Info, ExternalLink,
  Search, Zap, Shield, ChevronDown, ChevronRight,
} from 'lucide-react';
import { openExternal } from './utils/openExternal';

const openUrl = (url: string) => void openExternal(url);

interface Conflict {
  recordType: string; formId: string;
  winners: string[]; losers: string[];
  severity: 'low' | 'medium' | 'high';
  type?: string;
}
interface ModConflictVisualizerProps { embedded?: boolean; }

const SeverityBadge: React.FC<{ severity: 'low' | 'medium' | 'high' }> = ({ severity }) => {
  const cfg = { high: 'bg-red-900/40 border-red-500/40 text-red-300', medium: 'bg-amber-900/40 border-amber-500/40 text-amber-300', low: 'bg-blue-900/40 border-blue-500/30 text-blue-300' }[severity];
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg} uppercase`}>{severity}</span>;
};

const ExplainCard: React.FC<{ icon: React.ReactNode; title: string; color: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ icon, title, color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden ${color}`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">{icon}<span className="text-sm font-black text-white">{title}</span></div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 text-xs text-slate-300 space-y-1.5">{children}</div>}
    </div>
  );
};

export default function ModConflictVisualizer({ embedded = false }: ModConflictVisualizerProps) {
  const [plugins, setPlugins] = useState<string[]>([]);
  const [pluginInput, setPluginInput] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const addPlugin = () => {
    const v = pluginInput.trim();
    if (!v) return;
    setPlugins(p => Array.from(new Set([...p, v])));
    setPluginInput('');
  };

  const scanLoadOrder = async () => {
    setIsAnalyzing(true); setError(''); setMessage('');
    try {
      const api = (window as any).electronAPI;
      let result: { plugins: string[]; conflicts: Conflict[] } | null = null;
      if (api?.modConflictVisualizer?.scanLoadOrder) {
        result = await api.modConflictVisualizer.scanLoadOrder(plugins.length > 0 ? plugins : undefined);
      } else if (api?.conflictAnalyze) {
        const data = await api.conflictAnalyze(plugins.length > 0 ? plugins : []);
        result = {
          plugins: data?.plugins || plugins,
          conflicts: (data?.conflicts || []).map((c: any) => ({
            recordType: c.recordType || 'UNKNOWN', formId: c.formId || '?',
            winners: c.plugins?.slice(0, 1) || [], losers: c.plugins?.slice(1) || [],
            severity: c.severity === 'critical' || c.severity === 'major' ? 'high' : c.severity === 'minor' || c.severity === 'warning' ? 'medium' : 'low',
            type: c.type,
          })),
        };
      } else {
        setError('Conflict scanner unavailable. Start the Desktop Bridge and retry.'); return;
      }
      if (result) {
        setConflicts(result.conflicts);
        setMessage(`Scan complete — ${result.conflicts.length} conflict${result.conflicts.length !== 1 ? 's' : ''} across ${result.plugins.length} plugin${result.plugins.length !== 1 ? 's' : ''}.`);
      }
    } catch (err: any) { setError(`Scan failed: ${String(err?.message || err)}`); }
    finally { setIsAnalyzing(false); }
  };

  const filtered = conflicts.filter(c => severityFilter === 'all' || c.severity === severityFilter);
  const highCount = conflicts.filter(c => c.severity === 'high').length;
  const medCount = conflicts.filter(c => c.severity === 'medium').length;
  const lowCount = conflicts.filter(c => c.severity === 'low').length;
  const containerCls = embedded ? 'space-y-4' : 'min-h-screen bg-[#0a0e0a] p-8';

  return (
    <div className={containerCls}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto'}>

        {!embedded && (
          <div className="mb-8">
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase mb-1">Mossy Tutor • Packaging</div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><GitBranch className="w-8 h-8 text-emerald-400" /> Mod Conflict Visualizer</h1>
            <p className="text-slate-400 mt-2">Scan your load order for record conflicts, ITMs, and navmesh issues</p>
          </div>
        )}

        {/* Guidance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <ExplainCard icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} title="ITMs — Identical to Master" color="border-amber-600/20 bg-amber-900/10">
            <p>An <strong>ITM</strong> is a record copied into your plugin but unchanged. It still overrides any other mod editing the same record.</p>
            <p>Fix: Run <span className="font-mono text-white">FO4Edit -quickautoclean</span>.</p>
          </ExplainCard>
          <ExplainCard icon={<Zap className="w-4 h-4 text-red-400" />} title="UDRs — Undeleted References" color="border-red-600/20 bg-red-900/10">
            <p><strong>UDR</strong> occurs when a ref is deleted instead of disabled. The engine tries to load deleted refs and can crash.</p>
            <p>Fix: <span className="font-mono text-white">-quickautoclean</span> restores UDRs by disabling safely.</p>
          </ExplainCard>
          <ExplainCard icon={<Shield className="w-4 h-4 text-blue-400" />} title="Navmesh Conflicts" color="border-blue-600/20 bg-blue-900/10">
            <p><strong>Navmesh conflicts are high-severity.</strong> Two mods editing the same triangle cause NPC pathfinding errors or CTDs.</p>
            <p>Fix: A patch re-applying both sets of changes is the only clean solution.</p>
          </ExplainCard>
        </div>

        {/* Scanner */}
        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-4">
          <div className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">Load Order Scanner</div>
          <div className="flex gap-2 mb-3">
            <input type="text" value={pluginInput} onChange={e => setPluginInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlugin()}
              placeholder="Add plugin name (e.g. MyMod.esp)…"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
            <button type="button" onClick={addPlugin} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 text-sm font-bold transition-colors">Add</button>
          </div>
          {plugins.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {plugins.map(p => (
                <span key={p} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                  {p}
                  <button type="button" onClick={() => setPlugins(prev => prev.filter(x => x !== p))} className="text-slate-500 hover:text-red-400 transition-colors" aria-label={`Remove ${p}`}>×</button>
                </span>
              ))}
            </div>
          )}
          {error && <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-xs text-red-300">{error}</div>}
          {message && <div className="mb-3 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 text-xs text-blue-200">{message}</div>}
          <button type="button" onClick={scanLoadOrder} disabled={isAnalyzing}
            className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
            {isAnalyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing…</>
              : <><Search className="w-5 h-5" /> Scan for Conflicts</>}
          </button>
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-500">Leave the plugin list empty to scan your full active load order. Desktop Bridge must be running.</p>
          </div>
        </div>

        {/* Results */}
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-black/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-300" />
                <span className="text-sm font-black text-white">Conflicts Detected ({conflicts.length})</span>
              </div>
              <div className="flex gap-2">
                {([
                  { id: 'all', label: 'All', count: conflicts.length, cls: '' },
                  { id: 'high', label: 'High', count: highCount, cls: 'text-red-300' },
                  { id: 'medium', label: 'Med', count: medCount, cls: 'text-amber-300' },
                  { id: 'low', label: 'Low', count: lowCount, cls: 'text-blue-300' },
                ] as const).map(f => (
                  <button key={f.id} type="button" onClick={() => setSeverityFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${severityFilter === f.id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
                    {f.label} <span className={f.cls}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {filtered.slice(0, 50).map((conflict, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${conflict.severity === 'high' ? 'bg-red-900/20 border-red-500/30' : conflict.severity === 'medium' ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-900/30 border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{conflict.recordType}</span>
                        <span className="text-xs font-mono text-slate-400">{conflict.formId}</span>
                        {conflict.type && <span className="text-[10px] text-slate-500 font-mono">[{conflict.type}]</span>}
                      </div>
                      <div className="text-[11px] text-slate-300"><span className="text-slate-500">Winner: </span>{conflict.winners.join(', ') || '—'}</div>
                      {conflict.losers.length > 0 && <div className="text-[11px] text-slate-400"><span className="text-slate-500">Overridden: </span>{conflict.losers.join(', ')}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityBadge severity={conflict.severity} />
                      {conflict.severity === 'high' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-slate-600" />}
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length > 50 && <div className="text-xs text-slate-500 text-center py-2">Showing 50 of {filtered.length} — use Conflict Resolver for full analysis.</div>}
            </div>
          </div>
        )}

        {message && conflicts.length === 0 && (
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-900/10 p-5 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-300">No conflicts detected</p>
              <p className="text-xs text-slate-400 mt-0.5">Still run xEdit -quickautoclean before release to remove ITMs and fix UDRs.</p>
            </div>
          </div>
        )}

        {/* xEdit workflow */}
        <div className={`${embedded ? 'mt-4' : 'mt-6'} rounded-xl border border-slate-700/40 bg-slate-900/30 p-5`}>
          <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-emerald-300" /><span className="text-xs font-black tracking-widest uppercase text-slate-300">xEdit Quick-Clean Workflow</span></div>
          <ol className="space-y-2 text-xs text-slate-400 list-decimal pl-4">
            <li>Download <strong className="text-slate-200">FO4Edit</strong> from Nexus (same as xEdit, renamed for Fallout 4).</li>
            <li>Add launch argument: <span className="font-mono text-white">-quickautoclean</span></li>
            <li>Select <strong className="text-slate-200">only your plugin</strong> — do not load the full load order.</li>
            <li>xEdit removes ITMs and fixes UDRs automatically. Close when prompted to save.</li>
            <li>Re-run the scan above to confirm zero conflicts from your plugin.</li>
          </ol>
          <button type="button" onClick={() => openUrl('https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods')}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:border-emerald-600/40 transition-colors">
            <ExternalLink className="w-3 h-3" /> Download FO4Edit (Nexus)
          </button>
        </div>

      </div>
    </div>
  );
}
