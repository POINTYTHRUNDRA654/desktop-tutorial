import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, AlertCircle } from 'lucide-react';
import { useLive } from './LiveContext';

const VoiceChat: React.FC = () => {
  const { isActive, isMuted, toggleMute, disconnect, mode, connect, transcription } = useLive();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev.slice(-5), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    console.log(msg);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    addLog('Starting voice chat connection...');
    try {
      addLog('Calling connect()...');
      await connect();
      addLog('Connect() completed');
      setIsConnecting(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to voice chat';
      addLog(`ERROR: ${msg}`);
      setError(msg);
      setIsConnecting(false);
    }
  };

  const getStatusColor = () => {
    if (!isActive) return 'text-slate-400';
    if (mode === 'speaking') return 'text-red-400';
    if (mode === 'listening') return 'text-emerald-400';
    if (mode === 'processing') return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getStatusText = () => {
    if (!isActive) return 'Ready to connect';
    if (mode === 'speaking') return 'Mossy is speaking...';
    if (mode === 'listening') return 'Listening...';
    if (mode === 'processing') return 'Processing...';
    return 'Connected';
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0e0a] text-white">
      {/* Header */}
      <div className="border-b border-slate-700 p-6">
        <h1 className="text-3xl font-bold text-[#00ff00] flex items-center gap-3">
          <Phone className="w-8 h-8" />
          Live Voice Chat
        </h1>
        <p className="text-slate-400 text-sm mt-2">Real-time conversation with Mossy AI</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Status Indicator */}
        <div className="mb-8 text-center">
          <div className={`w-24 h-24 rounded-full border-4 ${isActive ? 'border-[#00ff00] bg-emerald-900/20 animate-pulse' : 'border-slate-600 bg-slate-900/50'} flex items-center justify-center mx-auto mb-4`}>
            <Mic className={`w-12 h-12 ${getStatusColor()}`} />
          </div>
          <h2 className={`text-xl font-bold ${getStatusColor()}`}>{getStatusText()}</h2>
          <p className="text-xs text-slate-500 mt-2 font-mono">Mode: {mode}</p>
          {transcription && (
            <p className="text-sm text-emerald-400 italic mt-3 max-w-sm mx-auto">"{transcription}"</p>
          )}
          {isActive && !transcription && <p className="text-slate-400 text-sm mt-2">Say something to Mossy...</p>}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          {!isActive ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 transition-all shadow-lg disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
              {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={disconnect}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 max-w-md text-center">
          <h3 className="font-bold text-[#00ff00] mb-3">How to use Live Voice</h3>
          <ol className="text-sm text-slate-300 space-y-2 text-left mb-4">
            <li>1. First, configure your Google Gemini API key in Settings</li>
            <li>2. Click "Start Voice Chat" to connect</li>
            <li>3. Allow microphone access when prompted</li>
            <li>4. Speak naturally to Mossy</li>
            <li>5. Listen to Mossy's responses</li>
            <li>6. Click "End Call" to disconnect</li>
          </ol>
          <p className="text-xs text-slate-500 mt-3">
            ⚙️ <a href="#/settings/privacy" className="text-emerald-400 hover:text-emerald-300">Go to Settings</a> to add your API key
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-700 p-4 text-center text-xs text-slate-500">
        <p>Powered by Google Gemini Live API • Requires API key configured in .env.local</p>
      </div>

      {/* Debug Log */}
      <div className="border-t border-slate-700 p-3 bg-slate-900/50 max-h-24 overflow-y-auto">
        <div className="text-[10px] font-mono text-slate-400 space-y-1">
          {debugLog.map((log, i) => (
            <div key={i} className={log.includes('ERROR') ? 'text-red-400' : 'text-slate-400'}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
