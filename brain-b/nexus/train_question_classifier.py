"""Train the local question classifier. Run on a dev machine:

    python train_question_classifier.py train/question_labels.txt question_classifier.json

Needs: fastembed, numpy, scikit-learn (training only -- the shipped app needs none of sklearn).
"""
import json
import sys
from pathlib import Path

import numpy as np

MODE = {"t": "teach", "d": "debug", "a": "answer"}
FIELDS = ["scene_related", "app_help_related", "game_data_related", "needs_grounding", "action_related"]


def load_rows(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m, s, a, g, n, x, q = line.split("|", 6)
        rows.append({"q": q.strip(), "mode": MODE[m], "flags": [int(s), int(a), int(g), int(n), int(x)]})
    return rows


def main(src, dst):
    from fastembed import TextEmbedding
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict

    name = "BAAI/bge-small-en-v1.5"
    rows = load_rows(src)
    X = np.array([list(v) for v in TextEmbedding(model_name=name).embed([r["q"] for r in rows])], dtype=float)
    report, model = {}, {"embedding_model": name, "dim": int(X.shape[1]), "bool": {}, "n_examples": len(rows)}
    cv = StratifiedKFold(5, shuffle=True, random_state=7)

    def fit(y, X_, **kw):
        best = None
        for C in (1, 4, 16, 64):
            clf = LogisticRegression(C=C, max_iter=2000, class_weight="balanced", **kw)
            acc = (cross_val_predict(clf, X_, y, cv=cv) == y).mean()
            if best is None or acc > best[0]:
                best = (acc, C)
        return LogisticRegression(C=best[1], max_iter=2000, class_weight="balanced", **kw).fit(X_, y), best

    # mode: only questions that actually need grounding (greetings have no meaningful mode)
    idx = [i for i, r in enumerate(rows) if r["flags"][3] == 1]
    y_mode = np.array([rows[i]["mode"] for i in idx])
    clf, (acc, C) = fit(y_mode, X[idx])
    model["mode"] = {"classes": list(clf.classes_), "coef": np.round(clf.coef_, 5).tolist(), "intercept": np.round(clf.intercept_, 5).tolist()}
    report["mode"] = (round(float(acc), 3), C, round(float(max((y_mode == c).mean() for c in set(y_mode))), 3))

    for k, f in enumerate(FIELDS):
        y = np.array([r["flags"][k] for r in rows])
        clf, (acc, C) = fit(y, X)
        model["bool"][f] = {"coef": np.round(clf.coef_[0], 5).tolist(), "intercept": round(float(clf.intercept_[0]), 5)}
        report[f] = (round(float(acc), 3), C, round(float(max(y.mean(), 1 - y.mean())), 3))

    Path(dst).write_text(json.dumps(model, separators=(",", ":")), encoding="utf-8")
    print(f"{len(rows)} examples -> {dst} ({Path(dst).stat().st_size // 1024} KB)")
    print("field: cross-validated accuracy (C used) | always-guess-majority baseline")
    for k, (acc, C, base) in report.items():
        print(f"  {k:20s} {acc:.3f} (C={C}) | {base:.3f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
