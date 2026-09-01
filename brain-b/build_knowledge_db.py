#!/usr/bin/env python3
"""
build_knowledge_db.py — build the curated ChromaDB FROM repo-committed sources

This is the actual release-build step. It reads:
  - bootstrap_fallout4_knowledge.py (hand-authored entries, already in git)
  - every brain-b/knowledge/**/*.jsonl file (wiki content ingested and
    committed via ingest_ck_wiki.py, reviewable/PR-able like any other
    source file)

...and embeds + upserts all of it into CHROMA_CURATED_PATH, writing a fresh
knowledge_manifest.json. The JSONL under brain-b/knowledge/ is the source of
truth; the ChromaDB directory this produces is a BUILD OUTPUT — always fully
reproducible by re-running this script, never something to hand-edit.

Always does a full rebuild (drops the existing curated collection first)
rather than an incremental update — the whole point of treating the DB as a
build output is that it's cheap and safe to regenerate from scratch every
time, so there's no incremental-vs-source drift to worry about.

Run this after ingest_ck_wiki.py, or any time you've pulled new/changed
knowledge/*.jsonl from git (e.g. after merging a community PR) and want your
local curated collection to reflect it.

For a fast bootstrap-only local wipe that doesn't scan brain-b/knowledge/ at
all, see reset_collection.py instead — this script is the full, canonical
build; that one is a narrower dev convenience.

Usage:
    python build_knowledge_db.py
    python build_knowledge_db.py --build-version 0.2.0
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
log = logging.getLogger("build-knowledge-db")

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))
MODELS_PATH = os.environ.get("MODELS_PATH", str(BASE_DIR / "models"))
COLLECTION_NAME = "mossy_knowledge"

REPO_DIR = Path(__file__).resolve().parent  # brain-b/
KNOWLEDGE_DIR = REPO_DIR / "knowledge"

_embed_model = None


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION — cheap assertions, fail the build loudly.
#
# Motivated by a real bug: a wikitext parsing regression (bullet-depth
# collapse — see ingest_ck_wiki.py's wikitext_to_text()) silently produced
# phantom "function" chunks named "received", "called", "sent" — English
# words lifted from a description sentence, not real Papyrus identifiers.
# At 8 pages this was found by eyeballing chunk titles by hand. At 300 pages
# nobody eyeballs anything — this is the difference between catching that
# class of bug and shipping a corrupted knowledge pack.
# ═══════════════════════════════════════════════════════════════════════════════

_VALID_IDENTIFIER_RE = re.compile(r'^[A-Za-z][A-Za-z0-9_]*$')


def validate_records(records: list[dict]) -> None:
    """
    Raises SystemExit with every violation listed if anything looks wrong.
    Runs BEFORE embedding — no point spending compute on data known to be bad.

    Deliberately NOT a wordlist of "suspicious" names — Clear, Find, Add,
    Insert, Remove, Length, Reset, Sort are all real Papyrus function names
    (on array/form scripts among others), and a blocklist would fail the
    build on legitimate content the moment the corpus extends past the
    current 8 pages. Validated structurally instead: a genuine function
    record's OWN content must contain that name immediately followed by an
    opening paren (its captured signature) — which is exactly what the
    phantom class (received/sent/called) never had, since those were
    parsed-out description sentences with no signature at all.
    """
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
    """
    Warns (does not fail) if total_documents swung by more than `threshold`
    from the previous build. A full rebuild draws from the same committed
    JSONL every time, so a big unexplained drop usually means something
    broke (files deleted, a parser regression silently emptying pages) —
    not a legitimate content decision, which would normally be a small,
    deliberate, single-page change, not a corpus-wide swing.
    """
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
                    "Expected for a deliberate large content change; unexpected otherwise — "
                    "worth checking what changed before trusting this build.",
                    change * 100, old_total, new_total)


def embed(texts: list[str]) -> list[list[float]]:
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        from knowledge_manifest import EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_REVISION
        _embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME, revision=EMBEDDING_MODEL_REVISION,
                                            cache_folder=MODELS_PATH)
    return _embed_model.encode(texts, normalize_embeddings=True).tolist()


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
    log.info("Next: python ingest_ck_wiki.py --test-query \"<something you'd actually ask Mossy>\"")


if __name__ == "__main__":
    main()
