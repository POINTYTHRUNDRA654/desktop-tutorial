#!/usr/bin/env python3
"""
reset_collection.py — fix the embedding-space bug AND partition curated/runtime

Two problems, one reset, because the second only stays cheap to fix right now:

1. EMBEDDING SPACE. Every write path into ChromaDB (bootstrap_chromadb,
   /knowledge/add, auto_save_to_chroma) has now been fixed to embed with
   BAAI/bge-small-en-v1.5, the same model hybrid_retrieve() uses for queries.
   But fixing the write paths doesn't touch vectors already written under the
   old default embedding model — same 384 dimensions, so nothing errors, but
   a different vector space, so those old vectors score as near-random noise
   against bge-small queries while still occupying top-k slots. That's worse
   than uniformly wrong: it looks like it's working.

2. CURATED/RUNTIME PARTITION. The curated collection is the actual shippable
   build artifact — the knowledge pack, versioned like a release asset. If
   runtime content (auto_save_to_chroma's cached web results, manual
   /knowledge/add uploads) lands in the same store, there is no way to export
   a clean pack later without untangling by provenance that was never
   recorded. So this script rebuilds into TWO separate ChromaDB directories
   (CHROMA_CURATED_PATH, CHROMA_RUNTIME_PATH) — physical separation, not a
   same-directory naming convention, because a directory boundary is much
   harder to blur by accident later than a collection name.

This script does a QUICK bootstrap-only rebuild — it does not scan
brain-b/knowledge/*.jsonl (the wiki content ingested via ingest_ck_wiki.py).
For the full canonical build — bootstrap entries + all committed knowledge —
use build_knowledge_db.py instead; that one is what an actual release build,
or picking up new knowledge from a merged PR, should run. This script is
still useful on its own for a fast local wipe when you've only changed
bootstrap_fallout4_knowledge.py and don't want to re-embed the whole corpus.

Also writes knowledge_manifest.json into the curated directory — see
knowledge_manifest.py for why a shipped collection needs to be
self-describing (embedding model, sources) rather than a bare directory of
vectors.

Run this BEFORE ingest_ck_wiki.py.

Usage:
    python reset_collection.py                        # prompts for confirmation
    python reset_collection.py --yes                   # skip confirmation
    python reset_collection.py --build-version 0.1.0   # tag the manifest explicitly
"""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[%(levelname)s %(asctime)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("reset-collection")

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))
CHROMA_RUNTIME_PATH = os.environ.get("CHROMA_RUNTIME_PATH", str(BASE_DIR / "data" / "chroma_runtime"))
# Pre-partition location. No longer read by gemma_service_enhanced.py — noted, not touched.
OLD_CHROMA_PATH = os.environ.get("CHROMA_PATH", str(BASE_DIR / "data" / "chroma"))
COLLECTION_NAME = "mossy_knowledge"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--yes", action="store_true", help="Skip the confirmation prompt.")
    ap.add_argument("--build-version", default=None,
                     help="Manifest build_version tag (e.g. 0.1.0). Defaults to a dev-timestamp version.")
    args = ap.parse_args()

    import chromadb

    if Path(OLD_CHROMA_PATH).exists():
        log.info("Note: a pre-partition collection exists at %s and is no longer read by Brain B "
                  "(it queried a single unpartitioned store before this split). Left alone — "
                  "remove it manually if you want the disk space back.", OLD_CHROMA_PATH)

    curated_client = chromadb.PersistentClient(path=CHROMA_CURATED_PATH)
    try:
        curated_count = curated_client.get_collection(COLLECTION_NAME).count()
    except Exception:
        curated_count = 0

    log.info("Curated collection at %s currently has %d documents.", CHROMA_CURATED_PATH, curated_count)
    if curated_count == 0:
        log.info("Nothing to reset in curated — bootstrapping fresh.")
    elif not args.yes:
        resp = input(f"This will DELETE all {curated_count} existing CURATED documents and rebuild from "
                      f"bootstrap_fallout4_knowledge.py. Continue? [y/N] ").strip().lower()
        if resp != "y":
            log.info("Aborted.")
            return

    if curated_count > 0:
        curated_client.delete_collection(COLLECTION_NAME)
        log.info("Deleted curated collection.")

    curated_coll = curated_client.get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})

    from gemma_service_enhanced import embed
    from bootstrap_fallout4_knowledge import bootstrap_chromadb

    added = bootstrap_chromadb(curated_coll, embedding_fn=embed)
    log.info("Rebuilt curated collection with %d correctly-embedded entries.", added)

    # Runtime: just ensure it exists. Never bootstrapped — it only ever holds
    # locally-generated content (auto_save_to_chroma web cache, /knowledge/add
    # manual uploads), and existing runtime content has the same stale-embedding
    # problem, so start it clean too rather than partially migrate it.
    runtime_client = chromadb.PersistentClient(path=CHROMA_RUNTIME_PATH)
    try:
        old_runtime_count = runtime_client.get_collection(COLLECTION_NAME).count()
        if old_runtime_count > 0:
            runtime_client.delete_collection(COLLECTION_NAME)
            log.info("Cleared %d stale-embedded runtime documents.", old_runtime_count)
    except Exception:
        pass
    runtime_coll = runtime_client.get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})
    log.info("Runtime collection ready at %s (%d docs).", CHROMA_RUNTIME_PATH, runtime_coll.count())

    from knowledge_manifest import new_manifest, save_manifest, manifest_path
    build_version = args.build_version or f"dev-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    manifest = new_manifest(
        build_version=build_version,
        sources={"bootstrap": {"count": added, "generated_by": "bootstrap_fallout4_knowledge.py"}},
        total_documents=curated_coll.count(),
    )
    save_manifest(CHROMA_CURATED_PATH, manifest)
    log.info("Manifest written: %s (build_version=%s)", manifest_path(CHROMA_CURATED_PATH), build_version)
    log.info("This was a bootstrap-only rebuild. If brain-b/knowledge/*.jsonl has ck wiki content, "
             "run build_knowledge_db.py instead to get the full corpus into this collection.")


if __name__ == "__main__":
    main()
