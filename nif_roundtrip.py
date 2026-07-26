"""
nif_roundtrip.py

Restore original-NIF fields that PyNifly's Blender-scene export can't
reconstruct on its own, so importing a finished FO4 asset, tweaking it in
Blender, and exporting it back doesn't silently strip data the addon has no
UI for (see MEMORY/plan: Creosote01.nif round-trip investigation).

This only patches fields that have a simple, confirmed settable API on
PyNifly's own Python object model (root/shape name, NiShape.has_alpha_property,
node .flags / BSXFlags). Shader BLOCK TYPE (Effect vs Lighting) is NOT
attempted here -- it has no simple setter (shader_block_name is read-only and
fixed at block-creation time) and would need real block construction. That is
reported in ``could_not_restore`` instead of being silently dropped, so callers
can warn the user honestly rather than pretend nothing was lost.

Havok collision reattachment IS handled, but not via round-tripping -- see
``patch_native_collision`` below. PyNifly's own export-side collision
attachment (``CollisionHandler.export_collisions``) creates the
bhkNPCollisionObject/bhkPhysicsSystem blocks correctly in the DLL's live model
when the export target is a NiNode (e.g. an armature/skeleton root), but the
new blocks silently fail to persist through save()/reload when the target is
a leaf mesh shape (BSTriShape/BSSubIndexTriShape) -- confirmed by direct
testing: the block IDs are created, but the shape's own collisionID field
never gets linked at the DLL level, so the collision is orphaned and pruned on
save. Real FO4 static/architecture/furniture files always attach collision at
the NiNode root anyway (confirmed via reference-library reverse-engineering),
so ``patch_native_collision`` builds the collision directly on the exported
file's root node using PyNifly's public NifFile API, sidestepping the
shape-level bug entirely rather than depending on a PyNifly-side fix.

Guarded import: PyNifly (``io_scene_nifly``) is a separate Blender add-on.
If it isn't installed/enabled, every public function here is a no-op that
reports everything as not-restorable.
"""

from __future__ import annotations

import os

try:
    from io_scene_nifly.pyn import pynifly as _pynifly
except Exception:
    _pynifly = None

_ALWAYS_UNRESTORABLE = [
    "Havok collision",
    "BSLeafAnimNode",
    "shader block type (Effect/Lighting)",
]


def available() -> bool:
    """True if PyNifly's low-level Python API (not just the bpy.ops wrapper)
    could be imported."""
    return _pynifly is not None


def _load(path):
    return _pynifly.NifFile(str(path))


def _match_shapes(orig_shapes, exp_shapes):
    """Pair up original <-> exported shapes by name, falling back to
    positional order when names don't line up (e.g. PyNifly de-duplicated
    a name on export)."""
    pairs = []
    exp_by_name = {getattr(s, "name", None): s for s in exp_shapes}
    used = set()
    for o in orig_shapes:
        name = getattr(o, "name", None)
        e = exp_by_name.get(name)
        if e is not None:
            pairs.append((o, e))
            used.add(id(e))
    if not pairs and len(orig_shapes) == len(exp_shapes):
        pairs = list(zip(orig_shapes, exp_shapes))
    return pairs


def patch_exported_nif(exported_path, original_path, obj) -> dict:
    """Restore what we can from *original_path* onto the just-written
    *exported_path*, using *obj* (the Blender mesh object) to decide whether
    the user intentionally renamed it.

    Returns ``{"restored": [...], "could_not_restore": [...]}`` -- always
    include the un-restorable items so callers can surface an honest warning.
    """
    report = {"restored": [], "could_not_restore": list(_ALWAYS_UNRESTORABLE)}

    if not available():
        report["could_not_restore"].insert(0, "name/alpha/flags (PyNifly Python API not available)")
        return report

    if not original_path or not os.path.isfile(original_path):
        return report
    if not exported_path or not os.path.isfile(exported_path):
        return report

    try:
        orig = _load(original_path)
        exp = _load(exported_path)
    except Exception as exc:
        report["could_not_restore"].append(f"(failed to open NIFs for patching: {exc})")
        return report

    dirty = False

    # ---- root name -------------------------------------------------------
    try:
        stored_original_name = obj.get("fo4_original_name") if obj is not None else None
        current_name = obj.name if obj is not None else None
        user_renamed = bool(
            stored_original_name and current_name and current_name != stored_original_name
        )
        target_name = current_name if user_renamed else (stored_original_name or orig.rootName)
        if target_name and exp.root.name != target_name:
            exp.root.name = target_name
            dirty = True
            report["restored"].append("name")
    except Exception as exc:
        report["could_not_restore"].append(f"name ({exc})")

    # ---- per-shape alpha property ----------------------------------------
    try:
        pairs = _match_shapes(orig.shapes, exp.shapes)
    except Exception as exc:
        pairs = []
        report["could_not_restore"].append(f"shape matching ({exc})")

    alpha_restored = False
    for o_shape, e_shape in pairs:
        try:
            if getattr(o_shape, "has_alpha_property", False) and not getattr(
                e_shape, "has_alpha_property", False
            ):
                e_shape.has_alpha_property = True
                # has_alpha_property's setter only creates the in-memory
                # wrapper -- the block is only actually written to the file
                # by save_alpha_property() (NifFile.save() does not call it
                # for us).
                e_shape.save_alpha_property()
                dirty = True
                alpha_restored = True
        except Exception:
            pass

    if alpha_restored:
        report["restored"].append("alpha property")

    # ---- BSXFlags (root-level NiExtraData block, not a shape property) ---
    try:
        o_bsx = orig.root.get_extra_data(blockname="BSXFlags")
        if o_bsx is not None:
            e_bsx = exp.root.get_extra_data(blockname="BSXFlags")
            if e_bsx is not None:
                if e_bsx.flags != o_bsx.flags:
                    e_bsx.flags = o_bsx.flags
                    dirty = True
                    report["restored"].append("BSXFlags")
            else:
                _pynifly.BSXFlags.New(
                    file=exp, name="BSX", flags=int(o_bsx.flags), parent=exp.root
                )
                dirty = True
                report["restored"].append("BSXFlags")
    except Exception as exc:
        report["could_not_restore"].append(f"BSXFlags ({exc})")

    if dirty:
        try:
            exp.save()
        except Exception as exc:
            report["could_not_restore"].append(f"(failed to save patched NIF: {exc})")

    return report


# Real BSXFlags values verified against real vanilla NIFs via PyNifly this
# session (not the values previously documented/coded in this addon, which
# were wrong): furniture uses Havok(2)+Articulated(128)=130, confirmed
# against ModernDomesticLoungeChair01.nif/WorkshopMilitaryCot01.nif.
FRESH_BSXFLAGS_BY_MESH_TYPE = {
    "FURNITURE": 130,
}


def patch_fresh_bsxflags(exported_path, mesh_type: str) -> dict:
    """Write the correct BSXFlags value for *mesh_type* onto a freshly
    exported NIF that has no original reference file to round-trip from
    (see :func:`patch_exported_nif` for that case).

    Only acts on mesh types in :data:`FRESH_BSXFLAGS_BY_MESH_TYPE`, and only
    when the export doesn't already carry a BSXFlags block (e.g. from a
    prior round-trip patch) -- never overwrites an existing value.
    """
    report = {"restored": [], "could_not_restore": []}
    flags = FRESH_BSXFLAGS_BY_MESH_TYPE.get((mesh_type or "").upper())
    if flags is None or _pynifly is None:
        return report

    try:
        exp = _load(exported_path)
        existing = exp.root.get_extra_data(blockname="BSXFlags")
        if existing is not None:
            return report  # don't clobber a value already restored/present
        _pynifly.BSXFlags.New(file=exp, name="BSX", flags=int(flags), parent=exp.root)
        exp.save()
        report["restored"].append(f"BSXFlags={flags}")
    except Exception as exc:
        report["could_not_restore"].append(f"BSXFlags ({exc})")

    return report


def patch_native_collision(exported_path, collision_obj) -> dict:
    """Attach a real FO4 native-physics Havok collision
    (bhkNPCollisionObject -> bhkPhysicsSystem) to a freshly exported NIF's
    root node, built directly from *collision_obj*'s Blender mesh data.

    Always targets the file's root node rather than the individual visual
    shape -- see the collision-reattachment note in this module's docstring
    for why: attaching to a leaf shape silently fails to persist, while
    attaching to the (NiNode) root works and matches real FO4 file layout.

    Skips (no-op) if the export already carries a root-level collision (e.g.
    a round-tripped original already restored one) so this never clobbers an
    existing block. Uses ``collision_obj['pynCollisionShapeType']``
    ('polytope' / 'compressed_mesh' / 'sphere', set by
    MeshHelpers.add_collision_mesh / collision_from_lod_mesh) to choose the
    Havok shape kind; defaults to 'polytope' (convex hull) if unset.
    """
    report = {"restored": [], "could_not_restore": []}
    if _pynifly is None or collision_obj is None:
        return report

    try:
        from io_scene_nifly.pyn.nifconstants import HAVOC_SCALE_FACTOR, game_collision_sf
        from io_scene_nifly.pyn.nifdefs import PynBufferTypes
        from io_scene_nifly.pyn.bhk_autounpack import CollisionShape, PhysicsProps
    except Exception as exc:
        report["could_not_restore"].append(f"Havok collision (PyNifly internals unavailable: {exc})")
        return report

    try:
        exp = _load(exported_path)
        if exp.root.collision_object is not None:
            return report  # already has one -- don't clobber

        sf = HAVOC_SCALE_FACTOR * game_collision_sf.get(exp.game, 1.0)
        shape_type = collision_obj.get('pynCollisionShapeType', 'polytope')
        if shape_type not in ('polytope', 'compressed_mesh', 'sphere'):
            shape_type = 'polytope'

        rb = collision_obj.rigid_body
        physics = PhysicsProps(
            is_dynamic=False,
            friction=rb.friction if rb else 0.5,
            restitution=rb.restitution if rb else 0.4,
            linear_damping=rb.linear_damping if rb else 0.1,
            angular_damping=rb.angular_damping if rb else 0.05,
            gravity_factor=collision_obj.get('pynPhysGravityFactor', 1.0),
            max_linear_velocity=collision_obj.get('pynPhysMaxLinVel', 104.4),
            max_angular_velocity=collision_obj.get('pynPhysMaxAngVel', 31.57),
        )

        world_mat = collision_obj.matrix_world
        if shape_type == 'sphere':
            import mathutils
            radius = max(collision_obj.dimensions) / 2.0 / sf
            verts_ws = [world_mat @ v.co for v in collision_obj.data.vertices]
            centroid = sum(verts_ws, mathutils.Vector()) / max(len(verts_ws), 1) / sf
            from io_scene_nifly.pyn.bhk_autounpack import BodyTransform
            shape = CollisionShape(
                shape_type='sphere', name=collision_obj.name,
                transform=BodyTransform(position=tuple(centroid),
                                         rotation=((1, 0, 0), (0, 1, 0), (0, 0, 1))),
                verts=[], faces=[], convex_radius=0.0, children=[],
                sphere_radius=radius, physics=physics,
            )
        else:
            verts = [tuple(world_mat @ v.co / sf) for v in collision_obj.data.vertices]
            faces = [list(p.vertices) for p in collision_obj.data.polygons]
            radius = 0.0
            if rb and rb.use_margin:
                radius = rb.collision_margin / sf
            else:
                radius = collision_obj.get('pynCollisionRadius', 0.0) / sf
            shape = CollisionShape(
                shape_type=shape_type, name=collision_obj.name,
                transform=None, verts=verts, faces=faces,
                convex_radius=radius, children=[], physics=physics,
            )

        coll_node = exp.root.add_collision(
            None, flags=0, collision_type=PynBufferTypes.bhkNPCollisionObjectBufType)
        _pynifly.bhkPhysicsSystem.New(exp, shapes=[shape], parent=coll_node)
        exp.save()
        report["restored"].append(f"Havok collision ({shape_type})")
    except Exception as exc:
        report["could_not_restore"].append(f"Havok collision ({exc})")

    return report


def summarize(report: dict) -> str:
    """One-line human-readable summary for a report dict from
    :func:`patch_exported_nif`, suitable for appending to an export success
    message."""
    parts = []
    if report.get("restored"):
        parts.append("restored: " + ", ".join(report["restored"]))
    if report.get("could_not_restore"):
        parts.append("could not restore: " + ", ".join(report["could_not_restore"]))
    return "; ".join(parts)
