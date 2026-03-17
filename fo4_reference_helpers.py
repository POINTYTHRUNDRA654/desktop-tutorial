"""
Fallout 4 Scale Reference Helpers
====================================
Adds non-exportable scale reference objects to the scene so artists can
always check proportions against known Fallout 4 in-game heights and sizes.

All reference objects are:
- Named with the ``FO4_REF_`` prefix so they are easy to find and delete
- Tagged with the ``fo4_reference`` custom boolean property so exporters can
  skip them automatically
- Added to a dedicated ``FO4_References`` collection (created if absent)
- Displayed in wire-frame / solid shade but marked as non-selectable and
  non-renderable to avoid interfering with normal work

Reference sizes (Blender units = game units ≈ 0.7 m / 70 cm in most FO4 cells)
---------------------------------------------------------------------------
The Fallout 4 engine uses the "Gamebryo / Creation Engine" unit convention
where **1 Blender unit ≈ 143.75 cm** when exported as-is via Niftools (the
exact conversion depends on the NIF scale correction you use, but the standard
workflow is: NO scale correction, 1 BU = 1 NIF unit ≈ 1.4375 cm).

For practical reference objects we therefore use the following rule-of-thumb
that is consistent with the Niftools Blender add-on default (no scale factor):

  Vanilla adult human (male NPC)    ≈ 128 NIF units tall
  ≈ 1.28 Blender units high when using no scale correction

All heights below are given in Blender units at the standard 1 BU = 1 NIF
unit assumption (which is the add-on's default export setting).  These match
the proportions used by vanilla FO4 assets.

Reference       | Height (BU) | Notes
----------------|-------------|----------------------------------------------
Human (male)    |     1.28    | Adult male NPC standing (including head)
Human (female)  |     1.22    | Adult female NPC standing
Child           |     0.90    | Child character
Power Armor     |     1.72    | T-60/X-01 occupied; shoulder ≈ 1.50
Deathclaw       |     2.20    | Standing on hind legs
Brahmin         |     1.30    | Shoulder height (on all fours)
Pre-war Car     |  4.20×1.80  | Typical pre-war sedan (length × height)
Door Frame      |  1.10×1.80  | Standard interior door opening (w × h)
1 m Cube        |     0.70    | 1 m = 0.7 BU reference cube
Settlement Ceil.|     2.20    | Settlement floor-to-ceiling height
"""

from __future__ import annotations

import bpy
import bmesh

_COLLECTION_NAME = "FO4_References"

# ---------------------------------------------------------------------------
# Reference definitions
# ---------------------------------------------------------------------------
# Each entry is a dict:
#   label       – display name in UI enum
#   description – tooltip
#   shape       – one of 'CYLINDER', 'BOX', 'ELLIPSE'
#   dimensions  – (x, y, z) in Blender units
#   color       – (R, G, B) wire colour for overlay
#   note        – annotation printed to console on creation
# ---------------------------------------------------------------------------

REFERENCES: dict = {
    "HUMAN_MALE": {
        "label":       "Human (Male NPC)",
        "description": "Adult male NPC silhouette at 1.28 BU (≈ 128 NIF units)",
        "shape":       "CYLINDER",
        "dimensions":  (0.35, 0.25, 1.28),
        "color":       (0.2, 0.6, 1.0),
        "note":        "Male NPC: width ~0.35 BU, height 1.28 BU",
    },
    "HUMAN_FEMALE": {
        "label":       "Human (Female NPC)",
        "description": "Adult female NPC silhouette at 1.22 BU",
        "shape":       "CYLINDER",
        "dimensions":  (0.32, 0.22, 1.22),
        "color":       (1.0, 0.5, 0.8),
        "note":        "Female NPC: width ~0.32 BU, height 1.22 BU",
    },
    "CHILD": {
        "label":       "Child",
        "description": "Child character silhouette at 0.90 BU",
        "shape":       "CYLINDER",
        "dimensions":  (0.25, 0.18, 0.90),
        "color":       (1.0, 0.85, 0.3),
        "note":        "Child: height 0.90 BU",
    },
    "POWER_ARMOR": {
        "label":       "Power Armor (T-60 / X-01)",
        "description": "Occupied power armor suit at 1.72 BU",
        "shape":       "CYLINDER",
        "dimensions":  (0.55, 0.40, 1.72),
        "color":       (0.4, 0.8, 0.2),
        "note":        "Power Armor: shoulder ~1.50 BU, head ~1.72 BU",
    },
    "DEATHCLAW": {
        "label":       "Deathclaw",
        "description": "Adult Deathclaw silhouette standing (2.20 BU)",
        "shape":       "CYLINDER",
        "dimensions":  (0.80, 0.60, 2.20),
        "color":       (0.8, 0.2, 0.1),
        "note":        "Deathclaw standing: height ~2.20 BU",
    },
    "BRAHMIN": {
        "label":       "Brahmin",
        "description": "Two-headed brahmin cow (shoulder 1.30 BU, length 2.50 BU)",
        "shape":       "BOX",
        "dimensions":  (2.50, 1.00, 1.30),
        "color":       (0.7, 0.5, 0.2),
        "note":        "Brahmin: shoulder 1.30 BU, body length 2.50 BU",
    },
    "PRE_WAR_CAR": {
        "label":       "Pre-war Car (sedan)",
        "description": "Typical pre-war sedan: 4.20 BU long, 1.80 BU tall",
        "shape":       "BOX",
        "dimensions":  (4.20, 1.80, 1.30),
        "color":       (0.9, 0.7, 0.1),
        "note":        "Pre-war sedan: 4.20 × 1.80 × 1.30 BU",
    },
    "DOOR_FRAME": {
        "label":       "Standard Door Frame",
        "description": "Interior door opening 1.10 BU wide, 1.80 BU tall",
        "shape":       "DOOR_FRAME",
        "dimensions":  (1.10, 0.10, 1.80),
        "color":       (0.6, 0.9, 0.6),
        "note":        "Door frame: 1.10 BU wide, 1.80 BU tall",
    },
    "CUBE_1M": {
        "label":       "1-Metre Reference Cube",
        "description": "1 m ≈ 0.70 BU reference cube for scale comparison",
        "shape":       "BOX",
        "dimensions":  (0.70, 0.70, 0.70),
        "color":       (1.0, 1.0, 1.0),
        "note":        "1 m reference cube: 0.70 BU per side",
    },
    "SETTLEMENT_FLOOR": {
        "label":       "Settlement Floor Panel",
        "description": "Standard settlement snap-build floor section (4 BU × 4 BU)",
        "shape":       "BOX",
        "dimensions":  (4.0, 4.0, 0.05),
        "color":       (0.5, 0.5, 1.0),
        "note":        "Settlement floor: 4 × 4 BU footprint",
    },
}

REFERENCE_ENUM_ITEMS = [
    (k, v["label"], v["description"])
    for k, v in REFERENCES.items()
]


# ---------------------------------------------------------------------------
# Core helper class
# ---------------------------------------------------------------------------

class ReferenceHelpers:
    """Scale reference object management."""

    @staticmethod
    def get_or_create_collection() -> bpy.types.Collection:
        """Return the FO4_References collection, creating it if needed."""
        coll = bpy.data.collections.get(_COLLECTION_NAME)
        if coll is None:
            coll = bpy.data.collections.new(_COLLECTION_NAME)
            bpy.context.scene.collection.children.link(coll)
        return coll

    @staticmethod
    def create_reference(ref_id: str) -> tuple[bool, str]:
        """Add a reference object for *ref_id* to the scene.

        Returns (True, message) on success.
        """
        ref = REFERENCES.get(ref_id)
        if ref is None:
            return False, f"Unknown reference ID: {ref_id}"

        try:
            coll = ReferenceHelpers.get_or_create_collection()
            obj_name = f"FO4_REF_{ref_id}"

            # Remove existing reference with the same name so we can re-add
            existing = bpy.data.objects.get(obj_name)
            if existing is not None:
                bpy.data.objects.remove(existing, do_unlink=True)

            shape = ref["shape"]
            dx, dy, dz = ref["dimensions"]

            if shape == "CYLINDER":
                obj = ReferenceHelpers._make_cylinder(obj_name, dx, dy, dz)
            elif shape == "BOX":
                obj = ReferenceHelpers._make_box(obj_name, dx, dy, dz)
            elif shape == "DOOR_FRAME":
                obj = ReferenceHelpers._make_door_frame(obj_name, dx, dy, dz)
            else:
                obj = ReferenceHelpers._make_box(obj_name, dx, dy, dz)

            # Link to FO4_References collection (not the scene root)
            for c in obj.users_collection:
                c.objects.unlink(obj)
            coll.objects.link(obj)

            # Tag as reference so exporters can skip it
            obj["fo4_reference"] = True
            obj["fo4_ref_id"]    = ref_id
            obj["fo4_ref_note"]  = ref["note"]

            # Wire display + non-selectable + non-renderable
            obj.display_type       = 'WIRE'
            obj.hide_select        = True
            obj.hide_render        = True
            obj.color              = (*ref["color"], 0.6)
            obj.show_in_front      = True

            print(f"FO4 Reference: {ref['note']}")

            return True, f"Reference '{ref['label']}' added to scene"

        except Exception as exc:
            return False, f"Failed to create reference: {exc}"

    @staticmethod
    def clear_all_references() -> tuple[bool, str]:
        """Remove all FO4_REF_* objects and the collection if empty."""
        removed = 0
        to_remove = [o for o in bpy.data.objects if o.name.startswith("FO4_REF_")]
        for obj in to_remove:
            bpy.data.objects.remove(obj, do_unlink=True)
            removed += 1

        # Remove empty collection
        coll = bpy.data.collections.get(_COLLECTION_NAME)
        if coll is not None and not coll.objects:
            bpy.data.collections.remove(coll)

        return True, f"Removed {removed} reference object(s)"

    # ------------------------------------------------------------------
    # Mesh construction helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_cylinder(name: str, diameter_x: float, diameter_y: float, height: float):
        """Create an elliptic cylinder (capsule silhouette) as a reference."""
        bm = bmesh.new()
        # Build a UV sphere and scale it to the target dimensions
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.5)
        # Scale to match target dimensions
        bmesh.ops.scale(bm, vec=(diameter_x, diameter_y, height),
                        verts=bm.verts)
        # Move Z origin to the bottom (z=0) so it sits on the ground
        bmesh.ops.translate(bm, vec=(0, 0, height * 0.5), verts=bm.verts)

        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()

        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj

    @staticmethod
    def _make_box(name: str, dx: float, dy: float, dz: float):
        """Create a box (cuboid) reference object."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(dx, dy, dz), verts=bm.verts)
        # Move Z origin to bottom
        bmesh.ops.translate(bm, vec=(0, 0, dz * 0.5), verts=bm.verts)

        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()

        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj

    @staticmethod
    def _make_door_frame(name: str, width: float, depth: float, height: float):
        """Create a simple open doorframe (3-sided U shape)."""
        bm = bmesh.new()
        t = 0.05  # thickness in BU

        # Left post
        v = [
            bm.verts.new((0,    0,      0)),
            bm.verts.new((t,    0,      0)),
            bm.verts.new((t,    depth,  0)),
            bm.verts.new((0,    depth,  0)),
            bm.verts.new((0,    0,      height)),
            bm.verts.new((t,    0,      height)),
            bm.verts.new((t,    depth,  height)),
            bm.verts.new((0,    depth,  height)),
        ]
        for face_verts in [
            (v[0], v[1], v[2], v[3]),
            (v[4], v[5], v[6], v[7]),
            (v[0], v[1], v[5], v[4]),
            (v[1], v[2], v[6], v[5]),
            (v[2], v[3], v[7], v[6]),
            (v[3], v[0], v[4], v[7]),
        ]:
            bm.faces.new(face_verts)

        # Right post (offset by width)
        v2 = [
            bm.verts.new((width - t, 0,     0)),
            bm.verts.new((width,     0,     0)),
            bm.verts.new((width,     depth, 0)),
            bm.verts.new((width - t, depth, 0)),
            bm.verts.new((width - t, 0,     height)),
            bm.verts.new((width,     0,     height)),
            bm.verts.new((width,     depth, height)),
            bm.verts.new((width - t, depth, height)),
        ]
        for face_verts in [
            (v2[0], v2[1], v2[2], v2[3]),
            (v2[4], v2[5], v2[6], v2[7]),
            (v2[0], v2[1], v2[5], v2[4]),
            (v2[1], v2[2], v2[6], v2[5]),
            (v2[2], v2[3], v2[7], v2[6]),
            (v2[3], v2[0], v2[4], v2[7]),
        ]:
            bm.faces.new(face_verts)

        # Top lintel
        v3 = [
            bm.verts.new((0,           0,     height - t)),
            bm.verts.new((width,       0,     height - t)),
            bm.verts.new((width,       depth, height - t)),
            bm.verts.new((0,           depth, height - t)),
            bm.verts.new((0,           0,     height)),
            bm.verts.new((width,       0,     height)),
            bm.verts.new((width,       depth, height)),
            bm.verts.new((0,           depth, height)),
        ]
        for face_verts in [
            (v3[0], v3[1], v3[2], v3[3]),
            (v3[4], v3[5], v3[6], v3[7]),
            (v3[0], v3[1], v3[5], v3[4]),
            (v3[1], v3[2], v3[6], v3[5]),
            (v3[2], v3[3], v3[7], v3[6]),
            (v3[3], v3[0], v3[4], v3[7]),
        ]:
            bm.faces.new(face_verts)

        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()

        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.types.Scene.fo4_ref_type = bpy.props.EnumProperty(
        name="Reference Type",
        description="Scale reference object to add",
        items=REFERENCE_ENUM_ITEMS,
        default="HUMAN_MALE",
    )


def unregister():
    if hasattr(bpy.types.Scene, "fo4_ref_type"):
        try:
            delattr(bpy.types.Scene, "fo4_ref_type")
        except Exception:
            pass
