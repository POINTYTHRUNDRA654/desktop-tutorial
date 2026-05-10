import React, { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, Download, Sparkles, Target } from 'lucide-react';

const FirstSuccessWizard = React.lazy(() => import('./FirstSuccessWizard'));
const ProjectHub = React.lazy(() => import('./ProjectHub'));
const RoadmapPanel = React.lazy(() => import('./RoadmapPanel'));
const ModBrowser = React.lazy(() => import('./ModBrowser'));

type JourneyTab = 'first-success' | 'projects' | 'roadmaps' | 'mods';

const tabs: Array<{ id: JourneyTab; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'first-success', label: 'First Success', sublabel: 'Onboarding wins', icon: CheckCircle2 },
  { id: 'projects', label: 'Mod Projects', sublabel: 'Project workspace', icon: Sparkles },
  { id: 'roadmaps', label: 'Roadmaps', sublabel: 'Plan progression', icon: Target },
  { id: 'mods', label: 'Mod Browser', sublabel: 'Discover mods', icon: Download },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>}>
    {children}
  </Suspense>
);

const JourneyHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<JourneyTab>('projects');

  useEffect(() => {
    const saved = sessionStorage.getItem('journey_hub_tab') as JourneyTab | null;
    if (saved && tabs.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('journey_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-black text-white tracking-tight">Journey Hub</h1>
        <p className="text-xs text-slate-400 mt-1">First Success · Mod Projects · Roadmaps · Mod Browser</p>
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`text-[10px] ${activeTab === tab.id ? 'text-emerald-400/80' : 'text-slate-600'}`}>
                {tab.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'first-success' && <PanelLoader><FirstSuccessWizard /></PanelLoader>}
        {activeTab === 'projects' && <PanelLoader><ProjectHub /></PanelLoader>}
        {activeTab === 'roadmaps' && <PanelLoader><RoadmapPanel /></PanelLoader>}
        {activeTab === 'mods' && <PanelLoader><ModBrowser /></PanelLoader>}
      </div>
    </div>
  );
};

export default JourneyHub;
