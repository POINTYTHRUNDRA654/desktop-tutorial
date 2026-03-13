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

    # Accept either the 64-bit or 32-bit executable (both ship in the official zip)
    for name in ("umodel_64.exe", "umodel.exe"):
        if (tool_dir / name).exists():
            return True, f"UModel ready at {tool_dir}"

    # Check if directory exists but exe is missing
    if tool_dir.exists() and any(tool_dir.iterdir()):
        return False, f"UModel at {tool_dir} appears incomplete (missing umodel executable)"

    return False, f"UModel not installed (will download to {tool_dir})"


def tool_path() -> str:
    """Return expected tool directory path for UI display."""
    return str(get_tool_dir())


def executable_path() -> str | None:
    """Return path to the best available umodel executable, or None.

    The official win32 zip ships both ``umodel.exe`` (32-bit) and
    ``umodel_64.exe`` (64-bit).  Prefer the 64-bit build when present.
    """
    tool_dir = get_tool_dir()
    for name in ("umodel_64.exe", "umodel.exe"):
        exe = tool_dir / name
        if exe.exists():
            return str(exe)
    return None


def download_latest() -> tuple[bool, str]:
    """Download UModel from a known stable source to D:/blender_tools/ or fallback location.

    Note: UModel by Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel

    UModel doesn't have an official GitHub repository with automated releases.
    This function will attempt to download from a known stable mirror or provide
    instructions for manual download.
    """
    tool_dir = get_tool_dir()

    if tool_dir.exists() and (
        (tool_dir / "umodel.exe").exists() or (tool_dir / "umodel_64.exe").exists()
    ):
        return True, f"UModel already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)

    # UModel download locations (these may need to be updated periodically)
    # Since gildor.org doesn't provide direct stable download URLs for automation,
    # we'll try known stable versions or mirrors

    # Note: Users can manually download from https://www.gildor.org/en/projects/umodel
    # and extract to the tool directory

    # Direct download from the official host.  The win32 archive bundles
    # both the 32-bit (umodel.exe) and 64-bit (umodel_64.exe) executables.
    candidates = [
        "https://www.gildor.org/downloads/umodel/umodel_win32.zip",
    ]

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

                # Verify at least one umodel executable is present
                umodel_exe = tool_dir / "umodel.exe"
                umodel_64_exe = tool_dir / "umodel_64.exe"
                if not umodel_exe.exists() and not umodel_64_exe.exists():
                    # Maybe everything landed in a subdirectory — flatten it
                    found = list(tool_dir.rglob("umodel.exe")) + list(tool_dir.rglob("umodel_64.exe"))
                    for exe in found:
                        parent = exe.parent
                        if parent != tool_dir:
                            for item in parent.iterdir():
                                dest = tool_dir / item.name
                                if not dest.exists():
                                    shutil.move(str(item), str(dest))
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
