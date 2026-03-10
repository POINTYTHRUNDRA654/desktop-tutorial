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

# Download to D: drive by default to keep separate from addon
DEFAULT_TOOLS_ROOT = Path("D:/blender_tools")

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


def _pip_install_with_index(packages: list[str], index_url: str) -> tuple[bool, str]:
    """Install *packages* from a specific PyPI index URL (e.g. the PyTorch CPU wheel server).

    This is required for torch because the official PyPI wheel includes a CUDA
    runtime (~2 GB).  The CPU-only wheel is served from a separate index and
    is ~250 MB – far more appropriate for a Blender add-on installer.
    """
    ok, msg = _ensure_pip()
    if not ok:
        return False, msg

    cmd = [sys.executable, "-m", "pip", "install", "--quiet", "--upgrade",
           "--index-url", index_url]
    if _python_version() >= (3, 11):
        cmd.append("--break-system-packages")
    cmd.extend(packages)

    try:
        # Generous timeout: the PyTorch CPU wheel is ~250 MB
        subprocess.check_call(cmd, timeout=900)
        return True, f"Installed (from {index_url}): {', '.join(packages)}"
    except subprocess.TimeoutExpired:
        return False, "pip install timed out (15 min). Check your internet connection."
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


def install_ffmpeg() -> tuple[bool, str]:
    """Fetch a Windows static ffmpeg build into tools/ffmpeg."""
    dest = _ensure_tools_dir("ffmpeg")
    zip_path = dest / "ffmpeg.zip"
    url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)
        return True, f"FFmpeg downloaded to {dest}"
    except Exception as e:
        return False, f"FFmpeg install failed: {e}"


def install_nvtt() -> tuple[bool, str]:
    """Download NVIDIA Texture Tools (nvcompress) into tools/nvtt."""
    dest = _ensure_tools_dir("nvtt")
    repo = "castano/nvidia-texture-tools"
    url = _get_github_release_asset(repo, "win.zip")
    if not url:
        return False, "Could not resolve NVTT download URL; please visit GitHub manually."
    zip_path = dest / "nvtt.zip"
    try:
        _download(url, zip_path)
        _extract_zip(zip_path, dest)
        zip_path.unlink(missing_ok=True)
        return True, f"NVTT downloaded to {dest}"
    except Exception as e:
        return False, f"NVTT install failed: {e}"


def install_texconv() -> tuple[bool, str]:
    """Download DirectXTex texconv.exe from GitHub releases."""
    dest = _ensure_tools_dir("texconv")
    repo = "microsoft/DirectXTex"
    url = _get_github_release_asset(repo, "texconv.exe")
    if not url:
        return False, "Could not resolve texconv URL; please download manually."
    exe_path = dest / "texconv.exe"
    try:
        _download(url, exe_path)
        return True, f"texconv downloaded to {exe_path}"
    except Exception as e:
        return False, f"texconv install failed: {e}"


def install_whisper() -> tuple[bool, str]:
    """Ensure whisper CLI is installed in the active Python environment."""
    return _pip_install(["openai-whisper"])


# ---------------------------------------------------------------------------
# Real-ESRGAN AI upscaler — fully automatic, no subscription required
# ---------------------------------------------------------------------------

# Stable, versioned URLs for Real-ESRGAN model weights (hosted on GitHub).
_REALESRGAN_WEIGHTS = {
    'RealESRGAN_x4plus.pth': (
        'https://github.com/xinntao/Real-ESRGAN/releases/download/'
        'v0.1.0/RealESRGAN_x4plus.pth'
    ),
    'RealESRGAN_x2plus.pth': (
        'https://github.com/xinntao/Real-ESRGAN/releases/download/'
        'v0.2.1/RealESRGAN_x2plus.pth'
    ),
}


def get_realesrgan_weights_dir() -> Path:
    """Return the directory where Real-ESRGAN model weights are stored locally.

    Weights are kept in ``tools/realesrgan/weights/`` inside the tools root so
    they survive add-on updates and are shared between install methods.
    """
    weights_dir = TOOLS_ROOT / "realesrgan" / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)
    return weights_dir


def get_realesrgan_bin_dir() -> Path:
    """Return the directory where the Real-ESRGAN NCNN Vulkan binary lives."""
    return TOOLS_ROOT / "realesrgan" / "bin"


def get_realesrgan_ncnn_exe() -> Path | None:
    """Return the NCNN Vulkan executable path if it was downloaded, else None."""
    bin_dir = get_realesrgan_bin_dir()
    candidates = list(bin_dir.rglob("realesrgan-ncnn-vulkan")) + list(
        bin_dir.rglob("realesrgan-ncnn-vulkan.exe")
    )
    for c in candidates:
        if c.is_file():
            return c
    return None


def _realesrgan_ncnn_platform_keyword() -> str:
    """Return the GitHub release asset keyword for the current platform."""
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform.startswith("darwin"):
        return "macos"
    return "ubuntu"


def install_realesrgan_ncnn() -> tuple[bool, str]:
    """Download the Real-ESRGAN NCNN Vulkan binary from GitHub automatically.

    This is the **preferred** install path because:
      • No Python/pip dependencies (no torch, no basicsr).
      • GPU-accelerated via Vulkan — works on NVIDIA, AMD, and Intel GPUs.
      • Small download (~50 MB including built-in model files).
      • Works on Windows, Linux, and macOS.

    The binary is extracted to ``tools/realesrgan/bin/`` and the add-on
    will find it there without needing it to be on PATH.
    """
    bin_dir = get_realesrgan_bin_dir()
    bin_dir.mkdir(parents=True, exist_ok=True)

    # Already installed?
    if get_realesrgan_ncnn_exe():
        return True, f"Real-ESRGAN NCNN Vulkan already installed in {bin_dir}"

    keyword = _realesrgan_ncnn_platform_keyword()
    url = _get_github_release_asset("xinntao/Real-ESRGAN", keyword)
    if not url:
        return False, (
            "Could not resolve Real-ESRGAN NCNN Vulkan download URL from GitHub. "
            "Check your internet connection or download manually from "
            "https://github.com/xinntao/Real-ESRGAN/releases"
        )

    zip_path = bin_dir / "realesrgan-ncnn-vulkan.zip"
    try:
        print(f"[Upscaler] Downloading Real-ESRGAN NCNN Vulkan from {url} …")
        _download(url, zip_path)
        print(f"[Upscaler] Extracting to {bin_dir} …")
        _extract_zip(zip_path, bin_dir)
        zip_path.unlink(missing_ok=True)

        exe = get_realesrgan_ncnn_exe()
        if exe is None:
            return False, "Download succeeded but executable not found after extraction."

        # Make the binary executable on Linux/macOS
        if sys.platform != "win32":
            exe.chmod(exe.stat().st_mode | 0o111)

        return True, f"Real-ESRGAN NCNN Vulkan installed at {exe}"
    except Exception as e:
        zip_path.unlink(missing_ok=True)
        return False, f"Real-ESRGAN NCNN Vulkan install failed: {e}"


def install_realesrgan_python() -> tuple[bool, str]:
    """Install the Real-ESRGAN Python package and model weights automatically.

    Install order:
      1. PyTorch CPU-only wheel (lighter than the CUDA bundle, ~250 MB).
      2. basicsr, realesrgan, facexlib, gfpgan, opencv-python.
      3. Download RealESRGAN_x4plus.pth and RealESRGAN_x2plus.pth weights.

    Returns: (bool success, str message)
    """
    steps: list[str] = []

    # --- PyTorch (CPU-only) ---------------------------------------------------
    # The PyTorch CPU wheel lives on a separate index; without --index-url pip
    # would install the full CUDA-enabled wheel (~2 GB).
    print("[Upscaler] Installing PyTorch (CPU-only) …")
    ok, msg = _pip_install_with_index(
        ["torch", "torchvision"],
        index_url="https://download.pytorch.org/whl/cpu",
    )
    if not ok:
        return False, f"PyTorch install failed: {msg}"
    steps.append("PyTorch (CPU-only)")

    # --- Real-ESRGAN Python packages ------------------------------------------
    print("[Upscaler] Installing basicsr / realesrgan packages …")
    ok, msg = _pip_install([
        "basicsr>=1.4.2",
        "realesrgan>=0.3.0",
        "facexlib>=0.3.0",
        "gfpgan>=1.3.8",
        "opencv-python>=4.7.0",
    ])
    if not ok:
        return False, f"Real-ESRGAN package install failed: {msg}"
    steps.append("basicsr / realesrgan / opencv-python")

    # --- Model weights --------------------------------------------------------
    weights_dir = get_realesrgan_weights_dir()
    for filename, url in _REALESRGAN_WEIGHTS.items():
        target = weights_dir / filename
        if target.exists():
            steps.append(f"{filename} already present")
            continue
        try:
            print(f"[Upscaler] Downloading {filename} …")
            _download(url, target)
            steps.append(f"Downloaded {filename}")
        except Exception as e:
            # Non-fatal: RealESRGANer will re-download on first use
            print(f"[Upscaler] Warning: could not download {filename}: {e}")
            steps.append(f"{filename} (download failed — will retry on first use)")

    return True, "Real-ESRGAN Python installed: " + ", ".join(steps)


def install_realesrgan() -> tuple[bool, str]:
    """One-click installer for the Real-ESRGAN AI upscaler.

    Tries the fastest / smallest method first:
      1. NCNN Vulkan binary (~50 MB, no Python deps, any GPU via Vulkan).
      2. Python package fallback (torch + basicsr, ~400 MB total).

    Returns: (bool success, str message)
    """
    # Primary: NCNN Vulkan
    ok, msg = install_realesrgan_ncnn()
    if ok:
        return True, f"[NCNN Vulkan] {msg}"

    print(f"[Upscaler] NCNN Vulkan install failed ({msg}); trying Python fallback …")

    # Fallback: Python packages
    ok2, msg2 = install_realesrgan_python()
    if ok2:
        return True, f"[Python] {msg2}"

    return False, f"Both install methods failed.\nNCNN: {msg}\nPython: {msg2}"


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
        ok2, msg2 = _pip_install_requirements(opt_file)
        if not ok2:
            return False, f"Core OK, optional failed: {msg2}"
        msg = f"{msg}; {msg2}"

    return True, msg


def check_havok2fbx(path: str) -> bool:
    """Return True if the given folder appears to contain Havok2FBX binaries."""
    exe = Path(path) / "havok2fbx.exe"
    dll = Path(path) / "libfbxsdk.dll"
    return exe.is_file() and dll.is_file()


def install_havok2fbx() -> tuple[bool, str]:
    """Placeholder for Havok2FBX installation.

    Automatic download is not possible due to licensing.  This function
    simply creates the tools/havok2fbx folder and opens the GitHub release
    page in the browser so the user can manually obtain the binaries.
    """
    folder = _ensure_tools_dir("havok2fbx")
    try:
        import webbrowser
        webbrowser.open("https://github.com/dfm/havok2fbx/releases")
        return False, f"Please download Havok2FBX manually and place binaries in {folder}"
    except Exception as e:
        return False, f"Unable to open download page: {e}" 

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


def register():
    pass


def unregister():
    pass
