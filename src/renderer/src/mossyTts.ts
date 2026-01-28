import { speakBrowserTts } from './browserTts';

export type MossyTtsProvider = 'browser' | 'elevenlabs';

type ElevenLabsSynthesizeResponse =
  | { ok: true; audioBase64: string; mimeType?: string }
  | { ok: false; error: string };

type ElevenLabsStatusResponse =
  | { ok: true; configured: boolean; voiceId?: string; provider?: MossyTtsProvider }
  | { ok: false; error: string };

let cachedProvider: MossyTtsProvider | null = null;
let cachedElevenLabsVoiceId: string | null = null;
let settingsLoaded = false;
let settingsHooked = false;

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

async function refreshTtsConfigFromElectron(): Promise<void> {
  const api = getElectronApi();
  if (!api?.getSettings) {
    settingsLoaded = true;
    return;
  }

  try {
    const s = await api.getSettings();
    cachedProvider = (String(s?.ttsOutputProvider || '') as MossyTtsProvider) || 'browser';
    cachedElevenLabsVoiceId = String(s?.elevenLabsVoiceId || '').trim() || null;
  } catch {
    // ignore
  } finally {
    settingsLoaded = true;
  }
}

function hookSettingsUpdates(): void {
  if (settingsHooked) return;
  settingsHooked = true;

  const api = getElectronApi();
  if (!api?.onSettingsUpdated) return;

  try {
    api.onSettingsUpdated((s: any) => {
      cachedProvider = (String(s?.ttsOutputProvider || '') as MossyTtsProvider) || 'browser';
      cachedElevenLabsVoiceId = String(s?.elevenLabsVoiceId || '').trim() || null;
      settingsLoaded = true;
    });
  } catch {
    // ignore
  }
}

async function ensureConfig(): Promise<void> {
  hookSettingsUpdates();
  if (settingsLoaded) return;
  await refreshTtsConfigFromElectron();
}

let audioCtx: AudioContext | null = null;

async function playBase64Audio(base64Audio: string): Promise<void> {
  const cleaned = (base64Audio ?? '').trim();
  if (!cleaned) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }

  const buffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  await new Promise<void>((resolve) => {
    source.onended = () => {
      try { source.disconnect(); } catch { /* ignore */ }
      resolve();
    };
    try {
      source.start(0);
    } catch {
      resolve();
    }
  });
}

export async function getElevenLabsStatus(): Promise<ElevenLabsStatusResponse> {
  const api = getElectronApi();
  if (!api?.elevenLabsStatus) return { ok: false, error: 'elevenLabsStatus IPC not available' };
  try {
    return (await api.elevenLabsStatus()) as ElevenLabsStatusResponse;
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function speakMossy(
  text: string,
  opts?: {
    cancelExisting?: boolean;
  }
): Promise<void> {
  const api = getElectronApi();

  // Always keep browser speech queue tidy.
  if (opts?.cancelExisting) {
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  await ensureConfig();
  const provider: MossyTtsProvider = cachedProvider || 'browser';

  const elevenLabsFeatureEnabled = String((import.meta as any)?.env?.VITE_ENABLE_ELEVENLABS || '').toLowerCase() === 'true';

  if (provider !== 'elevenlabs' || !elevenLabsFeatureEnabled) {
    await speakBrowserTts(text, { cancelExisting: false });
    return;
  }

  // ElevenLabs path is always best-effort; fall back to browser TTS on any failure.
  const voiceId = cachedElevenLabsVoiceId || undefined;
  if (!api?.elevenLabsSynthesizeSpeech) {
    await speakBrowserTts(text, { cancelExisting: false });
    return;
  }

  try {
    const result = (await api.elevenLabsSynthesizeSpeech({ text, voiceId })) as ElevenLabsSynthesizeResponse;
    if (!result || result.ok !== true || !result.audioBase64) {
      await speakBrowserTts(text, { cancelExisting: false });
      return;
    }
    await playBase64Audio(result.audioBase64);
  } catch {
    await speakBrowserTts(text, { cancelExisting: false });
  }
}
