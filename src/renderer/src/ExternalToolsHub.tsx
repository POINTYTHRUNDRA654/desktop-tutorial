/**
 * FO4 External Integrations Hub
 *
 * Unified interface for Fallout 4 external tool integrations.
 * Consolidates: MO2 Extension · ComfyUI Extension · Upscayl Extension
 * Auto-connect panel: detects and surfaces every desktop tool in the FO4 modding pipeline.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Package, Network, Maximize2, ChevronRight, RefreshCw,
  CheckCircle2, Zap, ExternalLink, Play,
} from 'lucide-react';
import { useI18n } from './i18n';

const MO2Extension = React.lazy(() =>
  import('./MO2Extension').then((m) => ({ default: m.MO2Extension }))
);
const ComfyUIExtension = React.lazy(() =>
  import('./ComfyUIExtension').then((m) => ({ default: m.ComfyUIExtension }))
);
const UpscaylExtension = React.lazy(() =>
  import('./UpscaylExtension').then((m) => ({ default: m.UpscaylExtension }))
);

type HubTab = 'mo2' | 'comfyui' | 'upscayl';

type AutoConnectTool = {
  id: string;
  label: string;
  match: string[];
  installUrl?: string;
  category: 'mod-manager' | 'editor' | 'ai' | 'utility';
};

type AutoConnectStatus = AutoConnectTool & {
  installed: boolean;
  running: boolean;
  path?: string;
};

type DetectedProgram = {
  name?: string;
  displayName?: string;
  path?: string;
  version?: string;
};

const TAB_META: { id: HubTab; icon: React.ComponentType<{ className?: string }>; fallbackLabel: string; fallbackSublabel: string }[] = [
  { id: 'mo2',     icon: Package,   fallbackLabel: 'MO2 Integration', fallbackSublabel: 'Mod Organizer 2' },
  { id: 'comfyui', icon: Network,   fallbackLabel: 'ComfyUI',         fallbackSublabel: 'AI Image Generation' },
  { id: 'upscayl', icon: Maximize2, fallbackLabel: 'Upscayl',         fallbackSublabel: 'AI Upscaling' },
];

const TOOL_INFO_META = [
  {
    id: 'mo2',
    name: 'Mod Organizer 2 (MO2)',
    fallbackDesc: 'The industry-standard mod manager for Fallout 4. Mossy reads your MO2 profile to understand your active mod list and load order. Install: Nexus Mod Manager page or official GitHub.',
    fallbackTips: [
      'Use separate MO2 profiles for different playthroughs or testing configurations.',
      'Enable "Manageable" mode in MO2 settings to allow Mossy to read your active plugin list.',
      'MO2 virtual file system (VFS) is transparent to the game — files in MO2 override order matches load order priority.',
      'Use the "Conflicts" tab in MO2 to see file-level asset conflicts before plugin-level conflicts.',
    ],
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    fallbackDesc: 'Node-based AI image generation. Use for creating concept art, texture references, NPC portraits, and promotional artwork for your mods. Requires a GPU with at least 6 GB VRAM.',
    fallbackTips: [
      "Use ComfyUI's img2img workflow to generate texture variations from existing in-game screenshots.",
      'ControlNet pose conditioning helps create accurate character reference art matching FO4 skeleton proportions.',
      'Export AI-generated art at 4096x4096 minimum for texture use — then downscale and compress to DDS via the Textures & Materials hub.',
      'Stable Diffusion fine-tunes (LoRAs) trained on Fallout concept art can improve consistency of generated assets.',
    ],
  },
  {
    id: 'upscayl',
    name: 'Upscayl',
    fallbackDesc: 'Free, open-source AI upscaler using Real-ESRGAN models. Ideal for upscaling low-res vanilla textures, reference photos, and UI elements before DDS conversion.',
    fallbackTips: [
      'Use RealESRGAN-x4plus for general texture upscaling. The result still needs compression to BC1/BC3/BC5/BC7 after upscaling.',
      'For face/portrait textures, use ESRGAN face models to preserve fine skin detail before re-exporting to FaceGen.',
      'Upscale vanilla 512x512 textures to 2048x2048 max — going higher than 4x the original yields diminishing returns for in-game use.',
      'After upscaling, always run through a normal map bake (xNormal or Substance Painter) to reconstruct lost surface detail as normals.',
    ],
  },
];

const AUTO_CONNECT_TOOLS: AutoConnectTool[] = [
  { id: 'mo2',          label: 'Mod Organizer 2',           match: ['mod organizer', 'modorganizer', 'mo2'],         category: 'mod-manager', installUrl: 'https://www.nexusmods.com/skyrimspecialedition/mods/6194' },
  { id: 'vortex',       label: 'Vortex',                    match: ['vortex'],                                       category: 'mod-manager', installUrl: 'https://www.nexusmods.com/about/vortex/' },
  { id: 'xedit',        label: 'xEdit / FO4Edit',           match: ['xedit', 'fo4edit'],                             category: 'editor',      installUrl: 'https://www.nexusmods.com/fallout4/mods/2737' },
  { id: 'creation-kit', label: 'Creation Kit',              match: ['creation kit', 'creationkit'],                  category: 'editor',      installUrl: 'https://store.steampowered.com/app/1946160/' },
  { id: 'blender',      label: 'Blender',                   match: ['blender'],                                      category: 'editor',      installUrl: 'https://www.blender.org/download/' },
  { id: 'nifskope',     label: 'NifSkope',                  match: ['nifskope'],                                     category: 'editor',      installUrl: 'https://github.com/hexabits/nifskope/releases' },
  { id: 'bodyslide',    label: 'BodySlide / Outfit Studio', match: ['bodyslide', 'outfit studio', 'outfitstudio'],   category: 'editor',      installUrl: 'https://www.nexusmods.com/fallout4/mods/25' },
  { id: 'loot',         label: 'LOOT',                      match: ['loot'],                                         category: 'utility',     installUrl: 'https://loot.github.io/' },
  { id: 'wrye-bash',    label: 'Wrye Bash',                 match: ['wrye bash', 'wryebash'],                        category: 'utility',     installUrl: 'https://www.nexusmods.com/site/mods/591' },
  { id: 'bethini',      label: 'BethINI',                   match: ['bethini'],                                      category: 'utility',     installUrl: 'https://www.nexusmods.com/fallout4/mods/67' },
  { id: 'f4se',         label: 'F4SE (Script Extender)',    match: ['f4se', 'f4se_loader'],                          category: 'utility',     installUrl: 'https://f4se.silverlock.org/' },
  { id: 'comfyui',      label: 'ComfyUI',                   match: ['comfyui', 'comfy'],                             category: 'ai',          installUrl: 'https://github.com/comfyanonymous/ComfyUI' },
  { id: 'upscayl',      label: 'Upscayl',                   match: ['upscayl'],                                      category: 'ai',          installUrl: 'https://upscayl.org/' },
  { id: 'iclone8',      label: 'iClone 8 (Animation)',      match: ['iclone', 'reallusion'],                         category: 'editor',      installUrl: 'https://www.reallusion.com/iclone/' },
  { id: 'sniff',        label: 'Sniff (NIF Batch Patcher)', match: ['sniff'],                                        category: 'utility' },
  { id: 'cao',          label: 'Cathedral Assets Optimizer', match: ['cathedral assets optimizer', 'cathedral_assets_optimizer'], category: 'utility' },
];

const SETTINGS_AUTO_MAP: Array<{ key: string; match: string[] }> = [
  { key: 'mo2Path',          match: ['mod organizer', 'modorganizer', 'mo2'] },
  { key: 'xeditPath',        match: ['xedit', 'fo4edit'] },
  { key: 'creationKitPath',  match: ['creation kit', 'creationkit'] },
  { key: 'blenderPath',      match: ['blender'] },
  { key: 'lootPath',         match: ['loot'] },
  { key: 'nifSkopePath',     match: ['nifskope'] },
  { key: 'bodySlidePath',    match: ['bodyslide'] },
  { key: 'outfitStudioPath', match: ['outfit studio'] },
  { key: 'upscaylPath',      match: ['upscayl'] },
  { key: 'vortexPath',       match: ['vortex'] },
  { key: 'wryeBashPath',     match: ['wrye bash', 'wryebash'] },
  { key: 'sniffPath',        match: ['sniff'] },
  { key: 'caoPath',          match: ['cathedral assets optimizer', 'cathedral_assets_optimizer'] },
];

const CATEGORY_FALLBACK_LABELS: Record<AutoConnectTool['category'], string> = {
  'mod-manager': 'Mod Manager',
  'editor':      'Editor / Tool',
  'ai':          'AI / GPU',
  'utility':     'Utility',
};

const CATEGORY_COLOR: Record<AutoConnectTool['category'], string> = {
  'mod-manager': 'text-purple-300 border-purple-500/30 bg-purple-500/10',
  'editor':      'text-blue-300 border-blue-500/30 bg-blue-500/10',
  'ai':          'text-pink-300 border-pink-500/30 bg-pink-500/10',
  'utility':     'text-amber-300 border-amber-500/30 bg-amber-500/10',
};

const matchesNeedle = (value: string, needles: string[]) =>
  needles.some((needle) => value.includes(needle));

// Reliability sweep (2026-09-01): this is the FOURTH independent
// detect+filter+approve implementation found this session with the same bug
// class -- this one is the most direct version of it, since it deliberately
// included prog.path in the match text. That let a broad-but-specific-looking
// needle like 'blender' match ANY executable anywhere under a path containing
// "Blender" -- confirmed live: Blender's own bundled Python distribution
// (python.exe, pythonw.exe, cli.exe, gui.exe, pip.exe, isympy.exe, and other
// console-script stubs, none of which are Blender itself) all got approved
// as "Blender" integrations this way, surviving every other fix made earlier
// today because none of those touch this file.
//
// Round 2 (still 2026-09-01): dropping prog.path from the search text (above)
// was NOT enough on its own -- confirmed live after a real rescan, which
// produced auto-blender-3-6-cli, auto-blender-foundation-python, etc. all
// over again. Root cause: detectPrograms.ts's deep directory walk
// deliberately builds displayName as "<ancestor folder> - <exe name>" for
// any exe whose bare name doesn't already contain the ancestor folder's name
// (e.g. "Blender Foundation - cli"), specifically so a human looking at the
// raw 13,000+ program list can tell where a generically-named exe came from.
// That means "blender" was baked directly into prog.displayName itself for
// every exe under the Blender Foundation folder, path or no path. The bare
// exe name (prog.name) never gets this ancestor-folder prefix -- every
// hand-curated AUTO_CONNECT_TOOLS entry (e.g. { displayName: 'Blender',
// name: 'blender' }) sets name to the real, unprefixed program identity, so
// matching on name alone is both sufficient and correct: it still matches
// Blender's own blender.exe (name: 'blender') and every other explicit
// entry, while no longer matching a python-distribution stub whose own name
// is just "cli"/"gui"/"python" regardless of which folder produced it.
const toSearchText = (prog: DetectedProgram) =>
  `${prog.name || ''}`.toLowerCase();

// Flattened union of every AUTO_CONNECT_TOOLS match needle, used to purge
// stale 'auto-' entries this function itself created in an earlier scan but
// which no longer match any known tool (e.g. after the path-matching bug
// above got fixed, entries like auto-blender-3-6-cli should be dropped on
// the next scan rather than living forever, since this function was
// previously purely additive with no reconciliation logic at all).
const ALL_AUTO_CONNECT_NEEDLES = AUTO_CONNECT_TOOLS.reduce<string[]>(
  (acc, tool) => acc.concat(tool.match), []
);

const promoteDetectedPrograms = (installedPrograms: DetectedProgram[]) => {
  const existingRaw = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
  const existingArr = Array.isArray(existingRaw) ? existingRaw : [];

  // Purge stale auto-* entries that no longer match any AUTO_CONNECT_TOOLS
  // needle. Preserve anything the user chose explicitly (manual-/onboard-
  // ids) or explicitly denied (checked===false), and preserve any non-auto-
  // entry untouched -- this function only owns entries it created itself.
  //
  // Round 2: check ea.name FIRST, falling back to ea.displayName only when
  // name is missing -- matching toSearchText's own fix above. The stored
  // `name` field is always the bare exeName (set as `prog.name || displayName`
  // when this function creates an entry), while `displayName` can carry the
  // "<ancestor folder> - <exe name>" prefix detectPrograms.ts adds for
  // generically-named exes. Checking displayName first here would silently
  // re-preserve exactly the junk this purge exists to remove -- confirmed
  // live: a stored entry like {name:'cli', displayName:'Blender Foundation -
  // cli'} still matched the 'blender' needle via displayName even after
  // toSearchText itself was fixed, so nothing actually got purged on rescan.
  const existing = existingArr.filter((ea: any) => {
    const idStr = typeof ea?.id === 'string' ? ea.id : '';
    if (!idStr.startsWith('auto-')) return true;
    if (ea?.checked === false) return true;
    const nameLower = (ea.name || ea.displayName || '').toLowerCase();
    return ALL_AUTO_CONNECT_NEEDLES.some((needle) => nameLower.includes(needle));
  });
  const merged = [...existing];

  installedPrograms.forEach((prog) => {
    const search = toSearchText(prog);
    if (!AUTO_CONNECT_TOOLS.some((tool) => matchesNeedle(search, tool.match))) return;

    const displayName = prog.displayName || prog.name || 'Detected Tool';
    const existingIndex = merged.findIndex(
      (app: any) => (app.displayName || app.name || '').toLowerCase() === displayName.toLowerCase()
    );
    const normalized = {
      id: `auto-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: prog.name || displayName,
      displayName,
      category: 'Tool',
      checked: true,
      path: prog.path,
      version: prog.version,
    };

    if (existingIndex === -1) {
      merged.push(normalized);
    } else {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...normalized,
        path: merged[existingIndex].path || normalized.path,
        version: merged[existingIndex].version || normalized.version,
      };
    }
  });

  localStorage.setItem('mossy_apps', JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('mossy-apps-updated', { detail: merged }));
};

const autoRegisterToolPaths = async (bridge: any, installedPrograms: DetectedProgram[]) => {
  if (!bridge?.getSettings || !bridge?.setSettings) return;
  const settings = await bridge.getSettings().catch(() => null);
  if (!settings) return;

  const updates: Record<string, string> = {};
  SETTINGS_AUTO_MAP.forEach(({ key, match }) => {
    if (typeof settings[key] === 'string' && settings[key].trim()) return;
    const detected = installedPrograms.find((prog) => {
      const search = toSearchText(prog);
      return !!prog.path && matchesNeedle(search, match);
    });
    if (detected?.path) updates[key] = detected.path;
  });

  if (Object.keys(updates).length === 0) return;
  await bridge.setSettings(updates);
  window.dispatchEvent(new CustomEvent('mossy-settings-updated', { detail: { ...settings, ...updates } }));
};

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">{t('common.loading', 'Loading…')}</div>}>
      {children}
    </Suspense>
  );
};

// Component

const ExternalToolsHub: React.FC = () => {
  const { t } = useI18n();
  const TAB_DEFS = TAB_META.map((tab) => ({
    ...tab,
    label: t(`externalToolsHub.tabs.${tab.id}.label`, tab.fallbackLabel),
    sublabel: t(`externalToolsHub.tabs.${tab.id}.sublabel`, tab.fallbackSublabel),
  }));
  const TOOL_INFO = TOOL_INFO_META.map((tool) => ({
    ...tool,
    desc: t(`externalToolsHub.toolInfo.${tool.id}.desc`, tool.fallbackDesc),
    fo4tips: tool.fallbackTips.map((tip, i) => t(`externalToolsHub.toolInfo.${tool.id}.tips.${i}`, tip)),
  }));
  const CATEGORY_KEY_MAP: Record<AutoConnectTool['category'], string> = {
    'mod-manager': 'modManager', 'editor': 'editor', 'ai': 'ai', 'utility': 'utility',
  };
  const CATEGORY_LABELS: Record<AutoConnectTool['category'], string> = Object.fromEntries(
    (Object.keys(CATEGORY_FALLBACK_LABELS) as AutoConnectTool['category'][]).map((cat) => [
      cat, t(`externalToolsHub.categories.${CATEGORY_KEY_MAP[cat]}`, CATEGORY_FALLBACK_LABELS[cat]),
    ])
  ) as Record<AutoConnectTool['category'], string>;
  const [activeTab, setActiveTab]       = useState<HubTab>('mo2');
  const [autoConnectTools, setAutoConnectTools] = useState<AutoConnectStatus[]>(
    AUTO_CONNECT_TOOLS.map((tool) => ({ ...tool, installed: false, running: false }))
  );
  const [scanningAutoConnect, setScanningAutoConnect] = useState(false);
  const [comfyOnline, setComfyOnline]   = useState(false);

  // Restore last tab
  useEffect(() => {
    const saved = sessionStorage.getItem('ext_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((tab) => tab.id === saved)) setActiveTab(saved);
  }, []);
  useEffect(() => { sessionStorage.setItem('ext_hub_tab', activeTab); }, [activeTab]);

  // Ping ComfyUI port 8188. Routed through the main process (see
  // textures:comfyui-status in main.ts) rather than fetch()ing it directly
  // from the renderer -- newer ComfyUI builds run an origin-check middleware
  // that 403s a renderer fetch() (it carries Sec-Fetch-Site/Origin headers a
  // main-process fetch doesn't), which is why this used to always read as
  // offline even while ComfyUI was actually running and reachable.
  const pingComfyUI = useCallback(async (): Promise<boolean> => {
    try {
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
      const res = await bridge?.invoke?.('textures:comfyui-status').catch(() => null);
      const online = res?.online === true;
      setComfyOnline(online);
      return online;
    } catch {
      setComfyOnline(false);
      return false;
    }
  }, []);

  const refreshAutoConnect = useCallback(async () => {
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    setScanningAutoConnect(true);
    try {
      const [installedPrograms, runningProcesses, comfyAlive] = await Promise.all([
        bridge?.detectPrograms?.().catch(() => []),
        bridge?.getRunningProcesses?.().catch(() => []),
        pingComfyUI(),
      ]);

      const progs: DetectedProgram[] = installedPrograms ?? [];
      promoteDetectedPrograms(progs);
      await autoRegisterToolPaths(bridge, progs);

      let activeTools: any[] = [];
      try { activeTools = JSON.parse(localStorage.getItem('mossy_active_tools') || '{}')?.tools ?? []; } catch { /* */ }

      const installedHaystack = progs.map((p) =>
        `${p?.displayName || ''} ${p?.name || ''} ${p?.path || ''}`.toLowerCase()
      );
      const runningHaystack = [
        ...(runningProcesses ?? []).map((proc: any) => `${proc?.name || ''} ${proc?.windowTitle || ''}`.toLowerCase()),
        ...activeTools.map((tool: any) => `${tool?.name || ''} ${tool?.path || ''}`.toLowerCase()),
      ];

      setAutoConnectTools(
        AUTO_CONNECT_TOOLS.map((tool) => {
          const installed = tool.match.some((n) => installedHaystack.some((e) => e.includes(n)));
          const procRunning = tool.match.some((n) => runningHaystack.some((e) => e.includes(n)));
          const running = tool.id === 'comfyui' ? procRunning || comfyAlive : procRunning;
          const matchedProg = progs.find((p) => {
            const s = toSearchText(p);
            return tool.match.some((n) => s.includes(n));
          });
          return { ...tool, installed, running, path: matchedProg?.path };
        })
      );
    } finally {
      setScanningAutoConnect(false);
    }
  }, [pingComfyUI]);

  useEffect(() => { void refreshAutoConnect(); }, []);

  // Periodic ComfyUI ping when on comfyui tab
  useEffect(() => {
    if (activeTab !== 'comfyui') return;
    const id = setInterval(() => void pingComfyUI(), 10_000);
    return () => clearInterval(id);
  }, [activeTab, pingComfyUI]);

  const launchTool = async (tool: AutoConnectStatus) => {
    if (!tool.path) return;
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    await bridge?.openProgram?.(tool.path).catch(() => null);
  };

  const openInstallPage = (url?: string) => {
    if (!url) return;
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    if (bridge?.openExternal) bridge.openExternal(url).catch(() => null);
    else window.open(url, '_blank');
  };

  const info = TOOL_INFO.find((tool) => tool.id === activeTab);

  const installedCount = autoConnectTools.filter((tool) => tool.installed).length;
  const runningCount   = autoConnectTools.filter((tool) => tool.running).length;
  const totalCount     = autoConnectTools.length;

  // Group by category preserving order
  const categoryOrder: AutoConnectTool['category'][] = ['mod-manager', 'editor', 'utility', 'ai'];
  const toolsByCategory: Record<string, AutoConnectStatus[]> = {};
  for (const cat of categoryOrder) {
    toolsByCategory[cat] = autoConnectTools.filter((tool) => tool.category === cat);
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
              <Package className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{t('externalToolsHub.title', 'FO4 External Integrations Hub')}</h1>
              <p className="text-xs text-slate-400">{t('externalToolsHub.subtitle', 'MO2 · ComfyUI · Upscayl workflows plus setup-tool auto-connect')}</p>
            </div>
          </div>
          {/* Summary stats */}
          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              {t('externalToolsHub.installedCount', '{installed}/{total} installed').replace('{installed}', String(installedCount)).replace('{total}', String(totalCount))}
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${runningCount > 0 ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-slate-800/60 border-slate-700 text-slate-500'}`}>
              <Zap className="h-3 w-3" />
              {t('externalToolsHub.liveCount', '{n} live').replace('{n}', String(runningCount))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
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
              {tab.id === 'comfyui' && comfyOnline && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* FO4 Tips */}
        {info && (
          <div className="mt-4 rounded-lg border border-emerald-700/20 bg-emerald-950/10 p-3 text-xs">
            <p className="text-slate-300 mb-2">{info.desc}</p>
            <ul className="space-y-1">
              {info.fo4tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-slate-400">
                  <ChevronRight className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto-connect desktop tools panel */}
        <div className="mt-4 rounded-lg border border-cyan-700/20 bg-cyan-950/10 p-3 text-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-slate-200 font-semibold">{t('externalToolsHub.autoConnect.heading', 'Auto-connect desktop tools')}</p>
              <p className="text-slate-400 mt-0.5">
                {t('externalToolsHub.autoConnect.description', 'Mossy scans your system for every tool in the FO4 modding pipeline. Launch detected tools directly or get install links for missing ones.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAutoConnect()}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors flex-shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanningAutoConnect ? 'animate-spin' : ''}`} />
              {t('externalToolsHub.autoConnect.refresh', 'Refresh')}
            </button>
          </div>

          {categoryOrder.map((cat) => (
            <div key={cat} className="mb-3 last:mb-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                {toolsByCategory[cat].map((tool) => (
                  <div
                    key={tool.id}
                    className={`rounded-md border px-2.5 py-2 flex items-center gap-2 transition-colors ${
                      tool.installed ? 'border-slate-700/60 bg-black/20' : 'border-slate-800/40 bg-black/10 opacity-55'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      tool.running ? 'bg-cyan-400 animate-pulse' : tool.installed ? 'bg-emerald-500' : 'bg-slate-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 font-medium text-[11px] truncate">{tool.label}</div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className={`rounded-full px-1.5 text-[9px] font-semibold border ${CATEGORY_COLOR[tool.category]}`}>
                          {tool.installed ? t('externalToolsHub.installed', 'Installed') : t('externalToolsHub.notDetected', 'Not detected')}
                        </span>
                        {tool.running && (
                          <span className="rounded-full px-1.5 text-[9px] font-semibold border bg-cyan-500/15 text-cyan-200 border-cyan-500/30">
                            {t('externalToolsHub.live', 'Live')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {tool.installed && tool.path && (
                        <button
                          onClick={() => void launchTool(tool)}
                          title={t('externalToolsHub.launchTooltip', 'Launch {label}').replace('{label}', tool.label)}
                          className="p-1 rounded hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-300 transition-colors"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      )}
                      {!tool.installed && tool.installUrl && (
                        <button
                          onClick={() => openInstallPage(tool.installUrl)}
                          title={t('externalToolsHub.getTooltip', 'Get {label}').replace('{label}', tool.label)}
                          className="p-1 rounded hover:bg-cyan-500/20 text-slate-600 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'mo2'     && <PanelLoader><MO2Extension /></PanelLoader>}
        {activeTab === 'comfyui' && <PanelLoader><ComfyUIExtension /></PanelLoader>}
        {activeTab === 'upscayl' && <PanelLoader><UpscaylExtension /></PanelLoader>}
      </div>
    </div>
  );
};

export default ExternalToolsHub;
