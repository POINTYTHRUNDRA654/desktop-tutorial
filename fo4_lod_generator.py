"""
fo4_lod_generator.py
====================
Automatic LOD mesh generation and high-to-low poly texture baking for FO4.

LOD system
----------
FO4 uses separate NIF files for each LOD level, referenced by the ESP/ESM:
  LOD0 (full detail):   up to 65,535 triangles
  LOD1 (medium):        ~25–35% of LOD0 triangles
  LOD2 (far):           ~10–15% of LOD0 triangles
  LOD3 (very far):      ~3–5%   of LOD0 triangles

NIF naming convention for LODs:
  Data/Meshes/[path]/[name].nif          (LOD0, full quality — used in-game close-up)
  Data/Meshes/[path]/[name]_lod.nif      (LOD1, medium distance)

For carnivorous plants: the LOD meshes typically have the jaws merged/simplified
and leaf bones removed (leaves become vertex-color alpha fade).

Texture baking
--------------
High-to-low poly baking workflow:
  1. High-poly mesh: sculpted detail, many polygons
  2. Low-poly mesh: game-ready, ~10–30k tris
  3. Bake: normal map, AO, curvature from high → low
  4. Result: low-poly mesh looks as detailed as high-poly in-game

Baked maps:
  Normal (tangent-space) → _n.dds
  AO (ambient occlusion) → multiplied onto _d.dds or stored in _s.dds R channel
  Cavity / curvature     → multiplied onto _d.dds for contact shadow detail

FO4 bake settings:
  Normal map: tangent-space, OpenGL convention (for use with UE5 converter)
              OR DirectX convention (native FO4) — depends on source
  Ray distance: 0.05–0.1 FO4 units for most props
  Margin: 4–8 px per 1K texture
"""

from __future__ import annotations

import os
import traceback

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, FloatProperty,
        EnumProperty, IntProperty, FloatVectorProperty,
    )
except ImportError:
    bpy      = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]


# ── LOD Bake Chain ────────────────────────────────────────────────────────────

class LODBakeChain:
    """Hooks into Blender's bake-complete handler to auto-save PNG and run
    NVTT/texconv DDS conversion immediately after a bake finishes.

    Usage::

        LODBakeChain.register_pending_bake(image.name, "/path/to/output.dds", slot='normal')
        # Then call bpy.ops.object.bake(type='NORMAL') — conversion happens automatically.
    """

    _pending_bakes: dict = {}  # {image_name: {'output_dds_path': str, 'slot': str}}

    @classmethod
    def register_pending_bake(cls, image_name: str, output_dds_path: str,
                               slot: str = 'normal') -> None:
        """Register an image for automatic DDS conversion after bake completes."""
        cls._pending_bakes[image_name] = {
            'output_dds_path': output_dds_path,
            'slot': slot,
        }
        print(
            f"[LOD BakeChain] Registered '{image_name}' → {output_dds_path} "
            f"(slot={slot})"
        )

    @classmethod
    def _on_bake_complete(cls, scene, depsgraph=None) -> None:
        """bpy.app.handlers.object_bake_complete callback."""
        if not cls._pending_bakes:
            return

        # Find which image was just baked by checking which image nodes were
        # recently modified.  We check all images in _pending_bakes.
        for image_name, info in list(cls._pending_bakes.items()):
            img = bpy.data.images.get(image_name)
            if img is None:
                cls._pending_bakes.pop(image_name, None)
                continue

            output_dds = info['output_dds_path']
            slot = info.get('slot', 'normal')

            # Save the image as PNG next to the DDS target
            png_path = os.path.splitext(output_dds)[0] + "_BAKED.png"
            try:
                img.filepath_raw = png_path
                img.file_format = 'PNG'
                img.save()
                print(f"[LOD BakeChain] Saved baked image → {png_path}")
            except Exception as exc:
                print(f"[LOD BakeChain] Could not save baked image: {exc}")
                cls._pending_bakes.pop(image_name, None)
                continue

            # Run NVTT/texconv conversion
            try:
                from . import nvtt_helpers
                ok, msg = nvtt_helpers.NVTTHelpers.convert_to_dds(
                    png_path, output_dds, slot=slot
                )
                if ok:
                    print(f"[LOD BakeChain] DDS conversion complete → {output_dds}")
                else:
                    print(f"[LOD BakeChain] DDS conversion failed: {msg}")
            except Exception as exc:
                print(f"[LOD BakeChain] NVTT convert error: {exc}")

            cls._pending_bakes.pop(image_name, None)

    @classmethod
    def register(cls) -> None:
        """Register the bake-complete handler with Blender."""
        if bpy is None:
            return
        # Blender 4.x+ exposes object_bake_complete; fall back gracefully.
        handler_list = getattr(bpy.app.handlers, 'object_bake_complete', None)
        if handler_list is not None:
            if cls._on_bake_complete not in handler_list:
                handler_list.append(cls._on_bake_complete)
            print("[LOD BakeChain] bake-complete handler registered (Blender 4.x+)")
        else:
            # Older Blender: nothing to hook into — DDS conversion must be
            # triggered manually.  We still allow register_pending_bake() so
            # callers can be written uniformly.
            print(
                "[LOD BakeChain] object_bake_complete not available on this "
                "Blender version — DDS conversion will NOT run automatically."
            )

    @classmethod
    def unregister(cls) -> None:
        """Remove the handler on addon disable."""
        if bpy is None:
            return
        handler_list = getattr(bpy.app.handlers, 'object_bake_complete', None)
        if handler_list is not None and cls._on_bake_complete in handler_list:
            handler_list.remove(cls._on_bake_complete)
        cls._pending_bakes.clear()

# FO4 LOD triangle budgets (ratio of LOD0 triangle count)
_LOD_RATIOS = {
    "LOD0": 1.00,
    "LOD1": 0.30,
    "LOD2": 0.12,
    "LOD3": 0.04,
}

# FO4 recommended max triangles per LOD level
_LOD_MAX_TRIS = {
    "LOD0": 65535,
    "LOD1": 8000,
    "LOD2": 3000,
    "LOD3": 500,
}


# ── LOD helpers ───────────────────────────────────────────────────────────────

def generate_lod_mesh(source_obj, ratio: float, lod_name: str) -> "tuple[object, str]":
    """
    Create a decimated copy of *source_obj* as a new object.

    Parameters
    ----------
    source_obj : Source Blender mesh object.
    ratio      : Decimate ratio (0.0–1.0, where 1.0 = original).
    lod_name   : Name for the new LOD object.

    Returns (new_obj, message).
    """
    # Duplicate
    new_mesh = source_obj.data.copy()
    new_obj  = source_obj.copy()
    new_obj.data = new_mesh
    new_obj.name = lod_name
    new_mesh.name = lod_name
    bpy.context.collection.objects.link(new_obj)

    # Apply decimate modifier
    mod = new_obj.modifiers.new("FO4_LOD_Decimate", 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = max(0.001, min(1.0, ratio))
    mod.use_collapse_triangulate = True

    # Apply modifier
    bpy.context.view_layer.objects.active = new_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

    n_tris = sum(len(p.loop_indices) - 2 for p in new_obj.data.polygons)
    msg = (
        f"LOD '{lod_name}': {n_tris} triangles "
        f"({ratio*100:.0f}% of original)"
    )
    return new_obj, msg


# ── Texture baking setup ──────────────────────────────────────────────────────

def _create_bake_image(name: str, width: int, height: int,
                        is_data: bool = True) -> "bpy.types.Image":
    """Create (or reuse) a Blender image for baking."""
    if name in bpy.data.images:
        img = bpy.data.images[name]
        if img.size[0] != width or img.size[1] != height:
            img.scale(width, height)
        return img
    img = bpy.data.images.new(name, width=width, height=height, alpha=False)
    img.colorspace_settings.name = 'Non-Color' if is_data else 'sRGB'
    img.file_format = 'PNG'
    return img


def setup_bake_target_node(mat, img) -> None:
    """Add/select a TEX_IMAGE node in *mat* pointing at *img* for baking."""
    mat.use_nodes = True
    # Find or create the bake target node
    bake_node = mat.node_tree.nodes.get("FO4_BakeTarget")
    if not bake_node:
        bake_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        bake_node.name  = "FO4_BakeTarget"
        bake_node.label = "FO4 Bake Target"
        bake_node.location = (300, -400)
    bake_node.image = img
    # Select it (Blender bakes to the active/selected image node)
    mat.node_tree.nodes.active = bake_node


def prepare_normal_bake(low_obj, high_obj, tex_size: int = 2048,
                         ray_dist: float = 0.05) -> tuple:
    """
    Set up the scene for a high-to-low normal map bake.

    Selects high_obj + low_obj, configures Cycles bake settings.
    Returns (bake_image, message).

    The caller must then call bpy.ops.object.bake(type='NORMAL') to run it.
    """
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.bake_type = 'NORMAL'
    bpy.context.scene.render.bake.use_selected_to_active = True
    bpy.context.scene.render.bake.use_cage = True
    bpy.context.scene.render.bake.cage_extrusion = ray_dist
    bpy.context.scene.render.bake.normal_space = 'TANGENT'
    bpy.context.scene.render.bake.margin = max(4, tex_size // 256)

    img_name = f"{low_obj.name}_n_BAKED"
    bake_img = _create_bake_image(img_name, tex_size, tex_size, is_data=True)

    # Set bake target on every material of the low-poly
    for slot in low_obj.material_slots:
        if slot.material:
            setup_bake_target_node(slot.material, bake_img)

    # Select: high (active source), low (selected target)
    bpy.ops.object.select_all(action='DESELECT')
    high_obj.select_set(True)
    low_obj.select_set(True)
    bpy.context.view_layer.objects.active = low_obj  # bake TARGET = active

    # Register automatic DDS conversion for when the bake finishes
    output_dds_path = os.path.splitext(bake_img.filepath_raw)[0] + ".dds" \
        if bake_img.filepath_raw else os.path.join(
            os.path.dirname(bpy.data.filepath) if bpy.data.filepath else "",
            img_name + ".dds",
        )
    LODBakeChain.register_pending_bake(img_name, output_dds_path, slot='normal')

    return bake_img, (
        f"Normal bake ready: {img_name} ({tex_size}×{tex_size}px). "
        f"Ray distance: {ray_dist}. "
        "Bake registered — DDS conversion will run automatically on completion."
    )


def prepare_ao_bake(low_obj, tex_size: int = 2048) -> tuple:
    """Set up scene for ambient occlusion bake on low_obj."""
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.bake_type = 'AO'
    bpy.context.scene.render.bake.use_selected_to_active = False
    bpy.context.scene.render.bake.margin = max(4, tex_size // 256)

    img_name = f"{low_obj.name}_ao_BAKED"
    bake_img = _create_bake_image(img_name, tex_size, tex_size, is_data=True)

    for slot in low_obj.material_slots:
        if slot.material:
            setup_bake_target_node(slot.material, bake_img)

    bpy.ops.object.select_all(action='DESELECT')
    low_obj.select_set(True)
    bpy.context.view_layer.objects.active = low_obj

    # Register automatic DDS conversion for when the bake finishes
    output_dds_path = os.path.join(
        os.path.dirname(bpy.data.filepath) if bpy.data.filepath else "",
        img_name + ".dds",
    )
    LODBakeChain.register_pending_bake(img_name, output_dds_path, slot='unknown')

    return bake_img, (
        f"AO bake ready: {img_name} ({tex_size}×{tex_size}px). "
        "Bake registered — DDS conversion will run automatically on completion."
    )


# ══════════════════════════════════════════════════════════════════════════════
# Operators
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_GenerateLODs(Operator):
    """
    Auto-generate FO4 LOD meshes from the active object.

    Creates LOD1, LOD2, and LOD3 copies using Blender's Decimate modifier
    at FO4-correct polygon ratios, then exports each as a separate NIF to
    your mod staging folder.

    LOD objects are placed in a 'FO4_LODs' collection for easy management.
    """
    bl_idname  = "fo4.generate_lods"
    bl_label   = "Generate FO4 LOD Meshes"
    bl_description = (
        "Auto-generate LOD1/2/3 meshes from the active object using "
        "FO4-correct polygon ratios, then export each as a NIF."
    )
    bl_options = {'REGISTER', 'UNDO'}

    mod_folder: StringProperty(
        name="Mod Output Folder", default="", subtype='DIR_PATH',
    )
    mesh_subpath: StringProperty(
        name="Mesh Sub-path",
        description="Path under Data/Meshes/ where NIFs go",
        default="",
    )
    generate_lod1: BoolProperty(name="LOD1 (30%)", default=True)
    generate_lod2: BoolProperty(name="LOD2 (12%)", default=True)
    generate_lod3: BoolProperty(name="LOD3 (4%)",  default=True)
    export_nifs: BoolProperty(
        name="Export NIFs",
        description="Export each LOD as a separate NIF to mod folder",
        default=True,
    )
    lod1_ratio: FloatProperty(name="LOD1 Ratio", default=0.30, min=0.05, max=0.95)
    lod2_ratio: FloatProperty(name="LOD2 Ratio", default=0.12, min=0.01, max=0.50)
    lod3_ratio: FloatProperty(name="LOD3 Ratio", default=0.04, min=0.005, max=0.20)
    collision_from_lod3: BoolProperty(
        name="Auto-Collision from LOD3",
        description=(
            "Use the LOD3 mesh (~4% polys) as the source for the UCX_ convex "
            "collision hull instead of decimating the original again. "
            "LOD3 is already the right density for physics — no extra work needed."
        ),
        default=True,
    )

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
            # Auto-adjust ratios so none exceed FO4 max per level
            if n_tris > 0:
                self.lod1_ratio = min(0.30, _LOD_MAX_TRIS["LOD1"] / n_tris)
                self.lod2_ratio = min(0.12, _LOD_MAX_TRIS["LOD2"] / n_tris)
                self.lod3_ratio = min(0.04, _LOD_MAX_TRIS["LOD3"] / n_tris)
        return context.window_manager.invoke_props_dialog(self, width=440)

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        if obj and obj.type == 'MESH':
            n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
            layout.label(text=f"Source: {obj.name} (~{n_tris:,} triangles)")
        layout.separator()
        row = layout.row()
        row.prop(self, "generate_lod1")
        row.prop(self, "lod1_ratio", text="Ratio")
        row = layout.row()
        row.prop(self, "generate_lod2")
        row.prop(self, "lod2_ratio", text="Ratio")
        row = layout.row()
        row.prop(self, "generate_lod3")
        row.prop(self, "lod3_ratio", text="Ratio")
        layout.separator()
        box = layout.box()
        box.prop(self, "collision_from_lod3")
        if self.collision_from_lod3:
            box.label(
                text="UCX_ collision built from LOD3 — no extra decimation step.",
                icon='CHECKMARK',
            )
        layout.separator()
        if self.export_nifs:
            layout.prop(self, "mod_folder")
            layout.prop(self, "mesh_subpath")
        layout.prop(self, "export_nifs")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        # Get/create LOD collection
        lod_col = bpy.data.collections.get("FO4_LODs")
        if not lod_col:
            lod_col = bpy.data.collections.new("FO4_LODs")
            bpy.context.scene.collection.children.link(lod_col)

        steps = []
        lod_objects = []

        lods_to_gen = []
        if self.generate_lod1: lods_to_gen.append(("LOD1", self.lod1_ratio))
        if self.generate_lod2: lods_to_gen.append(("LOD2", self.lod2_ratio))
        if self.generate_lod3: lods_to_gen.append(("LOD3", self.lod3_ratio))

        for lod_key, ratio in lods_to_gen:
            lod_name = f"{obj.name}_{lod_key}"
            # Remove existing LOD with same name
            existing = bpy.data.objects.get(lod_name)
            if existing:
                bpy.data.objects.remove(existing, do_unlink=True)

            try:
                lod_obj, msg = generate_lod_mesh(obj, ratio, lod_name)
                # Move to LOD collection
                for c in list(lod_obj.users_collection):
                    c.objects.unlink(lod_obj)
                lod_col.objects.link(lod_obj)
                # Tag with metadata
                lod_obj["fo4_lod_level"] = lod_key
                lod_obj["fo4_lod_source"] = obj.name
                lod_objects.append(lod_obj)
                steps.append(msg)
            except Exception as e:
                self.report({'WARNING'}, f"LOD generation failed for {lod_key}: {e}")

        # ── Collision from LOD3 ───────────────────────────────────────────────
        # Use the already-generated LOD3 mesh as the convex hull source.
        # This avoids a second decimation pass — LOD3 is already ~4% of the
        # original poly count, which is ideal for a physics collision shape.
        if self.collision_from_lod3 and self.generate_lod3:
            lod3_obj = next(
                (o for o in lod_objects if o.get("fo4_lod_level") == "LOD3"), None
            )
            if lod3_obj:
                try:
                    ucx_name = f"UCX_{obj.name}"
                    # Remove existing UCX if present
                    existing_ucx = bpy.data.objects.get(ucx_name)
                    if existing_ucx:
                        bpy.data.objects.remove(existing_ucx, do_unlink=True)

                    # Duplicate LOD3 as the collision source
                    import bmesh as _bm
                    ucx_mesh = lod3_obj.data.copy()
                    ucx_obj  = lod3_obj.copy()
                    ucx_obj.data = ucx_mesh
                    ucx_obj.name = ucx_name
                    ucx_mesh.name = ucx_name
                    bpy.context.collection.objects.link(ucx_obj)

                    # Build a clean convex hull from LOD3 vertices
                    bm = _bm.new()
                    bm.from_mesh(ucx_mesh)
                    result = _bm.ops.convex_hull(bm, input=bm.verts)
                    # Keep only outer hull geometry
                    interior = result.get("geom_interior", [])
                    unused   = result.get("geom_unused", [])
                    _bm.ops.delete(
                        bm,
                        geom=[g for g in interior + unused
                              if isinstance(g, _bm.types.BMVert)],
                        context='VERTS',
                    )
                    bm.to_mesh(ucx_mesh)
                    ucx_mesh.update()
                    bm.free()

                    # Tag as FO4 collision
                    ucx_obj["fo4_collision"]      = True
                    ucx_obj["fo4_collision_source"] = "LOD3"
                    ucx_obj["fo4_lod_source"]     = obj.name
                    ucx_obj.display_type          = 'WIRE'
                    ucx_obj.hide_render           = True
                    ucx_obj.parent                = obj

                    # Rigid body for Blender physics preview
                    try:
                        context.view_layer.objects.active = ucx_obj
                        ucx_obj.select_set(True)
                        bpy.ops.rigidbody.object_add()
                        ucx_obj.rigid_body.type = 'PASSIVE'
                        ucx_obj.rigid_body.collision_shape = 'CONVEX_HULL'
                    except Exception:
                        pass

                    n_verts = len(ucx_mesh.vertices)
                    steps.append(
                        f"✓ UCX_{obj.name}: convex hull from LOD3 "
                        f"({n_verts} vertices) — no extra decimation needed"
                    )
                except Exception as e:
                    self.report({'WARNING'}, f"Collision from LOD3 failed: {e}")
            else:
                self.report({'WARNING'},
                    "LOD3 not generated — enable 'LOD3 (4%)' to use it as collision source.")

        # Export NIFs
        if self.export_nifs and self.mod_folder and lod_objects:
            try:
                from . import export_helpers
                for lod_obj in lod_objects:
                    lod_key = lod_obj.get("fo4_lod_level", "LOD")
                    suffix  = f"_lod{lod_key[-1]}"   # _lod1, _lod2, _lod3
                    nif_name = f"{obj.name}{suffix}.nif"
                    sub  = self.mesh_subpath.strip("/\\")
                    nif_path = os.path.normpath(os.path.join(
                        self.mod_folder, "Data", "Meshes",
                        sub, nif_name
                    ) if sub else os.path.join(
                        self.mod_folder, "Data", "Meshes", nif_name
                    ))
                    os.makedirs(os.path.dirname(nif_path), exist_ok=True)

                    context.view_layer.objects.active = lod_obj
                    bpy.ops.object.select_all(action='DESELECT')
                    lod_obj.select_set(True)

                    result = export_helpers.ExportHelpers.export_mesh_to_nif(
                        lod_obj, nif_path
                    )
                    ok = result[0] if isinstance(result, tuple) else \
                         result in ({'FINISHED'}, 'FINISHED')
                    if ok:
                        steps.append(f"Exported: {os.path.basename(nif_path)}")
                    else:
                        steps.append(f"⚠ Export failed for {lod_obj.name}")
            except Exception as e:
                self.report({'WARNING'}, f"NIF export error: {e}")

        for s in steps:
            self.report({'INFO'}, s)
        self.report({'INFO'},
            f"Generated {len(lod_objects)} LOD mesh(es) in 'FO4_LODs' collection.")
        return {'FINISHED'}




class FO4_OT_ExportFullLODChain(Operator):
    """
    Generate and export a full FO4 LOD chain (LOD1/2/3) from the active mesh.

    For each LOD level the operator:
      1. Decimates the active object to the correct ratio.
      2. Exports the result as a NIF alongside the base mesh.
      3. Deletes the temporary LOD object.

    NIF names: ``[original_name]_lod1.nif``, ``_lod2.nif``, ``_lod3.nif``

    Output directory priority:
      1. Custom property ``fo4_export_path`` on the object.
      2. Directory of the current .blend file (``//``).
      3. ``C:/`` as last resort.
    """
    bl_idname  = "fo4.export_full_lod_chain"
    bl_label   = "Export Full LOD Chain (LOD1/2/3)"
    bl_description = (
        "Auto-generate and export LOD1 (30%), LOD2 (12%), and LOD3 (4%) NIF files "
        "for the active object. Temporary LOD meshes are deleted after export."
    )
    bl_options = {'REGISTER', 'UNDO'}

    output_dir: StringProperty(
        name="Output Directory",
        description=(
            "Directory for the exported LOD NIF files. "
            "Leave blank to use the object's 'fo4_export_path' property or "
            "the directory of the current .blend file."
        ),
        default="",
        subtype='DIR_PATH',
    )

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            # Pre-fill from object custom property or blend dir
            ep = obj.get("fo4_export_path", "")
            if ep:
                self.output_dir = bpy.path.abspath(ep)
            else:
                blend_dir = (
                    os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
                )
                self.output_dir = blend_dir or "C:/"
        return context.window_manager.invoke_props_dialog(self, width=460)

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        if obj and obj.type == 'MESH':
            n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
            layout.label(text=f"Source: {obj.name} (~{n_tris:,} triangles)")
        layout.prop(self, "output_dir")
        layout.label(
            text="Exports: _lod1.nif (30%), _lod2.nif (12%), _lod3.nif (4%)",
            icon='INFO',
        )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        # Resolve output directory
        out_dir = (self.output_dir or "").strip()
        if not out_dir:
            ep = obj.get("fo4_export_path", "")
            if ep:
                out_dir = bpy.path.abspath(ep)
            else:
                out_dir = (
                    os.path.dirname(bpy.data.filepath) if bpy.data.filepath else "C:/"
                )
        out_dir = bpy.path.abspath(out_dir) if out_dir.startswith("//") else out_dir
        os.makedirs(out_dir, exist_ok=True)

        lod_specs = [
            ("lod1", _LOD_RATIOS["LOD1"]),
            ("lod2", _LOD_RATIOS["LOD2"]),
            ("lod3", _LOD_RATIOS["LOD3"]),
        ]

        exported_paths = []
        had_error = False

        try:
            from . import export_helpers
        except ImportError:
            export_helpers = None

        for suffix, ratio in lod_specs:
            lod_name = f"{obj.name}_{suffix}_TEMP"
            lod_obj  = None
            try:
                lod_obj, lod_msg = generate_lod_mesh(obj, ratio, lod_name)
                self.report({'INFO'}, lod_msg)

                nif_filename = f"{obj.name}_{suffix}.nif"
                nif_path     = os.path.join(out_dir, nif_filename)

                # Select only the LOD object for export
                bpy.ops.object.select_all(action='DESELECT')
                context.view_layer.objects.active = lod_obj
                lod_obj.select_set(True)

                export_ok = False
                if export_helpers is not None:
                    try:
                        result = export_helpers.ExportHelpers.export_mesh_to_nif(
                            lod_obj, nif_path
                        )
                        if isinstance(result, tuple):
                            export_ok = result[0]
                        else:
                            export_ok = result in ({'FINISHED'}, 'FINISHED')
                    except Exception as exp_err:
                        self.report(
                            {'WARNING'},
                            f"export_helpers failed for {suffix}: {exp_err}",
                        )

                if export_ok:
                    exported_paths.append(nif_path)
                    self.report({'INFO'}, f"Exported: {nif_filename}")
                else:
                    self.report(
                        {'WARNING'},
                        f"NIF export failed or unavailable for {suffix} "
                        f"({nif_filename}) — LOD mesh still deleted.",
                    )
                    had_error = True

            except Exception as e:
                self.report({'WARNING'}, f"LOD {suffix} error: {e}")
                traceback.print_exc()
                had_error = True
            finally:
                # Always clean up the temporary LOD object
                if lod_obj is not None:
                    try:
                        mesh_data = lod_obj.data
                        bpy.data.objects.remove(lod_obj, do_unlink=True)
                        bpy.data.meshes.remove(mesh_data)
                    except Exception:
                        pass

        # Restore original selection
        bpy.ops.object.select_all(action='DESELECT')
        context.view_layer.objects.active = obj
        obj.select_set(True)

        if exported_paths:
            self.report(
                {'INFO'},
                f"LOD chain exported: {len(exported_paths)} NIF(s) → {out_dir}",
            )
        if not exported_paths:
            self.report({'ERROR'}, "No LOD NIFs were exported.")
            return {'CANCELLED'}
        return {'FINISHED'} if not had_error else {'FINISHED'}


class FO4_OT_SetupNormalBake(Operator):
    """
    Set up the scene for high-to-low poly normal map baking.

    Select your high-poly mesh and low-poly mesh, then run this operator.
    It configures Cycles bake settings and creates the target image.
    After setup, go to Render Properties → Bake → click Bake.
    """
    bl_idname  = "fo4.setup_normal_bake"
    bl_label   = "Setup Normal Map Bake (High → Low)"
    bl_description = (
        "Configure the scene for baking a normal map from a high-poly to "
        "the active low-poly mesh. Select high-poly first, Shift-select low-poly."
    )
    bl_options = {'REGISTER', 'UNDO'}

    tex_size: EnumProperty(
        name="Texture Resolution",
        items=[
            ('512',  "512×512",   "Low — LOD meshes"),
            ('1024', "1024×1024", "Medium — small props"),
            ('2048', "2048×2048", "High — standard FO4 quality"),
            ('4096', "4096×4096", "Ultra — hero props"),
        ],
        default='2048',
    )
    ray_distance: FloatProperty(
        name="Ray Distance (BU)",
        description="Distance the bake ray casts from the low-poly surface.",
        default=0.05, min=0.001, max=1.0,
    )

    def execute(self, context):
        selected = [o for o in context.selected_objects if o.type == 'MESH']
        active   = context.active_object
        if len(selected) < 2 or not active or active.type != 'MESH':
            self.report({'ERROR'},
                "Select high-poly first, then Shift-select low-poly (active).")
            return {'CANCELLED'}
        high_obj = next((o for o in selected if o != active), None)
        if not high_obj:
            self.report({'ERROR'}, "Could not identify high-poly object.")
            return {'CANCELLED'}
        try:
            _, msg = prepare_normal_bake(
                active, high_obj,
                tex_size=int(self.tex_size),
                ray_dist=self.ray_distance,
            )
            self.report({'INFO'}, msg)
            self.report({'INFO'},
                "Go to Render Properties → Bake → Bake Type: Normal → Bake")
        except Exception as e:
            self.report({'ERROR'}, f"Bake setup failed: {e}")
            return {'CANCELLED'}
        return {'FINISHED'}


class FO4_OT_SetupAOBake(Operator):
    """Set up AO bake on the active mesh."""
    bl_idname  = "fo4.setup_ao_bake"
    bl_label   = "Setup AO Bake"
    bl_description = "Configure the scene for ambient occlusion baking on the active mesh."
    bl_options = {'REGISTER', 'UNDO'}

    tex_size: EnumProperty(
        name="Texture Resolution",
        items=[
            ('512',  "512×512",   ""),
            ('1024', "1024×1024", ""),
            ('2048', "2048×2048", "Standard"),
            ('4096', "4096×4096", "Ultra"),
        ],
        default='2048',
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}
        try:
            _, msg = prepare_ao_bake(obj, int(self.tex_size))
            self.report({'INFO'}, msg)
        except Exception as e:
            self.report({'ERROR'}, f"AO bake setup failed: {e}")
            return {'CANCELLED'}
        return {'FINISHED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_GenerateLODs,
    FO4_OT_ExportFullLODChain,
    FO4_OT_SetupNormalBake,
    FO4_OT_SetupAOBake,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[LOD Gen] Could not register {cls.__name__}: {e}")
    LODBakeChain.register()
    print("[LOD Gen] FO4 LOD generator + texture baker registered.")


def unregister():
    if bpy is None:
        return
    LODBakeChain.unregister()
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
