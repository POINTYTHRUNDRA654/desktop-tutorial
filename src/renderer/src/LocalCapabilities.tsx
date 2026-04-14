import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

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

type GgufImportState = {
  ggufPath: string;
  modelName: string;
  systemPrompt: string;
  busy: boolean;
  result: string;
  error: string;
};

type FineTuneState = {
  datasetPath: string;
  modelId: string;
  loraRank: number;
  maxSteps: number;
  outputName: string;
  busy: boolean;
  log: string[];
  result: string;
  error: string;
};

const FINE_TUNE_MODELS = [
  { id: 'unsloth/gemma-4-it-unsloth-bnb-4bit', label: 'Gemma 4 4-bit (recommended, 8 GB VRAM)' },
  { id: 'unsloth/llama-3-8b-Instruct-bnb-4bit', label: 'Llama 3 8B 4-bit (8 GB VRAM)' },
  { id: 'unsloth/Qwen2.5-7B-Instruct-bnb-4bit', label: 'Qwen 2.5 7B 4-bit (8 GB VRAM)' },
];

const VRAM_ESTIMATES: Record<string, string> = {
  'unsloth/gemma-4-it-unsloth-bnb-4bit': '~6–8 GB',
  'unsloth/llama-3-8b-Instruct-bnb-4bit': '~6–8 GB',
  'unsloth/Qwen2.5-7B-Instruct-bnb-4bit': '~6–8 GB',
};

type LocalCapabilitiesProps = {
  embedded?: boolean;
};

const DEFAULT_MOSSY_SYSTEM =
  'You are Mossy, a knowledgeable Fallout 4 modding assistant. You help with xEdit, the Creation Kit, Papyrus scripting, NIF meshes, DDS textures, load order, mod conflicts, and all aspects of Fallout 4 modding. Be precise and helpful.';

export default function LocalCapabilities({ embedded = false }: LocalCapabilitiesProps): JSX.Element {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [caps, setCaps] = useState<CapsStatus | null>(null);
  const [settings, setSettings] = useState<LocalAiSettings>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [edition, setEdition] = useState<'universal' | 'nvidia'>('universal');
  const [gguf, setGguf] = useState<GgufImportState>({
    ggufPath: '',
    modelName: 'mossy-fo4',
    systemPrompt: DEFAULT_MOSSY_SYSTEM,
    busy: false,
    result: '',
    error: '',
  });
  const [fineTune, setFineTune] = useState<FineTuneState>({
    datasetPath: '',
    modelId: FINE_TUNE_MODELS[0].id,
    loraRank: 16,
    maxSteps: 60,
    outputName: 'mossy-fo4-ft',
    busy: false,
    log: [],
    result: '',
    error: '',
  });

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
    if (api?.getMossyEdition) {
      api.getMossyEdition().then((ed: 'nvidia' | 'universal') => setEdition(ed)).catch(() => {});
    }
    // Listen for fine-tune progress events
    const onProgress = (_event: any, data: { message: string }) => {
      setFineTune((ft) => ({ ...ft, log: [...ft.log.slice(-199), data.message] }));
    };
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.on('fine-tune-progress', onProgress);
      return () => { electron.ipcRenderer.removeListener('fine-tune-progress', onProgress); };
    }
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

      toast.success(String(resp.text || '').trim() || '(empty response)');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const pickDatasetFile = async () => {
    if (!api?.fineTunePickDataset) return;
    const filePath = await api.fineTunePickDataset();
    if (filePath) {
      setFineTune((ft) => ({ ...ft, datasetPath: filePath, result: '', error: '' }));
    }
  };

  const startFineTune = async () => {
    if (!api?.fineTuneStart) {
      setFineTune((ft) => ({ ...ft, error: 'fineTuneStart API not available. Is Electron running?' }));
      return;
    }
    if (!fineTune.datasetPath.trim()) {
      setFineTune((ft) => ({ ...ft, error: 'Select a training dataset (.jsonl) first.' }));
      return;
    }
    setFineTune((ft) => ({ ...ft, busy: true, log: [], result: '', error: '' }));
    try {
      const resp = await api.fineTuneStart({
        datasetPath: fineTune.datasetPath,
        modelId: fineTune.modelId,
        loraRank: fineTune.loraRank,
        maxSteps: fineTune.maxSteps,
        outputName: fineTune.outputName,
      });
      if (resp?.ok) {
        setFineTune((ft) => ({
          ...ft,
          busy: false,
          result: `✅ Training complete! GGUF saved to: ${resp.outputPath}`,
        }));
        // Pre-fill the GGUF import path for one-click import
        if (resp.outputPath) {
          setGguf((g) => ({ ...g, ggufPath: resp.outputPath, result: '', error: '' }));
        }
        toast.success('Fine-tuning complete! GGUF ready to import.');
      } else {
        setFineTune((ft) => ({ ...ft, busy: false, error: String(resp?.error || 'Training failed.') }));
      }
    } catch (e: any) {
      setFineTune((ft) => ({ ...ft, busy: false, error: String(e?.message || e) }));
    }
  };

  const pickGgufFile = async () => {
    if (!api?.ggufPickFile) return;
    const filePath = await api.ggufPickFile();
    if (filePath) {
      setGguf((g) => ({ ...g, ggufPath: filePath, result: '', error: '' }));
    }
  };

  const importGguf = async () => {
    if (!api?.ggufImportToOllama) {
      setGguf((g) => ({ ...g, error: 'ggufImportToOllama API not available. Is Electron running?' }));
      return;
    }
    if (!gguf.ggufPath.trim()) {
      setGguf((g) => ({ ...g, error: 'Select a .gguf file first.' }));
      return;
    }
    if (!gguf.modelName.trim()) {
      setGguf((g) => ({ ...g, error: 'Enter a model name.' }));
      return;
    }
    setGguf((g) => ({ ...g, busy: true, result: '', error: '' }));
    try {
      const resp = await api.ggufImportToOllama({
        ggufPath: gguf.ggufPath,
        modelName: gguf.modelName,
        systemPrompt: gguf.systemPrompt,
      });
      if (resp?.ok) {
        setGguf((g) => ({
          ...g,
          busy: false,
          result: `✅ Model "${resp.modelName}" imported! Set Ollama model to "${resp.modelName}" above and refresh.`,
        }));
        // Auto-set the Ollama model and refresh caps
        setSettings((s) => ({ ...s, ollamaModel: resp.modelName }));
        toast.success(`Model "${resp.modelName}" ready in Ollama!`);
        await refresh();
      } else {
        setGguf((g) => ({ ...g, busy: false, error: String(resp?.error || 'Import failed.') }));
      }
    } catch (e: any) {
      setGguf((g) => ({ ...g, busy: false, error: String(e?.message || e) }));
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

      {/* GGUF / Unsloth Import */}
      <div className="bg-slate-900/60 border border-amber-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-300">🧪 GGUF / Unsloth Import</span>
          <span className="text-xs text-slate-400">— Load a fine-tuned .gguf model into Ollama</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Fine-tune Gemma 4 with <strong className="text-slate-300">Unsloth</strong> (8 GB VRAM), export to GGUF,
          then import it here. The model is registered in your local Ollama and becomes available above as an Ollama model.
          Requires Ollama to be installed and running.
        </p>

        {/* File picker */}
        <div className="flex gap-2 items-center">
          <input
            value={gguf.ggufPath}
            readOnly
            placeholder="No .gguf file selected…"
            className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 outline-none truncate"
          />
          <button
            onClick={pickGgufFile}
            disabled={gguf.busy}
            className="text-xs px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-200 whitespace-nowrap"
          >
            Browse…
          </button>
        </div>

        {/* Model name */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Ollama model name (lowercase, hyphens OK)</label>
          <input
            value={gguf.modelName}
            onChange={(e) => setGguf((g) => ({ ...g, modelName: e.target.value }))}
            placeholder="mossy-fo4"
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          />
        </div>

        {/* System prompt */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">System prompt (baked into Modelfile)</label>
          <textarea
            value={gguf.systemPrompt}
            onChange={(e) => setGguf((g) => ({ ...g, systemPrompt: e.target.value }))}
            rows={3}
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 outline-none resize-y"
          />
        </div>

        {/* Import button */}
        <button
          onClick={importGguf}
          disabled={gguf.busy || !gguf.ggufPath}
          className="text-xs px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold"
        >
          {gguf.busy ? 'Importing…' : 'Import to Ollama'}
        </button>

        {gguf.result && (
          <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-2">
            {gguf.result}
          </div>
        )}
        {gguf.error && (
          <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded px-3 py-2">
            {gguf.error}
          </div>
        )}

        <details className="text-xs text-slate-500 cursor-pointer">
          <summary className="hover:text-slate-400">How to fine-tune with Unsloth →</summary>
          <div className="mt-2 space-y-1 text-slate-400 leading-relaxed">
            <p>1. Install Unsloth: <code className="text-amber-300">pip install unsloth</code> (requires CUDA 8 GB+ VRAM)</p>
            <p>2. Fine-tune Gemma 4 on your FO4 Q&amp;A dataset using Unsloth's notebook.</p>
            <p>3. Export: <code className="text-amber-300">model.save_pretrained_gguf("mossy-fo4", tokenizer, quantization_method="q4_k_m")</code></p>
            <p>4. Use the Browse button above to select the exported <code className="text-amber-300">.gguf</code> file.</p>
            <p>5. Click <strong>Import to Ollama</strong> — Mossy creates a Modelfile and runs <code className="text-amber-300">ollama create</code>.</p>
            <p>6. Set the Ollama model above to your imported name and <strong>Save</strong>.</p>
          </div>
        </details>
      </div>

      {/* ── Fine-Tune (NVIDIA edition) ───────────────────────────────────── */}
      {edition === 'universal' ? (
        <div className="bg-slate-900/60 border border-green-800/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-300">⚡ Local Fine-Tuning</span>
            <span className="text-xs text-slate-500">— requires Mossy NVIDIA Edition</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Train Gemma 4, Llama 3, or Qwen 2.5 on your own Fallout 4 Q&A dataset using Unsloth (8 GB+ VRAM).
            You are currently on the <strong className="text-slate-300">Universal Edition</strong>.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            To use fine-tuning features, download and install the <strong className="text-slate-300">Mossy NVIDIA Edition</strong> installer from GitHub Releases.
            Your settings and knowledge vault will carry over automatically.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-green-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-300">⚡ Local Fine-Tuning</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 font-semibold text-xs">NVIDIA</span>
            <span className="text-xs text-slate-400">— Train Gemma 4 / Llama 3 / Qwen 2.5 with Unsloth</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fine-tune a local model on your Fallout 4 modding Q&A dataset (exported from the Training Data panel)
            and export it as a GGUF file that Ollama can serve. Requires an NVIDIA GPU with 8 GB+ VRAM.
          </p>

          {/* Dataset picker */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Training dataset (.jsonl)</label>
            <div className="flex gap-2 items-center">
              <input
                value={fineTune.datasetPath}
                readOnly
                placeholder="No dataset selected…"
                className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 outline-none truncate"
              />
              <button
                onClick={pickDatasetFile}
                disabled={fineTune.busy}
                className="text-xs px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-200 whitespace-nowrap"
              >
                Browse…
              </button>
            </div>
          </div>

          {/* Model picker */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">
              Base model
              {fineTune.modelId && (
                <span className="ml-2 text-slate-500">
                  VRAM: {VRAM_ESTIMATES[fineTune.modelId] ?? '~8 GB'}
                </span>
              )}
            </label>
            <select
              value={fineTune.modelId}
              onChange={(e) => setFineTune((ft) => ({ ...ft, modelId: e.target.value }))}
              disabled={fineTune.busy}
              className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            >
              {FINE_TUNE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* LoRA rank */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">LoRA rank (higher = more capacity)</label>
              <input
                type="number"
                min={4}
                max={128}
                step={4}
                value={fineTune.loraRank}
                onChange={(e) => setFineTune((ft) => ({ ...ft, loraRank: Number(e.target.value) }))}
                disabled={fineTune.busy}
                className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>

            {/* Max steps */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Max steps (60–200 recommended)</label>
              <input
                type="number"
                min={10}
                max={2000}
                step={10}
                value={fineTune.maxSteps}
                onChange={(e) => setFineTune((ft) => ({ ...ft, maxSteps: Number(e.target.value) }))}
                disabled={fineTune.busy}
                className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Output name */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Output model name (used for GGUF filename)</label>
            <input
              value={fineTune.outputName}
              onChange={(e) => setFineTune((ft) => ({ ...ft, outputName: e.target.value }))}
              placeholder="mossy-fo4-ft"
              disabled={fineTune.busy}
              className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            />
          </div>

          {/* Start button */}
          <button
            onClick={startFineTune}
            disabled={fineTune.busy || !fineTune.datasetPath}
            className="text-xs px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-semibold"
          >
            {fineTune.busy ? '⏳ Training…' : '🚀 Start Training'}
          </button>

          {/* Live log */}
          {(fineTune.busy || fineTune.log.length > 0) && (
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2 max-h-40 overflow-y-auto font-mono text-xs text-slate-300 space-y-0.5">
              {fineTune.log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {fineTune.busy && (
                <div className="text-green-400 animate-pulse">▌</div>
              )}
            </div>
          )}

          {fineTune.result && (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-2">
              {fineTune.result}
              <span className="text-slate-400 ml-2">— GGUF path pre-filled in the Import section above.</span>
            </div>
          )}
          {fineTune.error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded px-3 py-2">
              {fineTune.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
