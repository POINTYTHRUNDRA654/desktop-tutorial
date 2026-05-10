/**
 * Textures & Materials Hub
 *
 * Unified platform for all texture and material work in Fallout 4 modding.
 * Consolidates: DDS Converter · Texture Generator · Image Studio · FO4 Texture Guide
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Image, Layers, Wand2, BookOpen, AlertCircle, ChevronRight } from 'lucide-react';

// Lazy-load the three existing tool panels so the hub stays lightweight
const DDSConverter = React.lazy(() =>
  import('./DDSConverter').then((m) => ({ default: m.DDSConverter }))
);
const TextureGenerator = React.lazy(() =>
  import('./TextureGenerator').then((m) => ({ default: m.TextureGenerator }))
);
const ImageSuite = React.lazy(() => import('./ImageSuite'));

type HubTab = 'dds' | 'generator' | 'images' | 'guide';

const TAB_DEFS: { id: HubTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'dds', icon: Image, label: 'DDS Converter', sublabel: 'BC1·BC3·BC5·BC7' },
  { id: 'generator', icon: Wand2, label: 'Texture Generator', sublabel: 'PBR · Procedural' },
  { id: 'images', icon: Layers, label: 'Image Studio', sublabel: 'PBR maps · Convert' },
  { id: 'guide', icon: BookOpen, label: 'FO4 Texture Guide', sublabel: 'Formats · Channels' },
];

// ============================================================================
// FO4 Texture Reference Guide (in-app knowledge panel)
// ============================================================================

const FO4_CHANNEL_TABLE = [
  {
    suffix: '_d.dds',
    type: 'Diffuse / Albedo',
    format: 'BC1 (no alpha) · BC3 (with alpha)',
    channels: 'RGB = albedo colour, A = alpha/opacity',
    notes:
      'BC1 for opaque surfaces; BC3 when alpha transparency or decal cutout is needed. Hair and glass use BC3.',
  },
  {
    suffix: '_n.dds',
    type: 'Normal Map',
    format: 'BC5 (recommended) · DXT5nm',
    channels: 'R = X tangent, G = Y tangent, B/A unused',
    notes:
      'BC5 is a two-channel format ideal for normals. Vanilla FO4 uses DXT5nm (normals packed in RG+alpha). Community Shaders or ENB Extender require BC5 for correct PBR normals.',
  },
  {
    suffix: '_s.dds',
    type: 'Specular / PBR Pack',
    format: 'BC7 (PBR) · DXT5 (vanilla)',
    channels: 'Vanilla: R=spec intensity, G=gloss, B=AO hint | CShaders PBR: R=spec, G=1−roughness, B=AO, A=metalness',
    notes:
      'With Community Shaders PBR, this becomes an RMAOS pack. Use BC7 at highest quality. Vanilla mods use DXT5.',
  },
  {
    suffix: '_g.dds',
    type: 'Glow / Emission',
    format: 'BC1 · DXT1',
    channels: 'RGB = emission colour, no alpha needed',
    notes:
      'Controls emission from BGSM emissive colour multiplied by this map. Keep small (64-512px). Set BGSM glowmap flag.',
  },
  {
    suffix: '_h.dds',
    type: 'Height / Parallax',
    format: 'BC4 (1-channel greyscale)',
    channels: 'R = surface height (0 = deep, 1 = raised)',
    notes:
      'Required for POM (Parallax Occlusion Mapping) via ENB or Community Shaders. BC4 is single-channel for efficiency. Enable SF2_PARALLAX_OCCLUSION in BGSM flags.',
  },
  {
    suffix: '_rmaos.dds',
    type: 'PBR Pack (CShaders)',
    format: 'BC7',
    channels: 'R=roughness, G=metalness, B=AO, A=specular',
    notes:
      'Community Shaders extended BGSM pack. Replaces _s.dds when CShaders PBR mode is active. Must be enabled per-material in BGSM.',
  },
  {
    suffix: '_m.dds',
    type: 'Material / Highlight',
    format: 'DXT1 · BC1',
    channels: 'R=gloss, G=specular, B=inner layer mask',
    notes:
      'Used for hair/skin dual-layer shading. Rare; only for specific shader paths.',
  },
  {
    suffix: '.bgsm',
    type: 'Material Definition',
    format: 'Text JSON (BGS Material)',
    channels: 'Defines shader flags, textures, PBR settings',
    notes:
      'Every mesh references a .bgsm. Edit with Material Editor or HEX. Set bEnableEditorAlphaRef=1 for alpha cutouts.',
  },
];

const FORMAT_ADVICE = [
  {
    use: 'Diffuse (opaque)',
    recommended: 'BC1 / DXT1',
    ratio: '8:1',
    notes: 'Fastest, smallest. No alpha. Good for terrain and most props.',
  },
  {
    use: 'Diffuse (with alpha)',
    recommended: 'BC3 / DXT5',
    ratio: '4:1',
    notes: 'Smooth alpha. Hair, glass, decals. Slightly larger than BC1.',
  },
  {
    use: 'Normal maps',
    recommended: 'BC5 (preferred) or DXT5nm',
    ratio: '4:1 (2-ch)',
    notes: 'BC5 gives best precision on RG channels. Reconstruct Z in shader.',
  },
  {
    use: 'Specular / PBR pack',
    recommended: 'BC7 (PBR) or DXT5 (vanilla)',
    ratio: '4–8:1',
    notes: 'BC7 is slow to encode but best quality. Use for hero assets.',
  },
  {
    use: 'Height / Parallax',
    recommended: 'BC4',
    ratio: '8:1 (1-ch)',
    notes: '1-channel format. BC4 is ideal for POM height maps.',
  },
  {
    use: 'Emission / Glow',
    recommended: 'BC1 / DXT1',
    ratio: '8:1',
    notes: 'Small resolution (64–256). RGB emission tint.',
  },
  {
    use: 'UI / Interface',
    recommended: 'BC3 / DXT5',
    ratio: '4:1',
    notes: 'Always power-of-two even for UI. Alpha for transparency.',
  },
  {
    use: 'Cubemaps',
    recommended: 'BC6H',
    ratio: '4:1 HDR',
    notes: 'HDR cubemaps for ENV_MAP. Requires TexConv / NVTT.',
  },
];

const MIPMAP_INFO = [
  { item: 'Always generate mipmaps', detail: 'Prevents aliasing and reduces GPU bandwidth at distance. In-game textures without mipmaps cause shimmer and performance spikes.' },
  { item: 'Resolution must be power-of-2', detail: 'FO4 engine requires 2^N textures: 64, 128, 256, 512, 1024, 2048, 4096. Non-POT textures crash or render black.' },
  { item: 'Hero asset ceilings', detail: '4096×4096 for unique hero characters/weapons. 2048×2048 for medium props. 1024×1024 or 512×512 for background/tiling.' },
  { item: 'Mipmaps = full chain by default', detail: 'DDS mipmaps chain all the way down to 1×1. 2048 texture = 12 mip levels. Storage is only 33 % extra.' },
  { item: 'LOD textures', detail: 'DynDOLOD/xLODGen generates LOD textures automatically from source. Keep source at highest quality; LOD is derived.' },
  { item: 'Streaming budget', detail: 'FO4 streams textures based on VRAM. Keep individual texture total RAM usage per interior scene under ~800 MB on 4 GB GPUs.' },
];

const TOOLS_REFERENCE = [
  { name: 'TexConv (Microsoft)', desc: 'CLI tool for BC7/BC6H encoding. Best quality encoder available.', link: 'https://github.com/microsoft/DirectXTex' },
  { name: 'NVTT / nvcompress', desc: 'NVIDIA texture tools. GPU-accelerated BC1–BC7.', link: 'https://developer.nvidia.com/gpu-accelerated-texture-compression' },
  { name: 'Substance Painter (FO4 template)', desc: 'Export preset: DXT5 normal (OpenGL → DX flip), BC7 diffuse, BC4 height.', link: 'https://www.adobe.com/products/substance3d-painter.html' },
  { name: 'xNormal', desc: 'High-quality normal & AO map baker from highpoly mesh.', link: 'https://xnormal.net' },
  { name: 'NifSkope', desc: 'View and edit NIF texture paths. Verify BSTextureSet paths.', link: 'https://github.com/niftools/nifskope' },
  { name: 'Material Editor (CreationKit)', desc: 'Edit .bgsm/.bgem files. Set shader flags, enable POM, set glow/translucency.', link: 'https://www.nexusmods.com/fallout4/mods/14' },
  { name: 'Community Shaders', desc: 'Extends FO4 renderer with GGX/PBR, SSGI, extended BGSM flags. Required for BC5 normals + RMAOS.', link: 'https://www.nexusmods.com/fallout4/mods/74088' },
  { name: 'ENB Extender', desc: 'Adds weather variables, shader overrides, POM depth control, and texture injection per material.', link: 'https://www.nexusmods.com/fallout4/mods/57285' },
];

const FO4TextureGuide: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-200">
    {/* Header */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-black/40 p-6">
      <h2 className="text-2xl font-black text-white mb-2">Fallout 4 Texture & Material Reference</h2>
      <p className="text-emerald-100/80">
        Complete guide to texture formats, channel conventions, mip maps, and material settings for
        Fallout 4 modding — covering vanilla workflow, Community Shaders PBR, and ENB pipelines.
      </p>
    </div>

    {/* Quick Format Picker */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" /> Quick Format Picker
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left py-2 pr-4">Use Case</th>
              <th className="text-left py-2 pr-4">Recommended Format</th>
              <th className="text-left py-2 pr-4">Ratio</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {FORMAT_ADVICE.map((row) => (
              <tr key={row.use} className="border-b border-slate-800/60">
                <td className="py-2 pr-4 font-semibold text-white">{row.use}</td>
                <td className="py-2 pr-4 text-emerald-300 font-mono">{row.recommended}</td>
                <td className="py-2 pr-4 text-slate-400">{row.ratio}</td>
                <td className="py-2 text-slate-300">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Texture Channel Conventions */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">FO4 Texture Channel Conventions</h3>
      <div className="space-y-3">
        {FO4_CHANNEL_TABLE.map((row) => (
          <div key={row.suffix} className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="font-mono text-emerald-300 font-bold text-sm">{row.suffix}</span>
              <span className="text-white font-semibold">{row.type}</span>
              <span className="ml-auto text-xs text-slate-400 font-mono">{row.format}</span>
            </div>
            <p className="text-xs text-amber-200/80 mb-1">
              <span className="font-semibold">Channels: </span>{row.channels}
            </p>
            <p className="text-xs text-slate-400">{row.notes}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Mipmap & Resolution Rules */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">Mipmap & Resolution Rules</h3>
      <div className="space-y-3">
        {MIPMAP_INFO.map((m) => (
          <div key={m.item} className="flex gap-3">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">{m.item}</p>
              <p className="text-slate-400 text-xs mt-0.5">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* PBR Pipeline Notes */}
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <h3 className="text-lg font-bold text-blue-300 mb-3">PBR Pipeline (Community Shaders / ENB)</h3>
      <div className="space-y-2 text-xs">
        <p className="text-slate-300">
          Vanilla FO4 uses a <strong className="text-white">specular-glossiness</strong> model. Community Shaders extends this
          with a full GGX PBR workflow when you set <code className="bg-slate-800 px-1 rounded text-emerald-300">bPBR=true</code> in the BGSM.
        </p>
        <p className="text-slate-300">
          In PBR mode, the <code className="bg-slate-800 px-1 rounded text-emerald-300">_s.dds</code> slot becomes an RMAOS pack:
          <span className="font-mono ml-1 text-amber-300">R=roughness, G=metalness, B=AO, A=specular</span>.
          Use BC7 at highest quality for this map.
        </p>
        <p className="text-slate-300">
          POM (Parallax Occlusion Mapping) requires a <code className="bg-slate-800 px-1 rounded text-emerald-300">_h.dds</code> height map
          (BC4) and the BGSM flag <code className="bg-slate-800 px-1 rounded text-emerald-300">SF2_PARALLAX_OCCLUSION</code>.
          ENB also reads this for independent parallax. Do NOT enable POM on large tiling terrain textures — GPU cost is high.
        </p>
        <p className="text-slate-300">
          When using ENB, the <em>ProxyLibrary</em> chain must be: <code className="bg-slate-800 px-1 rounded text-emerald-300">d3d11.dll → enbseries → CommunityShaders.dll</code>.
          Incorrect order breaks normal map reconstruction.
        </p>
      </div>
    </div>

    {/* Common Mistakes */}
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5">
      <h3 className="text-lg font-bold text-red-300 mb-3">Common Texture Mistakes to Avoid</h3>
      <ul className="space-y-2 text-xs text-slate-300">
        <li><span className="text-red-300 font-semibold">• Non-power-of-2 size</span> — Causes black textures or crash to desktop. Always 64/128/256/512/1024/2048/4096.</li>
        <li><span className="text-red-300 font-semibold">• Wrong normal map handedness</span> — FO4 uses DirectX/DX normals (G channel NOT flipped). OpenGL normals = green appears inverted. Flip G in GIMP/Photoshop or export DX normals from Substance.</li>
        <li><span className="text-red-300 font-semibold">• DXT1 on normals</span> — BC1 destroys normal map quality severely. Always use BC5 or DXT5nm.</li>
        <li><span className="text-red-300 font-semibold">• No mipmaps on in-game textures</span> — Always generate full mip chain. Only skip mipmaps for UI textures.</li>
        <li><span className="text-red-300 font-semibold">• 32-bit uncompressed DDS in BA2</span> — Massive VRAM usage. Compress everything that goes in a BA2 archive.</li>
        <li><span className="text-red-300 font-semibold">• Loose files vs BA2</span> — Loose files override BA2 at higher priority. Useful for testing; ship in BA2 for release.</li>
        <li><span className="text-red-300 font-semibold">• Missing _n.dds</span> — FO4 will show flat/plastic surfaces. Always supply a normal map even if flat (128,128,255 blue fill).</li>
        <li><span className="text-red-300 font-semibold">• BGSM path mismatch</span> — BGSM texture paths are relative to <code className="bg-black/40 px-1 rounded">Data\Textures\</code>. Case matters on case-sensitive OS but FO4 on Windows is case-insensitive.</li>
      </ul>
    </div>

    {/* Tools Reference */}
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h3 className="text-lg font-bold text-emerald-300 mb-4">Recommended Tools</h3>
      <div className="grid grid-cols-1 gap-2">
        {TOOLS_REFERENCE.map((t) => (
          <div key={t.name} className="flex gap-3 items-start">
            <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white">{t.name}</span>
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
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading…
      </div>
    }
  >
    {children}
  </Suspense>
);

const TextureMaterialsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('dds');

  // Persist last-used tab across navigation
  useEffect(() => {
    const saved = sessionStorage.getItem('textures_hub_tab') as HubTab | null;
    if (saved && TAB_DEFS.some((t) => t.id === saved)) setActiveTab(saved);
  }, []);
  useEffect(() => {
    sessionStorage.setItem('textures_hub_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
      {/* Hub Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <Image className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Textures &amp; Materials</h1>
            <p className="text-xs text-slate-400">Convert · Generate · Reference — all texture work in one place</p>
          </div>
        </div>

        {/* Tab Bar */}
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
        {activeTab === 'dds' && (
          <PanelLoader>
            <DDSConverter />
          </PanelLoader>
        )}
        {activeTab === 'generator' && (
          <PanelLoader>
            <TextureGenerator />
          </PanelLoader>
        )}
        {activeTab === 'images' && (
          <PanelLoader>
            <ImageSuite />
          </PanelLoader>
        )}
        {activeTab === 'guide' && <FO4TextureGuide />}
      </div>
    </div>
  );
};

export default TextureMaterialsHub;
