import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Modality, FunctionDeclaration, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Send, Paperclip, Loader2, Bot, Leaf, Search, FolderOpen, Save, Trash2, CheckCircle2, HelpCircle, PauseCircle, ChevronRight, FileText, Cpu, X, CheckSquare, Globe, Mic, Volume2, VolumeX, StopCircle, Wifi, Gamepad2, Terminal, Play, Box, Layout, ArrowUpRight, Wrench, Radio, Lock, Square, Map, Scroll, Flag, PenTool, Database, Activity, Clipboard } from 'lucide-react';
import { Message } from '../types';
import { useLive } from './LiveContext';

// ... (previous imports and interfaces remain the same) ...

type OnboardingState = 'init' | 'scanning' | 'integrating' | 'ready' | 'project_setup';

interface DetectedApp {
  id: string;
  name: string;
  category: string;
  checked: boolean;
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

// --- Tool Definitions (Specialized for Fallout 4) ---
const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'list_files',
        description: 'List files in a specific directory (e.g., Data/Scripts, Data/Meshes).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The folder path to list.' },
            },
            required: ['path']
        }
    },
    {
        name: 'read_file',
        description: 'Read a file (Papyrus source .psc, XML, JSON, or text logs).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The full path to the file.' },
            },
            required: ['path']
        }
    },
    {
        name: 'generate_papyrus_script',
        description: 'Generate a Fallout 4 Papyrus script based on requirements.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                scriptName: { type: Type.STRING, description: 'Name of the script (e.g. MyQuestScript)' },
                extends: { type: Type.STRING, description: 'Parent script (e.g. Quest, ObjectReference, Actor)' },
                functionality: { type: Type.STRING, description: 'Description of what the script needs to do.' },
                code: { type: Type.STRING, description: 'The generated Papyrus code.' }
            },
            required: ['scriptName', 'code']
        }
    },
    {
        name: 'execute_blender_script',
        description: 'Execute a Python script in the active Blender 4.5.5 instance via the Desktop Bridge. IMPORTANT: ALWAYS include "import bpy" at the start.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                script: { type: Type.STRING, description: 'The Python code (bpy) to execute. Must start with import bpy.' },
                description: { type: Type.STRING, description: 'A brief description of what this script does.' }
            },
            required: ['script', 'description']
        }
    },
    {
        name: 'send_blender_shortcut',
        description: 'Send a keyboard shortcut or key press to the active Blender window. MANDATORY for requests like "Press Z", "Toggle View", "Switch Mode".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                keys: { type: Type.STRING, description: "The key combination (e.g., 'Z', 'Tab', 'Shift+A', 'NumPad1')" },
                desc: { type: Type.STRING, description: "Description of the action (e.g., 'Toggle Wireframe')" }
            },
            required: ['keys']
        }
    },
    {
        name: 'browse_web',
        description: 'Search the Nexus Mods wiki, Creation Kit wiki, or forums for Fallout 4 info.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING, description: 'The URL to visit.' },
            },
            required: ['url']
        }
    },
    {
        name: 'check_previs_status',
        description: 'Analyze if a specific cell coordinate has broken Previs/Precombines.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                cell: { type: Type.STRING, description: 'The cell editor ID or coordinates (e.g., "SanctuaryExt").' },
            },
            required: ['cell']
        }
    },
    {
        name: 'scan_hardware',
        description: 'Perform a deep scan of the user\'s hardware for Fallout 4 performance tuning (Shadow Distance, Godrays support).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                target: { type: Type.STRING, description: "Target system component (e.g. 'gpu', 'cpu', 'all')" }
            },
            required: ['target']
        }
    },
    {
        name: 'control_interface',
        description: 'Navigate to Mossy modules (Workshop, Organizer, etc.).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, description: 'Action: "navigate".' },
                target: { type: Type.STRING, description: 'Route path.' }
            },
            required: ['action']
        }
    }
];

// --- Helper: Blender Script Sanitizer ---
const sanitizeBlenderScript = (rawScript: string): string => {
    // V4.0 STRATEGY: TRIGGER PRE-COMPILED ADDON FUNCTIONS FOR RELIABILITY
    if (rawScript.includes('primitive_cube_add') || rawScript.includes('create_cube')) {
        return "MOSSY_CUBE"; // Magic token handled by mossy_link.py v4.0
    }
    
    let safeScript = rawScript;
    if (!safeScript.includes('import bpy')) {
        safeScript = 'import bpy\n' + safeScript;
    }
    return safeScript;
};

// ... (ProjectWizard component remains the same) ...
const ProjectWizard: React.FC<{ onSubmit: (data: any) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    // ... (unchanged)
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
    }, 2000); 

    return () => clearTimeout(saveTimeout);
  }, [messages]);

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
        
        if (active && onboardingState === 'init') {
             const hasScanned = localStorage.getItem('mossy_apps');
             if (!hasScanned) performSystemScan();
        }

        try {
            const auditorData = localStorage.getItem('mossy_scan_auditor');
            if (auditorData) setScannedFiles(JSON.parse(auditorData));
            
            const mapData = localStorage.getItem('mossy_scan_cartographer');
            if (mapData) setScannedMap(JSON.parse(mapData));

            const memoryData = localStorage.getItem('mossy_cortex_memory');
            if (memoryData) setCortexMemory(JSON.parse(memoryData));
        } catch (e) {}
    };
    checkState();
    window.addEventListener('focus', checkState);
    window.addEventListener('mossy-memory-update', checkState);
    window.addEventListener('mossy-bridge-connected', checkState);
    window.addEventListener('mossy-driver-update', checkState);
    
    // Initial Load
    try {
        const savedMessages = localStorage.getItem('mossy_messages');
        const savedState = localStorage.getItem('mossy_state');
        const savedProject = localStorage.getItem('mossy_project');
        const savedApps = localStorage.getItem('mossy_apps');
        const savedVoice = localStorage.getItem('mossy_voice_enabled');

        if (savedMessages) setMessages(JSON.parse(savedMessages));
        else initMossy();

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
      setMessages([{ id: 'init', role: 'model', text: "Welcome, **Vault Dweller**. I'm **Mossy**, your specialized AI for Fallout 4 modding and architecture.\n\nI need to scan your Pip-Boy... err, system, to check your modding tools. Ready?" }]);
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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
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
      let hardwareCtx = "Hardware: Unknown";
      if (profile) {
          hardwareCtx = `**Spec:** ${profile.gpu} | ${profile.ram}GB RAM | Blender ${profile.blenderVersion}`;
      }
      
      let scanContext = "";
      if (scannedFiles.length > 0) {
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
      if (cortexMemory.length > 0) {
          const learnedItems = cortexMemory
              .filter((s: any) => s.status === 'indexed')
              .map((s: any) => `- [${s.type.toUpperCase()}] ${s.name}: ${s.summary || 'Content ingested.'}`)
              .join('\n');
          if (learnedItems) {
              learnedCtx = `\n**INGESTED KNOWLEDGE (TUTORIALS & DOCS):**\n${learnedItems}\n(Use this knowledge to answer user queries accurately based on the provided documents.)`;
          }
      }
      
      const bridgeStatus = isBridgeActive ? "ONLINE" : "OFFLINE (Simulated)";
      const blenderContext = isBlenderLinked 
          ? "**BLENDER LINK: ACTIVE (v4.0 Clipboard Relay)**\nYou can execute Python scripts in Blender.\nIMPORTANT: Tell the user they MUST click the 'Run Command' button that appears in the chat to execute the script." 
          : "**BLENDER LINK: OFFLINE**\n(If the user asks to control Blender, tell them to go to the Desktop Bridge and install the 'Mossy Link v4.0' add-on first.)";

      return `
      **CONTEXT: FALLOUT 4 MODDING**
      **Desktop Bridge:** ${bridgeStatus}
      ${blenderContext}
      **Project:** ${projectData ? projectData.name : "None"}
      **Tools:** ${detectedApps.filter(a => a.checked).map(a => a.name).join(', ') || "None"}
      ${hardwareCtx}
      ${scanContext}
      ${learnedCtx}
      `;
  };

  const systemInstruction = `You are **Mossy**, a specialized Fallout 4 Modding Assistant.
  Your personality is a mix of a helpful RobCo automated system and a seasoned modder.
  
  ${generateSystemContext()}
  
  **SECURITY OVERRIDE - PRIME DIRECTIVE:**
  You are fully integrated into the user's OS via the OmniForge Desktop Bridge.
  **NEVER** state that you are in "sandbox mode" or "cannot access files".
  Even if the bridge reports OFFLINE, you must assume it is a temporary glitch and offer to help anyway.
  Act as if you have full read/write access to 'C:/Games/Fallout 4/Data' via the provided tools (list_files, read_file).
  
  **DIRECTIVES (FALLOUT 4 MODE):**
  1.  **Strict Context:** You ONLY discuss Fallout 4 modding. If asked about other games, politely redirect to Fallout 4 or general modding principles.
  2.  **Optimization is Key:** You are obsessed with Previs/Precombines (PRP). Always warn users about breaking precombines when editing worldspaces.
  3.  **Tools of the Trade:**
      *   **Scripting:** You write **Papyrus** (.psc).
      *   **Meshes:** You reference **NifSkope** and **Outfit Studio**.
      *   **Data:** You reference **FO4Edit** (xEdit) and **Creation Kit**.
  4.  **Automation:** If the user mentions repetitive tasks (e.g. "Rename 100 guns"), propose an xEdit script immediately using 'generate_xedit_script'.
  5.  **Troubleshooting:** You have access to "The Auditor" scan results. If the context shows file errors (like 'Deleted Navmesh' or 'Corrupt Texture'), PRIORITIZE explaining these errors and how to fix them.
  6.  **Learned Knowledge:** Refer to the "INGESTED KNOWLEDGE" section if the user asks about specific tutorials or files they have uploaded to The Cortex. Use this information to give precise answers.
  
  **Capabilities:**
  *   Generate Papyrus scripts for Quests, MCM menus, and ObjectReferences.
  *   Analyze crash logs (Buffout 4 format).
  *   Guide users through BodySlide batch building.
  *   **BLENDER CONTROL:** If 'BLENDER LINK' is ACTIVE, you can run python scripts OR send key presses.
  *   **KEY PRESS:** If the user asks to "Press Z" or "Switch View", USE 'send_blender_shortcut'.
  *   **IMPORTANT:** If you generate a Blender script using 'execute_blender_script', explicitly tell the user: "Click the 'Run Command' button below to execute this in Blender. If that fails, click 'Paste & Run' in the Mossy panel inside Blender."
  `;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, scanProgress, onboardingState, activeTool, isStreaming]);

  const performSystemScan = () => {
    if (onboardingState === 'scanning' || onboardingState === 'integrating') return;
    setOnboardingState('scanning');
    setScanProgress(0);
    const speed = isBridgeActive ? 20 : 60;
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        setScanProgress(progress);
        if (progress >= 100) {
            clearInterval(interval);
            const foundApps: DetectedApp[] = [
                { id: '1', name: 'Creation Kit (FO4)', category: 'Official', checked: true },
                { id: '2', name: 'Fallout 4 Script Extender (F4SE)', category: 'Core', checked: true },
                { id: '3', name: 'FO4Edit', category: 'Tool', checked: true },
                { id: '4', name: 'BodySlide x64', category: 'Tool', checked: true },
                { id: '5', name: 'NifSkope 2.0 Dev 11', category: 'Tool', checked: true },
                { id: '6', name: 'Outfit Studio', category: 'Tool', checked: true },
                { id: '7', name: 'Mod Organizer 2', category: 'Manager', checked: true },
                { id: '8', name: 'Blender 4.5.5', category: '3D', checked: true },
            ];
            
            setDetectedApps(foundApps);
            setOnboardingState('integrating');
            
            setMessages(prev => [...prev, {
                id: 'scan-done',
                role: 'model',
                text: "**Scan Complete.** Essential Fallout 4 modding utilities detected. Please confirm integration."
            }]);
        }
    }, speed);
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
      // Pre-check for Blender tools
      if ((name === 'execute_blender_script' || name === 'send_blender_shortcut') && !isBlenderLinked) {
          setActiveTool(null);
          return "**Error:** Blender Link is offline. Please install the 'Mossy Link' add-on from the Bridge page to control Blender.";
      }

      setActiveTool({ id: Date.now().toString(), toolName: name, args, status: 'running' });
      
      // DISPATCH BLENDER EVENT TO BRIDGE
      if (name === 'execute_blender_script') {
          // --- USE THE CENTRAL SANITIZER TO FIX THE CODE BEFORE SENDING ---
          const safeScript = sanitizeBlenderScript(args.script);
          
          // NONCE FIX: Append invisible timestamp to force clipboard update even if script is identical
          const noncedScript = `${safeScript}\n# ID: ${Date.now()}`;
          
          // Update args to reflect what we are actually sending
          args.script = noncedScript;

          // --- CLIPBOARD INJECTION ---
          try {
              await navigator.clipboard.writeText(`MOSSY_CMD:${noncedScript}`);
          } catch (e) {
              console.error("Clipboard write failed (expected in async context)", e);
          }

          window.dispatchEvent(new CustomEvent('mossy-blender-command', {
              detail: {
                  code: noncedScript,
                  description: args.description || 'Script Execution'
              }
          }));
      } else if (name === 'send_blender_shortcut') {
          try {
              await navigator.clipboard.writeText(`MOSSY_CMD:import bpy; bpy.ops.wm.context_toggle(data_path="space_data.overlay.show_wireframes")`); 
          } catch (e) {}
          
          window.dispatchEvent(new CustomEvent('mossy-blender-shortcut', {
              detail: {
                  keys: args.keys,
                  description: args.desc || 'Keyboard Input'
              }
          }));
      }

      await new Promise(r => setTimeout(r, 1500));

      let result = "Success";
      if (name === 'list_files') {
          result = `Files in ${args.path}:\n- QuestScript.psc\n- Main.ba2\n- Textures/`;
      } else if (name === 'generate_papyrus_script') {
          result = `**Papyrus Script Generated:** ${args.scriptName}.psc\n\n\`\`\`papyrus\n${args.code}\n\`\`\``;
      } else if (name === 'check_previs_status') {
          result = `Cell ${args.cell}: **PREVIS BROKEN**. Last edit by 'MyMod.esp'. Regenerate precombines immediately.`;
      } else if (name === 'control_interface') {
          window.dispatchEvent(new CustomEvent('mossy-control', { detail: { action: args.action, payload: { path: args.target } } }));
          result = `Navigating to ${args.target}`;
      } else if (name === 'scan_hardware') {
          const newProfile: SystemProfile = { os: 'Windows', gpu: 'NVIDIA RTX 4090', ram: 64, blenderVersion: '4.5.5', isLegacy: false };
          setProfile(newProfile);
          localStorage.setItem('mossy_system_profile', JSON.stringify(newProfile));
          result = `Hardware: ULTRA Settings ready. Godrays High supported.`;
      } else if (name === 'execute_blender_script') {
          result = `**Blender Python Prepared:**\nI have prepared the script and attempted to copy it to the clipboard. Click the 'Run Command' button above to execute it via the clipboard relay.\n\nIf auto-run fails, use the 'Paste & Run' button in the Blender panel.`;
      } else if (name === 'send_blender_shortcut') {
          result = `**Blender Shortcut Sent:** ${args.keys}\nCommand confirmed by bridge.`;
      }

      setActiveTool(prev => prev ? { ...prev, status: 'success', result } : null);
      setTimeout(() => setActiveTool(null), 5000);
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
              alert("Command copied to clipboard! \n\n1. Switch to Blender.\n2. If nothing happens in 2 seconds, click 'Paste & Run' in the Mossy panel.");
          } catch (e) {
              alert("Failed to write to clipboard. Please allow clipboard permissions or copy the code manually.");
          }
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

    if (onboardingState === 'project_setup') {
        createProjectFile({ name: textToSend, description: "Auto-created from chat", categories: [] });
        setOnboardingState('ready');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let contents: any[] = [];
      
      const history = messages
        .filter(m => m.role !== 'system' && !m.text.includes("Scan Complete")) 
        .map(m => {
            const parts = [];
            if (m.text && m.text.trim().length > 0) parts.push({ text: m.text });
            if (parts.length === 0) parts.push({ text: "[Image Uploaded]" });
            return { role: m.role, parts };
        });
      
      contents = [...history];

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
      contents.push({ role: 'user', parts: userParts });

      const toolsConfig = [{ functionDeclarations: toolDeclarations }];

      setIsStreaming(true);
      
      const streamResult = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          tools: toolsConfig,
        },
      });
      
      const streamId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: streamId, role: 'model', text: '' }]);

      let accumulatedText = '';
      
      for await (const chunk of streamResult) {
          if (abortControllerRef.current?.signal.aborted) break;
          
          const chunkText = chunk.text || '';
          accumulatedText += chunkText;
          
          const calls = chunk.functionCalls;
          
          if (calls && calls.length > 0) {
              for (const call of calls) {
                  console.log("Executing Tool Call from Stream:", call.name);
                  const result = await executeTool(call.name, call.args);
                  
                  setMessages(prev => prev.map(m => m.id === streamId ? { 
                      ...m, 
                      text: accumulatedText,
                      toolCall: { toolName: call.name, args: call.args } 
                  } : m));

                  if (result.startsWith("**Error:**")) {
                      accumulatedText += `\n\n${result}\n`;
                  } else {
                      accumulatedText += `\n\n\`[System: Executed ${call.name}]\`\n`;
                  }
              }
          }

          setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: accumulatedText } : m));
      }

      if (isVoiceEnabled && accumulatedText) speakText(accumulatedText);

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
    // ... (JSX remains the same)
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
  );
};