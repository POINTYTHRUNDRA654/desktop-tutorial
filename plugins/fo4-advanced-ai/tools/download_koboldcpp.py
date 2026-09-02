#!/usr/bin/env python3
"""Download KoboldCPP portable executable for bundled installation."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from urllib.request import urlretrieve


KOBOLDCPP_URL = "https://github.com/LostRuins/koboldcpp/releases/latest/download/koboldcpp.exe"
KOBOLDCPP_NOCUDA_URL = "https://github.com/LostRuins/koboldcpp/releases/latest/download/koboldcpp_nocuda.dll"


def download_progress(block_num, block_size, total_size):
    """Show download progress."""
    downloaded = block_num * block_size
    percent = (downloaded / total_size) * 100 if total_size > 0 else 0
    mb_downloaded = downloaded / (1024 * 1024)
    mb_total = total_size / (1024 * 1024)

    if percent <= 100:
        print(f"\rDownloading: {mb_downloaded:.1f} MB / {mb_total:.1f} MB ({percent:.1f}%)", end="", flush=True)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    runtime_dir = repo_root / "release_staging/core/Data/F4AI/runtime"
    runtime_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("KoboldCPP Runtime Download")
    print("=" * 60)
    print()

    # Download main executable
    koboldcpp_path = runtime_dir / "koboldcpp.exe"
    if koboldcpp_path.exists():
        print(f"✅ koboldcpp.exe already exists")
    else:
        print("Downloading koboldcpp.exe...")
        try:
            urlretrieve(KOBOLDCPP_URL, koboldcpp_path, reporthook=download_progress)
            print()
            print("✅ koboldcpp.exe downloaded")
        except Exception as exc:
            print(f"\n❌ Failed to download koboldcpp.exe: {exc}")
            return 1

    print()

    # Download CPU DLL
    nocuda_path = runtime_dir / "koboldcpp_nocuda.dll"
    if nocuda_path.exists():
        print(f"✅ koboldcpp_nocuda.dll already exists")
    else:
        print("Downloading koboldcpp_nocuda.dll...")
        try:
            urlretrieve(KOBOLDCPP_NOCUDA_URL, nocuda_path, reporthook=download_progress)
            print()
            print("✅ koboldcpp_nocuda.dll downloaded")
        except Exception as exc:
            print(f"\n❌ Failed to download koboldcpp_nocuda.dll: {exc}")
            return 1

    print()
    print("=" * 60)
    print("✅ KoboldCPP runtime ready!")
    print(f"   Location: {runtime_dir}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
