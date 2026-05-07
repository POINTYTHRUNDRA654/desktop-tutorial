"""
Advanced realism workflow helpers for Fallout 4 authoring.

Implements an advanced realism toolkit:
- Reference-match mode
- Real-world scale validator
- Material response tester
- Surface breakup system
- Contact realism pass
- Edge realism toolkit
- Decal layering workflow
- Realism QA scorecard
"""

from __future__ import annotations

import math
from typing import Iterable

import bpy
from bpy.props import (
    BoolProperty,
    EnumProperty,
    FloatProperty,
    PointerProperty,
    StringProperty,
)
from bpy.types import Operator, Panel

_FO4_REALISM_TAG_KEY = "fo4_realism_tag"


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


def _ensure_world_background(scene, color, strength):
    if not scene.world:
        scene.world = bpy.data.worlds.new("FO4_AdvancedPreview_World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (*color, 1.0)
        bg.inputs[1].default_value = strength


def _set_reference_in_image_editors(context, image: bpy.types.Image) -> int:
    updated = 0
    wm = context.window_manager
    for window in wm.windows:
        for area in window.screen.areas:
            if area.type != "IMAGE_EDITOR":
                continue
            for space in area.spaces:
                if space.type == "IMAGE_EDITOR":
                    space.image = image
                    updated += 1
    return updated


def _average_image_luminance(image: bpy.types.Image) -> float:
    if not image:
        return 0.35
    try:
        if not image.has_data:
            image.reload()
        pixels = image.pixels
        length = len(pixels)
        if length < 4:
            return 0.35
        step = max(4, (length // 4 // 2048) * 4)
        total = 0.0
        count = 0
        for i in range(0, length, step):
            r = pixels[i]
            g = pixels[i + 1]
            b = pixels[i + 2]
            total += 0.2126 * r + 0.7152 * g + 0.0722 * b
            count += 1
        return max(0.01, min(0.99, total / max(1, count)))
    except Exception:
        return 0.35


def _estimate_object_texel_density(obj: bpy.types.Object) -> float:
    max_dim = max(float(obj.dimensions.x), float(obj.dimensions.y), float(obj.dimensions.z), 0.001)
    max_tex_side = 0
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes or not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and getattr(node, "image", None):
                size = getattr(node.image, "size", None)
                if size and len(size) >= 2:
                    max_tex_side = max(max_tex_side, int(size[0] or 0), int(size[1] or 0))
    if max_tex_side <= 0:
        return 0.0
    return max_tex_side / max_dim


def _current_color_input_link(principled, input_name="Base Color"):
    socket = principled.inputs.get(input_name)
    if socket and socket.is_linked and socket.links:
        return socket.links[0].from_socket
    return None


def _connect_or_set(socket, value):
    if socket is None:
        return
    try:
        socket.default_value = value
    except Exception:
        pass


def _tagged_name(tag: str) -> str:
    return f"FO4::{tag}"


def _find_tagged_node(node_tree, tag: str):
    for node in node_tree.nodes:
        if node.get(_FO4_REALISM_TAG_KEY) == tag:
            return node
    return None


def _ensure_tagged_node(node_tree, tag: str, node_type: str, location):
    node = _find_tagged_node(node_tree, tag)
    if node is None:
        node = node_tree.nodes.new(node_type)
        node[_FO4_REALISM_TAG_KEY] = tag
    node.name = _tagged_name(tag)
    node.label = _tagged_name(tag)
    node.location = location
    return node


def _replace_input_link(node_tree, input_socket, output_socket) -> None:
    if input_socket is None or output_socket is None:
        return
    while input_socket.is_linked and input_socket.links:
        node_tree.links.remove(input_socket.links[0])
    node_tree.links.new(output_socket, input_socket)


def _material_prop_key(pass_key: str, name: str) -> str:
    return f"fo4_{pass_key}_{name}"


def _triangle_areas_3d_uv(mesh: bpy.types.Mesh, uv_layer_data, loop_indices):
    if len(loop_indices) < 3:
        return
    first = loop_indices[0]
    first_loop = mesh.loops[first]
    v0 = mesh.vertices[first_loop.vertex_index].co
    uv0 = uv_layer_data[first].uv
    for i in range(1, len(loop_indices) - 1):
        l1 = loop_indices[i]
        l2 = loop_indices[i + 1]
        loop1 = mesh.loops[l1]
        loop2 = mesh.loops[l2]
        v1 = mesh.vertices[loop1.vertex_index].co
        v2 = mesh.vertices[loop2.vertex_index].co
        uv1 = uv_layer_data[l1].uv
        uv2 = uv_layer_data[l2].uv

        area_3d = ((v1 - v0).cross(v2 - v0)).length * 0.5
        area_uv = abs((uv1.x - uv0.x) * (uv2.y - uv0.y) - (uv1.y - uv0.y) * (uv2.x - uv0.x)) * 0.5
        yield area_3d, area_uv


def _estimate_uv_stretch(mesh_obj: bpy.types.Object):
    mesh = getattr(mesh_obj, "data", None)
    if not mesh or not mesh.uv_layers or not mesh.uv_layers.active:
        return None

    uv_layer_data = mesh.uv_layers.active.data
    ratios = []
    degenerate = 0

    for poly in mesh.polygons:
        for area_3d, area_uv in _triangle_areas_3d_uv(mesh, uv_layer_data, poly.loop_indices):
            if area_3d <= 1.0e-10:
                continue
            if area_uv <= 1.0e-10:
                degenerate += 1
                continue
            ratios.append(area_uv / area_3d)

    if not ratios and degenerate == 0:
        return {"triangles": 0, "stretched": 0, "degenerate": 0}

    ratios.sort()
    median = ratios[len(ratios) // 2] if ratios else 0.0
    lower = median * 0.25
    upper = median * 4.0
    stretched = sum(1 for r in ratios if r < lower or r > upper) if median > 0.0 else 0
    return {"triangles": len(ratios), "stretched": stretched, "degenerate": degenerate}


def _auto_fix_uv_stretch(mesh_obj: bpy.types.Object) -> bool:
    mesh = getattr(mesh_obj, "data", None)
    if not mesh:
        return False

    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    uv_layer = mesh.uv_layers.active
    if not uv_layer:
        return False

    uv_data = uv_layer.data
    changed = False

    for poly in mesh.polygons:
        if len(poly.loop_indices) < 3:
            continue

        poly_area_uv = 0.0
        for area_3d, area_uv in _triangle_areas_3d_uv(mesh, uv_data, poly.loop_indices):
            if area_3d > 1.0e-10:
                poly_area_uv += area_uv

        if poly.area <= 1.0e-10 or poly_area_uv > 1.0e-10:
            continue

        normal = poly.normal
        ax = abs(float(normal.x))
        ay = abs(float(normal.y))
        az = abs(float(normal.z))
        axis = "Z" if az >= ax and az >= ay else ("Y" if ay >= ax else "X")

        projected = []
        for li in poly.loop_indices:
            v = mesh.vertices[mesh.loops[li].vertex_index].co
            if axis == "Z":
                projected.append((float(v.x), float(v.y)))
            elif axis == "Y":
                projected.append((float(v.x), float(v.z)))
            else:
                projected.append((float(v.y), float(v.z)))

        min_u = min(p[0] for p in projected)
        max_u = max(p[0] for p in projected)
        min_v = min(p[1] for p in projected)
        max_v = max(p[1] for p in projected)
        span_u = max(1.0e-6, max_u - min_u)
        span_v = max(1.0e-6, max_v - min_v)

        for li, (u, v) in zip(poly.loop_indices, projected):
            uv = uv_data[li].uv
            uv.x = (u - min_u) / span_u
            uv.y = (v - min_v) / span_v
        changed = True

    if not changed:
        return False
    try:
        mesh.update()
    except Exception:
        pass
    return True


def _ensure_material_prop(material: bpy.types.Material, pass_key: str, name: str, value) -> str:
    key = _material_prop_key(pass_key, name)
    if key not in material:
        material[key] = list(value) if isinstance(value, (list, tuple)) else value
    return key


def _get_material_prop(material: bpy.types.Material, pass_key: str, name: str, default=None):
    key = _material_prop_key(pass_key, name)
    if key not in material:
        return default
    value = material[key]
    if hasattr(value, "to_list"):
        return value.to_list()
    if isinstance(value, (list, tuple)):
        return list(value)
    return value


def _mark_material_processed(material: bpy.types.Material, pass_key: str, **settings) -> None:
    material[_material_prop_key(pass_key, "processed")] = True
    for name, value in settings.items():
        material[_material_prop_key(pass_key, name)] = list(value) if isinstance(value, (list, tuple)) else value


def _ensure_mix_base_input(node_tree, principled, mix_node, fallback) -> None:
    base_input = principled.inputs.get("Base Color")
    source_input = mix_node.inputs[1]
    if source_input.is_linked:
        return
    prev = _current_color_input_link(principled)
    if prev and prev.node != mix_node:
        _replace_input_link(node_tree, source_input, prev)
        return
    if base_input is not None:
        _connect_or_set(source_input, tuple(base_input.default_value))
    else:
        _connect_or_set(source_input, fallback)


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

        if hasattr(scene.render, "engine"):
            scene.render.engine = (
                "BLENDER_EEVEE_NEXT"
                if "BLENDER_EEVEE_NEXT" in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
                else "BLENDER_EEVEE"
            )

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

        _ensure_world_background(scene, world_color, world_strength)

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
        _set_enum_if_possible(scene.view_settings, "look", "None")
        context.scene.fo4_advanced_preview_status = "Preview reset"
        self.report({"INFO"}, "Game-Look Preview reset")
        return {"FINISHED"}


class FO4_OT_EnableReferenceMatchMode(Operator):
    """Use a target image as realism reference and auto-match tone"""

    bl_idname = "fo4.enable_reference_match_mode"
    bl_label = "Enable Reference-Match"
    bl_options = {"REGISTER", "UNDO"}

    auto_match_tone: BoolProperty(
        name="Auto-match Exposure/Contrast",
        default=True,
    )

    def execute(self, context):
        scene = context.scene
        image = scene.fo4_reference_image
        if not image:
            self.report({"ERROR"}, "Select a target reference image first")
            return {"CANCELLED"}

        image_editor_count = _set_reference_in_image_editors(context, image)

        if scene.camera and hasattr(scene.camera.data, "background_images"):
            cam = scene.camera.data
            cam.show_background_images = True
            bg = None
            for item in cam.background_images:
                if item.source == "IMAGE" and item.image == image:
                    bg = item
                    break
            if bg is None:
                bg = cam.background_images.new()
            bg.source = "IMAGE"
            bg.image = image
            bg.alpha = 0.85

        for area in context.screen.areas:
            if area.type != "VIEW_3D":
                continue
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.shading.type = "MATERIAL"
                    if hasattr(space.shading, "use_scene_lights"):
                        space.shading.use_scene_lights = True
                    if hasattr(space.shading, "use_scene_world"):
                        space.shading.use_scene_world = True

        if self.auto_match_tone:
            avg_luma = _average_image_luminance(image)
            target_luma = 0.30 if scene.fo4_reference_kind == "GAME_CAPTURE" else 0.38
            exposure = math.log2(max(0.01, target_luma) / max(0.01, avg_luma))
            scene.view_settings.exposure = max(-3.0, min(3.0, exposure))
            _set_enum_if_possible(
                scene.view_settings,
                "look",
                "Medium High Contrast" if scene.fo4_reference_kind == "GAME_CAPTURE" else "None",
            )

        side_by_side = "enabled" if image_editor_count > 0 else "partial (open an Image Editor for side-by-side)"
        scene.fo4_reference_status = f"Reference match {side_by_side}: {image.name}"
        self.report({"INFO"}, scene.fo4_reference_status)
        return {"FINISHED"}


class FO4_OT_RunScaleValidator(Operator):
    """Validate scale and texel density against realism targets"""

    bl_idname = "fo4.run_scale_validator"
    bl_label = "Run Scale Validator"
    bl_options = {"REGISTER", "UNDO"}

    auto_fix: BoolProperty(
        name="Auto-fix unit setup and low texel density",
        default=False,
    )

    def execute(self, context):
        scene = context.scene
        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        class_ranges = {
            "PROP": (0.10, 2.5, 512, 2048),
            "CHARACTER": (1.45, 2.30, 1024, 4096),
            "ARCHITECTURE": (2.0, 200.0, 256, 1024),
            "CLUTTER": (0.02, 1.0, 512, 2048),
            "WEAPON": (0.25, 2.0, 1024, 4096),
        }
        min_size, max_size, min_texel, max_texel = class_ranges[scene.fo4_scale_asset_class]

        if self.auto_fix and hasattr(scene, "unit_settings"):
            scene.unit_settings.system = "METRIC"
            scene.unit_settings.scale_length = 1.0

        issues = 0
        fixed = 0

        for obj in objs:
            size = max(float(obj.dimensions.x), float(obj.dimensions.y), float(obj.dimensions.z), 0.0)
            texel = _estimate_object_texel_density(obj)

            if size < min_size or size > max_size:
                issues += 1

            if texel < min_texel or texel > max_texel:
                issues += 1
                if self.auto_fix and texel > 0 and texel < min_texel and obj.data and obj.data.uv_layers.active:
                    factor = min(2.0, max(1.05, min_texel / texel))
                    uv_data = obj.data.uv_layers.active.data
                    for loop in uv_data:
                        uv = loop.uv
                        uv.x = 0.5 + (uv.x - 0.5) * factor
                        uv.y = 0.5 + (uv.y - 0.5) * factor
                    fixed += 1

        mode = "Auto-fix" if self.auto_fix else "Audit"
        scene.fo4_scale_status = (
            f"{mode}: Class={scene.fo4_scale_asset_class} | Objects={len(objs)} | Issues={issues} | Fixed={fixed}"
        )
        self.report({"INFO"}, scene.fo4_scale_status)
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
                            emission_color = (
                                principled.inputs.get("Emission Color")
                                or principled.inputs.get("Emission")
                            )
                            if emission_color is not None:
                                emission_color.default_value = (1.0, 1.0, 1.0, 1.0)
                            emission_strength = principled.inputs.get("Emission Strength")
                            if emission_strength is not None:
                                emission_strength.default_value = max(
                                    1.0, float(emission_strength.default_value)
                                )

                    mat["fo4_shader_hint"] = "glow" if has_glow else "default"
                    mat["fo4_external_emittance"] = bool(has_glow)
                    _mark_material_processed(
                        mat,
                        "material_intelligence",
                        glow=bool(has_glow),
                        alpha_clip=bool(has_alpha),
                    )
                    fixed += 1

        mode = "Fix" if self.auto_fix else "Audit"
        context.scene.fo4_material_intel_status = (
            f"{mode}: {audited} materials | Glow: {glow_tagged} | Fixed: {fixed}"
        )
        self.report({"INFO"}, context.scene.fo4_material_intel_status)
        return {"FINISHED"}


class FO4_OT_RunMaterialResponseTester(Operator):
    """Apply lighting sweeps to expose roughness/spec/emissive issues"""

    bl_idname = "fo4.run_material_response_tester"
    bl_label = "Run Material Response Tester"
    bl_options = {"REGISTER", "UNDO"}

    sweep: EnumProperty(
        name="Sweep",
        items=[
            ("SUNSET", "Sunset", "Warm, low-angle key light"),
            ("NIGHT", "Night", "Low-light emissive readability"),
            ("INTERIOR", "Interior", "Balanced indoor setup"),
            ("WET", "Wet", "High specularity stress test"),
        ],
        default="SUNSET",
    )

    def execute(self, context):
        scene = context.scene

        suns = [o for o in scene.objects if o.type == "LIGHT" and getattr(o.data, "type", "") == "SUN"]
        if suns:
            sun = suns[0]
        else:
            light_data = bpy.data.lights.new(name="FO4_ResponseSun", type="SUN")
            sun = bpy.data.objects.new("FO4_ResponseSun", light_data)
            scene.collection.objects.link(sun)

        if self.sweep == "SUNSET":
            sun.data.energy = 4.5
            sun.rotation_euler = (math.radians(25), 0.0, math.radians(130))
            _ensure_world_background(scene, (0.82, 0.54, 0.30), 0.55)
            scene.view_settings.exposure = 0.1
        elif self.sweep == "NIGHT":
            sun.data.energy = 0.2
            sun.rotation_euler = (math.radians(75), 0.0, math.radians(-20))
            _ensure_world_background(scene, (0.05, 0.07, 0.12), 0.12)
            scene.view_settings.exposure = -0.85
        elif self.sweep == "INTERIOR":
            sun.data.energy = 1.5
            sun.rotation_euler = (math.radians(52), 0.0, math.radians(38))
            _ensure_world_background(scene, (0.65, 0.66, 0.67), 0.45)
            scene.view_settings.exposure = -0.05
        else:
            sun.data.energy = 3.2
            sun.rotation_euler = (math.radians(45), 0.0, math.radians(15))
            _ensure_world_background(scene, (0.62, 0.65, 0.70), 0.85)
            scene.view_settings.exposure = 0.2

        if hasattr(scene, "eevee") and hasattr(scene.eevee, "use_ssr"):
            scene.eevee.use_ssr = True

        scene.fo4_material_response_status = f"Sweep applied: {self.sweep}"
        self.report({"INFO"}, scene.fo4_material_response_status)
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=360)


class FO4_OT_ApplySurfaceBreakup(Operator):
    """Apply procedural micro variation to reduce visible tiling/repetition"""

    bl_idname = "fo4.apply_surface_breakup"
    bl_label = "Apply Surface Breakup"
    bl_options = {"REGISTER", "UNDO"}

    roughness_variation: FloatProperty(name="Roughness Variation", default=0.08, min=0.0, max=0.5)
    hue_variation: FloatProperty(name="Hue Variation", default=0.035, min=0.0, max=0.25)
    normal_variation: FloatProperty(name="Normal Strength Variation", default=0.20, min=0.0, max=1.0)

    def execute(self, context):
        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        mats_seen = set()
        touched = 0

        for obj in objs:
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or mat.name_full in mats_seen:
                    continue
                mats_seen.add(mat.name_full)

                principled = _find_principled_bsdf(mat)
                if not principled:
                    continue

                seed = (sum(ord(ch) for ch in mat.name) % 997) / 997.0
                offset = seed - 0.5

                rough_input = principled.inputs.get("Roughness")
                if rough_input:
                    _ensure_material_prop(
                        mat,
                        "surface_breakup",
                        "base_roughness",
                        float(rough_input.default_value),
                    )
                    base_rough = float(
                        _get_material_prop(
                            mat,
                            "surface_breakup",
                            "base_roughness",
                            float(rough_input.default_value),
                        )
                    )
                    rough = base_rough + self.roughness_variation * offset
                    rough_input.default_value = min(0.98, max(0.06, rough))

                base_input = principled.inputs.get("Base Color")
                if base_input and not base_input.is_linked:
                    _ensure_material_prop(
                        mat,
                        "surface_breakup",
                        "base_color",
                        list(base_input.default_value),
                    )
                    c = list(
                        _get_material_prop(
                            mat,
                            "surface_breakup",
                            "base_color",
                            list(base_input.default_value),
                        )
                    )
                    jitter = self.hue_variation * offset
                    c[0] = min(1.0, max(0.0, c[0] + jitter))
                    c[1] = min(1.0, max(0.0, c[1] + jitter * 0.6))
                    c[2] = min(1.0, max(0.0, c[2] - jitter * 0.4))
                    base_input.default_value = c

                if mat.use_nodes and mat.node_tree:
                    for node in mat.node_tree.nodes:
                        if node.type == "NORMAL_MAP" and hasattr(node, "inputs"):
                            strength = node.inputs.get("Strength")
                            if strength is not None:
                                baseline_key = _material_prop_key("surface_breakup", "base_strength")
                                if baseline_key not in node:
                                    node[baseline_key] = float(strength.default_value)
                                n = float(node[baseline_key])
                                n += self.normal_variation * offset
                                strength.default_value = min(2.0, max(0.15, n))

                _mark_material_processed(
                    mat,
                    "surface_breakup",
                    roughness_variation=float(self.roughness_variation),
                    hue_variation=float(self.hue_variation),
                    normal_variation=float(self.normal_variation),
                )
                touched += 1

        context.scene.fo4_surface_breakup_status = f"Surface breakup applied to {touched} material(s)"
        self.report({"INFO"}, context.scene.fo4_surface_breakup_status)
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=380)


class FO4_OT_ApplyContactRealism(Operator):
    """Inject AO/contact darkening into selected mesh materials"""

    bl_idname = "fo4.apply_contact_realism"
    bl_label = "Apply Contact Realism"
    bl_options = {"REGISTER", "UNDO"}

    strength: FloatProperty(name="Contact Strength", default=0.45, min=0.0, max=1.0)

    def execute(self, context):
        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        mats_seen = set()
        modified = 0

        for obj in objs:
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or mat.name_full in mats_seen or not mat.use_nodes or not mat.node_tree:
                    continue
                mats_seen.add(mat.name_full)

                nt = mat.node_tree
                principled = _find_principled_bsdf(mat)
                if not principled:
                    continue

                ao_node = _ensure_tagged_node(
                    nt,
                    "contact_realism.ao",
                    "ShaderNodeAmbientOcclusion",
                    (principled.location.x - 520, principled.location.y - 180),
                )

                ramp = _ensure_tagged_node(
                    nt,
                    "contact_realism.ramp",
                    "ShaderNodeValToRGB",
                    (principled.location.x - 320, principled.location.y - 180),
                )
                ramp.color_ramp.elements[0].position = max(0.0, 0.45 - self.strength * 0.35)
                ramp.color_ramp.elements[1].position = min(1.0, 0.75 + self.strength * 0.2)

                mix = _ensure_tagged_node(
                    nt,
                    "contact_realism.mix",
                    "ShaderNodeMixRGB",
                    (principled.location.x - 140, principled.location.y),
                )
                mix.blend_type = "MULTIPLY"
                mix.inputs[0].default_value = self.strength

                _ensure_mix_base_input(nt, principled, mix, (1.0, 1.0, 1.0, 1.0))
                _replace_input_link(nt, mix.inputs[2], ramp.outputs[0])
                _replace_input_link(nt, ramp.inputs[0], ao_node.outputs[0])
                _replace_input_link(nt, principled.inputs["Base Color"], mix.outputs[0])
                _mark_material_processed(mat, "contact_realism", strength=float(self.strength))
                modified += 1

        context.scene.fo4_contact_realism_status = f"Contact realism pass updated {modified} material(s)"
        self.report({"INFO"}, context.scene.fo4_contact_realism_status)
        return {"FINISHED"}


class FO4_OT_ApplyEdgeRealismToolkit(Operator):
    """Apply edge wear/chip/rust masks using pointiness-driven shading"""

    bl_idname = "fo4.apply_edge_realism_toolkit"
    bl_label = "Apply Edge Realism Toolkit"
    bl_options = {"REGISTER", "UNDO"}

    preset: EnumProperty(
        name="Material Preset",
        items=[
            ("METAL", "Metal", "Steel/metal wear and rust accents"),
            ("PAINTED_METAL", "Painted Metal", "Paint chip style edge wear"),
            ("CONCRETE", "Concrete", "Dust/chalk edge lift"),
            ("WOOD", "Wood", "Dry/faded edge highlights"),
        ],
        default="METAL",
    )

    intensity: FloatProperty(name="Edge Intensity", default=0.55, min=0.0, max=1.0)

    def execute(self, context):
        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        preset_colors = {
            "METAL": (0.42, 0.19, 0.08, 1.0),
            "PAINTED_METAL": (0.62, 0.60, 0.58, 1.0),
            "CONCRETE": (0.72, 0.71, 0.67, 1.0),
            "WOOD": (0.58, 0.47, 0.34, 1.0),
        }

        mats_seen = set()
        modified = 0

        for obj in objs:
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or mat.name_full in mats_seen or not mat.use_nodes or not mat.node_tree:
                    continue
                mats_seen.add(mat.name_full)

                nt = mat.node_tree
                principled = _find_principled_bsdf(mat)
                if not principled:
                    continue

                geom = _ensure_tagged_node(
                    nt,
                    "edge_realism.geometry",
                    "ShaderNodeNewGeometry",
                    (principled.location.x - 600, principled.location.y - 220),
                )

                ramp = _ensure_tagged_node(
                    nt,
                    "edge_realism.ramp",
                    "ShaderNodeValToRGB",
                    (principled.location.x - 390, principled.location.y - 220),
                )
                ramp.color_ramp.elements[0].position = max(0.0, 0.6 - self.intensity * 0.45)
                ramp.color_ramp.elements[1].position = min(1.0, 0.95)

                mix = _ensure_tagged_node(
                    nt,
                    "edge_realism.mix",
                    "ShaderNodeMixRGB",
                    (principled.location.x - 150, principled.location.y + 40),
                )
                mix.inputs[0].default_value = self.intensity
                mix.inputs[2].default_value = preset_colors[self.preset]

                _ensure_mix_base_input(nt, principled, mix, (0.7, 0.7, 0.7, 1.0))
                _replace_input_link(nt, ramp.inputs[0], geom.outputs["Pointiness"])
                _replace_input_link(nt, mix.inputs[0], ramp.outputs[0])
                _replace_input_link(nt, principled.inputs["Base Color"], mix.outputs[0])

                rough = principled.inputs.get("Roughness")
                if rough:
                    _ensure_material_prop(
                        mat,
                        "edge_realism",
                        "base_roughness",
                        float(rough.default_value),
                    )
                    base_rough = float(
                        _get_material_prop(
                            mat,
                            "edge_realism",
                            "base_roughness",
                            float(rough.default_value),
                        )
                    )
                    rough.default_value = min(0.95, max(0.2, base_rough + 0.08 * self.intensity))

                _mark_material_processed(
                    mat,
                    "edge_realism",
                    preset=self.preset,
                    intensity=float(self.intensity),
                )
                modified += 1

        context.scene.fo4_edge_realism_status = f"Edge realism ({self.preset}) applied to {modified} material(s)"
        self.report({"INFO"}, context.scene.fo4_edge_realism_status)
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=380)


class FO4_OT_ApplyDecalLayering(Operator):
    """Apply layered decal blending (grime/leaks/scratches/dust)"""

    bl_idname = "fo4.apply_decal_layering"
    bl_label = "Apply Decal Layering"
    bl_options = {"REGISTER", "UNDO"}

    blend_preset: EnumProperty(
        name="Decal Type",
        items=[
            ("GRIME", "Grime", "Broad dirt buildup"),
            ("LEAKS", "Leaks", "Directional leak marks"),
            ("SCRATCHES", "Scratches", "High-frequency wear marks"),
            ("DUST", "Dust", "Soft dust accumulation"),
        ],
        default="GRIME",
    )

    density: FloatProperty(name="Density", default=0.45, min=0.0, max=1.0)

    def execute(self, context):
        scene = context.scene
        decal_image = scene.fo4_decal_image
        if not decal_image:
            self.report({"ERROR"}, "Choose a decal image first")
            return {"CANCELLED"}

        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}

        tint_map = {
            "GRIME": (0.28, 0.25, 0.22, 1.0),
            "LEAKS": (0.18, 0.18, 0.16, 1.0),
            "SCRATCHES": (0.76, 0.76, 0.74, 1.0),
            "DUST": (0.64, 0.61, 0.55, 1.0),
        }

        mats_seen = set()
        modified = 0

        for obj in objs:
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or mat.name_full in mats_seen or not mat.use_nodes or not mat.node_tree:
                    continue
                mats_seen.add(mat.name_full)

                nt = mat.node_tree
                principled = _find_principled_bsdf(mat)
                if not principled:
                    continue

                tex = _ensure_tagged_node(
                    nt,
                    "decal_layering.texture",
                    "ShaderNodeTexImage",
                    (principled.location.x - 520, principled.location.y + 170),
                )
                tex.image = decal_image

                tint = _ensure_tagged_node(
                    nt,
                    "decal_layering.tint",
                    "ShaderNodeRGB",
                    (principled.location.x - 520, principled.location.y + 20),
                )
                tint.outputs[0].default_value = tint_map[self.blend_preset]

                multiply = _ensure_tagged_node(
                    nt,
                    "decal_layering.multiply",
                    "ShaderNodeMixRGB",
                    (principled.location.x - 300, principled.location.y + 95),
                )
                multiply.blend_type = "MULTIPLY"
                multiply.inputs[0].default_value = self.density

                mix = _ensure_tagged_node(
                    nt,
                    "decal_layering.mix",
                    "ShaderNodeMixRGB",
                    (principled.location.x - 120, principled.location.y),
                )
                mix.blend_type = "MIX"
                mix.inputs[0].default_value = self.density

                _ensure_mix_base_input(nt, principled, mix, (1.0, 1.0, 1.0, 1.0))

                _replace_input_link(nt, multiply.inputs[1], tex.outputs["Color"])
                _replace_input_link(nt, multiply.inputs[2], tint.outputs[0])
                _replace_input_link(nt, mix.inputs[2], multiply.outputs[0])
                if tex.outputs.get("Alpha") is not None:
                    _replace_input_link(nt, mix.inputs[0], tex.outputs["Alpha"])
                else:
                    _connect_or_set(mix.inputs[0], self.density)

                _replace_input_link(nt, principled.inputs["Base Color"], mix.outputs[0])
                _mark_material_processed(
                    mat,
                    "decal_layering",
                    blend_preset=self.blend_preset,
                    density=float(self.density),
                    decal_image=decal_image.name_full,
                )
                modified += 1

        scene.fo4_decal_status = f"Decal layering ({self.blend_preset}) applied to {modified} material(s)"
        self.report({"INFO"}, scene.fo4_decal_status)
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=380)


class FO4_OT_RunRealismQAScorecard(Operator):
    """Run objective realism checks and optionally auto-fix common issues"""

    bl_idname = "fo4.run_realism_qa_scorecard"
    bl_label = "Run Realism QA"
    bl_options = {"REGISTER", "UNDO"}

    auto_fix: BoolProperty(
        name="Auto-fix safe issues",
        default=False,
    )

    def execute(self, context):
        objs = list(_iter_selected_mesh_objects(context))
        if not objs:
            objs = [o for o in context.scene.objects if o.type == "MESH"]
        if not objs:
            self.report({"ERROR"}, "No mesh objects available for QA")
            return {"CANCELLED"}

        issues = {
            "scale": 0,
            "roughness": 0,
            "normal_strength": 0,
            "uv": 0,
            "uv_stretch": 0,
            "repetition": 0,
            "emissive": 0,
        }
        fixed = 0
        image_usage = {}

        for obj in objs:
            max_dim = max(float(obj.dimensions.x), float(obj.dimensions.y), float(obj.dimensions.z), 0.0)
            if max_dim < 0.01 or max_dim > 250.0:
                issues["scale"] += 1
            if not obj.data.uv_layers:
                issues["uv"] += 1
                if self.auto_fix:
                    try:
                        obj.data.uv_layers.new(name="UVMap")
                        fixed += 1
                    except Exception:
                        pass
            else:
                stretch = _estimate_uv_stretch(obj)
                if stretch:
                    tri_count = max(1, int(stretch["triangles"]))
                    severe_outliers = int(stretch["stretched"]) >= max(8, int(tri_count * 0.35))
                    has_degenerate = int(stretch["degenerate"]) > 0
                    if severe_outliers or has_degenerate:
                        issues["uv_stretch"] += 1
                        if self.auto_fix and _auto_fix_uv_stretch(obj):
                            fixed += 1

            for slot in obj.material_slots:
                mat = slot.material
                if not mat or not mat.use_nodes or not mat.node_tree:
                    continue

                principled = _find_principled_bsdf(mat)
                if principled:
                    rough = principled.inputs.get("Roughness")
                    if rough and (rough.default_value < 0.05 or rough.default_value > 0.95):
                        issues["roughness"] += 1
                        if self.auto_fix:
                            rough.default_value = min(0.9, max(0.12, rough.default_value))
                            fixed += 1

                    e_strength = principled.inputs.get("Emission Strength")
                    if e_strength and e_strength.default_value > 8.0:
                        issues["emissive"] += 1
                        if self.auto_fix:
                            e_strength.default_value = 4.0
                            fixed += 1

                for node in mat.node_tree.nodes:
                    if node.type == "NORMAL_MAP":
                        strength = node.inputs.get("Strength")
                        if strength and strength.default_value > 2.0:
                            issues["normal_strength"] += 1
                            if self.auto_fix:
                                strength.default_value = 1.25
                                fixed += 1
                    if node.type == "TEX_IMAGE" and getattr(node, "image", None):
                        name = node.image.name_full
                        image_usage[name] = image_usage.get(name, 0) + 1

        issues["repetition"] = sum(1 for _, count in image_usage.items() if count >= 6)
        total_issues = sum(issues.values())
        score = max(0, 100 - min(90, total_issues * 5))
        grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D"

        summary = (
            f"Score:{score} ({grade}) | Scale:{issues['scale']} | Rough:{issues['roughness']} | "
            f"Normal:{issues['normal_strength']} | UV:{issues['uv']} | UVStretch:{issues['uv_stretch']} | "
            f"Repeat:{issues['repetition']} | "
            f"Emissive:{issues['emissive']} | Fixed:{fixed}"
        )
        context.scene.fo4_realism_qa_status = summary
        self.report({"INFO"}, summary)
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

        tex_bytes = 0
        for img in unique_images:
            size = getattr(img, "size", [0, 0])
            w = max(1, int(size[0] or 0))
            h = max(1, int(size[1] or 0))
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
        scene = context.scene
        has_mesh = bool(context.active_object and context.active_object.type == "MESH")

        preview_box = layout.box()
        preview_box.label(text="1) Game-Look + Reference Match", icon="HIDE_OFF")
        row = preview_box.row(align=True)
        row.operator("fo4.apply_game_look_preview", text="Apply Preset", icon="RESTRICT_RENDER_OFF")
        row.operator("fo4.reset_game_look_preview", text="Reset", icon="LOOP_BACK")
        preview_box.prop(scene, "fo4_reference_kind", text="Reference Type")
        preview_box.prop(scene, "fo4_reference_image", text="Target Image")
        preview_box.operator("fo4.enable_reference_match_mode", text="Enable Reference Match", icon="IMAGE_REFERENCE")
        if scene.fo4_advanced_preview_status:
            preview_box.label(text=scene.fo4_advanced_preview_status, icon="INFO")
        if scene.fo4_reference_status:
            preview_box.label(text=scene.fo4_reference_status, icon="INFO")

        scale_box = layout.box()
        scale_box.label(text="2) Real-World Scale Validator", icon="DRIVER_DISTANCE")
        scale_box.prop(scene, "fo4_scale_asset_class", text="Asset Class")
        row = scale_box.row(align=True)
        row.operator("fo4.run_scale_validator", text="Audit", icon="VIEWZOOM").auto_fix = False
        row.operator("fo4.run_scale_validator", text="Auto-Fix", icon="TOOL_SETTINGS").auto_fix = True
        if scene.fo4_scale_status:
            scale_box.label(text=scene.fo4_scale_status, icon="CHECKMARK")

        material_box = layout.box()
        material_box.label(text="3) Material Intelligence + Response Tester", icon="MATERIAL")
        row = material_box.row(align=True)
        op = row.operator("fo4.run_material_intelligence", text="Audit", icon="VIEWZOOM")
        op.auto_fix = False
        row = material_box.row(align=True)
        row.enabled = has_mesh
        op = row.operator("fo4.run_material_intelligence", text="Auto-Fix Selected", icon="TOOL_SETTINGS")
        op.auto_fix = True
        material_box.operator("fo4.run_material_response_tester", text="Lighting Sweep", icon="LIGHT_SUN")
        if scene.fo4_material_intel_status:
            material_box.label(text=scene.fo4_material_intel_status, icon="CHECKMARK")
        if scene.fo4_material_response_status:
            material_box.label(text=scene.fo4_material_response_status, icon="INFO")

        breakup_box = layout.box()
        breakup_box.label(text="4) Surface/Contact/Edge Realism", icon="MOD_NOISE")
        breakup_box.operator("fo4.apply_surface_breakup", text="Apply Surface Breakup", icon="MOD_DISPLACE")
        breakup_box.operator("fo4.apply_contact_realism", text="Apply Contact Pass", icon="SHADING_RENDERED")
        breakup_box.operator("fo4.apply_edge_realism_toolkit", text="Apply Edge Toolkit", icon="MOD_BEVEL")
        if scene.fo4_surface_breakup_status:
            breakup_box.label(text=scene.fo4_surface_breakup_status, icon="DOT")
        if scene.fo4_contact_realism_status:
            breakup_box.label(text=scene.fo4_contact_realism_status, icon="DOT")
        if scene.fo4_edge_realism_status:
            breakup_box.label(text=scene.fo4_edge_realism_status, icon="DOT")

        decal_box = layout.box()
        decal_box.label(text="5) Decal Layering", icon="OUTLINER_OB_IMAGE")
        decal_box.prop(scene, "fo4_decal_image", text="Decal Image")
        decal_box.operator("fo4.apply_decal_layering", text="Apply Decal Layer", icon="SEQ_PREVIEW")
        if scene.fo4_decal_status:
            decal_box.label(text=scene.fo4_decal_status, icon="INFO")

        qa_box = layout.box()
        qa_box.label(text="6) Realism QA Scorecard", icon="CHECKMARK")
        row = qa_box.row(align=True)
        row.operator("fo4.run_realism_qa_scorecard", text="Run QA", icon="VIEWZOOM").auto_fix = False
        row.operator("fo4.run_realism_qa_scorecard", text="Run + Auto-Fix", icon="TOOL_SETTINGS").auto_fix = True
        if scene.fo4_realism_qa_status:
            for line in scene.fo4_realism_qa_status.split(" | "):
                qa_box.label(text=line, icon="DOT")

        perf_box = layout.box()
        perf_box.label(text="7) In-Editor Performance Estimate", icon="SEQ_LUMA_WAVEFORM")
        perf_box.operator("fo4.estimate_scene_performance", text="Estimate", icon="GRAPH")
        if scene.fo4_performance_estimate:
            for line in scene.fo4_performance_estimate.split(" | "):
                perf_box.label(text=line, icon="DOT")


classes = (
    FO4_OT_ApplyGameLookPreview,
    FO4_OT_ResetGameLookPreview,
    FO4_OT_EnableReferenceMatchMode,
    FO4_OT_RunScaleValidator,
    FO4_OT_RunMaterialIntelligence,
    FO4_OT_RunMaterialResponseTester,
    FO4_OT_ApplySurfaceBreakup,
    FO4_OT_ApplyContactRealism,
    FO4_OT_ApplyEdgeRealismToolkit,
    FO4_OT_ApplyDecalLayering,
    FO4_OT_RunRealismQAScorecard,
    FO4_OT_EstimateScenePerformance,
    FO4_PT_AdvancedRealismPanel,
)


def register():
    bpy.types.Scene.fo4_advanced_preview_status = StringProperty(
        name="FO4 Advanced Preview Status",
        default="",
    )
    bpy.types.Scene.fo4_reference_status = StringProperty(
        name="FO4 Reference Match Status",
        default="",
    )
    bpy.types.Scene.fo4_reference_kind = EnumProperty(
        name="Reference Kind",
        items=[
            ("GAME_CAPTURE", "Game Capture", "Match game screenshot style"),
            ("PHOTO", "Photo", "Match real-world photo style"),
        ],
        default="GAME_CAPTURE",
    )
    bpy.types.Scene.fo4_reference_image = PointerProperty(
        name="Reference Image",
        type=bpy.types.Image,
    )
    bpy.types.Scene.fo4_scale_asset_class = EnumProperty(
        name="Asset Class",
        items=[
            ("PROP", "Prop", "General medium-sized assets"),
            ("CHARACTER", "Character", "Character or creature scale"),
            ("ARCHITECTURE", "Architecture", "Buildings/large structures"),
            ("CLUTTER", "Clutter", "Small tabletop clutter"),
            ("WEAPON", "Weapon", "Weapons and handheld tools"),
        ],
        default="PROP",
    )
    bpy.types.Scene.fo4_scale_status = StringProperty(name="FO4 Scale Status", default="")
    bpy.types.Scene.fo4_material_intel_status = StringProperty(
        name="FO4 Material Intelligence Status",
        default="",
    )
    bpy.types.Scene.fo4_material_response_status = StringProperty(
        name="FO4 Material Response Status",
        default="",
    )
    bpy.types.Scene.fo4_surface_breakup_status = StringProperty(
        name="FO4 Surface Breakup Status",
        default="",
    )
    bpy.types.Scene.fo4_contact_realism_status = StringProperty(
        name="FO4 Contact Realism Status",
        default="",
    )
    bpy.types.Scene.fo4_edge_realism_status = StringProperty(
        name="FO4 Edge Realism Status",
        default="",
    )
    bpy.types.Scene.fo4_decal_image = PointerProperty(
        name="Decal Image",
        type=bpy.types.Image,
    )
    bpy.types.Scene.fo4_decal_status = StringProperty(
        name="FO4 Decal Layering Status",
        default="",
    )
    bpy.types.Scene.fo4_realism_qa_status = StringProperty(
        name="FO4 Realism QA Status",
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
        "fo4_reference_status",
        "fo4_reference_kind",
        "fo4_reference_image",
        "fo4_scale_asset_class",
        "fo4_scale_status",
        "fo4_material_intel_status",
        "fo4_material_response_status",
        "fo4_surface_breakup_status",
        "fo4_contact_realism_status",
        "fo4_edge_realism_status",
        "fo4_decal_image",
        "fo4_decal_status",
        "fo4_realism_qa_status",
        "fo4_performance_estimate",
    ):
        if hasattr(bpy.types.Scene, p):
            delattr(bpy.types.Scene, p)
