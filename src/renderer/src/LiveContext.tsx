// ...existing code...
export function useLive() {
  const ctx = React.useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within a LiveProvider');
  return ctx;
}
import React, { createContext, useState, ReactNode, useRef, useEffect } from 'react';
import { VoiceService, VoiceServiceConfig } from './voice-service';
import { contextAwareAIService } from './ContextAwareAIService';

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
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  // Initialize voice service
  useEffect(() => {
    const config: VoiceServiceConfig = {
      sttProvider: 'backend', // Use backend STT if available, fallback to browser
      ttsProvider: 'browser', // Default to browser TTS
      deepgramKey: undefined, // API keys accessed through main process
      elevenlabsKey: undefined, // API keys accessed through main process
    };

    voiceServiceRef.current = new VoiceService(config);
    voiceServiceRef.current.initialize().catch(console.error);

    // Get audio inputs
    console.log('[LiveContext] Enumerating audio devices...');
    
    // First try to request microphone permission if needed
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('[LiveContext] Microphone permission granted');
      })
      .catch((permError) => {
        console.warn('[LiveContext] Microphone permission denied or failed:', permError);
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

  const sendMessageToMain = async (message: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI?.sendMessage || !window.electronAPI?.onMessage) {
        reject(new Error('Electron API not available'));
        return;
      }

      let resolved = false;
      let cleanup: (() => void) | null = null;

      // Listen for the response
      cleanup = window.electronAPI.onMessage((responseMessage: any) => {
        if (!resolved && responseMessage.role === 'assistant') {
          resolved = true;
          if (cleanup) cleanup();
          resolve(responseMessage.content);
        }
      });

      // Enhance the message with context-aware AI suggestions and Voice Mode flag
      const baseEnhancedMessage = contextAwareAIService.enhancePromptWithContext(message);
      const enhancedMessage = `[SYSTEM: LIVE SYNAPSE VOICE SESSION ACTIVE - FOLLOW PACING RULES]\n${baseEnhancedMessage}`;

      // Send the enhanced message
      window.electronAPI.sendMessage(enhancedMessage).catch((error) => {
        if (!resolved) {
          resolved = true;
          if (cleanup) cleanup();
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
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

    try {
      // Add to conversation history
      conversationHistoryRef.current.push({ role: 'user', content: text });

      // Send to AI for response
      const response = await sendMessageToMain(text);

      // Check again if we're still active (user might have disconnected during AI processing)
      if (currentSessionRef.current === 0) {
        console.log('[LiveContext] Ignoring AI response - voice session ended during processing');
        return;
      }

      // Add AI response to history
      conversationHistoryRef.current.push({ role: 'assistant', content: response });

      // Speak the response
      if (voiceServiceRef.current) {
        await voiceServiceRef.current.speak(response);
      }

      // Final check to see if we're still active before resetting mode
      if (currentSessionRef.current !== 0) {
        setMode('listening');
      } else {
        setMode('idle');
      }
    } catch (error) {
      console.error('Conversation error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMode('idle');
    }
  };

  const handleVoiceError = (error: string) => {
    setStatus(`Voice Error: ${error}`);
    setMode('idle');
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'idle' | 'listening' | 'processing' | 'speaking');
    switch (newMode) {
      case 'listening':
        setStatus('Listening...');
        break;
      case 'processing':
        setStatus('Processing...');
        break;
      case 'speaking':
        setStatus('Speaking...');
        break;
      default:
        setStatus('Ready');
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
    } catch (error) {
      console.log('[LiveContext] connect() failed:', error);
      setIsActive(false);
      isFreshlyConnectedRef.current = false;
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
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export default LiveContext;
