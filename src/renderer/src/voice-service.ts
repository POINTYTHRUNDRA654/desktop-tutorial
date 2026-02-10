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
        console.log(`[VoiceService] MediaRecorder onstop fired for session ${this.currentSessionId}, isRecording: ${this.isRecording}, shouldStop: ${this.shouldStop}`);
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

        // Auto-restart for continuous listening (increased delay for stability)
        if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt) {
          setTimeout(() => this.startRecording(), 1000);
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
    
    if (this.config.ttsProvider === 'browser') {
      console.log('[VoiceService] Using browser TTS provider');
      return this.speakBrowser(text);
    } else if (this.config.ttsProvider === 'elevenlabs') {
      console.log('[VoiceService] Using ElevenLabs TTS provider');
      return this.speakElevenLabs(text);
    } else if (this.config.ttsProvider === 'cloud') {
      console.log('[VoiceService] Using cloud TTS provider (main process)');
      if (!('electron' in window) || !window.electron?.api?.ttsSpeak || !window.electron?.api?.onTtsSpeak) {
        console.warn('[VoiceService] Cloud TTS not available, falling back to browser TTS');
        return this.speakBrowser(text);
      }
      return this.speakCloud(text);
    }
  }

  private async speakBrowser(text: string): Promise<void> {
    console.log('[VoiceService] speakBrowser() called');
    if (!('speechSynthesis' in window)) {
      console.error('[VoiceService] Speech synthesis not supported in window');
      throw new Error('Speech synthesis not supported');
    }
    console.log('[VoiceService] SpeechSynthesis is available');

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

      // Set voice based on environment variable or config
      const preferredVoice = browserSettings.preferredVoiceName || import.meta.env.VITE_BROWSER_TTS_VOICE || 'Linda';
      console.log('[VoiceService] Preferred voice:', preferredVoice);
      
      // Function to set voice once voices are loaded
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[VoiceService] Available voices:', voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService })));
        const selectedVoice = pickBrowserTtsVoice(voices, preferredVoice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('[VoiceService] Selected voice:', selectedVoice.name);
        } else {
          console.warn(`[VoiceService] Preferred voice "${preferredVoice}" not found, using default`);
        }
      };

      // Check if voices are already loaded
      const currentVoices = window.speechSynthesis.getVoices();
      console.log('[VoiceService] Current voices count:', currentVoices.length);
      if (currentVoices.length > 0) {
        setVoice();
      } else {
        console.log('[VoiceService] Waiting for voiceschanged event');
        // Wait for voices to load
        const voicesChangedHandler = () => {
          console.log('[VoiceService] voiceschanged event fired');
          setVoice();
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
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

    try {
      this.onModeChange?.('speaking');
      
      // Listen for the audio URL response
      const audioUrl = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TTS timeout'));
        }, 10000); // 10 second timeout

        const unsubscribe = window.electron.api.onTtsSpeak((url: string | null) => {
          clearTimeout(timeout);
          unsubscribe();
          if (url === null) {
            reject(new Error('TTS failed'));
          } else {
            resolve(url);
          }
        });

        // Send the TTS request
        window.electron.api.ttsSpeak(text).catch((error: any) => {
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