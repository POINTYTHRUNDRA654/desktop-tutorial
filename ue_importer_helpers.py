"""Integration wrapper for the external Blender-UE4-Importer add-on.

This dynamically loads and registers the upstream importer from tools/Blender-UE4-Importer
so our add-on can expose its operators without forcing users to install a second add-on.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path


ADDON_ROOT = Path(__file__).resolve().parent
IMPORTER_DIR = ADDON_ROOT / "tools" / "Blender-UE4-Importer"
IMPORTER_INIT = IMPORTER_DIR / "__init__.py"

_state: dict[str, object | None] = {
    "module": None,
    "status": "uninitialized",
    "error": None,
}


def _load_module():
    """Load the upstream importer module from its __init__.py.

    Blender's Extension policy checker (4.2+) forbids:
      1. Registering bare (non-namespaced) top-level names in sys.modules
      2. Injecting paths into sys.path that point outside the extension
    The upstream Blender-UE4-Importer add-on does both.  We fix this by:
      a. Registering the module under a namespaced key derived from our own
         package name (e.g. bl_ext.user_default.blender_game_tools.fo4_blender_ue4_importer).
      b. Snapshotting sys.path/sys.modules before exec_module() and then:
         - Removing any new sys.path entry pointing into IMPORTER_DIR.
         - Moving any bare sub-module names the importer registered (uasset,
           umat, umesh, umap, register_helper …) to namespaced keys so Blender
           no longer reports policy violations.  The already-loaded code keeps
           working because it holds direct references to the module objects.
    """

    if not IMPORTER_INIT.exists():
        _state["status"] = "missing"
        _state["error"] = f"Missing importer at {IMPORTER_DIR}"
        return False, _state["error"]

    # Build a namespaced module key.
    # Inside Blender's Extension system __name__ is something like
    # "bl_ext.user_default.blender_game_tools.ue_importer_helpers".
    # Outside Blender (pytest) it is just "ue_importer_helpers".
    if "." in __name__:
        _pkg = __name__.rsplit(".", 1)[0]
    else:
        _pkg = ADDON_ROOT.name  # fallback: "blender_game_tools"
    _module_key = f"{_pkg}.fo4_blender_ue4_importer"

    try:
        spec = importlib.util.spec_from_file_location(_module_key, str(IMPORTER_INIT))
        if not spec or not spec.loader:
            raise ImportError("Unable to create spec for Blender-UE4-Importer")

        module = importlib.util.module_from_spec(spec)

        # Snapshot state before executing so we can undo policy-violating side-effects
        _path_before = list(sys.path)
        _mods_before = set(sys.modules.keys())

        sys.modules[_module_key] = module
        spec.loader.exec_module(module)

        # ── 1. Restore sys.path ──────────────────────────────────────────────
        # Remove any entries the importer injected that point into IMPORTER_DIR.
        _importer_real = str(IMPORTER_DIR.resolve())
        sys.path[:] = [
            p for p in sys.path
            if p in _path_before or os.path.realpath(p) != _importer_real
        ]

        # ── 2. Relocate bare top-level sub-module names ──────────────────────
        # The upstream importer may have imported uasset, umat, umesh, umap,
        # register_helper etc. as bare names.  Move them under our namespaced
        # prefix so Blender's policy checker no longer flags them.
        _new_keys = set(sys.modules.keys()) - _mods_before - {_module_key}
        _importer_dir_str = str(IMPORTER_DIR)
        for key in list(_new_keys):
            if "." in key:
                continue  # already namespaced – leave as-is
            mod_obj = sys.modules.get(key)
            if mod_obj is None:
                continue
            mod_file = getattr(mod_obj, "__file__", None) or ""
            if _importer_dir_str in mod_file:
                sys.modules[f"{_module_key}.{key}"] = mod_obj
                del sys.modules[key]

        _state["module"] = module
        _state["status"] = "loaded"
        _state["error"] = None
        return True, "Loaded UE importer"
    except Exception as exc:  # noqa: BLE001 - we want the raw message for UI
        _state["module"] = None
        _state["status"] = "error"
        _state["error"] = str(exc)
        return False, f"Failed to load UE importer: {exc}"


def download_latest():
    """Download the upstream importer zip and place it in the expected folder."""

    if IMPORTER_DIR.exists():
        return True, "Importer directory already exists; skipping download"

    parent = IMPORTER_DIR.parent
    parent.mkdir(parents=True, exist_ok=True)

    # Try common default branches in order
    candidates = [
        "https://github.com/Waffle1434/Blender-UE4-Importer/archive/refs/heads/main.zip",
        "https://github.com/Waffle1434/Blender-UE4-Importer/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "importer.zip"
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(IMPORTER_DIR))

            return True, f"Downloaded UE importer from {url}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download UE importer: {last_error or 'unknown error'}"


def status():
    """Return (ready, message) tuple for UI display."""

    if _state["status"] == "registered":
        return True, "UE importer ready (operators available)"
    if _state["status"] == "loaded":
        return True, "UE importer loaded"
    if _state["status"] == "missing":
        return False, "UE importer repo missing; clone to tools/Blender-UE4-Importer"
    if _state["status"] == "error":
        return False, f"UE importer error: {_state['error']}"
    return False, "UE importer not initialized"


def importer_path() -> str:
    """Return the expected path as a string for display."""

    return str(IMPORTER_DIR)


def register():
    """Load and register the upstream importer if present."""

    ok, _ = _load_module()
    if not ok:
        return

    module = _state.get("module")
    try:
        if module and hasattr(module, "register"):
            try:
                module.register()
            except Exception as exc:
                # Blender raises when a class is registered a second time.
                # That means the classes are already active - treat as success.
                if "already registered" not in str(exc) and "as a subclass" not in str(exc):
                    raise
            _state["status"] = "registered"
        else:
            _state["status"] = "error"
            _state["error"] = "Importer module missing register()"
    except Exception as exc:  # noqa: BLE001 - propagate to UI text only
        _state["status"] = "error"
        _state["error"] = str(exc)


def unregister():
    """Unregister the upstream importer when our add-on unloads."""

    module = _state.get("module")
    try:
        if module and hasattr(module, "unregister"):
            module.unregister()
    except Exception:
        # Silence unload issues; Blender is shutting down
        pass
    finally:
        # Remove all sys.modules entries that belong to this importer
        # (both the root namespaced key and any sub-module keys).
        mod_name = getattr(module, "__name__", None) if module else None
        if mod_name:
            prefix = mod_name + "."
            for key in [k for k in list(sys.modules) if k == mod_name or k.startswith(prefix)]:
                sys.modules.pop(key, None)
        _state["module"] = None
        _state["status"] = "uninitialized"
        _state["error"] = None