

import { VoiceService, VoiceServiceConfig } from './voice-service';

let voiceService: VoiceService | null = null;
let isSpeechPaused = false;

function getVoiceService(): VoiceService {
  if (!voiceService) {
    const config: VoiceServiceConfig = {
      sttProvider: 'backend',
      ttsProvider: 'browser',
    };
    voiceService = new VoiceService(config);
    voiceService.initialize().catch(console.error);
  }
  return voiceService;
}

export async function speakMossy(
  text: string,
  opts?: {
    cancelExisting?: boolean;
    onError?: (err: any) => void;
    onSuccess?: () => void;
    silent?: boolean;
    voice?: string;
    rate?: string;
    pitch?: string;
  }
): Promise<void> {
  try {
    // Honor caller intent to cancel any currently-playing TTS first.
    if (opts?.cancelExisting && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        isSpeechPaused = false;
      } catch {
        /* ignore */
      }
    }

    const service = getVoiceService();
    await service.speak(text);
    isSpeechPaused = false;
    opts?.onSuccess?.();
  } catch (err: any) {
    // Treat explicit user/agent cancellations as non-fatal (they are expected behavior).
    const message = err?.message ?? String(err ?? '');
    if (
      message.includes('TTS error: canceled') ||
      /canceled/i.test(message) ||
      message.includes('TTS error: interrupted') ||
      /interrupted/i.test(message)
    ) {
      console.debug('[mossyTts] speakMossy canceled/interrupted - ignoring');
      return;
    }

    console.error('[mossyTts] speakMossy failed:', err);
    opts?.onError?.(err);
  }
}

/**
 * Pause Mossy's speech output.
 * Can be resumed with resumeMossySpeech().
 */
export function pauseMossySpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const wasSpeaking = window.speechSynthesis.speaking;
      const wasPending = window.speechSynthesis.pending;
      const alreadyPaused = window.speechSynthesis.paused;

      if (!alreadyPaused && (wasSpeaking || wasPending)) {
        window.speechSynthesis.pause();
        isSpeechPaused = true;
        console.log('[mossyTts] Speech paused (was speaking:', wasSpeaking, ', was pending:', wasPending, ')');
      } else if (alreadyPaused) {
        console.log('[mossyTts] Speech already paused');
      } else {
        console.log('[mossyTts] No active speech to pause (speaking:', wasSpeaking, ', pending:', wasPending, ')');
      }
    } catch (err) {
      console.error('[mossyTts] Error pausing speech:', err);
    }
  } else {
    console.warn('[mossyTts] speechSynthesis not available');
  }
}

/**
 * Resume Mossy's paused speech output.
 * This is a no-op if speech is not currently paused.
 */
export function resumeMossySpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const isPaused = window.speechSynthesis.paused;
      const isSpeaking = window.speechSynthesis.speaking;

      if (isPaused) {
        window.speechSynthesis.resume();
        isSpeechPaused = false;
        console.log('[mossyTts] Speech resumed (was paused, now speaking:', window.speechSynthesis.speaking, ')');
      } else if (isSpeaking) {
        console.log('[mossyTts] Speech already playing');
      } else {
        console.log('[mossyTts] No paused speech to resume');
      }
    } catch (err) {
      console.error('[mossyTts] Error resuming speech:', err);
    }
  } else {
    console.warn('[mossyTts] speechSynthesis not available');
  }
}

/**
 * Check if Mossy's speech is currently paused.
 */
export function isMossySpeechPaused(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.paused || isSpeechPaused;
  }
  return false;
}

/**
 * Stop Mossy's speech output completely (cannot resume).
 * Calls both the shared speechSynthesis cancel AND the VoiceService stopSpeaking()
 * so that all TTS paths (browser, cloud) are reliably stopped.
 */
export function stopMossySpeech(): void {
  // Also stop via VoiceService (handles audio elements and internal state).
  if (voiceService) {
    try {
      voiceService.stopSpeaking();
    } catch (err) {
      // Non-critical: VoiceService stop failed; speechSynthesis cancel below will still attempt to halt audio.
      console.warn('[mossyTts] VoiceService.stopSpeaking() failed — will still attempt speechSynthesis.cancel():', err);
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      // Use pause() before cancel() to work around an Electron/Chromium bug where
      // cancel() alone sometimes fails to fire utterance.onerror, leaving audio
      // still playing despite the cancel call.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.pause();
      }
      window.speechSynthesis.cancel();
      isSpeechPaused = false;
      console.debug('[mossyTts] Speech stopped');
    } catch (err) {
      console.error('[mossyTts] Error stopping speech:', err);
    }
  }
}

