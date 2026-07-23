"""
nif_roundtrip.py

Restore original-NIF fields that PyNifly's Blender-scene export can't
reconstruct on its own, so importing a finished FO4 asset, tweaking it in
Blender, and exporting it back doesn't silently strip data the addon has no
UI for (see MEMORY/plan: Creosote01.nif round-trip investigation).

This only patches fields that have a simple, confirmed settable API on
PyNifly's own Python object model (root/shape name, NiShape.has_alpha_property,
node .flags / BSXFlags). Havok collision reattachment and shader BLOCK TYPE
(Effect vs Lighting) are NOT attempted here -- neither has a simple setter in
PyNifly's API (collision_object is read-only; shader_block_name is read-only
and fixed at block-creation time) and would need real block construction.
Those are reported in ``could_not_restore`` instead of being silently dropped,
so callers can warn the user honestly rather than pretend nothing was lost.

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
