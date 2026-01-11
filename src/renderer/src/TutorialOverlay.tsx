import React, { useState, useEffect, useMemo } from 'react';
import { Download, CheckCircle2, ArrowRight, X, Monitor, Command, Layout, ChevronRight, Package, Terminal, Pause, Play, Mic2, BrainCircuit, Layers, Zap, ShieldCheck } from 'lucide-react';

interface HighlightRect {
    top: string | number;
    left: string | number;
    width: string | number;
    height: string | number;
    borderRadius?: string;
}

interface TutorialStep {
    id: string;
    title: string;
    content: React.ReactNode;
    highlight?: HighlightRect;
    placement: 'center' | 'right-of-sidebar' | 'bottom-of-header' | 'center-screen';
    showSkip?: boolean;
}

const TutorialOverlay: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [installProgress, setInstallProgress] = useState(0);
    const [bootLogs, setBootLogs] = useState<string[]>([]);

    // --- State Management ---
    
    useEffect(() => {
        // Check local storage for tutorial status
        const completed = localStorage.getItem('mossy_tutorial_completed') === 'true';
        if (!completed) {
            // Small delay to allow app to render before showing tutorial
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }

        // Event listener for manual restart
        const handleTrigger = () => {
            setCurrentStepIndex(0);
            setInstallProgress(0);
            setBootLogs([]);
            setIsOpen(true);
        };
        window.addEventListener('start-tutorial', handleTrigger);
        return () => window.removeEventListener('start-tutorial', handleTrigger);
    }, []);

    // --- Boot Sequence Simulation (Step 1) ---
    useEffect(() => {
        if (currentStepIndex === 1 && isOpen) {
            setInstallProgress(0);
            setBootLogs(['> Initializing Neural Bridge...']);
            
            let p = 0;
            const interval = setInterval(() => {
                p += Math.random() * 5;
                if (p > 100) p = 100;
                setInstallProgress(p);

                // Add logs based on progress
                if (p > 20 && bootLogs.length < 2) setBootLogs(prev => [...prev, '> Mounting Local Filesystem (Read-Only)...']);
                if (p > 50 && bootLogs.length < 3) setBootLogs(prev => [...prev, '> Injecting Python Hooks...']);
                if (p > 80 && bootLogs.length < 4) setBootLogs(prev => [...prev, '> Opening Port 21337...']);

                if (p >= 100) {
                    clearInterval(interval);
                    setBootLogs(prev => [...prev, '> BRIDGE CONNECTION ESTABLISHED.']);
                    
                    // ACTUALLY ACTIVATE BRIDGE
                    localStorage.setItem('mossy_bridge_active', 'true');
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('mossy-bridge-connected'));
                }
            }, 150);
            return () => clearInterval(interval);
        }
    }, [currentStepIndex, isOpen]);

    // --- Step Definitions ---
    
    const steps: TutorialStep[] = [
        {
            id: 'welcome',
            title: 'System Online',
            placement: 'center',
            highlight: undefined,
            content: (
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 animate-pulse">
                            <BrainCircuit className="w-10 h-10 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-lg text-slate-200 font-medium mb-2">
                        Welcome, Architect.
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        I am <strong>Mossy</strong>, your neural interface for creative workflows. 
                        I can see your screen, read your files, and execute code to help you build faster.
                    </p>
                </div>
            )
        },
        {
            id: 'bridge',
            title: 'Establishing Uplink',
            placement: 'center',
            content: (
                <div className="w-full">
                    <p className="text-slate-400 text-sm mb-4">
                        To function effectively, I need to establish a <strong>Desktop Bridge</strong> to your local environment.
                    </p>
                    
                    <div className="bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs h-48 flex flex-col relative overflow-hidden">
                        {/* Scanlines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none"></div>
                        
                        <div className="flex-1 space-y-1 z-10">
                            {bootLogs.map((log, i) => (
                                <div key={i} className={`${log.includes('ESTABLISHED') ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                    {log}
                                </div>
                            ))}
                            {installProgress < 100 && <div className="text-emerald-500 animate-pulse">_</div>}
                        </div>

                        <div className="mt-4 z-10">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                                <span>Installation Progress</span>
                                <span>{Math.round(installProgress)}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                <div 
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-100 ease-out" 
                                    style={{ width: `${installProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sidebar',
            title: 'Neural Lattice',
            placement: 'right-of-sidebar',
            highlight: { top: 0, left: 0, width: '256px', height: '100%' }, // Matches w-64 sidebar
            content: (
                <div>
                    <p className="text-slate-300 text-sm mb-4">
                        This is your command deck. Navigate between different <strong>Neural Modules</strong> here.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                            <div className="p-1.5 bg-blue-500/20 rounded text-blue-400"><Terminal className="w-4 h-4"/></div>
                            <div>
                                <div className="text-xs font-bold text-white">The Workshop</div>
                                <div className="text-[10px] text-slate-500">Code & Script IDE</div>
                            </div>
                        </li>
                        <li className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                            <div className="p-1.5 bg-purple-500/20 rounded text-purple-400"><BrainCircuit className="w-4 h-4"/></div>
                            <div>
                                <div className="text-xs font-bold text-white">The Cortex</div>
                                <div className="text-[10px] text-slate-500">Knowledge Base RAG</div>
                            </div>
                        </li>
                    </ul>
                </div>
            )
        },
        {
            id: 'live',
            title: 'Live Voice Link',
            placement: 'right-of-sidebar', // Or specific location if we want
            // Highlighting the bottom of the sidebar might be tricky without specific refs, 
            // so let's highlight the nav item area generally or just point to it.
            highlight: { top: 'auto', left: 0, width: '256px', height: '100%' }, 
            content: (
                <div>
                    <p className="text-slate-300 text-sm mb-4">
                        Need to talk? I am always listening.
                    </p>
                    <div className="flex items-center justify-center p-6 bg-black/40 rounded-xl border border-slate-800 mb-4">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                            <div className="relative z-10 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-emerald-500/50 text-emerald-400">
                                <Mic2 className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400">
                        Select <strong>Live Voice</strong> in the sidebar for a low-latency, hands-free conversation while you work in other apps.
                    </p>
                </div>
            )
        },
        {
            id: 'cmd',
            title: 'Power User Access',
            placement: 'center',
            content: (
                <div className="text-center">
                    <div className="mb-6 inline-flex items-center gap-2">
                        <div className="px-4 py-3 bg-slate-800 rounded-lg border-b-4 border-slate-950 text-white font-mono font-bold shadow-lg">Ctrl</div>
                        <span className="text-slate-500">+</span>
                        <div className="px-4 py-3 bg-slate-800 rounded-lg border-b-4 border-slate-950 text-white font-mono font-bold shadow-lg">K</div>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">
                        Expert architects don't use the mouse.
                    </p>
                    <p className="text-slate-400 text-xs">
                        Press <strong>Cmd+K</strong> (or Ctrl+K) anywhere to open the Command Palette.
                        Jump to modules, run scripts, or ask me questions instantly.
                    </p>
                </div>
            )
        }
    ];

    // --- Handlers ---

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem('mossy_tutorial_completed', 'true');
        setIsOpen(false);
    };

    const currentStep = steps[currentStepIndex];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* 
                DYNAMIC SPOTLIGHT SYSTEM
                Uses a combination of 4 divs to create a "hole" in the overlay
            */}
            {currentStep.highlight ? (
                <>
                    {/* Top Shade */}
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: 0, left: 0, right: 0, height: currentStep.highlight.top }}></div>
                    {/* Bottom Shade */}
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: `calc(${currentStep.highlight.top} + ${currentStep.highlight.height})`, left: 0, right: 0, bottom: 0 }}></div>
                    {/* Left Shade */}
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: currentStep.highlight.top, left: 0, width: currentStep.highlight.left, height: currentStep.highlight.height }}></div>
                    {/* Right Shade */}
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: currentStep.highlight.top, left: `calc(${currentStep.highlight.left} + ${currentStep.highlight.width})`, right: 0, height: currentStep.highlight.height }}></div>
                    
                    {/* The Spotlight Border/Glow */}
                    <div className="absolute transition-all duration-500 ease-in-out pointer-events-none border-2 border-emerald-500/50 shadow-[0_0_100px_rgba(16,185,129,0.2)] rounded-lg z-10"
                         style={{ 
                             top: currentStep.highlight.top, 
                             left: currentStep.highlight.left, 
                             width: currentStep.highlight.width, 
                             height: currentStep.highlight.height 
                         }}></div>
                </>
            ) : (
                // Full Overlay if no highlight
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"></div>
            )}

            {/* Content Container Positioner */}
            <div className={`absolute pointer-events-auto transition-all duration-500 ease-in-out flex flex-col
                ${currentStep.placement === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
                ${currentStep.placement === 'right-of-sidebar' ? 'top-1/4 left-[280px]' : ''}
            `}>
                
                {/* The Card */}
                <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-[450px] overflow-hidden flex flex-col animate-scale-in relative">
                    
                    {/* Decorative Header Line */}
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>

                    {/* Step Content */}
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    {currentStep.title}
                                </h2>
                                <div className="text-[10px] font-mono text-emerald-500 mt-1 uppercase tracking-widest">
                                    Protocol Sequence {currentStepIndex + 1}/{steps.length}
                                </div>
                            </div>
                            <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {currentStep.content}
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-700'}`}
                                ></div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            {currentStepIndex > 0 && (
                                <button 
                                    onClick={() => setCurrentStepIndex(prev => prev - 1)}
                                    className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2"
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                onClick={handleNext}
                                disabled={currentStep.id === 'bridge' && installProgress < 100}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {currentStepIndex === steps.length - 1 ? 'Launch System' : 'Next'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorialOverlay;