"""
Fallout 4 Mod Assistant — Professional Blender add-on for Fallout 4 modding.

Rebuild roadmap (each piece is independently testable):
  Piece 1 ✓ — Core + Mesh Tools (this file)
  Piece 2   — NIF v25 Export via PyNifly
  Piece 3   — Textures / DDS conversion (NVTT / texconv)
  Piece 4   — Animation / Rigging
  Piece 5   — Advanced tools (AI, quest, NPC, etc.)

NIF format target: version 25 (Fallout 4) via PyNifly v25 by BadDog/BadDogSkyrim.
See DEVELOPMENT_NOTES.md for build status and module descriptions.
"""

bl_info = {
    "name": "Fallout 4 Mod Assistant",
    "author": "Tutorial Team",
    "version": (5, 1, 0),
    "blender": (5, 0, 0),   # Targets Blender 5.x (Extension format)
    "location": "View3D > Sidebar > Fallout 4",
    "description": (
        "Professional Fallout 4 modding tools for Blender 5. "
        "NIF v25 export via PyNifly, mesh prep (triangulate / UV / transforms), "
        "UCX_ collision generation, FO4 BSTriShape 65k limit validation, "
        "DDS texture conversion, animation, and more."
    ),
    "warning": "Requires PyNifly v25 (BadDog/BadDogSkyrim) for NIF export",
    "doc_url": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
    "category": "Import-Export",
}


import bpy
import importlib
import sys
import traceback


def _import(name: str):
    """Import a submodule of this package safely.

    On addon reload (F8 or enable/disable cycle) the module may already be
    in sys.modules with stale class objects.  Calling importlib.reload()
    ensures Blender always gets fresh class definitions, which prevents the
    'unknown operator' / 'no active buttons' symptom caused by stale types.
    """
    full = f"{__package__}.{name}"
    try:
        if full in sys.modules:
            try:
                return importlib.reload(sys.modules[full])
            except Exception:
                # Reload failed (e.g. circular import on first reload).
                # Remove the broken entry and do a clean import.
                sys.modules.pop(full, None)
        return importlib.import_module(full)
    except Exception as exc:
        print(f"[FO4] ✗ Could not load '{name}': {exc}")
        traceback.print_exc()
        sys.modules.pop(full, None)
        return None


# ── Core modules ──────────────────────────────────────────────────────────────
# Load order matters: tutorial_operators and setup_operators MUST be imported
# before ui_panels so their classes are registered in bpy.types before the
# panel draw() methods run and check hasattr(bpy.types, 'FO4_OT_...').

preferences        = _import("preferences")
tutorial_operators = _import("tutorial_operators")   # Must be before ui_panels
setup_operators    = _import("setup_operators")       # Must be before ui_panels
operators          = _import("operators")
ui_panels          = _import("ui_panels")

# ── Registration list ─────────────────────────────────────────────────────────
# Modules are registered in this order and unregistered in reverse order.
# None entries (failed imports) are silently skipped.

_MODULES = [m for m in [
    preferences,
    tutorial_operators,   # registers FO4_OT_StartTutorial etc. BEFORE ui_panels
    setup_operators,      # registers FO4_OT_InstallPythonDeps etc. BEFORE ui_panels
    operators,
    ui_panels,
] if m is not None]


def register():
    print(
        f"[FO4] ── Registering Fallout 4 Mod Assistant v5.1 "
        f"(Blender {bpy.app.version_string}) ──"
    )
    for mod in _MODULES:
        label = getattr(mod, "__name__", str(mod)).split(".")[-1]
        try:
            mod.register()
            print(f"[FO4]   ✓ {label}")
        except Exception as exc:
            print(f"[FO4]   ✗ {label}: {exc}")
            traceback.print_exc()
    print(
        "[FO4] Ready — open the 'Fallout 4' tab in the N-panel "
        "(press N in the 3D Viewport)"
    )


def unregister():
    print("[FO4] Unregistering Fallout 4 Mod Assistant")
    for mod in reversed(_MODULES):
        label = getattr(mod, "__name__", str(mod)).split(".")[-1]
        try:
            mod.unregister()
        except Exception as exc:
            print(f"[FO4]   ✗ unregister {label}: {exc}")


if __name__ == "__main__":
    register()
