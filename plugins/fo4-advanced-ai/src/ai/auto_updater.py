"""GitHub release updater for packaged Fallout 4 AI executables."""

from __future__ import annotations

import os
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import requests

def get_runtime_directory() -> Path:
    """Return runtime directory for packaged executable or source checkout."""
    if hasattr(sys, "_MEIPASS"):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


def resolve_current_version() -> str:
    """Resolve current runtime version from manifest, VERSION file, or fallback constant."""
    runtime_dir = get_runtime_directory()
    manifest_path = runtime_dir / "release_manifest.json"
    if manifest_path.exists():
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            version = str(data.get("version", "")).strip()
            channel = str(data.get("channel", "")).strip()
            if version and channel:
                return f"{version}-{channel.capitalize()}"
        except (OSError, ValueError):
            pass

    version_file = runtime_dir / "VERSION"
    if version_file.exists():
        try:
            value = version_file.read_text(encoding="utf-8").strip()
            if value:
                return value
        except OSError:
            pass

    return "0.1.0-Alpha.1"


CURRENT_VERSION = resolve_current_version()
GITHUB_RELEASES_API = (
    "https://api.github.com/repos/POINTYTHRUNDRA654/Fallout-4-advanced-AI/releases/latest"
)


def _is_auto_update_enabled() -> bool:
    """Return False if disable_auto_update is set in the local config file."""
    runtime_dir = get_runtime_directory()
    for candidate in ("config.json", "Data/F4AI/config.json"):
        cfg_path = runtime_dir / candidate
        if cfg_path.exists():
            try:
                data = json.loads(cfg_path.read_text(encoding="utf-8"))
                if int(data.get("disable_auto_update", 0)) == 1:
                    return False
            except (OSError, ValueError):
                pass
    return True


def check_for_updates(
    current_version: str = CURRENT_VERSION,
    releases_api: str = GITHUB_RELEASES_API,
    executable_path: str | None = None,
    timeout: float = 3.0,
) -> bool:
    """Check GitHub latest release and trigger hot update if newer build exists."""
    if not _is_auto_update_enabled():
        print("[Updater] Auto-update disabled via config (disable_auto_update=1).")
        return False
    print("[Updater] Checking for project updates...")
    try:
        response = requests.get(releases_api, timeout=timeout)
        if response.status_code != 200:
            print(f"[Updater Scan Failed] HTTP {response.status_code}; offline mode.")
            return False

        release_data: dict[str, Any] = response.json()
        latest_version = release_data.get("tag_name", current_version)
        if latest_version == current_version:
            print("[Updater] System is up to date.")
            return False

        assets = release_data.get("assets") or []
        if not assets:
            print("[Updater] New version found but no downloadable asset exists.")
            return False

        download_url = assets[0].get("browser_download_url")
        if not download_url:
            print("[Updater] New version found but asset URL is missing.")
            return False

        print(f"[Updater] New build available ({current_version} -> {latest_version}).")
        execute_hot_update(download_url, executable_path=executable_path)
        return True
    except (requests.RequestException, ValueError) as exc:
        print(f"[Updater Scan Failed] Operating in offline mode: {exc}")
        return False


def execute_hot_update(download_url: str, executable_path: str | None = None) -> None:
    """Download and atomically replace the running executable on Windows."""
    if not download_url.lower().startswith("https://"):
        print("[Updater] Refusing non-HTTPS update URL.")
        return

    exe_path = Path(executable_path or sys.executable).resolve()
    update_file_path = exe_path.with_suffix(exe_path.suffix + ".tmp")

    disallowed_batch_chars = {"%", "^", "&", "|", "<", ">"}
    if any(ch in str(exe_path) for ch in disallowed_batch_chars):
        print("[Updater] Refusing update due to unsupported path characters.")
        return

    print("[Updater] Downloading patch release packet...")
    response = requests.get(download_url, stream=True, timeout=20)
    response.raise_for_status()

    with update_file_path.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                handle.write(chunk)

    if os.name != "nt":
        print("[Updater] Hot-swap is Windows-only. Update downloaded; restart manually.")
        return

    updater_batch_path = exe_path.parent / "f4ai_patcher.bat"
    with updater_batch_path.open("w", encoding="utf-8", newline="\r\n") as bat:
        bat.write("@echo off\n")
        bat.write("timeout /t 2 /nobreak > nul\n")
        bat.write(f'del "{exe_path}"\n')
        bat.write(f'ren "{update_file_path}" "{exe_path.name}"\n')
        bat.write(f'start "" "{exe_path}"\n')
        bat.write(f'del "{updater_batch_path}"\n')

    print("[Updater] Binary pulled successfully. Swapping code roots...")
    subprocess.Popen(["cmd", "/c", str(updater_batch_path)], cwd=str(exe_path.parent))
    sys.exit(0)


if __name__ == "__main__":
    check_for_updates()
