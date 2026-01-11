import React, { useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MossyObserver from './MossyObserver';
import CommandPalette from './CommandPalette';
import TutorialOverlay from './TutorialOverlay';
import SystemBus from './SystemBus';
import { Loader2, Zap } from 'lucide-react';
import { LiveProvider } from './LiveContext';

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
const TheFabric = React.lazy(() => import('./TheFabric'));
const TheCatalyst = React.lazy(() => import('./TheCatalyst'));
const TheCartographer = React.lazy(() => import('./TheCartographer'));
const TheRegistry = React.lazy(() => import('./TheRegistry'));
const TheOrganizer = React.lazy(() => import('./TheOrganizer'));
const TheCrucible = React.lazy(() => import('./TheCrucible'));
const TheAssembler = React.lazy(() => import('./TheAssembler'));
const TheAuditor = React.lazy(() => import('./TheAuditor'));
const TheScribe = React.lazy(() => import('./TheScribe'));

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