"""
Mesh helper functions for Fallout 4 mod creation
"""

import bpy
import bmesh
from mathutils import Vector
from . import preferences

class MeshHelpers:
    """Helper functions for mesh creation and optimization"""

    # collision categories used throughout the add-on
    COLLISION_TYPES = [
        ('NONE', 'None', 'No collision will be generated or exported'),
        ('DEFAULT', 'Default', 'Standard collision mesh'),
        ('ROCK', 'Rock', 'Rough rock-style collision'),
        ('TREE', 'Tree', 'Hollow/branching tree collision'),
        ('BUILDING', 'Building', 'Large static structure collision'),
        ('GRASS', 'Grass', 'No collision (thin vegetation)'),
        ('MUSHROOM', 'Mushroom', 'No collision (small decorative)'),
        ('CREATURE', 'Creature', 'Use Havok tools (capsule/convex)')
    ]
    # default simplification per type (used if caller passes None)
    _TYPE_DEFAULT_RATIOS = {
        'DEFAULT': 0.25,
        'ROCK': 0.5,
        'TREE': 0.2,
        'BUILDING': 0.15,  # less aggressive simplification for structures
        'GRASS': 1.0,      # no simplification needed since we skip
        'MUSHROOM': 1.0,
        'CREATURE': 1.0,   # creatures typically use external physics shapes
        'NONE': 1.0
    }

    # automatic sound/weight presets by collision type
    _SOUND_PRESETS = {
        'DEFAULT': 'default_collision',
        'ROCK': 'stone_hit',
        'TREE': 'wood_hit',
        'BUILDING': 'stone_hit',
        'GRASS': 'grass_step',
        'MUSHROOM': 'grass_step',
        'CREATURE': 'flesh_hit',
        'NONE': None
    }
    _WEIGHT_PRESETS = {
        'DEFAULT': 'medium',
        'ROCK': 'heavy',
        'TREE': 'medium',
        'BUILDING': 'heavy',
        'GRASS': 'light',
        'MUSHROOM': 'light',
        'CREATURE': 'variable',
        'NONE': None
    }

    @staticmethod
    def infer_collision_type(obj):
        """Guess an appropriate collision type based on the object name.

        This simple heuristic is used to prefill dialogs so that rocks get rock
        collision, trees get tree collision, and small plant meshes skip it.
        """
        if not obj or obj.type != 'MESH':
            return 'DEFAULT'
        name = obj.name.lower()
        if any(w in name for w in ['rock', 'stone', 'boulder']):
            return 'ROCK'
        if any(w in name for w in ['tree', 'trunk', 'branch']):
            return 'TREE'
        if any(w in name for w in ['house', 'building', 'wall', 'door']):
            return 'BUILDING'
        if any(w in name for w in ['grass', 'blade', 'fern']):
            return 'GRASS'
        if 'mushroom' in name:
            return 'MUSHROOM'
        if any(w in name for w in ['npc', 'creature', 'beast', 'character']):
            return 'CREATURE'
        return 'DEFAULT'

    @staticmethod
    def create_base_mesh(mesh_type='CUBE'):
        """Create a base mesh optimized for Fallout 4"""
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.name = "FO4_Mesh"
        
        # Apply scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        
        # Add UV map
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
        
        return obj
    
    @staticmethod
    def optimize_mesh(obj):
        """Optimize mesh for Fallout 4"""
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        prefs = preferences.get_preferences()
        apply_trans = prefs.optimize_apply_transforms if prefs else True
        threshold = prefs.optimize_remove_doubles_threshold if prefs else 0.0001
        preserve_uvs = prefs.optimize_preserve_uvs if prefs else True

        # Switch to object mode and optionally apply transforms
        if bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if apply_trans:
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

        # Use bmesh for operations
        me = obj.data
        bm = bmesh.new()
        bm.from_mesh(me)

        # UV-aware remove doubles
        uv_layer = bm.loops.layers.uv.active
        remove_kwargs = {'verts': bm.verts, 'dist': threshold}
        if preserve_uvs and uv_layer is not None:
            remove_kwargs['use_uvs'] = True
        try:
            bmesh.ops.remove_doubles(bm, **remove_kwargs)
        except TypeError:
            # use_uvs is not supported in this version of Blender; retry without it
            remove_kwargs.pop('use_uvs', None)
            bmesh.ops.remove_doubles(bm, **remove_kwargs)

        # Recalculate normals consistently
        bm.normal_update()

        # Triangulate
        bmesh.ops.triangulate(bm, faces=bm.faces[:])

        # write back to mesh
        bm.to_mesh(me)
        bm.free()

        return True, "Mesh optimized successfully (UV-safe)"

    
    @staticmethod
    def validate_mesh(obj, is_collision=False):
        """Validate mesh for Fallout 4 compatibility.

        Checks geometry integrity, UV requirements, scale, poly budget, and
        common issues that cause the Niftools NIF exporter to fail silently
        (non-manifold edges, inconsistent face normals).

        Parameters
        ----------
        obj : bpy.types.Object
            The mesh object to validate.
        is_collision : bool, optional
            Set to ``True`` for collision or occlusion meshes.  These are
            invisible in-game so the UV-map requirement and non-manifold edge
            check are skipped – collision shapes are allowed to be open shells
            or convex hulls that are not fully closed surfaces.
        """
        if obj.type != 'MESH':
            return False, ["Object is not a mesh"]
        
        issues = []
        mesh = obj.data
        
        # Check vertex count
        if len(mesh.vertices) == 0:
            issues.append("Mesh has no vertices")
        
        # Check poly count
        poly_count = len(mesh.polygons)
        if poly_count == 0:
            issues.append("Mesh has no polygons")
        elif poly_count > 65535:
            issues.append(f"Poly count too high: {poly_count} (FO4 limit is 65,535 triangles per mesh)")

        # Check for UV map – required by Niftools v0.1.1 and by FO4 shaders.
        # Collision/occlusion meshes are invisible and do not need UV maps.
        if not is_collision and not mesh.uv_layers:
            issues.append("Mesh has no UV map (required for FO4 NIF export)")
        
        # Use bmesh for detailed geometry checks
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bm.faces.ensure_lookup_table()

        # Loose vertices – not referenced by any edge; cause export corruption
        loose_verts = [v for v in bm.verts if not v.link_edges]
        if loose_verts:
            issues.append(f"{len(loose_verts)} loose vertex/vertices found – delete them before export")

        # Non-manifold edges – edges shared by ≠2 faces or boundary edges on a
        # closed surface; the Niftools exporter can silently corrupt these.
        # Collision/occlusion meshes may legitimately be open shells (convex
        # hulls, simple boxes) so this check is skipped for them.
        if not is_collision:
            non_manifold = [e for e in bm.edges if not e.is_manifold]
            if non_manifold:
                issues.append(
                    f"{len(non_manifold)} non-manifold edge(s) detected – use Mesh > Clean Up > "
                    "Fill Holes / Merge by Distance, or select Non-Manifold (Alt+Ctrl+Shift+M)"
                )

        bm.free()
        
        # Check scale – unapplied scale distorts geometry in FO4;
        # _prepare_mesh_for_nif auto-applies this but we keep the warning
        # so the "Validate Before Export" button gives accurate feedback.
        if obj.scale != Vector((1.0, 1.0, 1.0)):
            issues.append("Object scale not applied – use Ctrl+A > Apply Scale before export")
        
        if not issues:
            return True, ["Mesh is valid for Fallout 4"]
        
        return False, issues
    
    @staticmethod
    def add_collision_mesh(obj, simplify_ratio: float = None, collision_type: str = 'DEFAULT'):
        """Add a collision mesh for *obj* and return the new object.

        ``collision_type`` is one of ``MeshHelpers.COLLISION_TYPES``; meshes marked
        ``NONE``, ``GRASS`` or ``MUSHROOM`` are skipped.  If ``simplify_ratio`` is
        ``None`` the helper chooses a reasonable default based on the collision
        type.

        The generated collision object is:
        - Named ``UCX_{obj.name}`` (Fallout 4 / FBX collision naming convention)
        - Built as a convex hull so it is always a closed, manifold surface
        - Parented to *obj* so they travel together on export
        - Stripped of all materials and vertex groups (collision must be invisible)
        - Triangulated ready for FO4 NIF BSTriShape geometry
        - Configured as a static Rigid Body so the NIF exporter emits Havok nodes
        """
        if obj.type != 'MESH':
            return None

        # record presets on source object
        obj["fo4_collision_type"] = collision_type
        sound = MeshHelpers._SOUND_PRESETS.get(collision_type)
        weight = MeshHelpers._WEIGHT_PRESETS.get(collision_type)
        if sound is not None:
            obj["fo4_collision_sound"] = sound
        if weight is not None:
            obj["fo4_collision_weight"] = weight

        # skip types that shouldn't have collision
        if collision_type in ('NONE', 'GRASS', 'MUSHROOM'):
            return None

        # pick a default simplification if not specified
        if simplify_ratio is None:
            simplify_ratio = MeshHelpers._TYPE_DEFAULT_RATIOS.get(collision_type, 0.25)

        # remove any previously generated collision mesh for this object so we
        # don't accumulate duplicates on repeated calls.
        # Check both parented children (new style) and scene siblings (old style).
        ucx_name = f"UCX_{obj.name}"
        legacy_name = f"{obj.name}_COLLISION"
        for o in list(obj.children):
            if o.get("fo4_collision") or o.name in (ucx_name, legacy_name):
                bpy.data.objects.remove(o, do_unlink=True)
        for scene in getattr(obj, 'users_scene', []):
            for o in list(scene.objects):
                if o is obj:
                    continue
                if o.get("fo4_collision") or o.name in (ucx_name, legacy_name):
                    bpy.data.objects.remove(o, do_unlink=True)

        # make sure we're operating on a clean selection
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.duplicate()

        collision_obj = bpy.context.active_object

        # Fallout 4 collision naming convention: UCX_ prefix (recognised by the
        # NIF exporter and standard FBX-to-NIF pipelines)
        collision_obj.name = ucx_name

        # mark so exporters can identify and skip it as a visual mesh
        collision_obj["fo4_collision"] = True
        collision_obj["fo4_collision_type"] = collision_type
        obj["fo4_collision_type"] = collision_type

        # copy sound / weight presets
        if sound is not None:
            collision_obj["fo4_collision_sound"] = sound
            obj["fo4_collision_sound"] = sound
        if weight is not None:
            collision_obj["fo4_collision_weight"] = weight
            obj["fo4_collision_weight"] = weight

        # collision meshes must have NO materials or textures – they are purely
        # for physics and should be invisible in-game
        collision_obj.data.materials.clear()

        # vertex groups are not meaningful on a collision mesh and can confuse
        # some exporters; strip them
        collision_obj.vertex_groups.clear()

        # Make the collision object active so operators below work on it.
        bpy.ops.object.select_all(action='DESELECT')
        collision_obj.select_set(True)
        bpy.context.view_layer.objects.active = collision_obj

        # Apply scale and rotation so the convex hull reflects the true world-
        # space shape of the source mesh.  Location is left as-is so the
        # collision object stays co-located with the source.
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

        # Optional pre-pass: reduce vertex count with Decimate so very high-poly
        # sources produce a simpler convex hull.  Skip when simplify_ratio is 1.0
        # (no simplification requested) to avoid an unnecessary modifier apply.
        if simplify_ratio < 1.0:
            modifier = collision_obj.modifiers.new(name="Decimate", type='DECIMATE')
            modifier.ratio = simplify_ratio
            bpy.ops.object.modifier_apply(modifier="Decimate")

        # Build a clean convex hull with bmesh.  A convex hull is always a
        # closed, watertight, manifold surface – exactly what Havok physics
        # (bhkConvexVerticesShape / bhkMoppBvTreeShape) requires for FO4.
        # Unlike raw Decimate output, it can never have non-manifold edges.
        bm = bmesh.new()
        bm.from_mesh(collision_obj.data)

        # Merge vertices that are nearly coincident to heal seams from the
        # original mesh before building the hull.  0.001 BU ≈ 0.07 mm at FO4
        # scale (1 BU = 1 game unit ≈ 7 cm) – tight enough to catch floating-
        # point seams without merging intentionally distinct vertices.
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
        bm.verts.ensure_lookup_table()

        # Build the convex hull; keep only the outer hull surface geometry.
        result = bmesh.ops.convex_hull(bm, input=bm.verts)
        # geom_interior  – geometry that ended up inside the hull
        # geom_unused    – geometry that wasn't part of the hull at all
        geom_to_delete = result.get('geom_interior', []) + result.get('geom_unused', [])
        if geom_to_delete:
            bmesh.ops.delete(bm, geom=geom_to_delete, context='VERTS')

        # Triangulate – FO4 BSTriShape / NIF geometry requires triangles only.
        bmesh.ops.triangulate(bm, faces=bm.faces[:])

        # Recalculate face normals consistently outward.
        bm.normal_update()

        bm.to_mesh(collision_obj.data)
        bm.free()
        collision_obj.data.update()

        # parent collision mesh to the source object so they are exported as a
        # unit.  Clear parent inverse so the collision sits at the same world
        # position as the original.
        collision_obj.parent = obj
        collision_obj.matrix_parent_inverse = obj.matrix_world.inverted()

        # Configure as a static Rigid Body so the Niftools NIF exporter can
        # emit the correct bhkCollisionObject / bhkRigidBody nodes for FO4.
        # The operation may not be available in every context; wrap in try/except.
        try:
            bpy.ops.object.select_all(action='DESELECT')
            collision_obj.select_set(True)
            bpy.context.view_layer.objects.active = collision_obj
            bpy.ops.rigidbody.object_add()
            collision_obj.rigid_body.type = 'PASSIVE'
            # FINAL uses the evaluated mesh.  All mesh processing (Decimate +
            # convex hull) has already been baked into the object data, so FINAL
            # and BASE are equivalent here, but FINAL is the safer default.
            collision_obj.rigid_body.mesh_source = 'FINAL'
            collision_obj.rigid_body.collision_shape = 'CONVEX_HULL'
        except Exception:
            # Physics operators unavailable in this context; skip silently.
            # The UCX_ naming and parent relationship still enable export.
            pass

        # restore original object as active/selected
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        collision_obj.select_set(False)

        return collision_obj

def register():
    """Register mesh helper functions"""
    pass

def unregister():
    """Unregister mesh helper functions"""
    pass
