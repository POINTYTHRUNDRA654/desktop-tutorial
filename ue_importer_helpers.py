"""Integration wrapper for the external Blender-UE4-Importer add-on.

This dynamically loads and registers the upstream importer from tools/Blender-UE4-Importer
so our add-on can expose its operators without forcing users to install a second add-on.
"""

from __future__ import annotations

import importlib.util
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
    """Load the upstream importer module from its __init__.py."""

    if not IMPORTER_INIT.exists():
        _state["status"] = "missing"
        _state["error"] = f"Missing importer at {IMPORTER_DIR}"
        return False, _state["error"]

    try:
        spec = importlib.util.spec_from_file_location("fo4_blender_ue4_importer", str(IMPORTER_INIT))
        if not spec or not spec.loader:
            raise ImportError("Unable to create spec for Blender-UE4-Importer")

        module = importlib.util.module_from_spec(spec)
        sys.modules["fo4_blender_ue4_importer"] = module
        spec.loader.exec_module(module)

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
            module.register()
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
        _state["module"] = None
        _state["status"] = "uninitialized"
        _state["error"] = None