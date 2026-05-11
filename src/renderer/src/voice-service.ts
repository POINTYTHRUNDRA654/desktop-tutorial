import { loadBrowserTtsSettings, pickBrowserTtsVoice, uiLangToBcp47 } from './browserTts';

export interface VoiceServiceConfig {
  sttProvider: 'browser' | 'backend';
  ttsProvider: 'browser' | 'cloud';
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

/**
 * Phrases that Whisper commonly produces on near-silent or very short audio clips
 * instead of real speech. These are matched case-insensitively against the full
 * trimmed transcript. Only exact whole-string matches are checked so that
 * legitimate sentences that happen to contain one of these words are never filtered.
 */
const WHISPER_HALLUCINATION_PATTERNS: RegExp[] = [
  /^\[blank_audio\]$/i,
  /^\[silence\]$/i,
  /^\[music\]$/i,
  /^\(music\)$/i,
  /^♪+$/,
  /^♫+$/,
  /^\.+$/,
  /^,+$/,
  /^thank you\.?$/i,
  /^thanks for watching\.?$/i,
  /^thank you for watching\.?$/i,
  /^bye\.?$/i,
  /^bye-bye\.?$/i,
  /^bye bye\.?$/i,
  /^see you next time\.?$/i,
  /^see you soon\.?$/i,
  /^\[noise\]$/i,
  /^\[laughter\]$/i,
  /^\(laughter\)$/i,
  /^\[applause\]$/i,
];

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
  private recordingStartTime = 0;
  /** Maximum recording length: 60 seconds. Prevents "File too large" errors. */
  private readonly MAX_RECORDING_DURATION = 60000; // 60 seconds
  /**
   * Minimum recording length before attempting transcription (ms). Very short clips
   * are almost always noise triggers (a brief thump, click, or room sound that
   * momentarily crossed the silence threshold) and cause Whisper to produce
   * hallucinated stock phrases instead of real speech.
   */
  private readonly MIN_AUDIO_DURATION_MS = 1200; // 1.2 seconds
  /** Flag to enable longer delay on restart after transcription errors */
  private hadRecentTranscriptionError = false;
  /**
   * Tracks the highest average amplitude seen during the current recording.
   * Used by the speech onset gate: recordings where the amplitude never
   * exceeded SPEECH_ONSET_THRESHOLD are considered ambient noise (HVAC,
   * traffic, breathing) and discarded without calling Whisper.
   */
  private maxAmplitudeInRecording = 0;
  /** Minimum peak average amplitude required for a recording to be sent to Whisper. */
  private readonly SPEECH_ONSET_THRESHOLD = 22;
  /**
   * True while TTS is actively playing. Used to pause microphone recording
   * during speech playback and prevent the audio feedback loop where Mossy
   * hears and transcribes her own voice.
   */
  private isSpeaking = false;
  /** Delay before resuming microphone after TTS completes (ms). Must be long enough for audio to stop playing. */
  private readonly TTS_RESUME_DELAY_MS = 3500; // 3.5 seconds to account for browser audio buffer, Web Speech API queuing, playback latency, and speaker echo decay
  private onTranscription?: (text: string, sessionId?: number) => void;
  private onError?: (error: string) => void;
  private onModeChange?: (mode: 'idle' | 'listening' | 'processing' | 'speaking') => void;
  private sttResultUnsubscribe?: () => void;
  private currentSessionId = 0;
  private currentAudioElement: HTMLAudioElement | null = null;
  /**
   * Monotonically-increasing ID that is incremented at the start of every
   * `startRecording()` call AND whenever `stopListening()` is called.
   * Each `checkSilence` loop, `onstop`, and `onerror` closure captures its
   * own copy (`myRecordingId`) and exits immediately if `this.recordingId`
   * no longer matches — preventing stale closures from a previous recording
   * session from interfering with a new one after reconnect.
   */
  private recordingId = 0;

  constructor(config: VoiceServiceConfig) {
    // Hard-lock to browser TTS for stability across updates.
    this.config = { ...config, ttsProvider: 'browser' };
  }

  /** Update the STT provider without restarting the service. */
  setSttProvider(provider: VoiceServiceConfig['sttProvider']): void {
    this.config.sttProvider = provider;
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
    // Increment recordingId so any still-running checkSilence loops, onstop
    // handlers, or onerror handlers from the current session detect that they
    // are stale and exit without touching the new session's state.
    this.recordingId++;

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

    // Stop URL audio
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

      // Read STT language from settings; fall back to en-US.
      let sttLang = 'en-US';
      try {
        const api = (window as any)?.electron?.api ?? (window as any)?.electronAPI;
        if (api?.getSettings) {
          const s = await api.getSettings();
          const raw = String(s?.sttLanguage || s?.uiLanguage || '').trim();
          if (raw && raw !== 'auto') sttLang = raw;
        }
      } catch {
        // ignore — keep default
      }
      this.recognition.lang = sttLang;

      this.recognition.onstart = () => {
        console.log('[VoiceService] Browser STT started');
        this.isBrowserSttActive = true;
        this.isBrowserSttStarting = false;
        this.onModeChange?.('listening');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Guard against empty results arrays — the Web Speech API can fire
        // onresult with zero entries in some browser/OS combinations.
        if (!event.results || event.results.length === 0) return;
        const result = event.results[0];
        if (!result || !result.isFinal) return;
        const alternative = result[0];
        if (!alternative) return;
        const transcript = alternative.transcript.trim();
        const confidence = alternative.confidence || 0;

        console.log('[VoiceService] Browser STT result:', transcript, 'confidence:', confidence);

        // AUDIO FEEDBACK PREVENTION: Block transcriptions while TTS is speaking
        // This prevents capturing Mossy's own voice or looped audio from speakers
        if (this.isSpeaking) {
          console.log('[VoiceService] Ignoring STT result - audio feedback prevention (TTS in progress):', transcript);
          return;
        }

        // Only process if transcript is non-empty AND confidence is above 0.5
        // This prevents "hearing silence" or very low-confidence noise as commands
        if (transcript.length > 0 && confidence >= 0.5) {
          this.onTranscription?.(transcript, this.currentSessionId);
        } else {
          console.log('[VoiceService] Ignoring STT result - insufficient confidence or empty:', { transcript: transcript.length, confidence });
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
              try {
                this.recognition.start();
              } catch (e) {
                console.warn('[VoiceService] Browser STT auto-restart failed:', e);
              }
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

    // Unique ID for this recording session. Captured in all closures below so
    // that stale handlers from a previous session can detect they are obsolete
    // and exit without touching the current session's state.
    const myRecordingId = ++this.recordingId;

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

      // CRITICAL: Check if service was stopped (or superseded) while waiting for getUserMedia
      if (this.shouldStop || this.recordingId !== myRecordingId) {
        console.log('[VoiceService] Service stopped/superseded during getUserMedia, cleaning up stream');
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
      this.recordingStartTime = Date.now();
      this.maxAmplitudeInRecording = 0; // Reset peak tracker for new recording
      console.log('[VoiceService] Recording started, will auto-stop if exceeds', this.MAX_RECORDING_DURATION, 'ms');

      console.log(`[VoiceService] Created MediaRecorder for session ${this.currentSessionId} (recordingId=${myRecordingId}), setting up event handlers...`);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Guard: if recordingId has advanced past this session's ID, this
        // onstop belongs to a superseded session. Clean up the captured stream
        // and exit without touching shared state that the new session owns.
        if (this.recordingId !== myRecordingId) {
          console.log(`[VoiceService] onstop: ignoring stale handler (recordingId=${myRecordingId}, current=${this.recordingId})`);
          stream.getTracks().forEach(track => { try { track.stop(); } catch (_e) { console.warn('[VoiceService] Failed to stop stale track:', _e); } });
          return;
        }

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
          const recordingDuration = Date.now() - this.recordingStartTime;

          // Skip very short recordings — they are almost certainly noise triggers
          // (a brief thump, click, or ambient sound that momentarily crossed the
          // silence threshold). Whisper reliably hallucinates stock phrases on
          // sub-second clips, which then get sent to the AI as fake user speech.
          if (recordingDuration < this.MIN_AUDIO_DURATION_MS) {
            console.log(`[VoiceService] Skipping transcription - recording too short (${recordingDuration}ms < ${this.MIN_AUDIO_DURATION_MS}ms)`);
            this.audioChunks = [];
            return;
          }

          // Speech onset gate: discard recordings that never had a loud enough
          // audio peak to be real speech. Ambient noise (HVAC, traffic, TV in
          // another room) typically stays below SPEECH_ONSET_THRESHOLD even when
          // it keeps the silence timer from firing. This prevents Whisper from
          // receiving and hallucinating text from ambient-noise recordings.
          if (this.maxAmplitudeInRecording < this.SPEECH_ONSET_THRESHOLD) {
            console.log(`[VoiceService] Skipping transcription - no speech onset detected (peak: ${this.maxAmplitudeInRecording.toFixed(2)} < ${this.SPEECH_ONSET_THRESHOLD})`);
            this.audioChunks = [];
            return;
          }

          // Combine audio chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const fileSizeKB = (audioBlob.size / 1024).toFixed(2);
          console.log(`[VoiceService] Audio blob size: ${audioBlob.size} bytes (${fileSizeKB} KB), chunks: ${this.audioChunks.length}, duration: ${recordingDuration}ms`);

          // Warn if file is approaching backend limits (typically 25-50 MB)
          if (audioBlob.size > 5000000) { // 5 MB warning threshold
            console.warn(`[VoiceService] ⚠️ LARGE AUDIO FILE: ${fileSizeKB} KB after ${recordingDuration}ms. Backend may reject this.`);
          }

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
              const trimmedText = result.text.trim();
              // Only pass non-empty transcriptions to prevent "hearing silence"
              if (trimmedText.length > 0) {
                // Filter known Whisper hallucination phrases that are produced on
                // near-silent or very short audio even after the duration gate.
                if (WHISPER_HALLUCINATION_PATTERNS.some(p => p.test(trimmedText))) {
                  console.log('[VoiceService] Ignoring Whisper hallucination phrase:', trimmedText);
                } else {
                  this.onTranscription?.(trimmedText, this.currentSessionId);
                }
              } else {
                console.log('[VoiceService] Ignoring empty transcription from backend');
              }
            } else {
              const errorMsg = result?.error || 'Unknown transcription error';
              // Always show the error to the user so they know voice isn't working
              console.warn('[VoiceService] Transcription error:', errorMsg);
              // Log debug info if available
              if (result?.debug) {
                console.error('[VoiceService] DEBUG INFO:', JSON.stringify(result.debug, null, 2));
              }
              throw new Error(errorMsg);
            }
          } catch (error: any) {
            console.error('Transcription error:', error);
            const recordingDuration = Date.now() - this.recordingStartTime;

            if (!this.shouldStop) {
              const errorMessage = error?.message || 'Unknown error';
              console.error(`[VoiceService] ❌ Transcription failed: ${errorMessage}. Duration: ${recordingDuration}ms, Size: ${fileSizeKB} KB`);
              // Show error to user for all failures (including auth errors) so they know what's wrong
              this.onError?.(`Speech recognition failed: ${errorMessage}`);
              this.hadRecentTranscriptionError = true; // Flag for delayed restart
            }
          }
        }

        // ⚠️ NOTE: Microphone restart is NOT done here!
        // Why? The AI response generation happens AFTER transcription completes,
        // but BEFORE speak() is called. If we auto-restart here, the microphone
        // resumes early and captures Mossy's TTS audio, creating an audio feedback loop.
        //
        // Solution: Let speak() handle microphone restart after TTS completes.
        // speak() has a 2500ms timeout that ensures audio is fully played before resuming.
        //
        // This way the flow is:
        //   transcription → (AI generates) → speak() → TTS plays → (2500ms wait) → startRecording()
        //
        // NOT the broken flow of:
        //   transcription → (auto-restart) → (AI generates) → speak() → TTS overlaps with recording ❌
        this.hadRecentTranscriptionError = false; // Reset flag for next cycle
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        // Guard: ignore stale handler from a superseded session
        if (this.recordingId !== myRecordingId) return;
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
        // Guard: exit if this session has been superseded (reconnect happened) or
        // recording has stopped. Without this guard, a stale checkSilence loop
        // from a previous session would continue running against the current
        // session's shared state (isRecording, mediaRecorder), potentially
        // stopping a new session's MediaRecorder every 2.5 s and making the
        // voice pipeline appear permanently broken after reconnect.
        if (!this.isRecording || this.shouldStop || this.recordingId !== myRecordingId) {
          if (silenceTimer) clearTimeout(silenceTimer);
          try { audioContext.close(); } catch (_e) { console.warn('[VoiceService] Failed to close stale audioContext:', _e); }
          return;
        }

        // Check if recording has exceeded max duration (safety limit for file size)
        const recordingDuration = Date.now() - this.recordingStartTime;
        if (recordingDuration > this.MAX_RECORDING_DURATION) {
          console.log('[VoiceService] Max recording duration reached (' + recordingDuration + 'ms), stopping to prevent "File too large" error');
          if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Track peak amplitude for the speech onset gate in onstop.
        if (average > this.maxAmplitudeInRecording) this.maxAmplitudeInRecording = average;

        // Log audio levels periodically for debugging (every 100 frames)
        if (Math.random() < 0.01) {
          console.log('[VoiceService] Audio level:', average.toFixed(2));
        }

        // Threshold of 15: catches all room silence and breathing while preserving speech.
        // Speaking voice: typically 15-40  → above threshold → recording continues ✓
        // Breathing/quiet: typically 8-15  → at or below threshold → timer starts ✓
        // Room silence: typically 5-10     → well below threshold → timer starts ✓
        // True silence: 0-5               → well below threshold → timer starts ✓
        // (Previous value 8 was too low — rooms with noise at 8-12 never triggered.)
        if (average < 15) { // Silence threshold
          if (!silenceTimer) {
            console.log('[VoiceService] Silence detected (avg:', average.toFixed(2), '), starting 2.5s timer');
            silenceTimer = setTimeout(() => {
              // Only stop the recorder that belongs to this specific session
              if (this.recordingId === myRecordingId && this.mediaRecorder && this.isRecording && !this.shouldStop) {
                console.log('[VoiceService] Silence timer expired, stopping recording');
                this.mediaRecorder.stop();
              }
            }, 2500); // Stop after 2.5 seconds of silence
          }
        } else {
          if (silenceTimer) {
            console.log('[VoiceService] Speech detected (avg:', average.toFixed(2), '), canceling silence timer');
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
    const speakStartTime = Date.now();
    console.log('[VoiceService] 🎙️ speak() called - text length:', text.length, 'chars');
    if (this.shouldStop) {
      console.log('[VoiceService] Ignoring speak request, service stopped');
      return;
    }

    // ── Pause microphone while TTS is speaking (prevent audio feedback loop) ──
    // Stop any active recording so Mossy's own voice is not transcribed and fed
    // back to the AI, causing an infinite "keep talking" loop.
    this.isSpeaking = true;
    const speakStartedAt = new Date().toISOString();
    console.log('[VoiceService] 🎙️ speak() called at', speakStartedAt, '- pausing microphone, text:', text.substring(0, 80));
    if (this.isRecording && this.mediaRecorder) {
      console.log('[VoiceService] ⏹️ Stopping current recording at', new Date().toISOString(), 'to prevent voice capture during TTS');
      this.audioChunks = []; // Discard any audio captured before speak was called
      try { this.mediaRecorder.stop(); } catch (e) { console.warn('[VoiceService] Could not stop MediaRecorder for TTS:', e); }
    }

    try {
      if (this.config.ttsProvider === 'browser') {
        console.log('[VoiceService] Using browser TTS provider');
        const browserStartTime = Date.now();
        const result = await this.speakBrowser(text);
        const ttsDuration = Date.now() - browserStartTime;
        console.log('[VoiceService] 🎙️ speak() complete - TTS duration:', ttsDuration, 'ms | TEXT:', text.substring(0, 80));
        return result;
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
      // IMPORTANT: TTS duration varies (100ms-3s+ depending on text length and system).
      // Microphone must NOT resume until TTS audio has finished playing AND speaker
      // echo has decayed. If resume is too early, we capture our own voice, transcribe
      // it, and enter a self-responding feedback loop.
      this.isSpeaking = false;
      this.audioChunks = []; // Discard any audio chunks that may have accumulated

      if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt) {
        const resumeScheduledAt = new Date().toISOString();
        console.log('[VoiceService] ⏱️ TTS resume: scheduling microphone restart at', resumeScheduledAt, 'after', this.TTS_RESUME_DELAY_MS, 'ms');

        setTimeout(() => {
          if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isRecording) {
            console.log('[VoiceService] ▶️ TTS resume: restarting recording at', new Date().toISOString(), '(', this.TTS_RESUME_DELAY_MS, 'ms after TTS ended)');
            this.startRecording();
          } else {
            console.log('[VoiceService] ⏸️ TTS resume: skipping restart at', new Date().toISOString(), '(conditions not met)', {
              isListening: this.isListening,
              shouldStop: this.shouldStop,
              isUsingBrowserStt: this.isUsingBrowserStt,
              isRecording: this.isRecording
            });
          }
        }, this.TTS_RESUME_DELAY_MS);
      }
    }
  }

  /**
   * Forcefully restart microphone recording after being muted.
   * When unmuting, we need to ensure recording is active, even if it appears
   * to already be recording (which might be stuck or in a bad state).
   *
   * Only restarts if:
   * - The service is in an active listening state
   * - The service has not been stopped
   * - Backend STT is being used (browser STT auto-restarts)
   */
  safeMicrophoneRestart(): void {
    console.log('[VoiceService] safeMicrophoneRestart() called (on unmute)', {
      isListening: this.isListening,
      shouldStop: this.shouldStop,
      isRecording: this.isRecording,
      isUsingBrowserStt: this.isUsingBrowserStt,
    });

    if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt) {
      // If recording is stuck (appears to be recording but maybe nothing is actually happening),
      // forcefully clean up and then restart.
      if (this.isRecording) {
        console.log('[VoiceService] Recording appears stuck, forcefully cleaning up...');

        // Clean up stuck MediaRecorder
        if (this.mediaRecorder) {
          try {
            console.log('[VoiceService] Stopping stuck MediaRecorder');
            this.mediaRecorder.stop();
          } catch (e) {
            console.warn('[VoiceService] Error stopping stuck recorder:', e);
          }
          this.mediaRecorder = null;
        }

        // Clean up stuck stream
        if (this.activeStream) {
          console.log('[VoiceService] Closing stuck media stream');
          this.activeStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('[VoiceService] Error stopping stuck track:', e);
            }
          });
          this.activeStream = null;
        }

        // Reset recording state so startRecording won't bail out early
        this.isRecording = false;
        console.log('[VoiceService] Cleanup complete, now attempting restart');
      }

      // Now call startRecording to begin fresh recording session
      console.log('[VoiceService] Calling startRecording for unmute restart');
      this.startRecording().catch(error => {
        console.warn('[VoiceService] Failed to restart recording on unmute:', error);
      });
    } else {
      console.log('[VoiceService] Skipping restart - service not in listening state or stopped', {
        isListening: this.isListening,
        shouldStop: this.shouldStop,
        isUsingBrowserStt: this.isUsingBrowserStt,
      });
    }
  }

  /**
   * Stop any currently-playing TTS immediately without ending the listening
   * session. Useful for a "Stop speaking" button so the user can interrupt
   * Mossy mid-response.
   *
   * Also directly restarts microphone recording in case `speak()` is
   * stuck waiting for an utterance event that never fires (a known
   * Electron/Chromium speechSynthesis bug where cancel() does not always
   * trigger onerror on the utterance).
   */
  stopSpeaking(): void {
    console.log('[VoiceService] stopSpeaking() called');
    if (window.speechSynthesis) {
      // Use pause() before cancel() to work around an Electron/Chromium bug where
      // cancel() alone sometimes fails to fire utterance.onerror, leaving audio
      // still playing despite the cancel call.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.pause();
      }
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

    // Proactively restart recording if we're in an active listening session and
    // not already recording. This handles the case where speak() is stuck
    // (e.g., Electron speechSynthesis.cancel() does not fire utterance.onerror),
    // which would otherwise leave the microphone permanently paused.
    if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isRecording) {
      console.log('[VoiceService] stopSpeaking: waiting', this.TTS_RESUME_DELAY_MS, 'ms before resuming microphone');
      setTimeout(() => {
        if (this.isListening && !this.shouldStop && !this.isUsingBrowserStt && !this.isRecording) {
          console.log('[VoiceService] stopSpeaking: restarting recording after TTS stop');
          this.startRecording();
        }
      }, this.TTS_RESUME_DELAY_MS);
    }
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
        setTimeout(finish, 1500);
      });
    }

    // Resolve TTS language from settings so the utterance is spoken in the
    // user's selected language and voice selection is filtered accordingly.
    let ttsBcp47 = 'en-US';
    let ttsLangBase = '';
    try {
      const api = (window as any)?.electron?.api ?? (window as any)?.electronAPI;
      if (api?.getSettings) {
        const s = await api.getSettings();
        const raw = String(s?.uiLanguage || '').trim();
        if (raw && raw !== 'auto') {
          ttsLangBase = raw.split('-')[0].toLowerCase();
          ttsBcp47 = uiLangToBcp47(raw);
        }
      }
    } catch {
      // ignore — keep defaults
    }
    console.log('[VoiceService] TTS language resolved:', ttsBcp47);

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
      console.log('[VoiceService] Created SpeechSynthesisUtterance, lang:', ttsBcp47);

      // Set voice — voices are now guaranteed to be loaded (or we timed out and will use default).
      const preferredVoice = browserSettings.preferredVoiceName || import.meta.env.VITE_BROWSER_TTS_VOICE || '';
      console.log('[VoiceService] Preferred voice:', preferredVoice);
      const voices = window.speechSynthesis.getVoices();
      console.log('[VoiceService] Available voices:', voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService })));
      const selectedVoice = pickBrowserTtsVoice(voices, preferredVoice || undefined, ttsLangBase || undefined);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        // Match the language to the actual selected voice's language, not the requested language
        const voiceLang = selectedVoice.lang || ttsBcp47;
        utterance.lang = voiceLang;
        console.log('[VoiceService] Selected voice:', selectedVoice.name, selectedVoice.lang, '-> setting utterance.lang to:', voiceLang);
      } else {
        console.warn('[VoiceService] No matching voice found, using browser default');
        // If no voice found, set language to requested language
        utterance.lang = ttsBcp47;
      }

      utterance.onstart = () => {
        console.log('[VoiceService] 🎵 Speech utterance started at', new Date().toISOString());
        if (this.shouldStop) {
          console.log('[VoiceService] Cancelling speech due to shouldStop');
          window.speechSynthesis.cancel();
          resolve();
        } else {
          this.onModeChange?.('speaking');
        }
      };
      utterance.onend = () => {
        console.log('[VoiceService] 🔇 Speech utterance ended at', new Date().toISOString(), '- waiting', this.TTS_RESUME_DELAY_MS, 'ms for speaker decay');
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
    const hasBrowserStt = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    const hasBackendCapture =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';
    const hasBrowserTts = 'speechSynthesis' in window;
    // Voice can run with either browser STT OR backend capture/transcription.
    return hasBrowserTts && (hasBrowserStt || hasBackendCapture);
  }
}
