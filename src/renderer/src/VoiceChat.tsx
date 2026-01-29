import React, { useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, PhoneOff, AlertCircle, Radio, Power, Database, Play } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';
import { useNavigate } from 'react-router-dom';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { mossyAvatarUrl } from './assets/avatar';
import { formatAppVersion } from './appInfo';
import { getBrowserTtsVoices, loadBrowserTtsSettings, speakBrowserTts, type BrowserTtsSettings } from './browserTts';

const DEFAULT_MOSSY_AVATAR_URL = mossyAvatarUrl;

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

const VoiceChat: React.FC = () => {
  const navigate = useNavigate();
  const fallbackLive = { isActive: false, isMuted: false, toggleMute: () => {}, disconnect: () => {}, mode: 'disconnected', connect: async () => {}, transcription: '', micLevel: 0, audioInputs: [], selectedInputId: '', setSelectedInputId: () => {} };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const liveContext = useLive() || fallbackLive;
  const { isActive, isMuted, toggleMute, disconnect, mode, connect, transcription, micLevel, audioInputs, selectedInputId, setSelectedInputId, status } = liveContext as any;
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTtsDiagnostics, setShowTtsDiagnostics] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSettings, setTtsSettings] = useState<BrowserTtsSettings>(() => loadBrowserTtsSettings());
  const [nativeTtsLastResult, setNativeTtsLastResult] = useState<string>('');
  const isConfigError = !!error && (
    error.includes('needs an LLM provider') ||
    error.includes('needs speech-to-text') ||
    error.includes('No LLM provider is configured') ||
    error.includes('Speech-to-text is not configured')
  );
  const [knowledgeCount, setKnowledgeCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('mossy_knowledge_vault');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const readCount = () => {
      try {
        const raw = localStorage.getItem('mossy_knowledge_vault');
        const parsed = raw ? JSON.parse(raw) : null;
        setKnowledgeCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setKnowledgeCount(0);
      }
    };

    const onKnowledgeUpdated = () => readCount();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'mossy_knowledge_vault') readCount();
    };

    window.addEventListener('mossy-knowledge-updated', onKnowledgeUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('mossy-knowledge-updated', onKnowledgeUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Keep TTS diagnostics updated in this view (packaged installs can differ from dev).
  useEffect(() => {
    const refresh = () => setTtsVoices(getBrowserTtsVoices());
    refresh();

    try {
      setTtsSettings(loadBrowserTtsSettings());
    } catch {
      // ignore
    }

    if (!('speechSynthesis' in window)) return;

    const handler = () => refresh();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    } catch {
      // ignore
    }

    const t = setTimeout(refresh, 200);

    return () => {
      clearTimeout(t);
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
      } catch {
        // ignore
      }
    };
  }, []);

  const ttsDiagnostics = useMemo(() => {
    const api = getElectronApi();
    const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const voicesCount = ttsVoices.length;
    const sampleVoices = ttsVoices
      .slice(0, 4)
      .map((v) => `${String(v.name || 'Unknown')}${v.lang ? ` (${v.lang})` : ''}`);

    return {
      speechAvailable,
      voicesCount,
      sampleVoices,
      browserTtsEnabled: Boolean(ttsSettings.enabled),
      preferredVoiceName: ttsSettings.preferredVoiceName || '(auto)',
      nativeAvailable: typeof api?.nativeTtsSpeak === 'function',
    };
  }, [ttsSettings.enabled, ttsSettings.preferredVoiceName, ttsVoices]);

  const onTestBrowserTts = async () => {
    await speakBrowserTts('Howdy. I\'m Mossy. Testing voice output.', { cancelExisting: true });
  };

  const onTestNativeTts = async () => {
    const api = getElectronApi();
    setNativeTtsLastResult('');

    if (!api?.nativeTtsSpeak) {
      setNativeTtsLastResult('Native TTS IPC not available');
      return;
    }

    try {
      const res = await api.nativeTtsSpeak('Howdy. I\'m Mossy. Testing voice output.');
      if (res?.ok) setNativeTtsLastResult('Native TTS: ok');
      else setNativeTtsLastResult(`Native TTS error: ${String(res?.error || 'unknown')}`);
    } catch (e: any) {
      setNativeTtsLastResult(`Native TTS error: ${String(e?.message || e)}`);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connect();
      setIsConnecting(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to voice chat';
      setError(msg);
      setIsConnecting(false);
    }
  };

  const getStatusColor = () => {
    if (!isActive) return 'text-slate-400';
    if (mode === 'speaking') return 'text-cyan-400';
    if (mode === 'listening') return 'text-emerald-400';
    if (mode === 'processing') return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getStatusText = () => {
    if (error) return 'CONNECTION ERROR';
    if (!isActive) return 'SYSTEM IDLE';
    if (mode === 'speaking') return 'SYNAPTIC UPLINK ACTIVE';
    if (mode === 'listening') return 'PROCESSING VOCAL INPUT...';
    if (mode === 'processing') return 'NEURAL COMPUTATION...';
    return 'LINK ESTABLISHED';
  };

  return (
    <div 
      className="h-full w-full flex flex-col relative overflow-y-auto overflow-x-hidden bg-black"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6)), url(${DEFAULT_MOSSY_AVATAR_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Immersive Overlay */}
      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />

      {/* Header */}
      <div className="p-6 relative z-10 flex justify-between items-start">
        <div>

        <div className="px-6 relative z-10">
          <ToolsInstallVerifyPanel
            accentClassName="text-blue-300"
            description="Live Synapse uses your microphone and the app’s live voice pipeline. No external tools are required, but device permissions must be enabled."
            verify={[
              'Click Connect and confirm the status text changes from idle to active.',
              'Speak and confirm the mic level meter responds and transcription updates (if enabled).',
              'Disconnect and confirm the UI returns to idle without errors.'
            ]}
            firstTestLoop={[
              'Select the correct microphone input (if multiple are available).',
              'Connect → speak one short sentence → confirm transcription updates.',
              'Open Memory Vault and confirm the vault badge still matches your local count.'
            ]}
            troubleshooting={[
              'If no inputs appear, check OS microphone permissions and ensure no other app is exclusively using the mic.',
              'If Connect fails, check any required credentials/config in Settings and retry.'
            ]}
            shortcuts={[
              { label: 'Memory Vault', to: '/memory-vault' },
              { label: 'Chat', to: '/chat' },
              { label: 'TTS / Audio Studio', to: '/tts' },
              { label: 'Privacy Settings', to: '/settings/privacy' },
            ]}
          />
        </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase italic">
            <Radio className="w-6 h-6 text-blue-400 animate-pulse" />
            Live Synapse
          </h1>
          <p className="text-blue-400/60 text-[10px] font-mono tracking-widest uppercase mt-1">Direct Neural Interface • {formatAppVersion()}</p>
          {status && String(status).trim() && String(status).trim() !== 'Ready' && (
            <p className="text-blue-200/70 text-[10px] font-mono tracking-widest uppercase mt-2">
              STATUS: {String(status)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {knowledgeCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/memory-vault')}
              className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-300 font-mono hover:bg-emerald-500/15 hover:border-emerald-400/30 transition-colors"
              title="Open Memory Vault (Knowledge Vault is loaded locally)"
              aria-label="Open Memory Vault"
            >
              <Database className="w-3 h-3" />
              VAULT LOADED • {knowledgeCount}
            </button>
          )}
          {isActive && (
             <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] text-blue-400 font-mono animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  ENCRYPTED BEAM ACTIVE
             </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-xs font-mono flex items-center gap-2 backdrop-blur-md">
            <AlertCircle size={14} />
            <span className="flex-1">{error}</span>
            {isConfigError ? (
              <button
                type="button"
                onClick={() => navigate('/settings/privacy')}
                className="px-3 py-1 rounded bg-slate-900/60 hover:bg-slate-900 border border-red-500/30 text-red-100 text-[10px] font-bold uppercase tracking-widest"
              >
                Open Privacy Settings
              </button>
            ) : null}
          </div>
        )}

        {/* Status Indicator / Avatar */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className={`relative group mb-6 transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100 hover:scale-105'}`}>
            <AvatarCore className="w-48 h-48 border-4 shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-4" />
            
            <h2 className={`text-sm font-black tracking-[0.2em] font-mono uppercase ${getStatusColor()}`}>{getStatusText()}</h2>
          </div>

          {transcription && (
            <div className="bg-black/60 backdrop-blur-md border border-blue-500/20 px-6 py-3 rounded-2xl max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <p className="text-sm text-blue-100 italic leading-relaxed font-serif">&quot;{transcription}&quot;</p>
            </div>
          )}

          {isActive && (
            <div className="mt-4 flex items-center gap-3 bg-blue-900/30 border border-blue-500/30 rounded-xl px-4 py-2 backdrop-blur-md shadow-lg">
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200/80">Mic Level</span>
              <div className="flex-1 h-2 bg-slate-900/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    micLevel > 40 ? 'bg-emerald-400' : micLevel > 20 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-blue-100 w-10 text-right">{micLevel}%</span>
            </div>
          )}
          
          {isActive && !transcription && (
            <div className="flex gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            </div>
          )}
        </div>

        {/* Simplified Toggle Control */}
        <div className="flex flex-col items-center gap-6 mb-8">

          {/* Compact TTS status + toggleable diagnostics (helps with installer-only silent voice) */}
          <div className="w-full max-w-md bg-black/40 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-blue-200/80">TTS</div>
                <div className="text-[12px] text-blue-100/90 mt-1">
                  speechSynthesis: {ttsDiagnostics.speechAvailable ? 'ok' : 'missing'} · voices: {ttsDiagnostics.voicesCount} · native: {ttsDiagnostics.nativeAvailable ? 'ok' : 'missing'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTtsDiagnostics((v) => !v)}
                className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-100 font-bold rounded-lg transition-colors text-[11px]"
              >
                {showTtsDiagnostics ? 'Hide' : 'Show'}
              </button>
            </div>

            {showTtsDiagnostics && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                  <div className="text-blue-100/90"><span className="text-blue-200/60">Browser TTS enabled:</span> {ttsDiagnostics.browserTtsEnabled ? 'yes' : 'no'}</div>
                  <div className="text-blue-100/90"><span className="text-blue-200/60">Preferred voice:</span> {ttsDiagnostics.preferredVoiceName}</div>
                </div>

                {ttsDiagnostics.sampleVoices.length > 0 && (
                  <div className="mt-2 text-[11px] text-blue-200/60">
                    <span className="text-blue-200/40">Sample voices:</span> {ttsDiagnostics.sampleVoices.join(' · ')}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setTtsVoices(getBrowserTtsVoices())}
                    className="px-3 py-2 bg-black/40 hover:bg-black/50 border border-blue-500/30 text-blue-100 font-bold rounded-lg transition-colors text-[11px]"
                    title="Refresh voice list"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={onTestBrowserTts}
                    className="px-3 py-2 bg-black/40 hover:bg-black/50 border border-blue-500/30 text-blue-100 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-2"
                    title="Test browser TTS"
                  >
                    <Play className="w-4 h-4" />
                    Test Browser
                  </button>
                  <button
                    type="button"
                    onClick={onTestNativeTts}
                    className="px-3 py-2 bg-black/40 hover:bg-black/50 border border-blue-500/30 text-blue-100 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-2"
                    title="Test native OS TTS fallback"
                  >
                    <Play className="w-4 h-4" />
                    Test Native
                  </button>
                </div>

                {nativeTtsLastResult && (
                  <div className="mt-3 text-[12px] text-blue-100 bg-black/40 border border-blue-500/20 rounded-lg p-3">
                    {nativeTtsLastResult}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-xs text-left">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-200/70 block mb-2">Input Device</label>
            <select
              className="w-full bg-black/60 text-blue-100 border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={selectedInputId}
              onChange={(e) => setSelectedInputId(e.target.value)}
              disabled={isConnecting}
            >
              <option value="">System Default</option>
              {audioInputs.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>{d.label || `Mic ${idx + 1}`}</option>
              ))}
            </select>
            <p className="text-[10px] text-blue-200/60 mt-1">If Mossy hears herself, pick your physical mic (not Stereo Mix).</p>
          </div>
          <button
            onClick={() => isActive ? disconnect() : handleConnect()}
            disabled={isConnecting}
            className={`group relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-500 shadow-2xl ${
              isActive 
                ? 'bg-red-600 shadow-red-600/40 hover:bg-red-500' 
                : 'bg-blue-600 shadow-blue-600/40 hover:bg-blue-500'
            } ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            {/* Spinning ring for connection */}
            {(isConnecting || isActive) && (
                <div className={`absolute inset-0 border-2 rounded-full border-white/20 border-t-white animate-spin`} />
            )}
            
            {isActive ? (
              <PhoneOff className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <Power className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
            )}
            
            <div className="absolute -bottom-10 whitespace-nowrap text-[10px] font-black tracking-[0.2em] text-white/40 uppercase group-hover:text-white transition-colors">
              {isConnecting ? 'ESTABLISHING...' : isActive ? 'TERMINATE LINK' : 'INITIATE UPLINK'}
            </div>
          </button>

          {isActive && (
            <div className="flex gap-3">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                  isMuted
                    ? 'bg-red-500/10 border-red-500/50 text-red-400'
                    : 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                }`}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {isMuted ? 'Muted' : 'Voice Active'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
