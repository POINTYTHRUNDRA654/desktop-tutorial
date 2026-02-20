"""Helper routines to download and install external command-line tools.

Provides high-level Python functions for fetching binaries such as ffmpeg,
NVTT (nvcompress), DirectXTex (texconv), and Whisper CLI.  Designed to be
invoked from Blender add-on operators so that end users can get a working
environment with a single click.  Fallback behaviour will open a web browser
if automation is not possible.

All downloads go to the workspace `tools/` directory under tool-specific
subfolders.  Existing installations are left in place.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

TOOLS_ROOT = Path(__file__).resolve().parent / "tools"


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
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai-whisper"])
        return True, "whisper package installed"
    except Exception as e:
        return False, f"whisper install failed: {e}"


def install_niftools(blender_version: str = "3.6") -> tuple[bool, str]:
    """Invoke the PowerShell installer for the nifftools add-on if on Windows."""
    if os.name != "nt":
        return False, "Niftools installer only available on Windows."
    script = Path(__file__).resolve().parent / "tools" / "install_niftools.ps1"
    if not script.exists():
        return False, "install_niftools.ps1 not found"
    try:
        import subprocess
        subprocess.check_call([
            "powershell", "-ExecutionPolicy", "Bypass", "-File", str(script),
            "-BlenderVersion", blender_version
        ])
        return True, "Niftools installer executed"
    except Exception as e:
        return False, f"Failed to run Niftools installer: {e}"


def install_python_requirements(include_optional: bool = False) -> tuple[bool, str]:
    """Run pip install on requirements.txt (and optional if requested)."""
    try:
        import subprocess
        addon_dir = Path(__file__).resolve().parent
        files = [addon_dir / "requirements.txt"]
        if include_optional:
            files.append(addon_dir / "requirements-optional.txt")
        for f in files:
            if not f.exists():
                return False, f"Requirements file not found: {f}"
            try:
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", "--quiet", "-r", str(f)],
                    timeout=300,
                )
            except subprocess.TimeoutExpired:
                return False, (
                    f"pip install timed out after 300 s while processing {f.name}. "
                    "Check your internet connection or install dependencies manually."
                )
        return True, "Python dependencies installed"
    except Exception as e:
        return False, f"Failed to install python reqs: {e}"


def register():
    pass


def unregister():
    pass
