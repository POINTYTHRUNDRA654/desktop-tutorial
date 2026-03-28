"""
Fallout 4 Havok Physics Properties  (animation_helper/havakphysics)
====================================================================
Per-object Havok rigid-body setup for correct Niftools NIF export.

Sub-module of ``animation_helper``.  Moved here from ``fo4_physics_helpers``
so that all animation-pipeline code lives under the same package tree.

Every solid prop in FO4 needs a ``bhkRigidBody`` in its NIF.  The Niftools
exporter generates this from Blender's rigid-body settings combined with
several custom object properties this module manages.

What this module does
---------------------
- Provides a ``PhysicsHelpers`` class with preset configurations for every
  common FO4 surface type (Metal, Stone, Wood, Organic, Glass, etc.).
- ``PhysicsHelpers.setup_rigid_body(obj, preset_id)`` configures Blender's
  built-in rigid-body system AND writes the extra Niftools custom properties
  that the NIF exporter reads (``fo4_layer``, ``fo4_motion_type``, etc.).

FO4 Havok collision layer cheat-sheet
--------------------------------------
| Layer ID | Name                   | Typical use                        |
|----------|------------------------|------------------------------------|
| 1  (L_STATIC)          | Static world geometry            |
| 2  (L_ANIMSTATIC)      | Animated static / doors          |
| 5  (L_BIPED)           | Player / NPCs / Power Armor      |
| 6  (L_CLUTTER)         | Clutter / small world items      |
| 7  (L_PROPS)           | Moveable props                   |
| 8  (L_DEBRIS_SMALL)    | Small debris / gibs              |
| 9  (L_HAVOK_LANDSCAPE) | Terrain / landscape mesh         |
| 10 (L_WATER)           | Water surface volumes            |
| 20 (L_FURNITURE)       | Furniture / activators           |
| 32 (L_WEAPON)          | Weapon projectiles               |
| 35 (L_TREES)           | Trees / foliage                  |
| 56 (L_CLOUD_TRAP)      | Trigger volumes / cloud traps    |

FO4 Havok motion types
-----------------------
FIXED          – permanently static (mass must be 0)
KEYFRAMED      – moved by animation / scripts (mass must be 0)
DYNAMIC        – fully simulated physics (needs positive mass)
SPHERE_INERTIA – simplified sphere inertia tensor (round props)
BOX_INERTIA    – simplified box inertia tensor (box-shaped props)
THIN_BOX       – thin flat objects (panels, plates)
CHARACTER      – character controller (bipeds, power armor)

Niftools custom property names (written by setup_rigid_body)
-------------------------------------------------------------
``fo4_collision_layer``  – integer layer ID
``fo4_motion_type``      – string motion type
``fo4_havok_mass``        – float (0 = fixed/keyframed)
``fo4_havok_friction``    – float 0–1
``fo4_havok_restitution`` – float 0–1
``fo4_havok_quality``     – string: 'FIXED', 'KEYFRAMED', 'DEBRIS', 'MOVING'
``fo4_collision_preset``  – string preset ID used (informational)
"""

from __future__ import annotations
import bpy

# ---------------------------------------------------------------------------
# Layer constants
# ---------------------------------------------------------------------------

LAYER_STATIC          =  1
LAYER_ANIMSTATIC      =  2
LAYER_BIPED           =  5
LAYER_CLUTTER         =  6
LAYER_PROPS           =  7
LAYER_DEBRIS_SMALL    =  8
LAYER_LANDSCAPE       =  9
LAYER_WATER           = 10
LAYER_FURNITURE       = 20
LAYER_WEAPON          = 32
LAYER_TREES           = 35
LAYER_CLOUD_TRAP      = 56

# ---------------------------------------------------------------------------
# Preset definitions
# ---------------------------------------------------------------------------
# Each preset supplies:
#   label          – shown in UI
#   description    – tooltip
#   layer          – Havok collision layer (int)
#   motion_type    – 'FIXED' | 'KEYFRAMED' | 'DYNAMIC'
#   quality        – 'FIXED' | 'KEYFRAMED' | 'DEBRIS' | 'MOVING'
#   mass           – float (0 = fixed/keyframed)
#   friction       – float 0–1
#   restitution    – float 0–1 (bounciness; FO4 static = 0.1)
#   linear_damping – float 0–1
#   angular_damping– float 0–1
#   blender_type   – 'PASSIVE' or 'ACTIVE' for bpy.ops.rigidbody.object_add
# ---------------------------------------------------------------------------

PRESETS: dict = {
    # ── Static / world geometry ───────────────────────────────────────────
    "STATIC_METAL": {
        "label":           "Static Metal",
        "description":     "Immoveable metal object (container, wall panel, locker)",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.8,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "STATIC_STONE": {
        "label":           "Static Stone / Concrete",
        "description":     "Immoveable stone, brick, or concrete object",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.9,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "STATIC_WOOD": {
        "label":           "Static Wood",
        "description":     "Immoveable wooden object (floor, crate, furniture)",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.85,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "STATIC_RUBBER": {
        "label":           "Static Rubber / Tire",
        "description":     "Immoveable rubber or tire object",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.95,
        "restitution":     0.4,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Architecture / building geometry ──────────────────────────────────
    "STATIC_ARCHITECTURE": {
        "label":           "Architecture / Wall",
        "description":     "Building wall, floor, ceiling — large static structure with collision",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.85,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Animated static (door, lift) ──────────────────────────────────────
    "ANIMSTATIC_DOOR": {
        "label":           "Animated Static – Door",
        "description":     "Door or hatch moved by animations / scripts",
        "layer":           LAYER_ANIMSTATIC,
        "motion_type":     "KEYFRAMED",
        "quality":         "KEYFRAMED",
        "mass":            0.0,
        "friction":        0.8,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "ANIMSTATIC_PLATFORM": {
        "label":           "Animated Static – Moving Platform",
        "description":     "Script-driven lift, elevator, or moving platform",
        "layer":           LAYER_ANIMSTATIC,
        "motion_type":     "KEYFRAMED",
        "quality":         "KEYFRAMED",
        "mass":            0.0,
        "friction":        0.8,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Furniture / activators ─────────────────────────────────────────────
    "FURNITURE_CHAIR": {
        "label":           "Furniture – Chair / Seat",
        "description":     "Sit-able furniture object — uses L_FURNITURE layer",
        "layer":           LAYER_FURNITURE,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.8,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "FURNITURE_WORKBENCH": {
        "label":           "Furniture – Workbench / Activator",
        "description":     "Crafting station, workbench, or interactable object",
        "layer":           LAYER_FURNITURE,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.85,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Dynamic props (physics-simulated) ─────────────────────────────────
    "DYNAMIC_PROP_LIGHT": {
        "label":           "Dynamic Prop – Light (< 5 kg)",
        "description":     "Small moveable prop: tin can, bottle, mug",
        "layer":           LAYER_PROPS,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            1.0,
        "friction":        0.6,
        "restitution":     0.2,
        "linear_damping":  0.05,
        "angular_damping": 0.05,
        "blender_type":    "ACTIVE",
    },
    "DYNAMIC_PROP_MEDIUM": {
        "label":           "Dynamic Prop – Medium (5–50 kg)",
        "description":     "Medium moveable prop: chair, toolbox, monitor",
        "layer":           LAYER_PROPS,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            15.0,
        "friction":        0.7,
        "restitution":     0.15,
        "linear_damping":  0.08,
        "angular_damping": 0.08,
        "blender_type":    "ACTIVE",
    },
    "DYNAMIC_PROP_HEAVY": {
        "label":           "Dynamic Prop – Heavy (> 50 kg)",
        "description":     "Heavy moveable prop: safe, fridge, car door",
        "layer":           LAYER_PROPS,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            80.0,
        "friction":        0.8,
        "restitution":     0.05,
        "linear_damping":  0.15,
        "angular_damping": 0.15,
        "blender_type":    "ACTIVE",
    },
    "DYNAMIC_CLUTTER": {
        "label":           "Dynamic Clutter",
        "description":     "Small world-item clutter (pencil, fork, clipboard)",
        "layer":           LAYER_CLUTTER,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            0.3,
        "friction":        0.5,
        "restitution":     0.2,
        "linear_damping":  0.05,
        "angular_damping": 0.05,
        "blender_type":    "ACTIVE",
    },
    "DYNAMIC_DEBRIS": {
        "label":           "Dynamic Debris",
        "description":     "Small debris / gibs that fly from explosions",
        "layer":           LAYER_DEBRIS_SMALL,
        "motion_type":     "DYNAMIC",
        "quality":         "DEBRIS",
        "mass":            0.5,
        "friction":        0.5,
        "restitution":     0.3,
        "linear_damping":  0.02,
        "angular_damping": 0.02,
        "blender_type":    "ACTIVE",
    },
    # ── Glass ─────────────────────────────────────────────────────────────
    "STATIC_GLASS": {
        "label":           "Static Glass",
        "description":     "Fixed glass panel / window (does not move)",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.3,
        "restitution":     0.4,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    "DYNAMIC_GLASS": {
        "label":           "Dynamic Glass / Bottle",
        "description":     "Physics-simulated glass object",
        "layer":           LAYER_PROPS,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            0.8,
        "friction":        0.3,
        "restitution":     0.35,
        "linear_damping":  0.04,
        "angular_damping": 0.04,
        "blender_type":    "ACTIVE",
    },
    # ── Organic / vegetation ──────────────────────────────────────────────
    "STATIC_TREE": {
        "label":           "Static Tree / Large Plant",
        "description":     "Immoveable tree trunk or large bush",
        "layer":           LAYER_TREES,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.7,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Water ─────────────────────────────────────────────────────────────
    "WATER_SURFACE": {
        "label":           "Water Surface / Volume",
        "description":     "Water plane or volume trigger — uses L_WATER layer",
        "layer":           LAYER_WATER,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.0,
        "restitution":     0.0,
        "linear_damping":  0.0,
        "angular_damping": 0.0,
        "blender_type":    "PASSIVE",
    },
    # ── Landscape ─────────────────────────────────────────────────────────
    "STATIC_LANDSCAPE": {
        "label":           "Landscape / Terrain",
        "description":     "Ground / terrain mesh — uses L_HAVOK_LANDSCAPE layer",
        "layer":           LAYER_LANDSCAPE,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.9,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Character / biped ─────────────────────────────────────────────────
    "CHARACTER_BIPED": {
        "label":           "Character / Biped Body",
        "description":     "NPC or player biped body part — uses L_BIPED layer",
        "layer":           LAYER_BIPED,
        "motion_type":     "CHARACTER",
        "quality":         "MOVING",
        "mass":            75.0,
        "friction":        0.5,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "ACTIVE",
    },
    "POWER_ARMOR_BODY": {
        "label":           "Power Armor Body Part",
        "description":     "Power armor frame / body part — uses L_BIPED layer",
        "layer":           LAYER_BIPED,
        "motion_type":     "KEYFRAMED",
        "quality":         "KEYFRAMED",
        "mass":            0.0,
        "friction":        0.6,
        "restitution":     0.1,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Vehicles ──────────────────────────────────────────────────────────
    "STATIC_VEHICLE": {
        "label":           "Static Vehicle",
        "description":     "Pre-war car or vehicle body (non-explosive static)",
        "layer":           LAYER_STATIC,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.8,
        "restitution":     0.05,
        "linear_damping":  0.1,
        "angular_damping": 0.05,
        "blender_type":    "PASSIVE",
    },
    # ── Weapons ───────────────────────────────────────────────────────────
    "WEAPON_PROJECTILE": {
        "label":           "Weapon / Projectile",
        "description":     "Held weapon or projectile collision — uses L_WEAPON layer",
        "layer":           LAYER_WEAPON,
        "motion_type":     "DYNAMIC",
        "quality":         "MOVING",
        "mass":            1.5,
        "friction":        0.5,
        "restitution":     0.1,
        "linear_damping":  0.0,
        "angular_damping": 0.0,
        "blender_type":    "ACTIVE",
    },
    # ── Trigger volumes ───────────────────────────────────────────────────
    "TRIGGER_VOLUME": {
        "label":           "Trigger Volume / Cloud Trap",
        "description":     "Invisible trigger or effect volume — uses L_CLOUD_TRAP layer",
        "layer":           LAYER_CLOUD_TRAP,
        "motion_type":     "FIXED",
        "quality":         "FIXED",
        "mass":            0.0,
        "friction":        0.0,
        "restitution":     0.0,
        "linear_damping":  0.0,
        "angular_damping": 0.0,
        "blender_type":    "PASSIVE",
    },
}

PRESET_ENUM_ITEMS = [
    (k, v["label"], v["description"])
    for k, v in PRESETS.items()
]

# Motion type enum items
MOTION_TYPE_ITEMS = [
    ("FIXED",          "Fixed",           "Permanently static – mass must be 0"),
    ("KEYFRAMED",      "Keyframed",       "Moved by animations / scripts – mass must be 0"),
    ("DYNAMIC",        "Dynamic",         "Full physics simulation – needs positive mass"),
    ("SPHERE_INERTIA", "Sphere Inertia",  "Simplified sphere inertia tensor for round objects"),
    ("BOX_INERTIA",    "Box Inertia",     "Simplified box inertia tensor for box-shaped objects"),
    ("THIN_BOX",       "Thin Box",        "Thin flat objects such as panels or plates"),
    ("CHARACTER",      "Character",       "Character controller motion (bipeds, power armor)"),
]

# Quality type enum items
QUALITY_TYPE_ITEMS = [
    ("FIXED",     "Fixed",     "Non-moving static quality"),
    ("KEYFRAMED", "Keyframed", "Script / animation driven"),
    ("DEBRIS",    "Debris",    "Fast-moving small debris"),
    ("MOVING",    "Moving",    "General physics prop"),
]

# Layer enum items – most-used FO4 Havok collision layers
LAYER_ITEMS = [
    ("1",  "L_STATIC (1)",           "Static world geometry"),
    ("2",  "L_ANIMSTATIC (2)",        "Animated static / doors"),
    ("5",  "L_BIPED (5)",             "Player / NPC / Power Armor bodies"),
    ("6",  "L_CLUTTER (6)",           "Small world-item clutter"),
    ("7",  "L_PROPS (7)",             "Moveable props"),
    ("8",  "L_DEBRIS_SMALL (8)",      "Small debris / gibs"),
    ("9",  "L_HAVOK_LANDSCAPE (9)",   "Terrain / landscape"),
    ("10", "L_WATER (10)",            "Water surface / volumes"),
    ("20", "L_FURNITURE (20)",        "Furniture / activators"),
    ("32", "L_WEAPON (32)",           "Weapon projectiles"),
    ("35", "L_TREES (35)",            "Trees and foliage"),
    ("56", "L_CLOUD_TRAP (56)",       "Trigger volumes / cloud traps"),
]


# ---------------------------------------------------------------------------
# PhysicsHelpers
# ---------------------------------------------------------------------------

class PhysicsHelpers:
    """Configure Havok rigid-body properties on Blender objects for FO4 NIF export."""

    @staticmethod
    def setup_rigid_body(obj, preset_id: str) -> tuple[bool, str]:
        """Apply a physics preset to *obj*.

        1. Enables Blender's built-in rigid-body system on the object.
        2. Sets mass, friction, restitution, damping.
        3. Writes fo4_* custom properties that the Niftools NIF exporter reads.

        Returns (True, message) on success.
        """
        if obj is None or obj.type != 'MESH':
            return False, "Select a mesh object first"

        preset = PRESETS.get(preset_id)
        if preset is None:
            return False, f"Unknown preset: {preset_id!r}"

        try:
            import bpy
            ctx = bpy.context

            # ── Activate the rigid-body system ───────────────────────────
            # Must be done through the operator so Blender sets up the
            # scene-level physics world.
            ctx.view_layer.objects.active = obj
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)

            if obj.rigid_body is None:
                bpy.ops.rigidbody.object_add()

            rb = obj.rigid_body

            # ── Body type ────────────────────────────────────────────────
            rb.type = preset["blender_type"]   # 'PASSIVE' or 'ACTIVE'

            # ── Mass ─────────────────────────────────────────────────────
            rb.mass        = preset["mass"]
            rb.friction    = preset["friction"]
            rb.restitution = preset["restitution"]

            # ── Damping ──────────────────────────────────────────────────
            rb.linear_damping  = preset["linear_damping"]
            rb.angular_damping = preset["angular_damping"]

            # ── Collision shape ──────────────────────────────────────────
            # CONVEX_HULL is the FO4 standard; modders can override manually
            rb.collision_shape = 'CONVEX_HULL'

            # ── Niftools custom properties ───────────────────────────────
            obj["fo4_collision_layer"]  = preset["layer"]
            obj["fo4_motion_type"]      = preset["motion_type"]
            obj["fo4_havok_mass"]       = preset["mass"]
            obj["fo4_havok_friction"]   = preset["friction"]
            obj["fo4_havok_restitution"]= preset["restitution"]
            obj["fo4_havok_quality"]    = preset["quality"]
            obj["fo4_collision_preset"] = preset_id

            return True, (
                f"Physics preset '{preset['label']}' applied to {obj.name}  "
                f"(layer {preset['layer']}, {preset['motion_type']}, "
                f"mass {preset['mass']} kg, friction {preset['friction']})"
            )

        except Exception as exc:
            return False, f"Failed to set up rigid body: {exc}"

    @staticmethod
    def apply_to_selection(context, preset_id: str) -> tuple[bool, str]:
        """Apply a preset to every selected mesh object."""
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not meshes:
            return False, "No mesh objects selected"
        count = 0
        for obj in meshes:
            ok, _ = PhysicsHelpers.setup_rigid_body(obj, preset_id)
            if ok:
                count += 1
        label = PRESETS.get(preset_id, {}).get("label", preset_id)
        return True, f"Applied '{label}' to {count} object(s)"

    @staticmethod
    def validate_physics(obj) -> list[str]:
        """Return a list of warning strings for common physics mistakes."""
        warnings = []
        if obj is None or obj.type != 'MESH':
            return warnings

        rb = obj.rigid_body
        if rb is None:
            warnings.append("No rigid-body component – NIF will have no collision")
            return warnings

        motion = obj.get("fo4_motion_type", "FIXED")
        mass   = obj.get("fo4_havok_mass",  rb.mass)

        if motion in ("FIXED", "KEYFRAMED") and mass > 0:
            warnings.append(
                f"Motion type is {motion} but mass is {mass:.1f} kg – "
                "fixed/keyframed bodies must have mass = 0"
            )
        if motion == "DYNAMIC" and mass == 0:
            warnings.append(
                "Motion type is DYNAMIC but mass is 0 – "
                "dynamic bodies need positive mass"
            )

        layer = obj.get("fo4_collision_layer")
        if layer is None:
            warnings.append(
                "fo4_collision_layer not set – Niftools will use a default "
                "that may be wrong for your object type"
            )

        ucx = f"UCX_{obj.name}"
        has_collision = (
            any(c.name.upper() == ucx.upper() for c in obj.children)
            or any(o.name.upper() == ucx.upper()
                   for o in bpy.context.scene.objects)
        )
        if not has_collision and not obj.name.upper().startswith("UCX_"):
            warnings.append(
                "No UCX_ collision mesh found – the rigid body will use the "
                "visual mesh as its collision shape (expensive in-game)"
            )

        return warnings


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.types.Scene.fo4_physics_preset = bpy.props.EnumProperty(
        name="Physics Preset",
        description="Havok physics preset to apply to selected mesh objects",
        items=PRESET_ENUM_ITEMS,
        default="STATIC_METAL",
    )
    bpy.types.Scene.fo4_physics_show_warnings = bpy.props.BoolProperty(
        name="Show Physics Warnings",
        description="Display live Havok physics validation warnings",
        default=True,
    )
    # Per-object Havok override properties (read by the Apply operator and the
    # Niftools NIF exporter).  Registered here so operators.py and export
    # helpers can always rely on them without a try/except.
    bpy.types.Object.fo4_havok_motion_type = bpy.props.EnumProperty(
        name="Motion Type",
        description="Havok motion type for this object's bhkRigidBody",
        items=MOTION_TYPE_ITEMS,
        default="FIXED",
    )
    bpy.types.Object.fo4_havok_quality_type = bpy.props.EnumProperty(
        name="Quality Type",
        description="Havok simulation quality for this object's bhkRigidBody",
        items=QUALITY_TYPE_ITEMS,
        default="FIXED",
    )
    bpy.types.Object.fo4_havok_layer = bpy.props.EnumProperty(
        name="Collision Layer",
        description="Havok collision layer for this object's bhkCollisionObject",
        items=LAYER_ITEMS,
        default="1",
    )
    bpy.types.Object.fo4_havok_mass = bpy.props.FloatProperty(
        name="Mass (kg)",
        description="Rigid-body mass in kilograms (0 = FIXED / KEYFRAMED)",
        default=0.0,
        min=0.0,
        soft_max=500.0,
        precision=2,
    )
    bpy.types.Object.fo4_havok_friction = bpy.props.FloatProperty(
        name="Friction",
        description="Surface friction coefficient (0 = frictionless, 1 = maximum)",
        default=0.8,
        min=0.0,
        max=1.0,
        precision=2,
    )
    bpy.types.Object.fo4_havok_restitution = bpy.props.FloatProperty(
        name="Restitution",
        description="Bounciness / elasticity (0 = no bounce, 1 = perfectly elastic)",
        default=0.1,
        min=0.0,
        max=1.0,
        precision=2,
    )
    bpy.types.Object.fo4_havok_linear_damping = bpy.props.FloatProperty(
        name="Linear Damping",
        description="Linear velocity damping (higher = stops sliding faster)",
        default=0.1,
        min=0.0,
        max=1.0,
        precision=2,
    )
    bpy.types.Object.fo4_havok_angular_damping = bpy.props.FloatProperty(
        name="Angular Damping",
        description="Angular velocity damping (higher = stops spinning faster)",
        default=0.05,
        min=0.0,
        max=1.0,
        precision=2,
    )
    bpy.types.Object.fo4_physics_preset_id = bpy.props.StringProperty(
        name="Applied Preset",
        description="ID of the last physics preset applied to this object (informational)",
        default="",
    )


def unregister():
    scene_props = ("fo4_physics_preset", "fo4_physics_show_warnings")
    object_props = (
        "fo4_havok_motion_type",
        "fo4_havok_quality_type",
        "fo4_havok_layer",
        "fo4_havok_mass",
        "fo4_havok_friction",
        "fo4_havok_restitution",
        "fo4_havok_linear_damping",
        "fo4_havok_angular_damping",
        "fo4_physics_preset_id",
    )
    for prop in scene_props:
        if hasattr(bpy.types.Scene, prop):
            try:
                delattr(bpy.types.Scene, prop)
            except Exception:
                pass
    for prop in object_props:
        if hasattr(bpy.types.Object, prop):
            try:
                delattr(bpy.types.Object, prop)
            except Exception:
                pass
