/**
 * Regression tests for FO4KnowledgeBase's relevance-filtered knowledge
 * injection (src/shared/FO4KnowledgeBase.ts).
 *
 * Reliability sweep (2026-09-01): formatFO4KnowledgeBaseForAI() serializes
 * the ENTIRE ~85-section, 280K+ character knowledge base unconditionally,
 * and was called on every single chat turn (ChatInterface.tsx,
 * AIModAssistant.tsx) regardless of what was actually asked -- the single
 * largest contributor to the system prompt's routine 600K-746K character
 * size (see messageBudget.ts's docstring for the memory-loss bug that
 * oversized prompt caused). formatRelevantFO4KnowledgeBaseForAI() replaces
 * that unconditional dump with the same keyword-ranking approach
 * knowledgeRetrieval.ts's Knowledge Vault functions already use. These
 * tests exist so that relevance-filtering behavior -- and the size
 * reduction it exists for -- can't silently regress back into an
 * unconditional full dump.
 */
import { describe, it, expect } from 'vitest';
import { formatFO4KnowledgeBaseForAI, formatRelevantFO4KnowledgeBaseForAI } from '../FO4KnowledgeBase';

describe('formatRelevantFO4KnowledgeBaseForAI', () => {
  const fullSize = formatFO4KnowledgeBaseForAI().length;

  it('the full unconditional dump really is large (sanity check the premise this function fixes)', () => {
    expect(fullSize).toBeGreaterThan(250_000);
  });

  it('a topic-specific query pulls in the matching section and stays well under the full dump size', () => {
    const result = formatRelevantFO4KnowledgeBaseForAI('How do I do voice acting and lip sync for my NPC dialogue?');
    expect(result.length).toBeLessThan(fullSize * 0.5);
    expect(result).toMatch(/lip.?sync|voiceAndLipSync/i);
  });

  it('always includes the critical community policy section regardless of topic', () => {
    const result = formatRelevantFO4KnowledgeBaseForAI('How do I do voice acting and lip sync for my NPC dialogue?');
    expect(result).toMatch(/simSettlements2NoAiContent|criticalCommunityPolicies/i);
  });

  it('a vague/generic query falls back to a small default baseline instead of returning nothing or everything', () => {
    const result = formatRelevantFO4KnowledgeBaseForAI('hi');
    expect(result.length).toBeGreaterThan(500);
    expect(result.length).toBeLessThan(fullSize * 0.3);
    expect(result).toMatch(/Scriptname/i);
  });

  it('respects an explicit maxChars cap and marks the result as truncated', () => {
    const capped = formatRelevantFO4KnowledgeBaseForAI(
      'animation mesh voice papyrus terminal power armor quest perk',
      { maxChars: 2000 },
    );
    expect(capped.length).toBeLessThan(3200); // cap plus banner/truncation-note overhead
    expect(capped).toMatch(/truncated/i);
  });

  it('a different topic query pulls a different section than the voice-acting query', () => {
    const animResult = formatRelevantFO4KnowledgeBaseForAI('Walk me through the HKX animation pipeline for a custom character animation.');
    expect(animResult).toMatch(/animation/i);
  });
});
