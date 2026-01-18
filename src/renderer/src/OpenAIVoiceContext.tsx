import React, { createContext, useContext, useRef, useState, ReactNode, useEffect } from 'react';
<<<<<<< HEAD

/**
 * Minimal OpenAI Voice Context - rebuilt for stability and debuggability
 * Only handles state and API coordination
 * Audio capture and processing moved to separate hooks
 */
=======
import OpenAI from 'openai';
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2

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

<<<<<<< HEAD
const OpenAIVoiceCtx = createContext<OpenAIVoiceContextType | undefined>(undefined);

export const useOpenAIVoice = () => {
  const ctx = useContext(OpenAIVoiceCtx);
  if (!ctx) {
    throw new Error('useOpenAIVoice must be used within OpenAIVoiceProvider');
  }
=======
const OpenAIVoiceCtx = createContext<OpenAIVoiceContextType | null>(null);

export const useOpenAIVoice = () => {
  const ctx = useContext(OpenAIVoiceCtx);
  if (!ctx) throw new Error('useOpenAIVoice must be used within OpenAIVoiceProvider');
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
  return ctx;
};

export const OpenAIVoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
<<<<<<< HEAD
  // State
=======
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [transcription, setTranscription] = useState('');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

<<<<<<< HEAD
  // Refs for persistence across renders
  const apiKeyRef = useRef<string>('');
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
=======
  const openaiRef = useRef<OpenAI | null>(null);
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
<<<<<<< HEAD
=======
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const isProcessingRef = useRef(false);
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

<<<<<<< HEAD
  /**
   * Helper: Convert Float32 audio samples to Int16 PCM base64
   */
  const encodePCMToBase64 = (samples: Float32Array): string => {
=======
  const encodeAudioToBase64 = (samples: Float32Array): string => {
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      int16[i] = samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7FFF;
    }
<<<<<<< HEAD
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  /**
   * Helper: Decode audio from base64 and play it
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

      // Get API key from environment or localStorage (for dev)
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
=======
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(int16.buffer))));
  };

  const synthesizeVoice = async (text: string): Promise<ArrayBuffer> => {
    try {
      if (!window.electron?.api?.synthesizeSpeech) {
        console.warn('[OpenAIVoice] TTS not available');
        return new ArrayBuffer(0);
      }

      const response = await window.electron.api.synthesizeSpeech({
        text,
        voiceName: 'en-US-Neural2-C', // Zephyr voice
        audioEncoding: 'MP3'
      });
      return response;
    } catch (err) {
      console.warn('[OpenAIVoice] TTS error:', err);
      return new ArrayBuffer(0);
    }
  };

  const playAudio = async (audioData: ArrayBuffer) => {
    try {
      if (audioData.byteLength === 0) return;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const buffer = await ctx.decodeAudioData(audioData);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setMode('listening');
      };
      
      source.start(0);
    } catch (err) {
      console.warn('[OpenAIVoice] Playback error:', err);
    }
  };

  const processAudio = async () => {
    if (isProcessingRef.current || audioBufferRef.current.length === 0 || !isActive || isMuted) return;
    
    isProcessingRef.current = true;

    try {
      const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
      const combined = new Float32Array(totalLength);
      let offset = 0;
      for (const buf of audioBufferRef.current) {
        combined.set(buf, offset);
        offset += buf.length;
      }
      audioBufferRef.current = [];

      if (!openaiRef.current) return;

      setMode('processing');
      setStatus('Transcribing...');
      
      const base64Audio = encodeAudioToBase64(combined);
      const audioBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      
      const transcriptionResponse = await openaiRef.current.audio.transcriptions.create({
        file: new File([audioBytes], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
      } as any);

      const userText = transcriptionResponse.text;
      if (!userText || userText.trim().length === 0) {
        setMode('listening');
        setStatus('Listening...');
        return;
      }

      setTranscription(userText);
      conversationRef.current.push({ role: 'user', content: userText });

      setStatus('Thinking...');
      const completion = await openaiRef.current.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: conversationRef.current,
        max_tokens: 2000,
      });

      const assistantMessage = completion.choices[0].message.content;
      if (!assistantMessage) {
        setMode('listening');
        setStatus('Listening...');
        return;
      }

      conversationRef.current.push({ role: 'assistant', content: assistantMessage });
      
      if (conversationRef.current.length > 50) {
        conversationRef.current = conversationRef.current.slice(-50);
      }

      setMode('speaking');
      setStatus('Speaking...');
      const audioData = await synthesizeVoice(assistantMessage);
      await playAudio(audioData);

      setStatus('Listening...');
    } catch (err) {
      console.error('[OpenAIVoice] Processing error:', err);
      setMode('listening');
      setStatus('Error - listening...');
    } finally {
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      processAudio();
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, isMuted]);

  const connect = async () => {
    try {
      setStatus('Initializing...');
      
      // Use embedded API key - users don't need to provide their own
      const apiKey = 'YOUR_OPENAI_API_KEY_HERE'; // Replace with your actual OpenAI API key
      
      if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error('OpenAI API key not configured. Please add your key to OpenAIVoiceContext.tsx');
      }

      openaiRef.current = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      conversationRef.current = [];

      setStatus('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

<<<<<<< HEAD
      // Capture audio
      processor.onaudioprocess = (event) => {
        if (!isMuted) {
          const inputData = event.inputBuffer.getChannelData(0);
          audioBufferRef.current.push(new Float32Array(inputData));

          // Calculate volume
=======
      processor.onaudioprocess = (event) => {
        if (!isMuted) {
          const inputData = event.inputBuffer.getChannelData(0);
          
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setVolume(Math.min(100, rms * 500));
<<<<<<< HEAD
=======

          audioBufferRef.current.push(new Float32Array(inputData));
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsActive(true);
      setMode('listening');
      setStatus('Listening...');
<<<<<<< HEAD
      console.log('[OpenAI] Connected - listening for audio');
    } catch (err: any) {
      console.error('[OpenAI] Connection error:', err);
      setStatus(`Error: ${err.message}`);
=======
      console.log('[OpenAIVoice] Connected - unlimited session duration');
    } catch (err) {
      console.error('[OpenAIVoice] Connection error:', err);
      setStatus(`Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
      setIsActive(false);
    }
  };

  const disconnect = () => {
<<<<<<< HEAD
    console.log('[OpenAI] Disconnecting...');

=======
    console.log('[OpenAIVoice] Disconnecting...');
    
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

<<<<<<< HEAD
    if (processorRef.current) {
=======
    if (processorRef.current && audioContextRef.current) {
>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
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
<<<<<<< HEAD
    audioBufferRef.current = [];
  };

  /**
   * Process audio every 2 seconds
   */
  useEffect(() => {
    if (!isActive) return;

    const processAudio = async () => {
      try {
        // Check if we have audio and API available
        if (audioBufferRef.current.length === 0) return;
        if (!window.electron?.api?.openaiTranscribe) return;
        if (isMuted) return;

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
        const transcribeResult = await window.electron.api.openaiTranscribe(base64Audio, apiKeyRef.current);

        if (!transcribeResult.success || !transcribeResult.text) {
          console.error('[OpenAI] Transcription failed:', transcribeResult.error);
          setMode('listening');
          setStatus('Listening...');
          return;
        }

        const userText = transcribeResult.text.trim();
        if (!userText) {
          setMode('listening');
          setStatus('Listening...');
          return;
        }

        setTranscription(userText);
        conversationRef.current.push({ role: 'user', content: userText });

        // Limit conversation history
        if (conversationRef.current.length > 50) {
          conversationRef.current = conversationRef.current.slice(-50);
        }

        // Get chat response
        setStatus('Thinking...');
        const chatResult = await window.electron.api.openaiChat(
          conversationRef.current,
          apiKeyRef.current
        );

        if (!chatResult.success || !chatResult.text) {
          console.error('[OpenAI] Chat failed:', chatResult.error);
          setMode('listening');
          setStatus('Listening...');
          return;
        }

        conversationRef.current.push({ role: 'assistant', content: chatResult.text });

        // Synthesize speech
        setMode('speaking');
        setStatus('Speaking...');
        const ttsResult = await window.electron.api.synthesizeSpeech({
          text: chatResult.text,
          voice: 'en-US-Neural2-C',
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
      }
    };

    const interval = setInterval(processAudio, 2000);
    return () => clearInterval(interval);
  }, [isActive, isMuted]);

=======
    setTranscription('');
    audioBufferRef.current = [];
  };

>>>>>>> 637c0cb9aef2f0270b47715f74d0745bbb9eebc2
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
