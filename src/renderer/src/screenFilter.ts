// Screen Awareness local filter (step 1a): skip screenshots that have not
// really changed since the last successful pass. Runs fully on this computer,
// no AI call, no network. The pure functions are unit tested; only
// computeDHash needs a browser canvas.

export const HASH_W = 9;
export const HASH_H = 8;
/** Out of 64 bits. At or below this the screen counts as "the same". */
export const UNCHANGED_MAX_DISTANCE = 3;
/** Even an unchanged screen is looked at again after this long. */
export const MAX_SKIP_MS = 10 * 60 * 1000;
/** After this many failed passes in a row, stop trying for a while. */
export const MAX_CONSECUTIVE_FAILURES = 3;
export const FAILURE_PAUSE_MS = 10 * 60 * 1000;

/** Difference hash from a 9x8 grayscale grid (72 values) -> 64-char bit string. */
export function dHashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== HASH_W * HASH_H) throw new Error(`dHashFromGray needs ${HASH_W * HASH_H} values`);
  let bits = '';
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      bits += gray[y * HASH_W + x] > gray[y * HASH_W + x + 1] ? '1' : '0';
    }
  }
  return bits;
}

/** Number of differing bits. Different lengths are never "the same". */
export function hashDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function rgbaToGray(rgba: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    out.push(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return out;
}

export interface LastPass { hash: string; at: number }

/** True when this screenshot can be skipped because nothing meaningful changed. */
export function shouldSkipUnchanged(last: LastPass | undefined, hash: string | null, now: number): boolean {
  if (!last || !hash) return false;
  if (now - last.at >= MAX_SKIP_MS) return false;
  return hashDistance(last.hash, hash) <= UNCHANGED_MAX_DISTANCE;
}

/** Tracks failures so a missing vision model does not spam the log every capture. */
export function nextFailureState(
  state: { failures: number; pausedUntil: number },
  ok: boolean,
  now: number,
): { failures: number; pausedUntil: number; justPaused: boolean } {
  if (ok) return { failures: 0, pausedUntil: 0, justPaused: false };
  const failures = state.failures + 1;
  if (failures >= MAX_CONSECUTIVE_FAILURES) {
    return { failures: 0, pausedUntil: now + FAILURE_PAUSE_MS, justPaused: true };
  }
  return { failures, pausedUntil: state.pausedUntil, justPaused: false };
}

/** Browser only: shrink the screenshot to 9x8 grayscale and hash it. Null on any problem. */
export async function computeDHash(dataUrl: string): Promise<string | null> {
  try {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = HASH_W;
    canvas.height = HASH_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, HASH_W, HASH_H);
    return dHashFromGray(rgbaToGray(ctx.getImageData(0, 0, HASH_W, HASH_H).data));
  } catch {
    return null;
  }
}
