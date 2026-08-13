#!/usr/bin/env python3
"""
knowledge_manifest.py — self-description for the curated knowledge collection
(Nexus/slim edition — embeds with fastembed, not sentence-transformers)

The knowledge base splits into two ChromaDB stores (see brain_b_slim.py):

  curated  — bootstrap entries + reviewed wiki ingestion. This is the actual
             build artifact: versioned, shipped, redistributed to users.
  runtime  — auto-saved web search results + manually /knowledge/add'd
             content. Local to one machine, never packaged, no manifest.

A shipped curated collection is a directory of vectors with no context of
its own unless something travels with it. This manifest is that context —
and its embedding check is a CANARY, not a metadata-string comparison.

Why a canary instead of comparing model-name/revision strings: this build's
embedder (fastembed/ONNX) is a different library from the dev build's
(sentence-transformers/PyTorch). "Same model name" does not imply "same
vectors" across libraries — fastembed's registry entry for this model
(qdrant/bge-small-en-v1.5-onnx-q) is a separately-exported ONNX artifact,
and a quantized or re-exported variant could diverge from the reference
weights with no error at all: cosine similarity would just be quietly
meaningless and retrieval would degrade in a way that looks plausible.
(Verified empirically before shipping — cosine >=0.999998 and identical
rank-1/top-5 retrieval vs. sentence-transformers on the pinned revision,
across both short queries and real 300-700 char curated documents — but
that verification is a point-in-time fact about one build, not something
future code changes automatically preserve.)

A string comparison can't catch a library swap, a fastembed version bump
that changes which ONNX export it pulls, or a precision change — every one
of those can leave "BAAI/bge-small-en-v1.5" as the recorded name on both
sides while the actual vectors diverge. The canary re-embeds a fixed
sentence with whatever embedder is running RIGHT NOW and compares it
against the vector recorded at build time. That's a real assertion: it
directly tests the thing that matters (does this process's embedder agree
with this collection's vector space), not a proxy for it.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIM = 384

# Fixed sentence embedded once at build time and re-embedded at every startup.
# Content doesn't matter — only that it's stable across builds so the comparison
# is apples-to-apples.
EMBEDDING_CANARY_TEXT = (
    "Fallout 4 Creation Kit Papyrus scripting reference sentence used to verify "
    "the embedding pipeline has not changed."
)
EMBEDDING_CANARY_COSINE_THRESHOLD = 0.999

MANIFEST_FILENAME = "knowledge_manifest.json"


class EmbeddingModelMismatch(RuntimeError):
    pass


def manifest_path(curated_dir) -> Path:
    return Path(curated_dir) / MANIFEST_FILENAME


def load_manifest(curated_dir) -> Optional[dict]:
    p = manifest_path(curated_dir)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def save_manifest(curated_dir, manifest: dict) -> None:
    p = manifest_path(curated_dir)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def describe_fastembed_source(model_name: str = EMBEDDING_MODEL_NAME) -> str:
    """What actually produced the vectors — the fastembed registry's HF source repo
    and ONNX filename, not an unused sentence-transformers revision hash. Fetched
    live from the installed fastembed's registry so this stays accurate if a
    fastembed version bump changes which export it serves."""
    try:
        from fastembed import TextEmbedding
        for m in TextEmbedding.list_supported_models():
            if m.get("model") == model_name:
                src = m.get("sources", {}).get("hf", "unknown")
                model_file = m.get("model_file", "unknown")
                return f"{src} ({model_file})"
    except Exception:
        pass
    return "unknown"


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def new_manifest(build_version: str, sources: dict, total_documents: int,
                  *, embedding_backend: str, embedding_source: str,
                  canary_vector: list[float]) -> dict:
    return {
        "build_version": build_version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "embedding_model": EMBEDDING_MODEL_NAME,
        "embedding_backend": embedding_backend,
        "embedding_source": embedding_source,
        "embedding_dim": EMBEDDING_DIM,
        "embedding_canary_text": EMBEDDING_CANARY_TEXT,
        "embedding_canary_vector": canary_vector,
        "total_documents": total_documents,
        "sources": sources,
    }


def check_embedding_model(curated_dir, embed_fn: Callable[[list[str]], list[list[float]]],
                           cosine_threshold: float = EMBEDDING_CANARY_COSINE_THRESHOLD) -> None:
    """
    Call once before serving retrieval from the curated collection. Re-embeds the
    fixed canary sentence with embed_fn (this process's actual embedder) and compares
    it against the vector recorded in the manifest at build time. Raises
    EmbeddingModelMismatch — deliberately loud, not logged-and-continued — if they've
    diverged past cosine_threshold.

    No manifest, or a manifest predating the canary field (older builds), is not
    treated as an error — nothing to check against yet.
    """
    manifest = load_manifest(curated_dir)
    if manifest is None:
        return
    canary_text = manifest.get("embedding_canary_text")
    stored_vector = manifest.get("embedding_canary_vector")
    if not canary_text or not stored_vector:
        return
    current_vector = embed_fn([canary_text])[0]
    cosine = _cosine(stored_vector, current_vector)
    if cosine < cosine_threshold:
        raise EmbeddingModelMismatch(
            f"Embedding canary check failed for {curated_dir!r}: re-embedding the "
            f"canary sentence with this process's embedder produced cosine similarity "
            f"{cosine:.4f} against the vector recorded at build time (threshold "
            f"{cosine_threshold}). Vectors from a different embedder, export, or "
            f"precision are not reliably comparable by cosine similarity — retrieval "
            f"would run without erroring and return results that look plausible but "
            f"are close to random. This collection was built with "
            f"backend={manifest.get('embedding_backend')!r} "
            f"source={manifest.get('embedding_source')!r}; this process's embedder must "
            f"match. Rebuild via build_knowledge_db_nexus.py with the current embedder, "
            f"or install the matching one."
        )
