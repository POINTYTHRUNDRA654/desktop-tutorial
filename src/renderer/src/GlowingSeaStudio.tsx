/**
 * Glowing Sea Asset Studio -- Textures hub tab.
 *
 * Front end for tools/glowing-sea-texture-pipeline (extract mask -> ComfyUI
 * img2img -> mask-lock composite -> finalize + DDS) plus PhotoCraft, a free
 * (Apache-2.0 / MIT) separately installed image editor used for hand edits
 * and headless batch actions. Every status shown here is read back from the
 * main process (disk, ports, exit codes); nothing is assumed ready.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { FolderOpen, Play, Square, Loader2, CheckCircle2, XCircle, ImagePlus, ExternalLink, RefreshCw, Layers, AlertTriangle } from 'lucide-react';

function getBridge(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}
const call = async (channel: string, params?: unknown): Promise<any> => getBridge()?.invoke?.(channel, params);

type Status = {
  pipelineDir: string | null; python: string | null; comfyBase: string; comfyOnline: boolean; comfyModel: string;
  texconvPath: string; texconvFound: boolean; photocraftExe: string | null; photocraftCli: string | null;
};
type FolderInfo = { exists: boolean; hasInput: boolean; input: number; mask: number; enhanced: number; locked: number; output: number; needsReview: string[] };
type Job = { running: boolean; stage: number; totalStages?: number; log: string[]; exitCode: number | null };

const STAGES = ['Extract mask', 'Enhance (ComfyUI)', 'Mask-lock composite', 'Finalize + DDS'];
const baseName = (p: string) => p.split(/[\\/]/).pop() || p;

const Row: React.FC<{ ok: boolean; label: string; detail?: string }> = ({ ok, label, detail }) => (
  <div className="flex items-start gap-2 text-xs">
    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
    <div><span className="text-slate-200">{label}</span>{detail && <span className="text-slate-500"> -- {detail}</span>}</div>
  </div>
);

const GlowingSeaStudio: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [folder, setFolder] = useState('');
  const [info, setInfo] = useState<FolderInfo | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [fromStage, setFromStage] = useState(1);
  const [previewName, setPreviewName] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [actionsFile, setActionsFile] = useState('');
  const [batchIn, setBatchIn] = useState('');
  const [batchOut, setBatchOut] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchLog, setBatchLog] = useState('');
  const logRef = useRef<HTMLPreElement>(null);

  const refreshStatus = useCallback(async () => { setStatus(await call('glowingsea:status')); }, []);
  const refreshInfo = useCallback(async (f: string) => { if (f) setInfo(await call('glowingsea:folder-info', { folder: f })); }, []);

  useEffect(() => {
    refreshStatus();
    try { const s = localStorage.getItem('glowingsea_folder'); if (s) setFolder(s); } catch { /* storage blocked */ }
  }, [refreshStatus]);
  useEffect(() => {
    if (!folder) return;
    try { localStorage.setItem('glowingsea_folder', folder); } catch { /* storage blocked */ }
    refreshInfo(folder);
  }, [folder, refreshInfo]);

  // Poll the real job while one is running (and once on mount, to re-attach after navigating away).
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const j: Job = await call('glowingsea:job-status');
      if (stop) return;
      setJob(j);
      if (j?.running) refreshInfo(folder);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(id); };
  }, [folder, refreshInfo]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [job?.log?.length]);

  const pickFolder = async () => { const r = await call('glowingsea:pick-folder'); if (r?.success) setFolder(r.folder); };
  const addInputs = async () => {
    if (!folder) return toast.error('Pick a batch folder first.');
    const r = await call('glowingsea:add-inputs', { folder });
    if (r?.success) { toast.success(`Copied ${r.copied} texture(s) into Input (originals untouched).`); refreshInfo(folder); }
    else if (r?.error) toast.error(r.error);
  };
  const run = async () => {
    if (!folder) return toast.error('Pick a batch folder first.');
    const r = await call('glowingsea:run-pipeline', { folder, fromStage });
    if (!r?.success) toast.error(r?.error || 'Could not start the pipeline.');
  };
  const cancel = async () => { const r = await call('glowingsea:cancel'); if (!r?.success) toast.error(r?.error || 'Cancel failed.'); };

  useEffect(() => {
    if (!folder || !info || info.enhanced === 0) return;
    call('glowingsea:list-stage', { folder, stage: 'Enhanced' }).then((r) => setNames((r?.files || []).map(baseName)));
  }, [folder, info?.enhanced]);

  const showPreview = async (name: string) => {
    setPreviewName(name); setBefore(null); setAfter(null); setPreviewMsg('');
    if (!name) return;
    const orig = await call('glowingsea:preview', { filePath: `${folder}\\Input\\${name}` });
    const locked = await call('glowingsea:preview', { filePath: `${folder}\\UV-Locked\\${name}` });
    const result = locked?.success ? locked : await call('glowingsea:preview', { filePath: `${folder}\\Enhanced\\${name}` });
    if (orig?.success) setBefore(orig.dataUrl);
    else setPreviewMsg('The original is a .dds, so there is no side-by-side. Convert it to PNG in the DDS Converter tab, or open the result in PhotoCraft.');
    if (result?.success) setAfter(result.dataUrl);
  };

  const openPhotoCraft = async (filePath?: string) => {
    const r = await call('glowingsea:open-photocraft', { filePath });
    if (!r?.success) toast.error(r?.error || 'Could not launch PhotoCraft.');
  };
  const pickActions = async () => { const r = await call('glowingsea:pick-file', { filters: [{ name: 'PhotoCraft actions', extensions: ['json', 'atn'] }] }); if (r?.success) setActionsFile(r.filePath); };
  const pickDir = async (set: (v: string) => void) => { const r = await call('glowingsea:pick-folder'); if (r?.success) set(r.folder); };
  const runBatch = async () => {
    setBatchBusy(true); setBatchLog('');
    const r = await call('glowingsea:photocraft-batch', { actionsFile, inDir: batchIn, outDir: batchOut, format: 'png' });
    setBatchBusy(false);
    setBatchLog(r?.output || r?.error || '');
    if (r?.success) toast.success('PhotoCraft batch finished (exit 0).'); else toast.error(r?.error || 'Batch failed.');
  };

  const running = !!job?.running;
  const ready = !!status?.pipelineDir && !!status?.python;
  const batchRows: [string, string, (v: string) => void, () => void][] = [
    ['Actions file', actionsFile, setActionsFile, pickActions],
    ['Input folder', batchIn, setBatchIn, () => pickDir(setBatchIn)],
    ['Output folder', batchOut, setBatchOut, () => pickDir(setBatchOut)],
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5 text-slate-200">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-300" />Glowing Sea Asset Studio</h2>
        <p className="text-xs text-slate-400 mt-1">Batch-enhance FO4 textures in the Glowing Sea style. The silhouette and alpha are locked to the original; only the painted area changes.</p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Setup</h3>
          <button onClick={refreshStatus} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw className="h-3 w-3" />Recheck</button>
        </div>
        {!status ? <div className="text-xs text-slate-500">Checking...</div> : (
          <>
            <Row ok={!!status.pipelineDir} label="Pipeline scripts" detail={status.pipelineDir || 'tools/glowing-sea-texture-pipeline not found'} />
            <Row ok={!!status.python} label="Python" detail={status.python || 'not on PATH -- install Python, then pip install -r requirements.txt'} />
            <Row ok={status.comfyOnline} label="ComfyUI" detail={status.comfyOnline ? `${status.comfyBase} (model ${status.comfyModel})` : `offline at ${status.comfyBase} -- stage 2 needs it running; the other stages do not`} />
            <Row ok={status.texconvFound} label="texconv.exe (DDS output)" detail={status.texconvFound ? status.texconvPath : 'not found -- set your Fallout 4 folder in Settings > External Tools (the Creation Kit installs Tools\\Elric\\texconv.exe there)'} />
            <Row ok={!!status.photocraftExe} label="PhotoCraft" detail={status.photocraftExe || 'not installed (optional, free: github.com/storytold/photocraft)'} />
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">1. Batch folder</h3>
        <div className="flex gap-2">
          <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder that holds (or will hold) an Input subfolder" className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs" />
          <button onClick={pickFolder} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />Browse</button>
          <button onClick={addInputs} disabled={!folder} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs flex items-center gap-1"><ImagePlus className="h-3.5 w-3.5" />Add textures</button>
        </div>
        {info && (
          <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
            {([['Input', info.input], ['Masks', info.mask], ['Enhanced', info.enhanced], ['Locked', info.locked], ['Output', info.output]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="rounded bg-slate-950 border border-slate-800 py-2"><div className="text-base font-bold text-white">{v}</div><div className="text-slate-500">{k}</div></div>
            ))}
          </div>
        )}
        {info && !info.hasInput && folder && <p className="text-xs text-amber-300 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />No Input subfolder yet. Use Add textures (it copies; your originals are never modified).</p>}
        {info && info.needsReview.length > 0 && (
          <div className="text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{info.needsReview.length} line(s) flagged for manual review in needs_review.txt: {info.needsReview.slice(0, 3).join(' | ')}</div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">2. Run</h3>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-400">Start at</label>
          <select value={fromStage} onChange={(e) => setFromStage(Number(e.target.value))} disabled={running} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            {STAGES.map((s, i) => <option key={s} value={i + 1}>Stage {i + 1}: {s}</option>)}
          </select>
          {!running
            ? <button onClick={run} disabled={!ready || !folder} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1"><Play className="h-3.5 w-3.5" />Run pipeline</button>
            : <button onClick={cancel} className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1"><Square className="h-3.5 w-3.5" />Cancel</button>}
          {running && <span className="text-emerald-300 flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />Stage {job?.stage}/4: {STAGES[(job?.stage || 1) - 1]}</span>}
        </div>
        <p className="text-[11px] text-slate-500">A 4096x4096 texture takes about 22 minutes in stage 2 on an RTX 2070 SUPER. Each stage's output stays on disk, so a failure never forces re-generation.</p>
        {job && job.log.length > 0 && (
          <>
            <pre ref={logRef} className="h-44 overflow-y-auto bg-black/60 border border-slate-800 rounded p-2 text-[11px] text-slate-300 whitespace-pre-wrap">{job.log.join('\n')}</pre>
            {!job.running && job.exitCode !== null && (
              <p className={`text-xs ${job.exitCode === 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{job.exitCode === 0 ? 'Pipeline finished with exit code 0.' : `Pipeline stopped (exit ${job.exitCode}). See the log above.`}</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">3. Compare</h3>
        {names.length === 0 ? <p className="text-xs text-slate-500">Enhanced results appear here after stage 2.</p> : (
          <>
            <select value={previewName} onChange={(e) => showPreview(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs">
              <option value="">Choose a texture...</option>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {previewMsg && <p className="text-xs text-amber-300">{previewMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-[11px] text-slate-500 mb-1">Original</div>{before ? <img src={before} className="w-full rounded border border-slate-800" /> : <div className="h-40 rounded border border-dashed border-slate-800" />}</div>
              <div><div className="text-[11px] text-slate-500 mb-1">Result</div>{after ? <img src={after} className="w-full rounded border border-slate-800" /> : <div className="h-40 rounded border border-dashed border-slate-800" />}</div>
            </div>
            {previewName && (
              <button onClick={() => openPhotoCraft(`${folder}\\UV-Locked\\${previewName}`)} disabled={!status?.photocraftExe} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" />Open result in PhotoCraft</button>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">PhotoCraft</h3>
        <button onClick={() => openPhotoCraft()} disabled={!status?.photocraftExe} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" />Launch PhotoCraft</button>
        <div className="space-y-2 text-xs">
          <p className="text-slate-400">Headless batch: apply a saved PhotoCraft action (.json / .atn) to every image in a folder. Output goes to a different folder; originals are never overwritten.</p>
          {batchRows.map(([label, val, set, pick]) => (
            <div key={label} className="flex gap-2">
              <input value={val} onChange={(e) => set(e.target.value)} placeholder={label} className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5" />
              <button onClick={pick} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />Browse</button>
            </div>
          ))}
          <button onClick={runBatch} disabled={batchBusy || !status?.photocraftCli || !actionsFile || !batchIn || !batchOut} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1">
            {batchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run batch
          </button>
          {batchLog && <pre className="max-h-32 overflow-y-auto bg-black/60 border border-slate-800 rounded p-2 text-[11px] whitespace-pre-wrap">{batchLog}</pre>}
        </div>
      </section>
    </div>
  );
};

export default GlowingSeaStudio;
