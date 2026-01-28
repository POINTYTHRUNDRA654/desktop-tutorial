import React, { useEffect, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MossyObserver from './MossyObserver';
import CommandPalette from './CommandPalette';
import TutorialOverlay from './TutorialOverlay';
import SystemBus from './SystemBus';
import MossyOnboarding from './MossyOnboarding';
import ErrorBoundary from './ErrorBoundary';
import PipBoyFrame from './PipBoyFrame';
import PipBoyStartup from './PipBoyStartup';
import { FirstRunOnboarding } from './FirstRunOnboarding';
import UpdateNotifier from './UpdateNotifier';

import { Loader2, Zap } from 'lucide-react';
import { LiveProvider } from './LiveContext';
import { OpenAIVoiceProvider } from './OpenAIVoiceContext';

// --- LAZY LOAD MODULES ---
// This prevents the app from loading ALL code at startup.
// Modules are only loaded when accessed.
const SystemMonitor = React.lazy(() => import('./SystemMonitor'));
const LoadOrderAnalyzer = React.lazy(() => import('./LoadOrderAnalyzer').then(module => ({ default: module.LoadOrderAnalyzer })));
const LoadOrderLab = React.lazy(() => import('./loadOrder/LoadOrderLab').then(module => ({ default: module.LoadOrderLab })));
const ChatInterface = React.lazy(() => import('./ChatInterface'));
const VoiceChat = React.lazy(() => import('./VoiceChat'));
const ImageSuite = React.lazy(() => import('./ImageSuite'));
const TTSPanel = React.lazy(() => import('./TTSPanel'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Workshop = React.lazy(() => import('./Workshop'));
const WorkflowOrchestrator = React.lazy(() => import('./WorkflowOrchestrator'));
const WorkflowRunner = React.lazy(() => import('./WorkflowRunner'));
const Lorekeeper = React.lazy(() => import('./Lorekeeper'));
const Holodeck = React.lazy(() => import('./Holodeck'));
const TheVault = React.lazy(() => import('./TheVault'));
const MossyMemoryVault = React.lazy(() => import('./MossyMemoryVault'));
const NeuralLink = React.lazy(() => import('./NeuralLink'));
const TheNexus = React.lazy(() => import('./TheNexus'));
const TheAssembler = React.lazy(() => import('./TheAssembler'));
const TheAuditor = React.lazy(() => import('./TheAuditor'));
const TheBlueprint = React.lazy(() => import('./TheBlueprint'));
const TheScribe = React.lazy(() => import('./TheScribeEnhanced').then(module => ({ default: module.TheScribe })));
const PrivacySettings = React.lazy(() => import('./PrivacySettings'));
const DiagnosticTools = React.lazy(() => import('./DiagnosticTools'));
const VoiceSettings = React.lazy(() => import('./VoiceSettings'));
const LanguageSettings = React.lazy(() => import('./LanguageSettings'));
const DonationSupport = React.lazy(() => import('./DonationSupport').then(module => ({ default: module.DonationSupport })));
const QuickReference = React.lazy(() => import('./QuickReference').then(module => ({ default: module.QuickReference })));
const KnowledgeSearch = React.lazy(() => import('./KnowledgeSearch'));
const LocalCapabilities = React.lazy(() => import('./LocalCapabilities'));
const ScriptAnalyzer = React.lazy(() => import('./ScriptAnalyzer').then(module => ({ default: module.ScriptAnalyzer })));
const TemplateGenerator = React.lazy(() => import('./TemplateGenerator').then(module => ({ default: module.TemplateGenerator })));
const ExternalToolsSettings = React.lazy(() => import('./ExternalToolsSettings'));
const ToolVerify = React.lazy(() => import('./ToolVerify'));
const CommunityLearning = React.lazy(() => import('./CommunityLearning'));
const BlenderAnimationGuide = React.lazy(() => import('./BlenderAnimationGuide').then(module => ({ default: module.BlenderAnimationGuide })));
const SkeletonReference = React.lazy(() => import('./SkeletonReference').then(module => ({ default: module.SkeletonReference })));
const AnimationValidator = React.lazy(() => import('./AnimationValidator').then(module => ({ default: module.AnimationValidator })));
const CustomRiggingChecklist = React.lazy(() => import('./CustomRiggingChecklist').then(module => ({ default: module.CustomRiggingChecklist })));
const ExportSettingsHelper = React.lazy(() => import('./ExportSettingsHelper').then(module => ({ default: module.ExportSettingsHelper })));
const RiggingMistakesGallery = React.lazy(() => import('./RiggingMistakesGallery').then(module => ({ default: module.RiggingMistakesGallery })));
const PrecombineAndPRPGuide = React.lazy(() => import('./PrecombineAndPRPGuide').then(module => ({ default: module.PrecombineAndPRPGuide })));
const PrecombineChecker = React.lazy(() => import('./PrecombineChecker').then(module => ({ default: module.PrecombineChecker })));
const LeveledListInjectionGuide = React.lazy(() => import('./LeveledListInjectionGuide').then(module => ({ default: module.LeveledListInjectionGuide })));
const QuestModAuthoringGuide = React.lazy(() => import('./QuestModAuthoringGuide').then(module => ({ default: module.QuestModAuthoringGuide })));
const ModProjectManager = React.lazy(() => import('./ModProjectManager'));
const BodyslideGuide = React.lazy(() => import('./BodyslideGuide'));
const SimSettlementsGuide = React.lazy(() => import('./SimSettlementsGuide'));
const SimSettlementsAddonGuide = React.lazy(() => import('./SimSettlementsAddonGuide'));
const SimSettlementsUnitsLoadoutsGuide = React.lazy(() => import('../../components/guides/SimSettlementsUnitsLoadoutsGuide'));
const SimSettlementsAddonToolkitsGuide = React.lazy(() => import('../../components/guides/SimSettlementsAddonToolkitsGuide'));
const PaperScriptGuide = React.lazy(() => import('./PaperScriptGuide'));
const PaperScriptQuickStartGuide = React.lazy(() => import('./PaperScriptQuickStartGuide'));
const PaperScriptFallout4Guide = React.lazy(() => import('./PaperScriptFallout4Guide'));
const HavokGuide = React.lazy(() => import('./HavokGuide'));
const HavokQuickStartGuide = React.lazy(() => import('./HavokQuickStartGuide'));
const HavokFallout4Guide = React.lazy(() => import('./HavokFallout4Guide'));
const InstallWizard = React.lazy(() => import('./InstallWizard'));
const PlatformsHub = React.lazy(() => import('./PlatformsHub'));
const CrashTriageWizard = React.lazy(() => import('./CrashTriageWizard'));
const PackagingReleaseWizard = React.lazy(() => import('./PackagingReleaseWizard'));
const CKQuestDialogueWizard = React.lazy(() => import('./CKQuestDialogueWizard'));
const PRPPatchBuilderWizard = React.lazy(() => import('./PRPPatchBuilderWizard'));
const DuplicateFinder = React.lazy(() => import('./DuplicateFinder'));

// Define window interface for AI Studio helpers & Custom Events
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    aistudio?: any;
  }
  interface WindowEventMap {
    'mossy-control': CustomEvent<{ action: string; payload: any }>;
  }
}

// Controller Component to handle AI Navigation Commands
const NeuralController: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleControl = (e: CustomEvent<{ action: string; payload: any }>) => {
      const { action, payload } = e.detail;
      
      console.log(`[Neural Control] Executing: ${action}`, payload);

      if (action === 'navigate') {
        if (location.pathname !== payload.path) {
          navigate(payload.path);
        }
      }
      
      // Future expansion: 'toggle_sidebar', 'open_modal', etc.
      if (action === 'open_palette') {
        // Trigger command palette keyboard shortcut logic if needed
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      }
    };

    window.addEventListener('mossy-control', handleControl as EventListener);
    return () => window.removeEventListener('mossy-control', handleControl as EventListener);
  }, [navigate, location]);

  return null;
};

const ModuleLoader = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#0a0e0a] text-[#00ff00]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-[#008000] border-t-[#00ff00] animate-spin" style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.5)' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-4 h-4 fill-current animate-pulse" />
        </div>
      </div>
      <span className="text-xs font-mono tracking-widest uppercase animate-pulse" style={{ textShadow: '0 0 5px rgba(0, 255, 0, 0.3)' }}>Loading Module...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const devBuildId = '2026-01-27-1227-debug-probe';
  const [hasBooted, setHasBooted] = useState(() => {
    // Persist boot so we don't show the startup sequence every launch.
    return localStorage.getItem('mossy_has_booted') === 'true';
  });
  const [showFirstRun, setShowFirstRun] = useState(() => {
    // Check if user has completed first-run onboarding
    return localStorage.getItem('mossy_onboarding_complete') !== 'true';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has completed onboarding
    return localStorage.getItem('mossy_onboarding_completed') !== 'true';
  });
  const [debugHash, setDebugHash] = useState(() => window.location.hash || '');
  const [showDevHud, setShowDevHud] = useState(() => {
    if (!import.meta.env.DEV) return false;
    try {
      return localStorage.getItem('mossy_show_dev_hud') === 'true';
    } catch {
      return false;
    }
  });
  const [layoutDebug, setLayoutDebug] = useState(() => ({
    sidebar: 'n/a',
    main: 'n/a',
    sidebarTop: 'n/a',
    mainTop: 'n/a',
    sidebarStyle: 'n/a',
    pipMode: 'n/a',
    probeMidRight: 'n/a',
    probeMainCenter: 'n/a',
  }));
  const [pipToggledAt, setPipToggledAt] = useState('n/a');

  // HashRouter expects a hash; Electron dev start URL may omit it.
  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    setDebugHash(window.location.hash || '');
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('[App][DEV] build:', devBuildId);
    console.log('[App][DEV] location:', window.location.href);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const onHashChange = () => setDebugHash(window.location.hash || '');
    window.addEventListener('hashchange', onHashChange);

    const onKeyDown = (e: KeyboardEvent) => {
      // Dev HUD toggle: Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        if ((e as any).repeat) return;
        e.preventDefault();
        setShowDevHud((prev) => {
          const next = !prev;
          try {
            localStorage.setItem('mossy_show_dev_hud', next ? 'true' : 'false');
          } catch {
            // ignore
          }
          return next;
        });
        return;
      }

      if (e.key === 'F8') {
        if ((e as any).repeat) return;
        e.preventDefault();
        const next = !document.body.classList.contains('pip-boy-mode');
        document.body.classList.toggle('pip-boy-mode', next);
        try {
          localStorage.setItem('mossy_pip_mode', next ? 'true' : 'false');
        } catch {
          // ignore
        }
        setPipToggledAt(new Date().toLocaleTimeString());
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!showDevHud) return;

    const tick = () => {
      const sidebarEl = document.querySelector('[data-mossy-sidebar="1"]') as HTMLElement | null;
      const mainEl = document.querySelector('[data-mossy-main="1"]') as HTMLElement | null;

      const sidebarRect = sidebarEl?.getBoundingClientRect();
      const mainRect = mainEl?.getBoundingClientRect();

      const fmt = (r?: DOMRect) => (r ? `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}` : 'missing');

      const topAt = (r?: DOMRect) => {
        if (!r) return 'missing';
        const x = Math.max(0, Math.min(window.innerWidth - 1, r.left + 12));
        const y = Math.max(0, Math.min(window.innerHeight - 1, r.top + 12));
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        if (!el) return 'none';
        const cls = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
        const inSidebar = !!el.closest('[data-mossy-sidebar="1"]');
        const inMain = !!el.closest('[data-mossy-main="1"]');
        const where = inSidebar ? 'inSidebar' : inMain ? 'inMain' : 'other';
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} (${where})`;
      };

      const styleSummary = (el: HTMLElement | null) => {
        if (!el) return 'missing';
        const cs = window.getComputedStyle(el);
        return `disp=${cs.display} vis=${cs.visibility} op=${cs.opacity} bg=${cs.backgroundColor} z=${cs.zIndex}`;
      };

      const probeAt = (x: number, y: number) => {
        const xx = Math.max(0, Math.min(window.innerWidth - 1, Math.round(x)));
        const yy = Math.max(0, Math.min(window.innerHeight - 1, Math.round(y)));
        const el = document.elementFromPoint(xx, yy) as HTMLElement | null;
        if (!el) return 'none';
        const cls = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
        const cs = window.getComputedStyle(el);
        const bgImg = (cs.backgroundImage || 'none').replace(/\s+/g, ' ');
        const bg = cs.backgroundColor || '';
        const pe = cs.pointerEvents || '';
        const z = cs.zIndex || '';
        const r = el.getBoundingClientRect();
        const size = `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`;
        const imgSrc = (el instanceof HTMLImageElement)
          ? ` src=${(el.currentSrc || el.src || '').slice(0, 140)}`
          : '';
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${imgSrc} rect=${size} bgImg=${bgImg} bg=${bg} pe=${pe} z=${z}`;
      };

      setLayoutDebug({
        sidebar: fmt(sidebarRect),
        main: fmt(mainRect),
        sidebarTop: topAt(sidebarRect),
        mainTop: topAt(mainRect),
        sidebarStyle: styleSummary(sidebarEl),
        pipMode: document.body.classList.contains('pip-boy-mode') ? 'true' : 'false',
        probeMidRight: probeAt(window.innerWidth - 140, window.innerHeight * 0.62),
        probeMainCenter: mainRect ? probeAt(mainRect.left + mainRect.width * 0.55, mainRect.top + mainRect.height * 0.55) : 'missing',
      });
    };

    tick();
    const interval = window.setInterval(tick, 750);

    return () => {
      window.clearInterval(interval);
    };
  }, [showDevHud]);

  // One-time migration: older installs used only mossy_onboarding_complete.
  // If that's set, skip the newer MossyOnboarding gate as well.
  useEffect(() => {
    const firstRunComplete = localStorage.getItem('mossy_onboarding_complete') === 'true';
    const onboardingComplete = localStorage.getItem('mossy_onboarding_completed') === 'true';
    if (firstRunComplete && !onboardingComplete) {
      localStorage.setItem('mossy_onboarding_completed', 'true');
      setShowOnboarding(false);
    }
  }, []);

  // Reset to first-run state (useful for testing)
  const resetToFirstRun = () => {
    localStorage.removeItem('mossy_has_booted');
    localStorage.removeItem('mossy_onboarding_complete');
    localStorage.removeItem('mossy_onboarding_completed');
    localStorage.removeItem('mossy_all_detected_apps');
    localStorage.removeItem('mossy_scan_summary');
    localStorage.removeItem('mossy_tool_preferences');
    localStorage.removeItem('mossy_integrated_tools');
    localStorage.removeItem('mossy_last_scan');
    setHasBooted(false);
    setShowFirstRun(true);
    setHasBooted(true);
  };

  // Expose reset function globally for testing
  React.useEffect(() => {
    (window as any).__resetMossyOnboarding = resetToFirstRun;
  }, []);

  // Ensure API Key selection for paid features (Veo/Pro Image) if applicable
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          try {
             await window.aistudio.openSelectKey();
          } catch (e) {
             console.log("User dismissed key selection");
          }
        }
      }
    };
    checkKey();
  }, []);

  // Debug: Check if Electron API is available on app start
  React.useEffect(() => {
    console.log('[App] Checking Electron API availability...');
    console.log('[App] window.electron exists?', !!window.electron);
    console.log('[App] window.electron.api exists?', !!window.electron?.api);
    console.log('[App] window.electron.api.getSystemInfo exists?', !!window.electron?.api?.getSystemInfo);
    if (typeof (window as any).electron?.api?.getSystemInfo === 'function') {
      console.log('[App] ✓ Electron hardware detection API is available');
    } else {
      console.warn('[App] ⚠️ Electron API not available - running in web mode or preload failed');
    }
  }, []);

  // Dev-only: capture uncaught errors with stack traces.
  // This helps pinpoint issues that Electron logs as "source: (0)".
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;

    const onError = (event: ErrorEvent) => {
      const stack = (event.error && (event.error as any).stack) ? String((event.error as any).stack) : '';
      console.error('[App] Uncaught error:', event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno, stack });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      const stack = reason && reason.stack ? String(reason.stack) : '';
      console.error('[App] Unhandled rejection:', reason, { stack });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  // Determine what to display based on state
  const renderAppContent = () => {
    if (!hasBooted) {
      return (
        <PipBoyStartup
          onComplete={() => {
            localStorage.setItem('mossy_has_booted', 'true');
            setHasBooted(true);
          }}
        />
      );
    }

    if (showFirstRun) {
      return (
        <FirstRunOnboarding 
          onComplete={() => {
            setShowFirstRun(false);
          }} 
        />
      );
    }

    if (showOnboarding) {
      return (
        <MossyOnboarding 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('mossy_onboarding_completed', 'true');
          }}
        />
      );
    }

    return (
      <HashRouter>
        <div
          className="flex h-full w-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)',
            color: '#00ff00',
            // Layout fail-safe (prevents sidebar disappearing if utility CSS is missing/overridden)
            display: 'flex',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <NeuralController />
          <CommandPalette />
          <TutorialOverlay />
          <SystemBus />
          <Sidebar />
          <main
            data-mossy-main="1"
            className="flex-1 relative overflow-y-auto overflow-x-hidden"
            style={{
              background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)',
              // Layout fail-safe
              flex: '1 1 auto',
              minWidth: 0,
              outline: import.meta.env.DEV ? '2px solid rgba(0,255,255,0.8)' : undefined,
            }}
          >
            <MossyObserver />
            <Suspense fallback={<ModuleLoader />}>
              <Routes>
                <Route path="/" element={<ErrorBoundary><TheNexus /></ErrorBoundary>} />
                <Route path="/monitor" element={<SystemMonitor />} />
                <Route
                  path="/load-order"
                  element={import.meta.env.VITE_ENABLE_LOAD_ORDER_LAB === 'true'
                    ? <ErrorBoundary><LoadOrderLab /></ErrorBoundary>
                    : <ErrorBoundary><LoadOrderAnalyzer /></ErrorBoundary>
                  }
                />
                <Route path="/chat" element={<ErrorBoundary><ChatInterface /></ErrorBoundary>} />
                <Route path="/assembler" element={<TheAssembler />} />
                <Route path="/auditor" element={<TheAuditor />} />
                <Route path="/blueprint" element={<TheBlueprint />} />
                <Route path="/scribe" element={<TheScribe />} />
                <Route path="/orchestrator" element={<WorkflowOrchestrator />} />
                <Route path="/workflow-runner" element={<ErrorBoundary><WorkflowRunner /></ErrorBoundary>} />
                <Route path="/lore" element={<Lorekeeper />} />
                <Route path="/holo" element={<Holodeck />} />
                <Route path="/vault" element={<ErrorBoundary><TheVault /></ErrorBoundary>} />
                <Route path="/memory-vault" element={<ErrorBoundary><MossyMemoryVault /></ErrorBoundary>} />
                <Route path="/neural-link" element={<NeuralLink />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/live" element={<ErrorBoundary><VoiceChat /></ErrorBoundary>} />
                <Route path="/images" element={<ImageSuite />} />
                <Route path="/tts" element={<TTSPanel />} />
                <Route path="/bridge" element={<DesktopBridge />} />
                <Route path="/dedupe" element={<ErrorBoundary><DuplicateFinder /></ErrorBoundary>} />
                <Route path="/settings/privacy" element={<PrivacySettings />} />
                <Route path="/settings/voice" element={<VoiceSettings />} />
                <Route path="/settings/language" element={<LanguageSettings />} />
                <Route path="/diagnostics" element={<DiagnosticTools />} />
                <Route path="/settings/tools" element={<ExternalToolsSettings />} />
                <Route path="/tool-verify" element={<ErrorBoundary><ToolVerify /></ErrorBoundary>} />
                <Route path="/community" element={<CommunityLearning />} />
                <Route path="/support" element={<DonationSupport />} />
                <Route path="/reference" element={<QuickReference />} />
                  <Route path="/knowledge" element={<ErrorBoundary><KnowledgeSearch /></ErrorBoundary>} />
                <Route path="/capabilities" element={<ErrorBoundary><LocalCapabilities /></ErrorBoundary>} />
                <Route path="/script-analyzer" element={<ScriptAnalyzer />} />
                <Route path="/template-generator" element={<TemplateGenerator />} />

                <Route path="/install-wizard" element={<ErrorBoundary><InstallWizard /></ErrorBoundary>} />
                <Route path="/platforms" element={<ErrorBoundary><PlatformsHub /></ErrorBoundary>} />
                <Route path="/crash-triage" element={<ErrorBoundary><CrashTriageWizard /></ErrorBoundary>} />
                <Route path="/packaging-release" element={<ErrorBoundary><PackagingReleaseWizard /></ErrorBoundary>} />
                <Route path="/ck-quest-dialogue" element={<ErrorBoundary><CKQuestDialogueWizard /></ErrorBoundary>} />
                <Route path="/prp-patch-builder" element={<ErrorBoundary><PRPPatchBuilderWizard /></ErrorBoundary>} />

                <Route path="/animation-guide" element={<BlenderAnimationGuide />} />
                <Route path="/skeleton-reference" element={<SkeletonReference />} />
                <Route path="/animation-validator" element={<AnimationValidator />} />
                <Route path="/rigging-checklist" element={<CustomRiggingChecklist />} />
                <Route path="/export-settings" element={<ExportSettingsHelper />} />
                <Route path="/rigging-mistakes" element={<RiggingMistakesGallery />} />
                <Route path="/precombine-prp" element={<PrecombineAndPRPGuide />} />
                <Route path="/precombine-checker" element={<PrecombineChecker />} />
                <Route path="/leveled-list-injection" element={<LeveledListInjectionGuide />} />
                <Route path="/quest-mod-authoring-guide" element={<QuestModAuthoringGuide />} />
                <Route path="/quest-authoring" element={<QuestModAuthoringGuide />} />
                <Route path="/journey" element={<ModProjectManager />} />
                <Route path="/bodyslide" element={<BodyslideGuide />} />
                <Route path="/sim-settlements" element={<SimSettlementsGuide />} />
                <Route path="/sim-settlements-addon" element={<SimSettlementsAddonGuide />} />
                <Route path="/sim-settlements-units-loadouts" element={<SimSettlementsUnitsLoadoutsGuide />} />
                <Route path="/sim-settlements-addon-toolkits" element={<SimSettlementsAddonToolkitsGuide />} />
                <Route path="/paperscript" element={<PaperScriptGuide />} />
                <Route path="/paperscript-quick-start" element={<PaperScriptQuickStartGuide />} />
                <Route path="/paperscript-fo4" element={<PaperScriptFallout4Guide />} />
                <Route path="/havok" element={<HavokGuide />} />
                <Route path="/havok-quick-start" element={<HavokQuickStartGuide />} />
                <Route path="/havok-fo4" element={<HavokFallout4Guide />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </HashRouter>
    );
  };

  return (
    <ErrorBoundary>
      <LiveProvider>
        <OpenAIVoiceProvider>
          <PipBoyFrame>
            {import.meta.env.DEV && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevHud((prev) => {
                      const next = !prev;
                      try {
                        localStorage.setItem('mossy_show_dev_hud', next ? 'true' : 'false');
                      } catch {
                        // ignore
                      }
                      return next;
                    });
                  }}
                  title={showDevHud ? 'Hide Debug HUD (Ctrl+Shift+D)' : 'Show Debug HUD (Ctrl+Shift+D)'}
                  style={{
                    position: 'fixed',
                    top: 10,
                    left: 10,
                    zIndex: 20001,
                    background: 'rgba(0,0,0,0.85)',
                    border: '1px solid rgba(0,255,0,0.35)',
                    color: '#9aff9a',
                    padding: '4px 8px',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  DBG
                </button>

                {showDevHud && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 42,
                      left: 10,
                      zIndex: 20000,
                      width: 520,
                      maxWidth: 'calc(100vw - 20px)',
                      maxHeight: 'calc(100vh - 60px)',
                      overflow: 'auto',
                      background: 'rgba(0,0,0,0.80)',
                      border: '1px solid rgba(0,255,0,0.35)',
                      color: '#9aff9a',
                      padding: '8px 10px',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                      borderRadius: 8,
                      pointerEvents: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ opacity: 0.85 }}>Debug HUD (Ctrl+Shift+D)</div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDevHud(false);
                          try {
                            localStorage.setItem('mossy_show_dev_hud', 'false');
                          } catch {
                            // ignore
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(0,255,0,0.35)',
                          color: '#9aff9a',
                          borderRadius: 8,
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <div>build: {devBuildId}</div>
                    <div>href: {window.location.href}</div>
                    <div>hash: {debugHash || '(none)'}</div>
                    <div>booted: {String(hasBooted)}</div>
                    <div>firstRun: {String(showFirstRun)}</div>
                    <div>onboarding: {String(showOnboarding)}</div>
                    <div>sidebar: {layoutDebug.sidebar}</div>
                    <div>main: {layoutDebug.main}</div>
                    <div>top@sidebar: {layoutDebug.sidebarTop}</div>
                    <div>top@main: {layoutDebug.mainTop}</div>
                    <div>sidebarStyle: {layoutDebug.sidebarStyle}</div>
                    <div>pipMode(F8): {layoutDebug.pipMode}</div>
                    <div>probe(mid-right): {layoutDebug.probeMidRight}</div>
                    <div>probe(main-center): {layoutDebug.probeMainCenter}</div>
                    <div>pipToggleAt: {pipToggledAt}</div>
                  </div>
                )}
              </>
            )}
            {renderAppContent()}
          </PipBoyFrame>
          <UpdateNotifier />
        </OpenAIVoiceProvider>
      </LiveProvider>
    </ErrorBoundary>
  );
};

export default App;