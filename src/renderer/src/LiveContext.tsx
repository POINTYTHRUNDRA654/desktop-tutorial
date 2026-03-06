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
  // test-only helper
  __test_handleTranscription?: (text: string, sessionId?: number) => Promise<void>;
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
  const [micLevel, setMicLevel] = useState(0);
  const isFreshlyConnectedRef = useRef(false);
  const currentSessionRef = useRef(0);
  const [audioInputs, setAudioInputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [avatarLocked, setAvatarLocked] = useState(false);
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any | null>(null);

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationHistoryRef = useRef<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const lastSpeakEndRef = useRef<number>(0);

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
      elevenlabsKey: undefined, // API keys accessed through main process
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
    console.log('[LiveContext] sendMessageToMain() called with message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    return new Promise((resolve, reject) => {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.sendMessage || !api?.onMessage) {
        console.error('[LiveContext] Electron API not available');
        reject(new Error('Electron API not available'));
        return;
      }

      let resolved = false;
      let cleanup: (() => void) | null = null;

      // Listen for the response
      cleanup = api.onMessage((responseMessage: any) => {
        console.log('[LiveContext] Received response from main:', responseMessage);
        if (!resolved && responseMessage.role === 'assistant') {
          resolved = true;
          if (cleanup) cleanup();
          resolve(responseMessage.content);
        }
      });

      // Enhance the message with context-aware AI suggestions and Voice Mode flag
      const baseEnhancedMessage = contextAwareAIService.enhancePromptWithContext(message);
      const enhancedMessage = `[SYSTEM: LIVE SYNAPSE VOICE SESSION ACTIVE - FOLLOW PACING RULES]\n${baseEnhancedMessage}`;
      console.log('[LiveContext] Enhanced message:', enhancedMessage.substring(0, 200) + (enhancedMessage.length > 200 ? '...' : ''));

      // Send the enhanced message with persisted context
      console.log('[LiveContext] Sending message to main process...');
      const payload = buildVoicePayload(enhancedMessage);
      api.sendMessage(payload).catch((error: any) => {
        console.error('[LiveContext] Error sending message to main:', error);
        if (!resolved) {
          resolved = true;
          if (cleanup) cleanup();
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          console.error('[LiveContext] Response timeout after 30 seconds');
          resolved = true;
          if (cleanup) cleanup();
          reject(new Error('Response timeout'));
        }
      }, 30000);
    });
  };

  const handleTranscription = async (text: string, sessionId?: number) => {
    console.log(`[LiveContext] Received transcription: "${text}" (session: ${sessionId}, current: ${currentSessionRef.current})`);
    
    // Validate session ID to prevent old transcriptions from interfering
    if (sessionId !== undefined && sessionId !== currentSessionRef.current) {
      console.log(`[LiveContext] Ignoring old transcription from session ${sessionId} (current: ${currentSessionRef.current})`);
      return;
    }
    
    // Check if transcription is disabled (after disconnect)
    // But allow transcriptions if we just reconnected (isFreshlyConnectedRef is true)
    if (transcriptionDisabled && !isActive && !isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Ignoring transcription - transcription disabled after disconnect and not actively connected');
      return;
    }

    // ignore any transcription that arrives too soon after Mossy finished speaking
    const now = Date.now();
    if (lastSpeakEndRef.current && now - lastSpeakEndRef.current < 600) {
      console.log('[LiveContext] Ignoring transcription - within grace period after speaking');
      return;
    }

    // If this is a fresh connection, reset the flag after processing the first transcription
    if (isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Processing first transcription after fresh connect, resetting flag');
      isFreshlyConnectedRef.current = false;
    }

    // Check if we're disconnecting (user manually ended the session)
    if (isDisconnecting) {
      console.log('[LiveContext] Ignoring transcription - voice session is disconnecting');
      return;
    }

    // Prevent audio feedback - don't transcribe while TTS is active
    if (mode === 'speaking') {
      console.log('[LiveContext] Ignoring transcription - currently speaking (audio feedback prevention)');
      return;
    }

    console.log('[LiveContext] Processing transcription:', text);
    setTranscription(text);
    setMode('processing');
    // successful transcription—clear any previous STT error tally
    setSttErrors(0);

    try {
      // Add to conversation history
      pushLiveHistory({ role: 'user', content: text });

      // Send to AI for response
      const response = await sendMessageToMain(text);

      // Check again if we're still active (user might have disconnected during AI processing)
      if (currentSessionRef.current === 0) {
        console.log('[LiveContext] Ignoring AI response - voice session ended during processing');
        return;
      }

        // Add AI response to history
      pushLiveHistory({ role: 'assistant', content: response });
      updateVoiceWorkingMemory();
      console.log('[LiveContext] AI response received, about to speak:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));

      // Speak the response
      if (voiceServiceRef.current) {
        console.log('[LiveContext] Calling voiceService.speak()');
        await voiceServiceRef.current.speak(response);
        console.log('[LiveContext] voiceService.speak() completed');
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
      // notify user more visibly
      try {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (api?.showNotification) {
          api.showNotification(`Voice session error: ${msg}`);
        }
      } catch (e) {
        // best effort notification; ignore if it fails
        console.warn('[LiveContext] notification attempt failed', e);
      }
      // if the backend appears hung, restart the voice link
      if (/timeout|AI/i.test(msg)) {
        console.warn('[LiveContext] restarting voice link after error');
        disconnect();
        setTimeout(() => {
          connect().catch(() => {});
        }, 1000);
      }
    }
  };

  // count consecutive backend failures so we can fall back automatically
  const [sttErrors, setSttErrors] = useState(0);

  const handleVoiceError = (error: string) => {
    setStatus(`Voice Error: ${error}`);
    setMode('idle');

    // detect backend/transcription related errors
    if (/backend|Deepgram|transcribe|network/i.test(error)) {
      setSttErrors((e) => e + 1);
    }

    // if we've seen two failures in a row, switch to browser STT for stability
    if (sttErrors >= 1) {
      console.warn('[LiveContext] falling back to browser STT due to repeated errors');
      if (voiceServiceRef.current) {
        // stop current listening session and restart with new provider
        setStatus('Switching to browser STT...');
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.config.sttProvider = 'browser';
        voiceServiceRef.current.startListening(
          (t, sid) => handleTranscription(t, sid),
          handleVoiceError,
          handleModeChange
        );
      }
      setSttErrors(0);
      try {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (api?.showNotification) {
          api.showNotification('Mossy switched to browser STT due to backend issues');
        }
      } catch (e) {
        // best-effort notification; ignore any failure
        console.warn('[LiveContext] showNotification failed', e);
      }
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
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'processing' && isActive) {
      timer = setTimeout(() => {
        if (Date.now() - processingStartRef.current > 25000) {
          setStatus('Processing taking too long, restarting link...');
          try {
            const api = (window as any).electron?.api || (window as any).electronAPI;
            if (api?.showNotification) {
              api.showNotification('Voice AI seemed stuck; reconnecting');
            }
          } catch (e) {
            // ignore notification failure
            console.warn('[LiveContext] showNotification failed during switch', e);
          }
          disconnect();
          setTimeout(() => connect().catch(() => {}), 1000);
        }
      }, 26000);
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

    if (backendBaseUrl) {
      // If a backend is configured, verify it is reachable.
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
        if (!whisperLocalUrl) {
          throw new Error(msg);
        }
        console.warn('[LiveContext] Backend unreachable, will use local Whisper:', msg);
      } finally {
        clearTimeout(timeout);
      }
    }

    if (typeof api?.getSecretStatus === 'function') {
      const status = await api.getSecretStatus();
      const hasOpenAI = Boolean(status?.ok && status.openai);
      if (!hasAnyProvider && !hasOpenAI) {
        throw new Error('No voice provider configured. Set a Local Whisper URL or add an OpenAI key in Settings.');
      }
    } else if (!hasAnyProvider) {
      throw new Error('No voice provider configured. Set a Local Whisper URL or backend URL in Settings → Privacy/API.');
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
      // schedule retry unless user manually disconnected
      if (!isDisconnecting) {
        setStatus('Connection failed, retrying...');
        setTimeout(() => {
          connect().catch(() => {});
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

  const toggleMute = () => setIsMuted((m) => !m);
  const updateAvatar = async (file: File) => {};
  const setAvatarFromUrl = async (url: string) => {};
  const clearAvatar = () => setCustomAvatar(null);

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
        ...(process.env.NODE_ENV === 'test' ? { __test_handleTranscription: handleTranscription, __test_setLastSpeakEnd: (ts: number) => { lastSpeakEndRef.current = ts; } } : {}),
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export default LiveContext;
