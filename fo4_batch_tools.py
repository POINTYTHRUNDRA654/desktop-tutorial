"""
fo4_batch_tools.py
==================
Batch export, progress reporting, and preset save/load for the Mossy FO4 addon.
"""
import bpy, os, json, time
from pathlib import Path

try:
    from . import export_helpers as _eh
except ImportError:
    _eh = None


# ═══════════════════════════════════════════════════════
# PROGRESS SYSTEM
# ═══════════════════════════════════════════════════════

_progress_state = {
    "active": False, "label": "", "current": 0, "total": 0, "pct": 0.0,
}

def progress_start(label: str, total: int):
    _progress_state.update(active=True, label=label, current=0, total=total, pct=0.0)
    bpy.context.window_manager.progress_begin(0, 100)
    print(f"[Progress] {label} — {total} steps")

def progress_step(step_label: str = "", current: int = None):
    s = _progress_state
    if not s["active"]: return
    if current is not None:
        s["current"] = current
    else:
        s["current"] += 1
    s["pct"] = (s["current"] / max(s["total"], 1)) * 100
    bpy.context.window_manager.progress_update(s["pct"])
    lbl = step_label or s["label"]
    print(f"[Progress] {lbl} {s['current']}/{s['total']} ({s['pct']:.0f}%)")

def progress_end():
    _progress_state["active"] = False
    bpy.context.window_manager.progress_end()
    print("[Progress] Done")


# ═══════════════════════════════════════════════════════
# PRESET SAVE / LOAD
# ═══════════════════════════════════════════════════════

_PRESET_PROPS = [
    "fo4_assets_path", "fo4_export_path", "fo4_plugin_name",
    "fo4_armor_description", "fo4_weapon_description",
    "fo4_npc_description", "fo4_glow_description",
    "fo4_tex_description", "fo4_tex_resolution",
    "fo4_glow_speed", "fo4_glow_strength",
]

def _preset_dir() -> Path:
    p = Path(bpy.utils.user_resource("CONFIG")) / "fo4_presets"
    p.mkdir(parents=True, exist_ok=True)
    return p

def save_preset(name: str, scene) -> tuple:
    data = {}
    for prop in _PRESET_PROPS:
        val = getattr(scene, prop, None)
        if val is not None:
            try: data[prop] = float(val) if isinstance(val, (int,float)) else str(val)
            except Exception: pass
    path = _preset_dir() / (name.replace(" ","_") + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"name": name, "props": data}, f, indent=2)
    return True, f"Preset saved: {path.name}"

def load_preset(name: str, scene) -> tuple:
    path = _preset_dir() / (name.replace(" ","_") + ".json")
    if not path.exists():
        return False, f"Preset not found: {name}"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for prop, val in data.get("props", {}).items():
        try: setattr(scene, prop, val)
        except Exception: pass
    return True, f"Preset loaded: {name}"

def list_presets() -> list:
    return [p.stem.replace("_"," ") for p in _preset_dir().glob("*.json")]


# ═══════════════════════════════════════════════════════
# BATCH EXPORT
# ═══════════════════════════════════════════════════════

def batch_export_objects(objects: list, output_dir: str,
                          apply_fo4_prep: bool = True) -> dict:
    """Export each object as a separate NIF (or FBX fallback).
    Returns {success_count, fail_count, exported: [paths]}
    """
    if not output_dir:
        return {"success": 0, "fail": len(objects), "exported": []}
    os.makedirs(output_dir, exist_ok=True)
    results = {"success": 0, "fail": 0, "exported": []}

    progress_start(f"Batch export {len(objects)} objects", len(objects))

    for obj in objects:
        progress_step(f"Exporting {obj.name}")
        safe = obj.name.replace(" ","_").replace(".","_")
        nif_path = os.path.join(output_dir, safe + ".nif")

        # FO4 prep
        if apply_fo4_prep:
            try:
                from . import imageto3d_helpers as _ith
                if hasattr(_ith, "fo4_post_process"):
                    _ith.fo4_post_process(obj, name=safe)
            except Exception:
                pass

        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        exported = False
        if _eh:
            ok, msg = _eh.ExportHelpers.export_mesh_to_nif(obj, nif_path)
            if ok:
                exported = True
                print(f"[Batch] ✓ {os.path.basename(nif_path)}: {msg}")
            else:
                print(f"[Batch] FAILED {obj.name}: {msg}")
        else:
            print(f"[Batch] FAILED {obj.name}: export_helpers unavailable — install PyNifly")

        if exported:
            results["success"] += 1
            results["exported"].append(nif_path)
        else:
            results["fail"] += 1

    progress_end()
    return results


# ═══════════════════════════════════════════════════════
# OPERATORS
# ═══════════════════════════════════════════════════════

class FO4_OT_BatchExport(bpy.types.Operator):
    """Export all selected meshes as individual NIFs with FO4 prep applied."""
    bl_idname  = "fo4.batch_export"
    bl_label   = "Batch Export Selected Objects"
    bl_options = {"REGISTER"}

    output_dir: bpy.props.StringProperty(
        name="Output Folder", subtype="DIR_PATH", default="",
    )
    apply_fo4_prep: bpy.props.BoolProperty(
        name="Apply FO4 Prep", default=True,
        description="Auto-triangulate, UV-unwrap, and apply scale before export",
    )

    def execute(self, context):
        objects = [o for o in context.selected_objects if o.type == "MESH"]
        if not objects:
            self.report({"ERROR"}, "No mesh objects selected")
            return {"CANCELLED"}
        out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//exports/")
        res = batch_export_objects(objects, out, self.apply_fo4_prep)
        self.report({"INFO"},
            f"Batch export: {res['success']} OK, {res['fail']} failed → {out}")
        return {"FINISHED"}


class FO4_OT_GenerateTextureFromDesc(bpy.types.Operator):
    """Shortcut: generate texture and apply to active object material."""
    bl_idname  = "fo4.generate_and_apply_texture"
    bl_label   = "Generate + Apply Texture"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        try:
            bpy.ops.fo4.generate_texture()
        except AttributeError:
            self.report({'ERROR'}, "fo4.generate_texture operator not available")
            return {'CANCELLED'}
        return {"FINISHED"}


_CLASSES = [
    FO4_OT_BatchExport,
    FO4_OT_GenerateTextureFromDesc,
]

_SCENE_PROPS = [
    ("fo4_batch_output", bpy.props.StringProperty(
        name="Batch Output Folder", subtype="DIR_PATH", default="",
    )),
    ("fo4_batch_fo4_prep", bpy.props.BoolProperty(
        name="Apply FO4 Prep on Batch Export", default=True,
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
