"""Integration wrapper for skarndev/umodel_tools Blender add-on.

UModel Tools is a full Blender addon for working with Unreal Engine assets.
We provide a downloader to get it from GitHub to D:/blender_tools/.

NOTE: UModel Tools must be installed as a SEPARATE addon in Blender.
This helper only downloads it - it does NOT auto-load/register it to avoid conflicts.

Auto-downloads to D:/blender_tools/ to keep it separate from the addon.
"""

from __future__ import annotations

import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path


# Download to D: drive by default to keep separate from addon
DEFAULT_TOOL_DIR = Path("D:/blender_tools/umodel_tools")

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOL_DIR = ADDON_ROOT / "tools" / "umodel_tools"


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


def download_latest():
    """Download the upstream repo zip to D:/blender_tools/ or fallback location."""
    tool_dir = get_tool_dir()

    if tool_dir.exists():
        return True, f"UModel Tools directory already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)

    candidates = [
        "https://github.com/skarndev/umodel_tools/archive/refs/heads/main.zip",
        "https://github.com/skarndev/umodel_tools/archive/refs/heads/master.zip",
    ]

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "umodel_tools.zip"
                print(f"Downloading UModel Tools from {url}...")
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    zf.extractall(tmpdir)

                extracted_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
                if not extracted_dirs:
                    raise RuntimeError("Downloaded zip contained no directories")

                src = extracted_dirs[0]
                shutil.move(str(src), str(tool_dir))

            return True, f"Downloaded UModel Tools to {tool_dir}. Install it manually as a separate Blender addon."
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download UModel Tools: {last_error or 'unknown error'}"


def status():
    """Return (ready, message) tuple for UI display."""
    tool_dir = get_tool_dir()
    addon_zip = tool_dir / "umodel_tools" / "__init__.py"

    if tool_dir.exists() and addon_zip.exists():
        return True, f"UModel Tools downloaded at {tool_dir}. Install manually in Blender."
    if tool_dir.exists():
        return False, f"UModel Tools at {tool_dir} appears incomplete"
    return False, f"UModel Tools not installed (will download to {tool_dir})"


def addon_path() -> str:
    """Return the expected path as a string for display."""
    return str(get_tool_dir())


def register():
    """No-op - UModel Tools must be installed as a separate Blender addon.

    We do NOT auto-load/register it here because:
    1. It's a full Blender addon that needs its own preferences
    2. Auto-loading causes KeyError conflicts with Blender's addon system
    3. Users should install it manually via Blender's addon preferences
    """
    pass


def unregister():
    """No-op - UModel Tools is managed separately."""
    pass