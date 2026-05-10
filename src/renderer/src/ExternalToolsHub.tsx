/**
 * External Tools Hub
 *
 * Unified interface for all external tool integrations.
 * Consolidates: MO2 Extension · ComfyUI Extension · Upscayl Extension
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Package, Network, Maximize2, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    const saved = sessionStorage.getItem('ext_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ext_hub_tab', activeTab);
  }, [activeTab]);

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
            <h1 className="text-xl font-black text-white tracking-tight">External Tools</h1>
            <p className="text-xs text-slate-400">MO2 · ComfyUI · Upscayl — third-party integrations</p>
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
