#!/usr/bin/env python3
"""
eval_retrieval.py — 5-query retrieval/abstention eval, run against the dev
ChromaDB. Kept in the repo (and its output kept as eval_queries_result.json)
specifically so this never has to be reconstructed from a lost chat scrollback
again — see the "runs" list in the result file for the history of what
changed between eval passes and why.

Tests, matching gemma_service_enhanced.py's actual abstention mechanism:

  1. Precision/collision test — GetName is documented on its own dedicated
     page (getname-form.jsonl) AND mentioned as one line among ~50 sibling
     functions in Form's class-overview page (form-script.jsonl). Does the
     dedicated page rank first, or even appear in the probe window at all?
  2. Deliberate out-of-domain miss — a question with zero legitimate overlap
     with FO4/Papyrus/CK modding. Correct behavior is agreement < threshold
     (abstain).
  3-5. Genuine in-domain queries spanning different function classes, to
     confirm agreement holds broadly, not just for cherry-picked cases.

Computes two signals per query:
  - agreement: count of docs found by BOTH vector and BM25 within the probe
    window (probe_k). This is what actually gates /infer's abstention.
  - margin: rank-1-vs-tail score gap within EACH retriever individually
    (vector margin = tail_distance - top_distance, larger = more separated;
    bm25 margin = top_score - tail_score, larger = more separated). Measured
    here as a candidate second signal, NOT wired into any gating decision —
    see MIN_RETRIEVAL_AGREEMENT's comment for why agreement alone stopped
    being sufficient once the corpus grew.

Run history is intentionally accumulated in eval_queries_result.json's "runs"
list rather than overwritten, so degradation/improvement across corpus growth
and mechanism changes stays visible.
"""
import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, r"D:\Projects\desktop-tutorial\brain-b")
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import gemma_service_enhanced as svc

QUERIES = [
    ("precision_collision", "How do I get the name of an actor or object in Papyrus?"),
    ("deliberate_miss", "What's the healthiest way to cook salmon?"),
    ("in_domain_wait", "How do I make a script wait for a specific amount of time before continuing?"),
    ("in_domain_combat", "How do I check if an actor is currently in combat?"),
    ("in_domain_inventory", "How do I detect when a container's inventory changes in Papyrus?"),
]

PROBE_K = 30
TOP_K = 6

results = []
for name, q in QUERIES:
    probe, diag = svc.hybrid_retrieve(q, top_k=TOP_K, probe_k=PROBE_K, return_diagnostics=True)
    agreement = sum(1 for r in probe if r["source"] == "vector+bm25")
    abstain = agreement < svc.MIN_RETRIEVAL_AGREEMENT

    sem_dists = diag["sem_dists"]
    bm25_scores = diag["bm25_scores"]
    vector_margin = (sem_dists[-1] - sem_dists[0]) if len(sem_dists) >= 2 else None
    bm25_margin = (bm25_scores[0] - bm25_scores[-1]) if len(bm25_scores) >= 2 else None

    top6_ids = [r["id"] for r in probe[:TOP_K]]
    in_probe_window = [r["id"] for r in probe]

    results.append({
        "name": name, "query": q, "agreement": agreement,
        "abstained": abstain,
        "vector_margin": vector_margin, "bm25_margin": bm25_margin,
        "top6": top6_ids,
    })

    print(f"\n=== {name} ===")
    print(f"Q: {q}")
    print(f"agreement={agreement} (threshold={svc.MIN_RETRIEVAL_AGREEMENT}, probe_k={PROBE_K}) -> "
          f"{'ABSTAIN' if abstain else 'ANSWER'}")
    print(f"vector_margin={vector_margin}, bm25_margin={bm25_margin}")
    for r in probe[:6]:
        print(f"  [{r['source']:>12}] {r['id']}")
    if name == "precision_collision":
        found_in_probe = "ckwiki-getname-form-9325737565" in in_probe_window
        print(f"getname-form present anywhere in probe_k={PROBE_K} window: {found_in_probe}")
        results[-1]["target_doc_in_probe_window"] = found_in_probe

result_path = r"D:\Projects\desktop-tutorial\brain-b\eval_queries_result.json"
run_entry = {
    "run_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "corpus_pages": 616, "corpus_docs": 1445,
    "probe_k": PROBE_K, "top_k": TOP_K,
    "note": "Widened probe_k (was implicitly 6, same as top_k) to decouple "
            "'what goes in the prompt' from 'does an answer exist'. Margin "
            "computed as a candidate second signal, not yet gating.",
    "results": results,
}

if os.path.exists(result_path):
    with open(result_path, encoding="utf-8") as f:
        existing = json.load(f)
    if "runs" in existing:
        runs = existing["runs"]
    else:
        # Prior format was a single flat run — migrate it into "runs" as run 1.
        existing["note"] = "First run: top_k=6 used as the probe width too (the bug this eval found)."
        runs = [existing]
else:
    runs = []

runs.append(run_entry)
with open(result_path, "w", encoding="utf-8") as f:
    json.dump({"runs": runs}, f, indent=2)
print(f"\nWrote {result_path} ({len(runs)} run(s) recorded)")
