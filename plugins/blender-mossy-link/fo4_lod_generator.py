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

# FO4 LOD triangle budgets (ratio of LOD0 triangle count)
_LOD_RATIOS = {
    "LOD0": 1.00,
    "LOD1": 0.30,
    "LOD2": 0.12,
    "LOD3": 0.08,
}

# FO4 recommended max triangles per LOD level
_LOD_MAX_TRIS = {
    "LOD0": 65535,
    "LOD1": 8000,
    "LOD2": 3000,
    "LOD3": 1000,
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

    # Explicitly carry material slots from source (handles both DATA- and
    # OBJECT-linked slots; ensures PyNifly-imported textures travel with the LOD)
    new_obj.data.materials.clear()
    for slot in source_obj.material_slots:
        new_obj.data.materials.append(slot.material)

    # Strip shape keys before decimating — Blender refuses to apply any
    # modifier to a mesh that has shape keys (RuntimeError).  LOD copies never
    # need shape keys (they are distance-based mesh replacements, not morphs).
    bpy.context.view_layer.objects.active = new_obj
    new_obj.select_set(True)
    if new_obj.data.shape_keys:
        try:
            bpy.ops.object.shape_key_remove(all=True)
        except Exception:
            pass

    # Apply decimate modifier
    mod = new_obj.modifiers.new("FO4_LOD_Decimate", 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = max(0.001, min(1.0, ratio))
    # use_collapse_triangulate=True forces triangulation before edge collapse,
    # which destroys quad flow on organic/plant meshes — leave it False.
    mod.use_collapse_triangulate = False
    mod.use_symmetry = False

    # Apply modifier
    bpy.context.view_layer.objects.active = new_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

    # Decimate's COLLAPSE algorithm can strand vertices whose surrounding
    # faces all collapsed away without cleaning up the vertex itself --
    # worse at aggressive ratios (low LOD levels). Confirmed on a real asset:
    # loose-vertex count climbed with each more-aggressive LOD, visible as
    # holes/gaps in the mesh and propagating into any collision hull built
    # from it. Strip them here so every consumer of this LOD gets clean data.
    import bmesh as _bmesh
    _loose_bm = _bmesh.new()
    _loose_bm.from_mesh(new_obj.data)
    _loose_verts = [v for v in _loose_bm.verts if not v.link_faces]
    if _loose_verts:
        _bmesh.ops.delete(_loose_bm, geom=_loose_verts, context='VERTS')
        _loose_bm.to_mesh(new_obj.data)
        new_obj.data.update()
    _loose_bm.free()

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

    return bake_img, (
        f"Normal bake ready: {img_name} ({tex_size}×{tex_size}px). "
        f"Ray distance: {ray_dist}. "
        "Click 'Bake' in Render Properties, then save the image."
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

    return bake_img, (
        f"AO bake ready: {img_name} ({tex_size}×{tex_size}px). "
        "Click 'Bake' in Render Properties → Ambient Occlusion."
    )


# ── LOD texture downscaling (match real FO4's smaller LOD-specific textures) ──
# Real FO4 assets use dedicated, much smaller textures for their real-mesh LOD
# levels — e.g. vanilla BlastedForestBurntTreeUpright01's LOD1 references a
# small shared 'LOD/Trees/BlastedForestTrunksLOD_d.dds' atlas, not its full
# resolution hero texture, and only the farthest billboard level gets its own
# separate (also small) texture. Until this was added, every LOD generated by
# this add-on only decimated geometry and left the LOD pointing at the exact
# same full-resolution material as the source — the in-game LOD saved
# triangle/vertex cost but NONE of the texture memory/bandwidth cost LODs are
# also meant to save.

def _nearest_pow2(n: int) -> int:
    """Round n to the nearest power of two (minimum 64 — FO4's smallest
    common texture size). FO4/DDS textures are conventionally power-of-two."""
    n = max(64, int(n))
    lower = 1 << (n.bit_length() - 1)
    upper = lower << 1
    return upper if (n - lower) > (upper - n) else lower


def create_lod_textures(lod_objects: list, scale_factor: float = 0.25,
                         out_subdir: str = "LOD") -> tuple:
    """Give every object in *lod_objects* a shared, downscaled copy of the
    source's textures instead of the full-resolution original.

    Every object in *lod_objects* gets the SAME downscaled image per unique
    source texture — matching real FO4 LOD atlases, which are shared across
    every real-mesh LOD level of an asset (only the farthest billboard level
    gets its own separate texture, handled separately by
    :func:`generate_billboard_lod`). The first LOD object whose texture node
    references a given source file creates the downscaled image/file; every
    later object referencing that same source file reuses it, so this never
    saves more than one new file per original texture no matter how many LOD
    levels are passed in.

    Each object's material is made single-user first, so downscaling a LOD's
    textures never touches the source mesh's own (still full-resolution)
    material — ``duplicate()``/``generate_lod_mesh`` share the source's
    material by default until something makes it single-user.

    Saved as PNG (not DDS) deliberately: export_textures_for_object /
    write_bgsm's existing texture-export pipeline already converts any
    non-DDS source to DDS via texconv/NVTT at actual export time, so this
    does not need its own separate DDS-conversion path or texconv
    configuration to be useful immediately after generation.

    Returns (bool success, str message).
    """
    if not lod_objects:
        return False, "No LOD objects provided"

    shared_cache: dict = {}
    processed = 0
    skipped = []

    for lod_obj in lod_objects:
        if lod_obj is None or lod_obj.type != 'MESH' or not lod_obj.data.materials:
            continue
        for slot in lod_obj.material_slots:
            mat = slot.material
            if mat is None or not getattr(mat, "use_nodes", False):
                continue
            if mat.users > 1:
                mat = mat.copy()
                slot.material = mat

            for node in mat.node_tree.nodes:
                if node.type != 'TEX_IMAGE' or not node.image:
                    continue
                img = node.image
                try:
                    src_path = bpy.path.abspath(img.filepath) if img.filepath else ""
                except Exception:
                    src_path = ""
                if not src_path or not os.path.isfile(src_path):
                    skipped.append(f"'{node.name}' on '{lod_obj.name}': no source file on disk")
                    continue

                key = os.path.normcase(os.path.normpath(src_path))
                if key in shared_cache:
                    node.image = shared_cache[key]
                    processed += 1
                    continue

                new_w = _nearest_pow2(img.size[0] * scale_factor)
                new_h = _nearest_pow2(img.size[1] * scale_factor)
                if new_w >= img.size[0] and new_h >= img.size[1]:
                    shared_cache[key] = img  # already small enough — share as-is
                    node.image = img
                    processed += 1
                    continue

                stem = os.path.splitext(os.path.basename(src_path))[0]
                new_img = img.copy()
                new_img.name = f"{stem}_LOD"
                new_img.scale(new_w, new_h)

                out_dir = os.path.join(os.path.dirname(src_path), out_subdir)
                os.makedirs(out_dir, exist_ok=True)
                out_path = os.path.join(out_dir, f"{stem}.png")
                new_img.filepath_raw = out_path
                new_img.file_format = 'PNG'
                new_img.save()

                shared_cache[key] = new_img
                node.image = new_img
                processed += 1

    if processed == 0:
        msg = "No texture nodes with a source file found to downscale"
        if skipped:
            msg += " (" + "; ".join(skipped) + ")"
        return False, msg
    return True, (
        f"{len(shared_cache)} shared LOD texture(s) created, "
        f"applied to {processed} texture slot(s) across {len(lod_objects)} LOD object(s)"
    )


# ── Billboard LOD (the real FO4 farthest LOD level) ──────────────────────────

def generate_billboard_lod(source_obj, billboard_name: str, tex_size: int = 512) -> tuple:
    """Generate a baked-billboard LOD for *source_obj*.

    Real FO4 assets don't just keep decimating the organic mesh down for
    their farthest LOD level — verified against a real reference asset
    (``BlastedForestBurntTreeUpright01`` in the vanilla/DLC library): its
    last LOD level is 8 verts / 4 tris (two independent perpendicular quads —
    a classic "cross" billboard) using its own dedicated billboard texture,
    not the shared trunk atlas the closer LOD levels use.

    This renders a single front-view (looking down +Y, matching this addon's
    existing "front faces -Y" convention used elsewhere for facing-direction
    checks) orthographic capture of *source_obj* with a transparent
    background, builds that same 8-vert/4-tri cross shape sized to the
    object's bounding box, and applies the render to both quads via an
    alpha-clip material.

    Never modifies *source_obj* itself, and restores the scene's prior active
    camera / render engine / resolution / film_transparent afterward so this
    doesn't leave the user's scene in a different state.

    Returns (new_obj, message).
    """
    import os
    import tempfile
    from mathutils import Vector

    scene = bpy.context.scene

    corners = [source_obj.matrix_world @ Vector(c) for c in source_obj.bound_box]
    min_x = min(c.x for c in corners); max_x = max(c.x for c in corners)
    min_y = min(c.y for c in corners); max_y = max(c.y for c in corners)
    min_z = min(c.z for c in corners); max_z = max(c.z for c in corners)
    width = max(max_x - min_x, max_y - min_y, 1e-4)
    height = max(max_z - min_z, 1e-4)
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    cam_distance = max(width, height) * 2.0 + 1.0

    # Save scene state so this is fully non-destructive to the user's setup.
    _prev_camera = scene.camera
    _prev_engine = scene.render.engine
    _prev_res_x = scene.render.resolution_x
    _prev_res_y = scene.render.resolution_y
    _prev_film_transparent = scene.render.film_transparent
    _prev_filepath = scene.render.filepath

    new_obj = None
    cam_obj = None
    try:
        cam_data = bpy.data.cameras.new(f"{billboard_name}_BakeCam")
        cam_data.type = 'ORTHO'
        cam_data.ortho_scale = max(width, height) * 1.05
        cam_obj = bpy.data.objects.new(f"{billboard_name}_BakeCam", cam_data)
        scene.collection.objects.link(cam_obj)
        cam_obj.location = (center_x, min_y - cam_distance, (min_z + max_z) * 0.5)
        # Look down +Y ("front", matching this addon's -Y-facing-front convention).
        cam_obj.rotation_euler = (1.5707963267948966, 0.0, 0.0)
        scene.camera = cam_obj

        for _engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES'):
            try:
                scene.render.engine = _engine
                break
            except Exception:
                continue
        scene.render.film_transparent = True
        scene.render.resolution_x = tex_size
        scene.render.resolution_y = tex_size

        out_path = os.path.join(tempfile.gettempdir(), f"{billboard_name}_billboard.png")
        scene.render.filepath = out_path
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        bpy.ops.render.render(write_still=True)

        img = bpy.data.images.load(out_path, check_existing=False)
        img.name = f"{billboard_name}_d"

        # Cross billboard: two independent perpendicular quads (4 verts + 2
        # tris each = 8 verts / 4 tris total) -- matching the verified real
        # asset exactly, rather than a single flat card.
        half_w = width * 0.5
        mesh = bpy.data.meshes.new(billboard_name)
        verts = [
            (-half_w, 0.0, 0.0), (half_w, 0.0, 0.0), (half_w, 0.0, height), (-half_w, 0.0, height),
            (0.0, -half_w, 0.0), (0.0, half_w, 0.0), (0.0, half_w, height), (0.0, -half_w, height),
        ]
        faces = [(0, 1, 2, 3), (4, 5, 6, 7)]
        mesh.from_pydata(verts, [], faces)
        mesh.update()

        uv_layer = mesh.uv_layers.new(name="UVMap")
        quad_uv = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
        for poly in mesh.polygons:
            for corner, loop_index in enumerate(poly.loop_indices):
                uv_layer.data[loop_index].uv = quad_uv[corner]

        new_obj = bpy.data.objects.new(billboard_name, mesh)
        scene.collection.objects.link(new_obj)
        new_obj.location = (center_x, center_y, min_z)

        mat = bpy.data.materials.new(f"{billboard_name}_Mat")
        mat.use_nodes = True
        mat.blend_method = 'CLIP'
        try:
            mat.shadow_method = 'CLIP'
        except AttributeError:
            pass  # removed in some Blender versions
        mat.use_backface_culling = False
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.name = "Diffuse"
        tex_node.label = "Diffuse"
        tex_node.image = img
        if bsdf:
            links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
            alpha_input = bsdf.inputs.get('Alpha')
            if alpha_input:
                links.new(tex_node.outputs['Alpha'], alpha_input)
        new_obj.data.materials.append(mat)

        # fo4_mesh_type is a real RNA EnumProperty (bpy.types.Object.
        # fo4_mesh_type = EnumProperty(...)) -- obj["fo4_mesh_type"] = ...
        # (bracket/custom-property assignment) silently creates a SEPARATE,
        # unrelated custom property with the same name and never actually
        # touches the real RNA value the export pipeline reads via
        # getattr(obj, "fo4_mesh_type"). Must use attribute assignment.
        # Inherit the source's real category (e.g. 'VEGETATION') rather than
        # the inert 'LOD' tag nothing downstream checks for, matching the
        # fix in advanced_mesh_helpers.generate_lod_chain.
        try:
            new_obj.fo4_mesh_type = getattr(source_obj, 'fo4_mesh_type', '') or new_obj.fo4_mesh_type
        except Exception:
            pass
        new_obj["fo4_billboard"] = True
        new_obj["PYN_GAME"] = "FO4"

        msg = (
            f"Billboard '{billboard_name}' generated: "
            f"{len(mesh.vertices)} verts / {len(mesh.polygons)*2} tris, "
            f"{tex_size}x{tex_size}px texture."
        )
        return new_obj, msg
    finally:
        if cam_obj is not None:
            bpy.data.objects.remove(cam_obj, do_unlink=True)
        scene.camera = _prev_camera
        scene.render.engine = _prev_engine
        scene.render.resolution_x = _prev_res_x
        scene.render.resolution_y = _prev_res_y
        scene.render.film_transparent = _prev_film_transparent
        scene.render.filepath = _prev_filepath


# ══════════════════════════════════════════════════════════════════════════════
# Operators
# ══════════════════════════════════════════════════════════════════════════════


# ── Mesh type constants ───────────────────────────────────────────────────────

# Mesh classes that use FO4 procedural wind via vertex groups (no armature).
# NOTE: Trees and large shrubs are VEGETATION class but still need collision in
# their NIFs — a tree you can walk through is not a tree.  Ground-cover (grass,
# thin mushrooms) has no NIF collision; that is controlled by fo4_collision_type.
_VEGETATION_CLASSES = frozenset({'VEGETATION', 'FLORA'})

# Mesh classes that are armature-skinned.  LOD decimation of skinned meshes
# should be handled inside PyNifly (which can re-bind LOD vertices to bones).
# Our Decimate-based approach strips the skin bind, so we warn and skip NIF
# export for these types.
_SKINNED_CLASSES = frozenset({'CHARACTER', 'CREATURE', 'SKINNED', 'ARMOR'})

# fo4_collision_type values that mean "no physics collision in the NIF".
# GRASS and MUSHROOM are thin ground-cover that the engine skips for physics.
# The collision volume for these is authored inside the CK record, not the NIF.
# Trees and large custom vegetation set fo4_collision_type to 'VEGETATION' or
# leave it as 'DEFAULT' and still need a UCX_ hull in their LOD NIF.
_NO_COLLISION_MESH_TYPES = frozenset({'GRASS', 'MUSHROOM', 'NONE'})


class FO4_OT_GenerateLODs(Operator):
    """
    Auto-generate FO4 LOD meshes from the active object.

    Creates LOD1, LOD2, and LOD3 copies using Blender's Decimate modifier
    at FO4-correct polygon ratios, then exports each as a separate NIF to
    your mod staging folder.

    Mesh-type-aware behaviour
    -------------------------
    * STATIC / LOD / ARCHITECTURE / WEAPON / FURNITURE
        Standard decimation + optional UCX_ convex-hull collision from LOD3.
    * VEGETATION / FLORA
        Decimation only.  FO4 vegetation uses Wind vertex-group weights for
        procedural in-engine wind — no armature is needed or exported.  Physics
        collision for foliage is authored in the CK ESP record, not in the NIF,
        so the "collision from LOD3" step is skipped automatically.
    * CHARACTER / CREATURE / SKINNED / ARMOR
        Decimation is performed for preview, but NIF export is skipped with a
        warning.  Skinned-mesh LODs must be re-bound to the skeleton and are
        best generated inside PyNifly (BadDogSkyrim) directly.

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
    generate_lod3: BoolProperty(name="LOD3 (8%)",  default=True)
    export_nifs: BoolProperty(
        name="Export NIFs",
        description="Export each LOD as a separate NIF to mod folder",
        default=True,
    )
    lod1_ratio: FloatProperty(name="LOD1 Ratio", default=0.30, min=0.05, max=0.95)
    lod2_ratio: FloatProperty(name="LOD2 Ratio", default=0.12, min=0.01, max=0.50)
    lod3_ratio: FloatProperty(name="LOD3 Ratio", default=0.08, min=0.005, max=0.20)
    generate_billboard: BoolProperty(
        name="Generate Billboard (LOD4, farthest)",
        description=(
            "Bake a cross-billboard (matches real FO4 reference assets' "
            "farthest LOD level) and export it as its own NIF alongside "
            "LOD1-3. The temporary billboard object is removed from the "
            "scene right after a successful export -- it's a bake result, "
            "not something to keep cluttering the scene."
        ),
        default=True,
    )
    billboard_tex_size: IntProperty(
        name="Billboard Texture Size",
        default=512, min=64, max=2048,
    )
    collision_from_lod3: BoolProperty(
        name="Auto-Build Collision from LOD3 (fallback)",
        description=(
            "Only used when the source mesh has no collision yet. If you've "
            "already made real collision with Generate Collision / Custom "
            "Collision (Exact Mesh), this is ignored and that collision is "
            "reused for every LOD instead -- there should be one place to "
            "make collision, not a second one hidden in the LOD generator. "
            "Enable this only as a convenience fallback for a mesh you "
            "haven't set up collision for yet: builds a UCX_ convex hull "
            "from the LOD3 mesh (~4% polys, already the right density for "
            "physics) instead of decimating the original again."
        ),
        default=False,
    )

    # Hidden property: detected FO4 class of the source mesh.
    # Set in invoke() so draw() and execute() can use it without re-detecting.
    # No leading underscore — Blender's RNA system requires clean identifier names.
    detected_source_class: StringProperty(
        name="Detected Source Class",
        default="STATIC",
        options={'HIDDEN'},
    )

    @staticmethod
    def _detect_source_class(obj) -> str:
        """Detect the FO4 object class for *obj*, using export_helpers when available."""
        try:
            from . import export_helpers
            return export_helpers.ExportHelpers.detect_fo4_object_class(obj)
        except Exception:
            pass
        # Fallback: honour explicit property, then guess from vertex groups / name
        forced = obj.get("fo4_object_type", "")
        if forced:
            return forced.upper()
        if obj.vertex_groups:
            wind_names = {'Wind', 'wind', 'WIND', 'WindWeight', 'windweight',
                          'WINDWEIGHT', 'WindStiff', 'windstiff'}
            if all(vg.name in wind_names for vg in obj.vertex_groups):
                return 'VEGETATION'
        if obj.parent and obj.parent.type == 'ARMATURE':
            bones = [b.name for b in obj.parent.data.bones]
            return 'CHARACTER' if any(b.startswith("NPC ") for b in bones) else 'CREATURE'
        return 'STATIC'

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            src_class = FO4_OT_GenerateLODs._detect_source_class(obj)
            self.detected_source_class = src_class

            n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
            # Auto-adjust ratios so none exceed FO4 max per level
            if n_tris > 0:
                self.lod1_ratio = min(0.30, _LOD_MAX_TRIS["LOD1"] / n_tris)
                self.lod2_ratio = min(0.12, _LOD_MAX_TRIS["LOD2"] / n_tris)
                self.lod3_ratio = min(0.08, _LOD_MAX_TRIS["LOD3"] / n_tris)

            # Auto-disable collision only for ground-cover types (GRASS, MUSHROOM).
            # Trees and large custom vegetation (VEGETATION/FLORA) still need a
            # UCX_ convex hull in the NIF — check fo4_collision_type, not just class.
            # fo4_collision_type is a real RNA EnumProperty set via attribute
            # assignment -- obj.get() only sees custom ID properties and
            # always silently returned "DEFAULT" here, so this check never
            # actually fired for GRASS/MUSHROOM-tagged objects.
            ctype = getattr(obj, "fo4_collision_type", "DEFAULT")
            if ctype in _NO_COLLISION_MESH_TYPES:
                self.collision_from_lod3 = False

        return context.window_manager.invoke_props_dialog(self, width=460)

    def draw(self, context):
        layout = self.layout
        obj    = context.active_object
        src    = self.detected_source_class

        # ── Source info ───────────────────────────────────────────────────────
        if obj and obj.type == 'MESH':
            n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
            row = layout.row(align=True)
            row.label(text=f"Source: {obj.name}  (~{n_tris:,} triangles)")
            icon = (
                'OUTLINER_OB_FORCE_FIELD' if src in _VEGETATION_CLASSES else
                'ARMATURE_DATA'           if src in _SKINNED_CLASSES      else
                'MESH_DATA'
            )
            row.label(text=f"Type: {src}", icon=icon)

        # ── Skinned mesh warning ──────────────────────────────────────────────
        if src in _SKINNED_CLASSES:
            box = layout.box()
            box.alert = True
            box.label(
                text=f"{src}: LOD decimation preview only — NIF export skipped.",
                icon='ERROR',
            )
            box.label(text="Use PyNifly to generate skinned-mesh LODs with bone re-binding.")

        layout.separator()

        # ── LOD ratios ────────────────────────────────────────────────────────
        row = layout.row()
        row.prop(self, "generate_lod1")
        row.prop(self, "lod1_ratio", text="Ratio")
        row = layout.row()
        row.prop(self, "generate_lod2")
        row.prop(self, "lod2_ratio", text="Ratio")
        row = layout.row()
        row.prop(self, "generate_lod3")
        row.prop(self, "lod3_ratio", text="Ratio")
        row = layout.row()
        row.prop(self, "generate_billboard")
        if self.generate_billboard:
            row.prop(self, "billboard_tex_size", text="Tex Size")
        layout.separator()

        # ── Collision ─────────────────────────────────────────────────────────
        # Show collision UI for all mesh types.
        # For vegetation, show an info note explaining ground-cover vs trees.
        box = layout.box()
        if src in _VEGETATION_CLASSES:
            box.label(
                text=f"{src}: trees/large shrubs need collision; ground-cover (GRASS) does not.",
                icon='INFO',
            )
        box.prop(self, "collision_from_lod3")
        if self.collision_from_lod3:
            if src in _VEGETATION_CLASSES:
                box.label(
                    text="UCX_ hull will be built — disable if this is thin ground-cover.",
                    icon='CHECKMARK',
                )
            else:
                box.label(
                    text="UCX_ collision built from LOD3 — no extra decimation step.",
                    icon='CHECKMARK',
                )

        layout.separator()

        # ── Texture / material note ───────────────────────────────────────────
        if obj and obj.type == 'MESH' and obj.material_slots:
            mat = obj.material_slots[0].material if obj.material_slots else None
            if mat:
                box = layout.box()
                box.label(text=f"Material: {mat.name}", icon='MATERIAL')
                box.label(text="LOD NIFs get their own downscaled, shared LOD texture(s).")

        # ── Export options ────────────────────────────────────────────────────
        layout.prop(self, "export_nifs")
        if self.export_nifs and src not in _SKINNED_CLASSES:
            layout.prop(self, "mod_folder")
            layout.prop(self, "mesh_subpath")

    def execute(self, context):
        # Process every selected mesh object, not just the active one — a
        # multi-mesh NIF (e.g. a tree trunk plus separate vine-cluster
        # pieces, all imported as their own Blender objects) needs LOD and
        # collision generated for EVERY piece. This used to only ever look
        # at context.active_object, silently skipping every other selected
        # mesh in the same multi-mesh selection.
        targets = [o for o in context.selected_objects if o.type == 'MESH']
        if not targets:
            active = context.active_object
            if active and active.type == 'MESH':
                targets = [active]
        if not targets:
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        # ── Get/create LOD collection ─────────────────────────────────────────
        lod_col = bpy.data.collections.get("FO4_LODs")
        if not lod_col:
            lod_col = bpy.data.collections.new("FO4_LODs")
            bpy.context.scene.collection.children.link(lod_col)

        lods_to_gen = []
        if self.generate_lod1: lods_to_gen.append(("LOD1", self.lod1_ratio))
        if self.generate_lod2: lods_to_gen.append(("LOD2", self.lod2_ratio))
        if self.generate_lod3: lods_to_gen.append(("LOD3", self.lod3_ratio))

        steps = []
        # Every LOD object across every target, kept separate for the
        # textureless (skinned) targets since those are decimation previews
        # only — no point downscaling/exporting textures nobody will use.
        all_lod_objects = []

        for obj in targets:
            # ── Detect source mesh class ──────────────────────────────────────
            # Use the dialog-detected value from invoke() only for the object
            # that was actually active when the dialog opened (that's the only
            # one invoke() profiled) — every other target in a multi-select
            # gets freshly auto-detected so a batch of mixed types (e.g. a
            # vegetation piece and a static prop selected together) is each
            # classified correctly instead of all inheriting one object's class.
            src_class = (
                self.detected_source_class
                if obj is context.active_object and self.detected_source_class not in ('', 'AUTO')
                else FO4_OT_GenerateLODs._detect_source_class(obj)
            )
            is_skinned = src_class in _SKINNED_CLASSES

            if is_skinned:
                self.report({'WARNING'},
                    f"{obj.name} is {src_class} (armature-skinned). "
                    "LOD decimation preview created but NIF export skipped. "
                    "Use PyNifly to generate skinned-mesh LODs with bone re-binding."
                )

            lod_objects = []
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
                    # ── Tag with metadata ────────────────────────────────────────
                    # fo4_object_type is the key that export_helpers.detect_fo4_object_class()
                    # honours first.  Setting it here means the LOD copies export with the
                    # correct shader flags (e.g. Two_Sided for VEGETATION) even if the
                    # material or vertex-group heuristics on the copy are ambiguous.
                    lod_obj["fo4_lod_level"]    = lod_key
                    lod_obj["fo4_lod_source"]   = obj.name
                    lod_obj["fo4_object_type"]  = src_class   # ← propagate type to LOD
                    lod_objects.append(lod_obj)
                    steps.append(msg)
                except Exception as e:
                    self.report({'WARNING'}, f"LOD generation failed for {obj.name} {lod_key}: {e}")

            # ── Collision ────────────────────────────────────────────────────────
            # There is exactly one place in this add-on meant for making
            # collision: Generate Collision / Custom Collision (Exact Mesh)
            # (MeshHelpers.add_collision_mesh / add_custom_collision). This
            # used to be a second, independent collision-creation path that
            # silently built its own UCX_ hull from LOD3 by default -- worth
            # noting even though it was already broken as a hider of real
            # collision: it parented that hull to *obj* (the untouched
            # LOD0 source), but this operator never exports *obj* itself,
            # only the LOD1/2/3 copies -- and export_mesh_to_nif() only
            # looks for collision among the *exported object's own*
            # children. So every LOD NIF this operator has ever produced
            # was exported with NO collision at all, regardless of this
            # setting.
            #
            # Rules (unchanged): GRASS/MUSHROOM ground-cover and
            # CHARACTER/CREATURE/SKINNED/ARMOR meshes never get a static
            # UCX_ hull (ground-cover collision is CK-authored; skinned
            # collision lives in the ragdoll rig). Everything else prefers
            # whatever real collision the user already built on *obj* via
            # the one true collision tool, reused as-is; only when *obj*
            # has none does the old LOD3-hull auto-build kick in, and only
            # if explicitly opted into via "Auto-Build Collision from LOD3".
            # fo4_collision_type is a real RNA EnumProperty set via attribute
            # assignment -- obj.get() only sees custom ID properties and always
            # silently returned "DEFAULT" here, so GRASS/MUSHROOM objects never
            # actually got their collision skipped as intended.
            coll_type = getattr(obj, "fo4_collision_type", "DEFAULT")
            is_ground_cover = coll_type in _NO_COLLISION_MESH_TYPES

            collision_template = None  # the single collision object/mesh to
                                        # copy onto every exported LOD level

            if is_ground_cover:
                steps.append(
                    f"✓ {obj.name} [{src_class}] (collision type: {coll_type}): collision skipped — "
                    "ground-cover uses no NIF physics collision"
                )
            elif is_skinned:
                steps.append(
                    f"✓ {obj.name} [{src_class}]: collision skipped — "
                    "collision is part of the armature/ragdoll rig"
                )
            else:
                try:
                    from . import export_helpers
                    collision_template = export_helpers.ExportHelpers._find_collision_mesh(obj)
                except Exception:
                    collision_template = None

                if collision_template is not None:
                    steps.append(
                        f"✓ {obj.name}: reusing existing collision "
                        f"'{collision_template.name}' for every LOD export "
                        "(made once via Generate Collision / Custom Collision)"
                    )
                elif self.collision_from_lod3 and self.generate_lod3:
                    lod3_obj = next(
                        (o for o in lod_objects if o.get("fo4_lod_level") == "LOD3"), None
                    )
                    if lod3_obj:
                        try:
                            ucx_name = f"UCX_{obj.name}_fromLOD3"
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

                            ucx_obj["fo4_collision"]        = True
                            ucx_obj["fo4_collision_source"] = "LOD3"
                            ucx_obj["fo4_lod_source"]       = obj.name
                            ucx_obj.display_type            = 'WIRE'
                            ucx_obj.hide_render             = True
                            ucx_obj.parent                  = obj

                            n_verts = len(ucx_mesh.vertices)
                            steps.append(
                                f"✓ UCX_{obj.name}: convex hull built from LOD3 "
                                f"({n_verts} vertices) — no existing collision found, "
                                "used the LOD3-hull fallback"
                            )
                            collision_template = ucx_obj
                        except Exception as e:
                            self.report({'WARNING'}, f"Collision from LOD3 failed for {obj.name}: {e}")
                    else:
                        self.report({'WARNING'},
                            f"{obj.name}: LOD3 not generated — enable 'LOD3 (8%)' to use it as collision source.")
                else:
                    steps.append(
                        f"○ {obj.name} [{src_class}]: no collision made yet — "
                        "use Generate Collision / Custom Collision (Exact Mesh) first "
                        "if this mesh needs physics collision in-game"
                    )

            # Copy the chosen collision (reused or freshly built) onto every
            # LOD level that will actually be exported, parented to that
            # LOD object specifically -- export_mesh_to_nif()'s collision
            # lookup only checks the exported object's own children, so a
            # collision parented only to *obj* (never itself exported here)
            # was never found by any previous version of this operator.
            if collision_template is not None:
                for lod_obj in lod_objects:
                    try:
                        lod_ucx_name = f"UCX_{lod_obj.name}"
                        existing = bpy.data.objects.get(lod_ucx_name)
                        if existing:
                            bpy.data.objects.remove(existing, do_unlink=True)
                        lod_ucx_mesh = collision_template.data.copy()
                        lod_ucx_obj  = collision_template.copy()
                        lod_ucx_obj.data = lod_ucx_mesh
                        lod_ucx_obj.name = lod_ucx_name
                        lod_ucx_mesh.name = lod_ucx_name
                        bpy.context.collection.objects.link(lod_ucx_obj)
                        lod_ucx_obj["fo4_collision"] = True
                        lod_ucx_obj["pynRigidBody"] = collision_template.get(
                            "pynRigidBody", "bhkPhysicsSystem")
                        lod_ucx_obj["pynCollisionShapeType"] = collision_template.get(
                            "pynCollisionShapeType", "polytope")
                        lod_ucx_obj.display_type = 'WIRE'
                        lod_ucx_obj.hide_render = True
                        lod_ucx_obj.parent = lod_obj
                        lod_ucx_obj.matrix_parent_inverse = lod_obj.matrix_world.inverted()
                        lod_obj["pynCollisionTarget"] = lod_ucx_obj.name
                    except Exception as e:
                        self.report({'WARNING'}, f"Could not attach collision to {lod_obj.name}: {e}")

            # ── Export NIFs ───────────────────────────────────────────────────────
            # Skinned meshes are excluded: the Decimate modifier strips the skin
            # bind and the resulting NIF would be broken.  Use PyNifly for skinned LODs.
            if self.export_nifs and self.mod_folder and lod_objects and not is_skinned:
                try:
                    from . import export_helpers
                    for lod_obj in lod_objects:
                        lod_key  = lod_obj.get("fo4_lod_level", "LOD")
                        suffix   = f"_lod{lod_key[-1]}"   # _lod1, _lod2, _lod3
                        nif_name = f"{obj.name}{suffix}.nif"
                        sub      = self.mesh_subpath.strip("/\\")
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
                        ok  = result[0] if isinstance(result, tuple) else \
                              result in ({'FINISHED'}, 'FINISHED')
                        msg = result[1] if isinstance(result, tuple) else str(result)
                        if ok:
                            steps.append(f"Exported [{src_class}]: {os.path.basename(nif_path)}")
                        else:
                            steps.append(f"⚠ Export failed for {lod_obj.name}: {msg}")
                except Exception as e:
                    self.report({'WARNING'}, f"NIF export error for {obj.name}: {e}")

            if lod_objects and not is_skinned:
                all_lod_objects.extend(lod_objects)

            # ── Billboard (LOD4, farthest level) ────────────────────────────────
            # Real FO4 assets don't keep decimating the organic mesh for the
            # farthest level -- they switch to a baked cross-billboard (see
            # generate_billboard_lod's own docstring for the reference-asset
            # evidence). Generated, exported, and then removed from the scene
            # in one step: it's a disposable bake result, not something meant
            # to stay in the user's working scene the way LOD1-3 do.
            if self.generate_billboard and not is_skinned and not is_ground_cover:
                try:
                    billboard_name = f"{obj.name}_LOD4"
                    billboard_obj, billboard_msg = generate_billboard_lod(
                        obj, billboard_name, tex_size=self.billboard_tex_size
                    )
                    steps.append(f"{obj.name}: {billboard_msg}")

                    billboard_exported = False
                    if self.export_nifs and self.mod_folder:
                        try:
                            from . import export_helpers
                            sub = self.mesh_subpath.strip("/\\")
                            nif_name = f"{obj.name}_lod4.nif"
                            nif_path = os.path.normpath(os.path.join(
                                self.mod_folder, "Data", "Meshes", sub, nif_name
                            ) if sub else os.path.join(
                                self.mod_folder, "Data", "Meshes", nif_name
                            ))
                            os.makedirs(os.path.dirname(nif_path), exist_ok=True)
                            context.view_layer.objects.active = billboard_obj
                            bpy.ops.object.select_all(action='DESELECT')
                            billboard_obj.select_set(True)
                            result = export_helpers.ExportHelpers.export_mesh_to_nif(
                                billboard_obj, nif_path
                            )
                            ok = result[0] if isinstance(result, tuple) else \
                                 result in ({'FINISHED'}, 'FINISHED')
                            if ok:
                                billboard_exported = True
                                steps.append(f"Exported billboard: {os.path.basename(nif_path)}")
                            else:
                                msg = result[1] if isinstance(result, tuple) else str(result)
                                steps.append(f"⚠ Billboard export failed for {obj.name}: {msg}")
                        except Exception as e:
                            self.report({'WARNING'}, f"Billboard export error for {obj.name}: {e}")

                    # Remove the temporary billboard object once it's safely
                    # exported (or if exporting was never requested for this
                    # run -- either way, nothing downstream needs it sitting
                    # in the scene, and a bake left behind after every run
                    # would just accumulate as clutter across every LOD pass).
                    if billboard_exported or not self.export_nifs:
                        try:
                            bd = billboard_obj.data
                            bpy.data.objects.remove(billboard_obj, do_unlink=True)
                            if bd and bd.users == 0:
                                bpy.data.meshes.remove(bd)
                        except Exception:
                            pass
                except Exception as e:
                    self.report({'WARNING'}, f"Billboard generation failed for {obj.name}: {e}")

        # ── Downscale/share textures across every target's LOD objects ────────
        # Real assets give their real-mesh LOD levels a dedicated, much
        # smaller shared texture instead of the full-resolution hero one (see
        # create_lod_textures's own docstring for the reference-asset
        # evidence). One shared pass over every target's LOD objects together
        # (not one pass per target) so pieces from the same NIF that
        # reference the same source texture (e.g. a trunk and its vines both
        # using the same bark diffuse) end up sharing one LOD atlas instead
        # of each target separately downscaling its own copy.
        if all_lod_objects:
            _ok, tex_msg = create_lod_textures(all_lod_objects, scale_factor=0.25)
            steps.append(tex_msg)

        # ── Texture / material info ───────────────────────────────────────────
        # Report which textures are confirmed on the LOD objects (now the
        # downscaled LOD-specific ones from create_lod_textures() above, not
        # the source's full-resolution originals).
        for lod_obj in all_lod_objects:
            mat = (lod_obj.material_slots[0].material
                   if lod_obj.material_slots else None)
            if mat and mat.use_nodes:
                tex_nodes = [
                    n for n in mat.node_tree.nodes
                    if n.type == 'TEX_IMAGE' and n.image
                ]
                if tex_nodes:
                    tex_names = ", ".join(n.image.name for n in tex_nodes[:3])
                    steps.append(
                        f"{lod_obj.name}: {len(tex_nodes)} texture(s) — {tex_names}"
                        + (" …" if len(tex_nodes) > 3 else "")
                    )
                else:
                    steps.append(
                        f"{lod_obj.name}: no image texture nodes on '{mat.name}' — "
                        "assign textures before export"
                    )
            elif mat:
                steps.append(f"{lod_obj.name}: material '{mat.name}' has no nodes — assign textures")

        for s in steps:
            self.report({'INFO'}, s)
        self.report({'INFO'},
            f"Generated {len(lod_objects)} LOD mesh(es) [{src_class}] in 'FO4_LODs' collection.")
        return {'FINISHED'}




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
    print("[LOD Gen] FO4 LOD generator + texture baker registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
