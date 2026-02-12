import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X, Terminal, Mic2, BrainCircuit, Video } from 'lucide-react';
import VideoTutorial from './VideoTutorial';
import { speakMossy } from './mossyTts';

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
    narration?: string;
}

const TutorialOverlay: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [installProgress, setInstallProgress] = useState(0);
    const [bootLogs, setBootLogs] = useState<string[]>([]);
    const [showVideoTutorial, setShowVideoTutorial] = useState(false);
    const lastSpokenStepId = useRef<string | null>(null);
    const [tutorialMode, setTutorialMode] = useState<'main' | 'scan'>('main');
    const visualGuideSrc = (name: string) => `/visual-guide-images/${encodeURIComponent(name)}`;

    const renderGuideImage = (name: string, alt: string) => (
        <div className="mt-4 rounded-lg border border-slate-700/80 bg-slate-950/60 p-2">
            <img
                src={visualGuideSrc(name)}
                alt={alt}
                className="w-full max-h-48 object-cover rounded"
                loading="lazy"
            />
        </div>
    );

    const recognitionRef = useRef<any>(null);
    const [readyHeard, setReadyHeard] = useState(false);
    const [, setVoiceTriggerStatus] = useState<'idle' | 'listening' | 'denied' | 'unsupported'>('idle');
    const [voiceTriggerNote, setVoiceTriggerNote] = useState('');
    const openScanTutorialRef = useRef<(() => void) | null>(null);

    const openScanTutorial = () => {
        setCurrentStepIndex(0);
        setInstallProgress(0);
        setBootLogs([]);
        setTutorialMode('scan');
        setIsOpen(true);
        try {
            localStorage.removeItem('mossy_force_scan_tutorial');
            localStorage.setItem('mossy_scan_tutorial_opened_at', Date.now().toString());
        } catch {
            // ignore
        }
    };

    openScanTutorialRef.current = openScanTutorial;

    // --- State Management ---

    useEffect(() => {
        // Tutorial is manual-by-default.
        // Auto-opening a full-screen overlay can make the app feel "stuck" if anything goes wrong with layout.
        // To auto-start, explicitly set: localStorage.setItem('mossy_tutorial_autostart', 'true')
        const completed = localStorage.getItem('mossy_tutorial_completed') === 'true';
        const autoStart = localStorage.getItem('mossy_tutorial_autostart') === 'true';
        const route = window.location.hash || '#/';
        const onHome = route === '#/' || route === '#' || route === '';

        if (!completed && autoStart && onHome) {
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }

        const handleTrigger = () => {
            setCurrentStepIndex(0);
            setInstallProgress(0);
            setBootLogs([]);
            setTutorialMode('main');
            setIsOpen(true);
        };

        const handleScanTrigger = () => {
            openScanTutorial();
        };

        const handleVideoTutorial = () => {
            setShowVideoTutorial(true);
        };

        window.addEventListener('start-tutorial', handleTrigger);
        window.addEventListener('start-scan-tutorial', handleScanTrigger);
        document.addEventListener('start-scan-tutorial', handleScanTrigger);
        window.addEventListener('open-video-tutorial', handleVideoTutorial);
        return () => {
            window.removeEventListener('start-tutorial', handleTrigger);
            window.removeEventListener('start-scan-tutorial', handleScanTrigger);
            document.removeEventListener('start-scan-tutorial', handleScanTrigger);
            window.removeEventListener('open-video-tutorial', handleVideoTutorial);
        };
    }, []);

    useEffect(() => {
        (window as any).mossyOpenScanTutorial = () => {
            openScanTutorialRef.current?.();
        };
        return () => {
            if ((window as any).mossyOpenScanTutorial) {
                delete (window as any).mossyOpenScanTutorial;
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen) return;
        let shouldOpen = false;
        try {
            shouldOpen = localStorage.getItem('mossy_force_scan_tutorial') === 'true';
        } catch {
            shouldOpen = false;
        }
        if (!shouldOpen) return;
        openScanTutorial();
    }, [isOpen]);

    // Allow Esc to close when open
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]);

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

                if (p > 20 && bootLogs.length < 2) setBootLogs(prev => [...prev, '> Mounting Local Filesystem (Read-Only)...']);
                if (p > 50 && bootLogs.length < 3) setBootLogs(prev => [...prev, '> Injecting Python Hooks...']);
                if (p > 80 && bootLogs.length < 4) setBootLogs(prev => [...prev, '> Opening Port 21337...']);

                if (p >= 100) {
                    clearInterval(interval);
                    setBootLogs(prev => [...prev, '> BRIDGE CONNECTION ESTABLISHED.']);

                    localStorage.setItem('mossy_bridge_active', 'true');
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('mossy-bridge-connected'));
                }
            }, 150);
            return () => clearInterval(interval);
        }
    }, [currentStepIndex, isOpen]);

    // --- Step Definitions ---

    const mainSteps: TutorialStep[] = [
        {
            id: 'welcome',
            title: 'System Online',
            placement: 'center',
            highlight: undefined,
            narration: 'Welcome, Architect. I am Mossy, your neural interface for creative workflows. I will guide you through the basics.',
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
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-6">
                        I am <strong>Mossy</strong>, your neural interface for creative workflows. 
                        I can see your screen, read your files, and execute code to help you build faster.
                    </p>
                    <div className="flex flex-col gap-3 mt-6">
                        <button
                            onClick={() => {
                                setShowVideoTutorial(true);
                                setIsOpen(false);
                            }}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-900/20"
                        >
                            <Video className="w-5 h-5" />
                            Watch Video Tutorial
                        </button>
                        <p className="text-xs text-slate-500">or continue with interactive walkthrough below</p>
                    </div>
                </div>
            )
        },
        {
            id: 'bridge',
            title: 'Establishing Uplink',
            placement: 'center',
            narration: 'I am establishing a desktop bridge so I can assist with your local tools and workflows.',
            content: (
                <div className="w-full">
                    <p className="text-slate-400 text-sm mb-4">
                        To function effectively, I need to establish a <strong>Desktop Bridge</strong> to your local environment.
                    </p>

                    <div className="bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs h-48 flex flex-col relative overflow-hidden">
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
            highlight: { top: 0, left: 0, width: '256px', height: '100%' },
            narration: 'The left sidebar is your command deck. Use it to navigate between Mossy modules and tools.',
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
            placement: 'right-of-sidebar',
            highlight: { top: 'auto', left: 0, width: '256px', height: '100%' },
            narration: 'Live Voice enables hands free conversation. Open it from the sidebar when you want to talk while you work.',
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
            narration: 'Press Control K to open the command palette. It is the fastest way to navigate and run actions.',
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

    const scanSteps: TutorialStep[] = [
        {
            id: 'scan-welcome',
            title: 'System Scan',
            placement: 'center',
            narration: 'While I scan, I will explain what each onboarding step does and why it matters.',
            content: (
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 animate-pulse">
                            <BrainCircuit className="w-10 h-10 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-lg text-slate-200 font-medium mb-2">
                        Onboarding in progress
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        I am scanning your system to detect modding tools. This helps me tailor recommendations and integrations.
                    </p>
                    {renderGuideImage("Page one. Mossy's space..png", 'Mossy home screen')}
                </div>
            )
        },
        {
            id: 'scan-language',
            title: 'Language Preference',
            placement: 'center',
            narration: 'First, choose your interface language. You can change it later in Settings at any time.',
            content: (
                <div>
                    <p className="text-slate-300 text-sm">
                        Pick a UI language on the first screen. This only changes the interface text and can be updated later.
                    </p>
                    {renderGuideImage('Page 40 settings..png', 'Settings screen')}
                </div>
            )
        },
        {
            id: 'scan-progress',
            title: 'System Scan Running',
            placement: 'center',
            narration: 'The scan checks for tools like Blender, xEdit, and Creation Kit. It typically takes less than a minute.',
            content: (
                <div>
                    <p className="text-slate-300 text-sm">
                        I am reading installed programs to discover modding tools. You will see a progress bar while I work.
                    </p>
                    {renderGuideImage('Page 25 System Monitor..png', 'System monitor overview')}
                </div>
            )
        },
        {
            id: 'scan-recommendations',
            title: 'Tool Recommendations',
            placement: 'center',
            narration: 'After the scan, I will show recommended tools. Select the ones you want me to recognize and assist with.',
            content: (
                <div>
                    <p className="text-slate-300 text-sm">
                        I will list tools I can integrate with. Approving them enables smarter guidance and automation.
                    </p>
                </div>
            )
        },
        {
            id: 'scan-permissions',
            title: 'Your Permissions',
            placement: 'center',
            narration: 'You control what I can access. Only approved tools are stored, and you can change this later in Settings.',
            content: (
                <div>
                    <p className="text-slate-300 text-sm">
                        Mossy is permission-first. Only the tools you approve are saved for integrations.
                    </p>
                </div>
            )
        },
        {
            id: 'scan-complete',
            title: 'Finish Setup',
            placement: 'center',
            narration: 'When you finish this step, you will land in the main app. I am ready when you are.',
            content: (
                <div>
                    <p className="text-slate-300 text-sm">
                        Click Complete Setup to enter the main app. You can replay this tutorial from Settings any time.
                    </p>
                    {renderGuideImage('Page three. First success..png', 'First success screen')}
                </div>
            )
        }
    ];

    const steps = tutorialMode === 'scan' ? scanSteps : mainSteps;

    useEffect(() => {
        if (!isOpen) {
            lastSpokenStepId.current = null;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const currentStep = steps[currentStepIndex];
        const narration = currentStep?.narration;
        if (!narration) return;
        const voiceDisabled = localStorage.getItem('mossy_voice_enabled') === 'false';
        if (voiceDisabled) return;
        if (lastSpokenStepId.current === currentStep?.id) return;
        lastSpokenStepId.current = currentStep?.id ?? null;
        void speakMossy(narration, { cancelExisting: true });
    }, [currentStepIndex, isOpen, steps]);

    useEffect(() => {
        if (!isOpen) return;
        if (tutorialMode !== 'scan') return;
        if (readyHeard) return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setVoiceTriggerStatus('unsupported');
            setVoiceTriggerNote('Voice trigger unavailable in this environment.');
            return;
        }

        let stream: MediaStream | null = null;
        const startListening = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                setVoiceTriggerStatus('denied');
                setVoiceTriggerNote('Microphone permission denied. Use the Start tour button instead.');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.onresult = (event: any) => {
                const last = event.results?.[event.results.length - 1];
                const transcript = String(last?.[0]?.transcript || '').toLowerCase();
                if (
                    transcript.includes("i'm ready") ||
                    transcript.includes('im ready') ||
                    transcript.includes('ready to proceed') ||
                    transcript.includes('start tour') ||
                    transcript.includes('start the tour') ||
                    transcript.includes('go ahead and start') ||
                    transcript.includes('start now')
                ) {
                    setReadyHeard(true);
                    recognition.stop();
                    setIsOpen(false);
                    window.dispatchEvent(new CustomEvent('start-welcome-tour'));
                }
            };
            recognition.onerror = () => {
                setVoiceTriggerStatus('denied');
                setVoiceTriggerNote('Voice trigger error. Use the Start tour button instead.');
            };
            recognition.onend = () => {
                if (tutorialMode === 'scan' && isOpen && !readyHeard) {
                    try {
                        recognition.start();
                    } catch {
                        // ignore
                    }
                }
            };

            recognitionRef.current = recognition;
            setVoiceTriggerStatus('listening');
            setVoiceTriggerNote('Listening for: “I’m ready”');
            try {
                recognition.start();
            } catch {
                setVoiceTriggerStatus('denied');
                setVoiceTriggerNote('Voice trigger unavailable. Use the Start tour button.');
            }
        };

        void startListening();

        return () => {
            try {
                recognitionRef.current?.stop?.();
            } catch {
                // ignore
            }
            try {
                stream?.getTracks().forEach(track => track.stop());
            } catch {
                // ignore
            }
            recognitionRef.current = null;
            stream = null;
        };
    }, [isOpen, readyHeard, tutorialMode]);

    useEffect(() => {
        if (!isOpen) return;
        if (tutorialMode !== 'scan') return;
        if (currentStepIndex >= steps.length - 1) return;
        const timer = window.setTimeout(() => {
            setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
        }, 6500);
        return () => window.clearTimeout(timer);
    }, [currentStepIndex, isOpen, steps.length, tutorialMode]);

    useEffect(() => {
        if (!isOpen) return;
        if (tutorialMode !== 'scan') return;
        if (currentStepIndex !== steps.length - 1) return;
        const timer = window.setTimeout(() => {
            if (readyHeard) return;
            setIsOpen(false);
            window.dispatchEvent(new CustomEvent('start-welcome-tour'));
        }, 3000);
        return () => window.clearTimeout(timer);
    }, [currentStepIndex, isOpen, readyHeard, steps.length, tutorialMode]);

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

    if (!isOpen && !showVideoTutorial) return null;

    const overlay = isOpen ? (
        <div className="fixed inset-0 z-[30000] overflow-hidden">
            {currentStep?.highlight ? (
                <>
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: 0, left: 0, right: 0, height: currentStep.highlight.top }}></div>
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: `calc(${currentStep.highlight.top} + ${currentStep.highlight.height})`, left: 0, right: 0, bottom: 0 }}></div>
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: currentStep.highlight.top, left: 0, width: currentStep.highlight.left, height: currentStep.highlight.height }}></div>
                    <div className="absolute bg-black/80 backdrop-blur-sm transition-all duration-500 ease-in-out"
                         style={{ top: currentStep.highlight.top, left: `calc(${currentStep.highlight.left} + ${currentStep.highlight.width})`, right: 0, height: currentStep.highlight.height }}></div>

                    <div className="absolute transition-all duration-500 ease-in-out pointer-events-none border-2 border-emerald-500/50 shadow-[0_0_100px_rgba(16,185,129,0.2)] rounded-lg z-10"
                         style={{ 
                             top: currentStep.highlight.top, 
                             left: currentStep.highlight.left, 
                             width: currentStep.highlight.width, 
                             height: currentStep.highlight.height 
                         }}></div>
                </>
            ) : (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"></div>
            )}

            <div className={`absolute pointer-events-auto transition-all duration-500 ease-in-out flex flex-col
                ${currentStep?.placement === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
                ${currentStep?.placement === 'right-of-sidebar' ? 'top-1/4 left-[280px]' : ''}
            `}>
                <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-[450px] overflow-hidden flex flex-col animate-scale-in relative">
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>

                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    {currentStep?.title}
                                </h2>
                                <div className="text-[10px] font-mono text-emerald-500 mt-1 uppercase tracking-widest">
                                    Protocol Sequence {currentStepIndex + 1}/{steps.length}
                                </div>
                            </div>
                            <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {currentStep?.content}
                    </div>

                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-700'}`}
                                ></div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            {voiceTriggerNote && (
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                    {voiceTriggerNote}
                                </span>
                            )}
                            {tutorialMode === 'scan' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.dispatchEvent(new CustomEvent('start-welcome-tour'));
                                    }}
                                    className="text-xs font-bold text-emerald-300 hover:text-white px-3 py-2 border border-emerald-500/40 rounded-lg"
                                >
                                    Start tour
                                </button>
                            )}
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
                                disabled={currentStep?.id === 'bridge' && installProgress < 100}
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
    ) : null;

    return (
        <>
            <VideoTutorial 
                isOpen={showVideoTutorial} 
                onClose={() => {
                    setShowVideoTutorial(false);
                    setIsOpen(true);
                }} 
            />
            {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay}
        </>
    );
};

export default TutorialOverlay;
