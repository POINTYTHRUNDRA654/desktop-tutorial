"""
fo4_generation_log.py
Adaptive learning layer for Hunyuan3D image-to-3D generation.

Records every generation attempt, derives better settings from what works,
and exposes the data to Mossy for FO4-specific advice.
"""

from __future__ import annotations

import json
import math
import os
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Log location — persists across addon updates
# ---------------------------------------------------------------------------

def get_log_path() -> Path:
    user_data = Path(os.path.expanduser("~")) / ".blender_fo4_tools"
    user_data.mkdir(parents=True, exist_ok=True)
    return user_data / "fo4_gen_log.json"


def _load() -> list:
    p = get_log_path()
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(entries: list) -> None:
    try:
        get_log_path().write_text(
            json.dumps(entries, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as exc:
        print(f"[FO4GenLog] Could not save log: {exc}")


# ---------------------------------------------------------------------------
# Mesh quality inspection
# ---------------------------------------------------------------------------

def _score_mesh(obj) -> dict:
    """Extract FO4 compatibility metrics from a Blender mesh object."""
    result = {
        "poly_count": 0,
        "uv_layers": 0,
        "material_count": 0,
        "is_triangulated": False,
        "fo4_compat": False,
        "issues": [],
    }
    if obj is None or obj.type != "MESH":
        result["issues"].append("Not a mesh object")
        return result

    me = obj.data
    polys = len(me.polygons)
    result["poly_count"] = polys
    result["uv_layers"] = len(me.uv_layers)
    result["material_count"] = len(obj.material_slots)

    # FO4 hard limits
    if polys > 65535:
        result["issues"].append(f"Too many polygons ({polys:,} > 65 535 FO4 limit)")
    if result["uv_layers"] == 0:
        result["issues"].append("No UV map — NIF export will fail")
    if polys == 0:
        result["issues"].append("Empty mesh")

    # Check triangulation (FO4 NIF requires tris)
    non_tris = sum(1 for p in me.polygons if len(p.vertices) != 3)
    result["is_triangulated"] = (non_tris == 0)
    if non_tris:
        result["issues"].append(f"{non_tris} non-triangle face(s) — triangulate before export")

    result["fo4_compat"] = len(result["issues"]) == 0
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def record(
    image_path: str,
    obj,
    settings: dict | None = None,
    mossy_advice: str | None = None,
) -> dict:
    """Log one completed generation.  Returns the entry dict."""
    score = _score_mesh(obj)
    entry = {
        "ts": int(time.time()),
        "image": os.path.basename(image_path) if image_path else "",
        "settings": settings or {},
        "poly_count": score["poly_count"],
        "uv_layers": score["uv_layers"],
        "material_count": score["material_count"],
        "is_triangulated": score["is_triangulated"],
        "fo4_compat": score["fo4_compat"],
        "issues": score["issues"],
        "mossy_advice": mossy_advice or "",
    }
    entries = _load()
    entries.append(entry)
    # Keep last 200 entries
    if len(entries) > 200:
        entries = entries[-200:]
    _save(entries)
    print(f"[FO4GenLog] Recorded generation — poly:{score['poly_count']:,}  "
          f"uv:{score['uv_layers']}  compat:{score['fo4_compat']}")
    return entry


def _apply_evolution(settings: dict) -> dict:
    """Overlay what the post-edit monitor has learned (see fo4_mesh_evolution).

    The biggest lever is target_polys: instead of aiming for the raw generated
    density, aim for the poly count you actually KEEP after cleanup, so there is
    less to remove.  Also carries a pre-scale hint and an auto-clean flag.
    """
    try:
        from . import fo4_mesh_evolution as _evo
        adj = _evo.get_learned_adjustments()
    except Exception:
        return settings
    if not adj.get("have_data"):
        return settings
    tp = adj.get("recommended_target_polys")
    if tp:
        settings["target_polys"] = int(min(max(tp, 500), 65000))
    if adj.get("recommended_prescale"):
        settings["prescale"] = adj["recommended_prescale"]
    settings["auto_remove_loose"] = bool(adj.get("auto_remove_loose"))
    settings["description"] = (
        settings.get("description", "") + " | +edits: " + adj.get("description", "")
    )
    return settings


def get_adaptive_settings() -> dict:
    """Return preprocessing settings derived from successful past generations.

    Examines all fo4_compat=True entries and averages their settings.
    Falls back to sensible defaults when the log is empty or all failed.
    """
    entries = _load()
    good = [e for e in entries if e.get("fo4_compat")]

    defaults = {
        "resolution": 256,
        "target_polys": 20000,
        "use_texture": True,
        "description": "defaults (no history yet)",
    }

    if not good:
        return _apply_evolution(defaults)

    # Average numeric settings from successful runs
    res_values = [e["settings"].get("resolution", 256) for e in good]
    avg_res = int(round(sum(res_values) / len(res_values)))
    # Round to nearest 64 for Hunyuan3D's preferred sizes
    avg_res = max(128, min(512, int(round(avg_res / 64)) * 64))

    poly_values = [e["poly_count"] for e in good if e["poly_count"] > 0]
    avg_polys = int(sum(poly_values) / len(poly_values)) if poly_values else 20000

    return _apply_evolution({
        "resolution": avg_res,
        "target_polys": min(avg_polys, 65000),
        "use_texture": True,
        "description": f"learned from {len(good)} successful FO4 generations",
    })


def get_recent_advice(n: int = 3) -> list[str]:
    """Return Mossy advice strings from the most recent successful generations."""
    entries = _load()
    advice = [
        e["mossy_advice"]
        for e in reversed(entries)
        if e.get("mossy_advice") and e.get("fo4_compat")
    ]
    return advice[:n]


def get_stats_summary() -> dict:
    """Return aggregate stats for display in the UI."""
    entries = _load()
    if not entries:
        return {"total": 0, "success": 0, "success_rate": 0.0, "avg_polys": 0}
    total = len(entries)
    good = [e for e in entries if e.get("fo4_compat")]
    poly_vals = [e["poly_count"] for e in good if e.get("poly_count", 0) > 0]
    return {
        "total": total,
        "success": len(good),
        "success_rate": round(len(good) / total * 100, 1),
        "avg_polys": int(sum(poly_vals) / len(poly_vals)) if poly_vals else 0,
    }


def build_mossy_context(image_path: str, score: dict, settings: dict) -> str:
    """Build the prompt we send to Mossy after each generation."""
    stats = get_stats_summary()
    issues_text = "\n".join(f"  - {i}" for i in score["issues"]) or "  None"
    advice_history = get_recent_advice(2)
    advice_text = "\n".join(f"  • {a}" for a in advice_history) or "  (none yet)"

    return (
        f"I just generated a 3D mesh from '{os.path.basename(image_path)}' "
        f"using Hunyuan3D-2 for Fallout 4 modding.\n\n"
        f"Mesh stats:\n"
        f"  Polygons: {score['poly_count']:,}\n"
        f"  UV layers: {score['uv_layers']}\n"
        f"  Triangulated: {score['is_triangulated']}\n"
        f"  FO4 compatible: {score['fo4_compat']}\n"
        f"  Issues found:\n{issues_text}\n\n"
        f"Session history: {stats['total']} total, "
        f"{stats['success']} FO4-compatible ({stats['success_rate']}% success rate)\n\n"
        f"Recent Mossy advice:\n{advice_text}\n\n"
        f"What should I fix or watch out for to make this mesh work well in Fallout 4? "
        f"Keep advice to 2-3 short, actionable bullet points."
    )
