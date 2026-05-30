"""
ai_tools — AI / ML integration package
=======================================
Aggregate package that wraps all optional AI and machine-learning helpers.
Every import is guarded; if a backend is unavailable (missing torch, model
weights, etc.) the corresponding symbol is simply absent from this namespace.

The package also exposes a unified ``STATUS`` dict so operators can check
which backends are actually ready without importing each helper individually.

Usage::

    from .ai_tools import STATUS, ask_mossy_for_mesh
    if STATUS["hunyuan3d"]:
        ...
"""

import importlib
import sys


def _safe(name: str):
    """Import a sibling module (relative to the package's parent) or return None."""
    pkg = __package__.rsplit(".", 1)[0]  # parent package
    full = f"{pkg}.{name}"
    try:
        if full in sys.modules:
            return importlib.reload(sys.modules[full])
        return importlib.import_module(full)
    except Exception:
        return None


# ── Backend modules (None when unavailable) ───────────────────────────────────
hunyuan3d   = _safe("hunyuan3d_helpers")
shap_e      = _safe("shap_e_helpers")
point_e     = _safe("point_e_helpers")
rignet      = _safe("rignet_helpers")
zoedepth    = _safe("zoedepth_helpers")
img2mesh    = _safe("image_to_mesh_helpers")
imageto3d   = _safe("imageto3d_helpers")
motion_gen  = _safe("motion_generation_helpers")
get3d       = _safe("get3d_helpers")
stylegan2   = _safe("stylegan2_helpers")
instantngp  = _safe("instantngp_helpers")
gradio      = _safe("gradio_helpers")
hymotion    = _safe("hymotion_helpers")
realesrgan  = _safe("realesrgan_helpers")
nvtt        = _safe("nvtt_helpers")

# ── Status map (for operator UI) ──────────────────────────────────────────────
STATUS: dict = {
    "hunyuan3d":  hunyuan3d  is not None,
    "shap_e":     shap_e     is not None,
    "point_e":    point_e    is not None,
    "rignet":     rignet     is not None,
    "zoedepth":   zoedepth   is not None,
    "img2mesh":   img2mesh   is not None,
    "imageto3d":  imageto3d  is not None,
    "motion_gen": motion_gen is not None,
    "get3d":      get3d      is not None,
    "stylegan2":  stylegan2  is not None,
    "instantngp": instantngp is not None,
    "gradio":     gradio     is not None,
    "hymotion":   hymotion   is not None,
    "realesrgan": realesrgan is not None,
    "nvtt":       nvtt       is not None,
}

# Backends that are active (imported successfully)
ACTIVE_BACKENDS: list = [k for k, v in STATUS.items() if v]


def active_count() -> int:
    """Return the number of currently-active AI backends."""
    return len(ACTIVE_BACKENDS)


def status_string() -> str:
    """Return a single-line status string for the UI."""
    if not ACTIVE_BACKENDS:
        return "No AI backends active — connect Mossy AI for AI features"
    return f"{len(ACTIVE_BACKENDS)} AI backend(s) active: {', '.join(ACTIVE_BACKENDS)}"


# ── Convenience: delegate to Mossy AI when local backends unavailable ─────────

def ask_mossy_for_mesh(prompt: str, style: str = "realistic", image_b64: str = None):
    """
    Generate a 3-D mesh via Mossy AI.  Falls back to local Shape-E or Point-E
    when Mossy is offline.

    Returns a dict ``{"status": "success", "obj_data": "...", "mesh_name": "..."}``
    or ``None`` on failure.
    """
    parent = __package__.rsplit(".", 1)[0]
    mossy = _safe("mossy_link")
    if mossy:
        try:
            result = mossy.generate_mesh(prompt, image_b64, style=style)
            if result and result.get("status") == "success":
                return result
        except Exception:
            pass

    # Local fallback chain: Shape-E → Point-E
    if shap_e and hasattr(shap_e, "generate_mesh"):
        try:
            return shap_e.generate_mesh(prompt)  # type: ignore[attr-defined]
        except Exception:
            pass
    if point_e and hasattr(point_e, "generate_mesh"):
        try:
            return point_e.generate_mesh(prompt)  # type: ignore[attr-defined]
        except Exception:
            pass
    return None


def auto_rig(obj, skeleton: str = "fo4_biped"):
    """
    Auto-rig *obj* using RigNet (local) or ask Mossy AI to do it.

    :param skeleton: Target skeleton preset. ``"fo4_biped"`` uses the correct
                     FO4 bone names for humanoid NPCs.
    :returns:        ``(success: bool, message: str)``
    """
    if rignet and hasattr(rignet, "auto_rig"):
        try:
            return rignet.auto_rig(obj, skeleton=skeleton)  # type: ignore[attr-defined]
        except Exception as e:
            return False, f"RigNet error: {e}"

    mossy = _safe("mossy_link")
    if mossy:
        query = (
            f"Auto-rig this object for Fallout 4 with skeleton '{skeleton}'. "
            "Return the correct FO4 bone names and parent hierarchy."
        )
        scene_info = {
            "object": obj.name if obj else "unknown",
            "skeleton": skeleton,
            "task": "auto_rig",
        }
        answer = mossy.analyze_scene(scene_info)
        if answer:
            return True, f"Mossy AI advice: {answer}"

    return False, "RigNet not installed and Mossy AI is offline."


__all__ = [
    "STATUS", "ACTIVE_BACKENDS",
    "active_count", "status_string",
    "ask_mossy_for_mesh", "auto_rig",
    # Backend module references
    "hunyuan3d", "shap_e", "point_e", "rignet", "zoedepth",
    "img2mesh", "imageto3d", "motion_gen", "get3d",
    "stylegan2", "instantngp", "gradio", "hymotion",
    "realesrgan", "nvtt",
]
