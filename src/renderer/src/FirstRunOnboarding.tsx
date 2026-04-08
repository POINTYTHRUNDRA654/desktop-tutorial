import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, Sparkles, Check, X, ArrowRight, Loader, Map, Download, ExternalLink, Brain, FolderOpen, Zap, Volume2 } from 'lucide-react';
import { useI18n, resolveUiLanguage } from './i18n';
import packageJson from '../../../package.json';
import TutorialVideoPanel from './components/TutorialVideoPanel';
import { speakMossy } from './mossyTts';
import { getBrowserTtsVoices, loadBrowserTtsSettings, saveBrowserTtsSettings, pickBrowserTtsVoice, ensureBrowserTtsSettingsStored } from './browserTts';
import { openExternal } from './utils/openExternal';

interface OnboardingProps {
    onComplete: () => void;
}

// ─── Curated downloads shown after the scan ────────────────────────────────
// Each entry links to the official Nexus or GitHub page — never bundled.
// detectKeywords: match against detected app display names (case-insensitive).
interface RecommendedDownload {
    name: string;
    description: string;
    /** Words to match against detected app names to mark as already installed. */
    detectKeywords: string[];
    url: string;
    urlLabel: string;
    category: 'modding' | 'version-control' | 'creative';
    required: boolean;
}

const RECOMMENDED_DOWNLOADS: RecommendedDownload[] = [
    {
        name: 'Spriggit',
        description: 'Converts ESP/ESM plugin files to plain text (YAML/JSON) so you can track changes in Git and collaborate on mods. Works with GitHub out of the box.',
        detectKeywords: ['spriggit'],
        url: 'https://github.com/Mutagen-Modding/Spriggit/releases',
        urlLabel: 'GitHub Releases',
        category: 'version-control',
        required: false,
    },
    {
        name: 'xEdit / FO4Edit',
        description: 'The essential plugin editor for Fallout 4. Used to resolve conflicts, clean masters, run scripts, and inspect every record in your load order.',
        detectKeywords: ['xedit', 'fo4edit', 'tes5edit'],
        url: 'https://www.nexusmods.com/fallout4/mods/2737',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: true,
    },
    {
        name: 'Mod Organizer 2',
        description: 'The recommended mod manager for Fallout 4. Keeps your game folder clean with a virtual file system and supports profiles.',
        detectKeywords: ['mod organizer', 'modorganizer'],
        url: 'https://github.com/ModOrganizer2/modorganizer/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
    },
    {
        name: 'LOOT',
        description: 'Automatically sorts your load order to reduce conflicts and provides warnings about problematic mods.',
        detectKeywords: ['loot'],
        url: 'https://github.com/loot/loot/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
    },
    {
        name: 'NifSkope',
        description: 'View and edit NIF mesh and texture files — essential for working with Fallout 4 3D assets.',
        detectKeywords: ['nifskope'],
        url: 'https://github.com/hexabits/nifskope/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
    },
    {
        name: 'BodySlide & Outfit Studio',
        description: 'Create and convert armour and clothing meshes to fit different body shapes. Required for most outfit mods.',
        detectKeywords: ['bodyslide', 'outfit studio'],
        url: 'https://www.nexusmods.com/fallout4/mods/25',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
    },
    {
        name: 'F4SE (Fallout 4 Script Extender)',
        description: 'Extends the scripting capabilities of Fallout 4. Required by many mods and by Mossy\'s deeper game integrations.',
        detectKeywords: ['f4se', 'script extender'],
        url: 'https://f4se.silverlock.org/',
        urlLabel: 'Official Site',
        category: 'modding',
        required: true,
    },
    {
        name: 'B.A.E. (Bethesda Archive Extractor)',
        description: 'Extracts the contents of Bethesda .ba2 archive files so you can inspect and modify base-game assets.',
        detectKeywords: ['bae', 'bethesda archive extractor', 'b.a.e'],
        url: 'https://www.nexusmods.com/fallout4/mods/78',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
    },
    {
        name: 'Upscayl',
        description: 'AI-powered image upscaler (2×, 3×, 4×) for texture and asset enhancement. Required by Mossy\'s Upscayl Extension. Supports PNG, JPG, and WebP with multiple AI model options and batch processing.',
        detectKeywords: ['upscayl'],
        url: 'https://github.com/upscayl/upscayl/releases',
        urlLabel: 'GitHub Releases',
        category: 'creative',
        required: false,
    },
];
// ─────────────────────────────────────────────────────────────────────────────

interface ToolRecommendation {
    name: string;
    path: string;
    category: 'nvidia' | 'ai' | 'modding' | 'creative';
    benefit: string;
    boostsMossy: boolean;
}

/** Delay (ms) before calling onComplete after the "complete" screen appears. */
const COMPLETE_TRANSITION_DELAY_MS = 2000;
/** Shorter delay when Spriggit digest already ran — the user just clicked Continue. */
const SPRIGGIT_DONE_TRANSITION_DELAY_MS = 500;
/** Maximum characters of error text shown in the Spriggit status message box. */
const MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH = 600;

export const FirstRunOnboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t, setUiLanguagePref } = useI18n();
    const [step, setStep] = useState<'edition' | 'welcome' | 'version' | 'scanning' | 'recommendations' | 'downloads' | 'spriggit-digest' | 'complete'>('edition');
    const [fo4Version, setFo4Version] = useState<string>(() => {
        try { return localStorage.getItem('mossy_fo4_version') || ''; } catch { return ''; }
    });
    const [mossyEdition, setMossyEdition] = useState<'nvidia' | 'universal' | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [recommendations, setRecommendations] = useState<ToolRecommendation[]>([]);
    const [filteredRecommendations, setFilteredRecommendations] = useState<ToolRecommendation[]>([]);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [userChoices, setUserChoices] = useState<Record<string, boolean>>({});
    const [showAllPrograms, setShowAllPrograms] = useState(false);
    const [showTutorialVideo, setShowTutorialVideo] = useState(false);
    const hasSpokenIntro = useRef(false);
    const hasSpokenVersion = useRef(false);
    const hasSpokenEdition = useRef(false);
    const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);
    const scanTutorialStartedRef = useRef(false);
    const [languageReady, setLanguageReady] = useState(false);
    const [scanTutorialRequested, setScanTutorialRequested] = useState(false);
    const [scanTutorialOpenedAt, setScanTutorialOpenedAt] = useState<string | null>(null);

    const [uiLanguage, setUiLanguage] = useState<string>('auto');

    // Spriggit digest step state
    const [spriggitCliPath, setSpriggitCliPath] = useState('');
    const [spriggitDataPath, setSpriggitDataPath] = useState('');
    const [spriggitStatus, setSpriggitStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [spriggitMessage, setSpriggitMessage] = useState('');
    const [spriggitFileCount, setSpriggitFileCount] = useState(0);

    // .NET Desktop Runtime availability (detected during the startup scan)
    const [dotnetOk, setDotnetOk] = useState<boolean | null>(() => {
        try {
            const v = localStorage.getItem('mossy_dotnet_ok');
            return v === null ? null : v === 'true';
        } catch { return null; }
    });

    const getElectronApi = () => {
        return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
    };

    const shouldSpeak = () => {
        try {
            // Returns true when the key is missing (null) or set to anything other than 'false'.
            return localStorage.getItem('mossy_voice_enabled') !== 'false';
        } catch {
            return true;
        }
    };

    /** Force-enable voice and ensure browser TTS settings are initialised. */
    const enableVoice = () => {
        try {
            localStorage.setItem('mossy_voice_enabled', 'true');
        } catch { /* ignore */ }
        const settings = loadBrowserTtsSettings();
        if (!settings.enabled) {
            saveBrowserTtsSettings({ ...settings, enabled: true });
        }
        ensureBrowserTtsSettingsStored();
    };

    useEffect(() => {
        // If onboarding was already completed, skip straight through.
        const hasOnboarded = localStorage.getItem('mossy_onboarding_complete');
        if (hasOnboarded) {
            onComplete();
            return;
        }

        // If the onboarding flag was cleared by an app update (e.g. by the NSIS
        // fresh-install.marker path in main.ts, which calls App.tsx's IPC handler that
        // removes 'mossy_onboarding_complete') but prior scan data still exists, skip
        // the re-scan entirely and complete onboarding silently. User data is preserved; only the "What's New" page
        // communicates what changed in the new release.
        const hasScanData =
            !!localStorage.getItem('mossy_scan_summary') &&
            !!localStorage.getItem('mossy_all_detected_apps');
        if (hasScanData) {
            localStorage.setItem('mossy_onboarding_complete', 'true');
            onComplete();
        }
    }, []);

    // Speak greeting on the edition picker (very first screen).
    useEffect(() => {
        if (step !== 'edition') return;
        if (hasSpokenEdition.current) return;
        hasSpokenEdition.current = true;

        // Ensure voice is on and TTS settings are ready before speaking.
        enableVoice();

        const speakSequence = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            await speakMossy("Hello, I'm Mossy, your Fallout 4 modding assistant.");
            await speakMossy('First, confirm which edition you downloaded: Universal, or NVIDIA.');
        };
        void speakSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    useEffect(() => {
        if (step !== 'welcome') return;
        if (hasSpokenIntro.current) return;
        if (!shouldSpeak()) return;
        hasSpokenIntro.current = true;

        // Delay first TTS to let Electron/Chromium finish loading speech synthesis voices.
        const speakSequence = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            await speakMossy("Hello, I'm Mossy.");
            await speakMossy('Pick your language to begin.');
            await speakMossy('When you are ready, press Next.');
        };

        void speakSequence();
    }, [step]);

    // Speak a brief intro when arriving at the game-version picker.
    useEffect(() => {
        if (step !== 'version') return;
        if (hasSpokenVersion.current) return;
        if (!shouldSpeak()) return;
        hasSpokenVersion.current = true;

        const speakSequence = async () => {
            await speakMossy('Which Fallout 4 version do you have? Pick the one that matches your install, then press Start System Scan.');
        };

        void speakSequence();
    }, [step]);

    // Fetch the Mossy edition (Universal or Nvidia) once on mount.
    useEffect(() => {
        const api = getElectronApi();
        if (!api?.getMossyEdition) return;
        api.getMossyEdition()
            .then((ed: 'nvidia' | 'universal') => setMossyEdition(ed))
            .catch(() => { /* ignore — not critical */ });
    }, []);

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
            // Use pickBrowserTtsVoice to intelligently select a female voice for the language
            const langBase = value.split('-')[0].toLowerCase();
            const match = pickBrowserTtsVoice(voices, undefined, langBase);
            if (match) {
                // Only auto-select the voice if it's actually for the requested language
                // Otherwise, keep the current voice (likely English Zira)
                if (match.lang && match.lang.toLowerCase().startsWith(langBase)) {
                    const settings = loadBrowserTtsSettings();
                    saveBrowserTtsSettings({ ...settings, preferredVoiceName: match.name, enabled: true });
                    localStorage.setItem('mossy_voice_enabled', 'true');
                } else {
                    console.log(`[FirstRunOnboarding] No ${value} voice available (found ${match.lang} instead), keeping current voice`);
                }
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

            // Check .NET Desktop Runtime — required by Spriggit and other .NET tools.
            // Do this during the scan so the Spriggit step can warn upfront.
            let dotnetAvailable = false;
            let dotnetVersion: string | null = null;
            try {
                if (api.checkDotnet) {
                    const dotnetResult = await api.checkDotnet();
                    dotnetAvailable = !!dotnetResult?.ok;
                    dotnetVersion = dotnetResult?.version ?? null;
                }
            } catch { /* non-fatal */ }
            setDotnetOk(dotnetAvailable);
            try {
                localStorage.setItem('mossy_dotnet_ok', String(dotnetAvailable));
                if (dotnetVersion) localStorage.setItem('mossy_dotnet_version', dotnetVersion);
            } catch { /* ignore */ }
            setScanProgress(80);

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

            // .NET Desktop Runtime — inject a warning card if missing
            if (!dotnetAvailable) {
                recs.unshift({
                    name: '.NET Desktop Runtime (missing)',
                    path: 'https://dotnet.microsoft.com/download/dotnet/6.0',
                    category: 'modding',
                    benefit: '⚠️ Required by Spriggit and other .NET tools. Install .NET Desktop Runtime 6.0+ before using the Spriggit digest step.',
                    boostsMossy: true,
                });
            }

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

        // Offer the Spriggit digest step before showing "complete".
        setStep('spriggit-digest');
    };

    /**
     * Run Spriggit serialize on the user's Fallout 4 Data folder, then
     * ingest all produced YAML files into the Knowledge Vault so Mossy
     * can reason over the user's specific plugin data.
     */
    const runSpriggitDigest = async () => {
        const api = getElectronApi();
        if (!api?.spriggitSerialize || !api?.saveKnowledgeVault) {
            setSpriggitMessage('Spriggit integration is not available in this build.');
            setSpriggitStatus('error');
            return;
        }
        if (!spriggitCliPath || !spriggitDataPath) {
            setSpriggitMessage('Please select both Spriggit.CLI.exe and your Fallout 4 Data folder.');
            return;
        }
        setSpriggitStatus('running');
        setSpriggitMessage('Running Spriggit — converting your plugins to YAML. This may take a few minutes…');
        try {
            const result = await api.spriggitSerialize({
                cliPath: spriggitCliPath,
                dataPath: spriggitDataPath,
                outputPath: '',
            });
            if (!result.ok || !result.files?.length) {
                setSpriggitStatus('error');
                const errText = result.error || 'No YAML files were produced.';
                // Cap display length to avoid rendering a massive wall of text.
                const displayErr = errText.length > MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH
                    ? errText.slice(0, MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH) + '\n…(truncated)'
                    : errText;
                setSpriggitMessage(`Spriggit failed:\n${displayErr}`);
                return;
            }
            // Build Knowledge Vault entries from the YAML files
            const getExistingVault = (): any[] => {
                try { return JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]') as any[]; } catch { return []; }
            };
            const existing: any[] = Array.isArray(getExistingVault()) ? getExistingVault() : [];
            const now = new Date().toISOString();
            const newEntries = (result.files as Array<{ name: string; content: string }>).map((f) => ({
                id: `spriggit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: `Spriggit: ${f.name}`,
                content: f.content,
                source: 'Spriggit serialize (onboarding)',
                trustLevel: 'personal',
                date: now,
                tags: ['spriggit', 'fallout4', 'plugin-data'],
                status: 'learned',
            }));
            const merged = [...existing, ...newEntries];
            localStorage.setItem('mossy_knowledge_vault', JSON.stringify(merged));
            try { await api.saveKnowledgeVault(merged); } catch { /* fire-and-forget */ }
            setSpriggitFileCount(newEntries.length);
            setSpriggitStatus('done');
            const warnMsg = result.error ? ` (some errors: ${result.error.slice(0, 120)})` : '';
            setSpriggitMessage(`✅ Digested ${newEntries.length} YAML files into my Knowledge Vault.${warnMsg}`);
            if (shouldSpeak()) {
                void speakMossy(`I've finished converting your plugins with Spriggit and digested ${newEntries.length} files into my knowledge.`);
            }
        } catch (err: any) {
            setSpriggitStatus('error');
            setSpriggitMessage(`Error: ${String(err?.message || err)}`);
        }
    };

    /** Advance from the spriggit-digest step to complete, using a shorter delay if the digest ran. */
    const handleSpriggitContinue = () => {
        setStep('complete');
        setTimeout(onComplete, spriggitFileCount > 0 ? SPRIGGIT_DONE_TRANSITION_DELAY_MS : COMPLETE_TRANSITION_DELAY_MS);
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">

                {/* ── Edition picker — very first screen ───────────────────────── */}
                {step === 'edition' && (
                    <div className="text-center animate-fade-in">
                        <Sparkles className="w-20 h-20 mx-auto mb-6 text-amber-400" />
                        <h1 className="text-4xl font-bold text-white mb-3">Welcome to Mossy v{packageJson.version}</h1>
                        <p className="text-lg text-slate-300 mb-2">Your AI-powered Fallout 4 modding assistant</p>
                        <p className="text-slate-400 mb-8">
                            Before we begin — confirm which edition you downloaded. This lets Mossy unlock the right features for your hardware.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                            {/* Universal Edition */}
                            <button
                                type="button"
                                aria-pressed={mossyEdition === 'universal'}
                                onClick={() => {
                                    setMossyEdition('universal');
                                    try { localStorage.setItem('mossy_edition_choice', 'universal'); } catch { /* ignore */ }
                                    const api = getElectronApi();
                                    if (api?.setSettings) void api.setSettings({ mossyEditionOverride: 'universal' }).catch(() => {});
                                }}
                                className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                                    mossyEdition === 'universal'
                                        ? 'bg-blue-900/60 border-blue-400 shadow-lg shadow-blue-900/40'
                                        : 'bg-slate-800/60 border-slate-600 hover:border-slate-400'
                                }`}
                            >
                                <Cpu className="w-10 h-10 text-blue-400 mb-3" />
                                <div className="text-lg font-bold text-white mb-1">Universal Edition</div>
                                <div className="text-xs text-slate-300 mb-3">CPU-based · Works on any hardware</div>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li>✓ AI assistant &amp; mod tools</li>
                                    <li>✓ Full modding workflow</li>
                                    <li>✓ No GPU required</li>
                                    <li className="text-slate-500">– Local AI fine-tuning not available</li>
                                </ul>
                                {mossyEdition === 'universal' && (
                                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-blue-300 bg-blue-900/70 px-2 py-0.5 rounded-full border border-blue-500">
                                        <Check className="w-3 h-3" /> Selected
                                    </span>
                                )}
                            </button>

                            {/* NVIDIA Edition */}
                            <button
                                type="button"
                                aria-pressed={mossyEdition === 'nvidia'}
                                onClick={() => {
                                    setMossyEdition('nvidia');
                                    try { localStorage.setItem('mossy_edition_choice', 'nvidia'); } catch { /* ignore */ }
                                    const api = getElectronApi();
                                    if (api?.setSettings) void api.setSettings({ mossyEditionOverride: 'nvidia' }).catch(() => {});
                                }}
                                className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                                    mossyEdition === 'nvidia'
                                        ? 'bg-green-900/60 border-green-400 shadow-lg shadow-green-900/40'
                                        : 'bg-slate-800/60 border-slate-600 hover:border-slate-400'
                                }`}
                            >
                                <Zap className="w-10 h-10 text-green-400 mb-3" />
                                <div className="text-lg font-bold text-white mb-1">NVIDIA Edition</div>
                                <div className="text-xs text-slate-300 mb-3">CUDA 12.4 · GPU-accelerated AI</div>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li>✓ Everything in Universal</li>
                                    <li>✓ Local AI fine-tuning (Unsloth)</li>
                                    <li>✓ Faster local inference</li>
                                    <li>⚠ Requires NVIDIA RTX / GTX GPU</li>
                                </ul>
                                {mossyEdition === 'nvidia' && (
                                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-green-300 bg-green-900/70 px-2 py-0.5 rounded-full border border-green-500">
                                        <Check className="w-3 h-3" /> Selected
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Voice test */}
                        <div className="max-w-md mx-auto mb-6 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-left">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                                <Volume2 className="w-4 h-4 text-amber-400" />
                                Voice Check
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Mossy speaks to you during onboarding and in the chat. Click below to confirm your audio is working.
                            </p>
                            <button
                                type="button"
                                disabled={voiceTestPlaying}
                                onClick={async () => {
                                    enableVoice();
                                    setVoiceTestPlaying(true);
                                    await speakMossy("Voice check. I'm Mossy. Your audio is working!", { cancelExisting: true });
                                    setVoiceTestPlaying(false);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-700/60 hover:bg-amber-600/60 border border-amber-500/60 text-amber-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Volume2 className="w-4 h-4" />
                                {voiceTestPlaying ? 'Speaking…' : 'Test Voice'}
                            </button>
                            <p className="mt-2 text-[10px] text-slate-500">
                                No audio? Go to Settings → Voice after setup to configure your voices.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('welcome')}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Continue <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {step === 'welcome' && (
                    <div className="text-center animate-fade-in">
                        <Sparkles className="w-20 h-20 mx-auto mb-6 text-amber-400" />
                        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Mossy v{packageJson.version}</h1>
                        <p className="text-xl text-slate-300 mb-8">
                            Your AI-powered Fallout 4 modding assistant with next-gen voice conversation
                        </p>
                        <p className="text-slate-400 mb-6">
                            <strong className="text-emerald-400">✨ New in v{packageJson.version}:</strong> Pick your UI language on first launch (or later in Settings), plus a smoother Install Wizard experience.
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
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {[
                                    { value: 'auto', label: t('onboarding.language.auto', 'Auto (system)') },
                                    { value: 'en', label: 'English' },
                                    { value: 'es', label: 'Español' },
                                    { value: 'fr', label: 'Français' },
                                    { value: 'de', label: 'Deutsch' },
                                    { value: 'ru', label: 'Русский' },
                                    { value: 'zh-Hans', label: '中文（简体）' },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={uiLanguage === value}
                                        onClick={() => void applyLanguage(value)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${uiLanguage === value
                                            ? 'bg-emerald-600 border-emerald-500 text-white'
                                            : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700 text-[10px] text-amber-300">
                                ⚠️ <strong>Multi-language in development.</strong> UI language will change, but voice support requires installing Windows voices.
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('version')}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Next <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            aria-label="Go back to edition selection"
                            onClick={() => setStep('edition')}
                            className="mt-4 text-sm text-slate-400 hover:text-slate-200 underline block mx-auto"
                        >
                            ← Back to Edition
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

                {step === 'version' && (
                    <div className="text-center animate-fade-in">
                        <Download className="w-16 h-16 mx-auto mb-6 text-emerald-400" />
                        <h2 className="text-3xl font-bold text-white mb-3">Which Fallout 4 version do you have?</h2>
                        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                            Mossy tailors its advice based on your game version — mod compatibility, F4SE version, and stability tools all depend on this. You can change it later in Settings.
                        </p>

                        {/* Mossy Edition badge — clarifies Universal vs Nvidia up front */}
                        {mossyEdition && (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 ${
                                mossyEdition === 'nvidia'
                                    ? 'bg-green-900/70 border border-green-500 text-green-300'
                                    : 'bg-blue-900/70 border border-blue-500 text-blue-300'
                            }`}>
                                {mossyEdition === 'nvidia' ? <Zap className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                                You have <strong className="ml-1">Mossy {mossyEdition === 'nvidia' ? 'NVIDIA Edition' : 'Universal Edition'}</strong>
                                <span className="ml-1 font-normal opacity-80">
                                    {mossyEdition === 'nvidia'
                                        ? '— CUDA 12.4 · local AI fine-tuning enabled'
                                        : '— CPU PyTorch · works on all hardware'}
                                </span>
                            </div>
                        )}

                        <div className="max-w-lg mx-auto space-y-3 mb-8 text-left">
                            {[
                                {
                                    value: 'og',
                                    label: 'OG — Original Game (1.10.163)',
                                    detail: 'The classic pre-update version. F4SE 0.6.23. Best mod compatibility.',
                                    selectedClass: 'bg-emerald-800 border-emerald-400 text-white',
                                },
                                {
                                    value: 'ng',
                                    label: 'NG — Next-Gen Update (1.10.984)',
                                    detail: 'April 2024 update. F4SE 0.7.x. Requires NG patches for many mods.',
                                    selectedClass: 'bg-blue-800 border-blue-400 text-white',
                                },
                                {
                                    value: 'ae',
                                    label: 'AE / Creations Menu (1.11.x)',
                                    detail: 'November 2025 Bethesda "Anniversary Edition" update. F4SE 0.7.7.',
                                    selectedClass: 'bg-purple-800 border-purple-400 text-white',
                                },
                                {
                                    value: 'unknown',
                                    label: "Not sure — I'll set this later",
                                    detail: 'You can check your game version in Steam or in the Fallout 4 launcher.',
                                    selectedClass: 'bg-slate-600 border-slate-400 text-white',
                                },
                            ].map(({ value, label, detail, selectedClass }) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={fo4Version === value}
                                    onClick={() => {
                                        setFo4Version(value);
                                        try { localStorage.setItem('mossy_fo4_version', value); } catch { /* ignore */ }
                                        // Auto-advance after a brief pause so the user sees the selection highlighted
                                        window.setTimeout(() => startScan(), 500);
                                    }}
                                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors ${
                                        fo4Version === value
                                            ? selectedClass
                                            : 'bg-slate-800/60 border-slate-600 text-slate-200 hover:border-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-sm">{label}</div>
                                        {fo4Version === value && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500">
                                                <Check className="w-3 h-3" /> Selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">{detail}</div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                if (!fo4Version) {
                                    try { localStorage.setItem('mossy_fo4_version', 'unknown'); } catch { /* ignore */ }
                                    setFo4Version('unknown');
                                }
                                startScan();
                            }}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Start System Scan <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('welcome')}
                            className="mt-4 text-sm text-slate-400 hover:text-slate-200 underline block mx-auto"
                        >
                            ← Back
                        </button>
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
                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${userChoices[rec.name] === true
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
                            onClick={() => setStep('downloads')}
                            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            Next: Download Recommended Tools <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {step === 'downloads' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-6">
                            <Download className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Recommended Downloads</h2>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                These tools work with Mossy. Download anything you don't already have — each
                                button opens the official page in your browser. You can skip any of these and
                                grab them later.
                            </p>
                        </div>

                        <div className="space-y-3 mb-6 max-h-[52vh] overflow-y-auto pr-1">
                            {RECOMMENDED_DOWNLOADS.map((dl) => {
                                const alreadyInstalled = allApps.some((app: { displayName?: string; name?: string }) => {
                                    const n = (app.displayName || app.name || '').toLowerCase();
                                    return dl.detectKeywords.some((kw) => n.includes(kw));
                                });

                                const categoryColor: Record<RecommendedDownload['category'], string> = {
                                    'modding': 'text-emerald-400',
                                    'version-control': 'text-blue-400',
                                    'creative': 'text-purple-400',
                                };

                                const categoryLabel: Record<RecommendedDownload['category'], string> = {
                                    'modding': 'Modding Tool',
                                    'version-control': 'Version Control',
                                    'creative': 'Creative',
                                };

                                return (
                                    <div
                                        key={dl.name}
                                        className={`p-4 rounded-lg border transition-all ${alreadyInstalled
                                            ? 'border-emerald-700/50 bg-emerald-900/10'
                                            : dl.required
                                                ? 'border-amber-600/60 bg-amber-900/10'
                                                : 'border-slate-700 bg-slate-800/40'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-white font-bold text-sm">{dl.name}</span>
                                                    {alreadyInstalled && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/40">
                                                            <Check className="w-3 h-3" /> Installed
                                                        </span>
                                                    )}
                                                    {dl.required && !alreadyInstalled && (
                                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/40">
                                                            Recommended
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-medium ${categoryColor[dl.category]}`}>
                                                        {categoryLabel[dl.category]}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed">{dl.description}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {alreadyInstalled ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs font-semibold">
                                                        <Check className="w-3.5 h-3.5" /> Done
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => void openExternal(dl.url)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
                                                        title={`Open ${dl.urlLabel}`}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        {dl.urlLabel}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="rounded-md border border-blue-700/30 bg-blue-900/10 p-3 text-xs text-blue-200 mb-5">
                            <strong>Note:</strong> Mossy never auto-downloads or bundles third-party tools.
                            Each button opens the official download page in your browser so you are always in control.
                            All tools listed here are free and open source (or freeware).
                        </div>

                        <button
                            onClick={finishOnboarding}
                            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" /> Finish Setup
                        </button>
                    </div>
                )}

                {step === 'spriggit-digest' && (
                    <div className="text-center animate-fade-in">
                        <Brain className="w-16 h-16 mx-auto mb-6 text-emerald-400" />
                        <h2 className="text-3xl font-bold text-white mb-3">Feed Me Your Plugins</h2>
                        <p className="text-slate-400 mb-2 max-w-xl mx-auto">
                            I can use <strong className="text-emerald-300">Spriggit</strong> to convert your Fallout 4 plugins (.esp/.esm/.esl) into readable YAML files and then digest all that information directly into my brain, so I know your exact mod load order, records, and data from the start.
                        </p>
                        <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
                            This is optional — you can skip it now and do it later from the Memory Vault panel.
                        </p>

                        {/* .NET Runtime warning — shown when the scan detected it was missing */}
                        {dotnetOk === false && (
                            <div className="max-w-lg mx-auto mb-6 rounded-lg px-4 py-3 text-sm text-left bg-amber-900/30 border border-amber-600/50 text-amber-200">
                                <strong>⚠️ .NET Desktop Runtime not detected.</strong>
                                <br />
                                Spriggit.CLI.exe requires the <strong>.NET Desktop Runtime 6.0 or later</strong> to run.
                                Without it every plugin will fail immediately with exit code 4294967295.
                                <br />
                                <button
                                    type="button"
                                    className="mt-2 underline text-amber-300 hover:text-amber-100 transition-colors"
                                    onClick={() => {
                                        const api = getElectronApi();
                                        if (api?.openExternal) {
                                            void api.openExternal('https://dotnet.microsoft.com/download/dotnet/6.0');
                                        } else {
                                            window.open('https://dotnet.microsoft.com/download/dotnet/6.0', '_blank');
                                        }
                                    }}
                                >
                                    Download .NET Desktop Runtime 6.0 →
                                </button>
                                <span className="ml-2 text-amber-400 text-xs">(you can still continue after installing)</span>
                            </div>
                        )}

                        <div className="max-w-lg mx-auto space-y-4 mb-6 text-left">
                            {/* Spriggit CLI path */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Spriggit.CLI.exe
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={spriggitCliPath}
                                        placeholder="Not selected"
                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const api = getElectronApi();
                                            if (!api?.spriggitPickCli) return;
                                            const p = await api.spriggitPickCli();
                                            if (p) setSpriggitCliPath(p);
                                        }}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 flex items-center gap-1.5 transition-colors"
                                    >
                                        <FolderOpen className="w-4 h-4" /> Browse
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Download from <button type="button" onClick={() => void openExternal('https://github.com/Mutagen-Modding/Spriggit/releases')} className="text-emerald-400 hover:underline">github.com/Mutagen-Modding/Spriggit</button>
                                </p>
                            </div>

                            {/* Fallout 4 Data folder */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Fallout 4 Data Folder
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={spriggitDataPath}
                                        placeholder="Not selected (e.g. C:\Steam\steamapps\common\Fallout 4\Data)"
                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const api = getElectronApi();
                                            if (!api?.pickDirectory) return;
                                            const p = await api.pickDirectory('Select Fallout 4 Data Folder');
                                            if (p) setSpriggitDataPath(p);
                                        }}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 flex items-center gap-1.5 transition-colors"
                                    >
                                        <FolderOpen className="w-4 h-4" /> Browse
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Status message */}
                        {spriggitMessage && (
                            <div className={`max-w-lg mx-auto mb-5 rounded-lg px-4 py-3 text-sm text-left whitespace-pre-line break-words ${
                                spriggitStatus === 'error'
                                    ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                                    : spriggitStatus === 'done'
                                        ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-200'
                                        : 'bg-slate-800/60 border border-slate-600 text-slate-300'
                            }`}>
                                {spriggitStatus === 'running' && <Loader className="w-4 h-4 inline-block animate-spin mr-2" />}
                                {spriggitMessage}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 max-w-lg mx-auto">
                            {spriggitStatus !== 'done' && (
                                <button
                                    type="button"
                                    disabled={spriggitStatus === 'running' || !spriggitCliPath || !spriggitDataPath}
                                    onClick={() => void runSpriggitDigest()}
                                    className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {spriggitStatus === 'running'
                                        ? <><Loader className="w-5 h-5 animate-spin" /> Converting &amp; digesting…</>
                                        : <><Brain className="w-5 h-5" /> Convert &amp; Digest into My Brain</>
                                    }
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleSpriggitContinue}
                                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition-colors"
                            >
                                {spriggitStatus === 'done' ? <><Check className="w-5 h-5 inline-block mr-1" /> Continue</> : 'Skip for now'}
                            </button>
                        </div>
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
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                            <h3 className="text-amber-400 font-bold mb-2 text-sm">⏱️ Response Time — What to Expect</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                After you finish speaking there is typically a <strong className="text-amber-300">30 to 60 second</strong> wait
                                before I start responding. This is normal — I'm processing your speech, thinking through
                                your request, and preparing a thorough answer. Please be patient and don't repeat
                                yourself during this window; I've heard you and I'm working on it!
                            </p>
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
