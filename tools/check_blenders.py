"""Utility to automate compatibility checks across multiple Blender builds.

This script is *not* executed from within Blender.  Instead it spawns each
Blender executable listed on the command line and asks it to import and
register the add-on headlessly.  Any exceptions or version information are
printed to stdout so you can inspect them or redirect into a log file.

Usage (from a normal Python environment or the command prompt):

    python tools/check_blenders.py \
        "C:\Program Files\Blender Foundation\Blender 2.93\blender.exe" \
        "C:\Program Files\Blender Foundation\Blender 3.6\blender.exe" \
        "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"

You can also point it at a directory; it will find any "blender.exe" he
contains (recursive).  Results are reported one line per executable.

The returned exit code will be zero if *all* builds exited with status 0 and
printed the expected "OK" message.  If any build failed, the script returns
non‑zero so it can be used in a CI job or batch script.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


BLENDER_TEST_EXPR = r"import bpy, traceback; \
try:\
    import fallout4_tutorial_helper as addon; \
    addon.register(); \
    print('OK', bpy.app.version_string); \
    addon.unregister(); \
except Exception as e:\
    print('ERROR', e); traceback.print_exc(); sys.exit(1)"


def find_blender_executables(paths: list[Path]) -> list[Path]:
    """Expand directories and verify that each path is a blender executable."""
    exes: list[Path] = []
    for p in paths:
        if p.is_dir():
            # look for blender.exe (Windows) or blender binary otherwise
            for candidate in p.rglob("blender*"):
                if candidate.is_file() and candidate.name.startswith("blender"):
                    exes.append(candidate)
        elif p.is_file():
            exes.append(p)
        else:
            print(f"warning: {p} does not exist", file=sys.stderr)
    return exes


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run a quick import test of the Fallout4 add-on in several Blender builds."
    )
    parser.add_argument(
        "paths",
        nargs="+",
        help="Paths to blender executables or folders containing them",
    )
    args = parser.parse_args()

    blenders = find_blender_executables([Path(p) for p in args.paths])
    if not blenders:
        print("no blender executables found", file=sys.stderr)
        return 2

    overall_ok = True
    for exe in blenders:
        print("\n--- testing", exe)
        try:
            result = subprocess.run(
                [str(exe), "-b", "--python-expr", BLENDER_TEST_EXPR],
                capture_output=True,
                text=True,
                timeout=300,
            )
        except Exception as e:
            print(f"failed to launch {exe}: {e}")
            overall_ok = False
            continue

        print(result.stdout)
        if result.stderr:
            print("<stderr>", result.stderr, file=sys.stderr)

        if result.returncode != 0 or "OK" not in result.stdout:
            overall_ok = False

    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
