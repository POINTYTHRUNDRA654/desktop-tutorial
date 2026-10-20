"""Screen Awareness local filter (step 1b) -- runs entirely on this computer.

Pipeline for one screenshot:
  1. OCR the screenshot locally (RapidOCR, optional dependency).
  2. Compare the text with the known mistake patterns for the program
     (embedding similarity + keyword overlap).
  3. Clear match  -> report it, no AI call.
     Nothing close -> report "nothing", no AI call.
     In between   -> ask the local Ollama model one yes/no question.

Nothing here talks to the internet. If OCR is not installed, check() says so
and the caller falls back to whatever it did before.
"""
from __future__ import annotations

import base64
import io
import json
import math
import re
from typing import Callable, Optional

# Combined score thresholds. Starting values; the logged scores are how they get tuned.
MATCH_SCORE = 0.80      # at or above: report the match without asking the AI
CANDIDATE_SCORE = 0.55  # at or above (and below MATCH_SCORE): ask the local AI to decide
MIN_TEXT_CHARS = 12     # less readable text than this -> nothing to judge
MAX_TEXT_CHARS = 1500

_STOP = set("a an the and or of to in on is are be as it its this that which with for from by at into than not no "
            "you your when if then do does can may use used using make sure check".split())

_ocr_engine = None
_ocr_failed = False


def ocr_available() -> bool:
    global _ocr_failed
    if _ocr_failed:
        return False
    try:
        import rapidocr_onnxruntime  # noqa: F401
        return True
    except Exception:
        _ocr_failed = True
        return False


def ocr_image(image_bytes: bytes) -> str:
    """Read all text from a PNG/JPEG. Raises RuntimeError if OCR is not installed."""
    global _ocr_engine
    if not ocr_available():
        raise RuntimeError("OCR is not installed")
    if _ocr_engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr_engine = RapidOCR()
    import numpy as np
    from PIL import Image
    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    result, _ = _ocr_engine(img)
    if not result:
        return ""
    return "\n".join(str(line[1]) for line in result)


def decode_data_url(data_url: str) -> bytes:
    payload = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
    return base64.b64decode(payload)


def _words(text: str) -> set[str]:
    return {w for w in re.sub(r"[^a-z0-9 ]+", " ", str(text or "").lower()).split() if len(w) > 2 and w not in _STOP}


def keyword_overlap(text: str, pattern_text: str) -> float:
    """Share of the pattern's distinctive words that appear in the screen text."""
    p = _words(pattern_text)
    if not p:
        return 0.0
    return len(p & _words(text)) / len(p)


def cosine(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def score_patterns(text: str, patterns: list[dict], embed_fn: Callable[[list[str]], list[list[float]]]) -> list[dict]:
    """Return patterns with a 0..1 score, best first."""
    text = text[:MAX_TEXT_CHARS]
    usable = [p for p in patterns if p.get("id") and p.get("whatToLookFor")]
    if not usable:
        return []
    vecs = embed_fn([text] + [str(p["whatToLookFor"]) for p in usable])
    text_vec, pat_vecs = vecs[0], vecs[1:]
    scored = []
    for p, v in zip(usable, pat_vecs):
        sem = max(0.0, cosine(text_vec, v))
        kw = keyword_overlap(text, p["whatToLookFor"])
        scored.append({"id": str(p["id"]), "score": round(0.6 * sem + 0.4 * kw, 4),
                       "semantic": round(sem, 4), "keywords": round(kw, 4)})
    scored.sort(key=lambda s: s["score"], reverse=True)
    return scored


def decide(scored: list[dict]) -> dict:
    if not scored:
        return {"verdict": "none"}
    best = scored[0]
    if best["score"] >= MATCH_SCORE:
        return {"verdict": "match", "pattern_id": best["id"], "score": best["score"]}
    if best["score"] >= CANDIDATE_SCORE:
        return {"verdict": "ambiguous", "pattern_id": best["id"], "score": best["score"]}
    return {"verdict": "none", "score": best["score"]}


def judge_prompt(text: str, what_to_look_for: str) -> str:
    return (
        "You check text read from a modding tool's screen.\n"
        f"Mistake to look for: {what_to_look_for}\n\n"
        f"Text on screen:\n{text[:MAX_TEXT_CHARS]}\n\n"
        'Is that mistake actually visible in this text? Reply with only JSON: {"present": true} or {"present": false}.'
    )


def parse_judge(reply: str) -> Optional[bool]:
    m = re.search(r"\{[^{}]*\}", str(reply or ""))
    if not m:
        return None
    try:
        v = json.loads(m.group(0)).get("present")
    except Exception:
        return None
    return v if isinstance(v, bool) else None


def check(image_bytes: bytes, patterns: list[dict],
          embed_fn: Callable[[list[str]], list[list[float]]],
          judge_fn: Optional[Callable[[str], str]] = None,
          ocr_fn: Optional[Callable[[bytes], str]] = None) -> dict:
    """Full local check. Never raises for ordinary problems; returns an 'error'/'ocr_unavailable' verdict."""
    ocr = ocr_fn or ocr_image
    if ocr_fn is None and not ocr_available():
        return {"verdict": "ocr_unavailable"}
    try:
        text = ocr(image_bytes).strip()
    except Exception as e:  # noqa: BLE001
        return {"verdict": "error", "error": f"ocr failed: {type(e).__name__}"}
    if len(text) < MIN_TEXT_CHARS:
        return {"verdict": "none", "text_chars": len(text), "reason": "not enough readable text"}
    scored = score_patterns(text, patterns, embed_fn)
    out = decide(scored)
    out["text_chars"] = len(text)
    out["top"] = scored[:3]
    if out["verdict"] == "ambiguous":
        pat = next((p for p in patterns if str(p.get("id")) == out["pattern_id"]), None)
        answer = None
        if judge_fn and pat:
            try:
                answer = parse_judge(judge_fn(judge_prompt(text, str(pat["whatToLookFor"]))))
            except Exception:  # noqa: BLE001
                answer = None
        out["judged"] = answer
        out["verdict"] = "match" if answer is True else ("none" if answer is False else "unsure")
    return out
