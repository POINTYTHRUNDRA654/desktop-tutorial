import React, { useEffect, Suspense, useState } from 'react';
import packageJson from '../../../package.json';
import { HashRouter, MemoryRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { VoiceSetupWizard } from './VoiceSetupWizard';
import GuidedTour from './GuidedTour';
import InteractiveTutorial from './InteractiveTutorial';
import TutorialLaunch from './TutorialLaunch';
import { NotificationProvider } from './NotificationContext';
import AutoUpdateNotifier from './components/AutoUpdateNotifier';
import { ensureBrowserTtsSettingsStored } from './browserTts';
import toast from 'react-hot-toast';

import { Command, Loader2, MessageSquare, Radio, Zap } from 'lucide-react';
import KeepAlivePanel from './KeepAlivePanel';
import AvatarOverlay from './AvatarOverlay';
import { LiveProvider } from './LiveContext';
import { OpenAIVoiceProvider } from './OpenAIVoiceContext';
import { ModProject } from '../../shared/types';
import AvatarCore from './AvatarCore';

// Import Quick Wins components
import { GlobalSearch } from './GlobalSearch';
import { useWhatsNew } from './WhatsNewDialog';
import WhatsNewPage from './WhatsNewPage';
import { backupCriticalProgressToDisk, restoreMissingCriticalProgress } from './services/criticalProgressBackup';


// Import new performance & reliability managers
import { cacheManager } from './CacheManager';
import { workerManager } from './WorkerManager';
import { autoSaveManager } from './AutoSaveManager';

// Import new AI & intelligence services
import { contextAwareAIService } from './ContextAwareAIService';
import { getWorkflowAutomationService } from './WorkflowAutomationService';
import { getPluginSystemService } from './PluginSystemService';
import { WorkflowAutomationService } from './WorkflowAutomationService';
import { PluginSystemService } from './PluginSystemService';
import './bridges'; // registers all bridges on startup

// --- LAZY LOAD MODULES ---
// This prevents the app from loading ALL code at startup.
// Modules are only loaded when accessed.
const LoadOrderHub = React.lazy(() => import('./LoadOrderHub'));
const ChatInterface = React.lazy(() => import('./ChatInterface'));
const VoiceChat = React.lazy(() => import('./VoiceChat'));
const FirstSuccessWizard = React.lazy(() => import('./FirstSuccessWizard'));
const ImageSuite = React.lazy(() => import('./ImageSuite'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Workshop = React.lazy(() => import('./Workshop'));
const WorkflowOrchestrator = React.lazy(() => import('./WorkflowOrchestrator'));
const WorkflowRunner = React.lazy(() => import('./WorkflowRunner'));
const Holodeck = React.lazy(() => import('./Holodeck'));
const TheVault = React.lazy(() => import('./TheVault'));
const TheNexus = React.lazy(() => import('./TheNexus'));
const SecurityValidator = React.lazy(() => import('./SecurityValidator'));
const TheBlueprint = React.lazy(() => import('./TheBlueprint'));
const TheScribe = React.lazy(() => import('./TheScribeEnhanced').then(module => ({ default: module.TheScribe })));
const DonationSupport = React.lazy(() => import('./DonationSupport').then(module => ({ default: module.DonationSupport })));
const DevtoolsHub = React.lazy(() => import('./DevtoolsHub'));
const CosmosWorkflow = React.lazy(() => import('./CosmosWorkflow'));
const LearningHub = React.lazy(() => import('./LearningHub'));
const CommunityLearning = React.lazy(() => import('./CommunityLearning'));
const SettingsHub = React.lazy(() => import('./SettingsHub'));
// Mod browser UI
const ModBrowser = React.lazy(() => import('./ModBrowser'));
const BlenderAnimationGuide = React.lazy(() => import('./BlenderAnimationGuide').then(module => ({ default: module.BlenderAnimationGuide })));
const QuestModAuthoringGuide = React.lazy(() => import('./QuestModAuthoringGuide').then(module => ({ default: module.QuestModAuthoringGuide })));
const ProjectHub = React.lazy(() => import('./ProjectHub'));
const BodyslideGuide = React.lazy(() => import('./BodyslideGuide'));
const SimSettlementsGuide = React.lazy(() => import('./SimSettlementsGuide'));
const PaperScriptGuide = React.lazy(() => import('./PaperScriptGuide'));

// Knowledge & Learning Components
const QuickReference = React.lazy(() => import('./QuickReference').then(module => ({ default: module.QuickReference })));
const KnowledgeSearch = React.lazy(() => import('./KnowledgeSearch'));
const Lorekeeper = React.lazy(() => import('./Lorekeeper'));
const LocalCapabilities = React.lazy(() => import('./LocalCapabilities'));

// Tool extensions (lazy-loaded named exports mapped to default for React.lazy)
const MO2Extension = React.lazy(() => import('./MO2Extension').then(module => ({ default: module.MO2Extension })));
const ComfyUIExtension = React.lazy(() => import('./ComfyUIExtension').then(module => ({ default: module.ComfyUIExtension })));
const UpscaylExtension = React.lazy(() => import('./UpscaylExtension').then(module => ({ default: module.UpscaylExtension })));

// INI Configuration Manager
const IniConfigManager = React.lazy(() => import('./IniConfigManager'));
const AssetDeduplicator = React.lazy(() => import('./AssetDeduplicator'));

// New Power Tools (Features 3-10)
const GameLogMonitor = React.lazy(() => import('./GameLogMonitor'));
const XEditTools = React.lazy(() => import('./XEditTools'));
const ProjectTemplates = React.lazy(() => import('./ProjectTemplates'));
const ModConflictVisualizer = React.lazy(() => import('./ModConflictVisualizer'));
const FormIdRemapper = React.lazy(() => import('./FormIdRemapper'));
const ModComparisonTool = React.lazy(() => import('./ModComparisonTool'));
const PrecombineGenerator = React.lazy(() => import('./PrecombineGenerator'));
const VoiceCommands = React.lazy(() => import('./VoiceCommands'));
const AutomationManager = React.lazy(() => import('./AutomationManager'));

// AI & Intelligence Features
const AIAssistant = React.lazy(() => import('./AIAssistant'));
const AIModAssistant = React.lazy(() => import('./AIModAssistant'));
const CloudSync = React.lazy(() => import('./CloudSync'));
const WorkflowRecorder = React.lazy(() => import('./WorkflowRecorder').then(module => ({ default: module.WorkflowRecorder })));
const PluginManager = React.lazy(() => import('./PluginManager').then(module => ({ default: module.PluginManager })));
const RoadmapPanel = React.lazy(() => import('./RoadmapPanel'));
const DiagnosticsHub = React.lazy(() => import('./DiagnosticsHub'));
const PackagingHub = React.lazy(() => import('./PackagingHub'));
const TheAssembler = React.lazy(() => import('./TheAssembler'));
const WizardsHub = React.lazy(() => import('./WizardsHub'));

// Archive Management
const BA2Manager = React.lazy(() => import('./BA2Manager').then(module => ({ default: module.BA2Manager })));

// Advanced Features
const ProjectSelector = React.lazy(() => import('./ProjectSelector').then(module => ({ default: module.ProjectSelector })));

// Mining Infrastructure
const MiningHub = React.lazy(() => import('./MiningHub'));
const MiningPanel = React.lazy(() => import('./MiningPanel').then(module => ({ default: module.MiningPanel })));
const AdvancedAnalysisPanel = React.lazy(() => import('./AdvancedAnalysisPanel').then(module => ({ default: module.AdvancedAnalysisPanel })));

// Mining Infrastructure

// CK Tools
const CKExtension = React.lazy(() => import('./CKExtension').then(module => ({ default: module.CKExtension })));

// Knowledge & Memory
const MossyMemoryVault = React.lazy(() => import('./MossyMemoryVault'));
const CKCrashPrevention = React.lazy(() => import('./CKCrashPrevention'));

/** Delay (ms) before navigating to the post-onboarding route (lets the overlay finish closing). */
const POST_ONBOARDING_NAV_DELAY_MS = 150;
const DDSConverter = React.lazy(() => import('./DDSConverter').then(module => ({ default: module.DDSConverter })));
const TextureGenerator = React.lazy(() => import('./TextureGenerator').then(module => ({ default: module.TextureGenerator })));

// Test Components
const NotificationTest = React.lazy(() => import('./NotificationTest'));

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

/**
 * Set of all paths that are served by KeepAlivePanel entries. The Routes catch-all
 * uses this to distinguish "panel not yet visible" from "truly unknown route".
 */
const KEEP_ALIVE_PATHS = new Set([
  '/', '/chat', '/ai-assistant', '/ai-mod-assistant', '/cloud-sync', '/first-success',
  '/roadmap', '/live', '/tools', '/tools/ini-config', '/tools/asset-deduplicator',
  '/tools/log-monitor', '/tools/xedit', '/tools/ck-extension', '/tools/project-templates',
  '/tools/formid-remapper', '/tools/precombine-generator', '/tools/voice-commands',
  '/tools/automation', '/tools/ck-crash-prevention', '/tools/security', '/tools/mining',
  '/tools/advanced-analysis', '/tools/blueprint', '/tools/scribe', '/tools/vault',
  '/tools/ba2-manager', '/tools/cosmos', '/dev', '/dev/workshop', '/mods',
  '/dev/orchestrator', '/dev/workflow-runner', '/dev/workflow-recorder',
  '/dev/plugin-manager', '/dev/load-order', '/media', '/media/images', '/test',
  '/test/holo', '/test/notification-test', '/test/bridge', '/learn', '/reference',
  '/knowledge', '/lore', '/memory-vault', '/ck-crash-prevention', '/dds-converter',
  '/texture-generator', '/guides', '/guides/blender', '/guides/blender/animation',
  '/guides/creation-kit', '/guides/creation-kit/quest-authoring', '/guides/papyrus/guide',
  '/guides/physics', '/guides/mods', '/guides/mods/bodyslide', '/guides/mods/sim-settlements',
  '/wizards', '/devtools', '/settings', '/project', '/support', '/assembler', '/diagnostics',
  '/community', '/capabilities', '/packaging-release', '/extensions/mo2',
  '/extensions/comfyui', '/extensions/upscayl',
  // Special routes rendered directly inside <Routes>
  '/tutorial', '/whats-new',
]);

/**
 * Shown by the Routes catch-all only for paths that are not handled by either a
 * redirect route or a KeepAlivePanel. Valid panel paths should never hit this.
 */
const RouteNotFound: React.FC = () => {
  const location = useLocation();
  // Content-panel routes are rendered by KeepAlivePanel outside <Routes>.
  // Return null here so they're not blocked by the catch-all.
  if (KEEP_ALIVE_PATHS.has(location.pathname)) return null;
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <div className="text-5xl font-mono">404</div>
      <div className="text-sm font-mono">Page not found — <code>{location.pathname}</code></div>
    </div>
  );
};

const WhatsNewRedirect: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = React.useRef(false);

  useEffect(() => {
    // Only perform a one-time redirect while the notice is enabled to avoid trapping
    if (!enabled || location.pathname === '/whats-new' || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    navigate('/whats-new', { replace: true, state: { from: location.pathname } });
  }, [enabled, location.pathname, navigate]);

  // Reset guard when the notice is dismissed so it can run on next session if needed
  useEffect(() => {
    if (!enabled) hasRedirectedRef.current = false;
  }, [enabled]);

  return null;
};

// Floating "Ask Mossy" button — available on every panel except /chat itself
const AskMossyButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/chat') return null;

  const handleClick = () => {
    const panelName = location.pathname.replace(/^\//, '').replace(/-/g, ' ') || 'home';
    navigate('/chat', {
      state: { prefill: `I'm currently on the ${panelName} panel. Can you help me with what I'm working on here?` }
    });
  };

  return (
    <button
      onClick={handleClick}
      title="Ask Mossy about this panel"
      aria-label="Ask Mossy"
      style={{
        position: 'fixed',
        bottom: 60, // above the Pip-Boy toggle button (bottom: 16 + ~40px height)
        left: 8,
        zIndex: 9990,
      }}
      className="flex items-center gap-2 px-4 py-2 bg-green-700/90 hover:bg-green-600 text-white text-sm font-bold rounded-full shadow-lg border border-green-500/50 transition-all focus-visible"
    >
      <MessageSquare className="w-4 h-4" />
      Ask Mossy
    </button>
  );
};

const App: React.FC = () => {
  const devBuildId = '2026-01-27-1227-debug-probe';

  // Debug: log test mode detection and initial URL for E2E troubleshooting
  useEffect(() => {
    console.log('[App] initial URL', window.location.href);
    console.log('[App] location.search', window.location.search);
    console.log('[App] test mode checks', {
      urlHasTest: window.location.search.includes('test'),
      localStorageTestMode: window.localStorage.getItem('mossy_test_mode'),
      localStorageBooted: window.localStorage.getItem('mossy_has_booted'),
    });
  }, []);
  // ── Synchronous fresh-install detection ─────────────────────────────────
  // When the main process detects a fresh install (marker file or no settings.json)
  // it loads the renderer with ?freshInstall=true in the URL.  This useState
  // initialiser runs before all other state hooks so it can clear stale
  // onboarding localStorage flags before they are read.  This avoids the race
  // condition of the IPC-based TRIGGER_FRESH_INSTALL approach.
  //
  // Note: mossy_has_booted is intentionally NOT cleared here so that returning
  // users (reinstalls) skip the PipBoy boot animation.
  const [freshInstallDetected] = useState(() => {
    try {
      if (!new URLSearchParams(window.location.search).has('freshInstall')) return false;

      // Check if user already completed onboarding in a previous install
      const userCompletedOnboardingBefore = localStorage.getItem('mossy_onboarding_completed') === 'true';

      if (userCompletedOnboardingBefore) {
        // User already did onboarding - only clear UI flags, preserve all data
        console.log('[App] Fresh install detected but onboarding was already completed. Preserving all user data.');
        const uiFlagsOnly = [
          'mossy_tutorial_completed',
          'mossy_tutorial_autostart',
          'mossy_tutorial_skipped',
          'mossy_tutorial_step',
        ];
        uiFlagsOnly.forEach(k => localStorage.removeItem(k));
        // Keep scan data and onboarding completion state intact
      } else {
        // First time user - clear onboarding flags but preserve any existing scan data
        // (in case they ran the app before but didn't complete onboarding)
        console.log('[App] Fresh install for new user. Clearing onboarding flags.');
        const onboardingFlags = [
          'mossy_onboarding_complete',
          'mossy_onboarding_completed',
          'mossy_tutorial_completed',
          'mossy_tutorial_autostart',
          'mossy_voice_setup_complete',
        ];
        onboardingFlags.forEach(k => localStorage.removeItem(k));
        // NOTE: We do NOT clear mossy_scan_summary or mossy_all_detected_apps
        // so if they previously scanned, they don't have to scan again
      }
      return true;
    } catch {
      return false;
    }
  });

  const [hasBooted, setHasBooted] = useState(() => {
    // Skip boot sequence in test mode - check multiple sources
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test') ||
      window.location.search.includes('test') ||
      window.localStorage.getItem('mossy_test_mode') === 'true' ||
      window.localStorage.getItem('mossy_has_booted') === 'true') {
      return true;
    }
    // Persist boot so we don't show the startup sequence every launch.
    return localStorage.getItem('mossy_has_booted') === 'true';
  });

  // expose readiness flag for tests whenever we boot
  useEffect(() => {
    if (hasBooted) {
      try {
        (window as any).__MOSSY_TEST_READY__ = true;
      } catch { /* ignore */ }
    }
  }, [hasBooted]);

  // ── PyTorch auto-setup progress listener ──────────────────────────────────
  // The main process runs a background PyTorch install on first launch and
  // sends progress events. We display them as toast notifications so the user
  // always knows what is happening without needing to open Settings.
  useEffect(() => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.onFreshInstall) return;

    const unsubscribe = api.onFreshInstall(() => {
      // A fresh-install.marker was found by the main process, meaning the user
      // just installed (or reinstalled) via the NSIS installer.  IMPORTANT: if the
      // user has ALREADY completed onboarding in a previous install, preserve ALL
      // user data including scan results, program selections, and downloaded tools.
      // Chat history, projects, and other user data are always preserved.
      const userCompletedOnboardingBefore = localStorage.getItem('mossy_onboarding_completed') === 'true';

      if (userCompletedOnboardingBefore) {
        // User already completed onboarding - preserve EVERYTHING including scan data
        console.log('[App] Fresh install detected. User ALREADY completed onboarding in a previous install.');
        console.log('[App] Preserving ALL user data: scan results, program selections, downloads, chat history, projects.');

        // Only clear tutorial progress flags (user can restart tutorial if they want)
        const tutorialFlagsOnly = [
          'mossy_tutorial_completed',
          'mossy_tutorial_autostart',
          'mossy_tutorial_skipped',
          'mossy_tutorial_step',
        ];
        tutorialFlagsOnly.forEach(k => localStorage.removeItem(k));

        // Keep scan data, onboarding completion, and all other user data intact
        // Mark as booted so we skip the startup sequence
        try {
          localStorage.setItem('mossy_has_booted', 'true');
        } catch { /* ignore */ }
      } else {
        // First time user - clear onboarding flags but preserve any existing scan data
        console.log('[App] Fresh install detected. User has NOT completed onboarding before.');
        console.log('[App] Preserving any existing scan data so user doesn\'t have to re-scan if they already did.');

        const onboardingKeysToReset = [
          'mossy_has_booted',
          'mossy_onboarding_complete',
          'mossy_onboarding_completed',
          'mossy_voice_setup_complete',
          'mossy_tutorial_completed',
          'mossy_tutorial_autostart',
          'mossy_tutorial_skipped',
          'mossy_tutorial_step',
        ];
        onboardingKeysToReset.forEach(k => localStorage.removeItem(k));

        // NOTE: We intentionally do NOT clear these keys so scan data persists:
        // - mossy_scan_summary (program detection results)
        // - mossy_all_detected_apps (full list of detected programs)
        // - any selected program paths or download selections

        setShowFirstRun(true);
        setShowOnboarding(true);
      }

      console.log('[App] Fresh install: user data preserved. Only UI state flags cleared.');
      setShowVoiceSetup(false);
    });

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.onPytorchSetupProgress) return;

    let loadingToastId: string | null = null;

    const unsubscribe = api.onPytorchSetupProgress((data: { message: string }) => {
      const msg = data?.message || '';
      if (msg.startsWith('✅')) {
        if (loadingToastId) { toast.dismiss(loadingToastId); loadingToastId = null; }
        toast.success(msg, { duration: 6000, id: 'pytorch-setup' });
      } else if (msg.startsWith('❌')) {
        if (loadingToastId) { toast.dismiss(loadingToastId); loadingToastId = null; }
        toast.error(msg, { duration: 10000, id: 'pytorch-setup' });
      } else if (msg.startsWith('⚠️')) {
        if (loadingToastId) { toast.dismiss(loadingToastId); loadingToastId = null; }
        toast(msg, { duration: 8000, id: 'pytorch-setup', icon: '⚠️' });
      } else {
        // Progress update — show/update a loading toast
        if (loadingToastId) {
          toast.loading(msg, { id: loadingToastId });
        } else {
          loadingToastId = toast.loading(msg, { id: 'pytorch-setup-loading' });
        }
      }
    });

    // Signal to the main process that the renderer is ready so it can start
    // the background auto-install immediately (instead of waiting for the fallback timeout).
    api.notifyPytorchRendererReady?.();

    return () => {
      unsubscribe?.();
      if (loadingToastId) toast.dismiss(loadingToastId);
    };
  }, []);
  const [showFirstRun, setShowFirstRun] = useState(() => {
    // Check if user has completed first-run onboarding
    return localStorage.getItem('mossy_onboarding_complete') !== 'true';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has completed onboarding
    return localStorage.getItem('mossy_onboarding_completed') !== 'true';
  });
  const [showVoiceSetup, setShowVoiceSetup] = useState(() => {
    // Check if user has completed voice setup (only after first run onboarding)
    const hasCompletedFirstRun = localStorage.getItem('mossy_onboarding_completed') === 'true';
    const hasCompletedVoiceSetup = localStorage.getItem('mossy_voice_setup_complete') === 'true';
    return hasCompletedFirstRun && !hasCompletedVoiceSetup;
  });

  // Tutorial state
  const [showTutorialLaunch, setShowTutorialLaunch] = useState(false);
  const [showInteractiveTutorialOverlay, setShowInteractiveTutorialOverlay] = useState(false);
  const getTutorialReturnHash = () => {
    const stored = localStorage.getItem('mossy_tutorial_return');
    if (stored && stored.startsWith('#/')) return stored;
    return '#/';
  };

  const startInteractiveTutorial = () => {
    // If we're in FirstRunOnboarding, show tutorial as overlay
    if (showFirstRun) {
      setShowInteractiveTutorialOverlay(true);
      return;
    }

    // Otherwise navigate to tutorial route
    const currentHash = window.location.hash || '#/';
    const returnHash = currentHash.startsWith('#/tutorial') ? '#/' : currentHash;
    try {
      localStorage.setItem('mossy_tutorial_return', returnHash);
    } catch {
      // ignore
    }
    window.location.hash = '#/tutorial';
  };

  const exitInteractiveTutorial = () => {
    // If shown as overlay, just hide it
    if (showInteractiveTutorialOverlay) {
      setShowInteractiveTutorialOverlay(false);
      return;
    }

    // Otherwise navigate back
    const returnHash = getTutorialReturnHash();
    try {
      localStorage.removeItem('mossy_tutorial_return');
    } catch {
      // ignore
    }
    window.location.hash = returnHash;
  };

  useEffect(() => {
    const hasCompletedFirstRun = localStorage.getItem('mossy_onboarding_complete') === 'true';
    const tutorialCompleted = localStorage.getItem('mossy_tutorial_completed') === 'true';
    const tutorialSkipped = localStorage.getItem('mossy_tutorial_skipped') === 'true';
    const tutorialStep = localStorage.getItem('mossy_tutorial_step');

    if (hasCompletedFirstRun && !tutorialCompleted && !tutorialSkipped && tutorialStep !== null) {
      startInteractiveTutorial();
    }
  }, []);

  const [debugHash, setDebugHash] = useState(() => window.location.hash || '');
  const [showDevHud, setShowDevHud] = useState(() => {
    if (!import.meta.env.DEV) return false;
    try {
      return localStorage.getItem('mossy_show_dev_hud') === 'true';
    } catch {
      return false;
    }
  });
  const [isTutorialRoute, setIsTutorialRoute] = useState(() => window.location.hash.startsWith('#/tutorial'));
  const [isPipBoy, setIsPipBoy] = useState(() => {
    try {
      return localStorage.getItem('mossy_pip_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [guidedTour, setGuidedTour] = useState(() => ({
    isOpen: false,
    type: 'welcome' as 'welcome' | 'feature-spotlight' | 'module-intro',
    targetModule: undefined as string | undefined
  }));
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
  const [pipToggledAt, setPipToggledAt] = useState(() => '');
  // Sidebar open by default on desktop (width >= 768px)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });

  // Project management state
  const [currentProject, setCurrentProject] = useState<ModProject | null>(null);

  // Quick Wins state
  const { showWhatsNew, dismissWhatsNew } = useWhatsNew();

  // Keep a durable local backup of user-authored progress so updates or rescans
  // never wipe project/chat/vault progress data stored in localStorage.
  useEffect(() => {
    const persistBackup = () => {
      void backupCriticalProgressToDisk();
    };

    void (async () => {
      await restoreMissingCriticalProgress();
      await backupCriticalProgressToDisk();
    })();

    const intervalId = window.setInterval(persistBackup, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistBackup();
    };
    const onBeforeUnload = () => {
      persistBackup();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('pip-boy-mode', isPipBoy);
    try {
      localStorage.setItem('mossy_pip_mode', isPipBoy ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isPipBoy]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPipBoy((prev) => !prev);
        setPipToggledAt(new Date().toLocaleTimeString());
        return;
      }

      if (e.key === 'Escape' && isPipBoy) {
        setIsPipBoy(false);
        setPipToggledAt(new Date().toLocaleTimeString());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPipBoy]);

  useEffect(() => {
    const updateTutorialRoute = () => setIsTutorialRoute(window.location.hash.startsWith('#/tutorial'));
    updateTutorialRoute();
    window.addEventListener('hashchange', updateTutorialRoute);
    return () => window.removeEventListener('hashchange', updateTutorialRoute);
  }, []);

  // Project management handlers
  const handleProjectChange = (project: ModProject) => {
    setCurrentProject(project);
  };

  const handleOpenProjectManager = () => {
    window.location.hash = '#/project';
  };

  // Guided Tour Event Listeners
  useEffect(() => {
    const handleStartWelcomeTour = () => {
      startInteractiveTutorial();
    };

    const handleStartModuleTour = (event: CustomEvent) => {
      setGuidedTour({
        isOpen: true,
        type: 'module-intro',
        targetModule: event.detail?.module
      });
    };

    const handleStartFeatureTour = () => {
      setGuidedTour({ isOpen: true, type: 'feature-spotlight', targetModule: undefined });
    };

    const handleStartInteractiveTutorial = () => {
      startInteractiveTutorial();
    };

    const handleStartScanTutorial = () => {
      console.log('[App] Scan tutorial event received - launching interactive tutorial');
      try {
        // Store timestamp consistently with FirstRunOnboarding's expectation
        localStorage.setItem('mossy_scan_tutorial_opened_at', Date.now().toString());
      } catch (err) {
        // localStorage may be unavailable (private browsing, quota exceeded, etc.)
        console.warn('[App] Failed to store scan tutorial timestamp:', err);
      }
      startInteractiveTutorial();
    };

    // Expose the scan tutorial function for FirstRunOnboarding to call directly.
    // FirstRunOnboarding tries direct function call first (synchronous), then falls back
    // to dispatching events if the function doesn't exist. This dual approach ensures
    // the tutorial launches reliably even if timing issues prevent event listeners from
    // being registered in time.
    (window as any).mossyOpenScanTutorial = handleStartScanTutorial;

    window.addEventListener('start-welcome-tour', handleStartWelcomeTour);
    window.addEventListener('start-module-tour', handleStartModuleTour as EventListener);
    window.addEventListener('start-feature-tour', handleStartFeatureTour);
    window.addEventListener('start-tutorial', handleStartInteractiveTutorial);
    window.addEventListener('start-interactive-tutorial', handleStartInteractiveTutorial);
    // Event listener for scan tutorial (backup mechanism if direct function call fails)
    window.addEventListener('start-scan-tutorial', handleStartScanTutorial);

    return () => {
      window.removeEventListener('start-welcome-tour', handleStartWelcomeTour);
      window.removeEventListener('start-module-tour', handleStartModuleTour as EventListener);
      window.removeEventListener('start-feature-tour', handleStartFeatureTour);
      window.removeEventListener('start-tutorial', handleStartInteractiveTutorial);
      window.removeEventListener('start-interactive-tutorial', handleStartInteractiveTutorial);
      window.removeEventListener('start-scan-tutorial', handleStartScanTutorial);
      delete (window as any).mossyOpenScanTutorial;
    };
  }, []);

  // Load current project on app start
  useEffect(() => {
    const loadCurrentProject = async () => {
      try {
        if (window.electronAPI?.getCurrentProject) {
          const project = await window.electronAPI.getCurrentProject();
          setCurrentProject(project);
        }
      } catch (error) {
        console.error('Failed to load current project:', error);
      }
    };

    loadCurrentProject();
  }, []);

  // Initialize performance & reliability systems
  useEffect(() => {
    const initSystems = async () => {
      try {
        // Initialize cache manager
        await cacheManager.init();
        console.log('[App] Cache manager initialized');

        // Worker manager is initialized automatically
        console.log('[App] Worker manager initialized');

        // Auto-save manager is initialized automatically
        console.log('[App] Auto-save manager initialized');

        // Initialize AI & intelligence services
        console.log('[App] Context-aware AI service initialized');
        console.log('[App] Workflow automation service initialized');
        console.log('[App] Plugin system service initialized');
        console.log('[App] Workflow automation service initialized');
        console.log('[App] Plugin system service initialized');

        // Attempt crash recovery
        const recoveredSession = await autoSaveManager.recoverFromCrash();
        if (recoveredSession) {
          console.log('[App] Recovered session from crash:', recoveredSession.id);
          // TODO: Apply recovered session data to app state
        }

      } catch (error) {
        console.error('[App] Failed to initialize systems:', error);
      }
    };

    initSystems();

    // Cleanup on unmount
    return () => {
      workerManager.destroy();
      autoSaveManager.destroy();
    };
  }, []);

  useEffect(() => {
    const seedVault = async () => {
      try {
        const raw = localStorage.getItem('mossy_knowledge_vault');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return;
        }
      } catch {
        // ignore and attempt seed
      }

      try {
        const resp = await fetch('/knowledge/seed-vault.json', { cache: 'no-cache' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) return;
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify(data));
        window.dispatchEvent(new Event('mossy-knowledge-updated'));
      } catch {
        // ignore
      }
    };

    seedVault();
  }, []);

  useEffect(() => {
    const seedKnowledgeRoots = async () => {
      const ROOTS_KEY = 'mossy_knowledge_roots_v1';
      const defaultRoots = [
        'external/nvidia-cosmos/cosmos-transfer2.5',
        'external/nvidia-cosmos/cosmos-predict2.5',
        'external/nvidia-cosmos/cosmos-cookbook',
        'external/nvidia-cosmos/cosmos-rl',
        'external/nvidia-cosmos/cosmos-dependencies',
        'external/nvidia-cosmos/cosmos-curate',
        'external/nvidia-cosmos/cosmos-xenna',
        'external/deepseek-ai/DeepSeek-OCR-2',
        'external/VAST-AI-Research/TripoSG',
      ];
      try {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (!api?.fsStat) return;

        const raw = localStorage.getItem(ROOTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const roots = Array.isArray(parsed) ? parsed : [];

        const next = [...roots];
        for (const root of defaultRoots) {
          const status = await api.fsStat(root);
          if (!status?.exists || !status?.isDirectory) continue;
          if (!next.includes(root)) next.push(root);
        }

        if (next.length !== roots.length) {
          localStorage.setItem(ROOTS_KEY, JSON.stringify(next));
        }
      } catch {
        // Ignore root seeding failures
      }
    };

    seedKnowledgeRoots();
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
        setIsPipBoy(next);
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

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip links navigation
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        mainContent?.focus();
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        const sidebarNav = document.getElementById('sidebar-navigation');
        sidebarNav?.focus();
      }

      // Mobile sidebar toggle
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Handle window resize - keep sidebar open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Desktop: ensure sidebar is open
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Seed browser TTS defaults once to keep voice stable across updates.
  React.useEffect(() => {
    ensureBrowserTtsSettingsStored();
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
        <div className="relative h-full w-full min-h-0">
          <FirstRunOnboarding
            onComplete={() => {
              // CRITICAL: Set localStorage flags so onboarding doesn't show again on next launch
              try {
                localStorage.setItem('mossy_onboarding_complete', 'true');
                localStorage.setItem('mossy_onboarding_completed', 'true');
              } catch { /* ignore */ }

              setShowFirstRun(false);
              // If the user clicked "Open in Auditor" on the Spriggit digest step,
              // navigate there now that the onboarding overlay has been dismissed.
              try {
                const pendingNav = localStorage.getItem('mossy_post_onboarding_nav');
                if (pendingNav) {
                  localStorage.removeItem('mossy_post_onboarding_nav');
                  setTimeout(() => { window.location.hash = pendingNav; }, POST_ONBOARDING_NAV_DELAY_MS);
                  return; // skip tutorial launch prompt when navigating directly
                }
              } catch { /* ignore */ }
              // Show tutorial launch prompt after onboarding
              setTimeout(() => {
                setShowTutorialLaunch(true);
              }, 500);
            }}
          />
          {showInteractiveTutorialOverlay && (
            <div
              className="absolute inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Interactive Tutorial"
            >
              <MemoryRouter initialEntries={["/tutorial"]}>
                <div className="w-full max-w-6xl h-full max-h-full min-h-0 overflow-hidden rounded-2xl shadow-2xl">
                  <InteractiveTutorial
                    onComplete={exitInteractiveTutorial}
                    onSkip={exitInteractiveTutorial}
                  />
                </div>
              </MemoryRouter>
            </div>
          )}
        </div>
      );
    }

    if (showVoiceSetup) {
      return (
        <VoiceSetupWizard
          onComplete={() => {
            setShowVoiceSetup(false);
            localStorage.setItem('mossy_voice_setup_complete', 'true');
          }}
          onSkip={() => {
            setShowVoiceSetup(false);
            localStorage.setItem('mossy_voice_setup_complete', 'true');
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
        {/* Skip links for accessibility */}
        <a href="#main-content" className="skip-link focus-visible">Skip to main content</a>
        <a href="#sidebar-navigation" className="skip-link focus-visible" style={{ left: '120px' }}>Skip to navigation</a>

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
          <WhatsNewRedirect enabled={showWhatsNew} />
          <CommandPalette />
          <TutorialOverlay />
          <SystemBus />

          {/* Mobile sidebar overlay */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar with mobile responsiveness */}
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Right section: header + main content (must flex to fill remaining space) */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Main Application Header */}
          <header className="main-header bg-slate-900 border-b border-green-500/20 px-4 py-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.6fr)] items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-green-400 font-mono">MOSSY</h1>
              <div className="hidden md:block">
                <Suspense fallback={<div className="text-xs text-green-600">Loading...</div>}>
                  <ProjectSelector
                    currentProject={currentProject}
                    onProjectChange={handleProjectChange}
                    onOpenProjectManager={handleOpenProjectManager}
                  />
                </Suspense>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 justify-self-center">
              <AvatarCore className="w-7 h-7" showRings={false} />
              <div className="hidden xl:block text-[10px] text-emerald-300 uppercase tracking-[0.3em] font-bold">Mossy Core</div>
            </div>
            <div className="flex items-center gap-2 justify-self-stretch justify-end min-w-0">
              <GlobalSearch />
              <button
                type="button"
                data-tour="command-palette-trigger"
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-xs text-slate-300"
                title="Command Palette (Ctrl+K)"
              >
                <Command className="w-3.5 h-3.5" />
                Command
              </button>
              <button
                type="button"
                onClick={() => setIsPipBoy((prev) => !prev)}
                className={`p-2 rounded-lg border text-xs transition-colors ${isPipBoy
                  ? 'bg-amber-900/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                title="Toggle Pip-Boy Theme"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-green-600 font-mono">v{packageJson.version}</span>
            </div>
          </header>

          {/* Mobile header */}
          <header className="mobile-header hidden" role="banner">
            <button
              type="button"
              className="mobile-menu-button focus-visible"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <h1 className="text-lg font-bold">Mossy</h1>
          </header>

          <main
            id="main-content"
            data-mossy-main="1"
            data-tour="main-content"
            className="flex-1 relative overflow-y-auto overflow-x-hidden"
            style={{
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)',
              // Layout fail-safe
              flex: '1 1 auto',
              minWidth: 0,
              outline: import.meta.env.DEV ? '2px solid rgba(0,255,255,0.8)' : undefined,
            }}
            role="main"
            aria-label="Main content"
          >
            <div className="relative z-10">
              <MossyObserver />

              {/*
               * Redirect-only routes — React Router handles navigation but renders no panel content.
               * Special routes with dynamic props (/tutorial, /whats-new) are also kept here
               * since they do not benefit from keep-alive and reset state on each visit.
               */}
              <Routes>
                {/* Special routes that render inline */}
                <Route
                  path="/tutorial"
                  element={
                    <InteractiveTutorial
                      onComplete={exitInteractiveTutorial}
                      onSkip={exitInteractiveTutorial}
                    />
                  }
                />
                <Route path="/whats-new" element={<ErrorBoundary><WhatsNewPage onDismiss={dismissWhatsNew} /></ErrorBoundary>} />

                {/* Redirect routes */}
                <Route path="/tools/monitor" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/tools/auditor" element={<Navigate to="/ck-crash-prevention?tab=audit" replace />} />
                <Route path="/tools/asset-scanner" element={<Navigate to="/tools/asset-deduplicator" replace />} />
                <Route path="/tools/dedupe" element={<Navigate to="/tools/asset-deduplicator" replace />} />
                <Route path="/tools/xedit-executor" element={<Navigate to="/tools/xedit" replace />} />
                <Route path="/tools/xedit-extension" element={<Navigate to="/tools/xedit" replace />} />
                <Route path="/tools/conflict-visualizer" element={<Navigate to="/packaging-release?section=conflicts" replace />} />
                <Route path="/tools/mod-comparison" element={<Navigate to="/packaging-release?section=comparison" replace />} />
                <Route path="/tools/assembler" element={<Navigate to="/assembler" replace />} />
                <Route path="/tools/ck-safety" element={<Navigate to="/tools/ck-crash-prevention" replace />} />
                <Route path="/dev/neural-link" element={<Navigate to="/live" replace />} />
                <Route path="/dev/mining-dashboard" element={<Navigate to="/tools/mining-hub?tab=dashboard" replace />} />
                <Route path="/learn/lore" element={<Navigate to="/lore" replace />} />
                <Route path="/learn/reference" element={<Navigate to="/reference" replace />} />
                <Route path="/learn/knowledge" element={<Navigate to="/knowledge" replace />} />
                <Route path="/learn/community" element={<Navigate to="/community" replace />} />
                <Route path="/learn/capabilities" element={<Navigate to="/learn" replace />} />
                <Route path="/media/tts" element={<Navigate to="/live" replace />} />
                <Route path="/media/memory-vault" element={<Navigate to="/live" replace />} />
                <Route path="/settings/privacy" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/voice" element={<Navigate to="/live" replace />} />
                <Route path="/settings/language" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/tools" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/import-export" element={<Navigate to="/settings" replace />} />
                <Route path="/project/journey" element={<Navigate to="/project" replace />} />
                <Route path="/project/achievements" element={<Navigate to="/project" replace />} />
                <Route path="/project/manager" element={<Navigate to="/project" replace />} />
                <Route path="/project/create" element={<Navigate to="/project" replace />} />
                <Route path="/project/collaboration" element={<Navigate to="/project" replace />} />
                <Route path="/project/analytics" element={<Navigate to="/project" replace />} />
                <Route path="/project/analytics-dashboard" element={<Navigate to="/project" replace />} />
                <Route path="/guides/blender/skeleton" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/blender/animation-validator" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/blender/rigging-checklist" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/blender/export-settings" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/blender/rigging-mistakes" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/creation-kit/precombine-prp" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/guides/creation-kit/precombine-checker" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/guides/creation-kit/leveled-list-injection" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/guides/creation-kit/ck-quest-dialogue" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/guides/papyrus" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/guides/papyrus/quick-start" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/guides/papyrus/fallout4" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/guides/physics/havok" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/physics/havok-quick-start" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/physics/havok-fo4" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/guides/mods/sim-settlements-addon" element={<Navigate to="/guides/mods/sim-settlements" replace />} />
                <Route path="/guides/mods/sim-settlements-units-loadouts" element={<Navigate to="/guides/mods/sim-settlements" replace />} />
                <Route path="/guides/mods/sim-settlements-addon-toolkits" element={<Navigate to="/guides/mods/sim-settlements" replace />} />
                <Route path="/wizards/install" element={<Navigate to="/wizards" replace />} />
                <Route path="/wizards/platforms" element={<Navigate to="/wizards" replace />} />
                <Route path="/wizards/crash-triage" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/wizards/packaging-release" element={<Navigate to="/packaging-release" replace />} />
                <Route path="/wizards/prp-patch-builder" element={<Navigate to="/wizards" replace />} />
                <Route path="/devtools/script-analyzer" element={<Navigate to="/devtools" replace />} />
                <Route path="/devtools/template-generator" element={<Navigate to="/devtools" replace />} />
                <Route path="/devtools/tool-verify" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/devtools/diagnostics" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/extensions/xedit" element={<Navigate to="/tools/xedit" replace />} />
                <Route path="/extensions/ck" element={<Navigate to="/tools/ck-extension" replace />} />
                <Route path="/monitor" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/load-order" element={<Navigate to="/dev/load-order" replace />} />
                <Route path="/auditor" element={<Navigate to="/ck-crash-prevention?tab=audit" replace />} />
                <Route path="/blueprint" element={<Navigate to="/tools/blueprint" replace />} />
                <Route path="/scribe" element={<Navigate to="/tools/scribe" replace />} />
                <Route path="/orchestrator" element={<Navigate to="/dev/orchestrator" replace />} />
                <Route path="/workflow-runner" element={<Navigate to="/dev/workflow-runner" replace />} />
                <Route path="/holo" element={<Navigate to="/test/holo" replace />} />
                <Route path="/vault" element={<Navigate to="/tools/vault" replace />} />
                <Route path="/neural-link" element={<Navigate to="/live" replace />} />
                <Route path="/workshop" element={<Navigate to="/dev/workshop" replace />} />
                <Route path="/images" element={<Navigate to="/media/images" replace />} />
                <Route path="/tts" element={<Navigate to="/live" replace />} />
                <Route path="/bridge" element={<Navigate to="/test/bridge" replace />} />
                <Route path="/dedupe" element={<Navigate to="/tools/asset-deduplicator" replace />} />
                <Route path="/cosmos" element={<Navigate to="/tools/cosmos" replace />} />
                <Route path="/tool-verify" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/script-analyzer" element={<Navigate to="/devtools" replace />} />
                <Route path="/template-generator" element={<Navigate to="/devtools" replace />} />
                <Route path="/install-wizard" element={<Navigate to="/wizards" replace />} />
                <Route path="/platforms" element={<Navigate to="/wizards" replace />} />
                <Route path="/crash-triage" element={<Navigate to="/diagnostics" replace />} />
                <Route path="/ck-quest-dialogue" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/prp-patch-builder" element={<Navigate to="/wizards" replace />} />
                <Route path="/animation-guide" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/skeleton-reference" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/animation-validator" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/rigging-checklist" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/export-settings" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/rigging-mistakes" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/precombine-prp" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/precombine-checker" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/leveled-list-injection" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/quest-mod-authoring-guide" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/quest-authoring" element={<Navigate to="/guides/creation-kit/quest-authoring" replace />} />
                <Route path="/journey" element={<Navigate to="/project" replace />} />
                <Route path="/bodyslide" element={<Navigate to="/guides/mods/bodyslide" replace />} />
                <Route path="/sim-settlements" element={<Navigate to="/guides/mods/sim-settlements" replace />} />
                <Route path="/sim-settlements-addon" element={<Navigate to="/guides/mods/sim-settlements-addon" replace />} />
                <Route path="/sim-settlements-units-loadouts" element={<Navigate to="/guides/mods/sim-settlements-units-loadouts" replace />} />
                <Route path="/sim-settlements-addon-toolkits" element={<Navigate to="/guides/mods/sim-settlements-addon-toolkits" replace />} />
                <Route path="/paperscript" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/paperscript-quick-start" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/paperscript-fo4" element={<Navigate to="/guides/papyrus/guide" replace />} />
                <Route path="/havok" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/havok-quick-start" element={<Navigate to="/guides/blender/animation" replace />} />
                <Route path="/havok-fo4" element={<Navigate to="/guides/blender/animation" replace />} />
                {/* Catch-all: content panels are rendered by KeepAlivePanel below.
                    RouteNotFound returns null for known panel paths and a 404 for unknown routes. */}
                <Route path="*" element={<RouteNotFound />} />
              </Routes>

              {/*
               * Content panels — each mounts on first visit and stays alive in the DOM
               * thereafter. Inactive panels use CSS display:none so React state is
               * preserved and any in-progress background operations (scans, installs,
               * log monitors, etc.) keep running while the user browses other panels.
               */}
              {/* Core */}
              <KeepAlivePanel path="/"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/chat"><ErrorBoundary><ChatInterface /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/ai-assistant"><ErrorBoundary><AIAssistant /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/ai-mod-assistant"><ErrorBoundary><AIModAssistant /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/cloud-sync"><ErrorBoundary><CloudSync /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/first-success"><ErrorBoundary><FirstSuccessWizard /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/roadmap"><ErrorBoundary><RoadmapPanel /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/live"><ErrorBoundary><VoiceChat /></ErrorBoundary></KeepAlivePanel>
              {/* Tools */}
              <KeepAlivePanel path="/tools"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/ini-config"><ErrorBoundary><IniConfigManager /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/asset-deduplicator"><ErrorBoundary><AssetDeduplicator /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/log-monitor"><ErrorBoundary><GameLogMonitor /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/xedit"><ErrorBoundary><XEditTools /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/ck-extension"><ErrorBoundary><CKExtension /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/project-templates"><ErrorBoundary><ProjectTemplates /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/formid-remapper"><ErrorBoundary><FormIdRemapper /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/precombine-generator"><ErrorBoundary><PrecombineGenerator /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/voice-commands"><ErrorBoundary><VoiceCommands /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/automation"><ErrorBoundary><AutomationManager /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/ck-crash-prevention"><ErrorBoundary><CKCrashPrevention /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/security"><ErrorBoundary><SecurityValidator /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/mining"><ErrorBoundary><MiningPanel /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/advanced-analysis"><ErrorBoundary><AdvancedAnalysisPanel /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/blueprint"><ErrorBoundary><TheBlueprint /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/scribe"><ErrorBoundary><TheScribe /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/vault"><ErrorBoundary><TheVault /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/ba2-manager"><ErrorBoundary><BA2Manager /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/tools/cosmos"><ErrorBoundary><CosmosWorkflow /></ErrorBoundary></KeepAlivePanel>
              {/* Development & Workflow */}
              <KeepAlivePanel path="/dev"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/workshop"><ErrorBoundary><Workshop /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/mods"><ErrorBoundary><ModBrowser /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/orchestrator"><ErrorBoundary><WorkflowOrchestrator /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/workflow-runner"><ErrorBoundary><WorkflowRunner /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/workflow-recorder"><ErrorBoundary><WorkflowRecorder /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/plugin-manager"><ErrorBoundary><PluginManager /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dev/load-order"><ErrorBoundary><LoadOrderHub /></ErrorBoundary></KeepAlivePanel>
              {/* Media & Assets */}
              <KeepAlivePanel path="/media"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/media/images"><ErrorBoundary><ImageSuite /></ErrorBoundary></KeepAlivePanel>
              {/* Testing */}
              <KeepAlivePanel path="/test"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/test/holo"><ErrorBoundary><Holodeck /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/test/notification-test"><ErrorBoundary><NotificationTest /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/test/bridge"><ErrorBoundary><DesktopBridge /></ErrorBoundary></KeepAlivePanel>
              {/* Knowledge & Learning */}
              <KeepAlivePanel path="/learn"><ErrorBoundary><LearningHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/reference"><ErrorBoundary><QuickReference /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/knowledge"><ErrorBoundary><KnowledgeSearch /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/lore"><ErrorBoundary><Lorekeeper /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/memory-vault"><ErrorBoundary><MossyMemoryVault /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/ck-crash-prevention"><ErrorBoundary><CKCrashPrevention /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/dds-converter"><ErrorBoundary><DDSConverter /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/texture-generator"><ErrorBoundary><TextureGenerator /></ErrorBoundary></KeepAlivePanel>
              {/* Guides */}
              <KeepAlivePanel path="/guides"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/blender"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/blender/animation"><ErrorBoundary><BlenderAnimationGuide /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/creation-kit"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/creation-kit/quest-authoring"><ErrorBoundary><QuestModAuthoringGuide /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/papyrus/guide"><ErrorBoundary><PaperScriptGuide /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/physics"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/mods"><ErrorBoundary><TheNexus /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/mods/bodyslide"><ErrorBoundary><BodyslideGuide /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/guides/mods/sim-settlements"><ErrorBoundary><SimSettlementsGuide /></ErrorBoundary></KeepAlivePanel>
              {/* Wizards & Tools */}
              <KeepAlivePanel path="/wizards"><ErrorBoundary><WizardsHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/devtools"><ErrorBoundary><DevtoolsHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/settings"><ErrorBoundary><SettingsHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/project"><ErrorBoundary><ProjectHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/support"><ErrorBoundary><DonationSupport /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/assembler"><ErrorBoundary><TheAssembler /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/diagnostics"><ErrorBoundary><DiagnosticsHub /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/community"><ErrorBoundary><CommunityLearning /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/capabilities"><ErrorBoundary><LocalCapabilities /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/packaging-release"><ErrorBoundary><PackagingHub /></ErrorBoundary></KeepAlivePanel>
              {/* Extensions */}
              <KeepAlivePanel path="/extensions/mo2"><ErrorBoundary><MO2Extension /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/extensions/comfyui"><ErrorBoundary><ComfyUIExtension /></ErrorBoundary></KeepAlivePanel>
              <KeepAlivePanel path="/extensions/upscayl"><ErrorBoundary><UpscaylExtension /></ErrorBoundary></KeepAlivePanel>
            </div>
          </main>
          </div>
          <GuidedTour
            isOpen={guidedTour.isOpen}
            onClose={() => setGuidedTour(prev => ({ ...prev, isOpen: false }))}
            tourType={guidedTour.type}
            targetModule={guidedTour.targetModule}
          />

          {/* Tutorial Launch Prompt */}
          {showTutorialLaunch && (
            <TutorialLaunch
              onStartTutorial={() => {
                setShowTutorialLaunch(false);
                localStorage.setItem('mossy_tutorial_started', 'true');
                startInteractiveTutorial();
              }}
              onSkip={() => {
                setShowTutorialLaunch(false);
                localStorage.setItem('mossy_tutorial_skipped', 'true');
              }}
            />
          )}
          <AvatarOverlay />
          <AskMossyButton />
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
            <button
              type="button"
              onClick={() => {
                setIsPipBoy((prev) => !prev);
                setPipToggledAt(new Date().toLocaleTimeString());
              }}
              title="Toggle Pip-Boy Theme (Ctrl+Shift+P, Esc to exit)"
              style={{
                position: 'fixed',
                left: 16,
                bottom: 16,
                zIndex: 20002,
                background: isPipBoy ? 'rgba(120,80,20,0.9)' : 'rgba(0,0,0,0.85)',
                border: isPipBoy ? '1px solid rgba(230,176,74,0.5)' : '1px solid rgba(0,255,0,0.35)',
                color: isPipBoy ? '#f6d28a' : '#9aff9a',
                padding: '6px 10px',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                borderRadius: 10,
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {isPipBoy ? 'PIP-BOY: ON' : 'PIP-BOY: OFF'}
            </button>
            <NotificationProvider>
              {renderAppContent()}

              {/* Auto-Update Notification */}
              <AutoUpdateNotifier />
            </NotificationProvider>
          </PipBoyFrame>
        </OpenAIVoiceProvider>
      </LiveProvider>
    </ErrorBoundary>
  );
};

export default App;
