#!/usr/bin/env python3
"""
ingest_ck_wiki.py — Brain B corpus ingestion: CK wiki, Papyrus reference, F4SE
================================================================================
Pulls the Creation Kit wiki (falloutck.uesp.net) into REVIEWABLE, COMMITTABLE
JSONL under brain-b/knowledge/ck_wiki/ — one file per page — via that wiki's
MediaWiki API, NOT HTML scraping. It's a live MediaWiki instance (confirmed:
/w/api.php responds), so the API is the polite and intended way to bulk-read
it.

This script does NOT write to ChromaDB or compute embeddings. The JSONL it
writes under brain-b/knowledge/ IS the source of truth — meant to be
committed and reviewed like any other change (a community contributor fixing
one page's ingested content touches exactly that page's file). The curated
ChromaDB is a BUILD OUTPUT produced from that JSONL by build_knowledge_db.py,
not something to hand-edit or trust as canonical. That separation is what
makes community review of knowledge additions possible at all — you can't
meaningfully code-review a vector.

LICENSING: falloutck.uesp.net's content is Creative Commons
Attribution-ShareAlike 2.5 (confirmed via the wiki's own MediaWiki
`rightsinfo` API, not just a page someone could have edited: en.uesp.net's
sister wiki explicitly reports "Attribution-ShareAlike 2.5 License"). Reuse
requires attributing the source article and providing access to it and its
edit history — satisfied here by recording `source_url` and `history_url` in
every JSONL record and by writing brain-b/knowledge/ATTRIBUTION_CK_WIKI.md,
which lists every ingested page. See /LICENSING.md at the repo root for what
this means for anything built from this content — short version: it can't be
relicensed under this repo's MIT license, and neither can a downstream
derivative.

Usage:
    python ingest_ck_wiki.py --dry-run --limit 20          # sanity-check output, no writes
    python ingest_ck_wiki.py --limit 25                     # small real run — do this before scaling up
    python ingest_ck_wiki.py --limit 300                    # larger run, once quality is checked
    python ingest_ck_wiki.py --categories Papyrus,F4SE      # override default categories
    python ingest_ck_wiki.py --force                        # re-ingest even if unchanged

    python build_knowledge_db.py                            # THEN build the local ChromaDB from the JSONL
    python ingest_ck_wiki.py --test-query "how do I use RegisterForRemoteEvent"
                                                              # THEN query the built collection — only needs
                                                              # the embedding model loaded, not the full Gemma
                                                              # stack. Run before scaling up further.

Safe to interrupt and re-run: a local (non-committed) checkpoint file records
the content hash of every page already ingested, so re-running only fetches
pages that are new or have changed on the wiki (unless --force).

Rate limiting: politely paced (default 0.5s between page fetches, override
with --sleep) and identifies itself with a descriptive User-Agent, per
MediaWiki API etiquette. --limit defaults to 300 per run specifically so a
first run can't accidentally kick off a many-thousand-page crawl unattended —
raise it deliberately once you've checked a small run's output quality.

Environment variables:
    MOSSY_BASE_DIR       – default D:\\Mossy-AI. Only used for the local
                            checkpoint cache and (for --test-query) the local
                            built ChromaDB — never for anything committed.
    CHROMA_CURATED_PATH  – default {MOSSY_BASE_DIR}\\data\\chroma_curated
    MODELS_PATH          – default {MOSSY_BASE_DIR}\\models
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

from skill_tags import tags_for_page

logging.basicConfig(level=logging.INFO, format="[%(levelname)s %(asctime)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("ck-wiki-ingest")

API_URL = "https://falloutck.uesp.net/w/api.php"
WIKI_BASE = "https://falloutck.uesp.net/wiki/"
WIKI_INDEX = "https://falloutck.uesp.net/w/index.php"
LICENSE = "CC BY-SA 2.5"
USER_AGENT = (
    "MossySpaceIngest/1.0 (personal local RAG ingestion for a single-user "
    "Fallout 4 modding desktop app; run manually and rate-limited)"
)

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))
MODELS_PATH = os.environ.get("MODELS_PATH", str(BASE_DIR / "models"))
# Local-only, never committed: just a "have I already fetched this exact revision" cache.
CHECKPOINT_PATH = BASE_DIR / "data" / "ingest_ck_wiki_checkpoint.json"

# In-repo, committed: the actual source of truth. brain-b/knowledge/, not D:\Mossy-AI —
# see module docstring for why this is a repo path and not a runtime data path.
REPO_DIR = Path(__file__).resolve().parent  # brain-b/
KNOWLEDGE_DIR = REPO_DIR / "knowledge"
CK_WIKI_JSONL_DIR = KNOWLEDGE_DIR / "ck_wiki"
ATTRIBUTION_JSON_PATH = KNOWLEDGE_DIR / "attribution_ck_wiki.json"
ATTRIBUTION_MD_PATH = KNOWLEDGE_DIR / "ATTRIBUTION_CK_WIKI.md"

DEFAULT_CATEGORIES = [
    "Papyrus",
    "Papyrus Language Reference",
    "F4SE",
    "Creation Kit",
    "Object Classes",
    "Events",
    "Condition Functions",
    "FO4Edit",
    "Scripting",
    "Papyrus Tutorials",
]

MAX_CHUNK_CHARS = 1400

_session: Optional[requests.Session] = None
_embed_model = None


def get_session() -> requests.Session:
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update({"User-Agent": USER_AGENT})
    return _session


def page_urls(title: str) -> tuple[str, str]:
    """(canonical article URL, edit-history URL) — both required for BY-SA attribution."""
    encoded_underscored = urllib.parse.quote(title.replace(" ", "_"))
    source_url = WIKI_BASE + encoded_underscored
    history_url = f"{WIKI_INDEX}?title={encoded_underscored}&action=history"
    return source_url, history_url


# ═══════════════════════════════════════════════════════════════════════════════
# MEDIAWIKI API
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_category_members(category: str, limit: Optional[int] = None) -> list[str]:
    """Return page titles in a category (namespace 0 / articles only), following continuation."""
    session = get_session()
    titles: list[str] = []
    cmcontinue = None
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}",
            "cmlimit": "500",
            "cmnamespace": "0",
            "format": "json",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue
        resp = session.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        members = data.get("query", {}).get("categorymembers", [])
        titles.extend(m["title"] for m in members)
        if limit and len(titles) >= limit:
            return titles[:limit]
        cmcontinue = data.get("continue", {}).get("cmcontinue")
        if not cmcontinue:
            break
        time.sleep(0.2)  # category listing calls are cheap but still be polite
    return titles


def fetch_page(title: str) -> Optional[dict]:
    """Returns {"wikitext": str, "revid": int} or None on failure. revid is
    required for BY-SA provenance (which exact revision this text came from)."""
    session = get_session()
    params = {"action": "parse", "page": title, "prop": "wikitext|revid", "format": "json"}
    try:
        resp = session.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            log.warning("API error for %r: %s", title, data["error"].get("info"))
            return None
        p = data["parse"]
        return {"wikitext": p["wikitext"]["*"], "revid": p.get("revid")}
    except (requests.RequestException, KeyError) as e:
        log.warning("Fetch failed for %r: %s", title, e)
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# WIKITEXT -> CLEAN TEXT
# ═══════════════════════════════════════════════════════════════════════════════

def wikitext_to_text(wikitext: str) -> str:
    """
    Strip MediaWiki markup down to plain, readable text while preserving code
    blocks and function signatures — the highest-value content on this wiki.
    Verified against a real page (ObjectReference Script) during development;
    intentionally simple regex-based conversion rather than a full wikitext
    parser, since this corpus's markup usage is narrow and consistent
    (source blocks, links, bold/italic, headers, bullet lists, infobox
    templates) and a full parser is not worth the dependency for that.
    """
    t = wikitext
    t = re.sub(r'<source[^>]*>(.*?)</source>', lambda m: '\n' + m.group(1).strip() + '\n', t, flags=re.S)
    t = re.sub(r'<pre[^>]*>(.*?)</pre>', lambda m: '\n' + m.group(1).strip() + '\n', t, flags=re.S)
    t = re.sub(r'\[\[Category:[^\]]*\]\]', '', t, flags=re.I)     # [[Category:X]] is page metadata, not content
    t = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', t)          # [[Target|Display]] -> Display
    t = re.sub(r'\[\[([^\]]+)\]\]', r'\1', t)                     # [[Target]] -> Target
    t = re.sub(r'\[https?://\S+\s+([^\]]+)\]', r'\1', t)          # [url Display] -> Display
    t = re.sub(r"'''''(.*?)'''''", r'\1', t)
    t = re.sub(r"'''(.*?)'''", r'\1', t)
    t = re.sub(r"''(.*?)''", r'\1', t)
    t = re.sub(r'^={1,4}\s*(.*?)\s*={1,4}\s*$', r'\1:', t, flags=re.M)  # == Header == -> Header:
    t = re.sub(r'\{\{[^{}]*\}\}', '', t)                          # drop infobox/navbox templates
    # Bullet depth MUST stay distinguishable here. This wiki's convention is
    # "*Function Foo(...)" (declaration) followed by "**description text"
    # (its description, one level deeper) — and that description routinely
    # starts with the English word "Event"/"Function" ("**Event received
    # when this actor dies."). Collapsing both levels to the same "- " prefix
    # made FUNC_START_RE below match that description as a NEW declaration,
    # corrupting the real entry (truncated) and creating a phantom one
    # ("Actor Script — received") — confirmed against real ingested output,
    # not hypothetical. Order matters: consume "**"+ (nested) before "*".
    t = re.sub(r'^\*{2,}\s*', '    ', t, flags=re.M)              # nested (description) bullets -> indent, no marker
    t = re.sub(r'^\*\s*', '- ', t, flags=re.M)                    # top-level bullets -> "- "
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    return t


# Require an opening paren shortly after the name — a real declaration is always
# "Function Foo(" / "Event Foo(", even with zero params ("Foo()"). Defense in
# depth alongside the bullet-depth fix above, in case some other formatting
# quirk produces a "- Event <word>" line that isn't a real declaration.
#
# Optional non-capturing return-type token before Function/Event: this wiki's
# convention for a non-void function is "- <ReturnType> Function Name(...)"
# ("- int Function GetFormID()", "- string Function GetName()"), vs. a void
# function's "- Function Name(...)" with no type prefix at all. The original
# pattern only matched the void form — confirmed empirically (2026-08-13) via
# a corpus-wide eval: EVERY Get*/Has*/Is*-style function across every
# multi-function class page (actor-script.jsonl, form-script.jsonl, etc.) —
# 0 of 149 non-parent chunks in actor-script.jsonl — silently fell through to
# the page's large diluted parent block instead of getting its own precise,
# rankable chunk. Void functions (Set*, Add*, Start*, ...) were unaffected and
# already had sharp chunks, which is why this went unnoticed until retrieval
# was actually measured at scale rather than assumed correct from the void
# cases working. [\w\[\]]+ covers simple types and array-of-type return
# values (ObjectReference[], Form[], ...); Papyrus has no multi-word types so
# no whitespace is needed inside the class.
FUNC_START_RE = re.compile(r'^- (?:[\w\[\]]+\s+)?(Function|Event|Global Function)\s+(\w+)\s*\(', re.M)
PARENT_MAX_CHARS = 3000
PARENT_GROUP_SIZE = 10  # functions per section-parent — see chunk_page docstring


def chunk_page(title: str, text: str) -> tuple[list[dict], list[dict]]:
    """
    Split page text into RAG-sized chunks.

    Script-reference pages (ObjectReference Script, Actor Script, etc.) list
    one function/event per bullet. Splitting one chunk per function is the
    right retrieval unit — sharp, unambiguous matches for "what's the
    signature of X" — but too tight on its own for "how do I use X", where
    the answer is often in shared context around that function rather than
    packed into its one bullet.

    So: each function chunk carries a `parent_id` pointing at a section
    parent — the page's intro (Definition/Properties, whatever precedes the
    function list) plus a cluster of PARENT_GROUP_SIZE consecutive functions'
    full text. The child stays the retrieval/ranking unit; the caller expands
    to the parent only when assembling generation context, not when ranking.

    Grouped by position rather than one parent per whole page deliberately:
    a page like ObjectReference Script has ~200 functions, so a single
    "first 3000 chars" parent would only ever cover the first ~20 of them —
    useless for anything retrieved from function #150. Small pages end up
    with one group (fine); large pages get several, each relevant to the
    functions actually near it.

    Everything else (tutorials, concept pages) falls back to paragraph-window
    chunking capped at MAX_CHUNK_CHARS with no parent needed — those chunks
    are already self-contained at that size.

    IDs are identity-derived, not positional — a page's chunk ids must not
    shift just because the wiki inserted a function alphabetically earlier
    in the list, or a new page was ingested. A positional index (`chunk-0`,
    `chunk-1`, ...) would renumber everything downstream of an insertion,
    turning a one-function content change into a page-wide diff and
    defeating the point of page-scoped JSONL review. So: function chunks key
    on the function name itself (the actual stable identity — content edits
    to that function are still "the same function", correctly a content-only
    diff); paragraph-fallback chunks (no natural name) key on a hash of their
    own text, which only changes when that specific chunk's content does.

    Returns (child_entries, parent_entries) — parent_entries may be empty.
    """
    matches = list(FUNC_START_RE.finditer(text))
    if len(matches) >= 3:
        header = text[:matches[0].start()].strip()  # Definition/Properties/intro before the function list
        entries = []
        group_blocks: dict[int, list[str]] = {}
        seen_ids: set[str] = set()
        for i, m in enumerate(matches):
            start = m.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            block = text[start:end].strip()
            if not block:
                continue
            func_name = m.group(2)
            group_idx = i // PARENT_GROUP_SIZE
            parent_id = f"ckwiki-{_slug(title)}-parent-{group_idx}"
            chunk_id = f"ckwiki-{_slug(title)}-{_slug(func_name)}"
            if chunk_id in seen_ids:
                # Defensive: two entries slugging to the same id on one page (e.g. an
                # overload) — disambiguate with a short content hash rather than silently
                # colliding (which would make the second entry overwrite the first).
                chunk_id = f"{chunk_id}-{content_hash(block)[:6]}"
            seen_ids.add(chunk_id)
            entries.append({
                "id": chunk_id,
                "title": f"{title} — {func_name}",
                "content": block[:MAX_CHUNK_CHARS],
                "tags": [_slug(title), func_name.lower(), "papyrus-function"],
                "parent_id": parent_id,
            })
            group_blocks.setdefault(group_idx, []).append(block)

        parents = []
        for group_idx, blocks in group_blocks.items():
            content = "\n\n".join(blocks)
            if group_idx == 0 and header:
                content = header + "\n\n" + content
            parents.append({
                "id": f"ckwiki-{_slug(title)}-parent-{group_idx}",
                "title": f"{title} (section {group_idx + 1})",
                "content": content[:PARENT_MAX_CHARS],
                "tags": [_slug(title), "page-parent"],
            })
        return entries, parents

    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    entries = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > MAX_CHUNK_CHARS:
            entries.append({"id": f"ckwiki-{_slug(title)}-{content_hash(buf)[:10]}",
                             "title": title, "content": buf.strip(), "tags": [_slug(title)]})
            buf = ""
        buf += (("\n\n" if buf else "") + p)
    if buf.strip():
        entries.append({"id": f"ckwiki-{_slug(title)}-{content_hash(buf)[:10]}",
                         "title": title, "content": buf.strip(), "tags": [_slug(title)]})
    return entries, []


def _slug(title: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


# ═══════════════════════════════════════════════════════════════════════════════
# CHECKPOINT (resumability)
# ═══════════════════════════════════════════════════════════════════════════════

def load_checkpoint() -> dict:
    if CHECKPOINT_PATH.exists():
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    return {}


def save_checkpoint(cp: dict):
    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CHECKPOINT_PATH.write_text(json.dumps(cp, indent=2), encoding="utf-8")


# ═══════════════════════════════════════════════════════════════════════════════
# ATTRIBUTION (CC BY-SA 2.5 — see module docstring)
# ═══════════════════════════════════════════════════════════════════════════════

ATTRIBUTION_HEADER = f"""# Attribution — Creation Kit Wiki content

Content ingested from https://falloutck.uesp.net/ (the Fallout 4 Creation
Kit Wiki, maintained by UESP) is licensed under **{LICENSE}**
(Attribution-ShareAlike), confirmed via the wiki's own MediaWiki `rightsinfo`
declaration.

**What this means for anything built from it:** the {LICENSE} terms require
attributing each source article and providing access to it and its edit
history (satisfied below), AND require that a derivative work be distributed
under the same {LICENSE} terms. See [/LICENSING.md](../../LICENSING.md) at
the repo root for the full picture — short version: this content and
anything built from it (including the curated ChromaDB) is {LICENSE}, NOT
this repo's MIT license, and that can't be waived.

Every page ingested is listed below with its canonical URL, its edit-history
URL (for author attribution), and the revision it was ingested from. This
file is regenerated in full on every ingestion run from
`attribution_ck_wiki.json`, which accumulates across runs. Per-page JSONL
records with the same provenance live in `ck_wiki/*.jsonl` next to this file.

---

"""


def load_attribution() -> dict:
    if ATTRIBUTION_JSON_PATH.exists():
        return json.loads(ATTRIBUTION_JSON_PATH.read_text(encoding="utf-8"))
    return {}


def save_attribution(attribution: dict):
    ATTRIBUTION_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    ATTRIBUTION_JSON_PATH.write_text(json.dumps(attribution, indent=2, sort_keys=True), encoding="utf-8")

    lines = [ATTRIBUTION_HEADER]
    for title in sorted(attribution.keys()):
        entry = attribution[title]
        lines.append(f"- **{title}** — [article]({entry['source_url']}) · "
                      f"[history]({entry['history_url']}) · rev {entry['revision_id']} · "
                      f"ingested {entry['ingested_at'][:10]}")
    ATTRIBUTION_MD_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_page_jsonl(title: str, entries: list[dict], parents: list[dict], common_meta: dict) -> int:
    """
    Write one page's chunks as JSONL — the actual committed source of truth
    (see module docstring). One file per page so a PR touching one page's
    content is a self-contained, reviewable diff. build_knowledge_db.py reads
    these back to build the ChromaDB; nothing here computes an embedding.
    """
    CK_WIKI_JSONL_DIR.mkdir(parents=True, exist_ok=True)
    path = CK_WIKI_JSONL_DIR / f"{_slug(title)}.jsonl"
    records = []
    for e in entries:
        records.append({"id": e["id"], "title": e["title"], "content": e["content"],
                         "tags": e["tags"], "parent_id": e.get("parent_id", ""), **common_meta})
    for p in parents:
        records.append({"id": p["id"], "title": p["title"], "content": p["content"],
                         "tags": p["tags"], "parent_id": "", **common_meta})
    # Sort by id (not source iteration order) so an insertion elsewhere on the wiki
    # page doesn't reorder unrelated lines in the diff — only genuinely new/changed
    # records show up as changes.
    records.sort(key=lambda r: r["id"])
    lines = [json.dumps(r, ensure_ascii=False) for r in records]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# EMBEDDING + CHROMADB — used ONLY by --test-query, to read the local built
# collection (see build_knowledge_db.py). The ingest path above never embeds
# or writes to Chroma; it only writes committable JSONL.
# ═══════════════════════════════════════════════════════════════════════════════

def embed(texts: list[str]) -> list[list[float]]:
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        from knowledge_manifest import EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_REVISION
        _embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME, revision=EMBEDDING_MODEL_REVISION,
                                            cache_folder=MODELS_PATH)
    return _embed_model.encode(texts, normalize_embeddings=True).tolist()


def get_curated_collection():
    import chromadb
    Path(CHROMA_CURATED_PATH).mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_CURATED_PATH)
    return client.get_or_create_collection("mossy_knowledge", metadata={"hnsw:space": "cosine"})


# ═══════════════════════════════════════════════════════════════════════════════
# TEST QUERY (validate retrieval with only the embedding model loaded — no
# Gemma, no Flask, no LangGraph. Run this after a small real ingest, before
# scaling up to a larger one.)
# ═══════════════════════════════════════════════════════════════════════════════

def _safe_print(s: str):
    """
    Windows consoles often default to cp1252, which can't encode plenty of
    real content (bootstrap entries use → for workflow steps; wiki text has
    smart quotes/em-dashes) — print() then raises UnicodeEncodeError and
    kills the whole diagnostic mid-run. Fall back to a lossy-but-non-crashing
    encode rather than let a display quirk take down a query result.
    """
    try:
        print(s)
    except UnicodeEncodeError:
        enc = sys.stdout.encoding or "ascii"
        print(s.encode(enc, errors="replace").decode(enc))


def run_test_query(query: str, top_k: int = 5):
    coll = get_curated_collection()
    count = coll.count()
    if count == 0:
        log.error("Curated collection is empty — nothing to query. Run: "
                   "python ingest_ck_wiki.py --limit 25   then   python build_knowledge_db.py")
        return

    q_embed = embed([query])
    results = coll.query(query_embeddings=q_embed, n_results=min(top_k, count),
                          include=["documents", "metadatas", "distances"])
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    dists = results["distances"][0]

    _safe_print(f"\nQuery: {query!r}  ({count} documents in curated collection)\n" + "=" * 70)
    for rank, (doc, meta, dist) in enumerate(zip(docs, metas, dists), 1):
        _safe_print(f"\n[{rank}] score(distance)={dist:.4f}  {meta.get('title', '?')}")
        _safe_print(f"    source: {meta.get('source_url', '?')}  (license: {meta.get('license', '?')}, "
                     f"rev {meta.get('revision_id', '?')})")
        _safe_print(f"    chunk: {doc[:200]}{'...' if len(doc) > 200 else ''}")
        parent_id = meta.get("parent_id") or ""
        if parent_id:
            fetched = coll.get(ids=[parent_id], include=["documents"])
            parent_docs = fetched.get("documents") or []
            if parent_docs:
                _safe_print(f"    [parent {parent_id}, {len(parent_docs[0])} chars]: "
                             f"{parent_docs[0][:300]}{'...' if len(parent_docs[0]) > 300 else ''}")
    print()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--categories", default=",".join(DEFAULT_CATEGORIES),
                     help="Comma-separated wiki category names (no 'Category:' prefix).")
    ap.add_argument("--limit", type=int, default=300,
                     help="Max pages to process this run (default 300 — raise deliberately).")
    ap.add_argument("--sleep", type=float, default=0.5,
                     help="Seconds between page fetches (politeness delay).")
    ap.add_argument("--dry-run", action="store_true",
                     help="Fetch, convert, and chunk only — no JSONL writes.")
    ap.add_argument("--force", action="store_true",
                     help="Re-ingest pages even if the checkpoint says they're unchanged.")
    ap.add_argument("--test-query", default=None, metavar="QUERY",
                     help="Skip ingestion; query the curated collection directly and print results "
                          "with provenance and parent expansion. Only loads the embedding model.")
    ap.add_argument("--pages", default=None,
                     help="Comma-separated exact page titles to ingest, bypassing category listing "
                          "entirely. Use this to pick pages deliberately (e.g. specific function-reference "
                          "pages plus prose pages) instead of taking whatever a category returns first — "
                          "important for an initial small run meant to stress both chunking paths on "
                          "content you can actually judge.")
    args = ap.parse_args()

    if args.test_query:
        run_test_query(args.test_query)
        return

    checkpoint = {} if args.force else load_checkpoint()
    attribution = load_attribution()

    if args.pages:
        titles = [t.strip() for t in args.pages.split(",") if t.strip()][: args.limit]
        log.info("Explicit page list (%d): %s", len(titles), ", ".join(titles))
    else:
        categories = [c.strip() for c in args.categories.split(",") if c.strip()]
        log.info("Categories: %s", ", ".join(categories))
        all_titles: dict[str, None] = {}
        for cat in categories:
            try:
                cat_titles = fetch_category_members(cat)
            except requests.RequestException as e:
                log.error("Failed to list category %r: %s — skipping", cat, e)
                continue
            log.info("  Category:%s -> %d pages", cat, len(cat_titles))
            for t in cat_titles:
                all_titles[t] = None  # dict as ordered set, dedupes across overlapping categories
        titles = list(all_titles.keys())[: args.limit]
        log.info("Processing %d pages (deduped across categories, capped at --limit=%d)",
                  len(titles), args.limit)

    total_chunks = 0
    skipped_unchanged = 0
    failed = 0
    pages_written = 0

    for i, title in enumerate(titles, 1):
        page = fetch_page(title)
        if page is None:
            failed += 1
            continue
        wikitext, revid = page["wikitext"], page["revid"]

        h = content_hash(wikitext)
        if not args.force and checkpoint.get(title) == h:
            skipped_unchanged += 1
            continue

        text = wikitext_to_text(wikitext)
        entries, parents = chunk_page(title, text)

        if args.dry_run:
            log.info("[%d/%d] %r (rev %s) -> %d chunks + %d parents (preview: %.100s...)",
                      i, len(titles), title, revid, len(entries), len(parents),
                      entries[0]["content"] if entries else "")
        else:
            source_url, history_url = page_urls(title)
            ts = datetime.now(timezone.utc).isoformat()
            common_meta = {
                "category": "ck-wiki",
                "source": "ck_wiki_ingest",
                "source_url": source_url,
                "history_url": history_url,
                "revision_id": revid or 0,
                "license": LICENSE,
                "ingested_at": ts,
                # Derived per PAGE, not per chunk — see skill_tags.py. Every chunk from this
                # page (children + parents) inherits the same tags. Feeds the learner model's
                # exposure tracking in gemma_service_enhanced.py.
                "skill_tags": ",".join(tags_for_page(title)),
            }
            written = write_page_jsonl(title, entries, parents, common_meta)
            pages_written += 1
            total_chunks += len(entries)
            checkpoint[title] = h
            attribution[title] = {
                "source_url": source_url,
                "history_url": history_url,
                "revision_id": revid or 0,
                "license": LICENSE,
                "ingested_at": ts,
                "jsonl_records": written,
            }
            if i % 20 == 0:
                save_checkpoint(checkpoint)  # periodic save so a long run can be interrupted safely
                save_attribution(attribution)
                log.info("[%d/%d] progress checkpoint saved (%d pages written so far)", i, len(titles), pages_written)

        time.sleep(args.sleep)

    if not args.dry_run:
        save_checkpoint(checkpoint)
        save_attribution(attribution)

    log.info("=" * 60)
    log.info("Done. pages_processed=%d chunks_written=%d skipped_unchanged=%d failed=%d",
              len(titles) - skipped_unchanged - failed, total_chunks, skipped_unchanged, failed)
    if not args.dry_run:
        log.info("JSONL written under: %s (%d pages)", CK_WIKI_JSONL_DIR, pages_written)
        log.info("Attribution: %s (%d pages total)", ATTRIBUTION_MD_PATH, len(attribution))
        log.info("Next: python build_knowledge_db.py   (builds the local ChromaDB from this JSONL)")
        log.info("Then: python ingest_ck_wiki.py --test-query \"<something you'd actually ask Mossy>\"")
    log.info("Re-run with a higher --limit to continue past this run's cap, or --force to "
             "re-ingest changed pages the checkpoint is skipping.")


if __name__ == "__main__":
    main()
