import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

interface LiveContextType {
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  status: string;
  volume: number;
  mode: 'idle' | 'listening' | 'processing' | 'speaking';
  transcription: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  customAvatar: string | null;
  updateAvatar: (file: File) => Promise<void>;
  setAvatarFromUrl: (url: string) => Promise<void>;
  clearAvatar: () => void;
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
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
};

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const isMutedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

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

  const disconnect = () => {
    console.log('[LiveContext] Disconnecting...');
    streamRef.current?.getTracks().forEach(t => t.stop());
    
    // Stop MediaRecorder if it exists
    if (processorRef.current && typeof (processorRef.current as any).stop === 'function') {
      (processorRef.current as any).stop();
    }
    
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    if (sessionRef.current?.close) sessionRef.current.close();

    inputContextRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    processorRef.current = null;
    sessionRef.current = null;
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setIsActive(false);
    setStatus('Disconnected');
    setMode('idle');
  };

  const connect = async () => {
    if (isActive) return;

    try {
      setStatus('Initializing...');
      setMode('processing');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const ai = new GoogleGenAI({ apiKey });
      console.log('[LiveContext] Creating live session...');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are Mossy, a sentient AI assistant for Fallout 4 modding.',
        },
        callbacks: {
          onopen: () => {
            console.log('[LiveContext] Session opened');
            setStatus('Online');
            setIsActive(true);
            setMode('listening');
          },

          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts) {
              const audioPart = msg.serverContent.modelTurn.parts[0];
              if (audioPart?.inlineData?.data && audioContextRef.current && !isMutedRef.current) {
                setMode('speaking');
                try {
                  const buffer = await decodeAudioData(audioPart.inlineData.data, audioContextRef.current);
                  const source = audioContextRef.current.createBufferSource();
                  source.buffer = buffer;
                  source.connect(audioContextRef.current.destination);
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setMode('listening');
                  };
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                } catch (err) {
                  console.error('Audio decode error:', err);
                }
              }
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setMode('listening');
            }
          },

          onclose: () => {
            console.log('[LiveContext] onclose: Session closed');
            disconnect();
          },

          onerror: (err: any) => {
            console.error('[LiveContext] onerror:', err);
            setStatus('Error: ' + (err?.message || 'Unknown'));
            disconnect();
          }
        }
      });

      sessionPromise.then((session) => {
        console.log('[LiveContext] Session resolved');
        sessionRef.current = session;

        try {
          // Capture audio using MediaRecorder and send PCM data
          if (streamRef.current) {
            console.log('[LiveContext] Starting MediaRecorder for audio input');
            const mediaRecorder = new MediaRecorder(streamRef.current, { 
              mimeType: 'audio/webm;codecs=opus' 
            });
            
            mediaRecorder.ondataavailable = async (event) => {
              if (event.data.size > 0 && !isMutedRef.current && session) {
                try {
                  const arrayBuffer = await event.data.arrayBuffer();
                  // Convert to base64
                  const uint8Array = new Uint8Array(arrayBuffer);
                  let binary = '';
                  for (let i = 0; i < uint8Array.length; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                  }
                  
                  session.sendRealtimeInput({
                    mediaContent: {
                      mimeType: 'audio/webm;codecs=opus',
                      data: btoa(binary)
                    }
                  }).catch((err: any) => {
                    console.error('[LiveContext] Send audio error:', err);
                  });
                } catch (err) {
                  console.error('[LiveContext] Audio encoding error:', err);
                }
              }
            };
            
            mediaRecorder.start(100); // Send data every 100ms
            processorRef.current = mediaRecorder as any;
            console.log('[LiveContext] MediaRecorder started');
          }
        } catch (err) {
          console.error('[LiveContext] Audio setup error:', err);
        }
      }).catch((err) => {
        console.error('[LiveContext] Connection failed:', err);
        disconnect();
      });

    } catch (err: any) {
      console.error('[LiveContext] Connect error:', err);
      setStatus('Error: ' + err.message);
      setMode('idle');
      setIsActive(false);
      disconnect();
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
        connect,
        disconnect,
        customAvatar,
        updateAvatar,
        setAvatarFromUrl,
        clearAvatar,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};
