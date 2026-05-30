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

# Known FO4 vanilla skeleton bone names (subset — commonly used for armor)
FO4_SKELETON_BONES = [
    "COM", "Pelvis", "Spine1", "Spine2", "Chest",
    "Neck", "Head",
    "Clavicle_L", "UpperArm_L", "ForeArm_L", "Hand_L",
    "Clavicle_R", "UpperArm_R", "ForeArm_R", "Hand_R",
    "Thigh_L", "Calf_L", "Foot_L",
    "Thigh_R", "Calf_R", "Foot_R",
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


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[FO4 Skeleton] Could not register {cls.__name__}: {e}")
    print("[FO4 Skeleton] Skeleton alignment wizard registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
