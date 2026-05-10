/**
 * CK Tools Hub
 *
 * Unified platform for all Creation Kit work in Fallout 4 modding.
 * Consolidates: CK Safety (Crash Prevention) · CK Extension (auto-save, scripting) · FO4 CK Guide
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Shield, Wrench, BookOpen, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const CKCrashPrevention = React.lazy(() => import('./CKCrashPrevention'));
const CKExtension = React.lazy(() =>
  import('./CKExtension').then((m) => ({ default: m.CKExtension }))
);

type HubTab = 'safety' | 'extension' | 'guide';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'safety', icon: Shield, label: 'CK Safety', sublabel: 'Crash Prevention · Validation' },
  { id: 'extension', icon: Wrench, label: 'CK Extension', sublabel: 'Auto-save · Script Compiler' },
  { id: 'guide', icon: BookOpen, label: 'FO4 CK Guide', sublabel: 'Best Practices · Pitfalls' },
];

// ============================================================================
// FO4 Creation Kit Guide
// ============================================================================

const CRASH_CAUSES = [
  {
    cause: 'Cell / Room Bounds missing or misaligned',
    severity: 'critical',
    detail:
      'The CK requires every interior cell to have a valid Room Bounds marker. Missing or floating markers cause immediate crashes when loading the cell. Fix: place RoomBounds inside the cell, make sure they fully enclose the room volume.',
  },
  {
    cause: 'Precombine / Previs data out-of-date',
    severity: 'critical',
    detail:
      'If you edit objects inside a precombined mesh zone without regenerating precombines, the game crashes on cell load. Fix: regenerate precombine and previs data via the CK batch render system, then repack into the mod\'s BA2 archive.',
  },
  {
    cause: 'Missing master ESP/ESM',
    severity: 'critical',
    detail:
      'If a plugin references a master file (ITM FormID, linked refs, etc.) that is not in the load order, the CK crashes on save or the game crashes on load. Verify all masters are loaded in the CK project.',
  },
  {
    cause: 'Corrupt NIF or oversized NIF',
    severity: 'high',
    detail:
      'NIFs with invalid block counts, unsupported NiNode types, or extreme polygon counts crash the CK in the preview window. Validate NIFs with NifSkope before placing in CK.',
  },
  {
    cause: 'Leveled List injection without Bash Patch',
    severity: 'high',
    detail:
      'Multiple mods injecting into the same leveled list without a bashed patch causes list overrides that crash random encounters. Use Wrye Bash to build a bashed patch when distributing.',
  },
  {
    cause: 'Too many forms in ESP (non-ESL)',
    severity: 'medium',
    detail:
      'Standard ESP/ESM files have a 16M FormID space (0x000800 – 0xFFFFF per mod file). Mods with too many records fragment the space and can cause save corruption. Flag small mods as ESL if FormID count < 2048.',
  },
  {
    cause: 'Overlapping navmesh triangles',
    severity: 'high',
    detail:
      'Self-intersecting or z-fighting navmesh triangles cause NPC pathfinding crashes. Always finalize navmesh (CK menu: NavMesh → Finalize NavMesh) before testing.',
  },
  {
    cause: 'Lighting LOD / LGTM not rebuilt',
    severity: 'medium',
    detail:
      'After making exterior changes, LGTM data and lighting LOD must be rebuilt. Stale data causes visual pop-in and sometimes render crashes.',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Always save CK plugin as a separate file, never overwrite master',
    detail: 'Work in a child ESP that has your base ESM as a master. Never modify vanilla ESM/ESPs directly.',
  },
  {
    title: 'Enable the CK auto-save extension',
    detail: 'The CK has no built-in reliable auto-save. Use the Mossy CK Extension auto-save (5-minute intervals recommended) to avoid losing work to CK crashes.',
  },
  {
    title: 'Use F4CK Fixes / CK Platform Extended',
    detail: 'CK Platform Extended (Nexus #51998) patches dozens of CK bugs including the 5-second save lag, navmesh crash on large cells, and memory leaks. Essential for serious CK work.',
  },
  {
    title: 'Disable DistantLOD checkbox for new exterior cells',
    detail: 'Leave LOD generation to DynDOLOD/xLODGen post-process. Generating LOD from inside CK creates incomplete data.',
  },
  {
    title: 'Compact FormIDs before releasing as ESL',
    detail: 'ESL plugins can only use FormIDs 0x000–0x7FF. Run xEdit → "Compact FormIDs for ESL" before flagging. This is a destructive operation — do it before distributing.',
  },
  {
    title: 'Script compilation: always check for stale PEX files',
    detail: 'Compiled Papyrus PEX files from an old PSC source are not automatically overwritten. Use the CK Papyrus compiler or xEdit → script compile to regenerate all PEX.',
  },
  {
    title: 'Test in clean save after every major structural change',
    detail: 'Save-game state machines cache cell data. Test new cell layouts with a fresh save (No mods → Add your mod fresh) to see true first-load behavior.',
  },
  {
    title: 'Use CLASSIC for crash log analysis',
    detail: 'CLASSIC (Crash Log Auto Scanner, Nexus #56255) parses Buffout 4 crash logs and identifies the most likely offending record or NIF. Run after every crash before editing.',
  },
];

const CK_TOOLS_REF = [
  { name: 'CK Platform Extended', desc: 'CK bug fixes, performance, extra dialogs. Essential for stable CK use.', nexus: '51998' },
  { name: 'Buffout 4 NG', desc: 'Runtime crash logger. Produces crash logs readable by CLASSIC.', nexus: '64880' },
  { name: 'CLASSIC', desc: 'Auto-parses Buffout 4 crash logs and matches FormIDs to records.', nexus: '56255' },
  { name: 'xEdit (FO4Edit)', desc: 'Plugin editor/validator. Compact FormIDs, check for ITMs/UDRs, analyze LVLN.', nexus: '2737' },
  { name: 'Wrye Bash', desc: 'Bashed patch builder. Merges leveled lists, weapon/armor tags.', nexus: '20840' },
  { name: 'NifSkope', desc: 'NIF validator and viewer. Check block counts, shapes, normals before placing in CK.', nexus: '' },
  { name: 'DynDOLOD', desc: 'LOD generation including LGTM/terrain LOD rebuild. Run after any exterior change.', nexus: '61931' },
  { name: 'LOOT', desc: 'Load order optimizer. Ensures masters are loaded before dependents.', nexus: '' },
  { name: 'Papyrus Compiler (standalone)', desc: 'Compile PSC → PEX outside the CK for batch script builds or CI pipelines.', nexus: '' },
];

const PAPYRUS_TIPS = [
  { tip: 'Use OnActivate instead of OnHit for item pickups', why: 'OnHit fires for all projectile impacts; OnActivate is the correct trigger for player interaction.' },
  { tip: 'RegisterForSingleUpdate() instead of RegisterForUpdate()', why: 'Continuous RegisterForUpdate() is a performance sink. Chain OnUpdate → RegisterForSingleUpdate with a small delay interval instead.' },
  { tip: 'Always guard with Utility.IsInMenuMode()', why: 'Scripts running during the main menu can cause null-ref crashes. Guard timed scripts with this check.' },
  { tip: 'Avoid Form.GetName() in tight loops', why: 'String operations in Papyrus are slow. Cache the name string in a variable rather than calling GetName() repeatedly.' },
  { tip: 'Use Quest aliases for persistent actor references', why: 'Actor references stored in properties go None after save/load if the actor is not persistent. Use a Quest alias with a Fill condition instead.' },
  { tip: 'F4SE for complex engine interactions', why: 'Papyrus cannot directly write to INI settings, manipulate inventory without picking up, or access low-level game state. Use an F4SE C++ plugin for these needs, and call it via a native function registered to Papyrus.' },
];

const severityColor = (s: string) =>
  s === 'critical' ? 'text-red-400 border-red-500/30 bg-red-950/20'
  : s === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-950/20'
  : 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20';

const FO4CKGuide: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Creation Kit Reference</h2>
      <p className="text-emerald-100/80">
        Comprehensive guide to CK crash causes, best practices, Papyrus scripting tips, and essential tools
        — covering vanilla CK workflow, CK Platform Extended, Buffout 4, CLASSIC, and F4SE integration.
      </p>
    </div>

    {/* Common CK Crash Causes */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Common CK Crash Causes
      </h3>
      <div className="space-y-3">
        {CRASH_CAUSES.map((c) => (
          <div key={c.cause} className={`rounded-lg border p-4 ${severityColor(c.severity)}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current opacity-80">
                {c.severity}
              </span>
              <span className="font-semibold text-white text-xs">{c.cause}</span>
            </div>
            <p className="text-xs text-slate-300">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Best Practices */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <CheckCircle className="h-5 w-5" /> CK Best Practices
      </h3>
      <div className="space-y-3">
        {BEST_PRACTICES.map((p) => (
          <div key={p.title} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">{p.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Papyrus Scripting Tips */}
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
        <Info className="h-5 w-5" /> Papyrus Scripting Tips
      </h3>
      <div className="space-y-3">
        {PAPYRUS_TIPS.map((t) => (
          <div key={t.tip} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-xs">{t.tip}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.why}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ESL / FormID Rules */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-3">ESL / FormID Quick Reference</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-2 pr-4">Plugin Type</th>
              <th className="text-left py-2 pr-4">FormID Range</th>
              <th className="text-left py-2 pr-4">Max New Records</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { type: 'ESP (full)', range: '0x000800–0xFFFFF per mod', max: '16,776,704', notes: 'Standard plugin. Counts toward 255 plugin limit.' },
              { type: 'ESM (master)', range: 'Same as ESP but flags as master', max: '16,776,704', notes: 'Used by other plugins as dependency. Full range.' },
              { type: 'ESL (light)', range: '0x000–0x7FF (0–2047)', max: '2048', notes: 'Does NOT count toward 255 limit. Max 4096 ESL files total.' },
              { type: 'ESL-flagged ESP', range: '0x000–0x7FF', max: '2048', notes: 'Regular ESP with ESL flag. Works the same as ESL. Compact FormIDs first.' },
              { type: 'ESM flagged as ESL', range: '0x000–0x7FF', max: '2048', notes: 'Rare. Used for large content split across ESL-size chunks.' },
            ].map((row) => (
              <tr key={row.type} className="border-b border-slate-800/60">
                <td className="py-2 pr-4 font-semibold text-white">{row.type}</td>
                <td className="py-2 pr-4 font-mono text-emerald-300 text-[10px]">{row.range}</td>
                <td className="py-2 pr-4 text-slate-300">{row.max}</td>
                <td className="py-2 text-slate-400">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Tools Reference */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">Essential CK Tools</h3>
      <div className="grid grid-cols-1 gap-2">
        {CK_TOOLS_REF.map((t) => (
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

const CKToolsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('safety');

  useEffect(() => {
    const saved = sessionStorage.getItem('ck_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);

    // Support ?tab= query param for deep-link (e.g. /ck-tools?tab=extension)
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    const tabParam = params.get('tab') as HubTab | null;
    if (tabParam && TAB_DEFS.some((t) => t.id === tabParam)) setActiveTab(tabParam);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ck_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Shield className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">CK Tools</h1>
            <p className="text-xs text-slate-400">Creation Kit safety, auto-save, script compilation, and FO4 CK reference — all in one place</p>
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
        {activeTab === 'safety' && (
          <PanelLoader>
            <CKCrashPrevention />
          </PanelLoader>
        )}
        {activeTab === 'extension' && (
          <PanelLoader>
            <CKExtension />
          </PanelLoader>
        )}
        {activeTab === 'guide' && <FO4CKGuide />}
      </div>
    </div>
  );
};

export default CKToolsHub;
