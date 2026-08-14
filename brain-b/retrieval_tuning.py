#!/usr/bin/env python3
"""
retrieval_tuning.py — the ONE editable copy of Brain B's retrieval/abstention
tuning constants and decision logic.

Both gemma_service_enhanced.py (dev, GPU, sentence-transformers) and
brain-b/nexus/brain_b_slim.py (shipped, CPU, fastembed) need this — but they
can't share hybrid_retrieve() itself (it closes over each file's own
embed()/get_curated_collection()/BM25-index globals, which genuinely differ
per embedder). What they CAN and must share is the pure decision boundary:
given the numbers hybrid_retrieve() already produced, what does the service
do about it. That boundary drifting silently between the two files is
exactly what happened on 2026-08-13/14 — a real fix (probe_k=30) landed in
gemma_service_enhanced.py and never reached brain_b_slim.py, which shipped
the unfixed version in a real GitHub Release for a full day before anyone
noticed. See feedback_forked_files_diverge_silently in project memory.

brain_b_slim.py is PyInstaller-compiled and lives one directory below this
file, so it can't `import retrieval_tuning` directly at its normal location.
build_nexus_package.py copies this file into brain-b/nexus/ fresh on every
build (see its step 0) — that copy is a build artifact, gitignored, never
hand-edited. There is exactly one place to change these values; every build
picks up whatever this file currently says.

Design note on classify_retrieval(): re-run 2026-08-14 against the shipped
2025-doc corpus (15 queries, brain-b/eval_retrieval.py /
eval_shipped_result.json) found MIN_RETRIEVAL_AGREEMENT=2 alone no longer
separates real hits from misses — 2 of 3 deliberate out-of-domain misses,
including a plausible-sounding but nonexistent function name, cleared
agreement>=2 and would have been answered with full confidence. A binary
abstain/confident split forces a threshold to guess in exactly the cases
it's least equipped to call correctly. classify_retrieval() adds a third
"hedge" tier instead: still answer, but lead with an explicit "I don't have
documentation directly covering this — the closest I have is X" framing and
front-loaded citations, which is honest precisely where a hard threshold
has to guess. bm25_margin (rank-1-vs-tail score gap within BM25 alone) is
the discriminating signal — vector_margin was checked and dropped: the two
worst false positives (fake_function 0.077, geography 0.034) sit inside the
SAME range as genuine hits (0.060-0.186) on that axis, no separation at all.

Two separate bm25_margin thresholds, not one, after a first pass that used
a single 6.0 line for both "enters hedge at all" and "is confident" and
left a wrong match (synonym_precision_disable, margin 6.359) sitting only
0.36 above that line — not a real separation, just where one 15-query
sample happened to land. HEDGE_BM25_MARGIN_MIN=6.0 stays as the floor for
entering hedge (real gap: 4.406 for the worst false positive vs. 5.593 for
the weakest genuine hit). CONFIDENT_BM25_MARGIN_MIN=8.0 is a second, higher
bar for full confidence — genuine in-domain hits in that eval run actually
started at 7.610 (combat), not comfortably above 10, and ran fairly
continuously up to 23.364 with no other real gap in the middle; 8.0 clears
the known wrong match with real margin (1.64) at the cost of one additional
genuine hit (combat, 7.610) getting an unnecessary-but-harmless hedge
instead of full confidence — a fair trade since a hedged answer still
answers, just with softer framing and the same correct citation. Neither
threshold is validated past ~15 data points; the eval set is being grown
to reduce how much either one is riding on a small sample — see
eval_retrieval.py's run history for the current count. Revisit both
together, with more data, not in isolation — see MIN_RETRIEVAL_AGREEMENT's
own history for why that matters.
"""

from __future__ import annotations

from typing import Literal

PROBE_K = 30
TOP_K = 6

# Below this: hard abstain — even the hedge framing would have nothing
# credible to point at.
MIN_RETRIEVAL_AGREEMENT = 2

# BM25 margin at/above which a match is treated as worth answering with at
# all (hedge floor). See module docstring for where this number came from.
HEDGE_BM25_MARGIN_MIN = 6.0

# BM25 margin at/above which a match is treated as strong enough for FULL
# confidence, once agreement also clears MIN_RETRIEVAL_AGREEMENT. Separate
# from HEDGE_BM25_MARGIN_MIN on purpose — see module docstring for why one
# shared line left a known wrong match with no real safety margin.
CONFIDENT_BM25_MARGIN_MIN = 8.0


def classify_retrieval(agreement: int, bm25_margin: float | None) -> Literal["abstain", "hedge", "confident"]:
    """
    Pure function — no I/O, no embedder-specific state — so both files can
    share the actual decision, not just the input numbers.

    agreement: count of top-PROBE_K results found by BOTH vector and BM25.
    bm25_margin: BM25's own rank-1-vs-tail score gap (None if BM25 had fewer
        than 2 scored candidates — treated as "can't confirm strong", not as
        automatically weak or strong).
    """
    hedge_worthy = bm25_margin is not None and bm25_margin >= HEDGE_BM25_MARGIN_MIN
    confident_worthy = bm25_margin is not None and bm25_margin >= CONFIDENT_BM25_MARGIN_MIN
    if agreement >= MIN_RETRIEVAL_AGREEMENT and confident_worthy:
        return "confident"
    if agreement >= 1 or hedge_worthy:
        return "hedge"
    return "abstain"
