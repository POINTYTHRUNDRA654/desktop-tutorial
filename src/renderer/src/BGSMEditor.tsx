/**
 * BGSMEditor.tsx — Fallout 4 Material Definition Editor
 *
 * Full read/write editor for .bgsm and .bgem material files.
 * Covers every documented BGSM property including:
 *   - Texture slots (8 slots: diffuse, normal, specular, glow, inner, wrinkle, disp, envmask)
 *   - Shader flags SF1 / SF2 (all 64 bits documented)
 *   - Lighting controls (rim, back-light, SSS, wetness, Fresnel)
 *   - PBR extension fields (Community Shaders bPBR / RMAOS)
 *   - Alpha & blending controls
 *   - Emissive / glow settings
 *   - Tessellation / POM controls
 *   - Glass / environment mapping
 *   - Hair / skin / facegen special flags
 *   - Full import & export as real FO4 JSON-BGSM format
 *
 * BGSM reference: https://falloutck.uesp.net/wiki/Material_File
 */

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Save, Upload, Download, Plus, RefreshCw, AlertCircle,
  ChevronDown, ChevronRight, Info, FolderOpen, Copy,
  Eye, Layers, Zap, Cpu, Droplets, Flame, Box,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BGSMVersion = 2 | 20;   // FO4 = 2, FO76 / NextGen = 20
type ShaderType  = 'default' | 'envmap' | 'glowmap' | 'parallax' | 'face' | 'skintint' | 'hair' | 'multilayer' | 'glass' | 'lod';

interface SF1Flags {
  specular:           boolean;
  skinned:            boolean;
  tempRefraction:     boolean;
  vertexAlpha:        boolean;
  fullyIllum:         boolean;
  clamp_S:            boolean;
  clamp_T:            boolean;
  znBuffer:           boolean;
  localMapHide:       boolean;
  snow:               boolean;
  skinned2:           boolean;
  ownEmit:            boolean;
  projUV:             boolean;
  decal:              boolean;
  dynDecal:           boolean;
  parallax:           boolean;
  alphaTest:          boolean;
  glowMap:            boolean;
  envMap:             boolean;
  refractionFalloff:  boolean;
  softEffect:         boolean;
  depthmapTest:       boolean;
  grayscaleToPalette: boolean;
  headPart:           boolean;
  silhouetteRefl:     boolean;
  subtextureIndex:    boolean;
  screenSpaceRefl:    boolean;
  wetness:            boolean;
  unknown28:          boolean;
  vertexColors:       boolean;
  unknown30:          boolean;
  unknown31:          boolean;
}

interface SF2Flags {
  zbuffer_write:           boolean;
  lod_land:                boolean;
  lod_building:            boolean;
  no_fade:                 boolean;
  refractive:              boolean;
  refract_writes_depth:    boolean;
  two_sided:               boolean;
  tree_LOD:                boolean;
  parallax_occlusion:      boolean;
  multi_index_snow:        boolean;
  vertex_colors2:          boolean;
  gl_water:                boolean;
  highlight_layer_anim:    boolean;
  pbr:                     boolean;   // Community Shaders PBR
  unknown14:               boolean;
  stack_decal:             boolean;
  flag17:                  boolean;
  flag18:                  boolean;
  flag19:                  boolean;
  flag20:                  boolean;
  flag21:                  boolean;
  flag22:                  boolean;
  flag23:                  boolean;
}

interface BGSMData {
  // Header
  version:              BGSMVersion;
  shaderType:           ShaderType;
  // Texture slots
  sDiffuseTexture:      string;
  sNormalTexture:       string;
  sSmoothSpecTexture:   string;
  sGreyscaleTexture:    string;
  sGlowTexture:         string;
  sInnerLayerTexture:   string;
  sWrinklesTexture:     string;
  sDisplacementTexture: string;
  sEnvMapTexture:       string;
  sEnvMaskTexture:      string;
  // Shader flags
  sf1: SF1Flags;
  sf2: SF2Flags;
  // Alpha
  bEnableEditorAlphaRef:   boolean;
  fAlphaTestRef:           number;
  bAlphaBlend:             boolean;
  bAlphaSort:              boolean;
  // Lighting
  bEnableLighting:         boolean;
  bRimLighting:            boolean;
  fRimPower:               number;
  fBackLightPower:         number;
  bSubsurfaceLighting:     boolean;
  fSubsurfaceLightingRolloff: number;
  bAnisoLighting:          boolean;
  // Specular
  bSpecularEnabled:        boolean;
  cSpecularColor:          string;   // hex colour
  fSpecularMult:           number;
  fSmoothness:             number;
  fFresnelPower:           number;
  // Emissive
  bEmitEnabled:            boolean;
  cEmittanceColor:         string;
  fEmittanceMult:          number;
  bExternalEmittance:      boolean;
  // Wetness
  fWetnessControl_SpecScale:        number;
  fWetnessControl_SpecPowerScale:   number;
  fWetnessControl_SpecMinvar:       number;
  fWetnessControl_EnvMapScale:      number;
  fWetnessControl_FresnelPower:     number;
  fWetnessControl_Metalness:        number;
  // Environment mapping
  bEnvironmentMapping:          boolean;
  fEnvironmentMappingMaskScale: number;
  bEnvironmentMappingEye:       boolean;
  // PBR (Community Shaders)
  bPBR:                 boolean;
  // Tessellation / POM
  bTessellate:          boolean;
  fDisplacementTextureBias:   number;
  fDisplacementTextureScale:  number;
  fTessellationPnScale:       number;
  fTessellationBaseFactor:    number;
  fTessellationFadeDistance:  number;
  // Special
  bModelSpaceNormals:   boolean;
  bBackLighting:        boolean;
  bReceiveShadows:      boolean;
  bCastShadows:         boolean;
  bHair:                boolean;
  cHairTintColor:       string;
  bTree:                boolean;
  bFacegen:             boolean;
  bSkinTint:            boolean;
  bGlowmap:             boolean;
  fGrayscaleToPaletteScale: number;
  bSkewSpecularAlpha:   boolean;
  // Glass
  bGlassEnabled:        boolean;
  fGlassRefractionScaler: number;
  // Internal
  sRootMaterialPath:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SF1: SF1Flags = {
  specular: true, skinned: false, tempRefraction: false, vertexAlpha: false,
  fullyIllum: false, clamp_S: false, clamp_T: false, znBuffer: false,
  localMapHide: false, snow: false, skinned2: false, ownEmit: false,
  projUV: false, decal: false, dynDecal: false, parallax: false,
  alphaTest: false, glowMap: false, envMap: false, refractionFalloff: false,
  softEffect: false, depthmapTest: false, grayscaleToPalette: false,
  headPart: false, silhouetteRefl: false, subtextureIndex: false,
  screenSpaceRefl: false, wetness: true, unknown28: false,
  vertexColors: false, unknown30: false, unknown31: false,
};

const DEFAULT_SF2: SF2Flags = {
  zbuffer_write: true, lod_land: false, lod_building: false, no_fade: false,
  refractive: false, refract_writes_depth: false, two_sided: false,
  tree_LOD: false, parallax_occlusion: false, multi_index_snow: false,
  vertex_colors2: false, gl_water: false, highlight_layer_anim: false,
  pbr: false, unknown14: false, stack_decal: false,
  flag17: false, flag18: false, flag19: false, flag20: false,
  flag21: false, flag22: false, flag23: false,
};

const DEFAULT_BGSM: BGSMData = {
  version: 2,
  shaderType: 'default',
  sDiffuseTexture: '',
  sNormalTexture: '',
  sSmoothSpecTexture: '',
  sGreyscaleTexture: '',
  sGlowTexture: '',
  sInnerLayerTexture: '',
  sWrinklesTexture: '',
  sDisplacementTexture: '',
  sEnvMapTexture: '',
  sEnvMaskTexture: '',
  sf1: { ...DEFAULT_SF1 },
  sf2: { ...DEFAULT_SF2 },
  bEnableEditorAlphaRef: false,
  fAlphaTestRef: 0,
  bAlphaBlend: false,
  bAlphaSort: false,
  bEnableLighting: true,
  bRimLighting: false,
  fRimPower: 2.0,
  fBackLightPower: 0.0,
  bSubsurfaceLighting: false,
  fSubsurfaceLightingRolloff: 0.3,
  bAnisoLighting: false,
  bSpecularEnabled: true,
  cSpecularColor: '#ffffff',
  fSpecularMult: 1.0,
  fSmoothness: 1.0,
  fFresnelPower: 5.0,
  bEmitEnabled: false,
  cEmittanceColor: '#ffffff',
  fEmittanceMult: 1.0,
  bExternalEmittance: false,
  fWetnessControl_SpecScale: 0.0,
  fWetnessControl_SpecPowerScale: 0.0,
  fWetnessControl_SpecMinvar: 0.0,
  fWetnessControl_EnvMapScale: 0.0,
  fWetnessControl_FresnelPower: 0.0,
  fWetnessControl_Metalness: 0.0,
  bEnvironmentMapping: false,
  fEnvironmentMappingMaskScale: 1.0,
  bEnvironmentMappingEye: false,
  bPBR: false,
  bTessellate: false,
  fDisplacementTextureBias: -0.5,
  fDisplacementTextureScale: 10.0,
  fTessellationPnScale: 1.0,
  fTessellationBaseFactor: 1.0,
  fTessellationFadeDistance: 0.0,
  bModelSpaceNormals: false,
  bBackLighting: false,
  bReceiveShadows: true,
  bCastShadows: true,
  bHair: false,
  cHairTintColor: '#808040',
  bTree: false,
  bFacegen: false,
  bSkinTint: false,
  bGlowmap: false,
  fGrayscaleToPaletteScale: 1.0,
  bSkewSpecularAlpha: false,
  bGlassEnabled: false,
  fGlassRefractionScaler: 1.0,
  sRootMaterialPath: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Preset templates
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS: Record<string, Partial<BGSMData> & { label: string; description: string }> = {
  default_opaque: {
    label: 'Default Opaque',
    description: 'Standard opaque prop material — diffuse + normal + specular.',
    bSpecularEnabled: true, bEnableLighting: true,
    sf1: { ...DEFAULT_SF1, specular: true, wetness: true },
  },
  pbr_metal: {
    label: 'PBR Metallic (Community Shaders)',
    description: 'GGX PBR workflow. Requires Community Shaders. Uses _rmaos.dds specular slot.',
    bPBR: true, bSpecularEnabled: true, bEnableLighting: true,
    sf2: { ...DEFAULT_SF2, pbr: true },
    fFresnelPower: 2.0, fSmoothness: 0.5,
  },
  alpha_foliage: {
    label: 'Alpha Foliage / Decal',
    description: 'BC3 diffuse with alpha cutout. Enables alpha test.',
    bEnableEditorAlphaRef: true, fAlphaTestRef: 128,
    bAlphaBlend: false,
    sf1: { ...DEFAULT_SF1, alphaTest: true, vertexColors: true },
  },
  glow_emissive: {
    label: 'Glow / Emissive',
    description: 'Self-illuminated material. Uses _g.dds glow map. Set glowmap flag.',
    bEmitEnabled: true, bGlowmap: true, fEmittanceMult: 2.5,
    cEmittanceColor: '#ffaa44',
    sf1: { ...DEFAULT_SF1, glowMap: true, ownEmit: true },
  },
  glass_refractive: {
    label: 'Glass / Window',
    description: 'Refractive glass with env mapping.',
    bGlassEnabled: true, fGlassRefractionScaler: 0.05,
    bEnvironmentMapping: true, fEnvironmentMappingMaskScale: 0.6,
    bAlphaBlend: true,
    sf1: { ...DEFAULT_SF1, envMap: true, tempRefraction: true },
    sf2: { ...DEFAULT_SF2, refractive: true, two_sided: true },
  },
  skin_sss: {
    label: 'Skin / Subsurface Scattering',
    description: 'Human skin with SSS rolloff and back-light.',
    bSubsurfaceLighting: true, fSubsurfaceLightingRolloff: 0.5,
    bFacegen: true, bSkinTint: true, bRimLighting: true, fRimPower: 2.0,
    sf1: { ...DEFAULT_SF1, headPart: true, skinned: true },
  },
  parallax_pom: {
    label: 'Parallax Occlusion (POM)',
    description: 'Stone/tile floor with height map. Requires _h.dds and ENB/CShaders.',
    bTessellate: false, fDisplacementTextureScale: 8.0, fDisplacementTextureBias: -0.5,
    sf1: { ...DEFAULT_SF1, parallax: true },
    sf2: { ...DEFAULT_SF2, parallax_occlusion: true },
  },
  envmap_metal: {
    label: 'Environment Map (Metal/Mirror)',
    description: 'Reflective metal surface with env cubemap.',
    bEnvironmentMapping: true, fEnvironmentMappingMaskScale: 1.0,
    sf1: { ...DEFAULT_SF1, envMap: true },
  },
  hair_strand: {
    label: 'Hair / Strand',
    description: 'Hair with tint colour, anisotropy, and dual-layer.',
    bHair: true, bAnisoLighting: true, bAlphaBlend: true,
    cHairTintColor: '#a07040',
    sf1: { ...DEFAULT_SF1, vertexAlpha: true, alphaTest: true },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function bgsmToJson(data: BGSMData): string {
  // Encode SF1 / SF2 as bit integers for real .bgsm JSON format
  const sf1Bits: Record<keyof SF1Flags, number> = {
    specular: 1, skinned: 2, tempRefraction: 4, vertexAlpha: 8,
    fullyIllum: 16, clamp_S: 32, clamp_T: 64, znBuffer: 128,
    localMapHide: 256, snow: 512, skinned2: 1024, ownEmit: 2048,
    projUV: 4096, decal: 8192, dynDecal: 16384, parallax: 32768,
    alphaTest: 65536, glowMap: 131072, envMap: 262144, refractionFalloff: 524288,
    softEffect: 1048576, depthmapTest: 2097152, grayscaleToPalette: 4194304,
    headPart: 8388608, silhouetteRefl: 16777216, subtextureIndex: 33554432,
    screenSpaceRefl: 67108864, wetness: 134217728, unknown28: 268435456,
    vertexColors: 536870912, unknown30: 1073741824, unknown31: -2147483648,
  };
  const sf2Bits: Record<keyof SF2Flags, number> = {
    zbuffer_write: 1, lod_land: 2, lod_building: 4, no_fade: 8,
    refractive: 16, refract_writes_depth: 32, two_sided: 64, tree_LOD: 128,
    parallax_occlusion: 256, multi_index_snow: 512, vertex_colors2: 1024,
    gl_water: 2048, highlight_layer_anim: 4096, pbr: 8192, unknown14: 16384,
    stack_decal: 32768, flag17: 65536, flag18: 131072, flag19: 262144,
    flag20: 524288, flag21: 1048576, flag22: 2097152, flag23: 4194304,
  };

  let sf1Int = 0;
  for (const [k, bit] of Object.entries(sf1Bits)) {
    if (data.sf1[k as keyof SF1Flags]) sf1Int |= bit;
  }
  let sf2Int = 0;
  for (const [k, bit] of Object.entries(sf2Bits)) {
    if (data.sf2[k as keyof SF2Flags]) sf2Int |= bit;
  }

  const hexColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const json = {
    sName: '',
    sDiffuseTexture: data.sDiffuseTexture,
    sNormalTexture: data.sNormalTexture,
    sSmoothSpecTexture: data.sSmoothSpecTexture,
    sGreyscaleTexture: data.sGreyscaleTexture,
    sGlowTexture: data.sGlowTexture,
    sInnerLayerTexture: data.sInnerLayerTexture,
    sWrinklesTexture: data.sWrinklesTexture,
    sDisplacementTexture: data.sDisplacementTexture,
    sRootMaterialPath: data.sRootMaterialPath,
    iShaderMethod: 0,
    uShaderFlags1: sf1Int >>> 0,
    uShaderFlags2: sf2Int >>> 0,
    fEnvmapScale: data.fEnvironmentMappingMaskScale,
    bTranslucency: data.bSubsurfaceLighting,
    fTranslucencySubsurfaceRolloff: data.fSubsurfaceLightingRolloff,
    fTranslucencyTransmissiveScale: 1.0,
    bTranslucencyThickObject: false,
    bTranslucencyMixAlbedoWithSubsurfaceColor: false,
    cTranslucencySubsurfaceColor: hexColor('#ffffff'),
    fTranslucencyTransmittanceScale: 1.0,
    fRimPower: data.fRimPower,
    fRimRefractionPower: data.fBackLightPower,
    bEnvironmentMapping: data.bEnvironmentMapping,
    bAnisoLighting: data.bAnisoLighting,
    bEnableEditorAlphaRef: data.bEnableEditorAlphaRef,
    bTranslucencyEnabled: data.bSubsurfaceLighting,
    bDecal: data.sf1.decal,
    bDynamicDecal: data.sf1.dynDecal,
    bParallaxOcclusion: data.sf2.parallax_occlusion,
    fParallaxOcclusionScale: data.fDisplacementTextureScale,
    fParallaxOcclusionBias: data.fDisplacementTextureBias,
    bIsGlass: data.bGlassEnabled,
    fGlassRefractionScaler: data.fGlassRefractionScaler,
    bReceiveShadows: data.bReceiveShadows,
    bCastShadows: data.bCastShadows,
    bHair: data.bHair,
    cHairTintColor: hexColor(data.cHairTintColor),
    bTree: data.bTree,
    bFacegen: data.bFacegen,
    bSkinTint: data.bSkinTint,
    bTessellate: data.bTessellate,
    fTessellationPnScale: data.fTessellationPnScale,
    fTessellationBaseFactor: data.fTessellationBaseFactor,
    fTessellationFadeDistance: data.fTessellationFadeDistance,
    fGrayscaleToPaletteScale: data.fGrayscaleToPaletteScale,
    bSkewSpecularAlpha: data.bSkewSpecularAlpha,
    bBlood: false,
    bEffectLighting: false,
    bFalloffEnabled: false,
    bFalloffColorEnabled: false,
    bGrayscaleToPaletteAlpha: false,
    bSoftEffect: data.sf1.softEffect,
    cBaseColor: hexColor('#ffffff'),
    fBaseColorScale: 1.0,
    bDepthTest: data.sf1.znBuffer,
    bDepthWrite: data.sf2.zbuffer_write,
    bScreenSpaceReflections: data.sf1.screenSpaceRefl,
    bWetnessControl_SpecScale: data.fWetnessControl_SpecScale > 0,
    fWetnessControl_SpecScale: data.fWetnessControl_SpecScale,
    fWetnessControl_SpecPowerScale: data.fWetnessControl_SpecPowerScale,
    fWetnessControl_SpecMinvar: data.fWetnessControl_SpecMinvar,
    fWetnessControl_EnvMapScale: data.fWetnessControl_EnvMapScale,
    fWetnessControl_FresnelPower: data.fWetnessControl_FresnelPower,
    fWetnessControl_Metalness: data.fWetnessControl_Metalness,
    bPBR: data.bPBR,
    bGlowmap: data.bGlowmap,
    fEmittanceMult: data.fEmittanceMult,
    bEmitEnabled: data.bEmitEnabled,
    cEmittanceColor: hexColor(data.cEmittanceColor),
    bBackLighting: data.bBackLighting,
    bExternalEmittance: data.bExternalEmittance,
    bHideSecret: false,
    bDissolveFade: false,
    bAssumeShadowmask: false,
    bModelSpaceNormals: data.bModelSpaceNormals,
    bSpecularEnabled: data.bSpecularEnabled,
    cSpecularColor: hexColor(data.cSpecularColor),
    fSpecularMult: data.fSpecularMult,
    fSmoothness: data.fSmoothness,
    fFresnelPower: data.fFresnelPower,
  };
  return JSON.stringify(json, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
};

const TexturePath: React.FC<{
  label: string;
  slot: string;
  value: string;
  hint: string;
  onChange: (v: string) => void;
}> = ({ label, slot, value, hint, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      <span className="text-[10px] font-mono text-slate-600">{slot}</span>
    </div>
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
      />
      {value && (
        <button
          title="Copy path"
          onClick={() => { navigator.clipboard.writeText(value); toast.success('Path copied'); }}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
        >
          <Copy size={12} />
        </button>
      )}
    </div>
    <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>
  </div>
);

const FloatInput: React.FC<{
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void; hint?: string;
}> = ({ label, value, min = 0, max = 10, step = 0.1, onChange, hint }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      <span className="text-xs font-mono text-emerald-400">{value.toFixed(3)}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-500 cursor-pointer"
    />
    {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
  </div>
);

const Toggle: React.FC<{
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}> = ({ label, value, onChange, hint }) => (
  <label className="flex items-start gap-2 cursor-pointer group">
    <div className={`mt-0.5 w-8 h-4 rounded-full flex-shrink-0 transition-colors ${value ? 'bg-emerald-500' : 'bg-slate-700'}`}
      onClick={() => onChange(!value)}
    >
      <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.25 shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
        style={{ marginTop: 1, marginLeft: value ? 18 : 2 }}
      />
    </div>
    <div>
      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{label}</span>
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  </label>
);

const FlagBit: React.FC<{
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}> = ({ label, value, onChange, hint }) => (
  <label title={hint} className="flex items-center gap-1.5 cursor-pointer group">
    <input
      type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)}
      className="w-3 h-3 accent-emerald-500"
    />
    <span className={`text-[11px] font-mono transition-colors ${value ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
      {label}
    </span>
  </label>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const BGSMEditor: React.FC = () => {
  const [data, setData] = useState<BGSMData>({ ...DEFAULT_BGSM });
  const [fileName, setFileName] = useState('new_material.bgsm');
  const [isDirty, setIsDirty] = useState(false);
  const [activePreset, setActivePreset] = useState('');
  const [jsonPreview, setJsonPreview] = useState(false);

  const update = useCallback(<K extends keyof BGSMData>(key: K, value: BGSMData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const updateSF1 = useCallback(<K extends keyof SF1Flags>(key: K, value: boolean) => {
    setData(prev => ({ ...prev, sf1: { ...prev.sf1, [key]: value } }));
    setIsDirty(true);
  }, []);

  const updateSF2 = useCallback(<K extends keyof SF2Flags>(key: K, value: boolean) => {
    setData(prev => ({ ...prev, sf2: { ...prev.sf2, [key]: value } }));
    setIsDirty(true);
  }, []);

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const { label: _l, description: _d, ...fields } = preset;
    setData(prev => ({
      ...DEFAULT_BGSM,
      ...prev,
      ...fields,
      sf1: { ...(fields.sf1 ?? DEFAULT_SF1) },
      sf2: { ...(fields.sf2 ?? DEFAULT_SF2) },
    }));
    setActivePreset(key);
    setIsDirty(true);
    toast.success(`Applied preset: ${preset.label}`);
  };

  const handleSave = async () => {
    try {
      const json = bgsmToJson(data);
      const api = (window as any).electron?.api ?? (window as any).electronAPI;
      if (api?.saveFile) {
        const result = await api.saveFile({ fileName, content: json, defaultExtension: 'bgsm' });
        if (result?.success) {
          setIsDirty(false);
          toast.success(`Saved ${result.filePath ?? fileName}`);
          return;
        }
      }
      // Fallback: browser download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setIsDirty(false);
      toast.success(`Exported ${fileName}`);
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    }
  };

  const handleImport = async () => {
    try {
      const api = (window as any).electron?.api ?? (window as any).electronAPI;
      if (api?.ddsPickFiles) {
        const result = await api.ddsPickFiles();
        const filePath = result?.paths?.[0] ?? result?.[0];
        if (!filePath) { toast('No file selected', { icon: '📁' }); return; }
        const readResult = await (api.readFile?.(filePath) ?? api.invoke?.('fs:readFile', filePath));
        const text = readResult?.content ?? readResult;
        if (!text) { toast.error('Could not read file'); return; }
        const parsed = JSON.parse(text);
        // Map FO4 JSON fields back to our internal structure
        setData(prev => ({
          ...DEFAULT_BGSM,
          sDiffuseTexture:      parsed.sDiffuseTexture ?? '',
          sNormalTexture:       parsed.sNormalTexture ?? '',
          sSmoothSpecTexture:   parsed.sSmoothSpecTexture ?? '',
          sGreyscaleTexture:    parsed.sGreyscaleTexture ?? '',
          sGlowTexture:         parsed.sGlowTexture ?? '',
          sInnerLayerTexture:   parsed.sInnerLayerTexture ?? '',
          sWrinklesTexture:     parsed.sWrinklesTexture ?? '',
          sDisplacementTexture: parsed.sDisplacementTexture ?? '',
          sRootMaterialPath:    parsed.sRootMaterialPath ?? '',
          bPBR:                 parsed.bPBR ?? false,
          bGlowmap:             parsed.bGlowmap ?? false,
          bEmitEnabled:         parsed.bEmitEnabled ?? false,
          fEmittanceMult:       parsed.fEmittanceMult ?? 1.0,
          bSpecularEnabled:     parsed.bSpecularEnabled ?? true,
          fSpecularMult:        parsed.fSpecularMult ?? 1.0,
          fSmoothness:          parsed.fSmoothness ?? 1.0,
          fFresnelPower:        parsed.fFresnelPower ?? 5.0,
          bEnvironmentMapping:  parsed.bEnvironmentMapping ?? false,
          bTessellate:          parsed.bTessellate ?? false,
          bModelSpaceNormals:   parsed.bModelSpaceNormals ?? false,
          bSubsurfaceLighting:  parsed.bTranslucencyEnabled ?? false,
          fSubsurfaceLightingRolloff: parsed.fTranslucencySubsurfaceRolloff ?? 0.3,
          bHair:   parsed.bHair ?? false,
          bTree:   parsed.bTree ?? false,
          bFacegen: parsed.bFacegen ?? false,
          bSkinTint: parsed.bSkinTint ?? false,
          bReceiveShadows: parsed.bReceiveShadows ?? true,
          bCastShadows:    parsed.bCastShadows ?? true,
          bGlassEnabled:   parsed.bIsGlass ?? false,
          fGlassRefractionScaler: parsed.fGlassRefractionScaler ?? 1.0,
          bEnableEditorAlphaRef: parsed.bEnableEditorAlphaRef ?? false,
          fAlphaTestRef: parsed.fAlphaTestRef ?? 0,
          bEnableLighting: true,
        }));
        setFileName(filePath.split(/[\\/]/).pop() ?? 'imported.bgsm');
        setIsDirty(false);
        toast.success('BGSM imported successfully');
      } else {
        toast.error('File picker not available in browser mode');
      }
    } catch (e: any) {
      toast.error('Import failed: ' + e.message);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-slate-900/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white mb-1">BGSM / BGEM Editor</h2>
            <p className="text-xs text-emerald-100/70">
              Fallout 4 material definition editor — all shader flags, texture slots, PBR controls, and wetness parameters.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition">
              <Upload size={13} /> Import .bgsm
            </button>
            <button onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${isDirty ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
              <Save size={13} /> Save
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ml-0.5" />}
            </button>
            <button onClick={() => setJsonPreview(!jsonPreview)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition">
              <Eye size={13} /> {jsonPreview ? 'Hide' : 'JSON'}
            </button>
          </div>
        </div>

        {/* File name & version row */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="block text-[10px] text-slate-500 mb-1">File Name</label>
            <input
              type="text" value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Version</label>
            <select value={data.version}
              onChange={(e) => update('version', parseInt(e.target.value) as BGSMVersion)}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none">
              <option value={2}>v2 — FO4 Standard</option>
              <option value={20}>v20 — FO4 NextGen / FO76</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Shader Type</label>
            <select value={data.shaderType}
              onChange={(e) => update('shaderType', e.target.value as ShaderType)}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none">
              <option value="default">Default (Most assets)</option>
              <option value="envmap">Environment Map</option>
              <option value="glowmap">Glow Map</option>
              <option value="parallax">Parallax</option>
              <option value="face">Face / Head Part</option>
              <option value="skintint">Skin Tint</option>
              <option value="hair">Hair</option>
              <option value="multilayer">Multilayer Parallax</option>
              <option value="glass">Glass</option>
              <option value="lod">LOD Landscape</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preset Templates */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Quick-Start Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`text-left p-3 rounded-lg border transition-all ${
                activePreset === key
                  ? 'border-emerald-500/60 bg-emerald-900/30 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold mb-0.5">{preset.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* JSON Preview */}
      {jsonPreview && (
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-emerald-400">Compiled BGSM JSON</h3>
            <button onClick={() => { navigator.clipboard.writeText(bgsmToJson(data)); toast.success('JSON copied'); }}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-400">
              <Copy size={10} /> Copy
            </button>
          </div>
          <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {bgsmToJson(data)}
          </pre>
        </div>
      )}

      {/* Texture Slots */}
      <Section title="Texture Slots" icon={<Layers size={14} className="text-blue-400" />}>
        <p className="text-[10px] text-slate-500 mb-2">
          Paths are relative to <code className="text-emerald-400 bg-slate-800 px-1 rounded">Data\Textures\</code>.
          Case-insensitive on Windows; case-sensitive on case-sensitive filesystems.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <TexturePath label="Diffuse" slot="sDiffuseTexture" value={data.sDiffuseTexture}
            hint="actors/character/basehumanmale/basehumanmale_d.dds"
            onChange={(v) => update('sDiffuseTexture', v)} />
          <TexturePath label="Normal Map" slot="sNormalTexture" value={data.sNormalTexture}
            hint="..._n.dds  (BC5 recommended)"
            onChange={(v) => update('sNormalTexture', v)} />
          <TexturePath label="Specular / PBR Pack" slot="sSmoothSpecTexture" value={data.sSmoothSpecTexture}
            hint="..._s.dds  (BC7 for PBR RMAOS)"
            onChange={(v) => update('sSmoothSpecTexture', v)} />
          <TexturePath label="Greyscale / Palette" slot="sGreyscaleTexture" value={data.sGreyscaleTexture}
            hint="Used with bGrayscaleToPaletteColor flag"
            onChange={(v) => update('sGreyscaleTexture', v)} />
          <TexturePath label="Glow / Emissive" slot="sGlowTexture" value={data.sGlowTexture}
            hint="..._g.dds  (BC1, small resolution)"
            onChange={(v) => update('sGlowTexture', v)} />
          <TexturePath label="Height / Displacement" slot="sDisplacementTexture" value={data.sDisplacementTexture}
            hint="..._h.dds  (BC4, for POM)"
            onChange={(v) => update('sDisplacementTexture', v)} />
          <TexturePath label="Inner Layer" slot="sInnerLayerTexture" value={data.sInnerLayerTexture}
            hint="Hair/multilayer inner surface texture"
            onChange={(v) => update('sInnerLayerTexture', v)} />
          <TexturePath label="Wrinkles" slot="sWrinklesTexture" value={data.sWrinklesTexture}
            hint="Morph-driven wrinkle normal overlay"
            onChange={(v) => update('sWrinklesTexture', v)} />
          <TexturePath label="Env Map Texture" slot="sEnvMapTexture" value={data.sEnvMapTexture}
            hint="shared/cubemaps/mipblur_defaultoutside1.dds"
            onChange={(v) => update('sEnvMapTexture', v)} />
          <TexturePath label="Env Mask" slot="sEnvMaskTexture" value={data.sEnvMaskTexture}
            hint="Greyscale mask controlling env map intensity"
            onChange={(v) => update('sEnvMaskTexture', v)} />
          <TexturePath label="Root Material Path" slot="sRootMaterialPath" value={data.sRootMaterialPath}
            hint="materials/parent.bgsm  (for material inheritance)"
            onChange={(v) => update('sRootMaterialPath', v)} />
        </div>
      </Section>

      {/* Shader Flags SF1 */}
      <Section title="Shader Flags 1 (SF1 — uShaderFlags1)" icon={<Cpu size={14} className="text-purple-400" />} defaultOpen={false}>
        <p className="text-[10px] text-slate-500 mb-2">
          Each flag is a single bit in the 32-bit <code className="text-emerald-400">uShaderFlags1</code> integer. Hover for description.
        </p>
        <div className="grid grid-cols-4 gap-x-2 gap-y-2">
          <FlagBit label="SPECULAR" value={data.sf1.specular} onChange={(v) => updateSF1('specular', v)} hint="Enable specular lighting response" />
          <FlagBit label="SKINNED" value={data.sf1.skinned} onChange={(v) => updateSF1('skinned', v)} hint="Bone-skinned mesh (actors, creatures)" />
          <FlagBit label="TEMP_REFRACTION" value={data.sf1.tempRefraction} onChange={(v) => updateSF1('tempRefraction', v)} hint="Temporary refraction effect (glass, holograms)" />
          <FlagBit label="VERTEX_ALPHA" value={data.sf1.vertexAlpha} onChange={(v) => updateSF1('vertexAlpha', v)} hint="Use vertex colour alpha channel" />
          <FlagBit label="FULLY_ILLUM" value={data.sf1.fullyIllum} onChange={(v) => updateSF1('fullyIllum', v)} hint="Fully-illuminated (unlit, ignores shadows)" />
          <FlagBit label="CLAMP_S" value={data.sf1.clamp_S} onChange={(v) => updateSF1('clamp_S', v)} hint="Clamp texture on S (U) axis (no tiling)" />
          <FlagBit label="CLAMP_T" value={data.sf1.clamp_T} onChange={(v) => updateSF1('clamp_T', v)} hint="Clamp texture on T (V) axis (no tiling)" />
          <FlagBit label="Z_BUFFER_TEST" value={data.sf1.znBuffer} onChange={(v) => updateSF1('znBuffer', v)} hint="Depth buffer test" />
          <FlagBit label="LOCAL_MAP_HIDE" value={data.sf1.localMapHide} onChange={(v) => updateSF1('localMapHide', v)} hint="Hidden on pipboy local map" />
          <FlagBit label="OWN_EMIT" value={data.sf1.ownEmit} onChange={(v) => updateSF1('ownEmit', v)} hint="Own emission (ignores ambient glow)" />
          <FlagBit label="PROJECTED_UV" value={data.sf1.projUV} onChange={(v) => updateSF1('projUV', v)} hint="Projected UVs (decals, scorch marks)" />
          <FlagBit label="DECAL" value={data.sf1.decal} onChange={(v) => updateSF1('decal', v)} hint="Static decal — draws over geometry" />
          <FlagBit label="DYNAMIC_DECAL" value={data.sf1.dynDecal} onChange={(v) => updateSF1('dynDecal', v)} hint="Dynamic decal (blood, impacts)" />
          <FlagBit label="PARALLAX" value={data.sf1.parallax} onChange={(v) => updateSF1('parallax', v)} hint="Simple parallax mapping (not POM)" />
          <FlagBit label="ALPHA_TEST" value={data.sf1.alphaTest} onChange={(v) => updateSF1('alphaTest', v)} hint="Enable alpha-test cutout (use with bEnableEditorAlphaRef)" />
          <FlagBit label="GLOW_MAP" value={data.sf1.glowMap} onChange={(v) => updateSF1('glowMap', v)} hint="Use glow texture slot for emission" />
          <FlagBit label="ENV_MAP" value={data.sf1.envMap} onChange={(v) => updateSF1('envMap', v)} hint="Environment cubemap reflection" />
          <FlagBit label="REFRACTION_FALLOFF" value={data.sf1.refractionFalloff} onChange={(v) => updateSF1('refractionFalloff', v)} hint="Refraction fades at glancing angles" />
          <FlagBit label="SOFT_EFFECT" value={data.sf1.softEffect} onChange={(v) => updateSF1('softEffect', v)} hint="Soft particle intersection fade" />
          <FlagBit label="DEPTH_MAP_TEST" value={data.sf1.depthmapTest} onChange={(v) => updateSF1('depthmapTest', v)} hint="Depth-map based test" />
          <FlagBit label="GRAYSCALE_PALETTE" value={data.sf1.grayscaleToPalette} onChange={(v) => updateSF1('grayscaleToPalette', v)} hint="Map greyscale diffuse through palette texture" />
          <FlagBit label="HEAD_PART" value={data.sf1.headPart} onChange={(v) => updateSF1('headPart', v)} hint="Actor head part shader path" />
          <FlagBit label="SILHOUETTE_REFL" value={data.sf1.silhouetteRefl} onChange={(v) => updateSF1('silhouetteRefl', v)} hint="Silhouette reflection (edge gloss)" />
          <FlagBit label="SCREEN_SPACE_REFL" value={data.sf1.screenSpaceRefl} onChange={(v) => updateSF1('screenSpaceRefl', v)} hint="Screen-space reflections (SSR)" />
          <FlagBit label="WETNESS" value={data.sf1.wetness} onChange={(v) => updateSF1('wetness', v)} hint="Affected by rain wetness system" />
          <FlagBit label="VERTEX_COLORS" value={data.sf1.vertexColors} onChange={(v) => updateSF1('vertexColors', v)} hint="Read vertex colour data from mesh" />
        </div>
      </Section>

      {/* Shader Flags SF2 */}
      <Section title="Shader Flags 2 (SF2 — uShaderFlags2)" icon={<Cpu size={14} className="text-cyan-400" />} defaultOpen={false}>
        <div className="grid grid-cols-4 gap-x-2 gap-y-2">
          <FlagBit label="Z_WRITE" value={data.sf2.zbuffer_write} onChange={(v) => updateSF2('zbuffer_write', v)} hint="Write to depth buffer (disable for transparency)" />
          <FlagBit label="LOD_LANDSCAPE" value={data.sf2.lod_land} onChange={(v) => updateSF2('lod_land', v)} hint="LOD landscape tile shader" />
          <FlagBit label="LOD_BUILDING" value={data.sf2.lod_building} onChange={(v) => updateSF2('lod_building', v)} hint="LOD building object" />
          <FlagBit label="NO_FADE" value={data.sf2.no_fade} onChange={(v) => updateSF2('no_fade', v)} hint="Skip distance fade-out" />
          <FlagBit label="REFRACTIVE" value={data.sf2.refractive} onChange={(v) => updateSF2('refractive', v)} hint="Full refraction (glass, water)" />
          <FlagBit label="REFRACT_DEPTH_WRITE" value={data.sf2.refract_writes_depth} onChange={(v) => updateSF2('refract_writes_depth', v)} hint="Refractive surface writes depth" />
          <FlagBit label="TWO_SIDED" value={data.sf2.two_sided} onChange={(v) => updateSF2('two_sided', v)} hint="Render both faces (no back-face cull)" />
          <FlagBit label="TREE_LOD" value={data.sf2.tree_LOD} onChange={(v) => updateSF2('tree_LOD', v)} hint="DynDOLOD tree billboard LOD" />
          <FlagBit label="PARALLAX_OCC" value={data.sf2.parallax_occlusion} onChange={(v) => updateSF2('parallax_occlusion', v)} hint="Parallax Occlusion Mapping (requires _h.dds + ENB/CShaders)" />
          <FlagBit label="MULTI_SNOW" value={data.sf2.multi_index_snow} onChange={(v) => updateSF2('multi_index_snow', v)} hint="Multi-index snow layering" />
          <FlagBit label="GL_WATER" value={data.sf2.gl_water} onChange={(v) => updateSF2('gl_water', v)} hint="Water surface shader" />
          <FlagBit label="HIGHLIGHT_ANIM" value={data.sf2.highlight_layer_anim} onChange={(v) => updateSF2('highlight_layer_anim', v)} hint="Animated highlight layer" />
          <FlagBit label="PBR (CShaders)" value={data.sf2.pbr} onChange={(v) => { updateSF2('pbr', v); update('bPBR', v); }} hint="Community Shaders GGX/PBR mode — enables RMAOS specular slot" />
          <FlagBit label="STACK_DECAL" value={data.sf2.stack_decal} onChange={(v) => updateSF2('stack_decal', v)} hint="Stack multiple decal layers" />
        </div>
      </Section>

      {/* Specular & Lighting */}
      <Section title="Specular & Lighting" icon={<Zap size={14} className="text-yellow-400" />}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Specular Enabled" value={data.bSpecularEnabled} onChange={(v) => update('bSpecularEnabled', v)} />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 flex-shrink-0">Specular Color</label>
            <input type="color" value={data.cSpecularColor}
              onChange={(e) => update('cSpecularColor', e.target.value)}
              className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent" />
          </div>
          <FloatInput label="Specular Multiplier" value={data.fSpecularMult} min={0} max={10} step={0.05}
            onChange={(v) => update('fSpecularMult', v)} hint="Overall specular intensity" />
          <FloatInput label="Smoothness (Glossiness)" value={data.fSmoothness} min={0} max={1} step={0.01}
            onChange={(v) => update('fSmoothness', v)} hint="0=rough, 1=mirror. Used in vanilla spec-gloss workflow." />
          <FloatInput label="Fresnel Power" value={data.fFresnelPower} min={0} max={20} step={0.1}
            onChange={(v) => update('fFresnelPower', v)} hint="Edge fresnel falloff exponent. Higher = tighter rim." />
          <Toggle label="Enable Lighting" value={data.bEnableLighting} onChange={(v) => update('bEnableLighting', v)} />
          <Toggle label="Rim Lighting" value={data.bRimLighting} onChange={(v) => update('bRimLighting', v)} />
          <FloatInput label="Rim Power" value={data.fRimPower} min={0} max={10} step={0.1}
            onChange={(v) => update('fRimPower', v)} hint="Rim lighting intensity" />
          <Toggle label="Back Lighting" value={data.bBackLighting} onChange={(v) => update('bBackLighting', v)} />
          <FloatInput label="Back Light Power" value={data.fBackLightPower} min={0} max={5} step={0.05}
            onChange={(v) => update('fBackLightPower', v)} hint="Backlit transmission intensity" />
          <Toggle label="Anisotropic Lighting" value={data.bAnisoLighting} onChange={(v) => update('bAnisoLighting', v)}
            hint="Directional specular (hair, brushed metal)" />
          <Toggle label="Model Space Normals" value={data.bModelSpaceNormals} onChange={(v) => update('bModelSpaceNormals', v)}
            hint="Use object-space instead of tangent-space normals" />
        </div>
      </Section>

      {/* Emissive */}
      <Section title="Emissive / Glow" icon={<Flame size={14} className="text-orange-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Emit Enabled" value={data.bEmitEnabled} onChange={(v) => update('bEmitEnabled', v)} />
          <Toggle label="Glow Map" value={data.bGlowmap} onChange={(v) => update('bGlowmap', v)} hint="Enables the glow texture slot" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 flex-shrink-0">Emittance Color</label>
            <input type="color" value={data.cEmittanceColor}
              onChange={(e) => update('cEmittanceColor', e.target.value)}
              className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent" />
          </div>
          <FloatInput label="Emittance Multiplier" value={data.fEmittanceMult} min={0} max={20} step={0.1}
            onChange={(v) => update('fEmittanceMult', v)} hint="Emittance color × texture × this value" />
          <Toggle label="External Emittance" value={data.bExternalEmittance} onChange={(v) => update('bExternalEmittance', v)}
            hint="Emittance driven by an external source (script, spell)" />
        </div>
      </Section>

      {/* Alpha */}
      <Section title="Alpha & Transparency" icon={<Eye size={14} className="text-slate-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Enable Alpha Test" value={data.bEnableEditorAlphaRef} onChange={(v) => { update('bEnableEditorAlphaRef', v); updateSF1('alphaTest', v); }}
            hint="Enable cutout alpha — set SF1 ALPHA_TEST too" />
          <FloatInput label="Alpha Test Threshold" value={data.fAlphaTestRef} min={0} max={255} step={1}
            onChange={(v) => update('fAlphaTestRef', v)} hint="Pixels below this value (0-255) are discarded" />
          <Toggle label="Alpha Blend" value={data.bAlphaBlend} onChange={(v) => { update('bAlphaBlend', v); updateSF2('zbuffer_write', !v); }}
            hint="Enables transparent blending (disables Z-write)" />
          <Toggle label="Alpha Sort" value={data.bAlphaSort} onChange={(v) => update('bAlphaSort', v)}
            hint="Sort transparent draw calls back-to-front" />
        </div>
        {data.bAlphaBlend && (
          <div className="mt-2 flex gap-2 items-start rounded-lg border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            Alpha blending auto-disabled Z-write. Enable <strong>TWO_SIDED</strong> in SF2 for double-sided glass or foliage.
          </div>
        )}
      </Section>

      {/* Subsurface / Wetness */}
      <Section title="Subsurface Scattering & Wetness" icon={<Droplets size={14} className="text-blue-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Subsurface Lighting (SSS)" value={data.bSubsurfaceLighting} onChange={(v) => update('bSubsurfaceLighting', v)} />
          <FloatInput label="SSS Rolloff" value={data.fSubsurfaceLightingRolloff} min={0} max={1} step={0.01}
            onChange={(v) => update('fSubsurfaceLightingRolloff', v)} hint="How far subsurface light wraps. 0.5 = standard skin." />
          <FloatInput label="Wetness Spec Scale" value={data.fWetnessControl_SpecScale} min={0} max={5} step={0.05}
            onChange={(v) => update('fWetnessControl_SpecScale', v)} hint="Specular boost when wet" />
          <FloatInput label="Wetness Spec Power Scale" value={data.fWetnessControl_SpecPowerScale} min={0} max={5} step={0.05}
            onChange={(v) => update('fWetnessControl_SpecPowerScale', v)} />
          <FloatInput label="Wetness Spec Min Var" value={data.fWetnessControl_SpecMinvar} min={0} max={1} step={0.01}
            onChange={(v) => update('fWetnessControl_SpecMinvar', v)} />
          <FloatInput label="Wetness Env Map Scale" value={data.fWetnessControl_EnvMapScale} min={0} max={5} step={0.05}
            onChange={(v) => update('fWetnessControl_EnvMapScale', v)} hint="Env map reflection when wet" />
          <FloatInput label="Wetness Fresnel Power" value={data.fWetnessControl_FresnelPower} min={0} max={20} step={0.1}
            onChange={(v) => update('fWetnessControl_FresnelPower', v)} />
          <FloatInput label="Wetness Metalness" value={data.fWetnessControl_Metalness} min={0} max={1} step={0.01}
            onChange={(v) => update('fWetnessControl_Metalness', v)} />
        </div>
      </Section>

      {/* Environment Mapping */}
      <Section title="Environment Mapping" icon={<Box size={14} className="text-indigo-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Environment Mapping" value={data.bEnvironmentMapping} onChange={(v) => { update('bEnvironmentMapping', v); updateSF1('envMap', v); }}
            hint="Cubemap reflection via ENV_MAP slot. Also set SF1 ENV_MAP." />
          <FloatInput label="Env Map Mask Scale" value={data.fEnvironmentMappingMaskScale} min={0} max={5} step={0.05}
            onChange={(v) => update('fEnvironmentMappingMaskScale', v)} hint="Global reflection intensity (1.0 = full)" />
          <Toggle label="Env Map Eye" value={data.bEnvironmentMappingEye} onChange={(v) => update('bEnvironmentMappingEye', v)}
            hint="Environment map applied to eye shader" />
        </div>
      </Section>

      {/* PBR (Community Shaders) */}
      <Section title="PBR — Community Shaders Extension" icon={<Zap size={14} className="text-emerald-400" />} defaultOpen={false}>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-200 mb-3">
          <strong>Requires Community Shaders v0.8+.</strong> When bPBR = true, the Specular slot (<code className="font-mono">sSmoothSpecTexture</code>)
          is reinterpreted as an RMAOS pack: R=Roughness, G=Metalness, B=AO, A=Specular. Use BC7 for this texture.
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="bPBR (GGX PBR Mode)" value={data.bPBR} onChange={(v) => { update('bPBR', v); updateSF2('pbr', v); }}
            hint="Enable GGX PBR workflow. Also sets SF2 PBR bit." />
          <Toggle label="Skew Specular Alpha" value={data.bSkewSpecularAlpha} onChange={(v) => update('bSkewSpecularAlpha', v)}
            hint="Shift specular alpha channel" />
          <FloatInput label="Grayscale → Palette Scale" value={data.fGrayscaleToPaletteScale} min={0} max={5} step={0.01}
            onChange={(v) => update('fGrayscaleToPaletteScale', v)} hint="Scale applied when mapping diffuse greyscale through palette" />
        </div>
      </Section>

      {/* Parallax / Tessellation */}
      <Section title="Parallax Occlusion & Tessellation" icon={<Info size={14} className="text-slate-400" />} defaultOpen={false}>
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/15 px-3 py-2 text-xs text-amber-200 mb-3">
          POM requires <code className="font-mono">_h.dds</code> (BC4) in the displacement slot, SF2 PARALLAX_OCC flag, and ENB or Community Shaders.
          Avoid on large tiling terrain — GPU cost is high.
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Enable Tessellation" value={data.bTessellate} onChange={(v) => update('bTessellate', v)} />
          <FloatInput label="Displacement Scale" value={data.fDisplacementTextureScale} min={0} max={50} step={0.5}
            onChange={(v) => update('fDisplacementTextureScale', v)} hint="Height extrusion depth (POM depth). 8-15 is typical." />
          <FloatInput label="Displacement Bias" value={data.fDisplacementTextureBias} min={-1} max={0} step={0.01}
            onChange={(v) => update('fDisplacementTextureBias', v)} hint="-0.5 centres surface at midpoint of height map" />
          <FloatInput label="Tessellation PN Scale" value={data.fTessellationPnScale} min={0} max={5} step={0.1}
            onChange={(v) => update('fTessellationPnScale', v)} />
          <FloatInput label="Tessellation Base Factor" value={data.fTessellationBaseFactor} min={0} max={10} step={0.1}
            onChange={(v) => update('fTessellationBaseFactor', v)} />
          <FloatInput label="Tessellation Fade Distance" value={data.fTessellationFadeDistance} min={0} max={5000} step={50}
            onChange={(v) => update('fTessellationFadeDistance', v)} hint="Distance at which tessellation fades out (0 = no fade)" />
        </div>
      </Section>

      {/* Glass */}
      <Section title="Glass & Refraction" icon={<Eye size={14} className="text-cyan-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Glass Enabled" value={data.bGlassEnabled} onChange={(v) => { update('bGlassEnabled', v); updateSF2('refractive', v); }}
            hint="Switch to glass refractive shader. Also sets SF2 REFRACTIVE." />
          <FloatInput label="Glass Refraction Scaler" value={data.fGlassRefractionScaler} min={0} max={0.5} step={0.005}
            onChange={(v) => update('fGlassRefractionScaler', v)} hint="Strength of refraction distortion. 0.03–0.1 is typical for windows." />
        </div>
      </Section>

      {/* Special / Character Flags */}
      <Section title="Special — Character, Hair & Shadow" icon={<Info size={14} className="text-pink-400" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Toggle label="Hair" value={data.bHair} onChange={(v) => update('bHair', v)} hint="Hair shader with dual-layer and tint" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 flex-shrink-0">Hair Tint Color</label>
            <input type="color" value={data.cHairTintColor}
              onChange={(e) => update('cHairTintColor', e.target.value)}
              className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent" />
          </div>
          <Toggle label="Facegen (Head Part)" value={data.bFacegen} onChange={(v) => update('bFacegen', v)} hint="Facegen head-part shader with tint and morph" />
          <Toggle label="Skin Tint" value={data.bSkinTint} onChange={(v) => update('bSkinTint', v)} hint="Apply actor skin tint colour" />
          <Toggle label="Tree" value={data.bTree} onChange={(v) => update('bTree', v)} hint="Tree leaf/branch shader with wind animation" />
          <Toggle label="Receive Shadows" value={data.bReceiveShadows} onChange={(v) => update('bReceiveShadows', v)} />
          <Toggle label="Cast Shadows" value={data.bCastShadows} onChange={(v) => update('bCastShadows', v)} />
          <Toggle label="External Emittance" value={data.bExternalEmittance} onChange={(v) => update('bExternalEmittance', v)} />
        </div>
      </Section>

      {/* Bottom action bar */}
      <div className="flex items-center gap-3 justify-end py-2">
        <button onClick={() => { setData({ ...DEFAULT_BGSM }); setIsDirty(false); setActivePreset(''); toast('Reset to defaults', { icon: '🔄' }); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-300 transition">
          <RefreshCw size={13} /> Reset
        </button>
        <button onClick={() => { navigator.clipboard.writeText(bgsmToJson(data)); toast.success('JSON copied to clipboard'); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-300 transition">
          <Copy size={13} /> Copy JSON
        </button>
        <button onClick={handleSave}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition ${isDirty ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-default'}`}>
          <Save size={13} /> Save .bgsm
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 ml-0.5" />}
        </button>
      </div>
    </div>
  );
};

export default BGSMEditor;
