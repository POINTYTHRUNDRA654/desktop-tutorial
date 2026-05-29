/**
 * FO4 Asset Analysis Hub
 *
 * Unified platform for all mod asset analysis, mining, and deduplication.
 * Consolidates: Mining Dashboard · Advanced Analysis · Asset Deduplicator · FO4 Analysis Guide
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Binary, Brain, Copy, BookOpen, ChevronRight, AlertTriangle, CheckCircle, Box, Skull } from 'lucide-react';

const MiningPanel = React.lazy(() =>
  import('./MiningPanel').then((m) => ({ default: m.MiningPanel }))
);
const AdvancedAnalysisPanel = React.lazy(() =>
  import('./AdvancedAnalysisPanel').then((m) => ({ default: m.AdvancedAnalysisPanel }))
);
const AssetDeduplicator = React.lazy(() => import('./AssetDeduplicator'));
const AssetViewer3D = React.lazy(() =>
  import('./AssetViewer3D').then((m) => ({ default: m.AssetViewer3D }))
);
const CrashLogAnalyzer = React.lazy(() =>
  import('./CrashLogAnalyzer').then((m) => ({ default: m.CrashLogAnalyzer }))
);

type HubTab = 'mining' | 'analysis' | 'dedup' | 'guide' | 'viewer' | 'crash';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'mining',   icon: Binary,        label: 'Mining Dashboard',  sublabel: 'ESP · Assets · Dependencies' },
  { id: 'analysis', icon: Brain,         label: 'Advanced Analysis', sublabel: 'Conflicts · Perf · Memory' },
  { id: 'dedup',    icon: Copy,          label: 'Asset Deduplicator',sublabel: 'Duplicates · VRAM' },
  { id: 'crash',    icon: Skull,         label: 'Crash Analyzer',    sublabel: 'Buffout4 · CLASSIC · FormIDs' },
  { id: 'guide',    icon: BookOpen,      label: 'FO4 Asset Guide',   sublabel: 'Budgets · Optimization' },
  { id: 'viewer',   icon: Box,           label: '3D Viewer',         sublabel: 'NIF · Wireframe · Bounds' },
];

// ============================================================================
// FO4 Asset Analysis & Optimization Guide
// ============================================================================

const ASSET_BUDGETS = [
  { category: 'Textures per interior cell', budget: '< 400 MB VRAM', details: 'Keep combined texture VRAM under 400 MB for a typical interior. Hero textures at 4K; background at 1K.' },
  { category: 'Polygons per mesh (static prop)', budget: '< 30 000 tris', details: 'Background props: < 5000 tris. Weapons and armor: 10 000–30 000. Player character: < 50 000. High poly is baked to normal maps.' },
  { category: 'Polygons per NPC actor', budget: '< 60 000 tris', details: 'FO4 base actors hover around 20 000–40 000. Custom NPCs with outfit combos (ARMO + ARMA stacking) can spike above 80 000 — triggers render hitches.' },
  { category: 'Draw calls per outdoor cell', budget: '< 600 visible/frame', details: "Each unique material + mesh combo = one draw call. LOD, precombine, and instancing reduce this. Target < 300 from your mod's objects." },
  { category: 'Papyrus script poll rate', budget: '> 0.5 s between updates', details: 'Scripts polling faster than 500 ms stack in the Papyrus queue. Prefer event-driven design. Tight loops cause "Papyrus is overloaded" crashes.' },
  { category: 'Loose files vs BA2', budget: 'Release only in BA2', details: 'Loose files bypass the archive system and fragment the texture streamer. Always pack into BA2 for distribution. Keep loose only during dev.' },
  { category: 'Leveled list depth', budget: '< 5 nesting levels', details: 'FO4 evaluates leveled lists recursively. Lists nested more than 5 levels deep cause noticeable micro-stutter when evaluated at runtime.' },
  { category: 'FormID count per ESP', budget: '< 4096 for ESL / 16M for ESP', details: 'ESL: strict 2048 new FormIDs (range 0x000–0x7FF). Standard ESP: 16M. Do not approach the limit — leave headroom for patches.' },
];

const CONFLICT_TYPES = [
  {
    type: 'Record Override (ITM)',
    severity: 'low',
    detail: 'Identical-to-master records waste load order slots. Use xEdit "Check for ITMs" and delete duplicates.',
  },
  {
    type: 'Deleted Reference (UDR)',
    severity: 'high',
    detail: 'Deleted placed references cause null-ref crashes. Use xEdit "Undelete and Disable" to safely hide the ref instead.',
  },
  {
    type: 'Leveled List Conflict',
    severity: 'medium',
    detail: 'Two mods editing the same LVLN/LVLI entry will only keep one version. Fix with a Bashed Patch (Wrye Bash) or manual merge in xEdit.',
  },
  {
    type: 'Precombine Break',
    severity: 'high',
    detail: 'Any plugin that moves/removes a static reference inside a precombined mesh zone breaks precombines for that cell. Fix: regenerate precombine and previs data.',
  },
  {
    type: 'Script Property Conflict',
    severity: 'medium',
    detail: 'Two mods patching the same Quest or Alias script property clobber each other on load. Merge or patch scripts in xEdit.',
  },
  {
    type: 'GMST / INI Conflict',
    severity: 'medium',
    detail: 'Game Settings records (GMST) conflict silently — last-loaded wins. Coordinate with other mod authors or use a merged GMST patch.',
  },
  {
    type: 'FormID Collision',
    severity: 'critical',
    detail: 'Two plugins with the same load order position and FormID will corrupt each other\'s records. Always ensure unique FormID spaces. Compact ESL plugins correctly before release.',
  },
];

const OPTIMIZATION_TIPS = [
  { tip: 'Generate Precombines and Previs after any exterior edit', detail: 'DynDOLOD handles LOD; CK handles precombine/previs. Both are required for performance in exterior cells. Skipping precombine can drop FPS by 40% in dense areas.' },
  { tip: 'Use texture atlasing for tiling materials', detail: 'Combine multiple small tiling textures into one atlas and use UV mapping to select regions. Reduces draw calls from N materials to 1.' },
  { tip: 'Pack NavMesh Islands', detail: 'Disjoint navmesh islands cost pathfinding CPU. Use CK NavMesh → Find Covers to identify unconnected islands and bridge or trim them.' },
  { tip: 'Remove orphaned scripts from save games', detail: 'Deleted mod scripts still run if attached to a save. Use Fallrim Tools (ReSaver) to identify and remove orphan scripts before distributing a save-safe patch.' },
  { tip: 'Profile performance with Community Shaders FPS overlay', detail: 'Enable the CS performance overlay to see per-frame GPU cost breakdown. Identify which cell, shader, or draw call is the bottleneck.' },
  { tip: 'xLODGen terrain LOD before DynDOLOD', detail: 'Run xLODGen first for terrain height/normal LOD, then run TexGen, then DynDOLOD. Running them out of order produces missing or mismatched LOD.' },
  { tip: 'Limit exterior ambient occlusion mesh complexity', detail: 'Complex clutter meshes (rocks, debris) baked into the exterior heightmap contribute to AO calculation cost. Use lower-complexity proxy meshes for LOD levels 4–8.' },
  { tip: 'Deduplicate textures across BA2 archives', detail: 'Multiple mods may ship identical vanilla texture overrides. Deduplication identifies and consolidates these to reduce VRAM load. Use the Asset Deduplicator tab.' },
];

const TOOLS_REFERENCE = [
  { name: 'xEdit (FO4Edit)', desc: 'Plugin analysis: ITMs, UDRs, conflicts, FormID inspection, script patching. The essential analysis tool.', nexus: '2737' },
  { name: 'Wrye Bash', desc: 'Bashed Patch builder. Merges leveled lists, keywords, bash tags. Solves most LVLN conflicts automatically.', nexus: '20840' },
  { name: 'Fallrim Tools (ReSaver)', desc: 'Save game analysis. Remove orphan script instances, inspect Papyrus stack.', nexus: '22507' },
  { name: 'CLASSIC (Crash Log Auto Scanner)', desc: 'Parses Buffout 4 / Buffout 4 NG crash logs. Matches FormIDs to records. Identifies conflict and script-caused crashes. Requires Buffout 4 NG installed for log generation.', nexus: '56255' },
  { name: 'X-Cell', desc: 'Primary crash-logger and engine-patch suite for next-gen Fallout 4 (2024+). Replaces Buffout 4 memory management. Provides VRAM optimisation, face-gen fixes, and stability patches for NG/AE/OG. Use alongside Buffout 4 NG (disable MemoryManager in its config.toml when X-Cell is active).', nexus: '84214' },
  { name: 'DynDOLOD', desc: 'Exterior LOD generation including objects, terrain, trees. Required after any exterior change.', nexus: '61931' },
  { name: 'xLODGen', desc: 'Terrain LOD (heightmap, normal, LOD textures). Run before DynDOLOD.', nexus: '' },
  { name: 'NifOptimizer', desc: 'Batch NIF optimizer. Converts NIF format, removes redundant blocks, optimizes for FO4.', nexus: '4089' },
  { name: 'Cathedral Assets Optimizer (CAO)', desc: 'Batch asset optimizer for textures, NIFs, animations. Detect and fix outdated formats.', nexus: '' },
  { name: 'Community Shaders FPS overlay', desc: 'Real-time GPU cost breakdown per frame. Identify bottleneck shaders, draw calls, and overdraw.', nexus: '74088' },
];

const severityColor = (s: string) =>
  s === 'critical' ? 'text-red-400 border-red-500/30 bg-red-950/20'
  : s === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-950/20'
  : s === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20'
  : 'text-slate-400 border-slate-700 bg-slate-900/40';

const FO4AssetGuide: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Asset Analysis & Optimization Reference</h2>
      <p className="text-emerald-100/80">
        Comprehensive guide to asset budgets, conflict types, optimization strategies, and analysis tools
        — covering textures, meshes, scripts, load order, precombines, and LOD pipelines.
      </p>
    </div>

    {/* Asset Budgets */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <CheckCircle className="h-5 w-5" /> Asset Budgets & Limits
      </h3>
      <div className="space-y-3">
        {ASSET_BUDGETS.map((b) => (
          <div key={b.category} className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="font-semibold text-white text-xs">{b.category}</span>
              <span className="ml-auto font-mono text-emerald-300 text-xs font-bold">{b.budget}</span>
            </div>
            <p className="text-xs text-slate-400">{b.details}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Conflict Types */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Common Mod Conflict Types
      </h3>
      <div className="space-y-3">
        {CONFLICT_TYPES.map((c) => (
          <div key={c.type} className={`rounded-lg border p-4 ${severityColor(c.severity)}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current opacity-80">
                {c.severity}
              </span>
              <span className="font-semibold text-white text-xs">{c.type}</span>
            </div>
            <p className="text-xs text-slate-300">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Optimization Tips */}
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <h3 className="text-lg font-bold text-blue-300 mb-4">Optimization Strategies</h3>
      <div className="space-y-3">
        {OPTIMIZATION_TIPS.map((t) => (
          <div key={t.tip} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">{t.tip}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Tools Reference */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">Essential Analysis Tools</h3>
      <div className="grid grid-cols-1 gap-2">
        {TOOLS_REFERENCE.map((t) => (
          <div key={t.name} className="flex gap-3 items-start">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white">{t.name}</span>
              {t.nexus && (
                <span className="text-[10px] text-slate-500 ml-2 font-mono">Nexus #{t.nexus}</span>
              )}
              <span className="text-slate-400 ml-2 text-xs">{t.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// Main Hub Component
// ============================================================================

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
    }
  >
    {children}
  </Suspense>
);

const AssetAnalysisHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('mining');

  useEffect(() => {
    const saved = sessionStorage.getItem('asset_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('asset_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Binary className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Asset Analysis Hub</h1>
            <p className="text-xs text-slate-400">
              Mining Dashboard · Advanced Analysis · Deduplicator · FO4 Asset Guide
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'mining' && (
          <PanelLoader>
            <MiningPanel />
          </PanelLoader>
        )}
        {activeTab === 'analysis' && (
          <PanelLoader>
            <AdvancedAnalysisPanel />
          </PanelLoader>
        )}
        {activeTab === 'dedup' && (
          <PanelLoader>
            <AssetDeduplicator />
          </PanelLoader>
        )}
        {activeTab === 'crash' && (
          <PanelLoader>
            <CrashLogAnalyzer />
          </PanelLoader>
        )}
        {activeTab === 'guide' && <FO4AssetGuide />}
        {activeTab === 'viewer' && (
          <PanelLoader>
            <AssetViewer3D />
          </PanelLoader>
        )}
      </div>
    </div>
  );
};

export default AssetAnalysisHub;
