"""
fo4_workshop_helper.py
======================
Settlement workshop object setup for Fallout 4.

Handles: snap points, budget, keywords, COBJ stubs, workshop menu categories.
"""
import bpy, os, json, math, struct
from pathlib import Path
from typing import List, Optional

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

# Standard workshop keywords (FormID references to Fallout4.esm)
WORKSHOP_KEYWORDS = {
    "WorkshopItem":       0x054BA3,
    "WorkshopCanBePowered": 0x1CF2AB,
    "WorkshopPlayerOwned":  0x0AFFED,
    "isScrap":            0x06B0B4,
}

SNAP_TYPES = [
    ("FLOOR",   "Floor Snap",   "Snaps to flat floor surfaces"),
    ("WALL",    "Wall Snap",    "Snaps to vertical wall surfaces"),
    ("CEILING", "Ceiling Snap", "Snaps to overhead surfaces"),
    ("CORNER",  "Corner Snap",  "Snaps to 90-degree corners"),
    ("EDGE",    "Edge Snap",    "Snaps along edges"),
    ("CENTER",  "Center Snap",  "Free placement with center pivot"),
]


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
        emp.display_size = 0.1
        empties.append(emp)
        print(f"[Workshop] Snap: {emp.name}")

    return empties


def calculate_workshop_budget(objects: list) -> dict:
    """Calculate the workshop budget impact of a list of objects."""
    total_tris  = 0
    draw_calls  = 0
    unique_mats = set()

    for obj in objects:
        if obj.type != 'MESH':
            continue
        tris = sum(1 for p in obj.data.polygons if len(p.vertices) == 3)
        tris += sum(2 for p in obj.data.polygons if len(p.vertices) == 4)
        tris += sum(len(p.vertices)-2 for p in obj.data.polygons if len(p.vertices) > 4)
        total_tris += tris
        draw_calls += max(1, len(obj.material_slots))
        for slot in obj.material_slots:
            if slot.material:
                unique_mats.add(slot.material.name)

    warnings = []
    if total_tris > BUDGET_LIMITS["triangles"]:
        warnings.append(f"Triangles {total_tris:,} exceeds limit {BUDGET_LIMITS['triangles']:,}")
    if draw_calls > BUDGET_LIMITS["draw_calls"]:
        warnings.append(f"Draw calls {draw_calls} exceeds limit {BUDGET_LIMITS['draw_calls']}")

    return {
        "triangles":    total_tris,
        "draw_calls":   draw_calls,
        "unique_mats":  len(unique_mats),
        "within_budget": not warnings,
        "warnings":     warnings,
        "tri_pct":      min(100, total_tris / BUDGET_LIMITS["triangles"] * 100),
        "dc_pct":       min(100, draw_calls  / BUDGET_LIMITS["draw_calls"]  * 100),
    }


def write_workshop_esp_stubs(objects: list, output_dir: str,
                              plugin_name: str = "WorkshopMod",
                              category: str = "MISC") -> tuple:
    """Write COBJ (constructible object) stubs to an xEdit script."""
    os.makedirs(output_dir, exist_ok=True)
    cat_label = WORKSHOP_CATEGORIES.get(category, ("Misc",""))[0]

    lines = [
        f"; Workshop COBJ stubs for {plugin_name}",
        f"; Generated by Mossy FO4 Blender Addon",
        f"; Run in FO4Edit: Tools → Apply Script",
        "unit UserScript;",
        "function Initialize: Integer;",
        "var esp, grp, rec: IInterface;",
        "begin",
        f"  esp := AddNewFile; SetFileName(esp, '{plugin_name}.esp');",
        "  AddMasterIfMissing(esp, 'Fallout4.esm');",
        "  AddMasterIfMissing(esp, 'Fallout4 - Gameplay.esm');",
        "",
        f"  // Workshop category: {cat_label}",
    ]

    for obj in objects:
        if obj.type != 'MESH':
            continue
        safe = obj.name.replace(" ","_")
        lines += [
            f"  // COBJ for {obj.name}",
            f"  grp := Add(esp, 'COBJ', True);",
            f"  rec := Add(grp, 'COBJ', True);",
            f"  SetElementEditValues(rec, 'EDID', 'Recipe_{safe}');",
            f"  SetElementEditValues(rec, 'FULL', '{obj.name}');",
            f"  // TODO: set CNAM (created object), FVPA (requirements), ANAM (workshop menu)",
        ]

    lines += ["  Result := 0;", "end;", "end."]

    pas_path = os.path.join(output_dir, plugin_name + "_workshop.pas")
    with open(pas_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    return True, f"Workshop xEdit script: {pas_path}"


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
    """Generate workshop COBJ xEdit script for selected objects."""
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

    def execute(self, context):
        objects = [o for o in context.selected_objects if o.type == 'MESH']
        if not objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//")
        ok, msg = write_workshop_esp_stubs(objects, out, self.plugin_name, self.category)
        self.report({'INFO'} if ok else {'ERROR'}, msg)
        return {'FINISHED'}


_CLASSES = [FO4_OT_AddSnapPoints, FO4_OT_CheckWorkshopBudget, FO4_OT_GenerateWorkshopStubs]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass


def unregister():
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
