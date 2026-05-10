import React, { Suspense, useEffect, useState } from 'react';
import { Container, Coffee, Gauge, ShieldCheck, Wrench } from 'lucide-react';

const DiagnosticsHub = React.lazy(() => import('./DiagnosticsHub'));
const LocalCapabilities = React.lazy(() => import('./LocalCapabilities'));
const SecurityValidator = React.lazy(() => import('./SecurityValidator'));
const TheVault = React.lazy(() => import('./TheVault'));
const DonationSupport = React.lazy(() => import('./DonationSupport').then((m) => ({ default: m.DonationSupport })));

type SystemTab = 'diagnostics' | 'capabilities' | 'security' | 'vault' | 'support';

const tabs: Array<{ id: SystemTab; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'diagnostics', label: 'Diagnostics', sublabel: 'Troubleshoot tools', icon: Wrench },
  { id: 'capabilities', label: 'Capabilities', sublabel: 'Local AI/runtime', icon: Gauge },
  { id: 'security', label: 'Blacklist Manager', sublabel: 'Safety rules', icon: ShieldCheck },
  { id: 'vault', label: 'Asset Vault', sublabel: 'Manifest + verification', icon: Container },
  { id: 'support', label: 'Support Mossy', sublabel: 'Support links', icon: Coffee },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>}>
    {children}
  </Suspense>
);

const SystemHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SystemTab>('diagnostics');

  useEffect(() => {
    const saved = sessionStorage.getItem('system_hub_tab') as SystemTab | null;
    if (saved && tabs.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('system_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-black text-white tracking-tight">FO4 System &amp; Diagnostics Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Diagnostics · Capabilities · Blacklist Manager · Asset Vault · Support</p>
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
        {activeTab === 'diagnostics' && <PanelLoader><DiagnosticsHub /></PanelLoader>}
        {activeTab === 'capabilities' && <PanelLoader><LocalCapabilities /></PanelLoader>}
        {activeTab === 'security' && <PanelLoader><SecurityValidator /></PanelLoader>}
        {activeTab === 'vault' && <PanelLoader><TheVault /></PanelLoader>}
        {activeTab === 'support' && <PanelLoader><DonationSupport /></PanelLoader>}
      </div>
    </div>
  );
};

export default SystemHub;
