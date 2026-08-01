/**
 * Texture Enhancer — feedback-driven learning store.
 *
 * Real, persistent, statistics-based auto-tuning: every time a user marks an
 * enhancement job "kept" or "discarded" (optionally with a 1-5 star rating),
 * the exact numeric pipeline settings used for that job are folded into a
 * running per-surface weighted average. Future runs of the same surface
 * preset in the renderer blend that learned average into the hand-authored
 * baseline defaults, so results measurably drift toward what the user
 * actually keeps over repeated use — not a cosmetic log, an actual feedback
 * loop over the pipeline's own tunable numbers.
 *
 * Persisted to disk (userData/texture-enhancer-learning.json) rather than
 * localStorage so it survives across renderer reloads/reinstalls and is
 * readable/writable from the main process where the enhance handler lives.
 */
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// Only a focused set of numeric knobs are learned — the ones that most
// directly drive perceived output quality. Learning every field would overfit
// on sparse per-surface sample counts and drift settings nobody was actually
// reacting to (e.g. AO radius rarely changes what a user notices).
export const LEARNABLE_PARAMS: Array<{ key: string; stage: string; field: string; min: number; max: number }> = [
  { key: 'normal.strength',      stage: 'normal',    field: 'strength',  min: 0.1, max: 5 },
  { key: 'normal.smoothing',     stage: 'normal',    field: 'smoothing', min: 0,   max: 3 },
  { key: 'specular.intensity',   stage: 'specular',  field: 'intensity', min: 0,   max: 1 },
  { key: 'specular.glossMin',    stage: 'specular',  field: 'glossMin',  min: 0,   max: 1 },
  { key: 'specular.glossMax',    stage: 'specular',  field: 'glossMax',  min: 0,   max: 1 },
  { key: 'roughness.base',       stage: 'roughness', field: 'base',      min: 0,   max: 1 },
];

// A parameter needs at least this much accumulated positive weight before its
// learned average is trusted enough to nudge the baseline at all.
const MIN_WEIGHT_TO_APPLY = 4;
// Rating a "kept" job with no explicit star rating gets — mild positive
// reinforcement, weaker than an explicit 4-5 star rating.
const DEFAULT_KEPT_WEIGHT = 3;

interface ParamAccumulator {
  sum: number;
  weight: number;
}

interface SurfaceRecord {
  totalSamples: number;
  keptSamples: number;
  discardedSamples: number;
  params: Record<string, ParamAccumulator>;
  recentJobs: Array<{ timestamp: string; outcome: 'kept' | 'discarded'; rating?: number }>;
}

interface LearningStore {
  surfaces: Record<string, SurfaceRecord>;
}

export interface RecordOutcomeInput {
  surface: string;
  pipeline: Record<string, any>;
  outcome: 'kept' | 'discarded';
  rating?: number;
}

export interface LearnedSurfaceStats {
  totalSamples: number;
  keptSamples: number;
  discardedSamples: number;
  params: Record<string, { average: number; weight: number }>;
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'texture-enhancer-learning.json');
}

function loadStore(): LearningStore {
  try {
    const file = getStorePath();
    if (!fs.existsSync(file)) return { surfaces: {} };
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.surfaces ? parsed : { surfaces: {} };
  } catch (e) {
    console.error('[TextureEnhancerLearning] Failed to load store:', e);
    return { surfaces: {} };
  }
}

function saveStore(store: LearningStore): void {
  fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

function getAtPath(obj: Record<string, any>, stage: string, field: string): number | undefined {
  const v = obj?.[stage]?.[field];
  return typeof v === 'number' && isFinite(v) ? v : undefined;
}

/** Records a job's outcome and folds its pipeline settings into the surface's running averages. */
export function recordOutcome(input: RecordOutcomeInput): void {
  const store = loadStore();
  const surface = store.surfaces[input.surface] || {
    totalSamples: 0,
    keptSamples: 0,
    discardedSamples: 0,
    params: {},
    recentJobs: [],
  };

  surface.totalSamples++;
  if (input.outcome === 'kept') surface.keptSamples++;
  else surface.discardedSamples++;

  surface.recentJobs.push({
    timestamp: new Date().toISOString(),
    outcome: input.outcome,
    rating: input.rating,
  });
  // Cap history — only needed for visibility/debugging, not for the running averages.
  if (surface.recentJobs.length > 50) surface.recentJobs = surface.recentJobs.slice(-50);

  // Only positive outcomes pull the average — a discarded job tells us this
  // value wasn't right, but not what a better one would be, so it shouldn't
  // bias the target average. It's still counted above for honest stats.
  if (input.outcome === 'kept') {
    const weight = input.rating && input.rating >= 1 && input.rating <= 5 ? input.rating : DEFAULT_KEPT_WEIGHT;
    for (const param of LEARNABLE_PARAMS) {
      const value = getAtPath(input.pipeline, param.stage, param.field);
      if (value === undefined) continue;
      const acc = surface.params[param.key] || { sum: 0, weight: 0 };
      acc.sum += value * weight;
      acc.weight += weight;
      surface.params[param.key] = acc;
    }
  }

  store.surfaces[input.surface] = surface;
  saveStore(store);
}

/** Returns the current learned stats for every surface that has any recorded jobs. */
export function getLearnedStats(): Record<string, LearnedSurfaceStats> {
  const store = loadStore();
  const result: Record<string, LearnedSurfaceStats> = {};
  for (const [surface, rec] of Object.entries(store.surfaces)) {
    const params: Record<string, { average: number; weight: number }> = {};
    for (const [key, acc] of Object.entries(rec.params)) {
      if (acc.weight >= MIN_WEIGHT_TO_APPLY) {
        params[key] = { average: acc.sum / acc.weight, weight: acc.weight };
      }
    }
    result[surface] = {
      totalSamples: rec.totalSamples,
      keptSamples: rec.keptSamples,
      discardedSamples: rec.discardedSamples,
      params,
    };
  }
  return result;
}

/** Clears learning data — for one surface, or every surface if none is given. */
export function resetLearning(surface?: string): void {
  const store = loadStore();
  if (surface) {
    delete store.surfaces[surface];
  } else {
    store.surfaces = {};
  }
  saveStore(store);
}
