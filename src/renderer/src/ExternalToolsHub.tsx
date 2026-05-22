/**
 * FO4 External Integrations Hub
 *
 * Unified interface for Fallout 4 external tool integrations.
 * Consolidates: MO2 Extension · ComfyUI Extension · Upscayl Extension
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Package, Network, Maximize2, ChevronRight, RefreshCw } from 'lucide-react';

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
};

type AutoConnectStatus = AutoConnectTool & {
  installed: boolean;
  running: boolean;
};

type DetectedProgram = {
  name?: string;
  displayName?: string;
  path?: string;
  version?: string;
};

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'mo2', icon: Package, label: 'MO2 Integration', sublabel: 'Mod Organizer 2' },
  { id: 'comfyui', icon: Network, label: 'ComfyUI', sublabel: 'AI Image Generation' },
  { id: 'upscayl', icon: Maximize2, label: 'Upscayl', sublabel: 'AI Upscaling' },
];

const TOOL_INFO = [
  {
    id: 'mo2',
    name: 'Mod Organizer 2 (MO2)',
    desc: 'The industry-standard mod manager for Fallout 4. Mossy reads your MO2 profile to understand your active mod list and load order. Install: Nexus Mod Manager page or official GitHub.',
    fo4tips: [
      'Use separate MO2 profiles for different playthroughs or testing configurations.',
      'Enable "Manageable" mode in MO2 settings to allow Mossy to read your active plugin list.',
      'MO2 virtual file system (VFS) is transparent to the game — files in MO2 override order matches load order priority.',
      'Use the "Conflicts" tab in MO2 to see file-level asset conflicts before plugin-level conflicts.',
    ],
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    desc: 'Node-based AI image generation. Use for creating concept art, texture references, NPC portraits, and promotional artwork for your mods. Requires a GPU with at least 6 GB VRAM.',
    fo4tips: [
      'Use ComfyUI\'s img2img workflow to generate texture variations from existing in-game screenshots.',
      'ControlNet pose conditioning helps create accurate character reference art matching FO4 skeleton proportions.',
      'Export AI-generated art at 4096×4096 minimum for texture use — then downscale and compress to DDS via the Textures & Materials hub.',
      'Stable Diffusion fine-tunes (LoRAs) trained on Fallout concept art can improve consistency of generated assets.',
    ],
  },
  {
    id: 'upscayl',
    name: 'Upscayl',
    desc: 'Free, open-source AI upscaler using Real-ESRGAN models. Ideal for upscaling low-res vanilla textures, reference photos, and UI elements before DDS conversion.',
    fo4tips: [
      'Use RealESRGAN-x4plus for general texture upscaling. The result will still need compression to BC1/BC3/BC5/BC7 after upscaling.',
      'For face/portrait textures, use ESRGAN face models to preserve fine skin detail before re-exporting to FaceGen.',
      'Upscale vanilla 512x512 textures to 2048x2048 max — going higher than 4x the original yields diminishing returns for in-game use.',
      'After upscaling, always run through a normal map bake (xNormal or Substance Painter) to reconstruct lost surface detail as normals.',
    ],
  },
];

const AUTO_CONNECT_TOOLS: AutoConnectTool[] = [
  { id: 'mo2', label: 'Mod Organizer 2', match: ['mod organizer', 'modorganizer', 'mo2'] },
  { id: 'xedit', label: 'xEdit / FO4Edit', match: ['xedit', 'fo4edit'] },
  { id: 'creation-kit', label: 'Creation Kit', match: ['creation kit'] },
  { id: 'blender', label: 'Blender', match: ['blender'] },
  { id: 'loot', label: 'LOOT', match: ['loot'] },
  { id: 'nifskope', label: 'NifSkope', match: ['nifskope'] },
  { id: 'bodyslide', label: 'BodySlide / Outfit Studio', match: ['bodyslide', 'outfit studio'] },
  { id: 'comfyui', label: 'ComfyUI', match: ['comfyui', 'comfy'] },
  { id: 'upscayl', label: 'Upscayl', match: ['upscayl'] },
];

const SETTINGS_AUTO_MAP: Array<{ key: string; match: string[] }> = [
  { key: 'mo2Path', match: ['mod organizer', 'modorganizer', 'mo2'] },
  { key: 'xeditPath', match: ['xedit', 'fo4edit'] },
  { key: 'creationKitPath', match: ['creation kit'] },
  { key: 'blenderPath', match: ['blender'] },
  { key: 'lootPath', match: ['loot'] },
  { key: 'nifSkopePath', match: ['nifskope'] },
  { key: 'bodySlidePath', match: ['bodyslide'] },
  { key: 'outfitStudioPath', match: ['outfit studio'] },
  { key: 'upscaylPath', match: ['upscayl'] },
  { key: 'vortexPath', match: ['vortex'] },
  { key: 'wryeBashPath', match: ['wrye bash'] },
];

const matchesNeedle = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle));

const toSearchText = (prog: DetectedProgram) =>
  `${prog.displayName || ''} ${prog.name || ''} ${prog.path || ''}`.toLowerCase();

const promoteDetectedPrograms = (installedPrograms: DetectedProgram[]) => {
  const existing = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
  const merged = Array.isArray(existing) ? [...existing] : [];

  installedPrograms.forEach((prog) => {
    const search = toSearchText(prog);
    if (!AUTO_CONNECT_TOOLS.some((tool) => matchesNeedle(search, tool.match))) return;

    const displayName = prog.displayName || prog.name || 'Detected Tool';
    const existingIndex = merged.findIndex((app: any) =>
      (app.displayName || app.name || '').toLowerCase() === displayName.toLowerCase()
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
      return;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      ...normalized,
      path: merged[existingIndex].path || normalized.path,
      version: merged[existingIndex].version || normalized.version,
    };
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

    if (detected?.path) {
      updates[key] = detected.path;
    }
  });

  if (Object.keys(updates).length === 0) return;

  await bridge.setSettings(updates);
  window.dispatchEvent(new CustomEvent('mossy-settings-updated', { detail: { ...settings, ...updates } }));
};

const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
    }
  >
    {children}
  </Suspense>
);

const ExternalToolsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('mo2');
  const [autoConnectTools, setAutoConnectTools] = useState<AutoConnectStatus[]>(
    AUTO_CONNECT_TOOLS.map((tool) => ({ ...tool, installed: false, running: false }))
  );
  const [scanningAutoConnect, setScanningAutoConnect] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('ext_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ext_hub_tab', activeTab);
  }, [activeTab]);

  const refreshAutoConnect = async () => {
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    setScanningAutoConnect(true);

    try {
      const [installedPrograms, runningProcesses] = await Promise.all([
        bridge?.detectPrograms?.().catch(() => []),
        bridge?.getRunningProcesses?.().catch(() => []),
      ]);

      promoteDetectedPrograms(installedPrograms ?? []);
      await autoRegisterToolPaths(bridge, installedPrograms ?? []);

      const activeToolsRaw = localStorage.getItem('mossy_active_tools');
      let activeTools: any[] = [];
      try {
        activeTools = activeToolsRaw ? JSON.parse(activeToolsRaw)?.tools ?? [] : [];
      } catch {
        activeTools = [];
      }

      const installedHaystack = (installedPrograms ?? []).map((prog: any) =>
        `${prog?.displayName || ''} ${prog?.name || ''} ${prog?.path || ''}`.toLowerCase()
      );
      const runningHaystack = [
        ...(runningProcesses ?? []).map((proc: any) => `${proc?.name || ''} ${proc?.windowTitle || ''}`.toLowerCase()),
        ...activeTools.map((tool: any) => `${tool?.name || ''} ${tool?.path || ''}`.toLowerCase()),
      ];

      setAutoConnectTools(
        AUTO_CONNECT_TOOLS.map((tool) => {
          const installed = tool.match.some((needle) => installedHaystack.some((entry: string) => entry.includes(needle)));
          const running = tool.match.some((needle) => runningHaystack.some((entry: string) => entry.includes(needle)));
          return { ...tool, installed, running };
        })
      );
    } finally {
      setScanningAutoConnect(false);
    }
  };

  useEffect(() => {
    void refreshAutoConnect();
  }, []);

  const info = TOOL_INFO.find((t) => t.id === activeTab);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Package className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FO4 External Integrations Hub</h1>
            <p className="text-xs text-slate-400">MO2 · ComfyUI · Upscayl workflows plus setup-tool auto-connect</p>
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

        {/* Contextual FO4 Tips for active tool */}
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

        <div className="mt-4 rounded-lg border border-cyan-700/20 bg-cyan-950/10 p-3 text-xs">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-slate-200 font-semibold">Auto-connect desktop tools</p>
              <p className="text-slate-400 mt-1">
                Platform 19 now also covers the desktop tools commonly pulled in during setup so Mossy can detect installed apps and live-running integrations from one category.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAutoConnect()}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanningAutoConnect ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {autoConnectTools.map((tool) => (
              <div key={tool.id} className="rounded-md border border-slate-800/80 bg-black/20 px-3 py-2">
                <div className="text-slate-200 font-medium">{tool.label}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tool.installed ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {tool.installed ? 'Installed' : 'Not detected'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tool.running ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {tool.running ? 'Live link' : 'Idle'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'mo2' && (
          <PanelLoader>
            <MO2Extension />
          </PanelLoader>
        )}
        {activeTab === 'comfyui' && (
          <PanelLoader>
            <ComfyUIExtension />
          </PanelLoader>
        )}
        {activeTab === 'upscayl' && (
          <PanelLoader>
            <UpscaylExtension />
          </PanelLoader>
        )}
      </div>
    </div>
  );
};

export default ExternalToolsHub;
