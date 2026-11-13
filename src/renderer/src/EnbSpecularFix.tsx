/**
 * ENB Specular Fix -- Textures hub tab.
 *
 * Repairs old texture mods whose specular maps (_s) make ENB Complex Parallax smear:
 * every _s that is not BC5 is re-saved as BC5 like vanilla (red = specular,
 * green = smoothness, no alpha). Fixed copies go to "<mod> - ENB Specular Fix" next
 * to each mod; the original mod is never modified. All numbers shown here are read
 * back from the main process (file headers, texconv/BSArch exit codes, verified
 * outputs); see src/electron/enbSpecularFix.ts.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { FolderOpen, Play, Square, Loader2, CheckCircle2, XCircle, RefreshCw, Search, Wrench, AlertTriangle, ExternalLink } from 'lucide-react';

function getBridge(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}
const call = async (channel: string, params?: unknown): Promise<any> => getBridge()?.invoke?.(channel, params);

type Status = { texconv: string | null; bsarch: string | null };
type ScanRow = { mod: string; path: string; looseSpecular: number; toFix: number; formats: Record<string, number>; ba2: string[]; fixExists: boolean; covered: number };
type ModResult = { mod: string; out: string; ok: number; failed: number };
type Job = {
  running: boolean; cancelled: boolean; phase: string; modIndex: number; modCount: number; currentMod: string;
  fileDone: number; fileTotal: number; done: number; failed: number;
  results: ModResult[]; notes: string[]; log: string[]; startedAt: number; finishedAt: number | null; root: string;
};

const Row: React.FC<{ ok: boolean; label: string; detail?: string }> = ({ ok, label, detail }) => (
  <div className="flex items-start gap-2 text-xs">
    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
    <div><span className="text-slate-200">{label}</span>{detail && <span className="text-slate-500"> -- {detail}</span>}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; hint: string }> = ({ checked, onChange, disabled, label, hint }) => (
  <label className={`flex items-start gap-2 text-xs ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
    <span><span className="text-slate-200">{label}</span><span className="block text-slate-500">{hint}</span></span>
  </label>
);

const EnbSpecularFix: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [folder, setFolder] = useState('');
  const [allInside, setAllInside] = useState(false);
  const [includeBa2, setIncludeBa2] = useState(true);
  const [rows, setRows] = useState<ScanRow[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const refreshStatus = useCallback(async () => { setStatus(await call('enbfix:status')); }, []);

  useEffect(() => {
    refreshStatus();
    try {
      const s = localStorage.getItem('enbfix_folder'); if (s) setFolder(s);
      setAllInside(localStorage.getItem('enbfix_all') === '1');
    } catch { /* storage blocked */ }
  }, [refreshStatus]);
  useEffect(() => {
    try { localStorage.setItem('enbfix_folder', folder); localStorage.setItem('enbfix_all', allInside ? '1' : '0'); } catch { /* storage blocked */ }
  }, [folder, allInside]);

  // Poll the real job (and once on mount, to re-attach after navigating away).
  useEffect(() => {
    let stop = false;
    const tick = async () => { const j: Job | null = await call('enbfix:job-status'); if (!stop) setJob(j); };
    tick();
    const id = setInterval(tick, 1000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [job?.log?.length]);

  const running = !!job?.running;

  const pickFolder = async () => { const r = await call('enbfix:pick-folder'); if (r?.success) { setFolder(r.folder); setRows(null); } };
  const scan = async () => {
    if (!folder) return toast.error('Pick a mod folder first.');
    setScanning(true);
    try {
      const r = await call('enbfix:scan', { folder, allInside });
      if (r?.success) setRows(r.rows); else toast.error(r?.error || 'Scan failed.');
    } finally { setScanning(false); }
  };
  const start = async () => {
    if (!folder) return toast.error('Pick a mod folder first.');
    const r = await call('enbfix:start', { folder, allInside, includeBa2 });
    if (!r?.success) toast.error(r?.error || 'Could not start.');
  };
  const cancel = async () => { const r = await call('enbfix:cancel'); if (!r?.success) toast.error(r?.error || 'Stop failed.'); };
  const openFolder = async (f: string) => { const r = await call('enbfix:open-folder', { folder: f }); if (!r?.success) toast.error(r?.error || 'Could not open the folder.'); };

  const totalFix = rows?.reduce((n, r) => n + r.toFix, 0) ?? 0;
  const ba2Mods = rows?.filter((r) => r.ba2.length).length ?? 0;
  const pct = job && job.fileTotal ? Math.round((job.fileDone / job.fileTotal) * 100) : 0;
  const written = job?.results.filter((r) => r.ok) ?? [];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5 text-slate-200">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><Wrench className="h-5 w-5 text-emerald-300" />ENB Specular Fix</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Older texture mods often saved their specular maps (_s) with a mask in the alpha channel. ENB Complex Parallax reads that
          alpha as a height map (only exactly 255 means off), so those surfaces smear and stretch. This re-saves every such _s as BC5
          like the vanilla game -- shine and smoothness kept, no alpha. Your original mods are never changed.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Tools</h3>
          <button onClick={refreshStatus} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw className="h-3 w-3" />Recheck</button>
        </div>
        {!status ? <div className="text-xs text-slate-500">Checking...</div> : (
          <>
            <Row ok={!!status.texconv} label="texconv.exe" detail={status.texconv || 'not found -- set your Fallout 4 folder (the Creation Kit installs Tools\\Elric\\texconv.exe) or your xEdit path in Settings > External Tools'} />
            <Row ok={!!status.bsarch} label="BSArch.exe (for textures inside BA2 archives)" detail={status.bsarch || 'not found -- it ships with xEdit; set your xEdit path in Settings > External Tools. Loose textures still work without it'} />
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">1. Mods</h3>
        <div className="flex gap-2">
          <input value={folder} onChange={(e) => { setFolder(e.target.value); setRows(null); }} placeholder="A mod folder, or your Mod Organizer mods folder" className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs" />
          <button onClick={pickFolder} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />Browse</button>
        </div>
        <Toggle checked={allInside} onChange={(v) => { setAllInside(v); setRows(null); }} disabled={running} label="Every mod inside this folder" hint="Pick your Mod Organizer mods folder and every mod in it is checked and fixed separately." />
        <button onClick={scan} disabled={!folder || scanning || running} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs flex items-center gap-1">
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Scan
        </button>
        {rows && (rows.length === 0 ? <p className="text-xs text-emerald-300">Nothing to fix: no non-BC5 specular maps and no texture archives found.</p> : (
          <>
            <p className="text-xs text-slate-300">{totalFix} loose specular map(s) can smear{ba2Mods ? `; ${ba2Mods} mod(s) also have texture BA2s, which are checked when you run the fix` : ''}.</p>
            <div className="max-h-64 overflow-y-auto rounded border border-slate-800">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-950 text-slate-400 sticky top-0"><tr><th className="text-left p-1.5">Mod</th><th className="text-right p-1.5">To fix</th><th className="text-left p-1.5">Formats now</th><th className="text-left p-1.5">BA2</th><th className="text-left p-1.5">Fix folder</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.path} className="border-t border-slate-800">
                      <td className="p-1.5 text-slate-200">{r.mod}</td>
                      <td className="p-1.5 text-right">{r.toFix}</td>
                      <td className="p-1.5 text-slate-400">{Object.entries(r.formats).map(([k, v]) => `${k} ${v}`).join(', ') || '-'}</td>
                      <td className="p-1.5 text-slate-400">{r.ba2.length || '-'}</td>
                      <td className="p-1.5 text-slate-400">{r.fixExists ? `exists (${r.covered}/${r.toFix} loose done)` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">2. Fix</h3>
        <Toggle checked={includeBa2} onChange={setIncludeBa2} disabled={running || !status?.bsarch} label="Also fix textures inside BA2 archives" hint="Only the specular maps are pulled out of each archive and written as loose files in the fix folder." />
        <p className="text-[11px] text-amber-300/90 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />Skip mods that were made for ENB Complex Parallax on purpose (their description says so): this removes the alpha, and with it their parallax.</p>
        <div className="flex items-center gap-2 text-xs">
          {!running
            ? <button onClick={start} disabled={!folder || !status?.texconv} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1"><Play className="h-3.5 w-3.5" />Fix specular maps</button>
            : <button onClick={cancel} className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1"><Square className="h-3.5 w-3.5" />Stop</button>}
          {running && job && (
            <span className="text-emerald-300 flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />
              {job.phase} {job.currentMod} ({job.modIndex}/{job.modCount}){job.fileTotal ? ` -- ${job.fileDone}/${job.fileTotal}` : ''}
            </span>
          )}
        </div>
        {running && job && job.fileTotal > 0 && (
          <div className="h-1.5 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        )}
        {job && job.log.length > 0 && (
          <pre ref={logRef} className="h-40 overflow-y-auto bg-black/60 border border-slate-800 rounded p-2 text-[11px] text-slate-300 whitespace-pre-wrap">{job.log.join('\n')}</pre>
        )}
        {job && !job.running && (
          <div className="space-y-2">
            <p className={`text-xs ${job.failed || job.cancelled ? 'text-amber-300' : 'text-emerald-300'}`}>
              {job.phase}: {job.done} specular map(s) re-saved as BC5 and checked (BC5, same size){job.failed ? `, ${job.failed} failed (listed in the log)` : ''}.
            </p>
            {written.length > 0 && (
              <>
                <p className="text-xs text-slate-300">Install: in Mod Organizer, enable each "... - ENB Specular Fix" mod and place it <span className="font-bold">below</span> its original mod in the left pane so it wins. Disable it to go back.</p>
                <div className="space-y-1">
                  {written.map((r) => (
                    <div key={r.out} className="flex items-center gap-2 text-[11px]">
                      <button onClick={() => openFolder(r.out)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open</button>
                      <span className="text-slate-200">{r.mod}</span><span className="text-slate-500">{r.ok} fixed{r.failed ? `, ${r.failed} failed` : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {job.notes.length > 0 && (
              <div className="text-xs text-amber-300 space-y-0.5">
                <div className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Notes</div>
                {job.notes.slice(0, 20).map((n, i) => <div key={i} className="text-amber-200/80 pl-5">{n}</div>)}
                {job.notes.length > 20 && <div className="pl-5 text-slate-500">...and {job.notes.length - 20} more</div>}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default EnbSpecularFix;
