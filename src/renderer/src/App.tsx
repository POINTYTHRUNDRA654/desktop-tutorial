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

import { Loader2, Zap } from 'lucide-react';
import { LiveProvider } from './LiveContext';
import AvatarOverlay from './AvatarOverlay';

// --- LAZY LOAD MODULES ---
// This prevents the app from loading ALL code at startup.
// Modules are only loaded when accessed.
const SystemMonitor = React.lazy(() => import('./SystemMonitor'));
const ChatInterface = React.lazy(() => import('./ChatInterface'));
const VoiceChat = React.lazy(() => import('./VoiceChat'));
const ImageSuite = React.lazy(() => import('./ImageSuite'));
const TTSPanel = React.lazy(() => import('./TTSPanel'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Workshop = React.lazy(() => import('./Workshop'));
const WorkflowOrchestrator = React.lazy(() => import('./WorkflowOrchestrator'));
const Lorekeeper = React.lazy(() => import('./Lorekeeper'));
const Holodeck = React.lazy(() => import('./Holodeck'));
const TheVault = React.lazy(() => import('./TheVault'));
const MossyMemoryVault = React.lazy(() => import('./MossyMemoryVault'));
const NeuralLink = React.lazy(() => import('./NeuralLink'));
const TheNexus = React.lazy(() => import('./TheNexus'));
const TheAssembler = React.lazy(() => import('./TheAssembler'));
const TheAuditor = React.lazy(() => import('./TheAuditor'));
const TheScribe = React.lazy(() => import('./TheScribeEnhanced').then(module => ({ default: module.TheScribe })));
const PrivacySettings = React.lazy(() => import('./PrivacySettings'));
const DiagnosticTools = React.lazy(() => import('./DiagnosticTools'));
const DonationSupport = React.lazy(() => import('./DonationSupport').then(module => ({ default: module.DonationSupport })));
const QuickReference = React.lazy(() => import('./QuickReference').then(module => ({ default: module.QuickReference })));
const ScriptAnalyzer = React.lazy(() => import('./ScriptAnalyzer').then(module => ({ default: module.ScriptAnalyzer })));
const TemplateGenerator = React.lazy(() => import('./TemplateGenerator').then(module => ({ default: module.TemplateGenerator })));
const ExternalToolsSettings = React.lazy(() => import('./ExternalToolsSettings'));
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

// Define window interface for AI Studio helpers & Custom Events
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
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
  const [hasBooted, setHasBooted] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(() => {
    // Check if user has completed first-run onboarding
    return !localStorage.getItem('mossy_onboarding_complete');
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has completed onboarding
    return !localStorage.getItem('mossy_onboarding_completed');
  });

  // Reset to first-run state (useful for testing)
  const resetToFirstRun = () => {
    localStorage.removeItem('mossy_onboarding_complete');
    localStorage.removeItem('mossy_all_detected_apps');
    localStorage.removeItem('mossy_scan_summary');
    localStorage.removeItem('mossy_tool_preferences');
    localStorage.removeItem('mossy_integrated_tools');
    localStorage.removeItem('mossy_last_scan');
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
    if (window.electron?.api?.getSystemInfo) {
      console.log('[App] ✓ Electron hardware detection API is available');
    } else {
      console.warn('[App] ⚠️ Electron API not available - running in web mode or preload failed');
    }
  }, []);

  // Determine what to display based on state
  const renderAppContent = () => {
    if (!hasBooted) {
      return <PipBoyStartup onComplete={() => setHasBooted(true)} />;
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
        <div className="flex h-full w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)', color: '#00ff00' }}>
          <NeuralController />
          <CommandPalette />
          <TutorialOverlay />
          <SystemBus />
          <Sidebar />
          <main className="flex-1 relative overflow-y-auto overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)', boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)' }}>
            <MossyObserver />
            <Suspense fallback={<ModuleLoader />}>
              <Routes>
                <Route path="/" element={<ErrorBoundary><TheNexus /></ErrorBoundary>} />
                <Route path="/monitor" element={<SystemMonitor />} />
                <Route path="/chat" element={<ErrorBoundary><ChatInterface /></ErrorBoundary>} />
                <Route path="/assembler" element={<TheAssembler />} />
                <Route path="/auditor" element={<TheAuditor />} />
                <Route path="/scribe" element={<TheScribe />} />
                <Route path="/orchestrator" element={<WorkflowOrchestrator />} />
                <Route path="/lore" element={<Lorekeeper />} />
                <Route path="/holo" element={<Holodeck />} />
                <Route path="/vault" element={<ErrorBoundary><TheVault /></ErrorBoundary>} />
                <Route path="/memory-vault" element={<MossyMemoryVault />} />
                <Route path="/neural-link" element={<NeuralLink />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/live" element={<ErrorBoundary><VoiceChat /></ErrorBoundary>} />
                <Route path="/images" element={<ImageSuite />} />
                <Route path="/tts" element={<TTSPanel />} />
                <Route path="/bridge" element={<DesktopBridge />} />
                <Route path="/settings/privacy" element={<PrivacySettings />} />
                <Route path="/diagnostics" element={<DiagnosticTools />} />
                <Route path="/settings/tools" element={<ExternalToolsSettings />} />
                <Route path="/support" element={<DonationSupport />} />
                <Route path="/reference" element={<QuickReference />} />
                <Route path="/script-analyzer" element={<ScriptAnalyzer />} />
                <Route path="/template-generator" element={<TemplateGenerator />} />

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
              </Routes>
            </Suspense>
            <AvatarOverlay />
          </main>
        </div>
      </HashRouter>
    );
  };

  return (
    <ErrorBoundary>
      <LiveProvider>
        <PipBoyFrame>
          {renderAppContent()}
        </PipBoyFrame>
      </LiveProvider>
    </ErrorBoundary>
  );
};

export default App;