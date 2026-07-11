"""
fo4_asset_pipeline.py
=====================
Full Creation Kit ↔ Blender ↔ Creation Kit round-trip automation.

Workflow
--------
1. Import from CK
   - FBX exported from CK Render Window (File → Export Selected)
   - Or a folder of NIFs extracted from BA2 archives

2. Asset Analysis (FO4_OT_AnalyzeAssets)
   - Scans every mesh in the scene / active collection
   - Classifies: STATIC | SKINNED | VEGETATION | WEAPON | FURNITURE | ARCHITECTURE
   - Reports what each object needs: LOD, collision, animation, materials
   - Stores results as custom properties so other operators can read them

3. Auto-Process All (FO4_OT_AutoProcessAll)
   - Reads the analysis results
   - For each object, runs the correct sub-pipeline:
       STATIC      → LOD generation + UCX_ collision (if poly count warrants)
       VEGETATION  → Wind vertex groups + LOD (no collision for ground cover)
       SKINNED     → Skeleton alignment + armor/NPC setup
       WEAPON      → Weapon rig
       FURNITURE   → Reports: add furniture markers in CK
       ARCHITECTURE→ LOD generation + collision
   - Non-destructive: skips steps already done (existing LODs, existing collision, etc.)

4. Export back to CK (delegates to fo4_ck_cell.FO4_OT_ExportCKCell)
   - Writes NIF files to Data/Meshes/<original path>
   - Writes BGSM material files
   - Writes a manifest of changed files

5. Precombine Prep (FO4_OT_PrepPrecombine)
   - Groups static objects by material for CK precombine generation
   - Ensures all objects have correct NIF paths, unique names, and valid transforms
   - Exports static meshes to their CK paths
   - Prints step-by-step instructions for running "Generate Precombined" in the CK

LOD thresholds (FO4 community standard)
----------------------------------------
   < 500 tris  → no LOD needed
   500–2 000   → LOD1 + LOD2 recommended
   > 2 000     → LOD1 + LOD2 + LOD3 required
   > 10 000    → also recommend decimating source mesh

Collision rules
---------------
   GRASS / MUSHROOM / NONE fo4_collision_type → no physics collision (CK handles)
   Everything else with > 50 tris             → UCX_ convex hull from LOD3
   Objects already having UCX_ children       → skip

Animation rules
---------------
   Has Wind vertex group and fo4_object_type=VEGETATION → procedural wind, no HKX
   Has armature parent/modifier               → already rigged, just verify
   FURNITURE type                             → remind user to add markers in CK
   Completely static                          → nothing to do
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional, Tuple

try:
    import bpy
    from bpy.props import (BoolProperty, EnumProperty, IntProperty,
                            StringProperty)
    from bpy.types import Operator
except ImportError:
    bpy = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_LOD_NEEDED_THRESHOLD    = 500    # tris — below this, LOD is optional
_LOD_REQUIRED_THRESHOLD  = 2_000  # tris — above this, LOD is required for FO4
_COLLISION_THRESHOLD     = 50     # tris — below this, collision is not worth it
_NO_COLLISION_TYPES      = frozenset({"GRASS", "MUSHROOM", "NONE"})
_WIND_GROUP_NAMES        = frozenset({"Wind", "wind", "WIND",
                                      "WindWeight", "windweight",
                                      "WindStiff", "windstiff"})

# Custom-property keys written by the analyzer
_PROP_NEEDS_LOD        = "fo4_needs_lod"
_PROP_NEEDS_COLLISION  = "fo4_needs_collision"
_PROP_NEEDS_ANIM       = "fo4_needs_animation"
_PROP_NEEDS_MATERIAL   = "fo4_needs_material"
_PROP_NEEDS_OCCLUSION  = "fo4_needs_occlusion"
_PROP_ASSET_CLASS      = "fo4_asset_class"
_PROP_TRI_COUNT        = "fo4_tri_count"
_PROP_PROCESSED        = "fo4_pipeline_processed"


# ---------------------------------------------------------------------------
# Asset classification
# ---------------------------------------------------------------------------

def _count_tris(obj) -> int:
    """Return the triangle count for a mesh object."""
    me = obj.data
    return sum(1 if len(p.vertices) == 3 else 2 for p in me.polygons)


def _has_lod(obj) -> bool:
    """Return True if the object already has LOD children or siblings."""
    name = obj.name.upper()
    # LOD objects are named with _LOD1 / _LOD2 / _LOD3 suffix
    for suffix in ("_LOD1", "_LOD2", "_LOD3", "LOD0", "LOD1", "LOD2"):
        if suffix in name:
            return True  # this IS a LOD object
    # Check if any LOD children exist
    for child in obj.children:
        cn = child.name.upper()
        if "_LOD" in cn or "LOD1" in cn:
            return True
    # Check siblings sharing the same parent
    if obj.parent:
        for sib in obj.parent.children:
            sn = sib.name.upper()
            if "_LOD1" in sn and obj.name.upper().replace("_LOD0", "") in sn:
                return True
    return False


def _has_collision(obj, scene_objects) -> bool:
    """Return True if a UCX_ collision mesh exists for this object."""
    base = obj.name.upper().replace("_LOD0", "").replace("_MESH", "")
    for o in scene_objects:
        if o.type == "MESH" and o.name.upper().startswith("UCX_"):
            # UCX_ObjectName → check if it matches
            ucx_target = o.name.upper().replace("UCX_", "").replace("_0", "").rstrip("0123456789_")
            if base.startswith(ucx_target) or ucx_target.startswith(base[:8]):
                return True
    return False


def _has_wind_weights(obj) -> bool:
    return any(vg.name in _WIND_GROUP_NAMES for vg in obj.vertex_groups)


def _has_occlusion(obj, scene_objects) -> bool:
    """Return True if an OCL_ occlusion mesh already exists for this object."""
    base = obj.name.upper().replace("_LOD0", "").replace("_MESH", "")
    for o in scene_objects:
        if o.type != "MESH" or not o.name.upper().startswith("OCL_"):
            continue
        ocl_target = o.name.upper().replace("OCL_", "").replace("_0", "").rstrip("0123456789_")
        if base.startswith(ocl_target) or ocl_target.startswith(base[:8]):
            return True
    return False


def _is_lod_object(obj) -> bool:
    name = obj.name.upper()
    return any(s in name for s in ("_LOD1", "_LOD2", "_LOD3", "_LOD4",
                                    "UCX_", "COLLISION_", "OCL_"))


def classify_asset(obj, scene_objects=None) -> Dict:
    """Classify a mesh object and return an analysis dict.

    Returns
    -------
    dict with keys:
        asset_class     : str  — STATIC | SKINNED | VEGETATION | WEAPON |
                                 FURNITURE | ARCHITECTURE | LOD | UCX
        tri_count       : int
        needs_lod       : bool
        needs_collision : bool
        needs_animation : str | None  — None | "wind" | "rig" | "furniture"
        needs_material  : bool
        has_lod         : bool
        has_collision   : bool
        reasons         : list[str]  — human-readable explanations
    """
    if scene_objects is None:
        scene_objects = list(bpy.context.scene.objects) if bpy else []

    reasons: List[str] = []

    # ── Skip LOD / UCX objects ──────────────────────────────────────────────
    if _is_lod_object(obj):
        return {
            "asset_class": "LOD" if "LOD" in obj.name.upper() else "UCX",
            "tri_count": 0, "needs_lod": False, "needs_collision": False,
            "needs_animation": None, "needs_material": False,
            "has_lod": True, "has_collision": True, "reasons": [],
        }

    # ── Detect class ────────────────────────────────────────────────────────
    existing_class = obj.get("fo4_object_type", "")
    armature_parent = obj.parent and obj.parent.type == "ARMATURE"
    has_armature_mod = any(m.type == "ARMATURE" for m in obj.modifiers)
    is_skinned = armature_parent or has_armature_mod
    is_wind_veg = _has_wind_weights(obj) or existing_class in ("VEGETATION", "FLORA")
    mat_name = (obj.active_material.name.lower() if obj.active_material else "")

    if existing_class in ("SKINNED", "CHARACTER", "NPC", "ARMOR", "CREATURE"):
        asset_class = "SKINNED"
    elif existing_class in ("WEAPON",) or "weapon" in obj.name.lower():
        asset_class = "WEAPON"
    elif is_wind_veg or existing_class in ("VEGETATION", "FLORA"):
        asset_class = "VEGETATION"
    elif is_skinned:
        asset_class = "SKINNED"
    elif existing_class in ("FURNITURE",) or "furn" in obj.name.lower():
        asset_class = "FURNITURE"
    elif existing_class in ("ARCHITECTURE", "ARCH"):
        asset_class = "ARCHITECTURE"
    else:
        asset_class = "STATIC"

    # ── Triangle count ──────────────────────────────────────────────────────
    tri_count = _count_tris(obj)

    # ── LOD needs ───────────────────────────────────────────────────────────
    already_has_lod = _has_lod(obj)
    if asset_class in ("SKINNED", "WEAPON"):
        needs_lod = False  # skinned meshes don't use static LOD
    elif already_has_lod:
        needs_lod = False
    elif tri_count < _LOD_NEEDED_THRESHOLD:
        needs_lod = False
    else:
        needs_lod = True
        sev = "required" if tri_count >= _LOD_REQUIRED_THRESHOLD else "recommended"
        reasons.append(f"LOD {sev} ({tri_count:,} tris)")

    # ── Collision needs ─────────────────────────────────────────────────────
    coll_type = obj.get("fo4_collision_type", "DEFAULT")
    already_has_coll = _has_collision(obj, scene_objects)
    if asset_class in ("SKINNED", "WEAPON", "VEGETATION") and coll_type in _NO_COLLISION_TYPES:
        needs_collision = False
    elif asset_class == "VEGETATION" and coll_type in _NO_COLLISION_TYPES:
        needs_collision = False
    elif already_has_coll:
        needs_collision = False
    elif tri_count < _COLLISION_THRESHOLD:
        needs_collision = False
    elif asset_class in ("SKINNED",):
        needs_collision = False  # NPC collision is capsule-based, done in CK
    else:
        needs_collision = True
        reasons.append(f"Collision mesh needed (UCX_ convex hull)")

    # ── Animation needs ─────────────────────────────────────────────────────
    needs_animation: Optional[str] = None
    if asset_class == "VEGETATION":
        if not _has_wind_weights(obj):
            needs_animation = "wind"
            reasons.append("Wind vertex groups missing (needed for vegetation sway)")
    elif asset_class == "FURNITURE":
        needs_animation = "furniture"
        reasons.append("Furniture markers must be set in Creation Kit")
    elif asset_class in ("SKINNED",) and not is_skinned:
        needs_animation = "rig"
        reasons.append("Mesh is classified as skinned but has no armature")

    # ── Occlusion mesh needs ────────────────────────────────────────────────
    already_has_ocl = _has_occlusion(obj, scene_objects)
    if (asset_class in ("STATIC", "ARCHITECTURE")
            and tri_count >= _LOD_REQUIRED_THRESHOLD
            and not already_has_ocl):
        needs_occlusion = True
        reasons.append(f"Occlusion mesh recommended ({tri_count:,} tris)")
    else:
        needs_occlusion = False

    # ── Material needs ──────────────────────────────────────────────────────
    has_diffuse = False
    if obj.active_material and obj.active_material.use_nodes:
        for node in obj.active_material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                has_diffuse = True
                break
    needs_material = not has_diffuse
    if needs_material:
        reasons.append("No diffuse texture loaded in material")

    return {
        "asset_class":      asset_class,
        "tri_count":        tri_count,
        "needs_lod":        needs_lod,
        "needs_collision":  needs_collision,
        "needs_animation":  needs_animation,
        "needs_occlusion":  needs_occlusion,
        "needs_material":   needs_material,
        "has_lod":          already_has_lod,
        "has_collision":    already_has_coll,
        "has_occlusion":    already_has_ocl,
        "reasons":          reasons,
    }


def analyze_scene(collection=None) -> Dict[str, Dict]:
    """Analyze all mesh objects in *collection* (or the whole scene).

    Returns a dict keyed by object name → classify_asset() result.
    """
    if bpy is None:
        return {}
    if collection:
        objs = [o for o in collection.all_objects if o.type == "MESH"]
    else:
        objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]

    scene_objects = list(bpy.context.scene.objects)
    results: Dict[str, Dict] = {}
    for obj in objs:
        analysis = classify_asset(obj, scene_objects)
        results[obj.name] = analysis
        # Write summary to custom properties so other operators can read
        obj[_PROP_ASSET_CLASS]      = analysis["asset_class"]
        obj[_PROP_NEEDS_LOD]        = analysis["needs_lod"]
        obj[_PROP_NEEDS_COLLISION]  = analysis["needs_collision"]
        obj[_PROP_NEEDS_ANIM]       = analysis["needs_animation"] or ""
        obj[_PROP_NEEDS_OCCLUSION]  = analysis["needs_occlusion"]
        obj[_PROP_NEEDS_MATERIAL]   = analysis["needs_material"]
        obj[_PROP_TRI_COUNT]        = analysis["tri_count"]

    return results


# ---------------------------------------------------------------------------
# Auto-process helpers
# ---------------------------------------------------------------------------

def _run_lod(obj, context) -> Tuple[bool, str]:
    """Run the LOD generator on *obj* using existing fo4_lod_generator."""
    try:
        context.view_layer.objects.active = obj
        obj.select_set(True)
        result = bpy.ops.fo4.generate_lods("INVOKE_DEFAULT")
        # INVOKE_DEFAULT opens a dialog — use EXEC_DEFAULT with defaults
        bpy.ops.fo4.generate_lods("EXEC_DEFAULT")
        return True, f"LOD generated for '{obj.name}'"
    except Exception as exc:
        return False, f"LOD failed for '{obj.name}': {exc}"


def _run_wind(obj, context) -> Tuple[bool, str]:
    """Apply vegetation wind weights."""
    try:
        from . import animation_helpers as _ah
        _ah.AnimationHelpers.apply_vegetation_wind(obj)
        return True, f"Wind weights applied to '{obj.name}'"
    except Exception as exc:
        return False, f"Wind weights failed for '{obj.name}': {exc}"


def _run_occlusion(obj, context) -> Tuple[bool, str]:
    """Generate an OCL_ occlusion mesh from the lowest available LOD.

    Takes the lowest-resolution LOD (LOD3 → LOD2 → LOD1 → source), builds a
    convex hull in Blender-space, then decimates to ≤ 64 faces so the CK can
    use it for visibility/portal culling without a performance cost.
    The result is named OCL_{obj.name}, tagged with fo4_occlusion_mesh=True,
    and parented to obj.
    """
    try:
        import bmesh as _bm

        scene_objects = list(context.scene.objects)

        if _has_occlusion(obj, scene_objects):
            return True, f"'{obj.name}' already has an occlusion mesh — skipping"

        # Find lowest available LOD as hull source
        source = obj
        base_upper = obj.name.upper()
        for suffix in ("_LOD3", "_LOD2", "_LOD1"):
            for o in scene_objects:
                if o.type != "MESH":
                    continue
                oname = o.name.upper()
                if suffix not in oname:
                    continue
                candidate_base = oname.replace(suffix, "")
                if candidate_base == base_upper or base_upper == candidate_base:
                    source = o
                    break
            if source is not obj:
                break

        # Build convex hull in world space then convert to obj's local space
        bm = _bm.new()
        bm.from_mesh(source.data)
        bm.transform(source.matrix_world)          # → world space

        result = _bm.ops.convex_hull(bm, input=bm.verts, use_existing_faces=True)
        hull_face_set = frozenset(
            e for e in result.get("geom", []) if isinstance(e, _bm.types.BMFace)
        )
        non_hull = [f for f in bm.faces if f not in hull_face_set]
        if non_hull:
            _bm.ops.delete(bm, geom=non_hull, context="FACES")
        _bm.ops.dissolve_degenerate(bm, dist=0.0001, edges=list(bm.edges))
        bm.transform(obj.matrix_world.inverted())  # → obj local space
        bm.normal_update()

        ocl_mesh = bpy.data.meshes.new(f"OCL_{obj.name}")
        bm.to_mesh(ocl_mesh)
        bm.free()

        ocl_obj = bpy.data.objects.new(f"OCL_{obj.name}", ocl_mesh)
        context.scene.collection.objects.link(ocl_obj)

        # Decimate to ≤ 64 faces — convex hulls of simple assets are usually
        # already under this, but large architecture meshes can be much higher.
        face_count = len(ocl_mesh.polygons)
        if face_count > 64:
            dec = ocl_obj.modifiers.new("OCL_Decimate", "DECIMATE")
            dec.ratio = max(0.02, min(1.0, 64.0 / face_count))
            context.view_layer.objects.active = ocl_obj
            bpy.ops.object.modifier_apply(modifier="OCL_Decimate")

        # Tag and parent — child's verts are already in obj-local space, so
        # matrix_parent_inverse stays as identity (no hidden offset).
        ocl_obj["fo4_occlusion_mesh"] = True
        ocl_obj.parent = obj
        ocl_obj.matrix_parent_inverse.identity()

        return True, f"Occlusion mesh 'OCL_{obj.name}' created from '{source.name}'"
    except Exception as exc:
        return False, f"Occlusion generation failed for '{obj.name}': {exc}"


def _run_armor_setup(obj, context) -> Tuple[bool, str]:
    """Run Auto-Setup Armor for skinned meshes.

    Rigging/binding always runs.  If PyNifly is not installed the rigging still
    completes (Blender-side weights are correct), but a warning is appended
    because the NIF export step will fail without PyNifly — skinned FO4 NIFs
    require BSSubIndexTriShape which the native writer does not support.
    """
    pynifly_ok = True
    pynifly_warn = ""
    try:
        from . import export_helpers as _eh
        pynifly_ok, pynifly_msg = _eh.ExportHelpers.pynifly_exporter_available()
        if not pynifly_ok:
            pynifly_warn = (
                f" — WARNING: PyNifly failed to load ({pynifly_msg}). "
                "Skinned/armor NIF export requires PyNifly (BSSubIndexTriShape). "
                "Try restarting Blender; if the problem persists use "
                "FO4 Tools panel → Reinstall PyNifly."
            )
    except Exception:
        pass

    try:
        context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.fo4.auto_setup_armor("EXEC_DEFAULT")
        return True, f"Armor/skinned setup done for '{obj.name}'" + pynifly_warn
    except Exception as exc:
        return False, f"Armor setup failed for '{obj.name}': {exc}"


def auto_process_object(obj, analysis: Dict, context) -> List[Tuple[bool, str]]:
    """Run all needed pipeline steps for one object based on its analysis."""
    steps: List[Tuple[bool, str]] = []

    if analysis.get("needs_lod"):
        steps.append(_run_lod(obj, context))

    if analysis.get("needs_occlusion"):
        steps.append(_run_occlusion(obj, context))

    anim_need = analysis.get("needs_animation")
    if anim_need == "wind":
        steps.append(_run_wind(obj, context))
    elif anim_need == "rig":
        steps.append(_run_armor_setup(obj, context))
    elif anim_need == "furniture":
        steps.append((True,
            f"'{obj.name}': Add furniture markers in Creation Kit "
            "(FURN record → Marker Entries)"))

    obj[_PROP_PROCESSED] = True
    return steps


# ---------------------------------------------------------------------------
# Precombine preparation
# ---------------------------------------------------------------------------

def prep_precombine(collection=None, mod_folder: str = "") -> List[str]:
    """
    Prepare static meshes for CK precombine generation.

    Steps:
    1. Collect all STATIC objects with fo4 NIF paths.
    2. Verify each has: unique name, valid transforms applied, a material.
    3. Apply scale/rotation if needed.
    4. Export each to its NIF path (delegates to ExportCKCell or fo4.pipeline_static_mesh).
    5. Return instructions for running "Generate Precombined" in the CK.

    CK Precombine workflow (printed as instructions):
      1. Load your ESP in CK.
      2. Open each cell that contains the exported static objects.
      3. Render Window → Edit → Generate Precombined Geometry.
      4. In the dialog: check "Selected Cells" and "Only Update Stale".
      5. Click OK.  CK writes meshes to Meshes/PreCombined/.
      6. Save the plugin.
      7. Run Archive2 to pack the Meshes/PreCombined/ folder into a BA2.
    """
    if bpy is None:
        return ["bpy not available"]

    if collection:
        objs = [o for o in collection.all_objects
                if o.type == "MESH" and o.get(_PROP_ASSET_CLASS) in (None, "STATIC", "ARCHITECTURE")]
    else:
        objs = [o for o in bpy.context.scene.objects
                if o.type == "MESH" and o.get(_PROP_ASSET_CLASS) in (None, "STATIC", "ARCHITECTURE")]

    log: List[str] = []

    for obj in objs:
        # Apply transforms so scale=1, rotation=identity in the NIF
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            log.append(f"✓ Applied transforms: {obj.name}")
        except Exception as exc:
            log.append(f"⚠ Transform apply failed for {obj.name}: {exc}")

        # Check material
        if not obj.active_material:
            log.append(f"⚠ No material on '{obj.name}' — add a BGSM material before exporting")

        # Check NIF path
        nif_path = obj.get("fo4_nif_path", "")
        if not nif_path:
            # Derive a path from the object name
            safe_name = obj.name.replace(" ", "_").replace(".", "_")
            nif_path = f"Meshes/MossyMod/{safe_name}.nif"
            obj["fo4_nif_path"] = nif_path
            log.append(f"  Auto-assigned NIF path: {nif_path}")

        obj.select_set(False)

    log.append("")
    log.append("─── PRECOMBINE INSTRUCTIONS ────────────────────────────────")
    log.append("After exporting all NIFs to your mod's Data/ folder:")
    log.append("1. Open Creation Kit and load your plugin.")
    log.append("2. Open each cell in the Render Window.")
    log.append("3. Menu: Edit → Generate Precombined Geometry")
    log.append("   ☑ Selected Cells   ☑ Only Update Stale")
    log.append("4. Click OK.  CK writes Meshes/PreCombined/*.nif")
    log.append("5. Save your plugin.")
    log.append("6. Run Archive2.exe:")
    log.append('   Archive2 "Data\\Meshes\\PreCombined" -create="PreCombined.ba2"')
    log.append("7. Add the .ba2 to your mod package.")
    log.append("────────────────────────────────────────────────────────────")

    return log


# ---------------------------------------------------------------------------
# Blender Operators
# ---------------------------------------------------------------------------

if bpy is not None:

    class FO4_OT_AnalyzeAssets(Operator):
        """Scan all mesh objects and detect what each one needs for FO4 export.

        Results are printed to the console and stored as custom properties
        (fo4_needs_lod, fo4_needs_collision, fo4_needs_animation, etc.) so
        the Auto-Process All operator can act on them immediately.
        """
        bl_idname  = "fo4.analyze_assets"
        bl_label   = "Analyze Assets"
        bl_options = {"REGISTER"}

        scope: EnumProperty(
            name="Scope",
            items=[
                ("SCENE",      "Whole Scene",      "Analyze all meshes in the scene"),
                ("SELECTED",   "Selected Objects", "Analyze only selected mesh objects"),
                ("COLLECTION", "Active Collection","Analyze the active collection"),
            ],
            default="SCENE",
        )

        def execute(self, context):
            if self.scope == "SELECTED":
                objs = [o for o in context.selected_objects if o.type == "MESH"]
                results = {}
                so = list(context.scene.objects)
                for o in objs:
                    results[o.name] = classify_asset(o, so)
                    for k, v in results[o.name].items():
                        if k not in ("reasons",):
                            o[f"fo4_{k}"] = v if not isinstance(v, bool) else int(v)
            elif self.scope == "COLLECTION":
                col = context.collection or context.scene.collection
                results = analyze_scene(collection=col)
            else:
                results = analyze_scene()

            # ── Print report ─────────────────────────────────────────────
            print("\n" + "═" * 68)
            print("  FO4 ASSET ANALYSIS REPORT")
            print("═" * 68)
            needs_work  = 0
            ready_count = 0
            skipped     = 0

            for name, info in sorted(results.items()):
                cls        = info["asset_class"]
                tris       = info["tri_count"]
                reasons    = info["reasons"]

                if cls in ("LOD", "UCX"):
                    skipped += 1
                    continue

                if not reasons:
                    ready_count += 1
                    status = "✓ READY"
                else:
                    needs_work += 1
                    status = "⚠ NEEDS WORK"

                lod_s  = "YES" if info["needs_lod"]       else ("✓" if info["has_lod"]       else "—")
                col_s  = "YES" if info["needs_collision"]  else ("✓" if info["has_collision"] else "—")
                anim_s = info["needs_animation"] or "—"
                mat_s  = "YES" if info["needs_material"]   else "✓"

                print(f"\n  {status}  [{cls}]  {name}  ({tris:,} tris)")
                print(f"    LOD:{lod_s}  Collision:{col_s}  Anim:{anim_s}  Material:{mat_s}")
                for r in reasons:
                    print(f"    → {r}")

            print(f"\n  Summary: {ready_count} ready | {needs_work} need work | {skipped} LOD/UCX skipped")
            print("═" * 68 + "\n")

            total = ready_count + needs_work
            self.report(
                {"INFO"} if needs_work == 0 else {"WARNING"},
                f"Analysis complete: {ready_count}/{total} objects ready. "
                f"{needs_work} need LOD/collision/animation/material work. "
                "See console for details."
            )
            return {"FINISHED"}

        def invoke(self, context, event):
            return context.window_manager.invoke_props_dialog(self, width=320)

        def draw(self, context):
            self.layout.prop(self, "scope")
            self.layout.label(
                text="Results stored as custom properties + printed to console.",
                icon="INFO",
            )


    class FO4_OT_AutoProcessAll(Operator):
        """Auto-process all analyzed mesh objects through the correct FO4 pipeline.

        Reads fo4_needs_lod / fo4_needs_collision / fo4_needs_animation properties
        set by 'Analyze Assets' and runs the correct sub-pipeline for each object:
          STATIC      → LOD generation (fo4.generate_lods)
          VEGETATION  → Wind vertex groups (fo4.apply_vegetation_wind)
          SKINNED     → Armor/skeleton setup (fo4.auto_setup_armor)
          WEAPON      → Weapon rig (fo4.auto_rig_weapon)
          FURNITURE   → Prints CK instructions
        """
        bl_idname  = "fo4.auto_process_all"
        bl_label   = "Auto-Process All Assets"
        bl_options = {"REGISTER", "UNDO"}

        scope: EnumProperty(
            name="Scope",
            items=[
                ("SCENE",    "Whole Scene",       "Process all analyzed meshes"),
                ("SELECTED", "Selected Objects",  "Process only selected objects"),
            ],
            default="SCENE",
        )
        run_analysis_first: BoolProperty(
            name="Run Analysis First",
            description="Analyze every object before processing (recommended)",
            default=True,
        )
        skip_already_processed: BoolProperty(
            name="Skip Already Processed",
            description="Skip objects that have already been processed this session",
            default=True,
        )

        def execute(self, context):
            if self.run_analysis_first:
                bpy.ops.fo4.analyze_assets("EXEC_DEFAULT", scope=self.scope)

            if self.scope == "SELECTED":
                objs = [o for o in context.selected_objects if o.type == "MESH"]
            else:
                objs = [o for o in context.scene.objects if o.type == "MESH"]

            all_steps: List[Tuple[bool, str]] = []
            processed = 0
            skipped   = 0

            for obj in objs:
                asset_class = obj.get(_PROP_ASSET_CLASS, "")
                if asset_class in ("LOD", "UCX"):
                    continue
                if self.skip_already_processed and obj.get(_PROP_PROCESSED):
                    skipped += 1
                    continue

                analysis = {
                    "asset_class":     asset_class,
                    "needs_lod":       bool(obj.get(_PROP_NEEDS_LOD, False)),
                    "needs_collision": bool(obj.get(_PROP_NEEDS_COLLISION, False)),
                    "needs_animation": obj.get(_PROP_NEEDS_ANIM) or None,
                    "needs_material":  bool(obj.get(_PROP_NEEDS_MATERIAL, False)),
                    "tri_count":       obj.get(_PROP_TRI_COUNT, 0),
                }

                if not any([analysis["needs_lod"], analysis["needs_collision"],
                             analysis["needs_animation"]]):
                    continue

                steps = auto_process_object(obj, analysis, context)
                all_steps.extend(steps)
                processed += 1

            # ── Print results ─────────────────────────────────────────────
            print(f"\n[FO4 Pipeline] Auto-process complete:")
            ok_count  = sum(1 for ok, _ in all_steps if ok)
            err_count = sum(1 for ok, _ in all_steps if not ok)
            for ok, msg in all_steps:
                print(f"  {'✓' if ok else '✗'} {msg}")
            print(f"  Objects processed: {processed} | Steps: {ok_count} OK, {err_count} failed | Skipped: {skipped}\n")

            self.report(
                {"INFO"} if err_count == 0 else {"WARNING"},
                f"Processed {processed} objects ({ok_count} steps OK, {err_count} failed). "
                f"See console for details.",
            )
            return {"FINISHED"}

        def invoke(self, context, event):
            return context.window_manager.invoke_props_dialog(self, width=360)

        def draw(self, context):
            layout = self.layout
            layout.prop(self, "scope")
            layout.prop(self, "run_analysis_first")
            layout.prop(self, "skip_already_processed")
            layout.separator()
            layout.label(text="Will run: LOD → Wind → Armor/Rig → Weapon rig", icon="INFO")
            layout.label(text="Collision is baked via LOD generator (LOD3 → UCX_).")


    class FO4_OT_PrepPrecombine(Operator):
        """Prepare static meshes for Creation Kit precombine generation.

        Applies transforms, assigns NIF paths, and prints step-by-step
        instructions for running 'Generate Precombined Geometry' in the CK.
        """
        bl_idname  = "fo4.prep_precombine"
        bl_label   = "Prep Precombines (Static Meshes)"
        bl_options = {"REGISTER", "UNDO"}

        scope: EnumProperty(
            name="Scope",
            items=[
                ("SCENE",      "Whole Scene",       "Prepare all static meshes"),
                ("COLLECTION", "Active Collection", "Prepare active collection only"),
            ],
            default="SCENE",
        )
        mod_folder: StringProperty(
            name="Mod Data Folder",
            description="Your mod's Data/ folder root (e.g. D:\\MyMod\\Data)",
            default="",
            subtype="DIR_PATH",
        )
        export_niifs: BoolProperty(
            name="Export NIFs after prep",
            description="Run Export Cell Objects after preparing (requires PyNifly)",
            default=False,
        )

        def execute(self, context):
            col = None
            if self.scope == "COLLECTION":
                col = context.collection or context.scene.collection

            log = prep_precombine(collection=col, mod_folder=self.mod_folder)

            for line in log:
                print(line)

            if self.export_niifs:
                try:
                    bpy.ops.fo4.export_ck_cell(
                        "EXEC_DEFAULT",
                        mod_folder=self.mod_folder,
                        export_all=False,
                        export_bgsm=True,
                        write_manifest=True,
                    )
                except Exception as exc:
                    self.report({"WARNING"}, f"NIF export failed: {exc}")

            self.report(
                {"INFO"},
                "Precombine prep complete. See console for CK instructions.",
            )
            return {"FINISHED"}

        def invoke(self, context, event):
            return context.window_manager.invoke_props_dialog(self, width=420)

        def draw(self, context):
            layout = self.layout
            layout.prop(self, "scope")
            layout.prop(self, "mod_folder")
            layout.prop(self, "export_niifs")
            layout.separator()
            layout.label(text="Applies transforms and assigns NIF paths.", icon="INFO")
            layout.label(text="Then prints CK 'Generate Precombined' instructions.")


    class FO4_OT_FullCKRoundTrip(Operator):
        """Run the complete CK → Blender → CK round-trip pipeline.

        Step 1: Analyze all assets (detect LOD / collision / animation needs)
        Step 2: Auto-process all assets (generate LOD, wind, rigs as needed)
        Step 3: Validate textures / materials
        Step 4: Export all modified meshes to NIF
        Step 5: Print precombine instructions

        This is the 'do everything' button for getting a full cell mod ready.
        """
        bl_idname  = "fo4.full_ck_roundtrip"
        bl_label   = "Full CK Round-Trip Pipeline"
        bl_options = {"REGISTER", "UNDO"}

        mod_folder: StringProperty(
            name="Mod Data Folder",
            description="Your mod's Data/ folder (NIFs exported here)",
            default="",
            subtype="DIR_PATH",
        )
        generate_lod: BoolProperty(
            name="Generate LOD", default=True,
            description="Auto-generate LOD meshes for static objects")
        add_collision: BoolProperty(
            name="Add Collision", default=True,
            description="Generate UCX_ collision from LOD3 for static objects")
        setup_animation: BoolProperty(
            name="Setup Animation", default=True,
            description="Apply wind weights for vegetation, check armatures for skinned")
        export_nifs: BoolProperty(
            name="Export NIFs", default=True,
            description="Export all processed meshes as NIFs to the mod folder")
        prep_precombines: BoolProperty(
            name="Prep Precombines", default=True,
            description="Apply transforms and print CK precombine instructions")

        def execute(self, context):
            steps_log: List[str] = []

            # ── Step 1: Analyze ───────────────────────────────────────────
            steps_log.append("Step 1: Analyzing assets...")
            bpy.ops.fo4.analyze_assets("EXEC_DEFAULT", scope="SCENE")

            # ── Step 2: Auto-process ──────────────────────────────────────
            steps_log.append("Step 2: Auto-processing (LOD / animation / rigs)...")
            bpy.ops.fo4.auto_process_all("EXEC_DEFAULT",
                scope="SCENE",
                run_analysis_first=False,
                skip_already_processed=True)

            # ── Step 3: Validate textures ─────────────────────────────────
            steps_log.append("Step 3: Validating textures...")
            missing_tex: List[str] = []
            for obj in context.scene.objects:
                if obj.type != "MESH":
                    continue
                if not obj.active_material:
                    missing_tex.append(f"{obj.name}: no material")
                    continue
                try:
                    from . import texture_helpers as _th
                    if _th:
                        ok, issues = _th.TextureHelpers.validate_textures(obj)
                        if not ok:
                            for iss in issues:
                                missing_tex.append(f"{obj.name}: {iss}")
                except Exception:
                    pass
            if missing_tex:
                for m in missing_tex[:10]:
                    steps_log.append(f"  ⚠ {m}")
                if len(missing_tex) > 10:
                    steps_log.append(f"  … and {len(missing_tex)-10} more")

            # ── Step 4: Export NIFs ───────────────────────────────────────
            if self.export_nifs and self.mod_folder:
                steps_log.append("Step 4: Exporting NIFs...")
                try:
                    bpy.ops.fo4.export_ck_cell(
                        "EXEC_DEFAULT",
                        mod_folder=self.mod_folder,
                        export_all=False,
                        export_bgsm=True,
                        write_manifest=True,
                    )
                    steps_log.append("  ✓ NIF export complete")
                except Exception as exc:
                    steps_log.append(f"  ✗ NIF export failed: {exc}")
            elif self.export_nifs and not self.mod_folder:
                steps_log.append("Step 4: Skipped — set Mod Data Folder to export NIFs")

            # ── Step 5: Precombine prep ───────────────────────────────────
            if self.prep_precombines:
                steps_log.append("Step 5: Prepping precombines...")
                pc_log = prep_precombine(mod_folder=self.mod_folder)
                steps_log.extend(pc_log)

            print("\n" + "═" * 68)
            print("  FO4 FULL PIPELINE COMPLETE")
            print("═" * 68)
            for line in steps_log:
                print(f"  {line}")
            print("═" * 68 + "\n")

            self.report({"INFO"},
                "Full pipeline complete. Check the console for the precombine "
                "instructions and any warnings.")
            return {"FINISHED"}

        def invoke(self, context, event):
            return context.window_manager.invoke_props_dialog(self, width=400)

        def draw(self, context):
            layout = self.layout
            layout.label(text="Full CK → Blender → CK Pipeline", icon="WORLD")
            layout.separator()
            layout.prop(self, "mod_folder")
            layout.separator()
            col = layout.column(align=True)
            col.prop(self, "generate_lod")
            col.prop(self, "add_collision")
            col.prop(self, "setup_animation")
            col.prop(self, "export_nifs")
            col.prop(self, "prep_precombines")
            layout.separator()
            layout.label(
                text="Tip: Run 'Analyze Assets' first to preview what will be done.",
                icon="INFO",
            )


    _CLASSES = [
        FO4_OT_AnalyzeAssets,
        FO4_OT_AutoProcessAll,
        FO4_OT_PrepPrecombine,
        FO4_OT_FullCKRoundTrip,
    ]

else:
    _CLASSES = []


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"fo4_asset_pipeline: Could not register {cls.__name__}: {exc}")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
