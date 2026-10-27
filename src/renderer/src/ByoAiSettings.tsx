/**
 * Settings > Your own AI service (optional). Off by default: Mossy runs on
 * local AI. Turning this on sends chat to a service the user picks, with
 * their own key (stored encrypted by the main process, never shown again).
 */
import React, { useEffect, useState } from 'react';
import { Cloud, ExternalLink, KeyRound, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { openExternal } from './utils/openExternal';

type Preset = 'openai' | 'groq' | 'openrouter' | 'custom';
type Config = { enabled: boolean; preset: Preset; baseUrl: string; model: string; hasKey: boolean; encryptionAvailable: boolean; presets: Record<Preset, { label: string; baseUrl: string; keyUrl: string }> };

const api = () => (window as any).electron?.api || (window as any).electronAPI;

const ByoAiSettings: React.FC = () => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [preset, setPreset] = useState<Preset>('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);

  const load = async () => {
    const c: Config = await api()?.byoAi?.get?.();
    if (!c) return;
    setCfg(c); setPreset(c.preset); setBaseUrl(c.baseUrl || c.presets[c.preset]?.baseUrl || ''); setModel(c.model);
  };
  useEffect(() => { load(); }, []);

  const pickPreset = (p: Preset) => { setPreset(p); if (cfg?.presets[p]?.baseUrl) setBaseUrl(cfg.presets[p].baseUrl); setModels([]); };

  const test = async () => {
    setBusy(true); setMsg(null);
    const r = await api()?.byoAi?.test?.({ baseUrl, apiKey: apiKey || undefined });
    setBusy(false);
    if (r?.ok) { setModels(r.models || []); setMsg({ ok: true, text: `Connected. The service lists ${r.models?.length ?? 0} model(s).` }); }
    else setMsg({ ok: false, text: `Could not connect: ${r?.error || 'no answer'}` });
  };

  const save = async (enabled: boolean) => {
    setBusy(true); setMsg(null);
    const r = await api()?.byoAi?.save?.({ enabled, preset, baseUrl, model, apiKey: apiKey ? apiKey : undefined });
    setBusy(false); setApiKey('');
    if (r?.success) { setMsg({ ok: true, text: enabled ? `On. Mossy's chat now uses ${model} at ${baseUrl}.` : 'Off. Mossy is back on local AI.' }); load(); }
    else setMsg({ ok: false, text: r?.error || 'Could not save.' });
  };

  const removeKey = async () => {
    const r = await api()?.byoAi?.save?.({ enabled: false, preset, baseUrl, model, apiKey: '' });
    setMsg(r?.success ? { ok: true, text: 'Key deleted from this PC and the service turned off.' } : { ok: false, text: r?.error || 'Could not delete the key.' });
    load();
  };

  if (!cfg) return <div className="text-xs text-slate-500">Loading...</div>;
  const keyUrl = cfg.presets[preset]?.keyUrl;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-800/50 rounded p-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Optional. Mossy runs on local AI and sends nothing to the internet unless you turn this on. When it's on, your chat messages and the
          context Mossy adds to them go to the service you choose, under that service's terms and prices. Your key is encrypted on this PC and never shown again.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">Service
          <select value={preset} onChange={(e) => pickPreset(e.target.value as Preset)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
            {(Object.keys(cfg.presets) as Preset[]).map((p) => <option key={p} value={p}>{cfg.presets[p].label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Model
          <input list="byo-models" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
          <datalist id="byo-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
      </div>
      <label className="block text-xs text-slate-400">Service address (OpenAI-compatible, ends in /v1)
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
      </label>
      <label className="block text-xs text-slate-400">API key {cfg.hasKey && <span className="text-emerald-400">(a key is saved; leave empty to keep it)</span>}
        <div className="flex gap-2 mt-1">
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.hasKey ? '••••••••' : 'Paste your key'} autoComplete="off" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
          {keyUrl && <button onClick={() => openExternal(keyUrl)} className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Get a key</button>}
        </div>
      </label>
      {!cfg.encryptionAvailable && <div className="text-xs text-rose-300">Windows can't encrypt data for this account right now, so Mossy won't store a key.</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={test} disabled={busy || !baseUrl} className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 disabled:opacity-50 flex items-center gap-1">{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}Test connection</button>
        {!cfg.enabled
          ? <button onClick={() => save(true)} disabled={busy || !baseUrl || !model || (!cfg.hasKey && !apiKey)} className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold">Use this service for Mossy's chat</button>
          : <button onClick={() => save(false)} disabled={busy} className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-semibold">Turn off (back to local AI)</button>}
        {cfg.enabled && <button onClick={() => save(true)} disabled={busy || !model} className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600">Save changes</button>}
        {cfg.hasKey && <button onClick={removeKey} disabled={busy} className="px-3 py-1.5 text-xs rounded bg-rose-900/60 hover:bg-rose-800/60 border border-rose-700 flex items-center gap-1"><KeyRound className="w-3 h-3" />Delete my key</button>}
      </div>
      <div className="text-xs text-slate-400">Status: {cfg.enabled ? <span className="text-amber-300">ON, chat uses {cfg.model} at {cfg.baseUrl}</span> : <span className="text-emerald-300">off (local AI)</span>}</div>
      {msg && <div className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{msg.text}</div>}
    </div>
  );
};

export default ByoAiSettings;
