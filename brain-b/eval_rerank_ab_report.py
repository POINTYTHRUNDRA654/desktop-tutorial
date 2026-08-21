#!/usr/bin/env python3
"""
eval_rerank_ab_report.py — diffs the two most recent eval_retrieval.py runs
in eval_queries_result.json (expected: one baseline run, one --reranker run)
and reports real before/after numbers. Not "reranked results look
reasonable" — per-query tier shifts, top6 overlap, and the specific
precision_collision rank check, so the keep/drop call in Step 4 is made on
actual data.

Usage: python eval_rerank_ab_report.py
Assumes the most recent run has use_reranker=True and the one immediately
before it has use_reranker=False (i.e. run eval_retrieval.py, then
eval_retrieval.py --reranker, then this).
"""
import json

RESULT_PATH = r"D:\Projects\desktop-tutorial\brain-b\eval_queries_result.json"

with open(RESULT_PATH, encoding="utf-8") as f:
    data = json.load(f)
runs = data["runs"]

reranked_run = None
baseline_run = None
for run in reversed(runs):
    if run.get("use_reranker") and reranked_run is None:
        reranked_run = run
    elif not run.get("use_reranker") and reranked_run is not None and baseline_run is None:
        baseline_run = run
    if reranked_run and baseline_run:
        break

if reranked_run is None or baseline_run is None:
    raise SystemExit(
        "Need one baseline run (use_reranker=False/absent) and one --reranker run "
        "in eval_queries_result.json. Run: python eval_retrieval.py  &&  "
        "python eval_retrieval.py --reranker"
    )

print(f"Baseline run:  {baseline_run['run_at']}  (probe_k={baseline_run['probe_k']} top_k={baseline_run['top_k']})")
print(f"Reranked run:  {reranked_run['run_at']}  (probe_k={reranked_run['probe_k']} top_k={reranked_run['top_k']})")
print()

base_by_name = {r["name"]: r for r in baseline_run["results"]}
rer_by_name = {r["name"]: r for r in reranked_run["results"]}

tier_shifts = []
top6_changes = []
false_positive_introduced = []
false_positive_fixed = []
regressions_confident_to_worse = []

for name, base in base_by_name.items():
    rer = rer_by_name.get(name)
    if rer is None:
        continue

    is_miss = "miss" in name
    base_tier, rer_tier = base["tier"], rer["tier"]

    if base_tier != rer_tier:
        tier_shifts.append((name, base_tier, rer_tier))
        if is_miss and rer_tier == "confident" and base_tier != "confident":
            false_positive_introduced.append(name)
        if is_miss and base_tier == "confident" and rer_tier != "confident":
            false_positive_fixed.append(name)
        if not is_miss and base_tier == "confident" and rer_tier in ("hedge", "abstain"):
            regressions_confident_to_worse.append((name, base_tier, rer_tier))

    base_top6 = set(base["top6"])
    rer_top6 = set(rer["top6"])
    if base_top6 != rer_top6:
        overlap = len(base_top6 & rer_top6)
        top6_changes.append((name, overlap, len(base_top6), base["top6"], rer["top6"]))

print("=" * 70)
print("TIER SHIFTS (confident/hedge/abstain changed)")
print("=" * 70)
if not tier_shifts:
    print("  None — every query classified identically both ways.")
for name, b, r in tier_shifts:
    print(f"  {name}: {b} -> {r}")

print()
print("=" * 70)
print("FALSE POSITIVE CHECK (deliberate_miss queries answered as 'confident')")
print("=" * 70)
print(f"  Introduced by reranking: {false_positive_introduced or 'none'}")
print(f"  Fixed by reranking:      {false_positive_fixed or 'none'}")

print()
print("=" * 70)
print("REGRESSIONS (previously-confident in-domain queries downgraded)")
print("=" * 70)
if not regressions_confident_to_worse:
    print("  None.")
for name, b, r in regressions_confident_to_worse:
    print(f"  {name}: {b} -> {r}  <<< REGRESSION")

print()
print("=" * 70)
print("TOP-6 CONTENT CHANGES")
print("=" * 70)
if not top6_changes:
    print("  None — reranking produced the identical top-6 doc-id set for every query.")
for name, overlap, total, base_ids, rer_ids in top6_changes:
    print(f"  {name}: {overlap}/{total} overlap")
    print(f"    baseline: {base_ids}")
    print(f"    reranked: {rer_ids}")

print()
print("=" * 70)
print("PRECISION_COLLISION CASE (GetName-style near-identical function names)")
print("=" * 70)
base_pc = base_by_name.get("precision_collision")
rer_pc = rer_by_name.get("precision_collision")
if base_pc and rer_pc:
    target = "ckwiki-getname-form-9325737565"
    base_in_top6 = target in base_pc["top6"]
    rer_in_top6 = target in rer_pc["top6"]
    print(f"  Target doc: {target}")
    print(f"  In probe_k window (both conditions, per eval_retrieval.py's own check):")
    print(f"    baseline: {base_pc.get('target_doc_in_probe_window')}")
    print(f"    reranked: {rer_pc.get('target_doc_in_probe_window')}")
    print(f"  In actual top-6 (what reaches the prompt):")
    print(f"    baseline: {base_in_top6}")
    print(f"    reranked: {rer_in_top6}")
    if base_in_top6 == rer_in_top6:
        print(f"  -> No change in whether the target doc reaches the prompt.")
    elif rer_in_top6 and not base_in_top6:
        print(f"  -> IMPROVED: reranking surfaced the target doc into top-6 where RRF alone didn't.")
    else:
        print(f"  -> REGRESSED: reranking pushed the target doc OUT of top-6.")
    print(f"  baseline top6: {base_pc['top6']}")
    print(f"  reranked top6: {rer_pc['top6']}")

print()
print("=" * 70)
print("SUMMARY")
print("=" * 70)
n_queries = len(base_by_name)
n_tier_shifts = len(tier_shifts)
n_top6_changes = len(top6_changes)
print(f"  {n_queries} queries compared.")
print(f"  {n_tier_shifts} tier classification(s) changed.")
print(f"  {n_top6_changes} query(ies) had a different top-6 doc-id set.")
print(f"  {len(false_positive_introduced)} new false positive(s) introduced.")
print(f"  {len(false_positive_fixed)} false positive(s) fixed.")
print(f"  {len(regressions_confident_to_worse)} confident->worse regression(s) on in-domain queries.")
