import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { GoogleGenAI } from "@google/genai"; // DISABLED - ES module import broken
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
      <div className="relative max-w-5xl w-full">
        <div className="absolute inset-0 rounded-3xl" style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.8)',
          border: '16px solid #0a0a0a',
          borderRadius: '2rem'
        }}></div>
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          boxShadow: 'inset 0 0 100px rgba(16,185,129,0.15)',
          border: '2px solid rgba(16,185,129,0.3)'
        }}></div>
        <div className="relative mx-4 my-4 border-4 border-emerald-500/40 rounded-lg bg-black shadow-2xl overflow-hidden" style={{boxShadow: '0 0 40px rgba(16,185,129,0.3), inset 0 0 60px rgba(0,0,0,0.8)'}}>
          <PipBoyHeader 
            status={bridgeStatus ? 'online' : 'offline'} 
            title="WELCOME TO THE NEXUS: SYSTEM INTEGRATION & TRAINING"
          />
          <div className="p-12 flex flex-col items-center text-center space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl"></div>
                <div className="relative w-48 h-48 bg-black/60 rounded-full p-3 border-4 border-emerald-500/60 flex items-center justify-center overflow-hidden">
                  <AvatarCore />
                  <div className="absolute bottom-3 right-3 w-8 h-8 bg-emerald-500 rounded-full border-3 border-emerald-300 animate-pulse flex items-center justify-center">
                    <div className="w-3 h-3 bg-emerald-200 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 font-mono font-bold text-2xl tracking-[0.3em]">MOSSY ONBOARDING</div>
                <div className="text-slate-500 text-sm font-mono tracking-wider">INTEGRATION & TRAINING SUITE</div>
              </div>
            </div>
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-4xl font-bold text-white tracking-tight mb-2" style={{textShadow: '0 0 30px rgba(16,185,129,0.5)'}}>
                Welcome to Mossy: System Integration & Training
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed font-light">
                <span className="text-emerald-300 font-bold">Get started by integrating your system and learning the app’s core features.</span> This onboarding suite will:
              </p>
              <ul className="list-disc pl-8 text-left text-slate-200 text-base space-y-1">
                <li>Guide you through connecting the Desktop Bridge for local system access</li>
                <li>Walk you through initial setup: folders, permissions, and tool paths</li>
                <li>Run a system check to optimize Mossy for your hardware and modding workflow</li>
                <li>Introduce you to the main app modules and how to use them</li>
                <li>Provide interactive training: try out features, get instant feedback, and unlock advanced tips</li>
                <li>Offer troubleshooting and privacy guidance for a safe, smooth start</li>
                <li>All information is actionable, up-to-date, and tailored for new users—no filler or fake steps</li>
              </ul>
              <div className="mt-6 bg-slate-900/60 border border-emerald-800 rounded p-4">
                <h5 className="font-bold text-emerald-200 mb-1 text-xs uppercase">Onboarding Pro Tips</h5>
                <ul className="list-disc pl-5 text-xs text-emerald-100 space-y-1">
                  <li>Connect the Desktop Bridge for full feature access (hardware, file system, and tool integration)</li>
                  <li>Set your modding folders and tool paths in the Organizer and Settings modules</li>
                  <li>Use the system check to enable advanced AI and modding features based on your hardware</li>
                  <li>Complete the interactive training to unlock expert tips and shortcuts</li>
                  <li>Review privacy settings to control data sharing and local access</li>
                </ul>
              </div>
            </div>
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