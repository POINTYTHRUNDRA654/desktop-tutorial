/**
 * Plugin & Load Order Hub
 *
 * Unified platform for xEdit operations, PRP patch generation, load order management,
 * and comprehensive FO4 plugin/load-order reference.
 * Consolidates: xEdit Tools · PRP Patch Tools · Load Order Hub · FO4 Plugin Guide
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Database, Zap, List, BookOpen, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

const XEditTools = React.lazy(() => import('./XEditTools'));
const PrecombineGenerator = React.lazy(() => import('./PrecombineGenerator'));
const LoadOrderHub = React.lazy(() => import('./LoadOrderHub'));

type HubTab = 'xedit' | 'prp' | 'loadorder' | 'guide';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'xedit', icon: Database, label: 'xEdit Tools', sublabel: 'Clean · Script · Analyse' },
  { id: 'prp', icon: Zap, label: 'PRP Patch Tools', sublabel: 'Precombine · Previs' },
  { id: 'loadorder', icon: List, label: 'Load Order', sublabel: 'Analyze · Optimize · LOOT' },
  { id: 'guide', icon: BookOpen, label: 'FO4 Plugin Guide', sublabel: 'ESL · Conflicts · LOOT' },
];

// ============================================================================
// FO4 Plugin & Load Order Reference Guide
// ============================================================================

const LOAD_ORDER_RULES = [
  { rule: 'Masters always load before dependents', detail: 'FO4 enforces this automatically. ESM/ESP that depends on another plugin must have it listed as a master (MAST record). If a master is missing from the load order, the game CTD on startup.' },
  { rule: 'Official DLCs before unofficial patches (UFO4P)', detail: 'Load order: DLCRobot > DLCworkshop01 > DLCCoast > DLCworkshop02 > DLCworkshop03 > DLCNukaWorld > UFO4P. UFO4P must load after all DLCs it patches.' },
  { rule: 'LOOT automatically assigns positions for most mods', detail: 'LOOT (Load Order Optimisation Tool) uses community-curated masterlist rules. Run LOOT after any mod change and before playing. Only override manually for well-documented conflict reasons.' },
  { rule: 'ESL-flagged plugins load in a shared "light" slot', detail: 'ESL/ESP-FE plugins occupy indices FE000–FEFFF and do not count toward the 255 plugin limit. Load order position of ESLs relative to each other still matters for record overrides.' },
  { rule: 'Conflict resolution overrides: last-loaded wins', detail: 'For a record that two ESPs both override, the ESP loaded later wins. When in doubt, put patches and overrides near the bottom of the load order, after the mods they patch.' },
  { rule: 'Bashed Patch must be the last ESP in the load order', detail: 'Wrye Bash\'s Bashed Patch merges leveled lists and keywords from all loaded ESPs. It must load last so it captures all changes. Regenerate after changing load order.' },
];

const XEDIT_WORKFLOW = [
  {
    step: '1. Load the plugin in xEdit',
    detail: 'Launch FO4Edit. Right-click → Select None, then check only your plugin. Wait for background loader to finish (green "Background Loader: finished").',
  },
  {
    step: '2. Clean ITMs (Identical to Master records)',
    detail: 'Right-click your plugin → Apply Filter for Cleaning. Then right-click → Remove Identical to Master Records. Check the count — if zero, no ITMs exist.',
  },
  {
    step: '3. Clean UDRs (Undelete and Disable References)',
    detail: 'After ITM cleaning, right-click the plugin → Undelete and Disable References. This converts deleted placed references to disabled ones, which is engine-safe.',
  },
  {
    step: '4. Check for errors',
    detail: 'Right-click plugin → Check for Errors. Most "could not be resolved" errors indicate broken FormID cross-references. Fix or remove the record.',
  },
  {
    step: '5. Compact FormIDs for ESL flag (if applicable)',
    detail: 'If you want to flag the plugin as ESL, right-click → Compact FormIDs for ESL. This reassigns all new FormIDs to the 0x000–0x7FF range. ONLY do this before distributing.',
  },
  {
    step: '6. Save',
    detail: 'Ctrl+S or close xEdit and confirm save. Always back up the original before cleaning.',
  },
];

const PRP_WORKFLOW = [
  { step: 'Set up xEdit path', detail: 'Point Mossy to FO4Edit.exe in Settings. The PRP generator uses xEdit scripts for precombine data baking.' },
  { step: 'Import your MO2 profile plugins.txt', detail: 'Provide the path to the MO2 profile directory. The wizard reads plugins.txt and appdata LoadOrder.txt for the correct full load order.' },
  { step: 'Generate xEdit patch script', detail: 'Mossy generates an xEdit Pascal script (.pas) that patches all interior/exterior cells in your mod for precombine compatibility.' },
  { step: 'Run xEdit with the script', detail: 'Launch xEdit with your load order and run the generated script via Apply Script. This bakes the precombine reference data into the patch plugin.' },
  { step: 'Rebuild Precombines in CK', detail: 'Load the CK with your mod and the patch plugin. Run Batch Precombine (Render → Batch Precompute/Render). This can take 30–120 minutes for large worldspaces.' },
  { step: 'Pack output into BA2', detail: 'Pack the generated precombine meshes and visibility data into a BA2 archive (General type). Name it: YourMod - Main.ba2.' },
];

const COMMON_MISTAKES = [
  { mistake: 'Skipping the ITM/UDR clean step', impact: 'high', fix: 'Clean with xEdit before every release. Dirty plugins cause save bloat and can override other mods silently.' },
  { mistake: 'Not regenerating Bashed Patch after load order change', impact: 'medium', fix: 'Regenerate the Bashed Patch in Wrye Bash every time mods are added, removed, or reordered.' },
  { mistake: 'Editing exterior objects without regenerating precombines', impact: 'critical', fix: 'Any moved/deleted static in a precombined zone breaks precombines for that cell — FPS drop and potential crash. Always regenerate precombine + previs after exterior edits.' },
  { mistake: 'ESL flag without compacting FormIDs first', impact: 'critical', fix: 'ESL plugins MUST use FormIDs in 0x000–0x7FF. Compact with xEdit before flagging. Never compact after distributing — it breaks save games.' },
  { mistake: 'Loading more than 255 standard ESPs', impact: 'critical', fix: 'FO4 hard-caps at 255 standard ESPs. Convert small mods to ESL where possible. Use Wrye Bash to identify which mods qualify.' },
  { mistake: 'Putting patch mods above the mods they patch', impact: 'medium', fix: 'A compatibility patch must load AFTER both mods it patches. If Patch_A_B.esp loads before A.esp, it overrides nothing.' },
];

const FO4PluginGuide: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Plugin & Load Order Reference</h2>
      <p className="text-emerald-100/80">
        Comprehensive guide to xEdit cleaning, load order rules, PRP precombine workflow, ESL/FormID limits,
        and LOOT — for stable, performance-optimized Fallout 4 mod releases.
      </p>
    </div>

    {/* Load Order Rules */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <List className="h-5 w-5" /> Load Order Rules
      </h3>
      <div className="space-y-3">
        {LOAD_ORDER_RULES.map((r) => (
          <div key={r.rule} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">{r.rule}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* xEdit Cleaning Workflow */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <Database className="h-5 w-5" /> xEdit Cleaning Workflow
      </h3>
      <ol className="space-y-3">
        {XEDIT_WORKFLOW.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>

    {/* PRP Workflow */}
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5" /> PRP Precombine Patch Workflow
      </h3>
      <ol className="space-y-3">
        {PRP_WORKFLOW.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center border border-blue-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-lg border border-amber-600/30 bg-amber-950/20 p-3 text-xs text-amber-200">
        <strong>Note:</strong> PRP patch generation requires xEdit and the Creation Kit. The PRP Patch Tools tab above
        provides a guided wizard. Always test the patch in a clean save before distributing.
      </div>
    </div>

    {/* ESL / Plugin Count */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-3">Plugin Count & ESL Quick Reference</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-2 pr-4">Plugin Type</th>
              <th className="text-left py-2 pr-4">Load-order slot</th>
              <th className="text-left py-2 pr-4">Max new FormIDs</th>
              <th className="text-left py-2">LOOT support</th>
            </tr>
          </thead>
          <tbody>
            {[
              { type: 'ESP (full)', slot: '0x00–0xFE (255 total)', max: '16,776,704', loot: 'Full masterlist' },
              { type: 'ESM (master)', slot: '0x00–0xFE', max: '16,776,704', loot: 'Full masterlist' },
              { type: 'ESL (light)', slot: 'FE000–FEFFF (4096 total)', max: '2048 (0x000–0x7FF)', loot: 'Partial (position within FE range)' },
              { type: 'ESP-FE (ESL-flagged ESP)', slot: 'FE000–FEFFF', max: '2048', loot: 'Same as ESL' },
            ].map((r) => (
              <tr key={r.type} className="border-b border-slate-800/60">
                <td className="py-2 pr-4 font-semibold text-white">{r.type}</td>
                <td className="py-2 pr-4 font-mono text-emerald-300 text-[10px]">{r.slot}</td>
                <td className="py-2 pr-4 text-slate-300">{r.max}</td>
                <td className="py-2 text-slate-400">{r.loot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Common Mistakes */}
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Common Plugin Mistakes
      </h3>
      <div className="space-y-3">
        {COMMON_MISTAKES.map((m) => (
          <div
            key={m.mistake}
            className={`rounded-lg border p-3 ${
              m.impact === 'critical'
                ? 'border-red-500/30 bg-red-950/20'
                : m.impact === 'high'
                ? 'border-orange-500/30 bg-orange-950/20'
                : 'border-yellow-500/30 bg-yellow-950/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current ${
                  m.impact === 'critical' ? 'text-red-400' : m.impact === 'high' ? 'text-orange-400' : 'text-yellow-400'
                }`}
              >
                {m.impact}
              </span>
              <span className="font-semibold text-white text-xs">{m.mistake}</span>
            </div>
            <p className="text-xs text-slate-300">
              <span className="text-emerald-300 font-semibold">Fix: </span>
              {m.fix}
            </p>
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

const PluginLoadOrderHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('xedit');

  useEffect(() => {
    const saved = sessionStorage.getItem('plugin_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('plugin_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Database className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Plugin &amp; Load Order</h1>
            <p className="text-xs text-slate-400">
              xEdit · PRP Precombines · Load Order — all plugin work in one place
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
        {activeTab === 'xedit' && (
          <PanelLoader>
            <XEditTools />
          </PanelLoader>
        )}
        {activeTab === 'prp' && (
          <PanelLoader>
            <PrecombineGenerator />
          </PanelLoader>
        )}
        {activeTab === 'loadorder' && (
          <PanelLoader>
            <LoadOrderHub />
          </PanelLoader>
        )}
        {activeTab === 'guide' && <FO4PluginGuide />}
      </div>
    </div>
  );
};

export default PluginLoadOrderHub;
