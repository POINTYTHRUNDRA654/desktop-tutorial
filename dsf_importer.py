"""
DSF Importer — DAZ Studio Format (.dsf / .duf) import for Blender

Supports:
  • Plain-JSON and gzip-compressed DSF/DUF files
  • Geometry: vertices, polygons (tris + quads), UV sets
  • Materials: diffuse colour / image texture wiring
  • Skeleton: bone hierarchy → Blender Armature + vertex groups
  • Scene nodes (position / rotation / scale)

Usage (in Blender):
  File → Import → DAZ Studio File (.dsf / .duf)
  — or —
  N-panel → Fallout 4 → Import → Import DSF
"""

import gzip
import json
import math
import os
import struct
import traceback
from typing import Any, Dict, List, Optional, Tuple

import bpy
import bmesh
from bpy.props import BoolProperty, CollectionProperty, FloatProperty, StringProperty
from bpy.types import Operator
from bpy_extras.io_utils import ImportHelper

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_dsf(path: str) -> Dict:
    """Return the parsed JSON dict from a .dsf / .duf file (plain or gzip)."""
    with open(path, "rb") as f:
        header = f.read(2)
    if header == b"\x1f\x8b":
        opener = gzip.open
    else:
        opener = open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def _matrix_from_node(node: Dict) -> Tuple:
    """Return (location, rotation_euler, scale) from a DSF scene node."""
    def _val(channel):
        return channel.get("current_value", channel.get("value", 0.0)) if isinstance(channel, dict) else float(channel)

    t = node.get("translation", {})
    r = node.get("rotation", {})
    s = node.get("scale", {})

    loc = (
        _val(t.get("x", 0)),
        -_val(t.get("z", 0)),   # DAZ: Y-up  → Blender: Z-up
        _val(t.get("y", 0)),
    )
    rot = (
        math.radians(_val(r.get("x", 0))),
        math.radians(-_val(r.get("z", 0))),
        math.radians(_val(r.get("y", 0))),
    )
    sc = (
        _val(s.get("x", 1)),
        _val(s.get("z", 1)),
        _val(s.get("y", 1)),
    )
    return loc, rot, sc


# ---------------------------------------------------------------------------
# Core import logic
# ---------------------------------------------------------------------------

class DSFImporter:
    """Stateless helper that converts a parsed DSF dict → Blender objects."""

    def __init__(self, context, filepath: str, import_skeleton: bool, import_materials: bool, scale: float):
        self.context = context
        self.filepath = filepath
        self.import_skeleton = import_skeleton
        self.import_materials = import_materials
        self.scale = scale
        self.collection = context.collection
        self.messages: List[str] = []

    # ------------------------------------------------------------------
    def run(self) -> bool:
        try:
            data = _load_dsf(self.filepath)
        except Exception as e:
            self.messages.append(f"ERROR: could not read file — {e}")
            return False

        geom_lib   = data.get("geometry_library", [])
        node_lib   = data.get("node_library", [])
        mat_lib    = data.get("material_library", [])
        image_lib  = data.get("image_library", [])
        scene      = data.get("scene", {})

        # Build image name → path lookup
        img_map = {}
        for img in image_lib:
            name = img.get("id", img.get("name", ""))
            maps = img.get("map", [])
            if maps:
                img_map[name] = maps[0].get("url", "")

        # Geometry objects
        geo_objects: Dict[str, bpy.types.Object] = {}
        for geo in geom_lib:
            obj = self._import_geometry(geo, mat_lib, img_map)
            if obj:
                geo_objects[geo.get("id", geo.get("name", ""))] = obj

        # Armature / skeleton
        arm_objects: Dict[str, bpy.types.Object] = {}
        if self.import_skeleton:
            for node in node_lib:
                if node.get("type") in ("figure", "bone") and "bones" in node:
                    arm_obj = self._import_skeleton(node)
                    if arm_obj:
                        arm_objects[node.get("id", "")] = arm_obj

        # Scene nodes — apply transforms
        for sn in scene.get("nodes", []):
            ref = sn.get("id", sn.get("url", "")).lstrip("#")
            obj = geo_objects.get(ref) or arm_objects.get(ref)
            if obj:
                loc, rot, sc = _matrix_from_node(sn)
                obj.location       = [v * self.scale for v in loc]
                obj.rotation_euler = rot
                obj.scale          = sc

        if not geo_objects and not arm_objects:
            self.messages.append("No geometry or skeleton nodes found in file.")

        return True

    # ------------------------------------------------------------------
    def _import_geometry(self, geo: Dict, mat_lib: List, img_map: Dict) -> Optional[bpy.types.Object]:
        name   = geo.get("name", geo.get("id", "DSF_Mesh"))
        verts_raw = geo.get("vertices", {}).get("values", [])
        if not verts_raw:
            return None

        sc = self.scale
        # DAZ is Y-up; swap Y/Z and negate new Y to get Blender Z-up coords
        verts = [(v[0] * sc, -v[2] * sc, v[1] * sc) for v in verts_raw]

        polys_raw = geo.get("polylist", {}).get("values", [])

        # DSF polylist entry format depends on which group arrays are present:
        #   polygon_groups present      → 1 leading group index
        #   polygon_material_groups present → 1 leading material index
        # Both are usually present, giving: [group_idx, mat_idx, v0, v1, ...]
        # The mat index is always the LAST leading index before the vertices.
        has_poly_groups = bool(geo.get("polygon_groups", {}).get("values"))
        has_mat_groups  = bool(geo.get("polygon_material_groups", {}).get("values"))
        n_skip = (1 if has_poly_groups else 0) + (1 if has_mat_groups else 0)
        mat_offset = n_skip - 1  # index of the material id within entry (or -1)

        faces: List[Tuple] = []
        face_mat_ids: List[int] = []
        n_verts = len(verts_raw)
        for entry in polys_raw:
            mat_id = int(entry[mat_offset]) if mat_offset >= 0 else 0
            vlist  = tuple(int(i) for i in entry[n_skip:])
            # Skip degenerate faces and faces with out-of-range indices
            if len(vlist) >= 3 and all(i < n_verts for i in vlist):
                face_mat_ids.append(mat_id)
                faces.append(vlist)

        # Create mesh
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()

        obj = bpy.data.objects.new(name, mesh)
        self.collection.objects.link(obj)

        # UV
        uv_sets = geo.get("uvs", {})
        if uv_sets:
            self._apply_uvs(mesh, uv_sets, faces)

        # Materials
        if self.import_materials:
            self._apply_materials(obj, mesh, geo, mat_lib, img_map, face_mat_ids)

        return obj

    # ------------------------------------------------------------------
    def _apply_uvs(self, mesh, uv_sets: Dict, faces: List[Tuple]):
        values = uv_sets.get("values", [])
        poly_uv  = uv_sets.get("polygon_vertex_indices", {}).get("values", [])
        if not values or not poly_uv:
            return

        uv_layer = mesh.uv_layers.new(name="UVMap")
        loop_idx = 0
        for fi, face in enumerate(faces):
            if fi >= len(poly_uv):
                loop_idx += len(face)
                continue
            face_uvs = poly_uv[fi]  # list of uv indices per vertex
            for vi_local, uv_idx in enumerate(face_uvs):
                if uv_idx < len(values):
                    u, v = values[uv_idx]
                    uv_layer.data[loop_idx].uv = (u, 1.0 - v)  # flip V
                loop_idx += 1

    # ------------------------------------------------------------------
    def _apply_materials(self, obj, mesh, geo: Dict, mat_lib: List, img_map: Dict, face_mat_ids: List[int]):
        # DSF geometry polygon_material_groups maps mat slot → [face_range]
        pmg = geo.get("polygon_material_groups", {}).get("values", [])
        mat_name_list = [g[0] if isinstance(g, list) else str(g) for g in pmg] if pmg else ["Material"]

        # Match material library entries to slot names
        mat_lookup: Dict[str, Dict] = {}
        for m in mat_lib:
            mat_lookup[m.get("id", "")] = m
            mat_lookup[m.get("name", "")] = m

        bl_mats: List[bpy.types.Material] = []
        for slot_name in mat_name_list:
            mat_data = mat_lookup.get(slot_name, {})
            bl_mat = self._make_material(slot_name, mat_data, img_map)
            bl_mats.append(bl_mat)
            obj.data.materials.append(bl_mat)

        # Assign per-face material index
        if len(bl_mats) > 1:
            for fi, poly in enumerate(mesh.polygons):
                if fi < len(face_mat_ids):
                    poly.material_index = face_mat_ids[fi] % len(bl_mats)

    # ------------------------------------------------------------------
    def _make_material(self, name: str, mat_data: Dict, img_map: Dict) -> bpy.types.Material:
        mat = bpy.data.materials.get(name)
        if mat:
            return mat
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()

        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (0, 0)
        out  = nodes.new("ShaderNodeOutputMaterial")
        out.location  = (300, 0)
        links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

        # Try to hook up diffuse colour / texture
        channels = mat_data.get("channel", {})
        diff = channels.get("diffuse_color", channels.get("Diffuse Color", {}))
        if isinstance(diff, dict):
            cv = diff.get("current_value", diff.get("value"))
            if isinstance(cv, list) and len(cv) >= 3:
                bsdf.inputs["Base Color"].default_value = (*cv[:3], 1.0)

        # Diffuse texture
        diff_map = mat_data.get("extra", [{}])
        for extra in (diff_map if isinstance(diff_map, list) else [diff_map]):
            tex_channels = extra.get("channel", {})
            for key in ("diffuse_color", "Diffuse Color", "Base Color", "diffuse"):
                ch = tex_channels.get(key, {})
                img_ref = ch.get("image", "")
                img_url = img_map.get(img_ref, img_ref)
                if img_url:
                    img_path = bpy.path.abspath(img_url) if img_url.startswith("//") else img_url
                    if os.path.isfile(img_path):
                        tex_node = nodes.new("ShaderNodeTexImage")
                        tex_node.location = (-300, 0)
                        try:
                            tex_node.image = bpy.data.images.load(img_path, check_existing=True)
                            links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
                        except Exception:
                            pass
                    break

        return mat

    # ------------------------------------------------------------------
    def _import_skeleton(self, figure_node: Dict) -> Optional[bpy.types.Object]:
        name = figure_node.get("name", figure_node.get("id", "Armature"))
        arm  = bpy.data.armatures.new(name)
        obj  = bpy.data.objects.new(name, arm)
        self.collection.objects.link(obj)

        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        edit_bones = arm.edit_bones

        def _add_bone(bone_def: Dict, parent_eb=None, parent_head=None):
            b_name = bone_def.get("name", bone_def.get("id", "bone"))
            eb = edit_bones.new(b_name)
            loc, _, _ = _matrix_from_node(bone_def)
            sc = self.scale
            head = (loc[0] * sc, loc[1] * sc, loc[2] * sc)
            eb.head = head
            eb.tail = (head[0], head[1], head[2] + 0.05 * sc)
            if parent_eb:
                eb.parent = parent_eb
                eb.use_connect = False
            for child in bone_def.get("children", []):
                _add_bone(child, eb, head)

        for bone in figure_node.get("bones", []):
            _add_bone(bone)

        bpy.ops.object.mode_set(mode="OBJECT")
        return obj


# ---------------------------------------------------------------------------
# Blender Operator
# ---------------------------------------------------------------------------

class FO4_OT_ImportDSF(Operator, ImportHelper):
    """Import a DAZ Studio Format file (.dsf / .duf) into Blender"""
    bl_idname  = "fo4.import_dsf"
    bl_label   = "Import DSF / DUF"
    bl_options = {"REGISTER", "UNDO"}

    filename_ext = ".dsf"
    filter_glob: StringProperty(
        default="*.dsf;*.duf;*.dsf.gz;*.duf.gz",
        options={"HIDDEN"},
    )

    import_skeleton: BoolProperty(
        name="Import Skeleton",
        description="Import bone hierarchy as Blender armature",
        default=True,
    )
    import_materials: BoolProperty(
        name="Import Materials",
        description="Create Principled BSDF materials from DSF material library",
        default=True,
    )
    scale: FloatProperty(
        name="Scale",
        description="Global scale factor (DAZ default unit is centimetres; 0.01 converts to metres)",
        default=0.01,
        min=0.0001,
        max=100.0,
        precision=4,
    )

    def execute(self, context):
        importer = DSFImporter(
            context=context,
            filepath=self.filepath,
            import_skeleton=self.import_skeleton,
            import_materials=self.import_materials,
            scale=self.scale,
        )
        ok = importer.run()

        for msg in importer.messages:
            level = "ERROR" if msg.startswith("ERROR") else "INFO"
            self.report({level}, msg)

        if ok:
            self.report({"INFO"}, f"Imported {os.path.basename(self.filepath)}")
            return {"FINISHED"}
        else:
            self.report({"ERROR"}, "DSF import failed — check console for details")
            return {"CANCELLED"}


# ---------------------------------------------------------------------------
# Menu hook
# ---------------------------------------------------------------------------

def _menu_func_import(self, context):
    self.layout.operator(FO4_OT_ImportDSF.bl_idname, text="DAZ Studio File (.dsf/.duf)")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [FO4_OT_ImportDSF]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
        bpy.utils.register_class(cls)
    bpy.types.TOPBAR_MT_file_import.append(_menu_func_import)


def unregister():
    bpy.types.TOPBAR_MT_file_import.remove(_menu_func_import)
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
