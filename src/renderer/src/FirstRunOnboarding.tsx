import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, Sparkles, Check, X, ArrowRight, Loader, Map } from 'lucide-react';
import { useI18n, resolveUiLanguage } from './i18n';
import TutorialVideoPanel from './components/TutorialVideoPanel';
import { speakMossy } from './mossyTts';
import { getBrowserTtsVoices, loadBrowserTtsSettings, saveBrowserTtsSettings } from './browserTts';

interface OnboardingProps {
    onComplete: () => void;
}

interface ToolRecommendation {
    name: string;
    path: string;
    category: 'nvidia' | 'ai' | 'modding' | 'creative';
    benefit: string;
    boostsMossy: boolean;
}

export const FirstRunOnboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t, setUiLanguagePref } = useI18n();
    const [step, setStep] = useState<'welcome' | 'scanning' | 'recommendations' | 'complete'>('welcome');
    const [scanProgress, setScanProgress] = useState(0);
    const [recommendations, setRecommendations] = useState<ToolRecommendation[]>([]);
    const [filteredRecommendations, setFilteredRecommendations] = useState<ToolRecommendation[]>([]);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [userChoices, setUserChoices] = useState<Record<string, boolean>>({});
    const [showAllPrograms, setShowAllPrograms] = useState(false);
    const [showTutorialVideo, setShowTutorialVideo] = useState(false);
    const hasSpokenIntro = useRef(false);
    const scanTutorialStartedRef = useRef(false);
    const [languageReady, setLanguageReady] = useState(false);
    const [scanTutorialRequested, setScanTutorialRequested] = useState(false);
    const [scanTutorialOpenedAt, setScanTutorialOpenedAt] = useState<string | null>(null);

    const [uiLanguage, setUiLanguage] = useState<string>('auto');

    const getElectronApi = () => {
        return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
    };

    const shouldSpeak = () => {
        try {
            return localStorage.getItem('mossy_voice_enabled') !== 'false';
        } catch {
            return true;
        }
    };

    useEffect(() => {
        // Check if this is truly first run
        const hasOnboarded = localStorage.getItem('mossy_onboarding_complete');
        if (hasOnboarded) {
            onComplete();
        }
    }, []);

    useEffect(() => {
        if (step !== 'welcome') return;
        if (hasSpokenIntro.current) return;
        if (!shouldSpeak()) return;
        hasSpokenIntro.current = true;

        const speakSequence = async () => {
            await speakMossy("Hello, I'm Mossy.");
            await speakMossy('Pick your language to begin.');
            await speakMossy('When you are ready, start the scan.');
        };

        void speakSequence();
    }, [step]);

    // Load persisted UI language (if available) so the first screen reflects it.
    useEffect(() => {
        const api = getElectronApi();
        if (!api?.getSettings) return;

        let disposed = false;
        const load = async () => {
            try {
                const s = await api.getSettings();
                if (disposed) return;
                const pref = String(s?.uiLanguage || 'auto');
                setUiLanguage(pref);
                if (pref === 'auto') setUiLanguagePref('auto');
                else {
                    setUiLanguagePref(resolveUiLanguage(pref));
                    setLanguageReady(true);
                }
            } catch {
                // ignore
            }
        };

        void load();
        return () => {
            disposed = true;
        };
    }, [setUiLanguagePref]);

    const applyLanguage = async (value: string) => {
        setUiLanguage(value);

        if (value === 'auto') {
            setUiLanguagePref('auto');
        } else {
            setUiLanguagePref(resolveUiLanguage(value));
        }

        const api = getElectronApi();
        if (!api?.setSettings) return;
        try {
            await api.setSettings({ uiLanguage: value });
        } catch {
            // ignore
        }

        if (value !== 'auto') {
            const voices = getBrowserTtsVoices();
            const match = voices.find(v => v.lang?.toLowerCase().startsWith(value.toLowerCase()));
            if (match) {
                const settings = loadBrowserTtsSettings();
                saveBrowserTtsSettings({ ...settings, preferredVoiceName: match.name, enabled: true });
                localStorage.setItem('mossy_voice_enabled', 'true');
            }
        }

        setLanguageReady(true);
    };

    const triggerScanTutorial = useCallback(() => {
        if (scanTutorialStartedRef.current) return;
        scanTutorialStartedRef.current = true;
        try {
            localStorage.setItem('mossy_force_scan_tutorial', 'true');
        } catch {
            // ignore
        }
        setScanTutorialRequested(true);
        const directOpen = (window as any).mossyOpenScanTutorial as undefined | (() => void);
        if (directOpen) {
            directOpen();
        }
        window.dispatchEvent(new CustomEvent('start-scan-tutorial'));
        document.dispatchEvent(new CustomEvent('start-scan-tutorial'));
        window.setTimeout(() => {
            try {
                const openedAt = localStorage.getItem('mossy_scan_tutorial_opened_at');
                if (openedAt) {
                    const ts = Number(openedAt);
                    if (Number.isFinite(ts)) {
                        setScanTutorialOpenedAt(new Date(ts).toLocaleTimeString());
                    }
                }
            } catch {
                // ignore
            }
        }, 200);
    }, []);

    const startScan = async () => {
        setStep('scanning');
        setScanProgress(10);

        if (shouldSpeak()) {
            void speakMossy('Starting system scan. While I scan, I will walk you through the tutorial so you can get oriented.', { cancelExisting: true });
        }
        window.setTimeout(() => {
            triggerScanTutorial();
        }, 250);

        try {
            const api = getElectronApi();
            if (!api?.getSystemInfo || !api?.detectPrograms) {
                throw new Error('Electron API not available');
            }

            // Get system info
            const systemInfo = await api.getSystemInfo();
            setScanProgress(30);

            // Detect all programs
            const allDetectedApps = await api.detectPrograms();
            setAllApps(allDetectedApps);
            setScanProgress(70);

            // Analyze and categorize
            const nvidia = allDetectedApps.filter((a: any) => 
                (a.displayName || a.name || '').toLowerCase().match(/nvidia|geforce|cuda|rtx|canvas|nsight|omniverse/)
            );

            const ai = allDetectedApps.filter((a: any) => 
                (a.displayName || a.name || '').toLowerCase().match(/ollama|luma|comfy|stable|gpt|kobold|automatic1111/)
            );

            const creative = allDetectedApps.filter((a: any) => 
                (a.displayName || a.name || '').toLowerCase().match(/gimp|photoshop|blender|substance|marmoset/)
            );

            const modding = allDetectedApps.filter((a: any) => 
                (a.displayName || a.name || '').toLowerCase().match(/xedit|fo4edit|creation kit|nifskope|outfit studio|bodyslide|wrye bash|loot|vortex|mod organizer/)
            );

            // Build recommendations - prioritize tools that boost Mossy
            const recs: ToolRecommendation[] = [];

            // NVIDIA tools - highest priority
            nvidia.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/canvas/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'nvidia',
                        benefit: 'AI texture generation - Mossy can guide workflows',
                        boostsMossy: true
                    });
                } else if (name.match(/nsight/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'nvidia',
                        benefit: 'Performance profiling for games',
                        boostsMossy: false
                    });
                }
            });

            // AI tools - highest priority (boost Mossy significantly)
            ai.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/ollama/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Run local AI models - GREATLY enhances Mossy\'s capabilities',
                        boostsMossy: true
                    });
                } else if (name.match(/luma/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Generate 3D assets from photos - Mossy can guide',
                        boostsMossy: true
                    });
                } else if (name.match(/comfy|stable/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Image generation for texture creation',
                        boostsMossy: true
                    });
                }
            });

            // Creative tools
            creative.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/gimp|photoshop|krita|affinity/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'creative',
                        benefit: 'Edit textures and images - Mossy has integration workflows',
                        boostsMossy: false
                    });
                } else if (name.match(/blender/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'creative',
                        benefit: '⭐ 3D modeling - Mossy has direct Blender script integration',
                        boostsMossy: true
                    });
                }
            });

            // Modding tools
            modding.forEach((app: any) => {
                const name = app.displayName || app.name;
                recs.push({
                    name,
                    path: app.path,
                    category: 'modding',
                    benefit: 'Essential for Fallout 4 modding workflows',
                    boostsMossy: false
                });
            });

            // Save scan results
            localStorage.setItem('mossy_all_detected_apps', JSON.stringify(allDetectedApps));
            // Use a numeric timestamp so all modules can compare it safely
            localStorage.setItem('mossy_last_scan', Date.now().toString());
            const previousSummary = localStorage.getItem('mossy_scan_summary');
            if (previousSummary) {
                localStorage.setItem('mossy_scan_summary_prev', previousSummary);
            }
            localStorage.setItem('mossy_scan_summary', JSON.stringify({
                totalPrograms: allDetectedApps.length,
                nvidiaTools: nvidia.length,
                aiTools: ai.length,
                systemInfo
            }));

            setScanProgress(100);
            setRecommendations(recs);
            setFilteredRecommendations(recs);
            setStep('recommendations');

        } catch (error) {
            console.error('[Onboarding] Scan failed:', error);
            // Skip to complete if scan fails
            setStep('complete');
        }
    };

    useEffect(() => {
        if (step !== 'scanning') return;
        if (scanTutorialStartedRef.current) return;
        const timer = window.setTimeout(() => {
            triggerScanTutorial();
        }, 350);
        return () => window.clearTimeout(timer);
    }, [step, triggerScanTutorial]);

    const handleChoice = (toolName: string, accepted: boolean) => {
        setUserChoices(prev => ({ ...prev, [toolName]: accepted }));
    };

    const finishOnboarding = () => {
        // Save user preferences
        localStorage.setItem('mossy_tool_preferences', JSON.stringify(userChoices));
        localStorage.setItem('mossy_onboarding_complete', 'true');
        
        // Build integrated tools list for Mossy
        const integratedTools = recommendations
            .filter(r => userChoices[r.name] === true)
            .map(r => ({ name: r.name, path: r.path, category: r.category }));
        
        localStorage.setItem('mossy_integrated_tools', JSON.stringify(integratedTools));

                // Promote to the unified scan/permissions store used across the app.
                // These are the tools the user explicitly approved for Mossy to know about and interact with.
                const promotedApps = integratedTools.map((t, idx) => ({
                    id: `onboard-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                    name: t.name,
                    category: t.category,
                    checked: true,
                    path: t.path
                }));
                localStorage.setItem('mossy_apps', JSON.stringify(promotedApps));
        
        setStep('complete');
        setTimeout(onComplete, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
                {step === 'welcome' && (
                    <div className="text-center animate-fade-in">
                        <Sparkles className="w-20 h-20 mx-auto mb-6 text-amber-400" />
                        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Mossy v5.4.23</h1>
                        <p className="text-xl text-slate-300 mb-8">
                            Your AI-powered Fallout 4 modding assistant with next-gen voice conversation
                        </p>
                        <p className="text-slate-400 mb-6">
                            <strong className="text-emerald-400">✨ New in v5.4.23:</strong> Pick your UI language on first launch (or later in Settings), plus a smoother Install Wizard experience.
                        </p>
                        <p className="text-slate-400 mb-8">
                            Let me scan your system to discover tools I can integrate with.
                            This will help me provide personalized recommendations and boost my capabilities.
                        </p>

                        <div className="max-w-md mx-auto mb-8 text-left bg-slate-900/40 border border-slate-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Map className="w-4 h-4 text-emerald-400" />
                                {t('onboarding.language.label', 'Language')}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {t('onboarding.language.help', 'Choose your interface language. You can change this later in Settings.')}
                            </div>
                            <select
                                className="mt-3 w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2"
                                value={uiLanguage}
                                onChange={(e) => void applyLanguage(e.target.value)}
                            >
                                <option value="auto">{t('onboarding.language.auto', 'Auto (system)')}</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                                <option value="de">Deutsch</option>
                                <option value="ru">Русский</option>
                                <option value="zh-Hans">中文（简体）</option>
                            </select>
                        </div>

                        <button
                            onClick={startScan}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Start System Scan <ArrowRight className="w-5 h-5" />
                        </button>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => setShowTutorialVideo((prev) => !prev)}
                                className="text-sm text-amber-300 hover:text-amber-200 underline"
                            >
                                {showTutorialVideo ? 'Hide' : 'Watch'} full onboarding tutorial
                            </button>
                        </div>

                        {showTutorialVideo && (
                            <div className="mt-6 text-left">
                                <TutorialVideoPanel
                                    title="First-Run Video Guide"
                                    description="A full walkthrough of setup, scanning, and the core pages you will use most often."
                                />
                            </div>
                        )}
                    </div>
                )}

                {step === 'scanning' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                            <div className="text-center">
                                <Loader className="w-16 h-16 mx-auto mb-6 text-amber-400 animate-spin" />
                                <h2 className="text-2xl font-bold text-white mb-4">Scanning Your System</h2>
                                <p className="text-slate-400 mb-6">
                                    Detecting installed programs and tools...
                                </p>
                                <div className="w-full bg-slate-800 rounded-full h-3 mb-4">
                                    <div
                                        className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${scanProgress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-slate-500">{scanProgress}%</p>
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={triggerScanTutorial}
                                        className="px-5 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-100 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Start walkthrough
                                    </button>
                                    <div className="text-[11px] text-slate-500 mt-2">
                                        If the tutorial did not auto-start, use this button to launch it.
                                    </div>
                                    {scanTutorialRequested && (
                                        <div className="text-[11px] text-emerald-400 mt-2">
                                            Launch requested...
                                        </div>
                                    )}
                                    {scanTutorialOpenedAt && (
                                        <div className="text-[11px] text-emerald-300 mt-1">
                                            Tutorial opened at {scanTutorialOpenedAt}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <TutorialVideoPanel
                                compact
                                title="Watch While We Scan"
                                description="Quick orientation while your system scan runs."
                                className="lg:mt-2"
                            />
                        </div>
                    </div>
                )}

                {step === 'recommendations' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <Cpu className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Tools Discovered</h2>
                            <p className="text-slate-400">
                                I found {recommendations.length} recommended tools out of {allApps?.length || 'many'} total programs installed.
                                <br />
                                <span className="text-xs mt-1 block">Select tools you want me to know about and use:</span>
                            </p>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder={`Search all ${allApps.length} programs...`}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                                onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    if (search.length > 0) {
                                        // Filter recommendations by search term
                                        setFilteredRecommendations(
                                            recommendations.filter(r => 
                                                r.name.toLowerCase().includes(search) ||
                                                r.benefit.toLowerCase().includes(search)
                                            )
                                        );
                                    } else {
                                        setFilteredRecommendations(recommendations);
                                    }
                                }}
                            />
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-6">
                            {filteredRecommendations.map((rec, i) => (
                                <div
                                    key={i}
                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                        userChoices[rec.name] === true
                                            ? 'bg-emerald-900/20 border-emerald-500'
                                            : userChoices[rec.name] === false
                                            ? 'bg-slate-900/50 border-slate-700 opacity-50'
                                            : 'bg-slate-800 border-slate-700 hover:border-amber-500'
                                    }`}
                                    onClick={() => {
                                        const current = userChoices[rec.name];
                                        handleChoice(rec.name, current !== true);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-bold text-sm">{rec.name}</h3>
                                                {rec.boostsMossy && (
                                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/50">
                                                        Boosts Mossy
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">{rec.benefit}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {userChoices[rec.name] === true ? (
                                                <Check className="w-5 h-5 text-emerald-400" />
                                            ) : userChoices[rec.name] === false ? (
                                                <X className="w-5 h-5 text-slate-500" />
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-slate-500 rounded" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mb-4">
                            <button
                                onClick={() => setShowAllPrograms(!showAllPrograms)}
                                className="text-sm text-amber-400 hover:text-amber-300 underline"
                            >
                                {showAllPrograms ? 'Hide' : 'View'} all {allApps.length} programs →
                            </button>
                        </div>

                        {showAllPrograms && (
                            <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                                <h4 className="text-white font-bold text-sm mb-3">All Detected Programs</h4>
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {allApps.slice(0, 100).map((app: any, i: number) => (
                                        <div key={i} className="text-xs text-slate-400 flex items-center justify-between py-1 px-2 hover:bg-slate-800/50 rounded cursor-pointer"
                                            onClick={() => {
                                                const appName = app.displayName || app.name;
                                                handleChoice(appName, userChoices[appName] !== true);
                                            }}
                                        >
                                            <span>{app.displayName || app.name}</span>
                                            {userChoices[app.displayName || app.name] && (
                                                <Check className="w-3 h-3 text-emerald-400" />
                                            )}
                                        </div>
                                    ))}
                                    {allApps.length > 100 && (
                                        <div className="text-xs text-slate-500 py-1 px-2">
                                            ... and {allApps.length - 100} more programs
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Click any program to toggle selection. You can always adjust your choices later in Settings.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={finishOnboarding}
                            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
                        >
                            Complete Setup
                        </button>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="text-center animate-fade-in">
                        <Check className="w-20 h-20 mx-auto mb-6 text-emerald-400" />
                        <h2 className="text-3xl font-bold text-white mb-4">Setup Complete!</h2>
                        <p className="text-xl text-slate-300 mb-6">
                            I'm ready to help you create amazing mods.
                        </p>
                        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-6 mb-6 text-left max-w-lg mx-auto">
                            <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" /> Try Live Voice Now!
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li>• Click <strong>"Live Voice"</strong> in the sidebar to start an always-on voice conversation</li>
                                <li>• Just speak naturally—I'll detect when you're done (~1 second of silence)</li>
                                <li>• I remember everything we discuss, so no need to repeat yourself</li>
                                <li>• Optional: configure STT in settings (OpenAI) for faster recognition</li>
                                <li>• Live Voice is experimental; check Settings if you need to tune permissions or providers</li>
                                <li>• Use <strong>"Mute"</strong> when you need me to stop listening temporarily</li>
                            </ul>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Ready to experience the future of AI modding assistance?
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
