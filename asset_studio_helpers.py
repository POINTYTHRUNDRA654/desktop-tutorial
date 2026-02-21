"""Helper for managing Perfare's AssetStudio repository.

AssetStudio is a Unity asset extraction tool. We track its presence on disk
and provide a download helper so users can keep it alongside this workspace.
"""

from __future__ import annotations

import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path


ADDON_ROOT = Path(__file__).resolve().parent
TOOL_DIR = ADDON_ROOT / "tools" / "AssetStudio"
README_FILE = TOOL_DIR / "README.md"


def status() -> tuple[bool, str]:
    """Return (ready, message) tuple for UI display."""

    if TOOL_DIR.exists() and README_FILE.exists():
        return True, "AssetStudio repo ready"
    if TOOL_DIR.exists():
        return False, "AssetStudio repo found but appears incomplete"
    return False, "AssetStudio repo missing"


def repo_path() -> str:
    """Return expected local repository path for UI display."""

    return str(TOOL_DIR)


def download_latest() -> tuple[bool, str]:
    """Download the upstream repo zip to tools/AssetStudio."""

    if TOOL_DIR.exists():
        return True, "AssetStudio directory already exists; skipping download"

    TOOL_DIR.parent.mkdir(parents=True, exist_ok=True)
    candidates = [
        "https://github.com/Perfare/AssetStudio/archive/refs/heads/main.zip",
        "https://github.com/Perfare/AssetStudio/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "asset_studio.zip"
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(TOOL_DIR))

            return True, f"Downloaded AssetStudio from {url}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download AssetStudio: {last_error or 'unknown error'}"


def register() -> None:
    """No-op to fit add-on module lifecycle."""

    return None


def unregister() -> None:
    """No-op to fit add-on module lifecycle."""

    return None
