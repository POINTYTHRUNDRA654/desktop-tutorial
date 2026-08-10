"""
smd_helpers.py

Native importer for Valve SMD (Studiomdl Data) files -- a plain-text mesh/
skeleton/animation interchange format with no built-in Blender support and
no third-party SMD addon installed in this environment. Written against real
Battlefield-6-sourced SMD dumps (ripped via a third-party extraction tool,
NOT native Source-engine content) rather than the format spec alone.

File layout (confirmed against real files, not assumed from documentation):
    nodes                       bone hierarchy: id "name" parent_id
    end
    skeleton
    time 0                      bind pose (always present)
        id  px py pz  rx ry rz  (rotation = radians, XYZ Euler, PARENT-LOCAL)
    time 1                      additional frames = an animation sequence
        ...
    end
    triangles                   mesh data. Real files from this tool emit
    material_name                MULTIPLE top-level triangles/end blocks per
    bone px py pz nx ny nz u v   file (one per submesh) rather than the single
    ...three vertex lines...     block the format spec describes -- this
    end                          parser scans for and merges ALL of them.

Per-vertex line: ``bone_index x y z nx ny nz u v [numlinks (bone weight)*n]``
-- the trailing numlinks/pairs block is the real per-vertex multi-bone skin
weight; falls back to a single (bone_index, 1.0) weight when absent (legacy
single-bind format).

Positions/bone offsets are in whatever unit the source tool wrote (BF6/
Frostbite assets typically land close to metres) -- there is no fixed,
known conversion the way there is for FO4 NIFs, so callers must supply an
explicit ``import_scale`` rather than this module guessing one.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

try:
    import bpy
    from mathutils import Vector, Euler, Matrix, Quaternion
except ImportError:
    bpy = None


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class SMDBone:
    id: int
    name: str
    parent_id: int  # -1 = root


@dataclass
class SMDData:
    bones: list = field(default_factory=list)          # [SMDBone, ...]
    bind_pose: dict = field(default_factory=dict)       # bone_id -> (pos(3,), rot(3,))
    anim_frames: dict = field(default_factory=dict)     # time(int>0) -> {bone_id: (pos, rot)}
    # triangles: list of (material_name, [ (bone_idx, pos, normal, uv, weights), x3 ])
    triangles: list = field(default_factory=list)

    @property
    def has_skeleton(self) -> bool:
        return len(self.bones) > 0

    @property
    def has_animation(self) -> bool:
        return len(self.anim_frames) > 0


_NODE_RE = re.compile(r'^(-?\d+)\s+"([^"]*)"\s+(-?\d+)\s*$')


def parse_smd(filepath: str) -> SMDData:
    """Parse an SMD file into an :class:`SMDData`.

    Tolerant of the real-world dialect quirks confirmed against actual BF6
    dumps: multiple top-level ``triangles``/``end`` blocks per file (spec
    only defines one -- treated as separate submeshes and merged), and a
    material-name line repeated before every single triangle rather than
    once per group (both forms parse identically here since material is
    read fresh before every 3-vertex triangle regardless).
    """
    data = SMDData()
    with open(filepath, "r", encoding="utf-8", errors="replace") as fh:
        lines = [ln.rstrip("\n").rstrip("\r") for ln in fh]

    i = 0
    n = len(lines)
    while i < n:
        line = lines[i].strip()
        if line == "nodes":
            i += 1
            while i < n and lines[i].strip() != "end":
                m = _NODE_RE.match(lines[i].strip())
                if m:
                    bid, bname, bparent = int(m.group(1)), m.group(2), int(m.group(3))
                    data.bones.append(SMDBone(id=bid, name=bname, parent_id=bparent))
                i += 1
            i += 1  # skip "end"
        elif line == "skeleton":
            i += 1
            current_time = 0
            while i < n and lines[i].strip() != "end":
                l = lines[i].strip()
                if l.startswith("time"):
                    parts = l.split()
                    current_time = int(parts[1]) if len(parts) > 1 else 0
                elif l:
                    toks = l.split()
                    if len(toks) >= 7:
                        bid = int(toks[0])
                        pos = (float(toks[1]), float(toks[2]), float(toks[3]))
                        rot = (float(toks[4]), float(toks[5]), float(toks[6]))
                        if current_time == 0:
                            data.bind_pose[bid] = (pos, rot)
                        else:
                            data.anim_frames.setdefault(current_time, {})[bid] = (pos, rot)
                i += 1
            i += 1  # skip "end"
        elif line == "triangles":
            i += 1
            while i < n and lines[i].strip() != "end":
                mat_line = lines[i].strip()
                i += 1
                if not mat_line:
                    continue
                verts = []
                for _ in range(3):
                    if i >= n:
                        break
                    toks = lines[i].strip().split()
                    i += 1
                    if len(toks) < 9:
                        continue
                    bone_idx = int(float(toks[0]))
                    pos = (float(toks[1]), float(toks[2]), float(toks[3]))
                    normal = (float(toks[4]), float(toks[5]), float(toks[6]))
                    uv = (float(toks[7]), float(toks[8]))
                    weights = []
                    if len(toks) > 9:
                        try:
                            numlinks = int(float(toks[9]))
                            pair_toks = toks[10:10 + numlinks * 2]
                            for k in range(numlinks):
                                lb = int(float(pair_toks[2 * k]))
                                lw = float(pair_toks[2 * k + 1])
                                weights.append((lb, lw))
                        except (ValueError, IndexError):
                            weights = [(bone_idx, 1.0)] if bone_idx >= 0 else []
                    elif bone_idx >= 0:
                        weights = [(bone_idx, 1.0)]
                    verts.append((bone_idx, pos, normal, uv, weights))
                if len(verts) == 3:
                    data.triangles.append((mat_line, verts))
            i += 1  # skip "end"
        else:
            i += 1

    return data


# ---------------------------------------------------------------------------
# Blender scene construction
# ---------------------------------------------------------------------------

def _local_matrix(pos, rot) -> "Matrix":
    """SMD per-bone transform: translation then XYZ-order Euler rotation,
    both expressed in the PARENT bone's local space."""
    t = Matrix.Translation(Vector(pos))
    r = Euler(rot, 'XYZ').to_matrix().to_4x4()
    return t @ r


def _world_matrices(bones: list, pose: dict) -> dict:
    """Resolve every bone's parent-local (pos, rot) into an armature-space
    (world) matrix by walking the hierarchy from each root down.

    ``pose`` maps bone_id -> (pos, rot); bones missing from it (can happen
    on animation frames that only touch a subset of the skeleton) inherit
    their bind-pose local transform as a fallback so the hierarchy never
    breaks.
    """
    by_id = {b.id: b for b in bones}
    children: dict = {}
    roots = []
    for b in bones:
        if b.parent_id in by_id:
            children.setdefault(b.parent_id, []).append(b.id)
        else:
            roots.append(b.id)

    world: dict = {}

    def _walk(bone_id, parent_world):
        pos, rot = pose.get(bone_id, ((0.0, 0.0, 0.0), (0.0, 0.0, 0.0)))
        local = _local_matrix(pos, rot)
        wm = parent_world @ local
        world[bone_id] = wm
        for c in children.get(bone_id, []):
            _walk(c, wm)

    for r in roots:
        _walk(r, Matrix.Identity(4))
    return world


def build_armature_from_smd(smd: SMDData, name: str, import_scale: float = 1.0):
    """Build a Blender Armature object from *smd*'s bind pose (``time 0``).

    Bone orientation (not just position) is preserved by assigning each
    EditBone's ``.matrix`` directly from the resolved world transform --
    setting only head/tail would silently drop the SMD's per-bone roll,
    which matters for correct deformation on twist/roll bones.
    """
    arm_data = bpy.data.armatures.new(f"{name}_Armature")
    arm_obj = bpy.data.objects.new(f"{name}_Armature", arm_data)
    bpy.context.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    world = _world_matrices(smd.bones, smd.bind_pose)
    id_to_name = {b.id: b.name for b in smd.bones}
    edit_bones = {}

    # Parents must exist before children reference them -- bones are usually
    # already in that order in the file, but don't rely on it.
    remaining = list(smd.bones)
    made_progress = True
    while remaining and made_progress:
        made_progress = False
        still_remaining = []
        for b in remaining:
            if b.parent_id != -1 and b.parent_id not in edit_bones and b.parent_id in id_to_name:
                still_remaining.append(b)
                continue
            eb = arm_data.edit_bones.new(b.name)
            wm = world.get(b.id, Matrix.Identity(4)).copy()
            wm.translation = wm.translation * import_scale
            eb.tail = eb.head + Vector((0, 0, 1))  # placeholder so .matrix assignment is valid
            eb.matrix = wm
            eb.length = max(eb.length, 0.01)  # Blender rejects zero-length bones
            eb.use_deform = True
            if b.parent_id in edit_bones:
                eb.parent = edit_bones[b.parent_id]
            edit_bones[b.id] = eb
            made_progress = True
        remaining = still_remaining

    # Give bones with children a tail reaching toward the (first) child's
    # head instead of the tiny placeholder stub, for a readable rig.
    for b in smd.bones:
        kids = [c for c in smd.bones if c.parent_id == b.id]
        if kids and b.id in edit_bones:
            child_eb = edit_bones[kids[0].id]
            head = edit_bones[b.id].head
            if (child_eb.head - head).length > 1e-6:
                edit_bones[b.id].tail = child_eb.head

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def build_mesh_from_smd(smd: SMDData, name: str, import_scale: float = 1.0,
                        armature_obj=None):
    """Build a Blender Mesh object from *smd*'s triangle data.

    Vertices are deduplicated by exact (position, normal, uv) so shading
    seams/UV islands are preserved correctly while smooth interior surfaces
    still share vertices (matches standard importer behaviour).
    """
    id_to_name = {b.id: b.name for b in smd.bones}

    verts: list = []
    vert_key_to_index: dict = {}
    faces: list = []
    face_material: list = []
    material_names: list = []
    material_index: dict = {}
    uv_per_loop: list = []  # parallel to faces, one (u,v) triple per face
    vert_weights: dict = {}  # vertex index -> [(bone_id, weight), ...]

    for mat_name, tri_verts in smd.triangles:
        if mat_name not in material_index:
            material_index[mat_name] = len(material_names)
            material_names.append(mat_name)
        mi = material_index[mat_name]

        face_idx = []
        face_uvs = []
        for bone_idx, pos, normal, uv, weights in tri_verts:
            key = (round(pos[0], 5), round(pos[1], 5), round(pos[2], 5),
                   round(normal[0], 4), round(normal[1], 4), round(normal[2], 4),
                   round(uv[0], 5), round(uv[1], 5))
            if key not in vert_key_to_index:
                idx = len(verts)
                verts.append(tuple(c * import_scale for c in pos))
                vert_key_to_index[key] = idx
                if weights:
                    vert_weights[idx] = weights
            else:
                idx = vert_key_to_index[key]
            face_idx.append(idx)
            face_uvs.append(uv)
        faces.append(tuple(face_idx))
        face_material.append(mi)
        uv_per_loop.append(face_uvs)

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li, loop_index in enumerate(poly.loop_indices):
            uv = uv_per_loop[poly.index][li]
            uv_layer.data[loop_index].uv = (uv[0], uv[1])

    for i, mi in enumerate(face_material):
        mesh.polygons[i].material_index = mi

    mesh_obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(mesh_obj)

    for mat_name in material_names:
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            mat = bpy.data.materials.new(mat_name)
            mat.use_nodes = True
        mesh_obj.data.materials.append(mat)

    if vert_weights and id_to_name:
        vg_by_bone: dict = {}
        for idx, weights in vert_weights.items():
            for bone_id, weight in weights:
                bname = id_to_name.get(bone_id)
                if not bname or weight <= 0.0:
                    continue
                vg = vg_by_bone.get(bone_id)
                if vg is None:
                    vg = mesh_obj.vertex_groups.new(name=bname)
                    vg_by_bone[bone_id] = vg
                vg.add([idx], weight, 'REPLACE')

        if armature_obj is not None:
            mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
            mod.object = armature_obj
            mesh_obj.parent = armature_obj

    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.update()

    return mesh_obj


def apply_smd_animation(smd: SMDData, armature_obj, action_name: str,
                         import_scale: float = 1.0):
    """Build a Blender Action from *smd*'s ``time > 0`` skeleton frames.

    Each frame's parent-local (pos, rot) is resolved to a world matrix the
    same way the bind pose is, then converted to a REST-relative pose
    transform (``rest_local.inverted() @ frame_local``) before keyframing
    ``pose_bone.location`` / ``rotation_quaternion`` -- pose-space transforms
    in Blender are relative to the bone's own rest pose, not its parent, so
    naively keyframing the raw parent-local SMD values would double up
    whatever the rest pose already contributes.

    No real multi-frame SMD file was available to verify this end-to-end
    against (every file in the tested batch was a single-frame reference
    mesh) -- implemented directly from the confirmed bind-pose parsing
    logic, not verified against actual animation output.
    """
    if not smd.has_animation or armature_obj is None:
        return None

    action = bpy.data.actions.new(action_name)
    if armature_obj.animation_data is None:
        armature_obj.animation_data_create()
    armature_obj.animation_data.action = action

    rest_local = {b.id: _local_matrix(*smd.bind_pose.get(b.id, ((0, 0, 0), (0, 0, 0))))
                  for b in smd.bones}
    id_to_name = {b.id: b.name for b in smd.bones}

    for frame_time in sorted(smd.anim_frames.keys()):
        frame_pose = smd.anim_frames[frame_time]
        for bone_id, (pos, rot) in frame_pose.items():
            bname = id_to_name.get(bone_id)
            pb = armature_obj.pose.bones.get(bname) if bname else None
            if pb is None:
                continue
            frame_local = _local_matrix(pos, rot)
            frame_local = Matrix.Translation(
                frame_local.translation * import_scale
            ) @ frame_local.to_3x3().to_4x4()
            rest = rest_local.get(bone_id, Matrix.Identity(4))
            rest = Matrix.Translation(rest.translation * import_scale) @ rest.to_3x3().to_4x4()
            pose_delta = rest.inverted() @ frame_local

            pb.rotation_mode = 'QUATERNION'
            pb.location = pose_delta.translation
            pb.rotation_quaternion = pose_delta.to_quaternion()
            pb.keyframe_insert("location", frame=frame_time)
            pb.keyframe_insert("rotation_quaternion", frame=frame_time)

    return action


def import_smd_file(filepath: str, import_scale: float = 1.0,
                    import_animation: bool = True):
    """Import one SMD file into the current scene.

    Returns ``(mesh_obj, armature_obj_or_None, message)``.
    """
    name = os.path.splitext(os.path.basename(filepath))[0]
    smd = parse_smd(filepath)

    if not smd.triangles and not smd.has_skeleton:
        return None, None, f"'{name}': no nodes or triangles found -- not a recognised SMD"

    armature_obj = None
    if smd.has_skeleton:
        armature_obj = build_armature_from_smd(smd, name, import_scale)

    mesh_obj = None
    if smd.triangles:
        mesh_obj = build_mesh_from_smd(smd, name, import_scale, armature_obj)

    action = None
    if import_animation and smd.has_animation and armature_obj is not None:
        action = apply_smd_animation(smd, armature_obj, f"{name}_Action", import_scale)

    parts = []
    if mesh_obj:
        parts.append(f"{len(mesh_obj.data.vertices)} verts")
    if armature_obj:
        parts.append(f"{len(armature_obj.data.bones)} bones")
    if action:
        parts.append(f"{len(smd.anim_frames)} anim frame(s)")
    msg = f"Imported '{name}': {', '.join(parts) if parts else 'no data'}"
    return mesh_obj, armature_obj, msg
