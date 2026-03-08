import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Info,
  List,
  Loader2,
  Play,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { parseMo2PluginsTxt } from './loadOrder/parsers';
import { generatePRPCombinedPatchScript } from './loadOrder/xedit';

const getBridge = () => (window as any).electron?.api ?? (window as any).electronAPI;
const joinPath = (base: string, leaf: string) =>
  base.replace(/[\\/]+$/, '') + '\\' + leaf;

type Phase = 'setup' | 'review' | 'generate';

interface PluginEntry {
  name: string;
  enabled: boolean;
}

export default function PrecombineGenerator() {
  const api = getBridge();

  const [phase, setPhase] = useState<Phase>('setup');
  const [mo2ProfileDir, setMo2ProfileDir] = useState<string>('');
  const [xeditPath, setXeditPath] = useState<string>('');
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [scriptPath, setScriptPath] = useState<string>('');
  const [launched, setLaunched] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await (window as any).electronAPI?.getSettings?.();
        if (!mountedRef.current) return;
        const xp = String(settings?.xeditPath || '').trim();
        if (xp) setXeditPath(xp);
        const mp = String(settings?.prpWizardMo2ProfileDir || '').trim();
        if (mp) setMo2ProfileDir(mp);
      } catch {/* ignore */}
    };
    void load();
  }, []);

  const script = useMemo(() => generatePRPCombinedPatchScript(plugins), [plugins]);
  const enabledPlugins = useMemo(() => plugins.filter(p => p.enabled), [plugins]);
  const disabledPlugins = useMemo(() => plugins.filter(p => !p.enabled), [plugins]);

  // Step 1: Pick MO2 profile folder and read plugins.txt
  const pickProfile = async () => {
    setError('');
    setIsBusy(true);
    try {
      if (!api?.pickMo2ProfileDir) {
        setError('Bridge API not available. Make sure the app is running inside Electron.');
        return;
      }
      const dir = await api.pickMo2ProfileDir();
      if (!dir) return;

      setMo2ProfileDir(dir);
      setStatus('Reading plugins.txt\u2026');

      const pluginsPath = joinPath(dir, 'plugins.txt');
      const raw = await api.readFile?.(pluginsPath);
      if (!raw) {
        setError(
          'Could not read plugins.txt from that folder. ' +
          'Make sure you selected the correct MO2 profile folder ' +
          '(e.g. \u2026\\Mod Organizer 2\\profiles\\Default).'
        );
        return;
      }

      const parsed = parseMo2PluginsTxt(String(raw));
      if (!mountedRef.current) return;
      setPlugins(parsed);
      setStatus(
        `Loaded ${parsed.filter(p => p.enabled).length} active plugins from "${dir}".`
      );
      void (window as any).electronAPI?.setSettings?.({ prpWizardMo2ProfileDir: dir });
    } catch (e: any) {
      if (mountedRef.current) setError(String(e?.message || e));
    } finally {
      if (mountedRef.current) setIsBusy(false);
    }
  };

  // Step 2+3: Write script, optionally launch FO4Edit
  const generateAndLaunch = async () => {
    setError('');
    setIsBusy(true);
    try {
      if (!api?.writeLoadOrderUserDataFile) {
        setError('writeLoadOrderUserDataFile not available on this build.');
        return;
      }
      setStatus('Writing xEdit script to disk\u2026');
      const filename = 'mossy-prp-combined-patch.pas';
      const savedPath = await api.writeLoadOrderUserDataFile(filename, script);
      if (!savedPath) {
        setError('Failed to write the script file. Check app permissions.');
        return;
      }
      if (!mountedRef.current) return;
      setScriptPath(savedPath);

      const exe = xeditPath.trim();
      if (!exe) {
        setStatus(
          `Script saved: ${savedPath}\n\n` +
          'FO4Edit path is not configured. Open FO4Edit manually, then use Apply Script.'
        );
        setLaunched(false);
        setPhase('generate');
        return;
      }

      setStatus('Launching FO4Edit\u2026');
      const args = [`-script:${savedPath}`];
      const result = await api.launchXEdit?.(args);
      if (!mountedRef.current) return;
      if (result?.ok === false) {
        setError(result?.error || 'FO4Edit launch failed.');
        setLaunched(false);
      } else {
        setLaunched(true);
        setStatus('FO4Edit launched. Wait for background loading, then let the script run.');
      }
      setPhase('generate');
    } catch (e: any) {
      if (mountedRef.current) setError(String(e?.message || e));
    } finally {
      if (mountedRef.current) setIsBusy(false);
    }
  };

  const saveScriptAs = async () => {
    setError('');
    try {
      if (!api?.saveFile) { setError('saveFile not available.'); return; }
      const saved = await api.saveFile(script, 'mossy-prp-combined-patch.pas');
      if (saved) setStatus(`Script saved to: ${saved}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const canProceedToReview = enabledPlugins.length > 0;
  const canGenerate = enabledPlugins.length > 0;

  const phaseLabel = (p: Phase) =>
    p === 'setup' ? '1 \u00b7 Scan Load Order' :
    p === 'review' ? '2 \u00b7 Review Plugins' :
    '3 \u00b7 Generate Patch';

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-[#0a120a] to-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase mb-2">
            Mossy \u00b7 PRP Tools
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="w-9 h-9 text-emerald-400" />
            One-Click PRP Combined Patch
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">
            Scans your MO2 load order and generates a real FO4Edit script that creates a single{' '}
            <strong className="text-white">Mossy Combined Patch.esp</strong> covering every conflict,
            with full <strong className="text-emerald-300">PRP (Previsibines Repair Pack)</strong>{' '}
            compatibility built in.
          </p>
        </div>

        {/* Phase stepper */}
        <div className="flex items-center gap-2 mb-8 text-xs font-bold">
          {(['setup', 'review', 'generate'] as Phase[]).map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
              <button
                type="button"
                onClick={() => {
                  if (p === 'setup') setPhase(p);
                  if (p === 'review' && canProceedToReview) setPhase(p);
                }}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  phase === p
                    ? 'bg-emerald-600 text-white'
                    : p === 'generate' && phase !== 'generate'
                    ? 'bg-slate-800 text-slate-500 cursor-default'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {phaseLabel(p)}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Status / Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}
        {status && !error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-600/30 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap">{status}</span>
          </div>
        )}

        {/* ===== PHASE 1: SETUP ===== */}
        {phase === 'setup' && (
          <div className="space-y-5">

            {/* xEdit path */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-200 mb-1">FO4Edit / xEdit Path</div>
                  {xeditPath ? (
                    <div className="text-xs text-emerald-300 font-mono break-all">{xeditPath}</div>
                  ) : (
                    <div className="text-xs text-amber-300">
                      Not configured. The script will still be generated and saved \u2014 run it
                      manually via <em>Apply Script</em> inside FO4Edit. To auto-launch, set your
                      FO4Edit path in{' '}
                      <strong className="text-amber-200">Settings \u2192 Tools \u2192 xEdit Path</strong>.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pick MO2 profile */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
              <div className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-400" />
                MO2 Profile Folder
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Select your active Mod Organizer 2 profile folder \u2014 the one containing{' '}
                <code className="text-slate-300">plugins.txt</code> and{' '}
                <code className="text-slate-300">modlist.txt</code>. Typically at:<br />
                <code className="text-slate-300 text-[10px]">
                  \u2026\Mod Organizer 2\profiles\&lt;YourProfileName&gt;
                </code>
              </p>

              {mo2ProfileDir && (
                <div className="mb-3 text-xs text-purple-300 font-mono break-all bg-purple-900/20 border border-purple-700/30 rounded px-3 py-2">
                  {mo2ProfileDir}
                </div>
              )}

              <button
                type="button"
                onClick={() => void pickProfile()}
                disabled={isBusy}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                {mo2ProfileDir ? 'Change Profile Folder' : 'Pick MO2 Profile Folder'}
              </button>
            </div>

            {/* Summary + next */}
            {plugins.length > 0 && (
              <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <List className="w-4 h-4" />
                    {enabledPlugins.length} active plugins &middot; {disabledPlugins.length} disabled
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    The patch script will cover all {enabledPlugins.length} active plugins.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('review')}
                  disabled={!canProceedToReview}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors whitespace-nowrap"
                >
                  Review Plugins
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-lg border border-slate-700/30 bg-black/30 p-5">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                How It Works
              </div>
              <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
                <li>
                  <strong className="text-slate-200">Scan:</strong> Mossy reads your real MO2{' '}
                  <code>plugins.txt</code> and shows you the exact active load order.
                </li>
                <li>
                  <strong className="text-slate-200">Generate:</strong> A functional FO4Edit Pascal
                  script is written that creates{' '}
                  <strong className="text-white">Mossy Combined Patch.esp</strong> \u2014 copying
                  the winning override of every conflicted record.
                </li>
                <li>
                  <strong className="text-slate-200">PRP Compatibility:</strong> For every{' '}
                  <code>CELL</code> record in the patch, the precombine/previsibine references (
                  <code>XCRI</code>, <code>XCMO</code>) are cleared so PRP can manage them cleanly.
                </li>
                <li>
                  <strong className="text-slate-200">One click:</strong> If FO4Edit is configured,
                  it launches automatically with the script. Otherwise the script is saved for
                  manual use.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ===== PHASE 2: REVIEW ===== */}
        {phase === 'review' && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <List className="w-5 h-5 text-emerald-400" />
                  Active Plugins ({enabledPlugins.length})
                </div>
                <span className="text-xs text-slate-400">{disabledPlugins.length} disabled (skipped)</span>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {enabledPlugins.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 rounded bg-slate-950/60 border border-slate-800/50"
                  >
                    <span className="text-[10px] font-mono text-slate-500 w-8 text-right flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-slate-200 flex-1">{p.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      p.name.endsWith('.esm')
                        ? 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                        : p.name.endsWith('.esl')
                        ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/40'
                        : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                    }`}>
                      {p.name.endsWith('.esm') ? 'ESM' : p.name.endsWith('.esl') ? 'ESL' : 'ESP'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRP notice */}
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-emerald-300 mb-1">PRP Compatibility Built In</div>
                  <p className="text-xs text-slate-300">
                    The patch script will automatically clear precombine/previsibine references (
                    <code className="text-slate-200">XCRI</code>,{' '}
                    <code className="text-slate-200">XCMO</code>) from every{' '}
                    <code className="text-slate-200">CELL</code> record it copies. This is the
                    standard PRP compatibility step \u2014 it tells the engine to skip baked
                    precombines for conflicted cells so PRP&apos;s rebuilt data wins cleanly.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => void saveScriptAs()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:border-slate-400 text-sm font-bold text-slate-200 transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Save Script
              </button>
              <button
                type="button"
                onClick={() => void generateAndLaunch()}
                disabled={!canGenerate || isBusy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                {isBusy
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : xeditPath
                  ? <Play className="w-5 h-5" />
                  : <ArrowDownToLine className="w-5 h-5" />
                }
                {xeditPath ? 'Generate Patch & Launch FO4Edit' : 'Generate & Save Patch Script'}
              </button>
            </div>
          </div>
        )}

        {/* ===== PHASE 3: RESULT ===== */}
        {phase === 'generate' && (
          <div className="space-y-5">

            {launched ? (
              <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <div className="text-lg font-black text-emerald-300">FO4Edit Launched!</div>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  FO4Edit has been opened with the combined patch script. Here&apos;s what happens next:
                </p>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Wait for FO4Edit&apos;s <strong className="text-white">background loading</strong> to finish.</li>
                  <li>The script runs automatically and reports progress in the Messages panel.</li>
                  <li>When you see <code className="text-emerald-300">&quot;Combined patch generation complete!&quot;</code>, save and exit.</li>
                  <li>In MO2, <strong className="text-white">enable</strong> <code className="text-white">Mossy Combined Patch.esp</code> at the <strong className="text-white">very bottom</strong> of your load order.</li>
                  <li>If you use PRP, load <strong className="text-white">PRP before</strong> this combined patch.</li>
                </ol>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                  <div className="text-lg font-black text-amber-300">Script Ready &mdash; Manual Launch Needed</div>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  {error
                    ? 'FO4Edit could not be launched automatically. Follow the manual steps below.'
                    : 'FO4Edit path is not configured. The script has been saved \u2014 follow the steps below.'}
                </p>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Open <strong className="text-white">FO4Edit</strong> and load your complete load order.</li>
                  <li>Wait for background loading to finish.</li>
                  <li>Right-click any plugin &rarr; <strong className="text-white">&quot;Apply Script&quot;</strong>.</li>
                  <li>Browse to:
                    <code className="text-xs text-emerald-300 break-all block mt-1 bg-black/30 px-2 py-1 rounded">
                      {scriptPath || '(see status message above)'}
                    </code>
                  </li>
                  <li>Click <strong className="text-white">OK</strong> and wait for completion.</li>
                  <li>Save and exit FO4Edit.</li>
                  <li>Enable <code className="text-white">Mossy Combined Patch.esp</code> at the bottom of your load order in MO2.</li>
                </ol>
                {!xeditPath && (
                  <div className="mt-4 text-xs text-amber-200 border-t border-amber-600/30 pt-3">
                    Tip: Set your FO4Edit path in <strong>Settings &rarr; Tools &rarr; xEdit Path</strong> so Mossy can launch it automatically next time.
                  </div>
                )}
              </div>
            )}

            {scriptPath && (
              <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-slate-400" />
                  Script file location
                </div>
                <code className="text-xs text-emerald-300 break-all">{scriptPath}</code>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { setPhase('setup'); setLaunched(false); setError(''); setStatus(''); }}
                className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors"
              >
                &larr; Start Over
              </button>
              <button
                type="button"
                onClick={() => void saveScriptAs()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:border-slate-400 text-sm font-bold text-slate-200 transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Save Script to File
              </button>
              {!launched && (
                <button
                  type="button"
                  onClick={() => void generateAndLaunch()}
                  disabled={isBusy || !canGenerate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
                >
                  {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Retry Launch
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
