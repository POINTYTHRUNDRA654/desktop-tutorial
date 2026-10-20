import { describe, it, expect } from 'vitest';
import {
  dHashFromGray, hashDistance, rgbaToGray, shouldSkipUnchanged, nextFailureState,
  MAX_SKIP_MS, MAX_CONSECUTIVE_FAILURES, FAILURE_PAUSE_MS,
} from '../screenFilter';

const flat = (v: number) => Array(72).fill(v);
const ramp = Array.from({ length: 72 }, (_, i) => 255 - (i % 9) * 20);

describe('screenFilter', () => {
  it('hashes to 64 bits', () => {
    expect(dHashFromGray(ramp)).toHaveLength(64);
    expect(dHashFromGray(flat(100))).toBe('0'.repeat(64));
  });
  it('rejects a wrong-sized grid', () => {
    expect(() => dHashFromGray([1, 2, 3])).toThrow();
  });
  it('measures distance', () => {
    expect(hashDistance('0000', '0110')).toBe(2);
    expect(hashDistance('00', '000')).toBe(Number.POSITIVE_INFINITY);
  });
  it('converts rgba to gray', () => {
    expect(rgbaToGray([255, 255, 255, 255, 0, 0, 0, 255]).map(Math.round)).toEqual([255, 0]);
  });
  it('skips an unchanged screen but not a changed or stale one', () => {
    const h = dHashFromGray(ramp);
    const last = { hash: h, at: 1000 };
    expect(shouldSkipUnchanged(last, h, 2000)).toBe(true);
    expect(shouldSkipUnchanged(last, '0'.repeat(64), 2000)).toBe(false);
    expect(shouldSkipUnchanged(last, h, 1000 + MAX_SKIP_MS)).toBe(false);
    expect(shouldSkipUnchanged(undefined, h, 2000)).toBe(false);
    expect(shouldSkipUnchanged(last, null, 2000)).toBe(false);
  });
  it('pauses after repeated failures and resets on success', () => {
    let s = { failures: 0, pausedUntil: 0 };
    for (let i = 0; i < MAX_CONSECUTIVE_FAILURES - 1; i++) {
      const n = nextFailureState(s, false, 5000);
      expect(n.justPaused).toBe(false);
      s = n;
    }
    const p = nextFailureState(s, false, 5000);
    expect(p.justPaused).toBe(true);
    expect(p.pausedUntil).toBe(5000 + FAILURE_PAUSE_MS);
    expect(nextFailureState(p, true, 6000)).toEqual({ failures: 0, pausedUntil: 0, justPaused: false });
  });
});
