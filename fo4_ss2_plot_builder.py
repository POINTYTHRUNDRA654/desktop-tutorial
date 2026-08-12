"""
fo4_ss2_plot_builder.py
========================
Build custom Sim Settlements 2 plot structures (real sizes, real
construction levels/stages) in Blender, then export a ready-to-run
hand-off package for the user's existing Creation Kit / xEdit workflow.

This does NOT reimplement Sim Settlements 2's own CK record system --
it produces exactly what the real, already-published
``SS2_ImportStageData.pas`` xEdit script (part of the official "Add-on
Maker's Toolkit for Sim Settlements 2") expects: one Static record per
construction-stage NIF (created here via a generated xEdit script, since
ImportStageData itself requires those records to already exist) plus a
Models.csv and Spawns.csv in its real documented schema.

Real reference data used below (not guessed):
  - Plot footprint dimensions: measured via a real headless-Blender
    PyNifly import of the SS2 toolkit's own
    1x1_Navcut.nif / 2x2_Navcut.nif / 3x3_Navcut.nif / Interior_Navcut.nif
    (their bhkPhysicsSystem collision bounds -- these NIFs ARE the plot
    footprint boundary used by CK's own navmesh-cutting system).
  - Models.csv / Spawns.csv schema: read directly from
    "SS2_ImportStageData.README.pdf" and
    "Spreadsheet Templates/SS2_BuildingModels_Template.csv" in the same
    toolkit.
"""
import bpy, os, math
from typing import Optional
from mathutils import Vector

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

# Game units per Blender meter -- same constant this addon already uses
# everywhere else for FO4 NIF/Havok scale (see fo4_workshop_helper.py,
# export_helpers.py, operators.py). Re-derived locally rather than cross-
# imported, matching this codebase's existing per-module convention.
_FO4_UNIT_SCALE = getattr(_eh, "_FO4_UNIT_SCALE_INV", 69.99125) if _eh else 69.99125

# Real measured plot footprint bounds, in raw FO4 game units (NOT Blender
# meters -- divide by _FO4_UNIT_SCALE to get Blender-space coordinates).
# Measured via real headless Blender + PyNifly import of the SS2 toolkit's
# own Navcut NIFs -- see module docstring.
PLOT_SIZE_DIMENSIONS = {
    "1x1":      {"min": (-127.500, -81.812, -12.891), "max": (128.500, 127.812, 152.125)},
    "2x2":      {"min": (-256.000, -210.000, -20.000), "max": (256.000, 210.000, 236.000)},
    "3x3":      {"min": (-384.000, -290.405, -14.789), "max": (384.000, 379.595, 401.000)},
    "Interior": {"min": (-128.125, -192.000, -20.000), "max": (132.500, 192.000, 236.000)},
}

PLOT_SIZE_ITEMS = [
    ("1x1", "1x1", "Smallest plot footprint"),
    ("2x2", "2x2", "Medium plot footprint"),
    ("3x3", "3x3", "Large plot footprint"),
    ("Interior", "Interior", "Interior cell footprint"),
]

# Which local axis the boundary guide's front-facing arrow points along.
# NOT independently confirmed against a real SS2_BuildingPlanStarterPI
# marker (that asset is packed inside SS2's own BA2 and wasn't extracted
# for this feature) -- default -Y is this project's usual "forward"
# convention, but cross-check visually against the real CK marker before
# relying on it for a release.
FRONT_AXIS_ITEMS = [
    ("-Y", "-Y (default)", "Arrow points toward -Y"),
    ("+Y", "+Y", "Arrow points toward +Y"),
    ("-X", "-X", "Arrow points toward -X"),
    ("+X", "+X", "Arrow points toward +X"),
]

_FRONT_AXIS_ROTATION = {
    # SINGLE_ARROW empties point along local +Z by default.
    "+Y": (math.radians(-90.0), 0.0, 0.0),
    "-Y": (math.radians(90.0), 0.0, 0.0),
    "+X": (0.0, math.radians(90.0), 0.0),
    "-X": (0.0, math.radians(-90.0), 0.0),
}


def _safe_editor_id(name: str) -> str:
    safe = "".join(c if c.isalnum() or c in "._" else "_" for c in name.strip())
    return safe[:63] or "SS2Plot"


def _group_bounds_game_units(objs) -> tuple:
    """Combined OBND half-extents (FO4 game units) across a multi-object
    stage group -- the real world-space bounding box of every object's
    corners, since a single object's local .dimensions can't just be
    summed across several differently-positioned pieces."""
    min_v = [float('inf')] * 3
    max_v = [float('-inf')] * 3
    for obj in objs:
        if obj.type != 'MESH':
            continue
        mw = obj.matrix_world
        for corner in obj.bound_box:
            world_co = mw @ Vector(corner)
            for i in range(3):
                min_v[i] = min(min_v[i], world_co[i])
                max_v[i] = max(max_v[i], world_co[i])
    if min_v[0] == float('inf'):
        return (-1, -1, -1, 1, 1, 1)
    half = [max(1, min(32767, round((max_v[i] - min_v[i]) * _FO4_UNIT_SCALE / 2.0))) for i in range(3)]
    return (-half[0], -half[1], -half[2], half[0], half[1], half[2])


# ═══════════════════════════════════════════════════════
# BOUNDARY GUIDE
# ═══════════════════════════════════════════════════════

def add_plot_boundary_guide(size: str = "2x2", front_axis: str = "-Y") -> dict:
    """Build a wireframe box at world origin using the real measured
    footprint for *size*, plus a SINGLE_ARROW empty marking the front
    direction -- a Blender-only build reference, never exported.

    Returns {"box": obj, "arrow": obj}.
    """
    bounds = PLOT_SIZE_DIMENSIONS.get(size, PLOT_SIZE_DIMENSIONS["2x2"])
    minx, miny, minz = (c / _FO4_UNIT_SCALE for c in bounds["min"])
    maxx, maxy, maxz = (c / _FO4_UNIT_SCALE for c in bounds["max"])

    mesh = bpy.data.meshes.new(f"SS2_PlotBoundary_{size}")
    verts = [
        (minx, miny, minz), (maxx, miny, minz), (maxx, maxy, minz), (minx, maxy, minz),
        (minx, miny, maxz), (maxx, miny, maxz), (maxx, maxy, maxz), (minx, maxy, maxz),
    ]
    edges = [(0,1),(1,2),(2,3),(3,0), (4,5),(5,6),(6,7),(7,4), (0,4),(1,5),(2,6),(3,7)]
    mesh.from_pydata(verts, edges, [])
    mesh.update()

    box = bpy.data.objects.new(f"SS2_PlotBoundary_{size}", mesh)
    box.display_type = 'WIRE'
    box.hide_render = True
    box["fo4_ss2_boundary_guide"] = True
    bpy.context.collection.objects.link(box)

    arrow_pos = {
        "+Y": (0.0, maxy, 0.0), "-Y": (0.0, miny, 0.0),
        "+X": (maxx, 0.0, 0.0), "-X": (minx, 0.0, 0.0),
    }.get(front_axis, (0.0, miny, 0.0))

    arrow = bpy.data.objects.new(f"SS2_PlotFront_{size}", None)
    arrow.empty_display_type = 'SINGLE_ARROW'
    arrow.empty_display_size = max(0.3, min(maxx - minx, maxy - miny) * 0.25)
    arrow.location = arrow_pos
    arrow.rotation_euler = _FRONT_AXIS_ROTATION.get(front_axis, _FRONT_AXIS_ROTATION["-Y"])
    arrow["fo4_ss2_boundary_guide"] = True
    bpy.context.collection.objects.link(arrow)

    return {"box": box, "arrow": arrow}


# ═══════════════════════════════════════════════════════
# STAGE TAGGING
# ═══════════════════════════════════════════════════════

def assign_plot_stage(obj, level: int, stage: int, is_final: bool = False) -> None:
    obj["fo4_ss2_level"] = int(level)
    obj["fo4_ss2_stage"] = int(stage)
    obj["fo4_ss2_stage_final"] = bool(is_final)


def collect_plot_stages(objects) -> tuple:
    """Group tagged mesh objects by level, then by stage number.

    Multiple objects sharing the same (level, stage) tag are treated as
    ONE combined stage -- exactly how real SS2 buildings are actually
    made (kit-bashed from many pieces, see "Your First Building Model" in
    the Add-on Maker's Toolkit) and exported as a single NIF per stage via
    export_scene_as_single_nif, not one NIF per individual piece. Use
    "Tag Selected as Plot Stage" with all of a stage's pieces selected at
    once to build a multi-piece stage this way.

    Returns (stage_groups, error) -- stage_groups is
    {level: [(stage_num, is_final, [obj, ...]), ...]}, an ordered list of
    stage groups per level (last group = Final) on success, or
    (None, "message") on a real validation failure.
    """
    by_level = {}
    for obj in objects:
        if obj.type != 'MESH' or "fo4_ss2_level" not in obj.keys():
            continue
        if obj.get("fo4_collision") or obj.name.startswith("UCX_"):
            # A collision proxy inherits ALL of its source mesh's custom
            # properties (including fo4_ss2_level/_stage/_stage_final) when
            # mesh_helpers.add_custom_collision() duplicates the tagged
            # source object to build it -- never treat that inherited tag
            # as the collision proxy's own plot stage. Without this guard,
            # re-running Export Plot after collision already exists (every
            # second-or-later export) double-counts the stage: the real
            # source mesh AND its own auto-generated collision both show up
            # as separate objects in the same (level, stage) group.
            continue
        lvl = int(obj["fo4_ss2_level"])
        stage = int(obj.get("fo4_ss2_stage", 0))
        final = bool(obj.get("fo4_ss2_stage_final", False))
        by_level.setdefault(lvl, {}).setdefault(stage, []).append((final, obj))

    if not by_level:
        return None, "No objects are tagged with a plot level/stage (use Tag Selected first)"

    result = {}
    for lvl, by_stage in sorted(by_level.items()):
        stage_groups = []
        for stage in sorted(by_stage.keys()):
            entries = by_stage[stage]
            finals = {e[0] for e in entries}
            if len(finals) > 1:
                names = [e[1].name for e in entries]
                return None, (f"Level {lvl} Stage {stage}: objects disagree on the Final tag "
                               f"({names}) -- all objects sharing one stage must be tagged the same")
            stage_groups.append((stage, finals.pop(), [e[1] for e in entries]))

        final_groups = [g for g in stage_groups if g[1]]
        if len(final_groups) == 0:
            return None, f"Level {lvl}: no stage is tagged Final -- tag the last construction stage as Final"
        if len(final_groups) > 1:
            return None, (f"Level {lvl}: more than one stage tagged Final "
                           f"(stages {[g[0] for g in final_groups]}) -- only the last stage should be Final")
        if not stage_groups[-1][1]:
            return None, (f"Level {lvl}: the Final-tagged stage (stage {final_groups[0][0]}) is not the "
                           f"highest-numbered stage (stage {stage_groups[-1][0]} sorts last) -- fix the "
                           f"stage numbers or the Final tag")
        result[lvl] = stage_groups

    return result, None


# ═══════════════════════════════════════════════════════
# SPAWN MARKERS (decoration/furniture placement)
# ═══════════════════════════════════════════════════════

_SPAWN_DEFAULTS = {
    "fo4_ss2_spawn_marker":       True,
    "fo4_ss2_spawn_form":         "",
    "fo4_ss2_spawn_level":        1,
    "fo4_ss2_spawn_stage_start":  0,
    "fo4_ss2_spawn_stage_end":    0,
    "fo4_ss2_spawn_type":         0,
    "fo4_ss2_spawn_vendor_type":  "",
    "fo4_ss2_spawn_vendor_level": 0,
    "fo4_ss2_spawn_owner":        0,
    "fo4_ss2_spawn_name":         "",
    "fo4_ss2_spawn_requirements": "",
}


def add_plot_spawn_marker(level: int = 1, stage_start: int = 0, stage_end: int = 0) -> bpy.types.Object:
    """Add an Empty at the 3D cursor tagged with every real Spawns.csv
    column (Form left blank for the user to fill in -- this addon has no
    game-wide EditorID database to resolve against)."""
    empty = bpy.data.objects.new(f"SS2_Spawn_L{level}", None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.3
    empty.location = bpy.context.scene.cursor.location
    for k, v in _SPAWN_DEFAULTS.items():
        empty[k] = v
    empty["fo4_ss2_spawn_level"] = int(level)
    empty["fo4_ss2_spawn_stage_start"] = int(stage_start)
    empty["fo4_ss2_spawn_stage_end"] = int(stage_end)
    bpy.context.collection.objects.link(empty)
    return empty


def collect_plot_spawns(objects) -> tuple:
    """Gather tagged spawn Empties with real game-unit position/rotation.

    Returns (spawns, warnings). Each spawn dict has: obj, form, level,
    stage_start, stage_end, pos (game units), rot (degrees), scale,
    type, vendor_type, vendor_level, owner, name, requirements.
    Rotation-axis mapping (Blender Euler XYZ -> CK Rot X/Y/Z, no remap)
    follows this project's existing no-axis-swap convention for regular
    geometry, but has not been independently confirmed for *placed
    object* rotation specifically -- verify against a real test spawn.
    """
    # obj.matrix_world can be stale (still identity, or an earlier
    # transform) immediately after a script sets .location/.rotation_euler
    # without an intervening depsgraph evaluation -- force one so a spawn
    # marker placed and exported in the same script/click reads correctly,
    # the same class of staleness already found and fixed for driver
    # default_value reads in fo4_glow_effects.py.
    bpy.context.view_layer.update()

    spawns, warnings = [], []
    for obj in objects:
        if not obj.get("fo4_ss2_spawn_marker"):
            continue
        form = str(obj.get("fo4_ss2_spawn_form", "")).strip()
        if not form:
            warnings.append(f"'{obj.name}': no Form EditorID set -- skipped")
            continue

        mw = obj.matrix_world
        pos = mw.translation
        game_pos = tuple(c * _FO4_UNIT_SCALE for c in pos)
        rot = mw.to_euler('XYZ')
        game_rot = tuple(math.degrees(a) for a in rot)
        scale_vec = mw.to_scale()
        if not (abs(scale_vec.x - scale_vec.y) < 1e-4 and abs(scale_vec.y - scale_vec.z) < 1e-4):
            warnings.append(f"'{obj.name}': non-uniform scale ({scale_vec.x:.3f},{scale_vec.y:.3f},{scale_vec.z:.3f}) -- CSV only supports one Scale value, using X")

        spawns.append({
            "obj": obj, "form": form,
            "level": int(obj.get("fo4_ss2_spawn_level", 1)),
            "stage_start": int(obj.get("fo4_ss2_spawn_stage_start", 0)),
            "stage_end": int(obj.get("fo4_ss2_spawn_stage_end", 0)),
            "pos": game_pos, "rot": game_rot, "scale": scale_vec.x,
            "type": int(obj.get("fo4_ss2_spawn_type", 0)),
            "vendor_type": str(obj.get("fo4_ss2_spawn_vendor_type", "")),
            "vendor_level": int(obj.get("fo4_ss2_spawn_vendor_level", 0)),
            "owner": int(obj.get("fo4_ss2_spawn_owner", 0)),
            "name": str(obj.get("fo4_ss2_spawn_name", "")),
            "requirements": str(obj.get("fo4_ss2_spawn_requirements", "")),
        })

    return spawns, warnings


# ═══════════════════════════════════════════════════════
# xEdit Static-record script (creates the Static records
# SS2_ImportStageData.pas requires to already exist)
# ═══════════════════════════════════════════════════════

_XEDIT_HEADER = '''\
{{
  SS2 Plot Builder -- Static record batch, generated by Mossy FO4 Blender Addon.

  HOW TO RUN:
    1. In FO4Edit, open your plugin so it's loaded in the tree.
    2. Select that file (or any record inside it) in the left-hand tree.
    3. Right-click -> "Apply Script..." -> choose this file.
    4. Everything below is added directly into your selected file.
    5. THEN run SS2_ImportStageData.pas (from your Add-on Maker's Toolkit)
       pointed at the Models.csv (and Spawns.csv, if generated) written
       alongside this script -- it looks these Static records up by the
       exact EditorIDs created here.

  Plot            : {plan_name}
  Stage count     : {count}
}}
unit UserScript;

function Process(e: IInterface): Integer;
var
  statGrp, statRec: IInterface;
begin
  Result := 0;

{records}
  AddMessage('SS2 Plot Builder: created {count} Static record(s).');
end;

end.
'''

_XEDIT_RECORD_BLOCK = '''\
  // -- {name} (Level {level}, Stage {stage_label}) --------------------
  try
    statGrp := Add(e, 'STAT', True);
    statRec := Add(statGrp, 'STAT', True);
    SetElementEditValues(statRec, 'EDID', '{editor_id}');
    SetElementEditValues(statRec, 'FULL', '{name}');
    SetElementEditValues(statRec, 'Model\\MODL - Model FileName', '{nif_path}');
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
  except
    on E: Exception do
      AddMessage('FAILED {editor_id}: ' + E.Message);
  end;
'''


def build_plot_static_script(manifest: list, output_path: str, plan_name: str = "MyPlot") -> tuple:
    """Write an xEdit Pascal script creating one STAT record per
    manifest entry ({name, editor_id, nif_rel_path, bounds, level, stage_label})."""
    if not manifest:
        return False, "No stage NIFs to write records for"

    records = []
    for entry in manifest:
        x1, y1, z1, x2, y2, z2 = entry["bounds"]
        records.append(_XEDIT_RECORD_BLOCK.format(
            name=entry["name"], editor_id=entry["editor_id"],
            nif_path=entry["nif_rel_path"].replace("/", "\\"),
            level=entry["level"], stage_label=entry["stage_label"],
            x1=x1, y1=y1, z1=z1, x2=x2, y2=y2, z2=z2,
        ))

    script = _XEDIT_HEADER.format(plan_name=plan_name, count=len(manifest), records="\n".join(records))
    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            fh.write(script)
        return True, f"Static-record xEdit script: {output_path}"
    except Exception as exc:
        return False, f"Failed to write Static script: {exc}"


# ═══════════════════════════════════════════════════════
# Models.csv / Spawns.csv (real SS2_ImportStageData.pas schema)
# ═══════════════════════════════════════════════════════

def build_models_csv(stage_groups: dict, editor_ids: dict, output_path: str,
                      build_material: str = "default") -> tuple:
    """Row 1 = build material name or 'default'; rows 2-4 = Level 1-3
    stage EditorIDs in construction order, last = final model. One
    EditorID per stage GROUP -- every object in a multi-object stage
    shares the same EditorID (the combined NIF they were exported into).
    Matches Spreadsheet Templates/SS2_BuildingModels_Template.csv exactly.
    """
    if not stage_groups:
        return False, "No plot stages to write"

    lines = [build_material or "default"]
    for lvl in sorted(stage_groups.keys()):
        row = [editor_ids[group_objs[0]] for (_stage, _final, group_objs) in stage_groups[lvl]]
        lines.append(",".join(row))

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8", newline="\r\n") as fh:
            fh.write("\n".join(lines) + "\n")
        return True, f"Models.csv: {output_path}"
    except Exception as exc:
        return False, f"Failed to write Models.csv: {exc}"


_SPAWNS_HEADER = ("Form,Pos X,Pos Y,Pos Z,Rot X,Rot Y,Rot Z,Scale,iLevel,"
                   "iStageNum,iStageEnd,iType,sVendorType,iVendorLevel,"
                   "iOwnerNumber,sSpawnName,Requirements")


def _resolve_spawn_stage_numbers(spawn: dict, stage_groups: dict) -> tuple:
    """iStageNum/iStageEnd are 1-based and relative to the level (per the
    real SS2_ImportStageData README) -- resolve from the spawn's tagged
    fo4_ss2_spawn_stage_start/_end (raw fo4_ss2_stage values) to their
    ordinal position within that level's ordered stage-group list."""
    lvl_groups = stage_groups.get(spawn["level"], [])

    def ordinal(raw_stage_value):
        if not raw_stage_value:
            return None
        for i, (stage_num, _final, _objs) in enumerate(lvl_groups, start=1):
            if stage_num == raw_stage_value:
                return i
        return None

    return ordinal(spawn["stage_start"]), ordinal(spawn["stage_end"])


def build_spawns_csv(spawns: list, stage_groups: dict, output_path: str) -> tuple:
    if not spawns:
        return False, "No spawn markers to write"

    lines = [_SPAWNS_HEADER]
    for sp in spawns:
        stage_num, stage_end = _resolve_spawn_stage_numbers(sp, stage_groups)
        x, y, z = sp["pos"]
        rx, ry, rz = sp["rot"]
        row = [
            sp["form"], f"{x:.4f}", f"{y:.4f}", f"{z:.4f}",
            f"{rx:.4f}", f"{ry:.4f}", f"{rz:.4f}", f"{sp['scale']:.4f}",
            str(sp["level"]),
            "" if stage_num is None else str(stage_num),
            "" if stage_end is None else str(stage_end),
            "" if not sp["type"] else str(sp["type"]),
            sp["vendor_type"], "" if not sp["vendor_level"] else str(sp["vendor_level"]),
            "" if not sp["owner"] else str(sp["owner"]),
            sp["name"], sp["requirements"],
        ]
        lines.append(",".join(row))

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8", newline="\r\n") as fh:
            fh.write("\n".join(lines) + "\n")
        return True, f"Spawns.csv: {output_path}"
    except Exception as exc:
        return False, f"Failed to write Spawns.csv: {exc}"


_INSTRUCTIONS_TEMPLATE = """SS2 Plot Builder -- next steps for '{plan_name}'
==================================================

Files generated in this folder:
  {static_script}
  {models_csv}
{spawns_line}
Meshes exported to: {meshes_dir}

1. In FO4Edit, open your plugin so it's loaded in the tree, select it,
   right-click -> Apply Script -> choose "{static_script_name}".
   This creates one Static record per construction-stage NIF.

2. Still in FO4Edit, run "SS2_ImportStageData.pas" (from your Add-on
   Maker's Toolkit) and point it at:
     Models file : {models_csv_name}
{spawns_step}
   This builds/updates the Building Plan + Level Plan records using the
   Static records from step 1.

3. Open Creation Kit to finalize: navmesh (auto-generates correctly off
   the real collision geometry already baked into each exported NIF),
   plot type/subtype/theme keywords (set these directly in the
   SS2_ImportStageData dialog in step 2, or in CK afterward), and testing.

Notes:
  - The boundary-guide front-arrow direction and the Spawns.csv rotation
    mapping are this addon's best-guess defaults, not independently
    confirmed against a real SS2 marker -- sanity-check visually before
    relying on either for a release.
"""


def write_plot_instructions(output_path: str, plan_name: str, static_script_path: str,
                             models_csv_path: str, spawns_csv_path: str, meshes_dir: str) -> tuple:
    spawns_line = f"  {os.path.basename(spawns_csv_path)}" if spawns_csv_path else ""
    spawns_step = (f"     Spawns file : {os.path.basename(spawns_csv_path)}\n"
                    if spawns_csv_path else "")
    text = _INSTRUCTIONS_TEMPLATE.format(
        plan_name=plan_name,
        static_script=os.path.basename(static_script_path),
        models_csv=os.path.basename(models_csv_path),
        spawns_line=spawns_line,
        meshes_dir=meshes_dir,
        static_script_name=os.path.basename(static_script_path),
        models_csv_name=os.path.basename(models_csv_path),
        spawns_step=spawns_step,
    )
    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            fh.write(text)
        return True, f"Instructions: {output_path}"
    except Exception as exc:
        return False, f"Failed to write instructions: {exc}"


# ═══════════════════════════════════════════════════════
# Full pipeline: tagged scene objects -> exported NIFs + xEdit hand-off
# ═══════════════════════════════════════════════════════

def export_ss2_plot(scene_objects, data_root: str, plugin_prefix: str = "MyPrefix",
                     plan_name: str = "MyPlot", build_material: str = "default",
                     generate_collision: bool = True) -> dict:
    """Export every tagged plot stage as NIF+BGSM+textures, then write the
    xEdit Static-record script, Models.csv, Spawns.csv (if any spawn
    markers are tagged), and an instructions file.

    Returns {success, fail, error, level_count, stage_count, spawn_count,
    output_dir, static_script, models_csv, spawns_csv, instructions}.
    """
    result = {"success": 0, "fail": 0, "error": "", "level_count": 0, "stage_count": 0,
              "spawn_count": 0, "output_dir": "", "static_script": "", "models_csv": "",
              "spawns_csv": "", "instructions": ""}

    stage_groups, err = collect_plot_stages(scene_objects)
    if err:
        result["error"] = err
        return result
    if _eh is None:
        result["error"] = "export_helpers unavailable -- install PyNifly"
        return result

    safe_prefix = _safe_editor_id(plugin_prefix)
    safe_plan = _safe_editor_id(plan_name)
    meshes_dir = os.path.join(data_root, "Meshes", safe_prefix, safe_plan)
    textures_dir = os.path.join(data_root, "Textures", safe_prefix, safe_plan)
    materials_dir = os.path.join(data_root, "Materials", safe_prefix, safe_plan)
    scripts_dir = os.path.join(data_root, "_SS2PlotBuilder", safe_plan)
    for d in (meshes_dir, textures_dir, materials_dir, scripts_dir):
        os.makedirs(d, exist_ok=True)

    total_stages = sum(len(v) for v in stage_groups.values())
    if _batch:
        _batch.progress_start(f"SS2 Plot export ({total_stages} stages)", total_stages)

    manifest = []
    editor_ids = {}
    exported_groups = {}
    for lvl in sorted(stage_groups.keys()):
        for idx, (stage_num, is_final, group) in enumerate(stage_groups[lvl], start=1):
            stage_label = "Final" if is_final else f"C{idx}"
            editor_id = _safe_editor_id(f"{safe_prefix}_{safe_plan}_L{lvl}_{stage_label}")

            step_label = f"L{lvl} {stage_label}: {len(group)} object(s)"
            if _batch:
                _batch.progress_step(step_label)
            else:
                print(f"[SS2 Plot Builder] {step_label}")

            try:
                bpy.ops.object.select_all(action="DESELECT")
                for obj in group:
                    obj.select_set(True)
                bpy.context.view_layer.objects.active = group[0]

                if generate_collision and _mesh:
                    for obj in group:
                        col_type = _mesh.MeshHelpers.infer_collision_type(obj)
                        _mesh.MeshHelpers.add_custom_collision(obj, collision_type=col_type)

                nif_path = os.path.join(meshes_dir, editor_id + ".nif")
                # Multiple pieces sharing one stage (a kit-bashed building,
                # the normal SS2 case) combine into ONE NIF via the same
                # multi-object export this addon already uses for "Export
                # Entire Scene as NIF" -- each piece's own collision travels
                # along automatically. A single-object stage just exports
                # that one mesh directly, same as before.
                #
                # Retried once on failure: PyNifly's own export call needs a
                # live VIEW_3D area reference to run correctly outside a
                # normal File > Export click -- export_helpers._call_nif_export's
                # own docstring documents the exact "No objects selected for
                # export" / "result=set()" symptom this can produce, and
                # already has multi-tier fallback handling for it. This loop
                # calls the exporter repeatedly (once per stage) within a
                # single operator run rather than once per click, which is
                # more exposed to that transient context hiccup than a
                # normal single export. Re-selecting and retrying once
                # resolves it in practice without masking a real failure --
                # if the retry also fails, the stage is still correctly
                # reported failed, same as before.
                ok, msg = False, ""
                for attempt in range(2):
                    if attempt > 0:
                        print(f"[SS2 Plot Builder] Retrying export for {step_label}")
                        bpy.ops.object.select_all(action="DESELECT")
                        for obj in group:
                            obj.select_set(True)
                        bpy.context.view_layer.objects.active = group[0]
                    if len(group) == 1:
                        ok, msg = _eh.ExportHelpers.export_mesh_to_nif(group[0], nif_path)
                    else:
                        ok, msg = _eh.ExportHelpers.export_scene_as_single_nif(
                            bpy.context.scene, nif_path, objects=group)
                    if ok:
                        break
                if not ok:
                    print(f"[SS2 Plot Builder] FAILED export {step_label}: {msg}")
                    result["fail"] += 1
                    continue

                if _bgsm:
                    for obj in group:
                        for ok_b, msg_b in _bgsm.export_bgsm_for_object(obj, materials_dir):
                            if not ok_b:
                                print(f"[SS2 Plot Builder] BGSM warning for {obj.name}: {msg_b}")
                        for ok_t, msg_t in _bgsm.export_textures_for_object(obj, textures_dir):
                            if not ok_t:
                                print(f"[SS2 Plot Builder] Texture warning for {obj.name}: {msg_t}")

                for obj in group:
                    editor_ids[obj] = editor_id
                display_name = group[0].name if len(group) == 1 else f"{safe_plan}_L{lvl}_{stage_label} ({len(group)} pieces)"
                manifest.append({
                    "name": display_name, "editor_id": editor_id,
                    "nif_rel_path": f"Meshes\\{safe_prefix}\\{safe_plan}\\{editor_id}.nif",
                    "bounds": _group_bounds_game_units(group),
                    "level": lvl, "stage_label": stage_label,
                })
                exported_groups.setdefault(lvl, []).append((stage_num, is_final, group))
                result["success"] += 1

            except Exception as exc:
                print(f"[SS2 Plot Builder] FAILED {step_label}: {exc}")
                result["fail"] += 1

    if _batch:
        _batch.progress_end()

    if not manifest:
        result["error"] = "All stage exports failed -- see console for details"
        return result

    static_script_path = os.path.join(scripts_dir, safe_plan + "_Statics.pas")
    ok, msg = build_plot_static_script(manifest, static_script_path, plan_name)
    print(f"[SS2 Plot Builder] {msg}")
    if ok:
        result["static_script"] = static_script_path

    models_csv_path = os.path.join(scripts_dir, safe_plan + "_Models.csv")
    ok, msg = build_models_csv(exported_groups, editor_ids, models_csv_path, build_material)
    print(f"[SS2 Plot Builder] {msg}")
    if ok:
        result["models_csv"] = models_csv_path

    # Re-fetch the object list rather than reusing the *scene_objects*
    # snapshot captured at the top of this function: the stage-export loop
    # above just ran mesh_helpers.add_custom_collision() for every stage
    # object, which deletes-and-recreates that object's own UCX_ collision
    # proxy. On a second (or later) export run, an old UCX_ object from a
    # previous run is still sitting in *scene_objects* -- once deleted, that
    # stale Python reference raises "ReferenceError: StructRNA ... has been
    # removed" the moment collect_plot_spawns() touches it below.
    spawns, spawn_warnings = collect_plot_spawns(list(bpy.context.scene.objects))
    for w in spawn_warnings:
        print(f"[SS2 Plot Builder] Spawn warning: {w}")
    if spawns:
        spawns_csv_path = os.path.join(scripts_dir, safe_plan + "_Spawns.csv")
        ok, msg = build_spawns_csv(spawns, exported_groups, spawns_csv_path)
        print(f"[SS2 Plot Builder] {msg}")
        if ok:
            result["spawns_csv"] = spawns_csv_path
    result["spawn_count"] = len(spawns)

    instructions_path = os.path.join(scripts_dir, "README_NextSteps.txt")
    ok, msg = write_plot_instructions(
        instructions_path, plan_name, result["static_script"],
        result["models_csv"], result["spawns_csv"], meshes_dir)
    if ok:
        result["instructions"] = instructions_path

    result["level_count"] = len(exported_groups)
    result["stage_count"] = len(manifest)
    result["output_dir"] = scripts_dir
    return result


# ═══════════════════════════════════════════════════════
# Operators
# ═══════════════════════════════════════════════════════

class FO4_OT_AddPlotBoundaryGuide(bpy.types.Operator):
    """Add a real-dimension boundary guide + front-direction arrow for a plot size"""
    bl_idname = "fo4.add_plot_boundary_guide"
    bl_label = "Add Plot Boundary Guide"
    bl_options = {'REGISTER', 'UNDO'}

    size: bpy.props.EnumProperty(name="Plot Size", items=PLOT_SIZE_ITEMS, default="2x2")
    front_axis: bpy.props.EnumProperty(name="Front Direction", items=FRONT_AXIS_ITEMS, default="-Y")

    def execute(self, context):
        result = add_plot_boundary_guide(self.size, self.front_axis)
        self.report({'INFO'}, f"Boundary guide added for {self.size} (front: {self.front_axis})")
        return {'FINISHED'}


class FO4_OT_AssignPlotStage(bpy.types.Operator):
    """Tag selected mesh object(s) as a plot construction level/stage"""
    bl_idname = "fo4.assign_plot_stage"
    bl_label = "Tag Selected as Plot Stage"
    bl_options = {'REGISTER', 'UNDO'}

    level: bpy.props.IntProperty(name="Level", default=1, min=1, max=3)
    stage: bpy.props.IntProperty(name="Stage", default=1, min=1)
    is_final: bpy.props.BoolProperty(name="Final Stage of Level", default=False)

    def execute(self, context):
        objs = [o for o in context.selected_objects if o.type == 'MESH']
        if not objs:
            self.report({'ERROR'}, "Select at least one mesh object first")
            return {'CANCELLED'}
        for obj in objs:
            assign_plot_stage(obj, self.level, self.stage, self.is_final)
        self.report({'INFO'}, f"Tagged {len(objs)} object(s) as Level {self.level} Stage {self.stage}"
                               f"{' (Final)' if self.is_final else ''}")
        return {'FINISHED'}


class FO4_OT_AddPlotSpawnMarker(bpy.types.Operator):
    """Add a decoration/furniture spawn marker at the 3D cursor"""
    bl_idname = "fo4.add_plot_spawn_marker"
    bl_label = "Add Spawn Marker at Cursor"
    bl_options = {'REGISTER', 'UNDO'}

    level: bpy.props.IntProperty(name="Level", default=1, min=1, max=3)
    stage_start: bpy.props.IntProperty(name="Stage Start", default=0, min=0,
        description="Stage number this item first appears at (0 = final stage of level)")
    stage_end: bpy.props.IntProperty(name="Stage End", default=0, min=0,
        description="Stage number this item exists through (0 = single stage only)")

    def execute(self, context):
        empty = add_plot_spawn_marker(self.level, self.stage_start, self.stage_end)
        context.view_layer.objects.active = empty
        self.report({'INFO'}, f"Spawn marker '{empty.name}' added -- set its Form EditorID in the panel or Object Properties")
        return {'FINISHED'}


class FO4_OT_ExportPlot(bpy.types.Operator):
    """Export all tagged plot stages + spawn markers to NIF/BGSM and generate the xEdit hand-off files"""
    bl_idname = "fo4.export_ss2_plot"
    bl_label = "Export Plot"
    bl_options = {'REGISTER'}

    def execute(self, context):
        scene = context.scene
        prefix = getattr(scene, "fo4_ss2_plugin_prefix", "MyPrefix")
        plan_name = getattr(scene, "fo4_ss2_plan_name", "MyPlot")
        material = getattr(scene, "fo4_ss2_build_material", "default")
        out_dir = bpy.path.abspath(getattr(scene, "fo4_ss2_output_dir", "//"))
        if not out_dir:
            self.report({'ERROR'}, "Set an output folder first")
            return {'CANCELLED'}

        result = export_ss2_plot(list(scene.objects), out_dir, prefix, plan_name, material)

        if result["error"]:
            self.report({'ERROR'}, result["error"])
            return {'CANCELLED'}

        msg = (f"Plot '{plan_name}': {result['success']} stage(s) exported "
               f"across {result['level_count']} level(s)"
               + (f", {result['fail']} failed" if result["fail"] else "")
               + (f", {result['spawn_count']} spawn marker(s)" if result["spawn_count"] else ""))
        self.report({'INFO'}, msg)
        print(f"[SS2 Plot Builder] Output: {result['output_dir']}")
        if result["instructions"]:
            print(f"[SS2 Plot Builder] Next steps: {result['instructions']}")
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_AddPlotBoundaryGuide,
    FO4_OT_AssignPlotStage,
    FO4_OT_AddPlotSpawnMarker,
    FO4_OT_ExportPlot,
]

_SCENE_PROPS = [
    ("fo4_ss2_plugin_prefix", bpy.props.StringProperty(
        name="Plugin Prefix", default="MyPrefix",
        description="Short prefix used for EditorIDs and the Meshes/Textures/Materials subfolder")),
    ("fo4_ss2_plan_name", bpy.props.StringProperty(
        name="Plan Name", default="MyPlot",
        description="Name for this building plan (used in EditorIDs and output filenames)")),
    ("fo4_ss2_build_material", bpy.props.StringProperty(
        name="Build Material", default="default",
        description="Custom building-material Static/SCOL EditorID, or 'default' for none")),
    ("fo4_ss2_output_dir", bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="//",
        description="FO4 Data-folder root -- Meshes/Textures/Materials/_SS2PlotBuilder subfolders are created here")),
    ("fo4_ss2_front_axis", bpy.props.EnumProperty(
        name="Front Direction", items=FRONT_AXIS_ITEMS, default="-Y",
        description="Which local axis the boundary guide's front arrow points along -- "
                    "best guess, not independently confirmed against a real SS2 marker")),
    ("fo4_ss2_tag_level", bpy.props.IntProperty(name="Level", default=1, min=1, max=3)),
    ("fo4_ss2_tag_stage", bpy.props.IntProperty(name="Stage", default=1, min=1)),
    ("fo4_ss2_tag_final", bpy.props.BoolProperty(name="Final Stage of Level", default=False)),
    ("fo4_ss2_spawn_level_ui", bpy.props.IntProperty(name="Level", default=1, min=1, max=3)),
    ("fo4_ss2_spawn_stage_start_ui", bpy.props.IntProperty(name="Stage Start", default=0, min=0)),
    ("fo4_ss2_spawn_stage_end_ui", bpy.props.IntProperty(name="Stage End", default=0, min=0)),
]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            # A silently-swallowed failure here previously left the panel
            # stuck on "Loading..." forever with zero diagnostic trace --
            # see the matching fix + comment in fo4_navmesh_generator.py.
            print(f"⚠ Failed to register {cls.__name__} ({cls.bl_idname}): {e}")
    for name, prop in _SCENE_PROPS:
        try:
            setattr(bpy.types.Scene, name, prop)
        except Exception as e:
            print(f"⚠ Failed to register Scene.{name}: {e}")


def unregister():
    for name, _ in reversed(_SCENE_PROPS):
        try: delattr(bpy.types.Scene, name)
        except Exception: pass
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
