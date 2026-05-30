"""
fo4_animation_export.py
=======================
Blender animation → Fallout 4 HKX export pipeline.

Workflow
--------
Blender Action → FBX → ck-cmd → .hkx → mod staging folder

ck-cmd (open-source) handles the FBX → HKX conversion.  It is managed
by tool_installers.py and can be auto-installed from the Setup panel.
Download: https://github.com/aerisarn/ck-cmd/releases

FO4 animation file locations
-----------------------------
  Creatures:  Data/Meshes/Actors/<creature>/Animations/<name>.hkx
  NPCs:       Data/Meshes/Actors/Character/Animations/<name>.hkx
  Furniture:  Data/Meshes/Furniture/<name>/Animations/<name>.hkx
  Flora:      Data/Meshes/Plants/<name>/Animations/<name>.hkx (if animated)

For carnivorous plants, the behavior graph (.hkx project file) is separate
from the individual animation clips.  This module exports the clip HKX files.
The behavior graph wiring (idle, attack, snap trigger) must be set up in the
Creation Kit's Behavior panel or via hkxcmd project files.

Supported animation types (for carnivorous plants)
---------------------------------------------------
  idle           — looping ambient motion (gentle sway, jaws open)
  idle_hungry    — looping hungry state (active sway, jaws wide)
  snap_attack    — one-shot snap close + shake
  snap_reset     — one-shot return to idle_hungry
  death          — one-shot death/wither sequence
  custom         — export with a user-defined name

Export settings (ck-cmd)
------------------------
  --game FO4                  target game
  --platform WIN64             Windows 64-bit
  --verbose                   show detailed output
  --skeleton <path>            skeleton HKX to bind against
                               (use vanilla FO4 creature skeleton or custom)

Frame range mapping
-------------------
When you use fo4_creature_rig.py's 'Setup Snap Animation Keyframes':
  Frames   0– 30  → idle.hkx
  Frames  60– 90  → snap_attack.hkx
  Frames 120–150  → idle_hungry.hkx

This module can export individual frame ranges as separate HKX clips.
"""

from __future__ import annotations

import os
import subprocess
import shutil
import traceback
import tempfile

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, IntProperty, EnumProperty,
    )
except ImportError:
    bpy      = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]


# ── FO4 animation clip presets ────────────────────────────────────────────────
# Frame ranges match fo4_creature_rig.py's SetupSnapAnimation output
_CLIP_PRESETS = {
    "idle":         (0,   30,  True),   # (start, end, loop)
    "idle_hungry":  (120, 150, True),
    "snap_attack":  (60,  90,  False),
    "snap_reset":   (90,  120, False),
    "death":        (150, 200, False),
}

# ck-cmd executable name
_CKCMD_EXE = "ck-cmd.exe"


def _find_ckcmd() -> "str | None":
    """Find ck-cmd executable from addon preferences or PATH."""
    try:
        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs:
            ckcmd_path = getattr(prefs, 'ckcmd_path', '')
            if ckcmd_path and os.path.isdir(ckcmd_path):
                exe = os.path.join(ckcmd_path, _CKCMD_EXE)
                if os.path.isfile(exe):
                    return exe
            # Also check tool_installers configured path
            from . import tool_installers
            paths = tool_installers.auto_configure_preferences() or {}
    except Exception:
        pass

    # Fallback: check common locations
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "tools", "ck-cmd", _CKCMD_EXE),
        r"D:\blender_tools\ck-cmd\ck-cmd.exe",
        r"C:\ck-cmd\ck-cmd.exe",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c

    return shutil.which("ck-cmd") or shutil.which("ck-cmd.exe")


def _export_fbx_for_hkx(obj, filepath: str,
                          frame_start: int, frame_end: int) -> tuple:
    """
    Export the armature + mesh as FBX for ck-cmd conversion.
    Uses the animation frame range [frame_start, frame_end].
    Returns (success, message).
    """
    try:
        orig_start = bpy.context.scene.frame_start
        orig_end   = bpy.context.scene.frame_end
        bpy.context.scene.frame_start = frame_start
        bpy.context.scene.frame_end   = frame_end

        # Select armature and its mesh children
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        for child in obj.children:
            if child.type == 'MESH':
                child.select_set(True)
        bpy.context.view_layer.objects.active = obj

        bpy.ops.export_scene.fbx(
            filepath=filepath,
            use_selection=True,
            use_armature_deform_only=True,
            add_leaf_bones=False,
            bake_anim=True,
            bake_anim_use_all_actions=False,
            bake_anim_frame_start=frame_start,
            bake_anim_frame_end=frame_end,
            bake_anim_step=1.0,
            bake_anim_simplify_factor=0.0,  # 0 = no simplification, preserve all keys
            axis_forward='-Z',
            axis_up='Y',
            apply_unit_scale=True,
            global_scale=1.0,
            path_mode='COPY',
            embed_textures=False,
        )

        bpy.context.scene.frame_start = orig_start
        bpy.context.scene.frame_end   = orig_end
        return True, f"FBX exported: {os.path.basename(filepath)}"

    except Exception as e:
        return False, f"FBX export failed: {e}"


def _run_ckcmd(ckcmd_exe: str, fbx_path: str, out_dir: str,
               skeleton_hkx: str = "", verbose: bool = False) -> tuple:
    """
    Run ck-cmd to convert FBX → HKX.
    Returns (success, stdout+stderr output, hkx_path).
    """
    os.makedirs(out_dir, exist_ok=True)

    cmd = [
        ckcmd_exe,
        "importanimation",
        fbx_path,
        "--game", "fo4",
        "--platform", "WIN64",
        "--dest", out_dir,
    ]
    if skeleton_hkx and os.path.isfile(skeleton_hkx):
        cmd += ["--skeleton", skeleton_hkx]
    if verbose:
        cmd.append("--verbose")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = result.stdout + result.stderr

        # ck-cmd returns 0 on success; check for output .hkx file
        base = os.path.splitext(os.path.basename(fbx_path))[0]
        hkx_path = os.path.join(out_dir, base + ".hkx")
        if os.path.isfile(hkx_path):
            return True, output, hkx_path
        else:
            return False, f"ck-cmd ran but no HKX found.\n{output}", ""

    except subprocess.TimeoutExpired:
        return False, "ck-cmd timed out (> 120 s). Check ck-cmd logs.", ""
    except FileNotFoundError:
        return False, (
            f"ck-cmd not found at: {ckcmd_exe}\n"
            "Install via Setup panel → Install ck-cmd, or set path in preferences."
        ), ""
    except Exception as e:
        return False, str(e), ""


def export_animation_clip(
    armature_obj,
    clip_name: str,
    mod_folder: str,
    anim_subpath: str,
    frame_start: int,
    frame_end: int,
    loop: bool = True,
    skeleton_hkx: str = "",
    verbose: bool = False,
) -> tuple:
    """
    Export one animation clip from Blender → HKX.

    Parameters
    ----------
    armature_obj : Blender armature object.
    clip_name    : Output file name (without extension), e.g. "idle".
    mod_folder   : Mod staging root (e.g. C:/MO2/mods/MyMod).
    anim_subpath : Path under Data/Meshes/ (e.g. "Plants/CarnivorousPlant/Animations").
    frame_start  : First frame of the clip.
    frame_end    : Last frame of the clip.
    loop         : Whether the animation loops (stored as metadata — ck-cmd uses
                   a project file for this; noted in the output filename).
    skeleton_hkx : Path to vanilla FO4 creature skeleton .hkx (optional but recommended).
    verbose      : Pass --verbose to ck-cmd.

    Returns (success, message, hkx_abs_path).
    """
    ckcmd = _find_ckcmd()
    if not ckcmd:
        return False, (
            "ck-cmd not found. Install it from the Setup panel "
            "(Setup & Status → Install ck-cmd) then set the path in preferences."
        ), ""

    # Build output directory: [mod_folder]/Data/Meshes/[anim_subpath]/
    out_dir = os.path.normpath(
        os.path.join(mod_folder, "Data", "Meshes", anim_subpath)
    )
    os.makedirs(out_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        fbx_path = os.path.join(tmp, f"{clip_name}.fbx")

        ok, msg = _export_fbx_for_hkx(armature_obj, fbx_path, frame_start, frame_end)
        if not ok:
            return False, msg, ""

        ok2, output, hkx_tmp = _run_ckcmd(ckcmd, fbx_path, tmp, skeleton_hkx, verbose)
        if not ok2:
            return False, output, ""

        # Move HKX to final location
        hkx_final = os.path.join(out_dir, f"{clip_name}.hkx")
        shutil.move(hkx_tmp, hkx_final)

    loop_note = " [LOOP]" if loop else " [ONE-SHOT]"
    return True, f"✓ {clip_name}.hkx exported{loop_note} → {hkx_final}", hkx_final


# ══════════════════════════════════════════════════════════════════════════════
# Operator: export a single clip
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ExportCreatureAnimation(Operator):
    """
    Export the active armature animation as a Fallout 4 HKX file.

    Converts the current Blender action (or a frame range of it) to HKX
    using ck-cmd.  Works for any armature — carnivorous plants, creatures,
    furniture, flora.

    Requires ck-cmd to be installed (Setup panel → Install ck-cmd).
    """
    bl_idname  = "fo4.export_creature_animation"
    bl_label   = "Export Creature Animation → FO4 HKX"
    bl_description = (
        "Export the active armature's animation as a FO4 HKX clip using ck-cmd. "
        "Select frame range and output path."
    )
    bl_options = {'REGISTER'}

    mod_folder: StringProperty(
        name="Mod Output Folder",
        description="Your mod staging folder (e.g. C:/MO2/mods/MyMod)",
        default="",
        subtype='DIR_PATH',
    )
    anim_subpath: StringProperty(
        name="Animation Sub-path",
        description=(
            "Path under Data/Meshes/ where HKX files go.\n"
            "Plants: Plants/MyPlant/Animations\n"
            "Creatures: Actors/MyCreature/Animations"
        ),
        default="Plants/CarnivorousPlant/Animations",
    )
    clip_name: StringProperty(
        name="Clip Name",
        description="Output filename without extension (e.g. 'idle', 'snap_attack')",
        default="idle",
    )
    clip_preset: EnumProperty(
        name="Clip Preset",
        description="Use a preset to auto-fill frame range and clip name",
        items=[
            ('CUSTOM',       "Custom (enter manually)",     ""),
            ('idle',         "Idle (frames 0–30, loop)",    ""),
            ('idle_hungry',  "Idle Hungry (120–150, loop)", ""),
            ('snap_attack',  "Snap Attack (60–90)",         ""),
            ('snap_reset',   "Snap Reset (90–120)",         ""),
            ('death',        "Death (150–200)",              ""),
        ],
        default='CUSTOM',
    )
    frame_start: IntProperty(name="Frame Start", default=0, min=0)
    frame_end:   IntProperty(name="Frame End",   default=30, min=1)
    loop:        BoolProperty(name="Looping Clip", default=True)
    skeleton_hkx: StringProperty(
        name="Skeleton HKX (optional)",
        description=(
            "Path to vanilla FO4 creature skeleton .hkx. "
            "Recommended for correct bone binding. "
            "Find in FO4 BA2: Meshes/Actors/<creature>/skeleton.hkx"
        ),
        default="",
        subtype='FILE_PATH',
    )
    verbose: BoolProperty(name="Verbose ck-cmd Output", default=False)

    def invoke(self, context, event):
        # Pre-fill mod folder from scene/preferences if available
        try:
            from . import preferences as _p
            prefs = _p.get_preferences()
            if prefs and not self.mod_folder:
                self.mod_folder = getattr(prefs, 'mod_output_folder', '') or ""
        except Exception:
            pass
        return context.window_manager.invoke_props_dialog(self, width=480)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "mod_folder")
        layout.prop(self, "anim_subpath")
        layout.separator()
        layout.prop(self, "clip_preset")
        if self.clip_preset == 'CUSTOM':
            layout.prop(self, "clip_name")
            row = layout.row()
            row.prop(self, "frame_start")
            row.prop(self, "frame_end")
            layout.prop(self, "loop")
        layout.separator()
        layout.prop(self, "skeleton_hkx")
        layout.prop(self, "verbose")

        ckcmd = _find_ckcmd()
        if ckcmd:
            layout.label(text=f"ck-cmd: {ckcmd}", icon='CHECKMARK')
        else:
            layout.label(text="⚠ ck-cmd not found — install from Setup panel", icon='ERROR')

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select an armature object first.")
            return {'CANCELLED'}
        if not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        # Apply preset
        if self.clip_preset != 'CUSTOM' and self.clip_preset in _CLIP_PRESETS:
            fs, fe, loop = _CLIP_PRESETS[self.clip_preset]
            clip_name  = self.clip_preset
            frame_start = fs
            frame_end   = fe
            use_loop    = loop
        else:
            clip_name  = self.clip_name or "clip"
            frame_start = self.frame_start
            frame_end   = self.frame_end
            use_loop    = self.loop

        ok, msg, hkx_path = export_animation_clip(
            armature_obj=obj,
            clip_name=clip_name,
            mod_folder=self.mod_folder,
            anim_subpath=self.anim_subpath,
            frame_start=frame_start,
            frame_end=frame_end,
            loop=use_loop,
            skeleton_hkx=self.skeleton_hkx,
            verbose=self.verbose,
        )

        lvl = 'INFO' if ok else 'ERROR'
        self.report({lvl}, msg)

        if ok:
            self.report({'INFO'},
                "HKX created. In Creation Kit: open creature/actor, "
                "assign the HKX to the correct behavior state.")
        return {'FINISHED'} if ok else {'CANCELLED'}


# ══════════════════════════════════════════════════════════════════════════════
# Operator: batch export all plant animation clips
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ExportPlantAnimationSet(Operator):
    """
    Batch-export all carnivorous plant animation clips in one click.

    Exports all five clips using the standard frame ranges from
    fo4_creature_rig.py's 'Setup Snap Animation Keyframes':
      idle.hkx          frames   0– 30  (loop)
      snap_attack.hkx   frames  60– 90  (one-shot)
      snap_reset.hkx    frames  90–120  (one-shot)
      idle_hungry.hkx   frames 120–150  (loop)

    Requires ck-cmd. Clips go to [mod_folder]/Data/Meshes/[anim_subpath]/.
    """
    bl_idname  = "fo4.export_plant_animation_set"
    bl_label   = "Export All Plant Animations → HKX"
    bl_description = (
        "Batch-export all carnivorous plant animation clips (idle, snap_attack, "
        "snap_reset, idle_hungry) as HKX files for Fallout 4."
    )
    bl_options = {'REGISTER'}

    mod_folder: StringProperty(
        name="Mod Output Folder", default="", subtype='DIR_PATH',
    )
    anim_subpath: StringProperty(
        name="Animation Sub-path",
        default="Plants/CarnivorousPlant/Animations",
    )
    skeleton_hkx: StringProperty(
        name="Skeleton HKX (optional)", default="", subtype='FILE_PATH',
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=460)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "mod_folder")
        layout.prop(self, "anim_subpath")
        layout.prop(self, "skeleton_hkx")
        layout.separator()
        layout.label(text="Will export: idle, snap_attack, snap_reset, idle_hungry", icon='INFO')
        ckcmd = _find_ckcmd()
        if ckcmd:
            layout.label(text=f"ck-cmd: {ckcmd}", icon='CHECKMARK')
        else:
            layout.label(text="⚠ ck-cmd not found", icon='ERROR')

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select the plant armature first.")
            return {'CANCELLED'}
        if not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        clips_to_export = [
            ("idle",        0,   30,  True),
            ("snap_attack", 60,  90,  False),
            ("snap_reset",  90,  120, False),
            ("idle_hungry", 120, 150, True),
        ]

        ok_count = fail_count = 0
        for name, fs, fe, loop in clips_to_export:
            ok, msg, _ = export_animation_clip(
                armature_obj=obj,
                clip_name=name,
                mod_folder=self.mod_folder,
                anim_subpath=self.anim_subpath,
                frame_start=fs,
                frame_end=fe,
                loop=loop,
                skeleton_hkx=self.skeleton_hkx,
            )
            if ok:
                ok_count += 1
                self.report({'INFO'}, msg)
            else:
                fail_count += 1
                self.report({'WARNING'}, f"Failed {name}: {msg}")

        self.report(
            {'INFO'} if not fail_count else {'WARNING'},
            f"Done: {ok_count}/{len(clips_to_export)} clips exported. "
            "Assign HKX files in CK creature behavior editor."
        )
        return {'FINISHED'} if not fail_count else {'CANCELLED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ExportCreatureAnimation,
    FO4_OT_ExportPlantAnimationSet,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[Anim Export] Could not register {cls.__name__}: {e}")
    print("[Anim Export] FO4 animation export pipeline registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
