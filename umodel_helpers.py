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

# Official download page — shown to the user when automated download fails.
DOWNLOAD_PAGE_URL = "https://www.gildor.org/en/projects/umodel"

# Candidate download URLs tried in order.
# The gildor.org URL is authoritative; the old path and SourceForge mirror
# are kept as fallbacks for cases where the primary URL is temporarily unreachable.
DOWNLOAD_CANDIDATES = [
    "https://www.gildor.org/downloads/umodel/umodel_win32.zip",
    "https://www.gildor.org/downloads/umodel_win32.zip",
    "https://sourceforge.net/projects/ue-viewer.mirror/files/latest/download",
]

EXECUTABLE_NAMES = ("umodel_64.exe", "umodel.exe", "umodel64.exe")

# Browser-like User-Agent and Referer so download servers don't reject the
# request.  Python's default "python-urllib/3.x" UA is blocked by some file
# hosts.  gildor.org also checks the Referer header to prevent hot-linking,
# so we supply the project page as the referrer.
_DOWNLOAD_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.gildor.org/en/projects/umodel",
}


def get_tool_dir():
    """Get the tool directory, creating parent if needed."""
    try:
        from . import preferences  # type: ignore
        tools_root = getattr(preferences.get_preferences(), "tools_root", "") or ""
        if tools_root:
            base = Path(tools_root)
            base.mkdir(parents=True, exist_ok=True)
            return base / "umodel"
    except Exception:
        pass

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


def _candidate_tool_dirs() -> list[Path]:
    """Return possible install roots to check for an existing manual install."""
    candidates = []
    for base in (DEFAULT_TOOL_DIR, FALLBACK_TOOL_DIR):
        candidates.append(base)
        candidates.append(base / "umodel_win32")
        candidates.append(base / "UModel")
        try:
            parent = base.parent
            if parent.exists():
                for child in parent.iterdir():
                    if child.is_dir() and "umodel" in child.name.lower():
                        candidates.append(child)
        except Exception:
            pass

    seen = set()
    unique = []
    for path in candidates:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def _find_existing_installation() -> tuple[Path | None, Path | None]:
    """Locate an existing UModel installation, even if nested."""
    for root in _candidate_tool_dirs():
        try:
            for name in EXECUTABLE_NAMES:
                exe = root / name
                if exe.exists():
                    return exe.parent, exe

            for child in root.iterdir():
                if not child.is_dir():
                    continue
                for name in EXECUTABLE_NAMES:
                    exe = child / name
                    if exe.exists():
                        return exe.parent, exe
        except Exception:
            continue

    return None, None


def status() -> tuple[bool, str]:
    """Return (ready, message) tuple for UI display."""
    found_dir, exe = _find_existing_installation()
    if exe:
        return True, f"UModel ready at {found_dir}"

    tool_dir = get_tool_dir()
    for name in EXECUTABLE_NAMES:
        if (tool_dir / name).exists():
            return True, f"UModel ready at {tool_dir}"

    # Check if directory exists but exe is missing
    if tool_dir.exists() and any(tool_dir.iterdir()):
        return False, f"UModel at {tool_dir} appears incomplete (missing umodel executable)"

    return False, f"UModel not installed (will download to {tool_dir})"


def tool_path() -> str:
    """Return expected tool directory path for UI display."""
    found_dir, _ = _find_existing_installation()
    return str(found_dir or get_tool_dir())


def executable_path() -> str | None:
    """Return path to the best available umodel executable, or None.

    The official win32 zip ships both ``umodel.exe`` (32-bit) and
    ``umodel_64.exe`` (64-bit).  Prefer the 64-bit build when present.
    """
    _, exe = _find_existing_installation()
    return str(exe) if exe else None


def download_latest() -> tuple[bool, str]:
    """Download UModel from a known stable source to D:/blender_tools/ or fallback location.

    Tries each URL in DOWNLOAD_CANDIDATES in order, using a browser-like
    User-Agent so the download server does not reject the request.
    If every URL fails, returns a failure message with manual-download
    instructions so the user knows exactly what to do next.

    Credit: UModel by Konstantin Nosov (Gildor) — https://www.gildor.org/en/projects/umodel
    """
    existing_dir, existing_exe = _find_existing_installation()
    if existing_exe:
        return True, f"UModel already exists at {existing_dir}"

    tool_dir = get_tool_dir()

    if tool_dir.exists() and any((tool_dir / name).exists() for name in EXECUTABLE_NAMES):
        return True, f"UModel already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)

    last_error = None
    for url in DOWNLOAD_CANDIDATES:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                zip_path = Path(tmpdir) / "umodel.zip"
                print(f"Downloading UModel from {url}...")
                req = urllib.request.Request(url, headers=_DOWNLOAD_HEADERS)
                with urllib.request.urlopen(req) as response:
                    zip_path.write_bytes(response.read())

                with zipfile.ZipFile(zip_path) as zf:
                    # Extract directly to tool directory
                    zf.extractall(tool_dir)

                # Verify at least one umodel executable is present
                umodel_exe = tool_dir / "umodel.exe"
                umodel_64_exe = tool_dir / "umodel_64.exe"
                if not umodel_exe.exists() and not umodel_64_exe.exists():
                    # Maybe everything landed in a subdirectory — flatten it
                    found = (
                        list(tool_dir.rglob("umodel.exe"))
                        + list(tool_dir.rglob("umodel_64.exe"))
                    )
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
            print(f"UModel download failed for {url}: {exc}")
            continue

    return False, (
        f"Failed to download UModel automatically ({last_error or 'unknown error'}).\n\n"
        "Please download manually:\n"
        f"  1. Visit {DOWNLOAD_PAGE_URL}\n"
        f"  2. Download the win32 zip and extract it to:\n"
        f"     {tool_dir}"
    )


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
