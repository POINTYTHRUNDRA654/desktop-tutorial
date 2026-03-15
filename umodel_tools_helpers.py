"""Integration wrapper for skarndev/umodel_tools Blender add-on.

Loads and registers the upstream add-on from tools/umodel_tools/ so we can
expose its operators without a separate install. Provides a downloader to
bootstrap the repository when missing.
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
TOOL_DIR = ADDON_ROOT / "tools" / "umodel_tools"
PACKAGE_DIR = TOOL_DIR / "umodel_tools"
INIT_FILE = PACKAGE_DIR / "__init__.py"

_state: dict[str, object | None] = {
    "module": None,
    "status": "uninitialized",
    "error": None,
}


def _load_module():
    """Load the upstream umodel_tools package from disk."""

    if not INIT_FILE.exists():
        _state["status"] = "missing"
        _state["error"] = f"Missing umodel_tools at {TOOL_DIR}"
        return False, _state["error"]

    try:
        spec = importlib.util.spec_from_file_location(
            "umodel_tools",
            str(INIT_FILE),
            submodule_search_locations=[str(PACKAGE_DIR)],
        )
        if not spec or not spec.loader:
            raise ImportError("Unable to create spec for umodel_tools")

        module = importlib.util.module_from_spec(spec)
        sys.modules["umodel_tools"] = module
        sys.modules["fo4_umodel_tools"] = module
        spec.loader.exec_module(module)

        _state["module"] = module
        _state["status"] = "loaded"
        _state["error"] = None
        return True, "Loaded UModel Tools"
    except Exception as exc:  # noqa: BLE001 - raw message is useful in UI
        _state["module"] = None
        _state["status"] = "error"
        _state["error"] = str(exc)
        return False, f"Failed to load UModel Tools: {exc}"


def download_latest():
    """Download the upstream repo zip to tools/umodel_tools if missing."""

    if TOOL_DIR.exists():
        return True, "UModel Tools directory already exists; skipping download"

    TOOL_DIR.parent.mkdir(parents=True, exist_ok=True)

    candidates = [
        "https://github.com/skarndev/umodel_tools/archive/refs/heads/main.zip",
        "https://github.com/skarndev/umodel_tools/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "umodel_tools.zip"
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(TOOL_DIR))

            return True, f"Downloaded UModel Tools from {url}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download UModel Tools: {last_error or 'unknown error'}"


def status():
    """Return (ready, message) tuple for UI display."""

    if _state["status"] == "registered":
        return True, "UModel Tools ready (operators available)"
    if _state["status"] == "loaded":
        return True, "UModel Tools loaded"
    if _state["status"] == "missing":
        return False, "UModel Tools repo missing; clone or download into tools/umodel_tools"
    if _state["status"] == "error":
        return False, f"UModel Tools error: {_state['error']}"
    return False, "UModel Tools not initialized"


def addon_path() -> str:
    """Return the expected path as a string for display."""

    return str(TOOL_DIR)


def register():
    """Load and register the upstream add-on if present."""

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
            _state["error"] = "umodel_tools module missing register()"
    except Exception as exc:  # noqa: BLE001
        _state["status"] = "error"
        _state["error"] = str(exc)


def unregister():
    """Unregister the upstream add-on when we unload."""

    module = _state.get("module")
    try:
        if module and hasattr(module, "unregister"):
            module.unregister()
    except Exception:
        pass
    finally:
        _state["module"] = None
        _state["status"] = "uninitialized"
        _state["error"] = None