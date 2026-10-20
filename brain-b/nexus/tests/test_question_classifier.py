import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import question_classifier as qc

MODEL = os.path.join(os.path.dirname(__file__), "..", "question_classifier.json")

def _model():
    return qc.QuestionClassifier.load(MODEL)

def test_loads_and_shapes():
    m = _model()
    assert m is not None and m.dim == 384 and m.embedding_model == "BAAI/bge-small-en-v1.5"
    assert set(m.model["bool"]) == set(qc.BOOL_FIELDS)
    assert sorted(m.model["mode"]["classes"]) == ["answer", "debug", "teach"]

def test_predict_returns_every_field_with_valid_confidence():
    p = _model().predict_vector([0.01] * 384)
    assert set(p) == {"mode", *qc.BOOL_FIELDS}
    for value, conf in p.values():
        assert 0.0 <= conf <= 1.0

def test_wrong_size_vector_rejected():
    try:
        _model().predict_vector([0.0] * 10)
        assert False
    except ValueError:
        pass

def test_missing_file_gives_none(tmp_path):
    assert qc.QuestionClassifier.load(tmp_path / "nope.json") is None

def test_confident_gate():
    ok = {"mode": ("debug", 0.9), **{f: (False, 0.95) for f in qc.BOOL_FIELDS}}
    assert qc.confident(ok)
    low_mode = {**ok, "mode": ("debug", 0.4)}
    low_flag = {**ok, "action_related": (True, 0.6)}
    assert not qc.confident(low_mode) and not qc.confident(low_flag)
