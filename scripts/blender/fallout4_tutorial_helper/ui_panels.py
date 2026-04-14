"""
Fallout 4 Tutorial Helper — ui_panels.py
All bpy.types.Panel subclasses for the FO4 pipeline sidebar.
"""

import bpy
from bpy.types import Panel

# Mossy link — available after register() runs
try:
    from . import mossy_link as _mossy
    _MOSSY_AVAILABLE = True
except ImportError:
    _mossy = None  # type: ignore[assignment]
    _MOSSY_AVAILABLE = False


class FO4_PT_pipeline(Panel):
    bl_label = "FO4 Asset Pipeline"
    bl_idname = "FO4_PT_pipeline"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "FO4 Pipeline"

    def draw(self, context):
        layout = self.layout

        # — Mossy AI Link ————————————————————————————————
        box = layout.box()
        box.label(text="Mossy AI Link", icon='NETWORK_DRIVE')
        if _MOSSY_AVAILABLE and _mossy:
            status = _mossy.get_status()
            if status.get('running'):
                row = box.row()
                row.label(
                    text=f"Connected  v{status.get('version', '?')}",
                    icon='CHECKMARK',
                )
            else:
                box.label(text="Not connected — open Mossy", icon='ERROR')
        else:
            box.label(text="mossy_link unavailable", icon='QUESTION')
        box.operator("fo4.sync_from_mossy", icon='FILE_REFRESH',
                     text="Sync Settings & PyTorch from Mossy")

        # — Scene Setup ——————————————————————————————————
        box = layout.box()
        box.label(text="1. Scene Setup", icon='SCENE_DATA')
        box.operator("fo4.setup_scene", icon='SETTINGS')

        # — NIF Export Prep ——————————————————————————————
        box = layout.box()
        box.label(text="2. NIF Export Preparation", icon='EXPORT')
        box.operator("fo4.apply_transforms", icon='OBJECT_ORIGIN')
        box.operator("fo4.check_nif_ready", icon='CHECKMARK')
        box.operator("fo4.validate_uvs", icon='UV')

        # — Collision ————————————————————————————————————
        box = layout.box()
        box.label(text="3. Collision", icon='MESH_ICOSPHERE')
        box.operator("fo4.generate_collision", icon='MOD_SOLIDIFY')

        # — CK Cell Roundtrip ————————————————————————————
        box = layout.box()
        box.label(text="4. CK Cell ↔ Blender", icon='WORLD')
        col = box.column(align=True)
        col.operator("fo4.import_cell_refs", icon='IMPORT',
                     text="Import Cell (xEdit JSON)")
        col.operator("fo4.export_cell_refs", icon='EXPORT',
                     text="Export Positions (JSON)")
        box.label(text="Requires PyNifly (Nexus #52319)", icon='INFO')


class FO4_PT_pipeline_help(Panel):
    bl_label = "Help & Resources"
    bl_idname = "FO4_PT_pipeline_help"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "FO4 Pipeline"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.label(text="PyNifly 25.8 (Blender 4.4+):", icon='URL')
        col.label(text="  nexusmods.com/fallout4/mods/52319", icon='BLANK1')
        col.label(text="  github.com/BadDogSkyrim/PyNifly", icon='BLANK1')
        col.label(text="F4RefToBlender: github.com/6ooflames/F4RefToBlender", icon='URL')
        col.label(text="xEdit script: ExportCellRefsToJSON.pas", icon='TEXT')
        col.label(text="Full guide: CK_CELL_TO_BLENDER_WORKFLOW.md", icon='HELP')
        layout.separator()
        col2 = layout.column(align=True)
        col2.label(text="Workflow summary:", icon='QUESTION')
        col2.label(text="1. Extract NIFs from BA2 (BAE)")
        col2.label(text="2. Export REFR JSON from xEdit")
        col2.label(text="3. Import Cell → edit in Blender")
        col2.label(text="4. File → Export → NIF (PyNifly)")
        col2.label(text="5. Verify in NifSkope")
        col2.label(text="6. Place in CK → check navmesh")


classes = (
    FO4_PT_pipeline,
    FO4_PT_pipeline_help,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
