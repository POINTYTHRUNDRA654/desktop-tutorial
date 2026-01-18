import React, { createContext, useContext, useRef, useState, ReactNode, useEffect } from 'react';

/**
 * Minimal OpenAI Voice Context - rebuilt for stability
 * Uses IPC to call OpenAI APIs from main process (not browser)
 * Only handles state and audio coordination
 */

interface OpenAIVoiceContextType {
  isActive: boolean;
  isMuted: boolean;
  status: string;
  transcription: string;
  volume: number;
  mode: 'idle' | 'listening' | 'processing' | 'speaking';
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

const OpenAIVoiceCtx = createContext<OpenAIVoiceContextType | undefined>(undefined);

export const useOpenAIVoice = () => {
  const ctx = useContext(OpenAIVoiceCtx);
  if (!ctx) {
    throw new Error('useOpenAIVoice must be used within OpenAIVoiceProvider');
  }
  return ctx;
};

export const OpenAIVoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [transcription, setTranscription] = useState('');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  // Refs for persistence across renders
  const apiKeyRef = useRef<string>('');
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const isProcessingRef = useRef(false);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  /**
   * Convert Float32 audio samples to Int16 PCM base64
   */
  const encodePCMToBase64 = (samples: Float32Array): string => {
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      int16[i] = samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7FFF;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  /**
   * Decode audio from base64 and play it
   */
  const playAudioFromBase64 = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) return;
      
      const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const buffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setMode('listening');
      source.start(0);
    } catch (err) {
      console.error('[OpenAI] Playback error:', err);
    }
  };

  /**
   * Main connection function
   */
  const connect = async () => {
    try {
      console.log('[OpenAI] Connecting...');
      setStatus('Initializing...');

      // Get API key from environment or localStorage
      let apiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
      
      if (!apiKey) {
        setStatus('Please provide OpenAI API key');
        throw new Error('OpenAI API key not found. Set REACT_APP_OPENAI_API_KEY environment variable or save key to localStorage');
      }

      apiKeyRef.current = apiKey;
      conversationRef.current = [];

      // Request microphone
      setStatus('Requesting microphone...');
      console.log('[OpenAI] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      console.log('[OpenAI] Microphone acquired');

      // Setup audio processing
      setStatus('Setting up audio...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Capture audio
      processor.onaudioprocess = (event) => {
        if (!isMuted) {
          const inputData = event.inputBuffer.getChannelData(0);
          audioBufferRef.current.push(new Float32Array(inputData));

          // Calculate volume
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setVolume(Math.min(100, rms * 500));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsActive(true);
      setMode('listening');
      setStatus('Listening...');
      console.log('[OpenAI] Connected - unlimited session duration');
    } catch (err: any) {
      console.error('[OpenAI] Connection error:', err);
      setStatus(`Error: ${err.message}`);
      setIsActive(false);
    }
  };

  const disconnect = () => {
    console.log('[OpenAI] Disconnecting...');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsActive(false);
    setMode('idle');
    setStatus('Disconnected');
    audioBufferRef.current = [];
  };

  /**
   * Process audio every 2 seconds - call IPC handlers
   */
  useEffect(() => {
    if (!isActive) return;

    const processAudio = async () => {
      try {
        // Check if we have audio and IPC available
        if (audioBufferRef.current.length === 0) return;
        if (!window.electron?.api?.openaiTranscribe) {
          console.error('[OpenAI] IPC not available');
          return;
        }
        if (isMuted) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        // Combine audio buffers
        const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buf of audioBufferRef.current) {
          combined.set(buf, offset);
          offset += buf.length;
        }
        audioBufferRef.current = [];

        // Transcribe
        setMode('processing');
        setStatus('Transcribing...');
        const base64Audio = encodePCMToBase64(combined);
        
        console.log('[OpenAI] Calling transcribe handler...');
        const transcribeResult = await window.electron.api.openaiTranscribe(base64Audio, apiKeyRef.current);

        if (!transcribeResult?.success || !transcribeResult?.text) {
          console.error('[OpenAI] Transcription failed:', transcribeResult?.error);
          setMode('listening');
          setStatus('Listening...');
          isProcessingRef.current = false;
          return;
        }

        const userText = transcribeResult.text.trim();
        if (!userText) {
          setMode('listening');
          setStatus('Listening...');
          isProcessingRef.current = false;
          return;
        }

        console.log('[OpenAI] Transcribed:', userText);
        setTranscription(userText);
        conversationRef.current.push({ role: 'user', content: userText });

        // Limit conversation history
        if (conversationRef.current.length > 50) {
          conversationRef.current = conversationRef.current.slice(-50);
        }

        // Get chat response
        setStatus('Thinking...');
        console.log('[OpenAI] Calling chat handler...');
        const chatResult = await window.electron.api.openaiChat(
          conversationRef.current,
          apiKeyRef.current
        );

        if (!chatResult?.success || !chatResult?.text) {
          console.error('[OpenAI] Chat failed:', chatResult?.error);
          setMode('listening');
          setStatus('Listening...');
          isProcessingRef.current = false;
          return;
        }

        console.log('[OpenAI] Chat response:', chatResult.text);
        conversationRef.current.push({ role: 'assistant', content: chatResult.text });

        // Synthesize speech
        setMode('speaking');
        setStatus('Speaking...');
        console.log('[OpenAI] Calling synthesize handler...');
        
        if (!window.electron?.api?.synthesizeSpeech) {
          console.error('[OpenAI] TTS not available');
          setMode('listening');
          setStatus('Listening...');
          isProcessingRef.current = false;
          return;
        }

        const ttsResult = await window.electron.api.synthesizeSpeech({
          text: chatResult.text,
          voiceName: 'en-US-Neural2-C',
          audioEncoding: 'MP3'
        });

        if (ttsResult) {
          await playAudioFromBase64(ttsResult);
        }

        setMode('listening');
        setStatus('Listening...');
      } catch (err) {
        console.error('[OpenAI] Processing error:', err);
        setMode('listening');
        setStatus('Error - resuming...');
      } finally {
        isProcessingRef.current = false;
      }
    };

    const interval = setInterval(processAudio, 2000);
    return () => clearInterval(interval);
  }, [isActive, isMuted]);

  return (
    <OpenAIVoiceCtx.Provider
      value={{
        isActive,
        isMuted,
        status,
        transcription,
        volume,
        mode,
        connect,
        disconnect,
        toggleMute,
      }}
    >
      {children}
    </OpenAIVoiceCtx.Provider>
  );
};
