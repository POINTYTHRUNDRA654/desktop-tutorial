"""Utility to automate compatibility checks across multiple Blender builds.

This script is *not* executed from within Blender.  Instead it spawns each
Blender executable listed on the command line and asks it to import and
register the add-on headlessly.  Any exceptions or version information are
printed to stdout so you can inspect them or redirect into a log file.

Usage (from a normal Python environment or the command prompt):

    python tools/check_blenders.py \
        "D:\Program Files\Blender Foundation\Blender 5.0\blender.exe"

You can point the script at any Blender executables on your D: drive if
C: is full; the tool will recurse directories and find "blender.exe" files
recursively.

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
    # create a simple cube for tests\
    bpy.ops.mesh.primitive_cube_add(); obj=bpy.context.active_object; \
    bpy.ops.fo4.generate_wind_weights(); \
    bpy.ops.fo4.apply_wind_animation(); \
    # prepare armature and auto-weight paint\
    arm = addon.animation_helpers.AnimationHelpers.setup_fo4_armature(); \
    bpy.ops.object.select_all(action='DESELECT'); \
    obj.select_set(True); arm.select_set(True); \
    bpy.context.view_layer.objects.active = arm; \
    bpy.ops.fo4.auto_weight_paint(); \
    # batch operations on the cube (should run without error)\
    bpy.ops.fo4.batch_generate_wind_weights(); \
    bpy.ops.fo4.batch_apply_wind_animation(); \
    bpy.ops.fo4.batch_auto_weight_paint(); \
    bpy.ops.fo4.toggle_wind_preview(); bpy.ops.fo4.toggle_wind_preview(); \
    # UV preservation test: create a simple mesh with differing UVs
    bpy.ops.mesh.primitive_plane_add(size=1); mesh = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=1)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = mesh.data.uv_layers.active.data
    for idx in range(len(uv)):
        uv[idx].uv = (idx, idx)
    before = [tuple(loop.uv) for loop in mesh.data.uv_layers.active.data]
    bpy.ops.fo4.optimize_mesh()
    after = [tuple(loop.uv) for loop in mesh.data.uv_layers.active.data]
    if before != after:
        print('UVs changed after optimize:', before, after)
        sys.exit(2)
    else:
        print('UV preservation OK'); \
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
