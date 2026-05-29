import React, { Suspense, useEffect, useState } from 'react';
import { Gamepad2, Monitor, Radio } from 'lucide-react';

const VoiceChat = React.lazy(() => import('./VoiceChat'));
const DesktopBridge = React.lazy(() => import('./DesktopBridge'));
const Holodeck = React.lazy(() => import('./Holodeck'));

type RuntimeTab = 'live' | 'bridge' | 'testing';

const tabs: Array<{
  id: RuntimeTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'live',    label: 'Live Synapse',   sublabel: 'Voice + live assist', icon: Radio },
  { id: 'bridge',  label: 'Desktop Bridge', sublabel: 'App integration',     icon: Monitor },
  { id: 'testing', label: 'Holodeck',       sublabel: 'Scenario testing',    icon: Gamepad2 },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" />
          Loading module…
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
);

const RuntimeHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RuntimeTab>('live');
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [blenderLinked, setBlenderLinked] = useState(false);

  // ── Persistent tab — localStorage so it survives full app reloads ──────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('runtime_hub_tab') as RuntimeTab | null;
      if (saved && tabs.some((t) => t.id === saved)) setActiveTab(saved);
    } catch { /* sandbox may block */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('runtime_hub_tab', activeTab); } catch { /* ignore */ }
  }, [activeTab]);

  // ── Connection status badges ───────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try {
        setBridgeOnline(localStorage.getItem('mossy_bridge_active') === 'true');
        setBlenderLinked(localStorage.getItem('mossy_blender_active') === 'true');
      } catch { /* ignore */ }
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('mossy-bridge-connected', sync);
    window.addEventListener('mossy-blender-linked', sync);
    const interval = setInterval(sync, 5000);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('mossy-bridge-connected', sync);
      window.removeEventListener('mossy-blender-linked', sync);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">

        {/* ── Title row + live status chips ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Runtime Hub</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live Synapse · Desktop Bridge · Holodeck testing workflows
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bridge chip */}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${
                bridgeOnline
                  ? 'border-emerald-700/60 text-emerald-300 bg-emerald-900/20'
                  : 'border-slate-700/50 text-slate-500 bg-slate-900/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  bridgeOnline
                    ? 'bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              Bridge {bridgeOnline ? 'Online' : 'Offline'}
            </span>

            {/* Blender chip — only visible when linked */}
            {blenderLinked && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-orange-700/60 text-orange-300 bg-orange-900/20 text-[10px] font-mono font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_#fb923c] animate-pulse flex-shrink-0" />
                Blender Linked
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            // Per-tab badge dot
            let dotColor = '';
            if (tab.id === 'bridge') {
              dotColor = bridgeOnline ? 'bg-emerald-400 shadow-[0_0_4px_#34d399] animate-pulse' : 'bg-slate-700';
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {tab.label}
                <span className={`text-[10px] ${isActive ? 'text-emerald-400/80' : 'text-slate-600'}`}>
                  {tab.sublabel}
                </span>
                {dotColor && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'live'    && <PanelLoader><VoiceChat /></PanelLoader>}
        {activeTab === 'bridge'  && <PanelLoader><DesktopBridge /></PanelLoader>}
        {activeTab === 'testing' && <PanelLoader><Holodeck /></PanelLoader>}
      </div>
    </div>
  );
};

export default RuntimeHub;
