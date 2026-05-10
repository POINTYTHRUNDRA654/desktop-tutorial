import React, { Suspense, useEffect, useState } from 'react';
import { Gamepad2, Monitor, Radio } from 'lucide-react';

const VoiceChat = React.lazy(() => import('./VoiceChat'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Holodeck = React.lazy(() => import('./Holodeck'));

type RuntimeTab = 'live' | 'bridge' | 'testing';

const tabs: Array<{ id: RuntimeTab; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'live', label: 'Live Synapse', sublabel: 'Voice + live assist', icon: Radio },
  { id: 'bridge', label: 'Desktop Bridge', sublabel: 'App integration', icon: Monitor },
  { id: 'testing', label: 'Holodeck', sublabel: 'Scenario testing', icon: Gamepad2 },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>}>
    {children}
  </Suspense>
);

const RuntimeHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RuntimeTab>('live');

  useEffect(() => {
    const saved = sessionStorage.getItem('runtime_hub_tab') as RuntimeTab | null;
    if (saved && tabs.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('runtime_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-black text-white tracking-tight">Runtime Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Live Synapse · Desktop Bridge · Holodeck Testing</p>
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
        {activeTab === 'live' && <PanelLoader><VoiceChat /></PanelLoader>}
        {activeTab === 'bridge' && <PanelLoader><DesktopBridge /></PanelLoader>}
        {activeTab === 'testing' && <PanelLoader><Holodeck /></PanelLoader>}
      </div>
    </div>
  );
};

export default RuntimeHub;
