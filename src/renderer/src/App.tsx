import React, { useEffect, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MossyObserver from './MossyObserver';
import CommandPalette from './CommandPalette';
import TutorialOverlay from './TutorialOverlay';
import SystemBus from './SystemBus';
import MossyOnboarding from './MossyOnboarding';
import ErrorBoundary from './ErrorBoundary';

import { Loader2, Zap } from 'lucide-react';
import { LiveProvider } from './LiveContext';
import AvatarOverlay from './AvatarOverlay';

// --- LAZY LOAD MODULES ---
// This prevents the app from loading ALL code at startup.
// Modules are only loaded when accessed.
const SystemMonitor = React.lazy(() => import('./SystemMonitor'));
const ChatInterface = React.lazy(() => import('./ChatInterface').then(module => ({ default: module.ChatInterface })));
const LiveInterface = React.lazy(() => import('./LiveInterface'));
const ImageSuite = React.lazy(() => import('./ImageSuite'));
const TTSPanel = React.lazy(() => import('./TTSPanel'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Workshop = React.lazy(() => import('./Workshop'));
const WorkflowOrchestrator = React.lazy(() => import('./WorkflowOrchestrator'));
const Lorekeeper = React.lazy(() => import('./Lorekeeper'));
const Holodeck = React.lazy(() => import('./Holodeck'));
const TheVault = React.lazy(() => import('./TheVault'));
const HyperTerminal = React.lazy(() => import('./HyperTerminal'));
const TheCortex = React.lazy(() => import('./TheCortex'));
const TheLens = React.lazy(() => import('./TheLens'));
const TheNexus = React.lazy(() => import('./TheNexus'));
const TheConduit = React.lazy(() => import('./TheConduit'));
const TheSynapse = React.lazy(() => import('./TheSynapse'));
const TheHive = React.lazy(() => import('./TheHive'));
const TheBlueprint = React.lazy(() => import('./TheBlueprint'));
const TheGenome = React.lazy(() => import('./TheGenome'));
const TheReverie = React.lazy(() => import('./TheReverie'));
const TheAnima = React.lazy(() => import('./TheAnima'));
const TheSplicer = React.lazy(() => import('./TheSplicer'));
const ThePrism = React.lazy(() => import('./ThePrism'));
const TheCatalyst = React.lazy(() => import('./TheCatalyst'));
const TheCartographer = React.lazy(() => import('./TheCartographer'));
const TheRegistry = React.lazy(() => import('./TheRegistry'));
const TheOrganizer = React.lazy(() => import('./TheOrganizer'));
const TheCrucible = React.lazy(() => import('./TheCrucible'));
const TheAssembler = React.lazy(() => import('./TheAssembler'));
const TheAuditor = React.lazy(() => import('./TheAuditor'));
const TheScribe = React.lazy(() => import('./TheScribeEnhanced').then(module => ({ default: module.TheScribe })));
const PrivacySettings = React.lazy(() => import('./PrivacySettings'));
const DonationSupport = React.lazy(() => import('./DonationSupport').then(module => ({ default: module.DonationSupport })));
const QuickReference = React.lazy(() => import('./QuickReference').then(module => ({ default: module.QuickReference })));
const ScriptAnalyzer = React.lazy(() => import('./ScriptAnalyzer').then(module => ({ default: module.ScriptAnalyzer })));
const TemplateGenerator = React.lazy(() => import('./TemplateGenerator').then(module => ({ default: module.TemplateGenerator })));
const BA2Manager = React.lazy(() => import('./BA2Manager').then(module => ({ default: module.BA2Manager })));
const FileWatcher = React.lazy(() => import('./FileWatcher').then(module => ({ default: module.FileWatcher })));
const SaveGameParser = React.lazy(() => import('./SaveGameParser').then(module => ({ default: module.SaveGameParser })));
const VoiceCommands = React.lazy(() => import('./VoiceCommands').then(module => ({ default: module.VoiceCommands })));
const LoadOrderAnalyzer = React.lazy(() => import('./LoadOrderAnalyzer').then(module => ({ default: module.LoadOrderAnalyzer })));
const AutoCompiler = React.lazy(() => import('./AutoCompiler').then(module => ({ default: module.AutoCompiler })));
const AICopilot = React.lazy(() => import('./AICopilot').then(module => ({ default: module.AICopilot })));
const PopularModsDatabase = React.lazy(() => import('./PopularModsDatabase').then(module => ({ default: module.PopularModsDatabase })));
const ConflictGraph = React.lazy(() => import('./ConflictGraph').then(module => ({ default: module.ConflictGraph })));
const AssetViewer3D = React.lazy(() => import('./AssetViewer3D').then(module => ({ default: module.AssetViewer3D })));
const PerformancePredictor = React.lazy(() => import('./PerformancePredictor').then(module => ({ default: module.PerformancePredictor })));
const AssetOptimizer = React.lazy(() => import('./AssetOptimizer').then(module => ({ default: module.AssetOptimizer })));
const LiveGameMonitor = React.lazy(() => import('./LiveGameMonitor').then(module => ({ default: module.LiveGameMonitor })));
const QuestEditor = React.lazy(() => import('./QuestEditor').then(module => ({ default: module.QuestEditor })));
const PatchGenerator = React.lazy(() => import('./PatchGenerator').then(module => ({ default: module.PatchGenerator })));
const BackupManager = React.lazy(() => import('./BackupManager').then(module => ({ default: module.BackupManager })));
const ModDistribution = React.lazy(() => import('./ModDistribution').then(module => ({ default: module.ModDistribution })));
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
const QuestModAutomationSuite = React.lazy(() => import('./QuestModAutomationSuite').then(module => ({ default: module.QuestModAutomationSuite })));

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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has completed onboarding
    return !localStorage.getItem('mossy_onboarding_completed');
  });

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

  return (
    <LiveProvider>
      <HashRouter>
        <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)', color: '#00ff00' }}>
          <NeuralController />
          <CommandPalette />
          <TutorialOverlay />
          <SystemBus />
          <Sidebar />
          <main className="flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e0a 0%, #1a1f1a 100%)', boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)' }}>
            <MossyObserver />
            <Suspense fallback={<ModuleLoader />}>
              <Routes>
                <Route path="/" element={<TheNexus />} />
                <Route path="/monitor" element={<SystemMonitor />} />
                <Route path="/chat" element={<Navigate to="/" replace />} />
                <Route path="/lens" element={<TheLens />} />
                <Route path="/synapse" element={<TheSynapse />} />
                <Route path="/hive" element={<TheHive />} />
                <Route path="/blueprint" element={<TheBlueprint />} />
                <Route path="/genome" element={<TheGenome />} />
                <Route path="/reverie" element={<TheReverie />} />
                <Route path="/anima" element={<TheAnima />} />
                <Route path="/splicer" element={<TheSplicer />} />
                <Route path="/prism" element={<ThePrism />} />
                <Route path="/catalyst" element={<TheCatalyst />} />
                <Route path="/cartographer" element={<TheCartographer />} />
                <Route path="/registry" element={<TheRegistry />} />
                <Route path="/organizer" element={<TheOrganizer />} />
                <Route path="/crucible" element={<TheCrucible />} />
                <Route path="/assembler" element={<TheAssembler />} />
                <Route path="/auditor" element={<TheAuditor />} />
                <Route path="/scribe" element={<TheScribe />} />
                <Route path="/conduit" element={<TheConduit />} />
                <Route path="/cortex" element={<TheCortex />} />
                <Route path="/terminal" element={<HyperTerminal />} />
                <Route path="/orchestrator" element={<WorkflowOrchestrator />} />
                <Route path="/lore" element={<Lorekeeper />} />
                <Route path="/holo" element={<Holodeck />} />
                <Route path="/vault" element={<TheVault />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/live" element={<ErrorBoundary><LiveInterface /></ErrorBoundary>} />
                <Route path="/images" element={<ImageSuite />} />
                <Route path="/tts" element={<TTSPanel />} />
                <Route path="/bridge" element={<DesktopBridge />} />
                <Route path="/settings/privacy" element={<PrivacySettings />} />
                <Route path="/settings/tools" element={<ExternalToolsSettings />} />
                <Route path="/support" element={<DonationSupport />} />
                <Route path="/reference" element={<QuickReference />} />
                <Route path="/script-analyzer" element={<ScriptAnalyzer />} />
                <Route path="/template-generator" element={<TemplateGenerator />} />
                <Route path="/ba2-manager" element={<BA2Manager />} />
                <Route path="/file-watcher" element={<FileWatcher />} />
                <Route path="/save-parser" element={<SaveGameParser />} />
                <Route path="/voice-commands" element={<VoiceCommands />} />
                <Route path="/load-order" element={<LoadOrderAnalyzer />} />
                <Route path="/auto-compiler" element={<AutoCompiler />} />
                <Route path="/ai-copilot" element={<AICopilot />} />
                <Route path="/popular-mods" element={<PopularModsDatabase />} />
                <Route path="/conflict-graph" element={<ConflictGraph />} />
                <Route path="/3d-viewer" element={<AssetViewer3D />} />
                <Route path="/performance" element={<PerformancePredictor />} />
                <Route path="/optimizer" element={<AssetOptimizer />} />
                <Route path="/game-monitor" element={<LiveGameMonitor />} />
                <Route path="/quest-editor" element={<QuestEditor />} />
                <Route path="/patch-gen" element={<PatchGenerator />} />
                <Route path="/backups" element={<BackupManager />} />
                <Route path="/distribution" element={<ModDistribution />} />
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
                <Route path="/automation-suite" element={<QuestModAutomationSuite />} />
                <Route path="/quest-automation" element={<QuestModAutomationSuite />} />
              </Routes>
            </Suspense>
          </main>

          <AvatarOverlay />
        </div>
      </HashRouter>
    </LiveProvider>
  );
};

export default App;