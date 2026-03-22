"""Helper for managing UModel (UE Viewer) tool.

UModel (also known as UE Viewer) is a tool by Konstantin Nosov (Gildor) for
viewing and extracting assets from Unreal Engine games.

Credit: UModel by Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel

Auto-downloads to D:/blender_tools/ (Windows) or the addon tools folder to keep
it separate from the addon.
"""

from __future__ import annotations

import platform
import re
import shutil
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


# Download to D: drive by default to keep separate from addon
DEFAULT_TOOL_DIR = Path("D:/blender_tools/umodel")

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOL_DIR = ADDON_ROOT / "tools" / "umodel"

# Executable name is platform-dependent
if platform.system() == "Windows":
    _EXE_NAME = "umodel.exe"
else:
    _EXE_NAME = "umodel"

# Official download page
_DOWNLOAD_PAGE = "https://www.gildor.org/en/projects/umodel"


def get_tool_dir():
    """Get the tool directory.

    Checks (in order):
    1. Path saved in add-on preferences (survives restarts).
    2. Default location on D: drive (Windows).
    3. Fallback inside the addon's tools/ folder.
    """
    # Check preferences first
    try:
        from . import preferences as _prefs
        saved = _prefs.get_umodel_path()
        if saved:
            p = Path(saved)
            if p.is_dir():
                return p
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


def status() -> tuple[bool, str]:
    """Return (ready, message) tuple for UI display."""
    tool_dir = get_tool_dir()

    umodel_exe = tool_dir / _EXE_NAME
    if umodel_exe.exists():
        return True, f"UModel ready at {tool_dir}"

    if tool_dir.exists():
        return False, f"UModel at {tool_dir} appears incomplete (missing {_EXE_NAME})"

    return False, f"UModel not installed (will download to {tool_dir})"


def tool_path() -> str:
    """Return expected tool directory path for UI display."""
    return str(get_tool_dir())


def executable_path() -> str | None:
    """Return path to the UModel executable if it exists, None otherwise."""
    tool_dir = get_tool_dir()
    umodel_exe = tool_dir / _EXE_NAME
    return str(umodel_exe) if umodel_exe.exists() else None


def _find_download_url() -> str | None:
    """Scrape the official UModel project page to find a direct download URL.

    Parses the HTML at gildor.org/en/projects/umodel and looks for href
    attributes that point to a ZIP or EXE containing "umodel" in the name.
    Returns an absolute URL string, or None if nothing is found.
    """
    try:
        req = urllib.request.Request(
            _DOWNLOAD_PAGE,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")

        # Look for download links: href="...umodel...zip" or ...exe
        patterns = [
            r'href=["\']([^"\']*umodel[^"\']*\.zip)["\']',
            r'href=["\']([^"\']*umodel[^"\']*\.exe)["\']',
            r'href=["\']([^"\']*ueviewer[^"\']*\.zip)["\']',
        ]
        for pat in patterns:
            for m in re.findall(pat, html, re.IGNORECASE):
                # Convert relative URLs to absolute
                if not m.startswith("http"):
                    url = urllib.parse.urljoin(_DOWNLOAD_PAGE, m)
                else:
                    url = m
                # Verify URL looks valid before returning
                if url and not url.endswith("#"):
                    print(f"UModel: found download URL: {url}")
                    return url
    except Exception as exc:
        print(f"UModel: could not scrape download page: {exc}")
    
    # Fallback: try common UModel release URLs
    fallback_urls = [
        "https://github.com/gildor2/UModel/releases/download/latest/UModel.zip",
        "https://www.gildor.org/downloads/umodel/UModel.zip",
    ]
    for fallback_url in fallback_urls:
        try:
            print(f"UModel: trying fallback URL: {fallback_url}")
            req = urllib.request.Request(fallback_url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    print(f"UModel: fallback URL available: {fallback_url}")
                    return fallback_url
        except Exception:
            continue
    
    return None


def download_latest() -> tuple[bool, str]:
    """Download UModel from gildor.org to the tool directory.

    Tries to find the download URL by scraping the official project page.
    On success, saves the installation directory to add-on preferences so it
    is remembered across Blender restarts.

    Credit: UModel by Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel
    """
    tool_dir = get_tool_dir()

    if tool_dir.exists() and (tool_dir / _EXE_NAME).exists():
        return True, f"UModel already exists at {tool_dir}"

    tool_dir.parent.mkdir(parents=True, exist_ok=True)

    # Try to discover the download URL from the project page
    scraped_url = _find_download_url()
    candidates: list[str] = []
    if scraped_url:
        candidates.append(scraped_url)

    if not candidates:
        return False, (
            f"UModel requires manual download. Please:\n"
            f"1. Visit {_DOWNLOAD_PAGE}\n"
            f"2. Download the latest UModel build\n"
            f"3. Extract to: {tool_dir}\n"
            f"4. Ensure '{_EXE_NAME}' is in that directory\n\n"
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
                    zf.extractall(tool_dir)

                # Executable may be nested inside a sub-directory
                umodel_exe = tool_dir / _EXE_NAME
                if not umodel_exe.exists():
                    for exe in tool_dir.rglob(_EXE_NAME):
                        parent = exe.parent
                        for item in parent.iterdir():
                            shutil.move(str(item), str(tool_dir / item.name))
                        break

            # Persist the installation path so it survives restarts
            try:
                from . import preferences as _prefs
                _prefs.set_umodel_path(str(tool_dir))
                print(f"✓ UModel path saved to preferences: {tool_dir}")
            except Exception as e:
                print(f"Warning: UModel downloaded but path not saved to prefs: {e}")

            return True, f"Downloaded UModel to {tool_dir}. Credit: Konstantin Nosov (Gildor)"
        except Exception as exc:
            last_error = str(exc)
            print(f"  ✗ Failed to download from {url}: {exc}")
            continue

    error_msg = f"Failed to download UModel: {last_error or 'unknown error'}\n\nPlease manually download from:\n{_DOWNLOAD_PAGE}\n\nExtract to: {tool_dir}"
    return False, error_msg


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
