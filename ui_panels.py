"""
UI Panels — Fallout 4 Mod Assistant (Piece 1: Mesh Tools)
Target: Blender 5.x (Extension format)

Panels in this file:
  FO4_PT_MainPanel   — Top-level "Fallout 4" N-panel tab header
  FO4_PT_MeshPanel   — Mesh Tools sub-panel (core FO4 mesh workflow)
  FO4_PT_SetupPanel  — Setup & Status sub-panel (install deps, env check)

Rebuild roadmap (panels added per piece):
  Piece 1 ✓  Main + Mesh + Setup  (Blender 5)
  Piece 2    Export (NIF v25 via PyNifly)
  Piece 3    Textures / DDS
  Piece 4    Animation / Rigging
  Piece 5    Advanced tools

Design rules:
  • Every operator button is guarded with hasattr(bpy.types, 'FO4_OT_...')
    so a missing registration degrades to a static label instead of flooding
    the Blender console with 'rna_uiItemO: unknown operator' errors.
  • Sub-panels inherit space/region/category from _FO4Panel.
  • bl_parent_id on sub-panels must exactly match FO4_PT_MainPanel.bl_idname.
"""

import bpy
import sys
from bpy.types import Panel


def _addon_version_str() -> str:
    """Return the add-on version string (e.g. '5.1.0') from bl_info.

    Reads bl_info from the package's __init__ module so this file never
    needs its own hardcoded version constant — updating __init__.py is enough.
    """
    pkg = sys.modules.get(__package__, None)
    bl = getattr(pkg, "bl_info", {}) if pkg else {}
    v = bl.get("version", ())
    return ".".join(str(n) for n in v) if v else "?"


# ─────────────────────────────────────────────────────────────────────────────
# Shared base — all sub-panels inherit these class attributes
# ─────────────────────────────────────────────────────────────────────────────

class _FO4Panel(Panel):
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category    = 'Fallout 4'

    # _FO4Panel itself is never registered — it has no bl_idname / bl_label.
    # Subclasses define those.


# ─────────────────────────────────────────────────────────────────────────────
# Helper: operator button with graceful fallback
# ─────────────────────────────────────────────────────────────────────────────

def _op_or_label(layout, cls_name, idname, text, icon='NONE'):
    """Draw an operator button if the class is registered, else a static label.

    This prevents 'rna_uiItemO: unknown operator' console spam if a module
    failed to load on a particular Blender build.
    """
    if hasattr(bpy.types, cls_name):
        layout.operator(idname, text=text, icon=icon)
    else:
        layout.label(text=f"({text} loading…)", icon='TIME')


# ─────────────────────────────────────────────────────────────────────────────
# Main Panel  (top-level N-panel)
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_MainPanel(_FO4Panel):
    """Fallout 4 Mod Assistant — top-level N-panel."""
    bl_idname = "FO4_PT_main_panel"
    bl_label  = "Fallout 4 Mod Assistant"

    def draw(self, context):
        layout = self.layout

        # Header info row
        col = layout.column(align=True)
        col.label(text=f"FO4 Mod Assistant  v{_addon_version_str()}", icon='TOOL_SETTINGS')
        col.label(
            text="NIF v25  ·  PyNifly  ·  Blender " + bpy.app.version_string,
            icon='INFO',
        )

        layout.separator()

        # Getting Started box
        box = layout.box()
        box.label(text="Getting Started", icon='HELP')
        col = box.column(align=True)
        _op_or_label(col, 'FO4_OT_ShowDetailedSetup',
                     'fo4.show_detailed_setup', 'Setup Guide',   'PREFERENCES')
        _op_or_label(col, 'FO4_OT_StartTutorial',
                     'fo4.start_tutorial',       'Start Tutorial', 'PLAY')
        _op_or_label(col, 'FO4_OT_ShowHelp',
                     'fo4.show_help',             'Help & Tips',   'QUESTION')
        _op_or_label(col, 'FO4_OT_ShowCredits',
                     'fo4.show_credits',          'Credits',       'FUND')


# ─────────────────────────────────────────────────────────────────────────────
# Mesh Tools Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_MeshPanel(_FO4Panel):
    """Mesh preparation tools for Fallout 4 NIF v25 export."""
    bl_idname    = "FO4_PT_mesh_panel"
    bl_label     = "Mesh Tools"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        obj    = context.active_object
        is_mesh = obj is not None and obj.type == 'MESH'

        # ── Active mesh summary ───────────────────────────────────────────────
        if is_mesh:
            mesh = obj.data
            verts    = len(mesh.vertices)
            polys    = len(mesh.polygons)
            has_uv   = bool(mesh.uv_layers)
            tri_est  = sum(max(1, len(p.vertices) - 2) for p in mesh.polygons)
            over_lim = tri_est > 65535 or verts > 65535

            box = layout.box()
            box.label(
                text=f"{obj.name}   {verts:,} verts  ·  {polys:,} polys",
                icon='MESH_DATA',
            )
            row = box.row(align=True)
            row.label(
                text=f"~{tri_est:,} tris",
                icon='ERROR' if tri_est > 65535 else 'CHECKMARK',
            )
            row.label(
                text="UV ✓" if has_uv else "⚠ no UV map!",
                icon='ERROR' if not has_uv else 'UV',
            )
            if over_lim:
                box.label(
                    text="Over BSTriShape 65,535 limit — split the mesh!",
                    icon='ERROR',
                )
        else:
            layout.label(text="Select a mesh object to see info", icon='INFO')

        layout.separator()

        # ── Create ────────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="Create", icon='ADD')
        col.operator("fo4.create_base_mesh",
                     text="New FO4 Base Mesh", icon='MESH_CUBE')

        layout.separator()

        # ── Prepare / Validate ────────────────────────────────────────────────
        col = layout.column(align=True)
        col.enabled = is_mesh
        col.label(text="Prepare for Export", icon='EXPORT')
        col.operator("fo4.optimize_mesh",
                     text="Prep Mesh for FO4  (triangulate / normals / scale)",
                     icon='CHECKMARK')
        col.operator("fo4.validate_mesh",
                     text="Validate against NIF v25 Limits",
                     icon='VIEWZOOM')

        layout.separator()

        # ── Collision ─────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.enabled = is_mesh
        col.label(text="Collision  (Havok / UCX_)", icon='PHYSICS')
        col.operator("fo4.generate_collision",
                     text="Generate UCX_ Collision Mesh",
                     icon='MOD_PHYSICS')
        if is_mesh and hasattr(obj, 'fo4_collision_type'):
            row = layout.row(align=True)
            row.label(text="Type:", icon='PHYSICS')
            row.prop(obj, "fo4_collision_type", text="")

        layout.separator()

        # ── NIF v25 mesh classification ───────────────────────────────────────
        col = layout.column(align=True)
        col.enabled = is_mesh
        col.label(text="NIF Classification", icon='OBJECT_DATA')
        col.operator("fo4.set_mesh_type",
                     text="Set Mesh Type",
                     icon='PROPERTIES')
        if is_mesh and hasattr(obj, 'fo4_mesh_type'):
            col.prop(obj, "fo4_mesh_type", text="")

        layout.separator()

        # ── Quick reference box ───────────────────────────────────────────────
        box = layout.box()
        box.label(text="NIF v25 BSTriShape Limits", icon='INFO')
        col = box.column(align=True)
        col.scale_y = 0.82
        col.label(text="• Max vertices  : 65,535  (16-bit index)")
        col.label(text="• Max triangles : 65,535")
        col.label(text="• UV map        : required (1 channel)")
        col.label(text="• Apply transforms before export  (Ctrl+A)")
        col.label(text="• Collision     : UCX_<name>  (convex hull)")
        col.label(text="• Exporter      : PyNifly v25  (BadDog)")


# ─────────────────────────────────────────────────────────────────────────────
# Setup & Status Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_SetupPanel(_FO4Panel):
    """Install dependencies, run environment check, reload the add-on."""
    bl_idname    = "FO4_PT_setup_panel"
    bl_label     = "Setup & Status"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        _op_or_label(col, 'FO4_OT_InstallPythonDeps',
                     'fo4.install_python_deps',
                     'Install Core Dependencies', 'IMPORT')
        _op_or_label(col, 'FO4_OT_SelfTest',
                     'fo4.self_test',
                     'Environment Check',         'CHECKMARK')
        _op_or_label(col, 'FO4_OT_ReloadAddon',
                     'fo4.reload_addon',
                     'Restart / Reload Add-on',   'FILE_REFRESH')


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

classes = (
    FO4_PT_MainPanel,
    FO4_PT_MeshPanel,
    FO4_PT_SetupPanel,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            existing = getattr(bpy.types, cls.__name__, None)
            if existing:
                bpy.utils.unregister_class(existing)
            bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
