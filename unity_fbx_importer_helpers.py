"""Helper for managing Varneon's UnityFBX-To-Blender-Importer repository.

This tool is a Unity Editor extension, not a Blender add-on. We track its
presence and provide a download helper so users can keep it alongside this
workspace tooling.
"""

from __future__ import annotations

import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path


ADDON_ROOT = Path(__file__).resolve().parent
TOOL_DIR = ADDON_ROOT / "tools" / "UnityFBX-To-Blender-Importer"
README_FILE = TOOL_DIR / "README.md"


def status():
    """Return (ready, message) tuple for UI display."""

    if TOOL_DIR.exists() and README_FILE.exists():
        return True, "Unity FBX importer repo ready (Unity package available)"
    if TOOL_DIR.exists():
        return False, "Unity FBX importer repo found but appears incomplete"
    return False, "Unity FBX importer repo missing"


def repo_path() -> str:
    """Return expected local repository path for UI display."""

    return str(TOOL_DIR)


def package_path() -> str:
    """Return Unity package subfolder path for quick reference."""

    return str(TOOL_DIR / "Packages" / "com.varneon.fbx-to-blender-importer")


def download_latest():
    """Download the upstream repo zip to tools/UnityFBX-To-Blender-Importer."""

    if TOOL_DIR.exists():
        return True, "Unity FBX importer directory already exists; skipping download"

    TOOL_DIR.parent.mkdir(parents=True, exist_ok=True)
    candidates = [
        "https://github.com/Varneon/UnityFBX-To-Blender-Importer/archive/refs/heads/main.zip",
        "https://github.com/Varneon/UnityFBX-To-Blender-Importer/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "unity_fbx_to_blender_importer.zip"
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(TOOL_DIR))

            return True, f"Downloaded Unity FBX importer from {url}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download Unity FBX importer: {last_error or 'unknown error'}"


def register():
    """No-op to fit add-on module lifecycle."""

    return None


def unregister():
    """No-op to fit add-on module lifecycle."""

    return None