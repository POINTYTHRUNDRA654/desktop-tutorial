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

// Popular models suitable for FO4 modding assistance
const OLLAMA_RECOMMENDED = [
  { value: 'llama3', label: 'Llama 3 8B — best all-round, fast on most GPUs' },
  { value: 'llama3:70b', label: 'Llama 3 70B — best quality, needs 48GB+ VRAM' },
  { value: 'mistral', label: 'Mistral 7B — lightweight, great for scripting' },
  { value: 'mixtral', label: 'Mixtral 8x7B — 32K context, strong reasoning' },
  { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B — optimised for code/Papyrus' },
  { value: 'deepseek-coder:33b', label: 'DeepSeek Coder 33B — best local code model' },
  { value: 'phi3', label: 'Phi-3 Mini — very fast, runs on CPU' },
  { value: 'gemma2:9b', label: 'Gemma 2 9B — Google, compact & capable' },
];

export const OllamaSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: ElectronAPI | undefined = (window.electron?.api ?? (window as unknown as { electronAPI?: ElectronAPI }).electronAPI);

  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [downloadModel, setDownloadModel] = useState('mistral');
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
      await (api as any)?.setSettings?.({ ollamaBaseUrl: baseUrl, ollamaModel: selectedModel });
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
          Perfect for offline work or maximum privacy.{' '}
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

      {/* Active Model */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="font-semibold text-slate-200 text-xs">Active Model (used by Mossy)</div>
        <p className="text-xs text-slate-400">
          This is the model Mossy will use when the AI Engine provider is set to Ollama.
        </p>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
        >
          {OLLAMA_RECOMMENDED.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
          {/* Allow custom model not in the list */}
          {!OLLAMA_RECOMMENDED.some((m) => m.value === selectedModel) && (
            <option value={selectedModel}>{selectedModel} (custom)</option>
          )}
        </select>
        <div className="text-[11px] text-slate-500">
          Or type any Ollama model name directly:{' '}
          <input
            type="text"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="e.g. llama3, mistral, deepseek-coder:6.7b"
            className="inline-block ml-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono w-48"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving…' : 'Save Ollama Settings'}
        </button>
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
