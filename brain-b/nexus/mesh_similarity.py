"""'Which vanilla meshes are most like this one?' -- nearest-neighbour lookup over the base game's meshes.

The index (mesh_index.npz) was built offline from the game's own BA2 archives by build_mesh_index.py.
At run time this needs only numpy. Advice built on it is grounded in real vanilla files: what the
closest vanilla meshes actually use for BSXFlags, collision and shader flags.
"""
from __future__ import annotations

import math
from collections import Counter
from pathlib import Path
from typing import Optional

import numpy as np

import nif_features as nf

# How much each feature group matters for "similar".
_WEIGHTS = {"skinned": 2.0, "np_collision": 1.5, "legacy_collision": 1.0, "shapes": 0.8, "has_alpha": 0.8}
BSX_NAMES = {b: n for b, n in zip(range(10), ["Animated", "Havok", "Ragdoll", "Complex", "Addon", "EditorMarker",
                                              "Dynamic", "Articulated", "NeedsTransformUpdates", "ExternalEmit"])}


def bsx_text(v: int) -> str:
    names = [BSX_NAMES[b] for b in range(10) if (v >> b) & 1]
    return f"{v} ({', '.join(names) if names else 'none'})"


class MeshIndex:
    def __init__(self, z):
        self.X = z["X"].astype(np.float32)
        self.mean, self.std = z["mean"], z["std"]
        self.meta = z["meta"]
        self.names = str(z["names"]).split("\n")
        self.features = str(z["features"]).split("\n")
        w = np.array([_WEIGHTS.get(n, 1.0) for n in self.features], dtype=np.float32)
        self.weights = w
        self.Z = (self.X - self.mean) / self.std

    @classmethod
    def load(cls, path: str | Path) -> Optional["MeshIndex"]:
        try:
            with np.load(str(path), allow_pickle=False) as z:
                return cls(z)
        except Exception:
            return None

    def _query_vector(self, q: dict) -> tuple[np.ndarray, np.ndarray]:
        """Turn the caller's measurements into a standardized vector plus a mask of the features actually provided."""
        f = {"verts": 0, "tris": 0, "shapes": 1, "skinned": 0, "bones": 0, "np_collision": 0, "legacy_collision": 0,
             "havok_blocks": 0, "alpha_props": 0, "bsx": -1, "bound_x": 0.0, "bound_y": 0.0, "bound_z": 0.0}
        provided = set()
        for k, v in q.items():
            if k in f and isinstance(v, (int, float)) and not isinstance(v, bool) or (k in f and isinstance(v, bool)):
                f[k] = float(v) if k.startswith("bound") else int(v)
                provided.add(k)
        if "collision" in q and "np_collision" not in q:
            f["np_collision"] = int(bool(q["collision"])); provided.add("np_collision")
        vec = np.array(nf.vector(f), dtype=np.float32)
        mask = np.zeros(len(self.features), dtype=np.float32)
        groups = {"verts": ["log_verts"], "tris": ["log_tris"], "shapes": ["shapes"], "skinned": ["skinned"],
                  "bones": ["log_bones"], "np_collision": ["np_collision"], "legacy_collision": ["legacy_collision"],
                  "havok_blocks": ["log_havok_blocks"], "alpha_props": ["has_alpha"],
                  "bound_x": ["log_bound_x"], "bound_y": ["log_bound_y"], "bound_z": ["log_bound_z"],
                  "bsx": list(nf.BSX_BITS)}
        for key in provided:
            for name in groups.get(key, []):
                mask[self.features.index(name)] = 1.0
        return (vec - self.mean) / self.std, mask

    def similar(self, query: dict, k: int = 25) -> dict:
        qz, mask = self._query_vector(query)
        if mask.sum() == 0:
            raise ValueError("no usable measurements in the query")
        diff = (self.Z - qz) * self.weights * mask
        dist = np.sqrt((diff * diff).sum(axis=1) / mask.sum())
        k = max(1, min(k, len(dist)))
        idx = np.argpartition(dist, k - 1)[:k]
        idx = idx[np.argsort(dist[idx])]
        m = self.meta[idx]
        n = len(idx)
        bsx = Counter(int(v) for v in m[:, 0] if v >= 0)
        f1 = Counter(int(v) for v in m[:, 2] if v > 0)
        stype = Counter(int(v) for v in m[:, 1] if v >= 0)
        col = {name: int(self.X[idx, self.features.index(name)].sum()) for name in ("np_collision", "legacy_collision", "skinned")}
        return {
            "neighbors": n,
            "closest": [{"path": self.names[i], "distance": round(float(dist[i]), 3), "verts": int(self.meta[i][4]),
                         "tris": int(self.meta[i][5]), "bsx": bsx_text(int(self.meta[i][0])) if self.meta[i][0] >= 0 else None}
                        for i in idx[:8]],
            "bsx_flags": [{"value": bsx_text(v), "share": round(c / n, 2)} for v, c in bsx.most_common(3)],
            "collision": {"np_collision_share": round(col["np_collision"] / n, 2),
                          "legacy_collision_share": round(col["legacy_collision"] / n, 2)},
            "skinned_share": round(col["skinned"] / n, 2),
            "lighting_shader_flags1": [{"value": f"0x{v:08X}", "share": round(c / n, 2)} for v, c in f1.most_common(3)],
            "shader_type": [{"value": v, "share": round(c / n, 2)} for v, c in stype.most_common(2)],
            "typical_size": {"verts_median": int(np.median(m[:, 4])), "tris_median": int(np.median(m[:, 5]))},
        }
