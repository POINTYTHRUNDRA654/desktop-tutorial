#!/usr/bin/env python3
"""
coverage_gaps.py — what to ingest next, chosen by users, not by browsing categories

Every time /infer abstains (see gemma_service_enhanced.py's MIN_RETRIEVAL_AGREEMENT
gate), it logs a `learner_signal` row: "no documentation found for: <question>".
That's a direct record of a real question a real user asked that the knowledge
base couldn't answer — a far better ingestion-priority signal than picking wiki
categories by hand, because it's demand-driven rather than judgment-driven.

This script has nothing to act on until Brain B has actually been used with
abstention live — it reads learner_signals, which starts accumulating the
moment /infer runs for real. Written now, while the abstention/logging
connection is fresh, so the data is useful from the first row instead of
needing this tool built retroactively once there's finally enough of it to
want to look at.

Two views:
  - Exact-repeat frequency: the same question (normalized) asked more than
    once. Rare at low volume, but the strongest signal when it happens —
    multiple people hit the identical gap.
  - Keyword frequency: words that keep showing up across DIFFERENT abstained
    questions, even when no two are identical. This is the more useful view
    early on — five different phrasings all mentioning "worldspace" is a real
    signal an exact-match count would completely miss.

Usage:
    python coverage_gaps.py                    # both views, last 90 days
    python coverage_gaps.py --days 30
    python coverage_gaps.py --top 20
    python coverage_gaps.py --since-build       # only signals logged after the most
                                                  # recent knowledge_manifest.json build —
                                                  # i.e. gaps not yet addressed by ingestion
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
DB_PATH = BASE_DIR / "data" / "mossy_brain.db"
CHROMA_CURATED_PATH = os.environ.get("CHROMA_CURATED_PATH", str(BASE_DIR / "data" / "chroma_curated"))

ABSTAINED_PREFIX = "no documentation found for:"

# Not exhaustive — just enough to keep the keyword view from being dominated by
# function words. This corpus's real signal is domain nouns (worldspace, BA2,
# navmesh), not "the"/"how"/"do".
_STOPWORDS = frozenset("""
    the a an and or of to in on for with how do does did i you we they it is
    are was were be been being have has had can could would should will
    what when where why who which this that these those my your our their
    from as at by not no yes get set use using used make made new old
""".split())


def normalize(question: str) -> str:
    return re.sub(r'\s+', ' ', question.strip().lower())


def load_abstained_questions(days: int, since_build: bool) -> list[tuple[str, str]]:
    """Returns [(timestamp, question), ...] for abstained turns in the window."""
    if not DB_PATH.exists():
        return []
    conn = sqlite3.connect(str(DB_PATH))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT ts, question FROM learner_signals WHERE learner_signal LIKE ? AND ts >= ? ORDER BY ts DESC",
        (f"{ABSTAINED_PREFIX}%", cutoff),
    ).fetchall()
    conn.close()

    if since_build:
        from knowledge_manifest import load_manifest
        manifest = load_manifest(CHROMA_CURATED_PATH)
        build_ts = (manifest or {}).get("updated_at") or (manifest or {}).get("created_at")
        if build_ts:
            rows = [(ts, q) for ts, q in rows if ts >= build_ts]

    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=90, help="Look-back window (default 90 days).")
    ap.add_argument("--top", type=int, default=15, help="Rows to show per view (default 15).")
    ap.add_argument("--since-build", action="store_true",
                     help="Only count signals logged after the curated collection's last build — "
                          "gaps not yet possibly addressed by the most recent ingestion.")
    args = ap.parse_args()

    rows = load_abstained_questions(args.days, args.since_build)
    if not rows:
        print(f"No abstained questions logged in the last {args.days} days.")
        print("Nothing to act on yet — this fills in once /infer has run for real with users asking things.")
        return

    print(f"{len(rows)} abstained question(s) in the last {args.days} days")
    print("=" * 70)

    # ── Exact-repeat frequency ──
    exact_counts = Counter(normalize(q) for _, q in rows)
    repeats = [(q, c) for q, c in exact_counts.items() if c > 1]
    repeats.sort(key=lambda x: -x[1])
    print(f"\nExact-repeat questions (top {args.top}):")
    if repeats:
        for q, c in repeats[: args.top]:
            print(f"  {c:3d}x  {q}")
    else:
        print("  (none yet — expected at low volume; check keyword frequency below instead)")

    # ── Keyword frequency across all abstained questions ──
    word_counts: Counter[str] = Counter()
    word_examples: dict[str, str] = {}
    for _, q in rows:
        words = set(re.findall(r"[a-zA-Z][a-zA-Z0-9']+", q.lower()))
        for w in words:
            if w in _STOPWORDS or len(w) < 3:
                continue
            word_counts[w] += 1
            word_examples.setdefault(w, q)

    print(f"\nMost common words across abstained questions (top {args.top}):")
    for w, c in word_counts.most_common(args.top):
        print(f"  {c:3d}x  {w:20s}  e.g. {word_examples[w][:70]!r}")

    print()
    print("Next step: pick real wiki page titles covering the top keywords/repeats above, then:")
    print('  python ingest_ck_wiki.py --pages "Page One,Page Two,..."')
    print("  python build_knowledge_db.py")


if __name__ == "__main__":
    main()
