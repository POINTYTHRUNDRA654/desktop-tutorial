import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { GoogleGenAI } from "@google/genai"; // DISABLED - ES module import broken
import { Zap, Package, Hammer, Radio } from 'lucide-react';
import AvatarCore from './AvatarCore';
import { useLive } from './LiveContext';

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'suggestion';
  message: string;
  action?: string;
  actionLink?: string;
}

const TheNexus: React.FC = () => {
  const [greeting, setGreeting] = useState("Initializing Link...");
  const [activeProject, setActiveProject] = useState<any>(null);
  const [bridgeStatus, setBridgeStatus] = useState(false);
  
  // Get live interaction state from context
  const { isActive, mode, volume } = useLive();

  useEffect(() => {
    // 1. Time-based Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("CORE INITIALIZED. GOOD MORNING.");
    else if (hour < 18) setGreeting("CORE INITIALIZED. GOOD AFTERNOON.");
    else setGreeting("CORE INITIALIZED. GOOD EVENING.");

    // 2. Load Local State
    const savedProject = localStorage.getItem('mossy_project');
    if (savedProject) setActiveProject(JSON.parse(savedProject));
    
    const bridge = localStorage.getItem('mossy_bridge_active') === 'true';
    setBridgeStatus(bridge);
  }, []);

  return (
    <div 
      className="h-full w-full flex flex-col relative overflow-hidden bg-black font-mono transition-all duration-700"
    >
      {/* Background Image - THE FACE */}
      <div 
        className="absolute inset-0 z-0 opacity-40 transition-transform duration-[20s] animate-pulse"
        style={{
            backgroundImage: 'url("/mossy-avatar.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${1.05 + (volume/1000)})`
        }} 
      />
      
      {/* HUD Overlays */}
      <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_150%)] pointer-events-none scale-150" />
      
      {/* Digital Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-20" />

      {/* Main UI Container */}
      <div className="relative z-20 flex-1 flex flex-col p-12">
        <div className="flex justify-between items-start mb-12">
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
                    Mossy<span className="text-blue-500">.Space</span>
                </h1>
                <p className="text-blue-400 text-xs tracking-[0.3em] font-bold mt-2">NEURAL ENVIRONMENT • 1.0.4-STABLE</p>
            </div>
            <div className={`px-4 py-2 border rounded-full text-[10px] font-bold tracking-widest transition-all ${bridgeStatus ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                {bridgeStatus ? 'UPLINK SYNCED' : 'UPLINK REQUIRED'}
            </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
            <div className="relative group">
                {/* Glow effect */}
                <div className={`absolute inset-[-40px] rounded-full blur-[100px] transition-all duration-1000 ${isActive ? 'bg-blue-500/30' : 'bg-blue-500/5'}`} />
                
                <div className="flex flex-col items-center gap-6">
                    <AvatarCore className="w-64 h-64 border-2 border-blue-500/30 shadow-[0_0_100px_rgba(59,130,246,0.2)]" showRings={true} />
                    
                    <div className="text-center">
                        <div className="text-3xl font-black text-white bg-black/40 backdrop-blur-md px-6 py-2 rounded border border-white/10 uppercase tracking-widest mb-2">
                            {greeting}
                        </div>
                        <p className="text-blue-400/60 text-xs font-bold tracking-widest uppercase italic">The Neural link is active and monitoring your workspace</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Quick Jump Core Modules */}
        <div className="grid grid-cols-4 gap-4 mt-auto">
            {[
                { label: 'Neural Link', path: '/neural-link', icon: Zap, detail: 'Process Monitor' },
                { label: 'The Workshop', path: '/workshop', icon: Hammer, detail: 'Script Compiler' },
                { label: 'The Vault', path: '/vault', icon: Package, detail: 'Asset Explorer' },
                { label: 'Live Synapse', path: '/live', icon: Radio, detail: 'Voice Uplink' }
            ].map((module, idx) => (
                <Link 
                    key={idx} 
                    to={module.path}
                    className="group bg-black/40 backdrop-blur-md border border-white/5 hover:border-blue-500/50 p-6 transition-all rounded-xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-blue-500 transition-all duration-300" />
                    <module.icon className="w-5 h-5 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white uppercase tracking-widest mb-1">{module.label}</div>
                    <div className="text-[9px] text-blue-400/40 font-bold uppercase tracking-widest">{module.detail}</div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TheNexus;