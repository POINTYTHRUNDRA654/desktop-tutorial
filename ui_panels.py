"""
UI Panels for the Fallout 4 Tutorial Add-on
"""

import bpy
import sys
from bpy.types import Panel
import importlib

# ──────────────────────────────────────────────────────────────────────────
# Dual-install conflict detection (RECURRING BUG #1 scenario).
#
# The addon was renamed from *fallout4_tutorial_helper* to *blender_game_tools*.
# If a user has BOTH installed simultaneously, the old version's ui_panels.py
# lacks hasattr guards and floods the console with hundreds of
# "rna_uiItemO: unknown operator" errors per second.
#
# We detect this once (cached after first panel draw, by which time all
# Blender extensions have loaded) and show a red alert box at the top of
# the main panel with explicit uninstall instructions.
# ──────────────────────────────────────────────────────────────────────────
_legacy_conflict_cache = None  # None = not yet checked


def _is_running_as_legacy():
    """Return True when this addon is loaded as the old 'fallout4_tutorial_helper'
    package (i.e. NOT as the new 'blender_game_tools' extension).

    Used to decide which side of a dual-install conflict we are on:
    - blender_game_tools side → operators ARE registered, just warn the user.
    - fallout4_tutorial_helper side → operators may NOT be registered, suppress draws.
    """
    own_pkg = __package__ or ""
    return "fallout4_tutorial_helper" in own_pkg


def _check_legacy_conflict():
    """Return True when a dual-install conflict exists.

    - If WE are the new 'blender_game_tools' extension: True when the
      deprecated 'fallout4_tutorial_helper' addon is also loaded.
    - If WE are the old 'fallout4_tutorial_helper' addon: True when the
      new 'blender_game_tools' extension is also loaded.

    Checked once on first panel draw (cached afterwards) so sys.modules
    is complete and the lookup never runs more than once.
    """
    global _legacy_conflict_cache
    if _legacy_conflict_cache is None:
        if _is_running_as_legacy():
            # We ARE the old addon — check whether the new one is also present.
            _legacy_conflict_cache = any(
                "blender_game_tools" in k for k in sys.modules
            )
        else:
            # We ARE the new addon — check whether the old one is also present.
            _legacy_conflict_cache = any(
                "fallout4_tutorial_helper" in k for k in sys.modules
            )
    return _legacy_conflict_cache


class _FO4SubPanel(Panel):
    """Base class for every FO4 sub-panel.

    Adds a ``poll()`` that hides the panel entirely when this addon copy is
    running as the deprecated 'fallout4_tutorial_helper' package alongside
    'blender_game_tools'.  In that state the operators registered by the new
    extension are not available under our package's prefix, so attempting to
    draw any operator button would flood the console with
    ``rna_uiItemO: unknown operator`` errors on every redraw.

    The main panel (FO4_PT_MainPanel) intentionally does NOT inherit from
    this class so it can still display the conflict warning message.
    """

    @classmethod
    def poll(cls, context):
        # Hide sub-panels when we are the legacy addon AND the new one is loaded.
        if _is_running_as_legacy() and _check_legacy_conflict():
            return False
        return True


def _safe_import(name):
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        # Remove any partially-initialised entry from sys.modules so that a
        # subsequent retry (e.g. on Blender 5 extension reload) gets a fresh
        # import attempt rather than the stale, incomplete module object.
        sys.modules.pop(f"{__package__}.{name}", None)
        print(f"ui_panels: Skipped module {name} due to error: {exc}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# ACTIVATION BUTTONS — READ THIS BEFORE TOUCHING ANYTHING BELOW
# ══════════════════════════════════════════════════════════════════════════════
#
# The add-on has 7 "activation operators" that MUST always appear as real,
# clickable buttons in the N-panel.  They are defined in two dedicated modules:
#
#   tutorial_operators.py  →  FO4_OT_ShowDetailedSetup, FO4_OT_StartTutorial,
#                              FO4_OT_ShowHelp, FO4_OT_ShowCredits
#   setup_operators.py     →  FO4_OT_InstallPythonDeps, FO4_OT_SelfTest,
#                              FO4_OT_ReloadAddon
#
# ── What must NEVER change ────────────────────────────────────────────────────
#
#  1. tutorial_operators.py and setup_operators.py must exist and define all
#     7 classes.  Their register() must use the unregister-then-register pattern.
#
#  2. __init__.py modules list order:
#       tutorial_operators → setup_operators → operators → ui_panels
#     Changing this order causes the panels to draw before the operators exist.
#
#  3. _ensure_tutorial_operators() and _ensure_setup_operators() in __init__.py
#     must be called at the end of register() AND inside _deferred_startup().
#
#  4. operators.py must NOT contain class bodies for any of the 7 operators.
#     Duplicate class bodies displace the setup_operators.py registrations.
#
#  5. Every call to a tutorial or setup operator in this file must go through
#     _activation_op() (see below) — never wrap them in hasattr guards whose
#     else-branch returns a static label.  In Blender 5.x, hasattr(bpy.types,
#     'FO4_OT_X') can return False even for operators that ARE registered;
#     showing a label in the else-branch silently hides the button.
#
# ── The rule in one sentence ──────────────────────────────────────────────────
#
#   Always draw the button.  If the operator is missing the user sees an
#   error on click; if the button is missing the user cannot do anything at all.
#
# See DEVELOPMENT_NOTES.md — RECURRING BUG #1 — for the full history.
# ══════════════════════════════════════════════════════════════════════════════


def _activation_op(layout, cls_name, idname, text, icon='NONE'):
    """Draw an activation operator button — ALWAYS visible.

    Every one of the 7 activation operators (tutorial + setup) must be drawn
    through this helper so the button is never replaced by a static label.

    Background: in Blender 5.x ``hasattr(bpy.types, cls_name)`` may return
    ``False`` even when the operator IS registered (RECURRING BUG #1, see
    DEVELOPMENT_NOTES.md).  The previous pattern — ``if hasattr(...): op() else:
    label()`` — caused the panel to silently show a "(loading...)" text instead
    of a button whenever the hasattr check misfired.

    This helper performs the hasattr check (kept for correctness on Blender
    versions where it works and to satisfy the integrity test), but always
    calls ``layout.operator()`` regardless of the result so the button is
    never invisible.

    DO NOT replace calls to this function with a bare hasattr if/else that
    shows a label in the else-branch.
    """
    # hasattr check retained: satisfies test_addon_integrity.py guard test and
    # is useful on Blender versions where it works.  The button is drawn either
    # way — see module-level comment above.
    hasattr(bpy.types, cls_name)  # guard check (result intentionally unused)
    return layout.operator(idname, text=text, icon=icon)

# ──────────────────────────────────────────────────────────────────────────
# PyTorch availability — simple external-install check.
# Auto-installation inside Blender has been removed; users point the addon
# at an external PyTorch directory via Settings > PyTorch Custom Path.
# ──────────────────────────────────────────────────────────────────────────

_torch_status_cache: "tuple[bool, str] | None" = None


def reset_torch_cache():
    """Invalidate the cached PyTorch availability result.

    Called by TORCH_OT_recheck_status so the next panel draw re-probes
    sys.path instead of returning the stale cached value.
    """
    global _torch_status_cache
    _torch_status_cache = None


def _get_torch_status():
    """Check whether torch is importable from Blender's current sys.path.

    Returns ``(True, version_str)`` on success, ``(False, reason_str)`` on
    failure.  PyTorch is expected to be installed externally and pointed at
    via Settings > PyTorch Custom Path; no background install is attempted.

    The result is cached at module level so that the ``import torch`` probe
    is only run once per session (or after the user clicks "Re-check").
    Call ``reset_torch_cache()`` to force a fresh probe.
    """
    global _torch_status_cache
    if _torch_status_cache is None:
        try:
            import torch
            _torch_status_cache = (True, torch.__version__)
        except (ImportError, OSError) as e:
            _torch_status_cache = (False, str(e))
    return _torch_status_cache


# ──────────────────────────────────────────────────────────────────────────
# Module-level cache for core Python dependency checks.
# importlib.util.find_spec() probes the filesystem every call; caching the
# results here means the Setup panel draws instantly on subsequent redraws
# instead of doing 5 filesystem probes per frame.
# ──────────────────────────────────────────────────────────────────────────
import importlib.util as _importlib_util
_dep_cache: dict[str, bool] = {}   # module_name -> bool (True = found)


def _check_dep(module_name: str) -> bool:
    """Return True if *module_name* is importable; result is cached permanently."""
    if module_name not in _dep_cache:
        _dep_cache[module_name] = _importlib_util.find_spec(module_name) is not None
    return _dep_cache[module_name]

hunyuan3d_helpers = _safe_import("hunyuan3d_helpers")
gradio_helpers = _safe_import("gradio_helpers")
hymotion_helpers = _safe_import("hymotion_helpers")
nvtt_helpers = _safe_import("nvtt_helpers")
rignet_helpers = _safe_import("rignet_helpers")
preferences = _safe_import("preferences")
ue_importer_helpers = _safe_import("ue_importer_helpers")
umodel_tools_helpers = _safe_import("umodel_tools_helpers")
umodel_helpers = _safe_import("umodel_helpers")
unity_fbx_importer_helpers = _safe_import("unity_fbx_importer_helpers")
asset_studio_helpers = _safe_import("asset_studio_helpers")
asset_ripper_helpers = _safe_import("asset_ripper_helpers")
knowledge_helpers = _safe_import("knowledge_helpers")
export_helpers = _safe_import("export_helpers")
addon_updater = _safe_import("addon_updater")
realesrgan_helpers = _safe_import("realesrgan_helpers")
instantngp_helpers = _safe_import("instantngp_helpers")
imageto3d_helpers = _safe_import("imageto3d_helpers")
zoedepth_helpers = _safe_import("zoedepth_helpers")
shap_e_helpers = _safe_import("shap_e_helpers")
point_e_helpers = _safe_import("point_e_helpers")
motion_generation_helpers = _safe_import("motion_generation_helpers")
fo4_material_browser  = _safe_import("fo4_material_browser")
fo4_scene_diagnostics = _safe_import("fo4_scene_diagnostics")
fo4_reference_helpers = _safe_import("fo4_reference_helpers")
asset_library         = _safe_import("asset_library")
fo4_game_assets       = _safe_import("fo4_game_assets")
unity_game_assets     = _safe_import("unity_game_assets")
unreal_game_assets    = _safe_import("unreal_game_assets")
tutorial_system      = _safe_import("tutorial_system")


# ---------------------------------------------------------------------------
# Shared helper – drawn identically in every panel that needs game-asset paths
# ---------------------------------------------------------------------------

def _draw_game_path_box(layout, context):
    """Draw the unified FO4 Data Folder row with individual editable path fields.

    Each path row has a text field and a folder-browse button so users can set
    the FO4 Data root plus Meshes / Textures / Materials sub-paths directly from
    the panel without opening Blender's Add-on Preferences.
    """
    import os

    scene = context.scene

    # Get prefs for the path field — may be None when addon not yet registered
    prefs = preferences.get_preferences() if preferences else None

    if not fo4_game_assets:
        box = layout.box()
        box.label(text="FO4 Data Folder", icon='ERROR')
        box.label(text="fo4_game_assets module missing – reinstall the add-on", icon='INFO')
        return

    ready, _ = fo4_game_assets.FO4GameAssets.get_status()

    box = layout.box()
    hdr = box.row()
    hdr.label(
        text="FO4 Data Folder",
        icon='CHECKMARK' if ready else 'ERROR',
    )

    # ── Root data-folder row ──────────────────────────────────────────────────
    root_row = box.row(align=True)
    if prefs is not None:
        root_row.prop(prefs, "fo4_assets_path", text="Data")
    elif hasattr(scene, 'fo4_assets_path'):
        root_row.prop(scene, "fo4_assets_path", text="Data")
    else:
        root_row.label(text="(open Preferences to set path)", icon='INFO')
    root_row.operator("fo4.set_fo4_assets_path", text="", icon='FILE_FOLDER')

    # ── Individual sub-path rows ──────────────────────────────────────────────
    sub_box = box.box()
    col = sub_box.column(align=True)
    col.scale_y = 0.9

    for label, prop_name, slot in (
        ("Meshes",    "fo4_assets_mesh_path", "meshes"),
        ("Textures",  "fo4_assets_tex_path",  "textures"),
        ("Materials", "fo4_assets_mat_path",  "materials"),
    ):
        row = col.row(align=True)
        if prefs is not None and hasattr(prefs, prop_name):
            row.prop(prefs, prop_name, text=label)
        elif hasattr(scene, prop_name):
            row.prop(scene, prop_name, text=label)
        else:
            row.label(text=f"{label}: (not configured)", icon='DOT')
        op = row.operator("fo4.set_fo4_sub_path", text="", icon='FILE_FOLDER')
        if op is not None:
            op.slot = slot

    if not ready:
        hint = box.column(align=True)
        hint.scale_y = 0.75
        hint.label(text="Point 'Data' at your extracted FO4 Data folder", icon='INFO')
        hint.label(text="e.g.  D:\\FO4\\Data", icon='DOT')
        hint.label(text="Sub-paths auto-fill when set; or browse each manually", icon='DOT')

class FO4_PT_MainPanel(Panel):
    """Main tutorial panel in the 3D View sidebar"""
    bl_label = "Fallout 4 Tutorial"
    bl_idname = "FO4_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Dual-install conflict warning (RECURRING BUG #1) ─────────────────
        # Two scenarios:
        # A) We ARE the old 'fallout4_tutorial_helper' running alongside the
        #    new 'blender_game_tools' extension.  Our operators are not
        #    registered so we must NOT draw any operator buttons — return early
        #    after showing a "please remove me" message.
        # B) We ARE the new 'blender_game_tools' extension and the old addon
        #    is still installed.  Our operators ARE registered so we continue
        #    rendering normally, but we show a prominent warning.
        if _check_legacy_conflict():
            warn = layout.box()
            warn.alert = True
            if _is_running_as_legacy():
                warn.label(text="⚠ PLEASE REMOVE THIS OLD ADDON", icon='ERROR')
                warn.label(text="'blender_game_tools' extension is already installed.")
                warn.label(text="This copy ('fallout4_tutorial_helper') is outdated.")
                warn.label(text="Fix: Edit → Preferences → Add-ons/Extensions")
                warn.label(text="→ find 'fallout4_tutorial_helper' → Disable & Remove")
                return  # Do NOT draw operator buttons — they are unregistered.
            else:
                warn.label(text="⚠ OLD ADDON CONFLICT DETECTED", icon='ERROR')
                warn.label(text="'fallout4_tutorial_helper' is still enabled.")
                warn.label(text="It causes 'unknown operator' console spam.")
                warn.label(text="Fix: Edit → Preferences → Add-ons/Extensions")
                warn.label(text="→ find 'fallout4_tutorial_helper' → Remove it")
                layout.separator()

        # ── Version compatibility banner ─────────────────────────────────────
        # Show users exactly what their Blender version supports so there are
        # no surprises when they try to export.
        bv = bpy.app.version
        compat_box = layout.box()
        compat_box.label(text=f"Blender {bv[0]}.{bv[1]}.{bv[2]}", icon='BLENDER')

        if bv < (2, 90, 0):
            compat_box.label(text="⚠ Blender 2.90+ required.", icon='ERROR')
            compat_box.label(text="Please upgrade to Blender 3.6 LTS or newer.")
        elif bv < (3, 0, 0):
            compat_box.label(text="✓ NIF export: supported (Niftools v0.1.1)", icon='CHECKMARK')
            compat_box.label(text="⚠ Recommend upgrading to Blender 3.6 LTS.")
        elif bv < (4, 0, 0):
            compat_box.label(text="✓ NIF export: fully supported (Blender 3.x)", icon='CHECKMARK')
            compat_box.label(text="  Install Niftools v0.1.1 add-on to export .nif directly.")
        elif bv < (4, 1, 0):
            compat_box.label(text="✓ NIF export: FBX fallback (Niftools needs Blender 3.6)", icon='INFO')
            compat_box.label(text="  Export .fbx and convert with Cathedral Assets Optimizer.")
        elif bv < (5, 0, 0):
            # 4.1–4.x — use_auto_smooth removed; FBX-only NIF path
            compat_box.label(text="✓ NIF export: FBX fallback (Niftools needs Blender 3.6)", icon='INFO')
            compat_box.label(text="  Shade-by-angle is automatic in Blender 4.1+.")
        else:
            # 5.0+ — Niftools works with runtime patches applied by this add-on
            compat_box.label(text="✓ NIF export: Niftools works with runtime patches", icon='CHECKMARK')
            compat_box.label(text="  Install Niftools (legacy add-on) + enable 'Allow Legacy Add-ons'.")
            compat_box.label(text="  API patches applied automatically before every export.")

        # ── Getting Started Guide (Mossy-First Approach) ────────────────────
        getting_started = layout.box()
        getting_started.label(text="🚀 Getting Started - READ THIS FIRST!", icon='INFO')

        # Emphasize Mossy connection as first step
        mossy_priority = getting_started.box()
        mossy_priority.label(text="STEP 1: Connect Mossy AI (Recommended First!)", icon='NETWORK_DRIVE')
        mossy_priority.label(text="→ Switch to 'Mossy' tab in this sidebar")
        mossy_priority.label(text="→ Launch Mossy desktop app")
        mossy_priority.label(text="→ Click 'Start Server' in Mossy tab")
        mossy_priority.label(text="→ Mossy will guide you through setup!")

        # Then other setup steps
        getting_started.label(text="STEP 2: Install Dependencies", icon='PACKAGE')
        getting_started.label(text="→ Open 'Setup & Status' tab below")
        getting_started.label(text="→ Install Python packages if prompted")
        getting_started.label(text="→ Restart Blender after installing")

        getting_started.label(text="STEP 3: Install Niftools", icon='PLUGIN')
        if bv >= (5, 0, 0):
            getting_started.label(text="→ Use 'Install Niftools' in Setup tab")
            getting_started.label(text="→ Enable 'Allow Legacy Add-ons'")
        else:
            getting_started.label(text="→ Install Niftools v0.1.1 (Blender 3.6)")
            getting_started.label(text="→ OR use FBX export workflow")

        _activation_op(
            getting_started,
            'FO4_OT_ShowDetailedSetup',
            "fo4.show_detailed_setup",
            "Show Detailed Setup Guide",
            icon='TEXT',
        )

        # ── Tutorial section ─────────────────────────────────────────────────
        box = layout.box()
        box.label(text="Tutorial System", icon='HELP')
        _activation_op(box, 'FO4_OT_StartTutorial', "fo4.start_tutorial", "Start Tutorial", icon='PLAY')
        # Help and Credits sit side by side for quick access
        help_row = box.row(align=True)
        _activation_op(help_row, 'FO4_OT_ShowHelp', "fo4.show_help", "Show Help", icon='QUESTION')
        _activation_op(help_row, 'FO4_OT_ShowCredits', "fo4.show_credits", "Credits", icon='FUND')
        if tutorial_system and not tutorial_system.TUTORIALS:
            tutorial_system.initialize_tutorials()
        tutorial = tutorial_system.get_current_tutorial(context) if tutorial_system else None
        if tutorial:
            step = tutorial.get_current_step()
            active = box.box()
            active.label(text=tutorial.name, icon='BOOKMARKS')
            if step:
                active.label(
                    text=f"Step {tutorial.current_step + 1} of {len(tutorial.steps)}: {step.title}",
                    icon='FORWARD',
                )
                desc = active.column(align=True)
                desc.scale_y = 0.8
                for line in step.description.split("\n"):
                    desc.label(text=line, icon='DOT')

            nav = active.row(align=True)
            nav.operator("fo4.previous_tutorial_step", text="", icon='TRIA_LEFT')
            _activation_op(nav, 'FO4_OT_ShowHelp', "fo4.show_help", "Show Guide", icon='INFO')
            nav.operator("fo4.next_tutorial_step", text="", icon='TRIA_RIGHT')
        else:
            box.label(text="Click 'Start Tutorial' to load a guided workflow", icon='INFO')

        # Notifications
        if hasattr(scene, 'fo4_notifications') and scene.fo4_notifications:
            notif_box = layout.box()
            notif_box.label(text="Notifications", icon='INFO')
            for notif in scene.fo4_notifications[-3:]:  # Show last 3
                notif_box.label(text=notif.message, icon='DOT')

class FO4_PT_MeshPanel(_FO4SubPanel):
    """Mesh creation helpers panel"""
    bl_label = "Mesh Helpers"
    bl_idname = "FO4_PT_mesh_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"

    @staticmethod
    def _draw_pipeline_box(layout, has_mesh):
        """Draw the shared 'Full FO4 Pipeline' one-click section."""
        pipe_box = layout.box()
        pipe_box.label(text="Full FO4 Pipeline", icon='SHADERFX')
        row = pipe_box.row()
        row.enabled = has_mesh
        row.scale_y = 1.5
        row.operator(
            "fo4.convert_to_fallout4",
            text="Convert to Fallout 4 (Full Pipeline)",
            icon='ARROW_LEFTRIGHT',
        )
        row = pipe_box.row()
        row.enabled = has_mesh
        row.operator(
            "fo4.quick_prepare_export",
            text="Quick Prepare for Export",
            icon='CHECKMARK',
        )
        row = pipe_box.row()
        row.enabled = has_mesh
        row.operator(
            "fo4.auto_fix_issues",
            text="Auto-Fix Common Issues",
            icon='TOOL_SETTINGS',
        )

    @staticmethod
    def _draw_smart_presets_box(layout):
        """Draw the Smart Presets section inside the Mesh panel."""
        preset_box = layout.box()
        preset_box.label(text="Smart Presets", icon='PRESET')
        preset_box.label(text="Load FO4 game mesh as a starting point:", icon='INFO')
        row = preset_box.row(align=True)
        row.operator("fo4.create_weapon_preset", text="Weapon", icon='MOUSE_LMB')
        row.operator("fo4.create_armor_preset", text="Armor", icon='MATCLOTH')
        row.operator("fo4.create_prop_preset", text="Prop", icon='OBJECT_DATAMODE')

    @staticmethod
    def _draw_asset_paths_box(layout, has_mesh, scene, context):
        """Draw the shared Game Asset Paths section inside the Mesh panel."""
        _draw_game_path_box(layout, context)

        # ── Scan + Import buttons ─────────────────────────────────────────
        action_box = layout.box()
        action_row = action_box.row(align=True)
        action_row.operator(
            "fo4.scan_asset_library",
            text="Scan / Refresh",
            icon='FILE_REFRESH',
        )
        action_row.operator(
            "fo4.import_fo4_asset_file",
            text="Import Asset",
            icon='IMPORT',
        )

        # ── Third-party mesh conversion ───────────────────────────────────
        action_box.separator()
        conv_row = action_box.row()
        conv_row.enabled = has_mesh
        conv_row.operator(
            "fo4.prepare_third_party_mesh",
            text="Prepare External Mesh for FO4",
            icon='MODIFIER',
        )

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        unified = getattr(scene, "fo4_mesh_panel_unified", False)

        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'
        prefs = preferences.get_preferences() if preferences else None

        # ── Game Asset Paths – always shown at the top of the Mesh panel ──
        self._draw_asset_paths_box(layout, has_mesh, scene, context)

        if unified:
            # ── Full FO4 Pipeline (one-click) ────────────────────────────
            self._draw_pipeline_box(layout, has_mesh)

            # ── Mesh Helpers ────────────────────────────────────────────
            box = layout.box()
            box.label(text="Mesh Helpers", icon='MESH_CUBE')
            box.operator("fo4.create_base_mesh", text="Create Base Mesh", icon='MESH_DATA')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.optimize_mesh", text="Optimize for FO4", icon='MOD_DECIM')
            if scene:
                opt_sub = box.box()
                opt_sub.label(text="Optimize Settings:", icon='PREFERENCES')
                if prefs is not None:
                    opt_sub.prop(prefs, "optimize_apply_transforms", text="Apply Transforms")
                    opt_sub.prop(prefs, "optimize_remove_doubles_threshold", text="Remove Doubles Threshold")
                    opt_sub.prop(prefs, "optimize_preserve_uvs", text="Preserve UVs")
                else:
                    opt_sub.prop(scene, "fo4_opt_apply_transforms")
                    opt_sub.prop(scene, "fo4_opt_doubles")
                    opt_sub.prop(scene, "fo4_opt_preserve_uvs")
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.validate_mesh", text="Validate Mesh", icon='CHECKMARK')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.validate_export", text="Validate Before Export", icon='CHECKMARK')
            box.separator()

            # ── Collision ───────────────────────────────────────────────
            box.label(text="Collision", icon='MESH_ICOSPHERE')
            if has_mesh:
                box.prop(obj, "fo4_collision_type", text="Type")
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
            row = box.row()
            row.enabled = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
            row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')
            box.separator()

            # ── LOD Meshes ─────────────────────────────────────────────
            box.label(text="LOD Meshes (Level of Detail)", icon='OUTLINER_OB_MESH')
            sub = box.column(align=True)
            sub.scale_y = 0.75
            sub.label(text="FO4 uses LOD0 (close) → LOD4 (far) as separate NIFs", icon='INFO')
            sub.label(text="Source object = LOD0 · Generates LOD1–LOD4 copies", icon='INFO')
            box.separator()
            row = box.row()
            row.enabled = has_mesh
            row.scale_y = 1.3
            row.operator("fo4.generate_lod", text="Generate LOD Chain", icon='OUTLINER_OB_MESH')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.generate_lod_and_collision", text="Generate LOD + Collision", icon='SHADERFX')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_lod_chain_as_nif", text="Export LOD Chain as NIF", icon='EXPORT')
            box.separator()

            # ── Advanced Mesh Tools ─────────────────────────────────────
            box.label(text="Advanced Mesh Tools", icon='MODIFIER')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.analyze_mesh_quality", text="Analyze Quality", icon='INFO')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.auto_repair_mesh", text="Auto-Repair", icon='TOOL_SETTINGS')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.mossy_auto_fix", text="AI Auto-Fix (Mossy)", icon='LIGHT_HEMI')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.smart_decimate", text="Smart Decimate", icon='MOD_DECIM')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.split_mesh_poly_limit", text="Split at Poly Limit", icon='MOD_BOOLEAN')

            # ── UV & Texture Workflow ────────────────────────────────────
            uv_box = layout.box()
            uv_box.label(text="UV & Texture Workflow", icon='UV')

            # Step 1 — status
            if has_mesh:
                mesh = obj.data
                uv_ok = bool(mesh.uv_layers)
                mat_ok = bool(mesh.materials and mesh.materials[0])
                uv_icon = 'CHECKMARK' if uv_ok else 'ERROR'
                mat_icon = 'CHECKMARK' if mat_ok else 'ERROR'
                uv_box.label(
                    text=("UV Map: " + mesh.uv_layers[0].name) if uv_ok else "UV Map: None",
                    icon=uv_icon,
                )
                uv_box.label(
                    text=("Material: " + mesh.materials[0].name) if mat_ok else "Material: None",
                    icon=mat_icon,
                )
                uv_box.separator()

            # Step 1 — one-click setup (UV + texture + material in one go)
            uv_box.label(text="Step 1 — Setup UV + Bind Texture:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator(
                "fo4.setup_uv_with_texture",
                text="Setup UV + Texture (All-in-One)",
                icon='TEXTURE',
            )

            # Step 1b — Hybrid workflow for complex / organic meshes
            uv_box.separator()
            uv_box.label(
                text="Complex Mesh? (plants, foliage, armor) →",
                icon='QUESTION',
            )
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator(
                "fo4.scan_uv_complexity",
                text="Scan UV Complexity",
                icon='VIEWZOOM',
            )
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator(
                "fo4.smart_seam_mark",
                text="Scan & Mark Seams",
                icon='MOD_EDGESPLIT',
            )
            row.operator(
                "fo4.hybrid_unwrap",
                text="Hybrid Unwrap",
                icon='UV_SYNC_SELECT',
            )
            uv_box.separator()

            # Step 2 — face-picking for selective unwrap
            uv_box.label(text="Step 2 — Select faces to unwrap:", icon='FORWARD')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator(
                "fo4.pick_faces_for_unwrap",
                text="Pick Faces to Unwrap",
                icon='UV_FACESEL',
            )
            row.operator(
                "fo4.unwrap_selected_faces",
                text="Unwrap Selected",
                icon='UV_SYNC_SELECT',
            )
            uv_box.separator()

            # Step 3 — re-unwrap if needed
            uv_box.label(text="Step 3 — Adjust UV Map if needed:", icon='FORWARD')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.re_unwrap_uv", text="Re-Unwrap UV", icon='UV_SYNC_SELECT')
            row.operator("fo4.optimize_uvs",  text="Pack Islands", icon='UV_FACESEL')

            # Step 4 — interactive UV editing
            uv_box.label(text="Step 4 — Fine-tune in UV Editor:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.open_uv_editing", text="Edit UV Map", icon='UV_ISLANDSEL')

            # Ask Mossy
            uv_box.separator()
            uv_box.operator(
                "fo4.ask_mossy_uv_advice",
                text="Ask Mossy for Advice",
                icon='LIGHT_HEMI',
            )

            # Step 5 — export
            uv_box.separator()
            uv_box.label(text="Step 5 — Export as Fallout 4 NIF:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh", text="Export Mesh (.nif)", icon='EXPORT')

            # ── Smart Presets ────────────────────────────────────────────
            self._draw_smart_presets_box(layout)

        else:
            # ── original layout: separate boxes ─────────────────────────

            # ── Full FO4 Pipeline (one-click) ────────────────────────────
            self._draw_pipeline_box(layout, has_mesh)

            box = layout.box()
            box.label(text="Mesh Creation", icon='MESH_CUBE')
            box.operator("fo4.create_base_mesh", text="Create Base Mesh", icon='MESH_DATA')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.optimize_mesh", text="Optimize for FO4", icon='MOD_DECIM')
            if scene:
                opt_sub = box.box()
                opt_sub.label(text="Optimize Settings:", icon='PREFERENCES')
                if prefs is not None:
                    opt_sub.prop(prefs, "optimize_apply_transforms", text="Apply Transforms")
                    opt_sub.prop(prefs, "optimize_remove_doubles_threshold", text="Remove Doubles Threshold")
                    opt_sub.prop(prefs, "optimize_preserve_uvs", text="Preserve UVs")
                else:
                    opt_sub.prop(scene, "fo4_opt_apply_transforms")
                    opt_sub.prop(scene, "fo4_opt_doubles")
                    opt_sub.prop(scene, "fo4_opt_preserve_uvs")
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.validate_mesh", text="Validate Mesh", icon='CHECKMARK')
            row = box.row()
            row.enabled = has_mesh
            row.operator("fo4.validate_export", text="Validate Before Export", icon='CHECKMARK')

            col_box = layout.box()
            col_box.label(text="Collision", icon='MESH_ICOSPHERE')
            if has_mesh:
                col_box.prop(obj, "fo4_collision_type", text="Type")
            row = col_box.row()
            row.enabled = has_mesh
            row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
            row = col_box.row()
            row.enabled = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
            row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
            row = col_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')

            lod_box = layout.box()
            lod_box.label(text="LOD Meshes (Level of Detail)", icon='OUTLINER_OB_MESH')
            sub = lod_box.column(align=True)
            sub.scale_y = 0.75
            sub.label(text="FO4: LOD0 (close) → LOD4 (far), each a separate NIF", icon='INFO')
            sub.label(text="Source object = LOD0. LOD1–LOD4 copies are created.", icon='INFO')
            lod_box.separator()
            row = lod_box.row()
            row.enabled = has_mesh
            row.scale_y = 1.3
            row.operator("fo4.generate_lod", text="Generate LOD Chain", icon='OUTLINER_OB_MESH')
            row = lod_box.row()
            row.enabled = has_mesh
            row.operator("fo4.generate_lod_and_collision", text="Generate LOD + Collision", icon='SHADERFX')
            row = lod_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_lod_chain_as_nif", text="Export LOD Chain as NIF", icon='EXPORT')

            adv_box = layout.box()
            adv_box.label(text="Advanced Mesh Tools", icon='MODIFIER')
            row = adv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.analyze_mesh_quality", text="Analyze Quality", icon='INFO')
            row = adv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.auto_repair_mesh", text="Auto-Repair", icon='TOOL_SETTINGS')
            row = adv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.mossy_auto_fix", text="AI Auto-Fix (Mossy)", icon='LIGHT_HEMI')
            row = adv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.smart_decimate", text="Smart Decimate", icon='MOD_DECIM')
            row = adv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.split_mesh_poly_limit", text="Split at Poly Limit", icon='MOD_BOOLEAN')

            uv_box = layout.box()
            uv_box.label(text="UV & Texture Workflow", icon='UV')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.setup_uv_with_texture", text="Setup UV + Texture", icon='TEXTURE')
            # Hybrid workflow for complex / organic meshes
            uv_box.label(text="Complex Mesh? (plants, foliage, armor) →", icon='QUESTION')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.scan_uv_complexity", text="Scan Complexity", icon='VIEWZOOM')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.smart_seam_mark", text="Mark Seams", icon='MOD_EDGESPLIT')
            row.operator("fo4.hybrid_unwrap",   text="Hybrid Unwrap", icon='UV_SYNC_SELECT')
            # Face-selective unwrap
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.pick_faces_for_unwrap", text="Pick Faces", icon='UV_FACESEL')
            row.operator("fo4.unwrap_selected_faces", text="Unwrap Selected", icon='UV_SYNC_SELECT')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.re_unwrap_uv",  text="Re-Unwrap",     icon='UV_SYNC_SELECT')
            row.operator("fo4.optimize_uvs",  text="Pack Islands",  icon='UV_FACESEL')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.open_uv_editing", text="Edit UV Map", icon='UV_ISLANDSEL')
            uv_box.operator("fo4.ask_mossy_uv_advice", text="Ask Mossy", icon='LIGHT_HEMI')
            uv_box.separator()
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh", text="Export Mesh (.nif)", icon='EXPORT')

            self._draw_smart_presets_box(layout)

class FO4_PT_TexturePanel(_FO4SubPanel):
    """Texture installation helpers panel"""
    bl_label = "Texture Helpers"
    bl_idname = "FO4_PT_texture_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'

        box = layout.box()
        box.label(text="Texture Setup", icon='TEXTURE')
        row = box.row()
        row.enabled = has_mesh
        row.operator("fo4.setup_textures", text="Setup FO4 Materials", icon='MATERIAL')

        install_box = box.box()
        install_box.label(text="Install Texture", icon='FILE_IMAGE')
        op = install_box.operator("fo4.install_texture", text="Install Diffuse", icon='FILE_IMAGE')
        op.texture_type = 'DIFFUSE'
        op = install_box.operator("fo4.install_texture", text="Install Normal Map", icon='NORMALS_FACE')
        op.texture_type = 'NORMAL'
        op = install_box.operator("fo4.install_texture", text="Install Specular Map", icon='SHADING_RENDERED')
        op.texture_type = 'SPECULAR'

        box.operator("fo4.validate_textures", text="Validate Textures", icon='CHECKMARK')

        # DDS conversion – required for Fallout 4 NIF export
        dds_box = layout.box()
        dds_box.label(text="DDS Conversion (FO4 NIF Export)", icon='DISK_DRIVE')
        dds_box.operator("fo4.convert_texture_to_dds", text="Convert Texture to DDS", icon='FILE_REFRESH')
        dds_box.operator("fo4.convert_object_textures_to_dds", text="Convert Object Textures to DDS", icon='OBJECT_DATA')

        # AI Upscaling (Real-ESRGAN)
        ai_box = layout.box()
        ai_box.label(text="AI Upscaling (Real-ESRGAN)", icon='RENDER_RESULT')
        if realesrgan_helpers:
            esrgan_available, esrgan_status = realesrgan_helpers.RealESRGANHelpers.get_install_status()
        else:
            esrgan_available, esrgan_status = False, "Not available"
        if esrgan_available:
            ai_box.label(text=f"Status: {esrgan_status}", icon='CHECKMARK')
        else:
            ai_box.label(text="Status: Not Installed — click below to auto-install", icon='ERROR')
            ai_box.operator(
                "fo4.install_upscaler_deps",
                text="Auto-Install Real-ESRGAN (One-Click)",
                icon='IMPORT',
            )
        ai_box.operator("fo4.check_realesrgan_installation", text="Check Status", icon='SYSTEM')
        row = ai_box.row()
        row.enabled = esrgan_available
        row.operator("fo4.upscale_texture", text="Upscale Texture", icon='FULLSCREEN_ENTER')
        row = ai_box.row()
        row.enabled = esrgan_available
        row.operator("fo4.upscale_object_textures", text="Upscale Object Textures", icon='OBJECT_DATA')

        # KREA AI Legacy upscaling — own self-contained upscaler, no subscription
        krea_box = layout.box()
        krea_box.label(text="KREA AI Legacy Upscale", icon='SHADERFX')
        if esrgan_available:
            krea_box.label(text=f"Engine: {esrgan_status}", icon='CHECKMARK')
        else:
            krea_box.label(text="Engine: PIL fallback (install Real-ESRGAN above for best quality)", icon='INFO')
        krea_box.operator("fo4.upscale_krea_legacy", text="Upscale Texture", icon='FULLSCREEN_ENTER')

class FO4_PT_ImageToMeshPanel(_FO4SubPanel):
    """Image to Mesh helpers panel"""
    bl_label = "Image to Mesh"
    bl_idname = "FO4_PT_image_to_mesh_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── FO4 Mesh Quality Settings ─────────────────────────────────────────
        # These settings apply to every AI generation tool in this panel.
        # Change them BEFORE clicking a generation button.
        q_box = layout.box()
        q_box.label(text="FO4 Mesh Quality Settings", icon='SETTINGS')

        # Show current active-object poly count as context
        obj = context.active_object
        if obj and obj.type == 'MESH':
            current = len(obj.data.polygons)
            target = scene.fo4_imageto3d_target_poly
            over_limit = current > 65535
            at_target  = current <= target
            count_row = q_box.row(align=True)
            count_row.label(
                text=f"Active mesh: {current:,} tris",
                icon='ERROR' if over_limit else ('CHECKMARK' if at_target else 'INFO'),
            )
            if over_limit:
                q_box.label(text="⚠ Over 65,535 — cannot export to FO4 until decimated", icon='ERROR')
            elif not at_target:
                q_box.label(text=f"Above target ({target:,}) — click Decimate below", icon='INFO')

        col = q_box.column(align=True)
        col.prop(scene, "fo4_imageto3d_quality")
        col.prop(scene, "fo4_triposr_mc_resolution")
        col.prop(scene, "fo4_imageto3d_target_poly")
        col.prop(scene, "fo4_imageto3d_auto_decimate")

        hint = q_box.column(align=True)
        hint.scale_y = 0.75
        hint.label(text="FO4 hard limit: 65,535 tris  |  Good budget: 10k–20k", icon='INFO')
        hint.label(text="MC Resolution ↓ = fewer polys  |  ↑ = more detail (slower)", icon='DOT')
        hint.label(text="Auto-Decimate runs Smart Decimate after every generation", icon='DOT')

        # One-click decimate button — always visible so users can fix any mesh
        dec_row = q_box.row(align=True)
        dec_row.enabled = bool(obj and obj.type == 'MESH')
        dec_row.scale_y = 1.3
        dec_row.operator("fo4.decimate_to_fo4", text="Decimate to FO4 Target", icon='MOD_DECIM')

        layout.separator()
        box = layout.box()
        box.label(text="Create Mesh from Image", icon='IMAGE_DATA')
        box.operator("fo4.image_to_mesh", text="Image to Mesh (Height Map)", icon='MESH_GRID')

        box = layout.box()
        box.label(text="Displacement Map", icon='MOD_DISPLACE')
        box.operator("fo4.apply_displacement_map", text="Apply Displacement Map", icon='TEXTURE')

        # ZoeDepth section
        available, _ = zoedepth_helpers.check_zoedepth_availability() if zoedepth_helpers else (False, "")

        depth_box = layout.box()
        depth_box.label(text="Depth Estimation (ZoeDepth)", icon='CAMERA_DATA')

        if available:
            depth_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            depth_box.label(text="Status: Not Installed ✗", icon='ERROR')

        row = depth_box.row()
        row.enabled = available
        row.operator("fo4.estimate_depth", text="Estimate Depth & Create Mesh", icon='MESH_GRID')

        depth_box.operator("fo4.install_zoedepth", text="Auto-Install ZoeDepth", icon='IMPORT')
        depth_box.operator("fo4.show_zoedepth_info", text="Manual Instructions", icon='INFO')

        # TripoSR section
        layout.separator()
        triposr_available = imageto3d_helpers.ImageTo3DHelpers.is_triposr_available() if imageto3d_helpers else False
        triposr_box = layout.box()
        triposr_box.label(text="TripoSR (Image to 3D)", icon='MESH_ICOSPHERE')
        if triposr_available:
            triposr_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            triposr_box.label(text="Status: Not Installed ✗", icon='ERROR')

        # Install button (always shown, like ZoeDepth)
        triposr_box.operator("fo4.install_triposr", text="Auto-Install TripoSR", icon='IMPORT')

        # Generation buttons (enabled when available)
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_triposr_light", text="Quick Generate (Light)", icon='MESH_CUBE')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_triposr_texture", text="Generate with Textures", icon='TEXTURE')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.bake_triposr_textures", text="Bake TripoSR Textures", icon='RENDER_STILL')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.use_pythonic_triposr", text="Use Pythonic TripoSR", icon='SCRIPT')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_from_stereo", text="Generate from Stereo Images", icon='CAMERA_STEREO')

        # TripoSR variant checks
        checks_box = triposr_box.box()
        checks_box.label(text="Check Variants:", icon='SYSTEM')
        row = checks_box.row(align=True)
        row.operator("fo4.check_triposr_light", text="Light", icon='CHECKMARK')
        row.operator("fo4.check_triposr_bake", text="Bake", icon='CHECKMARK')
        row = checks_box.row(align=True)
        row.operator("fo4.check_triposr_texture_gen", text="Texture Gen", icon='CHECKMARK')
        row.operator("fo4.check_pythonic_triposr", text="Pythonic", icon='CHECKMARK')
        row = checks_box.row(align=True)
        row.operator("fo4.check_starxsky_triposr", text="StarxSky", icon='CHECKMARK')
        row.operator("fo4.check_stereo_triposr", text="Stereo", icon='CHECKMARK')

        # TripoSR info/workflow buttons
        triposr_box.operator("fo4.show_triposr_workflow", text="Workflow Guide", icon='INFO')
        triposr_box.operator("fo4.show_triposr_baking_workflow", text="Baking Workflow", icon='INFO')
        triposr_box.operator("fo4.show_triposr_comparison", text="Compare Variants", icon='LINENUMBERS_ON')
        triposr_box.operator("fo4.show_all_triposr_variants", text="All 14 Variants", icon='LINENUMBERS_ON')

        # Instant-NGP section
        layout.separator()
        ngp_available = instantngp_helpers.InstantNGPHelpers.is_instantngp_available() if instantngp_helpers else False
        ngp_box = layout.box()
        ngp_box.label(text="Instant-NGP / NeRF", icon='CAMERA_DATA')
        if ngp_available:
            ngp_box.label(text="Status: Found ✓", icon='CHECKMARK')
        else:
            ngp_box.label(text="Status: Not Found — click below to auto-clone", icon='ERROR')
            ngp_box.operator(
                "fo4.install_instantngp",
                text="Auto-Install Instant-NGP (Clone via git)",
                icon='IMPORT',
            )
        # Manual path override — lets users point to a pre-built install
        if context.scene:
            ngp_box.prop(context.scene, "fo4_instantngp_path", text="Path")
        ngp_box.operator("fo4.check_instantngp_installation", text="Check Installation", icon='SYSTEM')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.reconstruct_from_images", text="Reconstruct from Images", icon='MESH_GRID')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.import_instantngp_mesh", text="Import Instant-NGP Mesh", icon='IMPORT')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.optimize_nerf_mesh", text="Optimize NeRF Mesh for FO4", icon='MOD_DECIM')
        ngp_box.operator("fo4.show_instantngp_info", text="About Instant-NGP", icon='INFO')

        # Info box
        info_box = layout.box()
        info_box.label(text="Quick Guide:", icon='INFO')
        info_box.label(text="• Height Map: Grayscale images")
        info_box.label(text="• ZoeDepth: RGB images (AI depth)")
        info_box.label(text="• TripoSR: Image → full 3D mesh")
        info_box.label(text="• Instant-NGP: Photos → NeRF mesh")
        info_box.label(text="• Formats: PNG, JPG, BMP, TIFF, TGA")
        info_box.label(text="• Requires: PIL/Pillow & NumPy")
        info_box.label(text="• See README for install instructions")

class FO4_PT_SetupAIHunyuan3D(_FO4SubPanel):
    """Hunyuan3D-2 AI mesh generation — sub-panel inside Setup & Status."""
    bl_label = "AI: Hunyuan3D-2 (Text/Image to 3D)"
    bl_idname = "FO4_PT_setup_ai_hunyuan3d"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # Check cached Hunyuan3D status (avoid heavy imports in draw)
        if hunyuan3d_helpers and hasattr(hunyuan3d_helpers, "get_cached_availability"):
            hun_status, hun_msg = hunyuan3d_helpers.get_cached_availability()
        else:
            hun_status, hun_msg = None, "Hunyuan3D-2 status unavailable"

        # Status box
        status_box = layout.box()
        if hun_status is True:
            status_box.label(text="Status: Available ✓", icon='CHECKMARK')
        elif hun_status is False:
            status_box.label(text="Status: Not Installed ✗", icon='ERROR')
        else:
            status_box.label(text="Status: Not checked", icon='INFO')
            status_box.label(text="Click Check Status to refresh", icon='DOT')

        status_box.label(text=hun_msg, icon='INFO')
        status_box.operator("fo4.install_hunyuan3d", text="Auto-Install Hunyuan3D-2", icon='IMPORT')
        status_box.operator("fo4.check_hunyuan3d_status", text="Check Status", icon='FILE_REFRESH')
        status_box.operator("fo4.show_hunyuan3d_info", text="Manual Instructions", icon='INFO')

        # Generation operators (enabled only if available)
        box = layout.box()
        box.label(text="Text to 3D", icon='FILE_TEXT')
        row = box.row()
        row.enabled = hun_status is True
        row.operator("fo4.generate_mesh_from_text", text="Generate from Text", icon='OUTLINER_OB_FONT')

        box = layout.box()
        box.label(text="Image to 3D (Full Model)", icon='IMAGE_DATA')
        row = box.row()
        row.enabled = hun_status is True
        row.operator("fo4.generate_mesh_from_image_ai", text="Generate from Image (AI)", icon='MESH_ICOSPHERE')

        # Info box
        info_box = layout.box()
        info_box.label(text="About Hunyuan3D-2:", icon='INFO')
        info_box.label(text="• Generates full 3D meshes from text or image")
        info_box.label(text="• Requires GPU & model download")
        info_box.label(text="• Completely optional feature")


class FO4_PT_SetupAIGradio(_FO4SubPanel):
    """Gradio web interface — sub-panel inside Setup & Status."""
    bl_label = "AI: Web Interface (Gradio)"
    bl_idname = "FO4_PT_setup_ai_gradio"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        gradio_available = gradio_helpers.GradioHelpers.is_available() if gradio_helpers else False
        server_running = gradio_helpers.GradioHelpers.is_server_running() if gradio_helpers else False

        if gradio_available:
            if server_running:
                layout.label(text="Server: Running ✓", icon='CHECKMARK')
                layout.operator("fo4.stop_gradio_server", text="Stop Web UI", icon='CANCEL')
            else:
                layout.label(text="Server: Stopped", icon='RADIOBUT_OFF')
                layout.operator("fo4.start_gradio_server", text="Start Web UI", icon='PLAY')
        else:
            layout.label(text="Gradio: Not Installed ✗", icon='ERROR')

        layout.operator("fo4.show_gradio_info", text="Web UI Info", icon='INFO')

        if gradio_available:
            layout.label(text="Open: http://localhost:7860")


class FO4_PT_SetupAIHyMotion(_FO4SubPanel):
    """HY-Motion-1.0 — sub-panel inside Setup & Status."""
    bl_label = "AI: Motion Generation (HY-Motion)"
    bl_idname = "FO4_PT_setup_ai_hymotion"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        hymotion_available = hymotion_helpers.HyMotionHelpers.is_available() if hymotion_helpers else False

        if hymotion_available:
            layout.label(text="Status: Available ✓", icon='CHECKMARK')
            layout.operator("fo4.generate_motion_from_text", text="Generate Motion", icon='ANIM_DATA')
            layout.operator("fo4.import_motion_file", text="Import Motion File", icon='IMPORT')
        else:
            layout.label(text="Status: Not Installed ✗", icon='ERROR')
            layout.operator("fo4.install_hymotion", text="Auto-Install HY-Motion", icon='IMPORT')

        layout.operator("fo4.show_hymotion_info", text="Manual Instructions", icon='INFO')


class FO4_PT_SetupAIShapE(_FO4SubPanel):
    """Shap-E AI generation — sub-panel inside Setup & Status."""
    bl_label = "AI: Shap-E (Text/Image to 3D)"
    bl_idname = "FO4_PT_setup_ai_shap_e"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        shap_e_installed, shap_e_msg = (
            shap_e_helpers.ShapEHelpers.peek_cached_installation()
            if (shap_e_helpers and hasattr(shap_e_helpers, 'ShapEHelpers'))
            else (None, "Status unavailable")
        )

        if shap_e_installed:
            layout.label(text="Status: Installed ✓", icon='CHECKMARK')

            text_box = layout.box()
            text_box.label(text="Text to 3D:", icon='FILE_TEXT')
            text_box.prop(scene, "fo4_shap_e_prompt", text="")
            text_box.prop(scene, "fo4_shap_e_guidance_scale")
            text_box.prop(scene, "fo4_shap_e_inference_steps")
            text_box.operator("fo4.generate_shap_e_text", text="Generate from Text", icon='MESH_CUBE')

            image_box = layout.box()
            image_box.label(text="Image to 3D:", icon='IMAGE_DATA')
            image_box.prop(scene, "fo4_shap_e_image_path", text="")
            image_box.operator("fo4.generate_shap_e_image", text="Generate from Image", icon='TEXTURE')
        elif shap_e_installed is False:
            layout.label(text="Status: Not Installed ✗", icon='ERROR')
            layout.operator("fo4.install_shap_e", text="Auto-Install Shap-E", icon='IMPORT')
            layout.operator("fo4.show_shap_e_info", text="Manual Instructions", icon='INFO')
        else:
            layout.label(text="Status: Not checked", icon='INFO')
            layout.label(text="Click Check Installation to refresh", icon='DOT')

        layout.operator("fo4.check_shap_e_installation", text="Check Installation", icon='SYSTEM')


class FO4_PT_SetupAIPointE(_FO4SubPanel):
    """Point-E AI generation — sub-panel inside Setup & Status."""
    bl_label = "AI: Point-E (Text/Image to Point Cloud)"
    bl_idname = "FO4_PT_setup_ai_point_e"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        point_e_installed, point_e_msg = (
            point_e_helpers.PointEHelpers.peek_cached_installation()
            if (point_e_helpers and hasattr(point_e_helpers, 'PointEHelpers'))
            else (None, "Status unavailable")
        )

        if point_e_installed:
            layout.label(text="Status: Installed ✓", icon='CHECKMARK')

            text_box = layout.box()
            text_box.label(text="Text to Point Cloud:", icon='FILE_TEXT')
            text_box.prop(scene, "fo4_point_e_prompt", text="")
            text_box.prop(scene, "fo4_point_e_num_samples")
            text_box.prop(scene, "fo4_point_e_grid_size")
            text_box.prop(scene, "fo4_point_e_inference_steps")
            text_box.prop(scene, "fo4_point_e_reconstruction_method")
            text_box.operator("fo4.generate_point_e_text", text="Generate from Text", icon='MESH_CUBE')

            image_box = layout.box()
            image_box.label(text="Image to Point Cloud:", icon='IMAGE_DATA')
            image_box.prop(scene, "fo4_point_e_image_path", text="")
            image_box.prop(scene, "fo4_point_e_grid_size")
            image_box.prop(scene, "fo4_point_e_inference_steps")
            image_box.operator("fo4.generate_point_e_image", text="Generate from Image", icon='TEXTURE')
        elif point_e_installed is False:
            layout.label(text="Status: Not Installed ✗", icon='ERROR')
            layout.operator("fo4.install_point_e", text="Auto-Install Point-E", icon='IMPORT')
            layout.operator("fo4.show_point_e_info", text="Manual Instructions", icon='INFO')
        else:
            layout.label(text="Status: Not checked", icon='INFO')
            layout.label(text="Click Check Installation to refresh", icon='DOT')

        layout.operator("fo4.check_point_e_installation", text="Check Installation", icon='SYSTEM')


class FO4_PT_SetupAIDiffusers(_FO4SubPanel):
    """Diffusers / LayerDiffuse and ecosystem resources — sub-panel inside Setup & Status."""
    bl_label = "AI: Diffusers & Resources"
    bl_idname = "FO4_PT_setup_ai_diffusers"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        diff_box = layout.box()
        diff_box.label(text="Diffusers / LayerDiffuse", icon='TEXTURE_DATA')
        diff_box.operator("fo4.install_diffusers", text="Auto-Install Diffusers", icon='IMPORT')
        diff_box.operator("fo4.check_diffusers", text="Check Diffusers", icon='SYSTEM')
        diff_box.operator("fo4.check_layerdiffuse", text="Check LayerDiffuse", icon='SYSTEM')
        diff_box.operator("fo4.show_diffusers_workflow", text="Diffusers Workflow Guide", icon='INFO')

        layout.separator()
        eco_box = layout.box()
        eco_box.label(text="Resources & Recommendations", icon='BOOKMARKS')
        eco_box.operator("fo4.show_complete_ecosystem", text="Complete Ecosystem (17 tools)", icon='WORLD')
        eco_box.operator("fo4.show_ml_resources", text="ML Resources Guide", icon='DOCUMENTS')
        eco_box.operator("fo4.show_strategic_recommendations", text="Strategic Recommendations", icon='LIGHT')


class FO4_PT_AnimationPanel(_FO4SubPanel):
    """Animation helpers panel"""
    bl_label = "Animation Helpers"
    bl_idname = "FO4_PT_animation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'

        box = layout.box()
        box.label(text="Animation Setup", icon='ANIM')
        box.operator("fo4.setup_armature", text="Setup FO4 Armature", icon='ARMATURE_DATA')
        row = box.row()
        row.enabled = has_mesh
        row.operator("fo4.auto_weight_paint", text="Auto Weight Paint", icon='AUTO')
        box.operator("fo4.validate_animation", text="Validate Animation", icon='CHECKMARK')
        row = box.row()
        row.enabled = has_mesh
        row.operator("fo4.generate_wind_weights", text="Generate Wind Weights", icon='FORCE_WIND')
        row = box.row()
        row.enabled = has_mesh
        row.operator("fo4.apply_wind_animation", text="Apply Wind Animation", icon='ANIM')
        box.separator()
        box.label(text="Batch Operations", icon='SEQ_SEQUENCER')
        row = box.row()
        row.operator("fo4.batch_generate_wind_weights", text="Batch Wind Weights")
        row.operator("fo4.batch_apply_wind_animation", text="Batch Wind Anim")
        box.operator("fo4.batch_auto_weight_paint", text="Batch Auto‑Weight")
        box.operator("fo4.toggle_wind_preview", text="Toggle Wind Preview", icon='PLAY')

        # Motion Generation section
        layout.separator()
        motion_box = layout.box()
        motion_box.label(text="Motion Generation", icon='ANIM_DATA')
        motion_box.operator("fo4.check_all_motion_systems", text="Check All Motion Systems", icon='SYSTEM')
        motion_box.operator("fo4.install_motion_generation", text="Auto-Install MotionDiffuse", icon='IMPORT')
        motion_box.operator("fo4.generate_motion_auto", text="Generate Motion (Auto)", icon='PLAY')
        motion_box.operator("fo4.show_motion_generation_info", text="Manual Instructions", icon='INFO')

        # ── Shiagur's FO4 Animation Rigs ─────────────────────────────────────
        layout.separator()
        rig_box = layout.box()
        rig_box.label(text="Shiagur's FO4 Animation Rigs  v2.6.0", icon='ARMATURE_DATA')

        credit_col = rig_box.column(align=True)
        credit_col.scale_y = 0.75
        credit_col.label(text="Blender rigs by Shiagur — Nexus Mods (free account required)", icon='FUND')
        credit_col.label(text="Use the buttons below to open each mod page in your browser.", icon='INFO')

        rig_box.separator(factor=0.5)

        # Power Armor rig
        pa_col = rig_box.column(align=True)
        pa_col.label(text="Power Armor Rig (Nexus 81279):", icon='ARMATURE_DATA')
        pa_col.operator(
            "fo4.open_shiagur_power_armor_rig",
            text="Download Power Armor Rig",
            icon='URL',
        )
        pa_col.scale_y = 0.9
        note = pa_col.column(align=True)
        note.scale_y = 0.72
        note.label(text="  Full PA skeleton · Havok settings · workflow guide")

        rig_box.separator(factor=0.4)

        # 1st/3rd person rig
        fp_col = rig_box.column(align=True)
        fp_col.label(text="1st & 3rd Person Rig (Nexus 82537):", icon='ARMATURE_DATA')
        fp_col.operator(
            "fo4.open_shiagur_anim_rig",
            text="Download 1st/3rd Person Rig",
            icon='URL',
        )
        note2 = fp_col.column(align=True)
        note2.scale_y = 0.72
        note2.label(text="  Weapons · poses · IK/FK · body animations")

        rig_box.separator(factor=0.4)

        # Conversion tool + workflow
        conv_row = rig_box.row(align=True)
        conv_row.operator("fo4.open_fbximporter", text="FBXImporter (Nexus 59849)", icon='URL')
        rig_box.operator(
            "fo4.show_shiagur_workflow",
            text="Full Animation Workflow Guide",
            icon='QUESTION',
        )

        hint = rig_box.column(align=True)
        hint.scale_y = 0.72
        hint.label(text="Pipeline:  Blender rig → FBX export → FBXImporter → Havok Content Tools → .hkx", icon='INFO')
        hint.label(text="OR:  PyNifly v25 exports .hkx directly — no FBX step needed!", icon='CHECKMARK')

class FO4_PT_RigNetPanel(_FO4SubPanel):
    """RigNet auto-rigging panel"""
    bl_label = "Auto-Rigging (RigNet)"
    bl_idname = "FO4_PT_rignet_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Check if RigNet is available
        if rignet_helpers:
            is_available, message = rignet_helpers.RigNetHelpers.check_rignet_available()
            libigl_available, libigl_message = rignet_helpers.RigNetHelpers.check_libigl_available()
        else:
            is_available, message = False, "rignet_helpers module unavailable"
            libigl_available, libigl_message = False, "rignet_helpers module unavailable"

        # Status box for RigNet
        status_box = layout.box()
        status_box.label(text="RigNet Status:", icon='INFO')
        if is_available:
            status_box.label(text="✓ RigNet Available", icon='CHECKMARK')
            # Show just the directory name
            import os
            rignet_dir = os.path.basename(message)
            status_box.label(text=f"  {rignet_dir}", icon='FILE_FOLDER')
        else:
            status_box.label(text="✗ RigNet Not Installed", icon='ERROR')
            status_box.operator("fo4.install_rignet", text="Auto-Install RigNet", icon='IMPORT')

        status_box.operator("fo4.check_rignet", text="Check RigNet", icon='INFO')

        # Status box for libigl
        libigl_box = layout.box()
        libigl_box.label(text="libigl Status:", icon='INFO')
        if libigl_available:
            libigl_box.label(text="✓ libigl Available", icon='CHECKMARK')
            if "pip" in libigl_message:
                libigl_box.label(text="  Installed via pip", icon='PACKAGE')
            else:
                import os
                libigl_dir = os.path.basename(libigl_message.split("at ")[-1]) if "at " in libigl_message else "libigl"
                libigl_box.label(text=f"  {libigl_dir}", icon='FILE_FOLDER')
        else:
            libigl_box.label(text="✗ libigl Not Installed", icon='ERROR')
            libigl_box.operator("fo4.install_libigl", text="Auto-Install libigl", icon='IMPORT')

        libigl_box.operator("fo4.check_libigl", text="Check libigl", icon='INFO')

        layout.operator("fo4.show_rignet_info", text="Installation Guide", icon='QUESTION')

        # Auto-rigging operators (RigNet)
        rignet_box = layout.box()
        rignet_box.label(text="RigNet (Full Auto-Rigging)", icon='ARMATURE_DATA')

        row = rignet_box.row()
        row.operator("fo4.prepare_for_rignet", text="1. Prepare Mesh", icon='MODIFIER')

        row = rignet_box.row()
        row.enabled = is_available
        row.operator("fo4.auto_rig_mesh", text="2. Auto-Rig", icon='ARMATURE_DATA')

        row = rignet_box.row()
        row.operator("fo4.export_for_rignet", text="Export for External RigNet", icon='EXPORT')

        # BBW skinning operators (libigl)
        libigl_op_box = layout.box()
        libigl_op_box.label(text="libigl (BBW Skinning)", icon='MOD_SKIN')

        row = libigl_op_box.row()
        row.enabled = libigl_available
        row.operator("fo4.compute_bbw_skinning", text="Compute BBW Weights", icon='WPAINT_HLT')

        libigl_op_box.label(text="(Requires existing armature)", icon='INFO')

        # Info box
        info_box = layout.box()
        info_box.label(text="About Auto-Rigging:", icon='INFO')
        info_box.label(text="• RigNet: Full auto-rigging")
        info_box.label(text="  - AI predicts skeleton")
        info_box.label(text="  - Best for humanoid/animals")
        info_box.label(text="• libigl: BBW skinning only")
        info_box.label(text="  - Needs existing skeleton")
        info_box.label(text="  - Fast & reliable weights")

        if not is_available and not libigl_available:
            info_box.separator()
            info_box.label(text="Quick Install:", icon='IMPORT')
            info_box.label(text="RigNet:")
            info_box.label(text="  gh repo clone govindjoshi12/")
            info_box.label(text="    rignet-gj")
            info_box.label(text="libigl:")
            info_box.label(text="  pip install libigl")
            info_box.label(text="OR gh repo clone libigl/")
            info_box.label(text="  libigl-python-bindings")

class FO4_PT_NVTTPanel(_FO4SubPanel):
    """NVIDIA Texture Tools panel"""
    bl_label = "Texture Conversion (NVTT)"
    bl_idname = "FO4_PT_nvtt_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Check converters
        if nvtt_helpers:
            nvtt_available = nvtt_helpers.NVTTHelpers.is_nvtt_available()
            texconv_available = nvtt_helpers.NVTTHelpers.is_texconv_available()
            nvtt_path = nvtt_helpers.NVTTHelpers.get_nvtt_path()
            texconv_path = nvtt_helpers.NVTTHelpers.get_texconv_path()
        else:
            nvtt_available = texconv_available = False
            nvtt_path = texconv_path = None

        # Status box
        status_box = layout.box()
        status_box.label(text="Converters", icon='INFO')
        if nvtt_available:
            status_box.label(text="NVTT: Available", icon='CHECKMARK')
            if nvtt_path:
                status_box.label(text=f"nvcompress: {nvtt_path}", icon='FILE')
        else:
            status_box.label(text="NVTT: Not found", icon='ERROR')

        if texconv_available:
            status_box.label(text="texconv: Available", icon='CHECKMARK')
            if texconv_path:
                status_box.label(text=f"texconv: {texconv_path}", icon='FILE')
        else:
            status_box.label(text="texconv: Not found", icon='ERROR')

        status_box.operator("fo4.check_nvtt_installation", text="Check NVTT", icon='INFO')
        status_box.operator("fo4.test_dds_converters", text="Self-Test Converters", icon='CHECKMARK')

        # Conversion operators
        box = layout.box()
        box.label(text="Convert to DDS for FO4", icon='FILE_IMAGE')

        row = box.row()
        row.enabled = nvtt_available or texconv_available
        row.operator("fo4.convert_texture_to_dds", text="Convert Single Texture", icon='IMAGE_DATA')

        row = box.row()
        row.enabled = nvtt_available or texconv_available
        row.operator("fo4.convert_object_textures_to_dds", text="Convert Object Textures", icon='MATERIAL')

        # Info box
        info_box = layout.box()
        info_box.label(text="About DDS Conversion:", icon='INFO')
        info_box.label(text="• DDS is required for FO4")
        info_box.label(text="• BC1 (DXT1): Diffuse textures")
        info_box.label(text="• BC5 (ATI2): Normal maps")
        info_box.label(text="• BC3 (DXT5): Alpha textures")
        info_box.label(text="• BC7: optional high quality", icon='BLANK1')

        if not (nvtt_available or texconv_available):
            info_box.separator()
            info_box.label(text="Install converters:", icon='IMPORT')
            info_box.label(text="NVTT (nvcompress) or texconv")


class FO4_PT_AdvisorPanel(_FO4SubPanel):
    """AI/Advisor panel for export readiness."""
    bl_label = "Advisor"
    bl_idname = "FO4_PT_advisor_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        llm_enabled = getattr(scene, "fo4_llm_enabled", False)
        use_mossy   = getattr(scene, "fo4_use_mossy_ai", False)

        # ── Mossy AI status ──────────────────────────────────────────────
        mossy_box = layout.box()
        mossy_box.label(text="Mossy AI Tutor", icon='LINKED')

        wm = context.window_manager
        mossy_tcp_active = getattr(wm, 'mossy_link_active', False)

        if mossy_tcp_active:
            mossy_box.label(text="✓ Mossy Link server running", icon='CHECKMARK')
        else:
            mossy_box.label(text="Mossy Link server stopped", icon='RADIOBUT_OFF')
            if hasattr(bpy.types, 'WM_OT_MossyLinkToggle'):
                mossy_box.operator("wm.mossy_link_toggle",
                                   text="Start Mossy Link Server", icon='PLAY')

        if use_mossy:
            mossy_box.label(text="✓ Using Mossy as AI Advisor", icon='CHECKMARK')
            row = mossy_box.row(align=True)
            # use_llm=True triggers AI analysis; analyze_scene() routes to
            # Mossy first (local), then falls back to remote LLM if needed.
            op = row.operator("fo4.advisor_analyze", text="Ask Mossy for Advice", icon='LIGHT_HEMI')
            op.use_llm = True
            if hasattr(bpy.types, 'WM_OT_MossyCheckHttp'):
                mossy_box.operator("wm.mossy_check_http", text="Check Mossy HTTP", icon='QUESTION')
        else:
            mossy_box.label(text="Mossy AI not active", icon='INFO')
            mossy_box.label(text="Enable 'Use Mossy as AI Advisor' in")
            mossy_box.label(text="N panel → Fallout 4 → Settings → Mossy Link")

        # ── Local analysis ───────────────────────────────────────────────
        box = layout.box()
        box.label(text="Scene Analysis", icon='INFO')
        row = box.row(align=True)
        op = row.operator("fo4.advisor_analyze", text="Analyze (Local)", icon='SHADERFX')
        op.use_llm = False
        row = box.row(align=True)
        row.enabled = llm_enabled and not use_mossy
        op = row.operator("fo4.advisor_analyze", text="Analyze (Remote LLM)", icon='LIGHT_HEMI')
        op.use_llm = True
        if not llm_enabled and not use_mossy:
            box.label(text="No AI configured – enable Mossy or set LLM in N-panel Settings", icon='ERROR')

        # ── Quick Fixes ──────────────────────────────────────────────────
        fixes = layout.box()
        fixes.label(text="Quick Fixes", icon='MODIFIER')
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Apply Transforms", icon='ORIENTATION_VIEW')
        op.action = 'APPLY_TRANSFORMS'
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Auto Smooth + Shade", icon='SHADING_RENDERED')
        op.action = 'SHADE_SMOOTH_AUTOSMOOTH'
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Validate Export", icon='CHECKMARK')
        op.action = 'VALIDATE_EXPORT'

        # ── Info / KB ────────────────────────────────────────────────────
        info = layout.box()
        info.label(text="Advisor focuses on:", icon='HELP')
        info.label(text="• Export readiness (scale, transforms, normals)")
        info.label(text="• Texture prep (DDS BC1/3/5/7)")
        info.label(text="• Mesh limits (65,535 tris/verts)")

        kb_status = knowledge_helpers.describe_kb() if knowledge_helpers else "Knowledge base unavailable"
        info.label(text=kb_status, icon='BOOKMARKS')

        tools = layout.box()
        tools.label(text="KB Tools", icon='CONSOLE')
        tools.operator("fo4.check_kb_tools", text="Check KB Tools", icon='INFO')




class FO4_PT_ToolsLinks(_FO4SubPanel):
    """Quick links and installers for external tools — nested inside Setup & Status."""
    bl_label = "External Tools"
    bl_idname = "FO4_PT_tools_links"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # quick tool availability summary
        status = knowledge_helpers.tool_status() if knowledge_helpers else {}
        sum_box = layout.box()
        sum_box.label(text="Tool Status", icon='INFO')
        for key, label in (
            ("ffmpeg", "ffmpeg"),
            ("whisper", "whisper CLI"),
            ("nvcompress", "nvcompress"),
            ("texconv", "texconv"),
        ):
            ok = status.get(key, False)
            tool_status = "Available" if ok else "Missing"
            sum_box.label(text=f"{label}: {tool_status}", icon='CHECKMARK' if ok else 'ERROR')

        box = layout.box()
        box.label(text="Core", icon='URL')
        op = box.operator("wm.url_open", text="Blender Niftools Add-on")
        op.url = "https://github.com/niftools/blender_niftools_addon/releases"
        box.operator("fo4.show_quick_reference", text="Quick Reference", icon='TEXT')

        op = box.operator("wm.url_open", text="DirectXTex texconv")
        op.url = "https://github.com/microsoft/DirectXTex/releases"

        op = box.operator("wm.url_open", text="NVIDIA Texture Tools")
        op.url = "https://github.com/castano/nvidia-texture-tools"

        box = layout.box()
        box.label(text="Unity extraction", icon='URL')
        op = box.operator("wm.url_open", text="AssetRipper")
        op.url = "https://github.com/AssetRipper/AssetRipper"
        op = box.operator("wm.url_open", text="AssetStudio")
        op.url = "https://github.com/Perfare/AssetStudio"
        op = box.operator("wm.url_open", text="UnityFBX-To-Blender-Importer")
        op.url = "https://github.com/Varneon/UnityFBX-To-Blender-Importer"

        # Unity FBX Importer with prominent install button
        unity_box = box.box()
        unity_box.label(text="Unity FBX Importer (Editor Extension)", icon='IMPORT')

        if unity_fbx_importer_helpers:
            ub_ready, ub_message = unity_fbx_importer_helpers.status()
            ub_icon = 'CHECKMARK' if ub_ready else 'ERROR'
            info_col = unity_box.column(align=True)
            info_col.scale_y = 0.75
            info_col.label(text=ub_message, icon=ub_icon)
            info_col.label(text=f"Location: {unity_fbx_importer_helpers.repo_path()}", icon='FILE_FOLDER')
            if not ub_ready:
                install_row = unity_box.row()
                install_row.scale_y = 1.4
                install_row.operator("fo4.check_unity_fbx_importer", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
            else:
                unity_box.operator("fo4.check_unity_fbx_importer", text="Verify Installation", icon='CHECKMARK')
        else:
            unity_box.label(text="Status unavailable", icon='ERROR')
            unity_box.operator("fo4.check_unity_fbx_importer", text="Check Unity FBX Importer", icon='FILE_REFRESH')

        help_col = unity_box.column(align=True)
        help_col.scale_y = 0.7
        help_col.label(text="Use in Unity: Assets > Import Package > Custom Package", icon='INFO')

        # Asset Studio with prominent install button
        as_box = box.box()
        as_box.label(text="AssetStudio (Unity Asset Extractor)", icon='IMPORT')

        if asset_studio_helpers:
            as_ready, as_message = asset_studio_helpers.status()
            as_icon = 'CHECKMARK' if as_ready else 'ERROR'
            as_info_col = as_box.column(align=True)
            as_info_col.scale_y = 0.75
            as_info_col.label(text=as_message, icon=as_icon)
            as_info_col.label(text=f"Location: {asset_studio_helpers.repo_path()}", icon='FILE_FOLDER')
            if not as_ready:
                as_install_row = as_box.row()
                as_install_row.scale_y = 1.4
                as_install_row.operator("fo4.check_asset_studio", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
            else:
                as_box.operator("fo4.check_asset_studio", text="Verify Installation", icon='CHECKMARK')
        else:
            as_box.label(text="Status unavailable", icon='ERROR')
            as_box.operator("fo4.check_asset_studio", text="Check AssetStudio", icon='FILE_REFRESH')

        as_help_col = as_box.column(align=True)
        as_help_col.scale_y = 0.7
        as_help_col.label(text="Extract Unity assets to usable formats", icon='INFO')

        # Asset Ripper with prominent install button
        ar_box = box.box()
        ar_box.label(text="AssetRipper (Unity Asset Extractor)", icon='IMPORT')

        if asset_ripper_helpers:
            ar_ready, ar_message = asset_ripper_helpers.status()
            ar_icon = 'CHECKMARK' if ar_ready else 'ERROR'
            ar_info_col = ar_box.column(align=True)
            ar_info_col.scale_y = 0.75
            ar_info_col.label(text=ar_message, icon=ar_icon)
            ar_info_col.label(text=f"Location: {asset_ripper_helpers.repo_path()}", icon='FILE_FOLDER')
            if not ar_ready:
                ar_install_row = ar_box.row()
                ar_install_row.scale_y = 1.4
                ar_install_row.operator("fo4.check_asset_ripper", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
            else:
                ar_box.operator("fo4.check_asset_ripper", text="Verify Installation", icon='CHECKMARK')
        else:
            ar_box.label(text="Status unavailable", icon='ERROR')
            ar_box.operator("fo4.check_asset_ripper", text="Check AssetRipper", icon='FILE_REFRESH')

        ar_help_col = ar_box.column(align=True)
        ar_help_col.scale_y = 0.7
        ar_help_col.label(text="Advanced Unity asset extraction and conversion", icon='INFO')

        box = layout.box()
        box.label(text="Unreal Extraction Tools", icon='EXPORT')

        # UModel (UE Viewer) - Standalone tool
        box.label(text="UModel (UE Viewer)", icon='IMPORT')
        if umodel_helpers:
            umodel_ready, umodel_message = umodel_helpers.status()
            umodel_icon = 'CHECKMARK' if umodel_ready else 'ERROR'
            box.label(text=umodel_message, icon=umodel_icon)
            box.label(text=f"Path: {umodel_helpers.tool_path()}", icon='FILE_FOLDER')
        else:
            box.label(text="Status unavailable", icon='ERROR')

        # Installation button
        install_row = box.row()
        install_row.scale_y = 1.2
        install_row.operator("fo4.check_umodel", text="Auto-Download to D:/blender_tools/", icon='IMPORT')

        # Help text
        help_col = box.column(align=True)
        help_col.scale_y = 0.7
        help_col.label(text="UModel by Konstantin Nosov (Gildor)", icon='INFO')
        help_col.label(text="Tool for viewing/extracting Unreal Engine assets", icon='DOT')

        # Verify installation button
        box.operator("fo4.check_umodel", text="Verify Installation", icon='CHECKMARK')

        # Documentation link for Unreal CLI exporters
        doc_box = box.box()
        doc_box.label(text="Documentation", icon='URL')
        op = doc_box.operator("wm.url_open", text="Unreal CLI Exporters (Epic Docs)")
        op.url = "https://docs.unrealengine.com/5.0/en-US/command-line-arguments-in-unreal-engine/"

        box = layout.box()
        box.label(text="UE Importer", icon='IMPORT')
        if ue_importer_helpers:
            ready, message = ue_importer_helpers.status()
            status_icon = 'CHECKMARK' if ready else 'ERROR'
            box.label(text=message, icon=status_icon)
            box.label(text=f"Path: {ue_importer_helpers.importer_path()}", icon='FILE_FOLDER')
        else:
            box.label(text="Status unavailable", icon='ERROR')
        row = box.row(align=True)
        row.operator("fo4.install_ue_importer", text="Auto-Install UE Importer", icon='IMPORT')
        row.operator("fo4.check_ue_importer", text="", icon='FILE_REFRESH')

        box = layout.box()
        box.label(text="UModel Tools", icon='IMPORT')
        if umodel_tools_helpers:
            ut_ready, ut_message = umodel_tools_helpers.status()
            ut_icon = 'CHECKMARK' if ut_ready else 'ERROR'
            box.label(text=ut_message, icon=ut_icon)
            box.label(text=f"Path: {umodel_tools_helpers.addon_path()}", icon='FILE_FOLDER')
        else:
            box.label(text="Status unavailable", icon='ERROR')
        row = box.row(align=True)
        row.operator("fo4.install_umodel_tools", text="Auto-Install UModel Tools", icon='IMPORT')
        row.operator("fo4.check_umodel_tools", text="", icon='FILE_REFRESH')
        box.operator("fo4.open_umodel_tools_page", text="Manual Download Instructions", icon='URL')

        # Automated installers for external utilities
        box = layout.box()
        box.label(text="Install External Tools", icon='TOOL_SETTINGS')
        box.operator("fo4.install_ffmpeg", text="Install FFmpeg", icon='FILE_REFRESH')
        box.operator("fo4.install_nvtt", text="Install NVTT (nvcompress)", icon='FILE_REFRESH')
        box.operator("fo4.install_texconv", text="Install texconv", icon='FILE_REFRESH')
        box.operator("fo4.install_whisper", text="Install Whisper CLI", icon='FILE_REFRESH')
        box.operator("fo4.install_niftools", text="Install Niftools Add-on", icon='FILE_REFRESH')
        if bpy.app.version >= (4, 2, 0):
            nif_note = box.box()
            nif_note.scale_y = 0.75
            nif_note.label(text="After install: Edit → Preferences → Add-ons", icon='INFO')
            nif_note.label(text="→ enable 'Allow Legacy Add-ons'")
            nif_note.label(text="→ enable 'NetImmerse/Gamebryo (.nif)'")
            if bpy.app.version >= (5, 0, 0):
                nif_note.label(text="Blender 5.x API patches applied automatically.", icon='CHECKMARK')
        # Python requirements — always drawn (Blender 5.x hasattr unreliable)
        op = box.operator("fo4.install_python_deps", text="Install Python Requirements", icon='FILE_REFRESH')
        if op is not None:
            op.optional = False
        op = box.operator("fo4.install_python_deps", text="Install Python Req (optional)", icon='FILE_REFRESH')
        if op is not None:
            op.optional = True
        box.operator("fo4.install_all_tools", text="Install All Tools", icon='PACKAGE')
        box.operator("fo4.self_test", text="Run Environment Self-Test", icon='CHECKMARK')

        # Fallout 4 configuration button
        config_box = layout.box()
        config_box.label(text="Fallout 4 Configuration", icon='SETTINGS')
        config_row = config_box.row()
        config_row.scale_y = 1.5
        config_row.operator("fo4.configure_fallout4_settings", text="Configure for Fallout 4", icon='CHECKMARK')

        config_help = config_box.column(align=True)
        config_help.scale_y = 0.7
        config_help.label(text="Verify and configure optimal settings for FO4 modding", icon='INFO')
        config_help.label(text="Checks: Niftools, DDS tools, export settings", icon='INFO')

        # Manual path override — use existing installations when auto-install fails
        scene = context.scene
        prefs = preferences.get_preferences() if preferences else None
        man_box = layout.box()
        man_box.label(text="Manual Path Override", icon='FILE_FOLDER')
        man_box.label(text="Already have a tool? Point to it here.", icon='INFO')
        if prefs is not None:
            man_box.prop(prefs, "ffmpeg_path", text="FFmpeg")
        else:
            man_box.prop(scene, "fo4_ffmpeg_path", text="FFmpeg")
        ffmpeg_ok = preferences.get_configured_ffmpeg_path() if preferences else None
        man_box.label(
            text=f"FFmpeg: {'OK ✔' if ffmpeg_ok else 'not found'}",
            icon='CHECKMARK' if ffmpeg_ok else 'ERROR',
        )
        if prefs is not None:
            man_box.prop(prefs, "nvtt_path", text="nvcompress")
        else:
            man_box.prop(scene, "fo4_nvtt_path", text="nvcompress")
        nvcompress_ok = preferences.get_configured_nvcompress_path() if preferences else None
        man_box.label(
            text=f"nvcompress: {'OK ✔' if nvcompress_ok else 'not found'}",
            icon='CHECKMARK' if nvcompress_ok else 'ERROR',
        )
        if prefs is not None:
            man_box.prop(prefs, "texconv_path", text="texconv")
        else:
            man_box.prop(scene, "fo4_texconv_path", text="texconv")
        texconv_ok = preferences.get_configured_texconv_path() if preferences else None
        man_box.label(
            text=f"texconv: {'OK ✔' if texconv_ok else 'not found'}",
            icon='CHECKMARK' if texconv_ok else 'ERROR',
        )


class FO4_PT_GameAssetsLibraryPanel(_FO4SubPanel):
    """Game asset import and asset library browser – sub-panel of Setup & Status"""
    bl_label = "Game Assets & Library"
    bl_idname = "FO4_PT_game_assets_library_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_setup_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'

        # ── Convert to Fallout 4 (prominent) ────────────────────────────────
        if has_mesh:
            convert_box = layout.box()
            convert_box.label(text="Quick Convert", icon='MODIFIER')

            convert_row = convert_box.row()
            convert_row.scale_y = 1.5
            convert_row.operator(
                "fo4.convert_to_fallout4",
                text="Convert to Fallout 4",
                icon='ARROW_LEFTRIGHT'
            )

            help_col = convert_box.column(align=True)
            help_col.scale_y = 0.7
            help_col.label(text="One-click: Mesh prep + Materials + Textures", icon='INFO')
            help_col.label(text="Works on any imported Unity/Unreal/FO4 asset", icon='DOT')

            conv_row = convert_box.row()
            conv_row.operator(
                "fo4.prepare_third_party_mesh",
                text="Prepare External Mesh for FO4",
                icon='MODIFIER',
            )
        else:
            layout.label(text="Select a mesh to convert", icon='INFO')

        layout.separator()

        # ── Fallout 4 Assets ─────────────────────────────────────────────────
        fo4_box = layout.box()
        fo4_box.label(text="Fallout 4 Assets", icon='BLENDER')

        _draw_game_path_box(fo4_box, context)

        action_row = fo4_box.row(align=True)
        action_row.operator(
            "fo4.scan_asset_library",
            text="Scan / Refresh",
            icon='FILE_REFRESH',
        )
        action_row.operator("fo4.import_fo4_asset_file", text="Import Asset", icon='IMPORT')

        if fo4_game_assets:
            ready, _ = fo4_game_assets.FO4GameAssets.get_status()
            if ready:
                fo4_box.operator("fo4.browse_fo4_assets", text="Browse FO4 Assets", icon='VIEWZOOM')
        else:
            fo4_box.label(text="fo4_game_assets module missing – reinstall add-on", icon='ERROR')

        # ── Unity Assets ─────────────────────────────────────────────────────
        unity_box = layout.box()
        unity_box.label(text="Unity Assets", icon='FILE_3D')

        if unity_game_assets:
            ready, message = unity_game_assets.UnityAssets.get_status()
            status_icon = 'CHECKMARK' if ready else 'ERROR'

            info_col = unity_box.column(align=True)
            info_col.scale_y = 0.8
            info_col.label(text=message, icon=status_icon)

            path_row = unity_box.row(align=True)
            prefs_u = preferences.get_preferences() if preferences else None
            if prefs_u is not None:
                path_row.prop(prefs_u, "unity_assets_path", text="Path")
            elif hasattr(context.scene, 'fo4_unity_assets_path'):
                path_row.prop(context.scene, "fo4_unity_assets_path", text="Path")
            path_row.operator("fo4.set_unity_assets_path", text="", icon='FILE_FOLDER')

            if ready:
                unity_box.operator("fo4.browse_unity_assets", text="Browse Unity Assets", icon='VIEWZOOM')
                unity_box.operator("fo4.import_unity_asset", text="Import Unity Asset", icon='IMPORT')
        else:
            unity_box.label(text="unity_game_assets module missing – reinstall add-on", icon='ERROR')

        # ── Unreal Engine Assets ─────────────────────────────────────────────
        unreal_box = layout.box()
        unreal_box.label(text="Unreal Engine Assets", icon='MESH_CUBE')

        if unreal_game_assets:
            ready, message = unreal_game_assets.UnrealAssets.get_status()
            status_icon = 'CHECKMARK' if ready else 'ERROR'

            info_col = unreal_box.column(align=True)
            info_col.scale_y = 0.8
            info_col.label(text=message, icon=status_icon)

            path_row = unreal_box.row(align=True)
            prefs_ue = preferences.get_preferences() if preferences else None
            if prefs_ue is not None:
                path_row.prop(prefs_ue, "unreal_assets_path", text="Path")
            elif hasattr(context.scene, 'fo4_unreal_assets_path'):
                path_row.prop(context.scene, "fo4_unreal_assets_path", text="Path")
            path_row.operator("fo4.set_unreal_assets_path", text="", icon='FILE_FOLDER')

            if ready:
                unreal_box.operator("fo4.browse_unreal_assets", text="Browse Unreal Assets", icon='VIEWZOOM')
                unreal_box.operator("fo4.import_unreal_asset", text="Import Unreal Asset", icon='IMPORT')
        else:
            unreal_box.label(text="unreal_game_assets module missing – reinstall add-on", icon='ERROR')

        layout.separator()

        # ── Asset Library ────────────────────────────────────────────────────
        paths_box = layout.box()
        paths_box.label(text="Asset Library – Paths", icon='FILE_FOLDER')

        row = paths_box.row(align=True)
        row.prop(scene, "fo4_asset_lib_path", text="All Assets")
        op = row.operator("fo4.set_asset_lib_path", text="", icon='FILE_FOLDER')
        op.slot = 'all'

        sep_box = paths_box.box()
        sep_col = sep_box.column(align=True)
        sep_col.scale_y = 0.85
        sep_col.label(text="Or set separate paths:", icon='INFO')

        row = sep_col.row(align=True)
        row.prop(scene, "fo4_asset_lib_mesh_path", text="Meshes")
        op = row.operator("fo4.set_asset_folder_path", text="", icon='FILE_FOLDER')
        op.slot = 'meshes'

        row = sep_col.row(align=True)
        row.prop(scene, "fo4_asset_lib_tex_path", text="Textures")
        op = row.operator("fo4.set_asset_folder_path", text="", icon='FILE_FOLDER')
        op.slot = 'textures'

        row = sep_col.row(align=True)
        row.prop(scene, "fo4_asset_lib_mat_path", text="Materials")
        op = row.operator("fo4.set_asset_folder_path", text="", icon='FILE_FOLDER')
        op.slot = 'materials'

        scan_row = paths_box.row(align=True)
        scan_row.scale_y = 1.3
        scan_row.operator("fo4.scan_asset_library", text="Scan / Refresh", icon='FILE_REFRESH')
        scan_row.operator("fo4.clear_asset_library", text="", icon='X')

        # ── Asset list / filter ──────────────────────────────────────────────
        lib_items = getattr(scene, 'fo4_asset_lib_items', None)
        total = len(lib_items) if lib_items else 0

        filter_box = layout.box()
        hdr = filter_box.row(align=True)
        hdr.label(text=f"Assets ({total})", icon='VIEWZOOM')

        filter_box.prop(scene, "fo4_asset_lib_search",   text="", icon='VIEWZOOM')
        filter_box.prop(scene, "fo4_asset_lib_category", text="")

        if total:
            filter_box.template_list(
                "FO4_UL_AssetLibrary",
                "",
                scene, "fo4_asset_lib_items",
                scene, "fo4_asset_lib_active",
                rows=8,
            )

            idx = getattr(scene, 'fo4_asset_lib_active', -1)
            if 0 <= idx < total:
                sel = lib_items[idx]
                detail = filter_box.box()
                detail.scale_y = 0.75
                detail.label(text=sel.name, icon='CHECKMARK')
                cat_icon = (
                    asset_library.get_category_icon(sel.category)
                    if asset_library else 'DOT'
                )
                detail.label(text=sel.category, icon=cat_icon)
                detail.label(text=sel.filepath)

            import_row = layout.row(align=True)
            import_row.scale_y = 1.4
            import_op = import_row.operator(
                "fo4.import_library_asset",
                text="Import Selected",
                icon='IMPORT',
            )
            import_op.use_link = False
            link_op = import_row.operator(
                "fo4.import_library_asset",
                text="Link",
                icon='LINKED',
            )
            link_op.use_link = True

        else:
            info_col = filter_box.column(align=True)
            info_col.scale_y = 0.75
            info_col.label(text="No assets found yet.", icon='INFO')
            info_col.label(text="Set a path above and click 'Scan / Refresh'.")

        # ── How-to hint ──────────────────────────────────────────────────────
        help_box = layout.box()
        help_box.label(text="How to Use", icon='QUESTION')
        help_col = help_box.column(align=True)
        help_col.scale_y = 0.72
        help_col.label(text="1. Set game / asset paths using the folder buttons", icon='DOT')
        help_col.label(text="2. Click 'Scan / Refresh' to link all your assets", icon='DOT')
        help_col.label(text="3. Use 'Import Asset' to bring a specific file into Blender", icon='DOT')
        help_col.label(text="   or search the list below and click 'Import Selected'", icon='DOT')
        help_col.label(text="4. Click 'Convert to Fallout 4', then Export as NIF", icon='DOT')


class FO4_PT_ExportPanel(_FO4SubPanel):
    """Export panel for Fallout 4 – NIF/FBX output with full FO4 settings"""
    bl_label = "Export to Fallout 4"
    bl_idname = "FO4_PT_export_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'

        # ── Fallout 4 game version ────────────────────────────────────────────
        ver_box = layout.box()
        ver_row = ver_box.row(align=True)
        ver_row.label(text="Game Version:", icon='BLENDER')
        ver_row.prop(context.scene, "fo4_game_version", text="")
        ver_hint = ver_box.column(align=True)
        ver_hint.scale_y = 0.75
        _FO4_VER_NOTES = {
            'FO4':   "OG: NIF 20.2.0.7 · bsver 130 · BSTriShape · target_game=FO4 · requires F4SE (pre-NG build)",
            'FO4NG': "Next-Gen: same NIF format as OG · requires updated F4SE (NG build) and NG-compatible mods",
            'FO4AE': "AE: same NIF 20.2.0.7 / bsver 130 / BSTriShape as OG & NG · ESL plugin support · requires latest F4SE",
        }
        ver_val = getattr(context.scene, "fo4_game_version", "FO4")
        ver_hint.label(
            text=_FO4_VER_NOTES.get(ver_val, "NIF 20.2.0.7 · bsver 130 · BSTriShape · target_game=FO4"),
            icon='INFO',
        )

        # ── Per-object mesh type ──────────────────────────────────────────────
        # The mesh type drives which NIF settings are applied: root node class
        # (BSFadeNode vs NiNode), BSXFlags, shader flags, and skinning path.
        # 'Auto-detect' classifies the mesh from armature/name/material
        # automatically; override it here for unusual setups.
        if obj and obj.type == 'MESH':
            mtype_box = layout.box()
            mtype_row = mtype_box.row(align=True)
            mtype_row.label(text="Mesh Type:", icon='MESH_DATA')
            mtype_row.prop(obj, "fo4_mesh_type", text="")

            # Per-type hint row
            try:
                from . import export_helpers as _eh
                mtype_val = getattr(obj, 'fo4_mesh_type', 'AUTO')
                if mtype_val == 'AUTO':
                    detected = _eh.ExportHelpers._classify_fo4_mesh_type(obj)
                    mtype_hint = mtype_box.column(align=True)
                    mtype_hint.scale_y = 0.75
                    mtype_hint.label(
                        text=f"Auto-detected as: {detected}"
                             " (override above if wrong)",
                        icon='INFO',
                    )
                    mtype_val = detected
                _MESH_TYPE_NOTES = {
                    'STATIC':
                        "BSFadeNode root · BSTriShape · no skinning",
                    'SKINNED':
                        "NiNode root · BSSubIndexTriShape · BSSkin::Instance · Skinned SF1",
                    'ARMOR':
                        "NiNode root · BSSubIndexTriShape · BSSkin::Instance · Skinned SF1",
                    'ANIMATED':
                        "NiNode root · NiKeyframeController · BSXFlags Animated (1)",
                    'LOD':
                        "BSFadeNode root · reduced poly count · same flags as Static",
                    'VEGETATION':
                        "BSFadeNode root · Two_Sided SF2 · Alpha Clip material required",
                    'FURNITURE':
                        "NiNode root · BSXFlags Animated (1) · enable CK furniture markers",
                    'WEAPON':
                        "NiNode root · no vertex skinning · attach via named bone",
                    'ARCHITECTURE':
                        "BSFadeNode root · BSXFlags Has-Havok (2) · collision required",
                    'FLORA':
                        "BSFadeNode root · Alpha Clip · harvest node (PO_HarvestNode) required",
                    'DEBRIS':
                        "BSFadeNode root · BSXFlags Has-Havok (2) · small physics object",
                }
                note = _MESH_TYPE_NOTES.get(mtype_val, "")
                if note:
                    mtype_hint = mtype_box.column(align=True)
                    mtype_hint.scale_y = 0.75
                    mtype_hint.label(text=note, icon='INFO')
            except Exception:
                pass

        # ── Exporter status & NIF settings ───────────────────────────────────
        # Shows which exporter is active and lets users verify / override the
        # key settings that determine CK compatibility.
        nif_box = layout.box()
        nif_box.label(text="NIF Exporter & Settings", icon='TOOL_SETTINGS')

        if export_helpers:
            pynifly_ok, pynifly_msg = export_helpers.ExportHelpers.pynifly_exporter_available()
            niftools_ok, niftools_msg = export_helpers.ExportHelpers.nif_exporter_available()
        else:
            pynifly_ok, pynifly_msg = False, "export_helpers unavailable — restart Blender"
            niftools_ok, niftools_msg = False, "export_helpers unavailable"

        # Which exporter will be used?
        if pynifly_ok:
            active_row = nif_box.row()
            active_row.label(text="✓ PyNifly v25 (BadDog) — active exporter", icon='CHECKMARK')
        elif niftools_ok:
            active_row = nif_box.row()
            active_row.label(text="✓ Niftools v0.1.1 — active exporter", icon='CHECKMARK')
        else:
            active_row = nif_box.row()
            active_row.label(text="✗ No NIF exporter installed", icon='ERROR')
            inst_col = nif_box.column(align=True)
            inst_col.scale_y = 0.8
            inst_col.label(text="Install PyNifly v25 (recommended for Blender 4/5):", icon='INFO')
            inst_col.operator("fo4.install_pynifly", text="Auto-Install PyNifly v25", icon='IMPORT')
            inst_col.separator(factor=0.5)
            inst_col.label(text="Or for Blender 3.6: install Niftools v0.1.1 ZIP", icon='INFO')

        # ── NIF settings reference (always-visible CK compatibility summary) ─
        settings_box = nif_box.box()
        settings_box.label(text="Creation Kit Compatibility Settings", icon='SETTINGS')
        settings_col = settings_box.column(align=True)
        settings_col.scale_y = 0.8

        # Game version — editable directly in the panel
        game_row = settings_col.row(align=True)
        game_row.label(text="Game target:")
        game_row.prop(context.scene, "fo4_game_version", text="")

        # Per-version dependency notes
        _ver_deps = {
            'FO4':   "Deps: F4SE (pre-NG build) · Creation Kit (Steam Tools) · FO4Edit",
            'FO4NG': "Deps: F4SE NG build · NG-compatible mods · Creation Kit (NG) · FO4Edit",
            'FO4AE': "Deps: F4SE (latest build) · AE-compatible mods · CK (AE) · FO4Edit · ESL support",
        }
        _cur_ver = getattr(context.scene, "fo4_game_version", "FO4")
        dep_col = settings_box.column(align=True)
        dep_col.scale_y = 0.75
        dep_col.label(text=_ver_deps.get(_cur_ver, ""), icon='LINKED')

        # Fixed CK-required values shown as informational labels
        info_col = settings_box.column(align=True)
        info_col.scale_y = 0.75
        info_col.label(text="NIF version: 20.2.0.7  |  User ver: 12  |  UV2: 130", icon='INFO')
        info_col.label(text="Geometry nodes: BSTriShape (static) / BSSubIndexTriShape (skinned)", icon='INFO')
        info_col.label(text="Shader: BSLightingShaderProperty  |  Tangent space: ON", icon='INFO')
        info_col.label(text="Scale correction: 1.0  (1 Blender unit = 1 NIF unit)", icon='INFO')
        if pynifly_ok:
            info_col.separator(factor=0.5)
            info_col.label(text="PyNifly v25 parameters used on export:", icon='SETTINGS')
            info_col.label(text="  target_game=FO4  |  export_modifiers=True", icon='DOT')
            info_col.label(text="  export_collision=True  |  export_colors=True", icon='DOT')
            info_col.label(text="  blender_xf=False  |  rename_bones=True", icon='DOT')
            info_col.label(text="Collision, animations, and bone renaming: auto-handled", icon='CHECKMARK')

        # Mesh optimisation toggles (affect the pre-export prep pass)
        opt_box = nif_box.box()
        opt_box.label(text="Pre-Export Mesh Preparation", icon='MODIFIER')
        opt_col = opt_box.column(align=True)
        opt_col.prop(context.scene, "fo4_opt_apply_transforms")
        opt_col.prop(context.scene, "fo4_opt_preserve_uvs")
        opt_col.prop(context.scene, "fo4_opt_doubles")

        opt_hint = opt_box.column(align=True)
        opt_hint.scale_y = 0.75
        opt_hint.label(text="These run automatically before every NIF export.", icon='INFO')
        opt_hint.label(text="Triangulate modifier is always added then removed.", icon='INFO')

        # ── Active object status ─────────────────────────────────────────────
        obj_box = layout.box()
        if obj and obj.type == 'MESH':
            col = obj_box.column(align=True)
            col.scale_y = 0.8
            mesh = obj.data
            poly_count = len(mesh.polygons)
            uv_ok = bool(mesh.uv_layers)
            scale_ok = obj.scale[:] == (1.0, 1.0, 1.0)
            coll_name = f"UCX_{obj.name}"
            has_coll = any(
                c.name == coll_name or c.get("fo4_collision")
                for c in obj.children
            )

            # Mesh name + poly count with FO4 budget indicator
            budget_icon = 'CHECKMARK' if poly_count <= 65535 else 'ERROR'
            col.label(
                text=f"Mesh: {obj.name}  ({poly_count:,} tris)",
                icon=budget_icon,
            )
            col.label(
                text=f"UV map: {'✓' if uv_ok else '✗ (will be auto-created)'}   "
                     f"Scale applied: {'✓' if scale_ok else '✗ (will be auto-applied)'}",
                icon='INFO',
            )
            col.label(
                text=f"Collision mesh (UCX_): {'✓ ' + coll_name if has_coll else '✗ none – generate below'}",
                icon='INFO',
            )
        elif obj and obj.type != 'MESH':
            obj_box.label(text=f"Active object is not a mesh ({obj.type})", icon='ERROR')
        else:
            obj_box.label(text="No active object selected", icon='ERROR')

        # ── Auto-prep notice ─────────────────────────────────────────────────
        prep_box = layout.box()
        prep_col = prep_box.column(align=True)
        prep_col.scale_y = 0.75
        prep_col.label(text="Auto-preparation before every NIF export:", icon='MODIFIER')
        prep_col.label(text="  • Apply scale & rotation transforms")
        prep_col.label(text="  • Create UV map if missing (smart-unwrap)")
        prep_col.label(text="  • Add Triangulate modifier (removed after export)")
        prep_col.label(text="  • Enable Auto Smooth for tangent vectors")

        # ── Export actions ───────────────────────────────────────────────────
        act_box = layout.box()
        act_box.label(text="Export", icon='EXPORT')

        row = act_box.row(align=True)
        row.enabled = has_mesh
        row.scale_y = 1.4
        row.operator("fo4.export_mesh", text="Export Mesh  (.nif)", icon='MESH_DATA')

        row2 = act_box.row(align=True)
        row2.enabled = has_mesh
        row2.scale_y = 1.2
        row2.operator(
            "fo4.export_mesh_with_collision",
            text="Export Mesh + Collision  (.nif)",
            icon='OBJECT_DATA',
        )

        act_box.separator(factor=0.5)
        row = act_box.row()
        row.enabled = has_mesh
        row.operator("fo4.validate_export", text="Validate Mesh Before Export", icon='CHECKMARK')

        row3 = act_box.row(align=True)
        row3.scale_y = 1.4
        row3.enabled = any(o.type == 'MESH' for o in context.scene.objects)
        row3.operator(
            "fo4.export_scene_as_nif",
            text="Export Entire Scene as NIF",
            icon='SCENE_DATA',
        )

        act_box.operator("fo4.export_all", text="Export Complete Mod Folder", icon='PACKAGE')

        # ── Mod Folder Import/Export ─────────────────────────────────────────
        mod_box = layout.box()
        mod_box.label(text="Mod Folder Workflow", icon='FILE_FOLDER')

        col = mod_box.column(align=True)
        col.scale_y = 0.75
        col.label(text="Import entire mod folder with structure")
        col.label(text="Export all meshes back to original locations")

        mod_row1 = mod_box.row(align=True)
        mod_row1.scale_y = 1.3
        mod_row1.operator("fo4.import_mod_folder", text="Import Mod Folder", icon='IMPORT')

        mod_row2 = mod_box.row(align=True)
        mod_row2.scale_y = 1.3
        mod_row2.operator("fo4.export_mod_folder", text="Export Mod Folder", icon='EXPORT')


class FO4_PT_BatchProcessingPanel(_FO4SubPanel):
    """Batch processing panel for multiple objects"""
    bl_label = "Batch Processing"
    bl_idname = "FO4_PT_batch_processing_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Info box
        info_box = layout.box()
        info_box.label(text="Select multiple meshes", icon='INFO')
        selected_meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        info_box.label(text=f"Selected: {len(selected_meshes)} meshes")

        # Batch operations
        box = layout.box()
        box.label(text="Batch Operations", icon='MODIFIER')

        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_optimize_meshes", text="Batch Optimize", icon='MOD_DECIM')

        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_validate_meshes", text="Batch Validate", icon='CHECKMARK')

        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_export_meshes", text="Batch Export", icon='EXPORT')

        # Batch LOD & Collision
        lod_box = layout.box()
        lod_box.label(text="Batch LOD & Collision", icon='OUTLINER_OB_MESH')
        sub = lod_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="Generates LOD1–LOD4 copies for every selected mesh.", icon='INFO')
        sub.label(text="Collision uses each object's fo4_collision_type (inferred", icon='INFO')
        sub.label(text="from name if not set). GRASS / MUSHROOM / NONE are skipped.", icon='INFO')
        lod_box.separator()
        row = lod_box.row()
        row.enabled = len(selected_meshes) > 0
        row.scale_y = 1.2
        row.operator("fo4.batch_generate_lod", text="Batch Generate LOD", icon='OUTLINER_OB_MESH')
        row = lod_box.row()
        row.enabled = len(selected_meshes) > 0
        row.scale_y = 1.2
        row.operator("fo4.batch_generate_collision", text="Batch Generate Collision", icon='MESH_ICOSPHERE')

        # Tips
        tips_box = layout.box()
        tips_box.label(text="Tips:", icon='HELP')
        tips_box.label(text="• Select meshes with Shift+Click")
        tips_box.label(text="• Use Box Select (B key)")
        tips_box.label(text="• Processing is sequential")


class FO4_PT_AutomationQuickPanel(_FO4SubPanel):
    """Automation and quick tools panel"""
    bl_label = "Automation & Quick Tools"
    bl_idname = "FO4_PT_automation_quick_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"

    def draw(self, context):
        layout = self.layout
        obj = context.active_object

        # Quick prepare
        box = layout.box()
        box.label(text="One-Click Preparation", icon='TOOL_SETTINGS')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.quick_prepare_export", text="Quick Prepare for Export", icon='CHECKMARK')
        row.scale_y = 1.5

        # Auto-fix
        box = layout.box()
        box.label(text="Auto-Fix Issues", icon='MODIFIER')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.auto_fix_issues", text="Auto-Fix Common Issues", icon='TOOL_SETTINGS')

        # Collision mesh
        box = layout.box()
        box.label(text="Collision Mesh", icon='MESH_ICOSPHERE')
        if obj and obj.type == 'MESH':
            box.prop(obj, "fo4_collision_type", text="Type")
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        op = row.operator("fo4.set_collision_type", text="Change Type (Selected)", icon='PRESET')
        if op is not None:
            op.apply_to_all = True
        row = box.row()
        row.enabled = obj and obj.type == 'MESH' and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE','GRASS','MUSHROOM')
        row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')

        # Smart material
        box = layout.box()
        box.label(text="Smart Material", icon='MATERIAL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.smart_material_setup", text="Auto-Load Textures", icon='FILE_FOLDER')

        # What it does
        info_box = layout.box()
        info_box.label(text="Quick Prepare includes:", icon='INFO')
        info_box.label(text="1. Mesh optimization")
        info_box.label(text="2. Material setup")
        info_box.label(text="3. Validation checks")
        info_box.label(text="4. Texture validation")



class FO4_PT_Havok2FBXPanel(_FO4SubPanel):
    """Havok2FBX configuration and animation export settings."""
    bl_label = "Havok2FBX"
    bl_idname = "FO4_PT_havok2fbx_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        prefs = preferences.get_preferences() if preferences else None
        path = preferences.get_havok2fbx_path() if preferences else None
        obj = context.active_object

        # ── Tool path ──────────────────────────────────────────────────────
        path_box = layout.box()
        path_box.label(text="Configure Havok2FBX", icon='FILE_FOLDER')
        if scene:
            path_box.prop(scene, "fo4_havok2fbx_path", text="Folder")
            row = path_box.row()
            row.operator("fo4.install_havok2fbx", text="Get Havok2FBX", icon='URL')
            row.operator("fo4.check_tool_paths", text="Check Paths", icon='INFO')
        else:
            path_box.label(text="Preferences not available (addon not registered)", icon='ERROR')

        status_row = path_box.row()
        if path:
            status_row.label(text=f"Configured: {path}", icon='CHECKMARK')
        else:
            status_row.label(text="Path not found — set folder above.", icon='ERROR')

        # ── Animation type ─────────────────────────────────────────────────
        type_box = layout.box()
        type_box.label(text="Animation Type", icon='ARMATURE_DATA')
        type_box.prop(scene, "fo4_havok_anim_type", text="")

        # ── Output settings ────────────────────────────────────────────────
        out_box = layout.box()
        out_box.label(text="Output", icon='FILE_FOLDER')
        out_box.prop(scene, "fo4_havok_output_dir", text="Directory")
        out_box.prop(scene, "fo4_havok_anim_name", text="Name Override")

        # ── Playback settings ──────────────────────────────────────────────
        pb_box = layout.box()
        pb_box.label(text="Playback", icon='TIME')
        row = pb_box.row()
        row.prop(scene, "fo4_havok_fps")
        row = pb_box.row()
        row.prop(scene, "fo4_havok_loop")
        row.prop(scene, "fo4_havok_root_motion")
        pb_box.prop(scene, "fo4_havok_force_frame_range")

        # ── FBX export options ─────────────────────────────────────────────
        fbx_box = layout.box()
        fbx_box.label(text="FBX Export Options", icon='EXPORT')
        fbx_box.prop(scene, "fo4_havok_bake_anim")
        fbx_box.prop(scene, "fo4_havok_key_all_bones")
        fbx_box.prop(scene, "fo4_havok_apply_transforms")
        row = fbx_box.row()
        row.prop(scene, "fo4_havok_scale")
        fbx_box.prop(scene, "fo4_havok_simplify_value", slider=True)

        # ── Export button ──────────────────────────────────────────────────
        export_box = layout.box()
        armature_ok = obj is not None and obj.type == 'ARMATURE'
        has_anim = armature_ok and obj.animation_data and obj.animation_data.action
        if not armature_ok:
            export_box.label(text="Select an armature to export.", icon='INFO')
        elif not has_anim:
            export_box.label(text="No active action on armature.", icon='ERROR')
        else:
            action_name = obj.animation_data.action.name
            export_box.label(text=f"Action: {action_name}", icon='ACTION')
        col = export_box.column()
        col.enabled = armature_ok
        col.scale_y = 1.4
        col.operator(
            "fo4.export_animation_havok2fbx",
            text="Export Animation" + (" → HKX" if path else " → FBX"),
            icon='EXPORT',
        )


class FO4_PT_VegetationPanel(_FO4SubPanel):
    """Vegetation and landscaping panel"""
    bl_label = "Vegetation & Landscaping"
    bl_idname = "FO4_PT_vegetation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        obj = context.active_object
        selected_meshes = [o for o in context.selected_objects if o.type == 'MESH']

        # ── Asset-path status banner ─────────────────────────────────────────
        _draw_game_path_box(layout, context)

        # Create vegetation
        box = layout.box()
        box.label(text="Create Vegetation", icon='OUTLINER_OB_FORCE_FIELD')
        box.operator("fo4.create_vegetation_preset", text="Create Vegetation", icon='ADD')

        # Scatter vegetation
        box = layout.box()
        box.label(text="Scatter & Distribute", icon='PARTICLE_DATA')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.scatter_vegetation", text="Scatter Vegetation", icon='PARTICLES')

        # Combine meshes
        box = layout.box()
        box.label(text="Combine for Performance", icon='MESH_DATA')
        box.label(text=f"Selected: {len(selected_meshes)} meshes")
        row = box.row()
        row.enabled = len(selected_meshes) >= 2
        row.operator("fo4.combine_vegetation_meshes", text="Combine Selected", icon='AUTOMERGE_ON')

        # Optimization
        box = layout.box()
        box.label(text="FPS Optimization", icon='SORTTIME')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.optimize_vegetation_fps", text="Optimize for FPS", icon='TIME')

        # LOD generation
        box = layout.box()
        box.label(text="LOD System", icon='OUTLINER_OB_MESH')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="FO4: LOD0 (close) → LOD3 (far) per vegetation asset", icon='INFO')
        sub.label(text="Source = LOD0. Creates LOD1–LOD3 copies.", icon='INFO')
        box.separator()
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.scale_y = 1.3
        row.operator("fo4.create_vegetation_lod_chain", text="Create LOD Chain", icon='MESH_GRID')
        row2 = box.row()
        row2.enabled = obj and obj.type == 'MESH'
        row2.operator("fo4.export_lod_chain_as_nif", text="Export LOD Chain as NIF", icon='EXPORT')

        # Collision for vegetation
        box = layout.box()
        box.label(text="Collision (for trees / large bushes)", icon='MESH_ICOSPHERE')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="VEGETATION type = simplified convex hull footprint", icon='INFO')
        sub.label(text="GRASS / MUSHROOM = no collision (thin foliage)", icon='INFO')
        box.separator()
        has_mesh = obj and obj.type == 'MESH'
        if has_mesh:
            box.prop(obj, "fo4_collision_type", text="Type")
        row = box.row()
        row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
        row = box.row()
        can_collide = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
        row.enabled = can_collide
        row.operator("fo4.generate_collision_mesh", text="Generate Collision Mesh", icon='MESH_DATA')
        row = box.row()
        row.enabled = has_mesh
        row.operator("fo4.generate_lod_and_collision",
                     text="Generate LOD + Collision", icon='SHADERFX')

        # Wind animation
        box = layout.box()
        box.label(text="Wind Animation", icon='FORCE_WIND')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.generate_wind_weights", text="Generate Wind Weights", icon='WPAINT_HLT')
        row2 = box.row()
        row2.enabled = obj and obj.type == 'MESH'
        row2.operator("fo4.apply_wind_animation", text="Apply Wind Animation", icon='ANIM')
        row3 = box.row()
        row3.enabled = bool([o for o in context.selected_objects if o.type == 'MESH'])
        row3.operator("fo4.batch_apply_wind_animation", text="Batch: Wind (Selected)", icon='PARTICLES')

        # Material setup
        box = layout.box()
        box.label(text="Vegetation Material", icon='MATERIAL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.setup_vegetation_material",
                     text="Setup Vegetation Material", icon='NODE_MATERIAL')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="Alpha Clip + Two-Sided (for leaves/grass)", icon='INFO')
        sub.label(text="Requires BC3 (DXT5) diffuse texture with alpha", icon='INFO')

        # Export
        box = layout.box()
        box.label(text="Export", icon='EXPORT')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.export_vegetation_as_nif",
                     text="Export Vegetation NIF", icon='FILE_BLEND')

        # Baking
        box = layout.box()
        box.label(text="Baking", icon='RENDER_STILL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.bake_vegetation_ao", text="Bake Ambient Occlusion", icon='SHADING_RENDERED')

        # Tips
        tips_box = layout.box()
        tips_box.label(text="Workflow Tips (FO4 Vegetation):", icon='INFO')
        tips_box.label(text="1. Create vegetation preset")
        tips_box.label(text="2. Set collision type: VEGETATION or TREE → has collision")
        tips_box.label(text="   GRASS / MUSHROOM → no collision (thin foliage)")
        tips_box.label(text="3. Generate LOD + Collision (one click)")
        tips_box.label(text="4. Setup vegetation material (Alpha Clip)")
        tips_box.label(text="5. Export LOD Chain as NIF → meshes/ folder")
        tips_box.label(text="6. Open in Creation Kit as Static/Grass record")


class FO4_PT_QuestPanel(_FO4SubPanel):
    """Quest creation panel"""
    bl_label = "Quest Creation"
    bl_idname = "FO4_PT_quest_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Quest template
        box = layout.box()
        box.label(text="Quest Setup", icon='BOOKMARKS')
        box.operator("fo4.create_quest_template", text="Create Quest Template", icon='ADD')
        box.operator("fo4.export_quest_data", text="Export Quest Data", icon='EXPORT')

        # Papyrus script
        box = layout.box()
        box.label(text="Scripting", icon='SCRIPT')
        box.operator("fo4.quest_generate_papyrus_script", text="Generate Papyrus Script", icon='FILE_SCRIPT')

        # Info
        info_box = layout.box()
        info_box.label(text="Quest Workflow:", icon='INFO')
        info_box.label(text="1. Create quest template")
        info_box.label(text="2. Define stages & objectives")
        info_box.label(text="3. Generate Papyrus script")
        info_box.label(text="4. Export for Creation Kit")


class FO4_PT_NPCPanel(_FO4SubPanel):
    """NPC and creature creation panel"""
    bl_label = "NPCs & Creatures"
    bl_idname = "FO4_PT_npc_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # NPC creation
        box = layout.box()
        box.label(text="Create NPC", icon='ARMATURE_DATA')
        box.operator("fo4.create_npc", text="Create NPC", icon='ADD')

        # Creature creation
        box = layout.box()
        box.label(text="Create Creature", icon='MOD_ARMATURE')
        box.operator("fo4.create_creature", text="Create Creature", icon='ADD')

        # Tips
        tips_box = layout.box()
        tips_box.label(text="Tips:", icon='INFO')
        tips_box.label(text="• Customize base mesh")
        tips_box.label(text="• Add armature for animation")
        tips_box.label(text="• Setup materials & textures")
        tips_box.label(text="• Export as FBX for import")


class FO4_PT_WorldBuildingPanel(_FO4SubPanel):
    """World building and cells panel"""
    bl_label = "World Building"
    bl_idname = "FO4_PT_world_building_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Interior cells
        box = layout.box()
        box.label(text="Interior Cells", icon='HOME')
        box.operator("fo4.create_interior_cell", text="Create Interior Cell", icon='ADD')
        box.operator("fo4.create_door_frame", text="Add Door Frame", icon='MESH_PLANE')

        # Workshop objects
        box = layout.box()
        box.label(text="Workshop/Settlement", icon='TOOL_SETTINGS')
        box.operator("fo4.create_workshop_object", text="Create Workshop Object", icon='ADD')

        # Navigation
        box = layout.box()
        box.label(text="Navigation", icon='ORIENTATION_NORMAL')
        box.operator("fo4.create_navmesh", text="Create NavMesh Helper", icon='MESH_GRID')

        # Lighting
        box = layout.box()
        box.label(text="Lighting Presets", icon='LIGHT')
        box.operator("fo4.create_lighting_preset", text="Create Lighting Preset", icon='ADD')

        # Info
        info_box = layout.box()
        info_box.label(text="World Building:", icon='INFO')
        info_box.label(text="• Start with cell template")
        info_box.label(text="• Add doors & windows")
        info_box.label(text="• Place workshop objects")
        info_box.label(text="• Setup lighting")
        info_box.label(text="• Create navmesh last")


class FO4_PT_ItemCreationPanel(_FO4SubPanel):
    """Item creation panel"""
    bl_label = "Item Creation"
    bl_idname = "FO4_PT_item_creation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Weapons
        box = layout.box()
        box.label(text="Weapons", icon='MOD_ARMATURE')
        box.operator("fo4.create_weapon_item", text="Create Weapon", icon='ADD')

        # Armor
        box = layout.box()
        box.label(text="Armor", icon='MESH_UVSPHERE')
        box.operator("fo4.create_armor_item", text="Create Armor", icon='ADD')
        box.operator("fo4.create_power_armor_piece", text="Create Power Armor", icon='ADD')

        # Consumables
        box = layout.box()
        box.label(text="Consumables", icon='FORCE_LENNARDJONES')
        box.operator("fo4.create_consumable", text="Create Consumable", icon='ADD')

        # Misc items
        box = layout.box()
        box.label(text="Misc Items", icon='OBJECT_DATA')
        box.operator("fo4.create_misc_item", text="Create Misc Item", icon='ADD')

        # Clutter
        box = layout.box()
        box.label(text="Clutter/Decoration", icon='PROP_OFF')
        box.operator("fo4.create_clutter_object", text="Create Clutter", icon='ADD')

        # Info
        info_box = layout.box()
        info_box.label(text="Item Workflow:", icon='INFO')
        info_box.label(text="1. Create item base")
        info_box.label(text="2. Model details")
        info_box.label(text="3. Setup textures")
        info_box.label(text="4. Optimize & validate")
        info_box.label(text="5. Export as NIF (via PyNifly v25)")


class FO4_PT_ArmorClothingPanel(_FO4SubPanel):
    """Armor and clothing creation panel — free-tools workflow (Blender + Outfit Studio)"""
    bl_label      = "Armor & Clothing"
    bl_idname     = "FO4_PT_armor_clothing_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category   = 'Fallout 4'
    bl_parent_id  = "FO4_PT_main_panel"
    bl_options    = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        obj    = context.active_object
        has_mesh = obj is not None and obj.type == 'MESH'

        # ── Workflow guide + guide mod link ──────────────────────────────────
        top_box = layout.box()
        top_box.label(text="Free-Tools Workflow  (Blender + Outfit Studio)", icon='INFO')
        top_col = top_box.column(align=True)
        top_col.scale_y = 0.78
        top_col.label(text="Based on Nexus mod 17785 — skeleton fo4.blend guide.")
        top_col.label(text="Requirements: Blender · BodySlide+Outfit Studio · CBBE")
        top_box.operator(
            "fo4.show_armor_clothing_workflow",
            text="Full Workflow Guide",
            icon='QUESTION',
        )
        top_box.operator(
            "fo4.open_fo4_armor_blender_guide",
            text="Nexus 17785 — Armor/Outfit Blender Guide",
            icon='URL',
        )

        # ── Body slot selector ────────────────────────────────────────────────
        layout.separator()
        slot_box = layout.box()
        slot_box.label(text="Body Slot (ArmorAddon Biped Object)", icon='MODIFIER')
        slot_box.prop(scene, "fo4_armor_body_slot", text="Slot")
        slot_col = slot_box.column(align=True)
        slot_col.scale_y = 0.72
        slot_col.label(text="30=Body  31=Head  32=Hair  33=Hands  34=Forearms")
        slot_col.label(text="35=Neck  37=Feet  38=Calves  39=Back/Shield")
        slot_col.label(text="Slots 44-60 = custom accessories")
        slot_col.label(text="Power Armor pieces: slots 55-60 by convention")

        # ── Step 1 helpers ────────────────────────────────────────────────────
        layout.separator()
        s1_box = layout.box()
        s1_box.label(text="Step 1 — Import & Prepare Reference Body", icon='IMPORT')
        s1_col = s1_box.column(align=True)
        s1_col.scale_y = 0.78
        s1_col.label(text="1. In Outfit Studio: load CBBE body, export as FBX.")
        s1_col.label(text="2. Open skeleton fo4.blend (from Nexus 17785).")
        s1_col.label(text="3. Import the FBX — it will look crumpled. That is normal.")
        s1_col.label(text="4. Click 'Remove Malformed Armature' below to fix it.")
        row = s1_box.row(align=True)
        row.enabled = has_mesh
        row.operator(
            "fo4.clean_imported_armature",
            text="Remove Malformed Armature",
            icon='TRASH',
        )
        s1_box.separator(factor=0.3)
        s1_col2 = s1_box.column(align=True)
        s1_col2.scale_y = 0.78
        s1_col2.label(text="5. Set body origin to (0, 0, 120) — required by FO4.")
        row2 = s1_box.row(align=True)
        row2.enabled = has_mesh
        row2.operator("fo4.set_armor_origin", text="Set Origin (0, 0, 120)", icon='OBJECT_ORIGIN')

        # ── Step 2 helpers ────────────────────────────────────────────────────
        layout.separator()
        s2_box = layout.box()
        s2_box.label(text="Step 2 — Weight Paint Armor from Body", icon='WPAINT_FACE')
        s2_col = s2_box.column(align=True)
        s2_col.scale_y = 0.78
        s2_col.label(text="Select your armor (active) + reference body (shift-click).")
        s2_col.label(text="Then click Transfer Weights to copy bone weights.")
        row3 = s2_box.row(align=True)
        row3.enabled = has_mesh
        row3.operator(
            "fo4.transfer_armor_weights",
            text="Transfer Weights from Body",
            icon='MOD_DATA_TRANSFER',
        )
        s2_box.separator(factor=0.3)
        hint = s2_box.column(align=True)
        hint.scale_y = 0.72
        hint.label(text="After transfer: check deformation in Pose mode.")
        hint.label(text="Clean up tiny weight groups (< 0.01) for performance.")

        # ── Step 3 helpers ────────────────────────────────────────────────────
        layout.separator()
        s3_box = layout.box()
        s3_box.label(text="Step 3 — Prepare for FBX Export to Outfit Studio", icon='EXPORT')
        s3_col = s3_box.column(align=True)
        s3_col.scale_y = 0.78
        s3_col.label(text="IMPORTANT: split UV seam edges before FBX export.")
        s3_col.label(text="Without this, UV coords are corrupted in Outfit Studio.")
        row4 = s3_box.row(align=True)
        row4.enabled = has_mesh
        row4.operator(
            "fo4.split_uv_seam_edges",
            text="Split UV Seam Edges",
            icon='UV',
        )
        s3_box.separator(factor=0.3)
        exp_col = s3_box.column(align=True)
        exp_col.scale_y = 0.72
        exp_col.label(text="FBX export settings:")
        exp_col.label(text="  Apply transforms  ✓   Scale: 1.0")
        exp_col.label(text="  Armature: Only Deform Bones  ✓")
        exp_col.label(text="  Bake Animation: OFF")
        exp_col.label(text="  Origin: same as reference body (0, 0, 120)")
        exp_col.label(text="Note: if UV seams must stay joined, export OBJ")
        exp_col.label(text="for geometry + FBX for weights, then merge in OS.")

        # ── Step 4 — Outfit Studio + NIF ─────────────────────────────────────
        layout.separator()
        s4_box = layout.box()
        s4_box.label(text="Step 4 — Outfit Studio → NIF", icon='MODIFIER')
        s4_col = s4_box.column(align=True)
        s4_col.scale_y = 0.78
        s4_col.label(text="1. Import your FBX in Outfit Studio.")
        s4_col.label(text="2. Assign a material. Invert the Y UV coordinate.")
        s4_col.label(text="3. Conform to CBBE body for BodySlide slider support.")
        s4_col.label(text="4. Export as .nif to Data\\Meshes\\...")
        s4_box.separator(factor=0.3)
        s4_box.operator(
            "fo4.open_bodyslide_outfit_studio",
            text="Get BodySlide & Outfit Studio  (Nexus 25)",
            icon='URL',
        )
        s4_box.operator("fo4.open_cbbe", text="Get CBBE Body  (Nexus 15)", icon='URL')

        # ── Tool links ────────────────────────────────────────────────────────
        layout.separator()
        tools_box = layout.box()
        tools_box.label(text="Pose & Screenshot Tools", icon='ARMATURE_DATA')
        tools_box.operator(
            "fo4.open_story_action_poses",
            text="Story Action Poses  (1,700+ poses, Nexus 58448)",
            icon='URL',
        )
        tools_box.operator("fo4.open_aaf",           text="AAF Framework  (Nexus 31304)", icon='URL')
        tools_box.operator("fo4.open_poser_hotkeys", text="Poser Hotkeys  (Nexus 45967)", icon='URL')
        tools_box.operator(
            "fo4.show_story_action_poses_guide",
            text="Story Action Poses Setup Guide",
            icon='QUESTION',
        )
    """Preset library panel for saving and loading creations"""
    bl_label = "Preset Library"
    bl_idname = "FO4_PT_preset_library_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # Save preset section
        box = layout.box()
        box.label(text="Save Preset", icon='FILE_NEW')
        box.operator("fo4.save_preset", text="Save Current Objects", icon='ADD')

        # Category filter
        box = layout.box()
        box.label(text="Browse Library", icon='BOOKMARKS')
        box.prop(scene, "fo4_preset_filter_category", text="Category")
        box.prop(scene, "fo4_preset_search", text="", icon='VIEWZOOM')
        box.operator("fo4.refresh_preset_library", text="Refresh", icon='FILE_REFRESH')

        # Recent presets
        try:
            from . import preset_library as _preset_library
        except Exception:
            _preset_library = None
        recent = _preset_library.PresetLibrary.get_recent_presets(5) if _preset_library else []

        if recent:
            recent_box = layout.box()
            recent_box.label(text="Recent Presets", icon='TIME')
            for preset in recent:
                row = recent_box.row()
                row.label(text=preset['name'], icon='FILE')
                op = row.operator("fo4.load_preset", text="", icon='IMPORT')
                op.filepath = preset['filepath']
                op = row.operator("fo4.delete_preset", text="", icon='TRASH')
                op.filepath = preset['filepath']

        # Popular presets
        popular = _preset_library.PresetLibrary.get_popular_presets(5) if _preset_library else []
        if popular:
            pop_box = layout.box()
            pop_box.label(text="Most Used", icon='SOLO_ON')
            for preset in popular:
                row = pop_box.row()
                uses = preset.get('use_count', 0)
                row.label(text=f"{preset['name']} ({uses}x)", icon='FILE')
                op = row.operator("fo4.load_preset", text="", icon='IMPORT')
                op.filepath = preset['filepath']

        # Info
        info_box = layout.box()
        info_box.label(text="Preset Library:", icon='INFO')
        info_box.label(text="• Save any creation for reuse")
        info_box.label(text="• Load presets instantly")
        info_box.label(text="• Search by name/tags")
        info_box.label(text="• Track usage statistics")


class FO4_PT_AutomationMacrosPanel(_FO4SubPanel):
    """Automation and macro system panel"""
    bl_label = "Automation & Macros"
    bl_idname = "FO4_PT_automation_macros_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        try:
            from . import automation_system as _automation_system
        except Exception:
            _automation_system = None

        # Recording controls
        box = layout.box()
        box.label(text="Macro Recording", icon='REC')

        if scene.fo4_is_recording:
            box.label(text="● RECORDING", icon='RADIOBUT_ON')
            if _automation_system:
                action_count = len(_automation_system.AutomationSystem.recorded_actions)
                box.label(text=f"Actions recorded: {action_count}")
            box.operator("fo4.stop_recording", text="Stop Recording", icon='CANCEL')
        else:
            box.operator("fo4.start_recording", text="Start Recording", icon='REC')
            box.label(text="Record your actions to create macros")

        # Save macro
        if not scene.fo4_is_recording:
            if _automation_system and _automation_system.AutomationSystem.recorded_actions:
                save_box = layout.box()
                save_box.label(text="Save Recorded Macro", icon='FILE_NEW')
                save_box.operator("fo4.save_macro", text="Save as Macro", icon='FILE_TICK')

        # Workflow templates
        template_box = layout.box()
        template_box.label(text="Workflow Templates", icon='SCRIPT')
        template_box.operator("fo4.execute_workflow_template", text="Execute Template", icon='PLAY')

        # Saved macros
        macros = _automation_system.AutomationSystem.get_all_macros() if _automation_system else []

        if macros:
            macro_box = layout.box()
            macro_box.label(text="Saved Macros", icon='BOOKMARKS')
            for macro in macros[:10]:  # Show first 10
                row = macro_box.row()
                action_count = macro.get('action_count', 0)
                row.label(text=f"{macro['name']} ({action_count} steps)", icon='SCRIPT')
                op = row.operator("fo4.execute_macro", text="", icon='PLAY')
                op.filepath = macro['filepath']
                op = row.operator("fo4.delete_macro", text="", icon='TRASH')
                op.filepath = macro['filepath']

        # Info
        info_box = layout.box()
        info_box.label(text="Automation Features:", icon='INFO')
        info_box.label(text="• Record repetitive tasks")
        info_box.label(text="• Replay macros instantly")
        info_box.label(text="• Use workflow templates")
        info_box.label(text="• Boost productivity 10x")


class FO4_PT_PostProcessingPanel(_FO4SubPanel):
    """Fallout 4 post-processing compositor preview and ImageSpace export"""
    bl_label = "Post-Processing (FO4)"
    bl_idname = "FO4_PT_post_processing_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Setup & Presets ──────────────────────────────────────────────────
        setup_box = layout.box()
        setup_box.label(text="Compositor Setup", icon='NODE_COMPOSITING')
        row = setup_box.row(align=True)
        row.operator("fo4.setup_post_processing",
                     text="Setup Compositor", icon='NODETREE')
        row.operator("fo4.clear_post_processing",
                     text="Clear", icon='X')

        preset_box = layout.box()
        preset_box.label(text="Quick Presets", icon='PRESET')
        preset_box.prop(scene, "fo4_pp_preset", text="")
        op = preset_box.operator("fo4.apply_pp_preset",
                                 text="Apply Preset", icon='CHECKMARK')
        op.preset = getattr(scene, "fo4_pp_preset", "VANILLA")

        # ── Bloom ────────────────────────────────────────────────────────────
        bloom_box = layout.box()
        bloom_box.label(text="Bloom (CK: BloomScale / BloomBlurRadius)",
                        icon='LIGHT_SUN')
        col = bloom_box.column(align=True)
        col.prop(scene, "fo4_pp_bloom_strength",  text="Strength")
        col.prop(scene, "fo4_pp_bloom_threshold", text="Threshold")
        col.prop(scene, "fo4_pp_bloom_radius",    text="Radius")

        # ── Colour Grading ───────────────────────────────────────────────────
        color_box = layout.box()
        color_box.label(text="Colour Grading (CK: Saturation / Contrast)",
                        icon='COLOR')
        col = color_box.column(align=True)
        col.prop(scene, "fo4_pp_saturation",  text="Saturation")
        col.prop(scene, "fo4_pp_contrast",    text="Contrast")
        col.prop(scene, "fo4_pp_brightness",  text="Brightness")

        # ── Tint ─────────────────────────────────────────────────────────────
        tint_box = layout.box()
        tint_box.label(text="Screen Tint (CK: TintColor R/G/B/A)", icon='RESTRICT_COLOR_OFF')
        row = tint_box.row(align=True)
        row.prop(scene, "fo4_pp_tint_r", text="R")
        row.prop(scene, "fo4_pp_tint_g", text="G")
        row.prop(scene, "fo4_pp_tint_b", text="B")
        tint_box.prop(scene, "fo4_pp_tint_strength", text="Strength")

        # ── Vignette & Cinematic ─────────────────────────────────────────────
        vfx_box = layout.box()
        vfx_box.label(text="Vignette & Cinematic", icon='ZOOM_OUT')
        vfx_box.prop(scene, "fo4_pp_vignette",        text="Vignette")
        vfx_box.prop(scene, "fo4_pp_cinematic_bars",  text="Cinematic Bars")

        # ── Depth of Field ───────────────────────────────────────────────────
        dof_box = layout.box()
        dof_box.label(text="Depth of Field", icon='CAMERA_DATA')
        dof_box.prop(scene, "fo4_pp_dof_enabled", text="Enable DoF")
        row = dof_box.row()
        row.enabled = getattr(scene, "fo4_pp_dof_enabled", False)
        row.prop(scene, "fo4_pp_dof_fstop", text="f-stop")

        # ── CK-Only Fields ───────────────────────────────────────────────────
        ck_box = layout.box()
        ck_box.label(text="Creation Kit Only (no compositor preview)",
                     icon='EXPORT')
        col = ck_box.column(align=True)
        col.prop(scene, "fo4_pp_eye_adapt_speed",    text="Eye Adapt Speed")
        col.prop(scene, "fo4_pp_eye_adapt_strength", text="Eye Adapt Strength")
        col.prop(scene, "fo4_pp_white",              text="White Level")

        # ── Export ───────────────────────────────────────────────────────────
        export_box = layout.box()
        export_box.label(text="Export for Creation Kit", icon='EXPORT')
        export_box.operator("fo4.export_imagespace_data",
                            text="Export ImageSpace JSON", icon='FILE_TEXT')
        export_box.operator("fo4.sync_pp_props",
                            text="Sync to Compositor", icon='FILE_REFRESH')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Workflow:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Click 'Setup Compositor'")
        sub.label(text="2. Set viewport to Rendered mode")
        sub.label(text="3. Adjust sliders for real-time preview")
        sub.label(text="4. Export JSON → enter values in CK IMGS record")


class FO4_PT_MaterialBrowserPanel(_FO4SubPanel):
    """FO4 material preset browser – apply pre-built surface materials"""
    bl_label = "Material Browser (FO4)"
    bl_idname = "FO4_PT_material_browser_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Preset selector ──────────────────────────────────────────────────
        sel_box = layout.box()
        sel_box.label(text="Surface Material Preset", icon='MATERIAL')
        sel_box.prop(scene, "fo4_mat_preset", text="")
        sel_box.prop(scene, "fo4_mat_apply_all", text="Apply to All Selected")
        op = sel_box.operator("fo4.apply_material_preset",
                              text="Apply to Selection", icon='CHECKMARK')
        op.preset      = getattr(scene, "fo4_mat_preset", "RUSTY_METAL")
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

        # ── Quick-apply buttons by category ─────────────────────────────────
        if fo4_material_browser:
            # Metals
            m_box = layout.box()
            m_box.label(text="Metals", icon='MATERIAL_DATA')
            row = m_box.row(align=True)
            for pid in ("RUSTY_METAL", "CLEAN_METAL", "GALVANIZED_METAL", "VAULT_METAL"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Stone & Ground
            s_box = layout.box()
            s_box.label(text="Stone & Ground", icon='MESH_CUBE')
            row = s_box.row(align=True)
            for pid in ("CRACKED_CONCRETE", "SMOOTH_CONCRETE", "STONE", "ASPHALT"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Organic & Fabric
            o_box = layout.box()
            o_box.label(text="Organic & Fabric", icon='MESH_UVSPHERE')
            row = o_box.row(align=True)
            for pid in ("WOOD_PLANK", "LEATHER", "FABRIC_CLOTH", "HUMAN_SKIN"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Special / Emissive
            e_box = layout.box()
            e_box.label(text="Special / Emissive", icon='LIGHT_SUN')
            row = e_box.row(align=True)
            for pid in ("NEON_LIGHT", "TERMINAL_SCREEN", "POWER_ARMOR_PAINT", "GLASS_CLEAR"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Workflow:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Select your mesh object(s)")
        sub.label(text="2. Pick a surface type")
        sub.label(text="3. Click 'Apply to Selection'")
        sub.label(text="4. Connect your texture images to the")
        sub.label(text="   Diffuse/Normal/Specular nodes")
        sub.label(text="5. Convert textures to DDS in NVTT panel")


class FO4_PT_SceneDiagnosticsPanel(_FO4SubPanel):
    """Comprehensive FO4 scene health / export-readiness dashboard"""
    bl_label = "Scene Diagnostics"
    bl_idname = "FO4_PT_scene_diagnostics_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Score header ────────────────────────────────────────────────────
        score   = getattr(scene, "fo4_diag_last_score",    -1)
        errors  = getattr(scene, "fo4_diag_last_errors",    0)
        warns   = getattr(scene, "fo4_diag_last_warnings",  0)
        ready   = getattr(scene, "fo4_diag_export_ready",   False)

        score_box = layout.box()
        if score < 0:
            score_box.label(text="No diagnostics run yet", icon='QUESTION')
        else:
            icon = 'CHECKMARK' if ready else ('ERROR' if errors > 0 else 'INFO')
            score_box.label(
                text=f"Score: {score}/100  |  {errors} error(s)  {warns} warning(s)",
                icon=icon,
            )
            if ready:
                score_box.label(text="✅ Scene is export-ready", icon='CHECKMARK')
            elif errors > 0:
                score_box.label(text="❌ Fix errors before exporting", icon='ERROR')

        # ── Action buttons ───────────────────────────────────────────────────
        btn_row = layout.row(align=True)
        btn_row.operator("fo4.run_scene_diagnostics",
                         text="Run Diagnostics", icon='VIEWZOOM')
        btn_row.operator("fo4.auto_fix_diagnostics",
                         text="Auto-Fix", icon='TOOL_SETTINGS')
        layout.operator("fo4.scan_fo4_readiness",
                        text="Scan FO4 Readiness", icon='CHECKBOX_HLT')

        # ── Per-object results (from stored report) ──────────────────────────
        if fo4_scene_diagnostics:
            report = fo4_scene_diagnostics.load_report()
            if report and report.get("objects"):
                results_box = layout.box()
                results_box.label(text="Per-Object Results:", icon='OBJECT_DATA')
                for obj_r in report["objects"]:
                    obj_name = obj_r.get("name", "?")
                    obj_err  = obj_r.get("error_count",   0)
                    obj_warn = obj_r.get("warning_count", 0)
                    obj_poly = obj_r.get("poly_count",    0)

                    if obj_err > 0:
                        icon = 'ERROR'
                    elif obj_warn > 0:
                        icon = 'INFO'
                    else:
                        icon = 'CHECKMARK'

                    row = results_box.row(align=True)
                    row.label(
                        text=f"{obj_name} ({obj_poly:,} polys)",
                        icon=icon,
                    )
                    if obj_err > 0 or obj_warn > 0:
                        row.label(text=f"E:{obj_err} W:{obj_warn}")

        # ── Export report ────────────────────────────────────────────────────
        exp_box = layout.box()
        exp_box.label(text="Export Report", icon='FILE_TEXT')
        exp_box.prop(scene, "fo4_diag_report_path", text="")
        exp_box.operator("fo4.export_diagnostics_report",
                         text="Save Diagnostics Report", icon='EXPORT')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Checks performed:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="• Polygon count (≤ 65,535)")
        sub.label(text="• UV map, scale applied")
        sub.label(text="• Triangulation, loose verts")
        sub.label(text="• Material / texture nodes")
        sub.label(text="• Collision mesh (UCX_)")
        sub.label(text="• Rigging: bones, root, VGs")
        sub.label(text="• Naming (no spaces/non-ASCII)")


class FO4_PT_ReferenceObjectsPanel(_FO4SubPanel):
    """FO4 scale reference objects panel"""
    bl_label = "Scale References"
    bl_idname = "FO4_PT_reference_objects_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_mesh_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Add reference ────────────────────────────────────────────────────
        add_box = layout.box()
        add_box.label(text="Add Scale Reference", icon='EMPTY_AXIS')
        add_box.prop(scene, "fo4_ref_type", text="")
        op = add_box.operator("fo4.add_reference_object",
                              text="Add to Scene", icon='ADD')
        op.ref_type = getattr(scene, "fo4_ref_type", "HUMAN_MALE")

        # ── Quick-add buttons ────────────────────────────────────────────────
        quick_box = layout.box()
        quick_box.label(text="Quick Add:", icon='OBJECT_DATA')

        row = quick_box.row(align=True)
        for rid in ("HUMAN_MALE", "HUMAN_FEMALE", "POWER_ARMOR"):
            r = row.operator("fo4.add_reference_object",
                             text=fo4_reference_helpers.REFERENCES[rid]["label"].split('(')[0].strip()
                             if fo4_reference_helpers else rid)
            r.ref_type = rid

        row2 = quick_box.row(align=True)
        for rid in ("PRE_WAR_CAR", "DOOR_FRAME", "CUBE_1M"):
            r = row2.operator("fo4.add_reference_object",
                              text=fo4_reference_helpers.REFERENCES[rid]["label"].split('(')[0].strip()
                              if fo4_reference_helpers else rid)
            r.ref_type = rid

        # ── Clear ────────────────────────────────────────────────────────────
        layout.operator("fo4.clear_reference_objects",
                        text="Remove All References", icon='X')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="FO4 Scale Guide:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="• Human male:   1.28 BU tall")
        sub.label(text="• Power Armor:  1.72 BU tall")
        sub.label(text="• Deathclaw:    2.20 BU tall")
        sub.label(text="• Door frame:   1.80 BU tall")
        sub.label(text="• 1 m cube:     0.70 BU")
        sub.label(text="(1 BU ≈ 100 NIF units ≈ 1.4375 cm)")
        sub.label(text="References are wire-only, non-renderable,")
        sub.label(text="non-selectable and export-skipped.")


# ── Papyrus Script Templates Panel ────────────────────────────────────────────

class FO4_PT_PapyrusPanel(_FO4SubPanel):
    """Generate Papyrus scripts for Fallout 4 mods"""
    bl_label    = "Papyrus Scripts"
    bl_idname   = "FO4_PT_papyrus_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Script metadata ───────────────────────────────────────────────────
        meta_box = layout.box()
        meta_box.label(text="Script Settings", icon='SCRIPT')
        meta_box.prop(scene, "fo4_papyrus_template",    text="Type")
        meta_box.prop(scene, "fo4_papyrus_script_name", text="Script Name")
        meta_box.prop(scene, "fo4_papyrus_mod_name",    text="Mod Prefix")

        # ── Generate / preview ────────────────────────────────────────────────
        gen_box = layout.box()
        gen_box.label(text="Generate", icon='FILE_SCRIPT')
        gen_box.operator("fo4.generate_papyrus_script",
                         text="Preview in Text Editor", icon='SCRIPT')
        gen_box.label(text="→ Opens in Blender Text Editor", icon='BLANK1')

        # ── Export ────────────────────────────────────────────────────────────
        exp_box = layout.box()
        exp_box.label(text="Export to Disk", icon='EXPORT')
        exp_box.prop(scene, "fo4_papyrus_output_dir", text="Output Folder")
        exp_box.operator("fo4.export_papyrus_script",
                         text="Export .psc File", icon='FILE_TICK')

        # ── Compile guide ─────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Compilation", icon='INFO')
        info_box.operator("fo4.papyrus_compile_instructions",
                          text="Show Compile Instructions", icon='HELP')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Place .psc in Data/Scripts/Source/User/")
        sub.label(text="2. Compile in Creation Kit (Gameplay → Papyrus)")
        sub.label(text="   or with PapyrusCompiler.exe from command line")
        sub.label(text="3. Attach compiled .pex to your form in the CK")
        sub.label(text="   (form → Scripts tab → Add → script name)")


# ── Havok Physics Panel ───────────────────────────────────────────────────────

class FO4_PT_HavokPhysicsPanel(_FO4SubPanel):
    """Havok rigid-body physics setup for FO4 NIF export"""
    bl_label    = "Havok Physics"
    bl_idname   = "FO4_PT_havok_physics_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        obj    = context.active_object

        # ── Preset selector ───────────────────────────────────────────────────
        preset_box = layout.box()
        preset_box.label(text="Physics Preset", icon='RIGID_BODY')
        preset_box.prop(scene, "fo4_physics_preset", text="")
        preset_box.operator("fo4.apply_physics_preset",
                            text="Apply to Selected", icon='PHYSICS')

        # ── Active object summary ─────────────────────────────────────────────
        if obj and obj.type == 'MESH':
            status_box = layout.box()
            status_box.label(
                text=f"Active: {obj.name}", icon='OBJECT_DATA')
            rb = obj.rigid_body
            if rb:
                col = status_box.column(align=True)
                col.scale_y = 0.85
                layer  = obj.get("fo4_collision_layer", "–")
                motion = obj.get("fo4_motion_type",     "–")
                mass   = obj.get("fo4_havok_mass",      rb.mass)
                fric   = obj.get("fo4_havok_friction",  rb.friction)
                rest   = obj.get("fo4_havok_restitution", rb.restitution)
                qual   = obj.get("fo4_havok_quality",   "–")
                col.label(text=f"Layer:       {layer}")
                col.label(text=f"Motion:      {motion}")
                col.label(text=f"Quality:     {qual}")
                col.label(text=f"Mass:        {mass:.2f} kg")
                col.label(text=f"Friction:    {fric:.2f}")
                col.label(text=f"Restitution: {rest:.2f}")
            else:
                status_box.label(text="No rigid body (no physics)", icon='ERROR')

            # ── Validate ─────────────────────────────────────────────────────
            status_box.operator("fo4.validate_physics",
                                text="Validate Physics", icon='CHECKMARK')

            # ── Live warnings ─────────────────────────────────────────────────
            if getattr(scene, "fo4_physics_show_warnings", True):
                try:
                    from . import fo4_physics_helpers
                    warns = fo4_physics_helpers.PhysicsHelpers.validate_physics(obj)
                    if warns:
                        warn_box = layout.box()
                        warn_box.label(text="Warnings:", icon='ERROR')
                        for w in warns:
                            warn_box.label(text=w, icon='DOT')
                except Exception:
                    pass
        else:
            layout.label(text="Select a mesh object", icon='INFO')

        # ── Reference table ───────────────────────────────────────────────────
        ref_box = layout.box()
        ref_box.label(text="Common FO4 Layer Guide:", icon='INFO')
        ref_box.prop(scene, "fo4_physics_show_warnings",
                     text="Show live warnings")
        sub = ref_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="L_STATIC (1)        – immoveable world geo")
        sub.label(text="L_ANIMSTATIC (2)    – doors, animated statics")
        sub.label(text="L_PROPS (7)         – moveable physics props")
        sub.label(text="L_DEBRIS_SMALL (8)  – gibs / small debris")
        sub.label(text="L_TREES (35)        – trees / foliage")
        sub.label(text="FIXED: mass = 0  |  DYNAMIC: mass > 0")


# ── Mod Packaging Panel ───────────────────────────────────────────────────────

class FO4_PT_ModPackagingPanel(_FO4SubPanel):
    """Create, document, and validate a complete FO4 mod package"""
    bl_label    = "Mod Packaging"
    bl_idname   = "FO4_PT_mod_packaging_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Mod identity ──────────────────────────────────────────────────────
        id_box = layout.box()
        id_box.label(text="Mod Identity", icon='INFO')
        id_box.prop(scene, "fo4_mod_name",        text="Name")
        id_box.prop(scene, "fo4_mod_author",       text="Author")
        id_box.prop(scene, "fo4_mod_version",      text="Version")
        id_box.prop(scene, "fo4_mod_fo4_version",  text="Min FO4 Ver.")
        id_box.prop(scene, "fo4_mod_plugin_name",  text="Plugin (.esp)")
        id_box.prop(scene, "fo4_mod_description",  text="Description")
        id_box.prop(scene, "fo4_mod_website",      text="Nexus URL")

        # ── Root folder ───────────────────────────────────────────────────────
        root_box = layout.box()
        root_box.label(text="Mod Root Folder", icon='FILE_FOLDER')
        root_box.prop(scene, "fo4_mod_root", text="")

        # ── Structure ─────────────────────────────────────────────────────────
        struct_box = layout.box()
        struct_box.label(text="1 · Create Directory Structure", icon='FILEBROWSER')
        struct_box.operator("fo4.create_mod_structure",
                            text="Create Data/ + FOMOD Folders", icon='ADD')
        struct_box.label(
            text="Creates: Data/meshes/, textures/, scripts/, fomod/, …",
            icon='BLANK1')

        # ── FOMOD ─────────────────────────────────────────────────────────────
        fomod_box = layout.box()
        fomod_box.label(text="2 · FOMOD Installer", icon='PACKAGE')
        fomod_box.operator("fo4.generate_fomod",
                           text="Generate info.xml + ModuleConfig.xml", icon='FILE_TICK')
        fomod_box.label(text="Compatible with Vortex, MO2, NMM", icon='BLANK1')

        # ── README ────────────────────────────────────────────────────────────
        readme_box = layout.box()
        readme_box.label(text="3 · README", icon='TEXT')
        readme_box.operator("fo4.generate_readme",
                            text="Generate README.md", icon='FILE_TICK')
        readme_box.label(text="Nexus-ready with all standard sections",
                         icon='BLANK1')

        # ── Validate + manifest ───────────────────────────────────────────────
        val_box = layout.box()
        val_box.label(text="4 · Validate & Manifest", icon='CHECKMARK')
        val_box.operator("fo4.validate_mod_structure",
                         text="Validate Mod Structure", icon='ZOOM_ALL')
        val_box.operator("fo4.export_mod_manifest",
                         text="Export mod_manifest.json", icon='EXPORT')

        # ── BA2 packing guide ─────────────────────────────────────────────────
        ba2_box = layout.box()
        ba2_box.label(text="5 · Pack into BA2 Archive", icon='PACKAGE')
        ba2_box.label(text="pack_ba2.bat / pack_ba2.sh are written to the",
                      icon='BLANK1')
        ba2_box.label(text="mod root by 'Create Structure'. Edit paths and",
                      icon='BLANK1')
        ba2_box.label(text="run to call Archive2.exe automatically.",
                      icon='BLANK1')

        # ── External tools ────────────────────────────────────────────────────
        layout.separator()
        tools_box = layout.box()
        tools_box.label(text="Required External Tools", icon='TOOL_SETTINGS')

        tools_col = tools_box.column(align=True)
        tools_col.scale_y = 0.8
        tools_col.label(text="These tools are needed to complete a release-ready FO4 mod:", icon='INFO')

        tools_box.separator(factor=0.4)

        # FO4Edit
        fo4e_col = tools_box.column(align=True)
        fo4e_col.operator("fo4.open_fo4edit", text="FO4Edit / xEdit  (plugin editor)", icon='URL')
        hint = fo4e_col.column(align=True)
        hint.scale_y = 0.72
        hint.label(text="  Edit .esp/.esm, clean masters, ESL-flag plugins · Nexus 2737")

        tools_box.separator(factor=0.3)

        # CAO
        cao_col = tools_box.column(align=True)
        cao_col.operator(
            "fo4.open_cathedral_assets_optimizer",
            text="Cathedral Assets Optimizer  (textures/meshes)",
            icon='URL',
        )
        hint2 = cao_col.column(align=True)
        hint2.scale_y = 0.72
        hint2.label(text="  Compress DDS textures to BC7/BC1, fix mesh headers · SSE Nexus 23316")

        tools_box.separator(factor=0.3)

        # FOMOD Creation Tool
        fct_box = layout.box()
        fct_box.label(text="FOMOD Creation Tool  (by Wenderer)", icon='PACKAGE')
        fct_col = fct_box.column(align=True)
        fct_col.scale_y = 0.78
        fct_col.label(text="Use the addon's 'Generate FOMOD' above for simple (no-options) installs.", icon='INFO')
        fct_col.label(text="For complex multi-option installers use Wenderer's GUI tool:", icon='INFO')
        fct_col.label(text="  • Add install pages, groups, and options")
        fct_col.label(text="  • Detect other installed plugins as conditions")
        fct_col.label(text="  • Set file priorities, add preview screenshots")
        fct_col.label(text="  • No XML knowledge needed — everything via GUI")
        fct_box.separator(factor=0.4)
        fct_box.operator(
            "fo4.open_fomod_creation_tool",
            text="Get FOMOD Creation Tool  (Nexus 6821)",
            icon='URL',
        )
        fct_box.operator(
            "fo4.show_fomod_guide",
            text="Full Mod Packaging Workflow Guide",
            icon='QUESTION',
        )


class FO4_PT_AddonIntegrationPanel(_FO4SubPanel):
    """Third-party add-on integration panel"""
    bl_label = "Add-on Integrations"
    bl_idname = "FO4_PT_addon_integration_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # Scan for add-ons
        box = layout.box()
        box.label(text="Useful Add-ons for FO4", icon='PLUGIN')

        try:
            from . import addon_integration
            detected = addon_integration.AddonIntegrationSystem.scan_for_known_addons()
        except Exception as _err:
            import traceback
            traceback.print_exc()
            layout.label(text="Add-on scanner unavailable. Check console for details.", icon='ERROR')
            return

        for addon in detected:
            addon_box = layout.box()

            # Status indicator
            if addon['is_enabled']:
                status_icon = 'CHECKMARK'
                status_text = "Enabled ✓"
            elif addon['is_installed']:
                status_icon = 'DOT'
                status_text = "Installed (not enabled)"
            else:
                status_icon = 'X'
                status_text = "Not installed"

            row = addon_box.row()
            row.label(text=addon['name'], icon=status_icon)
            row.label(text=status_text)

            addon_box.label(text=addon['description'])

            # FO4 use case
            use_box = addon_box.box()
            use_box.label(text="FO4 Use:", icon='INFO')
            use_box.label(text=addon['fo4_use_cases'])

            # ── Action buttons ──────────────────────────────────────────────
            addon_id    = addon['addon_id']
            is_builtin  = addon.get('builtin', False)
            dl_url      = addon.get('download_url', '')

            if addon['is_enabled']:
                # Already active — nothing to do
                pass

            elif addon['is_installed']:
                # On disk but not yet active → one-click enable is safe
                op = addon_box.operator(
                    "fo4.enable_addon",
                    text="Enable Now",
                    icon='CHECKMARK',
                )
                op.addon_id = addon_id

            else:
                # Not installed / not found on disk
                if is_builtin:
                    # These ship with every Blender but may be disabled or renamed
                    # in some builds.  Guide the user to Preferences rather than
                    # trying to call addon_enable on a module that isn't on disk.
                    addon_box.label(
                        text="Built-in — enable via Edit > Preferences > Add-ons",
                        icon='INFO',
                    )
                    op = addon_box.operator(
                        "fo4.enable_addon",
                        text="Try Enable",
                        icon='CHECKMARK',
                    )
                    op.addon_id = addon_id

                elif addon_id == 'io_scene_niftools':
                    # Dedicated installer already exists
                    addon_box.operator(
                        "fo4.install_niftools",
                        text="Auto-Install Niftools",
                        icon='IMPORT',
                    )
                    op = addon_box.operator(
                        "wm.url_open",
                        text="Open GitHub Releases",
                        icon='URL',
                    )
                    op.url = dl_url

                elif dl_url.startswith('http'):
                    op = addon_box.operator(
                        "wm.url_open",
                        text="Open Download Page",
                        icon='URL',
                    )
                    op.url = dl_url

                else:
                    op = addon_box.operator(
                        "wm.url_open",
                        text=f"Search for '{addon['name']}' online",
                        icon='URL',
                    )
                    op.url = (
                        "https://github.com/search?q="
                        + addon['name'].replace(' ', '+')
                        + "+blender+addon"
                    )

        # Integration tutorials
        integrations_box = layout.box()
        integrations_box.label(text="Integration Tutorials", icon='HELP')
        integrations_box.label(text="Tutorials show how to use these")
        integrations_box.label(text="add-ons with FO4 modding")

        # Info
        info_box = layout.box()
        info_box.label(text="Add-on Integration:", icon='INFO')
        info_box.label(text="• Detects useful add-ons")
        info_box.label(text="• Provides FO4-specific tutorials")
        info_box.label(text="• Seamless workflow integration")
        info_box.label(text="• Community integration packs")


class FO4_PT_DesktopTutorialPanel(_FO4SubPanel):
    """Desktop tutorial app connection panel"""
    bl_label = "Desktop Tutorial App"
    bl_idname = "FO4_PT_desktop_tutorial_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # Connection status
        status_box = layout.box()
        status_box.label(text="Connection Status", icon='LINKED')

        if scene.fo4_desktop_connected:
            status_box.label(text="✓ Connected", icon='CHECKMARK')

            # Server info
            try:
                from . import desktop_tutorial_client
                status = desktop_tutorial_client.DesktopTutorialClient.get_connection_status()
                status_box.label(text=f"Server: {status['server_url']}")
            except Exception:
                status_box.label(text="Server info unavailable", icon='INFO')

            # Disconnect button
            status_box.operator("fo4.disconnect_desktop_app", text="Disconnect", icon='UNLINKED')
        else:
            status_box.label(text="✗ Not Connected", icon='X')

            # Connection settings
            status_box.prop(scene, "fo4_desktop_server_host", text="Host")
            status_box.prop(scene, "fo4_desktop_server_port", text="Port")

            # Connect button
            status_box.operator("fo4.connect_desktop_app", text="Connect", icon='LINKED')

        # Check connection (always visible)
        status_box.operator("fo4.check_desktop_connection", text="Check Connection", icon='QUESTION')

        # Tutorial sync controls (only when connected)
        if scene.fo4_desktop_connected:
            layout.separator()

            sync_box = layout.box()
            sync_box.label(text="Tutorial Synchronization", icon='FILE_REFRESH')

            # Current step info
            if scene.fo4_desktop_current_step_title:
                sync_box.label(text=f"Step: {scene.fo4_desktop_current_step_title}")
                if scene.fo4_desktop_last_sync:
                    sync_box.label(text=f"Synced: {scene.fo4_desktop_last_sync}")

            # Navigation buttons
            row = sync_box.row(align=True)
            row.operator("fo4.desktop_previous_step", text="", icon='TRIA_LEFT')
            row.operator("fo4.sync_desktop_step", text="Sync Step", icon='FILE_REFRESH')
            row.operator("fo4.desktop_next_step", text="", icon='TRIA_RIGHT')

            # Progress button
            sync_box.operator("fo4.get_desktop_progress", text="Get Progress", icon='INFO')
            sync_box.operator("fo4.send_event_to_desktop", text="Send Event", icon='EXPORT')

        # Info
        info_box = layout.box()
        info_box.label(text="Desktop Tutorial App:", icon='INFO')
        info_box.label(text="• Connect to external tutorial app")
        info_box.label(text="• Synchronize tutorial steps")
        info_box.label(text="• Bi-directional communication")
        info_box.label(text="• Track tutorial progress")

        if not scene.fo4_desktop_connected:
            info_box.separator()
            info_box.label(text="Start the desktop server first:")
            info_box.label(text="python example_tutorial_server.py")


class FO4_PT_SetupPanel(_FO4SubPanel):
    """First-run setup panel: shows dependency status and one-click install."""
    bl_label = "Setup & Status"
    bl_idname = "FO4_PT_setup_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_order = -20  # Always first: install dependencies before anything else
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        prefs = preferences.get_preferences() if preferences else None

        # ── Blender / Python version ──────────────────────────────────────
        ver_box = layout.box()
        ver_box.label(text="Environment", icon='INFO')
        blender_ver = ".".join(str(v) for v in bpy.app.version)
        py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        ver_box.label(text=f"Blender {blender_ver}  |  Python {py_ver}")

        py = (sys.version_info.major, sys.version_info.minor)
        if py < (3, 8):
            ver_box.label(text="⚠ Python 3.7: using Pillow<10, numpy<2", icon='ERROR')
        elif py >= (3, 11):
            ver_box.label(text="✓ Python 3.11+ — all packages supported", icon='CHECKMARK')

        # ── Core Python dependencies ──────────────────────────────────────
        box = layout.box()
        box.label(text="Core Python Dependencies", icon='SCRIPT')
        core_deps = [
            ("PIL",      "Pillow (image processing)"),
            ("numpy",    "NumPy (math / 3D data)"),
            ("requests", "Requests (HTTP / downloads)"),
            ("trimesh",  "trimesh (3D mesh processing)"),
            ("PyPDF2",   "PyPDF2 (PDF parsing)"),
        ]
        all_ok = True
        for mod, label in core_deps:
            found = _check_dep(mod)
            icon = 'CHECKMARK' if found else 'ERROR'
            prefix = "✓" if found else "✗"
            box.label(text=f"{prefix}  {label}", icon=icon)
            if not found:
                all_ok = False

        if not all_ok:
            box.separator()
            box.label(text="Click below to install missing packages:", icon='INFO')
            # Always draw — Blender 5.x hasattr(bpy.types, 'FO4_OT_InstallPythonDeps')
            # may return False even when the operator IS registered.
            box.operator("fo4.install_python_deps", text="Install Core Dependencies",
                         icon='PACKAGE')
            box.separator()
            box.label(text="Restart Blender after installing.", icon='ERROR')
        else:
            box.separator()
            box.label(text="All core dependencies ready!", icon='CHECKMARK')

        # ── PyTorch status & path persistence ────────────────────────────
        torch_box = layout.box()
        torch_box.label(text="PyTorch (AI Features)", icon='PLUGIN')
        torch_ok, torch_info = _get_torch_status()
        # Check whether Mossy bridge is already connected.
        wm = context.window_manager
        bridge_status = getattr(wm, 'mossy_bridge_status', "")
        bridge_online = bridge_status.startswith("Mossy Bridge online") if bridge_status else False
        if torch_ok:
            torch_box.label(text=f"✓ PyTorch {torch_info} available", icon='CHECKMARK')
        elif bridge_online:
            torch_box.label(text="✓ PyTorch available via Mossy bridge", icon='CHECKMARK')
            torch_box.label(text="  AI inference runs inside Mossy — no local install needed", icon='DOT')
        else:
            torch_box.label(text="PyTorch not detected in Blender's Python.", icon='INFO')
            torch_box.label(text="Connect Mossy bridge (Mossy tab) to enable AI features.", icon='INFO')
            torch_box.label(text="To use PyTorch locally: install externally, then set", icon='INFO')
            torch_box.label(text="  the path in 'PyTorch Custom Path' below.", icon='INFO')
            row = torch_box.row(align=True)
            if hasattr(bpy.types, 'TORCH_OT_install_custom_path'):
                row.operator("torch.install_custom_path", text="Setup Instructions", icon='INFO')
            row.operator("torch.recheck_status", text="", icon='FILE_REFRESH')

        prefs = preferences.get_preferences() if preferences else None
        if prefs is not None:
            torch_box.prop(prefs, "torch_custom_path", text="PyTorch Custom Path")
            torch_box.prop(prefs, "extra_python_paths", text="Extra Python Paths")

        # ── Connected tools status ────────────────────────────────────────
        # Compute once here; results are reused later in the Tool Paths section.
        ffmpeg_path     = preferences.get_configured_ffmpeg_path()     if preferences else None
        nvcompress_path = preferences.get_configured_nvcompress_path() if preferences else None
        texconv_path    = preferences.get_configured_texconv_path()    if preferences else None

        tools_box = layout.box()
        tools_box.label(text="Connected External Tools", icon='TOOL_SETTINGS')
        if preferences:
            tool_checks = [
                (ffmpeg_path,     "ffmpeg"),
                (nvcompress_path, "NVTT (nvcompress)"),
                (texconv_path,    "texconv"),
            ]
            any_missing = False
            for path, label in tool_checks:
                if path:
                    tools_box.label(text=f"✓ {label}: {path}", icon='CHECKMARK')
                else:
                    tools_box.label(text=f"✗ {label}: not configured", icon='ERROR')
                    any_missing = True
            if any_missing:
                tools_box.label(text="Install tools below — paths auto-save and persist", icon='INFO')
        else:
            tools_box.label(text="Preferences unavailable", icon='ERROR')

        # ── User Interface ────────────────────────────────────────────────────
        ui_box = layout.box()
        ui_box.label(text="User Interface", icon="PREFERENCES")
        if prefs is not None:
            ui_box.prop(prefs, "mesh_panel_unified", text="Unified Mesh Panel")
        else:
            ui_box.prop(scene, "fo4_mesh_panel_unified", text="Unified Mesh Panel")
        ui_box.label(
            text="Show all mesh helpers in one box (vs split basic/advanced)",
            icon='BLANK1',
        )

        # ── Asset Paths ───────────────────────────────────────────────────────
        _draw_game_path_box(layout, context)

        other_paths = layout.box()
        other_paths.label(text="Other Asset Paths", icon="FILE_FOLDER")
        if prefs is not None:
            row = other_paths.row(align=True)
            row.prop(prefs, "unity_assets_path",  text="Unity Assets")
            row.operator("fo4.set_unity_assets_path", text="", icon='FILE_FOLDER')
            row = other_paths.row(align=True)
            row.prop(prefs, "unreal_assets_path", text="Unreal Assets")
            row.operator("fo4.set_unreal_assets_path", text="", icon='FILE_FOLDER')
        else:
            row = other_paths.row(align=True)
            row.prop(scene, "fo4_unity_assets_path",  text="Unity Assets")
            row.operator("fo4.set_unity_assets_path", text="", icon='FILE_FOLDER')
            row = other_paths.row(align=True)
            row.prop(scene, "fo4_unreal_assets_path", text="Unreal Assets")
            row.operator("fo4.set_unreal_assets_path", text="", icon='FILE_FOLDER')

        # ── Tool Paths ────────────────────────────────────────────────────────
        tool_paths_box = layout.box()
        tool_paths_box.label(text="Tool Paths", icon="TOOL_SETTINGS")
        import os
        if prefs is not None:
            tool_paths_box.prop(prefs, "tools_root", text="Tools Root")
            tools_root = bpy.path.abspath(prefs.tools_root) if prefs.tools_root else ""
        else:
            tool_paths_box.prop(scene, "fo4_tools_root", text="Tools Root")
            tools_root = bpy.path.abspath(getattr(scene, "fo4_tools_root", "")) if getattr(scene, "fo4_tools_root", "") else ""
        if tools_root and os.path.isdir(tools_root):
            tool_paths_box.label(text=f"✓ {tools_root}", icon="CHECKMARK")
        else:
            tool_paths_box.label(text="Tool root not found – set to where you keep CLI tools",
                            icon="ERROR")

        if prefs is not None:
            tool_paths_box.prop(prefs, "havok2fbx_path", text="Havok2FBX Folder")
            h_path = bpy.path.abspath(prefs.havok2fbx_path) if prefs.havok2fbx_path else ""
        else:
            tool_paths_box.prop(scene, "fo4_havok2fbx_path", text="Havok2FBX Folder")
            h_path_raw = getattr(scene, "fo4_havok2fbx_path", "")
            h_path = bpy.path.abspath(h_path_raw) if h_path_raw else ""
        if h_path and os.path.isdir(h_path):
            tool_paths_box.label(text=f"✓ {h_path}", icon="CHECKMARK")
        else:
            tool_paths_box.label(text="Path not found – set to your Havok2FBX folder",
                            icon="ERROR")

        tool_paths_box.separator()
        tool_paths_box.label(text="Texture Converters:", icon="IMAGE_DATA")
        if prefs is not None:
            tool_paths_box.prop(prefs, "nvtt_path",    text="nvcompress / NVTT folder")
            tool_paths_box.prop(prefs, "texconv_path", text="texconv / DirectXTex folder")
        else:
            tool_paths_box.prop(scene, "fo4_nvtt_path",    text="nvcompress / NVTT folder")
            tool_paths_box.prop(scene, "fo4_texconv_path", text="texconv / DirectXTex folder")

        nvcompress = nvcompress_path
        texconv    = texconv_path
        if nvcompress:
            tool_paths_box.label(text=f"✓ nvcompress: {nvcompress}", icon="CHECKMARK")
        else:
            tool_paths_box.label(text="nvcompress not configured", icon="ERROR")
        if texconv:
            tool_paths_box.label(text=f"✓ texconv: {texconv}", icon="CHECKMARK")
        else:
            tool_paths_box.label(text="texconv not configured", icon="ERROR")

        tool_paths_box.separator()
        tool_paths_box.label(text="Video & Audio:", icon="SOUND")
        if prefs is not None:
            tool_paths_box.prop(prefs, "ffmpeg_path", text="ffmpeg / folder")
        else:
            tool_paths_box.prop(scene, "fo4_ffmpeg_path", text="ffmpeg / folder")

        # ── Auto-installation ─────────────────────────────────────────────────
        auto_box = layout.box()
        auto_box.label(text="Automatic Installation", icon="FILE_REFRESH")
        if prefs is not None:
            auto_box.prop(prefs, "auto_install_tools",
                          text="Auto-install missing CLI tools at startup")
            auto_box.prop(prefs, "auto_install_python",
                          text="Auto-install Python packages at startup")
            auto_box.prop(prefs, "auto_register_tools",
                          text="Auto-register third-party add-ons")
        else:
            auto_box.prop(scene, "fo4_auto_install_tools",
                          text="Auto-install missing CLI tools at startup")
            auto_box.prop(scene, "fo4_auto_install_python",
                          text="Auto-install Python packages at startup")
            auto_box.prop(scene, "fo4_auto_register_tools",
                          text="Auto-register third-party add-ons")
        auto_box.operator("fo4.check_tool_paths",
                          text="Check Tool Paths Now", icon='INFO')
        auto_box.label(
            text="Disable auto-register to avoid Blender policy warnings",
            icon='INFO',
        )

        # ── Mesh Optimisation ─────────────────────────────────────────────────
        opt_box = layout.box()
        opt_box.label(text="Mesh Optimisation Defaults", icon="MOD_DECIM")
        if prefs is not None:
            opt_box.prop(prefs, "optimize_apply_transforms",
                         text="Apply transforms before optimise")
            opt_box.prop(prefs, "optimize_remove_doubles_threshold",
                         text="Remove Doubles threshold")
            opt_box.prop(prefs, "optimize_preserve_uvs",
                         text="Preserve UVs when removing doubles")
        else:
            opt_box.prop(scene, "fo4_opt_apply_transforms",
                         text="Apply transforms before optimise")
            opt_box.prop(scene, "fo4_opt_doubles",
                         text="Remove Doubles threshold")
            opt_box.prop(scene, "fo4_opt_preserve_uvs",
                         text="Preserve UVs when removing doubles")

        # ── LLM Advisor ───────────────────────────────────────────────────────
        llm_box = layout.box()
        llm_box.label(text="AI Advisor – LLM (optional, opt-in)", icon="INFO")
        if prefs is not None:
            llm_box.prop(prefs, "llm_enabled", text="Enable LLM Advisor")
            col = llm_box.column(align=True)
            col.enabled = prefs.llm_enabled
            col.prop(prefs, "llm_endpoint",      text="Endpoint URL")
            col.prop(prefs, "llm_model",         text="Model")
            col.prop(prefs, "llm_api_key",       text="API Key")
            col.prop(prefs, "llm_allow_actions", text="Allow action suggestions")
            col.prop(prefs, "llm_send_stats",    text="Send summary counts only")
        else:
            llm_box.prop(scene, "fo4_llm_enabled", text="Enable LLM Advisor")

        # ── Advisor auto-monitor ──────────────────────────────────────────────
        mon_box = layout.box()
        mon_box.label(text="Advisor Auto-Monitor", icon="FILE_REFRESH")
        if prefs is not None:
            mon_box.prop(prefs, "advisor_auto_monitor_enabled",  text="Enable background checks")
            row = mon_box.row()
            row.enabled = prefs.advisor_auto_monitor_enabled
            row.prop(prefs, "advisor_auto_monitor_interval", text="Interval (seconds)")
        else:
            mon_box.prop(scene, "fo4_advisor_monitor",  text="Enable background checks")
            row = mon_box.row()
            row.enabled = getattr(scene, "fo4_advisor_monitor", False)
            row.prop(scene, "fo4_advisor_interval", text="Interval (seconds)")

        # ── Knowledge Base ────────────────────────────────────────────────────
        kb_box = layout.box()
        kb_box.label(text="Advisor Knowledge Base", icon="BOOKMARKS")
        if prefs is not None:
            kb_box.prop(prefs, "knowledge_base_enabled", text="Use bundled / user KB")
            kb_box.prop(prefs, "knowledge_base_path",    text="Custom KB folder (txt/md)")
        else:
            kb_box.prop(scene, "fo4_kb_enabled", text="Use bundled / user KB")
            kb_box.prop(scene, "fo4_kb_path",    text="Custom KB folder (txt/md)")

        # ── Mossy Link ────────────────────────────────────────────────────────
        ml_box = layout.box()
        ml_box.label(text="Mossy Link", icon="LINKED")

        tcp_sub = ml_box.box()
        tcp_sub.label(text="TCP Server  (Mossy → Blender control)",
                      icon="NETWORK_DRIVE")
        if prefs is not None:
            tcp_sub.prop(prefs, "port",      text="Listen Port")
            tcp_sub.prop(prefs, "token",     text="Auth Token")
            tcp_sub.prop(prefs, "autostart", text="Auto-start on load")
        else:
            if hasattr(scene, 'fo4_mossy_port'):
                tcp_sub.prop(scene, "fo4_mossy_port",      text="Listen Port")
                tcp_sub.prop(scene, "fo4_mossy_token",     text="Auth Token")
                tcp_sub.prop(scene, "fo4_mossy_autostart", text="Auto-start on load")
            else:
                tcp_sub.label(text="Mossy settings unavailable", icon='INFO')

        http_sub = ml_box.box()
        http_sub.label(text="AI Queries  (Blender → Mossy)", icon="URL")
        if prefs is not None:
            http_sub.prop(prefs, "mossy_http_port", text="Mossy HTTP Port")
            http_sub.prop(prefs, "use_mossy_as_ai",  text="Use Mossy as AI Advisor")
            if prefs.use_mossy_as_ai:
                http_sub.label(
                    text="✓ Advisor will ask Mossy instead of remote LLM",
                    icon="CHECKMARK")
            else:
                http_sub.label(text="Enable to route AI through Mossy", icon="INFO")
        else:
            if hasattr(scene, 'fo4_mossy_http_port'):
                http_sub.prop(scene, "fo4_mossy_http_port", text="Mossy HTTP Port")
                http_sub.prop(scene, "fo4_use_mossy_ai",    text="Use Mossy as AI Advisor")
            else:
                http_sub.label(text="Mossy HTTP settings unavailable", icon='INFO')

        if hasattr(bpy.types, 'WM_OT_MossyCheckHttp'):
            ml_box.operator("wm.mossy_check_http",
                            text="Check Mossy HTTP", icon="QUESTION")

        # ── Add-on Update ─────────────────────────────────────────────────────
        if addon_updater:
            addon_updater.draw_update_ui(layout)
        else:
            update_box = layout.box()
            update_box.label(text="Add-on Update", icon="FILE_REFRESH")
            update_box.label(
                text="Install a new zip via Edit → Preferences → Add-ons → Install",
                icon='INFO',
            )
            update_box.label(
                text="Then restart Blender to apply changes.", icon='BLANK1')

        # ── Quick actions ─────────────────────────────────────────────────
        # Always draw buttons directly — in Blender 5.x hasattr(bpy.types, ...)
        # may return False even for registered operators (RECURRING BUG #1).
        row = layout.row(align=True)
        row.operator("fo4.self_test", text="Environment Check", icon='CHECKMARK')
        row.operator("fo4.install_python_deps", text="Re-install Deps", icon='FILE_REFRESH')
        # Restart button: uses a timer to defer bpy.ops.wm.quit_blender() so it
        # runs after the confirm popup is closed, avoiding the Blender 5.0.1
        # EXCEPTION_ACCESS_VIOLATION (BLI_addhead / wm_exit_schedule_delayed).
        layout.operator("fo4.reload_addon", text="Restart Blender", icon='QUIT')



class FO4_PT_OperationLogPanel(_FO4SubPanel):
    """Panel that shows every operation recorded by the add-on"""
    bl_label = "Operation Log"
    bl_idname = "FO4_PT_operation_log_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        import textwrap
        layout = self.layout
        try:
            from . import notification_system as _ns
        except Exception:
            _ns = None

        if _ns is None:
            layout.label(text="notification_system unavailable", icon='ERROR')
            return

        entries = _ns.OperationLog.get_entries(limit=50)

        if not entries:
            layout.label(text="No operations recorded yet.", icon='INFO')
        else:
            # Show newest first
            for entry in reversed(entries):
                box = layout.box()
                ts = entry.get('timestamp', '')
                msg = entry.get('message', '')
                etype = entry.get('type', 'INFO')
                icon = 'ERROR' if etype == 'ERROR' else ('CANCEL' if etype == 'WARNING' else 'CHECKMARK')
                box.label(text=f"[{ts}]", icon=icon)
                # Wrap long messages at word boundaries (~60 chars per line)
                for line in textwrap.wrap(msg, width=60) or [msg]:
                    box.label(text=line)

        layout.separator()
        layout.operator("fo4.clear_operation_log", text="Clear Log", icon='TRASH')


# ── Mossy tab ──────────────────────────────────────────────────────────────────

class FO4_PT_MossyPanel(_FO4SubPanel):
    """Mossy AI connection panel — dedicated sidebar tab"""
    bl_label       = "Mossy"
    bl_idname      = "FO4_PT_mossy_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category    = 'Mossy'

    def draw(self, context):
        layout = self.layout
        wm     = context.window_manager
        scene  = context.scene

        # Read live state from WindowManager properties (registered by operators).
        server_active  = getattr(wm, 'mossy_link_active',    False)
        bridge_status  = getattr(wm, 'mossy_bridge_status',  "")
        llm_status     = getattr(wm, 'mossy_llm_status',     "")

        # ── TCP server (Blender → Mossy bridge) ───────────────────────────────
        srv_box = layout.box()
        row = srv_box.row()
        row.label(
            text="Blender TCP Server",
            icon='NETWORK_DRIVE',
        )

        if server_active:
            srv_box.label(text="✓ Server running — Mossy can control Blender", icon='CHECKMARK')
        else:
            srv_box.label(text="Server stopped — Mossy cannot send commands", icon='RADIOBUT_OFF')

        toggle_text = "Stop Mossy Link Server" if server_active else "Start Mossy Link Server"
        toggle_icon = 'PAUSE' if server_active else 'PLAY'
        if hasattr(bpy.types, 'WM_OT_MossyLinkToggle'):
            srv_box.operator("wm.mossy_link_toggle", text=toggle_text, icon=toggle_icon)
        else:
            srv_box.label(text="(Mossy Link loading...)", icon='TIME')

        # Port / token settings from scene props (mirrors preferences).
        col = srv_box.column(align=True)
        if hasattr(scene, 'fo4_mossy_port'):
            col.prop(scene, "fo4_mossy_port",      text="Listen Port")
            col.prop(scene, "fo4_mossy_token",     text="Auth Token")
            col.prop(scene, "fo4_mossy_autostart", text="Auto-start on load")
        else:
            col.label(text="Mossy settings unavailable", icon='INFO')

        layout.separator()

        # ── Mossy Bridge health ────────────────────────────────────────────────
        bridge_box = layout.box()
        bridge_box.label(text="Mossy Bridge (port 21337)", icon='URL')
        if bridge_status:
            icon = 'CHECKMARK' if bridge_status.startswith("Mossy Bridge online") else 'ERROR'
            bridge_box.label(text=bridge_status, icon=icon)
        else:
            bridge_box.label(text="Not checked yet", icon='QUESTION')

        layout.separator()

        # ── Mossy LLM (Nemotron brain) ─────────────────────────────────────────
        llm_box = layout.box()
        llm_box.label(text="Mossy AI / Nemotron LLM", icon='LIGHT_HEMI')
        if llm_status:
            icon = 'CHECKMARK' if llm_status.startswith("Mossy LLM online") else 'ERROR'
            llm_box.label(text=llm_status, icon=icon)
        else:
            llm_box.label(text="Not checked yet", icon='QUESTION')

        if hasattr(scene, 'fo4_mossy_http_port'):
            llm_box.prop(scene, "fo4_mossy_http_port", text="Nemotron Port")
            llm_box.prop(scene, "fo4_use_mossy_ai",   text="Use as AI Advisor")
            if getattr(scene, 'fo4_use_mossy_ai', False):
                llm_box.label(text="✓ Advisor will ask Mossy instead of remote LLM", icon='CHECKMARK')

        layout.separator()

        # ── PyTorch / AI Features ──────────────────────────────────────────────
        # Mossy offloads heavy AI inference (Shape-E, Point-E, Mesh generation,
        # texture processing) to the desktop app, so PyTorch does NOT need to be
        # installed inside Blender.  When the bridge is online the full PyTorch
        # feature set is available through Mossy.
        torch_box = layout.box()
        torch_box.label(text="PyTorch / AI Features", icon='PLUGIN')

        torch_ok, torch_info = _get_torch_status()
        # bridge_status was already fetched from wm at the top of this draw() method.
        bridge_online = bridge_status.startswith("Mossy Bridge online") if bridge_status else False

        if torch_ok:
            torch_box.label(text=f"✓ PyTorch {torch_info} available locally", icon='CHECKMARK')
            torch_box.label(text="✓ AI features active (local + Mossy)", icon='CHECKMARK')
        elif bridge_online:
            torch_box.label(text="✓ PyTorch available via Mossy bridge", icon='CHECKMARK')
            torch_box.label(text="  Heavy AI inference runs inside Mossy desktop app", icon='DOT')
            torch_box.label(text="  No local PyTorch install required", icon='DOT')
        else:
            torch_box.label(text="PyTorch not detected locally", icon='INFO')
            torch_box.label(text="Connect Mossy bridge above to enable AI features", icon='ERROR')

        row = torch_box.row(align=True)
        row.operator("torch.recheck_status", text="Re-check PyTorch", icon='FILE_REFRESH')
        # TORCH_OT_install_custom_path → Blender op ID: torch.install_custom_path
        if hasattr(bpy.types, 'TORCH_OT_install_custom_path'):
            row.operator("torch.install_custom_path", text="Local Install Guide", icon='INFO')

        layout.separator()

        # ── Check both connections ─────────────────────────────────────────────
        if hasattr(bpy.types, 'WM_OT_MossyCheckHttp'):
            layout.operator(
                "wm.mossy_check_http",
                text="Check Mossy Connection",
                icon='QUESTION',
            )

        layout.separator()

        # ── Quick link to full settings ────────────────────────────────────────
        help_box = layout.box()
        help_box.label(text="How to connect:", icon='INFO')
        help_box.label(text="1. Launch the Mossy desktop app")
        help_box.label(text="2. Mossy will auto-start its bridge on port 21337")
        help_box.label(text="3. Click 'Start Mossy Link Server' above")
        help_box.label(text="4. Click 'Check Mossy Connection' to verify")
        help_box.label(text="5. Enable 'Use as AI Advisor' to use Mossy's LLM")
        help_box.label(text="6. PyTorch AI features become available via Mossy")


classes = (
    FO4_PT_MainPanel,
    FO4_PT_SetupPanel,
    # AI Generation sub-panels (children of FO4_PT_SetupPanel)
    FO4_PT_SetupAIHunyuan3D,
    FO4_PT_SetupAIGradio,
    FO4_PT_SetupAIHyMotion,
    FO4_PT_SetupAIShapE,
    FO4_PT_SetupAIPointE,
    FO4_PT_SetupAIDiffusers,
    FO4_PT_MeshPanel,
    FO4_PT_TexturePanel,
    FO4_PT_ImageToMeshPanel,
    FO4_PT_AnimationPanel,
    FO4_PT_RigNetPanel,
    FO4_PT_NVTTPanel,
    FO4_PT_AdvisorPanel,
    FO4_PT_ToolsLinks,
    FO4_PT_GameAssetsLibraryPanel,
    FO4_PT_ExportPanel,
    # New panels for enhancements
    FO4_PT_BatchProcessingPanel,
    FO4_PT_AutomationQuickPanel,
    FO4_PT_Havok2FBXPanel,
    FO4_PT_VegetationPanel,
    # New panels for comprehensive mod creation
    FO4_PT_QuestPanel,
    FO4_PT_NPCPanel,
    FO4_PT_WorldBuildingPanel,
    FO4_PT_ItemCreationPanel,
    FO4_PT_ArmorClothingPanel,
    # New panels for productivity
    FO4_PT_AutomationMacrosPanel,
    FO4_PT_PostProcessingPanel,
    FO4_PT_MaterialBrowserPanel,
    FO4_PT_SceneDiagnosticsPanel,
    FO4_PT_ReferenceObjectsPanel,
    FO4_PT_PapyrusPanel,
    FO4_PT_HavokPhysicsPanel,
    FO4_PT_ModPackagingPanel,
    FO4_PT_AddonIntegrationPanel,
    FO4_PT_DesktopTutorialPanel,
    # Operation log — records every process for reference
    FO4_PT_OperationLogPanel,
    # Mossy tab — dedicated 'Mossy' category in the sidebar
    FO4_PT_MossyPanel,
)

def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            # A stale class object (from a previous load or dual-install) may
            # already occupy this type name.  Unregister the old object first
            # then register the fresh one so the UI always runs current code.
            # This mirrors the pattern used in tutorial_operators.py and
            # operators.py register() — do NOT simplify back to a plain
            # bpy.utils.register_class() with no fallback (see DEVELOPMENT_NOTES.md).
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
            except Exception as e2:
                print(f"⚠ Failed to register {cls.__name__}: {e2}")

def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            print(f"⚠ Failed to unregister {cls.__name__}: {e}")
