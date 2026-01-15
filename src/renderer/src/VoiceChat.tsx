import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, Radio, Power, Wifi, Circle } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';

const VoiceChat: React.FC = () => {
  const { isActive, isMuted, toggleMute, disconnect, mode, connect, transcription } = useLive();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!isActive) return 'SYSTEM IDLE';
    if (mode === 'speaking') return 'SYNAPTIC UPLINK ACTIVE';
    if (mode === 'listening') return 'PROCESSING VOCAL INPUT...';
    if (mode === 'processing') return 'NEURAL COMPUTATION...';
    return 'LINK ESTABLISHED';
  };

  return (
    <div 
      className="h-full w-full flex flex-col relative overflow-hidden bg-black"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6)), url("/mossy-avatar.png")',
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
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase italic">
            <Radio className="w-6 h-6 text-blue-400 animate-pulse" />
            Live Synapse
          </h1>
          <p className="text-blue-400/60 text-[10px] font-mono tracking-widest uppercase mt-1">Direct Neural Interface • v4.0.2</p>
        </div>
        {isActive && (
           <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] text-blue-400 font-mono animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                ENCRYPTED BEAM ACTIVE
           </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-xs font-mono flex items-center gap-2 backdrop-blur-md">
            <AlertCircle size={14} />
            {error}
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
              <p className="text-sm text-blue-100 italic leading-relaxed font-serif">"{transcription}"</p>
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
          <button
            onClick={isActive ? disconnect : handleConnect}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
