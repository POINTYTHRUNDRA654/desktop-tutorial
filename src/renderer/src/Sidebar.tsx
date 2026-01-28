import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Radio, Image, Mic2, Activity, Heart, Leaf, Monitor, Wifi, WifiOff, Hammer, GitBranch, Network, Gamepad2, Container, SquareTerminal, BrainCircuit, Aperture, LayoutDashboard, Satellite, Workflow, Hexagon, DraftingCompass, Dna, Sparkles, Flame, Binary, Triangle, PenTool, FlaskConical, Map, FileDigit, Library, Bug, Package, Watch, ShieldCheck, Feather, Power, Volume2, VolumeX, Settings, Coffee, Book, Code, Wand2, Archive, Eye, Save, List, FileCode as FileCodeIcon, Bot, Box, Gauge, Zap, GitMerge, Clock, Share2, Github, Bone, CheckCircle2, AlertCircle, BookOpen, Wrench, Copy } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';
import { useI18n } from './i18n';

const Sidebar: React.FC = () => {
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [isPipBoy, setIsPipBoy] = useState(false);
  const location = useLocation();
  const [moodColor, setMoodColor] = useState('text-emerald-400');

  const { t } = useI18n();
  
  // Consume Global Live Context (with safe fallback)
  let liveContextValue: any = null;
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    liveContextValue = useLive();
  } catch (err) {
    console.warn('[Sidebar] LiveContext not available, using fallback');
  }
  
  const liveContext = liveContextValue || { isActive: false, isMuted: false, toggleMute: () => {}, disconnect: () => {} };
  const { isActive, isMuted, toggleMute, disconnect } = liveContext;

  // Toggle Pip-Boy Theme
  const togglePipBoy = () => {
      const newState = !isPipBoy;
      setIsPipBoy(newState);
      if (newState) {
          document.body.classList.add('pip-boy-mode');
      } else {
          document.body.classList.remove('pip-boy-mode');
      }
      localStorage.setItem('mossy_pip_mode', JSON.stringify(newState));
  };

  // Init Theme
  useEffect(() => {
      const saved = localStorage.getItem('mossy_pip_mode') === 'true';
      setIsPipBoy(saved);
      if (saved) document.body.classList.add('pip-boy-mode');
  }, []);

  // Poll for bridge status check
  useEffect(() => {
    const checkBridge = () => {
        const isConnected = localStorage.getItem('mossy_bridge_active') === 'true';
        setBridgeConnected(isConnected);
    };
    checkBridge();
    window.addEventListener('storage', checkBridge);
    window.addEventListener('mossy-bridge-connected', checkBridge);
    
    // Fallback poll
    const interval = setInterval(checkBridge, 2000); 
    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', checkBridge);
        window.removeEventListener('mossy-bridge-connected', checkBridge);
    };
  }, []);

  // Context-Aware Mood System
  useEffect(() => {
      const path = location.pathname;
      if (path.includes('crucible') || path.includes('terminal')) {
          setMoodColor('text-red-400');
      } else if (path.includes('reverie') || path.includes('prism') || path.includes('anima')) {
          setMoodColor('text-purple-400');
      } else if (path.includes('splicer') || path.includes('blueprint')) {
          setMoodColor('text-blue-400');
      } else if (path.includes('workshop') || path.includes('assembler') || path.includes('auditor') || path.includes('scribe')) {
          setMoodColor('text-amber-400');
      } else {
          setMoodColor('text-emerald-400');
      }
  }, [location]);

  const navItems = [
    // === FOUNDATION: HOME & PROJECTS ===
    { to: '/', icon: LayoutDashboard, label: t('nav.home', 'Mossy.Space') },
    { to: '/journey', icon: Sparkles, label: t('nav.modProjects', 'Mod Projects') },

    // === CORE LEARNING: GUIDES & REFERENCES ===
    { to: '/reference', icon: Book, label: t('nav.quickReference', 'Quick Reference') },
    { to: '/knowledge', icon: Bot, label: t('nav.knowledgeSearch', 'Knowledge Search') },
    { to: '/install-wizard', icon: Wrench, label: t('nav.installWizard', 'Install Wizard') },
    { to: '/platforms', icon: Library, label: t('nav.platforms', 'Platforms') },
    { to: '/crash-triage', icon: Bug, label: t('nav.crashTriage', 'Crash Triage') },
    { to: '/packaging-release', icon: Archive, label: t('nav.packagingRelease', 'Packaging & Release') },
    { to: '/ck-quest-dialogue', icon: BookOpen, label: t('nav.ckQuestDialogue', 'CK Quest & Dialogue') },
    { to: '/animation-guide', icon: Book, label: t('nav.animationGuide', 'Animation Guide') },
    { to: '/skeleton-reference', icon: Bone, label: t('nav.skeletonReference', 'Skeleton Reference') },
    { to: '/rigging-mistakes', icon: AlertCircle, label: t('nav.riggingMistakes', 'Rigging Mistakes') },
    { to: '/quest-authoring', icon: BookOpen, label: t('nav.questModAuthoring', 'Quest Mod Authoring') },
    { to: '/precombine-prp', icon: Hammer, label: t('nav.precombinePrpGuide', 'Precombine & PRP Guide') },
    { to: '/prp-patch-builder', icon: GitMerge, label: t('nav.prpPatchBuilder', 'PRP Patch Builder') },
    { to: '/leveled-list-injection', icon: List, label: t('nav.leveledListInjection', 'Leveled List Injection') },
    { to: '/lore', icon: Network, label: t('nav.lorekeeper', 'The Lorekeeper') },

    // === BUILDING TOOLS: CREATE & GENERATE ===
    { to: '/template-generator', icon: Wand2, label: t('nav.templateGenerator', 'Template Generator') },
    { to: '/script-analyzer', icon: Code, label: t('nav.scriptAnalyzer', 'Script Analyzer') },
    { to: '/assembler', icon: Package, label: t('nav.assembler', 'The Assembler') },
    { to: '/workshop', icon: Hammer, label: t('nav.workshop', 'The Workshop') },
    { to: '/blueprint', icon: DraftingCompass, label: t('nav.blueprint', 'The Blueprint') },

    // === ENHANCEMENT: ADVANCED SPECIALIZATION ===
    { to: '/rigging-checklist', icon: PenTool, label: t('nav.riggingChecklist', 'Rigging Checklist') },
    { to: '/export-settings', icon: Settings, label: t('nav.exportSettingsHelper', 'Export Settings Helper') },
    { to: '/animation-validator', icon: CheckCircle2, label: t('nav.animationValidator', 'Animation Validator') },
    { to: '/precombine-checker', icon: CheckCircle2, label: t('nav.precombineChecker', 'Precombine Checker') },

    // === QUALITY ASSURANCE: VALIDATE & VERIFY ===
    { to: '/auditor', icon: ShieldCheck, label: t('nav.auditor', 'The Auditor') },
    { to: '/scribe', icon: Feather, label: t('nav.scribe', 'The Scribe') },
    { to: '/monitor', icon: Activity, label: t('nav.systemMonitor', 'System Monitor') },

    // === EXECUTION & COLLABORATION ===
    { to: '/orchestrator', icon: GitBranch, label: t('nav.orchestrator', 'The Orchestrator') },
    { to: '/workflow-runner', icon: Workflow, label: t('nav.workflowRunner', 'Workflow Runner') },
    { to: '/holo', icon: Gamepad2, label: t('nav.holodeck', 'The Holodeck') },
    { to: '/vault', icon: Container, label: t('nav.vault', 'The Vault') },
    { to: '/memory-vault', icon: BrainCircuit, label: t('nav.memoryVault', 'Memory Vault') },
    { to: '/neural-link', icon: Zap, label: t('nav.neuralLink', 'Neural Link') },
    { to: '/capabilities', icon: Gauge, label: t('nav.localCapabilities', 'Local Capabilities') },

    // === CONTENT CREATION ===
    { to: '/images', icon: Image, label: t('nav.imageStudio', 'Image Studio') },
    { to: '/tts', icon: Mic2, label: t('nav.audioStudio', 'Audio Studio') },

    // === INTEGRATION & SUPPORT ===
    { to: '/live', icon: Radio, label: t('nav.liveSynapse', 'Live Synapse') },
    { to: '/bridge', icon: Monitor, label: t('nav.desktopBridge', 'Desktop Bridge') },
    { to: '/dedupe', icon: Copy, label: t('nav.duplicateFinder', 'Duplicate Finder') },
    { to: '/community', icon: Github, label: t('nav.communityLearning', 'Community Learning') },
    { to: '/tool-verify', icon: CheckCircle2, label: t('nav.toolVerify', 'Tool Verify') },
    { to: '/settings/privacy', icon: Settings, label: t('nav.privacySettings', 'Privacy Settings') },
    { to: '/settings/voice', icon: Volume2, label: t('nav.voiceSettings', 'Voice Settings') },
    { to: '/settings/language', icon: Map, label: t('nav.languageSettings', 'Language Settings') },
    { to: '/diagnostics', icon: Wrench, label: t('nav.diagnosticTools', 'Diagnostic Tools') },
    { to: '/support', icon: Coffee, label: t('nav.supportMossy', 'Support Mossy') },
  ];

  return (
    <div
      data-mossy-sidebar="1"
      className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full relative z-50 transition-colors duration-500"
      style={{
        width: 256,
        minWidth: 256,
        flex: '0 0 256px',
        outline: import.meta.env.DEV ? '2px solid rgba(255,0,255,0.8)' : undefined,
      }}
    >
      {/* Live Header with Persistent Avatar */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
            {/* Replaced static CSS core with the unified AvatarCore */}
            <AvatarCore className="w-12 h-12" showRings={false} />
            
            {/* Online Status Dot */}
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full transition-colors duration-500 z-20 ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
        </div>
        
        <div className="overflow-hidden flex-1">
          <h1 className="text-xl font-black italic text-white tracking-tighter leading-none">
            MOSSY<span className={`transition-colors duration-500 ${moodColor}`}>.SPACE</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
             {bridgeConnected ? (
                 <>
                    <Wifi className={`w-3 h-3 transition-colors duration-500 ${moodColor}`} />
                    <span className={`text-[10px] font-bold tracking-wider transition-colors duration-500 ${moodColor}`}>LINKED</span>
                 </>
             ) : (
                 <>
                    <WifiOff className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] text-slate-600 font-bold tracking-wider">WEB MODE</span>
                 </>
             )}
          </div>
        </div>
      </div>

      {/* Global Live Status */}
      {isActive && (
          <div className="px-4 py-2 bg-red-900/10 border-b border-red-500/20 flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {isMuted ? 'Live Muted' : 'Live Voice Active'}
                  </span>
              </div>
              <div className="flex gap-1">
                  <button 
                      onClick={toggleMute}
                      className={`p-1 rounded-full transition-colors ${isMuted ? 'text-slate-400 hover:text-white' : 'text-red-400 hover:bg-red-500/20'}`}
                      title={isMuted ? "Unmute Live Voice" : "Mute Live Voice"}
                  >
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button 
                      onClick={disconnect}
                      className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
                      title="Disconnect Voice"
                  >
                      <Power className="w-3 h-3" />
                  </button>
              </div>
          </div>
      )}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-medium group ${
                isActive 
                  ? `bg-slate-800 ${moodColor} font-bold border border-slate-700 shadow-md` 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110`} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      {/* Footer Info & Pip-Boy Toggle */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="text-[10px] text-slate-600 font-mono">CORE: v2.4.2</div>
        <button 
            onClick={togglePipBoy}
            className={`p-2 rounded-full transition-colors ${isPipBoy ? 'bg-amber-900/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500 hover:text-white border border-slate-700'}`}
            title="Toggle Pip-Boy Theme"
        >
            <Radio className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;