/**
 * Regression coverage for FactGuard.ts -- the deterministic last-resort
 * correction layer for specific facts Mossy has been observed to get wrong
 * live despite having the correct fact stated plainly elsewhere in her own
 * prompt. See FactGuard.ts's module docstring for the full rationale.
 *
 * This file exists so the registry can grow safely: every entry needs
 * evidence here that it (a) actually catches the known-wrong text it was
 * added for, and (b) does not false-positive on ordinary correct answers
 * covering the same topic. Without (b), FactGuard becomes exactly the kind
 * of silent-regression risk it was built to guard against elsewhere in the
 * codebase.
 */

import { describe, it, expect } from 'vitest';
import { guardKnownFacts } from '../FactGuard';

describe('guardKnownFacts', () => {
  it('passes through empty/falsy content unchanged', () => {
    expect(guardKnownFacts('')).toEqual({ content: '', corrected: false });
  });

  it('leaves unrelated content (no topic match) untouched', () => {
    const content = 'Fallout 4 was released in November 2015.';
    const result = guardKnownFacts(content);
    expect(result.corrected).toBe(false);
    expect(result.content).toBe(content);
  });

  describe('fo4-plugin-cap-254', () => {
    it('intercepts the exact live-observed wrong answer', () => {
      const wrong = 'Fallout 4 supports 255 total plugins - 254 regular (0x01-0xFE) plus one dedicated ESL slot (0xFF).';
      const result = guardKnownFacts(wrong);
      expect(result.corrected).toBe(true);
      expect(result.correctedFactId).toBe('fo4-plugin-cap-254');
      expect(result.content).toContain('254 regular ESP/ESM plugins');
      expect(result.content).not.toBe(wrong);
    });

    it('does NOT false-positive on a correct plugin-cap answer', () => {
      const correct = 'Fallout 4 can load a maximum of 254 regular ESP/ESM plugins (load-order slots 0x00-0xFD). '
        + 'Slot 0xFE is reserved as the ESL/light-plugin indicator. ESL-flagged plugins do not count against the 254 limit.';
      const result = guardKnownFacts(correct);
      expect(result.corrected).toBe(false);
      expect(result.content).toBe(correct);
    });

    it('does NOT false-positive on unrelated text that happens to contain the number 255', () => {
      const unrelated = 'The mod adds 255 new leveled-list entries and touches no plugin-cap-related systems.';
      const result = guardKnownFacts(unrelated);
      expect(result.corrected).toBe(false);
      expect(result.content).toBe(unrelated);
    });

    it('does NOT trigger on load-order text that never states the wrong number', () => {
      const safe = 'Check your load order in LOOT to make sure your ESP loads after its masters.';
      const result = guardKnownFacts(safe);
      expect(result.corrected).toBe(false);
      expect(result.content).toBe(safe);
    });
  });
});
