import { describe, it, expect } from 'vitest';
import { sanitizeForSpeech } from './sanitizeForSpeech';

describe('sanitizeForSpeech', () => {
  it('replaces fenced code blocks with a spoken placeholder', () => {
    const input = 'Here:\n```papyrus\nFunction GetLinkedRef(Keyword akKeyword) native\n```\nThat is it.';
    const out = sanitizeForSpeech(input);
    expect(out).not.toContain('```');
    expect(out).not.toContain('Function GetLinkedRef');
    expect(out).toContain('Code is shown on screen');
  });

  it('strips backticks from inline code but keeps the content', () => {
    expect(sanitizeForSpeech('Use `GetLinkedRef()` to find it.')).toBe('Use GetLinkedRef() to find it.');
  });

  it('replaces URLs with a speakable placeholder', () => {
    const out = sanitizeForSpeech('See https://falloutck.uesp.net/wiki/GetLinkedRef for details.');
    expect(out).not.toContain('http');
    expect(out).toContain('a link');
  });

  it('replaces Windows file paths with a speakable placeholder', () => {
    const out = sanitizeForSpeech('The file is at C:\\Users\\Owner\\AppData\\Roaming\\mossy-desktop\\game-scan-cache\\fo4_papyrus_api.json');
    expect(out).not.toContain('AppData');
    expect(out).toContain('a file path');
  });

  it('strips markdown emphasis markers without removing the words', () => {
    expect(sanitizeForSpeech('This is **really** important, and *also* noteworthy.'))
      .toBe('This is really important, and also noteworthy.');
  });

  it('collapses repeated punctuation to a single mark', () => {
    const out = sanitizeForSpeech('Wait... are you sure?? That seems odd!!');
    expect(out).not.toMatch(/([.!?])\1/);
  });

  it('preserves hyphens inside words', () => {
    expect(sanitizeForSpeech('Well-known modders often use this pattern.'))
      .toBe('Well-known modders often use this pattern.');
  });

  it('leaves plain prose with normal punctuation untouched', () => {
    const input = 'A normal sentence with one period. And another, with a comma.';
    expect(sanitizeForSpeech(input)).toBe(input);
  });

  it('converts a code arrow to a speakable word', () => {
    expect(sanitizeForSpeech('Input -> Output')).toContain(' to ');
  });

  it('handles empty and null-ish input without throwing', () => {
    expect(sanitizeForSpeech('')).toBe('');
    expect(sanitizeForSpeech(undefined as unknown as string)).toBe('');
  });

  it('strips the exact em-dash/ellipsis sentence used in the 2026-08-24 Piper evaluation', () => {
    // Same sentence fed directly to Piper during that evaluation to confirm
    // Piper's own phonemizer doesn't error on unsanitized Unicode punctuation
    // — confirming the bug is a sanitization gap, not TTS-engine-specific.
    // This is that same gap, now closed upstream of any engine.
    const input = 'This is the fix — not a workaround — for the "real" bug… confirmed.';
    const out = sanitizeForSpeech(input);
    expect(out).not.toContain('—');
    expect(out).not.toContain('…');
    expect(out).toBe('This is the fix not a workaround for the "real" bug. confirmed.');
  });

  it('converts curly quotes to straight ASCII equivalents', () => {
    const out = sanitizeForSpeech('She said ‘this is odd’ and then “very odd” indeed.');
    expect(out).not.toMatch(/[‘’“”]/);
    expect(out).toBe("She said 'this is odd' and then \"very odd\" indeed.");
  });

  it('converts en dashes to spaces like em dashes', () => {
    const out = sanitizeForSpeech('Pages 10–20 cover it.');
    expect(out).not.toContain('–');
  });
});
