/**
 * "Your PC" -- what Mossy can run on this computer, and what to install.
 *
 * Shown in first-run onboarding right after the program scan, and again from
 * Settings so people can recheck after installing something. The main process
 * measures the hardware (hardwareProfile.ts) and decides each feature's state
 * (shared/hardwareCapabilities.ts); this component only displays it.
 *
 * Nothing installs without a click. Programs Mossy can verify (checksum and
 * publisher signature, see setupInstaller.ts) get an opt-in "Download and set
 * up for me" with a folder the user chooses, so big downloads can go on another
 * drive. Everything else gets its official link plus written setup steps.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, MemoryStick, HardDrive, MonitorSmartphone, CheckCircle2, Download, AlertTriangle, Ban, ExternalLink, RefreshCw, Loader2, ChevronDown, ChevronUp, FolderOpen, ListOrdered } from 'lucide-react';
import type { Capability, CapabilityState, HardwareProfile } from '../../shared/hardwareCapabilities';
import { openExternal } from './utils/openExternal';
import { BrainBSettings } from './BrainBSettings';

type ProfileResult = {
  success: boolean;
  error?: string;
  profile?: HardwareProfile;
  capabilities?: Capability[];
  recommendedModel?: { tag: string; label: string; sizeGB: number; onGpu: boolean };
};
type ComponentId = 'ollama' | 'python' | 'photocraft' | 'cd-helpers' | 'memory-pack';
type Progress = { id?: string; tag?: string; phase?: string; status?: string; message?: string; received?: number | null; total?: number | null; completed?: number | null };
type Locations = Record<ComponentId | 'ollamaModels', string>;

const api = () => (window as any).electron?.api || (window as any).electronAPI;

const STATE_STYLE: Record<CapabilityState, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, cls: 'text-emerald-300 border-emerald-600/50 bg-emerald-900/30' },
  'needs-setup': { label: 'Needs setup', icon: Download, cls: 'text-amber-300 border-amber-600/50 bg-amber-900/30' },
  limited: { label: 'Limited', icon: AlertTriangle, cls: 'text-orange-300 border-orange-600/50 bg-orange-900/30' },
  'not-supported': { label: 'Not on this PC', icon: Ban, cls: 'text-slate-400 border-slate-600/50 bg-slate-800/40' },
};

const COMPONENT_NAME: Record<ComponentId, string> = { ollama: 'Ollama', python: 'Python', photocraft: 'PhotoCraft', 'cd-helpers': 'the AI helpers', 'memory-pack': 'the starter memory' };
const gb = (mb: number | null) => (mb ? `${Math.round((mb / 1024) * 10) / 10} GB` : 'unknown');
const pctOf = (p: Progress | null) => {
  const done = p?.received ?? p?.completed;
  return p?.total && done != null ? Math.floor((done / p.total) * 100) : null;
};

const FolderField: React.FC<{ label: string; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => {
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    api()?.setup?.freeSpace?.(value).then((f: number | null) => { if (live) setFree(f); }).catch(() => {});
    return () => { live = false; };
  }, [value]);
  const pick = async () => {
    const dir = await api()?.setup?.pickFolder?.({ defaultPath: value, title: label });
    if (dir) onChange(dir);
  };
  return (
    <div>
      <div className="text-[11px] text-slate-400 mb-1">{label}</div>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
        <button onClick={pick} disabled={disabled} className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center gap-1 disabled:opacity-50"><FolderOpen className="w-3 h-3" />Change</button>
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{free === null ? 'Free space unknown' : `${free} GB free on that drive`}</div>
    </div>
  );
};

export const HardwareCheck: React.FC<{ onContinue?: () => void; embedded?: boolean }> = ({ onContinue, embedded = false }) => {
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // model tag, component id, or 'models-folder'
  const [progress, setProgress] = useState<Progress | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [openPanel, setOpenPanel] = useState<string | null>(null); // capId:actionKind:target
  const [locations, setLocations] = useState<Locations | null>(null);
  const [modelsDir, setModelsDir] = useState('');

  const measure = useCallback(async () => {
    setLoading(true);
    try {
      const r: ProfileResult = await api()?.setup?.getHardwareProfile?.();
      setResult(r || { success: false, error: 'This version of Mossy has no hardware check.' });
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    api()?.setup?.installDefaults?.().then((d: { locations: Locations }) => {
      if (d?.locations) { setLocations(d.locations); setModelsDir(d.locations.ollamaModels); }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const offPull = api()?.setup?.onPullProgress?.((p: Progress) => setProgress(p));
    const offInstall = api()?.setup?.onInstallProgress?.((p: Progress) => setProgress(p));
    return () => { offPull?.(); offInstall?.(); };
  }, []);

  const say = (capId: string, ok: boolean, text: string) => setMessages((m) => ({ ...m, [capId]: { ok, text } }));

  const pullModel = async (capId: string, tag: string) => {
    setBusy(tag); setProgress(null);
    const r = await api()?.setup?.pullModel?.(tag);
    setBusy(null);
    say(capId, !!r?.success, r?.success ? `${tag} downloaded and set as Mossy's chat model.` : (r?.error || 'Download failed.'));
    if (r?.success) measure();
  };

  const install = async (capId: string, id: ComponentId) => {
    if (!locations) return;
    setBusy(id); setProgress(null);
    const r = await api()?.setup?.installComponent?.({ id, targetDir: locations[id], modelsDir: id === 'ollama' ? modelsDir : undefined });
    setBusy(null);
    say(capId, !!r?.success, r?.success ? r.message : (r?.error || 'Install failed.'));
    if (r?.success) { setOpenPanel(null); measure(); }
  };

  const moveModels = async (capId: string) => {
    setBusy('models-folder');
    const r = await api()?.setup?.setOllamaModelsDir?.(modelsDir);
    setBusy(null);
    say(capId, !!r?.success, r?.success ? `Ollama now stores new models in ${modelsDir}. Models you already had stay in the old folder; download them again or move that folder's contents here.` : (r?.error || 'Could not change the model folder.'));
    if (r?.success) { setOpenPanel(null); measure(); }
  };

  const p = result?.profile;
  const pct = pctOf(progress);

  return (
    <div className={embedded ? 'space-y-4' : 'animate-fade-in space-y-4'}>
      {!embedded && (
        <div className="text-center mb-2">
          <MonitorSmartphone className="w-14 h-14 mx-auto mb-3 text-amber-400" />
          <h2 className="text-2xl font-bold text-white mb-1">What your PC can run</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Mossy checked your hardware. Every modding tool works on any PC; the AI parts depend on your graphics card and memory.
            Nothing is installed unless you click for it, and you choose the folder, so big downloads can go on another drive.
          </p>
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 text-slate-300 text-sm py-8"><Loader2 className="w-4 h-4 animate-spin" />Checking your hardware...</div>
      )}

      {result && !result.success && (
        <div className="text-sm text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg p-3">
          The hardware check failed: {result.error}. You can continue; Settings has the same check to try again later.
        </div>
      )}

      {p && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"><Cpu className="w-4 h-4 text-slate-400 mb-1" /><div className="text-white font-semibold truncate" title={p.cpu.model}>{p.cpu.model}</div><div className="text-slate-500">{p.cpu.logicalCores} threads</div></div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"><MemoryStick className="w-4 h-4 text-slate-400 mb-1" /><div className="text-white font-semibold">{p.ramGB} GB RAM</div><div className="text-slate-500">system memory</div></div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"><MonitorSmartphone className="w-4 h-4 text-slate-400 mb-1" />
            {p.gpus.length === 0 ? <div className="text-white font-semibold">No graphics card found</div> : p.gpus.map((g) => (
              <div key={g.name} className="text-white font-semibold truncate" title={g.name}>{g.name} <span className="text-slate-400 font-normal">{g.vendor === 'intel' && !g.vramMB ? 'shared memory' : gb(g.vramMB)}</span></div>
            ))}
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"><HardDrive className="w-4 h-4 text-slate-400 mb-1" /><div className="text-white font-semibold">{p.freeDiskGB === null ? 'unknown' : `${p.freeDiskGB} GB free`}</div><div className="text-slate-500">on Mossy's data drive</div></div>
        </div>
      )}

      {result?.capabilities && (
        <div className={`space-y-2 ${embedded ? '' : 'max-h-[46vh] overflow-y-auto pr-1'}`}>
          {result.capabilities.map((c) => {
            const st = STATE_STYLE[c.state];
            const msg = messages[c.id];
            return (
              <div key={c.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{c.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.summary}</div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}><st.icon className="w-3 h-3" />{st.label}</span>
                </div>

                {c.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.actions.map((a) => {
                      const key = `${c.id}:${a.kind}:${a.target}`;
                      if (a.kind === 'link') {
                        return <button key={key} onClick={() => openExternal(a.target)} className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center gap-1"><ExternalLink className="w-3 h-3" />{a.label}</button>;
                      }
                      if (a.kind === 'pull-model') {
                        return (
                          <button key={key} disabled={!!busy} onClick={() => pullModel(c.id, a.target)} className="px-3 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center gap-1">
                            {busy === a.target ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}{a.label}
                          </button>
                        );
                      }
                      const isInstall = a.kind === 'install';
                      return (
                        <button key={key} disabled={!!busy} onClick={() => setOpenPanel((v) => (v === key ? null : key))} className={`px-3 py-1 text-xs rounded border flex items-center gap-1 disabled:opacity-50 ${isInstall ? 'bg-emerald-800/60 hover:bg-emerald-700/60 border-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'}`}>
                          {openPanel === key ? <ChevronUp className="w-3 h-3" /> : isInstall ? <Download className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{a.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {c.actions.filter((a) => openPanel === `${c.id}:${a.kind}:${a.target}`).map((a) => {
                  if (a.kind === 'install' && locations) {
                    const id = a.target as ComponentId;
                    return (
                      <div key="panel" className="mt-3 border-t border-slate-700 pt-3 space-y-2">
                        <FolderField label={`Install ${COMPONENT_NAME[id]} into`} value={locations[id]} onChange={(v) => setLocations({ ...locations, [id]: v })} disabled={!!busy} />
                        {id === 'ollama' && <FolderField label="Store AI models in (they are the big part: 2-8 GB each)" value={modelsDir} onChange={setModelsDir} disabled={!!busy} />}
                        <div className="text-[11px] text-slate-500">
                          {id === 'memory-pack'
                            ? 'Mossy downloads the pack from its GitHub release and checks every file against the published SHA-256 list. Files from your own scans are never replaced.'
                            : id === 'cd-helpers'
                            ? 'Mossy copies the helper scripts that came with it, makes a private Python environment in this folder and installs their packages from PyPI. Nothing else on your PC changes.'
                            : `Mossy downloads the official release, checks its SHA-256${id === 'photocraft' ? '' : ' and publisher signature'}, and only then installs it. The download is deleted afterwards.`}
                        </div>
                        <button disabled={!!busy} onClick={() => install(c.id, id)} className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold flex items-center gap-1">
                          {busy === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}Download and set up {COMPONENT_NAME[id]}
                        </button>
                      </div>
                    );
                  }
                  if (a.kind === 'models-folder') {
                    return (
                      <div key="panel" className="mt-3 border-t border-slate-700 pt-3 space-y-2">
                        <FolderField label="Store Ollama models in" value={modelsDir} onChange={setModelsDir} disabled={!!busy} />
                        <div className="text-[11px] text-slate-500">Mossy sets this for Ollama and restarts it. Models already downloaded stay in the old folder.</div>
                        <button disabled={!!busy} onClick={() => moveModels(c.id)} className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold flex items-center gap-1">
                          {busy === 'models-folder' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}Use this folder
                        </button>
                      </div>
                    );
                  }
                  if (a.kind === 'open-panel' && c.id === 'brain-b') {
                    return <div key="panel" className="mt-3 border-t border-slate-700 pt-3"><BrainBSettings embedded /></div>;
                  }
                  return null;
                })}

                {busy && c.actions.some((a) => a.target === busy || (busy === 'models-folder' && a.kind === 'models-folder')) && (
                  <div className="mt-2 text-xs text-slate-300">
                    {progress?.message || progress?.status || 'Starting...'}{pct !== null && ` -- ${pct}%`}
                    {pct !== null && <div className="mt-1 h-1.5 bg-slate-800 rounded"><div className="h-1.5 bg-emerald-500 rounded" style={{ width: `${pct}%` }} /></div>}
                  </div>
                )}
                {msg && <div className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</div>}

                {c.setupSteps && c.setupSteps.length > 0 && (
                  <div className="mt-3 border-t border-slate-700 pt-2">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1"><ListOrdered className="w-3 h-3" />How to set it up</div>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400">
                      {c.setupSteps.map((s) => <li key={s}>{s}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-1">
        <button onClick={measure} disabled={loading} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Recheck
        </button>
        {onContinue && (
          <button onClick={onContinue} disabled={!!busy} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold">
            {busy ? 'Wait for the download to finish' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
};

export default HardwareCheck;
