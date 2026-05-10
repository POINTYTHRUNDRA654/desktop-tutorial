import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Radio, Image, Layers, Activity, Heart, Leaf, Monitor, Wifi, WifiOff, Hammer, GitBranch, Network, Gamepad2, Container, SquareTerminal, Aperture, LayoutDashboard, Satellite, Workflow, Hexagon, DraftingCompass, Dna, Sparkles, Flame, Binary, Triangle, PenTool, FlaskConical, FileDigit, Bug, Package, Watch, ShieldCheck, Feather, Power, Volume2, VolumeX, Settings, Coffee, Book, Code, Archive, Eye, Save, FileCode as FileCodeIcon, Bot, Box, Gauge, Clock, Share2, Github, Bone, CheckCircle2, AlertCircle, BookOpen, Wrench, Copy, Star, Brain, Target, ExternalLink, Database, Wand2, Zap, Download } from 'lucide-react';
import { useLive } from './LiveContext';
import { useI18n } from './i18n';
import TourLauncher from './TourLauncher';
import AvatarCore from './AvatarCore';

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

  const liveContext = liveContextValue || { isActive: false, isMuted: false, toggleMute: () => { }, disconnect: () => { } };
  const { isActive, isMuted, toggleMute, disconnect } = liveContext;



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
    } else if (path.includes('workshop') || path.includes('assembler') || path.includes('scribe')) {
      setMoodColor('text-amber-400');
    } else {
      setMoodColor('text-emerald-400');
    }
  }, [location]);

  const navItems: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string; isExternal?: boolean }> = [
    // === FOUNDATION: HOME & PROJECTS ===
    { to: '/', icon: LayoutDashboard, label: t('nav.home', 'Mossy.Space') },
    { to: '/chat', icon: MessageSquare, label: t('nav.chat', 'AI Chat') },
    { to: '/ai-mod-assistant', icon: Code, label: t('nav.aiModAssistant', 'AI Mod Assistant') },
    { to: '/journey-hub', icon: Sparkles, label: t('nav.journeyHub', 'FO4 Mod Journey Hub') },
    { to: '/whats-new', icon: Star, label: t('nav.whatsNew', 'FO4 What\'s New') },

    // === CORE LEARNING: GUIDES & REFERENCES ===
    { to: '/knowledge-hub', icon: Book, label: t('nav.knowledgeHub', 'FO4 Knowledge Hub') },
    { to: '/memory-vault', icon: Brain, label: t('nav.memoryVault', 'Memory Vault') },
    { to: '/wizards', icon: Wrench, label: t('nav.wizards', 'Setup Wizards') },
    { to: '/ck-tools', icon: ShieldCheck, label: t('nav.ckTools', 'Creation Kit Hub') },
    { to: '/textures', icon: Layers, label: t('nav.texturesMaterials', 'Textures & Materials') },
    { to: '/packaging-release', icon: Archive, label: t('nav.packagingRelease', 'Packaging & Release') },
    { to: '/guides-hub', icon: Book, label: t('nav.guidesHub', 'Guides Hub') },

    // === BUILDING TOOLS: CREATE & GENERATE ===
    { to: '/tools/cosmos', icon: Hexagon, label: t('nav.cosmosWorkflow', 'Automation Studio') },
    { to: '/mod-builder', icon: Hammer, label: t('nav.modBuilder', 'Mod Builder') },

    // === ENHANCEMENT: ADVANCED SPECIALIZATION ===

    // === QUALITY ASSURANCE: VALIDATE & VERIFY ===
    { to: '/asset-analysis', icon: Binary, label: t('nav.assetAnalysis', 'Asset Analysis Hub') },

    // === EXECUTION & COLLABORATION ===
    { to: '/orchestrator', icon: GitBranch, label: t('nav.orchestrator', 'Automation Orchestrator') },
    { to: '/workflow-runner', icon: Workflow, label: t('nav.workflowRunner', 'Automation Runner') },

    // === CONTENT CREATION ===

    // === INTEGRATION & SUPPORT ===
    { to: '/runtime-hub', icon: Radio, label: t('nav.runtimeHub', 'Runtime Hub') },

    // === TOOL EXTENSIONS ===
    { to: '/ext-tools', icon: Package, label: t('nav.externalTools', 'External Integrations Hub') },
    { to: '/plugin-tools', icon: Database, label: t('nav.pluginTools', 'Plugin & Load Order Hub') },

    { to: '/system-hub', icon: Wrench, label: t('nav.systemHub', 'System Hub') },
    { to: '/settings', icon: Settings, label: t('nav.settings', 'Settings') },
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
        {/* Inline style guarantees 40×40 regardless of Tailwind class application */}
        <div style={{ width: 40, height: 40, minWidth: 40, flexShrink: 0, borderRadius: '9999px', overflow: 'hidden' }}>
          <AvatarCore className="w-full h-full" showRings={false} />
        </div>
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
              onClick={async () => {
                disconnect();
                // Force UI and listeners to reset after disconnect
                setTimeout(() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('mossy-ui-sync'));
                  }
                }, 100);
                // Wait a moment, then re-initialize voice service if user clicks again
                setTimeout(async () => {
                  if (!liveContext.isActive) {
                    try {
                      await liveContext.connect();
                      window.dispatchEvent(new Event('mossy-ui-sync'));
                    } catch (err) {
                      console.error('[Sidebar] Voice reconnect failed:', err);
                    }
                  }
                }, 300);
              }}
              className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
              title="Disconnect Voice"
            >
              <Power className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Main navigation menu">
        {navItems
          .filter(item => process.env.NODE_ENV !== 'production' || !item.to.startsWith('/dev'))
          .map((item) => (
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
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-medium group focus-visible ${isActive
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
            </div>
          ))}
      </nav>

      {/* Tour Launcher for Testing */}
      <TourLauncher className="mx-4 mb-4" />

    </div>
  );
};

export default Sidebar;
