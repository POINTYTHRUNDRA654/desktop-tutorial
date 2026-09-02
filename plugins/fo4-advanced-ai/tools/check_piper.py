#!/usr/bin/env python3
"""Helper script to check if Piper is downloaded and guide user."""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    piper_path = repo_root / "release_staging/core/Data/F4AI/piper.exe"

    print("=" * 60)
    print("Piper TTS Download Check")
    print("=" * 60)
    print()

    if piper_path.exists():
        size_mb = piper_path.stat().st_size / (1024 * 1024)
        print(f"✅ Piper found: {piper_path}")
        print(f"   Size: {size_mb:.2f} MB")
        print()
        print("✅ You're ready to build the release package!")
        print()
        print("Next step: Run build_release.bat")
        return 0

    print("❌ Piper not found!")
    print()
    print("Download Piper:")
    print("1. Visit: https://github.com/rhasspy/piper/releases/latest")
    print("2. Download: piper_windows_amd64.zip")
    print("3. Extract: piper.exe")
    print("4. Copy to: release_staging/core/Data/F4AI/piper.exe")
    print()
    print("Or run: download_piper.bat (opens browser)")
    print()
    print("Expected location:")
    print(f"  {piper_path}")
    print()

    return 1


if __name__ == "__main__":
    sys.exit(main())
