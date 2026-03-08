"""Helper for managing the AssetRipper/AssetRipper repository.

AssetRipper is a Unity asset extraction tool. We track its presence on disk
and provide a download helper so users can keep it alongside this workspace.

Auto-downloads to D:/blender_tools/ to keep it separate from the addon.
"""

from __future__ import annotations

import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path


# Download to D: drive by default to keep separate from addon
DEFAULT_TOOL_DIR = Path("D:/blender_tools/AssetRipper")

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOL_DIR = ADDON_ROOT / "tools" / "AssetRipper"


def get_tool_dir():
    """Get the tool directory, creating parent if needed."""
    # Try D: drive first
    try:
        if DEFAULT_TOOL_DIR.drive and Path(DEFAULT_TOOL_DIR.drive).exists():
            DEFAULT_TOOL_DIR.parent.mkdir(parents=True, exist_ok=True)
            return DEFAULT_TOOL_DIR
    except Exception:
        pass

    # Fallback to addon folder
    FALLBACK_TOOL_DIR.parent.mkdir(parents=True, exist_ok=True)
    return FALLBACK_TOOL_DIR


def status() -> tuple[bool, str]:
    """Return (ready, message) tuple for UI display."""
    tool_dir = get_tool_dir()
    readme_file = tool_dir / "README.md"

    if tool_dir.exists() and readme_file.exists():
        return True, f"AssetRipper ready at {tool_dir}"
    if tool_dir.exists():
        return False, f"AssetRipper at {tool_dir} appears incomplete"
    return False, f"AssetRipper not installed (will download to {tool_dir})"


def repo_path() -> str:
    """Return expected local repository path for UI display."""
    return str(get_tool_dir())


def download_latest() -> tuple[bool, str]:
    """Download the upstream repo zip to D:/blender_tools/ or fallback location."""
    tool_dir = get_tool_dir()

    if tool_dir.exists():
        return True, f"AssetRipper directory already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)
    candidates = [
        "https://github.com/AssetRipper/AssetRipper/archive/refs/heads/main.zip",
        "https://github.com/AssetRipper/AssetRipper/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "asset_ripper.zip"
                print(f"Downloading AssetRipper from {url}...")
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(tool_dir))

            return True, f"Downloaded AssetRipper to {tool_dir}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download AssetRipper: {last_error or 'unknown error'}"


def register() -> None:
    """No-op to fit add-on module lifecycle."""

    return None


def unregister() -> None:
    """No-op to fit add-on module lifecycle."""

    return None
