import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { Search, Command, Zap, ArrowRight, CornerDownLeft, BrainCircuit, Loader2, FileCode, LayoutDashboard, Terminal, MessageSquare, Activity, Image, Mic2, Hexagon, Layers, Box, Settings, Sparkles, RefreshCw, Dna, Database, Shield, Radio, Map, Container, Camera, Aperture, Network, GitBranch, PenTool, FlaskConical, Bug, Package, Globe, Smartphone, Heart, Lock, Gamepad2, Monitor, Rocket, ShieldCheck, Feather } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Action {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    shortcut?: string;
    action: () => void;
    group: 'Navigation' | 'System' | 'AI';
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
        // Core
        { id: 'nav-home', title: 'The Nexus', subtitle: 'Dashboard & Overview', icon: LayoutDashboard, group: 'Navigation', action: () => navigate('/') },
        { id: 'nav-chat', title: 'Chat Interface', subtitle: 'Talk to Mossy', icon: MessageSquare, group: 'Navigation', action: () => navigate('/chat') },
        { id: 'nav-monitor', title: 'System Monitor', subtitle: 'Resource Usage & Logs', icon: Activity, group: 'Navigation', action: () => navigate('/monitor') },
        
        // Creative Suite
        { id: 'nav-images', title: 'Image Suite', subtitle: 'Generation & PBR Textures', icon: Image, group: 'Navigation', action: () => navigate('/images') },
        { id: 'nav-audio', title: 'Audio Studio', subtitle: 'TTS & SFX Synthesis', icon: Mic2, group: 'Navigation', action: () => navigate('/tts') },
        { id: 'nav-fabric', title: 'The Fabric', subtitle: 'UI/UX Interface Synthesizer', icon: PenTool, group: 'Navigation', action: () => navigate('/fabric') },
        { id: 'nav-holo', title: 'The Holodeck', subtitle: 'Interactive Simulation Engine', icon: Gamepad2, group: 'Navigation', action: () => navigate('/holo') },

        // Logic & Code
        { id: 'nav-workshop', title: 'The Workshop', subtitle: 'Scripting & Visual Graphs', icon: FileCode, group: 'Navigation', action: () => navigate('/workshop') },
        { id: 'nav-terminal', title: 'HyperTerminal', subtitle: 'CLI & Shell Bridge', icon: Terminal, group: 'Navigation', action: () => navigate('/terminal') },
        { id: 'nav-splicer', title: 'The Splicer', subtitle: 'Binary & Havok Analysis', icon: Hexagon, group: 'Navigation', action: () => navigate('/splicer') },
        { id: 'nav-blueprint', title: 'The Blueprint', subtitle: 'System Architecture Planner', icon: Layers, group: 'Navigation', action: () => navigate('/blueprint') },

        // Data & Knowledge
        { id: 'nav-cortex', title: 'The Cortex', subtitle: 'RAG Knowledge Base', icon: BrainCircuit, group: 'Navigation', action: () => navigate('/cortex') },
        { id: 'nav-lore', title: 'The Lorekeeper', subtitle: 'Worldbuilding Graph', icon: Network, group: 'Navigation', action: () => navigate('/lore') },
        { id: 'nav-vault', title: 'The Vault', subtitle: 'Asset Management', icon: Container, group: 'Navigation', action: () => navigate('/vault') },
        { id: 'nav-registry', title: 'The Registry', subtitle: 'Plugin Conflict Resolution', icon: Database, group: 'Navigation', action: () => navigate('/registry') },

        // Neural / Abstract
        { id: 'nav-anima', title: 'The Anima', subtitle: 'Personality & Memory Core', icon: Heart, group: 'Navigation', action: () => navigate('/anima') },
        { id: 'nav-genome', title: 'The Genome', subtitle: 'Self-Evolution Engine', icon: Dna, group: 'Navigation', action: () => navigate('/genome') },
        { id: 'nav-prism', title: 'The Prism', subtitle: 'Multi-Perspective Analysis', icon: RefreshCw, group: 'Navigation', action: () => navigate('/prism') },
        { id: 'nav-hive', title: 'The Hive', subtitle: 'Multi-Agent Swarm', icon: Hexagon, group: 'Navigation', action: () => navigate('/hive') },
        { id: 'nav-reverie', title: 'The Reverie', subtitle: 'Subconscious Processing', icon: Sparkles, group: 'Navigation', action: () => navigate('/reverie') },

        // Tools
        { id: 'nav-lens', title: 'The Lens', subtitle: 'Visual Context Analysis', icon: Aperture, group: 'Navigation', action: () => navigate('/lens') },
        { id: 'nav-conduit', title: 'The Conduit', subtitle: 'API & Webhook Gateway', icon: Radio, group: 'Navigation', action: () => navigate('/conduit') },
        { id: 'nav-catalyst', title: 'The Catalyst', subtitle: 'Prompt Engineering Lab', icon: FlaskConical, group: 'Navigation', action: () => navigate('/catalyst') },
        { id: 'nav-cartographer', title: 'The Cartographer', subtitle: 'Level Design & Mapping', icon: Map, group: 'Navigation', action: () => navigate('/cartographer') },
        { id: 'nav-organizer', title: 'The Organizer', subtitle: 'Mod Load Order Tool', icon: Layers, group: 'Navigation', action: () => navigate('/organizer') },
        { id: 'nav-crucible', title: 'The Crucible', subtitle: 'Crash Log Forensics', icon: Bug, group: 'Navigation', action: () => navigate('/crucible') },
        { id: 'nav-auditor', title: 'The Auditor', subtitle: 'Mod QA & Integrity Check', icon: ShieldCheck, group: 'Navigation', action: () => navigate('/auditor') },
        { id: 'nav-scribe', title: 'The Scribe', subtitle: 'Documentation & Publishing', icon: Feather, group: 'Navigation', action: () => navigate('/scribe') },
        { id: 'nav-assembler', title: 'The Assembler', subtitle: 'FOMOD Installer Creator', icon: Package, group: 'Navigation', action: () => navigate('/assembler') },
        { id: 'nav-orchestrator', title: 'The Orchestrator', subtitle: 'Automated Workflow Pipelines', icon: GitBranch, group: 'Navigation', action: () => navigate('/orchestrator') },
        
        // System Actions
        { id: 'sys-deploy', title: 'Deploy / Release', subtitle: 'Build Project & Invite Testers', icon: Rocket, group: 'System', action: () => navigate('/monitor') },
        { id: 'sys-voice', title: 'Toggle Voice Mode', subtitle: 'Enable/Disable TTS', icon: Mic2, group: 'System', action: () => { /* Logic integrated via context or event bus in real app */ alert('Voice Toggled'); } },
        { id: 'sys-bridge', title: 'Desktop Bridge Status', subtitle: 'Check Localhost Connection', icon: Monitor, group: 'System', action: () => navigate('/bridge') },
        { id: 'sys-reload', title: 'Reboot Core', subtitle: 'Reload Application', icon: RefreshCw, group: 'System', action: () => window.location.reload() },
    ];

    // Filtered List
    const filteredActions = actions.filter(action => 
        action.title.toLowerCase().includes(query.toLowerCase()) || 
        action.subtitle?.toLowerCase().includes(query.toLowerCase())
    );

    // Add "Ask Mossy" option if query exists
    const showAskOption = query.length > 0;
    
    // --- Keyboard Listeners ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
                setAiResult(null);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User Quick Query from Command Palette: "${prompt}". Provide a concise, helpful answer (max 3 sentences).`,
            });
            setAiResult(response.text);
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
                                        Ask Mossy: <span className="italic opacity-80">"{query}"</span>
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

export default CommandPalette;