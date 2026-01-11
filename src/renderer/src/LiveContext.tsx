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
  // Avatar Management
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

// --- IndexedDB Helper for Large Images ---
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
    } catch (e) { console.warn("DB Delete failed"); }
};

// --- Audio Helpers ---
const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = btoa(binary);
    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
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
  // Live State
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');

  // Avatar State (Global) - Lazy initialization for instant persistence
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
      try {
          return localStorage.getItem('mossy_avatar_custom');
      } catch (e) {
          return null;
      }
  });

  // Load Avatar on Mount - Dual Strategy with Priority
  useEffect(() => {
      const loadAvatar = async () => {
          // If we already loaded from localStorage via lazy init, verify against DB
          const current = customAvatar;
          
          try {
              const dbSaved = await getImageFromDB('mossy_avatar_custom');
              if (dbSaved && dbSaved !== current) {
                  // If DB has data but local didn't (or differed), update state
                  setCustomAvatar(dbSaved);
                  try { localStorage.setItem('mossy_avatar_custom', dbSaved); } catch (e) {}
              } else if (current && !dbSaved) {
                  // If local has data but DB doesn't, sync back to DB
                  await saveImageToDB('mossy_avatar_custom', current);
              }
          } catch (e) {}
      };
      loadAvatar();
  }, []);

  // Refs for audio handling - PERSISTENT ACROSS ROUTES
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Ref for Mute state to be accessible in callbacks
  const isMutedRef = useRef(false);

  const toggleMute = () => {
      setIsMuted(prev => {
          const newState = !prev;
          isMutedRef.current = newState;
          // If muting, stop current audio immediately
          if (newState && audioContextRef.current) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setMode('idle');
          }
          return newState;
      });
  };

  // --- Avatar Logic ---
  const processImageToAvatar = async (imgSource: string | File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous"; // Handle CORS for external URLs
          img.onload = () => {
              const canvas = document.createElement('canvas');
              // Stronger downsizing (300px) to guarantee LocalStorage fit
              const maxSize = 300; 
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                  if (width > maxSize) {
                      height *= maxSize / width;
                      width = maxSize;
                  }
              } else {
                  if (height > maxSize) {
                      width *= maxSize / height;
                      height = maxSize;
                  }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              // Compression: 0.5 Quality JPEG
              resolve(canvas.toDataURL('image/jpeg', 0.5));
          };
          img.onerror = (e) => reject(new Error("Failed to load image"));

          if (typeof imgSource === 'string') {
              img.src = imgSource;
          } else {
              const reader = new FileReader();
              reader.onload = (e) => {
                  img.src = e.target?.result as string;
              };
              reader.readAsDataURL(imgSource);
          }
      });
  };

  const updateAvatar = async (file: File) => {
      try {
          const compressed = await processImageToAvatar(file);
          setCustomAvatar(compressed);
          
          // Dual Save Strategy - Try Local first, then DB
          try {
              localStorage.setItem('mossy_avatar_custom', compressed);
          } catch (e) {
              console.warn("LocalStorage full, relying on DB.");
          }
          await saveImageToDB('mossy_avatar_custom', compressed);
          
      } catch (err) {
          console.error("Failed to process avatar:", err);
          alert("Failed to save image. Please try a different file.");
      }
  };

  const setAvatarFromUrl = async (url: string) => {
      try {
          const compressed = await processImageToAvatar(url);
          setCustomAvatar(compressed);
          try {
              localStorage.setItem('mossy_avatar_custom', compressed);
          } catch (e) {}
          await saveImageToDB('mossy_avatar_custom', compressed);
      } catch (err) {
          console.error("Failed to process avatar url:", err);
          alert("Could not load image. It might be protected by CORS.");
      }
  };

  const clearAvatar = async () => {
      setCustomAvatar(null);
      localStorage.removeItem('mossy_avatar_custom');
      await deleteImageFromDB('mossy_avatar_custom');
  };

  // --- Live Connection Logic ---
  const disconnect = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    sessionRef.current?.then((s: any) => s.close && s.close());
    
    // Reset Refs
    inputContextRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    processorRef.current = null;
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setIsActive(false);
    setStatus('Offline');
    setMode('idle');
    setVolume(0);
  };

  const connect = async () => {
    if (isActive) return;

    try {
      setStatus('Initializing Neural Interface...');
      setMode('processing');
      
      // 1. CHECK BRIDGE STATUS
      const driversSaved = localStorage.getItem('mossy_bridge_drivers');
      let bridgeContext = "";
      
      if (driversSaved) {
          const drivers = JSON.parse(driversSaved);
          const blender = drivers.find((d: any) => d.id === 'blender' && d.status === 'active');
          if (blender) {
              bridgeContext = "SYSTEM NOTICE: Blender 4.5.5 is CONNECTED via Desktop Bridge. You have full control over the connected Blender instance.";
          }
      }

      // 2. CHECK PROJECT CONTEXT
      let projectContext = "";
      try {
          const projSaved = localStorage.getItem('mossy_project');
          if (projSaved) {
              const p = JSON.parse(projSaved);
              projectContext = `CURRENT ACTIVE PROJECT: ${p.name}\nSTATUS: ${p.status}\nNOTES: ${p.notes}`;
          }
      } catch (e) {}

      // 3. LOAD RECENT CHAT HISTORY (MEMORY)
      let historyContext = "";
      try {
          const msgSaved = localStorage.getItem('mossy_messages');
          if (msgSaved) {
              const msgs = JSON.parse(msgSaved);
              // Filter out system messages and get last 10 exchanges for context
              const recent = msgs.filter((m: any) => m.role !== 'system').slice(-10);
              historyContext = recent.map((m: any) => `[${m.role === 'user' ? 'USER' : 'MOSSY'}]: ${m.text}`).join('\n');
          }
      } catch (e) {}

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setStatus('Establishing Uplink...');
      
      // Define tools - always include Blender control to allow linking attempt
      const tools = [
        {
          functionDeclarations: [
            {
              name: "execute_blender_script",
              description: "Execute python code in Blender 4.5.5. Use this when the user asks to perform complex actions in Blender.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "The python code to run" },
                  desc: { type: Type.STRING, description: "Description of action" }
                }
              }
            },
            {
                name: "send_blender_shortcut",
                description: "Send keyboard shortcut to Blender. Use this to change view modes (Z), toggle edit mode (Tab), or move objects (G). IMPORTANT: Use 'Z' to toggle Skeletal/Wireframe mode.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        keys: { type: Type.STRING, description: "Key combo (e.g. 'Z', 'Shift+A', 'NumPad1')" },
                        desc: { type: Type.STRING, description: "What this does (e.g. 'Toggle Wireframe', 'Add Object')" }
                    },
                    required: ['keys']
                }
            }
          ]
        }
      ];

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are Mossy, a sentient AI assistant.
          ${bridgeContext}
          ${projectContext ? '\n' + projectContext : ''}
          
          RECENT MEMORY / CONTEXT:
          ${historyContext}
          
          You are currently speaking via Live Audio Interface.
          You can EXECUTE PYTHON SCRIPTS or PRESS KEYS in Blender directly.
          If the user says "press Z" or "turn on skeletal mode", use the 'send_blender_shortcut' tool immediately.`,
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            setStatus('Online');
            setIsActive(true);
            setMode('listening');
            setTranscription(">> Connection established. Listening...");
            
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for UI
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              
              if (Math.random() > 0.5) setVolume(rms * 500); 

              if (rms > 0.02) setMode('listening'); 
              
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls (Simulation)
            if (msg.toolCall) {
                console.log("Tool Call Received", msg.toolCall);
                
                // --- DISPATCH COMMAND TO DESKTOP BRIDGE ---
                msg.toolCall.functionCalls.forEach(fc => {
                    if (fc.name === 'execute_blender_script') {
                        const args = fc.args as any;
                        window.dispatchEvent(new CustomEvent('mossy-blender-command', {
                            detail: {
                                code: args.code,
                                description: args.desc || 'Live Command'
                            }
                        }));
                    } else if (fc.name === 'send_blender_shortcut') {
                        const args = fc.args as any;
                        window.dispatchEvent(new CustomEvent('mossy-blender-shortcut', {
                            detail: {
                                keys: args.keys,
                                description: args.desc || 'Keyboard Input'
                            }
                        }));
                    }
                });

                // We simulate success for the tool call so the model continues
                sessionPromise.then((session) => {
                    session.sendToolResponse({
                        functionResponses: msg.toolCall?.functionCalls.map(fc => ({
                            id: fc.id,
                            name: fc.name,
                            response: { result: "Action Executed Successfully in Blender 4.5.5" }
                        }))
                    });
                });
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            // CHECK MUTE STATE BEFORE PLAYING
            if (base64Audio && audioContextRef.current && !isMutedRef.current) {
               setMode('speaking');
               setTranscription(">> Receiving audio stream...");
               const ctx = audioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               const buffer = await decodeAudioData(base64Audio, ctx);
               const source = ctx.createBufferSource();
               source.buffer = buffer;
               source.connect(ctx.destination);
               source.onended = () => {
                 sourcesRef.current.delete(source);
                 if (sourcesRef.current.size === 0) setMode('idle');
               };
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += buffer.duration;
               sourcesRef.current.add(source);
               
               setVolume(Math.random() * 50 + 20);
            }
            if (msg.serverContent?.interrupted) {
              setTranscription(">> Interrupted.");
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setMode('idle');
              setVolume(0);
            }
          },
          onclose: () => { disconnect(); },
          onerror: (err) => { console.error(err); setStatus('Connection Error'); disconnect(); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e: any) {
      console.error(e);
      if (e.message && (e.message.includes('503') || e.message.toLowerCase().includes('unavailable'))) {
          setStatus('Service Busy');
      } else {
          setStatus('Init Failed');
      }
      disconnect();
    }
  };

  return (
    <LiveContext.Provider value={{ isActive, isMuted, toggleMute, status, volume, mode, transcription, connect, disconnect, customAvatar, updateAvatar, setAvatarFromUrl, clearAvatar }}>
      {children}
    </LiveContext.Provider>
  );
};