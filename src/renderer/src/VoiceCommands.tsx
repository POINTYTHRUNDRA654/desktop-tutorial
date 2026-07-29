import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { VoiceService, VoiceServiceConfig } from './voice-service';

export default function VoiceCommands() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const voiceServiceRef = useRef<VoiceService | null>(null);

  // Real speech recognition via VoiceService (local Whisper if available,
  // else browser Web Speech API) — the same service AIModAssistant.tsx uses.
  // The old window.electron.api.voiceCommands IPC channel never actually ran
  // speech recognition on the main-process side (it just acknowledged the
  // call), so it could never produce a real transcript.
  const getVoiceService = (): VoiceService => {
    if (!voiceServiceRef.current) {
      const bridge: any = (window as any).electron?.api;
      const hasLocalWhisper = typeof bridge?.transcribeAudio === 'function';
      const hasBrowserStt = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      const config: VoiceServiceConfig = {
        sttProvider: hasLocalWhisper ? 'local' : hasBrowserStt ? 'browser' : 'local',
        ttsProvider: 'browser',
      };
      voiceServiceRef.current = new VoiceService(config);
      voiceServiceRef.current.initialize().catch(console.error);
    }
    return voiceServiceRef.current;
  };

  useEffect(() => {
    return () => { voiceServiceRef.current?.stopListening(); };
  }, []);

  const toggleListening = async () => {
    const service = getVoiceService();
    if (isListening) {
      service.stopListening();
      setIsListening(false);
      return;
    }
    if (!service.isSupported()) {
      setMessage('Voice input is not supported in this environment — no microphone access or speech recognition available.');
      return;
    }
    setMessage('');
    setIsListening(true);
    service.startListening(
      (text) => {
        setTranscript(text);
        service.stopListening();
        setIsListening(false);
      },
      (err) => {
        setMessage(`Voice input error: ${err}`);
        setIsListening(false);
      },
      () => { /* mode changes (listening/processing/idle) — no dedicated UI state here */ }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <Mic className="w-10 h-10" />
              Voice Commands
            </h1>
            <p className="text-slate-400 mt-2">Control Mossy with your voice</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkillLevel('beginner')} className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>🟢 Beginner</button>
            <button onClick={() => setSkillLevel('intermediate')} className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>🟡 Intermediate</button>
            <button onClick={() => setSkillLevel('advanced')} className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>🔴 Advanced</button>
          </div>
        </div>

        {message && <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">{message}</div>}

        <div className="bg-slate-800 rounded-lg p-6 text-center">
          <button onClick={toggleListening} className={`w-64 h-64 rounded-full mx-auto flex items-center justify-center transition-all ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}>
            {isListening ? <MicOff className="w-32 h-32 text-white" /> : <Mic className="w-32 h-32 text-white" />}
          </button>
          <p className="text-white text-xl mt-6">{isListening ? 'Listening...' : 'Click to start voice commands'}</p>
          {transcript && (
            <div className="mt-6 p-4 bg-slate-700 rounded">
              <p className="text-slate-300">"{transcript}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
