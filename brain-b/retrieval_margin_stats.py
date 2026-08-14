#!/usr/bin/env python3
"""
retrieval_margin_stats.py — is the hedge/confident boundary a real gap, or noise?

Every /infer turn now logs its agreement/bm25_margin/tier to retrieval_log
(see gemma_service_enhanced.py's schema + log_retrieval, called unconditionally
right after classify_retrieval() — unlike learner_signals, which only gets a
row when a signal string happens to be produced). Written now, same reasoning
as coverage_gaps.py: nothing to act on until Brain B has real usage, so build
the tool while the logging connection is fresh instead of retroactively once
there's finally enough data to want to look at.

What this can and can't tell you: retrieval_tuning.py's CONFIDENT_BM25_MARGIN_MIN
(8.0) was chosen from a 20-query eval where the highest known WRONG match
scored 6.359 and the lowest known GENUINE hit scored 7.610 — a real but
narrow (~1.25-wide) gap that 20 queries wasn't enough to stress-test. This
script shows the margin DISTRIBUTION from real usage, split by tier — it
does NOT know whether any individual hedge/confident call was actually
right, because there's no user-feedback signal wired up yet. What it CAN
show: whether real traffic's margins land in a similar shape to the eval
(most mass well clear of the 6-8 boundary band) or whether a meaningful
fraction land right in the ambiguous zone, which is itself the answer to
"is 20 queries representative" even without ground truth on correctness.

Usage:
    python retrieval_margin_stats.py                # last 90 days
    python retrieval_margin_stats.py --days 14
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(os.environ.get("MOSSY_BASE_DIR", r"D:\Mossy-AI"))
DB_PATH = BASE_DIR / "data" / "mossy_brain.db"

# The known-narrow gap from the 20-query eval — see retrieval_tuning.py.
KNOWN_WRONG_MATCH_MARGIN = 6.359
KNOWN_GENUINE_HIT_FLOOR = 7.610
BOUNDARY_BAND = (5.0, 9.0)  # wider than the two constants above, deliberately —
                             # this is "close enough to the decision to matter",
                             # not just the exact known gap


def load_rows(days: int) -> list[tuple[str, int, float | None, str]]:
    if not DB_PATH.exists():
        return []
    conn = sqlite3.connect(str(DB_PATH))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        rows = conn.execute(
            "SELECT ts, agreement, bm25_margin, tier FROM retrieval_log WHERE ts >= ? ORDER BY ts",
            (cutoff,),
        ).fetchall()
    except sqlite3.OperationalError:
        # retrieval_log is created by init_db() on server startup — an existing
        # DB file from before this table existed won't have it until Brain B
        # actually runs again, not just on import.
        rows = []
    conn.close()
    return rows


def stats(values: list[float]) -> str:
    if not values:
        return "(none)"
    values = sorted(values)
    n = len(values)
    median = values[n // 2] if n % 2 else (values[n // 2 - 1] + values[n // 2]) / 2
    return f"n={n} min={values[0]:.2f} median={median:.2f} max={values[-1]:.2f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=90, help="Look-back window (default 90 days).")
    args = ap.parse_args()

    rows = load_rows(args.days)
    if not rows:
        print(f"No retrieval_log rows in the last {args.days} days.")
        print("Nothing to act on yet — this fills in once /infer has run for real with users asking things.")
        return

    print(f"{len(rows)} logged /infer turn(s) in the last {args.days} days")
    print("=" * 70)

    by_tier: dict[str, list[float]] = {"abstain": [], "hedge": [], "confident": []}
    margins_all: list[float] = []
    in_boundary_band = 0
    for _ts, _agreement, margin, tier in rows:
        if margin is not None:
            by_tier.setdefault(tier, []).append(margin)
            margins_all.append(margin)
            if BOUNDARY_BAND[0] <= margin <= BOUNDARY_BAND[1]:
                in_boundary_band += 1

    for tier in ("abstain", "hedge", "confident"):
        print(f"\n{tier:10s} tier: {stats(by_tier.get(tier, []))}")

    if margins_all:
        pct = 100 * in_boundary_band / len(margins_all)
        print(f"\nTurns with bm25_margin in [{BOUNDARY_BAND[0]}, {BOUNDARY_BAND[1]}] "
              f"(near the hedge/confident boundary): {in_boundary_band}/{len(margins_all)} ({pct:.1f}%)")
        if pct > 15:
            print("  -> A meaningful share of real traffic sits near the boundary — the 20-query")
            print("     eval was probably not representative of how load-bearing this line is.")
            print("     Worth spot-checking some of these turns by hand for actual correctness,")
            print("     not just re-trusting the tier the threshold already assigned them.")
        else:
            print("  -> Most real traffic sits well clear of the boundary, consistent with the eval.")
            print("     Doesn't prove the threshold is right — just that it's rarely the deciding")
            print("     factor in practice so far.")

    hedge_max = max(by_tier.get("hedge", []), default=None)
    confident_min = min(by_tier.get("confident", []), default=None)
    if hedge_max is not None and confident_min is not None:
        print(f"\nHighest hedge-tier margin seen: {hedge_max:.3f} "
              f"(known worst wrong match from the eval: {KNOWN_WRONG_MATCH_MARGIN})")
        print(f"Lowest confident-tier margin seen: {confident_min:.3f} "
              f"(known lowest genuine hit from the eval: {KNOWN_GENUINE_HIT_FLOOR})")
        print("These are tautological by construction (the tier IS decided by the threshold) —")
        print("what matters is whether real volume clusters densely right at these edges (bad")
        print("sign: means the boundary is a coin flip for a lot of real traffic) or sparsely")
        print("(means most turns aren't actually close calls, whatever tier they land in).")


if __name__ == "__main__":
    main()
