import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
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
  connect: () => Promise<void>;
  disconnect: () => void;
  customAvatar: string | null;
  updateAvatar: (file: File) => Promise<void>;
  setAvatarFromUrl: (url: string) => Promise<void>;
  clearAvatar: () => void;
  // Shared Brain State
  cortexMemory: any[];
  setCortexMemory: (val: any[]) => void;
  projectData: any | null;
  setProjectData: (val: any) => void;
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
  const isActiveRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // Cortex & Project Tracking
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any | null>(null);

  const setLiveActive = (val: boolean) => {
    setIsActive(val);
    isActiveRef.current = val;
  };

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

    setLiveActive(false);
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
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: toolDeclarations as any,
          systemInstruction: { parts: [{ text: getFullSystemInstruction(cortexMemory) }] },
        },
        callbacks: {
          onopen: () => {
            console.log('[LiveContext] Session opened');
            setStatus('Online');
            setLiveActive(true);
            setMode('listening');
          },

          onmessage: async (msg: LiveServerMessage) => {
            console.log('[LiveContext] Message received:', msg);

            if (msg.toolCall) {
              console.log('[LiveContext] Tool call received:', msg.toolCall);
              const responses: any[] = [];
              
              for (const call of msg.toolCall.functionCalls) {
                const { name, args, id } = call;
                try {
                  const isBlenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
                  // Mock context for tool execution
                  const toolContext = {
                    isBlenderLinked,
                    setProfile: () => {},
                    setProjectData,
                    setProjectContext: () => {},
                    setShowProjectPanel: () => {}
                  };
                  
                  const { result, error } = await executeMossyTool(name, args, toolContext);
                  responses.push({
                    name,
                    id,
                    response: { result: error || result }
                  });
                } catch (err) {
                  responses.push({
                    name,
                    id,
                    response: { result: `Error: ${err}` }
                  });
                }
              }

              if (responses.length > 0 && sessionRef.current) {
                sessionRef.current.sendToolResponse({
                  functionResponses: responses
                });
              }
            }
            
            if (msg.serverContent?.userContent?.parts) {
              const text = msg.serverContent.userContent.parts
                .map(p => p.text)
                .filter(Boolean)
                .join(' ');
              if (text) {
                console.log('[LiveContext] User transcription:', text);
                setTranscription(text);
              }
            }

            if (msg.serverContent?.modelTurn?.parts) {
              const audioPart = msg.serverContent.modelTurn.parts.find(p => p.inlineData?.data);
              const textPart = msg.serverContent.modelTurn.parts.find(p => p.text);
              
              if (textPart?.text) {
                console.log('[LiveContext] Model text:', textPart.text);
              }

              if (audioPart?.inlineData?.data && audioContextRef.current && !isMutedRef.current) {
                setMode('speaking');
                try {
                  const ctx = audioContextRef.current;
                  if (ctx.state === 'suspended') await ctx.resume();
                  
                  const buffer = await decodeAudioData(audioPart.inlineData.data, ctx);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setMode('listening');
                  };
                  
                  const now = ctx.currentTime;
                  if (nextStartTimeRef.current < now) {
                    nextStartTimeRef.current = now + 0.05;
                  }
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                } catch (err) {
                  console.error('[LiveContext] Audio decode error:', err);
                }
              }
            }

            if (msg.serverContent?.interrupted) {
              console.log('[LiveContext] Session interrupted');
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setMode('listening');
            }
          },

          onclose: (ev) => {
            console.log('[LiveContext] Session closed:', ev.code, ev.reason);
            disconnect();
          },

          onerror: (err) => {
            console.error('[LiveContext] Session error:', err);
            disconnect();
          }
        }
      });

      sessionPromise.then(async (session) => {
        sessionRef.current = session;
        console.log('[LiveContext] Session object acquired');

        try {
          if (streamRef.current && inputContextRef.current) {
            const ctx = inputContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();
            
            const source = ctx.createMediaStreamSource(streamRef.current);
            
            try {
              console.log('[LiveContext] Attempting AudioWorklet capture from: /audio-processor.js');
              await ctx.audioWorklet.addModule('/audio-processor.js');
              const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
              
              workletNode.port.onmessage = async (event) => {
                const floatData = event.data;
                if (!sessionRef.current || isMutedRef.current || !isActiveRef.current) return;

                // Ensure context is running (sometimes browsers suspend if idle)
                if (ctx.state === 'suspended') await ctx.resume();

                let sum = 0;
                for (let i = 0; i < floatData.length; i++) sum += floatData[i] * floatData[i];
                const vol = Math.sqrt(sum / floatData.length) * 100;
                setVolume(vol);

                if (vol > 0.1) {
                  console.log('[LiveContext] Sending audio chunk (Worklet), volume:', vol.toFixed(2));
                  const int16 = new Int16Array(floatData.length);
                  for (let i = 0; i < floatData.length; i++) {
                    int16[i] = floatData[i] < 0 ? floatData[i] * 0x8000 : floatData[i] * 0x7FFF;
                  }
                  const base64 = encodeAudioToBase64(int16);

                  const result = session.sendRealtimeInput({
                    media: {
                      data: base64,
                      mimeType: 'audio/pcm;rate=16000'
                    }
                  });
                  if (result && typeof result.catch === 'function') result.catch(() => {});
                }
              };

              const silence = ctx.createGain();
              silence.gain.value = 0;
              source.connect(workletNode);
              workletNode.connect(silence);
              silence.connect(ctx.destination);
              processorRef.current = workletNode as any;
              console.log('[LiveContext] AudioWorklet active');

            } catch (workletErr) {
              console.warn('[LiveContext] Fallback to Polling:', workletErr);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 2048;
              source.connect(analyser);
              
              const buffer = new Float32Array(analyser.fftSize);
              const poll = async () => {
                if (!isActiveRef.current || !sessionRef.current) return;
                
                if (ctx.state === 'suspended') await ctx.resume();

                analyser.getFloatTimeDomainData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
                const vol = Math.sqrt(sum / buffer.length) * 100;
                setVolume(vol);
                
                if (vol > 0.1 && !isMutedRef.current) {
                  console.log('[LiveContext] Sending audio chunk, volume:', vol.toFixed(2));
                  const int16 = new Int16Array(buffer.length);
                  for (let i = 0; i < buffer.length; i++) {
                    int16[i] = buffer[i] < 0 ? buffer[i] * 0x8000 : buffer[i] * 0x7FFF;
                  }
                  const base64 = encodeAudioToBase64(int16);
                  const result = session.sendRealtimeInput({
                    media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  });
                  if (result && typeof result.catch === 'function') result.catch(() => {});
                }
                setTimeout(poll, 128);
              };
              poll();
              processorRef.current = { disconnect: () => source.disconnect() } as any;
            }
          }
        } catch (err) {
          console.error('[LiveContext] Audio setup fail:', err);
        }
      }).catch((err) => {
        console.error('[LiveContext] Session start fail:', err);
        disconnect();
      });

    } catch (err: any) {
      console.error('[LiveContext] Connect error:', err);
      setStatus('Error: ' + err.message);
      setMode('idle');
      setLiveActive(false);
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
