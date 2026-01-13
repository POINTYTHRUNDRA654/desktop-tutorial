import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { LayoutDashboard, Zap, Clock, Shield, Activity, Star, ArrowRight, MessageSquare, Terminal, Aperture, GitBranch, Cpu, AlertTriangle, Calendar, Bell, Gamepad2, Package, Library, Bug, Binary, BookOpen, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import PipBoyHeader from './PipBoyHeader';
import AvatarCore from './AvatarCore';
import MossyFaceAvatar from './MossyFaceAvatar';
import { useLive } from './LiveContext';

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'suggestion';
  message: string;
  action?: string;
  actionLink?: string;
}

const TheNexus: React.FC = () => {
  const [greeting, setGreeting] = useState("Initializing...");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [bridgeStatus, setBridgeStatus] = useState(false);
  const [tutorialState, setTutorialState] = useState<'start' | 'resume' | 'replay'>('start');
  
  // Get live interaction state from context
  const { isActive, mode } = useLive();

  useEffect(() => {
    // 1. Time-based Greeting (Fallout Style)
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning, Vault Dweller.");
    else if (hour < 18) setGreeting("Good Afternoon, Vault Dweller.");
    else setGreeting("Good Evening, Vault Dweller.");

    // 2. Load Local State
    const savedProject = localStorage.getItem('mossy_project');
    if (savedProject) setActiveProject(JSON.parse(savedProject));
    
    const bridge = localStorage.getItem('mossy_bridge_active') === 'true';
    setBridgeStatus(bridge);

    // 3. Check Tutorial State
    const tutStep = parseInt(localStorage.getItem('mossy_tutorial_step') || '0', 10);
    const tutCompleted = localStorage.getItem('mossy_tutorial_completed') === 'true';
    
    if (tutCompleted) {
        setTutorialState('replay');
    } else if (tutStep > 0) {
        setTutorialState('resume');
    } else {
        setTutorialState('start');
    }

    // 4. Generate Daily Briefing
    const mockInsights: Insight[] = [
          { id: '1', type: 'info', message: 'F4SE (Script Extender) requires an update check.', action: 'Verify Version', actionLink: '/organizer' },
          { id: '2', type: 'suggestion', message: '3 Papyrus scripts pending compilation in The Workshop.', action: 'Compile', actionLink: '/workshop' },
    ];

    if (!bridge) {
          mockInsights.push({ id: '3', type: 'warning', message: 'Pip-Boy Uplink (Bridge) disconnected. Local file access restricted.', action: 'Connect', actionLink: '/bridge' });
    }
    setInsights(mockInsights);
    
    // Remove fake CPU load animation - no more fake metrics
  }, []);

  const startTutorial = () => {
      const event = new CustomEvent('start-tutorial');
      window.dispatchEvent(event);
      // Optimistic update
      setTutorialState('resume'); 
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black text-slate-200 overflow-y-auto custom-scrollbar p-8">
      
      {/* Outer Monitor Bezel */}
      <div className="relative max-w-5xl w-full">
        {/* CRT Monitor Frame */}
        <div className="absolute inset-0 rounded-3xl" style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.8)',
          border: '16px solid #0a0a0a',
          borderRadius: '2rem'
        }}></div>
        
        {/* Screen Glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          boxShadow: 'inset 0 0 100px rgba(16,185,129,0.15)',
          border: '2px solid rgba(16,185,129,0.3)'
        }}></div>
      
        {/* Terminal Screen */}
        <div className="relative mx-4 my-4 border-4 border-emerald-500/40 rounded-lg bg-black shadow-2xl overflow-hidden" style={{boxShadow: '0 0 40px rgba(16,185,129,0.3), inset 0 0 60px rgba(0,0,0,0.8)'}}>
          
          {/* Pip-Boy Header */}
          <PipBoyHeader 
            status={bridgeStatus ? 'online' : 'offline'} 
            title="MOSSY PIP-BOY v2.4"
          />
        
        {/* Main Content - Centered */}
        <div className="p-12 flex flex-col items-center text-center space-y-8">
          
          {/* Avatar Section - Mossy's Face */}
          <div className="flex flex-col items-center gap-4">
            {/* Mossy Avatar - Prominent Display */}
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl"></div>
              
              {/* Avatar Face Display */}
              <div className="relative w-48 h-48 bg-black/60 rounded-full p-3 border-4 border-emerald-500/60 flex items-center justify-center overflow-hidden">
                <AvatarCore />
                
                {/* Status Indicator */}
                <div className="absolute bottom-3 right-3 w-8 h-8 bg-emerald-500 rounded-full border-3 border-emerald-300 animate-pulse flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-200 rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* Mossy Label */}
            <div className="text-center">
              <div className="text-emerald-400 font-mono font-bold text-2xl tracking-[0.3em]">MOSSY</div>
              <div className="text-slate-500 text-sm font-mono tracking-wider">AI ASSISTANT v2.4</div>
            </div>
          </div>

          {/* Greeting Section */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-center gap-2 text-emerald-400 mb-3 font-mono text-xs tracking-widest uppercase">
              <Activity className="w-4 h-4 animate-pulse" />
              MOSSY NEURAL INTERFACE ACTIVE
            </div>
            
            <h1 className="text-5xl font-bold text-white tracking-tight mb-4" style={{textShadow: '0 0 30px rgba(16,185,129,0.5)'}}>
              {greeting}
            </h1>
            
            <p className="text-slate-300 text-lg leading-relaxed font-light">
              <span className="text-emerald-300 font-bold">I'm Mossy</span>, your AI assistant dedicated to Fallout 4 modding excellence. I can help you create quests, scripts, meshes, and manage your entire mod project from concept to completion.
            </p>
            
            <p className="text-slate-500 text-sm font-mono pt-4">
              Mossy FO4 Core v2.4 online. All systems nominal.
            </p>
          </div>

          {/* Training Button */}
          <button 
            onClick={startTutorial}
            className="bg-emerald-900/30 hover:bg-emerald-800/40 px-8 py-5 rounded-lg border-2 border-emerald-500/50 hover:border-emerald-400/70 transition-all group relative overflow-hidden duration-300 mt-4"
            style={{boxShadow: '0 0 20px rgba(16,185,129,0.2)'}}
          >
            <div className="text-emerald-400 text-sm uppercase font-bold mb-2 flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" /> Q.O.A.P. DEMONSTRATION
            </div>
            <div className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
              {tutorialState === 'resume' ? 'Resume Training' : tutorialState === 'replay' ? 'Replay Training' : 'Start Training'}
            </div>
          </button>

          {/* Bridge Status */}
          <div className="pt-8 border-t border-emerald-500/20 w-full max-w-md">
            <div className={`p-4 rounded-lg flex items-center justify-center gap-3 ${bridgeStatus ? 'bg-emerald-900/20 border-2 border-emerald-500/30' : 'bg-red-900/20 border-2 border-red-500/30'}`}>
              <div className={`w-4 h-4 rounded-full ${bridgeStatus ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <div className="text-center">
                <div className={`text-base font-bold font-mono ${bridgeStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                  Desktop Bridge: {bridgeStatus ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>
          </div>

        </div>
        
        </div>
      </div>
      
    </div>
  );
};

export default TheNexus;