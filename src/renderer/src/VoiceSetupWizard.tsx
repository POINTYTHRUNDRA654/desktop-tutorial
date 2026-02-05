import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Key, ArrowDownToLine, CheckCircle, AlertTriangle, Settings, Play, Cpu, Wifi, WifiOff } from 'lucide-react';

interface VoiceRequirement {
  id: string;
  name: string;
  description: string;
  status: 'checking' | 'ok' | 'missing' | 'error';
  canAutoFix: boolean;
  fixAction?: () => Promise<void>;
  details?: string;
}

interface VoiceSetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const VoiceSetupWizard: React.FC<VoiceSetupWizardProps> = ({ onComplete, onSkip }) => {
  const [requirements, setRequirements] = useState<VoiceRequirement[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [currentFixing, setCurrentFixing] = useState<string | null>(null);

  const getElectronApi = () => {
    return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
  };

  useEffect(() => {
    checkVoiceRequirements();
  }, []);

  const checkVoiceRequirements = async () => {
    setIsChecking(true);
    const api = getElectronApi();

    const reqs: VoiceRequirement[] = [
      {
        id: 'api-keys',
        name: 'AI API Keys',
        description: 'Groq or OpenAI API keys for AI responses',
        status: 'checking',
        canAutoFix: false,
        details: 'Required for Mossy to generate responses. Configure in Settings → API Keys.'
      },
      {
        id: 'ollama',
        name: 'Ollama (Local AI)',
        description: 'Local AI models for private conversations',
        status: 'checking',
        canAutoFix: true,
        details: 'Optional but recommended for privacy. Mossy can download models automatically.'
      },
      {
        id: 'tts-voices',
        name: 'Text-to-Speech Voices',
        description: 'Browser voices for Mossy to speak',
        status: 'checking',
        canAutoFix: false,
        details: 'Uses your system voices. Some systems may need voice packs installed.'
      },
      {
        id: 'microphone',
        name: 'Microphone Access',
        description: 'Permission to hear your voice',
        status: 'checking',
        canAutoFix: false,
        details: 'Browser permission required. Grant when prompted.'
      },
      {
        id: 'voice-settings',
        name: 'Voice Settings',
        description: 'Voice preferences and configuration',
        status: 'checking',
        canAutoFix: true,
        details: 'Mossy can configure optimal voice settings automatically.'
      }
    ];

    setRequirements(reqs);

    // Check API keys
    try {
      const hasGroq = process.env.GROQ_API_KEY || (await api?.getSettings())?.groqApiKey;
      const hasOpenAI = process.env.OPENAI_API_KEY || (await api?.getSettings())?.openaiApiKey;
      reqs[0].status = (hasGroq || hasOpenAI) ? 'ok' : 'missing';
    } catch {
      reqs[0].status = 'error';
    }

    // Check Ollama
    try {
      const ollamaStatus = await api?.checkOllamaStatus?.();
      if (ollamaStatus?.installed) {
        const models = await api?.listOllamaModels?.();
        reqs[1].status = models?.length > 0 ? 'ok' : 'missing';
        reqs[1].fixAction = async () => {
          setCurrentFixing('ollama');
          try {
            await api?.pullOllamaModel?.('llama3.1:8b');
            reqs[1].status = 'ok';
            setRequirements([...reqs]);
          } catch (error) {
            reqs[1].status = 'error';
            reqs[1].details = `Failed to download model: ${error}`;
            setRequirements([...reqs]);
          }
          setCurrentFixing(null);
        };
      } else {
        reqs[1].status = 'missing';
        reqs[1].canAutoFix = false;
        reqs[1].details = 'Ollama not installed. Download from https://ollama.ai';
      }
    } catch {
      reqs[1].status = 'missing';
      reqs[1].canAutoFix = false;
    }

    // Check TTS voices
    try {
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        // Wait a bit for voices to load
        await new Promise(resolve => setTimeout(resolve, 100));
        const availableVoices = speechSynthesis.getVoices();
        reqs[2].status = availableVoices.length > 0 ? 'ok' : 'missing';
        if (availableVoices.length === 0) {
          reqs[2].details = 'No voices available. Try refreshing or installing voice packs.';
        }
      } else {
        reqs[2].status = 'error';
        reqs[2].details = 'Speech synthesis not supported in this browser.';
      }
    } catch {
      reqs[2].status = 'error';
    }

    // Check microphone
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      reqs[3].status = result.state === 'granted' ? 'ok' : result.state === 'denied' ? 'error' : 'missing';
      if (result.state === 'prompt') {
        reqs[3].details = 'Will prompt for permission when you first use voice.';
      }
    } catch {
      // Permissions API not supported, try getUserMedia
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        reqs[3].status = 'ok';
      } catch {
        reqs[3].status = 'missing';
      }
    }

    // Check voice settings
    const voiceEnabled = localStorage.getItem('mossy_voice_enabled') === 'true';
    const preferredVoice = localStorage.getItem('mossy_preferred_voice');
    reqs[4].status = voiceEnabled && preferredVoice ? 'ok' : 'missing';
    reqs[4].fixAction = async () => {
      setCurrentFixing('voice-settings');
      localStorage.setItem('mossy_voice_enabled', 'true');

      // Find best voice
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        const preferred = englishVoices.find(v => v.name.includes('Linda') && v.name.includes('Canada')) ||
                         englishVoices.find(v => v.name.includes('Linda')) ||
                         englishVoices.find(v => v.name.includes('Zira')) ||
                         englishVoices[0];

        if (preferred) {
          localStorage.setItem('mossy_preferred_voice', preferred.name);
        }
      }

      reqs[4].status = 'ok';
      setRequirements([...reqs]);
      setCurrentFixing(null);
    };

    setRequirements(reqs);
    setIsChecking(false);
  };

  const handleFix = async (req: VoiceRequirement) => {
    if (req.fixAction) {
      await req.fixAction();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'missing': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'missing': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const allOk = requirements.every(r => r.status === 'ok');
  const hasIssues = requirements.some(r => r.status === 'missing' || r.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Volume2 className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h1 className="text-3xl font-bold text-white mb-2">Voice Setup</h1>
          <p className="text-slate-300">
            Let's make sure Mossy can talk to you! We'll check your voice setup and fix any issues.
          </p>
        </div>

        {isChecking ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300">Checking voice requirements...</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {requirements.map((req) => (
              <div key={req.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(req.status)}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${getStatusColor(req.status)}`}>
                      {req.name}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">{req.description}</p>
                    {req.details && (
                      <p className="text-slate-400 text-xs mb-3">{req.details}</p>
                    )}

                    {req.status === 'missing' && req.canAutoFix && (
                      <button
                        onClick={() => handleFix(req)}
                        disabled={currentFixing === req.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        {currentFixing === req.id ? 'Fixing...' : 'Auto Fix'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onSkip}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={onComplete}
            disabled={!allOk && hasIssues}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors"
          >
            {allOk ? 'Continue' : 'Continue (Some Issues)'}
          </button>
        </div>

        {!allOk && (
          <p className="text-slate-400 text-sm text-center mt-4">
            You can still use Mossy without voice features, but full conversations require all components.
          </p>
        )}
      </div>
    </div>
  );
};