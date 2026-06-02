"""fo4_compatibility_checker.py — Scan for mod conflicts before building."""
import bpy, os, json
from pathlib import Path

KNOWN_MODS = {
    "Fallout4.esm":         {"type":"master","skeleton":"fo4"},
    "DLCRobot.esm":         {"type":"dlc"},
    "DLCCoast.esm":         {"type":"dlc"},
    "DLCNukaWorld.esm":     {"type":"dlc"},
    "CBBE.esp":             {"type":"body","skeleton":"cbbe","slot":32,
                             "conflicts":["vanilla_body_meshes"]},
    "AWKCR.esp":            {"type":"framework","keywords":["ArmorKeyword"]},
    "SimSettlements.esp":   {"type":"framework","conflicts":["WorkshopScript"]},
    "UFO4P.esp":            {"type":"patch"},
    "Armorsmith Extended.esp":{"type":"framework","slot_range":[30,61]},
}

SKELETON_COMPAT = {
    "fo4":  {"bones":["NPC Root [Root]","NPC Pelvis [Pelv]","NPC Spine [Spn0]"]},
    "cbbe": {"bones":["CBBE_Spine","CBBE_Pelvis"]},
}

FO4_FORMID_RANGES = {
    "plugin_local": (0x00000800, 0x00FFFFFF),
    "master_refs":  (0x00000001, 0x000007FF),
}


def scan_data_folder(data_path: str) -> list:
    """List all .esp/.esm/.esl files in the Data folder."""
    installed = []
    try:
        for f in Path(data_path).glob("*.es[pml]"):
            info = KNOWN_MODS.get(f.name, {"type":"unknown"})
            installed.append({"name": f.name, **info})
    except Exception as exc:
        print(f"[Compat] Could not scan Data folder: {exc}")
    return installed


def check_skeleton_compatibility(arm_obj) -> list:
    """Check if an armature matches known FO4 skeleton requirements."""
    issues = []
    if not arm_obj or arm_obj.type != 'ARMATURE':
        return issues
    bones = {b.name for b in arm_obj.data.bones}
    fo4_required = set(SKELETON_COMPAT["fo4"]["bones"])
    missing = fo4_required - bones
    if missing:
        issues.append({
            "severity": "WARNING",
            "message":  f"Missing FO4 skeleton bones: {missing}",
            "fix":      "Import fo4_skeleton.nif or use 'Build FO4 Skeleton' in the Armor panel",
        })
    if len(bones) > 128:
        issues.append({
            "severity": "ERROR",
            "message":  f"Too many bones: {len(bones)} (FO4 limit: 128 active)",
            "fix":      "Remove unused bones or split the skinned mesh",
        })
    return issues


def check_mesh_conflicts(objects: list, installed_mods: list) -> list:
    """Check mesh names and paths against known mod conventions."""
    issues = []
    has_cbbe = any(m["name"] == "CBBE.esp" for m in installed_mods)

    for obj in objects:
        if obj.type != 'MESH':
            continue
        name_lower = obj.name.lower()
        # CBBE body slot conflict
        if has_cbbe and obj.get("fo4_armor_type") == "FULL_BODY":
            issues.append({
                "severity": "WARNING",
                "object":   obj.name,
                "message":  "Full-body mesh may conflict with CBBE body replacer",
                "fix":      "Use CBBE as base mesh or add CBBE as master to your ESP",
            })
        # Naming conflicts
        if " " in obj.name:
            issues.append({
                "severity": "WARNING",
                "object":   obj.name,
                "message":  "Object name contains spaces — NIF exporter may mangle it",
                "fix":      f"Rename to: {obj.name.replace(' ','_')}",
            })
        # Scale
        s = obj.scale
        if abs(s.x-1)>0.01 or abs(s.y-1)>0.01 or abs(s.z-1)>0.01:
            issues.append({
                "severity": "ERROR",
                "object":   obj.name,
                "message":  f"Unapplied scale {s.x:.3f},{s.y:.3f},{s.z:.3f}",
                "fix":      "Ctrl+A → Apply Scale",
            })
    return issues


def run_full_check(data_path: str = "", objects: list = None) -> dict:
    """Run all compatibility checks. Returns report dict."""
    installed = scan_data_folder(data_path) if data_path else []
    objects   = objects or [o for o in bpy.data.objects if o.type == 'MESH']
    arms      = [o for o in bpy.data.objects if o.type == 'ARMATURE']

    issues = []
    for arm in arms:
        issues += check_skeleton_compatibility(arm)
    issues += check_mesh_conflicts(objects, installed)

    errors   = [i for i in issues if i.get("severity") == "ERROR"]
    warnings = [i for i in issues if i.get("severity") == "WARNING"]

    return {
        "installed_mods": installed,
        "issues": issues,
        "error_count":   len(errors),
        "warning_count": len(warnings),
        "clean":         not issues,
    }


class FO4_OT_RunCompatibilityCheck(bpy.types.Operator):
    """Scan scene and installed mods for FO4 compatibility issues."""
    bl_idname  = "fo4.run_compatibility_check"
    bl_label   = "Run Compatibility Check"
    bl_options = {'REGISTER'}

    data_path: bpy.props.StringProperty(
        name="FO4 Data Folder", subtype='DIR_PATH', default="",
        description="Path to Fallout 4/Data/ folder to scan installed mods",
    )

    def execute(self, context):
        data = bpy.path.abspath(self.data_path) if self.data_path else ""
        report = run_full_check(data)
        print("\n[Compat Check] ══════════════════════════")
        for issue in report["issues"]:
            obj = issue.get("object","")
            print(f"  {'❌' if issue['severity']=='ERROR' else '⚠'} "
                  f"{'['+obj+'] ' if obj else ''}{issue['message']}")
            if issue.get("fix"):
                print(f"    Fix: {issue['fix']}")
        print(f"[Compat Check] {report['error_count']} errors, "
              f"{report['warning_count']} warnings | "
              f"{'✅ Clean' if report['clean'] else '⚠ Issues found'}")
        if report['clean']:
            self.report({'INFO'}, "Compatibility check passed — no issues found")
        else:
            self.report({'WARNING'},
                f"{report['error_count']} error(s), {report['warning_count']} warning(s) — see System Console")
        return {'FINISHED'}


_CLASSES = [FO4_OT_RunCompatibilityCheck]

_SCENE_PROPS = [("fo4_compat_data_path", bpy.props.StringProperty(
    name="FO4 Data Folder", subtype='DIR_PATH', default="",
))]


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
