import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceCommands() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');

  const toggleListening = async () => {
    if (isListening) {
      await window.electron.api.voiceCommands.stopListening();
      setIsListening(false);
    } else {
      await window.electron.api.voiceCommands.startListening();
      setIsListening(true);
      window.electron.api.voiceCommands.onTranscript((text: string) => {
        setTranscript(text);
      });
    }
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
