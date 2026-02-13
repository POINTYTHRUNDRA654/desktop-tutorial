const STORAGE_KEY = 'mossy_browser_tts_settings_v1';

export type BrowserTtsSettings = {
  enabled: boolean;
  /** Prefer a specific voice by name (substring match, case-insensitive). */
  preferredVoiceName?: string;
  rate: number;
  pitch: number;
  volume: number;
};

const DEFAULT_SETTINGS: BrowserTtsSettings = {
  enabled: true,
  preferredVoiceName: undefined,
  rate: 0.85,
  pitch: 1.0,
  volume: 0.85,
};

const UI_STATE_PHRASES = new Set([
  'listening',
  'listening...',
  "i'm listening.",
  'im listening.',
  'ready',
  'processing',
  'processing...',
  'processing vocal input',
  'processing vocal input...',
  'neural computation...',
  'speaking...',
  'disconnected',
]);

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function loadBrowserTtsSettings(): BrowserTtsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<BrowserTtsSettings>;
    const preferredVoiceName = typeof parsed.preferredVoiceName === 'string' ? parsed.preferredVoiceName.trim() : undefined;

    return {
      enabled: parsed.enabled !== false,
      preferredVoiceName: preferredVoiceName || undefined,
      rate: clamp(Number(parsed.rate ?? DEFAULT_SETTINGS.rate), 0.5, 2.0),
      pitch: clamp(Number(parsed.pitch ?? DEFAULT_SETTINGS.pitch), 0.0, 2.0),
      volume: clamp(Number(parsed.volume ?? DEFAULT_SETTINGS.volume), 0.0, 1.0),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveBrowserTtsSettings(next: BrowserTtsSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      enabled: !!next.enabled,
      preferredVoiceName: (next.preferredVoiceName ?? '').trim() || undefined,
      rate: clamp(next.rate, 0.5, 2.0),
      pitch: clamp(next.pitch, 0.0, 2.0),
      volume: clamp(next.volume, 0.0, 1.0),
    })
  );
}

export function ensureBrowserTtsSettingsStored(): BrowserTtsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return loadBrowserTtsSettings();
    const defaults = loadBrowserTtsSettings();
    saveBrowserTtsSettings(defaults);
    return defaults;
  } catch {
    return loadBrowserTtsSettings();
  }
}

export function getBrowserTtsVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined') return [];
  if (!('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

export function pickBrowserTtsVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoiceName?: string
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;

  const normalizedPreferred = (preferredVoiceName ?? '').trim().toLowerCase();
  const voiceIndex = voices.map(v => ({ v, n: (v.name || '').toLowerCase() }));

  if (normalizedPreferred) {
    const found = voiceIndex.find(({ n }) => n.includes(normalizedPreferred));
    if (found) return found.v;
  }

  // Heuristic: pick a "nicer" voice first if available.
  for (const keyword of ['zira', 'aria', 'jenny', 'salli', 'eva', 'joanna', 'female', 'woman', 'natural', 'online']) {
    const found = voiceIndex.find(({ n }) => n.includes(keyword));
    if (found) return found.v;
  }

  return voices[0];
}

export async function speakBrowserTts(
  text: string,
  opts?: {
    cancelExisting?: boolean;
    /** Override settings preferred voice name for this call only. */
    preferredVoiceName?: string;
  }
): Promise<void> {
  const cleaned = (text ?? '').replace(/[*#]/g, '').trim().substring(0, 700);
  const normalized = cleaned.toLowerCase();

  console.log('[TTS] speakBrowserTts called with text:', cleaned.substring(0, 50) + '...');

  if (!cleaned) {
    console.log('[TTS] Text is empty, skipping');
    return;
  }
  if (UI_STATE_PHRASES.has(normalized)) {
    console.log('[TTS] Text is UI state phrase, skipping');
    return;
  }

  if (typeof window === 'undefined') {
    console.log('[TTS] Window not available, skipping');
    return;
  }
  if (!('speechSynthesis' in window)) {
    console.log('[TTS] Speech synthesis not supported, skipping');
    return;
  }

  const settings = loadBrowserTtsSettings();
  console.log('[TTS] Browser TTS settings:', settings);
  if (!settings.enabled) {
    console.log('[TTS] TTS is disabled in settings, skipping');
    return;
  }

  if (opts?.cancelExisting) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  // Voices can load lazily; try to wait briefly for them.
  const pickVoiceFromCurrent = () => {
    const voices = getBrowserTtsVoices();
    console.log('[TTS] Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    const preferred = (opts?.preferredVoiceName ?? settings.preferredVoiceName);
    console.log('[TTS] Preferred voice name:', preferred);
    const selectedVoice = pickBrowserTtsVoice(voices, preferred);
    console.log('[TTS] Selected voice:', selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'none');
    return selectedVoice;
  };

  const attemptSpeak = (voice?: SpeechSynthesisVoice) =>
    new Promise<void>((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(cleaned);
        utter.rate = settings.rate;
        utter.pitch = settings.pitch;
        utter.volume = settings.volume;
        if (voice) utter.voice = voice;
        console.log('[TTS] Attempting to speak with voice:', voice ? voice.name : 'default');
        utter.onstart = () => {
          console.log('[TTS] Speech started successfully');
          resolve();
        };
        utter.onend = () => {
          console.log('[TTS] Speech ended');
          resolve();
        };
        utter.onerror = (event) => {
          console.error('[TTS] Speech error:', event.error);
          resolve();
        };
        window.speechSynthesis.speak(utter);
      } catch (error) {
        console.error('[TTS] Exception during speech:', error);
        resolve();
      }
    });

  const voiceNow = pickVoiceFromCurrent();
  if (voiceNow) {
    await attemptSpeak(voiceNow);
    return;
  }

  // If voices aren't ready yet, wait for either voiceschanged or a short timeout.
  await new Promise<void>((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      finish();
    };

    try {
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    } catch {
      // ignore
    }

    setTimeout(() => {
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      } catch {
        // ignore
      }
      finish();
    }, 250);
  });

  await attemptSpeak(pickVoiceFromCurrent());
}

export const BROWSER_TTS_STORAGE_KEY = STORAGE_KEY;
