import React, { useState, useEffect } from 'react';
import { Download, Play, AlertCircle, Check, Loader } from 'lucide-react';
import type { ElectronAPI } from '../../electron/types';

interface OllamaStatus {
  ok: boolean;
  baseUrl?: string;
  models?: string[];
  error?: string;
}

export const OllamaSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [downloadingModel, setDownloadingModel] = useState(false);
  const api: ElectronAPI | undefined = (window.electron?.api ?? (window as unknown as { electronAPI?: ElectronAPI }).electronAPI);

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setLoading(true);
    try {
      if (!api?.ml?.getOllamaStatus) {
        setStatus({ ok: false, error: 'API not available' });
        return;
      }
      const result = await api.ml.getOllamaStatus?.(baseUrl);
      setStatus(result || { ok: false, error: 'Failed to check status' });
    } catch (error: any) {
      setStatus({ ok: false, error: error.message || 'Connection failed' });
    } finally {
      setLoading(false);
    }
  };

  const downloadModel = async () => {
    setDownloadingModel(true);
    try {
      if (!api?.ml?.ollamaPull) {
        alert('Ollama pull API not available');
        return;
      }
      const result = await api.ml.ollamaPull?.(selectedModel, { baseUrl });
      if (result?.ok) {
        alert(`Successfully downloaded ${selectedModel} model`);
        await checkOllamaStatus();
      } else {
        alert(`Failed to download model: ${result?.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error downloading model: ${error.message}`);
    } finally {
      setDownloadingModel(false);
    }
  };

  return (
    <div className={`space-y-4 ${embedded ? 'text-sm' : 'text-base'}`}>
      <div className="p-3 rounded-md border border-blue-700/30 bg-blue-900/10 text-blue-200 text-xs">
        <div className="font-semibold mb-1">🤖 Offline AI with Ollama</div>
        <p>
          Ollama lets you run open-source LLMs locally without sending data to external APIs.
          Perfect for privacy-conscious users. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">Learn more</a>
        </p>
      </div>

      {/* Connection Status */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200">Base URL</label>
          <button
            onClick={checkOllamaStatus}
            disabled={loading}
            className="px-3 py-1 rounded text-xs bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Check Status
          </button>
        </div>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 rounded bg-black/30 border border-slate-700 text-sm text-white"
          placeholder="http://127.0.0.1:11434"
        />

        {/* Status Display */}
        {status && (
          <div
            className={`rounded p-3 text-xs flex items-start gap-2 ${
              status.ok
                ? 'border border-emerald-600/50 bg-emerald-900/20 text-emerald-200'
                : 'border border-red-600/50 bg-red-900/20 text-red-200'
            }`}
          >
            {status.ok ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div>
              {status.ok ? (
                <>
                  <div className="font-semibold">✓ Connected</div>
                  {status.models && status.models.length > 0 && (
                    <div className="mt-1">
                      <strong>Available Models:</strong> {status.models.join(', ')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold">✗ Disconnected</div>
                  <div className="mt-1">{status.error || 'Unable to connect'}</div>
                  <div className="mt-2">
                    <a
                      href="https://ollama.ai/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-300 hover:text-blue-200"
                    >
                      Install Ollama →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model Management */}
      {status?.ok && (
        <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
          <div className="font-semibold text-slate-200">Download Model</div>
          <p className="text-xs text-slate-400">
            Popular open-source models: <strong>mistral</strong>, <strong>neural-chat</strong>, <strong>orca-mini</strong>, <strong>dolphin-mixtral</strong>
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 px-3 py-2 rounded bg-black/30 border border-slate-700 text-sm text-white"
              placeholder="e.g., mistral, neural-chat"
            />
            <button
              onClick={downloadModel}
              disabled={downloadingModel}
              className="px-4 py-2 rounded text-sm bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {downloadingModel ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingModel ? 'Downloading…' : 'Download'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            First download may take several minutes. Models are cached locally.
          </p>
        </div>
      )}

      {/* Integration Info */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4">
        <div className="font-semibold text-slate-200 mb-2">✨ Mossy Integration</div>
        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
          <li>When Ollama is running, Mossy will auto-detect and use it for AI responses</li>
          <li>Fallback to OpenAI/Groq if configured and Ollama unavailable</li>
          <li>All processing happens locally — no data sent to external services</li>
          <li>Response time depends on model size and your hardware</li>
        </ul>
      </div>
    </div>
  );
};

export default OllamaSettings;
