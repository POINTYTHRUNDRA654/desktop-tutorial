#!/usr/bin/env python3
"""
reranker.py — standalone wrapper around nvidia/llama-nemotron-rerank-1b-v2

Step 1 of the reranker A/B task: pull, load, and expose a real reranking
function. Wired into hybrid_retrieve() (gemma_service_enhanced.py) behind
an opt-in `use_reranker` flag, default off — see that function's docstring
for the insertion point, and eval_retrieval.py --reranker /
eval_rerank_ab_report.py for the before/after comparison against the real
20-query eval set that decides whether the default flips.

Model choice and usage pattern are taken directly from NVIDIA's own
reference (github.com/NVIDIA-AI-Blueprints/nsight-copilot,
deploy/compose/MODEL-CARDS.md) rather than guessed: that repo serves this
model as a full NIM microservice (a multi-container stack assuming an
80GB+ H100 for the LLM alone, plus 24GB more for the small models sharing
a GPU) — not viable on this machine's 2x RTX 2070 (8GB each), and not what
was asked for. The underlying model card also documents a much simpler
direct-`transformers` path (no NIM/vLLM/Docker), confirmed to need only
`transformers>=4.44` — that's the path used here, matching brain-b's
existing `get_embed_model()` pattern (lazy singleton, sentence-transformers
for embeddings) rather than introducing a new serving stack.

Real, load-bearing detail from the model card, not obvious from the model
name: query/document pairs MUST be formatted as
``f"question:{query} \n \n passage:{document}"`` before tokenizing. The
model card's own vLLM section states plainly that skipping this "the
results will be incorrect" — this isn't a style choice, it's how the model
was fine-tuned to expect its input.

Revision pinned the same way knowledge_manifest.py pins the embedding
model, for the same reason (build reproducibility) — see
https://huggingface.co/api/models/nvidia/llama-nemotron-rerank-1b-v2
(checked 2026-08-21).

Real environment constraint, found the hard way — not a suggestion:
this model's trust_remote_code config class only loads correctly under
transformers==4.46.3 in this environment. transformers>=5.0 (confirmed on
both 5.5.0 and 5.15.1) raises `AttributeError: 'PreTrainedConfig' object
has no attribute 'max_position_embeddings'` inside transformers' own RoPE-
standardization code — a real incompatibility between this checkpoint's
custom config and newer transformers internals, not a bug in this file.
sentence-transformers>=5.0 in turn requires transformers>=5.0, so
get_embed_model() and this module cannot share an environment pinned to
transformers>=5.0 OR transformers==4.46.3 alone — the working combination
is `transformers==4.46.3` + `sentence-transformers<5.0` together (tested:
sentence-transformers==4.1.0). See brain-b/.venv-rerank for a working,
isolated environment built this way; do not `pip install
sentence-transformers` unpinned into it, or transformers silently
resolves back to 5.x and this breaks again.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

import torch

log = logging.getLogger(__name__)

RERANK_MODEL_NAME = "nvidia/llama-nemotron-rerank-1b-v2"
RERANK_MODEL_REVISION = "d896ceda696c5c6fe0abf65f63a77c691bbf4548"
RERANK_MAX_LENGTH = 512

_rerank_model = None
_rerank_tokenizer = None


@dataclass
class RerankedDoc:
    index: int          # original position in the input `documents` list
    score: float         # raw logit — higher is more relevant, no fixed range
    text: str


def _prompt_template(query: str, passage: str) -> str:
    """Exact format the model was fine-tuned on. Do not reorder/reformat —
    see this module's docstring: an unformatted pair silently produces
    wrong scores, not an error."""
    return f"question:{query} \n \n passage:{passage}"


def get_reranker_model():
    """Lazy singleton, mirrors gemma_service_enhanced.get_embed_model()'s
    shape. Device selection follows the same existing convention: prefer
    cuda:1 when a second GPU is present (keep cuda:0 free for the LLM's
    tight 8GB KV cache), otherwise whatever's available."""
    global _rerank_model, _rerank_tokenizer
    if _rerank_model is None:
        from transformers import AutoModelForSequenceClassification, PreTrainedTokenizerFast

        device = "cuda:1" if torch.cuda.device_count() > 1 else (
            "cuda:0" if torch.cuda.is_available() else "cpu"
        )

        # Not AutoTokenizer: the model's custom config class
        # (LlamaBidirectionalConfig, in its trust_remote_code source)
        # subclasses LlamaConfig but registers no custom tokenizer class or
        # AutoTokenizer mapping for the subclass — AutoTokenizer.from_pretrained
        # does an exact config-type lookup, not a subclass check, and raises
        # "Unrecognized configuration class" even though the tokenizer itself
        # is just a standard Llama fast tokenizer (confirmed: no custom
        # tokenizer code anywhere in the model's trust_remote_code file).
        # Loading the concrete class directly sidesteps that registry gap.
        # PreTrainedTokenizerFast, not LlamaTokenizerFast: the checkpoint's
        # own tokenizer_config.json declares itself as PreTrainedTokenizerFast
        # (confirmed by the mismatch warning transformers raised when this
        # was tried with LlamaTokenizerFast first — output was correct in
        # both cases, but this matches what the checkpoint actually says it is).
        _rerank_tokenizer = PreTrainedTokenizerFast.from_pretrained(
            RERANK_MODEL_NAME,
            revision=RERANK_MODEL_REVISION,
            padding_side="left",
        )
        if _rerank_tokenizer.pad_token is None:
            _rerank_tokenizer.pad_token = _rerank_tokenizer.eos_token

        log.info("Loading reranker model %s @ %s onto %s...",
                  RERANK_MODEL_NAME, RERANK_MODEL_REVISION[:12], device)
        model = AutoModelForSequenceClassification.from_pretrained(
            RERANK_MODEL_NAME,
            revision=RERANK_MODEL_REVISION,
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
        ).eval()
        if model.config.pad_token_id is None:
            model.config.pad_token_id = _rerank_tokenizer.eos_token_id
        _rerank_model = model.to(device)
        log.info("Reranker model loaded on %s.", device)
    return _rerank_model, _rerank_tokenizer


def rerank(
    query: str,
    documents: List[str],
    top_n: Optional[int] = None,
    max_length: int = RERANK_MAX_LENGTH,
) -> List[RerankedDoc]:
    """Score every document against `query`, return sorted by relevance
    (highest score first). Pure function — does not touch ChromaDB, BM25,
    or retrieval_tuning.py; the caller decides what to do with the order.

    top_n: if given, only the top N results are returned (matches the
    NIM /rerank REST API's own parameter name for familiarity).
    """
    if not documents:
        return []

    model, tokenizer = get_reranker_model()
    device = next(model.parameters()).device

    texts = [_prompt_template(query, doc) for doc in documents]
    batch = tokenizer(
        texts,
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=max_length,
    )
    batch = {k: v.to(device) for k, v in batch.items()}

    with torch.inference_mode():
        logits = model(**batch).logits
        scores = logits.view(-1).float().cpu().tolist()

    ranked = [
        RerankedDoc(index=i, score=score, text=doc)
        for i, (doc, score) in enumerate(zip(documents, scores))
    ]
    ranked.sort(key=lambda r: r.score, reverse=True)
    return ranked[:top_n] if top_n is not None else ranked


if __name__ == "__main__":
    # Real smoke test, not a mock: reproduces the model card's own worked
    # example (nsight-copilot MODEL-CARDS.md) so the printed scores can be
    # compared directly against NVIDIA's documented output as ground truth
    # that this wrapper is calling the model correctly.
    logging.basicConfig(level=logging.INFO)
    query = "how much protein should a female eat?"
    docs = [
        "As a general guideline, the CDC's average requirement of protein for women ages 19 to 70 is 46 grams per day. But, as you can see from this chart, you'll need to increase that if you're expecting or training for a marathon. Check out the chart below to see how much protein you should be eating each day.",
        "Definition of summit for English Language Learners. : 1  the highest point of a mountain : the top of a mountain. : 2  the highest level. : 3  a meeting or series of meetings between the leaders of two or more governments.",
        "Calorie intake should not fall below 1,200 a day in women or 1,500 a day in men, except under the supervision of a health professional.",
    ]
    results = rerank(query, docs)
    print(f"\nQuery: {query}\n")
    for r in results:
        print(f"  [{r.score:8.4f}] (orig #{r.index}) {r.text[:90]}...")
    print(
        "\nExpected (from NVIDIA's own documented example): doc #0 (protein/CDC) highest "
        "(~20.6), doc #1 (summit definition) lowest (~-23.1), doc #2 (calorie intake) middle (~-0.26)."
    )
