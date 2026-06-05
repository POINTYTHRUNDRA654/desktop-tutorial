import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, ExternalLink, HardDrive, Loader2, Cpu, Brain } from 'lucide-react';

const api = (window as any).electronAPI;

type DownloadPhase = 'idle' | 'start' | 'downloading' | 'done' | 'error';

interface ProgressState {
  phase: DownloadPhase;
  percent: number;
  message: string;
  bytesReceived?: number;
  totalBytes?: number;
}

interface LocalAiStatus {
  koboldcpp: { exists: boolean; path: string; size: number | null };
  model: { exists: boolean; path: string; size: number | null };
  runtimeDir: string;
  modelsDir: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const ProgressBar: React.FC<{ progress: ProgressState; label: string }> = ({ progress, label }) => {
  if (progress.phase === 'idle') return null;
  const isError = progress.phase === 'error';
  const isDone = progress.phase === 'done';
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={isError ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-slate-300'}>{progress.message}</span>
        {progress.phase === 'downloading' && progress.totalBytes && progress.totalBytes > 0 && (
          <span className="text-slate-500">{formatBytes(progress.bytesReceived || 0)} / {formatBytes(progress.totalBytes)}</span>
        )}
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {label && <p className="text-[10px] text-slate-600">{label}</p>}
    </div>
  );
};

const StatusBadge: React.FC<{ exists: boolean }> = ({ exists }) =>
  exists ? (
    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Installed</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-slate-500"><AlertCircle className="w-3.5 h-3.5" />Not installed</span>
  );

export const LocalAIEngine: React.FC = () => {
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [koboldProgress, setKoboldProgress] = useState<ProgressState>({ phase: 'idle', percent: 0, message: '' });
  const [modelProgress, setModelProgress] = useState<ProgressState>({ phase: 'idle', percent: 0, message: '' });
  const [koboldBusy, setKoboldBusy] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.checkLocalAI();
      if (result?.ok) setStatus(result);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const cleanup = api.onLocalAiProgress?.((data: any) => {
      if (data.type === 'koboldcpp') {
        setKoboldProgress({ phase: data.phase, percent: data.percent, message: data.message || '', bytesReceived: data.bytesReceived, totalBytes: data.totalBytes });
        if (data.phase === 'done' || data.phase === 'error') { setKoboldBusy(false); refresh(); }
      } else if (data.type === 'model') {
        setModelProgress({ phase: data.phase, percent: data.percent, message: data.message || '', bytesReceived: data.bytesReceived, totalBytes: data.totalBytes });
        if (data.phase === 'done' || data.phase === 'error') { setModelBusy(false); refresh(); }
      }
    });
    cleanupRef.current = cleanup;
    return () => { cleanup?.(); };
  }, [refresh]);

  const handleDownloadKobold = async () => {
    setKoboldBusy(true);
    setKoboldProgress({ phase: 'start', percent: 0, message: 'Starting download...' });
    await api.downloadKoboldCpp?.();
  };

  const handleDownloadModel = async () => {
    setModelBusy(true);
    setModelProgress({ phase: 'start', percent: 0, message: 'Starting download...' });
    await api.downloadGgufModel?.('tinyllama');
  };

  const openExternal = (url: string) => api.openExternal?.(url);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />Checking local AI status...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">Local AI Engine</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Offline inference via KoboldCPP — runs locally, no API key needed.
          Downloads are saved to your user data folder.
        </p>
      </div>

      <div className="border border-slate-700/50 rounded-xl bg-slate-900/50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">KoboldCPP</span>
                <StatusBadge exists={status?.koboldcpp.exists ?? false} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Local LLM inference engine by LostRuins (AGPL-3.0) · ~100-250 MB
              </p>
              {status?.koboldcpp.exists && status.koboldcpp.size && (
                <p className="text-[10px] text-slate-600 mt-0.5">{status.koboldcpp.path} · {formatBytes(status.koboldcpp.size)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openExternal('https://github.com/LostRuins/koboldcpp')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-colors"
            >
              <ExternalLink className="w-3 h-3" />GitHub
            </button>
            <button
              onClick={handleDownloadKobold}
              disabled={koboldBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-900/20 text-orange-300 hover:bg-orange-900/40 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {koboldBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {status?.koboldcpp.exists ? 'Re-download' : 'Download'}
            </button>
          </div>
        </div>
        <ProgressBar progress={koboldProgress} label="Fetching latest release from github.com/LostRuins/koboldcpp" />
      </div>

      <div className="border border-slate-700/50 rounded-xl bg-slate-900/50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">TinyLlama 1.1B Chat</span>
                <StatusBadge exists={status?.model.exists ?? false} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Q4_K_M quantized GGUF · ~670 MB · TinyLlama team (Apache 2.0) · quantized by TheBloke
              </p>
              {status?.model.exists && status.model.size && (
                <p className="text-[10px] text-slate-600 mt-0.5">{status.model.path} · {formatBytes(status.model.size)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openExternal('https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-colors"
            >
              <ExternalLink className="w-3 h-3" />HuggingFace
            </button>
            <button
              onClick={handleDownloadModel}
              disabled={modelBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modelBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {status?.model.exists ? 'Re-download' : 'Download'}
            </button>
          </div>
        </div>
        <ProgressBar progress={modelProgress} label="Fetching from huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF" />
      </div>

      {status && (
        <div className="border border-slate-800/60 rounded-lg bg-slate-900/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-400">Install Paths</span>
          </div>
          <div className="space-y-1 text-[10px] text-slate-600 font-mono">
            <p>Runtime: {status.runtimeDir}</p>
            <p>Models: {status.modelsDir}</p>
          </div>
        </div>
      )}

      <div className="border border-slate-800/40 rounded-lg bg-slate-900/20 p-3">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          <span className="text-slate-500 font-semibold">Credits — </span>
          KoboldCPP is created by LostRuins (Henk717) and contributors, licensed under AGPL-3.0.
          TinyLlama is by the TinyLlama team (Apache 2.0), quantized by TheBloke.
          Mossy downloads these tools on request and does not redistribute them — files are fetched
          directly from their official sources at github.com/LostRuins/koboldcpp and huggingface.co.
        </p>
      </div>
    </div>
  );
};

export default LocalAIEngine;