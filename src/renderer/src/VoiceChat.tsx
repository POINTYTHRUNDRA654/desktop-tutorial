import React, { useState } from 'react';
import { Mic, MicOff, PhoneOff, AlertCircle, Radio, Power, ChevronDown } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';
import { Link } from 'react-router-dom';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { mossyAvatarUrl } from './assets/avatar';
import VoiceSettings from './VoiceSettings';
import AudioStudio from './TTSPanel';
import MossyMemoryVault from './MossyMemoryVault';
import NeuralLink from './NeuralLink';
import MossyOnboarding from './MossyOnboarding';
import { VoiceSetupWizard } from './VoiceSetupWizard';

const DEFAULT_MOSSY_AVATAR_URL = mossyAvatarUrl;

type MossyStep = {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
};

const VoiceChat: React.FC = () => {
  const fallbackLive = { isActive: false, isMuted: false, toggleMute: () => {}, disconnect: () => {}, mode: 'disconnected', connect: async () => {}, transcription: '', micLevel: 0, audioInputs: [], selectedInputId: '', setSelectedInputId: () => {} };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const liveContext = useLive() || fallbackLive;
  const { isActive, isMuted, toggleMute, disconnect, mode, connect, transcription, micLevel, audioInputs, selectedInputId, setSelectedInputId } = liveContext;
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string>('live-session');
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

  const liveSessionContent = (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-xs font-mono flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
          <button
            type="button"
            onClick={handleConnect}
            className="px-3 py-1 rounded-md border border-red-300/40 text-[10px] uppercase tracking-widest text-red-100 hover:bg-red-500/20 transition"
          >
            Retry
          </button>
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
  );

  const mossySteps: MossyStep[] = [
    {
      id: 'setup',
      title: 'Voice Setup',
      description: 'Confirm permissions, backend connectivity, and basic voice readiness.',
      content: <VoiceSetupWizard embedded />,
    },
    {
      id: 'voice-selection',
      title: 'Voice Selection & Mic Test',
      description: 'Pick Mossy’s voice, test browser TTS, and validate microphone input.',
      content: <VoiceSettings embedded />,
    },
    {
      id: 'live-session',
      title: 'Live Synapse Session',
      description: 'Connect and talk to Mossy with live transcription and mic monitoring.',
      content: liveSessionContent,
    },
    {
      id: 'audio-studio',
      title: 'Audio Studio',
      description: 'Create, process, and export mod audio assets in one place.',
      content: <AudioStudio embedded />,
    },
    {
      id: 'memory-vault',
      title: 'Memory Vault',
      description: 'Upload private notes and tutorials to grow Mossy’s project memory.',
      content: <MossyMemoryVault embedded />,
    },
    {
      id: 'neural-link',
      title: 'Neural Link',
      description: 'Monitor running tools so Mossy can adapt to your active modding session.',
      content: <NeuralLink embedded />,
    },
    {
      id: 'onboarding',
      title: 'Mossy Onboarding',
      description: 'Review Mossy’s capabilities and privacy-first workflow anytime.',
      content: <MossyOnboarding embedded />,
    },
  ];

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
      <div className="p-6 relative z-10">
        <div className="flex justify-between items-start gap-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase italic">
              <Radio className="w-6 h-6 text-blue-400 animate-pulse" />
              Live Synapse
            </h1>
            <p className="text-blue-400/60 text-[10px] font-mono tracking-widest uppercase mt-1">Direct Neural Interface • v4.0.2</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              to="/reference"
              className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded bg-blue-500/10 border border-blue-500/30 text-blue-100 hover:bg-blue-500/20 transition-colors"
              title="Open help"
            >
              Help
            </Link>
            {isActive && (
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] text-blue-400 font-mono animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    ENCRYPTED BEAM ACTIVE
               </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <ToolsInstallVerifyPanel
            accentClassName="text-blue-300"
            description="Live Synapse uses your microphone and the app’s live voice pipeline. No external tools are required, but device permissions must be enabled."
            verify={[
              'Expand “Live Synapse Session” and confirm the controls respond without errors.',
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
          />
        </div>
      </div>

      <div className="px-6 pb-10 relative z-10">
        <div className="max-w-5xl mx-auto space-y-4">
          {mossySteps.map((step, index) => (
            <div
              key={step.id}
              className="bg-black/60 border border-blue-500/20 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? '' : step.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-blue-500/10 transition-colors"
              >
                <div className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/30 px-2 py-1 rounded">
                  Step {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">{step.title}</div>
                  <div className="text-xs text-blue-200/60 mt-1">{step.description}</div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-blue-200/60 transition-transform ${
                    expandedStep === step.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedStep === step.id && (
                <div className="px-5 py-5 border-t border-blue-500/20 bg-black/40">
                  {step.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
