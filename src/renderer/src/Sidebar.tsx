import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Radio, Image, Mic2, Activity, Heart, Leaf, Monitor, Wifi, WifiOff, Hammer, GitBranch, Network, Gamepad2, Container, SquareTerminal, BrainCircuit, Aperture, LayoutDashboard, Satellite, Workflow, Hexagon, DraftingCompass, Dna, Sparkles, Flame, Binary, Triangle, PenTool, FlaskConical, Map, FileDigit, Library, Bug, Package, Watch, ShieldCheck, Feather, Power, Volume2, VolumeX, Settings, Coffee, Book, Code, Wand2, Archive, Eye, Save, List, FileCode as FileCodeIcon, Bot, Box, Gauge, Zap, GitMerge, Clock, Share2, Github, Bone, CheckCircle2, AlertCircle, BookOpen, Wrench, Copy, Star, ArrowDownToLine, Brain, Target, ExternalLink, Globe, Trophy } from 'lucide-react';
import { useLive } from './LiveContext';
import { useI18n } from './i18n';
import TourLauncher from './TourLauncher';
import { useFavorites } from './useFavorites';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onToggle, onClose }) => {
  const [bridgeConnected, setBridgeConnected] = useState(false);
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

  // Favorites functionality
  const { favorites, toggleFavorite, isFavorite } = useFavorites();


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
    { to: '/chat', icon: MessageSquare, label: t('nav.chat', 'AI Chat') },
    { to: '/first-success', icon: CheckCircle2, label: t('nav.firstSuccess', 'First Success') },
    { to: '/roadmap', icon: Target, label: t('nav.roadmap', 'Modding Roadmaps') },
    { to: '/journey', icon: Sparkles, label: t('nav.modProjects', 'Mod Projects') },
    { to: '/project/achievements', icon: Trophy, label: t('nav.achievements', 'Achievements') },

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
    { to: '/tools', icon: Wrench, label: t('nav.tools', 'Tools') },
    { to: '/tools/cosmos', icon: Hexagon, label: t('nav.cosmosWorkflow', 'Cosmos Workflow') },
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
    { to: '/tools/mining', icon: Binary, label: t('nav.miningDashboard', 'Mining Dashboard') },
    { to: '/tools/advanced-analysis', icon: Brain, label: t('nav.advancedAnalysis', 'Advanced Analysis') },
    { to: '/scribe', icon: Feather, label: t('nav.scribe', 'The Scribe') },
    { to: '/monitor', icon: Activity, label: t('nav.systemMonitor', 'System Monitor') },

    // === EXECUTION & COLLABORATION ===
    { to: '/orchestrator', icon: GitBranch, label: t('nav.orchestrator', 'The Orchestrator') },
    { to: '/workflow-runner', icon: Workflow, label: t('nav.workflowRunner', 'Workflow Runner') },
    { to: '/holo', icon: Gamepad2, label: t('nav.holodeck', 'The Holodeck') },
    { to: '/vault', icon: Container, label: t('nav.vault', 'The Vault') },
    { to: '/memory-vault', icon: BrainCircuit, label: t('nav.memoryVault', 'Memory Vault') },
    { to: '/neural-link', icon: Zap, label: t('nav.neuralLink', 'Neural Link') },
    { to: '/tools/ba2-manager', icon: Archive, label: t('nav.ba2Manager', 'BA2 Manager') },
    { to: '/dev/workflow-recorder', icon: Clock, label: t('nav.workflowRecorder', 'Workflow Recorder') },
    { to: '/dev/plugin-manager', icon: Package, label: t('nav.pluginManager', 'Plugin Manager') },
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
    { to: '/settings/import-export', icon: ArrowDownToLine, label: t('nav.settingsImportExport', 'Settings Import/Export') },
    { to: '/diagnostics', icon: Wrench, label: t('nav.diagnosticTools', 'Diagnostic Tools') },
    { to: '/support', icon: Coffee, label: t('nav.supportMossy', 'Support Mossy') },

    // === EXTERNAL RESOURCES ===
    { to: 'https://fallout.fandom.com/wiki/Fallout_4_portal', icon: Globe, label: 'Fallout 4 Wiki', isExternal: true },
  ];

  return (
    <div
      id="sidebar-navigation"
      data-mossy-sidebar="1"
      data-tour="sidebar"
      className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full relative z-50 transition-all duration-300 ${isOpen ? 'sidebar-open' : ''}`}
      style={{
        width: 256,
        minWidth: 256,
        flex: '0 0 256px',
        outline: import.meta.env.DEV ? '2px solid rgba(255,0,255,0.8)' : undefined,
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Live Header with Persistent Avatar */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="overflow-hidden flex-1">
          <h1 className="text-lg font-black italic text-white tracking-tighter leading-none">
            MOSSY<span className={`transition-colors duration-500 ${moodColor}`}>.SPACE</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
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
        <div className={`w-2.5 h-2.5 rounded-full border border-slate-900 ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
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
                      data-tour="voice-toggle"
                      data-testid="voice-toggle"
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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Main navigation menu">
        {/* Mobile close button */}
        <button
          type="button"
          className="w-full mb-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors md:hidden focus-visible"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          ✕ Close Menu
        </button>

        {navItems.map((item) => (
          <div key={item.to} className="relative group">
            {item.isExternal ? (
                <a
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white group focus-visible"
                >
                  <item.icon className="w-4 h-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-emerald-400" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            ) : (
                <NavLink
                  to={item.to}
                  data-testid={`nav-${item.to.replace('/', '').replace('/', '-')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-medium group focus-visible ${
                      isActive
                        ? `bg-slate-800 ${moodColor} font-bold border border-slate-700 shadow-md`
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                  onClick={onClose} // Close sidebar on mobile when navigating
                >
                  <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110`} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
            )}
            {!item.isExternal && (
                <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite({
                    id: item.to,
                    label: item.label,
                    path: item.to
                    });
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isFavorite(item.to)
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
                title={isFavorite(item.to) ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <Star className={`w-3 h-3 ${isFavorite(item.to) ? 'fill-current' : ''}`} />
                </button>
            )}
          </div>
        ))}
      </nav>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Favorites</span>
          </div>
          <div className="space-y-1">
            {favorites.map((fav) => {
              const navItem = navItems.find(item => item.to === fav.path);
              if (!navItem) return null;
              
              return (
                <NavLink
                  key={`fav-${fav.id}`}
                  to={fav.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs font-medium focus-visible ${
                      isActive
                        ? `bg-slate-800 ${moodColor} font-bold border border-slate-700 shadow-md`
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                  onClick={onClose}
                >
                  <navItem.icon className="w-4 h-4" aria-hidden="true" />
                  <span className="flex-1">{fav.label}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite({
                        id: fav.id,
                        label: fav.label,
                        path: fav.path
                      });
                    }}
                    className="p-1 rounded text-yellow-400 hover:text-yellow-300 opacity-60 hover:opacity-100 transition-opacity"
                    title="Remove from favorites"
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Tour Launcher for Testing */}
      <TourLauncher className="mx-4 mb-4" />
      
    </div>
  );
};

export default Sidebar;