#!/usr/bin/env python3
"""Download TinyLlama model for bundled installation."""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.request import urlretrieve


MODEL_URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
MODEL_FILENAME = "tinyllama-1.1b-chat.gguf"
MODEL_SIZE_MB = 668


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
    models_dir = repo_root / "release_staging/core/Data/F4AI/models"
    models_dir.mkdir(parents=True, exist_ok=True)

    model_path = models_dir / MODEL_FILENAME

    print("=" * 60)
    print("TinyLlama Model Download")
    print("=" * 60)
    print()

    if model_path.exists():
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"✅ Model already downloaded: {model_path}")
        print(f"   Size: {size_mb:.1f} MB")
        print()
        print("Delete the file to re-download.")
        return 0

    print(f"Downloading TinyLlama-1.1B-Chat-v1.0 (~{MODEL_SIZE_MB} MB)...")
    print(f"Source: {MODEL_URL}")
    print(f"Target: {model_path}")
    print()
    print("This may take 5-10 minutes depending on your connection...")
    print()

    try:
        urlretrieve(MODEL_URL, model_path, reporthook=download_progress)
        print()  # New line after progress
        print()
        print("=" * 60)
        print("✅ Download complete!")
        print(f"   Model: {model_path}")
        print(f"   Size: {model_path.stat().st_size / (1024 * 1024):.1f} MB")
        print("=" * 60)
        return 0
    except Exception as exc:
        print()
        print(f"❌ Download failed: {exc}")
        print()
        print("You can manually download from:")
        print(MODEL_URL)
        print()
        print(f"Save to: {model_path}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
