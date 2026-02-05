

import { speakBrowserTts } from './browserTts';

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
  await speakBrowserTts(text, opts);
}
