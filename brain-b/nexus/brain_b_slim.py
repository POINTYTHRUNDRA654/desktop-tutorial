#!/usr/bin/env python3
"""
brain_b_slim.py — Mossy Brain B (Nexus edition): Local Retrieval + Router Service
==================================================================================
The CPU-only, no-GPU, no-local-model sibling of brain-b/gemma_service_enhanced.py
(the developer's own GPU/Gemma build — see that file's docstring for why it isn't
what ships). This file IS what ships to Nexus users: retrieval, mode routing,
need-diagnosis, and the tutoring contract (check_question, learner_signal) all run
locally on CPU; ALL generation (long-form answers and the small JSON calls) goes
through Mossy's shared Render backend (mossy.onrender.com/v1/chat — the same proxy
the Electron app itself calls, which holds the real Groq key server-side).

No local language model of any kind is loaded by this file — no torch, no
transformers, no LangGraph. That's deliberate, not a placeholder: the GPU build's
own local Gemma checkpoint proved unreliable even on trivial prompts (see its
docstring), so there's no local model worth the weight of bundling one here. If the
backend is unreachable, this returns an honest "temporarily unavailable" message —
retrieval and citations still work, generation just doesn't, rather than serving
degraded/incoherent output.

Deploy: bundled/compiled — see brain-b/nexus/README.md for the packaged distribution.
Dev run: python brain_b_slim.py
API: http://localhost:8766

Environment variables:
  CHROMA_CURATED_PATH – curated (shippable) ChromaDB dir (default alongside this script)
  CHROMA_RUNTIME_PATH – runtime (local-only) ChromaDB dir (default alongside this script)
  EMBED_MODELS_PATH   – sentence-transformers cache dir (default alongside this script)
  MOSSY_PORT   – Server port (default 8766 — 8765 is already used by the Electron
                 F4AI NPC-dialogue relay in src/electron/main.ts)
  MOSSY_BACKEND_URL   – Shared Render backend base URL (default https://mossy.onrender.com)
  MOSSY_BACKEND_TOKEN – Required for real answers. Provided automatically by the
                 Electron app when it launches this process (see main.ts's Brain B
                 lifecycle wiring) — not something an end user configures by hand.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import networkx as nx
import numpy as np
import requests
from dotenv import load_dotenv
from duckduckgo_search import DDGS
from flask import Flask, jsonify, request
from flask_cors import CORS
from rank_bm25 import BM25Okapi

from retrieval_tuning import MIN_RETRIEVAL_AGREEMENT, classify_retrieval  # noqa: F401 (MIN_RETRIEVAL_AGREEMENT referenced in comments elsewhere)

# Loads a .env file from the current working directory if one exists (silently does
# nothing otherwise) — lets MOSSY_BACKEND_TOKEN persist across restarts without having
# to re-set an env var by hand each time. See .env.example; never commit a real .env.
load_dotenv()

# ── Constants ────────────────────────────────────────────────────────────────
# Electron always sets MOSSY_BASE_DIR explicitly when it spawns this process (see
# main.ts's Brain B lifecycle wiring) — pointed at userData for a writable location
# alongside the read-only bundled knowledge pack. This fallback only matters for
# standalone/dev runs of this script outside Electron: defaults to wherever the
# script (or, once compiled, the .exe) actually lives, not a dev-specific path.
_default_base = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
BASE_DIR         = Path(os.environ.get("MOSSY_BASE_DIR", str(_default_base)))
EMBED_MODELS_PATH = os.environ.get("EMBED_MODELS_PATH", str(BASE_DIR / "models"))

# Two SEPARATE ChromaDB persist directories, not two collections in one — a
# physical split is much harder to accidentally blur than a same-directory
# naming convention. CURATED is the build artifact: bootstrap entries +
# reviewed wiki ingestion (see ingest_ck_wiki.py), versioned and shipped.
# RUNTIME is everything written at runtime — auto_save_to_chroma()'s cached
# web results, /knowledge/add uploads — local to one machine, never
# packaged, never exported. hybrid_retrieve() queries both locally; only
# CURATED_PATH is ever the target of a distributed package.
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))
CHROMA_RUNTIME_PATH = os.environ.get("CHROMA_RUNTIME_PATH", str(BASE_DIR / "data" / "chroma_runtime"))
COLLECTION_NAME     = "mossy_knowledge"  # same name in both dirs — the directory is what separates them
DB_PATH        = BASE_DIR / "data" / "mossy_brain.db"
GRAPH_PATH     = BASE_DIR / "data" / "knowledge_graph.json"
# No LORA_PATH/DATASET_PATH here — this build has no local model to fine-tune;
# see the module docstring. /finetune doesn't exist in this file.

# 8765 is already claimed unconditionally by the F4AI NPC-dialogue relay
# Electron starts in src/electron/main.ts (_startF4aiBridgeServer) — that
# server has no on/off setting, so whichever of it or this process starts
# second silently fails to bind. Brain B defaults to 8766 instead; override
# with MOSSY_PORT if you have a reason to.
PORT           = int(os.environ.get("MOSSY_PORT", 8766))
MAX_EPISODES   = 500

# ALL generation (long-form answers AND classify_mode/diagnose/contract_fields) goes
# through Mossy's shared Render backend (src/backend/routes/chat.ts, deployed at
# mossy.onrender.com) — this build has no local model to fall back to. That backend
# already holds the real Groq API key server-side and is exactly what the Electron
# app itself calls (main.ts); this process needs a shared AUTH TOKEN, not a second
# copy of a provider API key. Electron sets MOSSY_BACKEND_TOKEN when it spawns this
# process — see main.ts's Brain B lifecycle wiring. It must match MOSSY_API_TOKEN
# configured on the Render service (src/backend/middleware/auth.ts).
MOSSY_BACKEND_URL   = os.environ.get("MOSSY_BACKEND_URL", "https://mossy.onrender.com")
MOSSY_BACKEND_TOKEN = os.environ.get("MOSSY_BACKEND_TOKEN", "")
BACKEND_UNAVAILABLE_MESSAGE = (
    "I can't reach Mossy's AI service right now, so I can't generate a full answer — "
    "this needs an internet connection. Retrieval and citations below still work; "
    "try again once you're back online."
)

# MIN_RETRIEVAL_AGREEMENT and the abstain/hedge/confident decision itself
# (classify_retrieval) live in retrieval_tuning.py (../retrieval_tuning.py,
# copied here fresh by build_nexus_package.py on every build — never hand-
# edit brain-b/nexus/retrieval_tuning.py directly). This file was forked
# from gemma_service_enhanced.py before its 2026-08-13 probe-width fix
# existed, silently kept the old behavior through a full corpus rebuild and
# a real GitHub Release publish, and only got the fix after someone
# explicitly re-tested THIS file against the actual shipped data instead of
# assuming a dev-build fix had propagated. The shared module exists so that
# class of bug is structurally impossible going forward, not just documented.
NO_DOCS_MESSAGE = (
    "I don't have documentation covering that in my knowledge base right now, "
    "so I'd rather tell you that plainly than guess. If you can point me at a "
    "source (or add it via /knowledge/add), I can look at it directly — "
    "otherwise this might be worth checking the CK wiki or F4SE docs yourself."
)

logging.basicConfig(level=logging.INFO, format="[%(levelname)s %(asctime)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("mossy-brain-b")

app = Flask(__name__)
CORS(app)

# ── Lazy globals (loaded on first use) ───────────────────────────────────────
_curated_collection = None
_runtime_collection = None
_SERVER_TYPE = "unknown"  # set in __main__ once we know whether waitress loaded; read by /health
_embed_model = None
_bm25        = None
_bm25_docs   = None
_bm25_ids    = None
_bm25_metas  = None
_bm25_stores = None  # parallel array: "curated" or "runtime" per doc, so expand_to_parent() knows where to look
_graph       = None

# Kept modest even though there's no local KV-cache OOM risk to worry about anymore
# (no local model at all in this build) — a smaller prompt is still cheaper and
# faster against the cloud backend, and doesn't need to be any larger than this to
# give the model solid grounding.
MAX_EXPANDED_PARENTS = 2


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE — SQLite for episodic memory + feedback
# ═══════════════════════════════════════════════════════════════════════════════

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS episodes (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            ts        TEXT NOT NULL,
            summary   TEXT NOT NULL,
            topics    TEXT,
            outcome   TEXT DEFAULT 'completed',
            rating    INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS user_feedback (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          TEXT NOT NULL,
            question    TEXT NOT NULL,
            answer      TEXT NOT NULL,
            rating      TEXT NOT NULL,
            correction  TEXT,
            doc_ids     TEXT
        );

        CREATE TABLE IF NOT EXISTS training_samples (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         TEXT NOT NULL,
            prompt     TEXT NOT NULL,
            completion TEXT NOT NULL,
            quality    REAL DEFAULT 0.5,
            source     TEXT DEFAULT 'inferred'
        );

        -- v1 of the tutor response contract has nowhere to READ learner state
        -- from (no skill graph, no per-user mastery table yet). Rather than
        -- guess that table's shape, every turn logs what the model says it
        -- would want to know about the user to answer better. Design the real
        -- learner-state table from patterns in this data once there's enough
        -- of it, instead of from a guess made before any real usage existed.
        --
        -- session_id is the whole point of this table: without an owner key,
        -- these rows are unassemblable observations, not a trajectory — which
        -- defeats the reason it exists. Brain B has no caller wiring a real
        -- session/conversation id through yet (see /infer's docstring), so
        -- this column will read "unknown" until that's connected — visibly,
        -- not silently, so the gap doesn't get missed until backfill time.
        CREATE TABLE IF NOT EXISTS learner_signals (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            ts             TEXT NOT NULL,
            session_id     TEXT NOT NULL DEFAULT 'unknown',
            question       TEXT NOT NULL,
            mode           TEXT,
            learner_signal TEXT,
            diagnosis      TEXT
        );

        -- Every time the small JSON contract calls (see _generate_json) fail
        -- to parse after retries. Watch this table's growth rate — if it's a
        -- meaningful fraction of turns, retry-on-parse-failure isn't enough
        -- and it's time to move to constrained decoding (see _generate_json's
        -- docstring for why that's deferred rather than done up front).
        CREATE TABLE IF NOT EXISTS contract_failures (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          TEXT NOT NULL,
            question    TEXT NOT NULL,
            stage       TEXT,
            raw_output  TEXT,
            attempts    INTEGER
        );

        -- The learner model: derived from retrieval side-effects, not a model's
        -- self-report of how advanced someone is (that's noise — see
        -- compute_answer_level()'s docstring). Local only, never ships — same
        -- reason curated/runtime ChromaDB stays physically split, except this
        -- table never needed that split to begin with: nothing here was ever
        -- a build input.
        CREATE TABLE IF NOT EXISTS learner_state (
            user_id         TEXT NOT NULL,
            skill_id        TEXT NOT NULL,
            exposure_count  INTEGER NOT NULL DEFAULT 0,
            first_seen      TEXT NOT NULL,
            last_seen       TEXT NOT NULL,
            debug_turns     INTEGER NOT NULL DEFAULT 0,
            repeat_asks     INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, skill_id)
        );

        -- Recovers the measurement a 2-minute GUI pass can't give: the real
        -- LLM-vs-keyword disagreement rate over a week of actual questions,
        -- not a handful eyeballed by hand. Only written when the LLM call in
        -- classify_mode() actually parses — a parse failure is already
        -- tracked in contract_failures and isn't a real "both methods
        -- produced a verdict" comparison.
        CREATE TABLE IF NOT EXISTS mode_classifications (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            ts           TEXT NOT NULL,
            question     TEXT NOT NULL,
            llm_mode     TEXT NOT NULL,
            keyword_mode TEXT NOT NULL,
            agree        INTEGER NOT NULL
        );

        -- Written UNCONDITIONALLY on every /infer turn (unlike learner_signals,
        -- which only gets a row when a signal string happens to be produced) —
        -- the point is two real distributions (wrong-match margins vs.
        -- genuine-hit margins) to check retrieval_tuning.py's thresholds
        -- against after real usage, not just the ~20-query eval they were set
        -- from. See retrieval_tuning.py's docstring: the gap between the
        -- known wrong match (6.359) and the lowest known genuine hit (7.610)
        -- is ~1.25 wide, and 20 queries hasn't found a counterexample — which
        -- is absence of evidence, not evidence of a real margin of safety, at
        -- a sample size this mechanism has already been wrong at twice.
        CREATE TABLE IF NOT EXISTS retrieval_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          TEXT NOT NULL,
            session_id  TEXT NOT NULL DEFAULT 'unknown',
            agreement   INTEGER NOT NULL,
            bm25_margin REAL,
            tier        TEXT NOT NULL
        );
    """)
    # CREATE TABLE IF NOT EXISTS doesn't retroactively add columns to a table
    # that already existed under an older schema — needed if learner_signals
    # was created by a run of this file before session_id existed.
    try:
        conn.execute("ALTER TABLE learner_signals ADD COLUMN session_id TEXT NOT NULL DEFAULT 'unknown'")
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.commit()
    conn.close()
    log.info("SQLite DB ready: %s", DB_PATH)


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATION — cloud only, no local model in this build
# ═══════════════════════════════════════════════════════════════════════════════

def generate_text_backend(prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
    """Long-form generation via Mossy's shared Render backend (src/backend/routes/chat.ts),
    the same proxy the Electron app itself calls — NOT a direct Groq API call. Mirrors its
    exact contract: POST /v1/chat, {"messages":[...], "maxTokens":..., "temperature":...},
    Authorization: Bearer <MOSSY_BACKEND_TOKEN>, response {"ok":true,"text":"...",...} or
    {"ok":false,"error":...,"message":...}. The backend itself already owns Groq's
    primary/fallback model selection and rate-limit retry — this function doesn't
    duplicate that logic, just calls through.

    Render's free tier cold-starts after idling (30-60s) — timeout is generous to survive
    that rather than fail a request that would have succeeded 20s later. Raises on
    failure; callers (generate_answer()) decide the fallback, this function doesn't hide
    errors.

    max_new_tokens here is NOT a 1:1 token budget for the visible answer — the backend's
    default model (openai/gpt-oss-120b) is a reasoning model requested at high reasoning
    effort (see chat.ts's reasoningEffortFor()), and reasoning tokens count against the
    same maxTokens budget as the final answer. Verified directly against the live
    backend: a 50-token budget produced 48 reasoning tokens and an EMPTY answer; 512
    produced 385 reasoning tokens and a real (if short) answer. Callers pass the budget
    they want for the actual ANSWER; this pads it with headroom for reasoning tokens so
    that budget doesn't silently starve to zero on harder questions with more context.
    """
    if not MOSSY_BACKEND_TOKEN:
        raise RuntimeError("MOSSY_BACKEND_TOKEN not set")
    reasoning_headroom = 1536
    resp = requests.post(
        f"{MOSSY_BACKEND_URL}/v1/chat",
        headers={"Authorization": f"Bearer {MOSSY_BACKEND_TOKEN}", "Content-Type": "application/json"},
        json={
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "maxTokens": max_new_tokens + reasoning_headroom,
        },
        timeout=90,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"backend chat failed: {data.get('message') or data.get('error') or data}")
    text = (data.get("text") or "").strip()
    if not text:
        usage = data.get("usage") or {}
        log.warning("Backend returned empty text despite ok:true — likely reasoning-token "
                    "budget exhaustion even with headroom. usage=%s", usage)
    return text


def generate_answer(prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
    """The one entry point for ALL generation in this service — long-form answers
    and the small JSON calls (classify_mode, diagnose, contract_fields, via
    _generate_json()) alike. No local fallback: this build has no local model at all
    (see module docstring for why — the GPU dev build's local checkpoint proved
    unreliable even on trivial prompts, so there's nothing worth bundling here).
    Retrieval and citations work regardless of backend reachability; only generation
    depends on it. Returns BACKEND_UNAVAILABLE_MESSAGE on any failure — a clear
    "can't answer right now" beats a wrong-but-confident answer."""
    if not MOSSY_BACKEND_TOKEN:
        log.error("MOSSY_BACKEND_TOKEN not set — cannot generate.")
        return BACKEND_UNAVAILABLE_MESSAGE
    try:
        text = generate_text_backend(prompt, max_new_tokens, temperature)
        if text:
            return text
        log.warning("Backend returned empty text.")
    except Exception as e:
        log.warning("Backend generation failed: %s", e)
    return BACKEND_UNAVAILABLE_MESSAGE


# ═══════════════════════════════════════════════════════════════════════════════
# EMBEDDING MODEL
# ═══════════════════════════════════════════════════════════════════════════════

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        # fastembed (ONNX runtime), NOT sentence-transformers — verified on real
        # measurement: sentence-transformers hard-depends on torch even for CPU-only
        # inference, pulling in ~900MB of transitive weight (torch + transformers +
        # scipy + sympy + sklearn) for a single 384-dim embedding model. fastembed's
        # dependency tree has none of that. This is NOT a drop-in swap at the vector
        # level — the curated knowledge pack for THIS build must be embedded with
        # fastembed too (see nexus/build_knowledge_db_nexus.py), or index-time and
        # query-time vectors come from different encoders and retrieval quietly
        # degrades. Reproducibility is pinned via the `fastembed` package version in
        # requirements-nexus.txt (its own model registry ties a package version to a
        # specific ONNX export), not a HuggingFace revision hash the way the dev
        # build's sentence-transformers loader does.
        from fastembed import TextEmbedding
        from knowledge_manifest import EMBEDDING_MODEL_NAME
        _embed_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME, cache_dir=EMBED_MODELS_PATH)
        log.info("Embedding model loaded: %s (fastembed/ONNX, CPU)", EMBEDDING_MODEL_NAME)
    return _embed_model


def embed(texts: list[str]) -> list[list[float]]:
    # fastembed's bge-small-en-v1.5 export already returns L2-normalized vectors —
    # verified directly (norm == 1.0) — so no separate normalize step is needed here,
    # unlike the dev build's sentence-transformers path which requires
    # normalize_embeddings=True explicitly.
    model = get_embed_model()
    return [vec.tolist() for vec in model.embed(texts)]


# ═══════════════════════════════════════════════════════════════════════════════
# CHROMADB + BM25 HYBRID RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════════

def get_curated_collection():
    """The shippable knowledge base: bootstrap entries + reviewed wiki ingestion."""
    global _curated_collection
    if _curated_collection is None:
        import chromadb
        from knowledge_manifest import check_embedding_model
        check_embedding_model(CHROMA_CURATED_PATH, embed_fn=embed)
        Path(CHROMA_CURATED_PATH).mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=CHROMA_CURATED_PATH)
        _curated_collection = client.get_or_create_collection(
            COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )
        log.info("Curated ChromaDB collection ready (%d docs) at %s.",
                  _curated_collection.count(), CHROMA_CURATED_PATH)
    return _curated_collection


def get_runtime_collection():
    """Local-only: auto-saved web results + manual /knowledge/add uploads. Never packaged."""
    global _runtime_collection
    if _runtime_collection is None:
        import chromadb
        Path(CHROMA_RUNTIME_PATH).mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=CHROMA_RUNTIME_PATH)
        _runtime_collection = client.get_or_create_collection(
            COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )
        log.info("Runtime ChromaDB collection ready (%d docs) at %s.",
                  _runtime_collection.count(), CHROMA_RUNTIME_PATH)
    return _runtime_collection


_CAMEL_SPLIT_RE = re.compile(r'[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])')


def _split_identifier(word: str) -> list[str]:
    """camelCase/PascalCase -> lowercase constituent words, only if there's more than one."""
    parts = _CAMEL_SPLIT_RE.findall(word)
    return [p.lower() for p in parts] if len(parts) > 1 else []


def _tokenize(text: str) -> list[str]:
    """
    BM25 tokenizer for a corpus that's half API-reference text.

    Plain `.lower().split()` (the previous tokenizer) has two compounding
    failures on this corpus, both confirmed empirically against real query
    results, not theoretical: (1) it splits on whitespace only, so a
    signature line's opening paren glues onto the identifier
    ("setanimationvariablefloat(string" as ONE token) — even a query typing
    the exact correct name never matches it; (2) even fixed, a compound
    identifier like SetAnimationVariableFloat is one opaque token with zero
    overlap against a natural query like "set an animation variable", so
    BM25 found ~0 overlap with vector search on every code-lookup query in
    testing and defaulted to whichever long prose document shared the most
    stopwords.

    Fix: regex-bounded alphanumeric extraction (punctuation can't glue onto
    a token), PLUS splitting each compound identifier into its constituent
    words as ADDITIONAL tokens — the original glued token is kept too, so an
    exact-name query still matches directly.
    """
    tokens = []
    for word in re.findall(r'[A-Za-z0-9]+', text):
        tokens.append(word.lower())
        tokens.extend(_split_identifier(word))
    return tokens


def _build_bm25():
    """Build BM25 index from BOTH collections' documents (rebuilt on first call)."""
    global _bm25, _bm25_docs, _bm25_ids, _bm25_metas, _bm25_stores
    docs, ids, metas, stores = [], [], [], []
    for store_name, coll in (("curated", get_curated_collection()), ("runtime", get_runtime_collection())):
        if coll.count() == 0:
            continue
        result = coll.get(include=["documents", "metadatas"])
        docs.extend(result["documents"])
        ids.extend(result["ids"])
        metas.extend(result["metadatas"])
        stores.extend([store_name] * len(result["ids"]))

    if not docs:
        _bm25 = None
        return
    _bm25_docs, _bm25_ids, _bm25_metas, _bm25_stores = docs, ids, metas, stores
    tokenized = [_tokenize(doc) for doc in _bm25_docs]
    _bm25 = BM25Okapi(tokenized)
    log.info("BM25 index built over %d documents (curated + runtime).", len(_bm25_docs))


def _citation_from_result(r: dict) -> dict:
    """
    A hybrid_retrieve() result carries real provenance in its metadata
    (title, source_url, license — see ingest_ck_wiki.py) but /infer was
    returning bare chunk ids as "sources", which the chat UI can only render
    as raw id strings, not clickable citations. Bootstrap entries don't carry
    source_url/license (hand-authored, not ingested from an external source)
    — falls back to just a title in that case rather than erroring.
    """
    meta = r.get("metadata") or {}
    return {
        "id": r.get("id", "unknown"),
        "title": meta.get("title") or r.get("id", "unknown"),
        "source_url": meta.get("source_url") or None,
        "license": meta.get("license") or None,
    }


def hybrid_retrieve(query: str, top_k: int = 10, probe_k: int | None = None,
                     return_diagnostics: bool = False):
    """
    Hybrid BM25 + semantic retrieval across BOTH the curated (shippable) and
    runtime (local-only) collections — a user's own cached web results or
    manual uploads should enrich their own retrieval even though they never
    leave their machine. Each result carries `store` ("curated"/"runtime")
    and `metadata` (including `parent_id` when the ingesting script set one
    — see ingest_ck_wiki.py) so callers can locate the right collection when
    expanding to a parent section; retrieval itself always ranks against the
    tight chunk text, never the expanded parent.

    probe_k, if given, widens the per-retriever candidate pool (and the RRF
    fusion pool) beyond top_k, and the function returns up to probe_k merged
    results instead of top_k. This exists because "how many docs go in the
    prompt" and "does an answer exist at all" are different questions with
    different right answers — see MIN_RETRIEVAL_AGREEMENT's comment. Callers
    doing prompt-building should still only use the first top_k of whatever
    comes back. Left unset, behavior is unchanged from before this existed.

    return_diagnostics, if True, returns (merged, diagnostics) instead of just
    merged — diagnostics carries the raw per-retriever sorted score arrays
    (sem_dists ascending, bm25_scores descending), used for a margin-based
    signal measured alongside agreement but not (yet) gating on it.
    """
    width = probe_k if probe_k is not None else top_k
    curated = get_curated_collection()
    runtime = get_runtime_collection()

    # ── Semantic (vector) retrieval — query both collections ──
    q_embed = embed([query])
    sem_ids, sem_docs, sem_dists, sem_metas, sem_stores = [], [], [], [], []
    for store_name, coll in (("curated", curated), ("runtime", runtime)):
        if coll.count() == 0:
            continue
        res = coll.query(
            query_embeddings=q_embed,
            n_results=min(width, coll.count()),
            include=["documents", "metadatas", "distances"],
        )
        docs = res["documents"][0] if res["documents"] else []
        ids = res["ids"][0] if res["ids"] else []
        dists = res["distances"][0] if res["distances"] else []
        metas = res["metadatas"][0] if res["metadatas"] else []
        sem_ids.extend(ids); sem_docs.extend(docs); sem_dists.extend(dists); sem_metas.extend(metas)
        sem_stores.extend([store_name] * len(ids))
    # Re-sort the combined cross-collection list by distance (ascending = closer) and cap
    sem_order = sorted(range(len(sem_ids)), key=lambda i: sem_dists[i])[:width]
    sem_ids, sem_docs, sem_dists, sem_metas, sem_stores = (
        [sem_ids[i] for i in sem_order], [sem_docs[i] for i in sem_order],
        [sem_dists[i] for i in sem_order], [sem_metas[i] for i in sem_order],
        [sem_stores[i] for i in sem_order],
    )

    # ── BM25 keyword retrieval ──
    if _bm25 is None:
        _build_bm25()

    bm25_scored: list[tuple[str, str, float, dict, str]] = []
    if _bm25 is not None and _bm25_docs:
        scores = _bm25.get_scores(_tokenize(query))
        top_idx = np.argsort(scores)[::-1][:width]
        for idx in top_idx:
            if scores[idx] > 0:
                meta = _bm25_metas[idx] if _bm25_metas else {}
                bm25_scored.append((_bm25_ids[idx], _bm25_docs[idx], float(scores[idx]), meta, _bm25_stores[idx]))

    # ── Merge & deduplicate using Reciprocal Rank Fusion (RRF) ──
    # RRF score: sum(1 / (rank + k)) across retrieval methods.
    # No external API key or paid service required.
    # Composite key (store, id) rather than bare id — curated and runtime are
    # separate collections and could in principle mint the same id.
    K = 60  # standard RRF constant (higher K = smoother ranking)

    rrf_scores: dict[tuple[str, str], float] = {}
    doc_store: dict[tuple[str, str], dict] = {}

    for rank, (doc_id, doc, dist, meta, store_name) in enumerate(zip(sem_ids, sem_docs, sem_dists, sem_metas, sem_stores)):
        key = (store_name, doc_id)
        rrf_scores[key] = rrf_scores.get(key, 0.0) + 1.0 / (rank + 1 + K)
        doc_store[key] = {"id": doc_id, "store": store_name, "text": doc, "source": "vector", "metadata": meta or {}}

    for rank, (doc_id, doc, bm25_score, meta, store_name) in enumerate(bm25_scored):
        key = (store_name, doc_id)
        rrf_scores[key] = rrf_scores.get(key, 0.0) + 1.0 / (rank + 1 + K)
        if key not in doc_store:
            doc_store[key] = {"id": doc_id, "store": store_name, "text": doc, "source": "bm25", "metadata": meta or {}}
        else:
            doc_store[key]["source"] = "vector+bm25"

    merged = sorted(
        [{"id": doc_store[key]["id"], "store": doc_store[key]["store"], "text": doc_store[key]["text"],
          "score": score, "source": doc_store[key]["source"], "metadata": doc_store[key]["metadata"]}
         for key, score in rrf_scores.items()],
        key=lambda x: x["score"],
        reverse=True,
    )[:width]

    # Visibility into whether BM25 is contributing anything at all, or RRF is
    # leaning entirely on the dense side without it being obvious — short
    # chunks (the function-level ones from ingest_ck_wiki.py) give BM25 weak
    # term-frequency signal, so this is worth watching as real content scales.
    vector_only = sum(1 for r in merged if r["source"] == "vector")
    bm25_only = sum(1 for r in merged if r["source"] == "bm25")
    both = sum(1 for r in merged if r["source"] == "vector+bm25")
    log.info("hybrid_retrieve(%r): %d vector-only, %d bm25-only, %d both",
              query[:60], vector_only, bm25_only, both)

    if not return_diagnostics:
        return merged

    bm25_scores_sorted = [s[2] for s in bm25_scored]  # already descending (argsort by -score)
    diagnostics = {
        "sem_dists": sem_dists,
        "bm25_scores": bm25_scores_sorted,
    }
    return merged, diagnostics


def expand_to_parent(results: list[dict]) -> list[str]:
    """
    Turn retrieval results into context text, expanding any result with a
    `parent_id` in its metadata to that parent section's full text instead of
    its tight chunk. Ranking already happened against the tight chunks in
    hybrid_retrieve() — this only changes what text reaches the prompt.

    Capped at MAX_EXPANDED_PARENTS distinct parents per call so one query
    that happens to hit several chunks from the same page doesn't balloon the
    prompt with duplicate or excessive context; results beyond the cap (or
    with no parent_id) just use their own chunk text.
    """
    expanded_cache: dict[str, str] = {}
    parts: list[str] = []
    for r in results:
        parent_id = (r.get("metadata") or {}).get("parent_id") or ""
        if not parent_id:
            parts.append(r["text"])
            continue
        if parent_id in expanded_cache:
            parts.append(expanded_cache[parent_id])
            continue
        if len(expanded_cache) >= MAX_EXPANDED_PARENTS:
            parts.append(r["text"])  # expansion budget spent — fall back to the tight chunk
            continue
        # Parent lives in whichever collection the child came from.
        coll = get_curated_collection() if r.get("store") == "curated" else get_runtime_collection()
        fetched = coll.get(ids=[parent_id], include=["documents"])
        docs = fetched.get("documents") or []
        parent_text = docs[0] if docs else r["text"]
        expanded_cache[parent_id] = parent_text
        parts.append(parent_text)
    return parts


# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH
# ═══════════════════════════════════════════════════════════════════════════════

def _build_knowledge_graph() -> nx.DiGraph:
    """Build an in-memory directed knowledge graph from bootstrap entries and saved JSON."""
    G = nx.DiGraph()
    # Load persisted graph if available
    if GRAPH_PATH.exists():
        with open(GRAPH_PATH, encoding="utf-8") as f:
            data = json.load(f)
        G = nx.node_link_graph(data)
        log.info("Knowledge graph loaded: %d nodes, %d edges.", G.number_of_nodes(), G.number_of_edges())
        return G

    # Seed graph from bootstrap categories
    from bootstrap_fallout4_knowledge import build_bootstrap_entries
    entries = build_bootstrap_entries()
    for e in entries:
        G.add_node(e["id"], title=e["title"], category=e.get("category", "general"), tags=e.get("tags", []))

    # Basic edges from tags overlap (high overlap = related)
    entry_list = entries
    for i, a in enumerate(entry_list):
        for b in entry_list[i+1:]:
            common = set(a.get("tags", [])) & set(b.get("tags", []))
            if len(common) >= 2:
                G.add_edge(a["id"], b["id"], relation="related", weight=len(common))
                G.add_edge(b["id"], a["id"], relation="related", weight=len(common))

    # Persist for next run
    GRAPH_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(GRAPH_PATH, "w", encoding="utf-8") as f:
        json.dump(nx.node_link_data(G), f)
    log.info("Knowledge graph built and saved: %d nodes, %d edges.", G.number_of_nodes(), G.number_of_edges())
    return G


def get_graph() -> nx.DiGraph:
    global _graph
    if _graph is None:
        _graph = _build_knowledge_graph()
    return _graph


def graph_expand(doc_ids: list[str], hops: int = 1) -> list[str]:
    """Return IDs of nodes connected to any of doc_ids within `hops` edges."""
    G = get_graph()
    expanded = set(doc_ids)
    for _ in range(hops):
        new_nodes = set()
        for node in list(expanded):
            if G.has_node(node):
                new_nodes.update(G.successors(node))
                new_nodes.update(G.predecessors(node))
        expanded.update(new_nodes)
    return list(expanded - set(doc_ids))  # only the new ones


# ═══════════════════════════════════════════════════════════════════════════════
# WEB SEARCH GROUNDING
# ═══════════════════════════════════════════════════════════════════════════════

def web_search(query: str, max_results: int = 3) -> Optional[str]:
    """DuckDuckGo search — returns combined text snippet or None if failed."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return None
        snippets = []
        for r in results:
            title = r.get("title", "")
            body  = r.get("body", "")
            href  = r.get("href", "")
            snippets.append(f"[{title}]({href}): {body}")
        return "\n\n".join(snippets)
    except Exception as e:
        log.warning("Web search failed: %s", e)
        return None


def auto_save_to_chroma(query: str, web_text: str):
    """
    Persist a web search result for future retrieval. RUNTIME collection only
    — this is exactly the kind of unreviewed content that must never reach
    the curated pack users download (see get_curated_collection()/
    get_runtime_collection() docstrings and reset_collection.py).
    """
    coll = get_runtime_collection()
    doc_id = f"web-{int(time.time())}"
    # Embed explicitly with the same model hybrid_retrieve() uses for queries
    # (BAAI/bge-small-en-v1.5). Without this, Chroma falls back to its own
    # default embedding function (all-MiniLM-L6-v2) for the document vector
    # while queries are embedded with bge-small — two different vector spaces,
    # so cosine similarity between them is meaningless and silently degrades
    # every retrieval, with no error to signal it.
    coll.upsert(
        ids=[doc_id],
        documents=[web_text],
        embeddings=embed([web_text]),
        metadatas=[{"source": "web", "query": query[:200], "ts": datetime.utcnow().isoformat()}],
    )
    # Rebuild BM25 next query
    global _bm25
    _bm25 = None
    log.info("Web result saved to ChromaDB: %s", doc_id)


# ═══════════════════════════════════════════════════════════════════════════════
# EPISODIC MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

def save_episode(summary: str, topics: list[str], outcome: str = "completed"):
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO episodes (ts, summary, topics, outcome) VALUES (?, ?, ?, ?)",
        (datetime.utcnow().isoformat(), summary, ",".join(topics), outcome),
    )
    # Evict oldest if over cap
    conn.execute(
        "DELETE FROM episodes WHERE id IN "
        "(SELECT id FROM episodes ORDER BY id ASC LIMIT MAX(0, (SELECT COUNT(*) FROM episodes) - ?))",
        (MAX_EPISODES,),
    )
    conn.commit()
    conn.close()


def search_episodes(query: str, limit: int = 5) -> list[str]:
    """Simple keyword search over past episode summaries."""
    conn = sqlite3.connect(str(DB_PATH))
    words = query.lower().split()
    if not words:
        conn.close()
        return []
    # Limit words and sanitize: keep only alphanumeric/space characters
    safe_words = [re.sub(r'[^a-zA-Z0-9 _\-]', '', w)[:40] for w in words[:8]]
    safe_words = [w for w in safe_words if w]
    if not safe_words:
        conn.close()
        return []
    # Build parameterized LIKE clauses — number of clauses is bounded (max 8)
    like_clauses = " OR ".join(["LOWER(summary) LIKE ?" for _ in safe_words])
    params = [f"%{w}%" for w in safe_words]
    rows = conn.execute(
        f"SELECT ts, summary FROM episodes WHERE {like_clauses} ORDER BY id DESC LIMIT ?",
        params + [limit],
    ).fetchall()
    conn.close()
    return [f"[{row[0][:10]}] {row[1]}" for row in rows]


def infer_answer(question: str, diagnosis: Optional[str] = None, answer_level: Optional[str] = None) -> dict:
    """Retrieve context, then generate an answer via the shared backend. No LangGraph/
    critique-refine loop in this build — deliberately dropped to keep dependencies
    minimal for a must-just-work installer (langgraph/langchain-community pull in a
    lot of transitive weight for a self-correction pass that adds real but secondary
    value over a single well-grounded generation call). If that loop is worth having
    later, add it back as a dependency the packaged build explicitly opts into, not a
    default.

    `diagnosis` and `answer_level` (both computed by the caller before this runs) are
    injected into the prompt so they actually shape the answer instead of being
    decorative metadata attached after the fact.

    Returns dict with keys: answer, confidence, sources, critique_applied, used_web.
    """
    results = hybrid_retrieve(question, top_k=6)
    ctx = "\n\n".join(expand_to_parent(results))
    sources = [_citation_from_result(r) for r in results]
    used_web = False
    if not ctx:
        web = web_search(question)
        if web:
            ctx = f"[Web]\n{web}"
            used_web = True
            auto_save_to_chroma(question, web)
    episodes = search_episodes(question, limit=3)
    episode_ctx = f"\n\nRELEVANT PAST SESSIONS:\n" + "\n".join(episodes) if episodes else ""
    diagnosis_ctx = f"\nWHAT THEY ACTUALLY NEED (diagnosed before answering): {diagnosis}\n" if diagnosis else ""
    level_ctx = _answer_level_prompt_fragment(answer_level)
    prompt = (
        f"You are Mossy, an expert Fallout 4 modding AI assistant built into a 23-platform desktop app "
        f"(Electron + React + TypeScript). You provide grounded, cited answers to modding questions using "
        f"real Creation Kit/F4SE/Papyrus documentation.\n\n"
        f"KNOWLEDGE BASE CONTEXT:\n{ctx}\n"
        f"{episode_ctx}{diagnosis_ctx}{level_ctx}\n"
        f"USER QUESTION: {question}\n\n"
        f"Provide a thorough, accurate answer. Cite specific tools, record types, "
        f"or INI settings where relevant.\n\nMOSSY:"
    )
    answer = generate_answer(prompt, max_new_tokens=512)
    return {"answer": answer, "confidence": 0.7 if ctx else 0.4, "sources": sources,
            "critique_applied": False, "used_web": used_web}


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE CONTRACT — TUTORING PEDAGOGY
# ═══════════════════════════════════════════════════════════════════════════════
# v1 of the tutor response contract. Two design decisions worth calling out
# explicitly rather than discovering later:
#
# 1. ENFORCEMENT MECHANISM: retry-on-parse-failure, not constrained decoding.
#    Generation goes through the cloud backend's chat API (see
#    generate_text_backend()), which offers no grammar-constrained decoding
#    option. So: small JSON asks (1-2 keys, never the whole contract in one
#    call — see diagnose()/contract_fields() below), strict-mode retry,
#    deterministic fallback, and every failure logged to `contract_failures`.
#    If that table's growth rate says retries aren't covering it, that's the
#    trigger to revisit this — as a measured decision, not a surprise.
#
# 2. MODE IS THE BYPASS. Not every turn is a teaching turn — someone mid-debug
#    asking for a function signature should not get a check_question. `mode`
#    (teach / answer / debug) controls this: check_question is only ever
#    requested from the model when mode == "teach". classify_mode() below is
#    a keyword heuristic standing in for the real router (split-brain idea
#    #4 — not built yet). /infer accepts an optional `mode` in the request
#    body specifically so a real router can override this heuristic later
#    without any other code here changing.

def classify_mode(question: str) -> str:
    """
    The router role from the original four-role split (router / retriever /
    planner / responder) — the one role that had been standing in as a
    keyword heuristic since the very first /infer draft, silently capping
    everything tutorial on it: if this never returns "teach", the
    check_question card never renders and answer_level never gets exercised,
    with no signal from the code that anything's wrong.

    An LLM classification call beats keywords on exactly the cases keywords
    can't handle — "walk me through why this keeps crashing" is legitimately
    both teach and debug; a keyword list picks one arbitrarily by which list
    it happens to scan first, a model can actually weigh it.

    Uses Brain B's OWN already-loaded model via the same small-JSON-with-retry
    pattern as diagnose()/contract_fields() (_generate_json), not a separate
    Qwen2.5-Coder/Ollama call or a new Groq client threaded into this Python
    process — both of those are real options but are a second untested
    integration path and a new dependency (a specific local model already
    pulled, or a new credential surface) for what's a 3-way classification
    task Brain B's own model is already perfectly sized for. Falls back to
    the original keyword heuristic on any parse failure, exactly like every
    other LLM-derived field in this file — this router is not allowed to be
    a single point of failure for the whole turn.
    """
    prompt = (
        "Classify this Fallout 4 modding question into exactly one category:\n\n"
        '- "teach": they want to understand a concept ("how does X work", "what is X", '
        '"explain X", "what\'s the difference between X and Y")\n'
        '- "debug": something is broken and needs fixing ("X isn\'t working", "getting an '
        'error", "crashes when I", "won\'t compile")\n'
        '- "answer": a direct factual/lookup question that is neither of the above '
        '("what are the parameters of X", "where is Y defined")\n\n'
        f"Question: {question}\n\n"
        'Return ONLY JSON: {"mode": "teach"} or {"mode": "debug"} or {"mode": "answer"}'
    )
    parsed, raw, attempts = _generate_json(prompt, ["mode"], max_new_tokens=20)
    mode = (parsed or {}).get("mode")
    if mode in ("teach", "debug", "answer"):
        # Always compute the keyword verdict too, even though it's not used —
        # this is the free measurement: log both so a week of real questions
        # gives a real disagreement rate instead of a handful eyeballed by
        # hand during a 2-minute GUI pass.
        log_mode_classification(question, mode, _classify_mode_keywords(question))
        return mode
    log_contract_failure(question, "classify_mode", raw, attempts)
    return _classify_mode_keywords(question)


def log_mode_classification(question: str, llm_mode: str, keyword_mode: str) -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO mode_classifications (ts, question, llm_mode, keyword_mode, agree) VALUES (?,?,?,?,?)",
        (datetime.utcnow().isoformat(), question[:500], llm_mode, keyword_mode,
         1 if llm_mode == keyword_mode else 0),
    )
    conn.commit()
    conn.close()


def _classify_mode_keywords(question: str) -> str:
    """
    The original router: a keyword heuristic. Now the fallback for when the
    LLM classification call above fails to parse, not the primary path.
    """
    q = question.lower()
    debug_markers = ("error", "crash", "ctd", "doesn't work", "not working", "broken",
                      "exception", "traceback", "stack trace", "won't load", "wont load",
                      "fails to", "papyrus log", "null reference", "won't compile",
                      "wont compile")
    teach_markers = ("how do i", "how does", "what is", "what's the", "explain",
                      "why does", "why is", "teach me", "i'm new", "im new",
                      "beginner", "walk me through", "i don't understand",
                      "i dont understand", "difference between")
    if any(m in q for m in debug_markers):
        return "debug"
    if any(m in q for m in teach_markers):
        return "teach"
    return "answer"


# ═══════════════════════════════════════════════════════════════════════════════
# LEARNER MODEL — derived from retrieval side-effects, not model self-report
# ═══════════════════════════════════════════════════════════════════════════════
# Deliberately NOT "ask the model how advanced this user is" — a 9B asked that
# question directly answers inconsistently turn to turn, and state built on an
# inconsistent self-report is state built on noise. Everything here instead
# comes from facts already being logged: which skill_tags the retrieved chunks
# carry (see skill_tags.py), how many times a skill has come up, whether those
# turns were in debug mode. learner_signal (the model's free-text guess) stays
# a tiebreaker for future schema design, never the source of truth for this.

def extract_skill_ids(results: list[dict]) -> set[str]:
    """Union of skill_tags across a set of retrieval results."""
    skill_ids: set[str] = set()
    for r in results:
        meta = r.get("metadata") or {}
        tags_str = meta.get("skill_tags", "")
        if isinstance(tags_str, str) and tags_str:
            skill_ids.update(t.strip() for t in tags_str.split(",") if t.strip())
    return skill_ids


def compute_answer_level(user_id: str, skill_ids: set[str], override: Optional[str] = None) -> str:
    """
    Deliberately crude, per the same reasoning that kept diagnosis/mode
    simple: "crude and defensible" beats "sophisticated and hallucinated."
    Reads state as it stood BEFORE this turn's exposure is recorded (see
    /infer's call order) — a user's first-ever question about a skill should
    read as "unseen", not be inflated by counting the very question that
    revealed it.

      - explicit override (settings, once a UI exists to set it) always wins
      - unseen, or 1-2 prior exposures -> beginner
      - >2 prior exposures AND at least one was a debug-mode turn -> intermediate
      - >2 prior exposures with no debug-mode turn -> still beginner (repeated
        reading without ever hitting a real problem isn't evidence of comfort
        with the material — only stated as two conditions in the spec this
        was built from, so no third bucket invented beyond it)
    """
    if override in ("beginner", "intermediate", "advanced"):
        return override
    if not user_id or user_id == "unknown" or not skill_ids:
        return "beginner"
    conn = sqlite3.connect(str(DB_PATH))
    placeholders = ",".join("?" * len(skill_ids))
    rows = conn.execute(
        f"SELECT exposure_count, debug_turns FROM learner_state WHERE user_id=? AND skill_id IN ({placeholders})",
        (user_id, *skill_ids),
    ).fetchall()
    conn.close()
    if not rows:
        return "beginner"
    max_exposure = max(r[0] for r in rows)
    total_debug = sum(r[1] for r in rows)
    if max_exposure > 2 and total_debug > 0:
        return "intermediate"
    return "beginner"


def update_learner_state(user_id: str, skill_ids: set[str], mode: str) -> None:
    """
    Increments exposure for every skill touched THIS turn. Called after
    compute_answer_level() so the level reflects who the user was walking
    into the question, not who they became by asking it.
    """
    if not user_id or user_id == "unknown" or not skill_ids:
        return
    ts = datetime.utcnow().isoformat()
    is_debug = 1 if mode == "debug" else 0
    conn = sqlite3.connect(str(DB_PATH))
    for skill_id in skill_ids:
        row = conn.execute(
            "SELECT exposure_count FROM learner_state WHERE user_id=? AND skill_id=?",
            (user_id, skill_id),
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO learner_state (user_id, skill_id, exposure_count, first_seen, last_seen, "
                "debug_turns, repeat_asks) VALUES (?,?,1,?,?,?,0)",
                (user_id, skill_id, ts, ts, is_debug),
            )
        else:
            # repeat_asks: every re-exposure beyond the first. A coarse proxy for
            # "came back to this skill again" — not the same signal as debug_turns
            # (which flags specifically debugging-context exposure), and not
            # claiming to detect near-duplicate question phrasing.
            conn.execute(
                "UPDATE learner_state SET exposure_count = exposure_count + 1, last_seen = ?, "
                "debug_turns = debug_turns + ?, repeat_asks = repeat_asks + 1 "
                "WHERE user_id=? AND skill_id=?",
                (ts, is_debug, user_id, skill_id),
            )
    conn.commit()
    conn.close()


def suggest_next_skill(user_id: str, current_skill_ids: set[str]) -> Optional[str]:
    """
    Interim stand-in for a real skill graph: the tag that most often
    co-occurs (in the same chunk's skill_tags) with what this turn touched,
    excluding tags already in play and tags this user has already been
    exposed to. Approximates "what usually comes next" from real document
    co-occurrence instead of a hand-built prerequisite graph — costs one
    ChromaDB read over the (currently small) curated collection, recomputed
    per call rather than cached, since that's cheap at this corpus size.
    """
    if not current_skill_ids:
        return None
    coll = get_curated_collection()
    if coll.count() == 0:
        return None
    result = coll.get(include=["metadatas"])
    co_occur: Counter = Counter()
    for meta in result["metadatas"]:
        tags_str = (meta or {}).get("skill_tags", "")
        doc_tags = set(t.strip() for t in tags_str.split(",") if t.strip())
        shared = doc_tags & current_skill_ids
        if not shared:
            continue
        for t in doc_tags - current_skill_ids:
            co_occur[t] += 1

    if not co_occur:
        return None

    exposed: set[str] = set()
    if user_id and user_id != "unknown":
        conn = sqlite3.connect(str(DB_PATH))
        rows = conn.execute(
            "SELECT skill_id FROM learner_state WHERE user_id=? AND exposure_count > 0", (user_id,)
        ).fetchall()
        conn.close()
        exposed = {r[0] for r in rows}

    for tag, _count in co_occur.most_common():
        if tag not in exposed:
            return tag
    return None


def _answer_level_prompt_fragment(answer_level: Optional[str]) -> str:
    """
    Turns a computed answer_level into an actual instruction in the generation
    prompt. This is the line that decides whether answer_level is real or
    decorative — see the validation notes near build_knowledge_db.py's
    validate_records() for the same principle applied to a different field.
    """
    if answer_level == "beginner":
        return ("\nAUDIENCE LEVEL — BEGINNER: They're new to this specific skill area. "
                "Explain foundational terms as you use them, use a concrete analogy, "
                "don't assume prior Papyrus/Creation Kit experience beyond what the "
                "knowledge base context implies they already have.\n")
    if answer_level == "intermediate":
        return ("\nAUDIENCE LEVEL — INTERMEDIATE: They've hit this skill area repeatedly, "
                "including while debugging. Skip re-explaining basic syntax or concepts "
                "they've almost certainly already seen — be technical and concise, and "
                "focus on the specific mechanism they're asking about.\n")
    return ""


def _extract_json(raw: str) -> Optional[dict]:
    """Best-effort JSON object extraction from a model completion."""
    if not raw:
        return None
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    else:
        brace = re.search(r"\{.*\}", text, re.S)
        if brace:
            text = brace.group(0)
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def _generate_json(prompt: str, required_keys: list[str], max_new_tokens: int = 200,
                    max_retries: int = 2) -> tuple[Optional[dict], str, int]:
    """
    Generate + parse a small JSON object, retrying on parse failure with a
    stricter instruction and lower temperature each attempt.
    Returns (parsed_dict_or_None, last_raw_output, attempts_used).

    Routes through generate_answer() (cloud-first, local fallback), same as long-form
    answers — NOT generate_text() (pure local) directly. This used to be local-only on
    the theory that classify_mode/diagnose/contract_fields were small enough to fit this
    card's local budget reliably; verified false on real hardware instead: this exact
    quantized checkpoint produced garbage/empty output on every JSON-mode call all
    night, on trivial prompts, independent of prompt size — ruled out double-BOS,
    missing chat template, wrong attention_mask/pad_token, and fp16-vs-bf16 as causes.
    The same style of prompt sent to the cloud backend instead produced correct,
    coherent output immediately. Whatever the checkpoint issue is, it isn't specific to
    long-form generation.
    """
    last_raw = ""
    for attempt in range(max_retries + 1):
        suffix = (
            f"\n\nReturn ONLY a single JSON object with exactly these keys: "
            f"{', '.join(required_keys)}. No markdown fences, no prose before or after, "
            f"no other keys."
            if attempt > 0 else ""
        )
        last_raw = generate_answer(
            prompt + suffix,
            max_new_tokens=max_new_tokens,
            temperature=max(0.1, 0.4 - attempt * 0.15),
        )
        parsed = _extract_json(last_raw)
        if parsed is not None and all(k in parsed for k in required_keys):
            return parsed, last_raw, attempt + 1
    return None, last_raw, max_retries + 1


def log_contract_failure(question: str, stage: str, raw_output: str, attempts: int):
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO contract_failures (ts, question, stage, raw_output, attempts) VALUES (?,?,?,?,?)",
        (datetime.utcnow().isoformat(), question[:500], stage, (raw_output or "")[:2000], attempts),
    )
    conn.commit()
    conn.close()
    # The raw output is what tells you WHICH failure this is — truncated JSON, prose
    # wrapped around JSON, and empty string are three different bugs with three
    # different fixes, and a parse exception alone can't distinguish them. Full raw
    # output is in contract_failures (this table) if 300 chars isn't enough.
    log.warning("[contract] parse failed after %d attempts (stage=%s): %s | raw_output=%r",
                attempts, stage, question[:80], (raw_output or "")[:300])


def log_retrieval(session_id: str, agreement: int, bm25_margin: Optional[float], tier: str):
    """Unconditional, every turn — see retrieval_log's CREATE TABLE comment
    for why this exists separately from log_learner_signal."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO retrieval_log (ts, session_id, agreement, bm25_margin, tier) VALUES (?,?,?,?,?)",
        (datetime.utcnow().isoformat(), session_id or "unknown", agreement, bm25_margin, tier),
    )
    conn.commit()
    conn.close()


def log_learner_signal(question: str, mode: str, learner_signal: Optional[str], diagnosis: Optional[str],
                        session_id: str = "unknown"):
    if not learner_signal:
        return
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO learner_signals (ts, session_id, question, mode, learner_signal, diagnosis) VALUES (?,?,?,?,?,?)",
        (datetime.utcnow().isoformat(), session_id or "unknown", question[:500], mode,
         learner_signal[:500], (diagnosis or "")[:500]),
    )
    conn.commit()
    conn.close()


def diagnose(question: str, mode: str) -> Optional[str]:
    """
    One-sentence read on what the user actually needs vs. what they literally
    asked, computed BEFORE the answer so it can shape the answer instead of
    being decorative metadata attached after the fact. Nullable — a failed
    diagnosis should never block the actual answer.
    """
    prompt = (
        "You are diagnosing a Fallout 4 modding question before answering it. "
        "In one sentence, identify what the user actually needs to know to solve "
        "their real problem — which may be narrower or broader than their literal "
        "wording (e.g. someone asking for an OnTriggerEnter snippet who has never "
        "cast an ObjectReference actually needs that prerequisite first).\n\n"
        f"Mode: {mode}\nQuestion: {question}\n\n"
        'Return ONLY JSON: {"diagnosis": "<one sentence>"}'
    )
    parsed, raw, attempts = _generate_json(prompt, ["diagnosis"], max_new_tokens=120)
    if parsed is None:
        log_contract_failure(question, "diagnose", raw, attempts)
        return None
    diagnosis = str(parsed.get("diagnosis") or "").strip()
    return diagnosis or None


def classify_and_diagnose(question: str) -> tuple[str, Optional[str]]:
    """
    Merges classify_mode() and diagnose() into ONE _generate_json call.

    NOT wired into /infer by default. Kept ready as the fix for exactly one
    failure mode: if the GUI pass shows unacceptable dead air from three
    sequential small-model passes (classify, diagnose, generate) before the
    user sees a first token — slow-but-smart loses to fast-and-decent in a
    chat UI. mode and diagnosis operate on the same input and are both small
    structured-output asks; _generate_json already handles multi-field
    extraction, so asking for both together costs close to what asking for
    one does, not double.

    Deliberately built now and left inactive rather than activated
    preemptively: the first real-GPU latency measurement should reflect the
    architecture as actually deployed (two separate calls), not an
    optimization applied before anyone knows it's needed. If that
    measurement shows the dead air is a real problem, activate this by
    replacing, in /infer:
        mode = data.get("mode") or classify_mode(question)
        ...
        diagnosis = diagnose(question, mode)
    with:
        mode, diagnosis = data.get("mode"), None
        if not mode:
            mode, diagnosis = classify_and_diagnose(question)
        elif mode == "teach":  # still want a real diagnosis even if mode was passed explicitly
            diagnosis = diagnose(question, mode)

    Falls back per field independently, matching the two-call path's
    graceful-degradation contract: mode falls back to the keyword heuristic,
    diagnosis falls back to None. Logs the same mode_classifications
    comparison as classify_mode() when the merged call succeeds.
    """
    prompt = (
        "Classify this Fallout 4 modding question AND diagnose what the user "
        "actually needs, in one pass.\n\n"
        'Mode — exactly one of "teach" (they want to understand a concept), '
        '"debug" (something is broken and needs fixing), or "answer" (a direct '
        "factual/lookup question that's neither).\n\n"
        "Diagnosis — one sentence: what do they actually need to know to solve "
        "their real problem, which may be narrower or broader than their literal "
        "wording (e.g. someone asking for an OnTriggerEnter snippet who has never "
        "cast an ObjectReference actually needs that prerequisite first).\n\n"
        f"Question: {question}\n\n"
        'Return ONLY JSON: {"mode": "teach"|"debug"|"answer", "diagnosis": "<one sentence>"}'
    )
    parsed, raw, attempts = _generate_json(prompt, ["mode", "diagnosis"], max_new_tokens=150)
    keyword_mode = _classify_mode_keywords(question)

    if parsed is None:
        log_contract_failure(question, "classify_and_diagnose", raw, attempts)
        return keyword_mode, None

    mode = parsed.get("mode")
    if mode not in ("teach", "debug", "answer"):
        mode = keyword_mode
    else:
        log_mode_classification(question, mode, keyword_mode)

    diagnosis = str(parsed.get("diagnosis") or "").strip() or None
    return mode, diagnosis


def contract_fields(question: str, answer: str, mode: str, diagnosis: Optional[str]) -> dict:
    """
    The LLM-derived half of the response contract, computed AFTER the answer
    exists: check_question and learner_signal. answer_level and next_skill are
    NOT computed here anymore — they're data-derived, not LLM-derived (see
    compute_answer_level()/suggest_next_skill() and /infer, which calls them
    directly against learner_state before generation even happens). Keeping
    them out of this function is deliberate: this one small JSON call is for
    the two things that genuinely need the model's judgment, not a dumping
    ground for everything in the contract.

    learner_signal (free text: what the model would want to know about this
    user to answer better next time) is still requested — it's the tiebreaker
    for future schema design, not the source of truth for answer_level itself.

    check_question is only requested when mode == "teach" — this is the
    contract's bypass for non-teaching turns (see module docstring above).
    """
    want_check_question = mode == "teach"
    keys = ["learner_signal"] + (["check_question"] if want_check_question else [])

    prompt = (
        "Given this Fallout 4 modding Q&A turn, fill in tutoring metadata.\n\n"
        f"Mode: {mode}\nDiagnosis: {diagnosis or 'none'}\n"
        f"Question: {question}\nAnswer given: {answer[:800]}\n\n"
        '- "learner_signal": one short free-text note on what you would want to know '
        "about this user's skill level or history to answer better next time "
        "(e.g. \"whether they've used ObjectReference casting before\"). There is no "
        "skill-tracking system yet — this is logged to help design one from real data.\n"
        + ('- "check_question": one short question to verify they understood the key '
           "concept just taught (only include this key because mode is \"teach\").\n"
           if want_check_question else "")
        + f"Return ONLY JSON with exactly these keys: {', '.join(keys)}"
    )
    parsed, raw, attempts = _generate_json(prompt, keys, max_new_tokens=180)
    if parsed is None:
        log_contract_failure(question, "contract_fields", raw, attempts)
        parsed = {}

    return {
        "check_question": parsed.get("check_question") if want_check_question else None,
        "learner_signal": parsed.get("learner_signal"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SELF-CRITIQUE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/reflect", methods=["POST"])
def reflect():
    """
    POST /reflect  { "question": "...", "answer": "..." }
    Returns { "critique": "...", "refined": "...", "improved": bool }
    """
    data = request.get_json(force=True)
    question = data.get("question", "")
    answer   = data.get("answer", "")
    if not question or not answer:
        return jsonify({"error": "question and answer required"}), 400

    critique_prompt = (
        f"Review this Fallout 4 modding answer for accuracy and completeness:\n\n"
        f"Q: {question}\nA: {answer}\n\n"
        f"List specific errors or important missing steps (2–4 bullets). If accurate, reply: LGTM"
    )
    critique = generate_answer(critique_prompt, max_new_tokens=256, temperature=0.3)

    if critique.upper().startswith("LGTM"):
        return jsonify({"critique": "LGTM", "refined": answer, "improved": False})

    refine_prompt = (
        f"Improve this answer based on the critique:\n\n"
        f"Q: {question}\nA: {answer}\n\nCritique: {critique}\n\nImproved answer:\n"
    )
    refined = generate_answer(refine_prompt, max_new_tokens=512)
    return jsonify({"critique": critique, "refined": refined, "improved": True})


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN INFERENCE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/infer", methods=["POST"])
def infer():
    """
    POST /infer  { "question": "...", "mode": "teach|answer|debug",
                   "session_id": "...", "user_id": "...", "experience_level_override": "beginner" }

    `mode` is optional — omit it to fall back to classify_mode()'s keyword
    heuristic. Pass it explicitly once a real router exists upstream.

    `session_id` identifies one app session (per-launch); `user_id` identifies
    one learner across every session (persisted client-side, e.g.
    LocalAIEngine.ts stores it once via crypto.randomUUID() and reuses it on
    every future launch). Both optional, both default to "unknown" rather
    than a synthesized value that would look legitimate without identifying
    anyone. `user_id` specifically is what learner_state is keyed on — without
    it, no exposure tracking happens for that turn at all (see
    update_learner_state()), so answer_level/next_skill stay at their
    no-history defaults regardless of what was actually asked.

    `experience_level_override`, if one of beginner/intermediate/advanced, wins
    over the computed answer_level unconditionally — see compute_answer_level().
    No settings UI sets this yet; the parameter exists so one can be added
    without any server-side change.

    Returns {
      "answer": "...", "confidence": 0.8, "sources": [...],
      "mode": "teach|answer|debug",
      "diagnosis": "..." | null,
      "check_question": "..." | null,   -- only non-null when mode == "teach"
      "answer_level": "beginner|intermediate|advanced" | null,
      "next_skill": "..." | null,       -- a skill_tags.py tag, or null
      "abstained": bool,                -- true when retrieval was too weak to attempt any
                                         -- answer at all — see retrieval_tuning.py
      "hedged": bool,                   -- true when an answer WAS generated but retrieval
                                         -- was only ambiguous, not strong — the answer text
                                         -- is prefixed with a "closest match" disclaimer
                                         -- naming the actual top citation
      ...
    }
    """
    data                = request.get_json(force=True)
    question            = data.get("question", "").strip()
    mode                = data.get("mode") or classify_mode(question)
    session_id          = data.get("session_id") or "unknown"
    user_id             = data.get("user_id") or "unknown"
    experience_override = data.get("experience_level_override")

    if not question:
        return jsonify({"error": "question required"}), 400
    if mode not in ("teach", "answer", "debug"):
        mode = "answer"

    # Episodic memory context
    episodes = search_episodes(question, limit=3)

    # Abstention gate — checked BEFORE generation, not after, so a genuine miss
    # skips the expensive critique pipeline entirely rather than generating
    # from context that isn't actually relevant. classify_retrieval is the
    # single shared decision boundary — see retrieval_tuning.py's module
    # docstring for the full history (probe_k=30, and why a binary abstain/
    # confident split stopped being enough at this corpus size).
    probe, _retrieval_diag = hybrid_retrieve(question, top_k=6, probe_k=30, return_diagnostics=True)
    agreement = sum(1 for r in probe if r["source"] == "vector+bm25")
    bm25_scores = _retrieval_diag["bm25_scores"]
    bm25_margin = (bm25_scores[0] - bm25_scores[-1]) if len(bm25_scores) >= 2 else None
    retrieval_tier = classify_retrieval(agreement, bm25_margin)
    log_retrieval(session_id, agreement, bm25_margin, retrieval_tier)
    if retrieval_tier == "abstain":
        log.info("Abstaining on %r — retrieval agreement %d, bm25_margin %s", question[:60],
                  agreement, bm25_margin)
        log_learner_signal(question, mode, f"no documentation found for: {question[:200]}",
                            diagnosis=None, session_id=session_id)
        # No learner_state update on abstention — an abstained turn touched no
        # real content, so there's nothing to attribute exposure to. "Corpus
        # gap, not learner gap": the coverage_gaps.py signal is the right tool
        # for this, not the learner model.
        result = {
            "answer": NO_DOCS_MESSAGE, "confidence": 0.0, "sources": [],
            "critique_applied": False, "used_web": False, "abstained": True, "hedged": False,
            "mode": mode, "diagnosis": None, "check_question": None,
            "answer_level": None, "next_skill": None, "past_episodes": episodes,
        }
        # Deliberately NOT saved as an episode — it's a non-answer, not a
        # resolved interaction; saving it would pollute episodic memory.
        return jsonify(result)

    # Learner model: read state BEFORE this turn's exposure is recorded, so
    # answer_level reflects who the user was walking in, not who they became
    # by asking. skill_ids come from the same probe used for the abstention
    # check — no extra retrieval call needed for this. Sliced to the first 6
    # (probe is now up to 30 wide for the agreement check) so exposure
    # tracking still reflects only the docs actually relevant enough to
    # answer with, not the full wide diagnostic window.
    skill_ids = extract_skill_ids(probe[:6])
    answer_level = compute_answer_level(user_id, skill_ids, experience_override)
    update_learner_state(user_id, skill_ids, mode)
    next_skill = suggest_next_skill(user_id, skill_ids)

    # Diagnose BEFORE generating, so it shapes the answer rather than just
    # describing it after the fact. Nullable — never blocks the answer.
    diagnosis = diagnose(question, mode)

    try:
        result = infer_answer(question, diagnosis=diagnosis, answer_level=answer_level)
    except Exception as e:
        log.exception("Inference failed: %s", e)
        # Return a generic error message to avoid leaking internal stack traces
        return jsonify({"error": "Inference failed. Check server logs for details."}), 500

    fields = contract_fields(question, result.get("answer", ""), mode, diagnosis)
    log_learner_signal(question, mode, fields.get("learner_signal"), diagnosis, session_id=session_id)

    result["mode"] = mode
    result["diagnosis"] = diagnosis
    result["check_question"] = fields["check_question"]
    result["answer_level"] = answer_level
    result["next_skill"] = next_skill
    result["abstained"] = False
    result["hedged"] = retrieval_tier == "hedge"

    # Hedge tier: still generate a real answer from the same retrieved context
    # (unlike abstain) — but lead with an explicit "closest I have" framing
    # naming the actual top citation, rather than presenting it with the same
    # confidence as a genuine strong match. See retrieval_tuning.py.
    if result["hedged"] and result.get("answer") and probe:
        top_title = (probe[0].get("metadata") or {}).get("title") or probe[0].get("id", "this")
        result["answer"] = (
            f"I don't have documentation directly covering this — the closest match "
            f"I have is *{top_title}*. Treating that as a lead, not a confirmed answer:\n\n"
            + result["answer"]
        )

    # Optionally auto-save episode summary
    if result.get("answer"):
        summary = f"Q: {question[:80]} → {result['answer'][:120]}"
        # sources is now a list of citation dicts (see _citation_from_result) — save_episode
        # wants bare topic strings, so pull just the ids back out.
        topic_ids = [s.get("id", "?") if isinstance(s, dict) else s for s in result.get("sources", [])][:5]
        save_episode(summary, topic_ids)

    result["past_episodes"] = episodes
    return jsonify(result)


# ═══════════════════════════════════════════════════════════════════════════════
# FEEDBACK ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/feedback", methods=["POST"])
def feedback():
    """
    POST /feedback  { "question": "...", "answer": "...", "rating": "good|bad", "correction": "..." }
    Stores feedback and saves high-quality answers as training samples.
    """
    data       = request.get_json(force=True)
    question   = data.get("question", "")
    answer     = data.get("answer", "")
    rating     = data.get("rating", "")
    correction = data.get("correction", "")
    doc_ids    = ",".join(data.get("doc_ids", []))

    if not question or not rating:
        return jsonify({"error": "question and rating required"}), 400

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO user_feedback (ts, question, answer, rating, correction, doc_ids) VALUES (?,?,?,?,?,?)",
        (datetime.utcnow().isoformat(), question, answer, rating, correction, doc_ids),
    )

    # Save as training sample
    final_answer = correction if (rating == "bad" and correction) else answer
    quality      = 0.95 if rating == "good" else 0.3
    if rating == "good" or (rating == "bad" and correction):
        conn.execute(
            "INSERT INTO training_samples (ts, prompt, completion, quality, source) VALUES (?,?,?,?,?)",
            (datetime.utcnow().isoformat(), question, final_answer, quality, "user_feedback"),
        )

    conn.commit()
    conn.close()

    # Auto-trigger reflection for bad answers
    if rating == "bad" and answer:
        try:
            reflect_data = {"question": question, "answer": answer}
            with app.test_client() as c:
                c.post("/reflect", json=reflect_data)
        except Exception:
            pass

    return jsonify({"status": "saved", "quality": quality})


# No /finetune endpoint in this build — LoRA fine-tuning needs a local model to
# fine-tune, which this build deliberately doesn't carry. See module docstring.

# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/knowledge/add", methods=["POST"])
def knowledge_add():
    """
    POST /knowledge/add  { "title": "...", "content": "...", "tags": [...] }
    RUNTIME collection only — a manual add from one user's desktop is exactly
    the unreviewed content that must not ship in the curated pack. Promoting
    something from here into curated is a deliberate, separate, reviewed step
    (see reset_collection.py / ingest_ck_wiki.py for how curated gets built).
    """
    data    = request.get_json(force=True)
    title   = data.get("title", "Untitled")
    content = data.get("content", "")
    tags    = data.get("tags", [])
    if not content:
        return jsonify({"error": "content required"}), 400
    doc_id = f"user-{int(time.time())}"
    coll = get_runtime_collection()
    # See auto_save_to_chroma() for why the embedding must be computed explicitly
    # with the same model hybrid_retrieve() queries against.
    coll.upsert(
        ids=[doc_id],
        documents=[content],
        embeddings=embed([content]),
        metadatas=[{"title": title, "tags": ",".join(tags), "source": "user",
                    "ts": datetime.utcnow().isoformat()}],
    )
    global _bm25
    _bm25 = None  # invalidate BM25 index
    return jsonify({"status": "added", "id": doc_id})


@app.route("/knowledge/count", methods=["GET"])
def knowledge_count():
    return jsonify({
        "curated_count": get_curated_collection().count(),
        "runtime_count": get_runtime_collection().count(),
    })


@app.route("/episodes", methods=["GET"])
def episodes_list():
    limit = int(request.args.get("limit", 20))
    conn  = sqlite3.connect(str(DB_PATH))
    rows  = conn.execute(
        "SELECT id, ts, summary, topics, outcome, rating FROM episodes ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return jsonify([{"id": r[0], "ts": r[1], "summary": r[2], "topics": r[3],
                     "outcome": r[4], "rating": r[5]} for r in rows])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "edition": "nexus-slim",  # CPU-only, cloud-generation build — distinguishes
                                   # this from the dev GPU build's /health shape
        "backend_configured": bool(MOSSY_BACKEND_TOKEN),
        "curated_docs": get_curated_collection().count(),
        "runtime_docs": get_runtime_collection().count(),
        # "waitress" (production) or "flask-dev" (fallback — see __main__). A silent log line at
        # startup is not a signal anyone actually receives; this is what BrainBSettings.tsx reads
        # to surface the degraded case somewhere a user would actually look.
        "server": _SERVER_TYPE,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("Mossy Brain B (Nexus edition) — CPU-only, cloud generation")
    log.info("Curated ChromaDB: %s", CHROMA_CURATED_PATH)
    log.info("Runtime ChromaDB: %s", CHROMA_RUNTIME_PATH)
    log.info("Port: %d", PORT)
    log.info("Backend token configured: %s", bool(MOSSY_BACKEND_TOKEN))
    log.info("=" * 60)

    # Initialize database
    init_db()

    # Bootstrap the CURATED knowledge base if empty. Runtime starts empty and
    # stays that way until auto_save_to_chroma()/knowledge_add() write to it
    # — nothing bootstraps it, by design.
    coll = get_curated_collection()
    if coll.count() == 0:
        log.info("Empty curated ChromaDB — running bootstrap...")
        try:
            from bootstrap_fallout4_knowledge import bootstrap_chromadb
            added = bootstrap_chromadb(coll, embedding_fn=embed)
            log.info("Bootstrap complete: %d entries.", added)
            _bm25 = None  # rebuild on first query
        except Exception as e:
            log.warning("Bootstrap failed (run bootstrap manually): %s", e)

    # Build knowledge graph
    try:
        get_graph()
    except Exception as e:
        log.warning("Knowledge graph build failed: %s", e)

    # Flask's built-in dev server (app.run) is explicitly documented as not
    # production-grade — single-request-per-thread with none of a real WSGI
    # server's robustness under concurrent/slow/malformed requests. Fine for
    # "just me, developing" but this now serves strangers who download the
    # app off Nexus. waitress is a pure-Python, Windows-compatible drop-in —
    # no compiler, no C extensions — so there's no real reason not to use it.
    try:
        from waitress import serve
        _SERVER_TYPE = "waitress"
        log.info("Starting production WSGI server (waitress) on 127.0.0.1:%d...", PORT)
        serve(app, host="127.0.0.1", port=PORT, threads=8)
    except ImportError:
        _SERVER_TYPE = "flask-dev"
        log.warning("waitress not installed (pip install waitress) — falling back to "
                    "Flask's development server. Fine for local dev; not recommended "
                    "once anyone other than you is running this.")
        log.info("Starting Flask dev server on 127.0.0.1:%d...", PORT)
        app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
