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

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path


def _torch_install_note() -> str:
    """Return a PyTorch install reminder only when torch is NOT already available.

    Checks two sources before deciding the warning is needed:
      1. Local install: ``importlib.util.find_spec("torch")`` — covers pip-installed
         or custom-path torch inside Blender's Python environment.
      2. Mossy bridge: when the user routes AI inference through the Mossy desktop
         app, PyTorch runs inside Mossy (not Blender's Python), so ``find_spec``
         returns None even though torch IS available.  We check the bridge status
         and the ``use_mossy_as_ai`` preference to handle this case.

    Safe to call from background threads — all ``bpy.context`` access is wrapped
    in try/except so a missing window-manager context (common in threads) is
    silently ignored.
    """
    # Fast path: torch is importable locally
    if importlib.util.find_spec("torch") is not None:
        return ""

    # Mossy-bridge path: PyTorch lives inside the Mossy desktop app
    try:
        import bpy as _bpy
        wm = _bpy.context.window_manager
        if getattr(wm, 'mossy_bridge_status', "").startswith("Mossy Bridge online"):
            return ""
    except Exception:
        pass

    # Also honour the explicit "use Mossy as AI backend" preference
    try:
        from . import preferences as _prefs
        p = _prefs.get_preferences()
        if p is not None and getattr(p, 'use_mossy_as_ai', False):
            return ""
    except Exception:
        pass

    return "\nPyTorch is required at runtime - install via the Settings panel."

# Primary tools folder on D: drive - all external tools (including PyNifly)
# live here, matching the user's local setup.
DEFAULT_TOOLS_ROOT = Path(r"D:\blender_tools")

# Human-readable string used in UI labels and error messages.
TOOLS_DIR_DISPLAY = str(DEFAULT_TOOLS_ROOT)

# Fallback to addon folder if D: drive not available
ADDON_ROOT = Path(__file__).resolve().parent
FALLBACK_TOOLS_ROOT = ADDON_ROOT / "tools"

# Directory inside the addon where pip packages are installed via --target.
# Storing packages here (rather than relying on user or system site-packages)
# guarantees they persist across Blender restarts regardless of the Python
# environment configuration (PYTHONNOUSERSITE, read-only system site-packages,
# Blender isolated mode, etc.).  _refresh_import_paths() adds this directory
# to sys.path on every startup so the packages are always importable.
_PIP_LIB_DIR = ADDON_ROOT / "lib"

# Separate target directory for heavy ML packages (scipy, open3d) that have
# many compiled submodules.  Blender 5's extension policy checker scans every
# top-level module visible on sys.path and flags anything not declared in the
# manifest as a "Policy violation".  Keeping ML packages out of _PIP_LIB_DIR
# (which is added to sys.path at startup) prevents those violations.
# _ensure_ml_on_path() adds this directory lazily, only when ML functionality
# is actually invoked (e.g. RigNet BBW skinning).
_ML_LIB_DIR = ADDON_ROOT / "lib" / "ml"

# The parent of the addon folder.  When the addon lives at e.g.
#   D:\Blender addon\blender_game_tools\
# the user's tools are typically kept at the sibling path
#   D:\Blender addon\tools\
# rather than inside the addon subfolder.
SIBLING_TOOLS_ROOT = ADDON_ROOT.parent / "tools"


def get_tools_root() -> Path:
    """Return the root directory where external tools are stored.

    Priority (highest to lowest):
      1. ``tools_root`` add-on preference - user explicitly chose this path.
      2. Sibling ``tools/`` folder next to the addon folder - e.g.
         ``D:\\Blender addon\\tools\\`` when the addon is installed at
         ``D:\\Blender addon\\blender_game_tools\\``.  This is the most
         common layout for local development installs.
      3. Addon ``tools/`` subfolder inside the addon folder, if populated.
      4. ``DEFAULT_TOOLS_ROOT`` (``D:\\blender_tools``) if it already exists.
      5. Create and return ``FALLBACK_TOOLS_ROOT`` (addon ``tools/`` subfolder).
    """
    # 1. User-configured preference (highest priority)
    try:
        import bpy as _bpy
        from . import preferences as _prefs
        prefs = _prefs.get_preferences()
        if prefs:
            pref_val = getattr(prefs, "tools_root", "")
            if pref_val:
                try:
                    p = Path(_bpy.path.abspath(pref_val))
                except Exception:
                    import os as _os
                    p = Path(_os.path.abspath(pref_val))
                if p and str(p) not in (".", ""):
                    p.mkdir(parents=True, exist_ok=True)
                    return p
    except Exception:
        pass

    # 2. Sibling tools/ folder next to the addon - the typical local dev layout
    #    e.g.  D:\Blender addon\tools\  when addon is at
    #          D:\Blender addon\blender_game_tools\
    try:
        if SIBLING_TOOLS_ROOT.exists() and any(SIBLING_TOOLS_ROOT.iterdir()):
            return SIBLING_TOOLS_ROOT
    except OSError:
        pass

    # 3. Addon tools/ subfolder already populated - tools are here
    try:
        if FALLBACK_TOOLS_ROOT.exists() and any(FALLBACK_TOOLS_ROOT.iterdir()):
            return FALLBACK_TOOLS_ROOT
    except OSError:
        pass

    # 4. DEFAULT_TOOLS_ROOT only if it genuinely exists (don't create it blindly)
    if DEFAULT_TOOLS_ROOT.exists():
        return DEFAULT_TOOLS_ROOT

    # 5. Create and return the addon-local fallback
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


def _refresh_import_paths(*, _add_lib: bool = True) -> None:
    """Flush Python's import caches and ensure installed packages are on ``sys.path``.

    Called after every successful pip install *and* from ``deferred_startup()``
    (2 s after load) so that packages installed in a previous Blender session
    are immediately importable on the next startup.

    Three things can make an installed package invisible to ``find_spec``:
      1. Stale path-finder caches – cleared by ``importlib.invalidate_caches()``.
      2. Packages landing in ``_PIP_LIB_DIR`` (our ``--target`` directory) which
         is not on ``sys.path`` by default.  We append it here so it is always
         searched.  This is the primary fix: because ``_pip_install`` uses
         ``--target _PIP_LIB_DIR``, packages always end up in a location we
         control, so we only need to add one predictable path rather than
         guessing between user-site, system-site, or sysconfig variants.
         Gated on ``_add_lib`` so that callers inside ``register()`` can pass
         ``_add_lib=False`` to skip the ``sys.path`` mutation — Blender 5's
         extension policy checker monitors ``sys.path`` changes that occur
         during ``register()`` and raises "Policy violation with sys.path:
         .\\lib" whenever ``_PIP_LIB_DIR`` is added there.  Moving the
         mutation to ``deferred_startup()`` (which runs after ``register()``
         returns) silences the warning.
      3. Packages landing in the user site directory when installed without
         ``--target`` (pre-fix installs).  We still add the user site via
         ``site.addsitedir()`` as a backward-compat fallback.
    """
    import importlib
    importlib.invalidate_caches()

    # Primary: add the addon-local lib dir that _pip_install targets.
    # Skipped when _add_lib=False (called from register()) to avoid the
    # Blender 5 "Policy violation with sys.path: .\lib" warning.
    if _add_lib:
        _lib = str(_PIP_LIB_DIR)
        if _PIP_LIB_DIR.exists() and _lib not in sys.path:
            sys.path.append(_lib)
            importlib.invalidate_caches()

    # Fallback: also add user site-packages for packages installed in sessions
    # before the --target fix was introduced (backward compat).
    try:
        import site as _site
        user_site = _site.getusersitepackages()
        if user_site not in sys.path:
            _site.addsitedir(user_site)
            importlib.invalidate_caches()
    except Exception:
        pass


def _ensure_pip_lib_dir() -> None:
    """Create ``_PIP_LIB_DIR`` (``<addon>/lib/``) if it does not yet exist."""
    _PIP_LIB_DIR.mkdir(parents=True, exist_ok=True)


def _ensure_ml_lib_dir() -> None:
    """Create ``_ML_LIB_DIR`` (``<addon>/lib/ml/``) if it does not yet exist."""
    _ML_LIB_DIR.mkdir(parents=True, exist_ok=True)


def _ensure_ml_on_path() -> None:
    """Add ``_ML_LIB_DIR`` to ``sys.path`` if not already present.

    Called lazily, right before importing heavy ML packages (scipy, open3d),
    so those packages are never exposed at startup where Blender's extension
    policy checker would flag them as "Policy violation with top level module".
    """
    import importlib
    _ml = str(_ML_LIB_DIR)
    if _ML_LIB_DIR.exists() and _ml not in sys.path:
        sys.path.append(_ml)
        importlib.invalidate_caches()


def _migrate_ml_packages() -> None:
    """Move ML packages (scipy, open3d) from ``lib/`` to ``lib/ml/``.

    Blender 5's extension policy checker scans every top-level entry on
    sys.path and flags any module not declared in the manifest as a "Policy
    violation".  scipy and open3d install dozens of compiled sub-extensions
    at the top level of the target directory, so having them in ``lib/``
    (which is added to sys.path at startup) produces a wall of warnings.

    This function is called once from ``register()`` to transparently fix
    existing installations where these packages landed in ``lib/`` before the
    ``_ML_LIB_DIR`` target was introduced.  It reads each package's pip
    ``RECORD`` file to enumerate every file that belongs to that package and
    moves them from ``lib/`` to ``lib/ml/`` atomically; if the RECORD is
    absent it falls back to moving the package directory and dist-info folder.
    """
    if not _PIP_LIB_DIR.exists():
        return

    _ml_packages = ("scipy", "open3d")

    for pkg_name in _ml_packages:
        dist_infos = list(_PIP_LIB_DIR.glob(f"{pkg_name}-*.dist-info"))
        if not dist_infos:
            continue

        dist_info = dist_infos[0]
        record_file = dist_info / "RECORD"

        files_to_move: list[str] = []
        if record_file.exists():
            try:
                for line in record_file.read_text(encoding="utf-8").splitlines():
                    rel_path = line.split(",")[0].strip()
                    # Skip blank lines and paths that escape lib/ (e.g. entry-point scripts)
                    if rel_path and not rel_path.startswith(".."):
                        files_to_move.append(rel_path)
            except Exception:
                files_to_move = []

        if not files_to_move:
            # Fallback: move the main package dir and dist-info folder only
            for candidate in (pkg_name, dist_info.name):
                p = _PIP_LIB_DIR / candidate
                if p.exists():
                    files_to_move.append(candidate)

        if not files_to_move:
            continue

        _ML_LIB_DIR.mkdir(parents=True, exist_ok=True)

        for rel_path in files_to_move:
            src = _PIP_LIB_DIR / rel_path
            if not src.exists():
                continue
            dest = _ML_LIB_DIR / rel_path
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                try:
                    import shutil as _shutil
                    _shutil.move(str(src), str(dest))
                except Exception:
                    pass  # Leave in place if the file is locked (Windows)


def _pip_install(packages: list[str], target_dir: "Path | None" = None) -> tuple[bool, str]:
    """Install *packages* using the bundled Python's pip.

    Packages are installed to *target_dir* (defaulting to ``_PIP_LIB_DIR``,
    i.e. ``<addon>/lib/``) via ``--target``.  Pass ``target_dir=_ML_LIB_DIR``
    for heavy ML packages (scipy, open3d) to keep them out of ``lib/`` and
    avoid Blender 5 extension policy violations at startup.

    ``_refresh_import_paths()`` adds ``_PIP_LIB_DIR`` to sys.path on every
    Blender startup so packages installed there are always importable.  ML
    packages in ``_ML_LIB_DIR`` are made importable lazily via
    ``_ensure_ml_on_path()``, which is called right before the first import.

    Handles the two main cross-version concerns:
      1. ensurepip bootstrap for older Blender builds without pip.
      2. --break-system-packages flag required on Python 3.11+ (PEP 668).
    """
    ok, msg = _ensure_pip()
    if not ok:
        return False, msg

    _target = target_dir if target_dir is not None else _PIP_LIB_DIR
    _target.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "pip", "install", "--quiet", "--upgrade",
        "--target", str(_target),
    ]

    # Python 3.11+ / PEP 668: retained for compatibility; harmless with --target.
    if _python_version() >= (3, 11):
        cmd.append("--break-system-packages")

    cmd.extend(packages)

    try:
        result = subprocess.run(cmd, timeout=300, capture_output=True, text=True)
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "").strip()
            return False, (
                f"pip install failed (exit {result.returncode})"
                + (f": {detail}" if detail else "")
            )
        _refresh_import_paths()
        if target_dir is not None and target_dir != _PIP_LIB_DIR:
            _ensure_ml_on_path()
        return True, f"Installed: {', '.join(packages)}"
    except subprocess.TimeoutExpired:
        return False, (
            "pip install timed out after 300 s. "
            "Check your internet connection or install dependencies manually."
        )
    except Exception as e:
        return False, f"pip install error: {e}"


def _clone_or_download_repo(
    repo: str,
    dest: Path,
    branch: str = "main",
    display_name: str = "",
) -> tuple[bool, str]:
    """
    Get a GitHub repo into *dest* — tries git clone first, falls back to
    downloading the repo as a zip (no git required).

    This means all repo-based installs work automatically even if the user
    doesn't have git installed — fully automatic, no manual steps needed.
    Compliant with GitHub ToS and Nexus Mods policies: we download at
    install time only, from the official upstream repo.

    :param repo:    ``owner/name`` repo identifier on GitHub
    :param dest:    Local directory to clone/extract into
    :param branch:  Branch to use (default: ``main``)
    :returns:       ``(success, message)``
    """
    from urllib import request as _req
    import zipfile as _zf

    name = display_name or repo.split("/")[-1]

    if dest.exists() and any(dest.iterdir()):
        return True, f"{name} already present at {dest}"

    dest.mkdir(parents=True, exist_ok=True)

    # ── Try git first (faster, gets full history for updates) ────────────────
    git_exe = shutil.which("git")
    if git_exe:
        try:
            result = subprocess.run(
                [git_exe, "clone", "--depth", "1",
                 f"https://github.com/{repo}.git", str(dest)],
                capture_output=True, text=True, timeout=300,
            )
            if result.returncode == 0:
                return True, f"{name} cloned via git to {dest}"
        except Exception:
            pass  # fall through to zip download

    # ── Fallback: download zip from GitHub (no git needed) ───────────────────
    zip_url = f"https://github.com/{repo}/archive/refs/heads/{branch}.zip"
    tmp_zip = dest.parent / f"{name}_download.zip"
    try:
        print(f"[{name}] git not available — downloading zip from GitHub …")
        _req.urlretrieve(zip_url, str(tmp_zip))

        # Extract: GitHub zips have a top-level folder like "repo-main/"
        with _zf.ZipFile(tmp_zip, 'r') as z:
            z.extractall(str(dest.parent / f"{name}_extracted"))

        extracted_root = dest.parent / f"{name}_extracted"
        top_dirs = [d for d in extracted_root.iterdir() if d.is_dir()]
        if not top_dirs:
            return False, f"{name}: extracted zip was empty"

        # Move contents into dest
        src = top_dirs[0]
        for item in src.iterdir():
            shutil.move(str(item), str(dest / item.name))
        shutil.rmtree(str(extracted_root), ignore_errors=True)

        return True, f"{name} downloaded and extracted to {dest} (no git required)"

    except Exception as exc:
        return False, f"{name} download failed: {exc}"
    finally:
        if tmp_zip.exists():
            tmp_zip.unlink(missing_ok=True)


def _pip_install_requirements(req_file: Path) -> tuple[bool, str]:
    """Install packages listed in *req_file*, adapting to the running Python.

    Uses the same ``--target _PIP_LIB_DIR`` strategy as ``_pip_install`` so
    that packages always land in a persistent, predictable location.
    """
    if not req_file.exists():
        return False, f"Requirements file not found: {req_file}"

    ok, msg = _ensure_pip()
    if not ok:
        return False, msg

    _ensure_pip_lib_dir()

    cmd = [
        sys.executable, "-m", "pip", "install", "--quiet", "--upgrade",
        "--target", str(_PIP_LIB_DIR), "-r", str(req_file),
    ]
    if _python_version() >= (3, 11):
        cmd.append("--break-system-packages")

    try:
        result = subprocess.run(cmd, timeout=300, capture_output=True, text=True)
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "").strip()
            return False, (
                f"pip install failed (exit {result.returncode}) for {req_file.name}"
                + (f": {detail}" if detail else "")
            )
        _refresh_import_paths()
        return True, f"Installed from {req_file.name}"
    except subprocess.TimeoutExpired:
        return False, (
            f"pip install timed out after 300 s while processing {req_file.name}. "
            "Check your internet connection or install dependencies manually."
        )
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
            "pypdf>=3.0.0",
        ]
    if py < (3, 9):
        # Python 3.8 (not a Blender target but future-proof)
        return [
            "Pillow>=9.0.0,<10.0.0",
            "numpy>=1.21.0,<2.0.0",
            "requests>=2.27.0",
            "trimesh>=3.20.0",
            "pypdf>=3.0.0",
        ]
    # Python 3.9+ (Blender 2.93 onwards) – no special restrictions
    return [
        "Pillow>=9.0.0",
        "numpy>=1.21.0",
        "requests>=2.27.0",
        "trimesh>=3.20.0",
        "pypdf>=3.0.0",
    ]


def _ensure_tools_dir(name: str) -> Path:
    path = get_tools_root() / name
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
    """Return True if the given folder appears to contain Havok2FBX binaries.

    Only the executable is required — some builds (e.g. statically linked
    releases) do not ship a separate libfbxsdk.dll, and discover_installed_tools()
    also uses only the exe to locate the tool, so this check must be consistent.

    The exe may land in a versioned sub-folder when a GitHub zip extracts to a
    nested directory (e.g. ``havok2fbx-win64/havok2fbx.exe``).
    discover_installed_tools() uses ``rglob()`` to find the exe and then stores
    the *root* tool folder in the preference, so this function mirrors that
    recursive search behaviour to avoid false-positive "expected files missing"
    diagnostics warnings.
    """
    root = Path(path)
    if (root / "havok2fbx.exe").is_file():
        return True
    # Recursive fallback: exe may be one or more levels deeper.
    return next(root.rglob("havok2fbx.exe"), None) is not None


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


def check_ckcmd(path: str) -> bool:
    """Return True if the given folder appears to contain ck-cmd binaries.

    ck-cmd (aerisarn/ck-cmd) is the open-source, no-SDK-required replacement
    for havok2fbx.  Only the main executable is required.

    The exe may land in a versioned sub-folder when a GitHub zip extracts to a
    nested directory.  This function mirrors discover_installed_tools()'s
    recursive search to avoid false-positive diagnostics warnings.
    """
    root = Path(path)
    if (root / "ck-cmd.exe").is_file():
        return True
    # Recursive fallback: exe may be one or more levels deeper.
    return next(root.rglob("ck-cmd.exe"), None) is not None


def install_ckcmd() -> tuple[bool, str]:
    """Download ck-cmd from GitHub releases and wire it into preferences.

    Queries the GitHub Releases API for aerisarn/ck-cmd, downloads the first
    Windows zip or exe asset, extracts it to the tools/ck-cmd folder, and
    persists the path in add-on preferences so it is usable immediately.

    ck-cmd is the open-source FBX→HKX converter that replaces havok2fbx — it
    requires no commercial Havok or Autodesk SDKs and has pre-built binaries.
    """
    dest = _ensure_tools_dir("ck-cmd")

    # Already installed?
    if check_ckcmd(str(dest)):
        _configure_tool_paths()
        return True, f"ck-cmd already installed at {dest}"

    url = _get_github_release_asset("aerisarn/ck-cmd", ".zip")
    if not url:
        url = _get_github_release_asset("aerisarn/ck-cmd", "ck-cmd")
    if not url:
        return False, (
            "Could not resolve ck-cmd download URL from GitHub. "
            "Please download manually from https://github.com/aerisarn/ck-cmd/releases "
            f"and extract to {dest}."
        )

    zip_path = dest / "ckcmd_download.zip"
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
        return True, f"ck-cmd downloaded and configured at {dest}"
    except Exception as exc:
        return False, f"ck-cmd download failed: {exc}"

def install_niftools(blender_version: str = "3.6") -> tuple[bool, str]:
    """Download and install the latest Niftools NIF add-on from GitHub.

    Downloads the newest zip release from the
    ``niftools/blender_nif_plugin`` GitHub repository and installs it
    into Blender's add-on directory via ``bpy.ops.preferences.addon_install``.

    The *blender_version* parameter is kept for API compatibility but is
    no longer used - Blender itself handles version matching during install.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    _NIFTOOLS_API = (
        "https://api.github.com/repos/niftools/blender_nif_plugin/releases/latest"
    )
    release_url = "https://github.com/niftools/blender_nif_plugin/releases"

    # ── 1. Query GitHub for the latest release zip ───────────────────────
    zip_url: "str | None" = None
    zip_name: str = "blender_nif_plugin.zip"
    version_tag: str = "latest"
    try:
        req = urllib.request.Request(
            _NIFTOOLS_API,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github+json"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
        version_tag = data.get("tag_name", "latest")
        for asset in data.get("assets", []):
            name = asset.get("name", "")
            if name.lower().endswith(".zip"):
                zip_url = asset.get("browser_download_url")
                zip_name = name
                break
    except Exception as exc:
        print(f"niftools: GitHub query failed: {exc}")

    if not zip_url:
        return False, (
            f"Could not auto-download the latest Niftools release. "
            f"Please download it manually from {release_url} "
            f"and install via Edit → Preferences → Add-ons → Install.\n"
            f"Credit: Niftools Team - {release_url}"
        )

    # ── 2. Download zip to tools directory ───────────────────────────────
    tools_root = get_tools_root()
    tools_root.mkdir(parents=True, exist_ok=True)
    zip_path = tools_root / zip_name
    try:
        print(f"niftools: downloading {zip_name} ({version_tag}) …")
        urllib.request.urlretrieve(zip_url, zip_path)
        print(f"niftools: saved to {zip_path}")
    except Exception as exc:
        return False, f"Niftools download failed: {exc}"

    # ── 3. Install into Blender ───────────────────────────────────────────
    # bpy.ops calls must run on Blender's main thread.  When this function is
    # invoked from a background install thread, calling bpy.ops directly
    # triggers UI redraws with a restricted context (_RestrictContext) that
    # lacks a ``scene`` attribute, causing AttributeError in any panel poll()
    # method that accesses context.scene (including third-party add-ons such
    # as BlenderBIM).  Schedule the ops on the main thread via
    # bpy.app.timers and synchronise via threading.Event.
    import threading as _threading

    _result = [None, None]  # index 0: bool success, index 1: str message
    _done = _threading.Event()
    _zip_str = str(zip_path)
    _ver = version_tag
    _url = release_url

    def _do_install():
        try:
            import bpy as _bpy
            _bpy.ops.preferences.addon_install(filepath=_zip_str, overwrite=True)
            try:
                _bpy.ops.preferences.addon_enable(module="io_scene_niftools")
            except Exception:
                # On Blender 4.2+ the add-on is legacy and cannot be enabled
                # until "Allow Legacy Add-ons" is turned on in Preferences.
                pass
            suffix = (
                " If running Blender 4.2+, enable 'Allow Legacy Add-ons' in "
                "Edit → Preferences → Add-ons, then enable "
                "'NetImmerse/Gamebryo (.nif)'."
                if _bpy.app.version >= (4, 2, 0) else ""
            )
            _result[0] = True
            _result[1] = (
                f"Niftools {_ver} installed successfully.{suffix} "
                f"Credit: Niftools Team - {_url}"
            )
        except Exception as exc:
            _result[0] = False
            _result[1] = f"Niftools install failed: {exc}"
        finally:
            _done.set()
        return None  # deregisters the timer

    try:
        import bpy as _bpy
        if _threading.current_thread() is _threading.main_thread():
            # Already on the main thread – call directly without a timer to
            # avoid a self-deadlock from _done.wait().
            _do_install()
        else:
            _bpy.app.timers.register(_do_install, first_interval=0.0, persistent=False)
            _done.wait(timeout=30)
    except Exception as exc:
        return False, f"Niftools install failed: {exc}"

    if _result[0] is None:
        return False, "Niftools install timed out waiting for main thread"
    return bool(_result[0]), str(_result[1])



# GitHub API endpoint - always resolves to the newest published release.
_PYNIFLY_LATEST_API = (
    "https://api.github.com/repos/BadDogSkyrim/PyNifly/releases/latest"
)


def _download_pynifly_zip(dest_dir: "Path") -> "tuple[Path, str] | tuple[None, None]":
    """Download the latest PyNifly zip from GitHub to *dest_dir*.

    Queries the GitHub Releases API for the newest published release, finds
    the first ``.zip`` asset, downloads it, and returns ``(local_path,
    version_tag)``.  Returns ``(None, None)`` if the download fails for any
    reason.
    """
    try:
        req = urllib.request.Request(
            _PYNIFLY_LATEST_API,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github+json"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())

        version_tag: str = data.get("tag_name", "latest")

        zip_url: "str | None" = None
        zip_name: "str | None" = None
        for asset in data.get("assets", []):
            name = asset.get("name", "")
            if name.lower().endswith(".zip"):
                zip_url = asset.get("browser_download_url")
                zip_name = name
                break

        if not zip_url:
            print(f"PyNifly: no .zip asset found in release {version_tag}")
            return None, None

        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / zip_name
        print(f"PyNifly: downloading {zip_name} ({version_tag}) from {zip_url} …")
        urllib.request.urlretrieve(zip_url, dest_path)
        print(f"PyNifly: saved to {dest_path}")
        return dest_path, version_tag
    except Exception as exc:
        print(f"PyNifly: auto-download failed: {exc}")
        return None, None


def install_pynifly() -> tuple[bool, str]:
    """Install the latest PyNifly (by BadDog / BadDogSkyrim) NIF exporter into Blender.

    Steps (in order):
    1. Search ``D:\\Blender addon\\tools`` and the add-on's ``tools/`` folder
       for any ``PyNifly*.zip``.  The alphabetically last match is used so
       the newest locally-cached zip is always preferred.
    2. If no local zip is present, auto-download the newest release from the
       GitHub Releases API (BadDogSkyrim/PyNifly) into the tools folder.
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
    """
    # ── 1. Look for an existing local zip ────────────────────────────────────
    search_dirs = [get_tools_root(), SIBLING_TOOLS_ROOT, DEFAULT_TOOLS_ROOT, FALLBACK_TOOLS_ROOT]
    # deduplicate while preserving priority order
    _seen_dirs: set[str] = set()
    _deduped_dirs: list[Path] = []
    for _d in search_dirs:
        _key = str(_d)
        if _key not in _seen_dirs:
            _seen_dirs.add(_key)
            _deduped_dirs.append(_d)
    search_dirs = _deduped_dirs
    zip_path: "Path | None" = None
    version_tag: str = "latest"
    for directory in search_dirs:
        if not directory.exists():
            continue
        # Accept any PyNifly zip; alphabetically last = newest cached version.
        for pattern in ("PyNifly*.zip", "pynifly*.zip"):
            matches = sorted(directory.glob(pattern))
            if matches:
                zip_path = matches[-1]
                break
        if zip_path:
            break

    # ── 2. Auto-download the latest release from GitHub if not found locally ──
    if not zip_path:
        tools_root = get_tools_root()
        print("PyNifly: no local zip found - auto-downloading latest release from GitHub …")
        zip_path, version_tag = _download_pynifly_zip(tools_root)

    if not zip_path:
        release_url = "https://github.com/BadDogSkyrim/PyNifly/releases"
        try:
            import webbrowser
            webbrowser.open(release_url)
        except Exception:
            pass
        return False, (
            f"Could not auto-download the latest PyNifly release. "
            f"Please download it manually from {release_url}, "
            f"place the zip in {DEFAULT_TOOLS_ROOT}, and click Install again.\n"
            f"Credit: BadDog (BadDogSkyrim) - {release_url}"
        )

    # ── 3. Install into Blender ───────────────────────────────────────────
    # bpy.ops calls must run on Blender's main thread.  When this function is
    # invoked from a background install thread, calling bpy.ops directly
    # triggers UI redraws with a restricted context (_RestrictContext) that
    # lacks a ``scene`` attribute, causing AttributeError in any panel poll()
    # method that accesses context.scene (including third-party add-ons such
    # as BlenderBIM).  Schedule the ops on the main thread via
    # bpy.app.timers and synchronise via threading.Event.
    import threading as _threading

    _result = [None, None]  # index 0: bool success, index 1: str message
    _done = _threading.Event()
    _zip_str = str(zip_path)
    _ver = version_tag

    def _do_install():
        try:
            import bpy as _bpy
            import zipfile as _zf
            import os as _os

            # ── Step 1: find the real module name from the zip itself ─────────
            # The module name IS the top-level folder (or single .py file)
            # inside the PyNifly zip — no guessing needed.
            _real_module = None
            try:
                with _zf.ZipFile(_zip_str) as _z:
                    _top = set()
                    for _n in _z.namelist():
                        _part = _n.split("/")[0]
                        if _part and not _part.startswith("__"):
                            _top.add(_part)
                    # Filter to likely module names (not READMEs etc.)
                    for _t in sorted(_top):
                        if _t.lower().endswith(".py"):
                            _real_module = _t[:-3]
                            break
                        if "." not in _t:  # bare directory name = module name
                            _real_module = _t
                            break
            except Exception as _ze:
                print(f"[PyNifly] Could not read zip to detect module name: {_ze}")

            # ── Step 2: install the zip ───────────────────────────────────────
            _bpy.ops.preferences.addon_install(filepath=_zip_str, overwrite=True)

            # ── Step 3: enable using real name first, then fallbacks ──────────
            _candidates = []
            if _real_module:
                _candidates.append(_real_module)
            _candidates += ["PyNifly", "pynifly", "io_scene_nifly", "io_scene_nif", "nifly"]

            _enabled = False
            _enabled_mod = None
            for _mod_name in _candidates:
                try:
                    _res = _bpy.ops.preferences.addon_enable(module=_mod_name)
                    # addon_enable returns {'FINISHED'} on success
                    if isinstance(_res, set) and 'FINISHED' in _res:
                        _enabled = True
                        _enabled_mod = _mod_name
                        break
                except Exception:
                    continue

            # ── Step 4: scan addon dirs on disk as last resort ────────────────
            if not _enabled:
                _addon_dirs = []
                try:
                    import addon_utils as _au
                    for _p in _bpy.utils.script_paths(subdir="addons"):
                        if _os.path.isdir(_p):
                            _addon_dirs.append(_p)
                except Exception:
                    pass
                for _adir in _addon_dirs:
                    for _entry in _os.listdir(_adir):
                        if "nifly" in _entry.lower() or "pynifly" in _entry.lower():
                            _mod = _entry if not _entry.endswith(".py") else _entry[:-3]
                            try:
                                _res = _bpy.ops.preferences.addon_enable(module=_mod)
                                if isinstance(_res, set) and 'FINISHED' in _res:
                                    _enabled = True
                                    _enabled_mod = _mod
                                    break
                            except Exception:
                                continue
                    if _enabled:
                        break

            _configure_tool_paths()

            # Save user preferences so PyNifly stays enabled after restart
            try:
                from . import preferences as _prefs_mod
                _prefs_mod.save_prefs_deferred()
            except Exception as _spe:
                print(f"[PyNifly] Could not save prefs: {_spe}")

            _result[0] = True
            if _enabled:
                _result[1] = (
                    f"PyNifly {_ver} installed and enabled (module: {_enabled_mod}). "
                    f"Credit: BadDog (BadDogSkyrim) - https://github.com/BadDogSkyrim/PyNifly"
                )
            else:
                _result[1] = (
                    f"PyNifly {_ver} installed but could not be auto-enabled. "
                    f"Restart Blender — it will appear in Add-ons automatically. "
                    f"Credit: BadDog (BadDogSkyrim)"
                )
        except Exception as exc:
            _result[0] = False
            _result[1] = f"PyNifly install failed: {exc}"
        finally:
            _done.set()
        return None  # deregisters the timer

    try:
        import bpy as _bpy
        if _threading.current_thread() is _threading.main_thread():
            # Already on the main thread – call directly without a timer to
            # avoid a self-deadlock from _done.wait().
            _do_install()
        else:
            _bpy.app.timers.register(_do_install, first_interval=0.0, persistent=False)
            _done.wait(timeout=30)
    except Exception as exc:
        return False, f"PyNifly install failed: {exc}"

    if _result[0] is None:
        return False, "PyNifly install timed out waiting for main thread"
    return bool(_result[0]), str(_result[1])


def install_torch_deps(target_path: "str | Path | None" = None) -> tuple[bool, str]:
    """Guide the user to install PyTorch externally and register the path.

    PyTorch is no longer installed inside Blender's Python environment.
    This function returns instructions for setting up an external install
    and pointing Blender at it via the 'PyTorch Custom Path' preference.

    Args:
        target_path: Ignored (kept for API compatibility).

    Returns:
        ``(False, instructions)`` always - the user must install externally.
    """
    msg = (
        "PyTorch is no longer installed inside Blender. "
        "To use PyTorch-based AI features:\n"
        "1. Install PyTorch in a normal Python environment: "
        "https://pytorch.org/get-started/locally/\n"
        "2. Open the Settings panel (N-panel → Fallout 4 → Settings) and set "
        "'PyTorch Custom Path' to the directory containing the torch/ folder.\n"
        "3. Restart Blender."
    )
    return False, msg


# ---------------------------------------------------------------------------
# Auto-discovery: scan TOOLS_ROOT and update add-on preferences
# ---------------------------------------------------------------------------

def discover_installed_tools() -> dict[str, "str | None"]:
    """Scan TOOLS_ROOT for installed binaries and return a path map.

    Searches both DEFAULT_TOOLS_ROOT (D: drive) and FALLBACK_TOOLS_ROOT (addon
    folder) so that binaries are found regardless of which location was used
    during installation.

    Returns a dict with keys ``"ffmpeg"``, ``"nvcompress"``, ``"texconv"``,
    ``"umodel"``, ``"havok2fbx"``, ``"ckcmd"``, and ``"cm_toolkit"``, each
    mapped to the absolute executable path string (or directory string for
    umodel/havok2fbx/ckcmd), or ``None`` if not found.
    """
    found: dict[str, "str | None"] = {
        "ffmpeg": None,
        "nvcompress": None,
        "texconv": None,
        "umodel": None,
        "havok2fbx": None,
        "ckcmd": None,
        "cm_toolkit": None,
    }

    search_roots = [get_tools_root(), SIBLING_TOOLS_ROOT, DEFAULT_TOOLS_ROOT, FALLBACK_TOOLS_ROOT]
    # deduplicate while preserving priority order
    _seen_roots: set[str] = set()
    _deduped_roots: list[Path] = []
    for _r in search_roots:
        _key = str(_r)
        if _key not in _seen_roots:
            _seen_roots.add(_key)
            _deduped_roots.append(_r)
    search_roots = _deduped_roots

    binary_map = {
        "ffmpeg":     ("ffmpeg",     ("ffmpeg.exe",      "ffmpeg")),
        "nvcompress": ("nvtt",       ("nvcompress.exe",  "nvcompress")),
        "texconv":    ("texconv",    ("texconv.exe",     "texconv")),
        "umodel":     ("umodel",     ("umodel.exe",      "umodel")),
        "havok2fbx":  ("havok2fbx",  ("havok2fbx.exe",)),
        "ckcmd":      ("ck-cmd",     ("ck-cmd.exe",)),
        "cm_toolkit": ("cm_toolkit", ("cm-toolkit.exe",)),
    }

    _dir_based = ("umodel", "havok2fbx", "ckcmd")

    for key, (subdir, exe_names) in binary_map.items():
        for root in search_roots:
            tool_dir = root / subdir
            if not tool_dir.is_dir():
                continue
            for exe in exe_names:
                # Direct hit
                direct = tool_dir / exe
                if direct.is_file():
                    # For directory-based tools (umodel, havok2fbx, ckcmd) store the folder
                    found[key] = str(tool_dir) if key in _dir_based else str(direct)
                    break
                # Recursive search (zip may extract a nested folder)
                matches = sorted(tool_dir.rglob(exe))
                if matches:
                    found[key] = str(tool_dir) if key in _dir_based else str(matches[0])
                    break
            if found[key]:
                break

    return found


def auto_configure_preferences() -> list[str]:
    """Discover installed tools and update add-on preferences automatically.

    Intended to be called once during add-on registration so that any tools
    already present on disk are immediately wired up - even after a fresh
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

    # UModel - persist the folder in preferences so the add-on can locate it
    if installed["umodel"] and not _prefs.get_umodel_path():
        try:
            _prefs.set_umodel_path(installed["umodel"])
            results.append(f"UModel auto-configured: {installed['umodel']}")
            print(f"✓ UModel auto-configured: {installed['umodel']}")
        except Exception as exc:
            print(f"auto_configure_preferences: UModel path set failed: {exc}")

    # Havok2FBX - persist the folder in preferences
    if installed["havok2fbx"] and not _prefs.get_havok2fbx_path():
        try:
            prefs.havok2fbx_path = installed["havok2fbx"]
            results.append(f"Havok2FBX auto-configured: {installed['havok2fbx']}")
            print(f"✓ Havok2FBX auto-configured: {installed['havok2fbx']}")
        except Exception as exc:
            print(f"auto_configure_preferences: Havok2FBX path set failed: {exc}")

    # ck-cmd - persist the folder in preferences
    if installed["ckcmd"] and not _prefs.get_ckcmd_path():
        try:
            prefs.ckcmd_path = installed["ckcmd"]
            results.append(f"ck-cmd auto-configured: {installed['ckcmd']}")
            print(f"✓ ck-cmd auto-configured: {installed['ckcmd']}")
        except Exception as exc:
            print(f"auto_configure_preferences: ck-cmd path set failed: {exc}")

    # ── Persist to disk if anything changed ───────────────────────────────────
    # Without this, all the paths above vanish on the next Blender restart
    # because they only exist in the in-memory prefs object.
    if results:
        try:
            _prefs.save_api_keys()          # JSON keys file (resilient backup)
        except Exception as _ke:
            print(f"auto_configure_preferences: save_api_keys failed: {_ke}")
        try:
            _prefs.save_prefs_deferred()    # Blender userpref.blend
        except Exception as _pe:
            print(f"auto_configure_preferences: save_prefs_deferred failed: {_pe}")

    return results


def candidate_tool_paths(name: str) -> list[Path]:
    """Return candidate install paths for *name* under all tools roots.

    Results are deduplicated and ordered by priority:
      1. User-configured ``tools_root`` preference
      2. ``SIBLING_TOOLS_ROOT`` - ``tools/`` folder next to the addon folder
         (the typical local layout: ``D:\\Blender addon\\tools\\``)
      3. ``FALLBACK_TOOLS_ROOT`` - ``tools/`` subfolder inside the addon folder
      4. ``DEFAULT_TOOLS_ROOT`` (``D:\\blender_tools``)
    """
    roots = [get_tools_root(), SIBLING_TOOLS_ROOT, FALLBACK_TOOLS_ROOT, DEFAULT_TOOLS_ROOT]
    seen: set[str] = set()
    result: list[Path] = []
    for r in roots:
        p = r / name
        key = str(p)
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result


def get_instantngp_dir() -> Path:
    """Get the Instant-NGP installation directory.
    
    Returns the default location (under tools root), creating parent dirs if needed.
    """
    dest = get_tools_root() / "instant-ngp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def build_instantngp() -> tuple[bool, str]:
    """
    Auto-build Instant-NGP from already-cloned source.

    Tries Mossy first (Mossy has CMake + CUDA + build tools pre-configured).
    Falls back to a local CMake build if Mossy is unavailable.

    Returns ``(True, message)`` when the build succeeds, ``(False, reason)``
    otherwise with actionable instructions.
    """
    dest = get_instantngp_dir()

    # Already built?
    existing = find_instantngp_exe(dest)
    if existing:
        return True, f"Instant-NGP already built at: {existing}"

    # ── Try Mossy first — handles CMake/CUDA/compiler automatically ──────────
    mossy_result = _try_mossy_install(
        package="instant-ngp",
        github_url="https://github.com/NVlabs/instant-ngp.git",
        display_name="Instant-NGP",
    )
    if mossy_result is not None:
        return mossy_result

    print("[Instant-NGP] Mossy offline/failed — attempting local CMake build")

    # ── Verify source is present ──────────────────────────────────────────────
    if not (dest / "CMakeLists.txt").exists():
        return False, (
            "Instant-NGP source not found and Mossy is offline.\n"
            "Start Mossy and try again, or click 'Install Instant-NGP' first "
            "to download the source."
        )

    # ── Check CMake ───────────────────────────────────────────────────────────
    cmake_exe = shutil.which("cmake")
    if not cmake_exe:
        return False, (
            "CMake not found on PATH and Mossy is offline.\n"
            "Start Mossy to build automatically, or install CMake from\n"
            "https://cmake.org/download/ and try again."
        )

    # ── Check CUDA (nvcc or CUDA_PATH env var) ────────────────────────────────
    nvcc = shutil.which("nvcc")
    cuda_path = os.environ.get("CUDA_PATH") or os.environ.get("CUDA_HOME")
    if not nvcc and not cuda_path:
        return False, (
            "CUDA not found. Instant-NGP requires CUDA 11.3+.\n"
            "Download from https://developer.nvidia.com/cuda-downloads\n"
            "After installing, restart Blender and try again."
        )

    # ── Check for C++ compiler on Windows ────────────────────────────────────
    if sys.platform == "win32":
        # Look for MSBuild (Visual Studio) or ninja
        msbuild = shutil.which("MSBuild") or shutil.which("msbuild")
        ninja = shutil.which("ninja")
        cl = shutil.which("cl")
        if not any([msbuild, ninja, cl]):
            return False, (
                "No C++ compiler found. Install Visual Studio Build Tools:\n"
                "https://visualstudio.microsoft.com/visual-cpp-build-tools/\n"
                "Select 'Desktop development with C++' workload."
            )

    # ── CMake configure ───────────────────────────────────────────────────────
    build_dir = dest / "build"
    build_dir.mkdir(exist_ok=True)

    print(f"[Instant-NGP] Configuring with CMake in {build_dir} …")
    try:
        cfg_result = subprocess.run(
            [cmake_exe, str(dest), "-B", str(build_dir)],
            capture_output=True, text=True, timeout=300, cwd=str(dest),
        )
        if cfg_result.returncode != 0:
            return False, (
                f"CMake configure failed:\n{cfg_result.stderr or cfg_result.stdout}\n"
                "Common fix: make sure CUDA and Visual Studio are properly installed."
            )
    except subprocess.TimeoutExpired:
        return False, "CMake configure timed out (5 min). Check your CUDA/compiler setup."

    # ── CMake build ───────────────────────────────────────────────────────────
    print(f"[Instant-NGP] Building … (this can take 5-20 minutes)")
    try:
        build_result = subprocess.run(
            [cmake_exe, "--build", str(build_dir),
             "--config", "RelWithDebInfo", "-j",
             str(max(1, os.cpu_count() - 1))],
            capture_output=True, text=True, timeout=1800, cwd=str(dest),
        )
        if build_result.returncode != 0:
            return False, (
                f"Build failed:\n{(build_result.stderr or build_result.stdout)[-1000:]}\n"
                "See full output in the Blender console."
            )
    except subprocess.TimeoutExpired:
        return False, "Build timed out (30 min). Your system may need more RAM or a faster GPU."

    # ── Verify executable was produced ────────────────────────────────────────
    exe = find_instantngp_exe(dest)
    if exe:
        return True, f"Instant-NGP built successfully! Executable at: {exe}"
    return False, "Build completed but executable not found — check the Blender console for errors."


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
    """Install Instant-NGP via Mossy (preferred) or direct GitHub clone.

    Mossy handles the CMake build + CUDA environment so the user does not need
    CMake, Visual Studio, or CUDA installed locally.

    Returns:
        (success, message)
    """
    dest = get_instantngp_dir()

    # Check if already installed
    existing_exe = find_instantngp_exe(dest)
    if existing_exe:
        return True, f"Instant-NGP already built at: {existing_exe}"

    # Try Mossy first — it has CMake + CUDA + build tools
    mossy_result = _try_mossy_install(
        package="instant-ngp",
        github_url="https://github.com/NVlabs/instant-ngp.git",
        display_name="Instant-NGP",
    )
    if mossy_result is not None:
        return mossy_result

    # Fallback: clone source locally (user must build manually)
    print("[Instant-NGP] Mossy offline/failed — downloading source for manual build")

    # Check if source is already cloned
    if (dest / "CMakeLists.txt").exists():
        return True, (
            f"Instant-NGP source already cloned at: {dest}\n\n"
            "To build (requires NVIDIA GPU + CUDA 11.3+):\n"
            f"  cd \"{dest}\"\n"
            "  cmake . -B build\n"
            "  cmake --build build --config RelWithDebInfo -j\n"
        )

    ok, msg = _clone_or_download_repo(
        repo="NVlabs/instant-ngp",
        dest=dest,
        branch="master",
        display_name="Instant-NGP",
    )
    if not ok:
        return False, msg

    return True, (
        f"Instant-NGP source downloaded to: {dest}\n\n"
        "Next, build it (requires NVIDIA GPU + CUDA 11.3+):\n"
        f"  cd \"{dest}\"\n"
        "  cmake . -B build\n"
        "  cmake --build build --config RelWithDebInfo -j\n\n"
        "Tip: start Mossy and click Install again — Mossy can build it automatically."
    )


def _install_from_github_zip(
    repo: str,
    branch: str = "main",
    display_name: str = "",
    license_note: str = "",
) -> tuple[bool, str]:
    """
    Download a GitHub repo as a zip and install it via pip — no git required.

    This approach is fully compliant with GitHub's ToS and Nexus Mods policies:
    - We do NOT bundle any third-party code in our addon zip
    - We download at install time only, from the official upstream repo
    - The MIT license of both Shap-E and Point-E permits this use

    :param repo:         GitHub repo in ``owner/name`` format
    :param branch:       Branch to download (default: ``main``)
    :param display_name: Human-readable name for log messages
    :param license_note: Attribution string for the success message
    """
    import subprocess, sys, tempfile, shutil, os
    from urllib import request as _req

    name = display_name or repo.split("/")[-1]
    zip_url = f"https://github.com/{repo}/archive/refs/heads/{branch}.zip"

    tmp_dir = tempfile.mkdtemp(prefix=f"{name.lower().replace('-','_')}_")
    zip_path = os.path.join(tmp_dir, f"{name}.zip")
    extract_dir = os.path.join(tmp_dir, "extracted")

    try:
        # ── 1. Download repo zip from GitHub ─────────────────────────────────
        print(f"[{name}] Downloading from {zip_url} …")
        try:
            _req.urlretrieve(zip_url, zip_path)
        except Exception as dl_err:
            return False, f"{name} download failed: {dl_err}"

        # ── 2. Extract ────────────────────────────────────────────────────────
        import zipfile as _zf
        os.makedirs(extract_dir, exist_ok=True)
        with _zf.ZipFile(zip_path, 'r') as z:
            z.extractall(extract_dir)

        # GitHub zips have a top-level folder like "shap-e-main/"
        extracted_items = os.listdir(extract_dir)
        if not extracted_items:
            return False, f"{name}: extracted zip was empty"
        src_dir = os.path.join(extract_dir, extracted_items[0])

        # ── 3. pip install from local extracted folder ────────────────────────
        python_exe = sys.executable
        result = subprocess.run(
            [python_exe, "-m", "pip", "install", src_dir],
            capture_output=True, text=True, timeout=300
        )

        if result.returncode == 0:
            return True, (
                f"{name} installed successfully. Restart Blender to activate.\n"
                + (f"Credit: {license_note}" if license_note else "")
            )
        return False, f"{name} pip install failed: {result.stderr.strip()}"

    except Exception as exc:
        return False, f"{name} install failed: {exc}"
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _try_mossy_install(package: str, github_url: str, display_name: str) -> "tuple[bool, str] | None":
    """
    Try to install *package* via Mossy's Python environment.

    Returns (True, msg) on success.
    Returns None if Mossy is offline OR if the install failed (so the caller
    can fall back to a direct install).  Never raises.
    """
    try:
        from . import mossy_link
        bridge_ok, _ = mossy_link.check_bridge(timeout=2.0)
        if not bridge_ok:
            print(f"[{display_name}] Mossy bridge offline — will try direct install")
            return None
        print(f"[{display_name}] Mossy bridge online — routing install through Mossy")
        ok, msg = mossy_link.install_package_via_mossy(
            package=package,
            github_url=github_url,
            timeout=300,
        )
        if ok:
            return True, msg
        # Mossy was reachable but install failed (e.g. HTTP 500) — fall back
        print(f"[{display_name}] Mossy install failed ({msg}) — falling back to direct install")
        return None
    except Exception as exc:
        print(f"[{display_name}] Mossy install attempt failed: {exc}")
        return None


def install_shap_e() -> tuple[bool, str]:
    """Install OpenAI Shap-E (text/image → 3D mesh).

    Tries Mossy first (recommended — Mossy's Python environment works reliably
    for AI packages). Falls back to direct GitHub zip download if Mossy is
    not running.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    # Try via Mossy first
    result = _try_mossy_install(
        package="shap-e",
        github_url="https://github.com/openai/shap-e.git",
        display_name="Shap-E",
    )
    if result is not None:
        return result

    # Fallback: direct GitHub zip download
    print("[Shap-E] Mossy offline — attempting direct GitHub zip install")
    return _install_from_github_zip(
        repo="openai/shap-e",
        branch="main",
        display_name="Shap-E",
        license_note="OpenAI Shap-E — MIT License — https://github.com/openai/shap-e",
    )


def install_point_e() -> tuple[bool, str]:
    """Install OpenAI Point-E (text/image → point cloud).

    Tries Mossy first, falls back to direct GitHub zip download.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    result = _try_mossy_install(
        package="point-e",
        github_url="https://github.com/openai/point-e.git",
        display_name="Point-E",
    )
    if result is not None:
        return result

    print("[Point-E] Mossy offline — attempting direct GitHub zip install")
    return _install_from_github_zip(
        repo="openai/point-e",
        branch="main",
        display_name="Point-E",
        license_note="OpenAI Point-E — MIT License — https://github.com/openai/point-e",
    )


def install_gradio() -> tuple[bool, str]:
    """Install Gradio web UI framework via pip.

    Gradio provides a browser-based interface for AI generation tools.
    It is a pure-Python package with no git clone required.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    ok, msg = _pip_install(["gradio"])
    if ok:
        return True, "Gradio installed successfully. You can now start the Web UI from the add-on panel."
    return False, f"Gradio install failed: {msg}"


def install_zoedepth() -> tuple[bool, str]:
    """Clone ZoeDepth (isl-org) from GitHub and install its pip dependencies.

    ZoeDepth is a metric depth-estimation model used for image-to-mesh
    reconstruction.  The repo is cloned to the tools directory; the
    ``timm`` and ``matplotlib`` packages are also installed via pip.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("ZoeDepth")

    # Try Mossy first (preferred for AI packages)
    mossy_result = _try_mossy_install(
        package="zoedepth",
        github_url="https://github.com/isl-org/ZoeDepth.git",
        display_name="ZoeDepth",
    )
    if mossy_result is not None:
        return mossy_result

    print("[ZoeDepth] Mossy offline/failed — attempting direct GitHub install")
    ok, msg = _clone_or_download_repo(
        repo="isl-org/ZoeDepth",
        dest=dest,
        branch="main",
        display_name="ZoeDepth",
    )
    if not ok:
        return False, msg

    # Install runtime dependencies
    _pip_install(["timm", "matplotlib"])
    return True, f"ZoeDepth installed at {dest}.{_torch_install_note()}"

def install_triposr() -> tuple[bool, str]:
    """Clone TripoSR (VAST-AI-Research) from GitHub and install pip deps.

    TripoSR is an image-to-3D model.  Clones the repository to the tools
    directory and installs ``trimesh`` and ``huggingface_hub`` via pip.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("TripoSR")

    mossy_result = _try_mossy_install(
        package="triposr",
        github_url="https://github.com/VAST-AI-Research/TripoSR.git",
        display_name="TripoSR",
    )
    if mossy_result is not None:
        return mossy_result

    print("[TripoSR] Mossy offline/failed — attempting direct GitHub install")
    ok, msg = _clone_or_download_repo(
        repo="VAST-AI-Research/TripoSR",
        dest=dest,
        branch="main",
        display_name="TripoSR",
    )
    if not ok:
        return False, msg

    # Install runtime dependencies
    _pip_install(["trimesh", "huggingface_hub", "einops", "omegaconf"])
    return True, f"TripoSR installed at {dest}.{_torch_install_note()}"

def install_hunyuan3d() -> tuple[bool, str]:
    """Clone Hunyuan3D-2 (Tencent) from GitHub and install pip deps.

    Hunyuan3D-2 is Tencent's image-to-3D generation model.  The repo is
    cloned to the tools directory.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("Hunyuan3D-2")

    mossy_result = _try_mossy_install(
        package="hunyuan3d",
        github_url="https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git",
        display_name="Hunyuan3D-2",
    )
    if mossy_result is not None:
        return mossy_result

    print("[Hunyuan3D-2] Mossy offline/failed — attempting direct GitHub install")
    ok, msg = _clone_or_download_repo(
        repo="Tencent-Hunyuan/Hunyuan3D-2",
        dest=dest,
        branch="main",
        display_name="Hunyuan3D-2",
    )
    if not ok:
        return False, msg

    _pip_install(["einops", "omegaconf", "huggingface_hub"])
    return True, f"Hunyuan3D-2 installed at {dest}.{_torch_install_note()}"


def install_hymotion() -> tuple[bool, str]:
    """Clone HY-Motion-1.0 (Tencent) from GitHub and install pip deps.

    HY-Motion-1.0 is Tencent's text-to-motion generation model.  The repo
    is cloned to the tools directory.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("HY-Motion-1.0")

    mossy_result = _try_mossy_install(
        package="hy-motion",
        github_url="https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git",
        display_name="HY-Motion",
    )
    if mossy_result is not None:
        return mossy_result

    print("[HY-Motion] Mossy offline/failed — attempting direct GitHub install")
    ok, msg = _clone_or_download_repo(
        repo="Tencent-Hunyuan/HY-Motion-1.0",
        dest=dest,
        branch="main",
        display_name="HY-Motion",
    )
    if not ok:
        return False, msg

    _pip_install(["einops", "omegaconf"])
    return True, f"HY-Motion installed at {dest}.{_torch_install_note()}"


def install_diffusers() -> tuple[bool, str]:
    """Install Hugging Face Diffusers stack (Stable Diffusion, SDXL) via pip.

    Installs ``diffusers[torch]``, ``transformers``, ``accelerate``, and
    ``safetensors`` into Blender's bundled Python environment.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    ok, msg = _pip_install(["diffusers[torch]", "transformers", "accelerate", "safetensors"])
    if ok:
        return True, "Diffusers installed successfully. Restart Blender to activate."
    return False, f"Diffusers install failed: {msg}"


def install_libigl() -> tuple[bool, str]:
    """Install libigl Python bindings via Mossy (preferred) or pip.

    Mossy is strongly preferred here: libigl >= 2.5 builds from source when
    no pre-built wheel exists, which requires Python development headers that
    Blender's bundled Python does not ship.  Mossy has its own full Python
    environment with headers and CMake, so it can install libigl cleanly.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    # Try Mossy first — it has Python dev headers + CMake needed for source builds
    mossy_result = _try_mossy_install(
        package="libigl",
        github_url="https://github.com/libigl/libigl-python-bindings.git",
        display_name="libigl",
    )
    if mossy_result is not None:
        return mossy_result

    print("[libigl] Mossy offline/failed — attempting local pip install")

    import sysconfig

    # Pre-flight: detect missing Python development headers.
    # libigl >= 2.5 builds from source when no pre-built wheel is available.
    # Blender ships Python without these headers, so the build will fail.
    inc_dir = sysconfig.get_path("include")
    if not (inc_dir and os.path.isdir(inc_dir)):
        return False, (
            "libigl requires Mossy to install (Blender's Python lacks C headers).\n"
            "Start Mossy and click Install libigl again — Mossy handles the build automatically."
        )

    ok, msg = _pip_install(["libigl"])
    if ok:
        return True, "libigl installed successfully. Restart Blender to activate."
    return False, f"libigl install failed: {msg}"


def get_realesrgan_ncnn_exe() -> "Path | None":
    """Return the path to the locally-installed Real-ESRGAN NCNN Vulkan binary.

    Returns ``None`` when the binary has not been downloaded yet.

    Note: the NCNN Vulkan release provides separate archives for Windows,
    Linux, and macOS.  The executable name varies by platform.
    """
    exe_name = "realesrgan-ncnn-vulkan.exe" if sys.platform == "win32" else "realesrgan-ncnn-vulkan"
    exe = _ensure_tools_dir("realesrgan") / exe_name
    return exe if exe.is_file() else None


def get_realesrgan_weights_dir() -> Path:
    """Return the directory that holds Real-ESRGAN model weights (.pth files)."""
    return _ensure_tools_dir("realesrgan") / "models"


def install_realesrgan() -> tuple[bool, str]:
    """Download Real-ESRGAN NCNN Vulkan binary from GitHub releases.

    The portable ZIP for the current platform is downloaded from
    ``xinntao/Real-ESRGAN`` and extracted into the ``tools/realesrgan``
    directory.  Supported platforms: Windows, Linux, macOS.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("realesrgan")

    # Already installed?
    if get_realesrgan_ncnn_exe():
        _configure_tool_paths()
        return True, f"Real-ESRGAN NCNN Vulkan already installed at {dest}"

    repo = "xinntao/Real-ESRGAN"
    if sys.platform == "win32":
        platform_keyword = "windows"
        fallback_zip = "realesrgan-ncnn-vulkan-20220424-windows.zip"
    elif sys.platform == "darwin":
        platform_keyword = "macos"
        fallback_zip = "realesrgan-ncnn-vulkan-20220424-macos.zip"
    else:
        platform_keyword = "ubuntu"
        fallback_zip = "realesrgan-ncnn-vulkan-20220424-ubuntu.zip"

    url = _get_github_release_asset(repo, platform_keyword)
    if not url:
        # Fallback: try a known stable release URL
        url = (
            "https://github.com/xinntao/Real-ESRGAN/releases/download"
            f"/v0.2.5.0/{fallback_zip}"
        )

    zip_path = dest / f"realesrgan-{platform_keyword}.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)

        # Flatten a single sub-directory if the zip created one
        for sub in list(dest.iterdir()):
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
        exe = get_realesrgan_ncnn_exe()
        if exe:
            return True, (
                f"Real-ESRGAN NCNN Vulkan installed at {dest}.\n"
                "Restart Blender or click 'Check Status' to refresh."
            )
        return True, (
            f"Downloaded and extracted to {dest} - "
            "look for the realesrgan-ncnn-vulkan binary inside that folder."
        )
    except Exception as exc:
        return False, (
            f"Real-ESRGAN install failed: {exc}\n"
            "Download manually from "
            "https://github.com/xinntao/Real-ESRGAN/releases"
        )


def install_rignet() -> tuple[bool, str]:
    """Clone the rignet-gj repository and install its pip dependencies.

    Clones ``https://github.com/govindjoshi12/rignet-gj`` into the tools
    directory.  The ``torch``, ``scipy``, and ``open3d`` packages are also
    installed via pip as runtime dependencies.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("rignet-gj")

    if (dest / "README.md").exists():
        return True, f"RigNet (rignet-gj) already present at {dest}"

    git_exe = shutil.which("git")
    if not git_exe:
        return False, (
            "git not found on PATH - cannot clone RigNet.\n"
            "Install Git from https://git-scm.com/ then try again.\n"
            "Or clone manually:\n"
            "  git clone https://github.com/govindjoshi12/rignet-gj.git"
        )

    try:
        dest.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [git_exe, "clone", "--depth", "1",
             "https://github.com/govindjoshi12/rignet-gj.git", str(dest)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return False, f"RigNet clone failed:\n{result.stderr or result.stdout}"
    except subprocess.TimeoutExpired:
        return False, "RigNet clone timed out (> 5 min)"
    except Exception as exc:
        return False, f"RigNet clone error: {exc}"

    _pip_install(["scipy", "open3d"], target_dir=_ML_LIB_DIR)
    return True, f"RigNet (rignet-gj) cloned to {dest}.{_torch_install_note()}"


def install_motion_diffuse() -> tuple[bool, str]:
    """Clone MotionDiffuse from GitHub and install its pip dependencies.

    Clones ``https://github.com/MotrixLab/MotionDiffuse`` into the tools
    directory.  The ``einops`` and ``omegaconf`` packages are also installed
    via pip as lightweight runtime dependencies.

    Returns
    -------
    tuple[bool, str]
        ``(True, message)`` on success, ``(False, reason)`` otherwise.
    """
    dest = _ensure_tools_dir("MotionDiffuse")

    if (dest / "README.md").exists():
        return True, f"MotionDiffuse already present at {dest}"

    git_exe = shutil.which("git")
    if not git_exe:
        return False, (
            "git not found on PATH - cannot clone MotionDiffuse.\n"
            "Install Git from https://git-scm.com/ then try again.\n"
            "Or clone manually:\n"
            "  git clone https://github.com/MotrixLab/MotionDiffuse.git"
        )

    try:
        dest.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [git_exe, "clone", "--depth", "1",
             "https://github.com/MotrixLab/MotionDiffuse.git", str(dest)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return False, f"MotionDiffuse clone failed:\n{result.stderr or result.stdout}"
    except subprocess.TimeoutExpired:
        return False, "MotionDiffuse clone timed out (> 5 min)"
    except Exception as exc:
        return False, f"MotionDiffuse clone error: {exc}"

    _pip_install(["einops", "omegaconf"])
    return True, f"MotionDiffuse cloned to {dest}.{_torch_install_note()}"


def install_collective_modding_toolkit() -> tuple[bool, str]:
    """Download the Collective Modding Toolkit (wxMichael) from GitHub.

    The toolkit (cm-toolkit.exe) helps mod authors:
      - Downgrade / upgrade FO4 between Old-Gen and Next-Gen with delta patches
      - Patch BA2 archives to v1 (OG) or v8 (NG) for correct game compatibility
      - Scan F4SE DLLs for game version support
      - Count and inspect plugins (Full/Light) and BA2 files (General/Textures)
      - Scan mod setups for potential issues before distribution

    GitHub: https://github.com/wxMichael/Collective-Modding-Toolkit
    Nexus:  https://www.nexusmods.com/fallout4/mods/87441
    """
    dest = _ensure_tools_dir("cm_toolkit")

    # Already installed?
    exe = dest / "cm-toolkit.exe"
    if exe.is_file():
        _configure_tool_paths()
        return True, f"Collective Modding Toolkit already installed at {dest}"

    # Direct download URL - always points to the latest release zip.
    zip_url = (
        "https://github.com/wxMichael/Collective-Modding-Toolkit"
        "/releases/latest/download/cm-toolkit.zip"
    )
    zip_path = dest / "cm-toolkit.zip"

    try:
        _download(zip_url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)

        # Flatten any sub-folder the zip may have created
        for sub in list(dest.iterdir()):
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
        if (dest / "cm-toolkit.exe").is_file():
            return True, (
                f"Collective Modding Toolkit installed at {dest}\n"
                "Launch cm-toolkit.exe from your mod manager (not from inside MO2's VFS).\n"
                "Key uses: BA2 patching (OG v1 ↔ NG v8), F4SE DLL scan, mod conflict scan."
            )
        return True, (
            f"Downloaded and extracted to {dest} - look for cm-toolkit.exe"
        )
    except Exception as exc:
        return False, (
            f"Collective Modding Toolkit download failed: {exc}\n"
            "Download manually from "
            "https://github.com/wxMichael/Collective-Modding-Toolkit/releases"
        )


def register():
    pass


def unregister():
    pass
