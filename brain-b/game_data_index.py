"""
game_data_index.py — BM25 index over scanned Fallout 4 game data.

Phase 1 of the game-data/Brain-B merge project (see
docs-dev/GAME_DATA_RETRIEVAL_MERGE_PROJECT.md for the full background):
Papyrus API signatures only. Vanilla form graph, asset graph, and world
strings are real, substantial datasets already sitting on disk in
userData/game-scan-cache/ (fo4_form_graph.json ~11MB, fo4_asset_graph.json
~9.8MB, fo4_world_strings.json ~30MB) but are NOT indexed here yet — that's
explicit follow-up work, not an oversight. Papyrus went first because it's
the smallest of the four (~2.4MB, 2,424 scripts / ~3,900 functions / ~3,800
events) and the collaborator's own worked example ("what does GetLinkedRef
do") is a Papyrus lookup.

Deliberately a SEPARATE index from brain_b_slim.py's curated/runtime
ChromaDB collections, not merged into that corpus, for two reasons that
apply to all four scan datasets, not just this one:

1. Identifiers aren't prose. Function/EditorID/FormID lookups are
   exact-match/BM25 territory — semantic embeddings are weak on identifiers
   specifically (see brain_b_slim.py's _tokenize() docstring for the concrete
   camelCase failure mode this was built to fix: SetAnimationVariableFloat
   as one opaque token has near-zero embedding overlap with a natural-
   language query, but decent BM25 overlap once split into constituent
   words). This module reuses that exact tokenizer.

2. Volume is a different order of magnitude. Papyrus alone is ~7,700
   searchable records (functions + events) against Brain B's current 2,025-
   document curated collection; the other three datasets are substantially
   larger still. Mixing them into one collection would swamp wiki retrieval
   on every query — separate indexes, queried only when
   classify_and_diagnose()'s game_data_related flag says a turn actually
   needs one, is the shape that scales.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Optional

import numpy as np
from rank_bm25 import BM25Okapi

log = logging.getLogger("game_data_index")

# Duplicated from brain_b_slim.py's _tokenize()/_split_identifier() rather
# than imported — this module is imported BY brain_b_slim.py (and by the dev
# fork's equivalent), so importing back from it would risk a circular import
# and would trigger that module's own Flask app setup as a side effect of
# just building an index. Two small pure functions; if the tokenizing
# behavior ever needs to change, check_parity.py's SHARED_FUNCTIONS list
# should gain an entry here too so drift between the two copies is caught,
# the same way it already catches drift between the two brain_b_slim forks.
_CAMEL_SPLIT_RE = re.compile(r'[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])')


def _split_identifier(word: str) -> list[str]:
    parts = _CAMEL_SPLIT_RE.findall(word)
    return [p.lower() for p in parts] if len(parts) > 1 else []


def _tokenize(text: str) -> list[str]:
    tokens = []
    for word in re.findall(r'[A-Za-z0-9]+', text):
        tokens.append(word.lower())
        tokens.extend(_split_identifier(word))
    return tokens


def load_papyrus_records(json_path: str | Path) -> list[dict]:
    """
    Flattens fo4_papyrus_api.json's {scriptName: {functions:[...], events:[...],
    properties:[...]}} shape into one searchable record per function/event —
    the granularity a "what does X do" question actually needs, not one giant
    per-script blob a BM25 query would have to compete against in its
    entirety.
    """
    path = Path(json_path)
    if not path.exists():
        log.warning("Papyrus API scan not found at %s — game-data search will return nothing.", path)
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scripts = data.get("scripts") or {}
    records: list[dict] = []
    for script_name, script in scripts.items():
        extends = script.get("extends") or ""
        for fn in script.get("functions") or []:
            name = fn.get("name") or ""
            params = fn.get("params") or ""
            returns = fn.get("returns") or "None"
            native = bool(fn.get("native"))
            text = f"{script_name} {name} function {returns} {name}({params})"
            records.append({
                "id": f"{script_name}.{name}",
                "kind": "function",
                "script": script_name,
                "extends": extends,
                "name": name,
                "params": params,
                "returns": returns,
                "native": native,
                "text": text,
                "display": f"{script_name}.{name}({params}) -> {returns}"
                           + (" [native]" if native else ""),
            })
        for ev in script.get("events") or []:
            name = ev.get("name") or ""
            params = ev.get("params") or ""
            text = f"{script_name} {name} event {name}({params})"
            records.append({
                "id": f"{script_name}.{name}",
                "kind": "event",
                "script": script_name,
                "extends": extends,
                "name": name,
                "params": params,
                "returns": None,
                "native": False,
                "text": text,
                "display": f"{script_name}.{name}({params}) [event]",
            })

    log.info("Loaded %d Papyrus records (%d scripts) from %s.", len(records), len(scripts), path)
    return records


class GameDataIndex:
    """Lazily-built BM25 index over one flattened record set. One instance
    per dataset (Papyrus today; form graph / asset graph / world strings are
    follow-up datasets that would each get their own instance, not a shared
    one — see this module's docstring on why volume argues against a single
    merged index)."""

    def __init__(self, loader, json_path: str | Path):
        self._loader = loader
        self._json_path = json_path
        self._records: Optional[list[dict]] = None
        self._bm25 = None

    def _ensure_built(self) -> None:
        if self._records is not None:
            return
        self._records = self._loader(self._json_path)
        if not self._records:
            self._bm25 = None
            return
        tokenized = [_tokenize(r["text"]) for r in self._records]
        self._bm25 = BM25Okapi(tokenized)

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        self._ensure_built()
        if not self._bm25 or not self._records:
            return []
        scores = self._bm25.get_scores(_tokenize(query))
        # argsort ascending, take the tail (highest scores), reverse to
        # descending — avoids numpy/rank_bm25 version differences in
        # get_top_n's own ranking helper by doing this the same explicit
        # way brain_b_slim.py's own hybrid_retrieve() already does it.
        top_idx = np.argsort(scores)[::-1][:top_k]
        return [self._records[i] for i in top_idx if scores[i] > 0]


_papyrus_index: Optional[GameDataIndex] = None


def search_papyrus(query: str, json_path: str | Path, top_k: int = 5) -> list[dict]:
    """Entry point brain_b_slim.py's /enrich calls when game_data_related is
    true. Builds the index on first call (lazy — most sessions never need
    it), reuses it after that."""
    global _papyrus_index
    if _papyrus_index is None:
        _papyrus_index = GameDataIndex(load_papyrus_records, json_path)
    return _papyrus_index.search(query, top_k)


def format_game_data_results(results: list[dict]) -> str:
    """Compact, LLM-readable block — deliberately NOT the full ~2.4MB source
    file, just the top matches for this turn's question."""
    if not results:
        return ""
    lines = ["GAME DATA — PAPYRUS API (live scan of this user's installed scripts, exact matches for this question):"]
    for r in results:
        lines.append(f"- {r['display']}" + (f" (extends {r['extends']})" if r.get("extends") else ""))
    return "\n".join(lines)
