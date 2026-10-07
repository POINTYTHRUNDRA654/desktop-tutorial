import os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
import log_patterns as lp

A = [f"[MASTERFILE] Cell Cell{i} ({i:08X}) combined data is owned by file Mod{i}.esp due to ref ref{i} ({i+5:08X})" for i in range(1, 6)]
B = ["Error: could not load Meshes\\Foo\\bar%d.nif" % i for i in range(1, 4)]

def test_groups_similar_lines_and_baseline(tmp_path):
    m = lp.LogPatternMiner(tmp_path, "ckpe")
    r = m.mine(A + B)
    assert r["baseline"] is True and r["new_count"] == 0
    assert r["pattern_count"] <= 4
    assert sum(p["count"] for p in r["patterns"]) == 8

def test_new_pattern_flagged_next_run_and_state_persists(tmp_path):
    lp.LogPatternMiner(tmp_path, "ckpe").mine(A + B)
    m2 = lp.LogPatternMiner(tmp_path, "ckpe")
    r = m2.mine(A + ["Script warning: property X on form 0001ABCD is missing"])
    news = [p for p in r["patterns"] if p["new"]]
    assert r["baseline"] is False and len(news) == 1 and "property" in news[0]["template"].lower()
    assert any((not p["new"]) and p["total"] > p["count"] for p in r["patterns"])

def test_severity_and_sorting(tmp_path):
    lp.LogPatternMiner(tmp_path, "x").mine(A)
    r = lp.LogPatternMiner(tmp_path, "x").mine(["Crash: access violation at 0x7FF612345678", "Loaded plugin ok"])
    assert r["patterns"][0]["new"] and r["patterns"][0]["severity"] == "error"

def test_blank_lines_ignored_and_label_sanitised(tmp_path):
    m = lp.LogPatternMiner(tmp_path, "../evil/name")
    assert ".." not in m.state_file.name and m.state_file.parent == tmp_path
    assert m.mine(["", "  ", "hello"])["total_lines"] == 1

def test_read_tail_only_log_txt(tmp_path):
    (tmp_path / "a.log").write_text("l1\nl2\nl3\n")
    (tmp_path / "b.exe").write_text("x")
    assert lp.read_tail_lines(tmp_path / "a.log") == ["l1", "l2", "l3"]
    with pytest.raises(ValueError):
        lp.read_tail_lines(tmp_path / "b.exe")
