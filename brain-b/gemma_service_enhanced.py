#!/usr/bin/env python3
"""
gemma_service_enhanced.py — Brain B: Mossy Local AI Service
============================================================
Full-featured local Gemma inference server with:
  • Hybrid BM25 + semantic RAG retrieval
  • Reciprocal Rank Fusion (RRF) for result merging — NO external API key needed
  • Episodic memory (SQLite episodes table)
  • Self-critique loop via /reflect
  • LangGraph multi-step reasoning workflow
  • DuckDuckGo web search grounding (free, no API key)
  • NetworkX knowledge graph
  • User feedback endpoint + learning loop
  • LoRA fine-tune pipeline endpoint
  • Model selection (9B / 12B / 27B based on VRAM)

ALL components are FREE and open-source. No API keys required.
Model weights download from HuggingFace on first run (free account not required).

Deploy at: D:\\Mossy-AI\\gemma_service_enhanced.py
Start: python gemma_service_enhanced.py
API: http://localhost:8765

Environment variables:
  CHROMA_PATH  – ChromaDB persist dir  (default D:\\Mossy-AI\\data\\chroma)
  MODELS_PATH  – HuggingFace cache dir (default D:\\Mossy-AI\\models)
  MOSSY_MODEL  – Override model name   (default auto-selected by VRAM)
  MOSSY_PORT   – Server port           (default 8765)
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import networkx as nx
import numpy as np
import torch
from duckduckgo_search import DDGS
from flask import Flask, jsonify, request
from flask_cors import CORS
from rank_bm25 import BM25Okapi

# ── Constants ────────────────────────────────────────────────────────────────
BASE_DIR       = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
CHROMA_PATH    = os.environ.get("CHROMA_PATH",  str(BASE_DIR / "data" / "chroma"))
MODELS_PATH    = os.environ.get("MODELS_PATH",  str(BASE_DIR / "models"))
DB_PATH        = BASE_DIR / "data" / "mossy_brain.db"
GRAPH_PATH     = BASE_DIR / "data" / "knowledge_graph.json"
LORA_PATH      = BASE_DIR / "models" / "mossy-lora"
DATASET_PATH   = BASE_DIR / "data" / "training_dataset.jsonl"
COHERE_API_KEY = ""  # Not used — RRF merging requires no external API
PORT           = int(os.environ.get("MOSSY_PORT", 8765))
MAX_EPISODES   = 500
CRITIQUE_CONF_THRESHOLD = 0.85

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
_collection  = None
_embed_model = None
_bm25        = None
_bm25_docs   = None
_bm25_ids    = None
_graph       = None


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
    """)
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
        _model, _tokenizer = FastLanguageModel.from_pretrained(
            model_name=MODEL_NAME,
            max_seq_length=8192,
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
    inputs = _tokenizer(prompt, return_tensors="pt").to(_model.device)
    with torch.no_grad():
        outputs = _model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=_tokenizer.eos_token_id,
        )
    decoded = _tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return decoded.strip()


# ═══════════════════════════════════════════════════════════════════════════════
# EMBEDDING MODEL
# ═══════════════════════════════════════════════════════════════════════════════

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5", cache_folder=MODELS_PATH)
        log.info("Embedding model loaded: BAAI/bge-small-en-v1.5")
    return _embed_model


def embed(texts: list[str]) -> list[list[float]]:
    model = get_embed_model()
    return model.encode(texts, normalize_embeddings=True).tolist()


# ═══════════════════════════════════════════════════════════════════════════════
# CHROMADB + BM25 HYBRID RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════════

def get_collection():
    global _collection
    if _collection is None:
        import chromadb
        Path(CHROMA_PATH).mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = client.get_or_create_collection(
            "mossy_knowledge", metadata={"hnsw:space": "cosine"}
        )
        log.info("ChromaDB collection ready (%d docs).", _collection.count())
    return _collection


def _build_bm25():
    """Build BM25 index from all ChromaDB documents (rebuilt on first call)."""
    global _bm25, _bm25_docs, _bm25_ids
    coll = get_collection()
    count = coll.count()
    if count == 0:
        _bm25 = None
        return
    result = coll.get(include=["documents"])
    _bm25_docs = result["documents"]
    _bm25_ids  = result["ids"]
    tokenized  = [doc.lower().split() for doc in _bm25_docs]
    _bm25 = BM25Okapi(tokenized)
    log.info("BM25 index built over %d documents.", len(_bm25_docs))


def hybrid_retrieve(query: str, top_k: int = 10) -> list[dict]:
    """
    Hybrid BM25 + semantic retrieval.
    Returns merged, deduplicated results with a combined score.
    """
    coll = get_collection()

    # ── Semantic (vector) retrieval ──
    q_embed = embed([query])
    sem_results = coll.query(
        query_embeddings=q_embed,
        n_results=min(top_k, max(coll.count(), 1)),
        include=["documents", "metadatas", "distances"],
    )
    sem_docs  = sem_results["documents"][0] if sem_results["documents"] else []
    sem_ids   = sem_results["ids"][0] if sem_results["ids"] else []
    sem_dists = sem_results["distances"][0] if sem_results["distances"] else []

    # ── BM25 keyword retrieval ──
    if _bm25 is None:
        _build_bm25()

    bm25_scored: list[tuple[str, str, float]] = []
    if _bm25 is not None and _bm25_docs:
        scores = _bm25.get_scores(query.lower().split())
        top_idx = np.argsort(scores)[::-1][:top_k]
        for idx in top_idx:
            if scores[idx] > 0:
                bm25_scored.append((_bm25_ids[idx], _bm25_docs[idx], float(scores[idx])))

    # ── Merge & deduplicate using Reciprocal Rank Fusion (RRF) ──
    # RRF score: sum(1 / (rank + k)) across retrieval methods.
    # No external API key or paid service required.
    K = 60  # standard RRF constant (higher K = smoother ranking)

    rrf_scores: dict[str, float] = {}
    doc_store: dict[str, dict] = {}

    for rank, (doc_id, doc, dist) in enumerate(zip(sem_ids, sem_docs, sem_dists)):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (rank + 1 + K)
        doc_store[doc_id] = {"id": doc_id, "text": doc, "source": "vector"}

    for rank, (doc_id, doc, bm25_score) in enumerate(bm25_scored):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (rank + 1 + K)
        if doc_id not in doc_store:
            doc_store[doc_id] = {"id": doc_id, "text": doc, "source": "bm25"}
        else:
            doc_store[doc_id]["source"] = "vector+bm25"

    merged = sorted(
        [{"id": did, "text": doc_store[did]["text"], "score": score,
          "source": doc_store[did]["source"]}
         for did, score in rrf_scores.items()],
        key=lambda x: x["score"],
        reverse=True,
    )

    return merged[:top_k]


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
    """Persist a web search result into ChromaDB for future retrieval."""
    coll = get_collection()
    doc_id = f"web-{int(time.time())}"
    coll.upsert(
        ids=[doc_id],
        documents=[web_text],
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
    like_clauses = " OR ".join(["LOWER(summary) LIKE ?" for _ in words])
    params = [f"%{w}%" for w in words[:8]]
    rows = conn.execute(
        f"SELECT ts, summary FROM episodes WHERE {like_clauses} ORDER BY id DESC LIMIT ?",
        params + [limit],
    ).fetchall()
    conn.close()
    return [f"[{row[0][:10]}] {row[1]}" for row in rows]


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH REASONING WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════

def run_langgraph_workflow(question: str, max_refine_loops: int = 2) -> dict:
    """
    Stateful LangGraph reasoning pipeline:
    search_kb → [web_fallback] → generate → critique → [refine] → validate → return

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
            context_parts = []
            sources = []
            for r in results[:6]:
                context_parts.append(r["text"])
                sources.append(r.get("id", "unknown"))
            # Graph expansion: pull in related nodes
            expanded_ids = graph_expand(sources, hops=1)
            if expanded_ids:
                coll = get_collection()
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
            prompt = (
                f"You are Mossy, an expert Fallout 4 modding assistant.\n"
                f"KNOWLEDGE BASE CONTEXT:\n{ctx}\n"
                f"{episode_ctx}\n\n"
                f"USER QUESTION: {state['question']}\n\n"
                f"Provide a thorough, accurate answer. Cite specific tools, record types, "
                f"or INI settings where relevant.\n\nMOSSY:"
            )
            state["draft_answer"] = generate_text(prompt, max_new_tokens=768)
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
            state["critique"] = generate_text(prompt, max_new_tokens=256, temperature=0.3)
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
            refined = generate_text(prompt, max_new_tokens=768)
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
        return _simple_infer(question)


def _simple_infer(question: str) -> dict:
    """Fallback when LangGraph is not available."""
    results = hybrid_retrieve(question, top_k=6)
    ctx = "\n\n".join(r["text"] for r in results)
    sources = [r.get("id", "?") for r in results]
    if not ctx:
        web = web_search(question)
        if web:
            ctx = f"[Web]\n{web}"
    prompt = (
        f"You are Mossy, an expert Fallout 4 modding assistant.\n"
        f"CONTEXT:\n{ctx}\n\nQ: {question}\n\nMOSSY:"
    )
    answer = generate_text(prompt, max_new_tokens=512)
    return {"answer": answer, "confidence": 0.7, "sources": sources,
            "critique_applied": False, "used_web": False}


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
    critique = generate_text(critique_prompt, max_new_tokens=256, temperature=0.3)

    if critique.upper().startswith("LGTM"):
        return jsonify({"critique": "LGTM", "refined": answer, "improved": False})

    refine_prompt = (
        f"Improve this answer based on the critique:\n\n"
        f"Q: {question}\nA: {answer}\n\nCritique: {critique}\n\nImproved answer:\n"
    )
    refined = generate_text(refine_prompt, max_new_tokens=512)
    return jsonify({"critique": critique, "refined": refined, "improved": True})


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN INFERENCE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/infer", methods=["POST"])
def infer():
    """
    POST /infer  { "question": "...", "use_langgraph": true }
    Returns { "answer": "...", "confidence": 0.8, "sources": [...] }
    """
    data = request.get_json(force=True)
    question      = data.get("question", "").strip()
    use_langgraph = data.get("use_langgraph", True)

    if not question:
        return jsonify({"error": "question required"}), 400

    # Episodic memory context
    episodes = search_episodes(question, limit=3)

    try:
        if use_langgraph:
            result = run_langgraph_workflow(question)
        else:
            result = _simple_infer(question)
    except Exception as e:
        log.exception("Inference failed: %s", e)
        return jsonify({"error": str(e)}), 500

    # Optionally auto-save episode summary
    if result.get("answer"):
        summary = f"Q: {question[:80]} → {result['answer'][:120]}"
        save_episode(summary, result.get("sources", [])[:5])

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
    """POST /knowledge/add  { "title": "...", "content": "...", "tags": [...] }"""
    data    = request.get_json(force=True)
    title   = data.get("title", "Untitled")
    content = data.get("content", "")
    tags    = data.get("tags", [])
    if not content:
        return jsonify({"error": "content required"}), 400
    doc_id = f"user-{int(time.time())}"
    coll = get_collection()
    coll.upsert(
        ids=[doc_id],
        documents=[content],
        metadatas=[{"title": title, "tags": ",".join(tags), "source": "user",
                    "ts": datetime.utcnow().isoformat()}],
    )
    global _bm25
    _bm25 = None  # invalidate BM25 index
    return jsonify({"status": "added", "id": doc_id})


@app.route("/knowledge/count", methods=["GET"])
def knowledge_count():
    coll = get_collection()
    return jsonify({"count": coll.count()})


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
        "chroma_docs": get_collection().count(),
        "gpu": gpu_info,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("Mossy Brain B — Enhanced Gemma Service")
    log.info("Model: %s", MODEL_NAME)
    log.info("ChromaDB: %s", CHROMA_PATH)
    log.info("Port: %d", PORT)
    log.info("=" * 60)

    # Initialize database
    init_db()

    # Bootstrap knowledge base if empty
    coll = get_collection()
    if coll.count() == 0:
        log.info("Empty ChromaDB — running bootstrap...")
        try:
            from bootstrap_fallout4_knowledge import bootstrap_chromadb
            added = bootstrap_chromadb(coll)
            log.info("Bootstrap complete: %d entries.", added)
            _bm25 = None  # rebuild on first query
        except Exception as e:
            log.warning("Bootstrap failed (run bootstrap manually): %s", e)

    # Build knowledge graph
    try:
        get_graph()
    except Exception as e:
        log.warning("Knowledge graph build failed: %s", e)

    log.info("Starting Flask server on port %d...", PORT)
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
