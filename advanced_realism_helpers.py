"""
Advanced realism workflow helpers for Fallout 4 authoring.

Implements the first rollout items from the advanced roadmap:
- Game-Look Preview mode (viewport/render tuning)
- Material Intelligence (audit/fix pass over selected mesh materials)
- In-editor Performance Estimate (quick tri/draw-call/texture memory estimate)
"""

from __future__ import annotations

import math
from typing import Iterable

import bpy
from bpy.types import Operator, Panel
from bpy.props import BoolProperty, EnumProperty, StringProperty


def _iter_selected_mesh_objects(context) -> Iterable[bpy.types.Object]:
    for obj in context.selected_objects:
        if obj and obj.type == "MESH":
            yield obj


def _find_principled_bsdf(material: bpy.types.Material):
    if not material or not material.use_nodes or not material.node_tree:
        return None
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return None


def _texture_names(material: bpy.types.Material) -> list[str]:
    if not material or not material.use_nodes or not material.node_tree:
        return []
    names: list[str] = []
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE" and getattr(node, "image", None):
            names.append(node.image.name.lower())
    return names


def _set_enum_if_possible(owner, key: str, value: str) -> None:
    if not hasattr(owner, key):
        return
    try:
        setattr(owner, key, value)
    except Exception:
        pass


class FO4_OT_ApplyGameLookPreview(Operator):
    """Apply FO4-oriented scene preview tuning for realism checks"""

    bl_idname = "fo4.apply_game_look_preview"
    bl_label = "Apply Game-Look Preview"
    bl_options = {"REGISTER", "UNDO"}

    preset: EnumProperty(
        name="Preset",
        items=[
            ("WASTELAND_DAY", "Wasteland Day", "Neutral daylight for assets and props"),
            ("WASTELAND_NIGHT", "Wasteland Night", "Low-light/emissive readability check"),
            ("INTERIOR", "Interior", "Indoor contrast check for clutter/architecture"),
        ],
        default="WASTELAND_DAY",
    )

    def execute(self, context):
        scene = context.scene

        # Render/viewport baseline
        if hasattr(scene.render, "engine"):
            # EEVEE_NEXT in new Blender versions, EEVEE in older versions
            scene.render.engine = (
                "BLENDER_EEVEE_NEXT"
                if "BLENDER_EEVEE_NEXT" in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
                else "BLENDER_EEVEE"
            )

        # Color management (fallback-safe)
        _set_enum_if_possible(scene.view_settings, "look", "Medium High Contrast")
        scene.view_settings.gamma = 1.0

        if self.preset == "WASTELAND_DAY":
            scene.view_settings.exposure = 0.25
            world_color = (0.76, 0.73, 0.67)
            world_strength = 1.1
        elif self.preset == "WASTELAND_NIGHT":
            scene.view_settings.exposure = -0.85
            world_color = (0.08, 0.11, 0.16)
            world_strength = 0.3
        else:
            scene.view_settings.exposure = -0.15
            world_color = (0.55, 0.60, 0.66)
            world_strength = 0.7

        if not scene.world:
            scene.world = bpy.data.worlds.new("FO4_AdvancedPreview_World")
        scene.world.use_nodes = True
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (*world_color, 1.0)
            bg.inputs[1].default_value = world_strength

        # Eevee quality toggles when available
        eevee = getattr(scene, "eevee", None)
        if eevee is not None:
            for k, v in (
                ("use_gtao", True),
                ("use_ssr", True),
                ("use_bloom", True),
                ("use_shadows", True),
            ):
                if hasattr(eevee, k):
                    setattr(eevee, k, v)
            if hasattr(eevee, "taa_render_samples"):
                eevee.taa_render_samples = max(16, int(eevee.taa_render_samples))
            if hasattr(eevee, "gtao_distance"):
                eevee.gtao_distance = 0.8
            if hasattr(eevee, "bloom_intensity"):
                eevee.bloom_intensity = 0.06 if self.preset != "WASTELAND_NIGHT" else 0.12

        context.scene.fo4_advanced_preview_status = f"Applied: {self.preset}"
        self.report({"INFO"}, f"Game-Look Preview applied ({self.preset})")
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=360)


class FO4_OT_ResetGameLookPreview(Operator):
    """Reset Game-Look preview settings to a neutral baseline"""

    bl_idname = "fo4.reset_game_look_preview"
    bl_label = "Reset Game-Look Preview"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        scene = context.scene
        scene.view_settings.exposure = 0.0
        scene.view_settings.gamma = 1.0
        context.scene.fo4_advanced_preview_status = "Preview reset"
        self.report({"INFO"}, "Game-Look Preview reset")
        return {"FINISHED"}


class FO4_OT_RunMaterialIntelligence(Operator):
    """Audit/fix selected object materials for FO4 realism defaults"""

    bl_idname = "fo4.run_material_intelligence"
    bl_label = "Run Material Intelligence"
    bl_options = {"REGISTER", "UNDO"}

    auto_fix: BoolProperty(
        name="Auto-fix physically plausible defaults",
        default=False,
    )

    def execute(self, context):
        mesh_objects = list(_iter_selected_mesh_objects(context))
        if not mesh_objects:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        mats_seen = set()
        audited = 0
        fixed = 0
        glow_tagged = 0

        for obj in mesh_objects:
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or mat.name_full in mats_seen:
                    continue
                mats_seen.add(mat.name_full)
                audited += 1

                tex_names = _texture_names(mat)
                has_glow = any("_g." in n or "glow" in n for n in tex_names)
                has_alpha = any("_d." in n or "diffuse" in n or "albedo" in n for n in tex_names)
                metal_hint = any(x in mat.name.lower() for x in ("metal", "steel", "chrome", "weapon"))
                if has_glow:
                    glow_tagged += 1

                if self.auto_fix:
                    # FO4-friendly material side/cutout defaults
                    mat.use_backface_culling = False
                    if has_alpha:
                        _set_enum_if_possible(mat, "blend_method", "CLIP")
                        _set_enum_if_possible(mat, "shadow_method", "CLIP")

                    principled = _find_principled_bsdf(mat)
                    if principled:
                        roughness = float(principled.inputs["Roughness"].default_value)
                        metallic = float(principled.inputs["Metallic"].default_value)
                        principled.inputs["Roughness"].default_value = min(0.92, max(0.2, roughness))
                        principled.inputs["Metallic"].default_value = min(
                            0.9 if metal_hint else 0.2, max(0.0, metallic)
                        )
                        if has_glow:
                            principled.inputs["Emission Color"].default_value = (1.0, 1.0, 1.0, 1.0)
                            principled.inputs["Emission Strength"].default_value = max(
                                1.0, float(principled.inputs["Emission Strength"].default_value)
                            )

                    # Export-time hints consumed by BGSM/BGEM conversion paths
                    mat["fo4_shader_hint"] = "glow" if has_glow else "default"
                    mat["fo4_external_emittance"] = bool(has_glow)
                    fixed += 1

        mode = "Fix" if self.auto_fix else "Audit"
        context.scene.fo4_material_intel_status = (
            f"{mode}: {audited} materials | Glow: {glow_tagged} | Fixed: {fixed}"
        )
        self.report({"INFO"}, context.scene.fo4_material_intel_status)
        return {"FINISHED"}


class FO4_OT_EstimateScenePerformance(Operator):
    """Estimate scene complexity against FO4-friendly budgets"""

    bl_idname = "fo4.estimate_scene_performance"
    bl_label = "Estimate Scene Performance"
    bl_options = {"REGISTER"}

    def execute(self, context):
        mesh_objects = list(_iter_selected_mesh_objects(context))
        if not mesh_objects:
            mesh_objects = [o for o in context.scene.objects if o.type == "MESH"]
        if not mesh_objects:
            self.report({"ERROR"}, "No mesh objects available for analysis")
            return {"CANCELLED"}

        tri_count = 0
        draw_calls = 0
        unique_images = set()

        for obj in mesh_objects:
            data = getattr(obj, "data", None)
            if not data:
                continue
            tri_count += sum(max(1, len(p.vertices) - 2) for p in data.polygons)
            draw_calls += max(1, len(obj.material_slots))
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or not mat.use_nodes or not mat.node_tree:
                    continue
                for node in mat.node_tree.nodes:
                    if node.type == "TEX_IMAGE" and getattr(node, "image", None):
                        unique_images.add(node.image)

        # 4 bytes/px * 1.33 mip-chain overhead approximation
        tex_bytes = 0
        for img in unique_images:
            w = max(1, int(getattr(img, "size", [0, 0])[0] or 0))
            h = max(1, int(getattr(img, "size", [0, 0])[1] or 0))
            tex_bytes += int(w * h * 4 * 1.33)

        tex_mb = tex_bytes / (1024 * 1024)
        perf_band = "GOOD"
        if tri_count > 900_000 or draw_calls > 450 or tex_mb > 1200:
            perf_band = "HEAVY"
        elif tri_count > 500_000 or draw_calls > 250 or tex_mb > 700:
            perf_band = "MODERATE"

        summary = (
            f"Objects:{len(mesh_objects)} | Tris:{tri_count:,} | DrawCalls~{draw_calls:,} | "
            f"Textures:{len(unique_images)} | VRAM~{tex_mb:.1f}MB | Budget:{perf_band}"
        )
        context.scene.fo4_performance_estimate = summary
        self.report({"INFO"}, summary)
        return {"FINISHED"}


class FO4_PT_AdvancedRealismPanel(Panel):
    """Advanced realism and quality workflow panel"""

    bl_label = "Advanced Realism Lab"
    bl_idname = "FO4_PT_advanced_realism_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Fallout 4"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        has_mesh = bool(context.active_object and context.active_object.type == "MESH")

        preview_box = layout.box()
        preview_box.label(text="1) Game-Look Preview", icon="HIDE_OFF")
        row = preview_box.row(align=True)
        row.operator("fo4.apply_game_look_preview", text="Apply Preset", icon="RESTRICT_RENDER_OFF")
        row.operator("fo4.reset_game_look_preview", text="Reset", icon="LOOP_BACK")
        if context.scene.fo4_advanced_preview_status:
            preview_box.label(text=context.scene.fo4_advanced_preview_status, icon="INFO")

        mat_box = layout.box()
        mat_box.label(text="2) Material Intelligence", icon="MATERIAL")
        row = mat_box.row(align=True)
        op = row.operator("fo4.run_material_intelligence", text="Audit", icon="VIEWZOOM")
        op.auto_fix = False
        row = mat_box.row(align=True)
        row.enabled = has_mesh
        op = row.operator("fo4.run_material_intelligence", text="Auto-Fix Selected", icon="TOOL_SETTINGS")
        op.auto_fix = True
        if context.scene.fo4_material_intel_status:
            mat_box.label(text=context.scene.fo4_material_intel_status, icon="CHECKMARK")

        perf_box = layout.box()
        perf_box.label(text="3) In-Editor Performance Estimate", icon="SEQ_LUMA_WAVEFORM")
        perf_box.operator("fo4.estimate_scene_performance", text="Estimate", icon="GRAPH")
        if context.scene.fo4_performance_estimate:
            for line in context.scene.fo4_performance_estimate.split(" | "):
                perf_box.label(text=line, icon="DOT")


classes = (
    FO4_OT_ApplyGameLookPreview,
    FO4_OT_ResetGameLookPreview,
    FO4_OT_RunMaterialIntelligence,
    FO4_OT_EstimateScenePerformance,
    FO4_PT_AdvancedRealismPanel,
)


def register():
    bpy.types.Scene.fo4_advanced_preview_status = StringProperty(
        name="FO4 Advanced Preview Status",
        default="",
    )
    bpy.types.Scene.fo4_material_intel_status = StringProperty(
        name="FO4 Material Intelligence Status",
        default="",
    )
    bpy.types.Scene.fo4_performance_estimate = StringProperty(
        name="FO4 Performance Estimate",
        default="",
    )

    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            existing = getattr(bpy.types, cls.__name__, None)
            if existing is not None:
                try:
                    bpy.utils.unregister_class(existing)
                except Exception:
                    pass
            bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass

    for p in (
        "fo4_advanced_preview_status",
        "fo4_material_intel_status",
        "fo4_performance_estimate",
    ):
        if hasattr(bpy.types.Scene, p):
            delattr(bpy.types.Scene, p)
