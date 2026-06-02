"""
path_utils.py
=============
Shared path-discovery helpers for the Blender Game Tools addon.

The key problem this solves: many AI/tool repositories (RigNet, libigl,
TripoSR, instant-ngp, …) can be installed on any drive, but naively
hard-coding "C:/" means they're invisible on D:, E:, F:, etc.

Usage
-----
    from .path_utils import candidate_paths, find_first

    # Get every plausible location for "RigNet" across all drives + home
    paths = candidate_paths("RigNet", "rignet-gj")

    # Find the first one that actually exists
    found = find_first(paths)
"""

from __future__ import annotations

import os
import string
import sys
from pathlib import Path


# ── Drive enumeration ─────────────────────────────────────────────────────────

def available_drives() -> list[str]:
    """
    Return a list of available drive roots on Windows (e.g. ['C:/', 'D:/', 'E:/']).
    On non-Windows systems returns ['/'].
    Always puts the system drive first so the most common location is tried first.
    """
    if sys.platform != "win32":
        return ["/"]

    sys_drive = os.environ.get("SYSTEMDRIVE", "C:").rstrip("\\/") + "/"
    drives = [sys_drive]

    for letter in string.ascii_uppercase:
        root = f"{letter}:/"
        if root == sys_drive:
            continue
        try:
            if os.path.exists(root):
                drives.append(root)
        except OSError:
            pass

    return drives


# ── Path candidate builder ────────────────────────────────────────────────────

def candidate_paths(*rel_paths: str) -> list[str]:
    """
    Build a list of candidate absolute paths for one or more relative path
    fragments, searched across:

      1. User's home directory  (~/<rel_path>)
      2. ~/Projects/<rel_path>
      3. Every available drive root  (<drive>/<rel_path>)
      4. Every available drive  (<drive>/Projects/<rel_path>)
      5. Every available drive  (<drive>/Users/<username>/<rel_path>)
      6. The addon directory itself  (for bundled tools)

    :param rel_paths: One or more directory names / sub-paths to search for.
                      All variants are tried for each name.
    :returns: Deduplicated ordered list of absolute path strings.
    """
    seen: set[str] = set()
    results: list[str] = []

    def _add(p: str) -> None:
        p = os.path.normpath(p)
        if p not in seen:
            seen.add(p)
            results.append(p)

    home = os.path.expanduser("~")
    username = os.environ.get("USERNAME") or os.environ.get("USER") or ""
    drives = available_drives()
    addon_dir = os.path.dirname(__file__)

    for rel in rel_paths:
        # Home-relative
        _add(os.path.join(home, rel))
        _add(os.path.join(home, "Projects", rel))

        # Drive-relative
        for drive in drives:
            _add(os.path.join(drive, rel))
            _add(os.path.join(drive, "Projects", rel))
            if username:
                _add(os.path.join(drive, "Users", username, rel))
                _add(os.path.join(drive, "Users", username, "Projects", rel))

        # Bundled inside the addon
        _add(os.path.join(addon_dir, rel))

    return results


def find_first(candidates: list[str], *, require_file: "str | None" = None) -> "str | None":
    """
    Return the first candidate path that exists as a directory.

    :param candidates:    List of absolute paths to check (from :func:`candidate_paths`).
    :param require_file:  If given, also require this file/subdir to exist inside
                          the found directory (e.g. ``"checkpoints"``).
    :returns:             Absolute path string, or ``None`` if nothing found.
    """
    for p in candidates:
        if not os.path.isdir(p):
            continue
        if require_file and not os.path.exists(os.path.join(p, require_file)):
            continue
        return p
    return None


# ── Fallback root ─────────────────────────────────────────────────────────────

def system_drive_root() -> str:
    """
    Return the system drive root (e.g. ``"C:/"`` on Windows, ``"/"`` on Linux/Mac).
    Use this instead of hard-coding ``"C:/"`` as a last-resort default.
    """
    if sys.platform == "win32":
        return os.environ.get("SYSTEMDRIVE", "C:").rstrip("\\/") + "/"
    return "/"
