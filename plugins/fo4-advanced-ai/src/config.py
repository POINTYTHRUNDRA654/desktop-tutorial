"""Configuration and path helpers for the Fallout 4 AI bridge."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def get_runtime_dir() -> Path:
    """Return runtime folder used by the Python executable."""
    if hasattr(sys, "_MEIPASS"):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def get_bridge_paths() -> dict[str, Path]:
    """Return standard bridge file paths relative to runtime dir."""
    current_dir = get_runtime_dir()
    return {
        "input": current_dir / "bridge_input.json",
        "output": current_dir / "bridge_output.json",
        "config": current_dir / "config.json",
    }


def get_env(key: str, default: str) -> str:
    """Read environment value with default fallback."""
    return os.getenv(key, default)
