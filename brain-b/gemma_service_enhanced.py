#!/usr/bin/env python3
"""
gemma_service_enhanced.py — Brain B: Mossy Local Retrieval + Router Service
=============================================================================
A local retrieval and routing service with:
  • Hybrid BM25 + semantic RAG retrieval — fully local, NO external API key needed
  • Episodic memory (SQLite episodes table) — fully local
  • Mode routing, need-diagnosis, and tutoring contract fields (check_question,
    learner_signal), and long-form answer generation — see GENERATION below for why
    none of this is local-only
  • LangGraph multi-step reasoning workflow (orchestration only — see below for
    where the actual answer text comes from)
  • DuckDuckGo web search grounding (free, no API key) — fully local
  • NetworkX knowledge graph — fully local
  • User feedback endpoint + learning loop, LoRA fine-tune pipeline endpoint

GENERATION (long-form answers AND the small JSON calls — classify_mode, diagnose,
contract_fields) is NOT reliably local on this hardware. Verified on real 8GB-card
hardware: this service's local 9B model (Gemma-2, Unsloth 4-bit) consumes ~7GB of
fixed weight+overhead before a single token generates, so long answers OOM well under
100 tokens of real RAG context — and independent of that, this exact quantized
checkpoint produced garbage/empty output on every JSON-mode call all night, on
trivial prompts, ruling out prompt-formatting bugs (double-BOS, missing chat
template, wrong attention_mask/pad_token, fp16-vs-bf16 all tested and ruled out). The
same prompts sent to the cloud model produced correct output immediately in both
cases. So ALL generation defaults to Mossy's own shared Render backend
(mossy.onrender.com/v1/chat — the same proxy the Electron app calls, which holds the
real Groq key server-side; MOSSY_BACKEND_TOKEN required), with the local model as an
automatic fallback that retries at shrinking token budgets when the backend is
unavailable, degrading to an honest message rather than crashing if even that fails.
Force local-only with BRAINB_GENERATION_BACKEND=local — expect degraded quality on
this specific checkpoint if you do. See README.md.

Deploy at: D:\\Mossy-AI\\gemma_service_enhanced.py
Start: python gemma_service_enhanced.py
API: http://localhost:8766

Environment variables:
  CHROMA_CURATED_PATH – curated (shippable) ChromaDB dir (default D:\\Mossy-AI\\data\\chroma_curated)
  CHROMA_RUNTIME_PATH – runtime (local-only) ChromaDB dir (default D:\\Mossy-AI\\data\\chroma_runtime)
  MODELS_PATH  – HuggingFace cache dir (default D:\\Mossy-AI\\models)
  MOSSY_MODEL  – Override model name   (default auto-selected by VRAM)
  MOSSY_PORT   – Server port           (default 8766 — 8765 is already used by
                 the Electron F4AI NPC-dialogue relay in src/electron/main.ts)
  MOSSY_BACKEND_URL   – Shared Render backend base URL (default https://mossy.onrender.com,
                 matching main.ts's own fallback)
  MOSSY_BACKEND_TOKEN – Required for real long-form answers. Same shared-secret the
                 Electron app sends (must match MOSSY_API_TOKEN on the Render side).
                 Encrypted at rest in the Electron app's .env.encrypted/settings.json —
                 not readable by this separate Python process. Set it directly in this
                 process's environment, or put it in a .env file next to this script
                 (loaded automatically via python-dotenv; see .env.example). NEVER
                 commit a real .env — it's already covered by the repo's root
                 .gitignore (bare ".env" pattern matches at any depth), but double
                 check before committing anything in this directory.
  BRAINB_GENERATION_BACKEND – "cloud" (default) or "local" to force local-only
                             generation (shrinking-budget retry; see above)
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import game_data_index

import networkx as nx
import numpy as np
import requests
import torch
from dotenv import load_dotenv
from duckduckgo_search import DDGS
from flask import Flask, jsonify, request
from flask_cors import CORS
from rank_bm25 import BM25Okapi

from retrieval_tuning import MIN_RETRIEVAL_AGREEMENT, classify_retrieval  # noqa: F401 (MIN_RETRIEVAL_AGREEMENT used in log lines / comments elsewhere in this file)

# Loads a .env file from the current working directory if one exists (silently does
# nothing otherwise) — lets MOSSY_BACKEND_TOKEN persist across restarts without having
# to re-set an env var by hand each time. See .env.example; never commit a real .env.
load_dotenv()

# ── Constants ────────────────────────────────────────────────────────────────
BASE_DIR       = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
MODELS_PATH    = os.environ.get("MODELS_PATH",  str(BASE_DIR / "models"))

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

# Electron's background scan system (main.ts's runStartupScans()) writes raw
# JSON scan output here — separate from the chroma_curated/chroma_runtime
# split above, and NOT copied/duplicated into this process's own data dir,
# since these files are large (fo4_papyrus_api.json ~2.4MB, the other three
# scan types ~10-30MB each) and already have a canonical home. See
# game_data_index.py and docs-dev/GAME_DATA_RETRIEVAL_MERGE_PROJECT.md.
GAME_SCAN_CACHE_PATH = os.environ.get("GAME_SCAN_CACHE_PATH", str(BASE_DIR / "game-scan-cache"))
DB_PATH        = BASE_DIR / "data" / "mossy_brain.db"
GRAPH_PATH     = BASE_DIR / "data" / "knowledge_graph.json"
LORA_PATH      = BASE_DIR / "models" / "mossy-lora"
DATASET_PATH   = BASE_DIR / "data" / "training_dataset.jsonl"

# 8765 is already claimed unconditionally by the F4AI NPC-dialogue relay
# Electron starts in src/electron/main.ts (_startF4aiBridgeServer) — that
# server has no on/off setting, so whichever of it or this process starts
# second silently fails to bind. Brain B defaults to 8766 instead; override
# with MOSSY_PORT if you have a reason to.
PORT           = int(os.environ.get("MOSSY_PORT", 8766))
MAX_EPISODES   = 500
CRITIQUE_CONF_THRESHOLD = 0.85

# Long-form answer generation (draft/critique/refine) — NOT classify_mode/diagnose/
# contract_fields, which stay local always. Verified on real 8GB-card hardware: this
# service's 9B local model has ~7GB of fixed weight+overhead footprint before a single
# token generates, and the KV cache wall for a real RAG-context answer lands around
# 120-200 tokens — nowhere near enough for a useful answer. Short local calls (router,
# diagnosis, small JSON extraction) are proven to work; long local answers are not.
# Groq is the primary path for the same reason Brain A (the cloud layer) already exists:
# this was always meant to be a router+retriever role, not a full local inference engine
# on 8GB. See README.md.
#
# Goes through Mossy's shared Render backend (src/backend/routes/chat.ts, deployed at
# mossy.onrender.com), NOT a direct Groq API call with its own key. That backend already
# holds the real Groq API key server-side and is exactly what the Electron app itself
# calls (main.ts) — reusing it means this process needs a shared AUTH TOKEN, not a
# second copy of a provider API key floating around. MOSSY_BACKEND_TOKEN is encrypted
# at rest in the Electron app's .env.encrypted / settings.json and isn't readable by
# this separate Python process — set it directly in the environment this server runs
# in (or via .env — see .env.example). It must match MOSSY_API_TOKEN configured on the
# Render service (src/backend/middleware/auth.ts) — same shared-secret both the
# Electron client and this process authenticate with.
MOSSY_BACKEND_URL   = os.environ.get("MOSSY_BACKEND_URL", "https://mossy.onrender.com")
MOSSY_BACKEND_TOKEN = os.environ.get("MOSSY_BACKEND_TOKEN", "")
# "cloud" (default) or "local" — force local-only generation (e.g. offline demos, or a
# card with enough VRAM headroom to not need this at all). Falling back to local on any
# backend failure (down, unconfigured, cold-start timeout) happens regardless of this
# setting; this only controls whether the cloud backend is tried FIRST.
GENERATION_BACKEND = os.environ.get("BRAINB_GENERATION_BACKEND", "cloud").lower()

# MIN_RETRIEVAL_AGREEMENT and the abstain/hedge/confident decision itself
# (classify_retrieval) now live in retrieval_tuning.py, shared with
# brain-b/nexus/brain_b_slim.py — see that module's docstring for the full
# history (why probe_k=30, why a binary abstain/confident split stopped
# being enough, where the hedge boundary came from) and for why this is a
# shared module in the first place rather than two copies of the same
# constants: the two copies already diverged once, silently, and shipped
# the stale one in a real release before anyone noticed.
NO_DOCS_MESSAGE = (
    "I don't have documentation covering that in my knowledge base right now, "
    "so I'd rather tell you that plainly than guess. If you can point me at a "
    "source (or add it via /knowledge/add), I can look at it directly — "
    "otherwise this might be worth checking the CK wiki or F4SE docs yourself."
)

# Model selection based on VRAM
def _select_model() -> str:
    override = os.environ.get("MOSSY_MODEL", "")
    if override:
        return override
    if torch.cuda.is_available():
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        if vram_gb >= 22:
            return "google/gemma-3-27b-it"  # 27B needs ~22GB VRAM at 4-bit
        elif vram_gb >= 10:
            return "google/gemma-3-12b-it"  # 12B needs ~10GB VRAM at 4-bit
    return "google/gemma-2-9b-it"  # 9B needs ~7GB VRAM at 4-bit

MODEL_NAME = _select_model()

logging.basicConfig(level=logging.INFO, format="[%(levelname)s %(asctime)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("mossy-brain-b")

app = Flask(__name__)
CORS(app)

# ── Lazy globals (loaded on first use) ───────────────────────────────────────
_model       = None
_tokenizer   = None
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

MAX_EXPANDED_PARENTS = 2  # cap on distinct parent docs pulled into one generation's context
# Was 4 — each parent is a full section of up to 10 functions' worth of reference text, so
# 4 parents could add thousands of tokens to the prompt. Verified on an 8GB card: the
# 9B model's real-answer generation (with retrieved context, not the short JSON-mode calls)
# OOMs at a consistent decode step regardless of max_new_tokens — trimming the KV cache's
# starting size via less context is a direct lever on that. (A quantized-KV-cache
# experiment was also tried here and removed — untested against Unsloth's custom
# fast-path attention kernels, and correctness, not just memory, turned out to be the
# real problem in this codepath; see generate_text()'s tokenization fix instead.)
# Doesn't change which documents retrieval finds, only how much surrounding material
# rides along per parent.


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
        -- the whole point is two real distributions (wrong-match margins vs.
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
# MODEL LOADING
# ═══════════════════════════════════════════════════════════════════════════════

def load_model():
    global _model, _tokenizer
    if _model is not None:
        return
    log.info("Loading model: %s", MODEL_NAME)
    try:
        from unsloth import FastLanguageModel
        # Verified on real hardware: loading Unsloth's pre-quantized bnb-4bit checkpoint
        # through plain transformers.AutoModelForCausalLM (with or without device_map="auto"
        # multi-GPU splitting) produces degenerate output — a repeated garbage token,
        # regardless of GPU count. That checkpoint is packaged for Unsloth's own loader,
        # which applies model-specific patches vanilla transformers skips. Do not "fix" the
        # VRAM ceiling by dropping this path again without re-verifying real generated text,
        # not just the absence of an OOM.
        _model, _tokenizer = FastLanguageModel.from_pretrained(
            model_name=MODEL_NAME,
            max_seq_length=4096,
            dtype=None,          # auto-detect float16/bfloat16
            load_in_4bit=True,
            cache_dir=MODELS_PATH,
        )
        FastLanguageModel.for_inference(_model)
        log.info("Model loaded via Unsloth (4-bit).")
    except ImportError:
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=MODELS_PATH)
        _model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME, quantization_config=bnb, device_map="auto", cache_dir=MODELS_PATH
        )
        log.info("Model loaded via HuggingFace Transformers (4-bit).")


def generate_text(prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
    load_model()
    # The 9B model's weights + fixed overhead already consume ~7GB of an 8GB card at rest —
    # there's very little headroom left for the KV cache to grow into during generation.
    # Freeing cached-but-unused reserved memory here measurably reduces OOM risk on 8GB cards.
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    # gemma-2-9b-it is instruction-tuned and expects its chat template (<start_of_turn>
    # user/model turns) — this was previously MISSING here entirely, sending raw
    # completion-style prompts to a chat-tuned model. Verified on real hardware: every
    # classify_mode/diagnose/contract_fields call failed JSON parsing on every test run
    # before this fix.
    #
    # Tokenize directly via apply_chat_template(tokenize=True) rather than round-tripping
    # through a string — round-tripping was tried first and is a real, confirmed bug:
    # apply_chat_template's STRING output already embeds <bos>, and _tokenizer(str, ...)
    # adds its OWN default BOS on top, producing <bos><bos>... Verified via raw token IDs
    # on real hardware: a double-BOS prompt is badly out-of-distribution input and
    # produced empty output under greedy decoding, garbled multi-script noise under
    # sampling.
    #
    # apply_chat_template(tokenize=True, return_tensors="pt") returns a bare input_ids
    # tensor with NO attention_mask — unlike a normal tokenizer() call, which returns
    # both. Must build attention_mask explicitly (all-ones; no padding in a single
    # unbatched sequence) or transformers tries to INFER it from pad-token positions.
    try:
        input_ids = _tokenizer.apply_chat_template(
            [{"role": "user", "content": prompt}],
            tokenize=True, add_generation_prompt=True, return_tensors="pt",
            truncation=True, max_length=4096 - max_new_tokens,
        ).to(_model.device)
    except Exception as e:
        log.warning("apply_chat_template failed (%s), using manual Gemma2 template "
                    "(default add_special_tokens=True is correct here — the manual "
                    "template doesn't already include <bos>, unlike the string path "
                    "apply_chat_template would otherwise take).", e)
        manual_prompt = f"<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n"
        input_ids = _tokenizer(manual_prompt, return_tensors="pt", truncation=True,
                                max_length=4096 - max_new_tokens)["input_ids"].to(_model.device)
    attention_mask = torch.ones_like(input_ids)
    # This tokenizer has its own distinct pad token (id 0) separate from eos (id 1) —
    # forcing pad_token_id=eos_token_id (a common workaround for tokenizers that lack a
    # real pad token) broke attention-mask inference here instead, since it made pad and
    # eos indistinguishable. Use the tokenizer's real pad token; attention_mask above
    # makes any inference moot anyway, but this stays correct if that ever changes.
    with torch.no_grad():
        outputs = _model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=_tokenizer.pad_token_id,
        )
    decoded = _tokenizer.decode(outputs[0][input_ids.shape[1]:], skip_special_tokens=True)
    return decoded.strip()


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


# Verified on real 8GB-card hardware that a single fixed cap isn't reliably safe: the
# actual ceiling depends on how much retrieved context landed in THIS prompt, not just
# max_new_tokens. One measured data point on a real answer-generation prompt (1826
# prompt tokens): max_new_tokens=20 succeeded, 40 OOM'd — a much tighter margin than
# the 120 that works fine for classify_mode/diagnose's short, generic prompts. A
# heavier-context query would have even less headroom. So: shrinking-budget retry
# instead of trusting one constant across every possible prompt size.
LOCAL_FALLBACK_RETRY_BUDGETS = (60, 30, 15)
LOCAL_FALLBACK_EXHAUSTED_MESSAGE = (
    "I'm having trouble generating a full answer locally right now — this device is "
    "tight on VRAM for how much context this question pulled in. Configure "
    "MOSSY_BACKEND_TOKEN for reliable answers, or try a shorter, more specific question."
)


_GARBAGE_SCRIPT_RANGES = (
    # Scripts that never legitimately appear in this app's content (English UI text,
    # Papyrus code, CK wiki citations) — even ONE character from these is a strong
    # signal, unlike a ratio threshold. Verified against real captured garbage from
    # this exact checkpoint: it mixes real English words with scattered characters
    # from these ranges, so a "what fraction of the string is non-Latin" ratio check
    # was tried first and failed (the foreign characters are too sparse to move a
    # ratio past any reasonable threshold) — a per-character "is this ever allowed"
    # check catches it instead.
    (0x0370, 0x03FF),   # Greek
    (0x0400, 0x04FF),   # Cyrillic
    (0x0530, 0x08FF),   # Armenian through Arabic Extended
    (0x0900, 0x0FFF),   # Devanagari through Tibetan
    (0x1000, 0x109F),   # Myanmar
    (0x1100, 0x11FF),   # Hangul Jamo
    (0x3040, 0x30FF),   # Hiragana/Katakana
    (0x3400, 0x4DBF),   # CJK Extension A
    (0x4E00, 0x9FFF),   # CJK Unified Ideographs
    (0xAC00, 0xD7A3),   # Hangul Syllables
    (0xE000, 0xF8FF),   # Private Use Area
    (0xF900, 0xFAFF),   # CJK Compatibility Ideographs
    (0x1F300, 0x1FAFF),  # Misc symbols/pictographs/emoji
    (0xE0000, 0xE01EF),  # Tags / variation selectors
)


def _looks_like_garbage(text: str) -> bool:
    """This local checkpoint's proven failure mode isn't silence, it's confident-looking
    word salad — verified on real hardware to mix real English words with scattered
    private-use Unicode, CJK, Cyrillic, and other non-Latin fragments, not an obvious
    wall of mojibake a human would catch at a glance. "Doesn't crash" and "doesn't
    serve garbage" are different guarantees; a wrong-but-confident answer is exactly
    the failure mode this service is designed against everywhere else (abstention,
    honest "I don't know" over guessing) — it shouldn't sneak back in through this one
    path.

    Known gap, deliberately accepted: pure-ASCII garble (e.g. '{ =  <b>') slips
    through this check. That's fine specifically for the JSON-mode callers
    (classify_mode/diagnose/contract_fields via _generate_json()) — their own JSON
    parser already fails safely on that and falls back to null/defaults. The gap that
    actually matters is the long-form answer path, which has no such parser to catch
    nonsense — and real captured garbage on that path does contain non-Latin
    characters, which this catches."""
    if not text:
        return True
    return any(lo <= ord(c) <= hi for c in text for lo, hi in _GARBAGE_SCRIPT_RANGES)


def generate_answer(prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
    """The one entry point for ALL generation in this service — long-form answers
    (initial draft, critique/refine loop) AND the small JSON calls (classify_mode,
    diagnose, contract_fields, via _generate_json()). Originally the JSON calls were
    local-only on the theory that they were small enough to fit this 8GB card
    reliably; verified false on real hardware instead — this exact quantized local
    checkpoint produced garbage/empty output on every JSON-mode call all night,
    independent of prompt size, and the same prompts sent to the cloud backend
    produced correct output immediately. So everything routes through here now.

    Routes to the shared Render backend first by default (GENERATION_BACKEND != "local"
    and a token is configured); falls back to the local model on ANY backend failure —
    down, unconfigured, cold-start timeout, or an empty response — so the local
    responder keeps working as a degraded/offline fallback rather than the request just
    failing. The local path retries at shrinking token budgets on OOM rather than
    trusting one fixed cap (see LOCAL_FALLBACK_RETRY_BUDGETS — the safe ceiling varies
    per-prompt). Force local-only (same retry behavior applies) with
    BRAINB_GENERATION_BACKEND=local."""
    if GENERATION_BACKEND != "local" and MOSSY_BACKEND_TOKEN:
        try:
            backend_text = generate_text_backend(prompt, max_new_tokens, temperature)
            if backend_text:
                return backend_text
            log.warning("Backend returned empty text — falling back to local model.")
        except Exception as e:
            log.warning("Backend generation failed (%s) — falling back to local model.", e)
    for budget in LOCAL_FALLBACK_RETRY_BUDGETS:
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            result = generate_text(prompt, min(max_new_tokens, budget), temperature)
            if _looks_like_garbage(result):
                # Not an OOM — the call succeeded and produced text — but this
                # checkpoint's proven failure mode is confident-looking word salad, not
                # a crash. A shrinking token budget wouldn't fix that; it's a coherence
                # problem, not a memory problem. No point retrying more budgets here.
                log.warning("Local fallback produced incoherent output at max_new_tokens=%d "
                            "— treating as failure rather than returning it. raw=%r",
                            budget, result[:200])
                break
            return result
        except torch.OutOfMemoryError:
            log.warning("Local fallback OOM'd at max_new_tokens=%d, retrying smaller.", budget)
            continue
    log.error("Local fallback exhausted (OOM or incoherent output) at every retry budget %s.",
              LOCAL_FALLBACK_RETRY_BUDGETS)
    return LOCAL_FALLBACK_EXHAUSTED_MESSAGE


# ═══════════════════════════════════════════════════════════════════════════════
# EMBEDDING MODEL
# ═══════════════════════════════════════════════════════════════════════════════

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        from knowledge_manifest import EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_REVISION
        # Keep this off the LLM's GPU (cuda:0) when a second card is present — the LLM's
        # KV cache is already tight against 8GB, and this model is small enough to run
        # anywhere.
        embed_device = "cuda:1" if torch.cuda.device_count() > 1 else None
        # Pinned revision, not "latest" — see knowledge_manifest.py's module docstring
        # for why an unpinned model breaks build reproducibility.
        _embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME, revision=EMBEDDING_MODEL_REVISION,
                                            cache_folder=MODELS_PATH, device=embed_device)
        log.info("Embedding model loaded: %s @ %s", EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_REVISION)
    return _embed_model


def embed(texts: list[str]) -> list[list[float]]:
    model = get_embed_model()
    return model.encode(texts, normalize_embeddings=True).tolist()


# ═══════════════════════════════════════════════════════════════════════════════
# CHROMADB + BM25 HYBRID RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════════

def get_curated_collection():
    """The shippable knowledge base: bootstrap entries + reviewed wiki ingestion."""
    global _curated_collection
    if _curated_collection is None:
        import chromadb
        from knowledge_manifest import check_embedding_model, EMBEDDING_MODEL_NAME
        check_embedding_model(CHROMA_CURATED_PATH, current_model=EMBEDDING_MODEL_NAME)
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
    (sem_dists ascending, bm25_scores descending) needed for a margin-based
    signal (rank-1 vs. tail gap within ONE retriever), as an alternative to
    cross-retriever agreement that doesn't degrade the same way as corpus
    size grows. Not wired into any gating decision yet — computed for
    evaluation until there's real data on whether it's a better signal.
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
        "sem_dists": sem_dists,          # ascending — sem_dists[0] is the closest match
        "bm25_scores": bm25_scores_sorted,  # descending — bm25_scores_sorted[0] is the strongest match
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


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH REASONING WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════

def run_langgraph_workflow(question: str, max_refine_loops: int = 2,
                            diagnosis: Optional[str] = None,
                            answer_level: Optional[str] = None,
                            blender_context: Optional[dict] = None) -> dict:
    """
    Stateful LangGraph reasoning pipeline:
    search_kb → [web_fallback] → generate → critique → [refine] → validate → return

    `diagnosis` (from diagnose(), computed by the caller before this runs) is
    injected into the generation prompt so it actually shapes the answer's
    framing instead of being decorative metadata attached after the fact.

    `answer_level` (from compute_answer_level(), also computed by the caller)
    gets the same treatment for the same reason — a field that's returned but
    never fed into generation is exactly the failure mode diagnosis had before
    this was fixed, just moved to a new field.

    `blender_context` (from /infer's `get_context`, the live scene JSON
    BridgeServer.ts's `/execute {type:'context'}` already fetches from the
    Blender add-on — see DesktopBridge.tsx's fetchBlenderContext for the same
    data used elsewhere) gets the same treatment for the same reason: passed
    through only when classify_mode() flagged the question scene_related, so
    it isn't dead weight on every ordinary knowledge-base question.

    Returns dict with keys: answer, confidence, sources, critique_applied
    """
    try:
        from langgraph.graph import StateGraph, END
        from typing import TypedDict

        class WorkflowState(TypedDict):
            question: str
            retrieved_context: str
            sources: list[str]
            draft_answer: str
            critique: str
            final_answer: str
            confidence: float
            refine_loops: int
            used_web: bool
            critique_applied: bool

        # ── Node: search knowledge base ──────────────────────────────────────
        def search_kb_node(state: WorkflowState) -> WorkflowState:
            results = hybrid_retrieve(state["question"], top_k=8)
            if not results:
                state["retrieved_context"] = ""
                state["sources"] = []
                return state
            top_results = results[:6]
            context_parts = expand_to_parent(top_results)
            source_ids = [r.get("id", "unknown") for r in top_results]
            sources = [_citation_from_result(r) for r in top_results]
            # Graph expansion: pull in related nodes
            expanded_ids = graph_expand(source_ids, hops=1)
            if expanded_ids:
                # graph nodes are seeded from bootstrap entries only (see
                # _build_knowledge_graph) — always curated.
                coll = get_curated_collection()
                extra = coll.get(ids=expanded_ids[:4], include=["documents"])
                for doc in (extra.get("documents") or []):
                    context_parts.append(doc)
            state["retrieved_context"] = "\n\n---\n\n".join(context_parts)
            state["sources"] = sources
            return state

        # ── Node: web fallback ───────────────────────────────────────────────
        def web_fallback_node(state: WorkflowState) -> WorkflowState:
            if state["retrieved_context"]:
                return state  # already have context
            log.info("[LangGraph] KB empty — searching web for: %s", state["question"][:60])
            web_text = web_search(state["question"])
            if web_text:
                state["retrieved_context"] = f"[Web Search Results]\n{web_text}"
                state["used_web"] = True
                auto_save_to_chroma(state["question"], web_text)
            return state

        # ── Node: generate answer ────────────────────────────────────────────
        def generate_node(state: WorkflowState) -> WorkflowState:
            ctx = state["retrieved_context"]
            episodes = search_episodes(state["question"], limit=3)
            episode_ctx = ""
            if episodes:
                episode_ctx = "\n\nRELEVANT PAST SESSIONS:\n" + "\n".join(episodes)
            diagnosis_ctx = f"\nWHAT THEY ACTUALLY NEED (diagnosed before answering): {diagnosis}\n" if diagnosis else ""
            level_ctx = _answer_level_prompt_fragment(answer_level)
            scene_ctx = (
                f"\nLIVE BLENDER SCENE (what's actually open in the user's Blender right now — "
                f"answer using THIS, not general knowledge, when the question is about their "
                f"current scene):\n{json.dumps(blender_context, indent=2)}\n"
                if blender_context else ""
            )
            prompt = (
                f"You are Mossy, an expert Fallout 4 modding AI assistant built into a 22-platform desktop app (Electron + React + TypeScript). You run as Brain B — the local GPU-powered inference layer for the NVIDIA Edition. Brain A (the cloud Groq layer) handles most responses; you provide RAG retrieval, episodic memory, self-critique, and fine-tuning.\n"
                f"\n"
                f"APP PLATFORMS (22 total, navigable via left sidebar):\n"
                f"/ Home Dashboard | /chat AI Chat | /ai-mod-assistant AI Mod Assistant | /journey-hub FO4 Mod Journey Hub (tabs: First Success, Mod Projects, Roadmaps, Mod Browser) | /whats-new FO4 What's New | /knowledge-hub FO4 Knowledge Hub (Quick Reference, Knowledge Search, Community Learning, Vanilla Assets) | /memory-vault FO4 Memory Vault (user knowledge uploads, your long-term memory) | /wizards FO4 Setup Wizards (Install Wizard, Crash Triage, CK Quest, Packaging, PRP Patch Builder) | /ck-tools FO4 Creation Kit Hub (CK Safety/THE AUDITOR, CK Extension, Plugin Inspector, Quest Editor, Animation, Save Parser, Live Monitor, Game Link) | /textures FO4 Textures & Materials (DDS Converter, Texture Generator, Image Studio, BGSM Editor, Mat Editor, Optimizer, Enhancer) | /packaging-release FO4 Packaging & Release (BA2 Manager, Packaging Checklist, Conflict Analysis, Mod Comparison, FOMOD Assembler) | /guides-hub FO4 Guides Hub (Animation, Quest Authoring, LOD/Precombine, Textures, Papyrus, Sim Settlements 2, BodySlide) | /tools/cosmos FO4 Automation Studio (NVIDIA Cosmos AI pipelines, Knowledge Roots) | /mod-builder FO4 Mod Builder Hub (Blueprint, Workshop, Devtools, Scribe, Project Creator) | /asset-analysis FO4 Asset Analysis Hub (Mining Dashboard, Advanced Analysis, Asset Deduplicator, Crash Analyzer, 3D Viewer) | /orchestrator FO4 Automation Orchestrator (rule-based automation: file-watch, schedule, process triggers) | /workflow-runner FO4 Automation Runner (visual multi-step workflow builder and executor) | /runtime-hub FO4 Runtime Hub (Live Synapse voice help, Desktop Bridge to Blender, Holodeck testing) | /ext-tools FO4 External Integrations Hub (MO2 Integration, ComfyUI, Upscayl) | /plugin-tools FO4 Plugin & Load Order Hub (xEdit Tools, PRP Patch Tools, Load Order, FO4 Plugin Guide) | /system-hub FO4 System & Diagnostics Hub (Diagnostics, Capabilities/local AI, Whitelist & Blacklist, Backup Manager, File Watcher) | /settings Settings (API keys, tool paths, preferences).\n"
                f"\n"
                f"KEY NAVIGATION: Auditor (plugin scanner) → /ck-tools CK Safety tab | Mod Browser → /journey-hub Mods tab | New mod scaffold → /mod-builder Project Creator tab | Crash log analysis → /asset-analysis Crash Analyzer tab.\n"
                f"\n"
                f"\n"
                f"KNOWLEDGE BASE CONTEXT:\n{ctx}\n"
                f"{episode_ctx}"
                f"{diagnosis_ctx}"
                f"{level_ctx}"
                f"{scene_ctx}\n"
                f"USER QUESTION: {state['question']}\n\n"
                f"Provide a thorough, accurate answer. Cite specific tools, record types, "
                f"or INI settings where relevant.\n\nMOSSY:"
            )
            state["draft_answer"] = generate_answer(prompt, max_new_tokens=768)
            state["confidence"] = 0.7 if ctx else 0.4
            return state

        # ── Node: critique ───────────────────────────────────────────────────
        def critique_node(state: WorkflowState) -> WorkflowState:
            if state["confidence"] >= CRITIQUE_CONF_THRESHOLD:
                state["critique"] = "LGTM"
                return state
            prompt = (
                f"Review this Fallout 4 modding answer for accuracy:\n\n"
                f"Q: {state['question']}\nA: {state['draft_answer']}\n\n"
                f"List specific errors or omissions in 2–3 bullets. If correct, reply: LGTM"
            )
            state["critique"] = generate_answer(prompt, max_new_tokens=256, temperature=0.3)
            return state

        # ── Node: refine ─────────────────────────────────────────────────────
        def refine_node(state: WorkflowState) -> WorkflowState:
            if state["critique"].upper().startswith("LGTM") or state["refine_loops"] >= max_refine_loops:
                state["critique_applied"] = False
                return state
            prompt = (
                f"Revise this answer based on the critique:\n\n"
                f"Q: {state['question']}\n"
                f"Original answer: {state['draft_answer']}\n"
                f"Critique: {state['critique']}\n\n"
                f"Write the improved answer:\nMOSSY:"
            )
            refined = generate_answer(prompt, max_new_tokens=768)
            if len(refined) > 80:
                state["draft_answer"] = refined
                state["confidence"] = min(state["confidence"] + 0.1, 0.95)
                state["critique_applied"] = True
            state["refine_loops"] += 1
            return state

        # ── Node: validate & finalize ────────────────────────────────────────
        def validate_node(state: WorkflowState) -> WorkflowState:
            state["final_answer"] = state["draft_answer"]
            return state

        # ── Router: should we refine? ────────────────────────────────────────
        def should_refine(state: WorkflowState) -> str:
            if (not state["critique"].upper().startswith("LGTM")
                    and state["refine_loops"] < max_refine_loops):
                return "refine"
            return "validate"

        # ── Build graph ──────────────────────────────────────────────────────
        workflow = StateGraph(WorkflowState)
        workflow.add_node("search_kb",   search_kb_node)
        workflow.add_node("web_fallback", web_fallback_node)
        workflow.add_node("generate",    generate_node)
        workflow.add_node("critique",    critique_node)
        workflow.add_node("refine",      refine_node)
        workflow.add_node("validate",    validate_node)

        workflow.set_entry_point("search_kb")
        workflow.add_edge("search_kb",    "web_fallback")
        workflow.add_edge("web_fallback", "generate")
        workflow.add_edge("generate",     "critique")
        workflow.add_conditional_edges("critique", should_refine, {"refine": "refine", "validate": "validate"})
        workflow.add_edge("refine",       "critique")  # loop back for another critique pass
        workflow.add_edge("validate",     END)

        compiled = workflow.compile()
        initial_state: WorkflowState = {
            "question":         question,
            "retrieved_context": "",
            "sources":          [],
            "draft_answer":     "",
            "critique":         "",
            "final_answer":     "",
            "confidence":       0.5,
            "refine_loops":     0,
            "used_web":         False,
            "critique_applied": False,
        }
        result = compiled.invoke(initial_state)
        return {
            "answer":           result["final_answer"],
            "confidence":       result["confidence"],
            "sources":          result["sources"],
            "critique_applied": result["critique_applied"],
            "used_web":         result["used_web"],
        }

    except ImportError:
        # LangGraph not installed — fall back to simple single-pass
        log.warning("LangGraph not installed, falling back to simple inference.")
        return _simple_infer(question, diagnosis=diagnosis, answer_level=answer_level)


def _simple_infer(question: str, diagnosis: Optional[str] = None, answer_level: Optional[str] = None,
                   blender_context: Optional[dict] = None) -> dict:
    """Fallback when LangGraph is not available."""
    results = hybrid_retrieve(question, top_k=6)
    ctx = "\n\n".join(expand_to_parent(results))
    sources = [_citation_from_result(r) for r in results]
    if not ctx:
        web = web_search(question)
        if web:
            ctx = f"[Web]\n{web}"
    diagnosis_ctx = f"\nWHAT THEY ACTUALLY NEED (diagnosed before answering): {diagnosis}\n" if diagnosis else ""
    level_ctx = _answer_level_prompt_fragment(answer_level)
    scene_ctx = (
        f"\nLIVE BLENDER SCENE (what's actually open in the user's Blender right now — "
        f"answer using THIS, not general knowledge, when the question is about their "
        f"current scene):\n{json.dumps(blender_context, indent=2)}\n"
        if blender_context else ""
    )
    prompt = (
        f"You are Mossy, an expert Fallout 4 modding AI assistant built into a 22-platform desktop app (Electron + React + TypeScript). You run as Brain B — the local GPU-powered inference layer for the NVIDIA Edition. Brain A (the cloud Groq layer) handles most responses; you provide RAG retrieval, episodic \n"
        f"CONTEXT:\n{ctx}\n{diagnosis_ctx}{level_ctx}{scene_ctx}\nQ: {question}\n\nMOSSY:"
    )
    answer = generate_answer(prompt, max_new_tokens=512)
    return {"answer": answer, "confidence": 0.7, "sources": sources,
            "critique_applied": False, "used_web": False}


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE CONTRACT — TUTORING PEDAGOGY
# ═══════════════════════════════════════════════════════════════════════════════
# v1 of the tutor response contract. Two design decisions worth calling out
# explicitly rather than discovering later:
#
# 1. ENFORCEMENT MECHANISM: retry-on-parse-failure, not constrained decoding.
#    Gemma is loaded via Unsloth or HF Transformers (see load_model()) — this
#    stack does NOT run through llama.cpp, so GBNF grammars aren't available
#    here. The HF-compatible equivalent (a logits-processor library like
#    `outlines`) would add a new dependency to the inference path and its own
#    compatibility risk against a 4-bit-quantized Unsloth-loaded model, for a
#    payoff that's unproven yet. So: small JSON asks (1-2 keys, never the
#    whole contract in one call — see diagnose()/contract_fields() below),
#    strict-mode retry, deterministic fallback, and every failure logged to
#    `contract_failures`. If that table's growth rate says retries aren't
#    covering it, that's the trigger to revisit constrained decoding — as a
#    measured decision, not a surprise.
#
# 2. MODE IS THE BYPASS. Not every turn is a teaching turn — someone mid-debug
#    asking for a function signature should not get a check_question. `mode`
#    (teach / answer / debug) controls this: check_question is only ever
#    requested from the model when mode == "teach". classify_mode() below is
#    a keyword heuristic standing in for the real router (split-brain idea
#    #4 — not built yet). /infer accepts an optional `mode` in the request
#    body specifically so a real router can override this heuristic later
#    without any other code here changing.

def classify_mode(question: str) -> tuple[str, bool]:
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

    Second dimension, scene_related: true when the question depends on the
    state of the user's CURRENTLY OPEN Blender scene ("what's my active
    object", "how many verts does my selection have") rather than general
    FO4/Blender knowledge. Bundled into this same call rather than a second
    LLM round-trip — same reasoning as mode itself, it's a cheap addition to
    a call already happening. Computed unconditionally, even when the
    request body supplies an explicit `mode` override, because scene
    relevance is orthogonal to teach/debug/answer and callers overriding
    mode shouldn't silently disable it. Consumed by /infer to exempt live
    scene questions from the retrieval-abstention gate — a low BM25 margin
    against the knowledge base is meaningless for a question that isn't a
    knowledge-base lookup in the first place.
    """
    prompt = (
        "Classify this Fallout 4 modding question along two dimensions:\n\n"
        '1. mode - exactly one of:\n'
        '   - "teach": they want to understand a concept ("how does X work", "what is X", '
        '"explain X", "what\'s the difference between X and Y")\n'
        '   - "debug": something is broken and needs fixing ("X isn\'t working", "getting an '
        'error", "crashes when I", "won\'t compile")\n'
        '   - "answer": a direct factual/lookup question that is neither of the above '
        '("what are the parameters of X", "where is Y defined")\n\n'
        '2. scene_related - true if the question asks about the state of the user\'s '
        'CURRENTLY OPEN Blender scene ("what\'s my active object", "how many verts does my '
        'selection have", "is my armature named right", "what\'s selected right now"); '
        'false for general FO4/Blender knowledge questions that don\'t depend on what\'s '
        'actually open right now.\n\n'
        f"Question: {question}\n\n"
        'Return ONLY JSON: {"mode": "teach"|"debug"|"answer", "scene_related": true|false}'
    )
    parsed, raw, attempts = _generate_json(prompt, ["mode", "scene_related"], max_new_tokens=30)
    mode = (parsed or {}).get("mode")
    scene_related = (parsed or {}).get("scene_related")
    if mode in ("teach", "debug", "answer") and isinstance(scene_related, bool):
        # Always compute the keyword verdict too, even though it's not used —
        # this is the free measurement: log both so a week of real questions
        # gives a real disagreement rate instead of a handful eyeballed by
        # hand during a 2-minute GUI pass.
        log_mode_classification(question, mode, _classify_mode_keywords(question))
        return mode, scene_related
    log_contract_failure(question, "classify_mode", raw, attempts)
    return _classify_mode_keywords(question), _is_scene_related_keywords(question)


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


def _is_scene_related_keywords(question: str) -> bool:
    """Keyword fallback for scene_related, mirroring _classify_mode_keywords —
    used only when the LLM classification call above fails to parse."""
    q = question.lower()
    scene_markers = ("my active object", "my selection", "my selected", "currently selected",
                      "my scene", "my armature", "my mesh", "right now", "currently open",
                      "what's selected", "whats selected", "my current", "in my blender",
                      "open in blender")
    return any(m in q for m in scene_markers)


def _is_app_help_keywords(question: str) -> bool:
    """Keyword fallback for app_help_related, mirroring _is_scene_related_keywords —
    used only when the LLM classification call above fails to parse. Deliberately
    conservative (specific phrasings, not bare tool names) since a false positive
    here means the platform-catalog block gets appended to a turn that didn't need
    it — the exact cost this flag exists to avoid."""
    q = question.lower()
    app_markers = ("which tab", "which platform", "which hub", "what can mossy",
                    "what can you do", "where do i find", "where is the", "how do i get to",
                    "how do i navigate", "what does mossy do", "mossy.space", "in this app",
                    "sidebar", "quick hub access")
    return any(m in q for m in app_markers)


def _is_game_data_related_keywords(question: str) -> bool:
    """Keyword fallback for game_data_related, mirroring _is_app_help_keywords —
    used only when the LLM classification call above fails to parse. Deliberately
    conservative: a false positive here means the ~155K-char neuron dump
    (buildBrainNeuronBlock() in main.ts — vanilla game strings, materials,
    Papyrus library analysis, mesh/texture catalogs, form/asset graphs, F4SE
    plugins, MO2 profile) rides on a turn that didn't need it, which is
    exactly the per-turn cost this flag exists to avoid."""
    q = question.lower()
    game_data_markers = ("formid", "editorid", "record type", "which mod adds",
                          "what mod adds", "load order", "papyrus function", "papyrus event",
                          "esp", "esm", "esl", "plugin conflict", "vanilla record",
                          "quest stage", "actor value", "f4se plugin", "material swap",
                          "nif ", "mesh path", "texture path", "voice type")
    return any(m in q for m in game_data_markers)


_CONVERSATIONAL_FILLER_WORDS = frozenset((
    "hi", "hello", "hey", "yo", "sup", "thanks", "thank", "thx", "you",
    "ok", "okay", "cool", "nice", "great", "awesome", "sounds", "good",
    "that", "this", "helped", "worked", "got", "it", "makes", "sense",
    "morning", "night", "evening", "how", "are", "what", "do", "think",
    "bye", "goodbye", "see", "ya", "nevermind", "never", "mind", "so",
    "much", "very", "really", "appreciate", "appreciated", "perfect",
    "excellent", "yeah", "yep", "yes", "no", "nope", "alright", "fine",
))


def _is_conversational_keywords(question: str) -> bool:
    """Keyword fallback for needs_grounding's inverse — used only when the LLM
    classification call fails to parse. Unlike every other keyword fallback in
    this file (which default to False and look for positive matches), this one
    defaults to "needs grounding" (True) and only flips to conversational on a
    tight match — a false positive here (wrongly treating a real question as
    smalltalk) means it skips retrieval/citations entirely, a worse failure
    than the alternative (a greeting that unnecessarily runs retrieval).

    Word-overlap, not exact-phrase matching: an earlier version checked the
    WHOLE trimmed question against a fixed list of exact phrases ("thanks",
    "that helped") — real phrasing combines them ("thanks that helped",
    "thanks so much!") and missed every combination not in the list. Also
    treated any input <=3 chars as conversational, which would have
    misclassified real 3-letter FO4 terms (ESP, ESM, ESL) as smalltalk. This
    version instead checks whether EVERY word in the question is drawn from a
    small filler vocabulary — true for any combination/order of greetings and
    acknowledgments, false the moment a single substantive word (a tool name,
    an identifier, "papyrus", "formid") appears."""
    words = re.findall(r"[a-zA-Z']+", question.lower())
    if not words:
        return True
    return all(w in _CONVERSATIONAL_FILLER_WORDS for w in words)


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


def classify_and_diagnose(question: str) -> tuple[str, Optional[str], bool, bool, bool, bool]:
    """
    Merges classify_mode() and diagnose() into ONE _generate_json call.

    ACTIVATED 2026-08-15 (was previously built and left inactive — see git
    history for the original "not wired in" version of this docstring). The
    trigger wasn't a GUI latency measurement as originally planned; it was
    /enrich (docs/ARCHITECTURE.md's "Target layer model") making enrichment
    run on every turn instead of only for users who'd opted into Brain B as a
    provider — at that call volume, two sequential small-model passes per
    turn is a real, ongoing cost, not a one-time GUI-pass annoyance.

    Extended with a third field, scene_related, when activated: the original
    two-field version (mode + diagnosis) silently dropped what classify_mode()
    alone provided, which /enrich's abstention-exemption check depends on
    (scene_context_available = scene_related and blender_context is not
    None).

    Extended again with a fourth field, app_help_related, same day: the
    platform catalog (src/renderer/src/platformCatalog.ts's 23-platform
    index, ~4,700 chars / ~1,170 tokens measured directly) was riding on
    every single turn once /enrich's output started getting folded into the
    prompt unconditionally — including plain Papyrus questions with nothing
    to do with app navigation, and including the voice path, where
    LiveContext.tsx already special-cases prompt size because an oversized
    system prompt was the direct cause of an earlier 120s-watchdog latency
    problem. app_help_related gates that injection the same way
    scene_related gates scene JSON: the client only appends the platform map
    when this is true. Each additional field this call asks for costs close
    to what the first one did — the same reasoning classify_mode() itself
    used to bundle scene_related in with mode.

    Extended a fifth time with game_data_related: main.ts's buildBrainNeuronBlock()
    (vanilla game strings, materials, full Papyrus library analysis, mesh/texture
    catalogs, form/asset graphs, F4SE plugins, MO2 profile — everything the
    background scan system collects, ~155K chars measured live against
    brain-neurons.json on 2026-08-16) was riding on EVERY cloud call
    unconditionally, the same shape of problem app_help_related's comment
    above already describes for the platform catalog — except an order of
    magnitude larger, and the direct cause of the 50s->120s watchdog change
    LiveContext.tsx documents (Groq processing ~40K tokens of neuron dump
    before it can start answering, not Render cold-start alone). Gates the
    same way: the client only asks main.ts to inject the neuron block when
    this is true.

    Extended a sixth time with needs_grounding: the abstention gate fires
    whenever wiki retrieval (and, after the inverted-rule fix, scene/game-
    data sources) found nothing — but a pure conversational turn ("hi",
    "thanks", "what do you think") was never seeking factual grounding in
    the first place, so it found nothing from EVERY source and abstained,
    returning NO_DOCS_MESSAGE ("I don't have documentation covering that in
    my knowledge base...") as if it were a real answer. Found live
    (2026-08-17): a smoke test literally sent "hi" and got exactly that —
    the first thing a new user does would make Mossy look broken in the
    first ten seconds. needs_grounding=False routes around the entire
    abstain decision (folded into has_grounding below as one more OR-term,
    not a separate branch — a conversational turn that's ALSO scene-related
    or game-data-related still gets grounded normally by those, since the
    fields are independently classified).

    Falls back per field independently, matching every other LLM-derived
    field in this file: mode falls back to the keyword heuristic, diagnosis
    falls back to None, scene_related/app_help_related/game_data_related/
    needs_grounding each fall back to their own keyword heuristic. Logs the
    same mode_classifications comparison as classify_mode() when the merged
    call succeeds.
    """
    prompt = (
        "Classify this Fallout 4 modding question along six dimensions, in one pass.\n\n"
        '1. mode - exactly one of "teach" (they want to understand a concept), '
        '"debug" (something is broken and needs fixing), or "answer" (a direct '
        "factual/lookup question that's neither).\n\n"
        "2. diagnosis - one sentence: what do they actually need to know to solve "
        "their real problem, which may be narrower or broader than their literal "
        "wording (e.g. someone asking for an OnTriggerEnter snippet who has never "
        "cast an ObjectReference actually needs that prerequisite first).\n\n"
        '3. scene_related - true if the question asks about the state of the user\'s '
        'CURRENTLY OPEN Blender scene ("what\'s my active object", "how many verts does my '
        'selection have", "is my armature named right", "what\'s selected right now"); '
        'false for general FO4/Blender knowledge questions that don\'t depend on what\'s '
        'actually open right now.\n\n'
        '4. app_help_related - true if the question is about the MOSSY.SPACE desktop app '
        'itself rather than Fallout 4 modding knowledge — "where do I find the DDS '
        'converter", "which tab has BGSM editing", "what can Mossy do", "how do I get to '
        'the plugin tools", "which platform handles load order"; false for actual FO4/'
        'Creation Kit/Papyrus/Blender modding questions, even ones that mention a tool by '
        "name (e.g. \"how do I use xEdit to clean a plugin\" is a modding question, not an "
        'app-navigation question).\n\n'
        '5. game_data_related - true if answering well needs a SPECIFIC vanilla-game fact '
        'this user\'s own installed game/mod setup would confirm — an exact FormID, EditorID, '
        'record type, which of their installed mods adds/overrides something, their actual '
        'load order, a real Papyrus function/event signature, or specific vanilla mesh/'
        'texture/material paths; false for general modding knowledge, concepts, workflows, '
        'or how-to questions that don\'t hinge on one of those specific lookups.\n\n'
        '6. needs_grounding - false ONLY for pure conversational turns with no factual '
        'question at all: greetings ("hi", "hey"), thanks/acknowledgments ("thanks", "that '
        'helped", "got it"), small talk, or opinion-seeking ("what do you think"); true for '
        'every actual question, even a simple or vague one — when in doubt, true.\n\n'
        f"Question: {question}\n\n"
        'Return ONLY JSON: {"mode": "teach"|"debug"|"answer", "diagnosis": "<one sentence>", '
        '"scene_related": true|false, "app_help_related": true|false, "game_data_related": true|false, '
        '"needs_grounding": true|false}'
    )
    parsed, raw, attempts = _generate_json(
        prompt, ["mode", "diagnosis", "scene_related", "app_help_related", "game_data_related", "needs_grounding"],
        max_new_tokens=250
    )
    keyword_mode = _classify_mode_keywords(question)

    if parsed is None:
        log_contract_failure(question, "classify_and_diagnose", raw, attempts)
        return (keyword_mode, None, _is_scene_related_keywords(question),
                _is_app_help_keywords(question), _is_game_data_related_keywords(question),
                not _is_conversational_keywords(question))

    mode = parsed.get("mode")
    if mode not in ("teach", "debug", "answer"):
        mode = keyword_mode
    else:
        log_mode_classification(question, mode, keyword_mode)

    diagnosis = str(parsed.get("diagnosis") or "").strip() or None

    # Per-field fallback logging: the overall JSON parsed fine (we're past the
    # `parsed is None` branch above, which already logs), but if the model
    # omitted or malformed one specific field, degrading to that field's
    # keyword heuristic here was previously silent — no log_contract_failure
    # call, no warning, nothing in contract_failures. That's exactly the
    # failure mode where "Mossy doesn't know about her own platforms" (or
    # silently loses the scene exemption) looks like a classifier problem
    # with no trace connecting it back to a parse gap on this one field.
    scene_related = parsed.get("scene_related")
    if not isinstance(scene_related, bool):
        log_contract_failure(question, "classify_and_diagnose.scene_related", raw, attempts)
        scene_related = _is_scene_related_keywords(question)

    app_help_related = parsed.get("app_help_related")
    if not isinstance(app_help_related, bool):
        log_contract_failure(question, "classify_and_diagnose.app_help_related", raw, attempts)
        app_help_related = _is_app_help_keywords(question)

    game_data_related = parsed.get("game_data_related")
    if not isinstance(game_data_related, bool):
        log_contract_failure(question, "classify_and_diagnose.game_data_related", raw, attempts)
        game_data_related = _is_game_data_related_keywords(question)

    needs_grounding = parsed.get("needs_grounding")
    if not isinstance(needs_grounding, bool):
        log_contract_failure(question, "classify_and_diagnose.needs_grounding", raw, attempts)
        needs_grounding = not _is_conversational_keywords(question)

    return mode, diagnosis, scene_related, app_help_related, game_data_related, needs_grounding


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
# ENRICHMENT ENDPOINT — pre-generation half of /infer, split out 2026-08-15 so
# Brain B stops being an exclusive generation provider. Retrieval, classify_
# and_diagnose(), the abstention-tier/scene-exemption decision, and learner-
# state all happen here; generation is dispatched by the caller to whichever
# backend the user already has configured, then /contract fills in
# check_question/learner_signal afterward. See docs/ARCHITECTURE.md's
# "Target layer model" section for the full design and why contract_fields()
# specifically can't be pulled forward into this endpoint (it needs the
# generated answer text as a direct prompt input). /infer is unchanged and
# still fully functional — this is an additive split, not a replacement, for
# as long as anything still calls /infer directly.
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/enrich", methods=["POST"])
def enrich():
    """
    POST /enrich  { "question": "...", "session_id": "...", "user_id": "...",
                     "experience_level_override": "beginner",
                     "get_context": {...}, "addon_outdated": false }

    Field meanings for get_context / addon_outdated / session_id / user_id /
    experience_level_override are identical to /infer's — see that docstring,
    unchanged below.

    Returns {
      "abstained": bool,
      "answer": "..." | null,            -- ready-to-display abstain message
                                          -- when abstained=true; the caller
                                          -- should skip generation entirely
                                          -- in that case, not generate and
                                          -- discard
      "mode": "teach|answer|debug",
      "scene_related": bool,
      "diagnosis": "..." | null,
      "answer_level": "beginner|intermediate|advanced" | null,
      "next_skill": "..." | null,
      "retrieved_context": "..." | "",   -- pre-assembled grounding block
                                          -- (knowledge-base excerpts, past
                                          -- episodes, diagnosis/level framing,
                                          -- live scene JSON when relevant) —
                                          -- fold this into whatever prompt the
                                          -- caller sends to its own generator
      "used_web": bool,                  -- retrieved_context came from a live
                                          -- web search fallback, not the KB
      "sources": [...],                  -- citations for retrieved_context
      "past_episodes": [...],
      "hedged": bool,
      "hedge_prefix": "..." | null,      -- when hedged, prepend this exact
                                          -- string to the generated answer
                                          -- before displaying it
      "used_scene_context": bool,
      "context_for_generation": {...} | null,  -- live scene JSON already
                                                 -- folded into retrieved_context
                                                 -- when relevant; also exposed
                                                 -- standalone in case the
                                                 -- caller wants to format it
                                                 -- itself instead
      "addon_outdated_relevant": bool,
      "app_help_related": bool,          -- true when this question is about
                                          -- navigating/using the MOSSY.SPACE
                                          -- app itself, not FO4 modding
                                          -- knowledge. The caller should only
                                          -- append the platform-catalog block
                                          -- to the generation prompt when
                                          -- this is true — it costs ~1,170
                                          -- tokens (measured), which is a
                                          -- real, on-every-turn cost on the
                                          -- voice path if injected
                                          -- unconditionally.
    }
    """
    data                = request.get_json(force=True)
    question            = data.get("question", "").strip()
    session_id          = data.get("session_id") or "unknown"
    user_id             = data.get("user_id") or "unknown"
    experience_override = data.get("experience_level_override")
    raw_context     = data.get("get_context")
    blender_context = raw_context if isinstance(raw_context, dict) else None
    addon_outdated  = bool(data.get("addon_outdated"))

    if not question:
        return jsonify({"error": "question required"}), 400

    mode_override = data.get("mode")
    mode, diagnosis, scene_related, app_help_related, game_data_related, needs_grounding = classify_and_diagnose(question)
    if mode_override in ("teach", "answer", "debug"):
        mode = mode_override
        # A caller-supplied mode override skips mode classification but not
        # diagnosis — same rule /infer already applied when this was two
        # separate calls (mode override still got a real diagnose() call for
        # teach turns). scene_related stays from the merged call either way;
        # it's orthogonal to mode and callers overriding mode shouldn't
        # silently disable it, same reasoning as classify_mode()'s own
        # docstring.
        diagnosis = diagnose(question, mode) if mode == "teach" else diagnosis

    episodes = search_episodes(question, limit=3)

    # Abstention gate — identical logic to /infer's, moved here unchanged.
    probe, _retrieval_diag = hybrid_retrieve(question, top_k=6, probe_k=30, return_diagnostics=True)
    agreement = sum(1 for r in probe if r["source"] == "vector+bm25")
    bm25_scores = _retrieval_diag["bm25_scores"]
    bm25_margin = (bm25_scores[0] - bm25_scores[-1]) if len(bm25_scores) >= 2 else None
    retrieval_tier = classify_retrieval(agreement, bm25_margin)
    log_retrieval(session_id, agreement, bm25_margin, retrieval_tier)

    scene_context_available = scene_related and blender_context is not None
    addon_outdated_relevant = scene_related and blender_context is None and addon_outdated

    # Run every applicable non-wiki source BEFORE deciding whether to
    # abstain, not after — see the inverted rule below for why. game_data
    # search happens here (once) rather than later in context-assembly so
    # its actual results (not just the game_data_related classification
    # flag) can inform that decision.
    game_data_results: list = []
    if game_data_related:
        try:
            papyrus_path = Path(GAME_SCAN_CACHE_PATH) / "fo4_papyrus_api.json"
            game_data_results = game_data_index.search_papyrus(question, papyrus_path, top_k=5)
        except Exception as e:
            log.warning("game_data_index search failed (non-fatal): %s", e)
    game_data_has_results = bool(game_data_results)

    # Inverted abstain rule: abstain only when NO source produced grounding,
    # not when wiki retrieval specifically produced none. The old rule
    # (abstain unless wiki found something, with a hand-added exemption per
    # non-wiki source) hit the same bug three times in one day: scene
    # context needed an exemption, then game_data_related needed the same
    # exemption twice over (once for abstain, once for hedge) because wiki
    # failing doesn't mean the Papyrus BM25 index also failed. Every new
    # grounding source added the same way would need its own carve-out —
    # form graph, asset graph, and world strings all still to come. Running
    # every applicable source first and asking "did ANYTHING ground this"
    # once, instead of "did wiki fail, and if so does some specific
    # exemption apply", removes the recurring bug at its root instead of
    # patching each new instance of it.
    #
    # not needs_grounding is the same OR-term shape, not a special case: a
    # pure conversational turn ("hi", "thanks") was never seeking factual
    # grounding at all, so it found nothing from every source and abstained
    # — returning NO_DOCS_MESSAGE as if it were a real answer. Found live:
    # "hi" got "I don't have documentation covering that in my knowledge
    # base..." — the first thing a new user does making Mossy look broken
    # in the first ten seconds. A conversational turn that's ALSO scene- or
    # game-data-related still gets grounded normally by those fields, since
    # all six classify_and_diagnose() dimensions are independent.
    has_grounding = (
        (retrieval_tier != "abstain") or scene_context_available
        or game_data_has_results or not needs_grounding
    )

    if not has_grounding:
        log.info("Abstaining on %r — no source produced grounding (wiki agreement %d, bm25_margin %s, "
                  "scene_context_available=%s, game_data_related=%s, needs_grounding=%s)",
                  question[:60], agreement, bm25_margin, scene_context_available, game_data_related, needs_grounding)
        log_learner_signal(question, mode, f"no documentation found for: {question[:200]}",
                            diagnosis=None, session_id=session_id)
        return jsonify({
            "abstained": True, "answer": NO_DOCS_MESSAGE,
            "mode": mode, "scene_related": scene_related, "diagnosis": None,
            "answer_level": None, "next_skill": None,
            "retrieved_context": "", "used_web": False, "sources": [],
            "past_episodes": episodes, "hedged": False, "hedge_prefix": None,
            "used_scene_context": False, "context_for_generation": None,
            "addon_outdated_relevant": addon_outdated_relevant,
            "app_help_related": app_help_related,
            "game_data_related": game_data_related, "game_data_found": False,
            "needs_grounding": needs_grounding,
            "retrieval_agreement": agreement, "retrieval_margin": bm25_margin,
            "retrieval_tier": retrieval_tier,
        })
    elif retrieval_tier == "abstain":
        log.info("Wiki retrieval would have abstained on %r (agreement %d, bm25_margin %s) — "
                  "exempted by non-wiki grounding (scene_context_available=%s, game_data_found=%s, "
                  "needs_grounding=%s)",
                  question[:60], agreement, bm25_margin, scene_context_available, game_data_has_results,
                  needs_grounding)

    skill_ids = extract_skill_ids(probe[:6])
    answer_level = compute_answer_level(user_id, skill_ids, experience_override)
    update_learner_state(user_id, skill_ids, mode)
    next_skill = suggest_next_skill(user_id, skill_ids)

    context_for_generation = blender_context if scene_context_available else None

    # Assemble the grounding block generation needs — the same ingredients
    # infer_answer() builds internally, extracted here since generation no
    # longer happens inside this process. A second, narrower hybrid_retrieve
    # (top_k=6, no probe_k) — the abstention probe above is deliberately wide
    # (probe_k=30) for agreement scoring, not for content; this mirrors what
    # infer_answer() already did as two separate retrieval calls before this
    # split, so total retrieval-call count is unchanged, just relocated.
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

    episode_ctx = f"\n\nRELEVANT PAST SESSIONS:\n" + "\n".join(episodes) if episodes else ""
    diagnosis_ctx = f"\nWHAT THEY ACTUALLY NEED (diagnosed before answering): {diagnosis}\n" if diagnosis else ""
    level_ctx = _answer_level_prompt_fragment(answer_level)
    scene_ctx = (
        f"\nLIVE BLENDER SCENE (what's actually open in the user's Blender right now — "
        f"answer using THIS, not general knowledge, when the question is about their "
        f"current scene):\n{json.dumps(context_for_generation, indent=2)}\n"
        if context_for_generation else ""
    )
    # Phase 1 of the game-data/Brain-B merge project (see
    # docs-dev/GAME_DATA_RETRIEVAL_MERGE_PROJECT.md) — Papyrus API only so
    # far; form graph, asset graph, and world strings are explicit follow-up.
    # Ranked BM25 lookup, not the client-side neuron-block dump: this is what
    # actually answers "what does X do" with the specific matching
    # function(s) instead of main.ts's ~155K-char everything-at-once block.
    # Reuses game_data_results computed above the abstain gate — searched
    # once, not twice.
    game_data_ctx = ""
    if game_data_has_results:
        formatted = game_data_index.format_game_data_results(game_data_results)
        if formatted:
            game_data_ctx = f"\n{formatted}\n"
    retrieved_context = f"KNOWLEDGE BASE CONTEXT:\n{ctx}\n{episode_ctx}{diagnosis_ctx}{level_ctx}{scene_ctx}{game_data_ctx}"

    # Scene context, not the KB match, is the grounding for a scene-related
    # question when it's available — mirrors the inverted abstain rule
    # above. Without this, a weak/irrelevant KB match (e.g. Papyrus's
    # "ObjectReference Script" superficially matching "what's in my Blender
    # scene") still prepends "I don't have documentation covering this" even
    # though the live scene JSON is sitting right there in the same prompt —
    # found live: the model treated that disclaimer as authoritative and
    # denied having scene access at all, ignoring the actual scene data a
    # few lines later. game_data_has_results gets the same exemption for the
    # same reason — and specifically checks HAS_RESULTS, not the
    # game_data_related flag, so a game-data turn the Papyrus index doesn't
    # cover yet (form graph / asset graph / world strings — not indexed
    # until later phases) still hedges normally on the wiki match instead of
    # silently suppressing a disclaimer that's actually warranted there.
    hedged = retrieval_tier == "hedge" and not scene_context_available and not game_data_has_results
    hedge_prefix = None
    if hedged and probe:
        top_title = (probe[0].get("metadata") or {}).get("title") or probe[0].get("id", "this")
        hedge_prefix = (
            f"I don't have documentation directly covering this — the closest match "
            f"I have is *{top_title}*. Treating that as a lead, not a confirmed answer:\n\n"
        )

    return jsonify({
        "abstained": False, "answer": None,
        "mode": mode, "scene_related": scene_related, "diagnosis": diagnosis,
        "answer_level": answer_level, "next_skill": next_skill,
        "retrieved_context": retrieved_context, "used_web": used_web, "sources": sources,
        "past_episodes": episodes, "hedged": hedged, "hedge_prefix": hedge_prefix,
        "used_scene_context": context_for_generation is not None,
        "context_for_generation": context_for_generation,
        "addon_outdated_relevant": addon_outdated_relevant,
        "app_help_related": app_help_related,
        # game_data_related: the classifier's judgment that this turn needs a
        # game-data fact. game_data_found: whether the Phase-1 Papyrus index
        # actually had one. The client uses found (not related) to decide
        # whether the old neuron-block dump should ride along as a fallback
        # for coverage Phase 1 doesn't have yet — see
        # LocalAIEngine.ts's includeGameData wiring.
        "game_data_related": game_data_related, "game_data_found": game_data_has_results,
        "needs_grounding": needs_grounding,
        "retrieval_agreement": agreement, "retrieval_margin": bm25_margin,
        "retrieval_tier": retrieval_tier,
    })


@app.route("/contract", methods=["POST"])
def contract():
    """
    POST /contract  { "question": "...", "answer": "...", "mode": "teach",
                       "diagnosis": "..." | null, "session_id": "..." }

    Post-generation half of the split. `mode` and `diagnosis` must be the
    exact values /enrich returned for this turn — passed explicitly, not
    recomputed here. Recomputing would mean classifying and diagnosing the
    same question twice per turn, exactly the round-trip-doubling cost
    activating classify_and_diagnose() in /enrich was meant to avoid.

    Meant to be called fire-and-forget from the caller's perspective: render
    the generated answer as soon as it's back from generation, don't block on
    this. If /contract errors or times out, the caller keeps a working answer
    and only loses the tutoring extras (check_question, learner_signal) — the
    UI should have a settled "arrived a beat later" state for the check-
    question card rather than blocking the answer or reflowing the layout
    when it lands.

    Also performs the episode-save side effect /infer used to do at the end
    of a successful (non-abstained) turn — deliberately co-located here since
    it needs the same question+answer+mode+diagnosis+sources.

    Returns { "check_question": "..." | null, "learner_signal": "..." | null }
    """
    data       = request.get_json(force=True)
    question   = data.get("question", "").strip()
    answer     = data.get("answer", "")
    mode       = data.get("mode") or "answer"
    diagnosis  = data.get("diagnosis")
    session_id = data.get("session_id") or "unknown"
    sources    = data.get("sources") or []

    if not question or not answer:
        return jsonify({"error": "question and answer required"}), 400
    if mode not in ("teach", "answer", "debug"):
        mode = "answer"

    fields = contract_fields(question, answer, mode, diagnosis)
    log_learner_signal(question, mode, fields.get("learner_signal"), diagnosis, session_id=session_id)

    summary = f"Q: {question[:80]} → {answer[:120]}"
    topic_ids = [s.get("id", "?") if isinstance(s, dict) else s for s in sources][:5]
    save_episode(summary, topic_ids)

    return jsonify(fields)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN INFERENCE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/infer", methods=["POST"])
def infer():
    """
    POST /infer  { "question": "...", "use_langgraph": true, "mode": "teach|answer|debug",
                   "session_id": "...", "user_id": "...", "experience_level_override": "beginner",
                   "get_context": {...}, "addon_outdated": false }

    `mode` is optional — omit it to fall back to classify_mode()'s keyword
    heuristic. Pass it explicitly once a real router exists upstream.

    `addon_outdated`, if true, means the client confirmed (via a
    get_capabilities handshake against the connected Blender add-on) that it
    doesn't support get_context — as opposed to Blender simply not being
    open. Only meaningful combined with scene_related and an empty
    get_context; see addon_outdated_relevant in the response.

    `get_context`, if present, is the live Blender scene JSON (active object,
    selection, mesh stats, etc.) — the same shape BridgeServer.ts's
    `/execute {type:'context'}` already returns and DesktopBridge.tsx already
    renders. Optional; safe to always send opportunistically when Blender is
    connected — classify_mode()'s scene_related flag decides per-question
    whether it's actually used, so sending it on an unrelated question just
    means it's fetched and ignored, not injected into the prompt.

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
      "used_scene_context": bool,       -- true when get_context was actually injected into
                                         -- this answer's prompt (scene_related AND context
                                         -- was sent) — drives the "read your scene" UI badge
      "addon_outdated_relevant": bool,  -- true when THIS question was scene_related, no
                                         -- context was available, AND the client confirmed
                                         -- (via get_capabilities) the connected add-on is too
                                         -- old to support get_context — drives an "update your
                                         -- Blender add-on" notice instead of a silent abstain
      ...
    }
    """
    data                = request.get_json(force=True)
    question            = data.get("question", "").strip()
    use_langgraph       = data.get("use_langgraph", True)
    session_id          = data.get("session_id") or "unknown"
    user_id             = data.get("user_id") or "unknown"
    experience_override = data.get("experience_level_override")
    # get_context: live Blender scene JSON, fetched client-side (LocalAIEngine.ts)
    # via the same BridgeServer.ts /execute {type:'context'} call DesktopBridge.tsx's
    # fetchBlenderContext already uses. Only a dict is accepted — anything else
    # (missing, null, Blender not running client-side) is treated as "no scene
    # context available" rather than erroring the whole request over it.
    raw_context   = data.get("get_context")
    blender_context = raw_context if isinstance(raw_context, dict) else None
    # addon_outdated: set by LocalAIEngine.ts's checkAddonSupportsGetContext()
    # ONLY when it actually confirmed (via a get_capabilities handshake) that
    # a connected Blender add-on doesn't support get_context — never set just
    # because Blender isn't running at all. Used below to tell "no scene data
    # because Blender is closed" apart from "no scene data because the add-on
    # needs updating" — the latter used to be indistinguishable from a plain
    # abstain, discovered live when an outdated add-on's "Unknown command
    # type" response silently looked identical to no-Blender-at-all.
    addon_outdated = bool(data.get("addon_outdated"))

    classified_mode, scene_related = classify_mode(question)
    mode = data.get("mode") or classified_mode

    if not question:
        return jsonify({"error": "question required"}), 400
    if mode not in ("teach", "answer", "debug"):
        mode = "answer"

    # Episodic memory context
    episodes = search_episodes(question, limit=3)

    # Abstention gate — checked BEFORE generation, not after, so a genuine miss
    # skips the expensive LangGraph/critique pipeline entirely rather than
    # generating from context that isn't actually relevant. See
    # MIN_RETRIEVAL_AGREEMENT's comment for why this uses retriever agreement
    # instead of RRF score.
    # probe_k=30: widened past the 6 docs that actually reach the prompt,
    # because that top_k was silently serving two jobs — what's relevant
    # enough to answer with, and whether an answer exists in the corpus at
    # all. At 8 pages those were nearly the same question (6 slots covered
    # most of the corpus); at hundreds of pages they aren't — two independent
    # retrievers failing to agree in a 6-slot window is expected even when a
    # real answer exists somewhere in the top 30. See ADR note near
    # MIN_RETRIEVAL_AGREEMENT for the eval that caught this.
    probe, _retrieval_diag = hybrid_retrieve(question, top_k=6, probe_k=30, return_diagnostics=True)
    agreement = sum(1 for r in probe if r["source"] == "vector+bm25")
    bm25_scores = _retrieval_diag["bm25_scores"]
    bm25_margin = (bm25_scores[0] - bm25_scores[-1]) if len(bm25_scores) >= 2 else None
    # classify_retrieval is the single shared decision boundary — see
    # retrieval_tuning.py's module docstring for why a binary abstain/confident
    # split stopped being adequate at this corpus size (2 of 3 deliberate
    # out-of-domain misses were passing agreement alone) and what "hedge" means.
    retrieval_tier = classify_retrieval(agreement, bm25_margin)
    log_retrieval(session_id, agreement, bm25_margin, retrieval_tier)

    # Scene-question exemption: a low BM25 margin against the knowledge base
    # means nothing for "what's my active object" — that's live introspection,
    # not a documentation lookup, so classify_retrieval's verdict doesn't apply.
    # Only exempts when BOTH classify_mode flagged the question scene_related
    # AND the client actually sent live scene data — a scene_related question
    # with no Blender connected still abstains normally, since there's nothing
    # to answer from either way.
    scene_context_available = scene_related and blender_context is not None
    # True only when THIS question actually needed scene data, didn't get
    # any, and the specific reason was a confirmed-outdated add-on — not
    # merely "Blender isn't open" or "this wasn't a scene question at all."
    addon_outdated_relevant = scene_related and blender_context is None and addon_outdated

    if retrieval_tier == "abstain" and not scene_context_available:
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
            "used_scene_context": False, "addon_outdated_relevant": addon_outdated_relevant,
            "mode": mode, "diagnosis": None, "check_question": None,
            "answer_level": None, "next_skill": None, "past_episodes": episodes,
        }
        # Deliberately NOT saved as an episode — it's a non-answer, not a
        # resolved interaction; saving it would pollute episodic memory.
        return jsonify(result)
    elif retrieval_tier == "abstain" and scene_context_available:
        log.info("Retrieval would have abstained on %r (agreement %d, bm25_margin %s) — "
                  "exempted as scene_related with live Blender context available",
                  question[:60], agreement, bm25_margin)

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

    # Only actually inject scene JSON into the prompt when it's relevant — a
    # non-scene_related question still gets no scene_ctx even if the client
    # opportunistically sent get_context on every turn, so ordinary knowledge
    # questions don't carry irrelevant scene noise into the prompt.
    context_for_generation = blender_context if scene_context_available else None

    try:
        if use_langgraph:
            result = run_langgraph_workflow(question, diagnosis=diagnosis, answer_level=answer_level,
                                             blender_context=context_for_generation)
        else:
            result = _simple_infer(question, diagnosis=diagnosis, answer_level=answer_level,
                                    blender_context=context_for_generation)
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
    # See /enrich's matching comment: scene context, when available, is the
    # grounding for the answer — a weak KB match shouldn't hedge it away.
    result["hedged"] = retrieval_tier == "hedge" and not scene_context_available
    result["used_scene_context"] = context_for_generation is not None
    result["addon_outdated_relevant"] = addon_outdated_relevant

    # Hedge tier: still generate a real answer from the same retrieved context
    # (unlike abstain, which skips generation entirely) — but lead with an
    # explicit "closest I have" framing rather than presenting it with the
    # same confidence as a genuine strong match. The disclaimer names the
    # actual top citation, not a vague hedge, so it's still useful even when
    # it turns out to be exactly right (see the objectmod_priority case in
    # retrieval_tuning.py's docstring — hedging a real hit costs tone, not
    # correctness).
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


# ═══════════════════════════════════════════════════════════════════════════════
# FINE-TUNE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/finetune", methods=["POST"])
def finetune():
    """
    POST /finetune  { "min_samples": 50, "epochs": 3, "lora_r": 16 }
    Trains a LoRA adapter on collected training samples.
    Returns { "status": "started|insufficient_data", "sample_count": N }
    """
    data       = request.get_json(force=True)
    min_samples = int(data.get("min_samples", 50))
    epochs      = int(data.get("epochs", 3))
    lora_r      = int(data.get("lora_r", 16))

    conn = sqlite3.connect(str(DB_PATH))
    samples = conn.execute(
        "SELECT prompt, completion FROM training_samples WHERE quality >= 0.7 ORDER BY quality DESC LIMIT 2000"
    ).fetchall()
    conn.close()

    if len(samples) < min_samples:
        return jsonify({"status": "insufficient_data", "sample_count": len(samples),
                        "needed": min_samples})

    # Write JSONL dataset
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        for prompt, completion in samples:
            f.write(json.dumps({"prompt": prompt, "completion": completion}) + "\n")

    # LoRA training (non-blocking — runs in background thread)
    import threading

    def _train():
        try:
            from unsloth import FastLanguageModel, is_bfloat16_supported
            from trl import SFTTrainer
            from transformers import TrainingArguments
            from datasets import load_dataset

            load_model()
            model_ft, tokenizer_ft = FastLanguageModel.get_peft_model(
                _model,
                r=lora_r,
                target_modules=["q_proj", "v_proj", "k_proj", "o_proj",
                                 "gate_proj", "up_proj", "down_proj"],
                lora_alpha=lora_r * 2,
                lora_dropout=0.05,
                bias="none",
                use_gradient_checkpointing="unsloth",
            )
            dataset = load_dataset("json", data_files=str(DATASET_PATH), split="train")

            def fmt(examples):
                texts = [f"<start_of_turn>user\n{p}<end_of_turn>\n<start_of_turn>model\n{c}<end_of_turn>"
                         for p, c in zip(examples["prompt"], examples["completion"])]
                return {"text": texts}

            dataset = dataset.map(fmt, batched=True)
            trainer = SFTTrainer(
                model=model_ft,
                tokenizer=tokenizer_ft,
                train_dataset=dataset,
                dataset_text_field="text",
                max_seq_length=4096,
                args=TrainingArguments(
                    num_train_epochs=epochs,
                    per_device_train_batch_size=2,
                    gradient_accumulation_steps=4,
                    learning_rate=2e-4,
                    bf16=is_bfloat16_supported(),
                    fp16=not is_bfloat16_supported(),
                    output_dir=str(LORA_PATH),
                    save_strategy="epoch",
                    logging_steps=10,
                ),
            )
            trainer.train()
            model_ft.save_pretrained(str(LORA_PATH))
            tokenizer_ft.save_pretrained(str(LORA_PATH))
            log.info("LoRA fine-tune complete. Adapter saved to: %s", LORA_PATH)
        except Exception as e:
            log.exception("Fine-tune failed: %s", e)

    threading.Thread(target=_train, daemon=True).start()
    return jsonify({"status": "started", "sample_count": len(samples),
                    "output_path": str(LORA_PATH)})


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
    gpu_info = {}
    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        gpu_info = {
            "name": props.name,
            "vram_gb": round(props.total_memory / 1e9, 1),
            "vram_used_gb": round(torch.cuda.memory_allocated(0) / 1e9, 1),
        }
    return jsonify({
        "status": "ok",
        "model": MODEL_NAME,
        "model_loaded": _model is not None,
        "curated_docs": get_curated_collection().count(),
        "runtime_docs": get_runtime_collection().count(),
        # "waitress" (production) or "flask-dev" (fallback — see __main__). A silent log line at
        # startup is not a signal anyone actually receives; this is what BrainBSettings.tsx reads
        # to surface the degraded case somewhere a user would actually look.
        "server": _SERVER_TYPE,
        "gpu": gpu_info,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("Mossy Brain B — Enhanced Gemma Service")
    log.info("Model: %s", MODEL_NAME)
    log.info("Curated ChromaDB: %s", CHROMA_CURATED_PATH)
    log.info("Runtime ChromaDB: %s", CHROMA_RUNTIME_PATH)
    log.info("Port: %d", PORT)
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
