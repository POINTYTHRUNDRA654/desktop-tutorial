import { loadBrowserTtsSettings, pickBrowserTtsVoice } from './browserTts';

export interface VoiceServiceConfig {
  sttProvider: 'browser' | 'backend';
  ttsProvider: 'browser' | 'elevenlabs' | 'cloud';
  elevenlabsKey?: string;
  elevenlabsVoiceId?: string;
}

// Declare SpeechRecognition for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export class VoiceService {
  private config: VoiceServiceConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private activeStream: MediaStream | null = null;
  private recognition: SpeechRecognition | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isListening = false;
  private shouldStop = false;
  private isBrowserSttActive = false;
  private isBrowserSttStarting = false;
  private isUsingBrowserStt = false;
  /**
   * True while TTS is actively playing. Used to pause microphone recording
   * during speech playback and prevent the audio feedback loop where Mossy
   * hears and transcribes her own voice.
   */
  private isSpeaking = false;
  private onTranscription?: (text: string, sessionId?: number) => void;
  private onError?: (error: string) => void;
  private onModeChange?: (mode: 'idle' | 'listening' | 'processing' | 'speaking') => void;
  private sttResultUnsubscribe?: () => void;
  private currentSessionId = 0;
  private currentAudioElement: HTMLAudioElement | null = null;

  constructor(config: VoiceServiceConfig) {
    // Hard-lock to browser TTS for stability across updates.
    this.config = { ...config, ttsProvider: 'browser' };
  }

  async initialize(): Promise<void> {
    // Get available audio inputs
    try {
      console.log('[VoiceService] Enumerating audio devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('[VoiceService] Available audio inputs:', audioInputs);
    } catch (error) {
      console.error('[VoiceService] Could not enumerate audio devices:', error);
    }
  }

  startListening(onTranscription: (text: string, sessionId?: number) => void, onError: (error: string) => void, onModeChange: (mode: string) => void): void {
    console.log('[VoiceService] startListening() called, current state:', { isListening: this.isListening, shouldStop: this.shouldStop, isRecording: this.isRecording });
    this.shouldStop = false;
    this.isListening = true;
    this.currentSessionId++;
    console.log('[VoiceService] Set shouldStop to false and isListening to true, new state:', { isListening: this.isListening, shouldStop: this.shouldStop, isRecording: this.isRecording, sessionId: this.currentSessionId });
    this.onTranscription = onTranscription;
    this.onError = onError;
    this.onModeChange = onModeChange;

    if (this.config.sttProvider === 'browser') {
      this.startBrowserSTT();
    } else if (this.config.sttProvider === 'backend') {
      this.startBackendSTT();
    }
  }

  stopListening(): void {
    console.log('[VoiceService] stopListening() called, current state:', { isListening: this.isListening, shouldStop: this.shouldStop, isRecording: this.isRecording });
    this.isListening = false;
    this.shouldStop = true;
    this.isSpeaking = false;
    this.isUsingBrowserStt = false;
    this.isBrowserSttActive = false;
    this.isBrowserSttStarting = false;
    
    // Stop all speech
    this.stopAllSpeech();

    // Stop current recording
    const currentRecorder = this.mediaRecorder;
    if (currentRecorder && this.isRecording) {
      console.log('[VoiceService] Stopping current MediaRecorder');
      try {
        currentRecorder.stop();
      } catch (e) {
        console.warn('[VoiceService] Error stopping recorder:', e);
      }
    }
    
    // Stop any media streams (even if recorder not created yet)
    if (this.activeStream) {
      console.log('[VoiceService] Closing active media stream tracks');
      this.activeStream.getTracks().forEach(track => {
        track.stop();
      });
      this.activeStream = null;
    }
    
    // Clear the reference after cleanup
    this.mediaRecorder = null;
    this.audioChunks = []; // Clear any pending audio chunks
    this.isRecording = false;
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    const api = (window as any).electronAPI || (window as any).electron?.api;
    if (api?.sttStop) {
      api.sttStop().catch(console.error);
    }
    if (this.sttResultUnsubscribe) {
      this.sttResultUnsubscribe();
      this.sttResultUnsubscribe = undefined;
    }
    console.log('[VoiceService] stopListening() completed');
  }

  private stopAllSpeech(): void {
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Stop ElevenLabs/URL audio
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.src = "";
      this.currentAudioElement = null;
    }
  }

  private async startBrowserSTT(): Promise<void> {
    if (this.isBrowserSttActive || this.isBrowserSttStarting) {
      console.log('[VoiceService] Browser STT already active, skipping start');
      return;
    }
    console.log('[VoiceService] Starting browser STT...');
    this.isListening = true;
    this.isUsingBrowserStt = true;

    // Check if browser SpeechRecognition is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.onError?.('Browser speech recognition not supported. Please use a modern browser like Chrome or Edge.');
      return;
    }

    try {
      this.isBrowserSttStarting = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US'; // Default to English, could be made configurable

      this.recognition.onstart = () => {
        console.log('[VoiceService] Browser STT started');
        this.isBrowserSttActive = true;
        this.isBrowserSttStarting = false;
        this.onModeChange?.('listening');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          console.log('[VoiceService] Browser STT result:', transcript);
          this.onTranscription?.(transcript, this.currentSessionId);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[VoiceService] Browser STT error:', event.error, event.message);
        this.isBrowserSttActive = false;
        this.isBrowserSttStarting = false;
        if (!this.shouldStop) {
          this.onError?.(`Speech recognition error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        console.log('[VoiceService] Browser STT ended');
        this.isBrowserSttActive = false;
        this.isBrowserSttStarting = false;
        this.onModeChange?.('idle');
        // Auto-restart for continuous listening if still active
        if (this.isListening && !this.shouldStop && this.isUsingBrowserStt) {
          setTimeout(() => {
            if (this.recognition && this.isListening && !this.shouldStop && !this.isBrowserSttActive && !this.isBrowserSttStarting) {
              this.recognition.start();
            }
          }, 1000);
        }
      };

      // Start recognition
      this.recognition.start();
    } catch (error: any) {
      console.error('[VoiceService] Failed to start browser STT:', error);
      this.isBrowserSttActive = false;
      this.isBrowserSttStarting = false;
      this.onError?.(`Failed to start speech recognition: ${error.message}`);
    }
  }

  private startBackendSTT(): void {
    console.log('[VoiceService] startBackendSTT() called');
    this.isListening = true;
    this.isUsingBrowserStt = false;
    this.startRecording();
  }

  private async startRecording(): Promise<void> {
    console.log('[VoiceService] startRecording() called, isRecording:', this.isRecording, 'shouldStop:', this.shouldStop);
    if (this.isRecording) {
      console.log('[VoiceService] Already recording, skipping');
      return;
    }

    // Check if we should stop before starting new recording
    if (this.shouldStop) {
      console.log('[VoiceService] Should stop, not starting new recording');
      return;
    }

    try {
      console.log('[VoiceService] Getting user media...');
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // CRITICAL: Check if service was stopped while waiting for getUserMedia
      if (this.shouldStop) {
        console.log('[VoiceService] Service stopped during getUserMedia, cleaning up stream');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      this.activeStream = stream;

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = []; // Clear any leftover chunks
      this.isRecording = true;

      console.log(`[VoiceService] Created MediaRecorder for session ${this.currentSessionId}, setting up event handlers...`);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log(`[VoiceService] MediaRecorder onstop fired for session ${this.currentSessionId}, isRecording: ${this.isRecording}, shouldStop: ${this.shouldStop}, isSpeaking: ${this.isSpeaking}`);
        this.isRecording = false;
        
        // Clean up current stream tracks
        if (this.activeStream === stream) {
          this.activeStream.getTracks().forEach(track => track.stop());
          this.activeStream = null;
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Check if we should stop processing (disconnect was called)
        if (this.shouldStop) {
          console.log('[VoiceService] Skipping transcription - service stopped');
          return;
        }

        // If TTS is active, this recording was stopped to prevent audio feedback.
        // Discard the audio chunks and restart listening after TTS completes.
        if (this.isSpeaking) {
          console.log('[VoiceService] Skipping transcription - TTS is speaking (audio feedback prevention)');
          this.audioChunks = [];
          return;
        }
        
        if (this.audioChunks.length > 0) {
          // Combine audio chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          console.log(`[VoiceService] Audio blob size: ${audioBlob.size} bytes, chunks: ${this.audioChunks.length}`);
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          try {
            // Send to backend for transcription
            const api = (window as any).electronAPI || (window as any).electron?.api;
            if (!api?.transcribeAudio) {
              console.error('Transcription API not available');
              this.onError?.('Speech recognition not available. Please check your configuration.');
              return;
            }

            const result = await api.transcribeAudio(arrayBuffer, 'audio/webm');
            console.log(`[VoiceService] Transcription result:`, result);
            
            // Final check on shouldStop before triggering callback
            if (this.shouldStop) return;

            if (result && result.success && result.text) {
              // Pass session ID with transcription
              this.onTranscription?.(result.text.trim(), this.currentSessionId);
            } else {
              const errorMsg = result?.error || 'Unknown transcription error';
              console.warn('Backend transcription failed:', errorMsg);
              throw new Error(errorMsg); // Re-throw to trigger fallback
            }
          } catch (error: any) {
            console.error('Transcription error:', error);

            if (!this.shouldStop) {
              this.onError?.(`Speech recognition failed: ${error?.message || 'Unknown error'}`);
            }
          }
        }

        // Auto-restart for continuous listening (increased delay for stability).
        // Do NOT restart while TTS is playing — speak() will restart after it completes.
        if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isSpeaking) {
          setTimeout(() => {
            // Re-check all conditions when timeout fires, not just when scheduling
            // This prevents race conditions with TTS starting between scheduling and firing
            if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isSpeaking && !this.isRecording) {
              console.log('[VoiceService] Auto-restart: restarting recording after successful transcription');
              this.startRecording();
            } else {
              console.log('[VoiceService] Auto-restart: skipping restart', {
                isListening: this.isListening,
                shouldStop: this.shouldStop,
                isUsingBrowserStt: this.isUsingBrowserStt,
                isSpeaking: this.isSpeaking,
                isRecording: this.isRecording
              });
            }
          }, 1000);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        if (!this.shouldStop) {
          this.onError?.('Audio recording failed. Please check your microphone and try again.');
        }
        this.isRecording = false;
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      console.log('[VoiceService] Starting MediaRecorder...');
      this.mediaRecorder.start();
      console.log('[VoiceService] MediaRecorder started successfully');
      this.onModeChange?.('listening');
      
      // Set up silence detection to stop recording
      let silenceTimer: NodeJS.Timeout | undefined;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkSilence = () => {
        if (!this.isRecording || this.shouldStop) {
          if (silenceTimer) clearTimeout(silenceTimer);
          audioContext.close();
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average < 10) { // Silence threshold
          if (!silenceTimer) {
            silenceTimer = setTimeout(() => {
              if (this.mediaRecorder && this.isRecording && !this.shouldStop) {
                this.mediaRecorder.stop();
              }
            }, 1500); // Stop after 1.5 seconds of silence
          }
        } else {
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = undefined;
          }
        }
        
        requestAnimationFrame(checkSilence);
      };
      
      checkSilence();

    } catch (error) {
      console.error('Failed to start audio recording:', error);
      if (!this.shouldStop) {
        this.onError?.('Could not access microphone. Please check permissions and try again.');
      }
    }
  }

  async speak(text: string): Promise<void> {
    console.log('[VoiceService] speak() called with text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    if (this.shouldStop) {
      console.log('[VoiceService] Ignoring speak request, service stopped');
      return;
    }

    // ── Pause microphone while TTS is speaking (prevent audio feedback loop) ──
    // Stop any active recording so Mossy's own voice is not transcribed and fed
    // back to the AI, causing an infinite "keep talking" loop.
    this.isSpeaking = true;
    if (this.isRecording && this.mediaRecorder) {
      console.log('[VoiceService] Pausing microphone for TTS playback');
      this.audioChunks = []; // Discard any audio captured before speak was called
      try { this.mediaRecorder.stop(); } catch (e) { console.warn('[VoiceService] Could not stop MediaRecorder for TTS:', e); }
    }

    try {
      if (this.config.ttsProvider === 'browser') {
        console.log('[VoiceService] Using browser TTS provider');
        return await this.speakBrowser(text);
      } else if (this.config.ttsProvider === 'elevenlabs') {
        console.log('[VoiceService] Using ElevenLabs TTS provider');
        return await this.speakElevenLabs(text);
      } else if (this.config.ttsProvider === 'cloud') {
        console.log('[VoiceService] Using cloud TTS provider (main process)');
        if (!('electron' in window) || !window.electron?.api?.ttsSpeak || !window.electron?.api?.onTtsSpeak) {
          console.warn('[VoiceService] Cloud TTS not available, falling back to browser TTS');
          return await this.speakBrowser(text);
        }
        return await this.speakCloud(text);
      }
    } finally {
      // ── Resume microphone after TTS ──────────────────────────────────────────
      this.isSpeaking = false;
      this.audioChunks = []; // Discard any audio chunks that may have accumulated
      // Restart recording if we were in a listening session, giving a short delay
      // so any acoustic echo from the speaker has time to decay.
      if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt) {
        console.log('[VoiceService] TTS complete — resuming microphone');
        setTimeout(() => {
          if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isRecording) {
            console.log('[VoiceService] TTS resume: restarting recording after TTS completion');
            this.startRecording();
          } else {
            console.log('[VoiceService] TTS resume: skipping restart', {
              isListening: this.isListening,
              shouldStop: this.shouldStop,
              isUsingBrowserStt: this.isUsingBrowserStt,
              isRecording: this.isRecording
            });
          }
        }, 400);
      }
    }
  }

  /**
   * Stop any currently-playing TTS immediately without ending the listening
   * session. Useful for a "Stop speaking" button so the user can interrupt
   * Mossy mid-response.
   */
  stopSpeaking(): void {
    console.log('[VoiceService] stopSpeaking() called');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.src = '';
      this.currentAudioElement = null;
    }
    // Clear isSpeaking immediately so that the microphone restart logic in the
    // speak() finally block (and auto-restart in onstop) works correctly when
    // the canceled utterance resolves.
    this.isSpeaking = false;
    this.onModeChange?.('listening');
  }

  private async speakBrowser(text: string): Promise<void> {
    console.log('[VoiceService] speakBrowser() called');
    if (!('speechSynthesis' in window)) {
      console.error('[VoiceService] Speech synthesis not supported in window');
      throw new Error('Speech synthesis not supported');
    }
    console.log('[VoiceService] SpeechSynthesis is available');

    // Clear any stuck speech synthesis state before attempting to speak.
    // This fixes the issue where clicking stop while speaking locks up the browser TTS.
    // Some browsers (Chrome/Edge) can leave speechSynthesis in a stuck state after cancel(),
    // preventing all future speech attempts until the page is reloaded.
    const SPEECH_SYNTHESIS_CLEAR_DELAY_MS = 100;
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      console.log('[VoiceService] Clearing stuck speech synthesis state');
      window.speechSynthesis.cancel();
      // Wait for the browser to fully clear the synthesis queue.
      // Without this delay, the new utterance may fail silently in some browsers.
      await new Promise(resolve => setTimeout(resolve, SPEECH_SYNTHESIS_CLEAR_DELAY_MS));
    }

    // Resume if paused — Chrome/Electron can leave speechSynthesis in a paused
    // state, causing new speak() calls to silently queue but never start.
    if (window.speechSynthesis.paused) {
      console.log('[VoiceService] speechSynthesis is paused, resuming');
      window.speechSynthesis.resume();
    }

    // Wait for voices to be available before creating the utterance so the
    // preferred voice is correctly applied before queuing.
    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices.length === 0) {
      console.log('[VoiceService] Waiting for voiceschanged before speaking');
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        try {
          window.speechSynthesis.addEventListener('voiceschanged', function handler() {
            window.speechSynthesis.removeEventListener('voiceschanged', handler);
            finish();
          });
        } catch (e) { console.warn('[VoiceService] Could not add voiceschanged listener:', e); }
        setTimeout(finish, 250);
      });
    }

    return new Promise((resolve, reject) => {
      if (this.shouldStop) {
        console.log('[VoiceService] speakBrowser: shouldStop is true, resolving early');
        resolve();
        return;
      }

      const browserSettings = loadBrowserTtsSettings();
      if (!browserSettings.enabled) {
        console.log('[VoiceService] Browser TTS disabled in settings, skipping speak');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = browserSettings.rate;
      utterance.pitch = browserSettings.pitch;
      utterance.volume = browserSettings.volume;
      console.log('[VoiceService] Created SpeechSynthesisUtterance');

      // Set voice — voices are now guaranteed to be loaded (or we timed out and will use default).
      const preferredVoice = browserSettings.preferredVoiceName || import.meta.env.VITE_BROWSER_TTS_VOICE || '';
      console.log('[VoiceService] Preferred voice:', preferredVoice);
      const voices = window.speechSynthesis.getVoices();
      console.log('[VoiceService] Available voices:', voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService })));
      const selectedVoice = pickBrowserTtsVoice(voices, preferredVoice || undefined);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('[VoiceService] Selected voice:', selectedVoice.name);
      } else {
        console.warn('[VoiceService] No matching voice found, using browser default');
      }

      utterance.onstart = () => {
        console.log('[VoiceService] Speech utterance started');
        if (this.shouldStop) {
          console.log('[VoiceService] Cancelling speech due to shouldStop');
          window.speechSynthesis.cancel();
          resolve();
        } else {
          this.onModeChange?.('speaking');
        }
      };
      utterance.onend = () => {
        console.log('[VoiceService] Speech utterance ended');
        this.onModeChange?.('idle');
        resolve();
      };
      utterance.onerror = (event) => {
        // Treat explicit cancellations and interruptions as normal completion (do not surface as an error).
        if (event?.error === 'canceled' || event?.error === 'interrupted') {
          console.warn('[VoiceService] Speech utterance was canceled/interrupted — resolving quietly', event);
          this.onModeChange?.('idle');
          resolve();
          return;
        }

        console.error('[VoiceService] Speech utterance error:', event.error, event);
        this.onModeChange?.('idle');

        if (this.shouldStop) {
          resolve();
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      console.log('[VoiceService] Calling window.speechSynthesis.speak()');
      window.speechSynthesis.speak(utterance);
    });
  }

  private async speakElevenLabs(text: string): Promise<void> {
    if (this.shouldStop) return;
    
    if (!this.config.elevenlabsKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM'}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.elevenlabsKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      if (this.shouldStop) return;

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;

      return new Promise((resolve, reject) => {
        this.onModeChange?.('speaking');
        audio.onended = () => {
          this.onModeChange?.('idle');
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          this.onModeChange?.('idle');
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          URL.revokeObjectURL(audioUrl);
          if (this.shouldStop) resolve();
          else reject(new Error('Audio playback failed'));
        };

        if (this.shouldStop) {
          URL.revokeObjectURL(audioUrl);
          resolve();
        } else {
          audio.play();
        }
      });
    } catch (error) {
      if (this.shouldStop) return;
      throw new Error(`ElevenLabs TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async speakCloud(text: string): Promise<void> {
    console.log('[VoiceService] speakCloud() called');
    if (!('electron' in window) || !window.electron?.api?.ttsSpeak || !window.electron?.api?.onTtsSpeak) {
      throw new Error('Cloud TTS not available - electron API not found');
    }

    // Extract the API reference so TypeScript knows it is defined for the rest of the method.
    const cloudApi = (window as any).electron.api;

    try {
      this.onModeChange?.('speaking');
      
      // Listen for the audio URL response
      const audioUrl = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TTS timeout'));
        }, 10000); // 10 second timeout

        const unsubscribe = cloudApi.onTtsSpeak((url: string | null) => {
          clearTimeout(timeout);
          unsubscribe();
          if (url === null) {
            reject(new Error('TTS failed'));
          } else {
            resolve(url);
          }
        });

        // Send the TTS request
        cloudApi.ttsSpeak(text).catch((error: any) => {
          clearTimeout(timeout);
          unsubscribe();
          reject(error);
        });
      });

      if (this.shouldStop) {
        this.onModeChange?.('idle');
        return;
      }

      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          this.onModeChange?.('idle');
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          resolve();
        };
        audio.onerror = () => {
          this.onModeChange?.('idle');
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          reject(new Error('Audio playback failed'));
        };

        if (this.shouldStop) {
          resolve();
        } else {
          audio.play().catch(reject);
        }
      });
    } catch (error) {
      this.onModeChange?.('idle');
      throw new Error(`Cloud TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isSupported(): boolean {
    const hasSTT = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    const hasTTS = 'speechSynthesis' in window;
    return hasSTT && hasTTS;
  }
}