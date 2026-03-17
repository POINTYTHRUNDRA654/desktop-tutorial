"""
Fallout 4 Material Preset Browser
==================================
Pre-built Blender material configurations for the most common Fallout 4
surface types.  Every preset creates a correctly structured Blender node
graph that is compatible with the Niftools NIF exporter:

- Texture nodes are named "Diffuse", "Normal", "Specular", "Glow" so the
  Niftools slot-detection code maps them onto the right NIF texture slots.
- Principled BSDF is wired identically to ``texture_helpers.setup_fo4_material``.
- PBR values (roughness, metallic, base colour) are tuned to match the
  vanilla FO4 look when no textures are loaded yet.

Usage (Python scripting workspace)
-----------------------------------
>>> from fo4_material_browser import MaterialBrowser
>>> ok, msg = MaterialBrowser.apply_preset(bpy.context.active_object, "RUSTY_METAL")
>>> print(msg)
Applied material preset 'Rusted Metal' to MyObject

Creation Kit mapping
---------------------
The material ID written into the ``fo4_mat_preset`` scene property is also
inserted as the ``fo4_material_preset`` custom property on the object so it
can be read by export scripts that generate ``.bgsm`` stubs.
"""

import bpy

# ---------------------------------------------------------------------------
# Material preset definitions
# ---------------------------------------------------------------------------
# Each entry is a dict with:
#   label        – human-readable name shown in the UI
#   description  – tooltip
#   base_color   – (R, G, B) linear sRGB base colour hint
#   roughness    – 0 = mirror, 1 = fully rough
#   metallic     – 0 = dielectric, 1 = conductor
#   alpha_mode   – 'OPAQUE', 'CLIP', 'BLEND'
#   alpha_threshold – cutoff for CLIP mode
#   emission_strength – 0 = no emission
#   two_sided    – True = disable backface culling
#   fo4_shader   – hint for .bgsm generation: 'default', 'eye', 'skin',
#                  'hair', 'parallax', 'env', 'glowmap', 'multilayer'
#   texture_hint – suggested texture name suffix pattern (informational)
# ---------------------------------------------------------------------------

PRESETS: dict = {
    # ── Metals ───────────────────────────────────────────────────────────────
    "RUSTY_METAL": {
        "label":             "Rusted Metal",
        "description":       "Heavily weathered iron/steel with rust patches",
        "base_color":        (0.22, 0.12, 0.08),
        "roughness":         0.85,
        "metallic":          0.5,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "CLEAN_METAL": {
        "label":             "Clean Metal",
        "description":       "Polished or lightly scratched steel / aluminium",
        "base_color":        (0.55, 0.55, 0.58),
        "roughness":         0.35,
        "metallic":          1.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "GALVANIZED_METAL": {
        "label":             "Galvanized Metal",
        "description":       "Pre-war zinc-coated corrugated steel",
        "base_color":        (0.65, 0.65, 0.60),
        "roughness":         0.55,
        "metallic":          0.8,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "VAULT_METAL": {
        "label":             "Vault-Tec Metal",
        "description":       "Vault yellow-painted steel panelling",
        "base_color":        (0.68, 0.55, 0.05),
        "roughness":         0.50,
        "metallic":          0.6,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Concrete & Stone ─────────────────────────────────────────────────────
    "CRACKED_CONCRETE": {
        "label":             "Cracked Concrete",
        "description":       "Post-apocalyptic weathered/cracked concrete",
        "base_color":        (0.35, 0.33, 0.30),
        "roughness":         0.90,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "SMOOTH_CONCRETE": {
        "label":             "Smooth Concrete",
        "description":       "Poured / trowelled indoor concrete",
        "base_color":        (0.45, 0.44, 0.42),
        "roughness":         0.80,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "STONE": {
        "label":             "Stone / Brick",
        "description":       "Natural stone or brick masonry",
        "base_color":        (0.30, 0.25, 0.20),
        "roughness":         0.95,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "ASPHALT": {
        "label":             "Asphalt / Tarmac",
        "description":       "Weathered road surface",
        "base_color":        (0.10, 0.10, 0.10),
        "roughness":         0.95,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Wood ─────────────────────────────────────────────────────────────────
    "WOOD_PLANK": {
        "label":             "Wood Plank",
        "description":       "Aged, rough-sawn timber planks",
        "base_color":        (0.25, 0.18, 0.10),
        "roughness":         0.85,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "WOOD_PANEL": {
        "label":             "Wood Panel",
        "description":       "Pre-war smooth wood panelling (interior)",
        "base_color":        (0.32, 0.22, 0.12),
        "roughness":         0.70,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Glass ────────────────────────────────────────────────────────────────
    "GLASS_CLEAR": {
        "label":             "Glass (Clear)",
        "description":       "Transparent clear glass",
        "base_color":        (0.70, 0.80, 0.85),
        "roughness":         0.05,
        "metallic":          0.0,
        "alpha_mode":        "BLEND",
        "alpha_threshold":   0.1,
        "emission_strength": 0.0,
        "two_sided":         True,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "GLASS_BROKEN": {
        "label":             "Glass (Broken / Frosted)",
        "description":       "Cracked or frosted glass panel",
        "base_color":        (0.75, 0.80, 0.80),
        "roughness":         0.40,
        "metallic":          0.0,
        "alpha_mode":        "CLIP",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         True,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Plastic / Rubber ─────────────────────────────────────────────────────
    "HARD_PLASTIC": {
        "label":             "Hard Plastic",
        "description":       "Pre-war consumer-grade hard plastic (white/cream)",
        "base_color":        (0.75, 0.72, 0.65),
        "roughness":         0.55,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "RUBBER": {
        "label":             "Rubber / Tyre",
        "description":       "Weathered rubber – tyres, belts, gaskets",
        "base_color":        (0.06, 0.06, 0.06),
        "roughness":         0.95,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Fabric ───────────────────────────────────────────────────────────────
    "FABRIC_CLOTH": {
        "label":             "Cloth Fabric",
        "description":       "Woven cloth – clothing, curtains, bags",
        "base_color":        (0.35, 0.30, 0.25),
        "roughness":         1.0,
        "metallic":          0.0,
        "alpha_mode":        "CLIP",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         True,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "LEATHER": {
        "label":             "Leather",
        "description":       "Worn leather – armour padding, upholstery",
        "base_color":        (0.18, 0.10, 0.06),
        "roughness":         0.75,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Skin / Organic ───────────────────────────────────────────────────────
    "HUMAN_SKIN": {
        "label":             "Human Skin",
        "description":       "Subsurface-scattering-like skin for NPCs",
        "base_color":        (0.60, 0.38, 0.27),
        "roughness":         0.65,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "skin",
        "texture_hint":      "_d, _n, _s (use multilayer shader in CK)",
    },
    "GHOUL_SKIN": {
        "label":             "Ghoul Skin",
        "description":       "Heavily scarred / necrotic feral ghoul skin",
        "base_color":        (0.35, 0.25, 0.18),
        "roughness":         0.90,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "skin",
        "texture_hint":      "_d, _n, _s",
    },
    # ── Emissive / Special ───────────────────────────────────────────────────
    "NEON_LIGHT": {
        "label":             "Neon Light",
        "description":       "Glowing neon tube (emissive mesh light)",
        "base_color":        (0.0, 0.8, 1.0),
        "roughness":         0.5,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 5.0,
        "two_sided":         True,
        "fo4_shader":        "glowmap",
        "texture_hint":      "_d (emissive), _g (glow mask)",
    },
    "TERMINAL_SCREEN": {
        "label":             "Terminal Screen",
        "description":       "CRT computer terminal screen – green phosphor glow",
        "base_color":        (0.0, 0.05, 0.0),
        "roughness":         0.1,
        "metallic":          0.0,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 3.0,
        "two_sided":         False,
        "fo4_shader":        "glowmap",
        "texture_hint":      "_d (screen art), _g (glow mask)",
    },
    "HOLOTAPE": {
        "label":             "Holotape / Holographic",
        "description":       "Translucent holographic projection surface",
        "base_color":        (0.3, 0.8, 1.0),
        "roughness":         0.0,
        "metallic":          0.0,
        "alpha_mode":        "BLEND",
        "alpha_threshold":   0.2,
        "emission_strength": 2.0,
        "two_sided":         True,
        "fo4_shader":        "glowmap",
        "texture_hint":      "_d (projection), _g (glow)",
    },
    "POWER_ARMOR_PAINT": {
        "label":             "Power Armor Paint",
        "description":       "T-60 / X-01 military power armor plating",
        "base_color":        (0.28, 0.35, 0.22),
        "roughness":         0.45,
        "metallic":          0.7,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
    "PIPBOY_PAINT": {
        "label":             "Pip-Boy Green Paint",
        "description":       "Pip-Boy 3000 Mk IV painted metal surface",
        "base_color":        (0.15, 0.45, 0.12),
        "roughness":         0.60,
        "metallic":          0.4,
        "alpha_mode":        "OPAQUE",
        "alpha_threshold":   0.5,
        "emission_strength": 0.0,
        "two_sided":         False,
        "fo4_shader":        "default",
        "texture_hint":      "_d, _n, _s",
    },
}

PRESET_ENUM_ITEMS = [
    (k, v["label"], v["description"])
    for k, v in PRESETS.items()
]


# ---------------------------------------------------------------------------
# Core helper class
# ---------------------------------------------------------------------------

class MaterialBrowser:
    """Pre-built FO4 material preset manager."""

    @staticmethod
    def get_preset(preset_id: str) -> dict:
        return PRESETS.get(preset_id, PRESETS["RUSTY_METAL"])

    @staticmethod
    def apply_preset(obj, preset_id: str) -> tuple[bool, str]:
        """Create (or replace) the FO4 material on *obj* using *preset_id*.

        The material is built with a Principled BSDF and the standard FO4
        texture node names (Diffuse, Normal, Specular, Glow) so the Niftools
        NIF exporter maps them to the correct texture slots automatically.

        Parameters
        ----------
        obj : bpy.types.Object
        preset_id : str  Key into :data:`PRESETS`.

        Returns
        -------
        (True, message) on success, (False, error) on failure.
        """
        if obj is None or obj.type != 'MESH':
            return False, "Select a mesh object first"

        preset = MaterialBrowser.get_preset(preset_id)

        try:
            mat = MaterialBrowser._build_material(obj.name, preset, preset_id)

            # Apply to the first material slot (or create one)
            if obj.data.materials:
                obj.data.materials[0] = mat
            else:
                obj.data.materials.append(mat)

            # Store preset ID as a custom property for export scripts
            obj["fo4_material_preset"] = preset_id

            # Set backface culling according to preset
            mat.use_backface_culling = not preset["two_sided"]

            label = preset["label"]
            return True, f"Applied material preset '{label}' to {obj.name}"

        except Exception as exc:
            return False, f"Failed to apply material preset: {exc}"

    @staticmethod
    def apply_preset_to_selection(context, preset_id: str) -> tuple[bool, str]:
        """Apply *preset_id* to every selected mesh object."""
        mesh_objects = [o for o in context.selected_objects if o.type == 'MESH']
        if not mesh_objects:
            return False, "No mesh objects selected"
        results = []
        for obj in mesh_objects:
            ok, msg = MaterialBrowser.apply_preset(obj, preset_id)
            results.append(msg)
        return True, f"Applied '{PRESETS[preset_id]['label']}' to {len(mesh_objects)} object(s)"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_material(obj_name: str, preset: dict, preset_id: str):
        """Build and return a Blender material from a preset dict."""
        mat_name = f"{obj_name}_FO4_{preset_id}"

        # Re-use existing material with this name if already present
        if mat_name in bpy.data.materials:
            bpy.data.materials.remove(bpy.data.materials[mat_name])

        mat = bpy.data.materials.new(name=mat_name)
        mat.use_nodes = True

        # Set alpha mode
        mat.blend_method = preset["alpha_mode"]
        if preset["alpha_mode"] == "CLIP":
            mat.alpha_threshold = preset["alpha_threshold"]

        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()

        # Output
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (600, 0)

        # Principled BSDF
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.location = (200, 0)
        bsdf.inputs['Base Color'].default_value = (*preset["base_color"], 1.0)
        bsdf.inputs['Roughness'].default_value = preset["roughness"]
        bsdf.inputs['Metallic'].default_value = preset["metallic"]

        # Emission
        if preset["emission_strength"] > 0:
            em_input = bsdf.inputs.get('Emission Strength') or bsdf.inputs.get('Emission')
            if em_input:
                em_input.default_value = preset["emission_strength"]
            em_color = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
            if em_color:
                em_color.default_value = (*preset["base_color"], 1.0)

        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

        # ── Standard FO4 texture nodes (Niftools-compatible naming) ─────────
        # Diffuse (_d)
        diff_tex = nodes.new('ShaderNodeTexImage')
        diff_tex.name  = "Diffuse"
        diff_tex.label = "Diffuse"
        diff_tex.location = (-400, 300)
        links.new(diff_tex.outputs['Color'], bsdf.inputs['Base Color'])
        if preset["alpha_mode"] in ("CLIP", "BLEND"):
            links.new(diff_tex.outputs['Alpha'], bsdf.inputs['Alpha'])

        # Normal map (_n)
        norm_tex = nodes.new('ShaderNodeTexImage')
        norm_tex.name  = "Normal"
        norm_tex.label = "Normal"
        norm_tex.location = (-400, 0)

        norm_map = nodes.new('ShaderNodeNormalMap')
        norm_map.location = (-100, 0)
        links.new(norm_tex.outputs['Color'], norm_map.inputs['Color'])
        links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])

        # Specular (_s)
        spec_tex = nodes.new('ShaderNodeTexImage')
        spec_tex.name  = "Specular"
        spec_tex.label = "Specular"
        spec_tex.location = (-400, -300)
        spec_input = (bsdf.inputs.get('Specular IOR Level')
                      or bsdf.inputs.get('Specular'))
        if spec_input:
            links.new(spec_tex.outputs['Color'], spec_input)

        # Glow / emissive mask (_g)
        glow_tex = nodes.new('ShaderNodeTexImage')
        glow_tex.name  = "Glow"
        glow_tex.label = "Glow"
        glow_tex.location = (-400, -600)
        if preset["emission_strength"] > 0:
            em_in = (bsdf.inputs.get('Emission Color')
                     or bsdf.inputs.get('Emission'))
            if em_in:
                links.new(glow_tex.outputs['Color'], em_in)

        # Store metadata as custom properties on the material
        mat["fo4_shader_type"]   = preset["fo4_shader"]
        mat["fo4_preset_id"]     = preset_id
        mat["fo4_texture_hint"]  = preset["texture_hint"]
        mat["fo4_two_sided"]     = preset["two_sided"]

        return mat


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.types.Scene.fo4_mat_preset = bpy.props.EnumProperty(
        name="Material Preset",
        description="Choose a Fallout 4 material type to apply",
        items=PRESET_ENUM_ITEMS,
        default="RUSTY_METAL",
    )
    bpy.types.Scene.fo4_mat_apply_all = bpy.props.BoolProperty(
        name="Apply to All Selected",
        description="Apply the preset to every selected mesh, not just the active one",
        default=True,
    )


def unregister():
    for prop in ("fo4_mat_preset", "fo4_mat_apply_all"):
        if hasattr(bpy.types.Scene, prop):
            try:
                delattr(bpy.types.Scene, prop)
            except Exception:
                pass
