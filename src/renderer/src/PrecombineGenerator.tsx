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
  Package,
  Play,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { parseMo2PluginsTxt } from './loadOrder/parsers';
import {
  generatePRPCombinedPatchScript,
  generateSingleModPRPPatchScript,
} from './loadOrder/xedit';

const getBridge = () => (window as any).electron?.api ?? (window as any).electronAPI;
const joinPath = (base: string, leaf: string) =>
  base.replace(/[\\/]+$/, '') + '\\' + leaf;

type LoadOrderPhase = 'setup' | 'review' | 'generate';
type SingleModPhase = 'pick' | 'prep' | 'ck' | 'patch';
interface PluginEntry { name: string; enabled: boolean }

// ─── Full Load Order Wizard ────────────────────────────────────────────────────
const FullLoadOrderWizard: React.FC = () => {
  const api = getBridge();
  const [phase, setPhase] = useState<LoadOrderPhase>('setup');
  const [mo2ProfileDir, setMo2ProfileDir] = useState('');
  const [xeditPath, setXeditPath] = useState('');
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [scriptPath, setScriptPath] = useState('');
  const [launched, setLaunched] = useState(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).electronAPI?.getSettings?.();
        if (!mounted.current) return;
        const xp = String(s?.xeditPath || '').trim();
        if (xp) setXeditPath(xp);
        const mp = String(s?.prpWizardMo2ProfileDir || '').trim();
        if (mp) setMo2ProfileDir(mp);
      } catch { /* ignore */ }
    };
    void load();
  }, []);

  const script = useMemo(() => generatePRPCombinedPatchScript(plugins), [plugins]);
  const enabledPlugins = useMemo(() => plugins.filter(p => p.enabled), [plugins]);
  const disabledPlugins = useMemo(() => plugins.filter(p => !p.enabled), [plugins]);

  const pickProfile = async () => {
    setError(''); setIsBusy(true);
    try {
      if (!api?.pickMo2ProfileDir) { setError('Bridge API not available.'); return; }
      const dir = await api.pickMo2ProfileDir();
      if (!dir) return;
      setMo2ProfileDir(dir);
      setStatus('Reading plugins.txt...');
      const raw = await api.readFile?.(joinPath(dir, 'plugins.txt'));
      if (!raw) {
        setError(
          'Could not read plugins.txt. Make sure you selected the correct MO2 profile folder ' +
          '(e.g. ...\\Mod Organizer 2\\profiles\\Default).'
        );
        return;
      }
      const parsed = parseMo2PluginsTxt(String(raw));
      if (!mounted.current) return;
      setPlugins(parsed);
      setStatus(`Loaded ${parsed.filter(p => p.enabled).length} active plugins.`);
      void (window as any).electronAPI?.setSettings?.({ prpWizardMo2ProfileDir: dir });
    } catch (e: any) { if (mounted.current) setError(String(e?.message || e)); }
    finally { if (mounted.current) setIsBusy(false); }
  };

  const generateAndLaunch = async () => {
    setError(''); setIsBusy(true);
    try {
      const savedPath = await api?.writeLoadOrderUserDataFile?.('mossy-prp-combined-patch.pas', script);
      if (!savedPath) { setError('Failed to write script file.'); return; }
      if (!mounted.current) return;
      setScriptPath(savedPath);
      if (!xeditPath.trim()) {
        setStatus(`Script saved: ${savedPath}\n\nOpen FO4Edit manually and use Apply Script.`);
        setLaunched(false); setPhase('generate'); return;
      }
      const result = await api?.launchXEdit?.([`-script:${savedPath}`]);
      if (!mounted.current) return;
      if (result?.ok === false) { setError(result?.error || 'FO4Edit launch failed.'); setLaunched(false); }
      else { setLaunched(true); setStatus('FO4Edit launched. Wait for background loading, then let the script run.'); }
      setPhase('generate');
    } catch (e: any) { if (mounted.current) setError(String(e?.message || e)); }
    finally { if (mounted.current) setIsBusy(false); }
  };

  const saveScriptAs = async () => {
    try {
      const saved = await api?.saveFile?.(script, 'mossy-prp-combined-patch.pas');
      if (saved) setStatus(`Script saved to: ${saved}`);
    } catch (e: any) { setError(String(e?.message || e)); }
  };

  return (
    <div className="space-y-5">
      {/* Phase stepper */}
      <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
        {(['setup', 'review', 'generate'] as LoadOrderPhase[]).map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
            <button type="button"
              onClick={() => { if (p === 'setup') setPhase(p); if (p === 'review' && enabledPlugins.length > 0) setPhase(p); }}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                phase === p ? 'bg-emerald-600 text-white'
                  : p === 'generate' && phase !== 'generate' ? 'bg-slate-800 text-slate-500 cursor-default'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {p === 'setup' ? '1 · Scan Load Order' : p === 'review' ? '2 · Review' : '3 · Generate'}
            </button>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}
      {status && !error && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-600/30 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-wrap">{status}</span>
        </div>
      )}

      {phase === 'setup' && (
        <>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-200 mb-1">FO4Edit / xEdit Path</div>
                {xeditPath
                  ? <div className="text-xs text-emerald-300 font-mono break-all">{xeditPath}</div>
                  : <div className="text-xs text-amber-300">Not configured. Script will be saved to disk for manual use. Set it in <strong>Settings &rarr; Tools &rarr; xEdit Path</strong> to auto-launch.</div>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-400" />MO2 Profile Folder
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Select your active MO2 profile folder containing <code className="text-slate-300">plugins.txt</code>.
            </p>
            {mo2ProfileDir && (
              <div className="mb-3 text-xs text-purple-300 font-mono break-all bg-purple-900/20 border border-purple-700/30 rounded px-3 py-2">{mo2ProfileDir}</div>
            )}
            <button type="button" onClick={() => void pickProfile()} disabled={isBusy}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-colors">
              {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
              {mo2ProfileDir ? 'Change Profile' : 'Pick MO2 Profile Folder'}
            </button>
          </div>

          {plugins.length > 0 && (
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <List className="w-4 h-4" />{enabledPlugins.length} active &middot; {disabledPlugins.length} disabled
                </div>
                <div className="text-xs text-slate-400 mt-1">Patch will cover all {enabledPlugins.length} active plugins.</div>
              </div>
              <button type="button" onClick={() => setPhase('review')} disabled={!enabledPlugins.length}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors whitespace-nowrap">
                Review &rarr;
              </button>
            </div>
          )}

          <div className="rounded-lg border border-slate-700/30 bg-black/30 p-5">
            <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />How It Works
            </div>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
              <li><strong className="text-slate-200">Scan:</strong> Reads your real MO2 plugins.txt &mdash; no mock data.</li>
              <li><strong className="text-slate-200">Generate:</strong> Creates a real FO4Edit Pascal script that builds <strong className="text-white">Mossy Combined Patch.esp</strong>, copying the winning override of every conflicted record.</li>
              <li><strong className="text-slate-200">PRP:</strong> Clears XCRI/XCMO from every CELL record so PRP manages precombines cleanly.</li>
              <li><strong className="text-slate-200">One click:</strong> If FO4Edit is configured, it launches automatically with the script.</li>
            </ol>
          </div>
        </>
      )}

      {phase === 'review' && (
        <>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-400" />Active Plugins ({enabledPlugins.length})
              </div>
              <span className="text-xs text-slate-400">{disabledPlugins.length} disabled (skipped)</span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {enabledPlugins.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded bg-slate-950/60 border border-slate-800/50">
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs text-slate-200 flex-1">{p.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    p.name.endsWith('.esm') ? 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                    : p.name.endsWith('.esl') ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/40'
                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'}`}>
                    {p.name.endsWith('.esm') ? 'ESM' : p.name.endsWith('.esl') ? 'ESL' : 'ESP'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-emerald-300 mb-1">PRP Compatibility Built In</div>
              <p className="text-xs text-slate-300">Every CELL record copied into the patch has its precombine refs (XCRI, XCMO) cleared automatically.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPhase('setup')}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">&larr; Back</button>
            <button type="button" onClick={() => void saveScriptAs()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:border-slate-400 text-sm font-bold text-slate-200 transition-colors">
              <ArrowDownToLine className="w-4 h-4" />Save Script
            </button>
            <button type="button" onClick={() => void generateAndLaunch()} disabled={!enabledPlugins.length || isBusy}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors">
              {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : xeditPath ? <Play className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />}
              {xeditPath ? 'Generate & Launch FO4Edit' : 'Generate & Save Script'}
            </button>
          </div>
        </>
      )}

      {phase === 'generate' && (
        <>
          {launched ? (
            <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                <div className="text-lg font-black text-emerald-300">FO4Edit Launched!</div>
              </div>
              <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                <li>Wait for FO4Edit's <strong className="text-white">background loading</strong> to finish.</li>
                <li>Script runs automatically. When you see <code className="text-emerald-300">&quot;Combined patch generation complete!&quot;</code> &mdash; save and exit.</li>
                <li>In MO2, enable <code className="text-white">Mossy Combined Patch.esp</code> at the <strong className="text-white">very bottom</strong>.</li>
                <li>If you use PRP, load <strong className="text-white">PRP before</strong> this patch.</li>
              </ol>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
                <div className="text-lg font-black text-amber-300">Script Ready &mdash; Open FO4Edit Manually</div>
              </div>
              <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside">
                <li>Open <strong className="text-white">FO4Edit</strong> with your full load order and wait for background loading.</li>
                <li>Right-click any plugin &rarr; <strong className="text-white">&quot;Apply Script&quot;</strong>.</li>
                <li>Browse to: <code className="text-xs text-emerald-300 break-all block mt-1 bg-black/30 px-2 py-1 rounded">{scriptPath || '(see status above)'}</code></li>
                <li>Click OK, wait for completion, save and exit.</li>
                <li>Enable <code className="text-white">Mossy Combined Patch.esp</code> at the bottom of your MO2 load order.</li>
              </ol>
            </div>
          )}
          {scriptPath && (
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-slate-400" />Script location
              </div>
              <code className="text-xs text-emerald-300 break-all">{scriptPath}</code>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setPhase('setup'); setLaunched(false); setError(''); setStatus(''); }}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">&larr; Start Over</button>
            <button type="button" onClick={() => void saveScriptAs()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:border-slate-400 text-sm font-bold text-slate-200 transition-colors">
              <ArrowDownToLine className="w-4 h-4" />Save Script
            </button>
            {!launched && (
              <button type="button" onClick={() => void generateAndLaunch()} disabled={isBusy || !enabledPlugins.length}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}Retry Launch
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Single Mod Precombine Wizard ─────────────────────────────────────────────
const SingleModPrecombineWizard: React.FC = () => {
  const api = getBridge();
  const [phase, setPhase] = useState<SingleModPhase>('pick');
  const [modFile, setModFile] = useState('');
  const [xeditPath, setXeditPath] = useState('');
  const [ckPath, setCkPath] = useState('');
  const [worldspace, setWorldspace] = useState('Commonwealth');
  const [customWorldspace, setCustomWorldspace] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [prepScriptPath, setPrepScriptPath] = useState('');
  const [patchScriptPath, setPatchScriptPath] = useState('');
  const [patchLaunched, setPatchLaunched] = useState(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).electronAPI?.getSettings?.();
        if (!mounted.current) return;
        const xp = String(s?.xeditPath || '').trim();
        if (xp) setXeditPath(xp);
        const cp = String(s?.ckPath || '').trim();
        if (cp) setCkPath(cp);
      } catch { /* ignore */ }
    };
    void load();
  }, []);

  const modFileName = modFile ? modFile.replace(/.*[\/]/, '') : '';
  const effectiveWorldspace = worldspace === 'Other' ? (customWorldspace.trim() || 'Other') : worldspace;
  const patchScript = useMemo(() => modFileName ? generateSingleModPRPPatchScript(modFileName) : '', [modFileName]);

  const buildPrepScript = (modName: string): string => {
    const safe = modName.replace(/'/g, "''");
    return [
      'unit UserScript;',
      '{',
      `  Mossy - Precombine Cell Scan: ${modName}`,
      '  Run BEFORE rebuilding precombines in Creation Kit.',
      '  Lists every exterior CELL your mod touches so you know which ones to rebuild.',
      '}',
      'var sourceMod: IInterface; cellCount: integer;',
      'function Initialize: integer;',
      'var i: integer;',
      'begin',
      '  Result := 0; cellCount := 0;',
      `  AddMessage('[Mossy] Scanning ${modName} for exterior CELL records...');`,
      '  for i := 0 to Pred(FileCount) do begin',
      `    if GetFileName(FileByIndex(i)) = '${safe}' then begin`,
      '      sourceMod := FileByIndex(i); Break;',
      '    end;',
      '  end;',
      '  if not Assigned(sourceMod) then begin',
      `    AddMessage('[Mossy] ERROR: ${modName} is not loaded in FO4Edit.');`,
      '    Result := 1; Exit;',
      '  end;',
      'end;',
      'function Process(e: IInterface): integer;',
      'begin',
      '  Result := 0;',
      '  if ElementType(e) <> etMainRecord then Exit;',
      '  if GetFile(e) <> sourceMod then Exit;',
      "  if Signature(e) <> 'CELL' then Exit;",
      '  Inc(cellCount);',
      "  AddMessage('[Mossy] CELL: ' + Name(e) + '  FormID: ' + IntToHex(FormID(e), 8));",
      'end;',
      'function Finalize: integer;',
      'begin',
      "  AddMessage('[Mossy] ============================================');",
      "  AddMessage('[Mossy] Cell scan complete. Cells found: ' + IntToStr(cellCount));",
      "  AddMessage('[Mossy] Use this list in Creation Kit to target precombine rebuilds.');",
      "  AddMessage('[Mossy] ============================================');",
      '  Result := 0;',
      'end;',
      'end.',
    ].join('\n');
  };

  const pickModFile = async () => {
    setError('');
    try {
      const path = await api?.pickEspFile?.();
      if (!path) return;
      setModFile(path);
      setStatus(`Selected: ${path.replace(/.*[\/]/, '')}`);
    } catch (e: any) { setError(String(e?.message || e)); }
  };

  const writePrepScript = async () => {
    setError(''); setIsBusy(true);
    try {
      const prepContent = buildPrepScript(modFileName);
      const fn = modFileName.replace(/\.(esp|esm|esl)$/i, '') + '_CellScan.pas';
      const savedPath = await api?.writeLoadOrderUserDataFile?.(fn, prepContent);
      if (!savedPath) { setError('Failed to write prep script.'); return; }
      if (!mounted.current) return;
      setPrepScriptPath(savedPath);
      if (xeditPath.trim()) {
        const result = await api?.launchXEdit?.([`-script:${savedPath}`]);
        if (result?.ok) setStatus(`FO4Edit launched. Check Messages panel for the list of CELL records in your mod.`);
        else setError((result?.error || 'FO4Edit launch failed.') + `\n\nScript saved at: ${savedPath}`);
      } else {
        setStatus(`Script saved: ${savedPath}\n\nOpen FO4Edit with your mod and use Apply Script.`);
      }
      setPhase('ck');
    } catch (e: any) { if (mounted.current) setError(String(e?.message || e)); }
    finally { if (mounted.current) setIsBusy(false); }
  };

  const generatePRPPatch = async () => {
    setError(''); setIsBusy(true);
    try {
      const fn = modFileName.replace(/\.(esp|esm|esl)$/i, '') + '_PRPPatch.pas';
      const savedPath = await api?.writeLoadOrderUserDataFile?.(fn, patchScript);
      if (!savedPath) { setError('Failed to write PRP patch script.'); return; }
      if (!mounted.current) return;
      setPatchScriptPath(savedPath);
      if (xeditPath.trim()) {
        const result = await api?.launchXEdit?.([`-script:${savedPath}`]);
        if (result?.ok) { setPatchLaunched(true); setStatus('FO4Edit launched with PRP patch script.'); }
        else { setError(result?.error || 'FO4Edit launch failed.'); setPatchLaunched(false); }
      } else {
        setStatus(`PRP patch script saved: ${savedPath}\n\nOpen FO4Edit and use Apply Script.`);
        setPatchLaunched(false);
      }
      setPhase('patch');
    } catch (e: any) { if (mounted.current) setError(String(e?.message || e)); }
    finally { if (mounted.current) setIsBusy(false); }
  };

  const saveAs = async (content: string, filename: string) => {
    try {
      const saved = await api?.saveFile?.(content, filename);
      if (saved) setStatus(`Saved to: ${saved}`);
    } catch (e: any) { setError(String(e?.message || e)); }
  };

  const WORLDSPACES = ['Commonwealth', 'Far Harbor', 'Nuka-World', 'Vault 88', 'Other'];
  const patchName = modFileName.replace(/\.(esp|esm|esl)$/i, '') + '_PRPPatch.esp';

  return (
    <div className="space-y-5">
      {/* Phase stepper */}
      <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
        {(['pick', 'prep', 'ck', 'patch'] as SingleModPhase[]).map((p, i) => {
          const labels: Record<SingleModPhase, string> = {
            pick: '1 \u00b7 Pick Mod', prep: '2 \u00b7 Scan Cells',
            ck: '3 \u00b7 Creation Kit', patch: '4 \u00b7 PRP Patch',
          };
          const canNav = p === 'pick'
            || (p === 'prep' && !!modFileName)
            || (p === 'ck' && !!prepScriptPath)
            || (p === 'patch' && !!patchScriptPath);
          return (
            <React.Fragment key={p}>
              {i > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
              <button type="button" onClick={() => canNav && setPhase(p)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  phase === p ? 'bg-purple-600 text-white'
                  : !canNav ? 'bg-slate-800 text-slate-500 cursor-default'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {labels[p]}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}
      {status && !error && (
        <div className="flex items-start gap-3 rounded-lg border border-purple-600/30 bg-purple-900/10 px-4 py-3 text-sm text-purple-200">
          <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-wrap">{status}</span>
        </div>
      )}

      {/* ── Phase 1: Pick Mod ── */}
      {phase === 'pick' && (
        <>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />Select Your Mod File
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Pick the ESP or ESM for the mod you just built. Mossy will guide you through
              a cell scan, Creation Kit precombine rebuild, and finally generate a standalone PRP
              companion patch.
            </p>
            {modFile && (
              <div className="mb-3 text-xs text-purple-300 font-mono break-all bg-purple-900/20 border border-purple-700/30 rounded px-3 py-2">{modFile}</div>
            )}
            <button type="button" onClick={() => void pickModFile()}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-colors">
              <FolderOpen className="w-5 h-5" />{modFile ? 'Change Mod File' : 'Browse for Mod File'}
            </button>
          </div>

          {modFileName && (
            <>
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
                <div className="text-sm font-bold text-slate-200 mb-3">Target Worldspace</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {WORLDSPACES.map(ws => (
                    <button key={ws} type="button" onClick={() => setWorldspace(ws)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                        worldspace === ws ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{ws}</button>
                  ))}
                </div>
                {worldspace === 'Other' && (
                  <input type="text" value={customWorldspace} onChange={e => setCustomWorldspace(e.target.value)}
                    placeholder="e.g. DLC01Worldspace"
                    className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 outline-none" />
                )}
              </div>
              <div className="rounded-lg border border-purple-700/40 bg-purple-900/10 p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-bold text-purple-300">{modFileName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Worldspace: {effectiveWorldspace}</div>
                </div>
                <button type="button" onClick={() => setPhase('prep')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-colors whitespace-nowrap">
                  Continue &rarr;
                </button>
              </div>
            </>
          )}

          <div className="rounded-lg border border-slate-700/30 bg-black/30 p-5">
            <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />Two-Stage Workflow
            </div>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex gap-3">
                <span className="text-purple-400 font-bold flex-shrink-0 w-14">Stage 1</span>
                <span><strong className="text-slate-200">Cell Scan</strong> &mdash; FO4Edit script lists every CELL record your mod touches so you know what to rebuild in CK.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-400 font-bold flex-shrink-0 w-14">Stage 2</span>
                <span><strong className="text-slate-200">Creation Kit</strong> &mdash; use CK's World &rarr; Precombine / Previs to rebuild and bake precombines directly into your mod.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-emerald-400 font-bold flex-shrink-0 w-14">Stage 3</span>
                <span><strong className="text-slate-200">PRP Patch</strong> &mdash; a second FO4Edit script generates <code className="text-slate-300">{modFileName.replace(/\.(esp|esm|esl)$/i, '')}_PRPPatch.esp</code> which clears XCRI/XCMO so PRP stays fully compatible.</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Phase 2: Prep scan ── */}
      {phase === 'prep' && (
        <>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />Stage 1: Cell Scan
            </div>
            <p className="text-xs text-slate-400 mb-3">
              This runs an FO4Edit script against <strong className="text-slate-200">{modFileName}</strong> that
              lists every CELL record it touches. Use that list in CK to target only the cells that actually need precombine rebuilds.
            </p>
            <div className="mb-4 text-xs text-amber-300 bg-amber-900/20 border border-amber-600/30 rounded px-3 py-2">
              <strong>Before clicking below:</strong> open FO4Edit with <em>only</em>{' '}
              <code>{modFileName}</code> and its required masters.
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void writePrepScript()} disabled={isBusy || !modFileName}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : xeditPath ? <Play className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />}
                {xeditPath ? 'Run Cell Scan in FO4Edit' : 'Generate & Save Cell Scan Script'}
              </button>
              {prepScriptPath && (
                <button type="button" onClick={() => setPhase('ck')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors">
                  Go to CK Steps &rarr;
                </button>
              )}
            </div>
            {prepScriptPath && (
              <div className="mt-3 text-xs text-slate-400">Script: <code className="text-purple-300 break-all">{prepScriptPath}</code></div>
            )}
          </div>
          <button type="button" onClick={() => setPhase('pick')}
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">&larr; Back</button>
        </>
      )}

      {/* ── Phase 3: CK steps ── */}
      {phase === 'ck' && (
        <>
          <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-5">
            <div className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />Stage 2: Rebuild Precombines in Creation Kit
            </div>
            <ol className="text-xs text-slate-300 space-y-3 list-decimal list-inside">
              <li>Open <strong className="text-white">Creation Kit</strong> and load <code className="text-amber-200">{modFileName}</code> as the active file.</li>
              <li>Go to <strong className="text-white">World &rarr; Precombine / Previs &rarr; Generate Precombined Data</strong>.</li>
              <li>Select worldspace: <strong className="text-white">{effectiveWorldspace}</strong>. Click OK.</li>
              <li>Wait for CK to finish and <strong className="text-white">save the ESP before closing</strong>. Time varies: ~5 min for a few cells, ~15&ndash;30 min for a mid-sized mod, up to 60+ min for large worldspace mods.</li>
              <li>Optional but recommended: also run <strong className="text-white">Generate Previs Data</strong> for the same worldspace.</li>
            </ol>
            {ckPath && (
              <button type="button" onClick={() => void api?.openProgram?.(ckPath)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-700/50 hover:bg-amber-700/70 border border-amber-600/40 text-amber-200 font-bold text-xs transition-colors">
                <Play className="w-4 h-4" />Open Creation Kit
              </button>
            )}
            {!ckPath && (
              <div className="mt-3 text-xs text-amber-200/70">Tip: Set your CK path in <strong>Settings &rarr; Tools</strong> so Mossy can open it for you.</div>
            )}
          </div>

          <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-bold text-emerald-300">Done with CK?</div>
              <div className="text-xs text-slate-400 mt-0.5">Continue to generate your PRP companion patch.</div>
            </div>
            <button type="button" onClick={() => setPhase('patch')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors whitespace-nowrap">
              Generate PRP Patch &rarr;
            </button>
          </div>

          <button type="button" onClick={() => setPhase('prep')}
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">&larr; Back</button>
        </>
      )}

      {/* ── Phase 4: PRP patch ── */}
      {phase === 'patch' && (
        <>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />Stage 3: Generate PRP Companion Patch
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Creates <strong className="text-white">{patchName}</strong> &mdash; a small companion ESP
              that clears precombine refs (XCRI, XCMO) from every CELL your mod touches, making it
              fully compatible with PRP.
            </p>
            <div className="mb-4 text-xs text-amber-300 bg-amber-900/20 border border-amber-600/30 rounded px-3 py-2">
              <strong>Before clicking below:</strong> open FO4Edit with <em>only</em>{' '}
              <code>{modFileName}</code> and its masters.
            </div>
            {!patchLaunched && (
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void generatePRPPatch()} disabled={isBusy || !modFileName}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                  {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : xeditPath ? <Play className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />}
                  {xeditPath ? 'Generate & Launch FO4Edit' : 'Generate & Save PRP Patch Script'}
                </button>
                <button type="button" onClick={() => void saveAs(patchScript, patchName.replace('.esp', '.pas'))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:border-slate-400 text-sm font-bold text-slate-200 transition-colors">
                  <ArrowDownToLine className="w-4 h-4" />Save Script
                </button>
              </div>
            )}
          </div>

          {patchLaunched && (
            <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                <div className="text-lg font-black text-emerald-300">FO4Edit Launched!</div>
              </div>
              <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                <li>Wait for background loading and script completion.</li>
                <li>When you see <code className="text-emerald-300">&quot;Single-mod PRP patch complete!&quot;</code> &mdash; save and exit.</li>
                <li>Enable <code className="text-white">{patchName}</code> in MO2.</li>
                <li>Load order: <strong className="text-white">Masters &rarr; PRP &rarr; {modFileName} &rarr; {patchName}</strong></li>
              </ol>
            </div>
          )}

          {patchScriptPath && (
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-slate-400" />PRP patch script
              </div>
              <code className="text-xs text-emerald-300 break-all">{patchScriptPath}</code>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPhase('ck')}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">&larr; Back to CK Steps</button>
            <button type="button" onClick={() => {
              setPhase('pick'); setPrepScriptPath(''); setPatchScriptPath('');
              setPatchLaunched(false); setModFile(''); setError(''); setStatus('');
            }} className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-sm font-bold text-slate-300 transition-colors">
              Start New Mod
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main tabbed container ─────────────────────────────────────────────────────
type Tab = 'loadorder' | 'singlemod';

export default function PrecombineGenerator() {
  const [tab, setTab] = useState<Tab>('loadorder');

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-[#0a120a] to-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase mb-2">Mossy &middot; PRP Tools</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="w-9 h-9 text-emerald-400" />PRP Patch Tools
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">
            Two tools in one place: create a combined patch for your <em>entire load order</em>,
            or rebuild precombines and make a PRP companion patch for a <em>single mod you just built</em>.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 border-b border-slate-800">
          <button type="button" onClick={() => setTab('loadorder')}
            className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              tab === 'loadorder' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'}`}>
            <span className="flex items-center gap-2"><List className="w-4 h-4" />Full Load Order Patch</span>
          </button>
          <button type="button" onClick={() => setTab('singlemod')}
            className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              tab === 'singlemod' ? 'bg-purple-900/30 border-purple-500 text-purple-300' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'}`}>
            <span className="flex items-center gap-2"><Package className="w-4 h-4" />Single Mod Precombine + PRP</span>
          </button>
        </div>

        {tab === 'loadorder' ? <FullLoadOrderWizard /> : <SingleModPrecombineWizard />}
      </div>
    </div>
  );
}
