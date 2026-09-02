"""Central path resolution for the F4AI bridge.

All submodules (src/ai/*.py, tools/*.py) should import from here
instead of hard-coding drive letters or absolute paths.

Priority order for DATA_DIR (FO4 game data location):
  1. game_data_path in config.json next to the exe
  2. Windows registry (Bethesda / Steam installs)
  3. Directory containing the running exe / script

Priority order for MEMORY_BASE (where NPC memories are stored):
  1. memory_path in config.json  — user-chosen location (any drive)
  2. %USERPROFILE%\\Documents\\My Games\\Fallout4\\F4AI\\NPC_Memories  — standard default
  3. DATA_DIR / NPC_Memories  — last resort fallback

Users with full C: drives can set memory_path in config.json to any drive,
e.g.  "memory_path": "H:/F4AI_Memory"
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Exe-local dir — folder containing the .exe in production, or src/ in dev
if hasattr(sys, "_MEIPASS"):
    _EXE_DIR = Path(sys.executable).resolve().parent
else:
    _EXE_DIR = Path(__file__).resolve().parent


def _load_config() -> dict:
    """Load config.json from next to the exe. Returns {} on any error."""
    local_cfg = _EXE_DIR / "config.json"
    if local_cfg.exists():
        try:
            return json.loads(local_cfg.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {}


def _locate_data_dir(cfg: dict) -> Path:
    # 1. Manual override in config.json
    override = cfg.get("game_data_path", "").strip()
    if override:
        return Path(override)

    # 2. Windows registry — Bethesda launcher and Steam both write this key
    try:
        import winreg
        for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            for subkey in (
                r"SOFTWARE\Bethesda Softworks\Fallout4",
                r"SOFTWARE\WOW6432Node\Bethesda Softworks\Fallout4",
            ):
                try:
                    key = winreg.OpenKey(hive, subkey)
                    install_path, _ = winreg.QueryValueEx(key, "installed path")
                    winreg.CloseKey(key)
                    return Path(install_path) / "Data" / "F4AI"
                except OSError:
                    continue
    except ImportError:
        pass

    # 3. Fall back — exe lives directly in Data/F4AI/
    return _EXE_DIR


def _locate_memory_base(cfg: dict, data_dir: Path) -> Path:
    # 1. User-chosen path in config.json — works on any drive
    override = cfg.get("memory_path", "").strip()
    if override:
        p = Path(override)
        p.mkdir(parents=True, exist_ok=True)
        return p

    # 2. Standard FO4 user-data location — always writable, never in Program Files
    try:
        user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
        standard = Path(user_profile) / "Documents" / "My Games" / "Fallout4" / "F4AI" / "NPC_Memories"
        standard.mkdir(parents=True, exist_ok=True)
        return standard
    except OSError:
        pass

    # 3. Last resort — next to the game data (may require admin on some installs)
    fallback = data_dir / "NPC_Memories"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


# ── Public exports ────────────────────────────────────────────────────────────

_CFG        = _load_config()
DATA_DIR    = _locate_data_dir(_CFG)

# Where all NPC memories, world state, training data, etc. are stored.
# Controlled by "memory_path" in config.json — set it to any drive you like.
MEMORY_BASE = _locate_memory_base(_CFG, DATA_DIR)
