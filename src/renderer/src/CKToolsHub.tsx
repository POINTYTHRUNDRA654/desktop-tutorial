/**
 * CK Tools Hub
 *
 * Unified platform for all Creation Kit work in Fallout 4 modding.
 * Consolidates: CK Safety (Crash Prevention) · CK Extension (auto-save, scripting) · FO4 CK Guide
 */

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Shield, Wrench, BookOpen, ChevronRight, AlertTriangle, CheckCircle, Info, Scroll, Activity, Save, Monitor, Link, Search, ClipboardList, Settings, Package, FileCode, Cpu, Zap, XCircle, HelpCircle, RefreshCw, Hammer, Terminal, GitMerge, FolderOpen, ChevronDown, Loader2, CheckCircle2, FilePlus, Skull, Code2 } from 'lucide-react';
import { bridgeFetch } from './lib/bridgeClient';

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
// Plugin Repair Platform — Inspector + Auto-Fix + Patch Creator
// ============================================================================

interface PluginWarning {
  level: 'error' | 'warn' | 'info';
  msg: string;
  fixId?: string;
  fixLabel?: string;
}

interface PluginInspectorResult {
  formIdCount: number;
  numRecords: number;
  eslSafe: boolean;
  eslFlag: boolean;
  esmFlag: boolean;
  masters: string[];
  hasNavmesh: boolean;
  hasPrecombines: boolean;
  hasScripts: boolean;
  deletedNavmeshCount: number;
  fileSizeMB: number;
  ba2Archives: string[];
  typeCounts: Record<string, number>;
  warnings: PluginWarning[];
}

interface FixLogEntry {
  ts: string;
  action: string;
  ok: boolean;
  msg: string;
}

type InspectorTab = 'inspect' | 'patch' | 'previs' | 'ckpe';

const PluginInspectorPanel: React.FC = () => {
  const api = () => (window as any).electron?.api || (window as any).electronAPI;

  // ── Main inspect state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<InspectorTab>('inspect');
  const [pluginPath, setPluginPath] = useState('');
  const [result, setResult] = useState<PluginInspectorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState('');

  // ── Fix state ────────────────────────────────────────────────────────────────
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixAll, setFixAll] = useState(false);
  const [fixLog, setFixLog] = useState<FixLogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Patch creator state ──────────────────────────────────────────────────────
  const [patchA, setPatchA] = useState('');
  const [patchB, setPatchB] = useState('');
  const [patchOut, setPatchOut] = useState('');
  const [patchWinner, setPatchWinner] = useState<'A' | 'B'>('B');
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [patchBusy, setPatchBusy] = useState(false);
  const [patchMsg, setPatchMsg] = useState('');
  const [patchErr, setPatchErr] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const addLog = (action: string, ok: boolean, msg: string) => {
    const entry: FixLogEntry = { ts: new Date().toLocaleTimeString(), action, ok, msg };
    setFixLog(prev => [...prev.slice(-99), entry]);
    setLogOpen(true);
    setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  };

  const warnBorder = (level: string) =>
    level === 'error' ? 'border-red-600/40 bg-red-950/20 text-red-300'
    : level === 'warn'  ? 'border-yellow-600/40 bg-yellow-950/20 text-yellow-300'
    : 'border-sky-600/30 bg-sky-950/10 text-sky-300';

  const warnIcon = (level: string) =>
    level === 'error' ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
    : level === 'warn'  ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
    : <Info className="h-3.5 w-3.5 flex-shrink-0" />;

  // ── Pick plugin from disk ───────────────────────────────────────────────────
  const pickPlugin = async (setter: (p: string) => void) => {
    const a = api();
    if (!a) return;
    try {
      const res = typeof a.ckPickPlugin === 'function' ? await a.ckPickPlugin()
        : typeof a.invoke === 'function' ? await a.invoke('ck-crash-prevention:pick-plugin') : null;
      if (res?.success && res.path) setter(res.path);
    } catch { /* silent */ }
  };

  // ── Deep scan ──────────────────────────────────────────────────────────────
  const runInspect = useCallback(async () => {
    if (!pluginPath.trim()) { setScanError('Enter or browse to a plugin path first.'); return; }
    setScanError(''); setBusy(true); setResult(null);
    const a = api();
    if (!a?.ckInspectPlugin) { setScanError('Electron API unavailable — run as desktop app.'); setBusy(false); return; }
    try {
      const raw = await a.ckInspectPlugin(pluginPath.trim());
      if (!raw?.success) { setScanError(raw?.error ?? 'Scan failed.'); return; }
      setResult(raw.data);
    } catch (e: any) { setScanError(e?.message ?? 'Unknown error.'); }
    finally { setBusy(false); }
  }, [pluginPath]);

  // ── Run a single fix ────────────────────────────────────────────────────────
  const runFix = useCallback(async (fixId: string, label: string) => {
    const a = api();
    setFixingId(fixId);
    try {
      let res: any = null;
      if (fixId === 'rename') {
        res = await a.ckAutofixRename?.(pluginPath);
        if (res?.newPath) setPluginPath(res.newPath);
      } else if (fixId === 'undelete-navm') {
        res = await a.ckAutofixUndeleteNavmesh?.(pluginPath);
      } else if (fixId === 'launch-xedit-clean') {
        res = await a.ckAutofixLaunchXedit?.(pluginPath, 'clean');
      } else if (fixId === 'launch-xedit-compact') {
        res = await a.ckAutofixLaunchXedit?.(pluginPath, 'compact');
      } else if (fixId === 'launch-xedit-open') {
        res = await a.ckAutofixLaunchXedit?.(pluginPath, 'open');
      } else if (fixId === 'rebuild-precombines') {
        res = await a.ckAutofixRebuildPrecombines?.(pluginPath);
      }
      if (res) addLog(label, !!res.success, res.message ?? res.error ?? (res.success ? 'Done.' : 'Failed.'));
      // Re-scan after binary fix so results update
      if (res?.success && (fixId === 'rename' || fixId === 'undelete-navm')) {
        await runInspect();
      }
    } catch (e: any) { addLog(label, false, e?.message ?? 'Error.'); }
    finally { setFixingId(null); }
  }, [pluginPath, runInspect]);

  // ── Run all automatable fixes in sequence ───────────────────────────────────
  const runAllFixes = useCallback(async () => {
    if (!result) return;
    setFixAll(true);
    const fixableIds = [...new Set(result.warnings.filter(w => w.fixId).map(w => w.fixId!))];
    for (const fid of fixableIds) {
      const w = result.warnings.find(x => x.fixId === fid);
      if (w) await runFix(fid, w.fixLabel ?? fid);
    }
    setFixAll(false);
  }, [result, runFix]);

  // ── Patch creator ───────────────────────────────────────────────────────────
  const scanConflicts = async () => {
    const a = api();
    if (!a?.ckScanConflicts) { setPatchErr('Electron API unavailable.'); return; }
    setPatchBusy(true); setPatchErr(''); setConflictResult(null); setPatchMsg('');
    try {
      const res = await a.ckScanConflicts(patchA, patchB);
      if (!res?.success) { setPatchErr(res?.error ?? 'Scan failed.'); return; }
      setConflictResult(res);
    } catch (e: any) { setPatchErr(e?.message ?? 'Error.'); }
    finally { setPatchBusy(false); }
  };

  const createPatch = async () => {
    const a = api();
    if (!a?.ckCreatePatch) { setPatchErr('Electron API unavailable.'); return; }
    if (!patchOut.trim()) { setPatchErr('Enter a path for the patch file (e.g. C:\\FO4\\Data\\Patch.esp).'); return; }
    setPatchBusy(true); setPatchErr(''); setPatchMsg('');
    try {
      const res = await a.ckCreatePatch(patchA, patchB, patchOut, patchWinner, xeditPathInput.trim() || undefined);
      if (!res?.success) { setPatchErr(res?.error ?? 'Patch creation failed.'); return; }
      setPatchMsg(res.message ?? `Patch written to ${res.patchPath}`);
    } catch (e: any) { setPatchErr(e?.message ?? 'Error.'); }
    finally { setPatchBusy(false); }
  };

  // ── Previsbines & PRP state ─────────────────────────────────────────────────
  const [envResult,    setEnvResult]    = useState<any>(null);
  const [envBusy,      setEnvBusy]      = useState(false);
  const [setupMsg,     setSetupMsg]     = useState('');
  const [xcriPlugin,   setXcriPlugin]   = useState('');
  const [xcriCells,    setXcriCells]    = useState<any[] | null>(null);
  const [xcirBusy,     setXcirBusy]     = useState(false);
  const [xcriErr,      setXcriErr]      = useState('');
  const [prpPlugin,    setPrpPlugin]    = useState('');
  const [prpFile,      setPrpFile]      = useState('');
  const [prpOut,       setPrpOut]       = useState('');
  const [prpBusy,      setPrpBusy]      = useState(false);
  const [prpMsg,       setPrpMsg]       = useState('');
  const [prpErr,       setPrpErr]       = useState('');
  const [cleanPlugin,  setCleanPlugin]  = useState('');
  const [cleanBusy,    setCleanBusy]    = useState(false);
  const [cleanMsg,     setCleanMsg]     = useState('');
  const [previsPlugin, setPrevisPlugin] = useState('');
  const [previsStep,   setPrevisStep]   = useState<'idle'|'checking'|'generating'>('idle');
  const [previsMsg,    setPrevisMsg]    = useState('');
  const [blankPluginBusy, setBlankPluginBusy] = useState(false);
  const [dataDirInput, setDataDirInput] = useState('');
  const [xeditPathInput, setXeditPathInput] = useState('');

  // ── CKPE Diagnostics state (real per-cell precombine conflicts, script/anim/
  // form warnings, and crash-dump detection — all read from CKPE's own log and
  // crash folder via the Bridge, never synthesized) ──────────────────────────
  const [ckpeStatus, setCkpeStatus] = useState<any>(null);
  const [ckpeCrash, setCkpeCrash] = useState<any>(null);
  const [ckpeBusy, setCkpeBusy] = useState(false);
  const [ckpeErr, setCkpeErr] = useState('');
  const [lastSeenCrashMtime, setLastSeenCrashMtime] = useState<string>(() =>
    localStorage.getItem('ck_last_seen_crash_mtime') || ''
  );

  const runCkpeCheck = useCallback(async () => {
    setCkpeBusy(true); setCkpeErr('');
    try {
      const [logRes, crashRes] = await Promise.all([
        bridgeFetch('/ck/precombine-status', { method: 'GET' }),
        bridgeFetch('/ck/crash-status', { method: 'GET' }),
      ]);
      setCkpeStatus(await logRes.json());
      setCkpeCrash(await crashRes.json());
    } catch (e: any) {
      setCkpeErr(e?.message ?? 'Could not reach the Desktop Bridge — make sure it is running (Runtime Hub → Desktop Bridge).');
    } finally {
      setCkpeBusy(false);
    }
  }, []);

  const isNewCrash = !!(
    ckpeCrash?.detected && ckpeCrash?.listed && ckpeCrash.mostRecent &&
    (!lastSeenCrashMtime || new Date(ckpeCrash.mostRecent.mtime).getTime() > new Date(lastSeenCrashMtime).getTime())
  );

  const acknowledgeCrash = () => {
    if (ckpeCrash?.detected && ckpeCrash?.listed && ckpeCrash.mostRecent) {
      localStorage.setItem('ck_last_seen_crash_mtime', ckpeCrash.mostRecent.mtime);
      setLastSeenCrashMtime(ckpeCrash.mostRecent.mtime);
    }
  };

  // Default the xEdit path from settings so Step 1/3 don't require retyping it.
  useEffect(() => {
    (async () => {
      try {
        const s = await (window as any).electronAPI?.getSettings?.();
        if (s?.xeditPath) setXeditPathInput(s.xeditPath);
      } catch { /* settings unavailable */ }
    })();
  }, []);

  const pickDataDir = async () => {
    const a = api();
    if (!a?.pickDirectory) return;
    try {
      const dir = await a.pickDirectory('Select your Fallout 4 Data folder');
      if (dir) setDataDirInput(dir);
    } catch { /* silent */ }
  };

  const runEnvCheck = async () => {
    const a = api(); if (!a?.ckEnvCheck) return;
    if (!dataDirInput.trim()) { setSetupMsg('Enter or browse to your Fallout 4 Data folder first.'); return; }
    setEnvBusy(true); setEnvResult(null); setSetupMsg('');
    try {
      const r = await a.ckEnvCheck(dataDirInput.trim());
      if (r?.success) {
        setEnvResult(r);
        if (r.xedit?.found && r.xedit.path) setXeditPathInput(r.xedit.path);
      } else {
        setSetupMsg(r?.error ?? 'Environment check failed.');
      }
    }
    catch (e: any) { setSetupMsg(e?.message ?? 'Error.'); } finally { setEnvBusy(false); }
  };
  const runSetupEnv = async () => {
    const a = api(); if (!a?.ckSetupGenerationEnv) return;
    if (!envResult?.fo4Dir) { setSetupMsg('Run Environment Check first.'); return; }
    try { const r = await a.ckSetupGenerationEnv(envResult.fo4Dir); setSetupMsg(r?.message ?? (r?.success ? 'Done.' : r?.error ?? 'Failed.')); }
    catch (e: any) { setSetupMsg(e?.message ?? 'Error.'); }
  };
  const runXcriScan = async () => {
    const a = api(); if (!a?.ckDetectXcriCells || !xcriPlugin.trim()) return;
    setXcirBusy(true); setXcriErr(''); setXcriCells(null);
    try {
      const r = await a.ckDetectXcriCells(xcriPlugin.trim());
      if (!r?.success) { setXcriErr(r?.error ?? 'Scan failed.'); return; }
      setXcriCells(r.cells ?? []);
    } catch (e: any) { setXcriErr(e?.message ?? 'Error.'); }
    finally { setXcirBusy(false); }
  };
  const runPrpPatch = async () => {
    const a = api(); if (!a?.ckCreatePrpPatch) return;
    if (!prpPlugin.trim() || !prpFile.trim() || !prpOut.trim()) { setPrpErr('All three paths are required.'); return; }
    setPrpBusy(true); setPrpErr(''); setPrpMsg('');
    try {
      const r = await a.ckCreatePrpPatch(prpPlugin.trim(), prpFile.trim(), prpOut.trim(), xeditPathInput.trim() || undefined);
      if (!r?.success) { setPrpErr(r?.error ?? 'Failed.'); return; }
      setPrpMsg(r.message ?? `Patch written to ${r.patchPath}`);
    } catch (e: any) { setPrpErr(e?.message ?? 'Error.'); }
    finally { setPrpBusy(false); }
  };
  const runClean = async () => {
    const a = api(); if (!a?.ckCleanPluginPrecombines || !cleanPlugin.trim()) return;
    if (!xeditPathInput.trim()) { setCleanMsg('Enter the path to FO4Edit.exe / xEdit first (see Environment Check).'); return; }
    setCleanBusy(true); setCleanMsg('');
    try {
      const r = await a.ckCleanPluginPrecombines(cleanPlugin.trim(), xeditPathInput.trim());
      setCleanMsg(r?.message ?? (r?.success ? 'xEdit launched.' : r?.error ?? 'Failed.'));
    } catch (e: any) { setCleanMsg(e?.message ?? 'Error.'); }
    finally { setCleanBusy(false); }
  };
  const runPrevis = async (mode: 'check' | 'generate') => {
    const a = api(); if (!a?.ckLaunchPrevisWorkflow) return;
    if (!xeditPathInput.trim()) { setPrevisMsg('Enter the path to FO4Edit.exe / xEdit first (see Environment Check).'); return; }
    setPrevisStep(mode === 'check' ? 'checking' : 'generating'); setPrevisMsg('');
    try {
      const r = await a.ckLaunchPrevisWorkflow(previsPlugin.trim(), xeditPathInput.trim(), mode);
      setPrevisMsg(r?.message ?? (r?.success ? 'Launched.' : r?.error ?? 'Failed.'));
    } catch (e: any) { setPrevisMsg(e?.message ?? 'Error.'); }
    finally { setPrevisStep('idle'); }
  };

  // Copies the bundled blank/dummy plugin template to a user-chosen path (native Save dialog)
  // and drops the result straight into the previs plugin field — never touches the template itself.
  const createBlankPrevisPlugin = async () => {
    const a = api(); if (!a?.ckCreateBlankPlugin) { setPrevisMsg('Blank plugin API not available — ensure you are running the packaged app.'); return; }
    setBlankPluginBusy(true); setPrevisMsg('');
    try {
      const r = await a.ckCreateBlankPlugin('previs');
      if (r?.success && r.path) {
        setPrevisPlugin(r.path);
        setPrevisMsg(`Created blank previs plugin at ${r.path}`);
      } else if (r?.error && r.error !== 'Cancelled.') {
        setPrevisMsg(r.error);
      }
    } catch (e: any) { setPrevisMsg(e?.message ?? 'Error.'); }
    finally { setBlankPluginBusy(false); }
  };

  // ── Plugin type label from flags ────────────────────────────────────────────
  const pluginTypeLabel = (r: PluginInspectorResult) => {
    if (r.esmFlag && r.eslFlag) return 'ESM-as-ESL (2048 FormID cap)';
    if (r.eslFlag) return 'ESL-flagged ESP';
    if (r.esmFlag) return 'ESM (Master File)';
    const ext = pluginPath.split('.').pop()?.toLowerCase();
    if (ext === 'esl') return 'ESL (Light Plugin)';
    if (ext === 'esm') return 'ESM (Master File)';
    return 'ESP (Standard Plugin)';
  };

  const fixableCount = result?.warnings.filter(w => w.fixId).length ?? 0;
  const errorCount   = result?.warnings.filter(w => w.level === 'error').length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 text-sm text-slate-200">

      {/* Header */}
      <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-900/20 to-black/40 p-5">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <Hammer className="h-5 w-5 text-sky-300" />
          <h2 className="text-xl font-black text-white">Plugin Repair Platform</h2>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-900/40 border border-red-600/40 text-red-300 text-[10px] font-bold">{errorCount} ERROR{errorCount > 1 ? 'S' : ''}</span>
          )}
        </div>
        <p className="text-sky-100/70 text-xs">Binary deep-scan · Auto-fix (NAVM undelete, rename, xEdit launch, CK rebuild) · Compatibility patch creator</p>
        {/* Tab bar */}
        <div className="flex gap-1 mt-4">
          {([['inspect', Search, 'Inspect & Fix'], ['patch', GitMerge, 'Patch Creator'], ['previs', Zap, 'Previsbines & PRP'], ['ckpe', Skull, 'CKPE Diagnostics']] as [string, any, string][]).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setActiveTab(id as InspectorTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === (id as string) ? 'bg-sky-700/60 text-white border border-sky-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* INSPECT & FIX TAB                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inspect' && (
        <div className="space-y-4">
          {/* Path input */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="flex gap-2">
              <input value={pluginPath} onChange={e => setPluginPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runInspect()}
                placeholder="Path to .esp / .esm / .esl — paste or browse…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <button onClick={() => pickPlugin(setPluginPath)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" /> Browse
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={runInspect} disabled={busy}
                className="flex-1 rounded-lg bg-sky-600 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 text-xs">
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Deep Scanning…</> : <><Search className="h-3.5 w-3.5" />Deep Scan Plugin</>}
              </button>
              {result && fixableCount > 0 && (
                <button onClick={runAllFixes} disabled={fixAll || fixingId !== null}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center gap-1.5">
                  {fixAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hammer className="h-3.5 w-3.5" />}
                  Auto-Fix All ({fixableCount})
                </button>
              )}
            </div>
            {scanError && <p className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />{scanError}</p>}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Type',      value: pluginTypeLabel(result), color: 'text-sky-300' },
                  { label: 'FormIDs',   value: result.formIdCount < 0 ? '—' : result.formIdCount.toLocaleString(), color: result.formIdCount > 4096 ? 'text-red-400' : 'text-emerald-300' },
                  { label: 'File Size', value: result.fileSizeMB < 0 ? '—' : `${result.fileSizeMB.toFixed(1)} MB`, color: result.fileSizeMB > 80 ? 'text-amber-400' : 'text-slate-300' },
                  { label: 'Masters',   value: result.masters.length === 0 ? 'None listed' : String(result.masters.length), color: 'text-slate-300' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{item.label}</div>
                    <div className={`font-bold text-xs ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Feature chips */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Navmesh',   value: result.hasNavmesh,     badge: result.deletedNavmeshCount > 0 ? `${result.deletedNavmeshCount} DELETED` : undefined },
                  { label: 'Precombines', value: result.hasPrecombines },
                  { label: 'Scripts',   value: result.hasScripts },
                  { label: 'ESL-Safe',  value: result.eslSafe, good: true },
                ].map(f => (
                  <div key={f.label} className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                    f.badge ? 'border-red-600/40 bg-red-950/20 text-red-300' :
                    f.good ? (f.value ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300' : 'border-slate-700 bg-slate-900/40 text-slate-500') :
                    f.value ? 'border-amber-600/40 bg-amber-950/20 text-amber-300' : 'border-slate-700 bg-slate-900/40 text-slate-500'
                  }`}>
                    {f.badge ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> : f.value ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>{f.label}: {f.badge ?? (f.value ? 'Yes' : 'No')}</span>
                  </div>
                ))}
              </div>

              {/* Master list */}
              {result.masters.length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-xs font-bold text-slate-300 mb-2">Master Dependencies ({result.masters.length})</p>
                  <ul className="space-y-0.5">
                    {result.masters.map((m, i) => (
                      <li key={m} className="text-xs font-mono flex items-center gap-2">
                        <span className="text-slate-600 w-5 text-right">{i}</span>
                        <ChevronRight className="h-3 w-3 text-slate-600" />
                        <span className={/fallout4\.esm/i.test(m) ? 'text-emerald-300' : 'text-slate-300'}>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BA2 companions */}
              {result.ba2Archives.length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-xs font-bold text-slate-300 mb-2">BA2 Archives ({result.ba2Archives.length})</p>
                  <ul className="space-y-0.5">
                    {result.ba2Archives.map(b => (
                      <li key={b} className="text-xs font-mono text-sky-300 flex items-center gap-2">
                        <Package className="h-3 w-3 text-slate-500" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Record type breakdown (top 8) */}
              {Object.keys(result.typeCounts ?? {}).length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-xs font-bold text-slate-300 mb-2">Record Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(result.typeCounts)
                      .sort(([,a],[,b]) => b - a).slice(0, 12)
                      .map(([type, count]) => (
                        <span key={type} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                          {type} <span className="text-emerald-400">{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Issues + Fix buttons */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300">Issues & Actions ({result.warnings.length})</p>
                  {result.warnings.map((w, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2.5 flex items-start gap-2 ${warnBorder(w.level)}`}>
                      {warnIcon(w.level)}
                      <p className="flex-1 text-xs leading-relaxed">{w.msg}</p>
                      {w.fixId && w.fixLabel && (
                        <button
                          onClick={() => runFix(w.fixId!, w.fixLabel!)}
                          disabled={fixingId !== null || fixAll}
                          className="shrink-0 px-2.5 py-1 rounded bg-slate-900/60 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          {fixingId === w.fixId
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Hammer className="h-3 w-3" />}
                          {w.fixLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fix log */}
          {fixLog.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
              <button onClick={() => setLogOpen(v => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/40 transition-colors text-left">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Fix Log ({fixLog.length})</span>
                {logOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500 ml-auto" />}
              </button>
              {logOpen && (
                <div ref={logRef} className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1 border-t border-slate-800">
                  {fixLog.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                      <span className="text-slate-600 shrink-0">{e.ts}</span>
                      {e.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />}
                      <span className="text-slate-400 shrink-0">[{e.action}]</span>
                      <span className={e.ok ? 'text-emerald-300' : 'text-red-300'}>{e.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PATCH CREATOR TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'patch' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-500/30 bg-violet-900/10 p-4">
            <p className="text-xs text-violet-200/80">
              Scan two plugins for conflicting record overrides, then generate a compatibility patch ESP that resolves them.
              The patch is ESL-flagged and takes the winning plugin's version of each conflicting record.
              <span className="text-amber-300 font-semibold"> Binary patch — review in xEdit before distributing.</span>
            </p>
          </div>

          {/* Plugin inputs */}
          {[
            { label: 'Plugin A', value: patchA, setter: setPatchA },
            { label: 'Plugin B', value: patchB, setter: setPatchB },
          ].map(({ label, value, setter }) => (
            <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">{label}</p>
              <div className="flex gap-2">
                <input value={value} onChange={e => setter(e.target.value)}
                  placeholder={`Path to ${label} (.esp / .esm / .esl)…`}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button onClick={() => pickPlugin(setter)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5" /> Browse
                </button>
              </div>
            </div>
          ))}

          {/* Scan button */}
          <button onClick={scanConflicts} disabled={patchBusy || !patchA.trim() || !patchB.trim()}
            className="w-full py-2 rounded-lg bg-violet-700 hover:bg-violet-600 border border-violet-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {patchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Scan for Conflicts
          </button>

          {/* Conflict results */}
          {conflictResult && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 space-y-2">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-slate-400">Plugin A overrides: <span className="text-slate-200 font-bold">{conflictResult.totalA}</span></span>
                  <span className="text-slate-400">Plugin B overrides: <span className="text-slate-200 font-bold">{conflictResult.totalB}</span></span>
                  <span className={`font-bold ${conflictResult.conflicts.length > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {conflictResult.conflicts.length} conflict{conflictResult.conflicts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {conflictResult.conflicts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                    {conflictResult.conflicts.slice(0, 50).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="text-amber-400 shrink-0">{c.type}</span>
                        <span className="text-slate-500">{c.key}</span>
                        <span className="text-slate-600">via {c.masterName}</span>
                      </div>
                    ))}
                    {conflictResult.conflicts.length > 50 && (
                      <p className="text-[10px] text-slate-500">… and {conflictResult.conflicts.length - 50} more</p>
                    )}
                  </div>
                )}
              </div>

              {conflictResult.conflicts.length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-300">Create Compatibility Patch</p>

                  {/* Winner selector */}
                  <div className="flex gap-2">
                    {(['A', 'B'] as const).map(w => (
                      <button key={w} onClick={() => setPatchWinner(w)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${patchWinner === w ? 'bg-emerald-800 text-emerald-200 border-emerald-600' : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}>
                        Winner: Plugin {w}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">The winning plugin's record version is used in the patch for each conflict.</p>

                  {/* Output path */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400">Patch output path</p>
                    <input value={patchOut} onChange={e => setPatchOut(e.target.value)}
                      placeholder="e.g. C:\Fallout 4\Data\Patch - A and B.esp"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <button onClick={createPatch} disabled={patchBusy || !patchOut.trim()}
                    className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {patchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus className="h-3.5 w-3.5" />}
                    Create Patch ESP
                  </button>

                  {patchMsg && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-900/20 border border-emerald-600/30 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{patchMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {patchErr && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30 text-xs text-red-300">
              <XCircle className="h-3.5 w-3.5 shrink-0" />{patchErr}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PREVISBINES & PRP TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'previs' && (
        <div className="space-y-5">

          {/* Intro banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 text-xs text-amber-200/80 leading-relaxed">
            <p className="font-bold text-amber-300 mb-1">Precombine / Previs Automation — Full Pipeline</p>
            Exterior cell edits that break precombines cause CTD for users. This panel gives you an automated path
            from detection → cleaning → generation → PRP compatibility patch — entirely inside Mossy, with no manual steps.
            <span className="block mt-1 text-amber-400/70 font-semibold">
              ⚠ Run generation outside MO2 (USVFS causes flickering in generated previs data).
            </span>
          </div>

          {/* ── Environment Check ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-2"><Monitor className="h-3.5 w-3.5 text-sky-400" />Environment Check</p>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-400">Fallout 4 Data Folder</p>
              <div className="flex gap-2">
                <input value={dataDirInput} onChange={e => setDataDirInput(e.target.value)}
                  placeholder="e.g. C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <button onClick={pickDataDir}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-400">FO4Edit / xEdit Path (used by Steps 1 &amp; 3 below)</p>
              <input value={xeditPathInput} onChange={e => setXeditPathInput(e.target.value)}
                placeholder="e.g. C:\Tools\FO4Edit\FO4Edit64.exe (auto-filled after Check if found)"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>

            <button onClick={runEnvCheck} disabled={envBusy || !dataDirInput.trim()}
              className="w-full px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-semibold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
              {envBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}Check Environment
            </button>

            {envResult && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(envResult).filter(([k]) => !['success', 'fo4Dir', 'error'].includes(k)).map(([key, val]: [string, any]) => {
                  const found = typeof val === 'object' ? val?.found : !!val;
                  const label = { ck: 'Creation Kit', ckpe: 'CKPE', xedit: 'FO4Edit / xEdit', pjmScripts: 'PJM Scripts', prp: 'PRP (Nexus)', steamAppId: 'steam_appid.txt', archive2: 'Archive2' }[key] ?? key;
                  const detail = typeof val === 'object' ? (val?.path ?? '') : '';
                  return (
                    <div key={key} className={`rounded-lg border p-2.5 flex items-start gap-2 ${found ? 'border-emerald-600/30 bg-emerald-950/20' : 'border-red-600/30 bg-red-950/20'}`}>
                      {found ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${found ? 'text-emerald-300' : 'text-red-300'}`}>{label}</p>
                        {detail && <p className="text-[10px] text-slate-500 truncate" title={detail}>{detail}</p>}
                        {!found && key === 'steamAppId' && (
                          <button onClick={runSetupEnv} className="mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold transition-colors">
                            Auto-create
                          </button>
                        )}
                        {!found && key === 'ckpe' && (
                          <a href="https://www.nexusmods.com/fallout4/mods/51165" target="_blank" rel="noreferrer" className="mt-1 text-[10px] text-sky-400 underline block">Get CKPE (Nexus)</a>
                        )}
                        {!found && key === 'pjmScripts' && (
                          <a href="https://www.nexusmods.com/fallout4/mods/64382" target="_blank" rel="noreferrer" className="mt-1 text-[10px] text-sky-400 underline block">Get PJM Scripts (Nexus)</a>
                        )}
                        {!found && key === 'prp' && (
                          <a href="https://www.nexusmods.com/fallout4/mods/46403" target="_blank" rel="noreferrer" className="mt-1 text-[10px] text-sky-400 underline block">Get PRP (Nexus)</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {setupMsg && <p className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{setupMsg}</p>}
          </div>

          {/* ── Step 1 — Clean plugin precombines ─────────────────────────── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full w-5 h-5 flex items-center justify-center bg-sky-700 text-white text-[10px] font-black shrink-0">1</span>
              <p className="text-xs font-bold text-slate-200">Clean Existing Precombines from Plugin</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Removes stale XCRI / precombine references from your plugin using the <code className="text-amber-300">FO4RemovePrecombines.pas</code> xEdit script.
              Run this before regenerating so no old data conflicts with the new geometry.
            </p>
            <div className="flex gap-2">
              <input value={cleanPlugin} onChange={e => setCleanPlugin(e.target.value)}
                placeholder="Path to your .esp / .esm…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <button onClick={() => pickPlugin(setCleanPlugin)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={runClean} disabled={cleanBusy || !cleanPlugin.trim()}
              className="w-full py-2 rounded-lg bg-sky-700 hover:bg-sky-600 border border-sky-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {cleanBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
              Launch xEdit — Remove Precombines
            </button>
            {cleanMsg && <p className={`text-xs flex items-center gap-1 ${cleanMsg.toLowerCase().includes('fail') || cleanMsg.toLowerCase().includes('error') ? 'text-red-400' : 'text-emerald-300'}`}>
              {cleanMsg.toLowerCase().includes('fail') ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{cleanMsg}
            </p>}
          </div>

          {/* ── Step 2 — Scan for XCRI / broken cells ─────────────────────── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full w-5 h-5 flex items-center justify-center bg-violet-700 text-white text-[10px] font-black shrink-0">2</span>
              <p className="text-xs font-bold text-slate-200">Detect Broken Precombine Cells (XCRI Scanner)</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Binary scan of your plugin for CELL records that override vanilla precombined geometry zones (XCRI subrecords or REFR additions inside precombine cells).
              Each hit = a cell that will CTD for users who don't have precombines regenerated.
            </p>
            <div className="flex gap-2">
              <input value={xcriPlugin} onChange={e => setXcriPlugin(e.target.value)}
                placeholder="Path to your .esp / .esm…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={() => pickPlugin(setXcriPlugin)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={runXcriScan} disabled={xcirBusy || !xcriPlugin.trim()}
              className="w-full py-2 rounded-lg bg-violet-700 hover:bg-violet-600 border border-violet-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {xcirBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Scan for Broken Cells
            </button>
            {xcriErr && <p className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />{xcriErr}</p>}
            {xcriCells !== null && (
              <div className="space-y-2">
                <p className={`text-xs font-semibold ${xcriCells.length === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {xcriCells.length === 0 ? '✓ No broken precombine cells detected.' : `${xcriCells.length} cell${xcriCells.length !== 1 ? 's' : ''} with precombine overrides:`}
                </p>
                {xcriCells.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-700 p-2">
                    {xcriCells.slice(0, 100).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                        <span className="text-amber-400 shrink-0">{c.formId ?? '?'}</span>
                        <span className="text-slate-500">{c.reason}</span>
                        {c.refrCount > 0 && <span className="text-slate-600">{c.refrCount} REFR overrides</span>}
                      </div>
                    ))}
                    {xcriCells.length > 100 && <p className="text-[10px] text-slate-500">… and {xcriCells.length - 100} more</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 3 — Generate previsbines ─────────────────────────────── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full w-5 h-5 flex items-center justify-center bg-emerald-700 text-white text-[10px] font-black shrink-0">3</span>
              <p className="text-xs font-bold text-slate-200">Regenerate Precombines & Previs</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Uses the PJM Scripts workflow: <code className="text-amber-300">FO4Check_Previsbines.pas</code> (xEdit) + <code className="text-amber-300">GeneratePrevisibines.bat</code>.
              Step A runs an xEdit check to ensure the plugin is ready. Step B spawns the full generation batch — this takes 10–60+ minutes depending on cell count.
            </p>
            <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-950/10 text-[11px] text-amber-300/80 space-y-1">
              <p className="font-semibold text-amber-300">Before generating:</p>
              <p>• MO2 must be closed (USVFS causes flickering artefacts in output)</p>
              <p>• CKPE must be installed (v0.3 for OG CK, v0.5 for NG CK)</p>
              <p>• steam_appid.txt must contain "1946160" in FO4 root — use Environment Check above</p>
              <p>• Estimated time: ~15 min for small mods, 60+ min for large worldspace edits</p>
            </div>
            <div className="flex gap-2">
              <input value={previsPlugin} onChange={e => setPrevisPlugin(e.target.value)}
                placeholder="Path to your .esp / .esm…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => pickPlugin(setPrevisPlugin)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={createBlankPrevisPlugin} disabled={blankPluginBusy}
              title="Save a copy of a blank dummy plugin to use as the active file during generation — keeps previs data out of your real ESP."
              className="w-full py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
              {blankPluginBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderOpen className="h-3 w-3" />}
              No plugin yet? Create a blank dummy plugin…
            </button>
            <div className="flex gap-2">
              <button onClick={() => runPrevis('check')} disabled={previsStep !== 'idle' || !previsPlugin.trim()}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {previsStep === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Step A — xEdit Check
              </button>
              <button onClick={() => runPrevis('generate')} disabled={previsStep !== 'idle' || !previsPlugin.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {previsStep === 'generating' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Step B — Generate Previsbines
              </button>
            </div>
            {previsMsg && <p className={`text-xs flex items-center gap-1 ${previsMsg.toLowerCase().includes('fail') || previsMsg.toLowerCase().includes('error') ? 'text-red-400' : 'text-emerald-300'}`}>
              {previsMsg.toLowerCase().includes('fail') ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{previsMsg}
            </p>}
          </div>

          {/* ── Step 4 — PRP Compatibility Patch ──────────────────────────── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full w-5 h-5 flex items-center justify-center bg-amber-600 text-white text-[10px] font-black shrink-0">4</span>
              <p className="text-xs font-bold text-slate-200">Create PRP Compatibility Patch (Binary — No xEdit Needed)</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Copies the CELL records from PRP that overlap with your plugin's affected cells and writes a new ESL-flagged compatibility patch ESP.
              This allows users with PRP installed to use your mod without previs CTD.
            </p>
            {[
              { label: 'Your Plugin', value: prpPlugin, setter: setPrpPlugin, placeholder: 'Path to your .esp…' },
              { label: 'PRP Plugin File', value: prpFile, setter: setPrpFile, placeholder: 'e.g. C:\\FO4\\Data\\PRP.esp (or ESM)…' },
              { label: 'Patch Output', value: prpOut, setter: setPrpOut, placeholder: 'e.g. C:\\FO4\\Data\\YourMod - PRP Patch.esp…' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] text-slate-400">{label}</p>
                <div className="flex gap-2">
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  {label !== 'Patch Output' && (
                    <button onClick={() => pickPlugin(setter)}
                      className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 transition-colors flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={runPrpPatch} disabled={prpBusy || !prpPlugin.trim() || !prpFile.trim() || !prpOut.trim()}
              className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 border border-amber-500 text-xs font-bold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {prpBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus className="h-3.5 w-3.5" />}
              Build PRP Compatibility Patch
            </button>
            {prpMsg && <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-900/20 border border-emerald-600/30 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{prpMsg}
            </div>}
            {prpErr && <div className="flex items-center gap-2 p-2 rounded-lg bg-red-900/20 border border-red-600/30 text-xs text-red-300">
              <XCircle className="h-3.5 w-3.5 shrink-0" />{prpErr}
            </div>}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CKPE DIAGNOSTICS TAB — real per-cell conflicts, script/anim/form        */}
      {/* warnings, and crash-dump detection, all read from CKPE's own output    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ckpe' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-500/30 bg-orange-900/10 p-4">
            <p className="text-xs text-orange-200/80">
              Reads real diagnostic data CKPE (Creation Kit Platform Extended) already writes to disk —
              per-cell precombine-ownership conflicts, orphaned script/animation/form warnings, and
              CreationKit.exe crash dumps. Nothing here is guessed: if CKPE isn't installed or its log
              format has drifted, this says so plainly instead of showing a fabricated "no issues" result.
            </p>
          </div>

          <button onClick={runCkpeCheck} disabled={ckpeBusy}
            className="w-full rounded-lg bg-orange-600 py-2 font-bold text-white hover:bg-orange-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 text-xs">
            {ckpeBusy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</> : <><RefreshCw className="h-3.5 w-3.5" />Check CKPE Log &amp; Crash Folder</>}
          </button>
          {ckpeErr && <p className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />{ckpeErr}</p>}

          {/* Crash status — surfaced first and prominently per spec */}
          {ckpeCrash && (
            <div className={`rounded-xl border p-4 ${
              isNewCrash ? 'border-red-600/50 bg-red-950/30' :
              ckpeCrash.detected && ckpeCrash.listed && ckpeCrash.crashCount > 0 ? 'border-amber-600/40 bg-amber-950/20' :
              ckpeCrash.detected ? 'border-emerald-600/30 bg-emerald-950/10' :
              'border-slate-700 bg-slate-900/40'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Skull className={`h-4 w-4 ${isNewCrash ? 'text-red-400' : 'text-slate-400'}`} />
                <p className="text-xs font-bold text-slate-200">Creation Kit Crash Dumps</p>
                {isNewCrash && (
                  <span className="px-1.5 py-0.5 rounded bg-red-700 text-white text-[9px] font-black uppercase tracking-wider">New</span>
                )}
              </div>
              {!ckpeCrash.detected ? (
                <p className="text-xs text-slate-400">{ckpeCrash.reason}</p>
              ) : !ckpeCrash.listed ? (
                <p className="text-xs text-red-300">{ckpeCrash.reason}</p>
              ) : ckpeCrash.crashCount === 0 ? (
                <p className="text-xs text-emerald-300">No CreationKit.exe crash dumps found in {ckpeCrash.crashDir}.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    {ckpeCrash.crashCount} crash dump{ckpeCrash.crashCount !== 1 ? 's' : ''} in {ckpeCrash.crashDir}.
                    Most recent: <span className="font-mono text-amber-300">{ckpeCrash.mostRecent?.fileName}</span> ({new Date(ckpeCrash.mostRecent?.mtime).toLocaleString()}).
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Reading the actual stack trace needs WinDbg Preview (Microsoft Store, free) — open the .dmp and run <code className="text-amber-300">!analyze -v</code> for an automated summary.
                  </p>
                  {isNewCrash && (
                    <button onClick={acknowledgeCrash}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-semibold text-slate-300 transition-colors">
                      Mark as seen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Precombine / log status */}
          {ckpeStatus && (
            <div className="space-y-3">
              {!ckpeStatus.detected ? (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">{ckpeStatus.reason}</p>
                </div>
              ) : !ckpeStatus.parsed ? (
                <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{ckpeStatus.reason}</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-300">
                      Session {ckpeStatus.sessionTimestamp ?? 'unknown time'}
                      {ckpeStatus.activePlugin ? <> — active plugin <span className="font-mono text-sky-300">{ckpeStatus.activePlugin}</span></> : null}
                    </p>
                  </div>

                  {/* Precombine conflicts */}
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <p className={`text-xs font-semibold mb-2 ${ckpeStatus.conflictCount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {ckpeStatus.conflictCount > 0
                        ? `${ckpeStatus.conflictCount} precombine-ownership conflict${ckpeStatus.conflictCount !== 1 ? 's' : ''}`
                        : '✓ No precombine-ownership conflicts found.'}
                    </p>
                    {ckpeStatus.conflicts?.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {ckpeStatus.conflicts.map((c: any, i: number) => (
                          <div key={i} className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${warnBorder('warn')}`}>
                            {warnIcon('warn')}
                            <p className="flex-1 leading-relaxed">
                              Cell <span className="font-mono">{c.cell}</span> ({c.cellFormId}): combined data owned by <span className="font-mono text-amber-300">{c.ownerFile}</span> due to ref <span className="font-mono">{c.refName}</span> ({c.refFormId})
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Script / Animation / Form warnings */}
                  {([
                    ['Script Warnings', ckpeStatus.scriptWarnings, Code2],
                    ['Animation Warnings', ckpeStatus.animationWarnings, Activity],
                    ['Form/Property Warnings', ckpeStatus.formWarnings, FileCode],
                  ] as [string, string[] | undefined, any][]).map(([label, items, Icon]) => (
                    (items && items.length > 0) && (
                      <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-sky-400" />{label} ({items.length})
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {items.map((w, i) => (
                            <div key={i} className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${warnBorder('info')}`}>
                              {warnIcon('info')}
                              <p className="flex-1 leading-relaxed">{w}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </>
              )}
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
  { id: 'c04', category: 'Plugin Hygiene', title: 'ESL-flag if FormID count < 4096', detail: 'If your plugin adds fewer than 4096 new records, ESL-flagging it frees up one of the 254 plugin slots for your users. Use xEdit → Compact FormIDs for ESL first.', critical: false },
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
  { id: 'c14', category: 'Worldspace & Cells', title: 'LOD regenerated (TexGen → xLODGen)', detail: 'If you add or move objects in exterior cells, LOD must be regenerated. FO4 has no separate DynDOLOD.exe step — TexGen bakes LOD textures, then xLODGen (FO4LODGen mode) generates terrain + object + tree LOD. Ship LOD BA2 or document that users must regenerate LOD themselves.', critical: false },
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
      else if (check.requiredValue) { status = cv === check.requiredValue ? 'ok' : 'wrong'; }
      // requiredValue === null means "no single mandatory value" (either "must be blank",
      // like sResourceDataDirsFinal, or "just a recommendation"). This used to fall through
      // to a blanket 'ok' whenever the key was merely present, regardless of its actual value
      // — so a real, present, dangerous sResourceDataDirsFinal path would show as "OK" instead
      // of the "WRONG VALUE" warning this exact setting exists to catch. Compare against
      // recommendedValue instead.
      else { status = cv === check.recommendedValue ? 'ok' : 'wrong'; }
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
      'Standard ESP/ESM files have a 16M FormID space (0x000800 – 0xFFFFF per mod file). Mods with too many records fragment the space and can cause save corruption. Flag small mods as ESL if new FormID count is ≤ 2048 (0x800–0xFFF) — use xEdit "Compact FormIDs for ESL" first.',
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
    detail: 'CK Platform Extended (Nexus #51165) patches dozens of CK bugs including the 5-second save lag, navmesh crash on large cells, and memory leaks. Essential for stable CK work. Use CKPE 0.3.x for OG (1.10.163) and CKPE 0.5+ for NG/AE/1.11.x — both on the same Nexus page.',
  },
  {
    title: 'Disable DistantLOD checkbox for new exterior cells',
    detail: 'Leave LOD generation to the TexGen/xLODGen post-process (DynDOLOD.exe itself does not support FO4). Generating LOD from inside CK creates incomplete data.',
  },
  {
    title: 'Compact FormIDs before releasing as ESL',
    detail: 'ESL plugins can only use FormIDs 0x800–0xFFF (2,048 new records). Run xEdit → "Compact FormIDs for ESL" before flagging. This is a destructive operation — do it before distributing.',
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
  { name: 'CK Platform Extended (CKPE)', desc: 'CK bug fixes, memory patches, extra dialogs, navmesh crash fix, 5-second save lag fix. Use CKPE 0.3.x for OG CK, CKPE 0.5.6+ for NG CK / 1.11.x. Essential for any serious CK work.', nexus: '51165' },
  { name: 'Addictol', desc: 'All-in-one stability stack for OG/NG/1.11.x. Bundles: Buffout 4 NG, X-Cell, BakaMaxPapyrusOps, Faster Workshop, Long Loading Times Fix, and more. ⚠ Do NOT install standalone Buffout 4 NG alongside it — duplicate DLL = CTD at startup.', nexus: '84214' },
  { name: 'CLASSIC (Crash Log Auto Scanner)', desc: 'Auto-parses Addictol/Buffout 4 crash logs, matches FormIDs to plugin records, and cross-references 250+ known crash patterns. Run this before any crash investigation.', nexus: '56255' },
  { name: 'xEdit (FO4Edit)', desc: 'Plugin editor and validator. Use for: Compact FormIDs for ESL, Quick Auto Clean (ITMs/UDRs), conflict resolution, LVLN analysis, record diffing. Version 4.1.5+ supports 1.11.x.', nexus: '2737' },
  { name: 'Address Library for F4SE (All In One)', desc: 'Memory offset database required by all F4SE DLL plugins. For NG/1.11.x: use the "All In One (Anniversary Edition)" build (Nexus #47327). For OG: use the standard build on the same page.', nexus: '47327' },
  { name: 'Wrye Bash', desc: 'Bashed patch builder. Merges leveled lists, weapon/armor tags, NPC face data. Required for any load order with more than one LVLN-editing mod. Hosted as a Nexus "site" mod (not a per-game page): nexusmods.com/site/mods/591.', nexus: '' },
  { name: 'NifSkope 2.0 (dev build)', desc: 'NIF validator and viewer for FO4 meshes. Check BSTriShape block counts, BSLightingShaderProperty, normals, and texture paths. Use before placing any custom mesh in CK.', nexus: '' },
  { name: 'TexGen + xLODGen (FO4LODGen mode)', desc: 'Full FO4 LOD pipeline: TexGen bakes LOD textures, then xLODGen (FO4LODGen mode) generates terrain + object + tree LOD together. Run in that order after any worldspace change. DynDOLOD.exe itself does not support FO4 (Skyrim/Enderal only) — xLODGen replaces it here.', nexus: '' },
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
          <span className="font-bold text-white">OG (1.10.163.0): </span>Use CK 1.10.130.0 + CKPE 0.3.x (Nexus #51165). F4SE 0.6.x. Address Library "OG" build. BA2 archives are Header V1. Addictol #84214 (OG channel).
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
              { type: 'ESP (full)', range: '0x000800–0xFFFFF per mod', max: '16,776,704', notes: 'Standard plugin. Counts toward 254 plugin limit.' },
              { type: 'ESM (master)', range: 'Same as ESP but flags as master', max: '16,776,704', notes: 'Used by other plugins as dependency. Full range.' },
              { type: 'ESL (light)', range: '0x800–0xFFF (2,048–4,095)', max: '2,048', notes: 'Does NOT count toward the 254-plugin limit. Shares the 2,048 new-record ceiling with ESL-flagged ESPs. Exceeding 0xFFF causes save corruption.' },
              { type: 'ESL-flagged ESP', range: '0x800–0xFFF', max: '2,048', notes: 'Regular ESP with ESL flag. Shares the 2,048 ceiling with ESL files. Compact FormIDs first.' },
              { type: 'ESM flagged as ESL', range: '0x800–0xFFF', max: '2,048', notes: 'Rare. Used for large content split across ESL-size chunks.' },
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
