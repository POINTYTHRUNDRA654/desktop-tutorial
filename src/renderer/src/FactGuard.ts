/**
 * FactGuard — a deterministic, non-LLM safety net for a small list of
 * specific facts Mossy has been observed to get wrong LIVE despite having
 * the correct fact stated plainly, multiple times, in her own system
 * prompt (MossyBrain.ts) and knowledge base (FO4KnowledgeBase.ts).
 *
 * Why this exists: prompt-content grounding does not reliably prevent this
 * class of error. The 254-plugin-cap fact is correct in at least four
 * separate places in MossyBrain.ts (see lines ~865, ~9651-9664, ~13147)
 * and Mossy still answered live with a fabricated "255 total plugins...
 * dedicated ESL slot (0xFF)" — a wrong derived number even though the
 * source fact was right in front of her. The Archive2.exe CLI-fabrication
 * bugs (see the "NEVER FABRICATE EXACT COMMAND-LINE SYNTAX" block in
 * MossyBrain.ts) taught the same lesson: a stronger, more prominent, more
 * emphatic restatement of a correct fact is not a *guaranteed* fix for an
 * LLM that can still drift off it in the moment. This module is the
 * deterministic backstop for facts specific enough to detect and correct
 * with plain pattern matching, applied to every response right before it
 * reaches the user — covering both text chat and voice from one place,
 * since both funnel through LocalAIEngine.generateResponse.
 *
 * Deliberately NOT a second LLM call: a "have another model check the
 * first model's work" pass just moves the drift risk one level down
 * (now you have to trust the checker not to hallucinate too) and doubles
 * latency/cost on every turn. Plain regex against a short, hand-verified
 * fact registry is slower to extend but cannot itself hallucinate.
 *
 * Scope discipline: this is NOT a general fact-checking engine and isn't
 * meant to become one. Add an entry here only for a fact that has been
 * OBSERVED wrong in a live response, verified correct against an
 * authoritative source, and is specific enough to detect with a narrow
 * regex without false-positiving on unrelated correct text. A vague
 * "make sure everything Mossy says is true" ask does not belong here —
 * see the module docstring in MossyBrain.ts for the general instruction-
 * level guardrails; this file is the last-resort net under it.
 */

export interface FactGuardEntry {
  /** Short id, used in diagnostics/logs. */
  id: string;
  /** Human-readable description for logs/debugging. */
  description: string;
  /** Must match somewhere in the response for this entry to even be
   *  considered — scopes the check to the relevant topic so a bare
   *  number match elsewhere in an unrelated answer never triggers it. */
  topicPattern: RegExp;
  /** If this ALSO matches, the response contains the known-wrong claim. */
  wrongPattern: RegExp;
  /** Replaces the ENTIRE response when triggered — not a find/replace
   *  patch on the offending sentence. Patching a sentence inside a
   *  natural-language paragraph is itself an easy way to leave the
   *  surrounding text contradicting the patched part (wrong math,
   *  dangling "as shown above" references, etc.); a full, short,
   *  pre-written, always-correct paragraph has no such failure mode. */
  correctedResponse: string;
}

const FACT_REGISTRY: FactGuardEntry[] = [
  {
    id: 'fo4-plugin-cap-254',
    description:
      'Observed live 2026-08-27: Mossy answered "255 total plugins - 254 regular (0x01-0xFE) plus one dedicated ESL slot (0xFF)" - wrong on three counts (255 vs 254, the range starts at 0x00 not 0x01, and 0xFF is not the ESL indicator - 0xFE is). Correct fact confirmed against MossyBrain.ts lines ~865, ~9651-9664, ~13147, all consistent.',
    topicPattern: /plugin|\besp\b|\besm\b|load order/i,
    wrongPattern: /255\s*(total\s*)?plugins?|0x01\s*[-–]\s*0xFE|\(0xFF\)\s*(is|as)?\s*(the\s*)?(dedicated\s*)?ESL|ESL[^.]{0,40}0xFF|0xFF[^.]{0,40}ESL/i,
    correctedResponse:
      "Fallout 4 can load a maximum of **254 regular ESP/ESM plugins** (load-order slots 0x00-0xFD). Slot 0xFE is reserved as the ESL/light-plugin indicator, not a 255th regular slot - ESL-flagged plugins don't count against the 254 limit at all, they share a separate FormID range (0x800-0xFFF, up to 2,048 new records each) instead. Fallout4.esm plus the official DLCs already use 7 of those 254 slots, so a heavily-modded load order can hit this ceiling faster than it looks. If you're bumping up against it, ESL-flagging small patches (mods with few new records) is the usual fix - not deleting mods you want to keep.",
  },
];

export interface FactGuardResult {
  content: string;
  corrected: boolean;
  correctedFactId?: string;
}

/**
 * Runs the fact registry against a finished response and returns either
 * the original content unchanged, or a full replacement when a known-wrong
 * claim was detected. Pure and synchronous - safe to call on every turn
 * with no latency or network cost.
 */
export function guardKnownFacts(content: string): FactGuardResult {
  if (!content) {
    return { content, corrected: false };
  }
  for (const entry of FACT_REGISTRY) {
    if (entry.topicPattern.test(content) && entry.wrongPattern.test(content)) {
      console.warn(
        `[FactGuard] Intercepted known-wrong fact "${entry.id}" (${entry.description}). Replacing with the verified-correct answer.`,
      );
      return { content: entry.correctedResponse, corrected: true, correctedFactId: entry.id };
    }
  }
  return { content, corrected: false };
}
