"""
content_panels.py
=================
Game content-creation panels: vegetation, quest/NPC/world/item, mod packaging,
automation macros, post-processing, materials, diagnostics, references, Papyrus.
"""

import bpy
import importlib
import sys
from bpy.types import Panel

# Base class and shared draw helper are defined in ui_panels.py.
# They are available here because ui_panels is imported first in __init__.py.
from .ui_panels import _FO4SubPanel, _draw_game_path_box


def _safe_import(name):
    """Import a submodule of this package safely; returns None on failure."""
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        sys.modules.pop(f"{__package__}.{name}", None)
        print(f"content_panels: Skipped module {name} due to error: {exc}")
        return None


# Modules referenced by the panels in this file
fo4_material_browser  = _safe_import("fo4_material_browser")
fo4_scene_diagnostics = _safe_import("fo4_scene_diagnostics")
fo4_reference_helpers = _safe_import("fo4_reference_helpers")
automation_system     = _safe_import("automation_system")

# Cache for macro list — avoids a disk read on every panel redraw
import time as _time
_macros_cache: list = []
_macros_cache_time: float = 0.0
_MACROS_CACHE_TTL: float = 5.0  # seconds


def _get_macros_cached():
    global _macros_cache, _macros_cache_time
    if automation_system and (_time.time() - _macros_cache_time) >= _MACROS_CACHE_TTL:
        try:
            _macros_cache = automation_system.AutomationSystem.get_all_macros()
        except Exception:
            _macros_cache = []
        _macros_cache_time = _time.time()
    return _macros_cache


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
        row.enabled = bool(obj and obj.type == 'MESH')
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
        row.enabled = bool(obj and obj.type == 'MESH')
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
        row.enabled = bool(obj and obj.type == 'MESH')
        row.scale_y = 1.3
        row.operator("fo4.create_vegetation_lod_chain", text="Create LOD Chain", icon='MESH_GRID')
        row2 = box.row()
        row2.enabled = bool(obj and obj.type == 'MESH')
        row2.operator("fo4.export_lod_chain_as_nif", text="Export LOD Chain as NIF", icon='EXPORT')

        # Collision for vegetation
        box = layout.box()
        box.label(text="Collision (for trees / large bushes)", icon='MESH_ICOSPHERE')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="VEGETATION type = simplified convex hull footprint", icon='INFO')
        sub.label(text="GRASS / MUSHROOM = no collision (thin foliage)", icon='INFO')
        box.separator()
        has_mesh = bool(obj and obj.type == 'MESH')
        if has_mesh:
            box.prop(obj, "fo4_collision_type", text="Type")
        row = box.row()
        row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
        row = box.row()
        can_collide = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
        row.enabled = bool(can_collide)
        row.operator("fo4.generate_collision_mesh", text="Generate Collision Mesh", icon='MESH_DATA')
        row = box.row()
        row.enabled = bool(has_mesh)
        row.operator("fo4.generate_lod_and_collision",
                     text="Generate LOD + Collision", icon='SHADERFX')

        # Wind animation
        box = layout.box()
        box.label(text="Wind Animation", icon='FORCE_WIND')
        has_veg = bool(obj and obj.type == 'MESH')
        has_sel = bool([o for o in context.selected_objects if o.type == 'MESH'])
        # Primary: Smart auto-detect (correct path for vegetation)
        smart_row = box.row()
        smart_row.enabled = has_veg
        smart_row.scale_y = 1.2
        smart_row.operator("fo4.smart_wind_setup", text="Smart Wind Setup (Auto)", icon='FORCE_WIND')
        # Manual fine-grained controls
        col = box.column(align=True)
        col.enabled = has_veg
        r1 = col.row(align=True)
        r1.operator("fo4.vegetation_wind_setup", text="Vegetation Wind (Vertex Groups)", icon='PARTICLES')
        r1.operator("fo4.generate_wind_weights", text="", icon='WPAINT_HLT')
        r2 = col.row()
        r2.enabled = has_sel
        r2.operator("fo4.batch_apply_wind_animation", text="Batch: Wind Anim (Selected)", icon='ANIM')

        # Leaf card setup (one-click for AI-generated foliage)
        box = layout.box()
        box.label(text="Leaf Cards (Alpha Cutout Layer)", icon='OUTLINER_OB_SURFACE')
        has_mesh = bool(obj and obj.type == 'MESH')
        lc_row = box.row()
        lc_row.enabled = has_mesh
        lc_row.scale_y = 1.3
        lc_row.operator("fo4.setup_leaf_card",
                        text="Set Up as Leaf Card", icon='MATERIAL')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="Decimate + alpha-clip material + wind weights", icon='INFO')
        sub.label(text="Use for: leaves, small foliage, vine leaves", icon='INFO')
        sub.label(text="3D stems/roots/trunks → use normal export path", icon='INFO')

        # Material setup
        box = layout.box()
        box.label(text="Vegetation Material (Manual)", icon='MATERIAL')
        row = box.row()
        row.enabled = has_mesh
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
        row.enabled = bool(obj and obj.type == 'MESH')
        row.operator("fo4.export_vegetation_as_nif",
                     text="Export Vegetation NIF", icon='FILE_BLEND')

        # Baking
        box = layout.box()
        box.label(text="Baking", icon='RENDER_STILL')
        row = box.row()
        row.enabled = bool(obj and obj.type == 'MESH')
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
        tips_box.operator(
            "fo4.show_foliage_lod_checklist",
            text="Open LOD + Export Checklist",
            icon='TEXT',
        )


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
        info_box.label(text="5. Export as NIF (via PyNifly)")


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

        if not hasattr(scene, 'fo4_is_recording'):
            layout.label(text="Loading automation system...", icon='TIME')
            return

        # Recording controls
        box = layout.box()
        box.label(text="Macro Recording", icon='REC')

        if scene.fo4_is_recording:
            box.label(text="● RECORDING", icon='RADIOBUT_ON')
            if automation_system:
                action_count = len(automation_system.AutomationSystem.recorded_actions)
                box.label(text=f"Actions recorded: {action_count}")
            box.operator("fo4.stop_recording", text="Stop Recording", icon='CANCEL')
        else:
            box.operator("fo4.start_recording", text="Start Recording", icon='REC')
            box.label(text="Record your actions to create macros")

        # Save macro
        if not scene.fo4_is_recording:
            if automation_system and automation_system.AutomationSystem.recorded_actions:
                save_box = layout.box()
                save_box.label(text="Save Recorded Macro", icon='FILE_NEW')
                save_box.operator("fo4.save_macro", text="Save as Macro", icon='FILE_TICK')

        # Workflow templates
        template_box = layout.box()
        template_box.label(text="Workflow Templates", icon='SCRIPT')
        template_box.operator("fo4.execute_workflow_template", text="Execute Template", icon='PLAY')

        # Saved macros
        macros = _get_macros_cached()

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

        if not hasattr(scene, 'fo4_pp_preset'):
            layout.label(text="Loading post-processing...", icon='TIME')
            return

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
    bl_parent_id = "FO4_PT_texture_panel"
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

        quick_box = layout.box()
        quick_box.label(text="Core Profiles", icon='NODE_MATERIAL')
        row = quick_box.row(align=True)
        op = row.operator("fo4.apply_core_material_profile", text="Foliage")
        op.profile = 'FOLIAGE'
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)
        op = row.operator("fo4.apply_core_material_profile", text="Wet")
        op.profile = 'WET'
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)
        row = quick_box.row(align=True)
        op = row.operator("fo4.apply_core_material_profile", text="Metal")
        op.profile = 'METAL'
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)
        op = row.operator("fo4.apply_core_material_profile", text="Skin")
        op.profile = 'SKIN'
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

        # ── Quick-apply buttons by category ─────────────────────────────────
        if fo4_material_browser:
            apply_all = getattr(scene, "fo4_mat_apply_all", True)

            def _quick_row(box, preset_ids):
                row = box.row(align=True)
                for pid in preset_ids:
                    label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                    r = row.operator("fo4.apply_material_preset", text=label)
                    r.preset = pid
                    r.apply_all_selected = apply_all

            # Metals
            m_box = layout.box()
            m_box.label(text="Metals", icon='MATERIAL_DATA')
            _quick_row(m_box, ("RUSTY_METAL", "CLEAN_METAL", "GALVANIZED_METAL", "VAULT_METAL"))
            _quick_row(m_box, ("POWER_ARMOR_PAINT", "PIPBOY_PAINT"))

            # Stone & Ground
            s_box = layout.box()
            s_box.label(text="Stone & Ground", icon='MESH_CUBE')
            _quick_row(s_box, ("CRACKED_CONCRETE", "SMOOTH_CONCRETE", "STONE", "ASPHALT"))

            # Wood
            w_box = layout.box()
            w_box.label(text="Wood", icon='MESH_PLANE')
            _quick_row(w_box, ("WOOD_PLANK", "WOOD_PANEL"))

            # Glass
            g_box = layout.box()
            g_box.label(text="Glass", icon='CUBE')
            _quick_row(g_box, ("GLASS_CLEAR", "GLASS_BROKEN"))

            # Plastic & Rubber
            p_box = layout.box()
            p_box.label(text="Plastic & Rubber", icon='MOD_SMOOTH')
            _quick_row(p_box, ("HARD_PLASTIC", "RUBBER"))

            # Fabric & Leather
            f_box = layout.box()
            f_box.label(text="Fabric & Leather", icon='MESH_UVSPHERE')
            _quick_row(f_box, ("FABRIC_CLOTH", "LEATHER"))

            # Skin & Organic
            sk_box = layout.box()
            sk_box.label(text="Skin & Organic", icon='OUTLINER_OB_ARMATURE')
            _quick_row(sk_box, ("HUMAN_SKIN", "GHOUL_SKIN"))

            # Emissive & Special
            e_box = layout.box()
            e_box.label(text="Emissive & Special", icon='LIGHT_SUN')
            _quick_row(e_box, ("NEON_LIGHT", "TERMINAL_SCREEN", "HOLOTAPE"))

            # FO4 Shader Types
            sh_box = layout.box()
            sh_box.label(text="FO4 Shader Types", icon='SHADING_RENDERED')
            _quick_row(sh_box, ("FO4_EYE", "FO4_HAIR", "FO4_PARALLAX"))
            _quick_row(sh_box, ("FO4_ENV_MAP", "FO4_MULTILAYER"))

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
        if hasattr(scene, "fo4_diag_report_path"):
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
        fct_col.label(text="  • No XML knowledge needed - everything via GUI")
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


classes = (
    FO4_PT_AutomationMacrosPanel,
    FO4_PT_PostProcessingPanel,
    FO4_PT_MaterialBrowserPanel,
    FO4_PT_SceneDiagnosticsPanel,
    FO4_PT_ReferenceObjectsPanel,
    FO4_PT_PapyrusPanel,
    FO4_PT_VegetationPanel,
    FO4_PT_QuestPanel,
    FO4_PT_NPCPanel,
    FO4_PT_WorldBuildingPanel,
    FO4_PT_ItemCreationPanel,
    FO4_PT_ModPackagingPanel,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
            except Exception as e2:
                print(f"\u26a0 Failed to register {cls.__name__}: {e2}")


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
