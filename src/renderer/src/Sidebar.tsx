import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Radio, Image, Mic2, Activity, Heart, Leaf, Monitor, Wifi, WifiOff, Hammer, GitBranch, Network, Gamepad2, Container, SquareTerminal, BrainCircuit, Aperture, LayoutDashboard, Satellite, Workflow, Hexagon, DraftingCompass, Dna, Sparkles, Flame, Binary, Triangle, PenTool, FlaskConical, Map, FileDigit, Library, Bug, Package, Watch, ShieldCheck, Feather, Power, Volume2, VolumeX } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';

const Sidebar: React.FC = () => {
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [isPipBoy, setIsPipBoy] = useState(false);
  const location = useLocation();
  const [moodColor, setMoodColor] = useState('text-emerald-400');
  
  // Consume Global Live Context
  const { isActive, isMuted, toggleMute, disconnect } = useLive();

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
      } else if (path.includes('splicer') || path.includes('blueprint') || path.includes('fabric')) {
          setMoodColor('text-blue-400');
      } else if (path.includes('workshop') || path.includes('assembler') || path.includes('auditor') || path.includes('scribe')) {
          setMoodColor('text-amber-400');
      } else {
          setMoodColor('text-emerald-400');
      }
  }, [location]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'The Nexus' },
    { to: '/chat', icon: MessageSquare, label: 'Talk to Mossy' },
    { to: '/organizer', icon: Library, label: 'The Organizer' },
    { to: '/assembler', icon: Package, label: 'The Assembler' },
    { to: '/auditor', icon: ShieldCheck, label: 'The Auditor' },
    { to: '/scribe', icon: Feather, label: 'The Scribe' },
    { to: '/crucible', icon: Bug, label: 'The Crucible' },
    { to: '/catalyst', icon: FlaskConical, label: 'The Catalyst' },
    { to: '/fabric', icon: PenTool, label: 'The Fabric' },
    { to: '/prism', icon: Triangle, label: 'The Prism' },
    { to: '/anima', icon: Flame, label: 'The Anima' },
    { to: '/reverie', icon: Sparkles, label: 'The Reverie' },
    { to: '/genome', icon: Dna, label: 'The Genome' },
    { to: '/hive', icon: Hexagon, label: 'The Hive' },
    { to: '/cartographer', icon: Map, label: 'The Cartographer' },
    { to: '/registry', icon: FileDigit, label: 'The Registry' },
    { to: '/blueprint', icon: DraftingCompass, label: 'The Blueprint' },
    { to: '/synapse', icon: Workflow, label: 'The Synapse' },
    { to: '/splicer', icon: Binary, label: 'The Splicer' },
    { to: '/lens', icon: Aperture, label: 'The Lens' },
    { to: '/conduit', icon: Satellite, label: 'The Conduit' },
    { to: '/cortex', icon: BrainCircuit, label: 'The Cortex' },
    { to: '/terminal', icon: SquareTerminal, label: 'HyperTerminal' },
    { to: '/holo', icon: Gamepad2, label: 'The Holodeck' },
    { to: '/orchestrator', icon: GitBranch, label: 'The Orchestrator' },
    { to: '/vault', icon: Container, label: 'The Vault' },
    { to: '/lore', icon: Network, label: 'The Lorekeeper' },
    { to: '/workshop', icon: Hammer, label: 'The Workshop' },
    { to: '/images', icon: Image, label: 'Image Studio' },
    { to: '/tts', icon: Mic2, label: 'Audio Studio' },
    { to: '/monitor', icon: Activity, label: 'System Map' },
    { to: '/live', icon: Radio, label: 'Live Voice' },
    { to: '/bridge', icon: Monitor, label: 'Desktop Bridge' },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full relative z-50 transition-colors duration-500">
      {/* Live Header with Persistent Avatar */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
            {/* Replaced static CSS core with the unified AvatarCore */}
            <AvatarCore className="w-12 h-12" showRings={false} />
            
            {/* Online Status Dot */}
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full transition-colors duration-500 z-20 ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
        </div>
        
        <div className="overflow-hidden flex-1">
          <h1 className="text-xl font-bold text-white tracking-tighter leading-none">
            MOSSY<span className={`transition-colors duration-500 ${moodColor}`}>.AI</span>
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