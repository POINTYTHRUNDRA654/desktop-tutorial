"""
fo4_advanced_materials.py
=========================
Advanced Fallout 4 material and BGSM setup for photorealistic mods.

Material presets
----------------
PLANT_LEAF           — translucent/subsurface leaf material
                       FO4 BGSM: translucency=True, backLighting=True
                       Gives leaves the glowing, light-through effect
                       Essential for realistic carnivorous plant visuals

PLANT_BARK           — parallax occlusion bark / woody material
                       FO4 BGSM: parallax=True, tessellate=False
                       Depth and texture without extra geometry

PLANT_FLESH          — fleshy/organic inner surface (trap interior)
                       FO4 BGSM: translucency=True, wetness controls
                       For the wet, glistening inside of a trap

ENVIRONMENT_MAPPED   — shiny / reflective surface
                       FO4 BGSM: environmentMapping=True, envMapScale

GLOW_ORGANIC         — bioluminescent / glowing organic
                       FO4 BGSM: emitEnabled=True, glowmap=True
                       For luminescent plants, fungi, alien vegetation

WEATHERED_METAL      — corroded metal with wetness
                       FO4 BGSM: wetnessControl enabled

SKIN_TINT            — NPC skin material base
                       FO4 BGSM: skinTint=True, face=True

FO4 BGSM shader flags reference
---------------------------------
translucency             — light passes through thin surfaces (leaves)
backLighting             — back-face lighting (reverse lighting on thin geo)
emitEnabled              — surface emits light (glow)
glowmap                  — uses _g.dds as emissive glow mask
environmentMapping       — cube map environment reflections
modelSpaceNormals        — use model-space normals instead of tangent-space
specularEnabled          — Phong specular highlight
skinTint                 — applies NPC skin tint color
hair                     — hair shader mode
tessellate               — tessellation/displacement (needs displacement map)
pbr                      — PBR mode (not widely supported in vanilla FO4)
wetnessControlScreenSpaceScale — wetness / wet-surface effects
"""

from __future__ import annotations

import os

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, FloatProperty,
        EnumProperty, FloatVectorProperty,
    )
except ImportError:
    bpy      = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]


# ── BGSM flag presets ─────────────────────────────────────────────────────────

_PRESETS = {
    "PLANT_LEAF": {
        "label":       "Plant Leaf (Translucent)",
        "description": "Translucent leaf material — light passes through, "
                       "back-lighting enabled. Essential for realistic foliage.",
        "bgsm_flags": {
            "translucency":                   True,
            "translucencyThickObject":        False,   # thin leaf
            "translucencyMixAlbedoWithSubsurface": True,
            "backLighting":                   True,
            "specularEnabled":                True,
            "zBufferWrite":                   True,
            "zBufferTest":                    True,
            "receiveShadows":                 True,
            "castShadows":                    True,
            "tree":                           True,    # use tree/foliage shader
            "environmentMapping":             False,
            "emitEnabled":                    False,
        },
        "values": {
            "smoothness":           0.25,   # leaves are slightly waxy
            "specularMult":         0.6,
            "fresnelPower":         5.0,
            "translucencyTransmissiveScale": 0.65,
            "translucencySubsurfaceColor":   (0.2, 0.6, 0.1),   # green SSS
            "translucencyTurbulence": 0.1,
        },
        "blender_viewport": {
            "blend_method":   'HASHED',
            "show_transparent_back": True,
        },
    },

    "PLANT_FLESH": {
        "label":       "Plant Flesh (Trap Interior)",
        "description": "Wet, fleshy organic surface for trap interiors, "
                       "digestive surfaces, alien vegetation.",
        "bgsm_flags": {
            "translucency":                   True,
            "translucencyThickObject":        True,    # thick flesh
            "backLighting":                   False,
            "specularEnabled":                True,
            "wetnessControlScreenSpaceScale": True,
            "wetnessControlHemisphere":       True,
            "wetnessControlSpecularPower":    True,
            "environmentMapping":             True,    # slight wet reflection
            "zBufferWrite":                   True,
            "zBufferTest":                    True,
            "receiveShadows":                 True,
            "castShadows":                    True,
        },
        "values": {
            "smoothness":             0.75,   # very smooth/wet
            "specularMult":           1.2,
            "fresnelPower":           3.0,
            "wetnessControlEnvMapScale": 0.4,
            "translucencyTransmissiveScale": 0.3,
            "translucencySubsurfaceColor": (0.5, 0.1, 0.05),   # reddish flesh
            "translucencyTurbulence": 0.2,
        },
        "blender_viewport": {"blend_method": 'OPAQUE'},
    },

    "PLANT_BARK": {
        "label":       "Plant Bark (Parallax)",
        "description": "Rough bark / woody stem material with parallax depth. "
                       "Gives realistic depth without extra geometry.",
        "bgsm_flags": {
            "specularEnabled":      True,
            "environmentMapping":   False,
            "translucency":         False,
            "backLighting":         False,
            "receiveShadows":       True,
            "castShadows":          True,
        },
        "values": {
            "smoothness":           0.1,    # rough bark
            "specularMult":         0.3,
            "fresnelPower":         8.0,
        },
        "blender_viewport": {"blend_method": 'OPAQUE'},
    },

    "GLOW_ORGANIC": {
        "label":       "Glow Organic (Bioluminescent)",
        "description": "Glowing organic material — bioluminescent plants, "
                       "fungi, alien vegetation. Uses _g.dds as glow mask.",
        "bgsm_flags": {
            "emitEnabled":          True,
            "glowmap":              True,
            "specularEnabled":      True,
            "translucency":         True,
            "backLighting":         True,
            "receiveShadows":       True,
            "castShadows":          False,  # glowing objects usually don't cast shadows
        },
        "values": {
            "emittanceMult":        2.5,
            "emittanceColor":       (0.3, 1.0, 0.4),  # green glow
            "smoothness":           0.5,
            "specularMult":         0.8,
        },
        "blender_viewport": {"blend_method": 'HASHED'},
    },

    "ENVIRONMENT_MAPPED": {
        "label":       "Environment Mapped (Reflective)",
        "description": "Shiny surface with cube-map environment reflections. "
                       "For chitin, shells, wet stone, polished surfaces.",
        "bgsm_flags": {
            "environmentMapping":   True,
            "specularEnabled":      True,
            "receiveShadows":       True,
            "castShadows":          True,
        },
        "values": {
            "smoothness":           0.85,
            "specularMult":         1.5,
            "fresnelPower":         2.0,
        },
        "blender_viewport": {"blend_method": 'OPAQUE'},
    },

    "WEATHERED_METAL": {
        "label":       "Weathered Metal (Wet/Corroded)",
        "description": "Corroded metal with wetness and screen-space reflections. "
                       "For post-apocalyptic props and structures.",
        "bgsm_flags": {
            "specularEnabled":                True,
            "environmentMapping":             True,
            "wetnessControlScreenSpaceScale": True,
            "wetnessControlFresnelPower":     True,
            "wetnessControlMetalness":        True,
            "receiveShadows":                 True,
            "castShadows":                    True,
        },
        "values": {
            "smoothness":                  0.35,
            "specularMult":                1.1,
            "fresnelPower":                4.0,
            "wetnessControlEnvMapScale":   0.6,
            "wetnessControlFresnelPower":  3.0,
            "wetnessControlMetalness":     0.8,
        },
        "blender_viewport": {"blend_method": 'OPAQUE'},
    },

    "SKIN_TINT": {
        "label":       "Skin / Face Material",
        "description": "NPC skin material with tint support and face shader flags.",
        "bgsm_flags": {
            "skinTint":             True,
            "face":                 True,
            "specularEnabled":      True,
            "backLighting":         False,
            "environmentMapping":   False,
            "receiveShadows":       True,
            "castShadows":          True,
        },
        "values": {
            "smoothness":           0.3,
            "specularMult":         0.7,
            "fresnelPower":         5.0,
        },
        "blender_viewport": {"blend_method": 'OPAQUE'},
    },
}


# ── Material builder ──────────────────────────────────────────────────────────

def apply_advanced_material_preset(mat, preset_id: str) -> list:
    """
    Apply an advanced FO4 material preset to *mat*.

    Sets:
    - Custom properties (read by bgsm_helpers.blender_mat_to_bgsm())
    - Viewport settings for preview
    - Principled BSDF adjustments to approximate the in-game look

    Returns list of actions taken.
    """
    preset = _PRESETS.get(preset_id)
    if not preset:
        return [f"Unknown preset: {preset_id}"]

    actions = [f"Applying preset: {preset['label']}"]

    mat.use_nodes = True

    # ── Store BGSM flags as custom properties ────────────────────────────────
    for flag, val in preset.get("bgsm_flags", {}).items():
        mat[f"fo4_bgsm_{flag}"] = val
    mat["fo4_material_preset"] = preset_id
    actions.append(f"BGSM flags set: {list(preset['bgsm_flags'].keys())}")

    # ── Store float/color values ─────────────────────────────────────────────
    for key, val in preset.get("values", {}).items():
        mat[f"fo4_bgsm_{key}"] = val

    # ── Update Blender viewport settings ─────────────────────────────────────
    vp = preset.get("blender_viewport", {})
    for k, v in vp.items():
        try:
            setattr(mat, k, v)
        except Exception:
            pass

    # ── Adjust Principled BSDF to preview the effect ─────────────────────────
    principled = next(
        (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None
    )
    if principled:
        vals = preset.get("values", {})

        # Roughness = 1 - smoothness
        smoothness = vals.get("smoothness", 0.5)
        principled.inputs["Roughness"].default_value = 1.0 - smoothness

        # Specular
        spec_mult = vals.get("specularMult", 0.5)
        if "Specular IOR Level" in principled.inputs:
            principled.inputs["Specular IOR Level"].default_value = min(spec_mult, 1.0)
        elif "Specular" in principled.inputs:
            principled.inputs["Specular"].default_value = min(spec_mult, 1.0)

        # Emission for glow presets
        if preset.get("bgsm_flags", {}).get("emitEnabled"):
            emit_color = vals.get("emittanceColor", (1.0, 1.0, 1.0))
            emit_mult  = vals.get("emittanceMult", 1.0)
            if "Emission Color" in principled.inputs:
                principled.inputs["Emission Color"].default_value = (*emit_color, 1.0)
                principled.inputs["Emission Strength"].default_value = emit_mult
            elif "Emission" in principled.inputs:
                principled.inputs["Emission"].default_value = (*emit_color, 1.0)

        # Translucency / SSS
        if preset.get("bgsm_flags", {}).get("translucency"):
            sss_color = vals.get("translucencySubsurfaceColor", (0.5, 0.5, 0.5))
            sss_scale = vals.get("translucencyTransmissiveScale", 0.5)
            if "Subsurface Weight" in principled.inputs:
                principled.inputs["Subsurface Weight"].default_value = sss_scale * 0.5
                principled.inputs["Subsurface Color"].default_value = (*sss_color, 1.0)
            elif "Subsurface" in principled.inputs:
                principled.inputs["Subsurface"].default_value = sss_scale * 0.5

        actions.append("Principled BSDF adjusted for preview")

    return actions


def setup_leaf_material(mat, base_color=(0.15, 0.45, 0.08)) -> list:
    """
    Full setup of a leaf material: preset + correct Principled BSDF node graph.
    Optimized for carnivorous plant leaves.
    """
    actions = apply_advanced_material_preset(mat, "PLANT_LEAF")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    principled = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if principled:
        principled.inputs["Base Color"].default_value = (*base_color, 1.0)
        principled.inputs["Roughness"].default_value  = 0.75
        # Translucent glow-through on back face
        if "Alpha" in principled.inputs:
            principled.inputs["Alpha"].default_value = 0.85

    actions.append("Leaf material ready — assign _d, _n, _s, _g textures")
    return actions


def setup_trap_flesh_material(mat) -> list:
    """Setup the fleshy interior of the carnivorous plant trap."""
    actions = apply_advanced_material_preset(mat, "PLANT_FLESH")
    mat.use_nodes = True
    principled = next(
        (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None
    )
    if principled:
        principled.inputs["Base Color"].default_value = (0.6, 0.08, 0.05, 1.0)
        principled.inputs["Roughness"].default_value  = 0.25
        if "Sheen Weight" in principled.inputs:
            principled.inputs["Sheen Weight"].default_value = 0.3
    actions.append("Trap flesh material ready")
    return actions


# ══════════════════════════════════════════════════════════════════════════════
# Operators
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ApplyAdvancedMaterial(Operator):
    """
    Apply an advanced FO4 material preset to all materials on the selected mesh.

    Sets the correct BGSM flags as custom properties (bgsm_helpers reads these)
    and adjusts the Blender viewport material to preview the in-game effect.
    """
    bl_idname  = "fo4.apply_advanced_material"
    bl_label   = "Apply Advanced FO4 Material Preset"
    bl_description = (
        "Apply an advanced FO4 BGSM material preset — translucent leaves, "
        "glow organic, parallax bark, environment mapped surfaces, and more."
    )
    bl_options = {'REGISTER', 'UNDO'}

    preset: EnumProperty(
        name="Material Preset",
        items=[(pid, data["label"], data["description"])
               for pid, data in _PRESETS.items()],
        default="PLANT_LEAF",
    )
    all_materials: BoolProperty(
        name="Apply to All Materials",
        description="Apply to every material on the active object. "
                    "Uncheck to apply only to the active material slot.",
        default=True,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=440)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset")
        layout.prop(self, "all_materials")
        preset_data = _PRESETS.get(self.preset, {})
        if preset_data:
            box = layout.box()
            box.label(text=preset_data.get("description", ""), icon='INFO')

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first.")
            return {'CANCELLED'}

        slots = obj.material_slots if self.all_materials else \
                [obj.material_slots[obj.active_material_index]] \
                if obj.material_slots else []

        if not slots:
            self.report({'WARNING'}, "Object has no material slots.")
            return {'CANCELLED'}

        total_actions = []
        for slot in slots:
            mat = slot.material
            if not mat:
                continue
            actions = apply_advanced_material_preset(mat, self.preset)
            total_actions.extend(actions)

        for a in total_actions:
            self.report({'INFO'}, a)
        self.report({'INFO'},
            f"Preset '{_PRESETS[self.preset]['label']}' applied to "
            f"{len([s for s in slots if s.material])} material(s). "
            "Export BGSM to save material settings to file.")
        return {'FINISHED'}


class FO4_OT_SetupCarnivorousPlantMaterials(Operator):
    """
    One-click full material setup for a carnivorous plant.

    Detects material slots by name and assigns the correct preset:
      • 'leaf' / 'frond' / 'outside' → PLANT_LEAF (translucent)
      • 'flesh' / 'inside' / 'trap'  → PLANT_FLESH (wet organic)
      • 'stem' / 'bark' / 'stalk'    → PLANT_BARK  (rough parallax)
      • 'glow' / 'biolum'            → GLOW_ORGANIC

    If no matching name found, all unmapped materials get PLANT_LEAF.
    """
    bl_idname  = "fo4.setup_carnivorous_plant_materials"
    bl_label   = "Setup Carnivorous Plant Materials"
    bl_description = (
        "Auto-assign correct FO4 material presets to a carnivorous plant mesh — "
        "leaf translucency, fleshy trap interior, bark, optional glow."
    )
    bl_options = {'REGISTER', 'UNDO'}

    leaf_color: FloatVectorProperty(
        name="Leaf Base Color",
        description="Base color for leaf material",
        default=(0.15, 0.45, 0.08),
        subtype='COLOR', min=0.0, max=1.0, size=3,
    )
    add_glow: BoolProperty(
        name="Add Glow (Bioluminescent)",
        description="Add glow/emissive properties if glow material slots detected",
        default=False,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select the plant mesh first.")
            return {'CANCELLED'}

        name_to_preset = {
            "leaf": "PLANT_LEAF",   "frond": "PLANT_LEAF",
            "outside": "PLANT_LEAF", "canopy": "PLANT_LEAF",
            "flesh": "PLANT_FLESH", "inside": "PLANT_FLESH",
            "trap": "PLANT_FLESH",  "digest": "PLANT_FLESH",
            "stem": "PLANT_BARK",   "bark": "PLANT_BARK",
            "stalk": "PLANT_BARK",  "wood": "PLANT_BARK",
            "root": "PLANT_BARK",   "vine": "PLANT_BARK",
            "glow": "GLOW_ORGANIC", "biolum": "GLOW_ORGANIC",
            "luminesc": "GLOW_ORGANIC",
        }

        assigned = []
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            name_l = mat.name.lower()
            preset = next(
                (v for k, v in name_to_preset.items() if k in name_l),
                "PLANT_LEAF"   # default
            )
            if preset == "GLOW_ORGANIC" and not self.add_glow:
                preset = "PLANT_LEAF"

            if preset == "PLANT_LEAF":
                setup_leaf_material(mat, tuple(self.leaf_color))
            elif preset == "PLANT_FLESH":
                setup_trap_flesh_material(mat)
            else:
                apply_advanced_material_preset(mat, preset)

            assigned.append(f"  {mat.name} → {_PRESETS[preset]['label']}")

        self.report({'INFO'},
            f"Carnivorous plant materials set on {len(assigned)} slot(s):\n"
            + "\n".join(assigned))
        return {'FINISHED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ApplyAdvancedMaterial,
    FO4_OT_SetupCarnivorousPlantMaterials,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[Adv Materials] Could not register {cls.__name__}: {e}")
    print("[Adv Materials] Advanced FO4 materials registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
