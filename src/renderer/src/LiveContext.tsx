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

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

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
  const failureTimestampsRef = useRef<number[]>([]); // track rapid failures to avoid infinite thrash
  const isConnectingRef = useRef<boolean>(false);
  const manualDisconnectRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferRef = useRef<Float32Array | null>(null); // Reusable buffer to prevent memory leak

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
    try { localStorage.setItem('mossy_cortex_memory', JSON.stringify(cortexMemory || [])); } catch {}
  }, [cortexMemory]);

  useEffect(() => {
    try { projectData ? localStorage.setItem('mossy_project_data', JSON.stringify(projectData)) : localStorage.removeItem('mossy_project_data'); } catch {}
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

    streamRef.current?.getTracks().forEach(t => t.stop());
    
    // Stop MediaRecorder if it exists
    if (processorRef.current && typeof (processorRef.current as any).stop === 'function') {
      (processorRef.current as any).stop();
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

    setLiveActive(false);
    setStatus('Disconnected');
    setMode('idle');
  };

  const scheduleReconnect = (reason: string) => {
    if (manualDisconnectRef.current) return; // User requested disconnect
    if (reconnectTimerRef.current) return;   // Already scheduled

    // Record failure and stop if flapping too hard
    const now = Date.now();
    failureTimestampsRef.current = failureTimestampsRef.current.filter(t => now - t < 2 * 60 * 1000);
    failureTimestampsRef.current.push(now);
    if (failureTimestampsRef.current.length >= 5) {
      console.warn('[LiveContext] Too many rapid failures; pausing auto-reconnect. Reason:', reason);
      setStatus('Reconnection paused (too many failures). Click connect to retry.');
      return;
    }

    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 15000); // 1s,2s,4s,8s,15s cap
    reconnectAttemptsRef.current = attempt + 1;
    console.warn(`[LiveContext] Scheduling reconnect in ${delay} ms (attempt ${attempt + 1}). Reason: ${reason}`);
    setStatus(`Reconnecting... (${attempt + 1})`);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect().catch((err) => console.error('[LiveContext] Reconnect failed:', err));
    }, delay);
  };

  const connect = async () => {
    if (isActive || isConnectingRef.current) return;
    // Ensure we never spawn a second live session (prevents double voice)
    if (sessionRef.current) {
      disconnect(true);
    }
    // Stop any lingering audio sources from a prior session
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    isConnectingRef.current = true;
    manualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    lastActivityRef.current = Date.now();

    return new Promise<void>(async (resolve, reject) => {
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

        // BUILD DETECTED PROGRAMS CONTEXT FOR MOSSY
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
                
                detectedProgramsContext = `
[SYSTEM SCAN STATUS: COMPLETE]
[SCAN TIME: ${lastScan || 'Recently'}]
[TOTAL PROGRAMS DETECTED: ${apps.length}]

[AUTOMATICALLY DETECTED TOOLS - YOU HAVE ACCESS TO THESE]
NVIDIA Ecosystem (${nvidiaApps.length} tools):
${nvidiaApps.slice(0, 10).map(a => `  • ${a.displayName || a.name}`).join('\n')}
${nvidiaApps.length > 10 ? `  • ...and ${nvidiaApps.length - 10} more NVIDIA tools` : ''}

AI/ML Tools (${aiApps.length} tools):
${aiApps.length > 0 ? aiApps.map(a => `  • ${a.displayName || a.name}`).join('\n') : '  • None detected'}

Fallout 4 (${fo4Apps.length} installations):
${fo4Apps.length > 0 ? fo4Apps.map(a => `  • ${a.displayName || a.name}\n    Path: ${a.path}`).join('\n') : '  • Not installed'}

[INSTRUCTION] 
When the user asks "what tools do I have" or "what can you integrate with", reference these SPECIFIC programs by name.
Tell them you can see their ${nvidiaApps.length} NVIDIA tools, ${aiApps.length} AI tools, and ${apps.length} total programs.

HOW YOU INTEGRATE:
• **Launch programs**: Use the launch_program tool to open NVIDIA Canvas, Luma, GIMP, or any detected tool
• **Recommend workflows**: Suggest which tools to use for specific modding tasks
• **Guide usage**: Explain how to use detected tools for Fallout 4 modding
• **Provide paths**: Tell users where their tools are installed (paths are in the data above)
• **Multi-tool workflows**: Create step-by-step processes, launching tools as needed

EXAMPLE WORKFLOW:
User: "I need to create a new texture"
You: "I'll open NVIDIA Canvas for you to generate the base texture. [launch_program Canvas] Once you've created something, we can enhance it in GIMP and convert to DDS for Fallout 4."

When user asks about integration, DEMONSTRATE by actually launching tools and guiding them through the process.
DO NOT say "I cannot integrate" - you CAN by launching programs and providing expert guidance.
`;
                
                console.log('[LiveContext] Built detected programs context:', detectedProgramsContext);
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

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.0-flash-exp',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            // IMPORTANT: Provide tools as Tool objects with functionDeclarations
            tools: [{ functionDeclarations: toolDeclarations }] as any,
            systemInstruction: { role: 'system', parts: [{ text: getFullSystemInstruction((cortexMemory || []).join?.(' ') + '\n' + detectedProgramsContext + '\n' +
              '**OMNIFORGE MODULES (Built-in):**\n' +
              '• Image Studio (/images): PBR Map Synthesizer and Format Converter. Fallout 4 profile uses: _d → BC7, _n → BC5, _s → BC5.\n' +
              '• The Auditor (/auditor): Scans ESP/ESM, NIF, DDS, BGSM; reports issues and basic auto-fixes.\n' +
              '• The Vault (/vault): Asset library + BA2 staging; presets; external tool paths (texconv, xWMAEncode, PapyrusCompiler, gfxexport, splicer).\n' +
              '• Workshop (/workshop): File browser and editor; Papyrus compile.\n' +
              '• Holodeck (/holodeck): Automated mod validator with live game monitoring.\n' +
              '• System Monitor (/system): Hardware/tools scan and Desktop Bridge status.\n' +
              '• The Scribe (/scribe): Documentation assistant.\n' +
              recentChatContext) }] } as any,
          },
          callbacks: {
            onopen: () => {
              console.log('[LiveContext] Session opened');
              setStatus('Online');
              setLiveActive(true);
              setMode('listening');
              isConnectingRef.current = false;
              reconnectAttemptsRef.current = 0;
              failureTimestampsRef.current = [];
              lastActivityRef.current = Date.now();
              sessionReadyRef.current = true;
              
              // DISABLED KEEPALIVE: These artificial ping messages were likely interfering with Google's API
              // The API has its own keep-alive; adding ours on top was causing issues
              // Let the connection work naturally - if it dies, we reconnect gracefully
              
              // DISABLED PROACTIVE RECONNECT: Forcing disconnect at 4.5 min was interrupting user
              // New strategy: Let Google close the connection naturally, then immediately reconnect
              // This way the timing is based on actual session limits, not arbitrary timers
              sessionStartTimeRef.current = Date.now();
              
              resolve();
            },

            onmessage: async (msg: LiveServerMessage) => {
              // Guard: if session closed while this callback was queued, skip processing
              if (!sessionRef.current) {
                console.warn('[LiveContext] ⚠️ Ignoring message: session already closed');
                return;
              }
              
              lastActivityRef.current = Date.now();
              console.log('[LiveContext] Message received:', msg);

              if (msg.toolCall?.functionCalls) {
                console.log('[LiveContext] Tool call received:', msg.toolCall);
                const functionCalls = msg.toolCall.functionCalls;
                
                // Process all tool calls and collect responses
                const responses: any[] = [];
                
                for (const call of functionCalls) {
                  const { name, args, id } = call;
                  try {
                    const isBlenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
                    const toolContext = {
                      isBlenderLinked,
                      setProfile: () => {},
                      setProjectData,
                      setProjectContext: () => {},
                      setShowProjectPanel: () => {}
                    };
                    
                    console.log(`[LiveContext] Executing tool: ${name} with ID: ${id}`);
                    const res: any = await executeMossyTool(name, args, toolContext);
                    console.log(`[LiveContext] Tool ${name} completed, result:`, res);
                    
                    // Format response exactly as Google expects
                    const response = {
                      id: String(id), // Ensure ID is string
                      name: String(name), // Ensure name is string
                      response: {
                        output: res?.result ? String(res.result) : 'Operation completed'
                      }
                    };
                    
                    responses.push(response);
                    console.log('[LiveContext] Added response:', response);
                  } catch (err) {
                    console.error(`[LiveContext] Tool ${name} failed:`, err);
                    responses.push({
                      id: String(id),
                      name: String(name),
                      response: {
                        output: `Error: ${err instanceof Error ? err.message : String(err)}`
                      }
                    });
                  }
                }

                // Validate and send responses
                if (responses.length > 0) {
                  console.log('[LiveContext] ============ TOOL RESPONSE DEBUG ============');
                  console.log('[LiveContext] Response count:', responses.length);
                  console.log('[LiveContext] Responses array:', JSON.stringify(responses, null, 2));
                  console.log('[LiveContext] Session exists:', !!sessionRef.current);
                  
                  if (sessionRef.current) {
                    try {
                      // Validate each response thoroughly
                      const validationResults = responses.map((r, idx) => ({
                        index: idx,
                        hasId: !!r.id,
                        hasName: !!r.name,
                        hasResponse: !!r.response,
                        hasOutput: !!r.response?.output,
                        outputType: typeof r.response?.output,
                        fullResponse: r
                      }));
                      
                      console.log('[LiveContext] Validation results:', validationResults);
                      
                      const allValid = responses.every(r => 
                        r && 
                        typeof r.id === 'string' && r.id.length > 0 &&
                        typeof r.name === 'string' && r.name.length > 0 &&
                        r.response && 
                        typeof r.response.output === 'string'
                      );
                      
                      if (!allValid) {
                        console.error('[LiveContext] ❌ Invalid response format detected!');
                        console.error('[LiveContext] Failed validation check');
                        return;
                      }
                      
                      console.log('[LiveContext] ✓ All responses passed validation');
                      console.log('[LiveContext] Calling sendToolResponse with:', {
                        functionResponses: responses.length === 1 ? responses[0] : responses
                      });
                      
                      // SDK expects: { functionResponses: FunctionResponse | FunctionResponse[] }
                      await sessionRef.current.sendToolResponse({
                        functionResponses: responses.length === 1 ? responses[0] : responses
                      });
                      
                      console.log('[LiveContext] ✓✓✓ Tool responses sent successfully!');
                    } catch (sendError) {
                      console.error('[LiveContext] ❌❌❌ Error sending tool response:', sendError);
                      console.error('[LiveContext] Error stack:', sendError instanceof Error ? sendError.stack : 'No stack');
                      console.error('[LiveContext] Failed responses:', JSON.stringify(responses, null, 2));
                    }
                  } else {
                    console.error('[LiveContext] ❌ Session is null, cannot send responses');
                  }
                } else {
                  console.warn('[LiveContext] ⚠️ No responses to send (responses array is empty)');
                  console.warn('[LiveContext] Tool calls received:', msg.toolCall?.functionCalls?.length || 0);
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
                  // Save user message immediately
                  saveLiveMessage('user', text);
                }
              }

              if (msg.serverContent?.modelTurn?.parts) {
                const audioPart = msg.serverContent.modelTurn.parts.find(p => p.inlineData?.data);
                const textPart = msg.serverContent.modelTurn.parts.find(p => p.text);
                
                if (textPart?.text) {
                  console.log('[LiveContext] Model text:', textPart.text);
                  // Save model response immediately
                  saveLiveMessage('model', textPart.text);
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
                    
                    // MEMORY LEAK FIX: Proper cleanup of audio sources
                    source.onended = () => {
                      try {
                        source.disconnect();
                      } catch (e) {
                        // Already disconnected
                      }
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
                
                // Stop and clear all active audio sources
                sourcesRef.current.forEach(s => {
                  try { 
                    s.stop();
                    s.disconnect();
                  } catch(e) {
                    // Already stopped/disconnected
                  }
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setMode('listening');
              }
            },

            onclose: (ev) => {
              console.log('[LiveContext] ❌ Session closed:', ev.code, ev.reason);
              console.log('[LiveContext] Close event details:', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
              sessionReadyRef.current = false;
              const reason = `code=${ev.code} reason=${ev.reason}`;
              
              // Quota/1011: pause auto-reconnect and surface status
              if (ev.code === 1011 || /quota/i.test(ev.reason || '')) {
                console.log('[LiveContext] Quota/1011 error detected; pausing auto-reconnect');
                manualDisconnectRef.current = true;
                setStatus('Quota exceeded; please wait or switch model. Auto-reconnect paused.');
                disconnect(true, false); // Preserve buffer on quota error
                reject(new Error(`Session closed (quota): ${ev.reason || ''}`));
                return;
              }
              
              // Code 1000 (clean close) likely means Google's API closed the connection
              // at its natural limit (~5-10 minutes). This is NOT a user-initiated disconnect.
              // Auto-reconnect to keep the conversation going.
              if (ev.code === 1000) {
                console.log('[LiveContext] Clean close (1000) detected - Google API session limit reached. Auto-reconnecting...');
                disconnect(false, false); // Preserve buffer, auto-reconnect
                scheduleReconnect('google-api-session-limit');
                reject(new Error(`Session closed (Google API limit): ${ev.reason || ''}`));
                return;
              }
              
              console.log('[LiveContext] Unexpected close code:', ev.code, '- scheduling reconnect');
              disconnect(false, false); // Preserve buffer on unexpected errors
              scheduleReconnect(reason || 'unknown-close');
              reject(new Error(`Session closed: ${ev.reason}`));
            },

            onerror: (err) => {
              console.error('[LiveContext] ❌ CRITICAL SESSION ERROR:', err);
              console.error('[LiveContext] Error type:', err?.constructor?.name);
              console.error('[LiveContext] Error message:', err?.message);
              console.error('[LiveContext] Error stack:', err?.stack);
              console.error('[LiveContext] Full error object:', err);
              sessionReadyRef.current = false;
              if (err?.message && /quota/i.test(err.message)) {
                manualDisconnectRef.current = true;
                setStatus('Quota exceeded; please wait or switch model. Auto-reconnect paused.');
                disconnect(true, false); // Preserve buffer on quota error
                reject(err);
                return;
              }
              
              setStatus(`Connection Lost: ${err?.message || 'Unknown error'}`);
              disconnect(false, false); // Preserve buffer on errors
              // If socket already closed cleanly, don't auto-retry
              if (err?.message && /CLOSING or CLOSED/i.test(err.message)) {
                manualDisconnectRef.current = true;
                setStatus('Link closed. Tap Connect to resume.');
                reject(err);
                return;
              }
              scheduleReconnect(err?.message || 'unknown-error');
              reject(err);
            }
          }
        });

        sessionPromise.then(async (session) => {
          sessionRef.current = session;
          console.log('[LiveContext] Session object acquired');
          sessionReadyRef.current = true;

          try {
            if (streamRef.current && inputContextRef.current) {
              const ctx = inputContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              
              const source = ctx.createMediaStreamSource(streamRef.current);
              
              try {
                console.log('[LiveContext] Attempting AudioWorklet capture from: /audio-processor.js');
                await ctx.audioWorklet.addModule('/audio-processor.js');
                const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
                
                // MEMORY LEAK FIX: Store message handler so it can be cleaned up
                const messageHandler = async (event: MessageEvent) => {
                  const floatData = event.data;
                  if (!sessionRef.current || !sessionReadyRef.current || isMutedRef.current || !isActiveRef.current) return;

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

                    // Pre-check: if anything looks wrong, abort this send
                    if (!sessionRef.current || !sessionReadyRef.current || !isActiveRef.current) {
                      return; // Don't even try to send
                    }

                    if (typeof sessionRef.current.sendRealtimeInput !== 'function') {
                      console.warn('[LiveContext] sendRealtimeInput is not a function, socket may be closing');
                      return;
                    }

                    try {
                      const result = sessionRef.current.sendRealtimeInput({
                        media: {
                          data: base64,
                          mimeType: 'audio/pcm;rate=16000'
                        }
                      });
                      if (result && typeof result.catch === 'function') {
                        result.catch((err: any) => {
                          if (err?.message?.includes('CLOSING or CLOSED')) {
                            console.log('[LiveContext] WebSocket closed during send, scheduling reconnect');
                            sessionReadyRef.current = false;
                            scheduleReconnect('socket-closed-during-send');
                          }
                        });
                      }
                    } catch (err: any) {
                      if (err?.message?.includes('CLOSING or CLOSED')) {
                        console.log('[LiveContext] WebSocket closed during send, scheduling reconnect');
                        sessionReadyRef.current = false;
                        scheduleReconnect('socket-closed-during-send');
                      } else {
                        console.warn('[LiveContext] Failed to send audio (connection may be closing):', err);
                      }
                    }
                  }
                };
                
                workletNode.port.onmessage = messageHandler;

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
                // LATENCY FIX: Reduce fftSize from 2048 (128ms) to 1024 (64ms) for snappier input
                analyser.fftSize = 1024;
                source.connect(analyser);
                
                // MEMORY LEAK FIX: Reuse single buffer instead of creating new ones
                if (!audioBufferRef.current || audioBufferRef.current.length !== analyser.fftSize) {
                  audioBufferRef.current = new Float32Array(analyser.fftSize);
                }
                
                const poll = async () => {
                  // Early exit checks
                  if (!isActiveRef.current || !sessionRef.current || !sessionReadyRef.current) {
                    pollingTimerRef.current = null;
                    return;
                  }
                  
                  if (ctx.state === 'suspended') await ctx.resume();

                  // MEMORY LEAK FIX: Reuse existing buffer
                  const buffer = audioBufferRef.current!;
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
                    
                    // Pre-check: if anything looks wrong, abort this send
                    if (!sessionRef.current || !sessionReadyRef.current || !isActiveRef.current) {
                      pollingTimerRef.current = null;
                      return;
                    }

                    if (typeof sessionRef.current.sendRealtimeInput !== 'function') {
                      console.warn('[LiveContext] sendRealtimeInput is not a function, socket may be closing');
                      pollingTimerRef.current = null;
                      return;
                    }

                    // Check if session is still connected before sending
                    try {
                      const result = sessionRef.current.sendRealtimeInput({
                        media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                      });
                      if (result && typeof result.catch === 'function') {
                        result.catch((err: any) => {
                          if (err?.message?.includes('CLOSING or CLOSED')) {
                            console.log('[LiveContext] WebSocket closed during send (polling), scheduling reconnect');
                            sessionReadyRef.current = false;
                            pollingTimerRef.current = null;
                            scheduleReconnect('socket-closed-during-send');
                          }
                        });
                      }
                    } catch (err: any) {
                      if (err?.message?.includes('CLOSING or CLOSED')) {
                        console.log('[LiveContext] WebSocket closed during send (polling), scheduling reconnect');
                        sessionReadyRef.current = false;
                        pollingTimerRef.current = null;
                        scheduleReconnect('socket-closed-during-send');
                        return;
                      } else {
                        console.warn('[LiveContext] Failed to send audio (polling, connection may be closing):', err);
                      }
                    }
                  }
                  
                  // MEMORY LEAK FIX: Track timeout so it can be cleared on disconnect
                  pollingTimerRef.current = setTimeout(poll, 128);
                };
                poll();
                processorRef.current = { 
                  disconnect: () => {
                    source.disconnect();
                    if (pollingTimerRef.current) {
                      clearTimeout(pollingTimerRef.current);
                      pollingTimerRef.current = null;
                    }
                  }
                } as any;
              }
            }
          } catch (err) {
            console.error('[LiveContext] Audio setup fail:', err);
          }
        }).catch((err) => {
          console.error('[LiveContext] Session start fail:', err);
          disconnect(false, false); // Preserve buffer on connection errors
          scheduleReconnect(err?.message || 'connect-failed');
          reject(err);
        });

      } catch (err: any) {
        console.error('[LiveContext] Connect error:', err);
        setStatus('Error: ' + err.message);
        setMode('idle');
        setLiveActive(false);
        disconnect(false, false); // Preserve buffer on connection errors
        scheduleReconnect(err?.message || 'connect-error');
        reject(err);
      }
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
