"""
fo4_workshop_helper.py
======================
Settlement workshop object setup for Fallout 4.

Handles: snap points, budget, COBJ/STAT generation, workshop menu categories,
and the one-click "selection -> workshop mod" batch pipeline.
"""
import bpy, os, json, math, struct
from pathlib import Path
from typing import List, Optional

try:
    from . import export_helpers as _eh
except ImportError:
    _eh = None
try:
    from . import mesh_helpers as _mesh
except ImportError:
    _mesh = None
try:
    from . import bgsm_helpers as _bgsm
except ImportError:
    _bgsm = None
try:
    from . import fo4_batch_tools as _batch
except ImportError:
    _batch = None

# FO4 workshop budget limits
BUDGET_LIMITS = {
    "draw_calls":   600,
    "triangles":    100000,
    "script_ms":    3.0,
}

# Workshop menu categories
WORKSHOP_CATEGORIES = {
    "STRUCTURES":   ("Structures",    "Buildings and structural pieces"),
    "FURNITURE":    ("Furniture",     "Chairs, beds, tables"),
    "POWER":        ("Power",         "Generators and conduits"),
    "STORES":       ("Stores",        "Shops and trade posts"),
    "FOOD":         ("Food",          "Crops and water"),
    "DEFENSE":      ("Defense",       "Turrets and traps"),
    "LIGHTING":     ("Lighting",      "Lights and lanterns"),
    "MISC":         ("Miscellaneous", "Other workshop items"),
    "DECORATIONS":  ("Decorations",   "Signs and decorations"),
    "RESOURCES":    ("Resources",     "Scrap and material piles"),
}

# Real, verified EditorIDs (confirmed by parsing Fallout4.esm directly and
# cross-checking against a real published workshop mod's COBJ records --
# see fo4_workshop_helper module docstring). BNAM = "Workbench Type" keyword
# (which workshop mode/tab owns the recipe); FNAM = "Recipe Filter" keyword
# (the specific sub-category within that tab). Both are single-FormID
# subrecords on COBJ, resolved by EditorID against Fallout4.esm at script
# run time -- not hardcoded FormIDs, since load order can shift them.
WORKSHOP_CATEGORY_KEYWORDS = {
    "STRUCTURES":  ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterBuilding"),
    "FURNITURE":   ("WorkshopWorkbenchTypeFurniture",    "WorkshopRecipeFilterFurniture"),
    "POWER":       ("WorkshopWorkbenchTypePower",        "WorkshopRecipeFilterResource02Power"),
    "STORES":      ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterVendor"),
    "FOOD":        ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterResource02Food"),
    "DEFENSE":     ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterResource02Defense"),
    "LIGHTING":    ("WorkshopWorkbenchTypePower",        "WorkshopRecipeFilterResource02Power03Lights"),
    "MISC":        ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterMisc"),
    "DECORATIONS": ("WorkshopWorkbenchTypeDecorations",  "WorkshopRecipeFilterDecor"),
    "RESOURCES":   ("WorkshopWorkbenchTypeSettlement",   "WorkshopRecipeFilterResource"),
}

SNAP_TYPES = [
    ("FLOOR",   "Floor Snap",   "Snaps to flat floor surfaces"),
    ("WALL",    "Wall Snap",    "Snaps to vertical wall surfaces"),
    ("CEILING", "Ceiling Snap", "Snaps to overhead surfaces"),
    ("CORNER",  "Corner Snap",  "Snaps to 90-degree corners"),
    ("EDGE",    "Edge Snap",    "Snaps along edges"),
    ("CENTER",  "Center Snap",  "Free placement with center pivot"),
]

# Havok/NIF scale used throughout the addon's export pipeline (see
# export_helpers._FO4_UNIT_SCALE_INV) -- reused here so OBND bounds are
# expressed in the same game-unit space the exported NIF actually uses.
_FO4_UNIT_SCALE = getattr(_eh, "_FO4_UNIT_SCALE_INV", 69.99125) if _eh else 69.99125


def add_snap_points(obj, snap_type: str = "FLOOR",
                    auto_detect: bool = True) -> List[bpy.types.Object]:
    """Add workshop snap point empties to an object.

    Snap points are empty objects with the 'FO4_SNAP_' prefix placed at
    logical attachment positions detected from the mesh bounding box.
    """
    me = obj.data
    mw = obj.matrix_world
    vs = [mw @ v.co for v in me.vertices]
    if not vs:
        return []

    xs=[v.x for v in vs]; ys=[v.y for v in vs]; zs=[v.z for v in vs]
    cx=(max(xs)+min(xs))/2; cy=(max(ys)+min(ys))/2
    min_z=min(zs); max_z=max(zs); min_y=min(ys); max_y=max(ys)
    min_x=min(xs); max_x=max(xs)

    snap_positions = []

    if auto_detect:
        name_lower = obj.name.lower()
        if any(k in name_lower for k in ["floor","platform","ground","base"]):
            snap_type = "FLOOR"
        elif any(k in name_lower for k in ["wall","fence","barrier"]):
            snap_type = "WALL"
        elif any(k in name_lower for k in ["roof","ceiling","top"]):
            snap_type = "CEILING"

    if snap_type == "FLOOR":
        # Bottom center + four corners
        snap_positions = [
            ((cx, cy, min_z), "FL_Center"),
            ((min_x, min_y, min_z), "FL_CornerBL"),
            ((max_x, min_y, min_z), "FL_CornerBR"),
            ((min_x, max_y, min_z), "FL_CornerFL"),
            ((max_x, max_y, min_z), "FL_CornerFR"),
        ]
    elif snap_type == "WALL":
        snap_positions = [
            ((cx, min_y, min_z+(max_z-min_z)/2), "WL_Front_Mid"),
            ((cx, max_y, min_z+(max_z-min_z)/2), "WL_Back_Mid"),
            ((min_x, cy, min_z+(max_z-min_z)/2), "WL_Left_Mid"),
            ((max_x, cy, min_z+(max_z-min_z)/2), "WL_Right_Mid"),
        ]
    elif snap_type == "CEILING":
        snap_positions = [
            ((cx, cy, max_z), "CL_Center"),
        ]
    else:
        snap_positions = [((cx, cy, min_z), "SN_Center")]

    empties = []
    for (sx, sy, sz), suffix in snap_positions:
        bpy.ops.object.empty_add(type='ARROWS', location=(sx, sy, sz))
        emp = bpy.context.active_object
        emp.name       = f"FO4_SNAP_{obj.name}_{suffix}"
        emp.parent     = obj
        emp["fo4_snap_type"] = snap_type
        # bpy.types.Object has no "display_size" attribute -- the real
        # property for an Empty's visual radius is "empty_display_size".
        # The wrong name raised an unguarded AttributeError on the very
        # first snap-point empty created, crashing this operator 100% of
        # the time it was invoked.
        emp.empty_display_size = 0.1
        empties.append(emp)
        print(f"[Workshop] Snap: {emp.name}")

    return empties


_MAX_DECORATION_TEXTURE = 2048  # px -- vanilla FO4 decoration/clutter textures rarely exceed this


def calculate_workshop_budget(objects: list) -> dict:
    """Calculate the workshop budget impact of a list of objects."""
    total_tris  = 0
    draw_calls  = 0
    unique_mats = set()
    oversized_textures = []  # (material name, image name, width, height)

    for obj in objects:
        if obj.type != 'MESH':
            continue
        tris = sum(1 for p in obj.data.polygons if len(p.vertices) == 3)
        tris += sum(2 for p in obj.data.polygons if len(p.vertices) == 4)
        tris += sum(len(p.vertices)-2 for p in obj.data.polygons if len(p.vertices) > 4)
        total_tris += tris
        draw_calls += max(1, len(obj.material_slots))
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            unique_mats.add(mat.name)
            if not (mat.use_nodes and mat.node_tree):
                continue
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image is not None:
                    w, h = node.image.size[0], node.image.size[1]
                    if w > _MAX_DECORATION_TEXTURE or h > _MAX_DECORATION_TEXTURE:
                        oversized_textures.append((mat.name, node.image.name, w, h))

    warnings = []
    if total_tris > BUDGET_LIMITS["triangles"]:
        warnings.append(f"Triangles {total_tris:,} exceeds limit {BUDGET_LIMITS['triangles']:,}")
    if draw_calls > BUDGET_LIMITS["draw_calls"]:
        warnings.append(f"Draw calls {draw_calls} exceeds limit {BUDGET_LIMITS['draw_calls']}")
    for mat_name, img_name, w, h in oversized_textures:
        warnings.append(
            f"Texture '{img_name}' on '{mat_name}' is {w}x{h} — over the "
            f"{_MAX_DECORATION_TEXTURE}px decoration-scale guideline")

    return {
        "triangles":    total_tris,
        "draw_calls":   draw_calls,
        "unique_mats":  len(unique_mats),
        "oversized_textures": oversized_textures,
        "within_budget": not warnings,
        "warnings":     warnings,
        "tri_pct":      min(100, total_tris / BUDGET_LIMITS["triangles"] * 100),
        "dc_pct":       min(100, draw_calls  / BUDGET_LIMITS["draw_calls"]  * 100),
    }


# ═══════════════════════════════════════════════════════
# MANIFEST + COBJ/STAT SCRIPT GENERATION
# ═══════════════════════════════════════════════════════

def _safe_editor_id(name: str) -> str:
    safe = "".join(c if c.isalnum() or c in "._" else "_" for c in name.strip())
    return safe[:63] or "WorkshopItem"


def _object_bounds_game_units(obj) -> tuple:
    """Approximate OBND half-extents (int16, FO4 game units) from the
    object's Blender-space dimensions. Matches the ×_FO4_UNIT_SCALE
    convention the export pipeline already restores on NIF export -- see
    export_helpers._FO4_UNIT_SCALE_INV.
    """
    dims = getattr(obj, "dimensions", (1.0, 1.0, 1.0))
    half = [max(1, min(32767, round(d * _FO4_UNIT_SCALE / 2.0))) for d in dims]
    return (-half[0], -half[1], -half[2], half[0], half[1], half[2])


def _manifest_from_objects(objects: list, nif_dir_hint: str = "Meshes") -> list:
    """Build a manifest list assuming NIFs were (or will be) exported as
    ``<nif_dir_hint>\\<safe_name>.nif`` -- used when the caller hasn't
    already produced its own manifest via a live export pass.
    """
    manifest = []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        safe = _safe_editor_id(obj.name)
        manifest.append({
            "name":        obj.name,
            "editor_id":   safe,
            "nif_rel_path": f"{nif_dir_hint}\\{safe}.nif",
            "bounds":      _object_bounds_game_units(obj),
        })
    return manifest


_XEDIT_HEADER = '''\
{{
  Workshop COBJ+STAT batch script -- generated by Mossy FO4 Blender Addon.

  HOW TO RUN:
    1. In FO4Edit, open your plugin (e.g. the template ESP you copy for
       new mods) so it's loaded in the tree.
    2. Select that file (or any record inside it) in the left-hand tree.
    3. Right-click -> "Apply Script..." -> choose this file.
    4. Everything below is added directly into your selected file --
       no new/blank plugin is created.

  Plugin category  : {category_label}
  Workbench type   : {workbench_editorid}
  Recipe filter    : {filter_editorid}
  Recipe cost      : none (free workshop decorations)
}}
unit UserScript;

function Process(e: IInterface): Integer;
var
  statGrp, statRec, cobjGrp, cobjRec: IInterface;
  master, workbenchKwrd, filterKwrd: IInterface;
begin
  Result := 0;
  master := FileByIndex(0);
  workbenchKwrd := MainRecordByEditorID(master, '{workbench_editorid}');
  if not Assigned(workbenchKwrd) then
    AddMessage('WARNING: workbench keyword "{workbench_editorid}" not found in ' + GetFileName(master) + ' -- recipes will build but may not show up under the expected workshop tab.');
  filterKwrd := MainRecordByEditorID(master, '{filter_editorid}');
  if not Assigned(filterKwrd) then
    AddMessage('WARNING: recipe filter keyword "{filter_editorid}" not found in ' + GetFileName(master) + ' -- recipes will build but won''t be filed under a specific build-menu sub-category.');

{records}
  AddMessage('Workshop batch: created {count} STAT+COBJ pair(s).');
end;

end.
'''

_XEDIT_RECORD_BLOCK = '''\
  // -- {name} --------------------------------------------
  try
    statGrp := Add(e, 'STAT', True);
    statRec := Add(statGrp, 'STAT', True);
    SetElementEditValues(statRec, 'EDID', '{editor_id}');
    SetElementEditValues(statRec, 'FULL', '{name}');
    SetElementEditValues(statRec, 'Model\\MODL - Model FileName', '{nif_path}');
    // OBND element paths vary slightly between xEdit versions -- wrapped
    // so a mismatch only skips the bounds fields, not the whole record.
    try
      SetElementEditValues(statRec, 'OBND\\X1', '{x1}');
      SetElementEditValues(statRec, 'OBND\\Y1', '{y1}');
      SetElementEditValues(statRec, 'OBND\\Z1', '{z1}');
      SetElementEditValues(statRec, 'OBND\\X2', '{x2}');
      SetElementEditValues(statRec, 'OBND\\Y2', '{y2}');
      SetElementEditValues(statRec, 'OBND\\Z2', '{z2}');
    except
      on E: Exception do
        AddMessage('  (bounds not set for {editor_id}: ' + E.Message + ' -- set OBND manually in xEdit)');
    end;

    // COBJ layout verified against real Fallout4.esm + a published workshop
    // mod's records: EDID, CNAM (created object), BNAM (workbench type),
    // FNAM (recipe filter / sub-category), INTV (=1). No FULL/NAM1/KWDA on
    // COBJ itself -- the menu shows the CNAM target's own FULL name. FVPA
    // (component cost) is intentionally omitted -- free to build.
    cobjGrp := Add(e, 'COBJ', True);
    cobjRec := Add(cobjGrp, 'COBJ', True);
    SetElementEditValues(cobjRec, 'EDID', 'Recipe_{editor_id}');
    SetElementEditValues(cobjRec, 'CNAM', IntToHex(FormID(statRec), 8));
    if Assigned(workbenchKwrd) then
      SetElementEditValues(cobjRec, 'BNAM', IntToHex(FormID(workbenchKwrd), 8));
    if Assigned(filterKwrd) then
      SetElementEditValues(cobjRec, 'FNAM', IntToHex(FormID(filterKwrd), 8));
    SetElementEditValues(cobjRec, 'INTV', '1');
  except
    on E: Exception do
      AddMessage('FAILED {editor_id}: ' + E.Message);
  end;
'''


def build_workshop_records_script(manifest: list, output_path: str,
                                   plugin_name: str = "WorkshopMod",
                                   category: str = "DECORATIONS",
                                   filter_keyword_editorid: str = "") -> tuple:
    """Write an xEdit Pascal script that creates a linked STAT+COBJ pair
    for every entry in *manifest*, operating on the file the user has
    selected in xEdit (see header comment in the generated script) rather
    than creating a new blank plugin.

    manifest entries: {name, editor_id, nif_rel_path, bounds}

    BNAM (workbench type) and FNAM (recipe filter / sub-category) are
    resolved by EditorID against Fallout4.esm at script-run time, using
    real verified defaults from WORKSHOP_CATEGORY_KEYWORDS for *category*.
    Pass filter_keyword_editorid to override just the FNAM sub-category
    (e.g. a more specific one like 'WorkshopRecipeFilterDecor02Misc').
    """
    if not manifest:
        return False, "No objects to write records for"

    cat_label = WORKSHOP_CATEGORIES.get(category, ("Misc", ""))[0]
    default_bnam, default_fnam = WORKSHOP_CATEGORY_KEYWORDS.get(
        category, WORKSHOP_CATEGORY_KEYWORDS["MISC"])
    fnam_editorid = filter_keyword_editorid or default_fnam

    records = []
    for entry in manifest:
        x1, y1, z1, x2, y2, z2 = entry["bounds"]
        records.append(_XEDIT_RECORD_BLOCK.format(
            name=entry["name"],
            editor_id=entry["editor_id"],
            nif_path=entry["nif_rel_path"].replace("/", "\\"),
            x1=x1, y1=y1, z1=z1, x2=x2, y2=y2, z2=z2,
        ))

    script = _XEDIT_HEADER.format(
        category_label=cat_label,
        workbench_editorid=default_bnam,
        filter_editorid=fnam_editorid,
        records="\n".join(records),
        count=len(manifest),
    )

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            fh.write(script)
        return True, f"Workshop xEdit script: {output_path}"
    except Exception as exc:
        return False, f"Failed to write workshop script: {exc}"


def write_workshop_esp_stubs(objects: list, output_dir: str,
                              plugin_name: str = "WorkshopMod",
                              category: str = "MISC",
                              filter_keyword_editorid: str = "") -> tuple:
    """Generate a COBJ+STAT xEdit script for objects that were already
    exported as NIFs by hand (assumes ``Meshes\\<name>.nif`` naming). For
    a full export+script pipeline in one click, see
    :func:`export_selection_as_workshop_batch`.
    """
    os.makedirs(output_dir, exist_ok=True)
    manifest = _manifest_from_objects(objects)
    if not manifest:
        return False, "No mesh objects selected"
    pas_path = os.path.join(output_dir, plugin_name + "_workshop.pas")
    return build_workshop_records_script(
        manifest, pas_path, plugin_name, category, filter_keyword_editorid)


# ═══════════════════════════════════════════════════════
# BATCH PIPELINE: selection -> exported NIFs/textures -> workshop script
# ═══════════════════════════════════════════════════════

def export_selection_as_workshop_batch(objects: list, data_root: str,
                                        plugin_name: str = "WorkshopMod",
                                        category: str = "DECORATIONS",
                                        generate_collision: bool = True,
                                        filter_keyword_editorid: str = "") -> dict:
    """Run each selected mesh through collision/export/texture export,
    then emit a manifest.json + xEdit .pas script that builds a free,
    workshop-placeable version of every object.

    Returns {success, fail, manifest_path, script_path, output_dir}.
    """
    meshes = [o for o in objects if o.type == 'MESH']
    result = {"success": 0, "fail": 0, "manifest_path": "", "script_path": "", "output_dir": ""}
    if not meshes:
        return result
    if _eh is None:
        print("[Workshop Batch] export_helpers unavailable -- install PyNifly")
        result["fail"] = len(meshes)
        return result

    safe_plugin = _safe_editor_id(plugin_name)
    meshes_dir    = os.path.join(data_root, "Meshes", safe_plugin)
    textures_dir  = os.path.join(data_root, "Textures", safe_plugin)
    materials_dir = os.path.join(data_root, "Materials", safe_plugin)
    scripts_dir   = os.path.join(data_root, "_WorkshopBatch", safe_plugin)
    for d in (meshes_dir, textures_dir, materials_dir, scripts_dir):
        os.makedirs(d, exist_ok=True)

    if _batch:
        _batch.progress_start(f"Workshop batch export ({len(meshes)} objects)", len(meshes))

    manifest = []
    for obj in meshes:
        step_label = f"Processing {obj.name}"
        if _batch:
            _batch.progress_step(step_label)
        else:
            print(f"[Workshop Batch] {step_label}")

        try:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

            if generate_collision and _mesh:
                col_type = _mesh.MeshHelpers.infer_collision_type(obj)
                _mesh.MeshHelpers.add_collision_mesh(obj, collision_type=col_type)

            safe = _safe_editor_id(obj.name)
            nif_path = os.path.join(meshes_dir, safe + ".nif")
            ok, msg = _eh.ExportHelpers.export_mesh_to_nif(obj, nif_path)
            if not ok:
                print(f"[Workshop Batch] FAILED export {obj.name}: {msg}")
                result["fail"] += 1
                continue

            if _bgsm:
                for ok_b, msg_b in _bgsm.export_bgsm_for_object(obj, materials_dir):
                    if not ok_b:
                        print(f"[Workshop Batch] BGSM warning for {obj.name}: {msg_b}")
                for ok_t, msg_t in _bgsm.export_textures_for_object(obj, textures_dir):
                    if not ok_t:
                        print(f"[Workshop Batch] Texture warning for {obj.name}: {msg_t}")

            manifest.append({
                "name":         obj.name,
                "editor_id":    safe,
                "nif_rel_path": f"Meshes\\{safe_plugin}\\{safe}.nif",
                "bounds":       _object_bounds_game_units(obj),
            })
            result["success"] += 1

        except Exception as exc:
            print(f"[Workshop Batch] FAILED {obj.name}: {exc}")
            result["fail"] += 1

    if _batch:
        _batch.progress_end()

    if manifest:
        manifest_path = os.path.join(scripts_dir, "manifest.json")
        try:
            Path(manifest_path).write_text(
                json.dumps({"plugin": plugin_name, "category": category, "objects": manifest}, indent=2),
                encoding="utf-8")
            result["manifest_path"] = manifest_path
        except Exception as exc:
            print(f"[Workshop Batch] Failed to write manifest: {exc}")

        script_path = os.path.join(scripts_dir, safe_plugin + "_workshop.pas")
        ok, msg = build_workshop_records_script(
            manifest, script_path, plugin_name, category, filter_keyword_editorid)
        print(f"[Workshop Batch] {msg}")
        if ok:
            result["script_path"] = script_path

    result["output_dir"] = scripts_dir
    return result


# Operators

class FO4_OT_AddSnapPoints(bpy.types.Operator):
    """Add workshop snap points to the active mesh object."""
    bl_idname  = "fo4.add_snap_points"
    bl_label   = "Add Workshop Snap Points"
    bl_options = {'REGISTER', 'UNDO'}

    snap_type: bpy.props.EnumProperty(
        name="Snap Type", items=SNAP_TYPES, default="FLOOR",
    )
    auto_detect: bpy.props.BoolProperty(
        name="Auto-Detect from Name", default=True,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object")
            return {'CANCELLED'}
        empties = add_snap_points(obj, self.snap_type, self.auto_detect)
        self.report({'INFO'}, f"Added {len(empties)} snap point(s) to {obj.name}")
        return {'FINISHED'}


class FO4_OT_CheckWorkshopBudget(bpy.types.Operator):
    """Check workshop performance budget for selected objects."""
    bl_idname  = "fo4.check_workshop_budget"
    bl_label   = "Check Workshop Budget"
    bl_options = {'REGISTER'}

    def execute(self, context):
        objects = [o for o in context.selected_objects if o.type == 'MESH']
        if not objects:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        budget = calculate_workshop_budget(objects)
        if budget["within_budget"]:
            self.report({'INFO'},
                f"Budget OK — Tris: {budget['triangles']:,} ({budget['tri_pct']:.0f}%), "
                f"Draw calls: {budget['draw_calls']} ({budget['dc_pct']:.0f}%)")
        else:
            self.report({'WARNING'}, " | ".join(budget["warnings"]))
        for w in budget["warnings"]:
            print(f"[Workshop Budget] ⚠ {w}")
        return {'FINISHED'}


class FO4_OT_GenerateWorkshopStubs(bpy.types.Operator):
    """Generate a linked COBJ+STAT xEdit script for selected objects
    (assumes matching NIFs already exist under Meshes\\<name>.nif)."""
    bl_idname  = "fo4.generate_workshop_stubs"
    bl_label   = "Generate Workshop COBJ Stubs"
    bl_options = {'REGISTER'}

    output_dir: bpy.props.StringProperty(name="Output Folder", subtype='DIR_PATH', default="")
    plugin_name: bpy.props.StringProperty(name="Plugin Name", default="WorkshopMod")
    category: bpy.props.EnumProperty(
        name="Menu Category",
        items=[(k, v[0], v[1]) for k, v in WORKSHOP_CATEGORIES.items()],
        default="MISC",
    )
    filter_keyword_editorid: bpy.props.StringProperty(name="Filter Keyword EditorID", default="")

    def execute(self, context):
        objects = [o for o in context.selected_objects if o.type == 'MESH']
        if not objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//")
        ok, msg = write_workshop_esp_stubs(
            objects, out, self.plugin_name, self.category, self.filter_keyword_editorid)
        self.report({'INFO'} if ok else {'ERROR'}, msg)
        return {'FINISHED'}


class FO4_OT_BatchWorkshopExport(bpy.types.Operator):
    """Export every selected mesh (collision + NIF + textures/materials)
    and generate a ready-to-run xEdit script that builds free, workshop-
    placeable versions of all of them, linked and menu-tagged in one pass."""
    bl_idname  = "fo4.batch_workshop_export"
    bl_label   = "Export Selected as Workshop Objects"
    bl_options = {'REGISTER'}

    def execute(self, context):
        scene = context.scene
        objects = [o for o in context.selected_objects if o.type == 'MESH']
        if not objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        out_dir = getattr(scene, "fo4_workshop_output_dir", "") or getattr(scene, "fo4_assets_path", "")
        if not out_dir:
            self.report({'ERROR'}, "Set a Workshop Output Folder (or FO4 Data Folder) first")
            return {'CANCELLED'}
        out_dir = bpy.path.abspath(out_dir)

        plugin_name = getattr(scene, "fo4_plugin_name", "") or "WorkshopMod"
        category = getattr(scene, "fo4_workshop_batch_category", "DECORATIONS")
        gen_collision = getattr(scene, "fo4_workshop_generate_collision", True)
        filter_kw = getattr(scene, "fo4_workshop_filter_keyword", "")

        res = export_selection_as_workshop_batch(
            objects, out_dir, plugin_name, category, gen_collision, filter_kw)

        if res["success"]:
            self.report({'INFO'},
                f"Workshop batch: {res['success']} OK, {res['fail']} failed → {res['output_dir']}")
        else:
            self.report({'ERROR'}, f"Workshop batch failed for all {res['fail']} object(s) — see console")
            return {'CANCELLED'}
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_AddSnapPoints, FO4_OT_CheckWorkshopBudget,
    FO4_OT_GenerateWorkshopStubs, FO4_OT_BatchWorkshopExport,
]

_SCENE_PROPS = [
    ("fo4_workshop_output_dir", bpy.props.StringProperty(
        name="Workshop Output Folder", subtype='DIR_PATH', default="",
        description="FO4 Data folder to export into (defaults to FO4 Data Folder if unset)",
    )),
    ("fo4_workshop_batch_category", bpy.props.EnumProperty(
        name="Category",
        items=[(k, v[0], v[1]) for k, v in WORKSHOP_CATEGORIES.items()],
        default="DECORATIONS",
    )),
    ("fo4_workshop_generate_collision", bpy.props.BoolProperty(
        name="Generate Collision", default=True,
    )),
    ("fo4_workshop_filter_keyword", bpy.props.StringProperty(
        name="Recipe Filter Override (optional)", default="",
        description="Category already sets a verified workshop sub-category "
                    "keyword automatically (e.g. 'WorkshopRecipeFilterDecor' for "
                    "Decorations). Only set this to use a more specific one "
                    "instead, e.g. 'WorkshopRecipeFilterDecor02Misc' -- check "
                    "xEdit's Fallout4.esm KYWD group for exact names",
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
