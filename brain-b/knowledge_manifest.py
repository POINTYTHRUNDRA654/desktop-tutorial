#!/usr/bin/env python3
"""
knowledge_manifest.py — self-description for the curated knowledge collection

The knowledge base splits into two ChromaDB stores (see gemma_service_enhanced.py):

  curated  — bootstrap entries + reviewed wiki ingestion. This is the actual
             build artifact: versioned, shipped, redistributed to users.
  runtime  — auto-saved web search results + manually /knowledge/add'd
             content. Local to one machine, never packaged, no manifest.

A shipped curated collection is a directory of vectors with no context of
its own unless something travels with it. This manifest is that context:

  - which embedding model built it, so a downloader whose install embeds
    queries with a different model gets a loud failure instead of silently
    plausible-looking, actually-meaningless retrieval (the exact bug fixed
    in bootstrap_chromadb()/auto_save_to_chroma(), now with the blast radius
    of "every person who downloads this" instead of one dev machine).
  - which REVISION of that model, pinned — not just the name. HuggingFace
    model weights can be updated upstream under the same name; the same
    JSONL embedded six months apart with an unpinned "latest" checkout could
    silently produce different vectors, and the resulting retrieval-quality
    drift would be close to undiagnosable. Pinning makes a build actually
    reproducible: same JSONL + same pinned revision = same vectors, always.
  - what went into it and under what license, for the CC BY-SA 2.5
    obligations the CK wiki content carries (see ingest_ck_wiki.py's
    ATTRIBUTION_CK_WIKI.md output).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
# Pinned via https://huggingface.co/api/models/BAAI/bge-small-en-v1.5 (checked 2026-08-12).
# Pass this as `revision=` wherever SentenceTransformer(EMBEDDING_MODEL_NAME) is loaded —
# see gemma_service_enhanced.py/ingest_ck_wiki.py/build_knowledge_db.py's embed().
EMBEDDING_MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"
EMBEDDING_DIM = 384

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


def new_manifest(build_version: str, sources: dict, total_documents: int) -> dict:
    return {
        "build_version": build_version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "embedding_model": EMBEDDING_MODEL_NAME,
        "embedding_model_revision": EMBEDDING_MODEL_REVISION,
        "embedding_dim": EMBEDDING_DIM,
        "total_documents": total_documents,
        "sources": sources,
    }


def check_embedding_model(curated_dir, current_model: str = EMBEDDING_MODEL_NAME,
                           current_revision: str = EMBEDDING_MODEL_REVISION) -> None:
    """
    Call once before serving retrieval from the curated collection. Raises
    EmbeddingModelMismatch — deliberately loud, not logged-and-continued — if
    the manifest says a different model OR revision built it. No manifest
    present (e.g. a fresh dev rebuild via reset_collection.py, which always
    writes one before this would ever run against real content) is not
    treated as an error.
    """
    manifest = load_manifest(curated_dir)
    if manifest is None:
        return
    built_with = manifest.get("embedding_model")
    built_revision = manifest.get("embedding_model_revision")
    if built_with and built_with != current_model:
        raise EmbeddingModelMismatch(
            f"Curated knowledge collection at {curated_dir!r} was built with "
            f"embedding model {built_with!r}, but this process embeds queries "
            f"with {current_model!r}. Vectors from two different models are not "
            f"comparable by cosine similarity — retrieval would run without "
            f"erroring and return results that look plausible but are close to "
            f"random. Re-run reset_collection.py + ingest_ck_wiki.py against the "
            f"current model, or install the model this package was built with."
        )
    if built_revision and current_revision and built_revision != current_revision:
        raise EmbeddingModelMismatch(
            f"Curated knowledge collection at {curated_dir!r} was built with "
            f"{current_model} revision {built_revision!r}, but this process is "
            f"pinned to revision {current_revision!r}. Same model name, different "
            f"upstream weights — vectors are not guaranteed comparable. Rebuild via "
            f"build_knowledge_db.py with the current pin, or update "
            f"EMBEDDING_MODEL_REVISION to match the package."
        )
