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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);

  const PROCESS_INTERVAL_MS = Number(import.meta.env.VITE_OPENAI_VOICE_PROCESS_INTERVAL_MS ?? 650);
  const MIN_AUDIO_SECONDS = Number(import.meta.env.VITE_OPENAI_VOICE_MIN_AUDIO_SECONDS ?? 0.65);
  const SAMPLE_RATE_HZ = 16000;

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  /**
   * Convert audio blob to PCM16 base64 for OpenAI
   */
  const convertBlobToPCM16Base64 = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0); // Use first channel
      
      // Convert to Int16 PCM
      const int16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        int16[i] = channelData[i] < 0 ? channelData[i] * 0x8000 : channelData[i] * 0x7FFF;
      }
      
      // Convert to base64
      const uint8 = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return btoa(binary);
    } finally {
      audioContext.close();
    }
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
      source.onended = () => {
        setMode('listening');
        setStatus('Listening...');
      };
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
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
      
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

      // Setup audio processing with MediaRecorder
      setStatus('Setting up audio...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      // Create analyser for volume monitoring
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Monitor volume
      const monitorVolume = () => {
        if (!isMuted && analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setVolume(Math.min(100, average * 0.4)); // Scale appropriately
          
          if (isActive) {
            requestAnimationFrame(monitorVolume);
          }
        }
      };
      monitorVolume();

      // Use MediaRecorder instead of deprecated ScriptProcessorNode
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording with small time slices for real-time processing
      mediaRecorder.start(100); // 100ms chunks

      setIsActive(true);
      setMode('listening');
      setStatus('Listening...');
      console.log('[OpenAI] Connected - using MediaRecorder');
    } catch (err: any) {
      console.error('[OpenAI] Connection error:', err);
      setStatus(`Error: ${err.message}`);
      setIsActive(false);
    }
  };

  const disconnect = () => {
    console.log('[OpenAI] Disconnecting...');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsActive(false);
    setMode('idle');
    setStatus('Disconnected');
    audioChunksRef.current = [];
  };

  /**
   * Process audio every 2 seconds - call IPC handlers
   */
  useEffect(() => {
    if (!isActive) return;

    const processAudio = async () => {
      try {
        const api = (window as any).electron?.api as any;

        // Check if we have audio chunks and IPC available
        if (audioChunksRef.current.length === 0) return;
        if (!api?.openaiTranscribe) {
          console.error('[OpenAI] IPC not available');
          return;
        }
        if (isMuted) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        // Combine audio chunks into a single blob
        const combinedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Convert to PCM16 base64
        const base64Audio = await convertBlobToPCM16Base64(combinedBlob);
        
        // Check minimum audio length (rough estimate)
        if (base64Audio.length < 1000) { // Very rough check for minimum audio
          isProcessingRef.current = false;
          return;
        }

        // Transcribe
        setMode('processing');
        setStatus('Transcribing...');
        
        console.log('[OpenAI] Calling transcribe handler...');
        const transcribeResult = await api.openaiTranscribe(base64Audio, apiKeyRef.current);

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
        const chatResult = await api.openaiChat(
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
        
        if (!api?.synthesizeSpeech) {
          console.error('[OpenAI] TTS not available');
          setMode('listening');
          setStatus('Listening...');
          isProcessingRef.current = false;
          return;
        }

        const ttsResult = await api.synthesizeSpeech({
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

    const interval = setInterval(processAudio, PROCESS_INTERVAL_MS);
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
