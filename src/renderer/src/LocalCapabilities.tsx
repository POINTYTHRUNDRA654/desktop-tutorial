import React, { useEffect, useMemo, useState } from 'react';

type CapsStatus = {
  ok: true;
  ollama:
    | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
    | { ok: false; provider: 'ollama'; baseUrl: string; error: string };
  cosmos:
    | { ok: true; provider: 'cosmos'; baseUrl: string; models: string[] }
    | { ok: false; provider: 'cosmos'; baseUrl: string; error: string };
  openaiCompat:
    | { ok: true; provider: 'openai_compat'; baseUrl: string; models: string[] }
    | { ok: false; provider: 'openai_compat'; baseUrl: string; error: string };
};

type LocalAiPreferred = 'auto' | 'cosmos' | 'ollama' | 'openai_compat' | 'off';

type LocalAiSettings = {
  localAiPreferredProvider?: LocalAiPreferred;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
  cosmosBaseUrl?: string;
  cosmosModel?: string;
};

type LocalCapabilitiesProps = {
  embedded?: boolean;
};

export default function LocalCapabilities({ embedded = false }: LocalCapabilitiesProps): JSX.Element {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [caps, setCaps] = useState<CapsStatus | null>(null);
  const [settings, setSettings] = useState<LocalAiSettings>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preferred: LocalAiPreferred = (settings.localAiPreferredProvider || 'auto') as LocalAiPreferred;

  const ollamaModels = useMemo(() => (caps?.ollama.ok ? caps.ollama.models : []), [caps]);
  const cosmosModels = useMemo(() => (caps?.cosmos.ok ? caps.cosmos.models : []), [caps]);
  const openaiModels = useMemo(() => (caps?.openaiCompat.ok ? caps.openaiCompat.models : []), [caps]);

  const refresh = async () => {
    if (!api?.mlCapsStatus) return;
    setBusy(true);
    setError('');
    try {
      const s = await api.getSettings();
      setSettings({
        localAiPreferredProvider: s?.localAiPreferredProvider ?? 'auto',
        ollamaBaseUrl: s?.ollamaBaseUrl ?? 'http://127.0.0.1:11434',
        ollamaModel: s?.ollamaModel ?? 'llama3',
        openaiCompatBaseUrl: s?.openaiCompatBaseUrl ?? 'http://127.0.0.1:1234/v1',
        openaiCompatModel: s?.openaiCompatModel ?? '',
        cosmosBaseUrl: s?.cosmosBaseUrl ?? '',
        cosmosModel: s?.cosmosModel ?? '',
      });

      const status = (await api.mlCapsStatus()) as CapsStatus;
      setCaps(status);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!api?.setSettings) return;
    setSaving(true);
    setError('');
    try {
      await api.setSettings({
        localAiPreferredProvider: settings.localAiPreferredProvider ?? 'auto',
        ollamaBaseUrl: settings.ollamaBaseUrl ?? 'http://127.0.0.1:11434',
        ollamaModel: settings.ollamaModel ?? 'llama3',
        openaiCompatBaseUrl: settings.openaiCompatBaseUrl ?? 'http://127.0.0.1:1234/v1',
        openaiCompatModel: settings.openaiCompatModel ?? '',
        cosmosBaseUrl: settings.cosmosBaseUrl ?? '',
        cosmosModel: settings.cosmosModel ?? '',
      });
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const testPrompt = async () => {
    if (!api?.mlLlmGenerate) return;
    setBusy(true);
    setError('');
    try {
      const providerToUse: LocalAiPreferred = preferred === 'auto'
        ? (caps?.cosmos.ok ? 'cosmos' : (caps?.ollama.ok ? 'ollama' : (caps?.openaiCompat.ok ? 'openai_compat' : 'off')))
        : preferred;

      if (providerToUse === 'off') {
        setError('No local provider selected (or none detected).');
        return;
      }

      const model = providerToUse === 'ollama'
        ? (settings.ollamaModel || 'llama3')
        : providerToUse === 'cosmos'
          ? (settings.cosmosModel || cosmosModels[0] || '')
          : (settings.openaiCompatModel || openaiModels[0] || '');

      if (!model.trim()) {
        setError('Pick a model first.');
        return;
      }

      const baseUrl = providerToUse === 'cosmos'
        ? (settings.cosmosBaseUrl || undefined)
        : providerToUse === 'openai_compat'
          ? (settings.openaiCompatBaseUrl || undefined)
          : undefined;

      const resp = await api.mlLlmGenerate({
        provider: providerToUse,
        model,
        baseUrl,
        prompt: 'Reply with one sentence: what is Mossy?'
      });

      if (!resp?.ok) {
        setError(String(resp?.error || 'Test failed'));
        return;
      }

      alert(String(resp.text || '').trim() || '(empty response)');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const containerClassName = embedded ? 'p-4 space-y-6' : 'p-6 space-y-6';

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Local Capabilities</h2>
          <p className="text-slate-300 text-sm">
            Mossy can use local programs/services you already have (Ollama, LM Studio, etc).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={busy}
            className="text-xs px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200"
          >
            {busy ? 'Checking…' : 'Refresh'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-xs px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error ? <div className="text-xs text-red-300">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-200">Ollama</div>
          <div className="text-xs text-slate-300">
            Status: {caps?.ollama.ok ? 'Detected' : `Not detected (${(caps?.ollama as any)?.error || 'unknown'})`}
          </div>
          <label className="text-xs text-slate-400">Base URL</label>
          <input
            value={settings.ollamaBaseUrl || ''}
            onChange={(e) => setSettings((s) => ({ ...s, ollamaBaseUrl: e.target.value }))}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            placeholder="http://127.0.0.1:11434"
          />
          <label className="text-xs text-slate-400">Model</label>
          <div className="flex gap-2">
            <select
              value={settings.ollamaModel || ''}
              onChange={(e) => setSettings((s) => ({ ...s, ollamaModel: e.target.value }))}
              className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            >
              {(ollamaModels.length ? ollamaModels : [settings.ollamaModel || 'llama3']).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-200">Cosmos Reason2 (OpenAI-compatible)</div>
          <div className="text-xs text-slate-300">
            Status: {caps?.cosmos.ok ? 'Detected' : `Not detected (${(caps?.cosmos as any)?.error || 'unknown'})`}
          </div>
          <label className="text-xs text-slate-400">Base URL</label>
          <input
            value={settings.cosmosBaseUrl || ''}
            onChange={(e) => setSettings((s) => ({ ...s, cosmosBaseUrl: e.target.value }))}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            placeholder="http://127.0.0.1:8000/v1"
          />
          <label className="text-xs text-slate-400">Model</label>
          <select
            value={settings.cosmosModel || ''}
            onChange={(e) => setSettings((s) => ({ ...s, cosmosModel: e.target.value }))}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="">(auto)</option>
            {cosmosModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-200">OpenAI-compatible local server (LM Studio)</div>
          <div className="text-xs text-slate-300">
            Status: {caps?.openaiCompat.ok ? 'Detected' : `Not detected (${(caps?.openaiCompat as any)?.error || 'unknown'})`}
          </div>
          <label className="text-xs text-slate-400">Base URL</label>
          <input
            value={settings.openaiCompatBaseUrl || ''}
            onChange={(e) => setSettings((s) => ({ ...s, openaiCompatBaseUrl: e.target.value }))}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            placeholder="http://127.0.0.1:1234/v1"
          />
          <label className="text-xs text-slate-400">Model</label>
          <select
            value={settings.openaiCompatModel || ''}
            onChange={(e) => setSettings((s) => ({ ...s, openaiCompatModel: e.target.value }))}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="">(auto)</option>
            {openaiModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-200">Preference</div>
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <select
            value={preferred}
            onChange={(e) => setSettings((s) => ({ ...s, localAiPreferredProvider: e.target.value as LocalAiPreferred }))}
            className="bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="auto">Auto</option>
            <option value="cosmos">Cosmos Reason2</option>
            <option value="ollama">Ollama</option>
            <option value="openai_compat">LM Studio / OpenAI-Compat</option>
            <option value="off">Off</option>
          </select>
          <button
            onClick={testPrompt}
            disabled={busy}
            className="text-xs px-3 py-2 rounded bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white font-semibold"
          >
            Test Generate
          </button>
        </div>
        <div className="text-xs text-slate-400">
          Tip: For Cosmos/LM Studio, start the local server and enable the OpenAI-compatible API.
        </div>
      </div>
    </div>
  );
}
