import React, { useEffect, useRef, useState } from 'react';
import {
  Bot, Download, Play, Square, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Info, Cpu, HardDrive, Network, Package,
} from 'lucide-react';

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

const ProgressBar: React.FC<{ pct: number; label: string; bytes?: number; total?: number }> = ({ pct, label, bytes, total }) => (
  <div className="mt-3 space-y-1">
    <div className="flex justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span>{bytes !== undefined && total ? `${fmtBytes(bytes)} / ${fmtBytes(total)}` : `${pct}%`}</span>
    </div>
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
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

export const LocalAIEngine: React.FC = () => {
  const api = (window as any).electronAPI as any;

  const [status, setStatus]           = useState<CheckResult | null>(null);
  const [progress, setProgress]       = useState<Record<string, ProgressEvt>>({});
  const [serverPhase, setServerPhase]   = useState<ServerPhase>('unknown');
  const [serverBusy, setServerBusy]     = useState(false);
  const [log, setLog]                   = useState<string[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState<any>(null);
  const autoStarted = useRef(false);

  const addLog = (msg: string) =>
    setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 60));

  // ── Check files + server state ─────────────────────────────────────────────
  const refresh = async () => {
    try {
      if (!api?.checkLocalAI) { addLog('ERROR: checkLocalAI API not available'); return; }
      const r: CheckResult = await api.checkLocalAI();
      setStatus(r);
      const [ks, bs] = await Promise.all([
        api.koboldStatus?.().catch(() => ({ running: false })),
        api.f4aiBridgeStatus?.().catch(() => null),
      ]);
      setServerPhase(ks?.running ? 'ready' : 'stopped');
      if (bs) setBridgeStatus(bs);
      return r;
    } catch (e: any) {
      addLog(`Refresh error: ${e?.message || String(e)}`);
      setServerPhase('stopped');
    }
  };

  // ── Auto-setup: called on mount if files are missing ──────────────────────
  const runAutoSetup = async (koboldOk: boolean, modelOk: boolean) => {
    if (!koboldOk) {
      addLog('KoboldCPP not found — downloading automatically...');
      const r = await api.downloadKoboldCpp?.().catch((e: any) => ({ success: false, error: String(e) }));
      if (!r?.success) addLog(`KoboldCPP download failed: ${r?.error || 'unknown'}`);
    }
    if (!modelOk) {
      addLog('Mistral 7B model not found — downloading automatically (~4.4 GB)...');
      const r = await api.downloadGgufModel?.('mistral7b').catch((e: any) => ({ success: false, error: String(e) }));
      if (!r?.success) addLog(`Model download failed: ${r?.error || 'unknown'}`);
    }
    const updated = await refresh();
    if (updated?.koboldcpp?.exists && updated?.model?.exists) {
      addLog('Files ready — starting KoboldCPP server...');
      handleStart();
    }
  };

  // ── Mount: check files, auto-setup if missing, auto-start if ready ────────
  useEffect(() => {
    const unsubProgress = api.onLocalAiProgress?.((evt: ProgressEvt) => {
      setProgress(p => ({ ...p, [evt.type]: evt }));
      if (evt.phase === 'done')  addLog(`${evt.type === 'koboldcpp' ? 'KoboldCPP' : 'Model'} download complete.`);
      if (evt.phase === 'error') addLog(`Download error: ${evt.message}`);
      if (evt.phase === 'start') addLog(evt.message || 'Download starting...');
    });

    const unsubServer = api.onKoboldServerStatus?.((evt: { phase: ServerPhase }) => {
      setServerPhase(evt.phase);
      if (evt.phase === 'ready')    addLog('KoboldCPP server is ready on port 5001.');
      if (evt.phase === 'starting') addLog('KoboldCPP server starting...');
    });

    // Do the initial check directly — don't rely on the auto-setup IPC event
    // (that event fires on did-finish-load, before this lazy component mounts)
    (async () => {
      const r = await refresh();
      if (!r) return;
      const koboldOk = r.koboldcpp.exists;
      const modelOk  = r.model.exists;

      if (!koboldOk || !modelOk) {
        if (!autoStarted.current) {
          autoStarted.current = true;
          addLog(`Auto-setup: kobold=${koboldOk ? 'found' : 'missing'}, model=${modelOk ? 'found' : 'missing'}`);
          runAutoSetup(koboldOk, modelOk);
        }
      } else if (!autoStarted.current) {
        // Both present — check if server needs to be started
        const ks = await api.koboldStatus?.().catch(() => ({ running: false }));
        if (!ks?.running) {
          autoStarted.current = true;
          addLog('Files found — auto-starting KoboldCPP server...');
          handleStart();
        } else {
          addLog('KoboldCPP already running on port 5001.');
        }
      }
    })();

    return () => {
      unsubProgress?.();
      unsubServer?.();
    };
  }, []);

  // ── Server controls ────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (serverBusy) return;
    setServerBusy(true);
    setServerPhase('starting');
    addLog('Starting KoboldCPP... (may take up to 60s on first load)');
    try {
      const r = await api.startKobold?.();
      if (r?.ok) {
        setServerPhase('ready');
        addLog('KoboldCPP running on port 5001.');
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
      await api.stopKobold?.();
      setServerPhase('stopped');
      addLog('KoboldCPP server stopped.');
    } finally {
      setServerBusy(false);
      await refresh();
    }
  };

  const handleRedownload = async (type: 'koboldcpp' | 'model', modelId: 'mistral7b' | 'tinyllama' = 'mistral7b') => {
    if (type === 'koboldcpp') await api.downloadKoboldCpp?.();
    else await api.downloadGgufModel?.(modelId);
    await refresh();
  };

  const koboldProg = progress['koboldcpp'];
  const modelProg  = progress['model'];
  const koboldBusy = koboldProg && koboldProg.phase !== 'done' && koboldProg.phase !== 'error';
  const modelBusy  = modelProg  && modelProg.phase  !== 'done' && modelProg.phase  !== 'error';
  const filesReady = !!status?.koboldcpp?.exists && !!status?.model?.exists;

  const serverColor = serverPhase === 'ready'    ? 'text-emerald-400'
                    : serverPhase === 'starting'  ? 'text-amber-400'
                    : 'text-slate-500';

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            Local AI Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fully local, offline AI powered by KoboldCPP + Mistral 7B — no cloud, no cost.
          </p>
        </div>
        <button onClick={() => refresh()} className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors" title="Refresh status">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Server status bar */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
            serverPhase === 'ready'    ? 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-500/60' :
            serverPhase === 'starting' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
          }`} />
          <div>
            <p className={`text-sm font-semibold ${serverColor}`}>
              {serverPhase === 'ready'    ? 'Server Running — port 5001' :
               serverPhase === 'starting' ? 'Starting server...' :
               serverPhase === 'stopped'  ? 'Server Stopped' : 'Checking...'}
            </p>
            <p className="text-[10px] text-slate-500">KoboldCPP · http://127.0.0.1:5001/v1</p>
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

      {/* Bridge Connections */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-sky-400" />
          Bridge Connections
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Mossy F4AI Bridge', port: 8765,  key: 'mossy_bridge',  color: 'sky' },
            { label: 'KoboldCPP',         port: 5001,  key: 'koboldcpp',     color: 'orange' },
            { label: 'Python Bridge',     port: 28485, key: 'python_bridge', color: 'violet' },
          ].map(({ label, port, key, color }) => {
            const running = bridgeStatus?.[key]?.running;
            return (
              <div key={key} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    running === true  ? `bg-${color}-400 shadow-[0_0_5px] shadow-${color}-500/60` :
                    running === false ? 'bg-slate-600' : 'bg-slate-700 animate-pulse'
                  }`} />
                  <span className="text-[11px] font-medium text-slate-300 truncate">{label}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-600">:{port}</p>
                <p className={`text-[10px] font-semibold ${
                  running === true  ? `text-${color}-400` :
                  running === false ? 'text-slate-600'    : 'text-slate-500'
                }`}>
                  {running === true ? 'Connected' : running === false ? 'Offline' : '—'}
                </p>
              </div>
            );
          })}
          {/* F4AI_MiscUtil.dll — F4SE plugin providing native Papyrus MiscUtil functions */}
          {(() => {
            const dll = bridgeStatus?.misc_util_dll;
            const installed = dll?.installed === true;
            const pending   = dll === undefined || dll === null;
            return (
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    pending    ? 'bg-slate-700 animate-pulse' :
                    installed  ? 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-500/60' :
                                 'bg-amber-500'
                  }`} />
                  <span className="text-[11px] font-medium text-slate-300 truncate">F4AI_MiscUtil</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-slate-600 flex-shrink-0" />
                  <p className="text-[10px] font-mono text-slate-600">F4SE Plugin</p>
                </div>
                <p className={`text-[10px] font-semibold ${
                  pending   ? 'text-slate-500' :
                  installed ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {pending ? '—' : installed ? 'Installed' : 'Not built'}
                </p>
              </div>
            );
          })()}
        </div>

        {/* DLL build instructions when not installed */}
        {bridgeStatus?.misc_util_dll?.installed === false && (
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 space-y-1.5 text-[10px] text-slate-400">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              F4AI_MiscUtil.dll not found — push-to-talk bridge requires it
            </p>
            <p>Build once with VS2022 + CMake, then drop the DLL into <span className="font-mono text-slate-300">Data\F4SE\Plugins\</span></p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
              <li>Download F4SE source from <span className="font-mono text-sky-400">f4se.silverlock.org</span> → extract to <span className="font-mono">C:\dev\f4se_src</span></li>
              <li>Open VS2022 Developer Command Prompt</li>
              <li className="font-mono text-slate-400 whitespace-pre-wrap">cd D:\Projects\Fallout-4-advanced-AI\f4se_plugin</li>
              <li className="font-mono text-slate-400 whitespace-pre-wrap">mkdir build &amp;&amp; cd build</li>
              <li className="font-mono text-slate-400 whitespace-pre-wrap">cmake .. -DF4SE_SOURCE_DIR="C:\dev\f4se_src" -A x64</li>
              <li className="font-mono text-slate-400 whitespace-pre-wrap">cmake --build . --config Release</li>
              <li>Copy <span className="font-mono">build\Release\F4AI_MiscUtil.dll</span> → <span className="font-mono">Data\F4SE\Plugins\</span></li>
            </ol>
          </div>
        )}
        {bridgeStatus?.misc_util_dll?.installed === true && bridgeStatus.misc_util_dll.path && (
          <p className="text-[10px] text-emerald-600 font-mono break-all border-t border-slate-800 pt-2">
            F4AI_MiscUtil.dll: {bridgeStatus.misc_util_dll.path}
          </p>
        )}

        {bridgeStatus?.f4ai_base && (
          <p className="text-[10px] text-slate-600 font-mono break-all border-t border-slate-800 pt-2">
            F4AI addon: {bridgeStatus.f4ai_base}
          </p>
        )}
        {!bridgeStatus?.f4ai_base && bridgeStatus !== null && (
          <p className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            F4AI addon not detected — install via Mod Organizer 2 or drop files in FO4 Data\F4AI\
          </p>
        )}
      </div>

      {/* Files */}
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
            <p className="text-[10px] text-slate-500 break-all">{fmtBytes(status.koboldcpp.size)} · {status.koboldcpp.path}</p>
          )}
          {koboldBusy && koboldProg && (
            <ProgressBar pct={koboldProg.percent} label={koboldProg.message || 'Downloading...'} bytes={koboldProg.bytesReceived} total={koboldProg.totalBytes} />
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRedownload('koboldcpp')}
              disabled={!!koboldBusy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 disabled:opacity-40 text-orange-300 text-[11px] font-medium border border-orange-500/20 transition-colors"
            >
              {koboldBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {status?.koboldcpp?.exists ? 'Re-download' : 'Download'}
            </button>
            <a href="https://github.com/LostRuins/koboldcpp" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-medium transition-colors">
              <ExternalLink className="h-3 w-3" /> GitHub
            </a>
          </div>
          <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            <Info className="h-3 w-3 inline mr-1 text-slate-700" />
            AGPL-3.0 · LostRuins / Henk717
          </div>
        </div>

        {/* Mistral 7B - default, stronger model */}
        <div className="bg-slate-900 border border-emerald-700/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Mistral 7B Instruct</span>
            </div>
            <Badge ok={!!status?.model?.exists} label={status?.model?.exists ? 'Installed' : 'Not installed'} />
          </div>
          <p className="text-[11px] text-slate-400">
            Mistral 7B Instruct v0.2 Q4_K_M by TheBloke. Default local model — far stronger than a 1B-class model at
            structured output, reasoning, and script generation (used by the Creative Director team and chat fallback).
            Runs on CPU, no GPU required.
          </p>
          {status?.model?.exists && status.model.size && (
            <p className="text-[10px] text-slate-500 break-all">{fmtBytes(status.model.size)} · {status.model.path}</p>
          )}
          {modelBusy && modelProg && (
            <ProgressBar pct={modelProg.percent} label={modelProg.message || 'Downloading...'} bytes={modelProg.bytesReceived} total={modelProg.totalBytes} />
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRedownload('model', 'mistral7b')}
              disabled={!!modelBusy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 disabled:opacity-40 text-purple-300 text-[11px] font-medium border border-purple-500/20 transition-colors"
            >
              {modelBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {status?.model?.exists ? 'Re-download' : 'Download (~4.4 GB)'}
            </button>
            <a href="https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-medium transition-colors">
              <ExternalLink className="h-3 w-3" /> HuggingFace
            </a>
          </div>
          <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            <Info className="h-3 w-3 inline mr-1 text-slate-700" />
            Apache 2.0 · Mistral AI · Quantized by TheBloke
          </div>
        </div>

        {/* TinyLlama - optional lite fallback for very low-spec machines */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-white">TinyLlama 1.1B (Lite)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            TinyLlama 1.1B Chat Q4_K_M by TheBloke. Optional smaller/faster fallback for very low-spec machines.
            Mistral 7B above is used automatically when present, so most users don't need this.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRedownload('model', 'tinyllama')}
              disabled={!!modelBusy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-40 text-slate-300 text-[11px] font-medium border border-slate-600/30 transition-colors"
            >
              {modelBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Download (~670 MB)
            </button>
            <a href="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-medium transition-colors">
              <ExternalLink className="h-3 w-3" /> HuggingFace
            </a>
          </div>
          <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
            <Info className="h-3 w-3 inline mr-1 text-slate-700" />
            Apache 2.0 · TinyLlama team · Quantized by TheBloke
          </div>
        </div>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-2">Activity Log</p>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {log.map((l, i) => (
              <p key={i} className={`text-[11px] font-mono ${l.includes('ERROR') || l.includes('error') || l.includes('failed') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
            ))}
          </div>
        </div>
      )}

      {/* Connection info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-500 space-y-1">
        <p className="text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" /> How it connects to Mossy
        </p>
        <p>KoboldCPP serves inference on <span className="text-slate-300 font-mono">127.0.0.1:5001</span> — used by Mossy AI Chat and the F4AI Python bridge.</p>
        <p>Mossy F4AI Bridge listens on <span className="text-slate-300 font-mono">127.0.0.1:8765</span> — the F4AI plugin calls it for NPC dialogue and context enrichment.</p>
        <p>Python Bridge runs on <span className="text-slate-300 font-mono">127.0.0.1:28485</span> — handles in-game NPC requests from Papyrus scripts.</p>
        <p className="text-slate-600">All three start automatically when Mossy launches if both files are present.</p>
      </div>

    </div>
  );
};

export default LocalAIEngine;
