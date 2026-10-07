"""Train the Isolation Forest models from a vanilla scanner output and export them to ONNX.

    python train_record_anomalies.py fo4_actor_and_combat_stats.json record_models weapons armors npcs

Dev machine only: needs scikit-learn, skl2onnx, onnxruntime, numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from record_anomalies import flatten  # noqa: E402


def train_one(records, out_dir: Path, name: str):
    from skl2onnx import to_onnx
    from sklearn.ensemble import IsolationForest
    import onnxruntime as ort

    flat = [flatten(r) for r in records]
    counts: dict[str, int] = {}
    for f in flat:
        for k in f:
            counts[k] = counts.get(k, 0) + 1
    names = sorted(k for k, c in counts.items() if c >= max(5, 0.05 * len(flat)))
    X = np.array([[f.get(k, np.nan) for k in names] for f in flat], dtype=np.float64)
    median = np.nanmedian(X, axis=0)
    X = np.where(np.isnan(X), median, X)
    # drop features with no variation at all
    keep = [j for j in range(X.shape[1]) if np.ptp(X[:, j]) > 0]
    names = [names[j] for j in keep]; X = X[:, keep]; median = median[keep]
    mad = np.median(np.abs(X - median), axis=0) * 1.4826
    scale = np.where(mad > 1e-9, mad, np.maximum(X.std(axis=0), 1e-9))

    model = IsolationForest(n_estimators=200, contamination="auto", random_state=7).fit(X)
    onx = to_onnx(model, X[:1].astype(np.float32), target_opset={"": 15, "ai.onnx.ml": 3})
    (out_dir / f"{name}.onnx").write_bytes(onx.SerializeToString())

    sess = ort.InferenceSession(str(out_dir / f"{name}.onnx"), providers=["CPUExecutionProvider"])
    onnx_scores = np.asarray(sess.run(None, {sess.get_inputs()[0].name: X.astype(np.float32)})[1]).reshape(-1)
    sk_scores = model.decision_function(X)
    corr = float(np.corrcoef(onnx_scores, sk_scores)[0, 1])
    anomaly = -onnx_scores
    quantiles = np.quantile(anomaly, np.linspace(0, 1, 101))
    meta = {"collection": name, "n_train": len(records), "features": names,
            "median": [round(float(v), 6) for v in median], "scale": [round(float(v), 6) for v in scale],
            "score_quantiles": [round(float(v), 6) for v in quantiles]}
    (out_dir / f"{name}.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(records)} records, {len(names)} features, ONNX~sklearn corr {corr:.4f}, "
          f"{(out_dir / f'{name}.onnx').stat().st_size // 1024} KB")


def main(src, out_dir, *collections):
    data = json.loads(Path(src).read_text(encoding="utf-8"))
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    for c in collections:
        train_one(data[c], out, c)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], *sys.argv[3:])
