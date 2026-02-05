// Global error overlay for fatal errors outside React
function showGlobalFatalErrorOverlay(message: string) {
  if (document.getElementById('fatal-error-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'fatal-error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(60,0,0,0.97)';
  overlay.style.color = '#fff';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.fontSize = '1.2rem';
  overlay.innerHTML = `<div style="max-width:600px;text-align:center;"><h2 style="color:#ffb4b4;">Fatal Error</h2><div style="margin:1em 0;white-space:pre-wrap;">${message}</div><button id="fatal-error-reload" style="margin-top:2em;padding:0.7em 2em;font-size:1rem;background:#222;color:#fff;border-radius:8px;border:none;cursor:pointer;">Reload</button></div>`;
  document.body.appendChild(overlay);
  document.getElementById('fatal-error-reload')?.addEventListener('click', () => window.location.reload());
}

// Attach global error handlers once
if (typeof window !== 'undefined' && !(window as any).__voiceSettingsGlobalErrorHandler) {
  // Temporarily disabled global error handlers for debugging
  /*
  window.onerror = function (msg, src, line, col, err) {
    showGlobalFatalErrorOverlay(`JS Error: ${msg}\n${src}:${line}:${col}\n${err ? err.stack || err : ''}`);
    return true;
  };
  window.onunhandledrejection = function (event) {
    showGlobalFatalErrorOverlay(`Unhandled Promise Rejection:\n${event.reason ? (event.reason.stack || event.reason) : ''}`);
    return true;
  };
  */
  (window as any).__voiceSettingsGlobalErrorHandler = true;
}
import React, { useEffect, useMemo, useState } from 'react';
import { Volume2, Save, ExternalLink, Play, Mic, MicOff } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import { VoiceService, VoiceServiceConfig } from './voice-service';
import {
  BROWSER_TTS_STORAGE_KEY,
  getBrowserTtsVoices,
  loadBrowserTtsSettings,
  saveBrowserTtsSettings,
  speakBrowserTts,
  type BrowserTtsSettings,
} from './browserTts';


function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

const VoiceSettings: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<BrowserTtsSettings>(() => loadBrowserTtsSettings());
  const [testText, setTestText] = useState("Howdy. I'm Mossy. Testing voice output.");
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestResult, setMicTestResult] = useState('');
  const [micError, setMicError] = useState('');



  // Keep voices list updated.
  useEffect(() => {
    const refresh = () => setVoices(getBrowserTtsVoices());
    refresh();

    if (!('speechSynthesis' in window)) return;

    const handler = () => refresh();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    } catch {
      // ignore
    }

    // Some engines populate voices after a short delay.
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

  // Sync if localStorage changed in another tab/window.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BROWSER_TTS_STORAGE_KEY) {
        setSettings(loadBrowserTtsSettings());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const sortedVoices = useMemo(() => {
    const copy = [...voices];
    copy.sort((a, b) => (a.lang || '').localeCompare(b.lang || '') || (a.name || '').localeCompare(b.name || ''));
    return copy;
  }, [voices]);

  const openWindowsSpeechSettings = async () => {
    try {
      const api = getElectronApi();
      if (api?.openExternal) {
        // Windows Settings deep link. If it fails, it will simply no-op.
        await api.openExternal('ms-settings:speech');
      }
    } catch {
      // ignore
    }
  };




  const onSave = async () => {
    saveBrowserTtsSettings(settings);
  };

  const onTest = async () => {
    console.log('[VoiceSettings] onTest clicked, calling speakBrowserTts');
    await speakBrowserTts(testText, { cancelExisting: true });
  };

  const onTestMic = async () => {
    console.log('[VoiceSettings] onTestMic clicked');
    setIsTestingMic(true);
    setMicTestResult('');
    setMicError('');
    
    try {
      // Create voice service for testing (same config as LiveContext)
      const config: VoiceServiceConfig = {
        sttProvider: 'backend', // Use backend first, fallback to browser
        ttsProvider: 'browser',
        deepgramKey: undefined,
        elevenlabsKey: undefined,
      };
      
      const voiceService = new VoiceService(config);
      await voiceService.initialize();
      
      // Set up transcription handler
      const handleTranscription = (text: string) => {
        console.log('[VoiceSettings] Transcribed:', text);
        setMicTestResult(`Transcribed: "${text.trim()}"`);
        setIsTestingMic(false);
        voiceService.stopListening();
      };
      
      const handleError = (error: string) => {
        console.error('[VoiceSettings] Voice service error:', error);
        setMicError(`Test failed: ${error}`);
        setIsTestingMic(false);
      };
      
      const handleModeChange = (mode: string) => {
        console.log('[VoiceSettings] Mode changed to:', mode);
      };
      
      // Start listening
      voiceService.startListening(handleTranscription, handleError, handleModeChange);
      setMicTestResult('Listening... (speak now)');
      
      // Stop after 5 seconds if no result
      setTimeout(() => {
        if (isTestingMic) {
          voiceService.stopListening();
          setMicTestResult('Test completed (no speech detected)');
          setIsTestingMic(false);
        }
      }, 5000);
      
    } catch (error: any) {
      console.error('[VoiceSettings] Mic test error:', error);
      setMicError(`Test failed: ${error.message || 'Unknown error'}`);
      setIsTestingMic(false);
    }
  };




    return (
      <ErrorBoundary>
        <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Voice Settings</h1>
              <p className="text-sm text-slate-400">Choose the browser TTS voice for Mossy responses.</p>
            </div>
          </div>

          <button
            onClick={onSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            title="Save voice settings"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Browser TTS settings only. All cloud TTS and context menu code removed. */}
        {'speechSynthesis' in window && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black text-white uppercase tracking-widest">Detected Voices</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {voices.length} voice{voices.length === 1 ? '' : 's'} available to this app.
                </div>
              </div>

              {typeof (window as any)?.electron?.api?.openExternal === 'function' && (
                <button
                  onClick={openWindowsSpeechSettings}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-lg flex items-center gap-2 transition-colors"
                  title="Open Windows Speech settings"
                >
                  <ExternalLink className="w-4 h-4" />
                  Speech Settings
                </button>
              )}
            </div>

            {voices.length <= 1 && (
              <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm">
                <div className="font-black uppercase tracking-widest text-[11px]">Why it sounds the same everywhere</div>
                <div className="mt-2 text-[12px] text-amber-200/90">
                  This app uses your system’s built-in voices. If Windows only has 1 voice installed, every feature that speaks will sound identical.
                  To get a more natural voice or different accent, install additional Windows voices (then restart the app).
                </div>
                <div className="mt-2 text-[12px] text-amber-200/90">
                  Windows: Settings → Time & language → Speech → Manage voices / Add voices.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black text-white uppercase tracking-widest">Enable TTS</div>
              <div className="text-[11px] text-slate-400 mt-1">
                If Mossy sounds robotic, try selecting a different voice (often “Aria”, “Zira”, “Natural”, or “Online”).
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              Enabled
            </label>
          </div>
        </div>


        {/* Cloud TTS and ElevenLabs UI removed: browser TTS only */}

        <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="text-xs font-black text-white uppercase tracking-widest mb-3">Preferred Voice</div>

          {!('speechSynthesis' in window) ? (
            <div className="text-sm text-amber-300">Your environment doesn’t expose browser TTS (speechSynthesis).</div>
          ) : (
            <>
              <select
                value={settings.preferredVoiceName ?? ''}
                onChange={(e) => setSettings(s => ({ ...s, preferredVoiceName: e.target.value || undefined }))}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="">(Auto)</option>
                {sortedVoices.map((v) => (
                  <option key={`${v.name}-${v.lang}-${String((v as any).voiceURI ?? '')}`} value={v.name}>
                    {v.name} {v.lang ? `(${v.lang})` : ''}
                  </option>
                ))}
              </select>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="text-xs text-slate-300">
                  Rate
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={settings.rate}
                    onChange={(e) => setSettings(s => ({ ...s, rate: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-slate-500">{settings.rate.toFixed(2)}</div>
                </label>

                <label className="text-xs text-slate-300">
                  Pitch
                  <input
                    type="range"
                    min={0.0}
                    max={2.0}
                    step={0.05}
                    value={settings.pitch}
                    onChange={(e) => setSettings(s => ({ ...s, pitch: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-slate-500">{settings.pitch.toFixed(2)}</div>
                </label>

                <label className="text-xs text-slate-300">
                  Volume
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={settings.volume}
                    onChange={(e) => setSettings(s => ({ ...s, volume: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-slate-500">{settings.volume.toFixed(2)}</div>
                </label>
              </div>

              <div className="mt-4">
                <div className="text-xs font-black text-white uppercase tracking-widest mb-2">Test</div>
                <div className="flex gap-3">
                  <input
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                  <button
                    onClick={onTest}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-lg flex items-center gap-2 transition-colors"
                    title="Play test phrase"
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Tip: If voices list is empty, wait a second and reopen this page.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Microphone Test Section */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="text-xs font-black text-white uppercase tracking-widest mb-3">Microphone Test</div>
          
          <div className="flex gap-3 mb-3">
            <button
              onClick={onTestMic}
              disabled={isTestingMic}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
              title="Test microphone input"
            >
              {isTestingMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isTestingMic ? 'Testing...' : 'Test Mic'}
            </button>
          </div>

          {micTestResult && (
            <div className="text-sm text-green-300 mb-2">
              {micTestResult}
            </div>
          )}

          {micError && (
            <div className="text-sm text-red-300 mb-2">
              {micError}
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            Click "Test Mic" and speak. The app should detect and transcribe your speech.
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default VoiceSettings;
