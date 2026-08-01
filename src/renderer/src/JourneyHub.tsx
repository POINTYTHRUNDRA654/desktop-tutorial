import React, { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, Download, Sparkles, Target } from 'lucide-react';
import { useI18n } from './i18n';

const FirstSuccessWizard = React.lazy(() => import('./FirstSuccessWizard'));
const ProjectHub = React.lazy(() => import('./ProjectHub'));
const RoadmapPanel = React.lazy(() => import('./RoadmapPanel'));
const ModBrowser = React.lazy(() => import('./ModBrowser'));

type JourneyTab = 'first-success' | 'projects' | 'roadmaps' | 'mods';

const TAB_META: Array<{ id: JourneyTab; key: string; fallbackLabel: string; fallbackSublabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'first-success', key: 'firstSuccess', fallbackLabel: 'First Success', fallbackSublabel: 'Onboarding wins', icon: CheckCircle2 },
  { id: 'projects', key: 'projects', fallbackLabel: 'Mod Projects', fallbackSublabel: 'Project workspace', icon: Sparkles },
  { id: 'roadmaps', key: 'roadmaps', fallbackLabel: 'Roadmaps', fallbackSublabel: 'Plan progression', icon: Target },
  { id: 'mods', key: 'mods', fallbackLabel: 'Mod Browser', fallbackSublabel: 'Discover mods', icon: Download },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">{t('common.loading', 'Loading…')}</div>}>
      {children}
    </Suspense>
  );
};

const JourneyHub: React.FC = () => {
  const { t } = useI18n();
  const tabs = TAB_META.map((tab) => ({
    ...tab,
    label: t(`journeyHub.tabs.${tab.key}.label`, tab.fallbackLabel),
    sublabel: t(`journeyHub.tabs.${tab.key}.sublabel`, tab.fallbackSublabel),
  }));
  const [activeTab, setActiveTab] = useState<JourneyTab>('projects');

  useEffect(() => {
    const saved = sessionStorage.getItem('journey_hub_tab') as JourneyTab | null;
    if (saved && tabs.some((tab) => tab.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('journey_hub_tab', activeTab);
  }, [activeTab]);
  // ── Keyboard shortcuts (1-N) ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && n <= tabs.length) setActiveTab(tabs[n - 1].id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-black text-white tracking-tight">{t('journeyHub.title', 'FO4 Mod Journey Hub')}</h1>
        <p className="text-xs text-slate-400 mt-1">{t('journeyHub.subtitle', 'First Success · Mod Projects · Roadmaps · Mod Browser')}</p>
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {tabs.map((tab, idx) => (
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
              <kbd className={`ml-1 text-[9px] font-mono px-1 rounded border ${activeTab === tab.id ? 'border-emerald-500/30 text-emerald-500/60' : 'border-slate-700 text-slate-700'}`}>{idx + 1}</kbd>
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
