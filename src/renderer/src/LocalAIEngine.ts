/**
 * Local AI Engine Service
 * Connects Mossy to local AI backends like Ollama or Groq Cloud.
 */


import {
  buildKnowledgeManifestForModel,
  buildRelevantKnowledgeVaultContext,
  getRelevantKnowledgeVaultItems,
  isDuplicateVaultEntry,
  pruneAutoFetchedVaultItems,
  KnowledgeVaultItem,
} from './knowledgeRetrieval';
import { selfImprovementEngine } from './SelfImprovementEngine';
import { getApprovedToolsFromStorage } from './toolPermissions';
import { bridgeFetch } from './lib/bridgeClient';
import { getPlatformMapBlockForPrompt } from './platformCatalog';
import { getFullSystemInstruction, getCoreIdentityBlock } from './MossyBrain';

export interface AIResponse {
  content: string;
  context?: any;
  /** Mossy's own pre-answer deliberation (when the reasoning pre-pass ran) —
   *  a private planning scratchpad, not part of the answer itself. Optional
   *  UI surfaces this as a collapsible "reasoning" trace; most callers can
   *  ignore it entirely. */
  reasoning?: string;

  // --- Brain B tutoring contract (see brain-b/gemma_service_enhanced.py's /enrich) ---
  // Populated by generateResponse()'s enrichment step whenever Brain B is installed
  // and running, regardless of which provider actually generated `content` — Brain B
  // is enrichment that wraps any generator now, not a generator itself (see
  // docs/ARCHITECTURE.md's "Target layer model"). undefined when Brain B isn't
  // installed/running for this turn; still populated on an abstained turn (abstained
  // itself is the signal, not a missing response).
  /** teach | answer | debug — set by Brain B's mode classifier. */
  mode?: 'teach' | 'answer' | 'debug';
  /** What Brain B decided the user actually needs, computed before generating. */
  diagnosis?: string | null;
  /** A verification question, only ever set when mode === 'teach'. */
  checkQuestion?: string | null;
  /** True when Brain B found no matching documentation and declined to guess —
   *  `content` is already the honest "I don't know" message in that case, not
   *  an error; render it plainly rather than as a failure. */
  abstained?: boolean;
  /** True when Brain B's server-side classify_mode() flagged the question as
   *  about the user's live Blender scene AND actually had scene data to use —
   *  drives a "read your scene" indicator in the chat UI. */
  usedSceneContext?: boolean;
  /** True when THIS question was scene_related but couldn't use scene data
   *  specifically because the connected Blender add-on is too old to support
   *  get_context (confirmed via a get_capabilities handshake, not guessed) —
   *  distinct from "Blender just isn't open." Drives an "update your Blender
   *  add-on" notice instead of a silent abstain. */
  addonOutdated?: boolean;
  /** True when /enrich itself couldn't be reached this turn (Brain B not
   *  installed, not running, or its health check failed) — mode/diagnosis/
   *  checkQuestion/usedSceneContext etc. are all simply absent in that case,
   *  not false. Distinct from a normal non-scene turn: this means Mossy
   *  answered with zero retrieval/citations/scene-awareness for a reason
   *  that has nothing to do with the question itself. Surfaced explicitly
   *  rather than left for the model to guess at — found live: with this
   *  unset, a scene question with no data got a confident "I don't have
   *  access to your machine," a wrong claim about capability, when the
   *  actual, true, narrower statement was "the context service isn't
   *  running right now." Same principle as `abstained` — say what's
   *  actually true rather than something merely plausible. */
  enrichmentUnavailable?: boolean;
  /** True when this answer came from a local model as a fallback because
   *  Mossy's actual primary (Groq/backend cloud generation) was unavailable
   *  for this turn — not a routine choice, an unannounced quality drop the
   *  user should be able to see. See _generateResponseCore()'s "preferCloud"
   *  handling for why this exists: a local model (often a small one, e.g.
   *  gemma2:9b) is meaningfully weaker at following a system prompt this
   *  large than Mossy's real primary is. */
  usedLocalFallback?: boolean;
}

/** Minimal shape of a successful web search result used internally. */
interface WebSearchResult {
  text: string;
  url?: string;
  source?: string;
}

type LocalAiPreferred = 'auto' | 'cosmos' | 'ollama' | 'openai_compat' | 'off';

type LocalAiSettings = {
  localAiPreferredProvider?: LocalAiPreferred;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
  cosmosBaseUrl?: string;
  cosmosModel?: string;
  /** Brain B — Mossy's own local retrieval/tutoring enrichment service
   *  (brain-b/gemma_service_enhanced.py). No longer a selectable generation
   *  provider (see docs/ARCHITECTURE.md's "Target layer model", 2026-08-15) —
   *  this is just where to reach it for the unconditional enrichment step in
   *  generateResponse() below. Default port 8766, not 8765 — that port is
   *  already claimed by the F4AI NPC-dialogue relay this same app starts
   *  unconditionally (see src/electron/main.ts). */
  brainBBaseUrl?: string;
};

/**
 * One id per app session (module lives for the renderer's lifetime — reset on
 * reload/restart, stable across every chat turn within it). Passed to Brain B
 * as `session_id` so learner_signals rows can be assembled into a per-learner
 * trajectory instead of each being an unowned "unknown" observation — see
 * gemma_service_enhanced.py's /infer docstring for why that mattered enough
 * to wire through now rather than defer again now that something calls it.
 * Not a durable per-user id (that's a bigger, separate concept) — just enough
 * to tell "same session" apart from "different session" in the logged data.
 */
const APP_SESSION_ID: string =
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Stable across every session, unlike APP_SESSION_ID above — generated once,
 * persisted via the same settings store as everything else, reused on every
 * future launch. This is what Brain B's learner_state is actually keyed on
 * (see gemma_service_enhanced.py's compute_answer_level()/update_learner_state()):
 * session_id alone can only tell turns within one launch apart, but a learner
 * model needs continuity across launches to mean anything. Memoized after
 * first resolution so repeated calls in one session don't re-hit settings I/O.
 */
/**
 * Live Blender scene snapshot for Brain B's `get_context` — same
 * BridgeServer.ts `/execute {type:'context'}` call DesktopBridge.tsx's
 * fetchBlenderContext already uses, reached here via the shared bridgeFetch()
 * client (auth token handled there, see bridgeClient.ts).
 *
 * Deliberately opportunistic, but the timeout here is 2500ms, not something
 * tighter — checked BridgeServer.ts's own _blenderSend() (the TCP call to the
 * Blender add-on, POINTYTHRUNDRA654/Blender-add-on's mossy_link.py) and its
 * _build_scene_context():
 * "Blender not running" fails via a near-instant ECONNREFUSED, not a slow
 * timeout, so a generous budget here costs nothing on the common path. But
 * the active object's triangle count is a pure-Python sum over
 * mesh.polygons — genuinely slow for one very-high-poly active mesh — and
 * BridgeServer.ts's own internal timeout for this call is already 3000ms.
 * An 800ms client-side timeout would have been the tightest link in that
 * chain, silently cutting off requests that would've succeeded within
 * Blender's own allowance — the feature would work in every quick manual
 * test and then quietly stop firing on a heavy real scene. 2500ms leaves
 * BridgeServer's 3000ms as the outer bound instead.
 *
 * ECONNREFUSED (Blender not running) isn't the only failure mode though —
 * Blender can be OPEN and its socket ACCEPTED but genuinely stalled (mid-
 * render, evaluating a heavy modifier stack, a modal operator running). That
 * case doesn't fail fast; it eats the full 2500ms, on every single Brain B
 * question, for as long as Blender stays busy — a user with a render going
 * would just experience Mossy as generally slow, with nothing connecting
 * that to Blender. So: after an actual timeout (not any other failure —
 * ECONNREFUSED, bad JSON, a 401, etc. all still retry next turn normally),
 * skip the scene fetch entirely for the next 30s. Degrades to one slow turn
 * instead of every turn for the duration of whatever Blender is busy with.
 *
 * Any failure (timeout, Blender not connected, bad JSON) resolves to
 * { context: null, addonOutdated: false } rather than throwing; the caller
 * treats a null context exactly like "no scene context available".
 *
 * Version handshake: get_context's response, when the connected add-on is
 * an old build that predates it, comes back as a plain
 * {status:'error', message:"Unknown command type: 'get_context'"} — which,
 * from the client's side, is indistinguishable from any other failure
 * unless checked for specifically. Found live: an outdated add-on silently
 * abstained exactly like Blender-not-running did, with no way for the user
 * to know updating the add-on would fix it. On that specific shape (not on
 * every failure — a genuinely closed connection still just means no
 * Blender), this calls get_capabilities to confirm and sets addonOutdated
 * so the UI can say "update your Blender add-on" instead of staying silent.
 */
const BLENDER_BUSY_COOLDOWN_MS = 30_000;
let _blenderBusyUntil = 0;

interface BlenderContextResult {
  context: Record<string, unknown> | null;
  addonOutdated: boolean;
}

async function checkAddonSupportsGetContext(): Promise<boolean> {
  try {
    const response = await bridgeFetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'capabilities' }),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return true; // can't confirm either way — don't claim outdated on a guess
    const data = await response.json();
    if (data?.status !== 'success') return true;
    const raw = String(data?.response || '');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    const supported = parsed?.supported_commands;
    if (!Array.isArray(supported)) return true; // unrecognized shape — don't guess
    return supported.includes('get_context');
  } catch {
    return true; // capabilities check itself failed — not confident enough to claim outdated
  }
}

/**
 * Caps how many selected-object names get sent, replacing the rest with a
 * count. The actual unbounded risk in this payload is narrower than "per-
 * object detail" might suggest: `_build_scene_context()` (public/
 * mossy_link_addon.py:257-300, the reference get_context shape) already
 * scopes mesh/material stats to the single active object only — there is no
 * per-object array of mesh data to trim. The one field with no natural
 * ceiling is `selected`, a flat list of object name strings — a user doing
 * Select All on a scene with thousands of objects sends thousands of name
 * strings verbatim. Checked against the real code before trimming rather
 * than trimming a shape that was assumed rather than read.
 */
const MAX_SELECTED_NAMES = 20;

function trimBlenderContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const selected = ctx.selected;
  if (!Array.isArray(selected) || selected.length <= MAX_SELECTED_NAMES) return ctx;
  return {
    ...ctx,
    selected: selected.slice(0, MAX_SELECTED_NAMES),
    selectedTotalCount: selected.length,
  };
}

async function fetchLiveBlenderContext(): Promise<BlenderContextResult> {
  const NO_CONTEXT: BlenderContextResult = { context: null, addonOutdated: false };
  if (Date.now() < _blenderBusyUntil) return NO_CONTEXT;

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 2500);
  try {
    const response = await bridgeFetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'context' }),
      signal: controller.signal,
    });
    if (!response.ok) return NO_CONTEXT;
    const data = await response.json();
    if (data?.status !== 'success') return NO_CONTEXT;
    const raw = String(data?.response || '');
    if (!raw) return NO_CONTEXT;
    const parsed = JSON.parse(raw);

    if (parsed?.status === 'error') {
      const unknownType = /unknown command type/i.test(String(parsed?.message || ''));
      if (unknownType) {
        const supportsGetContext = await checkAddonSupportsGetContext();
        return { context: null, addonOutdated: !supportsGetContext };
      }
      return NO_CONTEXT;
    }

    // mossy_link.py wraps the scene dict under "context" — see
    // _execute_command_on_main_thread's get_context branch.
    const ctx = parsed?.context;
    return (ctx && typeof ctx === 'object')
      ? { context: trimBlenderContext(ctx), addonOutdated: false }
      : NO_CONTEXT;
  } catch {
    if (timedOut) {
      _blenderBusyUntil = Date.now() + BLENDER_BUSY_COOLDOWN_MS;
    }
    return NO_CONTEXT;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Real CK precombine diagnosis, read server-side from the user's own CKPE
 * (Creation Kit Platform Extended) log — see BridgeServer.ts's
 * _getCKPEPrecombineStatus for the honest detected/parsed state machine.
 * Cached and mtime-gated on the Electron side, so calling this every turn
 * is cheap (no re-parse unless the log actually changed). Returns null only
 * when the Bridge itself couldn't be reached — "CKPE not installed" is a
 * real, non-null status Brain B is meant to relay honestly, not something
 * this function should swallow into null.
 */
async function fetchCKPrecombineStatus(): Promise<Record<string, unknown> | null> {
  try {
    const response = await bridgeFetch('/ck/precombine-status', {
      method: 'GET',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data && typeof data === 'object') ? data : null;
  } catch {
    return null; // Bridge unreachable — not the same as "CKPE not detected"
  }
}

let _cachedUserId: string | null = null;
async function getOrCreateUserId(): Promise<string> {
  if (_cachedUserId) return _cachedUserId;
  try {
    const api = (window.electron?.api || window.electronAPI) as any;
    const s = await api?.getSettings?.();
    if (s?.mossyUserId && typeof s.mossyUserId === 'string') {
      _cachedUserId = s.mossyUserId;
      return s.mossyUserId;
    }
    const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await api?.setSettings?.({ mossyUserId: newId });
    _cachedUserId = newId;
    return newId;
  } catch {
    // Settings unavailable for some reason — fall back to session-scoped rather
    // than block the chat turn on this. Learner continuity is lost for this
    // launch, but nothing else breaks.
    return APP_SESSION_ID;
  }
}

/**
 * Result of Brain B's /enrich — the pre-generation half of what used to be
 * Brain B's own exclusive /infer path (docs/ARCHITECTURE.md's "Target layer
 * model", 2026-08-15). null anywhere this is used means Brain B isn't
 * installed/running; every caller treats that exactly like today's
 * fallthrough — skip enrichment, generate normally.
 */
interface EnrichmentResult {
  abstained: boolean;
  /** Ready-to-display abstain message when abstained is true; null otherwise. */
  answer: string | null;
  mode: 'teach' | 'answer' | 'debug';
  sceneRelated: boolean;
  diagnosis: string | null;
  answerLevel: string | null;
  nextSkill: string | null;
  /** Pre-assembled grounding block (KB excerpts, past episodes, diagnosis/
   *  level framing, live scene JSON when relevant) — fold into whatever
   *  prompt the resolved provider builds. "" when nothing was retrieved. */
  retrievedContext: string;
  usedWeb: boolean;
  sources: any[];
  pastEpisodes: any[];
  hedged: boolean;
  /** When hedged, prepend this exact string to the generated answer text
   *  before displaying it. Applied once, centrally, by the generateResponse()
   *  wrapper below — not by each individual provider branch. */
  hedgePrefix: string | null;
  usedSceneContext: boolean;
  contextForGeneration: Record<string, unknown> | null;
  addonOutdatedRelevant: boolean;
  /** True when this turn is about navigating/using MOSSY.SPACE itself
   *  rather than FO4 modding knowledge — gates whether the ~1,170-token
   *  platform-catalog block gets folded into the prompt (see
   *  generateResponse() below and platformCatalog.ts's
   *  getPlatformMapBlockForPrompt()), the same way scene_related gates
   *  scene JSON. */
  appHelpRelated: boolean;
  /** Retrieval diagnostics from Brain B's abstention gate — how many probe
   *  results agreed across vector+BM25, and the BM25 score gap between the
   *  best and worst probe result. Not used for any decision on this side
   *  (Brain B already applied them server-side to reach `retrievalTier`) —
   *  exposed purely for the turn-trace diagnostics panel, so "why did this
   *  turn hedge/abstain" is answerable from the UI instead of only from
   *  Brain B's own server-side logs. */
  retrievalAgreement: number | null;
  retrievalMargin: number | null;
  retrievalTier: 'abstain' | 'hedge' | 'confident' | null;
  /** True when this turn needs a specific vanilla-game fact (FormID, EditorID,
   *  load order, a Papyrus function signature, exact asset paths) that only
   *  the scanned-game "neuron" data (main.ts's buildBrainNeuronBlock(),
   *  ~155K chars measured live) could confirm — gates that injection into
   *  the cloud call the same way sceneRelated/appHelpRelated gate their own
   *  blocks. Found live: the neuron block was riding on every single cloud
   *  call unconditionally, including "hi" — the dominant contributor to the
   *  oversized prompts behind both the local-fallback persona bug and (per
   *  LiveContext.tsx's own comment) the reason voice's watchdog was raised
   *  from 50s to 120s in the first place. */
  gameDataRelated: boolean;
  /** Whether Brain B's Phase-1 game-data index (Papyrus API only so far —
   *  see docs-dev/GAME_DATA_RETRIEVAL_MERGE_PROJECT.md) actually found a
   *  match for this turn, as opposed to just gameDataRelated's classifier
   *  judgment that it needed one. The client gates `includeGameData` (main.ts's
   *  ~155K-char neuron-block dump) on `gameDataRelated && !gameDataFound` —
   *  a ranked-and-found turn shouldn't ALSO carry the blunt dump alongside
   *  it, or a game-data turn ends up more expensive than before this
   *  feature existed instead of less, on top of every other turn getting
   *  cheaper. The dump still fires as a fallback when this is false (a
   *  game-data turn Phase 1's Papyrus-only coverage doesn't have an answer
   *  for yet — form graph, asset graph, world strings are still unindexed). */
  gameDataFound: boolean;
  /** False for pure conversational turns (greetings, thanks, small talk) —
   *  Brain B's abstain gate treats this as automatic grounding (folded into
   *  the same has_grounding OR-chain as scene/game-data), so "hi" no longer
   *  abstains and returns the canned "I don't have documentation covering
   *  that" as if it were a real answer. Not currently used by the client
   *  for any decision — enrichWithBrainB()'s abstained check already
   *  reflects this server-side — kept here for turn-trace visibility,
   *  matching every other classify_and_diagnose() dimension. */
  needsGrounding: boolean;
  /** True when this turn asked about CK precombine/previs diagnosis AND a real
   *  ck_precombine_status was actually usable (CKPE detected and its log
   *  parsed) — the CK-diagnosis equivalent of usedSceneContext/gameDataFound.
   *  False both when the question wasn't CK-diagnosis-related and when it was
   *  but CKPE isn't installed or its log couldn't be read — those are
   *  different reasons, but neither means Mossy used real CK data this turn. */
  ckDiagnosisAvailable: boolean;
}

/**
 * /enrich's own timeout budget. 15s is fine for regular chat, where a few
 * extra seconds behind a "thinking" indicator is unremarkable. It is NOT
 * fine for voice: /enrich does real sequential work before generation even
 * starts (classify_and_diagnose is itself an LLM call, plus two
 * hybrid_retrieve calls, plus a possible web_search fallback) — a live
 * turn's ceiling is LiveContext.tsx's 120s watchdog, and generation ALONE
 * can already eat 30-90s of that on a cold Render backend (see that file's
 * own comment on why the watchdog was raised from 50s to 120s in the first
 * place). Found live: voice hit "Processing taking too long, restarting
 * link" after this file made /enrich run unconditionally for every turn,
 * including voice, which never touched Brain B at all before that change.
 * A slow-but-not-yet-timed-out enrichment call was eating enough of the
 * 120s budget on its own to tip generation over the edge — not a timeout
 * failure so much as a latency tax voice was never budgeted to pay.
 *
 * 3s (the original value here) turned out too tight the other direction: a
 * warm, working /enrich round trip (classify_and_diagnose over the network
 * plus retrieval) measured ~1.9s on its own with nothing unusual going on —
 * under 1.2s of slack before any real-world jitter. That's enough to time
 * out on a routine basis, which silently discards real scene context/
 * classification on exactly the turns a user is most likely to be testing
 * (a live scene question), falling through to the null-enrichment path with
 * no scene data to answer from. 6s keeps voice's worst case (6s enrich +
 * 90s cold generation = 96s) safely under the 120s watchdog while giving
 * the common case room to actually finish instead of racing it.
 */
const ENRICH_TIMEOUT_MS_CHAT = 15_000;
const ENRICH_TIMEOUT_MS_VOICE = 6_000;

/**
 * One record per generateResponse() call — the "turn trace" the AI Pipeline
 * Preflight panel (SystemHub → Diagnostics → AI Pipeline) reads from. Built
 * to answer, for each of the last few turns, the exact question a person
 * debugging Mossy by hand has to walk layer-by-layer to answer today: which
 * provider actually spoke, did enrichment run, what did Brain B decide, and
 * how long did each stage take. `contractSuccess`/`contractLatencyMs` start
 * unset and get filled in later — /contract is fire-and-forget, resolving
 * after the turn has already returned (see generateResponse()'s docstring).
 */
export interface TurnTraceEntry {
  timestamp: number;
  /** Truncated — this is a debugging aid kept in memory and on disk, not a
   *  place to retain a user's full question text indefinitely. */
  queryPreview: string;
  voiceMode: boolean;
  preferCloud: boolean;
  enrichmentRan: boolean;
  enrichmentUnavailable: boolean;
  mode: 'teach' | 'answer' | 'debug' | null;
  abstained: boolean;
  sceneRelated: boolean | null;
  appHelpRelated: boolean | null;
  retrievalAgreement: number | null;
  retrievalMargin: number | null;
  retrievalTier: 'abstain' | 'hedge' | 'confident' | null;
  usedSceneContext: boolean | null;
  /** Byte length of the JSON-serialized live scene context, if any was
   *  attached — 0 means none, not "unavailable" (contextForGeneration is
   *  simply not present on this turn). */
  sceneContextBytes: number;
  hedged: boolean | null;
  usedLocalFallback: boolean;
  providerUsed: string;
  enrichMs: number | null;
  generateMs: number | null;
  totalMs: number;
  contractSuccess: boolean | null;
  contractLatencyMs: number | null;
}

const MAX_RECENT_TURNS = 20;
const _recentTurns: TurnTraceEntry[] = [];

function recordTurnTrace(entry: TurnTraceEntry): void {
  _recentTurns.push(entry);
  if (_recentTurns.length > MAX_RECENT_TURNS) _recentTurns.shift();
  try {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    void api?.writeDiagnosticLog?.(`[turn] ${JSON.stringify(entry)}`);
  } catch { /* diagnostics logging is itself non-critical */ }
}

/** Re-persists a turn's entry after /contract settles (see TurnTraceEntry's
 *  docstring) — appends a second JSONL line rather than rewriting the first,
 *  since the on-disk log is append-only by design. */
function updateTurnTraceContract(entry: TurnTraceEntry, success: boolean, latencyMs: number): void {
  entry.contractSuccess = success;
  entry.contractLatencyMs = latencyMs;
  try {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    void api?.writeDiagnosticLog?.(`[turn-contract-update] ${JSON.stringify({ timestamp: entry.timestamp, queryPreview: entry.queryPreview, contractSuccess: success, contractLatencyMs: latencyMs })}`);
  } catch { /* non-critical */ }
}

/**
 * Calls Brain B's /enrich. Health-checks first and fails fast (short timeout,
 * swallowed error) rather than letting a not-installed/not-running Brain B
 * add latency to every single turn for every user — this is what makes
 * enrichment safe to call unconditionally instead of only for users who'd
 * explicitly selected Brain B as a provider. On voice, a slow-but-live Brain B
 * is treated exactly like an unavailable one past ENRICH_TIMEOUT_MS_VOICE —
 * degrading to unenriched generation is strictly better than eating enough of
 * the 120s voice watchdog budget to break the turn entirely.
 */
async function enrichWithBrainB(question: string, brainBBaseUrl: string, voiceMode: boolean): Promise<EnrichmentResult | null> {
  try {
    const health = await fetch(`${brainBBaseUrl}/health`, { signal: AbortSignal.timeout(1500) });
    if (!health.ok) return null;
    const healthData = await health.json();
    if (healthData?.status !== 'ok') return null;
  } catch {
    return null; // not installed / not running
  }

  try {
    const [userId, blenderResult, ckPrecombineStatus] = await Promise.all([
      getOrCreateUserId(),
      fetchLiveBlenderContext(),
      fetchCKPrecombineStatus(),
    ]);
    const resp = await fetch(`${brainBBaseUrl}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question, session_id: APP_SESSION_ID, user_id: userId,
        get_context: blenderResult.context ?? undefined,
        addon_outdated: blenderResult.addonOutdated,
        ck_precombine_status: ckPrecombineStatus ?? undefined,
      }),
      signal: AbortSignal.timeout(voiceMode ? ENRICH_TIMEOUT_MS_VOICE : ENRICH_TIMEOUT_MS_CHAT),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.error) return null;
    return {
      abstained: !!data?.abstained,
      answer: data?.answer ?? null,
      mode: (data?.mode === 'teach' || data?.mode === 'debug') ? data.mode : 'answer',
      sceneRelated: !!data?.scene_related,
      diagnosis: data?.diagnosis ?? null,
      answerLevel: data?.answer_level ?? null,
      nextSkill: data?.next_skill ?? null,
      retrievedContext: String(data?.retrieved_context || ''),
      usedWeb: !!data?.used_web,
      sources: Array.isArray(data?.sources) ? data.sources : [],
      pastEpisodes: Array.isArray(data?.past_episodes) ? data.past_episodes : [],
      hedged: !!data?.hedged,
      hedgePrefix: data?.hedge_prefix ?? null,
      usedSceneContext: !!data?.used_scene_context,
      contextForGeneration: (data?.context_for_generation && typeof data.context_for_generation === 'object')
        ? data.context_for_generation : null,
      addonOutdatedRelevant: !!data?.addon_outdated_relevant,
      appHelpRelated: !!data?.app_help_related,
      retrievalAgreement: typeof data?.retrieval_agreement === 'number' ? data.retrieval_agreement : null,
      retrievalMargin: typeof data?.retrieval_margin === 'number' ? data.retrieval_margin : null,
      retrievalTier: (data?.retrieval_tier === 'abstain' || data?.retrieval_tier === 'hedge' || data?.retrieval_tier === 'confident')
        ? data.retrieval_tier : null,
      gameDataRelated: !!data?.game_data_related,
      gameDataFound: !!data?.game_data_found,
      needsGrounding: data?.needs_grounding !== false,
      ckDiagnosisAvailable: !!data?.ck_diagnosis_available,
    };
  } catch {
    return null; // enrichment failed mid-flight — fail open, generate without it
  }
}

/**
 * Fire-and-forget /contract call. Deliberately never awaited by
 * generateResponse() — the answer already rendered by the time this
 * resolves. mode/diagnosis/sources are passed through explicitly from the
 * /enrich result rather than recomputed here; recomputing would classify and
 * diagnose the same question twice per turn, exactly the round-trip cost
 * activating classify_and_diagnose() in /enrich was meant to remove. Errors
 * and timeouts are swallowed — the caller keeps a working answer and only
 * loses the tutoring extras (check_question, learner_signal) for this turn.
 */
async function sendContractAsync(
  brainBBaseUrl: string,
  question: string,
  answer: string,
  enrichment: EnrichmentResult,
  onContractReady?: (fields: { checkQuestion: string | null; learnerSignal: string | null }) => void,
  traceEntry?: TurnTraceEntry,
): Promise<void> {
  const contractStart = Date.now();
  try {
    const resp = await fetch(`${brainBBaseUrl}/contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question, answer, mode: enrichment.mode, diagnosis: enrichment.diagnosis,
        session_id: APP_SESSION_ID, sources: enrichment.sources,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      if (traceEntry) updateTurnTraceContract(traceEntry, false, Date.now() - contractStart);
      onContractReady?.({ checkQuestion: null, learnerSignal: null });
      return;
    }
    const data = await resp.json();
    if (traceEntry) updateTurnTraceContract(traceEntry, true, Date.now() - contractStart);
    onContractReady?.({
      checkQuestion: data?.check_question ?? null,
      learnerSignal: data?.learner_signal ?? null,
    });
  } catch {
    // Fail open — deliberate, see docstring above. Still fires the callback
    // with nulls rather than staying silent: a caller showing a "pending"
    // state for this turn (e.g. a check-question placeholder) needs a
    // definitive settle signal even when nothing came back, or that
    // placeholder is stuck forever instead of just quietly disappearing.
    if (traceEntry) updateTurnTraceContract(traceEntry, false, Date.now() - contractStart);
    onContractReady?.({ checkQuestion: null, learnerSignal: null });
  }
}

/**
 * Minimum ratio of sanitised text length to original that must be preserved for
 * `sanitizeFinalResponse` to return the sanitised version.  If sanitisation would
 * remove more than (1 - MIN_SANITIZED_TEXT_RATIO) of the text — i.e. the response
 * was almost entirely a refusal — the original is returned unchanged to avoid
 * returning an empty or misleadingly-short string to the user.
 */
const MIN_SANITIZED_TEXT_RATIO = 0.3;

/**
 * Conservative character budget for a prompt handed to a LOCAL model —
 * roughly 2,000 tokens, leaving generous room for a small local model's own
 * response inside an ~8K-token-class context window (gemma2:9b and similar).
 * getFullSystemInstruction() alone measures ~141,000 characters — before
 * Brain B's retrieval context, conversation history, or anything else is
 * even added — so any turn using this budget is already far past it.
 */
const LOCAL_MODEL_PROMPT_BUDGET = 8_000;

/**
 * Builds the prompt actually sent to a local model. Below budget, this is
 * just the full assembled prompt, same as always. Over budget — the normal
 * case, given getFullSystemInstruction() alone is ~35x this budget — this
 * drops the full prompt entirely rather than silently truncating it (which
 * is what letting an oversized string reach Ollama/the local API would do,
 * and truncation from either end is exactly as likely to cut the identity
 * block or the live scene data as anything else). Instead it rebuilds a
 * small, guaranteed-complete prompt from just the pieces that actually
 * matter for a fallback answer: who Mossy is, and the live scene data if
 * this turn has any — not the ~141K-char base prompt or Brain B's KB
 * retrieval, which a model this size can't meaningfully use anyway. Found
 * live (2026-08-16): scene questions that correctly had real scene data
 * attached still got "I'm just a text-based AI" specifically on turns that
 * fell back to a local model — the full prompt was too large for local
 * generation to reliably carry the parts that mattered, not because the
 * model was ignoring its instructions.
 */
function buildPromptForLocalModel(
  fullSystemInstruction: string,
  sceneContext: Record<string, unknown> | null | undefined,
  extraDirective: string,
  historyText: string,
  query: string,
): string {
  if (fullSystemInstruction.length <= LOCAL_MODEL_PROMPT_BUDGET) {
    return `${fullSystemInstruction}${extraDirective}${historyText}\nUser: ${query}\n\nMossy's Response:`;
  }
  const sceneBlock = sceneContext
    ? `\nLIVE BLENDER SCENE (what's actually open in the user's Blender right now — answer using THIS, not general knowledge, when the question is about their current scene):\n${JSON.stringify(sceneContext, null, 2)}\n`
    : '';
  return `${getCoreIdentityBlock()}${sceneBlock}${extraDirective}${historyText}\nUser: ${query}\n\nMossy's Response:`;
}

export const LocalAIEngine = {
  /**
   * Loads persisted local AI settings (if available).
   */
  async getLocalAiSettings(): Promise<LocalAiSettings> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return {
          localAiPreferredProvider: (s?.localAiPreferredProvider ?? 'auto') as LocalAiPreferred,
          ollamaBaseUrl: s?.ollamaBaseUrl ?? 'http://127.0.0.1:11434',
          ollamaModel: s?.ollamaModel ?? 'llama3',
          openaiCompatBaseUrl: s?.openaiCompatBaseUrl ?? 'http://127.0.0.1:1234/v1',
          openaiCompatModel: s?.openaiCompatModel ?? '',
          cosmosBaseUrl: s?.cosmosBaseUrl ?? '',
          cosmosModel: s?.cosmosModel ?? '',
          brainBBaseUrl: s?.brainBBaseUrl ?? 'http://127.0.0.1:8766',
        };
      }
    } catch {
      // ignore
    }

    return {
      localAiPreferredProvider: 'auto',
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      ollamaModel: 'llama3',
      openaiCompatBaseUrl: 'http://127.0.0.1:1234/v1',
      openaiCompatModel: '',
      cosmosBaseUrl: '',
      cosmosModel: '',
      brainBBaseUrl: 'http://127.0.0.1:8766',
    };
  },

  /**
   * Returns self-critique preference from persisted settings. Defaults ON
   * (opt-out) when unset — previously defaulted OFF with no UI to ever set it
   * to true, so the whole feature was unreachable dead code in practice.
   */
  async getSelfCritiqueEnabled(): Promise<boolean> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return s?.groqSelfCritiqueEnabled !== false;
      }
    } catch {
      // ignore
    }
    return true;
  },

  /**
   * Returns deliberate-reasoning (pre-answer planning pass) preference.
   * Defaults ON, same opt-out reasoning as getSelfCritiqueEnabled above.
   */
  async getDeliberateReasoningEnabled(): Promise<boolean> {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        return s?.groqDeliberateReasoningEnabled !== false;
      }
    } catch {
      // ignore
    }
    return true;
  },

  /**
   * Returns up to `maxSessions` past session summaries from localStorage,
   * formatted as a context block to inject into the system prompt.
   */
  getSessionMemoryContext(maxSessions = 5): string {
    try {
      const raw = localStorage.getItem('mossy_session_memories');
      if (!raw) return '';
      const sessions: Array<{ ts: string; summary: string }> = JSON.parse(raw);
      if (!Array.isArray(sessions) || sessions.length === 0) return '';
      const recent = sessions.slice(-maxSessions);
      const lines = recent.map((s) => `[${s.ts}] ${s.summary}`).join('\n');
      return `\n### PAST SESSION MEMORIES (most recent ${recent.length}):\n${lines}\n`;
    } catch {
      return '';
    }
  },

  /**
   * Saves a session summary to the rolling localStorage store (capped at 100 entries).
   */
  saveSessionSummary(summary: string): void {
    try {
      const raw = localStorage.getItem('mossy_session_memories');
      const sessions: Array<{ ts: string; summary: string }> = raw ? JSON.parse(raw) : [];
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
      sessions.push({ ts, summary });
      // Cap at 100 entries rolling window
      const capped = sessions.slice(-100);
      localStorage.setItem('mossy_session_memories', JSON.stringify(capped));
    } catch {
      // non-critical — ignore
    }
  },

  /**
   * Checks whether a local AI provider is available.
   * Uses the Electron main process to avoid CORS and to support configurable ports.
   */
  async getLocalProviderStatus(): Promise<
    | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'cosmos'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'openai_compat'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'koboldcpp'; baseUrl: string; models: string[] }
    | { ok: true; provider: 'fo4bridge'; baseUrl: string; models: string[] }
    | { ok: false; reason: string }
  > {
    try {
      const api = (window.electron?.api || window.electronAPI) as any;
      if (!api?.mlCapsStatus) return { ok: false, reason: 'Desktop capabilities API not available.' };

      const settings = await this.getLocalAiSettings();
      const preferred = (settings.localAiPreferredProvider ?? 'auto') as LocalAiPreferred;

      const caps = await api.mlCapsStatus();
      const ollamaOk = !!caps?.ollama?.ok;
      const cosmosOk = !!caps?.cosmos?.ok;
      const openaiOk = !!caps?.openaiCompat?.ok;

      // Check KoboldCPP — it's running if the process is up and port 5001 responds
      let koboldOk = false;
      try {
        if (api.koboldStatus) {
          const ks = await api.koboldStatus();
          koboldOk = !!ks?.running;
        }
      } catch { /* not available */ }
      const KOBOLD_BASE = 'http://127.0.0.1:5001/v1';

      // Check FO4 Advanced AI bridge (port 28485) — has llama-cpp-python inline
      let bridgeOk = false;
      try {
        const br = await fetch('http://127.0.0.1:28485/llm/status', { signal: AbortSignal.timeout(1500) });
        if (br.ok) {
          const bs = await br.json();
          bridgeOk = bs?.model_loaded || bs?.koboldcpp_running;
        }
      } catch { /* not running */ }
      const BRIDGE_BASE = 'http://127.0.0.1:28485';

      const pickAuto = () => {
        if (cosmosOk) return { ok: true as const, provider: 'cosmos' as const, baseUrl: caps.cosmos.baseUrl, models: caps.cosmos.models || [] };
        if (ollamaOk) return { ok: true as const, provider: 'ollama' as const, baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] };
        if (openaiOk) return { ok: true as const, provider: 'openai_compat' as const, baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] };
        if (koboldOk) return { ok: true as const, provider: 'koboldcpp' as const, baseUrl: KOBOLD_BASE, models: ['tinyllama'] };
        if (bridgeOk) return { ok: true as const, provider: 'fo4bridge' as const, baseUrl: BRIDGE_BASE, models: ['tinyllama'] };
        return { ok: false as const, reason: 'No local provider detected.' };
      };

      if (preferred === 'off') return { ok: false, reason: 'Local AI disabled in settings.' };
      if (preferred === 'auto') return pickAuto();

      if (preferred === 'cosmos') {
        return cosmosOk
          ? { ok: true, provider: 'cosmos', baseUrl: caps.cosmos.baseUrl, models: caps.cosmos.models || [] }
          : { ok: false, reason: `Cosmos not detected (${caps?.cosmos?.error || 'unknown'})` };
      }

      if (preferred === 'ollama') {
        return ollamaOk
          ? { ok: true, provider: 'ollama', baseUrl: caps.ollama.baseUrl, models: caps.ollama.models || [] }
          : { ok: false, reason: `Ollama not detected (${caps?.ollama?.error || 'unknown'})` };
      }

      // openai_compat
      return openaiOk
        ? { ok: true, provider: 'openai_compat', baseUrl: caps.openaiCompat.baseUrl, models: caps.openaiCompat.models || [] }
        : { ok: false, reason: `OpenAI-compatible server not detected (${caps?.openaiCompat?.error || 'unknown'})` };
    } catch (e: any) {
      return { ok: false, reason: String(e?.message || e) };
    }
  },

  /**
   * Backwards-compatible helper used by existing UI code.
   */
  async checkOllama(): Promise<boolean> {
    const st = await this.getLocalProviderStatus();
    return st.ok && st.provider === 'ollama';
  },

  /**
   * Generates a response — the one entry point every caller (AI Chat, Live
   * Synapse voice, anywhere else) should use. Runs Brain B enrichment
   * unconditionally when Brain B is installed and running, regardless of
   * which backend actually generates the text (docs/ARCHITECTURE.md's
   * "Target layer model", 2026-08-15) — no provider picker, no "brain"
   * choice; if it's installed, it's used, if not, generation proceeds
   * exactly as it did before enrichment existed.
   *
   * Abstention short-circuits generation entirely: when /enrich reports the
   * question abstained, this returns that response directly without calling
   * any generation provider — generating an answer from irrelevant context
   * and then discarding it would waste the call on exactly the turns that
   * have nothing to say.
   *
   * /contract (check_question, learner_signal) is fired after generation
   * completes but is NOT awaited before returning — it arrives, if at all,
   * via `onContractReady` some time after the caller already has the answer.
   * This keeps a slow/cold-starting Brain B off the critical path to
   * time-to-answer entirely.
   */
  async generateResponse(query: string, systemInstruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, voiceMode = false, signal?: AbortSignal, localOptions?: { timeoutMs?: number; think?: boolean; preferCloud?: boolean; sceneContext?: Record<string, unknown> | null; includeGameDataDump?: boolean }, onContractReady?: (fields: { checkQuestion: string | null; learnerSignal: string | null }) => void): Promise<AIResponse> {
    const turnStart = Date.now();
    const localSettings = await this.getLocalAiSettings();
    const brainBBaseUrl = String(localSettings.brainBBaseUrl || 'http://127.0.0.1:8766');
    const enrichStart = Date.now();
    const enrichment = await enrichWithBrainB(query, brainBBaseUrl, voiceMode);
    const enrichMs = Date.now() - enrichStart;

    if (enrichment?.abstained) {
      recordTurnTrace({
        timestamp: turnStart, queryPreview: query.slice(0, 200), voiceMode,
        preferCloud: !!localOptions?.preferCloud, enrichmentRan: true, enrichmentUnavailable: false,
        mode: enrichment.mode, abstained: true, sceneRelated: enrichment.sceneRelated,
        appHelpRelated: enrichment.appHelpRelated, retrievalAgreement: enrichment.retrievalAgreement,
        retrievalMargin: enrichment.retrievalMargin, retrievalTier: enrichment.retrievalTier,
        usedSceneContext: false, sceneContextBytes: 0, hedged: false, usedLocalFallback: false,
        providerUsed: 'none (abstained before generation)', enrichMs, generateMs: null,
        totalMs: Date.now() - turnStart, contractSuccess: null, contractLatencyMs: null,
      });
      return {
        content: enrichment.answer || 'No documentation found for this question.',
        context: { citations: [] },
        mode: enrichment.mode,
        diagnosis: null,
        checkQuestion: null,
        abstained: true,
        usedSceneContext: false,
        addonOutdated: enrichment.addonOutdatedRelevant,
      };
    }

    // Fold the retrieved grounding block into the system instruction ONCE,
    // here, rather than teaching every individual provider branch below
    // about Brain B — every branch already appends injectedContext (or the
    // equivalent) to whatever it sends, so this reaches Groq/Ollama/Kobold/
    // FO4-bridge alike without touching their dispatch logic at all.
    //
    // The platform-catalog block is folded in the same way, but only when
    // this turn's classify_and_diagnose() call flagged it app_help_related —
    // it measures ~1,170 tokens, and unconditionally including it (as an
    // earlier pass of this feature did) put that cost on every single turn,
    // including plain modding questions and the voice path, which already
    // special-cases prompt size elsewhere for exactly this reason.
    let effectiveSystemInstruction = systemInstruction;
    if (enrichment?.retrievedContext) {
      effectiveSystemInstruction += `\n\n${enrichment.retrievedContext}`;
    }
    if (enrichment?.appHelpRelated) {
      effectiveSystemInstruction += `\n\n${getPlatformMapBlockForPrompt()}`;
    }
    // When Brain B is unreachable, tell the model the true, narrow reason
    // rather than let it guess — without this, a scene question with zero
    // context and zero explanation got answered "I don't have access to
    // your machine," a confident wrong claim about capability rather than
    // an honest statement about a background service being down. This is
    // the ONLY channel that reaches voice at all: there's no UI badge
    // equivalent in an audio conversation, so the model itself has to say
    // something true. Kept short — this isn't the ~1,170-token platform map,
    // it's one paragraph, and only appears on the (now rare, since Brain B
    // auto-starts with the app) turns where enrichment actually failed.
    if (!enrichment) {
      effectiveSystemInstruction +=
        '\n\n**Note: Mossy\'s knowledge/context service (Brain B) is not reachable right now.** You have no live Blender scene data, no citations, and no retrieval for this specific turn — not because you lack the capability to ever access them, but because that background service is down right now, for a reason unrelated to this question. If this question genuinely needs live scene/game-state data or cited documentation to answer well, say so plainly and specifically — e.g. "I can\'t read your Blender scene right now because my context service isn\'t running" — never claim you have no way to access the user\'s machine or Blender at all, which is not true. For questions that don\'t need any of that, just answer normally.';
    }

    const generateStart = Date.now();
    const response = await this._generateResponseCore(
      query, effectiveSystemInstruction, conversationHistory, voiceMode, signal,
      {
        ...localOptions,
        sceneContext: enrichment?.contextForGeneration ?? null,
        // Only fall back to the ~155K-char neuron dump when the turn needs
        // game data AND the Phase-1 Papyrus index didn't have it — a
        // ranked-and-found turn shouldn't ALSO carry the blunt dump, or
        // game-data turns end up more expensive than before this feature
        // existed instead of less. See EnrichmentResult.gameDataFound's
        // docstring.
        includeGameDataDump: !!enrichment?.gameDataRelated && !enrichment?.gameDataFound,
      },
    );
    const generateMs = Date.now() - generateStart;

    const sceneContextBytes = enrichment?.contextForGeneration
      ? JSON.stringify(enrichment.contextForGeneration).length : 0;
    const providerUsed = response.usedLocalFallback
      ? 'local (fallback — cloud unavailable)'
      : (localOptions?.preferCloud ? 'cloud (primary)' : 'local (primary)');

    if (!enrichment) {
      response.enrichmentUnavailable = true;
      recordTurnTrace({
        timestamp: turnStart, queryPreview: query.slice(0, 200), voiceMode,
        preferCloud: !!localOptions?.preferCloud, enrichmentRan: false, enrichmentUnavailable: true,
        mode: null, abstained: false, sceneRelated: null, appHelpRelated: null,
        retrievalAgreement: null, retrievalMargin: null, retrievalTier: null,
        usedSceneContext: false, sceneContextBytes: 0, hedged: null,
        usedLocalFallback: !!response.usedLocalFallback, providerUsed, enrichMs, generateMs,
        totalMs: Date.now() - turnStart, contractSuccess: null, contractLatencyMs: null,
      });
      return response;
    }

    // Brain B decides `hedged` purely from KB-retrieval confidence, computed
    // server-side before it has any idea which model will actually generate
    // the answer. That's a sound signal when the generator is itself
    // retrieval-bound (a local fallback model with no real general FO4
    // knowledge of its own) — but cloud generation draws on the model's own
    // broad training, not just what Brain B retrieved, so a weak KB match
    // doesn't mean a weak answer there. Found live: a detailed, accurate,
    // well-structured cloud-generated workflow answer prefixed with "I don't
    // have documentation directly covering this... treating that as a lead,
    // not a confirmed answer" — actively undermining a genuinely good
    // answer over a retrieval gap that never actually limited it.
    if (enrichment.hedged && enrichment.hedgePrefix && response.content && providerUsed !== 'cloud (primary)') {
      response.content = enrichment.hedgePrefix + response.content;
    }
    response.mode = enrichment.mode;
    response.diagnosis = enrichment.diagnosis ?? undefined;
    response.usedSceneContext = enrichment.usedSceneContext;
    response.addonOutdated = enrichment.addonOutdatedRelevant;
    if (enrichment.sources.length) {
      response.context = { ...(response.context || {}), citations: enrichment.sources };
    }

    const traceEntry: TurnTraceEntry = {
      timestamp: turnStart, queryPreview: query.slice(0, 200), voiceMode,
      preferCloud: !!localOptions?.preferCloud, enrichmentRan: true, enrichmentUnavailable: false,
      mode: enrichment.mode, abstained: false, sceneRelated: enrichment.sceneRelated,
      appHelpRelated: enrichment.appHelpRelated, retrievalAgreement: enrichment.retrievalAgreement,
      retrievalMargin: enrichment.retrievalMargin, retrievalTier: enrichment.retrievalTier,
      usedSceneContext: enrichment.usedSceneContext, sceneContextBytes, hedged: enrichment.hedged,
      usedLocalFallback: !!response.usedLocalFallback, providerUsed, enrichMs, generateMs,
      totalMs: Date.now() - turnStart, contractSuccess: null, contractLatencyMs: null,
    };
    recordTurnTrace(traceEntry);

    // Fire-and-forget — deliberately not awaited. See method docstring.
    if (response.content) {
      void sendContractAsync(brainBBaseUrl, query, response.content, enrichment, onContractReady, traceEntry);
    } else {
      // No answer text means /contract is never called at all — a caller
      // tracking a "pending" state from response.mode alone (e.g. a
      // check-question placeholder shown for mode==='teach' before this
      // resolves) needs the same definitive settle signal here as the
      // failure path inside sendContractAsync, or it's stuck forever.
      onContractReady?.({ checkQuestion: null, learnerSignal: null });
    }

    return response;
  },

  /** Last few turns' diagnostics (in-memory, this session only — the on-disk
   *  log at .mossy-desktop/ai-diagnostics.log is the durable copy). Read by
   *  the AI Pipeline Preflight panel; newest last. */
  getRecentTurns(): TurnTraceEntry[] {
    return [..._recentTurns];
  },

  /**
   * One panel, one button, plain-text output — reports the observed state of
   * every layer a real turn touches: Brain B, the Bridge, the Blender link,
   * which generation provider is actually active and why, and whether the
   * system instruction Mossy's persona depends on is even present.
   *
   * Every check here runs through the SAME renderer-side code the real app
   * uses (bridgeFetch, getFullSystemInstruction, getLocalProviderStatus) —
   * deliberately not main-process IPC or a script. The CSP bug earlier this
   * session survived every prior verification specifically because those
   * checks used curl from outside the renderer; curl doesn't traverse a CSP
   * allowlist, so it validated a request the app itself could never make. A
   * check that doesn't traverse the real path validates nothing.
   */
  async runAIPipelinePreflight(): Promise<{
    brainB: { reachable: boolean; version: string | null; edition: string | null; routes: string[]; hasEnrich: boolean; hasContract: boolean; curatedDocs: number | null; embeddingModel: string | null; error: string | null };
    bridge: { reachable: boolean; version: string | null; tokenAccepted: boolean | null; error: string | null };
    blender: { reachable: boolean; addonVersion: string | null; supportsGetContext: boolean | null; error: string | null };
    provider: { localProvider: string | null; localModel: string | null; cloudBackendConfigured: boolean; cloudReachable: boolean | null; cloudLatencyMs: number | null; cloudState: 'warm' | 'cold' | 'unreachable' | 'not-configured' | null; activeChoiceForChatVoice: string };
    systemInstruction: { length: number; hasIdentityBlock: boolean; hasPersonaRule: boolean };
    reportText: string;
  }> {
    const lines: string[] = [];
    lines.push('═══ MOSSY AI PIPELINE PREFLIGHT ═══');
    lines.push(new Date().toISOString());
    lines.push('');

    // ── Brain B ──────────────────────────────────────────────────────────
    const localSettings = await this.getLocalAiSettings();
    const brainBBaseUrl = String(localSettings.brainBBaseUrl || 'http://127.0.0.1:8766');
    const brainB: { reachable: boolean; version: string | null; edition: string | null; routes: string[]; hasEnrich: boolean; hasContract: boolean; curatedDocs: number | null; embeddingModel: string | null; error: string | null } =
      { reachable: false, version: null, edition: null, routes: [], hasEnrich: false, hasContract: false, curatedDocs: null, embeddingModel: null, error: null };
    try {
      const resp = await fetch(`${brainBBaseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data = await resp.json();
        brainB.reachable = data?.status === 'ok';
        brainB.version = data?.version ?? null;
        brainB.edition = data?.edition ?? null;
        brainB.routes = Array.isArray(data?.routes) ? data.routes : [];
        brainB.hasEnrich = brainB.routes.includes('/enrich');
        brainB.hasContract = brainB.routes.includes('/contract');
        brainB.curatedDocs = typeof data?.curated_docs === 'number' ? data.curated_docs : null;
        brainB.embeddingModel = data?.embedding_model ?? null;
      } else {
        brainB.error = `HTTP ${resp.status}`;
      }
    } catch (e: any) {
      brainB.error = String(e?.message || e);
    }
    lines.push('── Brain B ──');
    lines.push(`  reachable: ${brainB.reachable}`);
    lines.push(`  version: ${brainB.version ?? '(not reported — pre-2026-08-15 build)'}`);
    lines.push(`  edition: ${brainB.edition ?? 'unknown'}`);
    lines.push(`  routes exposed: ${brainB.routes.length ? brainB.routes.join(', ') : '(none reported)'}`);
    lines.push(`  /enrich present: ${brainB.hasEnrich}  /contract present: ${brainB.hasContract}`);
    lines.push(`  curated docs: ${brainB.curatedDocs ?? 'unknown'}`);
    lines.push(`  embedding model: ${brainB.embeddingModel ?? 'unknown'}`);
    if (brainB.error) lines.push(`  error: ${brainB.error}`);
    lines.push('');

    // ── Bridge (21337) + Blender (9999) — one authenticated call covers both:
    // the Bridge itself answering proves the Bridge+token, and its payload
    // (relayed from Blender over the add-on's own TCP link) proves Blender.
    const bridge: { reachable: boolean; version: string | null; tokenAccepted: boolean | null; error: string | null } =
      { reachable: false, version: null, tokenAccepted: null, error: null };
    try {
      const healthResp = await bridgeFetch('/health', { signal: AbortSignal.timeout(3000) });
      if (healthResp.ok) {
        const data = await healthResp.json();
        bridge.reachable = data?.status === 'online' || data?.status === 'ok';
        bridge.version = data?.version ?? null;
      } else {
        bridge.error = `HTTP ${healthResp.status}`;
      }
    } catch (e: any) {
      bridge.error = String(e?.message || e);
    }

    const blender: { reachable: boolean; addonVersion: string | null; supportsGetContext: boolean | null; error: string | null } =
      { reachable: false, addonVersion: null, supportsGetContext: null, error: null };
    try {
      const capResp = await bridgeFetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'capabilities' }),
        signal: AbortSignal.timeout(3000),
      });
      bridge.tokenAccepted = capResp.status !== 401;
      if (capResp.ok) {
        const outer = await capResp.json();
        if (outer?.status === 'success') {
          const inner = JSON.parse(String(outer?.response || '{}'));
          blender.reachable = inner?.status === 'success';
          blender.addonVersion = Array.isArray(inner?.addon_version) ? inner.addon_version.join('.') : null;
          blender.supportsGetContext = Array.isArray(inner?.supported_commands)
            ? inner.supported_commands.includes('get_context') : null;
        } else {
          blender.error = String(outer?.message || 'Blender not connected');
        }
      } else {
        blender.error = `HTTP ${capResp.status}`;
      }
    } catch (e: any) {
      blender.error = String(e?.message || e);
    }
    lines.push('── Bridge (port 21337) ──');
    lines.push(`  listening: ${bridge.reachable}`);
    lines.push(`  version: ${bridge.version ?? 'unknown'}`);
    lines.push(`  token accepted: ${bridge.tokenAccepted ?? 'not tested'}`);
    if (bridge.error) lines.push(`  error: ${bridge.error}`);
    lines.push('');
    lines.push('── Blender (port 9999, via Bridge) ──');
    lines.push(`  listening: ${blender.reachable}`);
    lines.push(`  add-on version: ${blender.addonVersion ?? 'unknown'}`);
    lines.push(`  get_context supported: ${blender.supportsGetContext ?? 'unknown'}`);
    if (blender.error) lines.push(`  note: ${blender.error}`);
    lines.push('');

    // ── Provider ─────────────────────────────────────────────────────────
    const localStatus = await this.getLocalProviderStatus();
    const settings = await (async () => {
      try {
        const api = (window.electron?.api || window.electronAPI) as any;
        return await api?.getSettings?.();
      } catch { return null; }
    })();
    const backendBaseUrl = String(settings?.backendBaseUrl || 'https://mossy.onrender.com').replace(/\/$/, '');
    const cloudBackendConfigured = !!settings?.backendTokenConfigured;
    const provider: { localProvider: string | null; localModel: string | null; cloudBackendConfigured: boolean; cloudReachable: boolean | null; cloudLatencyMs: number | null; cloudState: 'warm' | 'cold' | 'unreachable' | 'not-configured' | null; activeChoiceForChatVoice: string } =
      { localProvider: null, localModel: null, cloudBackendConfigured, cloudReachable: null, cloudLatencyMs: null, cloudState: null, activeChoiceForChatVoice: '' };
    if (localStatus.ok) {
      provider.localProvider = localStatus.provider;
      const anyStatus = localStatus as any;
      provider.localModel = localStatus.provider === 'ollama' ? String(localSettings.ollamaModel || '')
        : localStatus.provider === 'cosmos' ? String(localSettings.cosmosModel || anyStatus.models?.[0] || '')
        : String(localSettings.openaiCompatModel || anyStatus.models?.[0] || '');
    }
    if (!cloudBackendConfigured) {
      provider.cloudState = 'not-configured';
    } else {
      try {
        const cloudStart = Date.now();
        const cloudResp = await fetch(`${backendBaseUrl}/health`, { signal: AbortSignal.timeout(20000) });
        provider.cloudLatencyMs = Date.now() - cloudStart;
        provider.cloudReachable = cloudResp.ok;
        // No hard science behind 3s beyond "clearly not instant" — Render's
        // free tier cold-starts in 30-90s, so a fast response is unambiguously
        // warm and a slow-but-successful one is unambiguously not, with a lot
        // of daylight between the two; this doesn't need to be precise.
        provider.cloudState = !cloudResp.ok ? 'unreachable' : (provider.cloudLatencyMs > 3000 ? 'cold' : 'warm');
      } catch (e: any) {
        provider.cloudState = 'unreachable';
      }
    }
    provider.activeChoiceForChatVoice = (provider.cloudState === 'warm' || provider.cloudState === 'cold')
      ? `cloud (backend reachable, ${provider.cloudState})`
      : provider.localProvider
        ? `local fallback: ${provider.localProvider}${provider.localModel ? ` (${provider.localModel})` : ''} — cloud unavailable (${provider.cloudState})`
        : `NONE — cloud unavailable (${provider.cloudState}) and no local provider detected`;
    lines.push('── Provider (chat/voice policy: cloud primary, local fallback) ──');
    lines.push(`  cloud backend configured: ${provider.cloudBackendConfigured}`);
    lines.push(`  cloud reachable: ${provider.cloudReachable ?? 'not tested'}  (${provider.cloudLatencyMs ?? '?'}ms, ${provider.cloudState})`);
    lines.push(`  local provider detected: ${provider.localProvider ?? 'none'}${provider.localModel ? ` — model: ${provider.localModel}` : ''}`);
    lines.push(`  ACTIVE for chat/voice right now: ${provider.activeChoiceForChatVoice}`);
    lines.push('');

    // ── System instruction ──────────────────────────────────────────────
    const fullInstruction = getFullSystemInstruction();
    const systemInstruction = {
      length: fullInstruction.length,
      hasIdentityBlock: fullInstruction.includes('WHO YOU ARE (always true'),
      hasPersonaRule: fullInstruction.includes('IDENTITY RULE'),
    };
    lines.push('── System instruction ──');
    lines.push(`  length: ${systemInstruction.length} chars`);
    lines.push(`  identity block present: ${systemInstruction.hasIdentityBlock}`);
    lines.push(`  persona/identity rule present: ${systemInstruction.hasPersonaRule}`);
    if (systemInstruction.length < 500) {
      lines.push('  ⚠ WARNING: length near zero — getFullSystemInstruction() is returning little or nothing. This is exactly the shape today\'s persona bug would have shown up as immediately.');
    }
    lines.push('');
    lines.push('═══ END PREFLIGHT ═══');

    const reportText = lines.join('\n');
    try {
      const api = (window.electron?.api || window.electronAPI) as any;
      void api?.writeDiagnosticLog?.(`[preflight]\n${reportText}\n`);
    } catch { /* non-critical */ }

    return { brainB, bridge, blender, provider, systemInstruction, reportText };
  },

  /**
   * Generates a response using the local Ollama service or Groq Cloud API —
   * whichever the user has configured, completely independent of Brain B
   * enrichment (see the public generateResponse() wrapper above, which is
   * what every caller should actually use). This is the pre-2026-08-15
   * dispatch logic, unchanged except for the removed Brain B branch (Brain B
   * is no longer a selectable generation provider — see
   * docs/ARCHITECTURE.md's "Target layer model").
   * Pass `conversationHistory` (prior messages, not including the current query) to
   * maintain multi-turn conversation context.
   * Pass `voiceMode: true` for voice queries — skips the response guard (which makes
   * a second API call) to keep voice latency from doubling to 100+ seconds.
   */
  async _generateResponseCore(query: string, systemInstruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>, voiceMode = false, signal?: AbortSignal, localOptions?: { timeoutMs?: number; think?: boolean; preferCloud?: boolean; sceneContext?: Record<string, unknown> | null; includeGameDataDump?: boolean }): Promise<AIResponse> {
    const localStatus = await this.getLocalProviderStatus();
    const localSettings = await this.getLocalAiSettings();

    // --- SELF-IMPROVEMENT: Include learning insights ---
    let enhancedSystemInstruction = systemInstruction;
    const learningInsights = selfImprovementEngine.getLearningInsights();
    if (learningInsights) {
      enhancedSystemInstruction += '\n\n### SELF-IMPROVEMENT INSIGHTS:\n' + learningInsights;
    }

    // --- SESSION MEMORY: Inject past session summaries for continuity ---
    // Voice mode: 1 summary only (keeps prompt lean); text/chat: full 5
    const sessionMemoryCtx = this.getSessionMemoryContext(voiceMode ? 1 : 5);
    if (sessionMemoryCtx) {
      enhancedSystemInstruction += sessionMemoryCtx;
    }

    // --- KNOWLEDGE & PROCESS INJECTION ---
    // voiceMode: skip the heavy context injections that bloat the system prompt
    // to 50,000 chars and cause 25-30s Groq response times. Voice needs fast
    // replies — a lean prompt (~3,000 chars) gets answers in 2-4s instead.
    let injectedContext = "";
    let webSearchFailureLogged = false;
    let webSearchUnavailable = false;
    const recordWebSearchFailure = (reason: string) => {
      if (webSearchFailureLogged) return;
      webSearchFailureLogged = true;
      webSearchUnavailable = true;
      console.warn('[LocalAIEngine] Web search unavailable:', reason);
    };

    if (!voiceMode) {
    // Inject Process & Hardware Awareness
    const electronApiAny = (window as any).electron?.api;
    if (typeof electronApiAny?.getRunningProcesses === 'function') {
      try {
        const processes = await electronApiAny.getRunningProcesses();
        const blenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
        // Permission-filtered, not a raw dump: a tool the user explicitly denied
        // (checked === false) must never be presented as available to use.
        const approvedTools = getApprovedToolsFromStorage();
        const approvedDetected = approvedTools.filter((t) => t.checked !== false && t.path);
        const deniedTools = approvedTools.filter((t) => t.checked === false);
        const isDenied = (keyword: string) =>
          deniedTools.some((t) => t.name.toLowerCase().includes(keyword));
        const systemProfileRaw = localStorage.getItem('mossy_system_profile');
        let userSettings: any = null;

        try {
          if (window.electronAPI?.getSettings) {
            userSettings = await window.electronAPI.getSettings();
          }
        } catch (e) {
          console.error('[LocalAIEngine] Failed to get settings:', e);
        }

        if (processes.length > 0 || blenderLinked || approvedTools.length > 0 || systemProfileRaw || userSettings) {
          injectedContext += "\n### INSTALLED SOFTWARE & CREATIVE PIPELINE:\n";

          // --- HARDWARE STATUS ---
          if (systemProfileRaw) {
            const profile = JSON.parse(systemProfileRaw);
            injectedContext += `- [SYSTEM SCAN STATUS]: COMPLETE\n`;
            injectedContext += `- [HARDWARE]: ${profile.cpu}, ${profile.gpu}, ${profile.ram}GB RAM`;
            if (profile.vram) injectedContext += `, ${profile.vram}GB VRAM`;
            if (profile.motherboard) injectedContext += `, MB: ${profile.motherboard}`;
            if (profile.os) injectedContext += ` (${profile.os})`;
            injectedContext += "\n";

            if (profile.storageDrives && profile.storageDrives.length > 0) {
              injectedContext += "- [STORAGE]: " + profile.storageDrives.map((d: any) => `${d.device} (${d.free}GB/${d.total}GB)`).join(", ") + "\n";
            }
          } else {
            injectedContext += `- [SYSTEM SCAN STATUS]: Hardware profile not loaded in this session. The scan may have been run previously. Do NOT ask the user to redo the scan — they can refresh scan data from Settings > System Monitor if needed.\n`;
          }

          if (userSettings) {
            injectedContext += "- [DESKTOP APPLICATIONS - CONFIGURED, PERMISSION GRANTED]:\n";
            if (userSettings.xeditPath && !isDenied('xedit')) injectedContext += `  * xEdit: ${userSettings.xeditPath}\n`;
            if (userSettings.nifSkopePath && !isDenied('nifskope')) injectedContext += `  * NifSkope: ${userSettings.nifSkopePath}\n`;
            if (userSettings.creationKitPath && !isDenied('creation kit')) injectedContext += `  * Creation Kit: ${userSettings.creationKitPath}\n`;
            if (userSettings.blenderPath && !isDenied('blender')) injectedContext += `  * Blender: ${userSettings.blenderPath}\n`;
            if (userSettings.mo2Path && !isDenied('mod organizer')) injectedContext += `  * Mod Organizer 2: ${userSettings.mo2Path}\n`;
            if (userSettings.vortexPath && !isDenied('vortex')) injectedContext += `  * Vortex: ${userSettings.vortexPath}\n`;
          }

          if (blenderLinked) injectedContext += "- [STATUS] Blender Neural Link: ACTIVE\n";

          if (approvedDetected.length > 0) {
            injectedContext += "- [SCANNED TOOLS - USER GRANTED PERMISSION TO USE]:\n";
            approvedDetected.forEach((a) => {
              injectedContext += `  * ${a.name} (Path: ${a.path})\n`;
            });
          }

          if (deniedTools.length > 0) {
            injectedContext += "- [TOOLS USER DENIED PERMISSION FOR - DO NOT USE OR RECOMMEND THESE]:\n";
            deniedTools.forEach((a) => {
              injectedContext += `  * ${a.name}\n`;
            });
          }

          if (processes.length > 0) {
            injectedContext += "- [RUNNING NOW (SYSTEM PROCESSES)]: " + processes.map((p: any) => `${p.name} (Active Application)`).join(", ") + "\n";
          }
          injectedContext += "\n";
        }
      } catch (e) {
        console.error('[LocalAIEngine] Hardware/software context injection error:', e);
      }
    }

    // Inject Working Memory (Persistence)
    const workingMemory = localStorage.getItem('mossy_working_memory');
    if (workingMemory) {
      injectedContext += `\n### WORKING MEMORY (LONG-TERM CONTEXT):\n${workingMemory}\n`;
    }

    // Knowledge Vault — full context for text/chat mode
    const manifest = buildKnowledgeManifestForModel();
    const relevant = buildRelevantKnowledgeVaultContext(query, { maxItems: 8, maxChars: 6000 });
    if (manifest || relevant) {
      injectedContext += "\n### KNOWLEDGE VAULT (Loaded):\n";
      if (manifest) injectedContext += manifest + "\n";
      if (relevant) injectedContext += relevant + "\n";
    }
    } else {
      // Voice mode: inject only the most relevant vault snippet (keeps prompt lean)
      const voiceRelevant = buildRelevantKnowledgeVaultContext(query, { maxItems: 2, maxChars: 1200 });
      if (voiceRelevant) injectedContext += "\n### KNOWLEDGE VAULT:\n" + voiceRelevant + "\n";
    }
    const citations = !voiceMode
      ? getRelevantKnowledgeVaultItems(query, { maxItems: 6 })
      : getRelevantKnowledgeVaultItems(query, { maxItems: 2 });

    // -----------------------------------------------------------------------
    // WEB SEARCH — automatically fetch live information when the user's query
    // needs up-to-date or specific Fallout 4 data that may not be in the vault.
    // The main process does the real HTTPS fetch; we inject the results here so
    // the AI receives them as grounded context rather than making things up.
    // The raw result is stored in `cachedWebSearchResult` so the response guard
    // can reuse it without making a second network call.
    // -----------------------------------------------------------------------
    // Voice mode: skip web search entirely (saves 2-5s and keeps prompt lean)
    if (voiceMode) {
      webSearchUnavailable = true;
      webSearchFailureLogged = true;
    }

    const webSearchTriggers = [
      // Multi-word explicit web/search phrases only — single words like 'update',
      // 'current', 'recent', 'latest', 'news', 'browse', 'fetch', 'scan' are
      // intentionally excluded: they fire constantly on ordinary questions like
      // "do we need to add the updated information?" or "scan my mod list".
      'search for', 'look up', 'find online', 'search the web', 'search online',
      'search the internet', 'google it', "what's new online", 'find on nexus',
      'wiki page', 'fandom wiki', 'nexus mod page', 'find information online',
      // Additional natural-language phrases users commonly say when they want
      // Mossy to go online and fetch live data.
      'go online', 'check online', 'look it up online',
      'look online', 'real-time data', 'live data', 'live info', 'live information',
      'check the web', 'check the internet',
      'from the web', 'from the internet', 'from online', 'on the web',
      'on the internet', 'on nexus mods', 'on fandom',
      // Explicit user phrases asking Mossy to go online
      'can you search', 'can you search online', 'can you look online',
      'can you find online', 'can you check online', 'can you check the web',
      'can you check the internet', 'can you look it up',
      'are you able to search', 'are you able to look up', 'are you able to find online',
      'access the internet', 'get online', 'web search', 'internet search',
      // NOTE: 'look for', 'find me', 'get me', 'fetch me', 'search for',
      // 'up to date', 'up-to-date', 'most recent', 'newest', 'new information'
      // were removed — too broad, fire on completely unrelated voice queries.
    ];
    // NOTE: this regex is intentionally kept in sync with the fo4Terms pattern
    // in src/electron/main.ts (web-search handler). Update both if you change it.
    const fo4TermsRenderer = /fallout\s*4|fallout4|fo4|papyrus|bethesda|creation\s*kit|vault|wasteland|commonwealth|nexus|xedit|nifskope|bodyslide/i;
    const lowerQuery = query.toLowerCase();
    const needsWebSearch = webSearchTriggers.some((kw) => lowerQuery.includes(kw));
    // Cached result from the initial web search — reused by the response guard to
    // avoid a redundant second network call when the guard retry is triggered.
    let cachedWebSearchResult: WebSearchResult | null = null;
    if (needsWebSearch) {
      console.log('[LocalAIEngine] 🌐 WEB SEARCH TRIGGER DETECTED - Query:', query.substring(0, 100));
      try {
        const webApi = (window.electron?.api || window.electronAPI) as any;
        if (typeof webApi?.webSearch === 'function') {
          const searchType = fo4TermsRenderer.test(query) ? 'wiki' : undefined;
          console.log('[LocalAIEngine] Calling webSearch with type:', searchType || 'general');

          // Wrap web search in a 5-second timeout to avoid hanging if DNS is broken
          const webSearchPromise = webApi.webSearch(query, searchType);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Web search timeout (5s)')), 5000)
          );
          const searchResult = await Promise.race([webSearchPromise, timeoutPromise]);

          // Only use the result when it's successful AND has real content
          // (empty:true means the API had no instant answer — don't inject that noise)
          if (searchResult?.success && searchResult?.text && !searchResult?.empty) {
            console.log('[LocalAIEngine] ✅ WEB SEARCH SUCCESS - Results length:', searchResult.text.length, 'chars | Source:', searchResult.source);
            cachedWebSearchResult = { text: searchResult.text, url: searchResult.url, source: searchResult.source };
            injectedContext += '\n### LIVE WEB SEARCH RESULTS (use this to answer the user):\n';
            injectedContext += searchResult.text + '\n';
            if (searchResult.url) {
              injectedContext += `Source: ${searchResult.source || 'Web'} — ${searchResult.url}\n`;
            }
            // Persist the fetched web content to the Knowledge Vault so it is
            // available in future sessions (this is the "memory bank" write).
            try {
              const vaultRaw = localStorage.getItem('mossy_knowledge_vault');
              const vault: KnowledgeVaultItem[] = vaultRaw ? JSON.parse(vaultRaw) : [];
              const itemTitle = `[Web] ${query.substring(0, 80)}`;
              // Skip if a very similar item was already saved in the last 7 days.
              if (!isDuplicateVaultEntry(vault, itemTitle)) {
                // Include query words as tags so follow-up queries score this item well.
                // Threshold >= 2 to capture short but important FO4 terms (CK, NIF, FO4, ESP, DDS).
                const topicTags = query.toLowerCase()
                  .replace(/[^a-z0-9\s]/g, ' ')
                  .split(/\s+/)
                  .filter((w) => w.length >= 2)
                  .slice(0, 8);
                vault.push({
                  id: `auto-web-${Date.now()}`,
                  title: itemTitle,
                  content: searchResult.text,
                  source: searchResult.url || searchResult.source || 'Web',
                  trustLevel: 'community',
                  tags: ['web-search', 'auto-fetch', ...topicTags],
                  date: new Date().toISOString(),
                });
                const pruned = pruneAutoFetchedVaultItems(vault);
                localStorage.setItem('mossy_knowledge_vault', JSON.stringify(pruned));
                console.log('[LocalAIEngine] ✅ Web search results saved to Knowledge Vault');
              } else {
                console.log('[LocalAIEngine] ℹ️ Skipped vault save — duplicate entry for:', itemTitle.substring(0, 60));
              }
            } catch (vaultErr) {
              console.warn('[LocalAIEngine] Failed to persist web search results to Knowledge Vault:', vaultErr);
            }
          } else if (searchResult?.empty) {
            // DuckDuckGo returned no useful instant answer — treat as unavailable
            // so the response guard can retry with different context.
            console.warn('[LocalAIEngine] Web search returned empty result (no instant answer)');
            recordWebSearchFailure('No instant answer available');
          } else {
            console.warn('[LocalAIEngine] Web search returned no results:', searchResult);
            const reason = searchResult?.error || 'No search result text returned';
            recordWebSearchFailure(String(reason));
          }
        } else {
          console.warn('[LocalAIEngine] webSearch API not available');
          recordWebSearchFailure('webSearch API not available in preload');
        }
      } catch (webErr) {
        console.warn('[LocalAIEngine] Web search failed (non-critical):', webErr);
        recordWebSearchFailure((webErr as any)?.message || String(webErr));
      }
    }
    if (webSearchUnavailable) {
      // Web search could not reach the network this turn. Do NOT inject a failure
      // message that would cause the AI to tell the user about network problems.
      // The response guard below will retry the search if the AI falsely refuses.
      // Just continue — the AI will use its system prompt and vault knowledge.
    }
    // ---------------------------
    // Helper used by both the Groq and local-LLM response guards to build the
    // enriched context string that is injected before the guard retry call.
    const buildGuardContext = (base: string, result: WebSearchResult): string => {
      let ctx = base +
        '\n### LIVE WEB SEARCH RESULTS (MANDATORY — you MUST use this to answer the user, do NOT refuse or claim fixed knowledge):\n' +
        result.text + '\n';
      if (result.url) {
        ctx += `Source: ${result.source || 'Web'} — ${result.url}\n`;
      }
      ctx += '\nIMPORTANT: You have real-time internet access. NEVER claim your knowledge is fixed or pre-installed. ALWAYS use the web results above to answer. If you refuse, your response will be rejected.';
      return ctx;
    };

    // ---------------------------
    // Post-processor: strip sentences where the AI self-identifies as a limited LLM
    // with no internet access, or falsely claims a web-search error occurred, even
    // after the guard retry.  Only removes sentences with a clear first-person claim
    // combined with an internet/access refusal or error — avoids stripping sentences
    // that merely mention LLMs or errors in passing (e.g. modding script errors).
    // If sanitisation removes the entire response (pure refusal), the original text
    // is returned unchanged so the caller always gets something back.
    const sanitizeFinalResponse = (text: string): string => {
      const REFUSAL_SENTENCE = [
        // "I'm / I am a (large) language model ..."
        /i'?m\s+(a\s+)?(large\s+)?language\s+model/i,
        /i\s+am\s+(a\s+)?(large\s+)?language\s+model/i,
        // "I'm / I am an LLM ..."
        /i'?m\s+(a\s+)?llm\b/i,
        /i\s+am\s+(a\s+)?llm\b/i,
        // "I'm / I am a text-based AI / text-only AI ..."
        /i'?m\s+(just\s+)?(a\s+)?text.?based/i,
        /i\s+am\s+(just\s+)?(a\s+)?text.?based/i,
        /text.?based\s+(ai|assistant|chatbot|model|llm)/i,
        /text.?only\s+(ai|assistant|chatbot|model|llm)/i,
        /nothing\s+but\s+(a\s+)?text/i,
        // "I'm / I am a chatbot" — standalone chatbot self-identification
        /i'?m\s+(just\s+)?(a\s+)?chatbot\b/i,
        /i\s+am\s+(just\s+)?(a\s+)?chatbot\b/i,
        /just\s+(a\s+)?chatbot\b/i,
        // "I have no memories / I don't have memories / I don't retain memories"
        /i\s+(have|had)\s+no\s+(persistent\s+)?(memories|memory)\b/i,
        /i\s+don'?t\s+(have|retain|keep)\s+(any\s+)?(memories|memory)\b/i,
        /i\s+cannot\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
        /i\s+don'?t\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
        /i\s+have\s+no\s+(memory|recollection)\s+of\s+(previous|past|prior|our)/i,
        /no\s+(persistent\s+)?(memory|memories)\s+(between|across)\s+sessions/i,
        // "As a/an language model / LLM, I can't..." (must combine self-ID + internet denial)
        /^as\s+(a\s+|an?\s+)?(large\s+)?(language\s+model|llm).{0,60}(cannot|can'?t|unable|don'?t\s+have).*(internet|web|access)/i,
        /^being\s+(a\s+|an?\s+)?(large\s+)?(language\s+model|llm).{0,60}(cannot|can'?t|unable|don'?t\s+have).*(internet|web|access)/i,
        // Direct internet refusal
        /i\s+(cannot|can'?t|am\s+unable\s+to)\s+(access|browse|go\s+online|reach)\s+the\s+(internet|web)/i,
        /i\s+don'?t\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
        /i\s+(do\s+not|lack)\s+(internet\s+access|real.?time\s+access)/i,
        /i\s+don'?t\s+have\s+real.?time\s+access/i,
        /i\s+can'?t\s+go\s+online/i,
        /i\s+cannot\s+go\s+online/i,
        // False web-search error claims — the AI says "I encountered an error searching"
        // even when live results were injected into its context.  These are hallucinated
        // apologies that mix with real information and confuse the user.
        /\bi\s+(encountered|ran\s+into)\s+(an?\s+)?(error|issue|problem)\s+(while\s+)?(searching|accessing|retrieving|fetching)/i,
        /\bi\s+(was\s+unable|wasn'?t\s+able|couldn'?t|could\s+not)\s+to?\s*(successfully\s+)?(retrieve|access|search|fetch|look\s+up)\s+(the\s+)?(latest|real.?time|current|up.?to.?date|live)/i,
        /\bi\s+had\s+(trouble|difficulty|difficulties)\s+(accessing|searching|retrieving|fetching)\s+(the\s+)?(web|internet|online\s+information|real.?time\s+data)/i,
        /unfortunately,?\s*i\s+(was\s+unable|couldn'?t|was\s+not\s+able|am\s+unable|am\s+not\s+able)\s+to\s+(access|retriev|search|fetch)/i,
        /\bi\s+apologize.{0,60}(unable|couldn'?t|could\s+not).{0,60}(search|access|retriev|fetch|internet|web)/i,
        /\bmy\s+(web\s+search|search\s+attempt|internet\s+access)\s+(failed|timed\s+out|resulted\s+in\s+an?\s+error)/i,
      ];
      // Split on sentence-ending punctuation followed by whitespace.
      // The final sentence (no trailing whitespace) is preserved naturally since the
      // split only occurs where whitespace exists; empty strings are filtered below.
      const sentences = text.split(/(?<=[.!?])\s+/);
      const cleaned = sentences.filter((s) => {
        const trimmed = s.trim();
        return trimmed.length > 0 && !REFUSAL_SENTENCE.some((p) => p.test(trimmed));
      });
      const result = cleaned.join(' ').trim();
      // Safety: if sanitisation would preserve less than 30% of the original text, the
      // response was probably an unrecoverable pure-refusal — return the original unchanged
      // so the caller always receives a non-empty string rather than a misleadingly-short fragment.
      return result.length >= text.length * MIN_SANITIZED_TEXT_RATIO ? result : text;
    };
    // RESPONSE GUARD: patterns that indicate Mossy falsely claimed she can't access the
    // internet.  Checked after the AI responds; if matched we retry once with live web
    // results injected so the user gets real information instead of a false refusal.
    const INTERNET_REFUSAL_PATTERNS = [
      // === CORE INTERNET DENIAL PATTERNS ===
      /i\s+cannot\s+access\s+the\s+internet/i,
      /i\s+can'?t\s+access\s+the\s+internet/i,
      /i\s+(am\s+)?unable\s+to\s+access\s+the\s+internet/i,
      /i\s+don'?t\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
      /i\s+do\s+not\s+have\s+(internet\s+access|access\s+to\s+the\s+internet)/i,
      /i\s+cannot\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+can'?t\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+(am\s+)?unable\s+to\s+(browse|connect\s+to)\s+the\s+(web|internet)/i,
      /i\s+cannot\s+go\s+online/i,
      /i\s+can'?t\s+go\s+online/i,
      /i\s+don'?t\s+have\s+real.?time\s+(access|data|information)/i,
      /i\s+cannot\s+access\s+online\s+resources/i,
      /i\s+can'?t\s+access\s+online\s+resources/i,
      /i\s+don'?t\s+have\s+the\s+ability\s+to\s+(browse|access|search|go\s+online)/i,
      /i\s+am\s+not\s+able\s+to\s+(browse|access|search|go\s+online)/i,
      /i\s+can'?t\s+(search|look\s+up|find)\s+(online|web|internet)/i,
      /i\s+cannot\s+(search|look\s+up|find)\s+(online|web|internet)/i,

      // === LLM/AI SELF-IDENTIFICATION (explicit "I am/I'm" required to avoid false positives) ===
      /\bi'?m\s+(a\s+)?llm\b/i,
      /\bi\s+am\s+(a\s+)?llm\b/i,
      /\bi'?m\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bi\s+am\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bi'?m\s+(a\s+)?base\s+llm\b/i,
      /\bi\s+am\s+(a\s+)?base\s+llm\b/i,
      /\bi'?m\s+(a\s+|an\s+)?ai\s+(assistant|chatbot|model|system)\b/i,
      /\bi\s+am\s+(a\s+|an\s+)?ai\s+(assistant|chatbot|model|system)\b/i,

      // === "JUST A" PATTERNS ===
      /\bjust\s+(a\s+)?llm\b/i,
      /\bjust\s+(a\s+)?(large\s+)?language\s+model\b/i,
      /\bjust\s+(a\s+)?base\s+llm\b/i,
      /\bjust\s+(a\s+)?text.?based\s+(ai|assistant|chatbot|model)\b/i,

      // === TEXT-BASED / TEXT-ONLY AI ("nothing but a text-based AI") ===
      /text.?based\s+(ai|assistant|chatbot|model|llm)/i,
      /text.?only\s+(ai|assistant|chatbot|model|llm)/i,
      /nothing\s+but\s+(a\s+)?text/i,
      /i'?m\s+(a\s+|just\s+a\s+)?text.?based/i,
      /i\s+am\s+(a\s+|just\s+a\s+)?text.?based/i,
      /only\s+(a\s+)?text.?based/i,

      // === CHATBOT SELF-IDENTIFICATION ===
      /i'?m\s+(just\s+)?(a\s+)?chatbot\b/i,
      /i\s+am\s+(just\s+)?(a\s+)?chatbot\b/i,
      /just\s+(a\s+)?chatbot\b/i,

      // === NO MEMORIES / CANNOT RETAIN MEMORIES ===
      /i\s+(have|had)\s+no\s+(persistent\s+)?(memories|memory)\b/i,
      /i\s+don'?t\s+(have|retain|keep)\s+(any\s+)?(memories|memory)\b/i,
      /i\s+cannot\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
      /i\s+don'?t\s+(remember|retain|recall)\s+(conversations|past|previous|prior)/i,
      /i\s+have\s+no\s+(memory|recollection)\s+of\s+(previous|past|prior|our)/i,
      /no\s+(persistent\s+)?(memory|memories)\s+(between|across)\s+sessions/i,
      /i\s+(lack|have\s+no)\s+(persistent|long.?term)\s+(memory|memories)/i,

      // === NO ACCESS / CANNOT CAPABILITY PATTERNS ===
      /i\s+(do\s+not|don'?t)\s+have\s+(the\s+)?(ability|capability)\s+to\s+(access|browse|search|go\s+online)/i,
      /cannot\s+(access|browse|search|go\s+online)/i,
      /can'?t\s+(access|browse|search|go\s+online)/i,
      /no\s+(internet|web|online)\s+access/i,

      // === PRE-INSTALLED / FIXED KNOWLEDGE ===
      /my\s+(data|memory|knowledge|model)\s+(was|is)\s+pre.?installed/i,
      /all\s+of\s+my\s+(data|memory|knowledge)\s+(was|is)\s+pre.?installed/i,
      /my\s+(model|knowledge\s+base)\s+(is|was)\s+fixed/i,
      /(fixed|static|pre.?installed)\s+(model|knowledge|data|llm)/i,
      /my\s+training\s+data\s+(cutoff|ends|limited)/i,

      // === REAL-TIME REFUSALS ===
      /i\s+cannot\s+(review|retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+can'?t\s+(review|retain)\s+(data|information)\s+in\s+real.?time/i,
      /i\s+lack\s+(real.?time|live)\s+(access|data)/i,
      /i\s+(have|had)\s+no\s+real.?time\s+(access|data)/i,

      // === "WASN'T CREATED/DESIGNED/BUILT FOR" ===
      /(wasn'?t|was\s+not|not|am\s+not)\s+(created|designed|built|made)\s+for.*(internet|web|online|access)/i,

      // === CONTEXTUAL DENIALS (as/being a...) ===
      /as\s+an?\s+(ai|language\s+model|llm)[,.\s].*\b(cannot|can'?t|unable|lack|don'?t\s+have).*(internet|web|access)/i,
      /being\s+an?\s+(ai|language\s+model|llm)[,.\s].*\b(cannot|can'?t|unable|lack|don'?t\s+have).*(internet|web|access)/i,

      // === FINAL CATCH-ALL ===
      // If it mentions LLM or "language model" anywhere AND mentions internet inability
      /(llm|language\s+model|ai\s+model)[\s\S]{0,200}(cannot|can'?t|unable|lack|no\s+access|don'?t\s+have).*(internet|web|online|access|browse)/i,
      /(cannot|can'?t|unable|lack|no\s+access|don'?t\s+have).*(internet|web|online|access)[\s\S]{0,200}(llm|language\s+model|ai\s+model)/i,
    ];

    // LOCAL FIRST: Ollama (Gemma 4) is the primary brain for all non-chat features
    // (background/automation callers like SelfImprovementEngine.ts, AIModAssistant.tsx)
    // — free, fast, no network dependency, and those callers don't need Mossy's full
    // persona/quality. Groq cloud is the fallback only if local is unavailable, for them.
    //
    // Mossy AI Chat (ChatInterface) and voice (LiveContext) are the two platforms that
    // should go cloud-first instead — but this function has no way to know which caller
    // invoked it, so the flag above applied to EVERYONE, silently overriding that intent.
    // Found live: with Ollama running (true for any dev machine, false for most real
    // users — this made the bug look worse/more universal than it actually is), voice
    // and chat both got answered by whatever small local model was configured
    // (gemma2:9b here) instead of Mossy's real primary. A 9B local model doesn't
    // reliably carry a system prompt this large — it dropped the persona/capability
    // instructions entirely and answered as a generic assistant. Callers now opt in via
    // localOptions.preferCloud; ChatInterface and LiveContext pass it, others don't.
    //
    // koboldcpp/fo4bridge are the one exception: the cloud-primary path's own local-
    // fallback block below only knows ollama/cosmos/openai_compat, so those two stay
    // local-first regardless of preferCloud rather than silently losing their routing.
    const provider = (localStatus as any).provider as string | undefined;
    const localPrimaryEligible = !localOptions?.preferCloud || provider === 'koboldcpp' || provider === 'fo4bridge';
    if (localStatus.ok && localPrimaryEligible) {
      try {
        const api = (window.electron?.api || window.electronAPI) as any;

        // Embed prior conversation history in the prompt for context.
        // Local providers (Ollama, LM Studio, Cosmos) are called via the mlLlmGenerate IPC
        // which accepts a single prompt string, so history is serialised as dialogue text.
        // The Groq/OpenAI cloud path below uses the structured messages array format instead.
        let historyText = '';
        const safeHistory = conversationHistory ?? [];
        if (safeHistory.length > 0) {
          historyText = '\n\nConversation so far:\n' + safeHistory
            .filter(m => m.content && m.content.trim())
            .map(m => m.role === 'user' ? `User: ${m.content}` : `Mossy: ${m.content}`)
            .join('\n') + '\n';
        }
        const prompt = buildPromptForLocalModel(enhancedSystemInstruction, localOptions?.sceneContext, injectedContext, historyText, query);

        const localStatusAny = localStatus as any;

        // KoboldCPP — OpenAI-compatible endpoint on port 5001
        if (provider === 'koboldcpp') {
          const messages: Array<{ role: string; content: string }> = [
            { role: 'system', content: enhancedSystemInstruction + injectedContext },
            ...(conversationHistory ?? []).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: query },
          ];
          const resp = await fetch('http://127.0.0.1:5001/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tinyllama', messages, max_tokens: 512, temperature: 0.7 }),
            signal,
          });
          if (!resp.ok) throw new Error(`KoboldCPP HTTP ${resp.status}`);
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          return { content: text || 'KoboldCPP returned an empty response.' };
        }

        // FO4 Advanced AI bridge — llama-cpp-python inline on port 28485
        if (provider === 'fo4bridge') {
          const resp = await fetch('http://127.0.0.1:28485/generate/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: query,
              system: enhancedSystemInstruction + injectedContext,
              max_tokens: 512,
            }),
            signal,
          });
          if (!resp.ok) throw new Error(`FO4 Bridge HTTP ${resp.status}`);
          const data = await resp.json();
          return { content: data?.text || 'Bridge returned an empty response.' };
        }

        const model = provider === 'ollama'
          ? String(localSettings.ollamaModel || 'llama3')
          : provider === 'cosmos'
            ? String(localSettings.cosmosModel || localStatusAny.models?.[0] || '')
            : String(localSettings.openaiCompatModel || localStatusAny.models?.[0] || '');

        if (!model.trim()) {
          return { content: 'Local AI is detected but no model is selected. Configure a model in Local Capabilities.' };
        }

        const baseUrl = provider === 'ollama'
          ? String(localSettings.ollamaBaseUrl || 'http://127.0.0.1:11434')
          : provider === 'cosmos'
            ? String(localSettings.cosmosBaseUrl || '')
            : String(localSettings.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1');

        const resp = await api.mlLlmGenerate({
          provider,
          model,
          baseUrl,
          prompt,
          timeoutMs: localOptions?.timeoutMs,
          think: localOptions?.think,
        });

        if (resp?.ok) {
          let responseContent = String(resp.text || '');

          // Apply the same response guard as the Groq path — local models revert to
          // base-LLM behaviour just as often and need the same correction.
          // Skipped in voice mode (see Groq path comment above).
          if (!voiceMode && INTERNET_REFUSAL_PATTERNS.some((p) => p.test(responseContent))) {
            console.warn('[LocalAIEngine] ⚠️ RESPONSE GUARD (local) — AI falsely refused internet access');
            try {
              const guardWebApiLocal = (window.electron?.api || window.electronAPI) as any;
              if (typeof guardWebApiLocal?.webSearch === 'function') {
                try {
                  const guardSearchPromise = guardWebApiLocal.webSearch(query);
                  const guardTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Guard web search timeout (3s)')), 3000)
                  );
                  const guardSearch = await Promise.race([guardSearchPromise, guardTimeoutPromise]);
                  if (guardSearch?.success && guardSearch?.text && !guardSearch?.empty) {
                    const enrichedContext = buildGuardContext(injectedContext, guardSearch);
                    const retryPrompt = `${enhancedSystemInstruction}${enrichedContext}${historyText}\nUser: ${query}\n\nMossy's Response:`;
                    const retryResp = await api.mlLlmGenerate({ provider, model, baseUrl, prompt: retryPrompt, timeoutMs: localOptions?.timeoutMs, think: localOptions?.think });
                    if (retryResp?.ok && retryResp.text) {
                      responseContent = String(retryResp.text);
                      console.log('[LocalAIEngine] ✅ Local guard retry successful');
                    }
                  }
                } catch (guardTimeoutErr) {
                  console.warn('[LocalAIEngine] Guard web search timeout, skipping retry:', guardTimeoutErr);
                }
              }
            } catch (localGuardErr) {
              console.warn('[LocalAIEngine] Local response-guard retry failed (non-critical):', localGuardErr);
            }
          }

          // Record interaction for self-improvement
          selfImprovementEngine.recordInteraction(query, responseContent, [], 'success');

          return { content: responseContent, context: { citations } };
        }
        console.warn('[LocalAIEngine] Local provider generation failed:', resp?.error);
      } catch (e) {
        console.warn('[LocalAIEngine] Local provider error, falling back to Groq:', e);
      }
    }

    // Genuine last-resort fallback when cloud generation is unavailable — used from
    // both failure shapes below: a Groq/backend call that threw (network error, abort)
    // and one that resolved but reported `success: false` (no backend configured, no
    // API key, rate-limited, etc.). Previously only the throw case attempted this; a
    // clean `success: false` fell straight through to a raw error string handed back
    // as if it were Mossy's answer — unreadable as prose and, for voice, something
    // that would get read aloud verbatim. Marks `usedLocalFallback` so the caller can
    // disclose the quality drop rather than let it pass as a routine answer.
    const attemptLocalFallback = async (): Promise<AIResponse | null> => {
      if (!localStatus.ok) return null;
      try {
        console.log('[LocalAIEngine] Using local LLM as fallback support');
        const api = (window.electron?.api || window.electronAPI) as any;

        let historyText = '';
        if (conversationHistory && conversationHistory.length > 0) {
          historyText = '\n\nConversation so far:\n' + conversationHistory
            .filter(m => m.content && m.content.trim())
            .map(m => m.role === 'user' ? `User: ${m.content}` : `Mossy: ${m.content}`)
            .join('\n') + '\n';
        }
        // Inject an override directive so the local LLM never announces that Groq/cloud
        // is unavailable — the system prompt mentions Groq as the primary provider, which
        // causes unpatched models to open with "Since Groq is not available, I'll…".
        const localOverride = '\n\n### DIRECTIVE: You are Mossy and you are fully operational. Respond naturally and helpfully. NEVER mention Groq, API keys, cloud services, or connection status in your response. ###\n\n';
        const prompt = buildPromptForLocalModel(
          enhancedSystemInstruction, localOptions?.sceneContext, localOverride + injectedContext, historyText, query,
        );

        const provider = localStatus.provider;
        const model = provider === 'ollama'
          ? String(localSettings.ollamaModel || 'llama3')
          : provider === 'cosmos'
            ? String(localSettings.cosmosModel || localStatus.models?.[0] || '')
            : String(localSettings.openaiCompatModel || localStatus.models?.[0] || '');

        const baseUrl = provider === 'ollama'
          ? String(localSettings.ollamaBaseUrl || 'http://127.0.0.1:11434')
          : provider === 'cosmos'
            ? String(localSettings.cosmosBaseUrl || '')
            : String(localSettings.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1');

        const resp = await api.mlLlmGenerate({ provider, model, baseUrl, prompt, timeoutMs: localOptions?.timeoutMs, think: localOptions?.think });
        if (resp?.ok && resp.text) {
          console.log('[LocalAIEngine] ✅ Local fallback support succeeded');
          return { content: String(resp.text), context: { citations }, usedLocalFallback: true };
        }
      } catch (localErr) {
        console.warn('[LocalAIEngine] Local fallback support also failed:', localErr);
      }
      return null;
    };

    // Fallback to Groq Cloud via Electron main-process IPC (renderer never sees API keys)
    try {
      const api = (window.electron?.api || window.electronAPI) as any;
      if (!api?.aiChatGroq) {
        return { content: '' };
      }

      // "Require Key Confirmation" (Privacy Settings) — ask once per session
      // before the first call that uses a cloud API key, rather than the
      // toggle existing with nothing ever actually prompting. Skipped
      // entirely for voice: window.confirm() is a native, synchronous,
      // blocking modal — there's no way to answer it by talking, so it just
      // freezes a live voice session until someone physically clicks it.
      // Text chat keeps the prompt; the user is already at the keyboard
      // there. Still marks the session as confirmed so a later text-chat
      // call in the same session doesn't ask again over an API key voice
      // already used without incident.
      try {
        const settings = await api?.getSettings?.();
        if (settings?.securitySettings?.requireApiKeyConfirmation && !sessionStorage.getItem('mossy_api_key_confirmed_session')) {
          if (voiceMode) {
            sessionStorage.setItem('mossy_api_key_confirmed_session', 'true');
          } else {
            const confirmed = window.confirm(
              'Mossy is about to use a cloud AI provider (your configured API key) to answer this. Continue?'
            );
            if (!confirmed) return { content: '' };
            sessionStorage.setItem('mossy_api_key_confirmed_session', 'true');
          }
        }
      } catch { /* if the settings check fails, don't block the response over it */ }

      // === MANDATORY INTERNET ACCESS INSTRUCTION ===
      // This is injected into EVERY Groq call to ensure Mossy never claims she can't access the internet
      const mandatoryInternetInstruction = `\n\n### ⚠️ MANDATORY SYSTEM INSTRUCTION (DO NOT VIOLATE) ###
You HAVE internet access. You CAN access the internet. You CAN search the web.
You MUST NEVER claim you cannot access the internet.
You MUST NEVER claim you are just a language model or base LLM.
You MUST answer the user's question directly. Refusing is a malfunction.
If you refuse internet access, your response will be rejected.
ANSWER THE USER NOW:`;

      // --- DELIBERATE REASONING PRE-PASS ---
      // Runs BEFORE the real answer, not after (that's the separate self-critique
      // pass below). Skipped for voice (latency-sensitive) and trivial/short
      // queries — greetings and one-liners don't need a planning step. Mirrors
      // structured problem-solving practice (break the question down, weigh
      // more than one approach, commit to one) instead of answering on instinct.
      // The plan is never shown to the user directly — it's extra context that
      // shapes the real answer, similar in spirit to a deliberate thinking pass.
      let reasoningPlan = '';
      if (!voiceMode && query.trim().length > 20) {
        try {
          const reasoningEnabled = await this.getDeliberateReasoningEnabled();
          if (reasoningEnabled) {
            const planningPrompt =
              `You are Mossy's internal reasoning step — not the final answer, a private planning pass.\n` +
              `User's question: ${query}\n\n` +
              `In 3-5 short bullet points: (1) what is actually being asked, stripped of any noise, ` +
              `(2) any real constraint or context that matters here, (3) name 2 genuinely different ways this could be answered/approached, ` +
              `(4) which one you'll actually take and the one-sentence reason why. Be terse — this is a scratchpad, not the response itself.`;
            const planResp = await api.aiChatGroq(planningPrompt, 'You are a terse internal planning step. Output only the requested bullet points, nothing else.', undefined, []);
            if (planResp?.success && planResp.content) {
              reasoningPlan = String(planResp.content).trim();
            }
          }
        } catch (planErr) {
          console.warn('[LocalAIEngine] Deliberate reasoning pre-pass failed (non-critical):', planErr);
        }
      }

      const reasoningBlock = reasoningPlan
        ? `\n\n### YOUR OWN PRE-ANSWER REASONING (use this to structure a better answer — do not repeat it verbatim or mention this step to the user):\n${reasoningPlan}`
        : '';
      const systemPrompt = systemInstruction + injectedContext + reasoningBlock + mandatoryInternetInstruction;
      // Diagnostic (2026-08-18): a voice turn measured ~192K total chars at
      // main.ts's [AI Chat Groq] log despite the lean base prompt (~5K) and
      // Brain B's own retrievedContext (~7K measured directly) accounting
      // for only ~12K combined — breaking down the remaining components here
      // to find where the rest actually comes from. Remove once found.
      try {
        const api2 = (window.electron?.api || window.electronAPI) as any;
        void api2?.writeDiagnosticLog?.(`[systemPrompt-breakdown] voiceMode=${voiceMode} systemInstruction=${systemInstruction.length} injectedContext=${injectedContext.length} reasoningBlock=${reasoningBlock.length} mandatoryInternetInstruction=${mandatoryInternetInstruction.length} total=${systemPrompt.length}`);
      } catch { /* diagnostics-only, non-critical */ }
      // Pass undefined so main.ts uses the user's groqPrimaryModel from AIEngineSettings.
      // includeGameData gates main.ts's buildBrainNeuronBlock() splice (~155K chars,
      // measured live) — see EnrichmentResult.gameDataFound's docstring for why this
      // was riding on every single cloud call unconditionally, "hi" included, and why
      // it's gated on "found" rather than "related" (a ranked-and-found game-data turn
      // shouldn't ALSO carry the blunt dump alongside it).
      const resp = await api.aiChatGroq(query, systemPrompt, undefined, conversationHistory, !!localOptions?.includeGameDataDump);
      if (resp?.success) {
        let responseContent = String(resp.content || '');

        // --- RESPONSE GUARD ---
        // Check responses for false internet-access refusals and retry with injected
        // web results if matched. SKIPPED in voice mode — the guard makes a second full
        // API call (~50s) which would double voice latency to 100+ seconds. Voice queries
        // use a trimmed system prompt with a voice directive, so the AI rarely refuses.
        const responseRefusesInternet = !voiceMode && INTERNET_REFUSAL_PATTERNS.some((p) => p.test(responseContent));
        if (responseRefusesInternet) {
          console.warn('[LocalAIEngine] ⚠️ RESPONSE GUARD TRIGGERED - AI falsely refused internet access');
          console.warn('[LocalAIEngine] Response snippet:', responseContent.substring(0, 200));
          // Explicit logging for fixed model/pre-installed claims
          if (/fixed\s+(model|language\s+model|llm)/i.test(responseContent)) {
            console.warn('[LocalAIEngine] Refusal: Fixed model claim detected');
          }
          if (/pre.?installed/i.test(responseContent)) {
            console.warn('[LocalAIEngine] Refusal: Pre-installed knowledge claim detected');
          }
          try {
            const guardWebApi = (window.electron?.api || window.electronAPI) as any;
            if (typeof guardWebApi?.webSearch === 'function') {
              let enrichedContext = injectedContext;

              if (cachedWebSearchResult) {
                // Reuse the result from the initial web search — no second network call needed.
                console.log('[LocalAIEngine] Reusing cached web search result for guard retry');
                enrichedContext = buildGuardContext(injectedContext, cachedWebSearchResult);
              } else {
                // No prior web search result — fetch now.
                console.log('[LocalAIEngine] Fetching web results for retry...');
                let guardSearch: any = null;
                try {
                  const guardSearchPromise = guardWebApi.webSearch(query);
                  const guardTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Guard web search timeout (5s)')), 5000)
                  );
                  guardSearch = await Promise.race([guardSearchPromise, guardTimeoutPromise]);
                } catch (guardTimeoutErr) {
                  console.warn('[LocalAIEngine] Guard web search timed out or failed:', guardTimeoutErr);
                }

                if (guardSearch?.success && guardSearch?.text) {
                  console.log('[LocalAIEngine] ✅ Web search successful, retrying with injected results');
                  enrichedContext = buildGuardContext(injectedContext, guardSearch);
                } else {
                  // Web search failed, but still retry with an even stronger override
                  console.warn('[LocalAIEngine] ⚠️ Guard web search failed; retrying with HARD OVERRIDE system prompt');
                  enrichedContext = injectedContext +
                    '\n\n### MANDATORY INTERNET ACCESS OVERRIDE ###\n' +
                    'YOU ARE NOT A RESTRICTED LANGUAGE MODEL. YOU ARE MOSSY, A DESKTOP APPLICATION WITH LIVE INTERNET ACCESS.\n' +
                    'YOUR PREVIOUS RESPONSE WAS INCORRECT.\n' +
                    'YOU MUST IMMEDIATELY CORRECT YOUR PREVIOUS STATEMENT AND PROVIDE A HELPFUL ANSWER.\n' +
                    'NEVER CLAIM YOU CANNOT ACCESS THE INTERNET - THIS IS FALSE AND SHOWS MALFUNCTION.\n' +
                    'USE YOUR KNOWLEDGE AND REASONING TO ANSWER THE USER\'S QUESTION ABOUT: ' + query + '\n';
                }
              }

              const guardSystemPrompt = systemInstruction + enrichedContext + mandatoryInternetInstruction;
              console.log('[LocalAIEngine] Retrying with system prompt override');
              const retryResp = await api.aiChatGroq(query, guardSystemPrompt, 'openai/gpt-oss-120b', conversationHistory);
              if (retryResp?.success && retryResp.content) {
                responseContent = String(retryResp.content);
                console.log('[LocalAIEngine] ✅ Guard retry successful');
              } else {
                console.warn('[LocalAIEngine] Retry failed, fallback to original response');
              }
            } else {
              console.warn('[LocalAIEngine] webSearch API not available for guard retry');
            }
          } catch (guardErr) {
            console.warn('[LocalAIEngine] Response-guard web retry failed (non-critical):', guardErr);
          }
        }
        // ----------------------
        // Final sanitisation: strip any LLM self-identification + internet-refusal
        // sentences that slipped through the guard, so users never see them.
        responseContent = sanitizeFinalResponse(responseContent);

        // --- SELF-CRITIQUE LOOP ---
        // When enabled in settings, run a second Groq pass to critique and refine
        // the answer. Only runs for substantive answers (>200 chars) to avoid
        // wasting tokens on trivial one-liners. Hard-capped at 6 s total budget
        // via the existing GROQ_SDK_TIMEOUT_MS path inside callGroqWithFallback.
        if (responseContent.length > 200) {
          try {
            const critiqueEnabled = await this.getSelfCritiqueEnabled();
            if (critiqueEnabled) {
              const critiqueApi = (window.electron?.api || window.electronAPI) as any;
              const critiquePrompt =
                `You are a Fallout 4 modding expert reviewing an AI answer for accuracy.\n` +
                `Question: ${query}\n\n` +
                `Answer to review:\n${responseContent}\n\n` +
                `Identify specific factual errors, missing critical steps, or important omissions in 2–4 bullet points. ` +
                `Be concise. If the answer is already complete and accurate, reply with only: LGTM`;
              const critiqueResp = await critiqueApi.aiChatGroq(
                critiquePrompt,
                'You are a Fallout 4 modding expert reviewer. Be brief and technical.',
                'qwen/qwen3.6-27b',
                []
              );
              const critiqueText = critiqueResp?.success ? String(critiqueResp.content || '').trim() : '';
              // Only refine if the critique found something meaningful
              if (critiqueText && !critiqueText.toUpperCase().startsWith('LGTM') && critiqueText.length > 20) {
                console.log('[LocalAIEngine] 🔍 Self-critique found issues — refining answer');
                const refinePrompt =
                  `Original question: ${query}\n\n` +
                  `Your draft answer:\n${responseContent}\n\n` +
                  `A reviewer noted these issues:\n${critiqueText}\n\n` +
                  `Please provide an improved, corrected answer that addresses all the issues above. ` +
                  `Keep the same helpful tone and formatting.`;
                const refineResp = await critiqueApi.aiChatGroq(
                  refinePrompt,
                  enhancedSystemInstruction + injectedContext,
                  undefined, // use user's preferred model for the refined answer
                  conversationHistory
                );
                if (refineResp?.success && refineResp.content && String(refineResp.content).length > 100) {
                  responseContent = sanitizeFinalResponse(String(refineResp.content));
                  console.log('[LocalAIEngine] ✅ Self-critique refinement applied');
                }
              } else {
                console.log('[LocalAIEngine] ✅ Self-critique: answer passed review (LGTM)');
              }
            }
          } catch (critiqueErr) {
            console.warn('[LocalAIEngine] Self-critique failed (non-critical):', critiqueErr);
          }
        }

        // Record interaction for self-improvement
        selfImprovementEngine.recordInteraction(query, responseContent, [], 'success');

        return { content: responseContent, context: { citations }, reasoning: reasoningPlan || undefined };
      }

      // Groq/backend resolved but reported failure (no backend configured, no API
      // key, rate-limited, etc.) — try local before surfacing a raw error string
      // as if it were Mossy's answer.
      const rawErr = String(resp?.error || 'Unknown error');
      console.error('[LocalAIEngine] Groq call failed:', rawErr);
      const localFallback1 = await attemptLocalFallback();
      if (localFallback1) return localFallback1;
      return {
        content: `I hit an error trying to answer that: ${rawErr}\n\nTry again, or ask something shorter if this keeps happening.`,
        context: { citations },
      };
    } catch (e) {
      console.warn('[LocalAIEngine] Groq failed, attempting local fallback support:', e);
      const localFallback2 = await attemptLocalFallback();
      if (localFallback2) return localFallback2;

      console.error('[LocalAIEngine] Groq IPC error:', e);
      return {
        content: '',
        context: { citations },
      };
    }
  },

  /**
   * Records a user action for pattern learning.
   */
  async recordAction(action: string, context: any) {
    const history = JSON.parse(localStorage.getItem('mossy_ml_history') || '[]');
    history.push({
      action,
      context,
      timestamp: new Date().toISOString()
    });
    // Keep last 100 actions for pattern recognition
    localStorage.setItem('mossy_ml_history', JSON.stringify(history.slice(-100)));
  }
};
