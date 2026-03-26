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
# Mesh Settings Panel  (shows optimize preferences inline)
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_MeshSettingsPanel(_FO4Panel):
    """Mesh optimization settings — controls used by Prep Mesh for FO4."""
    bl_idname    = "FO4_PT_mesh_settings_panel"
    bl_label     = "Mesh Settings"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        prefs = None
        try:
            addon = context.preferences.addons.get(__package__ or "")
            if addon:
                prefs = addon.preferences
        except Exception:
            pass

        if prefs is None:
            layout.label(text="Preferences not available", icon='ERROR')
            return

        box = layout.box()
        box.label(text="Optimize (Prep Mesh for FO4)", icon='MODIFIER')
        col = box.column(align=True)
        col.prop(prefs, "optimize_apply_transforms")
        col.prop(prefs, "optimize_preserve_uvs")
        row = col.row(align=True)
        row.prop(prefs, "optimize_remove_doubles_threshold")


# ─────────────────────────────────────────────────────────────────────────────
# Advanced Mesh Tools Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_AdvancedMeshPanel(_FO4Panel):
    """Advanced mesh analysis, repair, reduction, and smoothing tools."""
    bl_idname    = "FO4_PT_advanced_mesh_panel"
    bl_label     = "Advanced Mesh Tools"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        is_mesh = (context.active_object is not None
                   and context.active_object.type == 'MESH')

        # ── Analysis ─────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="Analysis", icon='VIEWZOOM')
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_AnalyzeMeshQuality',
                     'fo4.analyze_mesh_quality',
                     'Analyze Mesh Quality', 'VIEWZOOM')
        _op_or_label(col, 'FO4_OT_AutoRepairMesh',
                     'fo4.auto_repair_mesh',
                     'Auto Repair Mesh Issues', 'TOOL_SETTINGS')

        layout.separator()

        # ── Reduction ────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="Polygon Reduction", icon='MOD_DECIM')
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_SmartDecimate',
                     'fo4.smart_decimate',
                     'Smart Decimate (reduce polys)', 'MOD_DECIM')
        _op_or_label(col, 'FO4_OT_SplitMeshAtLimit',
                     'fo4.split_mesh_at_limit',
                     'Split Mesh at 65k Limit', 'MOD_EXPLODE')
        _op_or_label(col, 'FO4_OT_RemeshUniform',
                     'fo4.remesh_uniform',
                     'Remesh Uniform (Voxel)', 'MOD_REMESH')

        layout.separator()

        # ── Smoothing ────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="Smoothing", icon='MOD_SMOOTH')
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_SmoothMesh',
                     'fo4.smooth_mesh',
                     'Smooth Mesh (Laplacian)', 'MOD_SMOOTH')


# ─────────────────────────────────────────────────────────────────────────────
# Symmetry & Mirror Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_SymmetryPanel(_FO4Panel):
    """Symmetry check and mirror tools for armour / prop meshes."""
    bl_idname    = "FO4_PT_symmetry_panel"
    bl_label     = "Symmetry & Mirror"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        is_mesh = (context.active_object is not None
                   and context.active_object.type == 'MESH')
        col = layout.column(align=True)
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_CheckSymmetry',
                     'fo4.check_symmetry',
                     'Check Symmetry', 'ARROW_LEFTRIGHT')
        _op_or_label(col, 'FO4_OT_MirrorMesh',
                     'fo4.mirror_mesh',
                     'Mirror Mesh (apply modifier)', 'MOD_MIRROR')


# ─────────────────────────────────────────────────────────────────────────────
# LOD Generation Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_LODPanel(_FO4Panel):
    """Level of Detail (LOD) chain generation for Fallout 4."""
    bl_idname    = "FO4_PT_lod_panel"
    bl_label     = "LOD Generation"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        is_mesh = (context.active_object is not None
                   and context.active_object.type == 'MESH')

        box = layout.box()
        col = box.column(align=True)
        col.scale_y = 0.8
        col.label(text="Source object = LOD0 (full detail)", icon='INFO')
        col.label(text="LOD1 75%  •  LOD2 50%  •  LOD3 25%  •  LOD4 10%")
        col.label(text="Export each LOD as a separate NIF file")

        layout.separator()
        col = layout.column(align=True)
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_GenerateLODChain',
                     'fo4.generate_lod_chain',
                     'Generate LOD Chain (LOD1–LOD4)', 'SEQUENCE')


# ─────────────────────────────────────────────────────────────────────────────
# UV Tools Panel
# ─────────────────────────────────────────────────────────────────────────────

class FO4_PT_UVToolsPanel(_FO4Panel):
    """UV unwrapping, seam marking, complexity scanning, and texture setup tools."""
    bl_idname    = "FO4_PT_uv_tools_panel"
    bl_label     = "UV Tools"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        is_mesh = (context.active_object is not None
                   and context.active_object.type == 'MESH')

        # ── UV Unwrap ────────────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="UV Unwrap", icon='UV')
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_ScanUVComplexity',
                     'fo4.scan_uv_complexity',
                     'Scan UV Complexity', 'VIEWZOOM')
        _op_or_label(col, 'FO4_OT_AutoMarkSeams',
                     'fo4.auto_mark_seams',
                     'Scan & Mark Seams', 'EDGESEL')
        _op_or_label(col, 'FO4_OT_OptimizeUVs',
                     'fo4.optimize_uvs',
                     'Optimize UVs (Hybrid Unwrap)', 'UV')

        layout.separator()

        # ── All-in-one setup ─────────────────────────────────────────────────
        col = layout.column(align=True)
        col.label(text="All-in-One Setup", icon='TEXTURE')
        col.enabled = is_mesh
        _op_or_label(col, 'FO4_OT_SetupUVWithTexture',
                     'fo4.setup_uv_with_texture',
                     'Setup UV + Texture (All-in-One)', 'TEXTURE')

        layout.separator()

        # ── Quick tip ────────────────────────────────────────────────────────
        box = layout.box()
        col = box.column(align=True)
        col.scale_y = 0.8
        col.label(text="Recommended Workflow:", icon='INFO')
        col.label(text="1. Scan UV Complexity")
        col.label(text="2. Scan & Mark Seams")
        col.label(text="3. Optimize UVs (Hybrid Unwrap)")
        col.label(text="   — or —")
        col.label(text="   Setup UV + Texture (All-in-One)")


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

classes = (
    FO4_PT_MainPanel,
    FO4_PT_MeshPanel,
    FO4_PT_MeshSettingsPanel,
    FO4_PT_AdvancedMeshPanel,
    FO4_PT_SymmetryPanel,
    FO4_PT_LODPanel,
    FO4_PT_UVToolsPanel,
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
