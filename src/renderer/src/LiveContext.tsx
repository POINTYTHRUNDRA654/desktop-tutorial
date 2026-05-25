// ...existing code...
export function useLive() {
  const ctx = React.useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within a LiveProvider');
  return ctx;
}
import React, { createContext, useState, ReactNode, useRef, useEffect } from 'react';
import { VoiceService, VoiceServiceConfig } from './voice-service';
import { contextAwareAIService } from './ContextAwareAIService';
import { ModProjectStorage } from './services/ModProjectStorage';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';
import { generateSystemContextFromStorage } from './utils/generateSystemContext';

export interface LiveContextType {
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  status: string;
  volume: number;
  mode: 'idle' | 'listening' | 'processing' | 'speaking';
  transcription: string;
  micLevel: number;
  audioInputs: Array<{ deviceId: string; label: string }>;
  selectedInputId: string;
  setSelectedInputId: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: (manual?: boolean) => void;
  /** Stop Mossy speaking mid-response without ending the voice session. */
  stopSpeaking: () => void;
  customAvatar: string | null;
  updateAvatar: (file: File) => Promise<void>;
  setAvatarFromUrl: (url: string) => Promise<void>;
  clearAvatar: () => void;
  avatarLocked: boolean;
  cortexMemory: any[];
  setCortexMemory: (val: any[]) => void;
  projectData: any | null;
  setProjectData: (val: any) => void;
  isLiveActive: boolean;
  isLiveMuted: boolean;
  toggleLiveMute: () => void;
  disconnectLive: (manual?: boolean) => void;
  /** Send text input to Mossy (alternative to voice) */
  sendTextMessage: (text: string) => Promise<void>;
  /** Last response spoken by Mossy — shown as text for users without speakers */
  lastResponse: string;
  // test-only helper
  __test_handleTranscription?: (text: string, sessionId?: number, isTextInput?: boolean) => Promise<void>;
  __test_setLastSpeakEnd?: (ts: number) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const LIVE_HISTORY_KEY = 'mossy_live_history_v1';
  const LIVE_HISTORY_MAX = 60;
  const LIVE_NOTES_SNAPSHOT = 10;
  const LIVE_NOTES_MAX_CHARS = 8000;
  const [isActive, setIsActive] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [transcriptionDisabled, setTranscriptionDisabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(1);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const isFreshlyConnectedRef = useRef(false);
  const currentSessionRef = useRef(0);
  const [audioInputs, setAudioInputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const AVATAR_STORAGE_KEY = 'mossy_custom_avatar';
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_STORAGE_KEY) || null; } catch { return null; }
  });
  const [avatarLocked, setAvatarLocked] = useState(false);
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any | null>(null);

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const lastSpeakEndRef = useRef<number>(0);
  const activeRequestsRef = useRef<Set<string>>(new Set());
  // Ref-backed flag so connect()'s async catch block always sees the current
  // disconnecting state (avoids stale closure where catch sees isDisconnecting=true
  // even after setIsDisconnecting(false) was called at the top of connect()).
  const isDisconnectingRef = useRef(false);
  // Ref-backed muted flag so handleTranscription (which is captured as a callback
  // and therefore closes over a stale isMuted state) sees the live value.
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  // Ref-backed mode flag for the same reason: mode state is stale inside the
  // handleTranscription callback registered at connect() time.
  const modeRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Flag to prevent disconnect during active AI processing
  const isProcessingResponseRef = useRef(false);

  const loadLiveHistory = () => {
    try {
      const raw = localStorage.getItem(LIVE_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .slice(-LIVE_HISTORY_MAX);
    } catch {
      return [];
    }
  };

  const persistLiveHistory = (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    try {
      localStorage.setItem(LIVE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[LiveContext] Failed to persist live history:', e);
    }
  };

  const pushLiveHistory = (entry: { role: 'user' | 'assistant'; content: string }) => {
    const next = [...conversationHistoryRef.current, entry].slice(-LIVE_HISTORY_MAX);
    conversationHistoryRef.current = next;
    persistLiveHistory(next);

    // also persist to disk via main process so sessions survive app restarts
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (api?.saveVoiceHistory) {
        const line = `${entry.role.toUpperCase()}: ${entry.content}\n`;
        api.saveVoiceHistory(line).catch((e: any) => console.warn('[LiveContext] failed to save history to disk', e));
      }
    } catch (e) {
      console.warn('[LiveContext] unable to call saveVoiceHistory', e);
    }
  };

  const getCurrentProjectStepSummary = () => {
    try {
      const current = ModProjectStorage.getCurrentMod();
      if (!current) return '';
      const inProgress = current.steps.find((step) => step.status === 'in-progress');
      const pending = current.steps.find((step) => step.status === 'pending');
      const nextStep = inProgress || pending;
      if (!nextStep) return '';
      const status = nextStep.status.replace('-', ' ');
      return `Current Step: ${nextStep.title} (${status}) [${current.steps.filter(s => s.status === 'completed').length}/${current.steps.length}]`;
    } catch {
      return '';
    }
  };

  const updateVoiceWorkingMemory = () => {
    const snapshot = conversationHistoryRef.current.slice(-LIVE_NOTES_SNAPSHOT);
    if (snapshot.length === 0) return;

    const blockStart = '--- VOICE SESSION NOTES ---';
    const blockEnd = '--- END VOICE SESSION NOTES ---';
    const stepSummary = getCurrentProjectStepSummary();
    const notes = snapshot
      .map((entry) => `${entry.role === 'user' ? 'User' : 'Mossy'}: ${entry.content}`)
      .join('\n');

    const stepLine = stepSummary ? `\n${stepSummary}` : '';
    const nextBlock = `${blockStart}\n${notes}${stepLine}\n${blockEnd}`;

    try {
      const existing = localStorage.getItem('mossy_working_memory') || '';
      const withoutBlock = existing.replace(new RegExp(`${blockStart}[\\s\\S]*?${blockEnd}`, 'g'), '').trim();
      const merged = [withoutBlock, nextBlock].filter(Boolean).join('\n\n').slice(-LIVE_NOTES_MAX_CHARS);
      localStorage.setItem('mossy_working_memory', merged);
    } catch (e) {
      console.warn('[LiveContext] Failed to update working memory:', e);
    }
  };

  const buildVoicePayload = (message: string) => {
    let projectData: any = null;
    try {
      const rawProject = localStorage.getItem('mossy_project');
      projectData = rawProject ? JSON.parse(rawProject) : null;
    } catch {
      projectData = null;
    }

    const workingMemory = localStorage.getItem('mossy_working_memory') || '';
    return {
      text: message,
      history: conversationHistoryRef.current.slice(-LIVE_HISTORY_MAX),
      workingMemory,
      projectData,
    };
  };

  // Initialize voice service
  useEffect(() => {
    const config: VoiceServiceConfig = {
      sttProvider: 'backend', // Use backend STT if available, fallback to browser
      ttsProvider: 'browser',
    };

    voiceServiceRef.current = new VoiceService(config);
    voiceServiceRef.current.initialize().catch(console.error);

    // Get audio inputs
    console.log('[LiveContext] Enumerating audio devices...');

    // First try to request microphone permission if needed
    setStatus('Requesting microphone permission...');
    const micRequest = navigator.mediaDevices.getUserMedia({ audio: true });
    const micTimeout = setTimeout(() => {
      setStatus('Waiting for microphone permission (please allow)');
    }, 10000);
    micRequest
      .then(() => {
        clearTimeout(micTimeout);
        console.log('[LiveContext] Microphone permission granted');
      })
      .catch((permError) => {
        clearTimeout(micTimeout);
        console.warn('[LiveContext] Microphone permission denied or failed:', permError);
        setStatus('Microphone permission denied');
      })
      .finally(() => {
        // Always try to enumerate devices after permission attempt
        navigator.mediaDevices?.enumerateDevices().then(devices => {
          console.log('[LiveContext] All devices:', devices);
          const inputs = devices
            .filter(device => device.kind === 'audioinput')
            .map(device => ({ deviceId: device.deviceId, label: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }));
          console.log('[LiveContext] Filtered audio inputs:', inputs);
          setAudioInputs(inputs);
          if (inputs.length > 0 && !selectedInputId) {
            setSelectedInputId(inputs[0].deviceId);
          }
        }).catch(error => {
          console.error('[LiveContext] Failed to enumerate audio devices:', error);
        });
      });

    return () => {
      voiceServiceRef.current?.stopListening();
    };
  }, []);

  useEffect(() => {
    const storedHistory = loadLiveHistory();
    if (storedHistory.length > 0) {
      conversationHistoryRef.current = storedHistory;
    }
  }, []);

  const sendMessageToMain = async (message: string): Promise<string> => {
    const startTime = Date.now();
    console.log('[LiveContext] sendMessageToMain() called with message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    console.log('[LiveContext] Active requests before this call:', activeRequestsRef.current.size);

    return new Promise((resolve, reject) => {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.sendMessage || !api?.onMessage) {
        console.error('[LiveContext] Electron API not available');
        reject(new Error('Electron API not available'));
        return;
      }

      // Generate unique correlation ID for this request
      const correlationId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('[LiveContext] Generated correlation ID:', correlationId);

      // Track this request
      activeRequestsRef.current.add(correlationId);
      console.log('[LiveContext] Active requests after adding:', activeRequestsRef.current.size);

      let resolved = false;
      let cleanup: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Cleanup function to ensure we always remove listeners
      const doCleanup = () => {
        if (cleanup) {
          try {
            cleanup();
            cleanup = null;
            console.log('[LiveContext] Listener cleaned up for correlation ID:', correlationId);
          } catch (e) {
            console.error('[LiveContext] Error during cleanup:', e);
          }
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        // Remove from active requests
        activeRequestsRef.current.delete(correlationId);
        console.log('[LiveContext] Active requests after cleanup:', activeRequestsRef.current.size);
      };

      // Listen for the response with matching correlation ID
      cleanup = api.onMessage((responseMessage: any) => {
        const receiveTime = Date.now();
        const elapsed = receiveTime - startTime;
        console.log('[LiveContext] Received response after', elapsed, 'ms, correlation ID:', responseMessage.correlationId, 'expected:', correlationId);

        // Defensive: handle missing correlationId in response
        if (!responseMessage.correlationId) {
          console.warn('[LiveContext] Response missing correlation ID after', elapsed, 'ms, accepting anyway');
          if (!resolved && responseMessage.role === 'assistant') {
            resolved = true;
            doCleanup();
            console.log('[LiveContext] Resolved with missing correlationId after', elapsed, 'ms');
            resolve(responseMessage.content);
          }
          return;
        }

        // Only handle responses that match our correlation ID
        if (!resolved && responseMessage.role === 'assistant' && responseMessage.correlationId === correlationId) {
          console.log('[LiveContext] Response matched correlation ID, resolving after', elapsed, 'ms');
          resolved = true;
          doCleanup();
          resolve(responseMessage.content);
        } else if (responseMessage.correlationId !== correlationId) {
          console.log('[LiveContext] Ignoring response with mismatched correlation ID (expected:', correlationId, 'got:', responseMessage.correlationId, ')');
        }
      });

      // Enhance the message with context-aware AI suggestions and Voice Mode flag
      const baseEnhancedMessage = contextAwareAIService.enhancePromptWithContext(message);
      const enhancedMessage = `[SYSTEM: LIVE SYNAPSE VOICE SESSION ACTIVE - FOLLOW PACING RULES]\n${baseEnhancedMessage}`;
      console.log('[LiveContext] Enhanced message:', enhancedMessage.substring(0, 200) + (enhancedMessage.length > 200 ? '...' : ''));

      // Send the enhanced message with persisted context and correlation ID
      console.log('[LiveContext] Sending message to main process with correlation ID:', correlationId, 'at', new Date(startTime).toISOString());
      const payload = {
        ...buildVoicePayload(enhancedMessage),
        correlationId,
      };
      api.sendMessage(payload).catch((error: any) => {
        const errorTime = Date.now();
        const elapsed = errorTime - startTime;
        console.error('[LiveContext] Error sending message to main after', elapsed, 'ms:', error);
        if (!resolved) {
          resolved = true;
          doCleanup();
          reject(error);
        }
      });

      // Timeout after 35 seconds (longer than backend timeout)
      timeoutId = setTimeout(() => {
        if (!resolved) {
          const timeoutElapsed = Date.now() - startTime;
          console.error('[LiveContext] Response timeout after', timeoutElapsed, 'ms for correlation ID:', correlationId);
          console.error('[LiveContext] Active requests at timeout:', activeRequestsRef.current.size, Array.from(activeRequestsRef.current));
          resolved = true;
          doCleanup();
          reject(new Error('Response timeout'));
        }
      }, 35000);
    });
  };

  const handleTranscription = async (text: string, sessionId?: number, isTextInput: boolean = false) => {
    console.log(`[LiveContext] Received transcription: "${text}" (session: ${sessionId}, current: ${currentSessionRef.current}, isTextInput: ${isTextInput})`);

    // Validate session ID to prevent old transcriptions from interfering
    if (sessionId !== undefined && sessionId !== currentSessionRef.current) {
      console.log(`[LiveContext] Ignoring old transcription from session ${sessionId} (current: ${currentSessionRef.current})`);
      return;
    }

    // Check if transcription is disabled (after disconnect)
    // But allow transcriptions if we just reconnected (isFreshlyConnectedRef is true).
    // Text input always bypasses this guard — it works independently of the voice session.
    if (!isTextInput && transcriptionDisabled && !isActive && !isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Ignoring transcription - transcription disabled after disconnect and not actively connected');
      return;
    }

    // ignore any transcription that arrives too soon after Mossy finished speaking
    // ONLY for voice input (prevents audio feedback), NOT for text input
    const now = Date.now();
    if (!isTextInput && lastSpeakEndRef.current && now - lastSpeakEndRef.current < 600) {
      console.log('[LiveContext] Ignoring transcription - within grace period after speaking');
      return;
    }

    // If this is a fresh connection, reset the flag after processing the first transcription
    if (isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Processing first transcription after fresh connect, resetting flag');
      isFreshlyConnectedRef.current = false;
    }

    // Honour the mute button — discard VOICE input while the user has silenced the mic.
    // Text input is never gated by the mute button: the mic mute only affects voice capture.
    // isMutedRef stays in sync with the isMuted state even though this callback
    // is a stale closure registered at connect() time.
    if (isMutedRef.current && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - muted');
      return;
    }

    // Check if we're disconnecting (user manually ended the session).
    // Use the ref so the stale closure always sees the current value.
    // Text input is allowed to complete even during a disconnect so the user
    // gets their response before the session fully closes.
    if (isDisconnectingRef.current && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - voice session is disconnecting');
      return;
    }

    // Prevent audio feedback - don't transcribe VOICE while TTS is active.
    // Text input is always accepted regardless of speaking state.
    // Use modeRef so the stale closure always sees the current mode value.
    if (modeRef.current === 'speaking' && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - currently speaking (audio feedback prevention)');
      return;
    }

    console.log('[LiveContext] Processing transcription:', text);
    setTranscription(text);
    setMode('processing');
    // Update the watchdog reference time so the 25-second stall-detection timer
    // starts from now.  This must be set for BOTH voice and text-input paths
    // because the useEffect watchdog only fires in 'processing' mode and checks
    // this ref — if it is 0 (initial value) the condition is always true and the
    // watchdog would prematurely restart the link for text-input messages.
    processingStartRef.current = Date.now();
    // successful transcription—clear any previous STT error tally
    setSttErrors(0);

    // Capture session ID at START of AI processing so we can validate it hasn't changed
    // This prevents discarding valid responses if disconnect() gets called during processing
    const sessionIdAtStart = currentSessionRef.current;

    // Mark that we're processing a response — prevents disconnect from interrupting
    isProcessingResponseRef.current = true;

    try {
      // Add to conversation history
      pushLiveHistory({ role: 'user', content: text });

      // Send to LocalAIEngine for response (with web search injection and full system context)
      const aiStartTime = Date.now();
      console.log('[LiveContext] 🎯 Calling LocalAIEngine.generateResponse for voice');
      const systemContext = await generateSystemContextFromStorage(text);
      const systemInstruction = getFullSystemInstruction(systemContext);
      const priorHistory = conversationHistoryRef.current.slice(-30);
      const aiResult = await LocalAIEngine.generateResponse(text, systemInstruction, priorHistory);
      const aiDuration = Date.now() - aiStartTime;
      console.log('[LiveContext] ✅ AI response received - duration:', aiDuration, 'ms');
      const response = aiResult.content || 'Sorry, I encountered an error processing your request.';

      // Check if session ID changed (user disconnected, or session ended for another reason).
      // Use the captured ID so we don't discard valid responses from disconnect() being called during processing.
      // Text input responses are always delivered — the voice session state is irrelevant for text.
      if (!isTextInput && (currentSessionRef.current === 0 || currentSessionRef.current !== sessionIdAtStart)) {
        console.log('[LiveContext] Ignoring AI response - voice session ended during processing (session was:', sessionIdAtStart, 'now:', currentSessionRef.current + ')');
        isProcessingResponseRef.current = false;
        return;
      }

      // Add AI response to history
      pushLiveHistory({ role: 'assistant', content: response });
      updateVoiceWorkingMemory();
      console.log('[LiveContext] AI response received, about to speak:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));

      // Store the response text so the UI can display it for users without speakers
      setLastResponse(response);

      // Speak the response
      if (voiceServiceRef.current) {
        const speakStartTime = Date.now();
        console.log('[LiveContext] 🔊 Starting TTS playback - response length:', response.length, 'chars');
        setMode('speaking'); // Prevent transcriptions from capturing TTS audio
        await voiceServiceRef.current.speak(response);
        const speakDuration = Date.now() - speakStartTime;
        console.log('[LiveContext] 🔊 TTS playback complete - duration:', speakDuration, 'ms');
        lastSpeakEndRef.current = Date.now(); // mark when speaking finished
      } else {
        console.error('[LiveContext] voiceServiceRef.current is null, cannot speak');
      }

      // Final check to see if we're still active before resetting mode
      if (currentSessionRef.current !== 0) {
        setMode('listening');
      } else {
        setMode('idle');
      }
    } catch (error) {
      console.error('Conversation error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Error: ${msg}`);
      setMode('idle');
      // notify user more visibly via console; showNotification is not available in preload
      console.warn('[LiveContext] Voice session error:', msg);
      // if the backend appears hung, restart the voice link
      // Only restart if it's a TIMEOUT error, not general AI errors
      if (/timeout/i.test(msg)) {
        console.warn('[LiveContext] restarting voice link after timeout error');
        disconnect();
        setTimeout(() => {
          connect().catch(() => { });
        }, 1000);
      }
    } finally {
      // Mark processing complete so disconnect can proceed if needed
      isProcessingResponseRef.current = false;
    }
  };

  // count consecutive backend failures so we can fall back automatically
  const [sttErrors, setSttErrors] = useState(0);
  const sttErrorsRef = useRef(0);
  const sttFallbackErrorPattern = /backend|deepgram|transcribe|network|invalid[_\s-]?api[_\s-]?key|incorrect[_\s-]?api[_\s-]?key|unauthorized|401/i;

  const handleVoiceError = (error: string) => {
    setStatus(`Voice Error: ${error}`);
    setMode('idle');

    const currentProvider = voiceServiceRef.current?.getSttProvider?.();
    const browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    if (currentProvider === 'backend' && browserSupported) {
      console.warn('[LiveContext] Backend STT failure detected; falling back to browser STT:', error);
      if (voiceServiceRef.current) {
        setStatus('Switching to browser STT...');
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.setSttProvider('browser');
        voiceServiceRef.current.startListening(
          (t, sid) => handleTranscription(t, sid),
          handleVoiceError,
          handleModeChange
        );
      }
      sttErrorsRef.current = 0;
      setSttErrors(0);
      return;
    }

    // detect backend/transcription/auth related errors
    if (sttFallbackErrorPattern.test(error)) {
      sttErrorsRef.current += 1;
      setSttErrors(sttErrorsRef.current);
    }

    // if we've seen repeated backend-like failures, switch to browser STT for stability
    if (sttErrorsRef.current >= 2 && browserSupported && currentProvider !== 'browser') {
      console.warn('[LiveContext] falling back to browser STT due to repeated transcription errors');
      if (voiceServiceRef.current) {
        setStatus('Switching to browser STT...');
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.setSttProvider('browser');
        voiceServiceRef.current.startListening(
          (t, sid) => handleTranscription(t, sid),
          handleVoiceError,
          handleModeChange
        );
      }
      sttErrorsRef.current = 0;
      setSttErrors(0);
    }
  };

  const processingStartRef = useRef<number>(0);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'idle' | 'listening' | 'processing' | 'speaking');
    switch (newMode) {
      case 'listening':
        setStatus('Listening...');
        break;
      case 'processing':
        setStatus('Processing...');
        processingStartRef.current = Date.now();
        break;
      case 'speaking':
        setStatus('Speaking...');
        break;
      default:
        setStatus('Ready');
    }
  };

  // watchdog: if we remain in processing state for too long, restart the link
  // Cloud LLM APIs can take 30-40+ seconds, so use 50s threshold
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'processing' && isActive) {
      const PROCESSING_TIMEOUT = 50000; // 50 seconds for LLM response (allows slow networks/APIs)
      const CHECK_INTERVAL = 51000;     // Check after timeout + 1s buffer
      timer = setTimeout(() => {
        if (Date.now() - processingStartRef.current > PROCESSING_TIMEOUT) {
          setStatus('Processing taking too long, restarting link...');
          console.warn('[LiveContext] Voice AI stuck; reconnecting (exceeded 50s timeout)');
          disconnect();
          setTimeout(() => connect().catch(() => { }), 1000);
        }
      }, CHECK_INTERVAL);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mode, isActive]);

  // if we enter listening mode and no transcription arrives after a while
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'listening' && isActive) {
      timer = setTimeout(() => {
        if (!transcription) {
          setStatus('No speech detected yet – please speak or check your mic');
        }
      }, 15000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mode, isActive, transcription]);

  const checkVoicePipeline = async (): Promise<void> => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.getSettings) {
      throw new Error('Voice pipeline unavailable: Electron API not ready.');
    }

    const settings = await api.getSettings();
    const backendBaseUrl = String(settings?.backendBaseUrl || '').trim().replace(/\/$/, '');
    const whisperLocalUrl = String(settings?.whisperLocalUrl || '').trim();
    const backendTokenConfigured = Boolean(settings?.backendTokenConfigured);

    // Accept the session if at least one STT provider is available:
    //  a) local Whisper server (whisperLocalUrl set)
    //  b) cloud backend proxy (backendBaseUrl set)
    //  c) OpenAI API key (checked below)
    const hasAnyProvider = Boolean(whisperLocalUrl || backendBaseUrl);

    if (backendBaseUrl && !whisperLocalUrl) {
      // If a backend is configured but no local Whisper server is set, verify it is reachable.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const resp = await fetch(`${backendBaseUrl}/health`, { signal: controller.signal });
        if (!resp.ok) {
          throw new Error(`Voice backend health check failed (${resp.status}).`);
        }
      } catch (e: any) {
        const msg = e?.name === 'AbortError' ? 'Voice backend health check timed out.' : (e?.message || String(e));
        // Only hard-fail if no other provider is available
        if (!hasAnyProvider || !whisperLocalUrl) {
          throw new Error(msg);
        }
        console.warn('[LiveContext] Backend unreachable, using configured local Whisper instead:', msg);
      } finally {
        clearTimeout(timeout);
      }
    }

    const hasBrowserStt = typeof window !== 'undefined' && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
    let hasOpenAI = false;
    if (typeof api?.getSecretStatus === 'function') {
      const status = await api.getSecretStatus();
      hasOpenAI = Boolean(status?.ok && status.openai);
    }

    if (!hasAnyProvider && !hasOpenAI && !hasBrowserStt) {
      throw new Error('No voice provider configured. Set a Local Whisper URL, backend URL, add an OpenAI key, or use browser speech recognition.');
    }
  };

  const connect = async () => {
    console.log('[LiveContext] connect() called');
    if (!voiceServiceRef.current) {
      throw new Error('Voice service not initialized');
    }

    if (!voiceServiceRef.current.isSupported()) {
      throw new Error('Voice features not supported in this browser');
    }

    try {
      console.log('[LiveContext] Resetting flags before starting');
      isDisconnectingRef.current = false;
      setTranscriptionDisabled(false);
      setIsDisconnecting(false);
      setStatus('Checking voice pipeline...');

      await checkVoicePipeline();

      // Update session ID to a new unique value
      currentSessionRef.current++;
      const currentSessionId = currentSessionRef.current;
      console.log(`[LiveContext] Starting NEW voice session: ${currentSessionId}`);

      setIsActive(true);
      isFreshlyConnectedRef.current = true;

      const hasBrowserStt = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      let hasOpenAI = false;
      if (typeof api?.getSecretStatus === 'function') {
        const status = await api.getSecretStatus();
        hasOpenAI = Boolean(status?.ok && status.openai);
      }
      // Whisper/back-end STT is preferred for faster/more reliable transcription.
      // Browser speech recognition is used as a fallback when backend transcription
      // is unavailable or fails during the live voice session.
      const preferredSttProvider = whisperLocalUrl || backendBaseUrl || hasOpenAI ? 'backend' : hasBrowserStt ? 'browser' : 'backend';
      voiceServiceRef.current.setSttProvider(preferredSttProvider);
      console.log('[LiveContext] Selected initial STT provider:', preferredSttProvider, { whisperLocalUrl, backendBaseUrl, hasOpenAI, hasBrowserStt });

      console.log('[LiveContext] Calling voiceService.startListening()');
      voiceServiceRef.current.startListening(
        (text) => handleTranscription(text, currentSessionId),
        handleVoiceError,
        handleModeChange
      );

      console.log('[LiveContext] startListening() completed, setting mode to listening');
      setMode('listening');
      setStatus('Listening');
      console.log('[LiveContext] connect() completed successfully');
    } catch (error: any) {
      console.log('[LiveContext] connect() failed:', error);
      setIsActive(false);
      isFreshlyConnectedRef.current = false;
      // Schedule retry only when the failure was NOT caused by a manual disconnect.
      // Use the ref (not the stale closure state) for an accurate current value.
      if (!isDisconnectingRef.current) {
        setStatus('Connection failed, retrying...');
        setTimeout(() => {
          connect().catch(() => { });
        }, 5000);
      }
      throw error;
    }
  };

  const disconnect = (manual?: boolean) => {
    console.log('[LiveContext] disconnect() called, manual:', manual);

    // Invalidate current session immediately
    const lastSessionId = currentSessionRef.current;
    currentSessionRef.current = 0;

    isDisconnectingRef.current = true;
    setIsDisconnecting(true);
    setTranscriptionDisabled(true);
    setIsActive(false);
    setMode('idle');
    setStatus('Disconnected');
    isFreshlyConnectedRef.current = false;

    if (voiceServiceRef.current) {
      console.log('[LiveContext] Stopping voice service for session:', lastSessionId);
      voiceServiceRef.current.stopListening();
    }

    // Stop legacy browser TTS if active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.log('[LiveContext] disconnect completed cleanup');
  };

  /**
   * Stop Mossy speaking immediately without ending the voice session.
   * Useful as a "stop talking" button so the user can interrupt long responses.
   */
  const stopSpeaking = () => {
    console.log('[LiveContext] stopSpeaking() called');
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopSpeaking();
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (mode === 'speaking') {
      setMode('listening');
      setStatus('Listening...');
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    console.log('[LiveContext] toggleMute called, transitioning to:', newMutedState ? 'MUTED' : 'UNMUTED');

    setIsMuted(newMutedState);
    isMutedRef.current = newMutedState;

    // When unmuting, proactively restart recording to handle cases where the voice
    // session got stuck due to silence detection or other edge cases while muted.
    if (!newMutedState && isActive && voiceServiceRef.current) {
      console.log('[LiveContext] Unmuting: proactively restarting recording');
      setTimeout(() => {
        // Use the ref which is immediately updated, not the state (which may not have updated yet due to React batching)
        if (!isMutedRef.current && isActive && voiceServiceRef.current) {
          console.log('[LiveContext] Calling safeMicrophoneRestart...');
          try {
            voiceServiceRef.current.safeMicrophoneRestart();
          } catch (e) {
            console.warn('[LiveContext] Failed to restart recording on unmute:', e);
          }
        }
      }, 100);
    }
  };
  const updateAvatar = async (file: File) => {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Resize to max 512px and encode as JPEG to keep localStorage size manageable
      const resized = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 512;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = dataUrl;
      });
      localStorage.setItem(AVATAR_STORAGE_KEY, resized);
      setCustomAvatar(resized);
    } catch (e) {
      console.warn('[LiveContext] Failed to update avatar:', e);
    }
  };
  const setAvatarFromUrl = async (url: string) => {
    try {
      // Only accept https URLs or data URLs to prevent arbitrary content injection
      const isDataUrl = url.startsWith('data:image/');
      const isHttpsUrl = /^https:\/\/.+/i.test(url);
      if (!isDataUrl && !isHttpsUrl) {
        console.warn('[LiveContext] Rejected avatar URL: must be a data: image URL or https:// URL');
        return;
      }
      localStorage.setItem(AVATAR_STORAGE_KEY, url);
      setCustomAvatar(url);
    } catch (e) {
      console.warn('[LiveContext] Failed to set avatar from URL:', e);
    }
  };
  const clearAvatar = () => {
    try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch { /* ignore */ }
    setCustomAvatar(null);
  };

  // Text input handler for users without microphone
  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    // Text input works independently of the voice session — we never require the
    // voice pipeline (STT backend / Whisper / OpenAI key) just to handle typed
    // messages.  The AI response is routed through LocalAIEngine (Groq) the same
    // way regardless of whether voice is active.
    //
    // If voice is NOT active we use session ID 0 so the response-delivery check
    // inside handleTranscription is bypassed for isTextInput === true.
    const currentSessionId = currentSessionRef.current;
    try {
      await handleTranscription(text, currentSessionId, true); // true = isTextInput
    } catch (err) {
      console.error('[LiveContext] Text message processing failed:', err);
      throw err;
    }
  };

  return (
    <LiveContext.Provider
      value={{
        isActive,
        isMuted,
        toggleMute,
        status,
        volume,
        mode,
        transcription,
        micLevel,
        audioInputs,
        selectedInputId,
        setSelectedInputId,
        connect,
        disconnect,
        stopSpeaking,
        customAvatar,
        updateAvatar,
        setAvatarFromUrl,
        clearAvatar,
        avatarLocked,
        cortexMemory,
        setCortexMemory,
        projectData,
        setProjectData,
        isLiveActive: isActive,
        isLiveMuted: isMuted,
        toggleLiveMute: toggleMute,
        disconnectLive: disconnect,
        sendTextMessage,
        lastResponse,
        ...(process.env.NODE_ENV === 'test' ? { __test_handleTranscription: handleTranscription, __test_setLastSpeakEnd: (ts: number) => { lastSpeakEndRef.current = ts; } } : {}),
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export default LiveContext;
