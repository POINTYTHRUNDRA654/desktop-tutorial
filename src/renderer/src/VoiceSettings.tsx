import React, { useEffect, useMemo, useState } from 'react';
import { Volume2, Save, Play, ExternalLink } from 'lucide-react';
import {
  BROWSER_TTS_STORAGE_KEY,
  getBrowserTtsVoices,
  loadBrowserTtsSettings,
  saveBrowserTtsSettings,
  speakBrowserTts,
  type BrowserTtsSettings,
} from './browserTts';
import { speakMossy, type MossyTtsProvider, getElevenLabsStatus } from './mossyTts';

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

const VoiceSettings: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<BrowserTtsSettings>(() => loadBrowserTtsSettings());
  const [testText, setTestText] = useState('Howdy. I\'m Mossy. Testing voice output.');

  const [ttsProvider, setTtsProvider] = useState<MossyTtsProvider>('browser');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [elevenLabsApiKeyInput, setElevenLabsApiKeyInput] = useState('');
  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [elevenLabsLoading, setElevenLabsLoading] = useState(false);
  const [elevenLabsError, setElevenLabsError] = useState<string | null>(null);

  // Feature flag: keep ElevenLabs completely optional (no keys required for normal use).
  // This flag is NOT a secret. It just controls UI exposure.
  const enableElevenLabsUi = String((import.meta as any)?.env?.VITE_ENABLE_ELEVENLABS || '').toLowerCase() === 'true';

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

  // Load Electron settings for provider/voiceId (and keep them in sync).
  useEffect(() => {
    const api = getElectronApi();
    if (!api?.getSettings) return;

    let disposed = false;
    const load = async () => {
      try {
        const s = await api.getSettings();
        if (disposed) return;
        setTtsProvider((String(s?.ttsOutputProvider || 'browser') as MossyTtsProvider) || 'browser');
        setElevenLabsVoiceId(String(s?.elevenLabsVoiceId || '').trim());
      } catch {
        // ignore
      }
    };

    void load();

    if (typeof api.onSettingsUpdated === 'function') {
      try {
        api.onSettingsUpdated((s: any) => {
          if (disposed) return;
          setTtsProvider((String(s?.ttsOutputProvider || 'browser') as MossyTtsProvider) || 'browser');
          setElevenLabsVoiceId(String(s?.elevenLabsVoiceId || '').trim());
        });
      } catch {
        // ignore
      }
    }

    return () => {
      disposed = true;
    };
  }, []);

  // Fetch whether ElevenLabs is configured (API key exists in main-process settings).
  useEffect(() => {
    if (!enableElevenLabsUi) return;
    let disposed = false;
    const run = async () => {
      const status = await getElevenLabsStatus();
      if (disposed) return;
      if (status.ok) setElevenLabsConfigured(Boolean(status.configured));
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [enableElevenLabsUi]);

  const onSave = async () => {
    saveBrowserTtsSettings(settings);

    const api = getElectronApi();
    if (api?.setSettings) {
      try {
        const payload: any = {
          // Always save provider, but keep ElevenLabs disabled by default unless the feature is enabled.
          ttsOutputProvider: enableElevenLabsUi ? ttsProvider : 'browser',
        };

        if (enableElevenLabsUi) {
          payload.elevenLabsVoiceId = elevenLabsVoiceId.trim();
          if (elevenLabsApiKeyInput.trim()) {
            payload.elevenLabsApiKey = elevenLabsApiKeyInput.trim();
          }
        }

        await api.setSettings(payload);

        // If we just saved a key, clear the input so it doesn't linger in the renderer.
        if (elevenLabsApiKeyInput.trim()) {
          setElevenLabsApiKeyInput('');
        }

        if (enableElevenLabsUi) {
          const status = await getElevenLabsStatus();
          if (status.ok) setElevenLabsConfigured(Boolean(status.configured));
        }
      } catch (e: any) {
        setElevenLabsError(String(e?.message || e));
      }
    }
  };

  const onTest = async () => {
    await speakBrowserTts(testText, { cancelExisting: true });
  };

  const onTestOutput = async () => {
    await speakMossy(testText, { cancelExisting: true });
  };

  const loadElevenLabsVoices = async () => {
    const api = getElectronApi();
    if (!api?.elevenLabsListVoices) {
      setElevenLabsError('ElevenLabs IPC not available (preload not updated?)');
      return;
    }

    setElevenLabsError(null);
    setElevenLabsLoading(true);
    try {
      const res = await api.elevenLabsListVoices();
      if (!res || res.ok !== true) {
        setElevenLabsError(res?.error || 'Failed to load ElevenLabs voices');
        setElevenLabsVoices([]);
        return;
      }

      const list = Array.isArray(res.voices) ? res.voices : [];
      setElevenLabsVoices(list.map((v: any) => ({ voice_id: String(v.voice_id || ''), name: String(v.name || '') })));
    } catch (e: any) {
      setElevenLabsError(String(e?.message || e));
      setElevenLabsVoices([]);
    } finally {
      setElevenLabsLoading(false);
    }
  };

  return (
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

        {enableElevenLabsUi && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
            <div className="text-xs font-black text-white uppercase tracking-widest mb-3">TTS Output Provider</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="ttsProvider"
                  value="browser"
                  checked={ttsProvider === 'browser'}
                  onChange={() => setTtsProvider('browser')}
                  className="w-4 h-4"
                />
                Browser (Windows voices)
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="ttsProvider"
                  value="elevenlabs"
                  checked={ttsProvider === 'elevenlabs'}
                  onChange={() => setTtsProvider('elevenlabs')}
                  className="w-4 h-4"
                />
                ElevenLabs (cloud voice)
              </label>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              Browser is always available. ElevenLabs is opt-in and automatically falls back to browser if misconfigured.
            </div>
          </div>
        )}

        {enableElevenLabsUi && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black text-white uppercase tracking-widest">ElevenLabs</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Store your API key in the desktop app settings (saved locally on your machine).
              </div>
            </div>
            <div className="text-[11px] font-bold">
              <span className={elevenLabsConfigured ? 'text-emerald-300' : 'text-amber-300'}>
                {elevenLabsConfigured ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs text-slate-300">
              API Key (paste once, then Save)
              <input
                value={elevenLabsApiKeyInput}
                onChange={(e) => setElevenLabsApiKeyInput(e.target.value)}
                placeholder={elevenLabsConfigured ? '(already saved — leave blank to keep)' : 'sk-...'}
                className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>

            <label className="text-xs text-slate-300">
              Voice ID
              <input
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={loadElevenLabsVoices}
              disabled={elevenLabsLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-600 text-slate-100 font-bold rounded-lg transition-colors"
              title="Fetch your available ElevenLabs voices"
            >
              {elevenLabsLoading ? 'Loading…' : 'Load Voices'}
            </button>

            {elevenLabsVoices.length > 0 && (
              <select
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                title="Pick a voice from your account"
              >
                <option value="">(Select voice)</option>
                {elevenLabsVoices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onTestOutput}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-lg flex items-center gap-2 transition-colors"
              title="Test using the currently selected output provider"
            >
              <Play className="w-4 h-4" />
              Test Output
            </button>
          </div>

          {elevenLabsError && (
            <div className="mt-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
              {elevenLabsError}
            </div>
          )}

          <div className="mt-3 text-[11px] text-slate-500">
            Security note: the app never returns your ElevenLabs key back to the UI after saving it.
          </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default VoiceSettings;
