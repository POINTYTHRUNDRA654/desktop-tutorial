// Screen Awareness (Phase 2 "Seeing") — first-slice scope: Blender only.
//
// Real, end-to-end loop: BridgeServer.ts's startScreenAwareness() watcher
// (main process) polls the real OS foreground window every 5s and, only
// when it matches the watched program, takes a real screenshot and sends it
// to the renderer via the 'screen-awareness:capture' IPC event. This module
// owns everything downstream of that event: fetch the program's known
// mistake patterns from Brain B (change_gate.py), run a real vision-model
// recognition pass, and act on the verdict.
//
// Two real outcomes, matching the task spec exactly:
//   - Matched a known pattern -> speak the correction through the existing
//     voice pipeline (LiveContext.tsx's speakSystemMessage).
//   - Didn't match anything -> propose it through ChangeGate
//     (brain-b/change_gate.py's propose_change, exposed at
//     POST /change-gate/propose) rather than silently trusting an
//     unreviewed vision-model observation as real.
//
// Deliberately NOT included in this first slice, named plainly rather than
// silently dropped: "recent tool calls" context (the task spec's third
// context input). Wiring that through would mean exposing more of
// LiveContext's internal turn history to this module, which is real added
// surface for a first slice whose actual job is proving capture ->
// recognition -> (speak | propose) works at all. Add it once that loop is
// confirmed working, not before.
//
// Every pass (matched, unmatched, or a failure at any step) logs into the
// same on-disk diagnostics log every other trace this session uses (see
// WRITE_DIAGNOSTIC_LOG's comment in main.ts) under a [screen-awareness] tag.

import { LocalAIEngine } from './LocalAIEngine';

interface KnownPattern {
  id: string;
  whatToLookFor: string;
  correction: string;
  severity?: string;
}

interface RecognitionVerdict {
  matched: boolean;
  patternId?: string;
  observation: string;
  correction?: string;
  confidence?: number;
}

// Proposal quality bar (2026-09-27). The first version proposed EVERY
// non-empty observation, which flooded the review queue with 100+ items in
// one texturing session: the same "plant renders magenta in NifSkope" note
// dozens of times, normal in-progress states reported as mistakes, and
// file paths the vision model misread off blurry screenshots. A proposal
// now has to clear all of these before it reaches the queue:
//   - the model must supply a concrete correction (what to do instead),
//   - it must report confidence >= MIN_PROPOSAL_CONFIDENCE,
//   - it must not be a near-duplicate of anything already pending or
//     proposed this session, and
//   - at most one proposal per program per PROPOSAL_COOLDOWN_MS.
const MIN_PROPOSAL_CONFIDENCE = 0.8;
const MIN_CORRECTION_CHARS = 20;
const PROPOSAL_COOLDOWN_MS = 10 * 60 * 1000;
const DUPLICATE_SIMILARITY = 0.4;

const lastProposalAt = new Map<string, number>();
const sessionObservations = new Map<string, string[]>();

const SIMILARITY_STOPWORDS = new Set(('a an the and or of to in on is are be as it its this that which with for ' +
  'from by at into than while even though not no its their there these those may can typically usually ' +
  'indicates indicating suggests suggesting appears shows shown showing').split(' '));

function wordSet(text: string): Set<string> {
  return new Set(String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !SIMILARITY_STOPWORDS.has(w)));
}

function similarity(a: string, b: string): number {
  const A = wordSet(a); const B = wordSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}

async function fetchPendingObservations(program: string): Promise<string[]> {
  try {
    const base = await getBrainBBaseUrl();
    const res = await fetch(`${base}/change-gate/pending?program=${encodeURIComponent(program)}`, {
      headers: await getBrainBAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.pending) ? data.pending.map((p: any) => String(p?.observation || '')) : [];
  } catch {
    return [];
  }
}

/** Returns null when the verdict may be proposed, otherwise the reason it was held back. */
async function proposalBlockedReason(program: string, verdict: RecognitionVerdict): Promise<string | null> {
  if ((verdict.confidence ?? 0) < MIN_PROPOSAL_CONFIDENCE) return `low-confidence (${verdict.confidence ?? 'none'})`;
  if (!verdict.correction || verdict.correction.length < MIN_CORRECTION_CHARS) return 'no-concrete-correction';
  const last = lastProposalAt.get(program) || 0;
  if (Date.now() - last < PROPOSAL_COOLDOWN_MS) return 'cooldown';
  const seen = [...(sessionObservations.get(program) || []), ...(await fetchPendingObservations(program))];
  if (seen.some((o) => similarity(o, verdict.observation) >= DUPLICATE_SIMILARITY)) return 'duplicate';
  return null;
}

function getApi(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

function logScreenAwareness(extra: Record<string, unknown>): void {
  try {
    void getApi()?.writeDiagnosticLog?.(`[screen-awareness] ${JSON.stringify({ timestamp: new Date().toISOString(), ...extra })}`);
  } catch { /* diagnostics-only, non-critical */ }
}

async function getBrainBBaseUrl(): Promise<string> {
  try {
    const settings = await LocalAIEngine.getLocalAiSettings();
    return String((settings as any)?.brainBBaseUrl || 'http://127.0.0.1:8766');
  } catch {
    return 'http://127.0.0.1:8766';
  }
}

/** Real auth (2026-08-22) -- see LocalAIEngine.ts's getBrainBAuthHeaders for
 *  the full rationale. Both of ChangeGate's routes need this now; /health
 *  is the only Brain B route exempt, and this file never calls it. */
async function getBrainBAuthHeaders(): Promise<Record<string, string>> {
  try {
    const conn = await getApi()?.getBridgeConnection?.();
    return conn?.token ? { 'X-Mossy-Token': String(conn.token) } : {};
  } catch {
    return {};
  }
}

async function fetchKnownPatterns(program: string): Promise<KnownPattern[]> {
  try {
    const base = await getBrainBBaseUrl();
    const res = await fetch(`${base}/change-gate/patterns?program=${encodeURIComponent(program)}`, {
      headers: await getBrainBAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.patterns) ? data.patterns : [];
  } catch {
    return [];
  }
}

async function proposeChange(program: string, observation: string, correction: string | null, timestamp: number): Promise<string | null> {
  try {
    const base = await getBrainBBaseUrl();
    const res = await fetch(`${base}/change-gate/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getBrainBAuthHeaders()) },
      body: JSON.stringify({
        program, observation, suggestedCorrection: correction,
        sourceContext: { capturedAt: timestamp },
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    return typeof data?.id === 'string' ? data.id : null;
  } catch {
    return null;
  }
}

/**
 * Real vision recognition pass. Deliberately strict about the response
 * shape: the model must return exactly one JSON object naming either a
 * real known pattern id, or a plain observation string -- no free-form
 * prose gets treated as a verdict, since a vision model's job here is
 * classification against a known reference, not open-ended chat.
 */
async function runRecognitionPass(program: string, dataUrl: string, patterns: KnownPattern[]): Promise<RecognitionVerdict | null> {
  const api = getApi();
  if (!api?.aiVisionGroq) return null;

  const patternsText = patterns.length > 0
    ? patterns.map((p) => `- [${p.id}] ${p.whatToLookFor}`).join('\n')
    : '(no known patterns yet for this program)';

  const systemPrompt =
    'You are Mossy, watching a Fallout 4 modder\'s screen in real time to catch real mistakes. ' +
    'Be conservative: only claim a match if you are genuinely confident it\'s the same real issue, ' +
    'and only report an observation if something is actually notable -- guessing wrong erodes trust. ' +
    'Most screenshots show normal work in progress; for those, report nothing.';
  const textPrompt =
    `Program in focus: ${program}\n\n` +
    `Known mistake patterns for this program (match one of these exact IDs only if what you see genuinely matches):\n${patternsText}\n\n` +
    'Look at this screenshot. Respond with ONLY one JSON object, nothing else:\n' +
    '{"matched": true, "patternId": "<the matching id from the list above>"}\n' +
    'OR\n' +
    '{"matched": false, "observation": "<one plain sentence describing a real mistake you actually see, or an empty string if nothing is wrong>", ' +
    '"correction": "<what the modder should do instead, concretely>", "confidence": <0.0 to 1.0>}\n\n' +
    'Rules for reporting an observation:\n' +
    '- Only report a MISTAKE the modder made that you can name a concrete fix for. If you cannot write the correction, return an empty observation.\n' +
    '- These are NORMAL, not mistakes -- never report them: a mesh rendering solid magenta/pink in NifSkope or another viewer ' +
    '(its preview just cannot find the textures, which live in a Mod Organizer folder); normal or specular maps that look red, ' +
    'red/green or streaky (BC5 textures only have red and green channels); blank or grey 3D viewports while something loads; ' +
    'files being exported or compressed; one-off log lines or popups.\n' +
    '- Never quote file paths, file names or plugin names unless they are sharp and fully legible. Do not guess at blurry text.\n' +
    '- confidence is how sure you are that this is a real mistake, not how sure you are about what is on screen.';

  const result = await api.aiVisionGroq(dataUrl, textPrompt, systemPrompt);
  if (!result?.success || !result.content) return null;

  try {
    const jsonMatch = String(result.content).match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed?.matched === true && typeof parsed.patternId === 'string' && parsed.patternId.trim()) {
      return { matched: true, patternId: parsed.patternId.trim(), observation: '' };
    }
    if (parsed?.matched === false) {
      const confidence = Number(parsed.confidence);
      return {
        matched: false,
        observation: String(parsed.observation || '').trim(),
        correction: String(parsed.correction || '').trim(),
        confidence: Number.isFinite(confidence) ? confidence : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Wires the real capture->recognition->action loop. Call once from a
 * top-level, always-mounted component (not per voice-session) so it keeps
 * working across connect/disconnect cycles. Returns an unsubscribe function.
 */
export function initScreenAwareness(speakSystemMessage: (text: string) => Promise<boolean>): () => void {
  const api = getApi();
  if (!api?.onScreenAwarenessCapture) return () => {};

  const unsubscribe = api.onScreenAwarenessCapture(async (data: { program: string; dataUrl: string; timestamp: number }) => {
    const patterns = await fetchKnownPatterns(data.program);
    const verdict = await runRecognitionPass(data.program, data.dataUrl, patterns);

    if (!verdict) {
      logScreenAwareness({ event: 'pass-failed', program: data.program, reason: 'no verdict -- vision call failed or response was unparseable' });
      return;
    }

    if (verdict.matched && verdict.patternId) {
      const pattern = patterns.find((p) => p.id === verdict.patternId);
      if (!pattern) {
        // The model named an id that isn't actually in the real pattern
        // list -- a hallucinated match. Log it plainly; never speak a
        // correction that isn't grounded in a real, known pattern.
        logScreenAwareness({ event: 'matched-unknown-id', program: data.program, claimedPatternId: verdict.patternId });
        return;
      }
      const spoke = await speakSystemMessage(pattern.correction);
      logScreenAwareness({ event: 'matched', program: data.program, patternId: pattern.id, spoke });
      return;
    }

    if (!verdict.matched && verdict.observation) {
      const blocked = await proposalBlockedReason(data.program, verdict);
      if (blocked) {
        logScreenAwareness({ event: 'unmatched-held-back', program: data.program, reason: blocked, observation: verdict.observation });
        return;
      }
      lastProposalAt.set(data.program, Date.now());
      sessionObservations.set(data.program, [...(sessionObservations.get(data.program) || []), verdict.observation].slice(-50));
      const proposalId = await proposeChange(data.program, verdict.observation, verdict.correction || null, data.timestamp);
      logScreenAwareness({
        event: proposalId ? 'unmatched-proposed' : 'propose-failed',
        program: data.program, observation: verdict.observation, proposalId,
      });
      return;
    }

    // matched: false with an empty observation -- genuinely nothing notable
    // this pass. Real, valid outcome, still logged for traceability.
    logScreenAwareness({ event: 'unmatched-nothing-notable', program: data.program });
  });

  return unsubscribe;
}
