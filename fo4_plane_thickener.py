"""
fo4_plane_thickener.py
======================
Three techniques for giving flat planes a 3D appearance in Fallout 4.

Flat alpha-cutout planes (leaf cards, grass cards, signs, fences) look
unrealistic when viewed from the side.  These operators fix that:

  SOLIDIFY    — Adds real geometry depth via Blender's Solidify modifier.
                Best for signs, fences, thin props, stone slabs.

  CROSS_CARD  — Duplicates the plane, rotates copies at even angles, then
                merges them into one mesh (X-shape for 2 cards, star for 3+).
                Classic trick for leaves, grass, and foliage — looks 3D from
                every viewing angle with minimal extra polygons.

  BOTH        — Solidify + Cross Card combined for maximum depth illusion.
                Great for thick leaf clusters on tree branches.

  VEGETATION  — Full pipeline for combined vegetation meshes (trunk + leaf
                cards in one object).  Separates loose islands, classifies
                each as flat (leaf card) or 3-D (trunk), thickens flat ones,
                then re-merges.  Existing UVs and textures are preserved.
"""

from __future__ import annotations

import math

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        EnumProperty, FloatProperty, IntProperty, BoolProperty,
    )
    import bmesh
    from mathutils import Vector
except ImportError:
    bpy = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_object_mode(context):
    if context.active_object and context.active_object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')


def _apply_solidify(obj, thickness: float, fill_rim: bool, even_thickness: bool):
    """Apply and collapse a Solidify modifier onto *obj*."""
    mod = obj.modifiers.new(name="FO4_Solidify", type='SOLIDIFY')
    mod.thickness        = thickness
    mod.offset           = 0.0          # centred — grows equally both sides
    mod.use_rim          = fill_rim
    mod.use_even_offset  = even_thickness
    mod.use_quality_normals = True
    bpy.ops.object.modifier_apply(modifier=mod.name)


def _apply_cross_card(context, obj, card_count: int):
    """
    Build a cross-card mesh by rotating *card_count - 1* copies of *obj*
    at equal angular steps around the object's local Z axis, then joining
    all copies back into the original object.

    The local Z axis is the face normal of a default Blender plane, so this
    works correctly regardless of how the object is oriented in world space.
    """
    angle_step = math.pi / card_count   # e.g. 90 deg for 2 cards, 60 deg for 3
    copies = []

    for i in range(1, card_count):
        # Duplicate preserving original selection state
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        context.view_layer.objects.active = obj
        bpy.ops.object.duplicate(linked=False)
        copy = context.active_object

        # Rotate around the *local* Z axis of the copy (= face normal)
        copy.rotation_euler.rotate_axis('Z', angle_step * i)
        bpy.ops.object.transform_apply(rotation=True, scale=False, location=False)
        copies.append(copy)

    # Join copies back into the original
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    obj.select_set(True)
    context.view_layer.objects.active = obj
    bpy.ops.object.join()

    # Merge overlapping vertices at the centre seam
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.mesh.merge_by_distance(threshold=0.0001)
    except AttributeError:
        bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.object.mode_set(mode='OBJECT')


def _face_normal_variance(bm_faces) -> float:
    """Return the mean angular deviation (radians) of face normals from their
    mean direction.  A perfectly flat mesh returns 0.0; a 3-D mesh returns
    > 0.26 rad (~15 deg)."""
    normals = [f.normal.copy() for f in bm_faces if f.normal.length > 0.5]
    if not normals:
        return 0.0
    mean = Vector((0.0, 0.0, 0.0))
    for n in normals:
        mean += n
    if mean.length < 1e-6:
        # Normals cancel — sphere-like distribution, definitely 3-D.
        return math.pi
    mean.normalize()
    variance = sum(
        math.acos(max(-1.0, min(1.0, mean.dot(n.normalized()))))
        for n in normals
    ) / len(normals)
    return variance


# ── Main Operator ─────────────────────────────────────────────────────────────

class FO4_OT_ThickenFlatPlane(Operator):
    """Give a flat alpha-cutout plane the illusion of 3D thickness.
Techniques: Solidify (real geometry), Cross Card (intersecting planes for
leaves/grass), or both combined."""
    bl_idname  = "fo4.thicken_flat_plane"
    bl_label   = "Thicken Flat Plane"
    bl_options = {'REGISTER', 'UNDO'}

    technique: EnumProperty(
        name="Technique",
        description="How to add depth to the flat plane",
        items=[
            ('SOLIDIFY',   "Solidify",          "Add real geometry thickness — signs, fences, props"),
            ('CROSS_CARD', "Cross Card",         "Intersecting plane copies — leaves, grass, foliage"),
            ('BOTH',       "Solidify + Cross",   "Both combined — thick leaf clusters, dense foliage"),
        ],
        default='CROSS_CARD',
    )

    thickness: FloatProperty(
        name="Thickness",
        description="Depth added by the Solidify step (metres in Blender / FO4 units)",
        default=0.04,
        min=0.001,
        max=2.0,
        step=1,
        precision=3,
    )

    fill_rim: BoolProperty(
        name="Fill Rim",
        description="Cap the open edges of the solidified plane with geometry",
        default=True,
    )

    even_thickness: BoolProperty(
        name="Even Thickness",
        description="Maintain uniform thickness around curved/angled edges",
        default=True,
    )

    card_count: IntProperty(
        name="Card Count",
        description=(
            "Number of intersecting planes for Cross Card.\n"
            "2 = X shape (classic leaf card)\n"
            "3 = Star / Y shape\n"
            "4 = Dense cross (bushy look)"
        ),
        default=2,
        min=2,
        max=4,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=340)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "technique")
        layout.separator()

        if self.technique in ('SOLIDIFY', 'BOTH'):
            box = layout.box()
            box.label(text="Solidify Settings", icon='MOD_SOLIDIFY')
            box.prop(self, "thickness")
            row = box.row()
            row.prop(self, "fill_rim")
            row.prop(self, "even_thickness")

        if self.technique in ('CROSS_CARD', 'BOTH'):
            box = layout.box()
            box.label(text="Cross Card Settings", icon='OUTLINER_OB_MESH')
            box.prop(self, "card_count")
            col = box.column()
            col.scale_y = 0.7
            labels = {2: "X shape  (90 deg apart) — classic leaf card",
                      3: "Star     (60 deg apart) — bushy foliage",
                      4: "Dense X  (45 deg apart) — thick canopy"}
            col.label(text=labels.get(self.card_count, ""), icon='INFO')

        layout.separator()
        layout.label(text="Tip: use an alpha-cutout texture for best results", icon='INFO')

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        _ensure_object_mode(context)

        steps = []

        try:
            if self.technique in ('SOLIDIFY', 'BOTH'):
                _apply_solidify(obj, self.thickness, self.fill_rim, self.even_thickness)
                steps.append(f"solidified ({self.thickness:.3f} m)")

            if self.technique in ('CROSS_CARD', 'BOTH'):
                _apply_cross_card(context, obj, self.card_count)
                steps.append(f"cross-card ({self.card_count} planes)")

        except Exception as e:
            self.report({'ERROR'}, f"Thicken failed: {e}")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Thickened: {', '.join(steps)}")
        return {'FINISHED'}


# ── Batch operator: thicken all selected planes ───────────────────────────────

class FO4_OT_ThickenSelectedPlanes(Operator):
    """Apply Thicken Flat Plane to every selected mesh object at once"""
    bl_idname  = "fo4.thicken_selected_planes"
    bl_label   = "Thicken All Selected Planes"
    bl_options = {'REGISTER', 'UNDO'}

    technique: EnumProperty(
        name="Technique",
        items=[
            ('SOLIDIFY',   "Solidify",        ""),
            ('CROSS_CARD', "Cross Card",       ""),
            ('BOTH',       "Solidify + Cross", ""),
        ],
        default='CROSS_CARD',
    )
    thickness: FloatProperty(name="Thickness", default=0.04, min=0.001, max=2.0)
    card_count: IntProperty(name="Card Count", default=2, min=2, max=4)
    fill_rim: BoolProperty(name="Fill Rim", default=True)
    even_thickness: BoolProperty(name="Even Thickness", default=True)

    @classmethod
    def poll(cls, context):
        return any(o.type == 'MESH' for o in context.selected_objects)

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=300)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "technique")
        if self.technique in ('SOLIDIFY', 'BOTH'):
            layout.prop(self, "thickness")
            row = layout.row()
            row.prop(self, "fill_rim")
            row.prop(self, "even_thickness")
        if self.technique in ('CROSS_CARD', 'BOTH'):
            layout.prop(self, "card_count")

    def execute(self, context):
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not meshes:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        _ensure_object_mode(context)
        ok = fail = 0

        for obj in meshes:
            try:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj

                if self.technique in ('SOLIDIFY', 'BOTH'):
                    _apply_solidify(obj, self.thickness, self.fill_rim, self.even_thickness)
                if self.technique in ('CROSS_CARD', 'BOTH'):
                    _apply_cross_card(context, obj, self.card_count)
                ok += 1
            except Exception as e:
                print(f"[Thicken] Failed on '{obj.name}': {e}")
                fail += 1

        self.report(
            {'INFO'} if not fail else {'WARNING'},
            f"Thickened {ok}/{len(meshes)} object(s)" + (f" ({fail} failed)" if fail else "")
        )
        return {'FINISHED'}


# ── Vegetation plane separator ────────────────────────────────────────────────

class FO4_OT_SeparateAndThickenVegetation(Operator):
    """Separate leaf-card planes from a combined vegetation mesh, thicken
them for a 3-D illusion, then merge everything back.

The active object should be a combined FO4 vegetation mesh where the
trunk/branches form a proper 3-D mesh and the leaves/needles are flat
alpha-cutout quads.  The operator:

  1. Separates the mesh into loose-part islands.
  2. Classifies each island as FLAT (leaf card) or 3-D (trunk/branch) by
     measuring face-normal variance.
  3. Applies the chosen technique to every flat island.
  4. Joins all islands back into one object.

Existing UVs and textures are fully preserved — Blender's Solidify
modifier keeps front/back UVs intact, and Cross Card only copies the
existing UV layout to each rotated duplicate."""
    bl_idname  = "fo4.separate_and_thicken_vegetation"
    bl_label   = "Separate & Thicken Vegetation Planes"
    bl_options = {'REGISTER', 'UNDO'}

    technique: EnumProperty(
        name="Technique",
        description="How to add depth to each flat leaf-card island",
        items=[
            ('SOLIDIFY',   "Solidify",          "Add real geometry thickness — flat slabs"),
            ('CROSS_CARD', "Cross Card",         "Intersecting copies — leaves, needles, foliage"),
            ('BOTH',       "Solidify + Cross",   "Both combined — thick leaf clusters"),
        ],
        default='CROSS_CARD',
    )

    thickness: FloatProperty(
        name="Thickness",
        description="Depth added by the Solidify step (Blender / FO4 units)",
        default=0.04,
        min=0.001,
        max=2.0,
        step=1,
        precision=3,
    )

    fill_rim: BoolProperty(
        name="Fill Rim",
        description="Cap the open edges of the solidified plane (adds extra geometry)",
        default=False,
    )

    even_thickness: BoolProperty(
        name="Even Thickness",
        description="Maintain uniform thickness around curved/angled edges",
        default=True,
    )

    card_count: IntProperty(
        name="Card Count",
        description="Number of intersecting planes for Cross Card (2=X, 3=star, 4=dense)",
        default=2,
        min=2,
        max=4,
    )

    flat_threshold_deg: FloatProperty(
        name="Flat Threshold (deg)",
        description=(
            "Face-normal variance below this angle is treated as a flat "
            "leaf-card island.  Raise if some branches are being thickened; "
            "lower if leaf cards are not detected."
        ),
        default=15.0,
        min=1.0,
        max=45.0,
        step=100,
        precision=1,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=360)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "technique")
        layout.prop(self, "flat_threshold_deg")
        layout.separator()

        if self.technique in ('SOLIDIFY', 'BOTH'):
            box = layout.box()
            box.label(text="Solidify Settings", icon='MOD_SOLIDIFY')
            box.prop(self, "thickness")
            row = box.row()
            row.prop(self, "fill_rim")
            row.prop(self, "even_thickness")

        if self.technique in ('CROSS_CARD', 'BOTH'):
            box = layout.box()
            box.label(text="Cross Card Settings", icon='OUTLINER_OB_MESH')
            box.prop(self, "card_count")

        layout.separator()
        layout.label(text="Existing UVs and textures are preserved", icon='INFO')

    def execute(self, context):
        source_obj = context.active_object
        if not source_obj or source_obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        _ensure_object_mode(context)

        threshold_rad = math.radians(self.flat_threshold_deg)
        orig_name = source_obj.name

        # ── 1. Separate by loose parts ────────────────────────────────────────
        bpy.ops.object.select_all(action='DESELECT')
        source_obj.select_set(True)
        context.view_layer.objects.active = source_obj

        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')

        # All separated objects are selected after the operator.
        all_parts = [o for o in context.selected_objects if o.type == 'MESH']

        if len(all_parts) <= 1:
            self.report(
                {'WARNING'},
                "Mesh has only one loose part — nothing to separate. "
                "Leaf cards must be disconnected islands (no shared vertices "
                "with the trunk)."
            )
            return {'CANCELLED'}

        # ── 2. Classify each island ───────────────────────────────────────────
        flat_parts = []
        solid_parts = []

        for part in all_parts:
            bm = bmesh.new()
            bm.from_mesh(part.data)
            bm.faces.ensure_lookup_table()
            variance = _face_normal_variance(bm.faces)
            bm.free()
            if variance < threshold_rad:
                flat_parts.append(part)
            else:
                solid_parts.append(part)

        if not flat_parts:
            # Nothing flat — rejoin and report.
            bpy.ops.object.select_all(action='DESELECT')
            for p in all_parts:
                p.select_set(True)
            context.view_layer.objects.active = all_parts[0]
            bpy.ops.object.join()
            context.active_object.name = orig_name
            self.report(
                {'WARNING'},
                f"No flat leaf-card islands detected "
                f"(threshold {self.flat_threshold_deg:.0f} deg). "
                "Try raising the Flat Threshold value."
            )
            return {'CANCELLED'}

        # ── 3. Thicken each flat island ───────────────────────────────────────
        ok_count = fail_count = 0

        for obj in flat_parts:
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            context.view_layer.objects.active = obj
            try:
                if self.technique in ('SOLIDIFY', 'BOTH'):
                    _apply_solidify(obj, self.thickness, self.fill_rim, self.even_thickness)
                if self.technique in ('CROSS_CARD', 'BOTH'):
                    _apply_cross_card(context, obj, self.card_count)
                ok_count += 1
            except Exception as exc:
                print(f"[VegThicken] Failed on '{obj.name}': {exc}")
                fail_count += 1

        # ── 4. Rejoin all parts ───────────────────────────────────────────────
        # After Cross Card joins copies into each flat_part, some former
        # flat_part references may now be the join target (still valid) while
        # the copies were consumed.  Collect live objects by iterating
        # bpy.data.objects to avoid stale references.
        live_names = {p.name for p in all_parts}
        live_parts = [o for o in bpy.data.objects if o.name in live_names and o.type == 'MESH']

        bpy.ops.object.select_all(action='DESELECT')
        for part in live_parts:
            part.select_set(True)

        # Prefer source_obj as join target so name / custom props are kept.
        target = source_obj if source_obj.name in {p.name for p in live_parts} else live_parts[0]
        context.view_layer.objects.active = target
        bpy.ops.object.join()

        result = context.active_object
        result.name = orig_name

        msg = (
            f"Thickened {ok_count} leaf-card island(s); "
            f"{len(solid_parts)} 3-D part(s) left untouched"
        )
        if fail_count:
            msg += f" — {fail_count} island(s) failed (see console)"
            self.report({'WARNING'}, msg)
        else:
            self.report({'INFO'}, msg)
        return {'FINISHED'}


# ── Registration ──────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ThickenFlatPlane,
    FO4_OT_ThickenSelectedPlanes,
    FO4_OT_SeparateAndThickenVegetation,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
        bpy.utils.register_class(cls)


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
