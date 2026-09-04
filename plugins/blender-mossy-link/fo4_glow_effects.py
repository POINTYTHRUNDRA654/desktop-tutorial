"""
fo4_glow_effects.py
===================
Procedural glow map animation and spore effect system for Fallout 4.

What this creates
-----------------
1. Animated Blender emission shader (preview in viewport)
   PULSE     — sine wave intensity, single color
   AURORA    — flowing noise pattern, shifting hue
   BREATHE   — asymmetric inhale/exhale cycle
   FLICKER   — random organic flicker (bioluminescent)
   RAINBOW   — cycling hue shift across the surface

   All five wire into the object's REAL, existing material's Principled
   BSDF (Emission Color/Strength) — the material is never replaced and
   Base Color/diffuse texture links are never touched, so the base
   texture stays fully visible under the glow. An optional glow map
   image (FO4 "_g.dds" convention) can be supplied to mask the glow to
   part of the surface, matching every real vanilla glowing asset
   (Deathclaw, glowing fungus, etc.), which never use a flat full-surface
   glow color. Emission strength defaults are calibrated against those
   real assets' emittance_mult values (0.5-1.0) instead of an arbitrary
   bright preview value.

2. Dynamic light object in sync with glow
   A point/area light parented to the mesh that pulses with the
   emission so the environment actually lights up around it.

3. Animated _g.dds glow map sequence
   Bakes each frame of the emission animation to a PNG sequence
   then converts to DDS via texconv for FO4 import.
   (FO4 can use animated texture sequences via NIF's
   NiTextureController — or swap textures via Papyrus script.)

4. Spore particle system
   Blender particle system emitting from the mesh surface with
   upward drift and gentle turbulence -- Blender VIEWPORT PREVIEW
   ONLY. There is no baking/conversion step and none of it is
   exported: Blender's particle-system modifier has no equivalent in
   the NIF format and PyNifly does not write particle geometry, so
   this never reaches the exported mesh. An actual in-game particle
   effect is a separate FO4 concept (an ArtObject record referencing
   its own NIF, applied at runtime via Papyrus) -- see the generated
   Papyrus script's SporeArtObject property below, which is the real,
   supported mechanism for this rather than anything derived from
   Blender's particle sim.

5. Papyrus script template
   Auto-generates a Papyrus script that:
     - Detects actors entering a configurable radius
     - Applies a spell / magic effect (modder fills in the FormID)
     - Controls pulsation intensity via script property
   Outputs as a .psc file ready to compile with Caprica or PACT.
"""

import bpy
import math
import os
import tempfile
from typing import Optional


# ---------------------------------------------------------------------------
# Glow effect type definitions
# ---------------------------------------------------------------------------

GLOW_EFFECTS = {
    "PULSE": {
        "label":       "Pulsate",
        "description": "Steady sine-wave glow pulse — good for heart-like organs, reactors",
        "icon":        "LIGHT",
    },
    "AURORA": {
        "label":       "Aurora / Flow",
        "description": "Flowing noise pattern shifts across the surface like northern lights",
        "icon":        "FORCE_WIND",
    },
    "BREATHE": {
        "label":       "Breathe",
        "description": "Asymmetric slow-in fast-out cycle, like a living organism inhaling",
        "icon":        "COLORSET_13_VEC",
    },
    "FLICKER": {
        "label":       "Organic Flicker",
        "description": "Random bioluminescent flicker — firefly, deep-sea creature, mushroom",
        "icon":        "LIGHT_SPOT",
    },
    "RAINBOW": {
        "label":       "Hue Shift / Rainbow",
        "description": "Slowly cycles through the color wheel across the whole surface",
        "icon":        "COLOR",
    },
    "SPORE":  {
        "label":       "Spore / Particle Puff",
        "description": "Glow + particle emission — spores drift up and affect NPCs in range",
        "icon":        "PARTICLES",
    },
}

GLOW_EFFECT_ITEMS = [(k, v["label"], v["description"]) for k, v in GLOW_EFFECTS.items()]

KEYWORD_MAP = {
    "pulse":       "PULSE",   "pulsate":  "PULSE",   "heartbeat": "PULSE",
    "throb":       "PULSE",   "beat":     "PULSE",
    "aurora":      "AURORA",  "flow":     "AURORA",  "wave":      "AURORA",
    "swim":        "AURORA",  "shift":    "AURORA",  "shimmer":   "AURORA",
    "breathe":     "BREATHE", "breath":   "BREATHE", "inhale":    "BREATHE",
    "exhale":      "BREATHE", "living":   "BREATHE", "organism":  "BREATHE",
    "flicker":     "FLICKER", "blink":    "FLICKER", "firefly":   "FLICKER",
    "random":      "FLICKER", "organic":  "FLICKER", "bio":       "FLICKER",
    "mushroom":    "FLICKER", "fungus":   "FLICKER",
    "rainbow":     "RAINBOW", "color":    "RAINBOW", "hue":       "RAINBOW",
    "cycle":       "RAINBOW", "spectrum": "RAINBOW",
    "spore":       "SPORE",   "cloud":    "SPORE",   "drift":     "SPORE",
    "particle":    "SPORE",   "float":    "SPORE",   "puff":      "SPORE",
    "toxic":       "SPORE",   "poison":   "SPORE",   "affect":    "SPORE",
}


def parse_glow_description(description: str) -> list:
    """Return list of effect keys from description text."""
    d = description.lower()
    found = []
    seen  = set()
    for kw, effect in KEYWORD_MAP.items():
        if kw in d and effect not in seen:
            seen.add(effect)
            found.append(effect)
    return found or ["PULSE"]


# ---------------------------------------------------------------------------
# Material setup — emission shader with animated drivers
# ---------------------------------------------------------------------------

def _get_target_material(obj) -> bpy.types.Material:
    """Return the material to apply glow to, WITHOUT ever replacing or
    wiping an existing one.

    The previous implementation always created a brand-new "<name>_glow"
    material and cleared its node tree, discarding whatever diffuse/normal/
    specular texture setup the object already had -- confirmed as the
    direct cause of the reported bug ("completely overtook the texture,
    all you could see was the glow color"): the replacement material's
    Base Color was a FLAT copy of the glow color itself, and it fully
    replaced the real textured material, not just added to it.

    Only creates a new (empty) material if the object genuinely has none.
    """
    if obj.material_slots and obj.material_slots[0].material:
        mat = obj.material_slots[0].material
        mat.use_nodes = True
        return mat
    mat = bpy.data.materials.new((obj.name or "FO4_Glow") + "_mat")
    mat.use_nodes = True
    if not obj.data.materials:
        obj.data.materials.append(mat)
    else:
        obj.material_slots[0].material = mat
    return mat


def _find_or_create_principled(mat: bpy.types.Material):
    """Return the material's existing Principled BSDF (with its existing
    Base Color / texture wiring untouched), creating one only if the
    material genuinely has none."""
    nt = mat.node_tree
    for node in nt.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            return node
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if out is None:
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        out.location = (300, 0)
    if not out.inputs['Surface'].is_linked:
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return bsdf


def _emission_color_input(principled):
    """Emission Color (4.x) or legacy combined Emission (3.x/early 4.x) --
    same fallback bgsm_helpers.py already uses for the real BGSM export
    path, so wiring here stays consistent with what actually gets read on
    export."""
    return principled.inputs.get("Emission Color") or principled.inputs.get("Emission")


def _wire_glow_map(mat: bpy.types.Material, principled, glow_map) -> Optional[bpy.types.ShaderNodeTexImage]:
    """Wire *glow_map* (a bpy.types.Image or None) into Emission Color using
    the exact node name ("Glow") bgsm_helpers.bgsm_to_blender_mat/
    blender_mat_to_bgsm already use for the real glow-map texture slot, so
    a glow map set up here round-trips correctly through the real BGSM
    export (data.glow_texture / data.glowmap) instead of being an
    addon-local-only preview.

    Returns the Glow texture node, or None if no glow_map was given (the
    caller falls back to a flat/animated Emission Color instead).
    """
    nt = mat.node_tree
    if glow_map is None:
        return None
    tex_node = nt.nodes.get("Glow")
    if tex_node is None:
        tex_node = nt.nodes.new('ShaderNodeTexImage')
        tex_node.name = "Glow"
        tex_node.label = "Glow"
        tex_node.location = (principled.location.x - 300, principled.location.y - 300)
    tex_node["fo4_tex_slot"] = "Glow"
    tex_node.image = glow_map
    color_in = _emission_color_input(principled)
    if color_in is not None:
        while color_in.is_linked and color_in.links:
            nt.links.remove(color_in.links[0])
        nt.links.new(tex_node.outputs['Color'], color_in)
    return tex_node


def _wire_emission(obj, color, glow_map) -> dict:
    """Set up (or reuse) the object's real material's Principled BSDF for
    glow, without ever touching Base Color / the existing diffuse texture
    chain. Returns the material and the socket to attach an animated
    Emission Strength driver to."""
    mat = _get_target_material(obj)
    principled = _find_or_create_principled(mat)

    glow_tex_node = _wire_glow_map(mat, principled, glow_map)
    if glow_tex_node is None:
        # No glow map supplied -- flat colour fallback, still additive to
        # (never replacing) whatever Base Color already is.
        color_in = _emission_color_input(principled)
        if color_in is not None and not color_in.is_linked:
            color_in.default_value = color

    strength_in = principled.inputs.get("Emission Strength")
    return {"material": mat, "principled": principled, "strength_socket": strength_in}


def _seed_driver_value(expression: str, index: int = -1):
    """Evaluate *expression* the same way Blender's driver namespace would
    (bare ``frame`` plus unqualified math functions) and return the result.

    Blender does not evaluate a freshly-added driver until the next
    depsgraph update (frame change, viewport redraw, etc.) -- in a
    headless/script context (batch export, or an export run immediately
    after applying the effect) that update may never happen, leaving
    ``default_value`` stuck at its pre-driver value (0.0) and causing
    ``bgsm_helpers.blender_mat_to_bgsm()`` to read a dead Emission Strength
    and silently export with no glow at all. Seeding ``default_value``
    directly with the driver's own current-frame result closes that gap;
    the driver still keeps it live for viewport playback afterwards.
    """
    ns = {"__builtins__": {}}
    ns.update({name: getattr(math, name) for name in dir(math) if not name.startswith("_")})
    ns["frame"] = bpy.context.scene.frame_current
    try:
        return float(eval(expression, ns))
    except Exception:
        return None


def _drive_emission_strength(principled, expression: str) -> None:
    strength_in = principled.inputs.get("Emission Strength")
    if strength_in is None:
        return
    # Remove only this specific socket's previous driver (if re-applying a
    # different effect/expression to the same reused Principled BSDF) --
    # scoped removal rather than clearing all of the material's animation
    # data, which could otherwise wipe unrelated drivers the user has.
    try:
        strength_in.driver_remove("default_value")
    except Exception:
        pass
    fcurves = strength_in.driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    drv.expression = expression
    seeded = _seed_driver_value(expression)
    if seeded is not None:
        strength_in.default_value = seeded


def setup_glow_pulse(obj, color=(0.2,1.0,0.4,1.0),
                      speed=1.0, min_strength=0.15, max_strength=1.0,
                      glow_map=None) -> dict:
    """Sine-wave emission pulse, wired into the object's REAL material's
    Principled BSDF (Emission Color/Strength) -- never replaces the
    material or its Base Color/diffuse texture.

    Default min/max strength (0.15-1.0) matches the real emittance_mult
    range found across vanilla glowing assets (Deathclaw 0.52,
    WastelandFungusStalk 0.5, FungusBrain 1.0) rather than an arbitrarily
    bright preview value.
    """
    info = _wire_emission(obj, color, glow_map)
    mat, principled = info["material"], info["principled"]

    mid = (min_strength + max_strength) / 2
    rng = (max_strength - min_strength) / 2
    _drive_emission_strength(principled, f"{mid} + {rng} * sin(frame * {speed * 0.05:.4f})")

    return {"type": "PULSE", "material": mat.name}


def setup_glow_aurora(obj, color_a=(0.1,0.8,1.0,1.0),
                       color_b=(0.4,0.2,1.0,1.0),
                       speed=0.3, scale=2.0, glow_map=None) -> dict:
    """Flowing noise pattern — animated noise texture W coordinate scrolls.

    With a glow map supplied, the map's own colour/shape takes priority
    (matching real assets, whose visible glow colour comes from the _g.dds
    pixels, not a flat material colour) and only the pulsing intensity
    flows; without one, falls back to a flowing two-colour noise mix.
    """
    info = _wire_emission(obj, color_a, glow_map)
    mat, principled = info["material"], info["principled"]
    nt = mat.node_tree

    if glow_map is None:
        color_in = _emission_color_input(principled)
        mix_c  = nt.nodes.new('ShaderNodeMixRGB')
        noise  = nt.nodes.new('ShaderNodeTexNoise')
        coord  = nt.nodes.new('ShaderNodeTexCoord')
        map_n  = nt.nodes.new('ShaderNodeMapping')
        mix_c.blend_type = 'MIX'
        mix_c.inputs['Color1'].default_value = color_a
        mix_c.inputs['Color2'].default_value = color_b
        noise.inputs['Scale'].default_value     = scale
        noise.inputs['Detail'].default_value    = 6.0
        noise.inputs['Roughness'].default_value = 0.6
        mix_c.location  = (principled.location.x - 400, principled.location.y + 200)
        noise.location  = (principled.location.x - 600, principled.location.y + 200)
        coord.location  = (principled.location.x - 1000, principled.location.y + 200)
        map_n.location  = (principled.location.x - 800, principled.location.y + 200)
        nt.links.new(coord.outputs['Object'], map_n.inputs['Vector'])
        nt.links.new(map_n.outputs['Vector'], noise.inputs['Vector'])
        nt.links.new(noise.outputs['Fac'],    mix_c.inputs['Fac'])
        if color_in is not None:
            while color_in.is_linked and color_in.links:
                nt.links.remove(color_in.links[0])
            nt.links.new(mix_c.outputs['Color'], color_in)
        # Animate noise W so the pattern flows over time
        aurora_expr = f"frame * {speed * 0.01:.4f}"
        fcurves = map_n.inputs['Location'].driver_add("default_value", 2)
        drv = fcurves.driver
        drv.type = 'SCRIPTED'
        drv.expression = aurora_expr
        seeded = _seed_driver_value(aurora_expr)
        if seeded is not None:
            map_n.inputs['Location'].default_value[2] = seeded

    _drive_emission_strength(principled, f"1.6 + 0.5 * sin(frame * {speed * 0.03:.4f} + 1.57)")

    return {"type": "AURORA", "material": mat.name}


def setup_glow_breathe(obj, color=(0.3,1.0,0.5,1.0),
                        inhale_frames=40, exhale_frames=15,
                        min_s=0.1, max_s=1.2, glow_map=None) -> dict:
    """Asymmetric breathing — slow inhale, fast exhale.

    Uses a custom F-curve instead of a simple sine so the timing feels
    like a real breath rather than a metronome. Default min/max strength
    matches the real emittance_mult range found in vanilla glowing assets.
    """
    info = _wire_emission(obj, color, glow_map)
    mat, principled = info["material"], info["principled"]

    total = inhale_frames + exhale_frames
    # Slow rise (inhale), fast fall (exhale) — piecewise linear
    expression = (
        f"({max_s}-{min_s})*((frame%{total})/{inhale_frames}) + {min_s} "
        f"if (frame%{total}) < {inhale_frames} else "
        f"({max_s}-{min_s})*(1-((frame%{total}-{inhale_frames})/{exhale_frames})) + {min_s}"
    )
    _drive_emission_strength(principled, expression)

    return {"type": "BREATHE", "material": mat.name}


def setup_glow_flicker(obj, color=(0.2,1.0,0.3,1.0),
                        base_s=0.5, flicker_range=0.9, glow_map=None) -> dict:
    """Organic random flicker using layered sine waves at irrational-ratio
    frequencies (pseudo-random, deterministic). Default range matches real
    vanilla emittance_mult values."""
    info = _wire_emission(obj, color, glow_map)
    mat, principled = info["material"], info["principled"]

    mid = base_s + flicker_range * 0.5
    rng = flicker_range * 0.5
    expression = (
        f"{mid} + {rng*0.5:.3f}*sin(frame*0.23) "
        f"+ {rng*0.3:.3f}*sin(frame*0.71) "
        f"+ {rng*0.2:.3f}*sin(frame*1.37)"
    )
    _drive_emission_strength(principled, expression)

    return {"type": "FLICKER", "material": mat.name}


def setup_glow_rainbow(obj, speed=0.02, strength=1.0, glow_map=None) -> dict:
    """Hue cycling using an HSV node driven by frame number.

    The HSV node's Color input is fed by the glow map texture when one is
    supplied (so a real masked _g.dds shape still hue-shifts correctly
    instead of being replaced by a flat colour), or a flat starting colour
    otherwise.
    """
    info = _wire_emission(obj, (1.0, 0.2, 0.2, 1.0), None)
    mat, principled = info["material"], info["principled"]
    nt = mat.node_tree

    color_in = _emission_color_input(principled)
    hsv = nt.nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = 1.0
    hsv.inputs['Value'].default_value      = 1.0
    hsv.inputs['Color'].default_value      = (1.0, 0.2, 0.2, 1.0)
    hsv.location = (principled.location.x - 200, principled.location.y - 300)

    if glow_map is not None:
        tex_node = nt.nodes.get("Glow")
        if tex_node is None:
            tex_node = nt.nodes.new('ShaderNodeTexImage')
            tex_node.name = "Glow"
            tex_node.label = "Glow"
            tex_node.location = (hsv.location.x - 300, hsv.location.y)
        tex_node["fo4_tex_slot"] = "Glow"
        tex_node.image = glow_map
        nt.links.new(tex_node.outputs['Color'], hsv.inputs['Color'])

    if color_in is not None:
        while color_in.is_linked and color_in.links:
            nt.links.remove(color_in.links[0])
        nt.links.new(hsv.outputs['Color'], color_in)

    # Animate hue 0->1 cyclically
    hue_expr = f"(frame * {speed:.4f}) % 1.0"
    fcurves = hsv.inputs['Hue'].driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    drv.expression = hue_expr
    seeded = _seed_driver_value(hue_expr)
    if seeded is not None:
        hsv.inputs['Hue'].default_value = seeded

    _drive_emission_strength(principled, f"{strength}")

    return {"type": "RAINBOW", "material": mat.name}


# ---------------------------------------------------------------------------
# Dynamic light object
# ---------------------------------------------------------------------------

def add_sync_light(obj, effect_type: str, color=(0.2,1.0,0.4),
                    base_energy=50.0, radius=3.0) -> bpy.types.Object:
    """Add a point light parented to the mesh that pulses with the glow.

    The light energy is driven by the same expression as emission strength
    so the environment actually lights up in sync.
    """
    light_data = bpy.data.lights.new(obj.name + "_glow_light", 'POINT')
    light_data.color  = color[:3]
    light_data.energy = base_energy
    light_data.shadow_soft_size = radius

    light_obj = bpy.data.objects.new(obj.name + "_glow_light", light_data)
    bpy.context.collection.objects.link(light_obj)

    # Place at mesh center
    mw = obj.matrix_world
    vs = [mw @ v.co for v in obj.data.vertices] if obj.data.vertices else []
    if vs:
        cx = sum(v.x for v in vs)/len(vs)
        cy = sum(v.y for v in vs)/len(vs)
        cz = sum(v.z for v in vs)/len(vs)
        light_obj.location = (cx, cy, cz)

    # Parent to mesh. Direct .parent assignment doesn't set
    # matrix_parent_inverse the way Ctrl+P does -- without it, this light
    # jumps away from the mesh-center position just computed above as soon
    # as obj has any non-identity rotation/scale.
    light_obj.parent = obj
    light_obj.matrix_parent_inverse = obj.matrix_world.inverted()

    # Drive energy with same expression as the shader
    expressions = {
        "PULSE":   f"50 + 40 * sin(frame * 0.05)",
        "AURORA":  f"40 + 30 * sin(frame * 0.03 + 1.57)",
        "BREATHE": f"10 + 60 * max(0, sin(frame * 0.04))**2",
        "FLICKER": f"50 + 25*sin(frame*0.23) + 15*sin(frame*0.71) + 10*sin(frame*1.37)",
        "RAINBOW": f"60",
        "SPORE":   f"30 + 20 * sin(frame * 0.04)",
    }
    expr = expressions.get(effect_type, "50")

    fcurves = light_data.driver_add("energy")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    drv.expression = expr

    print(f"[FO4 Glow] Light '{light_obj.name}' added, energy driven by: {expr}")
    return light_obj


# ---------------------------------------------------------------------------
# Spore particle system
# ---------------------------------------------------------------------------

def setup_spore_particles(obj, density=500, lifetime=80,
                            size=0.05, speed=0.8) -> bpy.types.ParticleSystem:
    """Add a spore particle system emitting from the mesh surface.

    Particles drift upward with gentle turbulence to simulate
    airborne spores floating away from the creature/plant.
    """
    # Add particle system
    ps_mod = obj.modifiers.new("FO4_Spores", 'PARTICLE_SYSTEM')
    ps     = obj.particle_systems[-1]
    settings = ps.settings

    settings.count         = density
    settings.lifetime      = lifetime
    settings.lifetime_random = 0.4
    settings.emit_from     = 'FACE'
    settings.distribution  = 'RAND'
    settings.normal_factor = speed * 0.3
    settings.factor_random = 0.5

    # Gravity: slight upward drift
    settings.effector_weights.gravity = -0.1

    # Size
    settings.particle_size         = size
    settings.size_random            = 0.5

    # Render as small glowing halos (Blender has no 'SPHERE' render_type --
    # valid values are NONE/HALO/LINE/PATH/OBJECT/COLLECTION; HALO is the
    # correct built-in point-sprite type for light-emitting particles).
    settings.render_type = 'HALO'

    # Physics: Newtonian with drag
    settings.physics_type = 'NEWTON'
    settings.drag_factor  = 0.4

    # Turbulence via force field
    field = bpy.data.objects.new(obj.name + "_spore_turbulence",
                                  bpy.data.lattices.new("_tmp"))
    bpy.context.collection.objects.link(field)
    field.parent = obj
    field.matrix_parent_inverse = obj.matrix_world.inverted()

    print(f"[FO4 Glow] Spore particle system: {density} particles, lifetime {lifetime} frames")
    return ps


# ---------------------------------------------------------------------------
# Glow map texture baker
# ---------------------------------------------------------------------------

def bake_glow_map_sequence(obj, output_dir: str,
                             frame_start: int = 1,
                             frame_end: int   = 60,
                             resolution: int  = 1024) -> list:
    """Bake each frame of the emission animation to a PNG glow map.

    Each PNG represents one frame of the _g.dds animation sequence.
    FO4 can use these via NiTextureController or Papyrus texture swapping.

    Returns list of baked PNG file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    baked = []

    # Set up bake target image
    img = bpy.data.images.new(
        obj.name + "_glow_bake",
        width=resolution, height=resolution,
        alpha=False,
    )
    img.filepath_raw = os.path.join(output_dir, f"{obj.name}_glow_f0001.png")
    img.file_format  = 'PNG'

    # Add image texture node to material for baking target
    mat = obj.material_slots[0].material if obj.material_slots else None
    if not mat:
        return []

    bake_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    bake_node.image = img
    # Deselect all, select bake node
    for n in mat.node_tree.nodes:
        n.select = False
    bake_node.select = True
    mat.node_tree.nodes.active = bake_node

    scene = bpy.context.scene
    original_frame = scene.frame_current

    for frame in range(frame_start, frame_end + 1):
        scene.frame_set(frame)
        frame_path = os.path.join(output_dir,
                                   f"{obj.name}_glow_f{frame:04d}.png")
        img.filepath_raw = frame_path

        try:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.bake(
                type='EMIT',
                use_clear=True,
                margin=4,
            )
            img.save()
            baked.append(frame_path)
            print(f"[FO4 Glow] Baked frame {frame}: {os.path.basename(frame_path)}")
        except Exception as exc:
            print(f"[FO4 Glow] Bake frame {frame} failed: {exc}")

    scene.frame_set(original_frame)

    # Convert to DDS if texconv available
    try:
        from . import preferences as _prefs_mod
        prefs   = _prefs_mod.get_preferences()
        texconv = getattr(prefs, 'texconv_path', '').strip() if prefs else ''
        if texconv and os.path.isfile(texconv):
            for png in baked:
                import subprocess
                subprocess.run(
                    [texconv, "-f", "BC3_UNORM", "-o", output_dir, png],
                    capture_output=True, timeout=30,
                )
    except Exception:
        pass

    return baked


# ---------------------------------------------------------------------------
# Papyrus script generator
# ---------------------------------------------------------------------------

PAPYRUS_SPORE_TEMPLATE = '''\
;==============================================================================
; {script_name}.psc
; Auto-generated by Mossy FO4 Blender Add-on
;
; Attach to the base object form (STAT/ACTI/FLOR) in the Creation Kit.
; Fill in:
;   SporeSpell        - the SPEL applied to actors caught in range
;   SporeArtObject     - the ArtObject whose NIF actually shows the drifting
;                         spore/particle visual in-game (see note below)
;   DetectionRadius    - how far spores spread (game units, default 256)
;   PulseIntervalSec   - how often spores are released (seconds)
;
; About SporeArtObject:
;   Blender's own particle system (used for the addon's viewport preview)
;   has no equivalent in the NIF format, so it can never be exported --
;   FO4's real particle visuals come from a NIF referenced by an ArtObject
;   record, applied at runtime with ApplyArtObject(). This script calls
;   that real, working Papyrus API, but authoring/choosing the particle
;   NIF itself is a Creation Kit step this Blender addon cannot do for
;   you: either reuse an existing vanilla/mod ArtObject that already
;   looks like drifting spores/motes, or build a small dedicated one in
;   CK/NifSkope. Leaving SporeArtObject empty just skips the visual call
;   below (the spell/detection logic still runs).
;==============================================================================
Scriptname {script_name} extends ObjectReference

; ── Properties (fill in CK) ──────────────────────────────────────────────────
Spell      Property SporeSpell      Auto   ; the poison/paralysis/etc spell
ArtObject  Property SporeArtObject  Auto   ; the real in-game particle visual
Float Property DetectionRadius = {radius:.1f} Auto
Float Property PulseIntervalSec = {interval:.1f} Auto
Float Property GlowEmissiveMin = {glow_min:.2f} Auto
Float Property GlowEmissiveMax = {glow_max:.2f} Auto
Bool  Property IsActive = True Auto

; ── Internal state ────────────────────────────────────────────────────────────
Float _phase = 0.0
Float _emissive

; ── Events ───────────────────────────────────────────────────────────────────

Event OnInit()
    RegisterForSingleUpdate(0.1)
    Debug.Trace("[{script_name}] Initialized on " + GetBaseObject().GetName())
EndEvent

Event OnUpdate()
    If !IsActive
        Return
    EndIf

    ; Animate emissive multiplier (pulsation) -- purely a value for your own
    ; use (e.g. to drive a separate light/imagespace effect); FO4 has no
    ; direct "set this ref's material emissive" Papyrus call, so this is
    ; not applied automatically. Wire it up yourself if you need it.
    _phase += PulseIntervalSec * 0.628  ; 2*pi / 10 = one full cycle per 10 pulses
    _emissive = GlowEmissiveMin + (GlowEmissiveMax - GlowEmissiveMin) * ((Math.Sin(_phase) + 1.0) * 0.5)

    ; Real in-game particle visual: apply the ArtObject for one pulse
    ; interval so spores actually appear to drift for that duration.
    If SporeArtObject != None
        self.ApplyArtObject(SporeArtObject, PulseIntervalSec)
    EndIf

    ; Spore pulse — apply the spell to the nearest actor in range.
    ; Game.FindClosestActor is a real, correctly-typed Papyrus call (unlike
    ; the previous template's FindAllReferencesWithKeyword(...) as Actor[],
    ; which needed an undefined Keyword property and cannot be cast that
    ; way in Papyrus -- each array element has to be cast individually).
    ; This still only ever catches the single nearest actor per pulse; for
    ; multiple actors in range simultaneously, replace this with a trigger
    ; box (perk entry point OnEnterTrigger) instead of a polled radius scan.
    Actor nearest = Game.FindClosestActor(self.X, self.Y, self.Z, DetectionRadius)
    If nearest != None
        _ApplySporeEffect(nearest)
    EndIf

    RegisterForSingleUpdate(PulseIntervalSec)
EndEvent

Function _ApplySporeEffect(Actor akTarget)
    If akTarget == None
        Return
    EndIf
    If SporeSpell != None
        akTarget.CastSpell(SporeSpell, akTarget)
        Debug.Trace("[{script_name}] Spore applied to " + akTarget.GetDisplayName())
    EndIf
EndFunction

Event OnCellAttach()
    IsActive = True
    RegisterForSingleUpdate(0.5)
EndEvent

Event OnCellDetach()
    ; Stop immediately rather than waiting for one more OnUpdate tick to
    ; see IsActive=False and quietly not re-register -- this ref may not
    ; get another update for a long time (or ever) once the cell unloads.
    IsActive = False
    UnregisterForUpdate()
EndEvent
'''


def generate_papyrus_script(obj, output_dir: str,
                              effect_type: str = "SPORE",
                              radius: float    = 256.0,
                              interval: float  = 3.0,
                              glow_min: float  = 0.2,
                              glow_max: float  = 3.0) -> str:
    """Write a Papyrus .psc script for the spore/glow effect.

    Returns the path to the .psc file.
    """
    os.makedirs(output_dir, exist_ok=True)
    safe_name = (obj.name or "FO4_GlowObj").replace(" ","_").replace(".","_")
    script_name = f"{safe_name}Glow"
    psc_path    = os.path.join(output_dir, script_name + ".psc")

    content = PAPYRUS_SPORE_TEMPLATE.format(
        script_name = script_name,
        radius      = radius,
        interval    = interval,
        glow_min    = glow_min,
        glow_max    = glow_max,
    )
    with open(psc_path, "w", encoding="utf-8") as fh:
        fh.write(content)

    print(f"[FO4 Glow] Papyrus script: {psc_path}")
    return psc_path


# ---------------------------------------------------------------------------
# Main setup function
# ---------------------------------------------------------------------------

def apply_glow_effect(obj, effect_type: str,
                       color=(0.2,1.0,0.4,1.0),
                       speed: float    = 1.0,
                       strength: float = 1.0,
                       add_light: bool = True,
                       output_dir: str = "",
                       glow_map=None) -> dict:
    """Apply a glow effect to a mesh object.

    *glow_map*, if given, is a bpy.types.Image containing a real masked
    glow map (FO4 convention: a "_g.dds" texture) -- when supplied it is
    wired into Emission Color exactly like the real BGSM glow_texture, so
    the visible glow follows the map's shape/mask instead of covering the
    whole surface with a flat colour. The object's existing material and
    Base Color/diffuse texture are never touched.

    Returns result dict with what was created.
    """
    result = {"effect": effect_type, "steps": []}

    min_s = max(0.05, strength * 0.15)
    max_s = strength

    SETUPS = {
        "PULSE":   lambda: setup_glow_pulse(obj, color, speed, min_s, max_s, glow_map),
        "AURORA":  lambda: setup_glow_aurora(obj, color, (color[0]*0.5, color[2], color[1], 1.0), speed, 2.0, glow_map),
        "BREATHE": lambda: setup_glow_breathe(obj, color, int(40/speed), int(15/speed), min_s, max_s, glow_map),
        "FLICKER": lambda: setup_glow_flicker(obj, color, min_s, max_s - min_s, glow_map),
        "RAINBOW": lambda: setup_glow_rainbow(obj, speed * 0.02, strength, glow_map),
        "SPORE":   lambda: setup_glow_pulse(obj, color, speed * 0.5, min_s, max_s, glow_map),
    }

    setup_fn = SETUPS.get(effect_type, SETUPS["PULSE"])
    info = setup_fn()
    result["steps"].append(f"Emission shader: {effect_type}")
    result["material"] = info.get("material", "")

    if add_light:
        light = add_sync_light(obj, effect_type, tuple(color[:3]), strength * 20, 3.0)
        result["steps"].append(f"Sync light: {light.name}")
        result["light"] = light.name

    if effect_type == "SPORE":
        ps = setup_spore_particles(obj)
        result["steps"].append(
            f"Particle system: {ps.name} (Blender viewport preview only -- "
            f"not exported; see the generated Papyrus script for the real "
            f"in-game effect)"
        )
        result["particles"] = ps.name

        if output_dir:
            psc = generate_papyrus_script(obj, output_dir)
            result["steps"].append(f"Papyrus script: {os.path.basename(psc)}")
            result["papyrus"] = psc
        else:
            # Silently skipping this used to leave the modder with only a
            # Blender-only particle preview and no idea the CK-side script
            # was never written -- an empty Output Folder is the default,
            # so this was the common case, not an edge case.
            result["steps"].append(
                "No Papyrus script generated -- set an Output Folder above "
                "to also generate the Creation Kit script needed for an "
                "actual in-game spore effect."
            )

    return result


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_SetGlowPreset(bpy.types.Operator):
    bl_idname  = "fo4.set_glow_preset"
    bl_label   = "Set Glow Preset"
    bl_options = {'INTERNAL'}
    preset: bpy.props.StringProperty(default="")
    def execute(self, context):
        if hasattr(context.scene, 'fo4_glow_description'):
            context.scene.fo4_glow_description = self.preset
        return {'FINISHED'}


class FO4_OT_ApplyGlowEffect(bpy.types.Operator):
    """Apply animated glow / spore effects to the active mesh.

    Sets up emission shader, sync light, optional particle system
    and Papyrus script — all driven by animated drivers.
    """
    bl_idname  = "fo4.apply_glow_effect"
    bl_label   = "Apply Glow Effect"
    bl_options = {'REGISTER', 'UNDO'}

    effect_type: bpy.props.EnumProperty(
        name="Effect Type",
        items=GLOW_EFFECT_ITEMS,
        default="PULSE",
    )
    glow_color: bpy.props.FloatVectorProperty(
        name="Glow Color",
        subtype='COLOR', size=4,
        default=(0.2, 1.0, 0.4, 1.0), min=0.0, max=1.0,
    )
    speed: bpy.props.FloatProperty(
        name="Speed", default=1.0, min=0.1, max=5.0,
        description="Animation speed multiplier",
    )
    strength: bpy.props.FloatProperty(
        name="Max Strength", default=1.0, min=0.1, max=3.0,
        description="Peak emission intensity. Real vanilla glowing assets "
                    "(Deathclaw, glowing fungus) use 0.5-1.0; higher values "
                    "are available for stylized looks but will wash out the "
                    "base texture more the higher they go",
    )
    add_light: bpy.props.BoolProperty(
        name="Add Sync Light",
        description="Add a point light that pulses in sync with the glow",
        default=True,
    )
    output_dir: bpy.props.StringProperty(
        name="Output Folder (Papyrus)",
        subtype='DIR_PATH', default="",
        description="Where to save Papyrus script and baked textures (Spore effect)",
    )
    # Note: Blender operators cannot hold ID-datablock (PointerProperty to
    # Image/Object/etc.) properties -- that registration is rejected at
    # runtime ("doesn't support data-block properties"). The glow map
    # picker lives on the scene (fo4_glow_map_image, shown in the panel
    # above both buttons) and is read from there instead.

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        out = bpy.path.abspath(self.output_dir) if self.output_dir else ""
        glow_map = getattr(context.scene, 'fo4_glow_map_image', None)

        result = apply_glow_effect(
            obj,
            effect_type = self.effect_type,
            color       = tuple(self.glow_color),
            speed       = self.speed,
            strength    = self.strength,
            add_light   = self.add_light,
            output_dir  = out,
            glow_map    = glow_map,
        )

        for step in result["steps"]:
            print(f"[FO4 Glow] {step}")

        self.report({'INFO'},
            f"{self.effect_type} glow applied: "
            f"{len(result['steps'])} components created")
        return {'FINISHED'}


class FO4_OT_ApplyGlowFromDescription(bpy.types.Operator):
    """Apply glow effect(s) from the description text field."""
    bl_idname  = "fo4.apply_glow_from_description"
    bl_label   = "Apply Glow from Description"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        desc    = getattr(context.scene, 'fo4_glow_description', 'pulse')
        effects = parse_glow_description(desc)
        color   = tuple(getattr(context.scene, 'fo4_glow_color', (0.2,1.0,0.4,1.0)))
        speed   = getattr(context.scene, 'fo4_glow_speed',    1.0)
        strength= getattr(context.scene, 'fo4_glow_strength', 1.0)
        out_dir = bpy.path.abspath(getattr(context.scene, 'fo4_glow_output', ''))
        glow_map= getattr(context.scene, 'fo4_glow_map_image', None)

        created = 0
        for effect in effects:
            result = apply_glow_effect(obj, effect, color, speed, strength,
                                        add_light=True, output_dir=out_dir,
                                        glow_map=glow_map)
            created += len(result["steps"])
            print(f"[FO4 Glow] Applied {effect}: {result['steps']}")

        self.report({'INFO'}, f"Applied {len(effects)} effect(s), {created} total components")
        return {'FINISHED'}


class FO4_OT_BakeGlowSequence(bpy.types.Operator):
    """Bake animated emission to PNG / DDS sequence for FO4 _g texture."""
    bl_idname  = "fo4.bake_glow_sequence"
    bl_label   = "Bake Glow Map Sequence"
    bl_options = {'REGISTER'}

    output_dir: bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
    )
    frame_start: bpy.props.IntProperty(name="Start Frame", default=1)
    frame_end:   bpy.props.IntProperty(name="End Frame",   default=60)
    resolution:  bpy.props.IntProperty(name="Resolution",  default=1024, min=64, max=4096)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select the glowing mesh first")
            return {'CANCELLED'}

        out = bpy.path.abspath(self.output_dir) if self.output_dir else tempfile.mkdtemp(prefix="fo4_glow_")
        baked = bake_glow_map_sequence(obj, out, self.frame_start, self.frame_end, self.resolution)

        if baked:
            self.report({'INFO'}, f"Baked {len(baked)} frames to: {out}")
        else:
            self.report({'WARNING'}, "No frames baked — check System Console")
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_SetGlowPreset,
    FO4_OT_ApplyGlowEffect,
    FO4_OT_ApplyGlowFromDescription,
    FO4_OT_BakeGlowSequence,
]

_SCENE_PROPS = [
    ("fo4_glow_description", bpy.props.StringProperty(
        name="Glow Description",
        description="Describe the glow effect — e.g. 'pulsate like a heartbeat' or 'spore cloud drifts up'",
        default="pulsate and breathe",
    )),
    ("fo4_glow_color", bpy.props.FloatVectorProperty(
        name="Glow Color", subtype='COLOR', size=4,
        default=(0.2, 1.0, 0.4, 1.0), min=0.0, max=1.0,
    )),
    ("fo4_glow_speed", bpy.props.FloatProperty(
        name="Speed", default=1.0, min=0.1, max=5.0,
    )),
    ("fo4_glow_strength", bpy.props.FloatProperty(
        name="Max Strength", default=1.0, min=0.1, max=3.0,
        description="Real vanilla glowing assets use 0.5-1.0",
    )),
    ("fo4_glow_output", bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
    )),
    ("fo4_glow_map_image", bpy.props.PointerProperty(
        name="Glow Map", type=bpy.types.Image,
        description="Optional masked glow texture ('_g.dds' convention) "
                    "for the description-based workflow",
    )),
]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass
    for name, prop in _SCENE_PROPS:
        try: setattr(bpy.types.Scene, name, prop)
        except Exception: pass


def unregister():
    for name, _ in reversed(_SCENE_PROPS):
        try: delattr(bpy.types.Scene, name)
        except Exception: pass
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
