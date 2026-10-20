import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import screen_filter as sf

VOCAB = ["texture", "bc5", "normal", "scale", "esp", "master", "flag", "missing", "plugin", "nif", "error", "crash"]

def fake_embed(texts):
    out = []
    for t in texts:
        low = t.lower()
        out.append([1.0 if w in low else 0.0 for w in VOCAB])
    return out

PATS = [
    {"id": "esl-flag", "whatToLookFor": "plugin master flag missing esp error"},
    {"id": "nif-scale", "whatToLookFor": "nif scale texture normal"},
]

def test_keyword_overlap():
    assert sf.keyword_overlap("the plugin has a missing master", "plugin master missing") == 1.0
    assert sf.keyword_overlap("hello", "") == 0.0

def test_cosine_and_scoring_orders_best_first():
    s = sf.score_patterns("plugin master flag missing esp error", PATS, fake_embed)
    assert s[0]["id"] == "esl-flag" and s[0]["score"] > 0.9

def test_decide_bands():
    assert sf.decide([])["verdict"] == "none"
    assert sf.decide([{"id": "a", "score": 0.9}])["verdict"] == "match"
    assert sf.decide([{"id": "a", "score": 0.6}])["verdict"] == "ambiguous"
    assert sf.decide([{"id": "a", "score": 0.1}])["verdict"] == "none"

def test_parse_judge():
    assert sf.parse_judge('sure {"present": true}') is True
    assert sf.parse_judge('{"present": false}') is False
    assert sf.parse_judge("maybe") is None
    assert sf.parse_judge('{"present": "yes"}') is None

def test_check_clear_match_no_ai():
    called = []
    r = sf.check(b"x", PATS, fake_embed, judge_fn=lambda p: called.append(p) or "", ocr_fn=lambda b: "plugin master flag missing esp error")
    assert r["verdict"] == "match" and r["pattern_id"] == "esl-flag" and not called

def test_check_nothing_notable():
    r = sf.check(b"x", PATS, fake_embed, ocr_fn=lambda b: "completely unrelated words about weather today")
    assert r["verdict"] == "none"

def test_check_short_text():
    assert sf.check(b"x", PATS, fake_embed, ocr_fn=lambda b: "ok")["verdict"] == "none"

def test_check_ambiguous_uses_judge():
    txt = "plugin master error today in the window"
    yes = sf.check(b"x", PATS, fake_embed, judge_fn=lambda p: '{"present": true}', ocr_fn=lambda b: txt)
    no = sf.check(b"x", PATS, fake_embed, judge_fn=lambda p: '{"present": false}', ocr_fn=lambda b: txt)
    bad = sf.check(b"x", PATS, fake_embed, judge_fn=lambda p: "??", ocr_fn=lambda b: txt)
    assert (yes["verdict"], no["verdict"], bad["verdict"]) == ("match", "none", "unsure")

def test_ocr_failure_is_reported():
    def boom(b): raise ValueError("bad image")
    assert sf.check(b"x", PATS, fake_embed, ocr_fn=boom)["verdict"] == "error"

def test_data_url():
    assert sf.decode_data_url("data:image/png;base64,aGk=") == b"hi"
