#!/usr/bin/env python3
"""
build_knowledge_db_nexus.py — build the curated ChromaDB for the Nexus (slim) build

Identical purpose to ../build_knowledge_db.py (same JSONL source of truth under
../knowledge/, same bootstrap entries), but embeds with fastembed (ONNX runtime)
instead of sentence-transformers (PyTorch) — see brain_b_slim.py's module docstring
for why this build carries no torch dependency at all.

This is NOT a cosmetic swap: index-time and query-time embeddings must come from
the SAME embedding function, or retrieval silently degrades (comparing vectors from
two different encoders is not directly meaningful even if both happen to be
L2-normalized 384-dim output). brain_b_slim.py's embed() also uses fastembed —
keep both in sync if either changes.

Usage:
    python build_knowledge_db_nexus.py
    python build_knowledge_db_nexus.py --build-version 0.2.0
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[%(levelname)s %(asctime)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("build-knowledge-db-nexus")

NEXUS_DIR = Path(__file__).resolve().parent          # brain-b/nexus/
REPO_DIR = NEXUS_DIR.parent                            # brain-b/
KNOWLEDGE_DIR = REPO_DIR / "knowledge"                  # shared source of truth with the dev build

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", str(NEXUS_DIR / "build")))
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))
EMBED_MODELS_PATH = os.environ.get("EMBED_MODELS_PATH", str(BASE_DIR / "models"))
COLLECTION_NAME = "mossy_knowledge"

sys.path.insert(0, str(REPO_DIR))  # for bootstrap_fallout4_knowledge, knowledge_manifest

_embed_model = None


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION — identical to ../build_knowledge_db.py; see that file's comment for
# the real bug (wikitext bullet-depth collapse) this structural check replaced a
# blocklist for.
# ═══════════════════════════════════════════════════════════════════════════════

_VALID_IDENTIFIER_RE = re.compile(r'^[A-Za-z][A-Za-z0-9_]*$')


def validate_records(records: list[dict]) -> None:
    errors = []
    for r in records:
        tags = r.get("tags", "")
        tag_list = tags.split(",") if isinstance(tags, str) else (tags or [])
        if "papyrus-function" not in tag_list:
            continue
        title = r.get("title", "")
        func_name = title.split(" — ")[-1].strip() if " — " in title else ""
        if not func_name:
            errors.append(f"id={r.get('id')!r}: tagged papyrus-function but title {title!r} "
                           f"has no ' — FuncName' suffix to extract a name from")
            continue
        if not _VALID_IDENTIFIER_RE.match(func_name):
            errors.append(f"id={r.get('id')!r}: {func_name!r} is not a valid Papyrus identifier "
                           f"(must start with a letter, alphanumeric/underscore only)")
            continue
        content = r.get("content", "")
        if not re.search(rf'\b{re.escape(func_name)}\s*\(', content):
            errors.append(f"id={r.get('id')!r}: {func_name!r} never appears followed by '(' in its own "
                           f"content — no captured signature, so this isn't a real declaration "
                           f"(content: {content[:80]!r}...)")

    if errors:
        log.error("VALIDATION FAILED — %d record(s) look wrong:", len(errors))
        for e in errors[:50]:
            log.error("  %s", e)
        if len(errors) > 50:
            log.error("  ... and %d more", len(errors) - 50)
        log.error("Not building — fix the source JSONL (or the parser that generated it) and re-run.")
        sys.exit(1)


def check_record_count_swing(new_total: int, threshold: float = 0.15) -> None:
    from knowledge_manifest import load_manifest
    old = load_manifest(CHROMA_CURATED_PATH)
    if old is None:
        return
    old_total = old.get("total_documents", 0)
    if old_total == 0:
        return
    change = (new_total - old_total) / old_total
    if abs(change) > threshold:
        log.warning("Document count swung %+.1f%% from the previous build (%d -> %d). "
                    "Expected for a deliberate large content change; unexpected otherwise.",
                    change * 100, old_total, new_total)


def embed(texts: list[str]) -> list[list[float]]:
    """fastembed, not sentence-transformers — no torch. Model name matches
    knowledge_manifest.EMBEDDING_MODEL_NAME (BAAI/bge-small-en-v1.5) so the manifest's
    recorded model identity stays accurate, even though the loading mechanism differs
    from the dev build. fastembed's ONNX export of this model already returns
    L2-normalized vectors — no separate normalize step needed."""
    global _embed_model
    if _embed_model is None:
        from fastembed import TextEmbedding
        from knowledge_manifest import EMBEDDING_MODEL_NAME
        _embed_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME, cache_dir=EMBED_MODELS_PATH)
    return [vec.tolist() for vec in _embed_model.embed(texts)]


def iter_jsonl_records():
    if not KNOWLEDGE_DIR.exists():
        return
    for path in sorted(KNOWLEDGE_DIR.rglob("*.jsonl")):
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as e:
                log.warning("Skipping malformed JSONL at %s:%d — %s", path, lineno, e)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--build-version", default=None,
                     help="Manifest build_version tag (e.g. 0.2.0). Defaults to a dev-timestamp version.")
    ap.add_argument("--batch-size", type=int, default=256,
                     help="Records per embed+upsert batch (default 256).")
    args = ap.parse_args()

    import chromadb

    client = chromadb.PersistentClient(path=CHROMA_CURATED_PATH)
    try:
        client.delete_collection(COLLECTION_NAME)
        log.info("Cleared existing curated collection — rebuilding fully from repo sources.")
    except Exception:
        pass
    coll = client.get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})

    from bootstrap_fallout4_knowledge import bootstrap_chromadb
    bootstrap_added = bootstrap_chromadb(coll, embedding_fn=embed)
    log.info("Bootstrap entries: %d", bootstrap_added)

    records = list(iter_jsonl_records())
    log.info("Found %d JSONL records under %s", len(records), KNOWLEDGE_DIR)

    validate_records(records)
    log.info("Validation passed: %d records look like real Papyrus identifiers or non-function chunks.",
              len(records))

    sources_seen: dict[str, int] = {}
    batch_size = max(1, args.batch_size)
    for start in range(0, len(records), batch_size):
        batch = records[start:start + batch_size]
        ids = [r["id"] for r in batch]
        docs = [r["content"] for r in batch]
        metas = []
        for r in batch:
            meta = {k: v for k, v in r.items() if k not in ("id", "content", "tags")}
            tags = r.get("tags", [])
            meta["tags"] = ",".join(tags) if isinstance(tags, list) else (tags or "")
            metas.append(meta)
            src = r.get("source", "unknown")
            sources_seen[src] = sources_seen.get(src, 0) + 1
        embeddings = embed(docs)
        coll.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embeddings)
        log.info("Embedded + upserted %d/%d records", min(start + batch_size, len(records)), len(records))

    from knowledge_manifest import new_manifest, save_manifest
    build_version = args.build_version or f"dev-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    sources = {"bootstrap": {"count": bootstrap_added, "generated_by": "bootstrap_fallout4_knowledge.py"}}
    ck_wiki_count = sources_seen.get("ck_wiki_ingest", 0)
    if ck_wiki_count:
        sources["ck_wiki"] = {
            "count": ck_wiki_count,
            "wiki": "falloutck.uesp.net",
            "license": "CC BY-SA 2.5",
            "attribution_file": str(KNOWLEDGE_DIR / "ATTRIBUTION_CK_WIKI.md"),
        }
    check_record_count_swing(coll.count())

    manifest = new_manifest(build_version, sources, coll.count())
    save_manifest(CHROMA_CURATED_PATH, manifest)

    log.info("=" * 60)
    log.info("Build complete: build_version=%s total_documents=%d", build_version, coll.count())
    log.info("Curated collection: %s", CHROMA_CURATED_PATH)
    log.info("Manifest: %s", Path(CHROMA_CURATED_PATH) / "knowledge_manifest.json")


if __name__ == "__main__":
    main()
