/**
 * Update notice + Settings > Updates.
 *
 * UpdateNotice runs once per launch (a little after start-up, outside first-run
 * setup). The main process decides whether a check is due (switched on, at most
 * once a day, not a version the user already dismissed) and only reads the
 * public GitHub Releases list. Mossy never downloads or installs the update
 * itself: the notice opens the release page.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, RefreshCw, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { openExternal } from './utils/openExternal';

const api = () => (window as any).electron?.api || (window as any).electronAPI;

export const UpdateNotice: React.FC<{ active: boolean }> = ({ active }) => {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      try {
        const r = await api()?.updates?.startupCheck?.();
        if (!r?.ok || !r.newer || !r.url) return;
        toast.custom((tt) => (
          <div className="max-w-sm bg-slate-900 border border-emerald-600/60 rounded-lg p-3 shadow-xl text-sm text-slate-100">
            <div className="font-bold text-white flex items-center gap-1.5"><Download className="w-4 h-4 text-emerald-400" />Mossy {r.latest} is available</div>
            <div className="text-xs text-slate-400 mt-1">You have {r.current}. Download the installer for your edition (NVIDIA or Universal) from the release page; your settings and memory are kept.</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { void openExternal(r.url); toast.dismiss(tt.id); }} className="px-3 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1"><ExternalLink className="w-3 h-3" />Open download page</button>
              <button onClick={() => { void api()?.updates?.dismiss?.(r.latest); toast.dismiss(tt.id); }} className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600">Skip this version</button>
              <button onClick={() => toast.dismiss(tt.id)} className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700">Later</button>
            </div>
          </div>
        ), { duration: Infinity, id: 'mossy-update' });
      } catch { /* no notice when the check can't run */ }
    }, 15_000);
    return () => clearTimeout(timer);
  }, [active]);
  return null;
};

export const UpdateSettings: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api()?.getSettings?.().then((s: any) => setEnabled((s?.settings ?? s)?.updateCheckEnabled !== false)).catch(() => setEnabled(true));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    await api()?.setSettings?.({ updateCheckEnabled: next });
    setEnabled(next);
  };

  const checkNow = async () => {
    setBusy(true); setResult(null);
    setResult(await api()?.updates?.check?.());
    setBusy(false);
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">Mossy can tell you when a new version is on GitHub. The check only reads the public Releases page; nothing about you is sent, and nothing is downloaded or installed without you.</p>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={!!enabled} disabled={enabled === null} onChange={toggle} className="w-4 h-4 accent-emerald-500" />
        <span className="text-white font-semibold">Tell me when a new version is out (checks at most once a day)</span>
      </label>
      <button onClick={checkNow} disabled={busy} className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 disabled:opacity-50 flex items-center gap-1">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Check for updates now
      </button>
      {result && (result.ok
        ? (result.newer
          ? <div className="text-xs text-emerald-300 flex items-center gap-2"><Download className="w-3 h-3" />Mossy {result.latest} is available (you have {result.current}).
              <button onClick={() => openExternal(result.url)} className="underline text-blue-300">Open download page</button></div>
          : <div className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />You're up to date ({result.current}{result.latest ? `; latest release ${result.latest}` : ''}).</div>)
        : <div className="text-xs text-rose-300 flex items-center gap-1"><XCircle className="w-3 h-3" />Couldn't check: {result.error}</div>)}
    </div>
  );
};

export default UpdateNotice;
