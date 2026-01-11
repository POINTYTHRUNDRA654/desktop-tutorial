import React, { useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MossyObserver from './components/MossyObserver';
import CommandPalette from './components/CommandPalette';
import TutorialOverlay from './components/TutorialOverlay';
import SystemBus from './components/SystemBus';
import { Loader2, Zap } from 'lucide-react';
import { LiveProvider } from './components/LiveContext';

// --- LAZY LOAD MODULES ---
// This prevents the app from loading ALL code at startup.
// Modules are only loaded when accessed.
const SystemMonitor = React.lazy(() => import('./components/SystemMonitor'));
const ChatInterface = React.lazy(() => import('./components/ChatInterface').then(module => ({ default: module.ChatInterface })));
const LiveInterface = React.lazy(() => import('./components/LiveInterface'));
const ImageSuite = React.lazy(() => import('./components/ImageSuite'));
const TTSPanel = React.lazy(() => import('./components/TTSPanel'));
const DesktopBridge = React.lazy(() => import('./components/DesktopBridge'));
const Workshop = React.lazy(() => import('./components/Workshop'));
const WorkflowOrchestrator = React.lazy(() => import('./components/WorkflowOrchestrator'));
const Lorekeeper = React.lazy(() => import('./components/Lorekeeper'));
const Holodeck = React.lazy(() => import('./components/Holodeck'));
const TheVault = React.lazy(() => import('./components/TheVault'));
const HyperTerminal = React.lazy(() => import('./components/HyperTerminal'));
const TheCortex = React.lazy(() => import('./components/TheCortex'));
const TheLens = React.lazy(() => import('./components/TheLens'));
const TheNexus = React.lazy(() => import('./components/TheNexus'));
const TheConduit = React.lazy(() => import('./components/TheConduit'));
const TheSynapse = React.lazy(() => import('./components/TheSynapse'));
const TheHive = React.lazy(() => import('./components/TheHive'));
const TheBlueprint = React.lazy(() => import('./components/TheBlueprint'));
const TheGenome = React.lazy(() => import('./components/TheGenome'));
const TheReverie = React.lazy(() => import('./components/TheReverie'));
const TheAnima = React.lazy(() => import('./components/TheAnima'));
const TheSplicer = React.lazy(() => import('./components/TheSplicer'));
const ThePrism = React.lazy(() => import('./components/ThePrism'));
const TheFabric = React.lazy(() => import('./components/TheFabric'));
const TheCatalyst = React.lazy(() => import('./components/TheCatalyst'));
const TheCartographer = React.lazy(() => import('./components/TheCartographer'));
const TheRegistry = React.lazy(() => import('./components/TheRegistry'));
const TheOrganizer = React.lazy(() => import('./components/TheOrganizer'));
const TheCrucible = React.lazy(() => import('./components/TheCrucible'));
const TheAssembler = React.lazy(() => import('./components/TheAssembler'));
const TheAuditor = React.lazy(() => import('./components/TheAuditor'));
const TheScribe = React.lazy(() => import('./components/TheScribe'));

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
  <div className="flex h-full w-full items-center justify-center bg-forge-dark text-emerald-500">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-4 h-4 fill-current animate-pulse" />
        </div>
      </div>
      <span className="text-xs font-mono tracking-widest uppercase animate-pulse">Loading Module...</span>
    </div>
  </div>
);

const App: React.FC = () => {
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

  return (
    <LiveProvider>
      <HashRouter>
        <div className="flex h-screen w-screen overflow-hidden bg-forge-dark text-slate-200">
          <NeuralController />
          <CommandPalette />
          <TutorialOverlay />
          <SystemBus />
          <Sidebar />
          <main className="flex-1 relative overflow-hidden bg-[#050910]">
            <MossyObserver />
            <Suspense fallback={<ModuleLoader />}>
              <Routes>
                <Route path="/" element={<TheNexus />} />
                <Route path="/monitor" element={<SystemMonitor />} />
                <Route path="/chat" element={<ChatInterface />} />
                <Route path="/lens" element={<TheLens />} />
                <Route path="/synapse" element={<TheSynapse />} />
                <Route path="/hive" element={<TheHive />} />
                <Route path="/blueprint" element={<TheBlueprint />} />
                <Route path="/genome" element={<TheGenome />} />
                <Route path="/reverie" element={<TheReverie />} />
                <Route path="/anima" element={<TheAnima />} />
                <Route path="/splicer" element={<TheSplicer />} />
                <Route path="/prism" element={<ThePrism />} />
                <Route path="/fabric" element={<TheFabric />} />
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
                <Route path="/live" element={<LiveInterface />} />
                <Route path="/images" element={<ImageSuite />} />
                <Route path="/tts" element={<TTSPanel />} />
                <Route path="/bridge" element={<DesktopBridge />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </HashRouter>
    </LiveProvider>
  );
};

export default App;