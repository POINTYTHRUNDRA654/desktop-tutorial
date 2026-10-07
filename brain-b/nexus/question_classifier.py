"""Tiny trained question classifier for Brain B -- runs on this computer, numpy only.

Replaces the keyword guesses (and, when switched on, the LLM call) for the
yes/no flags and the teach/debug/answer mode that classify_and_diagnose()
works out for every question. Trained offline by train_question_classifier.py
on embeddings from the same bge-small model Brain B already uses; the result
is one small JSON file of weights.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Callable, Optional

BOOL_FIELDS = ["scene_related", "app_help_related", "game_data_related", "needs_grounding", "action_related"]
MIN_BOOL_CONFIDENCE = 0.85
MIN_MODE_CONFIDENCE = 0.60


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z)) if z >= 0 else math.exp(z) / (1.0 + math.exp(z))


def _softmax(zs: list[float]) -> list[float]:
    m = max(zs)
    e = [math.exp(z - m) for z in zs]
    s = sum(e)
    return [x / s for x in e]


def _dot(w: list[float], x: list[float]) -> float:
    return sum(a * b for a, b in zip(w, x))


class QuestionClassifier:
    def __init__(self, model: dict):
        self.model = model
        self.embedding_model = model.get("embedding_model", "")
        self.dim = int(model["dim"])

    @classmethod
    def load(cls, path: str | Path) -> Optional["QuestionClassifier"]:
        try:
            return cls(json.loads(Path(path).read_text(encoding="utf-8")))
        except Exception:
            return None

    def predict_vector(self, vec: list[float]) -> dict:
        """Returns {field: (value, confidence)} for mode and each bool field."""
        if len(vec) != self.dim:
            raise ValueError("embedding size does not match the trained model")
        out: dict = {}
        m = self.model["mode"]
        probs = _softmax([_dot(w, vec) + b for w, b in zip(m["coef"], m["intercept"])])
        i = max(range(len(probs)), key=lambda k: probs[k])
        out["mode"] = (m["classes"][i], probs[i])
        for f in BOOL_FIELDS:
            spec = self.model["bool"][f]
            p = _sigmoid(_dot(spec["coef"], vec) + spec["intercept"])
            out[f] = (p >= 0.5, p if p >= 0.5 else 1.0 - p)
        return out

    def predict(self, question: str, embed_fn: Callable[[list[str]], list[list[float]]]) -> dict:
        return self.predict_vector(embed_fn([question])[0])


def confident(pred: dict) -> bool:
    """True when every field clears its confidence bar (safe to use without asking the LLM)."""
    if pred["mode"][1] < MIN_MODE_CONFIDENCE:
        return False
    return all(pred[f][1] >= MIN_BOOL_CONFIDENCE for f in BOOL_FIELDS)
