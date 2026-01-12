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
  const [systemLoad, setSystemLoad] = useState(34);
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
    
    // 5. Fake live load
    const interval = setInterval(() => {
        setSystemLoad(prev => Math.min(100, Math.max(10, prev + (Math.random() * 10 - 5))));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startTutorial = () => {
      const event = new CustomEvent('start-tutorial');
      window.dispatchEvent(event);
      // Optimistic update
      setTutorialState('resume'); 
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-y-auto custom-scrollbar p-8">
      
      {/* Pip-Boy Header */}
      <PipBoyHeader 
        status={bridgeStatus ? 'online' : 'offline'} 
        title="MOSSY PIP-BOY v2.4"
      />
      
      {/* Hero Section with Avatar */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Avatar Section - Mossy's Face */}
          <div className="flex flex-col items-center gap-4">
              {/* Mossy Avatar - Prominent Display */}
              <div className="relative">
                  {/* Outer blue glow border */}
                  <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl"></div>
                  <div className="absolute inset-0 border-2 border-blue-400/50 rounded-full"></div>
                  
                  {/* Avatar Face Display */}
                  <div className="relative w-40 h-40 bg-black/40 rounded-full p-2 border-2 border-blue-400/60 flex items-center justify-center overflow-hidden">
                      <MossyFaceAvatar mode={mode as any} isActive={isActive} />
                      
                      {/* Status Indicator */}
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-emerald-300 animate-pulse flex items-center justify-center">
                          <div className="w-2 h-2 bg-emerald-200 rounded-full"></div>
                      </div>
                  </div>
              </div>
              
              {/* Mossy Label */}
              <div className="text-center">
                  <div className="text-blue-400 font-mono font-bold text-lg tracking-widest">MOSSY</div>
                  <div className="text-slate-500 text-xs font-mono">AI ASSISTANT v2.4</div>
              </div>
          </div>

          {/* Greeting and Status Section */}
          <div className="flex-1">
              <div className="flex items-center gap-2 text-blue-400 mb-2 font-mono text-xs tracking-widest uppercase">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Mossy Neural Interface Active
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2" style={{textShadow: '0 0 20px rgba(100,200,255,0.4)'}}>
                  {greeting}
              </h1>
              <p className="text-slate-300 max-w-lg mb-4 font-mono text-sm leading-relaxed">
                  <span className="text-blue-300 font-bold">I'm Mossy</span>, your AI assistant dedicated to Fallout 4 modding excellence. I can help you create quests, scripts, meshes, and manage your entire mod project from concept to completion.
              </p>
              <p className="text-slate-500 max-w-lg mb-6 text-xs">
                  Mossy FO4 Core v2.4 online. All systems nominal.
              </p>
              
              {/* Quick Status Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-black/30 border border-emerald-500/30 p-3 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase font-mono mb-1">CPU Load</div>
                      <div className="text-sm font-mono text-emerald-400">{systemLoad.toFixed(0)}%</div>
                  </div>
                  <div className={`bg-black/30 border p-3 rounded-lg ${bridgeStatus ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                      <div className="text-xs text-slate-500 uppercase font-mono mb-1">Bridge</div>
                      <div className={`text-sm font-mono ${bridgeStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                          {bridgeStatus ? 'ONLINE' : 'OFFLINE'}
                      </div>
                  </div>
              </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
              <button 
                  onClick={startTutorial}
                  className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl border border-emerald-500/40 hover:border-emerald-400/60 min-w-[160px] text-left transition-all group relative overflow-hidden duration-300"
                  style={{boxShadow: '0 0 15px rgba(0,255,0,0.1)'}}
              >
                  <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      {tutorialState === 'resume' ? <PlayCircle className="w-12 h-12" /> : <BookOpen className="w-12 h-12" />}
                  </div>
                  <div className="text-emerald-400 text-xs uppercase font-bold mb-1 flex items-center gap-2 relative z-10">
                      <BookOpen className="w-3 h-3" /> G.O.A.T. Orientation
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors relative z-10">
                      {tutorialState === 'resume' ? 'Resume Training' : tutorialState === 'replay' ? 'Replay Training' : 'Start Training'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 relative z-10">
                      {tutorialState === 'resume' ? 'Continue session' : 'Learn the systems'}
                  </div>
              </button>

              <div className="bg-slate-800 p-4 rounded-xl border border-emerald-500/30 min-w-[160px]" style={{boxShadow: '0 0 10px rgba(0,255,0,0.05)'}}>
                  <div className="text-emerald-400 text-xs uppercase font-bold mb-2 font-mono">Reactor Output</div>
                  <div className="text-2xl font-mono text-emerald-400" style={{textShadow: '0 0 10px rgba(0,255,0,0.5)'}}>{systemLoad.toFixed(0)}%</div>
                  <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden border border-emerald-500/20">
                      <div className="bg-gradient-to-r from-emerald-500 to-lime-400 h-full transition-all duration-500" style={{width: `${systemLoad}%`, boxShadow: '0 0 8px rgba(0,255,0,0.6)'}}></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Briefing & Project */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Daily Briefing Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="w-32 h-32 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-yellow-400" /> Overseer's Feed
                  </h2>
                  <div className="space-y-3 relative z-10">
                      {insights.map(insight => (
                          <div key={insight.id} className="bg-black/20 backdrop-blur rounded-xl p-4 border border-white/5 flex items-start gap-4 hover:bg-black/30 transition-colors">
                              <div className={`mt-1 p-1.5 rounded-full ${
                                  insight.type === 'warning' ? 'bg-red-500/20 text-red-400' :
                                  insight.type === 'suggestion' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                  {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                                   insight.type === 'suggestion' ? <Star className="w-4 h-4" /> :
                                   <CheckCircle2 className="w-4 h-4" />}
                              </div>
                              <div className="flex-1">
                                  <p className="text-slate-200 text-sm leading-relaxed">{insight.message}</p>
                                  {insight.action && (
                                      <Link to={insight.actionLink || '#'} className="inline-flex items-center gap-1 text-xs font-bold text-forge-accent mt-2 hover:underline">
                                          {insight.action} <ArrowRight className="w-3 h-3" />
                                      </Link>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Active Project Card */}
              <div className="bg-forge-panel rounded-3xl p-6 border border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <GitBranch className="w-5 h-5 text-purple-400" /> Active Mod Project
                      </h2>
                      <Link to="/workshop" className="text-xs text-slate-400 hover:text-white">View All</Link>
                  </div>
                  
                  {activeProject ? (
                      <div className="bg-slate-800 rounded-xl p-5 border border-slate-600">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-bold text-white">{activeProject.name}</h3>
                              <span className="px-2 py-0.5 bg-green-900 text-green-300 text-[10px] uppercase font-bold rounded">Active</span>
                          </div>
                          <p className="text-sm text-slate-400 mb-4 line-clamp-2">{activeProject.notes}</p>
                          <div className="flex gap-4 text-xs text-slate-500 font-mono">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created: {activeProject.timestamp}</span>
                              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Status: {activeProject.status}</span>
                          </div>
                          <div className="mt-4 flex gap-2">
                              <Link to="/workshop" className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg text-center transition-colors">
                                  Open Workbench
                              </Link>
                              <Link to="/assembler" className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded-lg text-center transition-colors">
                                  Build FOMOD
                              </Link>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                          <p className="mb-2">No active project initialized.</p>
                          <Link to="/chat" className="text-forge-accent hover:underline text-sm font-bold">Ask Mossy to start one</Link>
                      </div>
                  )}
              </div>
          </div>

          {/* Right Column: Quick Launch */}
          <div className="space-y-6">
              <div className="bg-forge-panel rounded-3xl p-6 border border-slate-700 h-full">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-forge-accent" /> Quick Launch
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4">
                      
                      <Link to="/chat" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-emerald-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <MessageSquare className="w-5 h-5 text-emerald-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Chat</span>
                      </Link>

                      <Link to="/workshop" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-purple-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Terminal className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Scripting</span>
                      </Link>

                      <Link to="/organizer" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-yellow-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Library className="w-5 h-5 text-yellow-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Organizer</span>
                      </Link>

                      <Link to="/crucible" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-red-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Bug className="w-5 h-5 text-red-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Crucible</span>
                      </Link>

                      <Link to="/registry" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-blue-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Aperture className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Registry</span>
                      </Link>

                      <Link to="/holo" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-600 hover:border-pink-500 transition-all group flex flex-col items-center justify-center text-center gap-2 aspect-square">
                          <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Gamepad2 className="w-5 h-5 text-pink-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">Holodeck</span>
                      </Link>
                      
                  </div>
                  
                  {/* System Status Mini */}
                  <div className="mt-6 pt-6 border-t border-slate-700">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">System Bridge</h3>
                      <div className={`p-3 rounded-xl flex items-center gap-3 ${bridgeStatus ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
                          <div className={`w-3 h-3 rounded-full ${bridgeStatus ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                          <div>
                              <div className={`text-sm font-bold ${bridgeStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {bridgeStatus ? 'Connected' : 'Disconnected'}
                              </div>
                              <div className="text-[10px] text-slate-500">Localhost:21337</div>
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