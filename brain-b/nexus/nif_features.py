"""Feature extraction from Fallout 4 NIF files (version 20.2.0.7, user version 12, BS version 130).

Reads only the header and the few block types that matter for 'what is this mesh like':
shape sizes, bounds, skinning, collision, BSXFlags and shader flags. Pure Python, no
dependencies, no Blender. Everything is bounds-checked: a file that does not parse
returns None instead of guessing.
"""
from __future__ import annotations

import math
import struct
from typing import Optional

SHAPE_TYPES = {"BSTriShape", "BSSubIndexTriShape", "BSMeshLODTriShape", "BSDynamicTriShape", "BSLODTriShape"}

BSX_BITS = ["bsx_animated", "bsx_havok", "bsx_ragdoll", "bsx_complex", "bsx_addon", "bsx_editor_marker",
            "bsx_dynamic", "bsx_articulated", "bsx_needs_update", "bsx_external_emit"]


class _R:
    def __init__(self, data: bytes, pos: int = 0):
        self.d, self.p = data, pos

    def take(self, fmt: str):
        size = struct.calcsize(fmt)
        if self.p + size > len(self.d):
            raise EOFError
        v = struct.unpack_from(fmt, self.d, self.p)
        self.p += size
        return v if len(v) > 1 else v[0]

    def skip(self, n: int):
        if self.p + n > len(self.d):
            raise EOFError
        self.p += n

    def sized_string(self) -> str:
        n = self.take("<I")
        if n > 4096 or self.p + n > len(self.d):
            raise EOFError
        s = self.d[self.p:self.p + n].decode("latin-1")
        self.p += n
        return s

    def short_string(self) -> str:
        n = self.take("<B")
        s = self.d[self.p:self.p + n].decode("latin-1").rstrip("\x00")
        self.skip(n)
        return s


def parse_header(data: bytes) -> Optional[dict]:
    try:
        end = data.index(b"\n", 0, 80)
        if not data.startswith(b"Gamebryo File Format"):
            return None
        r = _R(data, end + 1)
        version = r.take("<I")
        endian = r.take("<B")
        user_version = r.take("<I")
        num_blocks = r.take("<I")
        if version != 0x14020007 or endian != 1 or num_blocks > 100000:
            return None
        bs_version = r.take("<I")
        r.short_string(); 
        if bs_version < 131:
            r.short_string()          # process script
        r.short_string()              # export script
        if bs_version >= 103:
            r.short_string()          # max filepath
        n_types = r.take("<H")
        types = [r.sized_string() for _ in range(n_types)]
        idx = list(struct.unpack_from(f"<{num_blocks}H", data, r.p)); r.skip(2 * num_blocks)
        sizes = list(struct.unpack_from(f"<{num_blocks}I", data, r.p)); r.skip(4 * num_blocks)
        n_strings = r.take("<I"); r.take("<I")
        strings = [r.sized_string() for _ in range(n_strings)]
        n_groups = r.take("<I"); r.skip(4 * n_groups)
        block_types = [types[i] for i in idx]
        offsets, pos = [], r.p
        for s in sizes:
            offsets.append(pos); pos += s
        if pos > len(data):
            return None
        return {"bs_version": bs_version, "user_version": user_version, "types": block_types, "sizes": sizes,
                "offsets": offsets, "strings": strings}
    except (EOFError, ValueError, struct.error, IndexError):
        return None


def _object_net_end(r: _R) -> None:
    """Skip NiObjectNET: name(i32), extra data refs, controller ref."""
    r.skip(4)
    n = r.take("<I")
    if n > 1000:
        raise EOFError
    r.skip(4 * n + 4)


def _parse_shape(data: bytes, off: int, size: int) -> Optional[dict]:
    """BSTriShape and subclasses: returns counts, vertex stride and bounding sphere. Self-checks data_size."""
    try:
        r = _R(data, off)
        _object_net_end(r)
        r.skip(4 + 12 + 36 + 4 + 4)                 # flags, translation, rotation, scale, collision ref
        cx, cy, cz, rad = r.take("<ffff")
        skin, shader, alpha = r.take("<iii")
        desc = r.take("<Q")
        n_tris = r.take("<I")
        n_verts = r.take("<H")
        data_size = r.take("<I")
        stride = (desc & 0xF) * 4
        if n_verts and stride:
            expected = stride * n_verts + 6 * n_tris
            if data_size not in (0, expected):
                return {"bad": True}
        if not all(math.isfinite(v) for v in (cx, cy, cz, rad)):
            return {"bad": True}
        return {"verts": n_verts, "tris": n_tris, "stride": stride, "center": (cx, cy, cz), "radius": rad,
                "skinned": skin >= 0, "has_shader": shader >= 0, "has_alpha": alpha >= 0, "dynamic": False}
    except (EOFError, struct.error):
        return None


def _parse_lighting_shader(data: bytes, off: int) -> Optional[dict]:
    try:
        r = _R(data, off)
        shader_type = r.take("<I")        # FO4 puts the shader type first, then NiObjectNET
        _object_net_end(r)
        f1, f2 = r.take("<II")
        return {"type": shader_type, "f1": f1, "f2": f2}
    except (EOFError, struct.error):
        return None


def extract(data: bytes) -> Optional[dict]:
    """Feature dict for one NIF, or None if it is not a FO4 NIF this parser understands."""
    h = parse_header(data)
    if h is None or h["bs_version"] != 130:
        return None
    types, offsets, sizes = h["types"], h["offsets"], h["sizes"]
    out = {"shapes": 0, "verts": 0, "tris": 0, "skinned": 0, "bones": 0, "lighting_shaders": 0, "alpha_props": 0,
           "np_collision": 0, "legacy_collision": 0, "havok_blocks": 0, "nodes": 0, "bsx": -1, "shader_type": -1,
           "shader_f1": -1, "shader_f2": -1, "parse_problems": 0}
    mins = [math.inf] * 3
    maxs = [-math.inf] * 3
    for t, off, size in zip(types, offsets, sizes):
        if t in SHAPE_TYPES:
            s = _parse_shape(data, off, size)
            if s is None or s.get("bad"):
                out["parse_problems"] += 1
                continue
            out["shapes"] += 1
            out["verts"] += s["verts"]
            out["tris"] += s["tris"]
            out["skinned"] |= int(s["skinned"])
            for k in range(3):
                mins[k] = min(mins[k], s["center"][k] - s["radius"])
                maxs[k] = max(maxs[k], s["center"][k] + s["radius"])
        elif t == "NiNode" or t == "BSFadeNode" or t == "BSMultiBoundNode":
            out["nodes"] += 1
        elif t == "BSXFlags":
            try:
                r = _R(data, off)
                r.skip(4)
                out["bsx"] = r.take("<I")
            except (EOFError, struct.error):
                out["parse_problems"] += 1
        elif t == "BSSkin::Instance":
            try:
                r = _R(data, off); r.skip(8)
                out["bones"] += r.take("<I")
            except (EOFError, struct.error):
                out["parse_problems"] += 1
        elif t == "BSLightingShaderProperty":
            out["lighting_shaders"] += 1
            if out["shader_f1"] < 0:
                s = _parse_lighting_shader(data, off)
                if s:
                    out["shader_type"], out["shader_f1"], out["shader_f2"] = s["type"], s["f1"], s["f2"]
        elif t == "NiAlphaProperty":
            out["alpha_props"] += 1
        elif t == "bhkNPCollisionObject":
            out["np_collision"] += 1
        elif t == "bhkCollisionObject":
            out["legacy_collision"] += 1
        elif t.startswith("bhk") or t.startswith("bhkNP"):
            out["havok_blocks"] += 1
    if out["shapes"]:
        out["bound_x"], out["bound_y"], out["bound_z"] = (maxs[k] - mins[k] for k in range(3))
    else:
        out["bound_x"] = out["bound_y"] = out["bound_z"] = 0.0
    return out


# ---- feature vector used for similarity -------------------------------------------------------

FEATURE_NAMES = (["log_verts", "log_tris", "shapes", "skinned", "log_bones", "np_collision", "legacy_collision",
                  "log_havok_blocks", "has_alpha", "log_bound_x", "log_bound_y", "log_bound_z"] + BSX_BITS)


def vector(f: dict) -> list[float]:
    bsx = f["bsx"] if f["bsx"] >= 0 else 0
    return ([math.log1p(f["verts"]), math.log1p(f["tris"]), float(min(f["shapes"], 20)), float(f["skinned"]),
             math.log1p(f["bones"]), float(f["np_collision"] > 0), float(f["legacy_collision"] > 0),
             math.log1p(f["havok_blocks"]), float(f["alpha_props"] > 0),
             math.log1p(f["bound_x"]), math.log1p(f["bound_y"]), math.log1p(f["bound_z"])]
            + [float((bsx >> i) & 1) for i in range(len(BSX_BITS))])
