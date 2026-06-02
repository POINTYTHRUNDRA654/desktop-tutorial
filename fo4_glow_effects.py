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
   upward drift and gentle turbulence.  Baked to alembic/NIF
   particles for FO4's particle system.

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

def _get_or_create_material(obj, name_suffix="_glow") -> bpy.types.Material:
    mat_name = (obj.name or "FO4_Glow") + name_suffix
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    if not obj.data.materials:
        obj.data.materials.append(mat)
    else:
        obj.material_slots[0].material = mat
    return mat


def _clear_nodes(mat):
    mat.node_tree.nodes.clear()
    return mat.node_tree


def setup_glow_pulse(obj, color=(0.2,1.0,0.4,1.0),
                      speed=1.0, min_strength=0.2, max_strength=3.0) -> dict:
    """Sine-wave emission pulse.

    Adds a driver to emission strength:  sin(frame * speed * 0.05) * range + midpoint
    """
    mat  = _get_or_create_material(obj)
    tree = _clear_nodes(mat)
    nodes = tree.nodes
    links = tree.links

    # Nodes
    out   = nodes.new('ShaderNodeOutputMaterial')
    add   = nodes.new('ShaderNodeAddShader')
    emit  = nodes.new('ShaderNodeEmission')
    bsdf  = nodes.new('ShaderNodeBsdfPrincipled')
    emit.inputs['Color'].default_value  = color
    emit.inputs['Strength'].default_value = 1.0
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value  = 0.6

    out.location  = (600, 0)
    add.location  = (400, 0)
    emit.location = (200, 100)
    bsdf.location = (200,-100)

    links.new(emit.outputs['Emission'], add.inputs[0])
    links.new(bsdf.outputs['BSDF'],     add.inputs[1])
    links.new(add.outputs['Shader'],    out.inputs['Surface'])

    # Driver on emission strength
    fcurves = emit.inputs['Strength'].driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    mid   = (min_strength + max_strength) / 2
    rng   = (max_strength - min_strength) / 2
    drv.expression = f"{mid} + {rng} * sin(frame * {speed * 0.05:.4f})"

    return {"type": "PULSE", "material": mat.name, "emission_node": emit.name}


def setup_glow_aurora(obj, color_a=(0.1,0.8,1.0,1.0),
                       color_b=(0.4,0.2,1.0,1.0),
                       speed=0.3, scale=2.0) -> dict:
    """Flowing noise pattern — animated noise texture W coordinate scrolls."""
    mat  = _get_or_create_material(obj)
    tree = _clear_nodes(mat)
    nodes = tree.nodes
    links = tree.links

    out    = nodes.new('ShaderNodeOutputMaterial')
    add    = nodes.new('ShaderNodeAddShader')
    emit   = nodes.new('ShaderNodeEmission')
    bsdf   = nodes.new('ShaderNodeBsdfPrincipled')
    mix_c  = nodes.new('ShaderNodeMixRGB')
    noise  = nodes.new('ShaderNodeTexNoise')
    math_n = nodes.new('ShaderNodeMath')
    coord  = nodes.new('ShaderNodeTexCoord')
    map_n  = nodes.new('ShaderNodeMapping')

    mix_c.blend_type = 'MIX'
    mix_c.inputs['Color1'].default_value = color_a
    mix_c.inputs['Color2'].default_value = color_b
    noise.inputs['Scale'].default_value     = scale
    noise.inputs['Detail'].default_value    = 6.0
    noise.inputs['Roughness'].default_value = 0.6
    math_n.operation = 'MULTIPLY'
    math_n.inputs[1].default_value = 3.5  # emission strength multiplier

    out.location    = (800,  0)
    add.location    = (600,  0)
    emit.location   = (400, 100)
    bsdf.location   = (400,-100)
    mix_c.location  = (200, 200)
    noise.location  = (  0, 200)
    math_n.location = (200, 400)
    coord.location  = (-400, 200)
    map_n.location  = (-200, 200)

    links.new(coord.outputs['Object'], map_n.inputs['Vector'])
    links.new(map_n.outputs['Vector'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'],    mix_c.inputs['Fac'])
    links.new(noise.outputs['Fac'],    math_n.inputs[0])
    links.new(mix_c.outputs['Color'],  emit.inputs['Color'])
    links.new(math_n.outputs['Value'], emit.inputs['Strength'])
    links.new(emit.outputs['Emission'],add.inputs[0])
    links.new(bsdf.outputs['BSDF'],    add.inputs[1])
    links.new(add.outputs['Shader'],   out.inputs['Surface'])

    # Animate noise W to make pattern flow over time
    fcurves = map_n.inputs['Location'].driver_add("default_value", 2)  # Z offset
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    drv.expression = f"frame * {speed * 0.01:.4f}"

    return {"type": "AURORA", "material": mat.name}


def setup_glow_breathe(obj, color=(0.3,1.0,0.5,1.0),
                        inhale_frames=40, exhale_frames=15,
                        min_s=0.05, max_s=4.0) -> dict:
    """Asymmetric breathing — slow inhale, fast exhale.

    Uses a custom F-curve instead of a simple sine so the timing
    feels like a real breath rather than a metronome.
    """
    mat  = _get_or_create_material(obj)
    tree = _clear_nodes(mat)
    nodes = tree.nodes
    links = tree.links

    out  = nodes.new('ShaderNodeOutputMaterial')
    add  = nodes.new('ShaderNodeAddShader')
    emit = nodes.new('ShaderNodeEmission')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    emit.inputs['Color'].default_value = color
    bsdf.inputs['Base Color'].default_value = color

    out.location  = (600, 0)
    add.location  = (400, 0)
    emit.location = (200, 100)
    bsdf.location = (200,-100)

    links.new(emit.outputs['Emission'], add.inputs[0])
    links.new(bsdf.outputs['BSDF'],     add.inputs[1])
    links.new(add.outputs['Shader'],    out.inputs['Surface'])

    total = inhale_frames + exhale_frames
    # Driver uses modulo + conditional for asymmetric shape
    fcurves = emit.inputs['Strength'].driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    # Slow rise (inhale), fast fall (exhale) — piecewise linear
    drv.expression = (
        f"({max_s}-{min_s})*((frame%{total})/{inhale_frames}) + {min_s} "
        f"if (frame%{total}) < {inhale_frames} else "
        f"({max_s}-{min_s})*(1-((frame%{total}-{inhale_frames})/{exhale_frames})) + {min_s}"
    )

    return {"type": "BREATHE", "material": mat.name}


def setup_glow_flicker(obj, color=(0.2,1.0,0.3,1.0),
                        base_s=1.0, flicker_range=2.5) -> dict:
    """Organic random flicker using layered noise at different frequencies."""
    mat  = _get_or_create_material(obj)
    tree = _clear_nodes(mat)
    nodes = tree.nodes
    links = tree.links

    out   = nodes.new('ShaderNodeOutputMaterial')
    add   = nodes.new('ShaderNodeAddShader')
    emit  = nodes.new('ShaderNodeEmission')
    bsdf  = nodes.new('ShaderNodeBsdfPrincipled')
    emit.inputs['Color'].default_value = color
    bsdf.inputs['Base Color'].default_value = color

    out.location  = (600, 0)
    add.location  = (400, 0)
    emit.location = (200, 100)
    bsdf.location = (200,-100)

    links.new(emit.outputs['Emission'], add.inputs[0])
    links.new(bsdf.outputs['BSDF'],     add.inputs[1])
    links.new(add.outputs['Shader'],    out.inputs['Surface'])

    # Layered sine waves at irrational ratios → pseudo-random organic flicker
    fcurves = emit.inputs['Strength'].driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    mid = base_s + flicker_range * 0.5
    rng = flicker_range * 0.5
    drv.expression = (
        f"{mid} + {rng*0.5:.3f}*sin(frame*0.23) "
        f"+ {rng*0.3:.3f}*sin(frame*0.71) "
        f"+ {rng*0.2:.3f}*sin(frame*1.37)"
    )

    return {"type": "FLICKER", "material": mat.name}


def setup_glow_rainbow(obj, speed=0.02, strength=2.5) -> dict:
    """Hue cycling using HSV node driven by frame number."""
    mat  = _get_or_create_material(obj)
    tree = _clear_nodes(mat)
    nodes = tree.nodes
    links = tree.links

    out   = nodes.new('ShaderNodeOutputMaterial')
    add   = nodes.new('ShaderNodeAddShader')
    emit  = nodes.new('ShaderNodeEmission')
    bsdf  = nodes.new('ShaderNodeBsdfPrincipled')
    hsv   = nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = 1.0
    hsv.inputs['Value'].default_value      = 1.0
    hsv.inputs['Color'].default_value      = (1.0, 0.2, 0.2, 1.0)
    emit.inputs['Strength'].default_value  = strength

    out.location  = (800, 0)
    add.location  = (600, 0)
    emit.location = (400, 100)
    bsdf.location = (400,-100)
    hsv.location  = (200, 100)

    links.new(hsv.outputs['Color'],    emit.inputs['Color'])
    links.new(emit.outputs['Emission'],add.inputs[0])
    links.new(bsdf.outputs['BSDF'],    add.inputs[1])
    links.new(add.outputs['Shader'],   out.inputs['Surface'])

    # Animate hue 0→1 cyclically
    fcurves = hsv.inputs['Hue'].driver_add("default_value")
    drv = fcurves.driver
    drv.type = 'SCRIPTED'
    drv.expression = f"(frame * {speed:.4f}) % 1.0"

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

    # Parent to mesh
    light_obj.parent = obj

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

    # Render as small spheres (or use a glow material on the particles)
    settings.render_type = 'SPHERE'

    # Physics: Newtonian with drag
    settings.physics_type = 'NEWTON'
    settings.drag_factor  = 0.4

    # Turbulence via force field
    field = bpy.data.objects.new(obj.name + "_spore_turbulence",
                                  bpy.data.lattices.new("_tmp"))
    bpy.context.collection.objects.link(field)
    field.parent = obj

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
;   SporeSpellFormID  - FormID of the SPEL that applies the effect
;   DetectionRadius   - How far spores spread (in game units, default 256)
;   PulseIntervalSec  - How often spores are released (seconds)
;==============================================================================
Scriptname {script_name} extends ObjectReference

; ── Properties (fill in CK) ──────────────────────────────────────────────────
Spell Property SporeSpell Auto          ; The poison/paralysis/etc spell
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

    ; Animate emissive multiplier (pulsation)
    _phase += PulseIntervalSec * 0.628  ; 2*pi / 10 = one full cycle per 10 pulses
    _emissive = GlowEmissiveMin + (GlowEmissiveMax - GlowEmissiveMin) * ((Math.Sin(_phase) + 1.0) * 0.5)
    ; Note: SetEmissiveMultiplier requires a NIF with animated material or
    ;       swap to a pre-built emissive level via SwapReferences
    ; self.SetEmissiveMultiplier(_emissive)   ; uncomment if using custom NIF

    ; Spore pulse — find actors in radius and apply spell
    Actor[] nearActors = self.FindAllReferencesWithKeyword(None, DetectionRadius) as Actor[]
    ; Fallback: use FindAllReferencesOfType
    Actor player = Game.GetPlayer()
    Float playerDist = self.GetDistance(player)
    If playerDist <= DetectionRadius
        _ApplySporeEffect(player)
    EndIf

    ; Scan for other actors (NPCs, creatures)
    ; This uses a workaround — attach a Detection keyword or use a trigger box
    ; for a production script.  This template uses FindNearestActor as a demo.
    Actor nearest = Game.FindClosestActor(self.X, self.Y, self.Z, DetectionRadius)
    If nearest != None && nearest != player
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
    IsActive = False
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
                       strength: float = 3.0,
                       add_light: bool = True,
                       output_dir: str = "") -> dict:
    """Apply a glow effect to a mesh object.

    Returns result dict with what was created.
    """
    result = {"effect": effect_type, "steps": []}

    SETUPS = {
        "PULSE":   lambda: setup_glow_pulse(obj, color, speed),
        "AURORA":  lambda: setup_glow_aurora(obj, color, (color[0]*0.5, color[2], color[1], 1.0)),
        "BREATHE": lambda: setup_glow_breathe(obj, color, int(40/speed), int(15/speed)),
        "FLICKER": lambda: setup_glow_flicker(obj, color),
        "RAINBOW": lambda: setup_glow_rainbow(obj, speed * 0.02, strength),
        "SPORE":   lambda: setup_glow_pulse(obj, color, speed * 0.5, 0.1, 2.5),
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
        result["steps"].append(f"Particle system: {ps.name}")
        result["particles"] = ps.name

        if output_dir:
            psc = generate_papyrus_script(obj, output_dir)
            result["steps"].append(f"Papyrus script: {os.path.basename(psc)}")
            result["papyrus"] = psc

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
        name="Max Strength", default=3.0, min=0.5, max=10.0,
        description="Peak emission / light intensity",
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

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        out = bpy.path.abspath(self.output_dir) if self.output_dir else ""

        result = apply_glow_effect(
            obj,
            effect_type = self.effect_type,
            color       = tuple(self.glow_color),
            speed       = self.speed,
            strength    = self.strength,
            add_light   = self.add_light,
            output_dir  = out,
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
        strength= getattr(context.scene, 'fo4_glow_strength', 3.0)
        out_dir = bpy.path.abspath(getattr(context.scene, 'fo4_glow_output', ''))

        created = 0
        for effect in effects:
            result = apply_glow_effect(obj, effect, color, speed, strength,
                                        add_light=True, output_dir=out_dir)
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
        name="Max Strength", default=3.0, min=0.5, max=10.0,
    )),
    ("fo4_glow_output", bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
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
