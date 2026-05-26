/**
 * CK Tools Hub
 *
 * Unified platform for all Creation Kit work in Fallout 4 modding.
 * Consolidates: CK Safety (Crash Prevention) · CK Extension (auto-save, scripting) · FO4 CK Guide
 */

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Shield, Wrench, BookOpen, ChevronRight, AlertTriangle, CheckCircle, Info, Scroll, Activity, Save, Monitor, Link, Search, ClipboardList, Settings, Package, FileCode, Cpu, Zap, XCircle, HelpCircle, RefreshCw } from 'lucide-react';

const CKCrashPrevention = React.lazy(() => import('./CKCrashPrevention'));
const CKExtension = React.lazy(() =>
  import('./CKExtension').then((m) => ({ default: m.CKExtension }))
);
const QuestEditor = React.lazy(() => import('./QuestEditor'));
const AnimationEditor = React.lazy(() =>
  import('./AnimationEditor').then((m) => ({ default: m.AnimationEditor }))
);
const SaveGameParser = React.lazy(() =>
  import('./SaveGameParser').then((m) => ({ default: m.SaveGameParser }))
);
const LiveGameMonitor = React.lazy(() =>
  import('./LiveGameMonitor').then((m) => ({ default: m.LiveGameMonitor }))
);
const GameIntegration = React.lazy(() => import('./GameIntegration'));

type HubTab = 'safety' | 'extension' | 'guide' | 'quests' | 'anim' | 'saves' | 'livemon' | 'gameint' | 'inspector' | 'checklist' | 'inifix';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'safety', icon: Shield, label: 'CK Safety', sublabel: 'Crash Prevention · Validation' },
  { id: 'extension', icon: Wrench, label: 'CK Extension', sublabel: 'Auto-save · Script Compiler' },
  { id: 'guide', icon: BookOpen, label: 'FO4 CK Guide', sublabel: 'Best Practices · Pitfalls' },
  { id: 'inspector', icon: Search, label: 'Plugin Inspector', sublabel: 'BA2 · ESL · Masters' },
  { id: 'checklist', icon: ClipboardList, label: 'Pre-Publish', sublabel: 'Release checklist' },
  { id: 'inifix', icon: Settings, label: 'INI Validator', sublabel: 'Fallout4.ini fixes' },
  { id: 'quests', icon: Scroll, label: 'Quest Editor', sublabel: 'Stages & aliases' },
  { id: 'anim', icon: Activity, label: 'Animation', sublabel: 'Havok/hkx' },
  { id: 'saves', icon: Save, label: 'Save Parser', sublabel: 'Save game data' },
  { id: 'livemon', icon: Monitor, label: 'Live Monitor', sublabel: 'Runtime events' },
  { id: 'gameint', icon: Link, label: 'Game Link', sublabel: 'F4SE bridge' },
];

// ============================================================================
// Plugin Inspector
// ============================================================================

interface PluginInspectorResult {
  pluginType: string;
  formIdCount: number;
  eslSafe: boolean;
  masters: string[];
  hasNavmesh: boolean;
  hasPrecombines: boolean;
  hasScripts: boolean;
  fileSizeMB: number;
  ba2Archives: string[];
  warnings: { level: 'error' | 'warn' | 'info'; msg: string }[];
}

const ESL_MAX_LOCAL_FORMIDS = 4096;

/** Client-side heuristic analysis of a plugin filename/path — real binary read needs IPC */
function heuristicInspect(pluginPath: string): PluginInspectorResult {
  const name = pluginPath.split(/[\\/]/).pop() ?? pluginPath;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const warnings: { level: 'error' | 'warn' | 'info'; msg: string }[] = [];

  const isEsl = ext === 'esl';
  const isEsm = ext === 'esm';

  if (name.toLowerCase().includes(' ')) {
    warnings.push({ level: 'warn', msg: 'Plugin filename contains spaces — some tools (xEdit, LOOT) may have trouble. Rename to use underscores.' });
  }
  if (isEsl) {
    warnings.push({ level: 'info', msg: 'ESL plugin: FormID local range is 0x000–0xFFF (max 4096 new records). Run xEdit "Compact FormIDs for ESL" before distributing.' });
  }
  if (isEsm) {
    warnings.push({ level: 'info', msg: 'ESM master file: ensure all child plugins load after this in their master list. LOOT handles this automatically.' });
  }
  if (!isEsl && !isEsm && ext === 'esp') {
    warnings.push({ level: 'info', msg: 'Standard ESP: counts toward the 255-plugin limit. Consider ESL-flagging if new FormID count is under 4096.' });
  }

  return {
    pluginType: isEsm ? 'ESM (Master)' : isEsl ? 'ESL (Light Plugin)' : 'ESP (Standard Plugin)',
    formIdCount: -1, // requires IPC binary read
    eslSafe: isEsl,
    masters: [],
    hasNavmesh: false,
    hasPrecombines: false,
    hasScripts: false,
    fileSizeMB: -1,
    ba2Archives: [],
    warnings,
  };
}

const PluginInspectorPanel: React.FC = () => {
  const [pluginPath, setPluginPath] = useState('');
  const [result, setResult] = useState<PluginInspectorResult | null>(null);
  const [ipcResult, setIpcResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const api = () => (window as any).electron?.api || (window as any).electronAPI;

  const pickPlugin = async () => {
    const a = api();
    if (!a) return;
    try {
      const res = typeof a.ckPickPlugin === 'function' ? await a.ckPickPlugin()
        : typeof a.invoke === 'function' ? await a.invoke('ck-crash-prevention:pick-plugin') : null;
      if (res?.success && res.path) setPluginPath(res.path);
    } catch { /* silent */ }
  };

  const runInspect = useCallback(async () => {
    if (!pluginPath.trim()) { setError('Enter or browse to a plugin path first.'); return; }
    setError(''); setBusy(true); setResult(null); setIpcResult(null);

    // Always do client heuristic first
    const heuristic = heuristicInspect(pluginPath.trim());

    // Try IPC deep scan
    const a = api();
    if (a) {
      try {
        const raw = typeof a.ckInspectPlugin === 'function'
          ? await a.ckInspectPlugin(pluginPath.trim())
          : typeof a.invoke === 'function'
          ? await a.invoke('ck:inspect-plugin', pluginPath.trim())
          : null;

        if (raw?.success !== false && raw) {
          const d = raw?.data ?? raw;
          // Merge IPC data into heuristic result
          heuristic.formIdCount = d.formIdCount ?? heuristic.formIdCount;
          heuristic.masters = Array.isArray(d.masters) ? d.masters : heuristic.masters;
          heuristic.hasNavmesh = d.hasNavmesh ?? heuristic.hasNavmesh;
          heuristic.hasPrecombines = d.hasPrecombines ?? heuristic.hasPrecombines;
          heuristic.hasScripts = d.hasScripts ?? heuristic.hasScripts;
          heuristic.fileSizeMB = d.fileSizeMB ?? heuristic.fileSizeMB;
          heuristic.ba2Archives = Array.isArray(d.ba2Archives) ? d.ba2Archives : [];
          if (Array.isArray(d.warnings)) {
            heuristic.warnings.push(...d.warnings);
          }
          // ESL FormID overflow check
          if (heuristic.eslSafe && heuristic.formIdCount > ESL_MAX_LOCAL_FORMIDS) {
            heuristic.warnings.push({ level: 'error', msg: `ESL FormID overflow: ${heuristic.formIdCount} local FormIDs exceed the 4096 ESL maximum. Compact FormIDs in xEdit before flagging as ESL.` });
          }
          // Large file warning
          if (heuristic.fileSizeMB > 80) {
            heuristic.warnings.push({ level: 'warn', msg: `Large plugin (${heuristic.fileSizeMB.toFixed(1)} MB). CK may use excessive memory loading this. Session-restart every 30 min recommended.` });
          }
          if (d.ba2Version && (d.ba2Version === 7 || d.ba2Version === 8)) {
            heuristic.warnings.push({ level: 'warn', msg: `BA2 Header V${d.ba2Version} detected — NG/AE format. OG game (1.10.163) cannot load this archive. Repack with Archive2 for OG if needed.` });
          }
          setIpcResult(d);
        }
      } catch { /* IPC unavailable — heuristic only */ }
    }

    setResult(heuristic);
    setBusy(false);
  }, [pluginPath]);

  const warnColor = (level: string) =>
    level === 'error' ? 'text-red-400 border-red-600/40 bg-red-950/20'
    : level === 'warn' ? 'text-yellow-400 border-yellow-600/40 bg-yellow-950/20'
    : 'text-sky-400 border-sky-600/40 bg-sky-950/20';

  return (
    <div className="space-y-5 text-sm text-slate-200">
      {/* Header */}
      <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-900/20 to-black/40 p-5">
        <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
          <Search className="h-5 w-5 text-sky-300" /> Plugin Inspector
        </h2>
        <p className="text-sky-100/70 text-xs">Deep analysis of an ESP/ESM/ESL — plugin type, FormID count, master list, BA2 archives, ESL safety, and pre-flight warnings.</p>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={pluginPath}
            onChange={e => setPluginPath(e.target.value)}
            placeholder="Path to .esp / .esm / .esl (paste or browse)…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button onClick={pickPlugin} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> Browse
          </button>
        </div>
        <button
          onClick={runInspect}
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {busy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Inspecting…</> : <><Search className="h-4 w-4" /> Inspect Plugin</>}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Type', value: result.pluginType, color: 'text-sky-300' },
              { label: 'FormIDs', value: result.formIdCount < 0 ? 'IPC required' : result.formIdCount.toLocaleString(), color: result.formIdCount > ESL_MAX_LOCAL_FORMIDS ? 'text-red-400' : 'text-emerald-300' },
              { label: 'File Size', value: result.fileSizeMB < 0 ? 'IPC required' : `${result.fileSizeMB.toFixed(1)} MB`, color: 'text-slate-300' },
              { label: 'Masters', value: result.masters.length < 0 ? 'IPC required' : result.masters.length === 0 ? 'None listed' : String(result.masters.length), color: 'text-slate-300' },
            ].map(item => (
              <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                <div className={`font-bold text-xs mt-1 ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Feature flags */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Navmesh', value: result.hasNavmesh },
              { label: 'Precombines', value: result.hasPrecombines },
              { label: 'Papyrus Scripts', value: result.hasScripts },
            ].map(f => (
              <div key={f.label} className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${f.value ? 'border-amber-600/40 bg-amber-950/20 text-amber-300' : 'border-slate-700 bg-slate-900/40 text-slate-500'}`}>
                {f.value ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                {f.label}: {f.value ? 'Yes' : 'No'}
              </div>
            ))}
          </div>

          {/* Master list */}
          {result.masters.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs font-bold text-slate-300 mb-2">Master Dependencies ({result.masters.length})</p>
              <ul className="space-y-1">
                {result.masters.map(m => (
                  <li key={m} className="text-xs font-mono text-emerald-300 flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-slate-500" />{m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* BA2 archives */}
          {result.ba2Archives.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs font-bold text-slate-300 mb-2">BA2 Archives ({result.ba2Archives.length})</p>
              <ul className="space-y-1">
                {result.ba2Archives.map(b => (
                  <li key={b} className="text-xs font-mono text-sky-300 flex items-center gap-2">
                    <Package className="h-3 w-3 text-slate-500" />{b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">Inspection Results ({result.warnings.length})</p>
              {result.warnings.map((w, i) => (
                <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${warnColor(w.level)}`}>
                  {w.level === 'error' ? '❌' : w.level === 'warn' ? '⚠️' : 'ℹ️'} {w.msg}
                </div>
              ))}
            </div>
          )}

          {!ipcResult && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/20 px-3 py-2 text-xs text-slate-500">
              <Info className="h-3 w-3 inline mr-1" /> FormID count, master list, and BA2 details require the Mossy desktop bridge IPC handler (<code>ck:inspect-plugin</code>). Filename heuristics shown above are available without it.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Pre-Publish Checklist
// ============================================================================

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  detail: string;
  critical: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Plugin hygiene
  { id: 'c01', category: 'Plugin Hygiene', title: 'Run xEdit Quick Auto Clean', detail: 'Remove Identical-to-Master (ITM) records and restore Undeleted-and-Disabled References (UDRs). Command: FO4Edit.exe -quickautoclean -autoload "plugin.esp"', critical: true },
  { id: 'c02', category: 'Plugin Hygiene', title: 'Verify all master files are listed', detail: 'Open in xEdit and check the File Header → Master Files. Every FormID reference must have its master declared. Missing masters cause immediate CTD on load.', critical: true },
  { id: 'c03', category: 'Plugin Hygiene', title: 'Check for deleted NavMesh records (UDRs)', detail: 'In xEdit, filter for Deleted records in NAVM. Any deleted navmesh = navmesh CTD for users. Undelete and disable instead of hard-deleting.', critical: true },
  { id: 'c04', category: 'Plugin Hygiene', title: 'ESL-flag if FormID count < 4096', detail: 'If your plugin adds fewer than 4096 new records, ESL-flagging it frees up one of the 255 plugin slots for your users. Use xEdit → Compact FormIDs for ESL first.', critical: false },
  { id: 'c05', category: 'Plugin Hygiene', title: 'Confirm no BA2 Header V7/V8 for OG users', detail: 'The NG CK outputs V7/V8 BA2 archives by default. If you support OG (1.10.163) users, repack with Archive2 --formatVersion=1 or document the NG requirement.', critical: false },
  // Scripts
  { id: 'c06', category: 'Papyrus Scripts', title: 'All .psc files compiled to .pex', detail: 'Open CK → Gameplay → Papyrus Compiler and check every .psc has a matching .pex in the Scripts\\Compiled folder. Ship only the .pex, not the .psc source (optional but standard).', critical: true },
  { id: 'c07', category: 'Papyrus Scripts', title: 'No RegisterForUpdate() in hot-path scripts', detail: 'Replace all RegisterForUpdate() with RegisterForSingleUpdate(delay) + OnUpdate → re-register pattern. Continuous update is a performance tax on all users.', critical: false },
  { id: 'c08', category: 'Papyrus Scripts', title: 'Every AddInventoryEventFilter has matching Remove', detail: 'Mismatched AddInventoryEventFilter / RemoveInventoryEventFilter pairs cause Papyrus stack overflow. Audit every script that registers inventory filters.', critical: true },
  // Assets
  { id: 'c09', category: 'Assets & Archives', title: 'All textures packed in BA2 (not loose)', detail: 'Loose .dds files always override BA2 archives and bloat load time. Pack all textures into a BA2 archive unless you intentionally want users to be able to override them.', critical: false },
  { id: 'c10', category: 'Assets & Archives', title: 'Validate all NIFs in NifSkope before packing', detail: 'Open each custom NIF in NifSkope and check: no missing textures, valid block count, correct BSTriShape / BSSubIndexTriShape for FO4 engine. Corrupt NIFs crash the CK preview and the game.', critical: true },
  { id: 'c11', category: 'Assets & Archives', title: 'XWM/FUZ voice files encoded at 44100 Hz', detail: 'All voice files must be XWM encoded at 44100 Hz 16-bit mono. Wrong sample rate = audio stream crash. Use xWMAEncode.exe bundled with the CK.', critical: true },
  { id: 'c12', category: 'Assets & Archives', title: 'Remove .psd, .blend, .fbx source files from release', detail: 'Accidentally shipping source art files increases mod size and leaks your source assets. Ensure only .dds, .nif, .pex, .ba2, and the plugin file are in your release.', critical: false },
  // Worldspace / cells
  { id: 'c13', category: 'Worldspace & Cells', title: 'Precombines regenerated after any exterior cell edit', detail: 'Every exterior cell edit requires CK → File → Generate Precombined Geometry. Skipping this causes previs CTD for users. Repack result into the mod BA2.', critical: true },
  { id: 'c14', category: 'Worldspace & Cells', title: 'LOD regenerated (xLODGen → TexGen → DynDOLOD)', detail: 'If you add or move objects in exterior cells, LOD must be regenerated. Ship LOD BA2 or document that users must regenerate DynDOLOD themselves.', critical: false },
  { id: 'c15', category: 'Worldspace & Cells', title: 'Room Bounds placed in all interior cells', detail: 'Every interior cell must have a valid RoomBounds marker fully enclosing the playable space. Missing RoomBounds causes CK crash and potential game CTD on cell load.', critical: true },
  // Load order
  { id: 'c16', category: 'Load Order & Compatibility', title: 'Test with a clean save, not an in-progress save', detail: 'First-time installs must be tested on a fresh save or at least a save taken before your mod was added. This is the state your users will experience.', critical: true },
  { id: 'c17', category: 'Load Order & Compatibility', title: 'Run LOOT and confirm no warnings on your plugin', detail: 'LOOT metadata may flag your plugin for load order issues. Check the LOOT masterlist for known conflicts before publishing.', critical: false },
  { id: 'c18', category: 'Load Order & Compatibility', title: 'No AWKCR, DEF_UI, or legacy MCM as hard dependency', detail: 'These frameworks are deprecated on NG/AE. If your mod depends on them, you are locking out all NG/1.11.x users. Replace with ECO/NEO, FallUI, MCM NG.', critical: true },
  // Documentation
  { id: 'c19', category: 'Documentation', title: 'Requirements listed on mod page (F4SE, Addictol, etc.)', detail: 'Explicitly list: Fallout 4 version (OG/NG/both), F4SE version required, required mods, optional mods. Vague requirements cause 90% of bug reports.', critical: false },
  { id: 'c20', category: 'Documentation', title: 'Version number in plugin description or readme', detail: 'Set the File Header → Description to include your version string (e.g. "v1.2.0"). This helps users and tools like LOOT/MO2 identify which version is installed.', critical: false },
  { id: 'c21', category: 'Documentation', title: 'BA2 header version documented (OG/NG/both)', detail: 'Clearly state in the requirements whether your BA2 archives are OG-compatible (V1) or NG-only (V7/V8). Nexus tags "FO4 v1.10.163" vs "FO4 v1.10.982+" for this reason.', critical: false },
  // Final check
  { id: 'c22', category: 'Final Verification', title: 'Addictol + CLASSIC crash log check in test game', detail: 'Install your mod in a test game with Addictol (Nexus #84214) active. Reproduce key mod features. If any CTD occurs, run CLASSIC (Nexus #56255) on the resulting crash log before publishing.', critical: true },
];

const PrePublishChecklist: React.FC = () => {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ck_checklist') ?? '[]')); } catch { return new Set(); }
  });

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('ck_checklist', JSON.stringify([...next]));
      return next;
    });
  };

  const resetAll = () => {
    setChecked(new Set());
    localStorage.removeItem('ck_checklist');
  };

  const categories = [...new Set(CHECKLIST_ITEMS.map(i => i.category))];
  const criticalTotal = CHECKLIST_ITEMS.filter(i => i.critical).length;
  const criticalDone = CHECKLIST_ITEMS.filter(i => i.critical && checked.has(i.id)).length;
  const totalDone = checked.size;
  const allCriticalDone = criticalDone === criticalTotal;

  return (
    <div className="space-y-5 text-sm text-slate-200">
      {/* Header */}
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-black/40 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-300" /> Pre-Publish Checklist
          </h2>
          <button onClick={resetAll} className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        <p className="text-emerald-100/70 text-xs mb-3">22 professional checks every Fallout 4 mod author should complete before uploading. Progress is saved in your session.</p>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Critical checks: <span className={allCriticalDone ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>{criticalDone}/{criticalTotal}</span></span>
            <span className="text-slate-400">Total: {totalDone}/{CHECKLIST_ITEMS.length}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${(totalDone / CHECKLIST_ITEMS.length) * 100}%` }} />
          </div>
          {allCriticalDone && (
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle className="h-3.5 w-3.5" /> All critical checks passed — safe to publish!
            </div>
          )}
        </div>
      </div>

      {/* Items by category */}
      {categories.map(cat => (
        <div key={cat} className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{cat}</h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {CHECKLIST_ITEMS.filter(i => i.category === cat).map(item => {
              const done = checked.has(item.id);
              return (
                <label key={item.id} className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors group">
                  <input type="checkbox" checked={done} onChange={() => toggle(item.id)} className="mt-0.5 accent-emerald-500 flex-shrink-0 w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${done ? 'line-through text-slate-500' : 'text-white'}`}>{item.title}</span>
                      {item.critical && !done && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 border border-red-600/40 px-1 rounded">REQUIRED</span>
                      )}
                      {done && <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className={`text-xs mt-0.5 ${done ? 'text-slate-600' : 'text-slate-400'}`}>{item.detail}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// INI Validator
// ============================================================================

interface IniCheck {
  section: string;
  key: string;
  requiredValue: string | null;
  recommendedValue: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  currentValue?: string;
  status?: 'ok' | 'wrong' | 'missing' | 'unknown';
}

const INI_CHECKS: IniCheck[] = [
  { section: 'Archive', key: 'bInvalidateOlderFiles', requiredValue: '1', recommendedValue: '1', description: 'Required for loose files and mod-managed files to override BA2 archives. Without this, mods relying on loose assets silently fail.', severity: 'critical' },
  { section: 'Archive', key: 'sResourceDataDirsFinal', requiredValue: null, recommendedValue: '', description: 'Must be empty (blank) or not present. If set to a path, it overrides the archive list and can break all mod BA2 loading.', severity: 'high' },
  { section: 'General', key: 'bEnableFileSelection', requiredValue: '1', recommendedValue: '1', description: 'Required to enable plugin selection screen (plugins.txt loading). Without this, the game ignores your entire mod list.', severity: 'critical' },
  { section: 'General', key: 'bUseMyGamesDirectory', requiredValue: '1', recommendedValue: '1', description: 'Ensures the game reads INI files from My Games\\Fallout4 rather than the installation directory — required for most mod managers.', severity: 'high' },
  { section: 'Display', key: 'bFullScreen', requiredValue: null, recommendedValue: '0', description: 'Borderless windowed (0) prevents CTD on alt-tab and is required for ENB, ReShade, and overlay tools (Steam, Discord). Keep at 1 only if you need exclusive fullscreen.', severity: 'info' },
  { section: 'Papyrus', key: 'bEnableLogging', requiredValue: null, recommendedValue: '1', description: 'Enable during development to get Papyrus script errors in Documents\\My Games\\Fallout4\\Logs\\Script\\. Disable for release to reduce disk I/O.', severity: 'info' },
  { section: 'Papyrus', key: 'fUpdateBudgetMS', requiredValue: null, recommendedValue: '2.4', description: 'Papyrus VM update budget per frame (milliseconds). Increasing from default (1.2) to 2.4 allows complex mods (SS2, etc.) to run without falling behind. Do not set above 4.0.', severity: 'medium' },
  { section: 'Papyrus', key: 'iMinMemoryPageSize', requiredValue: null, recommendedValue: '256', description: 'Minimum Papyrus memory page size in KB. 256 prevents small-stack overflow in lightly-scripted mods. Match with iMaxMemoryPageSize.', severity: 'medium' },
  { section: 'Papyrus', key: 'iMaxMemoryPageSize', requiredValue: null, recommendedValue: '512', description: 'Maximum Papyrus memory page size in KB. 512 gives headroom for heavily-scripted mods like SS2 without excessive RAM use.', severity: 'medium' },
  { section: 'Launcher', key: 'bEnableFileSelection', requiredValue: '1', recommendedValue: '1', description: 'Launcher version of the plugin selection flag. Both [General] and [Launcher] sections need this set to 1 for plugins.txt to function.', severity: 'critical' },
  { section: 'Interface', key: 'bShowQuestMarkers', requiredValue: null, recommendedValue: '1', description: 'Ensure quest markers are not accidentally disabled — commonly changed by UI mods and forgotten.', severity: 'info' },
  { section: 'Water', key: 'bReflectLODObjects', requiredValue: null, recommendedValue: '0', description: 'Disabling LOD object reflections in water prevents a known CTD in the Boston area on weaker GPUs.', severity: 'info' },
];

const INI_SECTIONS = ['What to check', 'Fallout4.ini', 'Fallout4Custom.ini'];

const IniValidatorPanel: React.FC = () => {
  const [iniText, setIniText] = useState('');
  const [results, setResults] = useState<IniCheck[]>([]);
  const [ran, setRan] = useState(false);

  const parseIni = (text: string): Record<string, Record<string, string>> => {
    const out: Record<string, Record<string, string>> = {};
    let section = 'General';
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;
      const sectionMatch = line.match(/^\[(.+)\]$/);
      if (sectionMatch) { section = sectionMatch[1]; out[section] = out[section] ?? {}; continue; }
      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const k = kvMatch[1].trim();
        const v = kvMatch[2].trim();
        out[section] = out[section] ?? {};
        out[section][k] = v;
      }
    }
    return out;
  };

  const runValidation = () => {
    const parsed = parseIni(iniText);
    const checked: IniCheck[] = INI_CHECKS.map(check => {
      const sectionData = parsed[check.section] ?? {};
      const cv = sectionData[check.key];
      let status: IniCheck['status'] = 'unknown';
      if (!iniText.trim()) { status = 'unknown'; }
      else if (cv === undefined) { status = check.requiredValue ? 'missing' : 'unknown'; }
      else if (check.requiredValue && cv !== check.requiredValue) { status = 'wrong'; }
      else if (check.requiredValue && cv === check.requiredValue) { status = 'ok'; }
      else { status = 'ok'; }
      return { ...check, currentValue: cv, status };
    });
    setResults(checked);
    setRan(true);
  };

  const statusBadge = (s?: string) => {
    if (s === 'ok') return <span className="text-[9px] font-bold text-emerald-400 border border-emerald-600/40 px-1 rounded">OK</span>;
    if (s === 'wrong') return <span className="text-[9px] font-bold text-red-400 border border-red-600/40 px-1 rounded">WRONG VALUE</span>;
    if (s === 'missing') return <span className="text-[9px] font-bold text-orange-400 border border-orange-600/40 px-1 rounded">MISSING</span>;
    return <span className="text-[9px] font-bold text-slate-500 border border-slate-600/40 px-1 rounded">NOT CHECKED</span>;
  };

  const sevColor = (s: string) =>
    s === 'critical' ? 'border-red-600/40 bg-red-950/20'
    : s === 'high' ? 'border-orange-600/40 bg-orange-950/20'
    : s === 'medium' ? 'border-yellow-600/40 bg-yellow-950/20'
    : 'border-slate-700 bg-slate-900/40';

  const issues = ran ? results.filter(r => r.status === 'wrong' || r.status === 'missing') : [];

  return (
    <div className="space-y-5 text-sm text-slate-200">
      {/* Header */}
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-black/40 p-5">
        <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
          <Settings className="h-5 w-5 text-violet-300" /> INI Validator
        </h2>
        <p className="text-violet-100/70 text-xs">Paste your Fallout4.ini or Fallout4Custom.ini contents below and validate against 12 known-critical settings. Find at: Documents\My Games\Fallout4\</p>
      </div>

      {/* Quick reference — no paste needed */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-violet-400" /> Critical Settings Reference (no paste needed)
        </h3>
        <div className="grid gap-2">
          {INI_CHECKS.filter(c => c.severity === 'critical' || c.severity === 'high').map(c => (
            <div key={`${c.section}.${c.key}`} className={`rounded-lg border px-3 py-2.5 text-xs ${sevColor(c.severity)}`}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="font-mono text-white">[{c.section}] {c.key}={c.recommendedValue || '<blank>'}</code>
                <span className={`text-[9px] font-bold uppercase px-1 rounded border ${c.severity === 'critical' ? 'text-red-400 border-red-600/40' : 'text-orange-400 border-orange-600/40'}`}>{c.severity}</span>
              </div>
              <p className="text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Paste and validate */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <FileCode className="h-3.5 w-3.5 text-violet-400" /> Paste INI to Validate
        </h3>
        <textarea
          value={iniText}
          onChange={e => { setIniText(e.target.value); setRan(false); }}
          rows={8}
          placeholder="[Archive]&#10;bInvalidateOlderFiles=1&#10;sResourceDataDirsFinal=&#10;&#10;[General]&#10;bEnableFileSelection=1&#10;..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
        />
        <button
          onClick={runValidation}
          disabled={!iniText.trim()}
          className="w-full rounded-lg bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <Cpu className="h-4 w-4" /> Validate INI
        </button>

        {ran && (
          <div className="space-y-2">
            {issues.length === 0 ? (
              <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> No critical issues detected in pasted INI.
              </div>
            ) : (
              issues.map(r => (
                <div key={`${r.section}.${r.key}`} className={`rounded-lg border px-3 py-2.5 text-xs ${sevColor(r.severity)}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="font-mono text-white">[{r.section}] {r.key}</code>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-slate-300 mb-1">{r.description}</p>
                  <p className="text-slate-400">Current: <code className="text-red-300">{r.currentValue ?? 'not found'}</code> → Required: <code className="text-emerald-300">{r.recommendedValue || '<blank>'}</code></p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* All checks reference */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-700">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">All INI Checks ({INI_CHECKS.length})</h3>
        </div>
        <div className="divide-y divide-slate-800/60">
          {INI_CHECKS.map(c => (
            <div key={`${c.section}.${c.key}`} className="px-4 py-3 flex gap-3 items-start">
              <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${c.severity === 'critical' ? 'bg-red-500' : c.severity === 'high' ? 'bg-orange-500' : c.severity === 'medium' ? 'bg-yellow-500' : 'bg-slate-600'}`} />
              <div>
                <code className="text-xs text-white font-mono">[{c.section}] {c.key}</code>
                <span className="text-xs text-slate-500 ml-2">→ <span className="text-emerald-400">{c.recommendedValue || '<blank>'}</span></span>
                <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FO4 Creation Kit Guide
// ============================================================================

const CRASH_CAUSES = [
  {
    cause: 'Cell / Room Bounds missing or misaligned',
    severity: 'critical',
    detail:
      'The CK requires every interior cell to have a valid Room Bounds marker. Missing or floating markers cause immediate crashes when loading the cell. Fix: place RoomBounds inside the cell, make sure they fully enclose the room volume.',
  },
  {
    cause: 'Precombine / Previs data out-of-date',
    severity: 'critical',
    detail:
      'If you edit objects inside a precombined mesh zone without regenerating precombines, the game crashes on cell load. Fix: regenerate precombine and previs data via the CK batch render system, then repack into the mod\'s BA2 archive.',
  },
  {
    cause: 'Missing master ESP/ESM',
    severity: 'critical',
    detail:
      'If a plugin references a master file (ITM FormID, linked refs, etc.) that is not in the load order, the CK crashes on save or the game crashes on load. Verify all masters are loaded in the CK project.',
  },
  {
    cause: 'Corrupt NIF or oversized NIF',
    severity: 'high',
    detail:
      'NIFs with invalid block counts, unsupported NiNode types, or extreme polygon counts crash the CK in the preview window. Validate NIFs with NifSkope before placing in CK.',
  },
  {
    cause: 'Leveled List injection without Bash Patch',
    severity: 'high',
    detail:
      'Multiple mods injecting into the same leveled list without a bashed patch causes list overrides that crash random encounters. Use Wrye Bash to build a bashed patch when distributing.',
  },
  {
    cause: 'Too many forms in ESP (non-ESL)',
    severity: 'medium',
    detail:
      'Standard ESP/ESM files have a 16M FormID space (0x000800 – 0xFFFFF per mod file). Mods with too many records fragment the space and can cause save corruption. Flag small mods as ESL if FormID count < 2048.',
  },
  {
    cause: 'Overlapping navmesh triangles',
    severity: 'high',
    detail:
      'Self-intersecting or z-fighting navmesh triangles cause NPC pathfinding crashes. Always finalize navmesh (CK menu: NavMesh → Finalize NavMesh) before testing.',
  },
  {
    cause: 'Lighting LOD / LGTM not rebuilt',
    severity: 'medium',
    detail:
      'After making exterior changes, LGTM data and lighting LOD must be rebuilt. Stale data causes visual pop-in and sometimes render crashes.',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Always save CK plugin as a separate file, never overwrite master',
    detail: 'Work in a child ESP that has your base ESM as a master. Never modify vanilla ESM/ESPs directly.',
  },
  {
    title: 'Enable the CK auto-save extension',
    detail: 'The CK has no built-in reliable auto-save. Use the Mossy CK Extension auto-save (5-minute intervals recommended) to avoid losing work to CK crashes.',
  },
  {
    title: 'Use F4CK Fixes / CK Platform Extended',
    detail: 'CK Platform Extended (Nexus #51998) patches dozens of CK bugs including the 5-second save lag, navmesh crash on large cells, and memory leaks. Essential for stable CK work. Use CKPE 0.3.x for OG (1.10.163) and CKPE 0.5+ for NG/AE/1.11.x — both on the same Nexus page.',
  },
  {
    title: 'Disable DistantLOD checkbox for new exterior cells',
    detail: 'Leave LOD generation to DynDOLOD/xLODGen post-process. Generating LOD from inside CK creates incomplete data.',
  },
  {
    title: 'Compact FormIDs before releasing as ESL',
    detail: 'ESL plugins can only use FormIDs 0x000–0xFFF. Run xEdit → "Compact FormIDs for ESL" before flagging. This is a destructive operation — do it before distributing.',
  },
  {
    title: 'Script compilation: always check for stale PEX files',
    detail: 'Compiled Papyrus PEX files from an old PSC source are not automatically overwritten. Use the CK Papyrus compiler or xEdit → script compile to regenerate all PEX.',
  },
  {
    title: 'Test in clean save after every major structural change',
    detail: 'Save-game state machines cache cell data. Test new cell layouts with a fresh save (No mods → Add your mod fresh) to see true first-load behavior.',
  },
  {
    title: 'Use CLASSIC for crash log analysis',
    detail: 'CLASSIC (Crash Log Auto Scanner, Nexus #56255) parses Addictol/Buffout 4 crash logs and identifies the most likely offending record or NIF. Run after every crash before editing.',
  },
];

const CK_TOOLS_REF = [
  { name: 'CK Platform Extended (CKPE)', desc: 'CK bug fixes, memory patches, extra dialogs, navmesh crash fix, 5-second save lag fix. Use CKPE 0.3.x for OG CK, CKPE 0.5.6+ for NG CK / 1.11.x. Essential for any serious CK work.', nexus: '51998' },
  { name: 'Addictol', desc: 'All-in-one stability stack for OG/NG/1.11.x. Bundles: Buffout 4 NG, X-Cell, BakaMaxPapyrusOps, Faster Workshop, Long Loading Times Fix, and more. ⚠ Do NOT install standalone Buffout 4 NG alongside it — duplicate DLL = CTD at startup.', nexus: '84214' },
  { name: 'CLASSIC (Crash Log Auto Scanner)', desc: 'Auto-parses Addictol/Buffout 4 crash logs, matches FormIDs to plugin records, and cross-references 250+ known crash patterns. Run this before any crash investigation.', nexus: '56255' },
  { name: 'xEdit (FO4Edit)', desc: 'Plugin editor and validator. Use for: Compact FormIDs for ESL, Quick Auto Clean (ITMs/UDRs), conflict resolution, LVLN analysis, record diffing. Version 4.1.5+ supports 1.11.x.', nexus: '2737' },
  { name: 'Address Library for F4SE (All In One)', desc: 'Memory offset database required by all F4SE DLL plugins. For NG/1.11.x: use the "All In One (Anniversary Edition)" build (Nexus #47327). For OG: use the standard build on the same page.', nexus: '47327' },
  { name: 'Wrye Bash', desc: 'Bashed patch builder. Merges leveled lists, weapon/armor tags, NPC face data. Required for any load order with more than one LVLN-editing mod.', nexus: '20840' },
  { name: 'NifSkope 2.0 (dev build)', desc: 'NIF validator and viewer for FO4 meshes. Check BSTriShape block counts, BSLightingShaderProperty, normals, and texture paths. Use before placing any custom mesh in CK.', nexus: '' },
  { name: 'DynDOLOD 3 + xLODGen + TexGen', desc: 'Full LOD pipeline: xLODGen (terrain/water LOD) → TexGen (LOD textures) → DynDOLOD (object/tree LOD). Run this exact order after any worldspace change. DynDOLOD NG is for NG/1.11.x.', nexus: '61931' },
  { name: 'LOOT (Load Order Optimisation Tool)', desc: 'Sorts plugins and flags known issues (missing masters, conflicting plugins). Run before testing any new mod configuration.', nexus: '' },
  { name: 'PRP (Previsibines Repair Pack)', desc: 'Restores broken precombine/previs data for heavily-modded load orders. Use v81.5+ for NG/AE/1.11.x. Load after all worldspace-editing mods.', nexus: '46403' },
  { name: 'Spriggit', desc: 'Converts ESP/ESM plugins to human-readable YAML for Git version control. Essential for collaborative mod projects. Works with Mossy Spriggit Digest integration.', nexus: '' },
  { name: 'MCM NG', desc: 'NG-native Mod Configuration Menu replacement. Required for any mod using MCM on NG/1.11.x. Incompatible with legacy MCM DLL — remove legacy first.', nexus: '' },
  { name: 'Papyrus Compiler (standalone)', desc: 'Compile PSC → PEX outside the CK via command line. Used for batch script builds, CI pipelines, and Mossy CK Extension compiler queue. Ships with the CK at Data\\Papyrus Compiler\\PapyrusCompiler.exe.', nexus: '' },
];

const PAPYRUS_TIPS = [
  { tip: 'Use OnActivate instead of OnHit for item pickups', why: 'OnHit fires for all projectile impacts; OnActivate is the correct trigger for player interaction.' },
  { tip: 'RegisterForSingleUpdate() instead of RegisterForUpdate()', why: 'Continuous RegisterForUpdate() is a performance sink. Chain OnUpdate → RegisterForSingleUpdate with a small delay interval instead. Continuous update is the #1 cause of Papyrus budget overrun in large mod lists.' },
  { tip: 'Balance every AddInventoryEventFilter with RemoveInventoryEventFilter', why: 'Each unmatched AddInventoryEventFilter call grows the filter list permanently on the Actor. After enough calls it causes a Papyrus stack overflow CTD. Always call Remove in your OnReset/cleanup event.' },
  { tip: 'Always guard with Utility.IsInMenuMode()', why: 'Scripts running during the main menu can cause null-ref crashes. Guard timed scripts with this check.' },
  { tip: 'Avoid Form.GetName() in tight loops', why: 'String operations in Papyrus are slow. Cache the name string in a variable rather than calling GetName() repeatedly.' },
  { tip: 'Use Quest aliases for persistent actor references', why: 'Actor references stored in properties go None after save/load if the actor is not persistent. Use a Quest alias with a Fill condition instead.' },
  { tip: 'None-check every GetActorBase() / GetLinkedRef() result before use', why: 'Runtime-spawned actors and refs without linked targets return None. Calling methods on None causes a silent script abort and may cascade into a CTD on the next GC cycle.' },
  { tip: 'F4SE for complex engine interactions', why: 'Papyrus cannot directly write to INI settings, manipulate inventory without picking up, or access low-level game state. Use an F4SE C++ plugin for these needs, and call it via a native function registered to Papyrus.' },
  { tip: 'Tune Papyrus budget in Fallout4Custom.ini for scripted mod lists', why: '[Papyrus] fUpdateBudgetMS=2.4, iMinMemoryPageSize=256, iMaxMemoryPageSize=512. Default budget (1.2 ms) is too low for SS2, Horizon, and similar complex mods. Do not exceed 4.0 ms — it causes world update hitches.' },
];

const severityColor = (s: string) =>
  s === 'critical' ? 'text-red-400 border-red-500/30 bg-red-950/20'
  : s === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-950/20'
  : 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20';

const FO4CKGuide: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Creation Kit Reference</h2>
      <p className="text-emerald-100/80">
        Comprehensive guide to CK crash causes, best practices, Papyrus scripting tips, and essential tools
        — covering vanilla CK workflow, CK Platform Extended, Addictol, CLASSIC, and F4SE integration.
      </p>
    </div>

    {/* NG/AE CK Version Guide */}
    <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-5">
      <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> CK Version &amp; NG/AE Compatibility
      </h3>
      <div className="space-y-2 text-xs text-slate-200">
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <span className="font-bold text-white">OG (1.10.163.0): </span>Use CK 1.10.130.0 + CKPE 0.3.x (Nexus #51998). F4SE 0.6.x. Address Library "OG" build. BA2 archives are Header V1. Addictol #84214 (OG channel).
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <span className="font-bold text-white">NG/AE (1.10.982 – 1.10.984): </span>Use the NG CK (Steam depot 1091810) + CKPE 0.5+. F4SE 0.7.x. Address Library "All In One (Anniversary Edition)" build. BA2 archives default to V7 (General) / V8 (Textures). Addictol #84214 (NG channel).
        </div>
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3">
          <span className="font-bold text-amber-200">1.11.x — Creations Menu Update (Nov 2025+): </span>Bethesda's largest engine update since AE. F4SE <span className="text-red-300 font-bold">0.7.7+ required</span> — earlier F4SE versions will crash silently. Address Library: use the "All In One (Anniversary Edition)" build from Nexus #47327. CKPE: use 0.5.6+ for 1.11.x. <span className="text-amber-300">Every F4SE DLL plugin in your load order must be rebuilt for this runtime</span> — check each mod's Nexus page for a "1.11.x compatibility update." If a DLL plugin has no 1.11.x update, disable it until the author publishes one.
        </div>
        <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-3">
          <span className="font-bold text-red-300">⚠ BA2 cross-version warning (V1 vs V7/V8): </span>The NG CK builds V7 (General) and V8 (Textures) BA2 archives. OG game (1.10.163) <span className="font-bold">cannot load</span> V7/V8 archives and will crash on startup. If your mod supports both OG and NG: pack two separate BA2 files or use a FOMOD selector. Command: <code className="font-mono text-emerald-300">Archive2.exe &lt;folder&gt; -format=General -create=&lt;output.ba2&gt; -root=&lt;dataPath&gt;</code> — OG requires adding <code className="font-mono text-emerald-300">-setCompressionOptions=Default</code> and Archive2 from the OG CK.
        </div>
        <div className="rounded-lg border border-red-700/40 bg-red-950/20 p-3">
          <span className="font-bold text-red-300">⚠ Addictol vs standalone Buffout 4 NG — DO NOT install both: </span>Addictol (Nexus #84214) is an all-in-one stability bundle that <span className="font-bold">already includes</span> Buffout 4 NG, X-Cell, BakaMaxPapyrusOps, Faster Workshop, and more. If you install standalone Buffout 4 NG alongside Addictol, you get two copies of the same DLL — this causes immediate CTD on game launch. Choose one: <span className="text-emerald-300">Addictol</span> (recommended, all-in-one) <em>or</em> standalone Buffout 4 NG (manual setup), never both.
        </div>
      </div>
    </div>

    {/* Deprecated Frameworks */}
    <div className="rounded-xl border border-red-600/40 bg-red-950/20 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Deprecated Frameworks — Do Not Use on NG/AE
      </h3>
      <div className="space-y-2 text-xs text-slate-200">
        {[
          { name: 'AWKCR', why: 'Causes save bloat and instant CTD at any armor/weapons workbench on NG/AE. Save files become permanently corrupted after even a brief session with AWKCR loaded.', fix: 'Replace with ECO (Equipment & Crafting Overhaul, Nexus #55503) or NEO (New Equipment Overhaul). Run xEdit to re-map any COBJ recipe keywords.' },
          { name: 'Armorsmith Extended', why: 'Hard dependency on AWKCR. Overwrites vanilla armor slots and breaks CBBE/3BBB/HIMBO body mesh assignments. No NG-compatible version exists.', fix: 'Replace with LEO (Legendary Effect Overhaul) + ECO/NEO keyword system. Remove all AWKCR/Armorsmith master references in xEdit.' },
          { name: 'DEF_UI / DEF_HUD', why: 'Hardcodes 2015-era Flash (.swf) interface files. NG/AE UI engine changes cause instant CTD on pause menu, map, and pip-boy open.', fix: 'Replace with FallUI Suite: FallUI - HUD (Nexus #51813) + FallUI - Inventory + FallUI - Map for a fully NG-native UI stack.' },
          { name: 'Legacy MCM Framework DLL', why: 'The original MCM DLL was compiled for an old F4SE ABI. It fails to load on NG/1.11.x and causes F4SE to abort, taking all other DLL plugins with it.', fix: 'Install MCM NG (search Nexus for "MCM NG"). Incompatible with legacy MCM — remove legacy before installing.' },
          { name: 'Standalone Buffout 4 NG (alongside Addictol)', why: 'Addictol already bundles Buffout 4 NG. Installing both loads the same DLL twice, causing immediate game crash at startup.', fix: 'Use Addictol (Nexus #84214) alone. It is the recommended all-in-one stability stack for both OG and NG/1.11.x.' },
        ].map((f) => (
          <div key={f.name} className="rounded-lg border border-red-700/30 bg-red-950/10 p-3">
            <div className="font-bold text-red-200">❌ {f.name}</div>
            <div className="text-slate-300 mt-1"><span className="text-slate-400">Why: </span>{f.why}</div>
            <div className="text-emerald-300 mt-1"><span className="text-slate-400">Fix: </span>{f.fix}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Common CK Crash Causes */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Common CK Crash Causes
      </h3>
      <div className="space-y-3">
        {CRASH_CAUSES.map((c) => (
          <div key={c.cause} className={`rounded-lg border p-4 ${severityColor(c.severity)}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current opacity-80">
                {c.severity}
              </span>
              <span className="font-semibold text-white text-xs">{c.cause}</span>
            </div>
            <p className="text-xs text-slate-300">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Best Practices */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <CheckCircle className="h-5 w-5" /> CK Best Practices
      </h3>
      <div className="space-y-3">
        {BEST_PRACTICES.map((p) => (
          <div key={p.title} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">{p.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Papyrus Scripting Tips */}
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
        <Info className="h-5 w-5" /> Papyrus Scripting Tips
      </h3>
      <div className="space-y-3">
        {PAPYRUS_TIPS.map((t) => (
          <div key={t.tip} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-xs">{t.tip}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.why}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ESL / FormID Rules */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-3">ESL / FormID Quick Reference</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-2 pr-4">Plugin Type</th>
              <th className="text-left py-2 pr-4">FormID Range</th>
              <th className="text-left py-2 pr-4">Max New Records</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { type: 'ESP (full)', range: '0x000800–0xFFFFF per mod', max: '16,776,704', notes: 'Standard plugin. Counts toward 255 plugin limit.' },
              { type: 'ESM (master)', range: 'Same as ESP but flags as master', max: '16,776,704', notes: 'Used by other plugins as dependency. Full range.' },
              { type: 'ESL (light)', range: '0x000–0xFFF (0–4095)', max: '4096', notes: 'Does NOT count toward 255 limit. Shares the 4096 ceiling with ESL-flagged ESPs. Exceeding 0xFFF causes save corruption.' },
              { type: 'ESL-flagged ESP', range: '0x000–0xFFF', max: '4096', notes: 'Regular ESP with ESL flag. Shares the 4096 ceiling with ESL files. Compact FormIDs first.' },
              { type: 'ESM flagged as ESL', range: '0x000–0x7FF', max: '2048', notes: 'Rare. Used for large content split across ESL-size chunks.' },
            ].map((row) => (
              <tr key={row.type} className="border-b border-slate-800/60">
                <td className="py-2 pr-4 font-semibold text-white">{row.type}</td>
                <td className="py-2 pr-4 font-mono text-emerald-300 text-[10px]">{row.range}</td>
                <td className="py-2 pr-4 text-slate-300">{row.max}</td>
                <td className="py-2 text-slate-400">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Tools Reference */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">Essential CK Tools</h3>
      <div className="grid grid-cols-1 gap-2">
        {CK_TOOLS_REF.map((t) => (
          <div key={t.name} className="flex gap-3 items-start">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white">{t.name}</span>
              {t.nexus && (
                <span className="text-[10px] text-slate-500 ml-2 font-mono">Nexus #{t.nexus}</span>
              )}
              <span className="text-slate-400 ml-2 text-xs">{t.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// Main Hub Component
// ============================================================================

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
    }
  >
    {children}
  </Suspense>
);

const CKToolsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('safety');

  useEffect(() => {
    const saved = sessionStorage.getItem('ck_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);

    // Support ?tab= query param for deep-link (e.g. /ck-tools?tab=safety|extension|guide|quests|anim|saves|livemon|gameint)
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    const tabParam = params.get('tab') as HubTab | null;
    if (tabParam && TAB_DEFS.some((t) => t.id === tabParam)) setActiveTab(tabParam);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ck_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Shield className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Creation Kit Hub</h1>
            <p className="text-xs text-slate-400">Creation Kit safety, auto-save, script compilation, and FO4 CK reference — all in one place</p>
          </div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TAB_DEFS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`text-[10px] ${activeTab === tab.id ? 'text-emerald-400/80' : 'text-slate-600'}`}>
                {tab.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'safety' && (
          <PanelLoader>
            <CKCrashPrevention />
          </PanelLoader>
        )}
        {activeTab === 'extension' && (
          <PanelLoader>
            <CKExtension />
          </PanelLoader>
        )}
        {activeTab === 'guide' && <FO4CKGuide />}
        {activeTab === 'quests' && (
          <PanelLoader>
            <QuestEditor />
          </PanelLoader>
        )}
        {activeTab === 'anim' && (
          <PanelLoader>
            <AnimationEditor />
          </PanelLoader>
        )}
        {activeTab === 'saves' && (
          <PanelLoader>
            <SaveGameParser />
          </PanelLoader>
        )}
        {activeTab === 'livemon' && (
          <PanelLoader>
            <LiveGameMonitor />
          </PanelLoader>
        )}
        {activeTab === 'gameint' && (
          <PanelLoader>
            <GameIntegration />
          </PanelLoader>
        )}
        {activeTab === 'inspector' && <PluginInspectorPanel />}
        {activeTab === 'checklist' && <PrePublishChecklist />}
        {activeTab === 'inifix' && <IniValidatorPanel />}
      </div>
    </div>
  );
};

export default CKToolsHub;
