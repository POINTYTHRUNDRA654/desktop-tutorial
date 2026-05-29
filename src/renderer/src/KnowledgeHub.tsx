/**
 * Knowledge Hub
 *
 * Unified platform for all knowledge lookup, search, and learning in Mossy.
 * Consolidates: Quick Reference · Knowledge Search · Community Learning
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Book, Bot, GitBranch, Package } from 'lucide-react';

const QuickReference = React.lazy(() =>
  import('./QuickReference').then((m) => ({ default: m.QuickReference }))
);
const KnowledgeSearch = React.lazy(() => import('./KnowledgeSearch'));
const CommunityLearning = React.lazy(() => import('./CommunityLearning'));
const VanillaAssetBrowser = React.lazy(() =>
  import('./VanillaAssetBrowser').then((m) => ({ default: m.VanillaAssetBrowser }))
);

type HubTab = 'reference' | 'search' | 'community' | 'vanilla';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'reference', icon: Book, label: 'Quick Reference', sublabel: 'Papyrus · FormIDs · Hotkeys' },
  { id: 'search', icon: Bot, label: 'Knowledge Search', sublabel: 'Semantic search · Ollama' },
  { id: 'community', icon: GitBranch, label: 'Community Learning', sublabel: 'Tips · Shared knowledge' },
  { id: 'vanilla', icon: Package, label: 'Vanilla Assets', sublabel: 'Browse · Copy · Reference' },
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

const KnowledgeHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('reference');
  const tabStorageKey = 'knowledge_hub_tab';

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(tabStorageKey) as HubTab | null;
      if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
    } catch {
      // ignore storage access failures in restricted environments
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(tabStorageKey, activeTab);
    } catch {
      // ignore storage access failures in restricted environments
    }
  }, [activeTab]);
  // ── Keyboard shortcuts (1-N) ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && n <= TAB_DEFS.length) setActiveTab(TAB_DEFS[n - 1].id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Book className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Knowledge Hub</h1>
            <p className="text-xs text-slate-400">Quick Reference · Semantic Search · Community Learning · Vanilla Assets</p>
          </div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TAB_DEFS.map((tab, idx) => (
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

      {/* Tab Content */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'vanilla' ? '' : 'overflow-y-auto p-6'}`}>
        {activeTab === 'reference' && (
          <PanelLoader>
            <QuickReference />
          </PanelLoader>
        )}
        {activeTab === 'search' && (
          <PanelLoader>
            <KnowledgeSearch />
          </PanelLoader>
        )}
        {activeTab === 'community' && (
          <PanelLoader>
            <CommunityLearning />
          </PanelLoader>
        )}
        {activeTab === 'vanilla' && (
          <PanelLoader>
            <VanillaAssetBrowser />
          </PanelLoader>
        )}
      </div>
    </div>
  );
};

export default KnowledgeHub;
