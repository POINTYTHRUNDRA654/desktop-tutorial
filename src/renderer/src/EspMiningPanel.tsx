/**
 * ESP Mining Panel
 *
 * Real FormID-relationship mapping, cell/worldspace conflict detection, and
 * quest-dependency analysis across the user's actual load order — backed by
 * genuine ESP subrecord parsing (espRecordParser.ts), not simulated data.
 */

import React, { useEffect, useState } from 'react';
import { Network, Map as MapIcon, BookOpen, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface PluginEntry {
  name: string;
  path: string;
}

export const EspMiningPanel: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadOrderError, setLoadOrderError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'formid' | 'cell' | 'quest'>('formid');

  useEffect(() => {
    const api = window.electronAPI?.espMining;
    if (!api) return;
    api.getLoadOrder().then(response => {
      if (response?.success && response.data) {
        setPlugins(response.data);
        setSelected(new Set(response.data.map((p: PluginEntry) => p.path)));
      } else {
        setLoadOrderError(response?.error || 'Could not read load order');
      }
    });
  }, []);

  const toggle = (p: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const runAnalysis = async () => {
    const api = window.electronAPI?.espMining;
    if (!api || selected.size === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const response = await api.analyze(Array.from(selected));
      if (response?.success) {
        setResult(response.data);
      } else {
        setError(response?.error || 'Analysis failed');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a]">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Network className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">ESP Mining</h1>
            <p className="text-xs text-slate-400">
              FormID relationships · Cell/worldspace conflicts · Quest dependencies — real ESP subrecord parsing
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loadOrderError && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadOrderError}
          </div>
        )}

        {plugins.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Load Order ({selected.size}/{plugins.length} selected)</h4>
              <button
                onClick={runAnalysis}
                disabled={analyzing || selected.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analyzing…' : 'Run Analysis'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {plugins.map(p => (
                <label key={p.path} className="flex items-center gap-2 text-[11px] text-slate-300 px-2 py-1 rounded hover:bg-slate-800/50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(p.path)} onChange={() => toggle(p.path)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex gap-1">
              {[
                { id: 'formid', icon: Network, label: `FormID Relationships (${result.formIdRelationships.conflicts.length} conflicts)` },
                { id: 'cell', icon: MapIcon, label: `Cell/Worldspace (${result.cellWorldspace.conflicts.length} conflicts)` },
                { id: 'quest', icon: BookOpen, label: `Quests (${result.questObjectives.conflicts.length} conflicts)` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'formid' && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
                <h4 className="text-sm font-bold text-white mb-2">FormID Conflicts</h4>
                {result.formIdRelationships.conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="w-4 h-4" /> No FormID conflicts detected across selected plugins.</div>
                ) : result.formIdRelationships.conflicts.map((c: any, i: number) => (
                  <div key={i} className="rounded-lg bg-slate-800/50 p-3 text-[11px]">
                    <div className="font-semibold text-red-300">{c.conflictType}: {c.description}</div>
                  </div>
                ))}
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  Dependency graph: {result.formIdRelationships.dependencyGraph.nodes.length} nodes, {result.formIdRelationships.dependencyGraph.edges.length} edges
                </div>
              </div>
            )}

            {activeTab === 'cell' && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
                <h4 className="text-sm font-bold text-white mb-2">Cell/Worldspace Conflicts</h4>
                {result.cellWorldspace.conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="w-4 h-4" /> No placement or removal conflicts detected.</div>
                ) : result.cellWorldspace.conflicts.map((c: any, i: number) => (
                  <div key={i} className="rounded-lg bg-slate-800/50 p-3 text-[11px]">
                    <div className="font-semibold text-red-300">{c.conflictType} in cell {c.cellId}</div>
                    <div className="text-slate-400">{c.description}</div>
                  </div>
                ))}
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  {result.cellWorldspace.analyses.length} cells analyzed · {result.cellWorldspace.optimizations.length} optimization opportunities
                </div>
              </div>
            )}

            {activeTab === 'quest' && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
                <h4 className="text-sm font-bold text-white mb-2">Quest Conflicts</h4>
                {result.questObjectives.conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="w-4 h-4" /> No duplicate or circular quest dependencies detected.</div>
                ) : result.questObjectives.conflicts.map((c: any, i: number) => (
                  <div key={i} className="rounded-lg bg-slate-800/50 p-3 text-[11px]">
                    <div className="font-semibold text-red-300">{c.conflictType}: {c.description}</div>
                  </div>
                ))}
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  {result.questObjectives.analyses.length} quests found across selected plugins
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EspMiningPanel;
