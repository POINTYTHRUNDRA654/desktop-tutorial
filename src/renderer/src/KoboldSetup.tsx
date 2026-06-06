import React, { useEffect, useRef, useState } from 'react';
import {
  Bot, Download, Play, Square, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Info, Cpu, HardDrive,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileStatus { exists: boolean; path: string; size: number | null }
interface CheckResult {
  ok: boolean;
  koboldcpp: FileStatus;
  model: FileStatus;
  runtimeDir: string;
  modelsDir: string;
}
interface ProgressEvt {
  type: 'koboldcpp' | 'model';
  phase: 'start' | 'downloading' | 'done' | 'error';
  percent: number;
  bytesReceived?: number;
  totalBytes?: number;
  message?: string;
}

type ServerPhase = 'unknown' | 'starting' | 'ready' | 'stopped';

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return (b / 1_073_741_824).toFixed(1) + ' GB';
  if (b >= 1_048_576)     return (b / 1_048_576).toFixed(1) + ' MB';
  return (b / 1024).toFixed(0) + ' KB';
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ pct: number; label: string; bytes?: number; total?: number }> = ({ pct, label, bytes, total }) => (
  <div className="mt-3 space-y-1">
    <div className="flex justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span>
        {bytes !== undefined && total ? `${fmtBytes(bytes)} / ${fmtBytes(total)}` : `${pct}%`}
      </span>
    </div>
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

const Badge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
    ok ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
       : 'bg-slate-700 text-slate-500 border border-slate-600'
  }`}>
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
    {label}
  </span>
);

// ── Main component ────────────────────────────────────────────────────────────

export const LocalAIEngine: React.FC = () => {
  const api = (window as any).electronAPI as any;

  const [status, setStatus]           = useState<CheckResult | null>(null);
  const [progress, setProgress]       = useState<Record<string, ProgressEvt>>({});
  const [serverPhase, setServerPhase] = useState<ServerPhase>('unknown');
  const [serverBusy, setServerBusy]   = useState(false);
  const [log, setLog]                 = useState<string[]>([]);

  const autoStarted = useRef(false);

  const addLog = (msg: string) => setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 50));

  // ── Check file status ───────────────────────────────────────────────────────
  const refresh = async () => {
    try {
      const r: CheckResult = await api.checkLocalAI();
      setStatus(r);
      // Check if server is already running
      const ks = await api.koboldStatus?.();
      setServerPhase(ks?.running ? 'ready' : 'stopped');
    } catch { /* ignore */ }
  };

  // ── Auto-download missing files then auto-start server ─────────────────────
  const runAutoSetup = async (koboldOk: boolean, modelOk: boolean) => {
    if (!koboldOk) {
      addLog('KoboldCPP not found — downloading automatically...');
      await api.downloadKoboldCpp();
    }
    if (!modelOk) {
      addLog('TinyLlama model not found — downloading automatically...');
      await api.downloadGgufModel('tinyllama');
    }
    await refresh();
    addLog('Files ready — starting KoboldCPP server...');
    await handleStart();
  };

  // ── Subscribe to events ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubProgress = api.onLocalAiProgress?.((evt: ProgressEvt) => {
      setProgress(p => ({ ...p, [evt.type]: evt }));
      if (evt.phase === 'done')   addLog(`${evt.type === 'koboldcpp' ? 'KoboldCPP' : 'TinyLlama model'} download complete.`);
      if (evt.phase === 'error')  addLog(`Download error: ${evt.message}`);
      if (evt.phase === 'start')  addLog(evt.message || 'Download starting...');
    });

    const unsubServer = api.onKoboldServerStatus?.((evt: { phase: ServerPhase }) => {
      setServerPhase(evt.phase);
      if (evt.phase === 'ready')    addLog('KoboldCPP server is ready on port 5001.');
      if (evt.phase === 'starting') addLog('KoboldCPP server starting...');
    });

    const unsubAutoSetup = api.onLocalAiAutoSetup?.((evt: { koboldOk: boolean; modelOk: boolean; needsSetup: boolean }) => {
      if (evt.needsSetup && !autoStarted.current) {
        autoStarted.current = true;
        addLog('Auto-setup triggered by app startup.');
        runAutoSetup(evt.koboldOk, evt.modelOk);
      }
    });

    // Initial check
    refresh().then(async () => {
      // If files already present and server not running, auto-start
      const r: CheckResult = await api.checkLocalAI().catch(() => null);
      if (r?.koboldcpp?.exists && r?.model?.exists && !autoStarted.current) {
        const ks = await api.koboldStatus?.().catch(() => ({ running: false }));
        if (!ks?.running) {
          autoStarted.current = true;
          addLog('Files present — auto-starting KoboldCPP server...');
          handleStart();
        }
      }
    });

    return () => {
      unsubProgress?.();
      unsubServer?.();
      unsubAutoSetup?.();
    };
  }, []);

  // ── Server controls ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (serverBusy) return;
    setServerBusy(true);
    setServerPhase('starting');
    addLog('Starting KoboldCPP server (may take up to 60s on first load)...');
    try {
      const r = await api.startKobold();
      if (r?.ok) {
        setServerPhase('ready');
      } else {
        setServerPhase('stopped');
        addLog(`Start failed: ${r?.error || 'unknown error'}`);
      }
    } catch (e: any) {
      setServerPhase('stopped');
      addLog(`Start error: ${e?.message || String(e)}`);
    } finally {
      setServerBusy(false);
    }
  };

  const handleStop = async () => {
    if (serverBusy) return;
    setServerBusy(true);
    try {
      await api.stopKobold();
      setServerPhase('stopped');
      addLog('KoboldCPP server stopped.');
    } finally {
      setServerBusy(false);
      await refresh();
    }
  };

  const handleRedownload = async (type: 'koboldcpp' | 'model') => {
    if (type === 'koboldcpp') await api.downloadKoboldCpp();
    else await api.downloadGgufModel('tinyllama');
    await refresh();
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const koboldProg  = progress['koboldcpp'];
  const modelProg   = progress['model'];
  const koboldBusy  = koboldProg && koboldProg.phase !== 'done' && koboldProg.phase !== 'error';
  const modelBusy   = modelProg  && modelProg.phase  !== 'done' && modelProg.phase  !== 'error';
  const filesReady  = !!status?.koboldcpp?.exists && !!status?.model?.exists;

  const serverColor = serverPhase === 'ready'    ? 'text-emerald-400'
                    : serverPhase === 'starting'  ? 'text-amber-400'
                    : serverPhase === 'stopped'   ? 'text-slate-500'
                    : 'text-slate-600';

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            Local AI Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fully local, offline AI powered by KoboldCPP + TinyLlama — no cloud, no cost.
            Downloads and starts automatically when files are installed.
          </p>
        </div>
        <button onClick={refresh} className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Server status bar ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${
            serverPhase === 'ready'   ? 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-500/60' :
            serverPhase === 'starting'? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
          }`} />
          <div>
            <p className={`text-sm font-semibold ${serverColor}`}>
              {serverPhase === 'ready'    ? 'Server Running — port 5001' :
               serverPhase === 'starting' ? 'Starting server…' :
               serverPhase === 'stopped'  ? 'Server Stopped' : 'Status Unknown'}
            </p>
            <p className="text-[10px] text-slate-500">KoboldCPP · OpenAI-compatible API · http://127.0.0.1:5001/v1</p>
          </div>
        </div>
        <div className="flex gap-2">
          {serverPhase !== 'ready' && (
            <button
              onClick={handleStart}
              disabled={serverBusy || !filesReady}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              {serverBusy && serverPhase === 'starting'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              Start
            </button>
          )}
          {serverPhase === 'ready' && (
            <button
              onClick={handleStop}
              disabled={serverBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/60 disabled:opacity-40 text-slate-300 hover:text-red-300 text-xs font-semibold transition-colors"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Files ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* KoboldCPP */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">KoboldCPP</span>
            </div>
            <Badge ok={!!status?.koboldcpp?.exists} label={status?.koboldcpp?.exists ? 'Installed' : 'Not installed'} />
          </div>
          <p className="text-[11px] text-slate-400">
            Local inference runtime by LostRuins (Henk717). Runs GGUF models entirely offline.
          </p>
          {status?.koboldcpp?.exists && status.koboldcpp.size && (
            <p className="text-[10px] text-slate-500">{fmtBytes(status.koboldcpp.size)} · {status.koboldcpp.path}</p>
          )}
          {koboldBusy && koboldProg && (
            <ProgressBar pct={koboldProg.percent} label={koboldProg.message || 'Downloading...'} bytes={koboldProg.bytesReceived} total={koboldProg.totalBytes} />
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRedownload('koboldcpp')}
              disabled={!!koboldBusy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 disabled:opacity-40 text-orange-300 text-[11px] font-medium transition-colors border border-orange-500/20"
            >
              {koboldBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {status?.koboldcpp?.exists ? 'Re-download' : 'Download'}
            </button>
            <a
              href="https://github.com/LostRuins/koboldcpp"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-medium transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> GitHub
            </a>
          </div>
          <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            <Info className="h-3 w-3 inline mr-1 text-slate-700" />
            AGPL-3.0 · © LostRuins / Henk717
          </div>
        </div>

        {/* TinyLlama */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">TinyLlama 1.1B</span>
            </div>
            <Badge ok={!!status?.model?.exists} label={status?.model?.exists ? 'Installed' : 'Not installed'} />
          </div>
          <p className="text-[11px] text-slate-400">
            TinyLlama 1.1B Chat Q4_K_M by TheBloke. Fast, lightweight — runs on any PC without a GPU.
          </p>
          {status?.model?.exists && status.model.size && (
            <p className="text-[10px] text-slate-500">{fmtBytes(status.model.size)} · {status.model.path}</p>
          )}
          {modelBusy && modelProg && (
            <ProgressBar pct={modelProg.percent} label={modelProg.message || 'Downloading...'} bytes={modelProg.bytesReceived} total={modelProg.totalBytes} />
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRedownload('model')}
              disabled={!!modelBusy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 disabled:opacity-40 text-purple-300 text-[11px] font-medium transition-colors border border-purple-500/20"
            >
              {modelBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {status?.model?.exists ? 'Re-download' : 'Download'}
            </button>
            <a
              href="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-medium transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> HuggingFace
            </a>
          </div>
          <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            <Info className="h-3 w-3 inline mr-1 text-slate-700" />
            Apache 2.0 · TinyLlama team · Quantized by TheBloke
          </div>
        </div>

      </div>

      {/* ── Activity log ─────────────────────────────────────────────────────── */}
      {log.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-2">Activity Log</p>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {log.map((l, i) => (
              <p key={i} className="text-[11px] font-mono text-slate-400">{l}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── How it connects ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-500 space-y-1">
        <p className="text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" /> How it connects to Mossy
        </p>
        <p>When the server is running, Mossy AI Chat automatically routes requests through KoboldCPP on <span className="text-slate-300 font-mono">127.0.0.1:5001</span> as a local fallback provider.</p>
        <p>KoboldCPP is also the inference engine for the <span className="text-slate-300">Fallout 4 Advanced AI</span> add-on — NPC dialogue, creature logic, and companion memory all run through this server.</p>
        <p className="text-slate-600">The server starts automatically when Mossy launches if both files are installed.</p>
      </div>

    </div>
  );
};

export default LocalAIEngine;
