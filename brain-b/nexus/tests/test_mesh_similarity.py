import math, os, sys
import pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import mesh_similarity as ms
import nif_features as nf

INDEX = os.path.join(os.path.dirname(__file__), "..", "mesh_index.npz")

@pytest.fixture(scope="module")
def idx():
    i = ms.MeshIndex.load(INDEX)
    assert i is not None
    return i

def test_index_loaded(idx):
    assert len(idx.names) == len(idx.X) == len(idx.meta) > 10000
    assert idx.features == nf.FEATURE_NAMES

def test_missing_file_gives_none(tmp_path):
    assert ms.MeshIndex.load(tmp_path / "nope.npz") is None

def test_weapon_mod_like_query_finds_weapon_meshes(idx):
    # measurements of the vanilla 10mm compensator (verified against the archive): should find weapon parts
    r = idx.similar({"verts": 552, "tris": 534, "shapes": 1, "skinned": 0, "np_collision": 1, "bsx": 194,
                     "bound_x": 8.9, "bound_y": 8.9, "bound_z": 8.9}, k=25)
    weapon_hits = sum("weapons" in c["path"].lower() for c in r["closest"])
    assert weapon_hits >= 4
    assert r["bsx_flags"][0]["share"] >= 0.3

def test_skinned_query_prefers_skinned(idx):
    r = idx.similar({"verts": 6000, "tris": 8000, "shapes": 3, "skinned": 1, "bones": 40}, k=25)
    assert r["skinned_share"] >= 0.6

def test_exact_vanilla_mesh_is_its_own_nearest(idx):
    i = next(j for j, n in enumerate(idx.names) if n.lower().endswith("10mmcompensator.nif"))
    row = idx.meta[i]
    r = idx.similar({"verts": int(row[4]), "tris": int(row[5]), "shapes": int(row[6]), "bsx": int(row[0]),
                     "np_collision": int(idx.X[i, idx.features.index("np_collision")]),
                     "skinned": int(idx.X[i, idx.features.index("skinned")])}, k=5)
    assert r["closest"][0]["distance"] < 0.5

def test_empty_query_rejected(idx):
    with pytest.raises(ValueError):
        idx.similar({"nonsense": 1})

def test_partial_query_only_uses_what_is_given(idx):
    a = idx.similar({"verts": 500, "tris": 500}, k=10)
    assert a["neighbors"] == 10

def test_nif_parser_rejects_junk():
    assert nf.extract(b"not a nif") is None
    assert nf.extract(b"Gamebryo File Format, Version 20.2.0.7\n" + b"\x00" * 10) is None
