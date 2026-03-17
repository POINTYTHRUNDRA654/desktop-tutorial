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
        ('VEGETATION', 'Vegetation', 'Custom collision for trees/bushes that need a collision footprint (simplified convex hull)'),
        ('GRASS', 'Grass', 'No collision (thin ground-cover vegetation)'),
        ('MUSHROOM', 'Mushroom', 'No collision (small decorative)'),
        ('CREATURE', 'Creature', 'Use Havok tools (capsule/convex)')
    ]
    # default simplification per type (used if caller passes None)
    _TYPE_DEFAULT_RATIOS = {
        'DEFAULT': 0.25,
        'ROCK': 0.5,
        'TREE': 0.2,
        'BUILDING': 0.15,  # less aggressive simplification for structures
        'VEGETATION': 0.1, # very aggressive for organic shapes — produces a simple hull footprint
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
        'VEGETATION': 'wood_hit',
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
        'VEGETATION': 'light',
        'GRASS': 'light',
        'MUSHROOM': 'light',
        'CREATURE': 'variable',
        'NONE': None
    }

    # Per-type Blender rigid-body physics values that Niftools reads to
    # populate bhkRigidBody.friction and bhkRigidBody.restitution.
    # mass is always 0.0 for FO4 static (PASSIVE) bodies; a non-zero mass on
    # a PASSIVE body confuses Niftools and produces wrong motionSystem flags.
    _TYPE_PHYSICS_PRESETS = {
        'DEFAULT':    {'friction': 0.8, 'restitution': 0.1},
        'ROCK':       {'friction': 0.9, 'restitution': 0.05},
        'TREE':       {'friction': 0.7, 'restitution': 0.2},
        'BUILDING':   {'friction': 0.9, 'restitution': 0.05},
        # VEGETATION: matches FO4 bush/shrub collision feel — low friction so
        # the player slides past naturally, small bounce for organic give.
        'VEGETATION': {'friction': 0.6, 'restitution': 0.15},
        'GRASS':      {'friction': 0.5, 'restitution': 0.05},
        'MUSHROOM':   {'friction': 0.5, 'restitution': 0.1},
        'CREATURE':   {'friction': 0.5, 'restitution': 0.2},
        'NONE':       {'friction': 0.5, 'restitution': 0.1},
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
        if any(w in name for w in ['bush', 'shrub', 'foliage', 'plant', 'vegeta']):
            return 'VEGETATION'
        if any(w in name for w in ['grass', 'blade', 'fern']):
            return 'GRASS'
        if 'mushroom' in name:
            return 'MUSHROOM'
        if any(w in name for w in ['npc', 'creature', 'beast', 'character']):
            return 'CREATURE'
        return 'DEFAULT'

    @staticmethod
    def resolve_collision_type(value, fallback='DEFAULT'):
        """Return a valid COLLISION_TYPES string identifier for *value*.

        Blender can return integer indices instead of string identifiers when
        reading custom properties via ``obj.get()``.  This helper converts an
        integer index to the corresponding identifier and validates string
        values against the known identifiers.  If the value cannot be mapped,
        *fallback* is returned.
        """
        valid_ids = {t[0] for t in MeshHelpers.COLLISION_TYPES}
        if isinstance(value, int):
            types = MeshHelpers.COLLISION_TYPES
            if 0 <= value < len(types):
                return types[value][0]
            return fallback
        if isinstance(value, str) and value in valid_ids:
            return value
        return fallback

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
        
        # Check poly count.  FO4's BSTriShape stores triangles using a 16-bit
        # index buffer, so the hard limit is 65,535 *triangles* after the mesh
        # has been triangulated.  A mesh made of quads will produce roughly
        # twice as many triangles as it has polygons, and n-gons produce even
        # more.  Counting raw polygon objects instead of estimated triangles
        # would silently let over-limit meshes through – we estimate here so
        # the warning fires before a silent corruption at export time.
        #
        # Separately, BSTriShape's vertex index buffer is also 16-bit, so the
        # mesh can have at most 65,535 *unique vertices* too.  Both limits are
        # enforced: the triangle estimate catches quad/n-gon meshes and the
        # vertex count catches dense point clouds or high-res sculpts.
        poly_count = len(mesh.polygons)
        if poly_count == 0:
            issues.append("Mesh has no polygons")
        else:
            # Estimate triangulated face count: quad → 2 tris, n-gon → n-2 tris.
            tri_estimate = sum(max(1, len(p.vertices) - 2) for p in mesh.polygons)
            if tri_estimate > 65535:
                issues.append(
                    f"Estimated triangle count too high: {tri_estimate:,} "
                    f"(FO4 BSTriShape limit is 65,535 triangles – split the mesh "
                    f"with 'Split at Poly Limit' before export)"
                )

        # Vertex count limit – BSTriShape uses a 16-bit vertex index (uint16).
        # After triangulation Blender may split vertices along UV seams /
        # sharp edges, so the exported vertex count can be higher than the
        # raw mesh count.  Warn early so the user can split or decimate.
        if len(mesh.vertices) > 65535:
            issues.append(
                f"Vertex count too high: {len(mesh.vertices):,} "
                f"(FO4 BSTriShape limit is 65,535 unique vertices – split the mesh)"
            )

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
        # Use a small tolerance to avoid false positives from floating-point noise.
        if any(abs(s - 1.0) > 1e-5 for s in obj.scale):
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
        obj.fo4_collision_type = collision_type
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
                if o.name in (ucx_name, legacy_name):
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
        collision_obj.fo4_collision_type = collision_type
        obj.fo4_collision_type = collision_type

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
        # bmesh.ops.delete with context='VERTS' only processes BMVert objects
        # and silently ignores BMEdge/BMFace entries, so filter explicitly to
        # avoid leaving orphaned interior faces that would corrupt the shape.
        geom_to_delete = result.get('geom_interior', []) + result.get('geom_unused', [])
        verts_to_del = [g for g in geom_to_delete if isinstance(g, bmesh.types.BMVert)]
        if verts_to_del:
            bmesh.ops.delete(bm, geom=verts_to_del, context='VERTS')

        # Triangulate – FO4 BSTriShape / NIF geometry requires triangles only.
        bmesh.ops.triangulate(bm, faces=bm.faces[:])

        # Recalculate face normals consistently outward.  recalc_face_normals
        # re-orients winding for a closed surface so all normals face out –
        # bhkConvexVerticesShape in FO4 NIFs requires outward-facing normals to
        # correctly compute the supporting half-spaces.  normal_update() then
        # refreshes the cached per-vertex normals.
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.normal_update()

        bm.to_mesh(collision_obj.data)
        bm.free()
        collision_obj.data.update()

        # ----------------------------------------------------------------
        # Fallout 4's bhkConvexVerticesShape supports at most 256 vertices.
        # If the hull exceeds that limit, decimate and rebuild so the shape
        # stays within the engine limit and doesn't silently corrupt the NIF.
        # ----------------------------------------------------------------
        _FO4_CONVEX_VERT_LIMIT = 256
        if len(collision_obj.data.vertices) > _FO4_CONVEX_VERT_LIMIT:
            ratio = max(0.01, min(0.99, _FO4_CONVEX_VERT_LIMIT / len(collision_obj.data.vertices)))
            trim_mod = collision_obj.modifiers.new(name="Decimate_Limit", type='DECIMATE')
            trim_mod.ratio = ratio
            bpy.ops.object.select_all(action='DESELECT')
            collision_obj.select_set(True)
            bpy.context.view_layer.objects.active = collision_obj
            bpy.ops.object.modifier_apply(modifier="Decimate_Limit")
            # Rebuild convex hull after decimation to restore a manifold surface.
            bm2 = bmesh.new()
            bm2.from_mesh(collision_obj.data)
            bmesh.ops.remove_doubles(bm2, verts=bm2.verts, dist=0.001)
            bm2.verts.ensure_lookup_table()
            hull2 = bmesh.ops.convex_hull(bm2, input=bm2.verts)
            del2 = hull2.get('geom_interior', []) + hull2.get('geom_unused', [])
            v2 = [g for g in del2 if isinstance(g, bmesh.types.BMVert)]
            if v2:
                bmesh.ops.delete(bm2, geom=v2, context='VERTS')
            bmesh.ops.triangulate(bm2, faces=bm2.faces[:])
            bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces[:])
            bm2.normal_update()
            bm2.to_mesh(collision_obj.data)
            bm2.free()
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
            # FO4 static collision: mass must be 0 so Niftools emits the
            # correct PASSIVE / FIXED motion-system flags.  Friction and
            # restitution are set per collision type so the in-game surface
            # feel matches the material (stone = high friction, low bounce;
            # wood = medium friction, some bounce; etc.).
            phys = MeshHelpers._TYPE_PHYSICS_PRESETS.get(
                collision_type,
                MeshHelpers._TYPE_PHYSICS_PRESETS['DEFAULT'],
            )
            collision_obj.rigid_body.mass        = 0.0
            collision_obj.rigid_body.friction    = phys['friction']
            collision_obj.rigid_body.restitution = phys['restitution']
        except Exception:
            # Physics operators unavailable in this context; skip silently.
            # The UCX_ naming and parent relationship still enable export.
            pass

        # restore original object as active/selected
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        collision_obj.select_set(False)

        return collision_obj

    @staticmethod
    def split_mesh_at_poly_limit(obj, tri_limit: int = 65535):
        """Split *obj* into sub-meshes each under *tri_limit* triangulated faces.

        Fallout 4's BSTriShape / BSSubIndexTriShape nodes can store at most
        65,535 triangles per node.  This helper separates the mesh into as many
        island-based parts as needed so each part stays within the limit, then
        tries to further split by material if any island is still over-limit.

        The source object is left untouched; all splits produce new objects.
        Returns a list of the resulting objects.  If the mesh is already within
        the limit a list containing only the original object is returned.

        Example usage:
            parts = MeshHelpers.split_mesh_at_poly_limit(active_obj)
            for part in parts:
                ExportHelpers.export_mesh_to_nif(part, filepath)
        """
        if obj.type != 'MESH':
            return [obj]

        # Fast path: estimate triangulated count first.
        tri_estimate = sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)
        if tri_estimate <= tri_limit:
            return [obj]

        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        # Apply transforms so child objects inherit correct world geometry.
        try:
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        except Exception:
            pass

        # Separate by loose parts (disconnected islands).
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')

        parts = [o for o in bpy.context.selected_objects if o.type == 'MESH']

        final_parts = []
        for part in parts:
            tri_est = sum(max(1, len(p.vertices) - 2) for p in part.data.polygons)
            if tri_est <= tri_limit:
                final_parts.append(part)
                continue

            # Island is still over-limit: try splitting by material.
            bpy.ops.object.select_all(action='DESELECT')
            part.select_set(True)
            bpy.context.view_layer.objects.active = part
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.separate(type='MATERIAL')
            bpy.ops.object.mode_set(mode='OBJECT')
            mat_parts = [o for o in bpy.context.selected_objects if o.type == 'MESH']
            final_parts.extend(mat_parts)

        # Rename parts sequentially so they are easy to identify.
        base_name = obj.name
        for i, part in enumerate(final_parts):
            part.name = f"{base_name}_Part{i + 1:02d}"
            if part.data:
                part.data.name = part.name

        return final_parts

    # ------------------------------------------------------------------
    # UV + Texture workflow
    # ------------------------------------------------------------------

    @staticmethod
    def setup_uv_with_texture(obj, texture_path, texture_type='DIFFUSE',
                               unwrap_method='MIN_STRETCH', island_margin=0.02):
        """Complete UV + texture binding pipeline for Fallout 4 NIF export.

        Performs all steps in one call so the mesh is immediately preview-ready
        and export-ready without any manual node wiring:

          1. Ensures a UV map named ``"UVMap"`` exists (creates one if absent).
          2. Unwraps the mesh with *unwrap_method* (skipped when ``'EXISTING'``
             is passed and a UV map already has data).
          3. Packs UV islands with *island_margin* spacing (required so adjacent
             UV islands do not bleed into each other in DDS mip-maps).
          4. Sets up the FO4 PBR material node tree if no suitable material is
             present (calls :meth:`texture_helpers.TextureHelpers.setup_fo4_material`).
          5. Loads *texture_path* and binds it to the correct material slot
             (calls :meth:`texture_helpers.TextureHelpers.install_texture`).
          6. Switches the active viewport shading to Material Preview so the
             texture is immediately visible.

        Parameters
        ----------
        obj : bpy.types.Object
            Target mesh object.
        texture_path : str
            Absolute path to the texture file (PNG, TGA, DDS, …).
        texture_type : str
            ``'DIFFUSE'``, ``'NORMAL'``, ``'SPECULAR'``, or ``'GLOW'``.
        unwrap_method : str
            ``'MIN_STRETCH'`` **(default)** — Minimum Stretch: CONFORMAL
            (LSCM) initial layout followed by ``uv.minimize_stretch`` run to
            convergence (100 iterations).  Produces the lowest UV distortion
            of any available method.
            ``'SMART'``      — Smart UV Project (fast, good general purpose).
            ``'ANGLE'``      — Angle-Based conformal unwrap with stretch-
                               minimize refinement pass.
            ``'CUBE'``       — Cube/box projection.
            ``'EXISTING'``   — Keep current UV map; only bind the texture.
        island_margin : float
            Spacing between UV islands (0.0 - 0.1). Default 0.02 (2 %) gives
            enough room to prevent mip-map bleed on 1024 x 1024 DDS textures.

        Returns
        -------
        (bool success, str message)
        """
        import os
        from . import texture_helpers

        if obj.type != 'MESH':
            return False, "Object is not a mesh"

        if texture_path and not os.path.exists(texture_path):
            return False, f"Texture file not found: {texture_path}"

        # ------------------------------------------------------------------
        # 1 & 2. UV map + unwrap
        # ------------------------------------------------------------------
        mesh = obj.data
        uv_already_exists = bool(mesh.uv_layers)

        if not uv_already_exists:
            mesh.uv_layers.new(name="UVMap")

        # Make the object active and enter Edit Mode to unwrap.
        # Use try/finally to guarantee we restore the previous active object
        # and return to Object Mode even if an exception occurs mid-unwrap.
        prev_active = bpy.context.view_layer.objects.active
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')

            skip_unwrap = (unwrap_method == 'EXISTING' and uv_already_exists)
            if not skip_unwrap:
                if unwrap_method == 'MIN_STRETCH':
                    # Best-quality pipeline: CONFORMAL (LSCM) initial layout
                    # + minimize_stretch convergence pass (100 iterations).
                    # Smart UV Project seeds the seam boundaries first so
                    # CONFORMAL has a clean starting topology to work with.
                    bpy.ops.uv.smart_project(
                        angle_limit=66.0, island_margin=island_margin
                    )
                    bpy.ops.mesh.select_all(action='SELECT')
                    bpy.ops.uv.unwrap(method='CONFORMAL', margin=island_margin)
                    bpy.ops.mesh.select_all(action='SELECT')
                    try:
                        bpy.ops.uv.minimize_stretch(fill_holes=True, iterations=100)
                    except Exception:
                        pass  # unavailable on older Blender builds
                elif unwrap_method == 'SMART':
                    bpy.ops.uv.smart_project(
                        angle_limit=66.0, island_margin=island_margin
                    )
                elif unwrap_method == 'ANGLE':
                    # Angle-based conformal unwrap with a seam-priming pass.
                    # Running Smart UV Project first populates the UV layer so
                    # the angle-based solver has a starting layout to refine;
                    # this prevents the "no UV data" edge case and produces
                    # significantly better initial island placement.
                    bpy.ops.uv.smart_project(
                        angle_limit=66.0, island_margin=island_margin
                    )
                    bpy.ops.mesh.select_all(action='SELECT')
                    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=island_margin)
                    # Conformal smoothing pass — reduces rubber-band stretch.
                    try:
                        bpy.ops.uv.minimize_stretch(fill_holes=True, iterations=10)
                    except Exception:
                        pass  # unavailable on older Blender builds
                elif unwrap_method == 'CUBE':
                    bpy.ops.uv.cube_project(cube_size=1.0)
                else:
                    # Default to Minimum Stretch for any unknown method
                    bpy.ops.uv.smart_project(
                        angle_limit=66.0, island_margin=island_margin
                    )
                    bpy.ops.mesh.select_all(action='SELECT')
                    bpy.ops.uv.unwrap(method='CONFORMAL', margin=island_margin)
                    bpy.ops.mesh.select_all(action='SELECT')
                    try:
                        bpy.ops.uv.minimize_stretch(fill_holes=True, iterations=100)
                    except Exception:
                        pass

            # Pack islands so UVs fill the 0-1 tile without overlap.
            # rotate=True lets the packer spin islands for a tighter fit
            # (typically 5-15 % more usable texture space).
            try:
                bpy.ops.uv.pack_islands(rotate=True, margin=island_margin)
            except TypeError:
                bpy.ops.uv.pack_islands(margin=island_margin)
        finally:
            try:
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass
            bpy.context.view_layer.objects.active = prev_active

        # ------------------------------------------------------------------
        # 4. Ensure the object has a FO4-compatible material
        # ------------------------------------------------------------------
        has_fo4_mat = (
            obj.data.materials
            and obj.data.materials[0] is not None
            and obj.data.materials[0].use_nodes
            and obj.data.materials[0].node_tree.nodes.get("Base")
        )
        if not has_fo4_mat:
            texture_helpers.TextureHelpers.setup_fo4_material(obj)

        # ------------------------------------------------------------------
        # 5. Bind the texture into the correct material slot
        # ------------------------------------------------------------------
        if texture_path:
            ok, msg = texture_helpers.TextureHelpers.install_texture(
                obj, texture_path, texture_type
            )
            if not ok:
                return False, f"UV unwrap succeeded but texture binding failed: {msg}"

        # ------------------------------------------------------------------
        # 6. Switch active viewport shading to Material Preview so the user
        #    can immediately see the texture on the mesh.
        # ------------------------------------------------------------------
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
                break

        uv_note = "(kept existing UVs)" if skip_unwrap else f"(unwrapped: {unwrap_method})"
        tex_note = (
            f", {texture_type} texture bound: {os.path.basename(texture_path)}"
            if texture_path else ""
        )
        return True, (
            f"UV map ready {uv_note}{tex_note}. "
            "Viewport switched to Material Preview. "
            "Use 'Edit UV Map' to adjust islands if needed, "
            "then export with 'Export Mesh (.nif)'."
        )

def register():
    """Register mesh helper functions"""
    pass

def unregister():
    """Unregister mesh helper functions"""
    pass
