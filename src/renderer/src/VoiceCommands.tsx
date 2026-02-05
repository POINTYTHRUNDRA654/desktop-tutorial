import React, { useState, useEffect } from 'react';
import { Mic, StopCircle, Play, Volume2, Zap } from 'lucide-react';
import { speakMossy } from './mossyTts';

// Detect Electron API for robust TTS/STT fallback
const electronApi = (window.electronAPI || (window as any).electron?.api) ?? null;

interface VoiceCommand {
  phrase: string;
  action: () => void;
  description: string;
}

export const VoiceCommands: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Listen for backend TTS and STT events from Electron
    if (window.electron && window.electron.api) {
      // TTS: Play audio from backend
      const ttsHandler = (text: string) => {
        console.log('[VoiceCommands] TTS speaking:', text);
        // Note: This handler expects text, not audioUrl - may need to be updated
      };
      window.electronAPI.onTtsSpeak?.(ttsHandler);

      // STT: Final transcript from backend
      const sttHandler = (transcript: string) => {
        setTranscript(transcript);
        processCommand(transcript.toLowerCase());
      };
      window.electronAPI.onSttResult?.(sttHandler);

      // STT: Partial transcript streaming
      if (window.electronAPI.onSttPartial) {
        window.electronAPI.onSttPartial((partial: string) => {
          setTranscript(partial);
        });
      } else if ((window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.on('STT_PARTIAL', (_event: any, partial: string) => {
          setTranscript(partial);
        });
      }

      // Mic level streaming
      if (window.electronAPI.onMicLevel) {
        window.electronAPI.onMicLevel((level: number) => {
          setMicLevel(level);
        });
      } else if ((window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.on('MIC_LEVEL', (_event: any, level: number) => {
          setMicLevel(level);
        });
      }

      setRecognition('electron');
      return () => {
        // Cleanup listeners if needed
      };
    } else if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Browser fallback
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        if (event.results[current].isFinal) {
          processCommand(transcriptText.toLowerCase());
        }
      };
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
      setRecognition(recognitionInstance);
    }
  }, []);

  const commands: VoiceCommand[] = [
    {
      phrase: 'mossy analyze script',
      action: () => navigate('/script-analyzer'),
      description: 'Open Script Analyzer'
    },
    {
      phrase: 'mossy generate template',
      action: () => navigate('/template-generator'),
      description: 'Open Template Generator'
    },
    {
      phrase: 'mossy pack archive',
      action: () => navigate('/tools/ba2-manager'),
      description: 'Open BA2 Manager'
    },
    {
      phrase: 'mossy quick reference',
      action: () => navigate('/reference'),
      description: 'Open Quick Reference'
    },
    {
      phrase: 'mossy file watcher',
      action: () => navigate('/file-watcher'),
      description: 'Open File Watcher'
    },
    {
      phrase: 'mossy parse save',
      action: () => navigate('/save-parser'),
      description: 'Open Save Parser'
    },
    {
      phrase: 'mossy load order',
      action: () => navigate('/load-order'),
      description: 'Open Load Order Analyzer'
    },
    {
      phrase: 'mossy help',
      action: () => speak('I can help you with Fallout 4 modding. Just say Mossy followed by a command.'),
      description: 'Get help'
    }
  ];

  const processCommand = (text: string) => {
    const matchedCommand = commands.find(cmd => 
      text.includes(cmd.phrase.toLowerCase())
    );

    if (matchedCommand) {
      setLastCommand(matchedCommand.phrase);
      speak(`${matchedCommand.description}`);
      matchedCommand.action();
    }
  };

  const navigate = (route: string) => {
    window.location.hash = route;
  };

  const speak = (text: string) => {
    const normalized = (text ?? '').trim().toLowerCase();
    // Never speak UI/state labels.
    if (
      !normalized ||
      normalized === 'listening' ||
      normalized === 'listening...' ||
      normalized === "i'm listening." ||
      normalized === 'im listening.' ||
      normalized === 'ready' ||
      normalized === 'processing' ||
      normalized === 'processing...' ||
      normalized === 'processing vocal input' ||
      normalized === 'processing vocal input...' ||
      normalized === 'neural computation...' ||
      normalized === 'speaking...' ||
      normalized === 'disconnected'
    ) {
      return;
    }
    if (electronApi && electronApi.ttsSpeak) {
      electronApi.ttsSpeak(text);
    } else {
      void speakMossy(text, { cancelExisting: true });
    }
  };

  const startListening = () => {
    if (!enabled) return;
    if (recognition === 'electron' && electronApi) {
      electronApi.startListening();
      setListening(true);
    } else if (recognition && recognition.start) {
      recognition.start();
      setListening(true);
    }
  };

  const stopListening = () => {
    if (recognition === 'electron' && electronApi) {
      electronApi.stopListening();
      setListening(false);
    } else if (recognition && recognition.stop) {
      recognition.stop();
      setListening(false);
    }
  };

  const testCommand = (cmd: VoiceCommand) => {
    setLastCommand(cmd.phrase);
    speak(cmd.description);
    cmd.action();
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mic className="w-8 h-8 text-pink-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Voice Commands</h1>
              <p className="text-sm text-slate-400">Hands-free control for Mossy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300">Enabled</span>
            </label>
          </div>
        </div>

        {/* Listening Control */}
        <div className="flex gap-3">
          {!listening ? (
            <button
              onClick={startListening}
              disabled={!enabled || !recognition}
              className="flex-1 px-6 py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors"
            >
              <Mic className="w-6 h-6" />
              Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors animate-pulse"
            >
              <StopCircle className="w-6 h-6" />
              Stop Listening
            </button>
          )}
        </div>

        {/* Live Transcript */}
        {listening && (
          <div className="mt-4 p-4 bg-slate-900 border border-pink-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-xs font-bold text-pink-300 uppercase">Listening...</span>
              <span className="ml-2 text-xs text-pink-400">Mic Level: {micLevel.toFixed(0)}</span>
            </div>
            <p className="text-lg text-white font-mono">
              {transcript || 'Say "Mossy" followed by a command...'}
            </p>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Last command:</span>
              <span className="text-sm text-green-300 font-mono">{lastCommand}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Available Commands */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h3 className="font-bold text-white mb-4 text-xl">Available Voice Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commands.map((cmd, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-pink-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-mono text-pink-400 mb-1">&quot;{cmd.phrase}&quot;</div>
                      <div className="text-xs text-slate-400">{cmd.description}</div>
                    </div>
                    <button
                      onClick={() => testCommand(cmd)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                      title="Test command"
                    >
                      <Play className="w-3 h-3 text-slate-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Support Warning */}
          {!recognition && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6">
              <h4 className="font-bold text-amber-300 mb-2">Browser Not Supported</h4>
              <p className="text-sm text-slate-400">
                Voice commands require Chrome, Edge, or another Chromium-based browser with Web Speech API support.
              </p>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h3 className="font-bold text-white mb-3">How It Works</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>
                1. <span className="font-bold text-white">Click &quot;Start Listening&quot;</span> to activate voice recognition
              </p>
              <p>
                2. <span className="font-bold text-white">Say &quot;Mossy&quot;</span> to get Mossy&apos;s attention
              </p>
              <p>
                3. <span className="font-bold text-white">Follow with a command</span> like &quot;analyze script&quot; or &quot;load order&quot;
              </p>
              <p>
                4. <span className="font-bold text-white">Mossy will respond</span> and execute the action
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
            <h3 className="font-bold text-blue-300 mb-3">Tips for Best Results</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Use a good quality microphone</li>
              <li>• Minimize background noise</li>
              <li>• Always start with &quot;Mossy&quot; to activate commands</li>
              <li>• Wait for the green confirmation before speaking again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
