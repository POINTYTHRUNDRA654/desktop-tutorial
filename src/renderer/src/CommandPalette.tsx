import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, Zap, ArrowRight, CornerDownLeft, BrainCircuit, Loader2, FileCode, LayoutDashboard, Terminal, MessageSquare, Activity, Image, Mic2, Hexagon, Layers, Box, Settings, Sparkles, RefreshCw, Dna, Database, Shield, Radio, Map, Container, Camera, Aperture, Network, GitBranch, PenTool, FlaskConical, Bug, Package, Globe, Smartphone, Heart, Lock, Gamepad2, Monitor, Rocket, ShieldCheck, Feather, Keyboard, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Action {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    shortcut?: string;
    shortcutKeys?: string[];
    action: () => void;
    group: 'Navigation' | 'System' | 'AI' | 'Quick Actions';
    keywords?: string[];
}

const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // --- Actions Definition ---
    const actions: Action[] = [
        // Quick Actions
        { id: 'quick-chat', title: 'Start Chat', subtitle: 'Talk to Mossy', icon: MessageSquare, shortcut: 'Ctrl+Shift+C', shortcutKeys: ['Control', 'Shift', 'KeyC'], group: 'Quick Actions', action: () => navigate('/chat'), keywords: ['chat', 'talk', 'ai', 'conversation'] },
        { id: 'quick-workshop', title: 'Open Workshop', subtitle: 'Code editor & scripts', icon: FileCode, shortcut: 'Ctrl+Shift+W', shortcutKeys: ['Control', 'Shift', 'KeyW'], group: 'Quick Actions', action: () => navigate('/workshop'), keywords: ['code', 'script', 'editor', 'programming'] },
        { id: 'quick-monitor', title: 'System Monitor', subtitle: 'Performance & logs', icon: Activity, shortcut: 'Ctrl+Shift+M', shortcutKeys: ['Control', 'Shift', 'KeyM'], group: 'Quick Actions', action: () => navigate('/monitor'), keywords: ['monitor', 'performance', 'logs', 'system'] },
        { id: 'quick-search', title: 'Global Search', subtitle: 'Search all content', icon: Search, shortcut: 'Ctrl+Shift+F', shortcutKeys: ['Control', 'Shift', 'KeyF'], group: 'Quick Actions', action: () => navigate('/search'), keywords: ['search', 'find', 'global'] },
        { id: 'quick-settings', title: 'Settings', subtitle: 'App preferences', icon: Settings, shortcut: 'Ctrl+,', shortcutKeys: ['Control', 'Comma'], group: 'Quick Actions', action: () => navigate('/settings'), keywords: ['settings', 'preferences', 'config'] },

        // Core Navigation
        { id: 'nav-home', title: 'The Nexus', subtitle: 'Dashboard & Overview', icon: LayoutDashboard, group: 'Navigation', action: () => navigate('/'), keywords: ['home', 'dashboard', 'nexus', 'overview'] },
        { id: 'nav-chat', title: 'Chat Interface', subtitle: 'Talk to Mossy', icon: MessageSquare, group: 'Navigation', action: () => navigate('/chat'), keywords: ['chat', 'ai', 'conversation', 'talk'] },
        { id: 'nav-monitor', title: 'System Monitor', subtitle: 'Resource Usage & Logs', icon: Activity, group: 'Navigation', action: () => navigate('/monitor'), keywords: ['monitor', 'system', 'performance', 'logs'] },

        // Creative Suite
        { id: 'nav-images', title: 'Image Suite', subtitle: 'Generation & PBR Textures', icon: Image, group: 'Navigation', action: () => navigate('/images'), keywords: ['image', 'texture', 'pbr', 'generation', 'art'] },
        { id: 'nav-audio', title: 'Audio Studio', subtitle: 'TTS & SFX Synthesis', icon: Mic2, group: 'Navigation', action: () => navigate('/tts'), keywords: ['audio', 'sound', 'tts', 'voice', 'music'] },
        { id: 'nav-holo', title: 'The Holodeck', subtitle: 'Mod Validation Engine', icon: Gamepad2, group: 'Navigation', action: () => navigate('/holo'), keywords: ['holodeck', 'test', 'validation', 'game'] },

        // Logic & Code
        { id: 'nav-workshop', title: 'The Workshop', subtitle: 'Scripting & Visual Graphs', icon: FileCode, group: 'Navigation', action: () => navigate('/workshop'), keywords: ['workshop', 'code', 'script', 'programming', 'logic'] },
        { id: 'nav-terminal', title: 'HyperTerminal', subtitle: 'CLI & Shell Bridge', icon: Terminal, group: 'Navigation', action: () => navigate('/terminal'), keywords: ['terminal', 'cli', 'shell', 'command'] },
        { id: 'nav-splicer', title: 'The Splicer', subtitle: 'Binary & Havok Analysis', icon: Hexagon, group: 'Navigation', action: () => navigate('/splicer'), keywords: ['splicer', 'binary', 'havok', 'analysis'] },
        { id: 'nav-blueprint', title: 'The Blueprint', subtitle: 'System Architecture Planner', icon: Layers, group: 'Navigation', action: () => navigate('/blueprint'), keywords: ['blueprint', 'architecture', 'planning', 'system'] },

        // Data & Knowledge
        { id: 'nav-cortex', title: 'The Cortex', subtitle: 'RAG Knowledge Base', icon: BrainCircuit, group: 'Navigation', action: () => navigate('/cortex'), keywords: ['cortex', 'knowledge', 'rag', 'docs', 'documentation'] },
        { id: 'nav-lore', title: 'The Lorekeeper', subtitle: 'Worldbuilding Graph', icon: Network, group: 'Navigation', action: () => navigate('/lore'), keywords: ['lore', 'worldbuilding', 'graph', 'story'] },
        { id: 'nav-vault', title: 'The Vault', subtitle: 'Asset Management', icon: Container, group: 'Navigation', action: () => navigate('/vault'), keywords: ['vault', 'assets', 'management', 'files'] },
        { id: 'nav-registry', title: 'The Registry', subtitle: 'Plugin Conflict Resolution', icon: Database, group: 'Navigation', action: () => navigate('/registry'), keywords: ['registry', 'plugins', 'conflicts', 'resolution'] },

        // Neural / Abstract
        { id: 'nav-anima', title: 'The Anima', subtitle: 'Personality & Memory Core', icon: Heart, group: 'Navigation', action: () => navigate('/anima'), keywords: ['anima', 'personality', 'memory', 'core'] },
        { id: 'nav-genome', title: 'The Genome', subtitle: 'Self-Evolution Engine', icon: Dna, group: 'Navigation', action: () => navigate('/genome'), keywords: ['genome', 'evolution', 'self', 'learning'] },
        { id: 'nav-prism', title: 'The Prism', subtitle: 'Multi-Perspective Analysis', icon: RefreshCw, group: 'Navigation', action: () => navigate('/prism'), keywords: ['prism', 'analysis', 'perspective', 'multi'] },
        { id: 'nav-hive', title: 'The Hive', subtitle: 'Multi-Agent Swarm', icon: Hexagon, group: 'Navigation', action: () => navigate('/hive'), keywords: ['hive', 'agents', 'swarm', 'multi'] },
        { id: 'nav-reverie', title: 'The Reverie', subtitle: 'Subconscious Processing', icon: Sparkles, group: 'Navigation', action: () => navigate('/reverie'), keywords: ['reverie', 'subconscious', 'processing', 'dream'] },

        // Tools
        { id: 'nav-lens', title: 'The Lens', subtitle: 'Visual Context Analysis', icon: Aperture, group: 'Navigation', action: () => navigate('/lens'), keywords: ['lens', 'visual', 'context', 'analysis'] },
        { id: 'nav-conduit', title: 'The Conduit', subtitle: 'API & Webhook Gateway', icon: Radio, group: 'Navigation', action: () => navigate('/conduit'), keywords: ['conduit', 'api', 'webhook', 'gateway'] },
        { id: 'nav-catalyst', title: 'The Catalyst', subtitle: 'Prompt Engineering Lab', icon: FlaskConical, group: 'Navigation', action: () => navigate('/catalyst'), keywords: ['catalyst', 'prompt', 'engineering', 'lab'] },
        { id: 'nav-cartographer', title: 'The Cartographer', subtitle: 'Level Design & Mapping', icon: Map, group: 'Navigation', action: () => navigate('/cartographer'), keywords: ['cartographer', 'level', 'design', 'mapping'] },
        { id: 'nav-organizer', title: 'The Organizer', subtitle: 'Mod Load Order Tool', icon: Layers, group: 'Navigation', action: () => navigate('/organizer'), keywords: ['organizer', 'load', 'order', 'mod'] },
        { id: 'nav-crucible', title: 'The Crucible', subtitle: 'Crash Log Forensics', icon: Bug, group: 'Navigation', action: () => navigate('/crucible'), keywords: ['crucible', 'crash', 'log', 'forensics'] },
        { id: 'nav-auditor', title: 'The Auditor', subtitle: 'Mod QA & Integrity Check', icon: ShieldCheck, group: 'Navigation', action: () => navigate('/auditor'), keywords: ['auditor', 'qa', 'integrity', 'check'] },
        { id: 'nav-scribe', title: 'The Scribe', subtitle: 'Documentation & Publishing', icon: Feather, group: 'Navigation', action: () => navigate('/scribe'), keywords: ['scribe', 'documentation', 'publishing', 'write'] },
        { id: 'nav-assembler', title: 'The Assembler', subtitle: 'FOMOD Installer Creator', icon: Package, group: 'Navigation', action: () => navigate('/assembler'), keywords: ['assembler', 'fomod', 'installer', 'package'] },
        { id: 'nav-orchestrator', title: 'The Orchestrator', subtitle: 'Automated Workflow Pipelines', icon: GitBranch, group: 'Navigation', action: () => navigate('/orchestrator'), keywords: ['orchestrator', 'workflow', 'pipeline', 'automation'] },

        // System Actions
        { id: 'sys-deploy', title: 'Deploy / Release', subtitle: 'Build Project & Invite Testers', icon: Rocket, group: 'System', action: () => navigate('/monitor'), keywords: ['deploy', 'release', 'build', 'testers'] },
        { id: 'sys-voice', title: 'Toggle Voice Mode', subtitle: 'Enable/Disable TTS', icon: Mic2, group: 'System', action: () => { /* Logic integrated via context or event bus in real app */ alert('Voice Toggled'); }, keywords: ['voice', 'tts', 'speech', 'audio'] },
        { id: 'sys-bridge', title: 'Desktop Bridge Status', subtitle: 'Check Localhost Connection', icon: Monitor, group: 'System', action: () => navigate('/bridge'), keywords: ['bridge', 'desktop', 'connection', 'localhost'] },
        { id: 'sys-reload', title: 'Reboot Core', subtitle: 'Reload Application', icon: RefreshCw, group: 'System', action: () => window.location.reload(), keywords: ['reload', 'reboot', 'restart', 'refresh'] },
        { id: 'sys-tutorial', title: 'Start Tutorial', subtitle: 'Guided tour of features', icon: Lightbulb, group: 'System', action: () => window.dispatchEvent(new CustomEvent('start-welcome-tour')), keywords: ['tutorial', 'guide', 'help', 'onboarding'] },
        { id: 'sys-feature-tour', title: 'Feature Spotlight', subtitle: 'Show new features', icon: Zap, group: 'System', action: () => window.dispatchEvent(new CustomEvent('start-feature-tour')), keywords: ['feature', 'spotlight', 'new', 'updates'] },
    ];

    // Filtered List with Enhanced Search
    const filteredActions = actions.filter(action => {
        if (!query) return true;

        const searchTerm = query.toLowerCase();
        const titleMatch = action.title.toLowerCase().includes(searchTerm);
        const subtitleMatch = action.subtitle?.toLowerCase().includes(searchTerm);
        const keywordMatch = action.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm));

        return titleMatch || subtitleMatch || keywordMatch;
    });

    // Add "Ask Mossy" option if query exists
    const showAskOption = query.length > 0;
    
    // --- Enhanced Keyboard Listeners ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Command Palette Toggle
            if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
                setAiResult(null);
                return;
            }

            // Quick Actions Shortcuts
            if (e.ctrlKey && e.shiftKey) {
                const action = actions.find(a =>
                    a.shortcutKeys &&
                    a.shortcutKeys.length === 3 &&
                    a.shortcutKeys[0] === 'Control' &&
                    a.shortcutKeys[1] === 'Shift' &&
                    a.shortcutKeys[2] === e.code
                );

                if (action) {
                    e.preventDefault();
                    action.action();
                    return;
                }
            }

            // Settings shortcut (Ctrl+,)
            if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                const settingsAction = actions.find(a => a.id === 'quick-settings');
                if (settingsAction) settingsAction.action();
                return;
            }

            // Escape to close
            if (e.key === 'Escape') {
                setIsOpen(false);
                return;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Selection Navigation
    useEffect(() => {
        const handleNav = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (filteredActions.length + (showAskOption ? 1 : 0)));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + (filteredActions.length + (showAskOption ? 1 : 0))) % (filteredActions.length + (showAskOption ? 1 : 0)));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSelection();
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filteredActions, showAskOption, selectedIndex]);

    // Focus Input on Open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const executeSelection = async () => {
        const actionIndex = selectedIndex;
        
        if (showAskOption && actionIndex === filteredActions.length) {
            await askMossy(query);
        } else {
            const action = filteredActions[actionIndex];
            if (action) {
                action.action();
                setIsOpen(false);
            }
        }
    };

    const askMossy = async (prompt: string) => {
        setIsThinking(true);
        setAiResult(null);
        try {
            const response = await (window as any).electronAPI.aiChatOpenAI(
                `User Quick Query from Command Palette: "${prompt}". Provide a concise, helpful answer (max 3 sentences).`,
                'You are a helpful Fallout 4 modding assistant.',
                'gpt-3.5-turbo'
            );
            setAiResult(response.success && response.content ? response.content : "Connection Error.");
        } catch (e) {
            setAiResult("Connection Error.");
        } finally {
            setIsThinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative animate-scale-in">
                
                {/* Search Bar */}
                <div className="flex items-center px-4 py-4 border-b border-slate-700 bg-slate-900/50">
                    <Search className="w-5 h-5 text-slate-400 mr-3" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                            setAiResult(null);
                        }}
                        placeholder="Type a command, jump to module, or ask Mossy..."
                        className="flex-1 bg-transparent border-none text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-0"
                    />
                    <div className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">ESC</div>
                </div>

                {/* Content Area */}
                <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    
                    {/* Actions List */}
                    {filteredActions.length > 0 && (
                        <div className="mb-2">
                            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-2">System Commands</div>
                            {filteredActions.map((action, i) => (
                                <button
                                    key={action.id}
                                    onClick={() => { action.action(); setIsOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                        selectedIndex === i ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <action.icon className={`w-5 h-5 ${selectedIndex === i ? 'text-white' : 'text-slate-400'}`} />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{action.title}</div>
                                        {action.subtitle && <div className={`text-xs ${selectedIndex === i ? 'text-emerald-100' : 'text-slate-500'}`}>{action.subtitle}</div>}
                                    </div>
                                    {action.shortcut && (
                                        <div className={`text-xs font-mono px-2 py-1 rounded border ${
                                            selectedIndex === i
                                                ? 'bg-white/20 border-white/30 text-white'
                                                : 'bg-slate-700 border-slate-600 text-slate-400'
                                        }`}>
                                            {action.shortcut}
                                        </div>
                                    )}
                                    {selectedIndex === i && <CornerDownLeft className="w-4 h-4 opacity-50" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Ask Mossy Option */}
                    {showAskOption && (
                        <div className="mt-2 border-t border-slate-800 pt-2">
                            <button
                                onClick={() => executeSelection()}
                                className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                    selectedIndex === filteredActions.length ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                <div className={`mt-0.5 p-1 rounded ${selectedIndex === filteredActions.length ? 'bg-white/20' : 'bg-purple-500/20'}`}>
                                    {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-300" />}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        Ask Mossy: <span className="italic opacity-80">&quot;{query}&quot;</span>
                                    </div>
                                    <div className={`text-xs mt-1 ${selectedIndex === filteredActions.length ? 'text-purple-100' : 'text-slate-500'}`}>
                                        Use AI to process this request instantly.
                                    </div>
                                </div>
                                {selectedIndex === filteredActions.length && <ArrowRight className="w-4 h-4 opacity-50" />}
                            </button>
                        </div>
                    )}

                    {/* AI Result Display */}
                    {aiResult && (
                        <div className="m-3 p-4 bg-slate-800/50 border border-purple-500/30 rounded-xl animate-slide-up">
                            <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                                <BrainCircuit className="w-4 h-4" /> Mossy Intelligence
                            </div>
                            <div className="prose prose-invert prose-sm text-slate-300 leading-relaxed">
                                <ReactMarkdown>{aiResult}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {filteredActions.length === 0 && !showAskOption && (
                        <div className="py-12 text-center text-slate-500">
                            <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Type to search or command...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-[10px] text-slate-500 px-4">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">↑↓</span> to navigate</span>
                        <span className="flex items-center gap-1"><span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">↵</span> to select</span>
                    </div>
                    <div>
                        <span className="font-mono text-emerald-500">SYSTEM: READY</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

CommandPalette.displayName = 'CommandPalette';
export default CommandPalette;