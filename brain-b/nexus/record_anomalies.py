"""Spot unusual records (Isolation Forest, trained on vanilla) -- local, no cloud.

The model for each record type (weapons, armors, npcs) was trained offline on the
base game's scanner output and exported to ONNX, so at run time this only needs
numpy + onnxruntime (already part of Brain B). A record is scored by how easy it
is to isolate from vanilla records; the answer also says which fields look odd.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Optional

import numpy as np

SKIP_KEYS = {"form_id", "edid"}
MAX_RECORDS = 20000
FLAG_PERCENTILE = 0.98   # unusualness at or above this is flagged


def flatten(record: dict, prefix: str = "") -> dict[str, float]:
    """Numeric leaves of a scanner record as {dotted.name: float}. Lists contribute their length."""
    out: dict[str, float] = {}
    for k, v in record.items():
        if not prefix and k in SKIP_KEYS:
            continue
        name = f"{prefix}{k}"
        if isinstance(v, bool):
            out[name] = float(v)
        elif isinstance(v, (int, float)):
            if math.isfinite(v):
                out[name] = float(v)
        elif isinstance(v, dict):
            out.update(flatten(v, name + "."))
        elif isinstance(v, list):
            out[name + ".count"] = float(len(v))
    return out


class RecordAnomalyModel:
    def __init__(self, meta: dict, session):
        self.meta = meta
        self.features: list[str] = meta["features"]
        self.median = np.array(meta["median"], dtype=np.float64)
        self.scale = np.array(meta["scale"], dtype=np.float64)
        self.quantiles = np.array(meta["score_quantiles"], dtype=np.float64)  # 101 sorted training anomaly scores
        self.session = session
        self.input_name = session.get_inputs()[0].name

    @classmethod
    def load(cls, model_dir: str | Path, collection: str) -> Optional["RecordAnomalyModel"]:
        d = Path(model_dir)
        try:
            meta = json.loads((d / f"{collection}.json").read_text(encoding="utf-8"))
            import onnxruntime as ort
            session = ort.InferenceSession(str(d / f"{collection}.onnx"), providers=["CPUExecutionProvider"])
            return cls(meta, session)
        except Exception:
            return None

    def _matrix(self, records: list[dict]) -> np.ndarray:
        rows = []
        for r in records:
            f = flatten(r)
            rows.append([f.get(name, np.nan) for name in self.features])
        X = np.array(rows, dtype=np.float64)
        return np.where(np.isnan(X), self.median, X)

    def score(self, records: list[dict], top_reasons: int = 3) -> list[dict]:
        if not records:
            return []
        X = self._matrix(records)
        out = self.session.run(None, {self.input_name: X.astype(np.float32)})
        # skl2onnx IsolationForest returns [label, scores]; scores is sklearn's decision_function
        # (negative = more unusual). Flip so higher = more unusual.
        raw = np.asarray(out[1]).reshape(-1)
        anomaly = -raw
        pct = np.interp(anomaly, self.quantiles, np.linspace(0.0, 1.0, len(self.quantiles)))
        z = (X - self.median) / self.scale
        results = []
        for i, rec in enumerate(records):
            order = np.argsort(-np.abs(z[i]))[:top_reasons]
            reasons = [
                {"field": self.features[j], "value": round(float(X[i, j]), 4),
                 "typical": round(float(self.median[j]), 4), "z": round(float(z[i, j]), 2)}
                for j in order if abs(z[i, j]) >= 3.0
            ]
            results.append({
                "form_id": rec.get("form_id"), "edid": rec.get("edid"),
                "unusualness": round(float(pct[i]), 4),
                "flagged": bool(pct[i] >= FLAG_PERCENTILE),
                "reasons": reasons,
            })
        return results


def available_collections(model_dir: str | Path) -> list[str]:
    return sorted(p.stem for p in Path(model_dir).glob("*.onnx"))


def load_records_from_json(path: str | Path, key: str) -> list[dict]:
    p = Path(path)
    if p.suffix.lower() != ".json":
        raise ValueError("only .json scanner files can be read")
    if p.stat().st_size > 200 * 1024 * 1024:
        raise ValueError("scanner file is too large")
    data = json.loads(p.read_text(encoding="utf-8"))
    recs = data.get(key) if isinstance(data, dict) else None
    if not isinstance(recs, list):
        raise ValueError(f"no list called '{key}' in that file")
    return recs[:MAX_RECORDS]
