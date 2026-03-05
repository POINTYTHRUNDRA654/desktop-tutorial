"""
Mesh helper functions for Fallout 4 mod creation
"""

import bpy
import bmesh
from mathutils import Vector

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
    def validate_mesh(obj):
        """Validate mesh for Fallout 4 compatibility"""
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
            issues.append(f"Poly count too high: {poly_count} (max 65535 for FO4)")
        
        # Check for UV map
        if not mesh.uv_layers:
            issues.append("Mesh has no UV map")
        
        # Check for loose vertices
        bm = bmesh.new()
        bm.from_mesh(mesh)
        loose_verts = [v for v in bm.verts if not v.link_edges]
        if loose_verts:
            issues.append(f"Found {len(loose_verts)} loose vertices")
        bm.free()
        
        # Check scale
        if obj.scale != Vector((1.0, 1.0, 1.0)):
            issues.append("Object scale not applied (should be 1,1,1)")
        
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

        # make sure we're operating on a clean selection
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.duplicate()

        collision_obj = bpy.context.active_object
        # mark it so that exporters can skip it and tools can find it
        collision_obj["fo4_collision"] = True
        collision_obj["fo4_collision_type"] = collision_type
        obj["fo4_collision_type"] = collision_type
        # copy presets
        if sound is not None:
            collision_obj["fo4_collision_sound"] = sound
            obj["fo4_collision_sound"] = sound
        if weight is not None:
            collision_obj["fo4_collision_weight"] = weight
            obj["fo4_collision_weight"] = weight
        collision_obj.name = f"{obj.name}_COLLISION"

        # simplify using a decimate modifier (more predictable than dissolve)
        modifier = collision_obj.modifiers.new(name="Decimate", type='DECIMATE')
        modifier.ratio = simplify_ratio
        bpy.ops.object.modifier_apply(modifier="Decimate")

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
