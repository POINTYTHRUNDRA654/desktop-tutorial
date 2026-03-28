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

class SmartPresets:
    """Game-asset catalog and NIF import helpers for Smart Presets.

    Moved here from operators.py so the catalog data and helper logic live
    alongside the other mesh utilities.  The Blender operator classes that
    invoke these methods remain in operators.py.
    """

    # Shown in an ERROR report when FO4 game files are not found.
    # No generic or placeholder mesh is created — the operator cancels.
    FALLBACK_MSG = (
        "Set your FO4 Data folder in any Fallout 4 panel, "
        "then click this button again to import the real game mesh."
    )

    # Stem keywords used when picking the 'best' NIF in a folder.
    NIF_PRIORITY_KEYWORDS: tuple = (
        'receiver', 'body', 'torso', 'male', 'female', 'base',
    )

    # Maps a preset-type key → (folder_relative_to_FO4_Data, [candidate_filenames])
    # The first candidate file that exists as a loose NIF is imported.
    # If no matching NIF is found the operator cancels with an error — no
    # generic geometry is created.
    NIF_CATALOG: dict = {
        # ── Weapons ────────────────────────────────────────────────────────────
        '10MM':           ('meshes/weapons/10mmpistol/',     ['10mmpistol_receiver.nif']),
        '44':             ('meshes/weapons/44pistol/',        ['44pistol_receiver.nif']),
        'DELIVERER':      ('meshes/weapons/deliverer/',       ['deliverer_receiver.nif']),
        'PIPE':           ('meshes/weapons/pipe/',            ['pipe_pistol_receiver.nif', 'pipepistol_receiver.nif']),
        'ASSAULT':        ('meshes/weapons/assaultrifle/',    ['assaultrifle_receiver.nif']),
        'COMBAT_RIFLE':   ('meshes/weapons/combatrifle/',     ['combatrifle_receiver.nif']),
        'SHOTGUN':        ('meshes/weapons/combatshotgun/',   ['combatshotgun_receiver.nif']),
        'HUNTING':        ('meshes/weapons/huntingrifle/',    ['huntingrifle_receiver.nif']),
        'LASER':          ('meshes/weapons/lasergun/',        ['lasergun_receiver.nif']),
        'PLASMA':         ('meshes/weapons/plasmagun/',       ['plasmagun_receiver.nif']),
        'SMG':            ('meshes/weapons/submachinegun/',   ['submachinegun_receiver.nif']),
        'MINIGUN':        ('meshes/weapons/minigun/',         ['minigun_receiver.nif']),
        'FATMAN':         ('meshes/weapons/fatman/',          ['fatman_receiver.nif']),
        'FLAMER':         ('meshes/weapons/flamer/',          ['flamer_receiver.nif']),
        'MISSILE':        ('meshes/weapons/misslelauncher/',  ['missilelauncher_receiver.nif']),
        'GAUSS':          ('meshes/weapons/gaussrifle/',      ['gaussrifle_receiver.nif']),
        'RAILWAY':        ('meshes/weapons/railwayrifle/',    ['railwayrifle_receiver.nif']),
        # ── Armor ──────────────────────────────────────────────────────────────
        'ARMOR_LEATHER':  ('meshes/armor/leather/',      ['f_leather_armor_body_aa.nif', 'leather_armor_body_aa.nif']),
        'ARMOR_COMBAT':   ('meshes/armor/combat/',        ['f_combat_armor_body_aa.nif',  'combat_armor_body_aa.nif']),
        'ARMOR_METAL':    ('meshes/armor/metal/',         ['f_metal_armor_body_aa.nif',   'metal_armor_body_aa.nif']),
        'ARMOR_RAIDER':   ('meshes/armor/raider/',        ['f_raider_armor_body_aa.nif',  'raider_armor_body_aa.nif']),
        'ARMOR_SYNTH':    ('meshes/armor/synth/',         ['f_synth_armor_body_aa.nif',   'synth_armor_body_aa.nif']),
        'POWER_T60':      ('meshes/armor/powerarmor/',    ['powerarmort60_torso.nif',     't60_torso.nif']),
        'POWER_T45':      ('meshes/armor/powerarmor/',    ['powerarmort45_torso.nif',     't45_torso.nif']),
        'VAULT_SUIT':     ('meshes/armor/vault111/',      ['vault111_jumpsuit.nif',        'vaultsuit.nif']),
        # Power-armor pieces
        'PA_TORSO_T60':   ('meshes/armor/powerarmor/', ['powerarmort60_torso.nif']),
        'PA_HELMET_T60':  ('meshes/armor/powerarmor/', ['powerarmort60_helmet.nif']),
        'PA_LARM_T60':    ('meshes/armor/powerarmor/', ['powerarmort60_larm.nif']),
        'PA_RARM_T60':    ('meshes/armor/powerarmor/', ['powerarmort60_rarm.nif']),
        'PA_LLEG_T60':    ('meshes/armor/powerarmor/', ['powerarmort60_lleg.nif']),
        'PA_RLEG_T60':    ('meshes/armor/powerarmor/', ['powerarmort60_rleg.nif']),
        # ── Props / Set-dressing ───────────────────────────────────────────────
        'PROP_CRATE':     ('meshes/setdressing/crates/',  ['woodcrate01.nif']),
        'PROP_METALCRATE':('meshes/setdressing/crates/',  ['metalcrate01.nif', 'metalcrate_lg01.nif']),
        'PROP_BARREL':    ('meshes/setdressing/',          ['barrel01.nif']),
        'PROP_DESK':      ('meshes/furniture/',            ['desk01.nif', 'office_desk01.nif']),
        'PROP_CHAIR':     ('meshes/furniture/',            ['chair01.nif']),
        'PROP_SHELF':     ('meshes/furniture/',            ['shelf01.nif', 'metalshelf01.nif']),
        'PROP_TABLE':     ('meshes/furniture/',            ['table01.nif']),
        # ── Vegetation ────────────────────────────────────────────────────────
        'VEG_PINE':       ('meshes/landscape/trees/', ['treepine01.nif']),
        'VEG_DEAD_TREE':  ('meshes/landscape/trees/', ['treedead01.nif', 'treedeadbark01.nif']),
        'VEG_BUSH':       ('meshes/plants/',           ['bush01.nif', 'shrub01.nif', 'shrubdead01.nif']),
        'VEG_GRASS':      ('meshes/landscape/grass/',  ['grass01.nif']),
        'VEG_FERN':       ('meshes/plants/',           ['fern01.nif', 'plantfern01.nif']),
        'VEG_ROCK':       ('meshes/landscape/rocks/',  ['rock01.nif', 'boulder01.nif']),
        'VEG_MUTFRUIT':   ('meshes/plants/',           ['mutfruitplant.nif', 'mutfruit.nif']),
        # ── NPCs / Actors ─────────────────────────────────────────────────────
        'NPC_HUMAN':      ('meshes/actors/character/', ['character_assets/basehumanmale.nif', 'basehumanmale.nif']),
        'NPC_GHOUL':      ('meshes/actors/feral/',     ['feralghoulmale.nif', 'feral_ghoul_male.nif']),
        'NPC_SUPERMUTANT':('meshes/actors/supermutant/', ['supermutant.nif', 'supermutantmale.nif']),
        'NPC_PROTECTRON': ('meshes/actors/protectron/', ['protectron.nif']),
        'NPC_SYNTH':      ('meshes/actors/synth/',      ['synthmale.nif', 'synth_male.nif']),
        # ── Creatures ─────────────────────────────────────────────────────────
        'CR_RADROACH':    ('meshes/actors/radroach/',   ['radroach.nif']),
        'CR_MOLERAT':     ('meshes/actors/molerat/',    ['molerat.nif']),
        'CR_DEATHCLAW':   ('meshes/actors/deathclaw/',  ['deathclaw.nif']),
        'CR_MIRELURK':    ('meshes/actors/mirelurk/',   ['mirelurk.nif', 'mirelurkkingmale.nif']),
        'CR_RADSCORPION': ('meshes/actors/radscorpion/', ['radscorpion.nif']),
        'CR_BRAHMIN':     ('meshes/actors/brahmin/',    ['brahmin.nif']),
        # ── Architecture / World-building ─────────────────────────────────────
        'WB_VAULT_WALL':  ('meshes/architecture/vault/',          ['vlt_wall_concrete01.nif', 'vaultwall01.nif']),
        'WB_VAULT_FLOOR': ('meshes/architecture/vault/',          ['vlt_floor01.nif',          'vaultfloor01.nif']),
        'WB_COMM_WALL':   ('meshes/architecture/commonwealth/',   ['cw_wall01.nif',            'cwbrickwall01.nif']),
        'WB_DOOR':        ('meshes/architecture/',                ['door01.nif',               'doorframe01.nif']),
        'WB_BED':         ('meshes/furniture/',   ['bed01.nif',        'sleepingbag01.nif']),
        'WB_WORKBENCH':   ('meshes/furniture/',   ['workbench01.nif']),
        'WB_CHAIR':       ('meshes/furniture/',   ['chair01.nif']),
        'WB_GENERATOR':   ('meshes/furniture/',   ['generator01.nif']),
        # ── Consumables / misc items ───────────────────────────────────────────
        'ITEM_STIMPAK':   ('meshes/clutter/junk/', ['stimpak.nif',          'stimpakbox.nif']),
        'ITEM_NUKACOLA':  ('meshes/clutter/junk/', ['nukacola.nif',         'nuka_cola_bottle.nif']),
        'ITEM_FOOD':      ('meshes/clutter/junk/', ['instantmashbox.nif',   'boxcrinkles.nif']),
        'ITEM_CHEM':      ('meshes/clutter/junk/', ['mentats.nif',          'chem01.nif']),
        'ITEM_HOLOTAPE':  ('meshes/clutter/junk/', ['holotape.nif']),
        'ITEM_KEY':       ('meshes/clutter/junk/', ['key.nif',              'key01.nif']),
        'ITEM_TOOL':      ('meshes/clutter/junk/', ['wrench01.nif',         'tool01.nif']),
        'ITEM_COMPONENT': ('meshes/clutter/junk/', ['screws.nif',           'springwire.nif']),
        'ITEM_JUNK':      ('meshes/clutter/junk/', ['trashbag01.nif',       'junk01.nif']),
        'ITEM_BOTTLE':    ('meshes/clutter/junk/', ['nukacola.nif',         'glassbottle01.nif']),
        'ITEM_CAN':       ('meshes/clutter/junk/', ['instamashbox01.nif',   'can01.nif']),
        'ITEM_BOX':       ('meshes/setdressing/crates/', ['woodcrate01.nif', 'cardboardbox01.nif']),
    }

    @staticmethod
    def resolve_game_nif(key: str):
        """Return the absolute path of the first loose FO4 NIF that matches *key*.

        Looks up *key* in :attr:`NIF_CATALOG` → (folder, candidates), then
        searches the FO4 Data directory.  If no candidate name matches, returns
        the first ``.nif`` found in the folder (skipping ``_lod`` variants).
        Returns ``None`` when FO4 is not detected or the folder contains no
        NIFs, and prints a console message explaining why.
        """
        import importlib
        import sys
        from pathlib import Path as _P

        entry = SmartPresets.NIF_CATALOG.get(key)
        if not entry:
            return None
        folder_rel, candidates = entry

        try:
            fo4_game_assets = importlib.import_module(
                ".fo4_game_assets", package=__package__
            )
        except Exception:
            fo4_game_assets = None

        if not fo4_game_assets:
            print(
                "[FO4 Add-on] Smart Preset: fo4_game_assets module unavailable.\n"
                "  → Restart Blender and try again."
            )
            return None

        data_dir = fo4_game_assets.FO4GameAssets.get_data_dir()
        if not data_dir:
            print(
                "[FO4 Add-on] Smart Preset: FO4 data directory not found.\n"
                "  → Open the 'Game Asset Import' panel and set the 'Meshes' path\n"
                "    to your extracted FO4 Data folder (e.g. D:/FO4/Data).\n"
                "  → If you set the path, click the preset button again."
            )
            return None

        folder = _P(data_dir) / folder_rel
        if not folder.exists():
            print(
                f"[FO4 Add-on] Smart Preset: folder not found: {folder}\n"
                f"  Data dir: {data_dir}\n"
                f"  Expected sub-path: {folder_rel}\n"
                "  → Make sure you pointed the 'Meshes' path at the Data root\n"
                "    (the folder that contains the 'meshes/' sub-folder),\n"
                "    not at the 'meshes/' folder itself."
            )
            return None

        for name in candidates:
            p = folder / name
            if p.exists():
                return str(p)

        # Fall back: first NIF in folder that isn't a LOD variant
        nifs = sorted(
            p for p in folder.glob('*.nif')
            if '_lod' not in p.stem.lower()
        )
        if nifs:
            for nif in nifs:
                if any(kw in nif.stem.lower() for kw in SmartPresets.NIF_PRIORITY_KEYWORDS):
                    return str(nif)
            return str(nifs[0])

        print(
            f"[FO4 Add-on] Smart Preset: no NIFs found in {folder}\n"
            "  → BA2 archives may still be packed. Extract them with\n"
            "    Archive2.exe (Creation Kit) or BAE (Bethesda Archive Extractor)."
        )
        return None

    @staticmethod
    def import_game_nif(filepath: str):
        """Import a NIF file using the Niftools operator if available.

        Returns ``(success, message)``.  On success, the newly-imported objects
        are selected and the active object is set by Blender's import operator.
        """
        from pathlib import Path as _P
        filename = _P(filepath).name
        if hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'nif'):
            try:
                bpy.ops.import_scene.nif(filepath=filepath)
                return True, f"Imported game mesh: {filename}"
            except Exception as e:
                return False, f"NIF import error: {e}"
        return False, "Niftools add-on not installed — install it to import .nif files directly"

    @staticmethod
    def auto_apply_textures_from_game_asset(nif_path: str):
        """Locate FO4 textures matching the imported NIF and apply to the active object."""
        from pathlib import Path as _P
        from . import texture_helpers

        obj = bpy.context.active_object
        if not obj or obj.type != 'MESH':
            return

        nif = _P(nif_path)
        parts = nif.parts
        if "meshes" in (p.lower() for p in parts):
            try:
                meshes_idx = [i for i, p in enumerate(parts) if p.lower() == "meshes"][-1]
                data_root = _P(*parts[:meshes_idx])
            except Exception:
                data_root = nif.parent.parent
        else:
            data_root = nif.parent.parent

        textures_root = data_root / "textures"
        if not textures_root.exists():
            return

        stem = nif.stem.split("_lod")[0].lower()
        candidates = list(textures_root.rglob(f"{stem}*.dds"))
        if not candidates:
            return

        mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
        for tex in candidates:
            tex_type = texture_helpers.TextureHelpers.detect_fo4_texture_type(str(tex))
            texture_helpers.TextureHelpers.install_texture(obj, str(tex), tex_type)
        return mat

    @staticmethod
    def apply_nif_v25_settings(context, preset_key: str):
        """Apply the correct NIF wire-format export settings to all mesh
        objects that were just imported by a Smart Preset operator.

        Called immediately after a successful NIF import so that the user can
        customize the mesh and re-export without having to manually configure
        any settings.  The following are applied:

        Per-object (bpy.types.Object custom properties):
          - ``fo4_mesh_type``      → correct type for the preset category so
                                     PyNifly chooses the right root node
                                     class, BSXFlags, shader flags, and
                                     skinning path on export.
          - ``fo4_collision_type`` → sensible default for the preset category
                                     (NONE for wearables/items, DEFAULT for
                                     props/architecture/weapons).

        Per-scene:
          - ``fo4_game_version``   → left at whatever the user chose; defaulted
                                     to 'FO4' if not yet set.

        NIF wire-format settings (NIF 20.2.0.7 / user ver 12 / bsver 130 /
        target_game=FO4) are fixed at export time by
        ``ExportHelpers._build_pynifly_export_kwargs()`` and do not need to be
        stored per-object.
        """
        # ── Preset key → fo4_mesh_type ────────────────────────────────────────
        _MESH_TYPE: dict = {
            # Weapons
            '10MM': 'WEAPON', '44': 'WEAPON', 'DELIVERER': 'WEAPON',
            'PIPE': 'WEAPON', 'ASSAULT': 'WEAPON', 'COMBAT_RIFLE': 'WEAPON',
            'SHOTGUN': 'WEAPON', 'HUNTING': 'WEAPON', 'LASER': 'WEAPON',
            'PLASMA': 'WEAPON', 'SMG': 'WEAPON', 'MINIGUN': 'WEAPON',
            'FATMAN': 'WEAPON', 'FLAMER': 'WEAPON', 'MISSILE': 'WEAPON',
            'GAUSS': 'WEAPON', 'RAILWAY': 'WEAPON',
            # Armor / wearables
            'ARMOR_LEATHER': 'ARMOR', 'ARMOR_COMBAT': 'ARMOR',
            'ARMOR_METAL': 'ARMOR', 'ARMOR_RAIDER': 'ARMOR',
            'ARMOR_SYNTH': 'ARMOR', 'POWER_T60': 'ARMOR',
            'POWER_T45': 'ARMOR', 'VAULT_SUIT': 'SKINNED',
            # Power-armor pieces (each is a separate wearable)
            'PA_TORSO_T60': 'ARMOR', 'PA_HELMET_T60': 'ARMOR',
            'PA_LARM_T60': 'ARMOR', 'PA_RARM_T60': 'ARMOR',
            'PA_LLEG_T60': 'ARMOR', 'PA_RLEG_T60': 'ARMOR',
            # Props / set-dressing
            'PROP_CRATE': 'STATIC', 'PROP_METALCRATE': 'STATIC',
            'PROP_BARREL': 'STATIC', 'PROP_DESK': 'STATIC',
            'PROP_CHAIR': 'STATIC', 'PROP_SHELF': 'STATIC',
            'PROP_TABLE': 'STATIC',
            # Vegetation / landscape
            'VEG_PINE': 'VEGETATION', 'VEG_DEAD_TREE': 'VEGETATION',
            'VEG_BUSH': 'VEGETATION', 'VEG_GRASS': 'VEGETATION',
            'VEG_FERN': 'VEGETATION', 'VEG_ROCK': 'STATIC',
            'VEG_MUTFRUIT': 'FLORA',
            # NPCs / actors
            'NPC_HUMAN': 'SKINNED', 'NPC_GHOUL': 'SKINNED',
            'NPC_SUPERMUTANT': 'SKINNED', 'NPC_PROTECTRON': 'SKINNED',
            'NPC_SYNTH': 'SKINNED',
            # Creatures
            'CR_RADROACH': 'SKINNED', 'CR_MOLERAT': 'SKINNED',
            'CR_DEATHCLAW': 'SKINNED', 'CR_MIRELURK': 'SKINNED',
            'CR_RADSCORPION': 'SKINNED', 'CR_BRAHMIN': 'SKINNED',
            # Architecture
            'WB_VAULT_WALL': 'ARCHITECTURE', 'WB_VAULT_FLOOR': 'ARCHITECTURE',
            'WB_COMM_WALL': 'ARCHITECTURE', 'WB_DOOR': 'ARCHITECTURE',
            # Workshop / furniture
            'WB_BED': 'FURNITURE', 'WB_WORKBENCH': 'FURNITURE',
            'WB_CHAIR': 'FURNITURE', 'WB_GENERATOR': 'FURNITURE',
            # Consumables / misc / clutter items
            'ITEM_STIMPAK': 'STATIC', 'ITEM_NUKACOLA': 'STATIC',
            'ITEM_FOOD': 'STATIC', 'ITEM_CHEM': 'STATIC',
            'ITEM_HOLOTAPE': 'STATIC', 'ITEM_KEY': 'STATIC',
            'ITEM_TOOL': 'STATIC', 'ITEM_COMPONENT': 'STATIC',
            'ITEM_JUNK': 'STATIC', 'ITEM_BOTTLE': 'STATIC',
            'ITEM_CAN': 'STATIC', 'ITEM_BOX': 'STATIC',
        }

        # ── Preset key → fo4_collision_type ──────────────────────────────────
        # Wearables and characters have no collision mesh of their own;
        # weapons, props, architecture, and furniture use DEFAULT collision.
        _COLL_TYPE: dict = {
            'ARMOR_LEATHER': 'NONE', 'ARMOR_COMBAT': 'NONE',
            'ARMOR_METAL': 'NONE', 'ARMOR_RAIDER': 'NONE',
            'ARMOR_SYNTH': 'NONE', 'POWER_T60': 'NONE',
            'POWER_T45': 'NONE', 'VAULT_SUIT': 'NONE',
            'PA_TORSO_T60': 'NONE', 'PA_HELMET_T60': 'NONE',
            'PA_LARM_T60': 'NONE', 'PA_RARM_T60': 'NONE',
            'PA_LLEG_T60': 'NONE', 'PA_RLEG_T60': 'NONE',
            'NPC_HUMAN': 'NONE', 'NPC_GHOUL': 'NONE',
            'NPC_SUPERMUTANT': 'NONE', 'NPC_PROTECTRON': 'NONE',
            'NPC_SYNTH': 'NONE',
            'CR_RADROACH': 'NONE', 'CR_MOLERAT': 'NONE',
            'CR_DEATHCLAW': 'NONE', 'CR_MIRELURK': 'NONE',
            'CR_RADSCORPION': 'NONE', 'CR_BRAHMIN': 'NONE',
            'VEG_GRASS': 'GRASS',
            'VEG_MUTFRUIT': 'VEGETATION',
            'VEG_PINE': 'VEGETATION', 'VEG_DEAD_TREE': 'VEGETATION',
            'VEG_BUSH': 'VEGETATION', 'VEG_FERN': 'VEGETATION',
            'ITEM_STIMPAK': 'DEFAULT', 'ITEM_NUKACOLA': 'DEFAULT',
            'ITEM_FOOD': 'DEFAULT', 'ITEM_CHEM': 'DEFAULT',
            'ITEM_HOLOTAPE': 'DEFAULT', 'ITEM_KEY': 'DEFAULT',
            'ITEM_TOOL': 'DEFAULT', 'ITEM_COMPONENT': 'DEFAULT',
            'ITEM_JUNK': 'DEFAULT', 'ITEM_BOTTLE': 'DEFAULT',
            'ITEM_CAN': 'DEFAULT', 'ITEM_BOX': 'DEFAULT',
        }

        mesh_type = _MESH_TYPE.get(preset_key, 'AUTO')
        coll_type = _COLL_TYPE.get(preset_key, 'DEFAULT')

        # Tag every mesh object that was selected by the import operator.
        # PyNifly's import selects all newly-created objects and sets the
        # root as the active object; iterating selected objects catches
        # multi-mesh NIFs (e.g. separate body parts).
        try:
            selected = list(context.selected_objects) if context.selected_objects else []
        except Exception:
            selected = []

        # Fall back to active object when nothing is selected
        try:
            if not selected and context.active_object:
                selected = [context.active_object]
                selected += [
                    c for c in context.active_object.children_recursive
                    if c.type == 'MESH'
                ]
        except Exception:
            pass

        for obj in selected:
            if obj.type != 'MESH':
                continue
            try:
                obj.fo4_mesh_type = mesh_type
            except Exception:
                pass
            try:
                obj.fo4_collision_type = coll_type
            except Exception:
                pass
            # Store the NIF wire-format constants as informational custom
            # properties so they're visible in the Properties panel.  These
            # match what ExportHelpers._build_pynifly_export_kwargs() passes
            # to PyNifly at export time.
            obj['nif_version'] = '20.2.0.7'
            obj['nif_user_version'] = 12
            obj['nif_bs_version'] = 130
            obj['nif_target_game'] = 'FO4'
            obj['nif_export_modifiers'] = True
            obj['nif_export_collision'] = True
            obj['nif_rename_bones'] = True
            obj['nif_blender_xf'] = False

        # Default scene game version to FO4 if not yet set
        try:
            if not getattr(context.scene, 'fo4_game_version', None):
                context.scene.fo4_game_version = 'FO4'
        except Exception:
            pass

    @staticmethod
    def apply_textures_to_active(texture_paths: list, root):
        """Apply provided texture paths (relative to root) to the active mesh."""
        import os
        from . import texture_helpers

        obj = bpy.context.active_object
        if not obj or obj.type != 'MESH' or not texture_paths:
            return

        abs_paths = []
        for t in texture_paths:
            p = os.path.join(root, t) if root else t
            if os.path.exists(p):
                abs_paths.append(p)
        if not abs_paths:
            return

        mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
        for tex in abs_paths:
            tex_type = texture_helpers.TextureHelpers.detect_fo4_texture_type(tex)
            texture_helpers.TextureHelpers.install_texture(obj, tex, tex_type)


def register():
    """Register mesh helper functions"""
    pass

def unregister():
    """Unregister mesh helper functions"""
    pass
