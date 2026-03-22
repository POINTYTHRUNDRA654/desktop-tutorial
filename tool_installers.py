"""Helper routines to download and install external command-line tools.

Provides high-level Python functions for fetching binaries such as ffmpeg,
NVTT (nvcompress), DirectXTex (texconv), and Whisper CLI.  Designed to be
invoked from Blender add-on operators so that end users can get a working
environment with a single click.  Fallback behaviour will open a web browser
if automation is not possible.

All downloads go to the workspace `tools/` directory under tool-specific
subfolders.  Existing installations are left in place.

Version compatibility
---------------------
Blender bundles its own Python interpreter.  The Python version varies:

  Blender 2.90-2.92  → Python 3.7
  Blender 2.93-3.0   → Python 3.9
  Blender 3.1-3.6    → Python 3.10
  Blender 4.0-5.x    → Python 3.11+

Key differences this module handles:
  • Python 3.7 (Blender 2.90-2.92): Pillow must be <10.0 and numpy <2.0
    because those packages dropped Python 3.7 support.
  • Python 3.11+ (Blender 4.x/5.x): PEP 668 requires --break-system-packages
    when the OS also manages Python packages (common on Linux).
  • Some Blender builds ship Python without pip pre-installed: we bootstrap
    pip via ensurepip before any install attempt.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

# Primary tools folder on D: drive — all external tools (including PyNifly)
# live here, matching the user's local setup.
DEFAULT_TOOLS_ROOT = Path(r"D:\Blender addon\tools")

# Human-readable string used in UI labels and error messages.
TOOLS_DIR_DISPLAY = str(DEFAULT_TOOLS_ROOT)

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOLS_ROOT = ADDON_ROOT / "tools"


def get_tools_root():
    """Get the tools directory, creating parent if needed."""
    # Try D: drive first
    try:
        if DEFAULT_TOOLS_ROOT.drive and Path(DEFAULT_TOOLS_ROOT.drive).exists():
            DEFAULT_TOOLS_ROOT.mkdir(parents=True, exist_ok=True)
            return DEFAULT_TOOLS_ROOT
    except Exception:
        pass

    # Fallback to addon folder
    FALLBACK_TOOLS_ROOT.mkdir(parents=True, exist_ok=True)
    return FALLBACK_TOOLS_ROOT


TOOLS_ROOT = get_tools_root()


# ---------------------------------------------------------------------------
# Internal pip helpers
# ---------------------------------------------------------------------------

def _python_version() -> tuple[int, int]:
    """Return (major, minor) of the currently running Python."""
    return sys.version_info.major, sys.version_info.minor


def _ensure_pip() -> tuple[bool, str]:
    """Bootstrap pip via ensurepip if it is not already available.

    This is required on some Blender builds (especially older ones) where the
    bundled Python was compiled without pip pre-installed.
    """
    try:
        import importlib.util
        if importlib.util.find_spec("pip") is not None:
            return True, "pip already available"
        import ensurepip
        ensurepip.bootstrap(upgrade=True)
        return True, "pip bootstrapped via ensurepip"
    except Exception as e:
        return False, f"pip bootstrap failed: {e}"


def _pip_install(packages: list[str]) -> tuple[bool, str]:
    """Install *packages* using the bundled Python's pip.

    Handles the two main cross-version concerns:
      1. ensurepip bootstrap for older Blender builds without pip.
      2. --break-system-packages flag required on Python 3.11+ (PEP 668).
    """
    ok, msg = _ensure_pip()
    if not ok:
        return False, msg

    cmd = [sys.executable, "-m", "pip", "install", "--quiet", "--upgrade"]

    # Python 3.11+ / PEP 668: installing into a system-managed interpreter
    # fails without this flag.  It is silently ignored on older Pythons.
    if _python_version() >= (3, 11):
        cmd.append("--break-system-packages")

    cmd.extend(packages)

    try:
        subprocess.check_call(cmd, timeout=300)
        return True, f"Installed: {', '.join(packages)}"
    except subprocess.TimeoutExpired:
        return False, (
            f"pip install timed out after 300 s. "
            "Check your internet connection or install dependencies manually."
        )
    except subprocess.CalledProcessError as e:
        return False, f"pip install failed (exit {e.returncode}): {e}"
    except Exception as e:
        return False, f"pip install error: {e}"


def _pip_install_requirements(req_file: Path) -> tuple[bool, str]:
    """Install packages listed in *req_file*, adapting to the running Python."""
    if not req_file.exists():
        return False, f"Requirements file not found: {req_file}"

    ok, msg = _ensure_pip()
    if not ok:
        return False, msg

    cmd = [sys.executable, "-m", "pip", "install", "--quiet", "--upgrade", "-r", str(req_file)]
    if _python_version() >= (3, 11):
        cmd.append("--break-system-packages")

    try:
        subprocess.check_call(cmd, timeout=300)
        return True, f"Installed from {req_file.name}"
    except subprocess.TimeoutExpired:
        return False, (
            f"pip install timed out after 300 s while processing {req_file.name}. "
            "Check your internet connection or install dependencies manually."
        )
    except subprocess.CalledProcessError as e:
        return False, f"pip install failed (exit {e.returncode}): {e}"
    except Exception as e:
        return False, f"pip install error: {e}"


def _version_constrained_packages() -> list[str]:
    """Return core packages with version pins appropriate for the running Python.

    Python 3.7 (Blender 2.90-2.92) requires older package versions:
      • Pillow 9.x is the last series with Python 3.7 wheels.
      • numpy 1.x is required (numpy 2.0 dropped Python 3.7/3.8 support).

    All newer Pythons can use current releases.
    """
    py = _python_version()
    if py < (3, 8):
        # Python 3.7 – Blender 2.90 through 2.92
        return [
            "Pillow>=9.0.0,<10.0.0",
            "numpy>=1.21.0,<2.0.0",
            "requests>=2.27.0",
            "trimesh>=3.20.0",
            "PyPDF2>=3.0.0",
        ]
    if py < (3, 9):
        # Python 3.8 (not a Blender target but future-proof)
        return [
            "Pillow>=9.0.0,<10.0.0",
            "numpy>=1.21.0,<2.0.0",
            "requests>=2.27.0",
            "trimesh>=3.20.0",
            "PyPDF2>=3.0.0",
        ]
    # Python 3.9+ (Blender 2.93 onwards) – no special restrictions
    return [
        "Pillow>=9.0.0",
        "numpy>=1.21.0",
        "requests>=2.27.0",
        "trimesh>=3.20.0",
        "PyPDF2>=3.0.0",
    ]


def _ensure_tools_dir(name: str) -> Path:
    path = TOOLS_ROOT / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def _download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as resp, open(target, "wb") as out:
        shutil.copyfileobj(resp, out)


def _extract_zip(zip_path: Path, dest: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)


def _get_github_release_asset(repo: str, keyword: str) -> str | None:
    """Return browser_download_url for first asset whose name contains keyword."""
    api = f"https://api.github.com/repos/{repo}/releases/latest"
    try:
        with urllib.request.urlopen(api) as resp:
            data = json.load(resp)
    except Exception:
        return None

    for asset in data.get("assets", []):
        name = asset.get("name", "")
        if keyword.lower() in name.lower():
            return asset.get("browser_download_url")
    return None


def _configure_tool_paths() -> list[str]:
    """Wire any newly installed tools into add-on preferences immediately.

    Called automatically by every install function after a successful
    download so the tools are usable without restarting Blender.

    Returns a list of human-readable strings describing what was configured.
    """
    # Use auto_configure_preferences() which already knows how to scan and
    # update prefs for ffmpeg / nvtt / texconv / umodel / havok2fbx.
    # It is defined later in this file; call by name to avoid forward-ref issues.
    try:
        return auto_configure_preferences()
    except Exception as exc:
        print(f"_configure_tool_paths: {exc}")
        return []


def install_ffmpeg() -> tuple[bool, str]:
    """Fetch a Windows static ffmpeg build into tools/ffmpeg."""
    dest = _ensure_tools_dir("ffmpeg")
    zip_path = dest / "ffmpeg.zip"
    url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)
        _configure_tool_paths()
        return True, f"FFmpeg downloaded and configured at {dest}"
    except Exception as e:
        return False, f"FFmpeg install failed: {e}"


def install_nvtt() -> tuple[bool, str]:
    """Download NVIDIA Texture Tools (nvcompress) into tools/nvtt."""
    dest = _ensure_tools_dir("nvtt")
    repo = "castano/nvidia-texture-tools"
    url = _get_github_release_asset(repo, "win.zip")
    if not url:
        return False, "Could not resolve NVTT download URL; please visit https://github.com/castano/nvidia-texture-tools/releases."
    zip_path = dest / "nvtt.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)
        _configure_tool_paths()
        return True, f"NVTT downloaded and configured at {dest}"
    except Exception as e:
        return False, f"NVTT install failed: {e}"


def install_texconv() -> tuple[bool, str]:
    """Download DirectXTex texconv.exe from GitHub releases."""
    dest = _ensure_tools_dir("texconv")
    repo = "microsoft/DirectXTex"
    url = _get_github_release_asset(repo, "texconv.exe")
    if not url:
        return False, "Could not resolve texconv URL; please download manually from https://github.com/microsoft/DirectXTex/releases."
    exe_path = dest / "texconv.exe"
    try:
        _download(url, exe_path)
        _configure_tool_paths()
        return True, f"texconv downloaded and configured at {exe_path}"
    except Exception as e:
        return False, f"texconv install failed: {e}"


def install_whisper() -> tuple[bool, str]:
    """Ensure whisper CLI is installed in the active Python environment."""
    return _pip_install(["openai-whisper"])


def install_python_requirements(include_optional: bool = False) -> tuple[bool, str]:
    """Install Python dependencies required by the add-on.

    Uses version-constrained package specs so that the correct versions are
    chosen for whichever Python/Blender combination is running:

      • Python 3.7 (Blender 2.90-2.92): Pillow<10, numpy<2
      • Python 3.9+ (Blender 2.93+): current releases
      • Python 3.11+ (Blender 4.x/5.x): adds --break-system-packages
    """
    # Install core packages with version pins appropriate for this Python
    packages = _version_constrained_packages()
    ok, msg = _pip_install(packages)
    if not ok:
        return False, msg

    # Optionally install the optional requirements file as well
    if include_optional:
        addon_dir = Path(__file__).resolve().parent
        opt_file = addon_dir / "requirements-optional.txt"
        if not opt_file.exists():
            # No optional file present – not an error, just nothing extra to install
            msg = f"{msg}; No optional requirements file found, skipped"
        else:
            ok2, msg2 = _pip_install_requirements(opt_file)
            if not ok2:
                # Optional failures are non-fatal: core packages already installed.
                msg = f"{msg}; optional failed (non-fatal): {msg2}"
            else:
                msg = f"{msg}; {msg2}"

    return True, msg


def check_havok2fbx(path: str) -> bool:
    """Return True if the given folder appears to contain Havok2FBX binaries."""
    exe = Path(path) / "havok2fbx.exe"
    dll = Path(path) / "libfbxsdk.dll"
    return exe.is_file() and dll.is_file()


def install_havok2fbx() -> tuple[bool, str]:
    """Download Havok2FBX from GitHub releases and wire it into preferences.

    Queries the GitHub Releases API for dfm/havok2fbx, downloads the first
    Windows zip asset, extracts it to the tools/havok2fbx folder, and
    persists the path in add-on preferences so it is usable immediately.
    """
    dest = _ensure_tools_dir("havok2fbx")

    # Already installed?
    if check_havok2fbx(str(dest)):
        _configure_tool_paths()
        return True, f"Havok2FBX already installed at {dest}"

    url = _get_github_release_asset("dfm/havok2fbx", ".zip")
    if not url:
        # Try exe as well (some releases ship just an exe)
        url = _get_github_release_asset("dfm/havok2fbx", "havok2fbx")
    if not url:
        return False, (
            "Could not resolve Havok2FBX download URL from GitHub. "
            "Please download manually from https://github.com/dfm/havok2fbx/releases "
            f"and extract to {dest}."
        )

    zip_path = dest / "havok2fbx_download.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)
        # Move files out of any sub-folder the zip may have created
        for sub in dest.iterdir():
            if sub.is_dir():
                for item in list(sub.iterdir()):
                    target = dest / item.name
                    if not target.exists():
                        shutil.move(str(item), str(target))
                try:
                    sub.rmdir()
                except OSError:
                    pass
        _configure_tool_paths()
        return True, f"Havok2FBX downloaded and configured at {dest}"
    except Exception as exc:
        return False, f"Havok2FBX download failed: {exc}"

def install_niftools(blender_version: str = "3.6") -> tuple[bool, str]:
    """Invoke the PowerShell installer for the niftools add-on if on Windows."""
    if os.name != "nt":
        return False, "Niftools installer only available on Windows."
    script = Path(__file__).resolve().parent / "tools" / "install_niftools.ps1"
    if not script.exists():
        return False, "install_niftools.ps1 not found"
    try:
        subprocess.check_call([
            "powershell", "-ExecutionPolicy", "Bypass", "-File", str(script),
            "-BlenderVersion", blender_version
        ])
        return True, "Niftools installer executed"
    except Exception as e:
        return False, f"Failed to run Niftools installer: {e}"



# The target PyNifly release tag.  Update this constant when a new version
# should be picked up automatically.
PYNIFLY_TARGET_VERSION = "v25"

# GitHub API endpoint for the target release.
_PYNIFLY_RELEASE_API = (
    f"https://api.github.com/repos/BadDogSkyrim/PyNifly/releases/tags/{PYNIFLY_TARGET_VERSION}"
)


def _download_pynifly_zip(dest_dir: "Path") -> "Path | None":
    """Download the PyNifly {ver} zip from GitHub to *dest_dir*.

    Queries the GitHub Releases API for {ver}, finds the first ``.zip``
    asset, downloads it, and returns the local path.  Returns ``None`` if
    the download fails for any reason.
    """.format(ver=PYNIFLY_TARGET_VERSION)
    try:
        req = urllib.request.Request(
            _PYNIFLY_RELEASE_API,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github+json"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())

        zip_url: "str | None" = None
        zip_name: "str | None" = None
        for asset in data.get("assets", []):
            name = asset.get("name", "")
            if name.lower().endswith(".zip"):
                zip_url = asset.get("browser_download_url")
                zip_name = name
                break

        if not zip_url:
            print(f"PyNifly: no .zip asset found in release {PYNIFLY_TARGET_VERSION}")
            return None

        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / zip_name
        print(f"PyNifly: downloading {zip_name} from {zip_url} …")
        urllib.request.urlretrieve(zip_url, dest_path)
        print(f"PyNifly: saved to {dest_path}")
        return dest_path
    except Exception as exc:
        print(f"PyNifly: auto-download failed: {exc}")
        return None


def install_pynifly() -> tuple[bool, str]:
    """Install PyNifly {ver} (by BadDog / BadDogSkyrim) NIF exporter into Blender.

    Steps (in order):
    1. Search ``D:\\Blender addon\\tools`` and the add-on's ``tools/`` folder
       for any ``PyNifly*.zip``.  Prefer the file whose name matches
       ``PYNIFLY_TARGET_VERSION`` ({ver}); fall back to any PyNifly zip found.
    2. If no local zip is present, auto-download {ver} from the GitHub
       Releases API (BadDogSkyrim/PyNifly) into the tools folder.
    3. Install the zip into Blender via ``bpy.ops.preferences.addon_install``
       and enable the add-on.

    Credit
    ------
    PyNifly is developed and maintained by BadDog (BadDogSkyrim).
    https://github.com/BadDogSkyrim/PyNifly

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """.format(ver=PYNIFLY_TARGET_VERSION)
    # ── 1. Look for an existing local zip ────────────────────────────────────
    search_dirs = [DEFAULT_TOOLS_ROOT, FALLBACK_TOOLS_ROOT]
    zip_path: "Path | None" = None
    for directory in search_dirs:
        if not directory.exists():
            continue
        # Prefer the target version zip; accept any PyNifly zip as fallback.
        for pattern in (
            f"PyNifly{PYNIFLY_TARGET_VERSION}*.zip",
            f"pynifly{PYNIFLY_TARGET_VERSION}*.zip",
            "PyNifly*.zip",
            "pynifly*.zip",
        ):
            matches = sorted(directory.glob(pattern))
            if matches:
                zip_path = matches[-1]  # alphabetically last = newest
                break
        if zip_path:
            break

    # ── 2. Auto-download v25 from GitHub if not found locally ─────────────
    if not zip_path:
        tools_root = get_tools_root()
        print(
            f"PyNifly: no local zip found — auto-downloading "
            f"{PYNIFLY_TARGET_VERSION} from GitHub …"
        )
        zip_path = _download_pynifly_zip(tools_root)

    if not zip_path:
        release_url = "https://github.com/BadDogSkyrim/PyNifly/releases"
        try:
            import webbrowser
            webbrowser.open(release_url)
        except Exception:
            pass
        return False, (
            f"Could not auto-download PyNifly {PYNIFLY_TARGET_VERSION}. "
            f"Please download it manually from {release_url}, "
            f"place the zip in {DEFAULT_TOOLS_ROOT}, and click Install again.\n"
            f"Credit: BadDog (BadDogSkyrim) — {release_url}"
        )

    # ── 3. Install into Blender ───────────────────────────────────────────
    try:
        import bpy  # available when running inside Blender
        bpy.ops.preferences.addon_install(filepath=str(zip_path), overwrite=True)
        bpy.ops.preferences.addon_enable(module="PyNifly")
        _configure_tool_paths()
        return True, (
            f"PyNifly {PYNIFLY_TARGET_VERSION} installed from {zip_path.name}. "
            f"Credit: BadDog (BadDogSkyrim) — https://github.com/BadDogSkyrim/PyNifly"
        )
    except Exception as e:
        return False, f"PyNifly install failed: {e}"


def install_torch_deps(target_path: "str | Path | None" = None) -> tuple[bool, str]:
    """Install PyTorch (CPU build) to *target_path* and persist the path.

    Uses the same short-path strategy as TorchPathManager so it works on
    Windows even when Blender's site-packages path is too long.  After a
    successful install the path is written to the add-on preferences so that
    it is automatically added to ``sys.path`` on every subsequent Blender
    startup (no manual reconnect needed).

    Args:
        target_path: Installation directory.  Defaults to ``D:/t``.

    Returns:
        ``(True, message)`` on success, ``(False, reason)`` on failure.
    """
    try:
        from . import torch_path_manager as _tpm
        _tp = _tpm.TorchPathManager
    except Exception:
        # Fallback: call TorchPathManager directly when relative import fails.
        try:
            import importlib
            import sys as _sys
            _pkg = Path(__file__).resolve().parent.name
            _tpm = importlib.import_module(f"{_pkg}.torch_path_manager")
            _tp = _tpm.TorchPathManager
        except Exception as e:
            return False, f"torch_path_manager unavailable: {e}"

    return _tp.install_torch_to_custom_path(target_path)


# ---------------------------------------------------------------------------
# Auto-discovery: scan TOOLS_ROOT and update add-on preferences
# ---------------------------------------------------------------------------

def discover_installed_tools() -> dict[str, "str | None"]:
    """Scan TOOLS_ROOT for installed binaries and return a path map.

    Searches both DEFAULT_TOOLS_ROOT (D: drive) and FALLBACK_TOOLS_ROOT (addon
    folder) so that binaries are found regardless of which location was used
    during installation.

    Returns a dict with keys ``"ffmpeg"``, ``"nvcompress"``, ``"texconv"``,
    ``"umodel"``, and ``"havok2fbx"``, each mapped to the absolute executable
    path string (or directory string for umodel/havok2fbx), or ``None`` if
    not found.
    """
    found: dict[str, "str | None"] = {
        "ffmpeg": None,
        "nvcompress": None,
        "texconv": None,
        "umodel": None,
        "havok2fbx": None,
    }

    search_roots = [DEFAULT_TOOLS_ROOT, FALLBACK_TOOLS_ROOT]

    binary_map = {
        "ffmpeg":     ("ffmpeg",     ("ffmpeg.exe",      "ffmpeg")),
        "nvcompress": ("nvtt",       ("nvcompress.exe",  "nvcompress")),
        "texconv":    ("texconv",    ("texconv.exe",     "texconv")),
        "umodel":     ("umodel",     ("umodel.exe",      "umodel")),
        "havok2fbx":  ("havok2fbx",  ("havok2fbx.exe",)),
    }

    for key, (subdir, exe_names) in binary_map.items():
        for root in search_roots:
            tool_dir = root / subdir
            if not tool_dir.is_dir():
                continue
            for exe in exe_names:
                # Direct hit
                direct = tool_dir / exe
                if direct.is_file():
                    # For directory-based tools (umodel, havok2fbx) store the folder
                    found[key] = str(tool_dir) if key in ("umodel", "havok2fbx") else str(direct)
                    break
                # Recursive search (zip may extract a nested folder)
                matches = sorted(tool_dir.rglob(exe))
                if matches:
                    found[key] = str(tool_dir) if key in ("umodel", "havok2fbx") else str(matches[0])
                    break
            if found[key]:
                break

    return found


def auto_configure_preferences() -> list[str]:
    """Discover installed tools and update add-on preferences automatically.

    Intended to be called once during add-on registration so that any tools
    already present on disk are immediately wired up — even after a fresh
    Blender install or if preferences were reset.

    Returns a list of human-readable status strings (one per configured tool).
    """
    results: list[str] = []

    try:
        import bpy as _bpy
        from . import preferences as _prefs
    except Exception:
        try:
            import bpy as _bpy
            import importlib
            _pkg = Path(__file__).resolve().parent.name
            _prefs = importlib.import_module(f"{_pkg}.preferences")
        except Exception as e:
            print(f"auto_configure_preferences: cannot import bpy/preferences: {e}")
            return results

    prefs = _prefs.get_preferences()
    if prefs is None:
        return results

    installed = discover_installed_tools()

    # ffmpeg
    if installed["ffmpeg"] and not _prefs.get_configured_ffmpeg_path():
        prefs.ffmpeg_path = installed["ffmpeg"]
        results.append(f"ffmpeg auto-configured: {installed['ffmpeg']}")
        print(f"✓ ffmpeg auto-configured: {installed['ffmpeg']}")

    # nvcompress / NVTT
    if installed["nvcompress"] and not _prefs.get_configured_nvcompress_path():
        prefs.nvtt_path = installed["nvcompress"]
        results.append(f"nvcompress auto-configured: {installed['nvcompress']}")
        print(f"✓ nvcompress auto-configured: {installed['nvcompress']}")

    # texconv
    if installed["texconv"] and not _prefs.get_configured_texconv_path():
        prefs.texconv_path = installed["texconv"]
        results.append(f"texconv auto-configured: {installed['texconv']}")
        print(f"✓ texconv auto-configured: {installed['texconv']}")

    # UModel — persist the folder in preferences so the add-on can locate it
    if installed["umodel"] and not _prefs.get_umodel_path():
        try:
            _prefs.set_umodel_path(installed["umodel"])
            results.append(f"UModel auto-configured: {installed['umodel']}")
            print(f"✓ UModel auto-configured: {installed['umodel']}")
        except Exception as exc:
            print(f"auto_configure_preferences: UModel path set failed: {exc}")

    # Havok2FBX — persist the folder in preferences
    if installed["havok2fbx"] and not _prefs.get_havok2fbx_path():
        try:
            prefs.havok2fbx_path = installed["havok2fbx"]
            results.append(f"Havok2FBX auto-configured: {installed['havok2fbx']}")
            print(f"✓ Havok2FBX auto-configured: {installed['havok2fbx']}")
        except Exception as exc:
            print(f"auto_configure_preferences: Havok2FBX path set failed: {exc}")

    return results


def candidate_tool_paths(name: str) -> list[Path]:
    """Return candidate install paths for *name* under both tools roots."""
    return [DEFAULT_TOOLS_ROOT / name, FALLBACK_TOOLS_ROOT / name]


def get_instantngp_dir() -> Path:
    """Get the Instant-NGP installation directory.
    
    Returns the default location (under tools root), creating parent dirs if needed.
    """
    dest = TOOLS_ROOT / "instant-ngp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def find_instantngp_exe(search_dir: Path | None = None) -> Path | None:
    """Find the Instant-NGP executable in a directory.
    
    Args:
        search_dir: Directory to search (or None to use default).
    
    Returns:
        Path to instant-ngp executable, or None if not found.
    """
    if search_dir is None:
        search_dir = get_instantngp_dir()
    
    if not search_dir.is_dir():
        return None
    
    # Windows: instant-ngp.exe
    # Unix: instant-ngp
    exe_name = "instant-ngp.exe" if sys.platform == "win32" else "instant-ngp"
    
    # Check build/Release or build/Debug
    for subpath in ["build/Release", "build/Debug", "build"]:
        candidate = search_dir / subpath / exe_name
        if candidate.is_file():
            return candidate
    
    # Recursive search
    for exe in search_dir.rglob(exe_name):
        if exe.is_file():
            return exe
    
    return None


def install_instantngp() -> tuple[bool, str]:
    """Clone Instant-NGP from GitHub.
    
    Requires git to be available on PATH.
    
    Returns:
        (success, message)
    """
    dest = get_instantngp_dir()
    
    # Check if already installed
    existing_exe = find_instantngp_exe(dest)
    if existing_exe:
        return True, f"Instant-NGP already built at: {existing_exe}"
    
    # Check if source is already cloned
    if (dest / "CMakeLists.txt").exists():
        return True, (
            f"Instant-NGP source already cloned at: {dest}\n\n"
            "To build (requires NVIDIA GPU + CUDA 11.3+):\n"
            f"  cd \"{dest}\"\n"
            "  cmake . -B build\n"
            "  cmake --build build --config RelWithDebInfo -j\n"
        )
    
    # Clone from GitHub
    try:
        print(f"Cloning Instant-NGP from GitHub to {dest}...")
        
        # Check if git is available
        git_exe = shutil.which("git")
        if not git_exe:
            return False, (
                "git not found on PATH.\n\n"
                "Please install Git from https://git-scm.com/\n"
                "Then clone manually:\n"
                "  git clone --recursive https://github.com/NVlabs/instant-ngp.git \\\n"
                f"    \"{dest}\"\n"
            )
        
        # Create parent directory
        dest.mkdir(parents=True, exist_ok=True)
        
        # Clone with submodules
        cmd = [
            git_exe,
            "clone",
            "--recursive",
            "https://github.com/NVlabs/instant-ngp.git",
            str(dest),
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes
        )
        
        if result.returncode != 0:
            error = result.stderr or result.stdout
            return False, f"Failed to clone Instant-NGP:\n{error}"
        
        print(f"✓ Instant-NGP cloned to {dest}")
        
        return True, (
            f"Instant-NGP source cloned to: {dest}\n\n"
            "Next, build it (requires NVIDIA GPU + CUDA 11.3+):\n"
            f"  cd \"{dest}\"\n"
            "  cmake . -B build\n"
            "  cmake --build build --config RelWithDebInfo -j\n\n"
            "See https://github.com/NVlabs/instant-ngp for build instructions."
        )
    
    except subprocess.TimeoutExpired:
        return False, "Clone operation timed out (took more than 5 minutes)"
    except Exception as e:
        return False, f"Failed to clone Instant-NGP: {e}"


def register():
    pass


def unregister():
    pass
