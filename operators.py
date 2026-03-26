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
from bpy.props import EnumProperty, FloatProperty


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
# All operator classes — add new operators here
# ─────────────────────────────────────────────────────────────────────────────

classes = (
    FO4_OT_CreateBaseMesh,
    FO4_OT_OptimizeMesh,
    FO4_OT_ValidateMesh,
    FO4_OT_GenerateCollision,
    FO4_OT_SetMeshType,
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
