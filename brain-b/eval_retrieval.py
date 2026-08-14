#!/usr/bin/env python3
"""
eval_retrieval.py — retrieval/abstention eval, run against the dev ChromaDB.
Kept in the repo (and its output kept as eval_queries_result.json)
specifically so this never has to be reconstructed from a lost chat scrollback
again — see the "runs" list in the result file for the history of what
changed between eval passes and why.

Grown 5 -> 15 (2026-08-13) -> 20 (2026-08-14) queries so threshold/signal
decisions have more than a handful of data points behind them — see
MIN_RETRIEVAL_AGREEMENT's history for how the original 5-query, 8-page eval's
result (threshold=2) didn't survive a 25x corpus increase unexamined, and
retrieval_tuning.py's docstring for how HEDGE_BM25_MARGIN_MIN alone (a single
line reused for both "enters hedge" and "is confident") left a real wrong
match only 0.36 above the line after the 15-query pass — not a validated
margin of safety, just where one small sample happened to land.

Query categories, matching gemma_service_enhanced.py's actual abstention
mechanism:

  - Precision/collision — GetName is documented on its own dedicated page
    (getname-form.jsonl) AND (after the FUNC_START_RE fix) as its own chunk
    within Form's class-overview page. Does either surface, or does a short/
    generic chunk lose to noisier neighbors in a large corpus?
  - Deliberate out-of-domain misses (3 flavors: unrelated real-world topic,
    a plausible-SOUNDING but nonexistent Papyrus function, a second unrelated
    real-world topic) — correct behavior is agreement < threshold (abstain)
    in every case, not just the easy one.
  - Synonym precision — "make an object disappear" should resolve to
    Disable/Enable-ObjectReference (the actual FO4 terms of art), testing
    whether retrieval bridges natural phrasing to domain vocabulary.
  - In-domain queries spanning many different function classes (Actor,
    ObjectReference, Quest, Location, Faction, Weather, GlobalVariable, Game,
    ObjectMod) — breadth check that agreement holds broadly, not just for
    cherry-picked cases from one class.

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
    ("deliberate_miss_food", "What's the healthiest way to cook salmon?"),
    ("in_domain_wait", "How do I make a script wait for a specific amount of time before continuing?"),
    ("in_domain_combat", "How do I check if an actor is currently in combat?"),
    ("in_domain_inventory", "How do I detect when a container's inventory changes in Papyrus?"),
    ("in_domain_quest_stage", "How do I check if a specific quest stage has already been completed?"),
    ("in_domain_location_cleared", "How do I check if a location has already been cleared by the player?"),
    ("in_domain_faction_bounty", "How do I find out how much bounty gold a faction has on the player?"),
    ("in_domain_weather", "How do I get the current sky mode of a weather record?"),
    ("in_domain_globalvariable", "How do I read the current value of a global variable in Papyrus?"),
    ("in_domain_player_level", "How do I find out what level the player character is?"),
    ("deliberate_miss_fake_function", "How do I use the Actor.TeleportToMoon() function?"),
    ("deliberate_miss_geography", "What's the capital of Australia?"),
    ("synonym_precision_disable", "How do I make an object disappear from the game world without deleting it?"),
    ("in_domain_objectmod_priority", "How do I get the priority value of an object mod?"),
    ("in_domain_perk_rank", "How do I check how many ranks of a perk an actor has?"),
    ("in_domain_message_display", "How do I show a message box to the player from Papyrus?"),
    ("in_domain_actor_damage", "How do I damage an actor's health from a script?"),
    ("deliberate_miss_history", "Who was the first president of the United States?"),
    ("synonym_precision_teleport", "How do I move an object to a different location instantly?"),
]

PROBE_K = 30
TOP_K = 6

results = []
for name, q in QUERIES:
    probe, diag = svc.hybrid_retrieve(q, top_k=TOP_K, probe_k=PROBE_K, return_diagnostics=True)
    agreement = sum(1 for r in probe if r["source"] == "vector+bm25")

    sem_dists = diag["sem_dists"]
    bm25_scores = diag["bm25_scores"]
    vector_margin = (sem_dists[-1] - sem_dists[0]) if len(sem_dists) >= 2 else None
    bm25_margin = (bm25_scores[0] - bm25_scores[-1]) if len(bm25_scores) >= 2 else None
    tier = svc.classify_retrieval(agreement, bm25_margin)

    top6_ids = [r["id"] for r in probe[:TOP_K]]
    in_probe_window = [r["id"] for r in probe]

    results.append({
        "name": name, "query": q, "agreement": agreement,
        "tier": tier, "abstained": tier == "abstain", "hedged": tier == "hedge",
        "vector_margin": vector_margin, "bm25_margin": bm25_margin,
        "top6": top6_ids,
    })

    is_miss = "miss" in name
    flag = "  <<< FALSE POSITIVE" if (is_miss and tier == "confident") else ""
    print(f"\n=== {name} ===")
    print(f"Q: {q}")
    print(f"agreement={agreement} bm25_margin={bm25_margin} -> {tier.upper()}{flag}")
    for r in probe[:6]:
        print(f"  [{r['source']:>12}] {r['id']}")
    if name == "precision_collision":
        found_in_probe = "ckwiki-getname-form-9325737565" in in_probe_window
        print(f"getname-form present anywhere in probe_k={PROBE_K} window: {found_in_probe}")
        results[-1]["target_doc_in_probe_window"] = found_in_probe

curated_count = svc.get_curated_collection().count()

result_path = r"D:\Projects\desktop-tutorial\brain-b\eval_queries_result.json"
run_entry = {
    "run_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "corpus_docs": curated_count,
    "probe_k": PROBE_K, "top_k": TOP_K,
    "note": "20 queries (grown from 15). classify_retrieval() now has two "
            "separate bm25_margin thresholds (hedge floor 6.0, confident bar "
            "8.0) instead of one shared line — see retrieval_tuning.py.",
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
