"""
fo4_mesh_evolution.py

Watches what you do to a Hunyuan3D-generated mesh AFTER it is imported —
polygon reduction, downscaling, deleting loose junk, cleanup, retexturing —
and learns from it.  The core idea (your words): when you no longer have to
edit anything, Hunyuan3D is producing good material.  So the amount you change
a build IS the quality signal.

Flow
----
  1. tag_baseline(obj)          snapshot the raw generated mesh (stored on obj)
  2. (you edit the mesh)
  3. learn_from_edits(obj)      snapshot final, diff vs baseline, record the
                                deltas + a rework_score (0 == you changed
                                nothing == perfect build)
  4. get_learned_adjustments()  average the deltas -> recommended target polys,
                                pre-scale, and auto-clean flags for the NEXT build

One record per build (keyed to the baseline id), so re-saving just refreshes
that build's record instead of piling up duplicates.

Storage : ~/.blender_fo4_tools/fo4_mesh_evolution.json  (survives addon updates)
Triggers: manual operator (fo4.learn_from_edits) + automatic on file save.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

try:
    import bpy
except Exception:  # allows import / unit use outside Blender
    bpy = None

BASELINE_PROP = "_h3d_baseline"
IMAGE_PROP    = "_h3d_source_image"
GENSET_PROP   = "_h3d_gen_settings"
BID_PROP      = "_h3d_build_id"


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------
def _store_path() -> Path:
    d = Path(os.path.expanduser("~")) / ".blender_fo4_tools"
    d.mkdir(parents=True, exist_ok=True)
    return d / "fo4_mesh_evolution.json"


def _load() -> list:
    p = _store_path()
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(rows: list) -> None:
    try:
        _store_path().write_text(
            json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[FO4Evo] save failed: {exc}")


# ---------------------------------------------------------------------------
# Mesh inspection
# ---------------------------------------------------------------------------
def _loose_parts(obj) -> int:
    """Count disconnected islands (loose parts) with a cheap union-find."""
    try:
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.verts.ensure_lookup_table()
        parent = list(range(len(bm.verts)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for e in bm.edges:
            ra, rb = find(e.verts[0].index), find(e.verts[1].index)
            if ra != rb:
                parent[ra] = rb
        roots = {find(i) for i in range(len(bm.verts))}
        bm.free()
        return len(roots)
    except Exception:
        return -1


def _has_texture(obj) -> bool:
    try:
        for slot in obj.material_slots:
            mat = slot.material
            if mat and mat.use_nodes:
                for n in mat.node_tree.nodes:
                    if n.type == 'TEX_IMAGE' and n.image is not None:
                        return True
    except Exception:
        pass
    return False


def snapshot_mesh(obj) -> dict:
    """Capture the FO4-relevant state of a mesh at a point in time."""
    if bpy is None or obj is None or getattr(obj, "type", None) != 'MESH':
        return {}
    me = obj.data
    dims = tuple(round(float(d), 5) for d in obj.dimensions)
    return {
        "poly": len(me.polygons),
        "verts": len(me.vertices),
        "dims": dims,
        "max_dim": round(max(dims) if dims else 0.0, 5),
        "loose_parts": _loose_parts(obj),
        "uv_layers": len(me.uv_layers),
        "has_texture": _has_texture(obj),
        "scale": tuple(round(float(s), 5) for s in obj.scale),
    }


# ---------------------------------------------------------------------------
# Baseline + learning
# ---------------------------------------------------------------------------
def tag_baseline(obj, source_image: str = "", gen_settings: dict | None = None) -> bool:
    """Snapshot the freshly generated mesh and stash it on the object.

    Called once, right after import, before the user edits anything.
    """
    snap = snapshot_mesh(obj)
    if not snap:
        return False
    try:
        obj[BASELINE_PROP] = json.dumps(snap)
        obj[IMAGE_PROP]    = os.path.basename(source_image) if source_image else ""
        obj[GENSET_PROP]   = json.dumps(gen_settings or {})
        obj[BID_PROP]      = int(time.time() * 1000)
        print(f"[FO4Evo] baseline for '{obj.name}': poly {snap['poly']:,}, "
              f"maxdim {snap['max_dim']}, loose parts {snap['loose_parts']}")
        return True
    except Exception as exc:
        print(f"[FO4Evo] baseline tag failed: {exc}")
        return False


def _rework_score(base: dict, final: dict) -> float:
    """0 == nothing changed (perfect build); grows with the manual work done."""
    s = 0.0
    if base.get("poly"):
        s += abs(base["poly"] - final.get("poly", base["poly"])) / base["poly"]
    if base.get("max_dim"):
        s += abs(base["max_dim"] - final.get("max_dim", base["max_dim"])) / base["max_dim"]
    bp, fp = base.get("loose_parts", -1), final.get("loose_parts", -1)
    if bp > 0 and fp >= 0:
        s += abs(bp - fp) / bp
    if base.get("has_texture") != final.get("has_texture"):
        s += 0.25
    return round(s, 4)


def learn_from_edits(obj) -> tuple:
    """Diff the current mesh against its baseline and record what changed.

    Upserts one record per build (keyed to the baseline id) so repeated saves
    just refresh that build's record instead of creating duplicates.
    """
    if bpy is None or obj is None or BASELINE_PROP not in obj:
        return False, "no baseline on this object (was it generated by Hunyuan3D?)"
    try:
        base = json.loads(obj[BASELINE_PROP])
    except Exception:
        return False, "baseline unreadable"

    final = snapshot_mesh(obj)
    if not final:
        return False, "could not read final mesh"

    poly_ratio  = round(final["poly"] / base["poly"], 4) if base.get("poly") else 1.0
    scale_ratio = round(final["max_dim"] / base["max_dim"], 4) if base.get("max_dim") else 1.0
    if base.get("loose_parts", -1) >= 0 and final.get("loose_parts", -1) >= 0:
        parts_removed = base["loose_parts"] - final["loose_parts"]
    else:
        parts_removed = 0
    rework = _rework_score(base, final)

    row = {
        "bid":           int(obj.get(BID_PROP, int(time.time() * 1000))),
        "ts":            int(time.time()),
        "object":        obj.name,
        "image":         obj.get(IMAGE_PROP, ""),
        "gen_settings":  json.loads(obj.get(GENSET_PROP, "{}") or "{}"),
        "baseline":      base,
        "final":         final,
        "poly_ratio":    poly_ratio,       # < 1 => you cut polys
        "scale_ratio":   scale_ratio,      # < 1 => you downscaled
        "parts_removed": parts_removed,    # loose junk you deleted
        "retextured":    bool(final["has_texture"] and not base.get("has_texture")),
        "rework_score":  rework,           # 0 == you changed nothing
    }

    rows = [r for r in _load() if r.get("bid") != row["bid"]]
    rows.append(row)
    if len(rows) > 200:
        rows = rows[-200:]
    _save(rows)

    verdict = ("PERFECT — no edits needed" if rework < 0.02
               else "good — minor cleanup" if rework < 0.15
               else "needs work")
    print(f"[FO4Evo] learned '{obj.name}': poly x{poly_ratio}, scale x{scale_ratio}, "
          f"-{parts_removed} parts, rework {rework} ({verdict})")
    return True, (f"Learned: kept {int(poly_ratio * 100)}% of polys, "
                  f"scale x{scale_ratio}, removed {parts_removed} loose part(s), "
                  f"rework {rework} — {verdict}")


def get_learned_adjustments() -> dict:
    """Average recorded deltas into recommendations for the NEXT build."""
    rows = _load()
    out = {
        "have_data": False,
        "sessions": 0,
        "recommended_target_polys": None,
        "recommended_prescale": None,
        "auto_remove_loose": False,
        "avg_rework": None,
        "trend": None,
        "description": "no edit history yet",
    }
    if not rows:
        return out

    out["have_data"] = True
    out["sessions"] = len(rows)

    # Target polys = what you actually KEEP (recent final poly counts).
    finals = [r["final"]["poly"] for r in rows if r.get("final", {}).get("poly")]
    if finals:
        recent = finals[-10:]
        out["recommended_target_polys"] = int(sum(recent) / len(recent))

    # Pre-scale = your typical downscale factor.
    scales = [r["scale_ratio"] for r in rows if r.get("scale_ratio")]
    if scales:
        recent = scales[-10:]
        out["recommended_prescale"] = round(sum(recent) / len(recent), 4)

    # Auto-remove loose junk if you routinely delete parts.
    removed = [r.get("parts_removed", 0) for r in rows[-10:]]
    if removed and sum(1 for x in removed if x > 0) >= max(2, len(removed) // 2):
        out["auto_remove_loose"] = True

    # Rework trend — are builds getting closer to finished?
    reworks = [r.get("rework_score", 0.0) for r in rows]
    out["avg_rework"] = round(sum(reworks) / len(reworks), 4)
    if len(reworks) >= 4:
        half = len(reworks) // 2
        early = sum(reworks[:half]) / half
        late  = sum(reworks[half:]) / (len(reworks) - half)
        out["trend"] = ("improving" if late < early - 0.02
                        else "worsening" if late > early + 0.02
                        else "steady")

    tp = out["recommended_target_polys"]
    out["description"] = (
        f"from {len(rows)} session(s) — target "
        f"~{tp:,} polys" if tp else f"from {len(rows)} session(s)"
    ) + (
        f", prescale x{out['recommended_prescale']}, "
        f"auto-clean {'on' if out['auto_remove_loose'] else 'off'}, "
        f"avg rework {out['avg_rework']} ({out['trend'] or 'n/a'})"
    )
    return out


def apply_learned_preprocess(obj) -> tuple:
    """One-click: apply the adjustments you usually make (downscale, weld,
    remove tiny loose parts) to a freshly generated mesh, so you start closer
    to finished.  Re-baselines afterward so learn_from_edits then measures only
    the residual manual work.
    """
    if bpy is None or obj is None or getattr(obj, "type", None) != 'MESH':
        return False, "no mesh"
    adj = get_learned_adjustments()
    if not adj["have_data"]:
        return False, "nothing learned yet — refine a few builds first"

    actions = []
    try:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Downscale to your usual size.
        ps = adj.get("recommended_prescale")
        if ps and abs(ps - 1.0) > 0.03:
            for i in range(3):
                obj.scale[i] *= ps
            bpy.ops.object.transform_apply(scale=True)
            actions.append(f"scaled x{ps}")

        # Weld + remove tiny loose parts if you routinely clean up.
        if adj.get("auto_remove_loose"):
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.remove_doubles(threshold=0.0001)
            try:
                bpy.ops.mesh.select_all(action='DESELECT')
                bpy.ops.mesh.select_loose()
                bpy.ops.mesh.delete(type='VERT')
            except Exception:
                pass
            bpy.ops.object.mode_set(mode='OBJECT')
            actions.append("welded + removed loose")

        # Re-baseline so residual edits are measured from here.
        tag_baseline(obj, source_image=obj.get(IMAGE_PROP, ""),
                     gen_settings=json.loads(obj.get(GENSET_PROP, "{}") or "{}"))
        return True, ("Applied learned adjustments: " + ", ".join(actions)
                      if actions else "No adjustments needed")
    except Exception as exc:
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except Exception:
            pass
        return False, f"apply failed: {exc}"


# ---------------------------------------------------------------------------
# Operators + registration
# ---------------------------------------------------------------------------
if bpy is not None:

    class FO4_OT_LearnFromEdits(bpy.types.Operator):
        """Record how you refined this generated mesh so future Hunyuan3D
        builds arrive closer to finished."""
        bl_idname = "fo4.learn_from_edits"
        bl_label = "Learn From My Edits"
        bl_options = {'REGISTER'}

        def execute(self, context):
            ok, msg = learn_from_edits(context.active_object)
            self.report({'INFO'} if ok else {'WARNING'}, msg)
            return {'FINISHED'} if ok else {'CANCELLED'}

    class FO4_OT_ApplyLearnedAdjustments(bpy.types.Operator):
        """Apply the adjustments you usually make (downscale, cleanup) to the
        active generated mesh."""
        bl_idname = "fo4.apply_learned_adjustments"
        bl_label = "Apply Learned Adjustments"
        bl_options = {'REGISTER', 'UNDO'}

        def execute(self, context):
            ok, msg = apply_learned_preprocess(context.active_object)
            self.report({'INFO'} if ok else {'WARNING'}, msg)
            return {'FINISHED'} if ok else {'CANCELLED'}

    class FO4_OT_ShowEvolutionStats(bpy.types.Operator):
        """Show what Hunyuan3D has learned from your edits."""
        bl_idname = "fo4.show_evolution_stats"
        bl_label = "Hunyuan3D Learning Status"
        bl_options = {'REGISTER'}

        def execute(self, context):
            adj = get_learned_adjustments()
            self.report({'INFO'}, adj["description"])
            print("[FO4Evo] " + adj["description"])
            return {'FINISHED'}

    @bpy.app.handlers.persistent
    def _auto_learn_on_save(_dummy):
        try:
            for obj in bpy.data.objects:
                if obj.type == 'MESH' and BASELINE_PROP in obj:
                    learn_from_edits(obj)
        except Exception as exc:
            print(f"[FO4Evo] auto-learn skipped: {exc}")

    _classes = (
        FO4_OT_LearnFromEdits,
        FO4_OT_ApplyLearnedAdjustments,
        FO4_OT_ShowEvolutionStats,
    )
else:
    _classes = ()


def register():
    if bpy is None:
        return
    for cls in _classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"[FO4Evo] register {cls.__name__} failed: {exc}")
    try:
        if _auto_learn_on_save not in bpy.app.handlers.save_post:
            bpy.app.handlers.save_post.append(_auto_learn_on_save)
    except Exception as exc:
        print(f"[FO4Evo] save handler hook failed: {exc}")
    print("[FO4Evo] mesh-evolution learning registered")


def unregister():
    if bpy is None:
        return
    try:
        if _auto_learn_on_save in bpy.app.handlers.save_post:
            bpy.app.handlers.save_post.remove(_auto_learn_on_save)
    except Exception:
        pass
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
