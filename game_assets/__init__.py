"""
game_assets — External game asset import/export package
=========================================================
Aggregate package for all external-game asset pipeline helpers:
Unreal Engine, Unity, UModel, Asset Studio, Asset Ripper.

These are optional integrations — each module is imported safely and is
``None`` when the external tool is not installed.  The ``STATUS`` dict lets
operators check availability before showing UI elements.

Usage::

    from .game_assets import STATUS
    if STATUS["asset_ripper"]:
        from .game_assets import asset_ripper
        asset_ripper.extract(ba2_path, out_dir)
"""

import importlib
import sys


def _safe(name: str):
    pkg = __package__.rsplit(".", 1)[0]
    full = f"{pkg}.{name}"
    try:
        if full in sys.modules:
            return importlib.reload(sys.modules[full])
        return importlib.import_module(full)
    except Exception:
        return None


# ── Unreal Engine ──────────────────────────────────────────────────────────────
ue_importer     = _safe("ue_importer_helpers")
umodel          = _safe("umodel_helpers")
umodel_tools    = _safe("umodel_tools_helpers")
unreal_assets   = _safe("unreal_game_assets")

# ── Unity ─────────────────────────────────────────────────────────────────────
unity_fbx       = _safe("unity_fbx_importer_helpers")
unity_assets    = _safe("unity_game_assets")

# ── Generic extractors ────────────────────────────────────────────────────────
asset_studio    = _safe("asset_studio_helpers")
asset_ripper    = _safe("asset_ripper_helpers")

# ── FO4 game assets browser ───────────────────────────────────────────────────
fo4_assets      = _safe("fo4_game_assets")

STATUS: dict = {
    "ue_importer":   ue_importer   is not None,
    "umodel":        umodel        is not None,
    "umodel_tools":  umodel_tools  is not None,
    "unreal_assets": unreal_assets is not None,
    "unity_fbx":     unity_fbx     is not None,
    "unity_assets":  unity_assets  is not None,
    "asset_studio":  asset_studio  is not None,
    "asset_ripper":  asset_ripper  is not None,
    "fo4_assets":    fo4_assets    is not None,
}

ACTIVE: list = [k for k, v in STATUS.items() if v]


def status_string() -> str:
    if not ACTIVE:
        return "No external game asset tools active"
    return f"{len(ACTIVE)} game asset tool(s) active: {', '.join(ACTIVE)}"


__all__ = [
    "STATUS", "ACTIVE", "status_string",
    "ue_importer", "umodel", "umodel_tools", "unreal_assets",
    "unity_fbx", "unity_assets",
    "asset_studio", "asset_ripper", "fo4_assets",
]
