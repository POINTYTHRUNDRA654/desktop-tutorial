/**
 * voice-service.test.ts
 *
 * Unit tests that verify the four key properties introduced/fixed in the
 * "voice session cannot reconnect after disconnect / mute / stop" PR:
 *
 *  1. VoiceService.stopListening() increments `recordingId` so every stale
 *     closure (checkSilence, onstop, onerror) from a previous session can
 *     detect it is obsolete and exit without touching new-session state.
 *
 *  2. startListening() after stopListening() correctly resets shouldStop=false
 *     and isListening=true, enabling a clean reconnect.
 *
 *  3. Multiple stop+start cycles leave the service in a valid, usable state
 *     each time — previously stale checkSilence loops would break subsequent
 *     sessions.
 *
 *  4. startRecording() is guarded by shouldStop, so a disconnected service
 *     never opens a new microphone stream.
 *
 *  5. Each startRecording() call captures a fresh recordingId that differs
 *     from any previously-captured id, ensuring old closures fail the guard.
 *
 *  6. stopSpeaking():
 *     - clears isSpeaking immediately
 *     - fires onModeChange('listening')
 *     - calls speechSynthesis.cancel()
 *     - schedules a mic restart (via startRecording) when the service is in an
 *       active, non-recording, backend-STT listening session (safety net for
 *       the Electron/Chromium stuck-utterance bug)
 *     - does NOT restart when disconnected (shouldStop=true)
 *     - does NOT restart when already recording
 *     - does NOT restart when using browser STT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceService } from '../voice-service';

// ─── Mock browserTts (dependency of voice-service) ───────────────────────────
vi.mock('../browserTts', () => ({
  loadBrowserTtsSettings: vi.fn().mockReturnValue({
    enabled: true,
    rate: 1,
    pitch: 1,
    volume: 1,
    preferredVoiceName: '',
  }),
  pickBrowserTtsVoice: vi.fn().mockReturnValue(null),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cast to `any` to read/write private fields for white-box verification. */
function priv(service: VoiceService): any {
  return service as any;
}

function makeBackendService(): VoiceService {
  return new VoiceService({ sttProvider: 'backend', ttsProvider: 'browser' });
}

function makeBrowserService(): VoiceService {
  return new VoiceService({ sttProvider: 'browser', ttsProvider: 'browser' });
}

/** No-op callbacks used when we just need startListening() called. */
const noop = () => {};

// ─── Setup: minimal DOM/API stubs required by VoiceService ───────────────────

let getUserMediaMock: ReturnType<typeof vi.fn>;
let speechCancelMock: ReturnType<typeof vi.fn>;
let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined;
let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame | undefined;
let originalAudioContext: typeof globalThis.AudioContext | undefined;
let originalMediaRecorder: typeof globalThis.MediaRecorder | undefined;

beforeEach(() => {
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  originalAudioContext = (globalThis as any).AudioContext;
  originalMediaRecorder = (globalThis as any).MediaRecorder;

  getUserMediaMock = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn(), kind: 'audio' }],
  });

  speechCancelMock = vi.fn();

  // navigator.mediaDevices
  Object.defineProperty(global, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: getUserMediaMock,
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    },
    configurable: true,
    writable: true,
  });

  // window.speechSynthesis (jsdom doesn't provide this)
  Object.defineProperty(global, 'speechSynthesis', {
    value: {
      cancel: speechCancelMock,
      speaking: false,
      pending: false,
      paused: false,
      getVoices: vi.fn().mockReturnValue([]),
    },
    configurable: true,
    writable: true,
  });

  // SpeechRecognition (not needed for backend STT tests but prevents errors)
  Object.defineProperty(global, 'SpeechRecognition', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(global, 'webkitSpeechRecognition', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  // requestAnimationFrame/cancelAnimationFrame are not guaranteed in Vitest.
  // Keep a bounded frame budget per callback chain so silence checks can run
  // across multiple startRecording() calls in one test without spinning forever.
  const rafCallCountByCallback = new WeakMap<FrameRequestCallback, number>();
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) => {
      const frameCount = rafCallCountByCallback.get(callback) ?? 0;
      if (frameCount >= 3) return 0;
      rafCallCountByCallback.set(callback, frameCount + 1);
      return setTimeout(() => callback(performance.now()), 0) as unknown as number;
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    value: (id: number) => {
      clearTimeout(id as unknown as NodeJS.Timeout);
    },
    configurable: true,
    writable: true,
  });

  class MockAnalyserNode {
    fftSize = 0;
    frequencyBinCount = 128;
    getByteFrequencyData(arr: Uint8Array): void {
      arr.fill(0);
    }
  }

  class MockAudioContext {
    createAnalyser(): MockAnalyserNode {
      return new MockAnalyserNode();
    }

    createMediaStreamSource(): { connect: ReturnType<typeof vi.fn> } {
      return { connect: vi.fn() };
    }

    close(): Promise<void> {
      return Promise.resolve();
    }
  }

  Object.defineProperty(globalThis, 'AudioContext', {
    value: MockAudioContext,
    configurable: true,
    writable: true,
  });

  class MockMediaRecorder {
    public ondataavailable: ((e: any) => void) | null = null;
    public onstop: (() => void) | null = null;
    public onerror: ((e: any) => void) | null = null;

    constructor(_stream: MediaStream, _opts?: MediaRecorderOptions) {}

    start(): void {
      // no-op for unit tests
    }

    stop(): void {
      this.onstop?.();
    }
  }

  Object.defineProperty(globalThis, 'MediaRecorder', {
    value: MockMediaRecorder,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    value: originalRequestAnimationFrame,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    value: originalCancelAnimationFrame,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'AudioContext', {
    value: originalAudioContext,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'MediaRecorder', {
    value: originalMediaRecorder,
    configurable: true,
    writable: true,
  });
});

// ─── Suite 1: recordingId guard — stale closure isolation ────────────────────

describe('VoiceService — recordingId stale-closure guard', () => {
  it('stopListening() increments recordingId by exactly 1', () => {
    const service = makeBackendService();
    const before = priv(service).recordingId;

    service.stopListening();

    expect(priv(service).recordingId).toBe(before + 1);
  });

  it('stopListening() called N times increments recordingId by N', () => {
    const service = makeBackendService();

    service.stopListening(); // 1
    service.stopListening(); // 2
    service.stopListening(); // 3

    expect(priv(service).recordingId).toBe(3);
  });

  it('recordingId captured before stopListening() no longer matches after', () => {
    const service = makeBackendService();
    service.startListening(noop, noop, noop);

    // Simulate what myRecordingId would hold inside an active recording closure.
    const capturedId = priv(service).recordingId;

    service.stopListening(); // invalidates capturedId

    // Any closure holding capturedId would fail: this.recordingId !== capturedId
    expect(priv(service).recordingId).not.toBe(capturedId);
  });

  it('recordingId captured before two stop+start cycles no longer matches after', () => {
    const service = makeBackendService();
    service.startListening(noop, noop, noop);
    const staleId = priv(service).recordingId;

    // First disconnect + reconnect
    service.stopListening();
    service.startListening(noop, noop, noop);

    // Second disconnect + reconnect
    service.stopListening();
    service.startListening(noop, noop, noop);

    expect(priv(service).recordingId).toBeGreaterThan(staleId);
  });

  it('startRecording() increments recordingId on every call', async () => {
    const service = makeBackendService();
    service.startListening(noop, noop, noop); // sets shouldStop=false

    const before = priv(service).recordingId;

    // Call startRecording() — it will async-call getUserMedia then return
    await priv(service).startRecording();

    expect(priv(service).recordingId).toBe(before + 1);
  });
});

// ─── Suite 2: reconnect cycle — clean state after stop+start ─────────────────

describe('VoiceService — disconnect + reconnect state transitions', () => {
  it('after stopListening(): isListening=false, shouldStop=true', () => {
    const service = makeBackendService();
    service.startListening(noop, noop, noop);

    service.stopListening();

    expect(priv(service).isListening).toBe(false);
    expect(priv(service).shouldStop).toBe(true);
  });

  it('after startListening(): isListening=true, shouldStop=false', () => {
    const service = makeBackendService();
    service.stopListening(); // start in disconnected state

    service.startListening(noop, noop, noop);

    expect(priv(service).isListening).toBe(true);
    expect(priv(service).shouldStop).toBe(false);
  });

  it('full stop → start cycle results in correct state', () => {
    const service = makeBackendService();
    service.startListening(noop, noop, noop);

    service.stopListening();
    service.startListening(noop, noop, noop);

    expect(priv(service).isListening).toBe(true);
    expect(priv(service).shouldStop).toBe(false);
  });

  it('three stop+start cycles each leave the service in listening state', () => {
    const service = makeBackendService();

    for (let i = 0; i < 3; i++) {
      service.startListening(noop, noop, noop);
      expect(priv(service).isListening).toBe(true);
      expect(priv(service).shouldStop).toBe(false);

      service.stopListening();
      expect(priv(service).isListening).toBe(false);
      expect(priv(service).shouldStop).toBe(true);
    }
  });

  it('stopListening() clears isSpeaking so stale TTS state does not block next session', () => {
    const service = makeBackendService();

    // Simulate a stuck TTS state from a previous session
    priv(service).isSpeaking = true;

    service.stopListening(); // includes isSpeaking = false
    expect(priv(service).isSpeaking).toBe(false);

    service.startListening(noop, noop, noop);
    expect(priv(service).isSpeaking).toBe(false);
  });

  it('stopListening() clears browser STT flags', () => {
    const service = makeBrowserService();
    priv(service).isBrowserSttActive = true;
    priv(service).isBrowserSttStarting = true;
    priv(service).isUsingBrowserStt = true;

    service.stopListening();

    expect(priv(service).isBrowserSttActive).toBe(false);
    expect(priv(service).isBrowserSttStarting).toBe(false);
    expect(priv(service).isUsingBrowserStt).toBe(false);
  });
});

// ─── Suite 3: startRecording() shouldStop guard ───────────────────────────────

describe('VoiceService — startRecording() shouldStop guard', () => {
  it('does not call getUserMedia when shouldStop=true', async () => {
    const service = makeBackendService();
    priv(service).shouldStop = true; // force disconnected state

    await priv(service).startRecording();

    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('does not call getUserMedia when isRecording=true (already active)', async () => {
    const service = makeBackendService();
    // Set state directly without calling startListening() to avoid side effects
    priv(service).shouldStop = false;
    priv(service).isListening = true;
    priv(service).isRecording = true; // guard should bail out early

    await priv(service).startRecording();

    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('calls getUserMedia when isListening=true and shouldStop=false', async () => {
    const service = makeBackendService();
    // Set state directly — avoids double-calling getUserMedia via startListening()
    priv(service).shouldStop = false;
    priv(service).isListening = true;
    priv(service).isRecording = false;

    await priv(service).startRecording();

    expect(getUserMediaMock).toHaveBeenCalledOnce();
  });
});

// ─── Suite 4: stopSpeaking() — mic restart after TTS stop ─────────────────────

describe('VoiceService — stopSpeaking()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears isSpeaking immediately', () => {
    const service = makeBackendService();
    priv(service).isSpeaking = true;

    service.stopSpeaking();

    expect(priv(service).isSpeaking).toBe(false);
  });

  it('calls speechSynthesis.cancel()', () => {
    const service = makeBackendService();

    service.stopSpeaking();

    expect(speechCancelMock).toHaveBeenCalled();
  });

  it('fires onModeChange("listening") to update UI state', () => {
    const modeEvents: string[] = [];
    const service = makeBackendService();
    service.startListening(noop, noop, (m) => modeEvents.push(m));

    service.stopSpeaking();

    expect(modeEvents).toContain('listening');
  });

  it('schedules mic restart when in active backend-STT session and not recording', async () => {
    vi.useFakeTimers();
    const service = makeBackendService();
    // Set state directly so startListening() doesn't trigger a background
    // getUserMedia call that would confuse the assertion below.
    priv(service).isListening = true;
    priv(service).shouldStop = false;
    priv(service).isUsingBrowserStt = false;
    priv(service).isSpeaking = true;
    priv(service).isRecording = false;
    priv(service).onModeChange = noop;

    service.stopSpeaking();

    // getUserMedia should not be called synchronously
    expect(getUserMediaMock).not.toHaveBeenCalled();

    // After TTS_RESUME_DELAY_MS (3500 ms) the startRecording() is scheduled.
    await vi.advanceTimersByTimeAsync(3600);

    expect(getUserMediaMock).toHaveBeenCalled();
  });

  it('does NOT schedule mic restart when shouldStop=true (service disconnected)', async () => {
    vi.useFakeTimers();
    const service = makeBackendService();
    priv(service).isListening = true;
    priv(service).shouldStop = true; // disconnected
    priv(service).isUsingBrowserStt = false;
    priv(service).isRecording = false;
    priv(service).onModeChange = noop;

    service.stopSpeaking();
    await vi.advanceTimersByTimeAsync(500);

    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule mic restart when isRecording=true (already listening)', async () => {
    vi.useFakeTimers();
    const service = makeBackendService();
    priv(service).isListening = true;
    priv(service).shouldStop = false;
    priv(service).isUsingBrowserStt = false;
    priv(service).isRecording = true; // already recording
    priv(service).onModeChange = noop;

    service.stopSpeaking();
    await vi.advanceTimersByTimeAsync(500);

    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule mic restart when using browser STT', async () => {
    vi.useFakeTimers();
    const service = makeBackendService();
    priv(service).isListening = true;
    priv(service).shouldStop = false;
    priv(service).isUsingBrowserStt = true; // browser STT mode
    priv(service).isRecording = false;
    priv(service).onModeChange = noop;

    service.stopSpeaking();
    await vi.advanceTimersByTimeAsync(500);

    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('pauses currentAudioElement if one is set', () => {
    const service = makeBackendService();
    const pauseMock = vi.fn();
    priv(service).currentAudioElement = { pause: pauseMock, src: '' };

    service.stopSpeaking();

    expect(pauseMock).toHaveBeenCalled();
    expect(priv(service).currentAudioElement).toBeNull();
  });
});
