

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
    const service = getVoiceService();
    await service.speak(text);
    opts?.onSuccess?.();
  } catch (err) {
    console.error('[mossyTts] speakMossy failed:', err);
    opts?.onError?.(err);
  }
}
