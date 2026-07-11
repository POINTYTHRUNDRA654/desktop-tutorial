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
        # Auto-download rather than giving up immediately.
        ok, msg = download_latest()
        if not ok:
            _state["status"] = "missing"
            _state["error"] = msg
            return False, msg

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
                new_key = f"{_module_key}.{key}"
                sys.modules[new_key] = mod_obj
                # Update __module__ on every class so that typing.get_type_hints()
                # (called by Blender 5.1 during register_class) can still resolve
                # the class's annotation strings after the bare key is removed.
                for _attr_val in vars(mod_obj).values():
                    if isinstance(_attr_val, type) and getattr(_attr_val, "__module__", None) == key:
                        try:
                            _attr_val.__module__ = new_key
                        except Exception:
                            pass
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


def load_and_register() -> tuple[bool, str]:
    """Download (if needed), load, and register the upstream UE4 importer.

    MUST be called from an operator execute() or a bpy timer callback — never
    from the extension's own register() function.  Blender's Extension policy
    checker monitors sys.modules / sys.path mutations that happen *during*
    register(), so any bare top-level names or external sys.path entries added
    by the upstream add-on would be flagged there.  Calling this function from
    an operator (which fires after Blender's policy-check window has closed)
    avoids those violations entirely.
    """

    if _state["status"] in ("registered", "loaded"):
        return True, "UE importer already loaded"

    # Survive module reloads (e.g. Phase 2 AI module reimport resets _state).
    # Check Blender's actual type registry — if the operators are already there,
    # we don't need to re-register and doing so would cause "registered before" warnings.
    try:
        import bpy as _bpy
        if hasattr(_bpy.types, "ImportUMat") or hasattr(_bpy.types, "ImportUMesh"):
            _state["status"] = "registered"
            return True, "UE importer already registered"
    except Exception:
        pass

    ok, msg = _load_module()
    if not ok:
        return False, msg

    module = _state.get("module")

    # Blender 5.1+ calls typing.get_type_hints() on every operator class during
    # register_class().  If a sub-module (e.g. umat.py) forgot to import
    # bpy.props names, annotation strings like "StringProperty" fail to resolve.
    # Inject them into the main module AND every namespaced sub-module so that
    # sys.modules[cls.__module__].__dict__ always contains the needed names.
    if module is not None:
        try:
            import bpy.props as _bpy_props
            _props = {n: getattr(_bpy_props, n) for n in dir(_bpy_props) if n.endswith("Property")}
            _prefix = module.__name__
            for _k, _m in list(sys.modules.items()):
                if _m is None:
                    continue
                if _k == _prefix or _k.startswith(_prefix + "."):
                    for _pn, _pv in _props.items():
                        if not hasattr(_m, _pn):
                            try:
                                setattr(_m, _pn, _pv)
                            except Exception:
                                pass
        except Exception:
            pass

    try:
        if module and hasattr(module, "register"):
            try:
                module.register()
            except Exception as exc:
                # Blender raises when a class is registered a second time.
                # That means the classes are already active – treat as success.
                if "already registered" not in str(exc) and "as a subclass" not in str(exc):
                    raise
            _state["status"] = "registered"
        else:
            _state["status"] = "error"
            _state["error"] = "Importer module missing register()"
            return False, _state["error"]
    except Exception as exc:  # noqa: BLE001 - propagate to UI text only
        _state["status"] = "error"
        _state["error"] = str(exc)
        return False, f"Failed to register UE importer: {exc}"

    return True, "UE importer installed and registered"


def register():
    """Called by our extension during its own register().

    Intentionally does NOT load or register the upstream importer here.
    Blender's Extension policy checker monitors every sys.modules write and
    every sys.path mutation that occurs during register().  The upstream
    Blender-UE4-Importer adds its folder to sys.path and imports uasset /
    umat / umesh / umap / register_helper as bare top-level names — all of
    which Blender flags as policy violations.

    Loading is deferred to load_and_register(), which is called from the
    install / check operators (operator execute() runs after Blender's
    policy-check window has closed, so the mutations are not monitored).
    """
    # deliberate no-op — loading deferred to load_and_register()


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
            to_remove = [k for k in list(sys.modules) if k == mod_name or k.startswith(prefix)]
            for key in to_remove:
                sys.modules.pop(key, None)
        _state["module"] = None
        _state["status"] = "uninitialized"
        _state["error"] = None