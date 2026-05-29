/**
 * GuidesHub - FO4 Guides Hub (All Domains)
 *
 * Central navigation hub for all Fallout 4 modding guides.
 * Covers: Animation, Quest Authoring, LOD/Precombine, Textures,
 *         Papyrus Scripting, Sim Settlements 2, BodySlide.
 *
 * Features:
 *  - 7 full-domain tabs, each lazy-loaded
 *  - Per-tab visited + completion tracking (localStorage)
 *  - Live search/filter across tab metadata
 *  - Keyboard shortcuts 1-7 for instant tab switching
 *  - Difficulty badges, version stamps, NEW badges
 *  - Dynamic subtitle + contextual footer tip per active guide
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Book,
  BookOpen,
  Network,
  Image,
  Code2,
  Building2,
  Scissors,
  Search,
  CheckCircle2,
  Circle,
  X,
  Keyboard,
  BarChart3,
} from 'lucide-react';

// ---- Lazy-loaded guide panels -----------------------------------------------
const BlenderAnimationGuide = React.lazy(() =>
  import('./BlenderAnimationGuide').then((m) => ({ default: m.BlenderAnimationGuide }))
);
const QuestModAuthoringGuide = React.lazy(() =>
  import('./QuestModAuthoringGuide').then((m) => ({ default: m.QuestModAuthoringGuide }))
);
const Lorekeeper         = React.lazy(() => import('./Lorekeeper'));
const TextureMaterialsHub   = React.lazy(() => import('./TextureMaterialsHub'));
const PaperScriptFallout4Guide = React.lazy(() => import('./PaperScriptFallout4Guide'));
const SimSettlementsGuide   = React.lazy(() => import('./SimSettlementsGuide'));
const BodyslideGuide        = React.lazy(() => import('./BodyslideGuide'));

// ---- Types ------------------------------------------------------------------
type GuidesTab =
  | 'animation'
  | 'quest'
  | 'lod'
  | 'textures'
  | 'papyrus'
  | 'simsettlements'
  | 'bodyslide';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface TabDef {
  id: GuidesTab;
  label: string;
  sublabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  difficulty: Difficulty;
  version: string;
  isNew?: boolean;
  accentClass: string;
  accentBg: string;
  footerTip: string;
}

// ---- Tab registry -----------------------------------------------------------
const TABS: TabDef[] = [
  {
    id: 'animation',
    label: 'Animation & Rigging',
    sublabel: 'Blender + Havok + Frameworks',
    description:
      'Full FO4 animation pipeline: skeleton import, rigging, clip authoring, HKX export, and framework integration (IAF / NAF / AWF).',
    icon: Book,
    difficulty: 'Advanced',
    version: '2026.1',
    accentClass: 'text-cyan-300 border-cyan-500/40',
    accentBg: 'bg-cyan-500/10',
    footerTip:
      'Tip: Start with a vanilla animation replacer to validate your pipeline before touching frameworks.',
  },
  {
    id: 'quest',
    label: 'Quest Authoring',
    sublabel: 'CK + Papyrus + F4SE',
    description:
      'Quest mod authoring from CK setup through dialogue, Papyrus scripting, leveled list injection, and precombine patching.',
    icon: BookOpen,
    difficulty: 'Intermediate',
    version: '2026.1',
    accentClass: 'text-blue-300 border-blue-500/40',
    accentBg: 'bg-blue-500/10',
    footerTip:
      'Tip: Always test every quest stage with a clean save profile before publishing.',
  },
  {
    id: 'lod',
    label: 'LOD & Precombine',
    sublabel: 'xLODGen + DynDOLOD + PRP',
    description:
      'LOD asset generation, precombine rebuilds, and PRP patch creation. Manage jobs, parse tool output, and ship correct BA2s.',
    icon: Network,
    difficulty: 'Advanced',
    version: '2026.1',
    accentClass: 'text-purple-300 border-purple-500/40',
    accentBg: 'bg-purple-500/10',
    footerTip:
      'Tip: Always back up your ESP before any precombine-affecting edits -- regeneration is slow and unforgiving.',
  },
  {
    id: 'textures',
    label: 'Textures & Materials',
    sublabel: 'DDS + BGSM + PBR + Optimize',
    description:
      'Complete FO4 texture pipeline: DDS format reference, BC-channel guide, BGSM editor, material definitions, AI upscale, and batch optimizer.',
    icon: Image,
    difficulty: 'Intermediate',
    version: '2026.1',
    isNew: true,
    accentClass: 'text-orange-300 border-orange-500/40',
    accentBg: 'bg-orange-500/10',
    footerTip:
      'Tip: FO4 uses DirectX normals -- do NOT flip the G channel when exporting from Substance or Blender.',
  },
  {
    id: 'papyrus',
    label: 'Papyrus & Scripting',
    sublabel: 'F4SE + Events + PaperScript',
    description:
      'Papyrus scripting for FO4: script events, aliases, F4SE extensions, PaperScript transpiler, and advanced patterns (state machines, custom events).',
    icon: Code2,
    difficulty: 'Advanced',
    version: '2026.1',
    isNew: true,
    accentClass: 'text-green-300 border-green-500/40',
    accentBg: 'bg-green-500/10',
    footerTip:
      'Tip: Never block Papyrus with tight loops -- use RegisterForUpdate or OnTimer instead of while loops.',
  },
  {
    id: 'simsettlements',
    label: 'Sim Settlements 2',
    sublabel: 'Addon Packs + City Plans + Units',
    description:
      'SS2 addon creation: city plan buildings, units, loadouts, addon pack toolkits, ASAM sensors, and plot scripting with the SS2 API.',
    icon: Building2,
    difficulty: 'Intermediate',
    version: '2026.1',
    isNew: true,
    accentClass: 'text-yellow-300 border-yellow-500/40',
    accentBg: 'bg-yellow-500/10',
    footerTip:
      'Tip: Use the SS2 city plan validation tool before publishing -- it catches missing keywords and broken references.',
  },
  {
    id: 'bodyslide',
    label: 'BodySlide & Outfits',
    sublabel: 'Outfit Studio + Morphs + CBBE',
    description:
      'BodySlide and Outfit Studio: converting armor/clothing to CBBE, weight painting, creating sliders, and packaging morph data.',
    icon: Scissors,
    difficulty: 'Beginner',
    version: '2026.1',
    isNew: true,
    accentClass: 'text-rose-300 border-rose-500/40',
    accentBg: 'bg-rose-500/10',
    footerTip:
      'Tip: Always build your BodySlide output to the correct body preset before testing armor in-game.',
  },
];

// ---- Difficulty badge styles ------------------------------------------------
const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Beginner:     'bg-green-900/40 text-green-300 border border-green-700/40',
  Intermediate: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
  Advanced:     'bg-red-900/40 text-red-300 border border-red-700/40',
};

// ---- localStorage helpers --------------------------------------------------
const LS_VISITED   = 'guides_hub_visited';
const LS_COMPLETED = 'guides_hub_completed';
const LS_TAB       = 'guides_hub_tab';

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

// ---- Panel loader (Suspense wrapper) ----------------------------------------
const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-xs">Loading guide...</span>
      </div>
    }
  >
    {children}
  </Suspense>
);

// ---- Main component ---------------------------------------------------------
const GuidesHub: React.FC = () => {
  // Active tab (persisted across sessions)
  const [activeTab, setActiveTab] = useState<GuidesTab>(() => {
    const saved = localStorage.getItem(LS_TAB) as GuidesTab | null;
    return saved && TABS.some((t) => t.id === saved) ? saved : 'animation';
  });

  // Visited / completed tracking
  const [visited,   setVisited]   = useState<Set<string>>(() => loadSet(LS_VISITED));
  const [completed, setCompleted] = useState<Set<string>>(() => loadSet(LS_COMPLETED));

  // Search / filter state
  const [search,        setSearch]        = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(LS_TAB, activeTab);
  }, [activeTab]);

  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (!visited.has(activeTab)) {
      const next = new Set(visited).add(activeTab);
      setVisited(next);
      saveSet(LS_VISITED, next);
    }
  }, [activeTab, visited]);

  // Toggle completion badge for active tab
  const toggleCompleted = useCallback(() => {
    const next = new Set(completed);
    if (next.has(activeTab)) next.delete(activeTab);
    else next.add(activeTab);
    setCompleted(next);
    saveSet(LS_COMPLETED, next);
  }, [activeTab, completed]);

  // Navigate to tab and clear search
  const navigateTo = useCallback((id: GuidesTab) => {
    setActiveTab(id);
    setSearch('');
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '/' || e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        setSearch('');
        searchRef.current?.blur();
        return;
      }
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < TABS.length) {
        navigateTo(TABS[idx].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigateTo]);

  // Filtered tabs by search query
  const filteredTabs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.sublabel.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.difficulty.toLowerCase().includes(q)
    );
  }, [search]);

  const activeDef      = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const visitedCount   = visited.size;
  const completedCount = completed.size;

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-slate-800/60 space-y-3">

        {/* Title + stats */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Guides Hub</h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-lg leading-relaxed">
              {activeDef.description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
              <span>{TABS.length} guides</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <Circle className="h-3.5 w-3.5 text-slate-400" />
              <span>{visitedCount}/{TABS.length} visited</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{completedCount} done</span>
            </div>
          </div>
        </div>

        {/* Search bar + shortcut toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter guides... (press /)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        </div>

        {/* Shortcut reference panel */}
        {showShortcuts && (
          <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400">
            {TABS.map((t, i) => (
              <span key={t.id} className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono text-[10px]">
                  {i + 1}
                </kbd>
                <span>{t.label}</span>
              </span>
            ))}
            <span className="flex items-center gap-1 ml-auto">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono text-[10px]">/</kbd>
              <span>Search</span>
            </span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {filteredTabs.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No guides match &quot;{search}&quot;</p>
          ) : (
            filteredTabs.map((tab) => {
              const isActive   = activeTab === tab.id;
              const wasVisited = visited.has(tab.id);
              const isDone     = completed.has(tab.id);
              const tabIdx     = TABS.findIndex((t) => t.id === tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(tab.id)}
                  title={`${tab.label} — press ${tabIdx + 1}`}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all group ${
                    isActive
                      ? `${tab.accentBg} ${tab.accentClass} border`
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {/* Status dot: visited (grey) or complete (green) */}
                  {wasVisited && !isActive && !isDone && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-500" />
                  )}
                  {isDone && !isActive && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}

                  <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] ${isActive ? 'opacity-70' : 'text-slate-600 group-hover:text-slate-500'}`}>
                    {tab.sublabel}
                  </span>

                  {/* NEW badge */}
                  {tab.isNew && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-black tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      NEW
                    </span>
                  )}

                  {/* Shortcut hint on hover */}
                  <span className="hidden group-hover:inline px-1 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-500 border border-slate-700 ml-1">
                    {tabIdx + 1}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Active tab metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${DIFFICULTY_STYLE[activeDef.difficulty]}`}>
            {activeDef.difficulty}
          </span>
          <span className="text-[10px] text-slate-600">v{activeDef.version}</span>
          {activeDef.isNew && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NEW
            </span>
          )}
          <div className="ml-auto">
            <button
              onClick={toggleCompleted}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                completed.has(activeTab)
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completed.has(activeTab) ? 'Marked Complete' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </div>

      {/* Guide content panels */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'animation'      && <PanelLoader><BlenderAnimationGuide /></PanelLoader>}
        {activeTab === 'quest'          && <PanelLoader><QuestModAuthoringGuide /></PanelLoader>}
        {activeTab === 'lod'            && <PanelLoader><Lorekeeper /></PanelLoader>}
        {activeTab === 'textures'       && <PanelLoader><TextureMaterialsHub /></PanelLoader>}
        {activeTab === 'papyrus'        && <PanelLoader><PaperScriptFallout4Guide /></PanelLoader>}
        {activeTab === 'simsettlements' && <PanelLoader><SimSettlementsGuide /></PanelLoader>}
        {activeTab === 'bodyslide'      && <PanelLoader><BodyslideGuide /></PanelLoader>}
      </div>

      {/* Contextual footer tip per active guide */}
      <div className={`flex-shrink-0 px-5 py-2.5 border-t border-slate-800/60 ${activeDef.accentBg}`}>
        <p className={`text-xs ${activeDef.accentClass.split(' ')[0]}`}>
          {activeDef.footerTip}
        </p>
      </div>
    </div>
  );
};

export default GuidesHub;
