import React, { Suspense, useEffect, useState } from 'react';
import { Book, BookOpen, Network } from 'lucide-react';

const BlenderAnimationGuide = React.lazy(() => import('./BlenderAnimationGuide').then((m) => ({ default: m.BlenderAnimationGuide })));
const QuestModAuthoringGuide = React.lazy(() => import('./QuestModAuthoringGuide').then((m) => ({ default: m.QuestModAuthoringGuide })));
const Lorekeeper = React.lazy(() => import('./Lorekeeper'));

type GuidesTab = 'animation' | 'quest' | 'lod';

const tabs: Array<{ id: GuidesTab; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'animation', label: 'Animation & Rigging', sublabel: 'Blender + Havok', icon: Book },
  { id: 'quest', label: 'Quest Authoring', sublabel: 'CK + Papyrus + F4SE', icon: BookOpen },
  { id: 'lod', label: 'LOD & Precombine', sublabel: 'xLODGen + DynDOLOD + PRP', icon: Network },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>}>
    {children}
  </Suspense>
);

const GuidesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GuidesTab>('animation');

  useEffect(() => {
    const saved = sessionStorage.getItem('guides_hub_tab') as GuidesTab | null;
    if (saved && tabs.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('guides_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-black text-white tracking-tight">FO4 Guides Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Animation & Rigging · Quest Authoring · LOD & Precombine</p>
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
        {activeTab === 'animation' && <PanelLoader><BlenderAnimationGuide /></PanelLoader>}
        {activeTab === 'quest' && <PanelLoader><QuestModAuthoringGuide /></PanelLoader>}
        {activeTab === 'lod' && <PanelLoader><Lorekeeper /></PanelLoader>}
      </div>
    </div>
  );
};

export default GuidesHub;
