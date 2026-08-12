#!/usr/bin/env python3
"""
test_answer_level_diff.py — the check that decides whether the learner model works

Every other check this build passed was a plumbing check: does the field get
computed correctly, does it reach the prompt. None of them prove the model
actually *listens*. The failure mode that matters is answer_level being
computed correctly and changing nothing — decorative metadata, exactly like
diagnosis was before it got threaded into the prompt.

This sends the SAME question through the real /infer endpoint twice — once
with experience_level_override forced to "beginner", once to "intermediate"
— and prints both full answers side by side so you can read the diff
yourself. Requires the real model loaded (GPU, bitsandbytes 4-bit) — this is
deliberately NOT a mocked/prompt-capture test like the one already run
without a GPU; it's the one check that specifically requires generation to
actually happen.

What to look for: if the two answers are substantially the same content
just reworded, answer_level is decorative and needs a stronger prompt
instruction (or a different enforcement approach entirely) — the same fix
diagnosis needed. If beginner explains foundational terms/uses an analogy
and intermediate skips straight to the technical mechanism, it's working.

Usage:
    python test_answer_level_diff.py
    python test_answer_level_diff.py --question "how do I sort an array in papyrus"
    python test_answer_level_diff.py --no-langgraph   # faster, skips critique/refine loop
"""

from __future__ import annotations

import argparse
import sys

import gemma_service_enhanced as g

DEFAULT_QUESTION = "how do I sort an array in papyrus"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--question", default=DEFAULT_QUESTION)
    ap.add_argument("--no-langgraph", action="store_true", help="Use _simple_infer instead of the full LangGraph pipeline (faster).")
    args = ap.parse_args()

    use_langgraph = not args.no_langgraph
    print(f"Question: {args.question!r}")
    print(f"Pipeline: {'LangGraph (full, with critique)' if use_langgraph else 'simple (faster)'}")
    print("Loading model on first call — this is the slow part, be patient.\n")

    answers = {}
    for level in ("beginner", "intermediate"):
        print(f"--- generating for answer_level={level} ---")
        with g.app.test_client() as c:
            resp = c.post("/infer", json={
                "question": args.question,
                "use_langgraph": use_langgraph,
                "experience_level_override": level,
                "user_id": "test-answer-level-diff",
            })
            data = resp.get_json()
        if data is None or "error" in data:
            print(f"  FAILED: {data}")
            sys.exit(1)
        if data.get("abstained"):
            print("  Brain B abstained on this question — pick one with real coverage in the "
                  "ingested corpus (e.g. something about arrays, ObjectReference, or Actor Script).")
            sys.exit(1)
        answers[level] = data["answer"]
        print(f"  answer_level in response: {data.get('answer_level')} (confirms override took effect)\n")

    print("=" * 90)
    print("BEGINNER ANSWER:")
    print("=" * 90)
    print(answers["beginner"])
    print()
    print("=" * 90)
    print("INTERMEDIATE ANSWER:")
    print("=" * 90)
    print(answers["intermediate"])
    print()
    print("=" * 90)

    if answers["beginner"].strip() == answers["intermediate"].strip():
        print("IDENTICAL — answer_level is being ignored by generation. Decorative, not real.")
        print("Next step: strengthen _answer_level_prompt_fragment() or the model isn't reliably")
        print("following free-text instructions at this position in the prompt — may need the")
        print("instruction moved earlier/repeated, or a stronger imperative phrasing.")
    else:
        # Cheap length-based sanity signal, not a substitute for actually reading both —
        # a beginner answer with an analogy is typically longer than a terse intermediate one.
        len_beginner = len(answers["beginner"])
        len_intermediate = len(answers["intermediate"])
        print(f"DIFFERENT (beginner: {len_beginner} chars, intermediate: {len_intermediate} chars).")
        print("Read both above — length differing isn't proof of the RIGHT kind of difference,")
        print("just that something changed. Look for: does beginner explain foundational terms")
        print("or use an analogy? Does intermediate skip that and go straight to the mechanism?")


if __name__ == "__main__":
    main()
