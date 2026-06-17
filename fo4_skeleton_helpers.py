"""
fo4_skeleton_helpers.py
FO4 vanilla skeleton alignment wizard for armor and clothing mods.
Imports fo4_skeleton.nif (via PyNifly/Niftools), aligns an armor mesh to it,
and generates vertex groups from bone proximity for initial weight painting.
"""

from __future__ import annotations

import os

try:
    import bpy
    import bmesh
    from mathutils import Vector, Matrix
except ImportError:
    bpy = None  # type: ignore[assignment]
    bmesh = None  # type: ignore[assignment]

try:
    from . import preferences as pref_module  # match import style of other files
except ImportError:
    pref_module = None  # type: ignore[assignment]

# Canonical FO4 vanilla NPC skeleton bone names sourced from fo4_bone_names.py.
# These match HumanRace skeleton.nif exactly, including trailing spaces where
# the game uses them (e.g. "NPC COM [COM ]", "NPC L Foot [Lft ]").
try:
    from . import fo4_bone_names as _bn
    FO4_SKELETON_BONES = list(_bn.NPC.values())
except ImportError:
    # Fallback hard-coded list (canonical abbreviations)
    FO4_SKELETON_BONES = [
        "NPC Root [Root]", "NPC COM [COM ]", "NPC Pelvis [Pelv]",
        "NPC Spine [Spn0]", "NPC Spine1 [Spn1]", "NPC Spine2 [Spn2]",
        "NPC Neck [Neck]", "NPC Head [Head]",
        "NPC L Clavicle [LClv]", "NPC L UpperArm [LUar]",
        "NPC L Forearm [LLar]", "NPC L Hand [LHnd]",
        "NPC R Clavicle [RClv]", "NPC R UpperArm [RUar]",
        "NPC R Forearm [RLar]", "NPC R Hand [RHnd]",
        "NPC L Thigh [LThg]", "NPC L Calf [LClf]",
        "NPC L Foot [Lft ]", "NPC L Toe0 [LToe]",
        "NPC R Thigh [RThg]", "NPC R Calf [RClf]",
        "NPC R Foot [Rft ]", "NPC R Toe0 [RToe]",
    ]


class SkeletonAlignmentWizard:

    @staticmethod
    def import_fo4_skeleton(skeleton_nif_path: str) -> tuple:
        """
        Import fo4_skeleton.nif using PyNifly or Niftools.
        Returns (success, message, armature_object_or_None).
        """
        if not os.path.exists(skeleton_nif_path):
            return False, f"Skeleton NIF not found: {skeleton_nif_path}", None

        # Try PyNifly import
        try:
            bpy.ops.import_scene.pynifly(filepath=skeleton_nif_path)
            for obj in bpy.context.selected_objects:
                if obj.type == 'ARMATURE':
                    obj.name = "FO4_Skeleton"
                    return True, "Imported skeleton via PyNifly", obj
        except Exception:
            pass

        # Try Niftools import
        try:
            bpy.ops.import_scene.nif(filepath=skeleton_nif_path)
            for obj in bpy.context.selected_objects:
                if obj.type == 'ARMATURE':
                    obj.name = "FO4_Skeleton"
                    return True, "Imported skeleton via Niftools", obj
        except Exception:
            pass

        return False, "Could not import skeleton — PyNifly or Niftools required", None

    @staticmethod
    def align_mesh_to_skeleton(mesh_obj, armature_obj) -> str:
        """
        Parent the mesh to the armature and set up vertex groups from bone proximity.
        Uses proximity-based automatic weight painting as a starting point.
        """
        # Parent with empty groups first
        mesh_obj.parent = armature_obj
        mesh_obj.parent_type = 'OBJECT'

        # Add vertex groups for each bone
        for bone in armature_obj.data.bones:
            if bone.name not in mesh_obj.vertex_groups:
                mesh_obj.vertex_groups.new(name=bone.name)

        # Use Blender's Automatic Weights for initial binding
        bpy.context.view_layer.objects.active = mesh_obj
        mesh_obj.select_set(True)
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj

        try:
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
            return "Mesh parented to skeleton with automatic weights. Refine weights manually."
        except Exception as e:
            return f"Auto-weight failed ({e}). Vertex groups created — assign weights manually."

    @staticmethod
    def validate_weight_groups(mesh_obj, armature_obj) -> list:
        """Check that all vertex groups match bones in the armature."""
        issues = []
        bone_names = {b.name for b in armature_obj.data.bones}
        for vg in mesh_obj.vertex_groups:
            if vg.name not in bone_names:
                issues.append(f"Vertex group '{vg.name}' has no matching bone in armature")
        return issues


class FO4_OT_ImportFO4Skeleton(bpy.types.Operator if bpy else object):
    bl_idname = "fo4.import_fo4_skeleton"
    bl_label = "Import FO4 Skeleton"
    bl_description = "Import the FO4 vanilla NPC skeleton NIF and place it in the scene"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            prefs = context.preferences.addons[__package__].preferences
            skeleton_path = getattr(prefs, 'fo4_skeleton_path', '') or getattr(prefs, 'game_path', '')
        except Exception:
            skeleton_path = ''

        if not skeleton_path:
            self.report({'ERROR'}, "Set the FO4 skeleton NIF path in addon preferences first")
            return {'CANCELLED'}

        # Try common locations
        candidates = [
            skeleton_path,
            os.path.join(skeleton_path, 'meshes', 'actors', 'character', 'characterassets', 'skeleton.nif'),
            os.path.join(skeleton_path, 'Data', 'meshes', 'actors', 'character', 'characterassets', 'skeleton.nif'),
        ]
        nif_path = next((p for p in candidates if os.path.exists(p)), None)
        if not nif_path:
            self.report({'ERROR'}, f"skeleton.nif not found. Checked: {candidates}")
            return {'CANCELLED'}

        ok, msg, arm = SkeletonAlignmentWizard.import_fo4_skeleton(nif_path)
        if ok:
            self.report({'INFO'}, msg)
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}


class FO4_OT_AlignMeshToSkeleton(bpy.types.Operator if bpy else object):
    bl_idname = "fo4.align_mesh_to_skeleton"
    bl_label = "Align Mesh to FO4 Skeleton"
    bl_description = "Parent active mesh to FO4_Skeleton armature with automatic weight painting"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        armature = next((o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FO4_Skeleton' in o.name), None)
        if not armature:
            self.report({'ERROR'}, "FO4_Skeleton armature not found in scene. Import it first.")
            return {'CANCELLED'}

        msg = SkeletonAlignmentWizard.align_mesh_to_skeleton(obj, armature)

        issues = SkeletonAlignmentWizard.validate_weight_groups(obj, armature)
        for issue in issues:
            self.report({'WARNING'}, issue)

        self.report({'INFO'}, msg)
        return {'FINISHED'}


class FO4_OT_ValidateSkeletonWeights(bpy.types.Operator if bpy else object):
    bl_idname = "fo4.validate_skeleton_weights"
    bl_label = "Validate Skeleton Weights"
    bl_description = "Check that all vertex groups match bones in the FO4 skeleton"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object")
            return {'CANCELLED'}
        armature = obj.parent if obj.parent and obj.parent.type == 'ARMATURE' else None
        if not armature:
            self.report({'ERROR'}, "Mesh is not parented to an armature")
            return {'CANCELLED'}
        issues = SkeletonAlignmentWizard.validate_weight_groups(obj, armature)
        if issues:
            for i in issues:
                self.report({'WARNING'}, i)
            self.report({'WARNING'}, f"{len(issues)} weight group issue(s) found")
        else:
            self.report({'INFO'}, "All vertex groups match skeleton bones")
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_ImportFO4Skeleton,
    FO4_OT_AlignMeshToSkeleton,
    FO4_OT_ValidateSkeletonWeights,
]



# ---------------------------------------------------------------------------
# FO4 bone validation helpers
# ---------------------------------------------------------------------------

# FO4 hard limits
_FO4_MAX_BONES       = 80    # max deform bones per single skinned mesh (NIF loader limit)
_FO4_MAX_INFLUENCES  = 4     # max bone influences per vertex

# Expected FO4 skeleton root bone names (only the true root — COM is a child)
_FO4_ROOT_BONES = {"NPC Root [Root]"}


def _validate_fo4_rig(armature_obj) -> list:
    """Check an armature against FO4 bone constraints.

    Returns a list of issue dicts: {severity, message, fix_hint}.
    """
    issues = []
    if armature_obj is None or armature_obj.type != 'ARMATURE':
        return [{"severity": "error",
                 "message": "Not an armature object",
                 "fix_hint": "Select the armature object"}]

    bones = armature_obj.data.bones
    bone_count = len(bones)

    if bone_count > _FO4_MAX_BONES:
        issues.append({
            "severity": "warning",
            "message": f"{bone_count} bones — FO4 recommends ≤{_FO4_MAX_BONES}",
            "fix_hint": "Remove unused bones or split skinned mesh",
        })

    # Check for root bone
    root_names = {b.name for b in bones if b.parent is None}
    if not root_names.intersection(_FO4_ROOT_BONES):
        issues.append({
            "severity": "warning",
            "message": f"No standard FO4 root bone found (roots: {root_names})",
            "fix_hint": "Rename root bone to 'NPC Root [Root]' or import fo4_skeleton.nif",
        })

    # Check for bones with spaces (NIF exporter issues)
    bad_names = [b.name for b in bones if "  " in b.name]
    if bad_names:
        issues.append({
            "severity": "error",
            "message": f"{len(bad_names)} bone(s) have double-spaces in name",
            "fix_hint": "Rename bones to remove double-spaces",
        })

    return issues


def _check_vertex_influences(mesh_obj, armature_obj) -> list:
    """Check that no vertex has more than FO4_MAX_INFLUENCES bone weights."""
    issues = []
    if mesh_obj is None or mesh_obj.type != 'MESH':
        return issues
    try:
        import bpy as _bpy
        me = mesh_obj.data
        for v in me.vertices:
            if len(v.groups) > _FO4_MAX_INFLUENCES:
                issues.append({
                    "severity": "error",
                    "message": (
                        f"Vertex {v.index} has {len(v.groups)} bone influences "
                        f"\u2014 FO4 max is {_FO4_MAX_INFLUENCES}"
                    ),
                    "fix_hint": "Use Weights > Limit Total (4) in Weight Paint mode",
                })
                if len(issues) >= 5:
                    issues.append({
                        "severity": "info",
                        "message": "\u2026 (more vertices affected)",
                        "fix_hint": "Run Weights > Limit Total on all vertices",
                    })
                    break
    except Exception as exc:
        issues.append({
            "severity": "error",
            "message": f"Could not check vertex influences: {exc}",
            "fix_hint": "Ensure the mesh has an armature modifier with valid bone weights",
        })
    return issues


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = (
    FO4_OT_ImportFO4Skeleton,
    FO4_OT_AlignMeshToSkeleton,
    FO4_OT_ValidateSkeletonWeights,
)


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"fo4_skeleton_helpers: Could not register {cls.__name__}: {exc}")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
