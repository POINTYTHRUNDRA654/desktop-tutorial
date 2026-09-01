/**
 * TextureEnhancer.tsx — Photo-Realistic Texture Enhancement System
 *
 * NOT an upscaler. This is a detail-extraction and PBR map generation pipeline
 * that takes a raw diffuse texture and produces a complete, photorealistic
 * Fallout 4 material set:
 *
 *   1. Albedo Enhancement     — de-light, sharpen micro-detail, seamless tiling
 *   2. Normal Map Generation  — Sobel/Prewitt gradient extraction + detail injection
 *   3. Roughness Map          — material-aware luminance-driven roughness
 *   4. Metallic Map           — hue/saturation metal detection
 *   5. Ambient Occlusion      — normal-derived screen-space AO estimate
 *   6. Cavity Map             — fine-crevice AO from high-frequency normal detail
 *   7. Height / Parallax      — luminance → displacement for FO4 POM
 *
 * All processing routes through IPC to the Blender/Node backend.
 * Browser-side canvas previews are generated locally for instant feedback.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Upload, FolderOpen, Play, RefreshCw, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Eye, EyeOff, Download, Copy,
  Layers, Zap, Cpu, Droplets, Mountain, Flame, Box,
  AlertCircle, Info, Settings, Image, Star, RotateCcw, GraduationCap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MaterialSurface =
  | 'auto'
  | 'metal_clean'
  | 'metal_weathered'
  | 'metal_rusted'
  | 'concrete'
  | 'stone'
  | 'brick'
  | 'wood_rough'
  | 'wood_polished'
  | 'fabric'
  | 'organic'
  | 'painted'
  | 'plastic'
  | 'leather';

type EnhancementQuality = 'fast' | 'quality' | 'maximum';
type OutputFormat = 'dds' | 'png' | 'both';
type NormalMethod = 'sobel' | 'prewitt' | 'scharr';

interface PipelineStage {
  enabled: boolean;
}

interface AlbedoStage extends PipelineStage {
  deLighting: boolean;
  deLight_strength: number;    // 0–1: how aggressively remove baked shadows
  detailBoost: number;         // 0–2: micro-surface sharpening
  colorCalibrate: boolean;     // correct sRGB gamma for proper in-engine display
  seamless: boolean;           // fix tiling seams
  seamlessBlend: number;       // 0–1: seam blend radius
}

interface NormalStage extends PipelineStage {
  method: NormalMethod;
  strength: number;            // 0.1–5.0: bump intensity
  fineDetail: boolean;         // inject high-frequency cavity detail into normal
  invertY: boolean;            // false = DirectX (FO4 standard), true = OpenGL
  smoothing: number;           // 0–3: blur before extraction
}

interface RoughnessStage extends PipelineStage {
  base: number;                // 0–1: base roughness for the surface type
  luminanceInfluence: number;  // 0–1: how much brightness drives roughness
  variation: number;           // 0–1: random micro-variation
  invert: boolean;             // invert map (bright = smooth vs bright = rough)
}

interface MetallicStage extends PipelineStage {
  base: number;                // 0–1: base metallic value
  mode: 'manual' | 'hue_detect' | 'zero'; // zero = non-metal, hue_detect = auto
  threshold: number;           // saturation threshold for hue_detect
}

interface SpecularStage extends PipelineStage {
  intensity: number;           // 0–1: RGB tint strength (how bright the specular reflectance is)
  glossMin: number;            // 0–1: gloss (alpha) floor — dull crevices/edges
  glossMax: number;            // 0–1: gloss (alpha) ceiling — shiniest areas
}

interface AOStage extends PipelineStage {
  quality: 'low' | 'medium' | 'high';
  radius: number;              // 1–32: sampling radius in pixels
  strength: number;            // 0–2: AO intensity
  bias: number;                // 0–1: bias to prevent self-shadowing artefacts
}

interface CavityStage extends PipelineStage {
  radius: number;              // 1–8: fine-detail radius
  strength: number;            // 0–2: cavity intensity
}

interface HeightStage extends PipelineStage {
  source: 'luminance' | 'inverse_luminance' | 'red_channel';
  scale: number;               // POM depth scale
  bias: number;                // POM bias
}

interface AiDetailStage extends PipelineStage {
  model: string;                // ComfyUI checkpoint name
  denoise: number;              // 0–1: how much of the source to redraw (higher = more new detail, less fidelity to original)
  steps: number;
  cfg: number;
  promptOverride: string;       // empty = auto-build from the selected Material Surface
}

interface Pipeline {
  aiDetail:  AiDetailStage;      // runs FIRST — generative detail synthesis via ComfyUI, before every classical stage below
  albedo:    AlbedoStage;
  normal:    NormalStage;
  roughness: RoughnessStage;
  metallic:  MetallicStage;
  specular:  SpecularStage;
  ao:        AOStage;
  cavity:    CavityStage;
  height:    HeightStage;
}

interface EnhancementJob {
  id: string;
  inputPath: string;
  inputName: string;
  surface: MaterialSurface;
  quality: EnhancementQuality;
  status: 'queued' | 'analyzing' | 'enhancing' | 'extracting' | 'generating' | 'complete' | 'error';
  stages: Array<{ name: string; done: boolean; active: boolean }>;
  progress: number;
  currentOp: string;
  startTime: number;
  outputs: Partial<Record<string, string>>; // map name → output path
  error?: string;
  pipeline: Pipeline;    // snapshot of the settings actually used, for learning feedback
  rated?: 'kept' | 'discarded'; // set once the user has rated this job, to prevent double-recording
}

// ─────────────────────────────────────────────────────────────────────────────
// Learning loop — mirrors src/electron/textureEnhancerLearning.ts's tunable
// param list and blend logic. Kept in sync manually rather than shared across
// the IPC boundary since main only hands back raw weighted averages; the
// renderer owns SURFACE_PRESETS and is where the blend against a preset's
// baseline actually happens.
// ─────────────────────────────────────────────────────────────────────────────

const LEARNABLE_PARAMS: Array<{ key: string; stage: keyof Pipeline; field: string; min: number; max: number }> = [
  { key: 'normal.strength',    stage: 'normal',    field: 'strength',  min: 0.1, max: 5 },
  { key: 'normal.smoothing',   stage: 'normal',    field: 'smoothing', min: 0,   max: 3 },
  { key: 'specular.intensity', stage: 'specular',  field: 'intensity', min: 0,   max: 1 },
  { key: 'specular.glossMin',  stage: 'specular',  field: 'glossMin',  min: 0,   max: 1 },
  { key: 'specular.glossMax',  stage: 'specular',  field: 'glossMax',  min: 0,   max: 1 },
  { key: 'roughness.base',     stage: 'roughness', field: 'base',      min: 0,   max: 1 },
];

interface LearnedSurfaceStats {
  totalSamples: number;
  keptSamples: number;
  discardedSamples: number;
  params: Record<string, { average: number; weight: number }>;
}

/** Blends a surface's learned per-param averages into a baseline pipeline, in place, clamped to each param's range. */
function applyLearnedAdjustments(pipeline: Pipeline, stats: LearnedSurfaceStats | undefined): number {
  if (!stats) return 0;
  let applied = 0;
  for (const p of LEARNABLE_PARAMS) {
    const learned = stats.params[p.key];
    if (!learned) continue;
    // Blend factor grows with sample weight but is capped well short of 1 so a
    // handful of ratings nudges the default rather than fully replacing it.
    const blend = Math.min(0.75, 0.3 + learned.weight * 0.03);
    const stage = pipeline[p.stage] as any;
    const baseline = stage[p.field];
    if (typeof baseline !== 'number') continue;
    const adjusted = baseline * (1 - blend) + learned.average * blend;
    stage[p.field] = Math.max(p.min, Math.min(p.max, adjusted));
    applied++;
  }
  return applied;
}

interface InputFile {
  path: string;
  name: string;
  preview?: string; // data URL from canvas
}

// ─────────────────────────────────────────────────────────────────────────────
// Material Surface Presets
// ─────────────────────────────────────────────────────────────────────────────

interface SurfacePreset {
  label: string;
  description: string;
  color: string;
  pipeline: Partial<Pipeline>;
}

const SURFACE_PRESETS: Record<MaterialSurface, SurfacePreset> = {
  auto: {
    label: 'Auto-Detect',
    description: 'Analyse texture hue/saturation to pick the best preset automatically.',
    color: 'text-slate-300',
    pipeline: {},
  },
  metal_clean: {
    label: 'Clean Metal',
    description: 'Polished steel/chrome. Low roughness, high metallic, sharp specular.',
    color: 'text-blue-300',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.6, detailBoost: 0.8, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.15, luminanceInfluence: 0.3, variation: 0.05, invert: false },
      metallic:  { enabled: true, base: 1.0, mode: 'manual', threshold: 0.4 },
      specular:  { enabled: true, intensity: 0.8, glossMin: 0.6, glossMax: 0.95 },
      ao:        { enabled: true, quality: 'high', radius: 8, strength: 0.8, bias: 0.05 },
      normal:    { enabled: true, method: 'scharr', strength: 0.6, fineDetail: true, invertY: false, smoothing: 0.5 },
      cavity:    { enabled: true, radius: 3, strength: 0.7 },
      height:    { enabled: false, source: 'luminance', scale: 5.0, bias: -0.5 },
    },
  },
  metal_weathered: {
    label: 'Weathered Metal',
    description: 'Scratched/dented painted or bare metal. Variable roughness, partial metallic.',
    color: 'text-amber-300',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.5, detailBoost: 1.4, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.55, luminanceInfluence: 0.6, variation: 0.25, invert: false },
      metallic:  { enabled: true, base: 0.8, mode: 'hue_detect', threshold: 0.35 },
      specular:  { enabled: true, intensity: 0.5, glossMin: 0.2, glossMax: 0.6 },
      ao:        { enabled: true, quality: 'high', radius: 12, strength: 1.2, bias: 0.05 },
      normal:    { enabled: true, method: 'scharr', strength: 1.8, fineDetail: true, invertY: false, smoothing: 0.3 },
      cavity:    { enabled: true, radius: 4, strength: 1.2 },
      height:    { enabled: true, source: 'luminance', scale: 6.0, bias: -0.5 },
    },
  },
  metal_rusted: {
    label: 'Rusted Metal',
    description: 'Heavy rust and corrosion. High roughness variation, mixed metallic.',
    color: 'text-orange-400',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.4, detailBoost: 1.8, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.75, luminanceInfluence: 0.8, variation: 0.4, invert: false },
      metallic:  { enabled: true, base: 0.5, mode: 'hue_detect', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.3, glossMin: 0.05, glossMax: 0.35 },
      ao:        { enabled: true, quality: 'high', radius: 16, strength: 1.5, bias: 0.05 },
      normal:    { enabled: true, method: 'scharr', strength: 2.5, fineDetail: true, invertY: false, smoothing: 0.2 },
      cavity:    { enabled: true, radius: 5, strength: 1.6 },
      height:    { enabled: true, source: 'luminance', scale: 8.0, bias: -0.5 },
    },
  },
  concrete: {
    label: 'Concrete / Plaster',
    description: 'Rough cast concrete. High roughness, zero metallic, strong AO in pores.',
    color: 'text-slate-400',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.7, detailBoost: 1.6, colorCalibrate: true, seamless: true, seamlessBlend: 0.15 },
      roughness: { enabled: true, base: 0.92, luminanceInfluence: 0.4, variation: 0.15, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.15, glossMin: 0.02, glossMax: 0.15 },
      ao:        { enabled: true, quality: 'high', radius: 20, strength: 1.6, bias: 0.03 },
      normal:    { enabled: true, method: 'scharr', strength: 2.0, fineDetail: true, invertY: false, smoothing: 0.4 },
      cavity:    { enabled: true, radius: 6, strength: 1.8 },
      height:    { enabled: true, source: 'luminance', scale: 10.0, bias: -0.5 },
    },
  },
  stone: {
    label: 'Stone / Rock',
    description: 'Natural stone surfaces. Very high roughness, complex normal/cavity detail.',
    color: 'text-stone-400',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.65, detailBoost: 1.5, colorCalibrate: true, seamless: true, seamlessBlend: 0.2 },
      roughness: { enabled: true, base: 0.95, luminanceInfluence: 0.3, variation: 0.2, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.1, glossMin: 0.02, glossMax: 0.12 },
      ao:        { enabled: true, quality: 'high', radius: 24, strength: 1.8, bias: 0.02 },
      normal:    { enabled: true, method: 'scharr', strength: 2.8, fineDetail: true, invertY: false, smoothing: 0.2 },
      cavity:    { enabled: true, radius: 7, strength: 2.0 },
      height:    { enabled: true, source: 'luminance', scale: 12.0, bias: -0.5 },
    },
  },
  brick: {
    label: 'Brick / Masonry',
    description: 'Brick and mortar. Strong height for grout lines, high normal contrast.',
    color: 'text-red-400',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.55, detailBoost: 1.3, colorCalibrate: true, seamless: true, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.85, luminanceInfluence: 0.5, variation: 0.25, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.15, glossMin: 0.03, glossMax: 0.18 },
      ao:        { enabled: true, quality: 'high', radius: 18, strength: 2.0, bias: 0.03 },
      normal:    { enabled: true, method: 'scharr', strength: 3.2, fineDetail: true, invertY: false, smoothing: 0.1 },
      cavity:    { enabled: true, radius: 5, strength: 1.5 },
      height:    { enabled: true, source: 'luminance', scale: 14.0, bias: -0.5 },
    },
  },
  wood_rough: {
    label: 'Rough / Weathered Wood',
    description: 'Aged timber. Strong grain normal, high roughness, no metallic.',
    color: 'text-yellow-700',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.5, detailBoost: 1.4, colorCalibrate: true, seamless: true, seamlessBlend: 0.15 },
      roughness: { enabled: true, base: 0.82, luminanceInfluence: 0.5, variation: 0.3, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.2, glossMin: 0.05, glossMax: 0.25 },
      ao:        { enabled: true, quality: 'medium', radius: 14, strength: 1.4, bias: 0.04 },
      normal:    { enabled: true, method: 'sobel', strength: 2.2, fineDetail: true, invertY: false, smoothing: 0.3 },
      cavity:    { enabled: true, radius: 5, strength: 1.4 },
      height:    { enabled: true, source: 'luminance', scale: 8.0, bias: -0.5 },
    },
  },
  wood_polished: {
    label: 'Polished Wood',
    description: 'Varnished hardwood. Moderate roughness, subtle sheen.',
    color: 'text-yellow-600',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.6, detailBoost: 0.8, colorCalibrate: true, seamless: true, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.45, luminanceInfluence: 0.4, variation: 0.1, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.45, glossMin: 0.3, glossMax: 0.7 },
      ao:        { enabled: true, quality: 'medium', radius: 10, strength: 1.0, bias: 0.04 },
      normal:    { enabled: true, method: 'sobel', strength: 1.4, fineDetail: false, invertY: false, smoothing: 0.5 },
      cavity:    { enabled: true, radius: 3, strength: 0.8 },
      height:    { enabled: false, source: 'luminance', scale: 4.0, bias: -0.5 },
    },
  },
  fabric: {
    label: 'Fabric / Cloth',
    description: 'Woven textiles. Very high roughness, micro-fibre normal detail, no metallic.',
    color: 'text-purple-300',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.8, detailBoost: 1.2, colorCalibrate: true, seamless: true, seamlessBlend: 0.2 },
      roughness: { enabled: true, base: 0.98, luminanceInfluence: 0.2, variation: 0.08, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.1, glossMin: 0.02, glossMax: 0.1 },
      ao:        { enabled: true, quality: 'medium', radius: 6, strength: 0.9, bias: 0.06 },
      normal:    { enabled: true, method: 'prewitt', strength: 1.2, fineDetail: true, invertY: false, smoothing: 0.8 },
      cavity:    { enabled: true, radius: 2, strength: 0.6 },
      height:    { enabled: false, source: 'luminance', scale: 2.0, bias: -0.5 },
    },
  },
  organic: {
    label: 'Organic / Terrain',
    description: 'Dirt, mud, grass, organic surfaces. High roughness, dense AO.',
    color: 'text-green-600',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.75, detailBoost: 1.3, colorCalibrate: true, seamless: true, seamlessBlend: 0.25 },
      roughness: { enabled: true, base: 0.95, luminanceInfluence: 0.35, variation: 0.3, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.1, glossMin: 0.02, glossMax: 0.12 },
      ao:        { enabled: true, quality: 'high', radius: 22, strength: 2.0, bias: 0.02 },
      normal:    { enabled: true, method: 'sobel', strength: 2.4, fineDetail: true, invertY: false, smoothing: 0.3 },
      cavity:    { enabled: true, radius: 6, strength: 1.6 },
      height:    { enabled: true, source: 'luminance', scale: 9.0, bias: -0.5 },
    },
  },
  painted: {
    label: 'Painted Surface',
    description: 'Painted metal or wood. Semi-rough, low metallic, good for weathered props.',
    color: 'text-cyan-300',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.5, detailBoost: 1.0, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.6, luminanceInfluence: 0.5, variation: 0.2, invert: false },
      metallic:  { enabled: true, base: 0.1, mode: 'hue_detect', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.35, glossMin: 0.15, glossMax: 0.5 },
      ao:        { enabled: true, quality: 'medium', radius: 10, strength: 1.2, bias: 0.04 },
      normal:    { enabled: true, method: 'scharr', strength: 1.5, fineDetail: true, invertY: false, smoothing: 0.4 },
      cavity:    { enabled: true, radius: 4, strength: 1.0 },
      height:    { enabled: false, source: 'luminance', scale: 4.0, bias: -0.5 },
    },
  },
  plastic: {
    label: 'Plastic / Synthetic',
    description: 'Hard plastics, rubber, synthetics. Moderate roughness, no metallic.',
    color: 'text-teal-300',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.5, detailBoost: 0.7, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
      roughness: { enabled: true, base: 0.5, luminanceInfluence: 0.3, variation: 0.08, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.4, glossMin: 0.25, glossMax: 0.65 },
      ao:        { enabled: true, quality: 'medium', radius: 8, strength: 0.8, bias: 0.05 },
      normal:    { enabled: true, method: 'sobel', strength: 0.9, fineDetail: false, invertY: false, smoothing: 0.6 },
      cavity:    { enabled: true, radius: 3, strength: 0.7 },
      height:    { enabled: false, source: 'luminance', scale: 3.0, bias: -0.5 },
    },
  },
  leather: {
    label: 'Leather / Hide',
    description: 'Natural or synthetic leather. Moderate roughness, subtle pore normal.',
    color: 'text-amber-700',
    pipeline: {
      albedo:    { enabled: true, deLighting: true, deLight_strength: 0.6, detailBoost: 1.0, colorCalibrate: true, seamless: true, seamlessBlend: 0.15 },
      roughness: { enabled: true, base: 0.7, luminanceInfluence: 0.4, variation: 0.15, invert: false },
      metallic:  { enabled: true, base: 0.0, mode: 'zero', threshold: 0.5 },
      specular:  { enabled: true, intensity: 0.3, glossMin: 0.1, glossMax: 0.4 },
      ao:        { enabled: true, quality: 'medium', radius: 10, strength: 1.1, bias: 0.04 },
      normal:    { enabled: true, method: 'scharr', strength: 1.6, fineDetail: true, invertY: false, smoothing: 0.5 },
      cavity:    { enabled: true, radius: 4, strength: 1.2 },
      height:    { enabled: false, source: 'luminance', scale: 4.0, bias: -0.5 },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Pipeline
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PIPELINE: Pipeline = {
  // Off by default — opt-in since it requires ComfyUI running and takes real
  // generation time, unlike every classical stage below which is instant.
  aiDetail:  { enabled: false, model: '', denoise: 0.45, steps: 30, cfg: 6, promptOverride: '' },
  albedo:    { enabled: true,  deLighting: true, deLight_strength: 0.5, detailBoost: 1.0, colorCalibrate: true, seamless: false, seamlessBlend: 0.1 },
  normal:    { enabled: true,  method: 'scharr', strength: 1.5, fineDetail: true, invertY: false, smoothing: 0.4 },
  roughness: { enabled: true,  base: 0.7, luminanceInfluence: 0.5, variation: 0.15, invert: false },
  metallic:  { enabled: false, base: 0.0, mode: 'zero', threshold: 0.5 },
  specular:  { enabled: true,  intensity: 0.35, glossMin: 0.1, glossMax: 0.6 },
  ao:        { enabled: true,  quality: 'medium', radius: 12, strength: 1.2, bias: 0.04 },
  cavity:    { enabled: true,  radius: 4, strength: 1.0 },
  height:    { enabled: false, source: 'luminance', scale: 6.0, bias: -0.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface StageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  expanded: boolean;
  onToggleEnabled: () => void;
  onToggleExpanded: () => void;
}

function StageHeader({ icon, title, subtitle, enabled, expanded, onToggleEnabled, onToggleExpanded }: StageHeaderProps) {
  return (
    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggleExpanded}>
      <button
        className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
          enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-500 border border-slate-600'
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
        title={enabled ? 'Disable stage' : 'Enable stage'}
      >
        {icon}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${enabled ? 'text-slate-100' : 'text-slate-500'}`}>{title}</span>
          {!enabled && <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">SKIPPED</span>}
        </div>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <div className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  fmt?: (v: number) => string;
}

function Slider({ label, value, min, max, step, onChange, disabled, fmt }: SliderProps) {
  const display = fmt ? fmt(value) : value.toFixed(step < 0.1 ? 2 : 1);
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <label className="text-xs text-slate-400 w-36 flex-shrink-0">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-green-500"
      />
      <span className="text-xs text-slate-300 w-10 text-right font-mono">{display}</span>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-xs text-slate-400">{label}</span>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${checked ? 'bg-green-500' : 'bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4.5' : 'left-0.5'}`} style={{ left: checked ? '18px' : '2px' }} />
      </button>
    </div>
  );
}

interface JobCardProps {
  job: EnhancementJob;
  onRate: (jobId: string, outcome: 'kept' | 'discarded', rating?: number) => void;
}

function JobCard({ job, onRate }: JobCardProps) {
  const statusColor = {
    queued: 'text-slate-400',
    analyzing: 'text-blue-400',
    enhancing: 'text-yellow-400',
    extracting: 'text-orange-400',
    generating: 'text-purple-400',
    complete: 'text-green-400',
    error: 'text-red-400',
  }[job.status];

  const elapsed = job.status === 'complete' || job.status === 'error'
    ? ((Date.now() - job.startTime) / 1000).toFixed(1) + 's'
    : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{job.inputName}</p>
          <p className={`text-xs ${statusColor} capitalize`}>{job.status}{job.currentOp ? ` — ${job.currentOp}` : ''}</p>
        </div>
        {elapsed && <span className="text-xs text-slate-500 flex-shrink-0">{elapsed}</span>}
      </div>

      {/* Progress bar */}
      {job.status !== 'queued' && job.status !== 'complete' && job.status !== 'error' && (
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {/* Stage pills */}
      <div className="flex flex-wrap gap-1">
        {job.stages.map((s) => (
          <span
            key={s.name}
            className={`text-xs px-1.5 py-0.5 rounded ${
              s.done ? 'bg-green-900/40 text-green-400 border border-green-700/30' :
              s.active ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/30 animate-pulse' :
              'bg-slate-700 text-slate-500'
            }`}
          >
            {s.name}
          </span>
        ))}
      </div>

      {job.error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded px-2 py-1">{job.error}</p>
      )}

      {job.status === 'complete' && Object.keys(job.outputs).length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-700">
          {Object.entries(job.outputs).map(([mapName, path]) => (
            <span key={mapName} className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded" title={path ?? ''}>
              {mapName}
            </span>
          ))}
        </div>
      )}

      {/* Learning feedback — teaches the surface preset what actually worked */}
      {job.status === 'complete' && !job.rated && (
        <div className="pt-2 border-t border-slate-700 space-y-1.5">
          <p className="text-xs text-slate-500">Keep this result? Helps tune future defaults for this surface.</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                title={`Rate ${star}/5 and keep`}
                onClick={() => onRate(job.id, 'kept', star)}
                className="text-yellow-500/70 hover:text-yellow-400 transition-colors"
              >
                <Star size={13} fill="currentColor" />
              </button>
            ))}
            <button
              onClick={() => onRate(job.id, 'discarded')}
              className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-red-900/40 text-slate-400 hover:text-red-300 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
      {job.rated && (
        <p className="text-xs text-slate-600 pt-1 border-t border-slate-700">
          {job.rated === 'kept' ? 'Marked kept — folded into learning.' : 'Marked discarded.'}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TextureEnhancer() {
  // ── Input state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [inputFile, setInputFile] = useState<InputFile | null>(null);
  const [batchFolder, setBatchFolder] = useState<string>('');
  const [outputFolder, setOutputFolder] = useState<string>('');

  // ── Pipeline config ──────────────────────────────────────────────────────
  const [surface, setSurface] = useState<MaterialSurface>('auto');
  const [quality, setQuality] = useState<EnhancementQuality>('quality');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('dds');
  const [pipeline, setPipeline] = useState<Pipeline>(DEFAULT_PIPELINE);

  // ── AI Detail Synthesis (ComfyUI) ────────────────────────────────────────
  const [comfyStatus, setComfyStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [comfyModels, setComfyModels] = useState<string[]>([]);

  useEffect(() => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!api?.invoke) { setComfyStatus('offline'); return; }
    (async () => {
      try {
        const status = await api.invoke('textures:comfyui-status');
        if (!status?.online) { setComfyStatus('offline'); return; }
        setComfyStatus('online');
        const modelsResp = await api.invoke('textures:comfyui-models');
        const models: string[] = modelsResp?.success ? (modelsResp.models ?? []) : [];
        setComfyModels(models);
        if (models.length > 0) {
          setPipeline(prev => prev.aiDetail.model ? prev : { ...prev, aiDetail: { ...prev.aiDetail, model: models[0] } });
        }
      } catch {
        setComfyStatus('offline');
      }
    })();
  }, []);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['albedo', 'normal']));
  const [jobs, setJobs] = useState<EnhancementJob[]>([]);
  const [running, setRunning] = useState(false);

  // ── Learning loop ────────────────────────────────────────────────────────
  const [learnedStats, setLearnedStats] = useState<Record<string, LearnedSurfaceStats>>({});
  // Mirrors learnedStats without being a dependency of the surface-preset effect
  // below — stats should only be *applied* when the user deliberately (re)selects
  // a surface, never silently overwrite sliders mid-session just because a rating
  // elsewhere refreshed the numbers.
  const learnedStatsRef = useRef<Record<string, LearnedSurfaceStats>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLearnedStats = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!api?.invoke) return;
    try {
      const result = await api.invoke('texture-enhancer:get-learned-stats');
      if (result?.success) {
        setLearnedStats(result.stats || {});
        learnedStatsRef.current = result.stats || {};
      }
    } catch { /* non-fatal — learning stats are advisory */ }
  }, []);

  useEffect(() => { refreshLearnedStats(); }, [refreshLearnedStats]);

  // Apply preset when surface changes, then blend in whatever this surface has learned
  // from past kept/discarded ratings so the starting point improves over time.
  useEffect(() => {
    const baseline = surface === 'auto' ? DEFAULT_PIPELINE : SURFACE_PRESETS[surface].pipeline;
    const next: Pipeline = JSON.parse(JSON.stringify(DEFAULT_PIPELINE));
    if (surface !== 'auto' && baseline) {
      for (const key of Object.keys(baseline) as Array<keyof Pipeline>) {
        if (baseline[key]) {
          (next[key] as any) = { ...(next[key] as any), ...(baseline[key] as any) };
        }
      }
    }
    applyLearnedAdjustments(next, learnedStatsRef.current[surface]);
    setPipeline(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);

  async function resetLearningForSurface() {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!api?.invoke) return;
    try {
      await api.invoke('texture-enhancer:reset-learning', { surface });
      await refreshLearnedStats();
      toast.success(`Cleared learned data for ${SURFACE_PRESETS[surface].label}.`);
    } catch (err: any) {
      toast.error(`Failed to reset learning: ${err?.message ?? err}`);
    }
  }

  async function handleRateJob(jobId: string, outcome: 'kept' | 'discarded', rating?: number) {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.rated) return;
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, rated: outcome } : j));

    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!api?.invoke) return;
    try {
      await api.invoke('texture-enhancer:record-outcome', {
        surface: job.surface, pipeline: job.pipeline, outcome, rating,
      });
      await refreshLearnedStats();
      toast.success(outcome === 'kept' ? 'Thanks — folded into learning.' : 'Noted as discarded.');
    } catch (err: any) {
      toast.error(`Failed to record feedback: ${err?.message ?? err}`);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function toggleStageExpand(name: string) {
    setExpandedStages(prev => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });
  }

  function updateStage<K extends keyof Pipeline>(key: K, patch: Partial<Pipeline[K]>) {
    setPipeline(prev => ({ ...prev, [key]: { ...(prev[key] as any), ...(patch as any) } }));
  }

  function toggleStageEnabled(key: keyof Pipeline) {
    setPipeline(prev => ({ ...prev, [key]: { ...(prev[key] as any), enabled: !(prev[key] as any).enabled } }));
  }

  async function pickFile() {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (api?.invoke) {
      const result = await api.invoke('texture-enhancer:pick-input-texture');
      if (result) setInputFile({ path: result, name: result.split(/[\\/]/).pop() ?? result });
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Electron exposes the real absolute path on File objects from a native
    // <input type=file> picker — f.name alone is not a usable filesystem path.
    const realPath = (f as any).path || f.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputFile({ path: realPath, name: f.name, preview: ev.target?.result as string });
    };
    reader.readAsDataURL(f);
  }

  async function pickFolder(setter: (p: string) => void) {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (api?.pickDirectory) {
      const result = await api.pickDirectory();
      if (result) setter(result);
    }
  }

  async function runEnhancement() {
    const target = mode === 'single' ? inputFile?.path : batchFolder;
    if (!target) { toast.error('Please select an input texture or folder first.'); return; }

    const jobId = `job_${Date.now()}`;
    const enabledStageNames = Object.entries(pipeline)
      .filter(([, s]) => (s as PipelineStage).enabled)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

    const newJob: EnhancementJob = {
      id: jobId,
      inputPath: target,
      inputName: mode === 'single' ? (inputFile?.name ?? target) : batchFolder.split(/[\\/]/).pop() ?? batchFolder,
      surface,
      quality,
      status: 'analyzing',
      stages: enabledStageNames.map((name, i) => ({ name, done: false, active: i === 0 })),
      progress: 0,
      currentOp: 'Analysing source texture…',
      startTime: Date.now(),
      outputs: {},
      pipeline: JSON.parse(JSON.stringify(pipeline)), // snapshot for later learning feedback
    };

    setJobs(prev => [newJob, ...prev]);
    setRunning(true);

    try {
      const api = (window as any).electron?.api ?? (window as any).electronAPI;
      if (!api?.invoke) {
        throw new Error('Desktop Bridge not available — this feature requires the Electron app, not a browser preview.');
      }

      const result = await api.invoke('texture-enhancer:enhance', {
        inputPath: target,
        outputFolder: outputFolder || undefined,
        mode,
        surface,
        quality,
        outputFormat,
        pipeline,
      });

      if (!result?.success) {
        throw new Error(result?.error || 'No maps were generated.');
      }

      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'complete',
        progress: 100,
        currentOp: 'Done',
        outputs: result?.outputs ?? {},
        stages: j.stages.map(s => ({ ...s, done: true, active: false })),
      } : j));

      if (result.errors?.length) {
        toast(`Completed with ${result.errors.length} issue(s): ${result.errors[0]}`, { icon: '⚠️' });
      } else {
        toast.success('Enhancement complete!');
      }
      if (result.note) toast(result.note, { icon: 'ℹ️' });
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j, status: 'error', error: err?.message ?? String(err),
      } : j));
      toast.error(`Enhancement failed: ${err?.message ?? err}`);
    } finally {
      setRunning(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/60 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 flex items-center justify-center">
            <Layers size={16} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Photo-Realistic Texture Enhancement</h2>
            <p className="text-xs text-slate-400">Detail extraction · PBR map generation — not an upscaler</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: config ─────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r border-slate-700/60 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            {/* Input */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex gap-1 mb-2">
                <button onClick={() => setMode('single')} className={`flex-1 text-xs py-1 rounded transition-colors ${mode === 'single' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Single Texture</button>
                <button onClick={() => setMode('batch')} className={`flex-1 text-xs py-1 rounded transition-colors ${mode === 'batch' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Batch Folder</button>
              </div>
              {mode === 'single' ? (
                <button onClick={pickFile} className="w-full border-2 border-dashed border-slate-600 hover:border-green-500/60 rounded-lg py-4 text-center transition-colors">
                  {inputFile ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-green-400">{inputFile.name}</p>
                      <p className="text-xs text-slate-500">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload size={18} className="mx-auto text-slate-500" />
                      <p className="text-xs text-slate-400">Click to pick texture</p>
                      <p className="text-xs text-slate-600">DDS · PNG · TGA · JPG</p>
                    </div>
                  )}
                </button>
              ) : (
                <button onClick={() => pickFolder(setBatchFolder)} className="w-full border-2 border-dashed border-slate-600 hover:border-green-500/60 rounded-lg py-3 text-center transition-colors">
                  <FolderOpen size={16} className="mx-auto text-slate-500 mb-1" />
                  <p className="text-xs text-slate-400">{batchFolder || 'Click to pick texture folder'}</p>
                </button>
              )}
              <button onClick={() => pickFolder(setOutputFolder)} className="w-full flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 transition-colors">
                <FolderOpen size={12} className="text-slate-400" />
                <span className="truncate">{outputFolder || 'Output folder (optional)'}</span>
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".dds,.png,.tga,.jpg,.jpeg,.bmp,.tiff" onChange={handleFileInputChange} />
            </div>

            {/* Surface preset */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Material Surface</p>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value as MaterialSurface)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-green-500 outline-none"
              >
                {(Object.keys(SURFACE_PRESETS) as MaterialSurface[]).map(k => (
                  <option key={k} value={k}>{SURFACE_PRESETS[k].label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{SURFACE_PRESETS[surface].description}</p>
              {learnedStats[surface] && learnedStats[surface].totalSamples > 0 && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700">
                  <GraduationCap size={11} className="text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500 flex-1">
                    Learned from {learnedStats[surface].totalSamples} rated job{learnedStats[surface].totalSamples === 1 ? '' : 's'}
                    {' '}({learnedStats[surface].keptSamples} kept)
                    {Object.keys(learnedStats[surface].params).length > 0
                      ? ` — ${Object.keys(learnedStats[surface].params).length} setting${Object.keys(learnedStats[surface].params).length === 1 ? '' : 's'} auto-tuned`
                      : ' — not enough kept samples yet to auto-tune'}
                  </p>
                  <button
                    onClick={resetLearningForSurface}
                    title="Reset learned data for this surface"
                    className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* Quality + format */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Quality & Output</p>
              <div className="flex gap-1">
                {(['fast','quality','maximum'] as EnhancementQuality[]).map(q => (
                  <button key={q} onClick={() => setQuality(q)} className={`flex-1 text-xs py-1 rounded capitalize transition-colors ${quality === q ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{q}</button>
                ))}
              </div>
              <div className="flex gap-1">
                {(['dds','png','both'] as OutputFormat[]).map(f => (
                  <button key={f} onClick={() => setOutputFormat(f)} className={`flex-1 text-xs py-1 rounded uppercase transition-colors ${outputFormat === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{f}</button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {quality === 'fast' && 'Single-pass. Good for quick iteration.'}
                {quality === 'quality' && 'Multi-pass with refinement. Recommended.'}
                {quality === 'maximum' && 'Full pipeline with noise reduction. Slowest.'}
              </p>
            </div>

            {/* Pipeline stages */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-300 px-1">Pipeline Stages</p>

              {/* AI Detail Synthesis — runs first, generates new fine surface detail via
                  ComfyUI before every classical stage below derives from the result. */}
              <div className="bg-slate-800 border border-purple-700/50 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Zap size={12} />} title="AI Detail Synthesis" subtitle="Generates new fine detail via ComfyUI (not classical sharpening)"
                  enabled={pipeline.aiDetail.enabled} expanded={expandedStages.has('aiDetail')}
                  onToggleEnabled={() => toggleStageEnabled('aiDetail')} onToggleExpanded={() => toggleStageExpand('aiDetail')} />
                {comfyStatus === 'offline' && (
                  <p className="text-xs text-red-300/80">ComfyUI not running at 127.0.0.1:8188 — start it in AI Image Studio or External Integrations Hub first.</p>
                )}
                {expandedStages.has('aiDetail') && pipeline.aiDetail.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-36">Checkpoint</span>
                      <select value={pipeline.aiDetail.model} onChange={e => updateStage('aiDetail', { model: e.target.value })}
                        disabled={comfyStatus !== 'online' || comfyModels.length === 0}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500 disabled:opacity-50">
                        {comfyModels.length === 0 && <option value="">{comfyStatus === 'online' ? 'No checkpoints found' : 'ComfyUI offline'}</option>}
                        {comfyModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <Slider label="Denoise (new detail)" value={pipeline.aiDetail.denoise} min={0.1} max={0.85} step={0.01} onChange={v => updateStage('aiDetail', { denoise: v })} />
                    <p className="text-xs text-slate-600 -mt-1">Higher = more new detail generated, but less faithful to the original. 0.3–0.5 keeps shape/color; 0.5–0.7 repaints heavily.</p>
                    <Slider label="Steps" value={pipeline.aiDetail.steps} min={10} max={60} step={1} onChange={v => updateStage('aiDetail', { steps: v })} />
                    <Slider label="CFG" value={pipeline.aiDetail.cfg} min={1} max={15} step={0.5} onChange={v => updateStage('aiDetail', { cfg: v })} />
                    <div className="space-y-1">
                      <span className="text-xs text-slate-400">Prompt override (optional)</span>
                      <textarea
                        value={pipeline.aiDetail.promptOverride}
                        onChange={e => updateStage('aiDetail', { promptOverride: e.target.value })}
                        placeholder={`Leave empty to auto-build from the Material Surface (${SURFACE_PRESETS[surface].label})`}
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Albedo */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Image size={12} />} title="Albedo Enhancement" subtitle="De-light · sharpen · calibrate"
                  enabled={pipeline.albedo.enabled} expanded={expandedStages.has('albedo')}
                  onToggleEnabled={() => toggleStageEnabled('albedo')} onToggleExpanded={() => toggleStageExpand('albedo')} />
                {expandedStages.has('albedo') && pipeline.albedo.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <ToggleRow label="Remove baked lighting" checked={pipeline.albedo.deLighting} onChange={v => updateStage('albedo', { deLighting: v })} />
                    {pipeline.albedo.deLighting && <Slider label="De-light strength" value={pipeline.albedo.deLight_strength} min={0} max={1} step={0.01} onChange={v => updateStage('albedo', { deLight_strength: v })} />}
                    <Slider label="Detail boost" value={pipeline.albedo.detailBoost} min={0} max={2} step={0.05} onChange={v => updateStage('albedo', { detailBoost: v })} />
                    <ToggleRow label="sRGB colour calibration" checked={pipeline.albedo.colorCalibrate} onChange={v => updateStage('albedo', { colorCalibrate: v })} />
                    <ToggleRow label="Fix tiling seams" checked={pipeline.albedo.seamless} onChange={v => updateStage('albedo', { seamless: v })} />
                    {pipeline.albedo.seamless && <Slider label="Seam blend radius" value={pipeline.albedo.seamlessBlend} min={0.02} max={0.4} step={0.01} onChange={v => updateStage('albedo', { seamlessBlend: v })} />}
                  </div>
                )}
              </div>

              {/* Normal */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Mountain size={12} />} title="Normal Map" subtitle="Sobel/Prewitt/Scharr gradient extraction"
                  enabled={pipeline.normal.enabled} expanded={expandedStages.has('normal')}
                  onToggleEnabled={() => toggleStageEnabled('normal')} onToggleExpanded={() => toggleStageExpand('normal')} />
                {expandedStages.has('normal') && pipeline.normal.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-36">Extraction method</span>
                      <select value={pipeline.normal.method} onChange={e => updateStage('normal', { method: e.target.value as NormalMethod })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500">
                        <option value="sobel">Sobel (standard)</option>
                        <option value="prewitt">Prewitt (softer)</option>
                        <option value="scharr">Scharr (sharpest)</option>
                      </select>
                    </div>
                    <Slider label="Normal strength" value={pipeline.normal.strength} min={0.1} max={5} step={0.1} onChange={v => updateStage('normal', { strength: v })} />
                    <Slider label="Pre-blur (smoothing)" value={pipeline.normal.smoothing} min={0} max={3} step={0.1} onChange={v => updateStage('normal', { smoothing: v })} />
                    <ToggleRow label="Inject fine cavity detail" checked={pipeline.normal.fineDetail} onChange={v => updateStage('normal', { fineDetail: v })} />
                    <ToggleRow label="Invert Y (OpenGL mode)" checked={pipeline.normal.invertY} onChange={v => updateStage('normal', { invertY: v })} />
                    <p className="text-xs text-slate-600">FO4 uses DirectX normals — keep Invert Y off.</p>
                  </div>
                )}
              </div>

              {/* Roughness */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Droplets size={12} />} title="Roughness Map" subtitle="Luminance-driven micro-surface roughness"
                  enabled={pipeline.roughness.enabled} expanded={expandedStages.has('roughness')}
                  onToggleEnabled={() => toggleStageEnabled('roughness')} onToggleExpanded={() => toggleStageExpand('roughness')} />
                {expandedStages.has('roughness') && pipeline.roughness.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <Slider label="Base roughness" value={pipeline.roughness.base} min={0} max={1} step={0.01} onChange={v => updateStage('roughness', { base: v })} />
                    <Slider label="Luminance influence" value={pipeline.roughness.luminanceInfluence} min={0} max={1} step={0.01} onChange={v => updateStage('roughness', { luminanceInfluence: v })} />
                    <Slider label="Micro-variation" value={pipeline.roughness.variation} min={0} max={0.5} step={0.01} onChange={v => updateStage('roughness', { variation: v })} />
                    <ToggleRow label="Invert (bright = smooth)" checked={pipeline.roughness.invert} onChange={v => updateStage('roughness', { invert: v })} />
                  </div>
                )}
              </div>

              {/* Metallic */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Zap size={12} />} title="Metallic Map" subtitle="Hue-detect or manual metalness"
                  enabled={pipeline.metallic.enabled} expanded={expandedStages.has('metallic')}
                  onToggleEnabled={() => toggleStageEnabled('metallic')} onToggleExpanded={() => toggleStageExpand('metallic')} />
                {expandedStages.has('metallic') && pipeline.metallic.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-36">Detection mode</span>
                      <select value={pipeline.metallic.mode} onChange={e => updateStage('metallic', { mode: e.target.value as any })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500">
                        <option value="zero">Zero (non-metal surface)</option>
                        <option value="manual">Manual value</option>
                        <option value="hue_detect">Auto hue-detect</option>
                      </select>
                    </div>
                    {pipeline.metallic.mode !== 'zero' && (
                      <Slider label="Base metallic" value={pipeline.metallic.base} min={0} max={1} step={0.01} onChange={v => updateStage('metallic', { base: v })} />
                    )}
                    {pipeline.metallic.mode === 'hue_detect' && (
                      <Slider label="Saturation threshold" value={pipeline.metallic.threshold} min={0.1} max={0.9} step={0.01} onChange={v => updateStage('metallic', { threshold: v })} />
                    )}
                  </div>
                )}
              </div>

              {/* Specular */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Flame size={12} />} title="Specular Map" subtitle="RGB tint + alpha gloss — FO4's primary shine slot"
                  enabled={pipeline.specular.enabled} expanded={expandedStages.has('specular')}
                  onToggleEnabled={() => toggleStageEnabled('specular')} onToggleExpanded={() => toggleStageExpand('specular')} />
                {expandedStages.has('specular') && pipeline.specular.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <Slider label="Specular intensity" value={pipeline.specular.intensity} min={0} max={1} step={0.01} onChange={v => updateStage('specular', { intensity: v })} />
                    <Slider label="Gloss (min)" value={pipeline.specular.glossMin} min={0} max={1} step={0.01} onChange={v => updateStage('specular', { glossMin: v })} />
                    <Slider label="Gloss (max)" value={pipeline.specular.glossMax} min={0} max={1} step={0.01} onChange={v => updateStage('specular', { glossMax: v })} />
                    <p className="text-xs text-slate-600">FO4's vanilla shader reads this texture for both specular color and smoothness — required for a complete material.</p>
                  </div>
                )}
              </div>

              {/* AO */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Cpu size={12} />} title="Ambient Occlusion" subtitle="Normal-derived SSAO estimate"
                  enabled={pipeline.ao.enabled} expanded={expandedStages.has('ao')}
                  onToggleEnabled={() => toggleStageEnabled('ao')} onToggleExpanded={() => toggleStageExpand('ao')} />
                {expandedStages.has('ao') && pipeline.ao.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-36">Quality</span>
                      <select value={pipeline.ao.quality} onChange={e => updateStage('ao', { quality: e.target.value as any })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500">
                        <option value="low">Low (fast)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (slow)</option>
                      </select>
                    </div>
                    <Slider label="Radius (px)" value={pipeline.ao.radius} min={1} max={32} step={1} onChange={v => updateStage('ao', { radius: v })} fmt={v => String(Math.round(v))} />
                    <Slider label="Strength" value={pipeline.ao.strength} min={0} max={2} step={0.05} onChange={v => updateStage('ao', { strength: v })} />
                    <Slider label="Bias (self-shadow)" value={pipeline.ao.bias} min={0} max={0.2} step={0.005} onChange={v => updateStage('ao', { bias: v })} />
                  </div>
                )}
              </div>

              {/* Cavity */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Settings size={12} />} title="Cavity Map" subtitle="Fine-crevice detail from high-freq normals"
                  enabled={pipeline.cavity.enabled} expanded={expandedStages.has('cavity')}
                  onToggleEnabled={() => toggleStageEnabled('cavity')} onToggleExpanded={() => toggleStageExpand('cavity')} />
                {expandedStages.has('cavity') && pipeline.cavity.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <Slider label="Radius (px)" value={pipeline.cavity.radius} min={1} max={8} step={1} onChange={v => updateStage('cavity', { radius: v })} fmt={v => String(Math.round(v))} />
                    <Slider label="Strength" value={pipeline.cavity.strength} min={0} max={2} step={0.05} onChange={v => updateStage('cavity', { strength: v })} />
                  </div>
                )}
              </div>

              {/* Height */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <StageHeader icon={<Mountain size={12} />} title="Height / Parallax" subtitle="Luminance → BC4 displacement for FO4 POM"
                  enabled={pipeline.height.enabled} expanded={expandedStages.has('height')}
                  onToggleEnabled={() => toggleStageEnabled('height')} onToggleExpanded={() => toggleStageExpand('height')} />
                {expandedStages.has('height') && pipeline.height.enabled && (
                  <div className="pt-2 space-y-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-36">Source channel</span>
                      <select value={pipeline.height.source} onChange={e => updateStage('height', { source: e.target.value as any })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500">
                        <option value="luminance">Luminance (recommended)</option>
                        <option value="inverse_luminance">Inverse luminance</option>
                        <option value="red_channel">Red channel only</option>
                      </select>
                    </div>
                    <Slider label="POM depth scale" value={pipeline.height.scale} min={1} max={20} step={0.5} onChange={v => updateStage('height', { scale: v })} />
                    <Slider label="POM bias" value={pipeline.height.bias} min={-1} max={0} step={0.05} onChange={v => updateStage('height', { bias: v })} />
                    <p className="text-xs text-slate-600">Output saved as BC4 (_h.dds). Requires ENB or Community Shaders.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run button */}
          <div className="flex-shrink-0 p-3 border-t border-slate-700/60">
            <button
              onClick={runEnhancement}
              disabled={running || (mode === 'single' ? !inputFile : !batchFolder)}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? 'Enhancing…' : 'Run Enhancement Pipeline'}
            </button>
          </div>
        </div>

        {/* ── Right panel: jobs / info ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Info bar */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-slate-700/60 bg-slate-800/50 flex items-center gap-3">
            <Info size={12} className="text-slate-500 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Outputs: <span className="text-slate-400">_d (Albedo)</span> · <span className="text-slate-400">_n (Normal BC5)</span> · <span className="text-slate-400">_s (Specular)</span> · <span className="text-slate-400">_rough/_metal (PBR aux)</span> · <span className="text-slate-400">_ao (AO BC4)</span> · <span className="text-slate-400">_h (Height BC4)</span>
            </p>
          </div>

          {/* Jobs list */}
          <div className="flex-1 overflow-y-auto p-4">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                <Layers size={32} className="text-slate-600" />
                <div>
                  <p className="text-sm text-slate-400">No jobs yet</p>
                  <p className="text-xs text-slate-600 mt-1">Pick a texture and run the pipeline to extract<br />photo-realistic PBR maps for Fallout 4.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => <JobCard key={job.id} job={job} onRate={handleRateJob} />)}
              </div>
            )}
          </div>

          {/* Map guide */}
          <div className="flex-shrink-0 border-t border-slate-700/60 bg-slate-800/30 p-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">FO4 Output Format Guide</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { map: 'Albedo (diffuse)', fmt: 'BC1/BC3', note: 'Opaque / Alpha' },
                { map: 'Normal', fmt: 'BC5',     note: 'DX convention' },
                { map: 'Specular', fmt: 'BC7',  note: 'RGB tint + gloss alpha' },
                { map: 'Roughness', fmt: 'BC7',  note: 'PBR mode only' },
                { map: 'Metallic', fmt: 'BC7',   note: 'PBR mode only' },
                { map: 'AO', fmt: 'BC4',        note: 'Single channel' },
                { map: 'Height', fmt: 'BC4',     note: 'POM parallax' },
              ].map(({ map, fmt, note }) => (
                <div key={map} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
                  <p className="text-xs font-medium text-slate-300">{map}</p>
                  <p className="text-xs text-green-400">{fmt}</p>
                  <p className="text-xs text-slate-600">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
