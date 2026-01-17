import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Modality, FunctionDeclaration, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';
import { checkContentGuard } from './Fallout4Guard';
import { Send, Paperclip, Loader2, Bot, Leaf, Search, FolderOpen, Save, Trash2, CheckCircle2, HelpCircle, PauseCircle, ChevronRight, FileText, Cpu, X, CheckSquare, Globe, Mic, Volume2, VolumeX, StopCircle, Wifi, Gamepad2, Terminal, Play, Box, Layout, ArrowUpRight, Wrench, Radio, Lock, Square, Map, Scroll, Flag, PenTool, Database, Activity, Clipboard } from 'lucide-react';
import { Message } from '../types';
import { useLive } from './LiveContext';
import { toolDeclarations } from './MossyBrain';
import { executeMossyTool, sanitizeBlenderScript } from './MossyTools';


type OnboardingState = 'init' | 'scanning' | 'integrating' | 'ready' | 'project_setup';

interface DetectedApp {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  path?: string; // Added path to interface
}

interface ProjectData {
  name: string;
  status: string;
  notes: string;
  timestamp: string;
  lastSessionSummary?: string; 
  keyDecisions?: string[];
  categories?: string[];
}

interface SystemProfile {
    os: 'Windows' | 'Linux' | 'MacOS';
    gpu: string;
    ram: number;
    blenderVersion: string;
    isLegacy: boolean;
}

interface ToolExecution {
    id: string;
    toolName: string;
    args: any;
    status: 'pending' | 'running' | 'success' | 'failed';
    result?: string;
    isManualTrigger?: boolean; // New Flag for manual execution
}

// Speech Recognition Type Definition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}



// --- Project Wizard Component ---
const ProjectWizard: React.FC<{ onSubmit: (data: any) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const categories = [
        { id: 'quest', label: 'Quest / Story', icon: Scroll },
        { id: 'asset', label: 'Asset Replacer', icon: Box },
        { id: 'script', label: 'Scripting', icon: FileText },
        { id: 'world', label: 'Worldspace', icon: Globe },
        { id: 'gameplay', label: 'Gameplay', icon: Activity },
        { id: 'ui', label: 'Interface', icon: Layout },
    ];

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        if (!name) return;
        onSubmit({ name, description, categories: selectedCategories });
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl animate-slide-up w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-400" />
                        Initialize Project
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure workspace parameters for new mod.</p>
                </div>
                <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. 'Project Cobalt', 'Wasteland Flora Overhaul'"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief overview of the mod's goals..."
                        className="w-full h-20 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none resize-none transition-colors text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Primary Modules</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                                    selectedCategories.includes(cat.id) 
                                    ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' 
                                    : 'bg-slate-800 border-transparent text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-end gap-3 pt-4 border-t border-slate-800 flex justify-end">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!name}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Create Workspace
                </button>
            </div>
        </div>
    );
};

// --- Sub-components for Performance ---

// Memoized Message Item to prevent re-rendering list on typing
const MessageItem = React.memo(({ msg, onboardingState, scanProgress, detectedApps, projectContext, handleIntegrate, handleStartProject, onManualExecute }: any) => {
    
    // Helper to extract script for display
    const getScriptContent = () => {
        if (!msg.toolCall || msg.toolCall.toolName !== 'execute_blender_script') return '';
        const script = msg.toolCall.args.script;
        if (script.includes('primitive_cube_add') || script.includes('create_cube')) {
            return "# AUTO-OPTIMIZED: Delegating to 'MOSSY_CUBE' internal function for reliability.";
        }
        return sanitizeBlenderScript(script);
    };

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-4 shadow-sm ${
            msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : msg.role === 'system' ? 'bg-slate-800 border border-slate-700 text-slate-400 text-sm' : 'bg-forge-panel border border-slate-700 rounded-tl-none'
            }`}>
            {msg.images && msg.images.map((img: string, i: number) => (
                <img key={i} src={img} alt="Uploaded" className="max-w-full h-auto rounded mb-2 border border-black/20" />
            ))}
            <div className="markdown-body text-sm leading-relaxed">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>

            {/* Special handling for Blender commands stored in message metadata */}
            {msg.toolCall && msg.toolCall.toolName === 'execute_blender_script' && (
                <div className="mt-3 bg-slate-900 border border-emerald-500/30 rounded-xl p-3 animate-slide-up">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        <Terminal className="w-3 h-3" /> Ready to Execute
                    </div>
                    <div className="bg-black/50 p-2 rounded border border-slate-800 font-mono text-xs text-slate-300 max-h-32 overflow-y-auto mb-3">
                        {getScriptContent()}
                    </div>
                    <div className="text-[10px] text-slate-500 mb-2 italic">
                        Click 'Run Command' to send to clipboard. If auto-run fails, use 'Paste & Run' in Blender.
                    </div>
                    <button 
                        onClick={() => onManualExecute(msg.toolCall.toolName, msg.toolCall.args)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                        <Play className="w-3 h-3 fill-current" /> Run Command
                    </button>
                </div>
            )}

            {/* Generic Tool Execution Status */}
            {msg.toolCall && msg.toolCall.toolName !== 'execute_blender_script' && (
                <div className="mt-3 bg-slate-900/50 border border-slate-700 rounded-xl p-3 animate-slide-up">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Terminal className="w-3 h-3" /> System Bridge
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold ${
                            msg.toolResult?.success !== false 
                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' 
                            : 'bg-red-900/30 border-red-500/30 text-red-400'
                        }`}>
                            {msg.toolResult?.success !== false ? 'EXECUTED' : 'FAILED'}
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-mono text-white truncate">
                                {msg.toolCall.toolName}({Object.entries(msg.toolCall.args || {}).map(([k,v]) => `${k}="${v}"`).join(', ')})
                            </div>
                            {msg.toolResult && (
                                <div className="text-[10px] text-slate-500 mt-1 italic border-l border-slate-700 pl-2">
                                    {typeof msg.toolResult === 'string' 
                                        ? (msg.toolResult.length > 100 ? msg.toolResult.substring(0, 100) + '...' : msg.toolResult)
                                        : (msg.toolResult.result?.length > 100 ? msg.toolResult.result.substring(0, 100) + '...' : msg.toolResult.result)
                                    }
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => onManualExecute(msg.toolCall.toolName, msg.toolCall.args)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg border border-slate-700 transition-colors"
                            title="Re-run tool command"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {onboardingState === 'scanning' && msg.role === 'model' && msg.text.includes("Scan") && (
                <div className="mt-4 bg-slate-900 rounded-lg p-3 border border-slate-700 animate-slide-up">
                    <div className="flex justify-between text-xs mb-1 text-emerald-400 font-mono">
                        <span>PIP-BOY DIAGNOSTIC</span>
                        <span>{scanProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${scanProgress}%` }}></div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                        Probing Data/F4SE/Plugins...
                    </div>
                </div>
            )}

            {onboardingState === 'integrating' && msg.role === 'model' && msg.text.includes("Scan Complete") && (
                <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner animate-slide-up">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Search className="w-3 h-3" /> Detected Tools
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {detectedApps.map((app: any) => (
                            <label key={app.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all ${app.checked ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}>
                                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                <span className="text-xs font-medium text-slate-200">{app.name}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={handleIntegrate} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors">
                        Link & Integrate
                    </button>
                </div>
            )}

            {msg.id === 'integrated' && onboardingState === 'ready' && !projectContext && (
                <div className="mt-4 flex flex-col gap-2">
                    <button onClick={handleStartProject} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500/50 rounded-xl text-left transition-all group">
                        <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30">
                            <FolderOpen className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-200">Start New Mod</div>
                            <div className="text-xs text-slate-500">Create workspace for ESP/ESL</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-emerald-400" />
                    </button>
                </div>
            )}
            
            {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600/50 text-xs flex flex-wrap gap-2">
                    {msg.sources.map((s: any, idx: number) => (
                    <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-black/20 hover:bg-black/40 px-2 py-1 rounded text-emerald-300 truncate max-w-[150px]">
                        <Globe className="w-3 h-3" /> {s.title}
                    </a>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
});

// Memoized List Container
const MessageList = React.memo(({ messages, ...props }: any) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {messages.map((msg: Message) => (
                <MessageItem key={msg.id} msg={msg} {...props} />
            ))}
            {props.children}
        </div>
    );
});

export const ChatInterface: React.FC = () => {
  // Global Live State
  const { isActive: isLiveActive, isMuted: isLiveMuted, toggleMute: toggleLiveMute, disconnect: disconnectLive } = useLive();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [workingMemory, setWorkingMemory] = useState<string>("Initializing modding education protocol...");
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Voice State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
      if (isLiveActive) return false;
      const saved = localStorage.getItem('mossy_voice_enabled') === 'true';
      return saved;
  });
  
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Bridge State
  const [isBridgeActive, setIsBridgeActive] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [isBlenderLinked, setIsBlenderLinked] = useState(false);
  
  // Tool Execution State
  const [activeTool, setActiveTool] = useState<ToolExecution | null>(null);

  // Onboarding & Context
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('init');
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedApps, setDetectedApps] = useState<DetectedApp[]>([]);
  const [formalSettings, setFormalSettings] = useState<any>(null);
  
  // Project Memory
  const [projectContext, setProjectContext] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  
  // System Profile
  const [profile, setProfile] = useState<SystemProfile | null>(() => {
      try {
          const saved = localStorage.getItem('mossy_system_profile');
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  });

  // Shared Memory State
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [scannedMap, setScannedMap] = useState<any>(null);
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // --- PERSISTENCE LAYER (DEBOUNCED) ---
  useEffect(() => {
    // Save messages with debounce
    const saveTimeout = setTimeout(() => {
        if (messages.length > 0) {
            try {
                localStorage.setItem('mossy_messages', JSON.stringify(messages));
            } catch (e) {
                console.error("Failed to save history (Quota Exceeded?)", e);
            }
        }
        localStorage.setItem('mossy_working_memory', workingMemory);
    }, 2000); 

    return () => clearTimeout(saveTimeout);
  }, [messages, workingMemory]);

  useEffect(() => {
    const checkState = () => {
        const active = localStorage.getItem('mossy_bridge_active') === 'true';
        setIsBridgeActive(active);
        
        try {
            const drivers = JSON.parse(localStorage.getItem('mossy_bridge_drivers') || '[]');
            setActiveDrivers(drivers);
        } catch {}
        
        // CHECK BLENDER ADD-ON STATUS
        const blenderActive = localStorage.getItem('mossy_blender_active') === 'true';
        setIsBlenderLinked(blenderActive);
        
        if (active) {
             const lastScan = localStorage.getItem('mossy_last_scan');
             const now = Date.now();
             const oneDay = 24 * 60 * 60 * 1000;

             // Only periodic silent scan if we've finished onboarding
             if (onboardingState !== 'init' && onboardingState !== 'scanning' && onboardingState !== 'integrating') {
                if (!lastScan || (now - parseInt(lastScan)) > oneDay) {
                    performSystemScan(true); // Silent background refresh
                }
             } else if (onboardingState === 'init') {
                const hasApps = localStorage.getItem('mossy_apps');
                if (!hasApps) performSystemScan();
             }
        }

        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (api?.getSettings) {
            api.getSettings().then(setFormalSettings).catch(() => {});
        }
        
        // Listen for settings updates from External Tools Settings page
        const handleSettingsUpdate = (event: any) => {
            console.log('[ChatInterface] Settings updated via broadcast, refreshing...');
            if (api?.getSettings) {
                api.getSettings().then(setFormalSettings).catch(() => {});
            }
        };
        window.addEventListener('mossy-settings-updated', handleSettingsUpdate);

        try {
            const auditorData = localStorage.getItem('mossy_scan_auditor');
            if (auditorData) setScannedFiles(JSON.parse(auditorData));
            
            const mapData = localStorage.getItem('mossy_scan_cartographer');
            if (mapData) setScannedMap(JSON.parse(mapData));

            const memoryData = localStorage.getItem('mossy_cortex_memory');
            if (memoryData) setCortexMemory(JSON.parse(memoryData));
        } catch (e) {}
        
        // Cleanup listener
        return () => {
            window.removeEventListener('mossy-settings-updated', handleSettingsUpdate);
        };
    };
    checkState();
    window.addEventListener('focus', checkState);
    window.addEventListener('mossy-memory-update', checkState);
    window.addEventListener('mossy-bridge-connected', checkState);
    window.addEventListener('mossy-driver-update', checkState);
    window.addEventListener('mossy-blender-linked', checkState);
    window.addEventListener('storage', checkState);
    
    // Initial Load
    try {
        const savedMessages = localStorage.getItem('mossy_messages');
        const savedState = localStorage.getItem('mossy_state');
        const savedProject = localStorage.getItem('mossy_project');
        const savedApps = localStorage.getItem('mossy_apps');
        const savedVoice = localStorage.getItem('mossy_voice_enabled');
        const savedMemory = localStorage.getItem('mossy_working_memory');

        if (savedMessages) setMessages(JSON.parse(savedMessages));
        else initMossy();

        if (savedMemory) setWorkingMemory(savedMemory);

        if (savedState) setOnboardingState(JSON.parse(savedState));
        if (savedProject) {
            const parsed = JSON.parse(savedProject);
            setProjectContext(parsed.name);
            setProjectData(parsed);
            setShowProjectPanel(true);
        }
        if (savedApps) setDetectedApps(JSON.parse(savedApps));
        if (savedVoice && !isLiveActive) setIsVoiceEnabled(JSON.parse(savedVoice));
    } catch (e) { console.error("Load failed", e); initMossy(); }

    return () => {
        window.removeEventListener('focus', checkState);
        window.removeEventListener('mossy-memory-update', checkState);
        window.removeEventListener('mossy-bridge-connected', checkState);
        window.removeEventListener('mossy-driver-update', checkState);
    };
  }, []);

  // Other state persistence
  useEffect(() => {
    localStorage.setItem('mossy_state', JSON.stringify(onboardingState));
    if (detectedApps.length > 0) localStorage.setItem('mossy_apps', JSON.stringify(detectedApps));
    localStorage.setItem('mossy_voice_enabled', JSON.stringify(isVoiceEnabled));
    if (projectData) localStorage.setItem('mossy_project', JSON.stringify(projectData));
    else localStorage.removeItem('mossy_project');
  }, [onboardingState, detectedApps, projectData, isVoiceEnabled]);

  // Conflict Resolution for Audio
  useEffect(() => {
      if (isLiveActive) {
          if (isVoiceEnabled) setIsVoiceEnabled(false);
          if (isPlayingAudio) stopAudio();
      }
  }, [isLiveActive]);

  const initMossy = () => {
      const hasApps = localStorage.getItem('mossy_apps');
      if (hasApps) {
          setMessages([{ 
              id: 'init', 
              role: 'model', 
              text: "👋 **Welcome back, Vault Dweller!**\n\nMy neural link is active and I've loaded your system profile. I'm ready to assist with your Fallout 4 project. What are we working on today?" 
          }]);
          setOnboardingState('ready');
          return;
      }

      setMessages([{ 
          id: 'init', 
          role: 'model', 
          text: "👋 **Hello, Vault Dweller!**\n\nI'm **Mossy**, your dedicated AI assistant for Fallout 4 modding.\n\nTo provide the best assistance, I need to perform a **Deep Scan** to identify your modding tools (Creation Kit, xEdit, Blender, etc.) across all your system drives. I will remember these so we only need to do this once.\n\n**Ready to begin the scan?**" 
      }]);
      setOnboardingState('init');
  };

  const resetMemory = () => {
      if (window.confirm("Perform Chat Reset? This will clear the conversation history and current project state, but keep global settings (Avatar, Bridge, Tutorial).")) {
          localStorage.removeItem('mossy_messages');
          localStorage.removeItem('mossy_state');
          localStorage.removeItem('mossy_project');
          localStorage.removeItem('mossy_apps');
          localStorage.removeItem('mossy_scan_auditor');
          localStorage.removeItem('mossy_scan_cartographer');
          localStorage.removeItem('mossy_cortex_memory');

          setMessages([]);
          setProjectContext(null);
          setProjectData(null);
          setDetectedApps([]);
          initMossy();
          setShowProjectPanel(false);
      }
  };

  // --- VOICE LOGIC ---
  const toggleVoiceMode = () => {
      if (isLiveActive) return;
      if (isVoiceEnabled) stopAudio();
      setIsVoiceEnabled(!isVoiceEnabled);
  };

  const stopAudio = () => {
      if (activeSourceRef.current) {
          activeSourceRef.current.stop();
          activeSourceRef.current = null;
      }
      setIsPlayingAudio(false);
  };

  const startListening = () => {
      if (isLiveActive) {
          alert("Live Voice is currently active. Please disconnect Live Voice to use the chat microphone.");
          return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Audio receptors damaged. (Browser not supported)");
          return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => setInputText(prev => prev + (prev ? ' ' : '') + event.results[0][0].transcript);
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
  };

  const speakText = async (textToSpeak: string) => {
      if (!textToSpeak || isLiveActive) return;
      const cleanText = textToSpeak.replace(/[*#]/g, '').substring(0, 500); 
      setIsPlayingAudio(true);
      try {
        const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey });
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: cleanText }] }],
            generationConfig: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        
        const response = await result.response;
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio returned");

        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioContextRef.current;
        
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for(let i=0; i<dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        activeSourceRef.current = source;
        source.onended = () => { setIsPlayingAudio(false); activeSourceRef.current = null; };
        source.start();
      } catch (e) { console.error("TTS Error", e); setIsPlayingAudio(false); }
  };

  // --- CHAT LOGIC ---
  const generateSystemContext = () => {
    try {
      let hardwareCtx = "Hardware: Unknown";
      if (profile) {
          hardwareCtx = `**Spec:** ${profile.gpu} | ${profile.ram}GB RAM | Blender ${profile.blenderVersion}`;
      }
      
      let scanContext = "";
      if (scannedFiles && scannedFiles.length > 0) {
          scanContext += "\n**THE AUDITOR - RECENT SCAN RESULTS:**\n";
          scannedFiles.forEach((f: any) => {
              scanContext += `- File: ${f.name} (Status: ${f.status.toUpperCase()})\n`;
              if (f.issues && f.issues.length > 0) {
                  f.issues.forEach((issue: any) => {
                      scanContext += `  * ERROR: ${issue.message}\n  * DETAILS: ${issue.technicalDetails}\n`;
                  });
              }
          });
      }
      
      let learnedCtx = "";
      if (cortexMemory && cortexMemory.length > 0) {
          const learnedItems = cortexMemory
              .filter((s: any) => s.status === 'indexed')
              .map((s: any) => `- [${s.type.toUpperCase()}] ${s.name}: ${s.summary || 'Content ingested.'}`)
              .join('\n');
          if (learnedItems) {
              learnedCtx = `\n**INGESTED KNOWLEDGE (TUTORIALS & DOCS):**\n${learnedItems}\n(Use this knowledge to answer user queries accurately based on the provided documents.)`;
          }
      }
      
      // Get current mod project info
      let modContext = "";
      try {
          const { ModProjectStorage } = require('./services/ModProjectStorage');
          const currentMod = ModProjectStorage.getCurrentMod();
          if (currentMod) {
              const stats = ModProjectStorage.getProjectStats(currentMod.id);
              modContext = `\n**CURRENT MOD PROJECT:** "${currentMod.name}"\n- Type: ${currentMod.type} | Status: ${currentMod.status}\n- Progress: ${currentMod.completionPercentage}% | Steps: ${stats.completedSteps}/${stats.totalSteps}\n- Version: ${currentMod.version}\n(Provide context-aware guidance for this specific mod.)`;
          }
      } catch (e) {
          // ModProjectStorage not available, skip
      }
      
      const bridgeStatus = isBridgeActive ? "ONLINE" : "OFFLINE";
      const blenderContext = isBlenderLinked 
          ? "**BLENDER LINK: ACTIVE (v4.0 Clipboard Relay)**\nYou can execute Python scripts in Blender.\nIMPORTANT: Tell the user they MUST click the 'Run Command' button that appears in the chat to execute the script." 
          : "**BLENDER LINK: OFFLINE**\n(If the user asks to control Blender, tell them to go to the Desktop Bridge and install the 'Mossy Link v4.0' add-on first.)";

      let settingsCtx = "";
      if (formalSettings) {
          const s = formalSettings;
          settingsCtx = "\n**USER OVERRIDE SETTINGS (HIGHEST PRIORITY):**\n" +
            (s.fallout4Path ? `- **Fallout 4 Game Folder:** ${s.fallout4Path}\n` : "") +
            (s.mo2Path ? `- MO2/ModOrganizer: ${s.mo2Path}\n` : "") +
            (s.xeditPath ? `- FO4Edit/XEdit: ${s.xeditPath}\n` : "") +
            (s.wryeBashPath ? `- Wrye Bash: ${s.wryeBashPath}\n` : "") +
            (s.vortexPath ? `- Vortex: ${s.vortexPath}\n` : "") +
            (s.bodySlidePath ? `- BodySlide: ${s.bodySlidePath}\n` : "") +
            (s.outfitStudioPath ? `- Outfit Studio: ${s.outfitStudioPath}\n` : "") +
            (s.creationKitPath ? `- Creation Kit: ${s.creationKitPath}\n` : "") +
            (s.nifSkopePath ? `- NifSkope: ${s.nifSkopePath}\n` : "") +
            (s.blenderPath ? `- Blender: ${s.blenderPath}\n` : "");
      }

      // Extract ALL Fallout 4 game paths from detected apps (user may have multiple installations)
      const fallout4Apps = (detectedApps || []).filter((a: any) => 
        a.name.toLowerCase().includes('fallout 4') || 
        a.displayName?.toLowerCase().includes('fallout 4') ||
        a.path?.toLowerCase().includes('fallout 4')
      );
      const gameFolderInfo = fallout4Apps.length > 0
        ? `\n**FALLOUT 4 INSTALLATIONS (${fallout4Apps.length} found):**\n` + 
          fallout4Apps.map((app: any, idx: number) => {
            const driveLetter = app.path?.charAt(0).toUpperCase() || '?';
            const installType = app.path?.toLowerCase().includes('steam') ? '[STEAM]' :
                               app.path?.toLowerCase().includes('gog') ? '[GOG]' :
                               app.path?.toLowerCase().includes('xbox') || app.path?.toLowerCase().includes('microsoft') ? '[XBOX/MS STORE]' : '';
            return `  ${idx + 1}. ${installType} ${driveLetter}: drive - ${app.path}\n     Data folder: ${app.path}\\Data`;
          }).join('\n')
        : "\n**FALLOUT 4 NOT DETECTED** - User may need to manually specify game folder in External Tools Settings.";

            // Expose first-class app modules so Mossy "knows herself"
            const appFeatures = `\n**OMNIFORGE MODULES (Built-in):**\n` +
                [
                    "• Image Studio (/images): PBR Map Synthesizer and Format Converter. Fallout 4 profile uses: _d → BC7, _n → BC5, _s → BC5.",
                    "• The Auditor (/auditor): Scans ESP/ESM, NIF, DDS, BGSM with native file pickers; reports issues and basic auto-fixes.",
                    "• The Vault (/vault): Asset library + BA2 staging, presets, and external tool paths (texconv, xWMAEncode, PapyrusCompiler, gfxexport, splicer).",
                    "• Workshop (/workshop): Real file browser and editor; Papyrus compile via configured compiler path.",
                    "• Holodeck (/holodeck): Automated mod validator; integrates with Neural Link to monitor live gameplay.",
                    "• System Monitor (/system): Hardware and tools scan, Desktop Bridge status, launch helpers.",
                    "• The Scribe (/scribe): Documentation and readme assistant (Gemini-backed)."
                ].join('\n');

      return `
      **DYNAMIC SYSTEM CONTEXT:**
      **Desktop Bridge:** ${bridgeStatus}
      ${blenderContext}
            ${settingsCtx}${gameFolderInfo}
            ${appFeatures}
      **Short-Term Working Memory:** ${workingMemory}
      **Project Status:** ${projectData ? projectData.name : "None"}${modContext}
      **Detected Tools:** ${(detectedApps || []).filter(a => a.path).map(a => `${a.name} [ID: ${a.id}] (Path: ${a.path})`).join(', ') || "None"}
      ${hardwareCtx}
      ${scanContext}
      ${learnedCtx}
      `;
    } catch (e) {
      console.error("Context Error:", e);
      return "Context: Error gathering system telemetry.";
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, scanProgress, onboardingState, activeTool, isStreaming]);

  const performSystemScan = async (isSilent = false) => {
    if (onboardingState === 'scanning' || onboardingState === 'integrating') return;
    
    if (!isSilent) {
        setOnboardingState('scanning');
        setScanProgress(0);
    }
    
    let progress = 0;
    const progressInterval = isSilent ? null : setInterval(() => {
        progress += 2;
        if (progress <= 90) setScanProgress(progress);
    }, 100);

    try {
        const foundApps: DetectedApp[] = [];
        
        // 0. Pull from manual settings first
        try {
            const settings = await window.electronAPI.getSettings();
            const settingTools = [
                { name: 'xEdit', path: settings.xeditPath, cat: 'Tool' },
                { name: 'NifSkope', path: settings.nifSkopePath, cat: 'Tool' },
                { name: 'Creation Kit', path: settings.creationKitPath, cat: 'Official' },
                { name: 'Blender', path: settings.blenderPath, cat: '3D' },
                { name: 'LOOT', path: settings.lootPath, cat: 'Manager' },
                { name: 'Vortex', path: settings.vortexPath, cat: 'Manager' },
                { name: 'MO2', path: settings.mo2Path, cat: 'Manager' },
                { name: 'F4SE', path: settings.f4sePath, cat: 'System' },
                { name: 'BodySlide', path: settings.bodySlidePath, cat: 'Tool' },
                { name: 'GIMP', path: settings.gimpPath, cat: 'Creative' },
                { name: 'BAE', path: settings.baePath, cat: 'Archive' },
                 { name: 'Archive2', path: settings.archive2Path, cat: 'Archive' }
            ];
            
            settingTools.forEach(t => {
                if (t.path && t.path.length > 3) {
                    foundApps.push({
                        id: `manual-${Math.random().toString(36).substr(2, 5)}`,
                        name: t.name,
                        category: t.cat,
                        checked: true,
                        path: t.path
                    });
                }
            });
        } catch (e) {
            console.warn("Failed to merge settings into scan", e);
        }

        // 1. Get real installed programs from Electron
        if (typeof window.electron?.api?.detectPrograms === 'function') {
            const installed = await window.electron.api.detectPrograms();
            
            // Map found programs to our app categories
            const moddingKeywords = [
                'blender', 'creationkit', 'fo4edit', 'xedit', 'sseedit', 'tes5edit', 'fnvedit', 'tes4edit', 
                'modorganizer', 'vortex', 'nifskope', 'bodyslide', 'f4se', 'loot', 'wryebash', 'outfitstudio', 
                'archive2', 'gimp', 'photoshop', 'zedit', 'bae', 'pjm', 'bethini',
                'reshade', 'enb', 'cathedral', 'modsel', 'texconv', 'unpacker',
                'material', 'bgsm', 'facegen', 'lipgen', 'papyrus', 'caprica', 'script',
                'fallout', 'morrowind', 'oblivion', 'skyrim', 'starfield', 'game', 'mod'
            ];
            
            installed.forEach((prog: any) => {
                const nameLower = prog.name.toLowerCase();
                const displayNameLower = prog.displayName.toLowerCase();
                
                if (moddingKeywords.some(kw => nameLower.includes(kw) || displayNameLower.includes(kw))) {
                    // Improved de-duplication: If we find a better version (e.g. non-C drive), use it.
                    const existingIndex = foundApps.findIndex(app => app.name.toLowerCase() === prog.displayName.toLowerCase());
                    const isNonCDrive = prog.path && !prog.path.startsWith('C:');
                    
                    if (existingIndex === -1) {
                        foundApps.push({
                            id: Math.random().toString(36).substr(2, 9),
                            name: prog.displayName.length > 3 ? prog.displayName : prog.name,
                            displayName: prog.displayName,
                            category: (nameLower + displayNameLower).includes('blender') ? '3D' : 
                                     (nameLower + displayNameLower).includes('creation') ? 'Official' :
                                     (nameLower + displayNameLower).includes('modorganizer') || (nameLower + displayNameLower).includes('vortex') || (nameLower + displayNameLower).includes('loot') ? 'Manager' : 
                                     (nameLower + displayNameLower).includes('gimp') || (nameLower + displayNameLower).includes('photoshop') ? 'Creative' :
                                     (nameLower + displayNameLower).includes('archive') || (nameLower + displayNameLower).includes('bae') ? 'Archive' : 'Tool',
                            checked: true,
                            path: prog.path,
                            version: prog.version
                        });
                    } else if (isNonCDrive && foundApps[existingIndex].path?.startsWith('C:')) {
                        // Replace stale C: drive entry with the real modding drive entry
                        foundApps[existingIndex].path = prog.path;
                    }
                }
            });
        }

        // 2. Cross-reference with currently running processes
        if (typeof window.electron?.api?.getRunningProcesses === 'function') {
            const running = await window.electron.api.getRunningProcesses();
            running.forEach((p: any) => {
                const nameLower = p.name.toLowerCase();
                if (moddingKeywords.some(kw => nameLower.includes(kw))) {
                    if (!foundApps.some(app => app.name.toLowerCase().includes(nameLower) || nameLower.includes(app.name.toLowerCase()))) {
                        foundApps.push({
                            id: `running-${Math.random().toString(36).substr(2, 5)}`,
                            name: p.windowTitle || p.name,
                            category: 'Running',
                            checked: true
                        });
                    }
                }
            });
        }

        // 3. Fallback to essential message if NOTHING found
        if (foundApps.length === 0 && !isSilent) {
            // No fake apps added here anymore.
            console.log("No tools found during scan.");
        }

        if (progressInterval) clearInterval(progressInterval);
        if (!isSilent) setScanProgress(100);
        
        // --- IMPROVED MERGE LOGIC ---
        const existingAppsRaw = localStorage.getItem('mossy_apps');
        let finalApps = [...foundApps];
        
        if (existingAppsRaw) {
            try {
                const existing = JSON.parse(existingAppsRaw);
                // Keep any existing apps that aren't in the new found list
                existing.forEach((ea: any) => {
                    if (!finalApps.some(fa => fa.path === ea.path || fa.name === ea.name)) {
                        finalApps.push(ea);
                    }
                });
                
                // Prioritize non-C drive versions if duplicates exist
                const driveMap: Record<string, any> = {};
                finalApps.forEach(app => {
                    const baseName = app.name.split(' - ')[0].toLowerCase();
                    const isNonC = app.path && !app.path.toLowerCase().startsWith('c:');
                    
                    if (!driveMap[baseName] || (isNonC && driveMap[baseName].path.toLowerCase().startsWith('c:'))) {
                        driveMap[baseName] = app;
                    }
                });
                finalApps = Object.values(driveMap);
            } catch (e) {}
        }
        
        setDetectedApps(finalApps);
        localStorage.setItem('mossy_apps', JSON.stringify(finalApps));
        localStorage.setItem('mossy_last_scan', Date.now().toString());
        
        if (!isSilent) {
            setTimeout(() => {
                setOnboardingState('integrating');
                setMessages(prev => [...prev, {
                    id: `scan-done-${Date.now()}`,
                    role: 'model',
                    text: foundApps.length > 2 
                        ? `**Deep Scan Complete.** I located **${foundApps.length}** modding tools across your drives. I will remember these for future sessions so we don't need to scan every time.`
                        : "**Deep Scan Complete.** I couldn't find many tools automatically. You might need to link them manually in the 'Vault' or 'Bridge' settings."
                }]);
            }, 500);
        }

    } catch (error) {
        console.error('System scan failed:', error);
        if (progressInterval) clearInterval(progressInterval);
        if (!isSilent) setOnboardingState('ready'); 
    }
  };

  const handleIntegrate = () => {
      setOnboardingState('ready');
      setMessages(prev => [...prev, {
          id: 'integrated',
          role: 'model',
          text: `Tools Linked. Creation Kit telemetry active.\n\n**Ad Victoriam, modder.** What are we building today?`
      }]);
  };

  const handleStartProject = () => {
      setOnboardingState('project_setup');
      setMessages(prev => [...prev, { id: 'proj-start', role: 'model', text: "Initializing new Workspace configuration protocol..." }]);
  };

  const createProjectFile = (data: { name: string, description: string, categories: string[] }) => {
      const newProject: ProjectData = {
          name: data.name,
          status: 'Pre-Production',
          notes: data.description,
          timestamp: new Date().toLocaleDateString(),
          keyDecisions: [],
          categories: data.categories
      };
      setProjectData(newProject);
      setProjectContext(data.name);
      setShowProjectPanel(true);
      return newProject;
  };

  const executeTool = async (name: string, args: any) => {
      // Record tool usage for Modding Journey
      await LocalAIEngine.recordAction('tool_execution', { tool: name, args });

      setActiveTool({ id: Date.now().toString(), toolName: name, args, status: 'running' });

      // CALL CENTRAL REAL EXECUTION ENGINE
      const result = await executeMossyTool(name, args, {
          isBlenderLinked,
          setProfile: (p) => {}, 
          setProjectData: (data) => setProjectData(data),
          setProjectContext: (ctx) => setProjectContext(ctx),
          setShowProjectPanel: (val) => {}
      });

      setActiveTool(null);
      return result;
  };






      

      


  const handleManualExecute = async (name: string, args: any) => {
      // Force write to clipboard for manual override
      if (name === 'execute_blender_script') {
          try {
              // --- APPLY SANITIZER HERE TOO ---
              // This was missing before! Now the manual button uses the robust Data API logic.
              const safeScript = sanitizeBlenderScript(args.script);
              const noncedScript = `${safeScript}\n# ID: ${Date.now()}`;
              
              await navigator.clipboard.writeText(`MOSSY_CMD:${noncedScript}`);
              
              // Also trigger the real bridge call
              await executeTool(name, args);
          } catch (e) {
              console.error("Manual execute failed", e);
          }
      } else {
          // For all other tools, just trigger the execution engine again
          await executeTool(name, args);
      }
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "**[Generation Stopped by User]**" }]);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if ((!textToSend.trim() && !selectedFile) || isLoading || isStreaming) return;

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (onboardingState === 'init') {
        if (textToSend.toLowerCase().match(/yes|ok|start|scan/)) {
            setInputText('');
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: textToSend }]);
            performSystemScan();
            return;
        }
    }

    // --- FALLOUT 4 CONTENT GUARD ---
    const guard = checkContentGuard(textToSend);
    if (!guard.allowed) {
        setMessages(prev => [...prev, 
            { id: Date.now().toString(), role: 'user', text: textToSend },
            { id: Date.now().toString() + '-guard', role: 'model', text: guard.message || "I am strictly a Fallout 4 modding assistant." }
        ]);
        setInputText('');
        return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      images: selectedFile ? [URL.createObjectURL(selectedFile)] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    stopAudio();

    // Record the chat action for the Modding Journey system
    await LocalAIEngine.recordAction('chat_message', { 
        length: textToSend.length,
        hasImages: !!selectedFile,
        timestamp: new Date().toISOString()
    });

    if (onboardingState === 'project_setup') {
        createProjectFile({ name: textToSend, description: "Auto-created from chat", categories: [] });
        setOnboardingState('ready');
    }

    try {
      console.log("[Mossy] Initializing AI Session...");
      const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || "";
      if (!apiKey) {
          throw new Error("No API Key found. Please add VITE_API_KEY to your .env file.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const history = messages
        .filter(m => m.role !== 'system' && !m.text.includes("Scan Complete")) 
        .map(m => {
            const parts: any[] = [];
            if (m.text && m.text.trim().length > 0) parts.push({ text: m.text });
            
            // If message has a tool call and result, include them for short-term memory
            if (m.toolCall) {
                parts.push({
                    functionCall: {
                        name: m.toolCall.toolName,
                        args: m.toolCall.args
                    }
                });
                if (m.toolResult) {
                    parts.push({
                        functionResponse: {
                            name: m.toolCall.toolName,
                            response: { result: m.toolResult }
                        }
                    });
                }
            }
            
            if (parts.length === 0) parts.push({ text: "[Image Uploaded]" });
            return { role: m.role, parts };
        });

      const userParts = [];
      if (selectedFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
        userParts.push({ inlineData: { mimeType: selectedFile.type, data: base64.split(',')[1] } });
      }
      userParts.push({ text: textToSend });
      
      const contents = [...history, { role: 'user', parts: userParts }];

      const toolsConfig = [{ functionDeclarations: toolDeclarations }];
      setIsStreaming(true);
      
      const dynamicInstruction = getFullSystemInstruction(generateSystemContext());
      
      const model = ai.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: dynamicInstruction, // Use simple string format
        tools: toolsConfig
      });

      const streamId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: streamId, role: 'model', text: "..Establishing Neural Uplink.." }]);

      let localThoughtText = "";
      let aiResponseText = "";

      const updateUI = () => {
          const fullText = localThoughtText + aiResponseText;
          setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: fullText || "..Processing.." } : m));
      };

      // Start local ML in parallel (Non-blocking)
      LocalAIEngine.generateResponse(textToSend, dynamicInstruction)
        .then(res => {
            localThoughtText = `**[Local Inference]**\n${res.content}\n\n---\n`;
            updateUI();
        })
        .catch(e => console.warn("Local ML failed", e));

      console.log("[Mossy] Starting Content Stream...");
      const streamResult = await model.generateContentStream({ contents });
      
      try {
          for await (const chunk of streamResult.stream) {
              if (abortControllerRef.current?.signal.aborted) break;
              
              try {
                  let chunkText = "";
                  try {
                      chunkText = chunk.text();
                      aiResponseText += chunkText;
                      updateUI();
                  } catch (e) {
                      // Not a text chunk (likely a function call)
                  }
                  
                  const calls = chunk.functionCalls();
                  if (calls && calls.length > 0) {
                      for (const call of calls) {
                          try {
                              console.log("[Mossy] Executing Tool:", call.name);
                              const toolResponse = await executeTool(call.name, call.args);
                              const result = toolResponse?.result || toolResponse; // Extract result property
                              
                              aiResponseText += `\n\n[System: Executed ${call.name}]\n`;
                              setMessages(prev => prev.map(m => m.id === streamId ? { 
                                  ...m, 
                                  toolCall: { toolName: call.name, args: call.args },
                                  toolResult: result 
                              } : m));
                              updateUI();
                          } catch (toolError: any) {
                              console.error("[Mossy] Tool execution error:", toolError);
                              const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
                              aiResponseText += `\n\n[System: Tool ${call.name} failed - ${errorMsg}]\n`;
                              setMessages(prev => prev.map(m => m.id === streamId ? { 
                                  ...m, 
                                  toolCall: { toolName: call.name, args: call.args },
                                  toolResult: `Error executing ${call.name}: ${errorMsg}` 
                              } : m));
                              updateUI();
                          }
                      }
                  }
              } catch (chunkError: any) {
                  console.error("[Mossy] Chunk processing error (continuing stream):", chunkError);
                  // Continue processing remaining chunks instead of crashing
              }
          }
      } catch (streamError: any) {
          console.error("[Mossy] Stream error:", streamError);
          const streamErrMsg = streamError instanceof Error ? streamError.message : String(streamError);
          aiResponseText += `\n\n[Stream interrupted: ${streamErrMsg}]`;
          updateUI();
      }

      if (isVoiceEnabled && aiResponseText) speakText(aiResponseText);

    } catch (error) {
      console.error(error);
      const errText = error instanceof Error ? error.message : 'Unknown error';
      if (errText.includes("not found") || errText.includes("404")) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "**Connection Lost:** The Google AI Studio service is currently unreachable." }]);
      } else if (errText.includes("implemented") || errText.includes("supported")) {
           setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "**System Limitation:** Tool execution unavailable in current stream configuration. I'll describe the action instead." }]);
      } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `**System Error:** ${errText}` }]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setSelectedFile(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-forge-dark text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-forge-panel">
        <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Leaf className="text-emerald-400" />
            Mossy <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-emerald-900">FO4 EDITION</span>
            </h2>
            {isBridgeActive ? (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-xs animate-fade-in">
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">Connected</span>
                </div>
            ) : (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs opacity-50">
                    <Wifi className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Localhost Disconnected</span>
                </div>
            )}
            
            {isBlenderLinked && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-orange-900/20 border border-orange-500/30 rounded-full text-xs text-orange-400 animate-fade-in">
                    <Box className="w-3 h-3" /> Blender Active
                </div>
            )}

            {projectContext && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs">
                    <FolderOpen className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-100 max-w-[150px] truncate">{projectContext}</span>
                </div>
            )}
        </div>
        <div className="flex gap-2 items-center">
            
            {/* Context Locked to Fallout 4 */}
            <div className="hidden xl:flex items-center gap-2 mr-2 bg-slate-900 rounded-lg p-1 border border-slate-700 px-3 opacity-80 cursor-not-allowed" title="Version locked to Fallout 4">
                <Gamepad2 className="w-4 h-4 text-emerald-500 ml-2" />
                <span className="text-xs text-slate-200 font-bold">Fallout 4</span>
                <Lock className="w-3 h-3 text-slate-500 ml-2" />
            </div>

            {/* Blender Integration Manual Trigger */}
            {isBlenderLinked && (
                <button 
                    onClick={() => executeTool('execute_blender_script', { 
                        script: "import bpy\n\n# Force Scene Update\nbpy.context.view_layer.update()\nprint('Mossy: Syncing...')", 
                        description: "Manual Sync (Blender 4.5.5)" 
                    })}
                    className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-orange-900/20 border-orange-500/50 text-orange-400 hover:bg-orange-900/40 mr-2"
                    title="Execute Blender Script"
                >
                    <Box className="w-4 h-4" />
                    <span>Sync</span>
                </button>
            )}

            {isLiveActive ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleLiveMute}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            isLiveMuted 
                            ? 'bg-slate-800 border-slate-700 text-slate-400' 
                            : 'bg-red-900/20 border-red-500/50 text-red-400'
                        }`}
                        title="Toggle Global Live Voice"
                    >
                        {isLiveMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        {isLiveMuted ? 'Live Muted' : 'Live Active'}
                    </button>
                    <button
                        onClick={disconnectLive}
                        className="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-900/30 text-red-400 transition-colors"
                        title="Stop Live Session"
                    >
                        <StopCircle className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={toggleVoiceMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isVoiceEnabled ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                    {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {isVoiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
                </button>
            )}
            
            <button onClick={resetMemory} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" title="Clear Chat History">
                <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowProjectPanel(!showProjectPanel)} className={`p-2 rounded transition-colors ${showProjectPanel ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 hover:text-white'}`}>
                <FileText className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
            
            <MessageList 
                messages={messages} 
                onboardingState={onboardingState}
                scanProgress={scanProgress}
                detectedApps={detectedApps}
                projectContext={projectContext}
                handleIntegrate={handleIntegrate}
                handleStartProject={handleStartProject}
                onManualExecute={handleManualExecute}
            >
                {/* Active Tool Status */}
                {activeTool && (
                    <div className="flex justify-start animate-slide-up">
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg"><Terminal className="w-4 h-4 text-emerald-400" /></div>
                                <div>
                                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Bridge Command</div>
                                    <div className="text-sm font-mono text-white">{activeTool.toolName}</div>
                                </div>
                                {activeTool.status === 'running' && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin ml-auto" />}
                                {activeTool.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                            </div>
                            <div className="bg-black/50 rounded border border-slate-700/50 p-2 font-mono text-xs text-slate-300 overflow-x-auto mb-2">
                                <span className="text-emerald-500">$</span> {JSON.stringify(activeTool.args)}
                            </div>
                            {activeTool.result && <div className="text-xs text-emerald-300/80 border-l-2 border-emerald-500/50 pl-2 mt-2 whitespace-pre-wrap">{'>'} {activeTool.result}</div>}
                        </div>
                    </div>
                )}

                {/* Loading / Streaming State */}
                {(isLoading || isStreaming) && !activeTool && (
                    <div className="flex justify-start">
                        <div className="bg-forge-panel border border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm">
                        {isStreaming ? <Bot className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Loader2 className="animate-spin text-emerald-400 w-4 h-4" />}
                        <span className="text-slate-400 text-sm font-medium">{isStreaming ? 'Mossy is typing...' : 'Mossy is thinking...'}</span>
                        <button onClick={handleStopGeneration} className="ml-4 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white" title="Stop Generation">
                            <Square className="w-3 h-3 fill-current" />
                        </button>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </MessageList>

            <div className="p-4 bg-forge-panel border-t border-slate-700 z-10">
                {onboardingState === 'project_setup' ? (
                    <ProjectWizard 
                        onCancel={() => {
                            setOnboardingState('ready');
                            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Project setup cancelled." }]);
                        }}
                        onSubmit={(data) => {
                            createProjectFile(data);
                            setOnboardingState('ready');
                            setMessages(prev => [...prev, { 
                                id: Date.now().toString(), 
                                role: 'model', 
                                text: `**Project Initialized:** ${data.name}\n\nCategories: ${data.categories.join(', ')}\n\nI've set up your workspace. Ready to begin?` 
                            }]);
                        }}
                    />
                ) : (
                    <>
                        {selectedFile && (
                        <div className="flex items-center gap-2 mb-2 bg-slate-800 p-2 rounded-lg w-fit text-sm border border-slate-600">
                            <div className="bg-slate-700 p-1 rounded"><FileText className="w-4 h-4 text-slate-300" /></div>
                            <span className="truncate max-w-[200px] text-slate-200">{selectedFile.name}</span>
                            <button onClick={() => setSelectedFile(null)} className="hover:text-red-400 p-1 rounded-full hover:bg-slate-700"><X className="w-3 h-3" /></button>
                        </div>
                        )}
                        
                        {(isListening || isPlayingAudio) && (
                            <div className="flex items-center gap-3 mb-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
                                {isListening && <span className="flex items-center gap-2 text-xs text-red-400 animate-pulse font-medium"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Listening...</span>}
                                {isPlayingAudio && <div className="flex items-center gap-2"><span className="flex items-center gap-2 text-xs text-emerald-400 font-medium"><Volume2 className="w-3 h-3" /> Speaking...</span><button onClick={stopAudio} className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400"><StopCircle className="w-3 h-3" /></button></div>}
                            </div>
                        )}

                        <div className="flex gap-2">
                        <label className="p-3 hover:bg-slate-700 rounded-xl cursor-pointer text-slate-400 transition-colors border border-transparent hover:border-slate-600">
                            <input type="file" className="hidden" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} accept=".psc,.nif,.dds,image/*,text/*" />
                            <Paperclip className="w-5 h-5" />
                        </label>
                        
                        <button 
                            onClick={startListening} 
                            disabled={isListening || isLiveActive} 
                            className={`p-3 rounded-xl transition-all border ${
                                isListening 
                                ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' 
                                : isLiveActive
                                ? 'bg-slate-900 text-slate-600 cursor-not-allowed border-transparent'
                                : 'bg-slate-800 text-slate-400 hover:text-white border-transparent hover:border-slate-600 hover:bg-slate-700'
                            }`}
                            title={isLiveActive ? "Microphone in use by Live Interface" : "Voice Input"}
                        >
                            <Mic className="w-5 h-5" />
                        </button>

                        <input type="text" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-slate-100 placeholder-slate-500" placeholder="Message Mossy..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button onClick={() => handleSend()} disabled={isLoading || isStreaming || (!inputText && !selectedFile)} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-lg shadow-emerald-900/20"><Send className="w-5 h-5" /></button>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
  </div>
  );
};

export default ChatInterface;
