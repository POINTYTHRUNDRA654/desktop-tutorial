/**
 * FO4 Mod Builder Hub
 *
 * Unified platform for mod creation workflow:
 * Blueprint (planning) · Workshop (file browser + compile) · Devtools (scripts) · Scribe (docs)
 */

import React, { useState, useEffect, Suspense } from 'react';
import { DraftingCompass, Hammer, Code, Feather, FolderPlus } from 'lucide-react';

const TheBlueprint = React.lazy(() => import('./TheBlueprint'));
const Workshop = React.lazy(() => import('./Workshop'));
const DevtoolsHub = React.lazy(() => import('./DevtoolsHub'));
const TheScribe = React.lazy(() =>
  import('./TheScribeEnhanced').then((m) => ({ default: m.TheScribe }))
);
const ProjectCreator = React.lazy(() =>
  import('./ProjectCreator').then((m) => ({ default: m.ProjectCreator }))
);

type HubTab = 'blueprint' | 'workshop' | 'devtools' | 'scribe' | 'creator';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'blueprint', icon: DraftingCompass, label: 'Blueprint', sublabel: 'Mod architecture planner' },
  { id: 'workshop', icon: Hammer, label: 'Workshop', sublabel: 'File browser · Compile' },
  { id: 'devtools', icon: Code, label: 'Devtools', sublabel: 'Papyrus scripts' },
  { id: 'scribe', icon: Feather, label: 'Scribe', sublabel: 'Documentation generator' },
  { id: 'creator', icon: FolderPlus, label: 'Project Creator', sublabel: 'New mod scaffold' },
];

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
    }
  >
    {children}
  </Suspense>
);

const ModBuilderHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('blueprint');

  useEffect(() => {
    const saved = sessionStorage.getItem('builder_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('builder_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2">
            <Hammer className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Mod Builder Hub</h1>
            <p className="text-xs text-slate-400">
              Blueprint · Workshop · Devtools · Scribe — complete Fallout 4 mod creation workflow
            </p>
          </div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TAB_DEFS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`text-[10px] ${activeTab === tab.id ? 'text-amber-400/80' : 'text-slate-600'}`}>
                {tab.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'blueprint' && (
          <PanelLoader>
            <TheBlueprint />
          </PanelLoader>
        )}
        {activeTab === 'workshop' && (
          <PanelLoader>
            <Workshop />
          </PanelLoader>
        )}
        {activeTab === 'devtools' && (
          <PanelLoader>
            <DevtoolsHub />
          </PanelLoader>
        )}
        {activeTab === 'scribe' && (
          <PanelLoader>
            <TheScribe />
          </PanelLoader>
        )}
        {activeTab === 'creator' && (
          <PanelLoader>
            <ProjectCreator />
          </PanelLoader>
        )}
      </div>
    </div>
  );
};

export default ModBuilderHub;
