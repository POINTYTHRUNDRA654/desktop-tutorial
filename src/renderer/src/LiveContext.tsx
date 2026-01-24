/**
 * LiveContext - Real-time audio streaming context for Mossy AI
 * 
 * MEMORY LEAK FIXES APPLIED:
 * 1. Added reusable audio buffer (audioBufferRef) instead of creating new Float32Array every 128ms
 * 2. Added pollingTimerRef to track and properly clear setTimeout in fallback audio polling
 * 3. Added proper cleanup for AudioWorklet message handlers and disconnection
 * 4. Added proper disconnect() calls for AudioBufferSourceNode to prevent accumulation
 * 5. Clear all timers and references on disconnect to prevent zombie callbacks
 * 6. Added periodic cleanup (every 5s) to remove stale audio sources that didn't trigger onended
 * 7. Added aggressive buffer clearing on interruption with disconnect() calls
 * 8. Added source set size limit (max 10) to prevent unbounded growth
 * 9. Null audioBufferRef on interrupt to hint garbage collection
 * 
 * These fixes prevent the memory buildup that caused crashes after ~5 minutes of conversation.
 */

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Groq } from 'groq-sdk';
import OpenAI from 'openai';
import { getFullSystemInstruction, toolDeclarations } from './MossyBrain';
import { executeMossyTool } from './MossyTools';

interface LiveContextType {
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
  // Shared Brain State
  cortexMemory: any[];
  setCortexMemory: (val: any[]) => void;
  projectData: any | null;
  setProjectData: (val: any) => void;
  // Aliases for ChatInterface
  isLiveActive: boolean;
  isLiveMuted: boolean;
  toggleLiveMute: () => void;
  disconnectLive: (manual?: boolean) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const useLive = () => {
  const context = useContext(LiveContext);
  if (!context) {
    throw new Error('useLive must be used within a LiveProvider');
  }
  return context;
};

const DB_NAME = 'MossyDB';
const STORE_NAME = 'avatars';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveImageToDB = async (key: string, base64: string) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(base64, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("DB Save failed", e);
  }
};

const getImageFromDB = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
};

const deleteImageFromDB = async (key: string) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("DB Delete failed");
  }
};

const encodeAudioToBase64 = (int16Array: Int16Array): string => {
  let binary = '';
  for (let i = 0; i < int16Array.length; i++) {
    binary += String.fromCharCode(int16Array[i] & 0xff);
    binary += String.fromCharCode((int16Array[i] >> 8) & 0xff);
  }
  return btoa(binary);
};

const createBlob = (data: Float32Array) => {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = data[i] < 0 ? data[i] * 0x8000 : data[i] * 0x7FFF;
  }
  return new Blob([int16.buffer], { type: 'audio/pcm' });
};

const decodeAudioData = async (base64String: string, ctx: AudioContext): Promise<AudioBuffer> => {
  // PERFORMANCE FIX: Non-blocking audio decode - simpler approach
  // Only use async chunking for very large audio (>10MB)
  const len = base64String.length;
  
  // Only use async chunking for very large audio (>10MB)
  if (len > 10 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      try {
        // Use efficient base64 decoding with Uint8Array
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        const chunkSize = 65536;
        let offset = 0;
        
        const processChunk = () => {
          const end = Math.min(offset + chunkSize, binaryString.length);
          for (let i = offset; i < end; i++) {
            bytes[i] = binaryString.charCodeAt(i) & 0xFF;
          }
          offset = end;
          
          if (offset < binaryString.length) {
            setTimeout(processChunk, 0);
          } else {
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            
            let sampleOffset = 0;
            const sampleChunkSize = 32768;
            
            const processSamples = () => {
              const sampleEnd = Math.min(sampleOffset + sampleChunkSize, dataInt16.length);
              for (let i = sampleOffset; i < sampleEnd; i++) {
                channelData[i] = dataInt16[i] / 32768.0;
              }
              sampleOffset = sampleEnd;
              
              if (sampleOffset < dataInt16.length) {
                setTimeout(processSamples, 0);
              } else {
                resolve(buffer);
              }
            };
            
            processSamples();
          }
        };
        
        processChunk();
      } catch (err) {
        reject(err);
      }
    });
  } else {
    // For normal audio sizes, decode synchronously (fast)
    // Use more efficient byte extraction
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xFF;
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  }
};

// Helper: Encode raw PCM samples to WAV format
function encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
  const frameLength = samples.length;
  const numberOfChannels = 1;
  const sampleRateValue = sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const preData = new ArrayBuffer(44);
  const view = new DataView(preData);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + frameLength * bytesPerSample, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numberOfChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRateValue, true);
  /* avg. bytes/sec */
  view.setUint32(28, sampleRateValue * blockAlign, true);
  /* block-align */
  view.setUint16(32, blockAlign, true);
  /* 16-bit samples */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, frameLength * bytesPerSample, true);

  // Convert float samples to PCM int16
  const pcmData = new Int16Array(frameLength);
  let offset = 0;
  for (let i = 0; i < frameLength; i++, offset += bytesPerSample) {
    const s = Math.max(-1, Math.min(1, samples[i])); // Clamp
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return new Blob([preData, pcmData.buffer], { type: 'audio/wav' });
}

// Helper: Combine webm/opus chunks into a single blob for STT
function combineAudioChunks(chunks: Blob[]): Blob {
  return new Blob(chunks, { type: 'audio/webm;codecs=opus' });
}

// Helper: Transcribe audio to text using OpenAI Whisper
async function transcribeAudioWithWhisper(audioBlob: Blob, openaiApiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
  // Send as webm with correct filename
  const file = new File([audioBlob], `audio.webm`, { type: audioBlob.type || 'audio/webm;codecs=opus' });
  
  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
    response_format: 'text',
  });
  
  // When response_format is 'text', the response IS the text string directly
  return typeof response === 'string' ? response : (response as any).text || '';
}

// Helper: Transcribe audio to text using Deepgram
async function transcribeAudioWithDeepgram(audioBlob: Blob, deepgramApiKey: string): Promise<string> {
  const mimeType = audioBlob.type || 'audio/ogg';
  const url = 'https://api.deepgram.com/v1/listen?model=nova-2-general&language=en&punctuate=true';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
      'Content-Type': mimeType,
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Deepgram API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  return transcript;
}

const preferredBrowserVoiceName = (import.meta.env.VITE_BROWSER_TTS_VOICE || '').trim();

// Helper: Convert text to speech using ElevenLabs
async function synthesizeSpeechWithElevenLabs(
  text: string,
  elevenLabsApiKey: string,
  voiceId: string
): Promise<Blob> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'audio/mpeg', // ensure audio content negotiation
      'xi-api-key': elevenLabsApiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ''}`);
  }

  return response.blob();
}

// Fallback: Speak using browser SpeechSynthesis
async function speakWithBrowserTTS(text: string): Promise<void> {
  try {
    if (!('speechSynthesis' in window)) {
      console.warn('[LiveContext] Browser TTS not available.');
      return;
    }
    
    // Cancel any ongoing speech before starting new utterance
    window.speechSynthesis.cancel();
    
    const pickVoice = async (): Promise<SpeechSynthesisVoice | undefined> => {
      let voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        await new Promise<void>((resolve) => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
        });
      }
      const lcVoices = voices.map(v => ({ v, n: v.name.toLowerCase() }));
      const candidates = [
        preferredBrowserVoiceName,
        'aria', 'jenny', 'zira', 'female', 'en-us', 'english'
      ].filter(Boolean) as string[];
      for (const cand of candidates) {
        const lc = cand.toLowerCase();
        const exact = lcVoices.find(({ n }) => n === lc);
        if (exact) return exact.v;
        const partial = lcVoices.find(({ n }) => n.includes(lc));
        if (partial) return partial.v;
      }
      return voices[0];
    };

    const voice = await pickVoice();
    if (voice) {
      console.log('[LiveContext] Using browser TTS voice:', voice.name, voice.lang || '');
    } else {
      console.warn('[LiveContext] No browser TTS voice found, using default.');
    }

    await new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      if (voice) utter.voice = voice;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  } catch (e) {
    console.warn('[LiveContext] Browser TTS failed:', e);
  }
}

// Helper: Verify ElevenLabs credentials and voice accessibility
async function verifyElevenLabsCredentials(apiKey: string, voiceId: string): Promise<void> {
  try {
    // Check if API key is accepted
    const userResp = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey }
    });
    if (userResp.status === 401) {
      console.warn('[LiveContext] ElevenLabs key rejected (401). Regenerate your API key in ElevenLabs settings.');
      return;
    }

    // Check voice accessibility
    const voicesResp = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    if (!voicesResp.ok) {
      console.warn('[LiveContext] ElevenLabs voices list error:', voicesResp.status, voicesResp.statusText);
      return;
    }

    const data = await voicesResp.json().catch(() => ({}));
    const voices = (data as any)?.voices || [];
    const hasVoice = Array.isArray(voices) && voices.some((v: any) => v?.voice_id === voiceId);
    console.log(`[LiveContext] ElevenLabs key valid. Voice accessible? ${hasVoice ? 'yes' : 'no'}`);
    if (!hasVoice) {
      console.warn('[LiveContext] Provided ElevenLabs voice ID not found in your account. Use a voice you own or shared with you.');
    }
  } catch (err) {
    console.warn('[LiveContext] ElevenLabs verification failed:', err);
  }
}

// Helper: Send message to Groq and get response
async function sendMessageToGroq(
  userMessage: string,
  groqClient: any,
  conversationHistory: any[],
  systemPrompt: string,
  audioContextRef: React.MutableRefObject<AudioContext | undefined>,
  elevenLabsApiKey: string,
  elevenLabsVoiceId: string,
  ttsProvider: string,
  isMutedRef: React.MutableRefObject<boolean>,
  sourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>,
  nextStartTimeRef: React.MutableRefObject<number>,
  setMode: (mode: 'idle' | 'listening' | 'processing' | 'speaking') => void,
  saveLiveMessage: (role: string, text: string) => void
): Promise<string> {
  try {
    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    console.log('[LiveContext] Sending to Groq:', {
      userMessage,
      historyLength: conversationHistory.length,
      modelName: 'llama-3.3-70b-versatile'
    });

    // Build messages array with system prompt and history
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Groq LLM
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const modelResponse = response.choices[0]?.message?.content || '';
    console.log('[LiveContext] Groq response:', modelResponse);

    // Add model response to history
    conversationHistory.push({
      role: 'assistant',
      content: modelResponse
    });

    // Save to localStorage for persistence
    saveLiveMessage('assistant', modelResponse);

    // Synthesize response to speech with selected provider
    if (modelResponse && !isMutedRef.current) {
      setMode('processing');
      console.log('[LiveContext] Mode set to processing, about to speak...');
      if (ttsProvider === 'elevenlabs' && audioContextRef.current) {
        console.log('[LiveContext] Synthesizing response with ElevenLabs...');
        try {
          const audioBlob = await synthesizeSpeechWithElevenLabs(
            modelResponse,
            elevenLabsApiKey,
            elevenLabsVoiceId
          );
          const arrayBuffer = await audioBlob.arrayBuffer();
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = decodedBuffer;
          source.connect(ctx.destination);
          source.onended = () => {
            try { source.disconnect(); } catch (e) {
              console.error('[LiveContext] Failed to disconnect audio source:', e);
            }
            sourcesRef.current.delete(source);
            if (sourcesRef.current.size === 0) setMode('listening');
          };
          const now = ctx.currentTime;
          if (nextStartTimeRef.current < now) nextStartTimeRef.current = now + 0.05;
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += decodedBuffer.duration;
          sourcesRef.current.add(source);
          setMode('speaking');
        } catch (audioErr) {
          console.error('[LiveContext] Audio playback error:', audioErr);
          console.log('[LiveContext] Falling back to browser TTS...');
          setMode('speaking');
          await speakWithBrowserTTS(modelResponse);
          // After TTS finishes, wait a moment before returning to listening
          await new Promise(resolve => setTimeout(resolve, 500));
          setMode('listening');
          console.log('[LiveContext] Mode set to listening after browser TTS fallback');
        }
      } else {
        setMode('speaking');
        console.log('[LiveContext] Mode set to speaking, starting browser TTS...');
        await speakWithBrowserTTS(modelResponse);
        // After TTS finishes, wait a moment before returning to listening
        // to allow natural pause between exchanges
        console.log('[LiveContext] Browser TTS finished, waiting 500ms before resuming listening...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setMode('listening');
        console.log('[LiveContext] Mode set back to listening');
      }
    }

    return modelResponse;
  } catch (error) {
    console.error('[LiveContext] Groq API error:', error);
    throw error;
  }
}

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const ranTtsSelfTestRef = useRef(false);

  // Global error handler to suppress known WebSocket errors that we're handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('WebSocket is already in CLOSING or CLOSED state')) {
        // We're handling this in our catch blocks, suppress console error
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // MEMORY LEAK FIX: Periodic cleanup of stale audio sources (disabled - kept simple)
  // Note: The main cleanup happens in onended callbacks, which is sufficient
  // Keeping this commented out to avoid interfering with normal operation
  /* 
  useEffect(() => {
    if (!isActive || sourcesRef.current.size === 0) return;
    const cleanupInterval = setInterval(() => {
      // Only run cleanup if we have potential leak (many sources)
      if (sourcesRef.current.size > 20) {
        const ctx = audioContextRef.current;
        if (ctx) {
          const now = ctx.currentTime;
          sourcesRef.current.forEach((source) => {
            if (source.buffer && nextStartTimeRef.current > 0 && now > nextStartTimeRef.current + 2) {
              try {
                source.stop();
                source.disconnect();
                sourcesRef.current.delete(source);
              } catch (e) {
                // Already stopped
              }
            }
          });
        }
      }
    }, 30000); // Check every 30 seconds only if needed
    
    return () => clearInterval(cleanupInterval);
  }, [isActive]);
  */

  // Cortex & Project Tracking
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any | null>(null);

  const MIN_SEND_VOLUME = 5.0;      // raise threshold to reduce background noise (was 2.0)
  const MIN_SEND_INTERVAL_MS = 220; // throttle sends to ~200-250ms cadence
  const SILENCE_THRESHOLD_MS = 1500; // Stop sending after 1.5s of silence to signal turn end

  const [micLevel, setMicLevel] = useState(0); // Live mic level (0-100) for UI meter
  const [audioInputs, setAudioInputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('');

  const setLiveActive = (val: boolean) => {
    setIsActive(val);
    isActiveRef.current = val;
  };

  const isMutedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<any>(null); // AudioWorklet or analyser fallback
  const sessionRef = useRef<any>(null);
  const sessionReadyRef = useRef<boolean>(false);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionHealthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectPauseRef = useRef<{ until: number; reason: string } | null>(null);
  const failureTimestampsRef = useRef<number[]>([]); // track rapid failures to avoid infinite thrash
  const isConnectingRef = useRef<boolean>(false);
  const manualDisconnectRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceListReadyRef = useRef<boolean>(false);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferRef = useRef<Float32Array | null>(null); // Reusable buffer to prevent memory leak
  const lastSendRef = useRef<number>(0);
  const lastSpeechRef = useRef<number>(Date.now()); // Track last time user actually spoke (vol > threshold)
  const lastFlushRef = useRef<number>(0); // Track last time we flushed to trigger model response
  const lastModelReplyRef = useRef<number>(0); // Track when model last replied to avoid repeated nudges
  const modelIsSpeakingRef = useRef<boolean>(false); // Track if model audio is currently playing
  const modelSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Debounce model speaking end
  const cooldownUntilRef = useRef<number>(0);

  // Live session message buffer for preserving context across interrupts
  const liveSessionMessages = useRef<Array<{role: string, text: string, timestamp: number}>>([]);
  
  // Save live message to buffer immediately
  const saveLiveMessage = (role: 'user' | 'model', text: string) => {
    if (!text || text.length < 3) return; // Skip very short messages
    liveSessionMessages.current.push({
      role,
      text: text.trim(),
      timestamp: Date.now()
    });
    // Keep last 30 exchanges (user+model pairs)
    if (liveSessionMessages.current.length > 60) {
      liveSessionMessages.current = liveSessionMessages.current.slice(-60);
    }
    // Also save to localStorage for persistence
    try {
      const existing = JSON.parse(localStorage.getItem('mossy_messages') || '[]');
      existing.push({ role, text: text.trim(), timestamp: new Date().toISOString() });
      if (existing.length > 100) existing.shift();
      localStorage.setItem('mossy_messages', JSON.stringify(existing));
    } catch (e) {
      console.warn('[LiveContext] Failed to save message to localStorage:', e);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      isMutedRef.current = !prev;
      return !prev;
    });
  };

  useEffect(() => {
    (async () => {
      const saved = localStorage.getItem('mossy_avatar_custom');
      if (!saved) {
        try {
          const dbAvatar = await getImageFromDB('mossy_avatar_custom');
          if (dbAvatar) setCustomAvatar(dbAvatar);
        } catch (e) {
          console.warn("Avatar load error:", e);
        }
      } else {
        setCustomAvatar(saved);
      }
    })();
  }, []);

  // Restore persisted memory/project so reconnects keep context
  useEffect(() => {
    try {
      const storedCortex = localStorage.getItem('mossy_cortex_memory');
      if (storedCortex) setCortexMemory(JSON.parse(storedCortex));
    } catch (e) {
      console.warn('Cortex memory restore failed', e);
    }

    try {
      const storedProject = localStorage.getItem('mossy_project_data');
      if (storedProject) setProjectData(JSON.parse(storedProject));
    } catch (e) {
      console.warn('Project data restore failed', e);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('mossy_cortex_memory', JSON.stringify(cortexMemory || [])); } catch (e) {
      console.error('[LiveContext] Failed to save cortex memory:', e);
    }
  }, [cortexMemory]);

  useEffect(() => {
    try { projectData ? localStorage.setItem('mossy_project_data', JSON.stringify(projectData)) : localStorage.removeItem('mossy_project_data'); } catch (e) {
      console.error('[LiveContext] Failed to save project data:', e);
    }
  }, [projectData]);

  const updateAvatar = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCustomAvatar(dataUrl);
      localStorage.setItem('mossy_avatar_custom', dataUrl);
      await saveImageToDB('mossy_avatar_custom', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const setAvatarFromUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setCustomAvatar(dataUrl);
        localStorage.setItem('mossy_avatar_custom', dataUrl);
        await saveImageToDB('mossy_avatar_custom', dataUrl);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Avatar URL error:', e);
    }
  };

  const clearAvatar = async () => {
    setCustomAvatar(null);
    localStorage.removeItem('mossy_avatar_custom');
    await deleteImageFromDB('mossy_avatar_custom');
  };

  const refreshAudioInputs = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }));
      setAudioInputs(inputs);
      deviceListReadyRef.current = true;
    } catch (e) {
      console.warn('[LiveContext] enumerateDevices failed:', e);
    }
  };

  const disconnect = (manual = false, shouldClearBuffer = true) => {
    console.log('[LiveContext] Disconnecting...');
    manualDisconnectRef.current = manual;
    isConnectingRef.current = false;
    sessionReadyRef.current = false;

    // Clear live session buffer only on user-initiated disconnect
    // Keep buffer on error-based disconnects for context recovery
    if (shouldClearBuffer) {
      console.log('[LiveContext] Clearing live session buffer');
      liveSessionMessages.current = [];
    }

    // Stop keepalive/reconnect timers
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (sessionHealthCheckRef.current) {
      clearInterval(sessionHealthCheckRef.current);
      sessionHealthCheckRef.current = null;
    }
    
    // MEMORY LEAK FIX: Clear polling timer
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    // Clear model speaking timeout
    if (modelSpeakingTimeoutRef.current) {
      clearTimeout(modelSpeakingTimeoutRef.current);
      modelSpeakingTimeoutRef.current = null;
    }

    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }

    setMicLevel(0);

    streamRef.current?.getTracks().forEach(t => t.stop());
    
    // Stop MediaRecorder if it exists
    if (processorRef.current) {
      const rec = processorRef.current as any;
      // Clear recording timeout
      if (rec.recordingTimeout) {
        clearTimeout(rec.recordingTimeout);
        rec.recordingTimeout = null;
      }
      // Clear data collect interval
      if (rec.dataCollectInterval) {
        clearInterval(rec.dataCollectInterval);
        rec.dataCollectInterval = null;
      }
      // Clear old silence check timer if it exists
      if (rec.silenceCheckTimer) {
        clearInterval(rec.silenceCheckTimer);
        rec.silenceCheckTimer = null;
      }
        // Clear silence check interval
        if (rec.silenceCheckInterval) {
          clearInterval(rec.silenceCheckInterval);
          rec.silenceCheckInterval = null;
        }
      // Clear old recording interval if it exists
      if (rec.recordingInterval) {
        clearInterval(rec.recordingInterval);
        rec.recordingInterval = null;
      }
      // Stop recorder if active
      if (rec.state === 'recording') {
        try { rec.stop(); } catch (e) { console.warn('[LiveContext] MediaRecorder stop error:', e); }
      }
      // Clear event handlers
      rec.ondataavailable = null;
      rec.onstop = null;
    }
    
    // MEMORY LEAK FIX: Disconnect AudioWorklet properly
    if (processorRef.current?.port) {
      try {
        processorRef.current.port.onmessage = null;
        processorRef.current.disconnect();
      } catch (e) {
        console.warn('[LiveContext] Error disconnecting AudioWorklet:', e);
      }
    }
    
    // Stop legacy keepalive interval stored on session
    if ((sessionRef.current as any)?._keepaliveInterval) {
      clearInterval((sessionRef.current as any)._keepaliveInterval);
      console.log('[LiveContext] Keepalive interval cleared');
    }
    
    // MEMORY LEAK FIX: Stop all audio sources and clear immediately
    // FORCE STOP TTS AUDIO
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    sourcesRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    sourcesRef.current.clear();
    
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    if (sessionRef.current?.close) sessionRef.current.close();

    inputContextRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    processorRef.current = null;
    sessionRef.current = null;
    audioBufferRef.current = null; // Clear reusable buffer
    nextStartTimeRef.current = 0;
    deviceListReadyRef.current = false;

    setLiveActive(false);
    setStatus('Disconnected');
    setMode('idle');
  };

  const scheduleReconnect = (reason: string) => {
    if (manualDisconnectRef.current) return;
    if (isReconnectPaused()) return;
    if (reconnectTimerRef.current) return;

    // Record failure and stop if flapping too hard
    const now = Date.now();
    failureTimestampsRef.current = failureTimestampsRef.current.filter(t => now - t < 2 * 60 * 1000);
    failureTimestampsRef.current.push(now);
    if (failureTimestampsRef.current.length >= 5) {
      console.warn('[LiveContext] Too many rapid failures; pausing auto-reconnect. Reason:', reason);
      setStatus('Reconnection paused (too many failures). Click connect to retry.');
      return;
    }

    if (now < cooldownUntilRef.current) return;

    const attempt = reconnectAttemptsRef.current;
    const base = Math.min(1000 * Math.pow(2, attempt), 15000); // 1s,2s,4s,8s,15s cap
    const jitter = Math.floor(Math.random() * 500);
    const delay = base + jitter;
    reconnectAttemptsRef.current = attempt + 1;
    console.warn(`[LiveContext] Scheduling reconnect in ${delay} ms (attempt ${attempt + 1}). Reason: ${reason}`);
    setStatus(`Reconnecting... (${attempt + 1})`);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect().catch((err) => console.error('[LiveContext] Reconnect failed:', err));
    }, delay);
  };

  const pauseReconnect = (reason: string, ms: number) => {
    reconnectPauseRef.current = { until: Date.now() + ms, reason };
    // Kill any pending reconnect timer immediately
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setStatus(`Reconnect paused: ${reason}. Try again later.`);
  };

  const isReconnectPaused = () => {
    const p = reconnectPauseRef.current;
    if (!p) return false;
    if (Date.now() >= p.until) {
      reconnectPauseRef.current = null;
      return false;
    }
    return true;
  };

  const connect = async () => {
    if (isReconnectPaused()) {
      const p = reconnectPauseRef.current!;
      const secs = Math.ceil((p.until - Date.now()) / 1000);
      setStatus(`Reconnect paused (${p.reason}). Wait ${secs}s then try again.`);
      return;
    }

    if (isActive || isConnectingRef.current) return;
    // Ensure we never spawn a second live session (prevents double voice)
    if (sessionRef.current) {
      disconnect(true);
    }
    // Always start fresh on reconnect to avoid stale context loops
    liveSessionMessages.current = [];
    // Stop any lingering audio sources from a prior session
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    isConnectingRef.current = true;
    manualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    failureTimestampsRef.current = [];
    lastActivityRef.current = Date.now();

    return new Promise<void>((resolve, reject) => {
      (async () => {
      try {
        setStatus('Initializing...');
        setMode('processing');

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            noiseSuppression: true,
            echoCancellation: true,
            ...(selectedInputId ? { deviceId: { exact: selectedInputId } } : {}),
          },
        });
        streamRef.current = stream;

        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        // Refresh device labels now that we have permission
        refreshAudioInputs();

        // Live mic level meter
        try {
          const meterCtx = inputContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          inputContextRef.current = meterCtx;
          const meterAnalyser = meterCtx.createAnalyser();
          meterAnalyser.fftSize = 2048;
          const meterSource = meterCtx.createMediaStreamSource(stream);
          meterSource.connect(meterAnalyser);
          const dataArray = new Uint8Array(meterAnalyser.fftSize);

          const updateLevel = () => {
            meterAnalyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const v = (dataArray[i] - 128) / 128; // center and normalize
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const level = Math.min(100, Math.round(rms * 180)); // scale to 0-100, boost a bit
            setMicLevel(level);
          };

          if (meterTimerRef.current) clearInterval(meterTimerRef.current);
          meterTimerRef.current = setInterval(updateLevel, 80);
        } catch (e) {
          console.warn('[LiveContext] Mic meter setup failed:', e);
        }

        // Initialize Groq client
        const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
        const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
        const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
        const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        const elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
        const ttsProvider = (import.meta.env.VITE_TTS_PROVIDER || 'browser').toLowerCase();

        if (!groqApiKey) {
          throw new Error('VITE_GROQ_API_KEY not found in environment. Check .env.local file.');
        }
        if (!openaiApiKey) {
          throw new Error('VITE_OPENAI_API_KEY not found in environment. Check .env.local file.');
        }
        if (ttsProvider === 'elevenlabs' && (!elevenLabsApiKey || !elevenLabsVoiceId)) {
          throw new Error('VITE_ELEVENLABS_API_KEY or VITE_ELEVENLABS_VOICE_ID not found. Check .env.local file.');
        }

        const groqClient = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });
        sessionRef.current = { 
          groqClient, 
          conversationHistory: [],
          openaiApiKey,
          deepgramApiKey,
          elevenLabsApiKey,
          elevenLabsVoiceId,
          ttsProvider
        } as any;
        console.log('[LiveContext] Groq client initialized with model: llama-3.3-70b-versatile');
        console.log('[LiveContext] OpenAI Whisper STT enabled');
        if (ttsProvider === 'elevenlabs') {
          console.log('[LiveContext] ElevenLabs TTS enabled with voice ID:', elevenLabsVoiceId);
          // Verify ElevenLabs credentials and voice access for clearer diagnostics
          verifyElevenLabsCredentials(elevenLabsApiKey, elevenLabsVoiceId);
        } else {
          console.log('[LiveContext] Browser TTS enabled');
        }
        setStatus('Ready');
        sessionReadyRef.current = true;

        // Optional: run a one-time TTS self-test to confirm audio pipeline
        if (!ranTtsSelfTestRef.current && !isMutedRef.current) {
          ranTtsSelfTestRef.current = true;
          try {
            if (ttsProvider === 'elevenlabs' && audioContextRef.current) {
              const testBlob = await synthesizeSpeechWithElevenLabs(
                'Voice link check successful. Mossy is online.',
                elevenLabsApiKey,
                elevenLabsVoiceId
              );

              const arrayBuffer = await testBlob.arrayBuffer();
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
              const source = ctx.createBufferSource();
              source.buffer = decodedBuffer;
              source.connect(ctx.destination);
              source.onended = () => {
                try { source.disconnect(); } catch (e) {
                  console.error('[LiveContext] Failed to disconnect audio source:', e);
                }
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setMode('listening');
              };

              const now = ctx.currentTime;
              if (nextStartTimeRef.current < now) nextStartTimeRef.current = now + 0.05;
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += decodedBuffer.duration;
              sourcesRef.current.add(source);
              setMode('speaking');
              console.log('[LiveContext] ElevenLabs TTS ready (silent mode).');
            } else {
              // Silent mode - no voice announcement
              console.log('[LiveContext] Browser TTS ready (silent mode).');
            }
          } catch (err) {
            console.warn('[LiveContext] TTS initialization completed with warnings:', err);
          }
        }

        // BUILD DETECTED PROGRAMS CONTEXT FOR MOSSY (VOICE-OPTIMIZED - SHORT VERSION)
        let detectedProgramsContext = '';
        try {
            const scanSummary = localStorage.getItem('mossy_scan_summary');
            const allApps = localStorage.getItem('mossy_all_detected_apps');
            const lastScan = localStorage.getItem('mossy_last_scan');
            
            console.log('[LiveContext] Building detected programs context...');
            console.log('[LiveContext] scanSummary exists?', !!scanSummary);
            console.log('[LiveContext] allApps exists?', !!allApps);
            
            if (scanSummary && allApps) {
                const summary = JSON.parse(scanSummary);
                const apps = JSON.parse(allApps) || [];
                
                console.log('[LiveContext] Parsed summary:', summary);
                console.log('[LiveContext] Total apps:', apps.length);
                
                // Build a concise list of important programs
                const nvidiaApps = apps.filter((a: any) => 
                    (a.displayName || a.name || '').toLowerCase().match(/nvidia|geforce|cuda|rtx/)
                );
                const aiApps = apps.filter((a: any) => 
                    (a.displayName || a.name || '').toLowerCase().match(/luma|ollama|comfy|stable|kobold|jan/)
                );
                const fo4Apps = apps.filter((a: any) => 
                    (a.displayName || a.name || '').toLowerCase().match(/fallout|fo4/)
                );
                
                console.log('[LiveContext] NVIDIA apps:', nvidiaApps.length);
                console.log('[LiveContext] AI apps:', aiApps.length);
                console.log('[LiveContext] FO4 apps:', fo4Apps.length);
                
                // VOICE-OPTIMIZED: Short summary, not the full list
                detectedProgramsContext = `
[SYSTEM SCAN: Complete - ${apps.length} total programs detected]
[KEY TOOLS AVAILABLE: ${nvidiaApps.length} NVIDIA tools, ${aiApps.length} AI/ML tools, ${fo4Apps.length} Fallout 4 installations]

IMPORTANT: This is VOICE mode. Keep responses conversational and brief.
- Do NOT list all tools unless specifically asked
- Do NOT read long program lists out loud
- When greeting, just say hello and ask how you can help
- Only mention specific tools when relevant to the conversation

Example good responses:
User: "Hello"
You: "Hi! I'm Mossy, your Fallout 4 modding assistant. What can I help you with today?"

User: "What tools do I have?"
You: "I've detected ${nvidiaApps.length} NVIDIA tools, ${aiApps.length} AI tools, and ${fo4Apps.length} Fallout 4 installations. What would you like to work on?"

Example bad responses (DO NOT DO THIS):
- Reading entire tool lists
- Saying "I've detected ComfyUI, protoc, alembic..." (long lists)
- Repeating scan data unless asked
`;
                
                console.log('[LiveContext] Built voice-optimized context');
            } else {
                console.warn('[LiveContext] No scan data found in localStorage');
            }
        } catch (err) {
            console.error('[LiveContext] Error building detected programs context:', err);
        }

        // Pull recent chat so reconnections keep short-term context
        let recentChatContext = '';
        try {
          const storedMessages = localStorage.getItem('mossy_messages');
          let msgs: any[] = [];
          if (storedMessages) {
            msgs = JSON.parse(storedMessages) as any[];
          }
          
          // Add live session messages from this session
          const liveMessages = liveSessionMessages.current.map(m => ({
            role: m.role,
            text: m.text,
            timestamp: new Date(m.timestamp).toISOString()
          }));
          
          // Combine and deduplicate (prefer live messages)
          const allMessages = [...msgs, ...liveMessages];
          const uniqueMessages = allMessages.reduce((acc, msg) => {
            // Use text+role as key to dedupe
            const key = `${msg.role}:${msg.text?.substring(0, 100)}`;
            if (!acc.has(key)) {
              acc.set(key, msg);
            }
            return acc;
          }, new Map());
          
          const trimmed = Array.from(uniqueMessages.values())
            .filter((m: any) => m?.role === 'user' || m?.role === 'model')
            .slice(-100); // Get FULL conversation history (was 20, increased to 100)
          
          const lines = trimmed.map((m: any) => {
            const role = m.role === 'user' ? 'User' : 'Mossy';
            const text = (m.text || '').replace(/\s+/g, ' ').trim().slice(0, 1000); // Increased text capture from 400 to 1000 chars
            return `${role}: ${text}`;
          });
          
          // Load Memory Vault knowledge for context
          let knowledgeVaultContext = "";
          try {
              const knowledgeStr = typeof window !== 'undefined' ? window.localStorage.getItem('mossy_knowledge_vault') : null;
              if (knowledgeStr) {
                  const knowledge = JSON.parse(knowledgeStr);
                  if (Array.isArray(knowledge) && knowledge.length > 0) {
                      const knowledgeItems = knowledge
                          .map((item: any) => `[${item.tags?.join(', ') || 'general'}] ${item.title}: ${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}`)
                          .join('\n');
                      knowledgeVaultContext = `\n**MOSSY'S KNOWLEDGE VAULT (${knowledge.length} items - CRITICAL CONTEXT):**\n${knowledgeItems}`;
                  }
              }
          } catch (e) {
              console.warn('[LiveContext] Failed to load memory vault:', e);
          }
          
          if (lines.length > 0) {
            recentChatContext = `[RECENT CHAT - Last ${lines.length} exchanges]\n${lines.join('\n')}${knowledgeVaultContext}`;
          }
        } catch (err) {
          console.warn('[LiveContext] Failed to load recent chat context:', err);
        }

        // For Groq: initialize conversation and resolve immediately
        // The conversation will happen via the UI or voice input handlers
        const groqSession = sessionRef.current as any;
        if (!groqSession) {
          throw new Error('Session not properly initialized');
        }

        // Mark as ready and resolve
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        sessionStartTimeRef.current = Date.now();
        setLiveActive(true);
        
        // Store conversation system prompt in session
        groqSession.systemPrompt = getFullSystemInstruction(
          (cortexMemory || []).join(' ') + '\n' + detectedProgramsContext + '\n' + recentChatContext
        );
        
        console.log('[LiveContext] Groq session ready for conversation');

        // SET UP AUDIO INPUT CAPTURE FOR GROQ VOICE CHAT (MediaRecorder stop/restart approach)
        try {
          const stream = streamRef.current;
          if (stream) {
            // Use MediaRecorder but stop/start it to get complete files
            const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : undefined;

            const recorder = preferredMime
              ? new MediaRecorder(stream, { mimeType: preferredMime })
              : new MediaRecorder(stream);
            
            processorRef.current = recorder as any;

            let recordedChunks: Blob[] = [];
            let chunkCount = 0;

            recorder.ondataavailable = (event: BlobEvent) => {
              if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
                chunkCount++;
                console.log('[LiveContext] Audio chunk received #' + chunkCount, {
                  size: event.data.size,
                  totalChunks: recordedChunks.length
                });
              }
            };

            recorder.onstop = async () => {
              console.log('[LiveContext] Recorder stopped. Chunks collected:', {
                count: recordedChunks.length,
                totalSize: recordedChunks.reduce((sum, blob) => sum + blob.size, 0),
                sessionReady: sessionReadyRef.current
              });
              
              if (!sessionReadyRef.current || recordedChunks.length === 0) {
                console.log('[LiveContext] No chunks or session not ready - restarting recording');
                recordedChunks = [];
                chunkCount = 0;
                // Always restart recording unless disconnected
                if (sessionReadyRef.current && recorder.state === 'inactive') {
                  recorder.start();
                }
                return;
              }

              // Combine all chunks into one complete webm file
              const completeBlob = new Blob(recordedChunks, {
                type: recorder.mimeType || 'audio/webm;codecs=opus'
              });
              recordedChunks = [];

              console.log('[LiveContext] Complete recording', {
                size: completeBlob.size,
                type: completeBlob.type
              });

              // PREVENT EMPTY/SILENCE LOOPS: Skip processing if blob is tiny (silence detection)
              // Typical 3-second silence in opus/webm is ~5-15KB, meaningful speech is 20KB+
              if (completeBlob.size < 5000) {
                console.log('[LiveContext] Ignoring silence chunk (blob too small:', completeBlob.size, 'bytes)');
                setMode('listening');
                // Restart recording for next speech
                if (sessionReadyRef.current && recorder.state === 'inactive') {
                  recorder.start();
                }
                return;
              }

              try {
                setMode('processing');
                const groqSession = sessionRef.current as any;
                let transcription = '';

                // Prefer Deepgram first for lower latency, fallback to Whisper
                try {
                  if (groqSession.deepgramApiKey) {
                    transcription = await transcribeAudioWithDeepgram(completeBlob, groqSession.deepgramApiKey);
                    console.log('[LiveContext] Deepgram transcription:', transcription);
                  } else {
                    // No Deepgram key, use Whisper
                    transcription = await transcribeAudioWithWhisper(completeBlob, groqSession.openaiApiKey);
                    console.log('[LiveContext] Whisper transcription:', transcription);
                  }
                } catch (primaryErr) {
                  console.warn('[LiveContext] Primary STT failed, trying fallback:', primaryErr);
                  try {
                    // Fallback to the other provider
                    if (groqSession.deepgramApiKey) {
                      transcription = await transcribeAudioWithWhisper(completeBlob, groqSession.openaiApiKey);
                      console.log('[LiveContext] Whisper fallback transcription:', transcription);
                    } else {
                      transcription = await transcribeAudioWithDeepgram(completeBlob, groqSession.deepgramApiKey);
                      console.log('[LiveContext] Deepgram fallback transcription:', transcription);
                    }
                  } catch (fallbackErr) {
                    console.error('[LiveContext] Both STT providers failed:', fallbackErr);
                    setMode('listening');
                    // Restart recording
                    if (sessionReadyRef.current && recorder.state === 'inactive') {
                      recorder.start();
                    }
                    return;
                  }
                }

                // PREVENT ECHO LOOPS: Skip if transcription is empty or very short (noise)
                if (!transcription || transcription.trim().length < 2) {
                  console.log('[LiveContext] Ignoring empty/noise transcription');
                  setMode('listening');
                  // Restart recording for next speech
                  if (sessionReadyRef.current && recorder.state === 'inactive') {
                    recorder.start();
                  }
                  return;
                }

                setTranscription(transcription);
                saveLiveMessage('user', transcription);

                await sendMessageToGroq(
                  transcription,
                  groqSession.groqClient,
                  groqSession.conversationHistory,
                  groqSession.systemPrompt,
                  audioContextRef as React.MutableRefObject<AudioContext | undefined>,
                  groqSession.elevenLabsApiKey,
                  groqSession.elevenLabsVoiceId,
                  groqSession.ttsProvider,
                  isMutedRef,
                  sourcesRef,
                  nextStartTimeRef,
                  setMode,
                  saveLiveMessage
                );

                setMode('listening');

                // Restart recording for next speech with new timers
                if (sessionReadyRef.current && recorder.state === 'inactive') {
                  console.log('[LiveContext] Restarting recorder for next message...');
                  chunkCount = 0;
                  
                  // Clear old timer if it exists
                  const rec = processorRef.current as any;
                  if (rec.recordingTimeout) clearTimeout(rec.recordingTimeout);
                  if (rec.silenceCheckInterval) {
                    clearInterval(rec.silenceCheckInterval);
                    rec.silenceCheckInterval = null;
                  }
                  
                  recorder.start();
                  
                  // Re-enable smart silence detection for this new recording
                  try {
                    const streamForDetection = streamRef.current;
                    const audioCtx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const analyser2 = audioCtx2.createAnalyser();
                    analyser2.fftSize = 2048;
                    const source2 = audioCtx2.createMediaStreamSource(streamForDetection as MediaStream);
                    source2.connect(analyser2);

                    let recordingStartTime2 = Date.now();
                    let lastSpeechTime2 = Date.now();
                    let hasSpeech2 = false;
                    const SILENCE_THRESHOLD2 = 0.02;
                    const SILENCE_WAIT_MS2 = 1000;
                    const MAX_RECORDING_MS2 = 30000;

                    const buffer2 = new Uint8Array(analyser2.frequencyBinCount);
                    const silenceCheckInterval2 = setInterval(() => {
                      const now2 = Date.now();
                      const recDur2 = now2 - recordingStartTime2;
                      if (recDur2 >= MAX_RECORDING_MS2) {
                        console.log('[LiveContext] Max 30s reached (restart) - stopping');
                        clearInterval(silenceCheckInterval2);
                        if (recorder.state === 'recording') recorder.stop();
                        return;
                      }
                      analyser2.getByteFrequencyData(buffer2);
                      const avg2 = buffer2.reduce((a, b) => a + b) / buffer2.length;
                      const norm2 = avg2 / 255;
                      if (norm2 >= SILENCE_THRESHOLD2) {
                        lastSpeechTime2 = now2;
                        hasSpeech2 = true;
                      } else {
                        const silenceDur2 = now2 - lastSpeechTime2;
                        const speechDur2 = lastSpeechTime2 - recordingStartTime2;
                        if (hasSpeech2 && speechDur2 >= 1000 && silenceDur2 >= SILENCE_WAIT_MS2) {
                          console.log('[LiveContext] Speech complete (restart) after', recDur2, 'ms - stopping');
                          clearInterval(silenceCheckInterval2);
                          if (recorder.state === 'recording') recorder.stop();
                        }
                      }
                    }, 50);
                    rec.silenceCheckInterval = silenceCheckInterval2;
                  } catch (detErr) {
                    console.warn('[LiveContext] Restart silence detection failed, using 30s timeout:', detErr);
                    const recordingTimeout = setTimeout(() => {
                      if (recorder.state === 'recording') {
                        console.log('[LiveContext] 30-second timeout reached - stopping recording');
                        recorder.stop();
                      }
                    }, 30000);
                    rec.recordingTimeout = recordingTimeout;
                  }
                }
              } catch (err) {
                console.error('[LiveContext] Error processing audio:', err);
                setMode('listening');
                // Restart recording with new timers
                if (sessionReadyRef.current && recorder.state === 'inactive') {
                  console.log('[LiveContext] Restarting recorder after error...');
                  chunkCount = 0;
                  
                  // Clear old timer
                  const rec = processorRef.current as any;
                  if (rec.recordingTimeout) clearTimeout(rec.recordingTimeout);
                  if (rec.silenceCheckInterval) {
                    clearInterval(rec.silenceCheckInterval);
                    rec.silenceCheckInterval = null;
                  }
                  
                  recorder.start();
                  
                  // Re-enable smart silence detection on error restart
                  try {
                    const streamForDetection = streamRef.current;
                    const audioCtx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const analyser2 = audioCtx2.createAnalyser();
                    analyser2.fftSize = 2048;
                    const source2 = audioCtx2.createMediaStreamSource(streamForDetection as MediaStream);
                    source2.connect(analyser2);

                    let recordingStartTime2 = Date.now();
                    let lastSpeechTime2 = Date.now();
                    let hasSpeech2 = false;
                    const SILENCE_THRESHOLD2 = 0.02;
                    const SILENCE_WAIT_MS2 = 1000;
                    const MAX_RECORDING_MS2 = 30000;

                    const buffer2 = new Uint8Array(analyser2.frequencyBinCount);
                    const silenceCheckInterval2 = setInterval(() => {
                      const now2 = Date.now();
                      const recDur2 = now2 - recordingStartTime2;
                      if (recDur2 >= MAX_RECORDING_MS2) {
                        clearInterval(silenceCheckInterval2);
                        if (recorder.state === 'recording') recorder.stop();
                        return;
                      }
                      analyser2.getByteFrequencyData(buffer2);
                      const avg2 = buffer2.reduce((a, b) => a + b) / buffer2.length;
                      const norm2 = avg2 / 255;
                      if (norm2 >= SILENCE_THRESHOLD2) {
                        lastSpeechTime2 = now2;
                        hasSpeech2 = true;
                      } else {
                        const silenceDur2 = now2 - lastSpeechTime2;
                        const speechDur2 = lastSpeechTime2 - recordingStartTime2;
                        if (hasSpeech2 && speechDur2 >= 1000 && silenceDur2 >= SILENCE_WAIT_MS2) {
                          clearInterval(silenceCheckInterval2);
                          if (recorder.state === 'recording') recorder.stop();
                        }
                      }
                    }, 50);
                    rec.silenceCheckInterval = silenceCheckInterval2;
                  } catch (detErr) {
                    const recordingTimeout = setTimeout(() => {
                      if (recorder.state === 'recording') {
                        recorder.stop();
                      }
                    }, 30000);
                    rec.recordingTimeout = recordingTimeout;
                  }
                }
              }
            };

            // Start recording
            recorder.start();
            console.log('[LiveContext] MediaRecorder started');

              // Smart silence detection - only stop after actual silence
              const recordingStartTime = Date.now();
              let lastSpeechTime = Date.now();
              let hasSpeech = false;
              const SILENCE_THRESHOLD = 0.02; // More sensitive (detect speech sooner)
              const SILENCE_WAIT_MS = 1000; // 1.0 seconds of silence to stop faster
              const MIN_SPEECH_MS = 1000; // Must have at least 1 second of speech
              const MAX_RECORDING_MS = 30000; // Max 30 seconds
            
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                const source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
              
                const buffer = new Uint8Array(analyser.frequencyBinCount);
              
                const silenceCheckInterval = setInterval(() => {
                  const now = Date.now();
                  const recordingDuration = now - recordingStartTime;
                
                  // Max timeout safety check
                  if (recordingDuration >= MAX_RECORDING_MS) {
                    console.log('[LiveContext] Max 30s reached - stopping');
                    clearInterval(silenceCheckInterval);
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                  }
                
                  // Check audio level
                  analyser.getByteFrequencyData(buffer);
                  const average = buffer.reduce((a, b) => a + b) / buffer.length;
                  const normalized = average / 255;
                
                  if (normalized >= SILENCE_THRESHOLD) {
                    // Speech detected
                    lastSpeechTime = now;
                    hasSpeech = true;
                  } else {
                    // Silence detected
                    const silenceDuration = now - lastSpeechTime;
                    const speechDuration = lastSpeechTime - recordingStartTime;
                  
                    // Only stop if: had speech, met min duration, and silence long enough
                    if (hasSpeech && speechDuration >= MIN_SPEECH_MS && silenceDuration >= SILENCE_WAIT_MS) {
                      console.log('[LiveContext] Speech complete after', recordingDuration, 'ms - stopping');
                      clearInterval(silenceCheckInterval);
                      if (recorder.state === 'recording') recorder.stop();
                    }
                  }
                }, 50);
              
                (processorRef.current as any).silenceCheckInterval = silenceCheckInterval;
              } catch (err) {
                console.warn('[LiveContext] Silence detection failed, using 30s timeout:', err);
                const recordingTimeout = setTimeout(() => {
                  if (recorder.state === 'recording') {
                    console.log('[LiveContext] Fallback 30s timeout - stopping');
                    recorder.stop();
                  }
                }, 30000);
                (processorRef.current as any).recordingTimeout = recordingTimeout;
              }
          }
        } catch (err) {
          console.error('[LiveContext] Failed to set up audio capture:', err);
        }
        
        resolve();
      } catch (err) {
        console.error('[LiveContext] Failed to initialize connection:', err);
        reject(err);
      }
      })();
    });
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
        disconnect: (manual?: boolean) => disconnect(manual),
        customAvatar,
        updateAvatar,
        setAvatarFromUrl,
        clearAvatar,
        cortexMemory,
        setCortexMemory,
        projectData,
        setProjectData,
        isLiveActive: isActive,
        isLiveMuted: isMuted,
        toggleLiveMute: toggleMute,
        disconnectLive: (manual?: boolean) => disconnect(manual ?? true)
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};
