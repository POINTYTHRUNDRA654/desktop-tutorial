# Game Data + Brain B Retrieval: Current State (2026-08-16)

Findings from tracing a persona/prompt-size bug back to its root, plus
Phase 1 of the actual merge (started same day, not deferred).

**Status: Phase 1 (Papyrus API BM25 lookup) implemented and shipped.** Form
graph, asset graph, and world strings are NOT yet indexed — see "What's
still open" below.

## The two systems, and why they look connected but aren't

**Brain B's retriever** (`brain-b/nexus/brain_b_slim.py`, `hybrid_retrieve()`)
searches a ChromaDB collection (`chroma_curated`) holding **2,025 documents**:
~43 bootstrap entries plus Creation Kit wiki pages (per `/health`'s
`curated_docs` field). This is the *only* thing `/enrich`'s retrieval,
abstention gate, and hedge/confidence tier ever see.

**The scanned-game system** (`src/electron/main.ts`, `runStartupScans()` and
~20 related scan functions) is completely separate. It collects vanilla game
strings, materials, sounds, textures, a full Papyrus library analysis, NPC
voice types, texture conventions, the MO2 profile, a full vanilla mesh
catalog, NIF bone hierarchy data, the FO4 form/asset graphs, F4SE plugins,
and more — each written to a "brain neuron" via `addBrainNeuron()`, persisted
to `userData/brain-neurons.json`. Measured live on 2026-08-16: **166,627
bytes**.

These were never wired together. Brain B's retriever has no access to the
scan data; the scan data never goes through retrieval at all.

## The scan data isn't unused — it's just not *retrieved*

`buildBrainNeuronBlock()` (main.ts) concatenates the *entire* neuron set and
splices it into every cloud generation call as an extra system message,
inside the `ai-chat-groq` IPC handler — unconditionally, regardless of
whether the question needs any of it. This is why Mossy could already answer
detailed platform/tool questions correctly even though Brain B's own KB has
nothing about MOSSY.SPACE's own UI — the answer was coming from the neuron
dump, not from Brain B.

So the actual shape of the problem isn't "the data is invisible to Mossy." It's
"the data reaches Mossy through a blunt, always-everything mechanism instead
of a relevance-ranked one" — which is a real problem in its own right (see
below), but a different one than "never connected."

## Why this mattered today

The neuron block (~155K characters, ~40K tokens) plus Brain B's KB retrieval
plus `getFullSystemInstruction()`'s base prompt were stacking to **320,000+
characters** on every cloud call, voice included. That's the root cause behind
several days of unexplained symptoms:

- Consistent Groq/backend timeouts, forcing silent fallback to a local model
  on nearly every turn (not primarily Render cold-start, as
  `LiveContext.tsx`'s watchdog comment assumed when it raised the timeout
  from 50s to 120s — the sheer prefill size was very likely the bigger
  factor).
- The local fallback model (an 8K-token-class model like `gemma2:9b`)
  silently truncating a prompt ~40x its own context window — which is what
  actually produced the "I'm just a text-based AI" persona-denial bug, not
  the model ignoring its instructions.
- The likely mechanism behind an earlier "Question was too long" failure.

**Immediate, narrower fix already shipped** (same session): `/enrich` now
classifies a fifth dimension, `game_data_related` (mirrors `scene_related` /
`app_help_related`'s existing gating pattern exactly). `buildBrainNeuronBlock()`
only fires when a turn's classification says it needs a specific vanilla-game
fact — a FormID, EditorID, load order, a Papyrus signature, exact asset
paths. This alone should cut most turns from ~190-320K characters to roughly
~35K, without touching retrieval at all. See `classify_and_diagnose()`'s
docstring in both `brain-b/nexus/brain_b_slim.py` and
`brain-b/gemma_service_enhanced.py` (kept in parity — see `check_parity.py`)
for the exact mechanism, and `EnrichmentResult.gameDataRelated`'s docstring in
`src/renderer/src/LocalAIEngine.ts` for the client side.

## Phase 1: Papyrus API, ranked BM25 lookup (shipped 2026-08-16)

New module `brain-b/game_data_index.py` (copied byte-identical into
`brain-b/nexus/`, enforced by `check_parity.py`'s `ARTIFACT_PAIRS`):

- `load_papyrus_records()` flattens `fo4_papyrus_api.json`'s
  `{scriptName: {functions, events, properties}}` shape into one record per
  function/event (~7,700 records across 2,424 scripts) — the granularity a
  "what does X do" question needs, not one giant per-script blob.
- `GameDataIndex` builds a lazy `BM25Okapi` index over those records, reusing
  `brain_b_slim.py`'s own `_tokenize()`/`_split_identifier()` logic
  (duplicated intentionally, not imported — see the module docstring for
  why) — the camelCase-aware tokenizer that already exists specifically
  because identifiers like `SetAnimationVariableFloat` are one opaque token
  to a naive tokenizer.
- `search_papyrus(query, json_path, top_k=5)` is `/enrich`'s entry point.

Wiring: `classify_and_diagnose()` gained a fifth classification dimension,
`game_data_related` (same pattern as `scene_related`/`app_help_related`).
When true, `/enrich` calls `search_papyrus()` and folds the top 5 matches
into `retrieved_context` as a new `GAME DATA — PAPYRUS API` section — a few
hundred characters of exact matches, not the ~155K-char neuron dump. `main.ts`
passes `GAME_SCAN_CACHE_PATH` (pointing at `userData/game-scan-cache/`, the
same directory the scan system already writes to) when it spawns Brain B.

This is genuinely separate from the `game_data_related` *gating* fix shipped
earlier the same day (which only controls whether the client-side neuron
block fires) — that fix stopped an unconditional 155K-char dump; this phase
starts replacing it with real ranked retrieval, one dataset at a time.

## What's still open

Three datasets not yet indexed, and three things worth deciding before
extending this pattern to them:

1. **Game records aren't prose.** FormIDs, EditorIDs, and record types are
   identifiers, not natural language — semantic/vector embeddings are weak on
   identifiers specifically (this is the same failure class that degraded
   `GetName`-style lookups elsewhere in this project). BM25/exact-match will
   beat vector search substantially for this data. It likely deserves its own
   retrieval path, not a straight `/knowledge/add` into the existing
   curated-docs collection.

2. **Volume is a different order of magnitude.** A full game scan is likely
   hundreds of thousands of records against Brain B's current 2,025-document
   collection. Dumping it into one collection would swamp CK-wiki retrieval on
   every query. Separate collections routed by question type ("what does
   GetLinkedRef do" vs. "what quest is this dialogue in" are different
   questions needing different indexes) is almost certainly the right shape.

3. **Licensing.** Base-game data has its own considerations. Scanning other
   people's DLC-scale mods for local use is one thing; shipping data derived
   from them in a public knowledge pack (Nexus release) is another — the same
   category of question this project already worked through carefully for
   UESP content in the curated collection. Needs sorting before any of this
   ships, not after.

## Where things live, for whoever continues this

- Raw scan JSON (source data for indexing): `userData/game-scan-cache/` —
  `fo4_papyrus_api.json` (indexed), `fo4_form_graph.json`,
  `fo4_asset_graph.json`, `fo4_world_strings.json` (not yet indexed).
- Scan functions + neuron registration: `src/electron/main.ts`,
  `runStartupScans()` (search for `addBrainNeuron`); `resolveScanCacheDir()`/
  `resolveScanCacheFile()` for how the raw JSON paths resolve.
- Neuron persistence (the OLD, blunt path — still used as the game-data
  fallback for turns Phase 1 doesn't cover yet): `userData/brain-neurons.json`,
  `saveBrainNeuronsToDisk()`/`buildBrainNeuronBlock()` in `main.ts`.
- New game-data index: `brain-b/game_data_index.py` (source of truth,
  hand-copy into `brain-b/nexus/game_data_index.py` — parity enforced by
  `check_parity.py`'s `ARTIFACT_PAIRS`, exact text match, not per-function AST
  diff). To add a second dataset (form graph is the natural next one — it
  already has an `edid_index` FormID↔EditorID map): add a
  `load_form_graph_records()` loader alongside `load_papyrus_records()`, a
  second `GameDataIndex` instance, and a `search_form_graph()` entry point;
  wire it into `/enrich` the same way `search_papyrus()` is wired in now.
- Brain B's existing retrieval + collections (unchanged, still wiki-only):
  `brain-b/nexus/brain_b_slim.py` (`hybrid_retrieve()`,
  `get_curated_collection()`, `get_runtime_collection()`).
- Fork-parity enforcement for any shared-function or artifact-pair changes:
  `brain-b/check_parity.py` — `brain-b/gemma_service_enhanced.py` is the dev/
  GPU fork and must stay in sync for any function in `SHARED_FUNCTIONS`, and
  `brain-b/game_data_index.py` must stay byte-identical to its
  `brain-b/nexus/` copy.
