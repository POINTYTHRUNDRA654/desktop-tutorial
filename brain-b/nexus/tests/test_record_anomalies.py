import copy, json, os, sys
import pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import record_anomalies as ra

MODELS = os.path.join(os.path.dirname(__file__), "..", "record_models")

WEAPON = {"form_id": "0x1", "edid": "TestGun", "stats": {
    "speed": 1.0, "reload_speed": 1.0, "reach": 1.0, "min_range": 256.0, "max_range": 4096.0, "attack_delay": 0.3,
    "damage_out_of_range_mult": 0.5, "capacity": 12, "damage_secondary": 0.0, "weight": 4.0, "value": 80,
    "damage_base": 20, "accuracy_bonus": 0, "action_point_cost": 20.0, "flags": []},
    "critical": {"crit_damage_mult": 2.0, "crit_charge_bonus": 1.0}}

def test_flatten_handles_nesting_lists_bools_and_skips_ids():
    f = ra.flatten({"form_id": "0x1", "edid": "x", "a": 1, "b": {"c": 2.5, "d": True}, "l": [1, 2, 3], "s": "text"})
    assert f == {"a": 1.0, "b.c": 2.5, "b.d": 1.0, "l.count": 3.0}

def test_models_available_and_load():
    assert set(ra.available_collections(MODELS)) >= {"weapons", "armors", "npcs"}
    assert ra.RecordAnomalyModel.load(MODELS, "weapons") is not None
    assert ra.RecordAnomalyModel.load(MODELS, "nope") is None

def test_extreme_weapon_is_flagged_with_reason_and_normal_is_not():
    m = ra.RecordAnomalyModel.load(MODELS, "weapons")
    odd = copy.deepcopy(WEAPON); odd["edid"] = "OddGun"
    odd["stats"]["damage_base"] = 60000; odd["stats"]["weight"] = 900
    normal, weird = m.score([WEAPON, odd])
    assert weird["flagged"] and weird["unusualness"] > normal["unusualness"]
    assert any(r["field"] == "stats.damage_base" for r in weird["reasons"])
    assert not normal["flagged"]

def test_missing_fields_do_not_crash():
    m = ra.RecordAnomalyModel.load(MODELS, "armors")
    r = m.score([{"form_id": "0x2", "edid": "Bare"}])[0]
    assert 0.0 <= r["unusualness"] <= 1.0

def test_empty_input():
    assert ra.RecordAnomalyModel.load(MODELS, "npcs").score([]) == []

def test_json_loader_guards(tmp_path):
    (tmp_path / "s.json").write_text(json.dumps({"weapons": [{"a": 1}]}))
    assert ra.load_records_from_json(tmp_path / "s.json", "weapons") == [{"a": 1}]
    with pytest.raises(ValueError):
        ra.load_records_from_json(tmp_path / "s.json", "armors")
    (tmp_path / "x.txt").write_text("{}")
    with pytest.raises(ValueError):
        ra.load_records_from_json(tmp_path / "x.txt", "weapons")
