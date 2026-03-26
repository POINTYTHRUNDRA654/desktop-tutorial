"""
Operators — Fallout 4 Mod Assistant (Piece 1: Mesh Tools)

Each operator is a thin wrapper that delegates real work to the helper
modules (mesh_helpers.py, etc.).  Keeping operators thin means the business
logic stays in one place and can be tested independently of Blender.

Rebuild roadmap:
  Piece 1 ✓  mesh operators (this file)
  Piece 2    export operators (NIF v25 via PyNifly)
  Piece 3    texture operators (DDS / NVTT / texconv)
  Piece 4    animation / rigging operators
  Piece 5    advanced tools

To add a new operator:
  1. Define the class below.
  2. Add it to the `classes` tuple at the bottom.
  3. Add a button for it in ui_panels.py.
"""

import bpy
from bpy.types import Operator
from bpy.props import BoolProperty, EnumProperty, FloatProperty, IntProperty, StringProperty


# ── Helper-module loader ──────────────────────────────────────────────────────

def _get(module_name: str):
    """Return a submodule of this package, or None if unavailable."""
    import importlib
    try:
        return importlib.import_module(f".{module_name}", package=__package__)
    except Exception as exc:
        print(f"[FO4] operators: could not load {module_name}: {exc}")
        return None


# ── Collision / Mesh-type enum items ─────────────────────────────────────────
# Defined here (not inside a class body) so operators and panels can both
# reference the same list without creating circular imports.

COLLISION_TYPE_ITEMS = [
    ('NONE',       'None',        'No collision generated'),
    ('DEFAULT',    'Default',     'Standard convex collision'),
    ('ROCK',       'Rock',        'Rock / stone surface'),
    ('TREE',       'Tree',        'Tree trunk / branch'),
    ('BUILDING',   'Building',    'Large static structure'),
    ('VEGETATION', 'Vegetation',  'Bush / shrub — simplified hull footprint'),
    ('GRASS',      'Grass',       'Ground-cover — no collision generated'),
    ('MUSHROOM',   'Mushroom',    'Small decorative — no collision generated'),
    ('CREATURE',   'Creature',    'NPC / creature — use Havok capsule/convex'),
]

MESH_TYPE_ITEMS = [
    ('AUTO',         'Auto-detect',  'Classify from armature / name / material'),
    ('STATIC',       'Static',
     'Non-animated world object — BSFadeNode root, BSTriShape, no skinning'),
    ('SKINNED',      'Skinned',
     'Character / creature mesh — NiNode root, BSSubIndexTriShape, BSSkin::Instance'),
    ('ARMOR',        'Armor',
     'Wearable armor — NiNode root, BSSubIndexTriShape, BSSkin::Instance, Skinned SF1'),
    ('ANIMATED',     'Animated',
     'Animated prop — NiNode with NiKeyframeController'),
    ('LOD',          'LOD',
     'Level-of-detail mesh — BSFadeNode root, reduced poly, same flags as Static'),
    ('VEGETATION',   'Vegetation',
     'Tree / bush / plant — BSFadeNode root, Two_Sided SF2, Alpha Clip material'),
    ('FURNITURE',    'Furniture',
     'Sit / activate furniture — NiNode root, BSXFlags Animated (1)'),
    ('WEAPON',       'Weapon',
     'Held weapon — NiNode root, no skinning, attach via named bone'),
    ('ARCHITECTURE', 'Architecture',
     'Building / wall — BSFadeNode root, BSXFlags Has-Havok (2), collision required'),
    ('FLORA',        'Flora',
     'Harvestable flora — BSFadeNode root, Alpha Clip, harvest node required'),
    ('DEBRIS',       'Debris',
     'Small physics debris — BSFadeNode root, BSXFlags Has-Havok (2)'),
]


# ─────────────────────────────────────────────────────────────────────────────
# Mesh operators
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_CreateBaseMesh(Operator):
    """Create a new mesh cube pre-configured for Fallout 4 NIF export.
Applies scale and adds a UV map automatically."""
    bl_idname = "fo4.create_base_mesh"
    bl_label  = "New FO4 Base Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        obj = mh.MeshHelpers.create_base_mesh()
        if obj:
            self.report({'INFO'}, f"Created '{obj.name}' — ready for FO4 NIF export")
            return {'FINISHED'}
        self.report({'ERROR'}, "Failed to create base mesh")
        return {'CANCELLED'}


class FO4_OT_OptimizeMesh(Operator):
    """Prepare the active mesh for Fallout 4 NIF v25 export:
apply transforms, UV-safe remove doubles, recalculate normals, triangulate."""
    bl_idname = "fo4.optimize_mesh"
    bl_label  = "Prep Mesh for FO4"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = mh.MeshHelpers.optimize_mesh(obj)
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


class FO4_OT_ValidateMesh(Operator):
    """Check the active mesh against Fallout 4 / NIF v25 requirements.
Reports: poly count, vertex count (BSTriShape 16-bit limit 65,535),
UV map presence, non-manifold edges, and unapplied scale."""
    bl_idname = "fo4.validate_mesh"
    bl_label  = "Validate Mesh (NIF v25)"
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        ok, issues = mh.MeshHelpers.validate_mesh(obj)
        if ok:
            self.report({'INFO'}, f"'{obj.name}' — valid for FO4 NIF export ✓")
        else:
            for msg in issues:
                self.report({'WARNING'}, msg)
            self.report(
                {'WARNING'},
                f"'{obj.name}' — {len(issues)} issue(s). Fix before exporting.",
            )
        return {'FINISHED'}


class FO4_OT_GenerateCollision(Operator):
    """Generate a UCX_ convex-hull collision mesh for the active object.
Names it UCX_<mesh>, triangulates it, and parents it to the source.
Required for Havok physics in Fallout 4."""
    bl_idname = "fo4.generate_collision"
    bl_label  = "Generate UCX_ Collision"
    bl_options = {'REGISTER', 'UNDO'}

    collision_type: EnumProperty(
        name="Collision Type",
        description=(
            "Fallout 4 Havok collision category. "
            "Controls friction, restitution, and hull simplification."
        ),
        items=COLLISION_TYPE_ITEMS,
        default='DEFAULT',
    )
    simplify_ratio: FloatProperty(
        name="Simplify",
        description=(
            "Decimate ratio before building the convex hull. "
            "0.1 = very simple,  1.0 = no simplification."
        ),
        default=0.25,
        min=0.01,
        max=1.0,
        precision=2,
    )

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            mh = _get("mesh_helpers")
            if mh:
                self.collision_type = mh.MeshHelpers.infer_collision_type(obj)
        return context.window_manager.invoke_props_dialog(self, width=320)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "collision_type")
        layout.prop(self, "simplify_ratio", slider=True)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        col_obj = mh.MeshHelpers.add_collision_mesh(
            obj,
            simplify_ratio=self.simplify_ratio,
            collision_type=self.collision_type,
        )
        if col_obj:
            self.report(
                {'INFO'},
                f"Created '{col_obj.name}' "
                f"({self.collision_type}, {len(col_obj.data.vertices)} verts)",
            )
            return {'FINISHED'}
        # Types NONE / GRASS / MUSHROOM intentionally skip generation
        if self.collision_type in ('NONE', 'GRASS', 'MUSHROOM'):
            self.report(
                {'INFO'},
                f"Collision type '{self.collision_type}' — no mesh needed (correct)",
            )
            return {'FINISHED'}
        self.report({'ERROR'}, "Collision generation failed — check the console")
        return {'CANCELLED'}


class FO4_OT_SetMeshType(Operator):
    """Set the Fallout 4 NIF mesh classification on the active object.
Controls root node type, BSXFlags, shader flags, and skinning on export."""
    bl_idname = "fo4.set_mesh_type"
    bl_label  = "Set FO4 Mesh Type"
    bl_options = {'REGISTER', 'UNDO'}

    mesh_type: EnumProperty(
        name="Mesh Type",
        items=MESH_TYPE_ITEMS,
        default='AUTO',
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=320)

    def execute(self, context):
        obj = context.active_object
        if not obj:
            self.report({'ERROR'}, "No active object")
            return {'CANCELLED'}
        obj.fo4_mesh_type = self.mesh_type
        self.report({'INFO'}, f"'{obj.name}' mesh type → {self.mesh_type}")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# Additional enum items (shared with ui_panels.py)
# ─────────────────────────────────────────────────────────────────────────────

AXIS_ITEMS = [
    ('X', 'X Axis', 'Apply along the X axis'),
    ('Y', 'Y Axis', 'Apply along the Y axis'),
    ('Z', 'Z Axis', 'Apply along the Z axis'),
]

UV_METHOD_ITEMS = [
    ('MIN_STRETCH', 'Minimum Stretch',
     'Best quality — CONFORMAL + minimize_stretch (recommended for FO4)'),
    ('SMART',       'Smart UV Project',
     'Fast automatic unwrap — good general purpose'),
    ('ANGLE',       'Angle Based',
     'Angle-based conformal unwrap with stretch-minimise pass'),
    ('CUBE',        'Cube Projection',
     'Box projection — fast, best for architectural meshes'),
]

TEXTURE_TYPE_ITEMS = [
    ('DIFFUSE',  'Diffuse',  'Color / albedo texture (_d.dds)'),
    ('NORMAL',   'Normal',   'Normal / tangent-space map (_n.dds)'),
    ('SPECULAR', 'Specular', 'Specular / gloss map (_s.dds)'),
    ('GLOW',     'Glow',     'Emissive / glow map (_g.dds)'),
]


# ─────────────────────────────────────────────────────────────────────────────
# Split mesh at BSTriShape 65k limit
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_SplitMeshAtLimit(Operator):
    """Split the active mesh into parts each under the BSTriShape 65,535 triangle limit.
Uses island-based separation then falls back to material-based splitting."""
    bl_idname = "fo4.split_mesh_at_limit"
    bl_label  = "Split Mesh at 65k Limit"
    bl_options = {'REGISTER', 'UNDO'}

    tri_limit: IntProperty(
        name="Triangle Limit",
        description="Maximum triangles per part (BSTriShape 16-bit index limit)",
        default=65535,
        min=100,
        max=65535,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        parts = mh.MeshHelpers.split_mesh_at_poly_limit(obj, tri_limit=self.tri_limit)
        if len(parts) == 1:
            self.report(
                {'INFO'},
                f"'{obj.name}' is already within the {self.tri_limit:,}-triangle limit",
            )
        else:
            self.report(
                {'INFO'},
                f"Split '{obj.name}' into {len(parts)} parts "
                f"(each ≤ {self.tri_limit:,} triangles)",
            )
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# Setup UV + Texture (all-in-one workflow)
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_SetupUVWithTexture(Operator):
    """Complete UV + texture pipeline for FO4 NIF export in one click.
Ensures a UV map, unwraps, packs islands, creates FO4 PBR material, and binds the texture."""
    bl_idname = "fo4.setup_uv_with_texture"
    bl_label  = "Setup UV + Texture (All-in-One)"
    bl_options = {'REGISTER', 'UNDO'}

    texture_path: StringProperty(
        name="Texture File",
        description="Absolute path to texture file (PNG, TGA, DDS, …)",
        subtype='FILE_PATH',
        default="",
    )
    texture_type: EnumProperty(
        name="Texture Type",
        items=TEXTURE_TYPE_ITEMS,
        default='DIFFUSE',
    )
    unwrap_method: EnumProperty(
        name="Unwrap Method",
        items=UV_METHOD_ITEMS,
        default='MIN_STRETCH',
    )
    island_margin: FloatProperty(
        name="Island Margin",
        description="Spacing between UV islands (prevents mip-map bleed)",
        default=0.02,
        min=0.0,
        max=0.1,
        precision=3,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "texture_path")
        layout.prop(self, "texture_type")
        layout.prop(self, "unwrap_method")
        layout.prop(self, "island_margin", slider=True)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        mh = _get("mesh_helpers")
        if not mh:
            self.report({'ERROR'}, "mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = mh.MeshHelpers.setup_uv_with_texture(
            obj,
            texture_path=self.texture_path,
            texture_type=self.texture_type,
            unwrap_method=self.unwrap_method,
            island_margin=self.island_margin,
        )
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# Advanced mesh analysis & repair
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_AnalyzeMeshQuality(Operator):
    """Run a comprehensive mesh quality analysis.
Reports topology score, geometry score, UV score, and lists all issues found.
Results are printed to the System Console."""
    bl_idname = "fo4.analyze_mesh_quality"
    bl_label  = "Analyze Mesh Quality"
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        scores, issues, details = amh.AdvancedMeshHelpers.analyze_mesh_quality(obj)
        if scores is None:
            self.report({'ERROR'}, issues[0] if issues else "Analysis failed")
            return {'CANCELLED'}

        print(f"\n=== Mesh Quality: {obj.name} ===")
        print(f"  Overall : {scores['overall']:.0f} / 100")
        print(f"  Topology: {scores['topology']:.0f} / 100")
        print(f"  Geometry: {scores['geometry']:.0f} / 100")
        print(f"  UV      : {scores['uv']:.0f} / 100")
        if details:
            print(f"  Verts   : {details.get('vertex_count', '?'):,}  "
                  f"Polys: {details.get('face_count', '?'):,}  "
                  f"Tris: {details.get('tris', '?'):,}")
        print("  Issues:")
        for issue in issues:
            print(f"    • {issue}")
        print("=== End Analysis ===\n")

        overall = scores['overall']
        rating = "Excellent ✓" if overall >= 90 else (
            "Good" if overall >= 70 else (
            "Needs work" if overall >= 50 else "Poor — repair recommended"))
        self.report(
            {'INFO'},
            f"'{obj.name}' quality: {overall:.0f}/100 ({rating}) — see System Console",
        )
        return {'FINISHED'}


class FO4_OT_AutoRepairMesh(Operator):
    """Automatically fix common mesh issues: remove doubles, fix non-manifold edges,
delete degenerate faces, remove loose vertices, and recalculate normals."""
    bl_idname = "fo4.auto_repair_mesh"
    bl_label  = "Auto Repair Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg, repairs = amh.AdvancedMeshHelpers.auto_repair_mesh(obj)
        self.report({'INFO' if ok else 'WARNING'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# Polygon reduction / remeshing
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_SmartDecimate(Operator):
    """Intelligently reduce polygon count while preserving UV islands and sharp edges.
Use this to bring an over-limit mesh under the BSTriShape 65,535-triangle cap."""
    bl_idname = "fo4.smart_decimate"
    bl_label  = "Smart Decimate"
    bl_options = {'REGISTER', 'UNDO'}

    ratio: FloatProperty(
        name="Ratio",
        description="Target ratio of polygons to keep (0.5 = 50% of original)",
        default=0.5,
        min=0.01,
        max=1.0,
        precision=2,
    )
    preserve_uvs: BoolProperty(
        name="Preserve UVs",
        description="Prevent UV seam edges from being collapsed during decimation",
        default=True,
    )
    preserve_sharp: BoolProperty(
        name="Preserve Sharp",
        description="Keep sharp / crease edges during decimation",
        default=True,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=320)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "ratio", slider=True)
        layout.prop(self, "preserve_uvs")
        layout.prop(self, "preserve_sharp")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg, _ = amh.AdvancedMeshHelpers.smart_decimate(
            obj,
            ratio=self.ratio,
            preserve_uvs=self.preserve_uvs,
            preserve_sharp=self.preserve_sharp,
        )
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


class FO4_OT_RemeshUniform(Operator):
    """Rebuild the mesh with uniform topology using voxel remeshing.
Useful for cleaning up sculpts or high-poly imports before FO4 export."""
    bl_idname = "fo4.remesh_uniform"
    bl_label  = "Remesh (Uniform Voxel)"
    bl_options = {'REGISTER', 'UNDO'}

    voxel_size: FloatProperty(
        name="Voxel Size",
        description="Size of each voxel cell — smaller = more detail, more polygons",
        default=0.1,
        min=0.001,
        max=1.0,
        precision=3,
    )
    adaptivity: FloatProperty(
        name="Adaptivity",
        description="0 = uniform, higher = reduce flat areas more aggressively",
        default=0.0,
        min=0.0,
        max=1.0,
        precision=2,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=320)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "voxel_size")
        layout.prop(self, "adaptivity", slider=True)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = amh.AdvancedMeshHelpers.remesh_uniform(
            obj, voxel_size=self.voxel_size, adaptivity=self.adaptivity
        )
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# Smoothing
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_SmoothMesh(Operator):
    """Apply Laplacian smoothing to the active mesh.
Reduces faceted hard-surface look without changing the overall shape significantly."""
    bl_idname = "fo4.smooth_mesh"
    bl_label  = "Smooth Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    iterations: IntProperty(
        name="Iterations",
        description="Number of smoothing passes",
        default=2,
        min=1,
        max=100,
    )
    factor: FloatProperty(
        name="Factor",
        description="Smoothing strength per iteration (0 = none, 1 = maximum)",
        default=0.5,
        min=0.0,
        max=1.0,
        precision=2,
    )
    preserve_volume: BoolProperty(
        name="Preserve Volume",
        description="Enable all axes so the overall shape is retained",
        default=True,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=300)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "iterations")
        layout.prop(self, "factor", slider=True)
        layout.prop(self, "preserve_volume")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = amh.AdvancedMeshHelpers.smooth_mesh(
            obj,
            iterations=self.iterations,
            factor=self.factor,
            preserve_volume=self.preserve_volume,
        )
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# Symmetry / mirroring
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_CheckSymmetry(Operator):
    """Check whether the active mesh is symmetrical along the chosen axis.
Reports a symmetry score and flags asymmetric vertices."""
    bl_idname = "fo4.check_symmetry"
    bl_label  = "Check Symmetry"
    bl_options = {'REGISTER'}

    axis: EnumProperty(name="Axis", items=AXIS_ITEMS, default='X')

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=250)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        is_sym, msg, score = amh.AdvancedMeshHelpers.check_symmetry(obj, axis=self.axis)
        self.report({'INFO' if is_sym else 'WARNING'}, msg)
        return {'FINISHED'}


class FO4_OT_MirrorMesh(Operator):
    """Apply a Mirror modifier and immediately bake it into the mesh geometry.
Useful for creating symmetrical armour or prop meshes."""
    bl_idname = "fo4.mirror_mesh"
    bl_label  = "Mirror Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    axis: EnumProperty(name="Axis", items=AXIS_ITEMS, default='X')
    merge: BoolProperty(
        name="Merge at Center",
        description="Weld vertices at the mirror plane (recommended for clean topology)",
        default=True,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=280)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "axis")
        layout.prop(self, "merge")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = amh.AdvancedMeshHelpers.mirror_mesh(obj, axis=self.axis, merge=self.merge)
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# LOD chain generation
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_GenerateLODChain(Operator):
    """Generate Fallout 4–compatible LOD meshes (LOD1–LOD4) from the active mesh.
The source object becomes LOD0. Each level is a separate object ready for NIF export."""
    bl_idname = "fo4.generate_lod_chain"
    bl_label  = "Generate LOD Chain"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg, lod_objects = amh.AdvancedMeshHelpers.generate_lod_chain(obj)
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# UV tools
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_OptimizeUVs(Operator):
    """Unwrap and pack UV islands optimised for Fallout 4 NIF export.
Minimum Stretch method produces the lowest UV distortion for textured meshes."""
    bl_idname = "fo4.optimize_uvs"
    bl_label  = "Optimize UVs"
    bl_options = {'REGISTER', 'UNDO'}

    method: EnumProperty(
        name="Unwrap Method",
        items=UV_METHOD_ITEMS,
        default='MIN_STRETCH',
    )
    margin: FloatProperty(
        name="Island Margin",
        description="Spacing between UV islands",
        default=0.01,
        min=0.0,
        max=0.1,
        precision=3,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=320)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "method")
        layout.prop(self, "margin", slider=True)

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg = amh.AdvancedMeshHelpers.optimize_uvs(obj, method=self.method, margin=self.margin)
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


class FO4_OT_ScanUVComplexity(Operator):
    """Analyse UV unwrap complexity and give specific recommendations.
Reports a complexity score 0–100 and advises whether to use automatic or hybrid
unwrapping for best results with this mesh."""
    bl_idname = "fo4.scan_uv_complexity"
    bl_label  = "Scan UV Complexity"
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        result = amh.AdvancedMeshHelpers.scan_uv_complexity(obj)

        print(f"\n=== UV Complexity Scan: {obj.name} ===")
        print(f"  Score         : {result['complexity_score']} / 100")
        print(f"  Seam candidates: {result['seam_candidates']}")
        print(f"  Island estimate: {result['island_estimate']}")
        if result['problem_areas']:
            print("  Problem areas:")
            for area in result['problem_areas']:
                print(f"    • {area}")
        print("  Recommendations:")
        for rec in result['recommendations']:
            print(f"    → {rec}")
        print("=== End Scan ===\n")

        score = result['complexity_score']
        self.report(
            {'INFO'},
            f"'{obj.name}' UV complexity: {score}/100 — see System Console for recommendations",
        )
        return {'FINISHED'}


class FO4_OT_AutoMarkSeams(Operator):
    """Automatically mark UV seams at natural fold lines (sharp dihedral edges).
Run this before UV unwrapping to guide the unwrapper for cleaner islands."""
    bl_idname = "fo4.auto_mark_seams"
    bl_label  = "Scan & Mark Seams"
    bl_options = {'REGISTER', 'UNDO'}

    sharp_threshold_deg: FloatProperty(
        name="Sharp Angle (degrees)",
        description="Edges with a face-to-face angle above this threshold become seams",
        default=30.0,
        min=1.0,
        max=180.0,
        precision=1,
    )
    clear_existing: BoolProperty(
        name="Clear Existing Seams",
        description="Remove all current seam markings before auto-marking new ones",
        default=False,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=320)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "sharp_threshold_deg")
        layout.prop(self, "clear_existing")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        amh = _get("advanced_mesh_helpers")
        if not amh:
            self.report({'ERROR'}, "advanced_mesh_helpers not available")
            return {'CANCELLED'}
        ok, msg, total = amh.AdvancedMeshHelpers.auto_mark_seams(
            obj,
            sharp_threshold_deg=self.sharp_threshold_deg,
            clear_existing=self.clear_existing,
        )
        self.report({'INFO' if ok else 'ERROR'}, msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ─────────────────────────────────────────────────────────────────────────────
# All operator classes — add new operators here
# ─────────────────────────────────────────────────────────────────────────────

classes = (
    FO4_OT_CreateBaseMesh,
    FO4_OT_OptimizeMesh,
    FO4_OT_ValidateMesh,
    FO4_OT_GenerateCollision,
    FO4_OT_SetMeshType,
    # ── from mesh_helpers ──
    FO4_OT_SplitMeshAtLimit,
    FO4_OT_SetupUVWithTexture,
    # ── from advanced_mesh_helpers ──
    FO4_OT_AnalyzeMeshQuality,
    FO4_OT_AutoRepairMesh,
    FO4_OT_SmartDecimate,
    FO4_OT_RemeshUniform,
    FO4_OT_SmoothMesh,
    FO4_OT_CheckSymmetry,
    FO4_OT_MirrorMesh,
    FO4_OT_GenerateLODChain,
    FO4_OT_OptimizeUVs,
    FO4_OT_ScanUVComplexity,
    FO4_OT_AutoMarkSeams,
)


# ─────────────────────────────────────────────────────────────────────────────
# Per-object Fallout 4 custom properties
# ─────────────────────────────────────────────────────────────────────────────

def _register_object_props():
    """Register per-object FO4 properties on bpy.types.Object."""
    bpy.types.Object.fo4_collision_type = bpy.props.EnumProperty(
        name="Collision Type",
        description="Fallout 4 Havok collision category for this mesh",
        items=COLLISION_TYPE_ITEMS,
        default='DEFAULT',
    )
    bpy.types.Object.fo4_mesh_type = bpy.props.EnumProperty(
        name="Mesh Type",
        description=(
            "How this mesh is classified for NIF v25 export. "
            "Controls root node, BSXFlags, shader flags, and skinning."
        ),
        items=MESH_TYPE_ITEMS,
        default='AUTO',
    )


def _unregister_object_props():
    for attr in ("fo4_collision_type", "fo4_mesh_type"):
        try:
            delattr(bpy.types.Object, attr)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Register / Unregister
# ─────────────────────────────────────────────────────────────────────────────

def register():
    _register_object_props()
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            existing = getattr(bpy.types, cls.__name__, None)
            if existing:
                bpy.utils.unregister_class(existing)
            bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
    _unregister_object_props()
