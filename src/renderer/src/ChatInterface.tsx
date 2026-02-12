import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';
import { getCommunityLearningContextForModel } from './communityLearningProfile';
import { getToolPermissionsContextForModel, mergeExistingCheckedState } from './toolPermissions';
import { checkContentGuard } from './Fallout4Guard';
import { Send, Paperclip, Loader2, Bot, Leaf, Search, FolderOpen, Save, Trash2, CheckCircle2, HelpCircle, PauseCircle, ChevronRight, FileText, Cpu, X, CheckSquare, Globe, Mic, Volume2, VolumeX, StopCircle, Wifi, Gamepad2, Terminal, Play, Box, Layout, ArrowUpRight, Wrench, Radio, Lock, Square, Map, Scroll, Flag, PenTool, Database, Activity, Clipboard, Brain } from 'lucide-react';
import { Message } from '../../shared/types';
import { useLive } from './LiveContext';
import { speakMossy } from './mossyTts';
import { executeMossyTool, sanitizeBlenderScript } from './MossyTools';
import { ModProjectStorage } from './services/ModProjectStorage';
import { useActivityMonitor } from './hooks/useActivityMonitor';
import { SuggestionPanel } from './components/SuggestionPanel';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { SelfImprovementPanel } from './components/SelfImprovementPanel';
import { buildKnowledgeManifestForModel, buildRelevantKnowledgeVaultContext, KnowledgeCitation } from './knowledgeRetrieval';
import { useNavigate, useLocation } from 'react-router-dom';
import { autoSaveManager } from './AutoSaveManager';
import { useAnalytics } from './utils/analytics';
import { openExternal } from './utils/openExternal';


type OnboardingState = 'init' | 'scanning' | 'integrating' | 'ready' | 'project_setup';

interface DetectedApp {
  id: string;
  name: string;
  displayName?: string;
  category: string;
  checked: boolean;
  path?: string; // Added path to interface
  version?: string;
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
    ProjectWizard.displayName = 'ProjectWizard';
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

type ChatMessage = Message & { citations?: KnowledgeCitation[] };

// Memoized Message Item to prevent re-rendering list on typing
const MessageItem = React.memo(({ msg }: { msg: ChatMessage }) => {
    MessageItem.displayName = 'MessageItem';
    const [showCitations, setShowCitations] = useState(false);
    const roleLabel = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Mossy' : msg.role;

    const savedPath = useMemo(() => {
        const text = msg.content || '';
        // Tool outputs consistently format saved locations like: **Saved:** C:\Path\To\File.ext
        const m = text.match(/\*\*Saved:\*\*\s*(.+)$/m);
        if (!m) return null;
        const raw = (m[1] || '').trim();
        if (!raw || raw.startsWith('(')) return null;
        if (raw.toLowerCase().includes('unable to write')) return null;
        return raw;
    }, [msg.content]);

    const handleOpenSaved = useCallback(async () => {
        if (!savedPath) return;
        const bridge = (window as any).electron?.api || (window as any).electronAPI;
        try {
            if (bridge?.revealInFolder) {
                const res = await bridge.revealInFolder(savedPath);
                if (res && res.success === false) {
                    console.warn('[ChatInterface] revealInFolder failed:', res.error);
                }
                return;
            }

            // Fallback: open the path directly (won't highlight the file)
            if (bridge?.openExternal) {
                await bridge.openExternal(savedPath);
            }
        } catch (e) {
            console.error('[ChatInterface] Failed to open saved path:', e);
        }
    }, [savedPath]);

    return (
        <div data-testid={msg.role === 'user' ? 'user-message' : msg.role === 'assistant' ? 'ai-message' : 'system-message'} className="flex gap-3 items-start py-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-300 border border-slate-700">
                {roleLabel?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{roleLabel}</div>
                {savedPath && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenSaved}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                            title="Open containing folder"
                            aria-label="Open containing folder"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Open folder
                        </button>
                        <div className="text-[10px] text-slate-500 truncate" title={savedPath}>{savedPath}</div>
                    </div>
                )}
                {msg.content && (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                        {msg.content}
                    </ReactMarkdown>
                )}
                {msg.role === 'assistant' && (msg.citations?.length || 0) > 0 && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCitations((prev) => !prev)}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                            {showCitations ? 'Hide sources' : 'Explain why'}
                        </button>
                        {showCitations && (
                            <div className="mt-2 space-y-2 bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                                {msg.citations?.map((c, idx) => (
                                    <div key={`${c.title}-${idx}`} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
                                        <div className="text-xs text-slate-100 font-semibold">{c.title}</div>
                                        <div className="mt-1 text-[10px] text-slate-400">Credit: {c.creditName || 'Uncredited'}</div>
                                        <div className="text-[10px] text-slate-500 truncate">Source: {c.source || 'Unknown'}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-300 bg-emerald-500/10 uppercase">
                                                Trust: {c.trustLevel || 'personal'}
                                            </span>
                                            {c.creditUrl && (
                                                <button
                                                    type="button"
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(c.creditUrl!)}
                                                >
                                                    Open credit
                                                </button>
                                            )}
                                            {c.source && /^https?:/i.test(c.source) && (
                                                <button
                                                    type="button"
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(c.source!)}
                                                >
                                                    Open source
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
MessageItem.displayName = 'MessageItem';

// Memoized List Container
const MessageList = React.memo(({ messages, ...props }: any) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {messages.map((msg: ChatMessage) => (
                <MessageItem key={msg.id} msg={msg} {...props} />
            ))}
            {props.children}
        </div>
    );
});
MessageList.displayName = 'MessageList';

export const ChatInterface: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const appliedPrefillRef = useRef(false);
    const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';
    const CHAT_NOTES_SNAPSHOT = 12;
    const CHAT_NOTES_MAX_CHARS = 8000;

  // Global Live State
  const { isActive: isLiveActive, isMuted: isLiveMuted, toggleMute: toggleLiveMute, disconnect: disconnectLive } = useLive();

  // Activity Monitoring Hook
  const { logActivity, suggestions, getTopSuggestions } = useActivityMonitor();

  // Analytics Hook
  const { trackEvent, trackPageView } = useAnalytics();

  // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workingMemory, setWorkingMemory] = useState<string>("Initializing modding education protocol...");
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Voice State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
      if (isLiveActive) return false;
      const saved = localStorage.getItem('mossy_voice_enabled');
      console.log('[ChatInterface] Voice enabled from localStorage:', saved);
      return saved === 'true' || saved === null; // Default to true if not set
  });
  
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Audio meter level (0-100)
  
  // Bridge State
  const [isBridgeActive, setIsBridgeActive] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [isBlenderLinked, setIsBlenderLinked] = useState(false);
    const [isMonitoringPaused, setIsMonitoringPaused] = useState(() => {
            return localStorage.getItem('mossy_monitoring_paused') === 'true';
    });
    const [liveTools, setLiveTools] = useState<string[]>([]);
    const [liveChecklist, setLiveChecklist] = useState<string[]>([]);
  
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
  
  // Self-Improvement Panel
  const [showSelfImprovementPanel, setShowSelfImprovementPanel] = useState(false);
  
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
  const [knowledgeCount, setKnowledgeCount] = useState<number>(() => {
      try {
          const raw = localStorage.getItem('mossy_knowledge_vault');
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
          return 0;
      }

  });

  const deriveModTags = useCallback(() => {
      const tags: string[] = [];
      if (projectData?.categories && Array.isArray(projectData.categories)) {
          projectData.categories.forEach((c) => {
              const v = String(c || '').toLowerCase();
              if (!v) return;
              if (v === 'asset') {
                  tags.push('mesh', 'texture');
              } else if (v === 'world') {
                  tags.push('settlement');
              } else if (v === 'ui') {
                  tags.push('ui');
              } else {
                  tags.push(v);
              }
          });
      }

      const keywordText = `${projectData?.name || ''} ${projectData?.notes || ''}`.toLowerCase();
      if (keywordText.includes('worldspace')) tags.push('worldspace');
      if (keywordText.includes('environment')) tags.push('environment');
      if (keywordText.includes('patch')) tags.push('patching');
      if (keywordText.includes('animation')) tags.push('animation');
      if (keywordText.includes('npc') || keywordText.includes('mpc')) tags.push('npc');
      if (keywordText.includes('creature')) tags.push('creature');
      if (keywordText.includes('quest')) tags.push('quest');

      if (tags.length === 0) {
          try {
              const current = ModProjectStorage.getCurrentMod();
              if (current?.type) tags.push(String(current.type).toLowerCase());
          } catch {
              // ignore
          }
      }

      return Array.from(new Set(tags));
  }, [projectData]);

  const buildLiveChecklist = useCallback((tools: string[], modTags: string[]) => {
      const names = tools.map(t => t.toLowerCase());
      const tags = modTags.map(t => t.toLowerCase());
      const list: string[] = [];
      const pushUnique = (item: string) => {
          if (!list.includes(item)) list.push(item);
      };

      if (names.some(n => n.includes('blender'))) {
          pushUnique('Blender: confirm unit scale 1.0 and FPS 30 for FO4.');
          pushUnique('Blender: apply transforms, triangulate, then export with FO4 NIF profile.');
          pushUnique('Blender: validate normals and smoothing before export.');
      }

      if (names.some(n => n.includes('creation') || n.includes('ck'))) {
          pushUnique('Creation Kit: set the correct plugin as Active File before edits.');
          pushUnique('Creation Kit: avoid deletes; disable refs instead.');
      }

      if (names.some(n => n.includes('xedit') || n.includes('fo4edit'))) {
          pushUnique('xEdit: run conflict filter before edits; check ITMs/UDRs before release.');
      }

      if (names.some(n => n.includes('nifskope'))) {
          pushUnique('NifSkope: open the NIF to verify paths, collision, and shader flags.');
      }

      if (names.some(n => n.includes('bodyslide') || n.includes('outfitstudio'))) {
          pushUnique('BodySlide/Outfit Studio: build with the correct preset and export to Data.');
      }

      if (names.some(n => n.includes('archive2') || n.includes('bae'))) {
          pushUnique('Archive2/BAE: confirm archive paths match Data folder layout.');
      }

      if (names.some(n => n.includes('mo2') || n.includes('mod organizer'))) {
          pushUnique('MO2: deploy and confirm the plugin is enabled in the right order.');
      }

      if (names.some(n => n.includes('vortex'))) {
          pushUnique('Vortex: deploy and confirm the plugin is enabled in the right order.');
      }

      if (tags.includes('weapon')) {
          pushUnique('Weapon: verify attach points and keywords in CK/xEdit.');
      }

      if (tags.includes('armor')) {
          pushUnique('Armor: confirm bone weights and partitions before export.');
      }

      if (tags.includes('quest')) {
          pushUnique('Quest: confirm objectives, stages, and aliases compile without errors.');
          pushUnique('Quest: verify alias fill conditions and script properties.');
          pushUnique('Quest: audit dialogue scenes, conditions, and topic links.');
          pushUnique('Quest: confirm voice assets and lip files (or set silent voice).');
      }

      if (tags.includes('worldspace')) {
          pushUnique('Worldspace: finalize navmesh and precombines after layout changes.');
      }

      if (tags.includes('npc')) {
          pushUnique('NPC: verify AI packages, inventory, and factions in CK.');
      }

      if (tags.includes('creature')) {
          pushUnique('Creature: confirm behavior graph/animation set and attack data.');
      }

      if (tags.includes('animation')) {
          pushUnique('Animation: validate HKX export and in-game playback test.');
      }

      if (tags.includes('patching')) {
          pushUnique('Patching: resolve conflicts and create a compatibility patch.');
      }

      if (tags.includes('environment')) {
          pushUnique('Environment: verify lighting, occlusion, and performance budgets.');
      }

      if (tags.includes('settlement')) {
          pushUnique('Settlement: validate Workshop keywords and precombine safety.');
      }

      if (tags.includes('gameplay')) {
          pushUnique('Gameplay: review balance values and test in game.');
      }

      if (tags.includes('texture')) {
          pushUnique('Texture: verify DDS format and correct _d/_n/_s naming.');
      }

      if (tags.includes('mesh')) {
          pushUnique('Mesh: confirm collision and LOD settings where needed.');
      }

      if (tags.includes('script')) {
          pushUnique('Script: compile Papyrus and review logs for warnings.');
      }

      return list.slice(0, 8);
  }, []);

  useEffect(() => {
      modTagsRef.current = deriveModTags();
      if (!isMonitoringPaused) {
          setLiveChecklist(buildLiveChecklist(liveTools, modTagsRef.current));
      }
  }, [deriveModTags, isMonitoringPaused, liveTools, buildLiveChecklist]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastSendTimeRef = useRef<number>(0); // Prevent rapid duplicate sends
  const modTagsRef = useRef<string[]>([]);

  const getCurrentProjectStepSummary = () => {
      try {
          const current = ModProjectStorage.getCurrentMod();
          if (!current) return '';
          const inProgress = current.steps.find((step) => step.status === 'in-progress');
          const pending = current.steps.find((step) => step.status === 'pending');
          const nextStep = inProgress || pending;
          if (!nextStep) return '';
          const status = nextStep.status.replace('-', ' ');
          const completed = current.steps.filter(s => s.status === 'completed').length;
          return `Current Step: ${nextStep.title} (${status}) [${completed}/${current.steps.length}]`;
      } catch {
          return '';
      }
  };

  const updateChatWorkingMemory = (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      const snapshot = history.slice(-CHAT_NOTES_SNAPSHOT);
      if (snapshot.length === 0) return;

      const blockStart = '--- CHAT SESSION NOTES ---';
      const blockEnd = '--- END CHAT SESSION NOTES ---';
      const stepSummary = getCurrentProjectStepSummary();
      const notes = snapshot
          .map((entry) => `${entry.role === 'user' ? 'User' : 'Mossy'}: ${entry.content}`)
          .join('\n');
      const stepLine = stepSummary ? `\n${stepSummary}` : '';
      const nextBlock = `${blockStart}\n${notes}${stepLine}\n${blockEnd}`;

      try {
          const existing = localStorage.getItem('mossy_working_memory') || '';
          const withoutBlock = existing.replace(new RegExp(`${blockStart}[\\s\\S]*?${blockEnd}`, 'g'), '').trim();
          const merged = [withoutBlock, nextBlock].filter(Boolean).join('\n\n').slice(-CHAT_NOTES_MAX_CHARS);
          localStorage.setItem('mossy_working_memory', merged);
      } catch (e) {
          console.warn('[ChatInterface] Failed to update working memory:', e);
      }
  };

    // Accept a one-time prefill (Install Wizard → Chat handoff, etc.)
    useEffect(() => {
        // Track page view
        trackPageView('chat_interface');

        if (appliedPrefillRef.current) return;

        const statePrefill = (location.state as any)?.prefill;
        const storedPrefill = (() => {
            try {
                return localStorage.getItem(CHAT_PREFILL_KEY);
            } catch {
                return null;
            }
        })();

        const prefill = typeof statePrefill === 'string' ? statePrefill : (storedPrefill || '');
        if (!prefill || inputText.trim()) return;

        setInputText(prefill);
        appliedPrefillRef.current = true;

        try {
            localStorage.removeItem(CHAT_PREFILL_KEY);
        } catch {
            // ignore
        }

        if (typeof statePrefill === 'string') {
            navigate('/chat', { replace: true, state: {} });
        }
    }, [location.state, navigate, inputText]);

  // --- PERSISTENCE LAYER (DEBOUNCED) ---
  useEffect(() => {
    // Save messages with debounce
    const saveTimeout = setTimeout(() => {
        if (messages.length > 0) {
            try {
                localStorage.setItem('mossy_messages', JSON.stringify(messages));
                // Also save to auto-save manager
                autoSaveManager.updateCurrentChatHistory(messages);
            } catch (e) {
                console.error("Failed to save history (Quota Exceeded?)", e);
            }
        }
        localStorage.setItem('mossy_working_memory', workingMemory);
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [messages, workingMemory]);

  useEffect(() => {
    const api = (window as any).electron?.api || (window as any).electronAPI;

    const refreshSettings = () => {
        if (api?.getSettings) {
            api.getSettings().then(setFormalSettings).catch(() => {});
        }
    };

    const handleSettingsUpdate = () => {
        console.log('[ChatInterface] Settings updated via broadcast, refreshing...');
        refreshSettings();
    };

    const checkState = () => {
        const active = localStorage.getItem('mossy_bridge_active') === 'true';
        setIsBridgeActive(active);
        
        try {
            const drivers = JSON.parse(localStorage.getItem('mossy_bridge_drivers') || '[]');
            setActiveDrivers(drivers);
        } catch (e) {
            console.error('Failed to load bridge drivers:', e);
        }
        
        // CHECK BLENDER ADD-ON STATUS
        const blenderActive = localStorage.getItem('mossy_blender_active') === 'true';
        setIsBlenderLinked(blenderActive);

        const monitoringPaused = localStorage.getItem('mossy_monitoring_paused') === 'true';
        setIsMonitoringPaused(monitoringPaused);

        if (monitoringPaused) {
            setLiveTools([]);
            setLiveChecklist([]);
        } else {
            try {
                const activeRaw = localStorage.getItem('mossy_active_tools');
                const active = activeRaw ? JSON.parse(activeRaw) : null;
                const toolNames = Array.isArray(active?.tools)
                    ? active.tools.map((t: any) => String(t?.name || '')).filter(Boolean)
                    : [];
                setLiveTools(toolNames);
                setLiveChecklist(buildLiveChecklist(toolNames, modTagsRef.current));
            } catch {
                setLiveTools([]);
                setLiveChecklist([]);
            }
        }

        // IMPORTANT: Do NOT auto-rescan on focus/startup.
        // The user's approved tool permissions should persist between sessions.
        // Scans should only occur when explicitly triggered by the user.

        refreshSettings();

        try {
            const auditorData = localStorage.getItem('mossy_scan_auditor');
            if (auditorData) setScannedFiles(JSON.parse(auditorData));
            
            const mapData = localStorage.getItem('mossy_scan_cartographer');
            if (mapData) setScannedMap(JSON.parse(mapData));

            const memoryData = localStorage.getItem('mossy_cortex_memory');
            if (memoryData) setCortexMemory(JSON.parse(memoryData));

            const vaultRaw = localStorage.getItem('mossy_knowledge_vault');
            if (vaultRaw) {
                const vault = JSON.parse(vaultRaw);
                setKnowledgeCount(Array.isArray(vault) ? vault.length : 0);
            } else {
                setKnowledgeCount(0);
            }
        } catch (e) {
            console.error('Failed to load cortex data:', e);
        }
    };

    window.addEventListener('mossy-settings-updated', handleSettingsUpdate);
    checkState();
    window.addEventListener('focus', checkState);
    window.addEventListener('mossy-memory-update', checkState);
    window.addEventListener('mossy-bridge-connected', checkState);
    window.addEventListener('mossy-driver-update', checkState);
    window.addEventListener('mossy-blender-linked', checkState);
    window.addEventListener('mossy-monitoring-toggle', checkState);
    window.addEventListener('storage', checkState);
    
    // Initial Load
    const loadInitialState = async () => {
        try {
            const savedMessages = localStorage.getItem('mossy_messages');
            const savedState = localStorage.getItem('mossy_state');
            const savedProject = localStorage.getItem('mossy_project');
            const savedApps = localStorage.getItem('mossy_apps');
            const savedIntegratedTools = localStorage.getItem('mossy_integrated_tools');
            const savedVoice = localStorage.getItem('mossy_voice_enabled');
            const savedMemory = localStorage.getItem('mossy_working_memory');

            // Try to load from auto-save manager first
            const recoveredSession = await autoSaveManager.recoverFromCrash();
            if (recoveredSession && recoveredSession.chatHistory && recoveredSession.chatHistory.length > 0) {
                console.log('[ChatInterface] Recovered chat history from auto-save');
                setMessages(recoveredSession.chatHistory);
            } else if (savedMessages) {
                setMessages(JSON.parse(savedMessages));
            } else {
                initMossy();
            }

            if (savedMemory) setWorkingMemory(savedMemory);

            if (savedState) setOnboardingState(JSON.parse(savedState));
            if (savedProject) {
                const parsed = JSON.parse(savedProject);
                setProjectContext(parsed.name);
                setProjectData(parsed);
                setShowProjectPanel(true);
            }
            if (savedApps) {
                setDetectedApps(JSON.parse(savedApps));
            } else if (savedIntegratedTools) {
                // Back-compat: first-run onboarding stored approvals here.
                // Promote into mossy_apps so the rest of the app has a single source of truth.
                const tools = JSON.parse(savedIntegratedTools) as Array<{ name: string; path?: string; category?: string }>;
                const promoted = tools
                    .filter(t => t?.name)
                    .map((t, idx) => ({
                        id: `integrated-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                        name: t.name,
                        category: t.category || 'Tool',
                        checked: true,
                        path: t.path
                    }));
                setDetectedApps(promoted);
                localStorage.setItem('mossy_apps', JSON.stringify(promoted));
            }
            if (savedVoice && !isLiveActive) setIsVoiceEnabled(JSON.parse(savedVoice));

            // Update auto-save manager with current state
            autoSaveManager.updateCurrentChatHistory(savedMessages ? JSON.parse(savedMessages) : []);
            autoSaveManager.updateCurrentSettings({ voiceEnabled: savedVoice ? JSON.parse(savedVoice) : false });
            autoSaveManager.updateCurrentUIState({
                onboardingState: savedState ? JSON.parse(savedState) : 'init',
                projectContext: savedProject ? JSON.parse(savedProject) : null
            });

        } catch (e) {
            console.error("Load failed", e);
            initMossy();
        }
    };

    loadInitialState();

    return () => {
        window.removeEventListener('mossy-settings-updated', handleSettingsUpdate);
        window.removeEventListener('focus', checkState);
        window.removeEventListener('mossy-memory-update', checkState);
        window.removeEventListener('mossy-bridge-connected', checkState);
        window.removeEventListener('mossy-driver-update', checkState);
        window.removeEventListener('mossy-blender-linked', checkState);
        window.removeEventListener('mossy-monitoring-toggle', checkState);
        window.removeEventListener('storage', checkState);
        
        // MEMORY LEAK FIX: Clean up audio resources on unmount
        if (activeSourceRef.current) {
            try {
                activeSourceRef.current.stop();
                activeSourceRef.current.disconnect();
            } catch (e) {
                // Already stopped
            }
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };
  }, []);

  // Dedicated listener for vault updates (immediate UI feedback)
  useEffect(() => {
      const handler = () => {
          try {
              const raw = localStorage.getItem('mossy_knowledge_vault');
              const parsed = raw ? JSON.parse(raw) : [];
              setKnowledgeCount(Array.isArray(parsed) ? parsed.length : 0);
          } catch {
              setKnowledgeCount(0);
          }
      };
      window.addEventListener('mossy-knowledge-updated', handler);
      return () => window.removeEventListener('mossy-knowledge-updated', handler);
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
      const hasApps = localStorage.getItem('mossy_apps') || localStorage.getItem('mossy_integrated_tools');
      const toolAck = localStorage.getItem('mossy_tool_connection_ack') === 'true';
      if (hasApps) {
          const message = toolAck
              ? "👋 **Welcome back, Vault Dweller!**\n\nWhat are we working on today?"
              : "👋 **Welcome back, Vault Dweller!**\n\nI remember the tools and integrations you approved. I can use those permissions to help teach you workflows and (when the Desktop Bridge is online) interact with supported apps to automate steps.\n\nWhat are we working on today?";

          setMessages([{
              id: 'init',
              role: 'assistant',
              content: message,
              timestamp: Date.now()
          }]);
          if (!toolAck) {
              localStorage.setItem('mossy_tool_connection_ack', 'true');
          }
          setOnboardingState('ready');
          return;
      }

      setMessages([{ 
          id: 'init', 
          role: 'assistant', 
          content: "👋 **Hello, Vault Dweller!**\n\nI'm **Mossy**, your dedicated AI assistant for Fallout 4 modding.\n\nTo provide the best assistance, I need to perform a **Deep Scan** to identify your modding tools (Creation Kit, xEdit, Blender, etc.) across all your system drives. I will remember these so we only need to do this once.\n\n**Ready to begin the scan?**",
          timestamp: Date.now()
      }]);
      setOnboardingState('init');
  };

  const resetMemory = () => {
      if (window.confirm("Perform Chat Reset? This will clear the conversation history and current project state, but keep global settings (Avatar, Bridge, Tutorial).")) {
          localStorage.removeItem('mossy_messages');
          localStorage.removeItem('mossy_state');
          localStorage.removeItem('mossy_project');
          localStorage.removeItem('mossy_apps');
          localStorage.removeItem('mossy_integrated_tools');
          localStorage.removeItem('mossy_tool_preferences');
          localStorage.removeItem('mossy_all_detected_apps');
          localStorage.removeItem('mossy_scan_summary');
          localStorage.removeItem('mossy_last_scan');
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

  const toggleMonitoring = () => {
      const next = !isMonitoringPaused;
      setIsMonitoringPaused(next);
      try {
          localStorage.setItem('mossy_monitoring_paused', next ? 'true' : 'false');
          if (next) {
              localStorage.setItem('mossy_active_tools', JSON.stringify({ at: Date.now(), tools: [] }));
          }
          window.dispatchEvent(new Event('mossy-monitoring-toggle'));
      } catch {
          // ignore storage errors
      }
  };

  // --- VOICE LOGIC ---
  const toggleVoiceMode = () => {
      if (isLiveActive) return;
      if (isVoiceEnabled) stopAudio();
      const newVoiceEnabled = !isVoiceEnabled;
      setIsVoiceEnabled(newVoiceEnabled);
      localStorage.setItem('mossy_voice_enabled', newVoiceEnabled.toString());
      console.log('[ChatInterface] Voice mode toggled to:', newVoiceEnabled);

      // Track voice mode toggle
      trackEvent('voice_mode_toggled', {
        enabled: newVoiceEnabled,
        wasLiveActive: isLiveActive
      });
  };

  const stopAudio = () => {
      // Stop any pending speech synthesis immediately
      try {
          if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
          }
      } catch (e) {
          // Ignore speech cancel errors
      }

      if (activeSourceRef.current) {
          try {
              activeSourceRef.current.stop();
              activeSourceRef.current.disconnect();
          } catch (e) {
              // Already stopped/disconnected
          }
          activeSourceRef.current = null;
      }
      setIsPlayingAudio(false);
  };

  const startListening = async () => {
      if (isLiveActive) {
          alert("Live Voice is currently active. Please disconnect Live Voice to use the chat microphone.");
          return;
      }
      
      // Check if transcription is available
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.transcribeAudio) {
          alert('Voice transcription is not available. Please configure an OpenAI API key in Settings.');
          return;
      }
      
      // Track voice recording start
      trackEvent('voice_recording_started', {
        hasTranscriptionAPI: !!api?.transcribeAudio
      });
      
    const audioChunks: Blob[] = [];
    let mediaStream: MediaStream | null = null;
    let meterContext: AudioContext | null = null;
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      let silenceDuration = 0;
      const SILENCE_THRESHOLD = 0.05; // More lenient threshold - only stop on actual silence, not quiet parts of speech
      const SILENCE_DURATION_MS = 5000; // 5 seconds of silence before auto-stopping (allows longer natural pauses in speech)
      const MIN_RECORDING_MS = 1000; // Minimum 1 second recording to avoid cutting off start of speech
      let recordingStartTime = Date.now();
      
      try {
          console.log('[VoiceInput] Requesting microphone access...');
          setIsListening(true);
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('[VoiceInput] Microphone access granted, starting recording...');
          recordingStartTime = Date.now();
          
          const mediaRecorder = new MediaRecorder(mediaStream);
          mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
          
          mediaRecorder.onstop = async () => {
              setIsListening(false);
              if (silenceTimer) clearTimeout(silenceTimer);
              if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
              if (meterContext) {
                  try {
                      await meterContext.close();
                  } catch {
                      // ignore close errors
                  }
                  meterContext = null;
              }
              
              // Send to Whisper for transcription
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              if (audioBlob.size < 100) {
                  console.log('[ChatInterface] Audio too small, ignoring');
                  return; // Ignore empty recordings
              }
              
              let transcript = '';

              // Transcribe via Electron main process (keeps API keys out of renderer)
              try {
                  const api = (window as any).electron?.api || (window as any).electronAPI;
                  if (!api?.transcribeAudio) {
                      console.warn('[VoiceInput] transcribeAudio IPC not available - check if API keys are configured');
                      alert('Voice transcription is not available. Please configure an OpenAI API key in Settings.');
                      return;
                  } else {
                      console.log('[VoiceInput] Transcribing audio via main process... (size:', audioBlob.size, 'bytes)');
                      const ab = await audioBlob.arrayBuffer();
                      const resp = await api.transcribeAudio(ab, audioBlob.type || 'audio/webm');
                      if (resp?.success) {
                          transcript = String(resp.text || '').trim();
                          console.log('[VoiceInput] Transcript:', transcript);

                          // Track successful transcription
                          trackEvent('voice_transcription_success', {
                            transcriptLength: transcript.length,
                            audioSize: audioBlob.size
                          });
                      } else {
                          console.warn('[VoiceInput] Transcription failed:', resp?.error);

                          // Track failed transcription
                          trackEvent('voice_transcription_failed', {
                            error: resp?.error,
                            audioSize: audioBlob.size
                          });

                          alert(`Voice transcription failed: ${resp?.error || 'Unknown error'}`);
                      }
                  }
              } catch (err) {
                  console.warn('[ChatInterface] Transcription failed:', err);
              }
              
              // Submit the transcript if we got one
              if (transcript) {
                  console.log('[ChatInterface] Got transcript, submitting:', transcript);
                  setInputText(prev => prev + (prev ? ' ' : '') + transcript);
                  // Auto-submit the transcribed text (only once)
                  setTimeout(() => {
                      console.log('[ChatInterface] Auto-submitting transcript');
                      handleSend(transcript);
                  }, 100);

                  // Track voice input submission
                  trackEvent('voice_input_submitted', {
                    transcriptLength: transcript.length,
                    autoSubmitted: true
                  });
              } else {
                  console.error('[ChatInterface] No transcription available from any service');

                  // Track voice input failure
                  trackEvent('voice_input_failed', {
                    reason: 'no_transcription'
                  });

                  alert('Voice transcription failed. If you want STT, configure OpenAI in Desktop settings, then try again.');
              }
          };
          
          mediaRecorder.start();
          
          // Setup silence detection
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          meterContext = audioContext;
          if (audioContext.state === 'suspended') {
              await audioContext.resume();
          }
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          const source = audioContext.createMediaStreamSource(mediaStream);
          source.connect(analyser);
          
          const buffer = new Uint8Array(analyser.fftSize);
          const checkSilence = () => {
              analyser.getByteTimeDomainData(buffer);
              let sumSquares = 0;
              for (let i = 0; i < buffer.length; i++) {
                  const centered = (buffer[i] - 128) / 128;
                  sumSquares += centered * centered;
              }
              const rms = Math.sqrt(sumSquares / buffer.length);
              const normalized = Math.min(1, rms * 1.6);
              
              // Update audio level meter
              setAudioLevel(Math.round(normalized * 100));
              
              // DISABLED: Automatic silence detection was cutting off users mid-sentence
              // Instead, users must click the button again to stop recording
              // This gives them full control over when their message ends
              
              silenceTimer = setTimeout(checkSilence, 50);
          };
          
          silenceTimer = setTimeout(checkSilence, 50);
          
      } catch (err) {
          console.error('[VoiceInput] Mic access failed:', err);
          setIsListening(false);
          alert(`Microphone access failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please check your microphone permissions and try again.`);
      }
  };

  const speakText = async (textToSpeak: string) => {
      if (!textToSpeak || isLiveActive) {
          console.log('[ChatInterface] speakText skipped - text empty or live active:', { textToSpeak: !!textToSpeak, isLiveActive });
          return;
      }
      console.log('[ChatInterface] speakText called with text length:', textToSpeak.length);
      setIsPlayingAudio(true);

      try {
                await speakMossy(textToSpeak, { cancelExisting: true });
                console.log('[ChatInterface] speakText completed successfully');
      } catch (err) {
        console.error('[ChatInterface] speakText failed:', err);
      }
            setIsPlayingAudio(false);
  };

  // --- CHAT LOGIC ---
  const generateSystemContext = async (query?: string) => {
    try {
      const guidanceMode = (localStorage.getItem('mossy_guidance_mode') || 'slow').toLowerCase();
      if (!localStorage.getItem('mossy_guidance_mode')) {
          localStorage.setItem('mossy_guidance_mode', guidanceMode);
      }
      const guidanceLine = `**GUIDANCE MODE:** ${guidanceMode.toUpperCase()} (one step at a time; wait for user confirmation)`;
      let hardwareCtx = "Hardware: Unknown";
      if (profile) {
          hardwareCtx = `**Spec:** ${profile.gpu} | ${profile.ram}GB RAM | Blender ${profile.blenderVersion}`;
      }
      
      // Load Memory Vault knowledge for context
      let knowledgeVaultContext = "";
      try {
          const manifest = buildKnowledgeManifestForModel();
          const relevant = buildRelevantKnowledgeVaultContext(query || '', { maxItems: 10, maxChars: 7000 });
          if (manifest || relevant) {
              knowledgeVaultContext = `\n**MOSSY'S KNOWLEDGE VAULT (CRITICAL):**${manifest}${relevant}`;
          }
      } catch (e) {
          console.warn('[ChatInterface] Failed to load memory vault:', e);
      }
      
      // Load vault assets for context
      let vaultContext = "";
      try {
          const vaultAssetsStr = typeof window !== 'undefined' ? window.localStorage.getItem('vault-assets-v1') : null;
          if (vaultAssetsStr) {
              const vaultAssets = JSON.parse(vaultAssetsStr);
              if (Array.isArray(vaultAssets) && vaultAssets.length > 0) {
                  const assetSummary = vaultAssets
                      .map((a: any) => `- ${a.name} (${a.type}${a.type === 'script' && (a.name.toLowerCase().endsWith('.bat') || a.name.toLowerCase().endsWith('.cmd')) ? ' - batch script' : ''})`)
                      .join('\n');
                  vaultContext = `\n**VAULT ASSETS (Ready for Ingestion):**\n${assetSummary}`;
              }
          }
      } catch (e) {
          console.warn('[ChatInterface] Failed to load vault assets:', e);
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

      let scanHistoryCtx = "";
      try {
          const lastScanRaw = localStorage.getItem('mossy_last_scan');
          const summaryRaw = localStorage.getItem('mossy_scan_summary');
          const summary = summaryRaw ? JSON.parse(summaryRaw) : null;
          const lastScan = lastScanRaw ? new Date(Number(lastScanRaw)) : null;
          const lastScanLine = lastScan && !Number.isNaN(lastScan.getTime())
              ? `Last scan: ${lastScan.toLocaleString()}`
              : 'Last scan: unknown';

          const totalPrograms = summary?.totalPrograms ?? 'unknown';
          const nvidiaTools = summary?.nvidiaTools ?? 'unknown';
          const aiTools = summary?.aiTools ?? 'unknown';

          const approved = (detectedApps || []).filter((a: any) => a?.checked !== false);
          const denied = (detectedApps || []).filter((a: any) => a?.checked === false);
          const permissionLine = approved.length === 0 && denied.length === 0
              ? 'Permissions: not requested'
              : `Permissions: approved ${approved.length}, denied ${denied.length}`;

          scanHistoryCtx = `\n**SCAN HISTORY & PERMISSIONS:**\n- ${lastScanLine}\n- Programs detected: ${totalPrograms} | NVIDIA tools: ${nvidiaTools} | AI tools: ${aiTools}\n- ${permissionLine}`;
      } catch {
          scanHistoryCtx = "\n**SCAN HISTORY & PERMISSIONS:**\n- Last scan: unknown\n- Permissions: unknown";
      }

      let liveToolCtx = "";
      try {
          const activeRaw = localStorage.getItem('mossy_active_tools');
          if (activeRaw) {
              const active = JSON.parse(activeRaw);
              const toolNames = Array.isArray(active?.tools) ? active.tools.map((t: any) => t.name).filter(Boolean) : [];
              const activeAt = active?.at ? new Date(Number(active.at)) : null;
              const activeLine = activeAt && !Number.isNaN(activeAt.getTime())
                  ? `Last tool sync: ${activeAt.toLocaleTimeString()}`
                  : 'Last tool sync: unknown';
              const toolsLine = toolNames.length > 0 ? toolNames.join(', ') : 'None';
              liveToolCtx = `\n**LIVE TOOL MONITORING:**\n- ${activeLine}\n- Active tools: ${toolsLine}`;
          } else {
              liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- No active tool context yet.";
          }
      } catch {
          liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- Unavailable";
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

      const communityLearningCtx = getCommunityLearningContextForModel();
      const toolPermissionsCtx = getToolPermissionsContextForModel({
          bridgeActive: isBridgeActive,
          blenderLinked: isBlenderLinked,
      });
      
      // Get current mod project info
      let modContext = "";
      try {
          const currentMod = ModProjectStorage.getCurrentMod();
          if (currentMod) {
              const stats = ModProjectStorage.getProjectStats(currentMod.id);
              modContext = `\n**CURRENT MOD PROJECT:** "${currentMod.name}"\n- Type: ${currentMod.type} | Status: ${currentMod.status}\n- Progress: ${currentMod.completionPercentage}% | Steps: ${stats?.completedSteps || 0}/${stats?.totalSteps || 0}\n- Version: ${currentMod.version}\n(Provide context-aware guidance for this specific mod.)`;
          }
      } catch (e) {
          // ModProjectStorage not available, skip
      }
      
      const bridgeStatus = isBridgeActive ? "ONLINE" : "OFFLINE";
      const blenderContext = isBlenderLinked 
          ? "**BLENDER LINK: ACTIVE (v4.0 Clipboard Relay)**\nYou can execute Python scripts in Blender.\nIMPORTANT: Tell the user they MUST click the 'Run Command' button that appears in the chat to execute the script." 
          : "**BLENDER LINK: OFFLINE**\n(If the user asks to control Blender, tell them to go to the Desktop Bridge and install the 'Mossy Link v4.0' add-on first.)";
      const toolAck = localStorage.getItem('mossy_tool_connection_ack') === 'true';
      const toolAckLine = `**Tool Connection Notice:** ${toolAck ? 'ACKNOWLEDGED (do not repeat unless asked)' : 'NOT ACKNOWLEDGED'}`;
      const monitoringLine = `**Monitoring Status:** ${isMonitoringPaused ? 'PAUSED' : 'ACTIVE'}`;

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
                    "• The Scribe (/scribe): Documentation and readme assistant (AI-backed)."
                ].join('\n');

      return `
      **DYNAMIC SYSTEM CONTEXT:**
      **Desktop Bridge:** ${bridgeStatus}
      ${blenderContext}
    ${toolAckLine}
    ${guidanceLine}
    ${monitoringLine}
            ${settingsCtx}${gameFolderInfo}
            ${appFeatures}
        ${toolPermissionsCtx}
      **Short-Term Working Memory:** ${workingMemory}
      **Project Status:** ${projectData ? projectData.name : "None"}${modContext}
      ${knowledgeVaultContext}
      ${vaultContext}
      **Detected Tools:** ${(detectedApps || []).filter(a => a.path).map(a => `${a.name} [ID: ${a.id}] (Path: ${a.path})`).join(', ') || "None"}
      ${hardwareCtx}
      ${scanContext}
    ${scanHistoryCtx}
    ${liveToolCtx}
      ${learnedCtx}
            ${communityLearningCtx}
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
        // Map found programs to our app categories
        const moddingKeywords = [
            'blender', 'creationkit', 'fo4edit', 'xedit', 'sseedit', 'tes5edit', 'fnvedit', 'tes4edit', 
            'modorganizer', 'vortex', 'nifskope', 'bodyslide', 'f4se', 'loot', 'wryebash', 'outfitstudio', 
            'archive2', 'gimp', 'photoshop', 'zedit', 'bae', 'pjm', 'bethini',
            'reshade', 'enb', 'cathedral', 'modsel', 'texconv', 'unpacker',
            'material', 'bgsm', 'facegen', 'lipgen', 'papyrus', 'caprica', 'script',
            'fallout', 'morrowind', 'oblivion', 'skyrim', 'starfield', 'game', 'mod'
        ];

        if (typeof window.electron?.api?.detectPrograms === 'function') {
            const installed = await window.electronAPI.detectPrograms();
            
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
                if (moddingKeywords.some((kw: string) => nameLower.includes(kw))) {
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

                // Preserve explicit user approvals (checked true/false)
                finalApps = mergeExistingCheckedState(finalApps as any, existing as any) as any;
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
            } catch (e) {
                console.error('Failed to deduplicate apps:', e);
            }
        }
        
        setDetectedApps(finalApps);
        localStorage.setItem('mossy_apps', JSON.stringify(finalApps));
        localStorage.setItem('mossy_last_scan', Date.now().toString());
        
        if (!isSilent) {
            setTimeout(() => {
                setOnboardingState('integrating');
                setMessages(prev => [...prev, {
                    id: `scan-done-${Date.now()}`,
                    role: 'assistant',
                    content: foundApps.length > 2 
                        ? `**Deep Scan Complete.** I located **${foundApps.length}** modding tools across your drives. I will remember these for future sessions so we don't need to scan every time.`
                        : "**Deep Scan Complete.** I couldn't find many tools automatically. You might need to link them manually in the 'Vault' or 'Bridge' settings.",
                    timestamp: Date.now()
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
      localStorage.setItem('mossy_tool_connection_ack', 'true');
      setMessages(prev => [...prev, {
          id: 'integrated',
          role: 'assistant',
          content: `Tools Linked. Creation Kit telemetry active.\n\n**Ad Victoriam, modder.** What are we building today?`,
          timestamp: Date.now()
      }]);
  };

  const handleStartProject = () => {
      setOnboardingState('project_setup');
      setMessages(prev => [...prev, { id: 'proj-start', role: 'assistant', content: "Initializing new Workspace configuration protocol...", timestamp: Date.now() }]);
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

      // Track project creation
      trackEvent('project_created', {
        projectName: data.name,
        descriptionLength: data.description.length,
        categoriesCount: data.categories.length,
        categories: data.categories
      });

      return newProject;
  };

  const executeTool = async (name: string, args: any) => {
      // Record tool usage for Modding Journey
      await LocalAIEngine.recordAction('tool_execution', { tool: name, args });

      // Track tool execution start
      trackEvent('tool_execution_started', {
        toolName: name,
        argsCount: Object.keys(args || {}).length,
        isBlenderLinked
      });

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

      // Track tool execution completion
      trackEvent('tool_execution_completed', {
        toolName: name,
        success: !result?.error,
        hasResult: !!result
      });

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
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "**[Generation Stopped by User]**", timestamp: Date.now() }]);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if ((!textToSend.trim() && !selectedFile) || isLoading || isStreaming) return;

    // Prevent rapid duplicate sends (within 500ms)
    const now = Date.now();
    if (now - lastSendTimeRef.current < 500) {
        console.log('[ChatInterface] Ignoring duplicate send within 500ms');
        return;
    }
    lastSendTimeRef.current = now;

    if (onboardingState === 'init') {
        if (textToSend.toLowerCase().match(/yes|ok|start|scan/)) {
            setInputText('');
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() }]);
            performSystemScan();
            return;
        }
    }

    // --- FALLOUT 4 CONTENT GUARD ---
    const guard = checkContentGuard(textToSend);
    if (!guard.allowed) {
        setMessages(prev => [...prev, 
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            { id: Date.now().toString() + '-guard', role: 'assistant', content: guard.message || "I am strictly a Fallout 4 modding assistant.", timestamp: Date.now() }
        ]);
        setInputText('');
        return;
    }

        const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

        const localHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
                ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
                { role: 'user', content: textToSend }
        ];

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    stopAudio();

    // Track message send event
    trackEvent('chat_message_sent', {
      messageLength: textToSend.length,
      hasFile: !!selectedFile,
      onboardingState: onboardingState
    });

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
            const dynamicInstruction = getFullSystemInstruction(await generateSystemContext(textToSend));
      setIsStreaming(true);

      const streamId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: "..Processing..", timestamp: Date.now() }]);

      // Use local engine only (Google Cloud removed)
      const startTime = Date.now();
      const localResult = await LocalAIEngine.generateResponse(textToSend, dynamicInstruction);
      const duration = Date.now() - startTime;
      const aiResponseText = localResult.content || "Mossy is in Passive Mode; no cloud model configured.";
            const citations = Array.isArray(localResult.context?.citations) ? localResult.context.citations : [];

        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: aiResponseText, citations } : m));

      // Save chat messages to auto-save manager
            const assistantMessage: Message = {
        id: streamId,
        role: 'assistant',
        content: aiResponseText,
        timestamp: Date.now()
      };
      autoSaveManager.saveChatMessage(assistantMessage);
            updateChatWorkingMemory([...localHistory, { role: 'assistant', content: aiResponseText }]);

      // Record interaction for self-improvement
      const { selfImprovementEngine } = await import('./SelfImprovementEngine');
      selfImprovementEngine.recordInteraction(textToSend, aiResponseText, [], 'success');

      console.log('[ChatInterface] Response received, isVoiceEnabled:', isVoiceEnabled);
      if (isVoiceEnabled && aiResponseText) {
          console.log('[ChatInterface] Speaking response (length:', aiResponseText.length, ')');
          await speakText(aiResponseText);
      } else {
          console.log('[ChatInterface] Voice disabled or no response text:', { isVoiceEnabled, hasText: !!aiResponseText });
      }

      // Log activity AFTER speaking (non-blocking, deferred)
      logActivity('ai_query', 'AI Response Generation', `Query: "${textToSend.substring(0, 50)}..."`, {
        duration,
        success: true,
        metadata: {
          queryLength: textToSend.length,
          responseLength: aiResponseText.length,
          hasImage: !!selectedFile,
        },
        tags: ['ai_chat', 'response'],
      });

    } catch (error) {
      console.error(error);
      const errText = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed activity
      logActivity('ai_query', 'AI Response Generation', `Failed: ${errText}`, {
        success: false,
        metadata: { errorMessage: errText },
        tags: ['ai_chat', 'error'],
      });
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `**System Error:** ${errText}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setSelectedFile(null);
    }
  };

  return (
    <div data-testid="chat-container" className="flex flex-col h-full bg-forge-dark text-slate-200">
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

            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs animate-fade-in ${
                isMonitoringPaused
                    ? 'bg-red-900/20 border-red-500/30 text-red-300'
                    : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
            }`}>
                <Activity className="w-3 h-3" />
                {isMonitoringPaused ? 'Monitoring Paused' : 'Monitoring On'}
            </div>


            {projectContext && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs">
                    <FolderOpen className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-100 max-w-[150px] truncate">{projectContext}</span>
                </div>
            )}
        </div>
        <div className="flex gap-2 items-center">
            <button
                type="button"
                onClick={() => navigate('/reference')}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-emerald-900/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40"
                title="Open Help"
            >
                <HelpCircle className="w-4 h-4" />
                Help
            </button>
            
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

            <button
                onClick={toggleMonitoring}
                className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    isMonitoringPaused
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-emerald-900/20 border-emerald-500/40 text-emerald-300'
                }`}
                title={isMonitoringPaused ? 'Resume live tool monitoring' : 'Pause live tool monitoring'}
            >
                {isMonitoringPaused ? <PauseCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {isMonitoringPaused ? 'Monitor: OFF' : 'Monitor: ON'}
            </button>

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
                        onClick={() => disconnectLive()}
                        className="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-900/30 text-red-400 transition-colors"
                        title="Stop Live Session"
                    >
                        <StopCircle className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    data-testid="voice-toggle"
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
            <button onClick={() => setShowSelfImprovementPanel(!showSelfImprovementPanel)} className={`p-2 rounded transition-colors ${showSelfImprovementPanel ? 'text-purple-400 bg-purple-900/30' : 'text-slate-400 hover:text-white'}`} title="Self-Improvement Center">
                <Brain className="w-4 h-4" />
            </button>
        </div>
      </div>

            {!isMonitoringPaused && liveChecklist.length > 0 && (
                <div className="px-4 pt-4">
                    <div className="bg-slate-900/70 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-2">Live guidance</div>
                        <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1">
                            {liveChecklist.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="px-4 pt-4">
                <ToolsInstallVerifyPanel
                    accentClassName="text-emerald-300"
                    description="Chat is the main interface. Optional features (voice, Blender scripts, desktop actions) require the relevant integrations to be active."
                    tools={[]}
                    verify={[
                        'Send a short message and confirm you receive a response.',
                        'Confirm citations can expand and collapse when sources are present.',
                    ]}
                    firstTestLoop={[
                        'Ask Mossy for a tiny “hello world” FO4 mod plan (one record or one script).',
                        'Execute exactly one action (generate text or analyze a file) and confirm the output is usable.',
                    ]}
                    troubleshooting={[
                        'If responses fail, check Settings for API key/model configuration.',
                        'If desktop actions fail, confirm Desktop Bridge/Electron API is available.',
                    ]}
                />
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
                {/* Suggestion Panel */}
                {suggestions.length > 0 && (
                    <SuggestionPanel
                        suggestions={getTopSuggestions(3)}
                        onDismiss={(id) => console.log('Dismissed suggestion:', id)}
                        onAccept={(id) => console.log('Accepted suggestion:', id)}
                        showAll={false}
                    />
                )}

                {onboardingState === 'project_setup' ? (
                    <ProjectWizard 
                        onCancel={() => {
                            setOnboardingState('ready');
                            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Project setup cancelled.", timestamp: Date.now() }]);
                        }}
                        onSubmit={(data) => {
                            createProjectFile(data);
                            setOnboardingState('ready');
                            setMessages(prev => [...prev, { 
                                id: Date.now().toString(), 
                                role: 'assistant', 
                                content: `**Project Initialized:** ${data.name}\n\nCategories: ${data.categories.join(', ')}\n\nI've set up your workspace. Ready to begin?`,
                                timestamp: Date.now()
                            }]);
                        }}
                    />
                ) : (
                    <>
                        {selectedFile && (
                        <div className="flex items-center gap-2 mb-2 bg-slate-800 p-2 rounded-lg w-fit text-sm border border-slate-600">
                            <div className="bg-slate-700 p-1 rounded"><FileText className="w-4 h-4 text-slate-300" /></div>
                            <span className="truncate max-w-[200px] text-slate-200">{selectedFile.name}</span>
                            <button onClick={() => {
                                // Track file removal
                                if (selectedFile) {
                                    trackEvent('file_removed', {
                                        fileName: selectedFile.name,
                                        fileSize: selectedFile.size,
                                        fileType: selectedFile.type
                                    });
                                }
                                setSelectedFile(null);
                            }} className="hover:text-red-400 p-1 rounded-full hover:bg-slate-700"><X className="w-3 h-3" /></button>
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
                            <input type="file" className="hidden" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    setSelectedFile(file);
                                    
                                    // Track file selection
                                    trackEvent('file_selected', {
                                        fileName: file.name,
                                        fileSize: file.size,
                                        fileType: file.type,
                                        fileExtension: file.name.split('.').pop()?.toLowerCase()
                                    });
                                }
                            }} accept=".psc,.nif,.dds,image/*,text/*" />
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

                        {isListening && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-xl border border-slate-700">
                                <div className="text-xs text-slate-400">Audio:</div>
                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all ${
                                            audioLevel > 30 ? 'bg-emerald-500' : 
                                            audioLevel > 10 ? 'bg-yellow-500' : 
                                            'bg-red-500'
                                        }`}
                                        style={{ width: `${audioLevel}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-400 w-8 text-right">{audioLevel}%</div>
                            </div>
                        )}

                        <input type="text" data-testid="chat-input" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-slate-100 placeholder-slate-500" placeholder="Message Mossy..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button data-testid="send-button" onClick={() => handleSend()} disabled={isLoading || isStreaming || (!inputText && !selectedFile)} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-lg shadow-emerald-900/20"><Send className="w-5 h-5" /></button>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>

    {/* Self-Improvement Panel */}
    <SelfImprovementPanel
      isVisible={showSelfImprovementPanel}
      onClose={() => setShowSelfImprovementPanel(false)}
    />
  </div>
);

};

export default ChatInterface;
