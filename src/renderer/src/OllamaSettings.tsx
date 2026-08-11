import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, Play, AlertCircle, Check, Loader, Save } from 'lucide-react';
import type { ElectronAPI } from '../../electron/types';

interface OllamaStatus {
  ok: boolean;
  baseUrl?: string;
  models?: string[];
  error?: string;
}

// Models sized for 2x RTX 2070 (8GB VRAM per card). 70B+ need 40GB+ — keep those on Groq.
const OLLAMA_RECOMMENDED_CHAT = [
  { value: 'gemma2:9b',      label: 'Gemma 2 9B — Google, fast general chat, 2070-safe (~6GB)' },
  { value: 'phi4:14b',       label: 'Phi-4 14B — Microsoft, best reasoning at 4-bit (~7GB)' },
  { value: 'mistral:7b',     label: 'Mistral 7B — reliable all-rounder, 2070-safe (~5GB)' },
  { value: 'llama3.2:3b',    label: 'Llama 3.2 3B — tiny, CPU fallback, always fits' },
  { value: 'deepseek-v4-flash:0731-cloud', label: 'DeepSeek-V4-Flash-0731 (Ollama Cloud, free tier) — 1M context, needs "ollama signin"' },
];

const OLLAMA_RECOMMENDED_CODE = [
  { value: 'qwen2.5-coder:7b',  label: 'Qwen2.5-Coder 7B — best local coding model, 2070-safe (~5GB)' },
  { value: 'qwen2.5-coder:14b', label: 'Qwen2.5-Coder 14B — tighter fit, limited context headroom (~8GB)' },
  { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B — solid legacy code model (~5GB)' },
  { value: 'phi4:14b',           label: 'Phi-4 14B — strong for structured output at 4-bit (~7GB)' },
];

const OLLAMA_RECOMMENDED = [...OLLAMA_RECOMMENDED_CHAT, ...OLLAMA_RECOMMENDED_CODE];

export const OllamaSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: ElectronAPI | undefined = (window.electron?.api ?? (window as unknown as { electronAPI?: ElectronAPI }).electronAPI);

  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [selectedCodeModel, setSelectedCodeModel] = useState('qwen2.5-coder:7b');
  const [downloadModel, setDownloadModel] = useState('qwen2.5-coder:7b');
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load persisted Ollama settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const s = await (api as any)?.getSettings?.();
        if (s?.ollamaBaseUrl) setBaseUrl(s.ollamaBaseUrl);
        if (s?.ollamaModel) setSelectedModel(s.ollamaModel);
        if (s?.ollamaCodeModel) setSelectedCodeModel(s.ollamaCodeModel);
        setSettingsLoaded(true);
      } catch {
        setSettingsLoaded(true);
      }
    };
    void load();
  }, [api]);

  // Auto-check status after settings load
  useEffect(() => {
    if (settingsLoaded) void checkOllamaStatus();
  }, [settingsLoaded]); // eslint-disable-line

  const checkOllamaStatus = useCallback(async () => {
    setLoading(true);
    try {
      if (!api?.ml?.getOllamaStatus) {
        setStatus({ ok: false, error: 'Ollama API not available in this build' });
        return;
      }
      const result = await api.ml.getOllamaStatus?.(baseUrl);
      setStatus(result || { ok: false, error: 'Failed to check status' });
    } catch (error: any) {
      setStatus({ ok: false, error: error.message || 'Connection failed' });
    } finally {
      setLoading(false);
    }
  }, [api, baseUrl]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await (api as any)?.setSettings?.({ ollamaBaseUrl: baseUrl, ollamaModel: selectedModel, ollamaCodeModel: selectedCodeModel });
      toast.success('Ollama settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save Ollama settings');
    } finally {
      setSaving(false);
    }
  }, [api, baseUrl, selectedModel]);

  const handleDownloadModel = useCallback(async () => {
    const model = downloadModel.trim();
    if (!model) { toast.error('Enter a model name to download'); return; }
    setDownloadingModel(true);
    try {
      if (!api?.ml?.ollamaPull) {
        toast.error('Ollama pull API not available');
        return;
      }
      const result = await api.ml.ollamaPull?.(model, { baseUrl });
      if (result?.ok) {
        toast.success('Downloaded ' + model + ' — refreshing model list');
        await checkOllamaStatus();
      } else {
        toast.error('Download failed: ' + (result?.error || 'Unknown error'));
      }
    } catch (error: any) {
      toast.error('Error downloading model: ' + error.message);
    } finally {
      setDownloadingModel(false);
    }
  }, [api, baseUrl, downloadModel, checkOllamaStatus]);

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      {/* Info Banner */}
      <div className="p-3 rounded-md border border-blue-700/30 bg-blue-900/10 text-blue-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          Offline AI with Ollama
        </div>
        <p>
          Run open-source LLMs locally — no cloud, no API key, no data leaves your machine.
          Perfect for offline work or maximum privacy. (Exception: the DeepSeek-V4-Flash-0731
          option below is an Ollama Cloud model — it runs through this same connection but
          requires signing in with <code className="font-mono bg-black/30 px-1 rounded">ollama signin</code> and
          sends your prompts to Ollama's cloud. Free tier, but not fully offline.){' '}
          <a
            href="https://ollama.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-100"
            onClick={(e) => {
              const bridge = (window as any).electron?.api || (window as any).electronAPI;
              if (bridge?.openExternal) { e.preventDefault(); void bridge.openExternal('https://ollama.ai'); }
            }}
          >
            Learn more
          </a>
        </p>
      </div>

      {/* Connection Settings */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200 text-xs">Ollama Base URL</label>
          <button
            onClick={() => void checkOllamaStatus()}
            disabled={loading}
            className="px-3 py-1 rounded text-xs bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Check Status
          </button>
        </div>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 rounded bg-black/30 border border-slate-700 text-sm text-white font-mono"
          placeholder="http://127.0.0.1:11434"
        />

        {/* Connection status badge */}
        {status && (
          <div
            className={
              'rounded p-3 text-xs flex items-start gap-2 ' +
              (status.ok
                ? 'border border-emerald-600/50 bg-emerald-900/20 text-emerald-200'
                : 'border border-red-600/50 bg-red-900/20 text-red-200')
            }
          >
            {status.ok ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div>
              {status.ok ? (
                <>
                  <div className="font-semibold">Connected to Ollama</div>
                  {status.models && status.models.length > 0 && (
                    <div className="mt-1">
                      <strong>Local models:</strong> {status.models.join(', ')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold">Not connected</div>
                  <div className="mt-1">{status.error || 'Unable to reach Ollama at ' + baseUrl}</div>
                  <div className="mt-2">
                    <a
                      href="https://ollama.ai/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-300 hover:text-blue-200"
                      onClick={(e) => {
                        const bridge = (window as any).electron?.api || (window as any).electronAPI;
                        if (bridge?.openExternal) { e.preventDefault(); void bridge.openExternal('https://ollama.ai/download'); }
                      }}
                    >
                      Install Ollama
                    </a>
                    {' — then run '}
                    <code className="font-mono bg-black/30 px-1 rounded">ollama serve</code>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Per-Role Model Assignment */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-5">
        <div className="font-semibold text-slate-200 text-xs">Model Assignment by Role</div>
        <p className="text-xs text-slate-400">
          Pin different models to different tasks. With 2x RTX 2070 (8GB each), run one model
          per GPU simultaneously for best throughput.
        </p>

        {/* Coding / Papyrus model */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-emerald-300">Coding / Papyrus Studio</div>
          <p className="text-[11px] text-slate-500">Used by the Papyrus AI generator and Mod Builder Hub. Run on GPU 0.</p>
          <select
            value={selectedCodeModel}
            onChange={(e) => setSelectedCodeModel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
          >
            {OLLAMA_RECOMMENDED_CODE.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
            {!OLLAMA_RECOMMENDED_CODE.some((m) => m.value === selectedCodeModel) && (
              <option value={selectedCodeModel}>{selectedCodeModel} (custom)</option>
            )}
          </select>
          <input
            type="text"
            value={selectedCodeModel}
            onChange={(e) => setSelectedCodeModel(e.target.value)}
            placeholder="e.g. qwen2.5-coder:7b"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
          />
        </div>

        {/* General chat model */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-sky-300">General Chat / Fallback</div>
          <p className="text-[11px] text-slate-500">Used when provider is set to Ollama for general AI chat. Run on GPU 1.</p>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
          >
            {OLLAMA_RECOMMENDED_CHAT.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
            {!OLLAMA_RECOMMENDED_CHAT.some((m) => m.value === selectedModel) && (
              <option value={selectedModel}>{selectedModel} (custom)</option>
            )}
          </select>
          <input
            type="text"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="e.g. gemma2:9b"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving…' : 'Save Model Settings'}
        </button>
      </div>

      {/* Two-GPU Guide */}
      <div className="rounded-md border border-amber-700/30 bg-amber-900/10 p-4 space-y-3">
        <div className="font-semibold text-amber-300 text-xs">Two-GPU Setup (Advanced)</div>
        <p className="text-xs text-slate-400">
          Run two Ollama instances simultaneously — one per RTX 2070 — so both models stay loaded
          and respond without swapping. Open two terminals:
        </p>
        <div className="space-y-2">
          <div className="text-[11px] text-slate-400">Terminal 1 — GPU 0 (coding model, port 11434):</div>
          <pre className="bg-black/40 border border-slate-700 rounded px-3 py-2 text-xs text-emerald-300 font-mono overflow-x-auto">
{`set CUDA_VISIBLE_DEVICES=0
set OLLAMA_HOST=127.0.0.1:11434
ollama serve`}
          </pre>
          <div className="text-[11px] text-slate-400 mt-2">Terminal 2 — GPU 1 (chat model, port 11435):</div>
          <pre className="bg-black/40 border border-slate-700 rounded px-3 py-2 text-xs text-sky-300 font-mono overflow-x-auto">
{`set CUDA_VISIBLE_DEVICES=1
set OLLAMA_HOST=127.0.0.1:11435
ollama serve`}
          </pre>
        </div>
        <p className="text-[11px] text-slate-500">
          Then set the Base URL above to <code className="font-mono text-emerald-400">http://127.0.0.1:11434</code> for
          the coding model and update it to port 11435 in chat settings if you want per-port routing.
          For most uses a single Ollama instance on 11434 works fine — Ollama auto-assigns GPUs.
        </p>
      </div>

      {/* Download a model */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="font-semibold text-slate-200 text-xs">Download a Model via Ollama Pull</div>
        <p className="text-xs text-slate-400">
          First download may take several minutes depending on model size. Models are cached locally and persist across restarts.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={downloadModel}
            onChange={(e) => setDownloadModel(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-black/30 border border-slate-700 text-sm text-white font-mono"
            placeholder="e.g. mistral, llama3, deepseek-coder:6.7b"
          />
          <button
            onClick={() => void handleDownloadModel()}
            disabled={downloadingModel || !status?.ok}
            className="px-4 py-2 rounded text-xs bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            {downloadingModel ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloadingModel ? 'Downloading…' : 'Pull Model'}
          </button>
        </div>
        {!status?.ok && (
          <p className="text-[11px] text-amber-400">Ollama must be connected before pulling models.</p>
        )}
      </div>

      {/* Integration Info */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4">
        <div className="font-semibold text-slate-200 text-xs mb-2">Mossy Integration</div>
        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
          <li>Set AI Engine provider to <strong>Ollama (Local)</strong> to force Mossy to use your local model</li>
          <li>Set to <strong>Auto</strong> and Mossy uses Groq by default but falls back to Ollama when offline</li>
          <li>All local processing happens on your machine — no data sent anywhere</li>
          <li>Response speed depends on model size and your GPU/CPU; smaller models are fastest</li>
          <li>Recommended for offline modding sessions or air-gapped systems</li>
        </ul>
      </div>
    </div>
  );
};

export default OllamaSettings;
