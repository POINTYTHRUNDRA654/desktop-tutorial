

import { VoiceService, VoiceServiceConfig } from './voice-service';

let voiceService: VoiceService | null = null;

function getVoiceService(): VoiceService {
  if (!voiceService) {
    const config: VoiceServiceConfig = {
      sttProvider: 'backend',
      ttsProvider: 'browser',
      elevenlabsKey: undefined,
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
      } catch {
        /* ignore */
      }
    }

    const service = getVoiceService();
    await service.speak(text);
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
