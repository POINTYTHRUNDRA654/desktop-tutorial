/**
 * FO4 Plugin & Load Order Hub
 *
 * Unified platform for xEdit operations, PRP patch generation, load order management,
 * and comprehensive FO4 plugin/load-order reference.
 * Consolidates: xEdit Tools · PRP Patch Tools · Load Order Hub · FO4 Plugin Guide
 */

import React, { useState, useEffect, Suspense } from 'react';
import {
  Database, Zap, List, BookOpen, ChevronRight,
  AlertTriangle, CheckCircle, Shield, Wrench,
  FileCode, Info, GitMerge, FolderOpen, RefreshCw,
  Download, CheckCircle2, XCircle, AlertCircle, Filter,
} from 'lucide-react';

const XEditTools = React.lazy(() => import('./XEditTools'));
const PrecombineGenerator = React.lazy(() => import('./PrecombineGenerator'));
const LoadOrderHub = React.lazy(() => import('./LoadOrderHub'));
const EspMiningPanel = React.lazy(() => import('./EspMiningPanel'));

type HubTab = 'xedit' | 'prp' | 'loadorder' | 'guide' | 'merge-scanner' | 'esp-mining';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'xedit', icon: Database, label: 'xEdit Tools', sublabel: 'Clean · Script · Analyse' },
  { id: 'prp', icon: Zap, label: 'PRP Patch Tools', sublabel: 'Precombine · Previs' },
  { id: 'loadorder', icon: List, label: 'Load Order', sublabel: 'Analyze · Optimize · LOOT' },
  { id: 'esp-mining', icon: GitMerge, label: 'ESP Mining', sublabel: 'FormID · Cells · Quests' },
  { id: 'guide', icon: BookOpen, label: 'FO4 Plugin Guide', sublabel: 'ESL · Conflicts · SEQ · LOOT' },
  { id: 'merge-scanner', icon: GitMerge, label: 'Merge Scanner', sublabel: 'zMerge candidates' },
];

// ============================================================================
// Reference Data
// ============================================================================

const LOAD_ORDER_RULES = [
  { rule: 'Masters always load before dependents', detail: 'FO4 enforces this automatically. ESM/ESP that depends on another plugin must have it listed as a master (MAST record). If a master is missing from the load order, the game CTD on startup.' },
  { rule: 'Official DLCs before unofficial patches (UFO4P)', detail: 'Correct order: DLCRobot > DLCworkshop01 > DLCCoast > DLCworkshop02 > DLCworkshop03 > DLCNukaWorld > Unofficial Fallout 4 Patch.esp. UFO4P must load after all DLCs it patches.' },
  { rule: 'LOOT automatically assigns positions for most mods', detail: 'LOOT (Load Order Optimisation Tool) uses community-curated masterlist rules. Run LOOT after any mod change and before playing. Only override manually for well-documented conflict reasons.' },
  { rule: 'ESL-flagged plugins share the FE slot', detail: 'ESL/ESP-FE plugins occupy indices FE000–FEFFF and do not count toward the 255-plugin limit. Load order position of ESLs relative to each other still matters for record overrides.' },
  { rule: 'Conflict resolution: last-loaded wins', detail: 'For a record that two ESPs both override, the ESP loaded later wins. Patches and overrides belong near the bottom of the load order, after the mods they patch.' },
  { rule: 'Bashed Patch must be the last ESP in the load order', detail: "Wrye Bash's Bashed Patch merges leveled lists and keywords from all loaded ESPs. It must load last so it captures all changes. Regenerate after changing load order." },
];

const XEDIT_WORKFLOW = [
  { step: '1. Load the plugin in xEdit', detail: 'Launch FO4Edit. Right-click → Select None, then check only your plugin (and its masters if prompted). Wait for background loader to finish (green "Background Loader: finished" in the Messages panel).' },
  { step: '2. Clean ITMs (Identical to Master records)', detail: 'Right-click your plugin → Apply Filter for Cleaning. Then right-click → Remove Identical to Master Records. If the count is zero, no ITMs exist — move on.' },
  { step: '3. Clean UDRs (Undelete and Disable References)', detail: 'After ITM cleaning, right-click the plugin → Undelete and Disable References. This converts deleted placed references to the disabled+XDCR pattern, which is engine-safe.' },
  { step: '4. Check for errors', detail: 'Right-click plugin → Check for Errors. Most "could not be resolved" errors indicate broken FormID cross-references — fix or remove those records before distributing.' },
  { step: '5. Compact FormIDs for ESL flag (if applicable)', detail: 'If you want to flag the plugin as ESL, right-click → Compact FormIDs for ESL. This reassigns all new FormIDs to the 0x000–0x7FF range. Do this ONLY before distributing and NEVER after a save-game has referenced this plugin.' },
  { step: '6. Save', detail: 'Ctrl+S or close xEdit and confirm save. Always back up the original before cleaning.' },
];

const PRP_WORKFLOW = [
  { step: 'Set up xEdit path', detail: 'Point Mossy to FO4Edit.exe in Settings. The PRP generator uses xEdit scripts for precombine data baking.' },
  { step: 'Import your MO2 profile plugins.txt', detail: 'Provide the path to the MO2 profile directory. The wizard reads plugins.txt and appdata LoadOrder.txt for the correct full load order.' },
  { step: 'Generate xEdit patch script', detail: 'Mossy generates a real FO4Edit Pascal script (.pas) that copies winning overrides and clears XCRI/XCMO from every conflicted CELL in your load order.' },
  { step: 'Run xEdit with the script', detail: 'Launch FO4Edit with your full load order and use Apply Script. This creates "Mossy Combined Patch.esp" and bakes the precombine reference clearing into it.' },
  { step: 'Rebuild Precombines in CK (for your own mod)', detail: 'If you are the mod author: load the CK with your mod as the active file. Run World → Precombine / Previs → Generate Precombined Data. Time: ~5 min for a few cells, up to 60+ min for large worldspaces.' },
  { step: 'Pack output into BA2', detail: 'Pack the generated precombine meshes and visibility data into a BA2 archive (General type). Name it: YourMod - Main.ba2.' },
];

const COMMON_MISTAKES = [
  { mistake: 'Skipping the ITM/UDR clean step', impact: 'high', fix: 'Clean with xEdit before every release. Dirty plugins cause save bloat and can silently override other mods\' changes.' },
  { mistake: 'Not regenerating Bashed Patch after load order change', impact: 'medium', fix: 'Regenerate the Bashed Patch in Wrye Bash every time mods are added, removed, or reordered. Stale Bashed Patches produce wrong leveled lists.' },
  { mistake: 'Editing exterior objects without regenerating precombines', impact: 'critical', fix: 'Any moved or deleted static in a precombined zone breaks precombines for that cell — major FPS drop and possible crash. Always regenerate precombine + previs after exterior edits.' },
  { mistake: 'ESL flag without compacting FormIDs first', impact: 'critical', fix: 'ESL plugins MUST use FormIDs in 0x000–0x7FF. Compact with xEdit before flagging. Never compact after distributing — it breaks existing save games.' },
  { mistake: 'Loading more than 255 standard ESPs', impact: 'critical', fix: 'FO4 hard-caps at 255 standard ESPs. Convert small mods to ESL where possible. Wrye Bash can identify which mods qualify automatically.' },
  { mistake: 'Putting patch mods above the mods they patch', impact: 'medium', fix: 'A compatibility patch must load AFTER both mods it patches. If Patch_A_B.esp loads before A.esp, its overrides are immediately clobbered and it does nothing.' },
  { mistake: 'No SEQ file for Start Game Enabled quests', impact: 'high', fix: 'Any quest with the Start Game Enabled flag requires a matching .seq file. Without it, the quest never starts on a loaded save. Generate the SEQ file via Creation Kit → Game → Create SEQ File.' },
  { mistake: 'Navmesh edits without a compatibility patch', impact: 'high', fix: 'Navmesh records cannot be partially merged. Two mods editing the same navmesh will CTD. One must win; create a compatibility patch that contains only the winning navmesh.' },
];

const SEQ_GUIDE = [
  { step: 'Identify affected quests', detail: 'In xEdit or CK, check every QUST record in your plugin. If the Start Game Enabled flag is set (bit 0x0001 of the QUST flags field), that quest requires a SEQ file.' },
  { step: 'Generate the SEQ file via Creation Kit', detail: 'Open the CK with your plugin as the active file. Go to Game menu → Create SEQ File. The CK writes a .seq binary file that tells the engine to check this quest on every save load.' },
  { step: 'Place the SEQ file correctly', detail: 'The file must be at: <mod folder>/SEQ/<PluginName>.seq. In MO2, this goes inside your mod\'s folder structure. If using loose files, place it in the FO4 Data/SEQ/ folder.' },
  { step: 'Pack into a BA2 (for distribution)', detail: 'Include the SEQ file in your mod\'s General BA2. If you forget the SEQ file, testers will report that your quest "doesn\'t start" — it\'s the most common quest mod bug.' },
];

const WRYE_BASH_GUIDE = [
  { step: 'Install Wrye Bash and scan your mods', detail: 'Wrye Bash reads all active ESPs and identifies which ones modify leveled lists (LVLI, LVLN, LVSP) and which define keywords (KYWD). These are the record types that need merging.' },
  { step: 'Rebuild the Bashed Patch', detail: 'In Wrye Bash, right-click the Bashed Patch entry → Rebuild Patch. Select merging options. The Bashed Patch consolidates all leveled list changes from all ESPs so nothing is overridden.' },
  { step: 'Place Bashed Patch last in the load order', detail: 'The Bashed Patch.esp must be the final ESP in your load order. Any ESP loaded after it can override its merged lists, defeating the purpose. LOOT usually handles this automatically.' },
  { step: 'Rebuild after every load order change', detail: 'Any time you add, remove, update, or reorder mods, rebuild the Bashed Patch. An outdated patch is worse than no patch — it may merge deleted or outdated records.' },
];

const NAVMESH_RULES = [
  { rule: 'Navmesh records cannot be merged', detail: 'Unlike most records (where the last-loaded version wins cleanly), two plugins editing the same navmesh triangle causes a CTD. Only one plugin\'s version of the navmesh can load.' },
  { rule: 'Navmesh conflicts always require a compatibility patch', detail: 'The patch must include only the winning navmesh data (usually the more carefully edited version). Both mods must be declared as masters of the patch.' },
  { rule: 'Never delete navmesh triangles', detail: 'Deleting a navmesh triangle leaves a gap that NPCs try to path through, causing infinite loops and freezes. Instead, disable the triangle or reshape it around your new geometry.' },
  { rule: 'Run navmesh finalization in CK before release', detail: 'After editing navmesh in CK, use World → Finalize World Navmeshes. This bakes the path data. Without finalization, NPCs may not path through the edited areas correctly.' },
];

const F4SE_COMPAT = [
  { item: 'Check F4SE version compatibility before updating', detail: 'F4SE is tied to a specific game version. When Bethesda releases an update, F4SE breaks until updated. Always check the F4SE site (f4se.silverlock.org) before updating FO4 through Steam.' },
  { item: 'F4SE plugins (.dll) require matching F4SE and game versions', detail: 'SKSE/F4SE plugins are compiled against specific API headers. A .dll built for F4SE 0.6.x will not load in F4SE 0.7.x. Keep a backup of the previous game version before updating.' },
  { item: 'Use MO2\'s game version pinning feature', detail: 'MO2 can block Steam from auto-updating FO4. In MO2 settings, enable the "Lock game version" option and add FO4 to Steam\'s "Pause Updates" list to prevent surprise breaks.' },
  { item: 'Papyrus scripts do not require F4SE by default', detail: 'Standard Papyrus scripts work without F4SE. Only scripts calling F4SE-specific functions (via SKSE/F4SE Papyrus extensions) require it. Mark your mod\'s F4SE dependency explicitly in the description.' },
];

// ============================================================================
// FO4 Plugin Guide Component
// ============================================================================

const Section: React.FC<{ title: string; icon: React.ReactNode; color?: string; children: React.ReactNode }> = ({
  title, icon, color = 'border-slate-700 bg-slate-900/60', children,
}) => (
  <div className={`rounded-xl border ${color} p-5`}>
    <h3 className="text-base font-bold text-emerald-300 mb-4 flex items-center gap-2">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const FO4PluginGuide: React.FC = () => (
  <div className="space-y-7 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Plugin & Load Order Reference</h2>
      <p className="text-emerald-100/80 leading-relaxed">
        Comprehensive guide to xEdit cleaning, load order rules, PRP precombine workflow, SEQ files,
        Wrye Bash, navmesh patching, ESL/FormID limits, F4SE compatibility, and LOOT — for stable,
        performance-optimized Fallout 4 mod releases.
      </p>
    </div>

    {/* Load Order Rules */}
    <Section title="Load Order Rules" icon={<List className="h-5 w-5" />}>
      <div className="space-y-3">
        {LOAD_ORDER_RULES.map(r => (
          <div key={r.rule} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-sm">{r.rule}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* Plugin Type Quick Reference */}
    <Section title="Plugin Count & ESL Quick Reference" icon={<Database className="h-5 w-5" />}>
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
              { type: 'ESL (light)', slot: 'FE000–FEFFF (4096 total)', max: '2,048 (0x000–0x7FF)', loot: 'Partial (position within FE range)' },
              { type: 'ESP-FE (ESL-flagged ESP)', slot: 'FE000–FEFFF', max: '2,048', loot: 'Same as ESL' },
            ].map(r => (
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
    </Section>

    {/* xEdit Cleaning Workflow */}
    <Section title="xEdit Cleaning Workflow" icon={<Database className="h-5 w-5" />}>
      <ol className="space-y-3">
        {XEDIT_WORKFLOW.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>

    {/* SEQ File Guide */}
    <Section title="SEQ Files — Quest Start on Save Load" icon={<FileCode className="h-5 w-5" />} color="border-purple-500/30 bg-purple-950/20">
      <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-900/10 px-4 py-3 text-xs text-purple-200">
        <strong>The single most common quest mod bug.</strong> If your quest has the "Start Game Enabled" flag and you
        ship without a SEQ file, the quest will not start when loading an existing save — only on a new game.
        Every quest mod that targets existing saves needs this file.
      </div>
      <ol className="space-y-3">
        {SEQ_GUIDE.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center border border-purple-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>

    {/* PRP Workflow */}
    <Section title="PRP Precombine Patch Workflow" icon={<Zap className="h-5 w-5" />} color="border-blue-500/30 bg-blue-950/20">
      <ol className="space-y-3">
        {PRP_WORKFLOW.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center border border-blue-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-lg border border-amber-600/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
        <strong>Note:</strong> PRP patch generation requires xEdit and the Creation Kit. The PRP Patch Tools tab above
        provides a guided wizard. Always test the patch in a clean save before distributing.
      </div>
    </Section>

    {/* Wrye Bash / Bashed Patch */}
    <Section title="Wrye Bash & Bashed Patch" icon={<Wrench className="h-5 w-5" />} color="border-amber-500/30 bg-amber-950/20">
      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/10 px-4 py-3 text-xs text-amber-200">
        The Bashed Patch merges leveled lists and keyword data from all your mods. Without it, only one mod's
        leveled list changes survive — usually whichever loads last. If you use more than a handful of mods
        that add NPCs, loot, or vendor lists, the Bashed Patch is mandatory for a balanced game.
      </div>
      <ol className="space-y-3">
        {WRYE_BASH_GUIDE.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-500/30 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white text-xs">{s.step}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>

    {/* Navmesh Rules */}
    <Section title="Navmesh Safety Rules" icon={<Shield className="h-5 w-5" />} color="border-orange-500/30 bg-orange-950/20">
      <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-900/10 px-4 py-3 text-xs text-orange-200">
        Navmesh conflicts are unique — they cannot be patched the way record overrides can. Two mods editing
        the same navmesh require a dedicated compatibility patch, and one author's changes must be discarded.
        Plan navmesh work carefully before distributing.
      </div>
      <div className="space-y-3">
        {NAVMESH_RULES.map(r => (
          <div key={r.rule} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-xs">{r.rule}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* F4SE Compatibility */}
    <Section title="F4SE Compatibility Checklist" icon={<Info className="h-5 w-5" />} color="border-slate-700 bg-slate-900/60">
      <div className="space-y-3">
        {F4SE_COMPAT.map(f => (
          <div key={f.item} className="flex gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-xs">{f.item}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* Common Mistakes */}
    <Section title="Common Plugin Mistakes" icon={<AlertTriangle className="h-5 w-5" />} color="border-red-500/30 bg-red-950/20">
      <div className="space-y-3">
        {COMMON_MISTAKES.map(m => (
          <div key={m.mistake} className={`rounded-lg border p-3 ${
            m.impact === 'critical' ? 'border-red-500/30 bg-red-950/20' :
            m.impact === 'high' ? 'border-orange-500/30 bg-orange-950/20' :
            'border-yellow-500/30 bg-yellow-950/20'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current ${
                m.impact === 'critical' ? 'text-red-400' :
                m.impact === 'high' ? 'text-orange-400' : 'text-yellow-400'
              }`}>{m.impact}</span>
              <span className="font-semibold text-white text-xs">{m.mistake}</span>
            </div>
            <p className="text-xs text-slate-300">
              <span className="text-emerald-300 font-semibold">Fix: </span>{m.fix}
            </p>
          </div>
        ))}
      </div>
    </Section>
  </div>
);

// ============================================================================
// Merge Candidate Scanner
// ============================================================================

const VANILLA_MASTERS_LO = new Set([
  'fallout4.esm', 'dlcrobot.esm', 'dlcworkshop01.esm', 'dlccoast.esm',
  'dlcworkshop02.esm', 'dlcworkshop03.esm', 'dlcnukaworld.esm',
  'unofficial fallout 4 patch.esp', 'ufo4p.esp',
]);

interface PluginAnalysis {
  path: string;
  name: string;
  formIdCount: number;
  numRecords: number;
  masters: string[];
  eslSafe: boolean;
  eslFlag: boolean;
  esmFlag: boolean;
  hasNavmesh: boolean;
  hasScripts: boolean;
  hasPrecombines: boolean;
  fileSizeMB: number;
  typeCounts: Record<string, number>;
  isSharedMaster: boolean;
  category: 'esl-candidate' | 'esp-candidate' | 'needs-review' | 'blocked';
  blockReasons: string[];
  warnReasons: string[];
  error?: string;
}

function applyCategory(p: PluginAnalysis, all: PluginAnalysis[]): void {
  const nameLo = p.name.toLowerCase();
  p.isSharedMaster = all.some(
    o => o.name.toLowerCase() !== nameLo && o.masters.some(m => m.toLowerCase() === nameLo),
  );
  p.blockReasons = [];
  p.warnReasons = [];
  if (p.esmFlag || p.isSharedMaster || p.hasNavmesh) {
    p.category = 'blocked';
    if (p.esmFlag) p.blockReasons.push('ESM flag — zMerge cannot merge ESM files');
    if (p.isSharedMaster) p.blockReasons.push('Other plugins in the load order list this as a master');
    if (p.hasNavmesh) p.blockReasons.push('Contains NAVM records — navmesh merges require manual resolution');
  } else if (p.hasScripts || p.hasPrecombines) {
    p.category = 'needs-review';
    if (p.hasScripts) p.warnReasons.push('Scripts present — check for hardcoded FormIDs in compiled Papyrus bytecode before merging');
    if (p.hasPrecombines) p.warnReasons.push('Has precombine data — rebuild previs after merging');
  } else if (p.eslFlag || p.eslSafe) {
    p.category = 'esl-candidate';
  } else {
    p.category = 'esp-candidate';
  }
}

const CAT_META = {
  'esl-candidate': { label: 'ESL Ready',    color: 'emerald', desc: 'ESL-flagged or ESL-safe — top zMerge candidates, free up the most slots' },
  'esp-candidate': { label: 'ESP Merge',     color: 'blue',    desc: 'Standard ESP — safe to merge, frees one slot per plugin consolidated' },
  'needs-review':  { label: 'Needs Review', color: 'amber',   desc: 'Has scripts or precombines — verify before merging' },
  'blocked':       { label: 'Blocked',      color: 'red',     desc: 'Cannot safely merge — ESM, shared master, or navmesh records' },
} as const;

type CatKey = keyof typeof CAT_META;

const COLOR_BORDER: Record<string, string> = {
  emerald: 'border-emerald-500/25', blue: 'border-blue-500/25',
  amber: 'border-amber-500/25',    red: 'border-red-500/25',
};
const COLOR_BADGE: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  blue:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  amber:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  red:     'bg-red-500/20 text-red-300 border-red-500/30',
};
const COLOR_CARD: Record<string, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300',
  blue:    'border-blue-500/30 bg-blue-900/20 text-blue-300',
  amber:   'border-amber-500/30 bg-amber-900/20 text-amber-300',
  red:     'border-red-500/30 bg-red-900/20 text-red-300',
};

const MergeCandidateScanner: React.FC = () => {
  const api = (window as any).electron?.api;

  const [sourceMode, setSourceMode]   = useState<'mo2' | 'data' | null>(null);
  const [profilePath, setProfilePath] = useState('');
  const [dataPath, setDataPath]       = useState(() => localStorage.getItem('merge_scanner_data_path') ?? '');
  const [scanning, setScanning]       = useState(false);
  const [progress, setProgress]       = useState({ done: 0, total: 0, current: '' });
  const [results, setResults]         = useState<PluginAnalysis[]>([]);
  const [scanErr, setScanErr]         = useState('');
  const [catFilter, setCatFilter]     = useState<CatKey | 'all'>('all');

  const pickProfile = async () => {
    try {
      const p = await api.pickMo2ProfileDir();
      if (p) { setProfilePath(p); setSourceMode('mo2'); setResults([]); setScanErr(''); }
    } catch (e: any) { setScanErr(e?.message ?? 'Dialog failed'); }
  };

  const pickDataFolder = async () => {
    try {
      const p = await api.pickDirectory('Select Fallout 4 Data folder');
      if (p) {
        setDataPath(p);
        localStorage.setItem('merge_scanner_data_path', p);
        if (sourceMode !== 'mo2') setSourceMode('data');
        setResults([]);
        setScanErr('');
      }
    } catch (e: any) { setScanErr(e?.message ?? 'Dialog failed'); }
  };

  const scan = async () => {
    if (!profilePath && !dataPath) { setScanErr('Select a source to scan.'); return; }
    setScanning(true); setScanErr(''); setResults([]);
    try {
      let pluginPaths: string[] = [];

      if (sourceMode === 'mo2' && profilePath) {
        const raw: string = await api.readFile(`${profilePath}\\plugins.txt`);
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        let enabled = lines.filter(l => l.startsWith('*')).map(l => l.slice(1).trim());
        if (!enabled.length) enabled = [...lines];
        const base = dataPath || 'E:\\Steam\\steamapps\\common\\Fallout 4\\Data';
        pluginPaths = enabled.filter(n => /\.(esp|esm|esl)$/i.test(n)).map(n => `${base}\\${n}`);
      } else {
        const base = dataPath || profilePath;
        const files: Array<{ path: string; type: string }> = await api.scanModDirectoryPath(base);
        pluginPaths = files.filter(f => /\.(esp|esm|esl)$/i.test(f.path)).map(f => f.path);
      }

      pluginPaths = pluginPaths.filter(p => !VANILLA_MASTERS_LO.has((p.split('\\').pop() ?? '').toLowerCase()));

      if (!pluginPaths.length) {
        setScanErr('No mod plugins found. Check paths and try again.');
        setScanning(false);
        return;
      }

      setProgress({ done: 0, total: pluginPaths.length, current: '' });
      const analysed: PluginAnalysis[] = [];

      for (let i = 0; i < pluginPaths.length; i++) {
        const path = pluginPaths[i];
        const name = path.split('\\').pop() ?? path;
        setProgress({ done: i, total: pluginPaths.length, current: name });
        try {
          const r = await api.ckInspectPlugin(path);
          if (r.success && r.data) {
            analysed.push({
              path, name,
              formIdCount: r.data.formIdCount ?? 0,
              numRecords:  r.data.numRecords  ?? 0,
              masters:     r.data.masters     ?? [],
              eslSafe:     r.data.eslSafe     ?? false,
              eslFlag:     r.data.eslFlag     ?? false,
              esmFlag:     r.data.esmFlag     ?? false,
              hasNavmesh:  r.data.hasNavmesh  ?? false,
              hasScripts:  r.data.hasScripts  ?? false,
              hasPrecombines: r.data.hasPrecombines ?? false,
              fileSizeMB:  r.data.fileSizeMB  ?? 0,
              typeCounts:  r.data.typeCounts  ?? {},
              isSharedMaster: false, category: 'esp-candidate',
              blockReasons: [], warnReasons: [],
            });
          } else {
            analysed.push({
              path, name, formIdCount: 0, numRecords: 0, masters: [],
              eslSafe: false, eslFlag: false, esmFlag: false, hasNavmesh: false,
              hasScripts: false, hasPrecombines: false, fileSizeMB: 0, typeCounts: {},
              isSharedMaster: false, category: 'blocked',
              blockReasons: ['Scan error: ' + (r.error ?? 'unknown')],
              warnReasons: [], error: r.error,
            });
          }
        } catch (e: any) {
          analysed.push({
            path, name, formIdCount: 0, numRecords: 0, masters: [],
            eslSafe: false, eslFlag: false, esmFlag: false, hasNavmesh: false,
            hasScripts: false, hasPrecombines: false, fileSizeMB: 0, typeCounts: {},
            isSharedMaster: false, category: 'blocked',
            blockReasons: ['Error: ' + (e?.message ?? 'unknown')],
            warnReasons: [], error: e?.message,
          });
        }
      }

      analysed.forEach(p => applyCategory(p, analysed));
      setProgress({ done: pluginPaths.length, total: pluginPaths.length, current: '' });
      setResults(analysed);
    } catch (e: any) {
      setScanErr(e?.message ?? 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const exportProfile = async (cat: 'esl-candidate' | 'esp-candidate') => {
    const candidates = results.filter(r => r.category === cat);
    if (!candidates.length) return;
    const label = cat === 'esl-candidate' ? 'ESL-Bundle' : 'ESP-Bundle';
    const profile = {
      filename: `Mossy ${label}.esp`,
      method: 'Overrides',
      plugins: candidates.map(c => ({
        filename: c.name,
        dataFolder: c.path.replace(/\\[^\\]+$/, ''),
        enabled: true,
      })),
      buildMergedArchive: false,
      handleFaceData: true, handleVoiceData: true, handleBillboards: true,
      handleStringFiles: true, handleTranslations: true, handleIniFiles: true,
      handleScriptFragments: true, copyGeneralAssets: true,
    };
    try {
      await api.saveFile(JSON.stringify(profile, null, 2), `mossy-zmerge-${label.toLowerCase()}.json`);
    } catch (e: any) {
      setScanErr('Export failed: ' + (e?.message ?? 'unknown'));
    }
  };

  const counts: Record<CatKey, number> = {
    'esl-candidate': 0, 'esp-candidate': 0, 'needs-review': 0, 'blocked': 0,
  };
  results.forEach(r => counts[r.category]++);
  const displayed = catFilter === 'all' ? results : results.filter(r => r.category === catFilter);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-5 text-sm text-slate-200">
      {/* Header */}
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-black/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <GitMerge className="h-5 w-5 text-violet-300" />
          <h2 className="text-lg font-black text-white">Merge Candidate Scanner</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Scans your load order and identifies which plugins can be safely merged with zMerge.
          Detects navmesh conflicts, shared masters, ESM blocks, and scripts with potential hardcoded FormIDs.
          Exports a ready-to-import zMerge profile JSON.
        </p>
      </div>

      {/* Source selection */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Scan Source</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={pickProfile}
            className={`rounded-lg border p-3 text-left transition-all ${
              sourceMode === 'mo2'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">MO2 Profile</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Reads <code className="text-violet-300">plugins.txt</code> from a Mod Organizer 2 profile directory
            </p>
            {profilePath && (
              <p className="text-[10px] text-violet-300 mt-1 truncate">{profilePath}</p>
            )}
          </button>

          <button
            onClick={pickDataFolder}
            className={`rounded-lg border p-3 text-left transition-all ${
              sourceMode === 'data'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">FO4 Data Folder</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Scans all .esp/.esm/.esl files directly inside the Fallout 4 Data directory
            </p>
            {sourceMode === 'data' && dataPath && (
              <p className="text-[10px] text-violet-300 mt-1 truncate">{dataPath}</p>
            )}
          </button>
        </div>

        {/* MO2 mode: also need the FO4 Data path for resolving absolute plugin paths */}
        {sourceMode === 'mo2' && (
          <div>
            <p className="text-[10px] text-slate-400 mb-1">
              FO4 Data folder <span className="text-slate-500">(needed to locate plugin files from plugins.txt)</span>
            </p>
            <div className="flex gap-2">
              <input
                value={dataPath}
                onChange={e => { setDataPath(e.target.value); localStorage.setItem('merge_scanner_data_path', e.target.value); }}
                placeholder="E:\Steam\steamapps\common\Fallout 4\Data"
                className="flex-1 rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 font-mono"
              />
              <button
                onClick={pickDataFolder}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={scan}
            disabled={scanning || (!profilePath && !dataPath)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? `Scanning ${progress.done}/${progress.total}…` : 'Scan Plugins'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span className="truncate max-w-xs">{progress.current || 'Preparing…'}</span>
            <span className="flex-shrink-0 ml-2">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {scanErr && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 flex gap-2 items-start">
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {scanErr}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(CAT_META) as CatKey[]).map(cat => {
              const m = CAT_META[cat];
              const active = catFilter === cat;
              return (
                <div
                  key={cat}
                  onClick={() => setCatFilter(active ? 'all' : cat)}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    COLOR_CARD[m.color]
                  } ${active ? 'ring-1 ring-current' : 'opacity-75 hover:opacity-100'}`}
                >
                  <p className="text-2xl font-black mb-0.5">{counts[cat]}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider">{m.label}</p>
                  <p className="text-[10px] opacity-70 leading-tight mt-1">{m.desc}</p>
                  {(cat === 'esl-candidate' || cat === 'esp-candidate') && counts[cat] > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); exportProfile(cat); }}
                      className="mt-2 flex items-center gap-1 text-[10px] font-semibold hover:opacity-100 opacity-80"
                    >
                      <Download className="h-3 w-3" />
                      Export zMerge Profile
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter indicator */}
          {catFilter !== 'all' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="h-3 w-3" />
              Showing {CAT_META[catFilter].label} only ({displayed.length} plugin{displayed.length !== 1 ? 's' : ''})
              <button onClick={() => setCatFilter('all')} className="text-violet-400 hover:text-violet-300 ml-1">
                Clear filter
              </button>
            </div>
          )}

          {/* Plugin list */}
          <div className="space-y-2">
            {displayed.map(p => {
              const m = CAT_META[p.category];
              const nonVanillaMasters = p.masters.filter(
                ms => !VANILLA_MASTERS_LO.has(ms.toLowerCase()),
              );
              return (
                <div
                  key={p.path}
                  className={`rounded-lg border ${COLOR_BORDER[m.color] ?? 'border-slate-700'} bg-slate-900/40 p-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.category === 'esl-candidate' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                      {p.category === 'esp-candidate' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />}
                      {p.category === 'needs-review'  && <AlertCircle  className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />}
                      {p.category === 'blocked'       && <XCircle      className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      <span className="font-semibold text-white text-xs truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {p.eslFlag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-violet-500/20 text-violet-300 border-violet-500/30 font-semibold">ESL</span>
                      )}
                      {p.esmFlag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-orange-500/20 text-orange-300 border-orange-500/30 font-semibold">ESM</span>
                      )}
                      {p.eslSafe && !p.eslFlag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold">ESL-safe</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${COLOR_BADGE[m.color] ?? ''}`}>
                        {m.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
                    {p.fileSizeMB > 0 && <span>{p.fileSizeMB.toFixed(1)} MB</span>}
                    {p.formIdCount > 0 && <span>{p.formIdCount.toLocaleString()} FormIDs</span>}
                    {p.numRecords  > 0 && <span>{p.numRecords.toLocaleString()} records</span>}
                    {nonVanillaMasters.length > 0 && (
                      <span className="text-slate-400">
                        + masters: {nonVanillaMasters.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Block reasons */}
                  {p.blockReasons.map(r => (
                    <div key={r} className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-300">
                      <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      {r}
                    </div>
                  ))}

                  {/* Warn reasons */}
                  {p.warnReasons.map(r => (
                    <div key={r} className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-300">
                      <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      {r}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Empty filtered state */}
          {displayed.length === 0 && catFilter !== 'all' && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No plugins in this category.
            </div>
          )}
        </div>
      )}

      {/* Empty initial state */}
      {!scanning && results.length === 0 && !scanErr && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
          <GitMerge className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">No scan results yet</p>
          <p className="text-xs text-slate-600 mt-1">
            Pick a source and click Scan Plugins to analyse your load order.
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Hub Component
// ============================================================================

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  }>
    {children}
  </Suspense>
);

const PluginLoadOrderHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('xedit');

  useEffect(() => {
    const saved = sessionStorage.getItem('plugin_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some(t => t.id === saved)) setActiveTab(saved);
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
            <h1 className="text-xl font-black text-white tracking-tight">FO4 Plugin &amp; Load Order Hub</h1>
            <p className="text-xs text-slate-400">xEdit · PRP Precombines · Load Order · SEQ — all plugin work in one place</p>
          </div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TAB_DEFS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
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
        {activeTab === 'xedit'          && <PanelLoader><XEditTools /></PanelLoader>}
        {activeTab === 'prp'            && <PanelLoader><PrecombineGenerator /></PanelLoader>}
        {activeTab === 'loadorder'      && <PanelLoader><LoadOrderHub /></PanelLoader>}
        {activeTab === 'esp-mining'     && <PanelLoader><EspMiningPanel /></PanelLoader>}
        {activeTab === 'guide'          && <FO4PluginGuide />}
        {activeTab === 'merge-scanner'  && <MergeCandidateScanner />}
      </div>
    </div>
  );
};

export default PluginLoadOrderHub;
