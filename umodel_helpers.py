"""Helper for managing UModel (UE Viewer) tool.

UModel (also known as UE Viewer) is a tool by Konstantin Nosov (Gildor) for
viewing and extracting assets from Unreal Engine games.

Credit: UModel by Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel

Auto-downloads to D:/blender_tools/ to keep it separate from the addon.
"""

from __future__ import annotations

import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path


# Download to D: drive by default to keep separate from addon
DEFAULT_TOOL_DIR = Path("D:/blender_tools/umodel")

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOL_DIR = ADDON_ROOT / "tools" / "umodel"


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

    # Check for umodel.exe
    umodel_exe = tool_dir / "umodel.exe"
    if umodel_exe.exists():
        return True, f"UModel ready at {tool_dir}"

    # Check if directory exists but exe is missing
    if tool_dir.exists():
        return False, f"UModel at {tool_dir} appears incomplete (missing umodel.exe)"

    return False, f"UModel not installed (will download to {tool_dir})"


def tool_path() -> str:
    """Return expected tool directory path for UI display."""
    return str(get_tool_dir())


def executable_path() -> str | None:
    """Return path to umodel.exe if it exists, None otherwise."""
    tool_dir = get_tool_dir()
    umodel_exe = tool_dir / "umodel.exe"

    if umodel_exe.exists():
        return str(umodel_exe)
    return None


def download_latest() -> tuple[bool, str]:
    """Download UModel from a known stable source to D:/blender_tools/ or fallback location.

    Note: UModel by Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel

    UModel doesn't have an official GitHub repository with automated releases.
    This function will attempt to download from a known stable mirror or provide
    instructions for manual download.
    """
    tool_dir = get_tool_dir()

    if tool_dir.exists() and (tool_dir / "umodel.exe").exists():
        return True, f"UModel already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)

    # UModel download locations (these may need to be updated periodically)
    # Since gildor.org doesn't provide direct stable download URLs for automation,
    # we'll try known stable versions or mirrors

    # Note: Users can manually download from https://www.gildor.org/en/projects/umodel
    # and extract to the tool directory

    candidates = [
        # These URLs would need to be actual stable download links
        # For now, we'll provide manual download instructions
    ]

    # If we have no automated download URLs, provide manual download instructions
    if not candidates:
        return False, (
            f"UModel requires manual download. Please:\n"
            f"1. Visit https://www.gildor.org/en/projects/umodel\n"
            f"2. Download the latest UModel build for Windows\n"
            f"3. Extract the ZIP to: {tool_dir}\n"
            f"4. Ensure umodel.exe is in the directory\n\n"
            f"Credit: UModel by Konstantin Nosov (Gildor)"
        )

    last_error = None
    for url in candidates:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "umodel.zip"
                print(f"Downloading UModel from {url}...")
                urllib.request.urlretrieve(url, zip_path)

                with zipfile.ZipFile(zip_path) as zf:
                    # Extract directly to tool directory
                    zf.extractall(tool_dir)

                # Verify umodel.exe exists
                umodel_exe = tool_dir / "umodel.exe"
                if not umodel_exe.exists():
                    # Maybe it's in a subdirectory
                    for exe in tool_dir.rglob("umodel.exe"):
                        # Move contents to root of tool_dir
                        parent = exe.parent
                        for item in parent.iterdir():
                            shutil.move(str(item), str(tool_dir / item.name))
                        break

                return True, f"Downloaded UModel to {tool_dir}. Credit: Konstantin Nosov (Gildor)"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    return False, f"Failed to download UModel: {last_error or 'unknown error'}"


def open_download_page() -> tuple[bool, str]:
    """Open the official UModel download page in the user's browser."""
    import webbrowser

    url = "https://www.gildor.org/en/projects/umodel"
    try:
        webbrowser.open(url)
        return True, f"Opened UModel download page. After downloading, extract to: {get_tool_dir()}"
    except Exception as e:
        return False, f"Failed to open browser: {str(e)}"


def register() -> None:
    """No-op to fit add-on module lifecycle."""
    return None


def unregister() -> None:
    """No-op to fit add-on module lifecycle."""
    return None
